/**
 * Scorched Earth: Synthwave Edition
 * Hidden Achievement Detection
 *
 * Hooks into game systems to detect and award hidden achievements.
 * Hidden achievements are not shown in the UI until unlocked.
 *
 * Hidden Achievements:
 * - Self Destruct: Destroy yourself with your own weapon
 * - Mutual Destruction: Both tanks destroyed in same round
 * - Patient Zero: Miss 10 shots in a row, then win the round
 * - Against All Odds: Beat Hard AI on Round 1
 * - Minimalist: Win a run with only 1 weapon type in inventory
 */

import { DEBUG } from './constants.js';
import { unlockAchievement, isAchievementUnlocked } from './achievements.js';
import { AI_DIFFICULTY, getDifficulty } from './ai.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * State tracking for hidden achievements.
 * Reset appropriately at round/run boundaries.
 */
const state = {
    /** Number of consecutive misses by player this round */
    consecutiveMisses: 0,
    /** Whether player reached 10 consecutive misses this round (for Patient Zero) */
    reachedTenMisses: false,
    /** Set of unique weapon types in player's inventory (for Minimalist) */
    weaponTypesOwned: new Set(),
    /** Whether player was killed by their own shot this round */
    selfDestructTriggered: false,
    /** Whether both tanks were destroyed this round */
    mutualDestructionDetected: false
};

/** Whether the module has been initialized */
let isInitialized = false;

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
            console.log(`[HiddenAchievements] ${message}`, data);
        } else {
            console.log(`[HiddenAchievements] ${message}`);
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
    state.consecutiveMisses = 0;
    state.reachedTenMisses = false;
    state.selfDestructTriggered = false;
    state.mutualDestructionDetected = false;
    debugLog('Round state reset');
}

/**
 * Reset run-specific state. Call when starting a new game.
 */
export function resetRunState() {
    state.consecutiveMisses = 0;
    state.reachedTenMisses = false;
    state.weaponTypesOwned.clear();
    state.selfDestructTriggered = false;
    state.mutualDestructionDetected = false;
    debugLog('Run state reset');
}

/**
 * Get current hidden achievement state (for debugging).
 * @returns {Object} Current state copy
 */
export function getState() {
    return {
        consecutiveMisses: state.consecutiveMisses,
        reachedTenMisses: state.reachedTenMisses,
        weaponTypesOwned: Array.from(state.weaponTypesOwned),
        selfDestructTriggered: state.selfDestructTriggered,
        mutualDestructionDetected: state.mutualDestructionDetected
    };
}

// =============================================================================
// ACHIEVEMENT DETECTION CALLBACKS
// =============================================================================

/**
 * Record when player's shot hits the enemy.
 * Resets consecutive miss counter.
 */
export function onPlayerHitEnemy() {
    if (!isInitialized) return;

    if (state.consecutiveMisses > 0) {
        debugLog('Player hit enemy - resetting consecutive misses', {
            previousMisses: state.consecutiveMisses
        });
    }

    state.consecutiveMisses = 0;
}

/**
 * Record when player's shot misses the enemy.
 * Tracks consecutive misses for Patient Zero achievement.
 */
export function onPlayerMissed() {
    if (!isInitialized) return;

    state.consecutiveMisses++;

    debugLog('Player missed', { consecutiveMisses: state.consecutiveMisses });

    // Check if reached 10 consecutive misses (Patient Zero condition)
    if (state.consecutiveMisses >= 10 && !state.reachedTenMisses) {
        state.reachedTenMisses = true;
        debugLog('Player reached 10 consecutive misses - Patient Zero condition met');
    }
}

/**
 * Record when player takes damage from their own projectile.
 * Detects Self Destruct achievement.
 *
 * @param {boolean} isPlayerShot - Whether the damaging projectile was fired by player
 * @param {number} playerHealth - Player's health after damage
 * @param {number} damageAmount - Amount of damage taken
 */
