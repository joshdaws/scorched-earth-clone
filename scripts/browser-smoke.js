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
        timeoutMs: 20000,
        maxDroppedBacklogMs: null
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
        else if (arg === '--max-dropped-backlog-ms' && argv[index + 1]) args.maxDroppedBacklogMs = Number(argv[++index]);
        else if (arg === '--headed') args.headed = true;
        else if (arg === '--help' || arg === '-h') args.help = true;
    }

    if (!Number.isFinite(args.port)) args.port = DEFAULT_PORT;
    if (!Number.isFinite(args.timeoutMs)) args.timeoutMs = 20000;
    if (!Number.isFinite(args.maxDroppedBacklogMs)) args.maxDroppedBacklogMs = null;
    return args;
}

function usage() {
    console.log(`Usage:
  npm run smoke:browser -- [--scenario impact|projectile|idle|visual|controls|terrain|high-scores] [--scene physics-sandbox&wind=0] [--quality balanced] [--headed]

Examples:
  npm run smoke:browser
  npm run smoke:browser -- --scenario visual --scene visual-impact
  npm run smoke:browser -- --scenario projectile --quality low
  npm run smoke:browser -- --scenario projectile --max-dropped-backlog-ms 80
  npm run smoke:browser -- --scenario controls
  npm run smoke:browser -- --scenario terrain
  npm run smoke:browser -- --scenario high-scores

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

    if (scenario === 'controls') {
        await runControlsScenario(page, quality);
        return;
    }

    if (scenario === 'terrain') {
        await runTerrainScenario(page, quality);
        return;
    }

    if (scenario === 'high-scores') {
        await runHighScoresScenario(page, quality);
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

async function getControlState(page) {
    return page.evaluate(() => window.TestAPI.getControlState());
}

async function designToClient(page, point) {
    return page.evaluate(({ x, y }) => {
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        const scale = Math.min(rect.width / 1200, rect.height / 800);
        const offsetX = (rect.width - 1200 * scale) / 2;
        const offsetY = (rect.height - 800 * scale) / 2;
        return {
            x: rect.left + offsetX + x * scale,
            y: rect.top + offsetY + y * scale
        };
    }, point);
}

function angleArcPoint(tank, radius, angle) {
    const radians = angle * Math.PI / 180;
    return {
        x: tank.x + Math.cos(radians) * radius,
        y: tank.y - 32 - Math.sin(radians) * radius
    };
}

function assertControl(condition, message) {
    if (!condition) {
        throw new Error(`[controls] ${message}`);
    }
}

async function dispatchTouch(page, type, activeTouches, changedTouches) {
    await page.evaluate(({ eventType, touches, changed }) => {
        const canvas = document.querySelector('canvas');
        const toTouch = touch => {
            const base = {
                identifier: touch.identifier,
                target: canvas,
                clientX: touch.x,
                clientY: touch.y,
                screenX: touch.x,
                screenY: touch.y,
                pageX: touch.x,
                pageY: touch.y,
                radiusX: 8,
                radiusY: 8,
                rotationAngle: 0,
                force: 1
            };
            if (typeof window.Touch === 'function') {
                return new window.Touch(base);
            }
            return base;
        };

        const active = touches.map(toTouch);
        const changedItems = changed.map(toTouch);
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        Object.defineProperties(event, {
            touches: { value: active },
            targetTouches: { value: active },
            changedTouches: { value: changedItems }
        });
        canvas.dispatchEvent(event);
    }, {
        eventType: type,
        touches: activeTouches,
        changed: changedTouches
    });
}

async function prepareControlsScenario(page, quality, { reload = false } = {}) {
    if (reload) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForGameReady(page, 'controls');
    }

    await page.evaluate(({ selectedQuality }) => {
        window.TestAPI.setRenderQuality(selectedQuality);
        window.TestAPI.setControlMode('hybrid');
        window.TestAPI.aim({ angle: 45, power: 50 });
        window.TestAPI.resetPerformance();
    }, { selectedQuality: quality });
    await page.waitForTimeout(250);
}

async function runControlsScenario(page, quality) {
    await prepareControlsScenario(page, quality);

    let controls = await getControlState(page);
    assertControl(controls.inputEnabled, 'game input should be enabled during player aim');
    assertControl(controls.state.canFire, 'player should be able to fire at start of controls smoke');

    const initialAngle = controls.aim.angle;
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(100);
    controls = await getControlState(page);
    assertControl(controls.aim.angle > initialAngle, 'ArrowLeft should increase angle');

    const angleAfterLeft = controls.aim.angle;
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(100);
    controls = await getControlState(page);
    assertControl(controls.aim.angle < angleAfterLeft, 'ArrowRight should decrease angle');

    const initialPower = controls.aim.power;
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(100);
    controls = await getControlState(page);
    assertControl(controls.aim.power > initialPower, 'ArrowUp should increase power');

    const powerAfterUp = controls.aim.power;
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(100);
    controls = await getControlState(page);
    assertControl(controls.aim.power < powerAfterUp, 'ArrowDown should decrease power');

    const weaponBefore = controls.state.player.weapon;
    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
    controls = await getControlState(page);
    const weaponAfterTab = controls.state.player.weapon;
    assertControl(weaponAfterTab !== weaponBefore, 'Tab should cycle to the next weapon');

    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(150);
    controls = await getControlState(page);
    assertControl(controls.state.player.weapon === weaponBefore, 'Shift+Tab should cycle to the previous weapon');

    await page.keyboard.press('KeyP');
    await page.waitForTimeout(150);
    controls = await getControlState(page);
    assertControl(controls.gameState === 'paused', 'P should pause gameplay');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    controls = await getControlState(page);
    assertControl(controls.gameState === 'playing', 'Escape should resume from pause');

    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
    controls = await getControlState(page);
    assertControl(!controls.state.canFire, 'Space should fire and disable firing');

    await prepareControlsScenario(page, quality, { reload: true });
    controls = await getControlState(page);
    const fireButton = await designToClient(page, {
        x: controls.layout.FIRE_BUTTON.X,
        y: controls.layout.FIRE_BUTTON.Y
    });
    await page.mouse.click(fireButton.x, fireButton.y);
    await page.waitForTimeout(250);
    controls = await getControlState(page);
    assertControl(!controls.state.canFire, 'fire button click should fire and disable firing');

    await prepareControlsScenario(page, quality, { reload: true });
    controls = await getControlState(page);
    const weaponSlot = controls.weaponBar.slots.find(slot => slot.weaponId !== controls.state.player.weapon);
    assertControl(weaponSlot, 'weapon bar should expose a selectable non-current weapon slot');
    const weaponSlotCenter = await designToClient(page, {
        x: weaponSlot.x + weaponSlot.size / 2,
        y: weaponSlot.y + weaponSlot.size / 2
    });
    await page.mouse.click(weaponSlotCenter.x, weaponSlotCenter.y);
    await page.waitForTimeout(150);
    controls = await getControlState(page);
    assertControl(controls.state.player.weapon === weaponSlot.weaponId, 'weapon slot click should select that weapon');

    await page.evaluate(() => window.TestAPI.aim({ angle: 45, power: 50 }));
    await page.waitForTimeout(100);
    controls = await getControlState(page);
    const arcRadius = controls.layout.ANGLE_ARC.RADIUS;
    const arcStart = await designToClient(page, angleArcPoint(controls.state.player, arcRadius, 45));
    const arcEnd = await designToClient(page, angleArcPoint(controls.state.player, arcRadius, 70));
    await page.mouse.move(arcStart.x, arcStart.y);
    await page.mouse.down();
    await page.mouse.move(arcEnd.x, arcEnd.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    controls = await getControlState(page);
    assertControl(Math.abs(controls.aim.angle - 70) <= 8, `angle arc drag should set angle near 70, got ${controls.aim.angle}`);

    const tankCenter = await designToClient(page, {
        x: controls.state.player.x,
        y: controls.state.player.y - 16
    });
    const dragPoint = await designToClient(page, {
        x: controls.state.player.x - 95,
        y: controls.state.player.y - 90
    });
    const secondTouch = await designToClient(page, {
        x: controls.state.player.x + 180,
        y: controls.state.player.y - 20
    });

    await dispatchTouch(page, 'touchstart', [{ identifier: 1, ...tankCenter }], [{ identifier: 1, ...tankCenter }]);
    await page.waitForTimeout(60);
    await dispatchTouch(page, 'touchmove', [{ identifier: 1, ...dragPoint }], [{ identifier: 1, ...dragPoint }]);
    await page.waitForTimeout(150);
    controls = await getControlState(page);
    assertControl(controls.touchAiming.isActive, 'touch drag near tank should activate slingshot aiming');
    assertControl(controls.state.canFire, 'touch drag should not fire before release');
    assertControl(Math.abs(controls.aim.power - 50) > 1, 'touch drag should update power before release');

    await dispatchTouch(
        page,
        'touchstart',
        [{ identifier: 1, ...dragPoint }, { identifier: 2, ...secondTouch }],
        [{ identifier: 2, ...secondTouch }]
    );
    await page.waitForTimeout(50);
    await dispatchTouch(page, 'touchend', [{ identifier: 1, ...dragPoint }], [{ identifier: 2, ...secondTouch }]);
    await page.waitForTimeout(80);
    controls = await getControlState(page);
    assertControl(controls.touchAiming.isActive, 'ending a secondary touch should not cancel the active drag');
    assertControl(controls.state.canFire, 'ending a secondary touch should not fire');

    await dispatchTouch(page, 'touchend', [], [{ identifier: 1, ...dragPoint }]);
    await page.waitForTimeout(250);
    controls = await getControlState(page);
    assertControl(!controls.state.canFire, 'releasing the active slingshot drag should fire and disable firing');
}

function assertTerrain(condition, message) {
    if (!condition) {
        throw new Error(`[terrain] ${message}`);
    }
}

async function sampleTerrain(page, sampleXs) {
    return page.evaluate(xs => xs.map(x => window.TestAPI.getTerrainAt(x)), sampleXs);
}

function heightList(samples) {
    return samples.map(sample => Math.round(sample.height));
}

async function runTerrainScenario(page, quality) {
    await page.evaluate(({ selectedQuality }) => {
        window.TestAPI.setRenderQuality(selectedQuality);
        window.TestAPI.resetPerformance();
    }, { selectedQuality: quality });

    const sampleXs = [0, 80, 160, 300, 450, 600, 750, 900, 1040, 1199];

    const first = await page.evaluate(() => window.TestAPI.generateTerrain({ seed: 24680, roughness: 0.52 }));
    const firstSamples = await sampleTerrain(page, sampleXs);
    assertTerrain(first.success, 'seeded terrain generation should succeed');
    assertTerrain(first.width === 1200, `terrain width should be 1200, got ${first.width}`);
    assertTerrain(first.minHeight >= 0, `terrain min height should be in bounds, got ${first.minHeight}`);
    assertTerrain(first.maxHeight <= first.height, `terrain max height should fit screen, got ${first.maxHeight}`);
    assertTerrain(first.maxHeight - first.minHeight > 24, 'terrain should have visible height variation');
    assertTerrain(firstSamples.every(sample => sample.success && sample.canvasY >= 0 && sample.canvasY <= first.height), 'sampled terrain should stay within canvas bounds');

    await page.evaluate(() => window.TestAPI.generateTerrain({ seed: 24680, roughness: 0.52 }));
    const repeatedSamples = await sampleTerrain(page, sampleXs);
    assertTerrain(
        JSON.stringify(heightList(firstSamples)) === JSON.stringify(heightList(repeatedSamples)),
        'same terrain seed should reproduce sampled heights'
    );

    await page.evaluate(() => window.TestAPI.generateTerrain({ seed: 24681, roughness: 0.52 }));
    const variedSamples = await sampleTerrain(page, sampleXs);
    assertTerrain(
        JSON.stringify(heightList(firstSamples)) !== JSON.stringify(heightList(variedSamples)),
        'different terrain seed should vary sampled heights'
    );

    await page.evaluate(() => window.TestAPI.generateTerrain({ seed: 24680, roughness: 0.52 }));
    await page.evaluate(() => window.TestAPI.setTankPositions({ player: 600, enemy: 900 }));
    await page.waitForTimeout(150);

    const beforeImpact = await page.evaluate(() => ({
        center: window.TestAPI.getTerrainAt(600),
        left: window.TestAPI.getTerrainAt(560),
        right: window.TestAPI.getTerrainAt(640),
        outside: window.TestAPI.getTerrainAt(720),
        tank: window.TestAPI.getTankPositions().player
    }));
    assertTerrain(Math.abs(beforeImpact.tank.y - beforeImpact.center.canvasY) < 2, 'tank should sit on terrain after placement');

    const firstDestroy = await page.evaluate(y => window.TestAPI.destroyTerrain({ x: 600, y: y + 22, radius: 64 }), beforeImpact.center.canvasY);
    await page.waitForTimeout(350);
    const afterImpact = await page.evaluate(() => ({
        center: window.TestAPI.getTerrainAt(600),
        left: window.TestAPI.getTerrainAt(560),
        right: window.TestAPI.getTerrainAt(640),
        outside: window.TestAPI.getTerrainAt(720)
    }));
    assertTerrain(firstDestroy.success && firstDestroy.destroyed, 'first terrain destruction should carve terrain');
    assertTerrain(afterImpact.center.height < beforeImpact.center.height, 'blast center terrain height should decrease');
    assertTerrain(afterImpact.left.height <= beforeImpact.left.height, 'left crater shoulder should not grow');
    assertTerrain(afterImpact.right.height <= beforeImpact.right.height, 'right crater shoulder should not grow');
    assertTerrain(afterImpact.outside.height <= beforeImpact.outside.height + 32, 'terrain outside blast should not regenerate upward');

    const secondDestroy = await page.evaluate(y => window.TestAPI.destroyTerrain({ x: 600, y: y + 18, radius: 46 }), afterImpact.center.canvasY);
    await page.waitForTimeout(250);
    const afterSecondImpact = await page.evaluate(() => window.TestAPI.getTerrainAt(600));
    assertTerrain(secondDestroy.success, 'second terrain destruction should return a valid result');
    assertTerrain(afterSecondImpact.height <= afterImpact.center.height, 'multiple explosions should accumulate or preserve crater depth');

    const simulation = await page.evaluate(() => {
        const candidates = [
            { angle: 24, power: 42 },
            { angle: 32, power: 48 },
            { angle: 45, power: 50 },
            { angle: 58, power: 55 },
            { angle: 72, power: 46 }
        ];
        let lastResult = null;
        for (const candidate of candidates) {
            lastResult = window.TestAPI.simulateProjectile({
                ...candidate,
                wind: 0,
                maxSteps: 700
            });
            if (lastResult.terrainHit) {
                return lastResult;
            }
        }
        return lastResult;
    });
    assertTerrain(simulation.success, 'projectile simulation should succeed');
    assertTerrain(simulation.terrainHit, 'projectile simulation should hit terrain');
    const landingTerrain = await page.evaluate(x => window.TestAPI.getTerrainAt(x), simulation.landingX);
    assertTerrain(Math.abs(landingTerrain.canvasY - simulation.landingY) <= 10, 'projectile collision point should match terrain surface');

    await page.waitForTimeout(500);
}

function assertHighScores(condition, message) {
    if (!condition) {
        throw new Error(`[high-scores] ${message}`);
    }
}

function assertDescendingRounds(scores) {
    for (let index = 1; index < scores.length; index++) {
        if (scores[index - 1].roundsSurvived < scores[index].roundsSurvived) {
            return false;
        }
    }
    return true;
}

async function runHighScoresScenario(page, quality) {
    await page.evaluate(() => window.TestAPI.resetHighScoreQaData());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForGameReady(page, 'high-scores');

    await page.evaluate(({ selectedQuality }) => {
        window.TestAPI.setRenderQuality(selectedQuality);
        window.TestAPI.resetPerformance();
    }, { selectedQuality: quality });

    let state = await page.evaluate(() => window.TestAPI.getHighScoreQaState());
    assertHighScores(state.highScores.length === 0, 'high scores should start empty after reset');
    assertHighScores(state.stored.playerName === null, 'player name should start empty after reset');

    await page.evaluate(() => window.TestAPI.showNameEntry({ isFirstTime: true }));
    await page.keyboard.type('QA Pilot');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const nameEntry = await page.evaluate(() => window.TestAPI.getNameEntryState());
    assertHighScores(!nameEntry.isOpen, 'name entry should close after confirming a valid name');
    assertHighScores(nameEntry.storedName === 'QA Pilot', `stored player name should be QA Pilot, got ${nameEntry.storedName}`);

    const run = await page.evaluate(() => window.TestAPI.exerciseRunStatistics());
    assertHighScores(run.success, 'run statistics exercise should succeed');
    assertHighScores(run.stats.roundsSurvived === 5, `rounds survived should be 5, got ${run.stats.roundsSurvived}`);
    assertHighScores(run.stats.totalDamageDealt === 160, `damage dealt should be 160, got ${run.stats.totalDamageDealt}`);
    assertHighScores(run.stats.totalDamageTaken === 35, `damage taken should be 35, got ${run.stats.totalDamageTaken}`);
    assertHighScores(run.stats.shotsFired === 3, `shots fired should be 3, got ${run.stats.shotsFired}`);
    assertHighScores(run.stats.shotsHit === 2, `shots hit should be 2, got ${run.stats.shotsHit}`);
    assertHighScores(run.stats.hitRate === 67, `hit rate should round to 67, got ${run.stats.hitRate}`);
    assertHighScores(run.stats.moneyEarned === 750, `money earned should be 750, got ${run.stats.moneyEarned}`);
    assertHighScores(run.stats.moneySpent === 200, `money spent should be 200, got ${run.stats.moneySpent}`);
    assertHighScores(run.stats.biggestHit === 120, `biggest hit should be 120, got ${run.stats.biggestHit}`);
    assertHighScores(run.stats.weaponsUsed.includes('basic-shot') && run.stats.weaponsUsed.includes('laser-blast'), 'weapons used should include both deterministic weapons');
    assertHighScores(run.stats.nukesLaunched === 1, `nukes launched should be 1, got ${run.stats.nukesLaunched}`);

    const saveResults = await page.evaluate(() => {
        const results = [];
        for (let index = 1; index <= 12; index++) {
            results.push(window.TestAPI.saveHighScoreForQa({
                roundsSurvived: index,
                totalDamageDealt: index * 100,
                enemiesDestroyed: index % 3,
                shotsFired: index + 2,
                shotsHit: Math.min(index, index + 2),
                moneyEarned: index * 75,
                biggestHit: index * 10,
                totalScore: index * 1000
            }));
        }
        return results;
    });
    assertHighScores(saveResults[0].result.saved, 'first qualifying score should save locally');
    assertHighScores(saveResults[0].result.rank === 1, `first score rank should be 1, got ${saveResults[0].result.rank}`);
    assertHighScores(saveResults[11].result.saved, 'best score should save locally');
    assertHighScores(saveResults[11].result.rank === 1, `best score rank should be 1, got ${saveResults[11].result.rank}`);
    await page.waitForFunction(() => {
        const raw = localStorage.getItem('scorched_earth_local_scores');
        return raw && JSON.parse(raw).length >= 12;
    }, null, { timeout: 5000 });

    state = await page.evaluate(() => window.TestAPI.getHighScoreQaState());
    assertHighScores(state.highScores.length === 10, `local high scores should retain top 10, got ${state.highScores.length}`);
    assertHighScores(assertDescendingRounds(state.highScores), 'local high scores should be sorted by rounds descending');
    assertHighScores(state.bestRound === 12, `best round should be 12, got ${state.bestRound}`);
    assertHighScores(!state.qualifiesLowScore, 'a 1-round score should not qualify after top 10 is full');
    assertHighScores(state.highScores[0].roundsSurvived === 12, 'rank #1 should be the 12-round score');
    assertHighScores(state.highScores[9].roundsSurvived === 3, 'rank #10 should be the 3-round score');
    assertHighScores(state.displayLifetimeStats.totalRuns === 12, `display lifetime total runs should be 12, got ${state.displayLifetimeStats.totalRuns}`);
    assertHighScores(state.displayLifetimeStats.totalRoundsPlayed === 78, `display lifetime rounds should be 78, got ${state.displayLifetimeStats.totalRoundsPlayed}`);
    assertHighScores(state.displayLifetimeStats.lifetimeDamage === 7800, `display lifetime damage should be 7800, got ${state.displayLifetimeStats.lifetimeDamage}`);
    assertHighScores(state.displayLifetimeStats.bestRound === 12, `display lifetime best round should be 12, got ${state.displayLifetimeStats.bestRound}`);
    assertHighScores(state.displayLifetimeStats.lifetimeMoneyEarned === 5850, `display lifetime money should be 5850, got ${state.displayLifetimeStats.lifetimeMoneyEarned}`);
    assertHighScores(state.stored.localScores.length >= 12, 'offline/global leaderboard backup should include submitted scores');
    assertHighScores(state.stored.localScores.some(score => score.displayName === 'QA Pilot'), 'offline/global scores should include the confirmed player name');

    const aggregateBefore = await page.evaluate(() => window.TestAPI.getHighScoreQaState().aggregateLifetimeStats);
    const lifetime = await page.evaluate(() => window.TestAPI.exerciseLifetimeStatistics());
    assertHighScores(lifetime.success, 'aggregate lifetime statistics exercise should succeed');
    assertHighScores(lifetime.summary.totalRuns === aggregateBefore.totalRuns + 1, `aggregate total runs should increment by 1, got ${aggregateBefore.totalRuns} -> ${lifetime.summary.totalRuns}`);
    assertHighScores(lifetime.summary.wins === aggregateBefore.totalWins + 1, `aggregate wins should increment by 1, got ${aggregateBefore.totalWins} -> ${lifetime.summary.wins}`);
    assertHighScores(lifetime.summary.losses === aggregateBefore.totalLosses + 1, `aggregate losses should increment by 1, got ${aggregateBefore.totalLosses} -> ${lifetime.summary.losses}`);
    assertHighScores(lifetime.summary.damageDealt === aggregateBefore.totalDamageDealt + 160, `aggregate damage dealt should increment by 160, got ${aggregateBefore.totalDamageDealt} -> ${lifetime.summary.damageDealt}`);
    assertHighScores(lifetime.stats.totalDamageTaken === aggregateBefore.totalDamageTaken + 35, `aggregate damage taken should increment by 35, got ${aggregateBefore.totalDamageTaken} -> ${lifetime.stats.totalDamageTaken}`);
    assertHighScores(lifetime.accuracy === 67, `aggregate accuracy should round to 67, got ${lifetime.accuracy}`);
    assertHighScores(lifetime.favoriteWeapon === 'laser-blast', `favorite weapon should be laser-blast, got ${lifetime.favoriteWeapon}`);
    assertHighScores(lifetime.summary.highestRound === 6, `highest round should be 6, got ${lifetime.summary.highestRound}`);
    assertHighScores(lifetime.stats.totalMoneyEarned === aggregateBefore.totalMoneyEarned + 750, `aggregate money earned should increment by 750, got ${aggregateBefore.totalMoneyEarned} -> ${lifetime.stats.totalMoneyEarned}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForGameReady(page, 'high-scores');
    state = await page.evaluate(() => window.TestAPI.getHighScoreQaState());
    assertHighScores(state.stored.playerName === 'QA Pilot', 'player name should persist after reload');
    assertHighScores(state.highScores.length === 10, 'top 10 high scores should persist after reload');
    assertHighScores(state.bestRound === 12, 'best round should persist after reload');
    assertHighScores(state.displayLifetimeStats.totalRuns === 12, 'display lifetime stats should persist after reload');
    assertHighScores(state.aggregateLifetimeStats.totalWins === lifetime.stats.totalWins, 'aggregate wins should persist after reload');
    assertHighScores(state.aggregateLifetimeStats.totalLosses === lifetime.stats.totalLosses, 'aggregate losses should persist after reload');
    assertHighScores(state.aggregateLifetimeStats.totalDamageDealt === lifetime.stats.totalDamageDealt, 'aggregate damage dealt should persist after reload');

    const opened = await page.evaluate(() => window.TestAPI.openHighScoresScreen());
    assertHighScores(opened.success && opened.gameState === 'high_scores', `high scores screen should open, got ${opened.gameState}`);
    const localTab = await designToClient(page, { x: 700, y: 110 });
    await page.mouse.click(localTab.x, localTab.y);
    await page.waitForTimeout(800);
}

function assertSmokeBudgets(metrics, args) {
    if (args.maxDroppedBacklogMs === null) {
        return [];
    }

    const maxDroppedBacklog = metrics?.droppedBacklog?.maxMs;
    if (!Number.isFinite(maxDroppedBacklog)) {
        return ['dropped backlog metrics were not reported'];
    }
    if (maxDroppedBacklog > args.maxDroppedBacklogMs) {
        return [
            `dropped backlog max ${maxDroppedBacklog.toFixed(2)}ms exceeded ${args.maxDroppedBacklogMs.toFixed(2)}ms`
        ];
    }
    return [];
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
        const page = await browser.newPage({
            viewport: { width: 1280, height: 768 },
            hasTouch: args.scenario === 'controls'
        });

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
            metrics: metricsResult?.metrics ?? null,
            loopTiming: metricsResult?.loopTiming ?? null
        });
        await writeJson(`${basePath}.console.json`, {
            console: consoleMessages,
            pageErrors
        });

        const consoleErrors = consoleMessages.filter(message => message.type === 'error');
        const budgetFailures = assertSmokeBudgets(metricsResult?.metrics, args);
        if (consoleErrors.length > 0 || pageErrors.length > 0 || budgetFailures.length > 0) {
            console.error(`[browser-smoke] Failed: ${consoleErrors.length} console errors, ${pageErrors.length} page errors, ${budgetFailures.length} budget failures`);
            for (const failure of budgetFailures) {
                console.error(`[browser-smoke] Budget: ${failure}`);
            }
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
