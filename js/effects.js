/**
 * Scorched Earth: Synthwave Edition
 * Visual Effects Module - Particle System
 *
 * Implements explosion particles with synthwave aesthetics.
 * Particles expand outward from explosion center with gravity and fade effects.
 */

import { CANVAS, COLORS, PHYSICS } from './constants.js';
import { WeaponRegistry, WEAPON_TYPES } from './weapons.js';

// =============================================================================
// PARTICLE CONFIGURATION
// =============================================================================

/**
 * Particle system configuration.
 */
export const PARTICLE_CONFIG = {
    /** Minimum particles for smallest explosions (Basic Shot) */
    MIN_PARTICLES: 20,
    /** Maximum particles for largest explosions (Nuke) */
    MAX_PARTICLES: 100,
    /** Minimum particle lifetime in milliseconds */
    MIN_LIFETIME: 500,
    /** Maximum particle lifetime in milliseconds */
    MAX_LIFETIME: 1500,
    /** Minimum particle radius */
    MIN_SIZE: 2,
    /** Maximum particle radius */
    MAX_SIZE: 6,
    /** Gravity effect on particles (optional, lower than projectile gravity) */
    GRAVITY: 0.05,
    /** Initial velocity multiplier (based on blast radius) */
    VELOCITY_MULTIPLIER: 0.15,
    /** Air resistance/friction for particles */
    FRICTION: 0.98
};

/**
 * Synthwave color palette for particles.
 * Particles transition from white → yellow → pink during their lifetime.
 */
const PARTICLE_COLORS = {
    /** Initial color (bright white/yellow) */
    START: { r: 255, g: 255, b: 255 },
    /** Mid-life color (neon yellow) */
    MIDDLE: { r: 249, g: 240, b: 2 },
    /** End color (neon pink) */
    END: { r: 255, g: 42, b: 109 }
};

/**
 * Nuclear explosion particle colors - more orange/red tones.
 */
const NUCLEAR_PARTICLE_COLORS = {
    START: { r: 255, g: 255, b: 200 },
    MIDDLE: { r: 255, g: 150, b: 50 },
    END: { r: 255, g: 50, b: 20 }
};

// =============================================================================
// PARTICLE CLASS
// =============================================================================

/**
 * Individual particle for explosion effects.
 * Each particle has position, velocity, lifetime, color, and size properties.
 */
export class Particle {
    /**
     * Create a new particle.
     * @param {Object} options - Particle initialization options
     * @param {number} options.x - Starting X position (explosion center)
     * @param {number} options.y - Starting Y position (explosion center)
     * @param {number} options.vx - Initial horizontal velocity
     * @param {number} options.vy - Initial vertical velocity
     * @param {number} options.lifetime - Total lifetime in milliseconds
     * @param {number} options.size - Particle radius in pixels
     * @param {boolean} [options.isNuclear=false] - Whether this is from a nuclear explosion
     */
    constructor(options) {
        const {
            x,
            y,
            vx,
            vy,
            lifetime,
            size,
            isNuclear = false
        } = options;

        /** Current X position */
        this.x = x;

        /** Current Y position */
        this.y = y;

        /** Horizontal velocity (pixels per frame) */
        this.vx = vx;

        /** Vertical velocity (pixels per frame) */
        this.vy = vy;

        /** Total lifetime in milliseconds */
        this.lifetime = lifetime;

        /** Time remaining in milliseconds */
        this.remainingLife = lifetime;

        /** Particle radius in pixels */
        this.size = size;

        /** Original size (for shrinking effect) */
        this.originalSize = size;

        /** Whether this is from a nuclear explosion (affects color palette) */
        this.isNuclear = isNuclear;

        /** Whether this particle is still active */
        this.active = true;
    }

    /**
     * Update particle physics and lifetime.
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.active) return;

        // Update lifetime
        this.remainingLife -= deltaTime;
        if (this.remainingLife <= 0) {
            this.active = false;
            return;
        }

        // Convert deltaTime to frame-based physics (assuming 60fps)
        const timeScale = deltaTime / 16.67;

        // Apply friction
        this.vx *= Math.pow(PARTICLE_CONFIG.FRICTION, timeScale);
        this.vy *= Math.pow(PARTICLE_CONFIG.FRICTION, timeScale);

        // Apply gravity
        this.vy += PARTICLE_CONFIG.GRAVITY * timeScale;

        // Update position
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;

        // Shrink particle over lifetime
        const lifeProgress = 1 - (this.remainingLife / this.lifetime);
        this.size = this.originalSize * (1 - lifeProgress * 0.5);

        // Deactivate if too small
        if (this.size < 0.5) {
            this.active = false;
        }
    }

    /**
     * Get the current color of the particle based on lifetime progress.
     * Transitions from white → yellow → pink (or orange → red for nuclear).
     * @returns {{r: number, g: number, b: number, a: number}} RGBA color values
     */
    getColor() {
        const lifeProgress = 1 - (this.remainingLife / this.lifetime);
        const colors = this.isNuclear ? NUCLEAR_PARTICLE_COLORS : PARTICLE_COLORS;

        let r, g, b;

        if (lifeProgress < 0.5) {
            // First half: START → MIDDLE
            const t = lifeProgress * 2;
            r = Math.round(colors.START.r + (colors.MIDDLE.r - colors.START.r) * t);
            g = Math.round(colors.START.g + (colors.MIDDLE.g - colors.START.g) * t);
            b = Math.round(colors.START.b + (colors.MIDDLE.b - colors.START.b) * t);
        } else {
            // Second half: MIDDLE → END
            const t = (lifeProgress - 0.5) * 2;
            r = Math.round(colors.MIDDLE.r + (colors.END.r - colors.MIDDLE.r) * t);
            g = Math.round(colors.MIDDLE.g + (colors.END.g - colors.MIDDLE.g) * t);
            b = Math.round(colors.MIDDLE.b + (colors.END.b - colors.MIDDLE.b) * t);
        }

        // Alpha fades out over lifetime
        const alpha = 1 - lifeProgress;

        return { r, g, b, a: alpha };
    }

    /**
     * Check if the particle is still active.
     * @returns {boolean} True if particle is active
     */
    isActive() {
        return this.active;
    }
}

