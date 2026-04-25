import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function freshModules() {
  vi.resetModules();
  const [TankCollection, PitySystem, DropRates, Tokens, SupplyDrop] = await Promise.all([
    import('../../js/tank-collection.js'),
    import('../../js/pity-system.js'),
    import('../../js/drop-rates.js'),
    import('../../js/tokens.js'),
    import('../../js/supply-drop.js')
  ]);
  return { TankCollection, PitySystem, DropRates, Tokens, SupplyDrop };
}

describe('supply drop rates and pity system', () => {
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

  it('calculates sane base and premium drop rates', async () => {
    const { DropRates } = await freshModules();
    const base = DropRates.calculateDropRates();
    const premium = DropRates.calculateDropRates({ isPremium: true });

    expect(Object.values(base).reduce((sum, rate) => sum + rate, 0)).toBeCloseTo(100, 5);
    expect(base.common).toBeGreaterThan(base.uncommon);
    expect(base.uncommon).toBeGreaterThan(base.rare);
    expect(base.legendary).toBeLessThan(base.epic);
    expect(premium.rare + premium.epic + premium.legendary)
      .toBeGreaterThan(base.rare + base.epic + base.legendary);
  });

  it('rolls rarities from cumulative probability boundaries', async () => {
    const { DropRates } = await freshModules();
    const rates = { common: 55, uncommon: 28, rare: 12, epic: 4, legendary: 1 };
    const random = vi.spyOn(Math, 'random');

    random.mockReturnValue(0);
    expect(DropRates.rollRarity(rates)).toBe('common');
    random.mockReturnValue(0.56);
    expect(DropRates.rollRarity(rates)).toBe('uncommon');
    random.mockReturnValue(0.84);
    expect(DropRates.rollRarity(rates)).toBe('rare');
    random.mockReturnValue(0.96);
    expect(DropRates.rollRarity(rates)).toBe('epic');
    random.mockReturnValue(0.999);
    expect(DropRates.rollRarity(rates)).toBe('legendary');
  });

  it('selects tanks by rarity and processes a drop into collection ownership', async () => {
    const { TankCollection, PitySystem, DropRates } = await freshModules();
    TankCollection.init();
    PitySystem.init();

    const selected = DropRates.selectTank('rare');
    expect(selected).toEqual(expect.objectContaining({ rarity: 'rare' }));

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const drop = DropRates.processDrop(DropRates.DROP_TYPES.STANDARD);
    expect(drop.tank).toBeTruthy();
    expect(['common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(drop.rarity);
    expect(TankCollection.ownsTank(drop.tank.id)).toBe(true);
  });

  it('increments soft pity, guarantees rare at threshold, and resets on rare drops', async () => {
    const { PitySystem } = await freshModules();
    PitySystem.init();

    expect(PitySystem.getPityState()).toEqual({ dropsWithoutRare: 0, dropsWithoutEpic: 0 });
    for (let i = 0; i < 10; i++) {
      PitySystem.onDropResult('common');
    }

    expect(PitySystem.getPityBonus()).toMatchObject({
      rarePlus: 15,
      guaranteedRare: false
    });

    for (let i = 0; i < 10; i++) {
      PitySystem.onDropResult('uncommon');
    }
    expect(PitySystem.getPityBonus().guaranteedRare).toBe(true);
    expect(PitySystem.getMinimumRarity()).toBe('rare');

    PitySystem.onDropResult('rare');
    expect(PitySystem.getPityState().dropsWithoutRare).toBe(0);
  });

  it('awards higher scrap for higher-rarity duplicates', async () => {
    const { TankCollection } = await freshModules();
    TankCollection.init();

    TankCollection.addTank('standard');
    const commonDuplicate = TankCollection.addTank('standard');
    TankCollection.addTank('ghost-protocol');
    const epicDuplicate = TankCollection.addTank('ghost-protocol');

    expect(commonDuplicate.isDuplicate).toBe(true);
    expect(epicDuplicate.isDuplicate).toBe(true);
    expect(epicDuplicate.scrapAwarded).toBeGreaterThan(commonDuplicate.scrapAwarded);
  });

  it('spends token currency for drop purchases and tracks lifetime balances', async () => {
    const { Tokens } = await freshModules();
    Tokens.init();

    expect(Tokens.getTokenBalance()).toBe(0);
    Tokens.addTokens(75, 'unit test');
    expect(Tokens.spendTokens(50)).toBe(true);
    expect(Tokens.spendTokens(50)).toBe(false);
    expect(Tokens.getLifetimeStats()).toMatchObject({
      earned: 75,
      spent: 50,
      balance: 25
    });
  });

  it('plays and completes supply drop reveal state without requiring canvas rendering', async () => {
    const { SupplyDrop } = await freshModules();
    const tank = { id: 'standard', name: 'Standard Issue', rarity: 'common', description: 'Starter' };
    const completed = [];

    SupplyDrop.play(tank, (revealed) => completed.push(revealed.id));
    expect(SupplyDrop.isAnimating()).toBe(true);
    expect(SupplyDrop.getRevealTank()).toMatchObject({ id: 'standard' });

    SupplyDrop.skip();
    expect(completed).toEqual(['standard']);
    expect(SupplyDrop.isAnimating()).toBe(false);
    expect(SupplyDrop.getRevealTank()).toBe(null);
  });
});
