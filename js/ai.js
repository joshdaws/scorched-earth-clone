/**
 * Scorched Earth: Synthwave Edition
 * AI System
 *
 * Provides AI opponents for the game with varying difficulty levels.
 * Each difficulty level has different accuracy and behavior characteristics.
 */

import { CANVAS } from './constants.js';

// =============================================================================
// AI DIFFICULTY LEVELS
// =============================================================================

/**
 * AI difficulty level configurations.
 * Each level defines error ranges and behavior characteristics.
 */
export const AI_DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

/**
 * Configuration for each difficulty level.
 * Defines error ranges and special behaviors.
 */
const DIFFICULTY_CONFIG = {
    [AI_DIFFICULTY.EASY]: {
        name: 'Easy',
        // Error ranges - makes shots inaccurate
        angleErrorMin: -15, // degrees
        angleErrorMax: 15,  // degrees
        powerErrorMin: -20, // percent
        powerErrorMax: 20,  // percent
        // No wind compensation - Easy AI ignores wind
        compensatesWind: false,
        // Only uses basic weapon
        onlyBasicWeapon: true,
        // Thinking delay range in milliseconds
        thinkingDelayMin: 1000,
        thinkingDelayMax: 2000
    },
    [AI_DIFFICULTY.MEDIUM]: {
        name: 'Medium',
        angleErrorMin: -8,
        angleErrorMax: 8,
        powerErrorMin: -10,
        powerErrorMax: 10,
        compensatesWind: true, // Medium AI tries to compensate for wind (imperfectly)
        windCompensationAccuracy: 0.5, // 50% accurate wind compensation
        onlyBasicWeapon: false,
        thinkingDelayMin: 800,
        thinkingDelayMax: 1500
    },
    [AI_DIFFICULTY.HARD]: {
        name: 'Hard',
        angleErrorMin: -3,
        angleErrorMax: 3,
        powerErrorMin: -5,
        powerErrorMax: 5,
        compensatesWind: true,
        windCompensationAccuracy: 0.85, // 85% accurate wind compensation
        onlyBasicWeapon: false,
        thinkingDelayMin: 500,
        thinkingDelayMax: 1000
    }
};

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {string} Current AI difficulty level */
let currentDifficulty = AI_DIFFICULTY.EASY;

/** @type {boolean} Whether debug mode is enabled for AI decisions */
let debugMode = false;

// =============================================================================
// DIFFICULTY MANAGEMENT
// =============================================================================

/**
 * Set the AI difficulty level.
 * @param {string} difficulty - Difficulty from AI_DIFFICULTY enum
 */
export function setDifficulty(difficulty) {
    if (!DIFFICULTY_CONFIG[difficulty]) {
        console.error(`[AI] Invalid difficulty: ${difficulty}`);
        return;
    }
    currentDifficulty = difficulty;
    if (debugMode) {
        console.log(`[AI] Difficulty set to: ${DIFFICULTY_CONFIG[difficulty].name}`);
    }
}

/**
 * Get the current AI difficulty level.
 * @returns {string} Current difficulty
 */
export function getDifficulty() {
    return currentDifficulty;
}

/**
 * Get the configuration for the current difficulty.
 * @returns {Object} Difficulty configuration
 */
export function getDifficultyConfig() {
    return DIFFICULTY_CONFIG[currentDifficulty];
}

// =============================================================================
// AIMING CALCULATION
// =============================================================================

/**
 * Calculate the angle from the AI tank to the player tank.
 * Uses direct line calculation (no arc compensation).
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @returns {number} Angle in degrees (0-180, where 90 is straight up)
 */
function calculateDirectAngle(aiTank, playerTank) {
    // Calculate the difference in positions
    // AI is typically on the right, player on the left
    const dx = playerTank.x - aiTank.x;
    const dy = aiTank.y - playerTank.y; // Inverted because canvas Y increases downward

    // Calculate angle using atan2
    // atan2 returns radians from -π to π, with 0 pointing right
    const radians = Math.atan2(dy, dx);

    // Convert to degrees
    // In our tank coordinate system: 0° = right, 90° = up, 180° = left
    // atan2 with positive dy (target above) and negative dx (target to left)
    // returns angle in range (-π, π)
    let degrees = radians * (180 / Math.PI);

    // atan2 returns negative angles for points below horizontal (negative dy)
    // For our tank system, we want 0-180 where:
    // - Angles in upper half (positive dy) map directly
    // - Angles in lower half need adjustment
    // Since tanks fire upward, we want to ensure the angle aims upward
    // If the direct angle would aim downward (negative degrees), we should
    // aim at a reasonable upward angle instead
    if (degrees < 0) {
        // Target is below us - aim at a moderate upward angle instead
        // This prevents the AI from trying to shoot downward
        degrees = Math.abs(degrees);
    }

    // Clamp to valid range (0-180)
    degrees = Math.max(0, Math.min(180, degrees));

    return degrees;
}

