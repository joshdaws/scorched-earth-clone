#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const screenshotRoot = path.join(root, 'artifacts/app-store-screenshots');

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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function latestScreenshotSummary() {
  if (!fs.existsSync(screenshotRoot)) return null;

  const candidates = fs.readdirSync(screenshotRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(screenshotRoot, entry.name, 'summary.json'))
    .filter(file => fs.existsSync(file))
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

function checkPackageScripts(failures) {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};
  for (const script of ['check', 'build', 'ios:check', 'screenshots:app-store', 'open:ios']) {
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

function checkScreenshotSummary(failures, warnings) {
  const summaryPath = latestScreenshotSummary();
  if (!summaryPath) {
    failures.push('No App Store screenshot summary found. Run npm run screenshots:app-store.');
    return null;
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
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
  const latestSummary = checkScreenshotSummary(failures, warnings);
  checkXcode(ownerActions, warnings);

  console.log('App Store handoff check');
  console.log('=======================');
  if (latestSummary) console.log(`Latest screenshot summary: ${latestSummary}`);

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
