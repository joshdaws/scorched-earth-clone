/**
 * Scorched Earth: Synthwave Edition
 * Progression and Economy Achievement Detection
 *
 * Tracks round progression milestones and economy achievements.
 * Handles Survivor/Veteran/War Hero/Legend/Immortal progression
 * and Penny Saved/War Chest/Arms Dealer/Fully Loaded/Stockpile economy.
 */

import { DEBUG } from './constants.js';
import { unlockAchievement, isAchievementUnlocked } from './achievements.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Round milestone thresholds for progression achievements.
 */
const ROUND_MILESTONES = {
    SURVIVOR: 5,
    VETERAN: 10,
    WAR_HERO: 15,
    LEGEND: 20,
    IMMORTAL: 25
};

/**
 * Achievement IDs for round progression.
 */
const ROUND_ACHIEVEMENTS = {
    5: 'survivor',
    10: 'veteran',
    15: 'war_hero',
    20: 'legend',
    25: 'immortal'
};

/**
 * Lifetime money thresholds for economy achievements.
 */
const MONEY_THRESHOLDS = {
    PENNY_SAVED: 5000,
    WAR_CHEST: 10000,
    ARMS_DEALER: 25000
};

/**
 * All weapon IDs that count toward Fully Loaded.
 * Excludes basic-shot since it's always available.
 */
const ALL_WEAPONS = [
    'missile',
    'big-shot',
    'mirv',
    'deaths-head',
    'roller',
    'heavy-roller',
    'digger',
    'heavy-digger',
    'mini-nuke',
    'nuke'
];

/**
 * Total weapons needed for Stockpile achievement.
 */
const STOCKPILE_THRESHOLD = 50;

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Persistent state stored in localStorage.
 */
const STORAGE_KEY = 'scorchedEarth_progressionAchievements';

/**
 * State tracking for progression and economy achievements.
 */
const state = {
    /** Lifetime total money earned (persisted) */
    lifetimeMoneyEarned: 0,
    /** Highest round reached (for tracking, though achievements use current round) */
    highestRoundReached: 0
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
            console.log(`[ProgressionAchievements] ${message}`, data);
        } else {
            console.log(`[ProgressionAchievements] ${message}`);
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
            state.lifetimeMoneyEarned = parsed.lifetimeMoneyEarned || 0;
            state.highestRoundReached = parsed.highestRoundReached || 0;
            debugLog('State loaded from localStorage', state);
        }
    } catch (e) {
        console.warn('[ProgressionAchievements] Failed to load state:', e);
    }
}

/**
 * Save state to localStorage.
 */
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            lifetimeMoneyEarned: state.lifetimeMoneyEarned,
            highestRoundReached: state.highestRoundReached
        }));
        debugLog('State saved to localStorage');
    } catch (e) {
        console.warn('[ProgressionAchievements] Failed to save state:', e);
    }
}

// =============================================================================
// STATE ACCESS
// =============================================================================

/**
 * Get current progression state (for debugging).
 * @returns {Object} Current state copy
 */
export function getState() {
    return { ...state };
}

/**
 * Get lifetime money earned.
 * @returns {number} Total money earned across all runs
 */
export function getLifetimeMoneyEarned() {
    return state.lifetimeMoneyEarned;
}

// =============================================================================
// ACHIEVEMENT DETECTION CALLBACKS
// =============================================================================

/**
 * Record when a round is started/reached.
 * Checks for round milestone achievements.
 *
 * @param {number} roundNumber - The round number reached
 */
export function onRoundReached(roundNumber) {
    if (!isInitialized) return;

    debugLog('Round reached', { roundNumber });

    // Track highest round
    if (roundNumber > state.highestRoundReached) {
        state.highestRoundReached = roundNumber;
        saveState();
    }

    // Check each round milestone
    for (const [milestone, achievementId] of Object.entries(ROUND_ACHIEVEMENTS)) {
        const milestoneNum = parseInt(milestone, 10);
        if (roundNumber >= milestoneNum && !isAchievementUnlocked(achievementId)) {
            debugLog(`Unlocking ${achievementId} achievement (reached round ${roundNumber})`, {
                milestone: milestoneNum
            });
            unlockAchievement(achievementId);
        }
    }
}