// =============================================================================
// PARTICLE SYSTEM
// =============================================================================

/**
 * Manages all active particles in the game.
 * Handles spawning, updating, rendering, and cleanup of particles.
 */
class ParticleSystem {
    constructor() {
        /** @type {Particle[]} Array of active particles */
        this.particles = [];
    }

    /**
     * Spawn explosion particles at a position.
     * Particle count and velocity scale with blast radius.
     *
     * @param {number} x - Explosion center X position
     * @param {number} y - Explosion center Y position
     * @param {number} blastRadius - Explosion blast radius (determines particle count and speed)
     * @param {boolean} [isNuclear=false] - Whether this is a nuclear explosion
     */
    spawnExplosion(x, y, blastRadius, isNuclear = false) {
        // Calculate particle count based on blast radius
        // Small explosions (30px): ~20 particles
        // Large explosions (150px): ~100 particles
        const radiusRatio = Math.min(blastRadius / 150, 1);
        const particleCount = Math.round(
            PARTICLE_CONFIG.MIN_PARTICLES +
            (PARTICLE_CONFIG.MAX_PARTICLES - PARTICLE_CONFIG.MIN_PARTICLES) * radiusRatio
        );

        // Nuclear explosions get 50% more particles
        const finalCount = isNuclear ? Math.round(particleCount * 1.5) : particleCount;

        console.log(`Spawning ${finalCount} particles at (${x.toFixed(1)}, ${y.toFixed(1)}), radius=${blastRadius}, nuclear=${isNuclear}`);

        for (let i = 0; i < finalCount; i++) {
            // Random angle for outward expansion
            const angle = Math.random() * Math.PI * 2;

            // Random speed based on blast radius
            // Particles closer to max speed go further
            const speedMultiplier = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
            const baseSpeed = blastRadius * PARTICLE_CONFIG.VELOCITY_MULTIPLIER;
            const speed = baseSpeed * speedMultiplier;

            // Calculate velocity components
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - (Math.random() * speed * 0.3); // Slight upward bias

            // Random lifetime within range
            const lifetime = PARTICLE_CONFIG.MIN_LIFETIME +
                Math.random() * (PARTICLE_CONFIG.MAX_LIFETIME - PARTICLE_CONFIG.MIN_LIFETIME);

            // Random size with larger particles for nuclear
            const sizeRange = PARTICLE_CONFIG.MAX_SIZE - PARTICLE_CONFIG.MIN_SIZE;
            const baseSize = PARTICLE_CONFIG.MIN_SIZE + Math.random() * sizeRange;
            const size = isNuclear ? baseSize * 1.3 : baseSize;

            // Create and add particle
            const particle = new Particle({
                x,
                y,
                vx,
                vy,
                lifetime,
                size,
                isNuclear
            });

            this.particles.push(particle);
        }
    }

    /**
     * Spawn explosion particles for a specific weapon.
     * Automatically determines particle count and nuclear status from weapon data.
     *
     * @param {number} x - Explosion center X position
     * @param {number} y - Explosion center Y position
     * @param {string} weaponId - Weapon ID from registry
     */
    spawnWeaponExplosion(x, y, weaponId) {
        const weapon = WeaponRegistry.getWeapon(weaponId);
        if (!weapon) {
            // Default explosion if weapon not found
            this.spawnExplosion(x, y, 40, false);
            return;
        }

        const isNuclear = weapon.type === WEAPON_TYPES.NUCLEAR;
        this.spawnExplosion(x, y, weapon.blastRadius, isNuclear);
    }

    /**
     * Update all particles.
     * Removes inactive particles to maintain performance.
     *
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        // Update all particles
        for (const particle of this.particles) {
            particle.update(deltaTime);
        }

        // Remove inactive particles
        this.particles = this.particles.filter(p => p.isActive());
    }

    /**
     * Render all particles to the canvas.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     */
    render(ctx) {
        if (this.particles.length === 0) return;

        ctx.save();

        // Disable image smoothing for crisp pixel look
        ctx.imageSmoothingEnabled = false;

        for (const particle of this.particles) {
            if (!particle.isActive()) continue;

            const color = particle.getColor();

            // Draw particle as a glowing circle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

            // Create radial gradient for glow effect
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );

            // Bright center, fading to transparent edge
            gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`);
            gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a * 0.6})`);
            gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Get the current number of active particles.
     * Useful for debugging and performance monitoring.
     *
     * @returns {number} Number of active particles
     */
    getParticleCount() {
        return this.particles.length;
    }

    /**
     * Check if there are any active particles.
     *
     * @returns {boolean} True if there are active particles
     */
    hasActiveParticles() {
        return this.particles.length > 0;
    }

