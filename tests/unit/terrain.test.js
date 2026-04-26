import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Terrain, createTerrain, generateTerrain } from '../../js/terrain.js';

function heightSlice(terrain, centerX, radius) {
  const values = [];
  for (let x = centerX - radius; x <= centerX + radius; x += 1) {
    values.push(terrain.getHeight(x));
  }
  return values;
}

describe('Terrain heightmap', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Float32Array heightmap with explicit dimensions', () => {
    const terrain = new Terrain(64, 300);

    expect(terrain.getWidth()).toBe(64);
    expect(terrain.getScreenHeight()).toBe(300);
    expect(terrain.heightmap).toBeInstanceOf(Float32Array);
    expect(terrain.heightmap).toHaveLength(64);
    expect(terrain.getMinHeight()).toBe(0);
    expect(terrain.getMaxHeight()).toBe(0);
  });

  it('creates default terrain from design screen dimensions', () => {
    const terrain = createTerrain();

    expect(terrain.getWidth()).toBe(1200);
    expect(terrain.getScreenHeight()).toBe(800);
    expect(terrain.heightmap).toHaveLength(1200);
  });

  it('sets, clamps, and queries heights with floored x coordinates', () => {
    const terrain = new Terrain(10, 100);

    expect(terrain.setHeight(2.9, 75)).toBe(true);
    expect(terrain.getHeight(2)).toBe(75);
    expect(terrain.getHeight(2.9)).toBe(75);

    expect(terrain.setHeight(0, -10)).toBe(true);
    expect(terrain.getHeight(0)).toBe(0);

    expect(terrain.setHeight(9, 150)).toBe(true);
    expect(terrain.getHeight(9)).toBe(100);

    expect(terrain.getHeight(-1)).toBe(0);
    expect(terrain.getHeight(10)).toBe(0);
    expect(terrain.setHeight(-1, 40)).toBe(false);
    expect(terrain.setHeight(10, 40)).toBe(false);
  });

  it('fills, clones, serializes, and deserializes height data independently', () => {
    const terrain = new Terrain(5, 120);
    terrain.fill(80);
    terrain.setHeight(2, 40);

    const clone = terrain.clone();
    clone.setHeight(2, 100);

    expect(terrain.getHeight(2)).toBe(40);
    expect(clone.getHeight(2)).toBe(100);

    const serialized = terrain.serialize();
    expect(serialized).toEqual({
      width: 5,
      screenHeight: 120,
      heights: [80, 80, 40, 80, 80]
    });

    const restored = Terrain.deserialize(serialized);
    expect(restored.getWidth()).toBe(5);
    expect(restored.getScreenHeight()).toBe(120);
    expect(Array.from(restored.heightmap)).toEqual(serialized.heights);
  });

  it('rejects invalid serialized terrain data', () => {
    expect(() => Terrain.deserialize(null)).toThrow('Invalid terrain data: missing width or heights');
    expect(() => Terrain.deserialize({ width: 3, heights: [1, 2] })).toThrow(
      'Invalid terrain data: heights length (2) does not match width (3)'
    );
  });
});

describe('terrain generation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates deterministic seeded terrain within configured height bounds', () => {
    const first = generateTerrain(128, 400, {
      seed: 12345,
      roughness: 0.5,
      minHeightPercent: 0.25,
      maxHeightPercent: 0.75
    });
    const second = generateTerrain(128, 400, {
      seed: 12345,
      roughness: 0.5,
      minHeightPercent: 0.25,
      maxHeightPercent: 0.75
    });

    expect(first.heightmap).toBeInstanceOf(Float32Array);
    expect(first.heightmap).toHaveLength(128);
    expect(Array.from(second.heightmap)).toEqual(Array.from(first.heightmap));
    expect(first.getMinHeight()).toBeGreaterThanOrEqual(100);
    expect(first.getMaxHeight()).toBeLessThanOrEqual(300);
  });

  it('uses the same seed to produce the same terrain and different seeds to vary it', () => {
    const seedA1 = generateTerrain(64, 300, { seed: 1 });
    const seedA2 = generateTerrain(64, 300, { seed: 1 });
    const seedB = generateTerrain(64, 300, { seed: 2 });

    expect(Array.from(seedA2.heightmap)).toEqual(Array.from(seedA1.heightmap));
    expect(Array.from(seedB.heightmap)).not.toEqual(Array.from(seedA1.heightmap));
  });
});

