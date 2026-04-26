import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const manifestPath = path.resolve(process.cwd(), 'assets/manifest.json');

function collectManifestPaths(value, paths = []) {
  if (!value || typeof value !== 'object') {
    return paths;
  }

  if (typeof value.path === 'string') {
    paths.push(value.path);
  }

  for (const child of Object.values(value)) {
    collectManifestPaths(child, paths);
  }

  return paths;
}

describe('asset manifest files', () => {
  it('points every runtime manifest path at an existing asset file', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const missingPaths = collectManifestPaths(manifest)
      .filter((assetPath) => !fs.existsSync(path.resolve(process.cwd(), 'assets', assetPath)));

    expect(missingPaths).toEqual([]);
  });
});
