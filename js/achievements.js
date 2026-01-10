/**
 * Scorched Earth: Synthwave Edition
 * Achievement System - Data Structure and Registry
 *
 * Defines all achievements with their properties matching the game spec.
 * Provides the AchievementRegistry for accessing achievement definitions.
 */

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
