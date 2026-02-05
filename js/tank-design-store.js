/**
 * Tank Forge persistence and runtime override store.
 */

import {
    TANK_DESIGN_VERSION,
    cloneTankDesign,
    createDefaultTankDesign,
    normalizeTankDesign,
    validateTankDesign,
    validateTankDesignPack
} from './tank-design-schema.js';
import { enforceTurretAnchorGuardrail } from './tank-turret-constraints.js';

export const TANK_DESIGN_DRAFTS_STORAGE_KEY = 'scorchedEarth_tankDesignDrafts_v1';
export const TANK_DESIGN_RUNTIME_OVERRIDE_STORAGE_KEY = 'scorchedEarth_tankDesignRuntimeOverride_v1';
export const PLAYER_RUNTIME_OVERRIDE_KEY = '__player__';

const draftDesigns = new Map();
const runtimeOverrides = new Map();

let initialized = false;

function safeGetStorageValue(storage, key) {
    try {
        return storage?.getItem(key) || null;
    } catch (error) {
        console.warn(`[TankDesignStore] Failed to read ${key}:`, error);
        return null;
    }
}

function safeSetStorageValue(storage, key, value) {
    try {
        storage?.setItem(key, value);
    } catch (error) {
        console.warn(`[TankDesignStore] Failed to write ${key}:`, error);
    }
}

function saveDraftsToStorage() {
    const payload = {
        version: TANK_DESIGN_VERSION,
        updatedAt: Date.now(),
        designs: Array.from(draftDesigns.values())
    };

    safeSetStorageValue(localStorage, TANK_DESIGN_DRAFTS_STORAGE_KEY, JSON.stringify(payload));
}

function saveRuntimeOverridesToSessionStorage() {
    const payload = {
        version: TANK_DESIGN_VERSION,
        updatedAt: Date.now(),
        overrides: Array.from(runtimeOverrides.values())
    };

    safeSetStorageValue(sessionStorage, TANK_DESIGN_RUNTIME_OVERRIDE_STORAGE_KEY, JSON.stringify(payload));
}

function loadDraftsFromStorage() {
    const raw = safeGetStorageValue(localStorage, TANK_DESIGN_DRAFTS_STORAGE_KEY);
    if (!raw) return;

    try {
        const parsed = JSON.parse(raw);
        const validation = validateTankDesignPack(parsed);
        if (!validation.valid) {
            console.warn('[TankDesignStore] Ignoring invalid draft payload', validation.errors);
            return;
        }

        draftDesigns.clear();
        for (const design of validation.designs) {
            const guardrail = enforceTurretAnchorGuardrail(design);
            draftDesigns.set(guardrail.design.skinId, guardrail.design);
        }
    } catch (error) {
        console.warn('[TankDesignStore] Failed to parse draft payload:', error);
    }
}

function loadRuntimeOverridesFromSessionStorage() {
    const raw = safeGetStorageValue(sessionStorage, TANK_DESIGN_RUNTIME_OVERRIDE_STORAGE_KEY);
    if (!raw) return;

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.overrides)) {
            return;
        }

        runtimeOverrides.clear();
        parsed.overrides.forEach((candidate) => {
            const validation = validateTankDesign(candidate);
            if (!validation.valid) return;

            const guardrail = enforceTurretAnchorGuardrail(validation.normalized);
            runtimeOverrides.set(guardrail.design.skinId, guardrail.design);
        });
    } catch (error) {
        console.warn('[TankDesignStore] Failed to parse runtime override payload:', error);
    }
}

/**
 * Initialize store state from browser storage.
 */
export function initTankDesignStore() {
    if (initialized) return;

    loadDraftsFromStorage();
    loadRuntimeOverridesFromSessionStorage();
    initialized = true;
}

/**
 * Get a draft design by skin ID.
 * @param {string} skinId
 * @returns {object|null}
 */
export function getDraftTankDesign(skinId) {
    initTankDesignStore();
    const design = draftDesigns.get(skinId);
    return design ? cloneTankDesign(design) : null;
}

/**
 * Get all draft designs.
 * @returns {object[]}
 */
export function getAllDraftTankDesigns() {
    initTankDesignStore();
    return Array.from(draftDesigns.values()).map((design) => cloneTankDesign(design));
}

/**
 * Set and persist a draft design.
 * @param {unknown} input
 * @returns {{success:boolean, errors?:string[], design?:object, warnings?:string[]}}
 */
export function setDraftTankDesign(input) {
    initTankDesignStore();

    const validation = validateTankDesign(input);
    if (!validation.valid) {
        return {
            success: false,
            errors: validation.errors
        };
    }

    const guardrail = enforceTurretAnchorGuardrail(validation.normalized);
    const next = {
        ...guardrail.design,
        meta: {
            ...guardrail.design.meta,
            updatedAt: Date.now()
        }
    };

    draftDesigns.set(next.skinId, next);
    saveDraftsToStorage();

    return {
        success: true,
        design: cloneTankDesign(next),
        warnings: guardrail.warnings
    };
}

