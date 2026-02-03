/**
 * Scorched Earth: Synthwave Edition
 * Tank Collection Screen UI
 *
 * Full-screen UI to browse tank collection, view details, and equip tanks.
 * Accessible from main menu with rarity filtering and grid scrolling.
 */

import { CANVAS, COLORS, UI, GAME_STATES } from './constants.js';
import * as Renderer from './renderer.js';
import * as Game from './game.js';
import * as Input from './input.js';
import * as Sound from './sound.js';
import * as Music from './music.js';
import * as Assets from './assets.js';
import { getAllTanks, getTanksByRarity, getTank, RARITY, RARITY_COLORS, RARITY_ORDER } from './tank-skins.js';
import { getEquippedSkinAssetKey, isRealSprite } from './tank-visuals.js';
import {
    ownsTank,
    getOwnedCount,
    getEquippedTankId,
    setEquippedTank,
    getNewTanks,
    markTankViewed,
    getCollectionProgress,
    getScrap,
    getScrapShopTanks,
    purchaseTankWithScrap,
    SCRAP_SHOP_COSTS,
    init as initCollection
} from './tank-collection.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Layout
    HEADER_HEIGHT: 100,
    FILTER_HEIGHT: 50,
    GRID_TOP_PADDING: 20,
    DETAILS_HEIGHT: 140,
    FOOTER_HEIGHT: 40,

    // Grid
    GRID_COLUMNS: 5,
    CARD_WIDTH: 180,
    CARD_HEIGHT: 120,
    CARD_GAP: 16,
    GRID_PADDING: 60,

    // Filter buttons
    FILTER_BUTTON_WIDTH: 130,
    FILTER_BUTTON_HEIGHT: 36,
    FILTER_BUTTON_GAP: 8,

    // Back button
    BACK_BUTTON: {
        x: 60,
        y: 30,
        width: 100,
        height: 40
    },

    // Scrap Shop button
    SCRAP_SHOP_BUTTON: {
        x: 1020,
        y: 30,
        width: 140,
        height: 40
    },

    // Equip button
    EQUIP_BUTTON: {
        width: 160,
        height: 45
    },

    // Purchase button (in scrap shop mode)
    PURCHASE_BUTTON: {
        width: 180,
        height: 45
    },

    // Scroll settings
    SCROLL_SPEED: 60,
    SCROLL_SENSITIVITY: 1.5,

    // Animation
    ANIMATION_SPEED: 0.003
};;

// =============================================================================
// STATE
// =============================================================================

/** Current filter rarity ('all' or rarity key) */
let currentFilter = 'all';

/** Current scroll position */
let scrollY = 0;

/** Maximum scroll position */
let maxScrollY = 0;

/** Filtered tanks list */
let filteredTanks = [];

/** Currently selected tank ID (or null) */
let selectedTankId = null;

/** Animation time for effects */
let animationTime = 0;

/** Touch/drag state for scrolling */
let isDragging = false;
let dragStartY = 0;
let dragStartScrollY = 0;

/** New tanks set for badge display */
let newTanksSet = new Set();

/** Whether scrap shop mode is active */
let isScrapShopMode = false;

/** Purchasable tanks list (filtered) */
let shopTanks = [];

/** State to return to when exiting (if came from round transition) */
let returnToState = GAME_STATES.MENU;

// =============================================================================
// FILTER CATEGORIES
// =============================================================================

/**
 * Filter options with display names and colors.
 */
const FILTERS = [
    { key: 'all', label: 'ALL', color: COLORS.TEXT_LIGHT },
    { key: RARITY.COMMON, label: 'COMMON', color: RARITY_COLORS[RARITY.COMMON] },
    { key: RARITY.UNCOMMON, label: 'UNCOMMON', color: RARITY_COLORS[RARITY.UNCOMMON] },
    { key: RARITY.RARE, label: 'RARE', color: RARITY_COLORS[RARITY.RARE] },
    { key: RARITY.EPIC, label: 'EPIC', color: RARITY_COLORS[RARITY.EPIC] },
    { key: RARITY.LEGENDARY, label: 'LEGEND', color: RARITY_COLORS[RARITY.LEGENDARY] }
];

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the collection screen state.
 */
export function init() {
    currentFilter = 'all';
    scrollY = 0;
    animationTime = 0;
    isDragging = false;
    selectedTankId = null;
    newTanksSet = new Set(getNewTanks());
    isScrapShopMode = false;
    shopTanks = [];
    updateFilteredList();
}

/**
 * Update the filtered tanks list based on current filter.
 */
