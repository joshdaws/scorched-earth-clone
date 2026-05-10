#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4182;
const DEFAULT_OUT_DIR = 'artifacts/world-visual-audit';

const WORLDS = [
  { id: 1, levelId: 'world1-level9', name: 'Neon Dunes' },
  { id: 2, levelId: 'world2-level9', name: 'Chrome Canyons' },
  { id: 3, levelId: 'world3-level9', name: 'Prism Bunkers' },
  { id: 4, levelId: 'world4-level9', name: 'Vector Vortex' },
  { id: 5, levelId: 'world5-level9', name: 'Pixel Wastes' },
  { id: 6, levelId: 'world6-level10', name: 'Midnight Citadel' }
];

function parseArgs(argv) {
  const args = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    outDir: DEFAULT_OUT_DIR,
    timeoutMs: 30000,
    headed: false,
    minPairDistance: 6,
    minNonBlankRatio: 0.02
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--host' && argv[index + 1]) args.host = argv[++index];
    else if (arg === '--port' && argv[index + 1]) args.port = Number(argv[++index]);
    else if (arg === '--out-dir' && argv[index + 1]) args.outDir = argv[++index];
    else if (arg === '--timeout-ms' && argv[index + 1]) args.timeoutMs = Number(argv[++index]);
    else if (arg === '--min-pair-distance' && argv[index + 1]) args.minPairDistance = Number(argv[++index]);
    else if (arg === '--min-nonblank-ratio' && argv[index + 1]) args.minNonBlankRatio = Number(argv[++index]);
    else if (arg === '--headed') args.headed = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function usage() {
  console.log(`Usage:
  npm run audit:worlds -- [--headed] [--min-pair-distance 6]

Captures one gameplay battlefield from each campaign world and fails if the
screenshots are blank or visually too similar to prove world-specific backdrops
are actually visible in the running build.
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

async function startWorldLevel(page, baseUrl, world) {
  await page.goto(baseUrl);
  await page.waitForFunction(() => window.Game?.getState?.() === 'menu', null, { timeout: 20000 });
  await page.evaluate(async ({ levelId, worldNum }) => {
    const { LevelRegistry } = await import('/js/levels.js');
    const level = LevelRegistry.getLevel(levelId);
    if (!level) throw new Error(`Unknown level: ${levelId}`);

    window.dispatchEvent(new CustomEvent('levelSelected', {
      detail: {
        levelId,
        level,
        worldNum,
        levelNum: level.level
      }
    }));
  }, { levelId: world.levelId, worldNum: world.id });

  await page.waitForFunction(() => window.Game?.getState?.() === 'playing', null, { timeout: 20000 });
  await page.waitForFunction(() => window.TestAPI?.isInitialized?.() === true, null, { timeout: 20000 });
  await page.waitForTimeout(1000);
}

async function imageSignature(filePath) {
  const source = sharp(filePath).removeAlpha();
  const metadata = await source.metadata();
  const cropHeight = Math.max(1, Math.floor(metadata.height * 0.58));
  const { data, info } = await source
    .extract({ left: 0, top: 0, width: metadata.width, height: cropHeight })
    .resize(64, 36, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixels = data.length / channels;
  const average = [0, 0, 0];
  let nonBlank = 0;

  for (let index = 0; index < data.length; index += channels) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    average[0] += r;
    average[1] += g;
    average[2] += b;
    if (r + g + b > 24) nonBlank += 1;
  }

  return {
    average: average.map(value => value / pixels),
    nonBlankRatio: nonBlank / pixels,
    pixels: data
  };
}

function pairDistance(a, b) {
  const length = Math.min(a.pixels.length, b.pixels.length);
  let sum = 0;
  for (let index = 0; index < length; index++) {
    sum += Math.abs(a.pixels[index] - b.pixels[index]);
  }
  return sum / length;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const root = process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(root, args.outDir, stamp);
  await fs.mkdir(outDir, { recursive: true });

  const baseUrl = `http://${args.host}:${args.port}/`;
  const server = startServer(args);
  let browser = null;

  try {
    await waitForServer(baseUrl, args.timeoutMs);
    browser = await chromium.launch({ headless: !args.headed });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 768 },
      deviceScaleFactor: 1
    });

    const reports = [];
    for (const world of WORLDS) {
      await startWorldLevel(page, baseUrl, world);
      const screenshotPath = path.join(outDir, `world-${world.id}-${world.name.toLowerCase().replaceAll(' ', '-')}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const signature = await imageSignature(screenshotPath);
      reports.push({
        world: world.id,
        name: world.name,
        levelId: world.levelId,
        screenshotPath: path.relative(root, screenshotPath),
        nonBlankRatio: Number(signature.nonBlankRatio.toFixed(4)),
        averageRgb: signature.average.map(value => Number(value.toFixed(1))),
        signature
      });
    }

    const pairDistances = [];
    for (let index = 0; index < reports.length - 1; index++) {
      const distance = pairDistance(reports[index].signature, reports[index + 1].signature);
      pairDistances.push({
        from: reports[index].world,
        to: reports[index + 1].world,
        distance: Number(distance.toFixed(2))
      });
    }

    const failures = [];
    for (const report of reports) {
      if (report.nonBlankRatio < args.minNonBlankRatio) {
        failures.push(`World ${report.world} capture is mostly blank (${report.nonBlankRatio}).`);
      }
    }

    for (const pair of pairDistances) {
      if (pair.distance < args.minPairDistance) {
        failures.push(`World ${pair.from} and ${pair.to} captures are too visually similar (${pair.distance}).`);
      }
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      minPairDistance: args.minPairDistance,
      minNonBlankRatio: args.minNonBlankRatio,
      pass: failures.length === 0,
      failures,
      worlds: reports.map(({ signature, ...report }) => report),
      pairDistances
    };

    await fs.writeFile(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

    if (failures.length > 0) {
      throw new Error(failures.join('\n'));
    }

    console.log(`World visual audit passed: ${path.relative(root, outDir)}/summary.json`);
    console.table(summary.pairDistances);
  } finally {
    if (browser) await browser.close();
    server.child.kill();
    await new Promise(resolve => server.child.once('close', resolve));
    if (server.child.exitCode !== 0 && server.child.exitCode !== null) {
      const output = server.getOutput().trim();
      if (output) console.warn(output);
    }
  }
}

run().catch(error => {
  console.error(error.message);
  process.exit(1);
});
