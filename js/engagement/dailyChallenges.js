/**
 * Scorched Earth: Synthwave Edition
 * Daily Challenges System
 *
 * Generates 3 daily challenges that refresh at midnight UTC.
 * Uses date-seeded random for consistent challenges across all users.
 * Tracks progress and awards rewards upon completion.
 */

import { DEBUG } from '../constants.js';
import { WeaponRegistry, WEAPON_CATEGORIES } from '../weapons.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'scorchedEarth_dailyChallenges';

/**
 * Challenge difficulty tiers.
 */
export const CHALLENGE_DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

/**
 * Reward values by difficulty tier (coins).
 */
const DIFFICULTY_REWARDS = {
    [CHALLENGE_DIFFICULTY.EASY]: { min: 50, max: 75 },
    [CHALLENGE_DIFFICULTY.MEDIUM]: { min: 100, max: 125 },
    [CHALLENGE_DIFFICULTY.HARD]: { min: 150, max: 200 }
};

/**
 * Bonus reward for completing all 3 challenges.
 */
const BONUS_REWARD = {
    coins: 200,
    supplyDrop: 1
};

/**
 * Number of challenges per day.
 */
const CHALLENGES_PER_DAY = 3;

// =============================================================================
// CHALLENGE TYPE DEFINITIONS
// =============================================================================

/**
 * Challenge type definitions with templates and parameter ranges.
 * Each type defines how to generate and track a specific kind of challenge.
 */
export const CHALLENGE_TYPES = {
    WIN_MATCHES: {
        id: 'win_matches',
        template: 'Win {count} matches',
        difficulty: CHALLENGE_DIFFICULTY.EASY,
        params: { count: { min: 1, max: 3 } },
        eventType: 'match_won'
    },
    DEAL_DAMAGE: {
        id: 'deal_damage',
        template: 'Deal {count} total damage',
        difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
        params: { count: { min: 1000, max: 3000 } },
        eventType: 'damage_dealt'
    },
    USE_WEAPON: {
        id: 'use_weapon',
        template: 'Win a match using {weapon}',
        difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
        params: { weapon: 'random_weapon' },
        eventType: 'match_won_with_weapon'
    },
    ACCURACY: {
        id: 'accuracy',
        template: 'Achieve {count}% accuracy in a match',
        difficulty: CHALLENGE_DIFFICULTY.HARD,
        params: { count: { min: 60, max: 80 } },
        eventType: 'accuracy_achieved'
    },
    PERFECT_WIN: {
        id: 'perfect_win',
        template: 'Win without taking damage',
        difficulty: CHALLENGE_DIFFICULTY.HARD,
        params: {},
        eventType: 'perfect_win'
    },
    STAR_COUNT: {
        id: 'star_count',
        template: 'Earn {count} stars',
        difficulty: CHALLENGE_DIFFICULTY.EASY,
        params: { count: { min: 3, max: 6 } },
        eventType: 'stars_earned'
    },
    WORLD_LEVEL: {
        id: 'world_level',
        template: 'Complete World {world} Level {level}',
        difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
        params: { world: { min: 1, max: 3 }, level: { min: 1, max: 5 } },
        eventType: 'level_completed'
    },
    DESTROY_TERRAIN: {
        id: 'destroy_terrain',
        template: 'Destroy {count} terrain',
        difficulty: CHALLENGE_DIFFICULTY.EASY,
        params: { count: { min: 500, max: 1500 } },
        eventType: 'terrain_destroyed'
    },
    USE_CATEGORY: {
        id: 'use_category',
        template: 'Win using only {category} weapons',
        difficulty: CHALLENGE_DIFFICULTY.HARD,
        params: { category: 'random_category' },
        eventType: 'match_won_with_category'
    }
};

/**
 * Challenge pool organized by difficulty for balanced generation.
 */
