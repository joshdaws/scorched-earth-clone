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
import { COLORS, DEBUG, CANVAS, UI, GAME_STATES, TURN_PHASES, PHYSICS, TANK, PROJECTILE, GAME } from './constants.js';
import { generateTerrain } from './terrain.js';
import { placeTanksOnTerrain, updateTankTerrainPosition } from './tank.js';
import { Projectile, createProjectileFromTank, checkTankCollision, createSplitProjectiles } from './projectile.js';
import { applyExplosionDamage, applyExplosionToAllTanks, DAMAGE } from './damage.js';
import * as Wind from './wind.js';
import { WeaponRegistry, WEAPON_TYPES } from './weapons.js';
import * as AI from './ai.js';
import * as HUD from './ui.js';
import * as AimingControls from './aimingControls.js';
import * as VictoryDefeat from './victoryDefeat.js';
import * as Money from './money.js';
import * as Shop from './shop.js';
import { spawnExplosionParticles, updateParticles, renderParticles, clearParticles, getParticleCount, screenShakeForBlastRadius, getScreenShakeOffset, clearScreenShake, screenFlash, renderScreenFlash, clearScreenFlash, initBackground, updateBackground, renderBackground, clearBackground, renderCrtEffects, setCrtEnabled, isCrtEnabled, toggleCrt } from './effects.js';
import * as Music from './music.js';
import * as VolumeControls from './volumeControls.js';
import * as PauseMenu from './pauseMenu.js';
import * as TouchAiming from './touchAiming.js';

// =============================================================================
// TERRAIN STATE
// =============================================================================

/**
 * Current terrain instance (generated when game starts)
 * @type {import('./terrain.js').Terrain|null}
 */
let currentTerrain = null;

// =============================================================================
// TANK STATE
// =============================================================================

/**
 * Player tank instance
 * @type {import('./tank.js').Tank|null}
 */
let playerTank = null;

/**
 * Enemy tank instance
 * @type {import('./tank.js').Tank|null}
 */
let enemyTank = null;

/**
 * Current round number (1-based)
 * @type {number}
 */
let currentRound = 1;

// =============================================================================
// PROJECTILE STATE
// =============================================================================

/**
 * Array of currently active projectiles.
 * Usually contains a single projectile, but MIRV weapons create multiple child projectiles.
 * @type {import('./projectile.js').Projectile[]}
 */
let activeProjectiles = [];

/**
 * Legacy accessor for backwards compatibility (used in some render code)
 * @returns {import('./projectile.js').Projectile|null}
 */
function getActiveProjectile() {
    return activeProjectiles.length > 0 ? activeProjectiles[0] : null;
}

/**
 * Split effect state for visual feedback when MIRV splits.
 * @type {{active: boolean, x: number, y: number, startTime: number, duration: number}|null}
 */
let splitEffect = null;

// =============================================================================
// NUCLEAR WEAPON EFFECT STATE
// =============================================================================

// Screen shake and screen flash are now handled by effects.js
// See screenShakeForBlastRadius(), getScreenShakeOffset(), screenFlash(), renderScreenFlash()

/**
 * Explosion effect state for visual feedback on projectile impact.
 * Nuclear weapons create larger, more dramatic explosions.
 * @type {{active: boolean, x: number, y: number, radius: number, startTime: number, duration: number, isNuclear: boolean, hasMushroomCloud: boolean}|null}
 */
let explosionEffect = null;

// =============================================================================
// WEAPON HUD STATE
// =============================================================================

/**
 * Weapon HUD panel dimensions and position.
 * Located at top-right of the screen. Clickable to cycle weapons.
 */
const weaponHUD = {
    x: CANVAS.DESIGN_WIDTH - 20,  // 20px from right edge (right-aligned)
    y: 15,                          // 15px from top
    width: 200,
    height: 50,
    padding: 10
};

/**
 * Pause button dimensions and position.
 * Small button in top-right corner for mouse/touch pause.
 */
const pauseButton = {
    x: CANVAS.DESIGN_WIDTH - 50,
    y: CANVAS.DESIGN_HEIGHT - 50,
    width: 40,
    height: 40
};

/**
 * Check if a point is inside the pause button.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if point is inside the pause button
 */
function isInsidePauseButton(x, y) {
    return (
        x >= pauseButton.x &&
        x <= pauseButton.x + pauseButton.width &&
        y >= pauseButton.y &&
        y <= pauseButton.y + pauseButton.height
    );
}

/**
 * Render the pause button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPauseButton(ctx) {
    ctx.save();

    // Button background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
    ctx.beginPath();
    ctx.roundRect(pauseButton.x, pauseButton.y, pauseButton.width, pauseButton.height, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pause icon (two vertical bars)
    ctx.fillStyle = COLORS.NEON_CYAN;
    const barWidth = 6;
    const barHeight = 18;
    const gap = 6;
    const centerX = pauseButton.x + pauseButton.width / 2;
    const centerY = pauseButton.y + pauseButton.height / 2;

    // Left bar
    ctx.fillRect(centerX - gap / 2 - barWidth, centerY - barHeight / 2, barWidth, barHeight);
    // Right bar
    ctx.fillRect(centerX + gap / 2, centerY - barHeight / 2, barWidth, barHeight);

    ctx.restore();
}

/**
 * Check if a point is inside the weapon HUD panel.
 * @param {number} x - X coordinate in design space
 * @param {number} y - Y coordinate in design space
 * @returns {boolean} True if point is inside the weapon HUD
 */
function isInsideWeaponHUD(x, y) {
    const left = weaponHUD.x - weaponHUD.width;
    const right = weaponHUD.x;
    const top = weaponHUD.y;
    const bottom = weaponHUD.y + weaponHUD.height;
    return x >= left && x <= right && y >= top && y <= bottom;
}

/**
 * Render the weapon HUD panel.
 * Shows current weapon name and ammo count.
 * Clickable to cycle to next weapon.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderWeaponHUD(ctx) {
    if (!playerTank) return;

    const weapon = WeaponRegistry.getWeapon(playerTank.currentWeapon);
    if (!weapon) return;

    const ammo = playerTank.getAmmo(playerTank.currentWeapon);
    const ammoDisplay = ammo === Infinity ? '∞' : ammo;

    ctx.save();

    // Background panel
    const bgX = weaponHUD.x - weaponHUD.width;
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(bgX, weaponHUD.y, weaponHUD.width, weaponHUD.height, 6);
    ctx.fill();

    // Border with weapon-type color hint
    let borderColor = COLORS.NEON_CYAN;
    if (weapon.type === 'nuclear') {
        borderColor = COLORS.NEON_ORANGE;
    } else if (weapon.type === 'splitting') {
        borderColor = COLORS.NEON_PURPLE;
    } else if (weapon.type === 'rolling' || weapon.type === 'digging') {
        borderColor = COLORS.NEON_YELLOW;
    }
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Weapon name
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(weapon.name, weaponHUD.x - weaponHUD.padding, weaponHUD.y + 8);

    // Ammo count
    ctx.fillStyle = ammo === Infinity ? COLORS.TEXT_MUTED : COLORS.NEON_YELLOW;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillText(`Ammo: ${ammoDisplay}`, weaponHUD.x - weaponHUD.padding, weaponHUD.y + 28);

    // Click hint (subtle)
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL - 2}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText('◀ ▶', bgX + 8, weaponHUD.y + weaponHUD.height / 2 - 4);

    ctx.restore();
}

/**
 * Render the round and AI difficulty indicator.
 * Displayed below the wind indicator at the top-left.
 * Shows round number, AI difficulty, and money multiplier.
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 */
function renderRoundIndicator(ctx) {
    const difficulty = AI.getDifficulty();
    const difficultyName = AI.getDifficultyName(difficulty);
    const multiplier = Money.getMultiplier();

    // Position below wind indicator
    const x = 20;
    const y = 65; // Below wind indicator

    ctx.save();

    // Background pill
    const pillWidth = 160;
    const pillHeight = 24;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, pillWidth, pillHeight, 8);
    ctx.fill();

    // Round text
    ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`ROUND ${currentRound}`, x + 10, y + pillHeight / 2);

    // Difficulty text with color based on level
    let difficultyColor;
    switch (difficulty) {
        case 'easy':
            difficultyColor = '#00ff88'; // Green
            break;
        case 'medium':
            difficultyColor = '#ffff00'; // Yellow
            break;
        case 'hard':
            difficultyColor = '#ff4444'; // Red
            break;
        default:
            difficultyColor = COLORS.TEXT_MUTED;
    }

    ctx.fillStyle = difficultyColor;
    ctx.textAlign = 'right';
    ctx.fillText(difficultyName.toUpperCase(), x + pillWidth - 10, y + pillHeight / 2);

    ctx.restore();

    // Render money multiplier indicator below when above 1.0x
    if (multiplier > 1.0) {
        const bonusY = y + pillHeight + 5;
        const bonusPillWidth = 90;
        const bonusPillHeight = 20;

        ctx.save();

        // Background pill for bonus
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(x, bonusY, bonusPillWidth, bonusPillHeight, 6);
        ctx.fill();

        // Bonus text in gold/yellow color
        ctx.font = `bold ${UI.FONT_SIZE_SMALL - 2}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = '#ffd700'; // Gold color for money bonus
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${multiplier}x BONUS`, x + bonusPillWidth / 2, bonusY + bonusPillHeight / 2);

        ctx.restore();
    }
}

// =============================================================================
// MENU STATE
// =============================================================================

/**
 * Menu animation state for pulsing effects
 */
let menuAnimationTime = 0;

/**
 * Menu transition state for fade-in/fade-out effects
 */
const menuTransition = {
    active: false,
    fadeOut: false,
    startTime: 0,
    duration: 500,  // 500ms transition
    alpha: 1
};

/**
 * Button definitions for menu
 */
const menuButtons = {
    start: {
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 60,
        width: 280,
        height: 60,
        text: 'START GAME',
        color: COLORS.NEON_CYAN,
        enabled: true
    },
    options: {
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 140,
        width: 280,
        height: 60,
        text: 'OPTIONS',
        color: COLORS.NEON_PURPLE,
        enabled: true  // Enabled for volume controls
    }
};

// =============================================================================
// OPTIONS OVERLAY STATE
// =============================================================================

/**
 * Whether the options overlay (volume controls) is currently shown.
 * Can be shown from main menu or pause menu.
 * @type {boolean}
 */
