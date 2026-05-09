import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  AI_DIFFICULTY,
  calculateAim,
  cancelTurn,
  getAIDifficulty,
  getAIWeaponPoolForRound,
  getAllDifficulties,
  getAnimatedAim,
  getCurrentWeaponPool,
  getDifficulty,
  getDifficultyConfig,
  getDifficultyName,
  getThinkingDelay,
  isDebugMode,
  isTurnActive,
  purchaseWeaponsForAI,
  selectWeapon,
  setDebugMode,
  setDifficulty,
  setDifficultyForRound,
  setupAIForRound,
  setWeaponPoolForRound,
  startTurn,
  updateTurn
} from '../../js/ai.js';

function createAITank(overrides = {}) {
  const inventory = { ...(overrides.inventory || {}) };

  return {
    x: 900,
    y: 520,
    angle: 45,
    power: 50,
    getAmmo: vi.fn(weaponId => inventory[weaponId] ?? 0),
    addAmmo: vi.fn((weaponId, amount) => {
      inventory[weaponId] = (inventory[weaponId] || 0) + amount;
    }),
    getFirePosition: vi.fn(() => ({
      x: overrides.fireX ?? overrides.x ?? 900,
      y: overrides.fireY ?? overrides.y ?? 520
    })),
    getInventory: () => ({ ...inventory }),
    ...overrides
  };
}

function createPlayerTank(overrides = {}) {
  return {
    x: 300,
    y: 520,
    ...overrides
  };
}

function mockRandomSequence(values) {
  let index = 0;
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  });
}

describe('AI difficulty configuration', () => {
  beforeEach(() => {
    cancelTurn();
    setDebugMode(false);
    setDifficulty(AI_DIFFICULTY.EASY);
    setWeaponPoolForRound(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cancelTurn();
    setDebugMode(false);
  });

  it('exposes current difficulty and rejects invalid values without changing state', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    setDifficulty(AI_DIFFICULTY.MEDIUM);
    setDifficulty('impossible');

    expect(getDifficulty()).toBe(AI_DIFFICULTY.MEDIUM);
    expect(error).toHaveBeenCalledWith('[AI] Invalid difficulty: impossible');
  });

  it('matches the current aiming error and wind compensation table', () => {
    const cases = [
      [AI_DIFFICULTY.EASY, -15, 15, -20, 20, false, undefined],
      [AI_DIFFICULTY.MEDIUM, -8, 8, -10, 10, true, 0.5],
      [AI_DIFFICULTY.HARD, -3, 3, -5, 5, true, 0.85],
      [AI_DIFFICULTY.HARD_PLUS, -2, 2, -3, 3, true, 0.95]
    ];

    for (const [difficulty, minAngle, maxAngle, minPower, maxPower, compensatesWind, windAccuracy] of cases) {
      setDifficulty(difficulty);
      expect(getDifficultyConfig()).toMatchObject({
        angleErrorMin: minAngle,
        angleErrorMax: maxAngle,
        powerErrorMin: minPower,
        powerErrorMax: maxPower,
        compensatesWind
      });
      if (windAccuracy !== undefined) {
        expect(getDifficultyConfig().windCompensationAccuracy).toBe(windAccuracy);
      }
    }
  });

  it('maps rounds to progressive difficulty and names', () => {
    expect(getAIDifficulty(1)).toBe(AI_DIFFICULTY.EASY);
    expect(getAIDifficulty(3)).toBe(AI_DIFFICULTY.MEDIUM);
    expect(getAIDifficulty(6)).toBe(AI_DIFFICULTY.HARD);
    expect(getAIDifficulty(10)).toBe(AI_DIFFICULTY.HARD_PLUS);

    expect(setDifficultyForRound(10)).toBe(AI_DIFFICULTY.HARD_PLUS);
    expect(getDifficulty()).toBe(AI_DIFFICULTY.HARD_PLUS);
    expect(getDifficultyName(AI_DIFFICULTY.HARD_PLUS)).toBe('Hard+');
    expect(getDifficultyName('missing')).toBe('Unknown');
    expect(getAllDifficulties().map(difficulty => difficulty.name)).toEqual([
      'Easy',
      'Medium',
      'Hard',
      'Hard+'
    ]);
  });
});

