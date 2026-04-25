import { describe, expect, it, vi } from 'vitest';
import { TANK } from '../../js/constants.js';
import { getOrCreateTerrainCellGrid } from '../../js/terrainCells.js';
import { updateTankTerrainPosition } from '../../js/tank.js';

function createTerrain(heights, screenHeight = 200) {
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

describe('tank terrain grid placement', () => {
  it('reseats tanks from persistent grid contact height instead of stale heightmap samples', () => {
    const terrain = createTerrain(new Array(128).fill(100), 200);
    const grid = getOrCreateTerrainCellGrid(terrain, {
      cellSize: 8
    });
    const tankX = 64;
    const minCol = Math.floor((tankX - TANK.WIDTH / 2) / grid.cellSize);
    const maxCol = Math.floor((tankX + TANK.WIDTH / 2) / grid.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      grid.setColumnSolidCount(col, 5);
    }

    const tank = {
      x: tankX,
      y: 100,
      isFalling: false,
      startFalling: vi.fn(function startFalling(targetY) {
        this.isFalling = true;
        this.targetY = targetY;
      })
    };

    const startedFalling = updateTankTerrainPosition(tank, terrain);

    expect(startedFalling).toBe(true);
    expect(tank.startFalling).toHaveBeenCalledWith(160);
    expect(tank.targetY).toBe(160);
  });
});
