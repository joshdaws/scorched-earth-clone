/**
 * Scorched Earth: Synthwave Edition
 * Main entry point
 */

import * as Game from './game.js';
import * as Renderer from './renderer.js';
import * as Input from './input.js';
import { COLORS } from './constants.js';

/**
 * Initialize all game modules
 */
function init() {
    console.log('Scorched Earth: Synthwave Edition');
    console.log('Initializing...');

    // Get canvas element
    const canvas = document.getElementById('game-canvas');

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Initialize renderer
    if (!Renderer.init(canvas)) {
        console.error('Failed to initialize renderer');
        return;
    }

    // Initialize input with canvas
    Input.init(canvas);

    // Initialize game state
    Game.init();

    console.log('Scorched Earth initialized');

    // Start the game loop
    Game.startLoop(update, render);
}

/**
 * Update game logic each frame
 * @param {number} deltaTime - Time since last frame in ms
 */
function update(deltaTime) {
    // Game update logic will go here
}

/**
 * Render frame
 */
function render() {
    // Clear canvas
    Renderer.clear();

    // Render game elements will go here
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
