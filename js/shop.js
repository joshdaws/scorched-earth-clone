/**
 * Scorched Earth: Synthwave Edition
 * Shop UI Component
 *
 * Displays the weapon shop interface where players can purchase weapons
 * between rounds. Shows all weapons organized by category with prices,
 * current ammo, and purchase buttons. Uses synthwave styling.
 */

import { CANVAS, COLORS, UI, GAME_STATES, DEBUG } from './constants.js';
import { WeaponRegistry, WEAPON_TYPES } from './weapons.js';
import * as Money from './money.js';
import * as Game from './game.js';
import * as Assets from './assets.js';
import { playPurchaseSound, playErrorSound, playClickSound } from './sound.js';

// =============================================================================
// SHOP STATE
// =============================================================================

/**
 * Whether the shop is currently visible.
 * @type {boolean}
 */
let isVisible = false;

/**
 * Animation time for pulsing effects.
 * @type {number}
 */
let animationTime = 0;

/**
 * Current hover/selected weapon index (for keyboard navigation).
 * @type {number}
 */
let selectedIndex = -1;

/**
 * Reference to the player's tank for updating inventory.
 * @type {import('./tank.js').Tank|null}
 */
let playerTankRef = null;

/**
 * Callback to execute when "Done" button is clicked.
 * @type {Function|null}
 */
let onDoneCallback = null;

/**
 * Purchase feedback animation state.
 * @type {{active: boolean, weaponId: string, startTime: number, success: boolean}|null}
 */
let purchaseFeedback = null;

/**
 * Currently pressed button/card for touch feedback.
 * @type {string|null}
 */
let pressedElementId = null;

/**
 * Currently hovered weapon card for visual feedback.
 * @type {string|null}
 */
let hoveredWeaponId = null;

/**
 * Currently active tab: 'weapons' or 'items'.
 * @type {'weapons'|'items'}
 */
let activeTab = 'weapons';

/**
 * Horizontal scroll offsets per category (for horizontal scrolling).
 * Keys are category types (e.g., 'standard', 'nuclear'), values are scroll X offset.
 * @type {Object<string, number>}
 */
let categoryScrollOffsets = {};

/**
 * Vertical scroll offset for the entire category list.
 * @type {number}
 */
let verticalScrollOffset = 0;

/**
 * Maximum vertical scroll (calculated each frame based on content height).
 * @type {number}
 */
let maxVerticalScroll = 0;

/**
 * Vertical scroll area bounds (set during render).
 * @type {{x: number, y: number, width: number, height: number}|null}
 */
let verticalScrollArea = null;

/**
 * Scroll drag state for horizontal and vertical scrolling.
 * @type {{active: boolean, direction: 'horizontal'|'vertical'|null, categoryType: string|null, startX: number, startY: number, startScrollX: number, startScrollY: number, lastX: number, lastY: number, velocity: number, potentialDrag: boolean}}
 */
let scrollDragState = {
    active: false,
    direction: null,  // 'horizontal' or 'vertical'
    categoryType: null,
    startX: 0,
    startY: 0,
    startScrollX: 0,
    startScrollY: 0,
    lastX: 0,
    lastY: 0,
    velocity: 0,
    potentialDrag: false
};

/**
 * Category row hit areas (for detecting scroll interactions).
 * @type {Array<{categoryType: string, x: number, y: number, width: number, height: number, maxScroll: number}>}
 */
let categoryRowAreas = [];

/**
 * Tab definitions for the shop.
 */
const SHOP_TABS = {
    WEAPONS: { id: 'weapons', label: 'WEAPONS', enabled: true },
    ITEMS: { id: 'items', label: 'ITEMS', enabled: false }  // Disabled for now - Coming Soon
};

// =============================================================================
// SHOP LAYOUT CONSTANTS
// =============================================================================

/**
 * Shop layout configuration.
 * Centered on screen with weapon cards in a grid layout.
 * Touch-optimized: larger cards and buttons with adequate spacing.
 */
const SHOP_LAYOUT = {
    // Main shop panel - fills most of the screen to fit all 5 weapon categories
    PANEL: {
        X: CANVAS.DESIGN_WIDTH / 2,
        Y: CANVAS.DESIGN_HEIGHT / 2,
        WIDTH: 920,
        HEIGHT: 780,
        PADDING: 15
    },
    // Title area - compact
    TITLE: {
        Y_OFFSET: -360,
        FONT_SIZE: 32
    },
    // Balance display - compact
    BALANCE: {
        Y_OFFSET: -315,
        HEIGHT: 30
    },
    // Tab navigation bar - below balance
    TABS: {
        Y_OFFSET: -270,        // Position below balance display
        HEIGHT: 48,            // Touch-friendly: exceeds 44px minimum
        TAB_WIDTH: 140,        // Width per tab
        TAB_GAP: 16,           // Gap between tabs
        UNDERLINE_HEIGHT: 3    // Active tab underline thickness
    },
    // Weapon categories - proper containment with adequate spacing
    CATEGORY: {
        Y_START: -210,         // Adjusted to be below tabs (tab Y_OFFSET -270 + HEIGHT 48 + margin 12)
        HEADER_HEIGHT: 28,     // Height reserved for category header (name + line)
        SECTION_MARGIN: 24,    // Minimum margin between category sections (>20px per spec)
        LABEL_PADDING: 8       // Padding below category label before cards
    },
    // Weapon cards grid - compact cards with touch-friendly sizing
    CARD: {
        WIDTH: 110,   // Compact width (100-120px per spec)
        HEIGHT: 80,   // Reduced but still touch-friendly (>44px)
        GAP: 10,      // Balanced spacing for compact layout
        COLUMNS: 5    // 5 columns fits well in 920px panel
    },
    // Done button - touch-optimized
    DONE_BUTTON: {
        Y_OFFSET: 360,
        WIDTH: 180,           // Touch-friendly width
        HEIGHT: 56            // Touch-friendly: exceeds 44px minimum
    }
};

/**
 * Weapon categories for display.
 */
