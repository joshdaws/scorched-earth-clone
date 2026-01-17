/**
 * Scorched Earth: Synthwave Edition
 * Weapon System - Data Structure and Registry
 *
 * Defines all 40 weapons with their stats organized into 6 categories.
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
 * - SPECIAL: Unique behaviors that don't fit other categories
 */
export const WEAPON_TYPES = {
    STANDARD: 'standard',
    SPLITTING: 'splitting',
    ROLLING: 'rolling',
    DIGGING: 'digging',
    NUCLEAR: 'nuclear',
    SPECIAL: 'special'
};

/**
 * Weapon categories for shop organization and UI display.
 */
export const WEAPON_CATEGORIES = {
    STANDARD: { id: 'standard', name: 'Standard', description: 'Basic explosive projectiles' },
    SPLITTING: { id: 'splitting', name: 'Splitting', description: 'Projectiles that split mid-flight' },
    ROLLING: { id: 'rolling', name: 'Rolling', description: 'Roll and bounce along terrain' },
    DIGGING: { id: 'digging', name: 'Digging', description: 'Tunnel through terrain' },
    NUCLEAR: { id: 'nuclear', name: 'Nuclear', description: 'High damage, massive explosions' },
    SPECIAL: { id: 'special', name: 'Special', description: 'Unique tactical weapons' }
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
 * @property {string} category - Category for shop grouping
 * @property {string} [description] - Description for shop/tooltips
 * @property {string} [unlockRequirement] - What unlocks this weapon
 * @property {number} [splitCount] - Number of warheads for splitting weapons
 * @property {number} [splitAngle] - Spread angle for splitting weapons
 * @property {number} [tunnelDistance] - Max tunnel distance for digging weapons
 * @property {number} [tunnelRadius] - Tunnel width for digging weapons
 * @property {number} [rollTimeout] - Timeout for rolling weapons (ms)
 * @property {number} [bounceCount] - Number of bounces for bouncing weapons
 * @property {boolean} [screenShake] - Whether to apply screen shake
 * @property {boolean} [screenFlash] - Whether to apply screen flash (nuclear)
 * @property {boolean} [mushroomCloud] - Whether to show mushroom cloud (nuclear)
 * @property {string} [projectileColor] - Projectile color
 * @property {string} [trailColor] - Trail color
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
        category: config.category || config.type,
        description: config.description || '',
        unlockRequirement: config.unlockRequirement || 'available', // 'available', 'round-X', 'wins-X', 'damage-X'
        // Optional properties for special weapon behaviors
        splitCount: config.splitCount || 0,
        splitAngle: config.splitAngle || 30,
        tunnelDistance: config.tunnelDistance || 0,
        tunnelRadius: config.tunnelRadius || 0,
        rollTimeout: config.rollTimeout || 0,
        bounceCount: config.bounceCount || 0,
        // Special behavior flags
        chainReaction: config.chainReaction || false,
        deployable: config.deployable || false,
        burning: config.burning || false,
        vertical: config.vertical || false,
        beam: config.beam || false,
        teleport: config.teleport || false,
        windEffect: config.windEffect || false,
        gravityWell: config.gravityWell || false,
        emp: config.emp || false,
        noTerrainDamage: config.noTerrainDamage || false,
        buriesTank: config.buriesTank || false,
        shieldBuster: config.shieldBuster || false,
        showsTrajectory: config.showsTrajectory || false,
        // Damage modifiers
        directHitMultiplier: config.directHitMultiplier || 0, // 0 means use default (1.5x), otherwise use this value
        // Visual effect flags
        screenShake: config.screenShake || false,
        screenFlash: config.screenFlash || false,
        mushroomCloud: config.mushroomCloud || false,
        // Projectile visual customization
        projectileColor: config.projectileColor || '#f9f002',
        trailColor: config.trailColor || config.projectileColor || '#f9f002'
    };

    return Object.freeze(weapon);
}

// =============================================================================
// WEAPON DEFINITIONS - STANDARD (8)
// =============================================================================

const BABY_SHOT = createWeapon({
    id: 'baby-shot',
    name: 'Baby Shot',
    cost: 0,
    ammo: Infinity,
    damage: 15,
    blastRadius: 20,
    type: WEAPON_TYPES.STANDARD,
    category: 'standard',
    description: 'Tiny projectile with minimal damage. Good for precision hits.',
    unlockRequirement: 'available',
    projectileColor: '#88ff88',
    trailColor: '#66cc66'
});

