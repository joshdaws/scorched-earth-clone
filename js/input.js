/**
 * Scorched Earth: Synthwave Edition
 * Input handling module - supports mouse and touch
 *
 * Provides a unified pointer abstraction that normalizes mouse and touch input.
 * All coordinates are converted to canvas design space (1200x800).
 *
 * Also provides a game input abstraction layer with high-level events:
 * - ANGLE_CHANGE: Player adjusting aim angle
 * - POWER_CHANGE: Player adjusting shot power
 * - FIRE: Player firing their weapon
 * - SELECT_WEAPON: Cycling to next weapon
 */

import { CANVAS, GAME_KEYS, KEYS, PHYSICS } from './constants.js';

// =============================================================================
// GAME INPUT EVENTS
// =============================================================================

/**
 * Game input event types
 */
export const INPUT_EVENTS = {
    ANGLE_CHANGE: 'angle_change',
    POWER_CHANGE: 'power_change',
    FIRE: 'fire',
    SELECT_WEAPON: 'select_weapon',
    SELECT_PREV_WEAPON: 'select_prev_weapon'
};

/**
 * Input queue - stores pending input events to be processed once per frame
 * @type {Array<{type: string, value: any, timestamp: number}>}
 */
const inputQueue = [];

/**
 * Whether game input is currently enabled (disabled during non-player phases)
 * @type {boolean}
 */
let inputEnabled = true;

/**
 * Registered callbacks for game input events
 * @type {Object.<string, Function[]>}
 */
const gameInputCallbacks = {
    [INPUT_EVENTS.ANGLE_CHANGE]: [],
    [INPUT_EVENTS.POWER_CHANGE]: [],
    [INPUT_EVENTS.FIRE]: [],
    [INPUT_EVENTS.SELECT_WEAPON]: [],
    [INPUT_EVENTS.SELECT_PREV_WEAPON]: []
};

/**
 * Current aiming state for continuous adjustment via keyboard
 */
const aimingState = {
    angleDirection: 0,  // -1 = decrease, 0 = none, 1 = increase
    powerDirection: 0   // -1 = decrease, 0 = none, 1 = increase
};

/**
 * Rates for angle and power adjustment (units per second)
 */
const ADJUSTMENT_RATES = {
    ANGLE: 90,  // degrees per second
    POWER: 50   // power units per second
};

// Input state - tracks currently held keys
const keys = {};

// Tracks keys that were pressed this frame (for single-fire events)
// These get cleared at the end of each frame by clearFrameState()
const keysPressed = {};

const mouse = {
    x: 0,
    y: 0,
    isDown: false,
    button: -1
};
const touch = {
    x: 0,
    y: 0,
    isActive: false
};

// Unified pointer state (normalized from mouse or touch)
// Coordinates are in canvas design space (1200x800)
const pointer = {
    x: 0,
    y: 0,
    isDown: false
};

// Canvas reference for coordinate conversion
let canvasRef = null;

// Callback storage
let keyDownCallbacks = [];
let keyUpCallbacks = [];
let mouseDownCallbacks = [];
let mouseUpCallbacks = [];
let mouseMoveCallbacks = [];
let touchStartCallbacks = [];
let touchEndCallbacks = [];
let touchMoveCallbacks = [];

/**
 * Initialize input handlers
 * @param {HTMLCanvasElement} canvas - Canvas element for mouse/touch events
 */
export function init(canvas) {
    // Store canvas reference for coordinate conversion
    canvasRef = canvas;

    // Keyboard events
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mouse events
    if (canvas) {
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mousemove', handleMouseMove);

        // Touch events for mobile support
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    // Set up game input bindings
    setupGameKeyBindings();
    setupSliderBindings();

    console.log('Input module initialized');
}

// Keyboard handlers
function handleKeyDown(e) {
    // Prevent default browser behavior for game keys (e.g., arrow key scrolling)
    if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
    }

    // Only set wasPressed if this is a fresh press (not a key repeat)
    if (!keys[e.code]) {
        keysPressed[e.code] = true;
    }

    keys[e.code] = true;
    keyDownCallbacks.forEach(cb => cb(e.code, e));
}

function handleKeyUp(e) {
    // Prevent default for game keys on release too
    if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
    }

    keys[e.code] = false;
    keyUpCallbacks.forEach(cb => cb(e.code, e));
}

