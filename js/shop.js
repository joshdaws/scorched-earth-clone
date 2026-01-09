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
import { playPurchaseSound, playErrorSound } from './sound.js';

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

// =============================================================================
// SHOP LAYOUT CONSTANTS
// =============================================================================

/**
 * Shop layout configuration.
 * Centered on screen with weapon cards in a grid layout.
 */
const SHOP_LAYOUT = {
    // Main shop panel
    PANEL: {
        X: CANVAS.DESIGN_WIDTH / 2,
        Y: CANVAS.DESIGN_HEIGHT / 2,
        WIDTH: 900,
        HEIGHT: 650,
        PADDING: 30
    },
    // Title area
    TITLE: {
        Y_OFFSET: -280,  // From panel center
        FONT_SIZE: 42
    },
    // Balance display
    BALANCE: {
        Y_OFFSET: -220,
        HEIGHT: 40
    },
    // Weapon categories
    CATEGORY: {
        Y_START: -160,  // Starting Y offset from panel center
        HEIGHT: 30,
        SPACING: 10
    },
    // Weapon cards grid
    CARD: {
        WIDTH: 200,
        HEIGHT: 120,
        GAP: 15,
        COLUMNS: 4
    },
    // Done button
    DONE_BUTTON: {
        Y_OFFSET: 280,  // From panel center
        WIDTH: 200,
        HEIGHT: 55
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
 * Handle click/tap on the shop screen.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if a button was clicked
 */
export function handleClick(x, y) {
    if (!isVisible) return false;

    // Check done button
    if (isInsideButton(x, y, doneButton)) {
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
 * Draw a neon-styled button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button definition
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderButton(ctx, button, pulseIntensity) {
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    const btnX = button.x - halfWidth;
    const btnY = button.y - halfHeight;

    ctx.save();

    // Button background with rounded corners
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, button.width, button.height, 8);
    ctx.fill();

    // Neon glow effect (pulsing)
    ctx.shadowColor = button.color;
    ctx.shadowBlur = 12 + pulseIntensity * 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Button border
    ctx.strokeStyle = button.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Reset shadow for text
    ctx.shadowBlur = 0;

    // Button text with glow
    ctx.shadowColor = button.color;
    ctx.shadowBlur = 6 + pulseIntensity * 4;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x, button.y);

    ctx.restore();
}

/**
 * Draw a weapon card.
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

    // Determine card color based on weapon type
    let borderColor = COLORS.NEON_CYAN;
    const category = WEAPON_CATEGORIES.find(c => c.type === weapon.type);
    if (category) {
        borderColor = category.color;
    }

    // Dim if can't afford
    const dimmed = !canAfford && weapon.cost > 0;

    ctx.save();

    // Card background
    ctx.fillStyle = dimmed ? 'rgba(20, 20, 40, 0.85)' : 'rgba(26, 26, 46, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 8);
    ctx.fill();

    // Feedback flash
    if (showFeedback) {
        const flashColor = feedbackSuccess ? 'rgba(0, 255, 100, 0.3)' : 'rgba(255, 50, 50, 0.3)';
        ctx.fillStyle = flashColor;
        ctx.fill();
    }

    // Border with glow
    ctx.strokeStyle = dimmed ? COLORS.TEXT_MUTED : borderColor;
    ctx.lineWidth = 2;
    if (!dimmed) {
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = showFeedback && feedbackSuccess ? 20 : 6;
    }
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Weapon name
    ctx.fillStyle = dimmed ? COLORS.TEXT_MUTED : COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(weapon.name, x + 10, y + 10);

    // Stats row 1: Cost and Ammo per purchase
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = weapon.cost === 0 ? '#00ff88' : (canAfford ? COLORS.NEON_YELLOW : COLORS.NEON_PINK);
    const costText = weapon.cost === 0 ? 'FREE' : `$${weapon.cost.toLocaleString()}`;
    ctx.fillText(costText, x + 10, y + 35);

    // Ammo per purchase on right side
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'right';
    const ammoPerPurchase = weapon.ammo === Infinity ? '∞' : `+${weapon.ammo}`;
    ctx.fillText(`x${ammoPerPurchase}`, x + cardWidth - 10, y + 35);

    // Stats row 2: Damage and Radius
    ctx.textAlign = 'left';
    ctx.fillStyle = dimmed ? 'rgba(136, 136, 153, 0.5)' : COLORS.TEXT_MUTED;
    ctx.fillText(`DMG: ${weapon.damage}`, x + 10, y + 55);
    ctx.fillText(`RAD: ${weapon.blastRadius}`, x + 10, y + 75);

    // Current ammo owned
    ctx.textAlign = 'right';
    ctx.fillStyle = currentAmmo > 0 || currentAmmo === Infinity ? '#00ff88' : COLORS.TEXT_MUTED;
    const ownedAmmo = currentAmmo === Infinity ? '∞' : currentAmmo;
    ctx.fillText(`OWNED: ${ownedAmmo}`, x + cardWidth - 10, y + 55);

    // Buy indicator (if purchasable)
    if (weapon.cost > 0 && canAfford) {
        ctx.fillStyle = borderColor;
        ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO BUY', x + cardWidth / 2, y + cardHeight - 12);
    } else if (weapon.cost === 0) {
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `${UI.FONT_SIZE_SMALL - 2}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('DEFAULT WEAPON', x + cardWidth / 2, y + cardHeight - 12);
    } else if (weapon.cost > 0 && !canAfford) {
        ctx.fillStyle = COLORS.NEON_PINK;
        ctx.font = `bold ${UI.FONT_SIZE_SMALL - 2}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('INSUFFICIENT FUNDS', x + cardWidth / 2, y + cardHeight - 12);
    }

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
    const gridStartY = panel.Y + SHOP_LAYOUT.CATEGORY.Y_START + 50;

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

    // Render weapons by category
    let currentRow = 0;
    let currentCol = 0;

    for (const category of WEAPON_CATEGORIES) {
        const categoryWeapons = allWeapons.filter(w => w.type === category.type);
        if (categoryWeapons.length === 0) continue;

        // Category header (placed before first weapon of this category)
        if (currentCol > 0) {
            // Move to next row if we're mid-row
            currentRow++;
            currentCol = 0;
        }

        const categoryY = gridStartY + currentRow * (cardHeight + cardGap) - 20;
        ctx.save();
        ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = category.color;
        ctx.textAlign = 'left';
        ctx.fillText(category.name, gridStartX, categoryY);

        // Category line
        ctx.strokeStyle = category.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gridStartX + 80, categoryY - 5);
        ctx.lineTo(gridStartX + totalCardWidth, categoryY - 5);
        ctx.stroke();
        ctx.restore();

        // Render weapons in this category
        for (const weapon of categoryWeapons) {
            if (currentCol >= columns) {
                currentCol = 0;
                currentRow++;
            }

            const cardX = gridStartX + currentCol * (cardWidth + cardGap);
            const cardY = gridStartY + currentRow * (cardHeight + cardGap);

            const currentAmmo = playerTankRef ? playerTankRef.getAmmo(weapon.id) : 0;
            const canAfford = Money.canAfford(weapon.cost);
            const showFeedback = feedbackWeaponId === weapon.id;

            renderWeaponCard(
                ctx, weapon, cardX, cardY, currentAmmo, canAfford,
                pulseIntensity, showFeedback, feedbackSuccess
            );

            currentCol++;
        }

        // Move to next row after category
        currentRow++;
        currentCol = 0;
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

    // Hint text at bottom
    ctx.save();
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('Click a weapon card to purchase', panel.X, panel.Y + SHOP_LAYOUT.DONE_BUTTON.Y_OFFSET - 30);
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
