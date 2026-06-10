import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDamageNumbers,
  getActiveDamageNumberCount,
  initDamageNumbers,
  renderDamageNumbers
} from '../../js/damageNumbers.js';
import { GAMEPLAY_EVENTS, emitGameplayEvent } from '../../js/gameplayEvents.js';

function makeCtx() {
  const calls = { fillText: [], strokeText: [] };
  return {
    calls,
    save() {},
    restore() {},
    fillText(text, x, y) { calls.fillText.push({ text, x, y }); },
    strokeText(text, x, y) { calls.strokeText.push({ text, x, y }); },
    set textAlign(_) {},
    set textBaseline(_) {}
  };
}

function emitDamage(overrides = {}) {
  emitGameplayEvent(GAMEPLAY_EVENTS.TANK_DAMAGED, {
    tank: { x: 500, y: 400, team: 'enemy' },
    team: 'enemy',
    actualDamage: 24,
    isDirectHit: false,
    shieldDamage: 0,
    healthDamage: 24,
    ...overrides
  });
}

describe('floating damage numbers', () => {
  beforeEach(() => {
    initDamageNumbers();
    clearDamageNumbers();
  });

  it('spawns a number for damaging TANK_DAMAGED events', () => {
    emitDamage();
    expect(getActiveDamageNumberCount()).toBe(1);
  });

  it('ignores zero-damage events', () => {
    emitDamage({ actualDamage: 0, healthDamage: 0 });
    expect(getActiveDamageNumberCount()).toBe(0);
  });

  it('renders the rounded damage value', () => {
    emitDamage({ actualDamage: 17.6, healthDamage: 17.6 });
    const ctx = makeCtx();
    renderDamageNumbers(ctx);
    expect(ctx.calls.fillText.map(c => c.text)).toContain('18');
    // Outline stroke is drawn under the fill for readability.
    expect(ctx.calls.strokeText.length).toBe(ctx.calls.fillText.length);
  });

  it('caps the number of simultaneous floaters', () => {
    for (let i = 0; i < 30; i++) emitDamage();
    expect(getActiveDamageNumberCount()).toBeLessThanOrEqual(14);
  });

  it('clears on demand', () => {
    emitDamage();
    clearDamageNumbers();
    expect(getActiveDamageNumberCount()).toBe(0);
    const ctx = makeCtx();
    renderDamageNumbers(ctx);
    expect(ctx.calls.fillText).toHaveLength(0);
  });
});
