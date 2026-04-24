import { describe, expect, it } from 'vitest';
import {
  ASSET_SCALE_POLICIES,
  assertValidAssetMetadata,
  normalizeAssetMetadata,
  validateAssetMetadata
} from '../../js/assetMetadata.js';

describe('assetMetadata', () => {
  it('normalizes a simple image entry with safe defaults', () => {
    const meta = normalizeAssetMetadata('tanks.player', {
      path: 'images/tanks/tank-player.png',
      width: 64,
      height: 32
    });

    expect(meta.errors).toEqual([]);
    expect(meta.scalePolicy).toBe(ASSET_SCALE_POLICIES.SMOOTH);
    expect(meta.anchors.center).toEqual({ x: 32, y: 16 });
    expect(meta.safeBounds).toEqual({ x: 0, y: 0, width: 64, height: 32 });
    expect(meta.frames).toBeNull();
  });

  it('normalizes pivots, named anchors, and generated source metadata', () => {
    const meta = normalizeAssetMetadata('tanks.playerTurret', {
      path: 'images/tanks/tank-player-turret.png',
      width: 28,
      height: 12,
      scalePolicy: 'pixel-perfect',
      pivot: { x: 6, y: 6 },
      anchors: {
        muzzle: { x: 25, y: 6 },
        embeddedBase: { x: 6, y: 6 }
      },
      source: {
        model: 'gpt-image-1.5',
        prompt: 'side-view synthwave tank turret',
        generatedAt: '2026-04-24',
        notes: 'transparent background'
      }
    });

    expect(meta.errors).toEqual([]);
    expect(meta.scalePolicy).toBe('pixel-perfect');
    expect(meta.pivot).toEqual({ x: 6, y: 6 });
    expect(meta.anchors.muzzle).toEqual({ x: 25, y: 6 });
    expect(meta.source.model).toBe('gpt-image-1.5');
  });

  it('normalizes sprite sheet frame metadata', () => {
    const meta = normalizeAssetMetadata('effects.explosionAtlas', {
      path: 'images/effects/explosion-atlas.png',
      width: 512,
      height: 512,
      frames: {
        columns: 4,
        rows: 4,
        count: 16,
        durationMs: 45
      },
      safeBounds: { x: 32, y: 32, width: 448, height: 448 }
    });

    expect(meta.errors).toEqual([]);
    expect(meta.frames).toEqual({
      columns: 4,
      rows: 4,
      count: 16,
      width: 128,
      height: 128,
      durationMs: 45,
      spacing: 0,
      margin: 0
    });
  });

  it('reports invalid frame grids and unsafe bounds', () => {
    const errors = validateAssetMetadata('effects.badAtlas', {
      path: 'images/effects/bad-atlas.png',
      width: 256,
      height: 256,
      frames: {
        columns: 2,
        rows: 2,
        count: 5
      },
      safeBounds: { x: 128, y: 128, width: 256, height: 256 }
    });

    expect(errors).toContain('frames.count cannot exceed columns * rows');
    expect(errors).toContain('safeBounds must fit inside the asset dimensions');
  });

  it('throws for invalid metadata when asserted', () => {
    expect(() => assertValidAssetMetadata('ui.button', {
      path: 'images/ui/ui-button.png',
      width: 0,
      height: 40,
      scalePolicy: 'magic'
    })).toThrow(/Invalid asset metadata/);
  });
});
