/**
 * Scorched Earth: Synthwave Edition
 * Debug Overlays - Visual debugging aids for development and testing
 *
 * Provides toggle-able visual overlays for debugging:
 * - Trajectory prediction lines (show where shot will land)
 * - Collision boxes (tanks, terrain boundaries)
 * - Coordinate grid overlay with position readout
 * - Physics vectors (velocity, wind direction)
 * - Touch target boundaries
 * - Scale factor indicators
 *
 * Toggle via keyboard shortcuts:
 * - Shift+T: Toggle trajectory overlay
 * - Shift+C: Toggle collision boxes
 * - Shift+G: Toggle grid overlay
 * - Shift+V: Toggle physics vectors
 * - Shift+A: Toggle all overlays
 */

import { COLORS, TANK, PHYSICS, UI } from './constants.js';
import { getScreenWidth, getScreenHeight, getGameScale } from './screenSize.js';
import * as Debug from './debug.js';
import * as Wind from './wind.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {boolean} Whether trajectory overlay is enabled */
let trajectoryEnabled = false;

/** @type {boolean} Whether collision box overlay is enabled */
let collisionEnabled = false;

/** @type {boolean} Whether grid overlay is enabled */
let gridEnabled = false;

/** @type {boolean} Whether physics vectors overlay is enabled */
let vectorsEnabled = false;

/** @type {boolean} Whether touch targets overlay is enabled */
let touchTargetsEnabled = false;

// Game references (set during init)
/** @type {Function|null} */
let getPlayerTank = null;
/** @type {Function|null} */
let getEnemyTank = null;
/** @type {Function|null} */
let getTerrain = null;
/** @type {Function|null} */
let getActiveProjectile = null;
/** @type {{angle: number, power: number}|null} */
let playerAimRef = null;

