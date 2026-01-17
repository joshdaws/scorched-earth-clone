/**
 * Scorched Earth: Synthwave Edition
 * Unlocks System - Star-based progression unlocks for weapons and skins
 *
 * This module provides the infrastructure for unlocking items based on star progress.
 * Items can be unlocked by:
 * - Total stars earned across all levels
 * - World completion (earning any stars in a world)
 * - Perfect world completion (3 stars on all levels in a world)
 */

import { Stars } from './stars.js';
import { LEVEL_CONSTANTS } from './levels.js';

// =============================================================================
// UNLOCK TYPES
// =============================================================================

export const UNLOCK_TYPES = {
    WEAPON: 'weapon',
    SKIN: 'skin',
    TANK: 'tank',
    EFFECT: 'effect'
};

// =============================================================================
// UNLOCK REQUIREMENTS
// =============================================================================

/**
 * Unlock requirement definitions.
 * Each unlock can have multiple requirement types.
 *
 * @typedef {Object} UnlockRequirement
 * @property {string} type - Requirement type: 'stars', 'world', 'perfectWorld'
 * @property {number} [stars] - Total stars needed (for 'stars' type)
 * @property {number} [world] - World number required (for 'world' and 'perfectWorld')
 */

// =============================================================================
// UNLOCKABLE ITEMS REGISTRY
// =============================================================================

/**
 * Registry of all unlockable items.
 * Maps item ID -> unlock configuration
 *
 * @type {Map<string, Object>}
 */
const unlockableItems = new Map();

/**
 * Register an unlockable item.
 *
 * @param {string} id - Unique item identifier
 * @param {Object} config - Item configuration
 * @param {string} config.type - Item type from UNLOCK_TYPES
 * @param {string} config.name - Display name
 * @param {string} [config.description] - Description for UI
 * @param {UnlockRequirement} config.requirement - Unlock requirement
 * @param {boolean} [config.starterItem] - If true, unlocked from start
 */
function registerUnlockable(id, config) {
    unlockableItems.set(id, {
        id,
        type: config.type,
        name: config.name,
        description: config.description || '',
        requirement: config.requirement,
        starterItem: config.starterItem || false
    });
}

// =============================================================================
// DEFAULT UNLOCKABLES
// =============================================================================

/**
 * Register default weapon unlocks.
 * Basic Shot is always unlocked. Other weapons unlock based on star progress.
 */
function registerDefaultWeaponUnlocks() {
    // Starter weapons (always available)
    registerUnlockable('weapon-basic-shot', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Basic Shot',
        description: 'Default weapon with unlimited ammo',
        starterItem: true,
        requirement: { type: 'stars', stars: 0 }
    });

    // Star-based weapon unlocks
    // These thresholds can be adjusted for balance

    registerUnlockable('weapon-missile', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Missile',
        description: 'Unlocked at 5 stars',
        requirement: { type: 'stars', stars: 5 }
    });

    registerUnlockable('weapon-big-shot', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Big Shot',
        description: 'Unlocked at 15 stars',
        requirement: { type: 'stars', stars: 15 }
    });

    registerUnlockable('weapon-roller', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Roller',
        description: 'Unlocked at 25 stars',
        requirement: { type: 'stars', stars: 25 }
    });

    registerUnlockable('weapon-digger', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Digger',
        description: 'Unlocked at 40 stars',
        requirement: { type: 'stars', stars: 40 }
    });

    registerUnlockable('weapon-mirv', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'MIRV',
        description: 'Unlocked at 60 stars',
        requirement: { type: 'stars', stars: 60 }
    });

    registerUnlockable('weapon-heavy-roller', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Heavy Roller',
        description: 'Unlocked at 80 stars',
        requirement: { type: 'stars', stars: 80 }
    });

    registerUnlockable('weapon-heavy-digger', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Heavy Digger',
        description: 'Unlocked at 100 stars',
        requirement: { type: 'stars', stars: 100 }
    });

    registerUnlockable('weapon-deaths-head', {
        type: UNLOCK_TYPES.WEAPON,
        name: "Death's Head",
        description: 'Unlocked at 120 stars',
        requirement: { type: 'stars', stars: 120 }
    });

    registerUnlockable('weapon-mini-nuke', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Mini Nuke',
        description: 'Unlocked at 140 stars',
        requirement: { type: 'stars', stars: 140 }
    });

    registerUnlockable('weapon-nuke', {
        type: UNLOCK_TYPES.WEAPON,
        name: 'Nuke',
        description: 'Unlocked at 160 stars - the ultimate weapon',
        requirement: { type: 'stars', stars: 160 }
    });
}

/**
 * Register default skin unlocks.
 * Skins are cosmetic tank appearances unlocked by world progress.
 */
