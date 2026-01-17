/**
 * Scorched Earth: Synthwave Edition
 * Daily Login Rewards System
 *
 * 7-day escalating reward cycle that grants coins, tokens, weapons, and tank skins.
 * Tracks login streaks with a 48-hour grace period before reset.
 * Persists to localStorage for cross-session retention.
 */

import { DEBUG } from '../constants.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'scorchedEarth_dailyRewards';

/**
 * Time constants in milliseconds.
 */
const TIME = {
    /** Hours before next claim is available */
    CLAIM_COOLDOWN_HOURS: 24,
    /** Grace period in hours before streak resets */
    GRACE_PERIOD_HOURS: 48,
    /** Milliseconds per hour */
    MS_PER_HOUR: 60 * 60 * 1000
};

/**
 * Reward type identifiers.
 */
export const REWARD_TYPES = {
    COINS: 'coins',
    TOKENS: 'tokens',
    WEAPON: 'weapon',
    TANK_SKIN: 'tank_skin',
    SUPPLY_DROP: 'supply_drop'
};

/**
 * 7-day reward schedule.
 * Day index is 0-6, cycles back to 0 after day 7.
 */
const REWARD_SCHEDULE = [
    // Day 1: 100 coins
    {
        day: 1,
        rewards: [
            { type: REWARD_TYPES.COINS, amount: 100 }
        ],
        description: '100 Coins'
    },
    // Day 2: 150 coins
    {
        day: 2,
        rewards: [
            { type: REWARD_TYPES.COINS, amount: 150 }
        ],
        description: '150 Coins'
    },
    // Day 3: 200 coins
    {
        day: 3,
        rewards: [
            { type: REWARD_TYPES.COINS, amount: 200 }
        ],
        description: '200 Coins'
    },
    // Day 4: 1x Nuke (consumable)
    {
        day: 4,
        rewards: [
            { type: REWARD_TYPES.WEAPON, weaponId: 'nuke', amount: 1 }
        ],
        description: '1x Nuke'
    },
    // Day 5: 300 coins
    {
        day: 5,
        rewards: [
            { type: REWARD_TYPES.COINS, amount: 300 }
        ],
        description: '300 Coins'
    },
    // Day 6: Random tank skin
    {
        day: 6,
        rewards: [
            { type: REWARD_TYPES.TANK_SKIN, random: true }
        ],
        description: 'Random Tank Skin'
    },
    // Day 7: 500 coins + 50 tokens + supply drop
    {
        day: 7,
        rewards: [
            { type: REWARD_TYPES.COINS, amount: 500 },
            { type: REWARD_TYPES.TOKENS, amount: 50 },
            { type: REWARD_TYPES.SUPPLY_DROP, amount: 1 }
        ],
        description: '500 Coins + 50 Tokens + Supply Drop'
    }
];

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Daily rewards state.
 */
const state = {
    /** Current day in cycle (0-6) */
    currentDay: 0,
    /** ISO string of last claim time, or null if never claimed */
    lastClaimDate: null,
    /** Total consecutive days logged in (lifetime streak counter) */
    streak: 0,
    /** Pending rewards that couldn't be immediately applied (e.g., weapons during menu) */
    pendingRewards: []
};

/** Whether the module has been initialized */
let isInitialized = false;

/** Callbacks for reward claim events */
const claimCallbacks = [];

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
            console.log(`[DailyRewards] ${message}`, data);
        } else {
            console.log(`[DailyRewards] ${message}`);
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
            state.currentDay = parsed.currentDay ?? 0;
            state.lastClaimDate = parsed.lastClaimDate ?? null;
            state.streak = parsed.streak ?? 0;
            state.pendingRewards = parsed.pendingRewards ?? [];

            debugLog('State loaded from localStorage', {
                currentDay: state.currentDay,
                lastClaimDate: state.lastClaimDate,
                streak: state.streak,
                pendingRewards: state.pendingRewards.length
            });
        }
    } catch (e) {
        console.warn('[DailyRewards] Failed to load state:', e);
    }
}

