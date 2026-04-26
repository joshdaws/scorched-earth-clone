import { expect, test } from 'playwright/test';
import { bootGame, bootScene, clearQaStorage, expectCanvasReady, trackConsoleFailures } from './helpers.js';

test.describe('new player journey', () => {
  test.beforeEach(async ({ page }) => {
    await clearQaStorage(page);
  });

  test('first launch renders the title menu without browser errors', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');
    await expectCanvasReady(page);

    await page.mouse.click(640, 620);

    const state = await page.evaluate(() => ({
      gameState: window.Game.getState(),
      assets: window.TestAPI.getAssetStatus()
    }));

    expect(state.gameState).toBe('menu');
    expect(state.assets.groups.title.loaded).toBe(true);
    expect(state.assets.groups.gameplay.loaded).toBe(false);
    failures.expectNoFailures();
  });

  test('endless-mode startup creates terrain, tanks, HUD controls, and player aim state', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=physics-sandbox&seed=42101&wind=0');
    await expectCanvasReady(page);

    const state = await page.evaluate(() => {
      window.TestAPI.aim({ angle: 41, power: 63 });
      return {
        controls: window.TestAPI.getControlState(),
        tanks: window.TestAPI.getTankPositions(),
        terrain: [
          window.TestAPI.getTerrainAt(160),
          window.TestAPI.getTerrainAt(640),
          window.TestAPI.getTerrainAt(1120)
        ],
        assets: window.TestAPI.getAssetStatus()
      };
    });

    expect(state.controls.gameState).toBe('playing');
    expect(state.controls.state.canFire).toBe(true);
    expect(state.controls.aim).toMatchObject({ angle: 41, power: 63 });
    expect(state.controls.weaponBar.slots.length).toBeGreaterThan(0);
    expect(state.tanks.player).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(state.tanks.enemy).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(state.terrain.every(sample => sample.success && sample.height > 0)).toBe(true);
    expect(state.assets.groups.gameplay.loaded || state.assets.groups.gameplay.loading).toBe(true);
    failures.expectNoFailures();
  });

  test('first shot path has an arc and terrain deformation is observable', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=physics-sandbox&seed=31415&wind=0');

    const result = await page.evaluate(() => {
      window.TestAPI.aim({ angle: 47, power: 58 });
      const trajectory = window.TestAPI.simulateProjectile({ angle: 47, power: 58, wind: 0 });
      window.TestAPI.snapshot('before-impact');
      const impact = window.TestAPI.getTerrainAt(640);
      const destroyed = window.TestAPI.destroyTerrain({ x: 640, y: impact.canvasY, radius: 58 });
      window.TestAPI.snapshot('after-impact');
      const comparison = window.TestAPI.compareSnapshots('before-impact', 'after-impact');
      return { trajectory, destroyed, comparison };
    });

    expect(result.trajectory.success).toBe(true);
    expect(result.trajectory.trajectory.length).toBeGreaterThan(8);
    expect(result.trajectory.maxHeightAboveStart).toBeGreaterThan(0);
    expect(result.trajectory.terrainHit || result.trajectory.tankHit || result.trajectory.outOfBounds).toBe(true);
    expect(result.destroyed).toMatchObject({ success: true, destroyed: true });
    expect(result.comparison.summary.terrainDamagePoints).toBeGreaterThan(0);
    failures.expectNoFailures();
  });

  test('victory, shop purchase, defeat, and return-to-menu states are reachable', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=physics-sandbox&seed=20260425&wind=0');

    const flow = await page.evaluate(() => {
      const player = window.getPlayerTank();
      const enemy = window.getEnemyTank();
      enemy.takeDamage(enemy.health);
      window.Game.setState('victory');
      const victoryState = window.Game.getState();

      window.Game.setState('shop');
      window.Shop.show(player);
      window.Money.addMoney(10000, 'browser qa shop budget');
      for (let level = 1; level <= 4; level++) {
        window.TestAPI.completeLevelForQa({
          levelId: `world1-level${level}`,
          stats: { damageDealt: 500, accuracy: 1, turnsUsed: 1, won: true }
        });
      }
      player.inventory.missile = 0;
      const moneyBefore = window.Money.getMoney();
      const purchased = window.Shop.purchaseWeapon('missile');
      const moneyAfter = window.Money.getMoney();
      const missileAmmo = player.getAmmo('missile');

      window.Game.setState('playing');
      player.takeDamage(player.health);
      window.Game.setState('defeat');
      const defeatState = window.Game.getState();
      window.Game.setState('menu');

      return {
        victoryState,
        purchased,
        moneyBefore,
        moneyAfter,
        missileAmmo,
        defeatState,
        finalState: window.Game.getState()
      };
    });

    expect(flow.victoryState).toBe('victory');
    expect(flow.purchased).toBe(true);
    expect(flow.moneyAfter).toBeLessThan(flow.moneyBefore);
    expect(flow.missileAmmo).toBeGreaterThanOrEqual(5);
    expect(flow.defeatState).toBe('defeat');
    expect(flow.finalState).toBe('menu');
    failures.expectNoFailures();
  });
});
