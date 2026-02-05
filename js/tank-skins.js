/**
 * Scorched Earth: Synthwave Edition
 * Tank Skins Registry
 *
 * Defines all collectible tank skins with rarity tiers and drop rates.
 * 45+ unique tank designs ranging from common to legendary.
 */

import { DEBUG } from './constants.js';
import { GENERATED_TANK_SKINS } from './tank-skins-generated.js';

// =============================================================================
// RARITY CONFIGURATION
// =============================================================================

/**
 * Rarity tier definitions with drop rates.
 * Drop rates must sum to 100.
 */
export const RARITY = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
};

/**
 * Drop rates for each rarity tier (percentage).
 */
export const DROP_RATES = {
    [RARITY.COMMON]: 55,
    [RARITY.UNCOMMON]: 28,
    [RARITY.RARE]: 12,
    [RARITY.EPIC]: 4,
    [RARITY.LEGENDARY]: 1
};

/**
 * Rarity colors for UI display.
 */
export const RARITY_COLORS = {
    [RARITY.COMMON]: '#9CA3AF',     // Gray
    [RARITY.UNCOMMON]: '#10B981',   // Green
    [RARITY.RARE]: '#3B82F6',       // Blue
    [RARITY.EPIC]: '#8B5CF6',       // Purple
    [RARITY.LEGENDARY]: '#F59E0B'   // Gold/Orange
};

/**
 * Rarity display names.
 */
export const RARITY_NAMES = {
    [RARITY.COMMON]: 'Common',
    [RARITY.UNCOMMON]: 'Uncommon',
    [RARITY.RARE]: 'Rare',
    [RARITY.EPIC]: 'Epic',
    [RARITY.LEGENDARY]: 'Legendary'
};

/**
 * Rarity order for sorting (lowest to highest).
 */
export const RARITY_ORDER = [
    RARITY.COMMON,
    RARITY.UNCOMMON,
    RARITY.RARE,
    RARITY.EPIC,
    RARITY.LEGENDARY
];

// =============================================================================
// TANK SKIN FACTORY
// =============================================================================

/**
 * Create a tank skin definition.
 * @param {Object} config - Tank skin configuration
 * @returns {Object} Complete tank skin definition
 */
function createTankSkin({
    id,
    name,
    description,
    rarity,
    glowColor = null,
    animated = false,
    specialEffects = null
}) {
    return {
        id,
        name,
        description,
        rarity,
        assetPath: `images/tanks/tank-${rarity}-${id}.png`,
        glowColor: glowColor || RARITY_COLORS[rarity],
        animated,
        specialEffects
    };
}

// =============================================================================
// TANK SKIN DEFINITIONS
// =============================================================================

/**
 * All tank skin definitions organized by rarity.
 */

// --- COMMON TANKS (7) ---
// Standard color variations and basic military designs

const COMMON_TANKS = [
    createTankSkin({
        id: 'standard',
        name: 'Standard Issue',
        description: 'The classic tank design. Reliable and battle-proven.',
        rarity: RARITY.COMMON,
        glowColor: '#00FFFF'  // Cyan glow for player default
    }),
    createTankSkin({
        id: 'desert-camo',
        name: 'Desert Camo',
        description: 'Sand-colored camouflage for desert operations.',
        rarity: RARITY.COMMON
    }),
    createTankSkin({
        id: 'forest-camo',
        name: 'Forest Camo',
        description: 'Green woodland camouflage pattern.',
        rarity: RARITY.COMMON
    }),
    createTankSkin({
        id: 'arctic',
        name: 'Arctic',
        description: 'White and gray winter camouflage.',
        rarity: RARITY.COMMON
    }),
    createTankSkin({
        id: 'midnight',
        name: 'Midnight',
        description: 'Deep black stealth coating.',
        rarity: RARITY.COMMON
    }),
    createTankSkin({
        id: 'crimson',
        name: 'Crimson',
        description: 'Bold red paint scheme.',
        rarity: RARITY.COMMON
    }),
    createTankSkin({
        id: 'tactical-gray',
        name: 'Tactical Gray',
        description: 'Professional urban gray finish.',
        rarity: RARITY.COMMON
    })
];

// --- UNCOMMON TANKS (8) ---
// Pattern skins and themed color variations

