import { afterEach, describe, expect, it } from 'vitest';
import { getTurretPivot } from '../../js/tank-visuals.js';
import { createDefaultTankDesign } from '../../js/tank-design-schema.js';
import { setRuntimeTankDesign } from '../../js/tank-design-runtime.js';

describe('tank-visuals pivot alignment', () => {
  afterEach(() => {
    setRuntimeTankDesign('standard', null);
    setRuntimeTankDesign('__player__', null);
  });

  it('uses legacy fallback anchor when no runtime design exists', () => {
    const pivot = getTurretPivot({ x: 100, y: 200, team: 'player' });

    expect(pivot.x).toBe(100);
    expect(pivot.y).toBe(176); // y - body height (24)
  });

  it('uses runtime turret anchor for equipped skin', () => {
    const design = createDefaultTankDesign({ skinId: 'standard', rarity: 'common' });
    design.turret.anchorX = 40;
    design.turret.anchorY = 10;

    setRuntimeTankDesign('standard', design);

    const pivot = getTurretPivot({ x: 100, y: 200, team: 'player' });

    expect(pivot.x).toBe(108); // 100 + (40 - 32)
    expect(pivot.y).toBe(178); // (200 - 32) + 10
  });

  it('keeps enemy pivot unchanged', () => {
    const pivot = getTurretPivot({ x: 300, y: 460, team: 'enemy' });
    expect(pivot.x).toBe(300);
    expect(pivot.y).toBe(436);
  });
});
