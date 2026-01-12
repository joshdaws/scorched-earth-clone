/**
 * Scorched Earth: Synthwave Edition
 * Lifetime Statistics Tracking
 *
 * Tracks aggregate statistics across all runs for player profile,
 * achievements, and historical records. Persists to localStorage.
 */

import { DEBUG } from './constants.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'scorchedEarth_lifetimeStats';

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Lifetime statistics structure.
 */
const stats = {
    // === Combat Statistics ===
    /** Total rounds won */
    totalWins: 0,
    /** Total rounds lost */
    totalLosses: 0,
    /** Total rounds played */
    totalRounds: 0,
    /** Highest round reached in a single run */
    highestRound: 0,
    /** Total damage dealt across all games */
    totalDamageDealt: 0,
    /** Total damage taken across all games */
    totalDamageTaken: 0,
    /** Biggest single hit damage */
    biggestHit: 0,

    // === Accuracy Statistics ===
    /** Total shots fired */
    totalShotsFired: 0,
    /** Total shots that hit */
    totalShotsHit: 0,
    /** Best accuracy in a single round (0-1) */
    bestSingleRoundAccuracy: 0,

    // === Kill Statistics ===
    /** Total enemy tanks destroyed */
    totalKills: 0,
    /** Kills by weapon type */
    killsByWeapon: {},
    /** Flawless wins (no damage taken) */
    flawlessWins: 0,

    // === Streak Statistics ===
    /** Longest win streak ever achieved */
    longestWinStreak: 0,
    /** Current win streak (reset on loss) */
    currentWinStreak: 0,

    // === Economy Statistics ===
    /** Total money earned across all runs */
    totalMoneyEarned: 0,
    /** Total money spent across all runs */
    totalMoneySpent: 0,
    /** Total tokens earned (also tracked in tokens.js) */
    totalTokensEarned: 0,
    /** Total tokens spent (also tracked in tokens.js) */
    totalTokensSpent: 0,

    // === Collection Statistics ===
    /** Total tanks unlocked */
    tanksUnlocked: 0,
    /** Total supply drops opened */
    supplyDropsOpened: 0,
    /** Supply drops by rarity opened */
    supplyDropsByRarity: {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0
    },

    // === Achievement Statistics ===
    /** Total achievements unlocked */
    achievementsUnlocked: 0,

    // === Session Statistics ===
    /** Total play time in milliseconds */
    totalPlayTime: 0,
    /** Number of runs (games started) */
    totalRuns: 0,
    /** First play date (timestamp) */
    firstPlayDate: null,
    /** Last play date (timestamp) */
    lastPlayDate: null
};

/** Whether the module has been initialized */
let isInitialized = false;