    /**
     * Clear all particles.
     * Call this when resetting the game or between rounds.
     */
    clear() {
        this.particles = [];
    }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global particle system instance.
 * Use this for all particle effects in the game.
 */
export const particleSystem = new ParticleSystem();

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Spawn explosion particles at a position.
 *
 * @param {number} x - Explosion center X position
 * @param {number} y - Explosion center Y position
 * @param {number} blastRadius - Explosion blast radius
 * @param {boolean} [isNuclear=false] - Whether this is a nuclear explosion
 */
export function spawnExplosionParticles(x, y, blastRadius, isNuclear = false) {
    particleSystem.spawnExplosion(x, y, blastRadius, isNuclear);
}

/**
 * Spawn explosion particles for a specific weapon.
 *
 * @param {number} x - Explosion center X position
 * @param {number} y - Explosion center Y position
 * @param {string} weaponId - Weapon ID from registry
 */
export function spawnWeaponExplosionParticles(x, y, weaponId) {
    particleSystem.spawnWeaponExplosion(x, y, weaponId);
}

/**
 * Update all particles in the system.
 *
 * @param {number} deltaTime - Time elapsed since last update in milliseconds
 */
export function updateParticles(deltaTime) {
    particleSystem.update(deltaTime);
}

/**
 * Render all particles to the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
export function renderParticles(ctx) {
    particleSystem.render(ctx);
}

/**
 * Clear all particles from the system.
 */
export function clearParticles() {
    particleSystem.clear();
}

/**
 * Get current particle count for debugging.
 *
 * @returns {number} Number of active particles
 */
export function getParticleCount() {
    return particleSystem.getParticleCount();
}

// =============================================================================
// TANK DESTRUCTION EXPLOSION
// =============================================================================

/**
 * Tank destruction explosion configuration.
 * Larger and more dramatic than weapon explosions.
 */
export const TANK_DESTRUCTION_CONFIG = {
    /** Blast radius equivalent for the destruction explosion */
    BLAST_RADIUS: 100,
    /** Screen shake intensity multiplier (compared to regular explosions) */
    SHAKE_MULTIPLIER: 1.5,
    /** Particle count multiplier (more particles than regular explosions) */
    PARTICLE_MULTIPLIER: 2.0,
    /** Flash duration in milliseconds */
    FLASH_DURATION: 200,
    /** Player tank destruction color (cyan) */
    PLAYER_COLOR: '#00fff7',
    /** Enemy tank destruction color (pink/magenta) */
    ENEMY_COLOR: '#ff00ff'
};

/**
 * Spawn a dramatic tank destruction explosion at the tank's position.
 * Includes particles, screen shake, and screen flash.
 *
 * @param {number} x - Tank X position (center)
 * @param {number} y - Tank Y position (center)
 * @param {'player'|'enemy'} team - Tank team for color selection
 */
export function spawnTankDestructionExplosion(x, y, team) {
    const color = team === 'player' ? TANK_DESTRUCTION_CONFIG.PLAYER_COLOR : TANK_DESTRUCTION_CONFIG.ENEMY_COLOR;

    // Spawn extra particles for dramatic effect
    // Use a larger blast radius and spawn multiple waves
    const baseRadius = TANK_DESTRUCTION_CONFIG.BLAST_RADIUS;

    // Main explosion particles (larger, more intense)
    particleSystem.spawnExplosion(x, y, baseRadius * TANK_DESTRUCTION_CONFIG.PARTICLE_MULTIPLIER, false);

    // Secondary inner explosion for added drama
    particleSystem.spawnExplosion(x, y, baseRadius * 0.5, false);

    // Strong screen shake
    const shakeRadius = baseRadius * TANK_DESTRUCTION_CONFIG.SHAKE_MULTIPLIER;
    screenShakeForBlastRadius(shakeRadius);

    // Screen flash with team color
    screenFlash(color, TANK_DESTRUCTION_CONFIG.FLASH_DURATION);

    console.log(`Tank destruction explosion at (${x.toFixed(1)}, ${y.toFixed(1)}) for ${team} team`);
}

// =============================================================================
// SCREEN SHAKE SYSTEM
// =============================================================================

/**
 * Screen shake configuration.
 * Maps blast radius to intensity and duration.
 */
export const SCREEN_SHAKE_CONFIG = {
    /** Minimum shake intensity in pixels (for smallest explosions) */
    MIN_INTENSITY: 2,
    /** Maximum shake intensity in pixels (for largest explosions) */
    MAX_INTENSITY: 20,
    /** Minimum shake duration in milliseconds */
    MIN_DURATION: 200,
    /** Maximum shake duration in milliseconds */
    MAX_DURATION: 500,
    /** Blast radius at which minimum shake occurs */
    MIN_BLAST_RADIUS: 20,
    /** Blast radius at which maximum shake occurs */
    MAX_BLAST_RADIUS: 150
};

/**
 * Screen shake effect state.
 * Tracks active shake with intensity decay over time.
 * @type {{active: boolean, intensity: number, startTime: number, duration: number}|null}
 */
let screenShakeState = null;

/**
 * Trigger a screen shake effect.
 * Intensity decays linearly over the duration.
 * New shakes replace existing shakes (no additive stacking).
 *
 * @param {number} intensity - Shake intensity in pixels (2-20 range recommended)
 * @param {number} duration - Shake duration in milliseconds (200-500 range recommended)
 */
export function screenShake(intensity, duration) {
    // Clamp intensity to valid range
    const clampedIntensity = Math.max(
        SCREEN_SHAKE_CONFIG.MIN_INTENSITY,
        Math.min(SCREEN_SHAKE_CONFIG.MAX_INTENSITY, intensity)
    );

    // Clamp duration to valid range
    const clampedDuration = Math.max(
        SCREEN_SHAKE_CONFIG.MIN_DURATION,
        Math.min(SCREEN_SHAKE_CONFIG.MAX_DURATION, duration)
    );

    screenShakeState = {
        active: true,
        intensity: clampedIntensity,
        startTime: performance.now(),
        duration: clampedDuration
    };

    console.log(`Screen shake: intensity=${clampedIntensity.toFixed(1)}px, duration=${clampedDuration}ms`);
}

/**
 * Trigger a screen shake based on weapon blast radius.
 * Automatically calculates appropriate intensity and duration.
 *
 * @param {number} blastRadius - Weapon blast radius in pixels
 */
export function screenShakeForBlastRadius(blastRadius) {
    // Calculate normalized position in blast radius range (0-1)
    const normalizedRadius = Math.max(0, Math.min(1,
        (blastRadius - SCREEN_SHAKE_CONFIG.MIN_BLAST_RADIUS) /
        (SCREEN_SHAKE_CONFIG.MAX_BLAST_RADIUS - SCREEN_SHAKE_CONFIG.MIN_BLAST_RADIUS)
    ));

    // Interpolate intensity based on blast radius
    const intensity = SCREEN_SHAKE_CONFIG.MIN_INTENSITY +
        normalizedRadius * (SCREEN_SHAKE_CONFIG.MAX_INTENSITY - SCREEN_SHAKE_CONFIG.MIN_INTENSITY);

    // Interpolate duration based on blast radius
    const duration = SCREEN_SHAKE_CONFIG.MIN_DURATION +
        normalizedRadius * (SCREEN_SHAKE_CONFIG.MAX_DURATION - SCREEN_SHAKE_CONFIG.MIN_DURATION);

    screenShake(intensity, duration);
}

/**
 * Get the current screen shake offset for rendering.
 * Returns {x, y} offset to apply to canvas translation.
 * The offset oscillates randomly within the current intensity range,
 * with intensity decaying over the shake duration.
 *
 * @returns {{x: number, y: number}} Shake offset in pixels
 */
export function getScreenShakeOffset() {
    if (!screenShakeState || !screenShakeState.active) {
        return { x: 0, y: 0 };
    }

    const elapsed = performance.now() - screenShakeState.startTime;
    if (elapsed > screenShakeState.duration) {
        // Shake complete - reset state and return zero offset
        screenShakeState = null;
        return { x: 0, y: 0 };
    }

    // Calculate decay progress (0 at start, 1 at end)
    const progress = elapsed / screenShakeState.duration;

    // Intensity decreases linearly over duration (smooth decay)
    const currentIntensity = screenShakeState.intensity * (1 - progress);

    // Random offset within intensity range (oscillating shake)
    const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
    const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;

    return { x: offsetX, y: offsetY };
}

/**
 * Check if a screen shake is currently active.
 *
 * @returns {boolean} True if shake is in progress
 */
export function isScreenShaking() {
    if (!screenShakeState || !screenShakeState.active) {
        return false;
    }

    const elapsed = performance.now() - screenShakeState.startTime;
    return elapsed <= screenShakeState.duration;
}

/**
 * Clear any active screen shake effect.
 * Use when resetting game state.
 */
export function clearScreenShake() {
    screenShakeState = null;
}

// =============================================================================
// SCREEN FLASH SYSTEM
// =============================================================================

/**
 * Screen flash configuration.
 */
export const SCREEN_FLASH_CONFIG = {
    /** Default flash duration in milliseconds */
    DEFAULT_DURATION: 300,
    /** Minimum flash duration in milliseconds */
    MIN_DURATION: 200,
    /** Maximum flash duration in milliseconds */
    MAX_DURATION: 400,
    /** Default flash color (white for nuclear explosions) */
    DEFAULT_COLOR: { r: 255, g: 255, b: 255 }
};

/**
 * Screen flash effect state.
 * Tracks active flash with color, duration, and timing.
 * @type {{active: boolean, color: {r: number, g: number, b: number}, startTime: number, duration: number}|null}
 */
let screenFlashState = null;

/**
 * Trigger a screen flash effect.
 * Flash starts at full opacity and fades to transparent.
 * New flashes replace existing flashes (no stacking).
 *
 * @param {string|{r: number, g: number, b: number}} color - Flash color as CSS string or RGB object
 * @param {number} duration - Flash duration in milliseconds (200-400ms recommended)
 */
export function screenFlash(color, duration) {
    // Parse color if provided as string (e.g., 'white', '#ffffff', 'rgb(255,255,255)')
    let parsedColor;
    if (typeof color === 'string') {
        // Handle common color names
        if (color === 'white') {
            parsedColor = { r: 255, g: 255, b: 255 };
        } else if (color === 'red') {
            parsedColor = { r: 255, g: 0, b: 0 };
        } else if (color === 'yellow') {
            parsedColor = { r: 255, g: 255, b: 0 };
        } else {
            // Default to white for unknown colors
            parsedColor = SCREEN_FLASH_CONFIG.DEFAULT_COLOR;
        }
    } else if (color && typeof color === 'object') {
        parsedColor = {
            r: color.r ?? 255,
            g: color.g ?? 255,
            b: color.b ?? 255
        };
    } else {
        parsedColor = SCREEN_FLASH_CONFIG.DEFAULT_COLOR;
    }

    // Clamp duration to valid range
    const clampedDuration = Math.max(
        SCREEN_FLASH_CONFIG.MIN_DURATION,
        Math.min(SCREEN_FLASH_CONFIG.MAX_DURATION, duration ?? SCREEN_FLASH_CONFIG.DEFAULT_DURATION)
    );

    screenFlashState = {
        active: true,
        color: parsedColor,
        startTime: performance.now(),
        duration: clampedDuration
    };

    console.log(`Screen flash: color=rgb(${parsedColor.r},${parsedColor.g},${parsedColor.b}), duration=${clampedDuration}ms`);
}

/**
 * Get the current screen flash info for rendering.
 * Returns color and alpha value to render as overlay.
 * Alpha decays smoothly from 0.9 to 0 over the flash duration.
 *
 * @returns {{color: {r: number, g: number, b: number}, alpha: number}|null} Flash info or null if no flash
 */
export function getScreenFlashInfo() {
    if (!screenFlashState || !screenFlashState.active) {
        return null;
    }

    const elapsed = performance.now() - screenFlashState.startTime;
    if (elapsed > screenFlashState.duration) {
        // Flash complete - reset state
        screenFlashState = null;
        return null;
    }

    // Calculate fade progress (0 at start, 1 at end)
    const progress = elapsed / screenFlashState.duration;

    // Smooth alpha decay using quadratic easing
    // Starts at 0.9 and fades to 0 (fast initial fade, then slower)
    const alpha = Math.pow(1 - progress, 2) * 0.9;

    return {
        color: screenFlashState.color,
        alpha: alpha
    };
}

/**
 * Render the screen flash effect to the canvas.
 * Covers the entire canvas with a colored overlay that fades out.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function renderScreenFlash(ctx, width, height) {
    const flashInfo = getScreenFlashInfo();
    if (!flashInfo) return;

    ctx.save();
    ctx.fillStyle = `rgba(${flashInfo.color.r}, ${flashInfo.color.g}, ${flashInfo.color.b}, ${flashInfo.alpha})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

/**
 * Check if a screen flash is currently active.
 *
 * @returns {boolean} True if flash is in progress
 */
export function isScreenFlashing() {
    if (!screenFlashState || !screenFlashState.active) {
        return false;
    }

    const elapsed = performance.now() - screenFlashState.startTime;
    return elapsed <= screenFlashState.duration;
}

/**
 * Clear any active screen flash effect.
 * Use when resetting game state.
 */
export function clearScreenFlash() {
    screenFlashState = null;
}

// =============================================================================
// SYNTHWAVE BACKGROUND SYSTEM
// =============================================================================

/**
 * Background configuration.
 * Defines the visual parameters for the synthwave background layers.
 */
export const BACKGROUND_CONFIG = {
    /** Y position of the horizon as percentage of canvas height */
    HORIZON_PERCENT: 0.55,
    /** Number of stars to render */
    STAR_COUNT: 80,
    /** Star twinkle animation speed (lower = slower) */
    TWINKLE_SPEED: 0.002,
    /** Sun radius in pixels */
    SUN_RADIUS: 100,
    /** Number of horizontal lines in the perspective grid */
    GRID_HORIZONTAL_LINES: 12,
    /** Number of vertical lines in the perspective grid */
    GRID_VERTICAL_LINES: 16,
    /** Number of mountain layers */
    MOUNTAIN_LAYERS: 3,
    /** Mountain base height range (min, max) as percentage of canvas height */
    MOUNTAIN_HEIGHT_RANGE: [0.08, 0.18]
};

/**
 * Pre-computed star positions for consistent rendering.
 * Generated once and reused for performance.
 * @type {Array<{x: number, y: number, size: number, brightness: number, twinkleOffset: number}>}
 */
let starCache = null;

/**
 * Pre-computed mountain silhouette data for consistent rendering.
 * @type {Array<Array<{x: number, y: number}>>}
 */
let mountainCache = null;

/**
 * Background animation time for twinkle effects.
 * @type {number}
 */
let backgroundAnimTime = 0;

/**
 * Initialize the background with cached star and mountain data.
 * Call this once at game start or when canvas dimensions change.
 *
 * @param {number} width - Canvas width (design coordinates)
 * @param {number} height - Canvas height (design coordinates)
 * @param {number} [seed=42] - Seed for deterministic star/mountain placement
 */
export function initBackground(width, height, seed = 42) {
    const horizonY = height * BACKGROUND_CONFIG.HORIZON_PERCENT;

    // Generate star positions
    starCache = generateStars(width, horizonY, seed);

    // Generate mountain silhouettes
    mountainCache = generateMountains(width, height, horizonY, seed + 1000);

    console.log(`Background initialized: ${starCache.length} stars, ${mountainCache.length} mountain layers`);
}

/**
 * Generate deterministic star positions.
 *
 * @param {number} width - Canvas width
 * @param {number} maxY - Maximum Y position for stars (horizon line)
 * @param {number} seed - Random seed
 * @returns {Array} Array of star data objects
 */
function generateStars(width, maxY, seed) {
    const stars = [];
    let s = seed;

    // Simple seeded random (mulberry32-like)
    const random = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };

