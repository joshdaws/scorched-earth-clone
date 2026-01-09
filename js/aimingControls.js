/**
 * Scorched Earth: Synthwave Edition
 * Aiming Controls UI Module
 *
 * Provides visual controls for adjusting angle and power:
 * - Angle indicator: arc display around tank turret
 * - Power bar: vertical slider on the left side
 * - Fire button: large, prominent, neon styled
 * - Trajectory preview: dotted line showing projected path
 *
 * All coordinates are in design space (1200x800).
 */

import { CANVAS, COLORS, UI, PHYSICS, TANK } from './constants.js';
import { registerSliderZone, queueGameInput, INPUT_EVENTS, isGameInputEnabled } from './input.js';
import * as Wind from './wind.js';

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================

/**
 * Aiming controls layout configuration.
 * Designed for touch-friendly sizing (minimum 44px tap targets).
 * UI positioned for comfortable thumb access on mobile devices.
 */
const CONTROLS = {
    // Power bar on the left side - positioned for left thumb access
    POWER_BAR: {
        X: 50,              // Slightly inward for better thumb reach
        Y: 220,             // Positioned in thumb-accessible zone
        WIDTH: 55,          // Touch-friendly width
        HEIGHT: 280,        // Slightly shorter for thumb reach
        PADDING: 10,
        KNOB_HEIGHT: 48,    // Touch-friendly: exceeds 44px minimum
        TOUCH_ZONE_PADDING: 24  // Extra padding for touch targets
    },
    // Fire button at bottom center - touch-optimized for easy thumb access
    FIRE_BUTTON: {
        X: CANVAS.DESIGN_WIDTH / 2,
        Y: CANVAS.DESIGN_HEIGHT - 110,  // Slightly higher for thumb reach
        WIDTH: 200,         // Extra wide for easy tapping
        HEIGHT: 80,         // Touch-friendly: well over 44px minimum
        BORDER_RADIUS: 14
    },
    // Angle arc around tank turret
    ANGLE_ARC: {
        RADIUS: 60,           // Arc radius from tank center
        ARC_WIDTH: 8,         // Width of the arc stroke
        TICK_LENGTH: 12,      // Length of angle tick marks
        TOUCH_RADIUS: 80      // Larger radius for touch interaction
    },
    // Trajectory preview
    TRAJECTORY: {
        MAX_POINTS: 100,      // Maximum points to simulate
        STEP_TIME: 0.03,      // Time step for simulation (seconds)
        DOT_SPACING: 8,       // Pixels between dots
        DOT_RADIUS: 3,        // Radius of trajectory dots
        FADE_START: 0.5       // Start fading at 50% of trajectory
    }
};

// =============================================================================
// CONTROL STATE
// =============================================================================

/**
 * Current state of aiming controls interaction.
 */
const controlState = {
    // Which control is being interacted with
    activeControl: null,  // 'power', 'angle', or null

    // Power bar drag state
    powerDragStartY: 0,
    powerDragStartValue: 0,

    // Angle arc drag state
    angleDragStartAngle: 0,
    angleDragCenterX: 0,
    angleDragCenterY: 0,

    // Fire button state
    fireButtonPressed: false,
    fireButtonHovered: false
};

/**
 * Reference to the current player tank (set during render).
 * @type {import('./tank.js').Tank|null}
 */
let currentPlayerTank = null;

/**
 * Whether controls are currently enabled (player's turn).
 * @type {boolean}
 */
let controlsEnabled = false;

/**
 * Animation time for pulsing effects.
 * @type {number}
 */
let animationTime = 0;

// =============================================================================
// POWER BAR RENDERING
// =============================================================================

/**
 * Render the power bar control.
 * A vertical slider on the left side of the screen.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} power - Current power value (0-100)
 */
