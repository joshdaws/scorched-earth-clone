/**
 * Scorched Earth: Synthwave Edition
 * Money System
 *
 * Tracks player money, awards based on damage dealt and round outcome.
 * Provides debug logging for all money changes.
 */

import { GAME, DEBUG } from './constants.js';

// =============================================================================
// MONEY CONSTANTS
// =============================================================================

/**
 * Money system configuration.
 */
export const MONEY = {
    /** Starting money for new game */
    STARTING_AMOUNT: GAME.STARTING_MONEY,
    /** Base money earned per hit */
    HIT_BASE_REWARD: 50,
    /** Multiplier for damage dealt (damage × this value) */
    DAMAGE_MULTIPLIER: 2,
    /** Bonus for winning a round */
    VICTORY_BONUS: 500,
    /** Consolation prize for losing a round */
    DEFEAT_CONSOLATION: 100
};

/**
 * Round-based money multipliers.
 * Higher rounds award more money to encourage progression.
 * - Rounds 1-2: 1.0x (standard rewards)
 * - Rounds 3-4: 1.2x (20% bonus)
 * - Rounds 5+: 1.5x (50% bonus)
 */
const ROUND_MULTIPLIERS = {
    EARLY: 1.0,    // Rounds 1-2
    MEDIUM: 1.2,   // Rounds 3-4
    LATE: 1.5      // Rounds 5+
};

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Current player money.
 * @type {number}
 */
let currentMoney = MONEY.STARTING_AMOUNT;

/**
 * Total money earned this round (for display on victory/defeat screen).
 * @type {number}
 */
let roundEarnings = 0;

/**
 * Total damage dealt this round (for statistics).
 * @type {number}
 */
let roundDamage = 0;

/**
 * Current round's money multiplier.
 * Updated when startRound() is called with a round number.
 * @type {number}
 */
let currentMultiplier = ROUND_MULTIPLIERS.EARLY;

/**
 * Current round number (for display and tracking).
 * @type {number}
 */
let currentRoundNumber = 1;

// =============================================================================
// DEBUG LOGGING
// =============================================================================

/**
 * Log a money change to console in debug mode.
 * @param {string} reason - Reason for the money change
 * @param {number} amount - Amount changed (positive for gain, negative for loss)
 * @param {number} newTotal - New total after change
 */
function logMoneyChange(reason, amount, newTotal) {
    if (DEBUG.ENABLED) {
        const sign = amount >= 0 ? '+' : '';
        console.log(`[Money] ${reason}: ${sign}$${amount.toLocaleString()} | Total: $${newTotal.toLocaleString()}`);
    }
}

// =============================================================================
// ROUND MULTIPLIER
// =============================================================================

/**
 * Get the money multiplier for a given round number.
 * - Rounds 1-2: 1.0x (standard rewards)
 * - Rounds 3-4: 1.2x (20% bonus)
 * - Rounds 5+: 1.5x (50% bonus)
 *
 * @param {number} roundNumber - Current round (1-based)
 * @returns {number} Money multiplier for the round
 */
export function getMultiplierForRound(roundNumber) {
    if (roundNumber <= 2) {
        return ROUND_MULTIPLIERS.EARLY;
    } else if (roundNumber <= 4) {
        return ROUND_MULTIPLIERS.MEDIUM;
    } else {
        return ROUND_MULTIPLIERS.LATE;
    }
}

/**
 * Get the current round's money multiplier.
 * @returns {number} Current multiplier
 */
export function getMultiplier() {
    return currentMultiplier;
}

/**
 * Get the current round number.
 * @returns {number} Current round (1-based)
 */
export function getRoundNumber() {
    return currentRoundNumber;
}

// =============================================================================
// MONEY OPERATIONS
// =============================================================================

/**
 * Initialize or reset the money system for a new game.
 */
export function init() {
    currentMoney = MONEY.STARTING_AMOUNT;
    roundEarnings = 0;
    roundDamage = 0;
    currentMultiplier = ROUND_MULTIPLIERS.EARLY;
    currentRoundNumber = 1;

    if (DEBUG.ENABLED) {
        console.log(`[Money] Initialized with $${MONEY.STARTING_AMOUNT.toLocaleString()}`);
    }
}

/**
 * Reset round tracking at the start of a new round.
 * Updates the money multiplier based on round number.
 * @param {number} [roundNumber=1] - Current round number (1-based)
 */
export function startRound(roundNumber = 1) {
    roundEarnings = 0;
    roundDamage = 0;
    currentRoundNumber = roundNumber;
    currentMultiplier = getMultiplierForRound(roundNumber);

    if (DEBUG.ENABLED) {
        console.log(`[Money] Round ${roundNumber} started. Multiplier: ${currentMultiplier}x | Balance: $${currentMoney.toLocaleString()}`);
    }
}