/**
 * Save state to localStorage.
 */
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentDay: state.currentDay,
            lastClaimDate: state.lastClaimDate,
            streak: state.streak,
            pendingRewards: state.pendingRewards
        }));
        debugLog('State saved to localStorage');
    } catch (e) {
        console.warn('[DailyRewards] Failed to save state:', e);
    }
}

// =============================================================================
// TIME CALCULATIONS
// =============================================================================

/**
 * Get the current time in milliseconds.
 * @returns {number} Current timestamp
 */
function now() {
    return Date.now();
}

/**
 * Calculate hours elapsed since last claim.
 * @returns {number} Hours since last claim, or Infinity if never claimed
 */
function getHoursSinceLastClaim() {
    if (!state.lastClaimDate) {
        return Infinity;
    }

    const lastClaim = new Date(state.lastClaimDate).getTime();
    const elapsed = now() - lastClaim;
    return elapsed / TIME.MS_PER_HOUR;
}

/**
 * Calculate hours until next claim is available.
 * @returns {number} Hours until claim available (0 if already available)
 */
function getHoursUntilNextClaim() {
    const hoursSince = getHoursSinceLastClaim();
    if (hoursSince >= TIME.CLAIM_COOLDOWN_HOURS) {
        return 0;
    }
    return TIME.CLAIM_COOLDOWN_HOURS - hoursSince;
}

// =============================================================================
// CLAIM LOGIC
// =============================================================================

/**
 * Check if a reward can be claimed right now.
 * Claim is available if:
 * - Never claimed before, OR
 * - At least 24 hours since last claim
 *
 * @returns {boolean} True if claim is available
 */
export function canClaim() {
    if (!isInitialized) return false;

    const hoursSince = getHoursSinceLastClaim();
    return hoursSince >= TIME.CLAIM_COOLDOWN_HOURS;
}

/**
 * Check if the streak would reset based on time since last claim.
 * Streak resets if more than 48 hours have passed.
 *
 * @returns {boolean} True if streak has been broken
 */
function isStreakBroken() {
    const hoursSince = getHoursSinceLastClaim();
    return hoursSince > TIME.GRACE_PERIOD_HOURS;
}

/**
 * Claim today's reward.
 * Updates streak and advances day in cycle.
 *
 * @returns {Object|null} Claim result with rewards, or null if claim not available
 * @property {number} day - Day number (1-7)
 * @property {Object[]} rewards - Array of reward definitions
 * @property {string} description - Human-readable description
 * @property {number} streak - Current streak after claim
 * @property {boolean} streakReset - Whether streak was reset due to gap
 */
export function claim() {
    if (!isInitialized) {
        console.warn('[DailyRewards] Not initialized');
        return null;
    }

    if (!canClaim()) {
        const hoursRemaining = getHoursUntilNextClaim();
        debugLog(`Cannot claim yet - ${hoursRemaining.toFixed(1)} hours remaining`);
        return null;
    }

    // Check if streak should reset
    const streakReset = isStreakBroken();
    if (streakReset) {
        debugLog('Streak broken - resetting to day 1');
        state.currentDay = 0;
        state.streak = 0;
    }

    // Get today's reward
    const rewardData = REWARD_SCHEDULE[state.currentDay];

    // Update state
    state.lastClaimDate = new Date().toISOString();
    state.streak++;
    state.currentDay = (state.currentDay + 1) % 7; // Cycle 0-6

    saveState();

    const result = {
        day: rewardData.day,
        rewards: rewardData.rewards,
        description: rewardData.description,
        streak: state.streak,
        streakReset
    };

    debugLog('Reward claimed', {
        day: rewardData.day,
        description: rewardData.description,
        streak: state.streak,
        streakReset,
        nextDay: state.currentDay + 1
    });

    // Notify callbacks
    for (const callback of claimCallbacks) {
        try {
            callback(result);
        } catch (e) {
            console.error('[DailyRewards] Callback error:', e);
        }
    }

    return result;
}

// =============================================================================
// REWARD PROCESSING
// =============================================================================

