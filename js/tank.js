/**
 * Scorched Earth: Synthwave Edition
 * Tank entity class
 *
 * The Tank class represents a player or AI-controlled tank on the battlefield.
 * Each tank has position, health, aiming controls (angle/power), and a weapon reference.
 */

import { TANK, PHYSICS, CANVAS } from './constants.js';
import { spawnTankDestructionExplosion } from './effects.js';
import { playExplosionSound } from './sound.js';
import { getScreenWidth, getScreenHeight } from './screenSize.js';
import { getUIScale, scaled, scaledTouch, isVeryShortScreen } from './uiPosition.js';

/**
 * Team identifiers for tanks.
 * Used to distinguish between player and AI tanks.
 */
export const TEAMS = {
    PLAYER: 'player',
    ENEMY: 'enemy'
};

/**
 * Tank entity for the game.
 * Handles tank state including position, health, aiming, and current weapon.
 */
export class Tank {
    /**
     * Create a new tank.
     * @param {Object} options - Tank initialization options
     * @param {number} [options.x=0] - X position (center of tank base)
     * @param {number} [options.y=0] - Y position (bottom of tank, sits on terrain)
     * @param {string} [options.team=TEAMS.PLAYER] - Team identifier ('player' or 'enemy')
     */
    constructor(options = {}) {
        const {
            x = 0,
            y = 0,
            team = TEAMS.PLAYER
        } = options;

        /**
         * X position of the tank (center of tank base).
         * @type {number}
         */
        this.x = x;

        /**
         * Y position of the tank (bottom of tank, where it sits on terrain).
         * In canvas coordinates where Y=0 is top of canvas.
         * @type {number}
         */
        this.y = y;

        /**
         * Current health points.
         * Tank is destroyed when health reaches 0.
         * @type {number}
         */
        this.health = TANK.START_HEALTH;

        /**
         * Maximum health points for this tank.
         * Used for health bar rendering. May differ from TANK.MAX_HEALTH
         * for scaled enemies in roguelike mode.
         * @type {number}
         */
        this.maxHealth = TANK.MAX_HEALTH;

        /**
         * Turret angle in degrees.
         * 0° = pointing right, 90° = pointing up, 180° = pointing left.
         * Player tanks typically aim 0-90°, enemy tanks 90-180°.
         * @type {number}
         */
        this.angle = team === TEAMS.PLAYER ? 45 : 135;

        /**
         * Firing power as a percentage (0-100).
         * Higher power = faster initial velocity = longer range.
         * @type {number}
         */
        this.power = 50;

        /**
         * Team identifier.
         * Used for distinguishing player vs enemy and for rendering colors.
         * @type {string}
         */
        this.team = team;

        /**
         * Currently selected weapon.
         * Stores the weapon ID string (e.g., 'basic-shot', 'mirv', 'nuke').
         * The weapon registry is implemented in weapons.js.
         * @type {string}
         */
        this.currentWeapon = 'basic-shot';

        /**
         * Weapon inventory.
         * Maps weapon IDs to ammo counts.
         * 'basic-shot' has unlimited ammo (represented as Infinity).
         * @type {Object.<string, number>}
         */
        this.inventory = {
            'basic-shot': Infinity
        };

        // Falling state properties
        /**
         * Whether the tank is currently falling.
         * @type {boolean}
         */
        this.isFalling = false;

        /**
         * Current vertical velocity during fall (pixels per frame).
         * @type {number}
         */
        this.fallVelocity = 0;

        /**
         * Y position where the fall started (for calculating fall distance).
         * @type {number}
         */
        this.fallStartY = 0;

        /**
         * Target Y position where the tank will land (terrain surface).
         * @type {number}
         */
        this.targetY = 0;

        // =============================================================================
        // STATUS EFFECTS
        // =============================================================================

        /**
         * Number of turns remaining with EMP status (weapons disabled).
         * When > 0, tank can only use basic weapons (Baby Shot, Basic Shot).
         * Decrements at the start of each turn.
         * @type {number}
         */
        this.empTurnsRemaining = 0;

        /**
         * Active fallout zones affecting this tank.
         * Each zone has position, radius, damage per turn, and turns remaining.
         * @type {Array<{x: number, y: number, radius: number, damagePerTurn: number, turnsRemaining: number}>}
         */
        this.falloutZones = [];

        console.log(`Tank created: team=${team}, position=(${x}, ${y}), health=${this.health}`);
    }

