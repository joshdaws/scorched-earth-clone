/**
 * Scorched Earth: Synthwave Edition
 * Weapon Unlock System
 *
 * Manages weapon unlocks based on multiple criteria:
 * - Default (always available)
 * - Star milestones (total stars earned)
 * - Level completion (specific levels/worlds)
 * - Coins purchase (permanent unlock with coins)
 * - Achievement completion (unlock specific achievements)
 *
 * All 40 weapons have defined unlock requirements.
 */

import { Stars } from './stars.js';
import * as LifetimeStats from './lifetime-stats.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'scorchedEarth_weaponUnlocks';

// =============================================================================
// UNLOCK TYPES
// =============================================================================

/**
 * Types of unlock requirements.
 */
export const UNLOCK_TYPES = {
    /** Always available from the start */
    DEFAULT: 'default',
    /** Unlocks at a total star threshold */
    STARS: 'stars',
    /** Unlocks after completing a specific level */
    LEVEL: 'level',
    /** Unlocks after completing a world */
    WORLD: 'world',
    /** Can be permanently purchased with coins */
    COINS: 'coins',
    /** Unlocks when a specific achievement is earned */
    ACHIEVEMENT: 'achievement',
    /** Unlocks after reaching a certain number of wins */
    WINS: 'wins'
};

// =============================================================================
// WEAPON UNLOCK DEFINITIONS
// =============================================================================

/**
 * Unlock requirements for all 40 weapons.
 * Organized by category for clarity.
 *
 * Distribution per the issue spec:
 * - Default: 3 weapons (Baby Shot, Basic Shot, Roller)
 * - Star Milestones: 10 weapons (30★, 60★, 90★, 120★, 150★, etc.)
 * - Level Completion: 12 weapons (specific levels)
 * - Coins Purchase: 10 weapons (shop unlocks)
 * - Achievements: 5 weapons (specific achievements)
 */
