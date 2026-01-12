/**
 * Scorched Earth: Synthwave Edition
 * Pity System - Bad Luck Protection
 *
 * Prevents extended bad luck streaks with guaranteed rarity upgrades.
 * Tracks drops without rare/epic and applies progressive bonuses.
 */

import { DEBUG } from './constants.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'scorchedEarth_pityState';

/**
 * Rare+ pity thresholds and bonuses.
 * | Drops Without Rare+ | Bonus |
 * |---------------------|-------|
 * | 5                   | +5%   |
 * | 10                  | +15%  |
 * | 15                  | +30%  |
 * | 20                  | Guaranteed Rare or better |
 */
const RARE_PITY_THRESHOLDS = [
    { drops: 5, bonus: 5 },
    { drops: 10, bonus: 15 },
    { drops: 15, bonus: 30 },
    { drops: 20, bonus: 100 } // 100 = guaranteed
];

/**
 * Epic+ pity thresholds and bonuses.
 * | Drops Without Epic+ | Bonus |
 * |---------------------|-------|
 * | 15                  | +2%   |
 * | 25                  | +5%   |
 * | 35                  | +10%  |
 * | 50                  | Guaranteed Epic or better |
 */
const EPIC_PITY_THRESHOLDS = [
    { drops: 15, bonus: 2 },
    { drops: 25, bonus: 5 },
    { drops: 35, bonus: 10 },
    { drops: 50, bonus: 100 } // 100 = guaranteed
];

/**
 * Guaranteed drop thresholds.
 */
const GUARANTEED_THRESHOLDS = {
    RARE: 20,
    EPIC: 50
};

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Pity state tracking.
 */
const state = {
    /** Consecutive drops without a Rare or better */
    dropsWithoutRare: 0,
    /** Consecutive drops without an Epic or better */
    dropsWithoutEpic: 0
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
            console.log(`[PitySystem] ${message}`, data);
        } else {
            console.log(`[PitySystem] ${message}`);
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
            state.dropsWithoutRare = parsed.dropsWithoutRare || 0;
            state.dropsWithoutEpic = parsed.dropsWithoutEpic || 0;
            debugLog('State loaded from localStorage', {
                dropsWithoutRare: state.dropsWithoutRare,
                dropsWithoutEpic: state.dropsWithoutEpic
            });
        }
    } catch (e) {
        console.warn('[PitySystem] Failed to load state:', e);
        state.dropsWithoutRare = 0;
        state.dropsWithoutEpic = 0;
    }
}

/**
 * Save state to localStorage.
 */
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            dropsWithoutRare: state.dropsWithoutRare,
            dropsWithoutEpic: state.dropsWithoutEpic
        }));
        debugLog('State saved to localStorage');
    } catch (e) {
        console.warn('[PitySystem] Failed to save state:', e);
    }
}

// =============================================================================
// PITY BONUS CALCULATION
// =============================================================================

/**
 * Calculate pity bonus based on drops without a rarity tier.
 *
 * @param {number} dropsWithout - Number of drops without the target rarity
 * @param {Array} thresholds - Array of {drops, bonus} threshold objects
 * @returns {number} Bonus percentage to add to drop rates
 */
function calculatePityBonus(dropsWithout, thresholds) {
    let bonus = 0;

    for (const threshold of thresholds) {
        if (dropsWithout >= threshold.drops) {
            bonus = threshold.bonus;
        }
    }

    return bonus;
}

/**
 * Get the pity bonus for Rare+ drops.
 *
 * @returns {number} Bonus percentage for rare+ chance
 */
export function getRarePityBonus() {
    const bonus = calculatePityBonus(state.dropsWithoutRare, RARE_PITY_THRESHOLDS);
    // Cap at 30% for non-guaranteed (guaranteed is handled separately)
    return Math.min(bonus, 30);
}

/**
 * Get the pity bonus for Epic+ drops.
 *
 * @returns {number} Bonus percentage for epic+ chance
 */
