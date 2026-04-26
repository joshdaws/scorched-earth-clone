import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTerrainDerezSamples,
  captureTerrainDerezSnapshot,
  clearTerrainDerezEffects,
  getTerrainDerezEffectCount,
  renderTerrainDerezEffects,
  spawnTerrainDerezEffect,
  updateTerrainDerezEffects
} from '../../js/terrainDerezEffect.js';

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

function createMockContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    shadowColor: '#000000',
    shadowBlur: 0,
    fillStyle: '#000000'
  };
}

describe('terrainDerezEffect', () => {
  beforeEach(() => {
    clearTerrainDerezEffects();
  });

  it('captures bounded terrain columns before crater destruction', () => {
    const terrain = createTerrain(new Array(100).fill(220));

    const snapshot = captureTerrainDerezSnapshot(terrain, 5, 20, {
      sampleStep: 5,
      maxSamples: 20
    });

    expect(snapshot.screenHeight).toBe(600);
    expect(snapshot.columns[0]).toEqual({ x: 0, height: 220 });
    expect(snapshot.columns.at(-1).x).toBeLessThanOrEqual(25);
  });

  it('builds anchored samples only for removed terrain columns', () => {
    const terrain = createTerrain(new Array(80).fill(250));
    const snapshot = captureTerrainDerezSnapshot(terrain, 40, 12, {
      sampleStep: 4
    });

    terrain.setHeight(36, 220);
    terrain.setHeight(40, 210);
    terrain.setHeight(44, 250);

    const samples = buildTerrainDerezSamples(snapshot, terrain);

    expect(samples).toEqual([
      { x: 36, y: 362.6, depth: 30 },
      { x: 40, y: 366.8, depth: 40 }
    ]);
  });

  it('keeps pixels anchored while fading effect lifetime out', () => {
    spawnTerrainDerezEffect({
      x: 100,
      y: 300,
      radius: 40,
      samples: [
        { x: 92, y: 302, depth: 25 },
        { x: 108, y: 306, depth: 35 }
      ]
    });

    expect(getTerrainDerezEffectCount()).toBe(1);

    updateTerrainDerezEffects(260);
    const ctx = createMockContext();
    renderTerrainDerezEffects(ctx);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();

    updateTerrainDerezEffects(2000);
    expect(getTerrainDerezEffectCount()).toBe(0);
  });

  it('ignores empty sample sets', () => {
    spawnTerrainDerezEffect({
      x: 100,
      y: 300,
      radius: 40,
      samples: []
    });

    expect(getTerrainDerezEffectCount()).toBe(0);
  });
});
