/**
 * Scorched Earth: Synthwave Edition
 * Terrain heightmap data structure
 *
 * The terrain is stored as a heightmap where terrain[x] = y-coordinate of the ground surface.
 * This is the foundational data structure for terrain generation, rendering, and destruction.
 *
 * Memory: Float32Array uses 4 bytes per element
 * At 1920px width: 1920 * 4 = 7.5KB (very memory efficient)
 */

import { CANVAS, TERRAIN } from './constants.js';

/**
 * Terrain heightmap data structure.
 * Stores ground height at each x-coordinate using a Float32Array for memory efficiency.
 */
export class Terrain {
    /**
     * Create a new terrain heightmap.
     * @param {number} [width=CANVAS.DESIGN_WIDTH] - Width of the terrain in pixels
     */
    constructor(width = CANVAS.DESIGN_WIDTH) {
        /**
         * Width of the terrain in pixels (number of columns in heightmap)
         * @type {number}
         */
        this.width = width;

        /**
         * The heightmap array where heightmap[x] = y-coordinate of ground surface at x.
         * Uses Float32Array for memory efficiency and because terrain heights may be fractional
         * after smoothing/interpolation operations.
         * @type {Float32Array}
         */
        this.heightmap = new Float32Array(width);

        // Initialize all heights to 0 (ground level at bottom)
        // Float32Array is zero-initialized by default, but being explicit for clarity
        this.heightmap.fill(0);

        // Log terrain creation with dimensions
        console.log(`Terrain created: ${this.width}px wide, ${this.heightmap.byteLength} bytes (Float32Array)`);
    }

    /**
     * Get the ground height at a given x-coordinate.
     * Returns the y-coordinate of the terrain surface (distance from bottom of canvas).
     *
     * @param {number} x - The x-coordinate to query
     * @returns {number} The y-coordinate of the ground surface, or 0 if out of bounds
     */
    getHeight(x) {
        // Bounds checking: return 0 for out-of-bounds queries
        // Using floor to handle fractional x coordinates
        const index = Math.floor(x);

        if (index < 0 || index >= this.width) {
            return 0;
        }

        return this.heightmap[index];
    }

    /**
     * Set the ground height at a given x-coordinate.
     * Used for terrain modification (generation, destruction, etc).
     *
     * @param {number} x - The x-coordinate to modify
     * @param {number} y - The new ground height (y-coordinate from bottom)
     * @returns {boolean} True if the height was set, false if x was out of bounds
     */
    setHeight(x, y) {
        // Bounds checking
        const index = Math.floor(x);

        if (index < 0 || index >= this.width) {
            return false;
        }

        // Clamp y value to valid range (0 to canvas height)
        // Heights are stored as distance from bottom, so 0 = bottom, DESIGN_HEIGHT = top
        const clampedY = Math.max(0, Math.min(y, CANVAS.DESIGN_HEIGHT));

        this.heightmap[index] = clampedY;
        return true;
    }

    /**
     * Get the width of the terrain (number of columns).
     * @returns {number} The terrain width in pixels
     */
    getWidth() {
        return this.width;
    }

    /**
     * Get the minimum height value in the terrain.
     * Useful for terrain generation and validation.
     * @returns {number} Minimum height value
     */
    getMinHeight() {
        let min = Infinity;
        for (let i = 0; i < this.width; i++) {
            if (this.heightmap[i] < min) {
                min = this.heightmap[i];
            }
        }
        return min === Infinity ? 0 : min;
    }

    /**
     * Get the maximum height value in the terrain.
     * Useful for terrain generation and validation.
     * @returns {number} Maximum height value
     */
    getMaxHeight() {
        let max = -Infinity;
        for (let i = 0; i < this.width; i++) {
            if (this.heightmap[i] > max) {
                max = this.heightmap[i];
            }
        }
        return max === -Infinity ? 0 : max;
    }

    /**
     * Serialize the terrain data to a JSON-compatible object.
     * Used for saving game state.
     *
     * @returns {Object} Serialized terrain data containing width and heights array
     */
    serialize() {
        return {
            width: this.width,
            // Convert Float32Array to regular array for JSON serialization
            heights: Array.from(this.heightmap)
        };
    }

    /**
     * Deserialize terrain data from a saved state.
     * Creates a new Terrain instance from previously serialized data.
     *
     * @param {Object} data - The serialized terrain data
     * @param {number} data.width - Width of the terrain
     * @param {number[]} data.heights - Array of height values
     * @returns {Terrain} A new Terrain instance with the deserialized data
     * @throws {Error} If data is invalid or missing required properties
     */
    static deserialize(data) {
        // Validate required properties
        if (!data || typeof data.width !== 'number' || !Array.isArray(data.heights)) {
            throw new Error('Invalid terrain data: missing width or heights');
        }

        // Validate data consistency
        if (data.heights.length !== data.width) {
            throw new Error(`Invalid terrain data: heights length (${data.heights.length}) does not match width (${data.width})`);
        }

        // Create new terrain and populate with deserialized data
        const terrain = new Terrain(data.width);

        // Copy heights from array to Float32Array
        for (let i = 0; i < data.width; i++) {
            terrain.heightmap[i] = data.heights[i];
        }

        console.log(`Terrain deserialized: ${terrain.width}px wide, heights range ${terrain.getMinHeight()}-${terrain.getMaxHeight()}`);

        return terrain;
    }

    /**
     * Fill the entire terrain with a constant height.
     * Useful for testing or resetting terrain.
     *
     * @param {number} height - The height value to fill with
     */
    fill(height) {
        const clampedHeight = Math.max(0, Math.min(height, CANVAS.DESIGN_HEIGHT));
        this.heightmap.fill(clampedHeight);
    }

    /**
     * Create a copy of this terrain.
     * @returns {Terrain} A new Terrain instance with the same data
     */
    clone() {
        const copy = new Terrain(this.width);
        copy.heightmap.set(this.heightmap);
        return copy;
    }
}

/**
 * Create a new terrain instance with the default game width.
 * Convenience function for creating terrain with standard dimensions.
 *
 * @returns {Terrain} A new Terrain instance
 */
export function createTerrain() {
    return new Terrain(CANVAS.DESIGN_WIDTH);
}
