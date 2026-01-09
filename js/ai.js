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

// =============================================================================
// BALLISTIC CALCULATION (Medium/Hard AI)
// =============================================================================

/**
 * Physics constants for ballistic calculation.
 * Must match values in constants.js and projectile.js
 */
const BALLISTIC_CONSTANTS = {
    GRAVITY: 0.15,          // Gravity per frame (pixels/frame²)
    MAX_VELOCITY: 20        // Maximum projectile speed at 100% power
};

/**
 * Calculate ballistic trajectory to hit a target, accounting for gravity.
 * Uses projectile motion equations to find angle and power.
 *
 * For projectile motion without wind:
 * x = v0 * cos(θ) * t
 * y = v0 * sin(θ) * t - 0.5 * g * t²
 *
 * Solving for angle given target (dx, dy) and chosen power:
 * tan(θ) = (v0² ± √(v0⁴ - g*(g*dx² + 2*dy*v0²))) / (g*dx)
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @returns {{angle: number, power: number}} Calculated angle and power
 */
function calculateBallisticAim(aiTank, playerTank) {
    // Get fire position (tip of turret)
    const firePos = aiTank.getFirePosition ? aiTank.getFirePosition() : { x: aiTank.x, y: aiTank.y };
    const targetPos = { x: playerTank.x, y: playerTank.y };

    // Calculate displacement to target
    // dx is horizontal distance (positive = target to the right)
    // dy is vertical drop (positive = target below us in game coords, but we flip for physics)
    const dx = targetPos.x - firePos.x;
    // In canvas coords, Y increases downward, but for physics we want Y increasing upward
    // dy positive means target is ABOVE us (which is good for ballistics)
    const dy = firePos.y - targetPos.y;

    const g = BALLISTIC_CONSTANTS.GRAVITY;
    const distance = Math.abs(dx);

    // Start with a reasonable power based on distance
    // Scale power: at 300px -> ~50%, at 800px -> ~80%
    let power = 40 + (distance / CANVAS.DESIGN_WIDTH) * 50;
    power = Math.min(95, Math.max(35, power)); // Clamp to reasonable range

    // Convert power to velocity
    const v0 = (power / 100) * BALLISTIC_CONSTANTS.MAX_VELOCITY;
    const v0Sq = v0 * v0;

    // Calculate discriminant for ballistic formula
    // discriminant = v0⁴ - g*(g*dx² + 2*dy*v0²)
    const discriminant = v0Sq * v0Sq - g * (g * dx * dx + 2 * dy * v0Sq);

    let angle;

    if (discriminant >= 0) {
        // Two solutions exist - choose the lower angle (more direct shot)
        // tan(θ) = (v0² - √discriminant) / (g*dx)  for low trajectory
        // tan(θ) = (v0² + √discriminant) / (g*dx)  for high trajectory
        const sqrtDisc = Math.sqrt(discriminant);

        // For AI shooting left (dx < 0), we need to flip the formula
        // The angle should be > 90° (pointing left)
        if (dx < 0) {
            // Target is to the left
            // Use the formula with absolute dx, then adjust angle
            const absDx = Math.abs(dx);
            const tanTheta = (v0Sq - sqrtDisc) / (g * absDx);
            const baseAngle = Math.atan(tanTheta) * (180 / Math.PI);
            // Mirror for shooting left: angle = 180 - baseAngle
            angle = 180 - baseAngle;
        } else {
            // Target is to the right
            const tanTheta = (v0Sq - sqrtDisc) / (g * dx);
            angle = Math.atan(tanTheta) * (180 / Math.PI);
        }

        // If the calculated angle is invalid, fall back to estimation
        if (isNaN(angle) || angle < 0 || angle > 180) {
            angle = calculateEstimatedAngle(dx, dy, distance);
        }
    } else {
        // No solution with current power - target is too far
        // Increase power and estimate angle
        power = 90;
        angle = calculateEstimatedAngle(dx, dy, distance);
    }

    // Ensure angle is in valid range
    angle = Math.max(15, Math.min(165, angle));

    if (debugMode) {
        console.log(`[AI] Ballistic calculation:`);
        console.log(`[AI]   dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}, distance=${distance.toFixed(1)}`);
        console.log(`[AI]   v0=${v0.toFixed(2)}, discriminant=${discriminant.toFixed(2)}`);
        console.log(`[AI]   Calculated angle=${angle.toFixed(1)}°, power=${power.toFixed(1)}%`);
    }

    return { angle, power };
}

/**
 * Estimate angle when exact ballistic solution isn't available.
 * Uses a heuristic based on target direction and distance.
 *
 * @param {number} dx - Horizontal displacement to target
 * @param {number} dy - Vertical displacement to target (positive = target above)
 * @param {number} distance - Absolute horizontal distance
 * @returns {number} Estimated angle in degrees
 */
