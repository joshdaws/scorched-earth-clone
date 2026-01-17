/**
 * Scorched Earth: Synthwave Edition
 * Scene Isolation - URL-based test scene routing
 *
 * Enables jumping directly to isolated test scenes via URL parameters:
 * - ?scene=slingshot-test - Aiming UI in isolation
 * - ?scene=physics-sandbox - Fire projectiles and see trajectories
 * - ?scene=shop - Shop UI with mock inventory
 * - ?scene=terrain-viewer - Terrain generation testing
 * - ?debug=true&round=5 - Start at specific round with debug
 *
 * This module parses URL parameters and provides routing for test scenes.
 */

// =============================================================================
// URL PARAMETER PARSING
// =============================================================================

/**
 * Parsed URL parameters for scene isolation
 * @type {Object}
 */
const params = {
    scene: null,        // Test scene to load (e.g., 'slingshot-test')
    debug: false,       // Enable debug mode
    round: null,        // Start at specific round
    difficulty: null,   // Set difficulty (easy, medium, hard)
    money: null,        // Starting money override
    weapon: null,       // Selected weapon ID
    wind: null,         // Fixed wind value
    seed: null,         // Terrain generation seed
    playerHealth: null, // Player starting health
    enemyHealth: null   // Enemy starting health
};

/**
 * Parse URL parameters from current location.
 * Call this early in initialization.
 */
export function parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);

    // Scene selection
    params.scene = urlParams.get('scene');

    // Debug mode
    params.debug = urlParams.has('debug') &&
        (urlParams.get('debug') === 'true' || urlParams.get('debug') === '' || urlParams.get('debug') === '1');

    // Round number
    const roundStr = urlParams.get('round');
    if (roundStr) {
        const round = parseInt(roundStr, 10);
        if (!isNaN(round) && round >= 1) {
            params.round = round;
        }
    }

    // Difficulty
    const diff = urlParams.get('difficulty');
    if (diff && ['easy', 'medium', 'hard'].includes(diff.toLowerCase())) {
        params.difficulty = diff.toLowerCase();
    }

    // Money override
    const moneyStr = urlParams.get('money');
    if (moneyStr) {
        const money = parseInt(moneyStr, 10);
        if (!isNaN(money) && money >= 0) {
            params.money = money;
        }
    }

    // Weapon selection
    params.weapon = urlParams.get('weapon');

    // Wind value
    const windStr = urlParams.get('wind');
    if (windStr) {
        const wind = parseFloat(windStr);
        if (!isNaN(wind)) {
            params.wind = wind;
        }
    }

    // Terrain seed
    const seedStr = urlParams.get('seed');
    if (seedStr) {
        const seed = parseInt(seedStr, 10);
        if (!isNaN(seed)) {
            params.seed = seed;
        }
    }

    // Health overrides
    const playerHealthStr = urlParams.get('playerHealth');
    if (playerHealthStr) {
        const health = parseInt(playerHealthStr, 10);
        if (!isNaN(health) && health >= 1) {
            params.playerHealth = health;
        }
    }

    const enemyHealthStr = urlParams.get('enemyHealth');
    if (enemyHealthStr) {
        const health = parseInt(enemyHealthStr, 10);
        if (!isNaN(health) && health >= 1) {
            params.enemyHealth = health;
        }
    }

    // Log parsed params if any are set
    const activeParams = Object.entries(params)
        .filter(([_, v]) => v !== null && v !== false)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');

    if (activeParams) {
        console.log(`[SceneIsolation] URL params: ${activeParams}`);
    }

    return params;
}

/**
 * Get parsed URL parameters.
 * @returns {Object} Parsed parameters
 */
export function getParams() {
    return { ...params };
}

/**
 * Check if a specific scene was requested.
 * @param {string} sceneName - Scene name to check
 * @returns {boolean} True if this scene was requested
 */
export function isScene(sceneName) {
    return params.scene === sceneName;
}

/**
 * Check if any test scene was requested.
 * @returns {boolean} True if a test scene should be loaded
 */
export function hasTestScene() {
    return params.scene !== null;
}

/**
 * Check if debug mode was requested via URL.
 * @returns {boolean} True if debug=true was in URL
 */
export function isDebugRequested() {
    return params.debug;
}

/**
 * Get the requested starting round.
 * @returns {number|null} Round number or null if not set
 */
export function getStartingRound() {
    return params.round;
}

/**
 * Get the requested difficulty.
 * @returns {string|null} Difficulty name or null if not set
 */
export function getRequestedDifficulty() {
    return params.difficulty;
}

/**
 * Get the requested starting money.
 * @returns {number|null} Money amount or null if not set
 */
export function getStartingMoney() {
    return params.money;
}

/**
 * Get the requested wind value.
 * @returns {number|null} Wind value or null if not set
 */
