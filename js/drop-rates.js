/**
 * Scorched Earth: Synthwave Edition
 * Tank Drop Rate Calculation
 *
 * Calculates which tank to drop based on rarity rates and modifiers.
 * Handles premium drops, guaranteed rare+, duplicate protection,
 * and scrap conversion for duplicates.
 */

import { DEBUG } from './constants.js';
import {
    RARITY,
    DROP_RATES,
    getTanksByRarity,
    getAllTanks,
    getTank,
    RARITY_ORDER
} from './tank-skins.js';
import {
    ownsTank,
    addTank as addTankToCollection,
    DUPLICATE_SCRAP_REWARDS,
    isGuaranteedNewTank,
    getConsecutiveDuplicates,
    resetConsecutiveDuplicates
} from './tank-collection.js';
import {
    getPerformanceBonus
} from './performance-tracking.js';
import {
    getPityBonus,
    getMinimumRarity,
    onDropResult as updatePityCounters,
    init as initPitySystem
} from './pity-system.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Base drop rates for each rarity tier (percentage).
 * Must sum to 100.
 */
const BASE_DROP_RATES = {
    [RARITY.COMMON]: 55,
    [RARITY.UNCOMMON]: 28,
    [RARITY.RARE]: 12,
    [RARITY.EPIC]: 4,
    [RARITY.LEGENDARY]: 1
};

/**
 * Premium drop modifier: shifts +10% to rare+ (redistributed from common).
 * Actual distribution: +5% rare, +3% epic, +2% legendary, -10% common.
 */
const PREMIUM_MODIFIER = {
    [RARITY.COMMON]: -10,
    [RARITY.UNCOMMON]: 0,
    [RARITY.RARE]: 5,
    [RARITY.EPIC]: 3,
    [RARITY.LEGENDARY]: 2
};

/**
 * Guaranteed Rare+ rates: 0% common/uncommon, redistributed to rare+.
 */
const GUARANTEED_RARE_RATES = {
    [RARITY.COMMON]: 0,
    [RARITY.UNCOMMON]: 0,
    [RARITY.RARE]: 70,
    [RARITY.EPIC]: 22,
    [RARITY.LEGENDARY]: 8
};

/**
 * Performance bonus distribution percentages.
 * Describes how the performance bonus is redistributed from Common to higher rarities.
 */
const PERFORMANCE_BONUS_DISTRIBUTION = {
    /** 60% of bonus goes to Rare */
    RARE: 0.60,
    /** 30% of bonus goes to Epic */
    EPIC: 0.30,
    /** 10% of bonus goes to Legendary (subject to cap) */
    LEGENDARY: 0.10
};

/**
 * Rate caps to prevent extreme distributions.
 */
const RATE_CAPS = {
    /** Legendary cannot exceed 5% base rate */
    LEGENDARY_MAX: 5,
    /** Common cannot go below 20% */
    COMMON_MIN: 20,
    /** Maximum additional legendary bonus from performance (+4% max) */
    LEGENDARY_PERFORMANCE_BONUS_MAX: 4
};

/**
 * Drop types for supply drop purchases.
 */
export const DROP_TYPES = {
    STANDARD: 'standard',
    PREMIUM: 'premium',
    GUARANTEED_RARE: 'guaranteed'
};

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Last dropped tank ID for consecutive duplicate protection.
 * Cannot receive the same tank twice in a row.
 */
let lastDroppedTankId = null;

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
            console.log(`[DropRates] ${message}`, data);
        } else {
            console.log(`[DropRates] ${message}`);
        }
    }
}

// =============================================================================
// DROP RATE CALCULATION
// =============================================================================

/**
 * Apply performance bonus to modify drop rates.
 *
 * Performance bonus shifts probability from Common toward higher rarities:
 * - 60% of bonus goes to Rare
 * - 30% of bonus goes to Epic
 * - 10% of bonus goes to Legendary (capped at +4%)
 *
 * Caps enforced:
 * - Legendary cannot exceed 5% total
 * - Common cannot go below 20%
 * - Any overflow from Legendary cap goes to Rare
 *
 * @param {Object} baseRates - Starting drop rate table (rarity -> percentage)
 * @param {number} performanceBonus - Performance bonus percentage (0-50)
 * @returns {Object} Modified drop rate table
 */
