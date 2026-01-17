/**
 * Scorched Earth: Synthwave Edition
 * Trajectory Preview System
 *
 * Shows a real-time projectile path prediction during aiming.
 * Physics simulation matches actual projectile behavior exactly.
 */

import { PHYSICS } from '../constants.js';
import { getWindForce } from '../wind.js';
import { getScreenWidth, getScreenHeight } from '../screenSize.js';

/**
 * @typedef {Object} TrajectoryPoint
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} TrajectoryResult
 * @property {TrajectoryPoint[]} points - Array of trajectory points
 * @property {TrajectoryPoint|null} impact - Impact location (terrain or bounds)
 * @property {string} impactType - 'terrain', 'left', 'right', 'bottom', or 'none'
 */

/**
 * TrajectoryPreview class for visualizing projectile paths.
 * Simulates physics identically to the Projectile class to ensure accuracy.
 */
export class TrajectoryPreview {
    /**
     * Create a new TrajectoryPreview instance.
     * @param {import('../terrain.js').Terrain} terrain - The terrain for collision detection
     */
    constructor(terrain) {
        /**
         * Reference to terrain for collision detection.
         * @type {import('../terrain.js').Terrain}
         */
        this.terrain = terrain;

        /**
         * Calculated trajectory points.
         * @type {TrajectoryPoint[]}
         */
        this.points = [];

        /**
         * Maximum number of points to calculate.
         * More points = longer visible trajectory but more computation.
         * @type {number}
         */
        this.maxPoints = 300;

        /**
         * Time step per simulation frame (seconds).
         * Matches game's 60fps physics.
         * @type {number}
         */
        this.timeStep = 1 / 60;

        /**
         * Whether the trajectory preview is visible.
         * @type {boolean}
         */
        this.visible = true;

        /**
         * Predicted impact point (where trajectory hits terrain or boundary).
         * @type {TrajectoryPoint|null}
         */
        this.impactPoint = null;

        /**
         * Type of impact: 'terrain', 'left', 'right', 'bottom', or 'none'.
         * @type {string}
         */
        this.impactType = 'none';

        /**
         * Point sampling interval to reduce visual density.
         * Store every Nth point for rendering (helps with dashed line appearance).
         * @type {number}
         */
        this.sampleInterval = 3;
    }

    /**
     * Update the terrain reference (e.g., after terrain destruction).
     * @param {import('../terrain.js').Terrain} terrain - New terrain reference
     */
    setTerrain(terrain) {
        this.terrain = terrain;
    }

    /**
     * Toggle visibility of the trajectory preview.
     * @param {boolean} visible - Whether to show the preview
     */
    setVisible(visible) {
        this.visible = visible;
    }

