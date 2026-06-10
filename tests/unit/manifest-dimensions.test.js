import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import manifest from '../../Assets/manifest.json';

const ASSETS_ROOT = path.resolve(__dirname, '../../assets');

function collectImageEntries(node, prefix, out) {
  for (const [key, value] of Object.entries(node)) {
    if (!value || typeof value !== 'object') continue;
    if (typeof value.path === 'string' && /\.(png|webp|jpg|jpeg)$/i.test(value.path)) {
      out.push({ key: prefix ? `${prefix}.${key}` : key, meta: value });
    } else if (!('path' in value)) {
      collectImageEntries(value, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

describe('manifest dimensions match files on disk', () => {
  const entries = collectImageEntries(manifest, '', []).filter(
    entry => Number.isFinite(entry.meta.width) && Number.isFinite(entry.meta.height)
  );

  it('finds image entries to validate', () => {
    expect(entries.length).toBeGreaterThan(50);
  });

  it('every declared width/height matches the actual image', async () => {
    const mismatches = [];

    for (const entry of entries) {
      const filePath = path.join(ASSETS_ROOT, entry.meta.path);
      if (!fs.existsSync(filePath)) {
        mismatches.push(`${entry.key}: missing file ${entry.meta.path}`);
        continue;
      }

      const info = await sharp(filePath).metadata();
      if (info.width !== entry.meta.width || info.height !== entry.meta.height) {
        mismatches.push(
          `${entry.key}: manifest ${entry.meta.width}x${entry.meta.height} != file ${info.width}x${info.height} (${entry.meta.path})`
        );
      }
    }

    expect(mismatches, mismatches.join('\n')).toEqual([]);
  });
});
