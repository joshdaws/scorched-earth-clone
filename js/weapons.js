/**
 * Scorched Earth: Synthwave Edition
 * Weapon System - Data Structure and Registry
 *
 * Defines all weapons with their stats matching the game spec exactly.
 * Provides the WeaponRegistry for accessing weapon definitions.
 */

// =============================================================================
// WEAPON TYPES
// =============================================================================

/**
 * Weapon type categories.
 * Each type has unique projectile behavior:
 * - STANDARD: Basic explosive projectiles, explode on impact
 * - SPLITTING: Split into multiple warheads at apex (when vy becomes positive)
 * - ROLLING: Roll along terrain until hitting obstacle or tank
 * - DIGGING: Tunnel through terrain, explode on tank or after distance
 * - NUCLEAR: High damage, large blast radius, special visual effects
 */
export const WEAPON_TYPES = {
    STANDARD: 'standard',
    SPLITTING: 'splitting',
    ROLLING: 'rolling',
    DIGGING: 'digging',
    NUCLEAR: 'nuclear'
};

// =============================================================================
// WEAPON CLASS
// =============================================================================

/**
 * Weapon definition object.
 * All properties are required except special behavior properties.
 *
 * @typedef {Object} Weapon
 * @property {string} id - Unique weapon identifier (kebab-case)
 * @property {string} name - Display name for UI
 * @property {number} cost - Purchase price in dollars (0 for free weapons)
 * @property {number} ammo - Ammo received per purchase (Infinity for unlimited)
 * @property {number} damage - Maximum damage at epicenter
 * @property {number} blastRadius - Explosion radius in pixels
 * @property {string} type - Weapon type from WEAPON_TYPES
 * @property {string} [description] - Optional description for shop/tooltips
 * @property {number} [splitCount] - Number of warheads for splitting weapons
 * @property {number} [tunnelDistance] - Max tunnel distance for digging weapons
 * @property {number} [tunnelRadius] - Tunnel width for digging weapons
 * @property {boolean} [screenShake] - Whether to apply screen shake
 * @property {boolean} [screenFlash] - Whether to apply screen flash (nuclear)
 * @property {boolean} [mushroomCloud] - Whether to show mushroom cloud (nuclear)
 */

/**
 * Creates a weapon definition with required and optional properties.
 * @param {Object} config - Weapon configuration
 * @returns {Weapon} Frozen weapon object
 */
function createWeapon(config) {
    const weapon = {
        id: config.id,
        name: config.name,
        cost: config.cost,
        ammo: config.ammo,
        damage: config.damage,
        blastRadius: config.blastRadius,
        type: config.type,
        description: config.description || '',
        // Optional properties for special weapon behaviors
        splitCount: config.splitCount || 0,
        splitAngle: config.splitAngle || 30, // Spread angle for splitting weapons
        tunnelDistance: config.tunnelDistance || 0,
        tunnelRadius: config.tunnelRadius || 0,
        rollTimeout: config.rollTimeout || 0, // Timeout for rolling weapons (ms)
        // Visual effect flags
        screenShake: config.screenShake || false,
        screenFlash: config.screenFlash || false,
        mushroomCloud: config.mushroomCloud || false,
        // Projectile visual customization (for distinct weapon appearances)
        projectileColor: config.projectileColor || '#f9f002', // Default yellow
        trailColor: config.trailColor || config.projectileColor || '#f9f002'
    };

    // Freeze to prevent modification
    return Object.freeze(weapon);
}

// =============================================================================
// WEAPON DEFINITIONS
// =============================================================================

/**
 * All weapon definitions matching the game spec exactly.
 * Stats from docs/specs/game-spec.md
 */

// --- Standard Weapons ---

const BASIC_SHOT = createWeapon({
    id: 'basic-shot',
    name: 'Basic Shot',
    cost: 0,
    ammo: Infinity, // Unlimited ammo - default weapon
    damage: 25,
    blastRadius: 30,
    type: WEAPON_TYPES.STANDARD,
    description: 'Default weapon with unlimited ammo'
});

const MISSILE = createWeapon({
    id: 'missile',
    name: 'Missile',
    cost: 500,
    ammo: 5,
    damage: 35,
    blastRadius: 40,
    type: WEAPON_TYPES.STANDARD,
    description: 'Standard upgrade with increased damage'
});

const BIG_SHOT = createWeapon({
    id: 'big-shot',
    name: 'Big Shot',
    cost: 1000,
    ammo: 3,
    damage: 50,
    blastRadius: 55,
    type: WEAPON_TYPES.STANDARD,
    description: 'High damage explosive'
});

// --- Splitting Weapons ---

const MIRV = createWeapon({
    id: 'mirv',
    name: 'MIRV',
    cost: 3000,
    ammo: 2,
    damage: 20, // Per warhead
    blastRadius: 25,
    type: WEAPON_TYPES.SPLITTING,
    description: 'Splits into 5 warheads at apex',
    splitCount: 5,
    splitAngle: 30 // Total spread angle in degrees
});

const DEATHS_HEAD = createWeapon({
    id: 'deaths-head',
    name: "Death's Head",
    cost: 5000,
    ammo: 1,
    damage: 15, // Per warhead
    blastRadius: 20,
    type: WEAPON_TYPES.SPLITTING,
    description: 'Splits into 9 warheads at apex - massive area denial',
    splitCount: 9,
    splitAngle: 45, // 45° spread for maximum area coverage (wider than MIRV's 30°)
    // Distinct purple/magenta color to differentiate from MIRV's yellow
    projectileColor: '#ff00ff', // Neon magenta
    trailColor: '#cc00cc' // Slightly darker magenta for trail
});

