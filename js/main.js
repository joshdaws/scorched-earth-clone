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
import { createPlayerTank, createEnemyTank, placeTanksOnTerrain, updateTankTerrainPosition, calculateFallDamage, areAnyTanksFalling } from './tank.js';
import { Projectile, createProjectileFromTank, checkTankCollision, createSplitProjectiles } from './projectile.js';
import * as Wind from './wind.js';
import { WeaponRegistry, WEAPON_TYPES } from './weapons.js';
import * as AI from './ai.js';
import * as HUD from './ui.js?v=20260111d';
import * as AimingControls from './aimingControls.js?v=20260111a';
import * as VictoryDefeat from './victoryDefeat.js';
import * as Money from './money.js';
import * as Shop from './shop.js';
import { updateParticles, renderParticles, clearParticles, getParticleCount, screenShakeForBlastRadius, getScreenShakeOffset, clearScreenShake, renderScreenFlash, clearScreenFlash, initBackground, updateBackground, renderBackground, clearBackground, renderCrtEffects, setCrtEnabled, isCrtEnabled, toggleCrt } from './effects.js';
import * as Music from './music.js';
import * as VolumeControls from './volumeControls.js';
import * as PauseMenu from './pauseMenu.js';
import * as TouchAiming from './touchAiming.js';
import * as Haptics from './haptics.js';
import * as DebugTools from './debugTools.js';
import * as TestAPI from './testAPI.js';
import * as GameOver from './gameOver.js';
import * as RoundTransition from './roundTransition.js';
import { getEnemyHealthForRound, recordStat, startNewRun as startNewRunState, endRun as endRunState, advanceRound as advanceRunRound } from './runState.js';
import * as HighScores from './highScores.js';
import * as AchievementPopup from './achievement-popup.js';
import * as SupplyDrop from './supply-drop.js';
import * as ExtractionReveal from './extraction-reveal.js';
import * as AchievementScreen from './achievement-screen.js';
import * as CollectionScreen from './collection-screen.js';
import * as SupplyDropScreen from './supply-drop-screen.js';
import * as LevelSelectScreen from './level-select-screen.js';
import * as LevelCompleteScreen from './level-complete-screen.js';
import * as LevelEditorScreen from './level-editor-screen.js';
import * as TankEditorScreen from './tank-editor-screen.js';
import { LevelRegistry } from './levels.js';
import { buildTerrainFromSlot, getPuzzleObjectsForSlot, getSpawnForSlot } from './level-layouts.js';
import { renderPuzzleObjectsWithSprites, resolvePuzzleObjectCollision } from './puzzleObjects.js';
import { Stars } from './stars.js';
import * as CombatAchievements from './combat-achievements.js';
import * as PrecisionAchievements from './precision-achievements.js';
import * as WeaponAchievements from './weapon-achievements.js';
import * as ProgressionAchievements from './progression-achievements.js';
import * as HiddenAchievements from './hidden-achievements.js';
import { onAchievementUnlock, clearRoundAchievements, getRoundAchievements } from './achievements.js';
import * as Tokens from './tokens.js';
import * as TankCollection from './tank-collection.js';
import { getTank as getTankSkin } from './tank-skins.js';
import { getTankSkinId, getTankSpriteKey, getTurretPivot, isRealSprite } from './tank-visuals.js';
import { getActiveTankDesign, getCompiledTankCanvasForSkin, setRuntimeTankDesign } from './tank-design-runtime.js';
import { PLAYER_RUNTIME_OVERRIDE_KEY } from './tank-design-store.js';
import { renderTankEffects } from './tank-effect-renderer.js';
import * as PerformanceTracking from './performance-tracking.js';
import * as PitySystem from './pity-system.js';
import * as LifetimeStats from './lifetime-stats.js';
import * as NameEntry from './nameEntry.js';
import * as TitleScene from './titleScene/titleScene.js';
import { Button } from './ui/Button.js';
import * as ControlSettings from './controls/controlSettings.js';
import * as SceneIsolation from './sceneIsolation.js';
import * as DailyRewards from './engagement/dailyRewards.js';
import * as DailyChallenges from './engagement/dailyChallenges.js';
import * as EngagementUI from './engagement/engagementUI.js';
import * as DebugOverlays from './debugOverlays.js';
import { GAMEPLAY_EVENTS, emitGameplayEvent } from './gameplayEvents.js';
import { resolveProjectileImpact } from './impactResolution.js';
import { renderGameplayScene } from './gameplayRenderer.js';
import { renderMenuScene } from './menuRenderer.js';
import { renderTerrainScene } from './terrainRenderer.js';
import {
    buildTerrainDerezSamples,
    captureTerrainDerezSnapshot,
    clearTerrainDerezEffects,
    registerTerrainDerezEventHandlers,
    renderTerrainDerezEffects,
    updateTerrainDerezEffects
} from './terrainDerezEffect.js';
import {
    buildRemovedTerrainCells,
    captureTerrainCellSnapshot,
    getOrCreateTerrainCellGrid,
    getTerrainGridSlopeAngle,
    getTerrainGridSurfaceYAt,
    rebuildTerrainCellGrid
} from './terrainCells.js';
import {
    getPixiTerrainFragmentCount,
    initPixiTerrainLayer,
    markPixiTerrainLayerDirty,
    renderPixiTerrainLayerToCanvas
} from './pixiTerrainLayer.js';
import { recordMeasure, setPerformanceGauge } from './performanceMetrics.js';

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

const TANK_TURRET_SPRITE = {
    PIVOT_X: 6,
    PIVOT_Y: 6
};

/**
 * Current round number (1-based)
 * @type {number}
 */
let currentRound = 1;

// =============================================================================
// ONBOARDING STATE
// =============================================================================

/**
 * Storage key for tracking whether the first round has been completed.
 * @type {string}
 */
const FIRST_ROUND_COMPLETED_STORAGE_KEY = 'scorched_earth_has_played_first_round';

/**
 * Whether the player has completed at least one round.
 * @type {boolean}
 */
let hasCompletedFirstRound = false;

/**
 * Load onboarding progression from localStorage.
 */
function loadOnboardingState() {
    try {
        hasCompletedFirstRound = localStorage.getItem(FIRST_ROUND_COMPLETED_STORAGE_KEY) === 'true';
    } catch (e) {
        hasCompletedFirstRound = false;
        console.warn('[Main] Failed to load onboarding state:', e);
    }
}

/**
 * Persist first-round completion milestone.
 */
function markFirstRoundCompleted() {
    if (hasCompletedFirstRound) return;

    hasCompletedFirstRound = true;

    try {
        localStorage.setItem(FIRST_ROUND_COMPLETED_STORAGE_KEY, 'true');
    } catch (e) {
        console.warn('[Main] Failed to persist first-round milestone:', e);
    }
}

/**
 * Show first-time name entry only after the first completed round.
 * @param {number} [delayMs=500] - Delay before opening the modal
 * @returns {boolean} True if modal display was scheduled
 */
function scheduleDeferredNameEntryIfNeeded(delayMs = 500) {
    if (!hasCompletedFirstRound || !NameEntry.needsNameEntry()) {
        return false;
    }

    setTimeout(() => {
        if (Game.getState() === GAME_STATES.MENU && !NameEntry.isOpen() && NameEntry.needsNameEntry()) {
            NameEntry.show({
                isFirstTime: true,
                onConfirm: (name) => {
                    console.log('[Main] Player name set:', name);
                }
            });
        }
    }, delayMs);

    return true;
}

// =============================================================================
// LEVEL MODE STATE
// =============================================================================

/**
 * Current level ID when playing in level mode (e.g., 'world1-level3')
 * @type {string|null}
 */
let currentLevelId = null;

/**
 * Current level definition when playing in level mode
 * @type {Object|null}
 */
let currentLevelData = null;

/**
 * Whether currently playing in level-based mode (vs roguelike/endless mode)
 * @type {boolean}
 */
let isLevelMode = false;

/**
 * Level mode statistics tracking.
 * Tracks accuracy and turns for star calculation.
 * @type {{shotsFired: number, shotsHit: number, turnsUsed: number, damageDealt: number}}
 */
let levelModeStats = {
    shotsFired: 0,
    shotsHit: 0,
    turnsUsed: 0,
    damageDealt: 0
};

const PHYSICS_PLAYGROUND = {
    PANEL_X: 900,
    PANEL_Y: 132,
    PANEL_W: 270,
    PANEL_H: 286,
    BUTTON_H: 34,
    GAP: 8,
    TERRAIN_THROTTLE_MS: 70,
    MIN_RADIUS: 12,
    MAX_RADIUS: 220,
    RADIUS_STEP: 12
};

const physicsPlaygroundState = {
    active: false,
    tool: 'weapon',
    selectedWeaponId: 'basic-shot',
    craterRadius: 72,
    seed: 6601,
    pointerDown: false,
    hover: null,
    lastTerrainEditAt: 0,
    lastImpact: null
};

/**
 * True when gameplay was started from the level editor's playtest action.
 * Enables return-to-editor shortcuts and draft slot overrides.
 * @type {boolean}
 */
let isLevelEditorPlaytestMode = false;

/**
 * True when gameplay was started from Tank Forge playtest.
 * @type {boolean}
 */
let isTankEditorPlaytestMode = false;

/**
 * Optional slot override used for level editor playtests.
 * Applied only when entering PLAYING from editor.
 * @type {{terrainSamples:number[], enemyXNorm:number}|null}
 */
let levelEditorSlotOverride = null;

/**
 * Optional skin ID selected for Tank Forge playtest.
 * @type {string|null}
 */
let tankEditorPlaytestSkinId = null;

/**
 * Return button config for editor playtests (shown in gameplay states).
 */
const LEVEL_EDITOR_RETURN_BUTTON = {
    width: 160,
    height: 36,
    top: 16,
    right: 16
};

/**
 * Reset level mode stats for a new level.
 */
function resetLevelModeStats() {
    levelModeStats = {
        shotsFired: 0,
        shotsHit: 0,
        turnsUsed: 0,
        damageDealt: 0
    };
}

/**
 * Get current accuracy for level mode (0.0 - 1.0).
 * @returns {number} Accuracy as a decimal
 */
function getLevelModeAccuracy() {
    if (levelModeStats.shotsFired === 0) return 0;
    return levelModeStats.shotsHit / levelModeStats.shotsFired;
}

/**
 * Get the return-to-editor button rectangle for playtest mode.
 * @returns {{x:number,y:number,width:number,height:number}}
 */
function getLevelEditorReturnButtonRect() {
    return {
        x: Renderer.getWidth() - LEVEL_EDITOR_RETURN_BUTTON.right - LEVEL_EDITOR_RETURN_BUTTON.width,
        y: LEVEL_EDITOR_RETURN_BUTTON.top,
        width: LEVEL_EDITOR_RETURN_BUTTON.width,
        height: LEVEL_EDITOR_RETURN_BUTTON.height
    };
}

/**
 * Check if a point is inside the return-to-editor button.
 * @param {number} x - Pointer x in design space
 * @param {number} y - Pointer y in design space
 * @returns {boolean}
 */
function isInsideLevelEditorReturnButton(x, y) {
    if (!isLevelEditorPlaytestMode && !isTankEditorPlaytestMode) return false;
    const rect = getLevelEditorReturnButtonRect();
    return (
        x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height
    );
}

/**
 * Return from playtest gameplay to the level editor.
 */
function returnToEditorFromPlaytest() {
    if (!isLevelEditorPlaytestMode && !isTankEditorPlaytestMode) return;

    const returnState = isTankEditorPlaytestMode ? GAME_STATES.TANK_EDITOR : GAME_STATES.LEVEL_EDITOR;
    clearLevelEditorPlaytestState();
    Game.setState(returnState);
}

/**
 * Clear level editor playtest state.
 */
function clearLevelEditorPlaytestState() {
    isLevelEditorPlaytestMode = false;
    isTankEditorPlaytestMode = false;
    levelEditorSlotOverride = null;
    tankEditorPlaytestSkinId = null;
    setRuntimeTankDesign(PLAYER_RUNTIME_OVERRIDE_KEY, null);
}

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
 * Active level-authored puzzle objects for campaign combat.
 * @type {object[]}
 */
let currentPuzzleObjects = [];

/**
 * Pending Endless Neon Run perk selected from the round transition screen.
 * Applied after the next round's player tank is created.
 * @type {Object|null}
 */
let pendingSurvivalRunPerk = null;

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

/**
 * Persistent trails for Tracer weapons.
 * Shows the trajectory path for a few seconds after explosion.
 * Each entry: {trail: Array<{x,y}>, startTime: number, duration: number, color: string}
 * @type {Array<{trail: Array<{x: number, y: number}>, startTime: number, duration: number, color: string}>}
 */
let persistentTrails = [];

/** Duration in ms that Tracer trails remain visible after explosion */
const TRACER_TRAIL_DURATION = 3000;

// =============================================================================
// FALLOUT ZONE STATE (Tactical Nuke)
// =============================================================================

/**
 * Active fallout zones from Tactical Nuke explosions.
 * Each zone deals damage to tanks within its radius at the start of their turn.
 * @type {Array<{x: number, y: number, radius: number, damagePerTurn: number, turnsRemaining: number}>}
 */
let activeFalloutZones = [];

/**
 * Fallout zone configuration.
 */
const FALLOUT_CONFIG = {
    /** Damage per turn for Tactical Nuke fallout */
    DAMAGE_PER_TURN: 10,
    /** Default number of turns fallout lasts */
    DEFAULT_DURATION: 2
};

function getSurvivalTerrainOptionsForRound(round) {
    if (round <= 2) {
        return {
            roughness: 0.35,
            minHeightPercent: 0.18,
            maxHeightPercent: 0.45
        };
    }
    if (round <= 6) {
        return {
            roughness: 0.42,
            minHeightPercent: 0.2,
            maxHeightPercent: 0.56
        };
    }
    return {
        roughness: 0.5,
        minHeightPercent: 0.2,
        maxHeightPercent: 0.68
    };
}

/**
 * Create a new fallout zone at the specified position.
 * Fallout deals damage to tanks within radius at the start of each turn.
 *
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} radius - Fallout zone radius in pixels
 * @param {number} [duration=2] - Number of turns the fallout lasts
 */
function createFalloutZone(x, y, radius, duration = FALLOUT_CONFIG.DEFAULT_DURATION) {
    activeFalloutZones.push({
        x,
        y,
        radius,
        damagePerTurn: FALLOUT_CONFIG.DAMAGE_PER_TURN,
        turnsRemaining: duration
    });
    console.log(`Fallout zone created at (${x.toFixed(1)}, ${y.toFixed(1)}), radius=${radius.toFixed(1)}, duration=${duration} turns`);
}

/**
 * Apply fallout damage to a tank if it's within any fallout zones.
 * Called at the start of each tank's turn.
 *
 * @param {import('./tank.js').Tank} tank - Tank to check for fallout damage
 * @returns {number} Total fallout damage dealt
 */
function applyFalloutDamageToTank(tank) {
    if (!tank || tank.health <= 0) return 0;

    let totalDamage = 0;

    for (const zone of activeFalloutZones) {
        const dx = tank.x - zone.x;
        const dy = tank.y - zone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= zone.radius) {
            const damage = zone.damagePerTurn;
            tank.takeDamage(damage);
            totalDamage += damage;
            console.log(`${tank.team} tank took ${damage} fallout damage (${zone.turnsRemaining} turns remaining in zone)`);
        }
    }

    return totalDamage;
}

/**
 * Tick all fallout zones - decrement duration and remove expired zones.
 * Called at the end of each full round (after both tanks have taken turns).
 */
function tickFalloutZones() {
    activeFalloutZones = activeFalloutZones.filter(zone => {
        zone.turnsRemaining--;
        if (zone.turnsRemaining <= 0) {
            console.log('Fallout zone dissipated');
            return false;
        }
        return true;
    });
}

/**
 * Clear all fallout zones.
 * Called when starting a new round or resetting the game.
 */
function clearFalloutZones() {
    activeFalloutZones = [];
}

/**
 * Get all active fallout zones for rendering.
 * @returns {Array<{x: number, y: number, radius: number, turnsRemaining: number}>} Active zones
 */
function getActiveFalloutZones() {
    return activeFalloutZones;
}

// =============================================================================
// FIRE ZONE STATE (Napalm)
// =============================================================================

/**
 * Active fire zones from Napalm explosions.
 * Each zone deals burn damage to tanks within its radius at the start of their turn.
 * @type {Array<{x: number, y: number, radius: number, damagePerTurn: number, turnsRemaining: number}>}
 */
let activeFireZones = [];

/**
 * Fire zone configuration (Napalm).
 */
const FIRE_CONFIG = {
    /** Initial damage on impact (from weapon definition) */
    INITIAL_DAMAGE: 8,
    /** Burn damage per turn */
    DAMAGE_PER_TURN: 5,
    /** Number of turns the fire burns */
    BURN_DURATION: 5
};

/**
 * Create a new fire zone at the specified position.
 * Fire deals burn damage to tanks within radius at the start of each turn.
 *
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} radius - Fire zone radius in pixels
 */
function createFireZone(x, y, radius) {
    activeFireZones.push({
        x,
        y,
        radius,
        damagePerTurn: FIRE_CONFIG.DAMAGE_PER_TURN,
        turnsRemaining: FIRE_CONFIG.BURN_DURATION
    });
    console.log(`Fire zone created at (${x.toFixed(1)}, ${y.toFixed(1)}), radius=${radius.toFixed(1)}, duration=${FIRE_CONFIG.BURN_DURATION} turns`);
}

/**
 * Apply fire damage to a tank if it's within any fire zones.
 * Called at the start of each tank's turn.
 *
 * @param {import('./tank.js').Tank} tank - Tank to check for fire damage
 * @returns {number} Total fire damage dealt
 */
function applyFireDamageToTank(tank) {
    if (!tank || tank.health <= 0) return 0;

    let totalDamage = 0;

    for (const zone of activeFireZones) {
        const dx = tank.x - zone.x;
        const dy = tank.y - zone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= zone.radius) {
            const damage = zone.damagePerTurn;
            tank.takeDamage(damage);
            totalDamage += damage;
            console.log(`${tank.team} tank took ${damage} burn damage (${zone.turnsRemaining} turns remaining in fire)`);
        }
    }

    return totalDamage;
}

/**
 * Tick all fire zones - decrement duration and remove expired zones.
 * Called at the end of each full round (after both tanks have taken turns).
 */
function tickFireZones() {
    activeFireZones = activeFireZones.filter(zone => {
        zone.turnsRemaining--;
        if (zone.turnsRemaining <= 0) {
            console.log('Fire zone burned out');
            return false;
        }
        return true;
    });
}

/**
 * Clear all fire zones.
 * Called when starting a new round or resetting the game.
 */
function clearFireZones() {
    activeFireZones = [];
}

/**
 * Get all active fire zones for rendering.
 * @returns {Array<{x: number, y: number, radius: number, turnsRemaining: number}>} Active zones
 */
function getActiveFireZones() {
    return activeFireZones;
}

// =============================================================================
// GRAVITY WELL STATE
// =============================================================================

/**
 * Active gravity wells from Gravity Well weapon.
 * Each well pulls tanks toward its center on the turn it's active.
 * @type {Array<{x: number, y: number, pullRadius: number, pullStrength: number}>}
 */
const activeGravityWells = [];

/**
 * Gravity Well configuration.
 */
const GRAVITY_WELL_CONFIG = {
    /** Pull radius in pixels */
    PULL_RADIUS: 200,
    /** Maximum pull distance in pixels per application */
    PULL_STRENGTH: 50
};

/**
 * Create a gravity well at the specified position.
 * Immediately pulls nearby tanks toward the center.
 *
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 */
function createGravityWell(x, y) {
    console.log(`Gravity Well created at (${x.toFixed(1)}, ${y.toFixed(1)})`);

    // Get all tanks
    const tanks = [playerTank, enemyTank].filter(t => t !== null && !t.isDestroyed());

    for (const tank of tanks) {
        const dx = x - tank.x;
        const dy = y - tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= GRAVITY_WELL_CONFIG.PULL_RADIUS && distance > 0) {
            // Calculate pull strength based on distance (stronger when closer)
            const pullFactor = 1 - (distance / GRAVITY_WELL_CONFIG.PULL_RADIUS);
            const pullDistance = GRAVITY_WELL_CONFIG.PULL_STRENGTH * pullFactor;

            // Normalize direction and apply pull
            const pullX = (dx / distance) * pullDistance;

            // Move tank horizontally toward gravity well center
            const newX = Math.max(0, Math.min(currentTerrain.getWidth() - 1, tank.x + pullX));
            tank.x = newX;

            // Update tank's Y position to match new terrain height
            updateTankTerrainPosition(tank, currentTerrain);

            console.log(`${tank.team} tank pulled ${pullDistance.toFixed(1)}px toward gravity well`);
        }
    }
}

// =============================================================================
// PAUSE BUTTON STATE
// =============================================================================

/**
 * Pause button dimensions and position.
 * Small button in bottom-right corner for mouse/touch pause.
 */
const pauseButton = {
    x: CANVAS.DESIGN_WIDTH - 50,
    y: CANVAS.DESIGN_HEIGHT - 50,
    width: 40,
    height: 40
};

/**
 * Update pause button position based on current screen dimensions.
 * Should be called before rendering or hit testing pause button.
 */
function updatePauseButtonPosition() {
    pauseButton.x = Renderer.getWidth() - 50;
    pauseButton.y = Renderer.getHeight() - 50;
}

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
 * Get fullscreen parameters for CRT effects rendering.
 * CRT effects should cover the entire viewport, not just the game content area.
 * @returns {{viewportWidth: number, viewportHeight: number, dpr: number}}
 */
function getCrtFullscreenParams() {
    const viewport = Renderer.getViewportDimensions();
    return {
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        dpr: Renderer.getDevicePixelRatio()
    };
}

/**
 * Render the pause button.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPauseButton(ctx) {
    // Update position for current screen size
    updatePauseButtonPosition();

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
 * Render return-to-editor button for level editor playtests.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderLevelEditorReturnButton(ctx) {
    if (!isLevelEditorPlaytestMode && !isTankEditorPlaytestMode) return;

    const rect = getLevelEditorReturnButtonRect();

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 26, 0.78)';
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.NEON_YELLOW;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RETURN TO EDITOR', rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.restore();
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
 * Menu button styles to match design reference.
 * All buttons have solid dark backgrounds for visibility against the synthwave grid.
 */
const MENU_BUTTON_STYLES = {
    // Primary action - wide yellow/gold bordered button (NEW RUN)
    PRIMARY: {
        bgColor: 'rgba(20, 15, 40, 0.95)',
        borderColor: '#F5D547',
        textColor: '#ffffff',
        glowColor: '#F5D547'
    },
    // Cyan bordered buttons (left column: HIGH SCORES, COLLECTION)
    CYAN: {
        bgColor: 'rgba(20, 15, 40, 0.95)',
        borderColor: COLORS.NEON_CYAN,
        textColor: '#ffffff',
        glowColor: COLORS.NEON_CYAN
    },
    // Pink/magenta bordered buttons (right column: ACHIEVEMENTS, SUPPLY DROPS)
    PINK: {
        bgColor: 'rgba(20, 15, 40, 0.95)',
        borderColor: COLORS.NEON_PINK,
        textColor: '#ffffff',
        glowColor: COLORS.NEON_PINK
    },
    // Gold/yellow buttons (kept for compatibility)
    GOLD: {
        bgColor: 'rgba(20, 15, 40, 0.95)',
        borderColor: '#F59E0B',
        textColor: '#ffffff',
        glowColor: '#F59E0B'
    },
    // Dark outlined button (OPTIONS) - subtle cyan border to match reference
    DARK: {
        bgColor: 'rgba(20, 15, 40, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.6)',
        textColor: 'rgba(255, 255, 255, 0.9)',
        glowColor: 'rgba(255, 255, 255, 0.4)'
    }
};

/**
 * Button definitions for menu
 * Layout: PLAY (wide), SURVIVAL/GARAGE, OPTIONS.
 * Secondary collection, drop, and achievement screens still exist, but are no
 * longer first-screen decisions.
 */
const menuButtons = {
    start: new Button({
        text: 'PLAY',
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 - 30,
        width: 350,  // Wide primary button
        height: 50,
        fontSize: UI.FONT_SIZE_LARGE,
        bgColor: MENU_BUTTON_STYLES.PRIMARY.bgColor,
        borderColor: MENU_BUTTON_STYLES.PRIMARY.borderColor,
        textColor: MENU_BUTTON_STYLES.PRIMARY.textColor,
        glowColor: MENU_BUTTON_STYLES.PRIMARY.glowColor,
        autoSize: false
    }),
    highScores: new Button({
        text: 'SURVIVAL',
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 30,
        width: 180,  // Half-width for paired buttons
        height: 45,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: MENU_BUTTON_STYLES.CYAN.bgColor,
        borderColor: MENU_BUTTON_STYLES.CYAN.borderColor,
        textColor: MENU_BUTTON_STYLES.CYAN.textColor,
        glowColor: MENU_BUTTON_STYLES.CYAN.glowColor,
        autoSize: false
    }),
    achievements: new Button({
        text: 'ACHIEVEMENTS',
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 30,
        width: 180,
        height: 45,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: MENU_BUTTON_STYLES.PINK.bgColor,
        borderColor: MENU_BUTTON_STYLES.PINK.borderColor,
        textColor: MENU_BUTTON_STYLES.PINK.textColor,
        glowColor: MENU_BUTTON_STYLES.PINK.glowColor,
        autoSize: false
    }),
    collection: new Button({
        text: 'GARAGE',
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 90,
        width: 180,
        height: 45,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: MENU_BUTTON_STYLES.CYAN.bgColor,
        borderColor: MENU_BUTTON_STYLES.CYAN.borderColor,
        textColor: MENU_BUTTON_STYLES.CYAN.textColor,
        glowColor: MENU_BUTTON_STYLES.CYAN.glowColor,
        autoSize: false
    }),
    supplyDrop: new Button({
        text: 'SUPPLY DROPS',
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 90,
        width: 180,
        height: 45,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: MENU_BUTTON_STYLES.PINK.bgColor,
        borderColor: MENU_BUTTON_STYLES.PINK.borderColor,
        textColor: MENU_BUTTON_STYLES.PINK.textColor,
        glowColor: MENU_BUTTON_STYLES.PINK.glowColor,
        autoSize: false
    }),
    options: new Button({
        text: 'OPTIONS',
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 150,
        width: 200,
        height: 45,
        fontSize: UI.FONT_SIZE_MEDIUM,
        bgColor: MENU_BUTTON_STYLES.DARK.bgColor,
        borderColor: MENU_BUTTON_STYLES.DARK.borderColor,
        textColor: MENU_BUTTON_STYLES.DARK.textColor,
        glowColor: MENU_BUTTON_STYLES.DARK.glowColor,
        autoSize: false
    }),
    dailyChallenges: new Button({
        text: 'CHALLENGES',
        x: 80,
        y: CANVAS.DESIGN_HEIGHT - 60,
        width: 120,
        height: 40,
        fontSize: UI.FONT_SIZE_SMALL,
        bgColor: 'rgba(255, 0, 255, 0.3)',
        borderColor: '#FF00FF',
        textColor: '#FF00FF',
        glowColor: '#FF00FF',
        autoSize: false
    }),
    dailyRewards: new Button({
        text: 'REWARDS',
        x: 200,
        y: CANVAS.DESIGN_HEIGHT - 60,
        width: 120,
        height: 40,
        fontSize: UI.FONT_SIZE_SMALL,
        bgColor: 'rgba(0, 255, 255, 0.3)',
        borderColor: '#00FFFF',
        textColor: '#00FFFF',
        glowColor: '#00FFFF',
        autoSize: false
    })
};

