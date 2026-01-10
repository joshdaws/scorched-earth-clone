/**
 * Scorched Earth: Synthwave Edition
 * Game Over Screen
 *
 * Displays the end-of-run screen when the player's tank is destroyed.
 * This is a terminal state - the run has ended and cannot be continued.
 * Implements permadeath for the roguelike survival mode.
 */

import { CANVAS, COLORS, UI, GAME_STATES } from './constants.js';
import * as Game from './game.js';
import { playClickSound } from './sound.js';

// =============================================================================
// SCREEN STATE
// =============================================================================

/**
 * Whether the game over screen is showing.
 * @type {boolean}
 */
let isVisible = false;

/**
 * Whether this was a draw (mutual destruction).
 * @type {boolean}
 */
let wasDraw = false;

/**
 * Money earned in the final round.
 * @type {number}
 */
let roundEarnings = 0;

/**
 * Total damage dealt in the final round.
 * @type {number}
 */
let roundDamage = 0;

/**
 * Number of rounds survived (will be populated by run state later).
 * @type {number}
 */
let roundsSurvived = 0;

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
 * Whether the screen content is visible (after delay).
 * @type {boolean}
 */
let contentVisible = false;

/**
 * Callback to execute when "New Run" is clicked.
 * @type {Function|null}
 */
let onNewRunCallback = null;

/**
 * Callback to execute when "Main Menu" is clicked.
 * @type {Function|null}
 */
let onMainMenuCallback = null;

// =============================================================================
// BUTTON DEFINITIONS
// =============================================================================

/**
 * Screen buttons configuration.
 * Only "New Run" and "Main Menu" - no continue option!
 */
