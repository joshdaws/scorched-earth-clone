/**
 * Scorched Earth: Synthwave Edition
 * Main entry point
 */

import * as Game from './game.js';
import * as Renderer from './renderer.js';
import * as Input from './input.js';
import * as Sound from './sound.js';
import * as Assets from './assets.js';
import * as Debug from './debug.js';
import { COLORS, DEBUG, CANVAS, UI, GAME_STATES } from './constants.js';

// =============================================================================
// MENU STATE
// =============================================================================

/**
 * Button definition for "Start Game" button
 */
const startButton = {
    x: CANVAS.DESIGN_WIDTH / 2,
    y: CANVAS.DESIGN_HEIGHT / 2 + 60,
    width: 250,
    height: 60,
    text: 'START GAME'
};

/**
 * Check if a point is inside the start button
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if point is inside button
 */
function isInsideStartButton(x, y) {
    const halfWidth = startButton.width / 2;
    const halfHeight = startButton.height / 2;
    return (
        x >= startButton.x - halfWidth &&
        x <= startButton.x + halfWidth &&
        y >= startButton.y - halfHeight &&
        y <= startButton.y + halfHeight
    );
}

/**
 * Handle click on menu - check if Start Game button was clicked
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleMenuClick(pos) {
    if (Game.getState() !== GAME_STATES.MENU) return;

    if (isInsideStartButton(pos.x, pos.y)) {
        // Transition to PLAYING state
        Game.setState(GAME_STATES.PLAYING);
    }
}

/**
 * Render the menu screen
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderMenu(ctx) {
    // Draw title
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold ${UI.FONT_SIZE_TITLE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCORCHED EARTH', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 3);

    // Draw subtitle
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.font = `${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.fillText('SYNTHWAVE EDITION', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 3 + 50);

    // Draw start button
    const halfWidth = startButton.width / 2;
    const halfHeight = startButton.height / 2;
    const btnX = startButton.x - halfWidth;
    const btnY = startButton.y - halfHeight;

    // Button background
    ctx.fillStyle = COLORS.BG_MEDIUM;
    ctx.fillRect(btnX, btnY, startButton.width, startButton.height);

    // Button border (neon glow effect)
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 3;
    ctx.strokeRect(btnX, btnY, startButton.width, startButton.height);

    // Button text
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.fillText(startButton.text, startButton.x, startButton.y);

    // Instructions text
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillText('Click or tap to start', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 100);
    ctx.fillText('Press D to toggle debug mode', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 70);
}

/**
 * Setup menu state handlers
 */
function setupMenuState() {
    // Register menu state handlers
    Game.registerStateHandlers(GAME_STATES.MENU, {
        onEnter: (fromState) => {
            console.log('Entered MENU state');
        },
        onExit: (toState) => {
            console.log('Exiting MENU state');
        },
        render: renderMenu
    });

    // Register click handler for menu interactions
    // Note: onMouseDown callback receives (x, y, button) - coordinates first
    Input.onMouseDown((x, y, button) => {
        handleMenuClick({ x, y });
    });

    // Register touch handler for menu interactions
    Input.onTouchStart((x, y) => {
        handleMenuClick({ x, y });
    });

    // Also handle keyboard - Space or Enter to start
    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.MENU) {
            if (keyCode === 'Space' || keyCode === 'Enter') {
                Game.setState(GAME_STATES.PLAYING);
            }
        }
    });
}

// =============================================================================
// PLAYING STATE
// =============================================================================

/**
 * Render the playing screen (placeholder for now)
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPlaying(ctx) {
    // Draw playing state indicator
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAYING STATE', CANVAS.DESIGN_WIDTH / 2, 50);

    // Draw instructions
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillText('Game is now in PLAYING state', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2);
    ctx.fillText('(Press ESC to return to menu - not yet implemented)', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 30);
}

/**
 * Setup playing state handlers
 */
function setupPlayingState() {
    Game.registerStateHandlers(GAME_STATES.PLAYING, {
        onEnter: (fromState) => {
            console.log('Entered PLAYING state - Game started!');
        },
        onExit: (toState) => {
            console.log('Exiting PLAYING state');
        },
        render: renderPlaying
    });
}

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
    const ctx = Renderer.init('game');
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

    // Initialize debug module
    Debug.init();

    // Setup state handlers BEFORE starting the loop
    // These register the update/render functions for each state
    setupMenuState();
    setupPlayingState();

    // Register 'D' key to toggle debug mode
    Input.onKeyDown((keyCode) => {
        if (keyCode === DEBUG.TOGGLE_KEY) {
            Debug.toggle();
        }
    });

    console.log('Scorched Earth initialized');

    // Start the game loop with update, render, and context
    Game.startLoop(update, render, ctx);
}

/**
 * Update game logic each frame
 * @param {number} deltaTime - Time since last frame in ms
 */
function update(deltaTime) {
    // Update debug FPS tracking
    Debug.updateFps(performance.now());

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

    // Render debug overlay last (on top of everything)
    Debug.render(ctx);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