export function calculateModifiedRates(baseRates, performanceBonus) {
    // If no bonus, return base rates unchanged
    if (!performanceBonus || performanceBonus <= 0) {
        return { ...baseRates };
    }

    const rates = { ...baseRates };

    // Calculate how much we can take from Common (respecting minimum)
    const maxFromCommon = rates[RARITY.COMMON] - RATE_CAPS.COMMON_MIN;
    const actualBonus = Math.min(performanceBonus, maxFromCommon);

    if (actualBonus <= 0) {
        debugLog('Common already at minimum, no performance bonus applied');
        return rates;
    }

    // Calculate distribution
    let rareBonus = actualBonus * PERFORMANCE_BONUS_DISTRIBUTION.RARE;
    const epicBonus = actualBonus * PERFORMANCE_BONUS_DISTRIBUTION.EPIC;
    let legendaryBonus = actualBonus * PERFORMANCE_BONUS_DISTRIBUTION.LEGENDARY;

    // Cap legendary bonus at +4% from performance
    const legendaryBonusCap = RATE_CAPS.LEGENDARY_PERFORMANCE_BONUS_MAX;
    if (legendaryBonus > legendaryBonusCap) {
        const overflow = legendaryBonus - legendaryBonusCap;
        legendaryBonus = legendaryBonusCap;
        // Overflow goes to Rare
        rareBonus += overflow;
    }

    // Cap legendary total at 5%
    const legendaryMax = RATE_CAPS.LEGENDARY_MAX;
    const currentLegendary = rates[RARITY.LEGENDARY];
    if (currentLegendary + legendaryBonus > legendaryMax) {
        const overflow = (currentLegendary + legendaryBonus) - legendaryMax;
        legendaryBonus = legendaryMax - currentLegendary;
        // Overflow goes to Rare
        rareBonus += overflow;
    }

    // Apply bonuses
    rates[RARITY.COMMON] -= actualBonus;
    rates[RARITY.RARE] += rareBonus;
    rates[RARITY.EPIC] += epicBonus;
    rates[RARITY.LEGENDARY] += legendaryBonus;

    // Round to 2 decimal places for cleaner display
    for (const rarity of RARITY_ORDER) {
        rates[rarity] = Math.round(rates[rarity] * 100) / 100;
    }

    // Validate and fix any rounding errors
    const total = Object.values(rates).reduce((sum, rate) => sum + rate, 0);
    if (Math.abs(total - 100) > 0.01) {
        // Adjust Common to compensate for rounding errors
        rates[RARITY.COMMON] += (100 - total);
        rates[RARITY.COMMON] = Math.round(rates[RARITY.COMMON] * 100) / 100;
    }

    debugLog('Applied performance bonus', {
        originalBonus: performanceBonus,
        actualBonus,
        distribution: { rareBonus, epicBonus, legendaryBonus },
        resultingRates: rates
    });

    return rates;
}

/**
 * Calculate adjusted drop rates based on modifiers.
 *
 * @param {Object} options - Modifier options
 * @param {boolean} options.isPremium - Apply premium modifier (+10% to rare+)
 * @param {boolean} options.isGuaranteedRare - Use guaranteed rare+ rates
 * @param {boolean} [options.includePerformance=false] - Whether to include performance bonus
 * @param {boolean} [options.includePity=false] - Whether to include pity bonus
 * @returns {Object} Adjusted drop rate table
 */
