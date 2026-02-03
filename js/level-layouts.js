/**
 * Level layout runtime and editor helpers.
 *
 * Terrain shape and tank spawn placement for level mode are sourced from
 * assets/levels/layouts.v1.json.
 */

import { CANVAS, TANK } from './constants.js';
import { LevelRegistry } from './levels.js';
import { Terrain } from './terrain.js';
import committedLayouts from '../Assets/levels/layouts.v1.json';
import {
    DEFAULT_LEVEL_LAYOUT_GLOBAL,
    DEFAULT_LEVEL_LAYOUT_SAMPLE_COUNT,
    clamp01,
    createBaselineSlotLayout,
    resampleArray
} from './level-layouts-baseline.js';

export const LEVEL_LAYOUT_VERSION = 1;
export const LEVEL_LAYOUT_DRAFT_STORAGE_KEY = 'scorched_earth_level_editor_drafts_v1';

const BASE_GENERATED_FROM = 'levels.js';
const ALL_LEVEL_IDS = LevelRegistry.getAllLevels().map(level => level.id);
const ALL_LEVEL_ID_SET = new Set(ALL_LEVEL_IDS);

/**
 * Clone a slot layout object.
 * @param {{terrainSamples: number[], enemyXNorm: number}} slot - Slot layout
 * @returns {{terrainSamples: number[], enemyXNorm: number}}
 */
function cloneSlotLayout(slot) {
    return {
        terrainSamples: [...slot.terrainSamples],
        enemyXNorm: slot.enemyXNorm
    };
}

/**
 * Clamp level IDs to known slot IDs.
 * @param {string} levelId - Level ID
 * @returns {boolean}
 */
function isKnownLevelId(levelId) {
    return ALL_LEVEL_ID_SET.has(levelId);
}

/**
 * Coerce sample count to a safe positive integer.
 * @param {number} maybeSampleCount - Candidate sample count
 * @returns {number}
 */
function normalizeSampleCount(maybeSampleCount) {
    const sampleCount = Number.isFinite(maybeSampleCount)
        ? Math.floor(maybeSampleCount)
        : DEFAULT_LEVEL_LAYOUT_SAMPLE_COUNT;

    return Math.max(2, sampleCount);
}

/**
 * Normalize global config with defaults.
 * @param {object} globalConfig - Candidate global config
 * @returns {{playerAnchorXNorm: number, minSlingClearancePx: number, autoFixRadiusPx: number}}
 */
function normalizeGlobalConfig(globalConfig = {}) {
    return {
        playerAnchorXNorm: clamp01(
            typeof globalConfig.playerAnchorXNorm === 'number'
                ? globalConfig.playerAnchorXNorm
                : DEFAULT_LEVEL_LAYOUT_GLOBAL.playerAnchorXNorm
        ),
        minSlingClearancePx: Number.isFinite(globalConfig.minSlingClearancePx)
            ? Math.max(0, globalConfig.minSlingClearancePx)
            : DEFAULT_LEVEL_LAYOUT_GLOBAL.minSlingClearancePx,
        autoFixRadiusPx: Number.isFinite(globalConfig.autoFixRadiusPx)
            ? Math.max(0, globalConfig.autoFixRadiusPx)
            : DEFAULT_LEVEL_LAYOUT_GLOBAL.autoFixRadiusPx
    };
}

/**
 * Normalize slot layout shape and values.
 * @param {string} levelId - Level ID
 * @param {object|null} slot - Candidate slot data
 * @param {number} sampleCount - Expected sample count
 * @param {object} [options] - Normalization options
 * @param {boolean} [options.warnOnFallback=false] - Log warning if fallback baseline is used
 * @returns {{terrainSamples: number[], enemyXNorm: number}}
 */
