/**
 * Scorched Earth: Synthwave Edition
 * Round Transition Screen
 *
 * Displays a brief transition screen after winning a round, showing round stats,
 * tokens earned, achievements unlocked, and previewing the next round's difficulty.
 * This screen appears between round victory and the shop.
 */

import { CANVAS, COLORS, UI, GAME_STATES } from './constants.js';
import * as Renderer from './renderer.js';
import { playClickSound } from './sound.js';
import * as AI from './ai.js';
import * as Game from './game.js';
import { Button } from './ui/Button.js';

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
 * Token result from this round { total, breakdown }.
 * @type {Object|null}
 */
let tokenResult = null;

/**
 * Current token balance.
 * @type {number}
 */
let tokenBalance = 0;

/**
 * Achievements unlocked this round.
 * @type {Array}
 */
let roundAchievements = [];

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
 * Timestamp when the screen was shown (for fade-in calculation).
 * @type {number}
 */
let showStartTime = 0;

/**
 * Callback to execute when "Continue" is clicked (skip shop, go to next round).
 * @type {Function|null}
 */
let onContinueCallback = null;

/**
 * Callback to execute when "Shop" is clicked.
 * @type {Function|null}
 */
let onShopCallback = null;

/**
 * Callback to execute when "Collection" is clicked.
 * @type {Function|null}
 */
let onCollectionCallback = null;

/**
 * Callback to execute when "Supply Drop" is clicked.
 * @type {Function|null}
 */
let onSupplyDropCallback = null;

// =============================================================================
// BUTTON DEFINITIONS
// =============================================================================

/**
 * Standard supply drop cost in tokens.
 */
const SUPPLY_DROP_COST = 50;

/**
 * Button styling for round transition screen.
 * Uses solid dark backgrounds for visibility against overlay.
 */
const ROUND_TRANSITION_BUTTON_STYLES = {
    bgColor: 'rgba(20, 15, 40, 0.95)'
};

/**
 * Button instances using the reusable Button component.
 * Positions are updated dynamically via updateButtonPositions().
 */
const buttons = {
    continue: new Button({
        text: 'CONTINUE',
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: ROUND_TRANSITION_BUTTON_STYLES.bgColor,
        borderColor: COLORS.NEON_CYAN,
        glowColor: COLORS.NEON_CYAN,
        textColor: COLORS.TEXT_LIGHT,
        autoSize: false
    }),
    shop: new Button({
        text: 'SHOP',
        x: 0,
        y: 0,
        width: 140,
        height: 50,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: ROUND_TRANSITION_BUTTON_STYLES.bgColor,
        borderColor: COLORS.NEON_YELLOW,
        glowColor: COLORS.NEON_YELLOW,
        textColor: COLORS.TEXT_LIGHT,
        autoSize: false
    }),
    collection: new Button({
        text: 'COLLECTION',
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: ROUND_TRANSITION_BUTTON_STYLES.bgColor,
        borderColor: COLORS.NEON_PURPLE,
        glowColor: COLORS.NEON_PURPLE,
        textColor: COLORS.TEXT_LIGHT,
        autoSize: false
    }),
    supplyDrop: new Button({
        text: 'SUPPLY DROP (50)',
        x: 0,
        y: 0,
        width: 250,
        height: 45,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: ROUND_TRANSITION_BUTTON_STYLES.bgColor,
        borderColor: COLORS.NEON_ORANGE,
        glowColor: COLORS.NEON_ORANGE,
        textColor: COLORS.TEXT_LIGHT,
        autoSize: false
    })
};

/**
 * Update button positions based on current screen size.
 * Called before rendering and hit testing to ensure positions are current.
 */
