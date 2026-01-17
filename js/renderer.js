/**
 * Scorched Earth: Synthwave Edition
 * Canvas rendering module
 *
 * Updated to use dynamic screen sizing - canvas fills available space
 * rather than maintaining a fixed aspect ratio.
 */

import { CANVAS, COLORS } from './constants.js';
import {
    initScreenSize,
    getScreenWidth,
    getScreenHeight,
    getDevicePixelRatio as getScreenDPR,
    getSafeAreaInsets,
    getGameScale,
    getDisplayDimensions,
    getDisplayOffset,
    getScreenDimensions,
    onResize
} from './screenSize.js';

// Canvas and context references
let canvas = null;
let ctx = null;

// Scaling state for coordinate conversion
// scaleFactor converts from design coordinates (1200x800) to actual canvas coordinates
let scaleFactor = 1;
let devicePixelRatio = 1;

// Canvas viewport dimensions (usable viewport in CSS pixels, for full-screen CRT effects)
let canvasViewportWidth = 0;
let canvasViewportHeight = 0;

// Offset for centering game content within viewport (in physical pixels)
let contentOffsetX = 0;
let contentOffsetY = 0;

// Debounce timer for resize events
let resizeTimeout = null;
const RESIZE_DEBOUNCE_MS = 100;

/**
 * Initialize the renderer by getting canvas element by ID
 * @param {string} [canvasId='game'] - The canvas element ID
 * @returns {CanvasRenderingContext2D|null} The 2D context if successful, null otherwise
 */
export function init(canvasId = 'game') {
    // Get canvas element by ID
    canvas = document.getElementById(canvasId);

    if (!canvas) {
        console.error(`Renderer: Canvas element with id '${canvasId}' not found`);
        return null;
    }

    // Get 2D rendering context
    ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error('Renderer: Could not get 2D rendering context');
        return null;
    }

    // Initialize dynamic screen sizing (handles safe areas)
    initScreenSize();

    // Set initial canvas size
    resizeCanvas();

    // Handle window resize with debouncing
    window.addEventListener('resize', handleResize);

    // Handle mobile orientation changes
    window.addEventListener('orientationchange', handleResize);

    // Also listen to screen size module's resize events for coordinated updates
    onResize(() => {
        resizeCanvas();
    });

    console.log('Renderer initialized');
    return ctx;
}

/**
 * Debounced resize handler to avoid excessive resize calls
 */
function handleResize() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
        resizeCanvas();
        resizeTimeout = null;
    }, RESIZE_DEBOUNCE_MS);
}

/**
 * Resize canvas to fill the usable viewport (minus safe areas).
 * Game content is centered with letterboxing rendered within the canvas.
 * This allows CRT effects to cover the entire visible area.
 *
 * The game always operates in design coordinates (1200x800). The canvas
 * transform scales and offsets all rendering to center in the viewport.
 */
export function resizeCanvas() {
    if (!canvas) return;

    // Get all dimensions from screenSize module
    const screenDims = getScreenDimensions();
    const displayDims = getDisplayDimensions();
    const displayOffset = getDisplayOffset();
    const safeArea = getSafeAreaInsets();
    const gameScale = getGameScale();

    // Get current device pixel ratio
    devicePixelRatio = getScreenDPR();

    // Calculate usable viewport dimensions (CSS pixels)
    canvasViewportWidth = screenDims.viewportWidth - safeArea.left - safeArea.right;
    canvasViewportHeight = screenDims.viewportHeight - safeArea.top - safeArea.bottom;

    // Set CSS display size to fill the usable viewport
    canvas.style.width = `${canvasViewportWidth}px`;
    canvas.style.height = `${canvasViewportHeight}px`;

    // Position canvas at the start of usable area (after safe area insets)
    canvas.style.position = 'absolute';
    canvas.style.left = `${safeArea.left}px`;
    canvas.style.top = `${safeArea.top}px`;

    // Set internal resolution to match viewport at device pixel ratio
    const resolutionWidth = Math.floor(canvasViewportWidth * devicePixelRatio);
    const resolutionHeight = Math.floor(canvasViewportHeight * devicePixelRatio);

    canvas.width = resolutionWidth;
    canvas.height = resolutionHeight;

    // Combined scale factor: gameScale (design->screen) * DPR (screen->physical)
    scaleFactor = gameScale * devicePixelRatio;

    // Calculate offset to center game content within viewport (in physical pixels)
    // displayOffset is the letterbox offset in CSS pixels
    contentOffsetX = displayOffset.x * devicePixelRatio;
    contentOffsetY = displayOffset.y * devicePixelRatio;

    // Scale and translate the context to center game content
    // All game drawing is done in design coordinates (1200x800)
    if (ctx) {
        ctx.setTransform(scaleFactor, 0, 0, scaleFactor, contentOffsetX, contentOffsetY);
    }

    console.log(
        `Canvas resized: design=${getScreenWidth()}x${getScreenHeight()}, ` +
        `viewport=${Math.round(canvasViewportWidth)}x${Math.round(canvasViewportHeight)}, ` +
        `display=${Math.round(displayDims.width)}x${Math.round(displayDims.height)}, ` +
        `resolution=${resolutionWidth}x${resolutionHeight}, ` +
        `offset=(${Math.round(contentOffsetX)}, ${Math.round(contentOffsetY)}), ` +
        `gameScale=${gameScale.toFixed(3)}, dpr=${devicePixelRatio}`
    );
}

