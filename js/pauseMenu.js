/**
 * Scorched Earth: Synthwave Edition
 * Pause Menu Module
 *
 * Renders pause menu overlay with synthwave styling.
 * Provides Resume, Options, and Quit to Menu buttons.
 */

import { COLORS, UI, CANVAS, GAME_STATES } from './constants.js';
import * as VolumeControls from './volumeControls.js';
import * as Sound from './sound.js';

// =============================================================================
// LAYOUT CONFIGURATION
// =============================================================================

/**
 * Pause menu panel dimensions and styling.
 */
const PAUSE_PANEL = {
    WIDTH: 360,
    HEIGHT: 340,
    PADDING: 30,
    BUTTON_WIDTH: 280,
    BUTTON_HEIGHT: 50,
    BUTTON_SPACING: 20
};

// =============================================================================
// MENU STATE
// =============================================================================

/** @type {boolean} Whether the pause menu is currently visible */
let isVisible = false;

/** @type {boolean} Whether the options sub-panel is shown */
let showingOptions = false;

/** @type {boolean} Whether the quit confirmation is shown */
let showingQuitConfirm = false;

/** @type {string|null} State to return to when resuming */
let previousState = null;

/** @type {{x: number, y: number} | null} Panel position */
let panelPosition = null;

/** @type {number} Timestamp when menu was shown, used to prevent immediate close on same click */
let showTimestamp = 0;

/** @type {number} Minimum time in ms before "click outside" can close the menu */
const CLICK_OUTSIDE_DELAY = 100;

// =============================================================================
// BUTTON DEFINITIONS
// =============================================================================

/**
 * Get button definitions with current positions.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {Array<{id: string, label: string, x: number, y: number, width: number, height: number, color: string}>}
 */
function getButtons(panelX, panelY) {
    const buttonX = panelX + (PAUSE_PANEL.WIDTH - PAUSE_PANEL.BUTTON_WIDTH) / 2;
    const startY = panelY + 80;

    return [
        {
            id: 'resume',
            label: 'RESUME',
            x: buttonX,
            y: startY,
            width: PAUSE_PANEL.BUTTON_WIDTH,
            height: PAUSE_PANEL.BUTTON_HEIGHT,
            color: COLORS.NEON_CYAN
        },
        {
            id: 'options',
            label: 'OPTIONS',
            x: buttonX,
            y: startY + PAUSE_PANEL.BUTTON_HEIGHT + PAUSE_PANEL.BUTTON_SPACING,
            width: PAUSE_PANEL.BUTTON_WIDTH,
            height: PAUSE_PANEL.BUTTON_HEIGHT,
            color: COLORS.NEON_PURPLE
        },
        {
            id: 'quit',
            label: 'QUIT TO MENU',
            x: buttonX,
            y: startY + (PAUSE_PANEL.BUTTON_HEIGHT + PAUSE_PANEL.BUTTON_SPACING) * 2,
            width: PAUSE_PANEL.BUTTON_WIDTH,
            height: PAUSE_PANEL.BUTTON_HEIGHT,
            color: COLORS.NEON_PINK
        }
    ];
}

/**
 * Get quit confirmation button definitions.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {Array<{id: string, label: string, x: number, y: number, width: number, height: number, color: string}>}
 */