let optionsOverlayVisible = false;

/**
 * State we were in before pausing (to return to on resume).
 * @type {string|null}
 */
let prePauseState = null;

/**
 * Check if a point is inside a menu button
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
 * Check if a point is inside the start button (backwards compatibility)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if point is inside button
 */
function isInsideStartButton(x, y) {
    return isInsideButton(x, y, menuButtons.start);
}

/**
 * Start menu fade-out transition, then change state
 * @param {string} targetState - State to transition to
 */
function startMenuTransition(targetState) {
    menuTransition.active = true;
    menuTransition.fadeOut = true;
    menuTransition.startTime = performance.now();
    menuTransition.targetState = targetState;
}

/**
 * Handle click on menu - check if buttons were clicked
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleMenuClick(pos) {
    if (Game.getState() !== GAME_STATES.MENU) return;
    if (menuTransition.active) return;  // Don't allow clicks during transition

    if (isInsideButton(pos.x, pos.y, menuButtons.start)) {
        // Play click sound
        Sound.playClickSound();
        // Start fade-out transition, then go to PLAYING state
        startMenuTransition(GAME_STATES.PLAYING);
    } else if (isInsideButton(pos.x, pos.y, menuButtons.options) && menuButtons.options.enabled) {
        // Play click sound
        Sound.playClickSound();
        // Show options overlay with volume controls
        optionsOverlayVisible = true;
        console.log('Options overlay opened');
    }
}

/**
 * Handle click on options overlay.
 * Passes clicks to volume controls or closes overlay if clicking outside.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 * @returns {boolean} True if click was handled
 */
function handleOptionsOverlayClick(pos) {
    if (!optionsOverlayVisible) return false;

    // Check if click is on volume controls
    if (VolumeControls.handlePointerDown(pos.x, pos.y)) {
        return true;
    }

    // Click outside panel - close overlay
    const panelDims = VolumeControls.getPanelDimensions();
    const panelX = CANVAS.DESIGN_WIDTH / 2 - panelDims.width / 2;
    const panelY = CANVAS.DESIGN_HEIGHT / 2 - panelDims.height / 2;

    const isInsidePanel = (
        pos.x >= panelX &&
        pos.x <= panelX + panelDims.width &&
        pos.y >= panelY &&
        pos.y <= panelY + panelDims.height
    );

    if (!isInsidePanel) {
        closeOptionsOverlay();
        return true;
    }

    return false;
}

/**
 * Close the options overlay.
 */
function closeOptionsOverlay() {
    optionsOverlayVisible = false;
    VolumeControls.reset();
    Sound.playClickSound();
    console.log('Options overlay closed');
}

/**
 * Render the synthwave background for the menu.
 * Creates a dramatic sunset gradient with grid lines.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderMenuBackground(ctx) {
    const width = CANVAS.DESIGN_WIDTH;
    const height = CANVAS.DESIGN_HEIGHT;
    const horizonY = height * 0.6;  // Horizon line at 60% down

    ctx.save();

    // Sky gradient (top to horizon)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGradient.addColorStop(0, '#0a0a1a');      // Dark blue at top
    skyGradient.addColorStop(0.4, '#1a0a2e');   // Deep purple
    skyGradient.addColorStop(0.7, '#2d1b4e');   // Purple
    skyGradient.addColorStop(0.9, '#ff2a6d');   // Neon pink near horizon
    skyGradient.addColorStop(1, '#ff6b35');     // Orange at horizon
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, horizonY);

    // Sun (semi-circle at horizon with horizontal scan lines for retro effect)
    const sunX = width / 2;
    const sunY = horizonY;
    const sunRadius = 120;

    // Sun gradient
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGradient.addColorStop(0, '#ffff88');
    sunGradient.addColorStop(0.3, '#ff8844');
    sunGradient.addColorStop(0.6, '#ff2a6d');
    sunGradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, Math.PI, 0, false);  // Top half of circle
    ctx.fillStyle = sunGradient;
    ctx.fill();

    // Sun scan lines (horizontal stripes across the sun for retro effect)
    ctx.globalCompositeOperation = 'destination-out';
    for (let y = sunY - sunRadius; y < sunY; y += 8) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(sunX - sunRadius, y, sunRadius * 2, 3);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Ground (below horizon) - dark with perspective grid
    const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
    groundGradient.addColorStop(0, '#1a0a2e');
    groundGradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Perspective grid lines
    ctx.strokeStyle = 'rgba(211, 0, 197, 0.4)';  // Purple grid
    ctx.lineWidth = 1;

    // Horizontal grid lines (closer together near horizon, further apart below)
    const numHorizontalLines = 15;
    for (let i = 0; i <= numHorizontalLines; i++) {
        // Use exponential spacing for perspective effect
        const t = i / numHorizontalLines;
        const y = horizonY + (height - horizonY) * Math.pow(t, 1.5);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Vertical grid lines (converge at horizon center)
    const numVerticalLines = 20;
    const vanishingPointX = width / 2;
    for (let i = 0; i <= numVerticalLines; i++) {
        const t = i / numVerticalLines;
        const bottomX = t * width;
        ctx.beginPath();
        ctx.moveTo(vanishingPointX, horizonY);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
    }

    // Add subtle stars in the sky
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const starSeed = 12345;  // Fixed seed for consistent star placement
    for (let i = 0; i < 50; i++) {
        // Pseudo-random but deterministic star positions
        const sx = ((starSeed * (i + 1) * 7) % width);
        const sy = ((starSeed * (i + 1) * 13) % (horizonY * 0.6));
        const sr = ((i % 3) + 1) * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Render a neon-styled menu button with glow effect
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button definition
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderMenuButton(ctx, button, pulseIntensity) {
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    const btnX = button.x - halfWidth;
    const btnY = button.y - halfHeight;

    ctx.save();

    // Determine if button is disabled
    const isDisabled = !button.enabled;
    const buttonColor = isDisabled ? COLORS.TEXT_MUTED : button.color;
    const glowIntensity = isDisabled ? 0 : pulseIntensity;

    // Button background with rounded corners
    ctx.fillStyle = isDisabled ? 'rgba(26, 26, 46, 0.5)' : 'rgba(26, 26, 46, 0.8)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, button.width, button.height, 8);
    ctx.fill();

    // Neon glow effect (pulsing)
    if (!isDisabled) {
        ctx.shadowColor = buttonColor;
        ctx.shadowBlur = 15 + glowIntensity * 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // Button border (neon outline)
    ctx.strokeStyle = buttonColor;
    ctx.lineWidth = isDisabled ? 2 : 3;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, button.width, button.height, 8);
    ctx.stroke();

    // Reset shadow for text
    ctx.shadowBlur = 0;

    // Button text with glow
    if (!isDisabled) {
        ctx.shadowColor = buttonColor;
        ctx.shadowBlur = 8 + glowIntensity * 5;
    }
    ctx.fillStyle = isDisabled ? COLORS.TEXT_MUTED : COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x, button.y);

    // Add "(Coming Soon)" for disabled buttons
    if (isDisabled) {
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText('(Coming Soon)', button.x, button.y + 35);
    }

    ctx.restore();
}

/**
 * Render the menu screen with full synthwave styling.
 * Features:
 * - Sunset gradient background with grid
 * - Neon title with glow effect
 * - Animated pulsing buttons
 * - Full-screen overlay
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderMenu(ctx) {
    // Update animation time
    menuAnimationTime += 16;  // Approximate 60fps frame time

    // Calculate pulse intensity for glowing effects (0-1, oscillating)
    const pulseIntensity = (Math.sin(menuAnimationTime * 0.003) + 1) / 2;

    ctx.save();

    // Update transition state
    if (menuTransition.active) {
        const elapsed = performance.now() - menuTransition.startTime;
        const progress = Math.min(elapsed / menuTransition.duration, 1);

        if (menuTransition.fadeOut) {
            menuTransition.alpha = 1 - progress;
        } else {
            menuTransition.alpha = progress;
        }

        // Apply fade alpha to entire menu
        ctx.globalAlpha = menuTransition.alpha;

        // Check if transition is complete
        if (progress >= 1 && menuTransition.fadeOut && menuTransition.targetState) {
            menuTransition.active = false;
            menuTransition.alpha = 1;
            Game.setState(menuTransition.targetState);
            ctx.restore();
            return;
        }
    }

    // Render synthwave background (visible behind everything)
    renderMenuBackground(ctx);

    // Semi-transparent overlay for menu content area
    const overlayGradient = ctx.createLinearGradient(0, 0, 0, CANVAS.DESIGN_HEIGHT);
    overlayGradient.addColorStop(0, 'rgba(10, 10, 26, 0.7)');
    overlayGradient.addColorStop(0.5, 'rgba(10, 10, 26, 0.3)');
    overlayGradient.addColorStop(1, 'rgba(10, 10, 26, 0.7)');
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Title with neon glow effect
    const titleY = CANVAS.DESIGN_HEIGHT / 3 - 20;

    // Title shadow/glow layers
    ctx.save();
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 30 + pulseIntensity * 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `bold 72px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.fillText('SCORCHED EARTH', CANVAS.DESIGN_WIDTH / 2, titleY);

    // Title outline for extra depth
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeText('SCORCHED EARTH', CANVAS.DESIGN_WIDTH / 2, titleY);
    ctx.restore();

    // Subtitle with different color glow
    ctx.save();
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 15 + pulseIntensity * 10;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE + 4}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.fillText('SYNTHWAVE EDITION', CANVAS.DESIGN_WIDTH / 2, titleY + 55);
    ctx.restore();

    // Render menu buttons
    renderMenuButton(ctx, menuButtons.start, pulseIntensity);
    renderMenuButton(ctx, menuButtons.options, pulseIntensity);

    // Instructions text at bottom
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Click or tap START GAME to begin', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 80);
    ctx.fillText('Press D to toggle debug mode', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 55);

    // Decorative line under title
    ctx.save();
    ctx.strokeStyle = COLORS.NEON_PURPLE;
    ctx.shadowColor = COLORS.NEON_PURPLE;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const lineWidth = 200;
    ctx.moveTo(CANVAS.DESIGN_WIDTH / 2 - lineWidth, titleY + 80);
    ctx.lineTo(CANVAS.DESIGN_WIDTH / 2 + lineWidth, titleY + 80);
    ctx.stroke();
    ctx.restore();

    // Neon frame around the screen
    ctx.save();
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, CANVAS.DESIGN_WIDTH - 40, CANVAS.DESIGN_HEIGHT - 40);

    // Corner accents
    const cornerSize = 30;
    ctx.strokeStyle = COLORS.NEON_PINK;
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.lineWidth = 4;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(20, 20 + cornerSize);
    ctx.lineTo(20, 20);
    ctx.lineTo(20 + cornerSize, 20);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH - 20 - cornerSize, 20);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 20, 20);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 20, 20 + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(20, CANVAS.DESIGN_HEIGHT - 20 - cornerSize);
    ctx.lineTo(20, CANVAS.DESIGN_HEIGHT - 20);
    ctx.lineTo(20 + cornerSize, CANVAS.DESIGN_HEIGHT - 20);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS.DESIGN_WIDTH - 20 - cornerSize, CANVAS.DESIGN_HEIGHT - 20);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 20, CANVAS.DESIGN_HEIGHT - 20);
    ctx.lineTo(CANVAS.DESIGN_WIDTH - 20, CANVAS.DESIGN_HEIGHT - 20 - cornerSize);
    ctx.stroke();

    ctx.restore();

    ctx.restore();

    // Render options overlay on top if visible
    if (optionsOverlayVisible) {
        renderOptionsOverlay(ctx);
    }

    // Render CRT effects as final post-processing overlay
    renderCrtEffects(ctx, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
}

/**
 * Render the options overlay with volume controls.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderOptionsOverlay(ctx) {
    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Render volume controls panel
    VolumeControls.render(ctx);

    // Close hint at bottom
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Press ESC or click outside to close', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 30);

    ctx.restore();
}

/**
 * Setup menu state handlers
 */
