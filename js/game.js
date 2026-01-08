/**
 * Scorched Earth: Synthwave Edition
 * Game loop and state management
 */

import { GAME_STATES, TIMING } from './constants.js';

// Current game state
let gameState = GAME_STATES.MENU;
let lastFrameTime = 0;
let isRunning = false;

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
 * @param {Function} updateFn - Update function called each frame
 * @param {Function} renderFn - Render function called each frame
 */
export function startLoop(updateFn, renderFn) {
    isRunning = true;
    lastFrameTime = performance.now();

    function loop(currentTime) {
        if (!isRunning) return;

        const deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;

        // Update game logic
        if (updateFn) updateFn(deltaTime);

        // Render frame
        if (renderFn) renderFn();

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
