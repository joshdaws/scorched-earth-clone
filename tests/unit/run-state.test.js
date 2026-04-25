import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function freshRunState() {
  vi.resetModules();
  return import('../../js/runState.js');
}

describe('runState', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts a fresh run with round one and zeroed statistics', async () => {
    const RunState = await freshRunState();
    RunState.startNewRun();

    expect(RunState.isRunActive()).toBe(true);
    expect(RunState.getRoundNumber()).toBe(1);
    expect(RunState.getRunStats()).toMatchObject({
      roundsSurvived: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      enemiesDestroyed: 0,
      shotsFired: 0,
      shotsHit: 0,
      hitRate: 0,
      moneyEarned: 0,
      moneySpent: 0,
      biggestHit: 0,
      weaponsUsed: [],
      uniqueWeaponsCount: 0,
      nukesLaunched: 0
    });
  });

  it('tracks combat, economy, weapon, and nuke statistics', async () => {
    const RunState = await freshRunState();
    RunState.startNewRun();

    RunState.recordStat('damageDealt', 120);
    RunState.recordStat('damageDealt', 45);
    RunState.recordStat('damageTaken', 35);
    RunState.recordStat('enemyDestroyed');
    RunState.recordStat('shotFired');
    RunState.recordStat('shotFired');
    RunState.recordStat('shotFired');
    RunState.recordStat('shotHit');
    RunState.recordStat('moneyEarned', 750);
    RunState.recordStat('moneySpent', 200);
    RunState.recordStat('weaponUsed', 'basic-shot');
    RunState.recordStat('weaponUsed', 'missile');
    RunState.recordStat('weaponUsed', 'missile');
    RunState.recordStat('nukeLaunched');

    expect(RunState.getRunStats()).toMatchObject({
      totalDamageDealt: 165,
      totalDamageTaken: 35,
      enemiesDestroyed: 1,
      shotsFired: 3,
      shotsHit: 1,
      hitRate: 33,
      moneyEarned: 750,
      moneySpent: 200,
      biggestHit: 120,
      weaponsUsed: ['basic-shot', 'missile'],
      uniqueWeaponsCount: 2,
      nukesLaunched: 1
    });
  });

  it('calculates hit rates for no shots, misses, partial hits, and all hits', async () => {
    let RunState = await freshRunState();
    RunState.startNewRun();
    expect(RunState.getRunStats().hitRate).toBe(0);

    RunState.recordStat('shotFired');
    RunState.recordStat('shotFired');
    expect(RunState.getRunStats().hitRate).toBe(0);

    RunState = await freshRunState();
    RunState.startNewRun();
    for (let i = 0; i < 10; i++) RunState.recordStat('shotFired');
    for (let i = 0; i < 5; i++) RunState.recordStat('shotHit');
    expect(RunState.getRunStats().hitRate).toBe(50);

    RunState = await freshRunState();
    RunState.startNewRun();
    for (let i = 0; i < 4; i++) {
      RunState.recordStat('shotFired');
      RunState.recordStat('shotHit');
    }
    expect(RunState.getRunStats().hitRate).toBe(100);
  });

  it('advances rounds and finalizes run state on end', async () => {
    const RunState = await freshRunState();
    RunState.startNewRun();

    expect(RunState.advanceRound()).toBe(2);
    expect(RunState.advanceRound()).toBe(3);
    RunState.endRun(false);

    expect(RunState.isRunActive()).toBe(false);
    expect(RunState.getRunStats().roundsSurvived).toBe(3);
    expect(RunState.getState()).toMatchObject({
      isActive: false,
      roundNumber: 3,
      stats: { roundsSurvived: 3 }
    });
    expect(RunState.getRunDuration()).toBeGreaterThanOrEqual(0);
  });

  it('scales enemy health by round bands and ignores invalid direct round sets', async () => {
    const RunState = await freshRunState();
    RunState.startNewRun();

    RunState.setRoundNumber(0);
    expect(RunState.getRoundNumber()).toBe(1);
    RunState.setRoundNumber(8);
    expect(RunState.getRoundNumber()).toBe(8);

    expect(RunState.getEnemyHealthForRound(1)).toBe(100);
    expect(RunState.getEnemyHealthForRound(4)).toBe(120);
    expect(RunState.getEnemyHealthForRound(7)).toBe(140);
    expect(RunState.getEnemyHealthForRound(10)).toBe(160);
    expect(RunState.getEnemyHealthForRound(13)).toBe(180);
  });
});