// --- Rolling Weapons ---

const ROLLER = createWeapon({
    id: 'roller',
    name: 'Roller',
    cost: 1500,
    ammo: 3,
    damage: 30,
    blastRadius: 35,
    type: WEAPON_TYPES.ROLLING,
    description: 'Rolls down slopes after landing',
    rollTimeout: 3000 // 3 seconds timeout
});

const HEAVY_ROLLER = createWeapon({
    id: 'heavy-roller',
    name: 'Heavy Roller',
    cost: 2500,
    ammo: 2,
    damage: 45,
    blastRadius: 45,
    type: WEAPON_TYPES.ROLLING,
    description: 'Heavier roller with increased damage',
    rollTimeout: 3000
});

// --- Digging Weapons ---

const DIGGER = createWeapon({
    id: 'digger',
    name: 'Digger',
    cost: 2000,
    ammo: 3,
    damage: 25,
    blastRadius: 25,
    type: WEAPON_TYPES.DIGGING,
    description: 'Tunnels through terrain',
    tunnelDistance: 100, // Max pixels to tunnel
    tunnelRadius: 10     // Tunnel width in pixels
});

const HEAVY_DIGGER = createWeapon({
    id: 'heavy-digger',
    name: 'Heavy Digger',
    cost: 3500,
    ammo: 2,
    damage: 40,
    blastRadius: 35,
    type: WEAPON_TYPES.DIGGING,
    description: 'Deeper tunneling with more damage',
    tunnelDistance: 150,
    tunnelRadius: 15
});

// --- Nuclear Weapons ---

const MINI_NUKE = createWeapon({
    id: 'mini-nuke',
    name: 'Mini Nuke',
    cost: 4000,
    ammo: 2,
    damage: 60,
    blastRadius: 80,
    type: WEAPON_TYPES.NUCLEAR,
    description: 'Small nuclear warhead',
    screenShake: true,
    screenFlash: true
});

const NUKE = createWeapon({
    id: 'nuke',
    name: 'Nuke',
    cost: 8000,
    ammo: 1,
    damage: 100,
    blastRadius: 150,
    type: WEAPON_TYPES.NUCLEAR,
    description: 'Massive nuclear explosion',
    screenShake: true,
    screenFlash: true,
    mushroomCloud: true
});

// =============================================================================
// WEAPON REGISTRY
// =============================================================================

/**
 * Internal map of all weapons keyed by ID.
 * @type {Map<string, Weapon>}
 */
const weaponsMap = new Map([
    [BASIC_SHOT.id, BASIC_SHOT],
    [MISSILE.id, MISSILE],
    [BIG_SHOT.id, BIG_SHOT],
    [MIRV.id, MIRV],
    [DEATHS_HEAD.id, DEATHS_HEAD],
    [ROLLER.id, ROLLER],
    [HEAVY_ROLLER.id, HEAVY_ROLLER],
    [DIGGER.id, DIGGER],
    [HEAVY_DIGGER.id, HEAVY_DIGGER],
    [MINI_NUKE.id, MINI_NUKE],
    [NUKE.id, NUKE]
]);

/**
 * Weapon Registry - provides access to weapon definitions.
 */
export const WeaponRegistry = {
    /**
     * Get a weapon by its ID.
     * @param {string} id - Weapon ID (e.g., 'basic-shot', 'mirv')
     * @returns {Weapon|null} Weapon definition or null if not found
     */
    getWeapon(id) {
        return weaponsMap.get(id) || null;
    },

    /**
     * Get all weapons as an array, suitable for shop display.
     * Weapons are returned in a logical order by type and cost.
     * @returns {Weapon[]} Array of all weapon definitions
     */
    getAllWeapons() {
        return [
            BASIC_SHOT,
            MISSILE,
            BIG_SHOT,
            MIRV,
            DEATHS_HEAD,
            ROLLER,
            HEAVY_ROLLER,
            DIGGER,
            HEAVY_DIGGER,
            MINI_NUKE,
            NUKE
        ];
    },

    /**
     * Get weapons filtered by type.
     * @param {string} type - Weapon type from WEAPON_TYPES
     * @returns {Weapon[]} Array of weapons matching the type
     */
    getWeaponsByType(type) {
        return this.getAllWeapons().filter(w => w.type === type);
    },

    /**
     * Get weapons that can be purchased (cost > 0).
     * @returns {Weapon[]} Array of purchasable weapons
     */
    getPurchasableWeapons() {
        return this.getAllWeapons().filter(w => w.cost > 0);
    },

    /**
     * Check if a weapon ID is valid.
     * @param {string} id - Weapon ID to check
     * @returns {boolean} True if weapon exists
     */
    hasWeapon(id) {
        return weaponsMap.has(id);
    },

    /**
     * Get the default weapon (Basic Shot).
     * @returns {Weapon} The Basic Shot weapon
     */
    getDefaultWeapon() {
        return BASIC_SHOT;
    },

    /**
     * Get total count of all weapons.
     * @returns {number} Number of weapons in registry
     */
    getWeaponCount() {
        return weaponsMap.size;
    }
};

// =============================================================================
// NAMED EXPORTS FOR DIRECT ACCESS
// =============================================================================

// Export individual weapons for direct access if needed
export {
    BASIC_SHOT,
    MISSILE,
    BIG_SHOT,
    MIRV,
    DEATHS_HEAD,
    ROLLER,
    HEAVY_ROLLER,
    DIGGER,
    HEAVY_DIGGER,
    MINI_NUKE,
    NUKE
};

// Default export is the registry
export default WeaponRegistry;