function calculateEstimatedAngle(dx, dy, distance) {
    // Base angle: 45° is optimal for max range on flat ground
    let baseAngle = 45;

    // Adjust for target height difference
    // If target is above us (dy > 0), increase angle
    // If target is below us (dy < 0), decrease angle
    const heightAdjust = Math.atan2(dy, distance) * (180 / Math.PI) * 0.5;
    baseAngle += heightAdjust;

    // If target is to the left (dx < 0), mirror the angle
    if (dx < 0) {
        baseAngle = 180 - baseAngle;
    }

    return baseAngle;
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
 * Easy AI: Uses direct line targeting (no arc compensation)
 * Medium/Hard AI: Uses ballistic calculation to account for gravity
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @param {number} [windValue=0] - Current wind value (for wind compensation)
 * @returns {{angle: number, power: number}} Calculated angle and power
 */
export function calculateAim(aiTank, playerTank, windValue = 0) {
    const config = DIFFICULTY_CONFIG[currentDifficulty];

    let angle, power;

    // Easy AI uses simple direct line targeting
    // Medium/Hard AI uses proper ballistic calculation
    if (currentDifficulty === AI_DIFFICULTY.EASY) {
        // Easy AI: direct line to target (doesn't account for gravity arc)
        angle = calculateDirectAngle(aiTank, playerTank);
        power = calculateBasePower(aiTank, playerTank);
    } else {
        // Medium/Hard AI: ballistic calculation that accounts for gravity
        const ballisticAim = calculateBallisticAim(aiTank, playerTank);
        angle = ballisticAim.angle;
        power = ballisticAim.power;
    }

    // Store base values for debug logging
    const baseAngle = angle;
    const basePower = power;

    // Apply wind compensation (if difficulty supports it)
    // Medium AI: 50% compensation, Hard AI: 85% compensation
    if (config.compensatesWind && windValue !== 0) {
        // Wind affects projectile by adding to horizontal velocity each frame
        // To compensate, we need to aim into the wind
        // The compensation amount depends on AI accuracy and wind strength
        // Positive wind = blows right, need to aim more left (increase angle if >90, decrease if <90)
        // Negative wind = blows left, need to aim more right

        // Calculate wind compensation factor
        // Wind compensation affects angle: stronger wind needs more angle adjustment
        // Multiply by accuracy (0.5 for Medium, 0.85 for Hard)
        const windEffect = windValue * config.windCompensationAccuracy * 3;

        // Adjust angle based on which direction we're shooting
        // If shooting left (angle > 90), positive wind pushes shot further left,
        // so we reduce angle to compensate
        // If shooting right (angle < 90), positive wind pushes shot right,
        // so we increase angle to compensate
        if (angle > 90) {
            angle -= windEffect;
        } else {
            angle += windEffect;
        }
    }

    // Apply random error based on difficulty
    // Easy: ±15° angle, ±20% power
    // Medium: ±8° angle, ±10% power
    // Hard: ±3° angle, ±5% power
    angle = addRandomError(angle, config.angleErrorMin, config.angleErrorMax);
    power = addRandomError(power, config.powerErrorMin, config.powerErrorMax);

    // Clamp to valid ranges
    angle = Math.max(0, Math.min(180, angle));
    power = Math.max(0, Math.min(100, power));

    // Debug logging
    if (debugMode) {
        console.log(`[AI] ${config.name} AI calculating aim:`);
        console.log(`[AI]   Target: (${playerTank.x.toFixed(0)}, ${playerTank.y.toFixed(0)})`);
        console.log(`[AI]   Calculation method: ${currentDifficulty === AI_DIFFICULTY.EASY ? 'direct line' : 'ballistic'}`);
        console.log(`[AI]   Base angle: ${baseAngle.toFixed(1)}°, Base power: ${basePower.toFixed(1)}%`);
        console.log(`[AI]   Wind: ${windValue.toFixed(1)}, Compensates: ${config.compensatesWind} (${config.windCompensationAccuracy * 100}%)`);
        console.log(`[AI]   Final angle: ${angle.toFixed(1)}° (error: ${config.angleErrorMin} to ${config.angleErrorMax})`);
        console.log(`[AI]   Final power: ${power.toFixed(1)}% (error: ${config.powerErrorMin} to ${config.powerErrorMax})`);
    }

    return { angle, power };
}

// =============================================================================
// WEAPON SELECTION
// =============================================================================

/**
 * Weapons that Medium AI prefers (in priority order).
 * Medium AI uses Missiles and Rollers when available.
 */
const MEDIUM_AI_PREFERRED_WEAPONS = ['missile', 'roller'];

/**
 * Weapons that Hard AI prefers (in priority order).
 * Hard AI uses more powerful weapons strategically.
 */
const HARD_AI_PREFERRED_WEAPONS = ['nuke', 'mini-nuke', 'mirv', 'deaths-head', 'big-shot', 'heavy-roller', 'missile', 'roller'];

/**
 * Select which weapon the AI should use.
 * - Easy AI: Always uses basic-shot
 * - Medium AI: 50% chance to use Missiles or Rollers if available
 * - Hard AI: Higher chance to use optimal weapons based on situation
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

    // Get list of preferred weapons based on difficulty
    let preferredWeapons;
    let useSpecialChance;

    if (currentDifficulty === AI_DIFFICULTY.MEDIUM) {
        // Medium AI: 50% chance to use better weapon if available
        preferredWeapons = MEDIUM_AI_PREFERRED_WEAPONS;
        useSpecialChance = 0.5;
    } else {
        // Hard AI: 80% chance to use better weapon
        preferredWeapons = HARD_AI_PREFERRED_WEAPONS;
        useSpecialChance = 0.8;
    }

    // Roll to see if AI should try to use a special weapon
    if (Math.random() < useSpecialChance) {
        // Check inventory for preferred weapons (in priority order)
        for (const weaponId of preferredWeapons) {
            const ammo = aiTank.getAmmo(weaponId);
            if (ammo > 0) {
                if (debugMode) {
                    console.log(`[AI] Selected ${weaponId} (${ammo} ammo remaining)`);
                }
                return weaponId;
            }
        }
    }

    // Default to basic-shot if no preferred weapon available or didn't roll to use one
    if (debugMode) {
        console.log('[AI] Using basic-shot (default or no preferred weapon available)');
    }
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
