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
    HIT_BASE_REWARD: 100,
    /** Multiplier for damage dealt (damage × this value) */
    DAMAGE_MULTIPLIER: 2,
    /** Bonus for winning a round */
    VICTORY_BONUS: 500,
    /** Consolation prize for losing a round */
    DEFEAT_CONSOLATION: 100
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
// MONEY OPERATIONS
// =============================================================================

/**
 * Initialize or reset the money system for a new game.
 */
export function init() {
    currentMoney = MONEY.STARTING_AMOUNT;
    roundEarnings = 0;
    roundDamage = 0;

    if (DEBUG.ENABLED) {
        console.log(`[Money] Initialized with $${MONEY.STARTING_AMOUNT.toLocaleString()}`);
    }
}

/**
 * Reset round tracking at the start of a new round.
 * Does not reset the player's total money.
 */
export function startRound() {
    roundEarnings = 0;
    roundDamage = 0;

    if (DEBUG.ENABLED) {
        console.log(`[Money] New round started. Current balance: $${currentMoney.toLocaleString()}`);
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
 * Formula: $100 + (damage × 2)
 * @param {number} damage - Damage dealt to the enemy
 * @returns {number} Amount awarded
 */
export function awardHitReward(damage) {
    const reward = MONEY.HIT_BASE_REWARD + Math.floor(damage * MONEY.DAMAGE_MULTIPLIER);

    currentMoney += reward;
    roundEarnings += reward;
    roundDamage += damage;

    logMoneyChange(`Hit reward (${damage} damage)`, reward, currentMoney);

    return reward;
}

/**
 * Award the victory bonus for winning a round.
 * @returns {number} Amount awarded
 */
export function awardVictoryBonus() {
    const reward = MONEY.VICTORY_BONUS;

    currentMoney += reward;
    roundEarnings += reward;

    logMoneyChange('Victory bonus', reward, currentMoney);

    return reward;
}

/**
 * Award the consolation prize for losing a round.
 * @returns {number} Amount awarded
 */
export function awardDefeatConsolation() {
    const reward = MONEY.DEFEAT_CONSOLATION;

    currentMoney += reward;
    roundEarnings += reward;

    logMoneyChange('Defeat consolation', reward, currentMoney);

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
        roundDamage
    };
}
