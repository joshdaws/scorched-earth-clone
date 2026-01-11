/**
 * Scorched Earth: Synthwave Edition
 * Aiming Controls UI Module
 *
 * Provides visual controls for aiming:
 * - Angle indicator: arc display around tank turret
 * - Fire button: large, prominent, neon styled
 * - Trajectory preview: dotted line showing projected path
 *
 * Power is controlled via the slingshot/drag mechanic in touchAiming.js.
 *
 * All coordinates are in design space (1200x800).
 */

import { CANVAS, COLORS, UI, PHYSICS, TANK } from './constants.js';
import { registerSliderZone, queueGameInput, INPUT_EVENTS, isGameInputEnabled } from './input.js';
import * as Wind from './wind.js';
import { getScreenWidth, getScreenHeight } from './screenSize.js';
import {
    fromRight, fromBottom,
    scaled, scaledTouch, isVeryShortScreen
} from './uiPosition.js';

// =============================================================================
// LAYOUT HELPERS
// =============================================================================

/**
 * Base layout dimensions (reference sizes before scaling).
 * These are scaled based on screen size for responsive UI.
 */
const CONTROLS_BASE = {
    FIRE_BUTTON: {
        WIDTH: 180,
        HEIGHT: 70,
        BORDER_RADIUS: 14,
        RIGHT_OFFSET: 130,  // Distance from right edge to center
        BOTTOM_OFFSET: 80   // Distance from bottom to center
    },
    ANGLE_ARC: {
        RADIUS: 60,
        ARC_WIDTH: 8,
        TICK_LENGTH: 12,
        TOUCH_RADIUS: 80
    },
    TRAJECTORY: {
        MAX_POINTS: 100,
        STEP_TIME: 0.03,
        DOT_SPACING: 8,
        DOT_RADIUS: 3,
        FADE_START: 0.5,
        PREVIEW_PERCENT: 0.25
    }
};

/**
 * Get dynamic aiming controls layout based on current screen dimensions.
 * @returns {Object} Controls layout configuration
 */
function getControlsLayoutDynamic() {
    const veryShortScreen = isVeryShortScreen();

    // Smaller fire button on very short screens
    const fireButtonWidth = veryShortScreen
        ? scaledTouch(140)  // Smaller but still touch-friendly
        : scaledTouch(CONTROLS_BASE.FIRE_BUTTON.WIDTH);
    const fireButtonHeight = veryShortScreen
        ? scaledTouch(50)   // Smaller height
        : scaledTouch(CONTROLS_BASE.FIRE_BUTTON.HEIGHT);

    // Fire button position: from right and bottom edges - closer to bottom on short screens
    const fireButtonBottomOffset = veryShortScreen ? 50 : scaled(CONTROLS_BASE.FIRE_BUTTON.BOTTOM_OFFSET);
    const fireButtonX = fromRight(veryShortScreen ? 90 : scaled(CONTROLS_BASE.FIRE_BUTTON.RIGHT_OFFSET));
    const fireButtonY = fromBottom(fireButtonBottomOffset);

    return {
        FIRE_BUTTON: {
            X: fireButtonX,
            Y: fireButtonY,
            WIDTH: fireButtonWidth,
            HEIGHT: fireButtonHeight,
            BORDER_RADIUS: scaled(CONTROLS_BASE.FIRE_BUTTON.BORDER_RADIUS)
        },
        ANGLE_ARC: {
            RADIUS: scaled(CONTROLS_BASE.ANGLE_ARC.RADIUS),
            ARC_WIDTH: scaled(CONTROLS_BASE.ANGLE_ARC.ARC_WIDTH),
            TICK_LENGTH: scaled(CONTROLS_BASE.ANGLE_ARC.TICK_LENGTH),
            TOUCH_RADIUS: scaled(CONTROLS_BASE.ANGLE_ARC.TOUCH_RADIUS)
        },
        TRAJECTORY: {
            MAX_POINTS: CONTROLS_BASE.TRAJECTORY.MAX_POINTS,
            STEP_TIME: CONTROLS_BASE.TRAJECTORY.STEP_TIME,
            DOT_SPACING: scaled(CONTROLS_BASE.TRAJECTORY.DOT_SPACING),
            DOT_RADIUS: scaled(CONTROLS_BASE.TRAJECTORY.DOT_RADIUS),
            FADE_START: CONTROLS_BASE.TRAJECTORY.FADE_START,
            PREVIEW_PERCENT: CONTROLS_BASE.TRAJECTORY.PREVIEW_PERCENT
        }
    };
}