describe('AI aiming', () => {
  beforeEach(() => {
    cancelTurn();
    setDebugMode(false);
    setDifficulty(AI_DIFFICULTY.EASY);
    setWeaponPoolForRound(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cancelTurn();
  });

  it('easy AI aims directly toward the player and adds bounded error', () => {
    const aiTank = createAITank({ x: 900, y: 520 });
    const playerTank = createPlayerTank({ x: 300, y: 520 });
    mockRandomSequence([0.5, 0.5]);

    const aim = calculateAim(aiTank, playerTank);

    expect(aim.angle).toBe(180);
    expect(aim.power).toBe(60);
  });

  it('keeps easy, medium, and hard aim results inside configured error limits', () => {
    const aiTank = createAITank({ x: 900, y: 520 });
    const playerTank = createPlayerTank({ x: 300, y: 520 });
    const difficulties = [
      AI_DIFFICULTY.EASY,
      AI_DIFFICULTY.MEDIUM,
      AI_DIFFICULTY.HARD
    ];

    for (const difficulty of difficulties) {
      setDifficulty(difficulty);
      const centerRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const baseline = calculateAim(aiTank, playerTank, 0, null);
      centerRandom.mockRestore();

      const config = getDifficultyConfig();
      for (let i = 0; i < 100; i += 1) {
        const result = calculateAim(aiTank, playerTank, 0, null);
        expect(result.angle).toBeGreaterThanOrEqual(Math.max(0, baseline.angle + config.angleErrorMin));
        expect(result.angle).toBeLessThanOrEqual(Math.min(180, baseline.angle + config.angleErrorMax));
        expect(result.power).toBeGreaterThanOrEqual(Math.max(0, baseline.power + config.powerErrorMin));
        expect(result.power).toBeLessThanOrEqual(Math.min(100, baseline.power + config.powerErrorMax));
      }
    }
  });

  it('applies medium wind compensation into the wind', () => {
    const aiTank = createAITank({ x: 900, y: 520 });
    const playerTank = createPlayerTank({ x: 300, y: 520 });
    setDifficulty(AI_DIFFICULTY.MEDIUM);

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const noWind = calculateAim(aiTank, playerTank, 0);
    const positiveWind = calculateAim(aiTank, playerTank, 4);
    const negativeWind = calculateAim(aiTank, playerTank, -4);

    expect(noWind.angle).toBeGreaterThan(90);
    expect(positiveWind.angle).toBeCloseTo(noWind.angle - 6, 5);
    expect(negativeWind.angle).toBeCloseTo(noWind.angle + 6, 5);
  });

  it('handles vertical and extreme-wind shots without invalid values', () => {
    const aiTank = createAITank({ x: 500, y: 520 });
    const playerTank = createPlayerTank({ x: 500, y: 420 });
    setDifficulty(AI_DIFFICULTY.MEDIUM);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    for (const wind of [-20, 0, 20]) {
      const aim = calculateAim(aiTank, playerTank, wind);
      expect(Number.isFinite(aim.angle)).toBe(true);
      expect(Number.isFinite(aim.power)).toBe(true);
      expect(aim.angle).toBeGreaterThanOrEqual(0);
      expect(aim.angle).toBeLessThanOrEqual(180);
      expect(aim.power).toBeGreaterThanOrEqual(0);
      expect(aim.power).toBeLessThanOrEqual(100);
    }
  });
});

describe('AI weapon selection and progression', () => {
  beforeEach(() => {
    cancelTurn();
    setDebugMode(false);
    setDifficulty(AI_DIFFICULTY.EASY);
    setWeaponPoolForRound(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('progresses the AI weapon pool by round and returns copies', () => {
    expect(getAIWeaponPoolForRound(1)).toEqual(['basic-shot']);
    expect(getAIWeaponPoolForRound(3)).toEqual(['basic-shot', 'missile']);
    expect(getAIWeaponPoolForRound(5)).toEqual(['basic-shot', 'missile', 'roller', 'big-shot']);
    expect(getAIWeaponPoolForRound(7)).toContain('digger');
    expect(getAIWeaponPoolForRound(9)).toEqual([
      'basic-shot',
      'missile',
      'roller',
      'big-shot',
      'digger',
      'heavy-roller',
      'heavy-digger',
      'mirv',
      'mini-nuke'
    ]);
    expect(getAIWeaponPoolForRound(11)).toContain('nuke');

    const pool = setWeaponPoolForRound(9);
    pool.push('mutated');
    expect(getCurrentWeaponPool()).not.toContain('mutated');
  });

  it('easy AI always uses basic shot', () => {
    const aiTank = createAITank({ inventory: { missile: 10 } });

    setDifficulty(AI_DIFFICULTY.EASY);
    setWeaponPoolForRound(9);

    expect(selectWeapon(aiTank)).toBe('basic-shot');
  });

  it('medium AI chooses preferred weapons only when random chance, ammo, and pool allow it', () => {
    const aiTank = createAITank({ inventory: { missile: 0, roller: 2 } });

    setDifficulty(AI_DIFFICULTY.MEDIUM);
    setWeaponPoolForRound(5);
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(selectWeapon(aiTank)).toBe('roller');

    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(selectWeapon(aiTank)).toBe('basic-shot');
  });

  it('hard AI filters strategic choices through the current pool and inventory', () => {
    const aiTank = createAITank({ inventory: { nuke: 1, 'mini-nuke': 2, missile: 10 } });

    setDifficulty(AI_DIFFICULTY.HARD);
    setWeaponPoolForRound(1);
    mockRandomSequence([0.1, 0.1]);
    expect(selectWeapon(aiTank, createPlayerTank(), null)).toBe('basic-shot');

    vi.restoreAllMocks();
    setDifficulty(AI_DIFFICULTY.HARD);
    setWeaponPoolForRound(11);
    mockRandomSequence([0.1, 0.1]);
    expect(selectWeapon(aiTank, createPlayerTank(), null)).toBe('nuke');
  });

  it('sets up round difficulty, weapon pool, and ammo grants together', () => {
    const aiTank = createAITank();

    const setup = setupAIForRound(aiTank, 9);

    expect(setup).toMatchObject({
      difficulty: AI_DIFFICULTY.HARD,
      difficultyName: 'Hard',
      weaponPool: ['basic-shot', 'missile', 'roller', 'big-shot', 'digger', 'heavy-roller', 'heavy-digger', 'mirv', 'mini-nuke']
    });
    expect(setup.ammoGiven).toEqual([
      { weaponId: 'missile', ammo: 10 },
      { weaponId: 'roller', ammo: 5 },
      { weaponId: 'big-shot', ammo: 3 },
      { weaponId: 'digger', ammo: 5 },
      { weaponId: 'heavy-roller', ammo: 3 },
      { weaponId: 'heavy-digger', ammo: 3 },
      { weaponId: 'mirv', ammo: 3 },
      { weaponId: 'mini-nuke', ammo: 2 }
    ]);
    expect(aiTank.getInventory()).toMatchObject({
      missile: 10,
      roller: 5,
      'big-shot': 3,
      digger: 5,
      'heavy-roller': 3,
      'heavy-digger': 3,
      mirv: 3,
      'mini-nuke': 2
    });
  });
});

describe('AI economy and turn timing', () => {
  beforeEach(() => {
    cancelTurn();
    setDebugMode(false);
    setDifficulty(AI_DIFFICULTY.EASY);
    setWeaponPoolForRound(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    cancelTurn();
  });

  it('purchases no weapons for easy AI and prioritized weapons for harder AI budgets', () => {
    const easyTank = createAITank();
    expect(purchaseWeaponsForAI(easyTank, AI_DIFFICULTY.EASY)).toEqual({
      purchased: [],
      totalSpent: 0
    });

    const mediumTank = createAITank();
    setWeaponPoolForRound(5);
    expect(purchaseWeaponsForAI(mediumTank, AI_DIFFICULTY.MEDIUM)).toEqual({
      purchased: [
        { weaponId: 'missile', cost: 500, ammo: 5 },
        { weaponId: 'roller', cost: 1500, ammo: 3 }
      ],
      totalSpent: 2000
    });
    expect(mediumTank.getInventory()).toMatchObject({ missile: 5, roller: 3 });

    const hardTank = createAITank();
    setWeaponPoolForRound(7);
    expect(purchaseWeaponsForAI(hardTank, AI_DIFFICULTY.HARD)).toEqual({
      purchased: [
        { weaponId: 'heavy-roller', cost: 2500, ammo: 2 },
        { weaponId: 'big-shot', cost: 1000, ammo: 3 },
        { weaponId: 'missile', cost: 500, ammo: 5 }
      ],
      totalSpent: 4000
    });
    expect(hardTank.getInventory()).toMatchObject({
      'heavy-roller': 2,
      'big-shot': 3,
      missile: 5
    });
  });

  it('returns difficulty-specific thinking delay inside configured bounds', () => {
    setDifficulty(AI_DIFFICULTY.HARD_PLUS);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(getThinkingDelay()).toBe(450);
  });

  it('runs the AI turn lifecycle and exposes animated aim while thinking', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
    mockRandomSequence([0.5, 0.5, 0.5]);

    const aiTank = createAITank({ angle: 40, power: 30 });
    const playerTank = createPlayerTank({ x: 300, y: 520 });
    setDifficulty(AI_DIFFICULTY.EASY);

    startTurn(aiTank, playerTank);
    expect(isTurnActive()).toBe(true);
    expect(updateTurn()).toBeNull();

    vi.setSystemTime(500);
    const animated = getAnimatedAim();
    expect(animated).not.toBeNull();
    expect(animated.progress).toBeGreaterThan(0);
    expect(animated.angle).toBeGreaterThan(40);

    vi.setSystemTime(1500);
    expect(updateTurn()).toEqual({
      ready: true,
      angle: 180,
      power: 60,
      weapon: 'basic-shot'
    });
    expect(isTurnActive()).toBe(false);
    expect(getAnimatedAim()).toBeNull();
  });

  it('toggles debug mode state', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    setDebugMode(true);
    expect(isDebugMode()).toBe(true);
    expect(log).toHaveBeenCalledWith('[AI] Debug mode enabled');

    setDebugMode(false);
    expect(isDebugMode()).toBe(false);
  });
});