const BASIC_SHOT = createWeapon({
    id: 'basic-shot',
    name: 'Basic Shot',
    cost: 0,
    ammo: Infinity,
    damage: 30,
    blastRadius: 30,
    type: WEAPON_TYPES.STANDARD,
    category: 'standard',
    description: 'Default weapon with unlimited ammo. Reliable and balanced.',
    unlockRequirement: 'available'
});

const MISSILE = createWeapon({
    id: 'missile',
    name: 'Missile',
    cost: 500,
    ammo: 5,
    damage: 40,
    blastRadius: 40,
    type: WEAPON_TYPES.STANDARD,
    category: 'standard',
    description: 'Fast-moving missile with increased damage.',
    unlockRequirement: 'available',
    projectileColor: '#ff6b35',
    trailColor: '#ff4500'
});

const BIG_SHOT = createWeapon({
    id: 'big-shot',
    name: 'Big Shot',
    cost: 1000,
    ammo: 3,
    damage: 50,
    blastRadius: 55,
    type: WEAPON_TYPES.STANDARD,
    category: 'standard',
    description: 'Large explosive with high damage output.',
    unlockRequirement: 'round-2',
    projectileColor: '#ff2a6d',
    trailColor: '#cc2255'
});

const MEGA_SHOT = createWeapon({
    id: 'mega-shot',
    name: 'Mega Shot',
    cost: 2000,
    ammo: 2,
    damage: 70,
    blastRadius: 70,
    type: WEAPON_TYPES.STANDARD,
    category: 'standard',
    description: 'Very large explosive that devastates the impact zone.',
    unlockRequirement: 'round-3',
    projectileColor: '#d300c5',
    trailColor: '#aa0099',
    screenShake: true
});

const ARMOR_PIERCER = createWeapon({
    id: 'armor-piercer',
    name: 'Armor Piercer',
    cost: 1500,
    ammo: 3,
    damage: 55,
    blastRadius: 25,
    type: WEAPON_TYPES.STANDARD,
    category: 'standard',
    description: 'Concentrated blast for maximum damage. Small radius, high impact.',
    unlockRequirement: 'round-3',
    projectileColor: '#05d9e8',
    trailColor: '#03a9b8'
});

const TRACER = createWeapon({
    id: 'tracer',
    name: 'Tracer',
    cost: 300,
    ammo: 10,
    damage: 10,
    blastRadius: 15,
    type: WEAPON_TYPES.STANDARD,
    category: 'standard',
    description: 'Shows trajectory path for 3 seconds. Perfect for ranging shots.',
    unlockRequirement: 'available',
    showsTrajectory: true,
    projectileColor: '#ffffff',
    trailColor: '#cccccc'
});

const PRECISION_STRIKE = createWeapon({
    id: 'precision-strike',
    name: 'Precision Strike',
    cost: 2500,
    ammo: 2,
    damage: 45,  // Base damage - gets 2x multiplier for direct hits
    blastRadius: 20,
    type: WEAPON_TYPES.STANDARD,
    category: 'standard',
    description: 'Bonus damage for direct hits. 2x multiplier for center hits.',
    unlockRequirement: 'wins-3',
    directHitMultiplier: 2.0,  // 2x damage for direct hits (vs normal 1.5x)
    projectileColor: '#ff0000',
    trailColor: '#cc0000',
    screenShake: true
});

// =============================================================================
// WEAPON DEFINITIONS - SPLITTING (6)
// =============================================================================

const MIRV = createWeapon({
    id: 'mirv',
    name: 'MIRV',
    cost: 3000,
    ammo: 2,
    damage: 20,
    blastRadius: 25,
    type: WEAPON_TYPES.SPLITTING,
    category: 'splitting',
    description: 'Splits into 3 warheads at apex. Multiple Impact Re-entry Vehicle.',
    unlockRequirement: 'round-2',
    splitCount: 3,
    splitAngle: 25,
    projectileColor: '#f9f002',
    trailColor: '#cccc00'
});