    for (let i = 0; i < BACKGROUND_CONFIG.STAR_COUNT; i++) {
        stars.push({
            x: random() * width,
            y: random() * maxY * 0.85, // Stars in upper 85% of sky area
            size: 0.5 + random() * 1.5,
            brightness: 0.3 + random() * 0.7,
            twinkleOffset: random() * Math.PI * 2
        });
    }

    return stars;
}

/**
 * Generate mountain silhouette paths.
 * Creates multiple layers with decreasing height for depth.
 *
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} horizonY - Y position of horizon
 * @param {number} seed - Random seed
 * @returns {Array} Array of mountain layer point arrays
 */
function generateMountains(width, height, horizonY, seed) {
    const layers = [];
    let s = seed;

    const random = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };

    const [minHeightPct, maxHeightPct] = BACKGROUND_CONFIG.MOUNTAIN_HEIGHT_RANGE;

    for (let layer = 0; layer < BACKGROUND_CONFIG.MOUNTAIN_LAYERS; layer++) {
        const points = [];

        // Back layers are taller, front layers are shorter
        const layerFactor = 1 - (layer / BACKGROUND_CONFIG.MOUNTAIN_LAYERS);
        const baseHeight = height * (minHeightPct + (maxHeightPct - minHeightPct) * layerFactor);

        // Number of peaks varies by layer
        const numPeaks = 5 + layer * 2;
        const segmentWidth = width / numPeaks;

        // Start at bottom left
        points.push({ x: 0, y: horizonY });

        // Generate mountain peaks
        for (let i = 0; i <= numPeaks; i++) {
            const x = i * segmentWidth;
            const isPeak = i % 2 === 1;

            let y;
            if (isPeak) {
                // Peak - go up
                const peakHeight = baseHeight * (0.7 + random() * 0.6);
                y = horizonY - peakHeight;
            } else {
                // Valley - stay closer to horizon
                const valleyHeight = baseHeight * (0.1 + random() * 0.3);
                y = horizonY - valleyHeight;
            }

            points.push({ x, y });
        }

        // End at bottom right
        points.push({ x: width, y: horizonY });

        layers.push(points);
    }

    return layers;
}

