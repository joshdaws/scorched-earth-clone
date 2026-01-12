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

import { getScreenWidth, getScreenHeight, getSafeAreaInsets } from './screenSize.js';

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

// Reference design height for scaling calculations
const REFERENCE_HEIGHT = 800;
const REFERENCE_WIDTH = 1200;

// Minimum scale factor to prevent UI from becoming too small
// Lower on mobile to allow more compact UI on small screens
const MIN_UI_SCALE = 0.5;

// Maximum scale factor to prevent UI from becoming too large
const MAX_UI_SCALE = 1.3;

// Mobile screen threshold (CSS pixels height in landscape)
// Below this, we apply additional mobile scaling
const MOBILE_HEIGHT_THRESHOLD = 500;

// Additional scale factor applied on mobile devices
const MOBILE_SCALE_FACTOR = 0.85;

/**
 * Check if the current device appears to be a mobile device based on screen size.
 * Uses screen height as primary indicator (mobile landscape is typically <500px).
 * @returns {boolean} True if device appears to be mobile
 */
export function isMobileDevice() {
    const screenHeight = getScreenHeight();
    return screenHeight < MOBILE_HEIGHT_THRESHOLD;
}

/**
 * Calculate UI scale factor based on screen height.
 * Smaller screens get smaller UI elements. Mobile devices get additional
 * scaling to keep UI compact and touch-friendly without being oversized.
 * @returns {number} Scale factor (typically 0.5 - 1.3)
 */
export function getUIScale() {
    const screenHeight = getScreenHeight();
    let scale = screenHeight / REFERENCE_HEIGHT;

    // Clamp to valid range
    scale = Math.max(MIN_UI_SCALE, Math.min(MAX_UI_SCALE, scale));

    // Apply additional mobile scaling for small screens
    // This helps keep UI proportional on phones where the natural scale
    // (e.g., 400/800 = 0.5) would make elements too large relative to screen
    if (isMobileDevice()) {
        scale *= MOBILE_SCALE_FACTOR;
        // Re-clamp after mobile adjustment
        scale = Math.max(MIN_UI_SCALE, scale);
    }

    return scale;
}

/**
 * Scale a dimension by the current UI scale factor.
 * @param {number} value - Original dimension value
 * @returns {number} Scaled dimension value
 */
export function scaled(value) {
    return value * getUIScale();
}

/**
 * Scale a dimension but enforce minimum touch target size.
 * Apple HIG recommends 44pt minimum for touch targets.
 * @param {number} value - Original dimension value
 * @param {number} [minSize=44] - Minimum size to enforce
 * @returns {number} Scaled dimension, at least minSize
 */
export function scaledTouch(value, minSize = 44) {
    return Math.max(minSize, value * getUIScale());
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
 * @returns {boolean} True if screen is wider than 2:1 aspect ratio
 */
export function isWideScreen() {
    const width = getScreenWidth();
    const height = getScreenHeight();
    return width / height > 2;
}

/**
 * Check if current screen is "short" (limited vertical space).
 * Short screens may need more compact vertical layouts.
 * @returns {boolean} True if screen height is less than 600 pixels
 */
export function isShortScreen() {
    return getScreenHeight() < 600;
}

/**
 * Check if current screen is "very short" (extreme vertical constraint).
 * Very short screens need maximum compactness (e.g., phone landscape).
 * @returns {boolean} True if screen height is less than 450 pixels
 */
export function isVeryShortScreen() {
    return getScreenHeight() < 450;
}

/**
 * Check if current screen is "tall" (iPad-like aspect ratio).
 * Tall screens have more room for vertical spacing.
 * @returns {boolean} True if screen aspect ratio is closer to 4:3
 */
export function isTallScreen() {
    const width = getScreenWidth();
    const height = getScreenHeight();
    return width / height < 1.5;
}
