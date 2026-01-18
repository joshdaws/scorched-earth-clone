/**
 * Scorched Earth: Synthwave Edition
 * Debug Tools - Game state manipulation for testing
 *
 * Provides console commands and keyboard shortcuts for:
 * - Skipping to specific game states (shop, victory, defeat)
 * - Modifying player balance and inventory
 * - God mode (invincibility)
 * - Instant kill (self or enemy)
 * - Round manipulation
 *
 * All debug commands require debug mode to be enabled (press 'D').
 */

import { GAME_STATES } from './constants.js';
import * as Debug from './debug.js';
import * as Game from './game.js';
import * as Money from './money.js';
import { WeaponRegistry } from './weapons.js';
import { getRunStats, isRunActive, getRoundNumber } from './runState.js';
import { LevelRegistry } from './levels.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {boolean} Whether god mode is enabled */
let godModeEnabled = false;

/** @type {Function|null} Reference to getPlayerTank function (set during init) */
let getPlayerTank = null;

/** @type {Function|null} Reference to getEnemyTank function (set during init) */
let getEnemyTank = null;

/** @type {Function|null} Reference to getCurrentRound function (set during init) */
let getCurrentRound = null;

/** @type {Function|null} Reference to setCurrentRound function (set during init) */
let setCurrentRound = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize debug tools with references to game state.
 * Must be called during game initialization.
 *
 * @param {Object} gameRefs - References to game state accessors
 * @param {Function} gameRefs.getPlayerTank - Function that returns player tank
 * @param {Function} gameRefs.getEnemyTank - Function that returns enemy tank
 * @param {Function} gameRefs.getCurrentRound - Function that returns current round number
 * @param {Function} gameRefs.setCurrentRound - Function to set current round number
 */
export function init(gameRefs) {
    getPlayerTank = gameRefs.getPlayerTank;
    getEnemyTank = gameRefs.getEnemyTank;
    getCurrentRound = gameRefs.getCurrentRound;
    setCurrentRound = gameRefs.setCurrentRound;

    console.log('[DebugTools] Initialized');
}

// =============================================================================
// DEBUG CHECK
// =============================================================================

/**
 * Check if debug mode is enabled before executing a command.
 * Logs a warning if debug mode is not enabled.
 * @returns {boolean} True if debug mode is enabled
 */
function requireDebugMode() {
    if (!Debug.isEnabled()) {
        console.warn('[DebugTools] Debug mode not enabled. Press \'D\' to enable.');
        return false;
    }
    return true;
}

// =============================================================================
// GAME STATE COMMANDS
// =============================================================================

/**
 * Skip directly to the shop screen with optional money amount.
 * @param {number} [money] - Optional money to set before entering shop
 */
export function skipToShop(money) {
    if (!requireDebugMode()) return;

    // Force transition to shop state (bypass validation)
    forceState(GAME_STATES.SHOP);

    // Set money AFTER state transition (state transition may reset money)
    if (typeof money === 'number') {
        Money.setMoney(money);
    }

    console.log(`[DebugTools] Skipped to shop with $${Money.getMoney().toLocaleString()}`);
}

/**
 * Skip directly to the victory screen.
 */
export function skipToVictory() {
    if (!requireDebugMode()) return;

    // Award victory bonus for realistic testing
    Money.awardVictoryBonus();

    forceState(GAME_STATES.VICTORY);
    console.log('[DebugTools] Skipped to victory screen');
}

/**
 * Skip directly to the defeat screen.
 */
export function skipToDefeat() {
    if (!requireDebugMode()) return;

    // Award defeat consolation for realistic testing
    Money.awardDefeatConsolation();

    forceState(GAME_STATES.DEFEAT);
    console.log('[DebugTools] Skipped to defeat screen');
}

/**
 * Return to the main menu.
 */
export function skipToMenu() {
    if (!requireDebugMode()) return;

    forceState(GAME_STATES.MENU);
    console.log('[DebugTools] Returned to main menu');
}

