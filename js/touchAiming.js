/**
 * Scorched Earth: Synthwave Edition
 * Touch Gesture Aiming Module
 *
 * Implements Angry Birds-style drag-to-aim controls:
 * - Touch/click and hold near tank to start aiming
 * - Drag away from tank to set angle and power
 * - Distance from touch start = power (0-100%)
 * - Angle = direction of drag (inverted from target direction, like a slingshot)
 * - Shows trajectory preview during drag
 * - Visual rubber band effect connecting tank to touch point
 * - Release to fire
 *
 * Works alongside existing button-based controls in aimingControls.js.
 */

import { CANVAS, COLORS, PHYSICS, TANK, UI } from './constants.js';
import { queueGameInput, INPUT_EVENTS, isGameInputEnabled, onMouseDown, onMouseUp, onMouseMove, onTouchStart, onTouchEnd, onTouchMove, getPointerPosition } from './input.js';
import * as Wind from './wind.js';
import { renderTrajectoryPreview } from './aimingControls.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Touch aiming configuration constants.
 */
const TOUCH_AIM = {
    // Activation zone around tank (pixels from tank center)
    ACTIVATION_RADIUS: 100,

    // Maximum drag distance for full power (pixels)
    MAX_DRAG_DISTANCE: 250,

    // Minimum drag distance to register (pixels)
    MIN_DRAG_DISTANCE: 20,

    // Power sensitivity (how quickly power increases with drag distance)
    POWER_SENSITIVITY: 0.4,  // 0.4 means 250px = 100% power

    // Rubber band visual settings
    RUBBER_BAND: {
        WIDTH: 6,
        COLOR_START: COLORS.NEON_CYAN,
        COLOR_END: COLORS.NEON_PINK,
        GLOW_INTENSITY: 12
    },

    // Touch indicator settings
    TOUCH_INDICATOR: {
        RADIUS: 25,
        PULSE_SPEED: 4,
        COLOR: COLORS.NEON_PINK
    },

    // Activation zone indicator
    ACTIVATION_INDICATOR: {
        RADIUS: 80,
        PULSE_SPEED: 2,
        COLOR: 'rgba(0, 243, 255, 0.3)'
    }
};

// =============================================================================
// STATE
// =============================================================================

/**
 * Touch aiming state.
 */