/**
 * Calculate adaptive menu button layout based on screen dimensions.
 * Scales button size and spacing for small screens (phones).
 * New layout: 3 rows (PLAY, secondary pair, OPTIONS)
 * @param {number} height - Available screen height
 * @param {number} width - Available screen width
 * @returns {Object} Layout configuration
 */
function calculateMenuLayout(height, width) {
    // Determine if we're on a compact screen (phone-sized)
    const isCompact = height < 500;

    // Calculate title scale FIRST since it affects titleAreaHeight
    // "SCORCHED" at 120px is approximately 850px wide (including 3D extrusion and effects)
    const titleMaxWidth = 850;  // Approximate width of "SCORCHED" at base font size
    const titleMinMargin = 40;  // Minimum horizontal margin on each side
    const titleAvailableWidth = width - (titleMinMargin * 2);

    // Scale based on width when viewport is too narrow for full-size title
    const widthBasedTitleScale = Math.min(1, titleAvailableWidth / titleMaxWidth);

    // Scale based on height for compact screens (phones)
    const heightBasedTitleScale = isCompact ? Math.max(0.5, height / 800) : 1;

    // Use the smaller of the two scales to ensure title fits both dimensions
    // Clamp between 0.4 (minimum readable) and 1.0 (maximum, current size)
    const titleScale = Math.max(0.4, Math.min(widthBasedTitleScale, heightBasedTitleScale));

    // Title area - accounts for title text above buttons (SCORCHED, EARTH, SYNTHWAVE EDITION)
    // Base values: subtitle at Y=300 with ~44px font, so bottom is ~340 (non-compact)
    // Scale the title area based on titleScale to match the scaled title positions
    const baseTitleAreaHeight = isCompact ? 280 : 360;
    const titleAreaHeight = Math.round(baseTitleAreaHeight * titleScale);

    // Footer area - for hint text and stats
    const footerAreaHeight = isCompact ? 40 : 80;

    // Calculate available space for buttons (3 rows)
    const availableHeight = height - titleAreaHeight - footerAreaHeight;

    // Default (desktop) layout values
    const defaultPrimaryHeight = 50;
    const defaultSecondaryHeight = 45;
    const defaultPrimaryWidth = 350;  // Wide START GAME button
    const defaultPairedWidth = 200;   // Half-width paired buttons (increased for better text padding)
    const defaultOptionsWidth = 180;  // OPTIONS button
    const defaultRowSpacing = 54;     // Space between rows (tighter for cohesive group)
    const defaultPairGap = 16;        // Gap between paired buttons
    const defaultFontSize = UI.FONT_SIZE_LARGE;

    // Calculate scale factor based on available height
    const numRows = 3;
    const defaultTotalHeight = (numRows - 1) * defaultRowSpacing + defaultPrimaryHeight;
    const scaleFactor = Math.min(1, availableHeight / defaultTotalHeight);

    // Apply scale with minimum values
    const minButtonHeight = 36;
    const minSpacing = 44;

    const primaryHeight = Math.max(minButtonHeight, Math.round(defaultPrimaryHeight * scaleFactor));
    const secondaryHeight = Math.max(minButtonHeight - 4, Math.round(defaultSecondaryHeight * scaleFactor));
    const rowSpacing = Math.max(minSpacing, Math.round(defaultRowSpacing * scaleFactor));

    // Width scaling based on screen width
    // Ensure minimum 30px edge margin on each side
    const minEdgeMargin = 30;
    const totalPairedWidth = defaultPairedWidth * 2 + defaultPairGap;  // 416px (200*2 + 16)
    const availableWidth = width - (minEdgeMargin * 2);

    // Scale based on the larger of primary width or paired buttons width
    const maxContentWidth = Math.max(defaultPrimaryWidth, totalPairedWidth);
    const widthScale = Math.min(1, availableWidth / maxContentWidth);

    const primaryWidth = Math.round(defaultPrimaryWidth * widthScale);
    const pairedWidth = Math.round(defaultPairedWidth * widthScale);
    const optionsWidth = Math.round(defaultOptionsWidth * widthScale);
    const pairGap = Math.max(10, Math.round(defaultPairGap * widthScale));  // Minimum 10px gap

    // Calculate font sizes - primary is larger, secondary is noticeably smaller
    const fontScale = secondaryHeight / defaultSecondaryHeight;
    const primaryFontSize = Math.max(14, Math.round((defaultFontSize + 4) * fontScale));  // Larger primary
    const secondaryFontSize = Math.max(11, Math.round((defaultFontSize - 4) * fontScale));  // Smaller secondary

    // Calculate where buttons start (bottom-anchored positioning)
    // Position button group in the bottom portion of the screen for consistent spacing from title
    const actualTotalHeight = (numRows - 1) * rowSpacing + primaryHeight;
    const buttonsAreaBottom = height - footerAreaHeight;

    // Bottom-anchored positioning with minimum top constraint
    // Ensure buttons never overlap with title area (titleAreaHeight provides minimum clearance)
    const minButtonsTop = titleAreaHeight + 20;  // Minimum 20px below title area
    const bottomThirdTop = Math.max(minButtonsTop, height * 0.55);  // Top of bottom 45%
    const bottomThirdCenter = (bottomThirdTop + buttonsAreaBottom) / 2;
    const startY = bottomThirdCenter - actualTotalHeight / 2 + primaryHeight / 2;

    return {
        primaryHeight,
        secondaryHeight,
        primaryWidth,
        pairedWidth,
        optionsWidth,
        pairGap,
        rowSpacing,
        startY,
        primaryFontSize,
        secondaryFontSize,
        scaleFactor,
        isCompact,
        titleScale,
        titleAreaHeight
    };
}

// Store current menu layout for rendering
let currentMenuLayout = null;

/**
 * Update menu button positions based on current screen dimensions.
 * Adapts layout for small screens by scaling button size and spacing.
 * New layout: 4 rows with paired buttons in the middle.
 * Should be called before rendering or hit testing menu buttons.
 */
function updateMenuButtonPositions() {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const centerX = width / 2;

    // Calculate adaptive layout
    const layout = calculateMenuLayout(height, width);
    currentMenuLayout = layout;

    // Row 0: PLAY (centered, wide)
    menuButtons.start.setPosition(centerX, layout.startY);
    menuButtons.start.setSize(layout.primaryWidth, layout.primaryHeight);
    menuButtons.start.fontSize = layout.primaryFontSize;

    // Row 1: SURVIVAL (left) and GARAGE (right)
    const row1Y = layout.startY + layout.rowSpacing;
    const pairOffset = (layout.pairedWidth + layout.pairGap) / 2;

    menuButtons.highScores.setPosition(centerX - pairOffset, row1Y);
    menuButtons.highScores.setSize(layout.pairedWidth, layout.secondaryHeight);
    menuButtons.highScores.fontSize = layout.secondaryFontSize;

    menuButtons.collection.setPosition(centerX + pairOffset, row1Y);
    menuButtons.collection.setSize(layout.pairedWidth, layout.secondaryHeight);
    menuButtons.collection.fontSize = layout.secondaryFontSize;

    // Hidden from the simplified home screen, but preserved for direct state use.
    menuButtons.achievements.setPosition(-1000, -1000);
    menuButtons.supplyDrop.setPosition(-1000, -1000);

    // Row 2: OPTIONS (centered)
    const row2Y = layout.startY + layout.rowSpacing * 2;
    menuButtons.options.setPosition(centerX, row2Y);
    menuButtons.options.setSize(layout.optionsWidth, layout.secondaryHeight);
    menuButtons.options.fontSize = layout.secondaryFontSize;

    // Daily engagement buttons - bottom left corner, positioned above Best Run card
    const dailyButtonWidth = layout.isCompact ? 75 : 95;
    const dailyButtonHeight = layout.isCompact ? 35 : 40;
    const dailyMargin = layout.isCompact ? 15 : 25;
    const dailyGap = layout.isCompact ? 6 : 8; // Gap between the two daily buttons
    // Best Run card dimensions (must match renderMenuScreen values)
    const bestCardHeight = layout.isCompact ? 40 : 50;
    const elementGap = 8; // Gap between Daily buttons and Best Run card
    // Position Daily buttons above the Best Run card
    const dailyButtonY = height - dailyMargin - bestCardHeight - elementGap - dailyButtonHeight / 2;

    // Challenges button (left)
    menuButtons.dailyChallenges.setPosition(dailyButtonWidth / 2 + dailyMargin, dailyButtonY);
    menuButtons.dailyChallenges.setSize(dailyButtonWidth, dailyButtonHeight);
    menuButtons.dailyChallenges.fontSize = layout.isCompact ? 9 : 11;

    // Rewards button (right of challenges)
    const rewardsButtonX = dailyMargin + dailyButtonWidth + dailyGap + dailyButtonWidth / 2;
    menuButtons.dailyRewards.setPosition(rewardsButtonX, dailyButtonY);
    menuButtons.dailyRewards.setSize(dailyButtonWidth, dailyButtonHeight);
    menuButtons.dailyRewards.fontSize = layout.isCompact ? 9 : 11;
}

function ensureAssetsForState(state) {
    const groups = [];

    if (
        state === GAME_STATES.PLAYING ||
        state === GAME_STATES.AIMING ||
        state === GAME_STATES.FIRING ||
        state === GAME_STATES.ROUND_TRANSITION ||
        state === GAME_STATES.LEVEL_COMPLETE
    ) {
        groups.push(Assets.ASSET_GROUPS.GAMEPLAY);
    }

    if (state === GAME_STATES.COLLECTION) {
        groups.push(Assets.ASSET_GROUPS.COLLECTION);
    }

    if (state === GAME_STATES.SHOP) {
        groups.push(Assets.ASSET_GROUPS.SHOP);
    }

    if (state === GAME_STATES.SUPPLY_DROP) {
        groups.push(Assets.ASSET_GROUPS.SUPPLY_DROP, Assets.ASSET_GROUPS.COLLECTION);
    }

    if (state === GAME_STATES.LEVEL_EDITOR || state === GAME_STATES.TANK_EDITOR) {
        groups.push(Assets.ASSET_GROUPS.EDITOR, Assets.ASSET_GROUPS.COLLECTION);
    }

    for (const group of [...new Set(groups)]) {
        void Assets.ensureAssetGroupLoaded(group);
    }
}

function registerAssetStateLoading() {
    Game.onStateChange((newState) => {
        ensureAssetsForState(newState);
    });
}

function getMenuButtonList() {
    return Object.values(menuButtons);
}

function clearMenuButtonInteractionState() {
    for (const button of getMenuButtonList()) {
        button.setHovered(false);
        button.setPressed(false);
    }
}

function updateMenuButtonHover(x, y) {
    updateMenuButtonPositions();
    for (const button of getMenuButtonList()) {
        button.handlePointerMove(x, y);
    }
}

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
    return menuButtons.start.containsPoint(x, y);
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
 * @param {{x: number, y: number}} pos - Click position in game coordinates
 */
function handleMenuClick(pos) {
    if (Game.getState() !== GAME_STATES.MENU) return;
    if (menuTransition.active) return;  // Don't allow clicks during transition

    // Ensure button positions are current for the screen size
    updateMenuButtonPositions();
    clearMenuButtonInteractionState();

    if (menuButtons.start.containsPoint(pos.x, pos.y)) {
        menuButtons.start.setPressed(true);
        Sound.playClickSound();
        startMenuTransition(GAME_STATES.LEVEL_SELECT);
    } else if (menuButtons.highScores.containsPoint(pos.x, pos.y)) {
        menuButtons.highScores.setPressed(true);
        Sound.playClickSound();
        Game.setState(GAME_STATES.DIFFICULTY_SELECT);
    } else if (menuButtons.collection.containsPoint(pos.x, pos.y)) {
        menuButtons.collection.setPressed(true);
        Sound.playClickSound();
        TankCollection.markAllTanksViewed();
        Game.setState(GAME_STATES.COLLECTION);
    } else if (menuButtons.options.containsPoint(pos.x, pos.y) && !menuButtons.options.disabled) {
        menuButtons.options.setPressed(true);
        Sound.playClickSound();
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
    const panelX = Renderer.getWidth() / 2 - panelDims.width / 2;
    const panelY = Renderer.getHeight() / 2 - panelDims.height / 2;

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

function openReleaseInfoPage(path) {
    const target = new URL(path, window.location.href);
    window.location.href = target.href;
}

/**
 * Render the synthwave background for the menu.
 * Creates a dramatic sunset gradient with grid lines.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderMenuBackground(ctx) {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
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
 * Render a styled menu button matching the design reference
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button definition with style property
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 * @param {number} badgeCount - Badge count to display (0 = no badge)
 */
function renderMenuButton(ctx, button, pulseIntensity, badgeCount = 0) {
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    const btnX = button.x - halfWidth;
    const btnY = button.y - halfHeight;

    ctx.save();

    // Determine if button is disabled
    const isDisabled = !button.enabled;

    // Get style from button (fall back to legacy color-based style)
    const style = button.style || {
        bgColor: 'rgba(26, 26, 46, 0.8)',
        borderColor: button.color || COLORS.NEON_CYAN,
        textColor: COLORS.TEXT_LIGHT,
        glowColor: button.color || COLORS.NEON_CYAN
    };

    const glowIntensity = isDisabled ? 0 : pulseIntensity;

    // Button background with rounded corners
    ctx.fillStyle = isDisabled ? 'rgba(26, 26, 46, 0.5)' : style.bgColor;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, button.width, button.height, 8);
    ctx.fill();

    // Neon border effect with outer glow (matching reference design)
    if (!isDisabled) {
        // Outer glow layer - softer, wider glow
        ctx.shadowColor = style.glowColor;
        ctx.shadowBlur = 15 + glowIntensity * 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, button.width, button.height, 8);
        ctx.stroke();

        // Inner border - crisp line without shadow
        ctx.shadowBlur = 0;
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, button.width, button.height, 8);
        ctx.stroke();
    } else {
        // Disabled button border
        ctx.strokeStyle = COLORS.TEXT_MUTED;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, button.width, button.height, 8);
        ctx.stroke();
    }

    // Reset shadow for text
    ctx.shadowBlur = 0;

    // Button text with subtle glow
    if (!isDisabled) {
        ctx.shadowColor = style.glowColor;
        ctx.shadowBlur = 4 + glowIntensity * 2;
    }
    ctx.fillStyle = isDisabled ? COLORS.TEXT_MUTED : style.textColor;
    // Use button-specific font size if available (for adaptive layouts)
    const fontSize = button.fontSize || UI.FONT_SIZE_LARGE;
    ctx.font = `bold ${fontSize}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x, button.y);

    // Add "(Coming Soon)" for disabled buttons
    if (isDisabled) {
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.fillText('(Coming Soon)', button.x, button.y + 35);
    }

    // Render badge if count > 0
    if (badgeCount > 0 && !isDisabled) {
        const badgeRadius = 12;
        const badgeX = btnX + button.width - 8;
        const badgeY = btnY + 8;

        // Badge background (red circle with glow)
        ctx.save();
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 10 + pulseIntensity * 5;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Badge border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Badge text
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const badgeText = badgeCount > 9 ? '9+' : String(badgeCount);
        ctx.fillText(badgeText, badgeX, badgeY);
        ctx.restore();
    }

    ctx.restore();
}

/**
 * Draw a compact metric tile for menu resources and progress.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} config - Tile configuration
 * @param {number} config.x - Left X
 * @param {number} config.y - Top Y
 * @param {number} config.width - Tile width
 * @param {number} config.height - Tile height
 * @param {string} config.accent - Accent/glow color
 * @param {string} config.label - Small uppercase label
 * @param {string} config.value - Primary value
 * @param {'coin'|'star'|'none'} [config.icon='none'] - Optional icon
 * @param {number} [config.pulseIntensity=0] - Pulse intensity
 */
function drawMenuMetricTile(ctx, config) {
    const {
        x,
        y,
        width,
        height,
        accent,
        label,
        value,
        icon = 'none',
        pulseIntensity = 0
    } = config;
    const radius = 8;
    const glow = 6 + pulseIntensity * 5;
    const iconSize = Math.min(20, height * 0.34);
    const hasIcon = icon !== 'none';
    const valueX = hasIcon ? x + width * 0.42 : x + 10;
    const valueY = y + height * 0.58;

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 5, width - 8, height, radius);
    ctx.fill();

    ctx.shadowColor = accent;
    ctx.shadowBlur = glow;
    ctx.fillStyle = `${accent}26`;
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, width + 4, height + 4, radius + 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const bg = ctx.createLinearGradient(0, y, 0, y + height);
    bg.addColorStop(0, `${accent}35`);
    bg.addColorStop(0.24, 'rgba(31, 25, 52, 0.94)');
    bg.addColorStop(1, 'rgba(5, 6, 18, 0.96)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();

    const sheen = ctx.createLinearGradient(x, y, x + width, y + height);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
    sheen.addColorStop(0.36, 'rgba(255, 255, 255, 0.04)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, width - 6, Math.max(5, height * 0.38), radius - 2);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, width - 6, height - 6, radius - 3);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.font = `bold 10px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + width / 2, y + 7);

    if (hasIcon) {
        const iconX = x + width * 0.27;
        const iconY = valueY - 1;
        ctx.save();
        ctx.fillStyle = icon === 'star' ? COLORS.NEON_YELLOW : '#F59E0B';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        if (icon === 'star') {
            drawStarPath(ctx, iconX, iconY, iconSize * 0.55, iconSize * 0.24);
        } else {
            ctx.arc(iconX, iconY, iconSize * 0.48, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }

    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${Math.max(14, Math.round(height * 0.28))}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = hasIcon ? 'left' : 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 3;
    ctx.fillText(value, valueX, valueY);

    ctx.restore();
}

/**
 * Build a star path.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} outerRadius - Outer radius
 * @param {number} innerRadius - Inner radius
 */
function drawStarPath(ctx, cx, cy, outerRadius, innerRadius) {
    let angle = -Math.PI / 2;
    const step = Math.PI / 5;

    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        angle += step;
    }
    ctx.closePath();
}

/**
 * Configuration for synthwave title text effect.
 * Based on docs/examples/synthwave-title-text.html
 */
const TITLE_TEXT_CONFIG = {
    extrusionDepth: 16,   // How "thick" the 3D block shadow is (doubled for larger title)
    skewX: -0.15,         // Slight italic skew for dynamic feel
    extrusionColor: '#2a003b' // Dark purple shadow color
};

/**
 * Render synthwave chrome-style title text with 3D extrusion effect.
 * Creates a chrome gradient (cyan → white → black horizon → purple → pink)
 * with 3D depth, cyan outline, and purple glow.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {string} text - Text to render
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} fontSize - Font size in pixels
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function drawSynthwaveText(ctx, text, x, y, fontSize, pulseIntensity) {
    ctx.save();

    // Apply skew transform for dynamic appearance
    ctx.translate(x, y);
    ctx.transform(1, 0, TITLE_TEXT_CONFIG.skewX, 1, 0, 0);

    ctx.font = `${fontSize}px ${UI.TITLE_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Scale extrusion depth based on font size
    const extrusionDepth = Math.round(TITLE_TEXT_CONFIG.extrusionDepth * (fontSize / 80));

    // A. THE 3D EXTRUSION (dark purple blocky shadow)
    ctx.fillStyle = TITLE_TEXT_CONFIG.extrusionColor;
    for (let i = extrusionDepth; i > 0; i--) {
        ctx.fillText(text, i * 1.5, i * 1.5);
    }

    // B. THE CHROME GRADIENT (vertical gradient spanning text height)
    const gradient = ctx.createLinearGradient(0, -fontSize / 2, 0, fontSize / 2);
    gradient.addColorStop(0.0, '#00ffff');    // Top: Cyan/Electric Blue
    gradient.addColorStop(0.45, '#ffffff');   // Middle-Top: White horizon
    gradient.addColorStop(0.5, '#000000');    // Sharp Horizon Line
    gradient.addColorStop(0.55, '#bd00ff');   // Middle-Bottom: Deep Purple
    gradient.addColorStop(1.0, '#ff00cc');    // Bottom: Hot Pink

    // Draw the gradient face
    ctx.fillStyle = gradient;
    ctx.fillText(text, 0, 0);

    // C. THE OUTLINE & GLOW
    ctx.lineWidth = 2 + (fontSize / 40);
    ctx.strokeStyle = '#00ffff'; // Cyan outline
    ctx.shadowColor = '#bd00ff'; // Purple glow
    ctx.shadowBlur = 15 + pulseIntensity * 10;
    ctx.strokeText(text, 0, 0);

    // Reset shadow
    ctx.shadowBlur = 0;

    // D. REFLECTION/SHINE (subtle white overlay)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillText(text, 0, 0);

    ctx.restore();
}

/**
 * Render the glowing neon subtitle.
 * Creates a hot pink/red glow effect with yellow stroke.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {string} text - Text to render
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} fontSize - Font size in pixels
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function drawNeonSubtitle(ctx, text, x, y, fontSize, pulseIntensity) {
    ctx.save();

    // Apply same skew as main title for consistency
    ctx.translate(x, y);
    ctx.transform(1, 0, TITLE_TEXT_CONFIG.skewX, 1, 0, 0);

    ctx.font = `${fontSize}px ${UI.TITLE_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Neon Red/Orange Glow
    ctx.shadowColor = '#ff3300';
    ctx.shadowBlur = 12 + pulseIntensity * 8;
    ctx.strokeStyle = '#ffcc00'; // Yellow stroke
    ctx.lineWidth = 2;
    ctx.strokeText(text, 0, 0);

    // Solid fill inside
    ctx.fillStyle = '#ff0055'; // Hot pink/red
    ctx.shadowBlur = 0; // Remove blur for sharp fill
    ctx.fillText(text, 0, 0);

    ctx.restore();
}

/**
 * Render the menu screen with full synthwave styling.
 * Updated to match design reference with chrome title, paired buttons, and corner stats.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderMenu(ctx) {
    const result = renderMenuScene(ctx, {
        animationTime: menuAnimationTime,
        menuTransition,
        currentMenuLayout,
        updateMenuButtonPositions,
        width: Renderer.getWidth(),
        height: Renderer.getHeight(),
        calculateMenuLayout,
        titleSceneIsActive: TitleScene.isActive,
        clearTransparent: Renderer.clearTransparent,
        getViewportDimensions: Renderer.getViewportDimensions,
        getDevicePixelRatio: Renderer.getDevicePixelRatio,
        renderMenuBackground,
        drawSynthwaveText,
        drawNeonSubtitle,
        drawMenuMetricTile,
        menuButtons,
        getTokenBalance: Tokens.getTokenBalance,
        getBestRoundCount: HighScores.getBestRoundCount,
        getTotalStars: Stars.getTotalStars,
        colors: COLORS,
        setState: Game.setState,
        optionsOverlayVisible,
        renderOptionsOverlay,
        engagementUpdate: EngagementUI.update,
        engagementRender: EngagementUI.render,
        renderCrtEffects,
        getCrtFullscreenParams
    });

    menuAnimationTime = result.animationTime;
}

/**
 * Render the options overlay with volume controls.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderOptionsOverlay(ctx) {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();

    // Draw dark overlay in viewport coordinates to cover entire screen (including letterbox)
    const viewport = Renderer.getViewportDimensions();
    const dpr = Renderer.getDevicePixelRatio();

    ctx.save();
    // Reset to viewport coordinates (no game content transform)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Semi-transparent dark overlay - covers entire viewport
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    ctx.restore();

    ctx.save();

    // Render volume controls panel (in design coordinates)
    VolumeControls.render(ctx);

    // Close hint at bottom
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Press ESC or click outside to close', width / 2, height - 30);

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
            if (fromState === GAME_STATES.LEVEL_EDITOR || fromState === GAME_STATES.TANK_EDITOR) {
                isLevelMode = false;
                currentLevelId = null;
                currentLevelData = null;
                clearLevelEditorPlaytestState();
            }
            // Play menu music
            Music.playForState(GAME_STATES.MENU);
            // Start animated 3D title scene
            TitleScene.start();
            const didScheduleNameEntry = scheduleDeferredNameEntryIfNeeded();

            // Keep the home screen calm: no automatic daily reward modal.
            void didScheduleNameEntry;
        },
        onExit: (toState) => {
            console.log('Exiting MENU state');
            // Close options overlay if open
            if (optionsOverlayVisible) {
                optionsOverlayVisible = false;
                VolumeControls.reset();
            }
            clearMenuButtonInteractionState();
            // Keep TitleScene running for mode select and difficulty select (seamless visual transition)
            // Stop it only when going to other states
            if (toState !== GAME_STATES.MODE_SELECT && toState !== GAME_STATES.DIFFICULTY_SELECT) {
                TitleScene.stop();
            }
        },
        render: renderMenu
    });

    // Register click handler for menu interactions
    // Note: onMouseDown callback receives (x, y, button) - coordinates first
    Input.onMouseDown((x, y, button) => {
        if (Game.getState() !== GAME_STATES.MENU) return;

        // Check engagement UI first (daily rewards popup, challenge panel)
        if (EngagementUI.isActive()) {
            EngagementUI.handlePointerDown(x, y);
            return;
        }

        // Check name entry modal first (has highest priority)
        if (NameEntry.isOpen()) {
            NameEntry.handleClick({ x, y });
            return;
        }

        // Check options overlay next
        if (optionsOverlayVisible) {
            handleOptionsOverlayClick({ x, y });
            return;
        }

        handleMenuClick({ x, y });
    });

    // Register touch handler for menu interactions
    Input.onTouchStart((x, y) => {
        if (Game.getState() !== GAME_STATES.MENU) return;

        // Check engagement UI first (daily rewards popup, challenge panel)
        if (EngagementUI.isActive()) {
            EngagementUI.handlePointerDown(x, y);
            return;
        }

        // Check name entry modal first (has highest priority)
        if (NameEntry.isOpen()) {
            NameEntry.handleClick({ x, y });
            return;
        }

        // Check options overlay next
        if (optionsOverlayVisible) {
            handleOptionsOverlayClick({ x, y });
            return;
        }

        handleMenuClick({ x, y });
    });

    // Register pointer move for slider dragging
    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.MENU && EngagementUI.isActive()) {
            EngagementUI.handlePointerMove(x, y);
        }
        if (Game.getState() === GAME_STATES.MENU && optionsOverlayVisible) {
            VolumeControls.handlePointerMove(x, y);
        }
        if (Game.getState() === GAME_STATES.MENU && !EngagementUI.isActive() && !optionsOverlayVisible && !NameEntry.isOpen()) {
            updateMenuButtonHover(x, y);
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.MENU && EngagementUI.isActive()) {
            EngagementUI.handlePointerMove(x, y);
        }
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

            // Space/Enter starts the primary level journey.
            if (!optionsOverlayVisible && (keyCode === 'Space' || keyCode === 'Enter')) {
                Game.setState(GAME_STATES.LEVEL_SELECT);
            }
        }
    });
}

// =============================================================================
// MODE SELECTION STATE
// =============================================================================

/**
 * User's preferred game mode (persisted to localStorage).
 * @type {'level'|'endless'|null}
 */
let preferredGameMode = null;

/**
 * Animation time for mode selection screen effects.
 * @type {number}
 */
let modeSelectAnimationTime = 0;

/**
 * Load preferred game mode from localStorage.
 */
