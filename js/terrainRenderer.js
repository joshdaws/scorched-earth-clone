import { getTerrainGridSurfaceYAt } from './terrainCells.js';
import { get as getAsset } from './assets.js';

export const TERRAIN_FILL_COLOR = '#1a0a2e';
export const TERRAIN_EDGE_COLOR = '#ff2a6d';

let cachedDirtPattern = null;
let cachedDirtPatternSource = null;

/**
 * Resolve (and cache) the tileable dirt texture pattern when the generated
 * terrain texture asset is available. Falls back to null so callers keep the
 * solid fill.
 * @param {CanvasRenderingContext2D} ctx
 * @returns {CanvasPattern|null}
 */
function getTerrainFillPattern(ctx) {
    const tile = getAsset('terrain.dirtTexture');
    if (!tile || !tile.complete || !(tile.naturalWidth > 0)) {
        return null;
    }

    if (cachedDirtPattern && cachedDirtPatternSource === tile) {
        return cachedDirtPattern;
    }

    try {
        cachedDirtPattern = ctx.createPattern(tile, 'repeat');
        cachedDirtPatternSource = tile;
    } catch {
        cachedDirtPattern = null;
        cachedDirtPatternSource = null;
    }

    return cachedDirtPattern;
}

/**
 * Render the active terrain, preferring the GPU-backed Pixi layer when it is available.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./terrain.js').Terrain|null} terrain
 * @param {{renderPixiTerrainLayerToCanvas?: Function}} [services]
 */
export function renderTerrainScene(ctx, terrain, services = {}) {
    if (!terrain) return;

    // The previous Pixi bridge rendered quickly in WebGL, but copying its full
    // 1200x800 canvas back into the 2D frame cost 7-9ms per frame in browser
    // smoke tests. Keep launch gameplay on the native Canvas terrain path until
    // Pixi terrain can be composited as its own DOM layer without readback/copy.
    void services.renderPixiTerrainLayerToCanvas;

    renderCanvasTerrain(ctx, terrain);
}

/**
 * Canvas fallback terrain renderer used when Pixi is disabled or unavailable.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./terrain.js').Terrain} terrain
 */
export function renderCanvasTerrain(ctx, terrain) {
    const width = terrain.getWidth();
    const screenHeight = terrain.getScreenHeight();

    ctx.beginPath();
    ctx.moveTo(0, screenHeight);

    for (let x = 0; x < width; x++) {
        ctx.lineTo(x, getTerrainGridSurfaceYAt(terrain, x));
    }

    ctx.lineTo(width - 1, screenHeight);
    ctx.closePath();

    // Solid base ensures full coverage; the texture pattern layers detail on
    // top when the generated tile asset is loaded.
    ctx.fillStyle = TERRAIN_FILL_COLOR;
    ctx.fill();

    const pattern = getTerrainFillPattern(ctx);
    if (pattern) {
        ctx.save();
        ctx.fillStyle = pattern;
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = TERRAIN_EDGE_COLOR;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = TERRAIN_EDGE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
        const canvasY = getTerrainGridSurfaceYAt(terrain, x);
        if (x === 0) {
            ctx.moveTo(x, canvasY);
        } else {
            ctx.lineTo(x, canvasY);
        }
    }
    ctx.stroke();
    ctx.restore();
}