export function onPlayerSelfDamage(isPlayerShot, playerHealth, damageAmount) {
    if (!isInitialized) return;
    if (!isPlayerShot) return;

    debugLog('Player took self-inflicted damage', {
        damage: damageAmount,
        healthAfter: playerHealth,
        wasKillingBlow: playerHealth <= 0
    });

    // --- Self Destruct Achievement ---
    // Player destroyed themselves with their own weapon
    if (playerHealth <= 0 && !isAchievementUnlocked('self_destruct')) {
        state.selfDestructTriggered = true;
        debugLog('Unlocking Self Destruct achievement - player killed self!');
        unlockAchievement('self_destruct');
    }
}

/**
 * Record when both tanks are destroyed in the same round.
 * Detects Mutual Destruction achievement.
 *
 * @param {boolean} playerDestroyed - Whether player tank is destroyed
 * @param {boolean} enemyDestroyed - Whether enemy tank is destroyed
 */
export function onRoundEndCheck(playerDestroyed, enemyDestroyed) {
    if (!isInitialized) return;

    // --- Mutual Destruction Achievement ---
    // Both tanks destroyed in the same round
    if (playerDestroyed && enemyDestroyed && !isAchievementUnlocked('mutual_destruction')) {
        state.mutualDestructionDetected = true;
        debugLog('Unlocking Mutual Destruction achievement - both tanks destroyed!');
        unlockAchievement('mutual_destruction');
    }
}

/**
 * Record when player wins a round.
 * Checks for Patient Zero, Against All Odds, and Minimalist achievements.
 *
 * @param {number} roundNumber - The current round number
 * @param {Object} [inventory] - Player's current weapon inventory (optional, for Minimalist)
 */
export function onRoundWon(roundNumber, inventory = null) {
    if (!isInitialized) return;

    // Update inventory tracking if provided
    if (inventory) {
        onInventoryChanged(inventory);
    }

    debugLog('Round won', {
        roundNumber,
        reachedTenMisses: state.reachedTenMisses,
        currentDifficulty: getDifficulty(),
        weaponTypesOwned: Array.from(state.weaponTypesOwned)
    });

    // --- Patient Zero Achievement ---
    // Miss 10 shots in a row, then win the round
    if (state.reachedTenMisses && !isAchievementUnlocked('patient_zero')) {
        debugLog('Unlocking Patient Zero achievement - won after 10 consecutive misses!');
        unlockAchievement('patient_zero');
    }

    // --- Against All Odds Achievement ---
    // Beat Hard AI on Round 1
    const currentDifficulty = getDifficulty();
    if (roundNumber === 1 &&
        (currentDifficulty === AI_DIFFICULTY.HARD || currentDifficulty === AI_DIFFICULTY.HARD_PLUS) &&
        !isAchievementUnlocked('against_all_odds')) {
        debugLog('Unlocking Against All Odds achievement - beat Hard AI on Round 1!');
        unlockAchievement('against_all_odds');
    }

    // --- Minimalist Achievement ---
    // Win a round with only 1 weapon type in inventory (basic-shot only)
    // This means player has never purchased any weapons, or has used up all purchased ammo
    if (state.weaponTypesOwned.size === 1 && state.weaponTypesOwned.has('basic-shot')) {
        if (!isAchievementUnlocked('minimalist')) {
            debugLog('Unlocking Minimalist achievement - won with only basic-shot in inventory!');
            unlockAchievement('minimalist');
        }
    }
}

/**
 * Track weapon types owned by player.
 * Call when player's inventory changes (purchase, start of game).
 * Used for Minimalist achievement detection.
 *
 * @param {Object} inventory - Player's weapon inventory (weaponId -> count)
 */
export function onInventoryChanged(inventory) {
    if (!isInitialized) return;
    if (!inventory) return;

    // Track unique weapon types owned (with ammo > 0)
    state.weaponTypesOwned.clear();

    for (const [weaponId, count] of Object.entries(inventory)) {
        // Check if player has at least 1 of this weapon (or Infinity for basic-shot)
        if (count === Infinity || count > 0) {
            state.weaponTypesOwned.add(weaponId);
        }
    }

    debugLog('Inventory tracked', {
        weaponTypesOwned: Array.from(state.weaponTypesOwned),
        count: state.weaponTypesOwned.size
    });
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
 * Initialize the hidden achievements system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[HiddenAchievements] Already initialized');
        return;
    }

    resetRunState();
    isInitialized = true;
    console.log('[HiddenAchievements] System initialized');
}
