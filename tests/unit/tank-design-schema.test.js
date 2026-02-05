import { describe, expect, it } from 'vitest';
import {
  TANK_CANVAS,
  TANK_DESIGN_VERSION,
  createDefaultTankDesign,
  validateTankDesign,
  validateTankDesignPack
} from '../../js/tank-design-schema.js';

describe('tank-design-schema', () => {
  it('creates a valid default design', () => {
    const design = createDefaultTankDesign({ skinId: 'standard', rarity: 'common' });
    const result = validateTankDesign(design);

    expect(result.valid).toBe(true);
    expect(result.normalized.version).toBe(TANK_DESIGN_VERSION);
    expect(result.normalized.canvas.width).toBe(TANK_CANVAS.WIDTH);
    expect(result.normalized.canvas.height).toBe(TANK_CANVAS.HEIGHT);
  });

  it('rejects invalid rarity', () => {
    const design = createDefaultTankDesign({ skinId: 'standard', rarity: 'common' });
    design.rarity = 'mythic';

    const result = validateTankDesign(design);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('rarity');
  });

  it('validates pack uniqueness by skin ID', () => {
    const first = createDefaultTankDesign({ skinId: 'standard', rarity: 'common' });
    const second = createDefaultTankDesign({ skinId: 'standard', rarity: 'rare' });

    const result = validateTankDesignPack({
      version: TANK_DESIGN_VERSION,
      designs: [first, second]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('duplicate skinId');
  });
});
