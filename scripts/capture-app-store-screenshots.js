#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4181;
const DEFAULT_OUT_DIR = 'artifacts/app-store-screenshots';

const DEVICES = [
  {
    id: 'iphone-6-9',
    label: 'iPhone 6.9-inch',
    width: 2796,
    height: 1290,
    requirement: 'Preferred current iPhone slot'
  },
  {
    id: 'iphone-6-5',
    label: 'iPhone 6.5-inch',
    width: 2688,
    height: 1242,
    requirement: 'Required if 6.9-inch screenshots are not provided'
  },
  {
    id: 'iphone-5-5',
    label: 'iPhone 5.5-inch',
    width: 2208,
    height: 1242,
    requirement: 'Legacy iPhone fallback slot'
  },
  {
    id: 'ipad-13',
    label: 'iPad 13-inch',
    width: 2732,
    height: 2048,
    requirement: 'Required because the app targets iPad'
  }
];

const TARGETS = [
  {
    id: '01-title-menu',
    label: 'Title menu',
    params: '',
    ready: 'menu',
    action: 'idle'
  },
  {
    id: '02-gameplay-hud',
    label: 'Gameplay HUD',
    params: 'scene=visual-hud',
    ready: 'visual',
    action: 'idle'
  },
  {
    id: '03-impact-effects',
    label: 'Projectile impact',
    params: 'scene=visual-impact',
    ready: 'visual',
    action: 'triggerVisual'
  },
  {
    id: '04-level-complete',
    label: 'Level complete stars',
    params: 'scene=physics-sandbox&wind=0',
    ready: 'testapi',
    action: 'levelComplete'
  },
  {
    id: '05-supply-drop',
    label: 'Supply drop',
    params: '',
    ready: 'menu',
    action: 'state:supply_drop'
  },
  {
    id: '06-shop',
    label: 'Armory shop',
    params: 'scene=physics-sandbox&wind=0',
    ready: 'testapi',
    action: 'shop'
  }
];

