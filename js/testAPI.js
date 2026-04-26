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

import { GAME_STATES, PHYSICS, TANK } from './constants.js';
import { getAssetGroupStatus, getLoadedCount, getLoadingStatus } from './assets.js';
import { queueGameInput, INPUT_EVENTS, isGameInputEnabled } from './input.js';
import * as Wind from './wind.js';
import * as Turn from './turn.js';
import * as AimingControls from './aimingControls.js?v=20260111a';
import * as TouchAiming from './touchAiming.js';
import * as ControlSettings from './controls/controlSettings.js';
import { getScreenWidth, getScreenHeight } from './screenSize.js';
import { calculateDamage } from './damage.js';
import { WeaponRegistry } from './weapons.js';
import * as HUD from './ui.js?v=20260111d';
import { generateTerrain as generateTerrainFromModule } from './terrain.js';
import * as Sound from './sound.js';
import * as Effects from './effects.js';
import { Stars } from './stars.js';
import * as Tokens from './tokens.js';
import * as TankCollection from './tank-collection.js';
import { DROP_TYPES, processDrop } from './drop-rates.js';
import * as PitySystem from './pity-system.js';
import * as SupplyDrop from './supply-drop.js';
import * as Achievements from './achievements.js';
import * as AchievementPopup from './achievement-popup.js';
import {
    getRenderQualitySummary,
    setRenderQuality as setRenderQualityProfile
} from './renderQuality.js';
import { getParticleCount } from './effects.js';
import { getTerrainDerezEffectCount } from './terrainDerezEffect.js';
import { getPixiTerrainCacheStats, markPixiTerrainLayerDirty } from './pixiTerrainLayer.js';
import { getOrCreateTerrainCellGrid, getTerrainGridStableContactHeight } from './terrainCells.js';
import { updateTankTerrainPosition } from './tank.js';
import {
    evaluatePerformanceBudget,
    getPerformanceSnapshot,
    resetPerformanceMetrics
} from './performanceMetrics.js';
import { getLoopTimingSnapshot, getState as getGameState, setState as setGameState } from './game.js';
import * as RunState from './runState.js';
import * as HighScores from './highScores.js';
import * as LifetimeStats from './lifetime-stats.js';
import * as NameEntry from './nameEntry.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {Object.<string, Object>} Storage for named game state snapshots */
const snapshots = {};

/** @type {import('./tank.js').Tank|null} Reference to player tank */
let playerTank = null;

/** @type {import('./tank.js').Tank|null} Reference to enemy tank */
let enemyTank = null;

/** @type {import('./terrain.js').Terrain|null} Reference to terrain */
let terrain = null;

/** @type {Function|null} Reference to fire projectile function from main.js */
let fireProjectileRef = null;

/** @type {Function|null} Reference to terrain destruction function from main.js */
let destroyTerrainAtRef = null;

/** @type {Function|null} Reference to active Pixi terrain fragment counter */
let getDerezFragmentCountRef = null;

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
 * @param {Function} [refs.destroyTerrainAt] - Function to destroy terrain directly
 * @param {Function} [refs.getDerezFragmentCount] - Function returning active de-rez fragment count
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
    destroyTerrainAtRef = refs.destroyTerrainAt || null;
    getDerezFragmentCountRef = refs.getDerezFragmentCount || null;
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
 * Destroy terrain directly for deterministic visual/effects tests.
 *
 * @param {Object} options
 * @param {number} options.x
 * @param {number} options.y
 * @param {number} options.radius
 * @returns {{success: boolean, destroyed?: boolean, fragments?: number, error?: string}}
 */
export function destroyTerrain(options = {}) {
    if (!destroyTerrainAtRef) {
        console.warn('[TestAPI] destroyTerrain: destroyTerrainAt function not set');
        return { success: false, error: 'Destroy terrain function not initialized' };
    }

    const { x, y, radius } = options;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) {
        return { success: false, error: 'x, y, and radius are required numbers' };
    }

    const destroyed = destroyTerrainAtRef(x, y, radius);
    const fragments = getDerezFragmentCountRef ? getDerezFragmentCountRef() : undefined;
    return {
        success: true,
        destroyed,
        fragments
    };
}

/**
 * Get active Pixi terrain de-rez fragment count.
 *
 * @returns {{success: boolean, fragments?: number, error?: string}}
 */
export function getDerezFragmentCount() {
    if (!getDerezFragmentCountRef) {
        return { success: false, error: 'De-rez fragment counter not initialized' };
    }

    return {
        success: true,
        fragments: getDerezFragmentCountRef()
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
            isFalling: Boolean(player.isFalling),
            targetY: player.targetY ?? null,
            terrainHeight: currentTerrain ? currentTerrain.getHeight(Math.floor(player.x)) : null
        };
    }

    if (enemy) {
        result.enemy = {
            x: enemy.x,
            y: enemy.y,
            isFalling: Boolean(enemy.isFalling),
            targetY: enemy.targetY ?? null,
            terrainHeight: currentTerrain ? currentTerrain.getHeight(Math.floor(enemy.x)) : null
        };
    }

    return result;
}

