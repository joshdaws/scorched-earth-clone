/**
 * Scorched Earth: Synthwave Edition
 * Supply Drop Animation System
 *
 * Creates dramatic 80s action movie-style supply drop animation for tank unlocks.
 * Full-screen overlay animation with plane approach, crate drop, and reveal.
 */

import { CANVAS, COLORS, DEBUG } from './constants.js';
import { RARITY, RARITY_COLORS, RARITY_NAMES } from './tank-skins.js';

// =============================================================================
// ANIMATION CONSTANTS
// =============================================================================

/**
 * Animation phase timing in milliseconds.
 */
const PHASE_TIMING = {
    APPROACH: 1500,      // Plane flies across screen
    DROP: 1000,          // Crate falls with parachute
    LANDING: 500,        // Crate lands, dust effect
    REVEAL: 2000,        // Crate opens, tank revealed
    HOLD: 1500           // Hold on revealed tank before callback
};

/**
 * Total animation duration.
 */
const TOTAL_DURATION = Object.values(PHASE_TIMING).reduce((a, b) => a + b, 0);

/**
 * Animation phases enum.
 */
const PHASES = {
    IDLE: 'idle',
    APPROACH: 'approach',
    DROP: 'drop',
    LANDING: 'landing',
    REVEAL: 'reveal',
    HOLD: 'hold',
    COMPLETE: 'complete'
};

/**
 * Parachute colors by rarity.
 */
const PARACHUTE_COLORS = {
    [RARITY.COMMON]: '#FFFFFF',     // White
    [RARITY.UNCOMMON]: '#00FFFF',   // Cyan
    [RARITY.RARE]: '#8B5CF6',       // Purple
    [RARITY.EPIC]: '#FFD700',       // Gold
    [RARITY.LEGENDARY]: null        // Rainbow (special case)
};

/**
 * Visual constants.
 */
const VISUALS = {
    // Plane
    PLANE_WIDTH: 120,
    PLANE_HEIGHT: 40,
    PLANE_Y: 80,
    CONTRAIL_LENGTH: 200,
    CONTRAIL_SEGMENTS: 20,

    // Crate
    CRATE_SIZE: 60,
    CRATE_DROP_START_Y: 100,
    CRATE_LAND_Y: 550,
    CRATE_SWAY_AMPLITUDE: 30,
    CRATE_SWAY_FREQUENCY: 2,

    // Parachute
    PARACHUTE_WIDTH: 80,
    PARACHUTE_HEIGHT: 50,
    PARACHUTE_OFFSET_Y: -60,

    // Platform
    PLATFORM_WIDTH: 200,
    PLATFORM_HEIGHT: 20,
    PLATFORM_Y: 570,

    // Spotlight
    SPOTLIGHT_WIDTH: 100,
    SPOTLIGHT_OPACITY: 0.3,

    // Particles
    DUST_PARTICLE_COUNT: 20,
    SPARK_PARTICLE_COUNT: 15,

    // Tank reveal
    TANK_DISPLAY_SIZE: 128,
    BANNER_WIDTH: 300,
    BANNER_HEIGHT: 50
};

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {boolean} Whether animation is currently playing */
let isPlaying = false;

/** @type {string} Current animation phase */
let currentPhase = PHASES.IDLE;

/** @type {number} Animation start timestamp */
let animationStartTime = 0;

/** @type {number} Current phase start timestamp */
let phaseStartTime = 0;

/** @type {Object|null} Tank being revealed */
let revealTank = null;

/** @type {Function|null} Callback when animation completes */
let onCompleteCallback = null;

/** @type {Array} Active particles */
let particles = [];

/** @type {number} Plane X position */
let planeX = 0;

/** @type {number} Crate position */
let crateX = 0;
let crateY = 0;

/** @type {boolean} Whether parachute is deployed */
let parachuteDeployed = false;

/** @type {number} Rainbow hue for legendary parachute */
let rainbowHue = 0;

/** @type {number} Tank rise progress (0-1) */
let tankRiseProgress = 0;

/** @type {boolean} Module initialized */
let isInitialized = false;

// =============================================================================
// DEBUG LOGGING
// =============================================================================

/**
 * Log debug message if debug mode is enabled.
 * @param {string} message - Message to log
 * @param {Object} [data] - Optional data to log
 */
