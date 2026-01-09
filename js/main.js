/**
 * Scorched Earth: Synthwave Edition
 * Main entry point
 */

import * as Game from './game.js';
import * as Renderer from './renderer.js';
import * as Input from './input.js';
import { INPUT_EVENTS } from './input.js';
import * as Sound from './sound.js';
import * as Assets from './assets.js';
import * as Debug from './debug.js';
import * as Turn from './turn.js';
import { COLORS, DEBUG, CANVAS, UI, GAME_STATES, TURN_PHASES, PHYSICS } from './constants.js';

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
 * Update the playing state - handle turn-based logic
 * @param {number} deltaTime - Time since last frame in ms
 */
function updatePlaying(deltaTime) {
    const phase = Turn.getPhase();

    // Handle AI turn (simple placeholder - AI aims for a short time then fires)
    if (phase === TURN_PHASES.AI_AIM) {
        // For now, AI fires after a short delay (simulated with frame count)
        // In the future, this will involve actual AI calculations
        if (!aiAimStartTime) {
            aiAimStartTime = performance.now();
        }

        // AI "thinks" for 1 second then fires
        if (performance.now() - aiAimStartTime > 1000) {
            Turn.aiFire();
            aiAimStartTime = null;
        }
    }

    // Handle projectile flight - check for resolution
    if (phase === TURN_PHASES.PROJECTILE_FLIGHT) {
        // For now, projectile resolves after a short simulated flight time
        // In the future, this will be driven by actual projectile physics
        if (!projectileFlightStartTime) {
            projectileFlightStartTime = performance.now();
        }

        // Simulated flight time of 1.5 seconds
        if (performance.now() - projectileFlightStartTime > 1500) {
            Turn.projectileResolved();
            projectileFlightStartTime = null;
        }
    }
}

// Timing state for simulated turn phases (will be replaced by actual game logic)
let aiAimStartTime = null;
let projectileFlightStartTime = null;

// =============================================================================
// PLAYER AIMING STATE
// =============================================================================

/**
 * Current player aiming values
 */
const playerAim = {
    angle: 45,  // degrees (0-180, where 90 is straight up)
    power: 50   // percentage (0-100)
};

/**
 * Handle angle change input event
 * @param {number} delta - Change in angle (degrees)
 */
function handleAngleChange(delta) {
    playerAim.angle = Math.max(PHYSICS.MIN_ANGLE, Math.min(PHYSICS.MAX_ANGLE, playerAim.angle + delta));
}

/**
 * Handle power change input event
 * @param {number} delta - Change in power (percentage points)
 */
function handlePowerChange(delta) {
    playerAim.power = Math.max(PHYSICS.MIN_POWER, Math.min(PHYSICS.MAX_POWER, playerAim.power + delta));
}

/**
 * Handle fire input event
 */
function handleFire() {
    if (Turn.canPlayerFire()) {
        Turn.playerFire();
    }
}

/**
 * Handle weapon select input event
 */
function handleSelectWeapon() {
    // TODO: Implement weapon cycling when weapon system is ready
    console.log('Weapon select pressed (not yet implemented)');
}

/**
 * Render the playing screen
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPlaying(ctx) {
    // Render turn indicator at top of screen
    Turn.renderTurnIndicator(ctx);

    // Draw phase-specific content
    const phase = Turn.getPhase();

    // Draw playing state indicator (temporary)
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAYING STATE', CANVAS.DESIGN_WIDTH / 2, 70);

    // Draw current phase info
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillText(`Current Phase: ${phase}`, CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 - 40);

    // Draw aiming values
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.fillText(`ANGLE: ${playerAim.angle.toFixed(1)}°`, CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2);
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.fillText(`POWER: ${playerAim.power.toFixed(1)}%`, CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 35);

    // Draw controls help based on current phase
    if (Turn.canPlayerAim()) {
        ctx.fillStyle = COLORS.TEXT_LIGHT;
        ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.fillText('Press SPACE to fire!', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 90);
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillText('← → Arrow keys: Adjust angle | ↑ ↓ Arrow keys: Adjust power', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 120);
        ctx.fillText('TAB: Select weapon', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 145);
    }
}

/**
 * Setup playing state handlers
 */
function setupPlayingState() {
    // Register game input event handlers
    Input.onGameInput(INPUT_EVENTS.ANGLE_CHANGE, handleAngleChange);
    Input.onGameInput(INPUT_EVENTS.POWER_CHANGE, handlePowerChange);
    Input.onGameInput(INPUT_EVENTS.FIRE, handleFire);
    Input.onGameInput(INPUT_EVENTS.SELECT_WEAPON, handleSelectWeapon);

    // Register phase change callback to enable/disable input
    Turn.onPhaseChange((newPhase, oldPhase) => {
        // Enable input only during player's aiming phase
        if (newPhase === TURN_PHASES.PLAYER_AIM) {
            Input.enableGameInput();
        } else {
            Input.disableGameInput();
        }
    });

    Game.registerStateHandlers(GAME_STATES.PLAYING, {
        onEnter: (fromState) => {
            console.log('Entered PLAYING state - Game started!');
            // Initialize the turn system when entering playing state
            Turn.init();
            // Sync turn debug mode with game debug mode
            Turn.setDebugMode(Debug.isEnabled());
            // Reset timing state
            aiAimStartTime = null;
            projectileFlightStartTime = null;
            // Reset player aim
            playerAim.angle = 45;
            playerAim.power = 50;
            // Enable game input for player's turn
            Input.enableGameInput();
        },
        onExit: (toState) => {
            console.log('Exiting PLAYING state');
            // Disable game input when leaving playing state
            Input.disableGameInput();
        },
        update: updatePlaying,
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
    // Note: loadManifest gracefully handles missing manifest files
    await Assets.loadManifest();
    await Assets.loadAllAssets((loaded, total, percentage) => {
        console.log(`Loading assets: ${percentage}% (${loaded}/${total})`);
    });

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

    // Update continuous input (held keys generate events over time)
    Input.updateContinuousInput(deltaTime);

    // Process all queued game input events
    Input.processInputQueue();

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
