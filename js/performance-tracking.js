/**
 * Scorched Earth: Synthwave Edition
 * Performance Tracking System
 *
 * Tracks player performance metrics that affect supply drop quality.
 * Calculates bonuses based on win streaks, accuracy, flawless rounds, and more.
 * Integrates with the drop rate system to modify rare+ chances.
 */

import { DEBUG } from './constants.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Performance bonus multipliers as specified in the achievements spec.
 */
const PERFORMANCE_FACTORS = {
    /** +5% rare+ chance per consecutive win (max +25%) */
    WIN_STREAK_BONUS_PER_WIN: 5,
    WIN_STREAK_MAX_BONUS: 25,

    /** +10% rare+ chance for flawless round (no damage taken) */
    FLAWLESS_ROUND_BONUS: 10,

    /** +3% per 10% accuracy above 50% */
    ACCURACY_BONUS_PER_10_PERCENT: 3,
    ACCURACY_THRESHOLD: 50,

    /** +1% per round beyond 5 */
    ROUND_BONUS_PER_ROUND: 1,
    ROUND_BONUS_START: 5,

    /** +15% for unlock attempt immediately after achievement */
    ACHIEVEMENT_UNLOCK_BONUS: 15
};

/**
 * Performance penalties for streak decay.
 */
const PERFORMANCE_PENALTIES = {
    /** -5% bonus for taking 50%+ damage in a round */
    HEAVY_DAMAGE_PENALTY: 5,
    HEAVY_DAMAGE_THRESHOLD: 50,

    /** -3% accuracy bonus for missing 5+ shots in a row */
    CONSECUTIVE_MISS_PENALTY: 3,
    CONSECUTIVE_MISS_THRESHOLD: 5
};

/**
 * Maximum total performance bonus (cap at reasonable level).
 */
const MAX_TOTAL_BONUS = 50;

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'scorchedEarth_performanceStats';

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Performance state tracking.
 */
const state = {
    // --- Win Streak ---
    /** Current consecutive win streak */
    currentWinStreak: 0,

    // --- Accuracy ---
    /** Total shots fired this session (for accuracy calculation) */
    sessionShotsFired: 0,
    /** Total shots that hit enemy this session */
    sessionShotsHit: 0,
    /** Current consecutive misses counter */
    consecutiveMisses: 0,
    /** Whether accuracy penalty is active from consecutive misses */
    accuracyPenaltyActive: false,

    // --- Round State (reset each round) ---
    /** Whether current round is flawless so far (no damage taken) */
    flawlessRound: true,
    /** Total damage taken this round (percentage of max health) */
    damageTakenThisRound: 0,
    /** Whether heavy damage penalty should apply */
    heavyDamagePenalty: false,

    // --- Pity Tracking (for bad luck protection) ---
    /** Rounds since last rare+ drop */
    roundsWithoutRare: 0,
    /** Rounds since last epic+ drop */
    roundsWithoutEpic: 0,
    /** Consecutive duplicates in a row */
    totalDuplicatesInRow: 0,

    // --- Achievement Bonus ---
    /** Whether an achievement was just unlocked (grants bonus on next drop) */
    achievementJustUnlocked: false,

    // --- Current Round Info ---
    /** Current round number (for round bonus calculation) */
    currentRound: 1
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
            console.log(`[PerformanceTracking] ${message}`, data);
        } else {
            console.log(`[PerformanceTracking] ${message}`);
        }
    }
}

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Load state from localStorage.
 */
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Restore persistent stats (pity counters persist across sessions)
            state.roundsWithoutRare = parsed.roundsWithoutRare || 0;
            state.roundsWithoutEpic = parsed.roundsWithoutEpic || 0;
            state.totalDuplicatesInRow = parsed.totalDuplicatesInRow || 0;
            debugLog('State loaded from localStorage', {
                roundsWithoutRare: state.roundsWithoutRare,
                roundsWithoutEpic: state.roundsWithoutEpic
            });
        }
    } catch (e) {
        console.warn('[PerformanceTracking] Failed to load state:', e);
    }
}

/**
 * Save state to localStorage.
 */
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            roundsWithoutRare: state.roundsWithoutRare,
            roundsWithoutEpic: state.roundsWithoutEpic,
            totalDuplicatesInRow: state.totalDuplicatesInRow
        }));
        debugLog('State saved to localStorage');
    } catch (e) {
        console.warn('[PerformanceTracking] Failed to save state:', e);
    }
}

// =============================================================================
// WIN STREAK TRACKING
// =============================================================================