function registerDefaultSkinUnlocks() {
    // Starter skin (always available)
    registerUnlockable('skin-default', {
        type: UNLOCK_TYPES.SKIN,
        name: 'Default',
        description: 'Standard synthwave tank',
        starterItem: true,
        requirement: { type: 'stars', stars: 0 }
    });

    // World-based skin unlocks
    registerUnlockable('skin-neon-pulse', {
        type: UNLOCK_TYPES.SKIN,
        name: 'Neon Pulse',
        description: 'Unlocked by completing World 2',
        requirement: { type: 'world', world: 2 }
    });

    registerUnlockable('skin-cyber-chrome', {
        type: UNLOCK_TYPES.SKIN,
        name: 'Cyber Chrome',
        description: 'Unlocked by completing World 3',
        requirement: { type: 'world', world: 3 }
    });

    registerUnlockable('skin-sunset-rider', {
        type: UNLOCK_TYPES.SKIN,
        name: 'Sunset Rider',
        description: 'Unlocked by completing World 4',
        requirement: { type: 'world', world: 4 }
    });

    registerUnlockable('skin-void-walker', {
        type: UNLOCK_TYPES.SKIN,
        name: 'Void Walker',
        description: 'Unlocked by completing World 5',
        requirement: { type: 'world', world: 5 }
    });

    registerUnlockable('skin-star-master', {
        type: UNLOCK_TYPES.SKIN,
        name: 'Star Master',
        description: 'Unlocked by perfecting World 6 (all 3-star levels)',
        requirement: { type: 'perfectWorld', world: 6 }
    });
}

// =============================================================================
// UNLOCK CHECK FUNCTIONS
// =============================================================================

/**
 * Check if a world is completed (player has earned at least 1 star in all levels).
 *
 * @param {number} worldNum - World number to check
 * @returns {boolean} Whether the world is completed
 */
function isWorldCompleted(worldNum) {
    const worldStars = Stars.getWorldStars(worldNum);
    const levelStars = Object.values(worldStars.levels);

    // World is completed if all levels have at least 1 star
    return levelStars.length > 0 && levelStars.every(stars => stars >= 1);
}

/**
 * Check if a world is perfected (player has earned 3 stars in all levels).
 *
 * @param {number} worldNum - World number to check
 * @returns {boolean} Whether the world is perfected
 */
function isWorldPerfected(worldNum) {
    const worldStars = Stars.getWorldStars(worldNum);
    const levelStars = Object.values(worldStars.levels);

    // World is perfected if all levels have 3 stars
    return levelStars.length > 0 && levelStars.every(stars => stars === 3);
}

/**
 * Check if an item is unlocked based on its requirements.
 *
 * @param {string} itemId - Item ID to check
 * @returns {boolean} Whether the item is unlocked
 */
function isUnlocked(itemId) {
    const item = unlockableItems.get(itemId);
    if (!item) {
        console.warn(`Unknown unlockable item: ${itemId}`);
        return false;
    }

    // Starter items are always unlocked
    if (item.starterItem) {
        return true;
    }

    const req = item.requirement;

    switch (req.type) {
        case 'stars':
            return Stars.getTotalStars() >= req.stars;

        case 'world':
            return isWorldCompleted(req.world);

        case 'perfectWorld':
            return isWorldPerfected(req.world);

        default:
            console.warn(`Unknown requirement type: ${req.type}`);
            return false;
    }
}

/**
 * Get unlock progress for an item.
 *
 * @param {string} itemId - Item ID to check
 * @returns {Object} Progress info with current, required, and percentage
 */
