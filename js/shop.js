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
    // Weapon categories - proper containment with adequate spacing
    CATEGORY: {
        Y_START: -265,
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

    console.log('[Shop] Opened');
}

/**
 * Hide the shop interface.
 */
export function hide() {
    isVisible = false;
    playerTankRef = null;
    weaponCardAreas = [];

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
    if (!isVisible) {
        pressedElementId = null;
        return false;
    }

    const wasPressed = pressedElementId;
    pressedElementId = null;

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
 * Draw a compact weapon card with touch feedback.
 * Cards are 110x80px to fit more weapons per row while staying touch-friendly.
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

    // Determine card color based on weapon type
    let borderColor = COLORS.NEON_CYAN;
    const category = WEAPON_CATEGORIES.find(c => c.type === weapon.type);
    if (category) {
        borderColor = category.color;
    }

    // Dim if can't afford
    const dimmed = !canAfford && weapon.cost > 0;

    ctx.save();

    // Pressed offset for tactile feedback
    const pressOffset = isPressed ? 1 : 0;

    // Card background - brighter when pressed
    const bgColor = isPressed ? 'rgba(40, 40, 70, 0.95)' :
                    (dimmed ? 'rgba(20, 20, 40, 0.85)' : 'rgba(26, 26, 46, 0.9)');
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

    // Pressed highlight
    if (isPressed && !dimmed) {
        ctx.fillStyle = `${borderColor}20`;  // 12% opacity highlight
        ctx.fill();
    }

    // Border with glow - stronger when pressed
    ctx.strokeStyle = dimmed ? COLORS.TEXT_MUTED : borderColor;
    ctx.lineWidth = isPressed ? 2 : 1;
    if (!dimmed) {
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = isPressed ? 8 : (showFeedback && feedbackSuccess ? 10 : 3);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Apply press offset to all positions
    const textY = y + pressOffset;
    const centerX = x + cardWidth / 2;

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
        if (dimmed) {
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
        ctx.fillStyle = dimmed ? COLORS.TEXT_MUTED : borderColor;
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    // === TEXT CONTENT (below icon) ===
    // Compact layout: stacked vertically, centered
    // Row 1: Weapon name (centered, truncated if needed)
    ctx.fillStyle = dimmed ? COLORS.TEXT_MUTED : COLORS.TEXT_LIGHT;
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

    // Row 2: Price (centered)
    ctx.font = `bold 11px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = weapon.cost === 0 ? '#00ff88' : (canAfford ? COLORS.NEON_YELLOW : COLORS.NEON_PINK);
    const costText = weapon.cost === 0 ? 'FREE' : `$${weapon.cost.toLocaleString()}`;
    ctx.fillText(costText, centerX, textY + 52);

    // Row 3: Owned count (centered)
    ctx.font = `10px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = currentAmmo > 0 || currentAmmo === Infinity ? '#00ff88' : COLORS.TEXT_MUTED;
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

    // Render weapons by category with proper containment
    // Each category section consists of:
    // 1. Category header (label + horizontal line)
    // 2. Padding below header
    // 3. Weapon cards grid
    // 4. Margin before next category (minimum 24px per spec)

    let currentY = panel.Y + SHOP_LAYOUT.CATEGORY.Y_START;
    let isFirstCategory = true;

    for (const category of WEAPON_CATEGORIES) {
        const categoryWeapons = allWeapons.filter(w => w.type === category.type);
        if (categoryWeapons.length === 0) continue;

        // Add section margin BEFORE this category (except for first)
        if (!isFirstCategory) {
            currentY += categorySectionMargin;
        }
        isFirstCategory = false;

        // Calculate how many rows of cards this category needs
        const numRows = Math.ceil(categoryWeapons.length / columns);

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

        // === DRAW WEAPON CARDS ===
        let col = 0;
        let row = 0;
        for (const weapon of categoryWeapons) {
            if (col >= columns) {
                col = 0;
                row++;
            }

            const cardX = gridStartX + col * (cardWidth + cardGap);
            const cardY = cardStartY + row * (cardHeight + cardGap);

            const currentAmmo = playerTankRef ? playerTankRef.getAmmo(weapon.id) : 0;
            const canAfford = Money.canAfford(weapon.cost);
            const showFeedback = feedbackWeaponId === weapon.id;

            renderWeaponCard(
                ctx, weapon, cardX, cardY, currentAmmo, canAfford,
                pulseIntensity, showFeedback, feedbackSuccess
            );

            col++;
        }

        // === UPDATE Y FOR NEXT CATEGORY ===
        // Move past: header + padding + all card rows
        currentY = cardStartY + numRows * cardHeight + (numRows - 1) * cardGap;
    }

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
