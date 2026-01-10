/**
 * Scorched Earth: Synthwave Edition
 * Precision Achievement Detection
 *
 * Hooks into projectile/accuracy system to detect and award precision achievements.
 * Tracks consecutive hits, shot counts, and special conditions.
 */

import { DEBUG, CANVAS, PHYSICS } from './constants.js';
import { unlockAchievement, isAchievementUnlocked } from './achievements.js';
import * as Wind from './wind.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * State tracking for precision achievements.
 * Reset appropriately at round/game boundaries.
 */
const state = {
    /** Number of consecutive player hits on enemy */
    consecutiveHits: 0,
    /** Number of shots fired by player this round */
    shotsThisRound: 0,
    /** Whether current projectile has touched terrain (for Trick Shot) */
    projectileTouchedTerrain: false,
    /** Whether this is a fresh run (for first shot tracking) */
    isFirstShotOfRun: true
};

/** Whether the module has been initialized */
let isInitialized = false;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Thresholds for precision achievements */
const PRECISION_THRESHOLDS = {
    /** Consecutive hits needed for Sharpshooter */
    SHARPSHOOTER_HITS: 3,
    /** Consecutive hits needed for Eagle Eye */
    EAGLE_EYE_HITS: 5,
    /** Distance percentage of map width for Sniper Elite (80% = far shot) */
    SNIPER_DISTANCE_PERCENT: 0.8,
    /** Wind strength threshold for Wind Whisperer */
    WIND_WHISPERER_STRENGTH: 15,
    /** Wind strength threshold for Storm Chaser */
    STORM_CHASER_STRENGTH: 25
};

// =============================================================================
// DEBUG LOGGING
// =============================================================================

/**
 * Log debug message if debug mode is enabled.
 * @param {string} message - Message to log
 * @param {Object} [data] - Optional data to log
 */
