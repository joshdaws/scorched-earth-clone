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
import { COLORS, DEBUG, CANVAS, UI, GAME_STATES, TURN_PHASES, PHYSICS, TANK, PROJECTILE } from './constants.js';
import { generateTerrain } from './terrain.js';
import { placeTanksOnTerrain, updateTankTerrainPosition } from './tank.js';
import { Projectile, createProjectileFromTank, checkTankCollision, createSplitProjectiles } from './projectile.js';
import { applyExplosionDamage, applyExplosionToAllTanks, DAMAGE } from './damage.js';
import * as Wind from './wind.js';
import { WeaponRegistry } from './weapons.js';

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
// MENU STATE
// =============================================================================

/**
 * Button definition for "Start Game" button
 */
const startButton = {
    x: CANVAS.DESIGN_WIDTH / 2,
    y: CANVAS.DESIGN_HEIGHT / 2 + 60,
    width: 250,
    height: 60,
    text: 'START GAME'
};

/**
 * Check if a point is inside the start button
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if point is inside button
 */
function isInsideStartButton(x, y) {
    const halfWidth = startButton.width / 2;
    const halfHeight = startButton.height / 2;
    return (
        x >= startButton.x - halfWidth &&
        x <= startButton.x + halfWidth &&
        y >= startButton.y - halfHeight &&
        y <= startButton.y + halfHeight
    );
}

/**
 * Handle click on menu - check if Start Game button was clicked
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleMenuClick(pos) {
    if (Game.getState() !== GAME_STATES.MENU) return;

    if (isInsideStartButton(pos.x, pos.y)) {
        // Transition to PLAYING state
        Game.setState(GAME_STATES.PLAYING);
    }
}

/**
 * Render the menu screen
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderMenu(ctx) {
    // Draw title
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold ${UI.FONT_SIZE_TITLE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCORCHED EARTH', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 3);

    // Draw subtitle
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.font = `${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.fillText('SYNTHWAVE EDITION', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 3 + 50);

    // Draw start button
    const halfWidth = startButton.width / 2;
    const halfHeight = startButton.height / 2;
    const btnX = startButton.x - halfWidth;
    const btnY = startButton.y - halfHeight;

    // Button background
    ctx.fillStyle = COLORS.BG_MEDIUM;
    ctx.fillRect(btnX, btnY, startButton.width, startButton.height);

    // Button border (neon glow effect)
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 3;
    ctx.strokeRect(btnX, btnY, startButton.width, startButton.height);

    // Button text
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.fillText(startButton.text, startButton.x, startButton.y);

    // Instructions text
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillText('Click or tap to start', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 100);
    ctx.fillText('Press D to toggle debug mode', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT - 70);
}

/**
 * Setup menu state handlers
 */