/**
 * Convert screen coordinates (relative to canvas) to game coordinate space.
 * With dynamic screen sizing, CSS pixels = game coordinates (1:1 mapping).
 * The canvas fills the available screen space, so no aspect ratio scaling needed.
 * @param {number} screenX - X coordinate relative to canvas CSS rect
 * @param {number} screenY - Y coordinate relative to canvas CSS rect
 * @param {DOMRect} rect - Canvas bounding client rect (unused with 1:1 mapping)
 * @returns {{x: number, y: number}} Coordinates in game space
 */
function screenToDesign(screenX, screenY, rect) {
    // With dynamic screen sizing, CSS coordinates = game coordinates directly
    // No scaling needed since the canvas fills the screen at 1:1 pixel ratio
    return {
        x: screenX,
        y: screenY
    };
}

// Mouse handlers
function handleMouseDown(e) {
    mouse.isDown = true;
    mouse.button = e.button;
    updateMousePosition(e);

    // Update unified pointer state
    pointer.isDown = true;
    updatePointerFromMouse();

    // Pass design space coordinates to callbacks (same as pointer.x/y)
    mouseDownCallbacks.forEach(cb => cb(pointer.x, pointer.y, e.button));
}

function handleMouseUp(e) {
    mouse.isDown = false;
    mouse.button = -1;
    updateMousePosition(e);

    // Update unified pointer state (only if touch isn't also active)
    if (!touch.isActive) {
        pointer.isDown = false;
    }
    updatePointerFromMouse();

    // Pass design space coordinates to callbacks (same as pointer.x/y)
    mouseUpCallbacks.forEach(cb => cb(pointer.x, pointer.y, e.button));
}

function handleMouseMove(e) {
    updateMousePosition(e);

    // Update unified pointer position from mouse (unless touch is active)
    if (!touch.isActive) {
        updatePointerFromMouse();
    }

    // Pass design space coordinates to callbacks (same as pointer.x/y)
    mouseMoveCallbacks.forEach(cb => cb(pointer.x, pointer.y));
}

function updateMousePosition(e) {
    const rect = e.target.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
}

/**
 * Update unified pointer state from mouse coordinates
 */
function updatePointerFromMouse() {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const design = screenToDesign(mouse.x, mouse.y, rect);
    pointer.x = design.x;
    pointer.y = design.y;
}

// Touch handlers
function handleTouchStart(e) {
    e.preventDefault();
    touch.isActive = true;
    updateTouchPosition(e);

    // Update unified pointer state (touch takes priority over mouse)
    pointer.isDown = true;
    updatePointerFromTouch();

    // Pass design space coordinates to callbacks (same as pointer.x/y)
    touchStartCallbacks.forEach(cb => cb(pointer.x, pointer.y));
}

function handleTouchEnd(e) {
    e.preventDefault();
    touch.isActive = false;

    // Update unified pointer state
    pointer.isDown = false;
    // Note: pointer.x/y retain last known position from touchMove/touchStart

    // Pass design space coordinates to callbacks (same as pointer.x/y)
    touchEndCallbacks.forEach(cb => cb(pointer.x, pointer.y));
}

function handleTouchMove(e) {
    e.preventDefault();
    updateTouchPosition(e);

    // Update unified pointer position from touch
    updatePointerFromTouch();

    // Pass design space coordinates to callbacks (same as pointer.x/y)
    touchMoveCallbacks.forEach(cb => cb(pointer.x, pointer.y));
}

function updateTouchPosition(e) {
    if (e.touches.length > 0) {
        const rect = e.target.getBoundingClientRect();
        touch.x = e.touches[0].clientX - rect.left;
        touch.y = e.touches[0].clientY - rect.top;
    }
}

/**
 * Update unified pointer state from touch coordinates
 */
function updatePointerFromTouch() {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const design = screenToDesign(touch.x, touch.y, rect);
    pointer.x = design.x;
    pointer.y = design.y;
}

// =============================================================================
// KEYBOARD API
// =============================================================================

/**
 * Check if a key is currently held down.
 * This returns true every frame while the key is pressed.
 * @param {string} keyCode - The key code to check (e.g., 'ArrowUp', 'Space')
 * @returns {boolean} True if key is currently down
 */
export function isKeyDown(keyCode) {
    return keys[keyCode] === true;
}

