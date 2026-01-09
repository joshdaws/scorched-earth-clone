/**
 * Scorched Earth: Synthwave Edition
 * Damage calculation system
 *
 * Handles damage calculation based on explosion proximity with distance falloff.
 * Supports direct hit bonuses and weapon-specific damage modifiers.
 */

import { DEBUG, PROJECTILE } from './constants.js';
import * as DebugTools from './debugTools.js';

// =============================================================================
// DAMAGE CALCULATION CONSTANTS
// =============================================================================

/**
 * Damage calculation configuration.
 */
export const DAMAGE = {
    /** Distance threshold for direct hit bonus (in pixels) */
    DIRECT_HIT_DISTANCE: 5,
    /** Damage multiplier for direct hits (1.5x = 50% bonus) */
    DIRECT_HIT_MULTIPLIER: 1.5,
    /** Default blast radius for weapons without specific radius */
    DEFAULT_BLAST_RADIUS: 40,
    /** Default maximum damage at explosion center */
    DEFAULT_MAX_DAMAGE: 25
};

// =============================================================================
// DAMAGE CALCULATION
// =============================================================================

/**
 * Calculate damage to a tank based on explosion proximity.
 *
 * Uses linear falloff: damage = maxDamage * (1 - distance/blastRadius)
 * - At center (distance = 0): full damage
 * - At edge (distance = blastRadius): zero damage
 * - Beyond blast radius: zero damage
 *
 * Direct hits (distance < 5px) receive a 1.5x damage multiplier.
 *
 * @param {Object} explosion - Explosion data
 * @param {number} explosion.x - X coordinate of explosion center
 * @param {number} explosion.y - Y coordinate of explosion center
 * @param {number} [explosion.blastRadius] - Blast radius in pixels (defaults to weapon radius or DEFAULT_BLAST_RADIUS)
 * @param {import('./tank.js').Tank} tank - Tank to calculate damage for
 * @param {Object} [weapon] - Weapon data (optional, for weapon-specific damage)
 * @param {number} [weapon.damage] - Maximum damage for this weapon
 * @param {number} [weapon.blastRadius] - Blast radius for this weapon
 * @returns {number} Damage amount (0 if outside blast radius)
 */
export function calculateDamage(explosion, tank, weapon = null) {
    if (!explosion || !tank) {
        console.warn('calculateDamage: Missing explosion or tank parameter');
        return 0;
    }

    // Get tank center for distance calculation
    const tankCenter = tank.getCenter();

    // Calculate distance from explosion center to tank center
    const dx = explosion.x - tankCenter.x;
    const dy = explosion.y - tankCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Determine blast radius (weapon-specific, explosion-specific, or default)
    let blastRadius = DAMAGE.DEFAULT_BLAST_RADIUS;
    if (explosion.blastRadius !== undefined) {
        blastRadius = explosion.blastRadius;
    } else if (weapon && weapon.blastRadius !== undefined) {
        blastRadius = weapon.blastRadius;
    }

    // Determine maximum damage (weapon-specific or default)
    let maxDamage = DAMAGE.DEFAULT_MAX_DAMAGE;
    if (weapon && weapon.damage !== undefined) {
        maxDamage = weapon.damage;
    }

    // Zero damage outside blast radius
    if (distance >= blastRadius) {
        if (DEBUG.ENABLED) {
            console.log(`Damage: Tank ${tank.team} outside blast radius (distance=${distance.toFixed(1)}, radius=${blastRadius})`);
        }
        return 0;
    }

    // Calculate linear falloff: damage = maxDamage * (1 - distance/blastRadius)
    // At center: 1 - 0 = 1 (full damage)
    // At edge: 1 - 1 = 0 (no damage)
    const falloffMultiplier = 1 - (distance / blastRadius);
    let damage = maxDamage * falloffMultiplier;

    // Check for direct hit bonus (distance < 5px)
    const isDirectHit = distance < DAMAGE.DIRECT_HIT_DISTANCE;
    if (isDirectHit) {
        damage *= DAMAGE.DIRECT_HIT_MULTIPLIER;
    }

    // Round to integer for cleaner damage values
    damage = Math.round(damage);

    // Debug logging
    if (DEBUG.ENABLED) {
        const hitType = isDirectHit ? 'DIRECT HIT' : 'hit';
        console.log(
            `Damage: ${tank.team} tank ${hitType}! ` +
            `distance=${distance.toFixed(1)}px, ` +
            `falloff=${(falloffMultiplier * 100).toFixed(0)}%, ` +
            `damage=${damage}` +
            (isDirectHit ? ` (1.5x multiplier applied)` : '')
        );
    }

    return damage;
}

/**
 * Apply damage from an explosion to a tank.
 * Combines damage calculation with damage application.
 *
 * @param {Object} explosion - Explosion data (x, y, blastRadius)
 * @param {import('./tank.js').Tank} tank - Tank to damage
 * @param {Object} [weapon] - Weapon data (optional)
 * @returns {{damage: number, actualDamage: number, isDirectHit: boolean}} Damage result
 */
export function applyExplosionDamage(explosion, tank, weapon = null) {
    if (!tank || tank.isDestroyed()) {
        return { damage: 0, actualDamage: 0, isDirectHit: false };
    }

    // God mode protection: player tank takes no damage when god mode is enabled
    if (tank.team === 'player' && DebugTools.isGodModeEnabled()) {
        if (DEBUG.ENABLED) {
            console.log('[Damage] God mode: Player tank protected from damage');
        }
        return { damage: 0, actualDamage: 0, isDirectHit: false };
    }

    // Calculate damage
    const damage = calculateDamage(explosion, tank, weapon);

    if (damage <= 0) {
        return { damage: 0, actualDamage: 0, isDirectHit: false };
    }

    // Check if it's a direct hit (for return value)
    const tankCenter = tank.getCenter();
    const dx = explosion.x - tankCenter.x;
    const dy = explosion.y - tankCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const isDirectHit = distance < DAMAGE.DIRECT_HIT_DISTANCE;

    // Apply damage to tank (tank.takeDamage handles clamping and returns actual damage dealt)
    const actualDamage = tank.takeDamage(damage);

    return {
        damage: damage,
        actualDamage: actualDamage,
        isDirectHit: isDirectHit
    };
}

/**
 * Check all tanks for explosion damage and apply it.
 * Returns an array of damage results for each affected tank.
 *
 * @param {Object} explosion - Explosion data (x, y, blastRadius)
 * @param {import('./tank.js').Tank[]} tanks - Array of tanks to check
 * @param {Object} [weapon] - Weapon data (optional)
 * @returns {Array<{tank: import('./tank.js').Tank, damage: number, actualDamage: number, isDirectHit: boolean}>} Damage results
 */
export function applyExplosionToAllTanks(explosion, tanks, weapon = null) {
    const results = [];

    if (!tanks || tanks.length === 0) {
        return results;
    }

    for (const tank of tanks) {
        const result = applyExplosionDamage(explosion, tank, weapon);

        // Only include tanks that took damage
        if (result.actualDamage > 0) {
            results.push({
                tank: tank,
                damage: result.damage,
                actualDamage: result.actualDamage,
                isDirectHit: result.isDirectHit
            });
        }
    }

    return results;
}
