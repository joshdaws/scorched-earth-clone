/**
 * Scorched Earth: Synthwave Edition
 * Debug module - FPS counter and debug logging
 *
 * Provides debug overlay with FPS counter (rolling average) and
 * conditional debug logging. Can be toggled with 'D' key.
 */

import { DEBUG, COLORS, CANVAS } from './constants.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {boolean} Whether debug mode is currently enabled */
let enabled = DEBUG.ENABLED;

/** @type {number[]} Rolling buffer of frame times for FPS calculation */
let frameTimes = [];

/** @type {number} Timestamp of last frame */
let lastFrameTime = 0;

/** @type {number} Current calculated FPS (rolling average) */
let currentFps = 0;

/** @type {number} Current ms per frame */
let currentFrameMs = 0;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the debug module
 */
export function init() {
    enabled = DEBUG.ENABLED;
    frameTimes = [];
    lastFrameTime = performance.now();
    currentFps = 0;
    currentFrameMs = 0;
    log('Debug module initialized');
}

// =============================================================================
// FPS TRACKING
// =============================================================================

/**
 * Update FPS calculation. Call this once per frame.
 * Uses a rolling average over DEBUG.FPS_SAMPLE_SIZE frames for smooth display.
 * @param {number} currentTime - Current timestamp from requestAnimationFrame
 */
export function updateFps(currentTime) {
    if (!enabled) return;

    // Calculate frame time
    const frameTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // Add to rolling buffer
    frameTimes.push(frameTime);

    // Keep buffer at sample size
    if (frameTimes.length > DEBUG.FPS_SAMPLE_SIZE) {
        frameTimes.shift();
    }

    // Calculate rolling average
    if (frameTimes.length > 0) {
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        currentFrameMs = avgFrameTime;
        currentFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    }
}

/**
 * Get current FPS value
 * @returns {number} Current FPS (rolling average)
 */
export function getFps() {
    return currentFps;
}

/**
 * Get current frame time in milliseconds
 * @returns {number} Current ms per frame (rolling average)
 */
export function getFrameMs() {
    return currentFrameMs;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render the debug overlay on the canvas.
 * Displays FPS counter in the top-left corner.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
export function render(ctx) {
    if (!enabled || !ctx) return;

    // Save context state
    ctx.save();

    // Configure text style for debug display
    ctx.font = `bold ${DEBUG.FONT_SIZE}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Build debug text
    const fpsText = `FPS: ${Math.round(currentFps)}`;
    const msText = `${currentFrameMs.toFixed(2)} ms`;

    // Calculate text position (top-left corner, doesn't obstruct gameplay)
    const x = DEBUG.FPS_POSITION.x;
    const y = DEBUG.FPS_POSITION.y;

    // Draw semi-transparent background for readability
    const padding = 4;
    const lineHeight = DEBUG.FONT_SIZE + 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(
        x - padding,
        y - padding,
        100,
        lineHeight * 2 + padding * 2
    );

    // Draw FPS text with color coding
    // Green = 55+, Yellow = 30-55, Red = below 30
    if (currentFps >= 55) {
        ctx.fillStyle = '#00ff00'; // Green - good
    } else if (currentFps >= 30) {
        ctx.fillStyle = '#ffff00'; // Yellow - acceptable
    } else {
        ctx.fillStyle = '#ff0000'; // Red - poor
    }
    ctx.fillText(fpsText, x, y);

    // Draw frame time in cyan
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.fillText(msText, x, y + lineHeight);

    // Restore context state
    ctx.restore();
}

// =============================================================================
// DEBUG LOGGING
// =============================================================================

/**
 * Log a message to console only if debug mode is enabled.
 * @param {...any} args - Arguments to pass to console.log
 */
export function log(...args) {
    if (enabled) {
        console.log('[DEBUG]', ...args);
    }
}

/**
 * Log a warning to console only if debug mode is enabled.
 * @param {...any} args - Arguments to pass to console.warn
 */
export function warn(...args) {
    if (enabled) {
        console.warn('[DEBUG]', ...args);
    }
}

/**
 * Log an error to console (always logs, regardless of debug mode).
 * @param {...any} args - Arguments to pass to console.error
 */
export function error(...args) {
    console.error('[ERROR]', ...args);
}

// =============================================================================
// TOGGLE
// =============================================================================

/**
 * Toggle debug mode on/off
 * @returns {boolean} New debug mode state
 */
export function toggle() {
    enabled = !enabled;
    console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'} (press 'D' to toggle)`);
    return enabled;
}

/**
 * Set debug mode enabled state
 * @param {boolean} state - Whether to enable debug mode
 */
export function setEnabled(state) {
    enabled = state;
    log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if debug mode is currently enabled
 * @returns {boolean} True if debug mode is enabled
 */
export function isEnabled() {
    return enabled;
}
