/**
 * Scorched Earth: Synthwave Edition
 * AI System
 *
 * Provides AI opponents for the game with varying difficulty levels.
 * Each difficulty level has different accuracy and behavior characteristics.
 */

import { PHYSICS } from './constants.js';
import { getScreenWidth, getScreenHeight } from './screenSize.js';
import { WEAPON_TYPES, WeaponRegistry } from './weapons.js';

// =============================================================================
// AI DIFFICULTY LEVELS
// =============================================================================

/**
 * AI difficulty level configurations.
 * Each level defines error ranges and behavior characteristics.
 */
export const AI_DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    HARD_PLUS: 'hard_plus'
};

/**
 * Configuration for each difficulty level.
 * Defines error ranges and special behaviors.
 */
const DIFFICULTY_CONFIG = {
    [AI_DIFFICULTY.EASY]: {
        name: 'Easy',
        // Error ranges - makes shots inaccurate
        angleErrorMin: -15, // degrees
        angleErrorMax: 15,  // degrees
        powerErrorMin: -20, // percent
        powerErrorMax: 20,  // percent
        // No wind compensation - Easy AI ignores wind
        compensatesWind: false,
        // Only uses basic weapon
        onlyBasicWeapon: true,
        // Thinking delay range in milliseconds
        thinkingDelayMin: 1000,
        thinkingDelayMax: 2000
    },
    [AI_DIFFICULTY.MEDIUM]: {
        name: 'Medium',
        angleErrorMin: -8,
        angleErrorMax: 8,
        powerErrorMin: -10,
        powerErrorMax: 10,
        compensatesWind: true, // Medium AI tries to compensate for wind (imperfectly)
        windCompensationAccuracy: 0.5, // 50% accurate wind compensation
        onlyBasicWeapon: false,
        thinkingDelayMin: 800,
        thinkingDelayMax: 1500
    },
    [AI_DIFFICULTY.HARD]: {
        name: 'Hard',
        angleErrorMin: -3,
        angleErrorMax: 3,
        powerErrorMin: -5,
        powerErrorMax: 5,
        compensatesWind: true,
        windCompensationAccuracy: 0.85, // 85% accurate wind compensation
        onlyBasicWeapon: false,
        thinkingDelayMin: 500,
        thinkingDelayMax: 1000
    },
    [AI_DIFFICULTY.HARD_PLUS]: {
        name: 'Hard+',
        angleErrorMin: -2,
        angleErrorMax: 2,
        powerErrorMin: -3,
        powerErrorMax: 3,
        compensatesWind: true,
        windCompensationAccuracy: 0.95, // 95% accurate wind compensation - nearly perfect
        onlyBasicWeapon: false,
        thinkingDelayMin: 300,
        thinkingDelayMax: 600
    }
};

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {string} Current AI difficulty level */
let currentDifficulty = AI_DIFFICULTY.EASY;

/** @type {boolean} Whether debug mode is enabled for AI decisions */
let debugMode = false;

/** @type {string[]} Current weapon pool available to AI (based on round) */
let currentWeaponPool = ['basic-shot'];

// =============================================================================
// DIFFICULTY MANAGEMENT
// =============================================================================

/**
 * Set the AI difficulty level.
 * @param {string} difficulty - Difficulty from AI_DIFFICULTY enum
 */
export function setDifficulty(difficulty) {
    if (!DIFFICULTY_CONFIG[difficulty]) {
        console.error(`[AI] Invalid difficulty: ${difficulty}`);
        return;
    }
    currentDifficulty = difficulty;
    if (debugMode) {
        console.log(`[AI] Difficulty set to: ${DIFFICULTY_CONFIG[difficulty].name}`);
    }
}

/**
 * Get the current AI difficulty level.
 * @returns {string} Current difficulty
 */
export function getDifficulty() {
    return currentDifficulty;
}

/**
 * Get the configuration for the current difficulty.
 * @returns {Object} Difficulty configuration
 */
export function getDifficultyConfig() {
    return DIFFICULTY_CONFIG[currentDifficulty];
}

// =============================================================================
// AIMING CALCULATION
// =============================================================================

/**
 * Calculate the angle from the AI tank to the player tank.
 * Uses direct line calculation (no arc compensation).
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @returns {number} Angle in degrees (0-180, where 90 is straight up)
 */
function calculateDirectAngle(aiTank, playerTank) {
    // Calculate the difference in positions
    // AI is typically on the right, player on the left
    const dx = playerTank.x - aiTank.x;
    const dy = aiTank.y - playerTank.y; // Inverted because canvas Y increases downward

    // Calculate angle using atan2
    // atan2 returns radians from -π to π, with 0 pointing right
    const radians = Math.atan2(dy, dx);

    // Convert to degrees
    // In our tank coordinate system: 0° = right, 90° = up, 180° = left
    // atan2 with positive dy (target above) and negative dx (target to left)
    // returns angle in range (-π, π)
    let degrees = radians * (180 / Math.PI);

    // atan2 returns negative angles for points below horizontal (negative dy)
    // For our tank system, we want 0-180 where:
    // - Angles in upper half (positive dy) map directly
    // - Angles in lower half need adjustment
    // Since tanks fire upward, we want to ensure the angle aims upward
    // If the direct angle would aim downward (negative degrees), we should
    // aim at a reasonable upward angle instead
    if (degrees < 0) {
        // Target is below us - aim at a moderate upward angle instead
        // This prevents the AI from trying to shoot downward
        degrees = Math.abs(degrees);
    }

    // Clamp to valid range (0-180)
    degrees = Math.max(0, Math.min(180, degrees));

    return degrees;
}

// =============================================================================
// BALLISTIC CALCULATION (Medium/Hard AI)
// =============================================================================

/**
 * Physics constants for ballistic calculation.
 * Must match values in constants.js and projectile.js
 */
const BALLISTIC_CONSTANTS = {
    GRAVITY: 0.15,          // Gravity per frame (pixels/frame²)
    MAX_VELOCITY: 20        // Maximum projectile speed at 100% power
};

/**
 * Calculate ballistic trajectory to hit a target, accounting for gravity.
 * Uses projectile motion equations to find angle and power.
 *
 * For projectile motion without wind:
 * x = v0 * cos(θ) * t
 * y = v0 * sin(θ) * t - 0.5 * g * t²
 *
 * Solving for angle given target (dx, dy) and chosen power:
 * tan(θ) = (v0² ± √(v0⁴ - g*(g*dx² + 2*dy*v0²))) / (g*dx)
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @returns {{angle: number, power: number}} Calculated angle and power
 */