function getQuitConfirmButtons(panelX, panelY) {
    const buttonWidth = 120;
    const buttonHeight = 45;
    const spacing = 20;
    const totalWidth = buttonWidth * 2 + spacing;
    const startX = panelX + (PAUSE_PANEL.WIDTH - totalWidth) / 2;
    const buttonY = panelY + 180;

    return [
        {
            id: 'confirm_yes',
            label: 'YES',
            x: startX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            color: COLORS.NEON_PINK
        },
        {
            id: 'confirm_no',
            label: 'NO',
            x: startX + buttonWidth + spacing,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            color: COLORS.NEON_CYAN
        }
    ];
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render the pause menu overlay.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    console.log('[PauseMenu] render called, isVisible:', isVisible);
    if (!ctx || !isVisible) return;

    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const centerY = CANVAS.DESIGN_HEIGHT / 2;
    const panelX = centerX - PAUSE_PANEL.WIDTH / 2;
    const panelY = centerY - PAUSE_PANEL.HEIGHT / 2;
    panelPosition = { x: panelX, y: panelY };

    ctx.save();

    // Dark overlay to dim the game
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // If showing options, render volume controls instead
    if (showingOptions) {
        VolumeControls.render(ctx, centerX, centerY);

        // Back button below volume controls
        const backButton = {
            x: centerX - 60,
            y: centerY + VolumeControls.getPanelDimensions().height / 2 + 30,
            width: 120,
            height: 40
        };
        renderButton(ctx, { ...backButton, id: 'back', label: 'BACK', color: COLORS.NEON_CYAN });

        ctx.restore();
        return;
    }

    // If showing quit confirmation, render that
    if (showingQuitConfirm) {
        renderQuitConfirmation(ctx, panelX, panelY);
        ctx.restore();
        return;
    }

    // Panel background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, PAUSE_PANEL.WIDTH, PAUSE_PANEL.HEIGHT, 12);
    ctx.fill();

    // Panel border with glow
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold ${UI.FONT_SIZE_TITLE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 8;
    ctx.fillText('PAUSED', centerX, panelY + PAUSE_PANEL.PADDING);
    ctx.shadowBlur = 0;

    // Render buttons
    const buttons = getButtons(panelX, panelY);
    for (const button of buttons) {
        renderButton(ctx, button);
    }

    // Hint text at bottom
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC to resume', centerX, panelY + PAUSE_PANEL.HEIGHT - 20);

    ctx.restore();
}

/**
 * Render a single button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button definition
 */
function renderButton(ctx, button) {
    ctx.save();

    // Button background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 6);
    ctx.fill();

    // Button border with glow
    ctx.strokeStyle = button.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = button.color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button text
    ctx.fillStyle = button.color;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);

    ctx.restore();
}

/**
 * Render the quit confirmation dialog.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 */
function renderQuitConfirmation(ctx, panelX, panelY) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const confirmHeight = 260;
    const confirmY = CANVAS.DESIGN_HEIGHT / 2 - confirmHeight / 2;

    // Panel background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.beginPath();
    ctx.roundRect(panelX, confirmY, PAUSE_PANEL.WIDTH, confirmHeight, 12);
    ctx.fill();

    // Panel border with glow
    ctx.strokeStyle = COLORS.NEON_PINK;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('QUIT TO MENU?', centerX, confirmY + 30);

    // Warning text
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillText('Current game progress will be lost.', centerX, confirmY + 80);
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillText('Your money will be saved.', centerX, confirmY + 110);

    // Confirmation buttons
    const buttons = getQuitConfirmButtons(panelX, confirmY);
    for (const button of buttons) {
        renderButton(ctx, button);
    }
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle pointer down on pause menu.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {{action: string, data?: any} | null} Action to perform, or null if not handled
 */