    /**
     * Set the turret angle with clamping to valid range.
     * @param {number} degrees - The angle in degrees (0-180)
     */
    setAngle(degrees) {
        // Clamp to valid range
        this.angle = Math.max(PHYSICS.MIN_ANGLE, Math.min(PHYSICS.MAX_ANGLE, degrees));
    }

    /**
     * Adjust the turret angle by a delta value.
     * @param {number} delta - Amount to change angle by (positive = increase)
     */
    adjustAngle(delta) {
        this.setAngle(this.angle + delta);
    }

    /**
     * Set the firing power with clamping to valid range.
     * @param {number} percent - The power percentage (0-100)
     */
    setPower(percent) {
        // Clamp to valid range
        this.power = Math.max(PHYSICS.MIN_POWER, Math.min(PHYSICS.MAX_POWER, percent));
    }

    /**
     * Adjust the firing power by a delta value.
     * @param {number} delta - Amount to change power by (positive = increase)
     */
    adjustPower(delta) {
        this.setPower(this.power + delta);
    }

    /**
     * Apply damage to the tank.
     * Health cannot go below 0.
     * Triggers destruction explosion when tank transitions from alive to destroyed.
     * @param {number} amount - Amount of damage to apply (positive value)
     * @returns {number} The actual damage dealt (after clamping)
     */
    takeDamage(amount) {
        // Ensure amount is positive
        const damage = Math.max(0, amount);

        // Track if tank was alive before damage
        const wasAlive = this.health > 0;

        // Calculate actual damage dealt (can't deal more than remaining health)
        const actualDamage = Math.min(damage, this.health);

        // Apply damage
        this.health = Math.max(0, this.health - damage);

        console.log(`Tank (${this.team}) took ${actualDamage} damage, health: ${this.health}`);

        // Trigger destruction explosion if tank was just destroyed
        if (wasAlive && this.health <= 0) {
            this.onDestroyed();
        }

        return actualDamage;
    }

    /**
     * Called when the tank is destroyed (health reaches 0).
     * Triggers visual and audio effects for tank destruction.
     */
    onDestroyed() {
        console.log(`Tank (${this.team}) DESTROYED!`);

        // Spawn dramatic destruction explosion at tank position
        // Use the center of the tank body for the explosion
        const tankCenterY = this.y - TANK.BODY_HEIGHT / 2;
        spawnTankDestructionExplosion(this.x, tankCenterY, this.team);

        // Play explosion sound (larger than normal)
        playExplosionSound(120); // Use a large blast radius for dramatic sound
    }

    /**
     * Heal the tank by a specified amount.
     * Health cannot exceed tank's maxHealth.
     * @param {number} amount - Amount to heal
     * @returns {number} The actual amount healed
     */
    heal(amount) {
        const healAmount = Math.max(0, amount);
        const previousHealth = this.health;

        this.health = Math.min(this.maxHealth, this.health + healAmount);

        return this.health - previousHealth;
    }

    /**
     * Check if the tank is still alive.
     * @returns {boolean} True if health > 0
     */
    isAlive() {
        return this.health > 0;
    }

    /**
     * Check if the tank is destroyed.
     * @returns {boolean} True if health <= 0
     */
    isDestroyed() {
        return this.health <= 0;
    }

    /**
     * Get the current weapon ID.
     * @returns {string} The current weapon ID
     */
    getWeapon() {
        return this.currentWeapon;
    }

    /**
     * Set the current weapon.
     * Only allows setting if the tank has ammo for that weapon.
     * EMP effect prevents selection of advanced weapons.
     * @param {string} weaponId - The weapon ID to select
     * @returns {boolean} True if weapon was successfully selected
     */
    setWeapon(weaponId) {
        // Check if weapon is disabled by EMP
        if (this.isWeaponDisabledByEmp(weaponId)) {
            console.warn(`Tank (${this.team}) cannot select weapon '${weaponId}': disabled by EMP (${this.empTurnsRemaining} turns remaining)`);
            return false;
        }

        // Check if tank has this weapon with ammo
        const ammo = this.inventory[weaponId];

        if (ammo === undefined || ammo <= 0) {
            console.warn(`Tank (${this.team}) cannot select weapon '${weaponId}': no ammo`);
            return false;
        }

        this.currentWeapon = weaponId;
        return true;
    }