export function getEpicPityBonus() {
    const bonus = calculatePityBonus(state.dropsWithoutEpic, EPIC_PITY_THRESHOLDS);
    // Cap at 10% for non-guaranteed (guaranteed is handled separately)
    return Math.min(bonus, 10);
}

/**
 * Get total pity bonus breakdown.
 * Used for display and integration with drop rate calculation.
 *
 * @returns {Object} Pity bonus info
 * @property {number} rarePlus - Bonus for rare+ chance
 * @property {number} epicPlus - Bonus for epic+ chance
 * @property {boolean} guaranteedRare - Whether next drop is guaranteed rare+
 * @property {boolean} guaranteedEpic - Whether next drop is guaranteed epic+
 */
export function getPityBonus() {
    return {
        rarePlus: getRarePityBonus(),
        epicPlus: getEpicPityBonus(),
        guaranteedRare: isGuaranteedRare(),
        guaranteedEpic: isGuaranteedEpic()
    };
}

// =============================================================================
// GUARANTEED RARITY CHECKS
// =============================================================================

/**
 * Check if the next drop should be guaranteed Rare or better.
 *
 * @returns {boolean} True if guaranteed rare+
 */
export function isGuaranteedRare() {
    return state.dropsWithoutRare >= GUARANTEED_THRESHOLDS.RARE;
}

/**
 * Check if the next drop should be guaranteed Epic or better.
 *
 * @returns {boolean} True if guaranteed epic+
 */
export function isGuaranteedEpic() {
    return state.dropsWithoutEpic >= GUARANTEED_THRESHOLDS.EPIC;
}

/**
 * Get the minimum rarity for the next drop based on pity.
 *
 * @returns {string|null} Minimum rarity ('rare', 'epic') or null if no minimum
 */
export function getMinimumRarity() {
    if (isGuaranteedEpic()) {
        return 'epic';
    }
    if (isGuaranteedRare()) {
        return 'rare';
    }
    return null;
}

// =============================================================================
// DROP TRACKING
// =============================================================================

/**
 * Update pity counters based on a drop result.
 * Call this after each supply drop to update pity state.
 *
 * @param {string} rarity - The rarity that was dropped ('common', 'uncommon', 'rare', 'epic', 'legendary')
 */
export function onDropResult(rarity) {
    if (!isInitialized) return;

    const rarityLower = rarity.toLowerCase();
    const isRarePlus = ['rare', 'epic', 'legendary'].includes(rarityLower);
    const isEpicPlus = ['epic', 'legendary'].includes(rarityLower);

    // Update dropsWithoutRare
    if (isRarePlus) {
        if (state.dropsWithoutRare > 0) {
            debugLog('Rare+ obtained, resetting rare pity counter', {
                previousCount: state.dropsWithoutRare,
                rarity: rarityLower
            });
        }
        state.dropsWithoutRare = 0;
    } else {
        state.dropsWithoutRare++;
        debugLog('Common/Uncommon drop, incrementing rare pity counter', {
            dropsWithoutRare: state.dropsWithoutRare
        });
    }

    // Update dropsWithoutEpic
    if (isEpicPlus) {
        if (state.dropsWithoutEpic > 0) {
            debugLog('Epic+ obtained, resetting epic pity counter', {
                previousCount: state.dropsWithoutEpic,
                rarity: rarityLower
            });
        }
        state.dropsWithoutEpic = 0;
    } else {
        state.dropsWithoutEpic++;
        debugLog('Below Epic drop, incrementing epic pity counter', {
            dropsWithoutEpic: state.dropsWithoutEpic
        });
    }

    saveState();
}

// =============================================================================
// STATE ACCESS
// =============================================================================

/**
 * Get current pity state.
 *
 * @returns {Object} Current pity counters
 */
export function getPityState() {
    return {
        dropsWithoutRare: state.dropsWithoutRare,
        dropsWithoutEpic: state.dropsWithoutEpic
    };
}

