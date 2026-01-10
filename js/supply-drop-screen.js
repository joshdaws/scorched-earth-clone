/**
 * Scorched Earth: Synthwave Edition
 * Supply Drop Purchase Screen
 *
 * Screen for purchasing supply drop crates using tokens.
 * Three purchase tiers: Standard, Premium, and Guaranteed Rare+.
 */

import { GAME_STATES, CANVAS } from './constants.js';
import * as Game from './game.js';
import * as Input from './input.js';
import * as Music from './music.js';
import * as SupplyDrop from './supply-drop.js';
import * as TankCollection from './tank-collection.js';
import { getTokenBalance, spendTokens, canAfford } from './tokens.js';
import {
    RARITY,
    DROP_RATES,
    RARITY_COLORS,
    getTanksByRarity,
    getAllTanks
} from './tank-skins.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Layout
    HEADER_HEIGHT: 80,
    CARD_WIDTH: 280,
    CARD_HEIGHT: 380,
    CARD_GAP: 40,
    CARD_Y: 180,

    // Purchase options
    PURCHASE_OPTIONS: [
        {
            id: 'standard',
            name: 'STANDARD DROP',
            cost: 50,
            description: 'Standard drop rates',
            dropRates: { ...DROP_RATES },
            glowColor: '#00FFFF'
        },
        {
            id: 'premium',
            name: 'PREMIUM DROP',
            cost: 100,
            description: '+10% Rare or better',
            dropRates: {
                [RARITY.COMMON]: 45,
                [RARITY.UNCOMMON]: 28,
                [RARITY.RARE]: 17,      // +5%
                [RARITY.EPIC]: 7,        // +3%
                [RARITY.LEGENDARY]: 3    // +2%
            },
            glowColor: '#FF00FF'
        },
        {
            id: 'guaranteed',
            name: 'RARE+ DROP',
            cost: 250,
            description: 'Guaranteed Rare or better',
            dropRates: {
                [RARITY.COMMON]: 0,
                [RARITY.UNCOMMON]: 0,
                [RARITY.RARE]: 70,
                [RARITY.EPIC]: 22,
                [RARITY.LEGENDARY]: 8
            },
            glowColor: '#F59E0B'
        }
    ],

    // Button styling
    BUTTON_HEIGHT: 50,
    BUTTON_MARGIN: 20,

    // Colors
    COLORS: {
        BACKGROUND: '#0a0a1a',
        CARD_BG: 'rgba(20, 20, 40, 0.9)',
        CARD_BORDER: '#333366',
        TEXT_PRIMARY: '#FFFFFF',
        TEXT_SECONDARY: '#9CA3AF',
        TEXT_DISABLED: '#4B5563',
        BUTTON_ENABLED: '#10B981',
        BUTTON_DISABLED: '#374151',
        TOKEN_COLOR: '#F59E0B'
    },

    // Back button
    BACK_BUTTON: {
        x: 30,
        y: 30,
        width: 120,
        height: 40
    }
};

// =============================================================================
// MODULE STATE
// =============================================================================

