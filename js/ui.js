/**
 * Scorched Earth: Synthwave Edition
 * UI Module - In-Game HUD
 *
 * Renders the heads-up display showing health, angle, power, wind,
 * current weapon, ammo, and money. Uses synthwave styling with neon
 * accents on dark panels.
 */

import { CANVAS, COLORS, UI, TANK, TURN_PHASES } from './constants.js';
import { WeaponRegistry } from './weapons.js';
import * as Wind from './wind.js';

// =============================================================================
// HUD LAYOUT CONSTANTS
// =============================================================================

/**
 * HUD layout configuration.
 * Positions are in design coordinates (1200x800).
 */
const HUD = {
    // Health bars positioned near tanks (not at top to avoid wind indicator overlap)
    HEALTH_BAR: {
        WIDTH: 160,
        HEIGHT: 14,
        PADDING: 20,
        Y: 55,  // Below wind indicator and round indicator
        BORDER_RADIUS: 4
    },
    // Consolidated player info panel at top-left (below wind and round indicators)
    PLAYER_INFO_PANEL: {
        X: 20,
        Y: 95,  // Below round indicator (Y=65, height=24, ends at Y=89)
        WIDTH: 200,
        PADDING: 12,
        SECTION_GAP: 8,
        HEALTH_BAR_HEIGHT: 14,
        BORDER_RADIUS: 10
    },
    // Angle/Power panel on left side
    AIMING_PANEL: {
        X: 20,
        Y: 100,
        WIDTH: 160,
        HEIGHT: 80,
        PADDING: 10
    },
    // Weapon panel on right side - touch-friendly for tap to cycle
    WEAPON_PANEL: {
        X: CANVAS.DESIGN_WIDTH - 20,
        Y: 100,
        WIDTH: 190,         // Slightly wider for touch
        HEIGHT: 75,         // Touch-friendly height
        PADDING: 12
    },
    // Money display at bottom right
    MONEY_PANEL: {
        X: CANVAS.DESIGN_WIDTH - 20,
        Y: CANVAS.DESIGN_HEIGHT - 50,
        WIDTH: 140,
        HEIGHT: 35,
        PADDING: 10
    },
    // Turn indicator at center top
    TURN_INDICATOR: {
        X: CANVAS.DESIGN_WIDTH / 2,
        Y: 20,
        WIDTH: 200,
        HEIGHT: 30
    },
    // Game state panel at top-center - container for turn indicator, round, wind
    // Will eventually replace individual top-center elements
    GAME_STATE_PANEL: {
        X: CANVAS.DESIGN_WIDTH / 2,  // Center X
        Y: 12,                        // Top padding
        WIDTH: 360,                   // Wide enough for content
        MIN_HEIGHT: 100,              // Height to accommodate turn indicator, round, and wind
        PADDING: 16,
        BORDER_RADIUS: 12,
        // Wind bar dimensions (inside the panel)
        WIND_BAR: {
            HEIGHT: 20,              // Height of the wind bar
            MARGIN_TOP: 8,           // Space above wind bar
            ARROW_MIN_LENGTH: 10,    // Minimum arrow length
            ARROW_MAX_LENGTH: 80     // Maximum arrow length at max wind
        }
    },
    // Weapon bar at bottom-center - horizontal selection bar
    // Positioned to the left of the fire button
    WEAPON_BAR: {
        // Fire button is at X=1070 (center), width 180, so left edge is at 980
        // Add 20px gap between weapon bar and fire button
        RIGHT_EDGE: CANVAS.DESIGN_WIDTH - 130 - 90 - 20,  // 960 (left of fire button)
        Y: CANVAS.DESIGN_HEIGHT - 75,                      // Aligned with fire button
        HEIGHT: 70,                                         // Same height as fire button
        WIDTH: 580,                                         // Wide enough for 6 slots + arrows
        ARROW_WIDTH: 40,                                   // Navigation arrow width
        SLOT_SIZE: 72,                                     // Individual weapon slot size
        SLOT_GAP: 8,                                       // Gap between slots
        PADDING: 10,
        BORDER_RADIUS: 12,
        VISIBLE_SLOTS: 6                                   // Number of visible weapon slots
    }
};

// =============================================================================
// HUD STATE
// =============================================================================

/**
 * Current player money (managed externally, passed to render functions).
 * @type {number}
 */
let displayMoney = 0;

/**
 * Current turn state (whose turn it is).
 * @type {'player' | 'enemy' | null}
 */
let currentTurn = null;

/**
 * Animation time for pulsing effects.
 * @type {number}
 */
let animationTime = 0;

// =============================================================================
// WEAPON BAR STATE
// =============================================================================

/**
 * Current scroll offset for weapon bar (index of first visible weapon).
 * @type {number}
 */
let weaponBarScrollIndex = 0;

/**
 * Whether left arrow is being pressed (touch feedback).
 * @type {boolean}
 */
let weaponBarLeftPressed = false;

/**
 * Whether right arrow is being pressed (touch feedback).
 * @type {boolean}
 */
let weaponBarRightPressed = false;

// =============================================================================
// TURN INDICATOR TRANSITION STATE
// =============================================================================

/**
 * Previous turn phase for transition animations.
 * @type {string | null}
 */
let previousPhase = null;

/**
 * Current transition progress (0-1, 1 = fully transitioned).
 * @type {number}
 */
let transitionProgress = 1;

/**
 * Transition duration in seconds.
 * @type {number}
 */
const TRANSITION_DURATION = 0.3;

/**
 * Previous text being faded out during transition.
 * @type {string}
 */
let previousText = '';

/**
 * Previous color being faded out during transition.
 * @type {string}
 */
let previousColor = '';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Draw a rounded rectangle panel with synthwave styling.
 * Supports pressed state for touch feedback.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - X position (left edge for left-aligned, right edge for right-aligned)
 * @param {number} y - Y position
 * @param {number} width - Panel width
 * @param {number} height - Panel height
 * @param {string} borderColor - Border color
 * @param {boolean} [rightAligned=false] - If true, x is the right edge
 * @param {boolean} [isPressed=false] - Whether panel is being pressed (touch feedback)
 */
function drawPanel(ctx, x, y, width, height, borderColor, rightAligned = false, isPressed = false) {
    const drawX = rightAligned ? x - width : x;

    ctx.save();

    // Dark translucent background - brighter when pressed
    ctx.fillStyle = isPressed ? 'rgba(30, 30, 60, 0.95)' : 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(drawX, y, width, height, 8);
    ctx.fill();

    // Inner highlight when pressed
    if (isPressed) {
        ctx.fillStyle = `${borderColor}15`;  // 8% opacity highlight
        ctx.fill();
    }

    // Glowing border - stronger when pressed
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isPressed ? 3 : 2;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = isPressed ? 10 : 4;
    ctx.stroke();

    ctx.restore();

    return drawX;
}