function updateFilteredList() {
    if (isScrapShopMode) {
        // Get purchasable tanks (excludes legendary and owned)
        if (currentFilter === 'all') {
            shopTanks = getScrapShopTanks().sort((a, b) => {
                const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
                if (rarityDiff !== 0) return rarityDiff;
                return a.name.localeCompare(b.name);
            });
        } else if (currentFilter !== 'legendary') {
            shopTanks = getScrapShopTanks(currentFilter);
        } else {
            // No legendary tanks in shop
            shopTanks = [];
        }
        filteredTanks = shopTanks;
    } else {
        if (currentFilter === 'all') {
            // Get all tanks sorted by rarity order
            filteredTanks = getAllTanks().sort((a, b) => {
                const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
                if (rarityDiff !== 0) return rarityDiff;
                return a.name.localeCompare(b.name);
            });
        } else {
            filteredTanks = getTanksByRarity(currentFilter);
        }
    }

    // Calculate grid dimensions
    const rows = Math.ceil(filteredTanks.length / CONFIG.GRID_COLUMNS);
    const gridHeight = rows * (CONFIG.CARD_HEIGHT + CONFIG.CARD_GAP) - CONFIG.CARD_GAP;

    // Calculate viewport
    const viewportTop = CONFIG.HEADER_HEIGHT + CONFIG.FILTER_HEIGHT + CONFIG.GRID_TOP_PADDING;
    const viewportBottom = Renderer.getHeight() - CONFIG.DETAILS_HEIGHT - CONFIG.FOOTER_HEIGHT;
    const viewportHeight = viewportBottom - viewportTop;

    maxScrollY = Math.max(0, gridHeight - viewportHeight + CONFIG.GRID_TOP_PADDING);

    // Clamp scroll position
    scrollY = Math.max(0, Math.min(scrollY, maxScrollY));
}

/**
 * Calculate the left position for the centered grid.
 * Grid width = columns * cardWidth + (columns - 1) * gap
 * @returns {number} The x position where the grid should start
 */