function setupMenuState() {
    // Register menu state handlers
    Game.registerStateHandlers(GAME_STATES.MENU, {
        onEnter: (fromState) => {
            console.log('Entered MENU state');
            // Play menu music
            Music.playForState(GAME_STATES.MENU);
        },
        onExit: (toState) => {
            console.log('Exiting MENU state');
            // Close options overlay if open
            if (optionsOverlayVisible) {
                optionsOverlayVisible = false;
                VolumeControls.reset();
            }
        },
        render: renderMenu
    });

    // Register click handler for menu interactions
    // Note: onMouseDown callback receives (x, y, button) - coordinates first
    Input.onMouseDown((x, y, button) => {
        if (Game.getState() !== GAME_STATES.MENU) return;

        // Check options overlay first
        if (optionsOverlayVisible) {
            handleOptionsOverlayClick({ x, y });
            return;
        }

        handleMenuClick({ x, y });
    });

    // Register touch handler for menu interactions
    Input.onTouchStart((x, y) => {
        if (Game.getState() !== GAME_STATES.MENU) return;

        // Check options overlay first
        if (optionsOverlayVisible) {
            handleOptionsOverlayClick({ x, y });
            return;
        }

        handleMenuClick({ x, y });
    });

    // Register pointer move for slider dragging
    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.MENU && optionsOverlayVisible) {
            VolumeControls.handlePointerMove(x, y);
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.MENU && optionsOverlayVisible) {
            VolumeControls.handlePointerMove(x, y);
        }
    });

    // Register pointer up to end slider dragging
    Input.onMouseUp((x, y, button) => {
        if (Game.getState() === GAME_STATES.MENU && optionsOverlayVisible) {
            VolumeControls.handlePointerUp();
        }
    });

    Input.onTouchEnd((x, y) => {
        if (Game.getState() === GAME_STATES.MENU && optionsOverlayVisible) {
            VolumeControls.handlePointerUp();
        }
    });

    // Also handle keyboard - Space or Enter to start, Escape to close options
    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.MENU) {
            // Escape closes options overlay
            if (keyCode === 'Escape' && optionsOverlayVisible) {
                closeOptionsOverlay();
                return;
            }

            // Space/Enter starts game (only if options not open)
            if (!optionsOverlayVisible && (keyCode === 'Space' || keyCode === 'Enter')) {
                Game.setState(GAME_STATES.PLAYING);
            }
        }
    });
}

// =============================================================================
// PLAYING STATE
// =============================================================================

/**
 * Fire a projectile from the specified tank.
 * Creates a new projectile and adds it to the active projectiles array.
 * Consumes ammo for the current weapon.
 *
 * @param {import('./tank.js').Tank} tank - The tank firing the projectile
 * @returns {boolean} True if projectile was fired, false if no ammo
 */
function fireProjectile(tank) {
    if (!tank) return false;

    // Update tank's angle/power from player aim if it's the player tank
    if (tank === playerTank) {
        tank.angle = playerAim.angle;
        tank.power = playerAim.power;
    }

    // IMPORTANT: Capture the weapon ID BEFORE consuming ammo
    // consumeAmmo() will switch to basic-shot if the current weapon runs out,
    // but we want to fire the weapon that was actually selected
    const firedWeaponId = tank.currentWeapon;

    // Consume ammo - if tank has no ammo for current weapon, this returns false
    // The tank will auto-switch to basic-shot if current weapon runs out
    if (!tank.consumeAmmo()) {
        console.warn(`${tank.team} tank cannot fire: no ammo for ${tank.currentWeapon}`);
        return false;
    }

    // Get weapon info for logging (use the weapon that was fired, not current)
    const weapon = WeaponRegistry.getWeapon(firedWeaponId);
    const ammoRemaining = tank.getAmmo(firedWeaponId);
    const ammoDisplay = ammoRemaining === Infinity ? '∞' : ammoRemaining;

    // Create projectile from tank's barrel position with the fired weapon
    // We need to temporarily set the weapon back for createProjectileFromTank
    const postFireWeapon = tank.currentWeapon;
    tank.currentWeapon = firedWeaponId;
    const projectile = createProjectileFromTank(tank);
    tank.currentWeapon = postFireWeapon; // Restore to post-fire weapon (may be basic-shot)

    activeProjectiles = [projectile]; // Clear and set new projectile

    // Play fire sound
    Sound.playFireSound();

    console.log(`Projectile fired from ${tank.team} at angle ${tank.angle}°, power ${tank.power}% (${weapon ? weapon.name : firedWeaponId}, ammo: ${ammoDisplay})`);
    return true;
}

/**
 * Handle a single projectile's explosion (on terrain or tank hit).
 * Creates crater, applies damage, updates tank positions.
 * Triggers special effects for nuclear weapons.
 *
 * @param {import('./projectile.js').Projectile} projectile - The projectile that exploded
 * @param {{x: number, y: number}} pos - Impact position
 * @param {import('./tank.js').Tank|null} directHitTank - Tank that was directly hit, or null for terrain hit
 */
function handleProjectileExplosion(projectile, pos, directHitTank) {
    const weaponId = projectile.weaponId;
    const weapon = WeaponRegistry.getWeapon(weaponId);
    const blastRadius = weapon ? weapon.blastRadius : 30;
    const isNuclear = weapon && weapon.type === WEAPON_TYPES.NUCLEAR;

    const explosion = {
        x: pos.x,
        y: pos.y,
        blastRadius: blastRadius
    };

    // Track who fired this projectile for money awards
    const isPlayerShot = projectile.owner === 'player';

    if (directHitTank) {
        // Apply explosion damage to the directly hit tank
        const damageResult = applyExplosionDamage(explosion, directHitTank, weapon);

        // Award money if player hit the enemy tank
        if (isPlayerShot && directHitTank.team === 'enemy' && damageResult.actualDamage > 0) {
            Money.awardHitReward(damageResult.actualDamage);
        }

        // Also check for splash damage to other tanks
        const allTanks = [playerTank, enemyTank].filter(t => t !== null && t !== directHitTank);
        const splashResults = applyExplosionToAllTanks(explosion, allTanks, weapon);

        // Award money for splash damage on enemy if player shot
        if (isPlayerShot) {
            for (const result of splashResults) {
                if (result.tank.team === 'enemy' && result.actualDamage > 0) {
                    Money.awardHitReward(result.actualDamage);
                }
            }
        }

        console.log(`Tank hit! ${directHitTank.team} took ${damageResult.actualDamage} damage${damageResult.isDirectHit ? ' (DIRECT HIT!)' : ''}, health: ${directHitTank.health}`);
    } else {
        // Apply splash damage to all tanks near the explosion
        const allTanks = [playerTank, enemyTank].filter(t => t !== null);
        const damageResults = applyExplosionToAllTanks(explosion, allTanks, weapon);

        // Award money for any damage on enemy if player shot
        if (isPlayerShot) {
            for (const result of damageResults) {
                if (result.tank.team === 'enemy' && result.actualDamage > 0) {
                    Money.awardHitReward(result.actualDamage);
                }
            }
        }

        for (const result of damageResults) {
            console.log(`Splash damage: ${result.tank.team} tank took ${result.actualDamage} damage, health: ${result.tank.health}`);
        }
    }

    // Trigger explosion visual effect for all weapons (before terrain destruction)
    // Nuclear weapons get longer duration and special mushroom cloud
    const explosionDuration = isNuclear ? 800 : 400;
    explosionEffect = {
        active: true,
        x: pos.x,
        y: pos.y,
        radius: blastRadius,
        startTime: performance.now(),
        duration: explosionDuration,
        isNuclear: isNuclear,
        hasMushroomCloud: weapon?.mushroomCloud || false
    };

    // Spawn explosion particles
    spawnExplosionParticles(pos.x, pos.y, blastRadius, isNuclear);

    // Screen shake for ALL weapons (intensity/duration based on blast radius)
    // Smaller weapons get subtle shakes, larger weapons get dramatic shakes
    screenShakeForBlastRadius(blastRadius);

    // Destroy terrain
    if (currentTerrain) {
        destroyTerrainAt(pos.x, pos.y, blastRadius);

        // Update tank positions to match new terrain height
        if (playerTank && currentTerrain) {
            updateTankTerrainPosition(playerTank, currentTerrain);
        }
        if (enemyTank && currentTerrain) {
            updateTankTerrainPosition(enemyTank, currentTerrain);
        }
    }

    // Nuclear weapon special effects (flash only - shake handled above for all weapons)
    if (isNuclear) {
        console.log(`Nuclear explosion at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) - ${weapon.name}`);

        // Screen flash effect (white flash) - triggers for nuclear weapons only
        if (weapon.screenFlash) {
            screenFlash('white', 300);
        }

        // Play nuclear explosion sound
        Sound.playNuclearExplosionSound(blastRadius);
    } else {
        // Standard explosion sound for non-nuclear weapons
        Sound.playExplosionSound(blastRadius);
    }

    // Play hit or miss sound based on whether a tank was hit
    if (directHitTank) {
        // Tank was directly hit - play metallic hit sound
        Sound.playHitSound();
    } else {
        // Terrain hit only - play dull thud miss sound
        Sound.playMissSound();
    }
}

