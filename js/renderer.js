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
    getCanvasResolutionWidth,
    getCanvasResolutionHeight,
    getDevicePixelRatio as getScreenDPR,
    getSafeAreaInsets,
    getGameScale,
    getDisplayDimensions,
    getDisplayOffset,
    onResize
} from './screenSize.js';

// Canvas and context references
let canvas = null;
let ctx = null;

// Scaling state for coordinate conversion
// scaleFactor converts from design coordinates (1200x800) to actual canvas coordinates
let scaleFactor = 1;
let devicePixelRatio = 1;

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
 * Resize canvas to fit design dimensions (1200x800) into available space.
 * Maintains aspect ratio with letterboxing if needed.
 * Accounts for safe areas and devicePixelRatio for crisp rendering.
 *
 * The game always operates in design coordinates (1200x800). The canvas
 * transform scales all rendering to fit the actual screen size.
 */
export function resizeCanvas() {
    if (!canvas) return;

    // Get display dimensions from screenSize module
    const displayDims = getDisplayDimensions();
    const displayOffset = getDisplayOffset();
    const safeArea = getSafeAreaInsets();
    const gameScale = getGameScale();

    // Get current device pixel ratio
    devicePixelRatio = getScreenDPR();

    // Set CSS display size (may be smaller than viewport due to letterboxing)
    canvas.style.width = `${displayDims.width}px`;
    canvas.style.height = `${displayDims.height}px`;

    // Position canvas to account for safe areas and letterbox centering
    canvas.style.position = 'absolute';
    canvas.style.left = `${safeArea.left + displayOffset.x}px`;
    canvas.style.top = `${safeArea.top + displayOffset.y}px`;

    // Set internal resolution (physical pixels for crisp rendering)
    const resolutionWidth = getCanvasResolutionWidth();
    const resolutionHeight = getCanvasResolutionHeight();

    canvas.width = resolutionWidth;
    canvas.height = resolutionHeight;

    // Combined scale factor: gameScale (design->screen) * DPR (screen->physical)
    scaleFactor = gameScale * devicePixelRatio;

    // Scale the context to account for both game scaling and device pixel ratio
    // All drawing is done in design coordinates (1200x800), scaled to fit screen
    if (ctx) {
        ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    }

    console.log(
        `Canvas resized: design=${getScreenWidth()}x${getScreenHeight()}, ` +
        `display=${Math.round(displayDims.width)}x${Math.round(displayDims.height)}, ` +
        `resolution=${resolutionWidth}x${resolutionHeight}, ` +
        `gameScale=${gameScale.toFixed(3)}, dpr=${devicePixelRatio}, ` +
        `combined=${scaleFactor.toFixed(3)}`
    );
}

/**
 * Clear the canvas with the background color.
 * Uses dynamic screen dimensions.
 */
export function clear() {
    if (!ctx) return;
    ctx.fillStyle = COLORS.BACKGROUND;
    // Use dynamic screen dimensions
    ctx.fillRect(0, 0, getScreenWidth(), getScreenHeight());
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

    // Scale from display pixels to design pixels
    const gameScale = getGameScale();
    return {
        x: canvasX / gameScale,
        y: canvasY / gameScale
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
