#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const root = process.cwd();
const screenshotRoot = path.join(root, 'artifacts/app-store-screenshots');
const worldVisualRoot = path.join(root, 'artifacts/world-visual-audit');
const browserSmokeRoot = path.join(root, 'artifacts/browser-smoke');

const requiredFiles = [
  'docs/release/app-store-materials.md',
  'docs/release/app-store-submission-checklist.md',
  'docs/ios-release-readiness.md',
  'docs/ios-testflight-setup.md',
  'public/privacy.html',
  'public/support.html',
  'assets/icons/app-icon-1024.png',
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/Contents.json',
  'ios/App/App/Info.plist',
  'ios/App/App.xcodeproj/project.pbxproj',
  'ios/App/App/public/index.html',
  'ios/App/App/public/privacy.html',
  'ios/App/App/public/support.html',
  'ios/App/App/public/assets/manifest.json'
];

const expectedScreenshotSlots = {
  'iphone-6-9': { width: 2796, height: 1290 },
  'iphone-6-5': { width: 2688, height: 1242 },
  'iphone-5-5': { width: 2208, height: 1242 },
  'ipad-13': { width: 2732, height: 2048 }
};

const expectedWorlds = new Set([1, 2, 3, 4, 5, 6]);
const requiredPerformanceScenarios = ['controls', 'projectile', 'terrain', 'impact', 'high-scores'];
const performanceBudgets = {
  frameP95Ms: 24,
  frameMaxMs: 90,
  updateP95Ms: 8,
  droppedBacklogTotalMs: 120,
  droppedBacklogMaxMs: 50,
  terrainImpactP95Ms: 28,
  pixiFragmentsMax: 520,
  particlesMax: 900
};

const screenshotFreshnessInputs = [
  'assets/manifest.json',
  'js/main.js',
  'js/effects.js',
  'scripts/capture-app-store-screenshots.js'
];

const worldVisualFreshnessInputs = [
  'assets/manifest.json',
  'assets/images/backgrounds/world-1-neon-dunes.png',
  'assets/images/backgrounds/world-2-chrome-canyons.png',
  'assets/images/backgrounds/world-3-prism-bunkers.png',
  'assets/images/backgrounds/world-4-vector-vortex.png',
  'assets/images/backgrounds/world-5-pixel-wastes.png',
  'assets/images/backgrounds/world-6-midnight-citadel.png',
  'assets/images/puzzle-objects/hardlight-bunker.png',
  'assets/images/puzzle-objects/ricochet-panel.png',
  'assets/images/puzzle-objects/shield-generator.png',
  'assets/images/puzzle-objects/teleport-gate.png',
  'js/effects.js',
  'js/main.js',
  'scripts/audit-world-visuals.js'
];

const performanceFreshnessInputs = [
  'assets/manifest.json',
  'js/effects.js',
  'js/main.js',
  'js/performanceMetrics.js',
  'js/ui.js',
  'scripts/browser-smoke.js'
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function latestSummaryFile(summaryRoot) {
  if (!fs.existsSync(summaryRoot)) return null;

  const candidates = fs.readdirSync(summaryRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(summaryRoot, entry.name, 'summary.json'))
    .filter(file => fs.existsSync(file))
    .map(file => ({
      file,
      mtimeMs: fs.statSync(file).mtimeMs
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.file || null;
}

function latestBrowserSmokeMetrics(scenario) {
  if (!fs.existsSync(browserSmokeRoot)) return null;

  const suffix = `-${scenario}.metrics.json`;
  const candidates = fs.readdirSync(browserSmokeRoot, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(suffix))
    .map(entry => path.join(browserSmokeRoot, entry.name))
    .map(file => ({
      file,
      mtimeMs: fs.statSync(file).mtimeMs
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.file || null;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    ...options
  });
}

function collectFiles(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return [];

  const results = [];
  const stack = [fullPath];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(child);
      } else {
        results.push(path.relative(root, child));
      }
    }
  }

  return results;
}

function fileHash(relativePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest('hex');
}

function checkReceiptFreshness(summaryPath, inputPaths, label, failures) {
  const summaryMtimeMs = fs.statSync(summaryPath).mtimeMs;
  for (const inputPath of inputPaths) {
    const absolutePath = path.join(root, inputPath);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`${label} freshness input is missing: ${inputPath}`);
      continue;
    }

    if (fs.statSync(absolutePath).mtimeMs > summaryMtimeMs) {
      failures.push(`${label} receipt is stale; rerun it because ${inputPath} changed after ${path.relative(root, summaryPath)}.`);
    }
  }
}

