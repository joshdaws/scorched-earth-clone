/**
 * Scorched Earth: Synthwave Edition
 * Star System - Calculation and persistence for level star ratings
 *
 * Star Criteria:
 * - 1 Star: Win the match
 * - 2 Stars: Win + deal X damage (efficiency bonus, defined per level)
 * - 3 Stars: Win + >= 70% accuracy + complete in Y turns (defined per level)
 */

import { LevelRegistry, LEVEL_CONSTANTS } from './levels.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'scorched_earth_stars';

// Default accuracy threshold for 3 stars (levels can override via star3Accuracy)
const DEFAULT_ACCURACY_THRESHOLD = 0.70;

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * In-memory cache of star data.
 * Map of levelId -> star count (0-3)
 * @type {Map<string, number>}
 */
let starCache = new Map();

/**
 * Whether the cache has been loaded from localStorage.
 * @type {boolean}
 */
let cacheLoaded = false;

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Load stars from localStorage into cache.
 */
function loadFromStorage() {
    if (cacheLoaded) return;

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            // data is expected to be { levels: { [levelId]: starCount } }
            if (data && data.levels) {
                starCache = new Map(Object.entries(data.levels));
            }
        }
    } catch (e) {
        console.warn('Failed to load star data from localStorage:', e);
        starCache = new Map();
    }

    cacheLoaded = true;
}

/**
 * Save current star cache to localStorage.
 */