/** Session start time for tracking play time */
let sessionStartTime = null;

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
            console.log(`[LifetimeStats] ${message}`, data);
        } else {
            console.log(`[LifetimeStats] ${message}`);
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

            // Combat stats
            stats.totalWins = parsed.totalWins || 0;
            stats.totalLosses = parsed.totalLosses || 0;
            stats.totalRounds = parsed.totalRounds || 0;
            stats.highestRound = parsed.highestRound || 0;
            stats.totalDamageDealt = parsed.totalDamageDealt || 0;
            stats.totalDamageTaken = parsed.totalDamageTaken || 0;
            stats.biggestHit = parsed.biggestHit || 0;

            // Accuracy stats
            stats.totalShotsFired = parsed.totalShotsFired || 0;
            stats.totalShotsHit = parsed.totalShotsHit || 0;
            stats.bestSingleRoundAccuracy = parsed.bestSingleRoundAccuracy || 0;

            // Kill stats
            stats.totalKills = parsed.totalKills || 0;
            stats.killsByWeapon = parsed.killsByWeapon || {};
            stats.flawlessWins = parsed.flawlessWins || 0;

            // Streak stats
            stats.longestWinStreak = parsed.longestWinStreak || 0;
            stats.currentWinStreak = parsed.currentWinStreak || 0;

            // Economy stats
            stats.totalMoneyEarned = parsed.totalMoneyEarned || 0;
            stats.totalMoneySpent = parsed.totalMoneySpent || 0;
            stats.totalTokensEarned = parsed.totalTokensEarned || 0;
            stats.totalTokensSpent = parsed.totalTokensSpent || 0;

            // Collection stats
            stats.tanksUnlocked = parsed.tanksUnlocked || 0;
            stats.supplyDropsOpened = parsed.supplyDropsOpened || 0;
            stats.supplyDropsByRarity = parsed.supplyDropsByRarity || {
                common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0
            };

            // Achievement stats
            stats.achievementsUnlocked = parsed.achievementsUnlocked || 0;

            // Session stats
            stats.totalPlayTime = parsed.totalPlayTime || 0;
            stats.totalRuns = parsed.totalRuns || 0;
            stats.firstPlayDate = parsed.firstPlayDate || null;
            stats.lastPlayDate = parsed.lastPlayDate || null;

            debugLog('State loaded from localStorage', {
                totalWins: stats.totalWins,
                totalKills: stats.totalKills,
                highestRound: stats.highestRound
            });
        }
    } catch (e) {
        console.warn('[LifetimeStats] Failed to load state:', e);
    }
}

/**
 * Save state to localStorage.
 */
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        debugLog('State saved to localStorage');
    } catch (e) {
        console.warn('[LifetimeStats] Failed to save state:', e);
    }
}

// =============================================================================
// STAT UPDATE FUNCTIONS
// =============================================================================

/**
 * Record a round win.
 * @param {Object} options - Win options
 * @param {boolean} options.isFlawless - Whether no damage was taken
 * @param {number} options.roundNumber - Current round number
 * @param {number} options.damageDealt - Damage dealt this round
 * @param {number} options.shotsFired - Shots fired this round
 * @param {number} options.shotsHit - Shots that hit this round
 */
export function recordWin(options = {}) {
    if (!isInitialized) return;

    const {
        isFlawless = false,
        roundNumber = 1,
        damageDealt = 0,
        shotsFired = 0,
        shotsHit = 0
    } = options;

    stats.totalWins++;
    stats.totalRounds++;

    // Update win streak
    stats.currentWinStreak++;
    if (stats.currentWinStreak > stats.longestWinStreak) {
        stats.longestWinStreak = stats.currentWinStreak;
        debugLog('New longest win streak!', { streak: stats.longestWinStreak });
    }

    // Track flawless wins
    if (isFlawless) {
        stats.flawlessWins++;
        debugLog('Flawless win recorded', { total: stats.flawlessWins });
    }

    // Update highest round
    if (roundNumber > stats.highestRound) {
        stats.highestRound = roundNumber;
        debugLog('New highest round!', { round: roundNumber });
    }

    // Track accuracy for this round
    if (shotsFired > 0) {
        const roundAccuracy = shotsHit / shotsFired;
        if (roundAccuracy > stats.bestSingleRoundAccuracy) {
            stats.bestSingleRoundAccuracy = roundAccuracy;
            debugLog('New best accuracy!', { accuracy: roundAccuracy });
        }
    }

    saveState();
    debugLog('Win recorded', { totalWins: stats.totalWins, streak: stats.currentWinStreak });
}

/**
 * Record a round loss (game over).
 * @param {Object} options - Loss options
 * @param {number} options.roundNumber - Round when player was defeated
 */
export function recordLoss(options = {}) {
    if (!isInitialized) return;

    const { roundNumber = 1 } = options;

    stats.totalLosses++;
    stats.totalRounds++;

    // Reset win streak
    stats.currentWinStreak = 0;

    // Update highest round (even on loss)
    if (roundNumber > stats.highestRound) {
        stats.highestRound = roundNumber;
    }

    saveState();
    debugLog('Loss recorded', { totalLosses: stats.totalLosses, finalRound: roundNumber });
}

