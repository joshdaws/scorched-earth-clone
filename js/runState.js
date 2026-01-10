/**
 * Scorched Earth: Synthwave Edition
 * Run State Management
 *
 * Manages the state of a single roguelike run - tracking progress, statistics,
 * and handling run lifecycle (start/end). A "run" is a continuous session that
 * ends only when the player's tank is destroyed (permadeath).
 *
 * This module is the single source of truth for run-related state.
 */

import { DEBUG } from './constants.js';

// =============================================================================
// RUN STATE
// =============================================================================

/**
 * Current run state.
 * @type {Object}
 */
const runState = {
    /** Whether a run is currently in progress */
    isActive: false,

    /** Current round number (starts at 1) */
    roundNumber: 1,

    /** Timestamp when the run started */
    startTime: null,

    /** Timestamp when the run ended (null if still active) */
    endTime: null,

    /** Per-run statistics */
    stats: {
        roundsSurvived: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        enemiesDestroyed: 0,
        shotsFired: 0,
        shotsHit: 0,
        moneyEarned: 0,
        moneySpent: 0,
        biggestHit: 0,
        weaponsUsed: new Set(),
        nukesLaunched: 0
    }
};

/**
 * Initial stats template for resetting.
 * @type {Object}
 */
const INITIAL_STATS = {
    roundsSurvived: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    enemiesDestroyed: 0,
    shotsFired: 0,
    shotsHit: 0,
    moneyEarned: 0,
    moneySpent: 0,
    biggestHit: 0,
    weaponsUsed: new Set(),
    nukesLaunched: 0
};

// =============================================================================
// DEBUG LOGGING
// =============================================================================

/**
 * Log a debug message if debug mode is enabled.
 * @param {string} message - Message to log
 * @param {Object} [data] - Optional data to log
 */
function debugLog(message, data = null) {
    if (DEBUG.ENABLED) {
        if (data !== null) {
            console.log(`[RunState] ${message}`, data);
        } else {
            console.log(`[RunState] ${message}`);
        }
    }
}

// =============================================================================
// RUN LIFECYCLE
// =============================================================================

/**
 * Start a new run, resetting all state and statistics.
 * Call this when the player starts a new game from the menu or after game over.
 */
export function startNewRun() {
    runState.isActive = true;
    runState.roundNumber = 1;
    runState.startTime = Date.now();
    runState.endTime = null;

    // Reset all stats
    runState.stats.roundsSurvived = 0;
    runState.stats.totalDamageDealt = 0;
    runState.stats.totalDamageTaken = 0;
    runState.stats.enemiesDestroyed = 0;
    runState.stats.shotsFired = 0;
    runState.stats.shotsHit = 0;
    runState.stats.moneyEarned = 0;
    runState.stats.moneySpent = 0;
    runState.stats.biggestHit = 0;
    runState.stats.weaponsUsed = new Set();
    runState.stats.nukesLaunched = 0;

    debugLog('New run started', { roundNumber: 1, startTime: runState.startTime });
}

/**
 * End the current run.
 * Call this when the player's tank is destroyed (game over).
 * @param {boolean} [wasDraw=false] - Whether this was a mutual destruction
 */
export function endRun(wasDraw = false) {
    if (!runState.isActive) {
        debugLog('endRun called but no run is active');
        return;
    }

    runState.isActive = false;
    runState.endTime = Date.now();

    // Finalize rounds survived (current round - 1, since they died in this round)
    // Exception: if round 1, they survived 0 complete rounds but we count as 1 for display
    runState.stats.roundsSurvived = runState.roundNumber;

    const duration = runState.endTime - runState.startTime;
    debugLog('Run ended', {
        roundsSurvived: runState.stats.roundsSurvived,
        wasDraw,
        durationMs: duration,
        stats: getRunStats()
    });
}

// =============================================================================
// ROUND MANAGEMENT
// =============================================================================

/**
 * Advance to the next round.
 * Call this when the player defeats the enemy and continues.
 * @returns {number} The new round number
 */
export function advanceRound() {
    if (!runState.isActive) {
        debugLog('advanceRound called but no run is active');
        return runState.roundNumber;
    }

    runState.roundNumber++;
    debugLog(`Advanced to round ${runState.roundNumber}`);

    return runState.roundNumber;
}

/**
 * Get the current round number.
 * @returns {number} Current round (1-based)
 */
export function getRoundNumber() {
    return runState.roundNumber;
}

/**
 * Set the round number directly (for save/load scenarios).
 * @param {number} round - Round number to set
 */
export function setRoundNumber(round) {
    if (round < 1) {
        debugLog('Invalid round number, ignoring', { requested: round });
        return;
    }
    runState.roundNumber = round;
    debugLog(`Round number set to ${round}`);
}

// =============================================================================
// STAT TRACKING
// =============================================================================

/**
 * Record a statistic update.
 * @param {string} statName - Name of the stat to update
 * @param {number|string} value - Value to add (for numbers) or record (for weaponsUsed)
 */
