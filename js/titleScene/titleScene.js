/**
 * Scorched Earth: Synthwave Edition
 * Title Scene - Three.js animated background for menu state
 *
 * Creates an infinite scrolling synthwave grid with neon glow effects.
 * Renders to a separate canvas behind the game's 2D UI canvas.
 *
 * Based on reference: docs/examples/threejs-synthwave-grid.html
 */

// Use relative paths for Three.js imports (works without import maps)
import * as THREE from '../../node_modules/three/build/three.module.js';
import { EffectComposer } from '../../node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { getSafeAreaInsets, onResize as registerResize, getScreenWidth, getScreenHeight } from '../screenSize.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Colors
    gridColor: new THREE.Color(0xff00ff),      // Magenta
    mountainColor: new THREE.Color(0x00ffff),  // Cyan
    skyColor: new THREE.Color(0x020008),       // Deep purple/black
    sunColorTop: new THREE.Color(0xffaa00),    // Orange
    sunColorBottom: new THREE.Color(0xff0066), // Pink

    // Animation
    speed: 40.0,
    distortionStrength: 55.0,

    // Grid chunks (infinite scrolling)
    chunkSize: 60,
    chunkCount: 18,

    // Resolution (number of vertices)
    resX: 50,
    resZ: 4,

    // Grid dimensions
    gridWidth: 350,
    roadWidth: 12.0,

    // Visual fade settings
    fogDistance: 500,
    lineFadeStart: 100,
    lineFadeEnd: 350,

    // Bloom post-processing
    bloomStrength: 1.3,
    bloomRadius: 0.4,
    bloomThreshold: 0.0
};

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {HTMLCanvasElement|null} */
let canvas = null;

/** @type {THREE.Scene|null} */
let scene = null;

/** @type {THREE.PerspectiveCamera|null} */
let camera = null;

/** @type {THREE.WebGLRenderer|null} */
let renderer = null;

/** @type {EffectComposer|null} */
let composer = null;

/** @type {THREE.Clock|null} */
let clock = null;

/** @type {boolean} */
let isRunning = false;

/** @type {number|null} */
let animationFrameId = null;

/** @type {GridChunk[]} */
let chunks = [];

/** @type {THREE.ShaderMaterial|null} */
let fadeLineMaterial = null;

/** @type {SimplexNoise|null} */
let noise = null;

// =============================================================================
// SIMPLEX NOISE
// =============================================================================

/**
 * Simple 2D Simplex noise implementation for terrain generation.
 * Used to create procedural mountain heights.
 */
class SimplexNoise {
    constructor() {
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        this.perm = [];
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }

    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }

    noise(xin, yin) {
        let n0, n1, n2;
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.perm[ii + this.perm[jj]] % 12;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else { t0 *= t0; n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0); }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else { t1 *= t1; n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1); }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else { t2 *= t2; n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2); }
        return 70.0 * (n0 + n1 + n2);
    }
}

// =============================================================================
// GRID CHUNK CLASS
// =============================================================================

/**
 * A single chunk of the infinite scrolling grid.
 * Chunks are recycled as they pass the camera.
 */
class GridChunk {
    /**
     * @param {number} startZ - Z position where this chunk's geometry begins
     */
    constructor(startZ) {
        this.group = new THREE.Group();
        this.startZ = startZ;
        this.createGeometry(startZ);
        this.group.position.z = 0;
        scene.add(this.group);
    }