/**
 * Get the current player money.
 * @returns {number} Current money amount
 */
export function getMoney() {
    return currentMoney;
}

/**
 * Get the total earnings for this round.
 * @returns {number} Round earnings
 */
export function getRoundEarnings() {
    return roundEarnings;
}

/**
 * Get the total damage dealt this round.
 * @returns {number} Round damage
 */
export function getRoundDamage() {
    return roundDamage;
}

/**
 * Set the player's money directly.
 * Used for loading saved games or admin adjustments.
 * @param {number} amount - New money amount
 */
export function setMoney(amount) {
    const oldMoney = currentMoney;
    currentMoney = Math.max(0, amount);

    if (DEBUG.ENABLED) {
        console.log(`[Money] Set to $${currentMoney.toLocaleString()} (was $${oldMoney.toLocaleString()})`);
    }
}

/**
 * Add money to the player's balance.
 * @param {number} amount - Amount to add
 * @param {string} [reason='Generic reward'] - Reason for the addition (for logging)
 */
export function addMoney(amount, reason = 'Generic reward') {
    if (amount <= 0) return;

    currentMoney += amount;
    logMoneyChange(reason, amount, currentMoney);
}

/**
 * Subtract money from the player's balance.
 * Money cannot go below zero.
 * @param {number} amount - Amount to subtract
 * @param {string} [reason='Generic expense'] - Reason for the subtraction (for logging)
 * @returns {boolean} True if the full amount was subtracted, false if insufficient funds
 */
export function spendMoney(amount, reason = 'Generic expense') {
    if (amount <= 0) return true;

    if (currentMoney >= amount) {
        currentMoney -= amount;
        logMoneyChange(reason, -amount, currentMoney);
        return true;
    } else {
        if (DEBUG.ENABLED) {
            console.log(`[Money] Insufficient funds: Need $${amount.toLocaleString()}, have $${currentMoney.toLocaleString()}`);
        }
        return false;
    }
}

/**
 * Check if the player can afford an amount.
 * @param {number} amount - Amount to check
 * @returns {boolean} True if player has sufficient funds
 */
export function canAfford(amount) {
    return currentMoney >= amount;
}

// =============================================================================
// GAME EVENT REWARDS
// =============================================================================

/**
 * Award money for landing a hit on an enemy tank.
 * Formula: ($50 + (damage × 2)) × round multiplier
 * @param {number} damage - Damage dealt to the enemy
 * @returns {number} Amount awarded
 */
export function awardHitReward(damage) {
    const baseReward = MONEY.HIT_BASE_REWARD + Math.floor(damage * MONEY.DAMAGE_MULTIPLIER);
    const reward = Math.floor(baseReward * currentMultiplier);

    currentMoney += reward;
    roundEarnings += reward;
    roundDamage += damage;

    const multiplierInfo = currentMultiplier > 1 ? ` (${currentMultiplier}x)` : '';
    logMoneyChange(`Hit reward (${damage} damage)${multiplierInfo}`, reward, currentMoney);

    return reward;
}

/**
 * Award the victory bonus for winning a round.
 * Multiplied by round bonus multiplier.
 * @returns {number} Amount awarded
 */
export function awardVictoryBonus() {
    const reward = Math.floor(MONEY.VICTORY_BONUS * currentMultiplier);

    currentMoney += reward;
    roundEarnings += reward;

    const multiplierInfo = currentMultiplier > 1 ? ` (${currentMultiplier}x)` : '';
    logMoneyChange(`Victory bonus${multiplierInfo}`, reward, currentMoney);

    return reward;
}

/**
 * Award the consolation prize for losing a round.
 * Multiplied by round bonus multiplier.
 * @returns {number} Amount awarded
 */
export function awardDefeatConsolation() {
    const reward = Math.floor(MONEY.DEFEAT_CONSOLATION * currentMultiplier);

    currentMoney += reward;
    roundEarnings += reward;

    const multiplierInfo = currentMultiplier > 1 ? ` (${currentMultiplier}x)` : '';
    logMoneyChange(`Defeat consolation${multiplierInfo}`, reward, currentMoney);

    return reward;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format a money amount for display.
 * @param {number} amount - Amount to format
 * @returns {string} Formatted string (e.g., "$1,234")
 */
export function formatMoney(amount) {
    return `$${amount.toLocaleString()}`;
}

/**
 * Get a summary of the current money state for debugging.
 * @returns {Object} Money state summary
 */
export function getState() {
    return {
        currentMoney,
        roundEarnings,
        roundDamage,
        currentRoundNumber,
        currentMultiplier
    };
}