export function recordStat(statName, value) {
    if (!runState.isActive) {
        // Allow recording stats even if run isn't active (for late damage resolution)
        debugLog(`recordStat called while run inactive: ${statName}`);
    }

    switch (statName) {
        case 'damageDealt':
            runState.stats.totalDamageDealt += value;
            if (value > runState.stats.biggestHit) {
                runState.stats.biggestHit = value;
                debugLog(`New biggest hit: ${value}`);
            }
            break;

        case 'damageTaken':
            runState.stats.totalDamageTaken += value;
            break;

        case 'enemyDestroyed':
            runState.stats.enemiesDestroyed++;
            break;

        case 'shotFired':
            runState.stats.shotsFired++;
            break;

        case 'shotHit':
            runState.stats.shotsHit++;
            break;

        case 'moneyEarned':
            runState.stats.moneyEarned += value;
            break;

        case 'moneySpent':
            runState.stats.moneySpent += value;
            break;

        case 'weaponUsed':
            if (typeof value === 'string') {
                runState.stats.weaponsUsed.add(value);
            }
            break;

        case 'nukeLaunched':
            runState.stats.nukesLaunched++;
            debugLog('Nuclear weapon launched');
            break;

        default:
            debugLog(`Unknown stat: ${statName}`, { value });
    }
}

/**
 * Increment a numeric stat by a specific amount.
 * Convenience function for common operations.
 * @param {string} statName - Name of the stat
 * @param {number} [amount=1] - Amount to add
 */
export function incrementStat(statName, amount = 1) {
    recordStat(statName, amount);
}

// =============================================================================
// STATE QUERIES
// =============================================================================

/**
 * Check if a run is currently in progress.
 * @returns {boolean} True if a run is active
 */
export function isRunActive() {
    return runState.isActive;
}

/**
 * Get a copy of the current run statistics.
 * @returns {Object} Copy of run stats (safe to modify)
 */
export function getRunStats() {
    return {
        roundsSurvived: runState.stats.roundsSurvived,
        totalDamageDealt: runState.stats.totalDamageDealt,
        totalDamageTaken: runState.stats.totalDamageTaken,
        enemiesDestroyed: runState.stats.enemiesDestroyed,
        shotsFired: runState.stats.shotsFired,
        shotsHit: runState.stats.shotsHit,
        hitRate: runState.stats.shotsFired > 0
            ? Math.round((runState.stats.shotsHit / runState.stats.shotsFired) * 100)
            : 0,
        moneyEarned: runState.stats.moneyEarned,
        moneySpent: runState.stats.moneySpent,
        biggestHit: runState.stats.biggestHit,
        weaponsUsed: Array.from(runState.stats.weaponsUsed),
        uniqueWeaponsCount: runState.stats.weaponsUsed.size,
        nukesLaunched: runState.stats.nukesLaunched
    };
}

/**
 * Get the full run state (for debugging or save/load).
 * @returns {Object} Complete run state
 */
export function getState() {
    return {
        isActive: runState.isActive,
        roundNumber: runState.roundNumber,
        startTime: runState.startTime,
        endTime: runState.endTime,
        stats: getRunStats()
    };
}

/**
 * Get run duration in milliseconds.
 * @returns {number} Duration in ms (0 if run not started)
 */
export function getRunDuration() {
    if (!runState.startTime) return 0;

    const endTime = runState.endTime || Date.now();
    return endTime - runState.startTime;
}

/**
 * Get formatted run duration string.
 * @returns {string} Duration formatted as "Xm Ys" or "Xh Ym Zs"
 */
export function getFormattedDuration() {
    const durationMs = getRunDuration();
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

// =============================================================================
// DIFFICULTY SCALING
// =============================================================================

/**
 * Get the enemy health for a given round number.
 * Enemy tanks become more durable in later rounds.
 *
 * Health Scaling Table:
 * - Rounds 1-3:  100 HP (1.0x)
 * - Rounds 4-6:  120 HP (1.2x)
 * - Rounds 7-9:  140 HP (1.4x)
 * - Rounds 10-12: 160 HP (1.6x)
 * - Rounds 13+:  180 HP (1.8x cap)
 *
 * @param {number} roundNumber - Current round (1-based)
 * @returns {number} Enemy health for this round
 */
export function getEnemyHealthForRound(roundNumber) {
    const BASE_HEALTH = 100;

    if (roundNumber <= 3) return BASE_HEALTH;
    if (roundNumber <= 6) return Math.floor(BASE_HEALTH * 1.2);
    if (roundNumber <= 9) return Math.floor(BASE_HEALTH * 1.4);
    if (roundNumber <= 12) return Math.floor(BASE_HEALTH * 1.6);
    return Math.floor(BASE_HEALTH * 1.8); // Cap at 180 HP
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the run state module.
 * Called once at game startup.
 */
export function init() {
    runState.isActive = false;
    runState.roundNumber = 1;
    runState.startTime = null;
    runState.endTime = null;
    Object.assign(runState.stats, INITIAL_STATS);
    runState.stats.weaponsUsed = new Set();

    debugLog('Module initialized');
}

// Auto-initialize on module load
init();