    /**
     * Get the ammo count for a specific weapon.
     * @param {string} weaponId - The weapon ID
     * @returns {number} Ammo count (0 if weapon not in inventory)
     */
    getAmmo(weaponId) {
        return this.inventory[weaponId] || 0;
    }

    /**
     * Add ammo for a specific weapon.
     * @param {string} weaponId - The weapon ID
     * @param {number} amount - Amount of ammo to add
     */
    addAmmo(weaponId, amount) {
        const currentAmmo = this.inventory[weaponId] || 0;

        // Don't add to infinite ammo weapons
        if (currentAmmo === Infinity) {
            return;
        }

        this.inventory[weaponId] = currentAmmo + Math.max(0, amount);
    }

    /**
     * Consume one unit of ammo for the current weapon.
     * @returns {boolean} True if ammo was consumed, false if no ammo available
     */
    consumeAmmo() {
        const ammo = this.inventory[this.currentWeapon];

        // Infinite ammo - always succeeds, doesn't decrement
        if (ammo === Infinity) {
            return true;
        }

        // No ammo
        if (!ammo || ammo <= 0) {
            return false;
        }

        // Consume ammo
        this.inventory[this.currentWeapon]--;

        // If out of this weapon, switch to basic-shot
        if (this.inventory[this.currentWeapon] <= 0) {
            console.log(`Tank (${this.team}) out of ${this.currentWeapon}, switching to basic-shot`);
            this.currentWeapon = 'basic-shot';
        }

        return true;
    }

    /**
     * Get the position where projectiles spawn from (tip of turret).
     * @returns {{x: number, y: number}} The spawn position in canvas coordinates
     */
    getFirePosition() {
        // Convert angle to radians
        const radians = (this.angle * Math.PI) / 180;

        // Calculate offset from tank center to turret tip
        // The turret pivots from the tank's top-center (top of body, not sprite)
        // Use BODY_HEIGHT for placeholder consistency; sprites use same pivot point
        const bodyHeight = TANK.BODY_HEIGHT || TANK.HEIGHT;
        const turretOffsetX = Math.cos(radians) * TANK.TURRET_LENGTH;
        const turretOffsetY = -Math.sin(radians) * TANK.TURRET_LENGTH; // Negative because canvas Y is inverted

        return {
            x: this.x + turretOffsetX,
            y: this.y - bodyHeight + turretOffsetY // Turret base is at top of tank body
        };
    }

    /**
     * Get the center position of the tank (for collision detection).
     * @returns {{x: number, y: number}} The center position
     */
    getCenter() {
        return {
            x: this.x,
            y: this.y - TANK.HEIGHT / 2
        };
    }

    /**
     * Get the bounding box of the tank for collision detection.
     * @returns {{x: number, y: number, width: number, height: number}} Bounding box
     */
    getBounds() {
        return {
            x: this.x - TANK.WIDTH / 2,
            y: this.y - TANK.HEIGHT,
            width: TANK.WIDTH,
            height: TANK.HEIGHT
        };
    }

    /**
     * Update the tank's Y position to match terrain height.
     * Call this when terrain changes or tank is placed.
     * @param {number} terrainY - The canvas Y coordinate of the terrain at tank's X position
     */
    setTerrainPosition(terrainY) {
        this.y = terrainY;
    }

    // =========================================================================
    // FALLING METHODS
    // =========================================================================

    /**
     * Start a falling animation from current position to target terrain position.
     * @param {number} targetTerrainY - The canvas Y coordinate where the tank will land
     */
    startFalling(targetTerrainY) {
        // Only start falling if there's actually a gap to fall
        if (targetTerrainY <= this.y) {
            // Tank is already at or below terrain level, no fall needed
            this.y = targetTerrainY;
            return;
        }

        this.isFalling = true;
        this.fallVelocity = 0;
        this.fallStartY = this.y;
        this.targetY = targetTerrainY;

        console.log(`Tank (${this.team}) started falling from Y=${this.y.toFixed(0)} to Y=${targetTerrainY.toFixed(0)}`);
    }

