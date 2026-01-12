/**
 * Scorched Earth: Synthwave Edition
 * Combat Achievement Detection
 *
 * Hooks into combat system to detect and award combat achievements.
 * Tracks round state and triggers unlocks when conditions are met.
 */

import { DEBUG, TANK } from './constants.js';
import { unlockAchievement, isAchievementUnlocked } from './achievements.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Combat state tracking for current round.
 * Reset at the start of each round.
 */
const roundState = {
    /** Total damage taken by player this round */
    damageTakenThisRound: 0,
    /** Lowest health reached by player this round (100 = start health) */
    lowestHealthThisRound: 100,
    /** Whether player dropped below 20% health this round */
    droppedBelow20Percent: false
};

/**
 * Persistent tracking across rounds.
 */
const persistentState = {
    /** Number of consecutive rounds won without taking damage */
    consecutiveFlawlessRounds: 0,
    /** Total enemies destroyed (for first blood detection) */
    totalEnemiesDestroyed: 0
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
            console.log(`[CombatAchievements] ${message}`, data);
        } else {
            console.log(`[CombatAchievements] ${message}`);
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
    roundState.damageTakenThisRound = 0;
    roundState.lowestHealthThisRound = TANK.START_HEALTH;
    roundState.droppedBelow20Percent = false;
    debugLog('Round state reset');
}

/**
 * Reset consecutive flawless rounds counter.
 * Call when player takes damage or loses a round.
 */
export function resetFlawlessStreak() {
    if (persistentState.consecutiveFlawlessRounds > 0) {
        debugLog('Flawless streak reset', { previousStreak: persistentState.consecutiveFlawlessRounds });
    }
    persistentState.consecutiveFlawlessRounds = 0;
}

/**
 * Get current combat state (for debugging).
 * @returns {Object} Current state
 */
export function getState() {
    return {
        roundState: { ...roundState },
        persistentState: { ...persistentState }
    };
}

// =============================================================================
// ACHIEVEMENT DETECTION CALLBACKS
// =============================================================================

/**
 * Record damage dealt to enemy tank.
 * Detects: Direct Hit, Overkill, First Blood
 *
 * @param {Object} damageResult - Result from damage system
 * @param {number} damageResult.damage - Raw damage calculated
 * @param {number} damageResult.actualDamage - Damage actually applied
 * @param {boolean} damageResult.isDirectHit - Whether this was a direct hit
 * @param {Object} targetTank - The tank that was damaged
 * @param {number} targetTank.health - Current health after damage
 * @param {boolean} targetTank.isEnemy - Whether this is an enemy tank
 * @param {number} healthBeforeHit - Health before damage was applied
 */
export function onDamageDealt(damageResult, targetTank, healthBeforeHit) {
    if (!isInitialized) return;

    // Only track damage to enemy tanks
    if (targetTank.team !== 'enemy') return;

    debugLog('Damage dealt to enemy', {
        damage: damageResult.actualDamage,
        isDirectHit: damageResult.isDirectHit,
        healthBefore: healthBeforeHit,
        healthAfter: targetTank.health
    });

    // --- Direct Hit Achievement ---
    if (damageResult.isDirectHit && !isAchievementUnlocked('direct_hit')) {
        debugLog('Unlocking Direct Hit achievement');
        unlockAchievement('direct_hit');
    }

    // --- Overkill Achievement ---
    // Deal 150%+ of enemy's remaining health in one hit
    if (!isAchievementUnlocked('overkill')) {
        const overkillThreshold = healthBeforeHit * 1.5;
        if (damageResult.actualDamage >= overkillThreshold) {
            debugLog('Unlocking Overkill achievement', {
                damage: damageResult.actualDamage,
                threshold: overkillThreshold
            });
            unlockAchievement('overkill');
        }
    }
}

/**
 * Record enemy tank destruction.
 * Detects: First Blood
 *
 * @param {Object} enemyTank - The destroyed enemy tank
 */
export function onEnemyDestroyed(enemyTank) {
    if (!isInitialized) return;

    persistentState.totalEnemiesDestroyed++;
    debugLog('Enemy destroyed', { total: persistentState.totalEnemiesDestroyed });

    // --- First Blood Achievement ---
    if (persistentState.totalEnemiesDestroyed === 1 && !isAchievementUnlocked('first_blood')) {
        debugLog('Unlocking First Blood achievement');
        unlockAchievement('first_blood');
    }
}