/**
 * Draw the centered game state panel at the top of the screen.
 * This is a container panel for turn indicator, round info, and wind.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} [contentHeight=0] - Additional height for content (auto-expands)
 * @returns {{x: number, y: number, width: number, height: number}} Panel bounds for content placement
 */
function drawGameStatePanel(ctx, contentHeight = 0) {
    const panel = HUD.GAME_STATE_PANEL;
    const height = Math.max(panel.MIN_HEIGHT, panel.MIN_HEIGHT + contentHeight);
    const drawX = panel.X - panel.WIDTH / 2;  // Center horizontally

    ctx.save();

    // Dark translucent background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(drawX, panel.Y, panel.WIDTH, height, panel.BORDER_RADIUS);
    ctx.fill();

    // Cyan glowing border (synthwave aesthetic)
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Subtle inner glow effect
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `${COLORS.NEON_CYAN}40`;  // 25% opacity
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(drawX + 2, panel.Y + 2, panel.WIDTH - 4, height - 4, panel.BORDER_RADIUS - 2);
    ctx.stroke();

    ctx.restore();

    // Return bounds for content placement
    return {
        x: drawX,
        y: panel.Y,
        width: panel.WIDTH,
        height: height,
        innerX: drawX + panel.PADDING,
        innerY: panel.Y + panel.PADDING,
        innerWidth: panel.WIDTH - panel.PADDING * 2,
        innerHeight: height - panel.PADDING * 2
    };
}

/**
 * Render the game state panel container with turn indicator.
 * Contains: turn indicator (large, glowing text).
 * Future children: round/difficulty, wind.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {string} [turnPhase='player_aim'] - Current turn phase
 * @param {string} [shooter='player'] - Who fired ('player' or 'ai')
 */
export function renderGameStatePanel(ctx, turnPhase = null, shooter = 'player', currentRound = 1, difficulty = 'medium') {
    if (!ctx) return;

    // Draw the panel container and get bounds for content placement
    const bounds = drawGameStatePanel(ctx);

    // Render turn indicator inside the panel
    renderTurnIndicatorInPanel(ctx, bounds, turnPhase, shooter, currentRound, difficulty);
}

/**
 * Render the turn indicator inside the game state panel.
 * Shows "YOUR TURN" or "ENEMY TURN" with appropriate glow effects.
 * Also renders the wind indicator bar below round/difficulty.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} bounds - Panel bounds from drawGameStatePanel
 * @param {string} turnPhase - Current turn phase
 * @param {string} shooter - Who fired ('player' or 'ai')
 * @param {number} currentRound - Current round number
 * @param {string} difficulty - Difficulty level
 */
function renderTurnIndicatorInPanel(ctx, bounds, turnPhase, shooter, currentRound = 1, difficulty = 'medium') {
    // Determine text and color based on turn phase
    let text = '';
    let glowColor = COLORS.NEON_CYAN;

    // Map phases to display text and colors
    if (turnPhase === TURN_PHASES.PLAYER_AIM || turnPhase === TURN_PHASES.PLAYER_FIRE) {
        text = 'YOUR TURN';
        glowColor = COLORS.NEON_CYAN;
    } else if (turnPhase === TURN_PHASES.AI_AIM || turnPhase === TURN_PHASES.AI_FIRE) {
        text = 'ENEMY TURN';
        glowColor = COLORS.NEON_PINK;
    } else if (turnPhase === TURN_PHASES.PROJECTILE_FLIGHT) {
        // During projectile flight, show based on who fired
        if (shooter === 'player') {
            text = 'YOUR TURN';
            glowColor = COLORS.NEON_CYAN;
        } else {
            text = 'ENEMY TURN';
            glowColor = COLORS.NEON_PINK;
        }
    } else {
        // Default to player turn if no phase specified
        text = 'YOUR TURN';
        glowColor = COLORS.NEON_CYAN;
    }

    if (!text) return;

    ctx.save();

    // Calculate center position in panel
    const centerX = bounds.x + bounds.width / 2;
    // Position turn indicator near the top of the panel
    const turnY = bounds.y + 24;

    // Pulsing glow effect
    const pulse = Math.sin(animationTime * 3) * 0.2 + 0.8;

    // Large, prominent font for turn indicator
    ctx.font = `bold 24px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Multi-layer glow effect for synthwave aesthetic
    // Outer glow (larger, more diffuse)
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20 * pulse;
    ctx.fillStyle = glowColor;
    ctx.fillText(text, centerX, turnY);

    // Middle glow layer
    ctx.shadowBlur = 10 * pulse;
    ctx.fillText(text, centerX, turnY);

    // Inner bright text
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, centerX, turnY);

    // Render round and difficulty info below turn indicator
    const roundY = turnY + 20; // Position below turn text
    const roundText = `ROUND ${currentRound} | ${difficulty.toUpperCase()}`;

    // Smaller font for round/difficulty
    ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle glow for round info (less intense than turn indicator)
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 4;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText(roundText, centerX, roundY);

    ctx.restore();

    // Render wind indicator bar below round/difficulty
    renderWindBarInPanel(ctx, bounds, roundY);
}

/**
 * Render the wind indicator bar inside the game state panel.
 * Shows a horizontal bar with directional arrow and numerical value.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} bounds - Panel bounds from drawGameStatePanel
 * @param {number} roundY - Y position of the round text (to position wind bar below)
 */
function renderWindBarInPanel(ctx, bounds, roundY) {
    const windBarConfig = HUD.GAME_STATE_PANEL.WIND_BAR;
    const currentWind = Wind.getWind();
    const normalizedStrength = Wind.getNormalizedStrength();

    // Calculate wind bar dimensions and position
    const barWidth = bounds.width - HUD.GAME_STATE_PANEL.PADDING * 4; // Leave padding on sides
    const barHeight = windBarConfig.HEIGHT;
    const barX = bounds.x + (bounds.width - barWidth) / 2;
    const barY = roundY + windBarConfig.MARGIN_TOP + 6; // Position below round text

    ctx.save();

    // ==========================================================================
    // WIND BAR BACKGROUND
    // ==========================================================================

    // Draw bar background with rounded corners
    ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Draw bar border
    ctx.strokeStyle = 'rgba(100, 100, 140, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ==========================================================================
    // WIND DIRECTION ARROW INSIDE BAR
    // ==========================================================================

    const barCenterX = barX + barWidth / 2;
    const barCenterY = barY + barHeight / 2;

    if (Math.abs(currentWind) < 0.5) {
        // Zero/calm wind: Draw a centered double-arrow or dash indicator
        renderCalmWindIndicator(ctx, barCenterX, barCenterY, barHeight);
    } else {
        // Non-zero wind: Draw directional arrow
        const isRightWind = currentWind > 0;
        const arrowLength = windBarConfig.ARROW_MIN_LENGTH +
            normalizedStrength * (windBarConfig.ARROW_MAX_LENGTH - windBarConfig.ARROW_MIN_LENGTH);

        // Determine arrow color based on direction (cyan for left, pink for right)
        const arrowColor = isRightWind ? COLORS.NEON_PINK : COLORS.NEON_CYAN;

        renderWindArrowInBar(ctx, barCenterX, barCenterY, arrowLength, barHeight - 6, isRightWind, arrowColor);
    }

    ctx.restore();

    // ==========================================================================
    // WIND NUMERICAL VALUE BELOW BAR
    // ==========================================================================

    const windLabelY = barY + barHeight + 12; // Position below the bar
    const windValue = Math.abs(Math.round(currentWind));

    ctx.save();

    ctx.font = `bold 11px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Color based on wind presence
    if (Math.abs(currentWind) < 0.5) {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText('WIND 0', bounds.x + bounds.width / 2, windLabelY);
    } else {
        // Add subtle glow for non-zero wind
        const labelColor = currentWind > 0 ? COLORS.NEON_PINK : COLORS.NEON_CYAN;
        ctx.shadowColor = labelColor;
        ctx.shadowBlur = 4;
        ctx.fillStyle = COLORS.TEXT_LIGHT;
        ctx.fillText(`WIND ${windValue}`, bounds.x + bounds.width / 2, windLabelY);
    }

    ctx.restore();
}

