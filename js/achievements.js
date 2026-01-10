/**
 * Scorched Earth: Synthwave Edition
 * Achievement System - Data Structure, Registry, and State Tracking
 *
 * Defines all achievements with their properties matching the game spec.
 * Provides the AchievementRegistry for accessing achievement definitions.
 * Manages achievement state tracking and localStorage persistence.
 */

import { DEBUG } from './constants.js';

// =============================================================================
// ACHIEVEMENT CATEGORIES
// =============================================================================

/**
 * Achievement category types.
 * Each category groups related achievements:
 * - COMBAT: Combat-related achievements (kills, damage, survival)
 * - PRECISION: Accuracy and skill-based achievements
 * - WEAPON_MASTERY: Weapon usage achievements
 * - PROGRESSION: Round/milestone achievements
 * - ECONOMY: Money and inventory achievements
 * - HIDDEN: Secret achievements (not shown until unlocked)
 */
export const ACHIEVEMENT_CATEGORIES = {
    COMBAT: 'combat',
    PRECISION: 'precision',
    WEAPON_MASTERY: 'weapon_mastery',
    PROGRESSION: 'progression',
    ECONOMY: 'economy',
    HIDDEN: 'hidden'
};

// =============================================================================
// ACHIEVEMENT DIFFICULTY
// =============================================================================

/**
 * Achievement difficulty levels.
 * Determines token rewards:
 * - TUTORIAL: 1 token
 * - EASY: 2 tokens
 * - MEDIUM: 5 tokens
 * - HARD: 10 tokens
 * - VERY_HARD: 15 tokens
 * - EXTREME: 25 tokens
 */
export const ACHIEVEMENT_DIFFICULTY = {
    TUTORIAL: 'tutorial',
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    VERY_HARD: 'very_hard',
    EXTREME: 'extreme'
};

/**
 * Token rewards by difficulty level.
 */
export const DIFFICULTY_TOKEN_REWARDS = {
    [ACHIEVEMENT_DIFFICULTY.TUTORIAL]: 1,
    [ACHIEVEMENT_DIFFICULTY.EASY]: 2,
    [ACHIEVEMENT_DIFFICULTY.MEDIUM]: 5,
    [ACHIEVEMENT_DIFFICULTY.HARD]: 10,
    [ACHIEVEMENT_DIFFICULTY.VERY_HARD]: 15,
    [ACHIEVEMENT_DIFFICULTY.EXTREME]: 25
};

// =============================================================================
// ACHIEVEMENT TRACKING TYPES
// =============================================================================

/**
 * Achievement tracking types.
 * Determines how progress is tracked:
 * - SINGLE: One-time event (e.g., first kill)
 * - COUNTER: Progress-based (e.g., reach round 10)
 * - CONDITIONAL: Complex conditions checked each round
 */
export const ACHIEVEMENT_TRACKING_TYPES = {
    SINGLE: 'single',
    COUNTER: 'counter',
    CONDITIONAL: 'conditional'
};

// =============================================================================
// ACHIEVEMENT CLASS
// =============================================================================

/**
 * Achievement definition object.
 *
 * @typedef {Object} Achievement
 * @property {string} id - Unique identifier (snake_case)
 * @property {string} name - Display name
 * @property {string} description - Unlock description
 * @property {string} category - Category from ACHIEVEMENT_CATEGORIES
 * @property {string} difficulty - Difficulty from ACHIEVEMENT_DIFFICULTY
 * @property {number} tokenReward - Tokens awarded based on difficulty
 * @property {boolean} hidden - Whether achievement is hidden until unlocked
 * @property {string} trackingType - Tracking type from ACHIEVEMENT_TRACKING_TYPES
 * @property {number} [target] - Required count/value for counter achievements
 * @property {string} [specialReward] - Optional tank unlock instead of tokens
 */

/**
 * Creates an achievement definition with required and optional properties.
 * @param {Object} config - Achievement configuration
 * @returns {Achievement} Frozen achievement object
 */
