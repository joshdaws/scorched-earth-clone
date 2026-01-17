/**
 * Damage Calculation Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateDamage, DAMAGE } from '../../js/damage.js';
import { createMockTank, createMockExplosion } from '../helpers/game-fixtures.js';

// Mock the debugTools module to avoid dependency issues
vi.mock('../../js/debugTools.js', () => ({
  isGodModeEnabled: () => false
}));

describe('calculateDamage', () => {
  let tank;
  let explosion;

  beforeEach(() => {
    tank = createMockTank({
      x: 200,
      y: 300,
      width: 64,
      height: 32
    });
    explosion = createMockExplosion({
      x: 200,
      y: 284, // Just above tank center
      blastRadius: 40
    });
  });

  describe('basic damage calculation', () => {
    it('returns 0 for null explosion', () => {
      const damage = calculateDamage(null, tank);
      expect(damage).toBe(0);
    });

    it('returns 0 for null tank', () => {
      const damage = calculateDamage(explosion, null);
      expect(damage).toBe(0);
    });

    it('returns damage for explosion at tank center', () => {
      // Explosion at tank center should do significant damage
      explosion.x = tank.x;
      explosion.y = tank.y - tank.height / 2;
      const damage = calculateDamage(explosion, tank);
      expect(damage).toBeGreaterThan(0);
    });

    it('returns 0 for explosion outside blast radius', () => {
      // Move explosion far away
      explosion.x = tank.x + 200;
      explosion.y = tank.y + 200;
      const damage = calculateDamage(explosion, tank);
      expect(damage).toBe(0);
    });
  });

  describe('linear falloff', () => {
    it('deals maximum damage at center', () => {
      // Direct hit at tank position
      explosion.x = tank.x;
      explosion.y = tank.y - tank.height / 2;
      explosion.blastRadius = 40;

      const damage = calculateDamage(explosion, tank);
      // Should get direct hit bonus (1.5x) on max damage
      expect(damage).toBeGreaterThanOrEqual(DAMAGE.DEFAULT_MAX_DAMAGE);
    });

    it('deals less damage at edge of blast radius', () => {
      // Position explosion at edge of blast
      const edgeDistance = explosion.blastRadius - 5;
      explosion.x = tank.x + edgeDistance;

      const centerDamage = calculateDamage(createMockExplosion({ x: tank.x, y: tank.y - tank.height / 2 }), tank);
      const edgeDamage = calculateDamage(explosion, tank);

      expect(edgeDamage).toBeLessThan(centerDamage);
    });
  });

  describe('direct hit bonus', () => {
    it('applies 1.5x multiplier for direct hits', () => {
      // Position explosion directly at tank
      explosion.x = tank.x;
      explosion.y = tank.y - tank.height / 2;

      const damage = calculateDamage(explosion, tank);

      // Direct hit should be at least base damage * multiplier
      expect(damage).toBeGreaterThanOrEqual(
        Math.round(DAMAGE.DEFAULT_MAX_DAMAGE * DAMAGE.DIRECT_HIT_MULTIPLIER)
      );
    });
  });

  describe('weapon-specific damage', () => {
    it('uses weapon damage when provided', () => {
      const weapon = { damage: 50, blastRadius: 60 };
      explosion.x = tank.x;
      explosion.y = tank.y - tank.height / 2;

      const damage = calculateDamage(explosion, tank, weapon);

      // Should use weapon damage, not default
      expect(damage).toBeGreaterThan(DAMAGE.DEFAULT_MAX_DAMAGE);
    });

    it('uses weapon blast radius when provided', () => {
      const weapon = { damage: 25, blastRadius: 200 };
      // Position far outside default radius (40px) but inside weapon radius (200px)
      // Tank bounding box at x=200 goes from x=168 to x=232 (width 64)
      // We need to be > 40px from tank edge at x=232, so x > 272
      explosion.x = tank.x + 150; // This is x=350, distance from edge (232) = 118px > 40
      explosion.y = tank.y;
      // Remove explosion's blastRadius so it falls back to weapon's
      delete explosion.blastRadius;

      const damageWithDefault = calculateDamage(explosion, tank);
      const damageWithWeapon = calculateDamage(explosion, tank, weapon);

      // Default should miss (outside default 40px), weapon should hit (inside 200px)
      expect(damageWithDefault).toBe(0);
      expect(damageWithWeapon).toBeGreaterThan(0);
    });

    it('uses explosion blast radius over weapon when provided', () => {
      const weapon = { damage: 25, blastRadius: 30 };
      explosion.blastRadius = 80; // Override weapon radius

      // Position outside weapon radius but inside explosion radius
      explosion.x = tank.x + 50;
      explosion.y = tank.y;

      const damage = calculateDamage(explosion, tank, weapon);
      expect(damage).toBeGreaterThan(0);
    });
  });

  describe('bounding box collision', () => {
    it('registers hit when explosion touches tank edge', () => {
      // Position explosion just outside tank's left edge
      const tankBounds = tank.getBounds();
      explosion.x = tankBounds.x - 10;
      explosion.y = tankBounds.y + tankBounds.height / 2;
      explosion.blastRadius = 40;

      const damage = calculateDamage(explosion, tank);
      expect(damage).toBeGreaterThan(0);
    });

    it('uses distance to nearest edge, not center', () => {
      // Position explosion at tank's edge - should be closer than center
      const tankBounds = tank.getBounds();
      explosion.x = tankBounds.x;
      explosion.y = tankBounds.y + tankBounds.height / 2;

      const damage = calculateDamage(explosion, tank);
      // Should register as very close/direct hit since it's AT the edge
      expect(damage).toBeGreaterThan(0);
    });
  });
});

describe('DAMAGE constants', () => {
  it('has correct direct hit distance', () => {
    expect(DAMAGE.DIRECT_HIT_DISTANCE).toBe(5);
  });

  it('has correct direct hit multiplier', () => {
    expect(DAMAGE.DIRECT_HIT_MULTIPLIER).toBe(1.5);
  });

  it('has correct default blast radius', () => {
    expect(DAMAGE.DEFAULT_BLAST_RADIUS).toBe(40);
  });

  it('has correct default max damage', () => {
    expect(DAMAGE.DEFAULT_MAX_DAMAGE).toBe(25);
  });
});