/**
 * Update background animation state.
 * Call this each frame to animate star twinkle.
 *
 * @param {number} deltaTime - Time since last update in milliseconds
 */
export function updateBackground(deltaTime) {
    backgroundAnimTime += deltaTime * BACKGROUND_CONFIG.TWINKLE_SPEED;
}

/**
 * Render the complete synthwave background.
 * Renders layers in order: sky gradient → stars → sun → grid → mountains.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} width - Canvas width (design coordinates)
 * @param {number} height - Canvas height (design coordinates)
 */
export function renderBackground(ctx, width, height) {
    const horizonY = height * BACKGROUND_CONFIG.HORIZON_PERCENT;

    ctx.save();

    // Layer 1: Sky gradient (back-most layer)
    renderSkyGradient(ctx, width, height, horizonY);

    // Layer 2: Stars (in the sky portion)
    renderStars(ctx);

    // Layer 3: Synthwave sun at horizon
    renderSun(ctx, width, horizonY);

    // Layer 4: Mountain silhouettes (in front of sun)
    renderMountains(ctx, width, horizonY);

    // Layer 5: Perspective grid (ground, closest to viewer)
    renderGrid(ctx, width, height, horizonY);

    ctx.restore();
}

/**
 * Render the sky gradient.
 * Creates a sunset gradient from dark purple at top to orange/pink at horizon.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} horizonY - Y position of horizon
 */