function renderPowerBar(ctx, power) {
    const bar = CONTROLS.POWER_BAR;
    const isActive = controlState.activeControl === 'power';
    const accentColor = isActive ? COLORS.NEON_PINK : COLORS.NEON_CYAN;

    ctx.save();

    // Background panel
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(bar.X - bar.PADDING, bar.Y - bar.PADDING,
                  bar.WIDTH + bar.PADDING * 2, bar.HEIGHT + bar.PADDING * 2 + 30, 8);
    ctx.fill();

    // Glowing border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = isActive ? 12 : 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Track background
    const trackX = bar.X + (bar.WIDTH - 20) / 2;
    const trackWidth = 20;
    ctx.fillStyle = 'rgba(30, 30, 60, 0.8)';
    ctx.beginPath();
    ctx.roundRect(trackX, bar.Y, trackWidth, bar.HEIGHT, 4);
    ctx.fill();

    // Power fill with gradient
    const fillHeight = (power / 100) * bar.HEIGHT;
    const fillY = bar.Y + bar.HEIGHT - fillHeight;

    const gradient = ctx.createLinearGradient(trackX, fillY, trackX, bar.Y + bar.HEIGHT);
    gradient.addColorStop(0, COLORS.NEON_PINK);
    gradient.addColorStop(0.5, COLORS.NEON_ORANGE);
    gradient.addColorStop(1, COLORS.NEON_YELLOW);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(trackX + 2, fillY + 2, trackWidth - 4, fillHeight - 4, 2);
    ctx.fill();

    // Knob at current position
    const knobY = fillY - bar.KNOB_HEIGHT / 2;
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.beginPath();
    ctx.roundRect(bar.X, Math.max(bar.Y - bar.KNOB_HEIGHT / 2, knobY),
                  bar.WIDTH, bar.KNOB_HEIGHT, 6);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Power value on knob
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(power)}`, bar.X + bar.WIDTH / 2,
                 Math.max(bar.Y, knobY + bar.KNOB_HEIGHT / 2));

    // Label
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('POWER', bar.X + bar.WIDTH / 2, bar.Y + bar.HEIGHT + bar.PADDING + 5);

    ctx.restore();
}

// =============================================================================
// ANGLE ARC RENDERING
// =============================================================================

/**
 * Render the angle arc indicator around the tank turret.
 * Shows a semi-circular arc with the current angle highlighted.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - Player tank
 * @param {number} angle - Current angle in degrees (0-180)
 */
function renderAngleArc(ctx, tank, angle) {
    if (!tank) return;

    const arc = CONTROLS.ANGLE_ARC;
    const isActive = controlState.activeControl === 'angle';
    const accentColor = isActive ? COLORS.NEON_PINK : COLORS.NEON_CYAN;

    // Arc center is at tank turret pivot point
    const centerX = tank.x;
    const centerY = tank.y - TANK.BODY_HEIGHT;

    ctx.save();

    // Draw full arc background (semi-circle from 0 to 180 degrees)
    ctx.beginPath();
    ctx.arc(centerX, centerY, arc.RADIUS, Math.PI, 0, false);
    ctx.strokeStyle = 'rgba(100, 100, 140, 0.4)';
    ctx.lineWidth = arc.ARC_WIDTH;
    ctx.stroke();

    // Draw angle tick marks at 0, 45, 90, 135, 180
    const tickAngles = [0, 45, 90, 135, 180];
    for (const tickAngle of tickAngles) {
        const rad = (tickAngle * Math.PI) / 180;
        const innerR = arc.RADIUS - arc.TICK_LENGTH / 2;
        const outerR = arc.RADIUS + arc.TICK_LENGTH / 2;

        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(Math.PI - rad) * innerR,
                   centerY - Math.sin(rad) * innerR);
        ctx.lineTo(centerX + Math.cos(Math.PI - rad) * outerR,
                   centerY - Math.sin(rad) * outerR);
        ctx.strokeStyle = tickAngle === 90 ? COLORS.NEON_YELLOW : 'rgba(150, 150, 180, 0.6)';
        ctx.lineWidth = tickAngle === 90 ? 3 : 2;
        ctx.stroke();

        // Draw angle label
        if (tickAngle % 45 === 0) {
            const labelR = arc.RADIUS + arc.TICK_LENGTH + 12;
            const labelX = centerX + Math.cos(Math.PI - rad) * labelR;
            const labelY = centerY - Math.sin(rad) * labelR;

            ctx.fillStyle = 'rgba(150, 150, 180, 0.8)';
            ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${tickAngle}°`, labelX, labelY);
        }
    }

    // Draw current angle indicator (highlighted arc segment)
    const angleRad = (angle * Math.PI) / 180;
    const arcSpan = 10 * Math.PI / 180; // 10 degree highlight span

    ctx.beginPath();
    ctx.arc(centerX, centerY, arc.RADIUS,
            Math.PI - angleRad - arcSpan, Math.PI - angleRad + arcSpan, false);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = arc.ARC_WIDTH + 4;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw angle pointer (small triangle or dot at current angle)
    const pointerR = arc.RADIUS;
    const pointerX = centerX + Math.cos(Math.PI - angleRad) * pointerR;
    const pointerY = centerY - Math.sin(angleRad) * pointerR;

    ctx.beginPath();
    ctx.arc(pointerX, pointerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(pointerX, pointerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw current angle text below arc
    ctx.fillStyle = accentColor;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 8;
    ctx.fillText(`${Math.round(angle)}°`, centerX, centerY + arc.RADIUS + 20);

    ctx.restore();
}

// =============================================================================
// FIRE BUTTON RENDERING
// =============================================================================

/**
 * Render the fire button with touch feedback.
 * A large, neon-styled button at the bottom center.
 * Shows strong tactile feedback when pressed.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {boolean} canFire - Whether player can currently fire
 */
function renderFireButton(ctx, canFire) {
    const btn = CONTROLS.FIRE_BUTTON;
    const isPressed = controlState.fireButtonPressed;
    const isHovered = controlState.fireButtonHovered;

    // Pulsing intensity when can fire
    const pulse = canFire ? (Math.sin(animationTime * 4) * 0.15 + 0.85) : 0.5;

    ctx.save();

    const btnX = btn.X - btn.WIDTH / 2;
    const btnY = btn.Y - btn.HEIGHT / 2;

    // Button shadow/press effect - more pronounced for touch feedback
    const offsetY = isPressed ? 4 : 0;

    // Button background - brighter when pressed
    ctx.fillStyle = isPressed ? 'rgba(255, 42, 109, 0.4)' : 'rgba(10, 10, 26, 0.9)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY + offsetY, btn.WIDTH, btn.HEIGHT, btn.BORDER_RADIUS);
    ctx.fill();

    // Inner highlight when pressed
    if (isPressed && canFire) {
        ctx.fillStyle = 'rgba(255, 42, 109, 0.25)';
        ctx.fill();
    }

    // Neon border with glow - stronger when pressed
    const borderColor = canFire ? COLORS.NEON_PINK : COLORS.TEXT_MUTED;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isPressed ? 5 : 4;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = isPressed ? 25 : (canFire ? 15 * pulse : 0);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner glow when hovered (desktop) or pressed (touch)
    if ((isHovered || isPressed) && canFire) {
        ctx.strokeStyle = 'rgba(255, 42, 109, 0.5)';
        ctx.lineWidth = 10;
        ctx.stroke();
    }

    // Button text - larger for touch
    ctx.fillStyle = canFire ? COLORS.TEXT_LIGHT : COLORS.TEXT_MUTED;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE + 8}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (canFire) {
        ctx.shadowColor = COLORS.NEON_PINK;
        ctx.shadowBlur = isPressed ? 15 : 8 * pulse;
    }
    ctx.fillText('FIRE!', btn.X, btn.Y + offsetY);

    // Keyboard hint - smaller and subtle
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillText('[SPACE]', btn.X, btn.Y + btn.HEIGHT / 2 - 8 + offsetY);

    ctx.restore();
}