/**
 * Render a calm wind indicator (centered double-arrow or dash).
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} centerX - Center X of the indicator
 * @param {number} centerY - Center Y of the indicator
 * @param {number} barHeight - Height of the containing bar
 */
function renderCalmWindIndicator(ctx, centerX, centerY, barHeight) {
    ctx.save();

    // Draw a simple centered horizontal line to indicate calm
    const lineWidth = 30;
    const lineHeight = 2;

    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillRect(centerX - lineWidth / 2, centerY - lineHeight / 2, lineWidth, lineHeight);

    // Add small arrows at both ends pointing outward to indicate "no wind"
    const arrowSize = 5;
    ctx.beginPath();
    // Left arrow (pointing left)
    ctx.moveTo(centerX - lineWidth / 2, centerY);
    ctx.lineTo(centerX - lineWidth / 2 + arrowSize, centerY - arrowSize);
    ctx.lineTo(centerX - lineWidth / 2 + arrowSize, centerY + arrowSize);
    ctx.closePath();
    ctx.fill();

    // Right arrow (pointing right)
    ctx.beginPath();
    ctx.moveTo(centerX + lineWidth / 2, centerY);
    ctx.lineTo(centerX + lineWidth / 2 - arrowSize, centerY - arrowSize);
    ctx.lineTo(centerX + lineWidth / 2 - arrowSize, centerY + arrowSize);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

/**
 * Render a directional wind arrow inside the bar.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} centerX - Center X of the bar
 * @param {number} centerY - Center Y of the bar
 * @param {number} arrowLength - Length of the arrow (scales with wind strength)
 * @param {number} maxHeight - Maximum height for the arrow
 * @param {boolean} pointRight - True if arrow points right
 * @param {string} color - Arrow color
 */
function renderWindArrowInBar(ctx, centerX, centerY, arrowLength, maxHeight, pointRight, color) {
    ctx.save();

    // Apply glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;

    const arrowHeight = Math.min(maxHeight, 12);
    const headWidth = Math.min(arrowLength * 0.35, 12);
    const shaftHeight = arrowHeight * 0.4;

    // Calculate positions based on direction
    const direction = pointRight ? 1 : -1;
    const startX = centerX - direction * (arrowLength / 2);
    const endX = centerX + direction * (arrowLength / 2);
    const shaftEndX = endX - direction * headWidth;

    ctx.beginPath();

    // Draw arrow shape
    // Start at shaft back-top
    ctx.moveTo(startX, centerY - shaftHeight / 2);

    // Shaft top edge
    ctx.lineTo(shaftEndX, centerY - shaftHeight / 2);

    // Arrow head top
    ctx.lineTo(shaftEndX, centerY - arrowHeight / 2);

    // Arrow point
    ctx.lineTo(endX, centerY);

    // Arrow head bottom
    ctx.lineTo(shaftEndX, centerY + arrowHeight / 2);

    // Shaft bottom edge
    ctx.lineTo(shaftEndX, centerY + shaftHeight / 2);

    // Shaft back-bottom
    ctx.lineTo(startX, centerY + shaftHeight / 2);

    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

/**
 * Render consolidated player info panel at top-left.
 * Contains: health bar, currency, and placeholder for angle/power.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} playerTank - Player tank object with health, angle, power
 * @param {number} money - Player's current money
 * @param {boolean} [isPlayerTurn=true] - Whether it's currently player's turn
 */
export function renderPlayerInfoPanel(ctx, playerTank, money, isPlayerTurn = true) {
    if (!ctx) return;

    const panel = HUD.PLAYER_INFO_PANEL;
    const healthBarHeight = panel.HEALTH_BAR_HEIGHT;

    // Calculate panel height based on content
    // Section 1: Health bar (label + bar)
    // Section 2: Currency
    // Section 3: Angle/Power placeholder (compact)
    const labelHeight = 16;
    const healthSection = labelHeight + healthBarHeight + 4;
    const currencySection = 26;
    const aimingSection = 50; // Two-column compact aiming data
    const totalHeight = panel.PADDING * 2 + healthSection + panel.SECTION_GAP +
                        currencySection + panel.SECTION_GAP + aimingSection;

    ctx.save();

    // Draw panel background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(panel.X, panel.Y, panel.WIDTH, totalHeight, panel.BORDER_RADIUS);
    ctx.fill();

    // Glowing border - cyan for player
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Subtle inner glow
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `${COLORS.NEON_CYAN}30`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panel.X + 2, panel.Y + 2, panel.WIDTH - 4, totalHeight - 4, panel.BORDER_RADIUS - 2);
    ctx.stroke();

    ctx.restore();

    // =========================================================================
    // SECTION 1: HEALTH BAR
    // =========================================================================
    let currentY = panel.Y + panel.PADDING;
    const contentX = panel.X + panel.PADDING;
    const contentWidth = panel.WIDTH - panel.PADDING * 2;

    const playerPercent = playerTank ? (playerTank.health / TANK.MAX_HEALTH) * 100 : 100;

    ctx.save();

    // Health label and percentage
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PLAYER', contentX, currentY);

    ctx.textAlign = 'right';
    ctx.fillStyle = playerPercent > 30 ? COLORS.TEXT_LIGHT : COLORS.NEON_PINK;
    ctx.fillText(`${Math.round(playerPercent)}%`, panel.X + panel.WIDTH - panel.PADDING, currentY);

    ctx.restore();

    currentY += labelHeight;

    // Health bar
    const barWidth = contentWidth;
    const fillWidth = (playerPercent / 100) * barWidth;

    ctx.save();

    // Bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(contentX, currentY, barWidth, healthBarHeight, 3);
    ctx.fill();

    // Bar border
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 1;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 2;
    ctx.stroke();

    // Health fill
    if (fillWidth > 0) {
        const gradient = ctx.createLinearGradient(contentX, currentY, contentX + fillWidth, currentY);
        gradient.addColorStop(0, COLORS.NEON_CYAN);
        gradient.addColorStop(1, adjustColorBrightness(COLORS.NEON_CYAN, -40));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(contentX + 1, currentY + 1, Math.max(0, fillWidth - 2), healthBarHeight - 2, 2);
        ctx.fill();
    }

    ctx.restore();

    currentY += healthBarHeight + 4;

    // =========================================================================
    // SECTION DIVIDER 1
    // =========================================================================
    currentY += panel.SECTION_GAP / 2;

    ctx.save();
    ctx.strokeStyle = `${COLORS.NEON_CYAN}40`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX, currentY);
    ctx.lineTo(contentX + contentWidth, currentY);
    ctx.stroke();
    ctx.restore();

    currentY += panel.SECTION_GAP / 2;

    // =========================================================================
    // SECTION 2: CURRENCY
    // =========================================================================
    ctx.save();

    // Dollar sign with glow
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 4;
    ctx.fillText('$', contentX, currentY);

    // Money amount
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.textAlign = 'right';
    const moneyValue = money !== undefined ? money : 0;
    ctx.fillText(moneyValue.toLocaleString(), panel.X + panel.WIDTH - panel.PADDING, currentY);

    ctx.restore();

    currentY += currencySection;

    // =========================================================================
    // SECTION DIVIDER 2
    // =========================================================================
    currentY += panel.SECTION_GAP / 2;

    ctx.save();
    ctx.strokeStyle = `${COLORS.NEON_CYAN}40`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX, currentY);
    ctx.lineTo(contentX + contentWidth, currentY);
    ctx.stroke();
    ctx.restore();

    currentY += panel.SECTION_GAP / 2;

    // =========================================================================
    // SECTION 3: ANGLE/POWER PLACEHOLDER
    // =========================================================================
    // This will be fully implemented in separate issue scorched-earth-4nh.8
    const halfWidth = (contentWidth - panel.SECTION_GAP) / 2;
    const angleX = contentX;
    const powerX = contentX + halfWidth + panel.SECTION_GAP;

    ctx.save();

    // Labels
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ANGLE', angleX + halfWidth / 2, currentY);
    ctx.fillText('POWER', powerX + halfWidth / 2, currentY);

    currentY += 14;

    // Values
    const angle = playerTank ? Math.round(playerTank.angle) : 45;
    const power = playerTank ? Math.round(playerTank.power) : 50;

    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = isPlayerTurn ? COLORS.NEON_CYAN : COLORS.TEXT_MUTED;
    ctx.fillText(`${angle}°`, angleX + halfWidth / 2, currentY);

    ctx.fillStyle = isPlayerTurn ? COLORS.NEON_PINK : COLORS.TEXT_MUTED;
    ctx.fillText(`${power}%`, powerX + halfWidth / 2, currentY);

    ctx.restore();
}