const WEAPON_UNLOCK_REQUIREMENTS = {
    // =========================================================================
    // STANDARD CATEGORY (8 weapons)
    // =========================================================================
    'baby-shot': {
        type: UNLOCK_TYPES.DEFAULT,
        name: 'Baby Shot',
        description: 'Default starter weapon',
        hint: 'Available from start'
    },
    'basic-shot': {
        type: UNLOCK_TYPES.DEFAULT,
        name: 'Basic Shot',
        description: 'Default starter weapon',
        hint: 'Available from start'
    },
    'missile': {
        type: UNLOCK_TYPES.STARS,
        requirement: 10,
        name: 'Missile',
        description: 'Unlocked at 10 stars',
        hint: 'Earn 10 total stars'
    },
    'big-shot': {
        type: UNLOCK_TYPES.STARS,
        requirement: 30,
        name: 'Big Shot',
        description: 'Unlocked at 30 stars',
        hint: 'Earn 30 total stars'
    },
    'mega-shot': {
        type: UNLOCK_TYPES.COINS,
        cost: 3000,
        name: 'Mega Shot',
        description: 'Purchase to unlock permanently',
        hint: 'Unlock for $3,000'
    },
    'armor-piercer': {
        type: UNLOCK_TYPES.WINS,
        requirement: 5,
        name: 'Armor Piercer',
        description: 'Unlocked after 5 wins',
        hint: 'Win 5 rounds total'
    },
    'tracer': {
        type: UNLOCK_TYPES.LEVEL,
        world: 1,
        level: 3,
        name: 'Tracer',
        description: 'Complete World 1, Level 3',
        hint: 'Complete World 1-3'
    },
    'precision-strike': {
        type: UNLOCK_TYPES.ACHIEVEMENT,
        achievementId: 'sharpshooter',
        name: 'Precision Strike',
        description: 'Unlock the Sharpshooter achievement',
        hint: 'Hit 3 consecutive shots'
    },

    // =========================================================================
    // SPLITTING CATEGORY (6 weapons)
    // =========================================================================
    'mirv': {
        type: UNLOCK_TYPES.STARS,
        requirement: 45,
        name: 'MIRV',
        description: 'Unlocked at 45 stars',
        hint: 'Earn 45 total stars'
    },
    'deaths-head': {
        type: UNLOCK_TYPES.STARS,
        requirement: 90,
        name: "Death's Head",
        description: 'Unlocked at 90 stars',
        hint: 'Earn 90 total stars'
    },
    'cluster-bomb': {
        type: UNLOCK_TYPES.COINS,
        cost: 5000,
        name: 'Cluster Bomb',
        description: 'Purchase to unlock permanently',
        hint: 'Unlock for $5,000'
    },
    'chain-reaction': {
        type: UNLOCK_TYPES.ACHIEVEMENT,
        achievementId: 'overkill',
        name: 'Chain Reaction',
        description: 'Unlock the Overkill achievement',
        hint: 'Deal 150%+ of enemy health in one hit'
    },
    'scatter-shot': {
        type: UNLOCK_TYPES.LEVEL,
        world: 2,
        level: 2,
        name: 'Scatter Shot',
        description: 'Complete World 2, Level 2',
        hint: 'Complete World 2-2'
    },
    'fireworks': {
        type: UNLOCK_TYPES.LEVEL,
        world: 1,
        level: 5,
        name: 'Fireworks',
        description: 'Complete World 1, Level 5',
        hint: 'Complete World 1-5'
    },

    // =========================================================================
    // ROLLING CATEGORY (6 weapons)
    // =========================================================================
    'roller': {
        type: UNLOCK_TYPES.DEFAULT,
        name: 'Roller',
        description: 'Default starter weapon',
        hint: 'Available from start'
    },
    'heavy-roller': {
        type: UNLOCK_TYPES.STARS,
        requirement: 60,
        name: 'Heavy Roller',
        description: 'Unlocked at 60 stars',
        hint: 'Earn 60 total stars'
    },
    'bouncer': {
        type: UNLOCK_TYPES.LEVEL,
        world: 1,
        level: 4,
        name: 'Bouncer',
        description: 'Complete World 1, Level 4',
        hint: 'Complete World 1-4'
    },
    'super-bouncer': {
        type: UNLOCK_TYPES.COINS,
        cost: 4000,
        name: 'Super Bouncer',
        description: 'Purchase to unlock permanently',
        hint: 'Unlock for $4,000'
    },
    'land-mine': {
        type: UNLOCK_TYPES.WINS,
        requirement: 8,
        name: 'Land Mine',
        description: 'Unlocked after 8 wins',
        hint: 'Win 8 rounds total'
    },
    'sticky-bomb': {
        type: UNLOCK_TYPES.LEVEL,
        world: 2,
        level: 3,
        name: 'Sticky Bomb',
        description: 'Complete World 2, Level 3',
        hint: 'Complete World 2-3'
    },

    // =========================================================================
    // DIGGING CATEGORY (6 weapons)
    // =========================================================================
    'digger': {
        type: UNLOCK_TYPES.STARS,
        requirement: 20,
        name: 'Digger',
        description: 'Unlocked at 20 stars',
        hint: 'Earn 20 total stars'
    },
    'heavy-digger': {
        type: UNLOCK_TYPES.STARS,
        requirement: 75,
        name: 'Heavy Digger',
        description: 'Unlocked at 75 stars',
        hint: 'Earn 75 total stars'
    },
    'sandhog': {
        type: UNLOCK_TYPES.LEVEL,
        world: 3,
        level: 2,
        name: 'Sandhog',
        description: 'Complete World 3, Level 2',
        hint: 'Complete World 3-2'
    },
    'drill': {
        type: UNLOCK_TYPES.COINS,
        cost: 3500,
        name: 'Drill',
        description: 'Purchase to unlock permanently',
        hint: 'Unlock for $3,500'
    },
    'laser-drill': {
        type: UNLOCK_TYPES.ACHIEVEMENT,
        achievementId: 'eagle_eye',
        name: 'Laser Drill',
        description: 'Unlock the Eagle Eye achievement',
        hint: 'Hit 5 consecutive shots'
    },
    'tunnel-maker': {
        type: UNLOCK_TYPES.LEVEL,
        world: 3,
        level: 4,
        name: 'Tunnel Maker',
        description: 'Complete World 3, Level 4',
        hint: 'Complete World 3-4'
    },

    // =========================================================================
    // NUCLEAR CATEGORY (6 weapons)
    // =========================================================================
    'mini-nuke': {
        type: UNLOCK_TYPES.STARS,
        requirement: 105,
        name: 'Mini Nuke',
        description: 'Unlocked at 105 stars',
        hint: 'Earn 105 total stars'
    },
    'nuke': {
        type: UNLOCK_TYPES.STARS,
        requirement: 135,
        name: 'Nuke',
        description: 'Unlocked at 135 stars',
        hint: 'Earn 135 total stars'
    },
    'tactical-nuke': {
        type: UNLOCK_TYPES.COINS,
        cost: 10000,
        name: 'Tactical Nuke',
        description: 'Purchase to unlock permanently',
        hint: 'Unlock for $10,000'
    },
    'neutron-bomb': {
        type: UNLOCK_TYPES.WORLD,
        world: 4,
        name: 'Neutron Bomb',
        description: 'Complete World 4',
        hint: 'Complete all levels in World 4'
    },
    'emp-blast': {
        type: UNLOCK_TYPES.COINS,
        cost: 6000,
        name: 'EMP Blast',
        description: 'Purchase to unlock permanently',
        hint: 'Unlock for $6,000'
    },
    'fusion-strike': {
        type: UNLOCK_TYPES.ACHIEVEMENT,
        achievementId: 'legend',
        name: 'Fusion Strike',
        description: 'Unlock the Legend achievement',
        hint: 'Reach Round 20'
    },

    // =========================================================================
    // SPECIAL CATEGORY (8 weapons)
    // =========================================================================
    'napalm': {
        type: UNLOCK_TYPES.LEVEL,
        world: 2,
        level: 5,
        name: 'Napalm',
        description: 'Complete World 2, Level 5',
        hint: 'Complete World 2-5'
    },
    'liquid-dirt': {
        type: UNLOCK_TYPES.LEVEL,
        world: 3,
        level: 3,
        name: 'Liquid Dirt',
        description: 'Complete World 3, Level 3',
        hint: 'Complete World 3-3'
    },
    'teleporter': {
        type: UNLOCK_TYPES.COINS,
        cost: 5000,
        name: 'Teleporter',
        description: 'Purchase to unlock permanently',
        hint: 'Unlock for $5,000'
    },
    'shield-buster': {
        type: UNLOCK_TYPES.WORLD,
        world: 3,
        name: 'Shield Buster',
        description: 'Complete World 3',
        hint: 'Complete all levels in World 3'
    },
    'wind-bomb': {
        type: UNLOCK_TYPES.WINS,
        requirement: 3,
        name: 'Wind Bomb',
        description: 'Unlocked after 3 wins',
        hint: 'Win 3 rounds total'
    },
    'gravity-well': {
        type: UNLOCK_TYPES.COINS,
        cost: 7000,
        name: 'Gravity Well',
        description: 'Purchase to unlock permanently',
        hint: 'Unlock for $7,000'
    },
    'lightning-strike': {
        type: UNLOCK_TYPES.LEVEL,
        world: 4,
        level: 3,
        name: 'Lightning Strike',
        description: 'Complete World 4, Level 3',
        hint: 'Complete World 4-3'
    },
    'ion-cannon': {
        type: UNLOCK_TYPES.ACHIEVEMENT,
        achievementId: 'war_hero',
        name: 'Ion Cannon',
        description: 'Unlock the War Hero achievement',
        hint: 'Reach Round 15'
    }
};

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Permanently purchased weapon unlocks (coins).
 * Persisted to localStorage.
 * @type {Set<string>}
 */
