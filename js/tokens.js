/**
 * Scorched Earth: Synthwave Edition
 * Token System
 *
 * Manages token currency used for supply drops.
 * Tokens are earned through achievements and gameplay milestones.
 * Persists to localStorage for cross-session retention.
 */

import { DEBUG } from './constants.js';
import { DIFFICULTY_TOKEN_REWARDS, onAchievementUnlock, getAchievement } from './achievements.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Token rewards for gameplay activities.
 */
const GAMEPLAY_TOKEN_REWARDS = {
    /** Tokens for winning a round */
    ROUND_WIN: 5,
    /** Tokens for flawless win (no damage taken) - replaces regular win reward */
    FLAWLESS_WIN: 10,
    /** Tokens for reaching round milestones (5, 10, 15, 20, 25) */
    ROUND_MILESTONE: 15,
    /** Bonus tokens for first win of session */
    FIRST_WIN_BONUS: 5,
    /** Bonus tokens for every 3rd consecutive win */
    WIN_STREAK_BONUS: 5
};

/**
 * Round milestones that award bonus tokens.
 */
const ROUND_MILESTONES = [5, 10, 15, 20, 25];

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'scorchedEarth_tokens';

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Token state tracking.
 */
const state = {
    /** Current token balance */
    balance: 0,
    /** Total tokens earned lifetime (for stats) */
    lifetimeEarned: 0,
    /** Total tokens spent lifetime (for stats) */
    lifetimeSpent: 0,
    /** Whether first win has occurred this session */
    hasWonThisSession: false,
    /** Current win streak count */
    currentWinStreak: 0,
    /** Milestones already awarded this run (to prevent duplicates) */
    milestonesAwardedThisRun: new Set()
};

/** Whether the module has been initialized */
let isInitialized = false;

/** Unsubscribe function for achievement callback */
let achievementUnsubscribe = null;

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
            console.log(`[Tokens] ${message}`, data);
        } else {
            console.log(`[Tokens] ${message}`);
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
            state.balance = parsed.balance || 0;
            state.lifetimeEarned = parsed.lifetimeEarned || 0;
            state.lifetimeSpent = parsed.lifetimeSpent || 0;
            debugLog('State loaded from localStorage', {
                balance: state.balance,
                lifetimeEarned: state.lifetimeEarned,
                lifetimeSpent: state.lifetimeSpent
            });
        }
    } catch (e) {
        console.warn('[Tokens] Failed to load state:', e);
    }
}

/**
 * Save state to localStorage.
 */
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            balance: state.balance,
            lifetimeEarned: state.lifetimeEarned,
            lifetimeSpent: state.lifetimeSpent
        }));
        debugLog('State saved to localStorage');
    } catch (e) {
        console.warn('[Tokens] Failed to save state:', e);
    }
}

// =============================================================================
// TOKEN OPERATIONS
// =============================================================================

/**
 * Get current token balance.
 * @returns {number} Current token balance
 */
export function getTokenBalance() {
    return state.balance;
}

/**
 * Get lifetime statistics.
 * @returns {Object} Lifetime stats
 */
export function getLifetimeStats() {
    return {
        earned: state.lifetimeEarned,
        spent: state.lifetimeSpent,
        balance: state.balance
    };
}

/**
 * Add tokens to balance.
 * @param {number} amount - Amount to add
 * @param {string} source - Source of tokens (for logging)
 * @returns {number} New balance after addition
 */
export function addTokens(amount, source) {
    if (amount <= 0) return state.balance;

    state.balance += amount;
    state.lifetimeEarned += amount;
    saveState();

    debugLog(`Tokens earned: +${amount}`, {
        source,
        newBalance: state.balance,
        lifetimeEarned: state.lifetimeEarned
    });

    return state.balance;
}

/**
 * Spend tokens from balance.
 * @param {number} amount - Amount to spend
 * @returns {boolean} True if successful, false if insufficient balance
 */
export function spendTokens(amount) {
    if (amount <= 0) return true;

    if (state.balance < amount) {
        debugLog('Insufficient tokens', {
            requested: amount,
            balance: state.balance
        });
        return false;
    }

    state.balance -= amount;
    state.lifetimeSpent += amount;
    saveState();

    debugLog(`Tokens spent: -${amount}`, {
        newBalance: state.balance,
        lifetimeSpent: state.lifetimeSpent
    });

    return true;
}

/**
 * Check if player can afford an amount.
 * @param {number} amount - Amount to check
 * @returns {boolean} True if balance >= amount
 */
export function canAfford(amount) {
    return state.balance >= amount;
}

// =============================================================================
// ACHIEVEMENT INTEGRATION
// =============================================================================

/**
 * Handle achievement unlock for token rewards.
 * Called automatically via achievement callback.
 * @param {Object} data - Achievement unlock data
 */
function onAchievementUnlocked(data) {
    if (!isInitialized) return;

    const { id, reward } = data;

    if (reward && reward > 0) {
        addTokens(reward, `Achievement: ${id}`);
    }
}

// =============================================================================
// GAMEPLAY REWARDS
// =============================================================================