const UNCOMMON_TANKS = [
    createTankSkin({
        id: 'neon-pink',
        name: 'Neon Pink',
        description: 'Vibrant synthwave pink with glowing accents.',
        rarity: RARITY.UNCOMMON,
        glowColor: '#FF00FF'
    }),
    createTankSkin({
        id: 'neon-cyan',
        name: 'Neon Cyan',
        description: 'Electric cyan with pulsing highlights.',
        rarity: RARITY.UNCOMMON,
        glowColor: '#00FFFF'
    }),
    createTankSkin({
        id: 'chrome',
        name: 'Chrome',
        description: 'Reflective chrome plating. Shiny and dangerous.',
        rarity: RARITY.UNCOMMON,
        glowColor: '#C0C0C0'
    }),
    createTankSkin({
        id: 'gold-plated',
        name: 'Gold Plated',
        description: 'Luxurious gold finish for the discerning commander.',
        rarity: RARITY.UNCOMMON,
        glowColor: '#FFD700'
    }),
    createTankSkin({
        id: 'zebra',
        name: 'Zebra',
        description: 'Bold black and white stripes.',
        rarity: RARITY.UNCOMMON
    }),
    createTankSkin({
        id: 'tiger',
        name: 'Tiger',
        description: 'Orange and black tiger stripe pattern.',
        rarity: RARITY.UNCOMMON,
        glowColor: '#FF8C00'
    }),
    createTankSkin({
        id: 'digital-camo',
        name: 'Digital Camo',
        description: 'Modern pixelated camouflage pattern.',
        rarity: RARITY.UNCOMMON
    }),
    createTankSkin({
        id: 'sunset-gradient',
        name: 'Sunset Gradient',
        description: 'Beautiful orange to purple sunset fade.',
        rarity: RARITY.UNCOMMON,
        glowColor: '#FF6B35'
    })
];

// --- RARE TANKS (7) ---
// Distinct designs with 80s pop culture references

const RARE_TANKS = [
    createTankSkin({
        id: 'delorean',
        name: 'DeLorean',
        description: 'Stainless steel time machine aesthetic. Great Scott!',
        rarity: RARITY.RARE,
        glowColor: '#00BFFF'
    }),
    createTankSkin({
        id: 'tron-cycle',
        name: 'Tron Cycle',
        description: 'Light cycle inspired neon lines on black.',
        rarity: RARITY.RARE,
        glowColor: '#00FFFF'
    }),
    createTankSkin({
        id: 'miami-vice',
        name: 'Miami Vice',
        description: 'Pastel pink and turquoise Miami style.',
        rarity: RARITY.RARE,
        glowColor: '#FF69B4'
    }),
    createTankSkin({
        id: 'outrun',
        name: 'Outrun',
        description: 'Cruise through the neon sunset in this synthwave classic.',
        rarity: RARITY.RARE,
        glowColor: '#FF00FF'
    }),
    createTankSkin({
        id: 'hotline',
        name: 'Hotline',
        description: 'Do you like hurting other tanks?',
        rarity: RARITY.RARE,
        glowColor: '#FF1493'
    }),
    createTankSkin({
        id: 'cobra-commander',
        name: 'Cobra Commander',
        description: 'Blue chrome with the cobra insignia.',
        rarity: RARITY.RARE,
        glowColor: '#0000FF'
    }),
    createTankSkin({
        id: 'knight-rider',
        name: 'Knight Rider',
        description: 'Black beauty with red scanner lights.',
        rarity: RARITY.RARE,
        glowColor: '#FF0000'
    })
];

// --- EPIC TANKS (6) ---
// Animated effects and special visual trails

const EPIC_TANKS = [
    createTankSkin({
        id: 'flame-rider',
        name: 'Flame Rider',
        description: 'Engulfed in animated flames. Feel the heat.',
        rarity: RARITY.EPIC,
        glowColor: '#FF4500',
        animated: true,
        specialEffects: { type: 'flames', color: '#FF4500' }
    }),
    createTankSkin({
        id: 'lightning-strike',
        name: 'Lightning Strike',
        description: 'Crackling with electric energy.',
        rarity: RARITY.EPIC,
        glowColor: '#00BFFF',
        animated: true,
        specialEffects: { type: 'lightning', color: '#00BFFF' }
    }),
    createTankSkin({
        id: 'holographic',
        name: 'Holographic',
        description: 'Shimmering rainbow hologram effect.',
        rarity: RARITY.EPIC,
        glowColor: '#FF00FF',
        animated: true,
        specialEffects: { type: 'hologram', color: '#FF00FF' }
    }),
    createTankSkin({
        id: 'ghost-protocol',
        name: 'Ghost Protocol',
        description: 'Translucent ghostly appearance.',
        rarity: RARITY.EPIC,
        glowColor: '#87CEEB',
        animated: true,
        specialEffects: { type: 'ghost', color: '#87CEEB' }
    }),
    createTankSkin({
        id: 'plasma-core',
        name: 'Plasma Core',
        description: 'Pulsating plasma energy surrounds this tank.',
        rarity: RARITY.EPIC,
        glowColor: '#9400D3',
        animated: true,
        specialEffects: { type: 'plasma', color: '#9400D3' }
    }),
    createTankSkin({
        id: 'starfield',
        name: 'Starfield',
        description: 'Contains an entire galaxy within.',
        rarity: RARITY.EPIC,
        glowColor: '#4B0082',
        animated: true,
        specialEffects: { type: 'stars', color: '#FFFFFF' }
    })
];

