/**
 * Tank Forge schema helpers.
 *
 * Defines the TankDesignV1 contract used by the dev-only tank editor,
 * runtime preview pipeline, and import/export tooling.
 */

export const TANK_DESIGN_VERSION = 1;

export const TANK_CANVAS = {
    WIDTH: 64,
    HEIGHT: 32
};

export const TANK_EDITOR_FAMILIES = {
    RETRO_COMMANDER: 'retro-commander',
    ARCADE_CHAOS: 'arcade-chaos',
    LEGEND_LAB: 'legend-lab'
};

export const TANK_DESIGN_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const TANK_LAYER_TYPES = ['base', 'paint', 'decal', 'fx-mask'];
export const TANK_LAYER_BLEND_MODES = ['normal', 'add', 'screen', 'multiply'];
export const TANK_EFFECT_TYPES = ['neonPulse', 'laserStripe', 'plasmaVent', 'scanline', 'sparkArc'];

const DEFAULT_PALETTE = ['#1f2937', '#10b981', '#60a5fa', '#f59e0b', '#f43f5e'];

/**
 * Deep clone a TankDesign-compatible payload.
 * @param {unknown} value
 * @returns {any}
 */
export function cloneTankDesign(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Build a default design payload for a tank skin.
 * @param {{skinId: string, rarity?: string, familyId?: string}} options
 * @returns {object}
 */
export function createDefaultTankDesign(options) {
    const skinId = options?.skinId || 'standard';
    const rarity = TANK_DESIGN_RARITIES.includes(options?.rarity)
        ? options.rarity
        : 'common';
    const familyId = Object.values(TANK_EDITOR_FAMILIES).includes(options?.familyId)
        ? options.familyId
        : TANK_EDITOR_FAMILIES.RETRO_COMMANDER;

    return {
        version: TANK_DESIGN_VERSION,
        skinId,
        rarity,
        canvas: {
            width: TANK_CANVAS.WIDTH,
            height: TANK_CANVAS.HEIGHT
        },
        familyId,
        layers: [
            {
                id: 'base-layer',
                type: 'base',
                blend: 'normal',
                visible: true,
                pixels: '[]'
            },
            {
                id: 'paint-layer',
                type: 'paint',
                blend: 'normal',
                visible: true,
                pixels: '[]'
            },
            {
                id: 'decal-layer',
                type: 'decal',
                blend: 'add',
                visible: true,
                pixels: '[]'
            }
        ],
        parts: {
            hullPreset: 'standard',
            treadPreset: 'classic',
            wheelPreset: 'dual',
            barrelPreset: 'standard'
        },
        turret: {
            anchorX: 32,
            anchorY: 8,
            baseRadius: 8
        },
        effects: [],
        palette: [...DEFAULT_PALETTE],
        meta: {
            author: 'Tank Forge',
            updatedAt: Date.now(),
            tags: []
        }
    };
}

/**
 * Normalize a candidate object into TankDesign shape.
 * @param {unknown} input
 * @param {{skinId?: string, rarity?: string, familyId?: string}} [fallback]
 * @returns {object}
 */
export function normalizeTankDesign(input, fallback = {}) {
    const base = createDefaultTankDesign({
        skinId: fallback.skinId || 'standard',
        rarity: fallback.rarity || 'common',
        familyId: fallback.familyId || TANK_EDITOR_FAMILIES.RETRO_COMMANDER
    });

    if (!input || typeof input !== 'object') {
        return base;
    }

    const candidate = /** @type {any} */ (input);

    const normalized = {
        ...base,
        ...candidate,
        canvas: {
            width: Number(candidate.canvas?.width ?? base.canvas.width),
            height: Number(candidate.canvas?.height ?? base.canvas.height)
        },
        layers: Array.isArray(candidate.layers)
            ? candidate.layers.map((layer, index) => ({
                id: String(layer?.id ?? `layer-${index}`),
                type: String(layer?.type ?? 'paint'),
                blend: String(layer?.blend ?? 'normal'),
                visible: layer?.visible !== false,
                pixels: typeof layer?.pixels === 'string' ? layer.pixels : '[]'
            }))
            : base.layers,
        parts: {
            hullPreset: String(candidate.parts?.hullPreset ?? base.parts.hullPreset),
            treadPreset: String(candidate.parts?.treadPreset ?? base.parts.treadPreset),
            wheelPreset: (
                candidate.parts?.wheelPreset === null ||
                candidate.parts?.wheelPreset === undefined
            )
                ? null
                : String(candidate.parts.wheelPreset),
            barrelPreset: String(candidate.parts?.barrelPreset ?? base.parts.barrelPreset)
        },
        turret: {
            anchorX: Number(candidate.turret?.anchorX ?? base.turret.anchorX),
            anchorY: Number(candidate.turret?.anchorY ?? base.turret.anchorY),
            baseRadius: Number(candidate.turret?.baseRadius ?? base.turret.baseRadius)
        },
        effects: Array.isArray(candidate.effects)
            ? candidate.effects.map((effect) => ({
                type: String(effect?.type ?? 'neonPulse'),
                color: String(effect?.color ?? '#00ffff'),
                intensity: Number(effect?.intensity ?? 0.5),
                speed: Number(effect?.speed ?? 1)
            }))
            : [],
        palette: Array.isArray(candidate.palette)
            ? candidate.palette.map((color) => String(color))
            : [...base.palette],
        meta: {
            author: String(candidate.meta?.author ?? base.meta.author),
            updatedAt: Number(candidate.meta?.updatedAt ?? Date.now()),
            tags: Array.isArray(candidate.meta?.tags)
                ? candidate.meta.tags.map((tag) => String(tag))
                : []
        }
    };

    if (!TANK_DESIGN_RARITIES.includes(normalized.rarity)) {
        normalized.rarity = base.rarity;
    }

    if (!Object.values(TANK_EDITOR_FAMILIES).includes(normalized.familyId)) {
        normalized.familyId = base.familyId;
    }

    if (!Number.isFinite(normalized.version)) {
        normalized.version = TANK_DESIGN_VERSION;
    }

    return normalized;
}

/**
 * Validate a normalized tank design.
 * @param {unknown} input
 * @returns {{valid: boolean, errors: string[], normalized: object}}
 */
export function validateTankDesign(input) {
    const candidate = (input && typeof input === 'object')
        ? /** @type {any} */ (input)
        : null;
    const normalized = normalizeTankDesign(input);
    const errors = [];

    if (normalized.version !== TANK_DESIGN_VERSION) {
        errors.push(`version must be ${TANK_DESIGN_VERSION}`);
    }

    if (!normalized.skinId || typeof normalized.skinId !== 'string') {
        errors.push('skinId is required');
    }

    if (candidate && candidate.rarity !== undefined && !TANK_DESIGN_RARITIES.includes(String(candidate.rarity))) {
        errors.push('rarity must be a supported rarity');
    } else if (!TANK_DESIGN_RARITIES.includes(normalized.rarity)) {
        errors.push('rarity must be a supported rarity');
    }

    if (normalized.canvas.width !== TANK_CANVAS.WIDTH || normalized.canvas.height !== TANK_CANVAS.HEIGHT) {
        errors.push(`canvas must be ${TANK_CANVAS.WIDTH}x${TANK_CANVAS.HEIGHT}`);
    }

    if (candidate && candidate.familyId !== undefined && !Object.values(TANK_EDITOR_FAMILIES).includes(String(candidate.familyId))) {
        errors.push('familyId must be a supported family');
    } else if (!Object.values(TANK_EDITOR_FAMILIES).includes(normalized.familyId)) {
        errors.push('familyId must be a supported family');
    }

    if (!Array.isArray(normalized.layers) || normalized.layers.length === 0) {
        errors.push('layers must include at least one layer');
    } else {
        const layerIds = new Set();
        normalized.layers.forEach((layer, index) => {
            if (!layer.id) {
                errors.push(`layers[${index}].id is required`);
            }
            if (layerIds.has(layer.id)) {
                errors.push(`layers[${index}].id must be unique (${layer.id})`);
            }
            layerIds.add(layer.id);

            if (!TANK_LAYER_TYPES.includes(layer.type)) {
                errors.push(`layers[${index}].type must be supported`);
            }
            if (!TANK_LAYER_BLEND_MODES.includes(layer.blend)) {
                errors.push(`layers[${index}].blend must be supported`);
            }
            if (typeof layer.visible !== 'boolean') {
                errors.push(`layers[${index}].visible must be boolean`);
            }
            if (layer.pixels !== null && layer.pixels !== undefined && typeof layer.pixels !== 'string') {
                errors.push(`layers[${index}].pixels must be a JSON string`);
            }
        });
    }

    if (!normalized.parts || typeof normalized.parts !== 'object') {
        errors.push('parts is required');
    }

    if (!normalized.turret || typeof normalized.turret !== 'object') {
        errors.push('turret is required');
    } else {
        ['anchorX', 'anchorY', 'baseRadius'].forEach((key) => {
            const value = normalized.turret[key];
            if (!Number.isFinite(value)) {
                errors.push(`turret.${key} must be a finite number`);
            }
        });
    }

    if (!Array.isArray(normalized.effects)) {
        errors.push('effects must be an array');
    } else {
        normalized.effects.forEach((effect, index) => {
            if (!TANK_EFFECT_TYPES.includes(effect.type)) {
                errors.push(`effects[${index}].type must be supported`);
            }
            if (typeof effect.color !== 'string' || !effect.color) {
                errors.push(`effects[${index}].color is required`);
            }
            if (!Number.isFinite(effect.intensity)) {
                errors.push(`effects[${index}].intensity must be numeric`);
            }
            if (!Number.isFinite(effect.speed)) {
                errors.push(`effects[${index}].speed must be numeric`);
            }
        });
    }

    if (!Array.isArray(normalized.palette) || normalized.palette.length === 0) {
        errors.push('palette must include at least one color');
    }

    return {
        valid: errors.length === 0,
        errors,
        normalized
    };
}

/**
 * Validate an export pack payload.
 * @param {unknown} pack
 * @returns {{valid: boolean, errors: string[], designs: object[]}}
 */
export function validateTankDesignPack(pack) {
    const errors = [];
    const designs = [];

    if (!pack || typeof pack !== 'object') {
        return {
            valid: false,
            errors: ['pack must be an object'],
            designs
        };
    }

    const candidate = /** @type {any} */ (pack);
    if (candidate.version !== TANK_DESIGN_VERSION) {
        errors.push(`pack.version must be ${TANK_DESIGN_VERSION}`);
    }

    if (!Array.isArray(candidate.designs)) {
        errors.push('pack.designs must be an array');
    } else {
        const ids = new Set();
        candidate.designs.forEach((design, index) => {
            const validation = validateTankDesign(design);
            if (!validation.valid) {
                validation.errors.forEach((error) => {
                    errors.push(`designs[${index}]: ${error}`);
                });
                return;
            }

            if (ids.has(validation.normalized.skinId)) {
                errors.push(`designs[${index}]: duplicate skinId ${validation.normalized.skinId}`);
                return;
            }

            ids.add(validation.normalized.skinId);
            designs.push(validation.normalized);
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        designs
    };
}