// Colors for overlays
const OVERLAY_COLORS = {
    TRAJECTORY: '#00ff00',        // Bright green
    TRAJECTORY_IMPACT: '#ff0000', // Red at impact point
    COLLISION_PLAYER: '#00ffff',  // Cyan for player
    COLLISION_ENEMY: '#ff00ff',   // Magenta for enemy
    GRID_MAJOR: 'rgba(255, 255, 255, 0.3)',
    GRID_MINOR: 'rgba(255, 255, 255, 0.1)',
    VECTOR_VELOCITY: '#ffff00',   // Yellow for velocity
    VECTOR_WIND: '#00ffff',       // Cyan for wind
    TOUCH_TARGET: 'rgba(0, 255, 0, 0.2)',
    TOUCH_BORDER: '#00ff00',
    TEXT: '#ffffff',
    TEXT_BG: 'rgba(0, 0, 0, 0.7)'
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize debug overlays with game references.
 * @param {Object} refs - Game references
 * @param {Function} refs.getPlayerTank - Function returning player tank
 * @param {Function} refs.getEnemyTank - Function returning enemy tank
 * @param {Function} refs.getTerrain - Function returning terrain
 * @param {Function} refs.getActiveProjectile - Function returning active projectile
 * @param {Object} refs.playerAim - Reference to player aim state
 */
export function init(refs) {
    getPlayerTank = refs.getPlayerTank || null;
    getEnemyTank = refs.getEnemyTank || null;
    getTerrain = refs.getTerrain || null;
    getActiveProjectile = refs.getActiveProjectile || null;
    playerAimRef = refs.playerAim || null;

    console.log('[DebugOverlays] Initialized');
}

// =============================================================================
// TOGGLE FUNCTIONS
// =============================================================================

/**
 * Toggle trajectory prediction overlay.
 * @returns {boolean} New state
 */
export function toggleTrajectory() {
    trajectoryEnabled = !trajectoryEnabled;
    console.log(`[DebugOverlays] Trajectory overlay ${trajectoryEnabled ? 'enabled' : 'disabled'}`);
    return trajectoryEnabled;
}

/**
 * Toggle collision box overlay.
 * @returns {boolean} New state
 */
export function toggleCollision() {
    collisionEnabled = !collisionEnabled;
    console.log(`[DebugOverlays] Collision overlay ${collisionEnabled ? 'enabled' : 'disabled'}`);
    return collisionEnabled;
}

/**
 * Toggle grid overlay.
 * @returns {boolean} New state
 */
export function toggleGrid() {
    gridEnabled = !gridEnabled;
    console.log(`[DebugOverlays] Grid overlay ${gridEnabled ? 'enabled' : 'disabled'}`);
    return gridEnabled;
}

/**
 * Toggle physics vectors overlay.
 * @returns {boolean} New state
 */
export function toggleVectors() {
    vectorsEnabled = !vectorsEnabled;
    console.log(`[DebugOverlays] Vectors overlay ${vectorsEnabled ? 'enabled' : 'disabled'}`);
    return vectorsEnabled;
}

/**
 * Toggle touch targets overlay.
 * @returns {boolean} New state
 */
export function toggleTouchTargets() {
    touchTargetsEnabled = !touchTargetsEnabled;
    console.log(`[DebugOverlays] Touch targets overlay ${touchTargetsEnabled ? 'enabled' : 'disabled'}`);
    return touchTargetsEnabled;
}

/**
 * Toggle all overlays on or off.
 * If any overlay is on, turns all off. Otherwise, turns all on.
 * @returns {boolean} New state (true = all on)
 */
export function toggleAll() {
    const anyEnabled = trajectoryEnabled || collisionEnabled || gridEnabled || vectorsEnabled || touchTargetsEnabled;
    const newState = !anyEnabled;

    trajectoryEnabled = newState;
    collisionEnabled = newState;
    gridEnabled = newState;
    vectorsEnabled = newState;
    touchTargetsEnabled = newState;

    console.log(`[DebugOverlays] All overlays ${newState ? 'enabled' : 'disabled'}`);
    return newState;
}

/**
 * Check if any overlay is enabled.
 * @returns {boolean} True if any overlay is enabled
 */
export function isAnyEnabled() {
    return trajectoryEnabled || collisionEnabled || gridEnabled || vectorsEnabled || touchTargetsEnabled;
}

/**
 * Get current overlay states.
 * @returns {Object} Current states of all overlays
 */
export function getStates() {
    return {
        trajectory: trajectoryEnabled,
        collision: collisionEnabled,
        grid: gridEnabled,
        vectors: vectorsEnabled,
        touchTargets: touchTargetsEnabled
    };
}

// =============================================================================
// TRAJECTORY PREDICTION
// =============================================================================

/**
 * Simulate and render trajectory prediction line.
 * Shows where the current shot would land based on angle/power.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderTrajectory(ctx) {
    if (!trajectoryEnabled) return;

    const tank = getPlayerTank?.();
    const terrain = getTerrain?.();
    if (!tank || !terrain) return;

    // Get current aim settings
    const angle = playerAimRef?.angle ?? tank.angle;
    const power = playerAimRef?.power ?? tank.power;

    // Calculate starting position (tip of turret)
    const radians = (angle * Math.PI) / 180;
    const bodyHeight = TANK.BODY_HEIGHT || TANK.HEIGHT;
    const startX = tank.x + Math.cos(radians) * TANK.TURRET_LENGTH;
    const startY = tank.y - bodyHeight - Math.sin(radians) * TANK.TURRET_LENGTH;

    // Calculate initial velocity
    const velocityMagnitude = (power / 100) * PHYSICS.MAX_VELOCITY;
    let vx = Math.cos(radians) * velocityMagnitude;
    let vy = -Math.sin(radians) * velocityMagnitude;

    // Wind force
    const windForce = Wind.getWind() * PHYSICS.WIND_FORCE_MULTIPLIER;

    // Simulate trajectory
    const points = [];
    let x = startX;
    let y = startY;
    const screenWidth = getScreenWidth();
    const screenHeight = getScreenHeight();
    const maxSteps = 500;

    for (let step = 0; step < maxSteps; step++) {
        points.push({ x, y });

        // Apply physics
        vy += PHYSICS.GRAVITY;
        vx += windForce;

        // Cap velocity
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > PHYSICS.MAX_VELOCITY) {
            const scale = PHYSICS.MAX_VELOCITY / speed;
            vx *= scale;
            vy *= scale;
        }

        // Move
        x += vx;
        y += vy;

        // Check bounds
        if (x < 0 || x > screenWidth || y > screenHeight) break;

        // Check terrain collision
        const terrainHeight = terrain.getHeight(Math.floor(x));
        const terrainY = screenHeight - terrainHeight;
        if (y >= terrainY) {
            points.push({ x, y: terrainY });
            break;
        }
    }

    // Render trajectory
    ctx.save();

    // Draw trajectory line with gradient from green to red
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    for (let i = 0; i < points.length - 1; i++) {
        const t = i / points.length;
        // Fade from green to yellow to red
        const r = Math.floor(255 * t);
        const g = Math.floor(255 * (1 - t * 0.5));
        ctx.strokeStyle = `rgb(${r}, ${g}, 0)`;

        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[i + 1].x, points[i + 1].y);
        ctx.stroke();
    }

    // Draw impact point
    if (points.length > 0) {
        const impact = points[points.length - 1];
        ctx.setLineDash([]);

        // Impact circle
        ctx.beginPath();
        ctx.arc(impact.x, impact.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = OVERLAY_COLORS.TRAJECTORY_IMPACT;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = OVERLAY_COLORS.TRAJECTORY_IMPACT;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Impact coordinates
        ctx.fillStyle = OVERLAY_COLORS.TEXT;
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`(${Math.round(impact.x)}, ${Math.round(impact.y)})`, impact.x + 12, impact.y);
    }

    ctx.restore();
}

// =============================================================================
// COLLISION BOXES
// =============================================================================

/**
 * Render collision boxes for tanks.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderCollisionBoxes(ctx) {
    if (!collisionEnabled) return;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);

    // Player tank collision box
    const player = getPlayerTank?.();
    if (player && !player.isDestroyed?.()) {
        renderTankCollisionBox(ctx, player, OVERLAY_COLORS.COLLISION_PLAYER);
    }

    // Enemy tank collision box
    const enemy = getEnemyTank?.();
    if (enemy && !enemy.isDestroyed?.()) {
        renderTankCollisionBox(ctx, enemy, OVERLAY_COLORS.COLLISION_ENEMY);
    }

    ctx.restore();
}

/**
 * Render collision box for a single tank.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} tank - Tank object
 * @param {string} color - Box color
 */
function renderTankCollisionBox(ctx, tank, color) {
    const halfWidth = TANK.WIDTH / 2;
    const halfHeight = TANK.HEIGHT / 2;

    // Tank bounding box (centered at tank.x, tank.y - halfHeight)
    const boxX = tank.x - halfWidth;
    const boxY = tank.y - TANK.HEIGHT;

    ctx.strokeStyle = color;
    ctx.strokeRect(boxX, boxY, TANK.WIDTH, TANK.HEIGHT);

    // Draw center cross
    ctx.beginPath();
    ctx.moveTo(tank.x - 5, tank.y - halfHeight);
    ctx.lineTo(tank.x + 5, tank.y - halfHeight);
    ctx.moveTo(tank.x, tank.y - halfHeight - 5);
    ctx.lineTo(tank.x, tank.y - halfHeight + 5);
    ctx.stroke();

    // Label
    ctx.fillStyle = color;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`(${Math.round(tank.x)}, ${Math.round(tank.y)})`, tank.x, tank.y + 14);
    ctx.fillText(`HP: ${tank.health}`, tank.x, tank.y + 26);
}

