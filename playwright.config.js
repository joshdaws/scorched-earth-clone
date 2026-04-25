import { defineConfig, devices } from 'playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 4178);
const host = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const baseURL = `http://${host}:${port}`;
const includeWebKit = process.env.CI || process.env.PLAYWRIGHT_INCLUDE_WEBKIT === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 768 }
      }
    }
  ].concat(includeWebKit ? [{
    name: 'webkit-ios',
    use: {
      ...devices['iPhone 14']
    }
  }] : [])
});