/**
 * Draw a health bar with gradient fill.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Bar width
 * @param {number} height - Bar height
 * @param {number} percent - Health percentage (0-100)
 * @param {string} color - Primary color for the bar
 * @param {string} label - Label text (e.g., "PLAYER", "ENEMY")
 */
function drawHealthBar(ctx, x, y, width, height, percent, color, label) {
    const fillWidth = (percent / 100) * width;

    ctx.save();

    // Background (empty bar)
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, HUD.HEALTH_BAR.BORDER_RADIUS);
    ctx.fill();

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.stroke();

    // Health fill with gradient
    if (fillWidth > 0) {
        const gradient = ctx.createLinearGradient(x, y, x + fillWidth, y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColorBrightness(color, -30));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, Math.max(0, fillWidth - 4), height - 4, 2);
        ctx.fill();
    }

    // Label text
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent';
    ctx.fillText(label, x, y - 6);

    // Health percentage
    ctx.textAlign = 'right';
    ctx.fillStyle = percent > 30 ? COLORS.TEXT_LIGHT : COLORS.NEON_PINK;
    ctx.fillText(`${Math.round(percent)}%`, x + width, y - 6);

    ctx.restore();
}

/**
 * Adjust a hex color's brightness.
 * @param {string} color - Hex color (e.g., "#ff2a6d")
 * @param {number} amount - Amount to adjust (-255 to 255)
 * @returns {string} Adjusted hex color
 */
