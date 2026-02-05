/**
 * Tank Forge runtime helpers.
 */

import {
    TANK_CANVAS,
    normalizeTankDesign
} from './tank-design-schema.js';
import {
    PLAYER_RUNTIME_OVERRIDE_KEY,
    getActiveTankDesignFromStore,
    getRuntimeTankDesignOverride,
    setRuntimeTankDesignOverride
} from './tank-design-store.js';

const FALLBACK_TURRET_ANCHOR = {
    anchorX: 32,
    anchorY: 8,
    baseRadius: 8
};

const COMPOSITE_MAP = {
    normal: 'source-over',
    add: 'lighter',
    screen: 'screen',
    multiply: 'multiply'
};

const spriteCache = new Map();

function nowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

function makeCanvas(width, height) {
    if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
    }

    return null;
}

function clearSpriteCacheForSkin(skinId) {
    const keys = Array.from(spriteCache.keys());
    keys.forEach((cacheKey) => {
        if (cacheKey.startsWith(`${skinId}:`)) {
            spriteCache.delete(cacheKey);
        }
    });
}

function hexToRgba(hex, alpha = 1) {
    if (typeof hex !== 'string') {
        return `rgba(0,255,255,${alpha})`;
    }

    const sanitized = hex.replace('#', '');
    if (sanitized.length !== 6) {
        return `rgba(0,255,255,${alpha})`;
    }

    const r = parseInt(sanitized.slice(0, 2), 16);
    const g = parseInt(sanitized.slice(2, 4), 16);
    const b = parseInt(sanitized.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function getPaletteColor(design, index, fallback = '#00ffff') {
    if (!Array.isArray(design.palette)) return fallback;
    return design.palette[index] || fallback;
}

function drawHullPreset(ctx, design) {
    const hullColor = getPaletteColor(design, 0, '#1f2937');
    const accent = getPaletteColor(design, 1, '#10b981');

    ctx.fillStyle = hullColor;

    switch (design.parts.hullPreset) {
        case 'wedge': {
            ctx.beginPath();
            ctx.moveTo(9, 22);
            ctx.lineTo(52, 22);
            ctx.lineTo(45, 12);
            ctx.lineTo(14, 12);
            ctx.closePath();
            ctx.fill();
            break;
        }

        case 'heavy': {
            ctx.fillRect(8, 12, 48, 12);
            ctx.fillRect(14, 8, 32, 6);
            break;
        }

        case 'scout': {
            ctx.fillRect(10, 14, 44, 9);
            ctx.fillRect(20, 9, 22, 5);
            break;
        }

        case 'standard':
        default: {
            ctx.fillRect(8, 12, 48, 10);
            ctx.fillRect(17, 8, 30, 5);
            break;
        }
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 12.5, 47, 10);
}

function drawTreadsPreset(ctx, design) {
    const treadColor = getPaletteColor(design, 2, '#374151');
    const glowColor = getPaletteColor(design, 3, '#60a5fa');

    ctx.fillStyle = treadColor;

    switch (design.parts.treadPreset) {
        case 'segmented': {
            ctx.fillRect(6, 23, 52, 6);
            ctx.fillStyle = glowColor;
            for (let x = 8; x <= 54; x += 6) {
                ctx.fillRect(x, 24, 2, 4);
            }
            break;
        }

        case 'hover': {
            ctx.fillRect(10, 24, 44, 3);
            ctx.fillStyle = hexToRgba(glowColor, 0.45);
            ctx.fillRect(8, 27, 48, 2);
            break;
        }

        case 'spiked': {
            ctx.fillRect(6, 23, 52, 6);
            ctx.fillStyle = glowColor;
            for (let x = 7; x <= 56; x += 5) {
                ctx.beginPath();
                ctx.moveTo(x, 23);
                ctx.lineTo(x + 2, 20);
                ctx.lineTo(x + 4, 23);
                ctx.closePath();
                ctx.fill();
            }
            break;
        }

        case 'classic':
        default: {
            ctx.fillRect(6, 23, 52, 6);
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(6.5, 23.5, 51, 5);
            break;
        }
    }
}

function drawWheelPreset(ctx, design) {
    if (!design.parts.wheelPreset) return;

    const wheelColor = getPaletteColor(design, 4, '#f59e0b');
    ctx.fillStyle = wheelColor;

    switch (design.parts.wheelPreset) {
        case 'dual':
            [14, 24, 34, 44, 54].forEach((x) => {
                ctx.beginPath();
                ctx.arc(x, 26, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });
            break;

        case 'heavy':
            [16, 32, 48].forEach((x) => {
                ctx.beginPath();
                ctx.arc(x, 26, 2, 0, Math.PI * 2);
                ctx.fill();
            });
            break;

        case 'micro':
            for (let x = 12; x <= 52; x += 4) {
                ctx.fillRect(x, 25, 1, 2);
            }
            break;

        default:
            break;
    }
}

function drawBarrelPreset(ctx, design) {
    const barrelColor = getPaletteColor(design, 1, '#10b981');
    const accent = getPaletteColor(design, 3, '#60a5fa');

    ctx.fillStyle = barrelColor;

    switch (design.parts.barrelPreset) {
        case 'heavy':
            ctx.fillRect(40, 9, 18, 4);
            ctx.fillStyle = accent;
            ctx.fillRect(54, 8, 5, 6);
            break;

        case 'needle':
            ctx.fillRect(40, 10, 20, 2);
            ctx.fillStyle = accent;
            ctx.fillRect(57, 9, 3, 4);
            break;

        case 'split':
            ctx.fillRect(40, 9, 17, 1);
            ctx.fillRect(40, 12, 17, 1);
            ctx.fillStyle = accent;
            ctx.fillRect(55, 9, 5, 4);
            break;

        case 'standard':
        default:
            ctx.fillRect(40, 9, 18, 3);
            ctx.fillStyle = accent;
            ctx.fillRect(55, 8, 5, 5);
            break;
    }
}

function decodePixels(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((entry) => {
                if (!entry || typeof entry !== 'object') return null;
                if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) return null;
                if (typeof entry.color !== 'string' || !entry.color) return null;
                return {
                    x: Math.round(entry.x),
                    y: Math.round(entry.y),
                    color: entry.color
                };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

function drawLayerPixels(ctx, layer) {
    const pixels = decodePixels(layer.pixels);
    if (pixels.length === 0) return;

    ctx.globalCompositeOperation = COMPOSITE_MAP[layer.blend] || 'source-over';

    for (const px of pixels) {
        if (px.x < 0 || px.x >= TANK_CANVAS.WIDTH || px.y < 0 || px.y >= TANK_CANVAS.HEIGHT) {
            continue;
        }

        ctx.fillStyle = px.color;
        ctx.fillRect(px.x, px.y, 1, 1);
    }

    ctx.globalCompositeOperation = 'source-over';
}

function drawSpriteEffects(ctx, design, timeMs) {
    if (!Array.isArray(design.effects) || design.effects.length === 0) return;

    const t = timeMs / 1000;

    design.effects.forEach((effect) => {
        const intensity = Math.max(0, Math.min(1.5, Number(effect.intensity ?? 0.5)));
        const speed = Math.max(0.1, Math.min(8, Number(effect.speed ?? 1)));
        const wave = 0.5 + 0.5 * Math.sin(t * speed * Math.PI * 2);
        const color = effect.color || '#00ffff';

        switch (effect.type) {
            case 'neonPulse': {
                ctx.strokeStyle = hexToRgba(color, 0.2 + wave * 0.4 * intensity);
                ctx.lineWidth = 1;
                ctx.strokeRect(7.5, 7.5, 49, 20);
                break;
            }

            case 'laserStripe': {
                ctx.fillStyle = hexToRgba(color, 0.3 + wave * 0.4);
                ctx.fillRect(8, 16 + Math.round(wave * 4), 48, 1);
                break;
            }

            case 'plasmaVent': {
                ctx.fillStyle = hexToRgba(color, 0.25 + wave * 0.35);
                for (let i = 0; i < 3; i++) {
                    const x = 18 + i * 14;
                    const y = 10 + Math.round(Math.sin((t * speed) + i) * 2);
                    ctx.beginPath();
                    ctx.arc(x, y, 1 + intensity, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }

            case 'scanline': {
                ctx.strokeStyle = hexToRgba(color, 0.12 + intensity * 0.2);
                for (let y = 8; y <= 26; y += 3) {
                    ctx.beginPath();
                    ctx.moveTo(8, y);
                    ctx.lineTo(56, y);
                    ctx.stroke();
                }
                break;
            }

            case 'sparkArc': {
                ctx.strokeStyle = hexToRgba(color, 0.2 + wave * 0.35);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(10, 13);
                ctx.quadraticCurveTo(28, 4 + wave * 4, 54, 12);
                ctx.stroke();
                break;
            }

            default:
                break;
        }
    });
}

/**
 * Compile a design payload into a sprite canvas.
 * @param {unknown} inputDesign
 * @param {number} [timeMs]
 * @returns {HTMLCanvasElement|OffscreenCanvas|null}
 */
export function compileTankDesignToCanvas(inputDesign, timeMs = nowMs()) {
    const design = normalizeTankDesign(inputDesign);
    const canvas = makeCanvas(TANK_CANVAS.WIDTH, TANK_CANVAS.HEIGHT);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, TANK_CANVAS.WIDTH, TANK_CANVAS.HEIGHT);

    drawHullPreset(ctx, design);
    drawTreadsPreset(ctx, design);
    drawWheelPreset(ctx, design);
    drawBarrelPreset(ctx, design);

    design.layers
        .filter((layer) => layer.visible !== false)
        .forEach((layer) => {
            drawLayerPixels(ctx, layer);
        });

    drawSpriteEffects(ctx, design, timeMs);

    return canvas;
}

/**
 * Resolve active design for a skin ID.
 * @param {string} skinId
 * @returns {object|null}
 */
export function getActiveTankDesign(skinId) {
    return getActiveTankDesignFromStore(skinId);
}

/**
 * Resolve turret anchor for a skin, with default fallback.
 * @param {string} skinId
 * @returns {{anchorX:number, anchorY:number, baseRadius:number}}
 */
export function getTurretAnchorForSkin(skinId) {
    const design = getActiveTankDesignFromStore(skinId);
    if (!design || !design.turret) {
        const playerRuntime = getRuntimeTankDesignOverride(PLAYER_RUNTIME_OVERRIDE_KEY);
        if (playerRuntime?.turret) {
            return {
                anchorX: playerRuntime.turret.anchorX,
                anchorY: playerRuntime.turret.anchorY,
                baseRadius: playerRuntime.turret.baseRadius || FALLBACK_TURRET_ANCHOR.baseRadius
            };
        }

        return { ...FALLBACK_TURRET_ANCHOR };
    }

    return {
        anchorX: design.turret.anchorX,
        anchorY: design.turret.anchorY,
        baseRadius: design.turret.baseRadius || FALLBACK_TURRET_ANCHOR.baseRadius
    };
}

/**
 * Compile active design for a skin with lightweight caching.
 * @param {string} skinId
 * @param {number} [timeMs]
 * @returns {HTMLCanvasElement|OffscreenCanvas|null}
 */
export function getCompiledTankCanvasForSkin(skinId, timeMs = nowMs()) {
    const design = getActiveTankDesignFromStore(skinId);
    if (!design) {
        const playerRuntime = getRuntimeTankDesignOverride(PLAYER_RUNTIME_OVERRIDE_KEY);
        if (!playerRuntime) return null;

        const runtimeBucket = Math.floor(timeMs / 75);
        const runtimeCacheKey = `${PLAYER_RUNTIME_OVERRIDE_KEY}:${runtimeBucket}`;
        if (spriteCache.has(runtimeCacheKey)) {
            return spriteCache.get(runtimeCacheKey);
        }

        const runtimeCanvas = compileTankDesignToCanvas(playerRuntime, timeMs);
        if (runtimeCanvas) {
            spriteCache.set(runtimeCacheKey, runtimeCanvas);
        }
        return runtimeCanvas;
    }

    const animationBucket = Math.floor(timeMs / 75);
    const cacheKey = `${skinId}:${animationBucket}`;
    if (spriteCache.has(cacheKey)) {
        return spriteCache.get(cacheKey);
    }

    const canvas = compileTankDesignToCanvas(design, timeMs);
    if (canvas) {
        clearSpriteCacheForSkin(skinId);
        spriteCache.set(cacheKey, canvas);
    }

    return canvas;
}

/**
 * Apply runtime override for a skin.
 * @param {string} skinId
 * @param {unknown|null} design
 * @returns {{success:boolean, errors?:string[]}}
 */
export function setRuntimeTankDesign(skinId, design) {
    const result = setRuntimeTankDesignOverride(skinId, design);
    if (result.success) {
        clearSpriteCacheForSkin(skinId);
        clearSpriteCacheForSkin(PLAYER_RUNTIME_OVERRIDE_KEY);
    }
    return result;
}

/**
 * Default fallback anchor used by legacy tanks.
 */
export function getDefaultTurretAnchor() {
    return { ...FALLBACK_TURRET_ANCHOR };
}
