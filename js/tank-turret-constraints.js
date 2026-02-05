/**
 * Tank Forge turret guardrails.
 *
 * Keeps turret anchors in safe ranges so rotation and projectile origins stay
 * visually coherent with body geometry.
 */

import { normalizeTankDesign } from './tank-design-schema.js';

export const TURRET_ANCHOR_BOUNDS = {
    minX: 20,
    maxX: 44,
    minY: 5,
    maxY: 14
};

const SWEEP_STEP_DEGREES = 5;
const SPRITE_WIDTH = 64;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Approximate hull-top mask used for anchor safety checks.
 * @param {number} x - Sprite-space X
 * @returns {number} Max allowed Y for turret anchor at X
 */
function getHullTopLimitAtX(x) {
    const distanceFromCenter = Math.abs(x - 32);
    if (distanceFromCenter <= 8) return 13;
    if (distanceFromCenter <= 12) return 12;
    return 11;
}

/**
 * Clamp an anchor into static bounds.
 * @param {{anchorX:number, anchorY:number, baseRadius?:number}} anchor
 * @returns {{anchorX:number, anchorY:number, baseRadius:number}}
 */
export function clampTurretAnchor(anchor) {
    const source = anchor || {};
    const sourceX = toFiniteNumber(source.anchorX, 32);
    const sourceY = toFiniteNumber(source.anchorY, 8);
    const sourceRadius = toFiniteNumber(source.baseRadius, 8);

    return {
        anchorX: clamp(Math.round(sourceX), TURRET_ANCHOR_BOUNDS.minX, TURRET_ANCHOR_BOUNDS.maxX),
        anchorY: clamp(Math.round(sourceY), TURRET_ANCHOR_BOUNDS.minY, TURRET_ANCHOR_BOUNDS.maxY),
        baseRadius: clamp(Math.round(sourceRadius), 4, 14)
    };
}

function computeMaxSafeAnchorY(anchorX, baseRadius) {
    let maxSafeY = TURRET_ANCHOR_BOUNDS.maxY;

    for (let angle = 0; angle <= 180; angle += SWEEP_STEP_DEGREES) {
        const radians = angle * (Math.PI / 180);
        const originX = clamp(
            anchorX + Math.cos(radians) * baseRadius,
            0,
            SPRITE_WIDTH - 1
        );
        const hullTopLimit = getHullTopLimitAtX(originX);
        const allowedAnchorY = hullTopLimit + Math.sin(radians) * baseRadius;
        maxSafeY = Math.min(maxSafeY, allowedAnchorY);
    }

    return clamp(
        Math.floor(maxSafeY),
        TURRET_ANCHOR_BOUNDS.minY,
        TURRET_ANCHOR_BOUNDS.maxY
    );
}

/**
 * Validate turret anchor constraints.
 * @param {{anchorX:number, anchorY:number, baseRadius?:number}} anchor
 * @returns {{valid:boolean, corrected:{anchorX:number,anchorY:number,baseRadius:number}, warnings:string[]}}
 */
export function validateTurretAnchor(anchor) {
    const warnings = [];
    const corrected = clampTurretAnchor(anchor);
    const roundedAnchorX = Math.round(toFiniteNumber(anchor?.anchorX, 32));
    const roundedAnchorY = Math.round(toFiniteNumber(anchor?.anchorY, 8));
    const roundedBaseRadius = Math.round(toFiniteNumber(anchor?.baseRadius, 8));

    if (corrected.anchorX !== roundedAnchorX || corrected.anchorY !== roundedAnchorY) {
        warnings.push('Turret anchor was clamped to allowed bounds.');
    }
    if (corrected.baseRadius !== roundedBaseRadius) {
        warnings.push('Turret base radius was clamped to allowed bounds.');
    }

    const hullTopLimit = getHullTopLimitAtX(corrected.anchorX);
    if (corrected.anchorY > hullTopLimit) {
        corrected.anchorY = hullTopLimit;
        warnings.push('Turret anchor Y was raised to stay above hull-top mask.');
    }

    // Sweep the barrel origin around the turret base to ensure it never dips below
    // the approximate hull-top silhouette at any angle.
    const maxSafeAnchorY = computeMaxSafeAnchorY(corrected.anchorX, corrected.baseRadius);
    if (corrected.anchorY > maxSafeAnchorY) {
        corrected.anchorY = maxSafeAnchorY;
        warnings.push('Turret anchor adjusted after rotation sweep to stay above hull-top mask.');
    }

    return {
        valid: warnings.length === 0,
        corrected,
        warnings
    };
}

/**
 * Enforce guardrails on a full design payload.
 * @param {unknown} design
 * @returns {{design: object, modified: boolean, warnings: string[], before:{anchorX:number,anchorY:number,baseRadius:number}, after:{anchorX:number,anchorY:number,baseRadius:number}}}
 */
export function enforceTurretAnchorGuardrail(design) {
    const normalized = normalizeTankDesign(design);
    const before = {
        anchorX: normalized.turret.anchorX,
        anchorY: normalized.turret.anchorY,
        baseRadius: normalized.turret.baseRadius
    };

    const validation = validateTurretAnchor(normalized.turret);

    normalized.turret.anchorX = validation.corrected.anchorX;
    normalized.turret.anchorY = validation.corrected.anchorY;
    normalized.turret.baseRadius = validation.corrected.baseRadius;

    const after = {
        anchorX: normalized.turret.anchorX,
        anchorY: normalized.turret.anchorY,
        baseRadius: normalized.turret.baseRadius
    };

    const modified = before.anchorX !== after.anchorX ||
        before.anchorY !== after.anchorY ||
        before.baseRadius !== after.baseRadius;

    return {
        design: normalized,
        modified,
        warnings: validation.warnings,
        before,
        after
    };
}
