import { describe, expect, it } from 'vitest';
import {
  getWeaponBarWeapons,
} from '../../js/ui.js';

function makeTank(inventory) {
  return {
    getAmmo(weaponId) {
      return inventory[weaponId] || 0;
    },
  };
}

describe('weapon bar', () => {
  it('shows the usable player arsenal instead of the full weapon catalog', () => {
    const tank = makeTank({
      'basic-shot': Infinity,
      missile: 3,
      mirv: 0,
      nuke: 1,
    });

    expect(getWeaponBarWeapons(tank).map(weapon => weapon.id)).toEqual([
      'basic-shot',
      'missile',
      'nuke',
    ]);
  });

  it('falls back to the default weapon if the inventory is empty', () => {
    expect(getWeaponBarWeapons(makeTank({})).map(weapon => weapon.id)).toEqual([
      'basic-shot',
    ]);
  });
});
