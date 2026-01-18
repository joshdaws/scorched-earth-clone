/**
 * Scorched Earth: Synthwave Edition
 * Level Registry - 60 levels across 6 worlds
 *
 * World Themes:
 * - World 1: Neon Wasteland (Tutorial + Easy)
 * - World 2: Cyber City (Medium)
 * - World 3: Retro Ridge (Medium-Hard)
 * - World 4: Digital Desert (Hard, wind mechanics)
 * - World 5: Pixel Paradise (Very Hard)
 * - World 6: Synthwave Summit (Expert)
 */

import { AI_DIFFICULTY } from './ai.js';

// =============================================================================
// LEVEL CONSTANTS
// =============================================================================

export const LEVEL_CONSTANTS = {
    WORLDS: 6,
    LEVELS_PER_WORLD: 10,
    TOTAL_LEVELS: 60,
    MAX_STARS_PER_LEVEL: 3,
    MAX_STARS_TOTAL: 180,

    // Star thresholds for unlocking worlds
    STAR_THRESHOLDS: {
        1: 0,    // World 1 - unlocked by default
        2: 15,   // World 2 - requires 15 stars
        3: 35,   // World 3 - requires 35 stars
        4: 60,   // World 4 - requires 60 stars
        5: 90,   // World 5 - requires 90 stars
        6: 125   // World 6 - requires 125 stars
    }
};

// =============================================================================
// WORLD THEMES
// =============================================================================

export const WORLD_THEMES = {
    1: {
        id: 1,
        name: 'Neon Wasteland',
        description: 'Learn the basics in the glowing wasteland',
        difficulty: 'tutorial-easy',
        primaryColor: '#ff2a6d',    // Neon pink
        secondaryColor: '#05d9e8',  // Cyan
        icon: 'wasteland'
    },
    2: {
        id: 2,
        name: 'Cyber City',
        description: 'Urban combat amid the skyscrapers',
        difficulty: 'medium',
        primaryColor: '#05d9e8',    // Cyan
        secondaryColor: '#d300c5',  // Purple
        icon: 'city'
    },
    3: {
        id: 3,
        name: 'Retro Ridge',
        description: 'Mountain warfare with tricky terrain',
        difficulty: 'medium-hard',
        primaryColor: '#d300c5',    // Purple
        secondaryColor: '#ff6b35',  // Orange
        icon: 'mountain'
    },
    4: {
        id: 4,
        name: 'Digital Desert',
        description: 'Master the wind in the silicon sands',
        difficulty: 'hard',
        primaryColor: '#ff6b35',    // Orange
        secondaryColor: '#f9f002',  // Yellow
        icon: 'desert'
    },
    5: {
        id: 5,
        name: 'Pixel Paradise',
        description: 'Precision shots in paradise',
        difficulty: 'very-hard',
        primaryColor: '#f9f002',    // Yellow
        secondaryColor: '#05d9e8',  // Cyan
        icon: 'paradise'
    },
    6: {
        id: 6,
        name: 'Synthwave Summit',
        description: 'The ultimate test atop the peak',
        difficulty: 'expert',
        primaryColor: '#ff2a6d',    // Pink
        secondaryColor: '#05d9e8',  // Cyan
        icon: 'summit'
    }
};

// =============================================================================
// TERRAIN STYLES
// =============================================================================

const TERRAIN_STYLES = {
    gentle: { roughness: 0.3, variation: 0.2 },
    hills: { roughness: 0.5, variation: 0.4 },
    valleys: { roughness: 0.6, variation: 0.5 },
    mountains: { roughness: 0.7, variation: 0.6 },
    jagged: { roughness: 0.8, variation: 0.7 },
    extreme: { roughness: 0.9, variation: 0.8 },
    // City terrain: moderate roughness creates flat plateaus (building tops)
    // with steep transitions (building walls) between them
    city: { roughness: 0.45, variation: 0.55 },
    // Dunes terrain: smooth, flowing curves like desert sand dunes
    // Lower roughness for gentle rolling hills, moderate variation for wave-like patterns
    dunes: { roughness: 0.4, variation: 0.35 }
};

// =============================================================================
// LEVEL DEFINITIONS
// =============================================================================

/**
 * Creates a level ID from world and level numbers.
 * @param {number} world - World number (1-6)
 * @param {number} level - Level number (1-10)
 * @returns {string} Level ID in format 'world{w}-level{l}'
 */
function levelId(world, level) {
    return `world${world}-level${level}`;
}

// -----------------------------------------------------------------------------
// WORLD 1: NEON WASTELAND (Tutorial + Easy)
// Teaching the basics, low wind, forgiving terrain
// -----------------------------------------------------------------------------

