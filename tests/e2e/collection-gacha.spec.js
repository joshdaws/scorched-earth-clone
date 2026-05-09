import { expect, test } from 'playwright/test';
import { bootGame, bootScene, clearQaStorage, expectCanvasReady, trackConsoleFailures } from './helpers.js';

async function clickDesignPoint(page, x, y) {
  await page.evaluate(async ({ x, y }) => {
    const { getDisplayOffset, getGameScale } = await import('/js/screenSize.js');
    const canvas = document.getElementById('game');
    const rect = canvas.getBoundingClientRect();
    const scale = getGameScale();
    const offset = getDisplayOffset();
    const clientX = rect.left + offset.x + x * scale;
    const clientY = rect.top + offset.y + y * scale;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: 0,
      buttons: 1
    };
    canvas.dispatchEvent(new MouseEvent('mousemove', eventInit));
    canvas.dispatchEvent(new MouseEvent('mousedown', eventInit));
    canvas.dispatchEvent(new MouseEvent('mouseup', { ...eventInit, buttons: 0 }));
  }, { x, y });
}

function centerOf(rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

test.describe('collection and supply drop journey', () => {
  test.beforeEach(async ({ page }) => {
    await clearQaStorage(page);
  });

  test('collection screen exposes owned starter tank and locked collection progress', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const state = await page.evaluate(() => {
      window.Game.setState('collection');
      return window.TestAPI.getCollectionQaState();
    });

    expect(state.gameState).toBe('collection');
    expect(state.collection.owned).toContain('standard');
    expect(state.collection.equippedTankId).toBe('standard');
    expect(state.collection.progress.owned).toBe(1);
    expect(state.collection.progress.total).toBeGreaterThan(1);
    failures.expectNoFailures();
  });

  test('garage and armory expose secondary progression without adding home choices', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    await page.evaluate(() => window.Game.setState('collection'));
    await page.waitForTimeout(100);
    const garageNav = await page.evaluate(() => window.TestAPI.getSecondaryProgressionNavigationQaState().collection);

    expect(garageNav.gameState).toBe('collection');
    expect(Object.keys(garageNav.actions)).toEqual(['achievements', 'supplyDrop', 'scrapShop']);

    const achievementsButton = centerOf(garageNav.actions.achievements);
    await clickDesignPoint(page, achievementsButton.x, achievementsButton.y);
    await expect.poll(() => page.evaluate(() => window.Game.getState())).toBe('achievements');
    const medalNav = await page.evaluate(() => window.TestAPI.getSecondaryProgressionNavigationQaState().achievements);
    expect(medalNav.returnToState).toBe('collection');
    const medalBackButton = centerOf(medalNav.backButton);
    await clickDesignPoint(page, medalBackButton.x, medalBackButton.y);
    await expect.poll(() => page.evaluate(() => window.Game.getState())).toBe('collection');
    await page.waitForTimeout(100);

    const garageDropNav = await page.evaluate(() => window.TestAPI.getSecondaryProgressionNavigationQaState().collection);
    const garageDropButton = centerOf(garageDropNav.actions.supplyDrop);
    await clickDesignPoint(page, garageDropButton.x, garageDropButton.y);
    await expect.poll(() => page.evaluate(() => window.Game.getState())).toBe('supply_drop');
    await clickDesignPoint(page, 90, 50);
    await expect.poll(() => page.evaluate(() => window.Game.getState())).toBe('collection');
    await page.waitForTimeout(100);

    await bootScene(page, '/?scene=physics-sandbox&seed=24680&wind=0');
    await page.evaluate(() => {
      window.Game.setState('menu');
      window.Game.setState('shop');
    });
    const armoryNav = await page.evaluate(() => window.TestAPI.getSecondaryProgressionNavigationQaState().shop);
    expect(armoryNav.gameState).toBe('shop');
    expect(armoryNav.visible).toBe(true);

    const armoryDropButton = centerOf(armoryNav.actions.supplyDrop);
    await clickDesignPoint(page, armoryDropButton.x, armoryDropButton.y);
    await expect.poll(() => page.evaluate(() => window.Game.getState())).toBe('supply_drop');
    await clickDesignPoint(page, 90, 50);
    await expect.poll(() => page.evaluate(() => window.Game.getState())).toBe('shop');

    failures.expectNoFailures();
  });

  test('supply drop spends tokens, plays reveal animation, and adds the skin to collection', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(() => {
      const before = window.TestAPI.grantTokensForQa(60);
      const drop = window.TestAPI.openSupplyDropForQa({
        dropType: 'standard',
        playAnimation: true,
        spendTokens: 50
      });
      return { before, drop, after: window.TestAPI.getCollectionQaState() };
    });

    expect(result.before.tokens.balance).toBe(60);
    expect(result.drop.success).toBe(true);
    expect(result.drop.spent).toBe(true);
    expect(result.drop.animation.isAnimating).toBe(true);
    expect(result.after.tokens.balance).toBe(10);
    expect(result.after.collection.owned).toContain(result.drop.drop.tank.id);
    failures.expectNoFailures();
  });

  test('owned drop skin can be equipped and remains selected for gameplay startup', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootScene(page, '/?scene=physics-sandbox&seed=24023&wind=0');
    await expectCanvasReady(page);

    const equipped = await page.evaluate(() => {
      const drop = window.TestAPI.openSupplyDropForQa({ dropType: 'guaranteed', playAnimation: false });
      const equip = window.TestAPI.equipTankForQa(drop.drop.tank.id);
      return {
        drop,
        equip,
        gameplay: window.TestAPI.getControlState(),
        collection: window.TestAPI.getCollectionQaState()
      };
    });

    expect(equipped.drop.success).toBe(true);
    expect(equipped.equip.success).toBe(true);
    expect(equipped.collection.collection.equippedTankId).toBe(equipped.drop.drop.tank.id);
    expect(equipped.gameplay.gameState).toBe('playing');
    failures.expectNoFailures();
  });

  test('pity and duplicate handling update rarity guarantees and scrap compensation', async ({ page }) => {
    const failures = trackConsoleFailures(page);
    await bootGame(page, '/');

    const result = await page.evaluate(() => {
      const duplicate = window.TankCollection.addTank('standard');
      const pityBuilt = window.TestAPI.buildPityForQa({ rarity: 'common', count: 20 });
      const pityDrop = window.TestAPI.openSupplyDropForQa({ dropType: 'standard', playAnimation: false });
      return {
        duplicate,
        pityBuilt,
        pityDrop,
        after: window.TestAPI.getCollectionQaState()
      };
    });

    expect(result.duplicate.isDuplicate).toBe(true);
    expect(result.duplicate.scrapAwarded).toBeGreaterThan(0);
    expect(result.pityBuilt.pity.bonus.guaranteedRare).toBe(true);
    expect(['rare', 'epic', 'legendary']).toContain(result.pityDrop.drop.rarity);
    expect(result.after.pity.state.dropsWithoutRare).toBe(0);
    expect(result.after.collection.scrap).toBeGreaterThanOrEqual(result.duplicate.scrapAwarded);
    failures.expectNoFailures();
  });
});