/**
 * Update all active projectiles - physics, collisions, splitting, rolling, and digging.
 * Called each frame during projectile flight.
 *
 * Handles different weapon types:
 * - MIRV/Splitting: Split into multiple warheads at apex
 * - Rolling: Enter rolling mode on terrain contact, follow terrain contour
 * - Digging: Tunnel through terrain, explode on tank or after distance
 * - Standard: Explode on terrain or tank contact
 */
function updateProjectile() {
    if (activeProjectiles.length === 0) return;

    const tanks = [playerTank, enemyTank].filter(t => t !== null);
    const newChildren = [];
    const toRemove = [];

    // Update each projectile
    for (const projectile of activeProjectiles) {
        if (!projectile.isActive()) {
            toRemove.push(projectile);
            continue;
        }

        // Handle digging projectiles
        if (projectile.isDigging) {
            // Update digging physics
            const digResult = projectile.updateDigging(currentTerrain, tanks);

            if (digResult && digResult.explode) {
                console.log(`Digger exploded: ${digResult.reason} at (${projectile.x.toFixed(1)}, ${projectile.y.toFixed(1)})`);
                const hitTank = digResult.hitTank || null;
                handleProjectileExplosion(projectile, projectile.getPosition(), hitTank);
                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }

            // If digger emerged from terrain, continue with normal physics next frame
            if (!projectile.isDigging) {
                // Digger emerged - will continue with normal flight physics
                console.log('Digger emerged and resuming flight');
            }

            continue; // Skip normal physics for digging projectiles
        }

        // Handle rolling projectiles differently
        if (projectile.isRolling) {
            // Check for tank collision while rolling
            const pos = projectile.getPosition();
            const tankHit = checkTankCollision(pos.x, pos.y, tanks);
            if (tankHit) {
                const { tank } = tankHit;
                console.log(`Roller hit ${tank.team} tank!`);
                handleProjectileExplosion(projectile, pos, tank);
                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }

            // Update rolling physics
            const rollResult = projectile.updateRolling(currentTerrain);
            if (rollResult && rollResult.explode) {
                console.log(`Roller exploded: ${rollResult.reason} at (${projectile.x.toFixed(1)}, ${projectile.y.toFixed(1)})`);
                handleProjectileExplosion(projectile, projectile.getPosition(), null);
                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }

            // Check for tank collision again after moving
            const newPos = projectile.getPosition();
            const tankHitAfterMove = checkTankCollision(newPos.x, newPos.y, tanks);
            if (tankHitAfterMove) {
                const { tank } = tankHitAfterMove;
                console.log(`Roller hit ${tank.team} tank after moving!`);
                handleProjectileExplosion(projectile, newPos, tank);
                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }

            continue; // Skip normal physics for rolling projectiles
        }

        // Update projectile physics with current wind force (for non-rolling projectiles)
        projectile.update(Wind.getWindForce());

        // Check if projectile went out of bounds
        if (!projectile.isActive()) {
            projectile.clearTrail();
            toRemove.push(projectile);
            continue;
        }

        // Check for MIRV splitting at apex
        if (projectile.shouldSplit()) {
            console.log(`Projectile at apex - splitting!`);

            // Create child projectiles
            const children = createSplitProjectiles(projectile);
            newChildren.push(...children);

            // Create split effect for visual feedback
            const pos = projectile.getPosition();
            splitEffect = {
                active: true,
                x: pos.x,
                y: pos.y,
                startTime: performance.now(),
                duration: 300 // 300ms flash effect
            };

            // Mark parent as split and deactivate
            projectile.markSplit();
            projectile.deactivate();
            projectile.clearTrail();
            toRemove.push(projectile);
            continue;
        }

        const pos = projectile.getPosition();

        // Check for tank collision
        const tankHit = checkTankCollision(pos.x, pos.y, tanks);
        if (tankHit) {
            const { tank } = tankHit;
            handleProjectileExplosion(projectile, pos, tank);

            projectile.deactivate();
            projectile.clearTrail();
            toRemove.push(projectile);
            continue;
        }

        // Check for terrain collision
        if (currentTerrain) {
            const collision = currentTerrain.checkTerrainCollision(pos.x, pos.y);

            if (collision && collision.hit) {
                // Check if this is a rolling weapon that should enter rolling mode
                if (projectile.shouldRoll()) {
                    console.log(`Roller hit terrain at (${collision.x}, ${collision.y.toFixed(1)}) - starting roll!`);
                    projectile.startRolling(collision.y);
                    continue; // Continue to next frame, don't explode yet
                }

                // Check if this is a digging weapon that should enter digging mode
                if (projectile.shouldDig()) {
                    console.log(`Digger hit terrain at (${collision.x}, ${collision.y.toFixed(1)}) - starting dig!`);
                    projectile.startDigging(pos.x, collision.y);
                    continue; // Continue to next frame, don't explode yet
                }

                // Standard weapon - explode on terrain contact
                console.log(`Projectile hit terrain at (${collision.x}, ${collision.y.toFixed(1)})`);
                handleProjectileExplosion(projectile, pos, null);

                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }
        }
    }

    // Remove destroyed projectiles
    for (const projectile of toRemove) {
        const index = activeProjectiles.indexOf(projectile);
        if (index !== -1) {
            activeProjectiles.splice(index, 1);
        }
    }

    // Add new child projectiles
    activeProjectiles.push(...newChildren);

    // Check if all projectiles are resolved
    if (activeProjectiles.length === 0) {
        // Check if a tank was destroyed before transitioning to next turn
        checkRoundEnd();
    }
}

/**
 * Check if the round has ended (one tank destroyed).
 * Transitions to VICTORY or DEFEAT state if so, otherwise continues to next turn.
 */
function checkRoundEnd() {
    const playerDestroyed = playerTank && playerTank.health <= 0;
    const enemyDestroyed = enemyTank && enemyTank.health <= 0;

    if (enemyDestroyed) {
        // Player wins!
        console.log('[Main] Enemy destroyed - VICTORY!');

        // Award victory bonus (hit rewards already given during combat)
        Money.awardVictoryBonus();

        // Get total round earnings for display
        const roundEarnings = Money.getRoundEarnings();
        const roundDamage = Money.getRoundDamage();

        // Show victory screen after short delay
        VictoryDefeat.showVictory(roundEarnings, roundDamage, 1200);

        // Transition to victory state
        Game.setState(GAME_STATES.VICTORY);
        return;
    }

    if (playerDestroyed) {
        // Player loses
        console.log('[Main] Player destroyed - DEFEAT!');

        // Award consolation prize
        Money.awardDefeatConsolation();

        // Get total round earnings for display
        const roundEarnings = Money.getRoundEarnings();
        const roundDamage = Money.getRoundDamage();

        // Show defeat screen after short delay
        VictoryDefeat.showDefeat(roundEarnings, roundDamage, 1200);

        // Transition to defeat state
        Game.setState(GAME_STATES.DEFEAT);
        return;
    }

    // No one destroyed - continue to next turn
    Turn.projectileResolved();
}

/**
 * Update the playing state - handle turn-based logic
 * @param {number} deltaTime - Time since last frame in ms
 */
function updatePlaying(deltaTime) {
    const phase = Turn.getPhase();

    // Handle AI turn using the AI module
    if (phase === TURN_PHASES.AI_AIM) {
        // Start AI turn if not already active
        if (!AI.isTurnActive() && enemyTank && playerTank) {
            // Pass terrain for Hard AI's iterative solver and strategic weapon selection
            AI.startTurn(enemyTank, playerTank, Wind.getWind(), currentTerrain);
        }

        // Animate turret and power during thinking phase
        const animatedAim = AI.getAnimatedAim();
        if (animatedAim && enemyTank) {
            // Apply animated values for visual feedback
            enemyTank.angle = animatedAim.angle;
            enemyTank.power = animatedAim.power;
        }

        // Update AI turn and check if ready to fire
        const aiResult = AI.updateTurn();
        if (aiResult && aiResult.ready && enemyTank) {
            // Apply AI's final calculated aim to the enemy tank
            enemyTank.angle = aiResult.angle;
            enemyTank.power = aiResult.power;
            enemyTank.setWeapon(aiResult.weapon);

            // Fire!
            Turn.aiFire();
            fireProjectile(enemyTank);
        }
    }

    // Handle projectile flight - update physics
    if (phase === TURN_PHASES.PROJECTILE_FLIGHT) {
        updateProjectile();
    }
}

// =============================================================================
// TERRAIN RENDERING
// =============================================================================

/**
 * Terrain fill color - dark purple per spec
 */
const TERRAIN_FILL_COLOR = '#1a0a2e';

/**
 * Terrain edge stroke color - neon pink per spec
 */
const TERRAIN_EDGE_COLOR = '#ff2a6d';