/**
 * Calculate an appropriate power level based on distance.
 * Simple heuristic: longer distance = more power.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @returns {number} Power percentage (0-100)
 */
function calculateBasePower(aiTank, playerTank) {
    // Calculate horizontal distance
    const distance = Math.abs(playerTank.x - aiTank.x);

    // Scale power based on distance relative to canvas width
    // At 0 distance -> 30% power
    // At full canvas width -> 90% power
    const normalizedDistance = distance / CANVAS.DESIGN_WIDTH;
    const basePower = 30 + (normalizedDistance * 60);

    // Clamp to valid range
    return Math.min(100, Math.max(0, basePower));
}

/**
 * Add random error to a value within a range.
 *
 * @param {number} value - Base value
 * @param {number} minError - Minimum error (can be negative)
 * @param {number} maxError - Maximum error
 * @returns {number} Value with random error applied
 */
function addRandomError(value, minError, maxError) {
    const error = minError + Math.random() * (maxError - minError);
    return value + error;
}

/**
 * Calculate AI aiming parameters (angle and power).
 * Considers difficulty level for accuracy.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @param {number} [windValue=0] - Current wind value (for wind compensation)
 * @returns {{angle: number, power: number}} Calculated angle and power
 */
export function calculateAim(aiTank, playerTank, windValue = 0) {
    const config = DIFFICULTY_CONFIG[currentDifficulty];

    // Calculate base angle (direct line to player)
    let angle = calculateDirectAngle(aiTank, playerTank);

    // Calculate base power based on distance
    let power = calculateBasePower(aiTank, playerTank);

    // Apply wind compensation (if difficulty supports it)
    if (config.compensatesWind && windValue !== 0) {
        // Wind blows projectiles horizontally
        // Positive wind = blows right, need to aim more left
        // Negative wind = blows left, need to aim more right
        const windCompensation = -windValue * config.windCompensationAccuracy * 2;
        angle += windCompensation;
    }

    // Apply random error based on difficulty
    angle = addRandomError(angle, config.angleErrorMin, config.angleErrorMax);
    power = addRandomError(power, config.powerErrorMin, config.powerErrorMax);

    // Clamp to valid ranges
    angle = Math.max(0, Math.min(180, angle));
    power = Math.max(0, Math.min(100, power));

    // Debug logging
    if (debugMode) {
        console.log(`[AI] ${config.name} AI calculating aim:`);
        console.log(`[AI]   Target: (${playerTank.x.toFixed(0)}, ${playerTank.y.toFixed(0)})`);
        console.log(`[AI]   Base angle: ${calculateDirectAngle(aiTank, playerTank).toFixed(1)}°`);
        console.log(`[AI]   Base power: ${calculateBasePower(aiTank, playerTank).toFixed(1)}%`);
        console.log(`[AI]   Wind: ${windValue.toFixed(1)}, Compensates: ${config.compensatesWind}`);
        console.log(`[AI]   Final angle: ${angle.toFixed(1)}° (error: ${config.angleErrorMin} to ${config.angleErrorMax})`);
        console.log(`[AI]   Final power: ${power.toFixed(1)}% (error: ${config.powerErrorMin} to ${config.powerErrorMax})`);
    }

    return { angle, power };
}

// =============================================================================
// WEAPON SELECTION
// =============================================================================

/**
 * Select which weapon the AI should use.
 * Easy AI only uses basic-shot. Other difficulties may vary weapons.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @returns {string} Weapon ID to use
 */
export function selectWeapon(aiTank) {
    const config = DIFFICULTY_CONFIG[currentDifficulty];

    // Easy AI always uses basic weapon
    if (config.onlyBasicWeapon) {
        if (debugMode) {
            console.log('[AI] Using basic-shot (Easy AI)');
        }
        return 'basic-shot';
    }

    // For Medium/Hard AI, could implement weapon selection logic here
    // For now, default to basic-shot
    // Future: check inventory for available weapons, consider distance/situation
    return 'basic-shot';
}