const DEATHS_HEAD = createWeapon({
    id: 'deaths-head',
    name: "Death's Head",
    cost: 5000,
    ammo: 1,
    damage: 18,
    blastRadius: 22,
    type: WEAPON_TYPES.SPLITTING,
    category: 'splitting',
    description: 'Splits into 5 warheads at apex. Devastating area coverage.',
    unlockRequirement: 'round-4',
    splitCount: 5,
    splitAngle: 35,
    projectileColor: '#ff00ff',
    trailColor: '#cc00cc'
});

const CLUSTER_BOMB = createWeapon({
    id: 'cluster-bomb',
    name: 'Cluster Bomb',
    cost: 6500,
    ammo: 1,
    damage: 12,
    blastRadius: 18,
    type: WEAPON_TYPES.SPLITTING,
    category: 'splitting',
    description: 'Splits into 8 bomblets for maximum area saturation.',
    unlockRequirement: 'round-5',
    splitCount: 8,
    splitAngle: 50,
    projectileColor: '#ff6b35',
    trailColor: '#cc5528'
});

const CHAIN_REACTION = createWeapon({
    id: 'chain-reaction',
    name: 'Chain Reaction',
    cost: 4500,
    ammo: 1,
    damage: 25,
    blastRadius: 30,
    type: WEAPON_TYPES.SPLITTING,
    category: 'splitting',
    description: 'Each explosion spawns 2 more. Chaos multiplied.',
    unlockRequirement: 'wins-5',
    splitCount: 2,
    splitAngle: 40,
    chainReaction: true,
    projectileColor: '#00ff00',
    trailColor: '#00cc00'
});

const SCATTER_SHOT = createWeapon({
    id: 'scatter-shot',
    name: 'Scatter Shot',
    cost: 2500,
    ammo: 2,
    damage: 15,
    blastRadius: 20,
    type: WEAPON_TYPES.SPLITTING,
    category: 'splitting',
    description: 'Wide spread of 6 projectiles. Best at medium range.',
    unlockRequirement: 'round-3',
    splitCount: 6,
    splitAngle: 60,
    projectileColor: '#05d9e8',
    trailColor: '#03a9b8'
});

const FIREWORKS = createWeapon({
    id: 'fireworks',
    name: 'Fireworks',
    cost: 1500,
    ammo: 3,
    damage: 8,
    blastRadius: 15,
    type: WEAPON_TYPES.SPLITTING,
    category: 'splitting',
    description: 'Decorative but deadly. Splits into 12 small bursts.',
    unlockRequirement: 'available',
    splitCount: 12,
    splitAngle: 90,
    projectileColor: '#ff2a6d',
    trailColor: '#cc2255'
});

// =============================================================================
// WEAPON DEFINITIONS - ROLLING (6)
// =============================================================================

const ROLLER = createWeapon({
    id: 'roller',
    name: 'Roller',
    cost: 1500,
    ammo: 3,
    damage: 30,
    blastRadius: 35,
    type: WEAPON_TYPES.ROLLING,
    category: 'rolling',
    description: 'Rolls down slopes after landing. Perfect for valley targets.',
    unlockRequirement: 'available',
    rollTimeout: 3000,
    projectileColor: '#888888',
    trailColor: '#666666'
});

const HEAVY_ROLLER = createWeapon({
    id: 'heavy-roller',
    name: 'Heavy Roller',
    cost: 2500,
    ammo: 2,
    damage: 45,
    blastRadius: 45,
    type: WEAPON_TYPES.ROLLING,
    category: 'rolling',
    description: 'Heavier roller with increased damage. Momentum builds.',
    unlockRequirement: 'round-3',
    rollTimeout: 4000,
    projectileColor: '#555555',
    trailColor: '#333333'
});

const BOUNCER = createWeapon({
    id: 'bouncer',
    name: 'Bouncer',
    cost: 2000,
    ammo: 3,
    damage: 25,
    blastRadius: 30,
    type: WEAPON_TYPES.ROLLING,
    category: 'rolling',
    description: 'Bounces 3 times before exploding. Unpredictable trajectories.',
    unlockRequirement: 'round-2',
    bounceCount: 3,
    rollTimeout: 4000,
    projectileColor: '#ff9900',
    trailColor: '#cc7700'
});

