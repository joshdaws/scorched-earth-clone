#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const DEFAULT_PORT = 4177;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_SCENE = 'physics-sandbox&wind=0';
const DEFAULT_SCENARIO = 'impact';
const DEFAULT_QUALITY = 'balanced';
const DEFAULT_OUT_DIR = 'artifacts/browser-smoke';

function parseArgs(argv) {
    const args = {
        host: DEFAULT_HOST,
        port: DEFAULT_PORT,
        scene: DEFAULT_SCENE,
        scenario: DEFAULT_SCENARIO,
        quality: DEFAULT_QUALITY,
        outDir: DEFAULT_OUT_DIR,
        headed: false,
        timeoutMs: 20000
    };

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === '--host' && argv[index + 1]) args.host = argv[++index];
        else if (arg === '--port' && argv[index + 1]) args.port = Number(argv[++index]);
        else if (arg === '--scene' && argv[index + 1]) args.scene = argv[++index];
        else if (arg === '--scenario' && argv[index + 1]) args.scenario = argv[++index];
        else if (arg === '--quality' && argv[index + 1]) args.quality = argv[++index];
        else if (arg === '--out-dir' && argv[index + 1]) args.outDir = argv[++index];
        else if (arg === '--timeout-ms' && argv[index + 1]) args.timeoutMs = Number(argv[++index]);
        else if (arg === '--headed') args.headed = true;
        else if (arg === '--help' || arg === '-h') args.help = true;
    }

    if (!Number.isFinite(args.port)) args.port = DEFAULT_PORT;
    if (!Number.isFinite(args.timeoutMs)) args.timeoutMs = 20000;
    return args;
}

function usage() {
    console.log(`Usage:
  npm run smoke:browser -- [--scenario impact|projectile|idle|visual] [--scene physics-sandbox&wind=0] [--quality balanced] [--headed]

Examples:
  npm run smoke:browser
  npm run smoke:browser -- --scenario visual --scene visual-impact
  npm run smoke:browser -- --scenario projectile --quality low

If Chromium is missing after a clean checkout, run:
  npm run smoke:browser:install
`);
}

function sceneUrl({ host, port, scene }) {
    const params = scene.startsWith('?') ? scene.slice(1) : `scene=${scene}`;
    return `http://${host}:${port}/?${params}`;
}

async function waitForServer(url, timeoutMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch (_error) {
            // Server is still starting.
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error(`Timed out waiting for ${url}`);
}

function startServer({ host, port }) {
    const child = spawn(
        'npm',
        ['run', 'dev', '--', '--host', host, '--port', String(port)],
        {
            cwd: process.cwd(),
            env: { ...process.env, BROWSER: 'none' },
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );

    let output = '';
    child.stdout.on('data', chunk => {
        output += chunk.toString();
    });
    child.stderr.on('data', chunk => {
        output += chunk.toString();
    });

    return { child, getOutput: () => output };
}

async function writeJson(filePath, data) {
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function waitForGameReady(page, scenario) {
    if (scenario === 'visual') {
        await page.waitForFunction(
            () => window.__SCORCHED_VISUAL_SCENE?.ready === true,
            null,
            { timeout: 15000 }
        );
        return;
    }

    await page.waitForFunction(
        () => window.TestAPI?.isInitialized?.() === true,
        null,
        { timeout: 15000 }
    );
}

async function runScenario(page, { scenario, quality }) {
    if (scenario === 'visual') {
        await page.evaluate(async () => {
            const scene = window.__SCORCHED_VISUAL_SCENE;
            if (typeof scene?.trigger === 'function') {
                scene.trigger();
                await new Promise(resolve => setTimeout(resolve, 160));
            }
        });
        return;
    }

    await page.evaluate(({ selectedQuality }) => {
        window.TestAPI.setRenderQuality(selectedQuality);
        window.TestAPI.resetPerformance();
    }, { selectedQuality: quality });

    if (scenario === 'idle') {
        await page.waitForTimeout(5000);
        return;
    }

    if (scenario === 'projectile') {
        await page.evaluate(() => {
            window.TestAPI.aim({ angle: 42, power: 70 });
            window.TestAPI.fireDirect();
        });
        await page.waitForTimeout(5000);
        return;
    }

    await page.evaluate(async () => {
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const api = window.TestAPI;
        api.generateTerrain({ seed: 4128, roughness: 0.5 });
        await wait(300);
        api.resetPerformance();

        for (const x of [520, 650, 780]) {
            const terrain = api.getTerrainAt(x);
            api.destroyTerrain({ x, y: terrain.canvasY + 18, radius: 82 });
            await wait(700);
        }

        await wait(2400);
    });
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        usage();
        return;
    }

    await fs.mkdir(args.outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basePath = path.join(args.outDir, `${stamp}-${args.scenario}`);
    const url = sceneUrl(args);
    const server = startServer(args);
    let browser = null;

    const consoleMessages = [];
    const pageErrors = [];

    try {
        await waitForServer(`http://${args.host}:${args.port}/`, args.timeoutMs);
        browser = await chromium.launch({ headless: !args.headed });
        const page = await browser.newPage({ viewport: { width: 1280, height: 768 } });

        page.on('console', message => {
            consoleMessages.push({
                type: message.type(),
                text: message.text(),
                location: message.location()
            });
        });
        page.on('pageerror', error => {
            pageErrors.push({ message: error.message, stack: error.stack });
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: args.timeoutMs });
        await waitForGameReady(page, args.scenario);
        await runScenario(page, args);

        const metricsResult = await page.evaluate(() => window.TestAPI?.getPerformanceMetrics?.() ?? null);
        const environment = await page.evaluate(() => ({
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            devicePixelRatio: window.devicePixelRatio,
            viewport: { width: innerWidth, height: innerHeight },
            webgl: (() => {
                const canvas = document.createElement('canvas');
                return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
            })()
        }));

        await page.screenshot({ path: `${basePath}.png`, fullPage: false });
        await writeJson(`${basePath}.metrics.json`, {
            url,
            scenario: args.scenario,
            quality: args.quality,
            environment,
            metrics: metricsResult?.metrics ?? null
        });
        await writeJson(`${basePath}.console.json`, {
            console: consoleMessages,
            pageErrors
        });

        const consoleErrors = consoleMessages.filter(message => message.type === 'error');
        if (consoleErrors.length > 0 || pageErrors.length > 0) {
            console.error(`[browser-smoke] Failed: ${consoleErrors.length} console errors, ${pageErrors.length} page errors`);
            process.exitCode = 1;
        } else {
            console.log(`[browser-smoke] Passed ${args.scenario} at ${url}`);
            console.log(`[browser-smoke] Screenshot: ${basePath}.png`);
            console.log(`[browser-smoke] Metrics: ${basePath}.metrics.json`);
            console.log(`[browser-smoke] Console: ${basePath}.console.json`);
        }
    } catch (error) {
        console.error('[browser-smoke] Failed:', error.message);
        console.error(server.getOutput());
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
        server.child.kill('SIGTERM');
    }
}

main();
