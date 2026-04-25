/**
 * Central render quality profiles for desktop, mobile, and iOS.
 */

export const RENDER_QUALITY_STORAGE_KEY = 'scorched_earth_render_quality';

export const RENDER_QUALITY_PROFILES = {
    low: {
        id: 'low',
        label: 'LOW',
        maxCanvasDpr: 1,
        crt: {
            chromaticAberrationEnabled: false,
            vhsNoiseEnabled: false,
            vhsGlitchEnabled: false,
            phosphorGlowEnabled: false,
            scanlineOpacity: 0.16,
            vignetteIntensity: 0.38
        },
        title: {
            maxPixelRatio: 1,
            targetFps: 30,
            bloomEnabled: false,
            bloomStrength: 0,
            chunkCount: 10,
            resX: 34
        },
        pixi: {
            maxFragments: 280,
            maxSpawnCells: 120,
            derezFilterPass: false,
            sweepMaxCells: 0,
            maxSweeps: 0,
            scanlineNoise: 0
        }
    },
    balanced: {
        id: 'balanced',
        label: 'BALANCED',
        maxCanvasDpr: 1.5,
        crt: {
            chromaticAberrationEnabled: true,
            chromaticAlpha: 0.045,
            chromaticOffset: 2,
            vhsNoiseEnabled: false,
            vhsGlitchEnabled: true,
            vhsGlitchChance: 0.0015,
            phosphorGlowEnabled: true,
            phosphorGlowIntensity: 0.06,
            scanlineOpacity: 0.2,
            vignetteIntensity: 0.46
        },
        title: {
            maxPixelRatio: 1.25,
            targetFps: 30,
            bloomEnabled: true,
            bloomStrength: 0.75,
            chunkCount: 14,
            resX: 42
        },
        pixi: {
            maxFragments: 420,
            maxSpawnCells: 170,
            derezFilterPass: true,
            sweepMaxCells: 72,
            maxSweeps: 2,
            scanlineNoise: 0.13
        }
    },
    high: {
        id: 'high',
        label: 'HIGH',
        maxCanvasDpr: 2,
        crt: {
            chromaticAberrationEnabled: true,
            vhsNoiseEnabled: true,
            vhsGlitchEnabled: true,
            phosphorGlowEnabled: true,
            scanlineOpacity: 0.25,
            vignetteIntensity: 0.55
        },
        title: {
            maxPixelRatio: 2,
            targetFps: 60,
            bloomEnabled: true,
            bloomStrength: 1.3,
            chunkCount: 18,
            resX: 50
        },
        pixi: {
            maxFragments: 520,
            maxSpawnCells: 220,
            derezFilterPass: true,
            sweepMaxCells: 96,
            maxSweeps: 3,
            scanlineNoise: 0.18
        }
    }
};

export const RENDER_QUALITY_ORDER = ['low', 'balanced', 'high'];

let currentQualityId = null;
const listeners = new Set();

function hasStorage(storage) {
    return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function';
}

function getStorage(environment = globalThis) {
    try {
        return environment?.localStorage ?? null;
    } catch (_error) {
        return null;
    }
}

export function normalizeRenderQualityId(id) {
    return Object.prototype.hasOwnProperty.call(RENDER_QUALITY_PROFILES, id) ? id : null;
}

export function detectDefaultRenderQuality(environment = globalThis) {
    const userAgent = String(environment?.navigator?.userAgent ?? '');
    const platform = String(environment?.navigator?.platform ?? '');
    const maxTouchPoints = Number(environment?.navigator?.maxTouchPoints ?? 0);
    const capacitorPlatform = environment?.Capacitor?.getPlatform?.();
    const isIOS = /iPad|iPhone|iPod/.test(platform) ||
        (platform === 'MacIntel' && maxTouchPoints > 1) ||
        capacitorPlatform === 'ios';
    const isMobile = isIOS || /Android|Mobile|Tablet/i.test(userAgent) || capacitorPlatform === 'android';

    return isMobile ? 'balanced' : 'high';
}

function readStoredQuality(environment = globalThis) {
    const storage = getStorage(environment);
    if (!hasStorage(storage)) return null;

    try {
        return normalizeRenderQualityId(storage.getItem(RENDER_QUALITY_STORAGE_KEY));
    } catch (_error) {
        return null;
    }
}

function persistQuality(id, environment = globalThis) {
    const storage = getStorage(environment);
    if (!hasStorage(storage)) return;

    try {
        storage.setItem(RENDER_QUALITY_STORAGE_KEY, id);
    } catch (_error) {
        // Quality persistence is optional.
    }
}

function ensureQualityId(environment = globalThis) {
    if (currentQualityId) return currentQualityId;

    currentQualityId = readStoredQuality(environment) ?? detectDefaultRenderQuality(environment);
    return currentQualityId;
}

export function getRenderQualityId() {
    return ensureQualityId();
}

export function getRenderQualityProfile(id = getRenderQualityId()) {
    return RENDER_QUALITY_PROFILES[normalizeRenderQualityId(id) ?? detectDefaultRenderQuality()];
}

export function setRenderQuality(id, { persist = true } = {}) {
    const normalizedId = normalizeRenderQualityId(id);
    if (!normalizedId) {
        throw new Error(`Unknown render quality profile: ${id}`);
    }

    if (normalizedId === currentQualityId) {
        return getRenderQualityProfile(normalizedId);
    }

    currentQualityId = normalizedId;
    if (persist) {
        persistQuality(normalizedId);
    }

    const profile = getRenderQualityProfile(normalizedId);
    for (const listener of listeners) {
        try {
            listener(profile);
        } catch (error) {
            console.error('[RenderQuality] listener failed:', error);
        }
    }

    console.log(`[RenderQuality] ${profile.label}`);
    return profile;
}

export function cycleRenderQuality() {
    const currentIndex = RENDER_QUALITY_ORDER.indexOf(getRenderQualityId());
    const nextIndex = (currentIndex + 1) % RENDER_QUALITY_ORDER.length;
    return setRenderQuality(RENDER_QUALITY_ORDER[nextIndex]);
}

export function onRenderQualityChange(listener) {
    if (typeof listener !== 'function') {
        return () => {};
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getRenderQualitySummary() {
    const profile = getRenderQualityProfile();
    return {
        id: profile.id,
        label: profile.label,
        maxCanvasDpr: profile.maxCanvasDpr,
        title: { ...profile.title },
        crt: { ...profile.crt },
        pixi: { ...profile.pixi }
    };
}

export function resetRenderQualityForTests(id = null) {
    currentQualityId = normalizeRenderQualityId(id);
    listeners.clear();
}
