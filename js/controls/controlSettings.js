/**
 * Scorched Earth: Synthwave Edition
 * Control Settings Module
 *
 * Manages control mode and trajectory preview settings with localStorage persistence.
 * Settings include:
 * - Control mode: slingshot, sliders, or hybrid
 * - Trajectory preview: full, partial, or none
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Available control modes.
 * SLINGSHOT: Drag-to-aim (default on touch devices)
 * SLIDERS: Traditional angle/power sliders (default on desktop)
 * HYBRID: Sliders visible but drag also works
 */
export const CONTROL_MODES = {
    SLINGSHOT: 'slingshot',
    SLIDERS: 'sliders',
    HYBRID: 'hybrid'
};

/**
 * Available trajectory preview modes.
 * FULL: Shows entire predicted path (easiest)
 * PARTIAL: Shows first half only (harder)
 * NONE: No preview - classic mode (hardest)
 */
export const TRAJECTORY_MODES = {
    FULL: 'full',
    PARTIAL: 'partial',
    NONE: 'none'
};

/**
 * Default trajectory preview settings per difficulty level.
 * Can be overridden by user in settings.
 */
export const DIFFICULTY_PREVIEW_DEFAULTS = {
    easy: TRAJECTORY_MODES.FULL,
    medium: TRAJECTORY_MODES.FULL,
    hard: TRAJECTORY_MODES.PARTIAL,
    expert: TRAJECTORY_MODES.NONE
};

// localStorage keys
const STORAGE_KEY_CONTROL_MODE = 'scorched_control_mode';
const STORAGE_KEY_TRAJECTORY_MODE = 'scorched_trajectory_mode';
const STORAGE_KEY_DIFFICULTY_OVERRIDE = 'scorched_difficulty_override';

// =============================================================================
// STATE
// =============================================================================

/** @type {string} Current control mode */
let controlMode = null;

/** @type {string} Current trajectory preview mode */
let trajectoryMode = null;

/** @type {boolean} Whether user has overridden difficulty-based trajectory setting */
let difficultyOverride = false;

/** @type {boolean} Whether the device supports touch */
let isTouchDevice = null;

// =============================================================================
// DEVICE DETECTION
// =============================================================================

/**
 * Detect if the current device is a touch device.
 * Caches the result for performance.
 * @returns {boolean} True if the device supports touch
 */
export function detectTouchDevice() {
    if (isTouchDevice === null) {
        isTouchDevice = (
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            // @ts-ignore - msMaxTouchPoints exists on older IE/Edge
            (navigator.msMaxTouchPoints > 0)
        );
    }
    return isTouchDevice;
}

/**
 * Get the default control mode based on device type.
 * @returns {string} Default control mode
 */
export function getDefaultControlMode() {
    return detectTouchDevice() ? CONTROL_MODES.SLINGSHOT : CONTROL_MODES.SLIDERS;
}

// =============================================================================
// LOCALSTORAGE HELPERS
// =============================================================================

/**
 * Load a string setting from localStorage.
 * @param {string} key - Storage key
 * @param {string} defaultValue - Default value if not found
 * @param {string[]} validValues - Array of valid values
 * @returns {string} The loaded or default value
 */
function loadSetting(key, defaultValue, validValues) {
    try {
        const stored = localStorage.getItem(key);
        if (stored !== null && validValues.includes(stored)) {
            return stored;
        }
        return defaultValue;
    } catch (e) {
        console.warn(`Could not load setting ${key}:`, e);
        return defaultValue;
    }
}

/**
 * Save a string setting to localStorage.
 * @param {string} key - Storage key
 * @param {string} value - Value to save
 */
function saveSetting(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn(`Could not save setting ${key}:`, e);
    }
}

/**
 * Load a boolean setting from localStorage.
 * @param {string} key - Storage key
 * @param {boolean} defaultValue - Default value if not found
 * @returns {boolean} The loaded or default value
 */
function loadBooleanSetting(key, defaultValue) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return defaultValue;
        return stored === 'true';
    } catch (e) {
        return defaultValue;
    }
}

/**
 * Save a boolean setting to localStorage.
 * @param {string} key - Storage key
 * @param {boolean} value - Value to save
 */
function saveBooleanSetting(key, value) {
    try {
        localStorage.setItem(key, value.toString());
    } catch (e) {
        console.warn(`Could not save setting ${key}:`, e);
    }
}

// =============================================================================
// CONTROL MODE API
// =============================================================================

/**
 * Get the current control mode.
 * Loads from localStorage on first call.
 * @returns {string} Current control mode
 */
export function getControlMode() {
    if (controlMode === null) {
        controlMode = loadSetting(
            STORAGE_KEY_CONTROL_MODE,
            getDefaultControlMode(),
            Object.values(CONTROL_MODES)
        );
    }
    return controlMode;
}

/**
 * Set the control mode.
 * Persists to localStorage.
 * @param {string} mode - New control mode (must be a valid CONTROL_MODES value)
 */
export function setControlMode(mode) {
    if (!Object.values(CONTROL_MODES).includes(mode)) {
        console.warn(`Invalid control mode: ${mode}`);
        return;
    }
    controlMode = mode;
    saveSetting(STORAGE_KEY_CONTROL_MODE, mode);
}

/**
 * Cycle to the next control mode.
 * @returns {string} The new control mode
 */
export function cycleControlMode() {
    const modes = Object.values(CONTROL_MODES);
    const currentIndex = modes.indexOf(getControlMode());
    const nextIndex = (currentIndex + 1) % modes.length;
    setControlMode(modes[nextIndex]);
    return controlMode;
}