function calculateBallisticAim(aiTank, playerTank) {
    // Get fire position (tip of turret)
    const firePos = aiTank.getFirePosition ? aiTank.getFirePosition() : { x: aiTank.x, y: aiTank.y };
    const targetPos = { x: playerTank.x, y: playerTank.y };

    // Calculate displacement to target
    // dx is horizontal distance (positive = target to the right)
    // dy is vertical drop (positive = target below us in game coords, but we flip for physics)
    const dx = targetPos.x - firePos.x;
    // In canvas coords, Y increases downward, but for physics we want Y increasing upward
    // dy positive means target is ABOVE us (which is good for ballistics)
    const dy = firePos.y - targetPos.y;

    const g = BALLISTIC_CONSTANTS.GRAVITY;
    const distance = Math.abs(dx);

    // Start with a reasonable power based on distance
    // Scale power: at 300px -> ~50%, at 800px -> ~80%
    let power = 40 + (distance / getScreenWidth()) * 50;
    power = Math.min(95, Math.max(35, power)); // Clamp to reasonable range

    // Convert power to velocity
    const v0 = (power / 100) * BALLISTIC_CONSTANTS.MAX_VELOCITY;
    const v0Sq = v0 * v0;

    // Calculate discriminant for ballistic formula
    // discriminant = v0⁴ - g*(g*dx² + 2*dy*v0²)
    const discriminant = v0Sq * v0Sq - g * (g * dx * dx + 2 * dy * v0Sq);

    let angle;

    if (discriminant >= 0) {
        // Two solutions exist - choose the lower angle (more direct shot)
        // tan(θ) = (v0² - √discriminant) / (g*dx)  for low trajectory
        // tan(θ) = (v0² + √discriminant) / (g*dx)  for high trajectory
        const sqrtDisc = Math.sqrt(discriminant);

        // For AI shooting left (dx < 0), we need to flip the formula
        // The angle should be > 90° (pointing left)
        if (dx < 0) {
            // Target is to the left
            // Use the formula with absolute dx, then adjust angle
            const absDx = Math.abs(dx);
            const tanTheta = (v0Sq - sqrtDisc) / (g * absDx);
            const baseAngle = Math.atan(tanTheta) * (180 / Math.PI);
            // Mirror for shooting left: angle = 180 - baseAngle
            angle = 180 - baseAngle;
        } else {
            // Target is to the right
            const tanTheta = (v0Sq - sqrtDisc) / (g * dx);
            angle = Math.atan(tanTheta) * (180 / Math.PI);
        }

        // If the calculated angle is invalid, fall back to estimation
        if (isNaN(angle) || angle < 0 || angle > 180) {
            angle = calculateEstimatedAngle(dx, dy, distance);
        }
    } else {
        // No solution with current power - target is too far
        // Increase power and estimate angle
        power = 90;
        angle = calculateEstimatedAngle(dx, dy, distance);
    }

    // Ensure angle is in valid range
    angle = Math.max(15, Math.min(165, angle));

    if (debugMode) {
        console.log('[AI] Ballistic calculation:');
        console.log(`[AI]   dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}, distance=${distance.toFixed(1)}`);
        console.log(`[AI]   v0=${v0.toFixed(2)}, discriminant=${discriminant.toFixed(2)}`);
        console.log(`[AI]   Calculated angle=${angle.toFixed(1)}°, power=${power.toFixed(1)}%`);
    }

    return { angle, power };
}

/**
 * Estimate angle when exact ballistic solution isn't available.
 * Uses a heuristic based on target direction and distance.
 *
 * @param {number} dx - Horizontal displacement to target
 * @param {number} dy - Vertical displacement to target (positive = target above)
 * @param {number} distance - Absolute horizontal distance
 * @returns {number} Estimated angle in degrees
 */
function calculateEstimatedAngle(dx, dy, distance) {
    // Base angle: 45° is optimal for max range on flat ground
    let baseAngle = 45;

    // Adjust for target height difference
    // If target is above us (dy > 0), increase angle
    // If target is below us (dy < 0), decrease angle
    const heightAdjust = Math.atan2(dy, distance) * (180 / Math.PI) * 0.5;
    baseAngle += heightAdjust;

    // If target is to the left (dx < 0), mirror the angle
    if (dx < 0) {
        baseAngle = 180 - baseAngle;
    }

    return baseAngle;
}

// =============================================================================
// HARD AI - ITERATIVE TRAJECTORY SOLVER
// =============================================================================

/**
 * Simulate a projectile trajectory and return where it lands.
 * Used by Hard AI to find optimal angle/power combination.
 *
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position (canvas coords, Y=0 is top)
 * @param {number} angle - Fire angle in degrees
 * @param {number} power - Fire power (0-100)
 * @param {number} windValue - Current wind value
 * @param {import('./terrain.js').Terrain} terrain - Terrain for collision checking
 * @returns {{x: number, y: number, hit: boolean, blocked: boolean, blockX: number, blockY: number}}
 *          Landing position, whether it hit terrain, and if it was blocked by terrain en route
 */
function simulateTrajectory(startX, startY, angle, power, windValue, terrain) {
    const g = BALLISTIC_CONSTANTS.GRAVITY;
    const maxVelocity = BALLISTIC_CONSTANTS.MAX_VELOCITY;

    // Convert angle to radians and calculate initial velocity
    const angleRad = angle * Math.PI / 180;
    const v0 = (power / 100) * maxVelocity;

    // Initial velocity components
    let vx = Math.cos(angleRad) * v0;
    let vy = -Math.sin(angleRad) * v0; // Negative because canvas Y increases downward

    // Wind force per frame
    const windForce = windValue * PHYSICS.WIND_FORCE_MULTIPLIER;

    // Position
    let x = startX;
    let y = startY;

    // Track if projectile was blocked by terrain before reaching target area
    let blocked = false;
    let blockX = 0;
    let blockY = 0;

    // Simulate up to 2000 frames (should be more than enough)
    const maxFrames = 2000;

    for (let frame = 0; frame < maxFrames; frame++) {
        // Store previous position for collision checking
        const prevX = x;
        const prevY = y;

        // Apply physics
        vx += windForce;
        vy += g;

        // Update position
        x += vx;
        y += vy;

        // Check bounds - projectile went off screen
        if (x < 0 || x >= getScreenWidth()) {
            return { x, y, hit: false, blocked, blockX, blockY };
        }

        // Check terrain collision
        if (terrain) {
            const collision = terrain.checkTerrainCollision(x, y);
            if (collision && collision.hit) {
                // Check if this is early terrain blockage (before apex and far from target)
                // Apex detection: vy was negative (going up) and now positive (going down)
                if (vy < 0 && !blocked) {
                    // Still ascending, check if terrain is blocking
                    blocked = true;
                    blockX = collision.x;
                    blockY = collision.y;
                }
                return { x: collision.x, y: collision.y, hit: true, blocked, blockX, blockY };
            }
        }

        // Check if projectile fell below bottom of screen
        // Use dynamic screen height for proper bounds on all screen sizes
        const screenHeight = getScreenHeight();
        if (y >= screenHeight) {
            return { x, y: screenHeight, hit: true, blocked, blockX, blockY };
        }
    }

    // Max frames reached without landing
    return { x, y, hit: false, blocked, blockX, blockY };
}