/**
 * Process claimed rewards and apply them to the player.
 * This function should be called after claim() with the appropriate
 * game system imports.
 *
 * @param {Object} claimResult - Result from claim()
 * @param {Object} systems - Game systems to use for applying rewards
 * @param {Function} [systems.addMoney] - Function to add coins
 * @param {Function} [systems.addTokens] - Function to add tokens
 * @param {Function} [systems.grantWeapon] - Function to grant weapon ammo
 * @param {Function} [systems.grantRandomTank] - Function to grant random tank skin
 * @param {Function} [systems.grantSupplyDrop] - Function to grant supply drop
 * @returns {Object[]} Array of applied rewards with results
 */
export function processRewards(claimResult, systems = {}) {
    if (!claimResult || !claimResult.rewards) {
        return [];
    }

    const applied = [];

    for (const reward of claimResult.rewards) {
        const result = {
            type: reward.type,
            success: false,
            details: null
        };

        try {
            switch (reward.type) {
                case REWARD_TYPES.COINS:
                    if (systems.addMoney) {
                        systems.addMoney(reward.amount, `Daily reward day ${claimResult.day}`);
                        result.success = true;
                        result.details = { amount: reward.amount };
                    } else {
                        // Queue for later
                        addPendingReward(reward);
                        result.details = { pending: true, amount: reward.amount };
                    }
                    break;

                case REWARD_TYPES.TOKENS:
                    if (systems.addTokens) {
                        systems.addTokens(reward.amount, `Daily reward day ${claimResult.day}`);
                        result.success = true;
                        result.details = { amount: reward.amount };
                    } else {
                        addPendingReward(reward);
                        result.details = { pending: true, amount: reward.amount };
                    }
                    break;

                case REWARD_TYPES.WEAPON:
                    if (systems.grantWeapon) {
                        systems.grantWeapon(reward.weaponId, reward.amount);
                        result.success = true;
                        result.details = { weaponId: reward.weaponId, amount: reward.amount };
                    } else {
                        // Weapons typically need active game - queue for later
                        addPendingReward(reward);
                        result.details = { pending: true, weaponId: reward.weaponId, amount: reward.amount };
                    }
                    break;

                case REWARD_TYPES.TANK_SKIN:
                    if (systems.grantRandomTank) {
                        const tankResult = systems.grantRandomTank();
                        result.success = true;
                        result.details = tankResult;
                    } else {
                        addPendingReward(reward);
                        result.details = { pending: true, random: reward.random };
                    }
                    break;

                case REWARD_TYPES.SUPPLY_DROP:
                    if (systems.grantSupplyDrop) {
                        systems.grantSupplyDrop(reward.amount);
                        result.success = true;
                        result.details = { amount: reward.amount };
                    } else {
                        addPendingReward(reward);
                        result.details = { pending: true, amount: reward.amount };
                    }
                    break;

                default:
                    console.warn(`[DailyRewards] Unknown reward type: ${reward.type}`);
            }
        } catch (e) {
            console.error(`[DailyRewards] Error processing ${reward.type} reward:`, e);
            result.details = { error: e.message };
        }

        applied.push(result);
    }

    return applied;
}

/**
 * Add a reward to the pending queue.
 * @param {Object} reward - Reward to queue
 */
function addPendingReward(reward) {
    state.pendingRewards.push({
        ...reward,
        queuedAt: new Date().toISOString()
    });
    saveState();
    debugLog('Reward queued for later', reward);
}

/**
 * Get pending rewards that haven't been applied yet.
 * @returns {Object[]} Array of pending rewards
 */
export function getPendingRewards() {
    return [...state.pendingRewards];
}

/**
 * Clear pending rewards after they've been processed.
 * @param {number[]} [indices] - Specific indices to clear, or all if omitted
 */
export function clearPendingRewards(indices = null) {
    if (indices === null) {
        state.pendingRewards = [];
    } else {
        // Remove in reverse order to preserve indices
        const sorted = [...indices].sort((a, b) => b - a);
        for (const index of sorted) {
            state.pendingRewards.splice(index, 1);
        }
    }
    saveState();
    debugLog('Pending rewards cleared');
}

