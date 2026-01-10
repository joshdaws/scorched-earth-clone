/**
 * Scorched Earth: Synthwave Edition
 * Extraction Reveal Animation
 *
 * Alternative reveal animation for Legendary tanks only.
 * Helicopter extraction sequence with dramatic 80s action movie vibes.
 *
 * Phases:
 * 1. INTERFERENCE - Screen static, "INCOMING TRANSMISSION" text
 * 2. APPROACH - Helicopter spotlight sweeps, chopper descends
 * 3. DELIVERY - Tank lowered on cable with swinging motion
 * 4. REVEAL - Tank touches down, "LEGENDARY ASSET ACQUIRED"
 */

import { CANVAS, COLORS, DEBUG } from './constants.js';
import { RARITY, RARITY_COLORS, RARITY_NAMES } from './tank-skins.js';

// =============================================================================
// ANIMATION CONSTANTS
// =============================================================================

/**
 * Animation phase timing in milliseconds.
 * Total ~8 seconds (longer than standard supply drop)
 */
const PHASE_TIMING = {
    INTERFERENCE: 1500,   // Static + transmission text
    APPROACH: 2000,       // Helicopter descent with spotlight
    DELIVERY: 2500,       // Cable lowering with tank
    REVEAL: 2000          // Final reveal + hold
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
    INTERFERENCE: 'interference',
    APPROACH: 'approach',
    DELIVERY: 'delivery',
    REVEAL: 'reveal',
    COMPLETE: 'complete'
};

/**
 * Visual constants for extraction.
 */
const VISUALS = {
    // Helicopter
    HELI_WIDTH: 180,
    HELI_HEIGHT: 60,
    HELI_START_Y: -100,
    HELI_END_Y: 150,
    ROTOR_LENGTH: 90,
    ROTOR_SPEED: 0.05,

    // Cable
    CABLE_START_Y: 80,  // Relative to helicopter
    CABLE_LENGTH: 300,
    CABLE_SWING_AMPLITUDE: 40,
    CABLE_SWING_FREQUENCY: 1.5,

    // Tank on cable
    TANK_SIZE: 100,

    // Spotlight
    SPOTLIGHT_WIDTH: 400,
    SPOTLIGHT_START_X: -100,
    SPOTLIGHT_SWEEP_WIDTH: CANVAS.DESIGN_WIDTH + 200,

    // Platform
    PLATFORM_WIDTH: 300,
    PLATFORM_HEIGHT: 30,
    PLATFORM_Y: 580,

    // Fog/clouds
    FOG_LAYERS: 3,
    FOG_OPACITY: 0.4,

    // Rotor wash particles
    WASH_PARTICLE_COUNT: 30,

    // Static effect
    STATIC_INTENSITY: 0.8,
    SCANLINE_COUNT: 100
};

/**
 * Colors for neon effects.
 */
const EXTRACTION_COLORS = {
    SPOTLIGHT: '#FFFFFF',
    HELICOPTER: '#FF0066',
    CABLE: '#00FFFF',
    TEXT: '#FF0066',
    GLOW: '#FF00FF',
    FOG: '#1a0033'
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

/** @type {boolean} Module initialized */
let isInitialized = false;

// --- Animation state ---
/** @type {number} Helicopter Y position */
let heliY = VISUALS.HELI_START_Y;
/** @type {number} Helicopter X position */
let heliX = CANVAS.DESIGN_WIDTH / 2;
/** @type {number} Main rotor angle */
let rotorAngle = 0;
/** @type {number} Spotlight X position (for sweep) */
let spotlightX = VISUALS.SPOTLIGHT_START_X;
/** @type {number} Cable length (extends during delivery) */
let cableLength = 0;
/** @type {number} Cable swing offset */
let cableSwing = 0;
/** @type {number} Tank Y position on cable */
let tankY = 0;
/** @type {boolean} Tank has touched down */
let tankLanded = false;

// --- Effect state ---
/** @type {number} Static effect intensity (0-1) */
let staticIntensity = 0;
/** @type {boolean} Show "INCOMING TRANSMISSION" text */
let showTransmission = false;
/** @type {number} Transmission text flicker timer */
let transmissionFlicker = 0;
/** @type {Array} Rotor wash particles */
let washParticles = [];
/** @type {Array} Fog layer positions */
let fogLayers = [];
/** @type {number} Screen flash opacity */
let flashOpacity = 0;
/** @type {number} Reveal text alpha */
let revealTextAlpha = 0;

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
            console.log(`[ExtractionReveal] ${message}`, data);
        } else {
            console.log(`[ExtractionReveal] ${message}`);
        }
    }
}

