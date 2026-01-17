/**
 * Scorched Earth: Synthwave Edition
 * Test API - Programmatic control for agent testing
 *
 * Provides programmatic access to game controls for automated testing:
 * - aim({ angle, power }) - Set aiming parameters
 * - fire() - Trigger a shot
 * - simulateProjectile({ angle, power, wind }) - Run physics simulation
 *
 * This module enables agents to test touch-based controls without touch hardware.
 */

import { PHYSICS, TANK } from './constants.js';
import { queueGameInput, INPUT_EVENTS } from './input.js';
import * as Wind from './wind.js';
import * as Turn from './turn.js';
import { getScreenWidth, getScreenHeight } from './screenSize.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {import('./tank.js').Tank|null} Reference to player tank */
let playerTank = null;

/** @type {import('./tank.js').Tank|null} Reference to enemy tank */
let enemyTank = null;

/** @type {import('./terrain.js').Terrain|null} Reference to terrain */
let terrain = null;

/** @type {Function|null} Reference to fire projectile function from main.js */
let fireProjectileRef = null;

/** @type {Object|null} Reference to player aim state from main.js */
let playerAimRef = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize TestAPI with game references.
 * Must be called during game setup.
 *
 * @param {Object} refs - Game references
 * @param {() => import('./tank.js').Tank|null} refs.getPlayerTank - Function returning player tank
 * @param {() => import('./tank.js').Tank|null} refs.getEnemyTank - Function returning enemy tank
 * @param {() => import('./terrain.js').Terrain|null} refs.getTerrain - Function returning terrain
 * @param {Function} refs.fireProjectile - Function to fire projectile
 * @param {{angle: number, power: number}} refs.playerAim - Reference to player aim state
 */
export function init(refs) {
    if (refs.getPlayerTank) {
        // Store getter functions - use a wrapper to avoid type issues
        const getPlayer = refs.getPlayerTank;
        Object.defineProperty(module, 'playerTank', {
            get: () => getPlayer(),
            configurable: true
        });
    }
    if (refs.getEnemyTank) {
        const getEnemy = refs.getEnemyTank;
        Object.defineProperty(module, 'enemyTank', {
            get: () => getEnemy(),
            configurable: true
        });
    }
    if (refs.getTerrain) {
        const getTerrain = refs.getTerrain;
        Object.defineProperty(module, 'terrain', {
            get: () => getTerrain(),
            configurable: true
        });
    }
    fireProjectileRef = refs.fireProjectile || null;
    playerAimRef = refs.playerAim || null;

    console.log('[TestAPI] Initialized');
}

// Module reference for dynamic getters
const module = {
    playerTank: null,
    enemyTank: null,
    terrain: null
};

/**
 * Set player tank reference directly.
 * @param {import('./tank.js').Tank} tank - Player tank
 */
export function setPlayerTank(tank) {
    playerTank = tank;
    module.playerTank = tank;
}

/**
 * Set enemy tank reference directly.
 * @param {import('./tank.js').Tank} tank - Enemy tank
 */
export function setEnemyTank(tank) {
    enemyTank = tank;
    module.enemyTank = tank;
}

/**
 * Set terrain reference directly.
 * @param {import('./terrain.js').Terrain} t - Terrain instance
 */
export function setTerrain(t) {
    terrain = t;
    module.terrain = t;
}

/**
 * Set fire projectile function reference.
 * @param {Function} fn - Fire projectile function
 */
export function setFireProjectile(fn) {
    fireProjectileRef = fn;
}

/**
 * Set player aim reference.
 * @param {Object} aim - Player aim state { angle, power }
 */
export function setPlayerAim(aim) {
    playerAimRef = aim;
}

// =============================================================================
// AIMING API
// =============================================================================

