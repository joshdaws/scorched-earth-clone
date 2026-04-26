import { expect, test } from 'playwright/test';
import { bootGame, clearQaStorage, trackConsoleFailures } from './helpers.js';

test.describe('achievements journey', () => {
  test.beforeEach(async ({ page }) => {
    await clearQaStorage(page);
  });

  test('achievement unlock shows a named popup, grants tokens, and dismisses', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const unlocked = await page.evaluate(() => window.TestAPI.unlockAchievementForQa('first_blood'));
    expect(unlocked.success).toBe(true);
    expect(unlocked.result).toMatchObject({ unlocked: true, reward: 1 });
    expect(unlocked.after.tokens.balance).toBe(unlocked.before.tokens.balance + 1);
    expect(unlocked.after.popup.hasActivePopups).toBe(true);
    expect(unlocked.after.popup.active[0]).toMatchObject({
      id: 'first_blood',
      name: 'First Blood',
      reward: 1
    });

    const dismissed = await page.evaluate(() => window.TestAPI.dismissAchievementPopupsForQa());
    expect(dismissed.popup.hasActivePopups).toBe(false);

    failures.expectNoFailures();
  });

  test('achievement screen exposes locked, unlocked, and incremental progress state', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const state = await page.evaluate(() => {
      window.Game.setState('achievements');
      const progress = window.TestAPI.progressAchievementForQa({
        achievementId: 'sharpshooter',
        value: 2,
        increment: false
      });
      const unlock = window.TestAPI.unlockAchievementForQa('first_blood');
      return {
        progress,
        unlock,
        achievements: window.TestAPI.getAchievementQaState()
      };
    });

    expect(state.achievements.gameState).toBe('achievements');
    expect(state.achievements.totalAchievements).toBeGreaterThan(20);
    expect(state.achievements.visibleAchievements.length).toBeGreaterThan(20);
    expect(state.achievements.visibleAchievements.find(achievement => achievement.id === 'first_blood')).toMatchObject({
      name: 'First Blood',
      unlocked: true
    });
    expect(state.achievements.visibleAchievements.find(achievement => achievement.id === 'sharpshooter')).toMatchObject({
      name: 'Sharpshooter',
      unlocked: false,
      progress: { current: 2, required: 3 }
    });
    expect(state.achievements.visibleAchievements.some(achievement => achievement.unlocked === false)).toBe(true);
    failures.expectNoFailures();
  });

  test('multiple achievement unlocks queue notifications and grant combined rewards', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(() => window.TestAPI.unlockAchievementsForQa([
      'first_blood',
      'direct_hit'
    ]));

    expect(result.success).toBe(true);
    expect(result.after.unlockedIds).toEqual(expect.arrayContaining(['first_blood', 'direct_hit']));
    expect(result.after.tokens.balance).toBe(3);
    expect(result.after.popup.activeCount + result.after.popup.pendingCount).toBe(2);
    expect([
      ...result.after.popup.active.map(popup => popup.name),
      ...result.after.popup.pending.map(popup => popup.name)
    ]).toEqual(expect.arrayContaining(['First Blood', 'Direct Hit']));
    failures.expectNoFailures();
  });

  test('unlocked achievements and token rewards persist across reload', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const beforeReload = await page.evaluate(() => window.TestAPI.unlockAchievementForQa('direct_hit'));
    expect(beforeReload.success).toBe(true);
    expect(beforeReload.after.tokens.balance).toBe(2);

    await bootGame(page, '/');
    const reloaded = await page.evaluate(() => window.TestAPI.getAchievementQaState());

    expect(reloaded.unlockedIds).toContain('direct_hit');
    expect(reloaded.visibleAchievements.find(achievement => achievement.id === 'direct_hit')).toMatchObject({
      name: 'Direct Hit',
      unlocked: true
    });
    expect(reloaded.tokens.balance).toBe(2);
    expect(reloaded.stored.achievements.unlocked).toContain('direct_hit');
    failures.expectNoFailures();
  });
});