const buttons = {
    newRun: {
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 120,
        width: 280,
        height: 55,
        text: 'NEW RUN',
        color: COLORS.NEON_CYAN
    },
    mainMenu: {
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 195,
        width: 280,
        height: 55,
        text: 'MAIN MENU',
        color: COLORS.NEON_PURPLE
    }
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Show the game over screen.
 * @param {Object} options - Display options
 * @param {number} options.earnings - Money earned in final round
 * @param {number} options.damage - Damage dealt in final round
 * @param {number} options.rounds - Rounds survived (current round number)
 * @param {boolean} options.draw - Whether this was mutual destruction
 * @param {number} options.delay - Delay in ms before screen appears (default 1200ms)
 */
export function show(options = {}) {
    const {
        earnings = 0,
        damage = 0,
        rounds = 1,
        draw = false,
        delay = 1200
    } = options;

    roundEarnings = earnings;
    roundDamage = damage;
    roundsSurvived = rounds;
    wasDraw = draw;
    animationTime = 0;
    appearDelay = delay;
    contentVisible = false;
    isVisible = true;

    // Start the delay timer for content to appear
    setTimeout(() => {
        contentVisible = true;
    }, delay);

    console.log(`[GameOver] Screen queued, delay: ${delay}ms, rounds: ${rounds}, draw: ${draw}`);
}

/**
 * Hide the game over screen and reset state.
 */
export function hide() {
    isVisible = false;
    contentVisible = false;
    animationTime = 0;
    wasDraw = false;
}

/**
 * Register callback for "New Run" button.
 * @param {Function} callback - Function to call when button is clicked
 */
export function onNewRun(callback) {
    onNewRunCallback = callback;
}

/**
 * Register callback for "Main Menu" button.
 * @param {Function} callback - Function to call when button is clicked
 */
export function onMainMenu(callback) {
    onMainMenuCallback = callback;
}

/**
 * Check if the game over screen is currently visible.
 * @returns {boolean} True if screen is showing
 */
export function isShowing() {
    return isVisible && contentVisible;
}

/**
 * Check if the game over screen is active (even if content not yet visible).
 * @returns {boolean} True if screen is active
 */
export function isActive() {
    return isVisible;
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
 * Handle click/tap on the game over screen.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if a button was clicked
 */
export function handleClick(x, y) {
    if (!contentVisible) return false;

    // Check New Run button
    if (isInsideButton(x, y, buttons.newRun)) {
        playClickSound();
        console.log('[GameOver] New Run clicked');
        if (onNewRunCallback) {
            onNewRunCallback();
        }
        // Don't hide here - let the callback handle state transition
        return true;
    }

    // Check Main Menu button
    if (isInsideButton(x, y, buttons.mainMenu)) {
        playClickSound();
        console.log('[GameOver] Main Menu clicked');
        if (onMainMenuCallback) {
            onMainMenuCallback();
        } else {
            // Default behavior: return to menu
            hide();
            Game.setState(GAME_STATES.MENU);
        }
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
 * Render the game over screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    if (!isVisible || !contentVisible) return;

    // Update animation time
    animationTime += 16; // Approximate 60fps

    // Calculate pulse intensity (0-1, oscillating)
    const pulseIntensity = (Math.sin(animationTime * 0.003) + 1) / 2;

    const mainColor = COLORS.NEON_PINK;

    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Dramatic scanlines effect
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < CANVAS.DESIGN_HEIGHT; y += 4) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, y, CANVAS.DESIGN_WIDTH, 2);
    }
    ctx.globalAlpha = 1;

    // Main title with dramatic glow
    const titleY = CANVAS.DESIGN_HEIGHT / 4;

    ctx.save();
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 50 + pulseIntensity * 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `bold 72px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = mainColor;
    ctx.fillText('GAME OVER', CANVAS.DESIGN_WIDTH / 2, titleY);

    // Title outline for extra depth
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLORS.TEXT_LIGHT;
    ctx.lineWidth = 2;
    ctx.strokeText('GAME OVER', CANVAS.DESIGN_WIDTH / 2, titleY);
    ctx.restore();

    // Subtitle for draw condition
    if (wasDraw) {
        ctx.save();
        ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.NEON_ORANGE;
        ctx.textAlign = 'center';
        ctx.shadowColor = COLORS.NEON_ORANGE;
        ctx.shadowBlur = 10;
        ctx.fillText('MUTUAL DESTRUCTION', CANVAS.DESIGN_WIDTH / 2, titleY + 55);
        ctx.restore();
    }

    // Decorative line under title
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const lineWidth = 200;
    const lineY = wasDraw ? titleY + 90 : titleY + 55;
    ctx.moveTo(CANVAS.DESIGN_WIDTH / 2 - lineWidth, lineY);
    ctx.lineTo(CANVAS.DESIGN_WIDTH / 2 + lineWidth, lineY);
    ctx.stroke();
    ctx.restore();

    // Stats section
    const statsY = CANVAS.DESIGN_HEIGHT / 2 - 40;

    // Rounds survived (main stat)
    ctx.save();
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('ROUNDS SURVIVED', CANVAS.DESIGN_WIDTH / 2, statsY - 25);

    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 15 + pulseIntensity * 10;
    ctx.font = `bold 56px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fillText(roundsSurvived.toString(), CANVAS.DESIGN_WIDTH / 2, statsY + 25);
    ctx.restore();

    // Final round stats (smaller)
    ctx.save();
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';

    if (roundDamage > 0) {
        ctx.fillText(`Final Round: ${roundDamage} damage dealt`, CANVAS.DESIGN_WIDTH / 2, statsY + 70);
    }
    ctx.restore();

    // Render buttons
    renderButton(ctx, buttons.newRun, pulseIntensity);
    renderButton(ctx, buttons.mainMenu, pulseIntensity);

    // Neon frame around the screen
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, CANVAS.DESIGN_WIDTH - 60, CANVAS.DESIGN_HEIGHT - 60);

    // Corner accents
    const cornerSize = 40;
    const accentColor = COLORS.NEON_ORANGE;
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
    ctx.fillText('Your tank was destroyed. The run has ended.', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 70);
    ctx.restore();

    ctx.restore();
}

/**
 * Update the screen state (called each frame).
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    if (contentVisible) {
        animationTime += deltaTime;
    }
}