/**
 * Render the terrain as a filled polygon with synthwave styling.
 * Terrain heights are stored as distance from bottom, so we need to flip Y
 * since canvas Y=0 is at the top.
 *
 * Rendering approach (efficient - no per-pixel operations):
 * 1. Build a single path for the terrain polygon
 * 2. Fill with solid dark purple color
 * 3. Draw neon pink edge with glow effect using shadow blur
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderTerrain(ctx) {
    if (!currentTerrain) return;

    const terrain = currentTerrain;
    const width = terrain.getWidth();

    // Build terrain path once and reuse for fill and stroke
    ctx.beginPath();

    // Start at bottom-left corner
    ctx.moveTo(0, CANVAS.DESIGN_HEIGHT);

    // Draw terrain profile
    // Heights are distance from bottom, so canvas Y = DESIGN_HEIGHT - terrainHeight
    for (let x = 0; x < width; x++) {
        const terrainHeight = terrain.getHeight(x);
        const canvasY = CANVAS.DESIGN_HEIGHT - terrainHeight;
        ctx.lineTo(x, canvasY);
    }

    // Close the path at bottom-right corner
    ctx.lineTo(width - 1, CANVAS.DESIGN_HEIGHT);
    ctx.closePath();

    // Fill terrain with solid dark purple
    ctx.fillStyle = TERRAIN_FILL_COLOR;
    ctx.fill();

    // Draw terrain edge with neon glow effect
    // Use shadow blur for the glow effect - more performant than gradient
    ctx.save();

    // Create glow effect using shadow
    ctx.shadowColor = TERRAIN_EDGE_COLOR;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw neon pink edge stroke
    ctx.strokeStyle = TERRAIN_EDGE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
        const terrainHeight = terrain.getHeight(x);
        const canvasY = CANVAS.DESIGN_HEIGHT - terrainHeight;
        if (x === 0) {
            ctx.moveTo(x, canvasY);
        } else {
            ctx.lineTo(x, canvasY);
        }
    }
    ctx.stroke();

    ctx.restore();
}

// =============================================================================
// TANK RENDERING
// =============================================================================

/**
 * Render a single tank.
 * First attempts to render sprite assets if available.
 * Falls back to geometric placeholder (64x24 body with rotating turret).
 *
 * Placeholder consists of:
 * - A rectangular body (dark fill with neon outline, 64x24)
 * - A circular turret base
 * - A turret barrel pointing at the current angle
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - The tank to render
 */
function renderTank(ctx, tank) {
    if (!tank) return;

    const { x, y, team, angle } = tank;

    // Try to use sprite asset if available
    const spriteKey = team === 'player' ? 'tanks.player' : 'tanks.enemy';
    const sprite = Assets.get(spriteKey);

    // If sprite is loaded and is a real image (not a placeholder), render it
    // Note: Placeholder images have diagonal lines and are generated by assets.js
    // For now, we always use geometric rendering since sprites aren't ready yet
    // When sprites are available, this will automatically use them
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        // Check if this is a real sprite or generated placeholder
        // Real sprites would be loaded from actual image files
        // For now, render geometric placeholder until proper sprites exist
        // This check can be refined when actual sprite assets are added
        const isRealSprite = !sprite.src.startsWith('data:'); // Placeholders use data URLs

        if (isRealSprite) {
            renderTankSprite(ctx, tank, sprite);
            return;
        }
    }

    // Fall back to geometric placeholder rendering
    renderTankPlaceholder(ctx, tank);
}

/**
 * Render tank using sprite asset.
 * The sprite is drawn centered at the tank position.
 * Turret rotation is handled separately (sprites are static bodies).
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - The tank to render
 * @param {HTMLImageElement} sprite - The tank sprite image
 */
function renderTankSprite(ctx, tank, sprite) {
    const { x, y, team, angle } = tank;

    ctx.save();

    // Draw sprite centered at tank position
    // Sprite bottom aligns with tank.y (terrain surface)
    const spriteX = x - sprite.width / 2;
    const spriteY = y - sprite.height;

    ctx.drawImage(sprite, spriteX, spriteY);

    // Draw turret barrel on top of sprite
    // Turret pivot point is at center-top of tank
    const outlineColor = team === 'player' ? COLORS.NEON_CYAN : COLORS.NEON_PINK;
    const turretPivotX = x;
    const turretPivotY = y - sprite.height;

    // Apply glow effect to turret
    ctx.shadowColor = outlineColor;
    ctx.shadowBlur = 8;

    // Convert angle to radians (0° = right, 90° = up, 180° = left)
    const radians = (angle * Math.PI) / 180;
    const barrelEndX = turretPivotX + Math.cos(radians) * TANK.TURRET_LENGTH;
    const barrelEndY = turretPivotY - Math.sin(radians) * TANK.TURRET_LENGTH;

    ctx.beginPath();
    ctx.moveTo(turretPivotX, turretPivotY);
    ctx.lineTo(barrelEndX, barrelEndY);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = TANK.TURRET_WIDTH;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
}

/**
 * Render tank as geometric placeholder.
 * Body is 64x24 rectangle with neon outline.
 * Player tank is cyan (#05d9e8), enemy is pink (#ff2a6d).
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - The tank to render
 */
function renderTankPlaceholder(ctx, tank) {
    const { x, y, team, angle } = tank;

    // Choose colors based on team
    // Body fill is dark with team-tinted hue
    // Outline is full neon color for visibility
    const bodyColor = team === 'player' ? '#0a1a2a' : '#2a0a1a';
    const outlineColor = team === 'player' ? COLORS.NEON_CYAN : COLORS.NEON_PINK;

    ctx.save();

    // Tank body dimensions (64x24 per spec)
    const bodyWidth = TANK.WIDTH;
    const bodyHeight = TANK.BODY_HEIGHT;

    // Tank body is centered horizontally at x, bottom at y
    const bodyX = x - bodyWidth / 2;
    const bodyY = y - bodyHeight;

    // Apply neon glow effect to all tank elements
    ctx.shadowColor = outlineColor;
    ctx.shadowBlur = 8;

    // Draw tank body fill
    ctx.fillStyle = bodyColor;
    ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);

    // Draw tank body outline (neon edge)
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(bodyX, bodyY, bodyWidth, bodyHeight);

    // Turret pivot point (center-top of tank body)
    const turretPivotX = x;
    const turretPivotY = y - bodyHeight;

    // Draw turret base (circular pivot point)
    const turretBaseRadius = 8;
    ctx.beginPath();
    ctx.arc(turretPivotX, turretPivotY, turretBaseRadius, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw turret barrel
    // Angle convention: 0° = right, 90° = up, 180° = left
    const radians = (angle * Math.PI) / 180;
    const barrelEndX = turretPivotX + Math.cos(radians) * TANK.TURRET_LENGTH;
    const barrelEndY = turretPivotY - Math.sin(radians) * TANK.TURRET_LENGTH; // Negative because canvas Y is inverted

    ctx.beginPath();
    ctx.moveTo(turretPivotX, turretPivotY);
    ctx.lineTo(barrelEndX, barrelEndY);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = TANK.TURRET_WIDTH;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
}

/**
 * Render all tanks in the game.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderTanks(ctx) {
    renderTank(ctx, playerTank);
    renderTank(ctx, enemyTank);
}

// =============================================================================
// PROJECTILE RENDERING
// =============================================================================

/**
 * Projectile visual constants
 * Per spec: 8px diameter glowing circle in bright yellow (#f9f002)
 */
const PROJECTILE_VISUAL = {
    DIAMETER: 8,
    COLOR: '#f9f002',  // Bright yellow/white per spec
    GLOW_COLOR: '#f9f002',
    GLOW_BLUR: 12
};

/**
 * Convert a hex color string to RGB values.
 * @param {string} hex - Hex color (e.g., '#ff00ff')
 * @returns {{r: number, g: number, b: number}} RGB values
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 249, g: 240, b: 2 }; // Default to yellow if parsing fails
}

/**
 * Render the projectile trail with fading effect.
 * Trail positions fade from transparent (oldest) to semi-opaque (newest).
 * Each trail point is rendered as a smaller, fading circle.
 * Uses weapon-specific trail colors for distinct visual appearance.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./projectile.js').Projectile} projectile - The projectile to render trail for
 */