export function getFixedWind() {
    return params.wind;
}

/**
 * Get the terrain seed.
 * @returns {number|null} Seed value or null if not set
 */
export function getTerrainSeed() {
    return params.seed;
}

// =============================================================================
// SCENE DEFINITIONS
// =============================================================================

/**
 * Available test scenes with their configurations.
 * Each scene specifies what systems to initialize and what state to enter.
 */
export const SCENES = {
    /**
     * Slingshot/Aiming Test
     * Tests the Angry Birds-style drag aiming without full game loop.
     * Minimal setup: just terrain, player tank, and aiming controls.
     */
    'slingshot-test': {
        name: 'Slingshot Aiming Test',
        description: 'Test touch/mouse aiming controls in isolation',
        initialState: 'playing',
        setup: {
            terrain: true,
            playerTank: true,
            enemyTank: true, // Need enemy for aiming reference
            wind: false,     // Disable wind for consistent testing
            skipMenu: true,
            enableFiring: true,
            showTrajectory: true
        }
    },

    /**
     * Physics Sandbox
     * Fire projectiles and observe trajectories.
     * Full physics with optional trajectory visualization.
     */
    'physics-sandbox': {
        name: 'Physics Sandbox',
        description: 'Fire projectiles and analyze trajectories',
        initialState: 'playing',
        setup: {
            terrain: true,
            playerTank: true,
            enemyTank: true,
            wind: true,
            skipMenu: true,
            enableFiring: true,
            showTrajectory: true,
            unlimitedAmmo: true,
            showPhysicsData: true
        }
    },

    /**
     * Shop Test
     * Shop UI with configurable money and inventory.
     */
    'shop': {
        name: 'Shop Test',
        description: 'Test shop UI with mock inventory',
        initialState: 'shop',
        setup: {
            terrain: false,
            playerTank: false,
            enemyTank: false,
            skipMenu: true,
            mockInventory: true,
            startingMoney: 10000 // Generous budget for testing
        }
    },

    /**
     * Terrain Viewer
     * Terrain generation testing with seed control.
     */
    'terrain-viewer': {
        name: 'Terrain Viewer',
        description: 'Test terrain generation with different seeds',
        initialState: 'playing',
        setup: {
            terrain: true,
            playerTank: true,
            enemyTank: true,
            skipMenu: true,
            enableFiring: false,
            showTerrainInfo: true
        }
    },

    /**
     * AI Debug
     * Watch AI decision making in real-time.
     */
    'ai-debug': {
        name: 'AI Debug',
        description: 'Watch AI decision making',
        initialState: 'playing',
        setup: {
            terrain: true,
            playerTank: true,
            enemyTank: true,
            wind: true,
            skipMenu: true,
            showAIDebug: true,
            autoStartAI: true
        }
    },

    /**
     * Round Start
     * Skip to beginning of a specific round.
     * Uses the `round` URL parameter.
     */
    'round-start': {
        name: 'Round Start',
        description: 'Start at a specific round',
        initialState: 'playing',
        setup: {
            terrain: true,
            playerTank: true,
            enemyTank: true,
            wind: true,
            skipMenu: true,
            useRoundParam: true
        }
    }
};

/**
 * Get scene configuration by name.
 * @param {string} sceneName - Scene name
 * @returns {Object|null} Scene configuration or null if not found
 */
export function getScene(sceneName) {
    return SCENES[sceneName] || null;
}

/**
 * Get the current scene based on URL parameters.
 * @returns {Object|null} Scene configuration or null if no scene requested
 */
export function getCurrentScene() {
    if (!params.scene) {
        return null;
    }
    return getScene(params.scene);
}

/**
 * List all available scene names.
 * @returns {string[]} Array of scene names
 */
export function listScenes() {
    return Object.keys(SCENES);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize scene isolation system.
 * Should be called early in app initialization, before other systems.
 * @returns {Object} Parsed parameters and active scene
 */
export function init() {
    parseUrlParams();

    const scene = getCurrentScene();
    if (scene) {
        console.log(`[SceneIsolation] Loading scene: ${scene.name}`);
        console.log(`[SceneIsolation] ${scene.description}`);
    }

    return {
        params: getParams(),
        scene: scene
    };
}

// =============================================================================
// WINDOW EXPOSURE (for console access)
// =============================================================================

const SceneIsolation = {
    init,
    parseUrlParams,
    getParams,
    isScene,
    hasTestScene,
    isDebugRequested,
    getStartingRound,
    getRequestedDifficulty,
    getStartingMoney,
    getFixedWind,
    getTerrainSeed,
    getScene,
    getCurrentScene,
    listScenes,
    SCENES
};

// Expose on window for console access
if (typeof window !== 'undefined') {
    window.SceneIsolation = SceneIsolation;
}

export default SceneIsolation;
