/**
 * Scorched Earth: Synthwave Edition
 * Round Transition Screen
 *
 * Displays a brief transition screen after winning a round, showing round stats
 * and previewing the next round's difficulty. This screen appears between
 * round victory and the shop.
 */

import { CANVAS, COLORS, UI } from './constants.js';
import { playClickSound } from './sound.js';
import * as AI from './ai.js';

// =============================================================================
// SCREEN STATE
// =============================================================================

/**
 * Whether the round transition screen is showing.
 * @type {boolean}
 */
let isVisible = false;

/**
 * The round number that was just completed.
 * @type {number}
 */
let completedRound = 0;

/**
 * Damage dealt in the completed round.
 * @type {number}
 */
let roundDamage = 0;

/**
 * Money earned in the completed round.
 * @type {number}
 */
let roundMoney = 0;

/**
 * Animation time for pulsing and glow effects.
 * @type {number}
 */
let animationTime = 0;

/**
 * Delay before screen content appears (for dramatic effect).
 * @type {number}
 */
let appearDelay = 0;

/**
 * Whether the screen content is visible (after delay).
 * @type {boolean}
 */
let contentVisible = false;

/**
 * Callback to execute when "Continue to Shop" is clicked.
 * @type {Function|null}
 */
let onContinueCallback = null;

// =============================================================================
// BUTTON DEFINITION
// =============================================================================

/**
 * Continue button configuration.
 * Centered at bottom of screen.
 */