const state = {
    /** Whether touch aiming is currently active (dragging) */
    isActive: false,

    /** Whether touch aiming is enabled (player's turn) */
    isEnabled: false,

    /** Touch start position in design coordinates */
    startX: 0,
    startY: 0,

    /** Current touch position in design coordinates */
    currentX: 0,
    currentY: 0,

    /** Current calculated angle from drag */
    calculatedAngle: 45,

    /** Current calculated power from drag */
    calculatedPower: 50,

    /** Reference to player tank */
    playerTank: null,

    /** Reference to terrain for trajectory preview */
    terrain: null,

    /** Animation time for pulsing effects */
    animationTime: 0,

    /** Whether the user is hovering near the tank (shows activation hint) */
    nearTank: false
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate distance between two points.
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance in pixels
 */
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Check if a point is near the tank (within activation zone).
 * @param {number} x - Point X coordinate
 * @param {number} y - Point Y coordinate
 * @param {import('./tank.js').Tank} tank - Player tank
 * @returns {boolean} True if point is within activation radius of tank
 */
function isNearTank(x, y, tank) {
    if (!tank) return false;

    // Tank center is at (tank.x, tank.y - TANK.HEIGHT / 2)
    const tankCenterX = tank.x;
    const tankCenterY = tank.y - TANK.HEIGHT / 2;

    return distance(x, y, tankCenterX, tankCenterY) <= TOUCH_AIM.ACTIVATION_RADIUS;
}

/**
 * Calculate aim angle from drag direction.
 * The angle is inverted from the drag direction (slingshot style).
 * Dragging down-right aims up-left, etc.
 *
 * @param {number} startX - Drag start X (near tank)
 * @param {number} startY - Drag start Y (near tank)
 * @param {number} currentX - Current drag X
 * @param {number} currentY - Current drag Y
 * @param {import('./tank.js').Tank} tank - Player tank
 * @returns {number} Angle in degrees (0-180)
 */
function calculateAngleFromDrag(startX, startY, currentX, currentY, tank) {
    if (!tank) return 45;

    // Calculate drag vector (from start to current)
    const dragX = currentX - startX;
    const dragY = currentY - startY;

    // Invert the drag direction for slingshot effect
    // Dragging down-right should aim up-left
    const aimX = -dragX;
    const aimY = -dragY;

    // Calculate angle (0 = right, 90 = up, 180 = left)
    // Canvas Y is inverted, so we use aimY directly (negative Y = up)
    let angle = Math.atan2(-aimY, aimX) * (180 / Math.PI);

    // Clamp to valid range (0-180)
    angle = Math.max(PHYSICS.MIN_ANGLE, Math.min(PHYSICS.MAX_ANGLE, angle));

    return angle;
}

/**
 * Calculate power from drag distance.
 * Longer drag = more power.
 *
 * @param {number} startX - Drag start X
 * @param {number} startY - Drag start Y
 * @param {number} currentX - Current drag X
 * @param {number} currentY - Current drag Y
 * @returns {number} Power percentage (0-100)
 */
function calculatePowerFromDrag(startX, startY, currentX, currentY) {
    const dragDist = distance(startX, startY, currentX, currentY);

    // Map drag distance to power (0 to MAX_DRAG_DISTANCE -> 0 to 100)
    const power = (dragDist / TOUCH_AIM.MAX_DRAG_DISTANCE) * 100 * TOUCH_AIM.POWER_SENSITIVITY * 2.5;

    return Math.max(PHYSICS.MIN_POWER, Math.min(PHYSICS.MAX_POWER, power));
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle pointer down event for touch aiming.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 */
function handlePointerDown(x, y) {
    if (!state.isEnabled || !isGameInputEnabled() || !state.playerTank) return;

    // Check if touch is near the tank
    if (isNearTank(x, y, state.playerTank)) {
        state.isActive = true;
        state.startX = x;
        state.startY = y;
        state.currentX = x;
        state.currentY = y;

        // Initialize with tank's current values
        state.calculatedAngle = state.playerTank.angle;
        state.calculatedPower = state.playerTank.power;
    }
}

/**
 * Handle pointer move event for touch aiming.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 */
function handlePointerMove(x, y) {
    // Update nearTank state for visual feedback
    if (state.playerTank && state.isEnabled) {
        state.nearTank = isNearTank(x, y, state.playerTank);
    }

    if (!state.isActive || !state.playerTank) return;

    state.currentX = x;
    state.currentY = y;

    // Calculate drag distance
    const dragDist = distance(state.startX, state.startY, x, y);

    // Only update angle/power if drag is significant
    if (dragDist >= TOUCH_AIM.MIN_DRAG_DISTANCE) {
        // Calculate new angle and power from drag
        const newAngle = calculateAngleFromDrag(state.startX, state.startY, x, y, state.playerTank);
        const newPower = calculatePowerFromDrag(state.startX, state.startY, x, y);

        // Calculate deltas
        const angleDelta = newAngle - state.playerTank.angle;
        const powerDelta = newPower - state.playerTank.power;

        // Queue input events for significant changes
        if (Math.abs(angleDelta) > 0.5) {
            queueGameInput(INPUT_EVENTS.ANGLE_CHANGE, angleDelta);
        }
        if (Math.abs(powerDelta) > 0.5) {
            queueGameInput(INPUT_EVENTS.POWER_CHANGE, powerDelta);
        }

        // Store calculated values for rendering
        state.calculatedAngle = newAngle;
        state.calculatedPower = newPower;
    }
}

/**
 * Handle pointer up event for touch aiming.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 */
function handlePointerUp(x, y) {
    if (!state.isActive) return;

    // Calculate final drag distance
    const dragDist = distance(state.startX, state.startY, x, y);

    // Only fire if drag was significant
    if (dragDist >= TOUCH_AIM.MIN_DRAG_DISTANCE) {
        // Queue fire event
        queueGameInput(INPUT_EVENTS.FIRE);
    }

    // Reset state
    state.isActive = false;
    state.nearTank = false;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render the activation zone indicator around the tank.
 * Shows where users can tap to start aiming.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - Player tank
 */
function renderActivationZone(ctx, tank) {
    if (!tank || state.isActive) return;

    const centerX = tank.x;
    const centerY = tank.y - TANK.HEIGHT / 2;

    // Pulsing radius
    const pulse = Math.sin(state.animationTime * TOUCH_AIM.ACTIVATION_INDICATOR.PULSE_SPEED) * 0.1 + 1;
    const radius = TOUCH_AIM.ACTIVATION_INDICATOR.RADIUS * pulse;

    ctx.save();

    // Draw activation zone circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

    // Use brighter color when near tank
    if (state.nearTank) {
        ctx.fillStyle = 'rgba(0, 243, 255, 0.15)';
        ctx.fill();
        ctx.strokeStyle = COLORS.NEON_CYAN;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    } else {
        ctx.strokeStyle = TOUCH_AIM.ACTIVATION_INDICATOR.COLOR;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw "DRAG TO AIM" hint text when near
    if (state.nearTank) {
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 6;
        ctx.fillText('DRAG TO AIM', centerX, centerY + radius + 10);
    }

    ctx.restore();
}

/**
 * Render the rubber band effect during drag.
 * Visual connection between tank and touch point.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - Player tank
 */
function renderRubberBand(ctx, tank) {
    if (!tank || !state.isActive) return;

    const tankCenterX = tank.x;
    const tankCenterY = tank.y - TANK.HEIGHT / 2;

    ctx.save();

    // Create gradient from tank to touch point
    const gradient = ctx.createLinearGradient(
        tankCenterX, tankCenterY,
        state.currentX, state.currentY
    );
    gradient.addColorStop(0, TOUCH_AIM.RUBBER_BAND.COLOR_START);
    gradient.addColorStop(1, TOUCH_AIM.RUBBER_BAND.COLOR_END);

    // Draw rubber band line
    ctx.beginPath();
    ctx.moveTo(tankCenterX, tankCenterY);
    ctx.lineTo(state.currentX, state.currentY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = TOUCH_AIM.RUBBER_BAND.WIDTH;
    ctx.lineCap = 'round';
    ctx.shadowColor = TOUCH_AIM.RUBBER_BAND.COLOR_END;
    ctx.shadowBlur = TOUCH_AIM.RUBBER_BAND.GLOW_INTENSITY;
    ctx.stroke();

    // Draw stretched effect (thinner lines on sides for 3D look)
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;

    // Calculate perpendicular offset for side lines
    const dx = state.currentX - tankCenterX;
    const dy = state.currentY - tankCenterY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
        const perpX = (-dy / len) * 4;
        const perpY = (dx / len) * 4;

        // Left side line
        ctx.beginPath();
        ctx.moveTo(tankCenterX + perpX, tankCenterY + perpY);
        ctx.lineTo(state.currentX, state.currentY);
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
        ctx.stroke();

        // Right side line
        ctx.beginPath();
        ctx.moveTo(tankCenterX - perpX, tankCenterY - perpY);
        ctx.lineTo(state.currentX, state.currentY);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Render the touch point indicator.
 * Shows where the user is touching/dragging.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderTouchIndicator(ctx) {
    if (!state.isActive) return;

    const pulse = Math.sin(state.animationTime * TOUCH_AIM.TOUCH_INDICATOR.PULSE_SPEED) * 0.2 + 1;
    const radius = TOUCH_AIM.TOUCH_INDICATOR.RADIUS * pulse;

    ctx.save();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(state.currentX, state.currentY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = TOUCH_AIM.TOUCH_INDICATOR.COLOR;
    ctx.lineWidth = 3;
    ctx.shadowColor = TOUCH_AIM.TOUCH_INDICATOR.COLOR;
    ctx.shadowBlur = 15;
    ctx.stroke();

    // Inner solid circle
    ctx.beginPath();
    ctx.arc(state.currentX, state.currentY, 8, 0, Math.PI * 2);
    ctx.fillStyle = TOUCH_AIM.TOUCH_INDICATOR.COLOR;
    ctx.fill();

    // Crosshair
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(state.currentX - 12, state.currentY);
    ctx.lineTo(state.currentX + 12, state.currentY);
    ctx.moveTo(state.currentX, state.currentY - 12);
    ctx.lineTo(state.currentX, state.currentY + 12);
    ctx.stroke();

    ctx.restore();
}

/**
 * Render power indicator during drag.
 * Shows the current power level as text near touch point.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPowerIndicator(ctx) {
    if (!state.isActive) return;

    const dragDist = distance(state.startX, state.startY, state.currentX, state.currentY);
    if (dragDist < TOUCH_AIM.MIN_DRAG_DISTANCE) return;

    ctx.save();

    // Position above touch indicator
    const textX = state.currentX;
    const textY = state.currentY - 50;

    // Power percentage
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 8;
    ctx.fillText(`${Math.round(state.calculatedPower)}%`, textX, textY);

    // Angle below
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.fillText(`${Math.round(state.calculatedAngle)}°`, textX, textY + 25);

    ctx.restore();
}

/**
 * Render aim direction arrow from tank.
 * Shows the projected firing direction.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - Player tank
 */
function renderAimArrow(ctx, tank) {
    if (!tank || !state.isActive) return;

    const dragDist = distance(state.startX, state.startY, state.currentX, state.currentY);
    if (dragDist < TOUCH_AIM.MIN_DRAG_DISTANCE) return;

    // Get fire position from tank
    const radians = (state.calculatedAngle * Math.PI) / 180;
    const bodyHeight = TANK.BODY_HEIGHT || TANK.HEIGHT;
    const startX = tank.x + Math.cos(radians) * TANK.TURRET_LENGTH;
    const startY = tank.y - bodyHeight - Math.sin(radians) * TANK.TURRET_LENGTH;

    // Arrow length based on power
    const arrowLength = 30 + (state.calculatedPower / 100) * 40;

    const endX = startX + Math.cos(radians) * arrowLength;
    const endY = startY - Math.sin(radians) * arrowLength;

    ctx.save();

    // Arrow shaft
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = COLORS.NEON_YELLOW;
    ctx.lineWidth = 4;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Arrow head
    const headLength = 12;
    const headAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - headLength * Math.cos(radians - headAngle),
        endY + headLength * Math.sin(radians - headAngle)
    );
    ctx.lineTo(
        endX - headLength * Math.cos(radians + headAngle),
        endY + headLength * Math.sin(radians + headAngle)
    );
    ctx.closePath();
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fill();

    ctx.restore();
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize touch aiming event handlers.
 * Should be called after input module is initialized.
 */
export function init() {
    // Register mouse event handlers
    // Note: mouseDown callbacks receive design space coords (pointer.x/y)
    // mouseUp and mouseMove receive raw CSS coords (mouse.x/y)
    // We use getPointerPosition() for consistent design-space coordinates
    onMouseDown((x, y, button) => {
        if (button === 0) {  // Left click only
            // x, y are already in design space for mouseDown
            handlePointerDown(x, y);
        }
    });

    onMouseUp((x, y) => {
        // Use unified pointer position for consistency
        const pos = getPointerPosition();
        handlePointerUp(pos.x, pos.y);
    });

    onMouseMove((x, y) => {
        // Use unified pointer position (already in design space)
        const pos = getPointerPosition();
        handlePointerMove(pos.x, pos.y);
    });

    // Register touch event handlers
    // Touch callbacks receive raw CSS coords, use getPointerPosition for design space
    onTouchStart((x, y) => {
        const pos = getPointerPosition();
        handlePointerDown(pos.x, pos.y);
    });

    onTouchEnd((x, y) => {
        const pos = getPointerPosition();
        handlePointerUp(pos.x, pos.y);
    });

    onTouchMove((x, y) => {
        const pos = getPointerPosition();
        handlePointerMove(pos.x, pos.y);
    });

    console.log('Touch aiming module initialized');
}

/**
 * Update touch aiming state.
 * Call once per frame.
 *
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    state.animationTime += deltaTime / 1000;
}

/**
 * Set whether touch aiming is enabled.
 * Should be enabled during player's aiming turn.
 *
 * @param {boolean} enabled - Whether to enable touch aiming
 */
export function setEnabled(enabled) {
    state.isEnabled = enabled;
    if (!enabled) {
        state.isActive = false;
        state.nearTank = false;
    }
}

/**
 * Check if touch aiming is currently enabled.
 * @returns {boolean} True if enabled
 */
export function isEnabled() {
    return state.isEnabled;
}

/**
 * Check if touch aiming is currently active (user is dragging).
 * @returns {boolean} True if actively dragging
 */
export function isActive() {
    return state.isActive;
}

/**
 * Set the player tank reference for interaction detection.
 *
 * @param {import('./tank.js').Tank} tank - Player tank
 */
export function setPlayerTank(tank) {
    state.playerTank = tank;
}

/**
 * Set the terrain reference for trajectory preview.
 *
 * @param {import('./terrain.js').Terrain} terrain - Terrain instance
 */
export function setTerrain(terrain) {
    state.terrain = terrain;
}

/**
 * Get the current calculated angle from drag.
 * @returns {number} Angle in degrees
 */
export function getCalculatedAngle() {
    return state.calculatedAngle;
}

/**
 * Get the current calculated power from drag.
 * @returns {number} Power percentage
 */
export function getCalculatedPower() {
    return state.calculatedPower;
}

/**
 * Render touch aiming visuals.
 * Should be called after terrain but before UI.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - Player tank
 * @param {import('./terrain.js').Terrain} terrain - Terrain for trajectory preview
 */
export function render(ctx, tank, terrain) {
    if (!ctx || !state.isEnabled) return;

    // Store references
    state.playerTank = tank;
    state.terrain = terrain;

    // Always show activation zone when enabled but not active
    if (!state.isActive) {
        renderActivationZone(ctx, tank);
    }

    // Render active drag visuals
    if (state.isActive && tank) {
        // Trajectory preview first (behind other elements)
        renderTrajectoryPreview(ctx, tank, state.calculatedAngle, state.calculatedPower, terrain);

        // Aim direction arrow
        renderAimArrow(ctx, tank);

        // Rubber band effect
        renderRubberBand(ctx, tank);

        // Touch indicator
        renderTouchIndicator(ctx);

        // Power/angle indicators
        renderPowerIndicator(ctx);
    }
}

/**
 * Get touch aiming state for debugging.
 * @returns {Object} Current state
 */
export function getState() {
    return { ...state };
}