const CHALLENGE_POOL = {
    [CHALLENGE_DIFFICULTY.EASY]: [
        CHALLENGE_TYPES.WIN_MATCHES,
        CHALLENGE_TYPES.STAR_COUNT,
        CHALLENGE_TYPES.DESTROY_TERRAIN
    ],
    [CHALLENGE_DIFFICULTY.MEDIUM]: [
        CHALLENGE_TYPES.DEAL_DAMAGE,
        CHALLENGE_TYPES.USE_WEAPON,
        CHALLENGE_TYPES.WORLD_LEVEL
    ],
    [CHALLENGE_DIFFICULTY.HARD]: [
        CHALLENGE_TYPES.ACCURACY,
        CHALLENGE_TYPES.PERFECT_WIN,
        CHALLENGE_TYPES.USE_CATEGORY
    ]
};

// =============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// =============================================================================

/**
 * Simple hash function for generating seed from date string.
 * @param {string} str - String to hash
 * @returns {number} Hash value
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Create a seeded random number generator.
 * Uses a simple LCG (Linear Congruential Generator).
 * @param {number} seed - Initial seed value
 * @returns {function(): number} Random function returning 0-1
 */
function createSeededRandom(seed) {
    let state = seed;
    return function() {
        // LCG parameters (same as glibc)
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
    };
}

/**
 * Get the current UTC date string for seeding.
 * @returns {string} Date in YYYY-MM-DD format
 */
function getUTCDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/**
 * Get milliseconds until midnight UTC.
 * @returns {number} Milliseconds until next midnight UTC
 */
function getMillisecondsUntilMidnightUTC() {
    const now = new Date();
    const midnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
    ));
    return midnight.getTime() - now.getTime();
}

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Daily challenges state.
 */
const state = {
    /** Array of 3 daily challenges */
    challenges: [],
    /** Date string for which challenges were generated */
    generatedDate: null,
    /** Whether bonus has been claimed for all 3 complete */
    bonusClaimed: false
};

/** Whether the module has been initialized */
let isInitialized = false;

/** Callbacks for challenge events */
const eventCallbacks = {
    challengeComplete: [],
    allComplete: [],
    progressUpdate: []
};

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
            console.log(`[DailyChallenges] ${message}`, data);
        } else {
            console.log(`[DailyChallenges] ${message}`);
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
            state.challenges = parsed.challenges ?? [];
            state.generatedDate = parsed.generatedDate ?? null;
            state.bonusClaimed = parsed.bonusClaimed ?? false;

            debugLog('State loaded from localStorage', {
                challenges: state.challenges.length,
                generatedDate: state.generatedDate,
                bonusClaimed: state.bonusClaimed
            });
        }
    } catch (e) {
        console.warn('[DailyChallenges] Failed to load state:', e);
    }
}

/**
 * Save state to localStorage.
 */
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            challenges: state.challenges,
            generatedDate: state.generatedDate,
            bonusClaimed: state.bonusClaimed
        }));
        debugLog('State saved to localStorage');
    } catch (e) {
        console.warn('[DailyChallenges] Failed to save state:', e);
    }
}

// =============================================================================
// CHALLENGE GENERATION
// =============================================================================

/**
 * Get a random weapon from the registry.
 * @param {function(): number} rng - Seeded random function
 * @returns {Object} Random weapon object
 */
function getRandomWeapon(rng) {
    const weapons = WeaponRegistry.getAllWeapons();
    // Filter to purchasable weapons (not unlimited ammo)
    const purchasable = weapons.filter(w => w.cost > 0);
    const index = Math.floor(rng() * purchasable.length);
    return purchasable[index];
}

/**
 * Get a random weapon category.
 * @param {function(): number} rng - Seeded random function
 * @returns {Object} Random category object
 */
function getRandomCategory(rng) {
    const categories = Object.values(WEAPON_CATEGORIES);
    const index = Math.floor(rng() * categories.length);
    return categories[index];
}

/**
 * Generate parameter value based on param definition.
 * @param {Object|string} paramDef - Parameter definition
 * @param {function(): number} rng - Seeded random function
 * @returns {*} Generated parameter value
 */
