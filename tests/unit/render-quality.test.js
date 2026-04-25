import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cycleRenderQuality,
  detectDefaultRenderQuality,
  getRenderQualityId,
  getRenderQualityProfile,
  normalizeRenderQualityId,
  onRenderQualityChange,
  resetRenderQualityForTests,
  setRenderQuality
} from '../../js/renderQuality.js';

describe('render quality profiles', () => {
  afterEach(() => {
    resetRenderQualityForTests();
    window.localStorage?.clear();
  });

  it('defaults mobile and iOS environments to balanced quality', () => {
    const iosEnv = {
      navigator: {
        platform: 'MacIntel',
        maxTouchPoints: 5,
        userAgent: 'Safari'
      }
    };
    const androidEnv = {
      navigator: {
        platform: 'Linux armv8',
        maxTouchPoints: 5,
        userAgent: 'Android Mobile'
      }
    };

    expect(detectDefaultRenderQuality(iosEnv)).toBe('balanced');
    expect(detectDefaultRenderQuality(androidEnv)).toBe('balanced');
  });

  it('defaults desktop environments to high quality', () => {
    const desktopEnv = {
      navigator: {
        platform: 'MacIntel',
        maxTouchPoints: 0,
        userAgent: 'Chrome'
      }
    };

    expect(detectDefaultRenderQuality(desktopEnv)).toBe('high');
  });

  it('normalizes unknown ids and exposes profile caps', () => {
    expect(normalizeRenderQualityId('balanced')).toBe('balanced');
    expect(normalizeRenderQualityId('ultra')).toBeNull();
    expect(getRenderQualityProfile('low').maxCanvasDpr).toBe(1);
    expect(getRenderQualityProfile('high').title.bloomEnabled).toBe(true);
    expect(getRenderQualityProfile('low').pixi.derezFilterPass).toBe(false);
    expect(getRenderQualityProfile('balanced').pixi.derezFilterPass).toBe(false);
    expect(getRenderQualityProfile('high').pixi.derezFilterPass).toBe(true);
  });

  it('persists and cycles quality profiles', () => {
    setRenderQuality('low');
    expect(getRenderQualityId()).toBe('low');
    expect(window.localStorage.getItem('scorched_earth_render_quality')).toBe('low');

    cycleRenderQuality();
    expect(getRenderQualityId()).toBe('balanced');
  });

  it('notifies listeners when quality changes', () => {
    const listener = vi.fn();
    const unsubscribe = onRenderQualityChange(listener);

    setRenderQuality('balanced');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: 'balanced' }));

    unsubscribe();
    setRenderQuality('high');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
