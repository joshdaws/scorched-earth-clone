/**
 * Scorched Earth: Synthwave Edition
 * Game constants and configuration
 *
 * Single source of truth for all game constants.
 * Values must match the game spec exactly.
 */

// =============================================================================
// CANVAS DIMENSIONS
// =============================================================================

/**
 * Design dimensions for the game canvas.
 * The game is designed for these dimensions but will scale to fit the viewport.
 */
export const CANVAS = {
    DESIGN_WIDTH: 1200,
    DESIGN_HEIGHT: 800,
    MIN_WIDTH: 800,
    MIN_HEIGHT: 600,
    ASPECT_RATIO: 1200 / 800  // 3:2 based on design dimensions
};

// =============================================================================
// PHYSICS CONSTANTS
// =============================================================================

/**
 * Physics simulation constants.
 * GRAVITY: Acceleration applied to projectiles each frame (pixels/frame²)
 * MAX_VELOCITY: Maximum velocity cap for projectiles (pixels/frame)
 * WIND_RANGE: Maximum wind strength in either direction
 */
export const PHYSICS = {
    GRAVITY: 0.15,
    MAX_VELOCITY: 20,
    WIND_RANGE: 10,
    MAX_POWER: 100,
    MIN_POWER: 0,
    MAX_ANGLE: 180,
    MIN_ANGLE: 0
};

// =============================================================================
// TANK CONSTANTS
// =============================================================================

/**
 * Tank entity settings.
 * Dimensions match the tank sprite size in the asset manifest.
 */
export const TANK = {
    WIDTH: 64,
    HEIGHT: 32,
    TURRET_LENGTH: 20,
    START_HEALTH: 100,
    MAX_HEALTH: 100
};

// =============================================================================
// GAME CONSTANTS
// =============================================================================

/**
 * Core gameplay settings.
 */
export const GAME = {
    STARTING_MONEY: 1000,
    ROUNDS_PER_MATCH: 10,
    DAMAGE_MULTIPLIER: 1.0
};

// =============================================================================
// GAME STATES
// =============================================================================

/**
 * Valid game state identifiers.
 */
export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    AIMING: 'aiming',
    FIRING: 'firing',
    PAUSED: 'paused',
    SHOP: 'shop',
    ROUND_END: 'round_end',
    VICTORY: 'victory',
    DEFEAT: 'defeat',
    GAME_OVER: 'game_over'
};

// =============================================================================
// COLORS - SYNTHWAVE PALETTE
// =============================================================================

/**
 * Color palette matching CSS variables in style.css.
 * All colors are in hex format.
 */
export const COLORS = {
    // Primary background
    BACKGROUND: '#0a0a1a',
    BG_DARK: '#0a0a1a',
    BG_MEDIUM: '#1a1a2e',

    // Neon accent colors
    NEON_PINK: '#ff2a6d',
    NEON_CYAN: '#05d9e8',
    NEON_PURPLE: '#d300c5',
    NEON_YELLOW: '#f9f002',
    NEON_ORANGE: '#ff6b35',

    // Grid and terrain
    GRID: '#1a1a3a',
    TERRAIN: '#2d1b4e',

    // Sunset gradient colors
    SUNSET_TOP: '#0a0a1a',
    SUNSET_BOTTOM: '#2d1b4e',

    // Text colors
    TEXT_LIGHT: '#ffffff',
    TEXT_MUTED: '#888899',

    // Player colors
    PLAYER_1: '#05d9e8',  // Cyan for player
    PLAYER_2: '#ff2a6d'   // Pink for enemy/AI
};

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

/**
 * Frame rate and timing settings.
 */
export const TIMING = {
    FRAME_RATE: 60,
    FRAME_DURATION: 1000 / 60,  // ~16.67ms
    TURN_TIMEOUT: 30000,        // 30 seconds per turn
    EXPLOSION_DURATION: 500     // ms for explosion animation
};

// =============================================================================
// TERRAIN CONSTANTS
// =============================================================================

/**
 * Terrain generation and rendering settings.
 */
export const TERRAIN = {
    RESOLUTION: 1,              // Pixels per terrain column
    MIN_HEIGHT: 100,            // Minimum terrain height from bottom
    MAX_HEIGHT: 500,            // Maximum terrain height from bottom
    DESTRUCTION_SMOOTHING: 3    // Smoothing iterations after explosion
};

// =============================================================================
// PROJECTILE CONSTANTS
// =============================================================================

/**
 * Default projectile settings.
 */
export const PROJECTILE = {
    DEFAULT_RADIUS: 4,
    DEFAULT_DAMAGE: 25,
    TRAIL_LENGTH: 10,
    TRAIL_FADE: 0.9
};

// =============================================================================
// UI CONSTANTS
// =============================================================================

/**
 * User interface dimensions and settings.
 */
export const UI = {
    HUD_HEIGHT: 60,
    POWER_BAR_WIDTH: 200,
    POWER_BAR_HEIGHT: 20,
    FONT_SIZE_SMALL: 12,
    FONT_SIZE_MEDIUM: 16,
    FONT_SIZE_LARGE: 24,
    FONT_SIZE_TITLE: 48,
    FONT_FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
};

// =============================================================================
// KEY CODES
// =============================================================================

/**
 * Keyboard key code constants.
 * Using KeyboardEvent.code values for consistent behavior across layouts.
 */
export const KEYS = {
    // Arrow keys
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',

    // Action keys
    SPACE: 'Space',
    ENTER: 'Enter',
    TAB: 'Tab',
    ESCAPE: 'Escape',

    // Letter keys (for potential future use)
    W: 'KeyW',
    A: 'KeyA',
    S: 'KeyS',
    D: 'KeyD'
};

/**
 * Set of key codes that should have default browser behavior prevented.
 * These keys would otherwise cause scrolling or focus changes.
 */
export const GAME_KEYS = new Set([
    KEYS.ARROW_UP,
    KEYS.ARROW_DOWN,
    KEYS.ARROW_LEFT,
    KEYS.ARROW_RIGHT,
    KEYS.SPACE,
    KEYS.TAB
]);