function adjustColorBrightness(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// =============================================================================
// HEALTH BAR RENDERING
// =============================================================================

/**
 * Render health bars for both tanks.
 * Player health is on the left, enemy health is on the right.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} playerTank - Player tank
 * @param {import('./tank.js').Tank} enemyTank - Enemy tank
 */
export function renderHealthBars(ctx, playerTank, enemyTank) {
    if (!ctx) return;

    const barWidth = HUD.HEALTH_BAR.WIDTH;
    const barHeight = HUD.HEALTH_BAR.HEIGHT;
    const padding = HUD.HEALTH_BAR.PADDING;
    const y = HUD.HEALTH_BAR.Y;

    // Player health bar (left side)
    if (playerTank) {
        const playerPercent = (playerTank.health / TANK.MAX_HEALTH) * 100;
        drawHealthBar(
            ctx,
            padding,
            y + 10,  // Add offset for label
            barWidth,
            barHeight,
            playerPercent,
            COLORS.PLAYER_1,
            'PLAYER'
        );
    }

    // Enemy health bar (right side)
    if (enemyTank) {
        const enemyPercent = (enemyTank.health / TANK.MAX_HEALTH) * 100;
        drawHealthBar(
            ctx,
            CANVAS.DESIGN_WIDTH - padding - barWidth,
            y + 10,
            barWidth,
            barHeight,
            enemyPercent,
            COLORS.PLAYER_2,
            'ENEMY'
        );
    }
}

/**
 * Render only the enemy health bar at top-right.
 * Used when player info is in the consolidated panel.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} enemyTank - Enemy tank
 */
export function renderEnemyHealthBar(ctx, enemyTank) {
    if (!ctx || !enemyTank) return;

    const barWidth = HUD.HEALTH_BAR.WIDTH;
    const barHeight = HUD.HEALTH_BAR.HEIGHT;
    const padding = HUD.HEALTH_BAR.PADDING;
    const y = HUD.HEALTH_BAR.Y;

    const enemyPercent = (enemyTank.health / TANK.MAX_HEALTH) * 100;
    drawHealthBar(
        ctx,
        CANVAS.DESIGN_WIDTH - padding - barWidth,
        y + 10,
        barWidth,
        barHeight,
        enemyPercent,
        COLORS.PLAYER_2,
        'ENEMY'
    );
}

// =============================================================================
// ANGLE & POWER DISPLAY
// =============================================================================

/**
 * Render the aiming panel showing current angle and power.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} playerTank - Player tank
 * @param {boolean} [isPlayerTurn=true] - Whether it's the player's turn
 */
export function renderAimingPanel(ctx, playerTank, isPlayerTurn = true) {
    if (!ctx || !playerTank) return;

    const panel = HUD.AIMING_PANEL;

    // Draw panel background
    const borderColor = isPlayerTurn ? COLORS.NEON_CYAN : COLORS.TEXT_MUTED;
    drawPanel(ctx, panel.X, panel.Y, panel.WIDTH, panel.HEIGHT, borderColor);

    ctx.save();

    const textX = panel.X + panel.PADDING;
    const textWidth = panel.WIDTH - panel.PADDING * 2;

    // Angle display
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ANGLE', textX, panel.Y + 10);

    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(playerTank.angle)}°`, panel.X + panel.WIDTH - panel.PADDING, panel.Y + 8);

    // Power display with bar
    const powerY = panel.Y + 45;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText('POWER', textX, powerY);

    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(playerTank.power)}%`, panel.X + panel.WIDTH - panel.PADDING, powerY - 2);

    ctx.restore();
}

// =============================================================================
// WIND INDICATOR (uses existing Wind module)
// =============================================================================

/**
 * Render wind indicator in the HUD.
 * Delegates to the Wind module's render function.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function renderWindIndicator(ctx) {
    if (!ctx) return;
    // Wind indicator is already positioned via UI constants in wind.js
    Wind.renderWindIndicator(ctx);
}

// =============================================================================
// WEAPON & AMMO DISPLAY
// =============================================================================

/** @type {boolean} Whether the weapon panel is currently pressed (for touch feedback) */
let weaponPanelPressed = false;

/**
 * Render the weapon panel showing current weapon and ammo.
 * Panel is tappable to cycle weapons on touch devices.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} playerTank - Player tank
 */
export function renderWeaponPanel(ctx, playerTank) {
    if (!ctx || !playerTank) return;

    const weapon = WeaponRegistry.getWeapon(playerTank.currentWeapon);
    if (!weapon) return;

    const panel = HUD.WEAPON_PANEL;
    const ammo = playerTank.getAmmo(playerTank.currentWeapon);
    const ammoDisplay = ammo === Infinity ? '∞' : ammo.toString();

    // Determine border color based on weapon type
    let borderColor = COLORS.NEON_CYAN;
    if (weapon.type === 'nuclear') {
        borderColor = COLORS.NEON_ORANGE;
    } else if (weapon.type === 'splitting') {
        borderColor = COLORS.NEON_PURPLE;
    } else if (weapon.type === 'rolling' || weapon.type === 'digging') {
        borderColor = COLORS.NEON_YELLOW;
    }

    // Pressed offset for touch feedback
    const pressOffset = weaponPanelPressed ? 2 : 0;

    // Draw panel background (right-aligned) with touch feedback
    const panelX = drawPanel(ctx, panel.X, panel.Y + pressOffset, panel.WIDTH, panel.HEIGHT, borderColor, true, weaponPanelPressed);

    ctx.save();

    // Weapon name
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(weapon.name, panelX + panel.PADDING, panel.Y + 12 + pressOffset);

    // Ammo count
    ctx.fillStyle = ammo === Infinity ? COLORS.TEXT_MUTED : COLORS.NEON_YELLOW;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillText(`Ammo: ${ammoDisplay}`, panelX + panel.PADDING, panel.Y + 38 + pressOffset);

    // Weapon switch hint - touch-friendly text
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL - 1}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.fillText('TAP TO SWITCH', panel.X - panel.PADDING, panel.Y + 58 + pressOffset);

    ctx.restore();
}

/**
 * Check if a point is inside the weapon panel.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if inside weapon panel
 */
export function isInsideWeaponPanel(x, y) {
    const panel = HUD.WEAPON_PANEL;
    const panelX = panel.X - panel.WIDTH;
    return (
        x >= panelX &&
        x <= panel.X &&
        y >= panel.Y &&
        y <= panel.Y + panel.HEIGHT
    );
}

/**
 * Set weapon panel pressed state for touch feedback.
 * @param {boolean} pressed - Whether the panel is pressed
 */
export function setWeaponPanelPressed(pressed) {
    weaponPanelPressed = pressed;
}

// =============================================================================
// WEAPON BAR (Bottom-center weapon selection)
// =============================================================================

/**
 * Render the weapon bar container at bottom-center of the screen.
 * Shows navigation arrows and weapon slot placeholders.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} playerTank - Player tank (for current weapon)
 * @param {number} [totalWeapons=11] - Total number of weapons available
 */
