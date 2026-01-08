/**
 * Scorched Earth: Synthwave Edition
 * Main entry point
 */

import * as Game from './game.js';
import * as Renderer from './renderer.js';
import * as Input from './input.js';
import * as Sound from './sound.js';
import * as Assets from './assets.js';
import { COLORS } from './constants.js';

/**
 * Set up audio initialization on first user interaction.
 * Web Audio API requires a user gesture (click/touch) to start.
 * @param {HTMLCanvasElement} canvas - Canvas to listen for interactions
 */
function setupAudioInit(canvas) {
    const initAudio = () => {
        if (!Sound.isInitialized()) {
            Sound.init();
        }
        // Remove listeners after first successful init
        if (Sound.isInitialized()) {
            canvas.removeEventListener('click', initAudio);
            canvas.removeEventListener('touchstart', initAudio);
            document.removeEventListener('keydown', initAudio);
        }
    };

    // Listen for any user interaction to initialize audio
    canvas.addEventListener('click', initAudio);
    canvas.addEventListener('touchstart', initAudio);
    document.addEventListener('keydown', initAudio);
}

/**
 * Initialize all game modules
 */
async function init() {
    console.log('Scorched Earth: Synthwave Edition');
    console.log('Initializing...');

    // Initialize renderer (gets canvas by ID internally)
    const ctx = Renderer.init('game-canvas');
    if (!ctx) {
        console.error('Failed to initialize renderer');
        return;
    }

    // Get canvas for input initialization
    const canvas = Renderer.getCanvas();

    // Initialize input with canvas
    Input.init(canvas);

    // Set up audio initialization on first user interaction
    // Web Audio API requires user gesture to start
    setupAudioInit(canvas);

    // Load assets before starting the game
    try {
        await Assets.loadManifest();
        await Assets.loadAllAssets((loaded, total) => {
            console.log(`Loading assets: ${loaded}/${total}`);
        });
    } catch (error) {
        console.error('Failed to load assets:', error);
        // Continue anyway - game can run with missing assets
    }

    // Initialize game state
    Game.init();

    // Enable debug mode to verify FPS logging
    Game.setDebugMode(true);

    console.log('Scorched Earth initialized');

    // Start the game loop with update, render, and context
    Game.startLoop(update, render, ctx);
}

/**
 * Update game logic each frame
 * @param {number} deltaTime - Time since last frame in ms
 */
function update(deltaTime) {
    // Game update logic will go here

    // Clear single-fire input state at end of frame
    // This must be done after all game logic that checks wasKeyPressed()
    Input.clearFrameState();
}

/**
 * Render frame
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
function render(ctx) {
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
