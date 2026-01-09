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

    /**
     * Check if a point collides with the terrain.
     *
     * Collision occurs when the point is at or below the terrain surface.
     * In canvas coordinates: Y increases downward, so collision happens when
     * canvasY >= DESIGN_HEIGHT - terrainHeight.
     *
     * Or equivalently, when the point's height from bottom is <= terrain height.
     *
     * @param {number} x - X-coordinate in canvas coordinates
     * @param {number} y - Y-coordinate in canvas coordinates (Y=0 is top)
     * @returns {{hit: boolean, x: number, y: number}|null} Hit info with collision point, or null if out of bounds
     */
    checkTerrainCollision(x, y) {
        // Handle out of bounds cases
        // Return null for projectiles outside terrain bounds (off-screen horizontally)
        const flooredX = Math.floor(x);

        if (flooredX < 0 || flooredX >= this.width) {
            // Projectile is horizontally off-screen
            // Return null to indicate no terrain collision (out of bounds)
            return null;
        }

        // Get terrain height at this x-coordinate (distance from bottom)
        const terrainHeight = this.heightmap[flooredX];

        // Convert terrain height to canvas Y-coordinate
        // Terrain surface in canvas coords = DESIGN_HEIGHT - terrainHeight
        const terrainSurfaceY = CANVAS.DESIGN_HEIGHT - terrainHeight;

        // Collision occurs when projectile Y >= terrain surface Y
        // (projectile is at or below the terrain surface)
        if (y >= terrainSurfaceY) {
            // Return collision point at terrain surface
            // Use the actual terrain surface Y as the collision point
            return {
                hit: true,
                x: flooredX,
                y: terrainSurfaceY
            };
        }

        // No collision - projectile is above terrain
        return {
            hit: false,
            x: flooredX,
            y: y
        };
    }

    /**
     * Destroy terrain in a circular crater pattern centered at (x, y).
     * The crater is carved into the terrain by lowering the heightmap within the blast radius.
     *
     * How it works:
     * - The explosion occurs at canvas coordinates (x, y) where Y=0 is top
     * - Terrain heights are stored as distance from bottom (terrainHeight = DESIGN_HEIGHT - canvasY)
     * - For each x-column within the blast radius, we calculate how much to lower the terrain
     * - The crater has a smooth circular edge using the circle equation: r² = dx² + dy²
     *
     * @param {number} x - X-coordinate of explosion center (in design coordinates)
     * @param {number} y - Y-coordinate of explosion center (in design coordinates, Y=0 is top)
     * @param {number} radius - Blast radius in pixels
     * @returns {boolean} True if any terrain was destroyed, false otherwise
     */
    destroyTerrain(x, y, radius) {
        // Validate inputs
        if (radius <= 0) return false;

        // Convert canvas Y to terrain height (distance from bottom)
        // Canvas Y=0 is top, so lower Y means higher terrain height
        const explosionHeight = CANVAS.DESIGN_HEIGHT - y;

        // Track if any terrain was actually modified
        let terrainModified = false;

        // Calculate the x-range affected by the explosion
        // We need to check columns from (x - radius) to (x + radius)
        const minX = Math.max(0, Math.floor(x - radius));
        const maxX = Math.min(this.width - 1, Math.ceil(x + radius));

        // For each x-column in the blast radius
        for (let xi = minX; xi <= maxX; xi++) {
            // Calculate horizontal distance from explosion center
            const dx = xi - x;

            // Skip if outside horizontal radius (shouldn't happen due to bounds, but safety check)
            if (Math.abs(dx) > radius) continue;

            // Calculate the vertical extent of the crater at this x-column
            // Using circle equation: r² = dx² + dy² → dy = sqrt(r² - dx²)
            // This gives us the vertical "slice" of the circle at this x position
            const verticalExtent = Math.sqrt(radius * radius - dx * dx);

            // The crater affects terrain from (explosionHeight - verticalExtent) to (explosionHeight + verticalExtent)
            // But we only carve DOWN into terrain, not up (explosions don't create terrain)
            const craterTop = explosionHeight + verticalExtent;
            const craterBottom = explosionHeight - verticalExtent;

            // Get current terrain height at this column
            const currentHeight = this.heightmap[xi];

            // Only modify if the crater intersects with the terrain
            // The terrain surface is at currentHeight (from bottom)
            // If craterBottom is below currentHeight, we need to carve

            if (craterBottom < currentHeight) {
                // New terrain height is the crater bottom, but not below 0
                const newHeight = Math.max(0, craterBottom);

                // Only modify if we're actually lowering the terrain
                if (newHeight < currentHeight) {
                    this.heightmap[xi] = newHeight;
                    terrainModified = true;
                }
            }
        }

        if (terrainModified) {
            console.log(`Terrain destroyed at (${x.toFixed(0)}, ${y.toFixed(0)}) with radius ${radius}, affected columns ${minX}-${maxX}`);
        }

        return terrainModified;
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

// =============================================================================
// TERRAIN GENERATION - MIDPOINT DISPLACEMENT ALGORITHM
// =============================================================================

/**
 * Simple seeded random number generator (Mulberry32).
 * Allows for deterministic terrain generation when a seed is provided.
 *
 * @param {number} seed - The seed value for the RNG
 * @returns {function(): number} A function that returns random numbers in [0, 1)
 */
function createSeededRandom(seed) {
    return function() {
        // Mulberry32 PRNG - fast and good statistical properties
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Generate terrain using the midpoint displacement algorithm.
 *
 * The algorithm works by:
 * 1. Setting the endpoints to random heights within the valid range
 * 2. Finding the midpoint and setting it to the average of endpoints plus a random displacement
 * 3. Recursively subdividing each segment until we reach single-pixel resolution
 * 4. Each level of recursion reduces the displacement range by a roughness factor
 *
 * The roughness parameter controls how jagged the terrain appears:
 * - Lower values (0.3-0.4) create smoother, rolling hills
 * - Higher values (0.6-0.7) create more jagged, mountainous terrain
 * - Values around 0.5 provide a good balance for gameplay
 *
 * @param {number} width - Width of the terrain in pixels
 * @param {number} height - Height of the canvas (used for height calculations)
 * @param {Object} [options={}] - Generation options
 * @param {number} [options.roughness=0.5] - Roughness factor (0.4-0.6 recommended)
 * @param {number} [options.seed=null] - Seed for random generation (null for random seed)
 * @param {number} [options.minHeightPercent=0.2] - Minimum terrain height as percentage of canvas
 * @param {number} [options.maxHeightPercent=0.9] - Maximum terrain height as percentage of canvas
 * @returns {Terrain} A new Terrain instance with generated heightmap
 */
export function generateTerrain(width, height, options = {}) {
    // Extract options with defaults
    const {
        roughness = 0.5,
        seed = null,
        minHeightPercent = 0.2,
        maxHeightPercent = 0.9
    } = options;

    // Validate roughness is in reasonable range
    const clampedRoughness = Math.max(0.3, Math.min(0.7, roughness));

    // Calculate height bounds in pixels
    const minHeight = height * minHeightPercent;
    const maxHeight = height * maxHeightPercent;
    const heightRange = maxHeight - minHeight;

    // Create random number generator (seeded or unseeded)
    const actualSeed = seed !== null ? seed : Math.floor(Math.random() * 2147483647);
    const random = createSeededRandom(actualSeed);

    // Create terrain instance
    const terrain = new Terrain(width);

    // Temporary array for algorithm (we need power-of-2 + 1 points for clean subdivision)
    // Find the smallest power of 2 >= width
    const pow2 = Math.pow(2, Math.ceil(Math.log2(width)));
    const numPoints = pow2 + 1;
    const points = new Float32Array(numPoints);

    // Initialize endpoints with random heights
    points[0] = minHeight + random() * heightRange;
    points[numPoints - 1] = minHeight + random() * heightRange;

    // Midpoint displacement algorithm
    // Start with the full range and subdivide
    let segmentLength = pow2;
    let displacement = heightRange; // Initial displacement matches the full height range

    while (segmentLength > 1) {
        const halfLength = segmentLength / 2;

        // Process each segment at this level
        for (let i = 0; i < numPoints - 1; i += segmentLength) {
            const leftIndex = i;
            const rightIndex = i + segmentLength;
            const midIndex = i + halfLength;

            // Midpoint is average of endpoints plus random displacement
            // The random displacement is scaled by the current displacement value
            // and centered around 0 (using random() - 0.5)
            const midpoint = (points[leftIndex] + points[rightIndex]) / 2;
            const randomOffset = (random() - 0.5) * displacement;
            points[midIndex] = midpoint + randomOffset;
        }

        // Reduce displacement for next iteration
        // The roughness factor controls how quickly displacement diminishes
        // Higher roughness = displacement stays larger = more jagged terrain
        displacement *= clampedRoughness;
        segmentLength = halfLength;
    }

    // Clamp all values to valid height range
    for (let i = 0; i < numPoints; i++) {
        points[i] = Math.max(minHeight, Math.min(maxHeight, points[i]));
    }

    // Copy points to terrain heightmap, handling width differences
    // If width < numPoints, we sample; if width > numPoints, we interpolate
    for (let x = 0; x < width; x++) {
        // Map x coordinate to points array
        const pointIndex = (x / (width - 1)) * (numPoints - 1);
        const leftIndex = Math.floor(pointIndex);
        const rightIndex = Math.min(leftIndex + 1, numPoints - 1);
        const t = pointIndex - leftIndex;

        // Linear interpolation between adjacent points
        const interpolatedHeight = points[leftIndex] * (1 - t) + points[rightIndex] * t;
        terrain.heightmap[x] = interpolatedHeight;
    }

    console.log(`Terrain generated: seed=${actualSeed}, roughness=${clampedRoughness.toFixed(2)}, height range=[${terrain.getMinHeight().toFixed(0)}, ${terrain.getMaxHeight().toFixed(0)}]`);

    return terrain;
}