const SUPER_BOUNCER = createWeapon({
    id: 'super-bouncer',
    name: 'Super Bouncer',
    cost: 3500,
    ammo: 2,
    damage: 35,
    blastRadius: 35,
    type: WEAPON_TYPES.ROLLING,
    category: 'rolling',
    description: 'Bounces 6 times. Maximum chaos and area coverage.',
    unlockRequirement: 'round-4',
    bounceCount: 6,
    rollTimeout: 5000,
    projectileColor: '#ffcc00',
    trailColor: '#cc9900'
});

const LAND_MINE = createWeapon({
    id: 'land-mine',
    name: 'Land Mine',
    cost: 1800,
    ammo: 3,
    damage: 50,
    blastRadius: 40,
    type: WEAPON_TYPES.ROLLING,
    category: 'rolling',
    description: 'Deploys on impact and waits. Explodes when enemy passes or after 10s.',
    unlockRequirement: 'round-3',
    deployable: true,
    rollTimeout: 10000,
    projectileColor: '#ff0000',
    trailColor: '#880000'
});

const STICKY_BOMB = createWeapon({
    id: 'sticky-bomb',
    name: 'Sticky Bomb',
    cost: 2200,
    ammo: 2,
    damage: 40,
    blastRadius: 35,
    type: WEAPON_TYPES.ROLLING,
    category: 'rolling',
    description: 'Attaches to terrain then explodes after 2 seconds.',
    unlockRequirement: 'round-2',
    deployable: true,
    rollTimeout: 2000,
    projectileColor: '#00ff88',
    trailColor: '#00cc66'
});

// =============================================================================
// WEAPON DEFINITIONS - DIGGING (6)
// =============================================================================

const DIGGER = createWeapon({
    id: 'digger',
    name: 'Digger',
    cost: 2000,
    ammo: 3,
    damage: 25,
    blastRadius: 25,
    type: WEAPON_TYPES.DIGGING,
    category: 'digging',
    description: 'Tunnels through terrain. Bypasses surface obstacles.',
    unlockRequirement: 'round-2',
    tunnelDistance: 100,
    tunnelRadius: 10,
    projectileColor: '#8b4513',
    trailColor: '#654321'
});

const HEAVY_DIGGER = createWeapon({
    id: 'heavy-digger',
    name: 'Heavy Digger',
    cost: 3500,
    ammo: 2,
    damage: 40,
    blastRadius: 35,
    type: WEAPON_TYPES.DIGGING,
    category: 'digging',
    description: 'Wider tunnel, more damage. Industrial-grade excavation.',
    unlockRequirement: 'round-3',
    tunnelDistance: 150,
    tunnelRadius: 15,
    projectileColor: '#a0522d',
    trailColor: '#8b4513'
});

const SANDHOG = createWeapon({
    id: 'sandhog',
    name: 'Sandhog',
    cost: 4000,
    ammo: 2,
    damage: 30,
    blastRadius: 30,
    type: WEAPON_TYPES.DIGGING,
    category: 'digging',
    description: 'Long tunnel that bypasses shields. Named after tunnel workers.',
    unlockRequirement: 'round-4',
    tunnelDistance: 250,
    tunnelRadius: 12,
    shieldBuster: true,
    projectileColor: '#daa520',
    trailColor: '#b8860b'
});

const DRILL = createWeapon({
    id: 'drill',
    name: 'Drill',
    cost: 2800,
    ammo: 3,
    damage: 35,
    blastRadius: 28,
    type: WEAPON_TYPES.DIGGING,
    category: 'digging',
    description: 'Fast, straight tunnel. Reaches target quickly.',
    unlockRequirement: 'round-3',
    tunnelDistance: 180,
    tunnelRadius: 8,
    projectileColor: '#c0c0c0',
    trailColor: '#a0a0a0'
});

const LASER_DRILL = createWeapon({
    id: 'laser-drill',
    name: 'Laser Drill',
    cost: 5000,
    ammo: 1,
    damage: 45,
    blastRadius: 40,
    type: WEAPON_TYPES.DIGGING,
    category: 'digging',
    description: 'Wide beam that carves massive tunnels through anything.',
    unlockRequirement: 'wins-4',
    tunnelDistance: 200,
    tunnelRadius: 25,
    beam: true,
    projectileColor: '#ff0000',
    trailColor: '#cc0000',
    screenShake: true
});

