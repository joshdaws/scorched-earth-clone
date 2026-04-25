import { describe, expect, it, vi } from 'vitest';
import {
  buildRemovedTerrainCells,
  captureTerrainCellSnapshot,
  checkTerrainGridCollision,
  getOrCreateTerrainCellGrid,
  getTerrainCellSize,
  getTerrainGridContactHeight,
  getTerrainGridHeightAt,
  rebuildTerrainCellGrid,
  TerrainCellGrid
} from '../../js/terrainCells.js';

function createTerrain(heights, screenHeight = 600) {
  return {
    width: heights.length,
    screenHeight,
    getWidth: vi.fn(() => heights.length),
    getScreenHeight: vi.fn(() => screenHeight),
    getHeight: vi.fn(x => heights[Math.floor(x)] ?? 0),
    setHeight: vi.fn((x, value) => {
      heights[Math.floor(x)] = value;
    })
  };
}

describe('terrainCells', () => {
  it('captures cell-aligned columns around an impact', () => {
    const terrain = createTerrain(new Array(80).fill(240));

    const snapshot = captureTerrainCellSnapshot(terrain, 34, 14);

    expect(snapshot.cellSize).toBe(getTerrainCellSize());
    expect(snapshot.screenHeight).toBe(600);
    expect(snapshot.columns[0].x % snapshot.cellSize).toBe(0);
    expect(snapshot.columns.at(-1).x).toBeLessThanOrEqual(48);
  });

  it('builds removed terrain cells from the pre/post height difference', () => {
    const terrain = createTerrain(new Array(80).fill(240));
    const snapshot = captureTerrainCellSnapshot(terrain, 32, 10, {
      cellSize: 8
    });

    terrain.setHeight(36, 208);

    const cells = buildRemovedTerrainCells(snapshot, terrain);

    expect(cells.length).toBeGreaterThan(0);
    expect(cells[0]).toMatchObject({
      x: 36,
      size: 8,
      depth: 32
    });
    expect(cells.every(cell => cell.topLeftY % 8 === 0)).toBe(true);
  });

  it('caps very large removal sets deterministically', () => {
    const terrain = createTerrain(new Array(240).fill(500), 700);
    const snapshot = captureTerrainCellSnapshot(terrain, 120, 90, {
      cellSize: 4
    });

    for (let x = 0; x < 240; x++) {
      terrain.setHeight(x, 50);
    }

    const cells = buildRemovedTerrainCells(snapshot, terrain, {
      maxCells: 40
    });

    expect(cells.length).toBeLessThanOrEqual(40);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('builds a persistent grid from terrain and exports compatible heights', () => {
    const terrain = createTerrain(new Array(32).fill(240), 400);
    const grid = TerrainCellGrid.fromTerrain(terrain, {
      cellSize: 8
    });

    expect(grid.columns).toBe(4);
    expect(grid.rows).toBe(50);
    expect(grid.getHeightAt(4)).toBe(240);

    const removed = grid.destroyCircle(12, 172, 14);

    expect(removed.length).toBeGreaterThan(0);
    grid.writeHeightsToTerrain(terrain);
    expect(terrain.getHeight(12)).toBeLessThan(240);
  });

  it('collapses unsupported cells downward inside a column', () => {
    const grid = new TerrainCellGrid({
      width: 24,
      screenHeight: 48,
      cellSize: 8
    });

    grid.setCell(1, 1, true);
    grid.setCell(1, 5, true);
    grid.recalculateColumnTops();

    const result = grid.settleUnsupported({
      minCol: 1,
      maxCol: 1
    });

    expect(result.modified).toBe(true);
    expect(grid.isSolid(1, 1)).toBe(false);
    expect(grid.isSolid(1, 4)).toBe(true);
    expect(grid.isSolid(1, 5)).toBe(true);
    expect(grid.getHeightAt(12)).toBe(16);
  });

  it('redistributes steep unsupported columns into a stable stepped slope', () => {
    const grid = new TerrainCellGrid({
      width: 16,
      screenHeight: 64,
      cellSize: 8
    });

    grid.setColumnSolidCount(0, 8);
    grid.setColumnSolidCount(1, 1);

    const result = grid.settleUnsupported({
      minCol: 0,
      maxCol: 1,
      maxSlopeCells: 2
    });

    const leftCount = grid.getColumnSolidCount(0);
    const rightCount = grid.getColumnSolidCount(1);
    expect(result.modified).toBe(true);
    expect(leftCount + rightCount).toBe(9);
    expect(Math.abs(leftCount - rightCount)).toBeLessThanOrEqual(2);
  });

  it('carves side impacts from cliffs before settling the remaining cells', () => {
    const heights = new Array(64).fill(0).map((_, x) => x < 32 ? 48 : 16);
    const terrain = createTerrain(heights, 64);
    const grid = TerrainCellGrid.fromTerrain(terrain, {
      cellSize: 8
    });

    const beforeHeight = grid.getHeightAt(28);
    const removed = grid.destroyCircle(28, 36, 11);
    const settled = grid.settleUnsupported({
      minCol: 0,
      maxCol: 7,
      maxSlopeCells: 3
    });
    grid.writeHeightsToTerrain(terrain);

    expect(removed.length).toBeGreaterThan(0);
    expect(settled.modified).toBe(true);
    expect(terrain.getHeight(28)).toBeLessThan(beforeHeight);
  });

  it('queries collision from the persistent grid instead of stale height projection', () => {
    const terrain = createTerrain(new Array(64).fill(48), 64);
    const grid = TerrainCellGrid.fromTerrain(terrain, {
      cellSize: 8
    });

    grid.setCell(3, 4, false);
    grid.recalculateColumnTops();

    const cachedGrid = getOrCreateTerrainCellGrid(terrain, {
      cellSize: 8
    });
    cachedGrid.cells.set(grid.cells);
    cachedGrid.recalculateColumnTops();

    expect(checkTerrainGridCollision(terrain, 28, 36, { cellSize: 8 })).toMatchObject({
      hit: false,
      x: 28,
      y: 36
    });
    expect(checkTerrainGridCollision(terrain, 28, 20, { cellSize: 8 })).toMatchObject({
      hit: true,
      x: 28,
      y: 16
    });
  });

  it('uses grid contact height for tank-width terrain reads', () => {
    const terrain = createTerrain(new Array(64).fill(32), 64);
    const grid = getOrCreateTerrainCellGrid(terrain, {
      cellSize: 8
    });

    grid.setColumnSolidCount(3, 6);
    grid.setColumnSolidCount(4, 2);

    expect(getTerrainGridHeightAt(terrain, 36, { cellSize: 8 })).toBe(16);
    expect(getTerrainGridContactHeight(terrain, 36, 24, { cellSize: 8 })).toBe(48);
  });

  it('reuses cached terrain grids until explicitly rebuilt', () => {
    const terrain = createTerrain(new Array(40).fill(200), 400);
    const first = getOrCreateTerrainCellGrid(terrain);
    terrain.setHeight(12, 160);
    const cached = getOrCreateTerrainCellGrid(terrain);
    const rebuilt = rebuildTerrainCellGrid(terrain);

    expect(cached).toBe(first);
    expect(rebuilt).not.toBe(first);
    expect(rebuilt.getHeightAt(12)).toBe(160);
  });
});
