import { expect, test } from 'playwright/test';
import { bootScene, clearQaStorage, expectCanvasReady, trackConsoleFailures } from './helpers.js';

test.describe('survival flow', () => {
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
});
