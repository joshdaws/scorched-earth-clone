/**
 * Test fixtures for game objects
 */

import { TANK, PHYSICS } from '../../js/constants.js';

/**
 * Create a mock tank object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock tank
 */
export function createMockTank(overrides = {}) {
  const defaults = {
    x: 200,
    y: 300,
    health: TANK.START_HEALTH,
    maxHealth: TANK.MAX_HEALTH,
    team: 'player',
    angle: 45,
    power: 50,
    width: TANK.WIDTH,
    height: TANK.HEIGHT
  };

  const tank = { ...defaults, ...overrides };

  return {
    ...tank,
    getBounds: () => ({
      x: tank.x - tank.width / 2,
      y: tank.y - tank.height,
      width: tank.width,
      height: tank.height
    }),
    isDestroyed: () => tank.health <= 0,
    takeDamage: vi.fn((amount) => {
      const actualDamage = Math.min(amount, tank.health);
      tank.health -= actualDamage;
      return actualDamage;
    }),
    getCenter: () => ({
      x: tank.x,
      y: tank.y - tank.height / 2
    })
  };
}

/**
 * Create a mock explosion object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock explosion
 */
export function createMockExplosion(overrides = {}) {
  return {
    x: 200,
    y: 300,
    blastRadius: 40,
    ...overrides
  };
}

/**
 * Create a mock projectile object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock projectile
 */
export function createMockProjectile(overrides = {}) {
  return {
    x: 200,
    y: 300,
    vx: 5,
    vy: -10,
    weapon: null,
    owner: null,
    active: true,
    trail: [],
    ...overrides
  };
}

/**
 * Create a mock terrain object for testing
 * @param {number} width - Terrain width
 * @returns {Object} Mock terrain
 */
export function createMockTerrain(width = 1200) {
  // Create a flat terrain at height 400
  const heights = new Array(width).fill(400);

  return {
    heights,
    width,
    getHeight: (x) => heights[Math.floor(x)] || 0,
    setHeight: (x, h) => {
      if (x >= 0 && x < width) {
        heights[Math.floor(x)] = h;
      }
    },
    destroy: vi.fn((x, radius) => {
      // Simple destruction simulation
      const startX = Math.max(0, Math.floor(x - radius));
      const endX = Math.min(width - 1, Math.floor(x + radius));
      for (let i = startX; i <= endX; i++) {
        const dist = Math.abs(i - x);
        const depth = radius - dist;
        if (depth > 0) {
          heights[i] = Math.max(0, heights[i] - depth);
        }
      }
    })
  };
}

/**
 * Create physics test data for projectile calculations
 */
export const PHYSICS_TEST_DATA = {
  // Straight up shot
  straightUp: {
    angle: 90,
    power: 50,
    expectedVx: 0,
    expectedVySign: -1 // Negative = upward
  },
  // 45 degree shot
  diagonal: {
    angle: 45,
    power: 100,
    expectedVxSign: 1, // Positive = rightward
    expectedVySign: -1
  },
  // Flat shot
  flat: {
    angle: 0,
    power: 50,
    expectedVySign: 0,
    expectedVxSign: 1
  }
};

/**
 * Calculate expected velocity from angle and power
 * @param {number} angle - Angle in degrees (0 = right, 90 = up)
 * @param {number} power - Power 0-100
 * @returns {{vx: number, vy: number}} Velocity components
 */
export function calculateExpectedVelocity(angle, power) {
  const radians = (angle * Math.PI) / 180;
  const speed = (power / 100) * PHYSICS.MAX_VELOCITY;
  return {
    vx: Math.cos(radians) * speed,
    vy: -Math.sin(radians) * speed // Negative because canvas Y is inverted
  };
}
