/**
 * Scorched Earth: Synthwave Edition
 * Slingshot Aiming Controls
 *
 * Provides drag-to-aim touch/mouse controls similar to Angry Birds.
 * Pull back from the tank to set angle and power, release to fire.
 */

import { PHYSICS } from '../constants.js';

/**
 * SlingshotAiming class for drag-to-aim control scheme.
 * The player drags backward from the tank to aim forward (Angry Birds style).
 */
export class SlingshotAiming {
    /**
     * Create a new SlingshotAiming instance.
     * @param {import('../tank.js').Tank} tank - The player's tank
     * @param {import('../terrain.js').Terrain} terrain - Terrain for reference
     * @param {import('./trajectoryPreview.js').TrajectoryPreview} trajectoryPreview - Preview system to update
     */
    constructor(tank, terrain, trajectoryPreview) {
        /**
         * Reference to the player's tank.
         * @type {import('../tank.js').Tank}
         */
        this.tank = tank;

        /**
         * Reference to the terrain.
         * @type {import('../terrain.js').Terrain}
         */
        this.terrain = terrain;

        /**
         * Reference to trajectory preview system.
         * @type {import('./trajectoryPreview.js').TrajectoryPreview}
         */
        this.trajectoryPreview = trajectoryPreview;

        /**
         * Maximum drag distance in pixels for full power.
         * @type {number}
         */
        this.maxDragDistance = 150;

        /**
         * Sensitivity multiplier for angle calculations.
         * @type {number}
         */
        this.sensitivityAngle = 1.0;

        /**
         * Sensitivity multiplier for power calculations.
         * @type {number}
         */
        this.sensitivityPower = 1.0;

        /**
         * Hit area radius around tank for starting drag.
         * @type {number}
         */
        this.hitAreaRadius = 80;

        /**
         * Whether the player is currently dragging.
         * @type {boolean}
         */
        this.isDragging = false;

        /**
         * Starting position of the drag in canvas coordinates.
         * @type {{x: number, y: number}|null}
         */
        this.dragStart = null;

        /**
         * Current finger/cursor position during drag.
         * @type {{x: number, y: number}|null}
         */
        this.dragCurrent = null;

        /**
         * Whether slingshot aiming is enabled.
         * @type {boolean}
         */
        this.enabled = true;

        /**
         * Minimum drag distance to register as intentional aim.
         * Prevents accidental taps from aiming.
         * @type {number}
         */
        this.minDragDistance = 10;

        /**
         * Whether the current drag was cancelled (e.g., finger moved off screen).
         * @type {boolean}
         */
        this.wasCancelled = false;
    }

    /**
     * Enable or disable slingshot aiming.
     * @param {boolean} enabled - Whether to enable slingshot mode
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.cancelDrag();
        }
    }

    /**
     * Check if slingshot aiming is enabled.
     * @returns {boolean} True if enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Update the tank reference (e.g., after a new round).
     * @param {import('../tank.js').Tank} tank - The new tank reference
     */
    setTank(tank) {
        this.tank = tank;
        this.cancelDrag();
    }

    /**
     * Update the terrain reference.
     * @param {import('../terrain.js').Terrain} terrain - The new terrain reference
     */
    setTerrain(terrain) {
        this.terrain = terrain;
    }

    /**
     * Get the tank's center position in canvas coordinates.
     * Uses the top-center of the tank body as the slingshot anchor point.
     * @returns {{x: number, y: number}} Tank center position
     * @private
     */
    _getTankCenter() {
        // The tank anchor for slingshot is the top of the body
        // tank.y is the bottom of the tank (where it sits on terrain)
        const tankCenterX = this.tank.x;
        const tankCenterY = this.tank.y - 16; // Roughly center of tank body
        return { x: tankCenterX, y: tankCenterY };
    }

    /**
     * Check if a point is within the hit area around the tank.
     * @param {number} x - X coordinate in canvas space
     * @param {number} y - Y coordinate in canvas space
     * @returns {boolean} True if point is within hit area
     * @private
     */
    _isWithinHitArea(x, y) {
        const center = this._getTankCenter();
        const dx = x - center.x;
        const dy = y - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.hitAreaRadius;
    }