// =============================================================================
// COORDINATE GRID
// =============================================================================

/**
 * Render coordinate grid overlay.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderGrid(ctx) {
    if (!gridEnabled) return;

    const width = getScreenWidth();
    const height = getScreenHeight();

    ctx.save();

    // Grid settings
    const majorSpacing = 100;
    const minorSpacing = 20;

    // Draw minor grid lines
    ctx.strokeStyle = OVERLAY_COLORS.GRID_MINOR;
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    for (let x = 0; x <= width; x += minorSpacing) {
        if (x % majorSpacing !== 0) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
    }
    for (let y = 0; y <= height; y += minorSpacing) {
        if (y % majorSpacing !== 0) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
    }
    ctx.stroke();

    // Draw major grid lines
    ctx.strokeStyle = OVERLAY_COLORS.GRID_MAJOR;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x <= width; x += majorSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += majorSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = OVERLAY_COLORS.TEXT;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // X-axis labels
    for (let x = majorSpacing; x <= width; x += majorSpacing) {
        ctx.fillText(String(x), x, 2);
    }

    // Y-axis labels
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = majorSpacing; y <= height; y += majorSpacing) {
        ctx.fillText(String(y), 2, y);
    }

    // Draw screen dimensions
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${width} x ${height}`, width - 4, height - 4);

    // Draw scale factor
    const scale = getGameScale();
    ctx.textAlign = 'left';
    ctx.fillText(`Scale: ${scale.toFixed(2)}`, 4, height - 4);

    ctx.restore();
}

// =============================================================================
// PHYSICS VECTORS
// =============================================================================

/**
 * Render physics vectors (velocity, wind).
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderVectors(ctx) {
    if (!vectorsEnabled) return;

    const width = getScreenWidth();

    ctx.save();

    // Wind vector at top of screen
    const windValue = Wind.getWind();
    const windForce = Wind.getWindForce();

    // Draw wind vector indicator
    const windX = width / 2;
    const windY = 60;
    const windArrowLength = Math.abs(windValue) * 5; // Scale for visibility

    ctx.strokeStyle = OVERLAY_COLORS.VECTOR_WIND;
    ctx.fillStyle = OVERLAY_COLORS.VECTOR_WIND;
    ctx.lineWidth = 3;

    if (Math.abs(windValue) > 0.1) {
        // Draw wind arrow
        const direction = windValue > 0 ? 1 : -1;
        const arrowEndX = windX + direction * windArrowLength;

        ctx.beginPath();
        ctx.moveTo(windX, windY);
        ctx.lineTo(arrowEndX, windY);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(arrowEndX, windY);
        ctx.lineTo(arrowEndX - direction * 8, windY - 5);
        ctx.lineTo(arrowEndX - direction * 8, windY + 5);
        ctx.closePath();
        ctx.fill();
    } else {
        // Draw calm circle
        ctx.beginPath();
        ctx.arc(windX, windY, 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Wind label
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Wind: ${windValue.toFixed(1)} (force: ${windForce.toFixed(3)})`, windX, windY + 20);

    // Projectile velocity vector (if projectile is active)
    const projectile = getActiveProjectile?.();
    if (projectile && projectile.isActive?.()) {
        const pos = projectile.getPosition();
        const vel = projectile.getVelocity?.();

        if (vel) {
            ctx.strokeStyle = OVERLAY_COLORS.VECTOR_VELOCITY;
            ctx.fillStyle = OVERLAY_COLORS.VECTOR_VELOCITY;
            ctx.lineWidth = 2;

            // Scale velocity for visibility
            const velScale = 5;
            const velEndX = pos.x + vel.x * velScale;
            const velEndY = pos.y + vel.y * velScale;

            // Draw velocity arrow
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(velEndX, velEndY);
            ctx.stroke();

            // Arrow head
            const angle = Math.atan2(vel.y, vel.x);
            ctx.beginPath();
            ctx.moveTo(velEndX, velEndY);
            ctx.lineTo(velEndX - 8 * Math.cos(angle - 0.3), velEndY - 8 * Math.sin(angle - 0.3));
            ctx.lineTo(velEndX - 8 * Math.cos(angle + 0.3), velEndY - 8 * Math.sin(angle + 0.3));
            ctx.closePath();
            ctx.fill();

            // Velocity label
            const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`v: (${vel.x.toFixed(1)}, ${vel.y.toFixed(1)}) |${speed.toFixed(1)}|`, pos.x + 15, pos.y - 10);
        }
    }

    // Tank aim vectors
    const player = getPlayerTank?.();
    if (player && !player.isDestroyed?.()) {
        renderAimVector(ctx, player, OVERLAY_COLORS.COLLISION_PLAYER);
    }

    ctx.restore();
}

/**
 * Render aim vector for a tank.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} tank - Tank object
 * @param {string} color - Vector color
 */