export function calculateDropRates(options = {}) {
    const { isPremium = false, isGuaranteedRare = false, includePerformance = false, includePity = false } = options;

    // Start with base rates or guaranteed rates
    let rates;
    if (isGuaranteedRare) {
        rates = { ...GUARANTEED_RARE_RATES };
        // Performance bonus still applies to guaranteed rare drops
        if (includePerformance) {
            const { total: performanceBonus } = getPerformanceBonus();
            if (performanceBonus > 0) {
                // For guaranteed rare+, performance bonus shifts within rare+ tiers
                // Take from Rare and give to Epic/Legendary
                const maxFromRare = rates[RARITY.RARE] - 50; // Keep at least 50% Rare
                const bonusToApply = Math.min(performanceBonus, maxFromRare);
                if (bonusToApply > 0) {
                    const epicBonus = bonusToApply * 0.75;
                    let legendaryBonus = bonusToApply * 0.25;

                    // Cap legendary at 12% for guaranteed drops
                    if (rates[RARITY.LEGENDARY] + legendaryBonus > 12) {
                        const overflow = (rates[RARITY.LEGENDARY] + legendaryBonus) - 12;
                        legendaryBonus = 12 - rates[RARITY.LEGENDARY];
                        rates[RARITY.EPIC] += overflow;
                    }

                    rates[RARITY.RARE] -= bonusToApply;
                    rates[RARITY.EPIC] += epicBonus;
                    rates[RARITY.LEGENDARY] += legendaryBonus;
                }
            }
        }
        return rates;
    }

    rates = { ...BASE_DROP_RATES };

    // Apply premium modifier first
    if (isPremium) {
        for (const rarity of RARITY_ORDER) {
            rates[rarity] += PREMIUM_MODIFIER[rarity];
        }
    }

    // Apply performance bonus (stacks with premium)
    if (includePerformance) {
        const { total: performanceBonus } = getPerformanceBonus();
        if (performanceBonus > 0) {
            rates = calculateModifiedRates(rates, performanceBonus);
        }
    }

    // Apply pity bonus (stacks with performance bonus)
    if (includePity) {
        const pityBonus = getPityBonus();

        // Apply rare+ pity bonus (shifts from common/uncommon to rare)
        if (pityBonus.rarePlus > 0) {
            rates = applyPityBonus(rates, pityBonus.rarePlus, 'rare');
        }

        // Apply epic+ pity bonus (shifts from common/uncommon/rare to epic)
        if (pityBonus.epicPlus > 0) {
            rates = applyPityBonus(rates, pityBonus.epicPlus, 'epic');
        }
    }

    // Validate rates sum to 100
    const total = Object.values(rates).reduce((sum, rate) => sum + rate, 0);
    if (Math.abs(total - 100) > 0.01) {
        console.warn(`[DropRates] Rates sum to ${total}%, expected 100%`);
    }

    return rates;
}

/**
 * Apply pity bonus by shifting probability from lower rarities to target rarity+.
 *
 * @param {Object} baseRates - Current drop rate table
 * @param {number} bonus - Pity bonus percentage to apply
 * @param {string} targetRarity - Minimum rarity to boost ('rare' or 'epic')
 * @returns {Object} Modified drop rate table
 */
function applyPityBonus(baseRates, bonus, targetRarity) {
    const rates = { ...baseRates };

    // Determine which rarities to take from and give to
    let sourceRarities, targetRarities;
    if (targetRarity === 'rare') {
        sourceRarities = [RARITY.COMMON, RARITY.UNCOMMON];
        targetRarities = [RARITY.RARE, RARITY.EPIC, RARITY.LEGENDARY];
    } else if (targetRarity === 'epic') {
        sourceRarities = [RARITY.COMMON, RARITY.UNCOMMON, RARITY.RARE];
        targetRarities = [RARITY.EPIC, RARITY.LEGENDARY];
    } else {
        return rates; // Unknown target
    }

    // Calculate how much we can take from source rarities
    // Keep at least 5% combined in source rarities to avoid extreme distributions
    const sourceTotal = sourceRarities.reduce((sum, r) => sum + rates[r], 0);
    const maxToTake = Math.max(0, sourceTotal - 5);
    const actualBonus = Math.min(bonus, maxToTake);

    if (actualBonus <= 0) return rates;

    // Take proportionally from source rarities
    const sourceSum = sourceRarities.reduce((sum, r) => sum + rates[r], 0);
    for (const rarity of sourceRarities) {
        const proportion = rates[rarity] / sourceSum;
        rates[rarity] -= actualBonus * proportion;
        rates[rarity] = Math.max(0, rates[rarity]);
    }

    // Give primarily to the target rarity (60%), with some to higher (40%)
    const targetIndex = targetRarities.indexOf(targetRarity === 'rare' ? RARITY.RARE : RARITY.EPIC);
    const primaryTarget = targetRarities[0];

    if (targetRarities.length === 1) {
        rates[primaryTarget] += actualBonus;
    } else {
        // 60% to primary target, 30% to next, 10% to highest
        rates[targetRarities[0]] += actualBonus * 0.6;
        rates[targetRarities[1]] += actualBonus * 0.3;
        if (targetRarities.length > 2) {
            rates[targetRarities[2]] += actualBonus * 0.1;
        } else {
            rates[targetRarities[1]] += actualBonus * 0.1;
        }
    }

    // Round and validate
    for (const rarity of RARITY_ORDER) {
        rates[rarity] = Math.round(rates[rarity] * 100) / 100;
    }

    debugLog('Applied pity bonus', {
        targetRarity,
        bonus,
        actualBonus,
        resultingRates: rates
    });

    return rates;
}