function debugLog(message, data = null) {
    if (DEBUG.ENABLED) {
        if (data) {
            console.log(`[SupplyDrop] ${message}`, data);
        } else {
            console.log(`[SupplyDrop] ${message}`);
        }
    }
}

// =============================================================================
// PARTICLE SYSTEM
// =============================================================================

/**
 * Create a particle.
 * @param {Object} config - Particle configuration
 * @returns {Object} Particle object
 */
function createParticle({ x, y, vx, vy, color, size, life, gravity = 0, friction = 1 }) {
    return {
        x, y,
        vx, vy,
        color,
        size,
        life,
        maxLife: life,
        gravity,
        friction
    };
}

/**
 * Update all particles.
 * @param {number} deltaTime - Time since last update in ms
 */
function updateParticles(deltaTime) {
    const dt = deltaTime / 1000; // Convert to seconds

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Update position
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Apply gravity
        p.vy += p.gravity * dt;

        // Apply friction
        p.vx *= p.friction;
        p.vy *= p.friction;

        // Decrease life
        p.life -= deltaTime;

        // Remove dead particles
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

/**
 * Render all particles.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderParticles(ctx) {
    for (const p of particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Spawn dust particles at landing.
 * @param {number} x - Center X position
 * @param {number} y - Ground Y position
 */
function spawnDustParticles(x, y) {
    for (let i = 0; i < VISUALS.DUST_PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI; // Upward arc
        const speed = 50 + Math.random() * 100;
        particles.push(createParticle({
            x: x + (Math.random() - 0.5) * 40,
            y: y,
            vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
            vy: -Math.sin(angle) * speed,
            color: '#8B7355',
            size: 3 + Math.random() * 4,
            life: 500 + Math.random() * 500,
            gravity: 200,
            friction: 0.98
        }));
    }
}

/**
 * Spawn spark particles for crate explosion.
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {string} color - Rarity color
 */
function spawnSparkParticles(x, y, color) {
    for (let i = 0; i < VISUALS.SPARK_PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 200;
        particles.push(createParticle({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            size: 2 + Math.random() * 3,
            life: 400 + Math.random() * 400,
            gravity: 100,
            friction: 0.95
        }));
    }
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Draw the dark overlay.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} opacity - Overlay opacity (0-1)
 */
function drawOverlay(ctx, opacity) {
    ctx.save();
    ctx.fillStyle = `rgba(10, 10, 26, ${opacity})`;
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
    ctx.restore();
}

/**
 * Draw the synthwave grid platform.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawPlatform(ctx) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const platformX = centerX - VISUALS.PLATFORM_WIDTH / 2;

    ctx.save();

    // Platform glow
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 20;

    // Platform surface
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(platformX, VISUALS.PLATFORM_Y, VISUALS.PLATFORM_WIDTH, VISUALS.PLATFORM_HEIGHT);

    // Grid lines on platform
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;

    // Horizontal lines
    for (let y = VISUALS.PLATFORM_Y; y <= VISUALS.PLATFORM_Y + VISUALS.PLATFORM_HEIGHT; y += 5) {
        ctx.beginPath();
        ctx.moveTo(platformX, y);
        ctx.lineTo(platformX + VISUALS.PLATFORM_WIDTH, y);
        ctx.stroke();
    }

    // Vertical lines
    for (let x = platformX; x <= platformX + VISUALS.PLATFORM_WIDTH; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, VISUALS.PLATFORM_Y);
        ctx.lineTo(x, VISUALS.PLATFORM_Y + VISUALS.PLATFORM_HEIGHT);
        ctx.stroke();
    }

    // Platform border
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeRect(platformX, VISUALS.PLATFORM_Y, VISUALS.PLATFORM_WIDTH, VISUALS.PLATFORM_HEIGHT);

    ctx.restore();
}

/**
 * Draw the cargo plane.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Plane X position
 */
function drawPlane(ctx, x) {
    const y = VISUALS.PLANE_Y;

    ctx.save();

    // Plane glow
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 15;

    // Simple plane silhouette (stylized C-130)
    ctx.fillStyle = '#1a1a3a';
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;

    // Fuselage
    ctx.beginPath();
    ctx.ellipse(x, y, VISUALS.PLANE_WIDTH / 2, VISUALS.PLANE_HEIGHT / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wings
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x - 60, y - 15);
    ctx.lineTo(x - 60, y + 5);
    ctx.lineTo(x - 30, y);
    ctx.moveTo(x + 30, y);
    ctx.lineTo(x + 60, y - 15);
    ctx.lineTo(x + 60, y + 5);
    ctx.lineTo(x + 30, y);
    ctx.fill();
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(x - VISUALS.PLANE_WIDTH / 2 + 10, y);
    ctx.lineTo(x - VISUALS.PLANE_WIDTH / 2, y - 20);
    ctx.lineTo(x - VISUALS.PLANE_WIDTH / 2 + 20, y);
    ctx.fill();
    ctx.stroke();

    // Cockpit glow
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(x + VISUALS.PLANE_WIDTH / 2 - 20, y - 5, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Draw the contrail behind the plane.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} planeX - Plane X position
 */
function drawContrail(ctx, planeX) {
    const y = VISUALS.PLANE_Y;
    const startX = planeX - VISUALS.PLANE_WIDTH / 2 - 10;

    ctx.save();

    for (let i = 0; i < VISUALS.CONTRAIL_SEGMENTS; i++) {
        const progress = i / VISUALS.CONTRAIL_SEGMENTS;
        const x = startX - progress * VISUALS.CONTRAIL_LENGTH;
        const alpha = 1 - progress;
        const size = 3 + progress * 8;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y + Math.sin(x * 0.05) * 3, size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Draw the supply crate.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Crate X position
 * @param {number} y - Crate Y position
 * @param {boolean} opened - Whether crate is opened
 */
function drawCrate(ctx, x, y, opened = false) {
    const size = VISUALS.CRATE_SIZE;
    const halfSize = size / 2;

    ctx.save();

    if (opened) {
        // Opened crate - just the base
        ctx.fillStyle = '#2a1a0a';
        ctx.strokeStyle = COLORS.NEON_ORANGE;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.NEON_ORANGE;
        ctx.shadowBlur = 10;

        ctx.fillRect(x - halfSize, y - halfSize / 2, size, halfSize);
        ctx.strokeRect(x - halfSize, y - halfSize / 2, size, halfSize);
    } else {
        // Closed crate
        ctx.fillStyle = '#3a2a1a';
        ctx.strokeStyle = COLORS.NEON_ORANGE;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.NEON_ORANGE;
        ctx.shadowBlur = 10;

        // Crate body
        ctx.fillRect(x - halfSize, y - halfSize, size, size);
        ctx.strokeRect(x - halfSize, y - halfSize, size, size);

        // Cross straps
        ctx.beginPath();
        ctx.moveTo(x - halfSize, y - halfSize);
        ctx.lineTo(x + halfSize, y + halfSize);
        ctx.moveTo(x + halfSize, y - halfSize);
        ctx.lineTo(x - halfSize, y + halfSize);
        ctx.stroke();

        // Question mark
        ctx.fillStyle = COLORS.NEON_ORANGE;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x, y);
    }

    ctx.restore();
}

/**
 * Draw the parachute.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Parachute X position
 * @param {number} y - Parachute Y position
 * @param {string} rarity - Tank rarity for color
 * @param {number} sway - Sway offset
 */
function drawParachute(ctx, x, y, rarity, sway = 0) {
    const width = VISUALS.PARACHUTE_WIDTH;
    const height = VISUALS.PARACHUTE_HEIGHT;

    ctx.save();

    // Get parachute color
    let color = PARACHUTE_COLORS[rarity] || '#FFFFFF';

    // Rainbow for legendary
    if (rarity === RARITY.LEGENDARY) {
        color = `hsl(${rainbowHue}, 100%, 60%)`;
    }

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    // Parachute canopy (dome shape)
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.quadraticCurveTo(x - width / 2, y - height, x, y - height);
    ctx.quadraticCurveTo(x + width / 2, y - height, x + width / 2, y);
    ctx.closePath();
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();

    // Suspension lines
    const crateY = y + Math.abs(VISUALS.PARACHUTE_OFFSET_Y);
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.lineTo(x + sway, crateY);
    ctx.moveTo(x, y - height);
    ctx.lineTo(x + sway, crateY);
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + sway, crateY);
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw the spotlight beam.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Spotlight center X
 * @param {number} targetY - Target Y position
 */
function drawSpotlight(ctx, x, targetY) {
    ctx.save();

    const gradient = ctx.createLinearGradient(x, 0, x, targetY);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${VISUALS.SPOTLIGHT_OPACITY})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x - 20, 0);
    ctx.lineTo(x - VISUALS.SPOTLIGHT_WIDTH / 2, targetY);
    ctx.lineTo(x + VISUALS.SPOTLIGHT_WIDTH / 2, targetY);
    ctx.lineTo(x + 20, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

/**
 * Draw the revealed tank.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} tank - Tank to display
 * @param {number} riseProgress - Rise animation progress (0-1)
 */
function drawRevealedTank(ctx, tank, riseProgress) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const baseY = VISUALS.PLATFORM_Y;
    const tankY = baseY - (riseProgress * 80);
    const size = VISUALS.TANK_DISPLAY_SIZE;

    ctx.save();

    // Tank glow
    const glowColor = tank.glowColor || RARITY_COLORS[tank.rarity];
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30 * riseProgress;

    // Tank placeholder (rectangle with glow)
    ctx.fillStyle = '#1a1a2a';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;

    const tankWidth = size;
    const tankHeight = size / 2;
    ctx.fillRect(centerX - tankWidth / 2, tankY - tankHeight, tankWidth, tankHeight);
    ctx.strokeRect(centerX - tankWidth / 2, tankY - tankHeight, tankWidth, tankHeight);

    // Tank turret
    ctx.beginPath();
    ctx.arc(centerX, tankY - tankHeight, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Turret barrel
    ctx.beginPath();
    ctx.moveTo(centerX, tankY - tankHeight);
    ctx.lineTo(centerX + 40, tankY - tankHeight - 20);
    ctx.lineWidth = 6;
    ctx.stroke();

    // Light beams from tank (during reveal)
    if (riseProgress > 0.3) {
        const beamAlpha = (riseProgress - 0.3) * 0.5;
        ctx.globalAlpha = beamAlpha;

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const beamLength = 100 + Math.sin(Date.now() * 0.005 + i) * 20;

            ctx.beginPath();
            ctx.moveTo(centerX, tankY - tankHeight / 2);
            ctx.lineTo(
                centerX + Math.cos(angle) * beamLength,
                tankY - tankHeight / 2 + Math.sin(angle) * beamLength
            );
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * Draw the rarity banner.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} tank - Tank to display
 * @param {number} alpha - Banner opacity
 */
function drawRarityBanner(ctx, tank, alpha) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const bannerY = 200;
    const rarityColor = RARITY_COLORS[tank.rarity] || '#FFFFFF';
    const rarityName = RARITY_NAMES[tank.rarity] || 'Unknown';

    ctx.save();
    ctx.globalAlpha = alpha;

    // Banner background
    ctx.fillStyle = '#0a0a1a';
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = rarityColor;
    ctx.shadowBlur = 20;

    const bannerX = centerX - VISUALS.BANNER_WIDTH / 2;
    ctx.fillRect(bannerX, bannerY, VISUALS.BANNER_WIDTH, VISUALS.BANNER_HEIGHT);
    ctx.strokeRect(bannerX, bannerY, VISUALS.BANNER_WIDTH, VISUALS.BANNER_HEIGHT);

    // Rarity text
    ctx.fillStyle = rarityColor;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rarityName.toUpperCase(), centerX, bannerY + VISUALS.BANNER_HEIGHT / 2);

    // Tank name below banner
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(tank.name, centerX, bannerY + VISUALS.BANNER_HEIGHT + 40);

    // Tank description
    ctx.fillStyle = '#888899';
    ctx.font = '16px Arial';
    ctx.fillText(tank.description, centerX, bannerY + VISUALS.BANNER_HEIGHT + 75);

    ctx.restore();
}

// =============================================================================
// ANIMATION PHASES
// =============================================================================

/**
 * Update approach phase.
 * @param {number} phaseProgress - Progress through phase (0-1)
 */
function updateApproach(phaseProgress) {
    // Plane flies from right to center
    planeX = CANVAS.DESIGN_WIDTH + VISUALS.PLANE_WIDTH - phaseProgress * (CANVAS.DESIGN_WIDTH / 2 + VISUALS.PLANE_WIDTH);
}

/**
 * Update drop phase.
 * @param {number} phaseProgress - Progress through phase (0-1)
 */
function updateDrop(phaseProgress) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;

    // Continue plane movement
    planeX = CANVAS.DESIGN_WIDTH / 2 - phaseProgress * (CANVAS.DESIGN_WIDTH / 2 + VISUALS.PLANE_WIDTH);

    // Deploy parachute immediately
    parachuteDeployed = true;

    // Crate descends with sway
    crateX = centerX + Math.sin(phaseProgress * Math.PI * VISUALS.CRATE_SWAY_FREQUENCY) * VISUALS.CRATE_SWAY_AMPLITUDE;
    crateY = VISUALS.CRATE_DROP_START_Y + phaseProgress * (VISUALS.CRATE_LAND_Y - VISUALS.CRATE_DROP_START_Y);
}

/**
 * Update landing phase.
 * @param {number} phaseProgress - Progress through phase (0-1)
 */
function updateLanding(phaseProgress) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;

    // Crate settles at center
    crateX = centerX;
    crateY = VISUALS.CRATE_LAND_Y;

    // Spawn dust at start of landing
    if (phaseProgress < 0.1 && particles.length === 0) {
        spawnDustParticles(centerX, VISUALS.PLATFORM_Y);
    }

    // Parachute detaches and floats away
    if (phaseProgress > 0.3) {
        parachuteDeployed = false;
    }
}