const WEAPON_CATEGORIES = [
    { type: WEAPON_TYPES.STANDARD, name: 'STANDARD', color: COLORS.NEON_CYAN },
    { type: WEAPON_TYPES.SPLITTING, name: 'SPLITTING', color: COLORS.NEON_PURPLE },
    { type: WEAPON_TYPES.ROLLING, name: 'ROLLING', color: COLORS.NEON_YELLOW },
    { type: WEAPON_TYPES.DIGGING, name: 'DIGGING', color: COLORS.NEON_YELLOW },
    { type: WEAPON_TYPES.NUCLEAR, name: 'NUCLEAR', color: COLORS.NEON_ORANGE }
];

// =============================================================================
// BUTTON DEFINITIONS
// =============================================================================

/**
 * Done button configuration.
 */
const doneButton = {
    x: CANVAS.DESIGN_WIDTH / 2,
    y: CANVAS.DESIGN_HEIGHT / 2 + SHOP_LAYOUT.DONE_BUTTON.Y_OFFSET,
    width: SHOP_LAYOUT.DONE_BUTTON.WIDTH,
    height: SHOP_LAYOUT.DONE_BUTTON.HEIGHT,
    text: 'DONE',
    color: COLORS.NEON_CYAN
};

/**
 * Weapon card hit areas (populated during render).
 * @type {Array<{x: number, y: number, width: number, height: number, weaponId: string}>}
 */
let weaponCardAreas = [];

/**
 * Tab button hit areas (populated during render).
 * @type {Array<{x: number, y: number, width: number, height: number, tabId: string}>}
 */
let tabButtonAreas = [];

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Show the shop interface.
 * @param {import('./tank.js').Tank} playerTank - Reference to the player's tank
 */
export function show(playerTank) {
    isVisible = true;
    animationTime = 0;
    selectedIndex = -1;
    playerTankRef = playerTank;
    purchaseFeedback = null;
    weaponCardAreas = [];
    tabButtonAreas = [];
    categoryRowAreas = [];
    categoryScrollOffsets = {};
    verticalScrollOffset = 0;
    maxVerticalScroll = 0;
    verticalScrollArea = null;
    scrollDragState = { active: false, direction: null, categoryType: null, startX: 0, startY: 0, startScrollX: 0, startScrollY: 0, lastX: 0, lastY: 0, velocity: 0, potentialDrag: false };
    activeTab = 'weapons';  // Always start on WEAPONS tab

    console.log('[Shop] Opened');
}

/**
 * Hide the shop interface.
 */
export function hide() {
    isVisible = false;
    playerTankRef = null;
    weaponCardAreas = [];
    tabButtonAreas = [];
    categoryRowAreas = [];
    categoryScrollOffsets = {};
    verticalScrollOffset = 0;
    maxVerticalScroll = 0;
    verticalScrollArea = null;
    scrollDragState = { active: false, direction: null, categoryType: null, startX: 0, startY: 0, startScrollX: 0, startScrollY: 0, lastX: 0, lastY: 0, velocity: 0, potentialDrag: false };

    console.log('[Shop] Closed');
}

/**
 * Check if the shop is currently visible.
 * @returns {boolean} True if shop is showing
 */
export function isShowing() {
    return isVisible;
}

/**
 * Register callback for "Done" button.
 * @param {Function} callback - Function to call when button is clicked
 */
export function onDone(callback) {
    onDoneCallback = callback;
}

// =============================================================================
// PURCHASE LOGIC
// =============================================================================

/**
 * Attempt to purchase a weapon.
 * @param {string} weaponId - ID of the weapon to purchase
 * @returns {boolean} True if purchase was successful
 */
export function purchaseWeapon(weaponId) {
    if (!playerTankRef) {
        if (DEBUG.ENABLED) {
            console.log('[Shop] No player tank reference');
        }
        return false;
    }

    const weapon = WeaponRegistry.getWeapon(weaponId);
    if (!weapon) {
        if (DEBUG.ENABLED) {
            console.log(`[Shop] Unknown weapon: ${weaponId}`);
        }
        return false;
    }

    // Check if player can afford it
    if (!Money.canAfford(weapon.cost)) {
        if (DEBUG.ENABLED) {
            console.log(`[Shop] Cannot afford ${weapon.name} ($${weapon.cost})`);
        }
        // Play error sound for insufficient funds
        playErrorSound();
        purchaseFeedback = {
            active: true,
            weaponId: weaponId,
            startTime: Date.now(),
            success: false
        };
        return false;
    }

    // Deduct money
    Money.spendMoney(weapon.cost, `Purchased ${weapon.name}`);

    // Add ammo to player's inventory
    playerTankRef.addAmmo(weaponId, weapon.ammo);

    // Play purchase sound effect
    playPurchaseSound();

    if (DEBUG.ENABLED) {
        const newBalance = Money.getMoney();
        const newAmmo = playerTankRef.getAmmo(weaponId);
        console.log(`[Shop] Purchased ${weapon.name} for $${weapon.cost} (+${weapon.ammo} ammo)`);
        console.log(`[Shop] New balance: $${newBalance.toLocaleString()}, ${weapon.name} ammo: ${newAmmo}`);
    }

    // Show success feedback
    purchaseFeedback = {
        active: true,
        weaponId: weaponId,
        startTime: Date.now(),
        success: true
    };

    return true;
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Check if a point is inside a button.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} button - Button definition
 * @returns {boolean} True if point is inside button
 */
function isInsideButton(x, y, button) {
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    return (
        x >= button.x - halfWidth &&
        x <= button.x + halfWidth &&
        y >= button.y - halfHeight &&
        y <= button.y + halfHeight
    );
}

/**
 * Check if a point is inside a weapon card.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {{weaponId: string, canAfford: boolean}|null} Weapon info or null
 */
function getWeaponAtPoint(x, y) {
    for (const area of weaponCardAreas) {
        if (x >= area.x &&
            x <= area.x + area.width &&
            y >= area.y &&
            y <= area.y + area.height) {
            const weapon = WeaponRegistry.getWeapon(area.weaponId);
            return {
                weaponId: area.weaponId,
                canAfford: weapon ? Money.canAfford(weapon.cost) : false
            };
        }
    }
    return null;
}

/**
 * Check if a point is inside a category row area.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {{categoryType: string, maxScroll: number}|null} Category info or null
 */