function loadPreferredGameMode() {
    try {
        const saved = localStorage.getItem('scorched_earth_preferred_mode');
        if (saved === 'level' || saved === 'endless') {
            preferredGameMode = saved;
        } else {
            preferredGameMode = 'level'; // Default to level mode
        }
    } catch (e) {
        preferredGameMode = 'level';
    }
}

/**
 * Save preferred game mode to localStorage.
 * @param {'level'|'endless'} mode - The mode to save
 */
function savePreferredGameMode(mode) {
    try {
        localStorage.setItem('scorched_earth_preferred_mode', mode);
        preferredGameMode = mode;
    } catch (e) {
        console.warn('Failed to save preferred game mode:', e);
    }
}

/**
 * Mode selection button configurations.
 */
const modeButtonConfigs = {
    level: {
        title: 'LEVEL MODE',
        description: '60 levels • Earn stars • Unlock worlds',
        subtitle: 'Recommended',
        color: COLORS.NEON_CYAN
    },
    endless: {
        title: 'ENDLESS MODE',
        description: 'Classic roguelike • How far can you go?',
        subtitle: '',
        color: COLORS.NEON_PINK
    }
};

/**
 * Button instances for mode selection.
 */
const modeButtons = {
    level: new Button({
        text: '',
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 - 60,
        width: 400,
        height: 100,
        fontSize: UI.FONT_SIZE_LARGE,
        borderColor: COLORS.NEON_CYAN,
        glowColor: COLORS.NEON_CYAN,
        textColor: COLORS.TEXT_LIGHT
    }),
    endless: new Button({
        text: '',
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 60,
        width: 400,
        height: 100,
        fontSize: UI.FONT_SIZE_LARGE,
        borderColor: COLORS.NEON_PINK,
        glowColor: COLORS.NEON_PINK,
        textColor: COLORS.TEXT_LIGHT
    })
};

/**
 * Back button for mode selection screen.
 */
const modeSelectBackButton = new Button({
    text: '← BACK',
    x: CANVAS.DESIGN_WIDTH / 2,
    y: CANVAS.DESIGN_HEIGHT - 80,
    width: 200,
    height: 50,
    fontSize: UI.FONT_SIZE_MEDIUM,
    borderColor: COLORS.TEXT_MUTED,
    glowColor: COLORS.TEXT_MUTED,
    textColor: COLORS.TEXT_MUTED
});

/**
 * Update mode selection button positions for responsive layout.
 */
function updateModeSelectButtonPositions() {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const centerX = width / 2;

    // Calculate button dimensions based on screen size
    const isCompact = height < 600;
    const buttonWidth = isCompact ? 320 : 400;
    const buttonHeight = isCompact ? 80 : 100;
    const buttonGap = isCompact ? 20 : 30;

    // Center the buttons vertically
    const totalHeight = buttonHeight * 2 + buttonGap;
    const startY = (height - totalHeight) / 2;

    modeButtons.level.setPosition(centerX, startY + buttonHeight / 2);
    modeButtons.level.setSize(buttonWidth, buttonHeight);

    modeButtons.endless.setPosition(centerX, startY + buttonHeight + buttonGap + buttonHeight / 2);
    modeButtons.endless.setSize(buttonWidth, buttonHeight);

    // Position back button
    modeSelectBackButton.setPosition(centerX, height - 60);
    modeSelectBackButton.setSize(isCompact ? 150 : 200, isCompact ? 40 : 50);
}

/**
 * Render a mode selection button with custom two-line text.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} key - Button key ('level' or 'endless')
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderModeButton(ctx, key, pulseIntensity) {
    const button = modeButtons[key];
    const config = modeButtonConfigs[key];

    // Render button background and border
    button.render(ctx, pulseIntensity);

    ctx.save();

    // Render "Recommended" badge for level mode
    if (config.subtitle) {
        ctx.fillStyle = config.color;
        ctx.font = `bold 11px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = config.color;
        ctx.shadowBlur = 6;
        ctx.fillText(config.subtitle.toUpperCase(), button.x, button.y - 28);
        ctx.shadowBlur = 0;
    }

    // Render title text
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE + 2}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = button.glowColor;
    ctx.shadowBlur = 4 + pulseIntensity * 2;
    ctx.fillText(config.title, button.x, button.y - (config.subtitle ? 6 : 10));
    ctx.shadowBlur = 0;

    // Render description text
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(config.description, button.x, button.y + 18);

    ctx.restore();
}

/**
 * Render the mode selection screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderModeSelect(ctx) {
    updateModeSelectButtonPositions();

    const width = Renderer.getWidth();
    const height = Renderer.getHeight();

    modeSelectAnimationTime += 16;
    const pulseIntensity = (Math.sin(modeSelectAnimationTime * 0.003) + 1) / 2;

    ctx.save();

    // TitleScene provides 3D background - add overlay for readability
    const overlayGradient = ctx.createLinearGradient(0, 0, 0, height);
    overlayGradient.addColorStop(0, 'rgba(10, 10, 26, 0.5)');
    overlayGradient.addColorStop(0.5, 'rgba(10, 10, 26, 0.2)');
    overlayGradient.addColorStop(1, 'rgba(10, 10, 26, 0.5)');
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_TITLE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 10 + pulseIntensity * 5;
    ctx.fillText('SELECT MODE', width / 2, 100);
    ctx.shadowBlur = 0;

    // Render mode buttons
    renderModeButton(ctx, 'level', pulseIntensity);
    renderModeButton(ctx, 'endless', pulseIntensity);

    // Render back button
    modeSelectBackButton.render(ctx, pulseIntensity);

    // Render total stars indicator in corner
    const totalStars = Stars.getTotalStars();
    if (totalStars > 0) {
        const starX = width - 80;
        const starY = 40;

        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
        ctx.beginPath();
        ctx.roundRect(starX - 35, starY - 18, 70, 36, 8);
        ctx.fill();

        ctx.strokeStyle = COLORS.NEON_YELLOW;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.NEON_YELLOW;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Star icon
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', starX - 15, starY);

        // Star count
        ctx.fillStyle = COLORS.TEXT_LIGHT;
        ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillText(`${totalStars}`, starX - 2, starY);
        ctx.restore();
    }

    ctx.restore();

    // Render CRT effects (fullscreen)
    renderCrtEffects(ctx, width, height, getCrtFullscreenParams());
}

/**
 * Handle click on mode selection screen.
 * @param {{x: number, y: number}} pos - Click position
 */
function handleModeSelectClick(pos) {
    if (Game.getState() !== GAME_STATES.MODE_SELECT) return;

    updateModeSelectButtonPositions();

    if (modeButtons.level.containsPoint(pos.x, pos.y)) {
        Sound.playClickSound();
        savePreferredGameMode('level');
        // Go to level select screen
        Game.setState(GAME_STATES.LEVEL_SELECT);
    } else if (modeButtons.endless.containsPoint(pos.x, pos.y)) {
        Sound.playClickSound();
        savePreferredGameMode('endless');
        // Go to difficulty select for endless mode
        Game.setState(GAME_STATES.DIFFICULTY_SELECT);
    } else if (modeSelectBackButton.containsPoint(pos.x, pos.y)) {
        Sound.playClickSound();
        Game.setState(GAME_STATES.MENU);
    }
}

/**
 * Setup mode selection state handlers.
 */
function setupModeSelectState() {
    // Load preferred mode on startup
    loadPreferredGameMode();

    Game.registerStateHandlers(GAME_STATES.MODE_SELECT, {
        onEnter: (fromState) => {
            console.log('Entered MODE_SELECT state');
            modeSelectAnimationTime = 0;
            // Ensure TitleScene is running
            if (!TitleScene.isActive()) {
                TitleScene.start();
            }
        },
        onExit: (toState) => {
            console.log('Exiting MODE_SELECT state');
            // Keep TitleScene running for MENU, LEVEL_SELECT, DIFFICULTY_SELECT
            if (toState !== GAME_STATES.MENU &&
                toState !== GAME_STATES.LEVEL_SELECT &&
                toState !== GAME_STATES.DIFFICULTY_SELECT) {
                TitleScene.stop();
            }
        },
        render: renderModeSelect
    });

    // Register click handler
    Input.onMouseDown((x, y, button) => {
        if (Game.getState() === GAME_STATES.MODE_SELECT && button === 0) {
            handleModeSelectClick({ x, y });
        }
    });

    // Register touch handler
    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.MODE_SELECT) {
            handleModeSelectClick({ x, y });
        }
    });

    // Handle keyboard - Escape to go back
    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.MODE_SELECT) {
            if (keyCode === 'Escape') {
                Sound.playClickSound();
                Game.setState(GAME_STATES.MENU);
            }
        }
    });
}

// =============================================================================
// DIFFICULTY SELECTION STATE
// =============================================================================

/**
 * Selected difficulty level (persists across rounds until new game from menu).
 * @type {string|null}
 */
let selectedDifficulty = null;

/**
 * Difficulty selection button definitions using Button component.
 * Each entry includes the Button instance plus metadata (difficulty level, description).
 */
const difficultyButtonConfigs = {
    easy: {
        difficulty: 'easy',
        title: 'EASY',
        description: 'Relaxed gameplay • AI makes more mistakes',
        color: '#00ff88'  // Green - for description text
    },
    medium: {
        difficulty: 'medium',
        title: 'MEDIUM',
        description: 'Balanced challenge • AI compensates for wind',
        color: '#ffff00'  // Yellow - for description text
    },
    hard: {
        difficulty: 'hard',
        title: 'HARD',
        description: 'Brutal precision • AI rarely misses',
        color: '#ff4444'  // Red - for description text
    }
};

/**
 * Button component instances for difficulty selection.
 * Created once, positions updated dynamically.
 */
const difficultyButtons = {
    easy: new Button({
        text: '',  // Empty - we render custom two-line text in renderDifficultyButton
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 - 90,
        width: 380,
        height: 80,
        fontSize: UI.FONT_SIZE_LARGE,
        borderColor: '#00ff88',
        glowColor: '#00ff88',
        textColor: COLORS.TEXT_LIGHT
    }),
    medium: new Button({
        text: '',  // Empty - we render custom two-line text in renderDifficultyButton
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2,
        width: 380,
        height: 80,
        fontSize: UI.FONT_SIZE_LARGE,
        borderColor: '#ffff00',
        glowColor: '#ffff00',
        textColor: COLORS.TEXT_LIGHT
    }),
    hard: new Button({
        text: '',  // Empty - we render custom two-line text in renderDifficultyButton
        x: CANVAS.DESIGN_WIDTH / 2,
        y: CANVAS.DESIGN_HEIGHT / 2 + 90,
        width: 380,
        height: 80,
        fontSize: UI.FONT_SIZE_LARGE,
        borderColor: '#ff4444',
        glowColor: '#ff4444',
        textColor: COLORS.TEXT_LIGHT
    })
};

/**
 * Back button for difficulty selection screen using Button component.
 */
const difficultyBackButton = new Button({
    text: '← BACK',
    x: CANVAS.DESIGN_WIDTH / 2,
    y: CANVAS.DESIGN_HEIGHT - 80,
    width: 200,
    height: 50,
    fontSize: UI.FONT_SIZE_MEDIUM,
    borderColor: COLORS.TEXT_MUTED,
    glowColor: COLORS.TEXT_MUTED,
    textColor: COLORS.TEXT_MUTED
});

/**
 * Update difficulty button positions based on current screen dimensions.
 * Should be called before rendering or hit testing difficulty buttons.
 */
function updateDifficultyButtonPositions() {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const centerX = width / 2;
    const centerY = height / 2;

    difficultyButtons.easy.setPosition(centerX, centerY - 90);
    difficultyButtons.medium.setPosition(centerX, centerY);
    difficultyButtons.hard.setPosition(centerX, centerY + 90);
    difficultyBackButton.setPosition(centerX, height - 80);
}

/**
 * Animation time for difficulty selection screen.
 */
let difficultyAnimationTime = 0;

/**
 * Handle click on difficulty selection screen.
 * @param {{x: number, y: number}} pos - Click position in game coordinates
 */
function handleDifficultyClick(pos) {
    if (Game.getState() !== GAME_STATES.DIFFICULTY_SELECT) return;

    // Ensure button positions are current for the screen size
    updateDifficultyButtonPositions();

    // Check difficulty buttons (using Button component's containsPoint)
    for (const key of Object.keys(difficultyButtons)) {
        const button = difficultyButtons[key];
        if (button.containsPoint(pos.x, pos.y)) {
            // Play click sound
            Sound.playClickSound();
            // Set the selected difficulty from config
            selectedDifficulty = difficultyButtonConfigs[key].difficulty;
            console.log(`[Main] Player selected difficulty: ${selectedDifficulty}`);
            // Start the game
            Game.setState(GAME_STATES.PLAYING);
            return;
        }
    }

    // Check back button (using Button component's containsPoint)
    if (difficultyBackButton.containsPoint(pos.x, pos.y)) {
        Sound.playClickSound();
        Game.setState(GAME_STATES.MODE_SELECT);
    }
}

/**
 * Render a difficulty selection button with title and description text.
 * Uses Button component for background/border, then custom text layout for two-line content.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {string} key - Button key (easy, medium, hard)
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderDifficultyButton(ctx, key, pulseIntensity) {
    const button = difficultyButtons[key];
    const config = difficultyButtonConfigs[key];

    // Render button background and border (but text will be overwritten)
    button.render(ctx, pulseIntensity);

    // Render title text (shifted up from center to make room for description)
    ctx.save();
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Subtle glow on title text
    ctx.shadowColor = button.glowColor;
    ctx.shadowBlur = 4 + pulseIntensity * 2;
    ctx.fillText(config.title, button.x, button.y - 12);
    ctx.restore();

    // Render description text below title (inside button bounds)
    ctx.save();
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `${UI.FONT_SIZE_SMALL + 2}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Add subtle shadow for contrast
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(config.description, button.x, button.y + 16);
    ctx.restore();
}

/**
 * Render the difficulty selection screen.
 * Uses the same synthwave background as the menu.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderDifficultySelect(ctx) {
    // Update button positions for current screen size
    updateDifficultyButtonPositions();

    // Get dynamic screen dimensions
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();

    // Update animation time
    difficultyAnimationTime += 16;  // Approximate 60fps frame time

    // Calculate pulse intensity for glowing effects (0-1, oscillating)
    const pulseIntensity = (Math.sin(difficultyAnimationTime * 0.003) + 1) / 2;

    ctx.save();

    // TitleScene provides the 3D animated background (same as menu screen)
    // We only need a subtle overlay to improve readability of UI elements
    const overlayGradient = ctx.createLinearGradient(0, 0, 0, height);
    overlayGradient.addColorStop(0, 'rgba(10, 10, 26, 0.5)');
    overlayGradient.addColorStop(0.5, 'rgba(10, 10, 26, 0.2)');
    overlayGradient.addColorStop(1, 'rgba(10, 10, 26, 0.5)');
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, width, height);

    // Title with neon glow effect
    const titleY = 120;

    ctx.save();
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 20 + pulseIntensity * 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `bold 48px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.fillText('SELECT DIFFICULTY', width / 2, titleY);
    ctx.restore();

    // Render difficulty buttons using Button component
    for (const key of Object.keys(difficultyButtons)) {
        renderDifficultyButton(ctx, key, pulseIntensity);
    }

    // Render back button using Button component
    difficultyBackButton.render(ctx, pulseIntensity);

    // Neon frame around the screen (same as menu)
    ctx.save();
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    ctx.restore();

    ctx.restore();

    // Render CRT effects as final post-processing overlay (fullscreen)
    renderCrtEffects(ctx, width, height, getCrtFullscreenParams());
}

/**
 * Setup difficulty selection state handlers.
 */
function setupDifficultySelectState() {
    // Register difficulty select state handlers
    Game.registerStateHandlers(GAME_STATES.DIFFICULTY_SELECT, {
        onEnter: (fromState) => {
            console.log('Entered DIFFICULTY_SELECT state');
            difficultyAnimationTime = 0;
            // Ensure TitleScene is running (in case we arrived from non-MENU state)
            if (!TitleScene.isActive()) {
                TitleScene.start();
            }
        },
        onExit: (toState) => {
            console.log('Exiting DIFFICULTY_SELECT state');
            // Keep TitleScene running if going back to MENU or MODE_SELECT (seamless transition)
            // Stop it when going to PLAYING or other states
            if (toState !== GAME_STATES.MENU && toState !== GAME_STATES.MODE_SELECT) {
                TitleScene.stop();
            }
        },
        render: renderDifficultySelect
    });

    // Register click handler for difficulty selection
    Input.onMouseDown((x, y, button) => {
        if (Game.getState() === GAME_STATES.DIFFICULTY_SELECT && button === 0) {
            handleDifficultyClick({ x, y });
        }
    });

    // Register touch handler for difficulty selection
    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.DIFFICULTY_SELECT) {
            handleDifficultyClick({ x, y });
        }
    });

    // Handle keyboard - Escape to go back
    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.DIFFICULTY_SELECT) {
            if (keyCode === 'Escape') {
                Sound.playClickSound();
                Game.setState(GAME_STATES.MODE_SELECT);
            }
        }
    });
}

/**
 * Get the player-selected difficulty level.
 * @returns {string|null} Selected difficulty or null if not selected
 */
function getSelectedDifficulty() {
    return selectedDifficulty;
}

/**
 * Reset the selected difficulty (called when returning to menu).
 */
function resetSelectedDifficulty() {
    selectedDifficulty = null;
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

    // Record stats for player shots only
    if (tank === playerTank) {
        recordStat('shotFired');
        recordStat('weaponUsed', firedWeaponId);

        // Level mode: track shots for accuracy calculation
        if (isLevelMode) {
            levelModeStats.shotsFired++;
            levelModeStats.turnsUsed++;
        }

        // Track nuclear weapon launches specifically
        if (weapon && weapon.type === WEAPON_TYPES.NUCLEAR) {
            recordStat('nukeLaunched');
        }

        // Precision achievement: track shot fired
        PrecisionAchievements.onPlayerShotFired();

        // Weapon achievement: track weapon used
        WeaponAchievements.onWeaponFired(firedWeaponId);
    }

    // Play fire sound
    Sound.playFireSound();

    // Haptic feedback for firing (mobile devices)
    Haptics.hapticFire();

    console.log(`Projectile fired from ${tank.team} at angle ${tank.angle}°, power ${tank.power}% (${weapon ? weapon.name : firedWeaponId}, ammo: ${ammoDisplay})`);
    return true;
}

/**
 * Handle a single projectile's explosion (on terrain or tank hit).
 * Creates crater, applies damage, updates tank positions.
 * Triggers special effects for nuclear weapons.
 * Returns any chain reaction projectiles that should be spawned.
 *
 * @param {import('./projectile.js').Projectile} projectile - The projectile that exploded
 * @param {{x: number, y: number}} pos - Impact position
 * @param {import('./tank.js').Tank|null} directHitTank - Tank that was directly hit, or null for terrain hit
 * @returns {import('./projectile.js').Projectile[]} Chain reaction projectiles to spawn, or empty array
 */
function handleProjectileExplosion(projectile, pos, directHitTank) {
    return resolveProjectileImpact({
        projectile,
        pos,
        directHitTank,
        playerTank,
        enemyTank,
        currentTerrain,
        isLevelMode,
        levelModeStats,
        tracerTrailDuration: TRACER_TRAIL_DURATION,
        services: {
            destroyTerrainAt,
            updateTankTerrainPosition,
            rebuildTerrainCellGrid,
            markTerrainDirty: markPixiTerrainLayerDirty,
            setExplosionEffect: effect => {
                explosionEffect = effect;
            },
            addPersistentTrail: trail => {
                persistentTrails.push(trail);
            },
            createFalloutZone,
            createFireZone,
            createGravityWell
        }
    });
}