/**
 * Start a specific level directly.
 * @param {number} world - World number (1-6)
 * @param {number} level - Level number (1-10)
 */
export function startLevel(world, level) {
    if (!requireDebugMode()) return;

    const levelId = `world${world}-level${level}`;
    const levelData = LevelRegistry.getLevel(levelId);

    if (!levelData) {
        console.error(`[DebugTools] Level not found: ${levelId}`);
        console.log('[DebugTools] Available worlds: 1-6, levels: 1-10');
        return;
    }

    console.log(`[DebugTools] Starting level: ${levelId} - ${levelData.name}`);

    // Dispatch the levelSelected event for main.js to handle
    window.dispatchEvent(new CustomEvent('levelSelected', {
        detail: {
            levelId,
            level: levelData,
            worldNum: world,
            levelNum: level
        }
    }));

    // Transition to playing state
    forceState(GAME_STATES.PLAYING);
}

/**
 * Force a state transition, bypassing normal validation.
 * Used internally by debug tools.
 * @param {string} newState - The state to transition to
 */
function forceState(newState) {
    // Directly set the game state - this is a debug hack
    // We need to call handlers manually since we're bypassing setState validation
    const currentState = Game.getState();

    // If we're in a valid transition, use normal setState
    if (Game.setState(newState)) {
        return;
    }

    // Otherwise, we need to forcefully set the state
    // This requires the game module to expose a force method
    console.warn(`[DebugTools] Forcing state transition: ${currentState} → ${newState}`);

    // Try to find a valid path to the target state
    // First try going through MENU as an intermediate state
    if (currentState !== GAME_STATES.MENU && newState !== GAME_STATES.MENU) {
        Game.setState(GAME_STATES.MENU);
    }

    // Now try to reach the target state
    if (newState === GAME_STATES.SHOP) {
        // Shop requires going through PLAYING first in some cases
        if (Game.getState() === GAME_STATES.MENU) {
            Game.setState(GAME_STATES.PLAYING);
        }
        // From PLAYING, we can go to ROUND_END, then SHOP
        if (Game.getState() === GAME_STATES.PLAYING) {
            Game.setState(GAME_STATES.VICTORY);
        }
        // From VICTORY we can go to SHOP
        Game.setState(GAME_STATES.SHOP);
    } else if (newState === GAME_STATES.VICTORY) {
        if (Game.getState() === GAME_STATES.MENU) {
            Game.setState(GAME_STATES.PLAYING);
        }
        Game.setState(GAME_STATES.VICTORY);
    } else if (newState === GAME_STATES.DEFEAT) {
        if (Game.getState() === GAME_STATES.MENU) {
            Game.setState(GAME_STATES.PLAYING);
        }
        Game.setState(GAME_STATES.DEFEAT);
    } else {
        Game.setState(newState);
    }
}

// =============================================================================
// MONEY COMMANDS
// =============================================================================

/**
 * Set the player's money to a specific amount.
 * @param {number} amount - The amount to set
 */
export function setMoney(amount) {
    if (!requireDebugMode()) return;

    if (typeof amount !== 'number' || amount < 0) {
        console.warn('[DebugTools] setMoney requires a non-negative number');
        return;
    }

    Money.setMoney(amount);
    console.log(`[DebugTools] Money set to $${amount.toLocaleString()}`);
}

/**
 * Add money to the player's balance.
 * @param {number} amount - The amount to add
 */
export function addMoney(amount) {
    if (!requireDebugMode()) return;

    if (typeof amount !== 'number' || amount <= 0) {
        console.warn('[DebugTools] addMoney requires a positive number');
        return;
    }

    Money.addMoney(amount, 'Debug bonus');
    console.log(`[DebugTools] Added $${amount.toLocaleString()} (total: $${Money.getMoney().toLocaleString()})`);
}

// =============================================================================
// WEAPON/INVENTORY COMMANDS
// =============================================================================

/**
 * Give the player ammo for a specific weapon.
 * @param {string} weaponId - The weapon ID (e.g., 'mirv', 'nuke')
 * @param {number} [amount=5] - Amount of ammo to give
 */
