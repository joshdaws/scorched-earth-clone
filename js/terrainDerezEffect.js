/**
 * Anchored terrain de-resolution effect.
 *
 * Explosion terrain samples become chunky neon pixels that glow and fade in
 * place. Particles are derived from destroyed heightmap columns so they stay
 * attached to the crater instead of drifting like a sprite overlay.
 */

import { GAMEPLAY_EVENTS, onGameplayEvent } from './gameplayEvents.js';

const DEFAULT_SAMPLE_STEP = 4;
const DEFAULT_MAX_SAMPLES = 120;
const DEFAULT_DURATION_MS = 820;
const MAX_ACTIVE_EFFECTS = 12;
const COLOR_SEQUENCE = ['#ff2a6d', '#00f5ff', '#f8ff4a', '#b967ff'];

const activeEffects = [];
let unsubscribeTerrainChanged = null;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function hash01(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

function getTerrainWidth(terrain) {
    return terrain?.getWidth?.() ?? terrain?.width ?? 0;
}

function getTerrainScreenHeight(terrain) {
    return terrain?.getScreenHeight?.() ?? terrain?.screenHeight ?? 0;
}

/**
 * Capture terrain columns before destruction so removed terrain can be rendered
 * as anchored particles after the heightmap mutates.
 *
 * @param {import('./terrain.js').Terrain} terrain
 * @param {number} centerX
 * @param {number} radius
 * @param {{sampleStep?: number, maxSamples?: number}} [options]
 * @returns {{centerX: number, radius: number, screenHeight: number, columns: Array<{x: number, height: number}>}|null}
 */
export function captureTerrainDerezSnapshot(terrain, centerX, radius, options = {}) {
    const width = getTerrainWidth(terrain);
    const screenHeight = getTerrainScreenHeight(terrain);
    if (!terrain || width <= 0 || screenHeight <= 0 || radius <= 0) return null;

    const sampleStep = Math.max(1, Math.floor(options.sampleStep ?? DEFAULT_SAMPLE_STEP));
    const maxSamples = Math.max(1, Math.floor(options.maxSamples ?? DEFAULT_MAX_SAMPLES));
    const startX = clamp(Math.floor(centerX - radius), 0, width - 1);
    const endX = clamp(Math.ceil(centerX + radius), 0, width - 1);
    const columns = [];

    for (let x = startX; x <= endX; x += sampleStep) {
        columns.push({
            x,
            height: terrain.getHeight(x)
        });
    }

    if (columns.length > maxSamples) {
        const stride = Math.ceil(columns.length / maxSamples);
        return {
            centerX,
            radius,
            screenHeight,
            columns: columns.filter((_, index) => index % stride === 0)
        };
    }

    return { centerX, radius, screenHeight, columns };
}

/**
 * Compare a pre-destruction snapshot with the current terrain and return
 * removed terrain samples suitable for de-res particles.
 *
 * @param {{screenHeight: number, columns: Array<{x: number, height: number}>}|null} snapshot
 * @param {import('./terrain.js').Terrain} terrain
 * @returns {Array<{x: number, y: number, depth: number}>}
 */
export function buildTerrainDerezSamples(snapshot, terrain) {
    if (!snapshot || !terrain) return [];

    const samples = [];
    for (const column of snapshot.columns) {
        const afterHeight = terrain.getHeight(column.x);
        const depth = column.height - afterHeight;
        if (depth <= 1) continue;

        const oldSurfaceY = snapshot.screenHeight - column.height;
        samples.push({
            x: column.x,
            y: oldSurfaceY + depth * 0.42,
            depth
        });
    }

    return samples;
}

/**
 * Spawn a terrain de-res effect from terrain samples.
 *
 * @param {{x: number, y: number, radius: number, samples: Array<{x: number, y: number, depth: number}>}} params
 */
export function spawnTerrainDerezEffect({ x, y, radius, samples }) {
    if (!Array.isArray(samples) || samples.length === 0) return;

    const particles = samples.map((sample, index) => {
        const seed = sample.x * 0.73 + sample.y * 1.91 + radius * 0.37 + index * 11.17;
        const jitterX = (hash01(seed) - 0.5) * 5;
        const jitterY = (hash01(seed + 5.31) - 0.5) * 7;
        const distance = Math.hypot(sample.x - x, sample.y - y);
        const distanceFactor = clamp(distance / Math.max(1, radius), 0, 1);
        const sizeSeed = hash01(seed + 2.7);
        const size = clamp(4 + sample.depth * 0.07 + sizeSeed * 4.5, 4, 11);

        return {
            x: sample.x + jitterX,
            y: sample.y + jitterY,
            size,
            delay: distanceFactor * 80 + hash01(seed + 9.2) * 45,
            lifetime: DEFAULT_DURATION_MS + hash01(seed + 13.4) * 220,
            color: COLOR_SEQUENCE[index % COLOR_SEQUENCE.length],
            pulse: hash01(seed + 17.8) * Math.PI * 2
        };
    });

    activeEffects.push({
        age: 0,
        radius,
        particles
    });

    while (activeEffects.length > MAX_ACTIVE_EFFECTS) {
        activeEffects.shift();
    }
}

/**
 * Subscribe to terrain-changed events and spawn de-res pixels for explosions.
 * Safe to call multiple times.
 */
export function registerTerrainDerezEventHandlers() {
    if (unsubscribeTerrainChanged) return;

    unsubscribeTerrainChanged = onGameplayEvent(GAMEPLAY_EVENTS.TERRAIN_CHANGED, payload => {
        if (payload?.source !== 'explosion') return;
        spawnTerrainDerezEffect({
            x: payload.x,
            y: payload.y,
            radius: payload.radius,
            samples: payload.destructionSamples
        });
    });
}

/**
 * Update active de-res effects.
 * @param {number} deltaTime
 */
export function updateTerrainDerezEffects(deltaTime) {
    for (const effect of activeEffects) {
        effect.age += deltaTime;
    }

    for (let i = activeEffects.length - 1; i >= 0; i--) {
        const effect = activeEffects[i];
        const longestLife = effect.particles.reduce((max, particle) => {
            return Math.max(max, particle.delay + particle.lifetime);
        }, 0);
        if (effect.age > longestLife) {
            activeEffects.splice(i, 1);
        }
    }
}

/**
 * Render anchored chunky neon pixels.
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderTerrainDerezEffects(ctx) {
    if (activeEffects.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const effect of activeEffects) {
        for (const particle of effect.particles) {
            const localAge = effect.age - particle.delay;
            if (localAge < 0 || localAge > particle.lifetime) continue;

            const progress = localAge / particle.lifetime;
            const fade = Math.pow(1 - progress, 1.35);
            const flashIn = clamp(localAge / 90, 0, 1);
            const alpha = Math.min(0.95, fade * flashIn);
            const scale = 1 + progress * 0.55;
            const size = particle.size * scale;
            const snapX = Math.round(particle.x - size / 2);
            const snapY = Math.round(particle.y - size / 2);

            ctx.globalAlpha = alpha * 0.22;
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(snapX - 1, snapY - 1, Math.ceil(size) + 2, Math.ceil(size) + 2);

            ctx.globalAlpha = alpha;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 10 + Math.sin(progress * Math.PI + particle.pulse) * 2;
            ctx.fillStyle = particle.color;
            ctx.fillRect(snapX, snapY, Math.ceil(size), Math.ceil(size));

            ctx.globalAlpha = alpha * 0.35;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(
                Math.round(particle.x - size * 0.18),
                Math.round(particle.y - size * 0.18),
                Math.max(1, Math.ceil(size * 0.36)),
                Math.max(1, Math.ceil(size * 0.36))
            );
        }
    }

    ctx.restore();
}

export function clearTerrainDerezEffects() {
    activeEffects.length = 0;
}

export function getTerrainDerezEffectCount() {
    return activeEffects.length;
}