function renderAimVector(ctx, tank, color) {
    const angle = playerAimRef?.angle ?? tank.angle;
    const power = playerAimRef?.power ?? tank.power;

    const radians = (angle * Math.PI) / 180;
    const bodyHeight = TANK.BODY_HEIGHT || TANK.HEIGHT;
    const turretBaseX = tank.x;
    const turretBaseY = tank.y - bodyHeight;

    // Draw extended aim line (not just turret)
    const aimLength = 40 + power * 0.5; // Length based on power
    const aimEndX = turretBaseX + Math.cos(radians) * aimLength;
    const aimEndY = turretBaseY - Math.sin(radians) * aimLength;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(turretBaseX, turretBaseY);
    ctx.lineTo(aimEndX, aimEndY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Aim info label
    ctx.fillStyle = color;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`∠${angle.toFixed(0)}° P${power.toFixed(0)}%`, aimEndX + 5, aimEndY - 5);
}

// =============================================================================
// TOUCH TARGETS (placeholder for UI elements)
// =============================================================================

/**
 * Render touch target boundaries.
 * Shows minimum touch target sizes for UI elements.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderTouchTargets(ctx) {
    if (!touchTargetsEnabled) return;

    // This would show touch target areas for UI buttons
    // For now, just show the minimum touch target size indicator

    ctx.save();

    const x = 10;
    const y = getScreenHeight() - 70;

    // Draw sample minimum touch target
    ctx.strokeStyle = OVERLAY_COLORS.TOUCH_BORDER;
    ctx.fillStyle = OVERLAY_COLORS.TOUCH_TARGET;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    ctx.fillRect(x, y, UI.TOUCH_MIN_SIZE, UI.TOUCH_MIN_SIZE);
    ctx.strokeRect(x, y, UI.TOUCH_MIN_SIZE, UI.TOUCH_MIN_SIZE);

    // Label
    ctx.setLineDash([]);
    ctx.fillStyle = OVERLAY_COLORS.TEXT;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Min touch: ${UI.TOUCH_MIN_SIZE}px`, x + UI.TOUCH_MIN_SIZE + 8, y + UI.TOUCH_MIN_SIZE / 2 + 3);

    ctx.restore();
}

// =============================================================================
// INFO PANEL
// =============================================================================

/**
 * Render overlay status panel showing which overlays are active.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function renderInfoPanel(ctx) {
    if (!isAnyEnabled()) return;

    const width = getScreenWidth();

    ctx.save();

    // Panel position and size
    const panelX = width - 160;
    const panelY = 50;
    const panelWidth = 150;
    const panelHeight = 120;

    // Draw panel background
    ctx.fillStyle = OVERLAY_COLORS.TEXT_BG;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = COLORS.NEON_PINK;
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw title
    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DEBUG OVERLAYS', panelX + 8, panelY + 16);

    // Draw status for each overlay
    const overlays = [
        { name: 'Trajectory (T)', enabled: trajectoryEnabled },
        { name: 'Collision (C)', enabled: collisionEnabled },
        { name: 'Grid (G)', enabled: gridEnabled },
        { name: 'Vectors (V)', enabled: vectorsEnabled },
        { name: 'Touch (X)', enabled: touchTargetsEnabled }
    ];

    ctx.font = '11px monospace';
    overlays.forEach((overlay, i) => {
        const y = panelY + 34 + i * 16;
        ctx.fillStyle = overlay.enabled ? '#00ff00' : '#666666';
        ctx.fillText(overlay.enabled ? '●' : '○', panelX + 8, y);
        ctx.fillStyle = overlay.enabled ? '#ffffff' : '#888888';
        ctx.fillText(overlay.name, panelX + 22, y);
    });

    ctx.restore();
}

// =============================================================================
// MAIN RENDER
// =============================================================================

/**
 * Render all enabled debug overlays.
 * Call this after the main game render.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    // Only render if debug mode is enabled
    if (!Debug.isEnabled()) return;

    // Render each overlay
    renderGrid(ctx);
    renderTrajectory(ctx);
    renderCollisionBoxes(ctx);
    renderVectors(ctx);
    renderTouchTargets(ctx);
    renderInfoPanel(ctx);
}

// =============================================================================
// KEYBOARD HANDLING
// =============================================================================

/**
 * Handle keyboard shortcuts for debug overlays.
 * Shortcuts require debug mode + Shift key.
 *
 * Shortcuts:
 * - Shift+T: Toggle trajectory
 * - Shift+C: Toggle collision boxes
 * - Shift+G: Toggle grid
 * - Shift+V: Toggle vectors
 * - Shift+X: Toggle touch targets
 * - Shift+A: Toggle all
 *
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if a shortcut was handled
 */