/**
 * Set aiming parameters programmatically.
 * Works regardless of debug mode state.
 *
 * @param {Object} options - Aiming options
 * @param {number} [options.angle] - Angle in degrees (0-180)
 * @param {number} [options.power] - Power percentage (0-100)
 * @returns {Object} Result with current angle and power
 */
export function aim(options = {}) {
    const { angle, power } = options;
    const result = { success: true, angle: null, power: null };

    // Validate and set angle
    if (typeof angle === 'number') {
        if (angle < PHYSICS.MIN_ANGLE || angle > PHYSICS.MAX_ANGLE) {
            console.warn(`[TestAPI] Angle ${angle} out of range (${PHYSICS.MIN_ANGLE}-${PHYSICS.MAX_ANGLE})`);
        }
        const clampedAngle = Math.max(PHYSICS.MIN_ANGLE, Math.min(PHYSICS.MAX_ANGLE, angle));

        // Queue input event to set angle
        queueGameInput(INPUT_EVENTS.ANGLE_SET, clampedAngle);

        // Also update playerAim directly if available
        if (playerAimRef) {
            playerAimRef.angle = clampedAngle;
        }

        // Update tank directly if available
        const tank = module.playerTank || playerTank;
        if (tank) {
            tank.angle = clampedAngle;
        }

        result.angle = clampedAngle;
    }

    // Validate and set power
    if (typeof power === 'number') {
        if (power < PHYSICS.MIN_POWER || power > PHYSICS.MAX_POWER) {
            console.warn(`[TestAPI] Power ${power} out of range (${PHYSICS.MIN_POWER}-${PHYSICS.MAX_POWER})`);
        }
        const clampedPower = Math.max(PHYSICS.MIN_POWER, Math.min(PHYSICS.MAX_POWER, power));

        // Queue input event to set power
        queueGameInput(INPUT_EVENTS.POWER_SET, clampedPower);

        // Also update playerAim directly if available
        if (playerAimRef) {
            playerAimRef.power = clampedPower;
        }

        // Update tank directly if available
        const tank = module.playerTank || playerTank;
        if (tank) {
            tank.power = clampedPower;
        }

        result.power = clampedPower;
    }

    // Return current values
    const tank = module.playerTank || playerTank;
    if (tank) {
        result.angle = result.angle ?? tank.angle;
        result.power = result.power ?? tank.power;
    } else if (playerAimRef) {
        result.angle = result.angle ?? playerAimRef.angle;
        result.power = result.power ?? playerAimRef.power;
    }

    console.log(`[TestAPI] aim({ angle: ${result.angle}, power: ${result.power} })`);
    return result;
}

/**
 * Get current aiming parameters.
 * @returns {Object} Current { angle, power }
 */
export function getAim() {
    const tank = module.playerTank || playerTank;
    if (tank) {
        return { angle: tank.angle, power: tank.power };
    }
    if (playerAimRef) {
        return { angle: playerAimRef.angle, power: playerAimRef.power };
    }
    return { angle: 45, power: 50 };
}

// =============================================================================
// FIRING API
// =============================================================================

/**
 * Fire a shot programmatically.
 * Works regardless of debug mode state.
 *
 * @returns {Object} Result with success status
 */
export function fire() {
    // Check if we can fire
    if (!Turn.canPlayerFire()) {
        console.warn('[TestAPI] Cannot fire: not player turn or already firing');
        return { success: false, error: 'Cannot fire in current turn phase' };
    }

    // Queue fire input event
    queueGameInput(INPUT_EVENTS.FIRE);

    console.log('[TestAPI] fire() - queued fire event');
    return { success: true };
}

/**
 * Fire directly using the fire projectile function.
 * Bypasses turn system validation for testing purposes.
 *
 * @returns {Object} Result with success status
 */