function updateButtonPositions() {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const centerX = width / 2;

    buttons.continue.setPosition(centerX - 170, height - 100);
    buttons.shop.setPosition(centerX, height - 100);
    buttons.collection.setPosition(centerX + 170, height - 100);
    buttons.supplyDrop.setPosition(centerX, height - 160);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Show the round transition screen.
 * @param {Object} options - Display options
 * @param {number} options.round - The round number that was completed
 * @param {number} options.damage - Damage dealt this round
 * @param {number} options.money - Money earned this round
 * @param {Object} [options.tokenResult] - Token award result { total, breakdown }
 * @param {number} [options.tokenBalance] - Current token balance
 * @param {Array} [options.achievements] - Achievements unlocked this round
 * @param {number} [options.delay=500] - Delay in ms before screen appears
 */
export function show(options = {}) {
    const {
        round = 1,
        damage = 0,
        money = 0,
        tokenResult: tokens = null,
        tokenBalance: balance = 0,
        achievements = [],
        delay = 500
    } = options;

    completedRound = round;
    roundDamage = damage;
    roundMoney = money;
    tokenResult = tokens;
    tokenBalance = balance;
    roundAchievements = achievements;
    animationTime = 0;
    appearDelay = delay;
    contentVisible = false;
    isVisible = true;
    showStartTime = performance.now();

    // Start the delay timer for content to appear
    setTimeout(() => {
        contentVisible = true;
    }, delay);

    console.log(`[RoundTransition] Screen queued, delay: ${delay}ms, round: ${round}`);
    console.log(`[RoundTransition] Tokens: ${tokens?.total || 0}, Achievements: ${achievements.length}`);
}

/**
 * Hide the round transition screen and reset state.
 */
export function hide() {
    isVisible = false;
    contentVisible = false;
    animationTime = 0;
    showStartTime = 0;
    tokenResult = null;
    roundAchievements = [];
}

/**
 * Register callback for "Continue" button (skip shop, go to next round).
 * @param {Function} callback - Function to call when button is clicked
 */
export function onContinue(callback) {
    onContinueCallback = callback;
}

/**
 * Register callback for "Shop" button.
 * @param {Function} callback - Function to call when button is clicked
 */
export function onShop(callback) {
    onShopCallback = callback;
}

/**
 * Register callback for "Collection" button.
 * @param {Function} callback - Function to call when button is clicked
 */
export function onCollection(callback) {
    onCollectionCallback = callback;
}

/**
 * Register callback for "Supply Drop" button.
 * @param {Function} callback - Function to call when button is clicked
 */
export function onSupplyDrop(callback) {
    onSupplyDropCallback = callback;
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
 * Handle click/tap on the round transition screen.
 * @param {number} x - X coordinate in game space
 * @param {number} y - Y coordinate in game space
 * @returns {boolean} True if a button was clicked
 */
export function handleClick(x, y) {
    if (!contentVisible) return false;

    // Ensure button positions are current for the screen size
    updateButtonPositions();

    // Check Continue button (skip shop, go directly to next round)
    if (buttons.continue.containsPoint(x, y)) {
        playClickSound();
        console.log('[RoundTransition] Continue clicked - skip shop, go to next round');
        if (onContinueCallback) {
            onContinueCallback();
        }
        return true;
    }

    // Check Shop button (go to shop before next round)
    if (buttons.shop.containsPoint(x, y)) {
        playClickSound();
        console.log('[RoundTransition] Shop clicked');
        if (onShopCallback) {
            onShopCallback();
        } else {
            // Default: go to shop
            hide();
            Game.setState(GAME_STATES.SHOP);
        }
        return true;
    }

    // Check Collection button
    if (buttons.collection.containsPoint(x, y)) {
        playClickSound();
        console.log('[RoundTransition] Collection clicked');
        if (onCollectionCallback) {
            onCollectionCallback();
        } else {
            // Default: go to collection screen
            hide();
            Game.setState(GAME_STATES.COLLECTION);
        }
        return true;
    }

    // Check Supply Drop button (only if can afford)
    if (tokenBalance >= SUPPLY_DROP_COST && buttons.supplyDrop.containsPoint(x, y)) {
        playClickSound();
        console.log('[RoundTransition] Supply Drop clicked');
        if (onSupplyDropCallback) {
            onSupplyDropCallback();
        } else {
            // Default: go to supply drop screen
            hide();
            Game.setState(GAME_STATES.SUPPLY_DROP);
        }
        return true;
    }

    return false;
}

/**
 * Handle pointer move for hover state updates.
 * @param {number} x - X coordinate in game space
 * @param {number} y - Y coordinate in game space
 */
export function handlePointerMove(x, y) {
    if (!contentVisible) return;

    // Ensure button positions are current for the screen size
    updateButtonPositions();

    // Update hover states for all buttons
    buttons.continue.handlePointerMove(x, y);
    buttons.shop.handlePointerMove(x, y);
    buttons.collection.handlePointerMove(x, y);

    // Only update supply drop hover if it's visible (can afford)
    if (tokenBalance >= SUPPLY_DROP_COST) {
        buttons.supplyDrop.handlePointerMove(x, y);
    } else {
        buttons.supplyDrop.setHovered(false);
    }
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

// =============================================================================
// MAIN RENDER
// =============================================================================

/**
 * Render the round transition screen.
 * Includes a fade-in effect during the delay period so the transition is smooth.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    if (!isVisible) return;

    // Calculate time elapsed since screen was shown
    const elapsed = performance.now() - showStartTime;

    // During the delay period, render a fade-in overlay so the transition is smooth
    // This lets the player see the explosion while the screen gradually darkens
    if (!contentVisible) {
        // Calculate fade progress (0 to 1) over the delay period
        // Use a slower fade for the first half to let the explosion be visible
        const fadeProgress = Math.min(1, elapsed / appearDelay);
        // Use an eased curve so the fade starts slow and accelerates
        const easedProgress = fadeProgress * fadeProgress;
        // Maximum overlay opacity during fade-in (will reach full 0.95 when content appears)
        const maxFadeOpacity = 0.7;
        const overlayOpacity = easedProgress * maxFadeOpacity;

        ctx.save();
        ctx.fillStyle = `rgba(10, 10, 26, ${overlayOpacity})`;
        ctx.fillRect(0, 0, Renderer.getWidth(), Renderer.getHeight());
        ctx.restore();
        return;
    }

    // Update button positions for current screen size
    updateButtonPositions();

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
    ctx.fillRect(0, 0, Renderer.getWidth(), Renderer.getHeight());

    // Subtle scanlines effect
    ctx.globalAlpha = 0.02;
    for (let y = 0; y < Renderer.getHeight(); y += 4) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, y, Renderer.getWidth(), 2);
    }
    ctx.globalAlpha = 1;

    // =========================================================================
    // TITLE: "ROUND X COMPLETE" with glow animation
    // =========================================================================
    const titleY = 80;

    ctx.save();
    // Multi-layer glow effect for dramatic "ROUND COMPLETE" text
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 30 + titlePulse * 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `bold 42px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = mainColor;
    ctx.fillText(`ROUND ${completedRound} COMPLETE`, Renderer.getWidth() / 2, titleY);

    // Title outline for depth
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLORS.TEXT_LIGHT;
    ctx.lineWidth = 1;
    ctx.strokeText(`ROUND ${completedRound} COMPLETE`, Renderer.getWidth() / 2, titleY);
    ctx.restore();

    // =========================================================================
    // TWO-COLUMN LAYOUT: Left (Stats) | Right (Tokens)
    // =========================================================================
    const contentY = titleY + 60;
    const leftColumnX = Renderer.getWidth() * 0.28;
    const rightColumnX = Renderer.getWidth() * 0.72;

    // =========================================================================
    // LEFT COLUMN: Round Stats
    // =========================================================================
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Section title
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.fillText('ROUND STATS', leftColumnX, contentY);

    let statY = contentY + 35;
    const statSpacing = 28;

    // Damage dealt
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText('Damage Dealt', leftColumnX, statY);
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 6;
    ctx.fillText(roundDamage.toString(), leftColumnX, statY + 20);

    statY += statSpacing + 25;

    // Money earned
    ctx.shadowBlur = 0;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText('Money Earned', leftColumnX, statY);
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 6;
    ctx.fillText(`$${roundMoney.toLocaleString()}`, leftColumnX, statY + 20);

    ctx.restore();

    // =========================================================================
    // RIGHT COLUMN: Tokens Earned
    // =========================================================================
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Section title
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.fillText('TOKENS EARNED', rightColumnX, contentY);

    let tokenY = contentY + 35;

    if (tokenResult && tokenResult.breakdown && tokenResult.breakdown.length > 0) {
        // Show breakdown
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;

        for (const item of tokenResult.breakdown) {
            ctx.fillStyle = COLORS.TEXT_MUTED;
            ctx.textAlign = 'left';
            ctx.fillText(item.source, rightColumnX - 80, tokenY);
            ctx.fillStyle = COLORS.NEON_CYAN;
            ctx.textAlign = 'right';
            ctx.fillText(`+${item.amount}`, rightColumnX + 80, tokenY);
            tokenY += 22;
        }

        // Divider
        tokenY += 5;
        ctx.strokeStyle = COLORS.GRID;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rightColumnX - 80, tokenY);
        ctx.lineTo(rightColumnX + 80, tokenY);
        ctx.stroke();
        tokenY += 15;

        // Total
        ctx.textAlign = 'center';
        ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 8;
        ctx.fillText(`TOTAL: ${tokenResult.total} tokens`, rightColumnX, tokenY);
    } else {
        // No tokens earned
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText('No tokens this round', rightColumnX, tokenY);
    }

    // Current balance
    tokenY += 35;
    ctx.shadowBlur = 0;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText(`Balance: ${tokenBalance} tokens`, rightColumnX, tokenY);

    ctx.restore();

    // =========================================================================
    // ACHIEVEMENTS THIS ROUND (if any)
    // =========================================================================
    const achievementY = contentY + 175;

    if (roundAchievements.length > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Section title
        ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.NEON_PURPLE;
        ctx.shadowColor = COLORS.NEON_PURPLE;
        ctx.shadowBlur = 8;
        ctx.fillText('ACHIEVEMENTS UNLOCKED', Renderer.getWidth() / 2, achievementY);

        ctx.shadowBlur = 0;
        let achY = achievementY + 30;

        // Show up to 3 achievements
        const displayAchievements = roundAchievements.slice(0, 3);
        for (const { achievement, reward } of displayAchievements) {
            ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = COLORS.TEXT_LIGHT;
            ctx.textAlign = 'center';

            // Star + name + reward
            const text = `★ ${achievement.name} (+${reward} tokens)`;
            ctx.fillText(text, Renderer.getWidth() / 2, achY);
            achY += 24;
        }

        // Show "and X more..." if more than 3
        if (roundAchievements.length > 3) {
            ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = COLORS.TEXT_MUTED;
            ctx.fillText(`...and ${roundAchievements.length - 3} more`, Renderer.getWidth() / 2, achY);
        }

        ctx.restore();
    }

    // =========================================================================
    // NEXT ROUND PREVIEW
    // =========================================================================
    const previewY = roundAchievements.length > 0 ? achievementY + 100 : achievementY + 20;

    ctx.save();
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "NEXT ROUND: X"
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.fillText(`NEXT: Round ${nextRound}`, Renderer.getWidth() / 2 - 60, previewY);

    // Colored difficulty text with glow
    ctx.fillStyle = difficultyColor;
    ctx.shadowColor = difficultyColor;
    ctx.shadowBlur = 8 + pulseIntensity * 6;
    ctx.fillText(nextDifficulty, Renderer.getWidth() / 2 + 80, previewY);

    ctx.restore();

    // =========================================================================
    // SUPPLY DROP BUTTON (if can afford)
    // =========================================================================
    const canAffordSupplyDrop = tokenBalance >= SUPPLY_DROP_COST;
    if (canAffordSupplyDrop) {
        buttons.supplyDrop.render(ctx, pulseIntensity);
    }

    // =========================================================================
    // BOTTOM BUTTONS: CONTINUE | SHOP | COLLECTION
    // =========================================================================
    buttons.continue.render(ctx, pulseIntensity);
    buttons.shop.render(ctx, pulseIntensity);
    buttons.collection.render(ctx, pulseIntensity);

    // =========================================================================
    // DECORATIVE FRAME
    // =========================================================================
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, Renderer.getWidth() - 80, Renderer.getHeight() - 80);

    // Corner accents
    const cornerSize = 25;
    const accentColor = COLORS.NEON_PURPLE;
    ctx.strokeStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.lineWidth = 3;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(40, 40 + cornerSize);
    ctx.lineTo(40, 40);
    ctx.lineTo(40 + cornerSize, 40);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(Renderer.getWidth() - 40 - cornerSize, 40);
    ctx.lineTo(Renderer.getWidth() - 40, 40);
    ctx.lineTo(Renderer.getWidth() - 40, 40 + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(40, Renderer.getHeight() - 40 - cornerSize);
    ctx.lineTo(40, Renderer.getHeight() - 40);
    ctx.lineTo(40 + cornerSize, Renderer.getHeight() - 40);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(Renderer.getWidth() - 40 - cornerSize, Renderer.getHeight() - 40);
    ctx.lineTo(Renderer.getWidth() - 40, Renderer.getHeight() - 40);
    ctx.lineTo(Renderer.getWidth() - 40, Renderer.getHeight() - 40 - cornerSize);
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
