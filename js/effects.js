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