function getCategoryRowAtPoint(x, y) {
    for (const area of categoryRowAreas) {
        if (x >= area.x &&
            x <= area.x + area.width &&
            y >= area.y &&
            y <= area.y + area.height) {
            return {
                categoryType: area.categoryType,
                maxScroll: area.maxScroll
            };
        }
    }
    return null;
}

/**
 * Check if a point is inside the vertical scroll area.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if point is in vertical scroll area
 */
function isInVerticalScrollArea(x, y) {
    if (!verticalScrollArea) return false;
    return x >= verticalScrollArea.x &&
           x <= verticalScrollArea.x + verticalScrollArea.width &&
           y >= verticalScrollArea.y &&
           y <= verticalScrollArea.y + verticalScrollArea.height;
}

/**
 * Handle pointer down on the shop screen.
 * Sets pressed state for touch feedback.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if an element was pressed
 */
export function handlePointerDown(x, y) {
    if (!isVisible) return false;

    // Check done button
    if (isInsideButton(x, y, doneButton)) {
        pressedElementId = 'done';
        return true;
    }

    // Check tab buttons
    const tabInfo = getTabAtPoint(x, y);
    if (tabInfo) {
        pressedElementId = `tab_${tabInfo.tabId}`;
        return true;
    }

    // Check if touching in the vertical scroll area (for potential vertical/horizontal scrolling)
    if (isInVerticalScrollArea(x, y)) {
        // Check if touching a specific category row (for potential horizontal scroll)
        const categoryRow = getCategoryRowAtPoint(x, y);

        // Start potential scroll drag
        scrollDragState = {
            active: false,  // Not active until we detect actual dragging
            direction: null,  // Will be determined by first movement direction
            categoryType: categoryRow && categoryRow.maxScroll > 0 ? categoryRow.categoryType : null,
            startX: x,
            startY: y,
            startScrollX: categoryRow ? (categoryScrollOffsets[categoryRow.categoryType] || 0) : 0,
            startScrollY: verticalScrollOffset,
            lastX: x,
            lastY: y,
            velocity: 0,
            potentialDrag: true
        };
    }

    // Check weapon cards
    const weaponInfo = getWeaponAtPoint(x, y);
    if (weaponInfo) {
        const weapon = WeaponRegistry.getWeapon(weaponInfo.weaponId);
        if (weapon && weapon.cost > 0) {  // Can't purchase basic shot
            pressedElementId = `weapon_${weaponInfo.weaponId}`;
            return true;
        }
    }

    return false;
}

/**
 * Handle pointer up on the shop screen.
 * Triggers action if released on the same element that was pressed.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if an action was triggered
 */
export function handlePointerUp(x, y) {
    // End scroll drag if active
    const wasScrollDragging = scrollDragState.active;
    // Reset scroll drag state
    scrollDragState = {
        active: false,
        direction: null,
        categoryType: null,
        startX: 0,
        startY: 0,
        startScrollX: 0,
        startScrollY: 0,
        lastX: 0,
        lastY: 0,
        velocity: 0,
        potentialDrag: false
    };

    if (!isVisible) {
        pressedElementId = null;
        return false;
    }

    const wasPressed = pressedElementId;
    pressedElementId = null;

    // If we were scroll dragging, don't trigger any actions
    if (wasScrollDragging) return false;

    if (!wasPressed) return false;

    // Check done button release
    if (wasPressed === 'done' && isInsideButton(x, y, doneButton)) {
        playClickSound();
        console.log('[Shop] Done clicked');
        if (onDoneCallback) {
            onDoneCallback();
        }
        hide();
        return true;
    }

    // Check tab button release
    if (wasPressed.startsWith('tab_')) {
        const tabId = wasPressed.replace('tab_', '');
        const tabInfo = getTabAtPoint(x, y);

        if (tabInfo && tabInfo.tabId === tabId) {
            // Switch to the clicked tab
            playClickSound();
            activeTab = tabId;
            console.log(`[Shop] Switched to ${tabId} tab`);
            return true;
        }
    }

    // Check weapon card release
    if (wasPressed.startsWith('weapon_')) {
        const weaponId = wasPressed.replace('weapon_', '');
        const weaponInfo = getWeaponAtPoint(x, y);

        if (weaponInfo && weaponInfo.weaponId === weaponId) {
            const weapon = WeaponRegistry.getWeapon(weaponId);
            if (weapon && weapon.cost > 0) {  // Can't purchase basic shot
                purchaseWeapon(weaponId);
                return true;
            }
        }
    }

    return false;
}

/**
 * Handle pointer move for hover effects and scroll dragging.
 * Updates the hovered weapon ID for visual feedback.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 */
export function handlePointerMove(x, y) {
    if (!isVisible) {
        hoveredWeaponId = null;
        return;
    }

    // Handle scroll dragging (potential or active)
    if (scrollDragState.potentialDrag || scrollDragState.active) {
        const dragDistanceX = Math.abs(scrollDragState.startX - x);
        const dragDistanceY = Math.abs(scrollDragState.startY - y);

        // Determine scroll direction if not yet active
        if (!scrollDragState.active && (dragDistanceX > 10 || dragDistanceY > 10)) {
            // Determine direction based on which axis moved more
            // Prefer horizontal if there's a scrollable category row under the pointer
            if (scrollDragState.categoryType && dragDistanceX >= dragDistanceY) {
                scrollDragState.direction = 'horizontal';
            } else if (maxVerticalScroll > 0) {
                scrollDragState.direction = 'vertical';
            } else if (scrollDragState.categoryType) {
                scrollDragState.direction = 'horizontal';
            } else {
                // No scrolling possible, cancel potential drag
                scrollDragState.potentialDrag = false;
                return;
            }

            scrollDragState.active = true;
            // Cancel any pressed element when we start actual dragging
            pressedElementId = null;
        }

        if (scrollDragState.active) {
            scrollDragState.lastX = x;
            scrollDragState.lastY = y;

            if (scrollDragState.direction === 'horizontal') {
                // Update horizontal scroll offset (clamped to valid range)
                const categoryRow = categoryRowAreas.find(r => r.categoryType === scrollDragState.categoryType);
                if (categoryRow) {
                    const newScrollX = scrollDragState.startScrollX + (scrollDragState.startX - x);
                    categoryScrollOffsets[scrollDragState.categoryType] = Math.max(0, Math.min(categoryRow.maxScroll, newScrollX));
                }
            } else if (scrollDragState.direction === 'vertical') {
                // Update vertical scroll offset (clamped to valid range)
                const newScrollY = scrollDragState.startScrollY + (scrollDragState.startY - y);
                verticalScrollOffset = Math.max(0, Math.min(maxVerticalScroll, newScrollY));
            }
            return;
        }
    }

    const weaponInfo = getWeaponAtPoint(x, y);
    if (weaponInfo) {
        hoveredWeaponId = weaponInfo.weaponId;
    } else {
        hoveredWeaponId = null;
    }
}