let state = {
    hoveredCard: -1,
    isAnimating: false,
    selectedOption: null
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get card position by index
 */
function getCardPosition(index) {
    const totalWidth = (CONFIG.CARD_WIDTH * 3) + (CONFIG.CARD_GAP * 2);
    const startX = (CANVAS.DESIGN_WIDTH - totalWidth) / 2;
    return {
        x: startX + (index * (CONFIG.CARD_WIDTH + CONFIG.CARD_GAP)),
        y: CONFIG.CARD_Y
    };
}

/**
 * Check if a point is inside a rectangle
 */
function isPointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Roll for a tank based on drop rates
 */
function rollTank(dropRates) {
    // Roll for rarity
    const roll = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = RARITY.COMMON;

    for (const rarity of [RARITY.COMMON, RARITY.UNCOMMON, RARITY.RARE, RARITY.EPIC, RARITY.LEGENDARY]) {
        cumulative += dropRates[rarity];
        if (roll < cumulative) {
            selectedRarity = rarity;
            break;
        }
    }

    // Get tanks of selected rarity
    const tanksOfRarity = getTanksByRarity(selectedRarity);

    // Pick random tank from that rarity
    const randomIndex = Math.floor(Math.random() * tanksOfRarity.length);
    return tanksOfRarity[randomIndex];
}

/**
 * Attempt to purchase a supply drop
 */
function attemptPurchase(optionIndex) {
    if (state.isAnimating) return;

    const option = CONFIG.PURCHASE_OPTIONS[optionIndex];

    // Check if can afford
    if (!canAfford(option.cost)) {
        console.log(`Cannot afford ${option.name} (need ${option.cost} tokens)`);
        return;
    }

    // Deduct tokens
    const success = spendTokens(option.cost);
    if (!success) {
        console.log('Failed to spend tokens');
        return;
    }

    console.log(`Purchased ${option.name} for ${option.cost} tokens`);

    // Roll for tank
    const tank = rollTank(option.dropRates);
    console.log(`Rolled: ${tank.name} (${tank.rarity})`);

    // Start animation
    state.isAnimating = true;
    state.selectedOption = option;

    SupplyDrop.play(tank, () => {
        // Animation complete - add tank to collection
        const isNew = TankCollection.addTank(tank.id);
        if (isNew) {
            console.log(`Added NEW tank to collection: ${tank.name}`);
        } else {
            console.log(`Duplicate tank: ${tank.name}`);
            // TODO: Could give token refund for duplicates in future
        }

        state.isAnimating = false;
        state.selectedOption = null;
    });
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle click/tap events
 */
function handleClick(pos) {
    if (state.isAnimating) {
        // During animation, check for skip/continue
        if (SupplyDrop.isShowingResultCard()) {
            SupplyDrop.continueFromSkip();
        }
        return;
    }

    // Check back button
    const bb = CONFIG.BACK_BUTTON;
    if (isPointInRect(pos.x, pos.y, bb.x, bb.y, bb.width, bb.height)) {
        Game.setState(GAME_STATES.MENU);
        return;
    }

    // Check purchase cards
    for (let i = 0; i < CONFIG.PURCHASE_OPTIONS.length; i++) {
        const cardPos = getCardPosition(i);
        const buttonY = cardPos.y + CONFIG.CARD_HEIGHT - CONFIG.BUTTON_HEIGHT - CONFIG.BUTTON_MARGIN;

        // Check if click is on the button area
        if (isPointInRect(
            pos.x, pos.y,
            cardPos.x + CONFIG.BUTTON_MARGIN,
            buttonY,
            CONFIG.CARD_WIDTH - (CONFIG.BUTTON_MARGIN * 2),
            CONFIG.BUTTON_HEIGHT
        )) {
            attemptPurchase(i);
            return;
        }
    }
}

/**
 * Handle mouse move for hover effects
 */
function handleMouseMove(pos) {
    if (state.isAnimating) return;

    state.hoveredCard = -1;

    for (let i = 0; i < CONFIG.PURCHASE_OPTIONS.length; i++) {
        const cardPos = getCardPosition(i);
        if (isPointInRect(pos.x, pos.y, cardPos.x, cardPos.y, CONFIG.CARD_WIDTH, CONFIG.CARD_HEIGHT)) {
            state.hoveredCard = i;
            break;
        }
    }
}

/**
 * Handle keyboard input
 */
function handleKeyDown(key) {
    if (state.isAnimating) {
        // Space to skip/continue during animation
        if (key === ' ' || key === 'Space') {
            if (SupplyDrop.isShowingResultCard()) {
                SupplyDrop.continueFromSkip();
            } else {
                SupplyDrop.startSkipHold();
            }
        }
        return;
    }

    // Escape to go back
    if (key === 'Escape') {
        Game.setState(GAME_STATES.MENU);
    }

    // Number keys for quick purchase
    if (key === '1') attemptPurchase(0);
    if (key === '2') attemptPurchase(1);
    if (key === '3') attemptPurchase(2);
}

/**
 * Handle key up
 */
function handleKeyUp(key) {
    if (key === ' ' || key === 'Space') {
        SupplyDrop.stopSkipHold();
    }
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Draw the header with token balance
 */
function drawHeader(ctx) {
    // Title
    ctx.font = 'bold 36px "Orbitron", monospace';
    ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
    ctx.textAlign = 'center';
    ctx.fillText('SUPPLY DROPS', CANVAS.DESIGN_WIDTH / 2, 55);

    // Token balance (top right)
    const balance = getTokenBalance();
    ctx.font = 'bold 24px "Orbitron", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.COLORS.TOKEN_COLOR;
    ctx.fillText(`${balance}`, CANVAS.DESIGN_WIDTH - 40, 50);

    // Token icon (simple circle)
    ctx.beginPath();
    ctx.arc(CANVAS.DESIGN_WIDTH - 60 - ctx.measureText(`${balance}`).width, 44, 12, 0, Math.PI * 2);
    ctx.strokeStyle = CONFIG.COLORS.TOKEN_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = CONFIG.COLORS.TOKEN_COLOR;
    ctx.font = 'bold 14px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('T', CANVAS.DESIGN_WIDTH - 60 - ctx.measureText(`${balance}`).width, 49);
}

/**
 * Draw back button
 */
function drawBackButton(ctx) {
    const bb = CONFIG.BACK_BUTTON;

    // Button background
    ctx.fillStyle = 'rgba(30, 30, 50, 0.8)';
    ctx.strokeStyle = '#666699';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(bb.x, bb.y, bb.width, bb.height, 8);
    ctx.fill();
    ctx.stroke();

    // Arrow and text
    ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
    ctx.font = '16px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('< BACK', bb.x + bb.width / 2, bb.y + 26);
}

/**
 * Draw a purchase card
 */
function drawPurchaseCard(ctx, index) {
    const option = CONFIG.PURCHASE_OPTIONS[index];
    const pos = getCardPosition(index);
    const isHovered = state.hoveredCard === index;
    const affordable = canAfford(option.cost);

    // Card background with glow on hover
    if (isHovered && affordable) {
        ctx.shadowColor = option.glowColor;
        ctx.shadowBlur = 20;
    }

    ctx.fillStyle = CONFIG.COLORS.CARD_BG;
    ctx.strokeStyle = isHovered ? option.glowColor : CONFIG.COLORS.CARD_BORDER;
    ctx.lineWidth = isHovered ? 3 : 2;

    ctx.beginPath();
    ctx.roundRect(pos.x, pos.y, CONFIG.CARD_WIDTH, CONFIG.CARD_HEIGHT, 12);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Card title
    ctx.font = 'bold 20px "Orbitron", monospace';
    ctx.fillStyle = option.glowColor;
    ctx.textAlign = 'center';
    ctx.fillText(option.name, pos.x + CONFIG.CARD_WIDTH / 2, pos.y + 40);

    // Crate icon placeholder (simple box)
    const iconSize = 80;
    const iconX = pos.x + (CONFIG.CARD_WIDTH - iconSize) / 2;
    const iconY = pos.y + 60;

    ctx.strokeStyle = option.glowColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(iconX, iconY, iconSize, iconSize);

    // Cross pattern on crate
    ctx.beginPath();
    ctx.moveTo(iconX, iconY + iconSize / 2);
    ctx.lineTo(iconX + iconSize, iconY + iconSize / 2);
    ctx.moveTo(iconX + iconSize / 2, iconY);
    ctx.lineTo(iconX + iconSize / 2, iconY + iconSize);
    ctx.stroke();

    // Description
    ctx.font = '14px "Orbitron", monospace';
    ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
    ctx.fillText(option.description, pos.x + CONFIG.CARD_WIDTH / 2, pos.y + 170);

    // Drop rates breakdown
    const rateY = pos.y + 200;
    ctx.font = '12px "Orbitron", monospace';
    ctx.textAlign = 'left';

    const rarities = [RARITY.COMMON, RARITY.UNCOMMON, RARITY.RARE, RARITY.EPIC, RARITY.LEGENDARY];
    const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

    rarities.forEach((rarity, i) => {
        const rate = option.dropRates[rarity];
        if (rate > 0) {
            ctx.fillStyle = RARITY_COLORS[rarity];
            ctx.fillText(`${rarityNames[i]}:`, pos.x + 30, rateY + (i * 20));
            ctx.textAlign = 'right';
            ctx.fillText(`${rate}%`, pos.x + CONFIG.CARD_WIDTH - 30, rateY + (i * 20));
            ctx.textAlign = 'left';
        } else {
            ctx.fillStyle = CONFIG.COLORS.TEXT_DISABLED;
            ctx.fillText(`${rarityNames[i]}:`, pos.x + 30, rateY + (i * 20));
            ctx.textAlign = 'right';
            ctx.fillText('--', pos.x + CONFIG.CARD_WIDTH - 30, rateY + (i * 20));
            ctx.textAlign = 'left';
        }
    });

    // Purchase button
    const buttonY = pos.y + CONFIG.CARD_HEIGHT - CONFIG.BUTTON_HEIGHT - CONFIG.BUTTON_MARGIN;
    const buttonX = pos.x + CONFIG.BUTTON_MARGIN;
    const buttonW = CONFIG.CARD_WIDTH - (CONFIG.BUTTON_MARGIN * 2);

    ctx.fillStyle = affordable ? CONFIG.COLORS.BUTTON_ENABLED : CONFIG.COLORS.BUTTON_DISABLED;
    ctx.beginPath();
    ctx.roundRect(buttonX, buttonY, buttonW, CONFIG.BUTTON_HEIGHT, 8);
    ctx.fill();

    // Button text
    ctx.font = 'bold 16px "Orbitron", monospace';
    ctx.fillStyle = affordable ? '#FFFFFF' : CONFIG.COLORS.TEXT_DISABLED;
    ctx.textAlign = 'center';
    ctx.fillText(`OPEN - ${option.cost}`, pos.x + CONFIG.CARD_WIDTH / 2, buttonY + 32);

    // Token icon on button
    const textWidth = ctx.measureText(`OPEN - ${option.cost}`).width;
    ctx.beginPath();
    ctx.arc(pos.x + CONFIG.CARD_WIDTH / 2 + textWidth / 2 + 15, buttonY + 26, 8, 0, Math.PI * 2);
    ctx.strokeStyle = affordable ? '#FFFFFF' : CONFIG.COLORS.TEXT_DISABLED;
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

/**
 * Draw keyboard hints
 */
function drawHints(ctx) {
    ctx.font = '12px "Orbitron", monospace';
    ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
    ctx.textAlign = 'center';
    ctx.fillText('Press 1, 2, or 3 to quick-purchase  |  ESC to return', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 30);
}

/**
 * Main render function
 */
function render(ctx) {
    // If animation is playing, let supply drop render
    if (state.isAnimating) {
        // Draw dark background
        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

        // Supply drop renders on top via its own system
        SupplyDrop.render(ctx);
        return;
    }

    // Clear with background
    ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Draw synthwave grid (simple version)
    drawGrid(ctx);

    // Draw UI elements
    drawHeader(ctx);
    drawBackButton(ctx);

    // Draw purchase cards
    for (let i = 0; i < CONFIG.PURCHASE_OPTIONS.length; i++) {
        drawPurchaseCard(ctx, i);
    }

    drawHints(ctx);
}

/**
 * Draw simple synthwave grid background
 */
function drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let y = 0; y < CANVAS.DESIGN_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS.DESIGN_WIDTH, y);
        ctx.stroke();
    }

    // Vertical lines
    for (let x = 0; x < CANVAS.DESIGN_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS.DESIGN_HEIGHT);
        ctx.stroke();
    }
}

