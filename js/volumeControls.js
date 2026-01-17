/**
 * Scorched Earth: Synthwave Edition
 * Volume Controls UI Module
 *
 * Renders volume sliders and mute button with synthwave styling.
 * Can be integrated into pause menu or options screen.
 */

import { COLORS, UI, CANVAS } from './constants.js';
import * as Renderer from './renderer.js';
import * as Sound from './sound.js';
import { isCrtEnabled, toggleCrt } from './effects.js';
import * as ControlSettings from './controls/controlSettings.js';

// =============================================================================
// LAYOUT CONFIGURATION
// =============================================================================

/**
 * Volume controls panel dimensions and styling.
 * Designed to be centered or positioned by the parent container.
 * Touch-optimized: larger handles and increased spacing for easy tapping.
 */
const VOLUME_PANEL = {
    WIDTH: 340,
    HEIGHT: 520,               // Increased to fit control settings
    PADDING: 24,
    SLIDER_HEIGHT: 12,         // Thicker track for easier tapping
    SLIDER_WIDTH: 260,
    SLIDER_SPACING: 56,        // More space between sliders
    HANDLE_RADIUS: 18,         // Touch-friendly: 36px diameter exceeds 44px hit area with padding
    LABEL_OFFSET: 28,
    BUTTON_WIDTH: 120,         // Standard button width
    BUTTON_HEIGHT: 48,         // Touch-friendly height
    BUTTON_SPACING: 12,        // Space between buttons
    TOGGLE_HEIGHT: 40,         // Height for toggle buttons (control mode, trajectory)
    TOGGLE_SPACING: 10         // Spacing between toggle rows
};

// =============================================================================
// CALLBACKS
// =============================================================================

/** @type {Function|null} Callback when Change Name button is clicked */
let onChangeNameCallback = null;

/** @type {Function|null} Callback when Close button is clicked */
let onCloseCallback = null;

/**
 * Set callback for Change Name button.
 * @param {Function} callback - Function to call when Change Name is clicked
 */
export function setChangeNameCallback(callback) {
    onChangeNameCallback = callback;
}

/**
 * Set callback for Close button.
 * @param {Function} callback - Function to call when Close is clicked
 */
export function setCloseCallback(callback) {
    onCloseCallback = callback;
}

// =============================================================================
// INTERACTION STATE
// =============================================================================

/** @type {'master' | 'music' | 'sfx' | null} Currently dragging slider */
let draggingSlider = null;

/** @type {{x: number, y: number} | null} Panel position (set by render call) */
let panelPosition = null;

// =============================================================================
// SLIDER DEFINITIONS
// =============================================================================

/**
 * Get slider definitions with current positions.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {Array<{id: string, label: string, y: number, getValue: Function, setValue: Function}>}
 */
function getSliders(panelX, panelY) {
    const sliderX = panelX + (VOLUME_PANEL.WIDTH - VOLUME_PANEL.SLIDER_WIDTH) / 2;
    const startY = panelY + 60;

    return [
        {
            id: 'master',
            label: 'MASTER',
            x: sliderX,
            y: startY,
            getValue: () => Sound.getMasterVolume(),
            setValue: (v) => Sound.setMasterVolume(v)
        },
        {
            id: 'music',
            label: 'MUSIC',
            x: sliderX,
            y: startY + VOLUME_PANEL.SLIDER_SPACING,
            getValue: () => Sound.getMusicVolume(),
            setValue: (v) => Sound.setMusicVolume(v)
        },
        {
            id: 'sfx',
            label: 'SFX',
            x: sliderX,
            y: startY + VOLUME_PANEL.SLIDER_SPACING * 2,
            getValue: () => Sound.getSfxVolume(),
            setValue: (v) => Sound.setSfxVolume(v)
        }
    ];
}

