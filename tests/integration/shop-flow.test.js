import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockContext } from '../helpers/canvas-mock.js';

vi.mock('../../js/sound.js', () => ({
  playPurchaseSound: vi.fn(),
  playErrorSound: vi.fn(),
  playClickSound: vi.fn()
}));

function createShopTank() {
  const inventory = {};
  return {
    inventory,
    shield: 0,
    maxShield: 100,
    addAmmo: vi.fn((weaponId, amount) => {
      inventory[weaponId] = (inventory[weaponId] || 0) + amount;
    }),
    getAmmo: vi.fn(weaponId => inventory[weaponId] || 0)
  };
}

async function freshShopFlow() {
  vi.resetModules();
  const [constants, Game, Money, Shop, Stars, weapons] = await Promise.all([
    import('../../js/constants.js'),
    import('../../js/game.js'),
    import('../../js/money.js'),
    import('../../js/shop.js'),
    import('../../js/stars.js'),
    import('../../js/weapons.js')
  ]);

  Game.init();
  Money.init();
  Stars.resetAll();
  return {
    GAME_STATES: constants.GAME_STATES,
    Game,
    Money,
    Shop,
    Stars,
    WeaponRegistry: weapons.WeaponRegistry
  };
}

function unlockStarWeapons(Stars, totalStars = 30) {
  const levels = Math.ceil(totalStars / 3);
  for (let i = 1; i <= levels; i++) {
    Stars.setForLevel(`qa-level-${i}`, 3);
  }
}

describe('shop flow integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('opens from victory state with current balance, weapon prices, and owned quantities available to the UI', async () => {
    const { GAME_STATES, Game, Money, Shop, Stars, WeaponRegistry } = await freshShopFlow();
    const tank = createShopTank();
    unlockStarWeapons(Stars, 30);

    expect(Game.setState(GAME_STATES.PLAYING)).toBe(true);
    expect(Game.setState(GAME_STATES.VICTORY)).toBe(true);
    expect(Game.setState(GAME_STATES.SHOP)).toBe(true);
    Shop.show(tank);

    const state = Shop.getDebugState();
    expect(state.visible).toBe(true);
    expect(state.activeTab).toBe('weapons');
    expect(state.balance).toBe(Money.MONEY.STARTING_AMOUNT);
    expect(state.weapons).toHaveLength(WeaponRegistry.getAllWeapons().length);

    const missile = state.weapons.find(weapon => weapon.id === 'missile');
    expect(missile).toMatchObject({
      name: 'Missile',
      cost: 500,
      ammoPerPurchase: 5,
      unlocked: true,
      canAfford: true,
      currentAmmo: 0
    });

    const ctx = createMockContext();
    ctx.roundRect = vi.fn();
    Shop.render(ctx);
    const renderedText = ctx.fillText.mock.calls.map(call => call[0]);
    expect(renderedText).toContain('WEAPON SHOP');
    expect(renderedText).toContain('YOUR BALANCE');
    expect(renderedText).toContain('$1,500');
  });

  it('deducts money, updates inventory, and exposes success feedback after an affordable purchase', async () => {
    const { Money, Shop, Stars, WeaponRegistry } = await freshShopFlow();
    const tank = createShopTank();
    unlockStarWeapons(Stars, 30);
    Money.setMoney(1500);
    Shop.show(tank);

    const missile = WeaponRegistry.getWeapon('missile');
    expect(Shop.purchaseWeapon('missile')).toBe(true);

    const state = Shop.getDebugState();
    expect(Money.getMoney()).toBe(1500 - missile.cost);
    expect(tank.addAmmo).toHaveBeenCalledWith('missile', missile.ammo);
    expect(state.weapons.find(weapon => weapon.id === 'missile').currentAmmo).toBe(missile.ammo);
    expect(state.feedback).toMatchObject({
      active: true,
      weaponId: 'missile',
      success: true
    });
  });

  it('rejects unaffordable purchases without changing money or inventory, then allows a later valid buy', async () => {
    const { Money, Shop, Stars, WeaponRegistry } = await freshShopFlow();
    const tank = createShopTank();
    unlockStarWeapons(Stars, 30);
    const missile = WeaponRegistry.getWeapon('missile');
    Shop.show(tank);

    Money.setMoney(missile.cost - 1);
    expect(Shop.purchaseWeapon('missile')).toBe(false);
    expect(Money.getMoney()).toBe(missile.cost - 1);
    expect(tank.inventory.missile).toBeUndefined();
    expect(Shop.getDebugState().feedback).toMatchObject({
      active: true,
      weaponId: 'missile',
      success: false
    });

    Money.setMoney(missile.cost);
    expect(Shop.purchaseWeapon('missile')).toBe(true);
    expect(Money.getMoney()).toBe(0);
    expect(tank.inventory.missile).toBe(missile.ammo);
  });

  it('supports multiple purchases and closes into the next round with inventory preserved', async () => {
    const { GAME_STATES, Game, Money, Shop, Stars, WeaponRegistry } = await freshShopFlow();
    const tank = createShopTank();
    unlockStarWeapons(Stars, 30);
    const missile = WeaponRegistry.getWeapon('missile');
    const bigShot = WeaponRegistry.getWeapon('big-shot');
    Money.setMoney(missile.cost + bigShot.cost);
    Shop.show(tank);

    expect(Shop.purchaseWeapon('missile')).toBe(true);
    expect(Shop.purchaseWeapon('big-shot')).toBe(true);

    expect(Money.getMoney()).toBe(0);
    expect(tank.inventory).toMatchObject({
      missile: missile.ammo,
      'big-shot': bigShot.ammo
    });

    Shop.onDone(() => {
      Game.setState(GAME_STATES.PLAYING);
    });
    expect(Shop.handleClick(600, 760)).toBe(true);
    expect(Shop.isShowing()).toBe(false);
    expect(Game.getState()).toBe(GAME_STATES.PLAYING);
    expect(tank.getAmmo('missile')).toBe(missile.ammo);
    expect(tank.getAmmo('big-shot')).toBe(bigShot.ammo);
  });
});
