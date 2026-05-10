import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASSET_GROUPS,
  clearCache,
  extractImageEntries,
  getAssetGroupStatus,
  getLoadedCount,
  isAssetGroupLoaded,
  loadAssetGroup,
  loadManifest
} from '../../js/assets.js';

const manifest = {
  backgrounds: {
    synthwave: { path: 'images/backgrounds/title.png', width: 100, height: 50 },
    gameplay: { path: 'images/backgrounds/gameplay.png', width: 200, height: 100 },
    world3: { path: 'images/backgrounds/world-3.png', width: 200, height: 100, runtimeGroup: 'gameplay' }
  },
  tanks: {
    playerBody: { path: 'images/tanks/player-body.png', width: 64, height: 32 }
  },
  tankSkins: {
    'common-test': { path: 'images/tanks/common-test.png', width: 64, height: 32 }
  },
  tankPortraits: {
    standard: { path: 'images/tanks/portraits/standard.png', width: 640, height: 360, runtimeGroups: ['collection', 'supplyDrop'] }
  },
  supplyDrop: {
    crate: { path: 'images/supply-drop/crate.png', width: 64, height: 64 }
  },
  audio: {
    music: {
      theme: { path: 'audio/music/theme.mp3' }
    }
  }
};

class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.complete = true;
    this.naturalWidth = 1;
    this.naturalHeight = 1;
  }

  set src(value) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }

  get src() {
    return this._src;
  }
}

describe('asset runtime groups', () => {
  beforeEach(() => {
    clearCache();
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => structuredClone(manifest)
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearCache();
  });

  it('extracts image entries with runtime groups and approximate memory', () => {
    const entries = extractImageEntries(structuredClone(manifest));
    const byKey = Object.fromEntries(entries.map(entry => [entry.key, entry]));

    expect(byKey['backgrounds.synthwave'].groups).toEqual([ASSET_GROUPS.TITLE]);
    expect(byKey['backgrounds.gameplay'].groups).toEqual([ASSET_GROUPS.GAMEPLAY]);
    expect(byKey['backgrounds.world3'].groups).toEqual([ASSET_GROUPS.GAMEPLAY]);
    expect(byKey['tankSkins.common-test'].groups).toEqual([ASSET_GROUPS.COLLECTION, ASSET_GROUPS.SHOP]);
    expect(byKey['tankPortraits.standard'].groups).toEqual([ASSET_GROUPS.COLLECTION, ASSET_GROUPS.SUPPLY_DROP]);
    expect(byKey['supplyDrop.crate'].groups).toEqual([ASSET_GROUPS.SUPPLY_DROP]);
    expect(byKey['backgrounds.synthwave'].approxMemoryBytes).toBe(100 * 50 * 4);
    expect(entries.some(entry => entry.key.startsWith('audio.'))).toBe(false);
  });

  it('loads only the requested group and tracks group status', async () => {
    await loadManifest();

    await loadAssetGroup(ASSET_GROUPS.TITLE);

    expect(getLoadedCount()).toBe(1);
    expect(isAssetGroupLoaded(ASSET_GROUPS.TITLE)).toBe(true);
    expect(isAssetGroupLoaded(ASSET_GROUPS.GAMEPLAY)).toBe(false);

    const status = getAssetGroupStatus();
    expect(status[ASSET_GROUPS.TITLE].cached).toBe(1);
    expect(status[ASSET_GROUPS.GAMEPLAY].cached).toBe(0);
    expect(status[ASSET_GROUPS.GAMEPLAY].assets).toBe(3);
  });
});