/**
 * Get mute button bounds.
 * Touch-optimized: button is 120x48px for easy tapping.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function getMuteButton(panelX, panelY) {
    const totalWidth = VOLUME_PANEL.BUTTON_WIDTH * 2 + VOLUME_PANEL.BUTTON_SPACING;
    const startX = panelX + (VOLUME_PANEL.WIDTH - totalWidth) / 2;
    // Position below trajectory toggle (290 + 40 height + 12 spacing = 342)
    return {
        x: startX,
        y: panelY + 342,
        width: VOLUME_PANEL.BUTTON_WIDTH,
        height: VOLUME_PANEL.BUTTON_HEIGHT
    };
}

/**
 * Get CRT effects toggle button bounds.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function getCrtButton(panelX, panelY) {
    const totalWidth = VOLUME_PANEL.BUTTON_WIDTH * 2 + VOLUME_PANEL.BUTTON_SPACING;
    const startX = panelX + (VOLUME_PANEL.WIDTH - totalWidth) / 2;
    // Same row as mute button (Y=342)
    return {
        x: startX + VOLUME_PANEL.BUTTON_WIDTH + VOLUME_PANEL.BUTTON_SPACING,
        y: panelY + 342,
        width: VOLUME_PANEL.BUTTON_WIDTH,
        height: VOLUME_PANEL.BUTTON_HEIGHT
    };
}

/**
 * Get Control Mode toggle button bounds.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {{x: number, y: number, width: number, height: number, labelWidth: number}}
 */
function getControlModeButton(panelX, panelY) {
    // Position below the sliders with proper spacing above mute/CRT row
    // Sliders end around Y=220, so start this section at Y=240
    const buttonY = panelY + 240;
    return {
        x: panelX + VOLUME_PANEL.PADDING,
        y: buttonY,
        width: VOLUME_PANEL.WIDTH - VOLUME_PANEL.PADDING * 2,
        height: VOLUME_PANEL.TOGGLE_HEIGHT,
        labelWidth: 130  // Width for the label portion
    };
}

/**
 * Get Trajectory Preview toggle button bounds.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {{x: number, y: number, width: number, height: number, labelWidth: number}}
 */
function getTrajectoryButton(panelX, panelY) {
    // Position below control mode (240 + 40 height + 10 spacing = 290)
    const buttonY = panelY + 240 + VOLUME_PANEL.TOGGLE_HEIGHT + VOLUME_PANEL.TOGGLE_SPACING;
    return {
        x: panelX + VOLUME_PANEL.PADDING,
        y: buttonY,
        width: VOLUME_PANEL.WIDTH - VOLUME_PANEL.PADDING * 2,
        height: VOLUME_PANEL.TOGGLE_HEIGHT,
        labelWidth: 130  // Width for the label portion
    };
}

/**
 * Get Change Name button bounds.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function getChangeNameButton(panelX, panelY) {
    // Centered, full width-ish button below mute/CRT row (342 + 48 height + 12 spacing = 402)
    const buttonWidth = VOLUME_PANEL.WIDTH - VOLUME_PANEL.PADDING * 2;
    return {
        x: panelX + VOLUME_PANEL.PADDING,
        y: panelY + 402,
        width: buttonWidth,
        height: VOLUME_PANEL.BUTTON_HEIGHT
    };
}

/**
 * Get Close button bounds.
 * Positioned to overlap the top-right corner of the modal (partially outside).
 * Touch-optimized: 44x44px for easy tapping on mobile.
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {{x: number, y: number, width: number, height: number, radius: number}}
 */
function getCloseButton(panelX, panelY) {
    const radius = 18; // Circle radius
    const size = radius * 2; // Hit area size
    // Position so circle overlaps the corner (centered on corner with slight offset inward)
    const centerX = panelX + VOLUME_PANEL.WIDTH - 12;
    const centerY = panelY + 12;
    return {
        x: centerX - radius,
        y: centerY - radius,
        width: size,
        height: size,
        radius: radius,
        centerX: centerX,
        centerY: centerY
    };
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render the volume controls panel.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} [centerX] - Center X position (defaults to canvas center)
 * @param {number} [centerY] - Center Y position (defaults to canvas center)
 */
