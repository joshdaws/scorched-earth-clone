/**
 * Scorched Earth: Synthwave Edition
 * Supply Drop Animation System
 *
 * Creates dramatic 80s action movie-style supply drop animation for tank unlocks.
 * Full-screen overlay animation with plane approach, crate drop, and reveal.
 */

import { CANVAS, COLORS, DEBUG } from './constants.js';
import { RARITY, RARITY_COLORS, RARITY_NAMES } from './tank-skins.js';
import {
    playPlaneApproachSound,
    playPlaneFlyoverSound,
    playCrateDropSound,
    playParachuteDeploySound,
    playCrateLandSound,
    playRevealSound
} from './sound.js';

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
    SKIPPED: 'skipped',   // Shows result card after skip
    COMPLETE: 'complete'
};

/**
 * Skip functionality constants.
 */
const SKIP_CONFIG = {
    /** Delay before skip prompt appears (ms) */
    PROMPT_DELAY: 1000,
    /** Duration player must hold to skip (ms) */
    HOLD_DURATION: 500,
    /** LocalStorage key for tracking seen rarities */
    STORAGE_KEY: 'scorched_seen_rarities'
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

/**
 * Rarity-specific reveal effect configurations.
 * Each rarity tier gets progressively more dramatic effects.
 */
const RARITY_EFFECTS = {
    [RARITY.COMMON]: {
        // Common: Simple panel open, minimal glow
        sparkCount: 5,
        sparkSpeed: 80,
        glowIntensity: 0.3,
        lightRayCount: 0,
        screenShake: false,
        screenFlash: false,
        crateGlowColor: '#FFFFFF',
        crateGlowIntensity: 0.2,
        preRevealEffect: null
    },
    [RARITY.UNCOMMON]: {
        // Uncommon: Glowing edges, cyan particles
        sparkCount: 12,
        sparkSpeed: 120,
        glowIntensity: 0.5,
        lightRayCount: 4,
        screenShake: false,
        screenFlash: false,
        crateGlowColor: '#00FFFF',
        crateGlowIntensity: 0.4,
        preRevealEffect: 'cyanGlow'
    },
    [RARITY.RARE]: {
        // Rare: Electric sparks, purple lightning
        sparkCount: 18,
        sparkSpeed: 160,
        glowIntensity: 0.7,
        lightRayCount: 6,
        screenShake: false,
        screenFlash: false,
        crateGlowColor: '#8B5CF6',
        crateGlowIntensity: 0.6,
        preRevealEffect: 'lightning',
        lightningColor: '#8B5CF6'
    },
    [RARITY.EPIC]: {
        // Epic: Holographic shimmer, golden particles, strobing
        sparkCount: 25,
        sparkSpeed: 200,
        glowIntensity: 0.9,
        lightRayCount: 8,
        screenShake: true,
        shakeIntensity: 3,
        shakeDuration: 200,
        screenFlash: false,
        crateGlowColor: '#FFD700',
        crateGlowIntensity: 0.8,
        preRevealEffect: 'holographic',
        strobeColors: ['#FFD700', '#FF6B35', '#FF00FF']
    },
    [RARITY.LEGENDARY]: {
        // Legendary: Maximum explosion, screen shake, flash, light rays
        sparkCount: 40,
        sparkSpeed: 250,
        glowIntensity: 1.0,
        lightRayCount: 12,
        screenShake: true,
        shakeIntensity: 8,
        shakeDuration: 400,
        screenFlash: true,
        flashDuration: 150,
        crateGlowColor: '#FF0066',
        crateGlowIntensity: 1.0,
        preRevealEffect: 'glitch',
        glitchIntensity: 0.8
    }
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

// --- Rarity effect state ---
/** @type {number} Screen shake offset X */
let shakeOffsetX = 0;
/** @type {number} Screen shake offset Y */
let shakeOffsetY = 0;
/** @type {number} Screen shake remaining duration */
let shakeDuration = 0;
/** @type {number} Screen shake intensity */
let shakeIntensity = 0;

/** @type {number} Screen flash opacity (0-1) */
let flashOpacity = 0;
/** @type {number} Screen flash remaining duration */
let flashDuration = 0;

/** @type {number} Pre-reveal effect progress (0-1) */
let preRevealProgress = 0;
/** @type {boolean} Whether pre-reveal effect is active */
let preRevealActive = false;

/** @type {number} Strobe color index for epic rarity */
let strobeIndex = 0;
/** @type {number} Strobe timer */
let strobeTimer = 0;

/** @type {Array} Lightning bolt points for rare rarity */
let lightningBolts = [];
/** @type {number} Lightning update timer */
let lightningTimer = 0;

/** @type {number} Glitch effect intensity for legendary */
let glitchIntensity = 0;
/** @type {Array} Glitch slice offsets */
let glitchSlices = [];

// --- Skip functionality state ---
/** @type {Set<string>} Set of rarity tiers player has seen */
let seenRarities = new Set();
/** @type {boolean} Whether skip is being held */
let skipHoldActive = false;
/** @type {number} How long skip has been held (ms) */
let skipHoldDuration = 0;
/** @type {boolean} Whether skip prompt should be shown */
let showSkipPrompt = false;
/** @type {boolean} Whether current reveal can be skipped */
let canSkipCurrent = false;

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
// SKIP FUNCTIONALITY
// =============================================================================

/**
 * Load seen rarities from localStorage.
 */
function loadSeenRarities() {
    try {
        const stored = localStorage.getItem(SKIP_CONFIG.STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            seenRarities = new Set(parsed);
            debugLog('Loaded seen rarities', { rarities: Array.from(seenRarities) });
        }
    } catch (e) {
        console.error('[SupplyDrop] Failed to load seen rarities:', e);
        seenRarities = new Set();
    }
}

/**
 * Save seen rarities to localStorage.
 */
function saveSeenRarities() {
    try {
        localStorage.setItem(SKIP_CONFIG.STORAGE_KEY, JSON.stringify(Array.from(seenRarities)));
        debugLog('Saved seen rarities', { rarities: Array.from(seenRarities) });
    } catch (e) {
        console.error('[SupplyDrop] Failed to save seen rarities:', e);
    }
}

/**
 * Mark a rarity as seen.
 * @param {string} rarity - Rarity tier to mark as seen
 */
function markRaritySeen(rarity) {
    if (!seenRarities.has(rarity)) {
        seenRarities.add(rarity);
        saveSeenRarities();
        debugLog('Marked rarity as seen', { rarity });
    }
}

/**
 * Check if a rarity has been seen before.
 * @param {string} rarity - Rarity tier to check
 * @returns {boolean} True if seen before
 */
function hasSeenRarity(rarity) {
    return seenRarities.has(rarity);
}

/**
 * Start holding to skip.
 */
export function startSkipHold() {
    if (!isPlaying || !canSkipCurrent) return;
    skipHoldActive = true;
    skipHoldDuration = 0;
    debugLog('Skip hold started');
}

/**
 * Stop holding to skip.
 */
export function stopSkipHold() {
    skipHoldActive = false;
    skipHoldDuration = 0;
}

/**
 * Update skip hold progress.
 * @param {number} deltaTime - Time since last update in ms
 */
function updateSkipHold(deltaTime) {
    if (!skipHoldActive || !canSkipCurrent) return;

    skipHoldDuration += deltaTime;

    if (skipHoldDuration >= SKIP_CONFIG.HOLD_DURATION) {
        debugLog('Skip hold completed');
        performSkip();
    }
}

/**
 * Perform the skip action - jump to result card.
 */
function performSkip() {
    if (!isPlaying) return;

    debugLog('Animation skipped to result card');

    // Reset effects
    preRevealActive = false;
    lightningBolts = [];
    glitchSlices = [];
    glitchIntensity = 0;
    particles = [];

    // Set tank rise to complete
    tankRiseProgress = 1;

    // Jump to skipped phase (shows result card)
    currentPhase = PHASES.SKIPPED;
    phaseStartTime = performance.now();

    // Reset skip hold state
    skipHoldActive = false;
    skipHoldDuration = 0;
}

/**
 * Get skip hold progress (0-1).
 * @returns {number} Progress from 0 to 1
 */
export function getSkipProgress() {
    if (!skipHoldActive) return 0;
    return Math.min(1, skipHoldDuration / SKIP_CONFIG.HOLD_DURATION);
}

/**
 * Check if skip prompt should be shown.
 * @returns {boolean} True if prompt should display
 */
export function shouldShowSkipPrompt() {
    return showSkipPrompt && canSkipCurrent;
}

/**
 * Draw the skip prompt UI.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawSkipPrompt(ctx) {
    if (!showSkipPrompt || !canSkipCurrent) return;

    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const promptY = CANVAS.DESIGN_HEIGHT - 60;

    ctx.save();

    // Background pill
    const pillWidth = 200;
    const pillHeight = 36;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(centerX - pillWidth / 2, promptY - pillHeight / 2, pillWidth, pillHeight, 18);
    ctx.fill();

    // Progress bar fill
    if (skipHoldActive && skipHoldDuration > 0) {
        const progress = getSkipProgress();
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.roundRect(
            centerX - pillWidth / 2,
            promptY - pillHeight / 2,
            pillWidth * progress,
            pillHeight,
            18
        );
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Border
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(centerX - pillWidth / 2, promptY - pillHeight / 2, pillWidth, pillHeight, 18);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hold SPACE to skip', centerX, promptY);

    ctx.restore();
}

/**
 * Draw the result card when animation is skipped.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawResultCard(ctx) {
    if (!revealTank) return;

    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const centerY = CANVAS.DESIGN_HEIGHT / 2;
    const rarity = revealTank.rarity;
    const rarityColor = RARITY_COLORS[rarity] || '#FFFFFF';
    const rarityName = RARITY_NAMES[rarity] || 'Unknown';

    ctx.save();

    // Card background
    const cardWidth = 400;
    const cardHeight = 450;
    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    ctx.strokeStyle = rarityColor;
    ctx.shadowColor = rarityColor;
    ctx.shadowBlur = 30;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(centerX - cardWidth / 2, centerY - cardHeight / 2, cardWidth, cardHeight, 20);
    ctx.fill();
    ctx.stroke();

    // Rarity banner at top
    const bannerY = centerY - cardHeight / 2 + 40;
    ctx.fillStyle = rarityColor;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rarityName.toUpperCase(), centerX, bannerY);

    // Tank display area (placeholder rectangle)
    const tankY = centerY - 40;
    const tankSize = 160;
    const glowColor = revealTank.glowColor || rarityColor;

    ctx.fillStyle = '#0a0a1a';
    ctx.strokeStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(centerX - tankSize / 2, tankY - tankSize / 2, tankSize, tankSize * 0.6, 10);
    ctx.fill();
    ctx.stroke();

    // Simple tank shape inside
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1a2a';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - 50, tankY - 15, 100, 30);
    ctx.strokeRect(centerX - 50, tankY - 15, 100, 30);

    // Turret
    ctx.beginPath();
    ctx.arc(centerX, tankY - 15, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, tankY - 15);
    ctx.lineTo(centerX + 35, tankY - 30);
    ctx.lineWidth = 5;
    ctx.stroke();

    // Tank name
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(revealTank.name, centerX, tankY + 70);

    // Description
    ctx.fillStyle = '#888899';
    ctx.font = '14px Arial';
    ctx.fillText(revealTank.description, centerX, tankY + 100);

    // "Added to Collection" text
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = 'bold 16px Arial';
    ctx.fillText('ADDED TO COLLECTION', centerX, tankY + 150);

    // Continue prompt at bottom
    const continueY = centerY + cardHeight / 2 - 40;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.fillText('Press SPACE or click to continue', centerX, continueY);

    ctx.restore();
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
 * Spawn spark particles for crate explosion with rarity-based intensity.
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {string} color - Rarity color
 * @param {string} rarity - Tank rarity for effect intensity
 */
function spawnSparkParticles(x, y, color, rarity = RARITY.COMMON) {
    const effects = RARITY_EFFECTS[rarity] || RARITY_EFFECTS[RARITY.COMMON];
    const count = effects.sparkCount;
    const baseSpeed = effects.sparkSpeed;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = baseSpeed * (0.5 + Math.random());
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
// RARITY EFFECT HELPERS
// =============================================================================

/**
 * Trigger screen shake effect.
 * @param {number} intensity - Shake intensity in pixels
 * @param {number} duration - Shake duration in ms
 */
function triggerScreenShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeDuration = duration;
    debugLog('Screen shake triggered', { intensity, duration });
}

/**
 * Update screen shake effect.
 * @param {number} deltaTime - Time since last update in ms
 */
function updateScreenShake(deltaTime) {
    if (shakeDuration > 0) {
        shakeDuration -= deltaTime;
        const progress = shakeDuration > 0 ? 1 : 0;
        const currentIntensity = shakeIntensity * progress;
        shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
        shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;
    } else {
        shakeOffsetX = 0;
        shakeOffsetY = 0;
    }
}

/**
 * Trigger screen flash effect.
 * @param {number} duration - Flash duration in ms
 */
function triggerScreenFlash(duration) {
    flashOpacity = 1;
    flashDuration = duration;
    debugLog('Screen flash triggered', { duration });
}

/**
 * Update screen flash effect.
 * @param {number} deltaTime - Time since last update in ms
 */
function updateScreenFlash(deltaTime) {
    if (flashDuration > 0) {
        flashDuration -= deltaTime;
        flashOpacity = Math.max(0, flashDuration / 150); // Fade out
    } else {
        flashOpacity = 0;
    }
}

/**
 * Draw screen flash overlay.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawScreenFlash(ctx) {
    if (flashOpacity > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity * 0.8})`;
        ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
        ctx.restore();
    }
}

/**
 * Generate lightning bolt points.
 * @param {number} startX - Start X position
 * @param {number} startY - Start Y position
 * @param {number} endX - End X position
 * @param {number} endY - End Y position
 * @returns {Array} Array of {x, y} points
 */
function generateLightningBolt(startX, startY, endX, endY) {
    const points = [{ x: startX, y: startY }];
    const segments = 8 + Math.floor(Math.random() * 4);
    const dx = (endX - startX) / segments;
    const dy = (endY - startY) / segments;

    for (let i = 1; i < segments; i++) {
        const x = startX + dx * i + (Math.random() - 0.5) * 40;
        const y = startY + dy * i + (Math.random() - 0.5) * 20;
        points.push({ x, y });
    }

    points.push({ x: endX, y: endY });
    return points;
}

/**
 * Update lightning bolts for rare rarity.
 * @param {number} deltaTime - Time since last update in ms
 * @param {number} crateX - Crate X position
 * @param {number} crateY - Crate Y position
 */
function updateLightning(deltaTime, crateX, crateY) {
    lightningTimer += deltaTime;

    // Regenerate lightning every 100ms
    if (lightningTimer > 100) {
        lightningTimer = 0;
        lightningBolts = [];

        // Generate 2-4 lightning bolts around the crate
        const boltCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < boltCount; i++) {
            const startAngle = Math.random() * Math.PI * 2;
            const startDist = 80 + Math.random() * 40;
            const endAngle = startAngle + (Math.random() - 0.5) * Math.PI;
            const endDist = 20 + Math.random() * 30;

            lightningBolts.push(generateLightningBolt(
                crateX + Math.cos(startAngle) * startDist,
                crateY + Math.sin(startAngle) * startDist - 30,
                crateX + Math.cos(endAngle) * endDist,
                crateY + Math.sin(endAngle) * endDist - 30
            ));
        }
    }
}

/**
 * Draw lightning bolts.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} color - Lightning color
 */
function drawLightning(ctx, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;

    for (const bolt of lightningBolts) {
        if (bolt.length < 2) continue;

        ctx.beginPath();
        ctx.moveTo(bolt[0].x, bolt[0].y);
        for (let i = 1; i < bolt.length; i++) {
            ctx.lineTo(bolt[i].x, bolt[i].y);
        }
        ctx.stroke();

        // Draw glow layer
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

/**
 * Update strobe effect for epic rarity.
 * @param {number} deltaTime - Time since last update in ms
 */
function updateStrobe(deltaTime) {
    strobeTimer += deltaTime;
    if (strobeTimer > 80) { // Change color every 80ms
        strobeTimer = 0;
        strobeIndex = (strobeIndex + 1) % 3;
    }
}

/**
 * Get current strobe color for epic rarity.
 * @param {Array} colors - Array of strobe colors
 * @returns {string} Current strobe color
 */
function getStrobeColor(colors) {
    return colors[strobeIndex] || colors[0];
}

/**
 * Update glitch effect for legendary rarity.
 * @param {number} deltaTime - Time since last update in ms
 * @param {number} intensity - Glitch intensity (0-1)
 */
function updateGlitch(deltaTime, intensity) {
    glitchIntensity = intensity;

    // Regenerate glitch slices randomly
    if (Math.random() < 0.3) {
        glitchSlices = [];
        const sliceCount = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < sliceCount; i++) {
            glitchSlices.push({
                y: Math.random() * CANVAS.DESIGN_HEIGHT,
                height: 5 + Math.random() * 30,
                offsetX: (Math.random() - 0.5) * 40 * intensity,
                color: Math.random() > 0.5 ? '#FF0066' : '#00FFFF'
            });
        }
    }
}

/**
 * Draw glitch effect overlay.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawGlitchEffect(ctx) {
    if (glitchIntensity <= 0 || glitchSlices.length === 0) return;

    ctx.save();
    ctx.globalAlpha = glitchIntensity * 0.3;

    for (const slice of glitchSlices) {
        ctx.fillStyle = slice.color;
        ctx.fillRect(slice.offsetX, slice.y, CANVAS.DESIGN_WIDTH, slice.height);
    }

    ctx.restore();
}

/**
 * Draw holographic shimmer effect for epic rarity.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} progress - Effect progress (0-1)
 */
function drawHolographicShimmer(ctx, x, y, progress) {
    ctx.save();

    const shimmerWidth = 80 + progress * 40;
    const shimmerHeight = 80 + progress * 40;

    // Create rainbow gradient
    const gradient = ctx.createLinearGradient(
        x - shimmerWidth / 2, y,
        x + shimmerWidth / 2, y
    );

    const hueOffset = (Date.now() * 0.2) % 360;
    gradient.addColorStop(0, `hsla(${hueOffset}, 100%, 60%, 0.3)`);
    gradient.addColorStop(0.33, `hsla(${(hueOffset + 120) % 360}, 100%, 60%, 0.3)`);
    gradient.addColorStop(0.66, `hsla(${(hueOffset + 240) % 360}, 100%, 60%, 0.3)`);
    gradient.addColorStop(1, `hsla(${hueOffset}, 100%, 60%, 0.3)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y - 30, shimmerWidth / 2, shimmerHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Draw crate glow effect based on rarity.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Crate X position
 * @param {number} y - Crate Y position
 * @param {string} rarity - Tank rarity
 * @param {number} progress - Glow progress (0-1)
 */
function drawCrateGlow(ctx, x, y, rarity, progress) {
    const effects = RARITY_EFFECTS[rarity] || RARITY_EFFECTS[RARITY.COMMON];
    const glowColor = effects.crateGlowColor;
    const intensity = effects.crateGlowIntensity * progress;

    if (intensity <= 0) return;

    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30 + progress * 20;

    // Pulsing glow
    const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
    const size = VISUALS.CRATE_SIZE * pulse;

    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);

    ctx.restore();
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
 * Draw the revealed tank with rarity-based effects.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} tank - Tank to display
 * @param {number} riseProgress - Rise animation progress (0-1)
 */
function drawRevealedTank(ctx, tank, riseProgress) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const baseY = VISUALS.PLATFORM_Y;
    const tankY = baseY - (riseProgress * 80);
    const size = VISUALS.TANK_DISPLAY_SIZE;

    // Get rarity-specific effects
    const effects = RARITY_EFFECTS[tank.rarity] || RARITY_EFFECTS[RARITY.COMMON];

    ctx.save();

    // Tank glow - intensity based on rarity
    const glowColor = tank.glowColor || RARITY_COLORS[tank.rarity];
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30 * riseProgress * effects.glowIntensity;

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

    // Light beams from tank (during reveal) - count based on rarity
    const rayCount = effects.lightRayCount;
    if (riseProgress > 0.3 && rayCount > 0) {
        const beamAlpha = (riseProgress - 0.3) * effects.glowIntensity;
        ctx.globalAlpha = beamAlpha;

        // Longer beams for higher rarities
        const baseBeamLength = 80 + rayCount * 10;

        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2;
            const beamLength = baseBeamLength + Math.sin(Date.now() * 0.005 + i) * 20;

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
 * Update reveal phase with rarity-specific effects.
 * @param {number} phaseProgress - Progress through phase (0-1)
 * @param {number} deltaTime - Time since last update in ms
 */
function updateReveal(phaseProgress, deltaTime) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const rarity = revealTank?.rarity || RARITY.COMMON;
    const effects = RARITY_EFFECTS[rarity] || RARITY_EFFECTS[RARITY.COMMON];

    // Spawn sparks at start - count based on rarity
    if (phaseProgress < 0.05 && particles.length < effects.sparkCount) {
        const rarityColor = RARITY_COLORS[rarity] || '#FFFFFF';
        spawnSparkParticles(centerX, crateY, rarityColor, rarity);
    }

    // Trigger screen shake at reveal start for Epic and Legendary
    if (phaseProgress < 0.1 && effects.screenShake && shakeDuration <= 0) {
        triggerScreenShake(effects.shakeIntensity, effects.shakeDuration);
    }

    // Trigger screen flash for Legendary
    if (phaseProgress < 0.05 && effects.screenFlash && flashDuration <= 0) {
        triggerScreenFlash(effects.flashDuration);
    }

    // Update rarity-specific effects
    if (effects.preRevealEffect === 'lightning') {
        updateLightning(deltaTime, centerX, crateY);
    }
    if (effects.preRevealEffect === 'holographic' || effects.strobeColors) {
        updateStrobe(deltaTime);
    }
    if (effects.preRevealEffect === 'glitch') {
        // Glitch intensity decreases as reveal progresses
        updateGlitch(deltaTime, effects.glitchIntensity * (1 - phaseProgress));
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

    // If in SKIPPED phase, don't process normal animation - wait for user to continue
    if (currentPhase === PHASES.SKIPPED) {
        return;
    }

    const now = performance.now();
    const elapsed = now - animationStartTime;

    // Update rainbow hue for legendary
    rainbowHue = (rainbowHue + deltaTime * 0.2) % 360;

    // Update particles
    updateParticles(deltaTime);

    // Update screen effects (shake and flash)
    updateScreenShake(deltaTime);
    updateScreenFlash(deltaTime);

    // Update skip functionality
    updateSkipHold(deltaTime);

    // If skip was performed, return early (don't let time-based phases overwrite SKIPPED)
    if (currentPhase === PHASES.SKIPPED) {
        return;
    }

    // Show skip prompt after 1 second of animation (if skippable)
    if (canSkipCurrent && elapsed >= SKIP_CONFIG.PROMPT_DELAY && !showSkipPrompt) {
        showSkipPrompt = true;
        debugLog('Skip prompt now available');
    }

    // Determine current phase based on elapsed time
    let accumulatedTime = 0;

    if (elapsed < (accumulatedTime += PHASE_TIMING.APPROACH)) {
        if (currentPhase !== PHASES.APPROACH) {
            currentPhase = PHASES.APPROACH;
            phaseStartTime = now;
            debugLog('Phase: APPROACH');
            // Play plane approach sound
            playPlaneApproachSound();
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
            // Play plane flyover and crate/parachute sounds
            playPlaneFlyoverSound();
            playCrateDropSound();
            playParachuteDeploySound();
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.DROP);
        updateDrop(progress);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.LANDING)) {
        if (currentPhase !== PHASES.LANDING) {
            currentPhase = PHASES.LANDING;
            phaseStartTime = now;
            debugLog('Phase: LANDING');
            // Play crate landing sound
            playCrateLandSound();
            // Pre-reveal effects start during landing for Rare+
            preRevealActive = true;
            preRevealProgress = 0;
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.LANDING);
        updateLanding(progress);

        // Update pre-reveal progress for rarity effects
        if (preRevealActive) {
            preRevealProgress = progress;
            const rarity = revealTank?.rarity || RARITY.COMMON;
            const effects = RARITY_EFFECTS[rarity] || RARITY_EFFECTS[RARITY.COMMON];

            // Start lightning effect for rare
            if (effects.preRevealEffect === 'lightning') {
                updateLightning(deltaTime, crateX, crateY);
            }
            // Start glitch effect for legendary
            if (effects.preRevealEffect === 'glitch') {
                updateGlitch(deltaTime, effects.glitchIntensity * progress);
            }
        }
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.REVEAL)) {
        if (currentPhase !== PHASES.REVEAL) {
            currentPhase = PHASES.REVEAL;
            phaseStartTime = now;
            debugLog('Phase: REVEAL');
            // Play rarity-specific reveal sound
            if (revealTank?.rarity) {
                playRevealSound(revealTank.rarity);
            }
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.REVEAL);
        updateReveal(progress, deltaTime);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.HOLD)) {
        if (currentPhase !== PHASES.HOLD) {
            currentPhase = PHASES.HOLD;
            phaseStartTime = now;
            debugLog('Phase: HOLD');
            // Clear effects during hold
            preRevealActive = false;
            lightningBolts = [];
            glitchSlices = [];
            glitchIntensity = 0;
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
 * Render the supply drop animation with rarity-specific effects.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function render(ctx) {
    if (!isPlaying && currentPhase !== PHASES.HOLD && currentPhase !== PHASES.SKIPPED) return;

    const rarity = revealTank?.rarity || RARITY.COMMON;
    const effects = RARITY_EFFECTS[rarity] || RARITY_EFFECTS[RARITY.COMMON];

    // Apply screen shake offset
    ctx.save();
    if (shakeOffsetX !== 0 || shakeOffsetY !== 0) {
        ctx.translate(shakeOffsetX, shakeOffsetY);
    }

    // Dark overlay
    const overlayOpacity = currentPhase === PHASES.APPROACH ? 0.7 : 0.85;
    drawOverlay(ctx, overlayOpacity);

    // Draw glitch effect for legendary (before platform)
    if (effects.preRevealEffect === 'glitch' && glitchIntensity > 0) {
        drawGlitchEffect(ctx);
    }

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

            // Draw pre-reveal effects based on rarity
            if (preRevealActive && revealTank) {
                // Draw crate glow for uncommon+
                if (effects.crateGlowIntensity > 0) {
                    drawCrateGlow(ctx, crateX, crateY, rarity, preRevealProgress);
                }

                // Draw lightning for rare
                if (effects.preRevealEffect === 'lightning') {
                    drawLightning(ctx, effects.lightningColor || '#8B5CF6');
                }

                // Draw holographic shimmer for epic
                if (effects.preRevealEffect === 'holographic') {
                    drawHolographicShimmer(ctx, crateX, crateY, preRevealProgress);
                }
            }

            drawCrate(ctx, crateX, crateY);
            break;

        case PHASES.REVEAL:
        case PHASES.HOLD:
            if (revealTank) {
                // Draw crate glow during reveal
                if (currentPhase === PHASES.REVEAL && effects.crateGlowIntensity > 0) {
                    drawCrateGlow(ctx, crateX, crateY, rarity, 1);
                }

                // Draw lightning during reveal for rare
                if (currentPhase === PHASES.REVEAL && effects.preRevealEffect === 'lightning') {
                    drawLightning(ctx, effects.lightningColor || '#8B5CF6');
                }

                // Draw holographic shimmer for epic during reveal
                if (currentPhase === PHASES.REVEAL && effects.preRevealEffect === 'holographic') {
                    drawHolographicShimmer(ctx, crateX, crateY, tankRiseProgress);
                }

                drawCrate(ctx, crateX, crateY, true);
                drawRevealedTank(ctx, revealTank, tankRiseProgress);

                const bannerAlpha = Math.min(1, tankRiseProgress * 2);
                drawRarityBanner(ctx, revealTank, bannerAlpha);
            }
            break;

        case PHASES.SKIPPED:
            // Show result card when animation was skipped
            drawResultCard(ctx);
            break;
    }

    // Always render particles on top
    renderParticles(ctx);

    // Restore from screen shake offset
    ctx.restore();

    // Draw screen flash on top of everything (not affected by shake)
    drawScreenFlash(ctx);

    // Draw skip prompt on top of everything (outside shake context)
    if (showSkipPrompt && currentPhase !== PHASES.SKIPPED) {
        drawSkipPrompt(ctx);
    }
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

    // Reset core state
    particles = [];
    planeX = CANVAS.DESIGN_WIDTH + VISUALS.PLANE_WIDTH;
    crateX = CANVAS.DESIGN_WIDTH / 2;
    crateY = VISUALS.CRATE_DROP_START_Y;
    parachuteDeployed = false;
    rainbowHue = 0;
    tankRiseProgress = 0;

    // Reset rarity effect state
    shakeOffsetX = 0;
    shakeOffsetY = 0;
    shakeDuration = 0;
    shakeIntensity = 0;
    flashOpacity = 0;
    flashDuration = 0;
    preRevealProgress = 0;
    preRevealActive = false;
    strobeIndex = 0;
    strobeTimer = 0;
    lightningBolts = [];
    lightningTimer = 0;
    glitchIntensity = 0;
    glitchSlices = [];

    // Reset skip state - can only skip if we've seen this rarity before
    canSkipCurrent = hasSeenRarity(tank.rarity);
    showSkipPrompt = false;
    skipHoldActive = false;
    skipHoldDuration = 0;

    debugLog('Skip available', { canSkip: canSkipCurrent, rarity: tank.rarity });
}

/**
 * Skip the animation and complete immediately.
 * @deprecated Use startSkipHold/stopSkipHold for hold-to-skip behavior
 */
export function skip() {
    if (!isPlaying) return;

    debugLog('Animation skipped');
    complete();
}

/**
 * Continue from the SKIPPED phase (result card) to complete the animation.
 * Called when user clicks or presses space on the result card.
 */
export function continueFromSkip() {
    if (currentPhase !== PHASES.SKIPPED) return;

    debugLog('Continuing from skip result card');
    complete();
}

/**
 * Check if we're currently showing the result card (SKIPPED phase).
 * @returns {boolean} True if showing result card
 */
export function isShowingResultCard() {
    return currentPhase === PHASES.SKIPPED;
}

/**
 * Complete the animation and call callback.
 */
function complete() {
    isPlaying = false;
    currentPhase = PHASES.IDLE;

    const callback = onCompleteCallback;
    const tank = revealTank;

    // Mark this rarity as seen for future skip capability
    if (tank?.rarity) {
        markRaritySeen(tank.rarity);
    }

    // Reset state
    revealTank = null;
    onCompleteCallback = null;
    particles = [];

    // Reset skip state
    canSkipCurrent = false;
    showSkipPrompt = false;
    skipHoldActive = false;
    skipHoldDuration = 0;

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

    // Load previously seen rarities from localStorage
    loadSeenRarities();

    isInitialized = true;
    console.log('[SupplyDrop] System initialized', {
        duration: TOTAL_DURATION + 'ms',
        seenRarities: Array.from(seenRarities)
    });
}