function createAchievement(config) {
    const tokenReward = config.specialReward
        ? 0
        : DIFFICULTY_TOKEN_REWARDS[config.difficulty];

    const achievement = {
        id: config.id,
        name: config.name,
        description: config.description,
        category: config.category,
        difficulty: config.difficulty,
        tokenReward,
        hidden: config.hidden || false,
        trackingType: config.trackingType,
        target: config.target || 1,
        specialReward: config.specialReward || null
    };

    // Freeze to prevent modification
    return Object.freeze(achievement);
}

// =============================================================================
// ACHIEVEMENT DEFINITIONS
// =============================================================================

// --- Combat Achievements (7) ---

const FIRST_BLOOD = createAchievement({
    id: 'first_blood',
    name: 'First Blood',
    description: 'Destroy your first enemy tank',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    difficulty: ACHIEVEMENT_DIFFICULTY.TUTORIAL,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const DIRECT_HIT = createAchievement({
    id: 'direct_hit',
    name: 'Direct Hit',
    description: 'Land a projectile directly on enemy (no splash)',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const OVERKILL = createAchievement({
    id: 'overkill',
    name: 'Overkill',
    description: 'Deal 150%+ of enemy\'s remaining health in one hit',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const UNTOUCHABLE = createAchievement({
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Win a round without taking any damage',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.CONDITIONAL
});

const COMEBACK_KING = createAchievement({
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Win after dropping below 20% health',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.CONDITIONAL
});

const NAIL_BITER = createAchievement({
    id: 'nail_biter',
    name: 'Nail Biter',
    description: 'Win with less than 10% health remaining',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.CONDITIONAL
});

const FLAWLESS_VICTORY = createAchievement({
    id: 'flawless_victory',
    name: 'Flawless Victory',
    description: 'Win 3 consecutive rounds without damage',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 3
});

// --- Precision Achievements (7) ---

const SHARPSHOOTER = createAchievement({
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Hit 3 consecutive shots',
    category: ACHIEVEMENT_CATEGORIES.PRECISION,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 3
});

const EAGLE_EYE = createAchievement({
    id: 'eagle_eye',
    name: 'Eagle Eye',
    description: 'Hit 5 consecutive shots',
    category: ACHIEVEMENT_CATEGORIES.PRECISION,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 5
});

const SNIPER_ELITE = createAchievement({
    id: 'sniper_elite',
    name: 'Sniper Elite',
    description: 'Hit enemy from maximum map distance',
    category: ACHIEVEMENT_CATEGORIES.PRECISION,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const WIND_WHISPERER = createAchievement({
    id: 'wind_whisperer',
    name: 'Wind Whisperer',
    description: 'Score a hit in 15+ wind conditions',
    category: ACHIEVEMENT_CATEGORIES.PRECISION,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const STORM_CHASER = createAchievement({
    id: 'storm_chaser',
    name: 'Storm Chaser',
    description: 'Score a hit in 25+ wind conditions',
    category: ACHIEVEMENT_CATEGORIES.PRECISION,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const TRICK_SHOT = createAchievement({
    id: 'trick_shot',
    name: 'Trick Shot',
    description: 'Hit enemy after projectile bounces off terrain',
    category: ACHIEVEMENT_CATEGORIES.PRECISION,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const HOLE_IN_ONE = createAchievement({
    id: 'hole_in_one',
    name: 'Hole in One',
    description: 'Direct hit on first shot of the match',
    category: ACHIEVEMENT_CATEGORIES.PRECISION,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

// --- Weapon Mastery Achievements (12) ---

const BASIC_TRAINING = createAchievement({
    id: 'basic_training',
    name: 'Basic Training',
    description: 'Win using only Basic Shots',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.CONDITIONAL,
    specialReward: 'tank_skin'
});

const MISSILE_COMMAND = createAchievement({
    id: 'missile_command',
    name: 'Missile Command',
    description: 'Get a kill with Missile',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const BIG_GAME_HUNTER = createAchievement({
    id: 'big_game_hunter',
    name: 'Big Game Hunter',
    description: 'Get a kill with Big Shot',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const CLUSTER_BOMB = createAchievement({
    id: 'cluster_bomb',
    name: 'Cluster Bomb',
    description: 'Get a kill with MIRV',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const DEATH_DEALER = createAchievement({
    id: 'death_dealer',
    name: 'Death Dealer',
    description: 'Get a kill with Death\'s Head',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const ROLLER_COASTER = createAchievement({
    id: 'roller_coaster',
    name: 'Roller Coaster',
    description: 'Get a kill with Roller',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const HEAVY_ROLLER_ACH = createAchievement({
    id: 'heavy_roller_ach',
    name: 'Heavy Roller',
    description: 'Get a kill with Heavy Roller',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const DIG_DUG = createAchievement({
    id: 'dig_dug',
    name: 'Dig Dug',
    description: 'Get a kill with Digger',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const DEEP_IMPACT = createAchievement({
    id: 'deep_impact',
    name: 'Deep Impact',
    description: 'Get a kill with Heavy Digger',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const MINI_MELTDOWN = createAchievement({
    id: 'mini_meltdown',
    name: 'Mini Meltdown',
    description: 'Get a kill with Mini Nuke',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const NUCLEAR_WINTER = createAchievement({
    id: 'nuclear_winter',
    name: 'Nuclear Winter',
    description: 'Get a kill with Nuke',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE
});

const ARSENAL_MASTER = createAchievement({
    id: 'arsenal_master',
    name: 'Arsenal Master',
    description: 'Kill with every weapon type',
    category: ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 11, // All 11 weapons
    specialReward: 'tank_skin'
});

// --- Progression Achievements (5) ---

const SURVIVOR = createAchievement({
    id: 'survivor',
    name: 'Survivor',
    description: 'Reach Round 5',
    category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 5
});

const VETERAN = createAchievement({
    id: 'veteran',
    name: 'Veteran',
    description: 'Reach Round 10',
    category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 10
});

const WAR_HERO = createAchievement({
    id: 'war_hero',
    name: 'War Hero',
    description: 'Reach Round 15',
    category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 15
});

const LEGEND = createAchievement({
    id: 'legend',
    name: 'Legend',
    description: 'Reach Round 20',
    category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
    difficulty: ACHIEVEMENT_DIFFICULTY.VERY_HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 20
});

const IMMORTAL = createAchievement({
    id: 'immortal',
    name: 'Immortal',
    description: 'Reach Round 25',
    category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
    difficulty: ACHIEVEMENT_DIFFICULTY.EXTREME,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 25
});

// --- Economy Achievements (5) ---

const PENNY_SAVED = createAchievement({
    id: 'penny_saved',
    name: 'Penny Saved',
    description: 'Accumulate $5,000 total',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 5000
});

const WAR_CHEST = createAchievement({
    id: 'war_chest',
    name: 'War Chest',
    description: 'Accumulate $10,000 total',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 10000
});

const ARMS_DEALER = createAchievement({
    id: 'arms_dealer',
    name: 'Arms Dealer',
    description: 'Accumulate $25,000 total',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 25000
});

const FULLY_LOADED = createAchievement({
    id: 'fully_loaded',
    name: 'Fully Loaded',
    description: 'Own at least 1 of every weapon',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.CONDITIONAL
});

const STOCKPILE = createAchievement({
    id: 'stockpile',
    name: 'Stockpile',
    description: 'Own 50+ total weapons',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.COUNTER,
    target: 50
});

// --- Hidden Achievements (5) ---

const SELF_DESTRUCT = createAchievement({
    id: 'self_destruct',
    name: 'Self Destruct',
    description: 'Destroy yourself with your own weapon',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE,
    hidden: true
});

const MUTUAL_DESTRUCTION = createAchievement({
    id: 'mutual_destruction',
    name: 'Mutual Destruction',
    description: 'Both tanks destroyed same round',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.SINGLE,
    hidden: true
});

const PATIENT_ZERO = createAchievement({
    id: 'patient_zero',
    name: 'Patient Zero',
    description: 'Miss 10 shots in a row, then win',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.CONDITIONAL,
    hidden: true
});

const AGAINST_ALL_ODDS = createAchievement({
    id: 'against_all_odds',
    name: 'Against All Odds',
    description: 'Beat Hard AI on Round 1',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.CONDITIONAL,
    hidden: true
});

const MINIMALIST = createAchievement({
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Win with only 1 weapon in inventory',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    trackingType: ACHIEVEMENT_TRACKING_TYPES.CONDITIONAL,
    hidden: true
});

// =============================================================================
// ACHIEVEMENT REGISTRY
// =============================================================================

/**
 * All achievements organized by category for efficient lookup.
 */
const achievementsByCategory = {
    [ACHIEVEMENT_CATEGORIES.COMBAT]: [
        FIRST_BLOOD,
        DIRECT_HIT,
        OVERKILL,
        UNTOUCHABLE,
        COMEBACK_KING,
        NAIL_BITER,
        FLAWLESS_VICTORY
    ],
    [ACHIEVEMENT_CATEGORIES.PRECISION]: [
        SHARPSHOOTER,
        EAGLE_EYE,
        SNIPER_ELITE,
        WIND_WHISPERER,
        STORM_CHASER,
        TRICK_SHOT,
        HOLE_IN_ONE
    ],
    [ACHIEVEMENT_CATEGORIES.WEAPON_MASTERY]: [
        BASIC_TRAINING,
        MISSILE_COMMAND,
        BIG_GAME_HUNTER,
        CLUSTER_BOMB,
        DEATH_DEALER,
        ROLLER_COASTER,
        HEAVY_ROLLER_ACH,
        DIG_DUG,
        DEEP_IMPACT,
        MINI_MELTDOWN,
        NUCLEAR_WINTER,
        ARSENAL_MASTER
    ],
    [ACHIEVEMENT_CATEGORIES.PROGRESSION]: [
        SURVIVOR,
        VETERAN,
        WAR_HERO,
        LEGEND,
        IMMORTAL
    ],
    [ACHIEVEMENT_CATEGORIES.ECONOMY]: [
        PENNY_SAVED,
        WAR_CHEST,
        ARMS_DEALER,
        FULLY_LOADED,
        STOCKPILE
    ],
    [ACHIEVEMENT_CATEGORIES.HIDDEN]: [
        SELF_DESTRUCT,
        MUTUAL_DESTRUCTION,
        PATIENT_ZERO,
        AGAINST_ALL_ODDS,
        MINIMALIST
    ]
};

/**
 * Internal map of all achievements keyed by ID.
 * @type {Map<string, Achievement>}
 */
const achievementsMap = new Map();

// Populate the map from categories
Object.values(achievementsByCategory).forEach(achievements => {
    achievements.forEach(achievement => {
        achievementsMap.set(achievement.id, achievement);
    });
});

/**
 * Get an achievement by its ID.
 * @param {string} id - Achievement ID (e.g., 'first_blood', 'sharpshooter')
 * @returns {Achievement|null} Achievement definition or null if not found
 */
export function getAchievement(id) {
    return achievementsMap.get(id) || null;
}

/**
 * Get all achievements in a specific category.
 * @param {string} category - Category from ACHIEVEMENT_CATEGORIES
 * @returns {Achievement[]} Array of achievements in that category
 */
export function getAchievementsByCategory(category) {
    return achievementsByCategory[category] || [];
}

/**
 * Get all achievements as an array.
 * @returns {Achievement[]} Array of all achievement definitions
 */
export function getAllAchievements() {
    return Array.from(achievementsMap.values());
}

/**
 * Get total count of all achievements.
 * @returns {number} Number of achievements
 */
export function getAchievementCount() {
    return achievementsMap.size;
}

/**
 * Get achievements filtered by difficulty.
 * @param {string} difficulty - Difficulty from ACHIEVEMENT_DIFFICULTY
 * @returns {Achievement[]} Array of achievements with that difficulty
 */
export function getAchievementsByDifficulty(difficulty) {
    return getAllAchievements().filter(a => a.difficulty === difficulty);
}

/**
 * Get all visible (non-hidden) achievements.
 * @returns {Achievement[]} Array of visible achievements
 */
export function getVisibleAchievements() {
    return getAllAchievements().filter(a => !a.hidden);
}

/**
 * Get all hidden achievements.
 * @returns {Achievement[]} Array of hidden achievements
 */
export function getHiddenAchievements() {
    return getAllAchievements().filter(a => a.hidden);
}

/**
 * Check if an achievement ID is valid.
 * @param {string} id - Achievement ID to check
 * @returns {boolean} True if achievement exists
 */
export function hasAchievement(id) {
    return achievementsMap.has(id);
}

/**
 * Get token reward for a specific difficulty.
 * @param {string} difficulty - Difficulty from ACHIEVEMENT_DIFFICULTY
 * @returns {number} Token reward amount
 */
export function getTokenRewardForDifficulty(difficulty) {
    return DIFFICULTY_TOKEN_REWARDS[difficulty] || 0;
}

// =============================================================================
// NAMED EXPORTS FOR DIRECT ACCESS
// =============================================================================

// Export individual achievements for direct access if needed
export {
    // Combat
    FIRST_BLOOD,
    DIRECT_HIT,
    OVERKILL,
    UNTOUCHABLE,
    COMEBACK_KING,
    NAIL_BITER,
    FLAWLESS_VICTORY,
    // Precision
    SHARPSHOOTER,
    EAGLE_EYE,
    SNIPER_ELITE,
    WIND_WHISPERER,
    STORM_CHASER,
    TRICK_SHOT,
    HOLE_IN_ONE,
    // Weapon Mastery
    BASIC_TRAINING,
    MISSILE_COMMAND,
    BIG_GAME_HUNTER,
    CLUSTER_BOMB,
    DEATH_DEALER,
    ROLLER_COASTER,
    HEAVY_ROLLER_ACH,
    DIG_DUG,
    DEEP_IMPACT,
    MINI_MELTDOWN,
    NUCLEAR_WINTER,
    ARSENAL_MASTER,
    // Progression
    SURVIVOR,
    VETERAN,
    WAR_HERO,
    LEGEND,
    IMMORTAL,
    // Economy
    PENNY_SAVED,
    WAR_CHEST,
    ARMS_DEALER,
    FULLY_LOADED,
    STOCKPILE,
    // Hidden
    SELF_DESTRUCT,
    MUTUAL_DESTRUCTION,
    PATIENT_ZERO,
    AGAINST_ALL_ODDS,
    MINIMALIST
};

// =============================================================================
// ACHIEVEMENT STATE TRACKING AND PERSISTENCE
// =============================================================================

/**
 * localStorage key for achievement state.
 * @type {string}
 */
const STORAGE_KEY = 'scorched_earth_achievements';

/**
 * Default achievement state structure for new players.
 * @type {Object}
 */
const DEFAULT_ACHIEVEMENT_STATE = {
    unlocked: [],       // Array of unlocked achievement IDs
    progress: {},       // Map of achievement ID -> { current: number, required: number }
    unlockDates: {}     // Map of achievement ID -> ISO date string
};

/**
 * In-memory achievement state (loaded from localStorage).
 * @type {Object}
 */
let achievementState = { ...DEFAULT_ACHIEVEMENT_STATE };

/**
 * Registered callback functions for achievement unlocks.
 * @type {Function[]}
 */
const unlockCallbacks = [];

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
            console.log(`[Achievements] ${message}`, data);
        } else {
            console.log(`[Achievements] ${message}`);
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
        console.warn(`[Achievements] Failed to parse ${key}, using default:`, error);
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
        console.error(`[Achievements] Failed to save ${key}:`, error);
        return false;
    }
}

// =============================================================================
// STATE PERSISTENCE
// =============================================================================

/**
 * Load achievement state from localStorage.
 * Called on module initialization.
 * @returns {Object} The loaded or default achievement state
 */
export function loadAchievementState() {
    const stored = safeGetItem(STORAGE_KEY, null);

    if (stored) {
        // Merge with defaults to ensure all fields exist
        achievementState = {
            unlocked: Array.isArray(stored.unlocked) ? stored.unlocked : [],
            progress: stored.progress && typeof stored.progress === 'object' ? stored.progress : {},
            unlockDates: stored.unlockDates && typeof stored.unlockDates === 'object' ? stored.unlockDates : {}
        };
        debugLog('Achievement state loaded', {
            unlockedCount: achievementState.unlocked.length,
            progressCount: Object.keys(achievementState.progress).length
        });
    } else {
        // Initialize clean state for new players
        achievementState = { ...DEFAULT_ACHIEVEMENT_STATE, progress: {}, unlockDates: {} };
        debugLog('New achievement state initialized');
    }

    return achievementState;
}

/**
 * Save achievement state to localStorage.
 * Called automatically when state changes.
 * @returns {boolean} True if save succeeded
 */
export function saveAchievementState() {
    const saved = safeSetItem(STORAGE_KEY, achievementState);
    if (saved) {
        debugLog('Achievement state saved');
    }
    return saved;
}

/**
 * Get the current achievement state (for export/debug).
 * @returns {Object} Copy of current achievement state
 */
export function getAchievementState() {
    return {
        unlocked: [...achievementState.unlocked],
        progress: { ...achievementState.progress },
        unlockDates: { ...achievementState.unlockDates }
    };
}

// =============================================================================
// ACHIEVEMENT TRACKING FUNCTIONS
// =============================================================================

/**
 * Check if an achievement is unlocked.
 * @param {string} id - Achievement ID
 * @returns {boolean} True if achievement is unlocked
 */
export function isAchievementUnlocked(id) {
    return achievementState.unlocked.includes(id);
}

/**
 * Get progress for a counter-type achievement.
 * @param {string} id - Achievement ID
 * @returns {Object|null} Progress object { current, required } or null if no progress tracked
 */
export function getAchievementProgress(id) {
    const progress = achievementState.progress[id];
    if (progress) {
        return { ...progress };
    }

    // Check if this is a counter achievement and return initial state
    const achievement = getAchievement(id);
    if (achievement && achievement.trackingType === ACHIEVEMENT_TRACKING_TYPES.COUNTER) {
        return { current: 0, required: achievement.target };
    }

    return null;
}

/**
 * Update progress for a counter-type achievement.
 * Automatically unlocks if target is reached.
 * @param {string} id - Achievement ID
 * @param {number} value - New value to set (absolute) or increment by (if increment=true)
 * @param {boolean} [increment=false] - If true, add value to current; if false, set value
 * @returns {Object} Result { updated: boolean, progress: Object|null, unlocked: boolean, reward: number }
 */
export function updateAchievementProgress(id, value, increment = false) {
    const achievement = getAchievement(id);

    // Validate achievement exists
    if (!achievement) {
        console.warn(`[Achievements] Unknown achievement ID: ${id}`);
        return { updated: false, progress: null, unlocked: false, reward: 0 };
    }

    // Already unlocked - no need to track progress
    if (isAchievementUnlocked(id)) {
        return {
            updated: false,
            progress: { current: achievement.target, required: achievement.target },
            unlocked: true,
            reward: 0
        };
    }

    // Initialize progress if not exists
    if (!achievementState.progress[id]) {
        achievementState.progress[id] = {
            current: 0,
            required: achievement.target
        };
    }

    // Update progress
    const progress = achievementState.progress[id];
    if (increment) {
        progress.current = Math.min(progress.current + value, progress.required);
    } else {
        progress.current = Math.min(value, progress.required);
    }

    // Check if achievement should unlock
    let unlocked = false;
    let reward = 0;
    if (progress.current >= progress.required) {
        const unlockResult = unlockAchievement(id);
        unlocked = unlockResult.unlocked;
        reward = unlockResult.reward;
    } else {
        // Save state on progress update
        saveAchievementState();
    }

    debugLog(`Progress updated: ${id}`, {
        current: progress.current,
        required: progress.required,
        unlocked
    });

    return {
        updated: true,
        progress: { ...progress },
        unlocked,
        reward
    };
}

/**
 * Unlock an achievement, trigger callbacks, and save state.
 * @param {string} id - Achievement ID
 * @returns {Object} Result { unlocked: boolean, reward: number, specialReward: string|null }
 */
export function unlockAchievement(id) {
    const achievement = getAchievement(id);

    // Validate achievement exists
    if (!achievement) {
        console.warn(`[Achievements] Cannot unlock unknown achievement: ${id}`);
        return { unlocked: false, reward: 0, specialReward: null };
    }

    // Already unlocked
    if (isAchievementUnlocked(id)) {
        debugLog(`Achievement already unlocked: ${id}`);
        return { unlocked: false, reward: 0, specialReward: null };
    }

    // Mark as unlocked
    achievementState.unlocked.push(id);
    achievementState.unlockDates[id] = new Date().toISOString();

    // Update progress to show complete (for counter achievements)
    if (achievement.trackingType === ACHIEVEMENT_TRACKING_TYPES.COUNTER) {
        achievementState.progress[id] = {
            current: achievement.target,
            required: achievement.target
        };
    }

    // Save state
    saveAchievementState();

    debugLog(`Achievement unlocked: ${achievement.name}`, {
        id,
        tokenReward: achievement.tokenReward,
        specialReward: achievement.specialReward
    });

    // Trigger callbacks
    const callbackData = {
        achievement,
        reward: achievement.tokenReward,
        specialReward: achievement.specialReward,
        timestamp: achievementState.unlockDates[id]
    };

    unlockCallbacks.forEach(callback => {
        try {
            callback(callbackData);
        } catch (error) {
            console.error('[Achievements] Callback error:', error);
        }
    });

    return {
        unlocked: true,
        reward: achievement.tokenReward,
        specialReward: achievement.specialReward
    };
}

/**
 * Register a callback function for achievement unlocks.
 * @param {Function} callback - Function to call when achievement unlocks.
 *                              Receives { achievement, reward, specialReward, timestamp }
 * @returns {Function} Unsubscribe function
 */
export function onAchievementUnlock(callback) {
    if (typeof callback !== 'function') {
        console.warn('[Achievements] Invalid callback provided to onAchievementUnlock');
        return () => {};
    }

    unlockCallbacks.push(callback);
    debugLog('Achievement unlock callback registered', { total: unlockCallbacks.length });

    // Return unsubscribe function
    return () => {
        const index = unlockCallbacks.indexOf(callback);
        if (index > -1) {
            unlockCallbacks.splice(index, 1);
            debugLog('Achievement unlock callback removed', { total: unlockCallbacks.length });
        }
    };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get count of unlocked achievements.
 * @returns {number} Number of unlocked achievements
 */
export function getUnlockedCount() {
    return achievementState.unlocked.length;
}

/**
 * Get all unlocked achievement IDs.
 * @returns {string[]} Array of unlocked achievement IDs
 */
export function getUnlockedAchievementIds() {
    return [...achievementState.unlocked];
}

/**
 * Get total tokens earned from achievements.
 * @returns {number} Total token reward from all unlocked achievements
 */
export function getTotalTokensEarned() {
    return achievementState.unlocked.reduce((total, id) => {
        const achievement = getAchievement(id);
        return total + (achievement ? achievement.tokenReward : 0);
    }, 0);
}

/**
 * Get unlock date for an achievement.
 * @param {string} id - Achievement ID
 * @returns {Date|null} Unlock date or null if not unlocked
 */
export function getUnlockDate(id) {
    const dateStr = achievementState.unlockDates[id];
    return dateStr ? new Date(dateStr) : null;
}

/**
 * Reset all achievement state (for testing or user-requested reset).
 * @returns {boolean} True if reset succeeded
 */
export function resetAchievementState() {
    achievementState = {
        unlocked: [],
        progress: {},
        unlockDates: {}
    };
    const saved = saveAchievementState();
    debugLog('Achievement state reset');
    return saved;
}

/**
 * Get achievement statistics.
 * @returns {Object} Statistics about achievement progress
 */
export function getAchievementStats() {
    const total = getAchievementCount();
    const unlocked = getUnlockedCount();
    const visible = getVisibleAchievements().length;
    const visibleUnlocked = achievementState.unlocked.filter(id => {
        const ach = getAchievement(id);
        return ach && !ach.hidden;
    }).length;

    return {
        total,
        unlocked,
        remaining: total - unlocked,
        percentComplete: total > 0 ? Math.round((unlocked / total) * 100) : 0,
        visible,
        visibleUnlocked,
        hiddenUnlocked: unlocked - visibleUnlocked,
        tokensEarned: getTotalTokensEarned()
    };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the achievement state module.
 * Loads state from localStorage.
 */
export function initAchievementState() {
    loadAchievementState();
    debugLog('Achievement state module initialized', getAchievementStats());
}

// Auto-initialize on module load
initAchievementState();