const WORLD_1_LEVELS = [
    {
        id: levelId(1, 1),
        world: 1,
        level: 1,
        name: 'First Shot',
        description: 'Learn the basics of aiming and firing',
        focus: 'Basic firing mechanics',
        difficulty: 'tutorial',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 80,
        playerHealth: 100,
        wind: { min: 0, max: 0 },  // No wind for first tutorial
        terrain: { style: 'gentle', minHeight: 200, maxHeight: 300 },
        star2Damage: 50,
        star3Accuracy: 0.4,
        star3MaxTurns: 12,
        tutorialTips: ['angle', 'power', 'fire'],
        rewards: { coins: 100, firstClear: 50 }
    },
    {
        id: levelId(1, 2),
        world: 1,
        level: 2,
        name: 'Finding Range',
        description: 'Learn how power affects distance',
        focus: 'Power scaling for distance',
        difficulty: 'tutorial',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 85,
        playerHealth: 100,
        wind: { min: 0, max: 0 },  // Still no wind
        terrain: { style: 'gentle', minHeight: 200, maxHeight: 320 },
        star2Damage: 55,
        star3Accuracy: 0.45,
        star3MaxTurns: 11,
        tutorialTips: ['power-scaling'],
        rewards: { coins: 110, firstClear: 55 }
    },
    {
        id: levelId(1, 3),
        world: 1,
        level: 3,
        name: 'Uphill Battle',
        description: 'Hit targets above your position',
        focus: 'Angle adjustment for elevation',
        difficulty: 'tutorial',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 90,
        playerHealth: 100,
        wind: { min: 0, max: 0 },
        terrain: { style: 'gentle', minHeight: 180, maxHeight: 380 },
        star2Damage: 60,
        star3Accuracy: 0.45,
        star3MaxTurns: 10,
        tutorialTips: ['angle-elevation'],
        rewards: { coins: 120, firstClear: 60 }
    },
    {
        id: levelId(1, 4),
        world: 1,
        level: 4,
        name: 'Downhill Strike',
        description: 'Hit targets below your position',
        focus: 'Trajectory for lower targets',
        difficulty: 'tutorial',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 90,
        playerHealth: 100,
        wind: { min: 0, max: 0 },
        terrain: { style: 'gentle', minHeight: 150, maxHeight: 400 },
        star2Damage: 60,
        star3Accuracy: 0.5,
        star3MaxTurns: 10,
        tutorialTips: ['trajectory'],
        rewards: { coins: 130, firstClear: 65 }
    },
    {
        id: levelId(1, 5),
        world: 1,
        level: 5,
        name: 'Gentle Breeze',
        description: 'Wind enters the battlefield',
        focus: 'Wind compensation basics',
        difficulty: 'tutorial',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 95,
        playerHealth: 100,
        wind: { min: -2, max: 2 },  // First introduction of wind
        terrain: { style: 'gentle', minHeight: 170, maxHeight: 380 },
        star2Damage: 65,
        star3Accuracy: 0.5,
        star3MaxTurns: 10,
        tutorialTips: ['wind'],
        rewards: { coins: 140, firstClear: 70 }
    },
    {
        id: levelId(1, 6),
        world: 1,
        level: 6,
        name: 'Weapon Select',
        description: 'Choose the right tool for the job',
        focus: 'Weapon switching introduction',
        difficulty: 'easy',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 100,
        playerHealth: 100,
        wind: { min: -2, max: 2 },
        terrain: { style: 'gentle', minHeight: 160, maxHeight: 400 },
        star2Damage: 70,
        star3Accuracy: 0.5,
        star3MaxTurns: 9,
        tutorialTips: ['weapons', 'shop-preview'],
        rewards: { coins: 150, firstClear: 75 }
    },
    {
        id: levelId(1, 7),
        world: 1,
        level: 7,
        name: 'Direct Hit',
        description: 'Accuracy matters for the best rewards',
        focus: 'Star criteria and scoring',
        difficulty: 'easy',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 100,
        playerHealth: 100,
        wind: { min: -2, max: 2 },
        terrain: { style: 'gentle', minHeight: 150, maxHeight: 400 },
        star2Damage: 75,
        star3Accuracy: 0.55,
        star3MaxTurns: 8,
        tutorialTips: ['star-criteria'],
        rewards: { coins: 160, firstClear: 80 }
    },
    {
        id: levelId(1, 8),
        world: 1,
        level: 8,
        name: 'Terrain Trouble',
        description: 'Use destruction strategically',
        focus: 'Crater strategy and terrain destruction',
        difficulty: 'easy',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 100,
        playerHealth: 100,
        wind: { min: -2, max: 2 },
        terrain: { style: 'hills', minHeight: 140, maxHeight: 420 },
        star2Damage: 75,
        star3Accuracy: 0.55,
        star3MaxTurns: 8,
        tutorialTips: ['terrain-destruction'],
        rewards: { coins: 170, firstClear: 85 }
    },
    {
        id: levelId(1, 9),
        world: 1,
        level: 9,
        name: 'Full Power',
        description: 'Maximum power for maximum arc',
        focus: 'High arc power shots',
        difficulty: 'easy',
        aiDifficulty: AI_DIFFICULTY.EASY,
        enemyHealth: 100,
        playerHealth: 100,
        wind: { min: -2, max: 2 },
        terrain: { style: 'hills', minHeight: 130, maxHeight: 440 },
        star2Damage: 80,
        star3Accuracy: 0.55,
        star3MaxTurns: 8,
        tutorialTips: ['high-arc'],
        rewards: { coins: 180, firstClear: 90 }
    },
    {
        id: levelId(1, 10),
        world: 1,
        level: 10,
        name: 'World Clear',
        description: 'Prove your skills in the final test',
        focus: 'Combined skills challenge',
        difficulty: 'easy-boss',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 120,
        playerHealth: 100,
        wind: { min: -2, max: 2 },  // Keep wind minimal for world 1
        terrain: { style: 'hills', minHeight: 120, maxHeight: 450 },
        star2Damage: 90,
        star3Accuracy: 0.6,
        star3MaxTurns: 10,
        tutorialTips: null,  // No tutorial for final test
        rewards: { coins: 250, firstClear: 125 }
    }
];

// -----------------------------------------------------------------------------
// WORLD 2: CYBER CITY (Medium)
// More challenging terrain, moderate wind
// -----------------------------------------------------------------------------