/**
 * Record damage taken by player tank.
 * Tracks: Damage taken this round, lowest health, comeback eligibility
 *
 * @param {number} damage - Damage amount taken
 * @param {number} currentHealth - Player's health after damage
 */
export function onPlayerDamageTaken(damage, currentHealth) {
    if (!isInitialized) return;

    roundState.damageTakenThisRound += damage;

    // Track lowest health reached
    if (currentHealth < roundState.lowestHealthThisRound) {
        roundState.lowestHealthThisRound = currentHealth;
    }

    // Check if dropped below 20% health (for Comeback King)
    const twentyPercentHealth = TANK.START_HEALTH * 0.2;
    if (currentHealth <= twentyPercentHealth && !roundState.droppedBelow20Percent) {
        roundState.droppedBelow20Percent = true;
        debugLog('Player dropped below 20% health', { health: currentHealth });
    }

    // Reset flawless streak since player took damage
    resetFlawlessStreak();

    debugLog('Player took damage', {
        damage,
        currentHealth,
        totalDamageThisRound: roundState.damageTakenThisRound,
        lowestHealth: roundState.lowestHealthThisRound
    });
}

/**
 * Handle player winning a round.
 * Detects: Untouchable, Comeback King, Nail Biter, Flawless Victory
 *
 * @param {number} playerHealth - Player's health when round was won
 */
export function onRoundWon(playerHealth) {
    if (!isInitialized) return;

    debugLog('Round won', {
        playerHealth,
        damageTaken: roundState.damageTakenThisRound,
        droppedBelow20: roundState.droppedBelow20Percent
    });

    // --- Untouchable Achievement ---
    // Win round without taking any damage
    if (roundState.damageTakenThisRound === 0 && !isAchievementUnlocked('untouchable')) {
        debugLog('Unlocking Untouchable achievement');
        unlockAchievement('untouchable');
    }

    // --- Comeback King Achievement ---
    // Win after dropping below 20% health
    if (roundState.droppedBelow20Percent && !isAchievementUnlocked('comeback_king')) {
        debugLog('Unlocking Comeback King achievement');
        unlockAchievement('comeback_king');
    }

    // --- Nail Biter Achievement ---
    // Win with less than 10% health remaining
    const tenPercentHealth = TANK.START_HEALTH * 0.1;
    if (playerHealth < tenPercentHealth && playerHealth > 0 && !isAchievementUnlocked('nail_biter')) {
        debugLog('Unlocking Nail Biter achievement', { health: playerHealth, threshold: tenPercentHealth });
        unlockAchievement('nail_biter');
    }

    // --- Flawless Victory Achievement ---
    // Win 3 consecutive rounds without taking damage
    if (roundState.damageTakenThisRound === 0) {
        persistentState.consecutiveFlawlessRounds++;
        debugLog('Flawless round won', { streak: persistentState.consecutiveFlawlessRounds });

        if (persistentState.consecutiveFlawlessRounds >= 3 && !isAchievementUnlocked('flawless_victory')) {
            debugLog('Unlocking Flawless Victory achievement');
            unlockAchievement('flawless_victory');
        }
    }
    // Note: If damage was taken, resetFlawlessStreak() was already called in onPlayerDamageTaken
}

/**
 * Handle player losing a round (tank destroyed).
 * Resets flawless streak.
 */
export function onRoundLost() {
    if (!isInitialized) return;

    debugLog('Round lost');
    resetFlawlessStreak();
}

/**
 * Handle run starting (new game).
 * Resets persistent state for a fresh run.
 */
export function onRunStart() {
    if (!isInitialized) return;

    debugLog('Run started - resetting persistent state');
    resetRoundState();
    // Note: Don't reset totalEnemiesDestroyed - First Blood is account-wide
    // Only reset the flawless streak for the new run
    resetFlawlessStreak();
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the combat achievements system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[CombatAchievements] Already initialized');
        return;
    }

    resetRoundState();
    isInitialized = true;
    console.log('[CombatAchievements] System initialized');
}