export function giveWeapon(weaponId, amount = 5) {
    if (!requireDebugMode()) return;

    const weapon = WeaponRegistry.getWeapon(weaponId);
    if (!weapon) {
        console.warn(`[DebugTools] Unknown weapon: ${weaponId}`);
        console.log('[DebugTools] Available weapons:', WeaponRegistry.getAllIds().join(', '));
        return;
    }

    const player = getPlayerTank?.();
    if (!player) {
        console.warn('[DebugTools] No player tank - start a game first');
        return;
    }

    player.addAmmo(weaponId, amount);
    console.log(`[DebugTools] Gave ${amount}x ${weapon.name} to player`);
}

/**
 * Give the player all weapons with specified ammo count.
 * @param {number} [amount=5] - Amount of ammo for each weapon
 */
export function giveAllWeapons(amount = 5) {
    if (!requireDebugMode()) return;

    const player = getPlayerTank?.();
    if (!player) {
        console.warn('[DebugTools] No player tank - start a game first');
        return;
    }

    const weapons = WeaponRegistry.getAllWeapons();
    for (const weapon of weapons) {
        if (weapon.id !== 'basic-shot') {  // basic-shot already has infinite ammo
            player.addAmmo(weapon.id, amount);
        }
    }

    console.log(`[DebugTools] Gave ${amount}x of all weapons to player`);
}

/**
 * List all available weapons and their IDs.
 */
export function listWeapons() {
    const weapons = WeaponRegistry.getAllWeapons();
    console.log('[DebugTools] Available weapons:');
    for (const weapon of weapons) {
        console.log(`  ${weapon.id}: ${weapon.name} ($${weapon.cost})`);
    }
}

// =============================================================================
// ROUND COMMANDS
// =============================================================================

/**
 * Set the current round number.
 * Affects AI difficulty and money multipliers.
 * @param {number} round - The round number to set (1-based)
 */
export function setRound(round) {
    if (!requireDebugMode()) return;

    if (typeof round !== 'number' || round < 1) {
        console.warn('[DebugTools] setRound requires a positive number');
        return;
    }

    if (setCurrentRound) {
        setCurrentRound(round);
        Money.startRound(round);
        console.log(`[DebugTools] Round set to ${round} (multiplier: ${Money.getMultiplier()}x)`);
    } else {
        console.warn('[DebugTools] setCurrentRound not available');
    }
}

/**
 * Get the current round number and multiplier info.
 */
export function getRound() {
    if (!requireDebugMode()) return;

    const round = getCurrentRound?.() || Money.getRoundNumber();
    const multiplier = Money.getMultiplier();
    console.log(`[DebugTools] Current round: ${round} (multiplier: ${multiplier}x)`);
    return round;
}

// =============================================================================
// COMBAT COMMANDS
// =============================================================================

/**
 * Instantly kill the enemy tank, triggering victory.
 */
export function killEnemy() {
    if (!requireDebugMode()) return;

    const enemy = getEnemyTank?.();
    if (!enemy) {
        console.warn('[DebugTools] No enemy tank - start a game first');
        return;
    }

    enemy.takeDamage(enemy.health);
    console.log('[DebugTools] Enemy tank destroyed');
}

/**
 * Instantly kill the player tank, triggering defeat.
 */
export function killSelf() {
    if (!requireDebugMode()) return;

    const player = getPlayerTank?.();
    if (!player) {
        console.warn('[DebugTools] No player tank - start a game first');
        return;
    }

    // Only kill if god mode is off
    if (godModeEnabled) {
        console.warn('[DebugTools] Cannot kill self while god mode is enabled');
        return;
    }

    player.takeDamage(player.health);
    console.log('[DebugTools] Player tank destroyed');
}

/**
 * Toggle god mode (invincibility) for the player.
 * @returns {boolean} New god mode state
 */
