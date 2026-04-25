#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4178;
const DEFAULT_OUT_DIR = 'artifacts/visual-audit';

const VIEWPORTS = [
  { id: 'iphone-se', width: 375, height: 667, hasTouch: true },
  { id: 'iphone-14', width: 390, height: 844, hasTouch: true },
  { id: 'iphone-plus', width: 414, height: 896, hasTouch: true },
  { id: 'ipad', width: 768, height: 1024, hasTouch: true },
  { id: 'desktop', width: 1280, height: 768, hasTouch: false }
];

const TARGETS = [
  { id: 'title-menu', params: '', ready: 'menu', action: 'idle' },
  { id: 'menu-options', params: '', ready: 'menu', action: 'openOptions' },
  { id: 'level-select', params: '', ready: 'menu', action: 'state:level_select' },
  { id: 'high-scores', params: '', ready: 'menu', action: 'openHighScores' },
  { id: 'achievements', params: '', ready: 'menu', action: 'state:achievements' },
  { id: 'collection', params: '', ready: 'menu', action: 'state:collection' },
  { id: 'supply-drop', params: '', ready: 'menu', action: 'state:supply_drop' },
  { id: 'gameplay-hud', params: 'scene=visual-hud', ready: 'visual', action: 'idle' },
  { id: 'aiming-controls', params: 'scene=slingshot-test&wind=0', ready: 'testapi', action: 'idle' },
  { id: 'pause-menu', params: 'scene=physics-sandbox&wind=0', ready: 'testapi', action: 'state:paused' },
  { id: 'shop', params: 'scene=physics-sandbox&wind=0', ready: 'testapi', action: 'shop' },
  { id: 'victory', params: 'scene=physics-sandbox&wind=0', ready: 'testapi', action: 'victory' },
  { id: 'defeat', params: 'scene=physics-sandbox&wind=0', ready: 'testapi', action: 'defeat' },
  { id: 'round-transition', params: 'scene=physics-sandbox&wind=0', ready: 'testapi', action: 'roundTransition' },
  { id: 'level-complete', params: 'scene=physics-sandbox&wind=0', ready: 'testapi', action: 'levelComplete' },
  { id: 'impact-effects', params: 'scene=visual-impact', ready: 'visual', action: 'triggerVisual' },
  { id: 'tank-pivots', params: 'scene=visual-tank-pivots', ready: 'visual', action: 'idle' },
  { id: 'terrain-collapse', params: 'scene=visual-terrain-collapse', ready: 'visual', action: 'triggerVisual' }
];

function parseArgs(argv) {
  const args = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    outDir: DEFAULT_OUT_DIR,
    timeoutMs: 20000,
    headed: false,
    targets: null,
    viewports: null
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--host' && argv[index + 1]) args.host = argv[++index];
    else if (arg === '--port' && argv[index + 1]) args.port = Number(argv[++index]);
    else if (arg === '--out-dir' && argv[index + 1]) args.outDir = argv[++index];
    else if (arg === '--timeout-ms' && argv[index + 1]) args.timeoutMs = Number(argv[++index]);
    else if (arg === '--targets' && argv[index + 1]) args.targets = argv[++index].split(',').map(value => value.trim()).filter(Boolean);
    else if (arg === '--viewports' && argv[index + 1]) args.viewports = argv[++index].split(',').map(value => value.trim()).filter(Boolean);
    else if (arg === '--headed') args.headed = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function usage() {
  console.log(`Usage:
  npm run audit:visual -- [--targets title-menu,gameplay-hud] [--viewports iphone-14,desktop] [--headed]

Targets:
  ${TARGETS.map(target => target.id).join(', ')}

Viewports:
  ${VIEWPORTS.map(viewport => viewport.id).join(', ')}
`);
}

function startServer({ host, port }) {
  const child = spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', chunk => {
    output += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    output += chunk.toString();
  });

  return { child, getOutput: () => output };
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (_error) {
      // Server still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function buildUrl(args, target) {
  const params = target.params ? `?${target.params}` : '';
  return `http://${args.host}:${args.port}/${params}`;
}

