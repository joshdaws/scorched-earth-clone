/**
 * Scorched Earth: Synthwave Edition
 * Projectile physics and management
 *
 * Implements ballistic physics with gravity and wind effects.
 * Projectiles spawn from tank barrel and follow parabolic arcs.
 */

import { PHYSICS, PROJECTILE, CANVAS } from './constants.js';
import { WeaponRegistry, WEAPON_TYPES } from './weapons.js';

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

        /**
         * Trail positions for visual effect.
         * Stores past positions for rendering a fading trail behind the projectile.
         * Each entry is {x, y} coordinates.
         * @type {Array<{x: number, y: number}>}
         */
        this.trail = [];

        /**
         * Maximum number of trail positions to keep.
         * @type {number}
         */
        this.maxTrailLength = PROJECTILE.TRAIL_LENGTH;

        /**
         * Previous vertical velocity for apex detection.
         * When vy changes from negative (going up) to positive (going down), we've hit apex.
         * @type {number}
         */
        this.prevVy = 0;

        /**
         * Whether this projectile has already split (for MIRV-type weapons).
         * Prevents double-splitting.
         * @type {boolean}
         */
        this.hasSplit = false;

        /**
         * Whether this is a child projectile from a split.
         * Child projectiles should not split again.
         * @type {boolean}
         */
        this.isChild = options.isChild || false;

        // =============================================================================
        // ROLLING STATE (for Roller-type weapons)
        // =============================================================================

        /**
         * Whether this projectile is currently in rolling mode.
         * Roller weapons enter rolling mode on first terrain contact instead of exploding.
         * @type {boolean}
         */
        this.isRolling = false;

        /**
         * Timestamp when rolling started (for timeout check).
         * @type {number}
         */
        this.rollStartTime = 0;

        /**
         * Rolling velocity (horizontal speed while rolling).
         * Positive = rolling right, negative = rolling left.
         * Speed is affected by terrain slope.
         * @type {number}
         */
        this.rollVelocity = 0;

        /**
         * Rolling direction: 1 for right, -1 for left.
         * Determined by horizontal velocity when roller hits terrain.
         * @type {number}
         */
        this.rollDirection = 1;

        /**
         * Rotation angle for visual effect (radians).
         * Accumulates as the roller moves along terrain.
         * @type {number}
         */
        this.rollRotation = 0;

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
     * 1. Store previous velocity for apex detection
     * 2. Store current position in trail for rendering
     * 3. Wind affects horizontal velocity (constant force)
     * 4. Gravity affects vertical velocity (constant acceleration)
     * 5. Position updated based on current velocity
     *
     * @param {number} [wind=0] - Current wind value (positive = right, negative = left)
     */
    update(wind = 0) {
        if (!this.active) return;

        // Store previous vertical velocity for apex detection
        // Apex occurs when vy transitions from negative (going up) to positive (going down)
        this.prevVy = this.vy;

        // Store current position in trail before moving
        // Trail is used for rendering a fading effect behind the projectile
        this.trail.push({ x: this.x, y: this.y });

        // Keep trail at max length by removing oldest positions
        while (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

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
     * Get the trail positions for rendering.
     * Trail positions are ordered from oldest to newest.
     * @returns {Array<{x: number, y: number}>} Array of trail positions
     */
    getTrail() {
        return this.trail;
    }

    /**
     * Clear the trail.
     * Call this when projectile is destroyed to clean up.
     */
    clearTrail() {
        this.trail = [];
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

    /**
     * Check if the projectile is at its apex (highest point in trajectory).
     * Apex is detected when vertical velocity transitions from negative (going up)
     * to positive or zero (starting to go down).
     *
     * @returns {boolean} True if projectile just reached apex
     */
    isAtApex() {
        // Apex: was going up (vy negative), now going down or stationary (vy >= 0)
        return this.prevVy < 0 && this.vy >= 0;
    }

    /**
     * Check if this projectile should split (MIRV-type behavior).
     * Returns true if:
     * - Weapon is a splitting type
     * - Projectile is at apex
     * - Hasn't already split
     * - Is not a child projectile
     *
     * @returns {boolean} True if projectile should split now
     */
    shouldSplit() {
        if (this.hasSplit || this.isChild) return false;

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        if (!weapon || weapon.type !== WEAPON_TYPES.SPLITTING) return false;

        return this.isAtApex();
    }

    /**
     * Mark this projectile as having split.
     */
    markSplit() {
        this.hasSplit = true;
    }

    // =============================================================================
    // ROLLING WEAPON SUPPORT
    // =============================================================================

    /**
     * Check if this projectile should enter rolling mode on terrain contact.
     * Only rolling-type weapons enter rolling mode.
     *
     * @returns {boolean} True if weapon is a rolling type and not already rolling
     */
    shouldRoll() {
        if (this.isRolling) return false;

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        if (!weapon || weapon.type !== WEAPON_TYPES.ROLLING) return false;

        return true;
    }

    /**
     * Start rolling mode for this projectile.
     * Sets initial roll direction based on current horizontal velocity.
     *
     * @param {number} terrainY - The Y position of the terrain surface (canvas coords)
     */
    startRolling(terrainY) {
        this.isRolling = true;
        this.rollStartTime = performance.now();

        // Set roll direction based on horizontal velocity at impact
        // If vx is very small, default to rolling right
        this.rollDirection = this.vx >= 0 ? 1 : -1;

        // Initial roll velocity is based on horizontal speed at impact
        // Minimum velocity to ensure roller moves
        const minRollSpeed = 2;
        this.rollVelocity = Math.max(Math.abs(this.vx) * 0.5, minRollSpeed) * this.rollDirection;

        // Snap to terrain surface
        this.y = terrainY;

        // Clear vertical velocity (now following terrain)
        this.vy = 0;

        console.log(`Roller started rolling at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}), direction=${this.rollDirection > 0 ? 'right' : 'left'}, velocity=${this.rollVelocity.toFixed(2)}`);
    }

    /**
     * Update the roller's position following terrain contour.
     * The roller moves horizontally and snaps to terrain height.
     * Speed is affected by terrain slope (faster downhill, slower uphill).
     *
     * @param {import('./terrain.js').Terrain} terrain - The terrain to roll on
     * @returns {{explode: boolean, reason: string}|null} Explosion trigger info or null to continue rolling
     */
    updateRolling(terrain) {
        if (!this.isRolling) return null;

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        const rollTimeout = weapon?.rollTimeout || 3000;

        // Check timeout
        const rollDuration = performance.now() - this.rollStartTime;
        if (rollDuration >= rollTimeout) {
            return { explode: true, reason: 'timeout' };
        }

        // Get current terrain height at position
        const currentTerrainHeight = terrain.getHeight(Math.floor(this.x));
        const currentSurfaceY = CANVAS.DESIGN_HEIGHT - currentTerrainHeight;

        // Calculate slope at current position
        // Look ahead in roll direction to find slope
        const lookAhead = 3; // pixels ahead to check
        const nextX = Math.floor(this.x + this.rollDirection * lookAhead);

        // Check for wall (left/right boundary)
        if (nextX < 0 || nextX >= terrain.getWidth()) {
            return { explode: true, reason: 'wall' };
        }

        const nextTerrainHeight = terrain.getHeight(nextX);
        const nextSurfaceY = CANVAS.DESIGN_HEIGHT - nextTerrainHeight;

        // Calculate slope angle (positive = going downhill, negative = going uphill)
        // In canvas coords: lower Y = higher on screen
        const heightDiff = currentSurfaceY - nextSurfaceY; // Positive if terrain goes up (roller goes uphill)
        const slopeAngle = Math.atan2(-heightDiff, lookAhead); // Negative heightDiff for correct direction

        // Base roll speed affected by slope
        // Gravity effect: rolling downhill speeds up, uphill slows down
        const gravityEffect = 0.15; // How much slope affects speed
        const slopeAcceleration = Math.sin(slopeAngle) * gravityEffect;

        // Update roll velocity with slope effect
        this.rollVelocity += slopeAcceleration * this.rollDirection;

        // Clamp roll speed
        const maxRollSpeed = 8;
        const minRollSpeed = 0.5;
        const absVelocity = Math.abs(this.rollVelocity);

        if (absVelocity > maxRollSpeed) {
            this.rollVelocity = maxRollSpeed * this.rollDirection;
        }

        // Check for valley bottom (speed too low to climb)
        // If we're trying to go uphill but can't make it, we've hit a valley
        if (absVelocity < minRollSpeed && heightDiff > 0.5) {
            return { explode: true, reason: 'valley' };
        }

        // Update horizontal position
        this.x += this.rollVelocity;

        // Snap to terrain surface at new position
        const newX = Math.floor(this.x);
        if (newX >= 0 && newX < terrain.getWidth()) {
            const newTerrainHeight = terrain.getHeight(newX);
            this.y = CANVAS.DESIGN_HEIGHT - newTerrainHeight;
        }

        // Update rotation for visual effect
        // Rotation based on distance traveled (assuming 4px radius)
        const rollerRadius = 4;
        this.rollRotation += this.rollVelocity / rollerRadius;

        // Add trail position while rolling
        this.trail.push({ x: this.x, y: this.y });
        while (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        return null; // Continue rolling
    }

    /**
     * Check if the roller has timed out.
     * @returns {boolean} True if roll timeout has been exceeded
     */
    hasRollTimeout() {
        if (!this.isRolling) return false;

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        const rollTimeout = weapon?.rollTimeout || 3000;

        return (performance.now() - this.rollStartTime) >= rollTimeout;
    }

    /**
     * Get the current rotation angle for rendering.
     * @returns {number} Rotation angle in radians
     */
    getRollRotation() {
        return this.rollRotation;
    }
}

// =============================================================================
// MIRV / SPLITTING PROJECTILE SUPPORT
// =============================================================================

/**
 * Create child projectiles for a splitting weapon (MIRV, Death's Head).
 * Child projectiles spread in an arc centered on the parent's direction of travel.
 *
 * @param {Projectile} parent - The parent projectile that is splitting
 * @returns {Projectile[]} Array of child projectiles
 */
export function createSplitProjectiles(parent) {
    const weapon = WeaponRegistry.getWeapon(parent.weaponId);
    if (!weapon) {
        console.warn(`Cannot split: weapon ${parent.weaponId} not found`);
        return [];
    }

    const splitCount = weapon.splitCount || 5;
    const spreadAngle = weapon.splitAngle || 30; // Total spread in degrees

    const children = [];

    // Calculate the angle between each child projectile
    // For 5 warheads with 30° spread: -15, -7.5, 0, 7.5, 15 degrees from center
    const angleStep = splitCount > 1 ? spreadAngle / (splitCount - 1) : 0;
    const startAngle = -spreadAngle / 2;

    // Get parent's current speed (magnitude of velocity)
    const parentSpeed = parent.getSpeed();

    // Calculate the current direction of travel (in radians)
    // Note: atan2(vy, vx) gives the direction the projectile is moving
    const parentDirection = Math.atan2(parent.vy, parent.vx);

    console.log(`MIRV split at (${parent.x.toFixed(1)}, ${parent.y.toFixed(1)}): spawning ${splitCount} warheads with ${spreadAngle}° spread`);

    for (let i = 0; i < splitCount; i++) {
        // Calculate offset angle for this child
        const offsetDegrees = startAngle + (angleStep * i);
        const offsetRadians = (offsetDegrees * Math.PI) / 180;

        // Child direction = parent direction + offset
        const childDirection = parentDirection + offsetRadians;

        // Create child projectile at parent's position
        const child = new Projectile({
            x: parent.x,
            y: parent.y,
            angle: 0, // Not used, we set velocity directly
            power: 0, // Not used, we set velocity directly
            weaponId: parent.weaponId,
            owner: parent.owner,
            isChild: true
        });

        // At apex, the parent speed is near zero (only horizontal component remains)
        // Use a minimum speed based on the parent's original horizontal velocity
        // to ensure warheads spread out properly
        const minChildSpeed = Math.abs(parent.vx) * 0.8; // Use horizontal speed at apex
        const childSpeed = Math.max(minChildSpeed, parentSpeed * 0.8, 5); // At least 5 px/frame

        // Set velocity directly based on calculated direction
        child.vx = Math.cos(childDirection) * childSpeed;
        child.vy = Math.sin(childDirection) * childSpeed;

        // Ensure children start moving downward (positive vy in canvas coords)
        // This makes the visual effect cleaner since split happens at apex
        if (child.vy < 1) {
            child.vy = 1; // Minimum downward velocity
        }

        children.push(child);
    }

    return children;
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

// =============================================================================
// TANK COLLISION DETECTION
// =============================================================================

/**
 * Distance threshold for direct hit flag.
 * If projectile center is within this distance of tank center, it's a direct hit.
 * @type {number}
 */
const DIRECT_HIT_DISTANCE = 5;

/**
 * Check if a point collides with any tank in the provided array.
 *
 * Collision is detected using rectangular hitboxes (64x32 pixels centered on tank position).
 * Direct hits are flagged when the projectile center is within 5 pixels of the tank center.
 *
 * Important edge cases handled:
 * - Destroyed tanks are skipped (no collision with dead tanks)
 * - When tanks overlap, returns the first hit tank in array order
 * - Returns null if no collision detected
 *
 * @param {number} x - X coordinate of projectile position
 * @param {number} y - Y coordinate of projectile position
 * @param {import('./tank.js').Tank[]} tanks - Array of tanks to check collision against
 * @returns {{tank: import('./tank.js').Tank, directHit: boolean}|null} Hit info or null if no collision
 */
export function checkTankCollision(x, y, tanks) {
    if (!tanks || tanks.length === 0) {
        return null;
    }

    // Check each tank in order (handles overlapping tanks by returning first hit)
    for (const tank of tanks) {
        // Skip destroyed tanks - no collision with dead tanks
        if (tank.isDestroyed()) {
            continue;
        }

        // Get tank's bounding box for rectangular hitbox collision
        const bounds = tank.getBounds();

        // Check if point is within rectangular hitbox
        // bounds.x is left edge, bounds.y is top edge
        const withinX = x >= bounds.x && x <= bounds.x + bounds.width;
        const withinY = y >= bounds.y && y <= bounds.y + bounds.height;

        if (withinX && withinY) {
            // Calculate if this is a direct hit (within 5px of tank center)
            const center = tank.getCenter();
            const dx = x - center.x;
            const dy = y - center.y;
            const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
            const directHit = distanceToCenter <= DIRECT_HIT_DISTANCE;

            if (directHit) {
                console.log(`Direct hit on ${tank.team} tank! Distance to center: ${distanceToCenter.toFixed(1)}px`);
            } else {
                console.log(`Hit ${tank.team} tank at (${x.toFixed(1)}, ${y.toFixed(1)})`);
            }

            return {
                tank: tank,
                directHit: directHit
            };
        }
    }

    // No collision with any tank
    return null;
}