    /**
     * Check if trajectory preview is visible.
     * @returns {boolean} True if visible
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Calculate the trajectory from a starting position with given parameters.
     * Uses the exact same physics as the Projectile class:
     * - Same gravity constant (PHYSICS.GRAVITY = 0.15 px/frame²)
     * - Same wind force calculation (wind * WIND_FORCE_MULTIPLIER)
     * - Same velocity scaling from power
     *
     * @param {number} startX - Starting X position (tank barrel position)
     * @param {number} startY - Starting Y position (tank barrel position)
     * @param {number} angle - Launch angle in degrees (0 = right, 90 = up, 180 = left)
     * @param {number} power - Launch power (0-100)
     * @param {number} [windSpeed] - Optional wind value (if not provided, uses current wind)
     * @returns {TrajectoryResult} The calculated trajectory with points and impact info
     */
    calculate(startX, startY, angle, power, windSpeed) {
        // Clear previous calculation
        this.points = [];
        this.impactPoint = null;
        this.impactType = 'none';

        // Get wind force - use provided value or current game wind
        const windForce = windSpeed !== undefined
            ? windSpeed * PHYSICS.WIND_FORCE_MULTIPLIER
            : getWindForce();

        // Calculate initial velocity (same as Projectile._calculateInitialVelocity)
        const speed = (power / 100) * PHYSICS.MAX_VELOCITY;
        const radians = (angle * Math.PI) / 180;
        let vx = Math.cos(radians) * speed;
        let vy = -Math.sin(radians) * speed; // Negative because Y increases downward

        // Current position
        let x = startX;
        let y = startY;

        // Get screen bounds
        const screenWidth = getScreenWidth();
        const screenHeight = getScreenHeight();

        // Add starting point
        this.points.push({ x, y });

        // Simulate trajectory
        let pointCount = 0;
        for (let i = 0; i < this.maxPoints * this.sampleInterval; i++) {
            // Apply wind to horizontal velocity (same as Projectile.update)
            vx += windForce;

            // Apply gravity to vertical velocity (same as Projectile.update)
            vy += PHYSICS.GRAVITY;

            // Update position
            x += vx;
            y += vy;

            // Store point at sample interval
            if (i % this.sampleInterval === 0) {
                this.points.push({ x, y });
                pointCount++;
            }

            // Check bounds - left
            if (x < 0) {
                this.impactPoint = { x: 0, y };
                this.impactType = 'left';
                break;
            }

            // Check bounds - right
            if (x > screenWidth) {
                this.impactPoint = { x: screenWidth, y };
                this.impactType = 'right';
                break;
            }

            // Check bounds - bottom
            if (y > screenHeight) {
                this.impactPoint = { x, y: screenHeight };
                this.impactType = 'bottom';
                break;
            }

            // Check terrain collision
            if (this.terrain && y > 0) {
                const terrainHeight = this.terrain.getHeight(Math.floor(x));
                const terrainSurfaceY = screenHeight - terrainHeight;

                if (y >= terrainSurfaceY) {
                    this.impactPoint = { x, y: terrainSurfaceY };
                    this.impactType = 'terrain';
                    break;
                }
            }

            // Safety check - stop if we've calculated enough points
            if (pointCount >= this.maxPoints) {
                break;
            }
        }

        return {
            points: this.points,
            impact: this.impactPoint,
            impactType: this.impactType
        };
    }

    /**
     * Render the trajectory preview on the canvas.
     * Style from spec:
     * - Dashed white line (rgba 255,255,255,0.5)
     * - Line dash pattern: [5, 5]
     * - Line width: 2px
     * - Impact marker: red circle outline, 8px radius
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     */
    render(ctx) {
        if (!this.visible || this.points.length < 2) {
            return;
        }

        ctx.save();

        // Draw trajectory path as dashed line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }

        ctx.stroke();

        // Reset line dash for impact marker
        ctx.setLineDash([]);

        // Draw impact marker if we have one
        if (this.impactPoint) {
            this._renderImpactMarker(ctx, this.impactPoint.x, this.impactPoint.y);
        }

        ctx.restore();
    }

    /**
     * Render the impact marker at the predicted hit location.
     * Red circle outline, 8px radius.
     *
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position of impact
     * @param {number} y - Y position of impact
     */
    _renderImpactMarker(ctx, x, y) {
        const radius = 8;

        // Outer glow for visibility
        ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
        ctx.shadowBlur = 6;

        // Red circle outline
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner crosshair for precision
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
        ctx.lineWidth = 1;

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(x - radius + 2, y);
        ctx.lineTo(x + radius - 2, y);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(x, y - radius + 2);
        ctx.lineTo(x, y + radius - 2);
        ctx.stroke();
    }

    /**
     * Get the calculated trajectory points.
     * @returns {TrajectoryPoint[]} Array of trajectory points
     */
    getPoints() {
        return this.points;
    }

    /**
     * Get the predicted impact point.
     * @returns {TrajectoryPoint|null} Impact point or null if none calculated
     */
    getImpactPoint() {
        return this.impactPoint;
    }

    /**
     * Get the type of impact (terrain, left, right, bottom, or none).
     * @returns {string} Impact type
     */
    getImpactType() {
        return this.impactType;
    }

    /**
     * Clear the calculated trajectory.
     */
    clear() {
        this.points = [];
        this.impactPoint = null;
        this.impactType = 'none';
    }
}

/**
 * Create a new TrajectoryPreview instance.
 * Factory function for convenience.
 *
 * @param {import('../terrain.js').Terrain} terrain - The terrain for collision detection
 * @returns {TrajectoryPreview} New trajectory preview instance
 */
export function createTrajectoryPreview(terrain) {
    return new TrajectoryPreview(terrain);
}