export function renderWeaponBar(ctx, playerTank, totalWeapons = 11) {
    if (!ctx) return;

    const bar = HUD.WEAPON_BAR;
    const drawX = bar.RIGHT_EDGE - bar.WIDTH;
    const drawY = bar.Y - bar.HEIGHT / 2;

    ctx.save();

    // ==========================================================================
    // MAIN CONTAINER BACKGROUND
    // ==========================================================================

    // Dark translucent background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, bar.WIDTH, bar.HEIGHT, bar.BORDER_RADIUS);
    ctx.fill();

    // Cyan glowing border (synthwave aesthetic)
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Subtle inner glow effect
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `${COLORS.NEON_CYAN}40`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(drawX + 2, drawY + 2, bar.WIDTH - 4, bar.HEIGHT - 4, bar.BORDER_RADIUS - 2);
    ctx.stroke();

    ctx.restore();

    // ==========================================================================
    // LEFT NAVIGATION ARROW
    // ==========================================================================
    const leftArrowX = drawX + bar.PADDING;
    const leftArrowY = drawY + bar.PADDING;
    const arrowHeight = bar.HEIGHT - bar.PADDING * 2;
    const canScrollLeft = weaponBarScrollIndex > 0;

    renderWeaponBarArrow(ctx, leftArrowX, leftArrowY, bar.ARROW_WIDTH, arrowHeight,
        'left', canScrollLeft, weaponBarLeftPressed);

    // ==========================================================================
    // RIGHT NAVIGATION ARROW
    // ==========================================================================
    const rightArrowX = drawX + bar.WIDTH - bar.PADDING - bar.ARROW_WIDTH;
    const canScrollRight = weaponBarScrollIndex + bar.VISIBLE_SLOTS < totalWeapons;

    renderWeaponBarArrow(ctx, rightArrowX, leftArrowY, bar.ARROW_WIDTH, arrowHeight,
        'right', canScrollRight, weaponBarRightPressed);

    // ==========================================================================
    // WEAPON SLOT PLACEHOLDERS
    // ==========================================================================
    const slotsStartX = leftArrowX + bar.ARROW_WIDTH + bar.SLOT_GAP;
    const slotsWidth = rightArrowX - slotsStartX - bar.SLOT_GAP;
    const slotSize = (slotsWidth - (bar.VISIBLE_SLOTS - 1) * bar.SLOT_GAP) / bar.VISIBLE_SLOTS;
    const slotY = drawY + (bar.HEIGHT - slotSize) / 2;

    // Get current weapon for highlighting
    const currentWeaponId = playerTank ? playerTank.currentWeapon : 'basic';

    for (let i = 0; i < bar.VISIBLE_SLOTS; i++) {
        const weaponIndex = weaponBarScrollIndex + i;
        if (weaponIndex >= totalWeapons) break;

        const slotX = slotsStartX + i * (slotSize + bar.SLOT_GAP);
        const isSelected = i === 0; // Placeholder: first visible is selected for now

        renderWeaponSlot(ctx, slotX, slotY, slotSize, isSelected, weaponIndex);
    }
}

/**
 * Render a navigation arrow for the weapon bar.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Arrow button width
 * @param {number} height - Arrow button height
 * @param {'left' | 'right'} direction - Arrow direction
 * @param {boolean} enabled - Whether the arrow is enabled (can scroll)
 * @param {boolean} pressed - Whether the arrow is being pressed
 */