export function render(ctx, centerX = Renderer.getWidth() / 2, centerY = Renderer.getHeight() / 2) {
    if (!ctx) return;

    const panelX = centerX - VOLUME_PANEL.WIDTH / 2;
    const panelY = centerY - VOLUME_PANEL.HEIGHT / 2;
    panelPosition = { x: panelX, y: panelY };

    ctx.save();

    // Panel background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, VOLUME_PANEL.WIDTH, VOLUME_PANEL.HEIGHT, 8);
    ctx.fill();

    // Panel border with glow
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SETTINGS', centerX, panelY + VOLUME_PANEL.PADDING);

    // Render sliders
    const sliders = getSliders(panelX, panelY);
    for (const slider of sliders) {
        renderSlider(ctx, slider);
    }

    // Render mute button
    renderMuteButton(ctx, getMuteButton(panelX, panelY));

    // Render CRT effects toggle button
    renderCrtButton(ctx, getCrtButton(panelX, panelY));

    // Render Control Mode toggle
    renderControlModeButton(ctx, getControlModeButton(panelX, panelY));

    // Render Trajectory Preview toggle
    renderTrajectoryButton(ctx, getTrajectoryButton(panelX, panelY));

    // Render Change Name button
    renderChangeNameButton(ctx, getChangeNameButton(panelX, panelY));

    ctx.restore();

    // Render Close button AFTER restore so it can overlap the panel corner
    renderCloseButton(ctx, getCloseButton(panelX, panelY));
}

/**
 * Render a single volume slider.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} slider - Slider definition
 */
function renderSlider(ctx, slider) {
    const value = slider.getValue();
    const handleX = slider.x + value * VOLUME_PANEL.SLIDER_WIDTH;

    // Label
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(slider.label, slider.x, slider.y - 6);

    // Percentage value
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.fillText(`${Math.round(value * 100)}%`, slider.x + VOLUME_PANEL.SLIDER_WIDTH, slider.y - 6);

    // Slider track (background)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(slider.x, slider.y, VOLUME_PANEL.SLIDER_WIDTH, VOLUME_PANEL.SLIDER_HEIGHT, 4);
    ctx.fill();

    // Slider filled portion
    if (value > 0) {
        const gradient = ctx.createLinearGradient(slider.x, slider.y, slider.x + value * VOLUME_PANEL.SLIDER_WIDTH, slider.y);
        gradient.addColorStop(0, COLORS.NEON_PURPLE);
        gradient.addColorStop(1, COLORS.NEON_CYAN);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(slider.x, slider.y, value * VOLUME_PANEL.SLIDER_WIDTH, VOLUME_PANEL.SLIDER_HEIGHT, 4);
        ctx.fill();
    }

    // Slider handle
    ctx.beginPath();
    ctx.arc(handleX, slider.y + VOLUME_PANEL.SLIDER_HEIGHT / 2, VOLUME_PANEL.HANDLE_RADIUS, 0, Math.PI * 2);

    // Handle glow when dragging
    if (draggingSlider === slider.id) {
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 10;
    }

    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.fill();

    // Handle border
    ctx.strokeStyle = COLORS.TEXT_LIGHT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

/**
 * Render the mute button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button bounds
 */
function renderMuteButton(ctx, button) {
    const isMuted = Sound.getMuted();

    ctx.save();

    // Button background
    ctx.fillStyle = isMuted ? 'rgba(255, 42, 109, 0.3)' : 'rgba(5, 217, 232, 0.2)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = isMuted ? COLORS.NEON_PINK : COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Button text
    ctx.fillStyle = isMuted ? COLORS.NEON_PINK : COLORS.NEON_CYAN;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isMuted ? 'UNMUTE' : 'MUTE', button.x + button.width / 2, button.y + button.height / 2);

    ctx.restore();
}

/**
 * Render the CRT effects toggle button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button bounds
 */