export function toggleGodMode() {
    if (!requireDebugMode()) return false;

    godModeEnabled = !godModeEnabled;
    console.log(`[DebugTools] God mode ${godModeEnabled ? 'ENABLED' : 'disabled'}`);
    return godModeEnabled;
}

/**
 * Check if god mode is currently enabled.
 * @returns {boolean} True if god mode is enabled
 */
export function isGodModeEnabled() {
    return godModeEnabled;
}

/**
 * Set the player's health to a specific value.
 * @param {number} health - Health value to set (1-100)
 */
export function setHealth(health) {
    if (!requireDebugMode()) return;

    const player = getPlayerTank?.();
    if (!player) {
        console.warn('[DebugTools] No player tank - start a game first');
        return;
    }

    const clampedHealth = Math.max(1, Math.min(100, health));
    // Calculate damage needed to reach target health
    if (clampedHealth < player.health) {
        player.takeDamage(player.health - clampedHealth);
    } else if (clampedHealth > player.health) {
        player.heal(clampedHealth - player.health);
    }

    console.log(`[DebugTools] Player health set to ${player.health}`);
}

/**
 * Set the enemy's health to a specific value.
 * @param {number} health - Health value to set (1-100)
 */
export function setEnemyHealth(health) {
    if (!requireDebugMode()) return;

    const enemy = getEnemyTank?.();
    if (!enemy) {
        console.warn('[DebugTools] No enemy tank - start a game first');
        return;
    }

    const clampedHealth = Math.max(1, Math.min(100, health));
    // Calculate damage needed to reach target health
    if (clampedHealth < enemy.health) {
        enemy.takeDamage(enemy.health - clampedHealth);
    } else if (clampedHealth > enemy.health) {
        enemy.heal(clampedHealth - enemy.health);
    }

    console.log(`[DebugTools] Enemy health set to ${enemy.health}`);
}

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

/**
 * Handle debug keyboard shortcuts.
 * Only active when debug mode is enabled.
 *
 * Shortcuts (require debug mode + Shift):
 * - Shift+1: Skip to Shop with $10,000
 * - Shift+2: Skip to Victory
 * - Shift+3: Skip to Defeat
 * - Shift+4: Skip to Menu
 * - Shift+5: Give all weapons
 * - Shift+6: Add $5,000
 * - Shift+7: Kill enemy
 * - Shift+8: Toggle god mode
 * - Shift+9: Set round to 5
 *
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if a shortcut was handled
 */
export function handleKeyDown(event) {
    if (!Debug.isEnabled()) return false;
    if (!event.shiftKey) return false;

    switch (event.code) {
        case 'Digit1':
            skipToShop(10000);
            return true;
        case 'Digit2':
            skipToVictory();
            return true;
        case 'Digit3':
            skipToDefeat();
            return true;
        case 'Digit4':
            skipToMenu();
            return true;
        case 'Digit5':
            giveAllWeapons(10);
            return true;
        case 'Digit6':
            addMoney(5000);
            return true;
        case 'Digit7':
            killEnemy();
            return true;
        case 'Digit8':
            toggleGodMode();
            return true;
        case 'Digit9':
            setRound(5);
            return true;
        case 'Digit0':
            showStats();
            return true;
        default:
            return false;
    }
}

// =============================================================================
// RUN STATS
// =============================================================================

/**
 * Show current run statistics in the console.
 * Displays all tracked stats for the current run.
 */
