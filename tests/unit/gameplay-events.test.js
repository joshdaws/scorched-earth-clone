import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GAMEPLAY_EVENTS,
  clearGameplayEventListeners,
  emitGameplayEvent,
  getGameplayEventListenerCount,
  onGameplayEvent,
  onceGameplayEvent
} from '../../js/gameplayEvents.js';

describe('gameplayEvents', () => {
  afterEach(() => {
    clearGameplayEventListeners();
    vi.restoreAllMocks();
  });

  it('delivers payloads to subscribed listeners', () => {
    const listener = vi.fn();

    onGameplayEvent(GAMEPLAY_EVENTS.PROJECTILE_IMPACT, listener);
    const count = emitGameplayEvent(GAMEPLAY_EVENTS.PROJECTILE_IMPACT, {
      x: 120,
      y: 240,
      weaponId: 'basic-shot'
    });

    expect(count).toBe(1);
    expect(listener).toHaveBeenCalledWith({
      x: 120,
      y: 240,
      weaponId: 'basic-shot'
    });
  });

  it('unsubscribes listeners', () => {
    const listener = vi.fn();
    const unsubscribe = onGameplayEvent(GAMEPLAY_EVENTS.TERRAIN_CHANGED, listener);

    expect(getGameplayEventListenerCount(GAMEPLAY_EVENTS.TERRAIN_CHANGED)).toBe(1);

    unsubscribe();
    emitGameplayEvent(GAMEPLAY_EVENTS.TERRAIN_CHANGED, { changed: true });

    expect(listener).not.toHaveBeenCalled();
    expect(getGameplayEventListenerCount(GAMEPLAY_EVENTS.TERRAIN_CHANGED)).toBe(0);
  });

  it('supports one-shot listeners', () => {
    const listener = vi.fn();

    onceGameplayEvent(GAMEPLAY_EVENTS.TANK_DAMAGED, listener);
    emitGameplayEvent(GAMEPLAY_EVENTS.TANK_DAMAGED, { damage: 10 });
    emitGameplayEvent(GAMEPLAY_EVENTS.TANK_DAMAGED, { damage: 20 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ damage: 10 });
  });

  it('continues dispatching when one listener throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const afterThrow = vi.fn();

    onGameplayEvent(GAMEPLAY_EVENTS.ROUND_RESULT, () => {
      throw new Error('listener failed');
    });
    onGameplayEvent(GAMEPLAY_EVENTS.ROUND_RESULT, afterThrow);

    const count = emitGameplayEvent(GAMEPLAY_EVENTS.ROUND_RESULT, { winner: 'player' });

    expect(count).toBe(2);
    expect(afterThrow).toHaveBeenCalledWith({ winner: 'player' });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('validates event type and listener arguments', () => {
    expect(() => onGameplayEvent('', () => {})).toThrow(TypeError);
    expect(() => onGameplayEvent(GAMEPLAY_EVENTS.PROJECTILE_IMPACT, null)).toThrow(TypeError);
  });
});
