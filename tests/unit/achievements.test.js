import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function freshAchievements() {
  vi.resetModules();
  window.localStorage.clear();
  return import('../../js/achievements.js');
}

async function freshAchievementModules(...paths) {
  vi.resetModules();
  window.localStorage.clear();
  const achievements = await import('../../js/achievements.js');
  achievements.resetAchievementState();
  const modules = [];
  for (const path of paths) {
    modules.push(await import(path));
  }
  return { achievements, modules };
}

describe('achievement registry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('registers 40+ unique frozen achievements with current schema fields', async () => {
    const {
      ACHIEVEMENT_CATEGORIES,
      ACHIEVEMENT_DIFFICULTY,
      ACHIEVEMENT_TRACKING_TYPES,
      getAllAchievements
    } = await freshAchievements();

    const achievements = getAllAchievements();
    const ids = new Set();
    const validCategories = new Set(Object.values(ACHIEVEMENT_CATEGORIES));
    const validDifficulties = new Set(Object.values(ACHIEVEMENT_DIFFICULTY));
    const validTrackingTypes = new Set(Object.values(ACHIEVEMENT_TRACKING_TYPES));

    expect(achievements.length).toBeGreaterThanOrEqual(40);

    for (const achievement of achievements) {
      expect(typeof achievement.id).toBe('string');
      expect(achievement.id.length).toBeGreaterThan(0);
      expect(ids.has(achievement.id)).toBe(false);
      ids.add(achievement.id);

      expect(typeof achievement.name).toBe('string');
      expect(achievement.name.length).toBeGreaterThan(0);
      expect(typeof achievement.description).toBe('string');
      expect(achievement.description.length).toBeGreaterThan(0);
      expect(validCategories.has(achievement.category)).toBe(true);
      expect(validDifficulties.has(achievement.difficulty)).toBe(true);
      expect(validTrackingTypes.has(achievement.trackingType)).toBe(true);
      expect(typeof achievement.target).toBe('number');
      expect(achievement.target).toBeGreaterThan(0);
      expect(Object.isFrozen(achievement)).toBe(true);

      if (achievement.specialReward) {
        expect(achievement.tokenReward).toBe(0);
      } else {
        expect(achievement.tokenReward).toBeGreaterThan(0);
      }
    }
  });

  it('returns expected category counts, hidden visibility, and difficulty rewards', async () => {
    const {
      ACHIEVEMENT_CATEGORIES,
      ACHIEVEMENT_DIFFICULTY,
      getAchievement,
      getAchievementCount,
      getAchievementsByCategory,
      getAchievementsByDifficulty,
      getHiddenAchievements,
      getTokenRewardForDifficulty,
      getVisibleAchievements,
      hasAchievement
    } = await freshAchievements();

    expect(getAchievementCount()).toBe(41);
    expect(getAchievement('first_blood')).toMatchObject({
      name: 'First Blood',
      category: ACHIEVEMENT_CATEGORIES.COMBAT,
      tokenReward: 1
    });
    expect(getAchievement('missing')).toBeNull();
    expect(hasAchievement('nuclear_winter')).toBe(true);
    expect(hasAchievement('nuclear_option')).toBe(false);

    expect(getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.COMBAT)).toHaveLength(7);
    expect(getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.PRECISION)).toHaveLength(7);
    expect(getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY)).toHaveLength(12);
    expect(getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.PROGRESSION)).toHaveLength(5);
    expect(getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.ECONOMY)).toHaveLength(5);
    expect(getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.HIDDEN)).toHaveLength(5);

    expect(getVisibleAchievements()).toHaveLength(36);
    expect(getHiddenAchievements()).toHaveLength(5);
    expect(getAchievementsByDifficulty(ACHIEVEMENT_DIFFICULTY.EXTREME).map(a => a.id)).toEqual([
      'immortal'
    ]);
    expect(getTokenRewardForDifficulty(ACHIEVEMENT_DIFFICULTY.HARD)).toBe(10);
    expect(getTokenRewardForDifficulty('unknown')).toBe(0);
  });

  it('returns copies for category arrays and nested progress state', async () => {
    const {
      ACHIEVEMENT_CATEGORIES,
      getAchievementProgress,
      getAchievementState,
      getAchievementsByCategory,
      updateAchievementProgress
    } = await freshAchievements();

    const combat = getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.COMBAT);
    combat.pop();
    expect(getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.COMBAT)).toHaveLength(7);

    updateAchievementProgress('sharpshooter', 2);
    const state = getAchievementState();
    state.progress.sharpshooter.current = 99;

    expect(getAchievementProgress('sharpshooter')).toEqual({ current: 2, required: 3 });
  });
});

