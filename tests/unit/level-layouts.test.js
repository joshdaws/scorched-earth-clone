import {
  buildTerrainFromSlot,
  createLayoutsExportPayload,
  enforcePlayerSlingGuardrail,
  getGlobalLayoutConfig,
  getSlotLayout,
  getSpawnForSlot,
  validateLayoutsPayload,
} from '../../js/level-layouts.js';
import {
  createBaselineSlotLayout,
  resampleArray,
} from '../../js/level-layouts-baseline.js';

describe('level layouts', () => {
  it('resamples arrays with linear interpolation', () => {
    const result = resampleArray([0, 1], 5);

    expect(result).toHaveLength(5);
    expect(result[0]).toBeCloseTo(0, 6);
    expect(result[1]).toBeCloseTo(0.25, 6);
    expect(result[2]).toBeCloseTo(0.5, 6);
    expect(result[3]).toBeCloseTo(0.75, 6);
    expect(result[4]).toBeCloseTo(1, 6);
  });

  it('creates deterministic baseline slot terrain for same level id', () => {
    const baselineA = createBaselineSlotLayout('world3-level4');
    const baselineB = createBaselineSlotLayout('world3-level4');

    expect(baselineA.terrainSamples).toHaveLength(240);
    expect(baselineB.terrainSamples).toHaveLength(240);
    expect(baselineA.enemyXNorm).toBeCloseTo(0.8, 6);
    expect(baselineB.enemyXNorm).toBeCloseTo(0.8, 6);
    expect(baselineA.terrainSamples.slice(0, 24)).toEqual(baselineB.terrainSamples.slice(0, 24));
  });

  it('auto-corrects unsafe player sling clearance', () => {
    const unsafeSlot = {
      terrainSamples: new Array(240).fill(0.05),
      enemyXNorm: 0.8,
    };

    const result = enforcePlayerSlingGuardrail(
      unsafeSlot,
      {
        playerAnchorXNorm: 0.2,
        minSlingClearancePx: 220,
        autoFixRadiusPx: 90,
      },
      800,
      1200,
    );

    expect(result.modified).toBe(true);
    expect(result.afterClearancePx).toBeGreaterThanOrEqual(220);
    expect(result.slotLayout.terrainSamples[48]).toBeGreaterThan(unsafeSlot.terrainSamples[48]);
  });

  it('does not modify safe slot clearance', () => {
    const safeSlot = {
      terrainSamples: new Array(240).fill(0.36),
      enemyXNorm: 0.8,
    };

    const result = enforcePlayerSlingGuardrail(
      safeSlot,
      {
        playerAnchorXNorm: 0.2,
        minSlingClearancePx: 220,
        autoFixRadiusPx: 90,
      },
      800,
      1200,
    );

    expect(result.modified).toBe(false);
    expect(result.beforeClearancePx).toBeGreaterThan(220);
    expect(result.slotLayout.terrainSamples).toEqual(safeSlot.terrainSamples);
  });

  it('validates payload schema and rejects malformed slot ids/lengths', () => {
    const validPayload = createLayoutsExportPayload();
    expect(validateLayoutsPayload(validPayload).valid).toBe(true);

    const invalidPayload = {
      ...validPayload,
      slots: {
        ...validPayload.slots,
        'not-a-level': {
          terrainSamples: new Array(240).fill(0.3),
          enemyXNorm: 0.8,
        },
      },
    };

    delete invalidPayload.slots['world1-level1'];
    invalidPayload.slots['world1-level2'] = {
      ...invalidPayload.slots['world1-level2'],
      terrainSamples: [0.2, 0.3],
    };

    const validation = validateLayoutsPayload(invalidPayload);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(err => err.includes('Unknown slot ID: not-a-level'))).toBe(true);
    expect(validation.errors.some(err => err.includes('Missing slot ID: world1-level1'))).toBe(true);
    expect(validation.errors.some(err => err.includes('world1-level2.terrainSamples'))).toBe(true);
  });

  it('uses fixed player anchor and clamped enemy spawn in slot spawns', () => {
    const slotOverride = {
      terrainSamples: new Array(240).fill(0.30),
      enemyXNorm: 0.95,
    };

    const width = 1200;
    const height = 800;
    const terrain = buildTerrainFromSlot('world1-level1', width, height, {
      slotOverride,
      applyGuardrail: true,
    });

    const spawn = getSpawnForSlot('world1-level1', terrain, width, height, {
      slotOverride,
      globalConfig: getGlobalLayoutConfig(),
    });

    expect(spawn.player.x).toBeCloseTo(Math.round(0.2 * (width - 1)), 0);
    expect(spawn.enemy.x).toBeGreaterThan(spawn.player.x + 250);
  });
});
