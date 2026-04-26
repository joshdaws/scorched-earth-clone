/**
 * Asset metadata normalization and validation.
 *
 * Generated game art needs more than width/height: animation frames, pivots,
 * anchors, safe bounds, and source provenance need a consistent contract.
 */

export const ASSET_SCALE_POLICIES = Object.freeze({
    PIXEL_PERFECT: 'pixel-perfect',
    SMOOTH: 'smooth',
    NINE_SLICE: 'nine-slice',
    STRETCH: 'stretch',
    COVER: 'cover',
    CONTAIN: 'contain'
});

const VALID_SCALE_POLICIES = new Set(Object.values(ASSET_SCALE_POLICIES));

function isPositiveNumber(value) {
    return Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value) {
    return Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
}

function normalizePoint(value, label, errors) {
    if (value === undefined || value === null) return null;

    if (
        typeof value !== 'object' ||
        !Number.isFinite(value.x) ||
        !Number.isFinite(value.y)
    ) {
        errors.push(`${label} must contain finite x and y values`);
        return null;
    }

    return { x: value.x, y: value.y };
}

function normalizeBounds(value, width, height, errors) {
    const fallback = { x: 0, y: 0, width, height };
    if (value === undefined || value === null) return fallback;

    const isValid = (
        typeof value === 'object' &&
        isNonNegativeNumber(value.x) &&
        isNonNegativeNumber(value.y) &&
        isPositiveNumber(value.width) &&
        isPositiveNumber(value.height)
    );

    if (!isValid) {
        errors.push('safeBounds must contain non-negative x/y and positive width/height');
        return fallback;
    }

    if (value.x + value.width > width || value.y + value.height > height) {
        errors.push('safeBounds must fit inside the asset dimensions');
    }

    return {
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height
    };
}

function normalizeAnchors(meta, width, height, errors) {
    const anchors = {
        center: { x: width / 2, y: height / 2 }
    };

    if (meta.anchor) {
        const anchor = normalizePoint(meta.anchor, 'anchor', errors);
        if (anchor) anchors.default = anchor;
    }

    if (meta.pivot) {
        const pivot = normalizePoint(meta.pivot, 'pivot', errors);
        if (pivot) anchors.pivot = pivot;
    }

    if (meta.anchors !== undefined) {
        if (!meta.anchors || typeof meta.anchors !== 'object' || Array.isArray(meta.anchors)) {
            errors.push('anchors must be an object keyed by anchor name');
        } else {
            for (const [name, value] of Object.entries(meta.anchors)) {
                const anchor = normalizePoint(value, `anchors.${name}`, errors);
                if (anchor) anchors[name] = anchor;
            }
        }
    }

    return anchors;
}

function normalizeFrames(meta, width, height, errors) {
    if (!meta.frames) return null;

    const frames = meta.frames;
    if (typeof frames !== 'object' || Array.isArray(frames)) {
        errors.push('frames must be an object');
        return null;
    }

    const columns = frames.columns ?? frames.cols;
    const rows = frames.rows;
    const count = frames.count ?? (columns * rows);

    if (!isPositiveInteger(columns)) errors.push('frames.columns must be a positive integer');
    if (!isPositiveInteger(rows)) errors.push('frames.rows must be a positive integer');
    if (!isPositiveInteger(count)) errors.push('frames.count must be a positive integer');

    if (!isPositiveInteger(columns) || !isPositiveInteger(rows) || !isPositiveInteger(count)) {
        return null;
    }

    if (count > columns * rows) {
        errors.push('frames.count cannot exceed columns * rows');
    }

    const frameWidth = frames.width ?? frames.frameWidth ?? (width / columns);
    const frameHeight = frames.height ?? frames.frameHeight ?? (height / rows);
    const durationMs = frames.durationMs ?? frames.frameDurationMs ?? 60;
    const spacing = frames.spacing ?? 0;
    const margin = frames.margin ?? 0;

    if (!isPositiveNumber(frameWidth)) errors.push('frames.width must be a positive number');
    if (!isPositiveNumber(frameHeight)) errors.push('frames.height must be a positive number');
    if (!isPositiveNumber(durationMs)) errors.push('frames.durationMs must be a positive number');
    if (!isNonNegativeNumber(spacing)) errors.push('frames.spacing must be a non-negative number');
    if (!isNonNegativeNumber(margin)) errors.push('frames.margin must be a non-negative number');

    return {
        columns,
        rows,
        count,
        width: frameWidth,
        height: frameHeight,
        durationMs,
        spacing,
        margin
    };
}

