/**
 * Scorched Earth: Synthwave Edition
 * High Score Storage
 *
 * Manages persistent storage of high scores and lifetime statistics using
 * localStorage. Maintains a top 10 leaderboard sorted by rounds survived.
 */

import { DEBUG } from './constants.js';
import * as ConvexAPI from './convex-api.js';

// =============================================================================
// STORAGE KEYS
// =============================================================================

/**
 * localStorage keys for persistent data.
 * @type {Object}
 */
const STORAGE_KEYS = {
    HIGH_SCORES: 'scorched_earth_high_scores',
    LIFETIME_STATS: 'scorched_earth_lifetime_stats',
    MIGRATED_TO_CONVEX: 'scorched_earth_migrated_to_convex'
};

/**
 * Maximum number of high scores to keep.
 * @type {number}
 */
const MAX_HIGH_SCORES = 10;

// =============================================================================
// DEFAULT STRUCTURES
// =============================================================================

/**
 * Default lifetime stats structure.
 * @type {Object}
 */
const DEFAULT_LIFETIME_STATS = {
    totalRuns: 0,
    totalRoundsPlayed: 0,
    lifetimeDamage: 0,
    lifetimeEnemiesDestroyed: 0,
    bestRound: 0,
    totalShotsFired: 0,
    totalShotsHit: 0,
    lifetimeMoneyEarned: 0,
    firstPlayDate: null,
    lastPlayDate: null
};


// =============================================================================
// GLOBAL LEADERBOARD CACHE
// =============================================================================

/**
 * Cached global leaderboard data
 * @type {Array|null}
 */
let globalLeaderboardCache = null;

/**
 * Timestamp of last leaderboard fetch
 * @type {number}
 */
let lastLeaderboardFetch = 0;

/**
 * How long to cache leaderboard data (5 minutes)
 * @type {number}
 */
const LEADERBOARD_CACHE_TTL = 5 * 60 * 1000;

/**
 * Whether we're currently fetching the leaderboard
 * @type {boolean}
 */
let isLeaderboardFetching = false;

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
            console.log(`[HighScores] ${message}`, data);
        } else {
            console.log(`[HighScores] ${message}`);
        }
    }
}

// =============================================================================
// STORAGE HELPERS
// =============================================================================

/**
 * Check if localStorage is available.
 * @returns {boolean} True if localStorage can be used
 */
function isStorageAvailable() {
    try {
        return typeof localStorage !== 'undefined';
    } catch {
        return false;
    }
}

/**
 * Safely parse JSON from localStorage.
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed value or default
 */
function safeGetItem(key, defaultValue) {
    if (!isStorageAvailable()) {
        return defaultValue;
    }
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue;
        }
        return JSON.parse(item);
    } catch (error) {
        console.warn(`[HighScores] Failed to parse ${key}, using default:`, error);
        return defaultValue;
    }
}

/**
 * Safely stringify and save to localStorage.
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} True if save succeeded
 */