    /**
     * Handle pointer down event.
     * Starts drag if touch is within the tank's hit area.
     * @param {number} x - X coordinate in canvas space
     * @param {number} y - Y coordinate in canvas space
     * @returns {boolean} True if drag was started
     */
    onPointerDown(x, y) {
        if (!this.enabled || !this.tank) {
            return false;
        }

        // Check if touch is near tank
        if (!this._isWithinHitArea(x, y)) {
            return false;
        }

        // Start drag
        this.isDragging = true;
        this.wasCancelled = false;
        this.dragStart = { x, y };
        this.dragCurrent = { x, y };

        return true;
    }

    /**
     * Handle pointer move event during drag.
     * Updates angle and power based on drag vector.
     * @param {number} x - X coordinate in canvas space
     * @param {number} y - Y coordinate in canvas space
     */
    onPointerMove(x, y) {
        if (!this.enabled || !this.isDragging || !this.tank) {
            return;
        }

        this.dragCurrent = { x, y };

        // Calculate drag vector from tank center (not from drag start)
        const tankCenter = this._getTankCenter();
        const dx = x - tankCenter.x;
        const dy = y - tankCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only process if drag is significant
        if (distance < this.minDragDistance) {
            return;
        }

        // Calculate angle from drag direction
        // Player pulls BACK to fire FORWARD (opposite direction)
        // So we reverse the vector: angle points opposite to drag
        const rawAngle = Math.atan2(-dy, -dx); // Negative to reverse direction
        let angleDegrees = (rawAngle * 180) / Math.PI;

        // Convert to game angle convention (0-180, where 90 is straight up)
        // atan2 gives: 0 = right, 90 = down, -90 = up, 180/-180 = left
        // Game wants: 0 = right, 90 = up, 180 = left
        // Since we reversed the vector: 0 = left-fire (right-aim), etc.

        // Clamp to valid angle range (0-180)
        angleDegrees = Math.max(PHYSICS.MIN_ANGLE, Math.min(PHYSICS.MAX_ANGLE, angleDegrees));

        // Calculate power from drag distance (0 to maxDragDistance -> 0% to 100%)
        const normalizedDistance = Math.min(distance / this.maxDragDistance, 1);
        const power = normalizedDistance * PHYSICS.MAX_POWER * this.sensitivityPower;

        // Update tank angle and power
        this.tank.setAngle(angleDegrees);
        this.tank.setPower(power);

        // Update trajectory preview
        if (this.trajectoryPreview) {
            const firePos = this.tank.getFirePosition();
            this.trajectoryPreview.calculate(
                firePos.x,
                firePos.y,
                this.tank.angle,
                this.tank.power
            );
        }
    }

    /**
     * Handle pointer up event.
     * Ends drag and returns whether to fire.
     * @returns {{shouldFire: boolean, wasDragging: boolean}} Result of the drag
     */
    onPointerUp() {
        if (!this.enabled || !this.isDragging) {
            return { shouldFire: false, wasDragging: false };
        }

        const wasDragging = this.isDragging;

        // Check if drag was long enough to be intentional
        let shouldFire = false;
        if (this.dragStart && this.dragCurrent && !this.wasCancelled) {
            const tankCenter = this._getTankCenter();
            const dx = this.dragCurrent.x - tankCenter.x;
            const dy = this.dragCurrent.y - tankCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Only fire if drag was significant
            shouldFire = distance >= this.minDragDistance;
        }

        // Reset drag state
        this.isDragging = false;
        this.dragStart = null;
        this.dragCurrent = null;
        this.wasCancelled = false;

        // Clear trajectory preview after firing
        if (shouldFire && this.trajectoryPreview) {
            this.trajectoryPreview.clear();
        }

        return { shouldFire, wasDragging };
    }

    /**
     * Cancel the current drag without firing.
     * Use this when the gesture should be aborted (e.g., touch leaves canvas).
     */
    cancelDrag() {
        this.wasCancelled = true;
        this.isDragging = false;
        this.dragStart = null;
        this.dragCurrent = null;

        // Clear trajectory preview
        if (this.trajectoryPreview) {
            this.trajectoryPreview.clear();
        }
    }