export function exerciseTankSupportPhysics() {
    const currentTerrain = module.terrain || terrain;
    const player = module.playerTank || playerTank;

    if (!currentTerrain || !player) {
        return { success: false, error: 'Terrain and player tank are required' };
    }

    const grid = getOrCreateTerrainCellGrid(currentTerrain);
    if (!grid) {
        return { success: false, error: 'TerrainCellGrid unavailable' };
    }

    const tankX = Math.round(currentTerrain.getWidth() * 0.32);
    const minCol = Math.max(0, Math.floor((tankX - TANK.WIDTH / 2) / grid.cellSize));
    const maxCol = Math.min(grid.columns - 1, Math.floor((tankX + TANK.WIDTH / 2) / grid.cellSize));
    const lowCount = Math.max(2, Math.floor(grid.rows * 0.14));
    const highCount = Math.min(grid.rows - 1, lowCount + 10);

    for (let col = Math.max(0, minCol - 2); col <= Math.min(grid.columns - 1, maxCol + 2); col++) {
        grid.setColumnSolidCount(col, lowCount);
    }
    grid.setColumnSolidCount(Math.min(maxCol, minCol + 1), highCount);
    grid.setColumnSolidCount(Math.max(minCol, maxCol - 1), highCount);
    grid.writeHeightsToTerrain(currentTerrain);
    markPixiTerrainLayerDirty({ x: tankX, radius: TANK.WIDTH * 1.5 });

    player.x = tankX;
    player.y = currentTerrain.getScreenHeight() - highCount * grid.cellSize;
    player.isFalling = false;
    player.fallVelocity = 0;
    player.targetY = player.y;

    const stableHeight = getTerrainGridStableContactHeight(currentTerrain, tankX, TANK.WIDTH);
    const targetY = currentTerrain.getScreenHeight() - stableHeight;
    const before = {
        x: player.x,
        y: player.y,
        stableHeight,
        targetY
    };
    const startedFalling = updateTankTerrainPosition(player, currentTerrain);

    return {
        success: true,
        startedFalling,
        before,
        after: {
            x: player.x,
            y: player.y,
            isFalling: Boolean(player.isFalling),
            targetY: player.targetY
        },
        footprint: {
            minCol,
            maxCol,
            lowCount,
            highCount,
            cellSize: grid.cellSize
        }
    };
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
 * Get current control state and layout for browser QA smokes.
 * @returns {Object}
 */
export function getControlState() {
    const gameState = getState();
    const aim = playerAimRef
        ? { angle: playerAimRef.angle, power: playerAimRef.power }
        : getAim();

    return {
        success: true,
        inputEnabled: isGameInputEnabled(),
        controlMode: ControlSettings.getControlMode(),
        trajectoryMode: ControlSettings.getTrajectoryMode(),
        slingshotEnabled: ControlSettings.isSlingshotEnabled(),
        slidersVisible: ControlSettings.areSlidersVisible(),
        aimingControlsEnabled: AimingControls.isEnabled(),
        touchAiming: TouchAiming.getState(),
        layout: AimingControls.getControlLayout(),
        weaponBar: {
            layout: HUD.getWeaponBarLayout(),
            slots: HUD.getWeaponSlotPositions()
        },
        aim,
        gameState: getGameState(),
        state: gameState
    };
}

/**
 * Set the runtime control mode for browser QA smokes.
 * @param {string} mode
 * @returns {Object}
 */
export function setControlMode(mode) {
    ControlSettings.setControlMode(mode);
    return {
        success: ControlSettings.getControlMode() === mode,
        controlMode: ControlSettings.getControlMode()
    };
}

// =============================================================================
// HIGH SCORE AND STATISTICS QA API
// =============================================================================

const HIGH_SCORE_QA_STORAGE_KEYS = [
    'scorched_earth_high_scores',
    'scorched_earth_lifetime_stats',
    'scorchedEarth_lifetimeStats',
    'scorched_earth_local_scores',
    'scorched_earth_offline_queue',
    'scorched_earth_player_name'
];

function readJsonStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (_error) {
        return fallback;
    }
}

/**
 * Clear persisted score/stat/name data used by browser QA smokes.
 * @returns {Object}
 */
export function resetHighScoreQaData() {
    for (const key of HIGH_SCORE_QA_STORAGE_KEYS) {
        localStorage.removeItem(key);
    }
    HighScores.clearAllData();
    return { success: true };
}

