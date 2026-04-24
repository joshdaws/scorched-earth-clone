import { describe, expect, it, vi } from 'vitest';
import {
  buildRemovedTerrainCells,
  captureTerrainCellSnapshot,
  getTerrainCellSize
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
});
