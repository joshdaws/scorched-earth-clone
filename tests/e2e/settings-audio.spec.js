import { expect, test } from 'playwright/test';
import { bootGame, bootScene, clearQaStorage, trackConsoleFailures } from './helpers.js';

test.describe('settings and audio journey', () => {
  test.beforeEach(async ({ page }) => {
    await clearQaStorage(page);
  });

  test('settings state can be changed from menu and persists across reload', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const changed = await page.evaluate(() => window.TestAPI.setSettingsAudioForQa({
      masterVolume: 0.31,
      musicVolume: 0.22,
      sfxVolume: 0.73,
      muted: true,
      crtEnabled: false,
      controlMode: 'hybrid',
      trajectoryMode: 'none',
      renderQuality: 'low'
    }));

    expect(changed.audio).toMatchObject({
      masterVolume: 0.31,
      musicVolume: 0.22,
      sfxVolume: 0.73,
      muted: true
    });
    expect(changed.visual.crtEnabled).toBe(false);
    expect(changed.controls).toMatchObject({ controlMode: 'hybrid', trajectoryMode: 'none' });

    await page.reload();
    await page.waitForFunction(() => window.TestAPI && window.Game, null, { timeout: 15000 });
    const reloaded = await page.evaluate(() => window.TestAPI.getSettingsAudioQaState());

    expect(reloaded.audio).toMatchObject(changed.audio);
    expect(reloaded.visual.crtEnabled).toBe(false);
    expect(reloaded.visual.renderQuality.id).toBe('low');
    expect(reloaded.controls).toMatchObject(changed.controls);
    failures.expectNoFailures();
  });

  test('volume zero, unmute, and gameplay fire path do not produce audio/runtime errors', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=physics-sandbox&seed=24024&wind=0');

    const state = await page.evaluate(() => {
      const settings = window.TestAPI.setSettingsAudioForQa({
        masterVolume: 0,
        musicVolume: 0,
        sfxVolume: 0,
        muted: false,
        controlMode: 'hybrid',
        trajectoryMode: 'full'
      });
      window.TestAPI.aim({ angle: 45, power: 50 });
      const shot = window.TestAPI.fire();
      return {
        settings,
        shot,
        controls: window.TestAPI.getControlState()
      };
    });

    expect(state.settings.audio).toMatchObject({
      masterVolume: 0,
      musicVolume: 0,
      sfxVolume: 0,
      muted: false
    });
    expect(state.shot.success).toBe(true);
    expect(state.controls.controlMode).toBe('hybrid');
    failures.expectNoFailures();
  });

  test('pause/settings-style changes apply during gameplay and survive resume', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=physics-sandbox&seed=24025&wind=0');

    const result = await page.evaluate(() => {
      const before = window.Game.getState();
      window.Game.setState('paused');
      const paused = window.Game.getState();
      const changed = window.TestAPI.setSettingsAudioForQa({
        masterVolume: 0.65,
        musicVolume: 0.44,
        sfxVolume: 0.55,
        muted: false,
        crtEnabled: true,
        renderQuality: 'balanced'
      });
      window.Game.setState('playing');
      return {
        before,
        paused,
        resumed: window.Game.getState(),
        changed,
        after: window.TestAPI.getSettingsAudioQaState()
      };
    });

    expect(result.before).toBe('playing');
    expect(result.paused).toBe('paused');
    expect(result.resumed).toBe('playing');
    expect(result.after.audio).toMatchObject(result.changed.audio);
    expect(result.after.visual.crtEnabled).toBe(true);
    expect(result.after.visual.renderQuality.id).toBe('balanced');
    failures.expectNoFailures();
  });
});