const WORLD_2_LEVELS = [
    {
        id: levelId(2, 1),
        world: 2,
        level: 1,
        name: 'City Limits',
        description: 'Enter the neon-lit outskirts of Cyber City',
        focus: 'Introduction to urban terrain with building-like structures',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 100,
        playerHealth: 100,
        wind: { min: -2, max: 2 },  // Gentle introduction to city wind
        terrain: { style: 'city', minHeight: 150, maxHeight: 400 },
        star2Damage: 70,
        star3Accuracy: 0.55,
        star3MaxTurns: 10,
        tutorialTips: null,
        rewards: { coins: 200, firstClear: 100 }
    },
    {
        id: levelId(2, 2),
        world: 2,
        level: 2,
        name: 'Neon District',
        description: 'Navigate the glowing streets below the towers',
        focus: 'Shooting over tall structures',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 100,
        playerHealth: 100,
        wind: { min: -3, max: 3 },
        terrain: { style: 'city', minHeight: 140, maxHeight: 420 },
        star2Damage: 75,
        star3Accuracy: 0.55,
        star3MaxTurns: 9,
        tutorialTips: null,
        rewards: { coins: 210, firstClear: 105 }
    },
    {
        id: levelId(2, 3),
        world: 2,
        level: 3,
        name: 'Rooftop Rumble',
        description: 'Battle across the skyline rooftops',
        focus: 'Fighting from elevated positions',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 105,
        playerHealth: 100,
        wind: { min: -3, max: 3 },
        terrain: { style: 'city', minHeight: 180, maxHeight: 450 },
        star2Damage: 75,
        star3Accuracy: 0.56,
        star3MaxTurns: 9,
        tutorialTips: null,
        rewards: { coins: 220, firstClear: 110 }
    },
    {
        id: levelId(2, 4),
        world: 2,
        level: 4,
        name: 'Street Level',
        description: 'Fight from the deep urban canyons',
        focus: 'Lobbing shots over buildings from street level',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 105,
        playerHealth: 100,
        wind: { min: -3, max: 3 },
        terrain: { style: 'city', minHeight: 100, maxHeight: 450 },
        star2Damage: 80,
        star3Accuracy: 0.57,
        star3MaxTurns: 9,
        tutorialTips: null,
        rewards: { coins: 230, firstClear: 115 }
    },
    {
        id: levelId(2, 5),
        world: 2,
        level: 5,
        name: 'Skyscraper Siege',
        description: 'The tallest towers demand precision strikes',
        focus: 'Extreme elevation differences',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 110,
        playerHealth: 100,
        wind: { min: -4, max: 4 },
        terrain: { style: 'city', minHeight: 100, maxHeight: 480 },
        star2Damage: 80,
        star3Accuracy: 0.58,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 240, firstClear: 120 }
    },
    {
        id: levelId(2, 6),
        world: 2,
        level: 6,
        name: 'Tower Defense',
        description: 'Enemy has the high ground advantage',
        focus: 'Attacking protected elevated positions',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 110,
        playerHealth: 100,
        wind: { min: -4, max: 4 },
        terrain: { style: 'city', minHeight: 120, maxHeight: 490 },
        star2Damage: 85,
        star3Accuracy: 0.58,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 250, firstClear: 125 }
    },
    {
        id: levelId(2, 7),
        world: 2,
        level: 7,
        name: 'Grid Block',
        description: 'Complex city block with multiple structures',
        focus: 'Navigating complex terrain with wind',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 115,
        playerHealth: 100,
        wind: { min: -4, max: 4 },
        terrain: { style: 'city', minHeight: 110, maxHeight: 500 },
        star2Damage: 85,
        star3Accuracy: 0.59,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 260, firstClear: 130 }
    },
    {
        id: levelId(2, 8),
        world: 2,
        level: 8,
        name: 'Cyber Streets',
        description: 'Wind howls through the urban canyons',
        focus: 'Moderate wind in urban environment',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 115,
        playerHealth: 100,
        wind: { min: -4, max: 4 },
        terrain: { style: 'city', minHeight: 100, maxHeight: 510 },
        star2Damage: 90,
        star3Accuracy: 0.60,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 270, firstClear: 135 }
    },
    {
        id: levelId(2, 9),
        world: 2,
        level: 9,
        name: 'Firewall Breach',
        description: 'Breach the defenses of the inner city',
        focus: 'Challenging urban combat preparation for boss',
        difficulty: 'medium',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 120,
        playerHealth: 100,
        wind: { min: -4, max: 4 },
        terrain: { style: 'city', minHeight: 100, maxHeight: 520 },
        star2Damage: 90,
        star3Accuracy: 0.60,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 280, firstClear: 140 }
    },
    {
        id: levelId(2, 10),
        world: 2,
        level: 10,
        name: 'Mainframe Meltdown',
        description: 'Destroy the core system at city center',
        focus: 'World 2 boss battle with full urban challenge',
        difficulty: 'medium-boss',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 130,
        playerHealth: 100,
        wind: { min: -4, max: 4 },
        terrain: { style: 'city', minHeight: 100, maxHeight: 530 },
        star2Damage: 100,
        star3Accuracy: 0.62,
        star3MaxTurns: 10,
        tutorialTips: null,
        rewards: { coins: 350, firstClear: 175 }
    }
];

// -----------------------------------------------------------------------------
// WORLD 3: RETRO RIDGE (Medium-Hard)
// Mountain terrain, variable wind
// -----------------------------------------------------------------------------