/**
 * Check if slingshot aiming should be enabled.
 * Returns true for SLINGSHOT and HYBRID modes.
 * @returns {boolean} True if slingshot aiming should be enabled
 */
export function isSlingshotEnabled() {
    const mode = getControlMode();
    return mode === CONTROL_MODES.SLINGSHOT || mode === CONTROL_MODES.HYBRID;
}

/**
 * Check if sliders should be visible.
 * Returns true for SLIDERS and HYBRID modes.
 * @returns {boolean} True if sliders should be visible
 */
export function areSlidersVisible() {
    const mode = getControlMode();
    return mode === CONTROL_MODES.SLIDERS || mode === CONTROL_MODES.HYBRID;
}

// =============================================================================
// TRAJECTORY PREVIEW API
// =============================================================================

/**
 * Get the current trajectory preview mode.
 * Loads from localStorage on first call.
 * @returns {string} Current trajectory mode
 */
export function getTrajectoryMode() {
    if (trajectoryMode === null) {
        trajectoryMode = loadSetting(
            STORAGE_KEY_TRAJECTORY_MODE,
            TRAJECTORY_MODES.FULL,
            Object.values(TRAJECTORY_MODES)
        );
        difficultyOverride = loadBooleanSetting(STORAGE_KEY_DIFFICULTY_OVERRIDE, false);
    }
    return trajectoryMode;
}

/**
 * Set the trajectory preview mode.
 * Persists to localStorage and marks as user override.
 * @param {string} mode - New trajectory mode (must be a valid TRAJECTORY_MODES value)
 */
export function setTrajectoryMode(mode) {
    if (!Object.values(TRAJECTORY_MODES).includes(mode)) {
        console.warn(`Invalid trajectory mode: ${mode}`);
        return;
    }
    trajectoryMode = mode;
    difficultyOverride = true;
    saveSetting(STORAGE_KEY_TRAJECTORY_MODE, mode);
    saveBooleanSetting(STORAGE_KEY_DIFFICULTY_OVERRIDE, true);
}

/**
 * Cycle to the next trajectory mode.
 * @returns {string} The new trajectory mode
 */
export function cycleTrajectoryMode() {
    const modes = Object.values(TRAJECTORY_MODES);
    const currentIndex = modes.indexOf(getTrajectoryMode());
    const nextIndex = (currentIndex + 1) % modes.length;
    setTrajectoryMode(modes[nextIndex]);
    return trajectoryMode;
}

/**
 * Apply difficulty-based trajectory mode.
 * Only applies if user hasn't manually overridden the setting.
 * @param {string} difficulty - Difficulty level (easy, medium, hard, expert)
 * @returns {string} The effective trajectory mode
 */
export function applyDifficultyPreview(difficulty) {
    // Initialize to load from storage
    getTrajectoryMode();

    // Only apply if user hasn't overridden
    if (!difficultyOverride) {
        const defaultMode = DIFFICULTY_PREVIEW_DEFAULTS[difficulty] || TRAJECTORY_MODES.FULL;
        trajectoryMode = defaultMode;
        // Don't save to localStorage - this is a session-level setting from difficulty
    }

    return trajectoryMode;
}

/**
 * Reset difficulty override flag.
 * Call this if user wants difficulty to control trajectory preview again.
 */
export function resetDifficultyOverride() {
    difficultyOverride = false;
    saveBooleanSetting(STORAGE_KEY_DIFFICULTY_OVERRIDE, false);
    // Remove stored trajectory mode so it defaults to difficulty on next load
    try {
        localStorage.removeItem(STORAGE_KEY_TRAJECTORY_MODE);
        trajectoryMode = null;
    } catch (e) {
        console.warn('Could not remove trajectory mode setting:', e);
    }
}

/**
 * Check if user has overridden difficulty-based trajectory setting.
 * @returns {boolean} True if user has manually set trajectory mode
 */
export function hasDifficultyOverride() {
    // Ensure loaded from storage
    getTrajectoryMode();
    return difficultyOverride;
}

/**
 * Check if trajectory preview should be visible.
 * @returns {boolean} True if any preview should be shown (not NONE)
 */
export function isTrajectoryVisible() {
    return getTrajectoryMode() !== TRAJECTORY_MODES.NONE;
}

/**
 * Get the fraction of trajectory to show.
 * FULL: 1.0, PARTIAL: 0.5, NONE: 0
 * @returns {number} Fraction of trajectory to render
 */
export function getTrajectoryFraction() {
    const mode = getTrajectoryMode();
    switch (mode) {
        case TRAJECTORY_MODES.FULL:
            return 1.0;
        case TRAJECTORY_MODES.PARTIAL:
            return 0.5;
        case TRAJECTORY_MODES.NONE:
        default:
            return 0;
    }
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get a human-readable label for the current control mode.
 * @returns {string} Display label
 */
export function getControlModeLabel() {
    const mode = getControlMode();
    switch (mode) {
        case CONTROL_MODES.SLINGSHOT:
            return 'SLINGSHOT';
        case CONTROL_MODES.SLIDERS:
            return 'SLIDERS';
        case CONTROL_MODES.HYBRID:
            return 'HYBRID';
        default:
            return mode.toUpperCase();
    }
}

/**
 * Get a human-readable label for the current trajectory mode.
 * @returns {string} Display label
 */
export function getTrajectoryModeLabel() {
    const mode = getTrajectoryMode();
    switch (mode) {
        case TRAJECTORY_MODES.FULL:
            return 'FULL';
        case TRAJECTORY_MODES.PARTIAL:
            return 'PARTIAL';
        case TRAJECTORY_MODES.NONE:
            return 'OFF';
        default:
            return mode.toUpperCase();
    }
}