/**
 * Roll for a rarity tier based on drop rates.
 *
 * @param {Object} rates - Drop rate table (rarity -> percentage)
 * @returns {string} Selected rarity tier (RARITY constant)
 */
export function rollRarity(rates) {
    // Generate random value 0-100
    const roll = Math.random() * 100;

    // Compare against cumulative rates
    let cumulative = 0;
    for (const rarity of RARITY_ORDER) {
        cumulative += rates[rarity];
        if (roll < cumulative) {
            debugLog(`Rolled ${roll.toFixed(2)} -> ${rarity} (cumulative: ${cumulative})`);
            return rarity;
        }
    }

    // Fallback (shouldn't happen if rates sum to 100)
    debugLog('Roll fallback to legendary');
    return RARITY.LEGENDARY;
}

/**
 * Select a random tank from a rarity tier.
 * Applies consecutive duplicate protection: cannot receive same tank twice in a row.
 *
 * @param {string} rarity - Rarity tier to select from
 * @param {Object} [options] - Selection options
 * @param {string[]} [options.exclusions] - Tank IDs to exclude from selection
 * @returns {Object|null} Selected tank definition, or null if no tanks available
 */
export function selectTank(rarity, options = {}) {
    const { exclusions = [], forceNew = false } = options;

    // Get all tanks of this rarity
    const candidates = getTanksByRarity(rarity);

    if (candidates.length === 0) {
        console.warn(`[DropRates] No tanks available for rarity: ${rarity}`);
        return null;
    }

    // Create exclusion set for fast lookup
    const excludeSet = new Set(exclusions);

    // Always exclude the last dropped tank (consecutive duplicate protection)
    if (lastDroppedTankId) {
        excludeSet.add(lastDroppedTankId);
    }

    // Filter out excluded tanks
    let filtered = candidates.filter(tank => !excludeSet.has(tank.id));

    // If all tanks are excluded, fall back to original candidates
    // (this can happen if there's only one tank of a rarity and it was last dropped)
    if (filtered.length === 0) {
        debugLog(`All ${rarity} tanks excluded, falling back to original candidates`);
        filtered = candidates;
    }

    // If forceNew is true (from duplicate pity), only select unowned tanks
    if (forceNew) {
        const unowned = filtered.filter(tank => !ownsTank(tank.id));
        if (unowned.length > 0) {
            filtered = unowned;
            debugLog(`Forcing new tank: ${unowned.length} unowned candidates`);
        } else {
            debugLog('Force new requested but all tanks in rarity owned, proceeding with any');
        }
    }

    // First selection attempt
    const selectedIndex = Math.floor(Math.random() * filtered.length);
    let selected = filtered[selectedIndex];

    // Duplicate reroll: if selected is owned, try once more within same rarity
    if (ownsTank(selected.id) && !forceNew) {
        debugLog(`Duplicate rolled (${selected.name}), attempting reroll...`);

        // Try to find unowned tanks
        const unownedCandidates = filtered.filter(tank => !ownsTank(tank.id));

        if (unownedCandidates.length > 0) {
            // Reroll to an unowned tank
            const rerollIndex = Math.floor(Math.random() * unownedCandidates.length);
            selected = unownedCandidates[rerollIndex];
            debugLog(`Reroll successful: selected ${selected.name} (new)`);
        } else {
            // No unowned tanks in this rarity, accept the duplicate
            debugLog(`Reroll failed: all ${rarity} tanks owned, accepting duplicate`);
        }
    }

    debugLog(`Selected ${selected.name} from ${filtered.length} ${rarity} candidates`);

    return selected;
}

