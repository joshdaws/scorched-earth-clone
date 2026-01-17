/**
 * Scorched Earth: Synthwave Edition
 * UI Positioning Helpers Module
 *
 * Provides edge-relative positioning helpers that work with fully dynamic
 * screen dimensions. All helpers query current screen size dynamically,
 * so UI elements automatically adapt to any screen size.
 *
 * Usage:
 *   import { fromLeft, fromRight, fromTop, fromBottom } from './uiPosition.js';
 *   // Position 20px from left edge, respecting safe area:
 *   const x = fromLeft(20);
 *   // Position 50px from bottom edge, respecting safe area:
 *   const y = fromBottom(50);
 */

import { getScreenWidth, getScreenHeight, getSafeAreaInsets, getGameScale, getDisplayDimensions } from './screenSize.js';

// =============================================================================
// EDGE-RELATIVE POSITIONING HELPERS
// =============================================================================

/**
 * Calculate X position from the left edge of the usable screen area.
 * Accounts for safe area insets on notched devices.
 * @param {number} offset - Distance from left edge in design pixels
 * @returns {number} X coordinate in design space
 */
export function fromLeft(offset) {
    // Safe area is already accounted for in screen dimensions,
    // so we just need to add the offset from 0
    return offset;
}

/**
 * Calculate X position from the right edge of the usable screen area.
 * Accounts for safe area insets on notched devices.
 * @param {number} offset - Distance from right edge in design pixels
 * @returns {number} X coordinate in design space
 */
export function fromRight(offset) {
    return getScreenWidth() - offset;
}

/**
 * Calculate Y position from the top edge of the usable screen area.
 * Accounts for safe area insets on notched devices.
 * @param {number} offset - Distance from top edge in design pixels
 * @returns {number} Y coordinate in design space
 */
export function fromTop(offset) {
    // Safe area is already accounted for in screen dimensions
    return offset;
}

/**
 * Calculate Y position from the bottom edge of the usable screen area.
 * Accounts for safe area insets on notched devices.
 * @param {number} offset - Distance from bottom edge in design pixels
 * @returns {number} Y coordinate in design space
 */
export function fromBottom(offset) {
    return getScreenHeight() - offset;
}

// =============================================================================
// CENTERED POSITIONING HELPERS
// =============================================================================

/**
 * Calculate X position for horizontally centered content.
 * @param {number} width - Width of the content to center (optional, default 0)
 * @returns {number} X coordinate for center (or left edge of centered content)
 */
export function centerX(width = 0) {
    return (getScreenWidth() - width) / 2;
}

/**
 * Calculate Y position for vertically centered content.
 * @param {number} height - Height of the content to center (optional, default 0)
 * @returns {number} Y coordinate for center (or top edge of centered content)
 */
export function centerY(height = 0) {
    return (getScreenHeight() - height) / 2;
}

// =============================================================================
// UI SCALING HELPERS
// =============================================================================

// Reference design dimensions
const REFERENCE_HEIGHT = 800;
const REFERENCE_WIDTH = 1200;

// Mobile screen threshold (display height in CSS pixels)
// Below this, we consider it a mobile device
const MOBILE_HEIGHT_THRESHOLD = 500;

/**
 * Check if the current device appears to be a mobile device based on display size.
 * Uses actual display height (not design height) as indicator.
 * Mobile landscape is typically <500px.
 * @returns {boolean} True if device appears to be mobile
 */
export function isMobileDevice() {
    const displayDims = getDisplayDimensions();
    return displayDims.height < MOBILE_HEIGHT_THRESHOLD;
}

/**
 * Calculate UI scale factor for values that need explicit scaling.
 *
 * With the unified canvas transform scaling system, most drawing is done
 * in design coordinates (1200x800) and the canvas transform handles scaling
 * to the actual display size. So getUIScale() returns 1.0 by default.
 *
 * The canvas transform already applies gameScale, so UI elements drawn
 * in design coordinates will scale automatically. Only use scaled() when
 * you need to compensate for something that doesn't go through the transform.
 *
 * @returns {number} Always returns 1.0 since canvas transform handles scaling
 */