function saveToStorage() {
    try {
        const data = {
            version: 1,
            levels: Object.fromEntries(starCache),
            lastUpdated: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save star data to localStorage:', e);
    }
}

/**
 * Ensure cache is loaded before any operation.
 */
function ensureLoaded() {
    if (!cacheLoaded) {
        loadFromStorage();
    }
}

// =============================================================================
// STAR CALCULATION
// =============================================================================

/**
 * Calculate stars earned for a level completion.
 *
 * @param {string} levelId - The level ID (e.g., 'world1-level3')
 * @param {object} stats - Performance statistics
 * @param {number} stats.damageDealt - Total damage dealt to enemy
 * @param {number} stats.accuracy - Hit accuracy (0.0 - 1.0)
 * @param {number} stats.turnsUsed - Number of turns taken to complete
 * @param {boolean} stats.won - Whether the player won the match
 * @returns {object} Result with stars earned and breakdown
 */
function calculate(levelId, stats) {
    const { damageDealt = 0, accuracy = 0, turnsUsed = Infinity, won = false } = stats;

    // Must win to earn any stars
    if (!won) {
        return {
            stars: 0,
            breakdown: {
                won: false,
                damageCheck: false,
                accuracyCheck: false,
                turnsCheck: false
            },
            message: 'Defeat - no stars earned'
        };
    }

    // Get level definition for thresholds
    const level = LevelRegistry.getLevel(levelId);
    if (!level) {
        console.warn(`Unknown level ID: ${levelId}`);
        return {
            stars: 1,
            breakdown: {
                won: true,
                damageCheck: false,
                accuracyCheck: false,
                turnsCheck: false
            },
            message: 'Victory! (level data unavailable)'
        };
    }

    // Extract thresholds from level definition
    const damageThreshold = level.star2Damage || 0;
    const accuracyThreshold = level.star3Accuracy || DEFAULT_ACCURACY_THRESHOLD;
    const turnThreshold = level.star3MaxTurns || Infinity;

    // Check each criterion
    const damageCheck = damageDealt >= damageThreshold;
    const accuracyCheck = accuracy >= accuracyThreshold;
    const turnsCheck = turnsUsed <= turnThreshold;

    // Calculate stars
    let stars = 1; // Base star for winning

    if (damageCheck) {
        stars = 2; // Efficiency bonus
    }

    if (damageCheck && accuracyCheck && turnsCheck) {
        stars = 3; // Perfect performance
    }

    // Build result message
    let message = '';
    if (stars === 3) {
        message = 'Perfect! All criteria met!';
    } else if (stars === 2) {
        message = 'Great efficiency!';
    } else {
        message = 'Victory!';
    }

    return {
        stars,
        breakdown: {
            won: true,
            damageCheck,
            accuracyCheck,
            turnsCheck,
            damageDealt,
            damageThreshold,
            accuracy: Math.round(accuracy * 100),
            accuracyThreshold: Math.round(accuracyThreshold * 100),
            turnsUsed,
            turnThreshold
        },
        message
    };
}

// =============================================================================
// STAR QUERIES
// =============================================================================

/**
 * Get the star count for a specific level.
 *
 * @param {string} levelId - The level ID
 * @returns {number} Star count (0-3)
 */
function getForLevel(levelId) {
    ensureLoaded();
    return starCache.get(levelId) || 0;
}

/**
 * Get the total stars earned across all levels.
 *
 * @returns {number} Total star count
 */
function getTotalStars() {
    ensureLoaded();
    let total = 0;
    for (const stars of starCache.values()) {
        total += stars;
    }
    return total;
}

/**
 * Get stars for all levels in a world.
 *
 * @param {number} worldNum - World number (1-6)
 * @returns {object} Object with levelId -> stars mapping and totals
 */
function getWorldStars(worldNum) {
    ensureLoaded();

    const levels = LevelRegistry.getLevelsByWorld(worldNum);
    const result = {
        levels: {},
        earned: 0,
        possible: levels.length * LEVEL_CONSTANTS.MAX_STARS_PER_LEVEL
    };

    for (const level of levels) {
        const stars = starCache.get(level.id) || 0;
        result.levels[level.id] = stars;
        result.earned += stars;
    }

    return result;
}

/**
 * Get a summary of all star progress.
 *
 * @returns {object} Progress summary with per-world and total stats
 */
function getProgress() {
    ensureLoaded();

    const summary = {
        worlds: {},
        totalEarned: 0,
        totalPossible: LEVEL_CONSTANTS.MAX_STARS_TOTAL,
        completedLevels: 0,
        perfectLevels: 0
    };

    for (let w = 1; w <= LEVEL_CONSTANTS.WORLDS; w++) {
        const worldStars = getWorldStars(w);
        summary.worlds[w] = worldStars;
        summary.totalEarned += worldStars.earned;

        // Count completed and perfect levels
        for (const stars of Object.values(worldStars.levels)) {
            if (stars > 0) summary.completedLevels++;
            if (stars === 3) summary.perfectLevels++;
        }
    }

    return summary;
}

// =============================================================================
// STAR MUTATIONS
// =============================================================================

/**
 * Set stars for a level. Only saves if the new count is higher than existing.
 *
 * @param {string} levelId - The level ID
 * @param {number} stars - Star count to set (1-3)
 * @returns {boolean} Whether the stars were updated (true if new high score)
 */
function setForLevel(levelId, stars) {
    ensureLoaded();

    // Validate input
    if (stars < 0 || stars > LEVEL_CONSTANTS.MAX_STARS_PER_LEVEL) {
        console.warn(`Invalid star count: ${stars}. Must be 0-${LEVEL_CONSTANTS.MAX_STARS_PER_LEVEL}`);
        return false;
    }

    // Only update if this is a new high score for this level
    const currentStars = starCache.get(levelId) || 0;
    if (stars > currentStars) {
        starCache.set(levelId, stars);
        saveToStorage();
        return true;
    }

    return false;
}

/**
 * Record a level completion and return the result.
 * Combines calculate() and setForLevel() into one operation.
 *
 * @param {string} levelId - The level ID
 * @param {object} stats - Performance statistics (same as calculate())
 * @returns {object} Result including stars, breakdown, and whether it was a new record
 */
function recordCompletion(levelId, stats) {
    const result = calculate(levelId, stats);
    const isNewRecord = result.stars > 0 && setForLevel(levelId, result.stars);

    return {
        ...result,
        isNewRecord,
        previousBest: getForLevel(levelId)
    };
}

// =============================================================================
// WORLD UNLOCK CHECKS
// =============================================================================

/**
 * Check if a world is unlocked based on total stars earned.
 *
 * @param {number} worldNum - World number (1-6)
 * @returns {boolean} Whether the world is unlocked
 */
function isWorldUnlocked(worldNum) {
    ensureLoaded();

    const threshold = LEVEL_CONSTANTS.STAR_THRESHOLDS[worldNum];
    if (threshold === undefined) {
        console.warn(`Unknown world number: ${worldNum}`);
        return false;
    }

    return getTotalStars() >= threshold;
}

/**
 * Get the unlock status for all worlds.
 *
 * @returns {object} Object mapping world numbers to unlock info
 */
function getWorldUnlockStatus() {
    ensureLoaded();

    const totalStars = getTotalStars();
    const status = {};

    for (let w = 1; w <= LEVEL_CONSTANTS.WORLDS; w++) {
        const threshold = LEVEL_CONSTANTS.STAR_THRESHOLDS[w];
        status[w] = {
            unlocked: totalStars >= threshold,
            threshold,
            starsNeeded: Math.max(0, threshold - totalStars)
        };
    }

    return status;
}

/**
 * Get the next locked world and stars needed to unlock it.
 *
 * @returns {object|null} Next locked world info, or null if all unlocked
 */
function getNextLockedWorld() {
    ensureLoaded();

    const totalStars = getTotalStars();

    for (let w = 1; w <= LEVEL_CONSTANTS.WORLDS; w++) {
        const threshold = LEVEL_CONSTANTS.STAR_THRESHOLDS[w];
        if (totalStars < threshold) {
            return {
                world: w,
                threshold,
                starsNeeded: threshold - totalStars,
                currentStars: totalStars
            };
        }
    }

    return null; // All worlds unlocked
}

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Reset all star progress. Use with caution!
 */
function resetAll() {
    starCache = new Map();
    cacheLoaded = true;
    saveToStorage();
}

/**
 * Force reload from localStorage.
 */
function reload() {
    cacheLoaded = false;
    loadFromStorage();
}

/**
 * Get raw star data (for debugging).
 *
 * @returns {object} Raw star data
 */
function getRawData() {
    ensureLoaded();
    return Object.fromEntries(starCache);
}

// =============================================================================
// PUBLIC API
// =============================================================================

export const Stars = {
    // Core calculation
    calculate,

    // Level queries
    getForLevel,
    getTotalStars,
    getWorldStars,
    getProgress,

    // Level mutations
    setForLevel,
    recordCompletion,

    // World unlock checks
    isWorldUnlocked,
    getWorldUnlockStatus,
    getNextLockedWorld,

    // Utility
    resetAll,
    reload,
    getRawData
};

// Also export individual functions for flexibility
export {
    calculate,
    getForLevel,
    getTotalStars,
    getWorldStars,
    getProgress,
    setForLevel,
    recordCompletion,
    isWorldUnlocked,
    getWorldUnlockStatus,
    getNextLockedWorld,
    resetAll,
    reload,
    getRawData
};

// Export constants for testing
export { STORAGE_KEY };