const TUNNEL_MAKER = createWeapon({
    id: 'tunnel-maker',
    name: 'Tunnel Maker',
    cost: 3200,
    ammo: 2,
    damage: 20,
    blastRadius: 22,
    type: WEAPON_TYPES.DIGGING,
    category: 'digging',
    description: 'Creates passable tunnels for future shots. Strategic excavation.',
    unlockRequirement: 'round-4',
    tunnelDistance: 300,
    tunnelRadius: 18,
    projectileColor: '#4169e1',
    trailColor: '#3155b0'
});

// =============================================================================
// WEAPON DEFINITIONS - NUCLEAR (6)
// =============================================================================

const MINI_NUKE = createWeapon({
    id: 'mini-nuke',
    name: 'Mini Nuke',
    cost: 4000,
    ammo: 2,
    damage: 60,
    blastRadius: 80,
    type: WEAPON_TYPES.NUCLEAR,
    category: 'nuclear',
    description: 'Small nuclear warhead. Big results in a compact package.',
    unlockRequirement: 'round-3',
    screenShake: true,
    screenFlash: true,
    projectileColor: '#ffff00',
    trailColor: '#cccc00'
});

const NUKE = createWeapon({
    id: 'nuke',
    name: 'Nuke',
    cost: 8000,
    ammo: 1,
    damage: 100,
    blastRadius: 150,
    type: WEAPON_TYPES.NUCLEAR,
    category: 'nuclear',
    description: 'Massive nuclear explosion. Reshapes the entire battlefield.',
    unlockRequirement: 'round-5',
    screenShake: true,
    screenFlash: true,
    mushroomCloud: true,
    projectileColor: '#ff6600',
    trailColor: '#cc5200'
});

const TACTICAL_NUKE = createWeapon({
    id: 'tactical-nuke',
    name: 'Tactical Nuke',
    cost: 12000,
    ammo: 1,
    damage: 120,
    blastRadius: 180,
    type: WEAPON_TYPES.NUCLEAR,
    category: 'nuclear',
    description: 'Large nuke with lingering radiation effect. Maximum devastation.',
    unlockRequirement: 'wins-8',
    screenShake: true,
    screenFlash: true,
    mushroomCloud: true,
    burning: true,
    projectileColor: '#ff0000',
    trailColor: '#cc0000'
});

const NEUTRON_BOMB = createWeapon({
    id: 'neutron-bomb',
    name: 'Neutron Bomb',
    cost: 7000,
    ammo: 1,
    damage: 90,
    blastRadius: 100,
    type: WEAPON_TYPES.NUCLEAR,
    category: 'nuclear',
    description: 'High damage but no terrain destruction. Clean kills only.',
    unlockRequirement: 'round-5',
    noTerrainDamage: true,
    screenShake: true,
    screenFlash: true,
    projectileColor: '#00ffff',
    trailColor: '#00cccc'
});

const EMP_BLAST = createWeapon({
    id: 'emp-blast',
    name: 'EMP Blast',
    cost: 5500,
    ammo: 1,
    damage: 40,
    blastRadius: 120,
    type: WEAPON_TYPES.NUCLEAR,
    category: 'nuclear',
    description: 'Disables enemy weapons for 2 turns. Electronic warfare.',
    unlockRequirement: 'round-4',
    emp: true,
    noTerrainDamage: true,
    screenShake: true,
    screenFlash: true,
    projectileColor: '#0088ff',
    trailColor: '#0066cc'
});

const FUSION_STRIKE = createWeapon({
    id: 'fusion-strike',
    name: 'Fusion Strike',
    cost: 15000,
    ammo: 1,
    damage: 150,
    blastRadius: 200,
    type: WEAPON_TYPES.NUCLEAR,
    category: 'nuclear',
    description: 'Maximum destruction. The ultimate weapon of annihilation.',
    unlockRequirement: 'wins-10',
    screenShake: true,
    screenFlash: true,
    mushroomCloud: true,
    projectileColor: '#ffffff',
    trailColor: '#ffff00'
});

// =============================================================================
// WEAPON DEFINITIONS - SPECIAL (8)
// =============================================================================

const NAPALM = createWeapon({
    id: 'napalm',
    name: 'Napalm',
    cost: 3500,
    ammo: 2,
    damage: 25,
    blastRadius: 50,
    type: WEAPON_TYPES.SPECIAL,
    category: 'special',
    description: 'Burning damage over time. Fire spreads across the impact zone.',
    unlockRequirement: 'round-3',
    burning: true,
    projectileColor: '#ff4400',
    trailColor: '#cc3300'
});