/**
 * Check if terrain blocks the path between AI and player.
 * Used to determine if a high arc or digger weapon is needed.
 *
 * @param {import('./tank.js').Tank} aiTank - AI's tank
 * @param {import('./tank.js').Tank} playerTank - Player's tank
 * @param {import('./terrain.js').Terrain} terrain - Terrain to check
 * @returns {{blocked: boolean, blockX: number, maxTerrainHeight: number}}
 */
function checkTerrainObstruction(aiTank, playerTank, terrain) {
    if (!terrain) {
        return { blocked: false, blockX: 0, maxTerrainHeight: 0 };
    }

    const startX = Math.min(aiTank.x, playerTank.x);
    const endX = Math.max(aiTank.x, playerTank.x);

    // Get the height of both tanks (in canvas coords, lower Y = higher position)
    const aiSurfaceY = aiTank.y;
    const playerSurfaceY = playerTank.y;
    const lineOfSightY = Math.min(aiSurfaceY, playerSurfaceY) - 20; // Slightly above the higher tank

    let maxTerrainHeight = 0;
    let blocked = false;
    let blockX = 0;

    // Check terrain height along the path
    for (let x = startX + 10; x < endX - 10; x += 5) {
        const terrainHeight = terrain.getHeight(x);
        const terrainY = terrain.getScreenHeight() - terrainHeight;

        if (terrainHeight > maxTerrainHeight) {
            maxTerrainHeight = terrainHeight;
        }

        // If terrain is above the line of sight, it's blocking
        if (terrainY < lineOfSightY) {
            blocked = true;
            blockX = x;
        }
    }

    return { blocked, blockX, maxTerrainHeight };
}

/**
 * Check if player is in a valley (surrounded by higher terrain).
 * Used to determine if Roller weapon would be effective.
 *
 * @param {import('./tank.js').Tank} playerTank - Player's tank
 * @param {import('./terrain.js').Terrain} terrain - Terrain to check
 * @returns {boolean} True if player is in a valley
 */
function isPlayerInValley(playerTank, terrain) {
    if (!terrain) return false;

    const playerX = Math.floor(playerTank.x);
    const playerTerrainHeight = terrain.getHeight(playerX);

    // Check terrain height on both sides of the player
    const checkDistance = 100; // pixels to check on each side
    let higherOnLeft = false;
    let higherOnRight = false;

    // Check left side
    for (let x = playerX - 20; x >= Math.max(0, playerX - checkDistance); x -= 10) {
        if (terrain.getHeight(x) > playerTerrainHeight + 30) {
            higherOnLeft = true;
            break;
        }
    }

    // Check right side
    for (let x = playerX + 20; x <= Math.min(getScreenWidth() - 1, playerX + checkDistance); x += 10) {
        if (terrain.getHeight(x) > playerTerrainHeight + 30) {
            higherOnRight = true;
            break;
        }
    }

    // Player is in a valley if terrain is higher on at least one side
    // and they're at a relatively low point
    return higherOnLeft || higherOnRight;
}

/**
 * Iterative solver to find optimal angle and power for Hard AI.
 * Simulates multiple trajectories to find the best shot.
 *
 * @param {import('./tank.js').Tank} aiTank - AI's tank
 * @param {import('./tank.js').Tank} playerTank - Player's tank
 * @param {number} windValue - Current wind value
 * @param {import('./terrain.js').Terrain} terrain - Terrain for collision checking
 * @returns {{angle: number, power: number, confidence: number}}
 */
function iterativeSolver(aiTank, playerTank, windValue, terrain) {
    const firePos = aiTank.getFirePosition ? aiTank.getFirePosition() : { x: aiTank.x, y: aiTank.y };
    const targetX = playerTank.x;
    const targetY = playerTank.y;

    // Determine if we're shooting left or right
    const shootingLeft = targetX < firePos.x;

    // Start with ballistic calculation as initial guess
    const initialGuess = calculateBallisticAim(aiTank, playerTank);

    let bestAngle = initialGuess.angle;
    let bestPower = initialGuess.power;
    let bestDistance = Infinity;
    let confidence = 0;

    // Search range around initial guess
    const angleRange = 30; // Search ±30° around initial guess
    const powerRange = 30; // Search ±30% around initial guess

    // Coarse search first
    const angleStep = 5;
    const powerStep = 10;

    for (let angleOffset = -angleRange; angleOffset <= angleRange; angleOffset += angleStep) {
        const testAngle = Math.max(10, Math.min(170, initialGuess.angle + angleOffset));

        for (let powerOffset = -powerRange; powerOffset <= powerRange; powerOffset += powerStep) {
            const testPower = Math.max(20, Math.min(100, initialGuess.power + powerOffset));

            const result = simulateTrajectory(firePos.x, firePos.y, testAngle, testPower, windValue, terrain);

            if (result.hit) {
                const dx = result.x - targetX;
                const dy = result.y - targetY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestAngle = testAngle;
                    bestPower = testPower;
                }
            }
        }
    }

    // Fine search around best result
    const fineAngleStep = 1;
    const finePowerStep = 2;
    const fineAngleRange = 8;
    const finePowerRange = 15;

    for (let angleOffset = -fineAngleRange; angleOffset <= fineAngleRange; angleOffset += fineAngleStep) {
        const testAngle = Math.max(10, Math.min(170, bestAngle + angleOffset));

        for (let powerOffset = -finePowerRange; powerOffset <= finePowerRange; powerOffset += finePowerStep) {
            const testPower = Math.max(20, Math.min(100, bestPower + powerOffset));

            const result = simulateTrajectory(firePos.x, firePos.y, testAngle, testPower, windValue, terrain);

            if (result.hit) {
                const dx = result.x - targetX;
                const dy = result.y - targetY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestAngle = testAngle;
                    bestPower = testPower;
                }
            }
        }
    }

    // Calculate confidence based on how close we can get
    // 0 distance = 100% confidence, 100+ pixels = low confidence
    confidence = Math.max(0, 1 - (bestDistance / 100));

    if (debugMode) {
        console.log(`[AI] Iterative solver: best distance=${bestDistance.toFixed(1)}px, confidence=${(confidence * 100).toFixed(0)}%`);
        console.log(`[AI]   Angle: ${bestAngle.toFixed(1)}°, Power: ${bestPower.toFixed(1)}%`);
    }

    return { angle: bestAngle, power: bestPower, confidence };
}

