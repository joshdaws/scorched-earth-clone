/**
 * Scorched Earth: Synthwave Edition
 * Turn-based combat system
 *
 * Manages turn phases for player and AI, handling transitions
 * between aiming, firing, and projectile flight phases.
 */

import { TURN_PHASES, TURN_PHASE_TRANSITIONS, COLORS, CANVAS, UI } from './constants.js';
import * as Game from './game.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {string} Current turn phase */
let currentPhase = TURN_PHASES.PLAYER_AIM;

/** @type {boolean} Whether debug logging is enabled for turn system */
let debugMode = false;

/** @type {Function[]} Callbacks registered for phase change events */
const phaseChangeCallbacks = [];

/** @type {boolean} Whether a projectile is currently in flight */
let projectileInFlight = false;

/** @type {string} Who fired the current projectile ('player' or 'ai') */
let currentShooter = 'player';

// =============================================================================
// PHASE MANAGEMENT
// =============================================================================

/**
 * Initialize the turn system.
 * Resets to PLAYER_AIM phase.
 */
export function init() {
    currentPhase = TURN_PHASES.PLAYER_AIM;
    projectileInFlight = false;
    currentShooter = 'player';
    if (debugMode) {
        console.log('[Turn] System initialized, phase: PLAYER_AIM');
    }
}

/**
 * Get the current turn phase.
 * @returns {string} Current phase from TURN_PHASES enum
 */
export function getPhase() {
    return currentPhase;
}

/**
 * Check if the current phase matches a given phase.
 * @param {string} phase - Phase to check against
 * @returns {boolean} True if current phase matches
 */
export function isPhase(phase) {
    return currentPhase === phase;
}

/**
 * Check if a phase transition is valid.
 * @param {string} fromPhase - Current phase
 * @param {string} toPhase - Target phase
 * @returns {boolean} True if transition is allowed
 */
function isValidTransition(fromPhase, toPhase) {
    const allowed = TURN_PHASE_TRANSITIONS[fromPhase];
    return allowed && allowed.includes(toPhase);
}

/**
 * Set the turn phase with transition validation.
 * @param {string} newPhase - The new phase to transition to
 * @returns {boolean} True if phase change succeeded
 */
export function setPhase(newPhase) {
    // Validate phase is a valid phase value
    if (!Object.values(TURN_PHASES).includes(newPhase)) {
        console.error(`[Turn] Invalid phase: ${newPhase}`);
        return false;
    }

    // No change needed
    if (newPhase === currentPhase) {
        return true;
    }

    // Validate phase transition is allowed
    if (!isValidTransition(currentPhase, newPhase)) {
        console.error(`[Turn] Invalid phase transition: ${currentPhase} → ${newPhase}`);
        if (debugMode) {
            const allowed = TURN_PHASE_TRANSITIONS[currentPhase] || [];
            console.log(`[Turn] Allowed transitions: ${allowed.join(', ')}`);
        }
        return false;
    }

    const oldPhase = currentPhase;
    currentPhase = newPhase;

    // Log transition in debug mode
    if (debugMode) {
        console.log(`[Turn] Phase transition: ${oldPhase} → ${newPhase}`);
    }

    // Notify all phase change listeners
    for (const callback of phaseChangeCallbacks) {
        callback(newPhase, oldPhase);
    }

    return true;
}

/**
 * Register a callback to be notified of phase changes.
 * @param {Function} callback - Function called with (newPhase, oldPhase)
 */
export function onPhaseChange(callback) {
    phaseChangeCallbacks.push(callback);
}

/**
 * Remove a phase change callback.
 * @param {Function} callback - The callback to remove
 */
export function offPhaseChange(callback) {
    const index = phaseChangeCallbacks.indexOf(callback);
    if (index !== -1) {
        phaseChangeCallbacks.splice(index, 1);
    }
}

// =============================================================================
// TURN FLOW HELPERS
// =============================================================================

/**
 * Check if it's the player's turn (aiming or firing).
 * @returns {boolean} True if player can act
 */
export function isPlayerTurn() {
    return currentPhase === TURN_PHASES.PLAYER_AIM || currentPhase === TURN_PHASES.PLAYER_FIRE;
}

/**
 * Check if it's the AI's turn (aiming or firing).
 * @returns {boolean} True if AI can act
 */
export function isAiTurn() {
    return currentPhase === TURN_PHASES.AI_AIM || currentPhase === TURN_PHASES.AI_FIRE;
}

/**
 * Check if player can currently aim (only during PLAYER_AIM phase).
 * @returns {boolean} True if player can adjust angle/power
 */
export function canPlayerAim() {
    return currentPhase === TURN_PHASES.PLAYER_AIM;
}

/**
 * Check if player can currently fire.
 * @returns {boolean} True if player can fire
 */
export function canPlayerFire() {
    return currentPhase === TURN_PHASES.PLAYER_AIM;
}

