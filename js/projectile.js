/**
 * Scorched Earth: Synthwave Edition
 * Projectile physics and management
 *
 * Implements ballistic physics with gravity and wind effects.
 * Projectiles spawn from tank barrel and follow parabolic arcs.
 */

import { PHYSICS, PROJECTILE, DEBUG } from './constants.js';
import { WeaponRegistry, WEAPON_TYPES } from './weapons.js';
import { getScreenWidth, getScreenHeight } from './screenSize.js';

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
         * Custom projectile color override.
         * Used for Fireworks weapon where each sub-projectile has a unique color.
         * If null, uses the weapon's default projectileColor.
         * @type {string|null}
         */
        this.projectileColor = options.projectileColor || null;

        /**
         * Custom trail color override.
         * Used for Fireworks weapon where each sub-projectile has a unique color.
         * If null, uses the weapon's default trailColor.
         * @type {string|null}
         */
        this.trailColor = options.trailColor || null;

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

        /**
         * Chain depth for chain reaction weapons.
         * Starts at 0 and increments with each chain. Max depth is 3.
         * @type {number}
         */
        this.chainDepth = options.chainDepth || 0;

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

        // =============================================================================
        // BOUNCING STATE (for Bouncer-type weapons)
        // =============================================================================

        /**
         * Number of bounces remaining for bouncer weapons.
         * Decrements on each terrain impact until 0.
         * @type {number}
         */
        this.bouncesRemaining = options.bouncesRemaining ?? (WeaponRegistry.getWeapon(weaponId)?.bounceCount || 0);

        /**
         * Whether this projectile is a bouncing type.
         * Determined from weapon bounceCount property.
         * @type {boolean}
         */
        this.isBouncer = this.bouncesRemaining > 0;

        // =============================================================================
        // DEPLOYABLE STATE (for Land Mine and Sticky Bomb weapons)
        // =============================================================================

        /**
         * Whether this projectile is deployed (stationary, waiting to trigger).
         * Used for land mines and sticky bombs.
         * @type {boolean}
         */
        this.isDeployed = false;

        /**
         * Timestamp when deployment started.
         * Used to track deployment duration for timeouts and timers.
         * @type {number}
         */
        this.deployStartTime = 0;

        /**
         * Position where the projectile is deployed.
         * @type {{x: number, y: number}|null}
         */
        this.deployPosition = null;

        /**
         * Whether this is a land mine (triggers on proximity).
         * @type {boolean}
         */
        this.isLandMine = weaponId === 'land-mine';

        /**
         * Whether this is a sticky bomb (has countdown timer).
         * @type {boolean}
         */
        this.isStickyBomb = weaponId === 'sticky-bomb';

        /**
         * Proximity trigger radius for land mines (in pixels).
         * @type {number}
         */
        this.proximityRadius = 50;

        /**
         * Number of turns the land mine has persisted.
         * @type {number}
         */
        this.turnsPersisted = 0;

        /**
         * Whether this is a vertical strike weapon (Lightning Strike, Ion Cannon).
         * Vertical strikes ignore gravity and fall straight down.
         * @type {boolean}
         */
        this.isVerticalStrike = false;

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

        // Vertical strike weapons ignore wind and gravity - they fall straight down
        if (!this.isVerticalStrike) {
            // Apply wind to horizontal velocity
            // Wind is a constant force that affects velocity each frame
            this.vx += wind;

            // Apply gravity to vertical velocity
            // Gravity is a constant acceleration downward (positive Y in canvas)
            this.vy += PHYSICS.GRAVITY;
        }

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
     * - X > screen width (right of screen) - uses dynamic screen width
     * - Y > screen height (below screen) - uses dynamic screen height
     *
     * Note: Y < 0 (above screen) is NOT out of bounds - projectiles
     * can arc high and come back down.
     *
     * @private
     */
    _checkBounds() {
        // Get dynamic screen dimensions for bounds checking
        const screenWidth = getScreenWidth();
        const screenHeight = getScreenHeight();

        // Left boundary
        if (this.x < 0) {
            this.active = false;
            console.log('Projectile went out of bounds (left)');
            return;
        }

        // Right boundary (uses dynamic screen width)
        if (this.x > screenWidth) {
            this.active = false;
            console.log(`Projectile went out of bounds (right at x=${this.x.toFixed(0)}, screenWidth=${screenWidth})`);
            return;
        }

        // Bottom boundary (below terrain floor, uses dynamic screen height)
        if (this.y > screenHeight) {
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
     * Heavy Roller gets increased initial momentum.
     *
     * @param {number} terrainY - The Y position of the terrain surface (canvas coords)
     */
    startRolling(terrainY) {
        this.isRolling = true;
        this.rollStartTime = performance.now();

        // Set roll direction based on horizontal velocity at impact
        // If vx is very small, default to rolling right
        this.rollDirection = this.vx >= 0 ? 1 : -1;

        // Check if this is a Heavy Roller for momentum boost
        const isHeavyRoller = this.weaponId === 'heavy-roller';

        // Initial roll velocity is based on horizontal speed at impact
        // Heavy Roller gets 80% of impact velocity retained, normal gets 50%
        const velocityRetention = isHeavyRoller ? 0.8 : 0.5;
        const minRollSpeed = isHeavyRoller ? 4 : 2; // Heavy Roller has higher minimum speed
        this.rollVelocity = Math.max(Math.abs(this.vx) * velocityRetention, minRollSpeed) * this.rollDirection;

        // Snap to terrain surface
        this.y = terrainY;

        // Clear vertical velocity (now following terrain)
        this.vy = 0;

        console.log(`${isHeavyRoller ? 'Heavy Roller' : 'Roller'} started rolling at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}), direction=${this.rollDirection > 0 ? 'right' : 'left'}, velocity=${this.rollVelocity.toFixed(2)}`);
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
        // Use terrain's screen height for dynamic screen support
        const screenHeight = terrain.getScreenHeight();
        const currentTerrainHeight = terrain.getHeight(Math.floor(this.x));
        const currentSurfaceY = screenHeight - currentTerrainHeight;

        // Calculate slope at current position
        // Look ahead in roll direction to find slope
        const lookAhead = 3; // pixels ahead to check
        const nextX = Math.floor(this.x + this.rollDirection * lookAhead);

        // Check for wall (left/right boundary)
        if (nextX < 0 || nextX >= terrain.getWidth()) {
            return { explode: true, reason: 'wall' };
        }

        const nextTerrainHeight = terrain.getHeight(nextX);
        const nextSurfaceY = screenHeight - nextTerrainHeight;

        // Calculate slope angle (positive = going downhill, negative = going uphill)
        // In canvas coords: lower Y = higher on screen
        const heightDiff = currentSurfaceY - nextSurfaceY; // Positive if terrain goes up (roller goes uphill)
        const slopeAngle = Math.atan2(-heightDiff, lookAhead); // Negative heightDiff for correct direction

        // Check if this is a Heavy Roller for enhanced momentum
        const isHeavyRoller = this.weaponId === 'heavy-roller';

        // Check for steep cliff - roller cannot climb slopes steeper than ~45 degrees (60 for heavy)
        // If trying to climb (heightDiff > 0) and slope too steep, reverse direction
        const maxClimbAngle = isHeavyRoller ? 60 : 45; // Heavy Roller can climb steeper slopes
        const slopeDegrees = Math.abs(Math.atan2(heightDiff, lookAhead) * 180 / Math.PI);

        if (heightDiff > 1 && slopeDegrees > maxClimbAngle) {
            // Cliff too steep - reverse direction and lose momentum
            // Heavy Roller retains more momentum (50% vs 30%)
            const momentumRetention = isHeavyRoller ? 0.5 : 0.3;
            this.rollDirection *= -1;
            this.rollVelocity = Math.abs(this.rollVelocity) * momentumRetention * this.rollDirection;

            if (DEBUG.ENABLED) {
                console.log(`[${isHeavyRoller ? 'Heavy Roller' : 'Roller'}] Cliff too steep (${slopeDegrees.toFixed(1)}°), reversing direction`);
            }
        }

        // Base roll speed affected by slope
        // Gravity effect: rolling downhill speeds up, uphill slows down
        // Heavy Roller has stronger gravity effect (more mass)
        const gravityEffect = isHeavyRoller ? 0.25 : 0.15;
        const slopeAcceleration = Math.sin(slopeAngle) * gravityEffect;

        // Update roll velocity with slope effect
        this.rollVelocity += slopeAcceleration * this.rollDirection;

        // Clamp roll speed - Heavy Roller can go faster
        const maxRollSpeed = isHeavyRoller ? 12 : 8;
        const minRollSpeed = isHeavyRoller ? 0.8 : 0.5;
        const absVelocity = Math.abs(this.rollVelocity);

        if (absVelocity > maxRollSpeed) {
            this.rollVelocity = maxRollSpeed * this.rollDirection;
        }

        // Check for valley bottom (speed too low to climb)
        // If we're trying to go uphill but can't make it, we've hit a valley
        // Heavy Roller needs higher threshold to stop
        const valleyThreshold = isHeavyRoller ? 0.8 : 0.5;
        if (absVelocity < minRollSpeed && heightDiff > valleyThreshold) {
            return { explode: true, reason: 'valley' };
        }

        // Update horizontal position
        this.x += this.rollVelocity;

        // Snap to terrain surface at new position
        const newX = Math.floor(this.x);
        if (newX >= 0 && newX < terrain.getWidth()) {
            const newTerrainHeight = terrain.getHeight(newX);
            this.y = screenHeight - newTerrainHeight;
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
     * Special handling:
     * - Drill weapon: Uses original launch angle for straight-line trajectory (ignores gravity curve)
     * - Other diggers: Use current velocity direction (which includes gravity effects)
     *
     * @param {number} entryX - The X position where digger enters terrain
     * @param {number} entryY - The Y position where digger enters terrain (canvas coords)
     */
    startDigging(entryX, entryY) {
        this.isDigging = true;
        this.digDistance = 0;

        // Record entry point for visual effects
        this.digEntryPoint = { x: entryX, y: entryY };

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        const isDrill = this.weaponId === 'drill';
        const isLaserDrill = this.weaponId === 'laser-drill';

        // Drill weapon uses original launch angle for straight-line digging
        // This makes it ignore gravity's effect on trajectory
        if (isDrill) {
            // Use the original launch angle to calculate direction
            const radians = (this.launchAngle * Math.PI) / 180;
            this.digDirection = {
                x: Math.cos(radians),
                y: -Math.sin(radians) // Negative because canvas Y is inverted
            };
            // Drill is fast - use higher base speed
            this.digSpeed = 6;
            console.log(`Drill started digging in straight line at angle ${this.launchAngle}°`);
        } else {
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
            // Laser Drill is slightly slower but has wider beam
            this.digSpeed = isLaserDrill ? Math.max(speed * 0.5, 2.5) : Math.max(speed * 0.7, 3);
        }

        console.log(`${weapon?.name || 'Digger'} started digging at (${entryX.toFixed(1)}, ${entryY.toFixed(1)}), direction=(${this.digDirection.x.toFixed(2)}, ${this.digDirection.y.toFixed(2)}), speed=${this.digSpeed.toFixed(2)}`);
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
            const terrainSurfaceY = terrain.getScreenHeight() - terrainHeight;

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

        // Check for out of bounds (bottom) - use dynamic screen height
        if (this.y >= terrain.getScreenHeight()) {
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

    // =============================================================================
    // BOUNCING WEAPON SUPPORT
    // =============================================================================

    /**
     * Check if this projectile should bounce on terrain contact.
     * Returns true if bounces remaining and not in other special modes.
     *
     * @returns {boolean} True if projectile should bounce
     */
    shouldBounce() {
        if (this.isRolling || this.isDigging || this.isDeployed) return false;
        return this.isBouncer && this.bouncesRemaining > 0;
    }

    /**
     * Perform a bounce off terrain.
     * Reflects velocity, reduces speed slightly, decrements bounce count.
     *
     * @param {number} terrainSurfaceY - The Y position of the terrain surface
     * @param {number} [slopeAngle=0] - The angle of the terrain slope in radians
     */
    bounce(terrainSurfaceY, slopeAngle = 0) {
        this.bouncesRemaining--;

        // Position above terrain
        this.y = terrainSurfaceY - 2;

        // Reflect velocity with energy loss
        const energyRetention = 0.7; // Lose 30% energy on each bounce

        // Simple reflection: reverse vertical velocity
        this.vy = -Math.abs(this.vy) * energyRetention;

        // Slightly reduce horizontal velocity too
        this.vx *= energyRetention;

        // Apply slope effect - terrain angle affects bounce direction
        if (Math.abs(slopeAngle) > 0.1) {
            // Add horizontal push based on slope
            const slopePush = Math.sin(slopeAngle) * Math.abs(this.vy) * 0.5;
            this.vx += slopePush;
        }

        console.log(`Bouncer bounced! ${this.bouncesRemaining} bounces remaining. New vel=(${this.vx.toFixed(2)}, ${this.vy.toFixed(2)})`);
    }

    /**
     * Get the number of bounces remaining.
     * @returns {number} Bounces remaining
     */
    getBouncesRemaining() {
        return this.bouncesRemaining;
    }

    // =============================================================================
    // DEPLOYABLE WEAPON SUPPORT (Land Mine, Sticky Bomb)
    // =============================================================================

    /**
     * Check if this projectile should deploy on terrain contact.
     * Only deployable weapons (land mine, sticky bomb) can deploy.
     *
     * @returns {boolean} True if weapon should deploy
     */
    shouldDeploy() {
        if (this.isDeployed || this.isRolling || this.isDigging) return false;

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        return weapon?.deployable === true;
    }

    /**
     * Deploy this projectile at the current position.
     * Projectile becomes stationary and waits for trigger.
     *
     * @param {number} x - Deploy X position
     * @param {number} y - Deploy Y position (terrain surface)
     */
    deploy(x, y) {
        this.isDeployed = true;
        this.deployStartTime = performance.now();
        this.deployPosition = { x, y };
        this.x = x;
        this.y = y;

        // Clear velocity - deployed weapons are stationary
        this.vx = 0;
        this.vy = 0;

        console.log(`${this.weaponId} deployed at (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }

    /**
     * Update deployed projectile state.
     * For land mines: Check proximity trigger
     * For sticky bombs: Check countdown timer
     *
     * @param {import('./tank.js').Tank[]} tanks - Array of tanks to check proximity
     * @returns {{explode: boolean, reason: string}|null} Trigger info or null
     */
    updateDeployed(tanks) {
        if (!this.isDeployed) return null;

        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        const deployTimeout = weapon?.rollTimeout || 10000;
        const deployDuration = performance.now() - this.deployStartTime;

        // Sticky Bomb: Fixed countdown timer
        if (this.isStickyBomb) {
            if (deployDuration >= deployTimeout) {
                return { explode: true, reason: 'timer' };
            }
            return null;
        }

        // Land Mine: Check proximity trigger
        if (this.isLandMine) {
            // Check timeout (10 seconds default)
            if (deployDuration >= deployTimeout) {
                return { explode: true, reason: 'timeout' };
            }

            // Check proximity to enemy tanks
            for (const tank of tanks) {
                if (tank.isDestroyed()) continue;
                // Don't trigger on owner's tank
                if (tank.team === this.owner) continue;

                const tankPos = tank.getPosition();
                const dx = tankPos.x - this.x;
                const dy = tankPos.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= this.proximityRadius) {
                    console.log(`Land mine triggered by ${tank.team} tank at distance ${distance.toFixed(1)}`);
                    return { explode: true, reason: 'proximity', hitTank: tank };
                }
            }

            return null;
        }

        // Fallback: check timeout for any other deployable
        if (deployDuration >= deployTimeout) {
            return { explode: true, reason: 'timeout' };
        }

        return null;
    }

    /**
     * Get the deployment duration in milliseconds.
     * @returns {number} Time since deployment in ms
     */
    getDeployDuration() {
        if (!this.isDeployed) return 0;
        return performance.now() - this.deployStartTime;
    }

    /**
     * Get the remaining time on sticky bomb timer.
     * @returns {number} Time remaining in ms, or 0 if not a sticky bomb
     */
    getStickyBombTimeRemaining() {
        if (!this.isStickyBomb || !this.isDeployed) return 0;
        const weapon = WeaponRegistry.getWeapon(this.weaponId);
        const timeout = weapon?.rollTimeout || 2000;
        return Math.max(0, timeout - this.getDeployDuration());
    }

    /**
     * Increment the turn counter for land mines.
     * Called at the end of each turn to track persistence.
     */
    incrementTurnsPersisted() {
        this.turnsPersisted++;
    }

    /**
     * Get the number of turns this mine has persisted.
     * @returns {number} Number of turns
     */
    getTurnsPersisted() {
        return this.turnsPersisted;
    }
}

// =============================================================================
// MIRV / SPLITTING PROJECTILE SUPPORT
// =============================================================================

/**
 * Vibrant colors for Fireworks weapon sub-projectiles.
 * Each child gets a random color from this palette for maximum visual impact.
 * @type {string[]}
 */
const FIREWORKS_COLORS = [
    '#ff0000', // Red
    '#ff6600', // Orange
    '#ffff00', // Yellow
    '#00ff00', // Green
    '#00ffff', // Cyan
    '#0066ff', // Blue
    '#9900ff', // Purple
    '#ff00ff', // Magenta
    '#ff3399', // Pink
    '#ffffff', // White
    '#ffcc00', // Gold
    '#00ff99'  // Mint
];

/**
 * Create child projectiles for a splitting weapon (MIRV, Death's Head, Fireworks).
 * Child projectiles spread in an arc centered on the parent's direction of travel.
 * Fireworks weapon gets special colorful sub-projectiles.
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
    const isFireworks = parent.weaponId === 'fireworks';

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

    const splitType = isFireworks ? 'Fireworks' : 'MIRV';
    console.log(`${splitType} split at (${parent.x.toFixed(1)}, ${parent.y.toFixed(1)}): spawning ${splitCount} warheads with ${spreadAngle}° spread`);

    for (let i = 0; i < splitCount; i++) {
        // Calculate offset angle for this child
        const offsetDegrees = startAngle + (angleStep * i);
        const offsetRadians = (offsetDegrees * Math.PI) / 180;

        // Child direction = parent direction + offset
        const childDirection = parentDirection + offsetRadians;

        // For Fireworks, assign a random vibrant color
        let projectileColor = null;
        let trailColor = null;
        if (isFireworks) {
            const colorIndex = Math.floor(Math.random() * FIREWORKS_COLORS.length);
            projectileColor = FIREWORKS_COLORS[colorIndex];
            trailColor = projectileColor;
        }

        // Create child projectile at parent's position
        const child = new Projectile({
            x: parent.x,
            y: parent.y,
            angle: 0, // Not used, we set velocity directly
            power: 0, // Not used, we set velocity directly
            weaponId: parent.weaponId,
            owner: parent.owner,
            isChild: true,
            projectileColor: projectileColor,
            trailColor: trailColor
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
 * Maximum chain depth for chain reaction weapons.
 * After this many generations, chains stop spawning new projectiles.
 * @type {number}
 */
const MAX_CHAIN_DEPTH = 3;

/**
 * Create chain reaction projectiles when a chain reaction weapon explodes.
 * Each explosion spawns splitCount new projectiles that fly outward and explode on impact.
 * Chain depth is tracked to prevent infinite chains (max 3 levels).
 *
 * @param {Projectile} parent - The parent projectile that just exploded
 * @param {{x: number, y: number}} explosionPos - Position where explosion occurred
 * @returns {Projectile[]} Array of chain reaction projectiles, or empty if max depth reached
 */
export function createChainReactionProjectiles(parent, explosionPos) {
    const weapon = WeaponRegistry.getWeapon(parent.weaponId);
    if (!weapon || !weapon.chainReaction) {
        return [];
    }

    // Check if we've reached max chain depth
    const currentDepth = parent.chainDepth || 0;
    if (currentDepth >= MAX_CHAIN_DEPTH) {
        console.log(`Chain reaction reached max depth (${MAX_CHAIN_DEPTH}), stopping chain`);
        return [];
    }

    const splitCount = weapon.splitCount || 2;
    const spreadAngle = weapon.splitAngle || 40;

    const children = [];

    // Calculate the angle between each child projectile
    // Spread them evenly in a full circle for explosion effect
    const angleStep = 360 / splitCount;

    // Chain reaction speed - consistent speed for each generation
    const chainSpeed = 8;

    console.log(`Chain reaction at (${explosionPos.x.toFixed(1)}, ${explosionPos.y.toFixed(1)}): depth=${currentDepth + 1}, spawning ${splitCount} projectiles`);

    for (let i = 0; i < splitCount; i++) {
        // Calculate angle for this child (spread evenly around circle)
        const angleDegrees = (angleStep * i) + (Math.random() * 20 - 10); // Add slight randomness
        const angleRadians = (angleDegrees * Math.PI) / 180;

        // Create child projectile at explosion position
        const child = new Projectile({
            x: explosionPos.x,
            y: explosionPos.y,
            angle: 0, // Not used, we set velocity directly
            power: 0, // Not used, we set velocity directly
            weaponId: parent.weaponId,
            owner: parent.owner,
            isChild: true,
            chainDepth: currentDepth + 1
        });

        // Set velocity based on calculated angle
        child.vx = Math.cos(angleRadians) * chainSpeed;
        child.vy = Math.sin(angleRadians) * chainSpeed;

        // Mark as already split so it doesn't try to split at apex
        child.hasSplit = true;

        children.push(child);
    }

    return children;
}

/**
 * Check if a projectile should spawn chain reaction projectiles on explosion.
 *
 * @param {Projectile} projectile - The projectile to check
 * @returns {boolean} True if chain reaction should occur
 */
export function shouldChainReact(projectile) {
    const weapon = WeaponRegistry.getWeapon(projectile.weaponId);
    if (!weapon || !weapon.chainReaction) {
        return false;
    }

    const currentDepth = projectile.chainDepth || 0;
    return currentDepth < MAX_CHAIN_DEPTH;
}

/**
 * Create a projectile fired from a tank.
 * Convenience function that extracts fire position from tank.
 *
 * For vertical weapons (Lightning Strike, Ion Cannon), the projectile
 * spawns from above the screen and falls straight down to the target X.
 *
 * @param {import('./tank.js').Tank} tank - The tank firing the projectile
 * @param {number} [wind=0] - Current wind value (optional, not used in spawn)
 * @returns {Projectile} A new projectile instance
 */
export function createProjectileFromTank(tank, wind = 0) {
    const weapon = WeaponRegistry.getWeapon(tank.currentWeapon);

    // Vertical weapons (Lightning Strike, Ion Cannon) fire from above
    if (weapon && weapon.vertical) {
        // Calculate target X position based on tank's aiming
        const firePos = tank.getFirePosition();
        const radians = (tank.angle * Math.PI) / 180;
        const range = (tank.power / 100) * 800; // Range based on power

        // Target X is where the projectile would land at terrain level
        // For vertical weapons, we use the horizontal distance calculation
        const targetX = firePos.x + Math.cos(radians) * range;

        // Spawn from top of screen
        const spawnY = -50; // Above visible screen

        const projectile = new Projectile({
            x: targetX,
            y: spawnY,
            angle: 270, // Straight down (270° = down in our angle system where 90° = up)
            power: 100, // Max speed for dramatic effect
            weaponId: tank.currentWeapon,
            owner: tank.team
        });

        // Override velocity to fall straight down at high speed
        projectile.vx = 0;
        projectile.vy = 25; // Fast downward velocity

        // Mark as vertical strike for special handling
        projectile.isVerticalStrike = true;

        console.log(`Vertical weapon ${tank.currentWeapon} targeting X=${targetX.toFixed(1)}`);

        return projectile;
    }

    // Normal projectile creation
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
        // Use dynamic screen height for proper bounds on all screen sizes
        if (proj.y > getScreenHeight()) {
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
