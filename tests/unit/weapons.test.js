/**
 * Weapon System Tests
 */

import { describe, it, expect } from 'vitest';
import {
  WeaponRegistry,
  WEAPON_TYPES,
  BASIC_SHOT,
  BABY_SHOT,
  MISSILE,
  MIRV,
  NUKE
} from '../../js/weapons.js';

describe('WeaponRegistry', () => {
  describe('getWeapon', () => {
    it('returns weapon by ID', () => {
      const weapon = WeaponRegistry.getWeapon('basic-shot');
      expect(weapon).not.toBeNull();
      expect(weapon.id).toBe('basic-shot');
      expect(weapon.name).toBe('Basic Shot');
    });

    it('returns null for unknown weapon', () => {
      const weapon = WeaponRegistry.getWeapon('unknown-weapon');
      expect(weapon).toBeNull();
    });
  });

  describe('getAllWeapons', () => {
    it('returns array of all weapons', () => {
      const weapons = WeaponRegistry.getAllWeapons();
      expect(Array.isArray(weapons)).toBe(true);
      expect(weapons.length).toBeGreaterThan(0);
    });

    it('includes Baby Shot as first weapon (sorted by category)', () => {
      const weapons = WeaponRegistry.getAllWeapons();
      // Baby Shot is first in Standard category, which is first category
      expect(weapons[0].id).toBe('baby-shot');
    });
  });

  describe('getWeaponsByType', () => {
    it('returns only standard weapons when filtering by standard type', () => {
      const weapons = WeaponRegistry.getWeaponsByType(WEAPON_TYPES.STANDARD);
      expect(weapons.length).toBeGreaterThan(0);
      weapons.forEach(w => {
        expect(w.type).toBe(WEAPON_TYPES.STANDARD);
      });
    });

    it('returns splitting weapons correctly', () => {
      const weapons = WeaponRegistry.getWeaponsByType(WEAPON_TYPES.SPLITTING);
      expect(weapons.length).toBeGreaterThan(0);
      weapons.forEach(w => {
        expect(w.type).toBe(WEAPON_TYPES.SPLITTING);
        expect(w.splitCount).toBeGreaterThan(0);
      });
    });

    it('returns nuclear weapons correctly', () => {
      const weapons = WeaponRegistry.getWeaponsByType(WEAPON_TYPES.NUCLEAR);
      expect(weapons.length).toBeGreaterThan(0);
      weapons.forEach(w => {
        expect(w.type).toBe(WEAPON_TYPES.NUCLEAR);
        // Most nuclear weapons have screenShake, but EMP Blast doesn't
        // So we check that at least the effect flags are present
        expect(typeof w.screenShake).toBe('boolean');
      });
    });
  });

  describe('getPurchasableWeapons', () => {
    it('returns only weapons with cost > 0', () => {
      const weapons = WeaponRegistry.getPurchasableWeapons();
      weapons.forEach(w => {
        expect(w.cost).toBeGreaterThan(0);
      });
    });

    it('does not include Basic Shot', () => {
      const weapons = WeaponRegistry.getPurchasableWeapons();
      const basicShot = weapons.find(w => w.id === 'basic-shot');
      expect(basicShot).toBeUndefined();
    });
  });

  describe('hasWeapon', () => {
    it('returns true for existing weapon', () => {
      expect(WeaponRegistry.hasWeapon('basic-shot')).toBe(true);
      expect(WeaponRegistry.hasWeapon('nuke')).toBe(true);
    });

    it('returns false for non-existing weapon', () => {
      expect(WeaponRegistry.hasWeapon('unknown')).toBe(false);
    });
  });

  describe('getDefaultWeapon', () => {
    it('returns Basic Shot', () => {
      const weapon = WeaponRegistry.getDefaultWeapon();
      expect(weapon.id).toBe('basic-shot');
      expect(weapon.cost).toBe(0);
      expect(weapon.ammo).toBe(Infinity);
    });
  });

  describe('getWeaponCount', () => {
    it('returns correct weapon count', () => {
      const count = WeaponRegistry.getWeaponCount();
      expect(count).toBe(40); // 40 weapons defined in expanded spec
    });
  });

  describe('getWeaponsByCategory', () => {
    it('returns weapons for each category', () => {
      const categories = ['standard', 'splitting', 'rolling', 'digging', 'nuclear', 'special'];
      categories.forEach(cat => {
        const weapons = WeaponRegistry.getWeaponsByCategory(cat);
        expect(weapons.length).toBeGreaterThan(0);
        weapons.forEach(w => {
          expect(w.category).toBe(cat);
        });
      });
    });

    it('returns correct counts per category', () => {
      expect(WeaponRegistry.getWeaponsByCategory('standard').length).toBe(8);
      expect(WeaponRegistry.getWeaponsByCategory('splitting').length).toBe(6);
      expect(WeaponRegistry.getWeaponsByCategory('rolling').length).toBe(6);
      expect(WeaponRegistry.getWeaponsByCategory('digging').length).toBe(6);
      expect(WeaponRegistry.getWeaponsByCategory('nuclear').length).toBe(6);
      expect(WeaponRegistry.getWeaponsByCategory('special').length).toBe(8);
    });
  });

  describe('getUnlockedWeapons', () => {
    it('returns available weapons at round 1', () => {
      const weapons = WeaponRegistry.getUnlockedWeapons(1, 0);
      expect(weapons.length).toBeGreaterThan(0);
      weapons.forEach(w => {
        expect(w.unlockRequirement).toBe('available');
      });
    });

    it('returns more weapons at later rounds', () => {
      const round1 = WeaponRegistry.getUnlockedWeapons(1, 0);
      const round5 = WeaponRegistry.getUnlockedWeapons(5, 0);
      expect(round5.length).toBeGreaterThan(round1.length);
    });

    it('returns all weapons at round 5 with 10 wins', () => {
      const weapons = WeaponRegistry.getUnlockedWeapons(5, 10);
      expect(weapons.length).toBe(40);
    });
  });
});