function checkPackageScripts(failures) {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};
  for (const script of ['check', 'build', 'ios:check', 'screenshots:app-store', 'audit:worlds', 'open:ios']) {
    if (!scripts[script]) failures.push(`Missing package script: ${script}`);
  }
}

function checkRuntimeConfig(failures, warnings) {
  if (!exists('config.js')) {
    failures.push('Missing config.js; run npm run generate-config:offline for the recommended first submission mode.');
    return;
  }

  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  if (!config.includes("SERVICE_MODE: 'offline'") || !config.includes('OFFLINE_SERVICES: true')) {
    warnings.push('config.js is not offline-first. Confirm App Store privacy answers before submission.');
  }
}

function checkRequiredFiles(failures) {
  for (const file of requiredFiles) {
    if (!exists(file)) failures.push(`Missing handoff file: ${file}`);
  }
}

function checkNativeWebBundleFreshness(failures) {
  if (!exists('www') || !exists('ios/App/App/public')) {
    failures.push('Missing www or ios/App/App/public; run npm run ios:check.');
    return;
  }

  const webFiles = collectFiles('www').sort();
  for (const webFile of webFiles) {
    const nativeFile = path.join('ios/App/App/public', path.relative('www', webFile));
    if (!exists(nativeFile)) {
      failures.push(`Native iOS web bundle is missing synced file: ${nativeFile}`);
      continue;
    }

    if (fileHash(webFile) !== fileHash(nativeFile)) {
      failures.push(`Native iOS web bundle is stale: ${nativeFile} differs from ${webFile}. Run npm run ios:check.`);
    }
  }
}