function getGridLeft() {
    const gridWidth = CONFIG.GRID_COLUMNS * CONFIG.CARD_WIDTH +
                      (CONFIG.GRID_COLUMNS - 1) * CONFIG.CARD_GAP;
    return (Renderer.getWidth() - gridWidth) / 2;
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle click/tap on collection screen.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleClick(pos) {
    // Check back button (uses dynamic positioning)
    if (isInsideRect(pos, getBackButtonRect())) {
        Sound.playClickSound();
        if (isScrapShopMode) {
            // Go back to normal collection view
            isScrapShopMode = false;
            selectedTankId = null;
            scrollY = 0;
            updateFilteredList();
        } else {
            // Return to the state we came from (menu or round transition)
            Game.setState(returnToState);
        }
        return;
    }

    // Check scrap shop button (uses dynamic positioning)
    if (isInsideRect(pos, getScrapShopButtonRect())) {
        Sound.playClickSound();
        isScrapShopMode = !isScrapShopMode;
        selectedTankId = null;
        scrollY = 0;
        currentFilter = 'all';
        updateFilteredList();
        return;
    }

    // Check filter buttons
    const filterY = CONFIG.HEADER_HEIGHT + 7;
    const totalFilterWidth = FILTERS.length * (CONFIG.FILTER_BUTTON_WIDTH + CONFIG.FILTER_BUTTON_GAP) - CONFIG.FILTER_BUTTON_GAP;
    let filterX = (Renderer.getWidth() - totalFilterWidth) / 2;

    for (const filter of FILTERS) {
        if (pos.x >= filterX && pos.x <= filterX + CONFIG.FILTER_BUTTON_WIDTH &&
            pos.y >= filterY && pos.y <= filterY + CONFIG.FILTER_BUTTON_HEIGHT) {
            Sound.playClickSound();
            currentFilter = filter.key;
            scrollY = 0;
            selectedTankId = null;
            updateFilteredList();
            return;
        }
        filterX += CONFIG.FILTER_BUTTON_WIDTH + CONFIG.FILTER_BUTTON_GAP;
    }

    // Check equip button (if tank selected and owned, in normal mode)
    if (!isScrapShopMode && selectedTankId && ownsTank(selectedTankId) && getEquippedTankId() !== selectedTankId) {
        const equipBtn = getEquipButtonRect();
        if (isInsideRect(pos, equipBtn)) {
            Sound.playClickSound();
            setEquippedTank(selectedTankId);
            return;
        }
    }

    // Check purchase button (if tank selected and in scrap shop mode)
    if (isScrapShopMode && selectedTankId && !ownsTank(selectedTankId)) {
        const purchaseBtn = getPurchaseButtonRect();
        if (isInsideRect(pos, purchaseBtn)) {
            const tank = getTank(selectedTankId);
            const cost = SCRAP_SHOP_COSTS[tank.rarity];
            if (getScrap() >= cost) {
                Sound.playClickSound();
                const result = purchaseTankWithScrap(selectedTankId);
                if (result.success) {
                    // Refresh shop list (tank is now owned)
                    selectedTankId = null;
                    updateFilteredList();
                }
            }
            return;
        }
    }

    // Check tank grid click
    const gridTop = CONFIG.HEADER_HEIGHT + CONFIG.FILTER_HEIGHT + CONFIG.GRID_TOP_PADDING;
    const gridBottom = Renderer.getHeight() - CONFIG.DETAILS_HEIGHT - CONFIG.FOOTER_HEIGHT;

    if (pos.y >= gridTop && pos.y < gridBottom) {
        const tankId = getTankAtPosition(pos.x, pos.y);
        if (tankId) {
            Sound.playClickSound();

            // Mark tank as viewed if it's new (only in normal mode)
            if (!isScrapShopMode && newTanksSet.has(tankId)) {
                markTankViewed(tankId);
                newTanksSet.delete(tankId);
            }

            selectedTankId = tankId;
        }
    }
}

/**
 * Get the tank ID at the given position, or null.
 */
function getTankAtPosition(x, y) {
    const gridTop = CONFIG.HEADER_HEIGHT + CONFIG.FILTER_HEIGHT + CONFIG.GRID_TOP_PADDING;
    const gridLeft = getGridLeft();

    // Adjust for scroll
    const adjustedY = y + scrollY - gridTop;

    // Calculate grid position
    const col = Math.floor((x - gridLeft) / (CONFIG.CARD_WIDTH + CONFIG.CARD_GAP));
    const row = Math.floor(adjustedY / (CONFIG.CARD_HEIGHT + CONFIG.CARD_GAP));

    // Check bounds
    if (col < 0 || col >= CONFIG.GRID_COLUMNS || row < 0) return null;

    // Check if within card bounds (not in gap)
    const cardLeft = gridLeft + col * (CONFIG.CARD_WIDTH + CONFIG.CARD_GAP);
    const cardTop = row * (CONFIG.CARD_HEIGHT + CONFIG.CARD_GAP);

    if (x < cardLeft || x > cardLeft + CONFIG.CARD_WIDTH) return null;
    if (adjustedY < cardTop || adjustedY > cardTop + CONFIG.CARD_HEIGHT) return null;

    // Get tank index
    const index = row * CONFIG.GRID_COLUMNS + col;
    if (index >= 0 && index < filteredTanks.length) {
        return filteredTanks[index].id;
    }

    return null;
}

/**
 * Calculate the right edge of the centered grid.
 * @returns {number} The x position of the grid's right edge
 */
function getGridRight() {
    const gridWidth = CONFIG.GRID_COLUMNS * CONFIG.CARD_WIDTH +
                      (CONFIG.GRID_COLUMNS - 1) * CONFIG.CARD_GAP;
    return getGridLeft() + gridWidth;
}

/**
 * Get the equip button rectangle.
 */
function getEquipButtonRect() {
    const detailsTop = Renderer.getHeight() - CONFIG.DETAILS_HEIGHT - CONFIG.FOOTER_HEIGHT;
    return {
        x: getGridRight() - CONFIG.EQUIP_BUTTON.width,
        y: detailsTop + 50,
        width: CONFIG.EQUIP_BUTTON.width,
        height: CONFIG.EQUIP_BUTTON.height
    };
}


/**
 * Get the purchase button rectangle (scrap shop mode).
 */
function getPurchaseButtonRect() {
    const detailsTop = Renderer.getHeight() - CONFIG.DETAILS_HEIGHT - CONFIG.FOOTER_HEIGHT;
    return {
        x: getGridRight() - CONFIG.PURCHASE_BUTTON.width,
        y: detailsTop + 50,
        width: CONFIG.PURCHASE_BUTTON.width,
        height: CONFIG.PURCHASE_BUTTON.height
    };
}

/**
 * Get the back button rectangle (positioned relative to left edge).
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function getBackButtonRect() {
    return {
        x: CONFIG.BACK_BUTTON.x,  // Fixed margin from left
        y: CONFIG.BACK_BUTTON.y,
        width: CONFIG.BACK_BUTTON.width,
        height: CONFIG.BACK_BUTTON.height
    };
}

/**
 * Get the scrap shop button rectangle (positioned relative to right edge).
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function getScrapShopButtonRect() {
    const margin = 60; // Same margin as back button from edge
    return {
        x: Renderer.getWidth() - CONFIG.SCRAP_SHOP_BUTTON.width - margin,
        y: CONFIG.SCRAP_SHOP_BUTTON.y,
        width: CONFIG.SCRAP_SHOP_BUTTON.width,
        height: CONFIG.SCRAP_SHOP_BUTTON.height
    };
}

/**
 * Check if a point is inside a rectangle.
 */
function isInsideRect(pos, rect) {
    return pos.x >= rect.x && pos.x <= rect.x + rect.width &&
           pos.y >= rect.y && pos.y <= rect.y + rect.height;
}

/**
 * Handle keyboard input.
 */
function handleKeyDown(keyCode) {
    const KEY = {
        ESCAPE: 27,
        UP: 38,
        DOWN: 40,
        LEFT: 37,
        RIGHT: 39,
        ENTER: 13,
        SPACE: 32
    };

    switch (keyCode) {
        case KEY.ESCAPE:
            Sound.playClickSound();
            // Return to the state we came from (menu or round transition)
            Game.setState(returnToState);
            break;
        case KEY.UP:
            scrollY = Math.max(0, scrollY - CONFIG.SCROLL_SPEED);
            break;
        case KEY.DOWN:
            scrollY = Math.min(maxScrollY, scrollY + CONFIG.SCROLL_SPEED);
            break;
        case KEY.ENTER:
        case KEY.SPACE:
            // Equip selected tank
            if (selectedTankId && ownsTank(selectedTankId) && getEquippedTankId() !== selectedTankId) {
                Sound.playClickSound();
                setEquippedTank(selectedTankId);
            }
            break;
    }
}

/**
 * Handle mouse wheel.
 */
function handleWheel(deltaY) {
    const scrollAmount = deltaY * CONFIG.SCROLL_SENSITIVITY;
    scrollY = Math.max(0, Math.min(maxScrollY, scrollY + scrollAmount));
}

/**
 * Handle drag start for touch scrolling.
 */
function handleDragStart(y) {
    isDragging = true;
    dragStartY = y;
    dragStartScrollY = scrollY;
}

/**
 * Handle drag move for touch scrolling.
 */
function handleDragMove(y) {
    if (!isDragging) return;

    const delta = dragStartY - y;
    scrollY = Math.max(0, Math.min(maxScrollY, dragStartScrollY + delta));
}

/**
 * Handle drag end.
 */
function handleDragEnd() {
    isDragging = false;
}

// =============================================================================
// UPDATE
// =============================================================================

/**
 * Update collection screen state.
 * @param {number} deltaTime - Time since last update in seconds
 */
export function update(deltaTime) {
    animationTime += deltaTime * CONFIG.ANIMATION_SPEED * 1000;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Main render function for collection screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function render(ctx) {
    // Background
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, Renderer.getWidth(), Renderer.getHeight());

    // Render components
    renderHeader(ctx);
    renderFilters(ctx);
    renderTankGrid(ctx);
    renderDetailsPanel(ctx);
    renderBackButton(ctx);
    renderScrapShopButton(ctx);
    renderFooter(ctx);
}

/**
 * Render the header with title and progress.
 */
function renderHeader(ctx) {
    const progress = getCollectionProgress();
    const scrap = getScrap();

    ctx.save();

    // Title - different for scrap shop mode
    ctx.fillStyle = isScrapShopMode ? COLORS.NEON_ORANGE : COLORS.NEON_PINK;
    ctx.font = `bold 42px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = isScrapShopMode ? COLORS.NEON_ORANGE : COLORS.NEON_PINK;
    ctx.shadowBlur = 12;
    ctx.fillText(isScrapShopMode ? 'SCRAP SHOP' : 'TANK COLLECTION', Renderer.getWidth() / 2, 45);

    // Progress counter or scrap balance
    ctx.shadowBlur = 6;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold 22px ${UI.FONT_FAMILY}`;

    if (isScrapShopMode) {
        // Show scrap balance with icon
        ctx.fillStyle = COLORS.NEON_ORANGE;
        ctx.fillText(`\u2699 ${scrap} SCRAP`, Renderer.getWidth() / 2, 82);
    } else {
        ctx.fillText(`${progress.owned} / ${progress.total} UNLOCKED`, Renderer.getWidth() / 2, 82);
    }

    ctx.restore();
}

/**
 * Render filter buttons.
 */
function renderFilters(ctx) {
    const filterY = CONFIG.HEADER_HEIGHT + 7;
    const totalFilterWidth = FILTERS.length * (CONFIG.FILTER_BUTTON_WIDTH + CONFIG.FILTER_BUTTON_GAP) - CONFIG.FILTER_BUTTON_GAP;
    let filterX = (Renderer.getWidth() - totalFilterWidth) / 2;

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
        ctx.font = `bold 13px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(filter.label, filterX + CONFIG.FILTER_BUTTON_WIDTH / 2, filterY + CONFIG.FILTER_BUTTON_HEIGHT / 2);

        filterX += CONFIG.FILTER_BUTTON_WIDTH + CONFIG.FILTER_BUTTON_GAP;
    }

    ctx.restore();
}

/**
 * Render the scrollable tank grid.
 */
function renderTankGrid(ctx) {
    const gridTop = CONFIG.HEADER_HEIGHT + CONFIG.FILTER_HEIGHT + CONFIG.GRID_TOP_PADDING;
    const gridBottom = Renderer.getHeight() - CONFIG.DETAILS_HEIGHT - CONFIG.FOOTER_HEIGHT;
    const gridLeft = getGridLeft();

    ctx.save();

    // Clip to grid area
    ctx.beginPath();
    ctx.rect(0, gridTop, Renderer.getWidth(), gridBottom - gridTop);
    ctx.clip();

    // Render each tank card
    filteredTanks.forEach((tank, index) => {
        const col = index % CONFIG.GRID_COLUMNS;
        const row = Math.floor(index / CONFIG.GRID_COLUMNS);

        const cardX = gridLeft + col * (CONFIG.CARD_WIDTH + CONFIG.CARD_GAP);
        const cardY = gridTop + row * (CONFIG.CARD_HEIGHT + CONFIG.CARD_GAP) - scrollY;

        // Skip if completely outside viewport
        if (cardY + CONFIG.CARD_HEIGHT < gridTop || cardY > gridBottom) {
            return;
        }

        renderTankCard(ctx, tank, cardX, cardY);
    });

    ctx.restore();

    // Render scroll indicators if needed
    if (maxScrollY > 0) {
        renderScrollIndicators(ctx, gridTop, gridBottom);
    }
}

/**
 * Render a single tank card.
 */
function renderTankCard(ctx, tank, x, y) {
    const isOwned = ownsTank(tank.id);
    const isEquipped = getEquippedTankId() === tank.id;
    const isSelected = selectedTankId === tank.id;
    const isNew = newTanksSet.has(tank.id);
    const rarityColor = RARITY_COLORS[tank.rarity];
    const isShopItem = isScrapShopMode && !isOwned;

    ctx.save();

    // Card background - brighter in shop mode for unowned
    ctx.fillStyle = isOwned ? 'rgba(20, 20, 40, 0.9)' : (isShopItem ? 'rgba(30, 25, 20, 0.9)' : 'rgba(10, 10, 26, 0.9)');
    ctx.beginPath();
    ctx.roundRect(x, y, CONFIG.CARD_WIDTH, CONFIG.CARD_HEIGHT, 8);
    ctx.fill();

    // Card border
    if (isSelected) {
        ctx.strokeStyle = isScrapShopMode ? COLORS.NEON_ORANGE : COLORS.TEXT_LIGHT;
        ctx.lineWidth = 3;
        ctx.shadowColor = isScrapShopMode ? COLORS.NEON_ORANGE : COLORS.TEXT_LIGHT;
        ctx.shadowBlur = 10;
    } else if (isEquipped) {
        ctx.strokeStyle = COLORS.NEON_CYAN;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 8;
    } else if (isOwned) {
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = 6;
    } else if (isShopItem) {
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
    } else {
        ctx.strokeStyle = 'rgba(136, 136, 153, 0.4)';
        ctx.lineWidth = 1;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Tank visual area
    const visualY = y + 12;
    const visualHeight = 55;

    if (isOwned || isShopItem) {
        const spriteKey = getEquippedSkinAssetKey(tank);
        const sprite = spriteKey ? Assets.get(spriteKey) : null;

        if (isRealSprite(sprite)) {
            const previewWidth = 108;
            const previewHeight = 54;
            const previewX = x + (CONFIG.CARD_WIDTH - previewWidth) / 2;
            const previewY = visualY + 4;

            ctx.globalAlpha = isOwned ? 1 : 0.6;
            ctx.shadowColor = tank.glowColor || rarityColor;
            ctx.shadowBlur = isOwned ? 8 : 0;
            ctx.drawImage(sprite, previewX, previewY, previewWidth, previewHeight);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        } else {
            // Fallback placeholder card if sprite is missing.
            const tankColor = tank.glowColor || rarityColor;
            ctx.fillStyle = tankColor;
            ctx.globalAlpha = isOwned ? 0.6 : 0.4;
            ctx.fillRect(x + 40, visualY + 10, 100, 35);
            ctx.globalAlpha = 1;

            ctx.strokeStyle = tankColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = isOwned ? 1 : 0.6;
            ctx.strokeRect(x + 40, visualY + 10, 100, 35);
            ctx.globalAlpha = 1;
        }
    } else {
        // Silhouette (locked tank in collection view)
        ctx.fillStyle = 'rgba(50, 50, 70, 0.5)';
        ctx.fillRect(x + 40, visualY + 10, 100, 35);

        // Question mark
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `bold 28px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + CONFIG.CARD_WIDTH / 2, visualY + 27);
    }

    // Tank name
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nameY = y + visualHeight + 18;

    if (isOwned || isShopItem) {
        ctx.fillStyle = isShopItem ? rarityColor : COLORS.TEXT_LIGHT;
        ctx.font = `bold 13px ${UI.FONT_FAMILY}`;
        ctx.fillText(tank.name.toUpperCase(), x + CONFIG.CARD_WIDTH / 2, nameY);
    } else {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `bold 13px ${UI.FONT_FAMILY}`;
        ctx.fillText(tank.rarity.toUpperCase(), x + CONFIG.CARD_WIDTH / 2, nameY);
    }

    // Rarity indicator (stars) or cost in shop mode
    const rarityY = nameY + 18;

    if (isShopItem) {
        // Show cost instead of stars
        const cost = SCRAP_SHOP_COSTS[tank.rarity];
        const canAfford = getScrap() >= cost;
        ctx.fillStyle = canAfford ? COLORS.NEON_ORANGE : COLORS.TEXT_MUTED;
        ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
        ctx.fillText(`${cost} SCRAP`, x + CONFIG.CARD_WIDTH / 2, rarityY);
    } else {
        ctx.fillStyle = rarityColor;
        ctx.font = `12px ${UI.FONT_FAMILY}`;
        const rarityStars = {
            [RARITY.COMMON]: '\u2605',
            [RARITY.UNCOMMON]: '\u2605\u2605',
            [RARITY.RARE]: '\u2605\u2605\u2605',
            [RARITY.EPIC]: '\u2605\u2605\u2605\u2605',
            [RARITY.LEGENDARY]: '\u2605\u2605\u2605\u2605\u2605'
        };
        ctx.fillText(rarityStars[tank.rarity] || '', x + CONFIG.CARD_WIDTH / 2, rarityY);
    }

    // NEW! badge
    if (isNew && isOwned && !isScrapShopMode) {
        const badgeX = x + CONFIG.CARD_WIDTH - 35;
        const badgeY = y + 8;

        // Pulsing effect
        const pulse = 0.8 + Math.sin(animationTime * 5) * 0.2;

        ctx.fillStyle = COLORS.NEON_PINK;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 30, 16, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#fff';
        ctx.font = `bold 10px ${UI.FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.fillText('NEW!', badgeX + 15, badgeY + 8);
    }

    // Equipped checkmark (only in collection mode)
    if (isEquipped && !isScrapShopMode) {
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('\u2713', x + 8, y + 8);
    }

    ctx.restore();
}

/**
 * Render scroll indicators.
 */
function renderScrollIndicators(ctx, gridTop, gridBottom) {
    ctx.save();

    // Top indicator (if scrolled down)
    if (scrollY > 0) {
        const gradient = ctx.createLinearGradient(0, gridTop, 0, gridTop + 30);
        gradient.addColorStop(0, COLORS.BACKGROUND);
        gradient.addColorStop(1, 'rgba(10, 10, 26, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, gridTop, Renderer.getWidth(), 30);

        // Up arrow
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `20px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('\u25B2', Renderer.getWidth() / 2, gridTop + 15);
    }

    // Bottom indicator (if more content below)
    if (scrollY < maxScrollY) {
        const gradient = ctx.createLinearGradient(0, gridBottom - 30, 0, gridBottom);
        gradient.addColorStop(0, 'rgba(10, 10, 26, 0)');
        gradient.addColorStop(1, COLORS.BACKGROUND);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, gridBottom - 30, Renderer.getWidth(), 30);

        // Down arrow
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `20px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC', Renderer.getWidth() / 2, gridBottom - 10);
    }

    ctx.restore();
}

/**
 * Render the details panel for selected tank.
 */
function renderDetailsPanel(ctx) {
    const detailsTop = Renderer.getHeight() - CONFIG.DETAILS_HEIGHT - CONFIG.FOOTER_HEIGHT;

    ctx.save();

    // Panel background
    ctx.fillStyle = 'rgba(15, 15, 35, 0.95)';
    ctx.fillRect(0, detailsTop, Renderer.getWidth(), CONFIG.DETAILS_HEIGHT);

    // Top border - different color for scrap shop
    ctx.strokeStyle = isScrapShopMode ? COLORS.NEON_ORANGE : COLORS.NEON_PINK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, detailsTop);
    ctx.lineTo(Renderer.getWidth(), detailsTop);
    ctx.stroke();

    if (selectedTankId) {
        const tank = getTank(selectedTankId);
        const isOwned = ownsTank(selectedTankId);
        const isEquipped = getEquippedTankId() === selectedTankId;
        const rarityColor = RARITY_COLORS[tank.rarity];

        // Tank name - always show in shop mode
        ctx.fillStyle = isScrapShopMode ? rarityColor : (isOwned ? rarityColor : COLORS.TEXT_MUTED);
        ctx.font = `bold 26px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        if (isScrapShopMode || isOwned) {
            ctx.shadowColor = rarityColor;
            ctx.shadowBlur = 6;
        }
        const detailsLeft = getGridLeft();
        ctx.fillText(tank.name.toUpperCase(), detailsLeft, detailsTop + 18);
        ctx.shadowBlur = 0;

        // Rarity label with stars
        const rarityStars = {
            [RARITY.COMMON]: '\u2605',
            [RARITY.UNCOMMON]: '\u2605\u2605',
            [RARITY.RARE]: '\u2605\u2605\u2605',
            [RARITY.EPIC]: '\u2605\u2605\u2605\u2605',
            [RARITY.LEGENDARY]: '\u2605\u2605\u2605\u2605\u2605'
        };

        ctx.fillStyle = rarityColor;
        ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
        ctx.fillText(`${rarityStars[tank.rarity]} ${tank.rarity.toUpperCase()}`, detailsLeft, detailsTop + 50);

        // Description - show in shop mode too
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `italic 15px ${UI.FONT_FAMILY}`;
        const description = (isScrapShopMode || isOwned) ? `"${tank.description}"` : '"???"';
        ctx.fillText(description, detailsLeft, detailsTop + 78);

        // Special effects (if owned and has them)
        if (isOwned && tank.specialEffects && tank.specialEffects.length > 0) {
            ctx.fillStyle = COLORS.NEON_CYAN;
            ctx.font = `12px ${UI.FONT_FAMILY}`;
            ctx.fillText(`Special: ${tank.specialEffects.join(', ')}`, detailsLeft, detailsTop + 105);
        }

        if (isScrapShopMode) {
            // Scrap Shop Mode - show purchase button
            const purchaseBtn = getPurchaseButtonRect();
            const cost = SCRAP_SHOP_COSTS[tank.rarity];
            const scrap = getScrap();
            const canAfford = scrap >= cost;

            // Button background
            ctx.fillStyle = canAfford ? COLORS.NEON_ORANGE : 'rgba(100, 100, 100, 0.3)';
            ctx.globalAlpha = canAfford ? 0.2 : 0.5;
            ctx.beginPath();
            ctx.roundRect(purchaseBtn.x, purchaseBtn.y, purchaseBtn.width, purchaseBtn.height, 8);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Button border
            ctx.strokeStyle = canAfford ? COLORS.NEON_ORANGE : COLORS.TEXT_MUTED;
            ctx.lineWidth = 2;
            if (canAfford) {
                ctx.shadowColor = COLORS.NEON_ORANGE;
                ctx.shadowBlur = 8;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Button text with cost
            ctx.fillStyle = canAfford ? COLORS.NEON_ORANGE : COLORS.TEXT_MUTED;
            ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`BUY (${cost} SCRAP)`, purchaseBtn.x + purchaseBtn.width / 2, purchaseBtn.y + purchaseBtn.height / 2);

            // Show "Not enough scrap" below if can't afford
            if (!canAfford) {
                ctx.fillStyle = COLORS.TEXT_MUTED;
                ctx.font = `12px ${UI.FONT_FAMILY}`;
                ctx.fillText(`Need ${cost - scrap} more`, purchaseBtn.x + purchaseBtn.width / 2, purchaseBtn.y + purchaseBtn.height + 14);
            }
        } else {
            // Normal Collection Mode
            // Equip button (if owned and not equipped)
            if (isOwned && !isEquipped) {
                const equipBtn = getEquipButtonRect();

                // Button background
                ctx.fillStyle = COLORS.NEON_CYAN;
                ctx.globalAlpha = 0.2;
                ctx.beginPath();
                ctx.roundRect(equipBtn.x, equipBtn.y, equipBtn.width, equipBtn.height, 8);
                ctx.fill();
                ctx.globalAlpha = 1;

                // Button border
                ctx.strokeStyle = COLORS.NEON_CYAN;
                ctx.lineWidth = 2;
                ctx.shadowColor = COLORS.NEON_CYAN;
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Button text
                ctx.fillStyle = COLORS.NEON_CYAN;
                ctx.font = `bold 18px ${UI.FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('EQUIP', equipBtn.x + equipBtn.width / 2, equipBtn.y + equipBtn.height / 2);
            }

            // Equipped indicator
            if (isEquipped) {
                const equipBtn = getEquipButtonRect();

                ctx.fillStyle = COLORS.TEXT_MUTED;
                ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\u2713 EQUIPPED', equipBtn.x + equipBtn.width / 2, equipBtn.y + equipBtn.height / 2);
            }

            // Locked indicator
            if (!isOwned) {
                const equipBtn = getEquipButtonRect();

                ctx.fillStyle = COLORS.TEXT_MUTED;
                ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\uD83D\uDD12 LOCKED', equipBtn.x + equipBtn.width / 2, equipBtn.y + equipBtn.height / 2);
            }
        }
    } else {
        // No tank selected
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `18px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const message = isScrapShopMode ? 'Select a tank to purchase' : 'Select a tank to view details';
        ctx.fillText(message, Renderer.getWidth() / 2, detailsTop + CONFIG.DETAILS_HEIGHT / 2);
    }

    ctx.restore();
}

