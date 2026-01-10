/**
 * Scorched Earth: Synthwave Edition
 * Projectile physics and management
 *
 * Implements ballistic physics with gravity and wind effects.
 * Projectiles spawn from tank barrel and follow parabolic arcs.
 */

import { PHYSICS, PROJECTILE, CANVAS, DEBUG } from './constants.js';
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

        // =============================================================================
        // DIGGING STATE (for Digger-type weapons)
        // =============================================================================

        /**
         * Whether this projectile is currently in digging mode.
         * Digger weapons enter digging mode on first terrain contact instead of exploding.
         * @type {boolean}
         */
        this.isDigging = false;

        /**
         * Distance traveled while digging (in pixels).
         * Tracks how far the digger has tunneled through terrain.
         * @type {number}
         */
        this.digDistance = 0;

        /**
         * Direction vector for digging (normalized).
         * Set when digger enters terrain, maintains the trajectory.
         * @type {{x: number, y: number}}
         */
        this.digDirection = { x: 0, y: 0 };

        /**
         * Speed while digging (pixels per frame).
         * Slightly reduced from impact speed for realism.
         * @type {number}
         */
        this.digSpeed = 0;

        /**
         * Entry point where digger entered terrain.
         * Used for visual effects and tunnel creation.
         * @type {{x: number, y: number}|null}
         */
        this.digEntryPoint = null;

        /**
         * Distance traveled since spawn (in pixels).
         * Used to prevent immediate self-collision at low angles.
         * @type {number}
         */
        this.distanceTraveled = 0;

        /**
         * Minimum distance before self-collision is possible.
         * Projectile must travel this far before it can hit the tank that fired it.
         * @type {number}
         */
        this.safeDistance = PROJECTILE.SELF_COLLISION_SAFE_DISTANCE || 50;

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

        // Store previous position for distance calculation
        const prevX = this.x;
        const prevY = this.y;

        // Update position based on velocity
        this.x += this.vx;
        this.y += this.vy;

        // Track distance traveled (for self-collision prevention)
        const dx = this.x - prevX;
        const dy = this.y - prevY;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

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
     * Check if the projectile can hit its owner tank.
     * Returns false until the projectile has traveled a safe distance,
     * preventing immediate self-collision at low firing angles.
     *
     * @returns {boolean} True if projectile can collide with owner tank
     */
    canHitOwner() {
        return this.distanceTraveled >= this.safeDistance;
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

        // Check for steep cliff - roller cannot climb slopes steeper than ~45 degrees
        // If trying to climb (heightDiff > 0) and slope too steep, reverse direction
        const maxClimbAngle = 45; // degrees - maximum slope the roller can climb
        const slopeDegrees = Math.abs(Math.atan2(heightDiff, lookAhead) * 180 / Math.PI);

        if (heightDiff > 1 && slopeDegrees > maxClimbAngle) {
            // Cliff too steep - reverse direction and lose most momentum
            this.rollDirection *= -1;
            this.rollVelocity = Math.abs(this.rollVelocity) * 0.3 * this.rollDirection; // Lose 70% momentum on bounce

            if (DEBUG.ENABLED) {
                console.log(`[Roller] Cliff too steep (${slopeDegrees.toFixed(1)}°), reversing direction`);
            }
        }

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

    // =============================================================================
    // DIGGING WEAPON SUPPORT
    // =============================================================================

    /**
     * Check if this projectile should enter digging mode on terrain contact.
     * Only digging-type weapons enter digging mode.
     *
     * @returns {boolean} True if weapon is a digging type and not already digging
     */
    shouldDig() {
        if (this.isDigging) return false;

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        if (!weapon || weapon.type !== WEAPON_TYPES.DIGGING) return false;

        return true;
    }

    /**
     * Start digging mode for this projectile.
     * Sets the digging direction based on current velocity and records entry point.
     *
     * @param {number} entryX - The X position where digger enters terrain
     * @param {number} entryY - The Y position where digger enters terrain (canvas coords)
     */
    startDigging(entryX, entryY) {
        this.isDigging = true;
        this.digDistance = 0;

        // Record entry point for visual effects
        this.digEntryPoint = { x: entryX, y: entryY };

        // Calculate normalized direction vector from current velocity
        const speed = this.getSpeed();
        if (speed > 0.01) {
            this.digDirection = {
                x: this.vx / speed,
                y: this.vy / speed
            };
        } else {
            // If speed is negligible, default to straight down
            this.digDirection = { x: 0, y: 1 };
        }

        // Set digging speed (slightly slower than impact speed, but minimum 3 px/frame)
        this.digSpeed = Math.max(speed * 0.7, 3);

        console.log(`Digger started digging at (${entryX.toFixed(1)}, ${entryY.toFixed(1)}), direction=(${this.digDirection.x.toFixed(2)}, ${this.digDirection.y.toFixed(2)}), speed=${this.digSpeed.toFixed(2)}`);
    }

    /**
     * Update the digger's position while tunneling through terrain.
     * Creates a tunnel along the path and checks for emergence or distance limit.
     *
     * @param {import('./terrain.js').Terrain} terrain - The terrain to dig through
     * @param {import('./tank.js').Tank[]} tanks - Array of tanks to check for collision
     * @returns {{explode: boolean, reason: string, hitTank?: import('./tank.js').Tank}|null} Explosion trigger info or null to continue digging
     */
    updateDigging(terrain, tanks) {
        if (!this.isDigging) return null;

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        const maxTunnelDistance = weapon?.tunnelDistance || 100;
        const tunnelRadius = weapon?.tunnelRadius || 10;

        // Move in digging direction
        const prevX = this.x;
        const prevY = this.y;

        this.x += this.digDirection.x * this.digSpeed;
        this.y += this.digDirection.y * this.digSpeed;

        // Update distance traveled
        const stepDistance = Math.sqrt(
            Math.pow(this.x - prevX, 2) +
            Math.pow(this.y - prevY, 2)
        );
        this.digDistance += stepDistance;

        // Destroy terrain along the tunnel path
        // Use smaller destruction at current position to create smooth tunnel
        terrain.destroyTerrain(this.x, this.y, tunnelRadius);

        // Check for tank collision while underground
        for (const tank of tanks) {
            if (tank.isDestroyed()) continue;

            const bounds = tank.getBounds();
            if (this.x >= bounds.x && this.x <= bounds.x + bounds.width &&
                this.y >= bounds.y && this.y <= bounds.y + bounds.height) {
                console.log(`Digger hit ${tank.team} tank while digging!`);
                return { explode: true, reason: 'tank', hitTank: tank };
            }
        }

        // Check if we've reached max tunnel distance
        if (this.digDistance >= maxTunnelDistance) {
            console.log(`Digger reached max distance (${maxTunnelDistance}px)`);
            return { explode: true, reason: 'distance' };
        }

        // Check if we've emerged from terrain (exited the other side)
        const flooredX = Math.floor(this.x);
        if (flooredX >= 0 && flooredX < terrain.getWidth()) {
            const terrainHeight = terrain.getHeight(flooredX);
            const terrainSurfaceY = CANVAS.DESIGN_HEIGHT - terrainHeight;

            // We've emerged if we're above the terrain surface
            // Add a small buffer to prevent immediate re-triggering
            if (this.y < terrainSurfaceY - 2) {
                console.log(`Digger emerged from terrain at (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);

                // Exit digging mode and resume normal flight
                this.isDigging = false;

                // Restore velocity for continued flight
                this.vx = this.digDirection.x * this.digSpeed;
                this.vy = this.digDirection.y * this.digSpeed;

                return null; // Don't explode, continue flying
            }
        }

        // Check for out of bounds (left/right)
        if (this.x < 0 || this.x >= terrain.getWidth()) {
            return { explode: true, reason: 'wall' };
        }

        // Check for out of bounds (bottom)
        if (this.y >= CANVAS.DESIGN_HEIGHT) {
            return { explode: true, reason: 'bottom' };
        }

        // Add trail position while digging (for visual effect)
        this.trail.push({ x: this.x, y: this.y });
        while (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        return null; // Continue digging
    }

    /**
     * Check if the digger is currently underground.
     * @returns {boolean} True if projectile is in digging mode
     */
    isUnderground() {
        return this.isDigging;
    }

    /**
     * Get the dig entry point for visual effects.
     * @returns {{x: number, y: number}|null} Entry point or null if not digging
     */
    getDigEntryPoint() {
        return this.digEntryPoint;
    }

    /**
     * Get the current dig distance traveled.
     * @returns {number} Distance in pixels
     */
    getDigDistance() {
        return this.digDistance;
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
 * - Owner tank is skipped if projectile hasn't traveled safe distance
 * - When tanks overlap, returns the first hit tank in array order
 * - Returns null if no collision detected
 *
 * @param {number} x - X coordinate of projectile position
 * @param {number} y - Y coordinate of projectile position
 * @param {import('./tank.js').Tank[]} tanks - Array of tanks to check collision against
 * @param {Object} [options] - Optional collision options
 * @param {string} [options.owner] - Team name of the tank that fired (e.g., 'player', 'enemy')
 * @param {boolean} [options.canHitOwner=true] - Whether the projectile can hit its owner
 * @returns {{tank: import('./tank.js').Tank, directHit: boolean}|null} Hit info or null if no collision
 */
export function checkTankCollision(x, y, tanks, options = {}) {
    if (!tanks || tanks.length === 0) {
        return null;
    }

    const { owner, canHitOwner = true } = options;

    // Check each tank in order (handles overlapping tanks by returning first hit)
    for (const tank of tanks) {
        // Skip destroyed tanks - no collision with dead tanks
        if (tank.isDestroyed()) {
            continue;
        }

        // Skip owner tank if projectile hasn't traveled safe distance yet
        if (owner && tank.team === owner && !canHitOwner) {
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
