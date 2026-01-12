/**
 * Scorched Earth: Synthwave Edition
 * Scrap Tutorial Popup
 *
 * Displays a one-time tutorial popup explaining the scrap system
 * when the player receives their first duplicate tank.
 */

import { COLORS, UI } from './constants.js';
import * as Renderer from './renderer.js';
import * as Sound from './sound.js';
import * as Game from './game.js';
import { markScrapTutorialSeen } from './tank-collection.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Panel layout configuration.
 */
const PANEL_CONFIG = {
    WIDTH: 420,
    HEIGHT: 320,
    PADDING: 24,
    BORDER_RADIUS: 12,
    BUTTON_WIDTH: 140,
    BUTTON_HEIGHT: 44,
    BUTTON_SPACING: 20
};

// =============================================================================
// STATE
// =============================================================================

/** @type {boolean} Whether the popup is visible */
let isVisible = false;

/** @type {number} Scrap amount to display */
let scrapAmount = 0;

/** @type {Function|null} Callback when "Got It" is clicked */
let onDismissCallback = null;

/** @type {Function|null} Callback when "Go To Shop" is clicked */
let onGoToShopCallback = null;

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Show the scrap tutorial popup.
 * @param {Object} options - Configuration options
 * @param {number} options.scrapAwarded - Amount of scrap earned
 * @param {Function} [options.onDismiss] - Called when dismissed
 * @param {Function} [options.onGoToShop] - Called when going to shop
 */
export function show(options = {}) {
    scrapAmount = options.scrapAwarded || 0;
    onDismissCallback = options.onDismiss || null;
    onGoToShopCallback = options.onGoToShop || null;
    isVisible = true;

    console.log('[ScrapTutorial] Popup shown', { scrapAmount });
}

/**
 * Hide the popup.
 */
export function hide() {
    isVisible = false;
    scrapAmount = 0;
    onDismissCallback = null;
    onGoToShopCallback = null;
}

/**
 * Check if the popup is visible.
 * @returns {boolean} True if visible
 */
