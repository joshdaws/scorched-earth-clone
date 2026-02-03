/**
 * Scorched Earth: Synthwave Edition
 * Name Entry Module
 *
 * Handles player name entry and editing with synthwave styling.
 * Integrates with Convex API for persistence.
 */

import { COLORS, UI, CANVAS } from './constants.js';
import * as Renderer from './renderer.js';
import * as ConvexAPI from './convex-api.js';
import * as Sound from './sound.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Name entry panel configuration.
 */
const NAME_PANEL = {
    WIDTH: 400,
    HEIGHT: 280,
    PADDING: 24,
    INPUT_WIDTH: 320,
    INPUT_HEIGHT: 48,
    BUTTON_WIDTH: 140,
    BUTTON_HEIGHT: 48,
    BUTTON_SPACING: 20
};

/**
 * Name validation rules.
 */
const NAME_RULES = {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    ALLOWED_CHARS: /^[a-zA-Z0-9 _-]+$/
};

// =============================================================================
// STATE
// =============================================================================

/** @type {boolean} Whether the name entry modal is visible */
let isVisible = false;

/** @type {string} Current name being edited */
let currentName = '';

/** @type {string} Original name (for cancel) */
let originalName = '';

/** @type {boolean} Whether this is first-time entry */
let isFirstTime = false;

/** @type {Function|null} Callback when name is confirmed */
let onConfirmCallback = null;

/** @type {Function|null} Callback when dialog is dismissed */
let onDismissCallback = null;

/** @type {string|null} Current validation error */
let validationError = null;

/** @type {boolean} Whether we're currently saving */
let isSaving = false;

/** @type {number} Cursor blink timer */
let cursorBlinkTime = 0;

/** @type {boolean} Cursor visible state */
let cursorVisible = true;

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check if name entry is needed (first time player).
 * @returns {boolean} True if player needs to enter name
 */
export function needsNameEntry() {
    const storedName = ConvexAPI.getStoredPlayerName();
    return !storedName;
}

/**
 * Show the name entry modal.
 * @param {Object} options - Configuration options
 * @param {boolean} [options.isFirstTime=false] - Whether this is first-time entry
 * @param {Function} [options.onConfirm] - Called when name is confirmed
 * @param {Function} [options.onDismiss] - Called when dialog is dismissed
 */
export function show(options = {}) {
    isFirstTime = options.isFirstTime || false;
    onConfirmCallback = options.onConfirm || null;
    onDismissCallback = options.onDismiss || null;

    // Load current name
    originalName = ConvexAPI.getStoredPlayerName() || '';
    currentName = originalName;

    validationError = null;
    isSaving = false;
    isVisible = true;
    cursorBlinkTime = 0;
    cursorVisible = true;

    console.log('[NameEntry] Modal shown', { isFirstTime, currentName });
}

/**
 * Hide the name entry modal.
 */
export function hide() {
    isVisible = false;
    currentName = '';
    originalName = '';
    validationError = null;
    isSaving = false;
    onConfirmCallback = null;
    onDismissCallback = null;
}

/**
 * Check if the name entry modal is visible.
 * @returns {boolean} True if visible
 */
export function isOpen() {
    return isVisible;
}

/**
 * Get current name being edited.
 * @returns {string} Current name
 */
