import {
  buildTerrainFromSlot,
  createLayoutsExportPayload,
  enforcePlayerSlingGuardrail,
  getGlobalLayoutConfig,
  getPuzzleObjectsForSlot,
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

  it('includes authored terrain setpieces for staged ammo lessons', () => {
    const sampleAt = (slot, xNorm) => slot.terrainSamples[Math.round(xNorm * (slot.terrainSamples.length - 1))];

    const firstShot = getSlotLayout('world1-level1');
    const roller = getSlotLayout('world1-level5');
    const bouncer = getSlotLayout('world1-level7');
    const digger = getSlotLayout('world2-level5');
    const vertical = getSlotLayout('world5-level7');
    const nuke = getSlotLayout('world6-level7');

    expect(sampleAt(firstShot, 0.2) - sampleAt(firstShot, 0.55)).toBeLessThan(0.06);
    expect(sampleAt(roller, 0.2)).toBeGreaterThan(sampleAt(roller, roller.enemyXNorm - 0.1) + 0.12);
    expect(sampleAt(bouncer, 0.55)).toBeGreaterThan(sampleAt(bouncer, bouncer.enemyXNorm) + 0.16);
    expect(sampleAt(digger, 0.55)).toBeGreaterThan(sampleAt(digger, digger.enemyXNorm) + 0.18);
    expect(sampleAt(vertical, vertical.enemyXNorm)).toBeGreaterThan(sampleAt(vertical, 0.2) + 0.08);
    expect(Math.max(...nuke.terrainSamples)).toBeGreaterThan(0.64);
  });

  it('normalizes authored puzzle objects and scales them for runtime', () => {
    const ricochetSlot = getSlotLayout('world2-level1');
    const shieldSlot = getSlotLayout('world3-level1');
    const teleportObjects = getPuzzleObjectsForSlot('world4-level1', 1200, 800);

    expect(ricochetSlot.objects.map(object => object.type)).toEqual(['ricochet', 'ricochet']);
    expect(shieldSlot.objects.map(object => object.type)).toEqual(['shield', 'bunker']);
    expect(teleportObjects.map(object => object.type)).toEqual(['teleport', 'teleport', 'ricochet']);
    expect(teleportObjects[0]).toMatchObject({
      x: 588,
      y: 272,
      radius: 44,
      pairId: 'w4l1-vortex',
    });
  });

  it('authors an intro, remix, and combined puzzle-object route in every world', () => {
    const expectedMechanicsByWorld = {
      1: ['ricochet', 'bunker'],
      2: ['ricochet', 'bunker'],
      3: ['shield', 'bunker', 'ricochet'],
      4: ['teleport', 'shield', 'ricochet', 'bunker'],
      5: ['bunker', 'shield', 'ricochet', 'teleport'],
      6: ['ricochet', 'shield', 'bunker', 'teleport'],
    };

    for (let world = 1; world <= 6; world++) {
      const authoredLevels = [];
      const seenTypes = new Set();

      for (let level = 1; level <= 10; level++) {
        const slot = getSlotLayout(`world${world}-level${level}`);
        if (slot.objects.length === 0) continue;

        authoredLevels.push({ level, types: slot.objects.map(object => object.type) });
        for (const object of slot.objects) {
          seenTypes.add(object.type);
        }
      }

      expect(authoredLevels.length).toBeGreaterThanOrEqual(3);
      expect(authoredLevels.some(entry => entry.types.length >= 2)).toBe(true);
      expect(new Set(authoredLevels.at(-1).types).size).toBeGreaterThanOrEqual(2);

      for (const type of expectedMechanicsByWorld[world]) {
        expect(seenTypes.has(type)).toBe(true);
      }
    }
  });
});
