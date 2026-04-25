import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ALL_LEVELS,
  LEVEL_CONSTANTS,
  LevelRegistry,
  WORLD_THEMES
} from '../../js/levels.js';
import {
  STORAGE_KEY,
  Stars,
  calculate,
  getNextLockedWorld,
  getProgress,
  getTotalStars,
  getWorldStars,
  isWorldUnlocked,
  recordCompletion,
  resetAll,
  setForLevel
} from '../../js/stars.js';

describe('level registry', () => {
  it('registers the expected world and level totals', () => {
    expect(LEVEL_CONSTANTS).toMatchObject({
      WORLDS: 6,
      LEVELS_PER_WORLD: 10,
      TOTAL_LEVELS: 60,
      MAX_STARS_PER_LEVEL: 3,
      MAX_STARS_TOTAL: 180,
      STAR_THRESHOLDS: {
        1: 0,
        2: 15,
        3: 35,
        4: 60,
        5: 90,
        6: 125
      }
    });

    expect(Object.keys(WORLD_THEMES)).toHaveLength(LEVEL_CONSTANTS.WORLDS);
    expect(LevelRegistry.getAllLevels()).toHaveLength(LEVEL_CONSTANTS.TOTAL_LEVELS);
    expect(ALL_LEVELS).toHaveLength(LEVEL_CONSTANTS.TOTAL_LEVELS);
  });

  it('defines every level with stable ids, required fields, star criteria, and rewards', () => {
    const ids = new Set();
    const difficulties = new Set([
      'tutorial',
      'easy',
      'easy-boss',
      'medium',
      'medium-boss',
      'medium-hard',
      'hard',
      'hard-boss',
      'very-hard',
      'expert',
      'expert-boss',
      'legendary-boss'
    ]);
    const aiDifficulties = new Set(['easy', 'medium', 'hard', 'hard_plus']);

    for (const level of LevelRegistry.getAllLevels()) {
      const expectedId = `world${level.world}-level${level.level}`;

      expect(level.id).toBe(expectedId);
      expect(ids.has(level.id)).toBe(false);
      ids.add(level.id);
      expect(LevelRegistry.parseLevelId(level.id)).toEqual({
        worldNum: level.world,
        levelNum: level.level
      });

      expect(level.world).toBeGreaterThanOrEqual(1);
      expect(level.world).toBeLessThanOrEqual(LEVEL_CONSTANTS.WORLDS);
      expect(level.level).toBeGreaterThanOrEqual(1);
      expect(level.level).toBeLessThanOrEqual(LEVEL_CONSTANTS.LEVELS_PER_WORLD);
      expect(typeof level.name).toBe('string');
      expect(level.name.length).toBeGreaterThan(0);
      expect(difficulties.has(level.difficulty)).toBe(true);
      expect(aiDifficulties.has(level.aiDifficulty)).toBe(true);
      expect(typeof level.enemyHealth).toBe('number');
      expect(level.enemyHealth).toBeGreaterThan(0);
      expect(typeof level.playerHealth).toBe('number');
      expect(level.playerHealth).toBeGreaterThan(0);
      expect(typeof level.star2Damage).toBe('number');
      expect(level.star2Damage).toBeGreaterThan(0);
      expect(typeof level.star3Accuracy).toBe('number');
      expect(level.star3Accuracy).toBeGreaterThan(0);
      expect(level.star3Accuracy).toBeLessThanOrEqual(1);
      expect(typeof level.star3MaxTurns).toBe('number');
      expect(level.star3MaxTurns).toBeGreaterThan(0);
      expect(level.rewards).toEqual({
        coins: expect.any(Number),
        firstClear: expect.any(Number)
      });
      expect(level.rewards.coins).toBeGreaterThan(0);
      expect(level.rewards.firstClear).toBeGreaterThan(0);
    }
  });

  it('returns ordered world slices and defensive arrays', () => {
    for (let world = 1; world <= LEVEL_CONSTANTS.WORLDS; world++) {
      const levels = LevelRegistry.getLevelsByWorld(world);

      expect(levels).toHaveLength(LEVEL_CONSTANTS.LEVELS_PER_WORLD);
      expect(levels.map(level => level.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(levels.every(level => level.world === world)).toBe(true);
    }

    const worldOne = LevelRegistry.getLevelsByWorld(1);
    worldOne.pop();
    expect(LevelRegistry.getLevelsByWorld(1)).toHaveLength(LEVEL_CONSTANTS.LEVELS_PER_WORLD);

    const allLevels = LevelRegistry.getAllLevels();
    allLevels.length = 0;
    expect(LevelRegistry.getAllLevels()).toHaveLength(LEVEL_CONSTANTS.TOTAL_LEVELS);
  });

  it('resolves level lookups, sequence navigation, and unlock thresholds', () => {
    expect(LevelRegistry.getLevel('world1-level1')).toMatchObject({
      id: 'world1-level1',
      world: 1,
      level: 1
    });
    expect(LevelRegistry.getLevelByNumber(6, 10)).toMatchObject({
      id: 'world6-level10',
      world: 6,
      level: 10
    });
    expect(LevelRegistry.getLevel('missing')).toBeNull();
    expect(LevelRegistry.hasLevel('world3-level7')).toBe(true);
    expect(LevelRegistry.hasLevel('world7-level1')).toBe(false);

    expect(LevelRegistry.getNextLevel('world1-level9')?.id).toBe('world1-level10');
    expect(LevelRegistry.getNextLevel('world1-level10')?.id).toBe('world2-level1');
    expect(LevelRegistry.getNextLevel('world6-level10')).toBeNull();
    expect(LevelRegistry.getPreviousLevel('world2-level1')?.id).toBe('world1-level10');
    expect(LevelRegistry.getPreviousLevel('world1-level1')).toBeNull();

    for (const [world, threshold] of Object.entries(LEVEL_CONSTANTS.STAR_THRESHOLDS)) {
      const worldNum = Number(world);
      expect(LevelRegistry.isWorldUnlocked(worldNum, threshold)).toBe(true);
      if (threshold > 0) {
        expect(LevelRegistry.isWorldUnlocked(worldNum, threshold - 1)).toBe(false);
      }
    }
    expect(LevelRegistry.isWorldUnlocked(7, 999)).toBe(false);
  });
});

describe('star calculation and persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAll();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetAll();
    window.localStorage.clear();
  });

  it('awards zero stars for losses and one star for wins that miss bonus criteria', () => {
    expect(calculate('world1-level1', { won: false, damageDealt: 999, accuracy: 1, turnsUsed: 1 })).toMatchObject({
      stars: 0,
      breakdown: {
        won: false,
        damageCheck: false,
        accuracyCheck: false,
        turnsCheck: false
      }
    });

    expect(calculate('world1-level1', { won: true, damageDealt: 49, accuracy: 1, turnsUsed: 1 })).toMatchObject({
      stars: 1,
      breakdown: {
        won: true,
        damageCheck: false,
        accuracyCheck: true,
        turnsCheck: true
      }
    });

    expect(calculate('not-a-level', { won: true })).toMatchObject({
      stars: 1,
      breakdown: {
        won: true,
        damageCheck: false,
        accuracyCheck: false,
        turnsCheck: false
      }
    });
  });

  it('awards two stars for damage and three only when every bonus criterion passes', () => {
    const level = LevelRegistry.getLevel('world1-level1');

    expect(calculate(level.id, {
      won: true,
      damageDealt: level.star2Damage,
      accuracy: level.star3Accuracy - 0.01,
      turnsUsed: level.star3MaxTurns
    })).toMatchObject({
      stars: 2,
      breakdown: {
        damageCheck: true,
        accuracyCheck: false,
        turnsCheck: true
      }
    });

    expect(calculate(level.id, {
      won: true,
      damageDealt: level.star2Damage,
      accuracy: level.star3Accuracy,
      turnsUsed: level.star3MaxTurns
    })).toMatchObject({
      stars: 3,
      breakdown: {
        damageCheck: true,
        accuracyCheck: true,
        turnsCheck: true,
        damageThreshold: level.star2Damage,
        accuracyThreshold: Math.round(level.star3Accuracy * 100),
        turnThreshold: level.star3MaxTurns
      }
    });

    expect(calculate(level.id, {
      won: true,
      damageDealt: level.star2Damage,
      accuracy: level.star3Accuracy,
      turnsUsed: level.star3MaxTurns + 1
    }).stars).toBe(2);
  });

  it('persists only higher star results and summarizes progress by world', () => {
    expect(setForLevel('world1-level1', 2)).toBe(true);
    expect(setForLevel('world1-level1', 1)).toBe(false);
    expect(setForLevel('world1-level2', 3)).toBe(true);
    expect(setForLevel('world1-level3', 4)).toBe(false);

    expect(Stars.getForLevel('world1-level1')).toBe(2);
    expect(getTotalStars()).toBe(5);
    expect(getWorldStars(1)).toMatchObject({
      earned: 5,
      possible: 30,
      levels: {
        'world1-level1': 2,
        'world1-level2': 3,
        'world1-level3': 0
      }
    });
    expect(getProgress()).toMatchObject({
      totalEarned: 5,
      totalPossible: LEVEL_CONSTANTS.MAX_STARS_TOTAL,
      completedLevels: 2,
      perfectLevels: 1
    });

    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(persisted.levels).toMatchObject({
      'world1-level1': 2,
      'world1-level2': 3
    });
  });

  it('uses stored star totals for world unlock state', () => {
    for (let level = 1; level <= 10; level++) {
      setForLevel(`world1-level${level}`, 3);
    }
    setForLevel('world2-level1', 3);
    setForLevel('world2-level2', 2);

    expect(getTotalStars()).toBe(35);
    expect(isWorldUnlocked(1)).toBe(true);
    expect(isWorldUnlocked(2)).toBe(true);
    expect(isWorldUnlocked(3)).toBe(true);
    expect(isWorldUnlocked(4)).toBe(false);
    expect(getNextLockedWorld()).toEqual({
      world: 4,
      threshold: 60,
      starsNeeded: 25,
      currentStars: 35
    });
  });

  it('records completions without downgrading previous best scores', () => {
    expect(recordCompletion('world1-level1', {
      won: true,
      damageDealt: 100,
      accuracy: 1,
      turnsUsed: 1
    })).toMatchObject({
      stars: 3,
      isNewRecord: true
    });

    expect(recordCompletion('world1-level1', {
      won: true,
      damageDealt: 0,
      accuracy: 0,
      turnsUsed: 99
    })).toMatchObject({
      stars: 1,
      isNewRecord: false
    });
    expect(Stars.getForLevel('world1-level1')).toBe(3);
  });
});