/**
 * Try to find a high arc trajectory that clears terrain obstruction.
 *
 * @param {import('./tank.js').Tank} aiTank - AI's tank
 * @param {import('./tank.js').Tank} playerTank - Player's tank
 * @param {number} windValue - Current wind value
 * @param {import('./terrain.js').Terrain} terrain - Terrain for collision checking
 * @returns {{angle: number, power: number, found: boolean}}
 */
function findHighArcTrajectory(aiTank, playerTank, windValue, terrain) {
    const firePos = aiTank.getFirePosition ? aiTank.getFirePosition() : { x: aiTank.x, y: aiTank.y };
    const targetX = playerTank.x;
    const targetY = playerTank.y;

    // For high arc, use angles closer to vertical
    const shootingLeft = targetX < firePos.x;
    const baseAngle = shootingLeft ? 120 : 60; // More vertical angles

    let bestAngle = baseAngle;
    let bestPower = 80;
    let bestDistance = Infinity;
    let found = false;

    // Search for high arc trajectory
    for (let angleOffset = -25; angleOffset <= 25; angleOffset += 3) {
        const testAngle = baseAngle + angleOffset;
        if (testAngle < 45 || testAngle > 135) continue; // Keep it high

        for (let power = 50; power <= 100; power += 5) {
            const result = simulateTrajectory(firePos.x, firePos.y, testAngle, power, windValue, terrain);

            // Check if trajectory wasn't blocked and hit near target
            if (result.hit && !result.blocked) {
                const dx = result.x - targetX;
                const dy = result.y - targetY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestAngle = testAngle;
                    bestPower = power;
                    found = true;
                }
            }
        }
    }

    if (debugMode && found) {
        console.log(`[AI] Found high arc trajectory: angle=${bestAngle.toFixed(1)}°, power=${bestPower.toFixed(1)}%, distance=${bestDistance.toFixed(1)}px`);
    }

    return { angle: bestAngle, power: bestPower, found };
}

/**
 * Calculate an appropriate power level based on distance.
 * Simple heuristic: longer distance = more power.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @returns {number} Power percentage (0-100)
 */
function calculateBasePower(aiTank, playerTank) {
    // Calculate horizontal distance
    const distance = Math.abs(playerTank.x - aiTank.x);

    // Scale power based on distance relative to canvas width
    // At 0 distance -> 30% power
    // At full canvas width -> 90% power
    const normalizedDistance = distance / getScreenWidth();
    const basePower = 30 + (normalizedDistance * 60);

    // Clamp to valid range
    return Math.min(100, Math.max(0, basePower));
}

/**
 * Add random error to a value within a range.
 *
 * @param {number} value - Base value
 * @param {number} minError - Minimum error (can be negative)
 * @param {number} maxError - Maximum error
 * @returns {number} Value with random error applied
 */
function addRandomError(value, minError, maxError) {
    const error = minError + Math.random() * (maxError - minError);
    return value + error;
}

/**
 * Calculate AI aiming parameters (angle and power).
 * Considers difficulty level for accuracy.
 *
 * Easy AI: Uses direct line targeting (no arc compensation)
 * Medium AI: Uses ballistic calculation to account for gravity
 * Hard AI: Uses iterative solver for accurate trajectory with terrain awareness
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @param {number} [windValue=0] - Current wind value (for wind compensation)
 * @param {import('./terrain.js').Terrain} [terrain=null] - Terrain for Hard AI collision simulation
 * @returns {{angle: number, power: number}} Calculated angle and power
 */
export function calculateAim(aiTank, playerTank, windValue = 0, terrain = null) {
    const config = DIFFICULTY_CONFIG[currentDifficulty];

    let angle, power;

    // Easy AI uses simple direct line targeting
    if (currentDifficulty === AI_DIFFICULTY.EASY) {
        // Easy AI: direct line to target (doesn't account for gravity arc)
        angle = calculateDirectAngle(aiTank, playerTank);
        power = calculateBasePower(aiTank, playerTank);
    } else if (currentDifficulty === AI_DIFFICULTY.MEDIUM) {
        // Medium AI: ballistic calculation that accounts for gravity
        const ballisticAim = calculateBallisticAim(aiTank, playerTank);
        angle = ballisticAim.angle;
        power = ballisticAim.power;
    } else {
        // Hard AI: iterative solver with full simulation and terrain awareness
        // This accounts for gravity, wind, and terrain automatically
        const solverResult = iterativeSolver(aiTank, playerTank, windValue, terrain);
        angle = solverResult.angle;
        power = solverResult.power;

        // If confidence is low (shot gets blocked by terrain), try high arc
        if (solverResult.confidence < 0.5 && terrain) {
            const obstruction = checkTerrainObstruction(aiTank, playerTank, terrain);
            if (obstruction.blocked) {
                if (debugMode) {
                    console.log('[AI] Low confidence shot, terrain blocking. Trying high arc...');
                }
                const highArc = findHighArcTrajectory(aiTank, playerTank, windValue, terrain);
                if (highArc.found) {
                    angle = highArc.angle;
                    power = highArc.power;
                }
            }
        }
    }

    // Store base values for debug logging
    const baseAngle = angle;
    const basePower = power;

    // Apply wind compensation (if difficulty supports it and not Hard AI)
    // Hard AI's iterative solver already accounts for wind in the simulation
    // Medium AI: 50% compensation
    if (config.compensatesWind && windValue !== 0 && currentDifficulty !== AI_DIFFICULTY.HARD) {
        // Wind affects projectile by adding to horizontal velocity each frame
        // To compensate, we need to aim into the wind
        // The compensation amount depends on AI accuracy and wind strength
        // Positive wind = blows right, need to aim more left (increase angle if >90, decrease if <90)
        // Negative wind = blows left, need to aim more right

        // Calculate wind compensation factor
        // Wind compensation affects angle: stronger wind needs more angle adjustment
        // Multiply by accuracy (0.5 for Medium)
        const windEffect = windValue * config.windCompensationAccuracy * 3;

        // Adjust angle based on which direction we're shooting
        // If shooting left (angle > 90), positive wind pushes shot further left,
        // so we reduce angle to compensate
        // If shooting right (angle < 90), positive wind pushes shot right,
        // so we increase angle to compensate
        if (angle > 90) {
            angle -= windEffect;
        } else {
            angle += windEffect;
        }
    }

    // Apply random error based on difficulty
    // Easy: ±15° angle, ±20% power
    // Medium: ±8° angle, ±10% power
    // Hard: ±3° angle, ±5% power
    angle = addRandomError(angle, config.angleErrorMin, config.angleErrorMax);
    power = addRandomError(power, config.powerErrorMin, config.powerErrorMax);

    // Clamp to valid ranges
    angle = Math.max(0, Math.min(180, angle));
    power = Math.max(0, Math.min(100, power));

    // Debug logging
    if (debugMode) {
        console.log(`[AI] ${config.name} AI calculating aim:`);
        console.log(`[AI]   Target: (${playerTank.x.toFixed(0)}, ${playerTank.y.toFixed(0)})`);
        const method = currentDifficulty === AI_DIFFICULTY.EASY ? 'direct line' :
                       currentDifficulty === AI_DIFFICULTY.MEDIUM ? 'ballistic' : 'iterative solver';
        console.log(`[AI]   Calculation method: ${method}`);
        console.log(`[AI]   Base angle: ${baseAngle.toFixed(1)}°, Base power: ${basePower.toFixed(1)}%`);
        console.log(`[AI]   Wind: ${windValue.toFixed(1)}, Compensates: ${config.compensatesWind} (${config.windCompensationAccuracy * 100}%)`);
        console.log(`[AI]   Final angle: ${angle.toFixed(1)}° (error: ${config.angleErrorMin} to ${config.angleErrorMax})`);
        console.log(`[AI]   Final power: ${power.toFixed(1)}% (error: ${config.powerErrorMin} to ${config.powerErrorMax})`);
    }

    return { angle, power };
}