/**
 * Update reveal phase.
 * @param {number} phaseProgress - Progress through phase (0-1)
 */
function updateReveal(phaseProgress) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;

    // Spawn sparks at start
    if (phaseProgress < 0.05 && particles.length < VISUALS.SPARK_PARTICLE_COUNT) {
        const rarityColor = RARITY_COLORS[revealTank.rarity] || '#FFFFFF';
        spawnSparkParticles(centerX, crateY, rarityColor);
    }

    // Tank rises
    tankRiseProgress = Math.min(1, phaseProgress * 2);
}

// =============================================================================
// MAIN ANIMATION LOOP
// =============================================================================

/**
 * Update the supply drop animation.
 * @param {number} deltaTime - Time since last update in ms
 */
export function update(deltaTime) {
    if (!isPlaying) return;

    const now = performance.now();
    const elapsed = now - animationStartTime;

    // Update rainbow hue for legendary
    rainbowHue = (rainbowHue + deltaTime * 0.2) % 360;

    // Update particles
    updateParticles(deltaTime);

    // Determine current phase based on elapsed time
    let accumulatedTime = 0;

    if (elapsed < (accumulatedTime += PHASE_TIMING.APPROACH)) {
        if (currentPhase !== PHASES.APPROACH) {
            currentPhase = PHASES.APPROACH;
            phaseStartTime = now;
            debugLog('Phase: APPROACH');
        }
        // Calculate phase progress AFTER potentially setting phaseStartTime
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.APPROACH);
        updateApproach(progress);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.DROP)) {
        if (currentPhase !== PHASES.DROP) {
            currentPhase = PHASES.DROP;
            phaseStartTime = now;
            debugLog('Phase: DROP');
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.DROP);
        updateDrop(progress);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.LANDING)) {
        if (currentPhase !== PHASES.LANDING) {
            currentPhase = PHASES.LANDING;
            phaseStartTime = now;
            debugLog('Phase: LANDING');
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.LANDING);
        updateLanding(progress);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.REVEAL)) {
        if (currentPhase !== PHASES.REVEAL) {
            currentPhase = PHASES.REVEAL;
            phaseStartTime = now;
            debugLog('Phase: REVEAL');
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.REVEAL);
        updateReveal(progress);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.HOLD)) {
        if (currentPhase !== PHASES.HOLD) {
            currentPhase = PHASES.HOLD;
            phaseStartTime = now;
            debugLog('Phase: HOLD');
        }
        // Hold on revealed tank - no update needed
    } else {
        if (currentPhase !== PHASES.COMPLETE) {
            currentPhase = PHASES.COMPLETE;
            debugLog('Phase: COMPLETE');
            complete();
        }
    }
}