// =============================================================================
// PARTICLE SYSTEM
// =============================================================================

/**
 * Create a rotor wash particle.
 * @param {number} x - Start X position
 * @param {number} y - Start Y position
 * @returns {Object} Particle object
 */
function createWashParticle(x, y) {
    const angle = (Math.random() - 0.5) * Math.PI;
    const speed = 100 + Math.random() * 150;
    return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.3 + speed * 0.5,
        size: 2 + Math.random() * 4,
        life: 800 + Math.random() * 400,
        maxLife: 1200,
        alpha: 0.6 + Math.random() * 0.4
    };
}

/**
 * Update wash particles.
 * @param {number} deltaTime - Time since last update in ms
 */
function updateWashParticles(deltaTime) {
    const dt = deltaTime / 1000;

    for (let i = washParticles.length - 1; i >= 0; i--) {
        const p = washParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 50 * dt; // Slight downward pull
        p.life -= deltaTime;

        if (p.life <= 0 || p.y > CANVAS.DESIGN_HEIGHT) {
            washParticles.splice(i, 1);
        }
    }
}

/**
 * Spawn rotor wash particles.
 * @param {number} heliX - Helicopter X position
 * @param {number} heliY - Helicopter Y position
 */
function spawnWashParticles(heliX, heliY) {
    const count = Math.min(5, VISUALS.WASH_PARTICLE_COUNT - washParticles.length);
    for (let i = 0; i < count; i++) {
        washParticles.push(createWashParticle(
            heliX + (Math.random() - 0.5) * 100,
            heliY + 40
        ));
    }
}

/**
 * Render wash particles.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderWashParticles(ctx) {
    ctx.save();
    for (const p of washParticles) {
        const lifeRatio = p.life / p.maxLife;
        ctx.globalAlpha = lifeRatio * p.alpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Draw static/interference effect.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} intensity - Effect intensity (0-1)
 */
function drawStatic(ctx, intensity) {
    if (intensity <= 0) return;

    ctx.save();

    // Create static noise
    const imageData = ctx.getImageData(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < intensity * 0.3) {
            const noise = Math.random() * 255;
            data[i] = noise;     // R
            data[i + 1] = noise; // G
            data[i + 2] = noise; // B
            // Keep alpha
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let y = 0; y < CANVAS.DESIGN_HEIGHT; y += 4) {
        ctx.fillRect(0, y, CANVAS.DESIGN_WIDTH, 2);
    }

    // Add color distortion bands
    if (Math.random() < intensity * 0.5) {
        const bandY = Math.random() * CANVAS.DESIGN_HEIGHT;
        const bandHeight = 10 + Math.random() * 30;
        ctx.fillStyle = `rgba(255, 0, 102, ${intensity * 0.3})`;
        ctx.fillRect(0, bandY, CANVAS.DESIGN_WIDTH, bandHeight);
    }

    ctx.restore();
}

/**
 * Draw "INCOMING TRANSMISSION" text.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} flickerProgress - Flicker timer for effect
 */