const WORLD_3_LEVELS = [
    {
        id: levelId(3, 1),
        world: 3,
        level: 1,
        name: 'Ridge Runner',
        description: 'Welcome to the mountains where terrain becomes your enemy',
        focus: 'Introduction to steep terrain and height differences',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 110,
        playerHealth: 100,
        wind: { min: -4, max: 4 },
        terrain: { style: 'mountains', minHeight: 150, maxHeight: 480 },
        star2Damage: 80,
        star3Accuracy: 0.62,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 280, firstClear: 140 }
    },
    {
        id: levelId(3, 2),
        world: 3,
        level: 2,
        name: 'Pixel Peaks',
        description: 'Sharp mountain peaks dot the landscape like digital spikes',
        focus: 'Shooting over tall peaks with increasing wind',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 110,
        playerHealth: 100,
        wind: { min: -5, max: 5 },
        terrain: { style: 'mountains', minHeight: 140, maxHeight: 500 },
        star2Damage: 85,
        star3Accuracy: 0.62,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 290, firstClear: 145 }
    },
    {
        id: levelId(3, 3),
        world: 3,
        level: 3,
        name: 'Sunset Pass',
        description: 'Battle through a narrow mountain pass as the neon sun sets',
        focus: 'Navigating restricted firing lanes between peaks',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.MEDIUM,
        enemyHealth: 115,
        playerHealth: 100,
        wind: { min: -5, max: 5 },
        terrain: { style: 'mountains', minHeight: 130, maxHeight: 510 },
        star2Damage: 85,
        star3Accuracy: 0.63,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 300, firstClear: 150 }
    },
    {
        id: levelId(3, 4),
        world: 3,
        level: 4,
        name: 'Echo Valley',
        description: 'Deep crevasses create deadly drops and tricky angles',
        focus: 'Shooting up from valley floor or down into depths',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 115,
        playerHealth: 100,
        wind: { min: -5, max: 5 },
        terrain: { style: 'valleys', minHeight: 120, maxHeight: 520 },
        star2Damage: 90,
        star3Accuracy: 0.63,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 310, firstClear: 155 }
    },
    {
        id: levelId(3, 5),
        world: 3,
        level: 5,
        name: 'Retro Heights',
        description: 'Jagged peaks push the terrain to new extremes',
        focus: 'Mastering high-angle shots with stronger wind',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 120,
        playerHealth: 100,
        wind: { min: -6, max: 6 },
        terrain: { style: 'jagged', minHeight: 110, maxHeight: 530 },
        star2Damage: 90,
        star3Accuracy: 0.64,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 320, firstClear: 160 }
    },
    {
        id: levelId(3, 6),
        world: 3,
        level: 6,
        name: 'Cliff Hanger',
        description: 'Sheer cliff faces create dramatic height advantages',
        focus: 'Defending or attacking across vertical cliff walls',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 120,
        playerHealth: 100,
        wind: { min: -6, max: 6 },
        terrain: { style: 'jagged', minHeight: 100, maxHeight: 540 },
        star2Damage: 95,
        star3Accuracy: 0.64,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 330, firstClear: 165 }
    },
    {
        id: levelId(3, 7),
        world: 3,
        level: 7,
        name: 'Gradient Gorge',
        description: 'A deep gorge with extreme terrain on both sides',
        focus: 'Lobbing shots across a wide canyon with wind interference',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 125,
        playerHealth: 100,
        wind: { min: -6, max: 6 },
        terrain: { style: 'extreme', minHeight: 100, maxHeight: 550 },
        star2Damage: 95,
        star3Accuracy: 0.65,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 340, firstClear: 170 }
    },
    {
        id: levelId(3, 8),
        world: 3,
        level: 8,
        name: 'Synthwave Slopes',
        description: 'Steep glowing slopes test your precision and timing',
        focus: 'Combining wind compensation with extreme elevation shots',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 125,
        playerHealth: 100,
        wind: { min: -6, max: 6 },
        terrain: { style: 'extreme', minHeight: 90, maxHeight: 560 },
        star2Damage: 100,
        star3Accuracy: 0.65,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 350, firstClear: 175 }
    },
    {
        id: levelId(3, 9),
        world: 3,
        level: 9,
        name: 'Neon Cliffs',
        description: 'Prepare for the summit against an increasingly skilled foe',
        focus: 'Pre-boss challenge with strong wind and extreme terrain',
        difficulty: 'medium-hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 130,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 80, maxHeight: 570 },
        star2Damage: 100,
        star3Accuracy: 0.66,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 360, firstClear: 180 }
    },
    {
        id: levelId(3, 10),
        world: 3,
        level: 10,
        name: 'Ridge Master',
        description: 'Claim the title of Ridge Master atop the highest peak',
        focus: 'World 3 boss battle combining all mountain warfare skills',
        difficulty: 'hard-boss',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 140,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 80, maxHeight: 580 },
        star2Damage: 110,
        star3Accuracy: 0.67,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 450, firstClear: 225 }
    }
];

// -----------------------------------------------------------------------------
// WORLD 4: DIGITAL DESERT (Hard)
// Wind mastery is the primary challenge - sweeping dunes, heavy winds (-8 to +8)
// Smooth dune terrain with exposed positions for long-range wind battles
// -----------------------------------------------------------------------------

