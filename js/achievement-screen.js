/**
 * Scorched Earth: Synthwave Edition
 * Achievement Screen UI
 *
 * Full-screen UI to view all achievements, progress, and unlock status.
 * Accessible from main menu with category filtering and scrolling.
 */

import { CANVAS, COLORS, UI, GAME_STATES } from './constants.js';
import * as Game from './game.js';
import * as Input from './input.js';
import * as Sound from './sound.js';
import * as Music from './music.js';
import {
    getAllAchievements,
    getAchievementsByCategory,
    isAchievementUnlocked,
    getAchievementProgress,
    getUnlockedCount,
    getAchievementCount,
    ACHIEVEMENT_CATEGORIES
} from './achievements.js';
import * as LifetimeStats from './lifetime-stats.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Layout
    HEADER_HEIGHT: 120,
    FILTER_HEIGHT: 50,
    FOOTER_HEIGHT: 80,
    ITEM_HEIGHT: 80,
    ITEM_PADDING: 12,
    ITEM_GAP: 8,
    SCROLL_MARGIN: 20,

    // Filter buttons
    FILTER_BUTTON_WIDTH: 140,
    FILTER_BUTTON_HEIGHT: 36,
    FILTER_BUTTON_GAP: 10,

    // Back button
    BACK_BUTTON: {
        x: 60,
        y: 40,
        width: 100,
        height: 40
    },

    // Scroll settings
    SCROLL_SPEED: 40,
    SCROLL_SENSITIVITY: 1.5,

    // Animation
    TRANSITION_DURATION: 200
};

// =============================================================================
// STATE
// =============================================================================

/** Current filter category ('all' or category key) */
let currentFilter = 'all';

/** Current scroll position */
let scrollY = 0;

/** Maximum scroll position */
let maxScrollY = 0;

/** Filtered achievements list */
let filteredAchievements = [];

/** Animation time for effects */
let animationTime = 0;

/** Touch/drag state for scrolling */
let isDragging = false;
let dragStartY = 0;
let dragStartScrollY = 0;

// =============================================================================
// FILTER CATEGORIES
// =============================================================================

/**
 * Filter options with display names and colors.
 */
const FILTERS = [
    { key: 'all', label: 'ALL', color: COLORS.TEXT_LIGHT },
    { key: 'combat', label: 'COMBAT', color: COLORS.NEON_PINK },
    { key: 'precision', label: 'PRECISION', color: COLORS.NEON_CYAN },
    { key: 'weapon_mastery', label: 'WEAPONS', color: COLORS.NEON_ORANGE },
    { key: 'progression', label: 'PROGRESS', color: COLORS.NEON_PURPLE },
    { key: 'economy', label: 'ECONOMY', color: COLORS.NEON_YELLOW },
    { key: 'stats', label: 'STATS', color: '#00FF88' }
];

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the achievements screen state.
 */
export function init() {
    currentFilter = 'all';
    scrollY = 0;
    animationTime = 0;
    isDragging = false;
    updateFilteredList();
}

/**
 * Update the filtered achievements list based on current filter.
 */