function renderCrtButton(ctx, button) {
    const crtOn = isCrtEnabled();

    ctx.save();

    // Button background - purple theme to distinguish from audio controls
    ctx.fillStyle = crtOn ? 'rgba(211, 0, 197, 0.3)' : 'rgba(211, 0, 197, 0.1)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = COLORS.NEON_PURPLE;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Button text
    ctx.fillStyle = crtOn ? COLORS.NEON_PURPLE : COLORS.TEXT_MUTED;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(crtOn ? 'CRT ON' : 'CRT OFF', button.x + button.width / 2, button.y + button.height / 2);

    ctx.restore();
}

/**
 * Render the Control Mode toggle button.
 * Shows a label on the left and current mode value on the right.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button bounds with labelWidth
 */
function renderControlModeButton(ctx, button) {
    const modeLabel = ControlSettings.getControlModeLabel();

    ctx.save();

    // Full button background
    ctx.fillStyle = 'rgba(5, 217, 232, 0.1)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label on left side
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('CONTROLS', button.x + 12, button.y + button.height / 2);

    // Value button on right side
    const valueX = button.x + button.labelWidth;
    const valueWidth = button.width - button.labelWidth;

    ctx.fillStyle = 'rgba(5, 217, 232, 0.2)';
    ctx.beginPath();
    ctx.roundRect(valueX, button.y + 4, valueWidth - 4, button.height - 8, 4);
    ctx.fill();

    // Value text
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(modeLabel, valueX + valueWidth / 2, button.y + button.height / 2);

    ctx.restore();
}

/**
 * Render the Trajectory Preview toggle button.
 * Shows a label on the left and current mode value on the right.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button bounds with labelWidth
 */
function renderTrajectoryButton(ctx, button) {
    const modeLabel = ControlSettings.getTrajectoryModeLabel();

    ctx.save();

    // Full button background
    ctx.fillStyle = 'rgba(255, 42, 109, 0.1)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = COLORS.NEON_PINK;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label on left side
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TRAJECTORY', button.x + 12, button.y + button.height / 2);

    // Value button on right side
    const valueX = button.x + button.labelWidth;
    const valueWidth = button.width - button.labelWidth;

    ctx.fillStyle = 'rgba(255, 42, 109, 0.2)';
    ctx.beginPath();
    ctx.roundRect(valueX, button.y + 4, valueWidth - 4, button.height - 8, 4);
    ctx.fill();

    // Value text
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(modeLabel, valueX + valueWidth / 2, button.y + button.height / 2);

    ctx.restore();
}

/**
 * Render the Change Name button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button bounds
 */
function renderChangeNameButton(ctx, button) {
    ctx.save();

    // Button background - yellow/gold theme for profile actions
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = COLORS.NEON_YELLOW;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Button text
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHANGE NAME', button.x + button.width / 2, button.y + button.height / 2);

    ctx.restore();
}

/**
 * Render the Close (X) button.
 * Styled as a circle overlapping the modal corner with white X centered inside.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button bounds with centerX, centerY, radius
 */