/**
 * Update function (for animations)
 */
function update(deltaTime) {
    if (state.isAnimating) {
        SupplyDrop.update(deltaTime);
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the screen state
 */
function init() {
    state.hoveredCard = -1;
    state.isAnimating = false;
    state.selectedOption = null;
}

/**
 * Setup input handlers and register with game state machine
 */
export function setup() {
    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.SUPPLY_DROP) {
            handleClick({ x, y });
        }
    });

    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.SUPPLY_DROP) {
            handleMouseMove({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.SUPPLY_DROP) {
            handleClick({ x, y });
        }
    });

    Input.onKeyDown((key) => {
        if (Game.getState() === GAME_STATES.SUPPLY_DROP) {
            handleKeyDown(key);
        }
    });

    Input.onKeyUp((key) => {
        if (Game.getState() === GAME_STATES.SUPPLY_DROP) {
            handleKeyUp(key);
        }
    });

    // Register state handlers
    Game.registerStateHandlers(GAME_STATES.SUPPLY_DROP, {
        onEnter: (fromState) => {
            console.log('Entered SUPPLY_DROP state');
            init();
            Music.playForState(GAME_STATES.MENU);
        },
        onExit: (toState) => {
            console.log('Exiting SUPPLY_DROP state');
            state.isAnimating = false;
        },
        update: update,
        render: render
    });

    console.log('[SupplyDropScreen] Setup complete');
}

// Export for testing
export { attemptPurchase, rollTank };
