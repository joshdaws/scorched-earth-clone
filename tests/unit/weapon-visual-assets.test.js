import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WeaponRegistry } from '../../js/weapons.js';

const manifestPath = path.resolve(process.cwd(), 'assets/manifest.json');

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

describe('weapon visual assets', () => {
  it('provides authored HUD/shop icons for every weapon', () => {
    const manifest = loadManifest();
    const missingIcons = [];
    const missingFiles = [];

    for (const weapon of WeaponRegistry.getAllWeapons()) {
      const entry = manifest.weaponIcons?.[weapon.id];
      if (!entry) {
        missingIcons.push(weapon.id);
        continue;
      }

      const assetPath = path.resolve(process.cwd(), 'assets', entry.path);
      if (!fs.existsSync(assetPath)) {
        missingFiles.push(`${weapon.id}:${entry.path}`);
      }
    }

    expect(missingIcons).toEqual([]);
    expect(missingFiles).toEqual([]);
  });

  it('documents an approved projectile visual path for every weapon', () => {
    const manifest = loadManifest();
    const missingCoverage = [];
    const missingAssetKeys = [];

    for (const weapon of WeaponRegistry.getAllWeapons()) {
      const coverage = manifest.weaponVisuals?.projectileCoverage?.[weapon.id];
      if (!coverage?.approved) {
        missingCoverage.push(weapon.id);
        continue;
      }

      const assetKey = coverage.assetKey;
      const assetEntry = assetKey?.split('.').reduce((node, key) => node?.[key], manifest);
      if (assetKey && !assetEntry) {
        missingAssetKeys.push(`${weapon.id}:${assetKey}`);
      }
    }

    expect(missingCoverage).toEqual([]);
    expect(missingAssetKeys).toEqual([]);
  });
});
