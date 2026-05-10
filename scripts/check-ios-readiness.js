#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);

function parseArgs(argv) {
  return {
    skipBuild: argv.includes('--skip-build'),
    skipSync: argv.includes('--skip-sync'),
    help: argv.includes('--help') || argv.includes('-h')
  };
}

function usage() {
  console.log(`Usage:
  npm run ios:check
  npm run ios:check -- --skip-build --skip-sync

Checks web release output, Capacitor/iOS project shape, required icons/splashes,
and runs Capacitor sync unless --skip-sync is provided.
`);
}

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    ...options
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

function assertFile(relativePath, failures) {
  if (!exists(relativePath)) {
    failures.push(`Missing required file: ${relativePath}`);
  }
}

function assertDirectory(relativePath, failures) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    failures.push(`Missing required directory: ${relativePath}`);
  }
}

function collectFiles(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
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
        results.push(path.relative(projectRoot, child));
      }
    }
  }
  return results;
}

function fileHash(relativePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(projectRoot, relativePath)))
    .digest('hex');
}

function readPngDimensions(relativePath) {
  const buffer = fs.readFileSync(path.join(projectRoot, relativePath));
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error(`${relativePath} is not a valid PNG file`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function assertPngDimensions(relativePath, expectedWidth, expectedHeight, failures) {
  if (!exists(relativePath)) return;

  try {
    const dimensions = readPngDimensions(relativePath);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
      failures.push(
        `${relativePath} is ${dimensions.width}x${dimensions.height}, expected ${expectedWidth}x${expectedHeight}`
      );
    }
  } catch (error) {
    failures.push(error.message);
  }
}

function checkCapacitorConfig(failures) {
  assertFile('capacitor.config.json', failures);
  if (!exists('capacitor.config.json')) return;

  const config = readJson('capacitor.config.json');
  if (config.webDir !== 'www') {
    failures.push(`capacitor.config.json webDir must be "www", found "${config.webDir}"`);
  }
  if (!config.appId || !/^[a-zA-Z0-9.-]+$/.test(config.appId)) {
    failures.push('capacitor.config.json appId is missing or invalid');
  }
  if (config.ios?.scrollEnabled !== false) {
    failures.push('capacitor.config.json ios.scrollEnabled should be false for fixed canvas gameplay');
  }
  if (config.ios?.contentInset !== 'automatic') {
    failures.push('capacitor.config.json ios.contentInset should be automatic for safe-area behavior');
  }
}

function checkWebOutput(failures) {
  assertDirectory('www', failures);
  assertFile('www/index.html', failures);
  assertFile('www/privacy.html', failures);
  assertFile('www/support.html', failures);
  assertFile('www/config.js', failures);
  assertFile('www/assets/manifest.json', failures);

  const sourceMaps = collectFiles('www').filter(file => file.endsWith('.map'));
  if (sourceMaps.length > 0) {
    failures.push(`Release www output contains source maps: ${sourceMaps.slice(0, 5).join(', ')}`);
  }
}

function checkIosProject(failures) {
  assertDirectory('ios/App/App.xcodeproj', failures);
  assertFile('ios/App/App.xcodeproj/project.pbxproj', failures);
  assertFile('ios/App/App/Info.plist', failures);
  assertDirectory('ios/App/App/public', failures);
  assertFile('ios/App/App/public/index.html', failures);
  assertFile('ios/App/App/public/privacy.html', failures);
  assertFile('ios/App/App/public/support.html', failures);
  assertFile('ios/App/App/capacitor.config.json', failures);
}

function checkNativeWebBundleFreshness(failures) {
  if (!exists('www') || !exists('ios/App/App/public')) return;

  const webFiles = collectFiles('www').sort();
  for (const webFile of webFiles) {
    const nativeFile = path.join('ios/App/App/public', path.relative('www', webFile));
    if (!exists(nativeFile)) {
      failures.push(`Native iOS web bundle is missing synced file: ${nativeFile}`);
      continue;
    }

    if (fileHash(webFile) !== fileHash(nativeFile)) {
      failures.push(`Native iOS web bundle is stale: ${nativeFile} differs from ${webFile}`);
    }
  }
}

function checkIconsAndSplashes(failures) {
  const requiredWebIcons = [
    ['assets/icons/app-icon-1024.png', 1024, 1024],
    ['assets/icons/app-icon-180.png', 180, 180],
    ['assets/icons/app-icon-120.png', 120, 120],
    ['assets/icons/splash-2732x2732.png', 2732, 2732],
    ['assets/icons/splash-2048x2732.png', 2048, 2732],
    ['assets/icons/splash-1668x2388.png', 1668, 2388],
    ['assets/icons/splash-1125x2436.png', 1125, 2436]
  ];

  for (const [file, width, height] of requiredWebIcons) {
    assertFile(file, failures);
    assertPngDimensions(file, width, height, failures);
  }

  assertFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json', failures);
  assertFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', failures);
  assertPngDimensions('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024, 1024, failures);
  assertFile('ios/App/App/Assets.xcassets/Splash.imageset/Contents.json', failures);

  const splashFiles = collectFiles('ios/App/App/Assets.xcassets/Splash.imageset')
    .filter(file => /\.(png|jpg|jpeg)$/i.test(file));
  if (splashFiles.length === 0) {
    failures.push('iOS Splash.imageset has no bitmap splash image');
  }
  for (const file of splashFiles) {
    assertPngDimensions(file, 2732, 2732, failures);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  if (!args.skipBuild) {
    run('npm', ['run', 'build']);
  } else {
    console.log('Skipping web build by request.');
  }

  const failures = [];
  checkCapacitorConfig(failures);
  checkWebOutput(failures);
  checkIosProject(failures);
  checkIconsAndSplashes(failures);

  if (!args.skipSync) {
    run('npx', ['cap', 'sync', 'ios']);
    checkIosProject(failures);
  } else {
    console.log('Skipping Capacitor sync by request.');
  }

  checkNativeWebBundleFreshness(failures);

  if (failures.length > 0) {
    console.error('\niOS readiness check failed:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log('\niOS readiness check passed.');
}

try {
  main();
} catch (error) {
  console.error(`\niOS readiness check failed: ${error.message}`);
  process.exit(1);
}
