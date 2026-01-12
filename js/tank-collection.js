/**
 * Scorched Earth: Synthwave Edition
 * Tank Collection State Management
 *
 * Tracks owned tanks, equipped tank, collection progress,
 * duplicate counts, and scrap currency.
 * Persists to localStorage for cross-session retention.
 */

import { DEBUG } from './constants.js';
import { getTank, getDefaultTank, getTankCount, tankExists, getAllTanks } from './tank-skins.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'scorchedEarth_collection';

/**
 * Scrap awarded for duplicate tanks by rarity.
 */
const DUPLICATE_SCRAP_REWARDS = {
    common: 1,
    uncommon: 2,
    rare: 5,
    epic: 10,
    legendary: 25
};;

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Collection state.
 */
const state = {
    /** Set of owned tank IDs */
    owned: new Set(),
    /** Currently equipped tank ID */
    equipped: 'standard',
    /** Set of tank IDs not yet viewed in collection */
    newTanks: new Set(),
    /** Map of tank ID to duplicate count (times received beyond first) */
    duplicateCounts: new Map(),
    /** Current scrap balance */
    scrap: 0,
    /** Count of consecutive duplicate drops (reset when new tank received) */
    consecutiveDuplicates: 0,
    /** ID of last tank dropped (for duplicate protection) */
    lastTankDropped: null,
    /** Whether the scrap tutorial popup has been shown */
    hasSeenScrapTutorial: false
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
            console.log(`[TankCollection] ${message}`, data);
        } else {
            console.log(`[TankCollection] ${message}`);
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

            // Restore owned tanks
            state.owned = new Set(parsed.owned || ['standard']);

            // Restore equipped tank (validate it exists and is owned)
            const equippedId = parsed.equipped || 'standard';
            state.equipped = state.owned.has(equippedId) ? equippedId : 'standard';

            // Restore new tanks
            state.newTanks = new Set(parsed.newTanks || []);

            // Restore duplicate counts
            state.duplicateCounts = new Map(Object.entries(parsed.duplicateCounts || {}));

            // Restore scrap
            state.scrap = parsed.scrap || 0;

            // Restore consecutive duplicates tracking
            state.consecutiveDuplicates = parsed.consecutiveDuplicates || 0;
            state.lastTankDropped = parsed.lastTankDropped || null;

            // Restore scrap tutorial flag
            state.hasSeenScrapTutorial = parsed.hasSeenScrapTutorial || false;

            debugLog('State loaded from localStorage', {
                owned: state.owned.size,
                equipped: state.equipped,
                newTanks: state.newTanks.size,
                scrap: state.scrap,
                consecutiveDuplicates: state.consecutiveDuplicates
            });
        } else {
            // First time - initialize with default tank
            initializeNewPlayer();
        }
    } catch (e) {
        console.warn('[TankCollection] Failed to load state:', e);
        initializeNewPlayer();
    }
}

/**
 * Save state to localStorage.
 */