function renderSkyGradient(ctx, width, height, horizonY) {
    // Sky gradient (dark purple top → orange/pink at horizon)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGradient.addColorStop(0, '#0a0a1a');      // Deep space blue-black
    skyGradient.addColorStop(0.3, '#1a0a2e');    // Dark purple
    skyGradient.addColorStop(0.55, '#2d1b4e');   // Mid purple
    skyGradient.addColorStop(0.75, '#4a1a5e');   // Brighter purple
    skyGradient.addColorStop(0.9, '#ff2a6d');    // Neon pink
    skyGradient.addColorStop(1, '#ff6b35');      // Orange at horizon

    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, horizonY);

    // Ground area (below horizon) - dark gradient
    const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
    groundGradient.addColorStop(0, '#1a0a2e');   // Purple at horizon
    groundGradient.addColorStop(0.3, '#0f0a1a'); // Dark purple
    groundGradient.addColorStop(1, '#0a0a1a');   // Near black at bottom

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizonY, width, height - horizonY);
}

/**
 * Render stars with twinkle effect.
 * Stars are rendered from the pre-computed cache.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderStars(ctx) {
    if (!starCache) return;

    for (const star of starCache) {
        // Calculate twinkle alpha using sine wave
        const twinkle = Math.sin(backgroundAnimTime + star.twinkleOffset);
        const alpha = star.brightness * (0.5 + twinkle * 0.5);

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Render the synthwave sun with horizontal slice lines.
 * The sun sits at the horizon with a gradient and horizontal scan lines.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} horizonY - Y position of horizon
 */
function renderSun(ctx, width, horizonY) {
    const sunX = width / 2;
    const sunY = horizonY;
    const sunRadius = BACKGROUND_CONFIG.SUN_RADIUS;

    ctx.save();

    // Clip to only draw top half of sun (semi-circle above horizon)
    ctx.beginPath();
    ctx.rect(0, 0, width, horizonY);
    ctx.clip();

    // Sun radial gradient
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGradient.addColorStop(0, '#ffff88');     // Bright yellow center
    sunGradient.addColorStop(0.3, '#ffcc44');   // Yellow-orange
    sunGradient.addColorStop(0.5, '#ff8844');   // Orange
    sunGradient.addColorStop(0.7, '#ff2a6d');   // Pink
    sunGradient.addColorStop(1, 'rgba(255, 42, 109, 0)'); // Fade to transparent

    // Draw sun glow (slightly larger for bloom effect)
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Draw main sun
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal slice lines (synthwave effect)
    // These create the "sliced" look of synthwave suns
    ctx.globalCompositeOperation = 'destination-out';

    const numSlices = 6;
    const sliceGap = sunRadius / (numSlices + 1);

    for (let i = 1; i <= numSlices; i++) {
        // Slices get thicker toward the bottom
        const sliceY = sunY - sunRadius + (i * sliceGap);
        const sliceHeight = 2 + (i * 0.5);

        // Only draw slices that are above horizon
        if (sliceY < horizonY) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(sunX - sunRadius, sliceY, sunRadius * 2, sliceHeight);
        }
    }

    ctx.restore();
}

/**
 * Render mountain silhouettes with neon edge highlights.
 * Back layers are darker, front layers have brighter edges.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} horizonY - Y position of horizon
 */