function drawTransmissionText(ctx, flickerProgress) {
    // Flicker effect
    if (Math.sin(flickerProgress * 20) < -0.3) return;

    ctx.save();

    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const centerY = CANVAS.DESIGN_HEIGHT / 2;

    // Terminal-style background
    const boxWidth = 450;
    const boxHeight = 80;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = EXTRACTION_COLORS.TEXT;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.rect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);
    ctx.fill();
    ctx.stroke();

    // Glitch offset
    const glitchX = (Math.random() - 0.5) * 4;
    const glitchY = (Math.random() - 0.5) * 2;

    // Text with glow
    ctx.shadowColor = EXTRACTION_COLORS.TEXT;
    ctx.shadowBlur = 20;
    ctx.fillStyle = EXTRACTION_COLORS.TEXT;
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('INCOMING TRANSMISSION', centerX + glitchX, centerY - 10 + glitchY);

    // Blinking cursor
    if (Math.floor(flickerProgress * 4) % 2 === 0) {
        ctx.fillText('_', centerX + 210, centerY - 10);
    }

    // Sub-text
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#00FFFF';
    ctx.fillText('PRIORITY: LEGENDARY', centerX, centerY + 20);

    ctx.restore();
}

/**
 * Draw fog/cloud layers.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} progress - Animation progress for movement
 */
function drawFogLayers(ctx, progress) {
    ctx.save();

    for (let i = 0; i < VISUALS.FOG_LAYERS; i++) {
        const layerY = 100 + i * 80 + Math.sin(progress * 2 + i) * 20;
        const layerAlpha = VISUALS.FOG_OPACITY * (1 - i * 0.2);

        const gradient = ctx.createLinearGradient(0, layerY - 50, 0, layerY + 50);
        gradient.addColorStop(0, 'rgba(26, 0, 51, 0)');
        gradient.addColorStop(0.5, `rgba(26, 0, 51, ${layerAlpha})`);
        gradient.addColorStop(1, 'rgba(26, 0, 51, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, layerY - 50, CANVAS.DESIGN_WIDTH, 100);
    }

    ctx.restore();
}

/**
 * Draw the helicopter.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Helicopter center X
 * @param {number} y - Helicopter center Y
 * @param {number} rotorAngle - Current rotor angle
 */
function drawHelicopter(ctx, x, y, rotorAngle) {
    ctx.save();

    // Helicopter glow
    ctx.shadowColor = EXTRACTION_COLORS.HELICOPTER;
    ctx.shadowBlur = 20;

    // Main body (stylized, angular military helicopter)
    ctx.fillStyle = '#1a1a2a';
    ctx.strokeStyle = EXTRACTION_COLORS.HELICOPTER;
    ctx.lineWidth = 2;

    // Fuselage
    ctx.beginPath();
    ctx.moveTo(x - 60, y);
    ctx.lineTo(x - 80, y - 15);
    ctx.lineTo(x - 20, y - 25);
    ctx.lineTo(x + 40, y - 25);
    ctx.lineTo(x + 70, y - 10);
    ctx.lineTo(x + 60, y + 15);
    ctx.lineTo(x - 40, y + 20);
    ctx.lineTo(x - 60, y);
    ctx.fill();
    ctx.stroke();

    // Tail boom
    ctx.beginPath();
    ctx.moveTo(x - 60, y);
    ctx.lineTo(x - 90, y + 5);
    ctx.lineTo(x - 85, y - 5);
    ctx.lineTo(x - 60, y - 10);
    ctx.fill();
    ctx.stroke();

    // Tail rotor (small circle)
    ctx.beginPath();
    ctx.arc(x - 88, y, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Cockpit glass
    ctx.fillStyle = EXTRACTION_COLORS.HELICOPTER;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 40, y - 20);
    ctx.lineTo(x + 65, y - 5);
    ctx.lineTo(x + 55, y + 5);
    ctx.lineTo(x + 30, y - 10);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Main rotor hub
    ctx.fillStyle = '#333344';
    ctx.beginPath();
    ctx.arc(x, y - 30, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotor blades (spinning)
    ctx.strokeStyle = EXTRACTION_COLORS.CABLE;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (let i = 0; i < 4; i++) {
        const bladeAngle = rotorAngle + (i * Math.PI / 2);
        const bladeX = Math.cos(bladeAngle) * VISUALS.ROTOR_LENGTH;
        const bladeY = Math.sin(bladeAngle) * 15; // Flattened for perspective

        ctx.beginPath();
        ctx.moveTo(x, y - 30);
        ctx.lineTo(x + bladeX, y - 30 + bladeY);
        ctx.stroke();
    }

    // Rotor motion blur (when spinning fast)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 30, VISUALS.ROTOR_LENGTH, 15, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw spotlight cone from helicopter.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Spotlight center X at ground
 * @param {number} heliY - Helicopter Y position
 * @param {number} intensity - Spotlight intensity (0-1)
 */
function drawSpotlightCone(ctx, x, heliY, intensity) {
    ctx.save();

    const groundY = VISUALS.PLATFORM_Y;
    const topWidth = 30;
    const bottomWidth = VISUALS.SPOTLIGHT_WIDTH * intensity;

    // Main spotlight cone
    const gradient = ctx.createLinearGradient(x, heliY + 50, x, groundY);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * intensity})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.15 * intensity})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, ${0.05 * intensity})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x - topWidth / 2, heliY + 50);
    ctx.lineTo(x - bottomWidth / 2, groundY);
    ctx.lineTo(x + bottomWidth / 2, groundY);
    ctx.lineTo(x + topWidth / 2, heliY + 50);
    ctx.closePath();
    ctx.fill();

    // Ground illumination circle
    ctx.beginPath();
    const groundGradient = ctx.createRadialGradient(x, groundY, 0, x, groundY, bottomWidth / 2);
    groundGradient.addColorStop(0, `rgba(255, 255, 255, ${0.2 * intensity})`);
    groundGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = groundGradient;
    ctx.ellipse(x, groundY, bottomWidth / 2, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Draw the cable with tank attached.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} heliX - Helicopter X position
 * @param {number} heliY - Helicopter Y position
 * @param {number} cableLen - Current cable length
 * @param {number} swing - Swing offset
 * @param {Object} tank - Tank to display
 * @param {boolean} landed - Whether tank has landed
 */