/**
 * Get pity progress for display.
 * Shows how close player is to guaranteed drops.
 *
 * @returns {Object} Progress info
 */
export function getPityProgress() {
    return {
        rare: {
            current: state.dropsWithoutRare,
            threshold: GUARANTEED_THRESHOLDS.RARE,
            progress: Math.min(1, state.dropsWithoutRare / GUARANTEED_THRESHOLDS.RARE),
            bonus: getRarePityBonus(),
            nextBonus: getNextRareThreshold()
        },
        epic: {
            current: state.dropsWithoutEpic,
            threshold: GUARANTEED_THRESHOLDS.EPIC,
            progress: Math.min(1, state.dropsWithoutEpic / GUARANTEED_THRESHOLDS.EPIC),
            bonus: getEpicPityBonus(),
            nextBonus: getNextEpicThreshold()
        }
    };
}

/**
 * Get the next rare pity threshold info.
 * @returns {Object|null} Next threshold or null if at max
 */
function getNextRareThreshold() {
    for (const threshold of RARE_PITY_THRESHOLDS) {
        if (state.dropsWithoutRare < threshold.drops) {
            return {
                dropsNeeded: threshold.drops - state.dropsWithoutRare,
                bonus: threshold.bonus,
                isGuaranteed: threshold.drops >= GUARANTEED_THRESHOLDS.RARE
            };
        }
    }
    return null; // Already at or past all thresholds
}

/**
 * Get the next epic pity threshold info.
 * @returns {Object|null} Next threshold or null if at max
 */
function getNextEpicThreshold() {
    for (const threshold of EPIC_PITY_THRESHOLDS) {
        if (state.dropsWithoutEpic < threshold.drops) {
            return {
                dropsNeeded: threshold.drops - state.dropsWithoutEpic,
                bonus: threshold.bonus,
                isGuaranteed: threshold.drops >= GUARANTEED_THRESHOLDS.EPIC
            };
        }
    }
    return null;
}

/**
 * Check if luck is "building" (any pity progress).
 * Used for subtle UI hint.
 *
 * @returns {boolean} True if pity counters are accumulating
 */
export function isLuckBuilding() {
    return state.dropsWithoutRare >= 3 || state.dropsWithoutEpic >= 10;
}

/**
 * Get a display message for pity status.
 * Returns null if no significant pity progress.
 *
 * @returns {string|null} Display message or null
 */
export function getPityDisplayMessage() {
    if (isGuaranteedEpic()) {
        return 'GUARANTEED EPIC+!';
    }
    if (isGuaranteedRare()) {
        return 'GUARANTEED RARE+!';
    }
    if (state.dropsWithoutRare >= 15) {
        return 'Luck building... (+30% Rare)';
    }
    if (state.dropsWithoutRare >= 10) {
        return 'Luck building... (+15% Rare)';
    }
    if (state.dropsWithoutRare >= 5) {
        return 'Luck building...';
    }
    return null;
}

// =============================================================================
// RESET FUNCTIONS
// =============================================================================

/**
 * Reset all pity counters.
 * Use sparingly - typically only for debug/testing.
 */
export function resetPity() {
    state.dropsWithoutRare = 0;
    state.dropsWithoutEpic = 0;
    saveState();
    debugLog('Pity counters reset');
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the pity system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[PitySystem] Already initialized');
        return;
    }

    loadState();
    isInitialized = true;

    console.log('[PitySystem] System initialized', {
        dropsWithoutRare: state.dropsWithoutRare,
        dropsWithoutEpic: state.dropsWithoutEpic,
        pityBonus: getPityBonus()
    });
}

/**
 * Clean up the pity system.
 */
export function cleanup() {
    saveState();
    isInitialized = false;
    debugLog('System cleaned up');
}

// =============================================================================
// EXPORTS FOR CONSTANTS
// =============================================================================

export {
    RARE_PITY_THRESHOLDS,
    EPIC_PITY_THRESHOLDS,
    GUARANTEED_THRESHOLDS
};