// =============================================================================
// TRAJECTORY PREVIEW RENDERING
// =============================================================================

/**
 * Simulate projectile trajectory and return path points.
 * Uses the same physics as the actual projectile.
 *
 * @param {import('./tank.js').Tank} tank - Player tank
 * @param {number} angle - Fire angle in degrees
 * @param {number} power - Fire power (0-100)
 * @param {number} windForce - Current wind force
 * @param {import('./terrain.js').Terrain} terrain - Terrain for collision detection
 * @returns {Array<{x: number, y: number}>} Array of trajectory points
 */
function simulateTrajectory(tank, angle, power, windForce, terrain) {
    if (!tank) return [];

    const traj = CONTROLS.TRAJECTORY;
    const points = [];

    // Get fire position (tip of turret)
    const radians = (angle * Math.PI) / 180;
    const bodyHeight = TANK.BODY_HEIGHT || TANK.HEIGHT;
    const startX = tank.x + Math.cos(radians) * TANK.TURRET_LENGTH;
    const startY = tank.y - bodyHeight - Math.sin(radians) * TANK.TURRET_LENGTH;

    // Calculate initial velocity (same formula as projectile.js)
    const velocityMagnitude = (power / 100) * 15;
    let vx = Math.cos(radians) * velocityMagnitude;
    let vy = -Math.sin(radians) * velocityMagnitude;  // Negative because canvas Y is inverted

    let x = startX;
    let y = startY;

    // Simulate trajectory
    for (let i = 0; i < traj.MAX_POINTS; i++) {
        points.push({ x, y });

        // Apply physics
        vy += PHYSICS.GRAVITY;
        vx += windForce * PHYSICS.WIND_FORCE_MULTIPLIER;

        // Cap velocity
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > PHYSICS.MAX_VELOCITY) {
            const scale = PHYSICS.MAX_VELOCITY / speed;
            vx *= scale;
            vy *= scale;
        }

        // Move
        x += vx;
        y += vy;

        // Check bounds
        if (x < 0 || x > CANVAS.DESIGN_WIDTH || y > CANVAS.DESIGN_HEIGHT) {
            break;
        }

        // Check terrain collision (if terrain is provided)
        if (terrain) {
            const terrainHeight = terrain.getHeight(Math.floor(x));
            const terrainY = CANVAS.DESIGN_HEIGHT - terrainHeight;
            if (y >= terrainY) {
                points.push({ x, y: terrainY });
                break;
            }
        }
    }

    return points;
}