    createGeometry(zOffset) {
        const width = CONFIG.gridWidth;
        const length = CONFIG.chunkSize;
        const resX = CONFIG.resX;
        const resZ = CONFIG.resZ;

        const vertices = [];
        const colors = [];
        const indices = [];
        const triIndices = [];

        const cRoad = CONFIG.gridColor;
        const cMtn = CONFIG.mountainColor;

        for (let z = 0; z <= resZ; z++) {
            for (let x = 0; x <= resX; x++) {
                const u = x / resX;
                const v = z / resZ;

                const px = (u - 0.5) * width;

                // Local Z goes from 0 to -length
                const localZ = -v * length;
                const worldZ = zOffset + localZ;

                // Terrain generation using simplex noise
                let n = noise.noise(px * 0.02, worldZ * 0.02);
                n = Math.max(0, n);
                if (n > 0.6) {
                    n = 0.6 + (n - 0.6) * 0.2;
                }

                const distFromCenter = Math.abs(px);
                let ramp = 0;
                if (distFromCenter > CONFIG.roadWidth) {
                    const normDist = (distFromCenter - CONFIG.roadWidth) / 60.0;
                    ramp = Math.min(1.0, normDist);
                    ramp = Math.pow(ramp, 2.0);
                }

                const py = Math.max(0, n * CONFIG.distortionStrength * ramp);

                vertices.push(px, py, worldZ);

                // Color logic - road is magenta, mountains are cyan
                if (distFromCenter <= CONFIG.roadWidth + 1.0) {
                    colors.push(cRoad.r, cRoad.g, cRoad.b);
                } else {
                    colors.push(cMtn.r, cMtn.g, cMtn.b);
                }
            }
        }

        const cols = resX + 1;

        for (let z = 0; z < resZ; z++) {
            for (let x = 0; x < resX; x++) {
                const i = z * cols + x;

                indices.push(i, i + 1);
                indices.push(i, i + cols);

                if (x === resX - 1) indices.push(i + 1, i + 1 + cols);

                triIndices.push(i, i + 1, i + cols);
                triIndices.push(i + 1, i + cols + 1, i + cols);
            }
            if (z === resZ - 1) {
                for (let x = 0; x < resX; x++) {
                    const i = (z + 1) * cols + x;
                    indices.push(i, i + 1);
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);

        const mesh = new THREE.LineSegments(geometry, fadeLineMaterial);

        // Black occlusion mesh to hide grid lines behind mountains
        const occGeo = new THREE.BufferGeometry();
        occGeo.setAttribute('position', geometry.getAttribute('position'));
        occGeo.setIndex(triIndices);
        const occMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });
        const occMesh = new THREE.Mesh(occGeo, occMat);

        this.group.add(mesh);
        this.group.add(occMesh);
    }