/**
 * Update win streak based on round result.
 * @param {boolean} won - Whether the player won the round
 */
export function updateWinStreak(won) {
    if (!isInitialized) return;

    if (won) {
        state.currentWinStreak++;
        debugLog('Win streak incremented', { streak: state.currentWinStreak });
    } else {
        if (state.currentWinStreak > 0) {
            debugLog('Win streak reset', { previousStreak: state.currentWinStreak });
        }
        state.currentWinStreak = 0;
    }
}

/**
 * Get current win streak.
 * @returns {number} Current consecutive wins
 */
export function getWinStreak() {
    return state.currentWinStreak;
}

// =============================================================================
// ACCURACY TRACKING
// =============================================================================

/**
 * Track a shot fired.
 * @param {boolean} hit - Whether the shot hit the enemy
 */
export function updateAccuracy(hit) {
    if (!isInitialized) return;

    state.sessionShotsFired++;

    if (hit) {
        state.sessionShotsHit++;
        state.consecutiveMisses = 0;
        state.accuracyPenaltyActive = false;
        debugLog('Shot hit', {
            accuracy: getSessionAccuracy(),
            consecutiveHits: 'reset misses'
        });
    } else {
        state.consecutiveMisses++;

        // Apply accuracy penalty if missed 5+ in a row
        if (state.consecutiveMisses >= PERFORMANCE_PENALTIES.CONSECUTIVE_MISS_THRESHOLD) {
            state.accuracyPenaltyActive = true;
            debugLog('Consecutive miss penalty activated', {
                consecutiveMisses: state.consecutiveMisses
            });
        }
    }
}

/**
 * Get session accuracy as a percentage (0-100).
 * @returns {number} Accuracy percentage
 */
export function getSessionAccuracy() {
    if (state.sessionShotsFired === 0) return 0;
    return Math.round((state.sessionShotsHit / state.sessionShotsFired) * 100);
}

// =============================================================================
// FLAWLESS ROUND TRACKING
// =============================================================================

/**
 * Record damage taken by player.
 * Affects flawless round status and heavy damage penalty.
 *
 * @param {number} damage - Damage amount taken
 * @param {number} maxHealth - Player's max health (for percentage calculation)
 */
export function onDamageTaken(damage, maxHealth) {
    if (!isInitialized) return;

    state.flawlessRound = false;
    state.damageTakenThisRound += damage;

    // Check for heavy damage penalty (50%+ damage taken this round)
    const damagePercent = (state.damageTakenThisRound / maxHealth) * 100;
    if (damagePercent >= PERFORMANCE_PENALTIES.HEAVY_DAMAGE_THRESHOLD) {
        state.heavyDamagePenalty = true;
        debugLog('Heavy damage penalty activated', {
            damageThisRound: state.damageTakenThisRound,
            percentOfMax: damagePercent
        });
    }

    debugLog('Damage taken', {
        damage,
        totalThisRound: state.damageTakenThisRound,
        flawless: state.flawlessRound
    });
}

/**
 * Check if current round is flawless (no damage taken).
 * @returns {boolean} True if no damage taken this round
 */
export function isFlawlessRound() {
    return state.flawlessRound;
}

// =============================================================================
// ROUND MANAGEMENT
// =============================================================================

/**
 * Start a new round. Resets round-specific state.
 * @param {number} roundNumber - The round number starting
 */
export function onRoundStart(roundNumber) {
    if (!isInitialized) return;

    state.currentRound = roundNumber;
    state.flawlessRound = true;
    state.damageTakenThisRound = 0;
    state.heavyDamagePenalty = false;

    debugLog('Round started', { round: roundNumber });
}

/**
 * Handle round completion.
 * @param {boolean} won - Whether the player won
 */
export function onRoundEnd(won) {
    if (!isInitialized) return;

    updateWinStreak(won);

    debugLog('Round ended', {
        won,
        flawless: state.flawlessRound,
        winStreak: state.currentWinStreak
    });
}

// =============================================================================
// ACHIEVEMENT BONUS
// =============================================================================

/**
 * Mark that an achievement was just unlocked.
 * Grants +15% bonus on next drop attempt.
 */
export function onAchievementUnlocked() {
    if (!isInitialized) return;

    state.achievementJustUnlocked = true;
    debugLog('Achievement unlocked - bonus ready for next drop');
}

/**
 * Consume the achievement bonus (after using it for a drop).
 */
export function consumeAchievementBonus() {
    if (!isInitialized) return;

    state.achievementJustUnlocked = false;
    debugLog('Achievement bonus consumed');
}