const LIQUID_DIRT = createWeapon({
    id: 'liquid-dirt',
    name: 'Liquid Dirt',
    cost: 2800,
    ammo: 2,
    damage: 10,
    blastRadius: 40,
    type: WEAPON_TYPES.SPECIAL,
    category: 'special',
    description: 'Buries the enemy under terrain. Entombment weapon.',
    unlockRequirement: 'round-3',
    buriesTank: true,
    projectileColor: '#8b4513',
    trailColor: '#654321'
});

const TELEPORTER = createWeapon({
    id: 'teleporter',
    name: 'Teleporter',
    cost: 4000,
    ammo: 1,
    damage: 0,
    blastRadius: 30,
    type: WEAPON_TYPES.SPECIAL,
    category: 'special',
    description: 'Moves your tank to the impact point. Tactical repositioning.',
    unlockRequirement: 'round-4',
    teleport: true,
    projectileColor: '#9900ff',
    trailColor: '#7700cc'
});

const SHIELD_BUSTER = createWeapon({
    id: 'shield-buster',
    name: 'Shield Buster',
    cost: 3000,
    ammo: 2,
    damage: 35,
    blastRadius: 35,
    type: WEAPON_TYPES.SPECIAL,
    category: 'special',
    description: 'Extra damage to shields. 3x damage if enemy is shielded.',
    unlockRequirement: 'round-4',
    shieldBuster: true,
    projectileColor: '#00ff00',
    trailColor: '#00cc00'
});

const WIND_BOMB = createWeapon({
    id: 'wind-bomb',
    name: 'Wind Bomb',
    cost: 2000,
    ammo: 2,
    damage: 20,
    blastRadius: 30,
    type: WEAPON_TYPES.SPECIAL,
    category: 'special',
    description: 'Changes wind direction and strength. Environmental control.',
    unlockRequirement: 'round-2',
    windEffect: true,
    projectileColor: '#87ceeb',
    trailColor: '#6ba8c7'
});

const GRAVITY_WELL = createWeapon({
    id: 'gravity-well',
    name: 'Gravity Well',
    cost: 5500,
    ammo: 1,
    damage: 30,
    blastRadius: 60,
    type: WEAPON_TYPES.SPECIAL,
    category: 'special',
    description: 'Creates gravitational pull. Pulls tanks toward center point.',
    unlockRequirement: 'wins-5',
    gravityWell: true,
    projectileColor: '#330066',
    trailColor: '#220044'
});

const LIGHTNING_STRIKE = createWeapon({
    id: 'lightning-strike',
    name: 'Lightning Strike',
    cost: 4500,
    ammo: 2,
    damage: 55,
    blastRadius: 25,
    type: WEAPON_TYPES.SPECIAL,
    category: 'special',
    description: 'Vertical strike from the sky. Ignores terrain obstacles.',
    unlockRequirement: 'round-4',
    vertical: true,
    screenFlash: true,
    projectileColor: '#00ffff',
    trailColor: '#00cccc'
});

const ION_CANNON = createWeapon({
    id: 'ion-cannon',
    name: 'Ion Cannon',
    cost: 6000,
    ammo: 1,
    damage: 70,
    blastRadius: 35,
    type: WEAPON_TYPES.SPECIAL,
    category: 'special',
    description: 'Orbital beam weapon. Devastating precision from above.',
    unlockRequirement: 'wins-6',
    vertical: true,
    beam: true,
    screenFlash: true,
    screenShake: true,
    projectileColor: '#ff00ff',
    trailColor: '#cc00cc'
});

// =============================================================================
// WEAPON REGISTRY
// =============================================================================

/**
 * All weapons organized by category for easy iteration.
 */
const ALL_WEAPONS = {
    standard: [BABY_SHOT, BASIC_SHOT, MISSILE, BIG_SHOT, MEGA_SHOT, ARMOR_PIERCER, TRACER, PRECISION_STRIKE],
    splitting: [MIRV, DEATHS_HEAD, CLUSTER_BOMB, CHAIN_REACTION, SCATTER_SHOT, FIREWORKS],
    rolling: [ROLLER, HEAVY_ROLLER, BOUNCER, SUPER_BOUNCER, LAND_MINE, STICKY_BOMB],
    digging: [DIGGER, HEAVY_DIGGER, SANDHOG, DRILL, LASER_DRILL, TUNNEL_MAKER],
    nuclear: [MINI_NUKE, NUKE, TACTICAL_NUKE, NEUTRON_BOMB, EMP_BLAST, FUSION_STRIKE],
    special: [NAPALM, LIQUID_DIRT, TELEPORTER, SHIELD_BUSTER, WIND_BOMB, GRAVITY_WELL, LIGHTNING_STRIKE, ION_CANNON]
};