function generateParamValue(paramDef, rng) {
    if (paramDef === 'random_weapon') {
        const weapon = getRandomWeapon(rng);
        return weapon ? weapon.name : 'Missile';
    }
    if (paramDef === 'random_category') {
        const category = getRandomCategory(rng);
        return category ? category.name : 'Standard';
    }
    if (typeof paramDef === 'object' && paramDef.min !== undefined) {
        const range = paramDef.max - paramDef.min;
        return Math.floor(paramDef.min + rng() * (range + 1));
    }
    return paramDef;
}

/**
 * Create a challenge instance from a challenge type.
 * @param {Object} challengeType - Challenge type definition
 * @param {number} index - Challenge index (0-2)
 * @param {function(): number} rng - Seeded random function
 * @returns {Object} Challenge instance
 */
function createChallenge(challengeType, index, rng) {
    // Generate parameter values
    const params = {};
    for (const [key, def] of Object.entries(challengeType.params)) {
        params[key] = generateParamValue(def, rng);
    }

    // Build description by replacing template placeholders
    let description = challengeType.template;
    for (const [key, value] of Object.entries(params)) {
        description = description.replace(`{${key}}`, value);
    }

    // Calculate target based on challenge type
    let target = 1;
    if (params.count !== undefined) {
        target = params.count;
    }

    // Calculate reward based on difficulty
    const rewardRange = DIFFICULTY_REWARDS[challengeType.difficulty];
    const reward = Math.floor(rewardRange.min + rng() * (rewardRange.max - rewardRange.min + 1));

    return {
        id: `${challengeType.id}_${index}`,
        typeId: challengeType.id,
        eventType: challengeType.eventType,
        difficulty: challengeType.difficulty,
        description,
        params,
        progress: 0,
        target,
        reward,
        completed: false
    };
}

/**
 * Generate daily challenges using date as seed.
 * Always generates: 1 Easy, 1 Medium, 1 Hard challenge.
 */
function generateChallenges() {
    const today = getUTCDateString();
    const seed = hashString(today + '_scorched_earth');
    const rng = createSeededRandom(seed);

    const challenges = [];

    // Generate one challenge per difficulty tier
    const difficulties = [
        CHALLENGE_DIFFICULTY.EASY,
        CHALLENGE_DIFFICULTY.MEDIUM,
        CHALLENGE_DIFFICULTY.HARD
    ];

    for (let i = 0; i < CHALLENGES_PER_DAY; i++) {
        const difficulty = difficulties[i];
        const pool = CHALLENGE_POOL[difficulty];
        const typeIndex = Math.floor(rng() * pool.length);
        const challengeType = pool[typeIndex];
        const challenge = createChallenge(challengeType, i, rng);
        challenges.push(challenge);
    }

    state.challenges = challenges;
    state.generatedDate = today;
    state.bonusClaimed = false;
    saveState();

    debugLog('Challenges generated', {
        date: today,
        challenges: challenges.map(c => ({
            id: c.id,
            description: c.description,
            difficulty: c.difficulty,
            target: c.target,
            reward: c.reward
        }))
    });
}

/**
 * Check if challenges need to be regenerated.
 * @returns {boolean} True if regeneration is needed
 */
function needsRegeneration() {
    const today = getUTCDateString();
    return state.generatedDate !== today;
}

// =============================================================================
// PROGRESS TRACKING
// =============================================================================

/**
 * Update progress for a specific event type.
 * @param {string} eventType - Type of event that occurred
 * @param {Object} data - Event data
 * @returns {Object[]} Array of newly completed challenges
 */
