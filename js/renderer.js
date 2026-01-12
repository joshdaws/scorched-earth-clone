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
 * Resize canvas to fill available screen space (no letterboxing).
 * Now uses dynamic screen sizing module for fully adaptive dimensions.
 * Accounts for safe areas and devicePixelRatio for crisp rendering.
 *
 * The canvas fills the entire usable viewport area after accounting for
 * safe area insets (notch, Dynamic Island, home indicator).
 */
export function resizeCanvas() {
    if (!canvas) return;

    // Get dynamic screen dimensions from screenSize module
    const screenW = getScreenWidth();
    const screenH = getScreenHeight();
    const safeArea = getSafeAreaInsets();

    // Get current device pixel ratio
    devicePixelRatio = getScreenDPR();

    // Display size = usable screen area (CSS pixels)
    // No aspect ratio constraints - fill the available space
    const displayWidth = screenW;
    const displayHeight = screenH;

    // Set CSS display size
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Position canvas to account for safe areas
    // Safe area left/top push the canvas inward from the edges
    canvas.style.position = 'absolute';
    canvas.style.left = `${safeArea.left}px`;
    canvas.style.top = `${safeArea.top}px`;

    // Set internal resolution (physical pixels for crisp rendering)
    const resolutionWidth = getCanvasResolutionWidth();
    const resolutionHeight = getCanvasResolutionHeight();

    canvas.width = resolutionWidth;
    canvas.height = resolutionHeight;

    // Calculate scale factor: with dynamic sizing, this is simply DPR
    // since screen dimensions = design dimensions (1:1 mapping)
    scaleFactor = devicePixelRatio;

    // Scale the context to account for device pixel ratio
    // Drawing in screen coordinates, scaled up for high-DPI
    if (ctx) {
        ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    }

    console.log(
        `Canvas resized: display=${Math.round(displayWidth)}x${Math.round(displayHeight)}, ` +
        `resolution=${resolutionWidth}x${resolutionHeight}, ` +
        `dpr=${devicePixelRatio}, scale=${scaleFactor.toFixed(3)}, ` +
        `safeArea: L${safeArea.left.toFixed(0)} R${safeArea.right.toFixed(0)} ` +
        `T${safeArea.top.toFixed(0)} B${safeArea.bottom.toFixed(0)}`
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
 * With dynamic sizing, screen coordinates map 1:1 to design coordinates
 * (after accounting for canvas position).
 * @param {number} screenX - X coordinate from mouse/touch event
 * @param {number} screenY - Y coordinate from mouse/touch event
 * @returns {{x: number, y: number}} Design coordinates
 */
export function screenToDesign(screenX, screenY) {
    if (!canvas) return { x: 0, y: 0 };

    // Get canvas bounding rect (accounts for CSS positioning and safe areas)
    const rect = canvas.getBoundingClientRect();

    // Convert screen coords to position relative to canvas display
    // With dynamic sizing, this is a 1:1 mapping (no scaling needed)
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    return {
        x: canvasX,
        y: canvasY
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
