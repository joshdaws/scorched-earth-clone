import { describe, expect, it, vi } from 'vitest';
import { renderCanvasTerrain, renderTerrainScene, TERRAIN_EDGE_COLOR, TERRAIN_FILL_COLOR } from '../../js/terrainRenderer.js';

function createCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    restore: vi.fn(),
    fillStyle: null,
    strokeStyle: null,
    shadowColor: null,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    lineWidth: 0
  };
}

function createTerrain() {
  return {
    getWidth: vi.fn(() => 4),
    getScreenHeight: vi.fn(() => 100),
    getHeight: vi.fn(x => [20, 30, 40, 50][Math.floor(x)] ?? 20)
  };
}

describe('terrainRenderer', () => {
  it('delegates to the Pixi terrain layer when it renders successfully', () => {
    const ctx = createCtx();
    const terrain = createTerrain();
    const renderPixiTerrainLayerToCanvas = vi.fn(() => true);

    renderTerrainScene(ctx, terrain, { renderPixiTerrainLayerToCanvas });

    expect(renderPixiTerrainLayerToCanvas).toHaveBeenCalledWith(ctx, terrain);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('falls back to the canvas terrain path when Pixi is unavailable', () => {
    const ctx = createCtx();
    const terrain = createTerrain();

    renderCanvasTerrain(ctx, terrain);

    expect(ctx.beginPath).toHaveBeenCalledTimes(2);
    expect(ctx.fillStyle).toBe(TERRAIN_FILL_COLOR);
    expect(ctx.strokeStyle).toBe(TERRAIN_EDGE_COLOR);
    expect(ctx.fill).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    expect(ctx.lineTo).toHaveBeenCalledWith(3, 100);
  });
});