    /**
     * Update the falling animation for one frame.
     * Applies gravity and moves tank downward until it reaches the target.
     * @returns {{landed: boolean, fallDistance: number}} Result of the update
     *   - landed: true if the tank just landed this frame
     *   - fallDistance: total distance fallen (only meaningful when landed is true)
     */
    updateFalling() {
        if (!this.isFalling) {
            return { landed: false, fallDistance: 0 };
        }

        // Apply gravity to velocity
        this.fallVelocity += TANK.FALL.GRAVITY;

        // Cap velocity at maximum
        if (this.fallVelocity > TANK.FALL.MAX_VELOCITY) {
            this.fallVelocity = TANK.FALL.MAX_VELOCITY;
        }

        // Move tank downward
        this.y += this.fallVelocity;

        // Check if tank has landed
        if (this.y >= this.targetY) {
            // Land the tank
            const fallDistance = this.targetY - this.fallStartY;
            this.y = this.targetY;
            this.isFalling = false;
            this.fallVelocity = 0;

            console.log(`Tank (${this.team}) landed after falling ${fallDistance.toFixed(0)} pixels`);

            return { landed: true, fallDistance };
        }

        return { landed: false, fallDistance: 0 };
    }

    /**
     * Check if the tank is currently in a falling state.
     * @returns {boolean} True if the tank is falling
     */
    checkIsFalling() {
        return this.isFalling;
    }

    /**
     * Serialize the tank to a JSON-compatible object.
     * Used for saving game state.
     * @returns {Object} Serialized tank data
     */
    serialize() {
        return {
            x: this.x,
            y: this.y,
            health: this.health,
            maxHealth: this.maxHealth,
            angle: this.angle,
            power: this.power,
            team: this.team,
            currentWeapon: this.currentWeapon,
            inventory: { ...this.inventory },
            empTurnsRemaining: this.empTurnsRemaining
        };
    }

    /**
     * Deserialize a tank from saved data.
     * @param {Object} data - Serialized tank data
     * @returns {Tank} A new Tank instance with the deserialized data
     */
    static deserialize(data) {
        const tank = new Tank({
            x: data.x,
            y: data.y,
            team: data.team
        });

        tank.health = data.health;
        tank.maxHealth = data.maxHealth || TANK.MAX_HEALTH; // Fallback for old save data
        tank.angle = data.angle;
        tank.power = data.power;
        tank.currentWeapon = data.currentWeapon;
        tank.inventory = { ...data.inventory };
        tank.empTurnsRemaining = data.empTurnsRemaining || 0;

        return tank;
    }

    // =============================================================================
    // STATUS EFFECT METHODS
    // =============================================================================

    /**
     * Apply EMP status effect to the tank.
     * Tank can only use basic weapons (Baby Shot, Basic Shot) while affected.
     * @param {number} turns - Number of turns to disable advanced weapons
     */
    applyEmp(turns) {
        // EMP doesn't stack, use maximum duration
        this.empTurnsRemaining = Math.max(this.empTurnsRemaining, turns);
        console.log(`${this.team} tank hit by EMP! Weapons disabled for ${this.empTurnsRemaining} turns`);

        // If currently using a non-basic weapon, switch to basic shot
        if (this.isWeaponDisabledByEmp(this.currentWeapon)) {
            this.currentWeapon = 'basic-shot';
            console.log(`${this.team} tank forced to switch to Basic Shot due to EMP`);
        }
    }

    /**
     * Check if a weapon is disabled by EMP effect.
     * Only basic weapons (cost 0) can be used while EMPed.
     * @param {string} weaponId - Weapon ID to check
     * @returns {boolean} True if weapon is disabled
     */
    isWeaponDisabledByEmp(weaponId) {
        if (this.empTurnsRemaining <= 0) return false;

        // Basic weapons that are always allowed (free/unlimited ammo weapons)
        const basicWeapons = ['baby-shot', 'basic-shot'];
        return !basicWeapons.includes(weaponId);
    }

    /**
     * Check if tank is currently affected by EMP.
     * @returns {boolean} True if EMP status is active
     */
    isEmpActive() {
        return this.empTurnsRemaining > 0;
    }

    /**
     * Get the number of EMP turns remaining.
     * @returns {number} Turns remaining
     */
    getEmpTurnsRemaining() {
        return this.empTurnsRemaining;
    }