// =============================================================================
// WEAPON SELECTION
// =============================================================================

/**
 * Weapons that Medium AI prefers (in priority order).
 * Medium AI uses Missiles and Rollers when available.
 */
const MEDIUM_AI_PREFERRED_WEAPONS = ['missile', 'roller'];

/**
 * Weapons that Hard AI prefers (in priority order).
 * Hard AI uses more powerful weapons strategically.
 */
const HARD_AI_PREFERRED_WEAPONS = ['nuke', 'mini-nuke', 'mirv', 'deaths-head', 'big-shot', 'heavy-roller', 'missile', 'roller'];

/**
 * Check if a weapon is in the current weapon pool.
 * @param {string} weaponId - Weapon ID to check
 * @returns {boolean} True if weapon is allowed in current pool
 */
function isWeaponInPool(weaponId) {
    return currentWeaponPool.includes(weaponId);
}

/**
 * Check if AI can use a weapon (has ammo AND weapon is in current pool).
 * @param {import('./tank.js').Tank} aiTank - AI's tank
 * @param {string} weaponId - Weapon ID to check
 * @returns {boolean} True if weapon can be used
 */
function canUseWeapon(aiTank, weaponId) {
    if (!isWeaponInPool(weaponId)) {
        return false;
    }
    const ammo = aiTank.getAmmo(weaponId);
    return ammo > 0 || ammo === Infinity;
}

/**
 * Select which weapon the AI should use.
 * - Easy AI: Always uses basic-shot
 * - Medium AI: 50% chance to use Missiles or Rollers if available
 * - Hard AI: Strategic selection based on terrain and player position
 *
 * NOTE: Weapon selection is filtered by currentWeaponPool to enforce
 * round-based weapon progression. AI can only use weapons in their pool.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} [playerTank=null] - Player's tank (for Hard AI strategic selection)
 * @param {import('./terrain.js').Terrain} [terrain=null] - Terrain (for Hard AI strategic selection)
 * @returns {string} Weapon ID to use
 */
export function selectWeapon(aiTank, playerTank = null, terrain = null) {
    const config = DIFFICULTY_CONFIG[currentDifficulty];

    // Easy AI always uses basic weapon
    if (config.onlyBasicWeapon) {
        if (debugMode) {
            console.log('[AI] Using basic-shot (Easy AI)');
        }
        return 'basic-shot';
    }

    // Medium AI: 50% chance to use better weapon if available (simple priority list)
    if (currentDifficulty === AI_DIFFICULTY.MEDIUM) {
        if (Math.random() < 0.5) {
            // Check inventory for preferred weapons (in priority order)
            // Only consider weapons in current pool
            for (const weaponId of MEDIUM_AI_PREFERRED_WEAPONS) {
                if (canUseWeapon(aiTank, weaponId)) {
                    if (debugMode) {
                        console.log(`[AI] Medium AI selected ${weaponId} (in pool, has ammo)`);
                    }
                    return weaponId;
                }
            }
        }
        if (debugMode) {
            console.log('[AI] Medium AI using basic-shot');
        }
        return 'basic-shot';
    }

    // Hard AI: Strategic weapon selection based on situation
    // Roll to see if we use strategic selection (90% chance)
    if (Math.random() > 0.9) {
        // 10% chance to just use basic shot (adds unpredictability)
        if (debugMode) {
            console.log('[AI] Hard AI using basic-shot (random choice)');
        }
        return 'basic-shot';
    }

    // Check terrain conditions for strategic selection
    const inValley = playerTank && terrain ? isPlayerInValley(playerTank, terrain) : false;
    const obstructed = playerTank && terrain ?
        checkTerrainObstruction(aiTank, playerTank, terrain).blocked : false;

    if (debugMode) {
        console.log(`[AI] Hard AI strategic analysis: inValley=${inValley}, obstructed=${obstructed}`);
    }

    // Priority 1: If terrain is blocking shot, consider Digger
    if (obstructed) {
        // Try Heavy Digger first, then regular Digger (only if in pool)
        if (canUseWeapon(aiTank, 'heavy-digger')) {
            if (debugMode) {
                console.log('[AI] Hard AI selected heavy-digger (terrain blocking shot)');
            }
            return 'heavy-digger';
        }
        if (canUseWeapon(aiTank, 'digger')) {
            if (debugMode) {
                console.log('[AI] Hard AI selected digger (terrain blocking shot)');
            }
            return 'digger';
        }
    }

    // Priority 2: If player is in a valley, Roller weapons are very effective
    if (inValley) {
        if (canUseWeapon(aiTank, 'heavy-roller')) {
            if (debugMode) {
                console.log('[AI] Hard AI selected heavy-roller (player in valley)');
            }
            return 'heavy-roller';
        }
        if (canUseWeapon(aiTank, 'roller')) {
            if (debugMode) {
                console.log('[AI] Hard AI selected roller (player in valley)');
            }
            return 'roller';
        }
    }

    // Priority 3: Area damage weapons for high-value shots
    // Use these 60% of the time when available (and in pool)
    if (Math.random() < 0.6) {
        // Nuclear weapons - devastating but rare
        if (canUseWeapon(aiTank, 'nuke')) {
            if (debugMode) {
                console.log('[AI] Hard AI selected nuke (maximum damage)');
            }
            return 'nuke';
        }
        if (canUseWeapon(aiTank, 'mini-nuke')) {
            if (debugMode) {
                console.log('[AI] Hard AI selected mini-nuke (high damage)');
            }
            return 'mini-nuke';
        }

        // Splitting weapons for area damage
        if (canUseWeapon(aiTank, 'deaths-head')) {
            if (debugMode) {
                console.log('[AI] Hard AI selected deaths-head (area denial)');
            }
            return 'deaths-head';
        }
        if (canUseWeapon(aiTank, 'mirv')) {
            if (debugMode) {
                console.log('[AI] Hard AI selected mirv (multi-warhead)');
            }
            return 'mirv';
        }
    }

    // Priority 4: Standard upgrade weapons (only if in pool)
    if (canUseWeapon(aiTank, 'big-shot')) {
        if (debugMode) {
            console.log('[AI] Hard AI selected big-shot (high damage)');
        }
        return 'big-shot';
    }
    if (canUseWeapon(aiTank, 'missile')) {
        if (debugMode) {
            console.log('[AI] Hard AI selected missile (standard upgrade)');
        }
        return 'missile';
    }

    // Fallback: Roller weapons even if not in valley (still useful, if in pool)
    if (canUseWeapon(aiTank, 'heavy-roller')) {
        if (debugMode) {
            console.log('[AI] Hard AI selected heavy-roller (fallback)');
        }
        return 'heavy-roller';
    }
    if (canUseWeapon(aiTank, 'roller')) {
        if (debugMode) {
            console.log('[AI] Hard AI selected roller (fallback)');
        }
        return 'roller';
    }

    // Default to basic-shot
    if (debugMode) {
        console.log('[AI] Hard AI using basic-shot (no special weapons available or in pool)');
    }
    return 'basic-shot';
}