export function showStats() {
    if (!requireDebugMode()) return;

    if (!isRunActive()) {
        console.warn('[DebugTools] No active run - start a game first');
        return;
    }

    const stats = getRunStats();
    const round = getRoundNumber();

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    CURRENT RUN STATS                           ║
╠════════════════════════════════════════════════════════════════╣
║  Current Round:        ${String(round).padStart(6)}                             ║
║  Rounds Survived:      ${String(stats.roundsSurvived).padStart(6)}                             ║
║  Enemies Destroyed:    ${String(stats.enemiesDestroyed).padStart(6)}                             ║
╠════════════════════════════════════════════════════════════════╣
║  COMBAT STATS:                                                 ║
║    Shots Fired:        ${String(stats.shotsFired).padStart(6)}                             ║
║    Shots Hit:          ${String(stats.shotsHit).padStart(6)}                             ║
║    Hit Rate:           ${String(stats.hitRate + '%').padStart(6)}                             ║
║    Total Damage Dealt: ${String(stats.totalDamageDealt).padStart(6)}                             ║
║    Total Damage Taken: ${String(stats.totalDamageTaken).padStart(6)}                             ║
║    Biggest Hit:        ${String(stats.biggestHit).padStart(6)}                             ║
╠════════════════════════════════════════════════════════════════╣
║  ECONOMY STATS:                                                ║
║    Money Earned:     $${String(stats.moneyEarned).padStart(7)}                             ║
║    Money Spent:      $${String(stats.moneySpent).padStart(7)}                             ║
╠════════════════════════════════════════════════════════════════╣
║  WEAPONS USED:                                                 ║
║    Unique Weapons:     ${String(stats.uniqueWeaponsCount).padStart(6)}                             ║
║    Nukes Launched:     ${String(stats.nukesLaunched).padStart(6)}                             ║
║    Weapons: ${stats.weaponsUsed.join(', ') || 'None'}
╚════════════════════════════════════════════════════════════════╝
`);

    return stats;
}

// =============================================================================
// HELP
// =============================================================================

/**
 * Show all available debug commands in the console.
 */
export function help() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    DEBUG TOOLS - HELP                          ║
╠════════════════════════════════════════════════════════════════╣
║ Console Commands (use Debug.* in browser console):             ║
║                                                                ║
║ STATE COMMANDS:                                                ║
║   Debug.skipToShop(money)  - Jump to shop (optional money)     ║
║   Debug.skipToVictory()    - Jump to victory screen            ║
║   Debug.skipToDefeat()     - Jump to defeat screen             ║
║   Debug.skipToMenu()       - Return to main menu               ║
║   Debug.startLevel(w, l)   - Start world w, level l directly   ║
║                                                                ║
║ MONEY COMMANDS:                                                ║
║   Debug.setMoney(amount)   - Set player balance                ║
║   Debug.addMoney(amount)   - Add to player balance             ║
║                                                                ║
║ WEAPON COMMANDS:                                               ║
║   Debug.giveWeapon(id, n)  - Give n of weapon to player        ║
║   Debug.giveAllWeapons(n)  - Give n of all weapons             ║
║   Debug.listWeapons()      - List available weapon IDs         ║
║                                                                ║
║ ROUND COMMANDS:                                                ║
║   Debug.setRound(n)        - Set round number                  ║
║   Debug.getRound()         - Show current round info           ║
║                                                                ║
║ STATS COMMANDS:                                                ║
║   Debug.showStats()        - Show current run statistics       ║
║                                                                ║
║ COMBAT COMMANDS:                                               ║
║   Debug.killEnemy()        - Instantly destroy enemy           ║
║   Debug.killSelf()         - Instantly destroy player          ║
║   Debug.toggleGodMode()    - Toggle invincibility              ║
║   Debug.setHealth(hp)      - Set player health                 ║
║   Debug.setEnemyHealth(hp) - Set enemy health                  ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ Keyboard Shortcuts (requires debug mode + Shift key):          ║
║                                                                ║
║   Shift+1  Skip to Shop ($10,000)                              ║
║   Shift+2  Skip to Victory                                     ║
║   Shift+3  Skip to Defeat                                      ║
║   Shift+4  Return to Menu                                      ║
║   Shift+5  Give all weapons (10 each)                          ║
║   Shift+6  Add $5,000                                          ║
║   Shift+7  Kill enemy                                          ║
║   Shift+8  Toggle god mode                                     ║
║   Shift+9  Set round to 5                                      ║
║   Shift+0  Show run statistics                                 ║
║                                                                ║
║ Note: Press 'D' to toggle debug mode first!                    ║
╚════════════════════════════════════════════════════════════════╝
`);
}