    /**
     * Decrement EMP turns at the start of a turn.
     * Call this at the beginning of the tank's turn.
     */
    tickEmpStatus() {
        if (this.empTurnsRemaining > 0) {
            this.empTurnsRemaining--;
            if (this.empTurnsRemaining > 0) {
                console.log(`${this.team} tank EMP status: ${this.empTurnsRemaining} turns remaining`);
            } else {
                console.log(`${this.team} tank EMP status has worn off - weapons restored!`);
            }
        }
    }

    /**
     * Clear all status effects.
     * Call when resetting the game or starting a new round.
     */
    clearStatusEffects() {
        this.empTurnsRemaining = 0;
        this.falloutZones = [];
    }
}

/**
 * Create a player tank with default settings.
 * @param {number} x - X position
 * @param {number} y - Y position (terrain height)
 * @returns {Tank} A new player tank
 */
export function createPlayerTank(x, y) {
    return new Tank({ x, y, team: TEAMS.PLAYER });
}

/**
 * Create an enemy tank with default settings.
 * @param {number} x - X position
 * @param {number} y - Y position (terrain height)
 * @returns {Tank} A new enemy tank
 */
export function createEnemyTank(x, y) {
    return new Tank({ x, y, team: TEAMS.ENEMY });
}

// =============================================================================
// TANK PLACEMENT ON TERRAIN
// =============================================================================

/**
 * Tank placement configuration constants.
 */
const PLACEMENT = {
    /** Player tank spawns between 15-25% of screen width */
    PLAYER_X_MIN_PERCENT: 0.15,
    PLAYER_X_MAX_PERCENT: 0.25,
    /** Enemy tank spawns between 75-85% of screen width */
    ENEMY_X_MIN_PERCENT: 0.75,
    ENEMY_X_MAX_PERCENT: 0.85,
    /** Minimum distance between tanks in pixels */
    MIN_TANK_DISTANCE: 300,
    /**
     * Maximum depth of valley tanks will spawn in.
     * If terrain height is this much lower than surrounding average, find another spot.
     * Value is in pixels.
     */
    MAX_VALLEY_DEPTH: 100,
    /** How far to sample for valley detection (each direction from spawn point) */
    VALLEY_SAMPLE_RADIUS: 80,
    /** Maximum attempts to find a suitable spawn position */
    MAX_PLACEMENT_ATTEMPTS: 20,
    /** Margin to add beyond HUD boundaries for visual clarity */
    HUD_MARGIN: 30
};

// =============================================================================
// HUD SAFE ZONE CALCULATIONS
// =============================================================================

/**
 * HUD dimensions for safe zone calculations.
 * These match the base values from ui.js and aimingControls.js.
 */
const HUD_BASE = {
    // Player info panel (top-left)
    PLAYER_INFO_PANEL: {
        WIDTH: 200,
        LEFT_OFFSET: 20
    },
    // Power bar (left side)
    POWER_BAR: {
        WIDTH: 55,
        PADDING: 10,
        LEFT_OFFSET: 50
    },
    // Fire button (bottom-right)
    FIRE_BUTTON: {
        WIDTH: 180,
        RIGHT_OFFSET: 130,   // Normal screens
        RIGHT_OFFSET_SHORT: 90  // Very short screens
    },
    // Money panel (bottom-right)
    MONEY_PANEL: {
        WIDTH: 140,
        RIGHT_OFFSET: 20
    },
    // Token panel (bottom-right, left of money panel)
    TOKEN_PANEL: {
        WIDTH: 100,
        GAP: 10  // Gap between token and money panel
    }
};

/**
 * Calculate the minimum X position for player tank to avoid left-side HUD.
 *
 * The left side has:
 * - Player info panel at fromLeft(20), width ~200px
 * - Power bar at fromLeft(scaled(50)), width ~55px + padding
 *
 * We use the player info panel as the primary constraint since it's the widest.
 *
 * @returns {number} Minimum X position for player tank
 */
function getPlayerMinXForHUD() {
    const scale = getUIScale();

    // Player info panel is the main constraint on the left
    const panelWidth = scaled(HUD_BASE.PLAYER_INFO_PANEL.WIDTH);
    const panelOffset = HUD_BASE.PLAYER_INFO_PANEL.LEFT_OFFSET;

    // The tank center should be beyond the panel right edge + margin + half tank width
    const minX = panelOffset + panelWidth + PLACEMENT.HUD_MARGIN + TANK.WIDTH / 2;

    return minX;
}