/**
 * Record damage dealt.
 * @param {number} amount - Damage dealt
 */
export function recordDamageDealt(amount) {
    if (!isInitialized || amount <= 0) return;

    stats.totalDamageDealt += amount;

    if (amount > stats.biggestHit) {
        stats.biggestHit = amount;
        debugLog('New biggest hit!', { damage: amount });
    }

    saveState();
}

/**
 * Record damage taken.
 * @param {number} amount - Damage taken
 */
export function recordDamageTaken(amount) {
    if (!isInitialized || amount <= 0) return;

    stats.totalDamageTaken += amount;
    saveState();
}

/**
 * Record a shot fired.
 * @param {boolean} hit - Whether the shot hit
 */
export function recordShot(hit = false) {
    if (!isInitialized) return;

    stats.totalShotsFired++;
    if (hit) {
        stats.totalShotsHit++;
    }

    saveState();
}

/**
 * Record an enemy kill.
 * @param {string} weaponId - Weapon used for the kill
 */
export function recordKill(weaponId = 'basic-shot') {
    if (!isInitialized) return;

    stats.totalKills++;

    // Track kills by weapon
    stats.killsByWeapon[weaponId] = (stats.killsByWeapon[weaponId] || 0) + 1;

    saveState();
    debugLog('Kill recorded', { weapon: weaponId, totalKills: stats.totalKills });
}

/**
 * Record money earned.
 * @param {number} amount - Money earned
 */
export function recordMoneyEarned(amount) {
    if (!isInitialized || amount <= 0) return;

    stats.totalMoneyEarned += amount;
    saveState();
}

/**
 * Record money spent.
 * @param {number} amount - Money spent
 */
export function recordMoneySpent(amount) {
    if (!isInitialized || amount <= 0) return;

    stats.totalMoneySpent += amount;
    saveState();
}

/**
 * Record tokens earned.
 * @param {number} amount - Tokens earned
 */
export function recordTokensEarned(amount) {
    if (!isInitialized || amount <= 0) return;

    stats.totalTokensEarned += amount;
    saveState();
}

/**
 * Record tokens spent.
 * @param {number} amount - Tokens spent
 */
export function recordTokensSpent(amount) {
    if (!isInitialized || amount <= 0) return;

    stats.totalTokensSpent += amount;
    saveState();
}

/**
 * Record a supply drop opened.
 * @param {string} rarity - Rarity of the tank received
 */
export function recordSupplyDrop(rarity = 'common') {
    if (!isInitialized) return;

    stats.supplyDropsOpened++;

    const normalizedRarity = rarity.toLowerCase();
    if (stats.supplyDropsByRarity[normalizedRarity] !== undefined) {
        stats.supplyDropsByRarity[normalizedRarity]++;
    }

    saveState();
    debugLog('Supply drop recorded', { rarity, total: stats.supplyDropsOpened });
}

/**
 * Record a new tank unlocked.
 */
export function recordTankUnlocked() {
    if (!isInitialized) return;

    stats.tanksUnlocked++;
    saveState();
    debugLog('Tank unlocked', { total: stats.tanksUnlocked });
}

/**
 * Record an achievement unlocked.
 */
export function recordAchievementUnlocked() {
    if (!isInitialized) return;

    stats.achievementsUnlocked++;
    saveState();
    debugLog('Achievement unlocked', { total: stats.achievementsUnlocked });
}

/**
 * Record a new run started.
 */
export function recordRunStarted() {
    if (!isInitialized) return;

    stats.totalRuns++;

    const now = Date.now();
    if (!stats.firstPlayDate) {
        stats.firstPlayDate = now;
    }
    stats.lastPlayDate = now;

    saveState();
    debugLog('Run started', { totalRuns: stats.totalRuns });
}

/**
 * Update play time.
 * @param {number} milliseconds - Time to add
 */
export function addPlayTime(milliseconds) {
    if (!isInitialized || milliseconds <= 0) return;

    stats.totalPlayTime += milliseconds;
    saveState();
}