export function getCurrentName() {
    return currentName;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a player name.
 * @param {string} name - Name to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateName(name) {
    const trimmed = name.trim();

    if (trimmed.length < NAME_RULES.MIN_LENGTH) {
        return { valid: false, error: `Name must be at least ${NAME_RULES.MIN_LENGTH} characters` };
    }

    if (trimmed.length > NAME_RULES.MAX_LENGTH) {
        return { valid: false, error: `Name must be at most ${NAME_RULES.MAX_LENGTH} characters` };
    }

    if (!NAME_RULES.ALLOWED_CHARS.test(trimmed)) {
        return { valid: false, error: 'Only letters, numbers, spaces, _ and - allowed' };
    }

    return { valid: true };
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Generate a default player name.
 * @returns {string} Generated name
 */
function generateDefaultName() {
    const deviceId = ConvexAPI.getDeviceId();
    return `Player_${deviceId.substring(0, 8)}`;
}

/**
 * Confirm the name and save.
 */
async function confirmName() {
    const trimmedName = currentName.trim();
    const validation = validateName(trimmedName);

    if (!validation.valid) {
        validationError = validation.error;
        return;
    }

    isSaving = true;
    validationError = null;

    try {
        // Save to localStorage first
        ConvexAPI.setStoredPlayerName(trimmedName);

        // Then sync to server (non-blocking)
        ConvexAPI.updatePlayerName(trimmedName).catch(e => {
            console.warn('[NameEntry] Failed to sync name to server:', e);
        });

        console.log('[NameEntry] Name saved:', trimmedName);

        if (onConfirmCallback) {
            onConfirmCallback(trimmedName);
        }

        hide();
    } catch (e) {
        console.error('[NameEntry] Failed to save name:', e);
        validationError = 'Failed to save name';
        isSaving = false;
    }
}

/**
 * Skip name entry (use default).
 */
function skipNameEntry() {
    const defaultName = generateDefaultName();
    currentName = defaultName;
    confirmName();
}

/**
 * Cancel name entry.
 */
function cancelNameEntry() {
    if (onDismissCallback) {
        onDismissCallback();
    }
    hide();
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle keyboard input for name entry.
 * @param {KeyboardEvent} event - Keyboard event
 */
export function handleKeyDown(event) {
    if (!isVisible || isSaving) return;

    const key = event.key;

    if (key === 'Escape') {
        if (!isFirstTime) {
            cancelNameEntry();
        }
        event.preventDefault();
        return;
    }

    if (key === 'Enter') {
        confirmName();
        event.preventDefault();
        return;
    }

    if (key === 'Backspace') {
        currentName = currentName.slice(0, -1);
        validationError = null;
        event.preventDefault();
        return;
    }

    // Allow only valid characters
    if (key.length === 1 && NAME_RULES.ALLOWED_CHARS.test(key)) {
        if (currentName.length < NAME_RULES.MAX_LENGTH) {
            currentName += key;
            validationError = null;
        }
        event.preventDefault();
    }
}

/**
 * Handle click on the name entry modal.
 * @param {{x: number, y: number}} pos - Click position
 * @returns {boolean} True if click was handled
 */
export function handleClick(pos) {
    if (!isVisible || isSaving) return false;

    const panelX = (Renderer.getWidth() - NAME_PANEL.WIDTH) / 2;
    const panelY = (Renderer.getHeight() - NAME_PANEL.HEIGHT) / 2;

    // Check if click is inside panel
    const insidePanel = pos.x >= panelX && pos.x <= panelX + NAME_PANEL.WIDTH &&
                        pos.y >= panelY && pos.y <= panelY + NAME_PANEL.HEIGHT;

    if (!insidePanel) {
        // Click outside - cancel if not first time
        if (!isFirstTime) {
            cancelNameEntry();
        }
        return true;
    }

    // Button positions
    const buttonY = panelY + NAME_PANEL.HEIGHT - NAME_PANEL.PADDING - NAME_PANEL.BUTTON_HEIGHT;
    const totalButtonWidth = NAME_PANEL.BUTTON_WIDTH * 2 + NAME_PANEL.BUTTON_SPACING;
    const buttonStartX = panelX + (NAME_PANEL.WIDTH - totalButtonWidth) / 2;

    // Confirm button
    const confirmBtn = {
        x: buttonStartX,
        y: buttonY,
        width: NAME_PANEL.BUTTON_WIDTH,
        height: NAME_PANEL.BUTTON_HEIGHT
    };

    if (isInsideRect(pos, confirmBtn)) {
        Sound.playClickSound();
        confirmName();
        return true;
    }

    // Skip/Cancel button
    const skipBtn = {
        x: buttonStartX + NAME_PANEL.BUTTON_WIDTH + NAME_PANEL.BUTTON_SPACING,
        y: buttonY,
        width: NAME_PANEL.BUTTON_WIDTH,
        height: NAME_PANEL.BUTTON_HEIGHT
    };

    if (isInsideRect(pos, skipBtn)) {
        Sound.playClickSound();
        if (isFirstTime) {
            skipNameEntry();
        } else {
            cancelNameEntry();
        }
        return true;
    }

    return true;
}

/**
 * Check if a point is inside a rectangle.
 * @param {{x: number, y: number}} point - Point to check
 * @param {{x: number, y: number, width: number, height: number}} rect - Rectangle
 * @returns {boolean} True if inside
 */
function isInsideRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Update animation state.
 * @param {number} deltaTime - Time since last frame
 */
export function update(deltaTime) {
    if (!isVisible) return;

    // Cursor blink
    cursorBlinkTime += deltaTime;
    if (cursorBlinkTime >= 500) {
        cursorVisible = !cursorVisible;
        cursorBlinkTime = 0;
    }
}

/**
 * Render the name entry modal.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function render(ctx) {
    if (!isVisible) return;

    // Draw dark overlay in viewport coordinates to cover entire screen (including letterbox)
    const viewport = Renderer.getViewportDimensions();
    const dpr = Renderer.getDevicePixelRatio();

    ctx.save();
    // Reset to viewport coordinates (no game content transform)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Semi-transparent overlay - covers entire viewport
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    ctx.restore();

    ctx.save();

    // Panel position
    const panelX = (Renderer.getWidth() - NAME_PANEL.WIDTH) / 2;
    const panelY = (Renderer.getHeight() - NAME_PANEL.HEIGHT) / 2;

    // Panel background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, NAME_PANEL.WIDTH, NAME_PANEL.HEIGHT, 12);
    ctx.fill();

    // Panel border with glow
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.font = `bold 28px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fillText(isFirstTime ? 'ENTER YOUR NAME' : 'CHANGE NAME', panelX + NAME_PANEL.WIDTH / 2, panelY + 45);

    // Subtitle
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText(isFirstTime ? 'Set your leaderboard name (can change later)' : 'Update your display name',
                 panelX + NAME_PANEL.WIDTH / 2, panelY + 75);

    // Input field
    const inputX = panelX + (NAME_PANEL.WIDTH - NAME_PANEL.INPUT_WIDTH) / 2;
    const inputY = panelY + 110;

    // Input background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(inputX, inputY, NAME_PANEL.INPUT_WIDTH, NAME_PANEL.INPUT_HEIGHT, 8);
    ctx.fill();

    // Input border
    ctx.strokeStyle = validationError ? COLORS.NEON_PINK : COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Input text
    ctx.font = `24px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.TEXT_LIGHT;

    const displayText = currentName + (cursorVisible ? '|' : '');
    const textX = inputX + 15;
    const textY = inputY + NAME_PANEL.INPUT_HEIGHT / 2;
    ctx.fillText(displayText, textX, textY);

    // Character count
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = currentName.length > NAME_RULES.MAX_LENGTH - 3 ? COLORS.NEON_PINK : COLORS.TEXT_MUTED;
    ctx.fillText(`${currentName.length}/${NAME_RULES.MAX_LENGTH}`,
                 inputX + NAME_PANEL.INPUT_WIDTH - 10, inputY + NAME_PANEL.INPUT_HEIGHT + 18);

    // Validation error
    if (validationError) {
        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.NEON_PINK;
        ctx.fillText(validationError, inputX + 10, inputY + NAME_PANEL.INPUT_HEIGHT + 18);
    }

    // Buttons
    const buttonY = panelY + NAME_PANEL.HEIGHT - NAME_PANEL.PADDING - NAME_PANEL.BUTTON_HEIGHT;
    const totalButtonWidth = NAME_PANEL.BUTTON_WIDTH * 2 + NAME_PANEL.BUTTON_SPACING;
    const buttonStartX = panelX + (NAME_PANEL.WIDTH - totalButtonWidth) / 2;

    // Confirm button
    renderButton(ctx, {
        x: buttonStartX,
        y: buttonY,
        width: NAME_PANEL.BUTTON_WIDTH,
        height: NAME_PANEL.BUTTON_HEIGHT,
        text: isSaving ? 'SAVING...' : 'CONFIRM',
        color: COLORS.NEON_CYAN,
        disabled: isSaving
    });

    // Skip/Cancel button
    renderButton(ctx, {
        x: buttonStartX + NAME_PANEL.BUTTON_WIDTH + NAME_PANEL.BUTTON_SPACING,
        y: buttonY,
        width: NAME_PANEL.BUTTON_WIDTH,
        height: NAME_PANEL.BUTTON_HEIGHT,
        text: isFirstTime ? 'SKIP' : 'CANCEL',
        color: COLORS.TEXT_MUTED,
        disabled: isSaving
    });

    ctx.restore();
}

/**
 * Render a button.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} btn - Button configuration
 */
function renderButton(ctx, btn) {
    ctx.save();

    // Background
    ctx.fillStyle = btn.disabled ? 'rgba(30, 30, 50, 0.5)' : 'rgba(30, 30, 50, 0.8)';
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = btn.disabled ? COLORS.TEXT_MUTED : btn.color;
    ctx.lineWidth = 2;
    if (!btn.disabled) {
        ctx.shadowColor = btn.color;
        ctx.shadowBlur = 5;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Text
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = btn.disabled ? COLORS.TEXT_MUTED : btn.color;
    ctx.fillText(btn.text, btn.x + btn.width / 2, btn.y + btn.height / 2);

    ctx.restore();
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the name entry module.
 */
export function init() {
    console.log('[NameEntry] Module initialized');
}