const continueButton = {
    x: CANVAS.DESIGN_WIDTH / 2,
    y: CANVAS.DESIGN_HEIGHT - 150,
    width: 300,
    height: 55,
    text: 'CONTINUE TO SHOP',
    color: COLORS.NEON_CYAN
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Show the round transition screen.
 * @param {Object} options - Display options
 * @param {number} options.round - The round number that was completed
 * @param {number} options.damage - Damage dealt this round
 * @param {number} options.money - Money earned this round
 * @param {number} [options.delay=500] - Delay in ms before screen appears
 */
export function show(options = {}) {
    const {
        round = 1,
        damage = 0,
        money = 0,
        delay = 500
    } = options;

    completedRound = round;
    roundDamage = damage;
    roundMoney = money;
    animationTime = 0;
    appearDelay = delay;
    contentVisible = false;
    isVisible = true;

    // Start the delay timer for content to appear
    setTimeout(() => {
        contentVisible = true;
    }, delay);

    console.log(`[RoundTransition] Screen queued, delay: ${delay}ms, round: ${round}`);
}

/**
 * Hide the round transition screen and reset state.
 */
export function hide() {
    isVisible = false;
    contentVisible = false;
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
 * Check if the round transition screen is currently visible.
 * @returns {boolean} True if screen is showing
 */
export function isShowing() {
    return isVisible && contentVisible;
}

/**
 * Check if the screen is active (even if content not yet visible).
 * @returns {boolean} True if screen is active
 */
export function isActive() {
    return isVisible;
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Check if a point is inside the continue button.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if point is inside button
 */
function isInsideButton(x, y) {
    const halfWidth = continueButton.width / 2;
    const halfHeight = continueButton.height / 2;
    return (
        x >= continueButton.x - halfWidth &&
        x <= continueButton.x + halfWidth &&
        y >= continueButton.y - halfHeight &&
        y <= continueButton.y + halfHeight
    );
}

/**
 * Handle click/tap on the round transition screen.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if a button was clicked
 */
export function handleClick(x, y) {
    if (!contentVisible) return false;

    if (isInsideButton(x, y)) {
        playClickSound();
        console.log('[RoundTransition] Continue to Shop clicked');
        if (onContinueCallback) {
            onContinueCallback();
        }
        return true;
    }

    return false;
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Get the difficulty name for display based on round number.
 * @param {number} roundNumber - The round number
 * @returns {string} Difficulty name (EASY, MEDIUM, HARD, HARD+)
 */
function getDifficultyName(roundNumber) {
    const difficulty = AI.getAIDifficulty(roundNumber);
    // Convert from internal name to display name
    switch (difficulty) {
        case 'easy': return 'EASY';
        case 'medium': return 'MEDIUM';
        case 'hard': return 'HARD';
        case 'hard+': return 'HARD+';
        default: return difficulty.toUpperCase();
    }
}

/**
 * Get the color for a difficulty level.
 * @param {string} difficulty - Difficulty name
 * @returns {string} Color for the difficulty
 */
function getDifficultyColor(difficulty) {
    switch (difficulty) {
        case 'EASY': return COLORS.NEON_CYAN;
        case 'MEDIUM': return COLORS.NEON_YELLOW;
        case 'HARD': return COLORS.NEON_ORANGE;
        case 'HARD+': return COLORS.NEON_PINK;
        default: return COLORS.TEXT_LIGHT;
    }
}

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

// =============================================================================
// MAIN RENDER
// =============================================================================

/**
 * Render the round transition screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    if (!isVisible || !contentVisible) return;

    // Calculate pulse intensity (0-1, oscillating)
    const pulseIntensity = (Math.sin(animationTime * 0.003) + 1) / 2;

    // Faster pulse for the title glow
    const titlePulse = (Math.sin(animationTime * 0.006) + 1) / 2;

    const mainColor = COLORS.NEON_CYAN;
    const nextRound = completedRound + 1;
    const nextDifficulty = getDifficultyName(nextRound);
    const difficultyColor = getDifficultyColor(nextDifficulty);

    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Subtle scanlines effect
    ctx.globalAlpha = 0.02;
    for (let y = 0; y < CANVAS.DESIGN_HEIGHT; y += 4) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, y, CANVAS.DESIGN_WIDTH, 2);
    }
    ctx.globalAlpha = 1;

    // =========================================================================
    // TITLE: "ROUND X COMPLETE" with glow animation
    // =========================================================================
    const titleY = 160;

    ctx.save();
    // Multi-layer glow effect for dramatic "ROUND COMPLETE" text
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 30 + titlePulse * 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `bold 52px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = mainColor;
    ctx.fillText(`ROUND ${completedRound} COMPLETE`, CANVAS.DESIGN_WIDTH / 2, titleY);

    // Second layer for extra glow
    ctx.shadowBlur = 15 + titlePulse * 10;
    ctx.fillText(`ROUND ${completedRound} COMPLETE`, CANVAS.DESIGN_WIDTH / 2, titleY);

    // Title outline for depth
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLORS.TEXT_LIGHT;
    ctx.lineWidth = 1;
    ctx.strokeText(`ROUND ${completedRound} COMPLETE`, CANVAS.DESIGN_WIDTH / 2, titleY);
    ctx.restore();

    // =========================================================================
    // ROUND STATS
    // =========================================================================
    const statsY = titleY + 90;
    const statsSpacing = 36;

    ctx.save();
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Damage dealt
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText('Damage Dealt:', CANVAS.DESIGN_WIDTH / 2, statsY);
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 6;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillText(roundDamage.toString(), CANVAS.DESIGN_WIDTH / 2, statsY + statsSpacing * 0.8);

    // Money earned
    ctx.shadowBlur = 0;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText('Money Earned:', CANVAS.DESIGN_WIDTH / 2, statsY + statsSpacing * 2);
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 6;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillText(`$${roundMoney.toLocaleString()}`, CANVAS.DESIGN_WIDTH / 2, statsY + statsSpacing * 2.8);

    ctx.restore();

    // =========================================================================
    // DIVIDER LINE
    // =========================================================================
    const dividerY = statsY + statsSpacing * 4;

    ctx.save();
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH / 2 - 150, dividerY);
    ctx.lineTo(CANVAS.DESIGN_WIDTH / 2 + 150, dividerY);
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // NEXT ROUND PREVIEW
    // =========================================================================
    const previewY = dividerY + 50;

    ctx.save();
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "NEXT ROUND: X"
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.fillText(`NEXT ROUND: ${nextRound}`, CANVAS.DESIGN_WIDTH / 2, previewY);

    // "Difficulty: HARD" with colored difficulty
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText('Difficulty: ', CANVAS.DESIGN_WIDTH / 2 - 50, previewY + 40);

    // Colored difficulty text with glow
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = difficultyColor;
    ctx.shadowColor = difficultyColor;
    ctx.shadowBlur = 8 + pulseIntensity * 6;

    // Measure text to position properly
    const difficultyX = CANVAS.DESIGN_WIDTH / 2 + 30;
    ctx.fillText(nextDifficulty, difficultyX, previewY + 40);

    ctx.restore();

    // =========================================================================
    // CONTINUE BUTTON
    // =========================================================================
    renderButton(ctx, continueButton, pulseIntensity);

    // =========================================================================
    // DECORATIVE FRAME
    // =========================================================================
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, CANVAS.DESIGN_WIDTH - 120, CANVAS.DESIGN_HEIGHT - 120);

    // Corner accents
    const cornerSize = 25;
    const accentColor = COLORS.NEON_PURPLE;
    ctx.strokeStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.lineWidth = 3;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(60, 60 + cornerSize);
    ctx.lineTo(60, 60);
    ctx.lineTo(60 + cornerSize, 60);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH - 60 - cornerSize, 60);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 60, 60);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 60, 60 + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(60, CANVAS.DESIGN_HEIGHT - 60 - cornerSize);
    ctx.lineTo(60, CANVAS.DESIGN_HEIGHT - 60);
    ctx.lineTo(60 + cornerSize, CANVAS.DESIGN_HEIGHT - 60);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH - 60 - cornerSize, CANVAS.DESIGN_HEIGHT - 60);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 60, CANVAS.DESIGN_HEIGHT - 60);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 60, CANVAS.DESIGN_HEIGHT - 60 - cornerSize);
    ctx.stroke();

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