/**
 * Calculate the maximum X position for enemy tank to avoid right-side HUD.
 *
 * The right side has:
 * - Fire button at fromRight(90-130), width ~140-180px
 * - Money panel at fromRight(20), width ~140px
 * - Token panel adjacent to money panel
 *
 * Fire button extends furthest into the play area, so it's the primary constraint.
 *
 * @returns {number} Maximum X position for enemy tank
 */
function getEnemyMaxXForHUD() {
    const screenWidth = getScreenWidth();
    const veryShort = isVeryShortScreen();

    // Fire button is the main constraint on the right
    // On very short screens it's closer to the edge (90px), otherwise 130px
    const fireButtonRightOffset = veryShort
        ? HUD_BASE.FIRE_BUTTON.RIGHT_OFFSET_SHORT
        : scaled(HUD_BASE.FIRE_BUTTON.RIGHT_OFFSET);
    const fireButtonWidth = veryShort
        ? scaledTouch(140)
        : scaledTouch(HUD_BASE.FIRE_BUTTON.WIDTH);

    // Fire button center is at fromRight(fireButtonRightOffset)
    // So the left edge of the button is at screenWidth - fireButtonRightOffset - fireButtonWidth/2
    const fireButtonLeftEdge = screenWidth - fireButtonRightOffset - fireButtonWidth / 2;

    // The tank center should be before the button left edge - margin - half tank width
    const maxX = fireButtonLeftEdge - PLACEMENT.HUD_MARGIN - TANK.WIDTH / 2;

    return maxX;
}

/**
 * Calculate the average terrain height over a range centered at x.
 * Used for valley detection.
 *
 * @param {import('./terrain.js').Terrain} terrain - The terrain instance
 * @param {number} x - Center x coordinate
 * @param {number} radius - Radius to sample on each side
 * @returns {number} Average terrain height in the sampled range
 */
function getAverageTerrainHeight(terrain, x, radius) {
    let sum = 0;
    let count = 0;

    const startX = Math.max(0, Math.floor(x - radius));
    const endX = Math.min(terrain.getWidth() - 1, Math.ceil(x + radius));

    for (let xi = startX; xi <= endX; xi++) {
        sum += terrain.getHeight(xi);
        count++;
    }

    return count > 0 ? sum / count : terrain.getHeight(x);
}

/**
 * Check if a position is in a valley (too deep compared to surrounding terrain).
 *
 * @param {import('./terrain.js').Terrain} terrain - The terrain instance
 * @param {number} x - X coordinate to check
 * @returns {boolean} True if the position is in a valley that's too deep
 */
function isInDeepValley(terrain, x) {
    const heightAtX = terrain.getHeight(x);
    const averageHeight = getAverageTerrainHeight(terrain, x, PLACEMENT.VALLEY_SAMPLE_RADIUS);

    // If the terrain at x is significantly lower than the average, it's a deep valley
    return (averageHeight - heightAtX) > PLACEMENT.MAX_VALLEY_DEPTH;
}

/**
 * Find the best X position for a tank within a range, avoiding deep valleys.
 * The "best" position is the one with the highest terrain height within the range
 * that isn't in a deep valley.
 *
 * @param {import('./terrain.js').Terrain} terrain - The terrain instance
 * @param {number} minX - Minimum X position (inclusive)
 * @param {number} maxX - Maximum X position (inclusive)
 * @returns {number} The best X position for tank placement
 */
function findBestXInRange(terrain, minX, maxX) {
    let bestX = Math.floor((minX + maxX) / 2); // Default to center if nothing better found
    let bestHeight = -Infinity;
    let anyValidFound = false;

    // Sample positions across the range
    const step = Math.max(1, Math.floor((maxX - minX) / 20)); // Check up to 20 positions

    for (let x = minX; x <= maxX; x += step) {
        const xi = Math.floor(x);
        const height = terrain.getHeight(xi);

        // Skip positions in deep valleys
        if (isInDeepValley(terrain, xi)) {
            continue;
        }

        anyValidFound = true;

        // Prefer higher terrain (less likely to be obscured)
        if (height > bestHeight) {
            bestHeight = height;
            bestX = xi;
        }
    }

    // If no valid position found (all in valleys), just use center of range
    if (!anyValidFound) {
        bestX = Math.floor((minX + maxX) / 2);
        console.warn(`All positions in range ${minX}-${maxX} are in deep valleys, using center`);
    }

    return bestX;
}