/**
 * Process a full supply drop: roll rarity, select tank, handle duplicates.
 *
 * @param {string} dropType - Type of drop (DROP_TYPES.STANDARD, PREMIUM, or GUARANTEED_RARE)
 * @returns {Object} Drop result
 * @property {Object} tank - The dropped tank definition
 * @property {string} rarity - The rolled rarity tier
 * @property {boolean} isNew - True if this is a new tank for the collection
 * @property {boolean} isDuplicate - True if player already owns this tank
 * @property {number} scrapAwarded - Scrap awarded (only for duplicates)
 * @property {number} duplicateCount - How many times player has received this tank
 * @property {boolean} pityTriggered - True if pity system forced a guaranteed rarity
 */
export function processDrop(dropType) {
    // Step 1: Check for pity-guaranteed rarity override
    const minimumRarity = getMinimumRarity();
    let pityTriggered = false;

    // Step 1b: Check for guaranteed new tank (duplicate pity system)
    const forceNewTank = isGuaranteedNewTank();
    if (forceNewTank) {
        debugLog(`Duplicate pity active: ${getConsecutiveDuplicates()} consecutive duplicates, forcing new tank`);
    }

    // Step 2: Calculate rates based on drop type (includes performance AND pity bonus)
    const rates = calculateDropRates({
        isPremium: dropType === DROP_TYPES.PREMIUM,
        isGuaranteedRare: dropType === DROP_TYPES.GUARANTEED_RARE,
        includePerformance: true,
        includePity: true
    });

    debugLog(`Processing ${dropType} drop with rates:`, rates);
    if (minimumRarity) {
        debugLog(`Pity system minimum rarity: ${minimumRarity}`);
    }

    // Step 3: Roll for rarity
    let rarity = rollRarity(rates);

    // Step 4: Apply pity-guaranteed rarity override if needed
    if (minimumRarity) {
        const rarityIndex = RARITY_ORDER.indexOf(rarity);
        const minimumIndex = RARITY_ORDER.indexOf(minimumRarity);

        if (rarityIndex < minimumIndex) {
            debugLog(`Pity override: ${rarity} -> ${minimumRarity} (forced minimum)`);
            rarity = minimumRarity;
            pityTriggered = true;
        }
    }

    // Step 5: Select tank from rarity tier
    // Pass forceNew flag if duplicate pity is active
    const tank = selectTank(rarity, { forceNew: forceNewTank });

    if (!tank) {
        console.error('[DropRates] Failed to select tank');
        return {
            tank: null,
            rarity: null,
            isNew: false,
            isDuplicate: false,
            scrapAwarded: 0,
            duplicateCount: 0,
            pityTriggered: false,
            duplicatePityTriggered: false
        };
    }

    // Step 6: Update last dropped tank for consecutive protection
    lastDroppedTankId = tank.id;

    // Step 7: Add to collection and get result
    // The addTank function handles duplicate detection and scrap awarding
    const addResult = addTankToCollection(tank.id);

    // Step 7b: If duplicate pity was used and we got a new tank, reset the counter
    // (addTank already resets on new tank, but we track if pity was the reason)
    const duplicatePityTriggered = forceNewTank && addResult.isNew;

    // Step 8: Update pity counters based on drop result
    updatePityCounters(rarity);

    const result = {
        tank: tank,
        rarity: rarity,
        isNew: addResult.isNew,
        isDuplicate: addResult.isDuplicate,
        scrapAwarded: addResult.scrapAwarded,
        duplicateCount: addResult.duplicateCount,
        pityTriggered: pityTriggered,
        duplicatePityTriggered: duplicatePityTriggered
    };

    debugLog('Drop result:', {
        tankId: tank.id,
        tankName: tank.name,
        rarity: rarity,
        isNew: result.isNew,
        isDuplicate: result.isDuplicate,
        scrapAwarded: result.scrapAwarded,
        pityTriggered: pityTriggered,
        duplicatePityTriggered: duplicatePityTriggered
    });

    return result;
}

/**
 * Get the last dropped tank ID.
 * Used for testing and debugging.
 *
 * @returns {string|null} Last dropped tank ID
 */
export function getLastDroppedTankId() {
    return lastDroppedTankId;
}

/**
 * Reset the last dropped tank ID.
 * Useful for testing or session resets.
 */