export function updateProgress(eventType, data = {}) {
    if (!isInitialized) {
        console.warn('[DailyChallenges] Not initialized');
        return [];
    }

    // Check for daily reset
    if (needsRegeneration()) {
        generateChallenges();
        return [];
    }

    const newlyCompleted = [];

    for (const challenge of state.challenges) {
        if (challenge.completed) continue;
        if (challenge.eventType !== eventType) continue;

        const progressDelta = calculateProgressDelta(challenge, eventType, data);
        if (progressDelta > 0) {
            challenge.progress = Math.min(challenge.progress + progressDelta, challenge.target);

            debugLog('Progress updated', {
                challenge: challenge.id,
                progress: challenge.progress,
                target: challenge.target,
                delta: progressDelta
            });

            // Notify progress listeners
            for (const callback of eventCallbacks.progressUpdate) {
                try {
                    callback(challenge, progressDelta);
                } catch (e) {
                    console.error('[DailyChallenges] Progress callback error:', e);
                }
            }

            // Check for completion
            if (challenge.progress >= challenge.target) {
                challenge.completed = true;
                newlyCompleted.push(challenge);

                debugLog('Challenge completed', {
                    id: challenge.id,
                    description: challenge.description,
                    reward: challenge.reward
                });

                // Notify completion listeners
                for (const callback of eventCallbacks.challengeComplete) {
                    try {
                        callback(challenge);
                    } catch (e) {
                        console.error('[DailyChallenges] Completion callback error:', e);
                    }
                }
            }
        }
    }

    // Check for all complete bonus
    if (newlyCompleted.length > 0 && !state.bonusClaimed) {
        checkAllComplete();
    }

    if (newlyCompleted.length > 0) {
        saveState();
    }

    return newlyCompleted;
}

/**
 * Calculate progress delta for a challenge based on event.
 * @param {Object} challenge - Challenge to check
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @returns {number} Progress amount to add
 */
function calculateProgressDelta(challenge, eventType, data) {
    switch (eventType) {
        case 'match_won':
            return 1;

        case 'damage_dealt':
            return data.amount || 0;

        case 'match_won_with_weapon':
            // Check if the used weapon matches the challenge requirement
            if (data.weaponName === challenge.params.weapon) {
                return 1;
            }
            return 0;

        case 'accuracy_achieved':
            // Check if accuracy meets or exceeds threshold
            if (data.accuracy >= challenge.params.count) {
                return 1;
            }
            return 0;

        case 'perfect_win':
            return 1;

        case 'stars_earned':
            return data.stars || 0;

        case 'level_completed':
            // Check if it matches the required world/level
            if (data.world === challenge.params.world &&
                data.level === challenge.params.level) {
                return 1;
            }
            return 0;

        case 'terrain_destroyed':
            return data.amount || 0;

        case 'match_won_with_category':
            // Check if all weapons used were from the required category
            if (data.categoryName === challenge.params.category) {
                return 1;
            }
            return 0;

        default:
            return 0;
    }
}

/**
 * Check if all challenges are complete and trigger bonus.
 */
function checkAllComplete() {
    const allComplete = state.challenges.every(c => c.completed);
    if (allComplete && !state.bonusClaimed) {
        state.bonusClaimed = true;
        saveState();

        debugLog('All challenges complete - bonus triggered', BONUS_REWARD);

        // Notify all complete listeners
        for (const callback of eventCallbacks.allComplete) {
            try {
                callback(BONUS_REWARD);
            } catch (e) {
                console.error('[DailyChallenges] All complete callback error:', e);
            }
        }
    }
}

// =============================================================================
// STATE ACCESSORS
// =============================================================================

/**
 * Get all current challenges.
 * @returns {Object[]} Array of challenge objects
 */
export function getChallenges() {
    if (!isInitialized) return [];

    // Check for daily reset
    if (needsRegeneration()) {
        generateChallenges();
    }

    return state.challenges.map(c => ({ ...c }));
}

/**
 * Get a specific challenge by ID.
 * @param {string} challengeId - Challenge ID
 * @returns {Object|null} Challenge object or null
 */
export function getChallenge(challengeId) {
    const challenge = state.challenges.find(c => c.id === challengeId);
    return challenge ? { ...challenge } : null;
}

/**
 * Check if a specific challenge is completed.
 * @param {string} challengeId - Challenge ID
 * @returns {boolean} True if completed
 */
export function isCompleted(challengeId) {
    const challenge = state.challenges.find(c => c.id === challengeId);
    return challenge ? challenge.completed : false;
}

/**
 * Check if all challenges are completed.
 * @returns {boolean} True if all 3 are complete
 */
export function areAllCompleted() {
    if (!isInitialized || state.challenges.length === 0) return false;
    return state.challenges.every(c => c.completed);
}

/**
 * Check if the bonus has been claimed.
 * @returns {boolean} True if bonus was claimed
 */
