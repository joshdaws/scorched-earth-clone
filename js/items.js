/**
 * Scorched Earth: Synthwave Edition
 * Shop Items System
 *
 * Defines purchasable items for the shop ITEMS tab, including shields
 * and other consumables that provide tactical advantages.
 */

// =============================================================================
// ITEM CATEGORIES
// =============================================================================

/**
 * Item category types for organizing shop display.
 */
export const ITEM_CATEGORIES = {
    DEFENSE: 'defense',
    UTILITY: 'utility'
};

/**
 * Category display names and order.
 */
export const CATEGORY_INFO = {
    [ITEM_CATEGORIES.DEFENSE]: {
        name: 'DEFENSE',
        order: 1
    },
    [ITEM_CATEGORIES.UTILITY]: {
        name: 'UTILITY',
        order: 2
    }
};

// =============================================================================
// ITEM DEFINITIONS
// =============================================================================

/**
 * All purchasable items.
 * @type {Object.<string, Object>}
 */
const ITEMS = {
    // =============================================================================
    // DEFENSE ITEMS - Shields
    // =============================================================================

    'light-shield': {
        id: 'light-shield',
        name: 'Light Shield',
        category: ITEM_CATEGORIES.DEFENSE,
        cost: 500,
        description: 'Absorbs 25 damage before health. Destroyed by shield-busting weapons.',
        shieldAmount: 25,
        color: '#00ffff',  // Cyan
        glowColor: '#00cccc'
    },

    'medium-shield': {
        id: 'medium-shield',
        name: 'Medium Shield',
        category: ITEM_CATEGORIES.DEFENSE,
        cost: 1000,
        description: 'Absorbs 50 damage before health. Good balance of cost and protection.',
        shieldAmount: 50,
        color: '#00ff00',  // Green
        glowColor: '#00cc00'
    },

    'heavy-shield': {
        id: 'heavy-shield',
        name: 'Heavy Shield',
        category: ITEM_CATEGORIES.DEFENSE,
        cost: 2000,
        description: 'Absorbs 75 damage before health. Premium protection.',
        shieldAmount: 75,
        color: '#ffff00',  // Yellow
        glowColor: '#cccc00'
    },

    'mega-shield': {
        id: 'mega-shield',
        name: 'Mega Shield',
        category: ITEM_CATEGORIES.DEFENSE,
        cost: 3500,
        description: 'Absorbs 100 damage. Maximum protection available.',
        shieldAmount: 100,
        color: '#ff00ff',  // Magenta
        glowColor: '#cc00cc'
    }
};

// =============================================================================
// ITEM REGISTRY
// =============================================================================

/**
 * Item registry for managing purchasable items.
 */
export const ItemRegistry = {
    /**
     * Get an item by ID.
     * @param {string} id - Item ID
     * @returns {Object|null} Item definition or null if not found
     */
    get(id) {
        return ITEMS[id] || null;
    },

    /**
     * Get all items.
     * @returns {Object[]} Array of all item definitions
     */
    getAllItems() {
        return Object.values(ITEMS);
    },

    /**
     * Get items by category.
     * @param {string} category - Category to filter by
     * @returns {Object[]} Array of items in the category
     */
    getByCategory(category) {
        return Object.values(ITEMS).filter(item => item.category === category);
    },

    /**
     * Get all categories with their items.
     * @returns {Object[]} Array of {category, name, items} objects
     */
    getCategorizedItems() {
        const categories = [];

        for (const [catId, catInfo] of Object.entries(CATEGORY_INFO)) {
            const items = this.getByCategory(catId);
            if (items.length > 0) {
                categories.push({
                    category: catId,
                    name: catInfo.name,
                    order: catInfo.order,
                    items: items
                });
            }
        }

        // Sort by order
        categories.sort((a, b) => a.order - b.order);
        return categories;
    },

    /**
     * Check if an item is a shield.
     * @param {string} id - Item ID
     * @returns {boolean} True if item provides shield
     */
    isShield(id) {
        const item = ITEMS[id];
        return item && item.shieldAmount !== undefined && item.shieldAmount > 0;
    },

    /**
     * Get all shield items.
     * @returns {Object[]} Array of shield item definitions
     */
    getShields() {
        return Object.values(ITEMS).filter(item => item.shieldAmount > 0);
    }
};

/**
 * Apply an item's effect to a tank.
 * @param {string} itemId - Item ID to apply
 * @param {import('./tank.js').Tank} tank - Tank to apply item to
 * @returns {boolean} True if item was successfully applied
 */
export function applyItem(itemId, tank) {
    const item = ItemRegistry.get(itemId);
    if (!item || !tank) return false;

    // Handle shield items
    if (item.shieldAmount > 0) {
        tank.addShield(item.shieldAmount);
        console.log(`Applied ${item.name}: +${item.shieldAmount} shield to ${tank.team} tank`);
        return true;
    }

    // Future: Handle other item types here

    return false;
}