/**
 * Record money earned during gameplay.
 * Tracks lifetime total and checks economy achievements.
 *
 * @param {number} amount - Amount of money earned
 */
export function onMoneyEarned(amount) {
    if (!isInitialized) return;
    if (amount <= 0) return;

    state.lifetimeMoneyEarned += amount;
    saveState();

    debugLog('Money earned', {
        amount,
        lifetimeTotal: state.lifetimeMoneyEarned
    });

    // --- Penny Saved Achievement ---
    // Accumulate $5,000 lifetime
    if (state.lifetimeMoneyEarned >= MONEY_THRESHOLDS.PENNY_SAVED &&
        !isAchievementUnlocked('penny_saved')) {
        debugLog('Unlocking Penny Saved achievement', {
            lifetime: state.lifetimeMoneyEarned,
            threshold: MONEY_THRESHOLDS.PENNY_SAVED
        });
        unlockAchievement('penny_saved');
    }

    // --- War Chest Achievement ---
    // Accumulate $10,000 lifetime
    if (state.lifetimeMoneyEarned >= MONEY_THRESHOLDS.WAR_CHEST &&
        !isAchievementUnlocked('war_chest')) {
        debugLog('Unlocking War Chest achievement', {
            lifetime: state.lifetimeMoneyEarned,
            threshold: MONEY_THRESHOLDS.WAR_CHEST
        });
        unlockAchievement('war_chest');
    }

    // --- Arms Dealer Achievement ---
    // Accumulate $25,000 lifetime
    if (state.lifetimeMoneyEarned >= MONEY_THRESHOLDS.ARMS_DEALER &&
        !isAchievementUnlocked('arms_dealer')) {
        debugLog('Unlocking Arms Dealer achievement', {
            lifetime: state.lifetimeMoneyEarned,
            threshold: MONEY_THRESHOLDS.ARMS_DEALER
        });
        unlockAchievement('arms_dealer');
    }
}

/**
 * Check player inventory for economy achievements.
 * Call this after purchases or inventory changes.
 *
 * @param {Object} inventory - Player's weapon inventory (weaponId -> count)
 */
export function onInventoryChanged(inventory) {
    if (!isInitialized) return;
    if (!inventory) return;

    debugLog('Inventory check', { inventory });

    // --- Fully Loaded Achievement ---
    // Own at least 1 of every weapon type
    if (!isAchievementUnlocked('fully_loaded')) {
        const hasAllWeapons = ALL_WEAPONS.every(weaponId => {
            const count = inventory[weaponId] || 0;
            return count > 0;
        });

        if (hasAllWeapons) {
            debugLog('Unlocking Fully Loaded achievement - owns all weapon types!');
            unlockAchievement('fully_loaded');
        }
    }

    // --- Stockpile Achievement ---
    // Own 50+ total weapons (excluding basic-shot which is infinite)
    if (!isAchievementUnlocked('stockpile')) {
        let totalWeapons = 0;
        for (const [weaponId, count] of Object.entries(inventory)) {
            // Exclude basic-shot (infinite) and ensure count is finite
            if (weaponId !== 'basic-shot' && Number.isFinite(count)) {
                totalWeapons += count;
            }
        }

        if (totalWeapons >= STOCKPILE_THRESHOLD) {
            debugLog('Unlocking Stockpile achievement', {
                totalWeapons,
                threshold: STOCKPILE_THRESHOLD
            });
            unlockAchievement('stockpile');
        }
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the progression achievements system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[ProgressionAchievements] Already initialized');
        return;
    }

    loadState();
    isInitialized = true;
    console.log('[ProgressionAchievements] System initialized', {
        lifetimeMoneyEarned: state.lifetimeMoneyEarned,
        highestRoundReached: state.highestRoundReached
    });
}
