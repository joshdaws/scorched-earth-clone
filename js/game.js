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

/** @type {boolean} Whether the game loop is paused (can be resumed) */
let isPaused = false;

/** @type {number} Accumulated time for fixed timestep physics */
let accumulator = 0;

/** @type {number} Fixed timestep duration in ms (for physics updates) */
const FIXED_TIMESTEP = TIMING.FRAME_DURATION;

/** @type {number} Maximum accumulated time to prevent spiral of death */
const MAX_ACCUMULATED_TIME = TIMING.FRAME_DURATION * 5;

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
// VALID STATE TRANSITIONS
// =============================================================================

/**
 * Map of valid state transitions.
 * Each key is a state, and its value is an array of states it can transition to.
 * This prevents invalid state transitions (e.g., going from VICTORY directly to SHOP).
 */
const validTransitions = {
    [GAME_STATES.MENU]: [
        GAME_STATES.DIFFICULTY_SELECT,  // Go to difficulty selection first
        GAME_STATES.HIGH_SCORES,        // View high scores
        GAME_STATES.PLAYING,
        GAME_STATES.AIMING  // Can also start directly into aiming
    ],
    [GAME_STATES.DIFFICULTY_SELECT]: [
        GAME_STATES.PLAYING,  // Start game after selecting difficulty
        GAME_STATES.MENU      // Can go back to menu
    ],
    [GAME_STATES.HIGH_SCORES]: [
        GAME_STATES.MENU      // Can go back to menu
    ],
    [GAME_STATES.PLAYING]: [
        GAME_STATES.AIMING,
        GAME_STATES.PAUSED,
        GAME_STATES.VICTORY,
        GAME_STATES.DEFEAT,
        GAME_STATES.GAME_OVER,
        GAME_STATES.MENU  // Can return to menu
    ],
    [GAME_STATES.AIMING]: [
        GAME_STATES.FIRING,
        GAME_STATES.PAUSED,
        GAME_STATES.PLAYING,
        GAME_STATES.MENU  // Can return to menu
    ],
    [GAME_STATES.FIRING]: [
        GAME_STATES.AIMING,     // Next player's turn
        GAME_STATES.PLAYING,    // Back to playing state
        GAME_STATES.ROUND_END,  // Round finished
        GAME_STATES.VICTORY,
        GAME_STATES.DEFEAT,
        GAME_STATES.PAUSED,
        GAME_STATES.MENU  // Can return to menu
    ],
    [GAME_STATES.PAUSED]: [
        GAME_STATES.PLAYING,
        GAME_STATES.AIMING,
        GAME_STATES.FIRING,
        GAME_STATES.MENU  // Can exit to menu from pause
    ],
    [GAME_STATES.ROUND_END]: [
        GAME_STATES.SHOP,
        GAME_STATES.VICTORY,
        GAME_STATES.DEFEAT,
        GAME_STATES.PLAYING,  // Next round starts
        GAME_STATES.AIMING,
        GAME_STATES.MENU
    ],
    [GAME_STATES.SHOP]: [
        GAME_STATES.PLAYING,
        GAME_STATES.AIMING,
        GAME_STATES.MENU
    ],
    [GAME_STATES.VICTORY]: [
        GAME_STATES.MENU,
        GAME_STATES.SHOP,       // Could allow shop after victory
        GAME_STATES.GAME_OVER
    ],
    [GAME_STATES.DEFEAT]: [
        GAME_STATES.MENU,
        GAME_STATES.SHOP,       // Allow shop after defeat too
        GAME_STATES.GAME_OVER
    ],
    [GAME_STATES.GAME_OVER]: [
        GAME_STATES.MENU
    ]
};

/**
 * Check if a state transition is valid.
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {boolean} True if transition is allowed
 */
