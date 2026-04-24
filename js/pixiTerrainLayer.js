import { getTerrainCellSize } from './terrainCells.js';

const BODY_COLOR = 0x140527;
const BODY_ALT_COLOR = 0x061b35;
const CYAN = 0x05d9e8;
const PINK = 0xff2a6d;
const PURPLE = 0xb967ff;
const YELLOW = 0xf8ff4a;
const MAX_FRAGMENTS = 1400;
const MAX_SPAWN_CELLS = 520;
const DEFAULT_FRAGMENT_LIFETIME_MS = 1250;

let app = null;
let Pixi = null;
let initPromise = null;
let ready = false;
let terrainRoot = null;
let terrainGraphics = null;
let particleContainer = null;
let particleTexture = null;
let lastTerrain = null;
let lastWidth = 0;
let lastHeight = 0;
let terrainDirty = true;
let activeFragments = [];

function hasBrowserCanvas() {
    return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function hash01(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function makeParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
    return Pixi.Texture.from(canvas);
}

function getTerrainWidth(terrain) {
    return terrain?.getWidth?.() ?? terrain?.width ?? 0;
}

function getTerrainScreenHeight(terrain) {
    return terrain?.getScreenHeight?.() ?? terrain?.screenHeight ?? 0;
}

function resizeLayer(width, height) {
    if (!ready || !app) return;
    if (width === lastWidth && height === lastHeight) return;

    app.renderer.resize(width, height);
    if (particleContainer) {
        particleContainer.boundsArea = new Pixi.Rectangle(0, 0, width, height);
    }
    lastWidth = width;
    lastHeight = height;
    terrainDirty = true;
}

function addCellRect(graphics, x, y, size, color, alpha) {
    graphics.rect(x, y, Math.max(1, size - 1), Math.max(1, size - 1)).fill({ color, alpha });
}

function rebuildTerrainGraphics(terrain) {
    if (!ready || !terrainGraphics || !terrain) return;

    const width = getTerrainWidth(terrain);
    const screenHeight = getTerrainScreenHeight(terrain);
    const cellSize = getTerrainCellSize();
    terrainGraphics.clear();

    for (let x = 0; x < width; x += cellSize) {
        const sampleX = Math.min(width - 1, x + cellSize * 0.5);
        const terrainHeight = terrain.getHeight(sampleX);
        const surfaceY = screenHeight - terrainHeight;
        const topY = clamp(Math.floor(surfaceY / cellSize) * cellSize, 0, screenHeight);
        const columnBand = Math.floor(x / (cellSize * 3));

        for (let y = topY; y < screenHeight; y += cellSize) {
            const row = Math.floor(y / cellSize);
            const band = row + columnBand;
            const isEdge = y === topY;
            const isAccentRow = row % 7 === 0;
            const baseColor = band % 2 === 0 ? BODY_COLOR : BODY_ALT_COLOR;
            const glowColor = band % 5 === 0 ? CYAN : PINK;

            addCellRect(terrainGraphics, x, y, cellSize, baseColor, isEdge ? 0.8 : 0.52);

            if (isEdge) {
                terrainGraphics.rect(x, y, Math.max(1, cellSize - 1), 2).fill({
                    color: PINK,
                    alpha: 0.95
                });
                terrainGraphics.rect(x, y + 2, Math.max(1, cellSize - 1), 1).fill({
                    color: CYAN,
                    alpha: 0.55
                });
            } else if (isAccentRow) {
                terrainGraphics.rect(x, y, Math.max(1, cellSize - 1), 1).fill({
                    color: glowColor,
                    alpha: 0.26
                });
            }
        }
    }

    terrainDirty = false;
    lastTerrain = terrain;
}

function ensureReady() {
    return ready && app && terrainRoot && terrainGraphics && particleContainer;
}

/**
 * Initialize the offscreen Pixi terrain layer. Rendering remains manual so the
 * existing Canvas 2D game loop controls draw order.
 *
 * @param {{width: number, height: number}} dimensions
 * @returns {Promise<boolean>}
 */
export async function initPixiTerrainLayer({ width, height }) {
    if (ready) {
        resizeLayer(width, height);
        return true;
    }
    if (initPromise) return initPromise;
    if (!hasBrowserCanvas()) return false;

    initPromise = (async () => {
        try {
            Pixi = await import('pixi.js');
            app = new Pixi.Application();
            await app.init({
                width,
                height,
                backgroundAlpha: 0,
                antialias: false,
                autoDensity: false,
                resolution: 1,
                preference: 'webgl',
                powerPreference: 'high-performance',
                autoStart: false
            });

            particleTexture = makeParticleTexture();
            terrainRoot = new Pixi.Container();
            terrainGraphics = new Pixi.Graphics();
            particleContainer = new Pixi.ParticleContainer({
                texture: particleTexture,
                boundsArea: new Pixi.Rectangle(0, 0, width, height),
                roundPixels: true,
                dynamicProperties: {
                    vertex: true,
                    position: true,
                    color: true,
                    rotation: false,
                    uvs: false
                }
            });

            terrainRoot.addChild(terrainGraphics);
            terrainRoot.addChild(particleContainer);
            app.stage.addChild(terrainRoot);

            lastWidth = width;
            lastHeight = height;
            terrainDirty = true;
            ready = true;
            return true;
        } catch (error) {
            console.warn('[PixiTerrainLayer] Failed to initialize, using Canvas terrain fallback:', error);
            ready = false;
            app = null;
            return false;
        }
    })();

    return initPromise;
}

export function isPixiTerrainLayerReady() {
    return Boolean(ensureReady());
}

export function markPixiTerrainLayerDirty() {
    terrainDirty = true;
}

/**
 * Spawn terrain-native de-rez fragments from removed grid cells.
 *
 * @param {{x: number, y: number, radius: number, cells: Array<{x: number, y: number, size: number, distance?: number}>}} params
 * @returns {boolean} Whether Pixi accepted the effect
 */
export function spawnPixiTerrainDerezEffect({ x, y, radius, cells }) {
    if (!ensureReady() || !Array.isArray(cells) || cells.length === 0) return false;

    const stride = Math.max(1, Math.ceil(cells.length / MAX_SPAWN_CELLS));
    const selectedCells = cells.filter((_, index) => index % stride === 0);
    const newParticles = [];

    for (let index = 0; index < selectedCells.length; index++) {
        const cell = selectedCells[index];
        const seed = cell.x * 0.91 + cell.y * 1.37 + radius * 0.53 + index * 6.13;
        const angle = Math.atan2(cell.y - y, cell.x - x) + (hash01(seed) - 0.5) * 1.25;
        const speed = 6 + hash01(seed + 1.7) * 16;
        const lift = -10 - hash01(seed + 2.4) * 18;
        const distanceFactor = clamp((cell.distance ?? Math.hypot(cell.x - x, cell.y - y)) / Math.max(1, radius), 0, 1);
        const size = Math.max(3, cell.size ?? getTerrainCellSize());
        const tint = [PINK, CYAN, PURPLE, YELLOW][index % 4];
        const particle = new Pixi.Particle({
            texture: particleTexture,
            x: Math.round(cell.x),
            y: Math.round(cell.y),
            anchorX: 0.5,
            anchorY: 0.5,
            scaleX: size,
            scaleY: size,
            tint,
            alpha: 0.95
        });

        activeFragments.push({
            particle,
            startX: cell.x,
            startY: cell.y,
            age: 0,
            delay: distanceFactor * 90 + hash01(seed + 4.1) * 55,
            lifetime: DEFAULT_FRAGMENT_LIFETIME_MS + hash01(seed + 5.8) * 360,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed + lift,
            gravity: 34 + hash01(seed + 7.2) * 34,
            size,
            tint
        });
        newParticles.push(particle);
    }

    particleContainer.particleChildren.push(...newParticles);
    particleContainer.update();

    while (activeFragments.length > MAX_FRAGMENTS) {
        const removed = activeFragments.shift();
        const particleIndex = particleContainer.particleChildren.indexOf(removed.particle);
        if (particleIndex >= 0) {
            particleContainer.particleChildren.splice(particleIndex, 1);
        }
    }

    particleContainer.update();
    return true;
}

export function updatePixiTerrainLayer(deltaTime) {
    if (!ensureReady() || activeFragments.length === 0) return;

    let removedAny = false;
    for (let index = activeFragments.length - 1; index >= 0; index--) {
        const fragment = activeFragments[index];
        fragment.age += deltaTime;

        const localAge = fragment.age - fragment.delay;
        if (localAge < 0) {
            fragment.particle.alpha = 0;
            continue;
        }

        const progress = localAge / fragment.lifetime;
        if (progress >= 1) {
            const particleIndex = particleContainer.particleChildren.indexOf(fragment.particle);
            if (particleIndex >= 0) {
                particleContainer.particleChildren.splice(particleIndex, 1);
            }
            activeFragments.splice(index, 1);
            removedAny = true;
            continue;
        }

        const seconds = localAge / 1000;
        const flicker = 0.82 + Math.sin(localAge * 0.045 + fragment.startX) * 0.14;
        const fade = Math.pow(1 - progress, 0.95);
        const expansion = 1.15 + progress * 0.65;

        fragment.particle.x = Math.round(fragment.startX + fragment.vx * seconds);
        fragment.particle.y = Math.round(fragment.startY + fragment.vy * seconds + 0.5 * fragment.gravity * seconds * seconds);
        fragment.particle.scaleX = fragment.size * expansion;
        fragment.particle.scaleY = fragment.size * expansion;
        fragment.particle.alpha = clamp(fade * flicker, 0, 0.98);
        fragment.particle.tint = progress > 0.68 ? CYAN : fragment.tint;
    }

    if (removedAny) {
        particleContainer.update();
    }
}

/**
 * Render the transparent Pixi terrain layer into the existing Canvas 2D frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./terrain.js').Terrain} terrain
 * @returns {boolean}
 */
export function renderPixiTerrainLayerToCanvas(ctx, terrain) {
    if (!ensureReady() || !terrain || !ctx) return false;

    const width = getTerrainWidth(terrain);
    const height = getTerrainScreenHeight(terrain);
    resizeLayer(width, height);

    if (terrainDirty || lastTerrain !== terrain) {
        rebuildTerrainGraphics(terrain);
    }

    app.render();
    ctx.drawImage(app.canvas, 0, 0, width, height);
    return true;
}

export function clearPixiTerrainLayer() {
    activeFragments = [];
    if (particleContainer) {
        particleContainer.particleChildren.length = 0;
        particleContainer.update();
    }
    terrainDirty = true;
}

export function getPixiTerrainFragmentCount() {
    return activeFragments.length;
}