/**
 * Check if achievement bonus is available.
 * @returns {boolean} True if bonus available
 */
export function hasAchievementBonus() {
    return state.achievementJustUnlocked;
}

// =============================================================================
// PITY TRACKING
// =============================================================================

/**
 * Record a drop result for pity tracking.
 * @param {string} rarity - The rarity that was dropped
 * @param {boolean} isDuplicate - Whether it was a duplicate
 */
export function onDropResult(rarity, isDuplicate) {
    if (!isInitialized) return;

    // Track duplicates in a row
    if (isDuplicate) {
        state.totalDuplicatesInRow++;
    } else {
        state.totalDuplicatesInRow = 0;
    }

    // Track rounds without rare+ / epic+
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const rarityIndex = rarityOrder.indexOf(rarity.toLowerCase());

    if (rarityIndex >= 2) { // rare or better
        state.roundsWithoutRare = 0;
        if (rarityIndex >= 3) { // epic or better
            state.roundsWithoutEpic = 0;
        } else {
            state.roundsWithoutEpic++;
        }
    } else {
        state.roundsWithoutRare++;
        state.roundsWithoutEpic++;
    }

    saveState();

    debugLog('Drop result tracked', {
        rarity,
        isDuplicate,
        roundsWithoutRare: state.roundsWithoutRare,
        roundsWithoutEpic: state.roundsWithoutEpic,
        duplicatesInRow: state.totalDuplicatesInRow
    });
}

/**
 * Get current pity counters.
 * @returns {Object} Pity tracking state
 */
export function getPityState() {
    return {
        roundsWithoutRare: state.roundsWithoutRare,
        roundsWithoutEpic: state.roundsWithoutEpic,
        duplicatesInRow: state.totalDuplicatesInRow
    };
}

// =============================================================================
// PERFORMANCE BONUS CALCULATION
// =============================================================================

/**
 * Calculate total performance bonus percentage.
 * This is the bonus added to rare+ drop chance.
 *
 * @returns {Object} Performance bonus breakdown
 * @property {number} total - Total bonus percentage
 * @property {Object} breakdown - Individual bonus sources
 */
export function getPerformanceBonus() {
    if (!isInitialized) return { total: 0, breakdown: {} };

    const breakdown = {};
    let total = 0;

    // --- Win Streak Bonus ---
    // +5% per consecutive win, max +25%
    const winStreakBonus = Math.min(
        state.currentWinStreak * PERFORMANCE_FACTORS.WIN_STREAK_BONUS_PER_WIN,
        PERFORMANCE_FACTORS.WIN_STREAK_MAX_BONUS
    );
    if (winStreakBonus > 0) {
        breakdown.winStreak = {
            value: winStreakBonus,
            detail: `${state.currentWinStreak} wins × ${PERFORMANCE_FACTORS.WIN_STREAK_BONUS_PER_WIN}%`
        };
        total += winStreakBonus;
    }

    // --- Flawless Round Bonus ---
    // +10% if no damage taken this round
    if (state.flawlessRound) {
        breakdown.flawless = {
            value: PERFORMANCE_FACTORS.FLAWLESS_ROUND_BONUS,
            detail: 'No damage taken'
        };
        total += PERFORMANCE_FACTORS.FLAWLESS_ROUND_BONUS;
    }

    // --- Accuracy Bonus ---
    // +3% per 10% accuracy above 50%
    const accuracy = getSessionAccuracy();
    if (accuracy > PERFORMANCE_FACTORS.ACCURACY_THRESHOLD) {
        const accuracyAboveThreshold = accuracy - PERFORMANCE_FACTORS.ACCURACY_THRESHOLD;
        const accuracyBonusUnits = Math.floor(accuracyAboveThreshold / 10);
        const accuracyBonus = accuracyBonusUnits * PERFORMANCE_FACTORS.ACCURACY_BONUS_PER_10_PERCENT;

        if (accuracyBonus > 0) {
            breakdown.accuracy = {
                value: accuracyBonus,
                detail: `${accuracy}% accuracy (${accuracyAboveThreshold}% above threshold)`
            };
            total += accuracyBonus;
        }
    }

    // --- Round Bonus ---
    // +1% per round beyond 5
    if (state.currentRound > PERFORMANCE_FACTORS.ROUND_BONUS_START) {
        const roundsAboveThreshold = state.currentRound - PERFORMANCE_FACTORS.ROUND_BONUS_START;
        const roundBonus = roundsAboveThreshold * PERFORMANCE_FACTORS.ROUND_BONUS_PER_ROUND;

        breakdown.round = {
            value: roundBonus,
            detail: `Round ${state.currentRound} (+${roundsAboveThreshold} rounds beyond 5)`
        };
        total += roundBonus;
    }

    // --- Achievement Bonus ---
    // +15% if achievement was just unlocked
    if (state.achievementJustUnlocked) {
        breakdown.achievement = {
            value: PERFORMANCE_FACTORS.ACHIEVEMENT_UNLOCK_BONUS,
            detail: 'Achievement just unlocked'
        };
        total += PERFORMANCE_FACTORS.ACHIEVEMENT_UNLOCK_BONUS;
    }

    // --- Apply Penalties ---

    // Heavy damage penalty: -5%
    if (state.heavyDamagePenalty) {
        const penalty = -PERFORMANCE_PENALTIES.HEAVY_DAMAGE_PENALTY;
        breakdown.heavyDamage = {
            value: penalty,
            detail: 'Took 50%+ damage this round'
        };
        total += penalty;
    }

    // Accuracy penalty: -3%
    if (state.accuracyPenaltyActive) {
        const penalty = -PERFORMANCE_PENALTIES.CONSECUTIVE_MISS_PENALTY;
        breakdown.consecutiveMisses = {
            value: penalty,
            detail: `Missed ${state.consecutiveMisses} shots in a row`
        };
        total += penalty;
    }

    // --- Apply Cap ---
    const cappedTotal = Math.min(Math.max(total, 0), MAX_TOTAL_BONUS);

    debugLog('Performance bonus calculated', {
        total: cappedTotal,
        uncapped: total,
        breakdown
    });

    return {
        total: cappedTotal,
        breakdown
    };
}

