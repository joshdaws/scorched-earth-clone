/**
 * Scorched Earth: Synthwave Edition
 * Game loop and state management
 */

import { GAME_STATES, TIMING } from './constants.js';

// Current game state
let gameState = GAME_STATES.MENU;
let lastFrameTime = 0;
let isRunning = false;

// FPS tracking for debug mode
let frameCount = 0;
let lastFpsUpdate = 0;
let debugMode = false;

/**
 * Initialize the game state
 */
export function init() {
    gameState = GAME_STATES.MENU;
    isRunning = false;
    console.log('Game module initialized');
}

/**
 * Get the current game state
 * @returns {string} Current game state
 */
export function getState() {
    return gameState;
}

/**
 * Set the game state
 * @param {string} newState - The new state to set
 */
export function setState(newState) {
    if (Object.values(GAME_STATES).includes(newState)) {
        gameState = newState;
        console.log(`Game state changed to: ${newState}`);
    } else {
        console.error(`Invalid game state: ${newState}`);
    }
}

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
        if (updateFn) updateFn(deltaTime);

        // Render frame with context
        if (renderFn) renderFn(ctx);

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

/**
 * Enable or disable debug mode
 * When enabled, FPS is logged to console every second
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