/**
 * Award tokens for winning a round.
 * Handles regular wins, flawless wins, first win bonus, and streak bonus.
 *
 * @param {Object} options - Win options
 * @param {boolean} options.isFlawless - Whether no damage was taken
 * @param {number} options.roundNumber - Current round number
 * @returns {Object} Breakdown of tokens earned
 */
export function onRoundWin(options = {}) {
    if (!isInitialized) return { total: 0, breakdown: [] };

    const { isFlawless = false, roundNumber = 1 } = options;
    const breakdown = [];
    let total = 0;

    // --- Base Win Reward ---
    // Flawless wins get higher reward (not cumulative with regular)
    if (isFlawless) {
        addTokens(GAMEPLAY_TOKEN_REWARDS.FLAWLESS_WIN, 'Flawless round win');
        breakdown.push({ source: 'Flawless Win', amount: GAMEPLAY_TOKEN_REWARDS.FLAWLESS_WIN });
        total += GAMEPLAY_TOKEN_REWARDS.FLAWLESS_WIN;
    } else {
        addTokens(GAMEPLAY_TOKEN_REWARDS.ROUND_WIN, 'Round win');
        breakdown.push({ source: 'Round Win', amount: GAMEPLAY_TOKEN_REWARDS.ROUND_WIN });
        total += GAMEPLAY_TOKEN_REWARDS.ROUND_WIN;
    }

    // --- First Win of Session Bonus ---
    if (!state.hasWonThisSession) {
        state.hasWonThisSession = true;
        addTokens(GAMEPLAY_TOKEN_REWARDS.FIRST_WIN_BONUS, 'First win of session');
        breakdown.push({ source: 'First Win Bonus', amount: GAMEPLAY_TOKEN_REWARDS.FIRST_WIN_BONUS });
        total += GAMEPLAY_TOKEN_REWARDS.FIRST_WIN_BONUS;
    }

    // --- Win Streak Bonus ---
    state.currentWinStreak++;
    if (state.currentWinStreak > 0 && state.currentWinStreak % 3 === 0) {
        addTokens(GAMEPLAY_TOKEN_REWARDS.WIN_STREAK_BONUS, `Win streak (${state.currentWinStreak})`);
        breakdown.push({ source: `${state.currentWinStreak} Win Streak`, amount: GAMEPLAY_TOKEN_REWARDS.WIN_STREAK_BONUS });
        total += GAMEPLAY_TOKEN_REWARDS.WIN_STREAK_BONUS;
    }

    // --- Round Milestone Bonus ---
    if (ROUND_MILESTONES.includes(roundNumber) && !state.milestonesAwardedThisRun.has(roundNumber)) {
        state.milestonesAwardedThisRun.add(roundNumber);
        addTokens(GAMEPLAY_TOKEN_REWARDS.ROUND_MILESTONE, `Round ${roundNumber} milestone`);
        breakdown.push({ source: `Round ${roundNumber} Milestone`, amount: GAMEPLAY_TOKEN_REWARDS.ROUND_MILESTONE });
        total += GAMEPLAY_TOKEN_REWARDS.ROUND_MILESTONE;
    }

    debugLog('Round win tokens awarded', { total, breakdown, winStreak: state.currentWinStreak });

    return { total, breakdown };
}

/**
 * Handle round loss.
 * Resets win streak.
 */
export function onRoundLoss() {
    if (!isInitialized) return;

    if (state.currentWinStreak > 0) {
        debugLog('Win streak reset', { previousStreak: state.currentWinStreak });
    }
    state.currentWinStreak = 0;
}

/**
 * Handle new run starting.
 * Resets run-specific state.
 */
export function onRunStart() {
    if (!isInitialized) return;

    state.milestonesAwardedThisRun.clear();
    state.currentWinStreak = 0;
    debugLog('Run started - state reset');
}

/**
 * Handle session start (page load/refresh).
 * Resets session-specific state.
 */
export function onSessionStart() {
    state.hasWonThisSession = false;
    state.currentWinStreak = 0;
    debugLog('Session started - session state reset');
}

// =============================================================================
// STATE ACCESS (for debugging/display)
// =============================================================================

/**
 * Get current module state (for debugging).
 * @returns {Object} Current state copy
 */
export function getState() {
    return {
        ...state,
        milestonesAwardedThisRun: Array.from(state.milestonesAwardedThisRun)
    };
}

/**
 * Get win streak count.
 * @returns {number} Current win streak
 */
export function getWinStreak() {
    return state.currentWinStreak;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the token system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[Tokens] Already initialized');
        return;
    }

    // Load persisted state
    loadState();

    // Reset session state
    onSessionStart();

    // Register for achievement unlock notifications
    achievementUnsubscribe = onAchievementUnlock(onAchievementUnlocked);

    isInitialized = true;
    console.log('[Tokens] System initialized', {
        balance: state.balance,
        lifetimeEarned: state.lifetimeEarned
    });
}

/**
 * Clean up the token system.
 * Call before unloading if needed.
 */
export function cleanup() {
    if (achievementUnsubscribe) {
        achievementUnsubscribe();
        achievementUnsubscribe = null;
    }
    isInitialized = false;
    debugLog('System cleaned up');
}

// =============================================================================
// EXPORTS FOR CONSTANTS (useful for UI display)
// =============================================================================

export { GAMEPLAY_TOKEN_REWARDS, ROUND_MILESTONES };