/**
 * Handle mouse wheel scroll for category rows and vertical scrolling.
 * Scrolls vertically by default; scrolls horizontal category row when holding Shift.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @param {number} deltaY - Wheel delta (positive = scroll down)
 * @param {boolean} shiftKey - Whether shift key is held
 * @returns {boolean} True if scroll was handled
 */
export function handleWheel(x, y, deltaY, shiftKey = false) {
    if (!isVisible) return false;

    // Check if pointer is in the scroll area
    if (!isInVerticalScrollArea(x, y)) return false;

    // Check if pointer is over a category row that has horizontal overflow
    const categoryRow = getCategoryRowAtPoint(x, y);
    const hasHorizontalScroll = categoryRow && categoryRow.maxScroll > 0;

    // If holding shift and over a scrollable row, scroll horizontally
    if (shiftKey && hasHorizontalScroll) {
        const scrollAmount = deltaY * 0.5;  // Scale wheel delta for smoother scrolling
        const currentScroll = categoryScrollOffsets[categoryRow.categoryType] || 0;
        const newScroll = Math.max(0, Math.min(categoryRow.maxScroll, currentScroll + scrollAmount));
        categoryScrollOffsets[categoryRow.categoryType] = newScroll;
        return true;
    }

    // Default: scroll vertically (if there's content to scroll)
    if (maxVerticalScroll > 0) {
        const scrollAmount = deltaY * 0.5;  // Scale wheel delta for smoother scrolling
        const newScroll = Math.max(0, Math.min(maxVerticalScroll, verticalScrollOffset + scrollAmount));
        verticalScrollOffset = newScroll;
        return true;
    }

    // Fallback: if no vertical scroll but there's horizontal scroll, use that
    if (hasHorizontalScroll) {
        const scrollAmount = deltaY * 0.5;
        const currentScroll = categoryScrollOffsets[categoryRow.categoryType] || 0;
        const newScroll = Math.max(0, Math.min(categoryRow.maxScroll, currentScroll + scrollAmount));
        categoryScrollOffsets[categoryRow.categoryType] = newScroll;
        return true;
    }

    return false;
}

/**
 * Handle click/tap on the shop screen (legacy - immediate action).
 * Prefer using handlePointerDown/handlePointerUp for touch feedback.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if a button was clicked
 */
export function handleClick(x, y) {
    if (!isVisible) return false;

    // Check done button
    if (isInsideButton(x, y, doneButton)) {
        playClickSound();
        console.log('[Shop] Done clicked');
        if (onDoneCallback) {
            onDoneCallback();
        }
        hide();
        return true;
    }

    // Check tab buttons
    const tabInfo = getTabAtPoint(x, y);
    if (tabInfo) {
        playClickSound();
        activeTab = tabInfo.tabId;
        console.log(`[Shop] Switched to ${tabInfo.tabId} tab`);
        return true;
    }

    // Check weapon cards
    const weaponInfo = getWeaponAtPoint(x, y);
    if (weaponInfo) {
        const weapon = WeaponRegistry.getWeapon(weaponInfo.weaponId);
        if (weapon && weapon.cost > 0) {  // Can't purchase basic shot
            purchaseWeapon(weaponInfo.weaponId);
            return true;
        }
    }

    return false;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Draw a neon-styled button with touch feedback.
 * Shows pressed state when button is being touched/clicked.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button definition
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderButton(ctx, button, pulseIntensity) {
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    const btnX = button.x - halfWidth;
    const btnY = button.y - halfHeight;
    const isPressed = pressedElementId === 'done';

    ctx.save();

    // Pressed offset for tactile feedback
    const pressOffset = isPressed ? 2 : 0;

    // Button background with rounded corners - brighter when pressed
    ctx.fillStyle = isPressed ? 'rgba(40, 40, 70, 0.95)' : 'rgba(26, 26, 46, 0.9)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY + pressOffset, button.width, button.height, 10);
    ctx.fill();

    // Neon glow effect (pulsing) - stronger when pressed
    ctx.shadowColor = button.color;
    ctx.shadowBlur = isPressed ? 20 : (12 + pulseIntensity * 8);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Button border - thicker when pressed
    ctx.strokeStyle = button.color;
    ctx.lineWidth = isPressed ? 3 : 2;
    ctx.stroke();

    // Inner highlight when pressed
    if (isPressed) {
        ctx.fillStyle = `${button.color}25`;  // 15% opacity highlight
        ctx.fill();
    }

    // Reset shadow for text
    ctx.shadowBlur = 0;

    // Button text with glow
    ctx.shadowColor = button.color;
    ctx.shadowBlur = 6 + pulseIntensity * 4;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x, button.y + pressOffset);

    ctx.restore();
}