/**
 * Internal map of all weapons keyed by ID.
 * @type {Map<string, Weapon>}
 */
const weaponsMap = new Map();

// Populate weaponsMap from ALL_WEAPONS
Object.values(ALL_WEAPONS).forEach(categoryWeapons => {
    categoryWeapons.forEach(weapon => {
        weaponsMap.set(weapon.id, weapon);
    });
});

/**
 * Get a flat array of all weapons.
 * @returns {Weapon[]}
 */
function getAllWeaponsFlat() {
    return Object.values(ALL_WEAPONS).flat();
}

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
     * Weapons are returned in category order: standard, splitting, rolling, digging, nuclear, special.
     * @returns {Weapon[]} Array of all weapon definitions
     */
    getAllWeapons() {
        return getAllWeaponsFlat();
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
     * Get weapons by category name.
     * @param {string} category - Category name (standard, splitting, rolling, digging, nuclear, special)
     * @returns {Weapon[]} Array of weapons in that category
     */
    getWeaponsByCategory(category) {
        return ALL_WEAPONS[category] || [];
    },

    /**
     * Get all category names.
     * @returns {string[]} Array of category names
     */
    getCategories() {
        return Object.keys(ALL_WEAPONS);
    },

    /**
     * Get category info.
     * @param {string} category - Category name
     * @returns {Object} Category info object with id, name, description
     */
    getCategoryInfo(category) {
        return WEAPON_CATEGORIES[category.toUpperCase()] || null;
    },

    /**
     * Get weapons that can be purchased (cost > 0).
     * @returns {Weapon[]} Array of purchasable weapons
     */
    getPurchasableWeapons() {
        return this.getAllWeapons().filter(w => w.cost > 0);
    },

    /**
     * Get weapons available at a specific round.
     * @param {number} round - Current round number
     * @param {number} wins - Total wins accumulated
     * @returns {Weapon[]} Array of unlocked weapons
     */
    getUnlockedWeapons(round = 1, wins = 0) {
        return this.getAllWeapons().filter(weapon => {
            const req = weapon.unlockRequirement;
            if (req === 'available') return true;
            if (req.startsWith('round-')) {
                const requiredRound = parseInt(req.split('-')[1], 10);
                return round >= requiredRound;
            }
            if (req.startsWith('wins-')) {
                const requiredWins = parseInt(req.split('-')[1], 10);
                return wins >= requiredWins;
            }
            return true;
        });
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

// Standard weapons
export {
    BABY_SHOT,
    BASIC_SHOT,
    MISSILE,
    BIG_SHOT,
    MEGA_SHOT,
    ARMOR_PIERCER,
    TRACER,
    PRECISION_STRIKE
};

// Splitting weapons
export {
    MIRV,
    DEATHS_HEAD,
    CLUSTER_BOMB,
    CHAIN_REACTION,
    SCATTER_SHOT,
    FIREWORKS
};

// Rolling weapons
export {
    ROLLER,
    HEAVY_ROLLER,
    BOUNCER,
    SUPER_BOUNCER,
    LAND_MINE,
    STICKY_BOMB
};

// Digging weapons
export {
    DIGGER,
    HEAVY_DIGGER,
    SANDHOG,
    DRILL,
    LASER_DRILL,
    TUNNEL_MAKER
};

// Nuclear weapons
export {
    MINI_NUKE,
    NUKE,
    TACTICAL_NUKE,
    NEUTRON_BOMB,
    EMP_BLAST,
    FUSION_STRIKE
};

// Special weapons
export {
    NAPALM,
    LIQUID_DIRT,
    TELEPORTER,
    SHIELD_BUSTER,
    WIND_BOMB,
    GRAVITY_WELL,
    LIGHTNING_STRIKE,
    ION_CANNON
};

// Default export is the registry
export default WeaponRegistry;