/**
 * Render the supply drop animation.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function render(ctx) {
    if (!isPlaying && currentPhase !== PHASES.HOLD) return;

    // Dark overlay
    const overlayOpacity = currentPhase === PHASES.APPROACH ? 0.7 : 0.85;
    drawOverlay(ctx, overlayOpacity);

    // Draw platform
    drawPlatform(ctx);

    // Phase-specific rendering
    switch (currentPhase) {
        case PHASES.APPROACH:
            drawContrail(ctx, planeX);
            drawPlane(ctx, planeX);
            break;

        case PHASES.DROP:
            drawContrail(ctx, planeX);
            drawPlane(ctx, planeX);
            drawSpotlight(ctx, crateX, crateY);
            if (parachuteDeployed && revealTank) {
                const sway = crateX - CANVAS.DESIGN_WIDTH / 2;
                drawParachute(ctx, crateX, crateY + VISUALS.PARACHUTE_OFFSET_Y, revealTank.rarity, sway);
            }
            drawCrate(ctx, crateX, crateY);
            break;

        case PHASES.LANDING:
            drawSpotlight(ctx, crateX, crateY);
            if (parachuteDeployed && revealTank) {
                drawParachute(ctx, crateX, crateY + VISUALS.PARACHUTE_OFFSET_Y - 50, revealTank.rarity);
            }
            drawCrate(ctx, crateX, crateY);
            break;

        case PHASES.REVEAL:
        case PHASES.HOLD:
            if (revealTank) {
                drawCrate(ctx, crateX, crateY, true);
                drawRevealedTank(ctx, revealTank, tankRiseProgress);

                const bannerAlpha = Math.min(1, tankRiseProgress * 2);
                drawRarityBanner(ctx, revealTank, bannerAlpha);
            }
            break;
    }

    // Always render particles on top
    renderParticles(ctx);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Start the supply drop animation.
 * @param {Object} tank - Tank to reveal
 * @param {Function} [onComplete] - Callback when animation completes
 */