/**
 * Draw the tab navigation bar with WEAPONS and ITEMS tabs.
 * Active tab has glowing underline (cyan), inactive tabs are subtle.
 * ITEMS tab is disabled and shows "Coming Soon" state.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} centerX - Center X position for the tab bar
 * @param {number} y - Y position for the tab bar
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderTabBar(ctx, centerX, y, pulseIntensity) {
    const tabLayout = SHOP_LAYOUT.TABS;
    const tabs = [SHOP_TABS.WEAPONS, SHOP_TABS.ITEMS];
    const totalWidth = tabs.length * tabLayout.TAB_WIDTH + (tabs.length - 1) * tabLayout.TAB_GAP;
    const startX = centerX - totalWidth / 2;

    // Clear tab hit areas for this frame (will be populated as we render)
    tabButtonAreas = [];

    ctx.save();

    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const tabX = startX + i * (tabLayout.TAB_WIDTH + tabLayout.TAB_GAP);
        const tabY = y - tabLayout.HEIGHT / 2;
        const isActive = activeTab === tab.id;
        const isPressed = pressedElementId === `tab_${tab.id}`;
        const isDisabled = !tab.enabled;

        // Tab background (subtle, darkens on press)
        ctx.fillStyle = isPressed ? 'rgba(40, 40, 70, 0.6)' : 'rgba(26, 26, 46, 0.4)';
        ctx.beginPath();
        ctx.roundRect(tabX, tabY, tabLayout.TAB_WIDTH, tabLayout.HEIGHT, 6);
        ctx.fill();

        // Tab label
        ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelX = tabX + tabLayout.TAB_WIDTH / 2;
        const labelY = y;

        if (isDisabled) {
            // Disabled state: grayed out text, no glow
            ctx.fillStyle = COLORS.TEXT_MUTED;
            ctx.fillText(tab.label, labelX, labelY - 6);

            // "Coming Soon" subtitle
            ctx.font = `${UI.FONT_SIZE_SMALL - 2}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = 'rgba(100, 100, 120, 0.8)';
            ctx.fillText('COMING SOON', labelX, labelY + 10);
        } else if (isActive) {
            // Active state: bright text with cyan glow and underline
            ctx.shadowColor = COLORS.NEON_CYAN;
            ctx.shadowBlur = 8 + pulseIntensity * 6;
            ctx.fillStyle = COLORS.NEON_CYAN;
            ctx.fillText(tab.label, labelX, labelY);

            // Glowing underline
            ctx.shadowBlur = 10 + pulseIntensity * 5;
            ctx.strokeStyle = COLORS.NEON_CYAN;
            ctx.lineWidth = tabLayout.UNDERLINE_HEIGHT;
            ctx.lineCap = 'round';
            ctx.beginPath();
            const underlineY = tabY + tabLayout.HEIGHT - 4;
            const underlinePadding = 20;
            ctx.moveTo(tabX + underlinePadding, underlineY);
            ctx.lineTo(tabX + tabLayout.TAB_WIDTH - underlinePadding, underlineY);
            ctx.stroke();

            ctx.shadowBlur = 0;
        } else {
            // Inactive state: subtle text, no underline
            ctx.fillStyle = COLORS.TEXT_MUTED;
            ctx.fillText(tab.label, labelX, labelY);
        }

        // Register hit area (only for enabled tabs)
        if (tab.enabled) {
            tabButtonAreas.push({
                x: tabX,
                y: tabY,
                width: tabLayout.TAB_WIDTH,
                height: tabLayout.HEIGHT,
                tabId: tab.id
            });
        }
    }

    ctx.restore();
}

/**
 * Check if a point is inside a tab button.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {{tabId: string}|null} Tab info or null
 */
function getTabAtPoint(x, y) {
    for (const area of tabButtonAreas) {
        if (x >= area.x &&
            x <= area.x + area.width &&
            y >= area.y &&
            y <= area.y + area.height) {
            return { tabId: area.tabId };
        }
    }
    return null;
}

/**
 * Draw a compact weapon card with visual states for availability.
 * Cards are 110x80px to fit more weapons per row while staying touch-friendly.
 *
 * Visual States:
 * - Available: Normal appearance with subtle cyan glow
 * - Owned (x > 0): Subtle green glow with checkmark badge
 * - Can't Afford: Grayed out with NO FUNDS indicator
 * - Hover/Selected: Bright glow border (cyan/pink neon)
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} weapon - Weapon definition
 * @param {number} x - Card X position
 * @param {number} y - Card Y position
 * @param {number} currentAmmo - Player's current ammo for this weapon
 * @param {boolean} canAfford - Whether player can afford this weapon
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 * @param {boolean} showFeedback - Whether to show purchase feedback
 * @param {boolean} feedbackSuccess - Whether the feedback is for success or failure
 */