const WORLD_4_LEVELS = [
    {
        id: levelId(4, 1),
        world: 4,
        level: 1,
        name: 'Sand Bytes',
        description: 'Enter the silicon sands where the wind never sleeps',
        focus: 'Introduction to strong, consistent wind patterns',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 120,
        playerHealth: 100,
        wind: { min: -6, max: 6 },
        terrain: { style: 'dunes', minHeight: 150, maxHeight: 400 },
        star2Damage: 90,
        star3Accuracy: 0.64,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 350, firstClear: 175 }
    },
    {
        id: levelId(4, 2),
        world: 4,
        level: 2,
        name: 'Dune Protocol',
        description: 'Rolling dunes create sweeping battlefields with long sight lines',
        focus: 'Long-range shots with significant wind compensation',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 125,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'dunes', minHeight: 150, maxHeight: 420 },
        star2Damage: 95,
        star3Accuracy: 0.64,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 360, firstClear: 180 }
    },
    {
        id: levelId(4, 3),
        world: 4,
        level: 3,
        name: 'Silicon Sands',
        description: 'Crystalline dunes glitter under the neon sun as wind howls across the expanse',
        focus: 'Wind compensation across varying elevations',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 125,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'dunes', minHeight: 140, maxHeight: 430 },
        star2Damage: 95,
        star3Accuracy: 0.65,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 370, firstClear: 185 }
    },
    {
        id: levelId(4, 4),
        world: 4,
        level: 4,
        name: 'Windstorm',
        description: 'A massive sandstorm rages across the battlefield - maximum wind challenge',
        focus: 'Extreme wind requiring precise angle and power adjustments',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 130,
        playerHealth: 100,
        wind: { min: -8, max: 8 },
        terrain: { style: 'dunes', minHeight: 150, maxHeight: 440 },
        star2Damage: 100,
        star3Accuracy: 0.65,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 380, firstClear: 190 }
    },
    {
        id: levelId(4, 5),
        world: 4,
        level: 5,
        name: 'Mirage Matrix',
        description: 'Heat shimmer distorts the horizon - trust your calculations, not your eyes',
        focus: 'Combining wind mastery with dune elevation changes',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 130,
        playerHealth: 100,
        wind: { min: -8, max: 8 },
        terrain: { style: 'dunes', minHeight: 140, maxHeight: 450 },
        star2Damage: 100,
        star3Accuracy: 0.66,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 390, firstClear: 195 }
    },
    {
        id: levelId(4, 6),
        world: 4,
        level: 6,
        name: 'Dust Devils',
        description: 'Swirling vortexes of sand mark unpredictable wind patterns',
        focus: 'Adapting to shifting wind conditions mid-battle',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 135,
        playerHealth: 100,
        wind: { min: -8, max: 8 },
        windShift: true,  // Special: wind can change between turns
        terrain: { style: 'dunes', minHeight: 130, maxHeight: 450 },
        star2Damage: 105,
        star3Accuracy: 0.66,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 400, firstClear: 200 }
    },
    {
        id: levelId(4, 7),
        world: 4,
        level: 7,
        name: 'Oasis Override',
        description: 'A rare oasis creates a valley refuge amid the endless dunes',
        focus: 'Fighting from low ground against elevated enemies in wind',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 135,
        playerHealth: 100,
        wind: { min: -8, max: 8 },
        terrain: { style: 'dunes', minHeight: 120, maxHeight: 450 },
        star2Damage: 105,
        star3Accuracy: 0.67,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 410, firstClear: 205 }
    },
    {
        id: levelId(4, 8),
        world: 4,
        level: 8,
        name: 'Scorched Sector',
        description: 'The hottest zone where wind gusts reach their peak intensity',
        focus: 'Maximum wind compensation with exposed positions',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 140,
        playerHealth: 100,
        wind: { min: -8, max: 8 },
        terrain: { style: 'dunes', minHeight: 150, maxHeight: 440 },
        star2Damage: 110,
        star3Accuracy: 0.67,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 420, firstClear: 210 }
    },
    {
        id: levelId(4, 9),
        world: 4,
        level: 9,
        name: 'Thermal Surge',
        description: 'Rising thermals create unpredictable wind currents over the burning sands',
        focus: 'Pre-boss challenge with gusting variable wind',
        difficulty: 'hard',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 140,
        playerHealth: 100,
        wind: { min: -8, max: 8 },
        windShift: true,  // Special: wind can change between turns
        terrain: { style: 'dunes', minHeight: 150, maxHeight: 450 },
        star2Damage: 110,
        star3Accuracy: 0.68,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 430, firstClear: 215 }
    },
    {
        id: levelId(4, 10),
        world: 4,
        level: 10,
        name: 'Desert Dominion',
        description: 'Claim mastery over the Digital Desert in the ultimate wind battle',
        focus: 'Boss battle combining all wind mastery skills',
        difficulty: 'hard-boss',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 150,
        playerHealth: 100,
        wind: { min: -8, max: 8 },
        windShift: true,  // Special: wind can change between turns
        terrain: { style: 'dunes', minHeight: 150, maxHeight: 450 },
        star2Damage: 120,
        star3Accuracy: 0.68,
        star3MaxTurns: 8,
        tutorialTips: null,
        rewards: { coins: 550, firstClear: 275 }
    }
];

// -----------------------------------------------------------------------------
// WORLD 5: PIXEL PARADISE (Very Hard)
// Surreal pixelated landscape with complex, irregular terrain
// High wind (-7 to +7), requires advanced weapon usage and strategic destruction
// Theme: Floating platforms concept, irregular patterns, narrow paths, unexpected geometry
// -----------------------------------------------------------------------------

