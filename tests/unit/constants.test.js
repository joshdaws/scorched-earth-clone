/**
 * Game Constants Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CANVAS,
  PHYSICS,
  TANK,
  GAME,
  GAME_STATES,
  TURN_PHASES,
  COLORS,
  TERRAIN,
  PROJECTILE
} from '../../js/constants.js';

describe('CANVAS constants', () => {
  it('has correct design dimensions', () => {
    expect(CANVAS.DESIGN_WIDTH).toBe(1200);
    expect(CANVAS.DESIGN_HEIGHT).toBe(800);
  });

  it('has correct aspect ratio', () => {
    expect(CANVAS.ASPECT_RATIO).toBeCloseTo(1.5, 2); // 3:2 = 1.5
  });

  it('has minimum dimensions less than design', () => {
    expect(CANVAS.MIN_WIDTH).toBeLessThan(CANVAS.DESIGN_WIDTH);
    expect(CANVAS.MIN_HEIGHT).toBeLessThan(CANVAS.DESIGN_HEIGHT);
  });
});

describe('PHYSICS constants', () => {
  it('has positive gravity', () => {
    expect(PHYSICS.GRAVITY).toBeGreaterThan(0);
  });

  it('has reasonable max velocity', () => {
    expect(PHYSICS.MAX_VELOCITY).toBeGreaterThan(0);
    expect(PHYSICS.MAX_VELOCITY).toBeLessThan(100);
  });

  it('has symmetric wind range', () => {
    expect(PHYSICS.WIND_RANGE).toBeGreaterThan(0);
  });

  it('has valid power range', () => {
    expect(PHYSICS.MIN_POWER).toBe(0);
    expect(PHYSICS.MAX_POWER).toBe(100);
    expect(PHYSICS.MIN_POWER).toBeLessThan(PHYSICS.MAX_POWER);
  });

  it('has valid angle range', () => {
    expect(PHYSICS.MIN_ANGLE).toBe(0);
    expect(PHYSICS.MAX_ANGLE).toBe(180);
  });
});

describe('TANK constants', () => {
  it('has positive dimensions', () => {
    expect(TANK.WIDTH).toBeGreaterThan(0);
    expect(TANK.HEIGHT).toBeGreaterThan(0);
  });

  it('has valid health values', () => {
    expect(TANK.START_HEALTH).toBe(100);
    expect(TANK.MAX_HEALTH).toBe(100);
    expect(TANK.START_HEALTH).toBeLessThanOrEqual(TANK.MAX_HEALTH);
  });

  it('has fall damage configuration', () => {
    expect(TANK.FALL).toBeDefined();
    expect(TANK.FALL.GRAVITY).toBeGreaterThan(0);
    expect(TANK.FALL.DAMAGE_THRESHOLD).toBeGreaterThan(0);
    expect(TANK.FALL.LETHAL_DISTANCE).toBeGreaterThan(TANK.FALL.DAMAGE_THRESHOLD);
  });
});

describe('GAME constants', () => {
  it('has positive starting money', () => {
    expect(GAME.STARTING_MONEY).toBeGreaterThan(0);
  });

  it('has reasonable rounds per match', () => {
    expect(GAME.ROUNDS_PER_MATCH).toBeGreaterThan(0);
    expect(GAME.ROUNDS_PER_MATCH).toBeLessThan(100);
  });
});

describe('GAME_STATES', () => {
  it('has all required states', () => {
    expect(GAME_STATES.MENU).toBeDefined();
    expect(GAME_STATES.PLAYING).toBeDefined();
    expect(GAME_STATES.PAUSED).toBeDefined();
    expect(GAME_STATES.SHOP).toBeDefined();
    expect(GAME_STATES.GAME_OVER).toBeDefined();
  });

  it('states are unique strings', () => {
    const states = Object.values(GAME_STATES);
    const uniqueStates = new Set(states);
    expect(uniqueStates.size).toBe(states.length);
  });
});

describe('TURN_PHASES', () => {
  it('has player and AI phases', () => {
    expect(TURN_PHASES.PLAYER_AIM).toBeDefined();
    expect(TURN_PHASES.PLAYER_FIRE).toBeDefined();
    expect(TURN_PHASES.AI_AIM).toBeDefined();
    expect(TURN_PHASES.AI_FIRE).toBeDefined();
  });

  it('has projectile flight phase', () => {
    expect(TURN_PHASES.PROJECTILE_FLIGHT).toBeDefined();
  });
});

describe('COLORS', () => {
  it('has synthwave neon colors', () => {
    expect(COLORS.NEON_PINK).toBeDefined();
    expect(COLORS.NEON_CYAN).toBeDefined();
    expect(COLORS.NEON_PURPLE).toBeDefined();
  });

  it('colors are valid hex strings', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    expect(COLORS.NEON_PINK).toMatch(hexPattern);
    expect(COLORS.NEON_CYAN).toMatch(hexPattern);
    expect(COLORS.BACKGROUND).toMatch(hexPattern);
  });

  it('has distinct player colors', () => {
    expect(COLORS.PLAYER_1).not.toBe(COLORS.PLAYER_2);
  });
});

describe('TERRAIN constants', () => {
  it('has valid height range', () => {
    expect(TERRAIN.MIN_HEIGHT).toBeGreaterThan(0);
    expect(TERRAIN.MAX_HEIGHT).toBeGreaterThan(TERRAIN.MIN_HEIGHT);
  });

  it('has falling dirt configuration', () => {
    expect(TERRAIN.FALLING_DIRT).toBeDefined();
    expect(TERRAIN.FALLING_DIRT.ENABLED).toBeDefined();
    expect(TERRAIN.FALLING_DIRT.HEIGHT_THRESHOLD).toBeGreaterThan(0);
  });
});

describe('PROJECTILE constants', () => {
  it('has valid default values', () => {
    expect(PROJECTILE.DEFAULT_RADIUS).toBeGreaterThan(0);
    expect(PROJECTILE.DEFAULT_DAMAGE).toBeGreaterThan(0);
  });

  it('has trail configuration', () => {
    expect(PROJECTILE.TRAIL_LENGTH).toBeGreaterThan(0);
    expect(PROJECTILE.TRAIL_FADE).toBeGreaterThan(0);
    expect(PROJECTILE.TRAIL_FADE).toBeLessThanOrEqual(1);
  });

  it('has self-collision safe distance', () => {
    expect(PROJECTILE.SELF_COLLISION_SAFE_DISTANCE).toBeGreaterThan(0);
  });
});