/**
 * Player fires their weapon - transitions to PLAYER_FIRE then PROJECTILE_FLIGHT.
 * @returns {boolean} True if fire was initiated
 */
export function playerFire() {
    if (!canPlayerFire()) {
        if (debugMode) {
            console.log('[Turn] Cannot fire - not in PLAYER_AIM phase');
        }
        return false;
    }

    currentShooter = 'player';

    // Transition through PLAYER_FIRE to PROJECTILE_FLIGHT
    if (!setPhase(TURN_PHASES.PLAYER_FIRE)) {
        return false;
    }

    projectileInFlight = true;
    return setPhase(TURN_PHASES.PROJECTILE_FLIGHT);
}

/**
 * AI fires their weapon - transitions to AI_FIRE then PROJECTILE_FLIGHT.
 * @returns {boolean} True if fire was initiated
 */
export function aiFire() {
    if (currentPhase !== TURN_PHASES.AI_AIM) {
        if (debugMode) {
            console.log('[Turn] AI cannot fire - not in AI_AIM phase');
        }
        return false;
    }

    currentShooter = 'ai';

    // Transition through AI_FIRE to PROJECTILE_FLIGHT
    if (!setPhase(TURN_PHASES.AI_FIRE)) {
        return false;
    }

    projectileInFlight = true;
    return setPhase(TURN_PHASES.PROJECTILE_FLIGHT);
}

/**
 * Called when projectile resolves (hit terrain, hit tank, or went off-screen).
 * Transitions to the next player's turn.
 */
export function projectileResolved() {
    if (currentPhase !== TURN_PHASES.PROJECTILE_FLIGHT) {
        if (debugMode) {
            console.log('[Turn] Cannot resolve projectile - not in PROJECTILE_FLIGHT phase');
        }
        return false;
    }

    projectileInFlight = false;

    // Alternate turns: player shot → AI's turn, AI shot → player's turn
    if (currentShooter === 'player') {
        return setPhase(TURN_PHASES.AI_AIM);
    } else {
        return setPhase(TURN_PHASES.PLAYER_AIM);
    }
}

/**
 * Check if a projectile is currently in flight.
 * @returns {boolean} True if projectile is active
 */
export function isProjectileInFlight() {
    return projectileInFlight;
}

/**
 * Get who fired the current/last projectile.
 * @returns {string} 'player' or 'ai'
 */
export function getCurrentShooter() {
    return currentShooter;
}

// =============================================================================
// TURN INDICATOR RENDERING
// =============================================================================

/**
 * Get the display text for the current turn phase.
 * @returns {string} Human-readable turn indicator text
 */
export function getTurnIndicatorText() {
    switch (currentPhase) {
        case TURN_PHASES.PLAYER_AIM:
            return 'YOUR TURN - AIM';
        case TURN_PHASES.PLAYER_FIRE:
            return 'FIRING...';
        case TURN_PHASES.PROJECTILE_FLIGHT:
            return currentShooter === 'player' ? 'PROJECTILE IN FLIGHT' : 'INCOMING!';
        case TURN_PHASES.AI_AIM:
            return 'AI THINKING...';
        case TURN_PHASES.AI_FIRE:
            return 'ENEMY FIRING!';
        default:
            return '';
    }
}

/**
 * Get the color for the turn indicator based on whose turn it is.
 * @returns {string} Hex color string
 */
export function getTurnIndicatorColor() {
    if (isPlayerTurn() || (currentPhase === TURN_PHASES.PROJECTILE_FLIGHT && currentShooter === 'player')) {
        return COLORS.NEON_CYAN;  // Player color
    }
    return COLORS.NEON_PINK;  // AI/enemy color
}

/**
 * Render the turn indicator to the canvas.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function renderTurnIndicator(ctx) {
    const text = getTurnIndicatorText();
    if (!text) return;

    const x = CANVAS.DESIGN_WIDTH / 2;
    const y = 30;

    // Draw indicator background
    ctx.save();

    // Measure text for background
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    const textWidth = ctx.measureText(text).width;
    const padding = 20;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = UI.FONT_SIZE_LARGE + 16;

    // Draw background pill
    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.beginPath();
    ctx.roundRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, 8);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = getTurnIndicatorColor();
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw text
    ctx.fillStyle = getTurnIndicatorColor();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);

    ctx.restore();
}

// =============================================================================
// DEBUG MODE
// =============================================================================

/**
 * Enable or disable debug mode for turn system.
 * When enabled, phase transitions are logged to console.
 * @param {boolean} enabled - Whether to enable debug mode
 */
export function setDebugMode(enabled) {
    debugMode = enabled;
    if (enabled) {
        console.log('[Turn] Debug mode enabled');
    }
}

/**
 * Check if turn system debug mode is enabled.
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugMode() {
    return debugMode;
}