// =============================================================================
// GETTERS
// =============================================================================

/**
 * Get all lifetime statistics.
 * @returns {Object} Copy of all stats
 */
export function getStats() {
    return { ...stats, killsByWeapon: { ...stats.killsByWeapon } };
}

/**
 * Get overall accuracy percentage.
 * @returns {number} Accuracy as percentage (0-100)
 */
export function getOverallAccuracy() {
    if (stats.totalShotsFired === 0) return 0;
    return Math.round((stats.totalShotsHit / stats.totalShotsFired) * 100);
}

/**
 * Get win rate percentage.
 * @returns {number} Win rate as percentage (0-100)
 */
export function getWinRate() {
    if (stats.totalRounds === 0) return 0;
    return Math.round((stats.totalWins / stats.totalRounds) * 100);
}

/**
 * Get the favorite (most used) weapon based on kills.
 * @returns {string|null} Weapon ID with most kills, or null if no kills
 */
export function getFavoriteWeapon() {
    let favorite = null;
    let maxKills = 0;

    for (const [weaponId, kills] of Object.entries(stats.killsByWeapon)) {
        if (kills > maxKills) {
            maxKills = kills;
            favorite = weaponId;
        }
    }

    return favorite;
}

/**
 * Get formatted play time string.
 * @returns {string} Play time formatted as "Xh Ym" or "Xm"
 */
export function getFormattedPlayTime() {
    const totalMinutes = Math.floor(stats.totalPlayTime / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Get K/D ratio.
 * @returns {string} K/D ratio formatted to 2 decimal places
 */
export function getKDRatio() {
    if (stats.totalLosses === 0) {
        return stats.totalKills > 0 ? stats.totalKills.toFixed(1) : '0.0';
    }
    return (stats.totalKills / stats.totalLosses).toFixed(2);
}

/**
 * Get summary statistics for display.
 * @returns {Object} Summary stats formatted for UI
 */
export function getSummary() {
    return {
        wins: stats.totalWins,
        losses: stats.totalLosses,
        winRate: getWinRate(),
        highestRound: stats.highestRound,
        totalKills: stats.totalKills,
        accuracy: getOverallAccuracy(),
        bestAccuracy: Math.round(stats.bestSingleRoundAccuracy * 100),
        favoriteWeapon: getFavoriteWeapon(),
        longestStreak: stats.longestWinStreak,
        flawlessWins: stats.flawlessWins,
        damageDealt: stats.totalDamageDealt,
        biggestHit: stats.biggestHit,
        tanksUnlocked: stats.tanksUnlocked,
        achievementsUnlocked: stats.achievementsUnlocked,
        playTime: getFormattedPlayTime(),
        totalRuns: stats.totalRuns,
        kdRatio: getKDRatio()
    };
}

// =============================================================================
// SESSION TRACKING
// =============================================================================

/**
 * Start tracking session time.
 */
export function startSession() {
    sessionStartTime = Date.now();
    debugLog('Session started');
}

/**
 * End session and record play time.
 */
export function endSession() {
    if (sessionStartTime) {
        const sessionTime = Date.now() - sessionStartTime;
        addPlayTime(sessionTime);
        sessionStartTime = null;
        debugLog('Session ended', { duration: sessionTime });
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the lifetime stats system.
 */
export function init() {
    if (isInitialized) {
        console.warn('[LifetimeStats] Already initialized');
        return;
    }

    loadState();
    startSession();

    // Record last play date
    stats.lastPlayDate = Date.now();
    if (!stats.firstPlayDate) {
        stats.firstPlayDate = stats.lastPlayDate;
    }
    saveState();

    isInitialized = true;
    console.log('[LifetimeStats] System initialized', getSummary());
}

/**
 * Clean up lifetime stats (call on page unload).
 */
export function cleanup() {
    endSession();
    debugLog('System cleaned up');
}

// Handle page unload to save session time
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
}