function saveState() {
    try {
        const data = {
            owned: Array.from(state.owned),
            equipped: state.equipped,
            newTanks: Array.from(state.newTanks),
            duplicateCounts: Object.fromEntries(state.duplicateCounts),
            scrap: state.scrap,
            consecutiveDuplicates: state.consecutiveDuplicates,
            lastTankDropped: state.lastTankDropped,
            hasSeenScrapTutorial: state.hasSeenScrapTutorial
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        debugLog('State saved to localStorage');
    } catch (e) {
        console.warn('[TankCollection] Failed to save state:', e);
    }
}

/**
 * Initialize state for a new player.
 */
function initializeNewPlayer() {
    state.owned = new Set(['standard']);
    state.equipped = 'standard';
    state.newTanks = new Set();
    state.duplicateCounts = new Map();
    state.scrap = 0;
    state.consecutiveDuplicates = 0;
    state.lastTankDropped = null;
    saveState();
    debugLog('New player initialized with standard tank');
}

// =============================================================================
// OWNERSHIP FUNCTIONS
// =============================================================================

/**
 * Check if player owns a tank.
 * @param {string} id - Tank ID
 * @returns {boolean} True if owned
 */
export function ownsTank(id) {
    return state.owned.has(id);
}

/**
 * Get all owned tank IDs.
 * @returns {string[]} Array of owned tank IDs
 */
export function getOwnedTanks() {
    return Array.from(state.owned);
}

/**
 * Get count of owned tanks.
 * @returns {number} Number of owned tanks
 */
export function getOwnedCount() {
    return state.owned.size;
}

/**
 * Add a tank to the collection.
 * If already owned, awards scrap and increments duplicate count.
 *
 * @param {string} id - Tank ID to add
 * @returns {Object} Result of addition
 */
export function addTank(id) {
    if (!isInitialized) {
        console.warn('[TankCollection] Not initialized');
        return { success: false, reason: 'not_initialized' };
    }

    // Validate tank exists
    const tank = getTank(id);
    if (!tank) {
        debugLog('Invalid tank ID', { id });
        return { success: false, reason: 'invalid_tank' };
    }

    const result = {
        success: true,
        tankId: id,
        tank: tank,
        isNew: false,
        isDuplicate: false,
        scrapAwarded: 0,
        duplicateCount: 0
    };

    if (state.owned.has(id)) {
        // Duplicate - award scrap
        result.isDuplicate = true;

        const currentDupes = state.duplicateCounts.get(id) || 0;
        state.duplicateCounts.set(id, currentDupes + 1);
        result.duplicateCount = currentDupes + 1;

        const scrapReward = DUPLICATE_SCRAP_REWARDS[tank.rarity] || 1;
        state.scrap += scrapReward;
        result.scrapAwarded = scrapReward;

        // Track consecutive duplicates
        state.consecutiveDuplicates++;

        debugLog('Duplicate tank received', {
            id,
            duplicateCount: result.duplicateCount,
            scrapAwarded: scrapReward,
            totalScrap: state.scrap,
            consecutiveDuplicates: state.consecutiveDuplicates
        });
    } else {
        // New tank - reset consecutive duplicate counter
        result.isNew = true;
        state.owned.add(id);
        state.newTanks.add(id);
        state.consecutiveDuplicates = 0;

        debugLog('New tank added to collection', {
            id,
            name: tank.name,
            rarity: tank.rarity,
            totalOwned: state.owned.size
        });
    }

    // Track last tank dropped
    state.lastTankDropped = id;

    saveState();
    return result;
}

/**
 * Get collection progress.
 * @returns {Object} Progress info
 */
export function getCollectionProgress() {
    const total = getTankCount();
    const owned = state.owned.size;
    return {
        owned,
        total,
        percentage: Math.round((owned / total) * 100)
    };
}

// =============================================================================
// EQUIPPED TANK FUNCTIONS
// =============================================================================

/**
 * Get the currently equipped tank.
 * @returns {Object} Equipped tank definition
 */
export function getEquippedTank() {
    return getTank(state.equipped);
}

/**
 * Get the equipped tank ID.
 * @returns {string} Equipped tank ID
 */
export function getEquippedTankId() {
    return state.equipped;
}

/**
 * Set the equipped tank.
 * @param {string} id - Tank ID to equip
 * @returns {boolean} True if successful
 */
export function setEquippedTank(id) {
    if (!isInitialized) {
        console.warn('[TankCollection] Not initialized');
        return false;
    }

    // Must own the tank
    if (!state.owned.has(id)) {
        debugLog('Cannot equip unowned tank', { id });
        return false;
    }

    // Must be a valid tank
    if (!tankExists(id)) {
        debugLog('Cannot equip invalid tank', { id });
        return false;
    }

    state.equipped = id;
    saveState();

    debugLog('Tank equipped', { id, name: getTank(id)?.name });
    return true;
}

// =============================================================================
// NEW TANKS FUNCTIONS
// =============================================================================

/**
 * Get tanks that are marked as 'new' (not yet viewed).
 * @returns {string[]} Array of new tank IDs
 */
export function getNewTanks() {
    return Array.from(state.newTanks);
}

/**
 * Check if there are any new tanks to view.
 * @returns {boolean} True if there are new tanks
 */
export function hasNewTanks() {
    return state.newTanks.size > 0;
}

/**
 * Get count of new tanks.
 * @returns {number} Number of new tanks
 */
export function getNewTankCount() {
    return state.newTanks.size;
}

/**
 * Mark a tank as viewed (removes 'new' badge).
 * @param {string} id - Tank ID to mark as viewed
 */
export function markTankViewed(id) {
    if (state.newTanks.has(id)) {
        state.newTanks.delete(id);
        saveState();
        debugLog('Tank marked as viewed', { id });
    }
}

/**
 * Mark all new tanks as viewed.
 */
export function markAllTanksViewed() {
    if (state.newTanks.size > 0) {
        const count = state.newTanks.size;
        state.newTanks.clear();
        saveState();
        debugLog('All tanks marked as viewed', { count });
    }
}

// =============================================================================
// DUPLICATES & SCRAP FUNCTIONS
// =============================================================================

/**
 * Get duplicate count for a tank.
 * @param {string} id - Tank ID
 * @returns {number} Number of duplicates received (0 if never duplicated)
 */
export function getDuplicateCount(id) {
    return state.duplicateCounts.get(id) || 0;
}

/**
 * Get total times a tank has been received (1 + duplicates).
 * @param {string} id - Tank ID
 * @returns {number} Total times received (0 if not owned)
 */
export function getTimesReceived(id) {
    if (!state.owned.has(id)) return 0;
    return 1 + (state.duplicateCounts.get(id) || 0);
}

/**
 * Get current scrap balance.
 * @returns {number} Current scrap
 */
export function getScrap() {
    return state.scrap;
}

/**
 * Add scrap to balance.
 * @param {number} amount - Amount to add
 */
export function addScrap(amount) {
    if (amount <= 0) return;

    state.scrap += amount;
    saveState();

    debugLog('Scrap added', { amount, total: state.scrap });
}

/**
 * Spend scrap from balance.
 * @param {number} amount - Amount to spend
 * @returns {boolean} True if successful
 */
export function spendScrap(amount) {
    if (amount <= 0) return true;

    if (state.scrap < amount) {
        debugLog('Insufficient scrap', { requested: amount, balance: state.scrap });
        return false;
    }

    state.scrap -= amount;
    saveState();

    debugLog('Scrap spent', { amount, remaining: state.scrap });
    return true;
}

/**
 * Check if player can afford scrap amount.
 * @param {number} amount - Amount to check
 * @returns {boolean} True if balance >= amount
 */
export function canAffordScrap(amount) {
    return state.scrap >= amount;
}


/**
 * Get current consecutive duplicate count.
 * @returns {number} Number of consecutive duplicates
 */
export function getConsecutiveDuplicates() {
    return state.consecutiveDuplicates;
}

/**
 * Get the ID of the last tank dropped.
 * @returns {string|null} Tank ID or null if no drops yet
 */
export function getLastTankDropped() {
    return state.lastTankDropped;
}

/**
 * Check if next tank drop should be guaranteed new.
 * After 5 consecutive duplicates, next drop is guaranteed new.
 * @returns {boolean} True if next drop should be guaranteed new
 */
export function isGuaranteedNewTank() {
    return state.consecutiveDuplicates >= 5;
}

/**
 * Reset consecutive duplicate counter.
 * Called when guaranteed new tank protection is triggered.
 */
export function resetConsecutiveDuplicates() {
    if (state.consecutiveDuplicates > 0) {
        debugLog('Consecutive duplicates reset', { was: state.consecutiveDuplicates });
        state.consecutiveDuplicates = 0;
        saveState();
    }
}

// =============================================================================
// SCRAP TUTORIAL
// =============================================================================

/**
 * Check if scrap tutorial has been seen.
 * @returns {boolean} True if tutorial has been shown
 */
export function hasSeenScrapTutorial() {
    return state.hasSeenScrapTutorial;
}

/**
 * Mark the scrap tutorial as seen.
 * Call this after showing the tutorial popup.
 */
export function markScrapTutorialSeen() {
    if (!state.hasSeenScrapTutorial) {
        state.hasSeenScrapTutorial = true;
        saveState();
        debugLog('Scrap tutorial marked as seen');
    }
}

/**
 * Check if scrap tutorial should be shown.
 * Returns true only if this is a duplicate drop and tutorial hasn't been seen.
 * @param {Object} dropResult - Result from addTank()
 * @returns {boolean} True if tutorial should show
 */
export function shouldShowScrapTutorial(dropResult) {
    return dropResult.isDuplicate && !state.hasSeenScrapTutorial;
}

// =============================================================================
// SCRAP SHOP
// =============================================================================

/**
 * Scrap costs to purchase tanks directly.
 * Legendary tanks cannot be purchased with scrap.
 */
export const SCRAP_SHOP_COSTS = {
    common: 10,
    uncommon: 25,
    rare: 50,
    epic: 100
    // legendary: not purchasable
};

/**
 * Purchase a specific tank with scrap.
 * Legendary tanks cannot be purchased.
 *
 * @param {string} id - Tank ID to purchase
 * @returns {Object} Purchase result
 */
export function purchaseTankWithScrap(id) {
    if (!isInitialized) {
        return { success: false, reason: 'not_initialized' };
    }

    // Validate tank exists
    const tank = getTank(id);
    if (!tank) {
        debugLog('Invalid tank ID for purchase', { id });
        return { success: false, reason: 'invalid_tank' };
    }

    // Cannot purchase legendary tanks
    if (tank.rarity === 'legendary') {
        debugLog('Cannot purchase legendary tank', { id });
        return { success: false, reason: 'legendary_not_purchasable' };
    }

    // Check if already owned
    if (state.owned.has(id)) {
        debugLog('Tank already owned', { id });
        return { success: false, reason: 'already_owned' };
    }

    // Get cost
    const cost = SCRAP_SHOP_COSTS[tank.rarity];
    if (!cost) {
        debugLog('No scrap cost for rarity', { rarity: tank.rarity });
        return { success: false, reason: 'no_cost_defined' };
    }

    // Check balance
    if (state.scrap < cost) {
        debugLog('Insufficient scrap for purchase', { cost, balance: state.scrap });
        return { success: false, reason: 'insufficient_scrap', cost, balance: state.scrap };
    }

    // Deduct cost and add tank
    state.scrap -= cost;
    state.owned.add(id);
    state.newTanks.add(id);
    saveState();

    debugLog('Tank purchased with scrap', {
        id,
        name: tank.name,
        rarity: tank.rarity,
        cost,
        remainingScrap: state.scrap
    });

    return {
        success: true,
        tank: tank,
        cost: cost,
        remainingScrap: state.scrap
    };
}

/**
 * Get unowned tanks available for scrap purchase.
 * Excludes legendary tanks.
 *
 * @param {string} [rarity] - Optional rarity filter
 * @returns {Object[]} Array of purchasable tanks with costs
 */
export function getScrapShopTanks(rarity = null) {
    const allTanks = getAllTanks();

    return allTanks
        .filter(tank => {
            // Must not be owned
            if (state.owned.has(tank.id)) return false;
            // Must not be legendary
            if (tank.rarity === 'legendary') return false;
            // Apply rarity filter if specified
            if (rarity && tank.rarity !== rarity) return false;
            return true;
        })
        .map(tank => ({
            ...tank,
            cost: SCRAP_SHOP_COSTS[tank.rarity]
        }));
}

// =============================================================================
// STATE ACCESS (for debugging/display)
// =============================================================================

/**
 * Get current module state (for debugging).
 * @returns {Object} Current state copy
 */
export function getState() {
    return {
        owned: Array.from(state.owned),
        equipped: state.equipped,
        newTanks: Array.from(state.newTanks),
        duplicateCounts: Object.fromEntries(state.duplicateCounts),
        scrap: state.scrap,
        consecutiveDuplicates: state.consecutiveDuplicates,
        lastTankDropped: state.lastTankDropped
    };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the tank collection system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[TankCollection] Already initialized');
        return;
    }

    loadState();
    isInitialized = true;

    const progress = getCollectionProgress();
    console.log('[TankCollection] System initialized', {
        owned: progress.owned,
        total: progress.total,
        equipped: state.equipped,
        scrap: state.scrap
    });
}

// =============================================================================
// EXPORTS FOR CONSTANTS
// =============================================================================

export { DUPLICATE_SCRAP_REWARDS };