/**
 * Convert terrain height to canvas Y coordinate.
 * Terrain heights are stored as distance from bottom, but canvas Y=0 is at top.
 * Uses the terrain's stored screen height for dynamic screen support.
 *
 * @param {import('./terrain.js').Terrain} terrain - The terrain instance
 * @param {number} terrainHeight - Height from bottom of canvas
 * @returns {number} Canvas Y coordinate (Y=0 at top)
 */
function terrainHeightToCanvasY(terrain, terrainHeight) {
    return terrain.getScreenHeight() - terrainHeight;
}

/**
 * Place a tank on the terrain at a given X position.
 * Sets the tank's Y position so it sits on the terrain surface.
 *
 * @param {Tank} tank - The tank to place
 * @param {import('./terrain.js').Terrain} terrain - The terrain instance
 * @param {number} x - X position for the tank
 */
function placeTankAtX(tank, terrain, x) {
    tank.x = x;
    // Tank Y is the canvas Y of the bottom of the tank (where it touches ground)
    const terrainHeight = terrain.getHeight(x);
    tank.y = terrainHeightToCanvasY(terrain, terrainHeight);
}

/**
 * Place player and enemy tanks on terrain at appropriate positions.
 * - Player tank: left third of screen (15-25% x position), but avoiding left HUD
 * - Enemy tank: right third of screen (75-85% x position), but avoiding right HUD
 * - Both tanks sit on top of terrain
 * - Avoids spawning in deep valleys
 * - Enforces minimum distance between tanks
 * - Ensures tanks don't spawn under HUD elements
 *
 * This function should be called at the start of each round with the new terrain.
 *
 * @param {import('./terrain.js').Terrain} terrain - The terrain instance
 * @returns {{player: Tank, enemy: Tank}} Object containing the placed player and enemy tanks
 */
export function placeTanksOnTerrain(terrain) {
    const width = terrain.getWidth();

    // Calculate HUD-aware spawn boundaries
    const hudMinPlayerX = getPlayerMinXForHUD();
    const hudMaxEnemyX = getEnemyMaxXForHUD();

    // Calculate percentage-based spawn ranges
    const percentPlayerMinX = Math.floor(width * PLACEMENT.PLAYER_X_MIN_PERCENT);
    const percentPlayerMaxX = Math.floor(width * PLACEMENT.PLAYER_X_MAX_PERCENT);
    const percentEnemyMinX = Math.floor(width * PLACEMENT.ENEMY_X_MIN_PERCENT);
    const percentEnemyMaxX = Math.floor(width * PLACEMENT.ENEMY_X_MAX_PERCENT);

    // Apply HUD constraints: player minimum X must clear the left HUD
    // Enemy maximum X must stay clear of the right HUD
    const playerMinX = Math.max(percentPlayerMinX, hudMinPlayerX);
    const playerMaxX = percentPlayerMaxX;
    const enemyMinX = percentEnemyMinX;
    const enemyMaxX = Math.min(percentEnemyMaxX, hudMaxEnemyX);

    // Validate spawn ranges are still viable
    // On very narrow screens, ranges might collapse - handle gracefully
    const effectivePlayerMinX = Math.min(playerMinX, playerMaxX - TANK.WIDTH);
    const effectivePlayerMaxX = playerMaxX;
    const effectiveEnemyMinX = enemyMinX;
    const effectiveEnemyMaxX = Math.max(enemyMaxX, enemyMinX + TANK.WIDTH);

    // Log spawn zone calculations for debugging
    console.log(`[Tank Spawn] Screen width: ${width}px`);
    console.log(`[Tank Spawn] HUD constraints: playerMinX=${hudMinPlayerX.toFixed(0)}, enemyMaxX=${hudMaxEnemyX.toFixed(0)}`);
    console.log(`[Tank Spawn] Player range: ${effectivePlayerMinX.toFixed(0)}-${effectivePlayerMaxX.toFixed(0)}`);
    console.log(`[Tank Spawn] Enemy range: ${effectiveEnemyMinX.toFixed(0)}-${effectiveEnemyMaxX.toFixed(0)}`);

    // Find best positions for each tank within the constrained ranges
    const playerX = findBestXInRange(terrain, effectivePlayerMinX, effectivePlayerMaxX);
    const enemyX = findBestXInRange(terrain, effectiveEnemyMinX, effectiveEnemyMaxX);

    // Calculate canvas Y positions from terrain heights
    const playerTerrainHeight = terrain.getHeight(playerX);
    const enemyTerrainHeight = terrain.getHeight(enemyX);
    const playerY = terrainHeightToCanvasY(terrain, playerTerrainHeight);
    const enemyY = terrainHeightToCanvasY(terrain, enemyTerrainHeight);

    // Create tanks at the calculated positions
    const playerTank = createPlayerTank(playerX, playerY);
    const enemyTank = createEnemyTank(enemyX, enemyY);

    // Verify minimum distance (should always pass given the X ranges)
    const distance = Math.abs(enemyX - playerX);
    if (distance < PLACEMENT.MIN_TANK_DISTANCE) {
        console.warn(`Tank distance ${distance}px is less than minimum ${PLACEMENT.MIN_TANK_DISTANCE}px`);
    }

    console.log(`Tanks placed: Player at (${playerX}, ${playerY.toFixed(0)}), Enemy at (${enemyX}, ${enemyY.toFixed(0)}), distance=${distance}px`);

    return { player: playerTank, enemy: enemyTank };
}

