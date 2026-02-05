import { describe, expect, it } from 'vitest';
import { createDefaultTankDesign } from '../../js/tank-design-schema.js';
import {
  TURRET_ANCHOR_BOUNDS,
  enforceTurretAnchorGuardrail,
  validateTurretAnchor
} from '../../js/tank-turret-constraints.js';

describe('tank-turret-constraints', () => {
  it('clamps anchors to bounds', () => {
    const result = validateTurretAnchor({ anchorX: 999, anchorY: -42, baseRadius: 30 });

    expect(result.corrected.anchorX).toBe(TURRET_ANCHOR_BOUNDS.maxX);
    expect(result.corrected.anchorY).toBe(TURRET_ANCHOR_BOUNDS.minY);
    expect(result.corrected.baseRadius).toBeLessThanOrEqual(14);
    expect(result.valid).toBe(false);
  });

  it('keeps valid anchors unchanged', () => {
    const result = validateTurretAnchor({ anchorX: 32, anchorY: 8, baseRadius: 8 });

    expect(result.valid).toBe(true);
    expect(result.corrected.anchorX).toBe(32);
    expect(result.corrected.anchorY).toBe(8);
  });

  it('enforces guardrails on full design payloads', () => {
    const design = createDefaultTankDesign({ skinId: 'standard', rarity: 'common' });
    design.turret.anchorX = 4;
    design.turret.anchorY = 31;

    const guarded = enforceTurretAnchorGuardrail(design);

    expect(guarded.modified).toBe(true);
    expect(guarded.design.turret.anchorX).toBeGreaterThanOrEqual(TURRET_ANCHOR_BOUNDS.minX);
    expect(guarded.design.turret.anchorY).toBeLessThanOrEqual(TURRET_ANCHOR_BOUNDS.maxY);
  });
});
