/**
 * Scorched Earth: Synthwave Edition
 * Volume Controls UI Module
 *
 * Renders volume sliders and mute button with synthwave styling.
 * Can be integrated into pause menu or options screen.
 */

import { COLORS, UI, CANVAS } from './constants.js';
import * as Sound from './sound.js';

// =============================================================================
// LAYOUT CONFIGURATION
// =============================================================================

/**
 * Volume controls panel dimensions and styling.
 * Designed to be centered or positioned by the parent container.
 */
const VOLUME_PANEL = {
    WIDTH: 320,
    HEIGHT: 220,
    PADDING: 20,
    SLIDER_HEIGHT: 8,
    SLIDER_WIDTH: 240,
    SLIDER_SPACING: 50,
    HANDLE_RADIUS: 12,
    LABEL_OFFSET: 24
};

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
 * @param {number} panelX - Panel X position
 * @param {number} panelY - Panel Y position
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function getMuteButton(panelX, panelY) {
    return {
        x: panelX + (VOLUME_PANEL.WIDTH - 100) / 2,
        y: panelY + VOLUME_PANEL.HEIGHT - 50,
        width: 100,
        height: 32
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
export function render(ctx, centerX = CANVAS.DESIGN_WIDTH / 2, centerY = CANVAS.DESIGN_HEIGHT / 2) {
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
    ctx.fillText('AUDIO SETTINGS', centerX, panelY + VOLUME_PANEL.PADDING);

    // Render sliders
    const sliders = getSliders(panelX, panelY);
    for (const slider of sliders) {
        renderSlider(ctx, slider);
    }

    // Render mute button
    renderMuteButton(ctx, getMuteButton(panelX, panelY));

    ctx.restore();
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