const WORLD_5_LEVELS = [
    {
        id: levelId(5, 1),
        world: 5,
        level: 1,
        name: 'Paradise Protocol',
        description: 'Enter the surreal realm where pixels defy physics and terrain bends reality',
        focus: 'Introduction to complex irregular terrain that punishes simple shots',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 130,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 100, maxHeight: 550 },
        star2Damage: 100,
        star3Accuracy: 0.68,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 420, firstClear: 210 }
    },
    {
        id: levelId(5, 2),
        world: 5,
        level: 2,
        name: 'Glitch Garden',
        description: 'Corrupted data creates impossible terrain formations in this digital garden',
        focus: 'Learning to use terrain destruction to create viable shot paths',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD,
        enemyHealth: 135,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 80, maxHeight: 560 },
        star2Damage: 105,
        star3Accuracy: 0.68,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 430, firstClear: 215 }
    },
    {
        id: levelId(5, 3),
        world: 5,
        level: 3,
        name: 'Fragment Falls',
        description: 'Shattered terrain cascades in impossible waterfalls of broken geometry',
        focus: 'Navigating extreme elevation changes where direct shots are blocked',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 135,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 70, maxHeight: 580 },
        star2Damage: 105,
        star3Accuracy: 0.69,
        star3MaxTurns: 6,
        tutorialTips: null,
        rewards: { coins: 440, firstClear: 220 }
    },
    {
        id: levelId(5, 4),
        world: 5,
        level: 4,
        name: 'Null Island',
        description: 'An isolated mass of data surrounded by impossible drops and narrow bridges',
        focus: 'Precision bombing on narrow terrain where misses are catastrophic',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 140,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 60, maxHeight: 590 },
        star2Damage: 110,
        star3Accuracy: 0.69,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 450, firstClear: 225 }
    },
    {
        id: levelId(5, 5),
        world: 5,
        level: 5,
        name: 'Pixel Spires',
        description: 'Towering spikes of crystallized data create a deadly maze of blocking terrain',
        focus: 'Advanced weapons (MIRV, Digger) shine where basic shots fail',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 140,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 50, maxHeight: 600 },
        star2Damage: 110,
        star3Accuracy: 0.70,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 460, firstClear: 230 }
    },
    {
        id: levelId(5, 6),
        world: 5,
        level: 6,
        name: 'Void Valley',
        description: 'A deep rift in reality where the terrain warps into impossible configurations',
        focus: 'Using Rollers and Diggers to reach enemies behind complex barriers',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 145,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 50, maxHeight: 600 },
        star2Damage: 115,
        star3Accuracy: 0.70,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 470, firstClear: 235 }
    },
    {
        id: levelId(5, 7),
        world: 5,
        level: 7,
        name: 'Recursion Reef',
        description: 'Terrain patterns repeat in fractal formations creating infinite blocking layers',
        focus: 'Strategic terrain destruction to carve attack corridors over multiple turns',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 145,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 40, maxHeight: 600 },
        star2Damage: 115,
        star3Accuracy: 0.71,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 480, firstClear: 240 }
    },
    {
        id: levelId(5, 8),
        world: 5,
        level: 8,
        name: 'Overflow Oasis',
        description: 'Data overflow creates terrain that defies all conventional artillery tactics',
        focus: 'Combining multiple weapon types for multi-stage attack strategies',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 150,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 40, maxHeight: 600 },
        star2Damage: 120,
        star3Accuracy: 0.71,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 490, firstClear: 245 }
    },
    {
        id: levelId(5, 9),
        world: 5,
        level: 9,
        name: 'Paradise Corrupted',
        description: 'The heart of the glitch reveals terrain so complex only masters can conquer it',
        focus: 'Pre-boss gauntlet requiring perfect weapon selection and terrain manipulation',
        difficulty: 'very-hard',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 150,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 40, maxHeight: 600 },
        star2Damage: 120,
        star3Accuracy: 0.72,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 500, firstClear: 250 }
    },
    {
        id: levelId(5, 10),
        world: 5,
        level: 10,
        name: 'Pixelated Perfection',
        description: 'Prove your mastery of impossible terrain in the ultimate Pixel Paradise challenge',
        focus: 'World 5 boss: maximum terrain complexity, strategic destruction required to win',
        difficulty: 'expert-boss',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 160,
        playerHealth: 100,
        wind: { min: -7, max: 7 },
        terrain: { style: 'extreme', minHeight: 40, maxHeight: 600 },
        star2Damage: 130,
        star3Accuracy: 0.72,
        star3MaxTurns: 7,
        tutorialTips: null,
        rewards: { coins: 650, firstClear: 325 }
    }
];

// -----------------------------------------------------------------------------
// WORLD 6: SYNTHWAVE SUMMIT (Expert)
// The ultimate challenge - dramatic peaks, maximum wind, mastery required
// Levels 1-5: Expert warmup with escalating difficulty
// Levels 6-10: Boss fight gauntlet - the culmination of all skills
// Theme: Neon-lit arena atop the digital peaks where legends are forged
// -----------------------------------------------------------------------------