function renderCloseButton(ctx, button) {
    ctx.save();

    const { centerX, centerY, radius } = button;
    const xSize = 7; // Size of the X lines (with padding from circle edge)

    // Circle background with glow
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 8;
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Circle border (white for contrast)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw white X with proper padding inside circle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // First line of X (top-left to bottom-right)
    ctx.beginPath();
    ctx.moveTo(centerX - xSize, centerY - xSize);
    ctx.lineTo(centerX + xSize, centerY + xSize);
    ctx.stroke();

    // Second line of X (top-right to bottom-left)
    ctx.beginPath();
    ctx.moveTo(centerX + xSize, centerY - xSize);
    ctx.lineTo(centerX - xSize, centerY + xSize);
    ctx.stroke();

    ctx.restore();
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle pointer down on volume controls.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if the click was handled
 */
export function handlePointerDown(x, y) {
    if (!panelPosition) return false;

    const sliders = getSliders(panelPosition.x, panelPosition.y);

    // Check sliders
    for (const slider of sliders) {
        if (isInsideSlider(x, y, slider)) {
            draggingSlider = slider.id;
            updateSliderValue(x, slider);
            Sound.playClickSound();
            return true;
        }
    }

    // Check mute button
    const muteBtn = getMuteButton(panelPosition.x, panelPosition.y);
    if (isInsideButton(x, y, muteBtn)) {
        Sound.toggleMute();
        Sound.playClickSound();
        return true;
    }

    // Check CRT toggle button
    const crtBtn = getCrtButton(panelPosition.x, panelPosition.y);
    if (isInsideButton(x, y, crtBtn)) {
        toggleCrt();
        Sound.playClickSound();
        return true;
    }

    // Check Control Mode toggle button
    const controlModeBtn = getControlModeButton(panelPosition.x, panelPosition.y);
    if (isInsideButton(x, y, controlModeBtn)) {
        ControlSettings.cycleControlMode();
        Sound.playClickSound();
        return true;
    }

    // Check Trajectory Preview toggle button
    const trajectoryBtn = getTrajectoryButton(panelPosition.x, panelPosition.y);
    if (isInsideButton(x, y, trajectoryBtn)) {
        ControlSettings.cycleTrajectoryMode();
        Sound.playClickSound();
        return true;
    }

    // Check Change Name button
    const changeNameBtn = getChangeNameButton(panelPosition.x, panelPosition.y);
    if (isInsideButton(x, y, changeNameBtn)) {
        Sound.playClickSound();
        if (onChangeNameCallback) {
            onChangeNameCallback();
        }
        return true;
    }

    // Check Close button
    const closeBtn = getCloseButton(panelPosition.x, panelPosition.y);
    if (isInsideButton(x, y, closeBtn)) {
        Sound.playClickSound();
        if (onCloseCallback) {
            onCloseCallback();
        }
        return true;
    }

    return false;
}

/**
 * Handle pointer move for slider dragging.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if handling a drag
 */
export function handlePointerMove(x, y) {
    if (!draggingSlider || !panelPosition) return false;

    const sliders = getSliders(panelPosition.x, panelPosition.y);
    const slider = sliders.find(s => s.id === draggingSlider);

    if (slider) {
        updateSliderValue(x, slider);
    }

    return true;
}

/**
 * Handle pointer up to end slider drag.
 * @returns {boolean} True if was dragging
 */
export function handlePointerUp() {
    if (draggingSlider) {
        draggingSlider = null;
        return true;
    }
    return false;
}

/**
 * Check if a point is inside a slider's interactive area.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} slider - Slider definition
 * @returns {boolean} True if inside
 */
function isInsideSlider(x, y, slider) {
    const padding = VOLUME_PANEL.HANDLE_RADIUS;
    return (
        x >= slider.x - padding &&
        x <= slider.x + VOLUME_PANEL.SLIDER_WIDTH + padding &&
        y >= slider.y - padding &&
        y <= slider.y + VOLUME_PANEL.SLIDER_HEIGHT + padding
    );
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

/**
 * Update slider value based on pointer X position.
 * @param {number} x - X coordinate
 * @param {Object} slider - Slider definition
 */
function updateSliderValue(x, slider) {
    const relativeX = x - slider.x;
    const value = Math.max(0, Math.min(1, relativeX / VOLUME_PANEL.SLIDER_WIDTH));
    slider.setValue(value);
}

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Get panel dimensions for layout purposes.
 * @returns {{width: number, height: number}}
 */
export function getPanelDimensions() {
    return {
        width: VOLUME_PANEL.WIDTH,
        height: VOLUME_PANEL.HEIGHT
    };
}

/**
 * Check if volume controls are currently being interacted with.
 * @returns {boolean} True if dragging a slider
 */
export function isDragging() {
    return draggingSlider !== null;
}

/**
 * Reset interaction state.
 * Call when closing the menu/panel containing volume controls.
 */
export function reset() {
    draggingSlider = null;
    panelPosition = null;
}
