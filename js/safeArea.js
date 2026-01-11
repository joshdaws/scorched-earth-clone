/**
 * Safe Area Insets Module for Scorched Earth: Synthwave Edition
 *
 * Queries iOS safe area insets so UI elements can avoid the notch,
 * Dynamic Island, and home indicator areas.
 *
 * Uses CSS env(safe-area-inset-*) values and converts them to design-space pixels.
 */

import { CANVAS } from './constants.js';

/**
 * @typedef {Object} SafeAreaInsets
 * @property {number} top - Top inset in design-space pixels
 * @property {number} bottom - Bottom inset in design-space pixels
 * @property {number} left - Left inset in design-space pixels
 * @property {number} right - Right inset in design-space pixels
 */

// Cached safe area values in design-space pixels
let cachedInsets = { top: 0, bottom: 0, left: 0, right: 0 };

// Flag to track initialization
let initialized = false;

// Hidden element used to measure CSS env() values
let measureElement = null;

/**
 * Create a hidden element to measure CSS env() safe area values.
 * We use CSS custom properties set from env() values, then read them via getComputedStyle.
 */
function createMeasureElement() {
    measureElement = document.createElement('div');
    measureElement.id = 'safe-area-measure';
    measureElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        visibility: hidden;
        pointer-events: none;
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        padding-right: env(safe-area-inset-right, 0px);
    `;
    document.body.appendChild(measureElement);
}

/**
 * Read raw safe area insets from CSS env() values in screen pixels.
 * @returns {SafeAreaInsets} Insets in screen (CSS) pixels
 */
function readRawInsets() {
    if (!measureElement) {
        return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const computed = getComputedStyle(measureElement);

    return {
        top: parseFloat(computed.paddingTop) || 0,
        bottom: parseFloat(computed.paddingBottom) || 0,
        left: parseFloat(computed.paddingLeft) || 0,
        right: parseFloat(computed.paddingRight) || 0
    };
}

/**
 * Convert screen pixels to design-space pixels.
 * Design space is CANVAS.DESIGN_WIDTH x CANVAS.DESIGN_HEIGHT (1200x800).
 * We need to account for how the canvas is scaled to fit the viewport.
 * @param {number} screenPixels - Value in screen (CSS) pixels
 * @returns {number} Value in design-space pixels
 */
function screenToDesignPixels(screenPixels) {
    // Get the current viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate the display size the same way renderer.js does
    const viewportAspect = viewportWidth / viewportHeight;
    let displayWidth;

    if (viewportAspect > CANVAS.ASPECT_RATIO) {
        // Viewport is wider - constrained by height
        const displayHeight = viewportHeight;
        displayWidth = displayHeight * CANVAS.ASPECT_RATIO;
    } else {
        // Viewport is taller - constrained by width
        displayWidth = viewportWidth;
    }

    // cssToDesign converts CSS/screen pixels to design pixels
    const cssToDesign = CANVAS.DESIGN_WIDTH / displayWidth;

    return screenPixels * cssToDesign;
}

/**
 * Update cached safe area insets (converts to design-space pixels).
 */
function updateCachedInsets() {
    const raw = readRawInsets();

    cachedInsets = {
        top: screenToDesignPixels(raw.top),
        bottom: screenToDesignPixels(raw.bottom),
        left: screenToDesignPixels(raw.left),
        right: screenToDesignPixels(raw.right)
    };

    console.log('[SafeArea] Updated insets (design-space):', cachedInsets);
}

/**
 * Initialize the safe area module.
 * Creates the measurement element and sets up orientation change listener.
 * Must be called before using getSafeArea().
 */
export function initSafeArea() {
    if (initialized) {
        return;
    }

    createMeasureElement();
    updateCachedInsets();

    // Listen for orientation changes and resize events
    // Both can affect safe area insets (especially on iOS)
    window.addEventListener('orientationchange', () => {
        // Delay update slightly to allow browser to recalculate layout
        setTimeout(updateCachedInsets, 100);
    });

    window.addEventListener('resize', () => {
        // Debounce resize events slightly
        setTimeout(updateCachedInsets, 50);
    });

    initialized = true;
    console.log('[SafeArea] Initialized');
}

/**
 * Get current safe area insets in design-space pixels.
 * Returns cached values for synchronous access.
 * @returns {SafeAreaInsets} Safe area insets in design-space pixels
 */
export function getSafeArea() {
    return { ...cachedInsets };
}

/**
 * Force refresh of safe area values.
 * Useful after programmatic orientation changes.
 */
export function refreshSafeArea() {
    updateCachedInsets();
}

/**
 * Check if device has any safe area insets (i.e., is a notched device).
 * @returns {boolean} True if any inset is non-zero
 */
export function hasNotch() {
    return cachedInsets.top > 0 ||
           cachedInsets.bottom > 0 ||
           cachedInsets.left > 0 ||
           cachedInsets.right > 0;
}
