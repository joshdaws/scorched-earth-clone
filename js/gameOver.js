/**
 * Scorched Earth: Synthwave Edition
 * Game Over Screen
 *
 * Displays the end-of-run screen when the player's tank is destroyed.
 * This is a terminal state - the run has ended and cannot be continued.
 * Implements permadeath for the roguelike survival mode.
 *
 * Shows comprehensive run statistics and high score notifications.
 */

import { CANVAS, COLORS, UI, GAME_STATES } from './constants.js';
import * as Game from './game.js';
import { playClickSound } from './sound.js';
import * as RunState from './runState.js';
import * as HighScores from './highScores.js';

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
 * Number of rounds survived.
 * @type {number}
 */
let roundsSurvived = 0;

/**
 * Full run statistics from runState module.
 * @type {Object|null}
 */
let runStats = null;

/**
 * High score result from saving.
 * @type {Object|null}
 */
let highScoreResult = null;

/**
 * Previous best round count (for comparison).
 * @type {number}
 */
let previousBest = 0;

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
 * Whether the new high score flash effect has been shown.
 * @type {boolean}
 */
let flashShown = false;

/**
 * Flash intensity for new high score reveal (0-1, fades out).
 * @type {number}
 */
let flashIntensity = 0;

/**
 * Particles for celebration effect.
 * @type {Array}
 */
let celebrationParticles = [];

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
 * Positioned lower to accommodate stats display.
 */
const buttons = {
    newRun: {
        x: CANVAS.DESIGN_WIDTH / 2 - 155,
        y: CANVAS.DESIGN_HEIGHT - 130,
        width: 200,
        height: 50,
        text: 'NEW RUN',
        color: COLORS.NEON_CYAN
    },
    mainMenu: {
        x: CANVAS.DESIGN_WIDTH / 2 + 155,
        y: CANVAS.DESIGN_HEIGHT - 130,
        width: 200,
        height: 50,
        text: 'MAIN MENU',
        color: COLORS.NEON_PURPLE
    }
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Show the game over screen.
 * Automatically fetches run stats and checks for high scores.
 * @param {Object} options - Display options
 * @param {number} options.rounds - Rounds survived (current round number)
 * @param {boolean} options.draw - Whether this was mutual destruction
 * @param {number} options.delay - Delay in ms before screen appears (default 1200ms)
 */
export function show(options = {}) {
    const {
        rounds = 1,
        draw = false,
        delay = 1200
    } = options;

    roundsSurvived = rounds;
    wasDraw = draw;
    animationTime = 0;
    appearDelay = delay;
    contentVisible = false;
    isVisible = true;
    flashShown = false;
    flashIntensity = 0;
    celebrationParticles = [];

    // Get previous best before saving
    previousBest = HighScores.getBestRoundCount();

    // End the run and get final stats
    RunState.endRun(draw);
    runStats = RunState.getRunStats();

    // Override with actual rounds survived from the parameter
    // (runState may not have been tracking if not yet integrated)
    runStats.roundsSurvived = rounds;

    // Save high score and update lifetime stats
    highScoreResult = HighScores.saveHighScore(runStats);
    HighScores.updateLifetimeStats(runStats);

    // Start the delay timer for content to appear
    setTimeout(() => {
        contentVisible = true;
    }, delay);

    console.log(`[GameOver] Screen queued, delay: ${delay}ms, rounds: ${rounds}, draw: ${draw}`);
    console.log('[GameOver] Run stats:', runStats);
    console.log('[GameOver] High score result:', highScoreResult);
}

/**
 * Hide the game over screen and reset state.
 */
export function hide() {
    isVisible = false;
    contentVisible = false;
    animationTime = 0;
    wasDraw = false;
    runStats = null;
    highScoreResult = null;
    flashShown = false;
    flashIntensity = 0;
    celebrationParticles = [];
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
// RENDERING HELPERS
// =============================================================================

/**
 * Format a number with commas for thousands.
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Draw a stat row (label: value).
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} label - Stat label
 * @param {string|number} value - Stat value
 * @param {number} y - Y position
 * @param {string} valueColor - Color for the value
 */
function renderStatRow(ctx, label, value, y, valueColor = COLORS.TEXT_LIGHT) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const labelX = centerX - 20;
    const valueX = centerX + 20;

    ctx.save();

    // Label (right-aligned)
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelX, y);

    // Value (left-aligned)
    ctx.fillStyle = valueColor;
    ctx.textAlign = 'left';
    ctx.fillText(String(value), valueX, y);

    ctx.restore();
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
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x, button.y);

    ctx.restore();
}

