#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'assets');
const outputRoot = path.join(projectRoot, 'www', 'assets');
const manifestPath = path.join(sourceRoot, 'manifest.json');

const explicitRuntimeDirs = [
  'audio',
  'icons',
  'levels',
  'tank-designs'
];

const forbiddenSegments = new Set([
  '.DS_Store',
  'references',
  'TextMesh Pro'
]);

function isForbidden(relativePath) {
  return relativePath.split(path.sep).some((segment) => forbiddenSegments.has(segment));
}

function copyFile(relativePath, copiedFiles, missingFiles) {
  if (!relativePath || isForbidden(relativePath)) return;

  const sourcePath = path.join(sourceRoot, relativePath);
  const outputPath = path.join(outputRoot, relativePath);

  if (!fs.existsSync(sourcePath)) {
    missingFiles.add(relativePath);
    return;
  }

  const stat = fs.statSync(sourcePath);
  if (!stat.isFile()) return;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.copyFileSync(sourcePath, outputPath);
  copiedFiles.add(relativePath);
}

function copyDirectory(relativeDir, copiedFiles, missingFiles) {
  const sourceDir = path.join(sourceRoot, relativeDir);
  if (!fs.existsSync(sourceDir)) return;

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (isForbidden(relativePath)) continue;

    if (entry.isDirectory()) {
      copyDirectory(relativePath, copiedFiles, missingFiles);
    } else if (entry.isFile() && entry.name !== '.gitkeep') {
      copyFile(relativePath, copiedFiles, missingFiles);
    }
  }
}

function collectManifestPaths(value, paths = new Set()) {
  if (!value || typeof value !== 'object') return paths;

  if (typeof value.path === 'string') {
    paths.add(value.path);
  }

  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      collectManifestPaths(child, paths);
    }
  }

  return paths;
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing asset manifest: ${manifestPath}`);
  }

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const copiedFiles = new Set();
  const missingFiles = new Set();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  copyFile('manifest.json', copiedFiles, missingFiles);

  for (const assetPath of collectManifestPaths(manifest)) {
    copyFile(assetPath, copiedFiles, missingFiles);
  }

  for (const dir of explicitRuntimeDirs) {
    copyDirectory(dir, copiedFiles, missingFiles);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    copiedFileCount: copiedFiles.size,
    missingManifestFiles: [...missingFiles].sort(),
    excludedClasses: [
      'assets/references',
      'assets/TextMesh Pro',
      '.DS_Store',
      '.gitkeep'
    ],
    runtimeAssetPolicy: {
      manifest: 'all existing assets referenced by assets/manifest.json',
      explicitDirectories: explicitRuntimeDirs,
      sourceOnly: [
        'references',
        'TextMesh Pro',
        'generated source grids and mockups not referenced by manifest'
      ]
    }
  };

  fs.writeFileSync(
    path.join(outputRoot, 'release-assets.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );

  console.log(
    `Copied ${copiedFiles.size} production asset files to ${path.relative(projectRoot, outputRoot)}`
  );

  if (missingFiles.size > 0) {
    console.warn(
      `Skipped ${missingFiles.size} missing manifest asset(s): ${[...missingFiles].sort().join(', ')}`
    );
  }
}

main();