// =============================================================================
// THINKING DELAY
// =============================================================================

/**
 * Get a random thinking delay for the AI.
 * Makes the AI feel more "human" by not firing instantly.
 *
 * @returns {number} Delay in milliseconds
 */
export function getThinkingDelay() {
    const config = DIFFICULTY_CONFIG[currentDifficulty];
    const delay = config.thinkingDelayMin +
        Math.random() * (config.thinkingDelayMax - config.thinkingDelayMin);

    if (debugMode) {
        console.log(`[AI] Thinking delay: ${delay.toFixed(0)}ms`);
    }

    return delay;
}

// =============================================================================
// AI TURN EXECUTION
// =============================================================================

/**
 * AI turn state for managing the thinking/aiming/firing sequence.
 * @type {{
 *   active: boolean,
 *   startTime: number,
 *   thinkingDelay: number,
 *   calculatedAim: {angle: number, power: number}|null,
 *   selectedWeapon: string|null,
 *   initialAngle: number,
 *   initialPower: number
 * }}
 */
const aiTurnState = {
    active: false,
    startTime: 0,
    thinkingDelay: 0,
    calculatedAim: null,
    selectedWeapon: null,
    // Animation state - stores starting position for interpolation
    initialAngle: 0,
    initialPower: 0
};

/**
 * Start the AI's turn.
 * Calculates aim and weapon, then waits for thinking delay.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {import('./tank.js').Tank} playerTank - The player's tank
 * @param {number} [windValue=0] - Current wind value
 * @param {import('./terrain.js').Terrain} [terrain=null] - Terrain for Hard AI
 */
export function startTurn(aiTank, playerTank, windValue = 0, terrain = null) {
    aiTurnState.active = true;
    aiTurnState.startTime = performance.now();
    aiTurnState.thinkingDelay = getThinkingDelay();

    // Capture initial position for animation
    aiTurnState.initialAngle = aiTank.angle;
    aiTurnState.initialPower = aiTank.power;

    // Hard AI uses terrain for iterative solver; Easy/Medium don't need it
    aiTurnState.calculatedAim = calculateAim(aiTank, playerTank, windValue, terrain);
    // Hard AI uses player position and terrain for strategic weapon selection
    aiTurnState.selectedWeapon = selectWeapon(aiTank, playerTank, terrain);

    if (debugMode) {
        console.log('[AI] Turn started - thinking...');
        console.log(`[AI] Animating from angle=${aiTurnState.initialAngle.toFixed(1)}° power=${aiTurnState.initialPower.toFixed(0)}%`);
        console.log(`[AI] Target aim: angle=${aiTurnState.calculatedAim.angle.toFixed(1)}° power=${aiTurnState.calculatedAim.power.toFixed(0)}%`);
    }
}

/**
 * Update the AI turn state.
 * Should be called each frame during AI's turn.
 *
 * @returns {{ready: boolean, angle: number, power: number, weapon: string}|null}
 *          Returns aim data when ready to fire, null while still thinking
 */
export function updateTurn() {
    if (!aiTurnState.active) {
        return null;
    }

    const elapsed = performance.now() - aiTurnState.startTime;

    // Still thinking
    if (elapsed < aiTurnState.thinkingDelay) {
        return null;
    }

    // Ready to fire!
    if (debugMode) {
        console.log('[AI] Ready to fire!');
    }

    const result = {
        ready: true,
        angle: aiTurnState.calculatedAim.angle,
        power: aiTurnState.calculatedAim.power,
        weapon: aiTurnState.selectedWeapon
    };

    // Reset state
    aiTurnState.active = false;
    aiTurnState.calculatedAim = null;
    aiTurnState.selectedWeapon = null;

    return result;
}

/**
 * Cancel the current AI turn (e.g., if round ends early).
 */
export function cancelTurn() {
    aiTurnState.active = false;
    aiTurnState.calculatedAim = null;
    aiTurnState.selectedWeapon = null;
    aiTurnState.initialAngle = 0;
    aiTurnState.initialPower = 0;

    if (debugMode) {
        console.log('[AI] Turn cancelled');
    }
}

/**
 * Get the current animated aim values during AI thinking.
 * Uses easeInOutQuad for smooth animation.
 *
 * @returns {{angle: number, power: number, progress: number}|null}
 *          Current animated values, or null if not animating
 */