// --- LEGENDARY TANKS (5) ---
// Unique designs with custom explosion effects

const LEGENDARY_TANKS = [
    createTankSkin({
        id: 'blood-dragon',
        name: 'Blood Dragon',
        description: 'Ripped straight from 2007. Mark IV style.',
        rarity: RARITY.LEGENDARY,
        glowColor: '#FF0066',
        animated: true,
        specialEffects: {
            type: 'dragon',
            color: '#FF0066',
            explosionOverride: 'neon-explosion'
        }
    }),
    createTankSkin({
        id: 'terminator',
        name: 'The Terminator',
        description: 'It can\'t be bargained with. It can\'t be reasoned with.',
        rarity: RARITY.LEGENDARY,
        glowColor: '#FF0000',
        animated: true,
        specialEffects: {
            type: 'cyborg',
            color: '#FF0000',
            explosionOverride: 'chrome-explosion'
        }
    }),
    createTankSkin({
        id: 'golden-god',
        name: 'Golden God',
        description: 'A five-star tank. The chosen one.',
        rarity: RARITY.LEGENDARY,
        glowColor: '#FFD700',
        animated: true,
        specialEffects: {
            type: 'divine',
            color: '#FFD700',
            explosionOverride: 'golden-explosion'
        }
    }),
    createTankSkin({
        id: 'arcade-champion',
        name: 'Arcade Champion',
        description: 'Insert coin. Player 1 ready.',
        rarity: RARITY.LEGENDARY,
        glowColor: '#00FF00',
        animated: true,
        specialEffects: {
            type: 'pixel',
            color: '#00FF00',
            explosionOverride: 'pixel-explosion'
        }
    }),
    createTankSkin({
        id: 'synthwave-supreme',
        name: 'Synthwave Supreme',
        description: 'The ultimate synthwave aesthetic. Pure 80s perfection.',
        rarity: RARITY.LEGENDARY,
        glowColor: '#FF00FF',
        animated: true,
        specialEffects: {
            type: 'synthwave',
            color: '#FF00FF',
            explosionOverride: 'synthwave-explosion'
        }
    })
];

// =============================================================================
// TANK REGISTRY
// =============================================================================

/**
 * All tanks combined into a single array.
 */
const CURATED_TANKS = [
    ...COMMON_TANKS,
    ...UNCOMMON_TANKS,
    ...RARE_TANKS,
    ...EPIC_TANKS,
    ...LEGENDARY_TANKS
];

function normalizeGeneratedTank(rawTank) {
    if (!rawTank || typeof rawTank !== 'object') return null;
    if (typeof rawTank.id !== 'string' || !rawTank.id) return null;
    if (!RARITY_ORDER.includes(rawTank.rarity)) return null;

    return {
        id: rawTank.id,
        name: rawTank.name || rawTank.id,
        description: rawTank.description || 'Tank Forge generated skin.',
        rarity: rawTank.rarity,
        assetPath: rawTank.assetPath || `images/tanks/generated/tank-${rawTank.rarity}-${rawTank.id}.png`,
        glowColor: rawTank.glowColor || RARITY_COLORS[rawTank.rarity],
        animated: Boolean(rawTank.animated),
        specialEffects: rawTank.specialEffects || null
    };
}

function mergeCuratedAndGeneratedTanks(curatedTanks, generatedTanks) {
    const merged = new Map();

    curatedTanks.forEach((tank) => merged.set(tank.id, tank));

    if (Array.isArray(generatedTanks)) {
        generatedTanks.forEach((rawTank) => {
            const normalized = normalizeGeneratedTank(rawTank);
            if (!normalized) {
                console.warn('[TankSkins] Ignoring invalid generated tank entry:', rawTank);
                return;
            }

            merged.set(normalized.id, normalized);
        });
    }

    return Array.from(merged.values());
}

const ALL_TANKS = mergeCuratedAndGeneratedTanks(CURATED_TANKS, GENERATED_TANK_SKINS);