/**
 * Render the trajectory preview line.
 * Shows a dotted line representing the projected path.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - Player tank
 * @param {number} angle - Fire angle in degrees
 * @param {number} power - Fire power (0-100)
 * @param {import('./terrain.js').Terrain} terrain - Terrain for collision detection
 */
export function renderTrajectoryPreview(ctx, tank, angle, power, terrain) {
    if (!tank) return;

    const traj = CONTROLS.TRAJECTORY;
    const windForce = Wind.getWindForce();

    const points = simulateTrajectory(tank, angle, power, windForce, terrain);
    if (points.length < 2) return;

    ctx.save();

    // Draw trajectory as dotted line with fading opacity
    let distanceTraveled = 0;
    let lastPoint = points[0];

    for (let i = 1; i < points.length; i++) {
        const point = points[i];
        const segmentLength = Math.sqrt(
            Math.pow(point.x - lastPoint.x, 2) +
            Math.pow(point.y - lastPoint.y, 2)
        );
        distanceTraveled += segmentLength;

        // Calculate fade based on distance
        const maxDistance = points.length * 10;
        const fadeProgress = Math.min(distanceTraveled / maxDistance, 1);
        const alpha = fadeProgress < traj.FADE_START ?
            0.8 :
            0.8 * (1 - (fadeProgress - traj.FADE_START) / (1 - traj.FADE_START));

        // Draw dot at spaced intervals
        if (distanceTraveled % traj.DOT_SPACING < segmentLength) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, traj.DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(249, 240, 2, ${alpha})`;  // Yellow dots
            ctx.shadowColor = COLORS.NEON_YELLOW;
            ctx.shadowBlur = 4 * alpha;
            ctx.fill();
        }

        lastPoint = point;
    }

    // Draw impact point (larger circle at end)
    const endPoint = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 42, 109, 0.8)';
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 8;
    ctx.fill();

    // Cross at impact point
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(endPoint.x - 6, endPoint.y);
    ctx.lineTo(endPoint.x + 6, endPoint.y);
    ctx.moveTo(endPoint.x, endPoint.y - 6);
    ctx.lineTo(endPoint.x, endPoint.y + 6);
    ctx.stroke();

    ctx.restore();
}

// =============================================================================
// CONTROL INTERACTION
// =============================================================================

/**
 * Check if a point is inside the fire button.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if inside button
 */
export function isInsideFireButton(x, y) {
    const btn = CONTROLS.FIRE_BUTTON;
    const halfWidth = btn.WIDTH / 2;
    const halfHeight = btn.HEIGHT / 2;
    return (
        x >= btn.X - halfWidth &&
        x <= btn.X + halfWidth &&
        y >= btn.Y - halfHeight &&
        y <= btn.Y + halfHeight
    );
}

/**
 * Check if a point is inside the power bar area.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if inside power bar
 */
export function isInsidePowerBar(x, y) {
    const bar = CONTROLS.POWER_BAR;
    const padding = bar.TOUCH_ZONE_PADDING;
    return (
        x >= bar.X - padding &&
        x <= bar.X + bar.WIDTH + padding &&
        y >= bar.Y - padding - bar.KNOB_HEIGHT / 2 &&
        y <= bar.Y + bar.HEIGHT + padding
    );
}

/**
 * Check if a point is inside the angle arc area.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {import('./tank.js').Tank} tank - Player tank
 * @returns {boolean} True if inside angle arc
 */
export function isInsideAngleArc(x, y, tank) {
    if (!tank) return false;

    const arc = CONTROLS.ANGLE_ARC;
    const centerX = tank.x;
    const centerY = tank.y - TANK.BODY_HEIGHT;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within arc radius (with touch padding)
    if (distance < arc.RADIUS - 20 || distance > arc.TOUCH_RADIUS + 20) {
        return false;
    }

    // Check if in upper half (0-180 degrees)
    return dy < 10;  // Allow slight tolerance below center
}

/**
 * Calculate angle from a point relative to tank center.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {import('./tank.js').Tank} tank - Player tank
 * @returns {number} Angle in degrees (0-180)
 */
function calculateAngleFromPoint(x, y, tank) {
    if (!tank) return 90;

    const centerX = tank.x;
    const centerY = tank.y - TANK.BODY_HEIGHT;

    const dx = x - centerX;
    const dy = centerY - y;  // Invert Y for standard angle calculation

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Clamp to 0-180
    angle = Math.max(0, Math.min(180, angle));

    return angle;
}

/**
 * Calculate power from Y position on power bar.
 * @param {number} y - Y coordinate
 * @returns {number} Power value (0-100)
 */
function calculatePowerFromY(y) {
    const bar = CONTROLS.POWER_BAR;

    // Invert: top of bar = 100, bottom = 0
    const relativeY = y - bar.Y;
    const power = 100 - (relativeY / bar.HEIGHT) * 100;

    return Math.max(0, Math.min(100, power));
}

/**
 * Handle pointer down on aiming controls.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {import('./tank.js').Tank} tank - Player tank
 * @param {boolean} canFire - Whether player can fire
 */
export function handlePointerDown(x, y, tank, canFire) {
    if (!controlsEnabled || !isGameInputEnabled()) return;

    // Check fire button
    if (canFire && isInsideFireButton(x, y)) {
        controlState.fireButtonPressed = true;
        return;
    }

    // Check power bar
    if (isInsidePowerBar(x, y)) {
        controlState.activeControl = 'power';
        controlState.powerDragStartY = y;
        controlState.powerDragStartValue = tank ? tank.power : 50;
        return;
    }

    // Check angle arc
    if (isInsideAngleArc(x, y, tank)) {
        controlState.activeControl = 'angle';
        controlState.angleDragCenterX = tank.x;
        controlState.angleDragCenterY = tank.y - TANK.BODY_HEIGHT;
        controlState.angleDragStartAngle = calculateAngleFromPoint(x, y, tank);
        return;
    }
}

/**
 * Handle pointer move for aiming controls.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {import('./tank.js').Tank} tank - Player tank
 */
export function handlePointerMove(x, y, tank) {
    // Update hover state for fire button
    controlState.fireButtonHovered = isInsideFireButton(x, y);

    if (!controlsEnabled || !isGameInputEnabled()) return;

    if (controlState.activeControl === 'power') {
        // Calculate new power from Y position
        const newPower = calculatePowerFromY(y);
        const delta = newPower - (tank ? tank.power : 50);
        if (Math.abs(delta) > 0.5) {
            queueGameInput(INPUT_EVENTS.POWER_CHANGE, delta);
        }
    } else if (controlState.activeControl === 'angle') {
        // Calculate new angle from pointer position
        const newAngle = calculateAngleFromPoint(x, y, tank);
        const delta = newAngle - (tank ? tank.angle : 90);
        if (Math.abs(delta) > 0.5) {
            queueGameInput(INPUT_EVENTS.ANGLE_CHANGE, delta);
        }
    }
}

/**
 * Handle pointer up on aiming controls.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {boolean} canFire - Whether player can fire
 */
export function handlePointerUp(x, y, canFire) {
    // Check if fire button was pressed and released inside
    if (controlState.fireButtonPressed && canFire && isInsideFireButton(x, y)) {
        queueGameInput(INPUT_EVENTS.FIRE);
    }

    // Reset all control states
    controlState.activeControl = null;
    controlState.fireButtonPressed = false;
}

// =============================================================================
// MAIN RENDER FUNCTION
// =============================================================================

/**
 * Update animation time.
 * Call once per frame.
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    animationTime += deltaTime / 1000;
}

/**
 * Enable or disable aiming controls.
 * Controls are only active during player's turn.
 * @param {boolean} enabled - Whether controls should be enabled
 */
export function setEnabled(enabled) {
    controlsEnabled = enabled;
    if (!enabled) {
        // Reset control state when disabled
        controlState.activeControl = null;
        controlState.fireButtonPressed = false;
    }
}

/**
 * Check if controls are currently enabled.
 * @returns {boolean} True if controls are enabled
 */
export function isEnabled() {
    return controlsEnabled;
}

/**
 * Render all aiming controls.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} state - Current game state
 * @param {import('./tank.js').Tank} state.playerTank - Player tank
 * @param {number} state.angle - Current angle (from playerAim or tank)
 * @param {number} state.power - Current power (from playerAim or tank)
 * @param {boolean} state.canFire - Whether player can fire
 * @param {boolean} state.isPlayerTurn - Whether it's player's turn
 * @param {import('./terrain.js').Terrain} [state.terrain] - Terrain for trajectory preview
 */
export function renderAimingControls(ctx, state) {
    if (!ctx || !state) return;

    const {
        playerTank,
        angle = 45,
        power = 50,
        canFire = false,
        isPlayerTurn = false,
        terrain = null
    } = state;

    // Store reference to tank for interaction handling
    currentPlayerTank = playerTank;

    // Only render controls during player's turn
    if (!isPlayerTurn) {
        controlsEnabled = false;
        return;
    }

    controlsEnabled = true;

    // Render trajectory preview first (behind other controls)
    if (playerTank) {
        renderTrajectoryPreview(ctx, playerTank, angle, power, terrain);
    }

    // Render power bar
    renderPowerBar(ctx, power);

    // Render angle arc (around tank)
    if (playerTank) {
        renderAngleArc(ctx, playerTank, angle);
    }

    // Render fire button
    renderFireButton(ctx, canFire);
}

/**
 * Get the current player tank reference (for external interaction handlers).
 * @returns {import('./tank.js').Tank|null} Current player tank
 */
export function getCurrentTank() {
    return currentPlayerTank;
}

/**
 * Get control layout constants (for external use).
 * @returns {Object} Control layout constants
 */
export function getControlLayout() {
    return { ...CONTROLS };
}
