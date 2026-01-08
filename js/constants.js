/**
 * Scorched Earth: Synthwave Edition
 * Game constants and configuration
 */

// Canvas dimensions (will be set dynamically based on viewport)
export const CANVAS = {
    MIN_WIDTH: 800,
    MIN_HEIGHT: 600,
    ASPECT_RATIO: 16 / 9
};

// Game state constants
export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    SHOP: 'shop',
    GAME_OVER: 'game_over'
};

// Physics constants
export const PHYSICS = {
    GRAVITY: 0.2,
    MAX_POWER: 100,
    MIN_POWER: 0,
    MAX_ANGLE: 180,
    MIN_ANGLE: 0
};

// Colors - Synthwave palette
export const COLORS = {
    BACKGROUND: '#0a0a1a',
    NEON_PINK: '#ff2a6d',
    NEON_CYAN: '#05d9e8',
    NEON_PURPLE: '#d300c5',
    NEON_YELLOW: '#f9f002',
    GRID: '#1a1a3a',
    SUNSET_TOP: '#0a0a1a',
    SUNSET_BOTTOM: '#2d1b4e'
};

// Tank settings
export const TANK = {
    WIDTH: 64,
    HEIGHT: 32,
    TURRET_LENGTH: 20
};

// Timing
export const TIMING = {
    FRAME_RATE: 60,
    FRAME_DURATION: 1000 / 60
};