function renderMountains(ctx, width, horizonY) {
    if (!mountainCache) return;

    const numLayers = mountainCache.length;

    for (let layerIndex = 0; layerIndex < numLayers; layerIndex++) {
        const points = mountainCache[layerIndex];

        // Back layers are darker, front layers are lighter
        const depthFactor = layerIndex / (numLayers - 1);

        // Fill color: progressively lighter purple for front layers
        const fillR = Math.round(20 + depthFactor * 15);
        const fillG = Math.round(10 + depthFactor * 10);
        const fillB = Math.round(35 + depthFactor * 25);

        // Edge color: progressively brighter neon for front layers
        const edgeAlpha = 0.3 + depthFactor * 0.5;

        ctx.save();

        // Draw filled mountain silhouette
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        // Close to bottom
        ctx.lineTo(width, horizonY);
        ctx.lineTo(0, horizonY);
        ctx.closePath();

        ctx.fillStyle = `rgb(${fillR}, ${fillG}, ${fillB})`;
        ctx.fill();

        // Draw neon edge highlight (only on the mountain outline, not the bottom)
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length - 1; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        // Neon pink/purple edge glow
        ctx.strokeStyle = `rgba(211, 0, 197, ${edgeAlpha})`;
        ctx.lineWidth = 1 + depthFactor;
        ctx.shadowColor = '#d300c5';
        ctx.shadowBlur = 3 + depthFactor * 5;
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * Render the perspective grid on the ground.
 * Creates converging vertical lines and exponentially-spaced horizontal lines.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} horizonY - Y position of horizon
 */
function renderGrid(ctx, width, height, horizonY) {
    ctx.save();

    // Grid color with synthwave purple glow
    ctx.strokeStyle = 'rgba(211, 0, 197, 0.5)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#d300c5';
    ctx.shadowBlur = 3;

    const vanishingPointX = width / 2;
    const groundHeight = height - horizonY;

    // Horizontal lines (closer together near horizon, further apart at bottom)
    // Uses exponential spacing for perspective effect
    const numHorizontal = BACKGROUND_CONFIG.GRID_HORIZONTAL_LINES;
    for (let i = 1; i <= numHorizontal; i++) {
        const t = i / numHorizontal;
        // Exponential curve for perspective (closer lines near horizon)
        const y = horizonY + groundHeight * Math.pow(t, 1.8);

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Vertical lines (converge at vanishing point on horizon)
    const numVertical = BACKGROUND_CONFIG.GRID_VERTICAL_LINES;
    for (let i = 0; i <= numVertical; i++) {
        const t = i / numVertical;
        const bottomX = t * width;

        ctx.beginPath();
        ctx.moveTo(vanishingPointX, horizonY);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Clear cached background data.
 * Call this when resetting the game or changing canvas dimensions.
 */
export function clearBackground() {
    starCache = null;
    mountainCache = null;
    backgroundAnimTime = 0;
}

// =============================================================================
// CRT/SCANLINE EFFECTS
// =============================================================================

/**
 * CRT effect configuration.
 * Creates a retro VHS/CRT monitor look inspired by Far Cry Blood Dragon.
 * Enhanced from subtle to dramatic for full retro aesthetic.
 */
export const CRT_CONFIG = {
    // Scanlines - more visible for that classic CRT look
    SCANLINE_SPACING: 3,         // Pixels between scanlines (wider = more visible)
    SCANLINE_OPACITY: 0.25,      // Opacity of scanlines - was 0.10, now 0.25 for visibility
    SCANLINE_COLOR: '#000000',   // Scanline color (black)

    // Vignette (darker corners) - enhanced for dramatic effect
    VIGNETTE_INTENSITY: 0.55,    // How dark the corners get - was 0.35
    VIGNETTE_RADIUS: 0.65,       // Size of the vignette - was 0.75

    // Chromatic aberration (RGB color fringing) - enhanced
    CHROMATIC_ABERRATION_ENABLED: true,
    CHROMATIC_OFFSET: 3,         // Pixel offset - was 2
    CHROMATIC_ALPHA: 0.08,       // Aberration intensity - was 0.03

    // VHS noise/grain effect
    VHS_NOISE_ENABLED: true,
    VHS_NOISE_INTENSITY: 0.04,   // Noise grain opacity (0-1)
    VHS_NOISE_SCALE: 2,          // Noise pixel size

    // VHS tracking glitch effect
    VHS_GLITCH_ENABLED: true,
    VHS_GLITCH_CHANCE: 0.003,    // Chance per frame of glitch occurring
    VHS_GLITCH_MAX_OFFSET: 8,    // Max horizontal displacement in pixels
    VHS_GLITCH_HEIGHT: 4,        // Height of glitch band in pixels

    // Phosphor glow (slight bloom on bright areas)
    PHOSPHOR_GLOW_ENABLED: true,
    PHOSPHOR_GLOW_INTENSITY: 0.1,

    // Subtle CRT curvature simulation (via vignette gradient)
    CURVATURE_ENABLED: true
};

/**
 * VHS glitch state for animation
 */
let vhsGlitchState = {
    active: false,
    yOffset: 0,
    xDisplacement: 0,
    duration: 0,
    elapsed: 0
};

/**
 * CRT effects state
 */
let crtEnabled = true;

/**
 * Cached scanline pattern for performance
 * @type {CanvasPattern|null}
 */
let scanlinePattern = null;

/**
 * Canvas dimensions for pattern regeneration
 */
let patternWidth = 0;
let patternHeight = 0;

/**
 * Enable or disable CRT effects.
 * @param {boolean} enabled - Whether CRT effects should be rendered
 */
export function setCrtEnabled(enabled) {
    crtEnabled = enabled;
    console.log(`CRT effects ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if CRT effects are enabled.
 * @returns {boolean} True if CRT effects are enabled
 */
export function isCrtEnabled() {
    return crtEnabled;
}

/**
 * Toggle CRT effects on/off.
 * @returns {boolean} New enabled state
 */
export function toggleCrt() {
    crtEnabled = !crtEnabled;
    console.log(`CRT effects ${crtEnabled ? 'enabled' : 'disabled'}`);
    return crtEnabled;
}

/**
 * Initialize/regenerate the scanline pattern.
 * Called automatically when rendering if dimensions change.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function initScanlinePattern(ctx, width, height) {
    // Create a small canvas for the repeating pattern
    const patternCanvas = document.createElement('canvas');
    const patternCtx = patternCanvas.getContext('2d');

    // Pattern is 1 pixel wide, SCANLINE_SPACING pixels tall
    patternCanvas.width = 1;
    patternCanvas.height = CRT_CONFIG.SCANLINE_SPACING;

    // Clear (transparent)
    patternCtx.clearRect(0, 0, 1, CRT_CONFIG.SCANLINE_SPACING);

    // Draw single scanline (1 pixel tall)
    patternCtx.fillStyle = CRT_CONFIG.SCANLINE_COLOR;
    patternCtx.globalAlpha = CRT_CONFIG.SCANLINE_OPACITY;
    patternCtx.fillRect(0, 0, 1, 1);

    // Create repeating pattern
    scanlinePattern = ctx.createPattern(patternCanvas, 'repeat');
    patternWidth = width;
    patternHeight = height;
}

/**
 * Render scanlines overlay.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function renderScanlines(ctx, width, height) {
    // Regenerate pattern if dimensions changed
    if (!scanlinePattern || patternWidth !== width || patternHeight !== height) {
        initScanlinePattern(ctx, width, height);
    }

    ctx.save();
    ctx.fillStyle = scanlinePattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

/**
 * Render vignette effect (darker corners).
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function renderVignette(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate radius based on canvas diagonal
    const diagonal = Math.sqrt(width * width + height * height);
    const innerRadius = diagonal * CRT_CONFIG.VIGNETTE_RADIUS * 0.5;
    const outerRadius = diagonal * 0.75;

    ctx.save();

    // Create radial gradient from center (transparent) to edges (dark)
    const gradient = ctx.createRadialGradient(
        centerX, centerY, innerRadius,
        centerX, centerY, outerRadius
    );

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, `rgba(0, 0, 0, ${CRT_CONFIG.VIGNETTE_INTENSITY * 0.3})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${CRT_CONFIG.VIGNETTE_INTENSITY})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
}

/**
 * Render chromatic aberration effect.
 * This is a subtle RGB color fringing at the edges.
 * Note: This is a lightweight approximation - true chromatic aberration
 * would require reading and shifting pixel data.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function renderChromaticAberration(ctx, width, height) {
    if (!CRT_CONFIG.CHROMATIC_ABERRATION_ENABLED) return;

    const offset = CRT_CONFIG.CHROMATIC_OFFSET;
    const alpha = CRT_CONFIG.CHROMATIC_ALPHA;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    // Red channel offset (slight right/down shift at edges)
    const redGradient = ctx.createLinearGradient(0, 0, width, 0);
    redGradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
    redGradient.addColorStop(0.15, 'rgba(255, 0, 0, 0)');
    redGradient.addColorStop(0.85, 'rgba(255, 0, 0, 0)');
    redGradient.addColorStop(1, 'rgba(255, 0, 0, 0.6)');
    ctx.fillStyle = redGradient;
    ctx.fillRect(offset, 0, width, height);

    // Blue channel offset (slight left/up shift at edges)
    const blueGradient = ctx.createLinearGradient(0, 0, width, 0);
    blueGradient.addColorStop(0, 'rgba(0, 100, 255, 0.6)');
    blueGradient.addColorStop(0.15, 'rgba(0, 100, 255, 0)');
    blueGradient.addColorStop(0.85, 'rgba(0, 100, 255, 0)');
    blueGradient.addColorStop(1, 'rgba(0, 100, 255, 0.6)');
    ctx.fillStyle = blueGradient;
    ctx.fillRect(-offset, 0, width, height);

    ctx.restore();
}

/**
 * Render VHS noise/grain overlay.
 * Creates a subtle static grain effect.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function renderVhsNoise(ctx, width, height) {
    if (!CRT_CONFIG.VHS_NOISE_ENABLED) return;

    const scale = CRT_CONFIG.VHS_NOISE_SCALE;
    const intensity = CRT_CONFIG.VHS_NOISE_INTENSITY;

    ctx.save();
    ctx.globalAlpha = intensity;

    // Create noise using random rectangles
    // This is efficient and creates a grainy VHS look
    const cols = Math.ceil(width / scale);
    const rows = Math.ceil(height / scale);

    for (let y = 0; y < rows; y += 2) { // Skip every other row for performance
        for (let x = 0; x < cols; x += 2) { // Skip every other column
            if (Math.random() > 0.7) { // Only draw ~30% of pixels for subtle effect
                const gray = Math.floor(Math.random() * 80 + 40); // 40-120 gray values
                ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }

    ctx.restore();
}

/**
 * Update VHS glitch state for animation.
 * Called each frame to handle glitch timing.
 * @param {number} deltaTime - Time since last frame in ms
 */
function updateVhsGlitch(deltaTime) {
    if (!CRT_CONFIG.VHS_GLITCH_ENABLED) return;

    if (vhsGlitchState.active) {
        vhsGlitchState.elapsed += deltaTime;
        if (vhsGlitchState.elapsed >= vhsGlitchState.duration) {
            vhsGlitchState.active = false;
        }
    } else {
        // Random chance to start a new glitch
        if (Math.random() < CRT_CONFIG.VHS_GLITCH_CHANCE) {
            vhsGlitchState = {
                active: true,
                yOffset: Math.random() * 600, // Random vertical position
                xDisplacement: (Math.random() - 0.5) * 2 * CRT_CONFIG.VHS_GLITCH_MAX_OFFSET,
                duration: 50 + Math.random() * 100, // 50-150ms glitch duration
                elapsed: 0
            };
        }
    }
}

/**
 * Render VHS tracking glitch effect.
 * Creates horizontal displacement bands like VHS tracking errors.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function renderVhsGlitch(ctx, width, height) {
    if (!CRT_CONFIG.VHS_GLITCH_ENABLED || !vhsGlitchState.active) return;

    const { yOffset, xDisplacement } = vhsGlitchState;
    const glitchHeight = CRT_CONFIG.VHS_GLITCH_HEIGHT;

    ctx.save();

    // Draw glitch band (horizontal distortion)
    // This creates a subtle horizontal shift in a small band
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, yOffset, width, 2); // Thin white line

    // Additional chromatic shift in the glitch area
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ff0066';
    ctx.fillRect(xDisplacement, yOffset - glitchHeight / 2, width, glitchHeight);
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(-xDisplacement, yOffset + glitchHeight / 2, width, glitchHeight);

    ctx.restore();
}

/**
 * Render phosphor glow effect.
 * Adds a subtle bloom/glow to simulate CRT phosphor persistence.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function renderPhosphorGlow(ctx, width, height) {
    if (!CRT_CONFIG.PHOSPHOR_GLOW_ENABLED) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = CRT_CONFIG.PHOSPHOR_GLOW_INTENSITY;

    // Create a subtle overall glow by applying a light overlay
    // This simulates phosphor bleeding/persistence
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.6
    );
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.05)');
    gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.02)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
}

/**
 * Render all CRT effects as a post-processing overlay.
 * Call this AFTER all other rendering is complete.
 * Far Cry Blood Dragon / VHS inspired effects.
 *
 * When fullscreen parameters are provided, the CRT effects will cover the
 * entire viewport (including letterbox areas), not just the game content area.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Game content width (design coordinates)
 * @param {number} height - Game content height (design coordinates)
 * @param {Object} [fullscreenParams] - Optional params for full-viewport rendering
 * @param {number} fullscreenParams.viewportWidth - Full viewport width in CSS pixels
 * @param {number} fullscreenParams.viewportHeight - Full viewport height in CSS pixels
 * @param {number} fullscreenParams.dpr - Device pixel ratio
 */
export function renderCrtEffects(ctx, width, height, fullscreenParams = null) {
    if (!crtEnabled) return;

    // Update glitch animation state
    updateVhsGlitch(16.67); // Assume ~60fps for delta time

    let effectWidth = width;
    let effectHeight = height;

    // If fullscreen params provided, reset transform and use viewport dimensions
    if (fullscreenParams) {
        ctx.save();
        // Reset to identity transform (no scaling, no offset)
        ctx.setTransform(fullscreenParams.dpr, 0, 0, fullscreenParams.dpr, 0, 0);
        // Use viewport dimensions for effects
        effectWidth = fullscreenParams.viewportWidth;
        effectHeight = fullscreenParams.viewportHeight;
    }

    // Render effects in order (back to front)
    // 1. Phosphor glow (subtle bloom)
    renderPhosphorGlow(ctx, effectWidth, effectHeight);

    // 2. Chromatic aberration (RGB color fringing)
    renderChromaticAberration(ctx, effectWidth, effectHeight);

    // 3. VHS noise/grain
    renderVhsNoise(ctx, effectWidth, effectHeight);

    // 4. VHS tracking glitch
    renderVhsGlitch(ctx, effectWidth, effectHeight);

    // 5. Scanlines (horizontal lines)
    renderScanlines(ctx, effectWidth, effectHeight);

    // 6. Vignette (darker corners) - on top
    renderVignette(ctx, effectWidth, effectHeight);

    // Restore transform if we modified it
    if (fullscreenParams) {
        ctx.restore();
    }
}

/**
 * Clear CRT effect caches.
 * Call when canvas dimensions change significantly.
 */
export function clearCrtCache() {
    scanlinePattern = null;
    patternWidth = 0;
    patternHeight = 0;
}
