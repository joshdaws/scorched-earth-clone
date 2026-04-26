import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME } from '../../js/constants.js';
import * as Money from '../../js/money.js';
import * as Shop from '../../js/shop.js';
import { WeaponRegistry } from '../../js/weapons.js';

vi.mock('../../js/runState.js', () => ({
  recordStat: vi.fn()
}));

vi.mock('../../js/sound.js', () => ({
  playPurchaseSound: vi.fn(),
  playErrorSound: vi.fn(),
  playClickSound: vi.fn()
}));

vi.mock('../../js/progression-achievements.js', () => ({
  onInventoryChanged: vi.fn()
}));

vi.mock('../../js/hidden-achievements.js', () => ({
  onInventoryChanged: vi.fn()
}));

vi.mock('../../js/unlocks.js', () => ({
  Unlocks: {
    getWeaponUnlockInfo: vi.fn(() => ({ unlocked: true, hint: 'available' }))
  }
}));

function createShopTank() {
  const inventory = {};
  return {
    inventory,
    addAmmo: vi.fn((weaponId, amount) => {
      inventory[weaponId] = (inventory[weaponId] || 0) + amount;
    }),
    getAmmo: vi.fn(weaponId => inventory[weaponId] || 0)
  };
}

describe('money economy', () => {
  beforeEach(() => {
    Money.init();
    vi.clearAllMocks();
  });

  it('starts new games with the current roguelike starting balance', () => {
    expect(GAME.STARTING_MONEY).toBe(1500);
    expect(Money.MONEY.STARTING_AMOUNT).toBe(1500);
    expect(Money.getMoney()).toBe(1500);
  });

  it('sets direct balances without allowing negative money', () => {
    Money.setMoney(725);
    expect(Money.getMoney()).toBe(725);

    Money.setMoney(-50);
    expect(Money.getMoney()).toBe(0);
  });

  it('awards hit rewards as base plus damage bonus', () => {
    Money.startRound(1);

    expect(Money.awardHitReward(45)).toBe(140);
    expect(Money.getRoundEarnings()).toBe(140);
    expect(Money.getRoundDamage()).toBe(45);
    expect(Money.getMoney()).toBe(1640);
  });

  it('awards base hit reward for zero damage', () => {
    Money.startRound(1);

    expect(Money.awardHitReward(0)).toBe(Money.MONEY.HIT_BASE_REWARD);
    expect(Money.getRoundDamage()).toBe(0);
  });

  it('uses current six-tier round multipliers for hit rewards', () => {
    expect(Money.getMultiplierForRound(1)).toBe(1.0);
    expect(Money.getMultiplierForRound(2)).toBe(1.0);
    expect(Money.getMultiplierForRound(3)).toBe(1.1);
    expect(Money.getMultiplierForRound(5)).toBe(1.2);
    expect(Money.getMultiplierForRound(7)).toBe(1.3);
    expect(Money.getMultiplierForRound(9)).toBe(1.4);
    expect(Money.getMultiplierForRound(11)).toBe(1.5);

    Money.startRound(3);
    expect(Money.awardHitReward(45)).toBe(Math.floor(140 * 1.1));
  });

  it('awards round outcome bonuses from current round tuning', () => {
    Money.startRound(1);
    expect(Money.awardVictoryBonus()).toBe(500);

    Money.startRound(5);
    expect(Money.awardVictoryBonus()).toBe(700);
    expect(Money.awardDefeatConsolation()).toBe(120);

    Money.startRound(11);
    expect(Money.awardVictoryBonus()).toBe(1200);
    expect(Money.awardDefeatConsolation()).toBe(150);
  });

  it('spends money only when the full cost is available', () => {
    Money.setMoney(500);

    expect(Money.spendMoney(500, 'exact purchase')).toBe(true);
    expect(Money.getMoney()).toBe(0);
    expect(Money.spendMoney(1, 'too much')).toBe(false);
    expect(Money.getMoney()).toBe(0);
  });

  it('formats balances for display', () => {
    expect(Money.formatMoney(1500)).toBe('$1,500');
  });
});

describe('shop purchases', () => {
  let tank;

  beforeEach(() => {
    Money.init();
    Money.setMoney(1500);
    tank = createShopTank();
    Shop.show(tank);
    vi.clearAllMocks();
  });

  it('deducts exact weapon cost and adds purchased ammo', () => {
    const missile = WeaponRegistry.getWeapon('missile');

    expect(Shop.purchaseWeapon('missile')).toBe(true);
    expect(Money.getMoney()).toBe(1500 - missile.cost);
    expect(tank.addAmmo).toHaveBeenCalledWith('missile', missile.ammo);
    expect(tank.inventory.missile).toBe(missile.ammo);
  });

  it('allows exact-balance purchases without going negative', () => {
    const missile = WeaponRegistry.getWeapon('missile');
    Money.setMoney(missile.cost);

    expect(Shop.purchaseWeapon('missile')).toBe(true);
    expect(Money.getMoney()).toBe(0);
    expect(tank.inventory.missile).toBe(missile.ammo);
  });

  it('rejects insufficient funds without changing money or inventory', () => {
    const missile = WeaponRegistry.getWeapon('missile');
    Money.setMoney(missile.cost - 1);

    expect(Shop.purchaseWeapon('missile')).toBe(false);
    expect(Money.getMoney()).toBe(missile.cost - 1);
    expect(tank.inventory.missile).toBeUndefined();
  });

  it('increments inventory across multiple purchases of the same weapon', () => {
    const tracer = WeaponRegistry.getWeapon('tracer');
    Money.setMoney(tracer.cost * 2);

    expect(Shop.purchaseWeapon('tracer')).toBe(true);
    expect(Shop.purchaseWeapon('tracer')).toBe(true);

    expect(Money.getMoney()).toBe(0);
    expect(tank.inventory.tracer).toBe(tracer.ammo * 2);
  });

  it('returns false for unknown weapons and missing shop tank', () => {
    expect(Shop.purchaseWeapon('missing-weapon')).toBe(false);

    Shop.hide();
    expect(Shop.purchaseWeapon('missile')).toBe(false);
  });
});