function renderProjectileTrail(ctx, projectile) {
    const trail = projectile.getTrail();
    if (trail.length === 0) return;

    ctx.save();

    // Get weapon-specific trail color (defaults to yellow if not specified)
    const weapon = WeaponRegistry.getWeapon(projectile.weaponId);
    const trailColor = weapon?.trailColor || PROJECTILE_VISUAL.GLOW_COLOR;
    const rgb = hexToRgb(trailColor);

    // Trail circles are smaller than the main projectile
    const trailRadius = PROJECTILE_VISUAL.DIAMETER / 4;

    // Render each trail position with fading opacity
    // Oldest positions (index 0) are most transparent, newest are most opaque
    for (let i = 0; i < trail.length; i++) {
        const pos = trail[i];

        // Calculate opacity: oldest = 0.1, newest = 0.7
        // Uses exponential falloff for more natural fade effect
        const progress = i / trail.length;
        const alpha = 0.1 + progress * 0.6;

        // Add subtle glow to trail (using weapon-specific color)
        ctx.shadowColor = trailColor;
        ctx.shadowBlur = 4 + progress * 4;

        // Draw trail circle with weapon-specific color
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, trailRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Render the projectile as a glowing circle or rotating roller.
 * Per spec: 8px diameter circle with glow effect.
 * Uses weapon-specific projectile colors for distinct visual appearance.
 * Rolling projectiles show a rotating visual effect.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./projectile.js').Projectile} projectile - The projectile to render
 */
function renderProjectile(ctx, projectile) {
    if (!projectile || !projectile.isActive()) return;

    const { x, y } = projectile.getPosition();
    const radius = PROJECTILE_VISUAL.DIAMETER / 2;

    // Get weapon-specific projectile color (defaults to yellow if not specified)
    const weapon = WeaponRegistry.getWeapon(projectile.weaponId);
    const projectileColor = weapon?.projectileColor || PROJECTILE_VISUAL.COLOR;
    const rgb = hexToRgb(projectileColor);

    ctx.save();

    // Apply glow effect using shadow blur
    // This creates the "glowing" synthwave effect
    ctx.shadowColor = projectileColor;
    ctx.shadowBlur = PROJECTILE_VISUAL.GLOW_BLUR;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw outer glow layer (slightly larger, more transparent)
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
    ctx.fill();

    // Draw main projectile circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = projectileColor;
    ctx.fill();

    // For rolling projectiles, show rotation visual instead of static core
    if (projectile.isRolling) {
        // Draw rotating line pattern to show rolling motion
        const rotation = projectile.getRollRotation();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Draw a cross pattern inside the circle to show rotation
        ctx.beginPath();
        ctx.moveTo(-radius * 0.7, 0);
        ctx.lineTo(radius * 0.7, 0);
        ctx.moveTo(0, -radius * 0.7);
        ctx.lineTo(0, radius * 0.7);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    } else if (projectile.isDigging) {
        // Digging projectiles show a drill-like visual with pulsing effect
        // Darker, more muted appearance to indicate underground
        const digProgress = (projectile.getDigDistance() % 20) / 20; // Cycle every 20px
        const pulseAlpha = 0.5 + 0.5 * Math.sin(digProgress * Math.PI * 2);

        // Draw drill tip (triangle pointing in dig direction)
        ctx.save();
        ctx.translate(x, y);

        // Rotate to face dig direction
        const digAngle = Math.atan2(projectile.digDirection.y, projectile.digDirection.x);
        ctx.rotate(digAngle);

        // Draw drill bit shape
        ctx.beginPath();
        ctx.moveTo(radius * 1.5, 0); // Tip
        ctx.lineTo(-radius * 0.5, -radius * 0.8);
        ctx.lineTo(-radius * 0.5, radius * 0.8);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 140, 0, ${pulseAlpha})`; // Orange with pulse
        ctx.fill();

        // Draw core (dimmer)
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 100, ${0.3 + pulseAlpha * 0.3})`;
        ctx.fill();

        ctx.restore();
    } else {
        // Draw bright inner core for extra glow effect (non-rolling projectiles)
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';  // White hot center
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Render the MIRV split effect (expanding flash/ring).
 * Creates a visual feedback when MIRV splits into multiple warheads.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderSplitEffect(ctx) {
    if (!splitEffect || !splitEffect.active) return;

    const elapsed = performance.now() - splitEffect.startTime;
    if (elapsed > splitEffect.duration) {
        splitEffect = null;
        return;
    }

    const progress = elapsed / splitEffect.duration;
    const { x, y } = splitEffect;

    ctx.save();

    // Expanding ring effect
    const maxRadius = 50;
    const radius = maxRadius * progress;
    const alpha = 1 - progress; // Fade out as it expands

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(249, 240, 2, ${alpha * 0.8})`; // Yellow
    ctx.lineWidth = 4 * (1 - progress * 0.5);
    ctx.shadowColor = '#f9f002';
    ctx.shadowBlur = 20 * alpha;
    ctx.stroke();

    // Inner bright flash (fades faster)
    if (progress < 0.3) {
        const flashAlpha = 1 - (progress / 0.3);
        ctx.beginPath();
        ctx.arc(x, y, 15 * (1 - progress), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Render the explosion effect (expanding fireball/ring).
 * Nuclear weapons have larger, more dramatic explosions with mushroom clouds.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderExplosionEffect(ctx) {
    if (!explosionEffect || !explosionEffect.active) return;

    const elapsed = performance.now() - explosionEffect.startTime;
    if (elapsed > explosionEffect.duration) {
        explosionEffect = null;
        return;
    }

    const progress = elapsed / explosionEffect.duration;
    const { x, y, radius, isNuclear, hasMushroomCloud } = explosionEffect;

    ctx.save();

    if (isNuclear) {
        // Nuclear explosion - more dramatic multi-ring effect

        // Phase 1: Initial bright flash (0-20%)
        if (progress < 0.2) {
            const flashProgress = progress / 0.2;
            const flashAlpha = 1 - flashProgress;
            const flashRadius = radius * 0.5 * (1 + flashProgress);

            // Bright white center
            ctx.beginPath();
            ctx.arc(x, y, flashRadius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, flashRadius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
            gradient.addColorStop(0.5, `rgba(255, 200, 100, ${flashAlpha * 0.8})`);
            gradient.addColorStop(1, `rgba(255, 100, 50, 0)`);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Phase 2: Expanding fireball (0-60%)
        if (progress < 0.6) {
            const fireProgress = progress / 0.6;
            const fireRadius = radius * fireProgress;
            const fireAlpha = 1 - fireProgress * 0.5;

            // Orange/red fireball
            ctx.beginPath();
            ctx.arc(x, y, fireRadius, 0, Math.PI * 2);
            const fireGradient = ctx.createRadialGradient(x, y, 0, x, y, fireRadius);
            fireGradient.addColorStop(0, `rgba(255, 150, 50, ${fireAlpha})`);
            fireGradient.addColorStop(0.4, `rgba(255, 100, 30, ${fireAlpha * 0.7})`);
            fireGradient.addColorStop(0.7, `rgba(200, 50, 20, ${fireAlpha * 0.4})`);
            fireGradient.addColorStop(1, `rgba(100, 20, 10, 0)`);
            ctx.fillStyle = fireGradient;
            ctx.fill();
        }

        // Phase 3: Expanding shockwave ring (20-100%)
        if (progress > 0.1) {
            const ringProgress = (progress - 0.1) / 0.9;
            const ringRadius = radius * 1.5 * ringProgress;
            const ringAlpha = 1 - ringProgress;

            ctx.beginPath();
            ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 100, ${ringAlpha * 0.6})`;
            ctx.lineWidth = 8 * (1 - ringProgress);
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 30 * ringAlpha;
            ctx.stroke();
        }

        // Mushroom cloud effect for the big nuke (40-100%)
        if (hasMushroomCloud && progress > 0.3) {
            const cloudProgress = (progress - 0.3) / 0.7;
            const cloudAlpha = 0.6 * (1 - cloudProgress);

            // Rising smoke column
            const columnHeight = radius * 2 * cloudProgress;
            const columnWidth = radius * 0.3;

            ctx.beginPath();
            ctx.fillStyle = `rgba(80, 60, 60, ${cloudAlpha})`;
            ctx.ellipse(x, y - columnHeight / 2, columnWidth, columnHeight / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Mushroom cap
            if (progress > 0.5) {
                const capProgress = (progress - 0.5) / 0.5;
                const capRadius = radius * 0.8 * capProgress;
                const capY = y - columnHeight;

                ctx.beginPath();
                ctx.fillStyle = `rgba(100, 70, 70, ${cloudAlpha * 0.8})`;
                ctx.ellipse(x, capY, capRadius, capRadius * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    } else {
        // Standard explosion - simpler effect
        const expandedRadius = radius * (0.5 + progress * 0.5);
        const alpha = 1 - progress;

        // Main fireball
        ctx.beginPath();
        ctx.arc(x, y, expandedRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, expandedRadius);
        gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 50, ${alpha * 0.7})`);
        gradient.addColorStop(1, `rgba(200, 50, 20, 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(x, y, expandedRadius * 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 150, 50, ${alpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.restore();
}

// renderScreenFlash() is now imported from effects.js
// getScreenShakeOffset() is now imported from effects.js

/**
 * Render all active projectiles and their trails.
 * Trail is rendered first (behind), then the projectile on top.
 * Also renders the split effect and explosion effects if active.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderActiveProjectile(ctx) {
    // Render split effect first (behind projectiles)
    renderSplitEffect(ctx);

    // Render explosion effect
    renderExplosionEffect(ctx);

    // Render explosion particles (after main explosion effect, adds detail)
    renderParticles(ctx);

    // Render each active projectile
    for (const projectile of activeProjectiles) {
        if (!projectile.isActive()) continue;

        // Render trail first (behind projectile)
        renderProjectileTrail(ctx, projectile);

        // Render projectile on top
        renderProjectile(ctx, projectile);
    }
}

// =============================================================================
// TERRAIN DESTRUCTION API
// =============================================================================

/**
 * Destroy terrain at a given position with a circular crater.
 * This is the public API for terrain destruction, called by projectile impacts.
 *
 * @param {number} x - X-coordinate of impact (design coordinates)
 * @param {number} y - Y-coordinate of impact (design coordinates, Y=0 is top)
 * @param {number} radius - Blast radius in pixels
 * @returns {boolean} True if terrain was destroyed, false otherwise
 */
export function destroyTerrainAt(x, y, radius) {
    if (!currentTerrain) {
        console.warn('Cannot destroy terrain: no terrain loaded');
        return false;
    }

    const wasDestroyed = currentTerrain.destroyTerrain(x, y, radius);

    // Apply falling dirt physics after terrain destruction
    if (wasDestroyed) {
        const fallingResult = currentTerrain.applyFallingDirt(x, radius);
        if (fallingResult.modified) {
            console.log('Falling dirt physics applied');
        }
    }

    return wasDestroyed;
}

/**
 * Get the current terrain instance (for reading terrain heights).
 * @returns {import('./terrain.js').Terrain|null} The current terrain, or null if not loaded
 */
export function getTerrain() {
    return currentTerrain;
}

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
        // Fire projectile after turn system transitions
        fireProjectile(playerTank);
    }
}

/**
 * Get available weapons that the player has ammo for.
 * @returns {Array} Array of weapon objects with ammo
 */
function getAvailableWeapons() {
    if (!playerTank) return [];

    const allWeapons = WeaponRegistry.getAllWeapons();
    return allWeapons.filter(weapon => {
        const ammo = playerTank.getAmmo(weapon.id);
        return ammo > 0 || ammo === Infinity;
    });
}

/**
 * Handle weapon select input event.
 * Cycles through available weapons that the player has ammo for.
 * The cycle order follows the weapon registry order:
 * Basic Shot → Missile → Big Shot → MIRV → etc.
 */
function handleSelectWeapon() {
    if (!playerTank) return;

    const availableWeapons = getAvailableWeapons();

    if (availableWeapons.length === 0) {
        console.warn('No weapons available with ammo!');
        return;
    }

    // Find current weapon index
    const currentIndex = availableWeapons.findIndex(w => w.id === playerTank.currentWeapon);

    // Cycle to next weapon (wrap around to start if at end)
    const nextIndex = (currentIndex + 1) % availableWeapons.length;
    const nextWeapon = availableWeapons[nextIndex];

    // Set the new weapon
    playerTank.setWeapon(nextWeapon.id);

    // Log the change with ammo info
    const ammo = playerTank.getAmmo(nextWeapon.id);
    const ammoDisplay = ammo === Infinity ? '∞' : ammo;
    console.log(`Weapon selected: ${nextWeapon.name} (ammo: ${ammoDisplay})`);
}

/**
 * Handle previous weapon select input event (Shift+Tab).
 * Cycles backwards through available weapons that the player has ammo for.
 */
function handleSelectPrevWeapon() {
    if (!playerTank) return;

    const availableWeapons = getAvailableWeapons();

    if (availableWeapons.length === 0) {
        console.warn('No weapons available with ammo!');
        return;
    }

    // Find current weapon index
    const currentIndex = availableWeapons.findIndex(w => w.id === playerTank.currentWeapon);

    // Cycle to previous weapon (wrap around to end if at start)
    const prevIndex = (currentIndex - 1 + availableWeapons.length) % availableWeapons.length;
    const prevWeapon = availableWeapons[prevIndex];

    // Set the new weapon
    playerTank.setWeapon(prevWeapon.id);

    // Log the change with ammo info
    const ammo = playerTank.getAmmo(prevWeapon.id);
    const ammoDisplay = ammo === Infinity ? '∞' : ammo;
    console.log(`Weapon selected: ${prevWeapon.name} (ammo: ${ammoDisplay})`);
}

/**
 * Render the playing screen
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPlaying(ctx) {
    // Apply screen shake offset if active
    const shakeOffset = getScreenShakeOffset();
    if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
        ctx.save();
        ctx.translate(shakeOffset.x, shakeOffset.y);
    }

    // Render synthwave background (behind everything)
    renderBackground(ctx, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Render terrain (in front of background)
    renderTerrain(ctx);

    // Render tanks on terrain
    renderTanks(ctx);

    // Render active projectile and trail (on top of terrain and tanks)
    renderActiveProjectile(ctx);

    // Sync playerTank's angle/power with playerAim for HUD display
    // (The tank stores the values, but playerAim is used for real-time input)
    if (playerTank) {
        playerTank.angle = playerAim.angle;
        playerTank.power = playerAim.power;
    }

    // Determine turn state for HUD
    const phase = Turn.getPhase();
    const isPlayerTurn = Turn.canPlayerAim();
    const shooter = Turn.getCurrentShooter();

    // Render the complete HUD using the new ui.js module
    // Pass the phase directly for the enhanced turn indicator
    HUD.renderHUD(ctx, {
        playerTank,
        enemyTank,
        money: Money.getMoney(),
        isPlayerTurn,
        phase,
        shooter
    });

    // Render round and difficulty indicator (still uses existing function)
    renderRoundIndicator(ctx);

    // Render pause button
    renderPauseButton(ctx);

    // Render touch aiming visuals (drag zone, rubber band, etc.)
    // This is rendered first so button-based controls appear on top
    if (isPlayerTurn) {
        TouchAiming.setEnabled(true);
        TouchAiming.render(ctx, playerTank, currentTerrain);
    } else {
        TouchAiming.setEnabled(false);
    }

    // Render aiming controls (power bar, angle arc, fire button, trajectory preview)
    // These are only shown during player's turn
    // Note: If touch aiming is active, these are still rendered but touch aiming
    // handles trajectory preview separately
    AimingControls.renderAimingControls(ctx, {
        playerTank,
        angle: playerAim.angle,
        power: playerAim.power,
        canFire: Turn.canPlayerFire(),
        isPlayerTurn,
        terrain: currentTerrain
    });

    // Draw keyboard hints at bottom of screen during player's turn (compact version)
    // Skip if touch aiming is actively being used (less distracting)
    if (isPlayerTurn && !TouchAiming.isActive()) {
        ctx.save();
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('← → Angle  |  ↑ ↓ Power  |  TAB Weapon  |  SPACE Fire  |  Drag tank to aim', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 20);
        ctx.restore();
    }

    // Restore context if screen shake was applied
    if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
        ctx.restore();
    }

    // Render screen flash on top of everything (not affected by shake)
    renderScreenFlash(ctx, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Render CRT effects as final post-processing overlay
    renderCrtEffects(ctx, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
}

/**
 * Handle pointer down in playing state.
 * Checks aiming controls first, then weapon HUD.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handlePlayingPointerDown(pos) {
    const state = Game.getState();
    const pausableStates = [GAME_STATES.PLAYING, GAME_STATES.AIMING, GAME_STATES.FIRING];
    if (!pausableStates.includes(state)) return;

    // Check pause button first (always available during gameplay)
    if (isInsidePauseButton(pos.x, pos.y)) {
        pauseGame();
        return;
    }

    // Only process other interactions in PLAYING state
    if (state !== GAME_STATES.PLAYING) return;

    // Check aiming controls first (power bar, angle arc, fire button)
    if (Turn.canPlayerAim()) {
        // Fire button, power bar, or angle arc
        AimingControls.handlePointerDown(pos.x, pos.y, playerTank, Turn.canPlayerFire());

        // Check if any control was activated - don't process other clicks
        if (AimingControls.isInsideFireButton(pos.x, pos.y) ||
            AimingControls.isInsidePowerBar(pos.x, pos.y) ||
            AimingControls.isInsideAngleArc(pos.x, pos.y, playerTank)) {
            return;
        }
    }

    // Check if click is on weapon HUD (only during player aim phase)
    if (Turn.canPlayerAim() && isInsideWeaponHUD(pos.x, pos.y)) {
        handleSelectWeapon();
        return;
    }
}

/**
 * Handle pointer move in playing state.
 * Updates aiming controls drag state.
 * @param {{x: number, y: number}} pos - Pointer position in design coordinates
 */
function handlePlayingPointerMove(pos) {
    if (Game.getState() !== GAME_STATES.PLAYING) return;

    AimingControls.handlePointerMove(pos.x, pos.y, playerTank);
}

/**
 * Handle pointer up in playing state.
 * Finalizes aiming control interactions.
 * @param {{x: number, y: number}} pos - Pointer position in design coordinates
 */
function handlePlayingPointerUp(pos) {
    if (Game.getState() !== GAME_STATES.PLAYING) return;

    AimingControls.handlePointerUp(pos.x, pos.y, Turn.canPlayerFire());
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
    Input.onGameInput(INPUT_EVENTS.SELECT_PREV_WEAPON, handleSelectPrevWeapon);

    // Register pointer handlers for aiming controls
    // Mouse events
    Input.onMouseDown((x, y, button) => {
        if (button === 0) {  // Left click only
            handlePlayingPointerDown({ x, y });
        }
    });

    Input.onMouseMove((x, y) => {
        // Convert raw mouse coords to design space
        // Note: Input callbacks already receive design-space coordinates
        handlePlayingPointerMove({ x, y });
    });

    Input.onMouseUp((x, y, button) => {
        if (button === 0) {
            handlePlayingPointerUp({ x, y });
        }
    });

    // Touch events
    Input.onTouchStart((x, y) => {
        handlePlayingPointerDown({ x, y });
    });

    Input.onTouchMove((x, y) => {
        handlePlayingPointerMove({ x, y });
    });

    Input.onTouchEnd((x, y) => {
        handlePlayingPointerUp({ x, y });
    });

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
            // Play gameplay music
            Music.playForState(GAME_STATES.PLAYING);

            // Determine if this is a new game or continuation
            const isNewGame = fromState === GAME_STATES.MENU;

            // Initialize money system if this is a new game from menu
            if (isNewGame) {
                Money.init();
            }
            // Start round earnings tracking with round number for multiplier
            // Rounds 1-2: 1.0x, Rounds 3-4: 1.2x, Rounds 5+: 1.5x
            Money.startRound(currentRound);

            // Save player inventory before creating new tanks (for round continuation)
            // Inventory persists across rounds when transitioning from SHOP or DEFEAT
            let savedPlayerInventory = null;
            if (!isNewGame && playerTank) {
                savedPlayerInventory = { ...playerTank.inventory };
                console.log('[Main] Preserving player inventory for new round:', savedPlayerInventory);
            }

            // Generate new terrain for this game
            // Uses midpoint displacement algorithm for natural-looking hills and valleys
            currentTerrain = generateTerrain(CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT, {
                roughness: 0.5,  // Balanced jaggedness (0.4-0.6 recommended)
                minHeightPercent: 0.2,  // Terrain starts at 20% of canvas height minimum
                maxHeightPercent: 0.7   // Terrain peaks at 70% of canvas height maximum
            });

            // Place tanks on the generated terrain
            // Player on left third (15-25%), Enemy on right third (75-85%)
            // Tank positions are recalculated each new round with new terrain
            const tanks = placeTanksOnTerrain(currentTerrain);
            playerTank = tanks.player;
            enemyTank = tanks.enemy;

            // Restore or initialize player inventory
            if (savedPlayerInventory) {
                // Continuing from previous round - restore inventory
                playerTank.inventory = savedPlayerInventory;
                console.log('[Main] Restored player inventory from previous round');
            } else {
                // New game from menu - give starting ammo for testing weapons
                // In the final game, these will be purchased from the shop
                playerTank.addAmmo('missile', 5);
                playerTank.addAmmo('big-shot', 3);
                playerTank.addAmmo('mirv', 3); // MIRV for testing splitting mechanic
                playerTank.addAmmo('deaths-head', 2); // Death's Head for testing 9-warhead split
                playerTank.addAmmo('roller', 3); // Roller for testing rolling mechanic
                playerTank.addAmmo('heavy-roller', 2); // Heavy Roller for testing
                playerTank.addAmmo('digger', 3); // Digger for testing tunneling mechanic
                playerTank.addAmmo('heavy-digger', 2); // Heavy Digger for testing
                playerTank.addAmmo('mini-nuke', 2); // Mini Nuke for testing nuclear effects
                playerTank.addAmmo('nuke', 1); // Nuke for testing big nuclear effects
            }

            // Set up AI for this round with appropriate difficulty and weapons
            // Rounds 1-2: Easy, Rounds 3-4: Medium, Rounds 5+: Hard
            const aiSetup = AI.setupAIForRound(enemyTank, currentRound);
            console.log(`Round ${currentRound}: AI difficulty is ${aiSetup.difficultyName}`);

            // Generate random wind for this round
            // Wind value -10 to +10: negative = left, positive = right
            Wind.generateRandomWind();

            // Initialize the turn system when entering playing state
            Turn.init();
            // Sync turn debug mode with game debug mode
            Turn.setDebugMode(Debug.isEnabled());
            // Sync AI debug mode with game debug mode
            AI.setDebugMode(Debug.isEnabled());
            // Cancel any pending AI turn
            AI.cancelTurn();
            // Reset projectile state
            for (const projectile of activeProjectiles) {
                projectile.clearTrail();
            }
            activeProjectiles = [];
            splitEffect = null;
            // Reset visual effect states
            clearScreenShake();
            clearScreenFlash();
            explosionEffect = null;
            // Clear explosion particles
            clearParticles();
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

// =============================================================================
// VICTORY/DEFEAT STATE
// =============================================================================

/**
 * Handle click on victory/defeat screen.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleVictoryDefeatClick(pos) {
    const state = Game.getState();
    if (state !== GAME_STATES.VICTORY && state !== GAME_STATES.DEFEAT) return;

    VictoryDefeat.handleClick(pos.x, pos.y);
}

/**
 * Render the victory/defeat screen overlay.
 * Shows the current game state underneath with the overlay on top.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderVictoryDefeatState(ctx) {
    // First render the game state underneath (terrain, tanks, etc.)
    renderPlaying(ctx);

    // Then render the victory/defeat overlay on top
    VictoryDefeat.render(ctx);
}

/**
 * Update victory/defeat screen animations.
 * @param {number} deltaTime - Time since last frame in ms
 */
function updateVictoryDefeat(deltaTime) {
    VictoryDefeat.update(deltaTime);
}

/**
 * Start a new round after victory.
 * Increments round counter and generates new terrain/tanks.
 */
function startNextRound() {
    currentRound++;
    // Note: Money.startRound(currentRound) is called in PLAYING state's onEnter handler
    // after the round counter is already incremented
    console.log(`[Main] Starting round ${currentRound}`);
    Game.setState(GAME_STATES.PLAYING);
}

/**
 * Return to main menu and reset game state.
 */
function returnToMenu() {
    // Reset game state
    currentRound = 1;
    Money.init();  // Reset money to starting amount
    playerTank = null;
    enemyTank = null;
    currentTerrain = null;
    activeProjectiles = [];

    VictoryDefeat.hide();
    Game.setState(GAME_STATES.MENU);
}

/**
 * Set up victory state handlers.
 */
function setupVictoryState() {
    // Register callbacks for button clicks
    VictoryDefeat.onContinue(() => {
        // Transition to shop for purchasing weapons
        VictoryDefeat.hide();
        Game.setState(GAME_STATES.SHOP);
    });

    VictoryDefeat.onQuit(() => {
        returnToMenu();
    });

    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.VICTORY) {
            handleVictoryDefeatClick({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.VICTORY) {
            handleVictoryDefeatClick({ x, y });
        }
    });

    Game.registerStateHandlers(GAME_STATES.VICTORY, {
        onEnter: (fromState) => {
            console.log('Entered VICTORY state');
            // Cancel any pending AI turn
            AI.cancelTurn();
            // Disable game input
            Input.disableGameInput();
            // Play victory music/stinger
            Music.playForState(GAME_STATES.VICTORY);
        },
        onExit: (toState) => {
            console.log('Exiting VICTORY state');
            VictoryDefeat.hide();
        },
        update: updateVictoryDefeat,
        render: renderVictoryDefeatState
    });
}

/**
 * Set up defeat state handlers.
 */
function setupDefeatState() {
    // Defeat uses the same VictoryDefeat module, but registered to DEFEAT state
    // Click handlers are shared with victory state through handleVictoryDefeatClick

    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.DEFEAT) {
            handleVictoryDefeatClick({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.DEFEAT) {
            handleVictoryDefeatClick({ x, y });
        }
    });

    Game.registerStateHandlers(GAME_STATES.DEFEAT, {
        onEnter: (fromState) => {
            console.log('Entered DEFEAT state');
            // Cancel any pending AI turn
            AI.cancelTurn();
            // Disable game input
            Input.disableGameInput();
            // Play defeat music/stinger
            Music.playForState(GAME_STATES.DEFEAT);
        },
        onExit: (toState) => {
            console.log('Exiting DEFEAT state');
            VictoryDefeat.hide();
        },
        update: updateVictoryDefeat,
        render: renderVictoryDefeatState
    });
}

// =============================================================================
// PAUSED STATE
// =============================================================================

/**
 * Handle pause menu action result.
 * @param {{action: string, data?: any}} result - Action from pause menu
 */
function handlePauseMenuAction(result) {
    if (!result) return;

    switch (result.action) {
        case 'resume':
            resumeGame();
            break;
        case 'quit':
            quitToMenu();
            break;
        case 'handled':
            // Action handled internally by pause menu
            break;
    }
}

/**
 * Open the pause menu and pause the game.
 */
function pauseGame() {
    const currentState = Game.getState();

    // Only allow pausing from gameplay states
    const pausableStates = [GAME_STATES.PLAYING, GAME_STATES.AIMING, GAME_STATES.FIRING];
    if (!pausableStates.includes(currentState)) {
        return;
    }

    prePauseState = currentState;
    Game.pauseLoop();
    PauseMenu.show(currentState);
    Game.setState(GAME_STATES.PAUSED);
    Sound.playClickSound();
    console.log(`Game paused from state: ${currentState}`);

    // Force immediate render of pause menu
    // The game loop should handle this, but as a fallback we trigger it manually
    const ctx = Renderer.getContext();
    if (ctx) {
        renderPausedState(ctx);
        console.log('Manually rendered pause menu');
    }
}

/**
 * Resume the game from the pause menu.
 */
function resumeGame() {
    if (Game.getState() !== GAME_STATES.PAUSED) return;

    PauseMenu.hide();
    Game.resumeLoop();

    // Return to pre-pause state
    if (prePauseState) {
        Game.setState(prePauseState);
        console.log(`Game resumed to state: ${prePauseState}`);
        prePauseState = null;
    }
}

/**
 * Quit to the main menu from pause.
 */
function quitToMenu() {
    PauseMenu.hide();
    Game.resumeLoop();

    // Cancel any pending AI turn
    AI.cancelTurn();

    // Clear projectiles
    for (const projectile of activeProjectiles) {
        projectile.clearTrail();
    }
    activeProjectiles = [];

    // Clear effects
    clearScreenShake();
    clearScreenFlash();
    clearParticles();
    clearBackground();
    explosionEffect = null;

    // Reset round counter for new game
    currentRound = 1;

    prePauseState = null;
    Game.setState(GAME_STATES.MENU);
    console.log('Quit to menu from pause');
}

/**
 * Render the paused state overlay.
 * Shows the game frozen behind the pause menu.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPausedState(ctx) {
    // Render the game state that was frozen (behind the overlay)
    renderPlaying(ctx);

    // Render the pause menu on top
    PauseMenu.render(ctx);
}

/**
 * Set up paused state handlers.
 */
function setupPausedState() {
    // Register click handlers for pause menu
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.PAUSED) {
            const result = PauseMenu.handlePointerDown(x, y);
            handlePauseMenuAction(result);
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.PAUSED) {
            const result = PauseMenu.handlePointerDown(x, y);
            handlePauseMenuAction(result);
        }
    });

    // Handle pointer move for slider dragging
    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.PAUSED) {
            PauseMenu.handlePointerMove(x, y);
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.PAUSED) {
            PauseMenu.handlePointerMove(x, y);
        }
    });

    // Handle pointer up to end slider dragging
    Input.onMouseUp((x, y, button) => {
        if (Game.getState() === GAME_STATES.PAUSED) {
            PauseMenu.handlePointerUp();
        }
    });

    Input.onTouchEnd((x, y) => {
        if (Game.getState() === GAME_STATES.PAUSED) {
            PauseMenu.handlePointerUp();
        }
    });

    // Register escape key handler for pausing/resuming
    Input.onKeyDown((keyCode) => {
        if (keyCode !== 'Escape') return;

        const state = Game.getState();

        // If paused, handle escape via pause menu
        if (state === GAME_STATES.PAUSED) {
            const result = PauseMenu.handleEscape();
            handlePauseMenuAction(result);
            return;
        }

        // If in a pausable state, open pause menu
        const pausableStates = [GAME_STATES.PLAYING, GAME_STATES.AIMING, GAME_STATES.FIRING];
        if (pausableStates.includes(state)) {
            pauseGame();
        }
    });

    Game.registerStateHandlers(GAME_STATES.PAUSED, {
        onEnter: (fromState) => {
            console.log('Entered PAUSED state');
            // Disable game input while paused
            Input.disableGameInput();
        },
        onExit: (toState) => {
            console.log('Exiting PAUSED state');
            // Re-enable game input if returning to player aiming
            if (toState === GAME_STATES.AIMING) {
                Input.enableGameInput();
            }
        },
        render: renderPausedState
    });
}

