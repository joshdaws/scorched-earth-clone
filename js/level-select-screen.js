/**
 * Scorched Earth: Synthwave Edition
 * Level Select Screen UI
 *
 * Displays world tabs and level grid for level-based progression mode.
 * Shows locked/unlocked status, star ratings, and world progress.
 */

import { COLORS, UI, GAME_STATES } from './constants.js';
import * as Renderer from './renderer.js';
import * as Game from './game.js';
import * as Input from './input.js';
import * as Sound from './sound.js';
import * as Music from './music.js';
import { LevelRegistry, LEVEL_CONSTANTS, WORLD_THEMES } from './levels.js';
import { Stars } from './stars.js';
import * as TitleScene from './titleScene/titleScene.js';
import { get as getAsset, loadAsset } from './assets.js';
import { drawLockIcon, drawStarIcon } from './uiIcons.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Layout
    HEADER_HEIGHT: 100,
    FOOTER_HEIGHT: 100,
    WORLD_NAV_HEIGHT: 60,

    // Level grid (5 columns x 2 rows = 10 levels per world)
    GRID_COLS: 5,
    GRID_ROWS: 2,
    LEVEL_BUTTON_SIZE: 100,
    LEVEL_BUTTON_GAP: 20,

    // World navigation dots
    WORLD_DOT_SIZE: 16,
    WORLD_DOT_GAP: 24,

    // Back button
    BACK_BUTTON: {
        x: 60,
        y: 40,
        width: 100,
        height: 40
    },

    // World arrows
    WORLD_ARROW_SIZE: 44,

    // Animation
    TRANSITION_DURATION: 200,
    PULSE_SPEED: 0.003
};

// =============================================================================
// STATE
// =============================================================================

/** Currently selected world (1-6) */
let currentWorld = 1;

/** Animation time for pulse effects */
let animationTime = 0;

/** Currently hovered level button index (-1 for none) */
let hoveredLevel = -1;

/** Currently hovered world navigation index (-1 for none) */
let hoveredWorld = -1;

// =============================================================================
// COMPUTED VALUES
// =============================================================================

/**
 * Get the grid layout dimensions.
 * @returns {{gridWidth: number, gridHeight: number, startX: number, startY: number}}
 */
function getGridLayout() {
    const gridWidth = CONFIG.GRID_COLS * CONFIG.LEVEL_BUTTON_SIZE + (CONFIG.GRID_COLS - 1) * CONFIG.LEVEL_BUTTON_GAP;
    const gridHeight = CONFIG.GRID_ROWS * CONFIG.LEVEL_BUTTON_SIZE + (CONFIG.GRID_ROWS - 1) * CONFIG.LEVEL_BUTTON_GAP;
    const startX = (Renderer.getWidth() - gridWidth) / 2;
    const startY = CONFIG.HEADER_HEIGHT + (Renderer.getHeight() - CONFIG.HEADER_HEIGHT - CONFIG.FOOTER_HEIGHT - CONFIG.WORLD_NAV_HEIGHT - gridHeight) / 2;

    return { gridWidth, gridHeight, startX, startY };
}

/**
 * Get button position for a level index (0-9).
 * @param {number} index - Level index within world (0-9)
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function getLevelButtonRect(index) {
    const { startX, startY } = getGridLayout();
    const col = index % CONFIG.GRID_COLS;
    const row = Math.floor(index / CONFIG.GRID_COLS);

    const x = startX + col * (CONFIG.LEVEL_BUTTON_SIZE + CONFIG.LEVEL_BUTTON_GAP);
    const y = startY + row * (CONFIG.LEVEL_BUTTON_SIZE + CONFIG.LEVEL_BUTTON_GAP);

    return {
        x,
        y,
        width: CONFIG.LEVEL_BUTTON_SIZE,
        height: CONFIG.LEVEL_BUTTON_SIZE
    };
}

/**
 * Check if a level is unlocked for play.
 * Level 1 of any unlocked world is always playable.
 * Subsequent levels require the previous level to be completed.
 * @param {number} worldNum - World number (1-6)
 * @param {number} levelNum - Level number (1-10)
 * @returns {boolean}
 */