describe('Weapon Properties', () => {
  describe('Basic Shot', () => {
    it('has correct properties', () => {
      expect(BASIC_SHOT.cost).toBe(0);
      expect(BASIC_SHOT.ammo).toBe(Infinity);
      expect(BASIC_SHOT.damage).toBe(30);
      expect(BASIC_SHOT.blastRadius).toBe(30);
      expect(BASIC_SHOT.type).toBe(WEAPON_TYPES.STANDARD);
    });
  });

  describe('Baby Shot', () => {
    it('has correct properties', () => {
      expect(BABY_SHOT.cost).toBe(0);
      expect(BABY_SHOT.ammo).toBe(Infinity);
      expect(BABY_SHOT.damage).toBe(15);
      expect(BABY_SHOT.blastRadius).toBe(20);
      expect(BABY_SHOT.type).toBe(WEAPON_TYPES.STANDARD);
    });
  });

  describe('Missile', () => {
    it('has correct properties', () => {
      expect(MISSILE.cost).toBe(500);
      expect(MISSILE.ammo).toBe(5);
      expect(MISSILE.damage).toBe(40);
      expect(MISSILE.type).toBe(WEAPON_TYPES.STANDARD);
    });
  });

  describe('MIRV', () => {
    it('is a splitting weapon with correct split count', () => {
      expect(MIRV.type).toBe(WEAPON_TYPES.SPLITTING);
      expect(MIRV.splitCount).toBe(3);
      expect(MIRV.splitAngle).toBe(25);
    });
  });

  describe('Splitting Weapons', () => {
    it("Death's Head splits into 5 warheads", () => {
      const weapon = WeaponRegistry.getWeapon('deaths-head');
      expect(weapon.type).toBe(WEAPON_TYPES.SPLITTING);
      expect(weapon.splitCount).toBe(5);
      expect(weapon.splitAngle).toBe(35);
    });

    it('Cluster Bomb splits into 8 bomblets', () => {
      const weapon = WeaponRegistry.getWeapon('cluster-bomb');
      expect(weapon.type).toBe(WEAPON_TYPES.SPLITTING);
      expect(weapon.splitCount).toBe(8);
      expect(weapon.splitAngle).toBe(50);
    });

    it('Chain Reaction has chain reaction flag', () => {
      const weapon = WeaponRegistry.getWeapon('chain-reaction');
      expect(weapon.type).toBe(WEAPON_TYPES.SPLITTING);
      expect(weapon.splitCount).toBe(2);
      expect(weapon.chainReaction).toBe(true);
    });

    it('Scatter Shot has wide spread angle', () => {
      const weapon = WeaponRegistry.getWeapon('scatter-shot');
      expect(weapon.type).toBe(WEAPON_TYPES.SPLITTING);
      expect(weapon.splitCount).toBe(6);
      expect(weapon.splitAngle).toBe(60);
    });

    it('Fireworks splits into 12 colorful projectiles', () => {
      const weapon = WeaponRegistry.getWeapon('fireworks');
      expect(weapon.type).toBe(WEAPON_TYPES.SPLITTING);
      expect(weapon.splitCount).toBe(12);
      expect(weapon.splitAngle).toBe(90);
    });
  });

  describe('Nuke', () => {
    it('has nuclear effects enabled', () => {
      expect(NUKE.type).toBe(WEAPON_TYPES.NUCLEAR);
      expect(NUKE.screenShake).toBe(true);
      expect(NUKE.screenFlash).toBe(true);
      expect(NUKE.mushroomCloud).toBe(true);
      expect(NUKE.blastRadius).toBe(150);
      expect(NUKE.damage).toBe(100);
    });
  });

  describe('Rolling Category Weapons', () => {
    it('Heavy Roller has increased timeout for momentum', () => {
      const weapon = WeaponRegistry.getWeapon('heavy-roller');
      expect(weapon.type).toBe(WEAPON_TYPES.ROLLING);
      expect(weapon.rollTimeout).toBe(4000); // Longer timeout than Roller (3000)
      expect(weapon.damage).toBe(45); // Higher damage
      expect(weapon.blastRadius).toBe(45); // Larger radius
    });

    it('Bouncer has exactly 3 bounces', () => {
      const weapon = WeaponRegistry.getWeapon('bouncer');
      expect(weapon.type).toBe(WEAPON_TYPES.ROLLING);
      expect(weapon.bounceCount).toBe(3);
      expect(weapon.damage).toBe(25);
    });

    it('Super Bouncer has exactly 6 bounces', () => {
      const weapon = WeaponRegistry.getWeapon('super-bouncer');
      expect(weapon.type).toBe(WEAPON_TYPES.ROLLING);
      expect(weapon.bounceCount).toBe(6);
      expect(weapon.damage).toBe(35);
    });

    it('Land Mine is deployable with proximity trigger', () => {
      const weapon = WeaponRegistry.getWeapon('land-mine');
      expect(weapon.type).toBe(WEAPON_TYPES.ROLLING);
      expect(weapon.deployable).toBe(true);
      expect(weapon.rollTimeout).toBe(10000); // 10 second persistence
      expect(weapon.damage).toBe(50);
    });

    it('Sticky Bomb is deployable with timer', () => {
      const weapon = WeaponRegistry.getWeapon('sticky-bomb');
      expect(weapon.type).toBe(WEAPON_TYPES.ROLLING);
      expect(weapon.deployable).toBe(true);
      expect(weapon.rollTimeout).toBe(2000); // 2 second timer
      expect(weapon.damage).toBe(40);
    });
  });

  describe('Weapon immutability', () => {
    it('weapons are frozen objects', () => {
      expect(Object.isFrozen(BASIC_SHOT)).toBe(true);
      expect(Object.isFrozen(NUKE)).toBe(true);
    });

    it('cannot modify weapon properties', () => {
      expect(() => {
        BASIC_SHOT.damage = 999;
      }).toThrow();
    });
  });
});
