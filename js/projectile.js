/**
 * Scorched Earth: Synthwave Edition
 * Projectile physics and management
 *
 * Implements ballistic physics with gravity and wind effects.
 * Projectiles spawn from tank barrel and follow parabolic arcs.
 */

import { PHYSICS, PROJECTILE, CANVAS } from './constants.js';

/**
 * Projectile entity for the game.
 * Handles ballistic physics including gravity and wind effects.
 *
 * Physics model:
 * - Initial velocity derived from tank's power (0-100%) and angle
 * - Gravity pulls projectile down each frame (constant acceleration)
 * - Wind affects horizontal velocity each frame
 * - Position updated each frame based on velocity
 */
export class Projectile {
    /**
     * Create a new projectile.
     * @param {Object} options - Projectile initialization options
     * @param {number} options.x - Starting X position (typically from tank barrel)
     * @param {number} options.y - Starting Y position (typically from tank barrel)
     * @param {number} options.angle - Launch angle in degrees (0 = right, 90 = up, 180 = left)
     * @param {number} options.power - Launch power as percentage (0-100)
     * @param {string} [options.weaponId='basic'] - Weapon type identifier
     * @param {string} [options.owner='player'] - Which tank fired this projectile
     */
    constructor(options) {
        const {
            x,
            y,
            angle,
            power,
            weaponId = 'basic',
            owner = 'player'
        } = options;

        /**
         * Current X position in canvas coordinates.
         * @type {number}
         */
        this.x = x;

        /**
         * Current Y position in canvas coordinates.
         * Y=0 is top of canvas, increases downward.
         * @type {number}
         */
        this.y = y;

        /**
         * Current horizontal velocity (pixels per frame).
         * Positive = moving right, negative = moving left.
         * @type {number}
         */
        this.vx = 0;

        /**
         * Current vertical velocity (pixels per frame).
         * Positive = moving down, negative = moving up.
         * In canvas coordinates where Y increases downward.
         * @type {number}
         */
        this.vy = 0;

        /**
         * Weapon type identifier.
         * Determines explosion radius, damage, and special behaviors.
         * @type {string}
         */
        this.weaponId = weaponId;

        /**
         * Team/owner of this projectile.
         * Used to attribute damage and prevent self-damage if needed.
         * @type {string}
         */
        this.owner = owner;

        /**
         * Whether this projectile is still active.
         * Set to false when it hits terrain, tank, or goes out of bounds.
         * @type {boolean}
         */
        this.active = true;

        /**
         * Launch angle in degrees (stored for reference).
         * @type {number}
         */
        this.launchAngle = angle;

        /**
         * Launch power percentage (stored for reference).
         * @type {number}
         */
        this.launchPower = power;

        // Calculate initial velocity from power and angle
        this._calculateInitialVelocity(angle, power);

        console.log(`Projectile created: pos=(${x.toFixed(1)}, ${y.toFixed(1)}), vel=(${this.vx.toFixed(2)}, ${this.vy.toFixed(2)}), angle=${angle}, power=${power}`);
    }

    /**
     * Calculate initial velocity components from angle and power.
     *
     * Power mapping: 0-100% maps to 0-MAX_VELOCITY pixels/frame
     * This gives a max velocity of 20 px/frame at 100% power.
     *
     * Angle convention:
     * - 0° = right (positive X)
     * - 90° = up (negative Y in canvas coords)
     * - 180° = left (negative X)
     *
     * @private
     * @param {number} angle - Launch angle in degrees
     * @param {number} power - Launch power as percentage (0-100)
     */
    _calculateInitialVelocity(angle, power) {
        // Map power (0-100) to velocity magnitude (0-MAX_VELOCITY)
        const speed = (power / 100) * PHYSICS.MAX_VELOCITY;

        // Convert angle to radians
        const radians = (angle * Math.PI) / 180;

        // Calculate velocity components
        // cos(angle) gives X component (right is positive)
        // -sin(angle) gives Y component (up is negative in canvas coords)
        this.vx = Math.cos(radians) * speed;
        this.vy = -Math.sin(radians) * speed;
    }

    /**
     * Update projectile position and velocity for one frame.
     *
     * Physics applied each frame:
     * 1. Wind affects horizontal velocity (constant force)
     * 2. Gravity affects vertical velocity (constant acceleration)
     * 3. Position updated based on current velocity
     *
     * @param {number} [wind=0] - Current wind value (positive = right, negative = left)
     */
    update(wind = 0) {
        if (!this.active) return;

        // Apply wind to horizontal velocity
        // Wind is a constant force that affects velocity each frame
        this.vx += wind;

        // Apply gravity to vertical velocity
        // Gravity is a constant acceleration downward (positive Y in canvas)
        this.vy += PHYSICS.GRAVITY;

        // Update position based on velocity
        this.x += this.vx;
        this.y += this.vy;

        // Check if projectile has left the playable area
        this._checkBounds();
    }