export function fireDirect() {
    const tank = module.playerTank || playerTank;

    if (!tank) {
        console.warn('[TestAPI] Cannot fire: no player tank');
        return { success: false, error: 'No player tank' };
    }

    if (!fireProjectileRef) {
        console.warn('[TestAPI] Cannot fire: fireProjectile function not set');
        return { success: false, error: 'Fire function not initialized' };
    }

    // Fire projectile directly
    const result = fireProjectileRef(tank);
    console.log(`[TestAPI] fireDirect() - result: ${result}`);
    return { success: result };
}

// =============================================================================
// PHYSICS SIMULATION API
// =============================================================================

/**
 * Simulate a projectile trajectory without actually firing.
 * Returns trajectory data for analysis.
 *
 * @param {Object} options - Simulation options
 * @param {number} [options.angle=45] - Launch angle in degrees
 * @param {number} [options.power=50] - Launch power percentage
 * @param {number} [options.wind] - Wind value (uses current wind if not specified)
 * @param {number} [options.startX] - Starting X position (uses tank position if not specified)
 * @param {number} [options.startY] - Starting Y position (uses tank position if not specified)
 * @param {number} [options.maxSteps=500] - Maximum simulation steps
 * @returns {Object} Simulation result with trajectory data
 */
export function simulateProjectile(options = {}) {
    const {
        angle = 45,
        power = 50,
        wind = Wind.getWind(),
        maxSteps = 500
    } = options;

    // Get starting position
    let startX = options.startX;
    let startY = options.startY;

    // Use tank position if not specified
    if (startX === undefined || startY === undefined) {
        const tank = module.playerTank || playerTank;
        if (tank) {
            // Get fire position (tip of turret)
            const radians = (angle * Math.PI) / 180;
            const bodyHeight = TANK.BODY_HEIGHT || TANK.HEIGHT;
            startX = startX ?? (tank.x + Math.cos(radians) * TANK.TURRET_LENGTH);
            startY = startY ?? (tank.y - bodyHeight - Math.sin(radians) * TANK.TURRET_LENGTH);
        } else {
            // Default to center of screen
            startX = startX ?? getScreenWidth() / 4;
            startY = startY ?? getScreenHeight() / 2;
        }
    }

    // Run simulation
    const trajectory = [];
    const result = {
        success: true,
        startX,
        startY,
        angle,
        power,
        wind,
        trajectory: [],
        maxHeight: startY,
        maxHeightX: startX,
        flightTime: 0,
        landingX: null,
        landingY: null,
        tankHit: null,
        terrainHit: false,
        outOfBounds: false
    };

    // Calculate initial velocity
    const velocityMagnitude = (power / 100) * PHYSICS.MAX_VELOCITY;
    const radians = (angle * Math.PI) / 180;
    let vx = Math.cos(radians) * velocityMagnitude;
    let vy = -Math.sin(radians) * velocityMagnitude;

    // Wind force
    const windForce = wind * PHYSICS.WIND_FORCE_MULTIPLIER;

    let x = startX;
    let y = startY;
    let step = 0;

    // Get screen bounds
    const screenWidth = getScreenWidth();
    const screenHeight = getScreenHeight();

    // Get terrain and tanks for collision detection
    const currentTerrain = module.terrain || terrain;
    const player = module.playerTank || playerTank;
    const enemy = module.enemyTank || enemyTank;

    // Simulate trajectory
    while (step < maxSteps) {
        trajectory.push({ x, y, t: step });

        // Track max height (remember Y increases downward)
        if (y < result.maxHeight) {
            result.maxHeight = y;
            result.maxHeightX = x;
        }

        // Apply physics
        vy += PHYSICS.GRAVITY;
        vx += windForce;

        // Cap velocity
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > PHYSICS.MAX_VELOCITY) {
            const scale = PHYSICS.MAX_VELOCITY / speed;
            vx *= scale;
            vy *= scale;
        }

        // Move
        x += vx;
        y += vy;
        step++;

        // Check bounds
        if (x < 0 || x > screenWidth) {
            result.outOfBounds = true;
            result.landingX = x;
            result.landingY = y;
            break;
        }
        if (y > screenHeight) {
            result.outOfBounds = true;
            result.landingX = x;
            result.landingY = y;
            break;
        }

        // Check terrain collision
        if (currentTerrain) {
            const terrainHeight = currentTerrain.getHeight(Math.floor(x));
            const terrainY = screenHeight - terrainHeight;
            if (y >= terrainY) {
                result.terrainHit = true;
                result.landingX = x;
                result.landingY = terrainY;
                trajectory.push({ x, y: terrainY, t: step });
                break;
            }
        }

        // Check tank collision (simple bounding box)
        if (enemy && !enemy.isDestroyed) {
            const dx = Math.abs(x - enemy.x);
            const dy = Math.abs(y - (enemy.y - TANK.HEIGHT / 2));
            if (dx < TANK.WIDTH / 2 && dy < TANK.HEIGHT / 2) {
                result.tankHit = 'enemy';
                result.landingX = x;
                result.landingY = y;
                break;
            }
        }
        if (player && !player.isDestroyed && step > 10) {  // Skip first few frames to avoid self-hit
            const dx = Math.abs(x - player.x);
            const dy = Math.abs(y - (player.y - TANK.HEIGHT / 2));
            if (dx < TANK.WIDTH / 2 && dy < TANK.HEIGHT / 2) {
                result.tankHit = 'player';
                result.landingX = x;
                result.landingY = y;
                break;
            }
        }
    }

    result.trajectory = trajectory;
    result.flightTime = step;

    // Convert maxHeight from canvas coords (Y increases down) to logical height
    result.maxHeightAboveStart = startY - result.maxHeight;

    console.log(`[TestAPI] simulateProjectile({ angle: ${angle}, power: ${power}, wind: ${wind} }) - ` +
                `steps: ${step}, landing: (${result.landingX?.toFixed(1)}, ${result.landingY?.toFixed(1)}), ` +
                `tankHit: ${result.tankHit}, terrainHit: ${result.terrainHit}`);

    return result;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get current wind value.
 * @returns {number} Current wind value
 */
