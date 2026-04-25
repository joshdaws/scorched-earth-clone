import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function freshHighScores() {
  vi.resetModules();
  return import('../../js/highScores.js');
}

function runStats({
  roundsSurvived,
  totalDamageDealt = roundsSurvived * 100,
  enemiesDestroyed = roundsSurvived - 1,
  shotsFired = 10,
  shotsHit = 5,
  moneyEarned = 1000,
  biggestHit = 80
}) {
  return {
    roundsSurvived,
    totalDamageDealt,
    enemiesDestroyed,
    shotsFired,
    shotsHit,
    moneyEarned,
    biggestHit
  };
}

describe('highScores', () => {
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

  it('saves qualifying runs with score data and timestamps', async () => {
    const HighScores = await freshHighScores();
    const before = Date.now();
    const result = HighScores.saveHighScore(runStats({ roundsSurvived: 7, totalDamageDealt: 425 }));

    expect(result).toEqual({ saved: true, rank: 1, isNewBest: true });
    expect(HighScores.getHighScores()).toHaveLength(1);
    expect(HighScores.getHighScores()[0]).toEqual(expect.objectContaining({
      roundsSurvived: 7,
      totalDamage: 425,
      enemiesDestroyed: 6,
      shotsFired: 10,
      shotsHit: 5,
      hitRate: 50,
      moneyEarned: 1000,
      biggestHit: 80,
      timestamp: expect.any(Number)
    }));
    expect(HighScores.getHighScores()[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it('sorts leaderboard by rounds survived then damage', async () => {
    const HighScores = await freshHighScores();
    HighScores.saveHighScore(runStats({ roundsSurvived: 5, totalDamageDealt: 900 }));
    HighScores.saveHighScore(runStats({ roundsSurvived: 7, totalDamageDealt: 100 }));
    HighScores.saveHighScore(runStats({ roundsSurvived: 5, totalDamageDealt: 1200 }));

    expect(HighScores.getHighScores().map((score) => ({
      rounds: score.roundsSurvived,
      damage: score.totalDamage
    }))).toEqual([
      { rounds: 7, damage: 100 },
      { rounds: 5, damage: 1200 },
      { rounds: 5, damage: 900 }
    ]);
    expect(HighScores.getBestRoundCount()).toBe(7);
    expect(HighScores.getBestRun()).toMatchObject({ roundsSurvived: 7 });
  });

  it('keeps only the top ten scores and drops non-qualifying runs', async () => {
    const HighScores = await freshHighScores();
    for (let round = 1; round <= 12; round++) {
      HighScores.saveHighScore(runStats({ roundsSurvived: round }));
    }

    expect(HighScores.getHighScores()).toHaveLength(10);
    expect(HighScores.getHighScores().map((score) => score.roundsSurvived)).toEqual([
      12, 11, 10, 9, 8, 7, 6, 5, 4, 3
    ]);

    const rejected = HighScores.saveHighScore(runStats({ roundsSurvived: 2, totalDamageDealt: 9999 }));
    expect(rejected).toEqual({ saved: false, rank: null, isNewBest: false });
    expect(HighScores.getHighScores().map((score) => score.roundsSurvived)).toEqual([
      12, 11, 10, 9, 8, 7, 6, 5, 4, 3
    ]);
  });

  it('reports high-score qualification correctly for empty and full leaderboards', async () => {
    const HighScores = await freshHighScores();
    expect(HighScores.isNewHighScore(1)).toBe(true);

    for (let round = 1; round <= 10; round++) {
      HighScores.saveHighScore(runStats({ roundsSurvived: round }));
    }

    expect(HighScores.isNewHighScore(1)).toBe(false);
    expect(HighScores.isNewHighScore(10)).toBe(true);
    expect(HighScores.isNewBestScore(11)).toBe(true);
    expect(HighScores.isNewBestScore(10)).toBe(false);
  });

  it('updates and formats lifetime stats independently of the leaderboard', async () => {
    const HighScores = await freshHighScores();
    expect(HighScores.updateLifetimeStats(runStats({ roundsSurvived: 4, totalDamageDealt: 333 }))).toBe(true);
    expect(HighScores.updateLifetimeStats(runStats({
      roundsSurvived: 6,
      totalDamageDealt: 667,
      shotsFired: 5,
      shotsHit: 4,
      moneyEarned: 500
    }))).toBe(true);

    expect(HighScores.getFormattedLifetimeStats()).toMatchObject({
      totalRuns: 2,
      totalRoundsPlayed: 10,
      lifetimeDamage: 1000,
      bestRound: 6,
      totalShotsFired: 15,
      totalShotsHit: 9,
      lifetimeHitRate: 60,
      averageRoundsPerRun: 5,
      averageDamagePerRun: 500
    });
  });

  it('handles malformed leaderboard storage and clear/import/export paths', async () => {
    window.localStorage.setItem('scorched_earth_high_scores', JSON.stringify([
      null,
      { roundsSurvived: 'bad' },
      { roundsSurvived: 3, totalDamage: 90 }
    ]));

    const HighScores = await freshHighScores();
    expect(HighScores.getHighScores()).toEqual([
      expect.objectContaining({ roundsSurvived: 3, totalDamage: 90 })
    ]);

    const exported = HighScores.exportData();
    HighScores.clearHighScores();
    expect(HighScores.getHighScores()).toEqual([]);
    expect(HighScores.importData(exported)).toBe(true);
    expect(HighScores.getHighScores()[0]).toMatchObject({ roundsSurvived: 3 });

    HighScores.clearAllData();
    expect(HighScores.getHighScores()).toEqual([]);
    expect(HighScores.getLifetimeStats().totalRuns).toBe(0);
  });
});
