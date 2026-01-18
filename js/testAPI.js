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
import { calculateDamage } from './damage.js';
import { WeaponRegistry } from './weapons.js';
import { generateTerrain as generateTerrainFromModule } from './terrain.js';

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

/** @type {Function|null} Callback to update terrain in main.js */
let onTerrainChangeCallback = null;

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
    // Note: module.playerTank is a getter that delegates to main.js
    // So we don't need to set it directly
}

/**
 * Set enemy tank reference directly.
 * @param {import('./tank.js').Tank} tank - Enemy tank
 */
export function setEnemyTank(tank) {
    enemyTank = tank;
    // Note: module.enemyTank is a getter that delegates to main.js
    // So we don't need to set it directly
}

/**
 * Set terrain reference directly.
 * @param {import('./terrain.js').Terrain} t - Terrain instance
 */
export function setTerrain(t) {
    terrain = t;
    // Note: module.terrain is a getter that delegates to main.js
    // So we don't need to set it directly
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


/**
 * Set callback for when terrain is regenerated.
 * This allows main.js to update its currentTerrain reference.
 * @param {Function} callback - Function that receives new terrain instance
 */
export function setOnTerrainChange(callback) {
    onTerrainChangeCallback = callback;
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
// TRAJECTORY COLLECTION API
// =============================================================================

/**
 * Fire a projectile and collect comprehensive trajectory data.
 * This function simulates the trajectory and calculates damage without
 * actually modifying game state, making it ideal for physics validation.
 *
 * @param {Object} options - Fire options
 * @param {number} [options.angle=45] - Launch angle in degrees
 * @param {number} [options.power=50] - Launch power percentage (0-100)
 * @param {string} [options.weaponId='basic-shot'] - Weapon ID to use for damage calculation
 * @param {number} [options.wind] - Wind value (uses current game wind if not specified)
 * @returns {Object} Comprehensive trajectory and impact data
 */
export function fireAndCollect(options = {}) {
    const {
        angle = 45,
        power = 50,
        weaponId = 'basic-shot',
        wind = Wind.getWind()
    } = options;

    // Validate inputs
    if (typeof angle !== 'number' || angle < PHYSICS.MIN_ANGLE || angle > PHYSICS.MAX_ANGLE) {
        return {
            success: false,
            error: `Invalid angle: ${angle}. Must be between ${PHYSICS.MIN_ANGLE} and ${PHYSICS.MAX_ANGLE}`
        };
    }

    if (typeof power !== 'number' || power < PHYSICS.MIN_POWER || power > PHYSICS.MAX_POWER) {
        return {
            success: false,
            error: `Invalid power: ${power}. Must be between ${PHYSICS.MIN_POWER} and ${PHYSICS.MAX_POWER}`
        };
    }

    // Get weapon data for damage calculation
    const weapon = WeaponRegistry.getWeapon(weaponId);
    if (!weapon) {
        return {
            success: false,
            error: `Unknown weapon: ${weaponId}`
        };
    }

    // Run the simulation to get trajectory
    const simulation = simulateProjectile({
        angle,
        power,
        wind,
        maxSteps: 1000 // Higher limit for full trajectory
    });

    if (!simulation.success) {
        return simulation;
    }

    // Calculate damage if a tank was hit
    let damageDealt = 0;
    let hitTankHealth = null;
    let hitTankTeam = null;

    if (simulation.tankHit) {
        const hitTank = simulation.tankHit === 'enemy'
            ? (module.enemyTank || enemyTank)
            : (module.playerTank || playerTank);

        if (hitTank) {
            hitTankHealth = hitTank.health;
            hitTankTeam = hitTank.team;

            // Calculate damage using the actual damage system
            const explosion = {
                x: simulation.landingX,
                y: simulation.landingY,
                blastRadius: weapon.blastRadius
            };

            damageDealt = calculateDamage(explosion, hitTank, weapon);
        }
    }

    // Also calculate potential damage to both tanks if terrain was hit
    // (explosion splash damage can hit tanks near the impact point)
    let playerDamage = 0;
    let enemyDamage = 0;

    if (simulation.terrainHit && simulation.landingX !== null && simulation.landingY !== null) {
        const explosion = {
            x: simulation.landingX,
            y: simulation.landingY,
            blastRadius: weapon.blastRadius
        };

        const player = module.playerTank || playerTank;
        const enemy = module.enemyTank || enemyTank;

        if (player && !player.isDestroyed) {
            playerDamage = calculateDamage(explosion, player, weapon);
        }
        if (enemy && !enemy.isDestroyed) {
            enemyDamage = calculateDamage(explosion, enemy, weapon);
        }
    }

    // Build result object matching the spec from the issue description
    const result = {
        success: true,
        // Input parameters
        angle,
        power,
        wind,
        weaponId,
        // Trajectory data
        trajectory: simulation.trajectory, // Array of {x, y, t} points
        // Flight statistics
        maxHeight: simulation.maxHeightAboveStart, // Height above starting point
        maxHeightY: simulation.maxHeight, // Actual Y coordinate of apex
        maxHeightX: simulation.maxHeightX, // X coordinate at apex
        flightTime: simulation.flightTime, // Total steps
        // Landing data
        landingX: simulation.landingX,
        landingY: simulation.landingY,
        // Collision data
        tankHit: simulation.tankHit, // 'player' | 'enemy' | null
        terrainHit: simulation.terrainHit,
        outOfBounds: simulation.outOfBounds,
        // Damage data
        damageDealt, // Damage to the directly hit tank
        hitTankTeam, // Team of tank that was hit
        hitTankHealth, // Health of tank before damage
        // Splash damage (for terrain hits)
        splashDamage: {
            player: playerDamage,
            enemy: enemyDamage
        },
        // Weapon info
        weapon: {
            name: weapon.name,
            baseDamage: weapon.damage,
            blastRadius: weapon.blastRadius
        },
        // Starting position
        startX: simulation.startX,
        startY: simulation.startY
    };

    console.log(`[TestAPI] fireAndCollect({ angle: ${angle}, power: ${power} }) - ` +
                `flightTime: ${result.flightTime}, maxHeight: ${result.maxHeight?.toFixed(1)}, ` +
                `landingX: ${result.landingX?.toFixed(1)}, tankHit: ${result.tankHit}, ` +
                `damageDealt: ${result.damageDealt}`);

    return result;
}

/**
 * Validate projectile physics by comparing expected range with actual landing position.
 * Useful for automated testing and physics regression detection.
 *
 * @param {Object} options - Validation options
 * @param {number} options.angle - Launch angle in degrees
 * @param {number} options.power - Launch power percentage (0-100)
 * @param {number} options.expectedRange - Expected horizontal distance traveled (in pixels)
 * @param {number} [options.tolerance=10] - Acceptable deviation from expected (in pixels)
 * @param {number} [options.wind=0] - Wind value for simulation (default: 0 for controlled tests)
 * @param {number} [options.expectedMaxHeight] - Optional: expected max height above start
 * @param {number} [options.heightTolerance] - Tolerance for height validation
 * @returns {Object} Validation result with pass/fail and details
 */
export function validatePhysics(options = {}) {
    const {
        angle,
        power,
        expectedRange,
        tolerance = 10,
        wind = 0,
        expectedMaxHeight = null,
        heightTolerance = null
    } = options;

    // Validate required inputs
    if (typeof angle !== 'number') {
        return { success: false, pass: false, error: 'angle is required and must be a number' };
    }
    if (typeof power !== 'number') {
        return { success: false, pass: false, error: 'power is required and must be a number' };
    }
    if (typeof expectedRange !== 'number') {
        return { success: false, pass: false, error: 'expectedRange is required and must be a number' };
    }

    // Run simulation with controlled wind (default 0)
    const simulation = simulateProjectile({
        angle,
        power,
        wind,
        maxSteps: 1000
    });

    if (!simulation.success) {
        return {
            success: false,
            pass: false,
            error: `Simulation failed: ${simulation.error || 'unknown error'}`
        };
    }

    // Calculate actual range (horizontal distance from start to landing)
    const actualRange = simulation.landingX !== null
        ? Math.abs(simulation.landingX - simulation.startX)
        : null;

    // Range validation
    let rangePass = false;
    let rangeDeviation = null;
    let rangeWithinTolerance = false;

    if (actualRange !== null) {
        rangeDeviation = actualRange - expectedRange;
        rangeWithinTolerance = Math.abs(rangeDeviation) <= tolerance;
        rangePass = rangeWithinTolerance;
    }

    // Height validation (optional)
    let heightPass = true; // Default to pass if not testing height
    let heightDeviation = null;
    let heightWithinTolerance = null;

    if (expectedMaxHeight !== null && typeof expectedMaxHeight === 'number') {
        const actualMaxHeight = simulation.maxHeightAboveStart;
        const hTolerance = heightTolerance ?? tolerance;
        heightDeviation = actualMaxHeight - expectedMaxHeight;
        heightWithinTolerance = Math.abs(heightDeviation) <= hTolerance;
        heightPass = heightWithinTolerance;
    }

    // Overall pass/fail
    const pass = rangePass && heightPass;

    const result = {
        success: true,
        pass,
        // Input parameters
        angle,
        power,
        wind,
        // Expected vs actual
        expectedRange,
        actualRange,
        rangeDeviation,
        rangeWithinTolerance,
        tolerance,
        // Height validation (if requested)
        expectedMaxHeight,
        actualMaxHeight: simulation.maxHeightAboveStart,
        heightDeviation,
        heightWithinTolerance,
        heightTolerance: heightTolerance ?? tolerance,
        // Additional simulation data
        flightTime: simulation.flightTime,
        landingX: simulation.landingX,
        landingY: simulation.landingY,
        startX: simulation.startX,
        startY: simulation.startY,
        terrainHit: simulation.terrainHit,
        tankHit: simulation.tankHit,
        outOfBounds: simulation.outOfBounds,
        // Summary message
        message: pass
            ? `PASS: Range ${actualRange?.toFixed(1)}px within ${tolerance}px of expected ${expectedRange}px`
            : `FAIL: Range ${actualRange?.toFixed(1)}px deviates ${rangeDeviation?.toFixed(1)}px from expected ${expectedRange}px (tolerance: ${tolerance}px)`
    };

    console.log(`[TestAPI] validatePhysics({ angle: ${angle}, power: ${power} }) - ${result.message}`);

    return result;
}

// =============================================================================
// TERRAIN AND TANK MANIPULATION API
// =============================================================================

/**
 * Generate new terrain with optional seed for reproducibility.
 * Updates the internal terrain reference and notifies main.js.
 *
 * @param {Object} options - Terrain generation options
 * @param {number} [options.seed] - Seed for reproducible terrain (random if not specified)
 * @param {number} [options.roughness=0.5] - Terrain roughness (0.3-0.7)
 * @param {number} [options.minHeightPercent=0.2] - Minimum height as fraction of screen
 * @param {number} [options.maxHeightPercent=0.7] - Maximum height as fraction of screen
 * @returns {Object} Result with seed used and terrain dimensions
 */
export function generateTerrain(options = {}) {
    const {
        seed = Math.floor(Math.random() * 2147483647),
        roughness = 0.5,
        minHeightPercent = 0.2,
        maxHeightPercent = 0.7
    } = options;

    // Generate new terrain using the terrain module
    const newTerrain = generateTerrainFromModule(undefined, undefined, {
        seed,
        roughness,
        minHeightPercent,
        maxHeightPercent
    });

    // Update our internal reference (fallback for when getter isn't set)
    terrain = newTerrain;

    // Notify main.js to update its reference
    // This will also update what module.terrain getter returns
    if (onTerrainChangeCallback) {
        onTerrainChangeCallback(newTerrain);
    }

    const result = {
        success: true,
        seed,
        width: newTerrain.getWidth(),
        height: newTerrain.getScreenHeight(),
        minHeight: newTerrain.getMinHeight(),
        maxHeight: newTerrain.getMaxHeight(),
        roughness
    };

    console.log(`[TestAPI] generateTerrain({ seed: ${seed} }) - ${result.width}x${result.height}, heights: ${result.minHeight.toFixed(0)}-${result.maxHeight.toFixed(0)}`);

    return result;
}

/**
 * Get terrain height at a specific X position.
 *
 * @param {number} x - X coordinate to query
 * @returns {Object} Result with height and canvas Y position
 */
export function getTerrainAt(x) {
    const currentTerrain = module.terrain || terrain;

    if (!currentTerrain) {
        console.warn('[TestAPI] getTerrainAt: No terrain available');
        return { success: false, error: 'No terrain available' };
    }

    const clampedX = Math.max(0, Math.min(currentTerrain.getWidth() - 1, Math.floor(x)));
    const height = currentTerrain.getHeight(clampedX);
    const canvasY = currentTerrain.getScreenHeight() - height;

    return {
        success: true,
        x: clampedX,
        height,
        canvasY
    };
}

/**
 * Set tank positions on the terrain.
 * Tanks are automatically positioned at the correct Y coordinate based on terrain height.
 *
 * @param {Object} positions - Tank X positions
 * @param {number} [positions.player] - Player tank X position
 * @param {number} [positions.enemy] - Enemy tank X position
 * @returns {Object} Result with final tank positions
 */
export function setTankPositions(positions = {}) {
    const currentTerrain = module.terrain || terrain;
    const player = module.playerTank || playerTank;
    const enemy = module.enemyTank || enemyTank;

    if (!currentTerrain) {
        console.warn('[TestAPI] setTankPositions: No terrain available');
        return { success: false, error: 'No terrain available' };
    }

    const result = {
        success: true,
        player: null,
        enemy: null
    };

    // Position player tank
    if (typeof positions.player === 'number' && player) {
        const x = Math.max(0, Math.min(currentTerrain.getWidth() - 1, Math.floor(positions.player)));
        const terrainHeight = currentTerrain.getHeight(x);
        const canvasY = currentTerrain.getScreenHeight() - terrainHeight;
        player.x = x;
        player.y = canvasY;
        result.player = { x, y: canvasY, terrainHeight };
    }

    // Position enemy tank
    if (typeof positions.enemy === 'number' && enemy) {
        const x = Math.max(0, Math.min(currentTerrain.getWidth() - 1, Math.floor(positions.enemy)));
        const terrainHeight = currentTerrain.getHeight(x);
        const canvasY = currentTerrain.getScreenHeight() - terrainHeight;
        enemy.x = x;
        enemy.y = canvasY;
        result.enemy = { x, y: canvasY, terrainHeight };
    }

    // Log what we did
    if (result.player || result.enemy) {
        const playerInfo = result.player ? `player: (${result.player.x}, ${result.player.y.toFixed(0)})` : '';
        const enemyInfo = result.enemy ? `enemy: (${result.enemy.x}, ${result.enemy.y.toFixed(0)})` : '';
        console.log(`[TestAPI] setTankPositions({ ${[playerInfo, enemyInfo].filter(Boolean).join(', ')} })`);
    }

    return result;
}

/**
 * Get current tank positions.
 *
 * @returns {Object} Current positions of both tanks
 */
export function getTankPositions() {
    const currentTerrain = module.terrain || terrain;
    const player = module.playerTank || playerTank;
    const enemy = module.enemyTank || enemyTank;

    const result = {
        success: true,
        player: null,
        enemy: null
    };

    if (player) {
        result.player = {
            x: player.x,
            y: player.y,
            terrainHeight: currentTerrain ? currentTerrain.getHeight(Math.floor(player.x)) : null
        };
    }

    if (enemy) {
        result.enemy = {
            x: enemy.x,
            y: enemy.y,
            terrainHeight: currentTerrain ? currentTerrain.getHeight(Math.floor(enemy.x)) : null
        };
    }

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
    // Trajectory collection and physics validation
    fireAndCollect,
    validatePhysics,
    // Terrain and tank manipulation
    generateTerrain,
    getTerrainAt,
    setTankPositions,
    getTankPositions,
    // Utility functions
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
    setPlayerAim,
    setOnTerrainChange
};

// Expose on window for console access
if (typeof window !== 'undefined') {
    window.TestAPI = TestAPI;
}

export default TestAPI;