const WORLD_6_LEVELS = [
    {
        id: levelId(6, 1),
        world: 6,
        level: 1,
        name: 'Summit Approach',
        description: 'The path to glory begins at the base of the legendary Synthwave Summit',
        focus: 'Introduction to expert terrain with severe wind - no room for sloppy shots',
        difficulty: 'expert',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 140,
        playerHealth: 100,
        wind: { min: -8, max: 8 },
        terrain: { style: 'extreme', minHeight: 100, maxHeight: 560 },
        star2Damage: 110,
        star3Accuracy: 0.70,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 500, firstClear: 250 }
    },
    {
        id: levelId(6, 2),
        world: 6,
        level: 2,
        name: 'Neon Ascent',
        description: 'Climb through a gauntlet of glowing spires as the wind tears at your trajectory',
        focus: 'Managing extreme elevation with near-maximum wind compensation',
        difficulty: 'expert',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 145,
        playerHealth: 100,
        wind: { min: -9, max: 9 },
        terrain: { style: 'extreme', minHeight: 90, maxHeight: 580 },
        star2Damage: 115,
        star3Accuracy: 0.70,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 520, firstClear: 260 }
    },
    {
        id: levelId(6, 3),
        world: 6,
        level: 3,
        name: 'Grid Peak',
        description: 'A razor-thin ridge of digital geometry separates you from victory',
        focus: 'Precision threading through narrow gaps with punishing wind',
        difficulty: 'expert',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 145,
        playerHealth: 100,
        wind: { min: -9, max: 9 },
        terrain: { style: 'extreme', minHeight: 80, maxHeight: 590 },
        star2Damage: 115,
        star3Accuracy: 0.71,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 540, firstClear: 270 }
    },
    {
        id: levelId(6, 4),
        world: 6,
        level: 4,
        name: 'Cyber Apex',
        description: 'The highest point of the cyber range where only the skilled survive',
        focus: 'Combining advanced weapons with maximum terrain exploitation',
        difficulty: 'expert',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 150,
        playerHealth: 100,
        wind: { min: -9, max: 9 },
        terrain: { style: 'extreme', minHeight: 70, maxHeight: 600 },
        star2Damage: 120,
        star3Accuracy: 0.71,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 560, firstClear: 280 }
    },
    {
        id: levelId(6, 5),
        world: 6,
        level: 5,
        name: 'Retro Pinnacle',
        description: 'Maximum wind unleashed - every shot is a calculation, every miss is failure',
        focus: 'First encounter with full -10/+10 wind range in expert terrain',
        difficulty: 'expert',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 150,
        playerHealth: 100,
        wind: { min: -10, max: 10 },
        terrain: { style: 'extreme', minHeight: 60, maxHeight: 620 },
        star2Damage: 120,
        star3Accuracy: 0.72,
        star3MaxTurns: 5,
        tutorialTips: null,
        rewards: { coins: 580, firstClear: 290 }
    },
    // -------------------------------------------------------------------------
    // BOSS FIGHT GAUNTLET (6-10) - The true test of mastery
    // Tighter turn limits, higher accuracy requirements, shifting wind
    // -------------------------------------------------------------------------
    {
        id: levelId(6, 6),
        world: 6,
        level: 6,
        name: 'Chromatic Storm',
        description: 'The arena erupts in chromatic fury - wind shifts between turns in this boss arena',
        focus: 'BOSS PHASE 1: Adapting to wind that changes each turn while maintaining accuracy',
        difficulty: 'expert-boss',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 155,
        playerHealth: 100,
        wind: { min: -10, max: 10 },
        windShift: true,  // Wind changes between turns like World 4 bosses
        terrain: { style: 'extreme', minHeight: 55, maxHeight: 640 },
        star2Damage: 125,
        star3Accuracy: 0.72,
        star3MaxTurns: 4,
        tutorialTips: null,
        rewards: { coins: 600, firstClear: 300 }
    },
    {
        id: levelId(6, 7),
        world: 6,
        level: 7,
        name: 'Vapor Gauntlet',
        description: 'Ethereal terrain formations demand perfect weapon selection for each shot',
        focus: 'BOSS PHASE 2: Using the right tool for impossible angles - Digger, MIRV, Roller mastery',
        difficulty: 'expert-boss',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 155,
        playerHealth: 100,
        wind: { min: -10, max: 10 },
        windShift: true,
        terrain: { style: 'extreme', minHeight: 50, maxHeight: 660 },
        star2Damage: 125,
        star3Accuracy: 0.73,
        star3MaxTurns: 4,
        tutorialTips: null,
        rewards: { coins: 650, firstClear: 325 }
    },
    {
        id: levelId(6, 8),
        world: 6,
        level: 8,
        name: 'Laser Crucible',
        description: 'The crucible where pretenders are burned away - only masters proceed',
        focus: 'BOSS PHASE 3: Maximum terrain height combined with shifting gale-force winds',
        difficulty: 'expert-boss',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 165,
        playerHealth: 100,
        wind: { min: -10, max: 10 },
        windShift: true,
        terrain: { style: 'extreme', minHeight: 50, maxHeight: 680 },
        star2Damage: 130,
        star3Accuracy: 0.73,
        star3MaxTurns: 4,
        tutorialTips: null,
        rewards: { coins: 700, firstClear: 350 }
    },
    {
        id: levelId(6, 9),
        world: 6,
        level: 9,
        name: 'Final Frequency',
        description: 'One step from glory - the penultimate challenge that breaks the unprepared',
        focus: 'BOSS PHASE 4: Pre-champion gauntlet requiring flawless terrain reading and wind mastery',
        difficulty: 'expert-boss',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 165,
        playerHealth: 100,
        wind: { min: -10, max: 10 },
        windShift: true,
        terrain: { style: 'extreme', minHeight: 50, maxHeight: 690 },
        star2Damage: 135,
        star3Accuracy: 0.74,
        star3MaxTurns: 4,
        tutorialTips: null,
        rewards: { coins: 750, firstClear: 375 }
    },
    {
        id: levelId(6, 10),
        world: 6,
        level: 10,
        name: 'Synthwave Champion',
        description: 'The ultimate arena. The final battle. Become the Synthwave Champion or fade into static.',
        focus: 'THE FINAL BOSS: Maximum everything - only true masters earn 3 stars here',
        difficulty: 'legendary-boss',
        aiDifficulty: AI_DIFFICULTY.HARD_PLUS,
        enemyHealth: 180,
        playerHealth: 100,
        wind: { min: -10, max: 10 },
        windShift: true,
        terrain: { style: 'extreme', minHeight: 50, maxHeight: 700 },
        star2Damage: 150,
        star3Accuracy: 0.75,
        star3MaxTurns: 5,  // Slightly more turns but MUCH higher requirements
        tutorialTips: null,
        rewards: { coins: 1000, firstClear: 500 }
    }
];

// =============================================================================
// LEVEL REGISTRY
// =============================================================================

/**
 * Combines all level definitions into a lookup map.
 */
const ALL_LEVELS = [
    ...WORLD_1_LEVELS,
    ...WORLD_2_LEVELS,
    ...WORLD_3_LEVELS,
    ...WORLD_4_LEVELS,
    ...WORLD_5_LEVELS,
    ...WORLD_6_LEVELS
];