export function handlePointerDown(x, y) {
    if (!isVisible || !panelPosition) return null;

    // If showing options, handle volume controls
    if (showingOptions) {
        if (VolumeControls.handlePointerDown(x, y)) {
            return { action: 'handled' };
        }

        // Check back button
        const centerX = CANVAS.DESIGN_WIDTH / 2;
        const centerY = CANVAS.DESIGN_HEIGHT / 2;
        const backButton = {
            x: centerX - 60,
            y: centerY + VolumeControls.getPanelDimensions().height / 2 + 30,
            width: 120,
            height: 40
        };

        if (isInsideButton(x, y, backButton)) {
            showingOptions = false;
            VolumeControls.reset();
            Sound.playClickSound();
            return { action: 'handled' };
        }

        // Click outside - close options
        const panelDims = VolumeControls.getPanelDimensions();
        const panelX = centerX - panelDims.width / 2;
        const panelY = centerY - panelDims.height / 2;
        const isInsidePanel = (
            x >= panelX && x <= panelX + panelDims.width &&
            y >= panelY && y <= panelY + panelDims.height + 80 // Include back button area
        );

        if (!isInsidePanel) {
            showingOptions = false;
            VolumeControls.reset();
            Sound.playClickSound();
            return { action: 'handled' };
        }

        return null;
    }

    // If showing quit confirmation
    if (showingQuitConfirm) {
        const confirmY = CANVAS.DESIGN_HEIGHT / 2 - 130;
        const buttons = getQuitConfirmButtons(panelPosition.x, confirmY);

        for (const button of buttons) {
            if (isInsideButton(x, y, button)) {
                Sound.playClickSound();
                if (button.id === 'confirm_yes') {
                    return { action: 'quit' };
                } else {
                    showingQuitConfirm = false;
                    return { action: 'handled' };
                }
            }
        }

        // Click outside confirmation - cancel
        return { action: 'handled' };
    }

    // Check main buttons
    const buttons = getButtons(panelPosition.x, panelPosition.y);

    for (const button of buttons) {
        if (isInsideButton(x, y, button)) {
            Sound.playClickSound();

            switch (button.id) {
                case 'resume':
                    return { action: 'resume' };
                case 'options':
                    showingOptions = true;
                    return { action: 'handled' };
                case 'quit':
                    showingQuitConfirm = true;
                    return { action: 'handled' };
            }
        }
    }

    // Click outside panel - close (resume)
    // But only if enough time has passed since showing (prevents immediate close on same click)
    const isInsidePanel = (
        x >= panelPosition.x &&
        x <= panelPosition.x + PAUSE_PANEL.WIDTH &&
        y >= panelPosition.y &&
        y <= panelPosition.y + PAUSE_PANEL.HEIGHT
    );

    if (!isInsidePanel) {
        const timeSinceShow = performance.now() - showTimestamp;
        if (timeSinceShow > CLICK_OUTSIDE_DELAY) {
            return { action: 'resume' };
        }
        // Ignore clicks that came in too soon after showing (same click that opened menu)
        return null;
    }

    return null;
}

/**
 * Handle pointer move for slider dragging.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if handling a drag
 */
export function handlePointerMove(x, y) {
    if (!isVisible) return false;

    if (showingOptions) {
        return VolumeControls.handlePointerMove(x, y);
    }

    return false;
}

/**
 * Handle pointer up to end slider drag.
 * @returns {boolean} True if was dragging
 */
export function handlePointerUp() {
    if (!isVisible) return false;

    if (showingOptions) {
        return VolumeControls.handlePointerUp();
    }

    return false;
}

/**
 * Handle escape key press.
 * @returns {{action: string} | null} Action to perform
 */
export function handleEscape() {
    if (!isVisible) return null;

    Sound.playClickSound();

    if (showingOptions) {
        showingOptions = false;
        VolumeControls.reset();
        return { action: 'handled' };
    }

    if (showingQuitConfirm) {
        showingQuitConfirm = false;
        return { action: 'handled' };
    }

    return { action: 'resume' };
}

/**
 * Check if a point is inside a button.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} button - Button bounds
 * @returns {boolean} True if inside
 */
function isInsideButton(x, y, button) {
    return (
        x >= button.x &&
        x <= button.x + button.width &&
        y >= button.y &&
        y <= button.y + button.height
    );
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Show the pause menu.
 * @param {string} fromState - State we're pausing from (to return to on resume)
 */
export function show(fromState) {
    isVisible = true;
    previousState = fromState;
    showingOptions = false;
    showingQuitConfirm = false;
    showTimestamp = performance.now();
    console.log(`Pause menu opened from state: ${fromState}`);
}

/**
 * Hide the pause menu.
 */
export function hide() {
    isVisible = false;
    showingOptions = false;
    showingQuitConfirm = false;
    VolumeControls.reset();
    console.log('Pause menu closed');
}

/**
 * Check if pause menu is currently visible.
 * @returns {boolean} True if visible
 */
export function isShowing() {
    return isVisible;
}

/**
 * Get the state to return to when resuming.
 * @returns {string|null} Previous state
 */
export function getPreviousState() {
    return previousState;
}

/**
 * Check if any sub-panel (options or quit confirm) is showing.
 * @returns {boolean} True if a sub-panel is open
 */
export function isSubPanelOpen() {
    return showingOptions || showingQuitConfirm;
}

/**
 * Get panel dimensions for layout purposes.
 * @returns {{width: number, height: number}}
 */
export function getPanelDimensions() {
    return {
        width: PAUSE_PANEL.WIDTH,
        height: PAUSE_PANEL.HEIGHT
    };
}
