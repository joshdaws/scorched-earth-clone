/**
 * Scorched Earth: Synthwave Edition
 * Weapon Mastery Achievement Detection
 *
 * Tracks weapon usage and kills to award weapon-specific achievements.
 * Handles individual weapon kills, Basic Training (basic shots only),
 * and Arsenal Master (all weapons).
 */

import { DEBUG } from './constants.js';
import { unlockAchievement, isAchievementUnlocked } from './achievements.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Map of weapon IDs to their kill achievement IDs.
 * All 11 weapons have corresponding achievements.
 */
const WEAPON_TO_ACHIEVEMENT = {
    'basic-shot': null, // Basic shot doesn't have a kill achievement
    'missile': 'missile_command',
    'big-shot': 'big_game_hunter',
    'mirv': 'cluster_bomb',
    'deaths-head': 'death_dealer',
    'roller': 'roller_coaster',
    'heavy-roller': 'heavy_roller_ach',
    'digger': 'dig_dug',
    'heavy-digger': 'deep_impact',
    'mini-nuke': 'mini_meltdown',
    'nuke': 'nuclear_winter'
};

/**
 * All weapon IDs that count toward Arsenal Master.
 * Includes all weapons except basic-shot.
 */
const ARSENAL_WEAPONS = [
    'missile',
    'big-shot',
    'mirv',
    'deaths-head',
    'roller',
    'heavy-roller',
    'digger',
    'heavy-digger',
    'mini-nuke',
    'nuke'
];

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * State tracking for weapon achievements.
 */
const state = {
    /** Set of weapon IDs used during this run (for Basic Training) */
    weaponsUsedThisRun: new Set(),
    /** The weapon that last dealt damage to enemy (for kill credit) */
    lastDamagingWeapon: null,
    /** Set of weapon IDs that have gotten kills (for Arsenal Master) */
    weaponsWithKills: new Set()
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
            console.log(`[WeaponAchievements] ${message}`, data);
        } else {
            console.log(`[WeaponAchievements] ${message}`);
        }
    }
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Reset run-specific state. Call when starting a new game.
 */
export function resetRunState() {
    state.weaponsUsedThisRun.clear();
    state.lastDamagingWeapon = null;
    debugLog('Run state reset');
}

/**
 * Reset round-specific state. Call at the start of each round.
 */
export function resetRoundState() {
    state.lastDamagingWeapon = null;
    debugLog('Round state reset');
}

/**
 * Get current weapon achievement state (for debugging).
 * @returns {Object} Current state copy
 */
export function getState() {
    return {
        weaponsUsedThisRun: Array.from(state.weaponsUsedThisRun),
        lastDamagingWeapon: state.lastDamagingWeapon,
        weaponsWithKills: Array.from(state.weaponsWithKills)
    };
}

// =============================================================================
// ACHIEVEMENT DETECTION CALLBACKS
// =============================================================================

/**
 * Record when player fires a weapon.
 * Tracks weapons used this run for Basic Training detection.
 *
 * @param {string} weaponId - The weapon ID that was fired
 */
export function onWeaponFired(weaponId) {
    if (!isInitialized) return;

    state.weaponsUsedThisRun.add(weaponId);
    debugLog('Weapon fired', {
        weaponId,
        weaponsUsed: Array.from(state.weaponsUsedThisRun)
    });
}

/**
 * Record when player's weapon deals damage to enemy.
 * Tracks last damaging weapon for kill credit.
 *
 * @param {string} weaponId - The weapon ID that dealt damage
 * @param {number} damage - The damage dealt
 * @param {number} enemyHealthAfter - Enemy health after damage
 */
export function onDamageDealtToEnemy(weaponId, damage, enemyHealthAfter) {
    if (!isInitialized) return;

    state.lastDamagingWeapon = weaponId;
    debugLog('Damage dealt to enemy', {
        weaponId,
        damage,
        enemyHealthAfter,
        lastDamagingWeapon: state.lastDamagingWeapon
    });
}

