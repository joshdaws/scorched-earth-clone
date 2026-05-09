import { expect, test } from 'playwright/test';
import { bootGame, bootScene, clearQaStorage, expectCanvasReady, trackConsoleFailures } from './helpers.js';

test.describe('level mode journey', () => {
  test.beforeEach(async ({ page }) => {
    await clearQaStorage(page);
  });

  test('level select starts with world 1 unlocked and later worlds gated by stars', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const state = await page.evaluate(() => {
      window.Game.setState('level_select');
      return window.TestAPI.getProgressionQaState();
    });

    expect(state.gameState).toBe('level_select');
    expect(state.worldUnlocks['1'].unlocked).toBe(true);
    expect(state.worldUnlocks['2'].unlocked).toBe(false);
    expect(state.worldUnlocks['2'].starsNeeded).toBeGreaterThan(0);
    expect(state.totalStars).toBe(0);
    failures.expectNoFailures();
  });

  test('world 1 level 1 can start and complete with stars persisted', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=round-start&seed=51001&wind=0&difficulty=easy');
    await expectCanvasReady(page);

    const result = await page.evaluate(() => {
      const completion = window.TestAPI.completeLevelForQa({
        levelId: 'world1-level1',
        stats: { damageDealt: 260, accuracy: 1, turnsUsed: 1, won: true }
      });
      return {
        gameplay: window.TestAPI.getControlState(),
        completion,
        persisted: JSON.parse(localStorage.getItem('scorched_earth_stars'))
      };
    });

    expect(result.gameplay.gameState).toBe('playing');
    expect(result.gameplay.state.player.health).toBeGreaterThan(0);
    expect(result.completion.result.stars).toBeGreaterThanOrEqual(1);
    expect(result.completion.progression.world1.levels['world1-level1']).toBe(result.completion.result.stars);
    expect(result.persisted.levels['world1-level1']).toBe(result.completion.result.stars);
    failures.expectNoFailures();
  });

  test('level failure earns no stars and does not persist progression', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(() => {
      const completion = window.TestAPI.completeLevelForQa({
        levelId: 'world1-level1',
        stats: { damageDealt: 120, accuracy: 0.5, turnsUsed: 4, won: false }
      });
      return {
        completion,
        persisted: localStorage.getItem('scorched_earth_stars')
      };
    });

    expect(result.completion.previousStars).toBe(0);
    expect(result.completion.result.stars).toBe(0);
    expect(result.completion.result.message).toContain('Defeat');
    expect(result.completion.progression.world1.levels['world1-level1']).toBe(0);
    expect(result.persisted).toBeNull();
    failures.expectNoFailures();
  });

  test('ammo intro levels grant the curated practice loadout', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(async () => {
      window.TestAPI.completeLevelForQa({
        levelId: 'world1-level1',
        stats: { damageDealt: 260, accuracy: 1, turnsUsed: 1, won: true }
      });

      const { LevelRegistry } = await import('/js/levels.js');
      const level = LevelRegistry.getLevel('world1-level2');
      window.dispatchEvent(new CustomEvent('levelSelected', {
        detail: { levelId: level.id, level, worldNum: 1, levelNum: 2 }
      }));
      await new Promise(resolve => setTimeout(resolve, 600));

      const controls = window.TestAPI.getControlState();
      return {
        progression: level.progression,
        weapon: controls.state.player?.weapon,
        inventory: controls.state.player?.inventory
      };
    });

    expect(result.progression).toMatchObject({
      title: 'Tracer Trial',
      introducedWeapon: 'tracer',
      isIntroLevel: true,
      tuning: {
        role: 'intro'
      }
    });
    expect(result.weapon).toBe('tracer');
    expect(result.inventory.tracer).toBe(6);
    failures.expectNoFailures();
  });

  test('late ammo intro levels keep their tuned arsenal and star targets', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(async () => {
      const { LevelRegistry } = await import('/js/levels.js');
      const level = LevelRegistry.getLevel('world6-level7');
      window.dispatchEvent(new CustomEvent('levelSelected', {
        detail: { levelId: level.id, level, worldNum: 6, levelNum: 7 }
      }));
      await new Promise(resolve => setTimeout(resolve, 600));

      const controls = window.TestAPI.getControlState();
      return {
        level: {
          enemyHealth: level.enemyHealth,
          wind: level.wind,
          star3Accuracy: level.star3Accuracy,
          star3MaxTurns: level.star3MaxTurns,
          progression: level.progression
        },
        weapon: controls.state.player?.weapon,
        inventory: controls.state.player?.inventory
      };
    });

    expect(result.level).toMatchObject({
      enemyHealth: 150,
      wind: { min: -8, max: 8 },
      star3Accuracy: 0.66,
      star3MaxTurns: 6,
      progression: {
        title: 'Nuke Trial',
        introducedWeapon: 'nuke',
        tuning: { role: 'intro' }
      }
    });
    expect(result.weapon).toBe('nuke');
    expect(result.inventory.nuke).toBe(1);
    expect(result.inventory['neutron-bomb']).toBe(1);
    failures.expectNoFailures();
  });

  test('follow-up challenge levels select the taught weapon from their loadout', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(async () => {
      const { LevelRegistry } = await import('/js/levels.js');
      const level = LevelRegistry.getLevel('world2-level4');
      window.dispatchEvent(new CustomEvent('levelSelected', {
        detail: { levelId: level.id, level, worldNum: 2, levelNum: 4 }
      }));
      await new Promise(resolve => setTimeout(resolve, 600));

      const controls = window.TestAPI.getControlState();
      return {
        progression: level.progression,
        weapon: controls.state.player?.weapon,
        inventory: controls.state.player?.inventory
      };
    });

    expect(result.progression).toMatchObject({
      title: 'MIRV Trial',
      isIntroLevel: false,
      recommendedWeapon: 'mirv',
      tuning: { role: 'challenge' }
    });
    expect(result.weapon).toBe('mirv');
    expect(result.inventory.mirv).toBe(3);
    failures.expectNoFailures();
  });

  test('authored puzzle-combat levels expose visible puzzle objects', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(async () => {
      const { LevelRegistry } = await import('/js/levels.js');
      const level = LevelRegistry.getLevel('world4-level1');
      window.dispatchEvent(new CustomEvent('levelSelected', {
        detail: { levelId: level.id, level, worldNum: 4, levelNum: 1 }
      }));
      await new Promise(resolve => setTimeout(resolve, 700));

      return JSON.parse(window.render_game_to_text());
    });

    expect(result.mode).toBe('playing');
    expect(result.puzzleObjects.map(object => object.type)).toEqual(['teleport', 'teleport', 'ricochet']);
    expect(result.puzzleObjects[0]).toMatchObject({ id: 'w4l1-entry-gate', strength: null });
    failures.expectNoFailures();
  });

  test('star totals unlock the next world and replay only improves records', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(() => {
      const firstClear = window.TestAPI.completeLevelForQa({
        levelId: 'world1-level1',
        stats: { damageDealt: 10, accuracy: 0.25, turnsUsed: 8, won: true }
      });
      const replayLow = window.TestAPI.completeLevelForQa({
        levelId: 'world1-level1',
        stats: { damageDealt: 10, accuracy: 0.25, turnsUsed: 8, won: true }
      });
      const replayHigh = window.TestAPI.completeLevelForQa({
        levelId: 'world1-level1',
        stats: { damageDealt: 500, accuracy: 1, turnsUsed: 1, won: true }
      });

      for (let level = 2; level <= 5; level++) {
        window.TestAPI.completeLevelForQa({
          levelId: `world1-level${level}`,
          stats: { damageDealt: 500, accuracy: 1, turnsUsed: 1, won: true }
        });
      }

      return {
        firstClear,
        replayLow,
        replayHigh,
        progression: window.TestAPI.getProgressionQaState()
      };
    });

    expect(result.firstClear.result.stars).toBeGreaterThanOrEqual(1);
    expect(result.replayLow.result.isNewRecord).toBe(false);
    expect(result.replayHigh.result.stars).toBeGreaterThan(result.firstClear.result.stars);
    expect(result.progression.world1.levels['world1-level1']).toBe(result.replayHigh.result.stars);
    expect(result.progression.totalStars).toBeGreaterThanOrEqual(15);
    expect(result.progression.worldUnlocks['2'].unlocked).toBe(true);
    failures.expectNoFailures();
  });
});
