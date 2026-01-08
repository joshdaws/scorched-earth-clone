/**
 * Scorched Earth: Synthwave Edition
 * Input handling module - supports mouse and touch
 *
 * Provides a unified pointer abstraction that normalizes mouse and touch input.
 * All coordinates are converted to canvas design space (1200x800).
 */

import { CANVAS } from './constants.js';

// Input state
const keys = {};
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

    console.log('Input module initialized');
}

// Keyboard handlers
function handleKeyDown(e) {
    keys[e.code] = true;
    keyDownCallbacks.forEach(cb => cb(e.code, e));
}

function handleKeyUp(e) {
    keys[e.code] = false;
    keyUpCallbacks.forEach(cb => cb(e.code, e));
}

/**
 * Convert screen coordinates (relative to canvas) to design space coordinates.
 * Design space is CANVAS.DESIGN_WIDTH x CANVAS.DESIGN_HEIGHT (1200x800).
 * @param {number} screenX - X coordinate relative to canvas CSS rect
 * @param {number} screenY - Y coordinate relative to canvas CSS rect
 * @param {DOMRect} rect - Canvas bounding client rect
 * @returns {{x: number, y: number}} Coordinates in design space
 */
function screenToDesign(screenX, screenY, rect) {
    // Convert CSS coordinates to design space
    // rect.width is the CSS display width, DESIGN_WIDTH is our target coordinate space
    const cssToDesign = CANVAS.DESIGN_WIDTH / rect.width;
    return {
        x: screenX * cssToDesign,
        y: screenY * cssToDesign
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

    mouseDownCallbacks.forEach(cb => cb(mouse.x, mouse.y, e.button));
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

    mouseUpCallbacks.forEach(cb => cb(mouse.x, mouse.y, e.button));
}

function handleMouseMove(e) {
    updateMousePosition(e);

    // Update unified pointer position from mouse (unless touch is active)
    if (!touch.isActive) {
        updatePointerFromMouse();
    }

    mouseMoveCallbacks.forEach(cb => cb(mouse.x, mouse.y));
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

    touchStartCallbacks.forEach(cb => cb(touch.x, touch.y));
}

function handleTouchEnd(e) {
    e.preventDefault();
    touch.isActive = false;

    // Update unified pointer state
    pointer.isDown = false;

    touchEndCallbacks.forEach(cb => cb(touch.x, touch.y));
}

function handleTouchMove(e) {
    e.preventDefault();
    updateTouchPosition(e);

    // Update unified pointer position from touch
    updatePointerFromTouch();

    touchMoveCallbacks.forEach(cb => cb(touch.x, touch.y));
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

/**
 * Check if a key is currently pressed
 * @param {string} keyCode - The key code to check
 * @returns {boolean} True if key is pressed
 */
export function isKeyPressed(keyCode) {
    return keys[keyCode] === true;
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