function isLevelUnlocked(worldNum, levelNum) {
    const totalStars = Stars.getTotalStars();

    // Check if world is unlocked
    if (!LevelRegistry.isWorldUnlocked(worldNum, totalStars)) {
        return false;
    }

    // Level 1 of any unlocked world is playable
    if (levelNum === 1) {
        return true;
    }

    // Check if previous level is completed (at least 1 star)
    const prevLevelId = `world${worldNum}-level${levelNum - 1}`;
    return Stars.getForLevel(prevLevelId) > 0;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the level select screen state.
 */
export function init() {
    // Start with the first unlocked world that has incomplete levels
    const totalStars = Stars.getTotalStars();
    currentWorld = 1;

    // Find the best world to display (first with playable levels)
    for (let w = LEVEL_CONSTANTS.WORLDS; w >= 1; w--) {
        if (LevelRegistry.isWorldUnlocked(w, totalStars)) {
            currentWorld = w;
            break;
        }
    }

    animationTime = 0;
    hoveredLevel = -1;
    hoveredWorld = -1;
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle click/tap on level select screen.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleClick(pos) {
    // Check back button
    if (isInsideRect(pos, CONFIG.BACK_BUTTON)) {
        Sound.playClickSound();
        Game.setState(GAME_STATES.MENU);
        return;
    }

    // Check left/right world arrows
    const arrowY = CONFIG.HEADER_HEIGHT / 2 - CONFIG.WORLD_ARROW_SIZE / 2 + 10;
    const leftArrowRect = {
        x: 20,
        y: arrowY,
        width: CONFIG.WORLD_ARROW_SIZE,
        height: CONFIG.WORLD_ARROW_SIZE
    };
    const rightArrowRect = {
        x: Renderer.getWidth() - 20 - CONFIG.WORLD_ARROW_SIZE,
        y: arrowY,
        width: CONFIG.WORLD_ARROW_SIZE,
        height: CONFIG.WORLD_ARROW_SIZE
    };

    if (isInsideRect(pos, leftArrowRect) && currentWorld > 1) {
        Sound.playClickSound();
        const prevWorld = currentWorld - 1;
        if (LevelRegistry.isWorldUnlocked(prevWorld, Stars.getTotalStars())) {
            currentWorld = prevWorld;
        }
        return;
    }

    if (isInsideRect(pos, rightArrowRect) && currentWorld < LEVEL_CONSTANTS.WORLDS) {
        Sound.playClickSound();
        const nextWorld = currentWorld + 1;
        if (LevelRegistry.isWorldUnlocked(nextWorld, Stars.getTotalStars())) {
            currentWorld = nextWorld;
        }
        return;
    }

    // Check world navigation dots
    const dotsWidth = LEVEL_CONSTANTS.WORLDS * CONFIG.WORLD_DOT_SIZE + (LEVEL_CONSTANTS.WORLDS - 1) * CONFIG.WORLD_DOT_GAP;
    const dotsStartX = (Renderer.getWidth() - dotsWidth) / 2;
    const dotsY = Renderer.getHeight() - CONFIG.FOOTER_HEIGHT + 10;

    for (let w = 1; w <= LEVEL_CONSTANTS.WORLDS; w++) {
        const dotX = dotsStartX + (w - 1) * (CONFIG.WORLD_DOT_SIZE + CONFIG.WORLD_DOT_GAP);
        // Touch target expanded to minimum 44pt for accessibility
        const dotRect = {
            x: dotX - 14,
            y: dotsY - 14,
            width: CONFIG.WORLD_DOT_SIZE + 28,
            height: CONFIG.WORLD_DOT_SIZE + 28
        };

        if (isInsideRect(pos, dotRect)) {
            if (LevelRegistry.isWorldUnlocked(w, Stars.getTotalStars())) {
                Sound.playClickSound();
                currentWorld = w;
            } else {
                // Play locked sound
                Sound.playClickSound();
            }
            return;
        }
    }

    // Check level buttons
    for (let i = 0; i < LEVEL_CONSTANTS.LEVELS_PER_WORLD; i++) {
        const levelNum = i + 1;
        const rect = getLevelButtonRect(i);

        if (isInsideRect(pos, rect)) {
            if (isLevelUnlocked(currentWorld, levelNum)) {
                Sound.playClickSound();
                startLevel(currentWorld, levelNum);
            } else {
                // Play locked sound
                Sound.playClickSound();
            }
            return;
        }
    }
}

/**
 * Handle pointer move for hover effects.
 * @param {{x: number, y: number}} pos - Pointer position
 */
function handlePointerMove(pos) {
    // Reset hover states
    hoveredLevel = -1;
    hoveredWorld = -1;

    // Check level buttons
    for (let i = 0; i < LEVEL_CONSTANTS.LEVELS_PER_WORLD; i++) {
        const rect = getLevelButtonRect(i);
        if (isInsideRect(pos, rect)) {
            hoveredLevel = i;
            break;
        }
    }

    // Check world dots
    const dotsWidth = LEVEL_CONSTANTS.WORLDS * CONFIG.WORLD_DOT_SIZE + (LEVEL_CONSTANTS.WORLDS - 1) * CONFIG.WORLD_DOT_GAP;
    const dotsStartX = (Renderer.getWidth() - dotsWidth) / 2;
    const dotsY = Renderer.getHeight() - CONFIG.FOOTER_HEIGHT + 10;

    for (let w = 1; w <= LEVEL_CONSTANTS.WORLDS; w++) {
        const dotX = dotsStartX + (w - 1) * (CONFIG.WORLD_DOT_SIZE + CONFIG.WORLD_DOT_GAP);
        // Touch target expanded to minimum 44pt for accessibility
        const dotRect = {
            x: dotX - 14,
            y: dotsY - 14,
            width: CONFIG.WORLD_DOT_SIZE + 28,
            height: CONFIG.WORLD_DOT_SIZE + 28
        };

        if (isInsideRect(pos, dotRect)) {
            hoveredWorld = w;
            break;
        }
    }
}

/**
 * Handle key press on level select screen.
 * @param {string} keyCode - Key code
 */
function handleKeyDown(keyCode) {
    if (keyCode === 'Escape') {
        Sound.playClickSound();
        Game.setState(GAME_STATES.MENU);
    } else if (keyCode === 'ArrowLeft') {
        if (currentWorld > 1) {
            const prevWorld = currentWorld - 1;
            if (LevelRegistry.isWorldUnlocked(prevWorld, Stars.getTotalStars())) {
                Sound.playClickSound();
                currentWorld = prevWorld;
            }
        }
    } else if (keyCode === 'ArrowRight') {
        if (currentWorld < LEVEL_CONSTANTS.WORLDS) {
            const nextWorld = currentWorld + 1;
            if (LevelRegistry.isWorldUnlocked(nextWorld, Stars.getTotalStars())) {
                Sound.playClickSound();
                currentWorld = nextWorld;
            }
        }
    }
}

/**
 * Check if a point is inside a rectangle.
 * @param {{x: number, y: number}} pos - Point position
 * @param {{x: number, y: number, width: number, height: number}} rect - Rectangle
 * @returns {boolean}
 */
function isInsideRect(pos, rect) {
    return (
        pos.x >= rect.x &&
        pos.x <= rect.x + rect.width &&
        pos.y >= rect.y &&
        pos.y <= rect.y + rect.height
    );
}

/**
 * Start a selected level.
 * Dispatches a custom event that main.js listens for to start the game.
 * @param {number} worldNum - World number (1-6)
 * @param {number} levelNum - Level number (1-10)
 */
function startLevel(worldNum, levelNum) {
    const levelId = `world${worldNum}-level${levelNum}`;
    const level = LevelRegistry.getLevel(levelId);

    if (!level) {
        console.error(`Level not found: ${levelId}`);
        return;
    }

    console.log(`Starting level: ${levelId} - ${level.name}`);

    // Dispatch custom event for main.js to handle
    const event = new CustomEvent('levelSelected', {
        detail: {
            levelId,
            level,
            worldNum,
            levelNum
        }
    });
    window.dispatchEvent(event);

    // Transition to playing state
    Game.setState(GAME_STATES.PLAYING);
}

// =============================================================================
// UPDATE
// =============================================================================

/**
 * Update level select screen state.
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    animationTime += deltaTime;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render the level select screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    // Clear with background
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, Renderer.getWidth(), Renderer.getHeight());

    renderWorldBackdrop(ctx);

    // Render components
    renderHeader(ctx);
    renderLevelGrid(ctx);
    renderLevelFocusPanel(ctx);
    renderWorldNavigation(ctx);
    renderBackButton(ctx);
    renderFooter(ctx);
}

/**
 * Render the current world's battlefield art as a dimmed backdrop so the
 * level select feels like part of that world instead of a void.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderWorldBackdrop(ctx) {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const backdrop = getAsset(`backgrounds.world${currentWorld}`);

    if (!backdrop || !backdrop.complete || !(backdrop.naturalWidth > 0)) {
        // Kick off the load so world flips fill in within a frame or two.
        loadAsset?.(`backgrounds.world${currentWorld}`);
        return;
    }

    ctx.save();

    // Cover-fit draw.
    const imgAspect = backdrop.naturalWidth / backdrop.naturalHeight;
    const targetAspect = width / height;
    let sx = 0;
    let sy = 0;
    let sw = backdrop.naturalWidth;
    let sh = backdrop.naturalHeight;
    if (targetAspect > imgAspect) {
        sh = backdrop.naturalWidth / targetAspect;
        sy = (backdrop.naturalHeight - sh) / 2;
    } else {
        sw = backdrop.naturalHeight * targetAspect;
        sx = (backdrop.naturalWidth - sw) / 2;
    }
    ctx.globalAlpha = 0.45;
    ctx.drawImage(backdrop, sx, sy, sw, sh, 0, 0, width, height);
    ctx.globalAlpha = 1;

    // Legibility veil: darken overall and vignette toward the grid area.
    ctx.fillStyle = 'rgba(7, 2, 18, 0.55)';
    ctx.fillRect(0, 0, width, height);
    const vignette = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.22,
        width / 2, height / 2, height * 0.85
    );
    vignette.addColorStop(0, 'rgba(7, 2, 18, 0)');
    vignette.addColorStop(1, 'rgba(7, 2, 18, 0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
}

/**
 * Render the header with world name and star progress.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderHeader(ctx) {
    const theme = WORLD_THEMES[currentWorld];
    const worldStars = Stars.getWorldStars(currentWorld);
    const totalStars = Stars.getTotalStars();

    ctx.save();

    // World navigation arrows
    const arrowY = CONFIG.HEADER_HEIGHT / 2 + 10;
    ctx.font = `bold 32px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Left arrow
    if (currentWorld > 1 && LevelRegistry.isWorldUnlocked(currentWorld - 1, totalStars)) {
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 8;
        ctx.fillText('\u2190', 42, arrowY);
    } else if (currentWorld > 1) {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.shadowBlur = 0;
        ctx.fillText('\u2190', 42, arrowY);
    }

    // Right arrow
    if (currentWorld < LEVEL_CONSTANTS.WORLDS && LevelRegistry.isWorldUnlocked(currentWorld + 1, totalStars)) {
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 8;
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.fillText('\u2192', Renderer.getWidth() - 42, arrowY);
    } else if (currentWorld < LEVEL_CONSTANTS.WORLDS) {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.shadowBlur = 0;
        ctx.fillText('\u2192', Renderer.getWidth() - 42, arrowY);
    }

    ctx.shadowBlur = 0;

    // World title
    ctx.fillStyle = theme.primaryColor;
    ctx.font = `bold 36px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = theme.primaryColor;
    ctx.shadowBlur = 12;
    ctx.fillText(`WORLD ${currentWorld}: ${theme.name.toUpperCase()}`, Renderer.getWidth() / 2, 50);

    // Star progress
    ctx.shadowBlur = 6;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold 24px ${UI.FONT_FAMILY}`;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    const progressText = `${worldStars.earned}/${worldStars.possible}`;
    const progressWidth = ctx.measureText(progressText).width;
    drawStarIcon(ctx, Renderer.getWidth() / 2 - progressWidth / 2 - 18, 85, 24, true, { glow: 6 });
    ctx.fillText(progressText, Renderer.getWidth() / 2 + 13, 85);

    ctx.restore();
}

/**
 * Render the level grid (5x2 buttons).
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderLevelGrid(ctx) {
    const theme = WORLD_THEMES[currentWorld];
    const pulseIntensity = (Math.sin(animationTime * CONFIG.PULSE_SPEED) + 1) / 2;

    ctx.save();

    for (let i = 0; i < LEVEL_CONSTANTS.LEVELS_PER_WORLD; i++) {
        const levelNum = i + 1;
        const levelId = `world${currentWorld}-level${levelNum}`;
        const level = LevelRegistry.getLevelByNumber(currentWorld, levelNum);
        const stars = Stars.getForLevel(levelId);
        const unlocked = isLevelUnlocked(currentWorld, levelNum);
        const isHovered = hoveredLevel === i;

        const rect = getLevelButtonRect(i);

        renderLevelButton(ctx, {
            rect,
            levelNum,
            level,
            stars,
            unlocked,
            isHovered,
            theme,
            pulseIntensity
        });
    }

    ctx.restore();
}

/**
 * Render a single level button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} params - Button parameters
 */
function renderLevelButton(ctx, { rect, levelNum, level, stars, unlocked, isHovered, theme, pulseIntensity }) {
    const { x, y, width, height } = rect;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.save();

    // Hovered cards lift slightly for tactile feedback.
    const lift = unlocked && isHovered ? -3 : 0;
    const cardY = y + lift;

    // Drop shadow grounds the card against the world backdrop.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(x + 3, cardY + 6, width, height, 12);
    ctx.fill();

    // Card body gradient.
    const bodyGradient = ctx.createLinearGradient(x, cardY, x, cardY + height);
    if (unlocked) {
        bodyGradient.addColorStop(0, isHovered ? 'rgba(46, 36, 84, 0.97)' : 'rgba(34, 26, 64, 0.95)');
        bodyGradient.addColorStop(0.5, 'rgba(18, 14, 40, 0.96)');
        bodyGradient.addColorStop(1, 'rgba(10, 8, 26, 0.97)');
    } else {
        bodyGradient.addColorStop(0, 'rgba(16, 14, 30, 0.82)');
        bodyGradient.addColorStop(1, 'rgba(8, 7, 18, 0.85)');
    }
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.roundRect(x, cardY, width, height, 12);
    ctx.fill();

    // Top sheen highlight sells the chrome card feel.
    if (unlocked) {
        const sheen = ctx.createLinearGradient(x, cardY, x, cardY + height * 0.4);
        sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
        sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.roundRect(x + 2, cardY + 2, width - 4, height * 0.4, 10);
        ctx.fill();
    }

    // Border + glow.
    if (unlocked) {
        ctx.strokeStyle = isHovered ? theme.primaryColor : theme.secondaryColor;
        ctx.lineWidth = isHovered ? 3 : 2;
        if (isHovered) {
            ctx.shadowColor = theme.primaryColor;
            ctx.shadowBlur = 15 + pulseIntensity * 10;
        } else if (stars > 0) {
            ctx.shadowColor = theme.secondaryColor;
            ctx.shadowBlur = 8;
        }
    } else {
        ctx.strokeStyle = 'rgba(136, 136, 153, 0.4)';
        ctx.lineWidth = 1;
    }
    ctx.beginPath();
    ctx.roundRect(x, cardY, width, height, 12);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Level number or lock icon
    if (unlocked) {
        ctx.fillStyle = isHovered ? theme.primaryColor : COLORS.TEXT_LIGHT;
        ctx.font = `bold 36px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isHovered) {
            ctx.shadowColor = theme.primaryColor;
            ctx.shadowBlur = 8;
        }
        ctx.fillText(String(levelNum), centerX, cardY + height / 2 - 12);
        ctx.shadowBlur = 0;

        if (level?.progression?.isIntroLevel) {
            renderNewAmmoBadge(ctx, x + width - 42, cardY + 8, theme, pulseIntensity);
        }

        // Star display
        renderStars(ctx, centerX, cardY + height / 2 + 28, stars, isHovered);
    } else {
        drawLockIcon(ctx, centerX, centerY, 38, 0.85);
    }

    ctx.restore();
}

function renderNewAmmoBadge(ctx, x, y, theme, pulseIntensity) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 26, 0.9)';
    ctx.strokeStyle = theme.primaryColor;
    ctx.lineWidth = 1;
    ctx.shadowColor = theme.primaryColor;
    ctx.shadowBlur = 5 + pulseIntensity * 5;
    ctx.beginPath();
    ctx.roundRect(x, y, 34, 16, 4);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = theme.primaryColor;
    ctx.font = `bold 9px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW', x + 17, y + 8);
    ctx.restore();
}

function getFeaturedLevel() {
    if (hoveredLevel >= 0) {
        const hoveredLevelNum = hoveredLevel + 1;
        if (isLevelUnlocked(currentWorld, hoveredLevelNum)) {
            return LevelRegistry.getLevelByNumber(currentWorld, hoveredLevelNum);
        }
    }

    for (let levelNum = 1; levelNum <= LEVEL_CONSTANTS.LEVELS_PER_WORLD; levelNum++) {
        if (!isLevelUnlocked(currentWorld, levelNum)) continue;
        const level = LevelRegistry.getLevelByNumber(currentWorld, levelNum);
        if (level && Stars.getForLevel(level.id) < 3) {
            return level;
        }
    }

    return LevelRegistry.getLevelByNumber(currentWorld, 1);
}

function truncateText(ctx, text, maxWidth) {
    if (!text || ctx.measureText(text).width <= maxWidth) return text || '';

    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(`${truncated}...`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }
    return `${truncated}...`;
}

function renderLevelFocusPanel(ctx) {
    const level = getFeaturedLevel();
    if (!level?.progression) return;

    const theme = WORLD_THEMES[currentWorld];
    const { startY, gridHeight } = getGridLayout();
    const panelY = startY + gridHeight + 22;
    const panelWidth = Math.min(760, Renderer.getWidth() - 180);
    const panelX = (Renderer.getWidth() - panelWidth) / 2;
    const progression = level.progression;
    const introText = progression.isIntroLevel
        ? `NEW AMMO: ${progression.introducedWeaponName} - ${progression.mechanic}`
        : `FOCUS: ${progression.mechanic}`;
    const loadoutText = `LOADOUT: ${progression.loadoutWeaponNames.join(', ')}`;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = theme.primaryColor;
    ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
    ctx.shadowColor = theme.primaryColor;
    ctx.shadowBlur = 8;
    ctx.fillText(`${level.world}-${level.level} ${progression.title}`, Renderer.getWidth() / 2, panelY);
    ctx.shadowBlur = 0;

    ctx.fillStyle = progression.isIntroLevel ? COLORS.NEON_YELLOW : COLORS.NEON_CYAN;
    ctx.font = `bold 13px ${UI.FONT_FAMILY}`;
    ctx.fillText(introText, Renderer.getWidth() / 2, panelY + 20);

    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `12px ${UI.FONT_FAMILY}`;
    ctx.fillText(truncateText(ctx, progression.summary, panelWidth), Renderer.getWidth() / 2, panelY + 39);

    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `11px ${UI.FONT_FAMILY}`;
    ctx.fillText(truncateText(ctx, loadoutText, panelWidth), Renderer.getWidth() / 2, panelY + 56);

    ctx.strokeStyle = `${theme.secondaryColor}66`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX, panelY + 70);
    ctx.lineTo(panelX + panelWidth, panelY + 70);
    ctx.stroke();

    ctx.restore();
}

/**
 * Render star indicators for a level.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} centerX - Center X position
 * @param {number} y - Y position
 * @param {number} earnedStars - Number of stars earned (0-3)
 * @param {boolean} isHovered - Whether the button is hovered
 */
function renderStars(ctx, centerX, y, earnedStars, isHovered) {
    const starSpacing = 22;
    const startX = centerX - starSpacing;

    for (let i = 0; i < 3; i++) {
        const x = startX + i * starSpacing;
        const earned = i < earnedStars;
        drawStarIcon(ctx, x, y, 19, earned, {
            glow: earned ? 6 : 0,
            alpha: earned || isHovered ? 1 : 0.55
        });
    }
}

/**
 * Render world navigation dots at the bottom.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderWorldNavigation(ctx) {
    const totalStars = Stars.getTotalStars();
    const dotsWidth = LEVEL_CONSTANTS.WORLDS * CONFIG.WORLD_DOT_SIZE + (LEVEL_CONSTANTS.WORLDS - 1) * CONFIG.WORLD_DOT_GAP;
    const startX = (Renderer.getWidth() - dotsWidth) / 2;
    const y = Renderer.getHeight() - CONFIG.FOOTER_HEIGHT + 10;

    ctx.save();

    for (let w = 1; w <= LEVEL_CONSTANTS.WORLDS; w++) {
        const theme = WORLD_THEMES[w];
        const unlocked = LevelRegistry.isWorldUnlocked(w, totalStars);
        const isActive = w === currentWorld;
        const isHovered = hoveredWorld === w;

        const x = startX + (w - 1) * (CONFIG.WORLD_DOT_SIZE + CONFIG.WORLD_DOT_GAP);

        // Dot
        ctx.beginPath();
        ctx.arc(x + CONFIG.WORLD_DOT_SIZE / 2, y + CONFIG.WORLD_DOT_SIZE / 2, CONFIG.WORLD_DOT_SIZE / 2, 0, Math.PI * 2);

        if (isActive) {
            ctx.fillStyle = theme.primaryColor;
            ctx.shadowColor = theme.primaryColor;
            ctx.shadowBlur = 12;
        } else if (unlocked) {
            ctx.fillStyle = isHovered ? theme.primaryColor : theme.secondaryColor;
            ctx.shadowColor = isHovered ? theme.primaryColor : theme.secondaryColor;
            ctx.shadowBlur = isHovered ? 10 : 6;
        } else {
            ctx.fillStyle = 'rgba(136, 136, 153, 0.3)';
            ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // World number label
        ctx.fillStyle = unlocked ? COLORS.TEXT_LIGHT : COLORS.TEXT_MUTED;
        ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(w), x + CONFIG.WORLD_DOT_SIZE / 2, y + CONFIG.WORLD_DOT_SIZE / 2);
    }

    ctx.restore();
}

/**
 * Render back button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderBackButton(ctx) {
    const btn = CONFIG.BACK_BUTTON;

    ctx.save();

    // Button background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button text
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2190 BACK', btn.x + btn.width / 2, btn.y + btn.height / 2);

    ctx.restore();
}

/**
 * Render footer with instructions and total stars.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderFooter(ctx) {
    const totalStars = Stars.getTotalStars();
    const maxStars = LEVEL_CONSTANTS.MAX_STARS_TOTAL;

    ctx.save();

    // Total stars display
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold 20px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 6;
    ctx.fillText(`TOTAL STARS: \u2605 ${totalStars}/${maxStars}`, Renderer.getWidth() / 2, Renderer.getHeight() - 50);
    ctx.shadowBlur = 0;

    // Next unlock info
    const nextLocked = Stars.getNextLockedWorld();
    if (nextLocked) {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `14px ${UI.FONT_FAMILY}`;
        ctx.fillText(`${nextLocked.starsNeeded} more stars to unlock World ${nextLocked.world}`, Renderer.getWidth() / 2, Renderer.getHeight() - 25);
    }

    ctx.restore();
}

// =============================================================================
// STATE SETUP
// =============================================================================

/**
 * Setup level select screen state handlers.
 * Call this during game initialization.
 */
export function setup() {
    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.LEVEL_SELECT) {
            handleClick({ x, y });
        }
    });

    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_SELECT) {
            handlePointerMove({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_SELECT) {
            handleClick({ x, y });
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_SELECT) {
            handlePointerMove({ x, y });
        }
    });

    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.LEVEL_SELECT) {
            handleKeyDown(keyCode);
        }
    });

    // Register state handlers
    Game.registerStateHandlers(GAME_STATES.LEVEL_SELECT, {
        onEnter: (fromState) => {
            console.log('Entered LEVEL_SELECT state');
            init();
            // Play menu music
            Music.playForState(GAME_STATES.MENU);
            // Ensure TitleScene is running (may be returning from gameplay)
            if (!TitleScene.isActive()) {
                TitleScene.start();
            }
        },
        onExit: (toState) => {
            console.log('Exiting LEVEL_SELECT state');
            hoveredLevel = -1;
            hoveredWorld = -1;
            // Stop TitleScene when going to gameplay states
            // Keep it running for MENU and MODE_SELECT (seamless transition)
            if (toState !== GAME_STATES.MENU && toState !== GAME_STATES.MODE_SELECT) {
                TitleScene.stop();
            }
        },
        update: update,
        render: render
    });
}

/**
 * Get the currently selected world.
 * @returns {number} Current world number (1-6)
 */
export function getCurrentWorld() {
    return currentWorld;
}

/**
 * Set the current world.
 * @param {number} world - World number (1-6)
 */
export function setCurrentWorld(world) {
    if (world >= 1 && world <= LEVEL_CONSTANTS.WORLDS) {
        currentWorld = world;
    }
}