/**
 * Update a tank's position to match the current terrain height.
 * If there's a gap between the tank and terrain, starts a falling animation
 * instead of teleporting the tank.
 *
 * Call this when terrain changes (e.g., after an explosion) to ensure
 * tanks don't float or sink into the ground.
 *
 * @param {Tank} tank - The tank to update
 * @param {import('./terrain.js').Terrain} terrain - The terrain instance
 * @returns {boolean} True if the tank started falling, false if already on terrain
 */
export function updateTankTerrainPosition(tank, terrain) {
    const terrainHeight = terrain.getHeight(tank.x);
    const targetY = terrainHeightToCanvasY(terrain, terrainHeight);

    // If tank is already falling, don't restart the fall
    if (tank.isFalling) {
        // Update the target Y in case terrain changed during fall
        tank.targetY = targetY;
        return true;
    }

    // Check if there's a gap (tank is above terrain)
    const gap = targetY - tank.y;

    if (gap > 1) {
        // Start falling animation
        tank.startFalling(targetY);
        return true;
    } else {
        // No gap or tank is below terrain - just set position directly
        tank.y = targetY;
        return false;
    }
}

/**
 * Calculate fall damage based on fall distance.
 * Uses a linear scale between threshold and lethal distances.
 *
 * Damage formula:
 * - Falls < DAMAGE_THRESHOLD pixels: 0 damage
 * - Falls >= LETHAL_DISTANCE pixels: 100 damage (instant kill)
 * - Falls in between: linear interpolation from MIN_DAMAGE to MAX_DAMAGE
 *
 * @param {number} fallDistance - Distance fallen in pixels
 * @returns {number} Damage amount to apply (0-100)
 */
export function calculateFallDamage(fallDistance) {
    const { DAMAGE_THRESHOLD, LETHAL_DISTANCE, MIN_DAMAGE, MAX_DAMAGE } = TANK.FALL;

    // No damage for small falls
    if (fallDistance < DAMAGE_THRESHOLD) {
        return 0;
    }

    // Instant death for catastrophic falls
    if (fallDistance >= LETHAL_DISTANCE) {
        return 100;
    }

    // Linear interpolation between threshold and lethal distance
    // Maps [DAMAGE_THRESHOLD, LETHAL_DISTANCE) -> [MIN_DAMAGE, MAX_DAMAGE]
    const normalized = (fallDistance - DAMAGE_THRESHOLD) / (LETHAL_DISTANCE - DAMAGE_THRESHOLD);
    const damage = MIN_DAMAGE + normalized * (MAX_DAMAGE - MIN_DAMAGE);

    return Math.floor(damage);
}

/**
 * Check if any tanks are currently falling.
 * @param {Tank[]} tanks - Array of tanks to check
 * @returns {boolean} True if at least one tank is falling
 */
export function areAnyTanksFalling(tanks) {
    return tanks.some(tank => tank && tank.isFalling);
}
