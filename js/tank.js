/**
 * Scorched Earth: Synthwave Edition
 * Tank entity class
 *
 * The Tank class represents a player or AI-controlled tank on the battlefield.
 * Each tank has position, health, aiming controls (angle/power), and a weapon reference.
 */

import { TANK, PHYSICS } from './constants.js';

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
         * Stores the weapon ID string (e.g., 'basic', 'mirv', 'nuke').
         * The weapon registry will be implemented in weapons.js.
         * @type {string}
         */
        this.currentWeapon = 'basic';

        /**
         * Weapon inventory.
         * Maps weapon IDs to ammo counts.
         * 'basic' has unlimited ammo (represented as Infinity).
         * @type {Object.<string, number>}
         */
        this.inventory = {
            basic: Infinity
        };

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
     * @param {number} amount - Amount of damage to apply (positive value)
     * @returns {number} The actual damage dealt (after clamping)
     */
    takeDamage(amount) {
        // Ensure amount is positive
        const damage = Math.max(0, amount);

        // Calculate actual damage dealt (can't deal more than remaining health)
        const actualDamage = Math.min(damage, this.health);

        // Apply damage
        this.health = Math.max(0, this.health - damage);

        console.log(`Tank (${this.team}) took ${actualDamage} damage, health: ${this.health}`);

        return actualDamage;
    }

    /**
     * Heal the tank by a specified amount.
     * Health cannot exceed MAX_HEALTH.
     * @param {number} amount - Amount to heal
     * @returns {number} The actual amount healed
     */
    heal(amount) {
        const healAmount = Math.max(0, amount);
        const previousHealth = this.health;

        this.health = Math.min(TANK.MAX_HEALTH, this.health + healAmount);

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
     * @param {string} weaponId - The weapon ID to select
     * @returns {boolean} True if weapon was successfully selected
     */
    setWeapon(weaponId) {
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

        // If out of this weapon, switch to basic
        if (this.inventory[this.currentWeapon] <= 0) {
            console.log(`Tank (${this.team}) out of ${this.currentWeapon}, switching to basic`);
            this.currentWeapon = 'basic';
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
        // The turret pivots from the tank's top-center
        const turretOffsetX = Math.cos(radians) * TANK.TURRET_LENGTH;
        const turretOffsetY = -Math.sin(radians) * TANK.TURRET_LENGTH; // Negative because canvas Y is inverted

        return {
            x: this.x + turretOffsetX,
            y: this.y - TANK.HEIGHT + turretOffsetY // Turret base is at top of tank body
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
            angle: this.angle,
            power: this.power,
            team: this.team,
            currentWeapon: this.currentWeapon,
            inventory: { ...this.inventory }
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
        tank.angle = data.angle;
        tank.power = data.power;
        tank.currentWeapon = data.currentWeapon;
        tank.inventory = { ...data.inventory };

        return tank;
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