export function handleKeyDown(event) {
    if (!Debug.isEnabled()) return false;
    if (!event.shiftKey) return false;

    switch (event.code) {
        case 'KeyT':
            toggleTrajectory();
            return true;
        case 'KeyC':
            toggleCollision();
            return true;
        case 'KeyG':
            toggleGrid();
            return true;
        case 'KeyV':
            toggleVectors();
            return true;
        case 'KeyX':
            toggleTouchTargets();
            return true;
        case 'KeyA':
            toggleAll();
            return true;
        default:
            return false;
    }
}

// =============================================================================
// CONSOLE COMMANDS
// =============================================================================

/**
 * Show help for debug overlay commands.
 */
export function help() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                DEBUG OVERLAYS - HELP                           ║
╠════════════════════════════════════════════════════════════════╣
║ Keyboard Shortcuts (require Debug mode + Shift):               ║
║                                                                ║
║   Shift+T  Toggle trajectory prediction                       ║
║   Shift+C  Toggle collision boxes                              ║
║   Shift+G  Toggle coordinate grid                              ║
║   Shift+V  Toggle physics vectors                              ║
║   Shift+X  Toggle touch targets                                ║
║   Shift+A  Toggle all overlays                                 ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ Console Commands (use DebugOverlays.* in browser console):     ║
║                                                                ║
║   DebugOverlays.toggleTrajectory()   - Trajectory prediction   ║
║   DebugOverlays.toggleCollision()    - Collision boxes         ║
║   DebugOverlays.toggleGrid()         - Coordinate grid         ║
║   DebugOverlays.toggleVectors()      - Physics vectors         ║
║   DebugOverlays.toggleTouchTargets() - Touch target sizes      ║
║   DebugOverlays.toggleAll()          - All overlays on/off     ║
║   DebugOverlays.getStates()          - Show current states     ║
║                                                                ║
║ Note: Press 'D' to enable debug mode first!                    ║
╚════════════════════════════════════════════════════════════════╝
`);
}

// =============================================================================
// WINDOW EXPOSURE (for console access)
// =============================================================================

// Create DebugOverlays object for console access
const DebugOverlays = {
    init,
    render,
    handleKeyDown,
    toggleTrajectory,
    toggleCollision,
    toggleGrid,
    toggleVectors,
    toggleTouchTargets,
    toggleAll,
    isAnyEnabled,
    getStates,
    help
};

// Expose on window for console access
if (typeof window !== 'undefined') {
    window.DebugOverlays = DebugOverlays;
}

export default DebugOverlays;