describe('terrain destruction and collision', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('destroys a circular crater centered on the blast point', () => {
    const terrain = new Terrain(101, 300);
    terrain.fill(200);

    expect(terrain.destroyTerrain(50, 100, 20)).toBe(true);

    expect(terrain.getHeight(50)).toBeCloseTo(180, 5);
    expect(terrain.getHeight(40)).toBeCloseTo(200 - Math.sqrt(300), 5);
    expect(terrain.getHeight(60)).toBeCloseTo(terrain.getHeight(40), 5);
    expect(terrain.getHeight(30)).toBe(200);
    expect(terrain.getHeight(70)).toBe(200);
  });

  it('accumulates overlapping destruction without raising terrain', () => {
    const terrain = new Terrain(101, 300);
    terrain.fill(200);

    terrain.destroyTerrain(50, 100, 20);
    const afterFirst = heightSlice(terrain, 50, 5);

    terrain.destroyTerrain(50, 110, 20);
    const afterSecond = heightSlice(terrain, 50, 5);

    for (let i = 0; i < afterSecond.length; i += 1) {
      expect(afterSecond[i]).toBeLessThanOrEqual(afterFirst[i]);
    }
    expect(terrain.getHeight(50)).toBeCloseTo(170, 5);
  });

  it('clamps destruction to terrain bounds and minimum height', () => {
    const terrain = new Terrain(20, 300);
    terrain.fill(40);

    expect(terrain.destroyTerrain(0, 290, 50)).toBe(true);

    expect(terrain.getHeight(0)).toBe(0);
    expect(terrain.getHeight(19)).toBe(0);
    expect(terrain.getMinHeight()).toBe(0);
  });

  it('does nothing for non-positive blast radii or blasts that miss terrain', () => {
    const terrain = new Terrain(20, 300);
    terrain.fill(40);

    expect(terrain.destroyTerrain(10, 260, 0)).toBe(false);
    expect(terrain.destroyTerrain(10, 260, -5)).toBe(false);
    expect(terrain.destroyTerrain(10, 10, 5)).toBe(false);
    expect(terrain.getMinHeight()).toBe(40);
  });

  it('handles very small and very large blast radii', () => {
    const terrain = new Terrain(50, 300);
    terrain.fill(220);

    expect(terrain.destroyTerrain(25, 80, 1)).toBe(true);
    expect(terrain.getHeight(25)).toBe(219);

    expect(terrain.destroyTerrain(25, 180, 500)).toBe(true);
    expect(terrain.getMinHeight()).toBe(0);
    expect(terrain.getMaxHeight()).toBe(0);
  });

  it('detects collisions above, at, and below the terrain surface', () => {
    const terrain = new Terrain(80, 300);
    terrain.fill(100);

    expect(terrain.checkTerrainCollision(24, 199)).toMatchObject({
      hit: false,
      x: 24,
      y: 199
    });
    expect(terrain.checkTerrainCollision(24, 200)).toMatchObject({
      hit: true,
      x: 24,
      y: 200
    });
    const belowSurface = terrain.checkTerrainCollision(24, 220);
    expect(belowSurface).toMatchObject({
      hit: true,
      x: 24
    });
    expect(belowSurface.y).toBeGreaterThanOrEqual(200);
    expect(belowSurface.y).toBeLessThanOrEqual(220);
    expect(terrain.checkTerrainCollision(-1, 220)).toBeNull();
  });

  it('settles unsupported spikes with falling dirt physics', () => {
    const terrain = new Terrain(40, 300);
    terrain.fill(100);
    terrain.setHeight(20, 220);

    const result = terrain.applyFallingDirt(20, 8);

    expect(result.modified).toBe(true);
    expect(result.fallingColumns).toEqual([]);
    expect(terrain.getHeight(20)).toBeLessThan(220);
    expect(terrain.getHeight(20)).toBeGreaterThanOrEqual(100);
  });
});
