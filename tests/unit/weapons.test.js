/**
 * Weapon System Tests
 */

import { describe, it, expect } from 'vitest';
import {
  WeaponRegistry,
  WEAPON_TYPES,
  BASIC_SHOT,
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

    it('includes Basic Shot as first weapon', () => {
      const weapons = WeaponRegistry.getAllWeapons();
      expect(weapons[0].id).toBe('basic-shot');
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
        expect(w.screenShake).toBe(true);
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
      expect(count).toBe(11); // 11 weapons defined in spec
    });
  });
});

describe('Weapon Properties', () => {
  describe('Basic Shot', () => {
    it('has correct properties', () => {
      expect(BASIC_SHOT.cost).toBe(0);
      expect(BASIC_SHOT.ammo).toBe(Infinity);
      expect(BASIC_SHOT.damage).toBe(25);
      expect(BASIC_SHOT.blastRadius).toBe(30);
      expect(BASIC_SHOT.type).toBe(WEAPON_TYPES.STANDARD);
    });
  });

  describe('Missile', () => {
    it('has correct properties', () => {
      expect(MISSILE.cost).toBe(500);
      expect(MISSILE.ammo).toBe(5);
      expect(MISSILE.damage).toBe(35);
      expect(MISSILE.type).toBe(WEAPON_TYPES.STANDARD);
    });
  });

  describe('MIRV', () => {
    it('is a splitting weapon with correct split count', () => {
      expect(MIRV.type).toBe(WEAPON_TYPES.SPLITTING);
      expect(MIRV.splitCount).toBe(5);
      expect(MIRV.splitAngle).toBe(30);
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