    dispose() {
        scene.remove(this.group);
        this.group.children.forEach(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the title scene.
 * Creates Three.js scene, camera, renderer, and all visual elements.
 * Call this once when the game loads.
 *
 * @returns {boolean} True if initialization succeeded
 */
export function init() {
    // Get the title scene canvas
    canvas = document.getElementById('titleScene');
    if (!canvas) {
        console.error('TitleScene: Canvas element with id "titleScene" not found');
        return false;
    }

    // Initialize noise generator
    noise = new SimplexNoise();

    // Create clock for animation timing
    clock = new THREE.Clock();

    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(CONFIG.skyColor, 100, CONFIG.fogDistance);
    scene.background = CONFIG.skyColor;

    // Create camera - positioned above grid, looking toward horizon
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 3, -50);

    // Create renderer with antialiasing to reduce line strobing
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Set up post-processing with bloom
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.bloomStrength,
        CONFIG.bloomRadius,
        CONFIG.bloomThreshold
    );
    composer.addPass(bloom);

    // Create custom line shader with distance-based fade
    fadeLineMaterial = new THREE.ShaderMaterial({
        uniforms: {
            fadeStart: { value: CONFIG.lineFadeStart },
            fadeEnd: { value: CONFIG.lineFadeEnd }
        },
        vertexShader: `
            attribute vec3 color;
            varying vec3 vColor;
            varying float vDist;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vDist = -mvPosition.z;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vDist;
            uniform float fadeStart;
            uniform float fadeEnd;

            void main() {
                float alpha = 1.0 - smoothstep(fadeStart, fadeEnd, vDist);
                if (alpha <= 0.01) discard;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false
    });

    // Create grid chunks
    for (let i = -1; i < CONFIG.chunkCount; i++) {
        chunks.push(new GridChunk(-i * CONFIG.chunkSize));
    }

    // Create sun
    createSun();

    // Create infinite floor (black, below grid to prevent see-through)
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    scene.add(floor);

    // Initial resize
    resize();

    // Register for screen resize events
    registerResize((dimensions) => {
        resize(dimensions.width, dimensions.height);
    });

    console.log('TitleScene initialized');
    return true;
}

/**
 * Create the synthwave sun with gradient and scan lines.
 */
function createSun() {
    const sunGeo = new THREE.PlaneGeometry(100, 100);
    const sunMat = new THREE.ShaderMaterial({
        uniforms: {
            colorTop: { value: CONFIG.sunColorTop },
            colorBottom: { value: CONFIG.sunColorBottom }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 colorTop;
            uniform vec3 colorBottom;
            varying vec2 vUv;
            void main() {
                vec3 color = mix(colorBottom, colorTop, vUv.y);
                // Scan line effect - horizontal bands
                float stripe = sin(vUv.y * 60.0);
                float gap = step(-0.6 + (vUv.y * 0.8), stripe);
                // Circular mask
                float dist = distance(vUv, vec2(0.5));
                float alpha = 1.0 - step(0.5, dist);
                if (alpha < 0.1) discard;
                gl_FragColor = vec4(color, alpha * gap);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 25, -300);
    scene.add(sun);
}

// =============================================================================
// ANIMATION CONTROL
// =============================================================================

/**
 * Start the title scene animation.
 * Call when entering MENU state.
 */
export function start() {
    if (isRunning) return;

    // Show canvas
    if (canvas) {
        canvas.style.display = 'block';
    }

    // Make game canvas transparent so Three.js shows through
    const gameCanvas = document.getElementById('game');
    if (gameCanvas) {
        gameCanvas.style.backgroundColor = 'transparent';
    }

    // Reset clock
    if (clock) {
        clock.start();
    }

    isRunning = true;
    animate();
    console.log('TitleScene started');
}

/**
 * Stop the title scene animation.
 * Call when leaving MENU state.
 */
export function stop() {
    if (!isRunning) return;

    isRunning = false;

    // Cancel animation frame
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Stop clock
    if (clock) {
        clock.stop();
    }

    // Hide canvas
    if (canvas) {
        canvas.style.display = 'none';
    }

    // Restore game canvas background
    const gameCanvas = document.getElementById('game');
    if (gameCanvas) {
        gameCanvas.style.backgroundColor = '#0a0a1a'; // --bg-dark
    }

    console.log('TitleScene stopped');
}

/**
 * Animation loop.
 * Scrolls the grid and updates camera drift.
 */
function animate() {
    if (!isRunning) return;

    animationFrameId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    const moveDist = CONFIG.speed * delta;

    // Move all chunks forward
    chunks.forEach(chunk => {
        chunk.group.position.z += moveDist;
    });

    // Camera drift - subtle side-to-side movement
    const driftRange = 0.8;
    const driftSpeed = 0.2;
    camera.position.x = Math.sin(time * driftSpeed) * driftRange;
    camera.rotation.z = Math.sin(time * driftSpeed) * -0.01;

    // Recycle chunks that pass the camera
    const firstChunk = chunks[0];
    const trailingEdgeZ = firstChunk.group.position.z + firstChunk.startZ - CONFIG.chunkSize;

    if (trailingEdgeZ > camera.position.z + 20) {
        const oldChunk = chunks.shift();
        oldChunk.dispose();

        const lastChunk = chunks[chunks.length - 1];
        const lastGeomZ = lastChunk.startZ;
        const newGeomZ = lastGeomZ - CONFIG.chunkSize;

        const newChunk = new GridChunk(newGeomZ);
        newChunk.group.position.z = lastChunk.group.position.z;

        chunks.push(newChunk);
    }

    // Render with post-processing
    composer.render();
}

/**
 * Update function (called from game loop if needed).
 * Currently animation is self-contained in requestAnimationFrame.
 *
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    // Animation is handled internally via requestAnimationFrame
    // This function is available for future integration with game loop
}

// =============================================================================
// RESIZE HANDLING
// =============================================================================

/**
 * Handle window resize.
 * Updates camera aspect ratio, renderer size, and composer.
 *
 * @param {number} [width] - Optional width override
 * @param {number} [height] - Optional height override
 */
export function resize(width, height) {
    if (!renderer || !camera || !composer || !canvas) return;

    // Get safe area insets
    const safeArea = getSafeAreaInsets();

    // Use provided dimensions or get from screenSize module
    const w = width || getScreenWidth();
    const h = height || getScreenHeight();

    // Update camera aspect ratio
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(w, h);

    // Update composer size
    composer.setSize(w, h);

    // Position canvas to match game canvas (account for safe areas)
    canvas.style.left = `${safeArea.left}px`;
    canvas.style.top = `${safeArea.top}px`;

    console.log(`TitleScene resized to ${w}x${h}`);
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Clean up all Three.js resources.
 * Call when shutting down the game.
 */
export function cleanup() {
    stop();

    // Dispose chunks
    chunks.forEach(chunk => chunk.dispose());
    chunks = [];

    // Dispose materials
    if (fadeLineMaterial) {
        fadeLineMaterial.dispose();
        fadeLineMaterial = null;
    }

    // Dispose composer
    if (composer) {
        composer.dispose();
        composer = null;
    }

    // Dispose renderer
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }

    // Clear references
    scene = null;
    camera = null;
    canvas = null;
    clock = null;
    noise = null;

    console.log('TitleScene cleaned up');
}

// =============================================================================
// STATUS
// =============================================================================

/**
 * Check if the title scene is currently running.
 * @returns {boolean} True if animation is active
 */
export function isActive() {
    return isRunning;
}