export function resetLastDropped() {
    lastDroppedTankId = null;
    debugLog('Last dropped tank reset');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get drop rates for display purposes.
 *
 * @param {string} dropType - Type of drop
 * @param {boolean} [includePerformance=false] - Whether to include performance bonus in displayed rates
 * @param {boolean} [includePity=false] - Whether to include pity bonus in displayed rates
 * @returns {Object} Drop rate table
 */
export function getDropRatesForDisplay(dropType, includePerformance = false, includePity = false) {
    return calculateDropRates({
        isPremium: dropType === DROP_TYPES.PREMIUM,
        isGuaranteedRare: dropType === DROP_TYPES.GUARANTEED_RARE,
        includePerformance,
        includePity
    });
}

/**
 * Get the current pity bonus information for display.
 *
 * @returns {Object} Pity bonus info
 * @property {number} rarePlus - Bonus for rare+ chance
 * @property {number} epicPlus - Bonus for epic+ chance
 * @property {boolean} guaranteedRare - Whether next drop is guaranteed rare+
 * @property {boolean} guaranteedEpic - Whether next drop is guaranteed epic+
 */
export function getCurrentPityBonus() {
    return getPityBonus();
}

/**
 * Get the current performance bonus information for display.
 *
 * @returns {Object} Performance bonus info
 * @property {number} total - Total bonus percentage
 * @property {Object} breakdown - Individual bonus sources
 */
export function getCurrentPerformanceBonus() {
    return getPerformanceBonus();
}

/**
 * Calculate the probability of getting a specific rarity or better.
 *
 * @param {string} dropType - Type of drop
 * @param {string} minRarity - Minimum rarity (inclusive)
 * @param {boolean} [includePerformance=true] - Whether to include performance bonus
 * @returns {number} Probability as percentage (0-100)
 */
export function getRarityPlusProbability(dropType, minRarity, includePerformance = true) {
    const rates = getDropRatesForDisplay(dropType, includePerformance);
    const minIndex = RARITY_ORDER.indexOf(minRarity);

    if (minIndex === -1) return 0;

    let probability = 0;
    for (let i = minIndex; i < RARITY_ORDER.length; i++) {
        probability += rates[RARITY_ORDER[i]];
    }

    return probability;
}

/**
 * Validate that the drop rate system is working correctly.
 * Runs self-tests on module load.
 */
function validateDropRates() {
    // Validate base rates sum to 100
    const baseTotal = Object.values(BASE_DROP_RATES).reduce((sum, rate) => sum + rate, 0);
    if (baseTotal !== 100) {
        console.error(`[DropRates] Base rates sum to ${baseTotal}%, expected 100%`);
    }

    // Validate guaranteed rare rates sum to 100
    const guaranteedTotal = Object.values(GUARANTEED_RARE_RATES).reduce((sum, rate) => sum + rate, 0);
    if (guaranteedTotal !== 100) {
        console.error(`[DropRates] Guaranteed rare rates sum to ${guaranteedTotal}%, expected 100%`);
    }

    // Validate premium modifier sums to 0 (just redistributes)
    const premiumSum = Object.values(PREMIUM_MODIFIER).reduce((sum, mod) => sum + mod, 0);
    if (premiumSum !== 0) {
        console.error(`[DropRates] Premium modifier sum is ${premiumSum}, expected 0 (pure redistribution)`);
    }

    // Validate premium rates sum to 100
    const premiumRates = calculateDropRates({ isPremium: true });
    const premiumTotal = Object.values(premiumRates).reduce((sum, rate) => sum + rate, 0);
    if (premiumTotal !== 100) {
        console.error(`[DropRates] Premium rates sum to ${premiumTotal}%, expected 100%`);
    }

    if (DEBUG.ENABLED) {
        console.log('[DropRates] Validation complete', {
            base: BASE_DROP_RATES,
            premium: premiumRates,
            guaranteed: GUARANTEED_RARE_RATES
        });
    }
}

// Run validation on module load
validateDropRates();

console.log('[DropRates] Module loaded');

// =============================================================================
// EXPORTS
// =============================================================================

export {
    BASE_DROP_RATES,
    PREMIUM_MODIFIER,
    GUARANTEED_RARE_RATES,
    PERFORMANCE_BONUS_DISTRIBUTION,
    RATE_CAPS
};
