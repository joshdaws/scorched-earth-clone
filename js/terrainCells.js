const DEFAULT_CELL_SIZE = 8;
const DEFAULT_MAX_REMOVED_CELLS = 900;
const DEFAULT_MAX_SLOPE_CELLS = 3;
const terrainGridCache = new WeakMap();

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

export class TerrainCellGrid {
    /**
     * @param {{width: number, screenHeight: number, cellSize?: number}} options
     */
    constructor({ width, screenHeight, cellSize = DEFAULT_CELL_SIZE }) {
        this.width = Math.max(0, Math.floor(width));
        this.screenHeight = Math.max(0, Math.floor(screenHeight));
        this.cellSize = Math.max(2, Math.floor(cellSize));
        this.columns = Math.ceil(this.width / this.cellSize);
        this.rows = Math.ceil(this.screenHeight / this.cellSize);
        this.cells = new Uint8Array(this.columns * this.rows);
        this.columnTopRows = new Int16Array(this.columns);
        this.columnTopRows.fill(this.rows);
    }

    static fromTerrain(terrain, options = {}) {
        const width = getTerrainWidth(terrain);
        const screenHeight = getTerrainScreenHeight(terrain);
        if (!terrain || width <= 0 || screenHeight <= 0) return null;

        const grid = new TerrainCellGrid({
            width,
            screenHeight,
            cellSize: options.cellSize ?? DEFAULT_CELL_SIZE
        });

        for (let col = 0; col < grid.columns; col++) {
            const sampleX = Math.min(width - 1, col * grid.cellSize + grid.cellSize * 0.5);
            const terrainHeight = getTerrainHeight(terrain, sampleX);
            const surfaceY = screenHeight - terrainHeight;
            const topRow = clamp(Math.floor(surfaceY / grid.cellSize), 0, grid.rows);

            for (let row = topRow; row < grid.rows; row++) {
                grid.setCell(col, row, true);
            }
        }

        grid.recalculateColumnTops();
        return grid;
    }

    index(col, row) {
        return row * this.columns + col;
    }

    isInBounds(col, row) {
        return col >= 0 && row >= 0 && col < this.columns && row < this.rows;
    }

    isSolid(col, row) {
        return this.isInBounds(col, row) && this.cells[this.index(col, row)] === 1;
    }

    setCell(col, row, solid) {
        if (!this.isInBounds(col, row)) return false;
        this.cells[this.index(col, row)] = solid ? 1 : 0;
        return true;
    }

    getCellCenter(col, row) {
        return {
            x: col * this.cellSize + this.cellSize * 0.5,
            y: row * this.cellSize + this.cellSize * 0.5
        };
    }

    getSurfaceYForColumn(col) {
        if (col < 0 || col >= this.columns) return this.screenHeight;
        const topRow = this.columnTopRows[col];
        return topRow >= this.rows ? this.screenHeight : topRow * this.cellSize;
    }

    getHeightAt(x) {
        const col = clamp(Math.floor(x / this.cellSize), 0, this.columns - 1);
        return this.screenHeight - this.getSurfaceYForColumn(col);
    }

    recalculateColumnTops(startCol = 0, endCol = this.columns - 1) {
        const minCol = clamp(Math.floor(startCol), 0, this.columns - 1);
        const maxCol = clamp(Math.floor(endCol), 0, this.columns - 1);

        for (let col = minCol; col <= maxCol; col++) {
            let topRow = this.rows;
            for (let row = 0; row < this.rows; row++) {
                if (this.isSolid(col, row)) {
                    topRow = row;
                    break;
                }
            }
            this.columnTopRows[col] = topRow;
        }
    }

    getColumnSolidCount(col) {
        if (col < 0 || col >= this.columns) return 0;

        let count = 0;
        for (let row = 0; row < this.rows; row++) {
            if (this.isSolid(col, row)) count++;
        }
        return count;
    }

    isColumnPacked(col, solidCount = this.getColumnSolidCount(col)) {
        const count = clamp(Math.floor(solidCount), 0, this.rows);
        const firstSolidRow = this.rows - count;

        for (let row = 0; row < this.rows; row++) {
            const shouldBeSolid = row >= firstSolidRow;
            if (this.isSolid(col, row) !== shouldBeSolid) return false;
        }

        return true;
    }