async function waitForReady(page, target) {
  if (target.ready === 'visual') {
    await page.waitForFunction(() => window.__SCORCHED_VISUAL_SCENE?.ready === true, null, { timeout: 15000 });
    return;
  }

  if (target.ready === 'testapi') {
    await page.waitForFunction(() => window.TestAPI?.isInitialized?.() === true, null, { timeout: 15000 });
    return;
  }

  if (target.ready === 'state') {
    await page.waitForFunction(
      expectedState => window.Game?.getState?.() === expectedState,
      target.state,
      { timeout: 15000 }
    );
    return;
  }

  await page.waitForFunction(() => window.Game?.getState?.() === 'menu', null, { timeout: 15000 });
  await page.waitForTimeout(900);
}

async function runTargetAction(page, target) {
  await page.evaluate(async ({ action }) => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    if (action === 'idle') {
      await wait(700);
      return;
    }

    if (action === 'openOptions') {
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height * 0.84,
        button: 0
      }));
      await wait(700);
      return;
    }

    if (action === 'openHighScores') {
      window.TestAPI?.openHighScoresScreen?.();
      await wait(700);
      return;
    }

    if (action.startsWith('state:')) {
      window.Game.setState(action.slice('state:'.length));
      await wait(900);
      return;
    }

    if (action === 'shop') {
      window.Money?.addMoney?.(12000);
      window.Game.setState('round_transition');
      window.Game.setState('shop');
      await wait(900);
      return;
    }

    if (action === 'victory') {
      window.VictoryDefeat.showVictory(1800, 3200, 0);
      window.Game.setState('victory');
      await wait(900);
      return;
    }

    if (action === 'defeat') {
      window.VictoryDefeat.showDefeat(350, 900, 0);
      window.Game.setState('defeat');
      await wait(900);
      return;
    }

    if (action === 'roundTransition') {
      window.RoundTransition.show({
        round: 5,
        damage: 2880,
        money: 1500,
        tokenResult: { total: 9, breakdown: [{ label: 'Round Clear', amount: 5 }, { label: 'Precision', amount: 4 }] },
        tokenBalance: 71,
        achievements: [{ achievement: { name: 'Sharpshooter' }, reward: 4 }],
        delay: 0
      });
      window.Game.setState('round_transition');
      await wait(900);
      return;
    }

    if (action === 'levelComplete') {
      window.LevelCompleteScreen.show({
        levelId: 'world1-level3',
        stats: { damageDealt: 2650, accuracy: 0.78, turnsUsed: 5, won: true },
        coinsEarned: 650
      });
      window.Game.setState('level_complete');
      await wait(1600);
      return;
    }

    if (action === 'triggerVisual') {
      const scene = window.__SCORCHED_VISUAL_SCENE;
      if (typeof scene?.trigger === 'function') {
        scene.trigger();
      }
      await wait(220);
    }
  }, { action: target.action });
}

async function getCanvasAudit(page) {
  return page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')];
    return canvases.map((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      const context = canvas.getContext('2d');
      let nonBlankSamples = null;

      if (context && canvas.width > 0 && canvas.height > 0) {
        const sampleWidth = Math.min(40, canvas.width);
        const sampleHeight = Math.min(40, canvas.height);
        const imageData = context.getImageData(
          Math.max(0, Math.floor((canvas.width - sampleWidth) / 2)),
          Math.max(0, Math.floor((canvas.height - sampleHeight) / 2)),
          sampleWidth,
          sampleHeight
        ).data;
        let nonBlank = 0;
        for (let i = 0; i < imageData.length; i += 4) {
          if (imageData[i + 3] > 8 && (imageData[i] > 8 || imageData[i + 1] > 8 || imageData[i + 2] > 8)) {
            nonBlank++;
          }
        }
        nonBlankSamples = nonBlank;
      }

      return {
        index,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        backingWidth: canvas.width,
        backingHeight: canvas.height,
        nonBlankSamples
      };
    });
  });
}