function normalizeSlotLayout(levelId, slot, sampleCount, options = {}) {
    const expectedSamples = normalizeSampleCount(sampleCount);
    const warnOnFallback = options.warnOnFallback === true;
    let fallback = null;
    let didWarn = false;

    const getFallback = (reason = 'slot data missing or invalid') => {
        if (warnOnFallback && !didWarn) {
            console.warn(
                `[LevelLayouts] ${reason} for ${levelId}; regenerating deterministic baseline.`
            );
            didWarn = true;
        }

        if (fallback) return fallback;
        fallback = createBaselineSlotLayout(levelId, LevelRegistry.getLevel(levelId), {
            sampleCount: expectedSamples,
            width: CANVAS.DESIGN_WIDTH,
            height: CANVAS.DESIGN_HEIGHT
        });
        return fallback;
    };

    if (!slot || typeof slot !== 'object') {
        return getFallback('Missing slot layout');
    }

    if (!Array.isArray(slot.terrainSamples) || slot.terrainSamples.length === 0) {
        return getFallback('Corrupt terrainSamples');
    }

    const hasInvalidSample = slot.terrainSamples.some(value => !Number.isFinite(value));
    if (hasInvalidSample) {
        return getFallback('Corrupt terrainSamples');
    }

    if (!Number.isFinite(slot.enemyXNorm)) {
        return getFallback('Corrupt enemyXNorm');
    }

    const incomingSamples = slot.terrainSamples.map(value => clamp01(value));
    const terrainSamples = incomingSamples.length === expectedSamples
        ? incomingSamples
        : resampleArray(incomingSamples, expectedSamples).map(clamp01);

    const enemyXNorm = clamp01(slot.enemyXNorm);

    return {
        terrainSamples,
        enemyXNorm
    };
}

/**
 * Build runtime payload from imported committed JSON.
 * @param {object} source - Imported payload candidate
 * @returns {{version: number, meta: object, global: object, slots: Record<string, {terrainSamples:number[], enemyXNorm:number}>}}
 */
function buildRuntimePayload(source) {
    const sourcePayload = source && typeof source === 'object' ? source : {};
    const sourceMeta = sourcePayload.meta && typeof sourcePayload.meta === 'object'
        ? sourcePayload.meta
        : {};

    const sampleCount = normalizeSampleCount(sourceMeta.sampleCount);
    const global = normalizeGlobalConfig(sourcePayload.global);

    const slots = {};
    const sourceSlots = sourcePayload.slots && typeof sourcePayload.slots === 'object'
        ? sourcePayload.slots
        : {};

    for (const levelId of ALL_LEVEL_IDS) {
        slots[levelId] = normalizeSlotLayout(levelId, sourceSlots[levelId], sampleCount, {
            warnOnFallback: true
        });
    }

    return {
        version: LEVEL_LAYOUT_VERSION,
        meta: {
            sampleCount,
            generatedFrom: BASE_GENERATED_FROM,
            generatedAt: typeof sourceMeta.generatedAt === 'string'
                ? sourceMeta.generatedAt
                : new Date(0).toISOString()
        },
        global,
        slots
    };
}

const RUNTIME_LAYOUTS = buildRuntimePayload(committedLayouts);

/**
 * Get all level slot IDs.
 * @returns {string[]}
 */
export function getAllLevelIds() {
    return [...ALL_LEVEL_IDS];
}

/**
 * Get level layout sample count.
 * @returns {number}
 */
export function getLayoutSampleCount() {
    return RUNTIME_LAYOUTS.meta.sampleCount;
}

/**
 * Get a copy of global layout config.
 * @returns {{playerAnchorXNorm: number, minSlingClearancePx: number, autoFixRadiusPx: number}}
 */
export function getGlobalLayoutConfig() {
    return { ...RUNTIME_LAYOUTS.global };
}

/**
 * Get full committed layout payload.
 * @returns {{version:number, meta:object, global:object, slots:Record<string, {terrainSamples:number[], enemyXNorm:number}>}}
 */
