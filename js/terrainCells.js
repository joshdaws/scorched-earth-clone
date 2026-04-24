const DEFAULT_CELL_SIZE = 8;
const DEFAULT_MAX_REMOVED_CELLS = 900;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getTerrainWidth(terrain) {
    return terrain?.getWidth?.() ?? terrain?.width ?? 0;
}

function getTerrainScreenHeight(terrain) {
    return terrain?.getScreenHeight?.() ?? terrain?.screenHeight ?? 0;
}

function getTerrainHeight(terrain, x) {
    return terrain?.getHeight?.(x) ?? 0;
}

function quantizeFloor(value, size) {
    return Math.floor(value / size) * size;
}

function quantizeCeil(value, size) {
    return Math.ceil(value / size) * size;
}

/**
 * Capture a cell-aligned terrain snapshot before a destructive mutation.
 *
 * @param {import('./terrain.js').Terrain} terrain
 * @param {number} centerX
 * @param {number} radius
 * @param {{cellSize?: number}} [options]
 * @returns {{centerX: number, radius: number, cellSize: number, screenHeight: number, columns: Array<{x: number, height: number}>}|null}
 */
export function captureTerrainCellSnapshot(terrain, centerX, radius, options = {}) {
    const width = getTerrainWidth(terrain);
    const screenHeight = getTerrainScreenHeight(terrain);
    const cellSize = Math.max(2, Math.floor(options.cellSize ?? DEFAULT_CELL_SIZE));
    if (!terrain || width <= 0 || screenHeight <= 0 || radius <= 0) return null;

    const startX = clamp(quantizeFloor(centerX - radius, cellSize), 0, width - 1);
    const endX = clamp(quantizeCeil(centerX + radius, cellSize), 0, width - 1);
    const columns = [];

    for (let x = startX; x <= endX; x += cellSize) {
        columns.push({
            x,
            height: getTerrainHeight(terrain, x + cellSize * 0.5)
        });
    }

    return {
        centerX,
        radius,
        cellSize,
        screenHeight,
        columns
    };
}

/**
 * Compare a pre-destruction cell snapshot with current terrain and return
 * removed grid cells. Each returned cell is centered in screen coordinates.
 *
 * @param {{centerX?: number, radius?: number, cellSize: number, screenHeight: number, columns: Array<{x: number, height: number}>}|null} snapshot
 * @param {import('./terrain.js').Terrain} terrain
 * @param {{maxCells?: number}} [options]
 * @returns {Array<{x: number, y: number, topLeftX: number, topLeftY: number, size: number, depth: number, distance: number}>}
 */
export function buildRemovedTerrainCells(snapshot, terrain, options = {}) {
    if (!snapshot || !terrain) return [];

    const cellSize = Math.max(2, Math.floor(snapshot.cellSize ?? DEFAULT_CELL_SIZE));
    const maxCells = Math.max(1, Math.floor(options.maxCells ?? DEFAULT_MAX_REMOVED_CELLS));
    const cells = [];

    for (const column of snapshot.columns) {
        const sampleX = column.x + cellSize * 0.5;
        const afterHeight = getTerrainHeight(terrain, sampleX);
        const removedDepth = column.height - afterHeight;
        if (removedDepth <= cellSize * 0.35) continue;

        const beforeSurfaceY = snapshot.screenHeight - column.height;
        const afterSurfaceY = snapshot.screenHeight - afterHeight;
        const startY = clamp(quantizeFloor(beforeSurfaceY, cellSize), 0, snapshot.screenHeight);
        const endY = clamp(quantizeCeil(afterSurfaceY, cellSize), 0, snapshot.screenHeight);

        for (let topLeftY = startY; topLeftY < endY; topLeftY += cellSize) {
            const centerY = topLeftY + cellSize * 0.5;
            const centerX = column.x + cellSize * 0.5;
            cells.push({
                x: centerX,
                y: centerY,
                topLeftX: column.x,
                topLeftY,
                size: cellSize,
                depth: removedDepth,
                distance: Math.hypot(
                    centerX - (snapshot.centerX ?? centerX),
                    centerY - (snapshot.screenHeight - column.height)
                )
            });
        }
    }

    if (cells.length <= maxCells) return cells;

    const stride = Math.ceil(cells.length / maxCells);
    return cells.filter((_, index) => index % stride === 0).slice(0, maxCells);
}

export function getTerrainCellSize() {
    return DEFAULT_CELL_SIZE;
}
