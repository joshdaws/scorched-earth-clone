import { expect, test } from 'playwright/test';
import { bootScene, clearQaStorage, expectCanvasReady, trackConsoleFailures } from './helpers.js';

test.describe('survival flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await clearQaStorage(page);
  });

  test('new run from run-over screen immediately starts endless gameplay', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=round-start&seed=72001&wind=0&difficulty=easy');
    await expectCanvasReady(page);

    const result = await page.evaluate(async () => {
      window.GameOver.show({ rounds: 4, draw: false, delay: 0 });
      window.Game.setState('game_over');
      await new Promise(resolve => setTimeout(resolve, 50));
      window.GameOver.handleClick(445, 670);
      await new Promise(resolve => setTimeout(resolve, 600));

      return JSON.parse(window.render_game_to_text());
    });

    expect(result.mode).toBe('playing');
    expect(result.player.health).toBeGreaterThan(0);
    expect(result.player.weapon).toBe('basic-shot');
    expect(Object.keys(result.player.inventory)).toEqual(['basic-shot']);
    failures.expectNoFailures();
  });

  test('run-over screen offers a garage route without returning through the menu', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=round-start&seed=72002&wind=0&difficulty=easy');
    await expectCanvasReady(page);

    const result = await page.evaluate(async () => {
      window.GameOver.show({ rounds: 5, draw: false, delay: 0 });
      window.Game.setState('game_over');
      await new Promise(resolve => setTimeout(resolve, 50));
      window.GameOver.handleClick(600, 670);
      await new Promise(resolve => setTimeout(resolve, 600));

      return {
        gameState: window.Game.getState(),
        collection: window.TestAPI.getCollectionQaState()
      };
    });

    expect(result.gameState).toBe('collection');
    expect(result.collection.collection.owned).toContain('standard');
    failures.expectNoFailures();
  });

  test('between-round survival perk choice applies to the next duel', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=round-start&seed=72004&wind=0&difficulty=easy');
    await expectCanvasReady(page);

    const result = await page.evaluate(async () => {
      window.RoundTransition.show({
        round: 1,
        damage: 140,
        money: 500,
        tokenResult: { total: 8, breakdown: [{ source: 'Round Clear', amount: 8 }] },
        tokenBalance: 18,
        achievements: [],
        delay: 0
      });
      window.Game.setState('round_transition');
      await new Promise(resolve => setTimeout(resolve, 50));

      const rewardStart = window.RoundTransition.getState().rewardAnimation;
      await new Promise(resolve => setTimeout(resolve, 1400));
      const rewardComplete = window.RoundTransition.getState().rewardAnimation;

      window.RoundTransition.handleClick(461, 571);
      const selected = window.RoundTransition.getState().selectedPerkId;

      window.RoundTransition.handleClick(485, 700);
      await new Promise(resolve => setTimeout(resolve, 700));

      const controls = window.TestAPI.getControlState();
      return {
        selected,
        rewardStart,
        rewardComplete,
        gameState: window.Game.getState(),
        player: controls.state.player
      };
    });

    expect(result.rewardStart.isComplete).toBe(false);
    expect(result.rewardStart.damage).toBeLessThan(140);
    expect(result.rewardComplete.isComplete).toBe(true);
    expect(result.rewardComplete.damage).toBe(140);
    expect(result.rewardComplete.money).toBe(500);
    expect(result.rewardComplete.tokenTotal).toBe(8);
    expect(result.rewardComplete.tokenBalance).toBe(18);
    expect(result.selected).toBe('field-repair');
    expect(result.gameState).toBe('playing');
    expect(result.player.health).toBe(120);
    failures.expectNoFailures();
  });

  test('round-start tuning honors fixed wind and unlocks enemy loadouts by survival round', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    const observed = [];

    for (const round of [1, 3, 5, 7, 9, 10, 11]) {
      await bootScene(page, `/?scene=round-start&round=${round}&seed=${72000 + round}&wind=0`);
      await expectCanvasReady(page);

      observed.push(await page.evaluate(() => {
        const controls = window.TestAPI.getControlState();
        return {
          wind: controls.state.wind,
          enemy: controls.state.enemy,
          aiPool: window.AI.getCurrentWeaponPool(),
          money: window.Money.getState()
        };
      }));
    }

    expect(observed[0]).toMatchObject({
      wind: 0,
      aiPool: ['basic-shot'],
      enemy: { health: 100, maxHealth: 100 }
    });
    expect(observed[1]).toMatchObject({
      wind: 0,
      aiPool: ['basic-shot', 'missile'],
      enemy: { inventory: { missile: 5 } }
    });
    expect(observed[2]).toMatchObject({
      wind: 0,
      aiPool: ['basic-shot', 'missile', 'roller', 'big-shot'],
      enemy: { health: 120, maxHealth: 120, inventory: { missile: 5, roller: 3 } }
    });
    expect(observed[3]).toMatchObject({
      wind: 0,
      aiPool: ['basic-shot', 'missile', 'roller', 'big-shot', 'digger', 'heavy-roller'],
      enemy: { health: 140, maxHealth: 140, inventory: { 'heavy-roller': 2, 'big-shot': 3, missile: 5 } }
    });
    expect(observed[4].aiPool).toContain('mini-nuke');
    expect(observed[4].aiPool).not.toContain('nuke');
    expect(observed[5]).toMatchObject({
      wind: 0,
      enemy: { health: 160, maxHealth: 160, inventory: { 'mini-nuke': 2, mirv: 2, 'big-shot': 3 } }
    });
    expect(observed[5].aiPool).not.toContain('nuke');
    expect(observed[6].aiPool).toContain('nuke');
    expect(observed[6].enemy.inventory).toHaveProperty('nuke');

    await bootScene(page, '/?scene=round-start&round=10&seed=73010&wind=0');
    const tunedShot = await page.evaluate(() => {
      for (let angle = 15; angle <= 80; angle += 1) {
        for (let power = 30; power <= 100; power += 1) {
          const shot = window.TestAPI.fireAndCollect({ angle, power, wind: 0, weaponId: 'basic-shot' });
          const damage = shot.damageDealt || shot.splashDamage?.enemy || 0;
          if (damage > 0) {
            return { ...shot, effectiveDamage: damage };
          }
        }
      }
      return null;
    });
    expect(tunedShot).not.toBeNull();
    expect(tunedShot.effectiveDamage).toBeGreaterThan(0);
    failures.expectNoFailures();
  });

  test('forced survival win and run-over paths still use delayed mode-specific result overlays', async ({ page }) => {
    const failures = trackConsoleFailures(page);

    await bootScene(page, '/?scene=round-start&round=10&seed=73110&wind=0&debug=true');
    await expectCanvasReady(page);
    const win = await page.evaluate(async () => {
      window.force_survival_round_result_for_qa('win');
      await window.advanceTime(80);
      const duringDelay = {
        mode: window.Game.getState(),
        transition: window.RoundTransition.getState(),
        battlefield: JSON.parse(window.render_game_to_text())
      };
      await window.advanceTime(1300);
      return {
        duringDelay,
        afterReveal: window.RoundTransition.getState()
      };
    });

    expect(win.duringDelay.mode).toBe('round_transition');
    expect(win.duringDelay.transition.contentVisible).toBe(false);
    expect(win.duringDelay.battlefield.enemy.health).toBeLessThanOrEqual(0);
    expect(win.afterReveal.contentVisible).toBe(true);

    await bootScene(page, '/?scene=round-start&round=10&seed=73111&wind=0&debug=true');
    await expectCanvasReady(page);
    const loss = await page.evaluate(async () => {
      window.force_survival_round_result_for_qa('loss');
      await window.advanceTime(80);
      const duringDelay = {
        mode: window.Game.getState(),
        gameOver: window.GameOver.getState(),
        battlefield: JSON.parse(window.render_game_to_text())
      };
      await window.advanceTime(1300);
      return {
        duringDelay,
        afterReveal: window.GameOver.getState()
      };
    });

    expect(loss.duringDelay.mode).toBe('game_over');
    expect(loss.duringDelay.gameOver.contentVisible).toBe(false);
    expect(loss.duringDelay.battlefield.player.health).toBeLessThanOrEqual(0);
    expect(loss.afterReveal.contentVisible).toBe(true);
    failures.expectNoFailures();
  });

  test('survival round win preserves the battlefield during delayed round transition reveal', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=round-start&seed=72005&wind=0&difficulty=easy');
    await expectCanvasReady(page);

    const result = await page.evaluate(async () => {
      window.RoundTransition.show({
        round: 2,
        damage: 220,
        money: 650,
        tokenResult: { total: 7, breakdown: [{ source: 'Round Clear', amount: 7 }] },
        tokenBalance: 14,
        achievements: [],
        delay: 1200
      });
      window.Game.setState('round_transition');

      const duringDelay = {
        transition: window.RoundTransition.getState(),
        battlefield: JSON.parse(window.render_game_to_text())
      };

      await new Promise(resolve => setTimeout(resolve, 1300));

      return {
        duringDelay,
        afterReveal: window.RoundTransition.getState()
      };
    });

    expect(result.duringDelay.transition.isVisible).toBe(true);
    expect(result.duringDelay.transition.contentVisible).toBe(false);
    expect(result.duringDelay.battlefield.mode).toBe('round_transition');
    expect(result.duringDelay.battlefield.player.health).toBeGreaterThan(0);
    expect(result.duringDelay.battlefield.enemy).not.toBeNull();
    expect(result.afterReveal.contentVisible).toBe(true);
    failures.expectNoFailures();
  });

  test('survival run over preserves the battlefield during delayed terminal reveal', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=round-start&seed=72006&wind=0&difficulty=easy');
    await expectCanvasReady(page);

    const result = await page.evaluate(async () => {
      window.GameOver.show({ rounds: 3, draw: true, delay: 1200 });
      window.Game.setState('game_over');

      const duringDelay = {
        gameOver: window.GameOver.getState(),
        battlefield: JSON.parse(window.render_game_to_text())
      };

      await new Promise(resolve => setTimeout(resolve, 1300));

      return {
        duringDelay,
        afterReveal: window.GameOver.getState()
      };
    });

    expect(result.duringDelay.gameOver.isVisible).toBe(true);
    expect(result.duringDelay.gameOver.contentVisible).toBe(false);
    expect(result.duringDelay.gameOver.wasDraw).toBe(true);
    expect(result.duringDelay.battlefield.mode).toBe('game_over');
    expect(result.duringDelay.battlefield.player).not.toBeNull();
    expect(result.duringDelay.battlefield.enemy).not.toBeNull();
    expect(result.afterReveal.contentVisible).toBe(true);
    failures.expectNoFailures();
  });
});