let purchasedWeapons = new Set();

/**
 * Cached unlock states to avoid recalculating every frame.
 * Invalidated when relevant state changes.
 * @type {Map<string, boolean>}
 */
const unlockCache = new Map();

/**
 * Whether cache needs to be cleared on next check.
 * @type {boolean}
 */
let cacheInvalidated = true;

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Load purchased weapons from localStorage.
 */
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if (data.purchasedWeapons && Array.isArray(data.purchasedWeapons)) {
                purchasedWeapons = new Set(data.purchasedWeapons);
                console.log('[Unlocks] Loaded purchased weapons:', [...purchasedWeapons]);
            }
        }
    } catch (e) {
        console.warn('[Unlocks] Failed to load state:', e);
    }
}

/**
 * Save purchased weapons to localStorage.
 */
function saveState() {
    try {
        const data = {
            purchasedWeapons: [...purchasedWeapons]
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('[Unlocks] Failed to save state:', e);
    }
}

// =============================================================================
// UNLOCK CHECKING
// =============================================================================

/**
 * Invalidate the unlock cache.
 * Should be called when stars, achievements, or other state changes.
 */
export function invalidateCache() {
    cacheInvalidated = true;
    unlockCache.clear();
}

/**
 * Check if a level is completed.
 * @param {number} world - World number (1-based)
 * @param {number} level - Level number (1-based)
 * @returns {boolean} Whether the level is completed
 */
function isLevelCompleted(world, level) {
    try {
        const worldStars = Stars.getWorldStars(world);
        const levelKey = `${world}-${level}`;
        return (worldStars.levels[levelKey] || 0) >= 1;
    } catch (e) {
        return false;
    }
}

/**
 * Check if a world is completed (all levels have at least 1 star).
 * @param {number} world - World number (1-based)
 * @returns {boolean} Whether the world is completed
 */
function isWorldCompleted(world) {
    try {
        const worldStars = Stars.getWorldStars(world);
        const levelStars = Object.values(worldStars.levels);
        // Assume 5 levels per world as default
        return levelStars.length >= 5 && levelStars.every(stars => stars >= 1);
    } catch (e) {
        return false;
    }
}

/**
 * Check if an achievement is unlocked.
 * @param {string} achievementId - Achievement ID to check
 * @returns {boolean} Whether the achievement is unlocked
 */
function isAchievementUnlocked(achievementId) {
    try {
        // Import dynamically to avoid circular dependency
        const achievementsKey = 'scorchedEarth_achievements';
        const saved = localStorage.getItem(achievementsKey);
        if (saved) {
            const data = JSON.parse(saved);
            return data.unlocked && data.unlocked.includes(achievementId);
        }
        return false;
    } catch (e) {
        return false;
    }
}

/**
 * Check if a weapon is unlocked based on its requirements.
 * @param {string} weaponId - Weapon ID to check
 * @returns {boolean} Whether the weapon is unlocked
 */
export function isWeaponUnlocked(weaponId) {
    // Check cache first
    if (!cacheInvalidated && unlockCache.has(weaponId)) {
        return unlockCache.get(weaponId);
    }

    const req = WEAPON_UNLOCK_REQUIREMENTS[weaponId];
    if (!req) {
        // Unknown weapon - assume locked
        console.warn(`[Unlocks] Unknown weapon: ${weaponId}`);
        return false;
    }

    let unlocked = false;

    switch (req.type) {
        case UNLOCK_TYPES.DEFAULT:
            unlocked = true;
            break;

        case UNLOCK_TYPES.STARS:
            unlocked = Stars.getTotalStars() >= req.requirement;
            break;

        case UNLOCK_TYPES.LEVEL:
            unlocked = isLevelCompleted(req.world, req.level);
            break;

        case UNLOCK_TYPES.WORLD:
            unlocked = isWorldCompleted(req.world);
            break;

        case UNLOCK_TYPES.COINS:
            unlocked = purchasedWeapons.has(weaponId);
            break;

        case UNLOCK_TYPES.ACHIEVEMENT:
            unlocked = isAchievementUnlocked(req.achievementId);
            break;

        case UNLOCK_TYPES.WINS:
            unlocked = LifetimeStats.getSummary().wins >= req.requirement;
            break;

        default:
            console.warn(`[Unlocks] Unknown unlock type: ${req.type}`);
            unlocked = false;
    }

    // Cache the result
    unlockCache.set(weaponId, unlocked);

    return unlocked;
}

/**
 * Get unlock information for a weapon.
 * @param {string} weaponId - Weapon ID
 * @returns {Object} Unlock info including type, requirements, and status
 */
export function getWeaponUnlockInfo(weaponId) {
    const req = WEAPON_UNLOCK_REQUIREMENTS[weaponId];
    if (!req) {
        return {
            type: 'unknown',
            unlocked: false,
            hint: 'Unknown weapon'
        };
    }

    const unlocked = isWeaponUnlocked(weaponId);
    const info = {
        type: req.type,
        unlocked,
        hint: req.hint,
        description: req.description
    };

    // Add progress info for relevant types
    switch (req.type) {
        case UNLOCK_TYPES.STARS:
            info.current = Stars.getTotalStars();
            info.required = req.requirement;
            info.progress = Math.min(100, Math.floor((info.current / info.required) * 100));
            break;

        case UNLOCK_TYPES.WINS:
            info.current = LifetimeStats.getSummary().wins;
            info.required = req.requirement;
            info.progress = Math.min(100, Math.floor((info.current / info.required) * 100));
            break;

        case UNLOCK_TYPES.COINS:
            info.cost = req.cost;
            break;

        case UNLOCK_TYPES.LEVEL:
            info.world = req.world;
            info.level = req.level;
            break;

        case UNLOCK_TYPES.WORLD:
            info.world = req.world;
            break;

        case UNLOCK_TYPES.ACHIEVEMENT:
            info.achievementId = req.achievementId;
            break;
    }

    return info;
}

/**
 * Get all unlocked weapon IDs.
 * @returns {string[]} Array of unlocked weapon IDs
 */
export function getUnlockedWeaponIds() {
    const ids = [];
    for (const weaponId of Object.keys(WEAPON_UNLOCK_REQUIREMENTS)) {
        if (isWeaponUnlocked(weaponId)) {
            ids.push(weaponId);
        }
    }
    return ids;
}

/**
 * Get all locked weapon IDs.
 * @returns {string[]} Array of locked weapon IDs
 */
export function getLockedWeaponIds() {
    const ids = [];
    for (const weaponId of Object.keys(WEAPON_UNLOCK_REQUIREMENTS)) {
        if (!isWeaponUnlocked(weaponId)) {
            ids.push(weaponId);
        }
    }
    return ids;
}

// =============================================================================
// COIN PURCHASE
// =============================================================================

/**
 * Purchase a weapon unlock with coins.
 * @param {string} weaponId - Weapon ID to purchase
 * @param {function} deductMoney - Function to deduct money, returns true if successful
 * @returns {boolean} Whether the purchase was successful
 */
export function purchaseWeaponUnlock(weaponId, deductMoney) {
    const req = WEAPON_UNLOCK_REQUIREMENTS[weaponId];

    if (!req || req.type !== UNLOCK_TYPES.COINS) {
        console.warn(`[Unlocks] Weapon ${weaponId} is not purchasable`);
        return false;
    }

    if (purchasedWeapons.has(weaponId)) {
        console.log(`[Unlocks] Weapon ${weaponId} already purchased`);
        return false;
    }

    // Try to deduct money
    if (!deductMoney(req.cost)) {
        console.log(`[Unlocks] Cannot afford ${weaponId} ($${req.cost})`);
        return false;
    }

    // Mark as purchased
    purchasedWeapons.add(weaponId);
    invalidateCache();
    saveState();

    console.log(`[Unlocks] Purchased ${weaponId} for $${req.cost}`);
    return true;
}

/**
 * Check if a weapon can be purchased with coins.
 * @param {string} weaponId - Weapon ID to check
 * @returns {{purchasable: boolean, cost: number|null, alreadyOwned?: boolean}} Purchase info
 */
export function getWeaponPurchaseInfo(weaponId) {
    const req = WEAPON_UNLOCK_REQUIREMENTS[weaponId];

    if (!req || req.type !== UNLOCK_TYPES.COINS) {
        return { purchasable: false, cost: null };
    }

    if (purchasedWeapons.has(weaponId)) {
        return { purchasable: false, cost: null, alreadyOwned: true };
    }

    return { purchasable: true, cost: req.cost };
}

/**
 * Get all weapons that can be purchased with coins.
 * @returns {Array<{weaponId: string, cost: number, unlocked: boolean}>}
 */
export function getPurchasableWeapons() {
    const result = [];
    for (const [weaponId, req] of Object.entries(WEAPON_UNLOCK_REQUIREMENTS)) {
        if (req.type === UNLOCK_TYPES.COINS) {
            result.push({
                weaponId,
                cost: req.cost,
                unlocked: purchasedWeapons.has(weaponId)
            });
        }
    }
    return result.sort((a, b) => a.cost - b.cost);
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get unlock statistics summary.
 * @returns {Object} Summary with counts by unlock type
 */
export function getUnlockSummary() {
    const summary = {
        total: 0,
        unlocked: 0,
        byType: {}
    };

    for (const [weaponId, req] of Object.entries(WEAPON_UNLOCK_REQUIREMENTS)) {
        summary.total++;

        if (!summary.byType[req.type]) {
            summary.byType[req.type] = { total: 0, unlocked: 0 };
        }
        summary.byType[req.type].total++;

        if (isWeaponUnlocked(weaponId)) {
            summary.unlocked++;
            summary.byType[req.type].unlocked++;
        }
    }

    summary.percentage = Math.floor((summary.unlocked / summary.total) * 100);

    return summary;
}

/**
 * Get the next unlock milestone info.
 * @returns {Object|null} Next unlock info or null if all unlocked
 */
export function getNextUnlock() {
    const totalStars = Stars.getTotalStars();
    let nextStarWeapon = null;
    let minStarsNeeded = Infinity;

    for (const [weaponId, req] of Object.entries(WEAPON_UNLOCK_REQUIREMENTS)) {
        if (req.type === UNLOCK_TYPES.STARS && !isWeaponUnlocked(weaponId)) {
            const starsNeeded = req.requirement - totalStars;
            if (starsNeeded > 0 && starsNeeded < minStarsNeeded) {
                minStarsNeeded = starsNeeded;
                nextStarWeapon = { weaponId, name: req.name, starsNeeded, targetStars: req.requirement };
            }
        }
    }

    return nextStarWeapon;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the unlock system.
 */
export function init() {
    loadState();
    invalidateCache();
    console.log('[Unlocks] Initialized with', purchasedWeapons.size, 'purchased weapons');
}

/**
 * Reset all unlock progress (for testing/new game).
 */
export function reset() {
    purchasedWeapons.clear();
    invalidateCache();
    saveState();
    console.log('[Unlocks] Reset all progress');
}

// Initialize on module load
init();

// =============================================================================
// PUBLIC API
// =============================================================================

export const Unlocks = {
    // Core checks
    isWeaponUnlocked,
    getWeaponUnlockInfo,
    getUnlockedWeaponIds,
    getLockedWeaponIds,

    // Purchase
    purchaseWeaponUnlock,
    getWeaponPurchaseInfo,
    getPurchasableWeapons,

    // Statistics
    getUnlockSummary,
    getNextUnlock,

    // Cache management
    invalidateCache,

    // Lifecycle
    init,
    reset,

    // Constants
    UNLOCK_TYPES
};

export default Unlocks;