export function getAnimatedAim() {
    if (!aiTurnState.active || !aiTurnState.calculatedAim) {
        return null;
    }

    const elapsed = performance.now() - aiTurnState.startTime;
    // Use 80% of thinking delay for animation, keep 20% at final position before firing
    const animationDuration = aiTurnState.thinkingDelay * 0.8;
    const progress = Math.min(1, elapsed / animationDuration);

    // Ease in-out quad for smooth animation
    const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate from initial to target
    const angle = aiTurnState.initialAngle +
        (aiTurnState.calculatedAim.angle - aiTurnState.initialAngle) * eased;
    const power = aiTurnState.initialPower +
        (aiTurnState.calculatedAim.power - aiTurnState.initialPower) * eased;

    return {
        angle,
        power,
        progress: elapsed / aiTurnState.thinkingDelay
    };
}

/**
 * Check if the AI is currently active (thinking/aiming).
 * @returns {boolean} True if AI turn is in progress
 */
export function isTurnActive() {
    return aiTurnState.active;
}

// =============================================================================
// DEBUG MODE
// =============================================================================

/**
 * Enable or disable AI debug mode.
 * When enabled, AI decisions are logged to console.
 *
 * @param {boolean} enabled - Whether to enable debug mode
 */
export function setDebugMode(enabled) {
    debugMode = enabled;
    if (enabled) {
        console.log('[AI] Debug mode enabled');
    }
}

/**
 * Check if AI debug mode is enabled.
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugMode() {
    return debugMode;
}

// =============================================================================
// DIFFICULTY INFO (for UI)
// =============================================================================

/**
 * Get all difficulty levels for UI display.
 * @returns {Array<{id: string, name: string}>} Array of difficulty options
 */
export function getAllDifficulties() {
    return Object.entries(DIFFICULTY_CONFIG).map(([id, config]) => ({
        id,
        name: config.name
    }));
}

/**
 * Get the display name for a difficulty level.
 * @param {string} difficulty - Difficulty ID
 * @returns {string} Display name
 */
export function getDifficultyName(difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty];
    return config ? config.name : 'Unknown';
}

// =============================================================================
// DIFFICULTY PROGRESSION SYSTEM
// =============================================================================

/**
 * Get the AI difficulty for a given round number.
 * Implements progressive difficulty:
 * - Rounds 1-2: Easy AI
 * - Rounds 3-4: Medium AI
 * - Rounds 5+: Hard AI
 *
 * @param {number} roundNumber - Current round (1-based)
 * @returns {string} AI difficulty level from AI_DIFFICULTY enum
 */
export function getAIDifficulty(roundNumber) {
    // Round-based difficulty progression per roguelike spec:
    // Rounds 1-2: Easy, 3-5: Medium, 6-9: Hard, 10+: Hard+
    if (roundNumber <= 2) {
        return AI_DIFFICULTY.EASY;
    } else if (roundNumber <= 5) {
        return AI_DIFFICULTY.MEDIUM;
    } else if (roundNumber <= 9) {
        return AI_DIFFICULTY.HARD;
    } else {
        return AI_DIFFICULTY.HARD_PLUS;
    }
}

/**
 * Set AI difficulty based on round number.
 * Convenience function that combines getAIDifficulty and setDifficulty.
 *
 * @param {number} roundNumber - Current round (1-based)
 * @returns {string} The difficulty that was set
 */
export function setDifficultyForRound(roundNumber) {
    const difficulty = getAIDifficulty(roundNumber);
    setDifficulty(difficulty);

    if (debugMode) {
        console.log(`[AI] Round ${roundNumber}: Difficulty set to ${getDifficultyName(difficulty)}`);
    }

    return difficulty;
}

// =============================================================================
// AI WEAPON POOL PROGRESSION
// =============================================================================

/**
 * Weapon pools available to AI at different round thresholds.
 * AI can only use weapons from their current round's pool.
 * Uses weapon IDs matching those in weapons.js.
 */
const AI_WEAPON_POOLS = {
    1: ['basic-shot'],                                          // Rounds 1-2
    3: ['basic-shot', 'missile'],                               // Rounds 3-4
    5: ['basic-shot', 'missile', 'roller'],                     // Rounds 5-6
    7: ['basic-shot', 'missile', 'roller', 'digger'],           // Rounds 7-8
    9: ['basic-shot', 'missile', 'roller', 'digger', 'mirv', 'mini-nuke', 'nuke']  // Rounds 9+
};

/**
 * Get the weapon pool available to AI for a given round number.
 * The AI can only select weapons from this pool during gameplay.
 *
 * Weapon Pool Progression:
 * - Rounds 1-2: Basic Shot only
 * - Rounds 3-4: Basic, Missile
 * - Rounds 5-6: Basic, Missile, Roller
 * - Rounds 7-8: Basic, Missile, Roller, Digger
 * - Rounds 9+: All weapons (including MIRV, Nukes)
 *
 * @param {number} roundNumber - Current round (1-based)
 * @returns {string[]} Array of weapon IDs available to AI
 */
export function getAIWeaponPoolForRound(roundNumber) {
    // Find the highest threshold that the round meets or exceeds
    const thresholds = Object.keys(AI_WEAPON_POOLS)
        .map(Number)
        .sort((a, b) => b - a); // Sort descending

    for (const threshold of thresholds) {
        if (roundNumber >= threshold) {
            const pool = AI_WEAPON_POOLS[threshold];
            if (debugMode) {
                console.log(`[AI] Round ${roundNumber}: Weapon pool = [${pool.join(', ')}]`);
            }
            return [...pool]; // Return a copy
        }
    }

    // Fallback to basic only
    return ['basic-shot'];
}

// =============================================================================
// AI WEAPON PURCHASING
// =============================================================================

/**
 * Budget allocations for AI weapon purchasing by difficulty.
 * Higher difficulty AIs get more money to spend.
 */
const AI_PURCHASE_BUDGETS = {
    [AI_DIFFICULTY.EASY]: 0,        // Easy AI doesn't buy weapons
    [AI_DIFFICULTY.MEDIUM]: 2000,   // Medium AI has modest budget
    [AI_DIFFICULTY.HARD]: 5000,     // Hard AI has generous budget
    [AI_DIFFICULTY.HARD_PLUS]: 8000 // Hard+ AI has maximum budget
};

/**
 * Preferred weapons by difficulty for purchasing.
 * Order indicates priority - AI tries to buy earlier items first.
 */