function parseArgs(argv) {
  const args = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    outDir: DEFAULT_OUT_DIR,
    timeoutMs: 30000,
    headed: false,
    skipBuild: false,
    devices: null,
    targets: null
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--host' && argv[index + 1]) args.host = argv[++index];
    else if (arg === '--port' && argv[index + 1]) args.port = Number(argv[++index]);
    else if (arg === '--out-dir' && argv[index + 1]) args.outDir = argv[++index];
    else if (arg === '--timeout-ms' && argv[index + 1]) args.timeoutMs = Number(argv[++index]);
    else if (arg === '--devices' && argv[index + 1]) args.devices = argv[++index].split(',').map(value => value.trim()).filter(Boolean);
    else if (arg === '--targets' && argv[index + 1]) args.targets = argv[++index].split(',').map(value => value.trim()).filter(Boolean);
    else if (arg === '--headed') args.headed = true;
    else if (arg === '--skip-build') args.skipBuild = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function usage() {
  console.log(`Usage:
  npm run screenshots:app-store -- [--skip-build] [--devices iphone-6-9,ipad-13] [--targets 01-title-menu,02-gameplay-hud]

Devices:
  ${DEVICES.map(device => `${device.id} (${device.width}x${device.height})`).join('\n  ')}

Targets:
  ${TARGETS.map(target => `${target.id} (${target.label})`).join('\n  ')}
`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function startPreview({ host, port }) {
  const child = spawn('npm', ['run', 'preview', '--', '--host', host, '--port', String(port)], {
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
      // Preview server is still starting.
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
    await page.waitForFunction(() => window.__SCORCHED_VISUAL_SCENE?.ready === true, null, { timeout: 20000 });
    return;
  }

  if (target.ready === 'testapi') {
    await page.waitForFunction(() => window.TestAPI?.isInitialized?.() === true, null, { timeout: 20000 });
    return;
  }

  await page.waitForFunction(() => window.Game?.getState?.() === 'menu', null, { timeout: 20000 });
  await page.waitForTimeout(900);
}

async function runTargetAction(page, target) {
  await page.evaluate(async ({ action }) => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    if (action === 'idle') {
      await wait(900);
      return;
    }

    if (action.startsWith('state:')) {
      window.Game.setState(action.slice('state:'.length));
      await wait(1200);
      return;
    }

    if (action === 'triggerVisual') {
      const scene = window.__SCORCHED_VISUAL_SCENE;
      if (typeof scene?.trigger === 'function') {
        scene.trigger();
      }
      await wait(300);
      return;
    }

    if (action === 'levelComplete') {
      window.LevelCompleteScreen.show({
        levelId: 'world1-level3',
        stats: { damageDealt: 2650, accuracy: 0.78, turnsUsed: 5, won: true },
        coinsEarned: 650
      });
      window.Game.setState('level_complete');
      await wait(1700);
      return;
    }

    if (action === 'shop') {
      window.Money?.addMoney?.(12000);
      window.Game.setState('round_transition');
      window.Game.setState('shop');
      await wait(1200);
    }
  }, { action: target.action });
}

async function runOne({ browser, args, target, device, outDir }) {
  const page = await browser.newPage({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: !device.id.startsWith('ipad')
  });

  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', message => {
    consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on('pageerror', error => {
    pageErrors.push({ message: error.message, stack: error.stack });
  });

  const deviceDir = path.join(outDir, device.id);
  await fs.mkdir(deviceDir, { recursive: true });

  const filename = `${target.id}.png`;
  const screenshotPath = path.join(deviceDir, filename);
  const url = buildUrl(args, target);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: args.timeoutMs });
  await waitForReady(page, target);
  await runTargetAction(page, target);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const consoleErrors = consoleMessages.filter(message => message.type === 'error');
  const failures = [];
  if (consoleErrors.length > 0) failures.push(`${consoleErrors.length} console error(s)`);
  if (pageErrors.length > 0) failures.push(`${pageErrors.length} page error(s)`);

  const imageSize = await page.evaluate(() => {
    const canvas = document.querySelector('canvas#game');
    const rect = canvas?.getBoundingClientRect();
    return rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null;
  });

  await page.close();

  return {
    target: target.id,
    label: target.label,
    device: device.id,
    deviceLabel: device.label,
    dimensions: { width: device.width, height: device.height },
    url,
    screenshotPath,
    imageSize,
    failures,
    consoleErrors,
    pageErrors
  };
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(filePath, summary) {
  const lines = [
    '# App Store Screenshot Index',
    '',
    `Generated: ${summary.generatedAt}`,
    `Output: \`${summary.outDir}\``,
    '',
    '| Device | Size | Target | File |',
    '| --- | --- | --- | --- |'
  ];

  for (const report of summary.reports) {
    lines.push(`| ${report.deviceLabel} | ${report.dimensions.width}x${report.dimensions.height} | ${report.label} | \`${path.relative(summary.outDir, report.screenshotPath)}\` |`);
  }

  lines.push('');
  lines.push(`Pass: ${summary.passCount}`);
  lines.push(`Fail: ${summary.failCount}`);
  lines.push('');

  await fs.writeFile(filePath, `${lines.join('\n')}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const devices = DEVICES.filter(device => !args.devices || args.devices.includes(device.id));
  const targets = TARGETS.filter(target => !args.targets || args.targets.includes(target.id));

  if (devices.length === 0) throw new Error('No screenshot devices selected');
  if (targets.length === 0) throw new Error('No screenshot targets selected');

  if (!args.skipBuild) {
    run('npm', ['run', 'build']);
  }

  await fs.mkdir(args.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(args.outDir, stamp);
  await fs.mkdir(outDir, { recursive: true });

  const server = startPreview(args);
  let browser = null;
  const reports = [];

  try {
    await waitForServer(`http://${args.host}:${args.port}/`, args.timeoutMs);
    browser = await chromium.launch({ headless: !args.headed });

    for (const device of devices) {
      for (const target of targets) {
        console.log(`[app-store-screenshots] RUN ${device.id} ${target.id}`);
        const report = await runOne({ browser, args, target, device, outDir });
        reports.push(report);
        const status = report.failures.length === 0 ? 'PASS' : 'FAIL';
        console.log(`[app-store-screenshots] ${status} ${device.id} ${target.id}`);
      }
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      outDir,
      source: 'release preview build',
      deviceCount: devices.length,
      targetCount: targets.length,
      passCount: reports.filter(report => report.failures.length === 0).length,
      failCount: reports.filter(report => report.failures.length > 0).length,
      devices,
      targets: targets.map(({ id, label }) => ({ id, label })),
      reports
    };

    await writeJson(path.join(outDir, 'summary.json'), summary);
    await writeMarkdown(path.join(outDir, 'index.md'), summary);

    if (summary.failCount > 0) {
      console.error(`[app-store-screenshots] Failed ${summary.failCount} capture(s). Summary: ${path.join(outDir, 'summary.json')}`);
      process.exitCode = 1;
    } else {
      console.log(`[app-store-screenshots] Passed ${summary.passCount} captures. Summary: ${path.join(outDir, 'summary.json')}`);
    }
  } catch (error) {
    console.error('[app-store-screenshots] Failed:', error.message);
    console.error(server.getOutput());
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.child.kill('SIGTERM');
  }
}

main();