    /**
     * Check if currently in a drag gesture.
     * @returns {boolean} True if dragging
     */
    isDraggingActive() {
        return this.isDragging;
    }

    /**
     * Render the slingshot visual (rubber band from tank to finger).
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     */
    render(ctx) {
        if (!this.enabled || !this.isDragging || !this.dragCurrent || !this.tank) {
            return;
        }

        const tankCenter = this._getTankCenter();
        const fingerX = this.dragCurrent.x;
        const fingerY = this.dragCurrent.y;

        ctx.save();

        // Calculate drag distance for visual feedback
        const dx = fingerX - tankCenter.x;
        const dy = fingerY - tankCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = Math.min(distance / this.maxDragDistance, 1);

        // Rubber band line color intensifies with pull distance
        const alpha = 0.5 + normalizedDistance * 0.4;

        // Draw rubber band line from tank to finger
        ctx.strokeStyle = `rgba(255, 105, 180, ${alpha})`; // Neon pink
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // Add glow effect
        ctx.shadowColor = 'rgba(255, 105, 180, 0.6)';
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.moveTo(tankCenter.x, tankCenter.y);
        ctx.lineTo(fingerX, fingerY);
        ctx.stroke();

        // Draw pull indicator circle at finger position
        ctx.shadowBlur = 4;

        // Circle fill (semi-transparent)
        ctx.fillStyle = `rgba(255, 105, 180, ${0.2 + normalizedDistance * 0.2})`;
        ctx.beginPath();
        ctx.arc(fingerX, fingerY, 15, 0, Math.PI * 2);
        ctx.fill();

        // Circle outline
        ctx.strokeStyle = `rgba(255, 105, 180, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw direction indicator (arrow showing fire direction)
        if (distance >= this.minDragDistance) {
            this._renderDirectionIndicator(ctx, tankCenter, fingerX, fingerY, normalizedDistance);
        }

        ctx.restore();
    }

    /**
     * Render an arrow indicating the fire direction.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {{x: number, y: number}} tankCenter - Tank center position
     * @param {number} fingerX - Current finger X position
     * @param {number} fingerY - Current finger Y position
     * @param {number} power - Normalized power (0-1)
     * @private
     */
    _renderDirectionIndicator(ctx, tankCenter, fingerX, fingerY, power) {
        // Direction is opposite to drag
        const dx = tankCenter.x - fingerX;
        const dy = tankCenter.y - fingerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) return;

        // Normalize direction
        const nx = dx / distance;
        const ny = dy / distance;

        // Arrow starts from tank, length based on power
        const arrowLength = 30 + power * 40;
        const arrowEndX = tankCenter.x + nx * arrowLength;
        const arrowEndY = tankCenter.y + ny * arrowLength;

        // Draw arrow line
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Cyan
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(tankCenter.x, tankCenter.y);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();

        // Draw arrowhead
        ctx.setLineDash([]);
        const headLength = 10;
        const headAngle = Math.PI / 6;
        const angle = Math.atan2(ny, nx);

        ctx.beginPath();
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
            arrowEndX - headLength * Math.cos(angle - headAngle),
            arrowEndY - headLength * Math.sin(angle - headAngle)
        );
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
            arrowEndX - headLength * Math.cos(angle + headAngle),
            arrowEndY - headLength * Math.sin(angle + headAngle)
        );
        ctx.stroke();
    }
}

/**
 * Create a new SlingshotAiming instance.
 * Factory function for convenience.
 *
 * @param {import('../tank.js').Tank} tank - The player's tank
 * @param {import('../terrain.js').Terrain} terrain - The terrain
 * @param {import('./trajectoryPreview.js').TrajectoryPreview} trajectoryPreview - Trajectory preview system
 * @returns {SlingshotAiming} New slingshot aiming instance
 */
export function createSlingshotAiming(tank, terrain, trajectoryPreview) {
    return new SlingshotAiming(tank, terrain, trajectoryPreview);
}