    setColumnSolidCount(col, solidCount) {
        if (col < 0 || col >= this.columns) return false;

        const count = clamp(Math.floor(solidCount), 0, this.rows);
        const firstSolidRow = this.rows - count;
        let changed = false;

        for (let row = 0; row < this.rows; row++) {
            const shouldBeSolid = row >= firstSolidRow;
            const index = this.index(col, row);
            const value = shouldBeSolid ? 1 : 0;
            if (this.cells[index] !== value) {
                this.cells[index] = value;
                changed = true;
            }
        }

        this.columnTopRows[col] = count > 0 ? firstSolidRow : this.rows;
        return changed;
    }

    /**
     * Collapse unsupported terrain cells downward, then redistribute steep
     * height differences into a stable stepped slope. The model preserves cell
     * mass inside the affected range and produces a packed grid that the legacy
     * heightmap can still read as a single surface.
     *
     * @param {{minCol?: number, maxCol?: number, maxSlopeCells?: number, maxIterations?: number}} [options]
     * @returns {{modified: boolean, fallingColumns: Array<{col: number, x: number, currentHeight: number, targetHeight: number}>, settledCells: number, iterations: number, minCol: number, maxCol: number, maxSlopeCells: number}}
     */
    settleUnsupported(options = {}) {
        if (this.columns <= 0 || this.rows <= 0) {
            return {
                modified: false,
                fallingColumns: [],
                settledCells: 0,
                iterations: 0,
                minCol: 0,
                maxCol: -1,
                maxSlopeCells: DEFAULT_MAX_SLOPE_CELLS
            };
        }

        const minCol = clamp(Math.floor(options.minCol ?? 0), 0, this.columns - 1);
        const maxCol = clamp(Math.floor(options.maxCol ?? this.columns - 1), minCol, this.columns - 1);
        const maxSlopeCells = Math.max(1, Math.floor(options.maxSlopeCells ?? DEFAULT_MAX_SLOPE_CELLS));
        const maxIterations = Math.max(1, Math.floor(options.maxIterations ?? this.columns * 2));
        const width = maxCol - minCol + 1;
        const counts = new Int16Array(width);
        const beforeCounts = new Int16Array(width);
        let modified = false;
        let settledCells = 0;

        for (let index = 0; index < width; index++) {
            const col = minCol + index;
            const count = this.getColumnSolidCount(col);
            counts[index] = count;
            beforeCounts[index] = count;
            if (!this.isColumnPacked(col, count)) {
                modified = true;
                settledCells += count;
            }
        }

        let iterations = 0;
        for (; iterations < maxIterations; iterations++) {
            let changed = false;

            for (let index = 0; index < width - 1; index++) {
                const diff = counts[index] - counts[index + 1];
                if (Math.abs(diff) <= maxSlopeCells) continue;

                const transfer = Math.max(1, Math.floor((Math.abs(diff) - maxSlopeCells + 1) / 2));
                if (diff > 0) {
                    const amount = Math.min(transfer, counts[index], this.rows - counts[index + 1]);
                    if (amount <= 0) continue;
                    counts[index] -= amount;
                    counts[index + 1] += amount;
                    settledCells += amount;
                } else {
                    const amount = Math.min(transfer, counts[index + 1], this.rows - counts[index]);
                    if (amount <= 0) continue;
                    counts[index] += amount;
                    counts[index + 1] -= amount;
                    settledCells += amount;
                }

                changed = true;
                modified = true;
            }

            if (!changed) break;
        }

        const fallingColumns = [];
        for (let index = 0; index < width; index++) {
            const col = minCol + index;
            const currentHeight = beforeCounts[index] * this.cellSize;
            const targetHeight = counts[index] * this.cellSize;
            if (currentHeight !== targetHeight || !this.isColumnPacked(col, counts[index])) {
                fallingColumns.push({
                    col,
                    x: col * this.cellSize + this.cellSize * 0.5,
                    currentHeight,
                    targetHeight
                });
            }
            if (this.setColumnSolidCount(col, counts[index])) {
                modified = true;
            }
        }

        this.recalculateColumnTops(minCol, maxCol);

        return {
            modified,
            fallingColumns,
            settledCells,
            iterations: iterations + 1,
            minCol,
            maxCol,
            maxSlopeCells
        };
    }