// =============================================================================
// STATE ACCESSORS
// =============================================================================

/**
 * Get the current day in the reward cycle (1-7).
 * @returns {number} Current day (1-7)
 */
export function getCurrentDay() {
    return state.currentDay + 1; // Convert 0-indexed to 1-indexed
}

/**
 * Get the reward definition for the current day.
 * @returns {Object} Reward definition for today
 */
export function getCurrentReward() {
    return REWARD_SCHEDULE[state.currentDay];
}

/**
 * Get the reward definition for a specific day.
 * @param {number} day - Day number (1-7)
 * @returns {Object|null} Reward definition or null if invalid day
 */
export function getRewardForDay(day) {
    if (day < 1 || day > 7) return null;
    return REWARD_SCHEDULE[day - 1];
}

/**
 * Get all reward definitions in the cycle.
 * @returns {Object[]} All 7 days of rewards
 */
export function getAllRewards() {
    return [...REWARD_SCHEDULE];
}

/**
 * Get the current streak count.
 * @returns {number} Consecutive days logged in
 */
export function getStreak() {
    return state.streak;
}

/**
 * Get time remaining until next claim.
 * @returns {Object} Time breakdown
 * @property {number} hours - Hours component
 * @property {number} minutes - Minutes component
 * @property {number} seconds - Seconds component
 * @property {number} totalMs - Total milliseconds remaining
 * @property {boolean} available - True if claim is available now
 */
export function getTimeUntilClaim() {
    const hoursRemaining = getHoursUntilNextClaim();

    if (hoursRemaining <= 0) {
        return {
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalMs: 0,
            available: true
        };
    }

    const totalMs = hoursRemaining * TIME.MS_PER_HOUR;
    const hours = Math.floor(hoursRemaining);
    const minutes = Math.floor((hoursRemaining - hours) * 60);
    const seconds = Math.floor(((hoursRemaining - hours) * 60 - minutes) * 60);

    return {
        hours,
        minutes,
        seconds,
        totalMs,
        available: false
    };
}

/**
 * Get the last claim date.
 * @returns {string|null} ISO date string or null if never claimed
 */
export function getLastClaimDate() {
    return state.lastClaimDate;
}

/**
 * Check if this is the first time claiming (streak === 0 before any claim).
 * @returns {boolean} True if player has never claimed a daily reward
 */
export function isFirstClaim() {
    return state.lastClaimDate === null;
}

/**
 * Get full state for debugging/display.
 * @returns {Object} Current state copy
 */
export function getState() {
    return {
        currentDay: state.currentDay + 1,
        lastClaimDate: state.lastClaimDate,
        streak: state.streak,
        pendingRewards: [...state.pendingRewards],
        canClaim: canClaim(),
        timeUntilClaim: getTimeUntilClaim()
    };
}

// =============================================================================
// CALLBACK REGISTRATION
// =============================================================================

/**
 * Register a callback for when rewards are claimed.
 * @param {Function} callback - Function to call with claim result
 * @returns {Function} Unsubscribe function
 */
export function onClaim(callback) {
    claimCallbacks.push(callback);
    return () => {
        const index = claimCallbacks.indexOf(callback);
        if (index >= 0) {
            claimCallbacks.splice(index, 1);
        }
    };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the daily rewards system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[DailyRewards] Already initialized');
        return;
    }

    loadState();
    isInitialized = true;

    console.log('[DailyRewards] System initialized', {
        currentDay: state.currentDay + 1,
        streak: state.streak,
        canClaim: canClaim(),
        lastClaim: state.lastClaimDate
    });
}

/**
 * Reset the daily rewards system (for testing/debugging).
 * Clears all state and removes localStorage data.
 */
export function reset() {
    state.currentDay = 0;
    state.lastClaimDate = null;
    state.streak = 0;
    state.pendingRewards = [];

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('[DailyRewards] Failed to clear localStorage:', e);
    }

    debugLog('System reset');
}

// =============================================================================
// EXPORTS
// =============================================================================

export { REWARD_SCHEDULE, TIME };