// Cache for controls layout
let cachedControlsLayout = null;
let cachedScreenWidth = 0;
let cachedScreenHeight = 0;

/**
 * Get controls layout, using cache if screen size hasn't changed.
 * @returns {Object} Controls layout configuration
 */
function getControls() {
    const currentWidth = getScreenWidth();
    const currentHeight = getScreenHeight();

    if (!cachedControlsLayout || currentWidth !== cachedScreenWidth || currentHeight !== cachedScreenHeight) {
        cachedControlsLayout = getControlsLayoutDynamic();
        cachedScreenWidth = currentWidth;
        cachedScreenHeight = currentHeight;
    }

    return cachedControlsLayout;
}

// Legacy reference using dynamic getters
const CONTROLS = {
    get FIRE_BUTTON() { return getControls().FIRE_BUTTON; },
    get ANGLE_ARC() { return getControls().ANGLE_ARC; },
    get TRAJECTORY() { return getControls().TRAJECTORY; }
};

// =============================================================================
// CONTROL STATE
// =============================================================================

/**
 * Current state of aiming controls interaction.
 */
const controlState = {
    // Which control is being interacted with
    activeControl: null,  // 'angle' or null

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

        // Draw angle label (faded to reduce visual noise)
        if (tickAngle % 45 === 0) {
            const labelR = arc.RADIUS + arc.TICK_LENGTH + 12;
            const labelX = centerX + Math.cos(Math.PI - rad) * labelR;
            const labelY = centerY - Math.sin(rad) * labelR;

            // Highlight the label nearest to current angle, fade others
            const angleDiff = Math.abs(tickAngle - angle);
            const isNearest = angleDiff <= 22.5; // Within half of 45° tick spacing
            const labelOpacity = isNearest ? 0.9 : 0.35;

            ctx.fillStyle = `rgba(150, 150, 180, ${labelOpacity})`;
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

        // Check bounds using dynamic screen dimensions
        if (x < 0 || x > getScreenWidth() || y > getScreenHeight()) {
            break;
        }

        // Check terrain collision (if terrain is provided)
        if (terrain) {
            const terrainHeight = terrain.getHeight(Math.floor(x));
            const terrainY = getScreenHeight() - terrainHeight;
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
 * Shows a dotted line representing only the initial portion of the projected path.
 * The full trajectory is calculated but only ~25% is displayed for skill-based aiming.
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

    // Only show a portion of the trajectory for skill-based aiming
    const previewPointCount = Math.max(2, Math.floor(points.length * traj.PREVIEW_PERCENT));
    const previewPoints = points.slice(0, previewPointCount);


    ctx.save();

    // Draw trajectory as dotted line with fading opacity
    let distanceTraveled = 0;
    let lastPoint = previewPoints[0];

    for (let i = 1; i < previewPoints.length; i++) {
        const point = previewPoints[i];
        const segmentLength = Math.sqrt(
            Math.pow(point.x - lastPoint.x, 2) +
            Math.pow(point.y - lastPoint.y, 2)
        );
        distanceTraveled += segmentLength;

        // Calculate fade based on progress through the visible portion
        const fadeProgress = i / previewPoints.length;
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

    // No impact point shown - player must estimate the full trajectory

    // Draw floating power percentage near trajectory start
    if (previewPoints.length > 0) {
        const startPoint = previewPoints[0];
        const angleRad = (angle * Math.PI) / 180;

        // Position the label perpendicular to the trajectory direction, offset above
        const offsetDistance = 25;
        const labelX = startPoint.x + Math.cos(angleRad) * offsetDistance;
        const labelY = startPoint.y - Math.sin(angleRad) * offsetDistance - 15;

        // Synthwave styled power text
        ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 6;
        ctx.fillText(`${Math.round(power)}%`, labelX, labelY);
        ctx.shadowBlur = 0;
    }

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

    if (controlState.activeControl === 'angle') {
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
 * Get control layout for external use.
 * Returns dynamically calculated layout based on current screen size.
 * @returns {Object} Control layout
 */
export function getControlLayout() {
    return getControls();
}