/**
 * Record when enemy is destroyed.
 * Awards kill achievement for the weapon that delivered the killing blow.
 *
 * @param {Object} enemyTank - The destroyed enemy tank
 */
export function onEnemyKilled(enemyTank) {
    if (!isInitialized) return;

    const killingWeapon = state.lastDamagingWeapon;

    debugLog('Enemy killed', {
        killingWeapon,
        weaponsUsedThisRun: Array.from(state.weaponsUsedThisRun)
    });

    if (!killingWeapon) {
        debugLog('No killing weapon tracked - possibly fall damage kill');
        return;
    }

    // --- Individual Weapon Kill Achievement ---
    const achievementId = WEAPON_TO_ACHIEVEMENT[killingWeapon];
    if (achievementId && !isAchievementUnlocked(achievementId)) {
        debugLog(`Unlocking ${achievementId} achievement for ${killingWeapon} kill`);
        unlockAchievement(achievementId);
    }

    // Track this weapon has gotten a kill (for Arsenal Master)
    if (killingWeapon !== 'basic-shot') {
        state.weaponsWithKills.add(killingWeapon);
        debugLog('Weapons with kills updated', {
            weaponsWithKills: Array.from(state.weaponsWithKills),
            totalNeeded: ARSENAL_WEAPONS.length
        });

        // --- Arsenal Master Achievement ---
        // Check if player has killed with all non-basic weapons
        if (!isAchievementUnlocked('arsenal_master')) {
            const hasAllKills = ARSENAL_WEAPONS.every(w => state.weaponsWithKills.has(w));
            if (hasAllKills) {
                debugLog('Unlocking Arsenal Master achievement - all weapons used for kills!');
                unlockAchievement('arsenal_master');
            }
        }
    }
}

/**
 * Record when player wins a round.
 * Checks for Basic Training achievement (win using only basic shots).
 */
export function onRoundWon() {
    if (!isInitialized) return;

    debugLog('Round won - checking Basic Training', {
        weaponsUsed: Array.from(state.weaponsUsedThisRun)
    });

    // --- Basic Training Achievement ---
    // Win using only Basic Shots (only basic-shot in weaponsUsedThisRun)
    if (!isAchievementUnlocked('basic_training')) {
        const onlyBasicShot = state.weaponsUsedThisRun.size === 1 &&
                              state.weaponsUsedThisRun.has('basic-shot');

        if (onlyBasicShot) {
            debugLog('Unlocking Basic Training achievement - won with only basic shots!');
            unlockAchievement('basic_training');
        }
    }
}

/**
 * Handle run starting (new game).
 * Resets run-specific state.
 */
export function onRunStart() {
    if (!isInitialized) return;

    debugLog('Run started - resetting run state');
    resetRunState();
}

// =============================================================================
// PERSISTENCE - Load weapon kills from achievement state
// =============================================================================

/**
 * Load weapon kills from unlocked achievements.
 * Called during initialization to restore Arsenal Master progress.
 */
function loadWeaponKillsFromAchievements() {
    // Check each weapon's achievement to see if it's unlocked
    for (const [weaponId, achievementId] of Object.entries(WEAPON_TO_ACHIEVEMENT)) {
        if (achievementId && isAchievementUnlocked(achievementId)) {
            state.weaponsWithKills.add(weaponId);
        }
    }
    debugLog('Loaded weapon kills from achievements', {
        weaponsWithKills: Array.from(state.weaponsWithKills)
    });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the weapon achievements system.
 * Must be called once during game initialization.
 */
export function init() {
    if (isInitialized) {
        console.warn('[WeaponAchievements] Already initialized');
        return;
    }

    resetRunState();
    loadWeaponKillsFromAchievements();
    isInitialized = true;
    console.log('[WeaponAchievements] System initialized');
}