function drawCableAndTank(ctx, heliX, heliY, cableLen, swing, tank, landed) {
    if (cableLen <= 0) return;

    ctx.save();

    const cableStartY = heliY + VISUALS.CABLE_START_Y;
    const tankX = heliX + swing;
    const tankY = cableStartY + cableLen;

    // Draw cable
    ctx.strokeStyle = EXTRACTION_COLORS.CABLE;
    ctx.shadowColor = EXTRACTION_COLORS.CABLE;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(heliX, cableStartY);
    // Slight curve to cable based on swing
    ctx.quadraticCurveTo(
        heliX + swing * 0.5,
        cableStartY + cableLen * 0.5,
        tankX,
        tankY
    );
    ctx.stroke();

    // Draw tank
    const tankWidth = VISUALS.TANK_SIZE;
    const tankHeight = VISUALS.TANK_SIZE / 2;

    // Tank glow based on rarity
    const glowColor = tank?.glowColor || RARITY_COLORS[RARITY.LEGENDARY];
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = landed ? 40 : 20;

    // Tank body
    ctx.fillStyle = '#1a1a2a';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;

    ctx.fillRect(tankX - tankWidth / 2, tankY - tankHeight, tankWidth, tankHeight);
    ctx.strokeRect(tankX - tankWidth / 2, tankY - tankHeight, tankWidth, tankHeight);

    // Tank turret
    ctx.beginPath();
    ctx.arc(tankX, tankY - tankHeight, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Turret barrel
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tankX, tankY - tankHeight);
    ctx.lineTo(tankX + 35, tankY - tankHeight - 15);
    ctx.stroke();

    // Cable attachment point on tank
    if (!landed) {
        ctx.fillStyle = EXTRACTION_COLORS.CABLE;
        ctx.beginPath();
        ctx.arc(tankX, tankY - tankHeight - 5, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Draw the landing platform.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawPlatform(ctx) {
    const centerX = CANVAS.DESIGN_WIDTH / 2;
    const platformX = centerX - VISUALS.PLATFORM_WIDTH / 2;

    ctx.save();

    // Platform glow
    ctx.shadowColor = EXTRACTION_COLORS.HELICOPTER;
    ctx.shadowBlur = 20;

    // Platform surface
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(platformX, VISUALS.PLATFORM_Y, VISUALS.PLATFORM_WIDTH, VISUALS.PLATFORM_HEIGHT);

    // Helipad markings
    ctx.strokeStyle = EXTRACTION_COLORS.HELICOPTER;
    ctx.lineWidth = 3;

    // H marking
    ctx.beginPath();
    ctx.moveTo(centerX - 30, VISUALS.PLATFORM_Y + 5);
    ctx.lineTo(centerX - 30, VISUALS.PLATFORM_Y + VISUALS.PLATFORM_HEIGHT - 5);
    ctx.moveTo(centerX + 30, VISUALS.PLATFORM_Y + 5);
    ctx.lineTo(centerX + 30, VISUALS.PLATFORM_Y + VISUALS.PLATFORM_HEIGHT - 5);
    ctx.moveTo(centerX - 30, VISUALS.PLATFORM_Y + VISUALS.PLATFORM_HEIGHT / 2);
    ctx.lineTo(centerX + 30, VISUALS.PLATFORM_Y + VISUALS.PLATFORM_HEIGHT / 2);
    ctx.stroke();

    // Circle around H
    ctx.beginPath();
    ctx.arc(centerX, VISUALS.PLATFORM_Y + VISUALS.PLATFORM_HEIGHT / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Edge lights
    ctx.fillStyle = EXTRACTION_COLORS.HELICOPTER;
    const lightCount = 8;
    for (let i = 0; i <= lightCount; i++) {
        const lightX = platformX + (i / lightCount) * VISUALS.PLATFORM_WIDTH;
        ctx.beginPath();
        ctx.arc(lightX, VISUALS.PLATFORM_Y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Border
    ctx.lineWidth = 2;
    ctx.strokeRect(platformX, VISUALS.PLATFORM_Y, VISUALS.PLATFORM_WIDTH, VISUALS.PLATFORM_HEIGHT);

    ctx.restore();
}

/**
 * Draw "LEGENDARY ASSET ACQUIRED" text.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} tank - Tank that was acquired
 * @param {number} alpha - Text alpha (0-1)
 */
function drawRevealText(ctx, tank, alpha) {
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const centerX = CANVAS.DESIGN_WIDTH / 2;

    // Main announcement
    ctx.shadowColor = EXTRACTION_COLORS.GLOW;
    ctx.shadowBlur = 30;
    ctx.fillStyle = EXTRACTION_COLORS.TEXT;
    ctx.font = 'bold 36px "Orbitron", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEGENDARY ASSET ACQUIRED', centerX, 180);

    // Tank name
    ctx.shadowColor = RARITY_COLORS[RARITY.LEGENDARY];
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px "Orbitron", "Arial Black", sans-serif';
    ctx.fillText(tank?.name || 'UNKNOWN', centerX, 250);

    // Tank description
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#888899';
    ctx.font = '18px "Orbitron", Arial, sans-serif';
    ctx.fillText(tank?.description || '', centerX, 300);

    // Rarity badge
    ctx.fillStyle = RARITY_COLORS[RARITY.LEGENDARY];
    ctx.font = 'bold 20px "Orbitron", Arial, sans-serif';
    ctx.fillText('LEGENDARY', centerX, 340);

    ctx.restore();
}

/**
 * Draw screen flash overlay.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} opacity - Flash opacity (0-1)
 */
function drawScreenFlash(ctx, opacity) {
    if (opacity <= 0) return;

    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
    ctx.restore();
}

/**
 * Draw dark overlay background.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} opacity - Overlay opacity
 */
function drawOverlay(ctx, opacity) {
    ctx.save();
    ctx.fillStyle = `rgba(10, 10, 26, ${opacity})`;
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
    ctx.restore();
}

// =============================================================================
// ANIMATION PHASES
// =============================================================================

/**
 * Update interference phase.
 * @param {number} phaseProgress - Progress through phase (0-1)
 * @param {number} deltaTime - Time since last update in ms
 */
function updateInterference(phaseProgress, deltaTime) {
    // Static builds up then fades
    if (phaseProgress < 0.3) {
        staticIntensity = phaseProgress / 0.3 * VISUALS.STATIC_INTENSITY;
    } else if (phaseProgress < 0.7) {
        staticIntensity = VISUALS.STATIC_INTENSITY;
        showTransmission = true;
    } else {
        staticIntensity = (1 - phaseProgress) / 0.3 * VISUALS.STATIC_INTENSITY;
    }

    transmissionFlicker += deltaTime / 1000;
}

/**
 * Update approach phase.
 * @param {number} phaseProgress - Progress through phase (0-1)
 * @param {number} deltaTime - Time since last update in ms
 */
function updateApproach(phaseProgress, deltaTime) {
    showTransmission = false;
    staticIntensity = 0;

    // Spotlight sweeps across screen first
    if (phaseProgress < 0.4) {
        const sweepProgress = phaseProgress / 0.4;
        spotlightX = VISUALS.SPOTLIGHT_START_X + sweepProgress * VISUALS.SPOTLIGHT_SWEEP_WIDTH;
    } else {
        // Spotlight centers, helicopter descends
        spotlightX = CANVAS.DESIGN_WIDTH / 2;
        const descendProgress = (phaseProgress - 0.4) / 0.6;
        heliY = VISUALS.HELI_START_Y + descendProgress * (VISUALS.HELI_END_Y - VISUALS.HELI_START_Y);
    }

    // Rotate rotor
    rotorAngle += deltaTime * VISUALS.ROTOR_SPEED;

    // Spawn wash particles when helicopter is visible
    if (heliY > 0) {
        spawnWashParticles(heliX, heliY);
    }
}

/**
 * Update delivery phase.
 * @param {number} phaseProgress - Progress through phase (0-1)
 * @param {number} deltaTime - Time since last update in ms
 */
function updateDelivery(phaseProgress, deltaTime) {
    // Continue rotor spin
    rotorAngle += deltaTime * VISUALS.ROTOR_SPEED;

    // Extend cable
    const targetCableLength = VISUALS.PLATFORM_Y - heliY - VISUALS.CABLE_START_Y - VISUALS.TANK_SIZE / 2;
    cableLength = phaseProgress * targetCableLength;

    // Swing motion
    cableSwing = Math.sin(phaseProgress * Math.PI * VISUALS.CABLE_SWING_FREQUENCY * 2) *
                 VISUALS.CABLE_SWING_AMPLITUDE * (1 - phaseProgress);

    // Tank touches down at end
    if (phaseProgress > 0.95) {
        tankLanded = true;
        cableSwing = 0;
    }

    // Continue wash particles
    spawnWashParticles(heliX, heliY);
}

/**
 * Update reveal phase.
 * @param {number} phaseProgress - Progress through phase (0-1)
 * @param {number} deltaTime - Time since last update in ms
 */
function updateReveal(phaseProgress, deltaTime) {
    // Continue rotor (helicopter stays)
    rotorAngle += deltaTime * VISUALS.ROTOR_SPEED;

    // Screen flash at start
    if (phaseProgress < 0.1) {
        flashOpacity = 1 - (phaseProgress / 0.1);
    } else {
        flashOpacity = 0;
    }

    // Text fades in
    if (phaseProgress < 0.3) {
        revealTextAlpha = phaseProgress / 0.3;
    } else {
        revealTextAlpha = 1;
    }

    // Cable retracts (helicopter lifts)
    if (phaseProgress > 0.5) {
        cableLength = Math.max(0, cableLength - deltaTime * 0.5);
    }
}

// =============================================================================
// MAIN ANIMATION LOOP
// =============================================================================

/**
 * Update the extraction animation.
 * @param {number} deltaTime - Time since last update in ms
 */
export function update(deltaTime) {
    if (!isPlaying) return;

    const now = performance.now();
    const elapsed = now - animationStartTime;

    // Update particles
    updateWashParticles(deltaTime);

    // Determine current phase based on elapsed time
    let accumulatedTime = 0;

    if (elapsed < (accumulatedTime += PHASE_TIMING.INTERFERENCE)) {
        if (currentPhase !== PHASES.INTERFERENCE) {
            currentPhase = PHASES.INTERFERENCE;
            phaseStartTime = now;
            debugLog('Phase: INTERFERENCE');
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.INTERFERENCE);
        updateInterference(progress, deltaTime);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.APPROACH)) {
        if (currentPhase !== PHASES.APPROACH) {
            currentPhase = PHASES.APPROACH;
            phaseStartTime = now;
            debugLog('Phase: APPROACH');
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.APPROACH);
        updateApproach(progress, deltaTime);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.DELIVERY)) {
        if (currentPhase !== PHASES.DELIVERY) {
            currentPhase = PHASES.DELIVERY;
            phaseStartTime = now;
            debugLog('Phase: DELIVERY');
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.DELIVERY);
        updateDelivery(progress, deltaTime);
    } else if (elapsed < (accumulatedTime += PHASE_TIMING.REVEAL)) {
        if (currentPhase !== PHASES.REVEAL) {
            currentPhase = PHASES.REVEAL;
            phaseStartTime = now;
            debugLog('Phase: REVEAL');
            // Trigger flash at reveal start
            flashOpacity = 1;
        }
        const phaseElapsed = now - phaseStartTime;
        const progress = Math.min(1, phaseElapsed / PHASE_TIMING.REVEAL);
        updateReveal(progress, deltaTime);
    } else {
        if (currentPhase !== PHASES.COMPLETE) {
            currentPhase = PHASES.COMPLETE;
            debugLog('Phase: COMPLETE');
            complete();
        }
    }
}

/**
 * Render the extraction animation.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function render(ctx) {
    if (!isPlaying && currentPhase !== PHASES.REVEAL) return;

    // Dark background
    drawOverlay(ctx, 0.9);

    // Phase-specific rendering
    switch (currentPhase) {
        case PHASES.INTERFERENCE:
            drawStatic(ctx, staticIntensity);
            if (showTransmission) {
                drawTransmissionText(ctx, transmissionFlicker);
            }
            break;

        case PHASES.APPROACH:
            drawFogLayers(ctx, performance.now() / 1000);
            drawPlatform(ctx);
            drawSpotlightCone(ctx, spotlightX, heliY > 0 ? heliY : -100, 1);
            if (heliY > VISUALS.HELI_START_Y + 50) {
                drawHelicopter(ctx, heliX, heliY, rotorAngle);
            }
            renderWashParticles(ctx);
            break;

        case PHASES.DELIVERY:
            drawFogLayers(ctx, performance.now() / 1000);
            drawPlatform(ctx);
            drawSpotlightCone(ctx, heliX, heliY, 1);
            drawCableAndTank(ctx, heliX, heliY, cableLength, cableSwing, revealTank, tankLanded);
            drawHelicopter(ctx, heliX, heliY, rotorAngle);
            renderWashParticles(ctx);
            break;

        case PHASES.REVEAL:
            drawFogLayers(ctx, performance.now() / 1000);
            drawPlatform(ctx);
            drawSpotlightCone(ctx, heliX, heliY, 1);

            // Tank on ground
            if (tankLanded && revealTank) {
                const tankX = CANVAS.DESIGN_WIDTH / 2;
                const tankY = VISUALS.PLATFORM_Y;

                ctx.save();
                const glowColor = revealTank.glowColor || RARITY_COLORS[RARITY.LEGENDARY];
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 50;
                ctx.fillStyle = '#1a1a2a';
                ctx.strokeStyle = glowColor;
                ctx.lineWidth = 3;

                const tankWidth = VISUALS.TANK_SIZE;
                const tankHeight = VISUALS.TANK_SIZE / 2;
                ctx.fillRect(tankX - tankWidth / 2, tankY - tankHeight, tankWidth, tankHeight);
                ctx.strokeRect(tankX - tankWidth / 2, tankY - tankHeight, tankWidth, tankHeight);

                // Turret
                ctx.beginPath();
                ctx.arc(tankX, tankY - tankHeight, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(tankX, tankY - tankHeight);
                ctx.lineTo(tankX + 35, tankY - tankHeight - 15);
                ctx.stroke();
                ctx.restore();
            } else {
                drawCableAndTank(ctx, heliX, heliY, cableLength, 0, revealTank, false);
            }

            drawHelicopter(ctx, heliX, heliY, rotorAngle);
            renderWashParticles(ctx);
            drawRevealText(ctx, revealTank, revealTextAlpha);
            break;
    }

    // Screen flash on top
    drawScreenFlash(ctx, flashOpacity);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Start the extraction animation.
 * @param {Object} tank - Tank to reveal (must be Legendary)
 * @param {Function} [onComplete] - Callback when animation completes
 */
export function play(tank, onComplete = null) {
    if (isPlaying) {
        debugLog('Animation already playing, ignoring play request');
        return;
    }

    if (!tank) {
        console.error('[ExtractionReveal] Cannot play animation without a tank');
        return;
    }

    if (tank.rarity !== RARITY.LEGENDARY) {
        console.warn('[ExtractionReveal] Extraction reveal is only for Legendary tanks');
        return;
    }

    debugLog('Starting extraction animation', { tank: tank.name });

    revealTank = tank;
    onCompleteCallback = onComplete;
    isPlaying = true;
    currentPhase = PHASES.INTERFERENCE;
    animationStartTime = performance.now();
    phaseStartTime = animationStartTime;

    // Reset state
    heliY = VISUALS.HELI_START_Y;
    heliX = CANVAS.DESIGN_WIDTH / 2;
    rotorAngle = 0;
    spotlightX = VISUALS.SPOTLIGHT_START_X;
    cableLength = 0;
    cableSwing = 0;
    tankLanded = false;
    staticIntensity = 0;
    showTransmission = false;
    transmissionFlicker = 0;
    washParticles = [];
    flashOpacity = 0;
    revealTextAlpha = 0;
}

/**
 * Complete the animation and call callback.
 */
function complete() {
    isPlaying = false;
    currentPhase = PHASES.IDLE;

    const callback = onCompleteCallback;
    const tank = revealTank;

    // Reset
    revealTank = null;
    onCompleteCallback = null;
    washParticles = [];

    debugLog('Animation complete', { tank: tank?.name });

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
 * Initialize the extraction reveal system.
 */
export function init() {
    if (isInitialized) {
        console.warn('[ExtractionReveal] Already initialized');
        return;
    }

    isInitialized = true;
    console.log('[ExtractionReveal] System initialized', {
        duration: TOTAL_DURATION + 'ms'
    });
}