export function getCommittedLayoutsPayload() {
    const slots = {};
    for (const levelId of ALL_LEVEL_IDS) {
        slots[levelId] = cloneSlotLayout(RUNTIME_LAYOUTS.slots[levelId]);
    }

    return {
        version: RUNTIME_LAYOUTS.version,
        meta: { ...RUNTIME_LAYOUTS.meta },
        global: { ...RUNTIME_LAYOUTS.global },
        slots
    };
}

/**
 * Get one slot layout with optional override.
 * @param {string} levelId - Level ID
 * @param {object} [options] - Optional overrides
 * @param {{terrainSamples:number[], enemyXNorm:number}} [options.slotOverride] - Slot override
 * @param {number} [options.sampleCount] - Explicit sample count for returned layout
 * @returns {{terrainSamples: number[], enemyXNorm: number}}
 */
export function getSlotLayout(levelId, options = {}) {
    if (!isKnownLevelId(levelId)) {
        throw new Error(`Unknown level slot: ${levelId}`);
    }

    const sampleCount = normalizeSampleCount(options.sampleCount || RUNTIME_LAYOUTS.meta.sampleCount);

    if (options.slotOverride) {
        return normalizeSlotLayout(levelId, options.slotOverride, sampleCount);
    }

    return normalizeSlotLayout(levelId, RUNTIME_LAYOUTS.slots[levelId], sampleCount);
}

/**
 * Calculate player center clearance from bottom of screen for a slot.
 * @param {{terrainSamples:number[]}} slotLayout - Slot layout
 * @param {number} playerAnchorXNorm - Anchor x (normalized)
 * @param {number} canvasHeight - Canvas height
 * @returns {{clearancePx: number, anchorIndex: number, terrainHeightNorm: number}}
 */
function getPlayerClearance(slotLayout, playerAnchorXNorm, canvasHeight) {
    const sampleCount = slotLayout.terrainSamples.length;
    const anchorIndex = Math.max(0, Math.min(sampleCount - 1, Math.round(playerAnchorXNorm * (sampleCount - 1))));
    const terrainHeightNorm = clamp01(slotLayout.terrainSamples[anchorIndex]);

    // Tank center = terrainHeight + half tank sprite from bottom.
    const clearancePx = terrainHeightNorm * canvasHeight + (TANK.HEIGHT / 2);

    return {
        clearancePx,
        anchorIndex,
        terrainHeightNorm
    };
}

/**
 * Enforce minimum slingshot clearance near the player anchor.
 * Applies a local raise/smooth operation if the anchor region is too low.
 *
 * @param {{terrainSamples:number[], enemyXNorm:number}} slotLayout - Slot layout to check
 * @param {{playerAnchorXNorm:number, minSlingClearancePx:number, autoFixRadiusPx:number}} [globalConfig] - Global config
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} [canvasWidth=1200] - Canvas width in pixels
 * @returns {{slotLayout:{terrainSamples:number[], enemyXNorm:number}, modified:boolean, beforeClearancePx:number, afterClearancePx:number, requiredClearancePx:number, requiredTerrainHeightNorm:number}}
 */