/**
 * Check if a key is currently pressed (alias for isKeyDown).
 * @param {string} keyCode - The key code to check
 * @returns {boolean} True if key is pressed
 * @deprecated Use isKeyDown for clarity
 */
export function isKeyPressed(keyCode) {
    return isKeyDown(keyCode);
}

/**
 * Check if a key was pressed this frame (single-fire event).
 * This returns true only on the frame the key was first pressed,
 * not on subsequent frames while the key is held.
 * Use this for actions that should only trigger once per key press.
 * @param {string} keyCode - The key code to check
 * @returns {boolean} True if key was pressed this frame
 */
export function wasKeyPressed(keyCode) {
    return keysPressed[keyCode] === true;
}

/**
 * Clear the frame state for input.
 * This should be called at the end of each game loop frame to reset
 * single-fire key presses. Keys that are held down will still report
 * as down via isKeyDown(), but wasKeyPressed() will return false
 * until the key is released and pressed again.
 */
export function clearFrameState() {
    // Clear all keys that were marked as pressed this frame
    for (const key in keysPressed) {
        delete keysPressed[key];
    }
}

/**
 * Get current mouse state
 * @returns {Object} Mouse state object
 */
export function getMouseState() {
    return { ...mouse };
}

/**
 * Get current touch state
 * @returns {Object} Touch state object
 */
export function getTouchState() {
    return { ...touch };
}

// =============================================================================
// UNIFIED POINTER API
// =============================================================================
// These functions provide a unified interface that works for both mouse and
// touch input. Coordinates are in canvas design space (1200x800).

/**
 * Check if the pointer (mouse or touch) is currently down/active.
 * Works uniformly for both mouse clicks and touch events.
 * @returns {boolean} True if pointer is down
 */
export function isPointerDown() {
    return pointer.isDown;
}

/**
 * Get the current pointer position in canvas design space.
 * Works uniformly for both mouse and touch events.
 * Coordinates are scaled to design dimensions (1200x800).
 * @returns {{x: number, y: number}} Pointer position in design space
 */
export function getPointerPosition() {
    return { x: pointer.x, y: pointer.y };
}

/**
 * Get the full pointer state including position and down state.
 * Convenience function that combines isPointerDown() and getPointerPosition().
 * @returns {{x: number, y: number, isDown: boolean}} Full pointer state
 */
export function getPointerState() {
    return { ...pointer };
}

/**
 * Register a callback for key down events
 * @param {Function} callback - Function to call on key down
 */
export function onKeyDown(callback) {
    keyDownCallbacks.push(callback);
}

/**
 * Register a callback for key up events
 * @param {Function} callback - Function to call on key up
 */
export function onKeyUp(callback) {
    keyUpCallbacks.push(callback);
}

/**
 * Register a callback for mouse down events
 * @param {Function} callback - Function to call on mouse down
 */
export function onMouseDown(callback) {
    mouseDownCallbacks.push(callback);
}

/**
 * Register a callback for mouse up events
 * @param {Function} callback - Function to call on mouse up
 */
export function onMouseUp(callback) {
    mouseUpCallbacks.push(callback);
}

/**
 * Register a callback for mouse move events
 * @param {Function} callback - Function to call on mouse move
 */
export function onMouseMove(callback) {
    mouseMoveCallbacks.push(callback);
}

/**
 * Register a callback for touch start events
 * @param {Function} callback - Function to call on touch start
 */
export function onTouchStart(callback) {
    touchStartCallbacks.push(callback);
}

/**
 * Register a callback for touch end events
 * @param {Function} callback - Function to call on touch end
 */
export function onTouchEnd(callback) {
    touchEndCallbacks.push(callback);
}

/**
 * Register a callback for touch move events
 * @param {Function} callback - Function to call on touch move
 */
export function onTouchMove(callback) {
    touchMoveCallbacks.push(callback);
}

// =============================================================================
// GAME INPUT ABSTRACTION LAYER
// =============================================================================

/**
 * Enable game input processing.
 * When enabled, keyboard/mouse/touch inputs are converted to game events.
 */
export function enableGameInput() {
    inputEnabled = true;
}

/**
 * Disable game input processing.
 * Call this during non-player phases (AI turn, projectile flight, etc.)
 */
