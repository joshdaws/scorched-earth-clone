import {
    getOrCreateTerrainCellGrid,
    getTerrainCellSize
} from './terrainCells.js';

const BODY_COLOR = 0x140527;
const BODY_ALT_COLOR = 0x0b1435;
const CYAN = 0x05d9e8;
const PINK = 0xff2a6d;
const PURPLE = 0xb967ff;
const MAX_FRAGMENTS = 520;
const MAX_SPAWN_CELLS = 220;
const DEFAULT_FRAGMENT_LIFETIME_MS = 560;
const SURFACE_GLOW_ROWS = 9;

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
    graphics.rect(x, y, size, size).fill({ color, alpha });
}

function addLineRect(graphics, x, y, width, height, color, alpha) {
    graphics.rect(x, y, Math.max(1, width), Math.max(1, height)).fill({ color, alpha });
}

function mixColor(a, b, amount) {
    const t = clamp(amount, 0, 1);
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;

    return (
        (Math.round(ar + (br - ar) * t) << 16) |
        (Math.round(ag + (bg - ag) * t) << 8) |
        Math.round(ab + (bb - ab) * t)
    );
}

function getBodyColor(depthRows, col, row) {
    const depthFactor = clamp(depthRows / 32, 0, 1);
    const band = ((col + row) % 4) / 18;
    return mixColor(BODY_COLOR, BODY_ALT_COLOR, depthFactor * 0.65 + band);
}

function getGridColor(depthRows) {
    const depthFactor = clamp(depthRows / 28, 0, 1);
    const upperColor = mixColor(PINK, PURPLE, clamp(depthRows / SURFACE_GLOW_ROWS, 0, 1));
    return mixColor(upperColor, CYAN, depthFactor * 0.72);
}

function getGridAlpha(depthRows) {
    const surfaceGlow = Math.max(0, 1 - depthRows / SURFACE_GLOW_ROWS);
    return clamp(0.1 + surfaceGlow * 0.38, 0.08, 0.5);
}

function getCellCoordinate(cell, axis, size) {
    const centerValue = cell?.[axis];
    if (Number.isFinite(centerValue)) return centerValue;

    const topLeftValue = axis === 'x' ? cell?.topLeftX : cell?.topLeftY;
    if (Number.isFinite(topLeftValue)) return topLeftValue + size * 0.5;
    return 0;
}

function getCellDepthRows(cell, size) {
    if (Number.isFinite(cell?.depth)) {
        return Math.max(0, Math.floor(cell.depth / size));
    }
    if (Number.isFinite(cell?.surfaceY) && Number.isFinite(cell?.topLeftY)) {
        return Math.max(0, Math.floor((cell.topLeftY - cell.surfaceY) / size));
    }
    return 0;
}

function getCellDebrisTint(cell, size) {
    const x = getCellCoordinate(cell, 'x', size);
    const y = getCellCoordinate(cell, 'y', size);
    const col = Number.isFinite(cell?.col) ? cell.col : Math.floor(x / size);
    const row = Number.isFinite(cell?.row) ? cell.row : Math.floor(y / size);
    const depthRows = getCellDepthRows(cell, size);
    const bodyColor = getBodyColor(depthRows, col, row);
    const gridColor = getGridColor(depthRows);
    const glowMix = depthRows <= 2 ? 1 : 0.82;
    return mixColor(bodyColor, gridColor, glowMix);
}

export function getPixiTerrainDebrisLimits() {
    return {
        maxFragments: MAX_FRAGMENTS,
        maxSpawnCells: MAX_SPAWN_CELLS
    };
}

export function selectTerrainDebrisCells(cells, maxCells = MAX_SPAWN_CELLS) {
    if (!Array.isArray(cells) || cells.length === 0) return [];

    const limit = Math.max(1, Math.floor(maxCells));
    const stride = Math.max(1, Math.ceil(cells.length / limit));
    return cells.filter((_, index) => index % stride === 0).slice(0, limit);
}

export function buildTerrainCellDebrisSpec({ x, y, radius, cell, index = 0 }) {
    const size = Math.max(3, cell?.size ?? getTerrainCellSize());
    const startX = Math.round(getCellCoordinate(cell, 'x', size));
    const startY = Math.round(getCellCoordinate(cell, 'y', size));
    const seed = startX * 0.91 + startY * 1.37 + radius * 0.53 + index * 6.13;
    const distance = cell?.distance ?? Math.hypot(startX - x, startY - y);
    const distanceFactor = clamp(distance / Math.max(1, radius), 0, 1);
    const angleJitter = (hash01(seed) - 0.5) * 0.38;
    const fallbackAngle = hash01(seed + 8.9) * Math.PI * 2;
    const blastAngle = distance > 0.1 ? Math.atan2(startY - y, startX - x) : fallbackAngle;
    const angle = blastAngle + angleJitter;
    const displacement = clamp(
        radius * (0.28 + (1 - distanceFactor) * 0.42) + hash01(seed + 2.4) * 7,
        size * 1.5,
        radius * 0.85
    );
    const lift = Math.max(0, (1 - distanceFactor) * radius * 0.12);

    return {
        startX,
        startY,
        targetX: Math.round(startX + Math.cos(angle) * displacement),
        targetY: Math.round(startY + Math.sin(angle) * displacement - lift),
        size,
        tint: getCellDebrisTint(cell, size),
        age: 0,
        delay: distanceFactor * 12 + hash01(seed + 4.1) * 8,
        lifetime: DEFAULT_FRAGMENT_LIFETIME_MS + hash01(seed + 5.8) * 120,
        phase: hash01(seed + 7.2) * Math.PI * 2
    };
}