function checkScreenshotSummary(failures, warnings) {
  const summaryPath = latestSummaryFile(screenshotRoot);
  if (!summaryPath) {
    failures.push('No App Store screenshot summary found. Run npm run screenshots:app-store.');
    return null;
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  checkReceiptFreshness(summaryPath, screenshotFreshnessInputs, 'App Store screenshot', failures);
  if (summary.failCount !== 0) failures.push(`Latest screenshot summary has failures: ${summaryPath}`);
  if (summary.passCount !== 24) warnings.push(`Latest screenshot summary passCount is ${summary.passCount}, expected 24 for full local set.`);

  const reports = Array.isArray(summary.reports) ? summary.reports : [];
  for (const [device, size] of Object.entries(expectedScreenshotSlots)) {
    const deviceReports = reports.filter(report => report.device === device);
    if (deviceReports.length !== 6) {
      failures.push(`Expected 6 screenshots for ${device}, found ${deviceReports.length}.`);
      continue;
    }

    for (const report of deviceReports) {
      if (report.imageSize?.width !== size.width || report.imageSize?.height !== size.height) {
        failures.push(`${device} ${report.target} has size ${report.imageSize?.width}x${report.imageSize?.height}, expected ${size.width}x${size.height}.`);
      }
      if (report.screenshotPath && !fs.existsSync(path.join(root, report.screenshotPath))) {
        failures.push(`Missing screenshot image from summary: ${report.screenshotPath}`);
      }
    }
  }

  return path.relative(root, summaryPath);
}

function checkWorldVisualSummary(failures) {
  const summaryPath = latestSummaryFile(worldVisualRoot);
  if (!summaryPath) {
    failures.push('No world visual audit summary found. Run npm run audit:worlds.');
    return null;
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  checkReceiptFreshness(summaryPath, worldVisualFreshnessInputs, 'World visual audit', failures);
  if (summary.pass !== true) {
    failures.push(`Latest world visual audit did not pass: ${summaryPath}`);
  }

  if (Array.isArray(summary.failures) && summary.failures.length > 0) {
    failures.push(`Latest world visual audit has failures: ${summary.failures.join('; ')}`);
  }

  const worlds = Array.isArray(summary.worlds) ? summary.worlds : [];
  const seenWorlds = new Set(worlds.map(report => report.world));
  for (const world of expectedWorlds) {
    if (!seenWorlds.has(world)) failures.push(`World visual audit is missing world ${world}.`);
  }

  for (const report of worlds) {
    if (typeof report.screenshotPath !== 'string' || !fs.existsSync(path.join(root, report.screenshotPath))) {
      failures.push(`Missing world visual screenshot from summary: ${report.screenshotPath || `world ${report.world}`}`);
    }
    if (!Number.isFinite(report.nonBlankRatio) || report.nonBlankRatio < (summary.minNonBlankRatio || 0.02)) {
      failures.push(`World ${report.world} capture is below nonblank threshold.`);
    }
  }

  const minPairDistance = Number.isFinite(summary.minPairDistance) ? summary.minPairDistance : 6;
  const pairDistances = Array.isArray(summary.pairDistances) ? summary.pairDistances : [];
  if (pairDistances.length < expectedWorlds.size - 1) {
    failures.push(`World visual audit has ${pairDistances.length} pair distances, expected at least ${expectedWorlds.size - 1}.`);
  }
  for (const pair of pairDistances) {
    if (!Number.isFinite(pair.distance) || pair.distance < minPairDistance) {
      failures.push(`World ${pair.from}-${pair.to} visual distance ${pair.distance} is below ${minPairDistance}.`);
    }
  }

  return path.relative(root, summaryPath);
}

function checkMetricLimit(failures, scenario, name, actual, limit) {
  if (!Number.isFinite(limit) || limit <= 0) return;
  if (!Number.isFinite(actual)) {
    failures.push(`${scenario} performance metric is missing: ${name}`);
    return;
  }
  if (actual > limit) {
    failures.push(`${scenario} performance ${name} ${actual.toFixed(2)}ms exceeds ${limit.toFixed(2)}ms.`);
  }
}

function checkCountLimit(failures, scenario, name, actual, limit) {
  if (!Number.isFinite(limit) || limit <= 0) return;
  if (!Number.isFinite(actual)) return;
  if (actual > limit) {
    failures.push(`${scenario} performance ${name} ${actual} exceeds ${limit}.`);
  }
}

function checkBrowserPerformanceReceipts(failures) {
  const latestMetrics = [];

  for (const scenario of requiredPerformanceScenarios) {
    const metricsPath = latestBrowserSmokeMetrics(scenario);
    if (!metricsPath) {
      failures.push(`No browser performance smoke metrics found for ${scenario}. Run npm run smoke:browser -- --scenario ${scenario} --quality balanced.`);
      continue;
    }

    checkReceiptFreshness(metricsPath, performanceFreshnessInputs, `${scenario} browser performance`, failures);

    const receipt = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const relativeMetricsPath = path.relative(root, metricsPath);
    if (receipt.scenario !== scenario) {
      failures.push(`${scenario} browser performance receipt has mismatched scenario ${receipt.scenario}: ${relativeMetricsPath}`);
    }
    if (receipt.quality !== 'balanced') {
      failures.push(`${scenario} browser performance receipt used ${receipt.quality || 'unknown'} quality, expected balanced: ${relativeMetricsPath}`);
    }

    const screenshotPath = metricsPath.replace(/\.metrics\.json$/, '.png');
    if (!fs.existsSync(screenshotPath) || fs.statSync(screenshotPath).size < 1000) {
      failures.push(`${scenario} browser performance screenshot is missing or empty: ${path.relative(root, screenshotPath)}`);
    }

    const consolePath = metricsPath.replace(/\.metrics\.json$/, '.console.json');
    if (!fs.existsSync(consolePath)) {
      failures.push(`${scenario} browser performance console receipt is missing: ${path.relative(root, consolePath)}`);
    } else {
      const consoleReceipt = JSON.parse(fs.readFileSync(consolePath, 'utf8'));
      const consoleErrors = Array.isArray(consoleReceipt.console)
        ? consoleReceipt.console.filter(message => message.type === 'error')
        : [];
      const pageErrors = Array.isArray(consoleReceipt.pageErrors) ? consoleReceipt.pageErrors : [];
      if (consoleErrors.length > 0 || pageErrors.length > 0) {
        failures.push(`${scenario} browser performance console receipt has ${consoleErrors.length} console errors and ${pageErrors.length} page errors: ${path.relative(root, consolePath)}`);
      }
    }

    const metrics = receipt.metrics;
    if (!metrics) {
      failures.push(`${scenario} browser performance receipt is missing metrics: ${relativeMetricsPath}`);
      continue;
    }

    checkMetricLimit(failures, scenario, 'frame.p95Ms', metrics.frame?.p95Ms, performanceBudgets.frameP95Ms);
    checkMetricLimit(failures, scenario, 'frame.maxMs', metrics.frame?.maxMs, performanceBudgets.frameMaxMs);
    checkMetricLimit(failures, scenario, 'updates.p95Ms', metrics.updates?.p95Ms, performanceBudgets.updateP95Ms);
    checkMetricLimit(failures, scenario, 'droppedBacklog.totalMs', metrics.droppedBacklog?.totalMs, performanceBudgets.droppedBacklogTotalMs);
    checkMetricLimit(failures, scenario, 'droppedBacklog.maxMs', metrics.droppedBacklog?.maxMs, performanceBudgets.droppedBacklogMaxMs);

    if (scenario === 'terrain' || scenario === 'impact') {
      checkMetricLimit(failures, scenario, 'measures.terrainImpact.p95Ms', metrics.measures?.terrainImpact?.p95Ms, performanceBudgets.terrainImpactP95Ms);
    }

    checkCountLimit(failures, scenario, 'gauges.pixiFragments', metrics.gauges?.pixiFragments, performanceBudgets.pixiFragmentsMax);
    checkCountLimit(failures, scenario, 'gauges.particles', metrics.gauges?.particles, performanceBudgets.particlesMax);
    latestMetrics.push(path.relative(root, metricsPath));
  }

  return latestMetrics;
}

function checkXcode(ownerActions, warnings) {
  const xcodePath = '/Applications/Xcode.app/Contents/Developer';
  if (!fs.existsSync(xcodePath)) {
    ownerActions.push('Install Xcode from Apple before native archive/upload.');
    return;
  }

  const version = run('xcodebuild', ['-version'], {
    env: { ...process.env, DEVELOPER_DIR: xcodePath }
  });
  if (version.status !== 0) {
    warnings.push(`Could not read Xcode version: ${(version.stderr || version.stdout).trim()}`);
    return;
  }

  const projectList = run('xcodebuild', ['-list', '-project', 'ios/App/App.xcodeproj'], {
    env: { ...process.env, DEVELOPER_DIR: xcodePath }
  });

  if (projectList.status !== 0) {
    const output = `${projectList.stdout}\n${projectList.stderr}`;
    if (output.includes('license')) {
      ownerActions.push('Accept the Xcode license: sudo xcodebuild -license');
    } else {
      warnings.push(`xcodebuild project listing failed: ${output.trim()}`);
    }
  }
}

function main() {
  const failures = [];
  const warnings = [];
  const ownerActions = [
    'Create/select the App Store Connect app record for bundle ID com.scorched.earth.',
    'Configure signing team/profiles in Xcode.',
    'Archive and upload the native build to TestFlight.',
    'Install from TestFlight on real iPhone and iPad hardware.',
    'Enter final App Store Connect price, availability, age rating, review contact, and legal owner fields.',
    'Upload/select final screenshots in App Store Connect.'
  ];

  checkPackageScripts(failures);
  checkRuntimeConfig(failures, warnings);
  checkRequiredFiles(failures);
  checkNativeWebBundleFreshness(failures);
  const latestSummary = checkScreenshotSummary(failures, warnings);
  const latestWorldSummary = checkWorldVisualSummary(failures);
  const latestPerformanceMetrics = checkBrowserPerformanceReceipts(failures);
  checkXcode(ownerActions, warnings);

  console.log('App Store handoff check');
  console.log('=======================');
  if (latestSummary) console.log(`Latest screenshot summary: ${latestSummary}`);
  if (latestWorldSummary) console.log(`Latest world visual summary: ${latestWorldSummary}`);
  if (latestPerformanceMetrics.length > 0) {
    console.log('Latest browser performance metrics:');
    for (const metricsPath of latestPerformanceMetrics) console.log(`- ${metricsPath}`);
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) console.log(`- ${warning}`);
  }

  if (ownerActions.length > 0) {
    console.log('\nOwner/App Store actions still required:');
    for (const action of [...new Set(ownerActions)]) console.log(`- ${action}`);
  }

  if (failures.length > 0) {
    console.error('\nRepo-side handoff check failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('\nRepo-side handoff artifacts are present.');
}

main();