function renderWeaponBarArrow(ctx, x, y, width, height, direction, enabled, pressed) {
    ctx.save();

    const color = enabled ? COLORS.NEON_CYAN : COLORS.TEXT_MUTED;
    const pressOffset = pressed && enabled ? 2 : 0;

    // Arrow button background
    ctx.fillStyle = pressed && enabled ? 'rgba(5, 217, 232, 0.2)' : 'rgba(30, 30, 60, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y + pressOffset, width, height - pressOffset * 2, 6);
    ctx.fill();

    // Arrow button border
    ctx.strokeStyle = color;
    ctx.lineWidth = pressed && enabled ? 2 : 1;
    if (enabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = pressed ? 10 : 4;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arrow symbol
    ctx.fillStyle = color;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const arrowSymbol = direction === 'left' ? '<' : '>';
    ctx.fillText(arrowSymbol, x + width / 2, y + height / 2 + pressOffset);

    ctx.restore();
}

/**
 * Render a weapon slot placeholder in the weapon bar.
 * Will eventually show weapon icon and ammo count.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Slot size (width and height are equal)
 * @param {boolean} isSelected - Whether this slot is currently selected
 * @param {number} index - Weapon index (for placeholder differentiation)
 */
function renderWeaponSlot(ctx, x, y, size, isSelected, index) {
    ctx.save();

    const borderColor = isSelected ? COLORS.NEON_CYAN : 'rgba(100, 100, 140, 0.6)';

    // Slot background
    ctx.fillStyle = isSelected ? 'rgba(5, 217, 232, 0.15)' : 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 6);
    ctx.fill();

    // Slot border with glow for selected
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isSelected ? 2 : 1;
    if (isSelected) {
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Placeholder icon (simple shape to indicate weapon slot)
    const iconSize = size * 0.5;
    const iconX = x + (size - iconSize) / 2;
    const iconY = y + (size - iconSize) / 2 - 4; // Offset up for ammo text

    ctx.fillStyle = isSelected ? COLORS.NEON_CYAN : 'rgba(100, 100, 140, 0.8)';

    // Draw different placeholder shapes based on index for visual variety
    ctx.beginPath();
    switch (index % 6) {
        case 0: // Circle (basic shot)
            ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 3, 0, Math.PI * 2);
            break;
        case 1: // Triangle (missile)
            ctx.moveTo(iconX + iconSize / 2, iconY);
            ctx.lineTo(iconX + iconSize, iconY + iconSize);
            ctx.lineTo(iconX, iconY + iconSize);
            ctx.closePath();
            break;
        case 2: // Star (MIRV)
            drawStar(ctx, iconX + iconSize / 2, iconY + iconSize / 2, 5, iconSize / 2.5, iconSize / 5);
            break;
        case 3: // Square with X (nuke)
            ctx.rect(iconX + iconSize * 0.15, iconY + iconSize * 0.15, iconSize * 0.7, iconSize * 0.7);
            break;
        case 4: // Diamond (roller)
            ctx.moveTo(iconX + iconSize / 2, iconY);
            ctx.lineTo(iconX + iconSize, iconY + iconSize / 2);
            ctx.lineTo(iconX + iconSize / 2, iconY + iconSize);
            ctx.lineTo(iconX, iconY + iconSize / 2);
            ctx.closePath();
            break;
        case 5: // Down arrow (digger)
            ctx.moveTo(iconX + iconSize / 2, iconY + iconSize);
            ctx.lineTo(iconX + iconSize, iconY);
            ctx.lineTo(iconX + iconSize * 0.65, iconY);
            ctx.lineTo(iconX + iconSize * 0.65, iconY - iconSize * 0.3);
            ctx.lineTo(iconX + iconSize * 0.35, iconY - iconSize * 0.3);
            ctx.lineTo(iconX + iconSize * 0.35, iconY);
            ctx.lineTo(iconX, iconY);
            ctx.closePath();
            break;
    }
    ctx.fill();

    // Placeholder ammo count
    ctx.fillStyle = isSelected ? COLORS.NEON_YELLOW : COLORS.TEXT_MUTED;
    ctx.font = `bold ${UI.FONT_SIZE_SMALL - 2}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`x${index === 0 ? '∞' : (10 - index)}`, x + size / 2, y + size - 2);

    ctx.restore();
}

/**
 * Draw a star shape.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} spikes - Number of spikes
 * @param {number} outerRadius - Outer radius
 * @param {number} innerRadius - Inner radius
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

/**
 * Check if a point is inside the weapon bar left arrow.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if inside left arrow
 */
export function isInsideWeaponBarLeftArrow(x, y) {
    const bar = HUD.WEAPON_BAR;
    const drawX = bar.RIGHT_EDGE - bar.WIDTH;
    const drawY = bar.Y - bar.HEIGHT / 2;
    const arrowX = drawX + bar.PADDING;
    const arrowY = drawY + bar.PADDING;
    const arrowHeight = bar.HEIGHT - bar.PADDING * 2;

    return (
        x >= arrowX &&
        x <= arrowX + bar.ARROW_WIDTH &&
        y >= arrowY &&
        y <= arrowY + arrowHeight
    );
}

/**
 * Check if a point is inside the weapon bar right arrow.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if inside right arrow
 */
export function isInsideWeaponBarRightArrow(x, y) {
    const bar = HUD.WEAPON_BAR;
    const drawX = bar.RIGHT_EDGE - bar.WIDTH;
    const drawY = bar.Y - bar.HEIGHT / 2;
    const arrowX = drawX + bar.WIDTH - bar.PADDING - bar.ARROW_WIDTH;
    const arrowY = drawY + bar.PADDING;
    const arrowHeight = bar.HEIGHT - bar.PADDING * 2;

    return (
        x >= arrowX &&
        x <= arrowX + bar.ARROW_WIDTH &&
        y >= arrowY &&
        y <= arrowY + arrowHeight
    );
}

/**
 * Check if a point is inside the weapon bar container.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if inside weapon bar
 */
export function isInsideWeaponBar(x, y) {
    const bar = HUD.WEAPON_BAR;
    const drawX = bar.RIGHT_EDGE - bar.WIDTH;
    const drawY = bar.Y - bar.HEIGHT / 2;

    return (
        x >= drawX &&
        x <= drawX + bar.WIDTH &&
        y >= drawY &&
        y <= drawY + bar.HEIGHT
    );
}

/**
 * Scroll the weapon bar left (show previous weapons).
 * @returns {boolean} True if scroll occurred
 */
export function scrollWeaponBarLeft() {
    if (weaponBarScrollIndex > 0) {
        weaponBarScrollIndex--;
        return true;
    }
    return false;
}

/**
 * Scroll the weapon bar right (show next weapons).
 * @param {number} [totalWeapons=11] - Total number of weapons
 * @returns {boolean} True if scroll occurred
 */
export function scrollWeaponBarRight(totalWeapons = 11) {
    const bar = HUD.WEAPON_BAR;
    if (weaponBarScrollIndex + bar.VISIBLE_SLOTS < totalWeapons) {
        weaponBarScrollIndex++;
        return true;
    }
    return false;
}

/**
 * Set the left arrow pressed state for touch feedback.
 * @param {boolean} pressed - Whether the arrow is pressed
 */
export function setWeaponBarLeftPressed(pressed) {
    weaponBarLeftPressed = pressed;
}

/**
 * Set the right arrow pressed state for touch feedback.
 * @param {boolean} pressed - Whether the arrow is pressed
 */
export function setWeaponBarRightPressed(pressed) {
    weaponBarRightPressed = pressed;
}

/**
 * Get the current weapon bar scroll index.
 * @returns {number} Current scroll index
 */
export function getWeaponBarScrollIndex() {
    return weaponBarScrollIndex;
}

/**
 * Reset the weapon bar scroll to the beginning.
 */
export function resetWeaponBarScroll() {
    weaponBarScrollIndex = 0;
}

/**
 * Get the weapon bar layout for external positioning.
 * @returns {Object} Weapon bar layout constants
 */
export function getWeaponBarLayout() {
    return { ...HUD.WEAPON_BAR };
}

// =============================================================================
// MONEY DISPLAY
// =============================================================================

/**
 * Render the money display panel.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} money - Current player money
 */
export function renderMoneyPanel(ctx, money) {
    if (!ctx) return;

    const panel = HUD.MONEY_PANEL;

    // Draw panel background (right-aligned)
    const panelX = drawPanel(ctx, panel.X, panel.Y, panel.WIDTH, panel.HEIGHT, COLORS.NEON_YELLOW, true);

    ctx.save();

    // Dollar sign icon
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', panelX + panel.PADDING, panel.Y + panel.HEIGHT / 2);

    // Money amount
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.fillText(money.toLocaleString(), panel.X - panel.PADDING, panel.Y + panel.HEIGHT / 2);

    ctx.restore();
}

// =============================================================================
// TURN INDICATOR
// =============================================================================

/**
 * Get indicator text and color for a given turn phase.
 * @param {string} phase - Turn phase from TURN_PHASES
 * @param {string} shooter - Who fired ('player' or 'ai') for projectile flight
 * @returns {{text: string, color: string}} Text and color for indicator
 */
function getIndicatorContent(phase, shooter = 'player') {
    switch (phase) {
        case TURN_PHASES.PLAYER_AIM:
            return { text: 'YOUR TURN', color: COLORS.NEON_CYAN };
        case TURN_PHASES.PLAYER_FIRE:
            return { text: 'FIRING...', color: COLORS.NEON_CYAN };
        case TURN_PHASES.AI_AIM:
            return { text: 'AI THINKING...', color: COLORS.NEON_PINK };
        case TURN_PHASES.AI_FIRE:
            return { text: 'ENEMY FIRING!', color: COLORS.NEON_PINK };
        case TURN_PHASES.PROJECTILE_FLIGHT:
            // Different text based on who fired
            if (shooter === 'player') {
                return { text: 'PROJECTILE IN FLIGHT', color: COLORS.NEON_ORANGE };
            } else {
                return { text: 'INCOMING!', color: COLORS.NEON_ORANGE };
            }
        default:
            return { text: '', color: COLORS.TEXT_MUTED };
    }
}

/**
 * Render the turn indicator showing current game phase.
 * Shows 'YOUR TURN' during player phase, 'AI THINKING...' during AI phase,
 * and 'PROJECTILE IN FLIGHT' during resolution. Uses smooth transitions.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {string} phase - Current turn phase from TURN_PHASES
 * @param {string} [shooter='player'] - Who fired ('player' or 'ai') for flight phase
 */
export function renderTurnIndicatorPhase(ctx, phase, shooter = 'player') {
    if (!ctx || !phase) return;

    const indicator = HUD.TURN_INDICATOR;
    const { text, color } = getIndicatorContent(phase, shooter);

    if (!text) return;

    // Handle phase transitions
    if (phase !== previousPhase) {
        // Starting a new transition
        if (previousPhase) {
            const prevContent = getIndicatorContent(previousPhase, shooter);
            previousText = prevContent.text;
            previousColor = prevContent.color;
        }
        transitionProgress = 0;
        previousPhase = phase;
    }

    // Update transition progress (assumes ~16ms per frame)
    if (transitionProgress < 1) {
        transitionProgress = Math.min(1, transitionProgress + (1 / 60) / TRANSITION_DURATION);
    }

    ctx.save();

    // Pulsing effect for current turn
    const pulse = Math.sin(animationTime * 4) * 0.15 + 0.85;

    // Background pill - wider to fit longer text
    const maxTextWidth = 220;
    const pillWidth = Math.max(indicator.WIDTH, maxTextWidth);
    const pillHeight = indicator.HEIGHT;
    const pillX = indicator.X - pillWidth / 2;

    // Draw background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(pillX, indicator.Y, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();

    // Interpolate border color during transition
    const borderColor = transitionProgress < 1 && previousColor ?
        lerpColor(previousColor, color, transitionProgress) : color;

    // Glowing border with pulse
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 8 * pulse;
    ctx.stroke();

    // Text rendering with fade transition
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = indicator.Y + pillHeight / 2;

    // During transition, fade out old text and fade in new text
    if (transitionProgress < 1 && previousText) {
        // Fade out previous text
        ctx.fillStyle = previousColor;
        ctx.globalAlpha = (1 - transitionProgress) * pulse;
        ctx.fillText(previousText, indicator.X, textY);
    }

    // Current text with fade in (or full visibility if no transition)
    ctx.fillStyle = color;
    ctx.globalAlpha = (transitionProgress < 1 ? transitionProgress : 1) * pulse;
    ctx.fillText(text, indicator.X, textY);

    ctx.restore();
}

/**
 * Legacy render function for backwards compatibility.
 * Converts turn/isFiring to phase-based rendering.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {'player' | 'enemy'} turn - Current turn
 * @param {boolean} [isFiring=false] - Whether a projectile is in flight
 */
export function renderTurnIndicator(ctx, turn, isFiring = false) {
    // Convert to phase-based call
    let phase;
    let shooter = 'player';

    if (isFiring) {
        phase = TURN_PHASES.PROJECTILE_FLIGHT;
        shooter = turn === 'enemy' ? 'ai' : 'player';
    } else if (turn === 'player') {
        phase = TURN_PHASES.PLAYER_AIM;
    } else if (turn === 'enemy') {
        phase = TURN_PHASES.AI_AIM;
    } else {
        // No turn specified - try to show projectile in flight
        phase = TURN_PHASES.PROJECTILE_FLIGHT;
    }

    renderTurnIndicatorPhase(ctx, phase, shooter);
}

/**
 * Linear interpolate between two hex colors.
 * @param {string} color1 - Start color (hex)
 * @param {string} color2 - End color (hex)
 * @param {number} t - Progress (0-1)
 * @returns {string} Interpolated hex color
 */
function lerpColor(color1, color2, t) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.slice(0, 2), 16);
    const g1 = parseInt(hex1.slice(2, 4), 16);
    const b1 = parseInt(hex1.slice(4, 6), 16);

    const r2 = parseInt(hex2.slice(0, 2), 16);
    const g2 = parseInt(hex2.slice(2, 4), 16);
    const b2 = parseInt(hex2.slice(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// =============================================================================
// MAIN HUD RENDER FUNCTION
// =============================================================================

/**
 * Render the complete in-game HUD.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} state - Game state object
 * @param {import('./tank.js').Tank} state.playerTank - Player tank
 * @param {import('./tank.js').Tank} state.enemyTank - Enemy tank
 * @param {number} state.money - Current player money
 * @param {'player' | 'enemy'} state.turn - Current turn (legacy)
 * @param {boolean} state.isFiring - Whether a projectile is in flight (legacy)
 * @param {boolean} [state.isPlayerTurn=true] - Whether it's the player's aiming turn
 * @param {string} [state.phase] - Turn phase from TURN_PHASES (preferred)
 * @param {string} [state.shooter='player'] - Who fired ('player' or 'ai')
 */
export function renderHUD(ctx, state) {
    if (!ctx || !state) return;

    const {
        playerTank,
        enemyTank,
        money = 0,
        turn = 'player',
        isFiring = false,
        isPlayerTurn = true,
        phase = null,
        shooter = 'player',
        currentRound = 1,
        difficulty = 'medium'
    } = state;

    // Determine the effective phase for rendering
    // If phase is provided, use it; otherwise convert from legacy turn/isFiring
    let effectivePhase = phase;
    let effectiveShooter = shooter;

    if (!effectivePhase) {
        // Convert legacy turn/isFiring to phase
        if (isFiring) {
            effectivePhase = TURN_PHASES.PROJECTILE_FLIGHT;
            effectiveShooter = turn === 'enemy' ? 'ai' : 'player';
        } else if (turn === 'player') {
            effectivePhase = TURN_PHASES.PLAYER_AIM;
        } else if (turn === 'enemy') {
            effectivePhase = TURN_PHASES.AI_AIM;
        } else {
            effectivePhase = TURN_PHASES.PLAYER_AIM;
        }
    }

    // Render game state panel with turn indicator and round/difficulty inside
    renderGameStatePanel(ctx, effectivePhase, effectiveShooter, currentRound, difficulty);

    // Render consolidated player info panel (top-left)
    // Contains: health, currency, angle/power placeholder
    renderPlayerInfoPanel(ctx, playerTank, money, isPlayerTurn);

    // Render enemy health bar separately (top-right)
    renderEnemyHealthBar(ctx, enemyTank);

    // Note: Turn indicator and wind indicator are now rendered inside renderGameStatePanel
    // The legacy renderTurnIndicatorPhase and renderWindIndicator are kept for backwards compatibility
    // but no longer called from renderHUD

    renderWeaponPanel(ctx, playerTank);

    // Render new weapon bar at bottom-center (left of fire button)
    renderWeaponBar(ctx, playerTank);
}

// =============================================================================
// HUD STATE UPDATES
// =============================================================================

/**
 * Update HUD animation time (call once per frame).
 * @param {number} deltaTime - Time since last frame in ms
 */
export function updateHUD(deltaTime) {
    animationTime += deltaTime / 1000;
}

/**
 * Set the current turn for the HUD.
 * @param {'player' | 'enemy' | null} turn - Current turn
 */
export function setCurrentTurn(turn) {
    currentTurn = turn;
}

/**
 * Get HUD layout constants for external positioning.
 * @returns {Object} HUD layout constants
 */
export function getHUDLayout() {
    return { ...HUD };
}