function validateAudit({ canvasAudit, viewport, consoleMessages, pageErrors }) {
  const failures = [];
  const visibleCanvases = canvasAudit.filter(canvas => canvas.width > 32 && canvas.height > 32);

  if (visibleCanvases.length === 0) {
    failures.push('no visible canvas rendered');
  }

  for (const canvas of visibleCanvases) {
    if (canvas.left < -2 || canvas.top < -2 || canvas.right > viewport.width + 2 || canvas.bottom > viewport.height + 2) {
      failures.push(`canvas ${canvas.index} overflows viewport`);
    }
    if (canvas.nonBlankSamples !== null && canvas.nonBlankSamples < 16) {
      failures.push(`canvas ${canvas.index} appears blank`);
    }
  }

  const consoleErrors = consoleMessages.filter(message => message.type === 'error');
  if (consoleErrors.length > 0) failures.push(`${consoleErrors.length} console error(s)`);
  if (pageErrors.length > 0) failures.push(`${pageErrors.length} page error(s)`);

  return failures;
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function runOne({ browser, args, target, viewport, outDir }) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: viewport.hasTouch ? 2 : 1,
    isMobile: viewport.hasTouch && viewport.width < 768
  });

  const consoleMessages = [];
  const pageErrors = [];
  page.on('console', message => {
    consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on('pageerror', error => {
    pageErrors.push({ message: error.message, stack: error.stack });
  });

  const baseName = `${target.id}-${viewport.id}`;
  const screenshotPath = path.join(outDir, `${baseName}.png`);
  const reportPath = path.join(outDir, `${baseName}.json`);
  const url = buildUrl(args, target);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: args.timeoutMs });
  await waitForReady(page, target);
  await runTargetAction(page, target);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const canvasAudit = await getCanvasAudit(page);
  const failures = validateAudit({ canvasAudit, viewport, consoleMessages, pageErrors });
  const report = {
    target: target.id,
    viewport: { id: viewport.id, width: viewport.width, height: viewport.height },
    url,
    screenshotPath,
    failures,
    canvasAudit,
    console: consoleMessages,
    pageErrors
  };
  await writeJson(reportPath, report);
  await page.close();

  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const targets = TARGETS.filter(target => !args.targets || args.targets.includes(target.id));
  const viewports = VIEWPORTS.filter(viewport => !args.viewports || args.viewports.includes(viewport.id));

  if (targets.length === 0) throw new Error('No visual audit targets selected');
  if (viewports.length === 0) throw new Error('No visual audit viewports selected');

  await fs.mkdir(args.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(args.outDir, stamp);
  await fs.mkdir(outDir, { recursive: true });

  const server = startServer(args);
  let browser = null;
  const reports = [];

  try {
    await waitForServer(`http://${args.host}:${args.port}/`, args.timeoutMs);
    browser = await chromium.launch({ headless: !args.headed });

    for (const target of targets) {
      for (const viewport of viewports) {
        console.log(`[visual-audit] RUN ${target.id} ${viewport.id}`);
        const report = await runOne({ browser, args, target, viewport, outDir });
        reports.push(report);
        const status = report.failures.length === 0 ? 'PASS' : 'FAIL';
        console.log(`[visual-audit] ${status} ${target.id} ${viewport.id}`);
      }
    }

    const summary = {
      outDir,
      targetCount: targets.length,
      viewportCount: viewports.length,
      passCount: reports.filter(report => report.failures.length === 0).length,
      failCount: reports.filter(report => report.failures.length > 0).length,
      reports: reports.map(report => ({
        target: report.target,
        viewport: report.viewport.id,
        screenshotPath: report.screenshotPath,
        failures: report.failures
      }))
    };
    await writeJson(path.join(outDir, 'summary.json'), summary);

    if (summary.failCount > 0) {
      console.error(`[visual-audit] Failed ${summary.failCount} capture(s). Summary: ${path.join(outDir, 'summary.json')}`);
      process.exitCode = 1;
    } else {
      console.log(`[visual-audit] Passed ${summary.passCount} captures. Summary: ${path.join(outDir, 'summary.json')}`);
    }
  } catch (error) {
    console.error('[visual-audit] Failed:', error.message);
    console.error(server.getOutput());
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.child.kill('SIGTERM');
  }
}

main();
