import { getTerrainGridSurfaceYAt } from './terrainCells.js';

export const TERRAIN_FILL_COLOR = '#1a0a2e';
export const TERRAIN_EDGE_COLOR = '#ff2a6d';

/**
 * Render the active terrain, preferring the GPU-backed Pixi layer when it is available.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./terrain.js').Terrain|null} terrain
 * @param {{renderPixiTerrainLayerToCanvas?: Function}} [services]
 */
export function renderTerrainScene(ctx, terrain, services = {}) {
    if (!terrain) return;

    const renderPixiTerrainLayerToCanvas = services.renderPixiTerrainLayerToCanvas;
    if (typeof renderPixiTerrainLayerToCanvas === 'function' && renderPixiTerrainLayerToCanvas(ctx, terrain)) {
        return;
    }

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

    ctx.fillStyle = TERRAIN_FILL_COLOR;
    ctx.fill();

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