/**
 * Show the name-entry modal for browser QA.
 * @param {Object} options
 * @returns {Object}
 */
export function showNameEntry(options = {}) {
    NameEntry.show(options);
    return getNameEntryState();
}

/**
 * Get the current name-entry modal state.
 * @returns {Object}
 */
export function getNameEntryState() {
    return {
        success: true,
        isOpen: NameEntry.isOpen(),
        currentName: NameEntry.getCurrentName(),
        storedName: localStorage.getItem('scorched_earth_player_name')
    };
}

/**
 * Exercise run-state stat tracking with deterministic values.
 * @returns {Object}
 */
export function exerciseRunStatistics() {
    RunState.startNewRun();
    RunState.setRoundNumber(5);
    RunState.recordStat('damageDealt', 120);
    RunState.recordStat('damageDealt', 40);
    RunState.recordStat('damageTaken', 35);
    RunState.recordStat('shotFired');
    RunState.recordStat('shotFired');
    RunState.recordStat('shotFired');
    RunState.recordStat('shotHit');
    RunState.recordStat('shotHit');
    RunState.recordStat('enemyDestroyed');
    RunState.recordStat('moneyEarned', 750);
    RunState.recordStat('moneySpent', 200);
    RunState.recordStat('weaponUsed', 'basic-shot');
    RunState.recordStat('weaponUsed', 'laser-blast');
    RunState.recordStat('nukeLaunched');
    RunState.endRun(false);

    return {
        success: true,
        state: RunState.getState(),
        stats: RunState.getRunStats()
    };
}

/**
 * Save a deterministic local/global high score and update display lifetime stats.
 * @param {Object} runStats
 * @returns {Object}
 */
export function saveHighScoreForQa(runStats = {}) {
    const normalized = {
        roundsSurvived: runStats.roundsSurvived ?? 1,
        totalDamageDealt: runStats.totalDamageDealt ?? runStats.totalDamage ?? 0,
        enemiesDestroyed: runStats.enemiesDestroyed ?? 0,
        shotsFired: runStats.shotsFired ?? 0,
        shotsHit: runStats.shotsHit ?? 0,
        moneyEarned: runStats.moneyEarned ?? 0,
        moneySpent: runStats.moneySpent ?? 0,
        biggestHit: runStats.biggestHit ?? 0,
        totalScore: runStats.totalScore ?? ((runStats.roundsSurvived ?? 1) * 1000 + (runStats.totalDamageDealt ?? 0))
    };
    const result = HighScores.saveHighScore(normalized);
    const lifetimeSaved = HighScores.updateLifetimeStats(normalized);

    return {
        success: true,
        result,
        lifetimeSaved,
        scores: HighScores.getHighScores(),
        lifetimeStats: HighScores.getFormattedLifetimeStats()
    };
}

/**
 * Record deterministic aggregate lifetime-stat events.
 * @returns {Object}
 */
export function exerciseLifetimeStatistics() {
    LifetimeStats.recordRunStarted();
    LifetimeStats.recordDamageDealt(160);
    LifetimeStats.recordDamageTaken(35);
    LifetimeStats.recordShot(true);
    LifetimeStats.recordShot(true);
    LifetimeStats.recordShot(false);
    LifetimeStats.recordKill('laser-blast');
    LifetimeStats.recordKill('laser-blast');
    LifetimeStats.recordKill('basic-shot');
    LifetimeStats.recordMoneyEarned(750);
    LifetimeStats.recordWin({
        isFlawless: false,
        roundNumber: 5,
        damageDealt: 160,
        shotsFired: 3,
        shotsHit: 2
    });
    LifetimeStats.recordLoss({ roundNumber: 6 });

    return {
        success: true,
        stats: LifetimeStats.getStats(),
        summary: LifetimeStats.getSummary(),
        accuracy: LifetimeStats.getOverallAccuracy(),
        favoriteWeapon: LifetimeStats.getFavoriteWeapon(),
        stored: readJsonStorage('scorchedEarth_lifetimeStats', null)
    };
}

/**
 * Get persisted high-score/stat data and active leaderboard state.
 * @returns {Object}
 */
export function getHighScoreQaState() {
    return {
        success: true,
        gameState: getGameState(),
        highScores: HighScores.getHighScores(),
        bestRun: HighScores.getBestRun(),
        bestRound: HighScores.getBestRoundCount(),
        qualifiesLowScore: HighScores.isNewHighScore(1),
        displayLifetimeStats: HighScores.getFormattedLifetimeStats(),
        aggregateLifetimeStats: LifetimeStats.getStats(),
        aggregateLifetimeSummary: LifetimeStats.getSummary(),
        globalLeaderboard: HighScores.getGlobalLeaderboard(),
        connectionStatus: HighScores.getConnectionStatus(),
        stored: {
            playerName: localStorage.getItem('scorched_earth_player_name'),
            highScores: readJsonStorage('scorched_earth_high_scores', []),
            displayLifetimeStats: readJsonStorage('scorched_earth_lifetime_stats', null),
            aggregateLifetimeStats: readJsonStorage('scorchedEarth_lifetimeStats', null),
            localScores: readJsonStorage('scorched_earth_local_scores', [])
        }
    };
}