function updateFilteredList() {
    if (currentFilter === 'all') {
        filteredAchievements = getAllAchievements();
    } else {
        filteredAchievements = getAchievementsByCategory(currentFilter);
    }

    // Calculate max scroll
    const listHeight = filteredAchievements.length * (CONFIG.ITEM_HEIGHT + CONFIG.ITEM_GAP);
    const viewportHeight = CANVAS.DESIGN_HEIGHT - CONFIG.HEADER_HEIGHT - CONFIG.FILTER_HEIGHT - CONFIG.FOOTER_HEIGHT;
    maxScrollY = Math.max(0, listHeight - viewportHeight + CONFIG.SCROLL_MARGIN * 2);

    // Clamp scroll position
    scrollY = Math.max(0, Math.min(scrollY, maxScrollY));
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle click/tap on achievements screen.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleClick(pos) {
    // Check back button
    if (isInsideRect(pos, CONFIG.BACK_BUTTON)) {
        Sound.playClickSound();
        Game.setState(GAME_STATES.MENU);
        return;
    }

    // Check filter buttons
    const filterY = CONFIG.HEADER_HEIGHT + 10;
    const totalFilterWidth = FILTERS.length * (CONFIG.FILTER_BUTTON_WIDTH + CONFIG.FILTER_BUTTON_GAP) - CONFIG.FILTER_BUTTON_GAP;
    let filterX = (CANVAS.DESIGN_WIDTH - totalFilterWidth) / 2;

    for (const filter of FILTERS) {
        const buttonRect = {
            x: filterX,
            y: filterY,
            width: CONFIG.FILTER_BUTTON_WIDTH,
            height: CONFIG.FILTER_BUTTON_HEIGHT
        };

        if (isInsideRect(pos, buttonRect)) {
            Sound.playClickSound();
            if (currentFilter !== filter.key) {
                currentFilter = filter.key;
                scrollY = 0;
                updateFilteredList();
            }
            return;
        }

        filterX += CONFIG.FILTER_BUTTON_WIDTH + CONFIG.FILTER_BUTTON_GAP;
    }
}

/**
 * Handle key press on achievements screen.
 * @param {string} keyCode - Key code
 */
function handleKeyDown(keyCode) {
    if (keyCode === 'Escape') {
        Sound.playClickSound();
        Game.setState(GAME_STATES.MENU);
    } else if (keyCode === 'ArrowUp') {
        scrollY = Math.max(0, scrollY - CONFIG.SCROLL_SPEED);
    } else if (keyCode === 'ArrowDown') {
        scrollY = Math.min(maxScrollY, scrollY + CONFIG.SCROLL_SPEED);
    }
}

/**
 * Handle mouse wheel for scrolling.
 * @param {number} deltaY - Scroll delta
 */
function handleWheel(deltaY) {
    scrollY = Math.max(0, Math.min(maxScrollY, scrollY + deltaY * CONFIG.SCROLL_SENSITIVITY));
}

/**
 * Handle touch/mouse drag start for scrolling.
 * @param {number} y - Y position
 */
function handleDragStart(y) {
    const listTop = CONFIG.HEADER_HEIGHT + CONFIG.FILTER_HEIGHT;
    const listBottom = CANVAS.DESIGN_HEIGHT - CONFIG.FOOTER_HEIGHT;

    if (y >= listTop && y <= listBottom) {
        isDragging = true;
        dragStartY = y;
        dragStartScrollY = scrollY;
    }
}

/**
 * Handle touch/mouse drag move for scrolling.
 * @param {number} y - Y position
 */
function handleDragMove(y) {
    if (!isDragging) return;

    const deltaY = dragStartY - y;
    scrollY = Math.max(0, Math.min(maxScrollY, dragStartScrollY + deltaY));
}

/**
 * Handle touch/mouse drag end.
 */
function handleDragEnd() {
    isDragging = false;
}

/**
 * Check if a point is inside a rectangle.
 * @param {{x: number, y: number}} pos - Point position
 * @param {{x: number, y: number, width: number, height: number}} rect - Rectangle
 * @returns {boolean} True if inside
 */
function isInsideRect(pos, rect) {
    return (
        pos.x >= rect.x &&
        pos.x <= rect.x + rect.width &&
        pos.y >= rect.y &&
        pos.y <= rect.y + rect.height
    );
}

// =============================================================================
// UPDATE
// =============================================================================

/**
 * Update achievements screen state.
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    animationTime += deltaTime;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render the achievements screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    // Clear with background
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Render components
    renderHeader(ctx);
    renderFilters(ctx);
    if (currentFilter === 'stats') {
        renderStatsView(ctx);
    } else {
        renderAchievementList(ctx);
    }
    renderFooter(ctx);
    renderBackButton(ctx);
}

/**
 * Render the header with title and progress.
 */
function renderHeader(ctx) {
    const unlockedCount = getUnlockedCount();
    const totalCount = getAchievementCount();

    ctx.save();

    // Title
    ctx.fillStyle = COLORS.NEON_ORANGE;
    ctx.font = `bold 48px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.NEON_ORANGE;
    ctx.shadowBlur = 12;
    ctx.fillText('ACHIEVEMENTS', CANVAS.DESIGN_WIDTH / 2, 50);

    // Progress counter
    ctx.shadowBlur = 6;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold 24px ${UI.FONT_FAMILY}`;
    ctx.fillText(`${unlockedCount} / ${totalCount} UNLOCKED`, CANVAS.DESIGN_WIDTH / 2, 95);

    ctx.restore();
}

/**
 * Render filter buttons.
 */
function renderFilters(ctx) {
    const filterY = CONFIG.HEADER_HEIGHT + 10;
    const totalFilterWidth = FILTERS.length * (CONFIG.FILTER_BUTTON_WIDTH + CONFIG.FILTER_BUTTON_GAP) - CONFIG.FILTER_BUTTON_GAP;
    let filterX = (CANVAS.DESIGN_WIDTH - totalFilterWidth) / 2;

    ctx.save();

    for (const filter of FILTERS) {
        const isActive = currentFilter === filter.key;
        const buttonColor = filter.color;

        // Button background
        if (isActive) {
            ctx.fillStyle = buttonColor;
            ctx.globalAlpha = 0.3;
        } else {
            ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
            ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        ctx.roundRect(filterX, filterY, CONFIG.FILTER_BUTTON_WIDTH, CONFIG.FILTER_BUTTON_HEIGHT, 6);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Button border
        ctx.strokeStyle = isActive ? buttonColor : COLORS.TEXT_MUTED;
        ctx.lineWidth = isActive ? 2 : 1;
        if (isActive) {
            ctx.shadowColor = buttonColor;
            ctx.shadowBlur = 8;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Button text
        ctx.fillStyle = isActive ? buttonColor : COLORS.TEXT_MUTED;
        ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(filter.label, filterX + CONFIG.FILTER_BUTTON_WIDTH / 2, filterY + CONFIG.FILTER_BUTTON_HEIGHT / 2);

        filterX += CONFIG.FILTER_BUTTON_WIDTH + CONFIG.FILTER_BUTTON_GAP;
    }

    ctx.restore();
}

/**
 * Render the scrollable achievement list.
 */
function renderAchievementList(ctx) {
    const listTop = CONFIG.HEADER_HEIGHT + CONFIG.FILTER_HEIGHT + CONFIG.SCROLL_MARGIN;
    const listBottom = CANVAS.DESIGN_HEIGHT - CONFIG.FOOTER_HEIGHT;
    const listHeight = listBottom - listTop;

    ctx.save();

    // Clip to list area
    ctx.beginPath();
    ctx.rect(0, listTop, CANVAS.DESIGN_WIDTH, listHeight);
    ctx.clip();

    // Render each achievement
    let y = listTop - scrollY;
    for (const achievement of filteredAchievements) {
        // Skip if completely outside viewport
        if (y + CONFIG.ITEM_HEIGHT < listTop || y > listBottom) {
            y += CONFIG.ITEM_HEIGHT + CONFIG.ITEM_GAP;
            continue;
        }

        renderAchievementItem(ctx, achievement, y);
        y += CONFIG.ITEM_HEIGHT + CONFIG.ITEM_GAP;
    }

    ctx.restore();

    // Render scroll indicators if needed
    if (maxScrollY > 0) {
        renderScrollIndicators(ctx, listTop, listBottom);
    }
}

/**
 * Render a single achievement item.
 */
function renderAchievementItem(ctx, achievement, y) {
    const x = 60;
    const width = CANVAS.DESIGN_WIDTH - 120;
    const height = CONFIG.ITEM_HEIGHT;
    const unlocked = isAchievementUnlocked(achievement.id);
    const progress = getAchievementProgress(achievement.id);
    const isHidden = achievement.hidden && !unlocked;

    // Get category color
    const categoryColors = {
        combat: COLORS.NEON_PINK,
        precision: COLORS.NEON_CYAN,
        weapon_mastery: COLORS.NEON_ORANGE,
        progression: COLORS.NEON_PURPLE,
        economy: COLORS.NEON_YELLOW,
        hidden: COLORS.NEON_PURPLE
    };
    const accentColor = categoryColors[achievement.category] || COLORS.NEON_CYAN;

    ctx.save();

    // Background
    ctx.fillStyle = unlocked ? 'rgba(20, 20, 40, 0.9)' : 'rgba(10, 10, 26, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = unlocked ? accentColor : 'rgba(136, 136, 153, 0.5)';
    ctx.lineWidth = unlocked ? 2 : 1;
    if (unlocked) {
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 6;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Star icon
    const starX = x + 24;
    const starY = y + height / 2;
    ctx.font = `bold 28px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isHidden) {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText('?', starX, starY);
    } else if (unlocked) {
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.shadowColor = COLORS.NEON_YELLOW;
        ctx.shadowBlur = 6;
        ctx.fillText('\u2605', starX, starY); // Filled star
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText('\u2606', starX, starY); // Empty star
    }

    // Achievement name
    const textX = x + 56;
    ctx.textAlign = 'left';
    ctx.font = `bold 18px ${UI.FONT_FAMILY}`;
    if (isHidden) {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText('? ? ? ? ? ? ?', textX, y + 28);
    } else {
        ctx.fillStyle = unlocked ? accentColor : COLORS.TEXT_LIGHT;
        if (unlocked) {
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 4;
        }
        ctx.fillText(achievement.name.toUpperCase(), textX, y + 28);
        ctx.shadowBlur = 0;
    }

    // Achievement description
    ctx.font = `14px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    if (isHidden) {
        ctx.fillText('"Complete a secret challenge"', textX, y + 52);
    } else {
        ctx.fillText(`"${achievement.description}"`, textX, y + 52);
    }

    // Status indicator (right side)
    const statusX = x + width - 100;
    ctx.textAlign = 'right';

    if (unlocked) {
        // Checkmark for unlocked
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
        ctx.fillText('UNLOCKED \u2713', statusX + 80, y + height / 2);
    } else if (isHidden) {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `14px ${UI.FONT_FAMILY}`;
        ctx.fillText('HIDDEN', statusX + 80, y + height / 2);
    } else if (achievement.type === 'counter' && progress !== null) {
        // Progress bar for counter achievements
        const target = achievement.target || 1;
        const current = progress.current || 0;
        const progressText = `${current}/${target}`;

        // Progress bar background
        const barX = statusX - 20;
        const barY = y + height / 2 - 6;
        const barWidth = 80;
        const barHeight = 12;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 4);
        ctx.fill();

        // Progress bar fill
        const fillWidth = (current / target) * barWidth;
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillWidth, barHeight, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Progress text
        ctx.fillStyle = COLORS.TEXT_LIGHT;
        ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText(progressText, barX + barWidth / 2, barY + barHeight / 2 + 1);
    } else {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `14px ${UI.FONT_FAMILY}`;
        ctx.fillText('LOCKED', statusX + 80, y + height / 2);
    }

    ctx.restore();
}

/**
 * Render scroll indicators.
 */
function renderScrollIndicators(ctx, listTop, listBottom) {
    ctx.save();

    // Top indicator (if scrolled down)
    if (scrollY > 0) {
        const gradient = ctx.createLinearGradient(0, listTop, 0, listTop + 30);
        gradient.addColorStop(0, COLORS.BACKGROUND);
        gradient.addColorStop(1, 'rgba(10, 10, 26, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, listTop, CANVAS.DESIGN_WIDTH, 30);

        // Up arrow
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `20px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('\u25B2', CANVAS.DESIGN_WIDTH / 2, listTop + 15);
    }

    // Bottom indicator (if more content below)
    if (scrollY < maxScrollY) {
        const gradient = ctx.createLinearGradient(0, listBottom - 30, 0, listBottom);
        gradient.addColorStop(0, 'rgba(10, 10, 26, 0)');
        gradient.addColorStop(1, COLORS.BACKGROUND);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, listBottom - 30, CANVAS.DESIGN_WIDTH, 30);

        // Down arrow
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `20px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC', CANVAS.DESIGN_WIDTH / 2, listBottom - 10);
    }

    ctx.restore();
}

/**
 * Render the lifetime statistics view.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderStatsView(ctx) {
    const summary = LifetimeStats.getSummary();
    const listTop = CONFIG.HEADER_HEIGHT + CONFIG.FILTER_HEIGHT + 20;
    const listBottom = CANVAS.DESIGN_HEIGHT - CONFIG.FOOTER_HEIGHT;

    ctx.save();

    // Stats container background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.6)';
    ctx.beginPath();
    ctx.roundRect(40, listTop, CANVAS.DESIGN_WIDTH - 80, listBottom - listTop - 20, 12);
    ctx.fill();

    // Stats title
    ctx.fillStyle = '#00FF88';
    ctx.font = `bold 28px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00FF88';
    ctx.shadowBlur = 8;
    ctx.fillText('LIFETIME STATISTICS', CANVAS.DESIGN_WIDTH / 2, listTop + 40);
    ctx.shadowBlur = 0;

    // Define stat rows in two columns
    const leftStats = [
        { label: 'TOTAL WINS', value: summary.wins.toLocaleString(), color: COLORS.NEON_CYAN },
        { label: 'TOTAL LOSSES', value: summary.losses.toLocaleString(), color: COLORS.NEON_PINK },
        { label: 'WIN RATE', value: `${summary.winRate}%`, color: summary.winRate >= 50 ? COLORS.NEON_CYAN : COLORS.TEXT_LIGHT },
        { label: 'HIGHEST ROUND', value: summary.highestRound.toLocaleString(), color: COLORS.NEON_ORANGE },
        { label: 'TOTAL KILLS', value: summary.totalKills.toLocaleString(), color: COLORS.NEON_PINK },
        { label: 'K/D RATIO', value: summary.kdRatio, color: COLORS.TEXT_LIGHT },
        { label: 'FLAWLESS WINS', value: summary.flawlessWins.toLocaleString(), color: COLORS.NEON_YELLOW }
    ];

    const rightStats = [
        { label: 'ACCURACY', value: `${summary.accuracy}%`, color: summary.accuracy >= 50 ? COLORS.NEON_CYAN : COLORS.TEXT_LIGHT },
        { label: 'BEST ACCURACY', value: `${summary.bestAccuracy}%`, color: COLORS.NEON_YELLOW },
        { label: 'DAMAGE DEALT', value: summary.damageDealt.toLocaleString(), color: COLORS.NEON_ORANGE },
        { label: 'BIGGEST HIT', value: summary.biggestHit.toLocaleString(), color: COLORS.NEON_PINK },
        { label: 'LONGEST STREAK', value: summary.longestStreak.toLocaleString(), color: COLORS.NEON_PURPLE },
        { label: 'TANKS UNLOCKED', value: summary.tanksUnlocked.toLocaleString(), color: '#00FF88' },
        { label: 'ACHIEVEMENTS', value: summary.achievementsUnlocked.toLocaleString(), color: COLORS.NEON_ORANGE }
    ];

    const rowHeight = 42;
    const leftX = 100;
    const rightX = CANVAS.DESIGN_WIDTH / 2 + 60;
    let startY = listTop + 90;

    // Render left column
    for (let i = 0; i < leftStats.length; i++) {
        const stat = leftStats[i];
        const y = startY + i * rowHeight;

        // Label
        ctx.textAlign = 'left';
        ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText(stat.label, leftX, y);

        // Value
        ctx.textAlign = 'right';
        ctx.fillStyle = stat.color;
        ctx.shadowColor = stat.color;
        ctx.shadowBlur = 4;
        ctx.fillText(stat.value, CANVAS.DESIGN_WIDTH / 2 - 60, y);
        ctx.shadowBlur = 0;
    }

    // Render right column
    for (let i = 0; i < rightStats.length; i++) {
        const stat = rightStats[i];
        const y = startY + i * rowHeight;

        // Label
        ctx.textAlign = 'left';
        ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText(stat.label, rightX, y);

        // Value
        ctx.textAlign = 'right';
        ctx.fillStyle = stat.color;
        ctx.shadowColor = stat.color;
        ctx.shadowBlur = 4;
        ctx.fillText(stat.value, CANVAS.DESIGN_WIDTH - 100, y);
        ctx.shadowBlur = 0;
    }

    // Footer info
    ctx.textAlign = 'center';
    ctx.font = `14px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.fillText(`Total Runs: ${summary.totalRuns} | Play Time: ${summary.playTime}`, CANVAS.DESIGN_WIDTH / 2, listBottom - 40);

    // Favorite weapon (if any)
    if (summary.favoriteWeapon) {
        ctx.fillStyle = COLORS.TEXT_LIGHT;
        ctx.fillText(`Favorite Weapon: ${summary.favoriteWeapon.toUpperCase().replace(/-/g, ' ')}`, CANVAS.DESIGN_WIDTH / 2, listBottom - 60);
    }

    ctx.restore();
}

/**
 * Render footer with instructions.
 */
function renderFooter(ctx) {
    ctx.save();

    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Use arrow keys or scroll to navigate', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 40);

    ctx.restore();
}

/**
 * Render back button.
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
    ctx.stroke();

    // Button text
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2190 BACK', btn.x + btn.width / 2, btn.y + btn.height / 2);

    ctx.restore();
}

// =============================================================================
// STATE SETUP
// =============================================================================

/**
 * Setup achievements screen state handlers.
 * Call this during game initialization.
 */
export function setup() {
    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.ACHIEVEMENTS) {
            handleClick({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.ACHIEVEMENTS) {
            handleClick({ x, y });
            handleDragStart(y);
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.ACHIEVEMENTS) {
            handleDragMove(y);
        }
    });

    Input.onTouchEnd(() => {
        if (Game.getState() === GAME_STATES.ACHIEVEMENTS) {
            handleDragEnd();
        }
    });

    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.ACHIEVEMENTS) {
            handleKeyDown(keyCode);
        }
    });

    // Mouse wheel scrolling
    if (typeof window !== 'undefined') {
        window.addEventListener('wheel', (event) => {
            if (Game.getState() === GAME_STATES.ACHIEVEMENTS) {
                handleWheel(event.deltaY);
            }
        }, { passive: true });
    }

    // Register state handlers
    Game.registerStateHandlers(GAME_STATES.ACHIEVEMENTS, {
        onEnter: (fromState) => {
            console.log('Entered ACHIEVEMENTS state');
            init();
            // Play menu music (reuse)
            Music.playForState(GAME_STATES.MENU);
        },
        onExit: (toState) => {
            console.log('Exiting ACHIEVEMENTS state');
        },
        update: update,
        render: render
    });
}