function renderWeaponCard(ctx, weapon, x, y, currentAmmo, canAfford, pulseIntensity, showFeedback = false, feedbackSuccess = false) {
    const cardWidth = SHOP_LAYOUT.CARD.WIDTH;
    const cardHeight = SHOP_LAYOUT.CARD.HEIGHT;
    const isPressed = pressedElementId === `weapon_${weapon.id}`;
    const isHovered = hoveredWeaponId === weapon.id;

    // Determine card color based on weapon type
    let borderColor = COLORS.NEON_CYAN;
    const category = WEAPON_CATEGORIES.find(c => c.type === weapon.type);
    if (category) {
        borderColor = category.color;
    }

    // Determine card state
    const isUnaffordable = !canAfford && weapon.cost > 0;
    const isOwned = currentAmmo > 0 || currentAmmo === Infinity;
    const isSelected = isPressed || isHovered;

    ctx.save();

    // Pressed offset for tactile feedback
    const pressOffset = isPressed ? 1 : 0;

    // === CARD BACKGROUND ===
    // State-based background colors
    let bgColor;
    if (isPressed) {
        bgColor = 'rgba(40, 40, 70, 0.95)';  // Brighter when pressed
    } else if (isHovered && !isUnaffordable) {
        bgColor = 'rgba(35, 35, 60, 0.95)';  // Slightly lighter on hover
    } else if (isUnaffordable) {
        bgColor = 'rgba(15, 15, 30, 0.85)';  // Darker for unaffordable
    } else {
        bgColor = 'rgba(26, 26, 46, 0.9)';   // Normal
    }
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y + pressOffset, cardWidth, cardHeight, 4);
    ctx.fill();

    // Feedback flash
    if (showFeedback) {
        const flashColor = feedbackSuccess ? 'rgba(0, 255, 100, 0.3)' : 'rgba(255, 50, 50, 0.3)';
        ctx.fillStyle = flashColor;
        ctx.fill();
    }

    // Pressed/hover highlight overlay
    if (isSelected && !isUnaffordable) {
        ctx.fillStyle = `${borderColor}20`;  // 12% opacity highlight
        ctx.fill();
    }

    // === BORDER WITH STATE-BASED GLOW ===
    let glowBlur = 3;  // Default subtle glow
    let strokeColor = borderColor;
    let lineWidth = 1;

    if (isUnaffordable) {
        // Can't afford: dim gray border, no glow
        strokeColor = COLORS.TEXT_MUTED;
        glowBlur = 0;
    } else if (isSelected) {
        // Hover/selected: bright glow
        glowBlur = 12 + pulseIntensity * 6;
        lineWidth = 2;
    } else if (isOwned) {
        // Owned: subtle green glow
        strokeColor = '#00ff88';
        glowBlur = 5 + pulseIntensity * 3;
    } else if (showFeedback && feedbackSuccess) {
        // Success feedback: strong glow
        glowBlur = 10;
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    if (glowBlur > 0) {
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = glowBlur;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Apply press offset to all positions
    const textY = y + pressOffset;
    const centerX = x + cardWidth / 2;

    // === OWNED CHECKMARK BADGE (top-right corner) ===
    if (isOwned && !isUnaffordable) {
        const badgeSize = 14;
        const badgeX = x + cardWidth - badgeSize - 3;
        const badgeY = textY + 3;

        // Badge background circle
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Checkmark
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const checkX = badgeX + badgeSize / 2;
        const checkY = badgeY + badgeSize / 2;
        ctx.moveTo(checkX - 3, checkY);
        ctx.lineTo(checkX - 1, checkY + 2);
        ctx.lineTo(checkX + 3, checkY - 2);
        ctx.stroke();
    }

    // === WEAPON ICON ===
    // Icon size and position (centered at top of card)
    const iconSize = 32; // Target icon display size
    const iconX = centerX;
    const iconY = textY + 4 + iconSize / 2; // 4px padding from top

    // Try to load weapon icon from assets
    const iconAssetKey = `weaponIcons.${weapon.id}`;
    const iconImage = Assets.get(iconAssetKey);
    let usedImage = false;

    if (iconImage && iconImage.complete && iconImage.naturalWidth > 0) {
        // Draw loaded icon image
        const imgX = iconX - iconSize / 2;
        const imgY = textY + 4;

        // Dim if can't afford
        if (isUnaffordable) {
            ctx.globalAlpha = 0.4;
            ctx.filter = 'grayscale(80%)';
        }

        ctx.drawImage(iconImage, imgX, imgY, iconSize, iconSize);

        // Reset filters
        ctx.globalAlpha = 1.0;
        ctx.filter = 'none';
        usedImage = true;
    }

    // Fallback: draw a simple colored circle if icon not available
    if (!usedImage) {
        ctx.fillStyle = isUnaffordable ? COLORS.TEXT_MUTED : borderColor;
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    // === TEXT CONTENT (below icon) ===
    // Compact layout: stacked vertically, centered
    // Row 1: Weapon name (centered, truncated if needed)
    ctx.fillStyle = isUnaffordable ? COLORS.TEXT_MUTED : COLORS.TEXT_LIGHT;
    ctx.font = `bold 10px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Truncate long names to fit card width
    let displayName = weapon.name;
    const maxNameWidth = cardWidth - 12;
    while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== weapon.name) {
        displayName = displayName.slice(0, -1) + '…';
    }
    ctx.fillText(displayName, centerX, textY + 40);

    // Row 2: Price OR "NO FUNDS" indicator
    ctx.font = `bold 11px ${UI.FONT_FAMILY}`;
    if (isUnaffordable) {
        // Show "NO FUNDS" in red for unaffordable weapons
        ctx.fillStyle = COLORS.NEON_PINK;
        ctx.fillText('NO FUNDS', centerX, textY + 52);
    } else {
        ctx.fillStyle = weapon.cost === 0 ? '#00ff88' : COLORS.NEON_YELLOW;
        const costText = weapon.cost === 0 ? 'FREE' : `$${weapon.cost.toLocaleString()}`;
        ctx.fillText(costText, centerX, textY + 52);
    }

    // Row 3: Owned count (centered)
    ctx.font = `10px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = isOwned ? '#00ff88' : COLORS.TEXT_MUTED;
    const ownedAmmo = currentAmmo === Infinity ? '∞' : currentAmmo;
    ctx.fillText(`x${ownedAmmo}`, centerX, textY + 64);

    ctx.restore();

    // Register hit area
    weaponCardAreas.push({
        x: x,
        y: y,
        width: cardWidth,
        height: cardHeight,
        weaponId: weapon.id
    });
}

/**
 * Render the shop interface.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    if (!isVisible) return;

    // Clear hit areas for this frame
    weaponCardAreas = [];

    // Update animation time
    animationTime += 16; // Approximate 60fps

    // Calculate pulse intensity (0-1, oscillating)
    const pulseIntensity = (Math.sin(animationTime * 0.003) + 1) / 2;

    const panel = SHOP_LAYOUT.PANEL;
    const panelLeft = panel.X - panel.WIDTH / 2;
    const panelTop = panel.Y - panel.HEIGHT / 2;

    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Subtle scanlines effect
    ctx.globalAlpha = 0.02;
    for (let y = 0; y < CANVAS.DESIGN_HEIGHT; y += 4) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, y, CANVAS.DESIGN_WIDTH, 2);
    }
    ctx.globalAlpha = 1;

    // Main panel background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.beginPath();
    ctx.roundRect(panelLeft, panelTop, panel.WIDTH, panel.HEIGHT, 12);
    ctx.fill();

    // Panel border with glow
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.save();
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 20 + pulseIntensity * 10;
    ctx.font = `bold ${SHOP_LAYOUT.TITLE.FONT_SIZE}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WEAPON SHOP', panel.X, panel.Y + SHOP_LAYOUT.TITLE.Y_OFFSET);
    ctx.restore();

    // Decorative line under title
    ctx.save();
    ctx.strokeStyle = COLORS.NEON_PURPLE;
    ctx.shadowColor = COLORS.NEON_PURPLE;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const lineWidth = 150;
    ctx.moveTo(panel.X - lineWidth, panel.Y + SHOP_LAYOUT.TITLE.Y_OFFSET + 30);
    ctx.lineTo(panel.X + lineWidth, panel.Y + SHOP_LAYOUT.TITLE.Y_OFFSET + 30);
    ctx.stroke();
    ctx.restore();

    // Balance display
    const currentMoney = Money.getMoney();
    ctx.save();
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOUR BALANCE', panel.X, panel.Y + SHOP_LAYOUT.BALANCE.Y_OFFSET - 15);

    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 10 + pulseIntensity * 5;
    ctx.font = `bold ${UI.FONT_SIZE_TITLE - 8}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fillText(`$${currentMoney.toLocaleString()}`, panel.X, panel.Y + SHOP_LAYOUT.BALANCE.Y_OFFSET + 15);
    ctx.restore();

    // Tab navigation bar
    renderTabBar(ctx, panel.X, panel.Y + SHOP_LAYOUT.TABS.Y_OFFSET, pulseIntensity);

    // Only render weapons content if on WEAPONS tab
    if (activeTab !== 'weapons') {
        // Render "Coming Soon" placeholder for ITEMS tab
        ctx.save();
        ctx.font = `bold 28px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ITEMS COMING SOON', panel.X, panel.Y);
        ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.fillText('Check back in future updates!', panel.X, panel.Y + 35);
        ctx.restore();

        // Render Done button only (skip weapons rendering)
        renderButton(ctx, doneButton, pulseIntensity);

        // Corner accents
        ctx.save();
        const cornerSize = 40;
        ctx.strokeStyle = COLORS.NEON_PURPLE;
        ctx.shadowColor = COLORS.NEON_PURPLE;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 4;

        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(panelLeft + 10, panelTop + 10 + cornerSize);
        ctx.lineTo(panelLeft + 10, panelTop + 10);
        ctx.lineTo(panelLeft + 10 + cornerSize, panelTop + 10);
        ctx.stroke();

        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(panelLeft + panel.WIDTH - 10 - cornerSize, panelTop + 10);
        ctx.lineTo(panelLeft + panel.WIDTH - 10, panelTop + 10);
        ctx.lineTo(panelLeft + panel.WIDTH - 10, panelTop + 10 + cornerSize);
        ctx.stroke();

        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(panelLeft + 10, panelTop + panel.HEIGHT - 10 - cornerSize);
        ctx.lineTo(panelLeft + 10, panelTop + panel.HEIGHT - 10);
        ctx.lineTo(panelLeft + 10 + cornerSize, panelTop + panel.HEIGHT - 10);
        ctx.stroke();

        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(panelLeft + panel.WIDTH - 10 - cornerSize, panelTop + panel.HEIGHT - 10);
        ctx.lineTo(panelLeft + panel.WIDTH - 10, panelTop + panel.HEIGHT - 10);
        ctx.lineTo(panelLeft + panel.WIDTH - 10, panelTop + panel.HEIGHT - 10 - cornerSize);
        ctx.stroke();

        ctx.restore();
        ctx.restore();
        return;  // Early exit - don't render weapons
    }

    // Get all purchasable weapons (excluding Basic Shot which is free/unlimited)
    const allWeapons = WeaponRegistry.getAllWeapons();

    // Calculate card grid layout
    const cardWidth = SHOP_LAYOUT.CARD.WIDTH;
    const cardHeight = SHOP_LAYOUT.CARD.HEIGHT;
    const cardGap = SHOP_LAYOUT.CARD.GAP;
    const columns = SHOP_LAYOUT.CARD.COLUMNS;
    const totalCardWidth = columns * cardWidth + (columns - 1) * cardGap;
    const gridStartX = panel.X - totalCardWidth / 2;

    // Category layout constants
    const categoryHeaderHeight = SHOP_LAYOUT.CATEGORY.HEADER_HEIGHT;
    const categorySectionMargin = SHOP_LAYOUT.CATEGORY.SECTION_MARGIN;
    const categoryLabelPadding = SHOP_LAYOUT.CATEGORY.LABEL_PADDING;

    // Check feedback state
    let feedbackWeaponId = null;
    let feedbackSuccess = false;
    if (purchaseFeedback && purchaseFeedback.active) {
        const elapsed = Date.now() - purchaseFeedback.startTime;
        if (elapsed < 500) {
            feedbackWeaponId = purchaseFeedback.weaponId;
            feedbackSuccess = purchaseFeedback.success;
        } else {
            purchaseFeedback = null;
        }
    }

    // Render weapons by category with horizontal and vertical scrolling
    // Each category section consists of:
    // 1. Category header (label + horizontal line)
    // 2. Padding below header
    // 3. Weapon cards in a single horizontal row (scrollable)
    // 4. Margin before next category (minimum 24px per spec)

    // Clear category row areas for this frame
    categoryRowAreas = [];

    // Visible row width matches the 5-column grid width
    const visibleRowWidth = totalCardWidth;

    // Calculate vertical scroll area bounds
    const scrollAreaTop = panel.Y + SHOP_LAYOUT.CATEGORY.Y_START;
    const scrollAreaBottom = panel.Y + SHOP_LAYOUT.DONE_BUTTON.Y_OFFSET - SHOP_LAYOUT.DONE_BUTTON.HEIGHT / 2 - 20; // 20px margin
    const scrollAreaHeight = scrollAreaBottom - scrollAreaTop;

    // Store scroll area for hit detection
    verticalScrollArea = {
        x: gridStartX,
        y: scrollAreaTop,
        width: visibleRowWidth,
        height: scrollAreaHeight
    };

    // First pass: calculate total content height (without vertical offset)
    let totalContentHeight = 0;
    let tempFirstCategory = true;
    for (const category of WEAPON_CATEGORIES) {
        const categoryWeapons = allWeapons.filter(w => w.type === category.type);
        if (categoryWeapons.length === 0) continue;

        if (!tempFirstCategory) {
            totalContentHeight += categorySectionMargin;
        }
        tempFirstCategory = false;

        // Height for this category: header + padding + card row
        totalContentHeight += categoryHeaderHeight + categoryLabelPadding + cardHeight;
    }

    // Calculate max vertical scroll
    maxVerticalScroll = Math.max(0, totalContentHeight - scrollAreaHeight);

    // Clamp current vertical scroll offset
    verticalScrollOffset = Math.max(0, Math.min(maxVerticalScroll, verticalScrollOffset));

    // Apply vertical clipping to category area
    ctx.save();
    ctx.beginPath();
    ctx.rect(gridStartX - 10, scrollAreaTop, visibleRowWidth + 20, scrollAreaHeight);
    ctx.clip();

    let currentY = scrollAreaTop - verticalScrollOffset;
    let isFirstCategory = true;

    for (const category of WEAPON_CATEGORIES) {
        const categoryWeapons = allWeapons.filter(w => w.type === category.type);
        if (categoryWeapons.length === 0) continue;

        // Add section margin BEFORE this category (except for first)
        if (!isFirstCategory) {
            currentY += categorySectionMargin;
        }
        isFirstCategory = false;

        // Initialize scroll offset for this category if not already set
        if (categoryScrollOffsets[category.type] === undefined) {
            categoryScrollOffsets[category.type] = 0;
        }

        // Calculate total content width (all cards in a single row)
        const totalContentWidth = categoryWeapons.length * cardWidth + (categoryWeapons.length - 1) * cardGap;
        // Max scroll is the amount content extends beyond visible area (0 if fits)
        const maxScroll = Math.max(0, totalContentWidth - visibleRowWidth);

        // === DRAW CATEGORY HEADER ===
        // Header text is vertically centered in the header area
        const categoryLabelY = currentY + categoryHeaderHeight / 2;
        ctx.save();
        ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = category.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(category.name, gridStartX, categoryLabelY);

        // Horizontal line extends from after label text to right edge
        const labelWidth = ctx.measureText(category.name).width;
        ctx.strokeStyle = category.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gridStartX + labelWidth + 12, categoryLabelY);
        ctx.lineTo(gridStartX + totalCardWidth, categoryLabelY);
        ctx.stroke();
        ctx.restore();

        // === POSITION FOR CARDS ===
        // Move past header area + padding to get card start position
        const cardStartY = currentY + categoryHeaderHeight + categoryLabelPadding;

        // Skip this category if it's completely outside the visible scroll area
        const categoryBottom = cardStartY + cardHeight;
        if (categoryBottom < scrollAreaTop || currentY > scrollAreaBottom) {
            // Update Y for next category and skip rendering
            currentY = cardStartY + cardHeight;
            continue;
        }

        // Track category row area for scroll interactions (only if visible)
        // Clamp the hit area to the visible scroll region
        const visibleTop = Math.max(scrollAreaTop, cardStartY);
        const visibleBottom = Math.min(scrollAreaBottom, categoryBottom);
        if (visibleBottom > visibleTop) {
            categoryRowAreas.push({
                categoryType: category.type,
                x: gridStartX,
                y: visibleTop,
                width: visibleRowWidth,
                height: visibleBottom - visibleTop,
                maxScroll: maxScroll
            });
        }

        // === DRAW WEAPON CARDS (single horizontal row with scroll) ===
        // Apply clipping to only show cards within the visible area
        ctx.save();
        ctx.beginPath();
        ctx.rect(gridStartX, cardStartY, visibleRowWidth, cardHeight);
        ctx.clip();

        const scrollOffset = categoryScrollOffsets[category.type] || 0;

        for (let i = 0; i < categoryWeapons.length; i++) {
            const weapon = categoryWeapons[i];
            // All cards in a single row, offset by scroll position
            const cardX = gridStartX + i * (cardWidth + cardGap) - scrollOffset;
            const cardY = cardStartY;

            // Only render cards that are at least partially visible
            if (cardX + cardWidth >= gridStartX && cardX <= gridStartX + visibleRowWidth) {
                const currentAmmo = playerTankRef ? playerTankRef.getAmmo(weapon.id) : 0;
                const canAfford = Money.canAfford(weapon.cost);
                const showFeedback = feedbackWeaponId === weapon.id;

                renderWeaponCard(
                    ctx, weapon, cardX, cardY, currentAmmo, canAfford,
                    pulseIntensity, showFeedback, feedbackSuccess
                );
            }
        }

        ctx.restore(); // Remove clipping

        // === UPDATE Y FOR NEXT CATEGORY ===
        // Only one row per category now
        currentY = cardStartY + cardHeight;
    }

    // Remove vertical clipping
    ctx.restore();

    // Render Done button
    renderButton(ctx, doneButton, pulseIntensity);

    // Corner accents (synthwave style)
    ctx.save();
    const cornerSize = 40;
    ctx.strokeStyle = COLORS.NEON_PURPLE;
    ctx.shadowColor = COLORS.NEON_PURPLE;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(panelLeft + 10, panelTop + 10 + cornerSize);
    ctx.lineTo(panelLeft + 10, panelTop + 10);
    ctx.lineTo(panelLeft + 10 + cornerSize, panelTop + 10);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(panelLeft + panel.WIDTH - 10 - cornerSize, panelTop + 10);
    ctx.lineTo(panelLeft + panel.WIDTH - 10, panelTop + 10);
    ctx.lineTo(panelLeft + panel.WIDTH - 10, panelTop + 10 + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(panelLeft + 10, panelTop + panel.HEIGHT - 10 - cornerSize);
    ctx.lineTo(panelLeft + 10, panelTop + panel.HEIGHT - 10);
    ctx.lineTo(panelLeft + 10 + cornerSize, panelTop + panel.HEIGHT - 10);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(panelLeft + panel.WIDTH - 10 - cornerSize, panelTop + panel.HEIGHT - 10);
    ctx.lineTo(panelLeft + panel.WIDTH - 10, panelTop + panel.HEIGHT - 10);
    ctx.lineTo(panelLeft + panel.WIDTH - 10, panelTop + panel.HEIGHT - 10 - cornerSize);
    ctx.stroke();

    ctx.restore();

    ctx.restore();
}

/**
 * Update the shop state (called each frame).
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    if (isVisible) {
        animationTime += deltaTime;
    }
}