export function disableGameInput() {
    inputEnabled = false;
    // Clear any held keys when disabling
    aimingState.angleDirection = 0;
    aimingState.powerDirection = 0;
}

/**
 * Check if game input is currently enabled.
 * @returns {boolean} True if game input is enabled
 */
export function isGameInputEnabled() {
    return inputEnabled;
}

/**
 * Queue a game input event.
 * Events are processed once per frame via processInputQueue().
 * @param {string} type - Event type from INPUT_EVENTS
 * @param {*} value - Event value (delta for changes, null for actions)
 */
export function queueGameInput(type, value = null) {
    if (!inputEnabled) return;

    inputQueue.push({
        type,
        value,
        timestamp: performance.now()
    });
}

/**
 * Process all queued input events.
 * Call this once per frame in the update loop.
 * Events are dispatched to registered callbacks and then cleared.
 */
export function processInputQueue() {
    // Process each queued event
    while (inputQueue.length > 0) {
        const event = inputQueue.shift();
        const callbacks = gameInputCallbacks[event.type];
        if (callbacks) {
            for (const callback of callbacks) {
                callback(event.value, event.timestamp);
            }
        }
    }
}

/**
 * Update continuous input state (held keys).
 * Call this once per frame with deltaTime to generate ANGLE_CHANGE and POWER_CHANGE events.
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
export function updateContinuousInput(deltaTime) {
    if (!inputEnabled) return;

    const dt = deltaTime / 1000; // Convert to seconds

    // Generate ANGLE_CHANGE events for held arrow keys
    if (aimingState.angleDirection !== 0) {
        const angleDelta = aimingState.angleDirection * ADJUSTMENT_RATES.ANGLE * dt;
        queueGameInput(INPUT_EVENTS.ANGLE_CHANGE, angleDelta);
    }

    // Generate POWER_CHANGE events for held arrow keys
    if (aimingState.powerDirection !== 0) {
        const powerDelta = aimingState.powerDirection * ADJUSTMENT_RATES.POWER * dt;
        queueGameInput(INPUT_EVENTS.POWER_CHANGE, powerDelta);
    }
}

/**
 * Register a callback for a game input event type.
 * @param {string} eventType - Event type from INPUT_EVENTS
 * @param {Function} callback - Function to call with (value, timestamp)
 */
export function onGameInput(eventType, callback) {
    if (gameInputCallbacks[eventType]) {
        gameInputCallbacks[eventType].push(callback);
    } else {
        console.warn(`Unknown game input event type: ${eventType}`);
    }
}

/**
 * Remove a game input callback.
 * @param {string} eventType - Event type from INPUT_EVENTS
 * @param {Function} callback - The callback to remove
 */
export function offGameInput(eventType, callback) {
    const callbacks = gameInputCallbacks[eventType];
    if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }
}

/**
 * Set up keyboard bindings for game input.
 * Called automatically during init().
 * - Left/Right arrows: Adjust angle
 * - Up/Down arrows: Adjust power
 * - Space: Fire
 * - Tab: Select next weapon
 */
function setupGameKeyBindings() {
    // Track key down for continuous input
    keyDownCallbacks.push((keyCode, event) => {
        if (!inputEnabled) return;

        switch (keyCode) {
            case KEYS.ARROW_LEFT:
                aimingState.angleDirection = 1; // Increase angle (counterclockwise)
                break;
            case KEYS.ARROW_RIGHT:
                aimingState.angleDirection = -1; // Decrease angle (clockwise)
                break;
            case KEYS.ARROW_UP:
                aimingState.powerDirection = 1; // Increase power
                break;
            case KEYS.ARROW_DOWN:
                aimingState.powerDirection = -1; // Decrease power
                break;
            case KEYS.SPACE:
                queueGameInput(INPUT_EVENTS.FIRE);
                break;
            case KEYS.TAB:
                // Shift+Tab cycles to previous weapon, Tab cycles to next
                if (event && event.shiftKey) {
                    queueGameInput(INPUT_EVENTS.SELECT_PREV_WEAPON);
                } else {
                    queueGameInput(INPUT_EVENTS.SELECT_WEAPON);
                }
                break;
        }
    });

    // Track key up to stop continuous input
    keyUpCallbacks.push((keyCode) => {
        switch (keyCode) {
            case KEYS.ARROW_LEFT:
                if (aimingState.angleDirection === 1) aimingState.angleDirection = 0;
                break;
            case KEYS.ARROW_RIGHT:
                if (aimingState.angleDirection === -1) aimingState.angleDirection = 0;
                break;
            case KEYS.ARROW_UP:
                if (aimingState.powerDirection === 1) aimingState.powerDirection = 0;
                break;
            case KEYS.ARROW_DOWN:
                if (aimingState.powerDirection === -1) aimingState.powerDirection = 0;
                break;
        }
    });
}