export function play(tank, onComplete = null) {
    if (isPlaying) {
        debugLog('Animation already playing, ignoring play request');
        return;
    }

    if (!tank) {
        console.error('[SupplyDrop] Cannot play animation without a tank');
        return;
    }

    debugLog('Starting supply drop animation', { tank: tank.name, rarity: tank.rarity });

    revealTank = tank;
    onCompleteCallback = onComplete;
    isPlaying = true;
    currentPhase = PHASES.APPROACH;
    animationStartTime = performance.now();
    phaseStartTime = animationStartTime;

    // Reset state
    particles = [];
    planeX = CANVAS.DESIGN_WIDTH + VISUALS.PLANE_WIDTH;
    crateX = CANVAS.DESIGN_WIDTH / 2;
    crateY = VISUALS.CRATE_DROP_START_Y;
    parachuteDeployed = false;
    rainbowHue = 0;
    tankRiseProgress = 0;
}

/**
 * Skip the animation and complete immediately.
 */
export function skip() {
    if (!isPlaying) return;

    debugLog('Animation skipped');
    complete();
}

/**
 * Complete the animation and call callback.
 */
function complete() {
    isPlaying = false;
    currentPhase = PHASES.IDLE;

    const callback = onCompleteCallback;
    const tank = revealTank;

    // Reset state
    revealTank = null;
    onCompleteCallback = null;
    particles = [];

    debugLog('Animation complete', { tank: tank?.name });

    // Call callback
    if (callback) {
        callback(tank);
    }
}

/**
 * Check if animation is currently playing.
 * @returns {boolean} True if playing
 */
export function isAnimating() {
    return isPlaying;
}

/**
 * Get the currently revealing tank.
 * @returns {Object|null} Tank being revealed or null
 */
export function getRevealTank() {
    return revealTank;
}

/**
 * Get total animation duration.
 * @returns {number} Duration in milliseconds
 */
export function getDuration() {
    return TOTAL_DURATION;
}

/**
 * Initialize the supply drop system.
 */
export function init() {
    if (isInitialized) {
        console.warn('[SupplyDrop] Already initialized');
        return;
    }

    isInitialized = true;
    console.log('[SupplyDrop] System initialized', { duration: TOTAL_DURATION + 'ms' });
}
