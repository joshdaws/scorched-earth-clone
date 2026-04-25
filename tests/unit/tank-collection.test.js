import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function freshModule(path) {
  vi.resetModules();
  return import(path);
}

describe('tank skins registry', () => {
  it('registers a complete unique tank registry with rarity metadata', async () => {
    const {
      DROP_RATES,
      RARITY,
      RARITY_ORDER,
      getAllTanks,
      getTankCount,
      getTankCountByRarity,
      getTanksByRarity,
      tankExists
    } = await freshModule('../../js/tank-skins.js');

    expect(getTankCount()).toBeGreaterThanOrEqual(33);
    expect(RARITY_ORDER).toEqual([
      RARITY.COMMON,
      RARITY.UNCOMMON,
      RARITY.RARE,
      RARITY.EPIC,
      RARITY.LEGENDARY
    ]);
    expect(Object.values(DROP_RATES).reduce((sum, rate) => sum + rate, 0)).toBe(100);

    const tanks = getAllTanks();
    const ids = tanks.map((tank) => tank.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const tank of tanks) {
      expect(tank).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        rarity: expect.any(String),
        assetPath: expect.any(String)
      }));
      expect(tankExists(tank.id)).toBe(true);
      expect(RARITY_ORDER).toContain(tank.rarity);
    }

    const byRarity = getTankCountByRarity();
    for (const rarity of RARITY_ORDER) {
      expect(getTanksByRarity(rarity)).toHaveLength(byRarity[rarity]);
      expect(byRarity[rarity]).toBeGreaterThan(0);
    }
  });
});

describe('tank collection state', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('initializes new players with the standard tank equipped', async () => {
    const Collection = await freshModule('../../js/tank-collection.js');
    Collection.init();

    expect(Collection.ownsTank('standard')).toBe(true);
    expect(Collection.getOwnedTanks()).toEqual(['standard']);
    expect(Collection.getEquippedTankId()).toBe('standard');
    expect(Collection.getCollectionProgress().owned).toBe(1);
  });

  it('adds new tanks, marks them new, and persists equipped ownership', async () => {
    let Collection = await freshModule('../../js/tank-collection.js');
    Collection.init();

    const added = Collection.addTank('desert-camo');
    expect(added).toMatchObject({ success: true, isNew: true, isDuplicate: false });
    expect(Collection.ownsTank('desert-camo')).toBe(true);
    expect(Collection.getNewTanks()).toContain('desert-camo');
    expect(Collection.setEquippedTank('desert-camo')).toBe(true);

    Collection = await freshModule('../../js/tank-collection.js');
    Collection.init();
    expect(Collection.ownsTank('desert-camo')).toBe(true);
    expect(Collection.getEquippedTankId()).toBe('desert-camo');
  });

  it('rejects invalid or unowned tank operations', async () => {
    const Collection = await freshModule('../../js/tank-collection.js');
    Collection.init();

    expect(Collection.addTank('missing-tank')).toMatchObject({
      success: false,
      reason: 'invalid_tank'
    });
    expect(Collection.setEquippedTank('desert-camo')).toBe(false);
    expect(Collection.getEquippedTankId()).toBe('standard');
  });

  it('turns duplicate drops into rarity-scaled scrap and duplicate counts', async () => {
    const Collection = await freshModule('../../js/tank-collection.js');
    Collection.init();

    const duplicate = Collection.addTank('standard');
    expect(duplicate).toMatchObject({
      success: true,
      isDuplicate: true,
      isNew: false,
      duplicateCount: 1
    });
    expect(duplicate.scrapAwarded).toBeGreaterThan(0);
    expect(Collection.getDuplicateCount('standard')).toBe(1);
    expect(Collection.getScrap()).toBe(duplicate.scrapAwarded);
    expect(Collection.getConsecutiveDuplicates()).toBe(1);
  });
});