export function getWind() {
    return Wind.getWind();
}

/**
 * Get current wind force (wind * multiplier).
 * @returns {number} Current wind force
 */
export function getWindForce() {
    return Wind.getWindForce();
}

/**
 * Get current game state info.
 * @returns {Object} Current game state
 */
export function getState() {
    const player = module.playerTank || playerTank;
    const enemy = module.enemyTank || enemyTank;

    return {
        turnPhase: Turn.getPhase(),
        canFire: Turn.canPlayerFire(),
        isPlayerTurn: Turn.isPlayerTurn(),
        wind: Wind.getWind(),
        windForce: Wind.getWindForce(),
        player: player ? {
            x: player.x,
            y: player.y,
            health: player.health,
            angle: player.angle,
            power: player.power,
            weapon: player.currentWeapon
        } : null,
        enemy: enemy ? {
            x: enemy.x,
            y: enemy.y,
            health: enemy.health,
            isDestroyed: enemy.isDestroyed
        } : null
    };
}

/**
 * Check if TestAPI is properly initialized.
 * @returns {boolean} True if initialized with game references
 */
export function isInitialized() {
    return !!(module.playerTank || playerTank || fireProjectileRef);
}

// =============================================================================
// WINDOW EXPOSURE (for console access)
// =============================================================================

// Create TestAPI object for console access
const TestAPI = {
    aim,
    fire,
    fireDirect,
    simulateProjectile,
    getAim,
    getWind,
    getWindForce,
    getState,
    isInitialized,
    // Initialization (typically called by main.js)
    init,
    setPlayerTank,
    setEnemyTank,
    setTerrain,
    setFireProjectile,
    setPlayerAim
};

// Expose on window for console access
if (typeof window !== 'undefined') {
    window.TestAPI = TestAPI;
}

export default TestAPI;