// =============================================================================
// SLIDER INTERACTION STATE
// =============================================================================

/**
 * Active slider being dragged
 * @type {{type: string, startValue: number, startY: number}|null}
 */
let activeSlider = null;

/**
 * Registered slider hit zones for mouse/touch interaction
 * @type {Array<{type: string, x: number, y: number, width: number, height: number, getValue: Function}>}
 */
const sliderZones = [];

/**
 * Register a slider hit zone for mouse/touch interaction.
 * @param {string} type - 'angle' or 'power'
 * @param {Object} zone - Hit zone rectangle
 * @param {number} zone.x - X position
 * @param {number} zone.y - Y position
 * @param {number} zone.width - Width
 * @param {number} zone.height - Height
 * @param {Function} getValue - Function that returns current slider value
 */
export function registerSliderZone(type, zone, getValue) {
    // Remove existing zone of same type
    const existingIndex = sliderZones.findIndex(z => z.type === type);
    if (existingIndex !== -1) {
        sliderZones.splice(existingIndex, 1);
    }

    sliderZones.push({
        type,
        ...zone,
        getValue
    });
}

/**
 * Clear all registered slider zones.
 */
export function clearSliderZones() {
    sliderZones.length = 0;
}

/**
 * Check if a point is inside a slider zone.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {{type: string, zone: Object}|null} Hit zone info or null
 */
function hitTestSliders(x, y) {
    for (const zone of sliderZones) {
        if (x >= zone.x && x <= zone.x + zone.width &&
            y >= zone.y && y <= zone.y + zone.height) {
            return { type: zone.type, zone };
        }
    }
    return null;
}

/**
 * Handle pointer down on potential slider.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 */
function handleSliderPointerDown(x, y) {
    if (!inputEnabled) return;

    const hit = hitTestSliders(x, y);
    if (hit) {
        activeSlider = {
            type: hit.type,
            startValue: hit.zone.getValue(),
            startY: y
        };
    }
}

/**
 * Handle pointer move while dragging slider.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 */
function handleSliderPointerMove(x, y) {
    if (!inputEnabled || !activeSlider) return;

    // Calculate delta based on vertical drag (up = increase)
    const deltaY = activeSlider.startY - y;

    // Convert to slider value change (100 pixels = full range)
    const sensitivity = 1.0; // Adjust as needed
    const valueDelta = deltaY * sensitivity;

    if (activeSlider.type === 'angle') {
        queueGameInput(INPUT_EVENTS.ANGLE_CHANGE, valueDelta);
    } else if (activeSlider.type === 'power') {
        queueGameInput(INPUT_EVENTS.POWER_CHANGE, valueDelta);
    }

    // Update start position for continuous drag
    activeSlider.startY = y;
}

/**
 * Handle pointer up to end slider drag.
 */
function handleSliderPointerUp() {
    activeSlider = null;
}

/**
 * Set up mouse/touch bindings for slider interaction.
 * Called automatically during init().
 */
function setupSliderBindings() {
    // Mouse events - coordinates are already in game space from the callback
    mouseDownCallbacks.push((x, y, button) => {
        if (button === 0) { // Left click only
            handleSliderPointerDown(x, y);
        }
    });

    mouseMoveCallbacks.push((x, y) => {
        // Coordinates are already converted to game space by updatePointerFromMouse
        handleSliderPointerMove(x, y);
    });

    mouseUpCallbacks.push(() => {
        handleSliderPointerUp();
    });

    // Touch events - coordinates are already in game space from the callback
    touchStartCallbacks.push((x, y) => {
        handleSliderPointerDown(x, y);
    });

    touchMoveCallbacks.push((x, y) => {
        // Coordinates are already converted to game space by updatePointerFromTouch
        handleSliderPointerMove(x, y);
    });

    touchEndCallbacks.push(() => {
        handleSliderPointerUp();
    });
}
