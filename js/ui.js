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
        MIN_HEIGHT: 50,               // Minimum height (auto-expands with content)
        PADDING: 16,
        BORDER_RADIUS: 12
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
 * Render the game state panel container.
 * Currently renders as an empty styled container.
 * Future children: turn indicator, round/difficulty, wind.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function renderGameStatePanel(ctx) {
    if (!ctx) return;

    // For now, just draw the empty panel container
    // Content will be added in subsequent issues
    drawGameStatePanel(ctx);
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
        shooter = 'player'
    } = state;

    // Render game state panel first (container at top-center)
    renderGameStatePanel(ctx);

    // Render all HUD elements
    renderHealthBars(ctx, playerTank, enemyTank);

    // Use phase-based indicator if phase is provided, otherwise fall back to legacy
    if (phase) {
        renderTurnIndicatorPhase(ctx, phase, shooter);
    } else {
        renderTurnIndicator(ctx, turn, isFiring);
    }

    renderWindIndicator(ctx);
    renderAimingPanel(ctx, playerTank, isPlayerTurn);
    renderWeaponPanel(ctx, playerTank);
    renderMoneyPanel(ctx, money);
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
