/**
 * Dynamic Screen Size Module for Scorched Earth: Synthwave Edition
 *
 * Makes canvas sizing fully dynamic - both width AND height adapt to the device screen.
 * No more fixed aspect ratio letterboxing; the game fills whatever space is available.
 *
 * Key responsibilities:
 * - Query actual viewport size
 * - Account for device pixel ratio for crisp rendering
 * - Subtract safe area insets to get usable game area
 * - Store computed dimensions centrally
 * - Fire resize events when dimensions change
 * - Expose getScreenWidth() and getScreenHeight() for other modules
 */

import { getSafeArea, initSafeArea, refreshSafeArea } from './safeArea.js';

/**
 * @typedef {Object} ScreenDimensions
 * @property {number} width - Usable game width in design-space pixels
 * @property {number} height - Usable game height in design-space pixels
 * @property {number} viewportWidth - Raw viewport width (CSS pixels)
 * @property {number} viewportHeight - Raw viewport height (CSS pixels)
 * @property {number} devicePixelRatio - Current device pixel ratio
 * @property {number} canvasResolutionWidth - Canvas buffer width (physical pixels)
 * @property {number} canvasResolutionHeight - Canvas buffer height (physical pixels)
 * @property {Object} safeArea - Safe area insets (in design-space pixels)
 */

// Cached screen dimensions
let screenDimensions = {
    width: 1200,    // Default fallback
    height: 800,    // Default fallback
    viewportWidth: 1200,
    viewportHeight: 800,
    devicePixelRatio: 1,
    canvasResolutionWidth: 1200,
    canvasResolutionHeight: 800,
    safeArea: { top: 0, bottom: 0, left: 0, right: 0 }
};

// Initialization flag
let initialized = false;

// Resize event listeners
const resizeListeners = [];

// Debounce timer for resize events
let resizeTimeout = null;
const RESIZE_DEBOUNCE_MS = 50;

/**
 * Calculate screen dimensions from viewport and safe area.
 * This is the core calculation that determines usable game area.
 * @returns {ScreenDimensions}
 */
function calculateDimensions() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Get safe area insets (already in design-space-equivalent values)
    // Note: safeArea.js converts from CSS pixels using the current canvas scale,
    // but since we're now using a 1:1 mapping (no fixed aspect ratio), we need
    // raw CSS pixel values instead.
    const safeArea = getSafeAreaRaw();

    // Calculate usable viewport after safe areas (in CSS pixels)
    // Safe areas carve out space for notch, Dynamic Island, home indicator
    const usableViewportWidth = viewportWidth - safeArea.left - safeArea.right;
    const usableViewportHeight = viewportHeight - safeArea.top - safeArea.bottom;

    // Canvas resolution (physical pixels) for crisp rendering
    const canvasResolutionWidth = Math.floor(usableViewportWidth * dpr);
    const canvasResolutionHeight = Math.floor(usableViewportHeight * dpr);

    // Game dimensions match usable viewport 1:1 (CSS pixels = design pixels)
    // This gives us the largest possible game area without letterboxing
    const width = usableViewportWidth;
    const height = usableViewportHeight;

    return {
        width,
        height,
        viewportWidth,
        viewportHeight,
        devicePixelRatio: dpr,
        canvasResolutionWidth,
        canvasResolutionHeight,
        safeArea
    };
}

/**
 * Get raw safe area insets in CSS pixels (not design-space converted).
 * We need raw values because we're doing a 1:1 CSS pixel to design pixel mapping.
 * @returns {{top: number, bottom: number, left: number, right: number}}
 */
function getSafeAreaRaw() {
    // Try to read from our measurement element
    const measureElement = document.getElementById('safe-area-measure');

    if (measureElement) {
        const computed = getComputedStyle(measureElement);
        return {
            top: parseFloat(computed.paddingTop) || 0,
            bottom: parseFloat(computed.paddingBottom) || 0,
            left: parseFloat(computed.paddingLeft) || 0,
            right: parseFloat(computed.paddingRight) || 0
        };
    }

    // Fallback: return zeros if safe area system not initialized
    return { top: 0, bottom: 0, left: 0, right: 0 };
}

/**
 * Update cached dimensions and notify listeners if changed.
 */
