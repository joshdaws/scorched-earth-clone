import { expect, test } from 'playwright/test';

async function waitForGameReady(page) {
  await page.goto('/?scene=physics-sandbox&wind=0');
  await page.waitForFunction(
    () => window.TestAPI?.isInitialized?.() === true,
    null,
    { timeout: 15000 }
  );
}

test('game boots, renders, and exposes deterministic test controls', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await waitForGameReady(page);

  const state = await page.evaluate(() => {
    window.TestAPI.setRenderQuality('low');
    window.TestAPI.aim({ angle: 42, power: 68 });
    return window.TestAPI.getControlState();
  });

  expect(state.gameState).toBe('playing');
  expect(state.aim.angle).toBe(42);
  expect(state.aim.power).toBe(68);

  const canvasBox = await page.locator('#game').boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(300);
  expect(canvasBox?.height).toBeGreaterThan(300);
  expect(consoleErrors).toEqual([]);
});