/**
 * Set up shop state handlers.
 */
function setupShopState() {
    // Register callbacks for shop buttons
    Shop.onDone(() => {
        // Shop closed, start next round
        Shop.hide();
        startNextRound();
    });

    // Register click handlers for shop
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.SHOP) {
            Shop.handleClick(x, y);
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.SHOP) {
            Shop.handleClick(x, y);
        }
    });

    Game.registerStateHandlers(GAME_STATES.SHOP, {
        onEnter: (fromState) => {
            console.log('Entered SHOP state');
            // Initialize shop with player tank reference
            Shop.show(playerTank);
            // Disable game input (handled by shop)
            Input.disableGameInput();
            // Play shop music
            Music.playForState(GAME_STATES.SHOP);
        },
        onExit: (toState) => {
            console.log('Exiting SHOP state');
            Shop.hide();
        },
        update: (deltaTime) => {
            Shop.update(deltaTime);
        },
        render: (ctx) => {
            // Render the playing state background first
            renderPlaying(ctx);
            // Then render shop overlay
            Shop.render(ctx);
        }
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
        // Initialize music system and start playing for current state
        if (Sound.isInitialized()) {
            Music.init();
            Music.playForState(Game.getState());

            // Remove listeners after first successful init
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

    // Initialize touch aiming (Angry Birds-style drag controls)
    TouchAiming.init();

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

    // Initialize synthwave background (static layer behind gameplay)
    initBackground(CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Setup state handlers BEFORE starting the loop
    // These register the update/render functions for each state
    setupMenuState();
    setupPlayingState();
    setupPausedState();
    setupVictoryState();
    setupDefeatState();
    setupShopState();

    // Register 'D' key to toggle debug mode
    Input.onKeyDown((keyCode) => {
        if (keyCode === DEBUG.TOGGLE_KEY) {
            Debug.toggle();
        }
    });

    console.log('Scorched Earth initialized');

    // Expose modules for debugging/testing
    window.AI = AI;
    window.Game = Game;
    window.Shop = Shop;
    window.Money = Money;
    window.VictoryDefeat = VictoryDefeat;

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

    // Update aiming controls animation
    AimingControls.update(deltaTime);

    // Update touch aiming animation
    TouchAiming.update(deltaTime);

    // Update continuous input (held keys generate events over time)
    Input.updateContinuousInput(deltaTime);

    // Process all queued game input events
    Input.processInputQueue();

    // Update particle system
    updateParticles(deltaTime);

    // Update background animation (star twinkle)
    updateBackground(deltaTime);

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