/**
 * Render footer with instructions.
 */
function renderFooter(ctx) {
    ctx.save();

    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `14px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const message = isScrapShopMode
        ? 'Click to select \u2022 Scroll to browse \u2022 Legendary tanks not purchasable'
        : 'Click to select \u2022 Scroll to browse \u2022 ESC to return';
    ctx.fillText(message, Renderer.getWidth() / 2, Renderer.getHeight() - CONFIG.FOOTER_HEIGHT / 2);

    ctx.restore();
}

/**
 * Render back button (positioned relative to left edge).
 */
function renderBackButton(ctx) {
    const btn = getBackButtonRect();

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


/**
 * Render the scrap shop toggle button (positioned relative to right edge).
 */
function renderScrapShopButton(ctx) {
    const btn = getScrapShopButtonRect();
    const scrap = getScrap();

    ctx.save();

    // Button background
    ctx.fillStyle = isScrapShopMode ? 'rgba(255, 140, 0, 0.2)' : 'rgba(10, 10, 26, 0.8)';
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = COLORS.NEON_ORANGE;
    ctx.lineWidth = isScrapShopMode ? 3 : 2;
    if (isScrapShopMode) {
        ctx.shadowColor = COLORS.NEON_ORANGE;
        ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button text
    ctx.fillStyle = COLORS.NEON_ORANGE;
    ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isScrapShopMode) {
        ctx.fillText('COLLECTION', btn.x + btn.width / 2, btn.y + btn.height / 2);
    } else {
        ctx.fillText(`SHOP (${scrap})`, btn.x + btn.width / 2, btn.y + btn.height / 2);
    }

    ctx.restore();
}

// =============================================================================
// STATE SETUP
// =============================================================================

/**
 * Setup collection screen state handlers.
 * Call this during game initialization.
 */
export function setup() {
    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.COLLECTION) {
            handleClick({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.COLLECTION) {
            handleClick({ x, y });
            handleDragStart(y);
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.COLLECTION) {
            handleDragMove(y);
        }
    });

    Input.onTouchEnd(() => {
        if (Game.getState() === GAME_STATES.COLLECTION) {
            handleDragEnd();
        }
    });

    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.COLLECTION) {
            handleKeyDown(keyCode);
        }
    });

    // Mouse wheel scrolling
    if (typeof window !== 'undefined') {
        window.addEventListener('wheel', (event) => {
            if (Game.getState() === GAME_STATES.COLLECTION) {
                handleWheel(event.deltaY);
            }
        }, { passive: true });
    }

    // Register state handlers
    Game.registerStateHandlers(GAME_STATES.COLLECTION, {
        onEnter: (fromState) => {
            console.log('Entered COLLECTION state from', fromState);
            // Track where we came from to return there on exit
            // If we came from round transition, go back there; otherwise go to menu
            returnToState = (fromState === GAME_STATES.ROUND_TRANSITION)
                ? GAME_STATES.ROUND_TRANSITION
                : GAME_STATES.MENU;
            init();
            // Play menu music (reuse)
            Music.playForState(GAME_STATES.MENU);
        },
        onExit: (toState) => {
            console.log('Exiting COLLECTION state');
        },
        update: update,
        render: render
    });
}