/**
 * Open the high-scores screen from browser QA.
 * @returns {Object}
 */
export function openHighScoresScreen() {
    if (getGameState() !== GAME_STATES.MENU) {
        setGameState(GAME_STATES.MENU);
    }
    setGameState(GAME_STATES.HIGH_SCORES);
    return {
        success: getGameState() === GAME_STATES.HIGH_SCORES,
        gameState: getGameState()
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
// SNAPSHOT API
// =============================================================================

/**
 * Capture current game state as a named snapshot.
 * Snapshots include terrain heights, tank positions, health, and other game state.
 *
 * @param {string} name - Name for the snapshot (used as key for retrieval)
 * @returns {Object} Result with success status and snapshot data
 */
export function snapshot(name) {
    if (typeof name !== 'string' || !name.trim()) {
        console.warn('[TestAPI] snapshot: name must be a non-empty string');
        return { success: false, error: 'Name must be a non-empty string' };
    }

    const currentTerrain = module.terrain || terrain;
    const player = module.playerTank || playerTank;
    const enemy = module.enemyTank || enemyTank;

    // Capture terrain heights (sample every 10 pixels for efficiency)
    let terrainHeights = null;
    if (currentTerrain) {
        const width = currentTerrain.getWidth();
        terrainHeights = [];
        // Store terrain at regular intervals for comparison
        for (let x = 0; x < width; x += 10) {
            terrainHeights.push({
                x,
                height: currentTerrain.getHeight(x)
            });
        }
    }

    // Capture tank states
    const playerState = player ? {
        x: player.x,
        y: player.y,
        health: player.health,
        angle: player.angle,
        power: player.power,
        currentWeapon: player.currentWeapon,
        isDestroyed: player.isDestroyed || false
    } : null;

    const enemyState = enemy ? {
        x: enemy.x,
        y: enemy.y,
        health: enemy.health,
        isDestroyed: enemy.isDestroyed || false
    } : null;

    // Capture wind and turn state
    const snapshotData = {
        timestamp: Date.now(),
        wind: Wind.getWind(),
        turnPhase: Turn.getPhase(),
        isPlayerTurn: Turn.isPlayerTurn(),
        terrain: terrainHeights,
        player: playerState,
        enemy: enemyState
    };

    // Store the snapshot
    snapshots[name] = snapshotData;

    console.log(`[TestAPI] snapshot('${name}') - captured at ${new Date(snapshotData.timestamp).toISOString()}`);

    return {
        success: true,
        name,
        data: snapshotData
    };
}

/**
 * Compare two named snapshots and return the differences.
 * Useful for before/after verification of game actions.
 *
 * @param {string} beforeName - Name of the "before" snapshot
 * @param {string} afterName - Name of the "after" snapshot
 * @returns {Object} Comparison result with detailed changes
 */
export function compareSnapshots(beforeName, afterName) {
    if (typeof beforeName !== 'string' || !beforeName.trim()) {
        return { success: false, error: 'beforeName must be a non-empty string' };
    }
    if (typeof afterName !== 'string' || !afterName.trim()) {
        return { success: false, error: 'afterName must be a non-empty string' };
    }

    const before = snapshots[beforeName];
    const after = snapshots[afterName];

    if (!before) {
        return { success: false, error: `Snapshot '${beforeName}' not found` };
    }
    if (!after) {
        return { success: false, error: `Snapshot '${afterName}' not found` };
    }

    // Compare terrain
    const terrainChanged = [];
    if (before.terrain && after.terrain) {
        const minLen = Math.min(before.terrain.length, after.terrain.length);
        for (let i = 0; i < minLen; i++) {
            const bh = before.terrain[i];
            const ah = after.terrain[i];
            if (bh.height !== ah.height) {
                terrainChanged.push({
                    x: bh.x,
                    before: bh.height,
                    after: ah.height,
                    delta: ah.height - bh.height
                });
            }
        }
    }

    // Compare health
    const healthChanged = {
        player: null,
        enemy: null
    };

    if (before.player && after.player) {
        if (before.player.health !== after.player.health) {
            healthChanged.player = {
                before: before.player.health,
                after: after.player.health,
                delta: after.player.health - before.player.health
            };
        }
    }

    if (before.enemy && after.enemy) {
        if (before.enemy.health !== after.enemy.health) {
            healthChanged.enemy = {
                before: before.enemy.health,
                after: after.enemy.health,
                delta: after.enemy.health - before.enemy.health
            };
        }
    }

    // Compare positions
    const positionsChanged = {
        player: null,
        enemy: null
    };

    if (before.player && after.player) {
        const dx = after.player.x - before.player.x;
        const dy = after.player.y - before.player.y;
        if (dx !== 0 || dy !== 0) {
            positionsChanged.player = {
                before: { x: before.player.x, y: before.player.y },
                after: { x: after.player.x, y: after.player.y },
                delta: { x: dx, y: dy }
            };
        }
    }

    if (before.enemy && after.enemy) {
        const dx = after.enemy.x - before.enemy.x;
        const dy = after.enemy.y - before.enemy.y;
        if (dx !== 0 || dy !== 0) {
            positionsChanged.enemy = {
                before: { x: before.enemy.x, y: before.enemy.y },
                after: { x: after.enemy.x, y: after.enemy.y },
                delta: { x: dx, y: dy }
            };
        }
    }

    // Compare wind
    let windChanged = null;
    if (before.wind !== after.wind) {
        windChanged = {
            before: before.wind,
            after: after.wind,
            delta: after.wind - before.wind
        };
    }

    // Compare turn state
    let turnChanged = null;
    if (before.turnPhase !== after.turnPhase || before.isPlayerTurn !== after.isPlayerTurn) {
        turnChanged = {
            before: { phase: before.turnPhase, isPlayerTurn: before.isPlayerTurn },
            after: { phase: after.turnPhase, isPlayerTurn: after.isPlayerTurn }
        };
    }

    // Check for destroyed tanks
    const destroyed = {
        player: !before.player?.isDestroyed && after.player?.isDestroyed,
        enemy: !before.enemy?.isDestroyed && after.enemy?.isDestroyed
    };

    // Summarize changes
    const hasChanges = terrainChanged.length > 0 ||
                      healthChanged.player !== null ||
                      healthChanged.enemy !== null ||
                      positionsChanged.player !== null ||
                      positionsChanged.enemy !== null ||
                      windChanged !== null ||
                      turnChanged !== null ||
                      destroyed.player ||
                      destroyed.enemy;

    const result = {
        success: true,
        hasChanges,
        timeDelta: after.timestamp - before.timestamp,
        terrainChanged,
        healthChanged,
        positionsChanged,
        windChanged,
        turnChanged,
        destroyed,
        // Convenience summary
        summary: {
            terrainDamagePoints: terrainChanged.length,
            playerHealthLost: healthChanged.player?.delta ?? 0,
            enemyHealthLost: healthChanged.enemy?.delta ?? 0,
            playerMoved: positionsChanged.player !== null,
            enemyMoved: positionsChanged.enemy !== null,
            playerDestroyed: destroyed.player,
            enemyDestroyed: destroyed.enemy
        }
    };

    console.log(`[TestAPI] compareSnapshots('${beforeName}', '${afterName}') - ` +
                `hasChanges: ${hasChanges}, terrainPoints: ${terrainChanged.length}, ` +
                `playerHealth: ${healthChanged.player?.delta ?? 'unchanged'}, ` +
                `enemyHealth: ${healthChanged.enemy?.delta ?? 'unchanged'}`);

    return result;
}

/**
 * Clear all stored snapshots.
 * Use this to free memory when done with snapshot testing.
 *
 * @returns {Object} Result with count of cleared snapshots
 */
export function clearSnapshots() {
    const count = Object.keys(snapshots).length;

    // Clear all entries
    for (const key of Object.keys(snapshots)) {
        delete snapshots[key];
    }

    console.log(`[TestAPI] clearSnapshots() - cleared ${count} snapshot(s)`);

    return {
        success: true,
        cleared: count
    };
}

/**
 * Get a list of all stored snapshot names.
 *
 * @returns {Object} Result with list of snapshot names
 */
export function listSnapshots() {
    const names = Object.keys(snapshots);

    return {
        success: true,
        count: names.length,
        names
    };
}

/**
 * Get a specific snapshot by name.
 *
 * @param {string} name - Name of the snapshot to retrieve
 * @returns {Object} Result with snapshot data or error
 */
export function getSnapshot(name) {
    if (typeof name !== 'string' || !name.trim()) {
        return { success: false, error: 'Name must be a non-empty string' };
    }

    const data = snapshots[name];
    if (!data) {
        return { success: false, error: `Snapshot '${name}' not found` };
    }

    return {
        success: true,
        name,
        data
    };
}

/**
 * Get the current render quality profile summary.
 * @returns {Object}
 */
export function getRenderQuality() {
    return {
        success: true,
        quality: getRenderQualitySummary()
    };
}

/**
 * Set the render quality profile for testing or debug tuning.
 * @param {string} id - low, balanced, or high
 * @returns {Object}
 */
export function setRenderQuality(id) {
    try {
        const profile = setRenderQualityProfile(id);
        return {
            success: true,
            quality: getRenderQualitySummary(),
            label: profile.label
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get rolling runtime performance metrics and live visual effect counts.
 * @returns {Object}
 */
export function getPerformanceMetrics() {
    const pixiFragments = getDerezFragmentCountRef ? getDerezFragmentCountRef() : 0;
    const loopTiming = getLoopTimingSnapshot();

    return {
        success: true,
        metrics: getPerformanceSnapshot({
            particles: getParticleCount(),
            terrainDerezEffects: getTerrainDerezEffectCount(),
            pixiFragments,
            'loop.fixedTimestep': loopTiming.fixedTimestep,
            'loop.maxFixedUpdatesPerFrame': loopTiming.maxFixedUpdatesPerFrame,
            'loop.accumulator': loopTiming.accumulator,
            'loop.interpolationAlpha': loopTiming.interpolationAlpha,
            'loop.lastFixedSteps': loopTiming.lastUpdatePlan.steps,
            'loop.lastDroppedTime': loopTiming.lastUpdatePlan.droppedTime,
            ...Object.fromEntries(
                Object.entries(getPixiTerrainCacheStats()).map(([key, value]) => [`pixiTerrain.${key}`, value])
            )
        }),
        loopTiming
    };
}

/**
 * Reset rolling performance metrics before a smoke scenario.
 * @returns {Object}
 */
export function resetPerformance() {
    resetPerformanceMetrics();
    return { success: true };
}

/**
 * Evaluate the current performance snapshot against budgets.
 * @param {Object} budgets
 * @returns {Object}
 */
export function checkPerformanceBudget(budgets = {}) {
    const metrics = getPerformanceMetrics().metrics;
    const result = evaluatePerformanceBudget(metrics, budgets);
    return {
        success: true,
        metrics,
        ...result
    };
}

/**
 * Get grouped asset loading status for startup/lazy-load smokes.
 * @returns {Object}
 */
export function getAssetStatus() {
    return {
        success: true,
        loadedCount: getLoadedCount(),
        loading: getLoadingStatus(),
        groups: getAssetGroupStatus()
    };
}

// =============================================================================
// PROGRESSION, COLLECTION, AND SETTINGS QA API
// =============================================================================

/**
 * Clear level progression data used by browser QA smokes.
 * @returns {Object}
 */
export function resetProgressionQaData() {
    Stars.resetAll();
    return getProgressionQaState();
}

/**
 * Record deterministic level completion data through the production star system.
 * @param {Object} options
 * @returns {Object}
 */
export function completeLevelForQa(options = {}) {
    const {
        levelId = 'world1-level1',
        stats = {
            damageDealt: 120,
            accuracy: 1,
            turnsUsed: 1,
            won: true
        }
    } = options;

    const previousStars = Stars.getForLevel(levelId);
    const result = Stars.recordCompletion(levelId, stats);
    return {
        success: true,
        levelId,
        previousStars,
        result,
        progression: getProgressionQaState()
    };
}

/**
 * Get persisted level progression state for browser QA.
 * @returns {Object}
 */
export function getProgressionQaState() {
    return {
        success: true,
        gameState: getGameState(),
        totalStars: Stars.getTotalStars(),
        world1: Stars.getWorldStars(1),
        worldUnlocks: Stars.getWorldUnlockStatus(),
        nextLockedWorld: Stars.getNextLockedWorld(),
        progress: Stars.getProgress(),
        stored: readJsonStorage('scorched_earth_stars', null)
    };
}

/**
 * Reset collection/drop state used by browser QA smokes.
 * @returns {Object}
 */
export function resetCollectionQaData() {
    localStorage.removeItem('scorchedEarth_collection');
    localStorage.removeItem('scorchedEarth_tokens');
    localStorage.removeItem('scorchedEarth_pityState');
    TankCollection.init();
    PitySystem.init();
    Tokens.init();
    return getCollectionQaState();
}

/**
 * Grant token currency through the production token module.
 * @param {number} amount
 * @returns {Object}
 */
export function grantTokensForQa(amount = 50) {
    Tokens.init();
    Tokens.addTokens(amount, 'browser_qa');
    return getCollectionQaState();
}

/**
 * Process a deterministic browser-QA supply drop and optionally start the overlay animation.
 * @param {Object} options
 * @returns {Object}
 */
export function openSupplyDropForQa(options = {}) {
    const { dropType = DROP_TYPES.STANDARD, playAnimation = true, spendTokens = 0 } = options;
    TankCollection.init();
    PitySystem.init();
    Tokens.init();

    const spent = spendTokens > 0 ? Tokens.spendTokens(spendTokens) : true;
    const drop = processDrop(dropType);
    if (playAnimation && drop.tank) {
        SupplyDrop.play(drop.tank);
    }

    return {
        success: !!drop.tank && spent,
        spent,
        drop,
        animation: {
            isAnimating: SupplyDrop.isAnimating(),
            revealTank: SupplyDrop.getRevealTank()
        },
        collection: getCollectionQaState()
    };
}

/**
 * Equip an owned tank for browser QA.
 * @param {string} tankId
 * @returns {Object}
 */
export function equipTankForQa(tankId) {
    TankCollection.init();
    const equipped = TankCollection.setEquippedTank(tankId);
    return {
        success: equipped,
        tankId,
        collection: getCollectionQaState()
    };
}

/**
 * Build up pity counters using deterministic rarity inputs.
 * @param {Object} options
 * @returns {Object}
 */
export function buildPityForQa(options = {}) {
    const { rarity = 'common', count = 1 } = options;
    PitySystem.init();
    for (let i = 0; i < count; i++) {
        PitySystem.onDropResult(rarity);
    }
    return getCollectionQaState();
}

/**
 * Get collection/drop state for browser QA.
 * @returns {Object}
 */
export function getCollectionQaState() {
    TankCollection.init();
    Tokens.init();
    PitySystem.init();
    return {
        success: true,
        gameState: getGameState(),
        collection: {
            ...TankCollection.getState(),
            progress: TankCollection.getCollectionProgress(),
            equippedTankId: TankCollection.getEquippedTankId()
        },
        tokens: {
            balance: Tokens.getTokenBalance(),
            lifetime: Tokens.getLifetimeStats()
        },
        pity: {
            state: PitySystem.getPityState(),
            bonus: PitySystem.getPityBonus(),
            progress: PitySystem.getPityProgress(),
            displayMessage: PitySystem.getPityDisplayMessage()
        },
        supplyDrop: {
            isAnimating: SupplyDrop.isAnimating(),
            revealTank: SupplyDrop.getRevealTank()
        },
        stored: {
            collection: readJsonStorage('scorchedEarth_collection', null),
            tokens: readJsonStorage('scorchedEarth_tokens', null),
            pity: readJsonStorage('scorchedEarth_pityState', null)
        }
    };
}

// =============================================================================
// ACHIEVEMENT QA API
// =============================================================================

/**
 * Clear achievement state used by browser QA smokes.
 * @returns {Object}
 */
export function resetAchievementQaData() {
    localStorage.removeItem('scorched_earth_achievements');
    localStorage.removeItem('scorchedEarth_tokens');
    Achievements.resetAchievementState();
    Achievements.clearRoundAchievements();
    AchievementPopup.clearAll();
    return getAchievementQaState();
}

/**
 * Unlock an achievement through the production achievement system.
 * @param {string} achievementId
 * @returns {Object}
 */
export function unlockAchievementForQa(achievementId) {
    const before = getAchievementQaState();
    const result = Achievements.unlockAchievement(achievementId);
    return {
        success: result.unlocked,
        achievementId,
        result,
        before,
        after: getAchievementQaState()
    };
}

/**
 * Unlock multiple achievements through the production achievement system.
 * @param {string[]} achievementIds
 * @returns {Object}
 */
export function unlockAchievementsForQa(achievementIds = []) {
    const before = getAchievementQaState();
    const results = achievementIds.map(achievementId => ({
        achievementId,
        result: Achievements.unlockAchievement(achievementId)
    }));
    return {
        success: results.every(entry => entry.result.unlocked),
        results,
        before,
        after: getAchievementQaState()
    };
}

/**
 * Update an achievement counter through the production achievement system.
 * @param {Object} options
 * @returns {Object}
 */
export function progressAchievementForQa(options = {}) {
    const {
        achievementId = 'sharpshooter',
        value = 1,
        increment = true
    } = options;
    const result = Achievements.updateAchievementProgress(achievementId, value, increment);
    return {
        success: result.updated || result.unlocked,
        achievementId,
        result,
        after: getAchievementQaState()
    };
}

/**
 * Get achievement, popup, and reward state for browser QA.
 * @returns {Object}
 */
export function getAchievementQaState() {
    const all = Achievements.getAllAchievements();
    const visible = Achievements.getVisibleAchievements();
    return {
        success: true,
        gameState: getGameState(),
        stats: Achievements.getAchievementStats(),
        state: Achievements.getAchievementState(),
        unlockedIds: Achievements.getUnlockedAchievementIds(),
        unviewedCount: Achievements.getUnviewedCount(),
        roundAchievements: Achievements.getRoundAchievements(),
        visibleAchievements: visible.map(achievement => ({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            tokenReward: achievement.tokenReward,
            unlocked: Achievements.isAchievementUnlocked(achievement.id),
            progress: Achievements.getAchievementProgress(achievement.id)
        })),
        totalAchievements: all.length,
        tokens: {
            balance: Tokens.getTokenBalance(),
            lifetime: Tokens.getLifetimeStats()
        },
        popup: AchievementPopup.getDebugState(),
        stored: {
            achievements: readJsonStorage('scorched_earth_achievements', null),
            tokens: readJsonStorage('scorchedEarth_tokens', null)
        }
    };
}

/**
 * Dismiss active achievement popups through the QA API.
 * @returns {Object}
 */
export function dismissAchievementPopupsForQa() {
    AchievementPopup.clearAll();
    return getAchievementQaState();
}

/**
 * Change audio/settings values through production modules.
 * @param {Object} options
 * @returns {Object}
 */
export function setSettingsAudioForQa(options = {}) {
    if (typeof options.masterVolume === 'number') {
        Sound.setMasterVolume(options.masterVolume);
    }
    if (typeof options.musicVolume === 'number') {
        Sound.setMusicVolume(options.musicVolume);
    }
    if (typeof options.sfxVolume === 'number') {
        Sound.setSfxVolume(options.sfxVolume);
    }
    if (typeof options.muted === 'boolean') {
        Sound.setMuted(options.muted);
    }
    if (typeof options.crtEnabled === 'boolean') {
        Effects.setCrtEnabled(options.crtEnabled);
    }
    if (options.controlMode) {
        ControlSettings.setControlMode(options.controlMode);
    }
    if (options.trajectoryMode) {
        ControlSettings.setTrajectoryMode(options.trajectoryMode);
    }
    if (options.renderQuality) {
        setRenderQualityProfile(options.renderQuality);
    }
    return getSettingsAudioQaState();
}

/**
 * Get audio/settings state and persisted values for browser QA.
 * @returns {Object}
 */
export function getSettingsAudioQaState() {
    return {
        success: true,
        gameState: getGameState(),
        audio: {
            masterVolume: Sound.getMasterVolume(),
            musicVolume: Sound.getMusicVolume(),
            sfxVolume: Sound.getSfxVolume(),
            muted: Sound.getMuted()
        },
        controls: {
            controlMode: ControlSettings.getControlMode(),
            trajectoryMode: ControlSettings.getTrajectoryMode()
        },
        visual: {
            crtEnabled: Effects.isCrtEnabled(),
            renderQuality: getRenderQualitySummary()
        },
        stored: {
            masterVolume: localStorage.getItem('scorched-earth-master-volume'),
            musicVolume: localStorage.getItem('scorched-earth-music-volume'),
            sfxVolume: localStorage.getItem('scorched-earth-sfx-volume'),
            muted: localStorage.getItem('scorched-earth-muted'),
            crtEnabled: localStorage.getItem('scorched_earth_crt_enabled'),
            controlMode: localStorage.getItem('scorched_control_mode'),
            trajectoryMode: localStorage.getItem('scorched_trajectory_mode'),
            renderQuality: localStorage.getItem('scorched_earth_render_quality')
        }
    };
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
    destroyTerrain,
    getDerezFragmentCount,
    setTankPositions,
    getTankPositions,
    exerciseTankSupportPhysics,
    // Snapshot testing
    snapshot,
    compareSnapshots,
    clearSnapshots,
    listSnapshots,
    getSnapshot,
    // Utility functions
    getAim,
    getWind,
    getWindForce,
    getState,
    getControlState,
    setControlMode,
    resetHighScoreQaData,
    showNameEntry,
    getNameEntryState,
    exerciseRunStatistics,
    saveHighScoreForQa,
    exerciseLifetimeStatistics,
    getHighScoreQaState,
    openHighScoresScreen,
    getRenderQuality,
    setRenderQuality,
    getPerformanceMetrics,
    resetPerformance,
    checkPerformanceBudget,
    getAssetStatus,
    resetProgressionQaData,
    completeLevelForQa,
    getProgressionQaState,
    resetCollectionQaData,
    grantTokensForQa,
    openSupplyDropForQa,
    equipTankForQa,
    buildPityForQa,
    getCollectionQaState,
    resetAchievementQaData,
    unlockAchievementForQa,
    unlockAchievementsForQa,
    progressAchievementForQa,
    getAchievementQaState,
    dismissAchievementPopupsForQa,
    setSettingsAudioForQa,
    getSettingsAudioQaState,
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