// Create level lookup map
const levelMap = new Map();
ALL_LEVELS.forEach(level => {
    levelMap.set(level.id, level);
});

/**
 * Level Registry - Central access point for all level data.
 */
export const LevelRegistry = {
    /**
     * Get a level by its ID.
     * @param {string} id - Level ID (e.g., 'world1-level3')
     * @returns {object|null} Level definition or null if not found
     */
    getLevel(id) {
        return levelMap.get(id) || null;
    },

    /**
     * Get all levels in a specific world.
     * @param {number} worldNum - World number (1-6)
     * @returns {object[]} Array of level definitions
     */
    getLevelsByWorld(worldNum) {
        return ALL_LEVELS.filter(level => level.world === worldNum);
    },

    /**
     * Get the next level in sequence.
     * @param {string} currentId - Current level ID
     * @returns {object|null} Next level definition or null if at the end
     */
    getNextLevel(currentId) {
        const current = levelMap.get(currentId);
        if (!current) return null;

        if (current.level < 10) {
            // Next level in same world
            return levelMap.get(levelId(current.world, current.level + 1));
        } else if (current.world < 6) {
            // First level of next world
            return levelMap.get(levelId(current.world + 1, 1));
        }

        // Already at the final level
        return null;
    },

    /**
     * Get the previous level in sequence.
     * @param {string} currentId - Current level ID
     * @returns {object|null} Previous level definition or null if at the start
     */
    getPreviousLevel(currentId) {
        const current = levelMap.get(currentId);
        if (!current) return null;

        if (current.level > 1) {
            // Previous level in same world
            return levelMap.get(levelId(current.world, current.level - 1));
        } else if (current.world > 1) {
            // Last level of previous world
            return levelMap.get(levelId(current.world - 1, 10));
        }

        // Already at the first level
        return null;
    },

    /**
     * Check if a world is unlocked based on total stars earned.
     * @param {number} worldNum - World number (1-6)
     * @param {number} totalStars - Total stars the player has earned
     * @returns {boolean} Whether the world is unlocked
     */
    isWorldUnlocked(worldNum, totalStars) {
        const threshold = LEVEL_CONSTANTS.STAR_THRESHOLDS[worldNum];
        if (threshold === undefined) return false;
        return totalStars >= threshold;
    },

    /**
     * Get world theme information.
     * @param {number} worldNum - World number (1-6)
     * @returns {object|null} World theme or null if not found
     */
    getWorldTheme(worldNum) {
        return WORLD_THEMES[worldNum] || null;
    },

    /**
     * Get all world themes.
     * @returns {object[]} Array of world themes
     */
    getAllWorldThemes() {
        return Object.values(WORLD_THEMES);
    },

    /**
     * Get all levels.
     * @returns {object[]} Array of all level definitions
     */
    getAllLevels() {
        return [...ALL_LEVELS];
    },

    /**
     * Get the count of levels in a world.
     * @param {number} worldNum - World number (1-6)
     * @returns {number} Number of levels in the world
     */
    getLevelCount(worldNum) {
        return this.getLevelsByWorld(worldNum).length;
    },

    /**
     * Get level by world and level number.
     * @param {number} worldNum - World number (1-6)
     * @param {number} levelNum - Level number (1-10)
     * @returns {object|null} Level definition or null if not found
     */
    getLevelByNumber(worldNum, levelNum) {
        return levelMap.get(levelId(worldNum, levelNum)) || null;
    },

    /**
     * Check if a level exists.
     * @param {string} id - Level ID
     * @returns {boolean} Whether the level exists
     */
    hasLevel(id) {
        return levelMap.has(id);
    },

    /**
     * Get the first unlocked but incomplete level.
     * @param {Map} completedLevels - Map of level IDs to star counts
     * @param {number} totalStars - Total stars earned
     * @returns {object|null} Next level to play or null if all complete
     */
    getNextPlayableLevel(completedLevels, totalStars) {
        for (const level of ALL_LEVELS) {
            // Check if world is unlocked
            if (!this.isWorldUnlocked(level.world, totalStars)) {
                continue;
            }

            // Check if level is not completed with 3 stars
            const stars = completedLevels.get(level.id) || 0;
            if (stars < 3) {
                // Also check if previous level is completed (for levels > 1)
                if (level.level === 1) {
                    return level;
                }
                const prevId = levelId(level.world, level.level - 1);
                if (completedLevels.has(prevId)) {
                    return level;
                }
            }
        }
        return null;
    },

    /**
     * Get the terrain style configuration.
     * @param {string} styleName - Style name from level definition
     * @returns {object} Terrain style configuration
     */
    getTerrainStyle(styleName) {
        return TERRAIN_STYLES[styleName] || TERRAIN_STYLES.hills;
    },

    /**
     * Calculate the maximum possible stars for a given world count.
     * @param {number} worlds - Number of worlds (1-6)
     * @returns {number} Maximum possible stars
     */
    getMaxStarsForWorlds(worlds) {
        return Math.min(worlds, 6) * 10 * 3;
    },

    /**
     * Parse a level ID into world and level numbers.
     * @param {string} id - Level ID (e.g., 'world1-level3')
     * @returns {{worldNum: number, levelNum: number}|null} Parsed values or null if invalid
     */
    parseLevelId(id) {
        if (!id || typeof id !== 'string') return null;
        const match = id.match(/^world(\d+)-level(\d+)$/);
        if (!match) return null;
        return {
            worldNum: parseInt(match[1], 10),
            levelNum: parseInt(match[2], 10)
        };
    }
};

// Export for debugging/testing
export { ALL_LEVELS, TERRAIN_STYLES };