describe('achievement state and rewards', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('unlocks achievements once, grants tokens once, and tracks round/unviewed state', async () => {
    const {
      clearRoundAchievements,
      getRoundAchievements,
      getTotalTokensEarned,
      getUnlockedAchievementIds,
      getUnlockedCount,
      getUnlockDate,
      getUnviewedCount,
      hasUnviewedAchievements,
      isAchievementUnlocked,
      markAllAchievementsViewed,
      onAchievementUnlock,
      resetAchievementState,
      unlockAchievement
    } = await freshAchievements();

    resetAchievementState();
    const callback = vi.fn();
    const unsubscribe = onAchievementUnlock(callback);

    const first = unlockAchievement('first_blood');
    const duplicate = unlockAchievement('first_blood');

    expect(first).toEqual({ unlocked: true, reward: 1, specialReward: null });
    expect(duplicate).toEqual({ unlocked: false, reward: 0, specialReward: null });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toMatchObject({
      achievement: expect.objectContaining({ id: 'first_blood' }),
      reward: 1,
      specialReward: null
    });
    expect(isAchievementUnlocked('first_blood')).toBe(true);
    expect(getUnlockedAchievementIds()).toEqual(['first_blood']);
    expect(getUnlockedCount()).toBe(1);
    expect(getTotalTokensEarned()).toBe(1);
    expect(getUnlockDate('first_blood')).toBeInstanceOf(Date);
    expect(getUnviewedCount()).toBe(1);
    expect(hasUnviewedAchievements()).toBe(true);
    expect(getRoundAchievements()).toHaveLength(1);

    markAllAchievementsViewed();
    expect(getUnviewedCount()).toBe(0);
    clearRoundAchievements();
    expect(getRoundAchievements()).toEqual([]);

    unsubscribe();
    unlockAchievement('direct_hit');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('updates counter progress incrementally, persists it, and unlocks at target', async () => {
    const {
      getAchievementProgress,
      getAchievementStats,
      getTotalTokensEarned,
      loadAchievementState,
      updateAchievementProgress
    } = await freshAchievements();

    expect(getAchievementProgress('sharpshooter')).toEqual({ current: 0, required: 3 });

    expect(updateAchievementProgress('sharpshooter', 1, true)).toMatchObject({
      updated: true,
      progress: { current: 1, required: 3 },
      unlocked: false,
      reward: 0
    });
    expect(updateAchievementProgress('sharpshooter', 1, true)).toMatchObject({
      progress: { current: 2, required: 3 },
      unlocked: false
    });

    loadAchievementState();
    expect(getAchievementProgress('sharpshooter')).toEqual({ current: 2, required: 3 });

    expect(updateAchievementProgress('sharpshooter', 1, true)).toMatchObject({
      progress: { current: 3, required: 3 },
      unlocked: true,
      reward: 2
    });
    expect(updateAchievementProgress('sharpshooter', 1, true)).toMatchObject({
      updated: false,
      progress: { current: 3, required: 3 },
      unlocked: true,
      reward: 0
    });
    expect(getTotalTokensEarned()).toBe(2);
    expect(getAchievementStats()).toMatchObject({
      total: 41,
      unlocked: 1,
      remaining: 40,
      percentComplete: 2,
      tokensEarned: 2
    });
  });

  it('returns safe failures for unknown achievement operations', async () => {
    const { unlockAchievement, updateAchievementProgress } = await freshAchievements();

    expect(unlockAchievement('missing')).toEqual({
      unlocked: false,
      reward: 0,
      specialReward: null
    });
    expect(updateAchievementProgress('missing', 1)).toEqual({
      updated: false,
      progress: null,
      unlocked: false,
      reward: 0
    });
  });
});

describe('achievement detection modules', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('combat detection unlocks representative combat achievements', async () => {
    const { achievements, modules } = await freshAchievementModules('../../js/combat-achievements.js');
    const combat = modules[0];

    combat.init();
    combat.onDamageDealt({ actualDamage: 30, isDirectHit: true }, { team: 'enemy', health: 70 }, 100);
    expect(achievements.isAchievementUnlocked('direct_hit')).toBe(true);

    combat.onDamageDealt({ actualDamage: 90, isDirectHit: false }, { team: 'enemy', health: 0 }, 50);
    expect(achievements.isAchievementUnlocked('overkill')).toBe(true);

    combat.onEnemyDestroyed({ team: 'enemy' });
    expect(achievements.isAchievementUnlocked('first_blood')).toBe(true);

    combat.resetRoundState();
    combat.onPlayerDamageTaken(85, 15);
    combat.onRoundWon(9);
    expect(achievements.isAchievementUnlocked('comeback_king')).toBe(true);
    expect(achievements.isAchievementUnlocked('nail_biter')).toBe(true);
  });

  it('precision detection unlocks sharpshooter after three consecutive hits', async () => {
    const { achievements, modules } = await freshAchievementModules('../../js/precision-achievements.js');
    const precision = modules[0];
    const hitInfo = { isDirectHit: false };

    precision.init();
    precision.onPlayerShotFired();
    precision.onPlayerHitEnemy(hitInfo);
    precision.onPlayerShotFired();
    precision.onPlayerHitEnemy(hitInfo);
    expect(achievements.isAchievementUnlocked('sharpshooter')).toBe(false);

    precision.onPlayerShotFired();
    precision.onPlayerHitEnemy(hitInfo);
    expect(achievements.isAchievementUnlocked('sharpshooter')).toBe(true);

    precision.onPlayerMissed();
    expect(precision.getState().consecutiveHits).toBe(0);
  });

  it('progression detection unlocks round milestones and economy achievements', async () => {
    const { achievements, modules } = await freshAchievementModules('../../js/progression-achievements.js');
    const progression = modules[0];

    progression.init();
    progression.onRoundReached(5);
    expect(achievements.isAchievementUnlocked('survivor')).toBe(true);
    expect(achievements.isAchievementUnlocked('veteran')).toBe(false);

    progression.onRoundReached(10);
    expect(achievements.isAchievementUnlocked('veteran')).toBe(true);
    expect(progression.getState().highestRoundReached).toBe(10);

    progression.onMoneyEarned(5000);
    expect(achievements.isAchievementUnlocked('penny_saved')).toBe(true);
    progression.onMoneyEarned(5000);
    expect(achievements.isAchievementUnlocked('war_chest')).toBe(true);
    expect(progression.getLifetimeMoneyEarned()).toBe(10000);

    progression.onInventoryChanged({
      missile: 1,
      'big-shot': 1,
      mirv: 1,
      'deaths-head': 1,
      roller: 1,
      'heavy-roller': 1,
      digger: 1,
      'heavy-digger': 1,
      'mini-nuke': 1,
      nuke: 1
    });
    expect(achievements.isAchievementUnlocked('fully_loaded')).toBe(true);

    progression.onInventoryChanged({
      'basic-shot': Infinity,
      missile: 50
    });
    expect(achievements.isAchievementUnlocked('stockpile')).toBe(true);
  });

  it('weapon mastery detection unlocks weapon-specific and nuke kill achievements', async () => {
    const { achievements, modules } = await freshAchievementModules('../../js/weapon-achievements.js');
    const weaponAchievements = modules[0];

    weaponAchievements.init();
    weaponAchievements.onWeaponFired('nuke');
    weaponAchievements.onDamageDealtToEnemy('nuke', 100, 0);
    weaponAchievements.onEnemyKilled({ team: 'enemy' });

    expect(achievements.isAchievementUnlocked('nuclear_winter')).toBe(true);
    expect(weaponAchievements.getState().weaponsWithKills).toContain('nuke');

    weaponAchievements.onRunStart();
    weaponAchievements.onWeaponFired('basic-shot');
    weaponAchievements.onRoundWon();
    expect(achievements.isAchievementUnlocked('basic_training')).toBe(true);
  });
});