function normalizeSource(source, errors) {
    if (source === undefined || source === null) return null;

    if (typeof source !== 'object' || Array.isArray(source)) {
        errors.push('source must be an object');
        return null;
    }

    return {
        model: typeof source.model === 'string' ? source.model : '',
        prompt: typeof source.prompt === 'string' ? source.prompt : '',
        generatedAt: typeof source.generatedAt === 'string' ? source.generatedAt : '',
        reference: typeof source.reference === 'string' ? source.reference : '',
        notes: typeof source.notes === 'string' ? source.notes : ''
    };
}

/**
 * Normalize and validate a raw manifest entry.
 * @param {string} key - Dot-notation manifest key.
 * @param {Object|null} meta - Raw manifest entry.
 * @returns {Object} Normalized metadata with an `errors` array.
 */
export function normalizeAssetMetadata(key, meta) {
    const errors = [];

    if (!meta || typeof meta !== 'object') {
        return {
            key,
            path: '',
            width: 0,
            height: 0,
            scalePolicy: ASSET_SCALE_POLICIES.SMOOTH,
            anchors: {},
            pivot: null,
            frames: null,
            safeBounds: null,
            source: null,
            errors: ['metadata must be an object']
        };
    }

    const width = meta.width;
    const height = meta.height;

    if (!isPositiveNumber(width)) errors.push('width must be a positive number');
    if (!isPositiveNumber(height)) errors.push('height must be a positive number');

    const normalizedWidth = isPositiveNumber(width) ? width : 0;
    const normalizedHeight = isPositiveNumber(height) ? height : 0;

    const scalePolicy = meta.scalePolicy || ASSET_SCALE_POLICIES.SMOOTH;
    if (!VALID_SCALE_POLICIES.has(scalePolicy)) {
        errors.push(`scalePolicy must be one of: ${Array.from(VALID_SCALE_POLICIES).join(', ')}`);
    }

    const anchors = normalizeAnchors(meta, normalizedWidth, normalizedHeight, errors);
    const frames = normalizeFrames(meta, normalizedWidth, normalizedHeight, errors);
    const safeBounds = normalizeBounds(meta.safeBounds, normalizedWidth, normalizedHeight, errors);
    const source = normalizeSource(meta.source, errors);

    return {
        key,
        path: typeof meta.path === 'string' ? meta.path : '',
        width: normalizedWidth,
        height: normalizedHeight,
        scalePolicy: VALID_SCALE_POLICIES.has(scalePolicy) ? scalePolicy : ASSET_SCALE_POLICIES.SMOOTH,
        anchors,
        pivot: anchors.pivot || null,
        frames,
        safeBounds,
        source,
        errors
    };
}

/**
 * Validate a raw manifest entry and return error messages.
 * @param {string} key - Dot-notation manifest key.
 * @param {Object|null} meta - Raw manifest entry.
 * @returns {string[]} Validation errors.
 */
export function validateAssetMetadata(key, meta) {
    return normalizeAssetMetadata(key, meta).errors;
}

/**
 * Assert that a manifest entry is valid.
 * @param {string} key - Dot-notation manifest key.
 * @param {Object|null} meta - Raw manifest entry.
 * @returns {Object} Normalized metadata.
 * @throws {Error} If validation fails.
 */
export function assertValidAssetMetadata(key, meta) {
    const normalized = normalizeAssetMetadata(key, meta);

    if (normalized.errors.length > 0) {
        throw new Error(`Invalid asset metadata for ${key}: ${normalized.errors.join('; ')}`);
    }

    return normalized;
}
