/**
 * Scorched Earth: Synthwave Edition
 * Game loop and state management
 *
 * Implements a state machine for game flow with state-specific
 * update/render functions and transition hooks.
 */

import { GAME_STATES, TIMING } from './constants.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {string} Current game state */
let currentState = GAME_STATES.MENU;

/** @type {number} Timestamp of last frame */
let lastFrameTime = 0;

/** @type {boolean} Whether the game loop is running */
let isRunning = false;

// FPS tracking for debug mode
let frameCount = 0;
let lastFpsUpdate = 0;
let debugMode = false;

// =============================================================================
// STATE HANDLERS
// =============================================================================

/**
 * State handler configuration.
 * Each state can have optional onEnter, onExit, update, and render functions.
 * @type {Object.<string, {onEnter?: Function, onExit?: Function, update?: Function, render?: Function}>}
 */
const stateHandlers = {};

/**
 * Register handlers for a specific game state.
 * @param {string} state - The state to register handlers for
 * @param {Object} handlers - Handler functions
 * @param {Function} [handlers.onEnter] - Called when entering this state
 * @param {Function} [handlers.onExit] - Called when leaving this state
 * @param {Function} [handlers.update] - Called each frame during this state (receives deltaTime)
 * @param {Function} [handlers.render] - Called each frame during this state (receives ctx)
 */
export function registerStateHandlers(state, handlers) {
    if (!Object.values(GAME_STATES).includes(state)) {
        console.error(`Cannot register handlers for invalid state: ${state}`);
        return;
    }
    stateHandlers[state] = { ...stateHandlers[state], ...handlers };
}

/**
 * Get handlers for a specific state.
 * @param {string} state - The state to get handlers for
 * @returns {Object} The state handlers
 */
function getHandlers(state) {
    return stateHandlers[state] || {};
}

// =============================================================================
// STATE MACHINE
// =============================================================================

/**
 * Initialize the game state
 */
export function init() {
    currentState = GAME_STATES.MENU;
    isRunning = false;
    console.log('Game module initialized');
}

/**
 * Get the current game state
 * @returns {string} Current game state
 */
export function getState() {
    return currentState;
}

/**
 * Set the game state with transition hooks.
 * Calls onExit for the old state and onEnter for the new state.
 * @param {string} newState - The new state to set
 * @returns {boolean} True if state change succeeded
 */
export function setState(newState) {
    // Validate state
    if (!Object.values(GAME_STATES).includes(newState)) {
        console.error(`Invalid game state: ${newState}`);
        return false;
    }

    // No change needed
    if (newState === currentState) {
        return true;
    }

    const oldState = currentState;

    // Call onExit for current state
    const oldHandlers = getHandlers(oldState);
    if (oldHandlers.onExit) {
        oldHandlers.onExit(newState);
    }

    // Update state
    currentState = newState;

    // Call onEnter for new state
    const newHandlers = getHandlers(newState);
    if (newHandlers.onEnter) {
        newHandlers.onEnter(oldState);
    }

    // Log transition in debug mode
    if (debugMode) {
        console.log(`State transition: ${oldState} → ${newState}`);
    }

    return true;
}

/**
 * Check if the current state matches a given state
 * @param {string} state - State to check against
 * @returns {boolean} True if current state matches
 */
export function isState(state) {
    return currentState === state;
}

// =============================================================================
// GAME LOOP
// =============================================================================

/**
 * Start the game loop
 * @param {Function} updateFn - Update function called each frame with deltaTime
 * @param {Function} renderFn - Render function called each frame with ctx
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
export function startLoop(updateFn, renderFn, ctx) {
    isRunning = true;
    lastFrameTime = performance.now();
    lastFpsUpdate = performance.now();
    frameCount = 0;

    function loop(currentTime) {
        if (!isRunning) return;

        const deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;

        // FPS logging in debug mode
        if (debugMode) {
            frameCount++;
            if (currentTime - lastFpsUpdate >= 1000) {
                console.log(`FPS: ${frameCount}`);
                frameCount = 0;
                lastFpsUpdate = currentTime;
            }
        }

        // Update game logic
        // First call state-specific update, then global update
        const handlers = getHandlers(currentState);
        if (handlers.update) {
            handlers.update(deltaTime);
        }
        if (updateFn) {
            updateFn(deltaTime);
        }

        // Render frame
        // First call global render (clears screen, draws background)
        // Then call state-specific render
        if (renderFn) {
            renderFn(ctx);
        }
        if (handlers.render) {
            handlers.render(ctx);
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
    console.log('Game loop started');
}

/**
 * Stop the game loop
 */
export function stopLoop() {
    isRunning = false;
    console.log('Game loop stopped');
}

/**
 * Check if game loop is running
 * @returns {boolean} True if loop is running
 */
export function isLoopRunning() {
    return isRunning;
}

// =============================================================================
// DEBUG MODE
// =============================================================================

/**
 * Enable or disable debug mode
 * When enabled, FPS and state transitions are logged to console
 * @param {boolean} enabled - Whether to enable debug mode
 */
export function setDebugMode(enabled) {
    debugMode = enabled;
    console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if debug mode is enabled
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugMode() {
    return debugMode;
}

// =============================================================================
// STATE CONSTANTS (re-export for convenience)
// =============================================================================

export { GAME_STATES };