export function enforcePlayerSlingGuardrail(
    slotLayout,
    globalConfig = RUNTIME_LAYOUTS.global,
    canvasHeight,
    canvasWidth = CANVAS.DESIGN_WIDTH
) {
    const safeHeight = Math.max(1, canvasHeight || CANVAS.DESIGN_HEIGHT);
    const safeWidth = Math.max(2, canvasWidth || CANVAS.DESIGN_WIDTH);
    const normalizedGlobal = normalizeGlobalConfig(globalConfig);

    const source = {
        terrainSamples: Array.isArray(slotLayout?.terrainSamples)
            ? [...slotLayout.terrainSamples].map(clamp01)
            : new Array(getLayoutSampleCount()).fill(0),
        enemyXNorm: clamp01(typeof slotLayout?.enemyXNorm === 'number' ? slotLayout.enemyXNorm : 0.8)
    };

    const before = getPlayerClearance(source, normalizedGlobal.playerAnchorXNorm, safeHeight);
    const requiredClearancePx = normalizedGlobal.minSlingClearancePx;
    const requiredTerrainHeightNorm = clamp01((requiredClearancePx - (TANK.HEIGHT / 2)) / safeHeight);

    if (before.clearancePx >= requiredClearancePx) {
        return {
            slotLayout: source,
            modified: false,
            beforeClearancePx: before.clearancePx,
            afterClearancePx: before.clearancePx,
            requiredClearancePx,
            requiredTerrainHeightNorm
        };
    }

    const corrected = cloneSlotLayout(source);
    const sampleCount = corrected.terrainSamples.length;
    const radiusSamples = Math.max(
        1,
        Math.round((normalizedGlobal.autoFixRadiusPx / Math.max(1, safeWidth - 1)) * (sampleCount - 1))
    );

    const deficitNorm = Math.max(0, requiredTerrainHeightNorm - before.terrainHeightNorm);

    for (let i = Math.max(0, before.anchorIndex - radiusSamples); i <= Math.min(sampleCount - 1, before.anchorIndex + radiusSamples); i++) {
        const distanceNorm = Math.abs(i - before.anchorIndex) / radiusSamples;
        if (distanceNorm > 1) continue;

        const falloff = 0.5 * (Math.cos(Math.PI * distanceNorm) + 1);
        corrected.terrainSamples[i] = clamp01(corrected.terrainSamples[i] + deficitNorm * falloff);
    }

    // Light smoothing to avoid a hard spike around the anchor region.
    for (let pass = 0; pass < 2; pass++) {
        const snapshot = [...corrected.terrainSamples];
        for (let i = Math.max(1, before.anchorIndex - radiusSamples); i <= Math.min(sampleCount - 2, before.anchorIndex + radiusSamples); i++) {
            const neighborAverage = (snapshot[i - 1] + snapshot[i] + snapshot[i + 1]) / 3;
            const blend = i === before.anchorIndex ? 0.30 : 0.45;
            corrected.terrainSamples[i] = clamp01(snapshot[i] * (1 - blend) + neighborAverage * blend);
        }
    }

    corrected.terrainSamples[before.anchorIndex] = Math.max(
        corrected.terrainSamples[before.anchorIndex],
        requiredTerrainHeightNorm
    );

    const after = getPlayerClearance(corrected, normalizedGlobal.playerAnchorXNorm, safeHeight);

    return {
        slotLayout: corrected,
        modified: true,
        beforeClearancePx: before.clearancePx,
        afterClearancePx: after.clearancePx,
        requiredClearancePx,
        requiredTerrainHeightNorm
    };
}

/**
 * Build terrain from a level slot layout.
 * @param {string} levelId - Level ID
 * @param {number} width - Terrain width in pixels
 * @param {number} height - Terrain height in pixels
 * @param {object} [options] - Optional overrides
 * @param {{terrainSamples:number[], enemyXNorm:number}} [options.slotOverride] - Slot override
 * @param {boolean} [options.applyGuardrail=true] - Apply player clearance guardrail
 * @param {object} [options.globalConfig] - Global config override
 * @returns {Terrain}
 */
export function buildTerrainFromSlot(levelId, width, height, options = {}) {
    const safeWidth = Math.max(2, Math.floor(width || CANVAS.DESIGN_WIDTH));
    const safeHeight = Math.max(2, Math.floor(height || CANVAS.DESIGN_HEIGHT));

    let slotLayout = getSlotLayout(levelId, {
        slotOverride: options.slotOverride
    });

    if (options.applyGuardrail !== false) {
        slotLayout = enforcePlayerSlingGuardrail(
            slotLayout,
            options.globalConfig || RUNTIME_LAYOUTS.global,
            safeHeight,
            safeWidth
        ).slotLayout;
    }

    const terrain = new Terrain(safeWidth, safeHeight);
    const samplesInPx = slotLayout.terrainSamples.map(sample => sample * safeHeight);
    const resampledHeights = resampleArray(samplesInPx, safeWidth);

    for (let x = 0; x < safeWidth; x++) {
        terrain.setHeight(x, resampledHeights[x]);
    }

    return terrain;
}