// =============================================================================
// THINKING DELAY
// =============================================================================

/**
 * Get a random thinking delay for the AI.
 * Makes the AI feel more "human" by not firing instantly.
 *
 * @returns {number} Delay in milliseconds
 */
export function getThinkingDelay() {
    const config = DIFFICULTY_CONFIG[currentDifficulty];
    const delay = config.thinkingDelayMin +
        Math.random() * (config.thinkingDelayMax - config.thinkingDelayMin);

    if (debugMode) {
        console.log(`[AI] Thinking delay: ${delay.toFixed(0)}ms`);
    }

    return delay;
}

// =============================================================================
// AI TURN EXECUTION
// =============================================================================

/**
 * AI turn state for managing the thinking/aiming/firing sequence.
 * @type {{
 *   active: boolean,
 *   startTime: number,
 *   thinkingDelay: number,
 *   calculatedAim: {angle: number, power: number}|null,
 *   selectedWeapon: string|null
 * }}
 */
const aiTurnState = {
    active: false,
    startTime: 0,
    thinkingDelay: 0,
    calculatedAim: null,
    selectedWeapon: null
};

/**
 * Start the AI's turn.
 * Calculates aim and weapon, then waits for thinking delay.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @param {number} [windValue=0] - Current wind value
 */
export function startTurn(aiTank, playerTank, windValue = 0) {
    aiTurnState.active = true;
    aiTurnState.startTime = performance.now();
    aiTurnState.thinkingDelay = getThinkingDelay();
    aiTurnState.calculatedAim = calculateAim(aiTank, playerTank, windValue);
    aiTurnState.selectedWeapon = selectWeapon(aiTank);

    if (debugMode) {
        console.log('[AI] Turn started - thinking...');
    }
}

/**
 * Update the AI turn state.
 * Should be called each frame during AI's turn.
 *
 * @returns {{ready: boolean, angle: number, power: number, weapon: string}|null}
 *          Returns aim data when ready to fire, null while still thinking
 */
export function updateTurn() {
    if (!aiTurnState.active) {
        return null;
    }

    const elapsed = performance.now() - aiTurnState.startTime;

    // Still thinking
    if (elapsed < aiTurnState.thinkingDelay) {
        return null;
    }

    // Ready to fire!
    if (debugMode) {
        console.log('[AI] Ready to fire!');
    }

    const result = {
        ready: true,
        angle: aiTurnState.calculatedAim.angle,
        power: aiTurnState.calculatedAim.power,
        weapon: aiTurnState.selectedWeapon
    };

    // Reset state
    aiTurnState.active = false;
    aiTurnState.calculatedAim = null;
    aiTurnState.selectedWeapon = null;

    return result;
}

/**
 * Cancel the current AI turn (e.g., if round ends early).
 */
export function cancelTurn() {
    aiTurnState.active = false;
    aiTurnState.calculatedAim = null;
    aiTurnState.selectedWeapon = null;

    if (debugMode) {
        console.log('[AI] Turn cancelled');
    }
}

/**
 * Check if the AI is currently active (thinking/aiming).
 * @returns {boolean} True if AI turn is in progress
 */
export function isTurnActive() {
    return aiTurnState.active;
}

// =============================================================================
// DEBUG MODE
// =============================================================================

/**
 * Enable or disable AI debug mode.
 * When enabled, AI decisions are logged to console.
 *
 * @param {boolean} enabled - Whether to enable debug mode
 */
export function setDebugMode(enabled) {
    debugMode = enabled;
    if (enabled) {
        console.log('[AI] Debug mode enabled');
    }
}

/**
 * Check if AI debug mode is enabled.
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugMode() {
    return debugMode;
}

// =============================================================================
// DIFFICULTY INFO (for UI)
// =============================================================================

/**
 * Get all difficulty levels for UI display.
 * @returns {Array<{id: string, name: string}>} Array of difficulty options
 */
export function getAllDifficulties() {
    return Object.entries(DIFFICULTY_CONFIG).map(([id, config]) => ({
        id,
        name: config.name
    }));
}

/**
 * Get the display name for a difficulty level.
 * @param {string} difficulty - Difficulty ID
 * @returns {string} Display name
 */
export function getDifficultyName(difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty];
    return config ? config.name : 'Unknown';
}