function debugLog(message, data = null) {
    if (DEBUG.ENABLED) {
        if (data) {
            console.log(`[PrecisionAchievements] ${message}`, data);
        } else {
            console.log(`[PrecisionAchievements] ${message}`);
        }
    }
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Reset round-specific state. Call at the start of each round.
 */
export function resetRoundState() {
    state.shotsThisRound = 0;
    state.projectileTouchedTerrain = false;
    debugLog('Round state reset');
}

/**
 * Reset run-specific state. Call when starting a new game.
 */
export function resetRunState() {
    state.consecutiveHits = 0;
    state.shotsThisRound = 0;
    state.projectileTouchedTerrain = false;
    state.isFirstShotOfRun = true;
    debugLog('Run state reset');
}

/**
 * Get current precision state (for debugging).
 * @returns {Object} Current state copy
 */
export function getState() {
    return { ...state };
}

// =============================================================================
// ACHIEVEMENT DETECTION CALLBACKS
// =============================================================================

/**
 * Record when player fires a shot.
 * Tracks shot count for Hole in One detection.
 */
export function onPlayerShotFired() {
    if (!isInitialized) return;

    state.shotsThisRound++;
    state.projectileTouchedTerrain = false; // Reset for new projectile

    debugLog('Player shot fired', {
        shotsThisRound: state.shotsThisRound,
        isFirstShotOfRun: state.isFirstShotOfRun
    });
}

/**
 * Record when projectile touches/interacts with terrain.
 * Used for Trick Shot detection (projectile bounces off terrain before hitting enemy).
 * Should be called when rollers start rolling or projectiles bounce.
 */
export function onProjectileTouchedTerrain() {
    if (!isInitialized) return;

    state.projectileTouchedTerrain = true;
    debugLog('Projectile touched terrain');
}

/**
 * Record when player's shot hits the enemy tank.
 * Detects: Sharpshooter, Eagle Eye, Sniper Elite, Wind Whisperer, Storm Chaser, Trick Shot, Hole in One
 *
 * @param {Object} hitInfo - Information about the hit
 * @param {boolean} hitInfo.isDirectHit - Whether this was a direct hit (center of tank)
 * @param {Object} hitInfo.playerTank - The player's tank
 * @param {Object} hitInfo.enemyTank - The enemy tank that was hit
 */
export function onPlayerHitEnemy(hitInfo) {
    if (!isInitialized) return;

    const { isDirectHit, playerTank, enemyTank } = hitInfo;

    debugLog('Player hit enemy', {
        isDirectHit,
        consecutiveHits: state.consecutiveHits + 1,
        shotsThisRound: state.shotsThisRound,
        isFirstShotOfRun: state.isFirstShotOfRun,
        projectileTouchedTerrain: state.projectileTouchedTerrain
    });

    // Increment consecutive hits
    state.consecutiveHits++;

    // --- Sharpshooter Achievement ---
    // Hit 3 consecutive shots
    if (state.consecutiveHits >= PRECISION_THRESHOLDS.SHARPSHOOTER_HITS &&
        !isAchievementUnlocked('sharpshooter')) {
        debugLog('Unlocking Sharpshooter achievement', { hits: state.consecutiveHits });
        unlockAchievement('sharpshooter');
    }

    // --- Eagle Eye Achievement ---
    // Hit 5 consecutive shots
    if (state.consecutiveHits >= PRECISION_THRESHOLDS.EAGLE_EYE_HITS &&
        !isAchievementUnlocked('eagle_eye')) {
        debugLog('Unlocking Eagle Eye achievement', { hits: state.consecutiveHits });
        unlockAchievement('eagle_eye');
    }

    // --- Sniper Elite Achievement ---
    // Hit enemy from > 80% map width distance
    if (playerTank && enemyTank && !isAchievementUnlocked('sniper_elite')) {
        const playerPos = playerTank.getPosition();
        const enemyPos = enemyTank.getPosition();
        const distance = Math.abs(playerPos.x - enemyPos.x);
        const threshold = CANVAS.DESIGN_WIDTH * PRECISION_THRESHOLDS.SNIPER_DISTANCE_PERCENT;

        if (distance >= threshold) {
            debugLog('Unlocking Sniper Elite achievement', {
                distance,
                threshold,
                percentOfMap: (distance / CANVAS.DESIGN_WIDTH * 100).toFixed(1) + '%'
            });
            unlockAchievement('sniper_elite');
        }
    }

    // --- Wind Whisperer Achievement ---
    // Score a hit in wind >= 15
    const currentWind = Math.abs(Wind.getWind());
    if (currentWind >= PRECISION_THRESHOLDS.WIND_WHISPERER_STRENGTH &&
        !isAchievementUnlocked('wind_whisperer')) {
        debugLog('Unlocking Wind Whisperer achievement', { wind: currentWind });
        unlockAchievement('wind_whisperer');
    }

    // --- Storm Chaser Achievement ---
    // Score a hit in wind >= 25
    if (currentWind >= PRECISION_THRESHOLDS.STORM_CHASER_STRENGTH &&
        !isAchievementUnlocked('storm_chaser')) {
        debugLog('Unlocking Storm Chaser achievement', { wind: currentWind });
        unlockAchievement('storm_chaser');
    }

    // --- Trick Shot Achievement ---
    // Hit enemy after projectile bounced/rolled off terrain
    if (state.projectileTouchedTerrain && !isAchievementUnlocked('trick_shot')) {
        debugLog('Unlocking Trick Shot achievement');
        unlockAchievement('trick_shot');
    }

    // --- Hole in One Achievement ---
    // Direct hit on first shot of the run
    if (state.isFirstShotOfRun && isDirectHit && !isAchievementUnlocked('hole_in_one')) {
        debugLog('Unlocking Hole in One achievement');
        unlockAchievement('hole_in_one');
    }

    // After first shot, no longer eligible for Hole in One
    state.isFirstShotOfRun = false;
}

/**
 * Record when player's shot misses the enemy.
 * Resets consecutive hit counter.
 */
export function onPlayerMissed() {
    if (!isInitialized) return;

    if (state.consecutiveHits > 0) {
        debugLog('Player missed - resetting consecutive hits', {
            previousStreak: state.consecutiveHits
        });
    }

    state.consecutiveHits = 0;
    state.isFirstShotOfRun = false; // After any shot, no longer first shot
}

/**
 * Handle run starting (new game).
 * Resets all state for a fresh run.
 */
export function onRunStart() {
    if (!isInitialized) return;

    debugLog('Run started - resetting state');
    resetRunState();
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the precision achievements system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[PrecisionAchievements] Already initialized');
        return;
    }

    resetRunState();
    isInitialized = true;
    console.log('[PrecisionAchievements] System initialized');
}
