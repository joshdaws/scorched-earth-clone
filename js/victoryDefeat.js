/**
 * Scorched Earth: Synthwave Edition
 * Victory and Defeat Screens
 *
 * Displays dramatic end-of-round screens when a tank is destroyed.
 * Shows victory/defeat status, money earned, and navigation buttons.
 */

import { CANVAS, COLORS, UI, GAME_STATES } from './constants.js';
import * as Game from './game.js';

// =============================================================================
// SCREEN STATE
// =============================================================================

/**
 * Current screen result ('victory' or 'defeat').
 * @type {'victory' | 'defeat' | null}
 */
let screenResult = null;

/**
 * Money earned this round (shown on screen).
 * @type {number}
 */
let moneyEarned = 0;

/**
 * Total damage dealt this round (optional statistic).
 * @type {number}
 */
let damageDealt = 0;

/**
 * Animation time for pulsing effects.
 * @type {number}
 */
let animationTime = 0;

/**
 * Delay before screen appears (after explosion).
 * @type {number}
 */
let appearDelay = 0;

/**
 * Whether the screen is visible (after delay).
 * @type {boolean}
 */
let isVisible = false;

/**
 * Callback to execute when "Continue to Shop" is clicked.
 * @type {Function|null}
 */
let onContinueCallback = null;

/**
 * Callback to execute when "Quit to Menu" is clicked.
 * @type {Function|null}
 */
let onQuitCallback = null;

// =============================================================================
// BUTTON DEFINITIONS
// =============================================================================

/**
 * Screen buttons configuration.
 * Centered horizontally with consistent spacing.
 */
const buttons = {
    continue: {
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 120,
        width: 280,
        height: 55,
        text: 'CONTINUE TO SHOP',
        color: COLORS.NEON_CYAN
    },
    quit: {
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 195,
        width: 280,
        height: 55,
        text: 'QUIT TO MENU',
        color: COLORS.NEON_PINK
    }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Show the victory screen.
 * @param {number} earned - Money earned this round
 * @param {number} damage - Total damage dealt (optional)
 * @param {number} delay - Delay in ms before screen appears (default 1000ms)
 */
export function showVictory(earned = 0, damage = 0, delay = 1000) {
    screenResult = 'victory';
    moneyEarned = earned;
    damageDealt = damage;
    animationTime = 0;
    appearDelay = delay;
    isVisible = false;

    // Start the delay timer
    setTimeout(() => {
        isVisible = true;
    }, delay);

    console.log(`[VictoryDefeat] Victory screen queued, delay: ${delay}ms`);
}

/**
 * Show the defeat screen.
 * @param {number} earned - Money earned this round (usually less on defeat)
 * @param {number} damage - Total damage dealt (optional)
 * @param {number} delay - Delay in ms before screen appears (default 1000ms)
 */
export function showDefeat(earned = 0, damage = 0, delay = 1000) {
    screenResult = 'defeat';
    moneyEarned = earned;
    damageDealt = damage;
    animationTime = 0;
    appearDelay = delay;
    isVisible = false;

    // Start the delay timer
    setTimeout(() => {
        isVisible = true;
    }, delay);

    console.log(`[VictoryDefeat] Defeat screen queued, delay: ${delay}ms`);
}

/**
 * Hide the victory/defeat screen and reset state.
 */
export function hide() {
    screenResult = null;
    isVisible = false;
    animationTime = 0;
}

/**
 * Register callback for "Continue to Shop" button.
 * @param {Function} callback - Function to call when button is clicked
 */
export function onContinue(callback) {
    onContinueCallback = callback;
}

/**
 * Register callback for "Quit to Menu" button.
 * @param {Function} callback - Function to call when button is clicked
 */
export function onQuit(callback) {
    onQuitCallback = callback;
}

/**
 * Check if the screen is currently visible.
 * @returns {boolean} True if screen is showing
 */
export function isShowing() {
    return screenResult !== null && isVisible;
}

/**
 * Get the current screen result.
 * @returns {'victory' | 'defeat' | null} Current result or null if hidden
 */
export function getResult() {
    return screenResult;
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Check if a point is inside a button.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} button - Button definition
 * @returns {boolean} True if point is inside button
 */
function isInsideButton(x, y, button) {
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    return (
        x >= button.x - halfWidth &&
        x <= button.x + halfWidth &&
        y >= button.y - halfHeight &&
        y <= button.y + halfHeight
    );
}

/**
 * Handle click/tap on the victory/defeat screen.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if a button was clicked
 */
export function handleClick(x, y) {
    if (!isVisible || !screenResult) return false;

    // Check continue button
    if (isInsideButton(x, y, buttons.continue)) {
        console.log('[VictoryDefeat] Continue to Shop clicked');
        if (onContinueCallback) {
            onContinueCallback();
        } else {
            // Default behavior: transition to shop
            Game.setState(GAME_STATES.SHOP);
        }
        hide();
        return true;
    }

    // Check quit button
    if (isInsideButton(x, y, buttons.quit)) {
        console.log('[VictoryDefeat] Quit to Menu clicked');
        if (onQuitCallback) {
            onQuitCallback();
        } else {
            // Default behavior: return to menu
            Game.setState(GAME_STATES.MENU);
        }
        hide();
        return true;
    }

    return false;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Draw a neon-styled button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button definition
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderButton(ctx, button, pulseIntensity) {
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    const btnX = button.x - halfWidth;
    const btnY = button.y - halfHeight;

    ctx.save();

    // Button background with rounded corners
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, button.width, button.height, 8);
    ctx.fill();

    // Neon glow effect (pulsing)
    ctx.shadowColor = button.color;
    ctx.shadowBlur = 12 + pulseIntensity * 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Button border
    ctx.strokeStyle = button.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Reset shadow for text
    ctx.shadowBlur = 0;

    // Button text with glow
    ctx.shadowColor = button.color;
    ctx.shadowBlur = 6 + pulseIntensity * 4;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE - 2}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x, button.y);

    ctx.restore();
}