function updateDimensions() {
    const newDimensions = calculateDimensions();

    // Check if dimensions actually changed
    const changed =
        newDimensions.width !== screenDimensions.width ||
        newDimensions.height !== screenDimensions.height ||
        newDimensions.devicePixelRatio !== screenDimensions.devicePixelRatio;

    // Update cached values
    screenDimensions = newDimensions;

    // Log dimension changes for debugging
    console.log(
        `[ScreenSize] Dimensions updated: ${Math.round(screenDimensions.width)}x${Math.round(screenDimensions.height)} ` +
        `(viewport: ${screenDimensions.viewportWidth}x${screenDimensions.viewportHeight}, ` +
        `dpr: ${screenDimensions.devicePixelRatio}, ` +
        `safeArea: L${screenDimensions.safeArea.left.toFixed(0)} R${screenDimensions.safeArea.right.toFixed(0)} ` +
        `T${screenDimensions.safeArea.top.toFixed(0)} B${screenDimensions.safeArea.bottom.toFixed(0)})`
    );

    // Notify listeners if dimensions changed
    if (changed) {
        notifyResizeListeners();
    }

    return changed;
}

/**
 * Notify all registered resize listeners.
 */
function notifyResizeListeners() {
    const dimensions = { ...screenDimensions };
    resizeListeners.forEach(listener => {
        try {
            listener(dimensions);
        } catch (err) {
            console.error('[ScreenSize] Error in resize listener:', err);
        }
    });
}

/**
 * Debounced resize handler.
 */
function handleResize() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(() => {
        // Refresh safe area first (orientation may have changed)
        refreshSafeArea();
        updateDimensions();
        resizeTimeout = null;
    }, RESIZE_DEBOUNCE_MS);
}

/**
 * Initialize the screen size module.
 * Must be called before using getScreenWidth()/getScreenHeight().
 * Safe area module must be initialized first.
 */
export function initScreenSize() {
    if (initialized) {
        return;
    }

    // Ensure safe area is initialized (creates measurement element)
    initSafeArea();

    // Calculate initial dimensions
    updateDimensions();

    // Listen for resize and orientation changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        // Delay slightly to let browser recalculate safe areas
        setTimeout(handleResize, 100);
    });

    initialized = true;
    console.log('[ScreenSize] Initialized');
}

/**
 * Get the current usable screen width in design-space pixels.
 * This is the width available for game content after safe areas.
 * @returns {number}
 */
export function getScreenWidth() {
    return screenDimensions.width;
}

/**
 * Get the current usable screen height in design-space pixels.
 * This is the height available for game content after safe areas.
 * @returns {number}
 */
export function getScreenHeight() {
    return screenDimensions.height;
}

/**
 * Get all current screen dimensions.
 * Useful when you need multiple values at once.
 * @returns {ScreenDimensions}
 */
export function getScreenDimensions() {
    return { ...screenDimensions };
}

/**
 * Get the current device pixel ratio.
 * @returns {number}
 */
export function getDevicePixelRatio() {
    return screenDimensions.devicePixelRatio;
}

/**
 * Get the canvas resolution width (physical pixels).
 * Use this when setting canvas.width for crisp rendering.
 * @returns {number}
 */
export function getCanvasResolutionWidth() {
    return screenDimensions.canvasResolutionWidth;
}

/**
 * Get the canvas resolution height (physical pixels).
 * Use this when setting canvas.height for crisp rendering.
 * @returns {number}
 */
export function getCanvasResolutionHeight() {
    return screenDimensions.canvasResolutionHeight;
}

/**
 * Get the current safe area insets in CSS pixels.
 * @returns {{top: number, bottom: number, left: number, right: number}}
 */
export function getSafeAreaInsets() {
    return { ...screenDimensions.safeArea };
}

/**
 * Register a callback to be notified when screen dimensions change.
 * @param {function(ScreenDimensions): void} callback
 */
export function onResize(callback) {
    if (typeof callback === 'function' && !resizeListeners.includes(callback)) {
        resizeListeners.push(callback);
    }
}

/**
 * Unregister a resize callback.
 * @param {function(ScreenDimensions): void} callback
 */
export function offResize(callback) {
    const index = resizeListeners.indexOf(callback);
    if (index !== -1) {
        resizeListeners.splice(index, 1);
    }
}

/**
 * Force a dimension recalculation and notify listeners.
 * Useful after programmatic changes that affect layout.
 */
export function refreshScreenSize() {
    refreshSafeArea();
    updateDimensions();
}

/**
 * Check if dynamic screen sizing is initialized.
 * @returns {boolean}
 */
export function isInitialized() {
    return initialized;
}