const AI_PREFERRED_PURCHASES = {
    [AI_DIFFICULTY.EASY]: [],  // Easy AI doesn't buy
    [AI_DIFFICULTY.MEDIUM]: [
        'missile',       // $500, 5 ammo - reliable upgrade
        'roller'        // $1500, 3 ammo - good for valleys
    ],
    [AI_DIFFICULTY.HARD]: [
        'mini-nuke',     // $4000, 2 ammo - high damage
        'mirv',          // $3000, 2 ammo - area denial
        'heavy-roller',  // $2500, 2 ammo - heavy damage
        'heavy-digger',  // $3500, 2 ammo - terrain penetration
        'big-shot',      // $1000, 3 ammo - solid damage
        'missile',       // $500, 5 ammo - reliable
        'digger',        // $2000, 3 ammo - terrain penetration
        'roller'        // $1500, 3 ammo - rolling damage
    ],
    [AI_DIFFICULTY.HARD_PLUS]: [
        'nuke',          // $8000, 1 ammo - devastating
        'mini-nuke',     // $4000, 2 ammo - high damage
        'mirv',          // $3000, 2 ammo - area denial
        'heavy-digger',  // $3500, 2 ammo - terrain penetration
        'heavy-roller',  // $2500, 2 ammo - heavy damage
        'big-shot',      // $1000, 3 ammo - solid damage
        'missile'       // $500, 5 ammo - reliable
    ]
};

/**
 * Purchase weapons for the AI tank based on difficulty.
 * The AI spends its budget on preferred weapons for its difficulty level.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank to add weapons to
 * @param {string} [difficulty=currentDifficulty] - Difficulty level (uses current if not specified)
 * @returns {{purchased: Array<{weaponId: string, cost: number, ammo: number}>, totalSpent: number}}
 */
export function purchaseWeaponsForAI(aiTank, difficulty = currentDifficulty) {
    const budget = AI_PURCHASE_BUDGETS[difficulty] || 0;
    const preferredWeapons = AI_PREFERRED_PURCHASES[difficulty] || [];
    const purchased = [];
    let remaining = budget;

    if (debugMode) {
        console.log(`[AI] Purchasing weapons with budget $${budget} (${getDifficultyName(difficulty)} AI)`);
    }

    // Easy AI doesn't purchase anything
    if (budget === 0 || preferredWeapons.length === 0) {
        if (debugMode) {
            console.log('[AI] No purchases (Easy AI or no budget)');
        }
        return { purchased, totalSpent: 0 };
    }

    // Try to buy each preferred weapon in order
    for (const weaponId of preferredWeapons) {
        const weapon = WeaponRegistry.getWeapon(weaponId);

        if (!weapon) {
            console.warn(`[AI] Unknown weapon: ${weaponId}`);
            continue;
        }

        // Skip if we can't afford it
        if (weapon.cost > remaining) {
            if (debugMode) {
                console.log(`[AI] Can't afford ${weapon.name} ($${weapon.cost}, remaining: $${remaining})`);
            }
            continue;
        }

        // Purchase the weapon
        aiTank.addAmmo(weaponId, weapon.ammo);
        remaining -= weapon.cost;

        purchased.push({
            weaponId: weaponId,
            cost: weapon.cost,
            ammo: weapon.ammo
        });

        if (debugMode) {
            console.log(`[AI] Purchased ${weapon.name} ($${weapon.cost}, ${weapon.ammo} ammo) - remaining: $${remaining}`);
        }

        // Stop if we've run out of budget
        if (remaining <= 0) {
            break;
        }
    }

    const totalSpent = budget - remaining;

    if (debugMode) {
        console.log(`[AI] Purchase complete: ${purchased.length} items, $${totalSpent} spent`);
    }

    return { purchased, totalSpent };
}

/**
 * Ammo amounts given to AI for each weapon in their pool.
 * AI gets generous ammo to make them challenging.
 */
const AI_POOL_AMMO = {
    'basic-shot': Infinity,  // Always unlimited
    'missile': 10,
    'roller': 5,
    'digger': 5,
    'mirv': 3,
    'mini-nuke': 2,
    'nuke': 1
};

/**
 * Set the current weapon pool for AI based on round number.
 * This updates the module-level currentWeaponPool variable.
 *
 * @param {number} roundNumber - Current round (1-based)
 * @returns {string[]} The weapon pool that was set
 */
export function setWeaponPoolForRound(roundNumber) {
    currentWeaponPool = getAIWeaponPoolForRound(roundNumber);

    if (debugMode) {
        console.log(`[AI] Weapon pool set for round ${roundNumber}: [${currentWeaponPool.join(', ')}]`);
    }

    return currentWeaponPool;
}

/**
 * Get the current weapon pool (for external queries).
 * @returns {string[]} Current weapon pool
 */
export function getCurrentWeaponPool() {
    return [...currentWeaponPool];
}

/**
 * Give AI ammo for all weapons in their current pool.
 * AI gets generous ammo amounts to be challenging opponents.
 *
 * @param {import('./tank.js').Tank} aiTank - AI's tank
 * @param {string[]} weaponPool - Weapons to give ammo for
 * @returns {{weaponId: string, ammo: number}[]} Ammo given
 */
function givePoolAmmo(aiTank, weaponPool) {
    const ammoGiven = [];

    for (const weaponId of weaponPool) {
        const ammo = AI_POOL_AMMO[weaponId] || 3; // Default to 3 if not specified

        // For infinite ammo, we don't need to add (tank already has it for basic-shot)
        if (ammo === Infinity) {
            continue;
        }

        aiTank.addAmmo(weaponId, ammo);
        ammoGiven.push({ weaponId, ammo });

        if (debugMode) {
            console.log(`[AI] Given ${ammo} ammo for ${weaponId}`);
        }
    }

    return ammoGiven;
}

/**
 * Set up AI for a new round with appropriate difficulty, weapon pool, and ammo.
 * This is the main entry point for round-based AI progression.
 *
 * @param {import('./tank.js').Tank} aiTank - The AI's tank
 * @param {number} roundNumber - Current round number (1-based)
 * @returns {{difficulty: string, difficultyName: string, weaponPool: string[], ammoGiven: Object[]}}
 */
export function setupAIForRound(aiTank, roundNumber) {
    // Set difficulty based on round
    const difficulty = setDifficultyForRound(roundNumber);
    const difficultyName = getDifficultyName(difficulty);

    // Set weapon pool based on round
    const weaponPool = setWeaponPoolForRound(roundNumber);

    // Give AI ammo for all weapons in their pool
    const ammoGiven = givePoolAmmo(aiTank, weaponPool);

    if (debugMode) {
        console.log(`[AI] Round ${roundNumber} setup complete:`);
        console.log(`[AI]   Difficulty: ${difficultyName}`);
        console.log(`[AI]   Weapon pool: [${weaponPool.join(', ')}]`);
        console.log(`[AI]   Ammo given for ${ammoGiven.length} weapons`);
    }

    return {
        difficulty,
        difficultyName,
        weaponPool,
        ammoGiven
    };
}
