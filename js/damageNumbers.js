/**
 * Floating combat damage numbers.
 *
 * Listens for TANK_DAMAGED gameplay events and renders rising, fading damage
 * values above the impact point - direct hits pop bigger with a white flash
 * frame, shield damage reads cyan, hull damage reads warm.
 */

import { GAMEPLAY_EVENTS, onGameplayEvent } from './gameplayEvents.js';
import { COLORS, UI } from './constants.js';

const LIFETIME_MS = 1100;
const RISE_PX = 46;
const MAX_ACTIVE = 14;

/** @type {Array<{value:number, x:number, y:number, bornAt:number, isDirectHit:boolean, shieldOnly:boolean, team:string, drift:number}>} */
let activeNumbers = [];
let registered = false;
let seed = 1;

function pseudoRandom() {
    // Deterministic-enough drift offsets without consuming Math.random in tests.
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
}

/**
 * Register the gameplay-event listener (idempotent).
 */
export function initDamageNumbers() {
    if (registered) return;
    registered = true;

    onGameplayEvent(GAMEPLAY_EVENTS.TANK_DAMAGED, payload => {
        if (!payload?.tank || !(payload.actualDamage > 0)) return;

        activeNumbers.push({
            value: Math.round(payload.actualDamage),
            x: payload.tank.x + (pseudoRandom() - 0.5) * 18,
            y: payload.tank.y - 44,
            bornAt: performance.now(),
            isDirectHit: payload.isDirectHit === true,
            shieldOnly: (payload.shieldDamage || 0) > 0 && (payload.healthDamage || 0) === 0,
            team: payload.team || payload.tank.team,
            drift: (pseudoRandom() - 0.5) * 22
        });

        if (activeNumbers.length > MAX_ACTIVE) {
            activeNumbers = activeNumbers.slice(-MAX_ACTIVE);
        }
    });
}

/** Clear all floating numbers (round resets, menu transitions). */
export function clearDamageNumbers() {
    activeNumbers = [];
}

/** @returns {number} Active floating number count (for tests/QA). */
export function getActiveDamageNumberCount() {
    return activeNumbers.length;
}

/**
 * Render and age all active numbers.
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderDamageNumbers(ctx) {
    if (activeNumbers.length === 0) return;

    const now = performance.now();
    activeNumbers = activeNumbers.filter(entry => now - entry.bornAt < LIFETIME_MS);
    if (activeNumbers.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const entry of activeNumbers) {
        const age = (now - entry.bornAt) / LIFETIME_MS;
        // Pop in fast, drift up, fade out in the back half.
        const popScale = age < 0.12 ? 0.6 + (age / 0.12) * 0.55 : 1.15 - Math.min(0.25, (age - 0.12) * 0.3);
        const alpha = age < 0.6 ? 1 : 1 - (age - 0.6) / 0.4;
        const x = entry.x + entry.drift * age;
        const y = entry.y - RISE_PX * age;

        const baseSize = entry.isDirectHit ? 30 : 21;
        const size = Math.round(baseSize * popScale);

        let color = entry.team === 'player' ? '#ff5d7e' : COLORS.NEON_YELLOW;
        if (entry.shieldOnly) color = COLORS.NEON_CYAN;
        // Direct hits flash white for the first beat.
        if (entry.isDirectHit && age < 0.18) color = '#ffffff';

        ctx.font = `bold ${size}px ${UI.FONT_FAMILY}`;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = entry.isDirectHit ? 14 : 8;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(5, 2, 16, 0.85)';
        ctx.strokeText(String(entry.value), x, y);
        ctx.fillStyle = color;
        ctx.fillText(String(entry.value), x, y);
    }

    ctx.restore();
}