    /**
     * Remove occupied cells inside a circular blast.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @returns {Array<{x: number, y: number, topLeftX: number, topLeftY: number, size: number, depth: number, distance: number, col: number, row: number}>}
     */
    destroyCircle(x, y, radius) {
        if (radius <= 0) return [];

        const startCol = clamp(Math.floor((x - radius) / this.cellSize), 0, this.columns - 1);
        const endCol = clamp(Math.floor((x + radius) / this.cellSize), 0, this.columns - 1);
        const startRow = clamp(Math.floor((y - radius) / this.cellSize), 0, this.rows - 1);
        const endRow = clamp(Math.floor((y + radius) / this.cellSize), 0, this.rows - 1);
        const removed = [];

        for (let col = startCol; col <= endCol; col++) {
            const surfaceY = this.getSurfaceYForColumn(col);
            for (let row = startRow; row <= endRow; row++) {
                if (!this.isSolid(col, row)) continue;

                const center = this.getCellCenter(col, row);
                const distance = Math.hypot(center.x - x, center.y - y);
                if (distance > radius) continue;

                this.setCell(col, row, false);
                removed.push({
                    x: center.x,
                    y: center.y,
                    topLeftX: col * this.cellSize,
                    topLeftY: row * this.cellSize,
                    size: this.cellSize,
                    depth: Math.max(this.cellSize, center.y - surfaceY),
                    distance,
                    col,
                    row
                });
            }
        }

        if (removed.length > 0) {
            this.recalculateColumnTops(startCol, endCol);
        }

        return removed;
    }

    /**
     * Export this grid back into the legacy heightmap shape.
     *
     * @param {import('./terrain.js').Terrain} terrain
     */
    writeHeightsToTerrain(terrain) {
        if (!terrain) return;

        for (let col = 0; col < this.columns; col++) {
            const height = this.screenHeight - this.getSurfaceYForColumn(col);
            const startX = col * this.cellSize;
            const endX = Math.min(this.width - 1, startX + this.cellSize - 1);

            for (let x = startX; x <= endX; x++) {
                terrain.setHeight(x, height);
            }
        }
    }

    /**
     * Iterate occupied cells with stable grid coordinates.
     *
     * @param {(cell: {x: number, y: number, topLeftX: number, topLeftY: number, size: number, col: number, row: number, surfaceY: number}) => void} visitor
     */
    forEachOccupiedCell(visitor) {
        for (let col = 0; col < this.columns; col++) {
            const surfaceY = this.getSurfaceYForColumn(col);
            for (let row = 0; row < this.rows; row++) {
                if (!this.isSolid(col, row)) continue;
                const topLeftX = col * this.cellSize;
                const topLeftY = row * this.cellSize;
                visitor({
                    x: topLeftX + this.cellSize * 0.5,
                    y: topLeftY + this.cellSize * 0.5,
                    topLeftX,
                    topLeftY,
                    size: this.cellSize,
                    col,
                    row,
                    surfaceY
                });
            }
        }
    }
}

export function getOrCreateTerrainCellGrid(terrain, options = {}) {
    if (!terrain) return null;
    const cached = terrainGridCache.get(terrain);
    const cellSize = Math.max(2, Math.floor(options.cellSize ?? DEFAULT_CELL_SIZE));
    if (
        cached &&
        cached.width === getTerrainWidth(terrain) &&
        cached.screenHeight === getTerrainScreenHeight(terrain) &&
        cached.cellSize === cellSize
    ) {
        return cached;
    }

    return rebuildTerrainCellGrid(terrain, options);
}

export function rebuildTerrainCellGrid(terrain, options = {}) {
    const grid = TerrainCellGrid.fromTerrain(terrain, options);
    if (grid) {
        terrainGridCache.set(terrain, grid);
    }
    return grid;
}