/**
 * Render the victory or defeat screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    if (!screenResult || !isVisible) return;

    // Update animation time
    animationTime += 16; // Approximate 60fps

    // Calculate pulse intensity (0-1, oscillating)
    const pulseIntensity = (Math.sin(animationTime * 0.003) + 1) / 2;

    const isVictory = screenResult === 'victory';
    const mainColor = isVictory ? COLORS.NEON_CYAN : COLORS.NEON_PINK;
    const titleText = isVictory ? 'VICTORY' : 'DEFEAT';

    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.92)';
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Dramatic scanlines effect
    ctx.globalAlpha = 0.03;
    for (let y = 0; y < CANVAS.DESIGN_HEIGHT; y += 4) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, y, CANVAS.DESIGN_WIDTH, 2);
    }
    ctx.globalAlpha = 1;

    // Main title with dramatic glow
    const titleY = CANVAS.DESIGN_HEIGHT / 3 - 40;

    ctx.save();
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 40 + pulseIntensity * 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `bold 80px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = mainColor;
    ctx.fillText(titleText, CANVAS.DESIGN_WIDTH / 2, titleY);

    // Title outline for extra depth
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLORS.TEXT_LIGHT;
    ctx.lineWidth = 2;
    ctx.strokeText(titleText, CANVAS.DESIGN_WIDTH / 2, titleY);
    ctx.restore();

    // Decorative line under title
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const lineWidth = 180;
    ctx.moveTo(CANVAS.DESIGN_WIDTH / 2 - lineWidth, titleY + 55);
    ctx.lineTo(CANVAS.DESIGN_WIDTH / 2 + lineWidth, titleY + 55);
    ctx.stroke();
    ctx.restore();

    // Money earned display
    const moneyY = CANVAS.DESIGN_HEIGHT / 2 - 10;

    ctx.save();
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ROUND EARNINGS', CANVAS.DESIGN_WIDTH / 2, moneyY - 30);

    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 10 + pulseIntensity * 5;
    ctx.font = `bold ${UI.FONT_SIZE_TITLE}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fillText(`$${moneyEarned.toLocaleString()}`, CANVAS.DESIGN_WIDTH / 2, moneyY + 15);
    ctx.restore();

    // Optional: Damage dealt statistic
    if (damageDealt > 0) {
        ctx.save();
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.textAlign = 'center';
        ctx.fillText(`Damage dealt: ${damageDealt}`, CANVAS.DESIGN_WIDTH / 2, moneyY + 55);
        ctx.restore();
    }

    // Render buttons
    renderButton(ctx, buttons.continue, pulseIntensity);
    renderButton(ctx, buttons.quit, pulseIntensity);

    // Neon frame around the screen
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, CANVAS.DESIGN_WIDTH - 60, CANVAS.DESIGN_HEIGHT - 60);

    // Corner accents (same style as main menu)
    const cornerSize = 40;
    const accentColor = isVictory ? COLORS.NEON_PURPLE : COLORS.NEON_ORANGE;
    ctx.strokeStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.lineWidth = 5;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(30, 30 + cornerSize);
    ctx.lineTo(30, 30);
    ctx.lineTo(30 + cornerSize, 30);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH - 30 - cornerSize, 30);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 30, 30);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 30, 30 + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(30, CANVAS.DESIGN_HEIGHT - 30 - cornerSize);
    ctx.lineTo(30, CANVAS.DESIGN_HEIGHT - 30);
    ctx.lineTo(30 + cornerSize, CANVAS.DESIGN_HEIGHT - 30);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH - 30 - cornerSize, CANVAS.DESIGN_HEIGHT - 30);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 30, CANVAS.DESIGN_HEIGHT - 30);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 30, CANVAS.DESIGN_HEIGHT - 30 - cornerSize);
    ctx.stroke();

    ctx.restore();

    // Flavor text at bottom
    ctx.save();
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';

    const flavorText = isVictory
        ? 'Another enemy tank destroyed!'
        : 'Your tank was destroyed...';
    ctx.fillText(flavorText, CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 70);
    ctx.restore();

    ctx.restore();
}

/**
 * Update the screen state (called each frame).
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    if (isVisible) {
        animationTime += deltaTime;
    }
}
