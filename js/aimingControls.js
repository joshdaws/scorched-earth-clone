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
    scaled, scaledTouch, isVeryShortScreen, isMobileDevice
} from './uiPosition.js?v=20260111a';
import * as ControlSettings from './controls/controlSettings.js';

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
        RIGHT_OFFSET: 180,  // Distance from right edge to center
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
    const mobile = isMobileDevice();

    // Smaller fire button on mobile/very short screens - use smaller min sizes on mobile
    const compactMode = mobile || veryShortScreen;
    const fireButtonWidth = compactMode
        ? scaledTouch(110, 36)  // Smaller but still touch-friendly, lower min on mobile
        : scaledTouch(CONTROLS_BASE.FIRE_BUTTON.WIDTH);
    const fireButtonHeight = compactMode
        ? scaledTouch(44, 36)   // Smaller height, matches Apple HIG minimum
        : scaledTouch(CONTROLS_BASE.FIRE_BUTTON.HEIGHT);

    // Fire button position: from right and bottom edges - closer to edges on mobile
    const fireButtonBottomOffset = compactMode ? 40 : scaled(CONTROLS_BASE.FIRE_BUTTON.BOTTOM_OFFSET);
    const fireButtonRightOffset = compactMode ? 125 : scaled(CONTROLS_BASE.FIRE_BUTTON.RIGHT_OFFSET);
    const fireButtonX = fromRight(fireButtonRightOffset);
    const fireButtonY = fromBottom(fireButtonBottomOffset);

    // Scale factors for mobile
    const mobileScale = mobile ? 0.75 : 1;

    return {
        FIRE_BUTTON: {
            X: fireButtonX,
            Y: fireButtonY,
            WIDTH: fireButtonWidth,
            HEIGHT: fireButtonHeight,
            BORDER_RADIUS: scaled(CONTROLS_BASE.FIRE_BUTTON.BORDER_RADIUS * (mobile ? 0.7 : 1))
        },
        ANGLE_ARC: {
            RADIUS: scaled(CONTROLS_BASE.ANGLE_ARC.RADIUS * mobileScale),
            ARC_WIDTH: scaled(CONTROLS_BASE.ANGLE_ARC.ARC_WIDTH * mobileScale),
            TICK_LENGTH: scaled(CONTROLS_BASE.ANGLE_ARC.TICK_LENGTH * mobileScale),
            TOUCH_RADIUS: scaled(CONTROLS_BASE.ANGLE_ARC.TOUCH_RADIUS)  // Keep touch area same for usability
        },
        TRAJECTORY: {
            MAX_POINTS: CONTROLS_BASE.TRAJECTORY.MAX_POINTS,
            STEP_TIME: CONTROLS_BASE.TRAJECTORY.STEP_TIME,
            DOT_SPACING: scaled(CONTROLS_BASE.TRAJECTORY.DOT_SPACING * mobileScale),
            DOT_RADIUS: scaled(CONTROLS_BASE.TRAJECTORY.DOT_RADIUS * mobileScale),
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

    const pulse = canFire ? (Math.sin(animationTime * 4) * 0.14 + 0.86) : 0.35;

    ctx.save();

    const btnX = btn.X - btn.WIDTH / 2;
    const btnY = btn.Y - btn.HEIGHT / 2;
    const offsetY = isPressed && canFire ? Math.max(3, Math.round(btn.HEIGHT * 0.07)) : 0;
    const bodyY = btnY + offsetY;
    const bodyHeight = btn.HEIGHT - offsetY;
    const radius = Math.min(btn.BORDER_RADIUS + 6, btn.HEIGHT * 0.32);
    const inset = Math.max(7, Math.round(btn.HEIGHT * 0.13));
    const innerX = btnX + inset;
    const innerY = bodyY + inset * 0.78;
    const innerWidth = btn.WIDTH - inset * 2;
    const innerHeight = bodyHeight - inset * 1.55;
    const innerRadius = Math.max(7, radius - inset * 0.4);
    const borderColor = canFire ? COLORS.NEON_PINK : COLORS.TEXT_MUTED;
    const glowColor = canFire ? COLORS.NEON_PINK : 'rgba(120, 120, 150, 0.5)';

    // Heavy contact shadow makes the button read as a physical control.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.beginPath();
    ctx.roundRect(btnX + 8, btnY + btn.HEIGHT * 0.18, btn.WIDTH - 16, btn.HEIGHT, radius);
    ctx.fill();

    if (canFire) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (isPressed ? 42 : 28) * pulse;
        ctx.fillStyle = 'rgba(255, 42, 109, 0.42)';
        ctx.globalAlpha = isPressed ? 0.42 : 0.22 + pulse * 0.1;
        ctx.beginPath();
        ctx.roundRect(btnX - 9, bodyY - 7, btn.WIDTH + 18, bodyHeight + 14, radius + 8);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    const frameGradient = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyHeight);
    if (canFire) {
        frameGradient.addColorStop(0, isPressed ? 'rgba(86, 36, 70, 0.98)' : 'rgba(96, 46, 82, 0.98)');
        frameGradient.addColorStop(0.18, 'rgba(236, 96, 147, 0.36)');
        frameGradient.addColorStop(0.5, 'rgba(22, 16, 34, 0.98)');
        frameGradient.addColorStop(1, 'rgba(4, 4, 12, 0.98)');
    } else {
        frameGradient.addColorStop(0, 'rgba(54, 54, 72, 0.8)');
        frameGradient.addColorStop(1, 'rgba(10, 10, 20, 0.88)');
    }

    ctx.fillStyle = frameGradient;
    ctx.beginPath();
    ctx.roundRect(btnX, bodyY, btn.WIDTH, bodyHeight, radius);
    ctx.fill();

    // Metallic upper lip.
    const lipGradient = ctx.createLinearGradient(btnX, bodyY, btnX + btn.WIDTH, bodyY + bodyHeight);
    lipGradient.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
    lipGradient.addColorStop(0.18, 'rgba(255, 255, 255, 0.08)');
    lipGradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.16)');
    lipGradient.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
    ctx.fillStyle = lipGradient;
    ctx.beginPath();
    ctx.roundRect(btnX + 4, bodyY + 4, btn.WIDTH - 8, Math.max(8, bodyHeight * 0.34), Math.max(3, radius - 4));
    ctx.fill();

    const innerGradient = ctx.createLinearGradient(0, innerY, 0, innerY + innerHeight);
    if (canFire) {
        innerGradient.addColorStop(0, isPressed ? '#ff78a7' : '#ff9fc1');
        innerGradient.addColorStop(0.18, '#ff2a6d');
        innerGradient.addColorStop(0.58, '#b8144d');
        innerGradient.addColorStop(1, '#4b0828');
    } else {
        innerGradient.addColorStop(0, 'rgba(92, 92, 112, 0.92)');
        innerGradient.addColorStop(1, 'rgba(28, 28, 42, 0.92)');
    }

    if (canFire) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = isPressed ? 20 : 14 * pulse;
    }
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.roundRect(innerX, innerY, innerWidth, innerHeight, innerRadius);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (canFire) {
        const shineGradient = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerHeight * 0.48);
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.46)');
        shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shineGradient;
        ctx.beginPath();
        ctx.roundRect(innerX + 5, innerY + 4, innerWidth - 10, innerHeight * 0.42, Math.max(3, innerRadius - 4));
        ctx.fill();

        const chargeWidth = (innerWidth - 16) * (0.6 + pulse * 0.28);
        const chargeX = btn.X - chargeWidth / 2;
        const railY = innerY + innerHeight - Math.max(8, innerHeight * 0.22);

        const railGradient = ctx.createLinearGradient(chargeX, 0, chargeX + chargeWidth, 0);
        railGradient.addColorStop(0, 'rgba(255, 42, 109, 0)');
        railGradient.addColorStop(0.5, isPressed ? 'rgba(255, 246, 250, 0.95)' : 'rgba(255, 224, 238, 0.78)');
        railGradient.addColorStop(1, 'rgba(255, 42, 109, 0)');

        ctx.fillStyle = railGradient;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = isPressed ? 16 : 10 * pulse;
        ctx.beginPath();
        ctx.roundRect(chargeX, railY, chargeWidth, 5, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const notchX = innerX + innerWidth * (0.18 + i * 0.14);
            ctx.beginPath();
            ctx.moveTo(notchX, innerY + 7);
            ctx.lineTo(notchX + 16, innerY + innerHeight - 8);
            ctx.stroke();
        }
    }

    ctx.strokeStyle = canFire ? 'rgba(255, 235, 245, 0.62)' : 'rgba(255, 255, 255, 0.13)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(innerX, innerY, innerWidth, innerHeight, innerRadius);
    ctx.stroke();

    ctx.strokeStyle = borderColor;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = canFire ? (isPressed ? 28 : 18 * pulse) : 0;
    ctx.lineWidth = canFire ? 4 : 2;
    ctx.beginPath();
    ctx.roundRect(btnX, bodyY, btn.WIDTH, bodyHeight, radius);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = canFire ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btnX + 4, bodyY + 4, btn.WIDTH - 8, bodyHeight - 8, Math.max(2, radius - 4));
    ctx.stroke();

    if ((isHovered || isPressed) && canFire) {
        ctx.strokeStyle = 'rgba(255, 206, 225, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(btnX + radius, bodyY + 3);
        ctx.lineTo(btnX + btn.WIDTH - radius, bodyY + 3);
        ctx.stroke();
    }

    ctx.fillStyle = canFire ? COLORS.TEXT_LIGHT : COLORS.TEXT_MUTED;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE + 10}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (canFire) {
        ctx.shadowColor = 'rgba(40, 0, 22, 0.9)';
        ctx.shadowBlur = 3;
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(40, 0, 22, 0.65)';
        ctx.strokeText('FIRE!', btn.X, btn.Y - 3 + offsetY);
        ctx.shadowColor = COLORS.NEON_PINK;
        ctx.shadowBlur = isPressed ? 18 : 11 * pulse;
    }
    ctx.fillText('FIRE!', btn.X, btn.Y - 3 + offsetY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = canFire ? 'rgba(255, 232, 242, 0.92)' : 'rgba(170, 170, 190, 0.45)';
    ctx.font = `bold ${Math.max(9, Math.round(UI.FONT_SIZE_SMALL * 0.85))}px ${UI.FONT_FAMILY}`;
    ctx.fillText(canFire ? 'ARMED' : 'LOCKED', btn.X, btn.Y + btn.HEIGHT * 0.25 + offsetY);

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
        vx += windForce;  // windForce already includes WIND_FORCE_MULTIPLIER from Wind.getWindForce()

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

    // Check if trajectory preview is enabled in settings
    if (!ControlSettings.isTrajectoryVisible()) {
        return;
    }

    const traj = CONTROLS.TRAJECTORY;
    const windForce = Wind.getWindForce();

    const points = simulateTrajectory(tank, angle, power, windForce, terrain);
    if (points.length < 2) return;

    // Get trajectory fraction from settings (1.0 for full, 0.5 for partial, 0 for none)
    // The settings fraction is applied on top of the base preview percent
    const settingsFraction = ControlSettings.getTrajectoryFraction();
    // For FULL: show full preview (use 1.0 to override PREVIEW_PERCENT limit)
    // For PARTIAL: show half the preview
    // For NONE: already returned above
    const effectiveFraction = settingsFraction >= 1.0 ? 1.0 : (traj.PREVIEW_PERCENT * 2 * settingsFraction);
    const previewPointCount = Math.max(2, Math.floor(points.length * effectiveFraction));
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