export function isBonusClaimed() {
    return state.bonusClaimed;
}

/**
 * Get the bonus reward definition.
 * @returns {Object} Bonus reward { coins, supplyDrop }
 */
export function getBonusReward() {
    return { ...BONUS_REWARD };
}

/**
 * Get time until challenges refresh.
 * @returns {Object} Time breakdown
 * @property {number} hours - Hours component
 * @property {number} minutes - Minutes component
 * @property {number} seconds - Seconds component
 * @property {number} totalMs - Total milliseconds remaining
 */
export function getTimeUntilRefresh() {
    const totalMs = getMillisecondsUntilMidnightUTC();
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        hours,
        minutes,
        seconds,
        totalMs
    };
}

/**
 * Get the date string for current challenges.
 * @returns {string|null} Date in YYYY-MM-DD format
 */
export function getGeneratedDate() {
    return state.generatedDate;
}

/**
 * Get completion counts.
 * @returns {Object} Counts { completed, total }
 */
export function getCompletionCounts() {
    const completed = state.challenges.filter(c => c.completed).length;
    return {
        completed,
        total: CHALLENGES_PER_DAY
    };
}

/**
 * Get full state for debugging/display.
 * @returns {Object} Current state copy
 */
export function getState() {
    return {
        challenges: getChallenges(),
        generatedDate: state.generatedDate,
        bonusClaimed: state.bonusClaimed,
        timeUntilRefresh: getTimeUntilRefresh(),
        completionCounts: getCompletionCounts()
    };
}

// =============================================================================
// CALLBACK REGISTRATION
// =============================================================================

/**
 * Register a callback for when a challenge is completed.
 * @param {Function} callback - Function to call with completed challenge
 * @returns {Function} Unsubscribe function
 */
export function onChallengeComplete(callback) {
    eventCallbacks.challengeComplete.push(callback);
    return () => {
        const index = eventCallbacks.challengeComplete.indexOf(callback);
        if (index >= 0) {
            eventCallbacks.challengeComplete.splice(index, 1);
        }
    };
}

/**
 * Register a callback for when all challenges are completed.
 * @param {Function} callback - Function to call with bonus reward
 * @returns {Function} Unsubscribe function
 */
export function onAllComplete(callback) {
    eventCallbacks.allComplete.push(callback);
    return () => {
        const index = eventCallbacks.allComplete.indexOf(callback);
        if (index >= 0) {
            eventCallbacks.allComplete.splice(index, 1);
        }
    };
}

/**
 * Register a callback for progress updates.
 * @param {Function} callback - Function to call with (challenge, delta)
 * @returns {Function} Unsubscribe function
 */
export function onProgressUpdate(callback) {
    eventCallbacks.progressUpdate.push(callback);
    return () => {
        const index = eventCallbacks.progressUpdate.indexOf(callback);
        if (index >= 0) {
            eventCallbacks.progressUpdate.splice(index, 1);
        }
    };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the daily challenges system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[DailyChallenges] Already initialized');
        return;
    }

    loadState();

    // Check if we need to generate new challenges
    if (needsRegeneration()) {
        generateChallenges();
    }

    isInitialized = true;

    console.log('[DailyChallenges] System initialized', {
        generatedDate: state.generatedDate,
        challenges: state.challenges.length,
        completionCounts: getCompletionCounts(),
        bonusClaimed: state.bonusClaimed
    });
}

/**
 * Reset the daily challenges system (for testing/debugging).
 * Clears all state and removes localStorage data.
 */
export function reset() {
    state.challenges = [];
    state.generatedDate = null;
    state.bonusClaimed = false;

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('[DailyChallenges] Failed to clear localStorage:', e);
    }

    isInitialized = false;
    debugLog('System reset');
}

/**
 * Force regeneration of challenges (for testing/debugging).
 * This bypasses the date check and generates new challenges.
 */
export function forceRegenerate() {
    generateChallenges();
    debugLog('Forced regeneration complete');
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    CHALLENGES_PER_DAY,
    BONUS_REWARD,
    DIFFICULTY_REWARDS,
    CHALLENGE_POOL
};
