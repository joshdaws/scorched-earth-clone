import { expect } from 'playwright/test';

export function trackConsoleFailures(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  return {
    consoleErrors,
    pageErrors,
    expectNoFailures() {
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    }
  };
}

export async function clearQaStorage(page) {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem('__scorched_qa_storage_cleared')) {
      window.localStorage.clear();
      window.sessionStorage.setItem('__scorched_qa_storage_cleared', 'true');
    }
  });
}

export async function bootGame(page, path = '/') {
  await page.goto(path);
  await page.waitForFunction(
    () => window.Game && window.TestAPI,
    null,
    { timeout: 15000 }
  );
  await page.evaluate(() => window.TestAPI.setRenderQuality('low'));
}

export async function bootScene(page, scenePath) {
  await bootGame(page, scenePath);
  await page.waitForFunction(
    () => window.TestAPI?.isInitialized?.() === true,
    null,
    { timeout: 15000 }
  );
}

export async function expectCanvasReady(page) {
  const canvas = page.locator('#game');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(300);
  expect(box?.height).toBeGreaterThan(300);
  return box;
}