function syncParticleChildren() {
    if (!particleContainer) return;
    particleContainer.particleChildren.length = 0;
    for (const fragment of activeFragments) {
        particleContainer.particleChildren.push(fragment.particle);
    }
    particleContainer.update();
}

function rebuildTerrainGraphics(terrain) {
    if (!ready || !terrainGraphics || !terrain) return;

    const width = getTerrainWidth(terrain);
    const screenHeight = getTerrainScreenHeight(terrain);
    const grid = getOrCreateTerrainCellGrid(terrain);
    const cellSize = grid?.cellSize ?? getTerrainCellSize();
    terrainGraphics.clear();

    const renderCell = ({ topLeftX, topLeftY, size, row, col, surfaceY }) => {
        const isEdge = topLeftY <= surfaceY;
        const depthRows = Math.max(0, Math.floor((topLeftY - surfaceY) / size));
        const baseColor = getBodyColor(depthRows, col, row);
        const gridColor = getGridColor(depthRows);
        const gridAlpha = getGridAlpha(depthRows);

        addCellRect(terrainGraphics, topLeftX, topLeftY, size, baseColor, 1);
        addLineRect(terrainGraphics, topLeftX, topLeftY, size, 1, gridColor, gridAlpha);
        addLineRect(terrainGraphics, topLeftX, topLeftY, 1, size, gridColor, gridAlpha * 0.55);

        if (isEdge) {
            addLineRect(terrainGraphics, topLeftX, topLeftY, size, 2, PINK, 0.94);
            addLineRect(terrainGraphics, topLeftX, topLeftY + 2, size, 1, CYAN, 0.5);
            addLineRect(terrainGraphics, topLeftX, topLeftY - 1, size, 1, PURPLE, 0.42);
        }
    };

    if (grid) {
        grid.forEachOccupiedCell(renderCell);
    } else {
        for (let x = 0; x < width; x += cellSize) {
            const sampleX = Math.min(width - 1, x + cellSize * 0.5);
            const terrainHeight = terrain.getHeight(sampleX);
            const surfaceY = screenHeight - terrainHeight;
            const topY = clamp(Math.floor(surfaceY / cellSize) * cellSize, 0, screenHeight);

            for (let y = topY; y < screenHeight; y += cellSize) {
                renderCell({
                    topLeftX: x,
                    topLeftY: y,
                    size: cellSize,
                    row: Math.floor(y / cellSize),
                    col: Math.floor(x / cellSize),
                    surfaceY: topY
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

    const selectedCells = selectTerrainDebrisCells(cells);

    for (let index = 0; index < selectedCells.length; index++) {
        const cell = selectedCells[index];
        const spec = buildTerrainCellDebrisSpec({ x, y, radius, cell, index });
        const particle = new Pixi.Particle({
            texture: particleTexture,
            x: spec.startX,
            y: spec.startY,
            anchorX: 0.5,
            anchorY: 0.5,
            scaleX: spec.size,
            scaleY: spec.size,
            tint: spec.tint,
            alpha: 0.95
        });

        activeFragments.push({
            particle,
            ...spec
        });
    }

    while (activeFragments.length > MAX_FRAGMENTS) {
        activeFragments.shift();
    }

    syncParticleChildren();
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
            activeFragments.splice(index, 1);
            removedAny = true;
            continue;
        }

        const easeOut = 1 - Math.pow(1 - progress, 3);
        const fade = Math.pow(1 - progress, 1.25);
        const shimmer = Math.sin(localAge * 0.08 + fragment.phase) * (1 - progress) * 1.4;
        const scale = fragment.size * (1.35 - progress * 0.55);

        fragment.particle.x = Math.round(fragment.startX + (fragment.targetX - fragment.startX) * easeOut + shimmer);
        fragment.particle.y = Math.round(fragment.startY + (fragment.targetY - fragment.startY) * easeOut - Math.abs(shimmer) * 0.35);
        fragment.particle.scaleX = scale;
        fragment.particle.scaleY = scale;
        fragment.particle.alpha = clamp(fade, 0, 0.95);
        fragment.particle.tint = fragment.tint;
    }

    if (removedAny) {
        syncParticleChildren();
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