function triggerPuzzleObjectImpactEffect(puzzleHit) {
    const pos = puzzleHit.pos || puzzleHit.object;
    if (!pos) return;

    explosionEffect = {
        active: true,
        x: pos.x,
        y: pos.y,
        radius: puzzleHit.type === 'bunker-hit' ? 28 : 22,
        startTime: performance.now(),
        duration: 260,
        isNuclear: false,
        hasMushroomCloud: false
    };

    screenShakeForBlastRadius(24);
    Sound.playHitSound();
    Haptics.hapticExplosion(24);
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
            const digResult = projectile.updateDigging(currentTerrain, tanks, {
                destroyTerrainAt
            });

            if (digResult && digResult.explode) {
                console.log(`Digger exploded: ${digResult.reason} at (${projectile.x.toFixed(1)}, ${projectile.y.toFixed(1)})`);
                const hitTank = digResult.hitTank || null;
                const chainChildren = handleProjectileExplosion(projectile, projectile.getPosition(), hitTank);
                newChildren.push(...chainChildren);
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

        // Handle deployed projectiles (Land Mine, Sticky Bomb)
        if (projectile.isDeployed) {
            // Check for trigger conditions
            const deployResult = projectile.updateDeployed(tanks);

            if (deployResult && deployResult.explode) {
                console.log(`${projectile.weaponId} triggered: ${deployResult.reason} at (${projectile.x.toFixed(1)}, ${projectile.y.toFixed(1)})`);
                const hitTank = deployResult.hitTank || null;
                const chainChildren = handleProjectileExplosion(projectile, projectile.getPosition(), hitTank);
                newChildren.push(...chainChildren);
                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }

            continue; // Skip normal physics for deployed projectiles
        }

        // Handle rolling projectiles differently
        if (projectile.isRolling) {
            // Check for tank collision while rolling
            const pos = projectile.getPosition();
            const tankHit = checkTankCollision(pos.x, pos.y, tanks, {
                owner: projectile.owner,
                canHitOwner: projectile.canHitOwner()
            });
            if (tankHit) {
                const { tank } = tankHit;
                console.log(`Roller hit ${tank.team} tank!`);
                const chainChildren = handleProjectileExplosion(projectile, pos, tank);
                newChildren.push(...chainChildren);
                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }

            // Update rolling physics
            const rollResult = projectile.updateRolling(currentTerrain);
            if (rollResult && rollResult.explode) {
                console.log(`Roller exploded: ${rollResult.reason} at (${projectile.x.toFixed(1)}, ${projectile.y.toFixed(1)})`);
                const chainChildren = handleProjectileExplosion(projectile, projectile.getPosition(), null);
                newChildren.push(...chainChildren);
                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }

            // Check for tank collision again after moving
            const newPos = projectile.getPosition();
            const tankHitAfterMove = checkTankCollision(newPos.x, newPos.y, tanks, {
                owner: projectile.owner,
                canHitOwner: projectile.canHitOwner()
            });
            if (tankHitAfterMove) {
                const { tank } = tankHitAfterMove;
                console.log(`Roller hit ${tank.team} tank after moving!`);
                const chainChildren = handleProjectileExplosion(projectile, newPos, tank);
                newChildren.push(...chainChildren);
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
            console.log('Projectile at apex - splitting!');

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
        const puzzleHit = resolvePuzzleObjectCollision(
            projectile,
            currentPuzzleObjects,
            WeaponRegistry.getWeapon(projectile.weaponId)
        );
        if (puzzleHit) {
            if (puzzleHit.continueFlight) {
                console.log(`[Main] Projectile interacted with ${puzzleHit.type}`);
                continue;
            }

            if (puzzleHit.block) {
                console.log(`[Main] Projectile blocked by ${puzzleHit.type}`);
                triggerPuzzleObjectImpactEffect(puzzleHit);
                projectile.deactivate();
                projectile.clearTrail();
                toRemove.push(projectile);
                continue;
            }
        }

        // Check for tank collision
        // Pass owner info to prevent immediate self-collision at low angles
        const tankHit = checkTankCollision(pos.x, pos.y, tanks, {
            owner: projectile.owner,
            canHitOwner: projectile.canHitOwner()
        });
        if (tankHit) {
            const { tank } = tankHit;
            const chainChildren = handleProjectileExplosion(projectile, pos, tank);
            newChildren.push(...chainChildren);

            projectile.deactivate();
            projectile.clearTrail();
            toRemove.push(projectile);
            continue;
        }

        // Check for terrain collision
        if (currentTerrain) {
            const collision = currentTerrain.checkTerrainCollision(pos.x, pos.y);

            if (collision && collision.hit) {
                // Check if this is a bouncing weapon that should bounce
                if (projectile.shouldBounce()) {
                    // Calculate terrain slope at collision point for realistic bounce
                    const slopeAngle = getTerrainGridSlopeAngle(currentTerrain, collision.x, 5);

                    console.log(`Bouncer hit terrain at (${collision.x}, ${collision.y.toFixed(1)}) - bouncing! Slope angle: ${(slopeAngle * 180 / Math.PI).toFixed(1)}°`);
                    projectile.bounce(collision.y, slopeAngle);

                    // Precision achievement: projectile touched terrain (for Trick Shot)
                    if (projectile.owner === 'player') {
                        PrecisionAchievements.onProjectileTouchedTerrain();
                    }

                    continue; // Continue to next frame, don't explode yet
                }

                // Check if this is a deployable weapon (Land Mine, Sticky Bomb)
                if (projectile.shouldDeploy()) {
                    console.log(`${projectile.weaponId} hit terrain at (${collision.x}, ${collision.y.toFixed(1)}) - deploying!`);
                    projectile.deploy(pos.x, collision.y);

                    // Precision achievement: projectile touched terrain (for Trick Shot)
                    if (projectile.owner === 'player') {
                        PrecisionAchievements.onProjectileTouchedTerrain();
                    }

                    continue; // Continue to next frame, don't explode yet
                }

                // Check if this is a rolling weapon that should enter rolling mode
                if (projectile.shouldRoll()) {
                    console.log(`Roller hit terrain at (${collision.x}, ${collision.y.toFixed(1)}) - starting roll!`);
                    projectile.startRolling(collision.y);

                    // Precision achievement: projectile touched terrain (for Trick Shot)
                    if (projectile.owner === 'player') {
                        PrecisionAchievements.onProjectileTouchedTerrain();
                    }

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
                const chainChildren = handleProjectileExplosion(projectile, pos, null);
                newChildren.push(...chainChildren);

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
 * Check if the round has ended (one or both tanks destroyed).
 * Implements permadeath: player destruction ends the run immediately.
 * - Draw (both destroyed): GAME_OVER (player tank destroyed = run ends)
 * - Player only destroyed: GAME_OVER (run ends)
 * - Enemy only destroyed: VICTORY (continue to next round)
 */
function checkRoundEnd() {
    const playerDestroyed = playerTank && playerTank.health <= 0;
    const enemyDestroyed = enemyTank && enemyTank.health <= 0;

    // Record onboarding progress once a round reaches a terminal result.
    if (playerDestroyed || enemyDestroyed) {
        markFirstRoundCompleted();
    }

    if (isLevelMode && currentLevelData && playerDestroyed) {
        showLevelFailure(enemyDestroyed);
        return;
    }

    // Check for draw condition first (both tanks destroyed)
    // In roguelike mode, draw counts as player loss since player tank is destroyed
    if (playerDestroyed && enemyDestroyed) {
        console.log('[Main] Both tanks destroyed - MUTUAL DESTRUCTION (GAME OVER)!');

        // Hidden achievement detection: both tanks destroyed (Mutual Destruction)
        HiddenAchievements.onRoundEndCheck(playerDestroyed, enemyDestroyed);

        // Combat achievement detection: round lost (draw counts as loss)
        CombatAchievements.onRoundLost();

        // Token system: round loss resets win streak
        Tokens.onRoundLoss();

        // Performance tracking: round lost (draw counts as loss)
        PerformanceTracking.onRoundEnd(false);

        // Lifetime stats: record loss (draw counts as loss)
        LifetimeStats.recordLoss({ roundNumber: currentRound });

        // End the run and finalize stats (draw counts as loss)
        endRunState(true);

        // Show game over screen with draw indicator
        // Stats are fetched from runState module automatically
        GameOver.show({
            rounds: currentRound,
            draw: true,
            delay: 1200
        });

        // Haptic feedback for defeat (mobile devices)
        Haptics.hapticDefeat();

        // Transition to game over state (terminal - run has ended)
        Game.setState(GAME_STATES.GAME_OVER);
        return;
    }

    if (enemyDestroyed) {
        // Player wins this round!
        console.log('[Main] Enemy destroyed - VICTORY!');

        // Combat achievement detection: enemy destroyed and round won
        CombatAchievements.onEnemyDestroyed(enemyTank);
        CombatAchievements.onRoundWon(playerTank ? playerTank.health : 0);

        // Weapon achievement: enemy killed (for weapon kill credit)
        WeaponAchievements.onEnemyKilled(enemyTank);

        // Weapon achievement: round won (for Basic Training detection)
        WeaponAchievements.onRoundWon();

        // Hidden achievement: round won (Patient Zero, Against All Odds, Minimalist)
        HiddenAchievements.onRoundWon(currentRound, playerTank ? playerTank.inventory : null);

        // Token system: award tokens for round win
        const combatState = CombatAchievements.getState();
        const isFlawless = combatState.roundState.damageTakenThisRound === 0;
        const tokenResult = Tokens.onRoundWin({ isFlawless, roundNumber: currentRound });

        // Get achievements unlocked during this round
        const roundAchievements = getRoundAchievements();

        // Performance tracking: round won (updates win streak)
        PerformanceTracking.onRoundEnd(true);

        // Lifetime stats: record win
        LifetimeStats.recordWin({
            isFlawless,
            roundNumber: currentRound
        });

        // Lifetime stats: record kill (enemy destroyed)
        // Get the weapon that made the killing blow from combat state
        const lastWeaponUsed = combatState.roundState.lastWeaponUsed || 'basic-shot';
        LifetimeStats.recordKill(lastWeaponUsed);

        // Record enemy destroyed stat
        recordStat('enemyDestroyed');

        // Award victory bonus (hit rewards already given during combat)
        const victoryBonus = Money.awardVictoryBonus();
        ProgressionAchievements.onMoneyEarned(victoryBonus);
        LifetimeStats.recordMoneyEarned(victoryBonus);

        // Get total round earnings for display
        const roundEarnings = Money.getRoundEarnings();
        const roundDamage = Money.getRoundDamage();

        // Haptic feedback for victory (mobile devices)
        Haptics.hapticVictory();

        // Level mode: show Level Complete screen with star calculation
        if (isLevelMode && currentLevelData) {
            const levelId = currentLevelId;

            // Calculate stats for level completion
            const accuracy = getLevelModeAccuracy();
            const turnsUsed = levelModeStats.turnsUsed;
            const damageDealt = levelModeStats.damageDealt;

            console.log(`[Main] Level complete! Accuracy: ${(accuracy * 100).toFixed(1)}%, Turns: ${turnsUsed}, Damage: ${damageDealt}`);

            // Show Level Complete screen (it handles star calculation internally)
            LevelCompleteScreen.show({
                levelId,
                stats: {
                    damageDealt,
                    accuracy,
                    turnsUsed,
                    won: true
                },
                coinsEarned: roundEarnings
            });

            // Transition to Level Complete state
            Game.setState(GAME_STATES.LEVEL_COMPLETE);
            return;
        }

        // Roguelike mode: show round transition screen
        RoundTransition.show({
            round: currentRound,
            damage: roundDamage,
            money: roundEarnings,
            tokenResult: tokenResult,
            tokenBalance: Tokens.getTokenBalance(),
            achievements: roundAchievements,
            delay: 1200
        });

        // Transition to round transition state
        Game.setState(GAME_STATES.ROUND_TRANSITION);
        return;
    }

    if (playerDestroyed) {
        // Player loses - GAME OVER (permadeath)
        console.log('[Main] Player destroyed - GAME OVER!');

        // Combat achievement detection: round lost
        CombatAchievements.onRoundLost();

        // Token system: round loss resets win streak
        Tokens.onRoundLoss();

        // Performance tracking: round lost (resets win streak)
        PerformanceTracking.onRoundEnd(false);

        // Lifetime stats: record loss
        LifetimeStats.recordLoss({ roundNumber: currentRound });

        // End the run and finalize stats
        endRunState(false);

        // Show game over screen
        // Stats are fetched from runState module automatically
        GameOver.show({
            rounds: currentRound,
            draw: false,
            delay: 1200
        });

        // Haptic feedback for defeat (mobile devices)
        Haptics.hapticDefeat();

        // Transition to game over state (terminal - run has ended)
        Game.setState(GAME_STATES.GAME_OVER);
        return;
    }

    // No one destroyed - continue to next turn
    Turn.projectileResolved();
}

/**
 * Show a campaign level failure result without ending or scoring the survival run.
 * @param {boolean} mutualDestruction - Whether the enemy was also destroyed.
 */
function showLevelFailure(mutualDestruction = false) {
    console.log(mutualDestruction
        ? '[Main] Level failed - mutual destruction'
        : '[Main] Level failed - player destroyed');

    CombatAchievements.onRoundLost();
    PerformanceTracking.onRoundEnd(false);

    const levelId = currentLevelId;
    const accuracy = getLevelModeAccuracy();
    const turnsUsed = levelModeStats.turnsUsed;
    const damageDealt = levelModeStats.damageDealt;

    LevelCompleteScreen.show({
        levelId,
        stats: {
            damageDealt,
            accuracy,
            turnsUsed,
            won: false
        },
        coinsEarned: 0
    });

    Haptics.hapticDefeat();
    Game.setState(GAME_STATES.LEVEL_COMPLETE);
}

// =============================================================================
// TANK FALLING SYSTEM
// =============================================================================

/**
 * Update all falling tanks each frame.
 * Handles gravity-based falling animation and applies fall damage on landing.
 * Called from the main update loop.
 */
function updateFallingTanks() {
    const tanks = [playerTank, enemyTank].filter(t => t !== null);
    let anyTankLanded = false;

    for (const tank of tanks) {
        if (!tank.isFalling) continue;

        // Update falling physics
        const result = tank.updateFalling();

        if (result.landed) {
            // Tank just landed - apply fall damage and feedback
            handleTankLanding(tank, result.fallDistance);
            anyTankLanded = true;
        }
    }

    // If a tank landed and might have been destroyed by fall damage,
    // check if the round has ended (but only if we're in PROJECTILE_FLIGHT phase
    // since that's when explosions and terrain destruction happen)
    if (anyTankLanded && Game.getState() === GAME_STATES.AIMING) {
        // Check if any tank was destroyed by fall damage
        const playerDestroyed = playerTank && playerTank.health <= 0;
        const enemyDestroyed = enemyTank && enemyTank.health <= 0;

        if (playerDestroyed || enemyDestroyed) {
            checkRoundEnd();
        }
    }
}

/**
 * Handle a tank landing after a fall.
 * Applies fall damage, screen shake, and audio feedback.
 * @param {import('./tank.js').Tank} tank - The tank that landed
 * @param {number} fallDistance - Distance fallen in pixels
 */
function handleTankLanding(tank, fallDistance) {
    // Calculate fall damage
    const damage = calculateFallDamage(fallDistance);

    if (damage > 0) {
        // Apply damage
        tank.takeDamage(damage);
        console.log(`Tank (${tank.team}) took ${damage} fall damage from ${fallDistance.toFixed(0)}px fall`);

        // Screen shake proportional to fall damage
        // Scale shake intensity based on damage (0-60 damage maps to small-large shake)
        const shakeIntensity = Math.min(1, damage / 60) * TANK.FALL.LANDING_SHAKE_INTENSITY;
        if (shakeIntensity > 0.1) {
            // Use a custom screen shake function or reuse explosion shake
            const shakeRadius = 10 + (damage / 60) * 40; // 10-50px equivalent blast radius for shake
            screenShakeForBlastRadius(shakeRadius);
        }

        // Play landing thud sound (louder for harder landings)
        const volume = 0.3 + (damage / 60) * 0.7; // 0.3-1.0 volume based on damage
        Sound.playLandingSound(volume);

        // Check if tank was destroyed by fall damage
        if (tank.health <= 0) {
            console.log(`Tank (${tank.team}) destroyed by fall damage!`);
            // The next checkRoundEnd call will handle victory/defeat
        }
    } else {
        // Soft landing - quiet thud
        Sound.playLandingSound(0.2);
    }
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

function renderTerrain(ctx) {
    renderTerrainScene(ctx, currentTerrain, {
        renderPixiTerrainLayerToCanvas
    });
}

// =============================================================================
// TANK RENDERING
// =============================================================================

/**
 * Darken a hex color by a given factor.
 * Used to create tank body colors from glow colors.
 *
 * @param {string} hex - Hex color string (e.g., '#FF00FF' or '#F0F')
 * @param {number} factor - Darkening factor (0-1, where 0.15 = 15% brightness)
 * @returns {string} Darkened hex color
 */
function darkenColor(hex, factor) {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Handle shorthand hex (e.g., #F0F -> #FF00FF)
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Apply darkening factor
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Render active fallout zones from Tactical Nuke explosions.
 * Displays a pulsing hazardous area indicator.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderFalloutZones(ctx) {
    if (activeFalloutZones.length === 0) return;

    ctx.save();

    // Pulsing animation based on time
    const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 300);

    for (const zone of activeFalloutZones) {
        // Draw the fallout zone as a glowing hazardous circle
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);

        // Greenish radioactive color (classic nuclear waste aesthetic)
        const gradient = ctx.createRadialGradient(
            zone.x, zone.y, 0,
            zone.x, zone.y, zone.radius
        );
        gradient.addColorStop(0, `rgba(100, 255, 100, ${0.15 * pulse})`);
        gradient.addColorStop(0.5, `rgba(100, 200, 50, ${0.1 * pulse})`);
        gradient.addColorStop(0.8, `rgba(150, 150, 30, ${0.08 * pulse})`);
        gradient.addColorStop(1, 'rgba(100, 100, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw outer ring (pulsing)
        ctx.strokeStyle = `rgba(100, 255, 100, ${0.3 * pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw radiation hazard symbol in center (simplified)
        const symbolSize = Math.min(zone.radius * 0.3, 20);
        ctx.fillStyle = `rgba(255, 255, 0, ${0.4 * pulse})`;
        ctx.font = `bold ${symbolSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☢', zone.x, zone.y);
    }

    ctx.restore();
}

/**
 * Render active fire zones from Napalm explosions.
 * Displays a pulsing fiery area indicator with animated flames.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderFireZones(ctx) {
    if (activeFireZones.length === 0) return;

    ctx.save();

    // Pulsing animation based on time (faster than fallout for fire effect)
    const time = performance.now();
    const pulse = 0.6 + 0.4 * Math.sin(time / 150);
    const flicker = 0.8 + 0.2 * Math.sin(time / 50);

    for (const zone of activeFireZones) {
        // Draw the fire zone as a glowing fiery circle
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);

        // Orange/red fire colors
        const gradient = ctx.createRadialGradient(
            zone.x, zone.y, 0,
            zone.x, zone.y, zone.radius
        );
        gradient.addColorStop(0, `rgba(255, 200, 50, ${0.25 * pulse * flicker})`);
        gradient.addColorStop(0.3, `rgba(255, 100, 0, ${0.2 * pulse})`);
        gradient.addColorStop(0.6, `rgba(200, 50, 0, ${0.15 * pulse})`);
        gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw outer ring (flickering)
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.4 * flicker})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw flame symbol in center
        const symbolSize = Math.min(zone.radius * 0.4, 24);
        ctx.fillStyle = `rgba(255, 255, 100, ${0.5 * flicker})`;
        ctx.font = `bold ${symbolSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔥', zone.x, zone.y);

        // Draw small flame particles around the zone
        const numParticles = 5;
        for (let i = 0; i < numParticles; i++) {
            const angle = (time / 200 + i * (Math.PI * 2 / numParticles)) % (Math.PI * 2);
            const particleR = zone.radius * 0.7;
            const particleX = zone.x + Math.cos(angle) * particleR;
            const particleY = zone.y + Math.sin(angle) * particleR - 5 * Math.sin(time / 100 + i);

            ctx.beginPath();
            ctx.arc(particleX, particleY, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, ${150 + Math.floor(100 * Math.sin(time / 100 + i))}, 0, ${0.6 * flicker})`;
            ctx.fill();
        }
    }

    ctx.restore();
}

/**
 * Render a single tank.
 * First attempts to render split body/turret assets or sprite assets if available.
 * Falls back to geometric placeholder (64x24 body with rotating turret).
 *
 * For player tanks, uses the equipped skin's glow color.
 * For enemy tanks, uses the default pink color.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - The tank to render
 */
function renderTank(ctx, tank) {
    if (!tank) return;

    // Don't render destroyed tanks (explosion will be visible instead)
    if (tank.isDestroyed()) return;

    const { team } = tank;

    // Resolve shared skin/turret profile for player and enemy tanks.
    let glowColor = null;
    let activeSkinId = null;
    if (team === 'player') {
        const equippedSkin = tankEditorPlaytestSkinId
            ? getTankSkin(tankEditorPlaytestSkinId)
            : TankCollection.getEquippedTank();
        if (equippedSkin && equippedSkin.glowColor) {
            glowColor = equippedSkin.glowColor;
        }
        activeSkinId = getTankSkinId(tank, { playerSkinId: equippedSkin?.id || 'standard' });
    } else {
        activeSkinId = getTankSkinId(tank);
    }

    // Try to use sprite asset if available
    const spriteKey = getTankSpriteKey(tank);
    const allowPlayerRuntimeFallback = team === 'player';
    const activeDesign = activeSkinId
        ? getActiveTankDesign(activeSkinId, { allowPlayerRuntimeFallback })
        : null;
    const customSprite = activeSkinId && (team === 'player' || activeDesign)
        ? getCompiledTankCanvasForSkin(activeSkinId, performance.now(), { allowPlayerRuntimeFallback })
        : null;
    const sprite = customSprite || Assets.get(spriteKey);
    const renderProfile = getTankRenderProfile(tank, glowColor);
    const splitSprites = !customSprite && shouldUseSplitTankSprites(team, activeSkinId)
        ? getTankPartSprites(team)
        : null;

    // If sprite is loaded and is a real image (not a placeholder), render it
    // Note: Placeholder images have diagonal lines and are generated by assets.js
    if (splitSprites) {
        renderTankParts(ctx, tank, splitSprites.body, splitSprites.turret, renderProfile);
    } else if (customSprite || isRealSprite(sprite)) {
        renderTankSprite(ctx, tank, sprite, renderProfile);
    } else {
        // Fall back to geometric placeholder rendering
        renderTankPlaceholder(ctx, tank, renderProfile);
    }

    if (activeDesign?.effects?.length) {
        renderTankEffects(ctx, tank, activeDesign.effects, performance.now());
    }
}

/**
 * Default player and enemy tanks use generated split sprites so the turret can
 * rotate from an authored pivot without drawing a procedural overlay.
 *
 * @param {string} team
 * @param {string|null} activePlayerSkinId
 * @returns {boolean}
 */
function shouldUseSplitTankSprites(team, activePlayerSkinId) {
    return team === 'enemy' || (team === 'player' && activePlayerSkinId === 'standard');
}

/**
 * Resolve split tank body/turret assets.
 * @param {string} team
 * @returns {{body: HTMLImageElement, turret: HTMLImageElement}|null}
 */
function getTankPartSprites(team) {
    const body = Assets.get(team === 'player' ? 'tanks.playerBody' : 'tanks.enemyBody');
    const turret = Assets.get(team === 'player' ? 'tanks.playerTurret' : 'tanks.enemyTurret');

    if (!isRealSprite(body) || !isRealSprite(turret)) {
        return null;
    }

    return { body, turret };
}

/**
 * Render tank using separate generated body and turret sprites.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - The tank to render
 * @param {HTMLImageElement} bodySprite - Static tank body sprite
 * @param {HTMLImageElement} turretSprite - Right-facing turret sprite
 * @param {Object} renderProfile - Turret/body render settings
 */
function renderTankParts(ctx, tank, bodySprite, turretSprite, renderProfile) {
    const { x, y, team, angle } = tank;
    const { outlineColor, barrelLength } = renderProfile;

    ctx.save();

    const bodyX = x - bodySprite.width / 2;
    const bodyY = y - bodySprite.height;
    const prevSmoothing = ctx.imageSmoothingEnabled;

    ctx.imageSmoothingEnabled = false;
    ctx.shadowColor = outlineColor;
    ctx.shadowBlur = team === 'player' ? 7 : 10;
    ctx.drawImage(bodySprite, bodyX, bodyY);

    const pivot = getTurretPivot(tank);
    const radians = (angle * Math.PI) / 180;

    ctx.save();
    ctx.shadowBlur = team === 'player' ? 10 : 8;
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(-radians);
    ctx.drawImage(turretSprite, -TANK_TURRET_SPRITE.PIVOT_X, -TANK_TURRET_SPRITE.PIVOT_Y);
    ctx.restore();

    ctx.imageSmoothingEnabled = prevSmoothing;
    ctx.shadowBlur = team === 'player' ? 8 : 5;

    const muzzleX = pivot.x + Math.cos(radians) * barrelLength;
    const muzzleY = pivot.y - Math.sin(radians) * barrelLength;
    ctx.beginPath();
    ctx.arc(muzzleX, muzzleY, team === 'player' ? 2.5 : 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
}

/**
 * Render tank using sprite asset.
 * The sprite is drawn centered at the tank position.
 * Turret rotation is handled separately (sprites are static bodies).
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - The tank to render
 * @param {HTMLImageElement} sprite - The tank sprite image
 * @param {Object} renderProfile - Turret/body render settings
 */
function renderTankSprite(ctx, tank, sprite, renderProfile) {
    const { x, y, team, angle } = tank;
    const { outlineColor, bodyColor, barrelLength, barrelOuterWidth, barrelInnerWidth, turretBaseRadius } = renderProfile;

    ctx.save();

    // Draw sprite centered at tank position
    // Sprite bottom aligns with tank.y (terrain surface)
    const spriteX = x - sprite.width / 2;
    const spriteY = y - sprite.height;

    // Apply glow effect around the sprite
    ctx.shadowColor = outlineColor;
    ctx.shadowBlur = team === 'player' ? 7 : 12;

    // Draw sprite with nearest-neighbor sampling for crisp pixel art.
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, spriteX, spriteY);
    ctx.imageSmoothingEnabled = prevSmoothing;

    // Keep sprite colors as-authored by the skin artwork.

    // Draw dynamic turret assembly on top of sprite.
    const pivot = getTurretPivot(tank);
    const turretPivotX = pivot.x;
    const turretPivotY = pivot.y;

    // Apply glow effect to turret
    ctx.shadowColor = outlineColor;
    ctx.shadowBlur = team === 'player' ? 14 : 8;

    // Convert angle to radians (0° = right, 90° = up, 180° = left)
    const radians = (angle * Math.PI) / 180;
    const barrelEndX = turretPivotX + Math.cos(radians) * barrelLength;
    const barrelEndY = turretPivotY - Math.sin(radians) * barrelLength;

    // Turret base cap
    ctx.beginPath();
    ctx.arc(turretPivotX, turretPivotY, turretBaseRadius, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Outer barrel stroke
    ctx.beginPath();
    ctx.moveTo(turretPivotX, turretPivotY);
    ctx.lineTo(barrelEndX, barrelEndY);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = barrelOuterWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner barrel core for better contrast
    ctx.beginPath();
    ctx.moveTo(turretPivotX, turretPivotY);
    ctx.lineTo(barrelEndX, barrelEndY);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = team === 'player' ? 0.85 : 0.6;
    ctx.lineWidth = barrelInnerWidth;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Muzzle glow
    ctx.beginPath();
    ctx.arc(barrelEndX, barrelEndY, team === 'player' ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
}

/**
 * Render tank as geometric placeholder.
 * Body is 64x24 rectangle with neon outline.
 * Player tank uses equipped skin glow color (default cyan), enemy is pink.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - The tank to render
 * @param {Object} renderProfile - Turret/body render settings
 */
function renderTankPlaceholder(ctx, tank, renderProfile) {
    const { x, y, angle } = tank;
    const { outlineColor, bodyColor, barrelLength, barrelOuterWidth, turretBaseRadius } = renderProfile;

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
    const pivot = getTurretPivot(tank);
    const turretPivotX = pivot.x;
    const turretPivotY = pivot.y;

    // Draw turret base (circular pivot point)
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
    const barrelEndX = turretPivotX + Math.cos(radians) * barrelLength;
    const barrelEndY = turretPivotY - Math.sin(radians) * barrelLength; // Negative because canvas Y is inverted

    ctx.beginPath();
    ctx.moveTo(turretPivotX, turretPivotY);
    ctx.lineTo(barrelEndX, barrelEndY);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = barrelOuterWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
}

/**
 * Build a tank render profile with consistent dynamic turret styling.
 * @param {import('./tank.js').Tank} tank - The tank to style
 * @param {string|null} skinGlowColor - Optional player skin glow color
 * @returns {{outlineColor: string, bodyColor: string, barrelLength: number, barrelOuterWidth: number, barrelInnerWidth: number, turretBaseRadius: number}}
 */
function getTankRenderProfile(tank, skinGlowColor = null) {
    const isPlayer = tank?.team === 'player';
    const outlineColor = skinGlowColor || (isPlayer ? COLORS.NEON_CYAN : COLORS.NEON_PINK);
    const bodyColor = (isPlayer && skinGlowColor)
        ? darkenColor(skinGlowColor, 0.2)
        : (isPlayer ? '#0a1a2a' : '#2a0a1a');

    return {
        outlineColor,
        bodyColor,
        barrelLength: TANK.TURRET_LENGTH,
        barrelOuterWidth: isPlayer ? Math.max(TANK.TURRET_WIDTH + 2, 6) : TANK.TURRET_WIDTH,
        barrelInnerWidth: isPlayer ? Math.max(TANK.TURRET_WIDTH - 1, 2) : Math.max(TANK.TURRET_WIDTH - 2, 2),
        turretBaseRadius: isPlayer ? 10 : 8
    };
}

/**
 * Render all tanks in the game.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderTanks(ctx) {
    renderTank(ctx, playerTank);
    renderTank(ctx, enemyTank);
}

/**
 * Render shield effect around a tank if it has an active shield.
 * Shield is a glowing bubble/dome that pulses based on shield percentage.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./tank.js').Tank} tank - The tank to render shield for
 */
function renderTankShield(ctx, tank) {
    if (!tank || !tank.hasShield()) return;

    const { x, y, team } = tank;

    // Shield dimensions - larger bubble around the tank
    const shieldRadius = TANK.WIDTH * 0.75;  // 75% of tank width
    const centerY = y - TANK.BODY_HEIGHT / 2;  // Center on tank body

    // Calculate shield strength for visual intensity
    const shieldPercent = tank.getShieldPercent();

    // Color based on shield strength (cyan -> yellow -> red as it depletes)
    let shieldColor;
    if (shieldPercent > 0.6) {
        // High shield: cyan
        shieldColor = '#00ffff';
    } else if (shieldPercent > 0.3) {
        // Medium shield: yellow
        shieldColor = '#ffff00';
    } else {
        // Low shield: red/orange
        shieldColor = '#ff6600';
    }

    // Pulse animation based on game time
    const pulseSpeed = shieldPercent < 0.3 ? 6 : 3;  // Faster pulse when low
    const pulseAmount = 0.1 + (1 - shieldPercent) * 0.1;  // More pulse when lower
    const pulse = 1 + Math.sin(Date.now() / 1000 * pulseSpeed) * pulseAmount;

    ctx.save();

    // Draw shield bubble
    ctx.beginPath();
    ctx.arc(x, centerY, shieldRadius * pulse, 0, Math.PI * 2);

    // Shield fill (semi-transparent)
    ctx.fillStyle = shieldColor;
    ctx.globalAlpha = 0.1 + shieldPercent * 0.1;  // 10-20% opacity
    ctx.fill();

    // Shield glow effect
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = 2 + shieldPercent * 2;  // 2-4px line width
    ctx.shadowColor = shieldColor;
    ctx.shadowBlur = 10 + shieldPercent * 10;  // 10-20px glow
    ctx.globalAlpha = 0.4 + shieldPercent * 0.4;  // 40-80% opacity for stroke
    ctx.stroke();

    // Add hexagonal pattern lines for tech feel
    ctx.globalAlpha = 0.2 + shieldPercent * 0.2;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 5;

    // Draw a few concentric rings
    for (let i = 0.5; i < 1; i += 0.25) {
        ctx.beginPath();
        ctx.arc(x, centerY, shieldRadius * pulse * i, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Render shields for all tanks in the game.
 * Called after tank rendering so shields appear on top.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderTankShields(ctx) {
    renderTankShield(ctx, playerTank);
    renderTankShield(ctx, enemyTank);
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

const PROJECTILE_ASSET_KEYS = {
    'basic-shot': 'projectiles.basic',
    mirv: 'projectiles.mirv',
    roller: 'projectiles.roller',
    'heavy-roller': 'projectiles.roller',
    digger: 'projectiles.digger',
    'heavy-digger': 'projectiles.digger',
    nuke: 'projectiles.nuke',
    'mini-nuke': 'projectiles.miniNuke'
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
 * Resolve generated projectile sprite for supported weapons.
 * @param {string} weaponId - Weapon id
 * @returns {{image: HTMLImageElement, width: number, height: number, source: string}|null}
 */
function getProjectileSprite(weaponId) {
    const key = PROJECTILE_ASSET_KEYS[weaponId];
    if (key) {
        const sprite = Assets.get(key);
        if (isRealSprite(sprite)) {
            return {
                image: sprite,
                width: sprite.width,
                height: sprite.height,
                source: key
            };
        }
    }

    const weaponIcon = Assets.get(`weaponIcons.${weaponId}`);
    if (!isRealSprite(weaponIcon)) return null;

    const weapon = WeaponRegistry.getWeapon(weaponId);
    const size = weapon?.type === WEAPON_TYPES.NUCLEAR.id ? 18 : 14;
    return {
        image: weaponIcon,
        width: size,
        height: size,
        source: `weaponIcons.${weaponId}`
    };
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

    // Get trail color - check projectile override first (for Fireworks), then weapon, then default
    const weapon = WeaponRegistry.getWeapon(projectile.weaponId);
    const trailColor = projectile.trailColor || weapon?.trailColor || PROJECTILE_VISUAL.GLOW_COLOR;
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
 * Update persistent trails (Tracer weapon feature).
 * Removes trails that have exceeded their duration.
 */
function updatePersistentTrails() {
    const now = performance.now();
    persistentTrails = persistentTrails.filter(trail => {
        const elapsed = now - trail.startTime;
        return elapsed < trail.duration;
    });
}

/**
 * Render persistent trails for Tracer weapons.
 * Trails fade out over their duration.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPersistentTrails(ctx) {
    if (persistentTrails.length === 0) return;

    const now = performance.now();
    ctx.save();

    for (const trailData of persistentTrails) {
        const elapsed = now - trailData.startTime;
        const fadeProgress = elapsed / trailData.duration; // 0 to 1
        const overallAlpha = 1 - fadeProgress; // 1 to 0

        if (overallAlpha <= 0) continue;

        const rgb = hexToRgb(trailData.color);
        const trail = trailData.trail;
        const trailRadius = PROJECTILE_VISUAL.DIAMETER / 4;

        // Render each trail point with fading effect
        for (let i = 0; i < trail.length; i++) {
            const pos = trail[i];

            // Base alpha: oldest = 0.2, newest = 0.9
            const positionAlpha = 0.2 + (i / trail.length) * 0.7;
            // Multiply by overall fade
            const alpha = positionAlpha * overallAlpha;

            // Add glow effect
            ctx.shadowColor = trailData.color;
            ctx.shadowBlur = 6;

            // Draw trail circle
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, trailRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            ctx.fill();
        }
    }

    ctx.restore();
}

/**
 * Clear all persistent trails (called on round/game end).
 */
function clearPersistentTrails() {
    persistentTrails = [];
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

    const interpolationAlpha = Game.getRenderInterpolationAlpha();
    const { x, y } = typeof projectile.getRenderPosition === 'function'
        ? projectile.getRenderPosition(interpolationAlpha)
        : projectile.getPosition();
    const radius = PROJECTILE_VISUAL.DIAMETER / 2;

    // Get projectile color - check projectile override first (for Fireworks), then weapon, then default
    const weapon = WeaponRegistry.getWeapon(projectile.weaponId);
    const projectileColor = projectile.projectileColor || weapon?.projectileColor || PROJECTILE_VISUAL.COLOR;
    const rgb = hexToRgb(projectileColor);
    const sprite = getProjectileSprite(projectile.weaponId);

    if (sprite && !projectile.isDigging && !projectile.isDeployed) {
        renderProjectileAsset(ctx, projectile, sprite, x, y, projectileColor);
        return;
    }

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
        const digProgress = (projectile.getDigDistance() % 20) / 20; // Cycle every 20px
        const pulseAlpha = 0.5 + 0.5 * Math.sin(digProgress * Math.PI * 2);

        ctx.save();
        ctx.translate(x, y);

        // Rotate to face dig direction
        const digAngle = Math.atan2(projectile.digDirection.y, projectile.digDirection.x);
        ctx.rotate(digAngle);

        // Special rendering for Laser Drill - wide red beam effect
        if (projectile.weaponId === 'laser-drill') {
            const weapon = WeaponRegistry.getWeapon('laser-drill');
            const beamWidth = weapon?.tunnelRadius || 25;

            // Draw laser beam from entry point to current position
            const entryPoint = projectile.getDigEntryPoint();
            if (entryPoint) {
                ctx.save();
                ctx.rotate(-digAngle); // Undo local rotation to draw in world space
                ctx.translate(-x, -y);

                // Calculate beam length
                const dx = x - entryPoint.x;
                const dy = y - entryPoint.y;
                const beamLength = Math.sqrt(dx * dx + dy * dy);

                // Draw main beam (gradient from entry to current position)
                const gradient = ctx.createLinearGradient(entryPoint.x, entryPoint.y, x, y);
                gradient.addColorStop(0, `rgba(255, 0, 0, ${0.1 + pulseAlpha * 0.1})`);
                gradient.addColorStop(0.5, `rgba(255, 50, 50, ${0.4 + pulseAlpha * 0.3})`);
                gradient.addColorStop(1, `rgba(255, 100, 100, ${0.8 + pulseAlpha * 0.2})`);

                ctx.beginPath();
                // Draw beam as a wide line from entry to current position
                const beamAngle = Math.atan2(dy, dx);
                const perpX = Math.sin(beamAngle) * beamWidth * 0.5;
                const perpY = -Math.cos(beamAngle) * beamWidth * 0.5;

                ctx.moveTo(entryPoint.x - perpX, entryPoint.y - perpY);
                ctx.lineTo(entryPoint.x + perpX, entryPoint.y + perpY);
                ctx.lineTo(x + perpX, y + perpY);
                ctx.lineTo(x - perpX, y - perpY);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw glow around beam
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 20;
                ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + pulseAlpha * 0.5})`;
                ctx.lineWidth = beamWidth;
                ctx.beginPath();
                ctx.moveTo(entryPoint.x, entryPoint.y);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.restore();
            }

            // Draw bright core at drill tip
            ctx.beginPath();
            ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 200, ${0.8 + pulseAlpha * 0.2})`;
            ctx.fill();

            // Outer glow ring
            ctx.beginPath();
            ctx.arc(0, 0, radius * 2.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 0, ${pulseAlpha * 0.8})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            // Standard drill visual for other digging weapons
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
        }

        ctx.restore();
    } else if (projectile.isDeployed) {
        // Deployed weapons (Land Mine, Sticky Bomb) show distinct visuals
        ctx.save();
        ctx.translate(x, y);

        if (projectile.isLandMine) {
            // Land Mine: Red pulsing circle with warning pattern
            const deployTime = projectile.getDeployDuration();
            const pulseSpeed = 1500; // ms per pulse cycle
            const pulseAlpha = 0.6 + 0.4 * Math.sin((deployTime / pulseSpeed) * Math.PI * 2);

            // Outer danger ring
            ctx.beginPath();
            ctx.arc(0, 0, radius * 2.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 0, ${pulseAlpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Mine body
            ctx.beginPath();
            ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(80, 0, 0, 0.9)';
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Center indicator light
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
            ctx.fill();
        } else if (projectile.isStickyBomb) {
            // Sticky Bomb: Green with countdown timer display
            const timeRemaining = projectile.getStickyBombTimeRemaining();
            const totalTime = 2000; // 2 second timer
            const progress = 1 - (timeRemaining / totalTime);
            const urgency = progress > 0.7 ? 0.5 + 0.5 * Math.sin(progress * Math.PI * 10) : 1;

            // Bomb body - gets more red as timer runs out
            const greenComponent = Math.floor(255 * (1 - progress));
            const redComponent = Math.floor(255 * progress);

            ctx.beginPath();
            ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${redComponent}, ${greenComponent}, 50, 0.9)`;
            ctx.fill();
            ctx.strokeStyle = `rgba(0, 255, 136, ${urgency})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Timer countdown arc
            ctx.beginPath();
            ctx.arc(0, 0, radius * 2.2, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2, false);
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Timer text (seconds remaining)
            const secondsLeft = Math.ceil(timeRemaining / 1000);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(secondsLeft.toString(), 0, 0);
        }

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
 * Render a generated projectile sprite with the same glow language as procedural shots.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {import('./projectile.js').Projectile} projectile - Active projectile
 * @param {{image: HTMLImageElement, width: number, height: number, source: string}} sprite - Loaded projectile sprite
 * @param {number} x - Projectile x
 * @param {number} y - Projectile y
 * @param {string} projectileColor - Glow color
 */
function renderProjectileAsset(ctx, projectile, sprite, x, y, projectileColor) {
    const { vx, vy } = projectile.getVelocity();
    let rotation = Math.atan2(vy, vx);

    if (projectile.isRolling) {
        rotation = projectile.getRollRotation();
    }

    const displayWidth = Math.max(sprite.width, PROJECTILE_VISUAL.DIAMETER);
    const displayHeight = Math.max(sprite.height, PROJECTILE_VISUAL.DIAMETER);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = projectileColor;
    ctx.shadowBlur = PROJECTILE_VISUAL.GLOW_BLUR;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite.image, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
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
            gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
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
            fireGradient.addColorStop(1, 'rgba(100, 20, 10, 0)');
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
        gradient.addColorStop(1, 'rgba(200, 50, 20, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(x, y, expandedRadius * 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 150, 50, ${alpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    renderGeneratedExplosionOverlay(ctx, x, y, radius, progress, isNuclear);

    ctx.restore();
}

/**
 * Overlay generated GPT Image 2 explosion art on the procedural blast.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - Explosion center x
 * @param {number} y - Explosion center y
 * @param {number} radius - Blast radius
 * @param {number} progress - Animation progress from 0 to 1
 * @param {boolean} isNuclear - Whether this is a nuclear explosion
 */
function renderGeneratedExplosionOverlay(ctx, x, y, radius, progress, isNuclear) {
    const assetKey = getExplosionAssetKey(radius, isNuclear);
    const sprite = Assets.get(assetKey);

    if (!isRealSprite(sprite)) return;

    const scaleProgress = isNuclear
        ? 0.72 + progress * 0.38
        : 0.62 + progress * 0.48;
    const drawSize = radius * (isNuclear ? 3.4 : 2.65) * scaleProgress;
    const alpha = Math.max(0, isNuclear ? 0.82 - progress * 0.28 : 0.74 - progress * 0.42);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(sprite, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
    ctx.restore();
}

/**
 * Choose the generated explosion asset by weapon scale.
 * @param {number} radius - Blast radius
 * @param {boolean} isNuclear - Whether this is a nuclear explosion
 * @returns {string} Asset key
 */
function getExplosionAssetKey(radius, isNuclear) {
    if (isNuclear || radius >= 80) return 'effects.explosion-large';
    if (radius >= 45) return 'effects.explosion-medium';
    return 'effects.explosion-small';
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
    // Render persistent trails first (behind everything else - for Tracer weapon)
    renderPersistentTrails(ctx);

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
    const terrainImpactStart = performance.now();
    let impactRemovedCellCount = 0;

    if (!currentTerrain) {
        console.warn('Cannot destroy terrain: no terrain loaded');
        recordMeasure('terrainImpact', performance.now() - terrainImpactStart);
        setPerformanceGauge('terrainImpactDestroyed', 0);
        setPerformanceGauge('terrainImpactRemovedCells', 0);
        return false;
    }

    const derezSnapshot = captureTerrainDerezSnapshot(currentTerrain, x, radius);
    const cellSnapshot = captureTerrainCellSnapshot(currentTerrain, x, radius);
    const terrainGrid = getOrCreateTerrainCellGrid(currentTerrain);
    let removedCells = terrainGrid?.destroyCircle(x, y, radius) ?? [];
    let fallingResult = { modified: false, fallingColumns: [] };
    let wasDestroyed = removedCells.length > 0;
    impactRemovedCellCount = removedCells.length;

    if (wasDestroyed) {
        const settlingRadius = radius * 3;
        fallingResult = terrainGrid.settleUnsupported({
            minCol: Math.floor((x - settlingRadius) / terrainGrid.cellSize),
            maxCol: Math.floor((x + settlingRadius) / terrainGrid.cellSize)
        });
        terrainGrid.writeHeightsToTerrain(currentTerrain);
    } else {
        wasDestroyed = currentTerrain.destroyTerrain(x, y, radius);
        removedCells = wasDestroyed
            ? buildRemovedTerrainCells(cellSnapshot, currentTerrain)
            : [];
        impactRemovedCellCount = removedCells.length;
        if (wasDestroyed) {
            const fallbackGrid = rebuildTerrainCellGrid(currentTerrain);
            if (fallbackGrid) {
                const settlingRadius = radius * 3;
                fallingResult = fallbackGrid.settleUnsupported({
                    minCol: Math.floor((x - settlingRadius) / fallbackGrid.cellSize),
                    maxCol: Math.floor((x + settlingRadius) / fallbackGrid.cellSize)
                });
                fallbackGrid.writeHeightsToTerrain(currentTerrain);
            }
        }
    }

    const destructionSamples = wasDestroyed
        ? buildTerrainDerezSamples(derezSnapshot, currentTerrain)
        : [];

    if (wasDestroyed) {
        if (fallingResult.modified) {
            console.log('Terrain cell settling applied');
        }
        markPixiTerrainLayerDirty({ x, radius: radius * 3 });

        emitGameplayEvent(GAMEPLAY_EVENTS.TERRAIN_CHANGED, {
            source: 'explosion',
            x,
            y,
            radius,
            destructionSamples,
            removedCells,
            fallingDirt: fallingResult,
            terrain: currentTerrain
        });
    }

    recordMeasure('terrainImpact', performance.now() - terrainImpactStart);
    setPerformanceGauge('terrainImpactDestroyed', wasDestroyed ? 1 : 0);
    setPerformanceGauge('terrainImpactRemovedCells', impactRemovedCellCount);
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
 * Handle absolute angle set input event (for touch aiming)
 * @param {number} angle - Target angle in degrees
 */
function handleAngleSet(angle) {
    playerAim.angle = Math.max(PHYSICS.MIN_ANGLE, Math.min(PHYSICS.MAX_ANGLE, angle));
}

/**
 * Handle absolute power set input event (for touch aiming)
 * @param {number} power - Target power percentage
 */
function handlePowerSet(power) {
    playerAim.power = Math.max(PHYSICS.MIN_POWER, Math.min(PHYSICS.MAX_POWER, power));
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
 * Grant the curated loadout for level-mode play.
 * This keeps level mode focused on mechanic practice instead of pre-level shop prep.
 * @param {Tank} tank - Player tank
 * @param {object} level - Level definition
 */
function applyLevelLoadout(tank, level) {
    if (!tank || !level) return;

    const loadout = LevelRegistry.getLoadout(level);
    tank.inventory = { ...loadout };

    const recommendedWeapon = level.progression?.recommendedWeapon || level.progression?.introducedWeapon;
    if (recommendedWeapon && tank.getAmmo(recommendedWeapon) > 0) {
        tank.setWeapon(recommendedWeapon);
    } else {
        tank.setWeapon('basic-shot');
    }

    console.log('[Main] Applied level loadout', {
        levelId: level.id,
        mechanic: level.progression?.mechanic,
        inventory: tank.inventory,
        selectedWeapon: tank.currentWeapon
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
 * Handle selecting a specific weapon by ID (from weapon bar click).
 * Only selects if the player has ammo for this weapon.
 * @param {string} weaponId - The weapon ID to select
 * @returns {boolean} True if weapon was selected, false if not available
 */
function handleSelectSpecificWeapon(weaponId) {
    if (!playerTank) return false;

    // Check if player has ammo for this weapon
    const ammo = playerTank.getAmmo(weaponId);
    if (ammo === 0) {
        console.log(`Cannot select ${weaponId}: no ammo`);
        return false;
    }

    // Get weapon info for logging
    const weapon = WeaponRegistry.getWeapon(weaponId);
    if (!weapon) {
        console.warn(`Unknown weapon: ${weaponId}`);
        return false;
    }

    // Set the weapon (this will also handle switching if already on this weapon)
    const success = playerTank.setWeapon(weaponId);

    if (success) {
        const ammoDisplay = ammo === Infinity ? '∞' : ammo;
        console.log(`Weapon selected: ${weapon.name} (ammo: ${ammoDisplay})`);

        // Scroll weapon bar to show selected weapon
        HUD.scrollToWeapon(weaponId);
    }

    return success;
}

function getPhysicsPlaygroundWeapons() {
    return WeaponRegistry.getAllWeapons();
}

function getPhysicsPlaygroundSelectedWeapon() {
    return WeaponRegistry.getWeapon(physicsPlaygroundState.selectedWeaponId) ||
        getPhysicsPlaygroundWeapons()[0] ||
        null;
}

function grantPhysicsPlaygroundWeapons() {
    if (!playerTank) return;

    for (const weapon of getPhysicsPlaygroundWeapons()) {
        playerTank.inventory[weapon.id] = 999;
    }
}

function setPhysicsPlaygroundWeapon(weaponId) {
    const weapon = WeaponRegistry.getWeapon(weaponId);
    if (!weapon) return false;

    physicsPlaygroundState.selectedWeaponId = weapon.id;
    if (playerTank) {
        playerTank.inventory[weapon.id] = 999;
        playerTank.setWeapon(weapon.id);
    }
    return true;
}

function cyclePhysicsPlaygroundWeapon(direction) {
    const weapons = getPhysicsPlaygroundWeapons();
    if (weapons.length === 0) return;

    const currentIndex = Math.max(0, weapons.findIndex(weapon => weapon.id === physicsPlaygroundState.selectedWeaponId));
    const nextIndex = (currentIndex + direction + weapons.length) % weapons.length;
    setPhysicsPlaygroundWeapon(weapons[nextIndex].id);
}

function setPhysicsPlaygroundTool(tool) {
    if (tool !== 'weapon' && tool !== 'crater') return;
    physicsPlaygroundState.tool = tool;
}

function adjustPhysicsPlaygroundRadius(delta) {
    physicsPlaygroundState.craterRadius = Math.max(
        PHYSICS_PLAYGROUND.MIN_RADIUS,
        Math.min(PHYSICS_PLAYGROUND.MAX_RADIUS, physicsPlaygroundState.craterRadius + delta)
    );
}

function getPhysicsPlaygroundButtons() {
    const x = PHYSICS_PLAYGROUND.PANEL_X + 16;
    const y = PHYSICS_PLAYGROUND.PANEL_Y + 112;
    const width = PHYSICS_PLAYGROUND.PANEL_W - 32;
    const halfWidth = (width - PHYSICS_PLAYGROUND.GAP) / 2;
    const rows = [
        [
            { id: 'tool-crater', label: 'CRATER', x, y, width: halfWidth, height: PHYSICS_PLAYGROUND.BUTTON_H },
            { id: 'tool-weapon', label: 'WEAPON', x: x + halfWidth + PHYSICS_PLAYGROUND.GAP, y, width: halfWidth, height: PHYSICS_PLAYGROUND.BUTTON_H }
        ],
        [
            { id: 'prev-weapon', label: '< WEAPON', x, y: y + 42, width: halfWidth, height: PHYSICS_PLAYGROUND.BUTTON_H },
            { id: 'next-weapon', label: 'WEAPON >', x: x + halfWidth + PHYSICS_PLAYGROUND.GAP, y: y + 42, width: halfWidth, height: PHYSICS_PLAYGROUND.BUTTON_H }
        ],
        [
            { id: 'radius-down', label: '- RADIUS', x, y: y + 84, width: halfWidth, height: PHYSICS_PLAYGROUND.BUTTON_H },
            { id: 'radius-up', label: 'RADIUS +', x: x + halfWidth + PHYSICS_PLAYGROUND.GAP, y: y + 84, width: halfWidth, height: PHYSICS_PLAYGROUND.BUTTON_H }
        ],
        [
            { id: 'reset', label: 'RESET', x, y: y + 126, width: halfWidth, height: PHYSICS_PLAYGROUND.BUTTON_H },
            { id: 'new-seed', label: 'NEW SEED', x: x + halfWidth + PHYSICS_PLAYGROUND.GAP, y: y + 126, width: halfWidth, height: PHYSICS_PLAYGROUND.BUTTON_H }
        ]
    ];

    return rows.flat();
}

function isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function isInsidePhysicsPlaygroundPanel(x, y) {
    return physicsPlaygroundState.active && isPointInRect(x, y, {
        x: PHYSICS_PLAYGROUND.PANEL_X,
        y: PHYSICS_PLAYGROUND.PANEL_Y,
        width: PHYSICS_PLAYGROUND.PANEL_W,
        height: PHYSICS_PLAYGROUND.PANEL_H
    });
}

function clearPhysicsPlaygroundTransientState() {
    activeProjectiles = [];
    persistentTrails = [];
    explosionEffect = null;
    clearParticles();
    clearTerrainDerezEffects();
    clearFalloutZones();
    clearFireZones();
    clearScreenShake();
    clearScreenFlash();
}

function resetPhysicsPlayground({ newSeed = false } = {}) {
    if (!physicsPlaygroundState.active) return;

    physicsPlaygroundState.seed = newSeed
        ? Math.floor(Math.random() * 1000000)
        : physicsPlaygroundState.seed;
    clearPhysicsPlaygroundTransientState();
    startNewRunState();
    Money.init();
    Money.addMoney(99999);

    currentTerrain = generateTerrain(undefined, undefined, {
        roughness: 0.5,
        minHeightPercent: 0.2,
        maxHeightPercent: 0.7,
        seed: physicsPlaygroundState.seed
    });

    const tanks = placeTanksOnTerrain(currentTerrain);
    playerTank = tanks.player;
    enemyTank = tanks.enemy;
    playerTank.health = TANK.START_HEALTH;
    playerTank.maxHealth = TANK.START_HEALTH;
    enemyTank.health = TANK.START_HEALTH;
    enemyTank.maxHealth = TANK.START_HEALTH;
    grantPhysicsPlaygroundWeapons();
    setPhysicsPlaygroundWeapon(physicsPlaygroundState.selectedWeaponId);
    Wind.setWind(0);
    Turn.init();
    markPixiTerrainLayerDirty();
    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);
}

function applyPhysicsPlaygroundImpact(x, y, options = {}) {
    if (!physicsPlaygroundState.active || !currentTerrain) return false;

    const tool = options.tool || physicsPlaygroundState.tool;
    physicsPlaygroundState.lastImpact = { x, y, tool, at: performance.now() };

    if (tool === 'crater') {
        const destroyed = destroyTerrainAt(x, y, physicsPlaygroundState.craterRadius);
        if (destroyed) {
            if (playerTank) updateTankTerrainPosition(playerTank, currentTerrain);
            if (enemyTank) updateTankTerrainPosition(enemyTank, currentTerrain);
        }
        return destroyed;
    }

    const weapon = getPhysicsPlaygroundSelectedWeapon();
    if (!weapon) return false;

    const tanks = [playerTank, enemyTank].filter(Boolean);
    const directHit = checkTankCollision(x, y, tanks, { owner: 'player', canHitOwner: true });
    const fakeProjectile = {
        owner: 'player',
        weaponId: weapon.id,
        getTrail: () => []
    };
    const childProjectiles = handleProjectileExplosion(fakeProjectile, { x, y }, directHit?.tank || null);
    if (childProjectiles?.length) {
        activeProjectiles.push(...childProjectiles);
    }
    return true;
}

function handlePhysicsPlaygroundButton(buttonId) {
    switch (buttonId) {
        case 'tool-crater':
            setPhysicsPlaygroundTool('crater');
            return true;
        case 'tool-weapon':
            setPhysicsPlaygroundTool('weapon');
            return true;
        case 'prev-weapon':
            cyclePhysicsPlaygroundWeapon(-1);
            return true;
        case 'next-weapon':
            cyclePhysicsPlaygroundWeapon(1);
            return true;
        case 'radius-down':
            adjustPhysicsPlaygroundRadius(-PHYSICS_PLAYGROUND.RADIUS_STEP);
            return true;
        case 'radius-up':
            adjustPhysicsPlaygroundRadius(PHYSICS_PLAYGROUND.RADIUS_STEP);
            return true;
        case 'reset':
            resetPhysicsPlayground();
            return true;
        case 'new-seed':
            resetPhysicsPlayground({ newSeed: true });
            return true;
        default:
            return false;
    }
}

function handlePhysicsPlaygroundPointerDown(pos) {
    if (!physicsPlaygroundState.active || Game.getState() !== GAME_STATES.PLAYING) return false;

    if (isInsidePhysicsPlaygroundPanel(pos.x, pos.y)) {
        const button = getPhysicsPlaygroundButtons().find(item => isPointInRect(pos.x, pos.y, item));
        if (button) handlePhysicsPlaygroundButton(button.id);
        return true;
    }

    physicsPlaygroundState.pointerDown = true;
    physicsPlaygroundState.hover = { x: pos.x, y: pos.y };
    physicsPlaygroundState.lastTerrainEditAt = performance.now();
    applyPhysicsPlaygroundImpact(pos.x, pos.y);
    return true;
}

function handlePhysicsPlaygroundPointerMove(pos) {
    if (!physicsPlaygroundState.active || Game.getState() !== GAME_STATES.PLAYING) return false;

    physicsPlaygroundState.hover = { x: pos.x, y: pos.y };
    if (!physicsPlaygroundState.pointerDown || physicsPlaygroundState.tool !== 'crater') {
        return isInsidePhysicsPlaygroundPanel(pos.x, pos.y);
    }

    const now = performance.now();
    if (now - physicsPlaygroundState.lastTerrainEditAt >= PHYSICS_PLAYGROUND.TERRAIN_THROTTLE_MS) {
        physicsPlaygroundState.lastTerrainEditAt = now;
        applyPhysicsPlaygroundImpact(pos.x, pos.y, { tool: 'crater' });
    }
    return true;
}

function handlePhysicsPlaygroundPointerUp(pos) {
    if (!physicsPlaygroundState.active) return false;
    physicsPlaygroundState.pointerDown = false;
    physicsPlaygroundState.hover = { x: pos.x, y: pos.y };
    return Game.getState() === GAME_STATES.PLAYING && isInsidePhysicsPlaygroundPanel(pos.x, pos.y);
}

function handlePhysicsPlaygroundKey(keyCode, event = null) {
    if (!physicsPlaygroundState.active) return false;

    if (keyCode === 'Digit1') {
        setPhysicsPlaygroundTool('crater');
        return true;
    }
    if (keyCode === 'Digit2') {
        setPhysicsPlaygroundTool('weapon');
        return true;
    }
    if (keyCode === 'BracketLeft' || keyCode === 'Minus') {
        adjustPhysicsPlaygroundRadius(-PHYSICS_PLAYGROUND.RADIUS_STEP);
        return true;
    }
    if (keyCode === 'BracketRight' || keyCode === 'Equal') {
        adjustPhysicsPlaygroundRadius(PHYSICS_PLAYGROUND.RADIUS_STEP);
        return true;
    }
    if (keyCode === 'Tab') {
        event?.preventDefault?.();
        cyclePhysicsPlaygroundWeapon(event?.shiftKey ? -1 : 1);
        return true;
    }
    if (keyCode === 'KeyR') {
        resetPhysicsPlayground();
        return true;
    }
    if (keyCode === 'KeyN') {
        resetPhysicsPlayground({ newSeed: true });
        return true;
    }

    return false;
}

function getPhysicsPlaygroundState() {
    const weapon = getPhysicsPlaygroundSelectedWeapon();
    return {
        active: physicsPlaygroundState.active,
        tool: physicsPlaygroundState.tool,
        selectedWeaponId: weapon?.id || null,
        selectedWeaponName: weapon?.name || null,
        craterRadius: physicsPlaygroundState.craterRadius,
        seed: physicsPlaygroundState.seed,
        hover: physicsPlaygroundState.hover,
        lastImpact: physicsPlaygroundState.lastImpact
    };
}

function exposePhysicsPlaygroundApi() {
    if (typeof window === 'undefined') return;

    window.__SCORCHED_PHYSICS_PLAYGROUND = {
        getState: getPhysicsPlaygroundState,
        setTool: tool => {
            setPhysicsPlaygroundTool(tool);
            return getPhysicsPlaygroundState();
        },
        setWeapon: weaponId => {
            setPhysicsPlaygroundWeapon(weaponId);
            return getPhysicsPlaygroundState();
        },
        impact: ({ x, y, tool } = {}) => {
            const result = applyPhysicsPlaygroundImpact(x, y, { tool });
            return { success: Boolean(result), state: getPhysicsPlaygroundState() };
        },
        reset: options => {
            resetPhysicsPlayground(options);
            return getPhysicsPlaygroundState();
        }
    };
}

function deactivatePhysicsPlaygroundScene() {
    physicsPlaygroundState.active = false;
    physicsPlaygroundState.pointerDown = false;
}

function renderPhysicsPlaygroundOverlay(ctx) {
    if (!physicsPlaygroundState.active || Game.getState() !== GAME_STATES.PLAYING) return;

    const weapon = getPhysicsPlaygroundSelectedWeapon();
    const panel = {
        x: PHYSICS_PLAYGROUND.PANEL_X,
        y: PHYSICS_PLAYGROUND.PANEL_Y,
        width: PHYSICS_PLAYGROUND.PANEL_W,
        height: PHYSICS_PLAYGROUND.PANEL_H
    };

    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 24, 0.86)';
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(panel.x, panel.y, panel.width, panel.height, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold 18px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PHYSICS PLAYGROUND', panel.x + 16, panel.y + 14);

    ctx.font = `bold 13px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.fillText(`TOOL ${physicsPlaygroundState.tool.toUpperCase()}`, panel.x + 16, panel.y + 46);
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.fillText(`WEAPON ${weapon?.name || 'None'}`, panel.x + 16, panel.y + 66);
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.fillText(`RADIUS ${physicsPlaygroundState.craterRadius}px`, panel.x + 16, panel.y + 86);

    for (const button of getPhysicsPlaygroundButtons()) {
        const active = (button.id === 'tool-crater' && physicsPlaygroundState.tool === 'crater') ||
            (button.id === 'tool-weapon' && physicsPlaygroundState.tool === 'weapon');
        ctx.fillStyle = active ? 'rgba(40, 220, 255, 0.24)' : 'rgba(255, 255, 255, 0.06)';
        ctx.strokeStyle = active ? COLORS.NEON_CYAN : 'rgba(111, 231, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(button.x, button.y, button.width, button.height, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = active ? COLORS.TEXT_LIGHT : 'rgba(230, 244, 255, 0.9)';
        ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2 + 1);
    }

    if (physicsPlaygroundState.hover && !isInsidePhysicsPlaygroundPanel(physicsPlaygroundState.hover.x, physicsPlaygroundState.hover.y)) {
        const { x, y } = physicsPlaygroundState.hover;
        const radius = physicsPlaygroundState.tool === 'crater'
            ? physicsPlaygroundState.craterRadius
            : (weapon?.blastRadius || physicsPlaygroundState.craterRadius);
        ctx.strokeStyle = physicsPlaygroundState.tool === 'crater' ? COLORS.NEON_CYAN : COLORS.NEON_PINK;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Render the playing screen
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderPlaying(ctx) {
    const phase = Turn.getPhase();
    const isPlayerTurn = Turn.canPlayerAim();

    renderGameplayScene(ctx, {
        width: Renderer.getWidth(),
        height: Renderer.getHeight(),
        playerTank,
        enemyTank,
        playerAim,
        currentTerrain,
        currentRound,
        money: Money.getMoney(),
        difficultyName: AI.getDifficultyName(AI.getDifficulty()),
        phase,
        canFire: Turn.canPlayerFire(),
        isPlayerTurn,
        shooter: Turn.getCurrentShooter(),
        crtParams: getCrtFullscreenParams(),
        getScreenShakeOffset,
        renderBackground,
        renderTerrain,
        renderTerrainDerezEffects,
        renderPuzzleObjects: renderLevelPuzzleObjects,
        renderFalloutZones,
        renderFireZones,
        renderTanks,
        renderTankShields,
        renderActiveProjectile,
        renderHud: HUD.renderHUD,
        renderPauseButton,
        renderLevelEditorReturnButton,
        setTouchAimingEnabled: TouchAiming.setEnabled,
        renderTouchAiming: TouchAiming.render,
        renderAimingControls: AimingControls.renderAimingControls,
        renderScreenFlash,
        renderDebugOverlays: DebugOverlays.render,
        renderCrtEffects
    });
}

function renderLevelPuzzleObjects(ctx) {
    renderPuzzleObjectsWithSprites(ctx, currentPuzzleObjects, performance.now(), {
        shieldGenerator: Assets.get('puzzleObjects.shieldGenerator'),
        ricochetPanel: Assets.get('puzzleObjects.ricochetPanel'),
        teleportGate: Assets.get('puzzleObjects.teleportGate'),
        hardlightBunker: Assets.get('puzzleObjects.hardlightBunker')
    });
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

    if (handlePhysicsPlaygroundPointerDown(pos)) {
        return;
    }

    // Level editor playtest shortcut: return to editor from gameplay states.
    if (isInsideLevelEditorReturnButton(pos.x, pos.y)) {
        returnToEditorFromPlaytest();
        return;
    }

    // Check pause button first (always available during gameplay)
    if (isInsidePauseButton(pos.x, pos.y)) {
        pauseGame();
        return;
    }

    // Only process other interactions in PLAYING state
    if (state !== GAME_STATES.PLAYING) return;

    // Check aiming controls first (angle arc, fire button)
    if (Turn.canPlayerAim()) {
        // Fire button or angle arc
        AimingControls.handlePointerDown(pos.x, pos.y, playerTank, Turn.canPlayerFire());

        // Check if any control was activated - don't process other clicks
        if (AimingControls.isInsideFireButton(pos.x, pos.y) ||
            AimingControls.isInsideAngleArc(pos.x, pos.y, playerTank)) {
            return;
        }
    }

    // Check if click is on weapon bar (only during player aim phase)
    if (Turn.canPlayerAim() && HUD.isInsideWeaponBar(pos.x, pos.y)) {
        // Check navigation arrows first
        if (HUD.isInsideWeaponBarLeftArrow(pos.x, pos.y)) {
            HUD.scrollWeaponBarLeft();
            return;
        }
        if (HUD.isInsideWeaponBarRightArrow(pos.x, pos.y)) {
            const totalWeapons = HUD.getWeaponBarWeaponCount();
            HUD.scrollWeaponBarRight(totalWeapons);
            return;
        }

        // Start swipe gesture (will differentiate tap vs swipe on pointer up)
        HUD.handleWeaponBarSwipeStart(pos.x, pos.y);
        return;
    }
}

/**
 * Handle pointer move in playing state.
 * Updates aiming controls drag state and weapon bar swipe.
 * @param {{x: number, y: number}} pos - Pointer position in design coordinates
 */
function handlePlayingPointerMove(pos) {
    if (Game.getState() !== GAME_STATES.PLAYING) return;

    if (handlePhysicsPlaygroundPointerMove(pos)) {
        return;
    }

    // Handle weapon bar swipe gesture first
    if (HUD.handleWeaponBarSwipeMove(pos.x, pos.y)) {
        return; // Swipe is active, don't process other moves
    }

    AimingControls.handlePointerMove(pos.x, pos.y, playerTank);
}

/**
 * Handle pointer up in playing state.
 * Finalizes aiming control interactions and weapon bar swipes.
 * @param {{x: number, y: number}} pos - Pointer position in design coordinates
 */
function handlePlayingPointerUp(pos) {
    if (Game.getState() !== GAME_STATES.PLAYING) return;

    if (handlePhysicsPlaygroundPointerUp(pos)) {
        return;
    }

    // Handle weapon bar swipe end
    const totalWeapons = HUD.getWeaponBarWeaponCount();
    const swipeResult = HUD.handleWeaponBarSwipeEnd(pos.x, pos.y, totalWeapons);

    // If it was a tap on a weapon slot, select that weapon
    if (swipeResult.wasTap && swipeResult.weaponId) {
        handleSelectSpecificWeapon(swipeResult.weaponId);
        return;
    }

    AimingControls.handlePointerUp(pos.x, pos.y, Turn.canPlayerFire());
}

/**
 * Setup playing state handlers
 */
function setupPlayingState() {
    // Register game input event handlers
    Input.onGameInput(INPUT_EVENTS.ANGLE_CHANGE, handleAngleChange);
    Input.onGameInput(INPUT_EVENTS.POWER_CHANGE, handlePowerChange);
    Input.onGameInput(INPUT_EVENTS.ANGLE_SET, handleAngleSet);
    Input.onGameInput(INPUT_EVENTS.POWER_SET, handlePowerSet);
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

    Input.onKeyDown((keyCode, event) => {
        handlePhysicsPlaygroundKey(keyCode, event);
    });

    // Register phase change callback to enable/disable input and apply status effects
    Turn.onPhaseChange((newPhase, oldPhase) => {
        // Enable input only during player's aiming phase
        if (newPhase === TURN_PHASES.PLAYER_AIM) {
            Input.enableGameInput();

            // Apply status effects at the start of player's turn
            if (playerTank) {
                // Tick EMP status (reduce turns remaining)
                playerTank.tickEmpStatus();

                // Apply fallout damage
                const falloutDamage = applyFalloutDamageToTank(playerTank);
                if (falloutDamage > 0) {
                    console.log(`Player tank took ${falloutDamage} total fallout damage at turn start`);
                }

                // Apply fire damage (Napalm)
                const fireDamage = applyFireDamageToTank(playerTank);
                if (fireDamage > 0) {
                    console.log(`Player tank took ${fireDamage} total burn damage at turn start`);
                }
            }

            // After player turn starts, tick fallout zones and fire zones (they decrease after each full round)
            // We do this when transitioning from AI phase to player phase (completing a round)
            if (oldPhase === TURN_PHASES.PROJECTILE_FLIGHT) {
                tickFalloutZones();
                tickFireZones();
            }
        } else if (newPhase === TURN_PHASES.AI_AIM) {
            // Apply status effects at the start of AI's turn
            if (enemyTank) {
                // Tick EMP status (reduce turns remaining)
                enemyTank.tickEmpStatus();

                // Apply fallout damage
                const falloutDamage = applyFalloutDamageToTank(enemyTank);
                if (falloutDamage > 0) {
                    console.log(`Enemy tank took ${falloutDamage} total fallout damage at turn start`);
                }

                // Apply fire damage (Napalm)
                const fireDamage = applyFireDamageToTank(enemyTank);
                if (fireDamage > 0) {
                    console.log(`Enemy tank took ${fireDamage} total burn damage at turn start`);
                }
            }
        } else {
            Input.disableGameInput();
        }
    });

    Game.registerStateHandlers(GAME_STATES.PLAYING, {
        onEnter: (fromState) => {
            console.log('Entered PLAYING state - Game started!');
            // Play gameplay music
            Music.playForState(GAME_STATES.PLAYING);

            // If resuming from pause, skip all initialization - game state is already set up
            if (fromState === GAME_STATES.PAUSED) {
                console.log('[Main] Resuming from pause - no reinitialization needed');
                Input.enableGameInput();
                return;
            }

            // Determine if this is a new game or continuation
            // New game comes from menu/select/editor/game-over entry points.
            const isNewGame = fromState === GAME_STATES.MENU ||
                             fromState === GAME_STATES.DIFFICULTY_SELECT ||
                             fromState === GAME_STATES.LEVEL_SELECT ||
                             fromState === GAME_STATES.LEVEL_COMPLETE ||
                             fromState === GAME_STATES.LEVEL_EDITOR ||
                             fromState === GAME_STATES.TANK_EDITOR ||
                             fromState === GAME_STATES.GAME_OVER;

            // Initialize game systems if this is a new game
            if (isNewGame) {
                startNewRunState(); // Reset run state and stats for new run
                Money.init();

                // Lifetime stats: record new run started
                LifetimeStats.recordRunStarted();

                // Combat achievement: notify new run started
                CombatAchievements.onRunStart();

                // Precision achievement: notify new run started
                PrecisionAchievements.onRunStart();

                // Weapon achievement: notify new run started
                WeaponAchievements.onRunStart();

                // Hidden achievement: notify new run started
                HiddenAchievements.onRunStart();

                // Token system: notify new run started
                Tokens.onRunStart();

                // Performance tracking: reset stats for new run
                PerformanceTracking.resetPerformanceOnNewRun();
            }
            // Start round earnings tracking with round number for multiplier
            // Rounds 1-2: 1.0x, Rounds 3-4: 1.2x, Rounds 5+: 1.5x
            Money.startRound(currentRound);

            // Clear round achievements tracker for new round
            clearRoundAchievements();

            // Reset combat achievement round state for new round
            CombatAchievements.resetRoundState();

            // Reset precision achievement round state for new round
            PrecisionAchievements.resetRoundState();

            // Reset weapon achievement round state for new round
            WeaponAchievements.resetRoundState();

            // Reset hidden achievement round state for new round
            HiddenAchievements.resetRoundState();

            // Performance tracking: start new round
            PerformanceTracking.onRoundStart(currentRound);

            // Progression achievement: check for round milestone achievements
            ProgressionAchievements.onRoundReached(currentRound);

            // Save player inventory before creating new tanks (for round continuation)
            // Inventory persists across rounds when transitioning from SHOP or DEFEAT
            let savedPlayerInventory = null;
            if (!isNewGame && playerTank) {
                savedPlayerInventory = { ...playerTank.inventory };
                console.log('[Main] Preserving player inventory for new round:', savedPlayerInventory);
            }

            // Build terrain + tank placement.
            // Level mode uses slot layouts (including editor playtest overrides).
            // Endless mode keeps procedural generation + dynamic placement.
            let usedLayoutTerrain = false;

            if (isLevelMode && currentLevelId) {
                try {
                    const slotOverride = isLevelEditorPlaytestMode ? levelEditorSlotOverride : null;

                    currentTerrain = buildTerrainFromSlot(
                        currentLevelId,
                        Renderer.getWidth(),
                        Renderer.getHeight(),
                        {
                            slotOverride,
                            applyGuardrail: true
                        }
                    );

                    const spawn = getSpawnForSlot(
                        currentLevelId,
                        currentTerrain,
                        Renderer.getWidth(),
                        Renderer.getHeight(),
                        {
                            slotOverride
                        }
                    );

                    currentPuzzleObjects = getPuzzleObjectsForSlot(
                        currentLevelId,
                        Renderer.getWidth(),
                        Renderer.getHeight(),
                        {
                            slotOverride
                        }
                    );

                    playerTank = createPlayerTank(spawn.player.x, spawn.player.y);
                    enemyTank = createEnemyTank(spawn.enemy.x, spawn.enemy.y);
                    usedLayoutTerrain = true;

                    console.log(`[Main] Level layout loaded for ${currentLevelId}`, {
                        ...spawn.meta,
                        puzzleObjects: currentPuzzleObjects.length
                    });
                } catch (error) {
                    console.warn(`[Main] Failed to load level layout for ${currentLevelId}, falling back to procedural terrain:`, error);
                    currentPuzzleObjects = [];
                }
            }

            if (!usedLayoutTerrain) {
                currentPuzzleObjects = [];
                // Generate new terrain for this game
                // Uses midpoint displacement algorithm for natural-looking hills and valleys
                // Terrain adapts to dynamic screen dimensions (no fixed width/height)
                let terrainOptions = isLevelMode
                    ? {
                        roughness: 0.5,  // Balanced jaggedness (0.4-0.6 recommended)
                        minHeightPercent: 0.2,  // Terrain starts at 20% of screen height minimum
                        maxHeightPercent: 0.7   // Terrain peaks at 70% of screen height maximum
                    }
                    : getSurvivalTerrainOptionsForRound(currentRound);

                // In level mode fallback, use level-specific terrain config
                if (isLevelMode && currentLevelData && currentLevelData.terrain) {
                    const levelTerrain = currentLevelData.terrain;
                    const terrainStyle = LevelRegistry.getTerrainStyle(levelTerrain.style);
                    terrainOptions = {
                        roughness: terrainStyle.roughness,
                        // Convert absolute pixel values to percentages of screen height
                        minHeightPercent: levelTerrain.minHeight / Renderer.getHeight(),
                        maxHeightPercent: levelTerrain.maxHeight / Renderer.getHeight()
                    };
                    console.log(`[Main] Level mode fallback terrain: ${levelTerrain.style}`, terrainOptions);
                }

                currentTerrain = generateTerrain(undefined, undefined, terrainOptions);

                // Place tanks on generated terrain for non-layout modes
                const tanks = placeTanksOnTerrain(currentTerrain);
                playerTank = tanks.player;
                enemyTank = tanks.enemy;
            }

            // Apply enemy health based on mode
            // Level mode: use level-defined health; Roguelike: scale with round number
            let enemyHealth;
            let playerHealth = TANK.START_HEALTH;

            if (isLevelMode && currentLevelData) {
                enemyHealth = currentLevelData.enemyHealth || TANK.START_HEALTH;
                playerHealth = currentLevelData.playerHealth || TANK.START_HEALTH;
                console.log(`[Main] Level mode health - Player: ${playerHealth} HP, Enemy: ${enemyHealth} HP`);
            } else {
                // Roguelike mode: Enemy tanks become more durable in later rounds
                enemyHealth = getEnemyHealthForRound(currentRound);
                console.log(`Round ${currentRound}: Enemy health scaled to ${enemyHealth} HP`);
            }

            enemyTank.health = enemyHealth;
            enemyTank.maxHealth = enemyHealth; // Set max for proper health bar display
            playerTank.health = playerHealth;
            playerTank.maxHealth = playerHealth;

            // Restore player inventory from previous round (if continuing)
            // For new games, tank starts with default inventory (basic-shot only)
            if (savedPlayerInventory) {
                playerTank.inventory = savedPlayerInventory;
                console.log('[Main] Restored player inventory from previous round');
            } else if (isLevelMode && currentLevelData) {
                applyLevelLoadout(playerTank, currentLevelData);
            }
            // Endless runs start with only basic-shot; level mode receives a
            // curated practice loadout for its current mechanic.

            applyPendingSurvivalRunPerk(playerTank);

            // Hidden achievement: track initial inventory for Minimalist detection
            HiddenAchievements.onInventoryChanged(playerTank.inventory);

            // Set up AI for this round
            // Level mode: use level-defined difficulty; Roguelike: use player selection or round-based
            let difficulty;
            if (isLevelMode && currentLevelData && currentLevelData.aiDifficulty) {
                difficulty = currentLevelData.aiDifficulty;
                console.log(`[Main] Level mode AI difficulty: ${AI.getDifficultyName(difficulty)}`);
            } else {
                difficulty = selectedDifficulty || AI.getAIDifficulty(currentRound);
                console.log(`Round ${currentRound}: AI difficulty is ${AI.getDifficultyName(difficulty)} (player selected: ${selectedDifficulty ? 'yes' : 'no'})`);
            }
            AI.setDifficulty(difficulty);
            if (!isLevelMode) {
                AI.setWeaponPoolForRound(currentRound);
            }
            // Purchase weapons based on difficulty
            AI.purchaseWeaponsForAI(enemyTank, difficulty);

            // Apply difficulty-based trajectory preview settings
            // Only applies if user hasn't manually overridden in settings
            ControlSettings.applyDifficultyPreview(difficulty);

            // Generate wind for this round
            // Level mode: use level-defined wind range; Roguelike: scale with round number
            let windRange;
            if (isLevelMode && currentLevelData && currentLevelData.wind) {
                // Generate wind within level-defined range
                const levelWind = currentLevelData.wind;
                windRange = Math.max(Math.abs(levelWind.min), Math.abs(levelWind.max));
                console.log(`[Main] Level mode wind range: ±${windRange}`);
            } else {
                // Roguelike: Wind range scales with round number
                windRange = Wind.getWindRangeForRound(currentRound);
            }
            Wind.generateRandomWind(windRange);

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
            clearPersistentTrails();
            clearFalloutZones();
            clearFireZones();
            clearTerrainDerezEffects();
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
    advanceRunRound(); // Track round progression in run state
    // Note: Money.startRound(currentRound) is called in PLAYING state's onEnter handler
    // after the round counter is already incremented
    console.log(`[Main] Starting round ${currentRound}`);
    Game.setState(GAME_STATES.PLAYING);
}

/**
 * Apply the selected survival run perk to the freshly-created player tank.
 * @param {import('./tank.js').Tank|null} tank - Player tank
 */
function applyPendingSurvivalRunPerk(tank) {
    if (!tank || !pendingSurvivalRunPerk || isLevelMode) return;

    const perk = pendingSurvivalRunPerk;
    pendingSurvivalRunPerk = null;

    if (perk.id === 'field-repair') {
        tank.maxHealth += 35;
        tank.health = tank.maxHealth;
    } else if (perk.id === 'hardlight-shield') {
        tank.addShield(35);
    } else if (perk.id === 'ammo-cache') {
        tank.inventory.missile = (tank.inventory.missile || 0) + 3;
        tank.inventory.bouncer = (tank.inventory.bouncer || 0) + 2;
        tank.currentWeapon = 'missile';
    }

    console.log(`[Main] Applied survival run perk: ${perk.id}`);
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
    pendingSurvivalRunPerk = null;

    // Reset selected difficulty so player must choose again
    resetSelectedDifficulty();
    clearLevelEditorPlaytestState();

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
// LEVEL COMPLETE STATE (Level-based Mode)
// =============================================================================

/**
 * Handle level selection from Level Select screen.
 * @param {CustomEvent} event - Level selected event with detail
 */
function handleLevelSelected(event) {
    const { levelId, level, worldNum, levelNum } = event.detail;

    console.log(`[Main] Level selected: ${levelId}`);

    // Store current level info
    currentLevelId = levelId;
    currentLevelData = level;
    isLevelMode = true;
    clearLevelEditorPlaytestState();

    // Reset round to 1 for level mode
    currentRound = 1;

    // Reset level mode stats for fresh tracking
    resetLevelModeStats();

    // Level-specific settings will be applied in PLAYING state's onEnter handler
    console.log('[Main] Level config:', {
        aiDifficulty: level.aiDifficulty,
        enemyHealth: level.enemyHealth,
        playerHealth: level.playerHealth,
        wind: level.wind,
        terrain: level.terrain
    });

    // Start the level
    Game.setState(GAME_STATES.PLAYING);
}

/**
 * Set up Level Complete screen callbacks.
 */
function setupLevelCompleteCallbacks() {
    // Retry button - restart same level
    LevelCompleteScreen.onRetry((levelId, worldNum, levelNum) => {
        console.log(`[Main] Retrying level: ${levelId}`);
        LevelCompleteScreen.hide();

        // Reset game state for retry
        currentLevelId = levelId;
        currentLevelData = LevelRegistry.getLevel(levelId);
        currentRound = 1;
        isLevelMode = true;
        if (!isLevelEditorPlaytestMode) {
            levelEditorSlotOverride = null;
        }

        // Reset level mode stats for fresh tracking
        resetLevelModeStats();

        // Start the level
        Game.setState(GAME_STATES.PLAYING);
    });

    // Next button - advance to next level
    LevelCompleteScreen.onNext((levelId, worldNum, levelNum) => {
        console.log(`[Main] Starting next level: ${levelId}`);
        LevelCompleteScreen.hide();

        // Update current level info for next level
        currentLevelId = levelId;
        currentLevelData = LevelRegistry.getLevel(levelId);
        currentRound = 1;
        isLevelMode = true;
        clearLevelEditorPlaytestState();

        // Reset level mode stats for fresh tracking
        resetLevelModeStats();

        // Start the next level
        Game.setState(GAME_STATES.PLAYING);
    });

    // Menu button - return to level select
    LevelCompleteScreen.onMenu(() => {
        if (isLevelEditorPlaytestMode || isTankEditorPlaytestMode) {
            console.log('[Main] Returning to editor from playtest');
            LevelCompleteScreen.hide();
            returnToEditorFromPlaytest();
            return;
        }

        console.log('[Main] Returning to level select');
        LevelCompleteScreen.hide();

        // Reset level mode state
        isLevelMode = false;
        currentLevelId = null;
        currentLevelData = null;
        clearLevelEditorPlaytestState();

        Game.setState(GAME_STATES.LEVEL_SELECT);
    });
}

// =============================================================================
// ROUND TRANSITION STATE
// =============================================================================

/**
 * Handle click on the round transition screen.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleRoundTransitionClick(pos) {
    if (Game.getState() !== GAME_STATES.ROUND_TRANSITION) return;
    RoundTransition.handleClick(pos.x, pos.y);
}

/**
 * Render the round transition screen overlay.
 * Shows the current game state underneath with the overlay on top.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderRoundTransitionState(ctx) {
    // First render the game state underneath (terrain, tanks, etc.)
    renderPlaying(ctx);

    // Then render the round transition overlay on top
    RoundTransition.render(ctx);
}

/**
 * Update round transition screen animations.
 * @param {number} deltaTime - Time since last frame in ms
 */
function updateRoundTransition(deltaTime) {
    RoundTransition.update(deltaTime);
}

/**
 * Set up round transition state handlers.
 * Round transition shows after winning a round, before going to shop.
 */
function setupRoundTransitionState() {
    // Register callback for Continue button - skip shop, go directly to next round
    RoundTransition.onContinue(() => {
        console.log('[Main] Continue from round transition - going directly to next round');
        RoundTransition.hide();
        startNextRound();
    });

    // Register callback for Shop button - go to shop before next round
    RoundTransition.onShop(() => {
        console.log('[Main] Shop from round transition - going to shop');
        RoundTransition.hide();
        Game.setState(GAME_STATES.SHOP);
    });

    // Register callback for survival run perk selection
    RoundTransition.onPerk((perk) => {
        if (!isLevelMode) {
            pendingSurvivalRunPerk = perk;
        }
    });

    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.ROUND_TRANSITION) {
            handleRoundTransitionClick({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.ROUND_TRANSITION) {
            handleRoundTransitionClick({ x, y });
        }
    });

    // Register pointer move handlers for hover states
    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.ROUND_TRANSITION) {
            RoundTransition.handlePointerMove(x, y);
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.ROUND_TRANSITION) {
            RoundTransition.handlePointerMove(x, y);
        }
    });

    Game.registerStateHandlers(GAME_STATES.ROUND_TRANSITION, {
        onEnter: (fromState) => {
            console.log('Entered ROUND_TRANSITION state');
            // Cancel any pending AI turn
            AI.cancelTurn();
            // Disable game input
            Input.disableGameInput();
            // Play victory music/stinger (reuse victory music)
            Music.playForState(GAME_STATES.VICTORY);
        },
        onExit: (toState) => {
            console.log('Exiting ROUND_TRANSITION state');
            RoundTransition.hide();
        },
        update: updateRoundTransition,
        render: renderRoundTransitionState
    });
}

// =============================================================================
// GAME OVER STATE (PERMADEATH)
// =============================================================================

/**
 * Handle click on the game over screen.
 * @param {{x: number, y: number}} pos - Click position in design coordinates
 */
function handleGameOverClick(pos) {
    if (Game.getState() !== GAME_STATES.GAME_OVER) return;
    GameOver.handleClick(pos.x, pos.y);
}

/**
 * Render the game over screen overlay.
 * Shows the current game state underneath with the overlay on top.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderGameOverState(ctx) {
    // First render the game state underneath (terrain, tanks, etc.)
    renderPlaying(ctx);

    // Then render the game over overlay on top
    GameOver.render(ctx);
}

/**
 * Update game over screen animations.
 * @param {number} deltaTime - Time since last frame in ms
 */
function updateGameOver(deltaTime) {
    GameOver.update(deltaTime);
}

/**
 * Start a completely new run (reset everything).
 * Called when "New Run" is clicked on game over screen.
 */
function startNewRun() {
    if (isLevelEditorPlaytestMode && currentLevelId) {
        console.log('[Main] Restarting level editor playtest');
        currentRound = 1;
        resetLevelModeStats();
        GameOver.hide();
        Game.setState(GAME_STATES.PLAYING);
        return;
    }

    if (isTankEditorPlaytestMode) {
        console.log('[Main] Restarting tank editor playtest');
        currentRound = 1;
        isLevelMode = false;
        GameOver.hide();
        Game.setState(GAME_STATES.PLAYING);
        return;
    }

    console.log('[Main] Starting new run');
    currentRound = 1;
    isLevelMode = false;
    currentLevelId = null;
    currentLevelData = null;
    activeProjectiles = [];
    currentPuzzleObjects = [];
    pendingSurvivalRunPerk = null;
    resetLevelModeStats();
    Money.init();
    GameOver.hide();
    clearLevelEditorPlaytestState();
    Game.setState(GAME_STATES.PLAYING);
}

/**
 * Set up game over state handlers.
 * Game Over is a terminal state - the run has ended (permadeath).
 */
function setupGameOverState() {
    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.GAME_OVER) {
            handleGameOverClick({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.GAME_OVER) {
            handleGameOverClick({ x, y });
        }
    });

    // Register callback for "New Run" button
    GameOver.onNewRun(() => {
        startNewRun();
    });

    // Register callback for "Garage" button
    GameOver.onGarage(() => {
        GameOver.hide();
        if (isLevelEditorPlaytestMode || isTankEditorPlaytestMode) {
            returnToEditorFromPlaytest();
            return;
        }
        clearLevelEditorPlaytestState();
        Game.setState(GAME_STATES.COLLECTION);
    });

    // Register callback for "Main Menu" button
    GameOver.onMainMenu(() => {
        GameOver.hide();
        if (isLevelEditorPlaytestMode || isTankEditorPlaytestMode) {
            returnToEditorFromPlaytest();
            return;
        }
        clearLevelEditorPlaytestState();
        Game.setState(GAME_STATES.MENU);
    });

    // Register state handlers
    Game.registerStateHandlers(GAME_STATES.GAME_OVER, {
        onEnter: (fromState) => {
            console.log('Entered GAME_OVER state (run ended)');
            // Cancel any pending AI turn
            AI.cancelTurn();
            // Disable game input
            Input.disableGameInput();
            // Play defeat music/stinger
            Music.playForState(GAME_STATES.DEFEAT); // Reuse defeat music for now
        },
        onExit: (toState) => {
            console.log('Exiting GAME_OVER state');
            GameOver.hide();
        },
        update: updateGameOver,
        render: renderGameOverState
    });
}

// =============================================================================
// HIGH SCORES STATE
// =============================================================================

/**
 * High scores screen button definition.
 */
const highScoresBackButton = {
    x: CANVAS.DESIGN_WIDTH / 2,
    y: CANVAS.DESIGN_HEIGHT - 100,
    width: 180,
    height: 50,
    text: 'BACK',
    color: COLORS.NEON_CYAN
};

/**
 * Animation time for high scores screen.
 * @type {number}
 */
let highScoresAnimationTime = 0;

/**
 * Current tab selection for high scores screen.
 * 'local' = player's local scores, 'global' = global leaderboard
 * @type {string}
 */
let highScoresActiveTab = 'global';

/**
 * Tab button definitions for high scores screen.
 */
const highScoresTabs = {
    global: {
        x: CANVAS.DESIGN_WIDTH / 2 - 100,
        y: 110,
        width: 180,
        height: 36,
        text: 'GLOBAL',
        color: COLORS.NEON_CYAN
    },
    local: {
        x: CANVAS.DESIGN_WIDTH / 2 + 100,
        y: 110,
        width: 180,
        height: 36,
        text: 'MY SCORES',
        color: COLORS.NEON_PURPLE
    }
};

/**
 * Refresh button for leaderboard
 */
const highScoresRefreshButton = {
    x: CANVAS.DESIGN_WIDTH - 100,
    y: 100,
    width: 40,
    height: 40,
    text: '↻',
    color: COLORS.NEON_CYAN
};

/**
 * Update high scores button positions based on current screen dimensions.
 * Should be called before rendering or hit testing high scores buttons.
 */
function updateHighScoresButtonPositions() {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const centerX = width / 2;

    highScoresBackButton.x = centerX;
    highScoresBackButton.y = height - 100;

    highScoresTabs.global.x = centerX - 100;
    highScoresTabs.local.x = centerX + 100;

    highScoresRefreshButton.x = width - 100;
}

/**
 * Render the high scores screen.
 * Shows global leaderboard or local scores with tabs.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderHighScores(ctx) {
    // Update button positions for current screen size
    updateHighScoresButtonPositions();

    // Get dynamic screen dimensions
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();

    // Update animation time
    highScoresAnimationTime += 16;

    // Calculate pulse intensity for glowing effects (0-1, oscillating)
    const pulseIntensity = (Math.sin(highScoresAnimationTime * 0.003) + 1) / 2;

    ctx.save();

    // Render synthwave background (reuse menu background)
    renderMenuBackground(ctx);

    // Semi-transparent overlay for content area
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.save();
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 20 + pulseIntensity * 10;
    ctx.font = `bold 48px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fillText('LEADERBOARD', width / 2, 55);
    ctx.restore();

    // Render tab buttons
    renderHighScoresTabButton(ctx, highScoresTabs.global, highScoresActiveTab === 'global', pulseIntensity);
    renderHighScoresTabButton(ctx, highScoresTabs.local, highScoresActiveTab === 'local', pulseIntensity);

    // Get scores based on active tab
    const scores = highScoresActiveTab === 'global'
        ? HighScores.getGlobalLeaderboard()
        : HighScores.getHighScores();
    const lifetimeStats = HighScores.getFormattedLifetimeStats();

    // Connection status indicator for global tab
    if (highScoresActiveTab === 'global') {
        const status = HighScores.getConnectionStatus();
        ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'right';
        if (status.isOnline) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText('● ONLINE', width - 50, 55);
        } else {
            ctx.fillStyle = COLORS.NEON_PINK;
            ctx.fillText('○ OFFLINE', width - 50, 55);
        }
    }

    // Table layout - adjusted Y to account for tabs
    const tableX = width / 2 - 280;
    const tableWidth = 560;
    const tableY = 155;
    const headerHeight = 40;
    const rowHeight = 36;

    // Table background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.7)';
    ctx.beginPath();
    ctx.roundRect(tableX - 20, tableY - 10, tableWidth + 40, headerHeight + rowHeight * 10 + 30, 12);
    ctx.fill();

    // Table border - color based on active tab
    const borderColor = highScoresActiveTab === 'global' ? COLORS.NEON_CYAN : COLORS.NEON_PURPLE;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Table header - different columns for global vs local
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = borderColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const colRank = tableX;
    const colName = tableX + 50;
    const colRounds = highScoresActiveTab === 'global' ? tableX + 220 : tableX + 70;
    const colDamage = highScoresActiveTab === 'global' ? tableX + 320 : tableX + 200;
    const colDate = highScoresActiveTab === 'global' ? tableX + 440 : tableX + 350;

    const headerY = tableY + headerHeight / 2;
    ctx.fillText('#', colRank, headerY);
    if (highScoresActiveTab === 'global') {
        ctx.fillText('PLAYER', colName, headerY);
    }
    ctx.fillText('ROUNDS', colRounds, headerY);
    ctx.fillText('DAMAGE', colDamage, headerY);
    ctx.fillText('DATE', colDate, headerY);

    // Header separator line
    ctx.strokeStyle = `${borderColor}60`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX - 10, tableY + headerHeight);
    ctx.lineTo(tableX + tableWidth + 10, tableY + headerHeight);
    ctx.stroke();

    // Get current player's device ID for highlighting
    const currentDeviceId = highScoresActiveTab === 'global' ? HighScores.getCurrentDeviceId() : null;

    // Table rows
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;

    for (let i = 0; i < 10; i++) {
        const rowY = tableY + headerHeight + rowHeight * i + rowHeight / 2;
        const score = scores[i];

        // Check if this is the current player's row
        const isCurrentPlayer = highScoresActiveTab === 'global' && score && score.deviceId === currentDeviceId;

        // Highlight current player's row with a subtle background
        if (isCurrentPlayer) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
            ctx.fillRect(tableX - 15, rowY - rowHeight / 2 + 2, tableWidth + 30, rowHeight - 4);
        }

        if (score) {
            // Rank with special styling for top 3 or current player
            if (isCurrentPlayer) {
                ctx.fillStyle = COLORS.NEON_CYAN;
            } else {
                ctx.fillStyle = i === 0 ? COLORS.NEON_YELLOW :
                               i === 1 ? '#c0c0c0' :
                               i === 2 ? '#cd7f32' :
                               COLORS.TEXT_LIGHT;
            }
            ctx.fillText(`${i + 1}`, colRank, rowY);

            // Player name (global only)
            if (highScoresActiveTab === 'global') {
                ctx.fillStyle = isCurrentPlayer ? COLORS.NEON_CYAN : COLORS.TEXT_LIGHT;
                const playerName = score.displayName || score.playerName || 'Anonymous';
                // Truncate long names
                const truncatedName = playerName.length > 14 ? playerName.substring(0, 12) + '...' : playerName;
                // Add (YOU) indicator for current player
                ctx.fillText(isCurrentPlayer ? `${truncatedName} ★` : truncatedName, colName, rowY);
            }

            // Rounds
            ctx.fillStyle = isCurrentPlayer ? COLORS.NEON_CYAN : COLORS.TEXT_LIGHT;
            const rounds = score.roundsSurvived || score.rounds || 0;
            ctx.fillText(`${rounds}`, colRounds, rowY);

            // Damage
            const damage = score.totalDamage || score.damage || 0;
            ctx.fillText(damage ? damage.toLocaleString() : '0', colDamage, rowY);

            // Date
            const timestamp = score.timestamp || score._creationTime;
            if (timestamp) {
                const date = new Date(timestamp);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                ctx.fillStyle = isCurrentPlayer ? COLORS.NEON_CYAN : COLORS.TEXT_MUTED;
                ctx.fillText(dateStr, colDate, rowY);
            } else {
                ctx.fillStyle = isCurrentPlayer ? COLORS.NEON_CYAN : COLORS.TEXT_MUTED;
                ctx.fillText('-', colDate, rowY);
            }
        } else {
            // Empty row
            ctx.fillStyle = COLORS.TEXT_MUTED;
            ctx.fillText(`${i + 1}`, colRank, rowY);
            if (highScoresActiveTab === 'global') {
                ctx.fillText('-', colName, rowY);
            }
            ctx.fillText('-', colRounds, rowY);
            ctx.fillText('-', colDamage, rowY);
            ctx.fillText('-', colDate, rowY);
        }
    }

    // Show loading indicator for global tab
    const isLoading = highScoresActiveTab === 'global' && HighScores.isLoadingLeaderboard();
    if (highScoresActiveTab === 'global') {
        const status = HighScores.getConnectionStatus();

        // Show loading overlay when fetching with data
        if (isLoading && scores.length > 0) {
            // Show subtle loading indicator at top
            ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = COLORS.NEON_CYAN;
            ctx.textAlign = 'center';
            ctx.fillText('Refreshing...', width / 2, tableY - 20);
        }

        // Show message when no scores
        if (scores.length === 0) {
            ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = COLORS.TEXT_MUTED;
            ctx.textAlign = 'center';
            const message = isLoading ? 'Loading leaderboard...' :
                           status.isOnline ? 'No scores yet - play to be the first!' :
                           'Offline - connect to see global scores';
            ctx.fillText(message, width / 2, tableY + headerHeight + rowHeight * 4);
        }

        // Render refresh button (only when online)
        if (status.isOnline) {
            const refreshBtn = highScoresRefreshButton;
            const isRefreshing = isLoading;

            // Button background
            ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
            ctx.beginPath();
            ctx.roundRect(refreshBtn.x - refreshBtn.width / 2, refreshBtn.y - refreshBtn.height / 2, refreshBtn.width, refreshBtn.height, 8);
            ctx.fill();

            // Button border with glow
            ctx.strokeStyle = isRefreshing ? COLORS.TEXT_MUTED : COLORS.NEON_CYAN;
            ctx.lineWidth = 2;
            ctx.shadowColor = isRefreshing ? 'transparent' : COLORS.NEON_CYAN;
            ctx.shadowBlur = isRefreshing ? 0 : 5;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Refresh icon with rotation when loading
            ctx.font = `bold 24px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = isRefreshing ? COLORS.TEXT_MUTED : COLORS.NEON_CYAN;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isRefreshing) {
                // Animate the refresh icon
                ctx.save();
                ctx.translate(refreshBtn.x, refreshBtn.y);
                ctx.rotate(highScoresAnimationTime * 0.01);
                ctx.fillText('↻', 0, 0);
                ctx.restore();
            } else {
                ctx.fillText('↻', refreshBtn.x, refreshBtn.y);
            }
        }
    }

    // Lifetime stats section
    const statsY = tableY + headerHeight + rowHeight * 10 + 50;

    // Stats background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.7)';
    ctx.beginPath();
    ctx.roundRect(tableX - 20, statsY - 10, tableWidth + 40, 70, 12);
    ctx.fill();

    // Stats border
    ctx.strokeStyle = COLORS.NEON_PURPLE;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_PURPLE;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Stats label
    ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.textAlign = 'left';
    ctx.fillText('LIFETIME STATS', tableX, statsY + 15);

    // Stats values
    ctx.font = `${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_LIGHT;

    const stat1X = tableX;
    const stat2X = tableX + 180;
    const stat3X = tableX + 360;
    const statValueY = statsY + 42;

    // Total Runs
    ctx.fillText('Total Runs: ', stat1X, statValueY);
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.fillText(`${lifetimeStats.totalRuns}`, stat1X + 90, statValueY);

    // Avg Rounds
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.fillText('Avg Rounds: ', stat2X, statValueY);
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.fillText(`${lifetimeStats.averageRoundsPerRun.toFixed(1)}`, stat2X + 95, statValueY);

    // Best
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.fillText('Best: ', stat3X, statValueY);
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fillText(`${lifetimeStats.bestRound}`, stat3X + 45, statValueY);

    // Back button
    renderHighScoresButton(ctx, highScoresBackButton, pulseIntensity);

    // Neon frame around the screen (reuse from menu)
    ctx.save();
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Corner accents
    const cornerSize = 30;
    ctx.strokeStyle = COLORS.NEON_YELLOW;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.lineWidth = 4;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(20, 20 + cornerSize);
    ctx.lineTo(20, 20);
    ctx.lineTo(20 + cornerSize, 20);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(width - 20 - cornerSize, 20);
    ctx.lineTo(width - 20, 20);
    ctx.lineTo(width - 20, 20 + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(20, height - 20 - cornerSize);
    ctx.lineTo(20, height - 20);
    ctx.lineTo(20 + cornerSize, height - 20);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(width - 20 - cornerSize, height - 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.lineTo(width - 20, height - 20 - cornerSize);
    ctx.stroke();

    ctx.restore();

    ctx.restore();

    // Render CRT effects as final post-processing overlay (fullscreen)
    renderCrtEffects(ctx, width, height, getCrtFullscreenParams());
}

/**
 * Render a button for the high scores screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button definition
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderHighScoresTabButton(ctx, tab, isActive, pulseIntensity) {
    const halfWidth = tab.width / 2;
    const halfHeight = tab.height / 2;
    const tabX = tab.x - halfWidth;
    const tabY = tab.y - halfHeight;

    ctx.save();

    // Tab background
    if (isActive) {
        ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    } else {
        ctx.fillStyle = 'rgba(20, 20, 40, 0.5)';
    }
    ctx.beginPath();
    ctx.roundRect(tabX, tabY, tab.width, tab.height, 6);
    ctx.fill();

    // Tab border with glow if active
    ctx.strokeStyle = isActive ? tab.color : `${tab.color}60`;
    ctx.lineWidth = isActive ? 2 : 1;
    if (isActive) {
        ctx.shadowColor = tab.color;
        ctx.shadowBlur = 8 + pulseIntensity * 5;
    }
    ctx.beginPath();
    ctx.roundRect(tabX, tabY, tab.width, tab.height, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Tab text
    ctx.fillStyle = isActive ? COLORS.TEXT_LIGHT : COLORS.TEXT_MUTED;
    ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tab.text, tab.x, tab.y);

    ctx.restore();
}

/**
 * Render a button for the high scores screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} button - Button definition
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderHighScoresButton(ctx, button, pulseIntensity) {
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    const btnX = button.x - halfWidth;
    const btnY = button.y - halfHeight;

    ctx.save();

    // Button background with rounded corners
    ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, button.width, button.height, 8);
    ctx.fill();

    // Neon glow effect (pulsing)
    ctx.shadowColor = button.color;
    ctx.shadowBlur = 15 + pulseIntensity * 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Button border (neon outline)
    ctx.strokeStyle = button.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, button.width, button.height, 8);
    ctx.stroke();

    // Reset shadow for text
    ctx.shadowBlur = 0;

    // Button text with glow
    ctx.shadowColor = button.color;
    ctx.shadowBlur = 8 + pulseIntensity * 5;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold ${UI.FONT_SIZE_LARGE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x, button.y);

    ctx.restore();
}

/**
 * Handle click on the high scores screen.
 * @param {{x: number, y: number}} pos - Click position in game coordinates
 */
function handleHighScoresClick(pos) {
    if (Game.getState() !== GAME_STATES.HIGH_SCORES) return;

    // Ensure button positions are current for the screen size
    updateHighScoresButtonPositions();

    // Check tab clicks
    if (isInsideButton(pos.x, pos.y, highScoresTabs.global)) {
        if (highScoresActiveTab !== 'global') {
            Sound.playClickSound();
            highScoresActiveTab = 'global';
            // Trigger leaderboard refresh
            HighScores.fetchGlobalLeaderboard(true).catch(() => {});
        }
        return;
    }

    if (isInsideButton(pos.x, pos.y, highScoresTabs.local)) {
        if (highScoresActiveTab !== 'local') {
            Sound.playClickSound();
            highScoresActiveTab = 'local';
        }
        return;
    }

    // Check refresh button click (global tab only)
    if (highScoresActiveTab === 'global' && isInsideButton(pos.x, pos.y, highScoresRefreshButton)) {
        // Only refresh if not already loading
        if (!HighScores.isLoadingLeaderboard()) {
            Sound.playClickSound();
            HighScores.fetchGlobalLeaderboard(true).catch(() => {});
        }
        return;
    }

    if (isInsideButton(pos.x, pos.y, highScoresBackButton)) {
        Sound.playClickSound();
        Game.setState(GAME_STATES.MENU);
    }
}

/**
 * Handle keyboard input on the high scores screen.
 * @param {string} keyCode - Key code from KeyboardEvent
 */
function handleHighScoresKeyDown(keyCode) {
    if (Game.getState() !== GAME_STATES.HIGH_SCORES) return;

    if (keyCode === 'Escape') {
        Sound.playClickSound();
        Game.setState(GAME_STATES.MENU);
    }
}

/**
 * Set up high scores state handlers.
 */
function setupHighScoresState() {
    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.HIGH_SCORES) {
            handleHighScoresClick({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.HIGH_SCORES) {
            handleHighScoresClick({ x, y });
        }
    });

    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.HIGH_SCORES) {
            handleHighScoresKeyDown(keyCode);
        }
    });

    // Register state handlers
    Game.registerStateHandlers(GAME_STATES.HIGH_SCORES, {
        onEnter: (fromState) => {
            console.log('Entered HIGH_SCORES state');
            highScoresAnimationTime = 0;
            // Play menu music (reuse)
            Music.playForState(GAME_STATES.MENU);
        },
        onExit: (toState) => {
            console.log('Exiting HIGH_SCORES state');
        },
        render: renderHighScores
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
    if (isLevelEditorPlaytestMode || isTankEditorPlaytestMode) {
        PauseMenu.hide();
        Game.resumeLoop();
        prePauseState = null;
        returnToEditorFromPlaytest();
        return;
    }

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
    clearPersistentTrails();
    clearFalloutZones();
    clearTerrainDerezEffects();
    explosionEffect = null;

    // Reset round counter for new game
    currentRound = 1;
    clearLevelEditorPlaytestState();

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

    // Handle pointer up - triggers button actions when released on same button
    Input.onMouseUp((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.PAUSED) {
            const result = PauseMenu.handlePointerUpWithAction(x, y);
            handlePauseMenuAction(result);
        }
    });

    Input.onTouchEnd((x, y) => {
        if (Game.getState() === GAME_STATES.PAUSED) {
            const result = PauseMenu.handlePointerUpWithAction(x, y);
            handlePauseMenuAction(result);
        }
    });

    // Register escape/P key handler for pausing/resuming
    Input.onKeyDown((keyCode) => {
        // Both Escape and P key can pause/resume
        if (keyCode !== 'Escape' && keyCode !== 'KeyP') return;

        const state = Game.getState();

        // If paused, handle escape/P via pause menu
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

    // Register pointer handlers for shop (mouse and touch)
    // Using pointer down/move/up pattern for proper swipe scroll support
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.SHOP) {
            Shop.handlePointerDown(x, y);
        }
    });

    Input.onMouseUp((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.SHOP) {
            Shop.handlePointerUp(x, y);
        }
    });

    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.SHOP) {
            Shop.handlePointerMove(x, y);
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.SHOP) {
            Shop.handlePointerDown(x, y);
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.SHOP) {
            Shop.handlePointerMove(x, y);
        }
    });

    Input.onTouchEnd((x, y) => {
        if (Game.getState() === GAME_STATES.SHOP) {
            Shop.handlePointerUp(x, y);
        }
    });

    // Handle wheel scroll for shop category rows
    // Need to add wheel listener directly since Input module doesn't support it
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('wheel', (e) => {
            if (Game.getState() === GAME_STATES.SHOP) {
                // Convert screen coordinates to design coordinates using renderer
                const designCoords = Renderer.screenToDesign(e.clientX, e.clientY);

                if (Shop.handleWheel(designCoords.x, designCoords.y, e.deltaY, e.shiftKey)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    }

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

async function loadTitleFontWithTimeout(timeoutMs = 1200) {
    if (!document.fonts?.load) {
        return false;
    }

    let timeoutId = null;
    const timeout = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(false), timeoutMs);
    });

    try {
        const loaded = await Promise.race([
            document.fonts.load(`120px ${UI.TITLE_FONT_FAMILY}`).then(() => true),
            timeout
        ]);

        return loaded;
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
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

    // Initialize haptic feedback (for mobile devices)
    await Haptics.initHaptics();

    // Set up audio initialization on first user interaction
    // Web Audio API requires user gesture to start
    setupAudioInit(canvas);

    // Load startup assets before starting the game. Gameplay and secondary
    // screen art lazy-loads as states are entered.
    // Note: loadManifest gracefully handles missing manifest files
    await Assets.loadManifest();
    await Assets.loadAssetGroups([Assets.ASSET_GROUPS.BOOT, Assets.ASSET_GROUPS.TITLE], (loaded, total, percentage) => {
        console.log(`Loading startup assets: ${percentage}% (${loaded}/${total})`);
    });

    // Initialize game state
    Game.init();
    registerAssetStateLoading();

    // Initialize debug module
    Debug.init();

    // Preload Audiowide font to prevent flash of unstyled text (FOUT) on title screen
    // Use document.fonts.load() to explicitly load the font before rendering
    try {
        const fontLoaded = await loadTitleFontWithTimeout();
        if (fontLoaded) {
            console.log('Audiowide font loaded successfully');
        } else {
            console.warn('Audiowide font load timed out, continuing with fallback font');
        }
    } catch (err) {
        console.warn('Font preloading failed, title may flash:', err);
    }

    // Initialize synthwave background (static layer behind gameplay)
    initBackground(Renderer.getWidth(), Renderer.getHeight());

    // Initialize the GPU-backed terrain visuals. Gameplay keeps the Canvas 2D
    // renderer; Pixi is composited into the terrain pass when available.
    await initPixiTerrainLayer({
        width: Renderer.getWidth(),
        height: Renderer.getHeight()
    });

    // Initialize Three.js title scene (animated 3D background for menu)
    TitleScene.init();
    TitleScene.start();

    // Setup state handlers BEFORE starting the loop
    // These register the update/render functions for each state
    setupMenuState();
    setupModeSelectState();
    setupDifficultySelectState();
    setupHighScoresState();
    AchievementScreen.setup();
    CollectionScreen.setup();
    SupplyDropScreen.setup();
    LevelSelectScreen.setup();
    LevelEditorScreen.setup();
    TankEditorScreen.setup();
    LevelCompleteScreen.setBackgroundRenderer(renderPlaying);
    LevelCompleteScreen.setup();
    setupPlayingState();
    setupPausedState();
    setupVictoryState();
    setupDefeatState();
    setupRoundTransitionState();
    setupGameOverState();
    setupShopState();

    // Set up Level Complete screen callbacks
    setupLevelCompleteCallbacks();

    // Listen for level selection from Level Select screen
    window.addEventListener('levelSelected', handleLevelSelected);

    // Listen for level editor playtest requests.
    window.addEventListener('levelEditorPlaytestRequested', (event) => {
        const { levelId, slotLayout } = event.detail || {};
        if (!levelId) return;

        const level = LevelRegistry.getLevel(levelId);
        if (!level) {
            console.warn(`[Main] Level editor playtest requested unknown level: ${levelId}`);
            return;
        }

        currentLevelId = levelId;
        currentLevelData = level;
        currentRound = 1;
        isLevelMode = true;
        isLevelEditorPlaytestMode = true;
        isTankEditorPlaytestMode = false;
        levelEditorSlotOverride = slotLayout || null;
        tankEditorPlaytestSkinId = null;
        resetLevelModeStats();

        Game.setState(GAME_STATES.PLAYING);
    });

    // Listen for Tank Forge playtest requests.
    window.addEventListener('tankEditorPlaytestRequested', (event) => {
        const { skinId, design } = event.detail || {};
        if (!design) return;

        currentLevelId = null;
        currentLevelData = null;
        currentRound = 1;
        isLevelMode = false;
        isLevelEditorPlaytestMode = false;
        isTankEditorPlaytestMode = true;
        levelEditorSlotOverride = null;
        tankEditorPlaytestSkinId = skinId || null;

        // Runtime override is set by Tank Forge before dispatch; this call guards stale state.
        setRuntimeTankDesign(PLAYER_RUNTIME_OVERRIDE_KEY, design);

        Game.setState(GAME_STATES.PLAYING);
    });

    window.addEventListener('tankEditorExportRequested', (event) => {
        const count = event?.detail?.designs?.length || 0;
        console.log(`[Main] Tank Forge export requested (${count} designs)`);
    });

    // Register 'D' key to toggle debug mode
    Input.onKeyDown((keyCode) => {
        if (keyCode === DEBUG.TOGGLE_KEY) {
            Debug.toggle();
        }
    });

    // Initialize debug tools with game state accessors
    DebugTools.init({
        getPlayerTank: () => playerTank,
        getEnemyTank: () => enemyTank,
        getCurrentRound: () => currentRound,
        setCurrentRound: (round) => { currentRound = round; }
    });

    // Initialize TestAPI with game state accessors
    TestAPI.init({
        getPlayerTank: () => playerTank,
        getEnemyTank: () => enemyTank,
        getTerrain: () => currentTerrain,
        getPuzzleObjects: () => currentPuzzleObjects,
        fireProjectile: fireProjectile,
        destroyTerrainAt,
        getDerezFragmentCount: getPixiTerrainFragmentCount,
        playerAim: playerAim
    });
    installAutomationHooks();

    // Set up terrain change callback for TestAPI.generateTerrain()
    TestAPI.setOnTerrainChange((newTerrain) => {
        currentTerrain = newTerrain;
        markPixiTerrainLayerDirty();
        console.log('[Main] Terrain updated via TestAPI');
    });

    // Initialize debug overlays with game state accessors
    DebugOverlays.init({
        getPlayerTank: () => playerTank,
        getEnemyTank: () => enemyTank,
        getTerrain: () => currentTerrain,
        getActiveProjectile: () => activeProjectiles[0] || null,
        playerAim: playerAim
    });

    // Register debug keyboard shortcuts (Shift+1-9 when debug mode is on)
    // Also handles debug overlay shortcuts (Shift+T/C/G/V/A)
    document.addEventListener('keydown', (event) => {
        // Name entry modal has priority for keyboard input
        if (NameEntry.isOpen()) {
            NameEntry.handleKeyDown(event);
            return;
        }
        // Try debug tools shortcuts first, then debug overlays
        if (!DebugTools.handleKeyDown(event)) {
            DebugOverlays.handleKeyDown(event);
        }
    });

    // Initialize achievement popup system
    AchievementPopup.init();

    // Initialize supply drop animation system
    SupplyDrop.init();

    // Initialize extraction reveal animation system (for Legendary tanks)
    ExtractionReveal.init();

    // Initialize combat achievement detection
    CombatAchievements.init();

    // Initialize precision achievement detection
    PrecisionAchievements.init();

    // Initialize weapon mastery achievement detection
    WeaponAchievements.init();

    // Initialize progression and economy achievement detection
    ProgressionAchievements.init();

    // Initialize hidden achievement detection
    HiddenAchievements.init();

    // Initialize token system (for supply drop currency)
    Tokens.init();

    // Initialize tank collection system
    TankCollection.init();

    // Initialize performance tracking system (for supply drop odds)
    PerformanceTracking.init();

    // Initialize pity system (bad luck protection for supply drops)
    PitySystem.init();

    // Initialize lifetime statistics tracking
    LifetimeStats.init();

    // Initialize daily engagement systems
    DailyRewards.init();
    DailyChallenges.init();
    EngagementUI.init({
        addMoney: (amount) => Money.addMoney(amount, 'daily_reward'),
        addTokens: (amount) => Tokens.addTokens(amount, 'daily_reward'),
        grantWeapon: null, // Weapons granted at round start
        grantRandomTank: () => TankCollection.unlockRandomTank(),
        grantSupplyDrop: null // Supply drops handled separately
    });

    // Initialize name entry module
    NameEntry.init();
    loadOnboardingState();

    // Route terrain destruction events into anchored visual effects.
    registerTerrainDerezEventHandlers();

    // Set up VolumeControls callback for Change Name button
    VolumeControls.setChangeNameCallback(() => {
        // Close options overlay first
        optionsOverlayVisible = false;
        VolumeControls.reset();
        // Show name entry modal
        NameEntry.show({
            isFirstTime: false,
            onConfirm: (name) => {
                console.log('[Main] Player name changed to:', name);
            }
        });
    });

    // Set up VolumeControls callback for Close button
    VolumeControls.setCloseCallback(() => {
        closeOptionsOverlay();
    });

    VolumeControls.setPrivacyCallback(() => {
        openReleaseInfoPage('privacy.html');
    });

    VolumeControls.setSupportCallback(() => {
        openReleaseInfoPage('support.html');
    });

    // On initial startup, defer first-time name entry until after first completed round.
    // (The MENU onEnter handler doesn't fire on initial state since Game.init() sets state directly.)
    const didScheduleNameEntry = scheduleDeferredNameEntryIfNeeded();
    void didScheduleNameEntry;

    // Register performance tracking callback for achievement unlocks (grants +15% bonus)
    onAchievementUnlock(() => {
        PerformanceTracking.onAchievementUnlocked();
    });

    // Register lifetime stats callback for achievement unlocks
    onAchievementUnlock(() => {
        LifetimeStats.recordAchievementUnlocked();
    });

    // Register post-render callback for achievement popups (renders on top of all game content)
    Game.setPostRenderCallback(postRender);

    console.log('Scorched Earth initialized');

    // Expose modules for debugging/testing
    window.AI = AI;
    window.Game = Game;
    window.Shop = Shop;
    window.Money = Money;
    window.VictoryDefeat = VictoryDefeat;
    window.GameOver = GameOver;
    window.RoundTransition = RoundTransition;
    window.DebugTools = DebugTools;
    window.AchievementPopup = AchievementPopup;
    window.TankCollection = TankCollection;
    window.PerformanceTracking = PerformanceTracking;
    window.PitySystem = PitySystem;
    window.SupplyDrop = SupplyDrop;
    window.ExtractionReveal = ExtractionReveal;
    window.LifetimeStats = LifetimeStats;
    window.LevelCompleteScreen = LevelCompleteScreen;
    // Expose DebugTools as 'Debug' for convenience (e.g., Debug.skipToShop())
    // This creates a merged object with both Debug module and DebugTools functions
    window.Debug = { ...Debug, ...DebugTools };
    window.SceneIsolation = SceneIsolation;

    // Expose game objects for testing/debugging
    window.getPlayerTank = () => playerTank;
    window.getEnemyTank = () => enemyTank;
    window.getTerrain = () => currentTerrain;

    // Initialize scene isolation (parse URL parameters)
    const sceneInfo = SceneIsolation.init();

    // Enable debug mode if requested via URL
    if (SceneIsolation.isDebugRequested()) {
        Debug.setEnabled(true);
        console.log('[Main] Debug mode enabled via URL parameter');
    }

    // Start the game loop with update, render, and context
    Game.startLoop(update, render, ctx);

    // Handle scene isolation routing after loop starts
    // This allows us to bypass the menu and go directly to test scenes
    if (SceneIsolation.hasTestScene()) {
        handleSceneIsolation(sceneInfo.scene, sceneInfo.params);
    }
}

/**
 * Handle scene isolation - route to appropriate test scene based on URL params.
 * @param {Object|null} scene - Scene configuration from SceneIsolation
 * @param {Object} params - URL parameters
 */
function handleSceneIsolation(scene, params) {
    deactivatePhysicsPlaygroundScene();

    if (!scene) {
        console.warn('[SceneIsolation] Unknown scene:', params.scene);
        console.log('[SceneIsolation] Available scenes:', SceneIsolation.listScenes().join(', '));
        return;
    }

    console.log(`[SceneIsolation] Setting up scene: ${scene.name}`);

    // Stop title scene animation for test scenes
    TitleScene.stop();

    // Apply URL parameter overrides
    if (params.round !== null) {
        currentRound = params.round;
        console.log(`[SceneIsolation] Starting at round ${currentRound}`);
    }

    if (params.money !== null) {
        Money.init();
        Money.addMoney(params.money - GAME.STARTING_MONEY);
        console.log(`[SceneIsolation] Starting money: ${params.money}`);
    }

    // Handle specific scenes
    switch (params.scene) {
        case 'slingshot-test':
            setupSlingshotTestScene(scene, params);
            break;

        case 'physics-sandbox':
            setupPhysicsSandboxScene(scene, params);
            break;

        case 'physics-playground':
            setupPhysicsPlaygroundScene(scene, params);
            break;

        case 'shop':
            setupShopTestScene(scene, params);
            break;

        case 'terrain-viewer':
            setupTerrainViewerScene(scene, params);
            break;

        case 'visual-hud':
        case 'visual-impact':
        case 'visual-tank-pivots':
        case 'visual-terrain-collapse':
            setupVisualRegressionScene(scene, params);
            break;

        case 'ai-debug':
            setupAIDebugScene(scene, params);
            break;

        case 'round-start':
            setupRoundStartScene(scene, params);
            break;

        case 'level-editor':
            setupLevelEditorScene(scene, params);
            break;

        case 'tank-editor':
            setupTankEditorScene(scene, params);
            break;

        default:
            // Generic scene: just skip to playing state
            Game.setState(GAME_STATES.PLAYING);
            break;
    }
}

/**
 * Setup slingshot/aiming test scene.
 * Minimal setup for testing touch aiming controls.
 */
function setupSlingshotTestScene(scene, params) {
    console.log('[SceneIsolation] Setting up slingshot test scene');

    // Initialize game state without going through menus
    startNewRunState();
    Money.init();

    // Generate terrain
    currentTerrain = generateTerrain(undefined, undefined, {
        roughness: 0.5,
        minHeightPercent: 0.2,
        maxHeightPercent: 0.7,
        seed: params.seed
    });

    // Place tanks
    const tanks = placeTanksOnTerrain(currentTerrain);
    playerTank = tanks.player;
    enemyTank = tanks.enemy;

    // Set fixed wind if specified, otherwise disable wind for consistent testing
    if (params.wind !== null) {
        Wind.setWind(params.wind);
    } else {
        Wind.setWind(0);
    }

    // Update TestAPI references
    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);

    // Initialize turn system
    Turn.init();
    // Turn.init() automatically sets phase to PLAYER_AIM

    // Enable game input for aiming
    Input.enableGameInput();

    // Go to playing state
    Game.setState(GAME_STATES.PLAYING);

    // Reapply deterministic scene hooks after PLAYING creates round entities.
    if (params.wind !== null) {
        Wind.setWind(params.wind);
    } else {
        Wind.setWind(0);
    }
    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);
    Input.enableGameInput();

    console.log('[SceneIsolation] Slingshot test ready - use TestAPI.aim() and TestAPI.fire() to test');
}

/**
 * Setup physics sandbox scene.
 * Full physics testing with trajectory visualization.
 */
function setupPhysicsSandboxScene(scene, params) {
    console.log('[SceneIsolation] Setting up physics sandbox');

    // Initialize game state
    startNewRunState();
    Money.init();

    // Give player all weapons with unlimited ammo for testing
    Money.addMoney(99999);

    // Generate terrain
    currentTerrain = generateTerrain(undefined, undefined, {
        ...getSurvivalTerrainOptionsForRound(currentRound),
        seed: params.seed
    });

    // Place tanks
    const tanks = placeTanksOnTerrain(currentTerrain);
    playerTank = tanks.player;
    enemyTank = tanks.enemy;

    // Set wind (use URL param or enable normal wind)
    if (params.wind !== null) {
        Wind.setWind(params.wind);
    } else {
        Wind.generateRandomWind();
    }

    // Update TestAPI references
    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);

    // Initialize turn system
    Turn.init();
    // Turn.init() automatically sets phase to PLAYER_AIM

    // Enable debug mode for physics visualization
    Debug.setEnabled(true);

    // Enable game input
    Input.enableGameInput();

    // Go to playing state
    Game.setState(GAME_STATES.PLAYING);

    // PLAYING onEnter creates the actual round entities, so test-only state has
    // to be applied after entering the state.
    const allWeapons = WeaponRegistry.getAllWeapons();
    for (const weapon of allWeapons) {
        playerTank.inventory[weapon.id] = 999;
    }

    if (params.wind !== null) {
        Wind.setWind(params.wind);
    }

    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);
    Input.enableGameInput();

    console.log('[SceneIsolation] Physics sandbox ready');
    console.log('  - TestAPI.simulateProjectile({ angle, power }) - simulate without firing');
    console.log('  - TestAPI.fireAndCollect({ angle, power }) - simulate with damage calculation');
    console.log('  - TestAPI.validatePhysics({ angle, power, expectedRange }) - validate physics');
    console.log('  - All weapons available with unlimited ammo');
}

/**
 * Setup interactive physics playground scene.
 * Direct mouse/touch impacts route through the same terrain and weapon systems
 * used by gameplay, with progression/input gates removed.
 */
function setupPhysicsPlaygroundScene(scene, params) {
    console.log('[SceneIsolation] Setting up physics playground');

    physicsPlaygroundState.active = true;
    physicsPlaygroundState.tool = 'weapon';
    physicsPlaygroundState.seed = params.seed ?? scene.setup.seed ?? physicsPlaygroundState.seed;
    physicsPlaygroundState.craterRadius = params.radius ?? scene.setup.craterRadius ?? physicsPlaygroundState.craterRadius;
    physicsPlaygroundState.selectedWeaponId = params.weapon || scene.setup.startingWeapon || physicsPlaygroundState.selectedWeaponId;
    physicsPlaygroundState.pointerDown = false;
    physicsPlaygroundState.hover = null;
    physicsPlaygroundState.lastImpact = null;

    Debug.setEnabled(false);
    Game.setState(GAME_STATES.PLAYING);
    resetPhysicsPlayground();
    setPhysicsPlaygroundWeapon(physicsPlaygroundState.selectedWeaponId);
    Wind.setWind(params.wind ?? scene.setup.windValue ?? 0);
    Input.disableGameInput();
    exposePhysicsPlaygroundApi();

    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);

    console.log('[SceneIsolation] Physics playground ready');
    console.log('  - Mouse/touch terrain directly to trigger the active playground tool');
    console.log('  - window.__SCORCHED_PHYSICS_PLAYGROUND.getState() exposes playground state');
}

/**
 * Setup shop test scene.
 * Shop UI with generous budget for testing.
 */
function setupShopTestScene(scene, params) {
    console.log('[SceneIsolation] Setting up shop test scene');

    // Initialize money with generous budget
    Money.init();
    const startingMoney = params.money ?? scene.setup.startingMoney ?? 10000;
    Money.addMoney(startingMoney - GAME.STARTING_MONEY);

    // Set round number for shop pricing
    currentRound = params.round ?? 1;

    // Create a mock player tank for inventory
    playerTank = {
        x: 0,
        y: 0,
        health: TANK.START_HEALTH,
        maxHealth: TANK.START_HEALTH,
        inventory: {
            'basic-shot': Infinity
        },
        currentWeapon: 'basic-shot',
        angle: 45,
        power: 50,
        team: 'player'
    };

    // Go directly to shop state
    Game.setState(GAME_STATES.SHOP);

    console.log('[SceneIsolation] Shop test ready');
    console.log(`  - Starting money: $${Money.getMoney()}`);
    console.log('  - Use Money.addMoney(amount) to add more money');
}

/**
 * Setup terrain viewer scene.
 * View terrain generation with seed control.
 */
function setupTerrainViewerScene(scene, params) {
    console.log('[SceneIsolation] Setting up terrain viewer');

    // Initialize game state
    startNewRunState();
    Money.init();

    // Generate terrain with optional seed
    const seed = params.seed ?? Math.floor(Math.random() * 1000000);
    currentTerrain = generateTerrain(undefined, undefined, {
        roughness: 0.5,
        minHeightPercent: 0.2,
        maxHeightPercent: 0.7,
        seed: seed
    });

    // Place tanks for reference
    const tanks = placeTanksOnTerrain(currentTerrain);
    playerTank = tanks.player;
    enemyTank = tanks.enemy;

    // Disable wind
    Wind.setWind(0);

    // Update TestAPI references
    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);

    // Initialize turn system but don't enable firing
    Turn.init();

    // Enable debug mode
    Debug.setEnabled(true);

    // Go to playing state (view only)
    Game.setState(GAME_STATES.PLAYING);

    console.log('[SceneIsolation] Terrain viewer ready');
    console.log(`  - Seed: ${seed}`);
    console.log('  - Reload with ?scene=terrain-viewer&seed=<number> to regenerate');
    console.log('  - getTerrain().getHeight(x) to query terrain height');
}

/**
 * Setup deterministic graphics modernization scenes for browser visual captures.
 */
function setupVisualRegressionScene(scene, params) {
    const setup = scene.setup;
    console.log(`[SceneIsolation] Setting up visual regression scene: ${setup.visualType}`);

    startNewRunState();
    Money.init();

    currentRound = params.round ?? setup.round ?? 1;
    Money.addMoney((params.money ?? setup.money ?? GAME.STARTING_MONEY) - GAME.STARTING_MONEY);

    currentTerrain = generateTerrain(undefined, undefined, {
        roughness: 0.42,
        minHeightPercent: 0.22,
        maxHeightPercent: 0.68,
        seed: params.seed ?? setup.seed
    });

    const tanks = placeTanksOnTerrain(currentTerrain);
    playerTank = tanks.player;
    enemyTank = tanks.enemy;

    const windValue = params.wind ?? setup.windValue ?? 0;
    Wind.setWind(windValue);

    const allWeapons = WeaponRegistry.getAllWeapons();
    for (const weapon of allWeapons) {
        playerTank.inventory[weapon.id] = 99;
    }
    playerTank.setWeapon(params.weapon || 'basic-shot');

    Turn.init();
    Debug.setEnabled(false);
    Input.enableGameInput();

    Game.setState(GAME_STATES.PLAYING);

    currentRound = params.round ?? setup.round ?? currentRound;
    if (setup.playerHealth) {
        playerTank.health = setup.playerHealth;
        playerTank.maxHealth = TANK.START_HEALTH;
    }
    if (setup.enemyHealth) {
        enemyTank.health = setup.enemyHealth;
        enemyTank.maxHealth = setup.enemyHealth;
    }

    playerAim.angle = setup.playerAngle ?? 43;
    playerAim.power = 66;
    playerTank.angle = playerAim.angle;
    playerTank.power = playerAim.power;
    enemyTank.angle = setup.enemyAngle ?? 137;
    enemyTank.power = 62;
    Wind.setWind(windValue);

    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);

    if (typeof window !== 'undefined') {
        window.__SCORCHED_VISUAL_SCENE = {
            name: setup.visualType,
            ready: setup.visualType !== 'impact' && setup.visualType !== 'terrain-collapse',
            trigger: null,
            lastTriggeredAt: null
        };
    }

    if (setup.visualType === 'impact' || setup.visualType === 'terrain-collapse') {
        const triggerVisualImpact = () => {
            const impactX = setup.impactX ?? Renderer.getWidth() / 2;
            const impactY = getTerrainGridSurfaceYAt(currentTerrain, impactX);
            destroyTerrainAt(impactX, impactY, setup.impactRadius ?? 72);
            if (typeof window !== 'undefined' && window.__SCORCHED_VISUAL_SCENE) {
                window.__SCORCHED_VISUAL_SCENE.ready = true;
                window.__SCORCHED_VISUAL_SCENE.lastTriggeredAt = performance.now();
            }
        };

        if (typeof window !== 'undefined' && window.__SCORCHED_VISUAL_SCENE) {
            window.__SCORCHED_VISUAL_SCENE.trigger = triggerVisualImpact;
        }

        setTimeout(triggerVisualImpact, 150);
    }

    console.log('[SceneIsolation] Visual regression scene ready');
    console.log(`  - Scene: ${setup.visualType}`);
    console.log(`  - Seed: ${params.seed ?? setup.seed}`);
    console.log(`  - Wind: ${windValue}`);
}

/**
 * Setup AI debug scene.
 * Watch AI decision making in action.
 */
function setupAIDebugScene(scene, params) {
    console.log('[SceneIsolation] Setting up AI debug scene');

    // Initialize game state
    startNewRunState();
    Money.init();

    // Generate terrain
    currentTerrain = generateTerrain(undefined, undefined, {
        roughness: 0.5,
        minHeightPercent: 0.2,
        maxHeightPercent: 0.7,
        seed: params.seed
    });

    // Place tanks
    const tanks = placeTanksOnTerrain(currentTerrain);
    playerTank = tanks.player;
    enemyTank = tanks.enemy;

    // Set deterministic wind when requested, otherwise generate survival wind normally.
    if (params.wind !== null) {
        Wind.setWind(params.wind);
    } else {
        Wind.generateRandomWind();
    }

    // URL param values map to AI_DIFFICULTY enum strings
    const difficultyMap = { easy: 'easy', medium: 'medium', hard: 'hard', hard_plus: 'hard_plus' };
    const difficulty = difficultyMap[params.difficulty] ?? 'medium';

    // Update TestAPI references
    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);

    // Initialize turn system
    Turn.init();

    // Enable debug mode
    Debug.setEnabled(true);

    // Start AI turn to see decision making
    Turn.setPhase(TURN_PHASES.AI_AIM);

    // Go to playing state (this will trigger game init which sets AI difficulty based on round)
    Game.setState(GAME_STATES.PLAYING);

    // Override AI difficulty AFTER state transition to use URL parameter value
    // This must come after Game.setState() because the PLAYING state handler resets difficulty
    AI.setDifficulty(difficulty);

    console.log('[SceneIsolation] AI debug ready');
    console.log(`  - AI difficulty: ${AI.getDifficultyName(difficulty)}`);
    console.log('  - Watch console for AI decision logging');
}

/**
 * Setup round-start scene.
 * Jump to a specific round with appropriate scaling.
 */
function setupRoundStartScene(scene, params) {
    const targetRound = params.round ?? 1;
    console.log(`[SceneIsolation] Setting up round ${targetRound}`);

    // Set round number
    currentRound = targetRound;

    // Initialize game state
    startNewRunState();
    Money.init();

    // Generate terrain
    currentTerrain = generateTerrain(undefined, undefined, {
        roughness: 0.5,
        minHeightPercent: 0.2,
        maxHeightPercent: 0.7,
        seed: params.seed
    });

    // Place tanks
    const tanks = placeTanksOnTerrain(currentTerrain);
    playerTank = tanks.player;
    enemyTank = tanks.enemy;

    // Scale enemy health based on round
    const enemyHealth = getEnemyHealthForRound(currentRound);
    enemyTank.health = enemyHealth;
    enemyTank.maxHealth = enemyHealth;

    // Apply health overrides from URL
    if (params.playerHealth !== null) {
        playerTank.health = params.playerHealth;
        playerTank.maxHealth = params.playerHealth;
    }
    if (params.enemyHealth !== null) {
        enemyTank.health = params.enemyHealth;
        enemyTank.maxHealth = params.enemyHealth;
    }

    // Set deterministic wind when requested, otherwise generate survival wind normally.
    if (params.wind !== null) {
        Wind.setWind(params.wind);
    } else {
        Wind.generateRandomWind();
    }

    // Determine difficulty from URL or round
    let difficulty;
    if (params.difficulty) {
        // URL param values map to AI_DIFFICULTY enum strings
        const difficultyMap = { easy: 'easy', medium: 'medium', hard: 'hard', hard_plus: 'hard_plus' };
        difficulty = difficultyMap[params.difficulty] ?? 'medium';
    } else {
        difficulty = AI.getAIDifficulty(currentRound);
    }

    // Update TestAPI references
    TestAPI.setPlayerTank(playerTank);
    TestAPI.setEnemyTank(enemyTank);
    TestAPI.setTerrain(currentTerrain);

    // Initialize turn system
    Turn.init();
    // Turn.init() automatically sets phase to PLAYER_AIM

    // Enable game input
    Input.enableGameInput();

    // Go to playing state (this will trigger game init which sets AI difficulty based on round)
    Game.setState(GAME_STATES.PLAYING);

    // Override AI difficulty AFTER state transition to use URL parameter value
    // This must come after Game.setState() because the PLAYING state handler resets difficulty
    AI.setDifficulty(difficulty);
    if (params.wind !== null) {
        Wind.setWind(params.wind);
    }

    console.log('[SceneIsolation] Round start ready');
    console.log(`  - Round: ${currentRound}`);
    console.log(`  - Enemy health: ${enemyTank.health} HP`);
    console.log(`  - AI difficulty: ${AI.getDifficultyName(difficulty)}`);
}

/**
 * Setup level editor scene.
 * Opens URL-only editor route with optional slot preselection.
 */
function setupLevelEditorScene(scene, params) {
    console.log('[SceneIsolation] Setting up level editor');
    clearLevelEditorPlaytestState();

    const requestedSlot = params.slot ?? null;
    if (requestedSlot) {
        console.log(`[SceneIsolation] Opening editor at slot ${requestedSlot}`);
    }

    LevelEditorScreen.configureSceneEntry(requestedSlot);
    Game.setState(GAME_STATES.LEVEL_EDITOR);
}

/**
 * Setup tank editor scene.
 * Opens URL-only Tank Forge route with optional tank/family preselection.
 */
function setupTankEditorScene(scene, params) {
    console.log('[SceneIsolation] Setting up tank editor');
    clearLevelEditorPlaytestState();

    if (params.tank) {
        console.log(`[SceneIsolation] Opening tank editor at tank ${params.tank}`);
    }

    if (params.family) {
        console.log(`[SceneIsolation] Using tank editor family ${params.family}`);
    }

    TankEditorScreen.configureSceneEntry({
        skinId: params.tank ?? null,
        familyId: params.family ?? null
    });
    Game.setState(GAME_STATES.TANK_EDITOR);
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

    // Update anchored terrain de-res pixel effects
    updateTerrainDerezEffects(deltaTime);

    // Update persistent trails (Tracer weapon feature - fades over time)
    updatePersistentTrails();

    // Update falling tanks
    updateFallingTanks();

    // Update background animation (star twinkle)
    updateBackground(deltaTime);

    // Update achievement popup animations
    AchievementPopup.update(deltaTime);

    // Update supply drop animation
    SupplyDrop.update(deltaTime);

    // Update name entry modal (cursor blink, etc.)
    NameEntry.update(deltaTime);

    // Clear single-fire input state at end of frame
    // This must be done after all game logic that checks wasKeyPressed()
    Input.clearFrameState();
}

/**
 * Render frame
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
function render(ctx) {
    // For menu states with TitleScene background, use transparent clear
    // so the 3D background shows through. For gameplay, use opaque clear.
    const currentState = Game.getState();
    const useTransparentClear = currentState === GAME_STATES.MENU ||
                                 currentState === GAME_STATES.DIFFICULTY_SELECT;

    if (useTransparentClear) {
        // Clear entire viewport (including letterbox areas) to transparent
        // so TitleScene (3D WebGL) shows through everywhere
        Renderer.clearTransparent();
    } else {
        // Normal opaque clear for gameplay states
        Renderer.clear();
    }

    // Render game elements will go here
    // Note: Achievement popups are rendered in postRender() which is called after state-specific renders

    // Render debug overlay last (on top of everything)
    // Skip on menu screens to avoid visual clutter
    const isMenuState = currentState === GAME_STATES.MENU ||
                        currentState === GAME_STATES.DIFFICULTY_SELECT ||
                        currentState === GAME_STATES.LEVEL_EDITOR ||
                        currentState === GAME_STATES.TANK_EDITOR ||
                        currentState === GAME_STATES.HIGH_SCORES ||
                        currentState === GAME_STATES.ACHIEVEMENTS ||
                        currentState === GAME_STATES.COLLECTION ||
                        currentState === GAME_STATES.SUPPLY_DROP;
    if (!isMenuState) {
        Debug.render(ctx);
    }
}

/**
 * Post-render function called after state-specific renders.
 * Used for overlay elements that should appear on top of all game content.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
function postRender(ctx) {
    // Render achievement popup notifications (on top of all game content)
    AchievementPopup.render(ctx);

    renderPhysicsPlaygroundOverlay(ctx);

    // Render supply drop animation (covers everything when active)
    if (SupplyDrop.isAnimating()) {
        SupplyDrop.render(ctx);
    }

    // Render name entry modal (on top of everything)
    if (NameEntry.isOpen()) {
        NameEntry.render(ctx);
    }
}

function installAutomationHooks() {
    if (typeof window === 'undefined') return;

    window.render_game_to_text = () => {
        const state = TestAPI.getState();
        const controls = TestAPI.getControlState();

        return JSON.stringify({
            coordinateSystem: 'Canvas design coordinates, origin top-left, x right, y down.',
            mode: Game.getState(),
            round: currentRound,
            turnPhase: state.turnPhase,
            canFire: state.canFire,
            isPlayerTurn: state.isPlayerTurn,
            wind: state.wind,
            player: state.player,
            enemy: state.enemy,
            puzzleObjects: currentPuzzleObjects
                .filter(object => object.active)
                .map(object => ({
                    id: object.id,
                    type: object.type,
                    x: Math.round(object.x),
                    y: Math.round(object.y),
                    strength: object.strength ?? null
                })),
            weaponBar: controls.weaponBar,
            aim: controls.aim
        });
    };

    window.force_survival_round_result_for_qa = (result = 'win') => {
        if (result === 'win' && enemyTank) {
            enemyTank.health = 0;
        } else if (result === 'loss' && playerTank) {
            playerTank.health = 0;
        } else if (result === 'draw') {
            if (playerTank) playerTank.health = 0;
            if (enemyTank) enemyTank.health = 0;
        }

        checkRoundEnd();
        return JSON.parse(window.render_game_to_text());
    };

    if (typeof window.advanceTime !== 'function') {
        window.advanceTime = (ms = 0) => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