/**
 * Get player and enemy spawn positions from slot + terrain.
 * @param {string} levelId - Level ID
 * @param {Terrain} terrain - Terrain for y snapping
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {object} [options] - Optional overrides
 * @param {{terrainSamples:number[], enemyXNorm:number}} [options.slotOverride] - Slot override
 * @param {number} [options.minDistancePx=300] - Minimum x distance between tanks
 * @param {object} [options.globalConfig] - Global config override
 * @returns {{player:{x:number,y:number}, enemy:{x:number,y:number}, meta:{playerAnchorXNorm:number, enemyXNorm:number}}}
 */
export function getSpawnForSlot(levelId, terrain, width, height, options = {}) {
    const safeWidth = Math.max(2, Math.floor(width || terrain?.getWidth() || CANVAS.DESIGN_WIDTH));
    const safeHeight = Math.max(2, Math.floor(height || terrain?.getScreenHeight() || CANVAS.DESIGN_HEIGHT));
    const minDistancePx = Math.max(0, Number.isFinite(options.minDistancePx) ? options.minDistancePx : 300);
    const edgeMargin = Math.max(10, Math.floor(TANK.WIDTH / 2));

    const slotLayout = getSlotLayout(levelId, {
        slotOverride: options.slotOverride
    });

    const normalizedGlobal = normalizeGlobalConfig(options.globalConfig || RUNTIME_LAYOUTS.global);

    const playerX = Math.max(
        edgeMargin,
        Math.min(safeWidth - 1 - edgeMargin, Math.round(normalizedGlobal.playerAnchorXNorm * (safeWidth - 1)))
    );

    const rawEnemyX = Math.round(clamp01(slotLayout.enemyXNorm) * (safeWidth - 1));
    const minEnemyX = Math.max(edgeMargin, playerX + minDistancePx);
    const maxEnemyX = safeWidth - 1 - edgeMargin;

    let enemyX;
    if (minEnemyX > maxEnemyX) {
        enemyX = maxEnemyX;
    } else {
        enemyX = Math.max(minEnemyX, Math.min(maxEnemyX, rawEnemyX));
    }

    const playerY = safeHeight - terrain.getHeight(playerX);
    const enemyY = safeHeight - terrain.getHeight(enemyX);

    return {
        player: { x: playerX, y: playerY },
        enemy: { x: enemyX, y: enemyY },
        meta: {
            playerAnchorXNorm: normalizedGlobal.playerAnchorXNorm,
            enemyXNorm: enemyX / Math.max(1, safeWidth - 1)
        }
    };
}