function safeSetItem(key, value) {
    if (!isStorageAvailable()) {
        return false;
    }
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[HighScores] Failed to save ${key}:`, error);
        return false;
    }
}

// =============================================================================
// HIGH SCORE MANAGEMENT
// =============================================================================

/**
 * Get all high scores, sorted by rounds survived (descending).
 * @returns {Array} Array of high score entries
 */
export function getHighScores() {
    const scores = safeGetItem(STORAGE_KEYS.HIGH_SCORES, []);

    // Ensure valid structure and sort
    return scores
        .filter(entry => entry && typeof entry.roundsSurvived === 'number')
        .sort((a, b) => {
            // Primary: rounds survived (desc)
            if (b.roundsSurvived !== a.roundsSurvived) {
                return b.roundsSurvived - a.roundsSurvived;
            }
            // Tiebreaker: total damage (desc)
            return (b.totalDamage || 0) - (a.totalDamage || 0);
        })
        .slice(0, MAX_HIGH_SCORES);
}

/**
 * Get the best run (highest rounds survived).
 * @returns {Object|null} Best high score entry, or null if none
 */
export function getBestRun() {
    const scores = getHighScores();
    return scores.length > 0 ? scores[0] : null;
}

/**
 * Get the highest number of rounds survived.
 * @returns {number} Best round count (0 if no scores)
 */
export function getBestRoundCount() {
    const best = getBestRun();
    return best ? best.roundsSurvived : 0;
}

/**
 * Check if a round count would make the top 10.
 * @param {number} rounds - Rounds survived to check
 * @returns {boolean} True if this would be a new high score
 */
export function isNewHighScore(rounds) {
    const scores = getHighScores();

    // If less than 10 scores, any score qualifies
    if (scores.length < MAX_HIGH_SCORES) {
        return true;
    }

    // Check if better than lowest score in top 10
    const lowestScore = scores[scores.length - 1];
    return rounds > lowestScore.roundsSurvived;
}

/**
 * Check if a round count is the new best (beats #1).
 * @param {number} rounds - Rounds survived to check
 * @returns {boolean} True if this is the new top score
 */
export function isNewBestScore(rounds) {
    return rounds > getBestRoundCount();
}

/**
 * Save a high score entry if it qualifies for top 10.
 * @param {Object} runStats - Run statistics from runState module
 * @returns {Object} Result with { saved: boolean, rank: number|null, isNewBest: boolean }
 */
export function saveHighScore(runStats) {
    const {
        roundsSurvived,
        totalDamageDealt,
        enemiesDestroyed,
        shotsFired,
        shotsHit,
        moneyEarned,
        biggestHit
    } = runStats;

    // Check if qualifies for local top 10
    const qualifiesLocally = isNewHighScore(roundsSurvived);
    const isNewBest = isNewBestScore(roundsSurvived);

    // Create entry
    const entry = {
        roundsSurvived,
        totalDamage: totalDamageDealt,
        enemiesDestroyed,
        shotsFired,
        shotsHit,
        hitRate: shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0,
        moneyEarned,
        biggestHit,
        timestamp: Date.now()
    };

    let saved = false;
    let rank = null;

    // Save locally if qualifies for top 10
    if (qualifiesLocally) {
        const scores = getHighScores();
        scores.push(entry);

        // Sort and trim to top 10
        const sortedScores = scores
            .sort((a, b) => {
                if (b.roundsSurvived !== a.roundsSurvived) {
                    return b.roundsSurvived - a.roundsSurvived;
                }
                return (b.totalDamage || 0) - (a.totalDamage || 0);
            })
            .slice(0, MAX_HIGH_SCORES);

        // Find rank of new entry
        rank = sortedScores.findIndex(
            s => s.timestamp === entry.timestamp && s.roundsSurvived === entry.roundsSurvived
        );

        // Save to localStorage
        saved = safeSetItem(STORAGE_KEYS.HIGH_SCORES, sortedScores);

        if (saved) {
            debugLog('High score saved locally', { rank: rank + 1, entry, isNewBest });
        }

        rank = saved ? rank + 1 : null;
    }

    // Submit to Convex backend (async, don't block)
    // All scores are submitted to the global leaderboard, regardless of local ranking
    submitScoreToConvex(runStats).catch(err => {
        debugLog('Convex score submission failed (will retry later)', err);
    });

    return {
        saved,
        rank,
        isNewBest
    };
}

// =============================================================================
// CONVEX BACKEND INTEGRATION
// =============================================================================

/**
 * Submit a score to the Convex backend.
 * This is async and non-blocking - scores are queued if offline.
 * @param {Object} runStats - Run statistics
 * @returns {Promise<Object>} Result from Convex API
 */
async function submitScoreToConvex(runStats) {
    try {
        const result = await ConvexAPI.submitScore(runStats);
        debugLog('Score submitted to Convex', result);

        // If successful, invalidate leaderboard cache to show updated rankings
        if (result.success && !result._offline) {
            globalLeaderboardCache = null;
            lastLeaderboardFetch = 0;
        }

        return result;
    } catch (error) {
        console.error('[HighScores] Failed to submit score to Convex:', error);
        throw error;
    }
}

/**
 * Fetch the global leaderboard from Convex.
 * Uses caching to avoid excessive API calls.
 * @param {boolean} forceRefresh - Force a fresh fetch
 * @returns {Promise<Array|null>} Global leaderboard entries or null if offline
 */
export async function fetchGlobalLeaderboard(forceRefresh = false) {
    const now = Date.now();

    // Return cache if still valid
    if (!forceRefresh && globalLeaderboardCache && (now - lastLeaderboardFetch < LEADERBOARD_CACHE_TTL)) {
        debugLog('Returning cached global leaderboard');
        return globalLeaderboardCache;
    }

    // Don't start multiple fetches
    if (isLeaderboardFetching) {
        debugLog('Leaderboard fetch already in progress');
        return globalLeaderboardCache;
    }

    isLeaderboardFetching = true;

    try {
        const leaderboard = await ConvexAPI.getLeaderboard(100);

        if (leaderboard) {
            globalLeaderboardCache = leaderboard;
            lastLeaderboardFetch = now;
            debugLog('Global leaderboard fetched', { count: leaderboard.length });
        }

        return leaderboard;
    } catch (error) {
        console.error('[HighScores] Failed to fetch global leaderboard:', error);
        return null;
    } finally {
        isLeaderboardFetching = false;
    }
}

/**
 * Get the global leaderboard (cached).
 * Returns cached data immediately, triggers refresh in background if stale.
 * @returns {Array} Cached global leaderboard or empty array
 */
export function getGlobalLeaderboard() {
    // Trigger background refresh if cache is stale
    const now = Date.now();
    if (!globalLeaderboardCache || (now - lastLeaderboardFetch > LEADERBOARD_CACHE_TTL)) {
        fetchGlobalLeaderboard().catch(() => {});
    }

    return globalLeaderboardCache || [];
}

/**
 * Get player's scores from Convex.
 * @param {number} limit - Maximum number of scores to return
 * @returns {Promise<Array|null>} Player's scores or null if offline
 */
export async function getPlayerScoresFromConvex(limit = 10) {
    try {
        return await ConvexAPI.getPlayerScores(limit);
    } catch (error) {
        console.error('[HighScores] Failed to get player scores:', error);
        return null;
    }
}

/**
 * Get player's global rank from Convex.
 * @returns {Promise<Object|null>} Rank info or null if offline
 */
export async function getPlayerRank() {
    try {
        return await ConvexAPI.getPlayerRank();
    } catch (error) {
        console.error('[HighScores] Failed to get player rank:', error);
        return null;
    }
}


/**
 * Get the current connection status for UI display.
 * @returns {Object} Connection status info
 */
export function getConnectionStatus() {
    return ConvexAPI.getConnectionStatus();
}

/**
 * Check if the leaderboard is currently being fetched.
 * @returns {boolean} True if fetching
 */
export function isLoadingLeaderboard() {
    return isLeaderboardFetching;
}

/**
 * Get the current device ID for player highlighting.
 * @returns {string} Device ID
 */
export function getCurrentDeviceId() {
    return ConvexAPI.getDeviceId();
}

/**
 * Force retry connection to Convex.
 * @returns {Promise<boolean>} True if connection was restored
 */
export async function retryConnection() {
    const online = await ConvexAPI.retryConnection();
    if (online) {
        // Refresh leaderboard on reconnect
        await fetchGlobalLeaderboard(true);
    }
    return online;
}

/**
 * Migrate existing local high scores to Convex.
 * This is called once on first Convex connection.
 */
async function migrateLocalScoresToConvex() {
    // Check if already migrated
    const migrated = safeGetItem(STORAGE_KEYS.MIGRATED_TO_CONVEX, false);
    if (migrated) {
        debugLog('Local scores already migrated to Convex');
        return;
    }

    const localScores = getHighScores();
    if (localScores.length === 0) {
        debugLog('No local scores to migrate');
        safeSetItem(STORAGE_KEYS.MIGRATED_TO_CONVEX, true);
        return;
    }

    debugLog('Migrating local scores to Convex', { count: localScores.length });

    // Submit each local score to Convex
    let successCount = 0;
    for (const score of localScores) {
        try {
            // Convert local score format to runStats format
            const runStats = {
                roundsSurvived: score.roundsSurvived,
                totalDamageDealt: score.totalDamage || 0,
                enemiesDestroyed: score.enemiesDestroyed || 0,
                shotsFired: score.shotsFired || 0,
                shotsHit: score.shotsHit || 0,
                moneyEarned: score.moneyEarned || 0,
                biggestHit: score.biggestHit || 0
            };

            await ConvexAPI.submitScore(runStats);
            successCount++;
        } catch (error) {
            console.warn('[HighScores] Failed to migrate score:', error);
            // Continue with other scores
        }
    }

    if (successCount > 0) {
        debugLog('Migration complete', { migrated: successCount, total: localScores.length });
        safeSetItem(STORAGE_KEYS.MIGRATED_TO_CONVEX, true);
    }
}

// =============================================================================
// LIFETIME STATISTICS
// =============================================================================

/**
 * Get lifetime statistics.
 * @returns {Object} Lifetime stats object
 */
export function getLifetimeStats() {
    const stats = safeGetItem(STORAGE_KEYS.LIFETIME_STATS, { ...DEFAULT_LIFETIME_STATS });

    // Ensure all expected fields exist
    return {
        ...DEFAULT_LIFETIME_STATS,
        ...stats
    };
}

/**
 * Update lifetime statistics with a completed run.
 * @param {Object} runStats - Run statistics from runState module
 */
export function updateLifetimeStats(runStats) {
    const current = getLifetimeStats();
    const now = Date.now();

    const updated = {
        totalRuns: current.totalRuns + 1,
        totalRoundsPlayed: current.totalRoundsPlayed + runStats.roundsSurvived,
        lifetimeDamage: current.lifetimeDamage + runStats.totalDamageDealt,
        lifetimeEnemiesDestroyed: current.lifetimeEnemiesDestroyed + runStats.enemiesDestroyed,
        bestRound: Math.max(current.bestRound, runStats.roundsSurvived),
        totalShotsFired: current.totalShotsFired + runStats.shotsFired,
        totalShotsHit: current.totalShotsHit + runStats.shotsHit,
        lifetimeMoneyEarned: current.lifetimeMoneyEarned + runStats.moneyEarned,
        firstPlayDate: current.firstPlayDate || now,
        lastPlayDate: now
    };

    const saved = safeSetItem(STORAGE_KEYS.LIFETIME_STATS, updated);

    if (saved) {
        debugLog('Lifetime stats updated', updated);
    }

    return saved;
}

/**
 * Get formatted lifetime statistics for display.
 * @returns {Object} Formatted stats with calculated values
 */
export function getFormattedLifetimeStats() {
    const stats = getLifetimeStats();

    return {
        ...stats,
        lifetimeHitRate: stats.totalShotsFired > 0
            ? Math.round((stats.totalShotsHit / stats.totalShotsFired) * 100)
            : 0,
        averageRoundsPerRun: stats.totalRuns > 0
            ? Math.round((stats.totalRoundsPlayed / stats.totalRuns) * 10) / 10
            : 0,
        averageDamagePerRun: stats.totalRuns > 0
            ? Math.round(stats.lifetimeDamage / stats.totalRuns)
            : 0
    };
}

// =============================================================================
// DATA MANAGEMENT
// =============================================================================

/**
 * Clear all high scores and lifetime stats.
 * Use for testing or player-requested reset.
 */
export function clearAllData() {
    if (!isStorageAvailable()) {
        return;
    }
    localStorage.removeItem(STORAGE_KEYS.HIGH_SCORES);
    localStorage.removeItem(STORAGE_KEYS.LIFETIME_STATS);
    debugLog('All data cleared');
}

/**
 * Clear only high scores (keep lifetime stats).
 */
export function clearHighScores() {
    if (!isStorageAvailable()) {
        return;
    }
    localStorage.removeItem(STORAGE_KEYS.HIGH_SCORES);
    debugLog('High scores cleared');
}

/**
 * Export all data for backup.
 * @returns {Object} All stored data
 */
export function exportData() {
    return {
        highScores: getHighScores(),
        lifetimeStats: getLifetimeStats(),
        exportDate: Date.now()
    };
}

/**
 * Import data from backup.
 * @param {Object} data - Exported data object
 * @returns {boolean} True if import succeeded
 */
export function importData(data) {
    try {
        if (data.highScores && Array.isArray(data.highScores)) {
            safeSetItem(STORAGE_KEYS.HIGH_SCORES, data.highScores);
        }
        if (data.lifetimeStats && typeof data.lifetimeStats === 'object') {
            safeSetItem(STORAGE_KEYS.LIFETIME_STATS, data.lifetimeStats);
        }
        debugLog('Data imported successfully');
        return true;
    } catch (error) {
        console.error('[HighScores] Import failed:', error);
        return false;
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the high scores module.
 * Validates stored data on load.
 */
/**
 * Initialize Convex integration.
 * Called async from init() to not block initialization.
 */
async function initConvexIntegration() {
    try {
        // Initialize Convex API
        const convexStatus = await ConvexAPI.init();
        debugLog('Convex initialized', convexStatus);

        // Migrate local scores if online and not already migrated
        if (convexStatus.isOnline) {
            await migrateLocalScoresToConvex();

            // Pre-fetch global leaderboard
            await fetchGlobalLeaderboard();
        }
    } catch (error) {
        console.warn('[HighScores] Convex integration failed:', error);
    }
}

export async function init() {
    // Validate high scores
    const scores = safeGetItem(STORAGE_KEYS.HIGH_SCORES, []);
    if (!Array.isArray(scores)) {
        debugLog('Invalid high scores data, resetting');
        safeSetItem(STORAGE_KEYS.HIGH_SCORES, []);
    }

    // Validate lifetime stats
    const stats = safeGetItem(STORAGE_KEYS.LIFETIME_STATS, null);
    if (stats && typeof stats !== 'object') {
        debugLog('Invalid lifetime stats data, resetting');
        safeSetItem(STORAGE_KEYS.LIFETIME_STATS, { ...DEFAULT_LIFETIME_STATS });
    }

    debugLog('Module initialized', {
        highScoreCount: getHighScores().length,
        bestRound: getBestRoundCount()
    });

    // Initialize Convex and migrate local scores in background
    // Don't await - let this happen asynchronously
    initConvexIntegration().catch(err => {
        console.warn('[HighScores] Convex integration init failed:', err);
    });
}

// Auto-initialize on module load
init();
