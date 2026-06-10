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
      await new Promise(resolve => setTimeout(resolve, 200));
      for (let i = 0; i < 80 && window.Game.getState() !== 'playing'; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

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
      await new Promise(resolve => setTimeout(resolve, 200));
      for (let i = 0; i < 80 && window.Game.getState() !== 'playing'; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

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
      await new Promise(resolve => setTimeout(resolve, 200));
      for (let i = 0; i < 80 && window.Game.getState() !== 'playing'; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

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
      await new Promise(resolve => setTimeout(resolve, 200));
      for (let i = 0; i < 80 && window.Game.getState() !== 'playing'; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return JSON.parse(window.render_game_to_text());
    });

    expect(result.mode).toBe('playing');
    expect(result.puzzleObjects.map(object => object.type)).toEqual(['teleport', 'teleport', 'ricochet']);
    expect(result.puzzleObjects[0]).toMatchObject({ id: 'w4l1-entry-gate', strength: null });
    failures.expectNoFailures();
  });

  test('late campaign levels combine gates, shields, banks, and bunkers', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(async () => {
      const { LevelRegistry } = await import('/js/levels.js');
      const level = LevelRegistry.getLevel('world6-level10');
      window.dispatchEvent(new CustomEvent('levelSelected', {
        detail: { levelId: level.id, level, worldNum: 6, levelNum: 10 }
      }));
      await new Promise(resolve => setTimeout(resolve, 200));
      for (let i = 0; i < 80 && window.Game.getState() !== 'playing'; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return JSON.parse(window.render_game_to_text());
    });

    expect(result.mode).toBe('playing');
    expect(result.puzzleObjects.map(object => object.type)).toEqual([
      'teleport',
      'teleport',
      'ricochet',
      'shield',
      'bunker'
    ]);
    expect(result.puzzleObjects.map(object => object.id)).toContain('w6l10-final-shield');
    failures.expectNoFailures();
  });

  test('campaign puzzle mechanics have at least one playable route', async ({ page }) => {
    test.setTimeout(120_000);
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const cases = [
      {
        mechanic: 'ricochet',
        levelId: 'world1-level7',
        worldNum: 1,
        levelNum: 7,
        expectedObjects: ['ricochet'],
        requiredInteraction: 'ricochet',
        weaponIds: ['bouncer', 'missile', 'basic-shot']
      },
      {
        mechanic: 'shield',
        levelId: 'world5-level3',
        worldNum: 5,
        levelNum: 3,
        expectedObjects: ['shield', 'bunker'],
        requiredInteraction: 'shield-busted',
        weaponIds: ['shield-buster', 'armor-piercer', 'basic-shot']
      },
      {
        mechanic: 'teleport',
        levelId: 'world4-level1',
        worldNum: 4,
        levelNum: 1,
        expectedObjects: ['teleport', 'teleport', 'ricochet'],
        requiredInteraction: 'teleport',
        weaponIds: ['bouncer', 'napalm', 'missile', 'basic-shot']
      },
      {
        mechanic: 'bunker',
        levelId: 'world5-level1',
        worldNum: 5,
        levelNum: 1,
        expectedObjects: ['bunker'],
        requiredInteraction: 'bunker-hit',
        weaponIds: ['armor-piercer', 'tracer', 'basic-shot'],
        acceptsBlockedInteraction: true
      },
      {
        mechanic: 'fuel-cell hazard',
        levelId: 'world5-level2',
        worldNum: 5,
        levelNum: 2,
        expectedObjects: ['fuel-cell', 'fuel-cell'],
        requiredInteraction: 'fuel-cell-detonate',
        weaponIds: ['basic-shot', 'missile'],
        acceptsBlockedInteraction: true
      },
      {
        mechanic: 'collapse-node hazard',
        levelId: 'world5-level4',
        worldNum: 5,
        levelNum: 4,
        expectedObjects: ['collapse-node', 'fuel-cell'],
        requiredInteraction: 'collapse-node-detonate',
        weaponIds: ['basic-shot', 'missile'],
        acceptsBlockedInteraction: true
      }
    ];

    const results = await page.evaluate(async testCases => {
      const { LevelRegistry } = await import('/js/levels.js');
      const output = [];

      for (const testCase of testCases) {
        const level = LevelRegistry.getLevel(testCase.levelId);
        window.Game.setState('menu');
        await new Promise(resolve => setTimeout(resolve, 50));
        window.dispatchEvent(new CustomEvent('levelSelected', {
          detail: {
            levelId: level.id,
            level,
            worldNum: testCase.worldNum,
            levelNum: testCase.levelNum
          }
        }));
        await new Promise(resolve => setTimeout(resolve, 200));
        for (let i = 0; i < 80 && window.Game.getState() !== 'playing'; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const snapshot = JSON.parse(window.render_game_to_text());
        const route = window.TestAPI.findPlayableShotForQa({
          weaponIds: testCase.weaponIds,
          requiredInteraction: testCase.requiredInteraction,
          minDamage: testCase.acceptsBlockedInteraction ? 0 : 1
        });
        const damageRoute = window.TestAPI.findPlayableShotForQa({
          weaponIds: testCase.weaponIds,
          minDamage: 1
        });

        output.push({
          mechanic: testCase.mechanic,
          levelId: testCase.levelId,
          objects: snapshot.puzzleObjects.map(object => object.type),
          route,
          damageRoute
        });
      }

      return output;
    }, cases);

    for (const [index, result] of results.entries()) {
      const testCase = cases[index];
      expect(result.objects).toEqual(testCase.expectedObjects);
      expect(result.route.success, `${result.mechanic} route`).toBe(true);
      expect(result.route.interactionTypes).toContain(testCase.requiredInteraction);
      expect(result.damageRoute.success, `${result.mechanic} damage route`).toBe(true);
      expect(result.damageRoute.enemyDamage).toBeGreaterThan(0);
    }

    failures.expectNoFailures();
  });

  test('fuel cell hazards detonate and chain in live gameplay', async ({ page }) => {
    test.setTimeout(120_000);
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      const snapshot = () => JSON.parse(window.render_game_to_text());
      const countCells = snap => snap.puzzleObjects.filter(object => object.type === 'fuel-cell').length;

      const { LevelRegistry } = await import('/js/levels.js');
      const level = LevelRegistry.getLevel('world5-level2');
      window.dispatchEvent(new CustomEvent('levelSelected', {
        detail: { levelId: level.id, level, worldNum: 5, levelNum: 2 }
      }));
      await sleep(200);
      for (let i = 0; i < 80 && window.Game.getState() !== 'playing'; i++) {
        await sleep(100);
      }
      await sleep(300);

      const before = snapshot();
      const cells = before.puzzleObjects.filter(object => object.type === 'fuel-cell');
      if (cells.length === 0) {
        return { candidates: 0, cellsBefore: 0 };
      }
      const target = cells.reduce((a, b) => (a.x > b.x ? a : b), cells[0]);

      // Rank shots by direct probe detonation first, then landing proximity,
      // because weapon blasts also cook hazards within their radius.
      const candidates = [];
      for (let angle = 5; angle <= 85; angle += 2) {
        for (let power = 35; power <= 100; power += 5) {
          const sim = window.TestAPI.simulateProjectile({ angle, power });
          const direct = (sim.puzzleInteractions || []).some(i => i.type === 'fuel-cell-detonate');
          if (sim.landingX == null && !direct) continue;
          const d = direct
            ? -1
            : Math.hypot(sim.landingX - target.x, (sim.landingY ?? target.y) - target.y);
          candidates.push({ angle, power, d });
        }
      }
      candidates.sort((a, b) => a.d - b.d);

      let after = before;
      let detonated = false;
      for (const candidate of candidates.slice(0, 2)) {
        // Wait until the player can fire (AI counterfire may be resolving).
        for (let i = 0; i < 150; i++) {
          if (window.TestAPI.getState().canFire) break;
          await sleep(100);
        }

        window.TestAPI.aim({ angle: candidate.angle, power: candidate.power });
        window.TestAPI.fire();

        // Poll for the staggered hazard chain to resolve.
        for (let i = 0; i < 90; i++) {
          await sleep(100);
          after = snapshot();
          if (countCells(after) < cells.length) {
            detonated = true;
            break;
          }
        }
        if (detonated) break;
      }

      return {
        candidates: candidates.length,
        cellsBefore: cells.length,
        cellsAfter: countCells(after),
        enemyHealthBefore: before.enemy?.health,
        enemyHealthAfter: after.enemy?.health
      };
    });

    expect(result.candidates).toBeGreaterThan(0);
    expect(result.cellsBefore).toBe(2);
    expect(result.cellsAfter).toBeLessThan(result.cellsBefore);
    expect(result.enemyHealthAfter).toBeLessThan(result.enemyHealthBefore);
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