/**
 * Validate full layouts payload structure.
 * @param {object} payload - Candidate payload
 * @param {object} [options] - Validation options
 * @param {boolean} [options.allowPartial=false] - Allow missing slot IDs
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateLayoutsPayload(payload, options = {}) {
    const errors = [];
    const allowPartial = options.allowPartial === true;

    if (!payload || typeof payload !== 'object') {
        return {
            valid: false,
            errors: ['Payload must be an object']
        };
    }

    if (payload.version !== LEVEL_LAYOUT_VERSION) {
        errors.push(`Payload version must be ${LEVEL_LAYOUT_VERSION}`);
    }

    const sampleCount = normalizeSampleCount(payload?.meta?.sampleCount);

    const global = payload.global;
    if (!global || typeof global !== 'object') {
        errors.push('Payload.global must be an object');
    } else {
        if (!Number.isFinite(global.playerAnchorXNorm) || global.playerAnchorXNorm < 0 || global.playerAnchorXNorm > 1) {
            errors.push('global.playerAnchorXNorm must be a number between 0 and 1');
        }
        if (!Number.isFinite(global.minSlingClearancePx) || global.minSlingClearancePx < 0) {
            errors.push('global.minSlingClearancePx must be a non-negative number');
        }
        if (!Number.isFinite(global.autoFixRadiusPx) || global.autoFixRadiusPx < 0) {
            errors.push('global.autoFixRadiusPx must be a non-negative number');
        }
    }

    const slots = payload.slots;
    if (!slots || typeof slots !== 'object') {
        errors.push('Payload.slots must be an object');
    } else {
        const slotIds = Object.keys(slots);

        for (const slotId of slotIds) {
            if (!isKnownLevelId(slotId)) {
                errors.push(`Unknown slot ID: ${slotId}`);
                continue;
            }

            const slot = slots[slotId];
            if (!slot || typeof slot !== 'object') {
                errors.push(`Slot ${slotId} must be an object`);
                continue;
            }

            if (!Array.isArray(slot.terrainSamples)) {
                errors.push(`Slot ${slotId}.terrainSamples must be an array`);
            } else {
                if (slot.terrainSamples.length !== sampleCount) {
                    errors.push(`Slot ${slotId}.terrainSamples must have ${sampleCount} entries`);
                }

                for (let i = 0; i < slot.terrainSamples.length; i++) {
                    const value = slot.terrainSamples[i];
                    if (!Number.isFinite(value) || value < 0 || value > 1) {
                        errors.push(`Slot ${slotId}.terrainSamples[${i}] must be a number between 0 and 1`);
                        break;
                    }
                }
            }

            if (!Number.isFinite(slot.enemyXNorm) || slot.enemyXNorm < 0 || slot.enemyXNorm > 1) {
                errors.push(`Slot ${slotId}.enemyXNorm must be a number between 0 and 1`);
            }
        }

        if (!allowPartial) {
            for (const levelId of ALL_LEVEL_IDS) {
                if (!(levelId in slots)) {
                    errors.push(`Missing slot ID: ${levelId}`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Parse JSON text and validate as layouts payload.
 * @param {string} jsonText - JSON string
 * @param {object} [options] - Validation options
 * @returns {{valid: boolean, errors: string[], payload: object|null}}
 */
export function parseAndValidateLayoutsJson(jsonText, options = {}) {
    let parsed;

    try {
        parsed = JSON.parse(jsonText);
    } catch (error) {
        return {
            valid: false,
            errors: [`Invalid JSON: ${error.message}`],
            payload: null
        };
    }

    const validation = validateLayoutsPayload(parsed, options);
    return {
        valid: validation.valid,
        errors: validation.errors,
        payload: validation.valid ? parsed : null
    };
}

/**
 * Create full payload for export, with optional slot/global overrides.
 * @param {object} [options] - Export options
 * @param {Record<string, {terrainSamples:number[], enemyXNorm:number}>} [options.slotOverrides] - Slot overrides
 * @param {{playerAnchorXNorm:number, minSlingClearancePx:number, autoFixRadiusPx:number}} [options.globalOverride] - Global override
 * @returns {{version:number, meta:object, global:object, slots:Record<string, {terrainSamples:number[], enemyXNorm:number}>}}
 */
export function createLayoutsExportPayload(options = {}) {
    const sampleCount = getLayoutSampleCount();
    const slotOverrides = options.slotOverrides || {};
    const globalOverride = options.globalOverride || null;

    const slots = {};
    for (const levelId of ALL_LEVEL_IDS) {
        const overrideSlot = slotOverrides[levelId];
        slots[levelId] = getSlotLayout(levelId, {
            slotOverride: overrideSlot,
            sampleCount
        });
    }

    return {
        version: LEVEL_LAYOUT_VERSION,
        meta: {
            sampleCount,
            generatedFrom: BASE_GENERATED_FROM,
            generatedAt: new Date().toISOString()
        },
        global: normalizeGlobalConfig(globalOverride || RUNTIME_LAYOUTS.global),
        slots
    };
}

/**
 * Serialize payload to formatted JSON.
 * @param {object} payload - Payload to serialize
 * @returns {string}
 */
export function serializeLayoutsPayload(payload) {
    return `${JSON.stringify(payload, null, 2)}\n`;
}