// =============================================================================
// CELEBRATION EFFECTS
// =============================================================================

/**
 * Create celebration particles for new high score.
 * @param {number} centerX - X center position
 * @param {number} centerY - Y center position
 */
function createCelebrationParticles(centerX, centerY) {
    const particleCount = 30;
    const colors = [COLORS.NEON_YELLOW, COLORS.NEON_CYAN, COLORS.NEON_PINK, COLORS.NEON_ORANGE];

    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
        const speed = 3 + Math.random() * 4;
        celebrationParticles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2, // Bias upward
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3 + Math.random() * 4,
            life: 1.0,
            decay: 0.015 + Math.random() * 0.01
        });
    }
}

/**
 * Update celebration particles.
 * @param {number} deltaTime - Time since last frame in ms
 */
function updateCelebrationParticles(deltaTime) {
    for (let i = celebrationParticles.length - 1; i >= 0; i--) {
        const p = celebrationParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        p.life -= p.decay;

        if (p.life <= 0) {
            celebrationParticles.splice(i, 1);
        }
    }
}

/**
 * Render celebration particles.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderCelebrationParticles(ctx) {
    ctx.save();
    for (const p of celebrationParticles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// =============================================================================
// MAIN RENDER
// =============================================================================

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
    ctx.fillStyle = 'rgba(10, 10, 26, 0.97)';
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Dramatic scanlines effect
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < CANVAS.DESIGN_HEIGHT; y += 4) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, y, CANVAS.DESIGN_WIDTH, 2);
    }
    ctx.globalAlpha = 1;

    // Flash effect for new high score (fades out over time)
    if (flashIntensity > 0) {
        ctx.save();
        ctx.globalAlpha = flashIntensity;
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
        ctx.restore();
    }

    // Main title with dramatic glow
    const titleY = 100;

    ctx.save();
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 50 + pulseIntensity * 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `bold 64px ${UI.FONT_FAMILY}`;
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
        ctx.fillText('MUTUAL DESTRUCTION', CANVAS.DESIGN_WIDTH / 2, titleY + 45);
        ctx.restore();
    }

    // Decorative line under title
    const lineY = wasDraw ? titleY + 80 : titleY + 50;
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH / 2 - 200, lineY);
    ctx.lineTo(CANVAS.DESIGN_WIDTH / 2 + 200, lineY);
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // ROUNDS SURVIVED (main stat)
    // =========================================================================
    const roundsY = lineY + 70;

    ctx.save();
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('ROUNDS SURVIVED', CANVAS.DESIGN_WIDTH / 2, roundsY);

    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 15 + pulseIntensity * 10;
    ctx.font = `bold 48px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fillText(roundsSurvived.toString(), CANVAS.DESIGN_WIDTH / 2, roundsY + 45);
    ctx.restore();

    // =========================================================================
    // HIGH SCORE NOTIFICATION
    // =========================================================================
    let statsStartY = roundsY + 100;
    const isNewHighScore = highScoreResult && highScoreResult.isNewBest && roundsSurvived > 0;

    if (isNewHighScore) {
        // Trigger celebration effects on first frame
        if (!flashShown) {
            flashShown = true;
            flashIntensity = 0.6; // Start with bright flash
            createCelebrationParticles(CANVAS.DESIGN_WIDTH / 2, statsStartY);
        }

        // Calculate celebration-specific animations
        const colorCycle = Math.floor(animationTime / 200) % 2; // Alternates every 200ms
        const celebrationColor = colorCycle === 0 ? COLORS.NEON_YELLOW : COLORS.NEON_CYAN;
        const starColor = colorCycle === 0 ? COLORS.NEON_PINK : COLORS.NEON_YELLOW;

        // Scale pulse for text (1.0 to 1.15)
        const scalePulse = 1.0 + 0.15 * Math.sin(animationTime * 0.006);

        // New high score celebration with enhanced effects
        ctx.save();
        ctx.textAlign = 'center';

        // Apply scale transform for pulsing text
        ctx.translate(CANVAS.DESIGN_WIDTH / 2, statsStartY);
        ctx.scale(scalePulse, scalePulse);
        ctx.translate(-CANVAS.DESIGN_WIDTH / 2, -statsStartY);

        // Draw the banner with alternating colors
        ctx.shadowColor = celebrationColor;
        ctx.shadowBlur = 25 + pulseIntensity * 20;
        ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = celebrationColor;
        ctx.fillText('★ NEW HIGH SCORE! ★', CANVAS.DESIGN_WIDTH / 2, statsStartY);

        // Draw glowing stars in alternating color
        ctx.shadowColor = starColor;
        ctx.shadowBlur = 15 + pulseIntensity * 15;
        ctx.fillStyle = starColor;
        ctx.fillText('★                    ★', CANVAS.DESIGN_WIDTH / 2, statsStartY);

        ctx.restore();

        // Previous best comparison (not scaled)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.textAlign = 'center';
        ctx.fillText(`Previous Best: ${previousBest} rounds`, CANVAS.DESIGN_WIDTH / 2, statsStartY + 30);
        ctx.restore();

        statsStartY += 65;
    } else if (highScoreResult && highScoreResult.saved && highScoreResult.rank) {
        // Made the top 10 but not #1
        ctx.save();
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 10;
        ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.textAlign = 'center';
        ctx.fillText(`TOP 10! Rank #${highScoreResult.rank}`, CANVAS.DESIGN_WIDTH / 2, statsStartY);
        ctx.restore();

        statsStartY += 35;
    }

    // Render celebration particles (above other elements)
    renderCelebrationParticles(ctx);

    // Separator line before stats
    ctx.save();
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH / 2 - 180, statsStartY);
    ctx.lineTo(CANVAS.DESIGN_WIDTH / 2 + 180, statsStartY);
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // RUN STATISTICS
    // =========================================================================
    if (runStats) {
        const statLineHeight = 22;
        let statY = statsStartY + 25;

        // Total Damage Dealt
        renderStatRow(ctx, 'Total Damage Dealt:', formatNumber(runStats.totalDamageDealt), statY, COLORS.NEON_PINK);
        statY += statLineHeight;

        // Enemies Destroyed
        renderStatRow(ctx, 'Enemies Destroyed:', formatNumber(runStats.enemiesDestroyed), statY, COLORS.NEON_CYAN);
        statY += statLineHeight;

        // Shots Fired
        renderStatRow(ctx, 'Shots Fired:', formatNumber(runStats.shotsFired), statY);
        statY += statLineHeight;

        // Hit Rate
        const hitRateColor = runStats.hitRate >= 50 ? COLORS.NEON_CYAN : COLORS.TEXT_LIGHT;
        renderStatRow(ctx, 'Hit Rate:', `${runStats.hitRate}%`, statY, hitRateColor);
        statY += statLineHeight;

        // Money Earned
        renderStatRow(ctx, 'Money Earned:', `$${formatNumber(runStats.moneyEarned)}`, statY, COLORS.NEON_YELLOW);
        statY += statLineHeight;

        // Biggest Hit
        if (runStats.biggestHit > 0) {
            renderStatRow(ctx, 'Biggest Hit:', `${runStats.biggestHit} damage`, statY, COLORS.NEON_ORANGE);
        }
    }

    // =========================================================================
    // BUTTONS
    // =========================================================================
    renderButton(ctx, buttons.newRun, pulseIntensity);
    renderButton(ctx, buttons.mainMenu, pulseIntensity);

    // =========================================================================
    // DECORATIVE FRAME
    // =========================================================================
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, CANVAS.DESIGN_WIDTH - 80, CANVAS.DESIGN_HEIGHT - 80);

    // Corner accents
    const cornerSize = 30;
    const accentColor = COLORS.NEON_ORANGE;
    ctx.strokeStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.lineWidth = 4;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(40, 40 + cornerSize);
    ctx.lineTo(40, 40);
    ctx.lineTo(40 + cornerSize, 40);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH - 40 - cornerSize, 40);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 40, 40);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 40, 40 + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(40, CANVAS.DESIGN_HEIGHT - 40 - cornerSize);
    ctx.lineTo(40, CANVAS.DESIGN_HEIGHT - 40);
    ctx.lineTo(40 + cornerSize, CANVAS.DESIGN_HEIGHT - 40);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH - 40 - cornerSize, CANVAS.DESIGN_HEIGHT - 40);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 40, CANVAS.DESIGN_HEIGHT - 40);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 40, CANVAS.DESIGN_HEIGHT - 40 - cornerSize);
    ctx.stroke();

    ctx.restore();

    // Flavor text at bottom
    ctx.save();
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('Your tank was destroyed. The run has ended.', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 60);
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

        // Fade out flash effect
        if (flashIntensity > 0) {
            flashIntensity -= deltaTime * 0.003; // Fade over ~200ms
            if (flashIntensity < 0) flashIntensity = 0;
        }

        // Update celebration particles
        updateCelebrationParticles(deltaTime);
    }
}
