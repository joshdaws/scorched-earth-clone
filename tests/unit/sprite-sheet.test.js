import { describe, expect, it } from 'vitest';
import {
  drawSheetFrameForProgress,
  getFrameIndexForProgress,
  getFrameSourceRect
} from '../../js/spriteSheet.js';

const FRAMES = { columns: 4, rows: 4, count: 16, width: 192, height: 192 };

describe('sprite sheet playback', () => {
  it('maps progress onto clamped frame indices', () => {
    expect(getFrameIndexForProgress(FRAMES, -1)).toBe(0);
    expect(getFrameIndexForProgress(FRAMES, 0)).toBe(0);
    expect(getFrameIndexForProgress(FRAMES, 0.5)).toBe(8);
    expect(getFrameIndexForProgress(FRAMES, 0.999)).toBe(15);
    expect(getFrameIndexForProgress(FRAMES, 1)).toBe(15);
    expect(getFrameIndexForProgress(FRAMES, 2)).toBe(15);
  });

  it('computes grid source rects left-to-right, top-to-bottom', () => {
    expect(getFrameSourceRect(FRAMES, 0)).toEqual({ sx: 0, sy: 0, sw: 192, sh: 192 });
    expect(getFrameSourceRect(FRAMES, 3)).toEqual({ sx: 576, sy: 0, sw: 192, sh: 192 });
    expect(getFrameSourceRect(FRAMES, 4)).toEqual({ sx: 0, sy: 192, sw: 192, sh: 192 });
    expect(getFrameSourceRect(FRAMES, 15)).toEqual({ sx: 576, sy: 576, sw: 192, sh: 192 });
    // Out-of-range indices clamp instead of sampling outside the sheet.
    expect(getFrameSourceRect(FRAMES, 99)).toEqual({ sx: 576, sy: 576, sw: 192, sh: 192 });
  });

  it('honors spacing and margin offsets', () => {
    const padded = { columns: 4, rows: 2, count: 8, width: 100, height: 100, spacing: 4, margin: 2 };
    expect(getFrameSourceRect(padded, 0)).toEqual({ sx: 2, sy: 2, sw: 100, sh: 100 });
    expect(getFrameSourceRect(padded, 5)).toEqual({ sx: 106, sy: 106, sw: 100, sh: 100 });
  });

  it('draws the progress frame centered at the destination', () => {
    const calls = [];
    const ctx = {
      drawImage: (...args) => calls.push(args)
    };
    const image = {};

    const drew = drawSheetFrameForProgress(ctx, image, FRAMES, 0.5, 100, 80, 50, 50);

    expect(drew).toBe(true);
    expect(calls).toHaveLength(1);
    const [img, sx, sy, sw, sh, dx, dy, dw, dh] = calls[0];
    expect(img).toBe(image);
    expect([sx, sy, sw, sh]).toEqual([0, 384, 192, 192]);
    expect([dx, dy, dw, dh]).toEqual([75, 55, 50, 50]);
  });

  it('declines to draw without valid frame metadata', () => {
    const ctx = { drawImage: () => { throw new Error('should not draw'); } };
    expect(drawSheetFrameForProgress(ctx, {}, null, 0.5, 0, 0, 10, 10)).toBe(false);
    expect(drawSheetFrameForProgress(ctx, null, FRAMES, 0.5, 0, 0, 10, 10)).toBe(false);
  });
});