/**
 * Tank lookup map for O(1) access by ID.
 * @type {Map<string, Object>}
 */
const tankMap = new Map();
ALL_TANKS.forEach(tank => tankMap.set(tank.id, tank));

/**
 * Tanks grouped by rarity for filtered queries.
 * @type {Object<string, Object[]>}
 */
const tanksByRarity = {
    [RARITY.COMMON]: ALL_TANKS.filter((tank) => tank.rarity === RARITY.COMMON),
    [RARITY.UNCOMMON]: ALL_TANKS.filter((tank) => tank.rarity === RARITY.UNCOMMON),
    [RARITY.RARE]: ALL_TANKS.filter((tank) => tank.rarity === RARITY.RARE),
    [RARITY.EPIC]: ALL_TANKS.filter((tank) => tank.rarity === RARITY.EPIC),
    [RARITY.LEGENDARY]: ALL_TANKS.filter((tank) => tank.rarity === RARITY.LEGENDARY)
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get a tank skin by ID.
 * @param {string} id - Tank skin ID
 * @returns {Object|null} Tank skin definition or null if not found
 */
export function getTank(id) {
    return tankMap.get(id) || null;
}

/**
 * Get all tank skins of a specific rarity.
 * @param {string} rarity - Rarity tier (use RARITY constants)
 * @returns {Object[]} Array of tank skins
 */
export function getTanksByRarity(rarity) {
    return tanksByRarity[rarity] || [];
}

/**
 * Get all tank skins.
 * @returns {Object[]} Array of all tank skins
 */
export function getAllTanks() {
    return [...ALL_TANKS];
}

/**
 * Get the default tank skin for new players.
 * @returns {Object} Default tank skin (Standard Issue)
 */
export function getDefaultTank() {
    return getTank('standard');
}

/**
 * Get total count of tank skins.
 * @returns {number} Total number of tank skins
 */
export function getTankCount() {
    return ALL_TANKS.length;
}

/**
 * Get count of tank skins by rarity.
 * @returns {Object<string, number>} Map of rarity to count
 */
export function getTankCountByRarity() {
    return {
        [RARITY.COMMON]: tanksByRarity[RARITY.COMMON].length,
        [RARITY.UNCOMMON]: tanksByRarity[RARITY.UNCOMMON].length,
        [RARITY.RARE]: tanksByRarity[RARITY.RARE].length,
        [RARITY.EPIC]: tanksByRarity[RARITY.EPIC].length,
        [RARITY.LEGENDARY]: tanksByRarity[RARITY.LEGENDARY].length
    };
}

/**
 * Check if a tank ID exists in the registry.
 * @param {string} id - Tank skin ID
 * @returns {boolean} True if tank exists
 */
export function tankExists(id) {
    return tankMap.has(id);
}

/**
 * Get the drop rate for a specific rarity.
 * @param {string} rarity - Rarity tier
 * @returns {number} Drop rate percentage (0-100)
 */
export function getDropRate(rarity) {
    return DROP_RATES[rarity] || 0;
}

/**
 * Get display information for a rarity tier.
 * @param {string} rarity - Rarity tier
 * @returns {Object} Display info (name, color)
 */
export function getRarityInfo(rarity) {
    return {
        name: RARITY_NAMES[rarity] || 'Unknown',
        color: RARITY_COLORS[rarity] || '#FFFFFF',
        dropRate: DROP_RATES[rarity] || 0
    };
}

// =============================================================================
// DEBUG / VALIDATION
// =============================================================================

/**
 * Validate the tank registry on load.
 * Checks for duplicate IDs and correct drop rate totals.
 */
function validateRegistry() {
    // Check for duplicate IDs
    const ids = ALL_TANKS.map(t => t.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
        const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
        console.error('[TankSkins] Duplicate tank IDs found:', duplicates);
    }

    // Check drop rates sum to 100
    const totalDropRate = Object.values(DROP_RATES).reduce((sum, rate) => sum + rate, 0);
    if (totalDropRate !== 100) {
        console.error(`[TankSkins] Drop rates sum to ${totalDropRate}%, expected 100%`);
    }

    // Log registry stats
    if (DEBUG.ENABLED) {
        console.log('[TankSkins] Registry validated', {
            totalTanks: ALL_TANKS.length,
            byRarity: getTankCountByRarity(),
            dropRates: DROP_RATES
        });
    }
}

// Run validation on module load
validateRegistry();

console.log(`[TankSkins] Registry loaded with ${ALL_TANKS.length} tank skins`);