/**
 * Remove a draft design.
 * @param {string} skinId
 */
export function removeDraftTankDesign(skinId) {
    initTankDesignStore();
    draftDesigns.delete(skinId);
    saveDraftsToStorage();
}

/**
 * Clear all draft designs.
 */
export function clearDraftTankDesigns() {
    initTankDesignStore();
    draftDesigns.clear();
    saveDraftsToStorage();
}

/**
 * Build export payload from all drafts.
 * @returns {{version:number, exportedAt:number, designs:object[]}}
 */
export function buildTankDesignExportPack() {
    initTankDesignStore();

    return {
        version: TANK_DESIGN_VERSION,
        exportedAt: Date.now(),
        designs: getAllDraftTankDesigns()
    };
}

/**
 * Serialize export pack to JSON.
 * @returns {string}
 */
export function serializeTankDesignExportPack() {
    return JSON.stringify(buildTankDesignExportPack(), null, 2);
}

/**
 * Import a serialized design pack into drafts.
 * @param {string|object} payload
 * @param {{merge?: boolean}} [options]
 * @returns {{success:boolean, imported:number, errors:string[]}}
 */
export function importTankDesignPack(payload, options = {}) {
    initTankDesignStore();

    let parsed = payload;
    if (typeof payload === 'string') {
        try {
            parsed = JSON.parse(payload);
        } catch (error) {
            return {
                success: false,
                imported: 0,
                errors: ['Payload is not valid JSON']
            };
        }
    }

    const validation = validateTankDesignPack(parsed);
    if (!validation.valid) {
        return {
            success: false,
            imported: 0,
            errors: validation.errors
        };
    }

    if (!options.merge) {
        draftDesigns.clear();
    }

    let imported = 0;
    validation.designs.forEach((design) => {
        const guardrail = enforceTurretAnchorGuardrail(design);
        draftDesigns.set(guardrail.design.skinId, guardrail.design);
        imported++;
    });

    saveDraftsToStorage();

    return {
        success: true,
        imported,
        errors: []
    };
}

/**
 * Set or clear a runtime override design.
 * Runtime overrides are session-scoped and do not mutate draft data.
 *
 * @param {string} skinId
 * @param {unknown|null} design
 * @returns {{success:boolean, errors?:string[]}}
 */
export function setRuntimeTankDesignOverride(skinId, design) {
    initTankDesignStore();

    if (!skinId) {
        return {
            success: false,
            errors: ['skinId is required']
        };
    }

    if (design === null || design === undefined) {
        runtimeOverrides.delete(skinId);
        saveRuntimeOverridesToSessionStorage();
        return { success: true };
    }

    const normalized = normalizeTankDesign(design, {
        skinId
    });

    const validation = validateTankDesign(normalized);
    if (!validation.valid) {
        return {
            success: false,
            errors: validation.errors
        };
    }

    const guardrail = enforceTurretAnchorGuardrail(validation.normalized);
    runtimeOverrides.set(skinId, guardrail.design);
    saveRuntimeOverridesToSessionStorage();

    return { success: true };
}

/**
 * Get runtime override by key.
 * @param {string} skinId
 * @returns {object|null}
 */
export function getRuntimeTankDesignOverride(skinId) {
    initTankDesignStore();
    const design = runtimeOverrides.get(skinId);
    return design ? cloneTankDesign(design) : null;
}

/**
 * Clear all runtime overrides.
 */
export function clearRuntimeTankDesignOverrides() {
    initTankDesignStore();
    runtimeOverrides.clear();
    saveRuntimeOverridesToSessionStorage();
}

/**
 * Resolve active design for a skin ID.
 * Runtime override precedence: exact skin -> player wildcard -> draft.
 *
 * @param {string} skinId
 * @returns {object|null}
 */
export function getActiveTankDesignFromStore(skinId) {
    initTankDesignStore();

    const exactRuntime = runtimeOverrides.get(skinId);
    if (exactRuntime) {
        return cloneTankDesign(exactRuntime);
    }

    const playerRuntime = runtimeOverrides.get(PLAYER_RUNTIME_OVERRIDE_KEY);
    if (playerRuntime) {
        return cloneTankDesign(playerRuntime);
    }

    const draft = draftDesigns.get(skinId);
    if (draft) {
        return cloneTankDesign(draft);
    }

    return null;
}

/**
 * Get a draft if present, otherwise a default design.
 * @param {{skinId:string, rarity?:string, familyId?:string}} options
 * @returns {object}
 */
export function getDraftOrDefaultTankDesign(options) {
    const draft = getDraftTankDesign(options.skinId);
    if (draft) return draft;
    return createDefaultTankDesign(options);
}