export function isOpen() {
    return isVisible;
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle click/tap on the popup.
 * @param {{x: number, y: number}} pos - Click position
 * @returns {boolean} True if click was handled
 */
export function handleClick(pos) {
    if (!isVisible) return false;

    const screenW = Renderer.getWidth();
    const screenH = Renderer.getHeight();
    const panelX = (screenW - PANEL_CONFIG.WIDTH) / 2;
    const panelY = (screenH - PANEL_CONFIG.HEIGHT) / 2;

    // Check if click is inside panel
    const insidePanel =
        pos.x >= panelX &&
        pos.x <= panelX + PANEL_CONFIG.WIDTH &&
        pos.y >= panelY &&
        pos.y <= panelY + PANEL_CONFIG.HEIGHT;

    if (!insidePanel) {
        // Click outside - dismiss
        dismiss();
        return true;
    }

    // Button positions
    const buttonY = panelY + PANEL_CONFIG.HEIGHT - PANEL_CONFIG.PADDING - PANEL_CONFIG.BUTTON_HEIGHT;
    const totalButtonWidth = PANEL_CONFIG.BUTTON_WIDTH * 2 + PANEL_CONFIG.BUTTON_SPACING;
    const buttonStartX = panelX + (PANEL_CONFIG.WIDTH - totalButtonWidth) / 2;

    // "Got It" button (left)
    const gotItBtn = {
        x: buttonStartX,
        y: buttonY,
        width: PANEL_CONFIG.BUTTON_WIDTH,
        height: PANEL_CONFIG.BUTTON_HEIGHT
    };

    // "Go To Shop" button (right)
    const shopBtn = {
        x: buttonStartX + PANEL_CONFIG.BUTTON_WIDTH + PANEL_CONFIG.BUTTON_SPACING,
        y: buttonY,
        width: PANEL_CONFIG.BUTTON_WIDTH,
        height: PANEL_CONFIG.BUTTON_HEIGHT
    };

    if (isPointInRect(pos, gotItBtn)) {
        Sound.playClickSound();
        dismiss();
        return true;
    }

    if (isPointInRect(pos, shopBtn)) {
        Sound.playClickSound();
        goToShop();
        return true;
    }

    return true; // Consume click inside panel
}

/**
 * Handle keyboard input.
 * @param {string} key - Key pressed
 * @returns {boolean} True if handled
 */
export function handleKeyDown(key) {
    if (!isVisible) return false;

    if (key === 'Escape' || key === 'Enter' || key === ' ') {
        dismiss();
        return true;
    }

    return false;
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Dismiss the popup (Got It button).
 */
function dismiss() {
    markScrapTutorialSeen();
    hide();

    if (onDismissCallback) {
        onDismissCallback();
    }
}

/**
 * Go to the scrap shop.
 */
function goToShop() {
    markScrapTutorialSeen();
    hide();

    if (onGoToShopCallback) {
        onGoToShopCallback();
    } else {
        // Default: navigate to collection screen with shop
        Game.setState('COLLECTION');
    }
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render the scrap tutorial popup.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function render(ctx) {
    if (!isVisible) return;

    const screenW = Renderer.getWidth();
    const screenH = Renderer.getHeight();

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, screenW, screenH);

    // Panel position
    const panelX = (screenW - PANEL_CONFIG.WIDTH) / 2;
    const panelY = (screenH - PANEL_CONFIG.HEIGHT) / 2;

    // Panel background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, PANEL_CONFIG.WIDTH, PANEL_CONFIG.HEIGHT, PANEL_CONFIG.BORDER_RADIUS);
    ctx.fill();

    // Panel border with glow
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = COLORS.NEON_YELLOW;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE + 4}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SCRAP EARNED!', screenW / 2, panelY + PANEL_CONFIG.PADDING);

    // Scrap amount
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.fillText(`+${scrapAmount}`, screenW / 2, panelY + PANEL_CONFIG.PADDING + 40);

    // Explanation text
    const textY = panelY + 100;
    const lineHeight = 24;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;

    const lines = [
        'You already own this tank,',
        'so it was converted to SCRAP.',
        '',
        'Scrap lets you buy specific',
        'tanks directly - no luck needed!',
        '',
        'Visit the SCRAP SHOP in',
        'Collections to spend it.'
    ];

    lines.forEach((line, i) => {
        ctx.fillText(line, screenW / 2, textY + i * lineHeight);
    });

    // Buttons
    const buttonY = panelY + PANEL_CONFIG.HEIGHT - PANEL_CONFIG.PADDING - PANEL_CONFIG.BUTTON_HEIGHT;
    const totalButtonWidth = PANEL_CONFIG.BUTTON_WIDTH * 2 + PANEL_CONFIG.BUTTON_SPACING;
    const buttonStartX = panelX + (PANEL_CONFIG.WIDTH - totalButtonWidth) / 2;

    // "Got It" button (cyan)
    renderButton(ctx, {
        x: buttonStartX,
        y: buttonY,
        width: PANEL_CONFIG.BUTTON_WIDTH,
        height: PANEL_CONFIG.BUTTON_HEIGHT,
        text: 'GOT IT',
        color: COLORS.NEON_CYAN
    });

    // "Go To Shop" button (yellow)
    renderButton(ctx, {
        x: buttonStartX + PANEL_CONFIG.BUTTON_WIDTH + PANEL_CONFIG.BUTTON_SPACING,
        y: buttonY,
        width: PANEL_CONFIG.BUTTON_WIDTH,
        height: PANEL_CONFIG.BUTTON_HEIGHT,
        text: 'GO TO SHOP',
        color: COLORS.NEON_YELLOW
    });
}

/**
 * Render a button.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} btn - Button configuration
 */
function renderButton(ctx, btn) {
    ctx.save();

    // Button background
    ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 6);
    ctx.fill();

    // Button border with glow
    ctx.shadowColor = btn.color;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = btn.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button text
    ctx.fillStyle = btn.color;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.text, btn.x + btn.width / 2, btn.y + btn.height / 2);

    ctx.restore();
}

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Check if a point is inside a rectangle.
 * @param {{x: number, y: number}} point - Point to check
 * @param {{x: number, y: number, width: number, height: number}} rect - Rectangle bounds
 * @returns {boolean} True if point is inside rectangle
 */
function isPointInRect(point, rect) {
    return (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
    );
}
