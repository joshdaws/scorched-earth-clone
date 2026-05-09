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
    expect(result.player.health).toBe(125);
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