/**
 * Get a simplified performance bonus percentage for display.
 * @returns {number} Total bonus percentage (0-50)
 */
export function getPerformanceBonusPercent() {
    return getPerformanceBonus().total;
}

// =============================================================================
// STATE RESET
// =============================================================================

/**
 * Reset performance stats on new run.
 * Keeps pity counters but resets session-specific stats.
 */
export function resetPerformanceOnNewRun() {
    if (!isInitialized) return;

    // Reset session stats
    state.currentWinStreak = 0;
    state.sessionShotsFired = 0;
    state.sessionShotsHit = 0;
    state.consecutiveMisses = 0;
    state.accuracyPenaltyActive = false;
    state.flawlessRound = true;
    state.damageTakenThisRound = 0;
    state.heavyDamagePenalty = false;
    state.achievementJustUnlocked = false;
    state.currentRound = 1;

    // Note: pity counters persist across runs (roundsWithoutRare, roundsWithoutEpic, totalDuplicatesInRow)

    debugLog('Performance reset for new run');
}

/**
 * Reset all stats including pity counters (for full session reset).
 */
export function resetAll() {
    resetPerformanceOnNewRun();
    state.roundsWithoutRare = 0;
    state.roundsWithoutEpic = 0;
    state.totalDuplicatesInRow = 0;
    saveState();
    debugLog('Full performance reset');
}

// =============================================================================
// STATE ACCESS
// =============================================================================

/**
 * Get full state for debugging or display.
 * @returns {Object} Copy of current state
 */
export function getState() {
    return {
        ...state,
        sessionAccuracy: getSessionAccuracy()
    };
}

/**
 * Get performance summary for display (e.g., tooltip).
 * @returns {Object} Summary of performance factors
 */
export function getPerformanceSummary() {
    return {
        winStreak: state.currentWinStreak,
        accuracy: getSessionAccuracy(),
        isFlawless: state.flawlessRound,
        currentRound: state.currentRound,
        bonusPercent: getPerformanceBonusPercent(),
        penaltyActive: state.heavyDamagePenalty || state.accuracyPenaltyActive
    };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the performance tracking system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[PerformanceTracking] Already initialized');
        return;
    }

    // Load persisted pity state
    loadState();

    // Reset session state
    resetPerformanceOnNewRun();

    isInitialized = true;
    console.log('[PerformanceTracking] System initialized', {
        roundsWithoutRare: state.roundsWithoutRare,
        roundsWithoutEpic: state.roundsWithoutEpic
    });
}

/**
 * Clean up the performance tracking system.
 */
export function cleanup() {
    saveState();
    isInitialized = false;
    debugLog('System cleaned up');
}

// =============================================================================
// EXPORTS FOR CONSTANTS
// =============================================================================

export { PERFORMANCE_FACTORS, PERFORMANCE_PENALTIES, MAX_TOTAL_BONUS };