function isValidTransition(fromState, toState) {
    const allowed = validTransitions[fromState];
    return allowed && allowed.includes(toState);
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
 * Validates that the transition is allowed, then calls onExit for the old state
 * and onEnter for the new state.
 * @param {string} newState - The new state to set
 * @returns {boolean} True if state change succeeded
 */
export function setState(newState) {
    // Validate state is a valid state value
    if (!Object.values(GAME_STATES).includes(newState)) {
        console.error(`Invalid game state: ${newState}`);
        return false;
    }

    // No change needed
    if (newState === currentState) {
        return true;
    }

    // Validate state transition is allowed
    if (!isValidTransition(currentState, newState)) {
        console.error(`Invalid state transition: ${currentState} → ${newState}`);
        if (debugMode) {
            const allowed = validTransitions[currentState] || [];
            console.log(`Allowed transitions from ${currentState}: ${allowed.join(', ')}`);
        }
        return false;
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
 * Start the game loop.
 * Uses a fixed timestep for physics updates to ensure consistent behavior
 * regardless of frame rate. Rendering happens every frame with interpolation
 * potential via the alpha value.
 *
 * Fixed timestep pattern:
 * - Accumulate actual elapsed time
 * - Run physics updates in fixed-size chunks (16.67ms at 60fps)
 * - Render after all physics updates are done
 * - This prevents physics jitter from variable frame times
 *
 * @param {Function} updateFn - Update function called with fixed deltaTime for physics
 * @param {Function} renderFn - Render function called each frame with ctx
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
export function startLoop(updateFn, renderFn, ctx) {
    isRunning = true;
    isPaused = false;
    lastFrameTime = performance.now();
    lastFpsUpdate = performance.now();
    frameCount = 0;
    accumulator = 0;

    function loop(currentTime) {
        // Debug: log every 60 frames to see if loop is running
        if (!window._loopFrameCount) window._loopFrameCount = 0;
        window._loopFrameCount++;
        if (window._loopFrameCount % 60 === 1) {
            console.log('[GameLoop] Frame', window._loopFrameCount, 'isRunning:', isRunning, 'isPaused:', isPaused);
        }

        if (!isRunning) return;

        // Skip updates while paused but keep rendering for pause menu overlay
        if (isPaused) {
            // Reset lastFrameTime to prevent time accumulation during pause
            lastFrameTime = currentTime;

            // Still render the current state (pause menu overlay)
            if (renderFn) {
                renderFn(ctx);
            }
            const handlers = getHandlers(currentState);
            // Only log once per pause to avoid flooding console
            if (!window._pauseLoggedOnce) {
                window._pauseLoggedOnce = true;
                console.log('[GameLoop] Paused render ONCE, state:', currentState, 'hasRender:', !!handlers.render);
            }
            if (handlers.render) {
                handlers.render(ctx);
            }

            requestAnimationFrame(loop);
            return;
        }

        // Calculate real elapsed time since last frame
        let deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;

        // Clamp delta time to prevent spiral of death
        // (when updates take longer than a frame, causing more updates, etc.)
        if (deltaTime > MAX_ACCUMULATED_TIME) {
            deltaTime = MAX_ACCUMULATED_TIME;
        }

        // FPS logging in debug mode
        if (debugMode) {
            frameCount++;
            if (currentTime - lastFpsUpdate >= 1000) {
                console.log(`FPS: ${frameCount}`);
                frameCount = 0;
                lastFpsUpdate = currentTime;
            }
        }

        // Accumulate time for fixed timestep physics
        accumulator += deltaTime;

        // Run physics updates at fixed intervals
        // Multiple updates may run per frame if we're behind
        while (accumulator >= FIXED_TIMESTEP) {
            // Update game logic with fixed timestep
            const handlers = getHandlers(currentState);
            if (handlers.update) {
                handlers.update(FIXED_TIMESTEP);
            }
            if (updateFn) {
                updateFn(FIXED_TIMESTEP);
            }

            accumulator -= FIXED_TIMESTEP;
        }

        // Calculate interpolation alpha for smooth rendering (0-1)
        // Can be passed to render functions for smoother animation
        // const alpha = accumulator / FIXED_TIMESTEP;

        // Render frame
        // First call global render (clears screen, draws background)
        // Then call state-specific render
        if (renderFn) {
            renderFn(ctx);
        }
        const handlers = getHandlers(currentState);
        if (handlers.render) {
            handlers.render(ctx);
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
    console.log('Game loop started');
}

/**
 * Stop the game loop completely.
 * Use this when exiting the game or resetting.
 */
export function stopLoop() {
    isRunning = false;
    isPaused = false;
    accumulator = 0;
    console.log('Game loop stopped');
}

/**
 * Pause the game loop.
 * Updates and physics stop, but the loop continues running
 * so it can be resumed without restarting.
 */
export function pauseLoop() {
    if (!isRunning) return;
    isPaused = true;
    console.log('Game loop paused');
}

/**
 * Resume the game loop from a paused state.
 */
export function resumeLoop() {
    if (!isRunning) return;
    isPaused = false;
    // Reset frame time to prevent huge delta after unpause
    lastFrameTime = performance.now();
    console.log('Game loop resumed');
}

/**
 * Check if game loop is running (not stopped)
 * @returns {boolean} True if loop is running (may be paused)
 */
export function isLoopRunning() {
    return isRunning;
}

/**
 * Check if game loop is currently paused
 * @returns {boolean} True if loop is paused
 */
export function isLoopPaused() {
    return isPaused;
}

/**
 * Get the fixed timestep value used for physics updates
 * @returns {number} Fixed timestep in milliseconds
 */
export function getFixedTimestep() {
    return FIXED_TIMESTEP;
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