function setupMenuState() {
    // Register menu state handlers
    Game.registerStateHandlers(GAME_STATES.MENU, {
        onEnter: (fromState) => {
            console.log('Entered MENU state');
        },
        onExit: (toState) => {
            console.log('Exiting MENU state');
        },
        render: renderMenu
    });

    // Register click handler for menu interactions
    // Note: onMouseDown callback receives (x, y, button) - coordinates first
    Input.onMouseDown((x, y, button) => {
        handleMenuClick({ x, y });
    });

    // Register touch handler for menu interactions
    Input.onTouchStart((x, y) => {
        handleMenuClick({ x, y });
    });

    // Also handle keyboard - Space or Enter to start
    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.MENU) {
            if (keyCode === 'Space' || keyCode === 'Enter') {
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

    // Consume ammo - if tank has no ammo for current weapon, this returns false
    // The tank will auto-switch to basic-shot if current weapon runs out
    if (!tank.consumeAmmo()) {
        console.warn(`${tank.team} tank cannot fire: no ammo for ${tank.currentWeapon}`);
        return false;
    }

    // Get weapon info for logging
    const weapon = WeaponRegistry.getWeapon(tank.currentWeapon);
    const ammoRemaining = tank.getAmmo(tank.currentWeapon);
    const ammoDisplay = ammoRemaining === Infinity ? '∞' : ammoRemaining;

    // Create projectile from tank's barrel position and add to array
    const projectile = createProjectileFromTank(tank);
    activeProjectiles = [projectile]; // Clear and set new projectile
    console.log(`Projectile fired from ${tank.team} at angle ${tank.angle}°, power ${tank.power}% (${weapon ? weapon.name : tank.currentWeapon}, ammo: ${ammoDisplay})`);
    return true;
}

/**
 * Handle a single projectile's explosion (on terrain or tank hit).
 * Creates crater, applies damage, updates tank positions.
 *
 * @param {import('./projectile.js').Projectile} projectile - The projectile that exploded
 * @param {{x: number, y: number}} pos - Impact position
 * @param {import('./tank.js').Tank|null} directHitTank - Tank that was directly hit, or null for terrain hit
 */
function handleProjectileExplosion(projectile, pos, directHitTank) {
    const weaponId = projectile.weaponId;
    const weapon = WeaponRegistry.getWeapon(weaponId);
    const blastRadius = weapon ? weapon.blastRadius : 30;

    const explosion = {
        x: pos.x,
        y: pos.y,
        blastRadius: blastRadius
    };

    if (directHitTank) {
        // Apply explosion damage to the directly hit tank
        const damageResult = applyExplosionDamage(explosion, directHitTank, weapon);

        // Also check for splash damage to other tanks
        const allTanks = [playerTank, enemyTank].filter(t => t !== null && t !== directHitTank);
        applyExplosionToAllTanks(explosion, allTanks, weapon);

        console.log(`Tank hit! ${directHitTank.team} took ${damageResult.actualDamage} damage${damageResult.isDirectHit ? ' (DIRECT HIT!)' : ''}, health: ${directHitTank.health}`);
    } else {
        // Apply splash damage to all tanks near the explosion
        const allTanks = [playerTank, enemyTank].filter(t => t !== null);
        const damageResults = applyExplosionToAllTanks(explosion, allTanks, weapon);

        for (const result of damageResults) {
            console.log(`Splash damage: ${result.tank.team} tank took ${result.actualDamage} damage, health: ${result.tank.health}`);
        }
    }

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
}

/**
 * Update all active projectiles - physics, collisions, and splitting.
 * Called each frame during projectile flight.
 *
 * Handles MIRV-type weapons by:
 * 1. Detecting apex (when vy goes from negative to positive)
 * 2. Spawning child projectiles at apex
 * 3. Destroying parent projectile
 * 4. Tracking all projectiles until they all resolve
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

        // Update projectile physics with current wind force
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
        Turn.projectileResolved();
    }
}

/**
 * Update the playing state - handle turn-based logic
 * @param {number} deltaTime - Time since last frame in ms
 */
function updatePlaying(deltaTime) {
    const phase = Turn.getPhase();

    // Handle AI turn (simple placeholder - AI aims for a short time then fires)
    if (phase === TURN_PHASES.AI_AIM) {
        // For now, AI fires after a short delay (simulated with frame count)
        // In the future, this will involve actual AI calculations
        if (!aiAimStartTime) {
            aiAimStartTime = performance.now();
        }

        // AI "thinks" for 1 second then fires
        if (performance.now() - aiAimStartTime > 1000) {
            // Set AI aiming parameters before firing (placeholder)
            if (enemyTank) {
                enemyTank.angle = 135; // Aims left-ish toward player
                enemyTank.power = 50;
            }
            Turn.aiFire();
            // Fire projectile after turn system transitions
            fireProjectile(enemyTank);
            aiAimStartTime = null;
        }
    }

    // Handle projectile flight - update physics
    if (phase === TURN_PHASES.PROJECTILE_FLIGHT) {
        updateProjectile();
    }
}

// Timing state for AI turn (will be replaced by actual AI system)
let aiAimStartTime = null;

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
 * Render the projectile as a glowing circle.
 * Per spec: 8px diameter circle with glow effect.
 * Uses weapon-specific projectile colors for distinct visual appearance.
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

    // Draw bright inner core for extra glow effect
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';  // White hot center
    ctx.fill();

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
 * Render all active projectiles and their trails.
 * Trail is rendered first (behind), then the projectile on top.
 * Also renders the split effect if active.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderActiveProjectile(ctx) {
    // Render split effect first (behind projectiles)
    renderSplitEffect(ctx);

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
    return currentTerrain.destroyTerrain(x, y, radius);
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
 * Handle weapon select input event.
 * Cycles through available weapons that the player has ammo for.
 * The cycle order follows the weapon registry order:
 * Basic Shot → Missile → Big Shot → MIRV → etc.
 */
function handleSelectWeapon() {
    if (!playerTank) return;

    // Get all weapons from registry
    const allWeapons = WeaponRegistry.getAllWeapons();

    // Filter to only weapons the player has ammo for
    const availableWeapons = allWeapons.filter(weapon => {
        const ammo = playerTank.getAmmo(weapon.id);
        return ammo > 0 || ammo === Infinity;
    });

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
 * Render the playing screen
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPlaying(ctx) {
    // Render terrain first (background)
    renderTerrain(ctx);

    // Render tanks on terrain
    renderTanks(ctx);

    // Render active projectile and trail (on top of terrain and tanks)
    renderActiveProjectile(ctx);

    // Render turn indicator at top of screen
    Turn.renderTurnIndicator(ctx);

    // Render wind indicator at top-left
    Wind.renderWindIndicator(ctx);

    // Draw phase-specific content
    const phase = Turn.getPhase();

    // Draw playing state indicator (temporary)
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAYING STATE', CANVAS.DESIGN_WIDTH / 2, 70);

    // Draw current phase info
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillText(`Current Phase: ${phase}`, CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 - 40);

    // Draw aiming values
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.fillText(`ANGLE: ${playerAim.angle.toFixed(1)}°`, CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2);
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.fillText(`POWER: ${playerAim.power.toFixed(1)}%`, CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 35);

    // Draw current weapon and ammo
    if (playerTank) {
        const weapon = WeaponRegistry.getWeapon(playerTank.currentWeapon);
        const ammo = playerTank.getAmmo(playerTank.currentWeapon);
        const ammoDisplay = ammo === Infinity ? '∞' : ammo;
        ctx.fillStyle = COLORS.TEXT_LIGHT;
        ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.fillText(`WEAPON: ${weapon ? weapon.name : playerTank.currentWeapon} (${ammoDisplay})`, CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 65);
    }

    // Draw controls help based on current phase
    if (Turn.canPlayerAim()) {
        ctx.fillStyle = COLORS.TEXT_LIGHT;
        ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
        ctx.fillText('Press SPACE to fire!', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 105);
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillText('← → Arrow keys: Adjust angle | ↑ ↓ Arrow keys: Adjust power', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 135);
        ctx.fillText('TAB: Cycle weapons', CANVAS.DESIGN_WIDTH / 2, CANVAS.DESIGN_HEIGHT / 2 + 160);
    }
}

/**
 * Handle click in playing state - for testing terrain destruction.
 * Creates a crater at the click position.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handlePlayingClick(pos) {
    if (Game.getState() !== GAME_STATES.PLAYING) return;

    // Default blast radius for testing (can be varied for different weapons later)
    const testBlastRadius = 40;

    // Destroy terrain at click position
    const destroyed = destroyTerrainAt(pos.x, pos.y, testBlastRadius);

    if (destroyed) {
        console.log(`Crater created at (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}) with radius ${testBlastRadius}`);

        // Update tank positions to match new terrain height
        // This ensures tanks don't float after terrain is destroyed
        if (playerTank && currentTerrain) {
            updateTankTerrainPosition(playerTank, currentTerrain);
        }
        if (enemyTank && currentTerrain) {
            updateTankTerrainPosition(enemyTank, currentTerrain);
        }
    }
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

    // Register click handler for testing terrain destruction
    // Note: This is for development testing - will be removed when projectile system is ready
    Input.onMouseDown((x, y, button) => {
        handlePlayingClick({ x, y });
    });

    Input.onTouchStart((x, y) => {
        handlePlayingClick({ x, y });
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

            // Give player starting ammo for testing weapons
            // In the final game, these will be purchased from the shop
            playerTank.addAmmo('missile', 5);
            playerTank.addAmmo('big-shot', 3);
            playerTank.addAmmo('mirv', 3); // MIRV for testing splitting mechanic
            playerTank.addAmmo('deaths-head', 2); // Death's Head for testing 9-warhead split

            // Generate random wind for this round
            // Wind value -10 to +10: negative = left, positive = right
            Wind.generateRandomWind();

            // Initialize the turn system when entering playing state
            Turn.init();
            // Sync turn debug mode with game debug mode
            Turn.setDebugMode(Debug.isEnabled());
            // Reset timing state
            aiAimStartTime = null;
            // Reset projectile state
            for (const projectile of activeProjectiles) {
                projectile.clearTrail();
            }
            activeProjectiles = [];
            splitEffect = null;
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
        // Remove listeners after first successful init
        if (Sound.isInitialized()) {
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

    // Setup state handlers BEFORE starting the loop
    // These register the update/render functions for each state
    setupMenuState();
    setupPlayingState();

    // Register 'D' key to toggle debug mode
    Input.onKeyDown((keyCode) => {
        if (keyCode === DEBUG.TOGGLE_KEY) {
            Debug.toggle();
        }
    });

    console.log('Scorched Earth initialized');

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

    // Update continuous input (held keys generate events over time)
    Input.updateContinuousInput(deltaTime);

    // Process all queued game input events
    Input.processInputQueue();

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
