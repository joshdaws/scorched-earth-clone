import { describe, expect, it } from 'vitest';
import {
  buildTerrainCellDebrisSpec,
  getPixiTerrainDebrisLimits,
  selectTerrainDebrisCells
} from '../../js/pixiTerrainLayer.js';

describe('pixiTerrainLayer debris helpers', () => {
  it('caps selected de-rez cells to the configured spawn budget', () => {
    const cells = Array.from({ length: 900 }, (_, index) => ({
      x: index,
      y: 100,
      size: 8
    }));

    const selected = selectTerrainDebrisCells(cells);
    const limits = getPixiTerrainDebrisLimits();

    expect(selected.length).toBeLessThanOrEqual(limits.maxSpawnCells);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected[0]).toBe(cells[0]);
    expect(selected.at(-1)).toBe(cells[895]);
  });

  it('builds debris from the exact removed terrain cell center and size', () => {
    const spec = buildTerrainCellDebrisSpec({
      x: 100,
      y: 100,
      radius: 48,
      index: 0,
      cell: {
        x: 132,
        y: 100,
        topLeftX: 128,
        topLeftY: 96,
        size: 8,
        depth: 8,
        col: 16,
        row: 12
      }
    });

    expect(spec.startX).toBe(132);
    expect(spec.startY).toBe(100);
    expect(spec.size).toBe(8);
    expect(spec.targetX).toBeGreaterThan(spec.startX);
    expect(spec.lifetime).toBeGreaterThanOrEqual(560);
    expect(spec.lifetime).toBeLessThanOrEqual(680);
    expect(spec.tint).toBeGreaterThanOrEqual(0);
    expect(spec.tint).toBeLessThanOrEqual(0xffffff);
  });

  it('falls back to top-left cell coordinates when a center is not provided', () => {
    const spec = buildTerrainCellDebrisSpec({
      x: 100,
      y: 100,
      radius: 40,
      index: 2,
      cell: {
        topLeftX: 120,
        topLeftY: 136,
        size: 8
      }
    });

    expect(spec.startX).toBe(124);
    expect(spec.startY).toBe(140);
    expect(spec.size).toBe(8);
  });
});
