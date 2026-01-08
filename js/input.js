/**
 * Scorched Earth: Synthwave Edition
 * Input handling module - supports mouse and touch
 */

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

// Mouse handlers
function handleMouseDown(e) {
    mouse.isDown = true;
    mouse.button = e.button;
    updateMousePosition(e);
    mouseDownCallbacks.forEach(cb => cb(mouse.x, mouse.y, e.button));
}

function handleMouseUp(e) {
    mouse.isDown = false;
    mouse.button = -1;
    updateMousePosition(e);
    mouseUpCallbacks.forEach(cb => cb(mouse.x, mouse.y, e.button));
}

function handleMouseMove(e) {
    updateMousePosition(e);
    mouseMoveCallbacks.forEach(cb => cb(mouse.x, mouse.y));
}

function updateMousePosition(e) {
    const rect = e.target.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
}

// Touch handlers
function handleTouchStart(e) {
    e.preventDefault();
    touch.isActive = true;
    updateTouchPosition(e);
    touchStartCallbacks.forEach(cb => cb(touch.x, touch.y));
}

function handleTouchEnd(e) {
    e.preventDefault();
    touch.isActive = false;
    touchEndCallbacks.forEach(cb => cb(touch.x, touch.y));
}

function handleTouchMove(e) {
    e.preventDefault();
    updateTouchPosition(e);
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