function getUnlockProgress(itemId) {
    const item = unlockableItems.get(itemId);
    if (!item) {
        return { current: 0, required: 0, percentage: 0, unlocked: false };
    }

    if (item.starterItem) {
        return { current: 0, required: 0, percentage: 100, unlocked: true };
    }

    const req = item.requirement;
    let current = 0;
    let required = 0;

    switch (req.type) {
        case 'stars':
            current = Stars.getTotalStars();
            required = req.stars;
            break;

        case 'world':
        case 'perfectWorld': {
            const worldStars = Stars.getWorldStars(req.world);
            const targetStarsPerLevel = req.type === 'perfectWorld' ? 3 : 1;
            const levelStars = Object.values(worldStars.levels);
            current = levelStars.filter(s => s >= targetStarsPerLevel).length;
            required = levelStars.length;
            break;
        }
    }

    const percentage = required > 0 ? Math.min(100, Math.floor((current / required) * 100)) : 0;
    const unlocked = isUnlocked(itemId);

    return { current, required, percentage, unlocked };
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get all items of a specific type.
 *
 * @param {string} type - Item type from UNLOCK_TYPES
 * @returns {Object[]} Array of item configs
 */
function getItemsByType(type) {
    const items = [];
    for (const item of unlockableItems.values()) {
        if (item.type === type) {
            items.push({
                ...item,
                unlocked: isUnlocked(item.id),
                progress: getUnlockProgress(item.id)
            });
        }
    }
    return items;
}

/**
 * Get all unlocked items of a specific type.
 *
 * @param {string} type - Item type from UNLOCK_TYPES
 * @returns {Object[]} Array of unlocked item configs
 */
function getUnlockedItemsByType(type) {
    return getItemsByType(type).filter(item => item.unlocked);
}

/**
 * Get all locked items of a specific type.
 *
 * @param {string} type - Item type from UNLOCK_TYPES
 * @returns {Object[]} Array of locked item configs
 */
function getLockedItemsByType(type) {
    return getItemsByType(type).filter(item => !item.unlocked);
}

/**
 * Get the next unlock milestone for any type.
 *
 * @returns {Object|null} Next unlock info or null if all unlocked
 */
function getNextUnlock() {
    const totalStars = Stars.getTotalStars();
    let nextItem = null;
    let minStarsNeeded = Infinity;

    for (const item of unlockableItems.values()) {
        if (item.starterItem) continue;
        if (isUnlocked(item.id)) continue;

        if (item.requirement.type === 'stars') {
            const starsNeeded = item.requirement.stars - totalStars;
            if (starsNeeded > 0 && starsNeeded < minStarsNeeded) {
                minStarsNeeded = starsNeeded;
                nextItem = item;
            }
        }
    }

    if (nextItem) {
        return {
            item: nextItem,
            starsNeeded: minStarsNeeded,
            currentStars: totalStars,
            targetStars: nextItem.requirement.stars
        };
    }

    return null;
}

/**
 * Get a summary of unlock progress.
 *
 * @returns {Object} Summary with counts by type
 */
function getUnlockSummary() {
    const summary = {
        weapons: { unlocked: 0, total: 0 },
        skins: { unlocked: 0, total: 0 },
        totalStars: Stars.getTotalStars(),
        maxStars: LEVEL_CONSTANTS.MAX_STARS_TOTAL,
        nextUnlock: getNextUnlock()
    };

    for (const item of unlockableItems.values()) {
        if (item.type === UNLOCK_TYPES.WEAPON) {
            summary.weapons.total++;
            if (isUnlocked(item.id)) summary.weapons.unlocked++;
        } else if (item.type === UNLOCK_TYPES.SKIN) {
            summary.skins.total++;
            if (isUnlocked(item.id)) summary.skins.unlocked++;
        }
    }

    return summary;
}

/**
 * Check if a specific weapon is unlocked (convenience method).
 *
 * @param {string} weaponId - Weapon ID (e.g., 'basic-shot', 'mirv')
 * @returns {boolean} Whether the weapon is unlocked
 */
function isWeaponUnlocked(weaponId) {
    return isUnlocked(`weapon-${weaponId}`);
}

/**
 * Check if a specific skin is unlocked (convenience method).
 *
 * @param {string} skinId - Skin ID (e.g., 'default', 'neon-pulse')
 * @returns {boolean} Whether the skin is unlocked
 */
function isSkinUnlocked(skinId) {
    return isUnlocked(`skin-${skinId}`);
}

/**
 * Get all unlocked weapons (for shop filtering).
 *
 * @returns {string[]} Array of unlocked weapon IDs (without 'weapon-' prefix)
 */
function getUnlockedWeaponIds() {
    return getUnlockedItemsByType(UNLOCK_TYPES.WEAPON)
        .map(item => item.id.replace('weapon-', ''));
}

/**
 * Get all unlocked skins (for customization menu).
 *
 * @returns {string[]} Array of unlocked skin IDs (without 'skin-' prefix)
 */
function getUnlockedSkinIds() {
    return getUnlockedItemsByType(UNLOCK_TYPES.SKIN)
        .map(item => item.id.replace('skin-', ''));
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the unlocks system with default items.
 */
function init() {
    unlockableItems.clear();
    registerDefaultWeaponUnlocks();
    registerDefaultSkinUnlocks();
}

// Initialize on module load
init();

// =============================================================================
// PUBLIC API
// =============================================================================

export const Unlocks = {
    // Core checks
    isUnlocked,
    getUnlockProgress,

    // Type-specific queries
    getItemsByType,
    getUnlockedItemsByType,
    getLockedItemsByType,

    // Convenience methods
    isWeaponUnlocked,
    isSkinUnlocked,
    getUnlockedWeaponIds,
    getUnlockedSkinIds,

    // Progress info
    getNextUnlock,
    getUnlockSummary,

    // World checks
    isWorldCompleted,
    isWorldPerfected,

    // Registration (for custom items)
    registerUnlockable,

    // Reinitialize (for testing)
    init
};

// Default export
export default Unlocks;
