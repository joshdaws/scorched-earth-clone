import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function freshImport(path) {
  vi.resetModules();
  return import(path);
}

describe('local persistence integration', () => {
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

  it('persists audio, controls, CRT, and render quality settings across reloads', async () => {
    let Sound = await freshImport('../../js/sound.js');
    Sound.setMasterVolume(0.42);
    Sound.setMusicVolume(0.25);
    Sound.setSfxVolume(0.75);
    Sound.setMuted(true);

    Sound = await freshImport('../../js/sound.js');
    expect(Sound.getMasterVolume()).toBe(0.42);
    expect(Sound.getMusicVolume()).toBe(0.25);
    expect(Sound.getSfxVolume()).toBe(0.75);
    expect(Sound.getMuted()).toBe(true);

    let ControlSettings = await freshImport('../../js/controls/controlSettings.js');
    ControlSettings.setControlMode(ControlSettings.CONTROL_MODES.HYBRID);
    ControlSettings.setTrajectoryMode(ControlSettings.TRAJECTORY_MODES.NONE);

    ControlSettings = await freshImport('../../js/controls/controlSettings.js');
    expect(ControlSettings.getControlMode()).toBe(ControlSettings.CONTROL_MODES.HYBRID);
    expect(ControlSettings.getTrajectoryMode()).toBe(ControlSettings.TRAJECTORY_MODES.NONE);
    expect(ControlSettings.hasDifficultyOverride()).toBe(true);

    let Effects = await freshImport('../../js/effects.js');
    Effects.setCrtEnabled(false);
    Effects = await freshImport('../../js/effects.js');
    expect(Effects.isCrtEnabled()).toBe(false);
    Effects.toggleCrt();
    Effects = await freshImport('../../js/effects.js');
    expect(Effects.isCrtEnabled()).toBe(true);

    let RenderQuality = await freshImport('../../js/renderQuality.js');
    RenderQuality.setRenderQuality('low');
    RenderQuality = await freshImport('../../js/renderQuality.js');
    expect(RenderQuality.getRenderQualityId()).toBe('low');
  });

  it('persists level stars, world unlocks, achievements, and high scores across reloads', async () => {
    let Stars = await freshImport('../../js/stars.js');
    for (let level = 1; level <= 5; level++) {
      Stars.setForLevel(`world1-level${level}`, 3);
    }

    Stars = await freshImport('../../js/stars.js');
    expect(Stars.getTotalStars()).toBe(15);
    expect(Stars.isWorldUnlocked(2)).toBe(true);
    expect(Stars.getWorldStars(1).earned).toBe(15);

    let Achievements = await freshImport('../../js/achievements.js');
    expect(Achievements.unlockAchievement('first_blood')).toMatchObject({
      unlocked: true,
      reward: 1
    });

    Achievements = await freshImport('../../js/achievements.js');
    expect(Achievements.isAchievementUnlocked('first_blood')).toBe(true);
    expect(Achievements.getUnlockedAchievementIds()).toEqual(['first_blood']);

    let HighScores = await freshImport('../../js/highScores.js');
    expect(HighScores.saveHighScore({
      roundsSurvived: 7,
      totalDamageDealt: 420,
      enemiesDestroyed: 6,
      shotsFired: 10,
      shotsHit: 6,
      moneyEarned: 2500,
      biggestHit: 90
    })).toMatchObject({ saved: true, rank: 1, isNewBest: true });

    HighScores = await freshImport('../../js/highScores.js');
    expect(HighScores.getHighScores()[0]).toMatchObject({
      roundsSurvived: 7,
      totalDamage: 420,
      enemiesDestroyed: 6,
      hitRate: 60
    });
  });

  it('persists collection ownership, equipped tank, tokens, and pity counters', async () => {
    let TankCollection = await freshImport('../../js/tank-collection.js');
    TankCollection.init();
    const unlock = TankCollection.addTank('ghost-protocol');
    expect(unlock.isNew).toBe(true);
    expect(TankCollection.setEquippedTank('ghost-protocol')).toBe(true);
    TankCollection.addScrap(125);

    TankCollection = await freshImport('../../js/tank-collection.js');
    TankCollection.init();
    expect(TankCollection.ownsTank('ghost-protocol')).toBe(true);
    expect(TankCollection.getEquippedTankId()).toBe('ghost-protocol');
    expect(TankCollection.getScrap()).toBe(125);

    let Tokens = await freshImport('../../js/tokens.js');
    Tokens.init();
    Tokens.addTokens(59, 'test grant');
    expect(Tokens.spendTokens(14)).toBe(true);
    Tokens.cleanup();

    Tokens = await freshImport('../../js/tokens.js');
    Tokens.init();
    expect(Tokens.getTokenBalance()).toBe(45);
    expect(Tokens.getLifetimeStats()).toMatchObject({
      earned: 59,
      spent: 14,
      balance: 45
    });
    Tokens.cleanup();

    let Pity = await freshImport('../../js/pity-system.js');
    Pity.init();
    for (let i = 0; i < 12; i++) {
      Pity.onDropResult('common');
    }
    Pity.cleanup();

    Pity = await freshImport('../../js/pity-system.js');
    Pity.init();
    expect(Pity.getPityState()).toEqual({
      dropsWithoutRare: 12,
      dropsWithoutEpic: 12
    });
    expect(Pity.getPityBonus()).toMatchObject({
      rarePlus: 15,
      epicPlus: 0,
      guaranteedRare: false,
      guaranteedEpic: false
    });
    Pity.cleanup();
  });

  it('does not persist active run money or run stats across module reload/new game', async () => {
    let Money = await freshImport('../../js/money.js');
    Money.init();
    Money.addMoney(900, 'test run gain');
    expect(Money.getMoney()).toBe(2400);

    Money = await freshImport('../../js/money.js');
    Money.init();
    expect(Money.getMoney()).toBe(1500);

    let RunState = await freshImport('../../js/runState.js');
    RunState.startNewRun();
    for (let i = 0; i < 5; i++) {
      RunState.recordStat('shotFired');
    }
    RunState.recordStat('damageDealt', 120);
    expect(RunState.getRunStats()).toMatchObject({
      shotsFired: 5,
      totalDamageDealt: 120
    });

    RunState = await freshImport('../../js/runState.js');
    expect(RunState.isRunActive()).toBe(false);
    expect(RunState.getRunStats()).toMatchObject({
      shotsFired: 0,
      totalDamageDealt: 0,
      moneyEarned: 0
    });

    RunState.startNewRun();
    expect(RunState.getRoundNumber()).toBe(1);
    expect(RunState.getRunStats().shotsFired).toBe(0);
  });

  it('falls back gracefully for corrupt or malformed storage values', async () => {
    window.localStorage.setItem('scorched_earth_stars', '{bad json');
    let Stars = await freshImport('../../js/stars.js');
    expect(Stars.getTotalStars()).toBe(0);
    expect(Stars.getProgress().completedLevels).toBe(0);

    window.localStorage.setItem('scorched_earth_achievements', JSON.stringify({
      unlocked: 'wrong',
      viewed: null,
      progress: 'wrong',
      unlockDates: []
    }));
    let Achievements = await freshImport('../../js/achievements.js');
    expect(Achievements.getUnlockedAchievementIds()).toEqual([]);
    expect(Achievements.getAchievementState()).toMatchObject({
      unlocked: [],
      viewed: [],
      progress: {}
    });

    window.localStorage.setItem('scorched_earth_high_scores', JSON.stringify([
      null,
      { roundsSurvived: 'seven' },
      { roundsSurvived: 4, totalDamage: 80 }
    ]));
    const HighScores = await freshImport('../../js/highScores.js');
    expect(HighScores.getHighScores()).toEqual([
      expect.objectContaining({ roundsSurvived: 4, totalDamage: 80 })
    ]);

    window.localStorage.setItem('scorched_control_mode', 'bad-mode');
    const ControlSettings = await freshImport('../../js/controls/controlSettings.js');
    expect(Object.values(ControlSettings.CONTROL_MODES)).toContain(ControlSettings.getControlMode());
  });

  it('handles storage quota failures without crashing save paths', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const Stars = await freshImport('../../js/stars.js');
    expect(() => Stars.setForLevel('world1-level1', 3)).not.toThrow();
    expect(Stars.getForLevel('world1-level1')).toBe(3);

    const HighScores = await freshImport('../../js/highScores.js');
    expect(() => {
      const result = HighScores.saveHighScore({
        roundsSurvived: 99,
        totalDamageDealt: 1000,
        enemiesDestroyed: 20,
        shotsFired: 40,
        shotsHit: 30,
        moneyEarned: 5000,
        biggestHit: 120
      });
      expect(result).toMatchObject({ saved: expect.any(Boolean) });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });
});