export function getUIScale() {
    // Return 1.0 because the canvas transform already handles scaling.
    // All drawing is done in design coordinates (1200x800), and the
    // canvas context transform scales everything to fit the display.
    return 1.0;
}

/**
 * Scale a dimension by the current UI scale factor.
 * With the canvas transform handling scaling, this returns the value unchanged
 * since all drawing is done in design coordinates.
 * @param {number} value - Original dimension value (in design pixels)
 * @returns {number} Same value (canvas transform handles actual scaling)
 */
export function scaled(value) {
    return value * getUIScale();
}

/**
 * Ensure a touch target meets minimum size requirements.
 *
 * With canvas transform scaling, elements drawn in design coordinates are
 * automatically scaled. However, touch targets need to remain usable on
 * small screens. A 44px button in design coords might only be 22px on
 * a phone with gameScale=0.5 - too small to tap.
 *
 * This function returns the larger of:
 * - The original value (for large screens where gameScale >= 1)
 * - The minimum size divided by gameScale (ensures min display pixels)
 *
 * Apple HIG recommends 44pt minimum for touch targets.
 *
 * @param {number} value - Original dimension value (in design pixels)
 * @param {number} [minDisplaySize=44] - Minimum display size in CSS pixels
 * @returns {number} Value in design pixels that will result in at least minDisplaySize when scaled
 */
export function scaledTouch(value, minDisplaySize = 44) {
    const gameScale = getGameScale();
    // Calculate minimum design size needed to achieve minDisplaySize after scaling
    const minDesignSize = minDisplaySize / gameScale;
    return Math.max(value, minDesignSize);
}

// =============================================================================
// LAYOUT BOUNDS HELPERS
// =============================================================================

/**
 * Get the usable screen bounds (after safe areas).
 * @returns {{left: number, right: number, top: number, bottom: number, width: number, height: number}}
 */
export function getScreenBounds() {
    const width = getScreenWidth();
    const height = getScreenHeight();
    return {
        left: 0,
        right: width,
        top: 0,
        bottom: height,
        width: width,
        height: height
    };
}

/**
 * Get the raw safe area insets (for reference/debugging).
 * @returns {{left: number, right: number, top: number, bottom: number}}
 */
export function getRawSafeArea() {
    return getSafeAreaInsets();
}

/**
 * Check if current screen is "wide" (iPhone-like aspect ratio).
 * Wide screens may need different layout strategies.
 * Uses actual display dimensions, not design dimensions.
 * @returns {boolean} True if display is wider than 2:1 aspect ratio
 */
export function isWideScreen() {
    const displayDims = getDisplayDimensions();
    return displayDims.width / displayDims.height > 2;
}

/**
 * Check if current screen is "short" (limited vertical space).
 * Short screens may need more compact vertical layouts.
 * Uses actual display dimensions.
 * @returns {boolean} True if display height is less than 600 CSS pixels
 */
export function isShortScreen() {
    const displayDims = getDisplayDimensions();
    return displayDims.height < 600;
}

/**
 * Check if current screen is "very short" (extreme vertical constraint).
 * Very short screens need maximum compactness (e.g., phone landscape).
 * Uses actual display dimensions.
 * @returns {boolean} True if display height is less than 450 CSS pixels
 */
export function isVeryShortScreen() {
    const displayDims = getDisplayDimensions();
    return displayDims.height < 450;
}

/**
 * Check if current screen is "tall" (iPad-like aspect ratio).
 * Tall screens have more room for vertical spacing.
 * Uses actual display dimensions.
 * @returns {boolean} True if display aspect ratio is closer to 4:3
 */
export function isTallScreen() {
    const displayDims = getDisplayDimensions();
    return displayDims.width / displayDims.height < 1.5;
}