    /**
     * Check if projectile is out of bounds and deactivate if so.
     *
     * Out of bounds conditions:
     * - X < 0 (left of screen)
     * - X > canvas width (right of screen)
     * - Y > canvas height (below screen)
     *
     * Note: Y < 0 (above screen) is NOT out of bounds - projectiles
     * can arc high and come back down.
     *
     * @private
     */
    _checkBounds() {
        // Left boundary
        if (this.x < 0) {
            this.active = false;
            console.log('Projectile went out of bounds (left)');
            return;
        }

        // Right boundary
        if (this.x > CANVAS.DESIGN_WIDTH) {
            this.active = false;
            console.log('Projectile went out of bounds (right)');
            return;
        }

        // Bottom boundary (below terrain floor)
        if (this.y > CANVAS.DESIGN_HEIGHT) {
            this.active = false;
            console.log('Projectile went out of bounds (bottom)');
            return;
        }

        // Note: Top (y < 0) is intentionally NOT a boundary
        // Projectiles should be able to arc high and return
    }

    /**
     * Check if the projectile is still active.
     * @returns {boolean} True if projectile is active
     */
    isActive() {
        return this.active;
    }

    /**
     * Deactivate the projectile.
     * Call this when the projectile hits something.
     */
    deactivate() {
        this.active = false;
    }

    /**
     * Get the current position.
     * @returns {{x: number, y: number}} Current position
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * Get the current velocity.
     * @returns {{vx: number, vy: number}} Current velocity
     */
    getVelocity() {
        return { vx: this.vx, vy: this.vy };
    }

    /**
     * Get the current speed (magnitude of velocity).
     * @returns {number} Speed in pixels per frame
     */
    getSpeed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    /**
     * Get the current direction of travel in degrees.
     * @returns {number} Angle in degrees (0 = right, 90 = down, etc.)
     */
    getDirection() {
        // atan2 returns radians, convert to degrees
        // Note: atan2(y, x) gives angle from positive X axis
        return (Math.atan2(this.vy, this.vx) * 180) / Math.PI;
    }

    /**
     * Get projectile radius for collision detection.
     * @returns {number} Collision radius in pixels
     */
    getRadius() {
        return PROJECTILE.DEFAULT_RADIUS;
    }

    /**
     * Serialize the projectile state for debugging or network sync.
     * @returns {Object} Serialized projectile data
     */
    serialize() {
        return {
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            weaponId: this.weaponId,
            owner: this.owner,
            active: this.active,
            launchAngle: this.launchAngle,
            launchPower: this.launchPower
        };
    }
}

/**
 * Create a projectile fired from a tank.
 * Convenience function that extracts fire position from tank.
 *
 * @param {import('./tank.js').Tank} tank - The tank firing the projectile
 * @param {number} [wind=0] - Current wind value (optional, not used in spawn)
 * @returns {Projectile} A new projectile instance
 */
export function createProjectileFromTank(tank, wind = 0) {
    const firePos = tank.getFirePosition();

    return new Projectile({
        x: firePos.x,
        y: firePos.y,
        angle: tank.angle,
        power: tank.power,
        weaponId: tank.currentWeapon,
        owner: tank.team
    });
}

/**
 * Calculate the predicted trajectory of a projectile.
 * Useful for trajectory preview or AI aiming calculations.
 *
 * Returns an array of position points along the trajectory.
 * Simulation stops when projectile goes out of bounds or reaches maxSteps.
 *
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} angle - Launch angle in degrees
 * @param {number} power - Launch power (0-100)
 * @param {number} [wind=0] - Wind value
 * @param {number} [maxSteps=500] - Maximum simulation steps
 * @returns {Array<{x: number, y: number}>} Array of trajectory points
 */
export function calculateTrajectory(startX, startY, angle, power, wind = 0, maxSteps = 500) {
    const points = [];

    // Create a temporary projectile to simulate
    const proj = new Projectile({
        x: startX,
        y: startY,
        angle: angle,
        power: power
    });

    // Add starting point
    points.push({ x: proj.x, y: proj.y });

    // Simulate trajectory
    for (let i = 0; i < maxSteps && proj.isActive(); i++) {
        proj.update(wind);
        points.push({ x: proj.x, y: proj.y });

        // Early exit if below screen (terrain collision will be checked elsewhere)
        if (proj.y > CANVAS.DESIGN_HEIGHT) {
            break;
        }
    }

    return points;
}