/**
 * Clear the entire canvas with the background color.
 * Clears both the game content area and letterbox regions.
 */
export function clear() {
    if (!ctx) return;

    // Save current transform
    ctx.save();

    // Reset to identity to clear entire viewport (including letterbox areas)
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvasViewportWidth, canvasViewportHeight);

    // Restore the game content transform
    ctx.restore();
}

/**
 * Get the screen width (game logic should use this)
 * Now returns dynamic width that adapts to the device screen.
 * @returns {number} Current screen width in design-space pixels
 */
export function getWidth() {
    return getScreenWidth();
}

/**
 * Get the screen height (game logic should use this)
 * Now returns dynamic height that adapts to the device screen.
 * @returns {number} Current screen height in design-space pixels
 */
export function getHeight() {
    return getScreenHeight();
}

/**
 * Get the actual canvas resolution width (for advanced use)
 * @returns {number} Actual canvas width in pixels
 */
export function getActualWidth() {
    return canvas ? canvas.width : 0;
}

/**
 * Get the actual canvas resolution height (for advanced use)
 * @returns {number} Actual canvas height in pixels
 */
export function getActualHeight() {
    return canvas ? canvas.height : 0;
}

/**
 * Get the current scale factor (design coordinates to canvas coordinates)
 * @returns {number} Scale factor
 */
export function getScaleFactor() {
    return scaleFactor;
}

/**
 * Get the current device pixel ratio
 * @returns {number} Device pixel ratio
 */
export function getDevicePixelRatio() {
    return devicePixelRatio;
}

/**
 * Get the canvas viewport dimensions (usable screen area in CSS pixels).
 * Use this for full-screen effects like CRT overlay that should cover
 * the entire canvas including letterbox areas.
 * @returns {{width: number, height: number}} Viewport dimensions in CSS pixels
 */
export function getViewportDimensions() {
    return {
        width: canvasViewportWidth,
        height: canvasViewportHeight
    };
}

/**
 * Get the content offset (for centering game content in viewport).
 * This is the letterbox offset in CSS pixels.
 * @returns {{x: number, y: number}} Offset in CSS pixels
 */
export function getContentOffset() {
    return {
        x: contentOffsetX / devicePixelRatio,
        y: contentOffsetY / devicePixelRatio
    };
}

/**
 * Convert screen/mouse coordinates to design coordinates.
 * Use this when handling mouse/touch events.
 *
 * Screen coordinates (from mouse/touch events) need to be:
 * 1. Offset by canvas position (bounding rect)
 * 2. Divided by gameScale to convert from display pixels to design pixels
 *
 * @param {number} screenX - X coordinate from mouse/touch event (clientX)
 * @param {number} screenY - Y coordinate from mouse/touch event (clientY)
 * @returns {{x: number, y: number}} Design coordinates (1200x800 space)
 */
export function screenToDesign(screenX, screenY) {
    if (!canvas) return { x: 0, y: 0 };

    // Get canvas bounding rect (accounts for CSS positioning and safe areas)
    const rect = canvas.getBoundingClientRect();

    // Convert screen coords to position relative to canvas display
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    // Subtract content offset (letterbox offset in CSS pixels)
    const offsetX = contentOffsetX / devicePixelRatio;
    const offsetY = contentOffsetY / devicePixelRatio;

    // Scale from display pixels to design pixels, accounting for content offset
    const gameScale = getGameScale();
    return {
        x: (canvasX - offsetX) / gameScale,
        y: (canvasY - offsetY) / gameScale
    };
}

/**
 * Get the 2D rendering context
 * @returns {CanvasRenderingContext2D|null} The 2D context
 */
export function getContext() {
    return ctx;
}

/**
 * Get the canvas element
 * @returns {HTMLCanvasElement|null} The canvas element
 */
export function getCanvas() {
    return canvas;
}
