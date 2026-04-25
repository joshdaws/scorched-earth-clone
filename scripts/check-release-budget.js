#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'www');

const DEFAULT_TOTAL_BUDGET_BYTES = 15 * 1024 * 1024;
const DEFAULT_JS_CHUNK_BUDGET_BYTES = 1.5 * 1024 * 1024;
const DEFAULT_ASSET_BUDGET_BYTES = 3 * 1024 * 1024;

const totalBudget = Number(process.env.RELEASE_TOTAL_BUDGET_BYTES) || DEFAULT_TOTAL_BUDGET_BYTES;
const jsChunkBudget = Number(process.env.RELEASE_JS_CHUNK_BUDGET_BYTES) || DEFAULT_JS_CHUNK_BUDGET_BYTES;
const assetBudget = Number(process.env.RELEASE_ASSET_BUDGET_BYTES) || DEFAULT_ASSET_BUDGET_BYTES;

const forbiddenPatterns = [
  /(^|\/)\.DS_Store$/,
  /(^|\/)references\//,
  /(^|\/)TextMesh Pro\//,
  /\.map$/
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, files);
    } else if (entry.isFile()) {
      const relativePath = path.relative(outputRoot, absolutePath).split(path.sep).join('/');
      files.push({
        absolutePath,
        relativePath,
        size: fs.statSync(absolutePath).size
      });
    }
  }

  return files;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} kB`;
  }
  return `${bytes} B`;
}

function main() {
  const files = walk(outputRoot);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const violations = [];

  if (totalBytes > totalBudget) {
    violations.push(
      `release output is ${formatBytes(totalBytes)}, over budget ${formatBytes(totalBudget)}`
    );
  }

  for (const file of files) {
    if (forbiddenPatterns.some((pattern) => pattern.test(file.relativePath))) {
      violations.push(`forbidden release file: ${file.relativePath}`);
    }

    if (/^assets\/.*\.(png|jpg|jpeg|webp|avif)$/i.test(file.relativePath) && file.size > assetBudget) {
      violations.push(
        `asset over ${formatBytes(assetBudget)}: ${file.relativePath} (${formatBytes(file.size)})`
      );
    }

    if (/^assets\/.*\.js$/i.test(file.relativePath) && file.size > jsChunkBudget) {
      violations.push(
        `JS chunk over ${formatBytes(jsChunkBudget)}: ${file.relativePath} (${formatBytes(file.size)})`
      );
    }
  }

  const topFiles = [...files]
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .map((file) => `  ${formatBytes(file.size).padStart(9)}  ${file.relativePath}`)
    .join('\n');

  console.log(`Release output: ${formatBytes(totalBytes)} across ${files.length} files`);
  console.log('Largest files:\n' + topFiles);

  if (violations.length > 0) {
    console.error('\nRelease budget violations:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
  }
}

main();
