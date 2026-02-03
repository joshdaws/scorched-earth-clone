/**
 * Level layout baseline generation utilities.
 *
 * Shared by runtime fallback and baseline data generation scripts.
 */

import { CANVAS } from './constants.js';
import { LevelRegistry } from './levels.js';
import { generateTerrain } from './terrain.js';

export const DEFAULT_LEVEL_LAYOUT_SAMPLE_COUNT = 240;

export const DEFAULT_LEVEL_LAYOUT_GLOBAL = {
    playerAnchorXNorm: 0.20,
    minSlingClearancePx: 220,
    autoFixRadiusPx: 90
};

const DEFAULT_TERRAIN_OPTIONS = {
    roughness: 0.5,
    minHeightPercent: 0.2,
    maxHeightPercent: 0.7
};

/**
 * Clamp a number to the [0, 1] range.
 * @param {number} value - Value to clamp
 * @returns {number}
 */
export function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

/**
 * Build a deterministic numeric seed from a level ID.
 * @param {string} levelId - Level ID (e.g. world1-level1)
 * @returns {number}
 */
export function createSeedFromLevelId(levelId) {
    const id = String(levelId || 'unknown-level');
    let hash = 2166136261;

    for (let i = 0; i < id.length; i++) {
        hash ^= id.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    // Keep it positive and non-zero for PRNG stability.
    return (hash >>> 0) || 1;
}

/**
 * Resample an array to a target size with linear interpolation.
 * @param {number[]} values - Source values
 * @param {number} targetCount - Desired output length
 * @returns {number[]}
 */
export function resampleArray(values, targetCount) {
    const source = Array.isArray(values) ? values : [];
    const count = Math.max(1, Math.floor(targetCount || 1));

    if (source.length === 0) {
        return new Array(count).fill(0);
    }

    if (source.length === 1) {
        return new Array(count).fill(source[0]);
    }

    if (source.length === count) {
        return [...source];
    }

    const result = new Array(count);
    const sourceMaxIndex = source.length - 1;

    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1);
        const sourceIndex = t * sourceMaxIndex;
        const left = Math.floor(sourceIndex);
        const right = Math.min(sourceMaxIndex, left + 1);
        const blend = sourceIndex - left;
        result[i] = source[left] * (1 - blend) + source[right] * blend;
    }

    return result;
}

/**
 * Sample a terrain into normalized height values.
 * @param {import('./terrain.js').Terrain} terrain - Terrain instance
 * @param {number} sampleCount - Number of samples
 * @param {number} [screenHeight] - Screen height used for normalization
 * @returns {number[]}
 */
export function sampleTerrainToNormalized(terrain, sampleCount, screenHeight = CANVAS.DESIGN_HEIGHT) {
    const safeSampleCount = Math.max(1, Math.floor(sampleCount || DEFAULT_LEVEL_LAYOUT_SAMPLE_COUNT));
    const width = terrain.getWidth();
    const height = screenHeight || terrain.getScreenHeight() || CANVAS.DESIGN_HEIGHT;

    if (width <= 1) {
        const onlyHeight = terrain.getHeight(0) / height;
        return new Array(safeSampleCount).fill(clamp01(onlyHeight));
    }

    const samples = new Array(safeSampleCount);

    for (let i = 0; i < safeSampleCount; i++) {
        const t = safeSampleCount === 1 ? 0 : i / (safeSampleCount - 1);
        const x = t * (width - 1);
        const normalizedHeight = terrain.getHeight(x) / height;
        samples[i] = clamp01(normalizedHeight);
    }

    return samples;
}

/**
 * Resolve terrain generation options from level metadata.
 * @param {string} levelId - Level ID
 * @param {object|null} levelData - Level definition
 * @param {number} height - Canvas height in pixels
 * @returns {{roughness: number, minHeightPercent: number, maxHeightPercent: number, seed: number}}
 */
function resolveTerrainOptions(levelId, levelData, height) {
    const resolvedHeight = Math.max(1, height || CANVAS.DESIGN_HEIGHT);
    const seed = createSeedFromLevelId(levelId);

    if (!levelData?.terrain) {
        return {
            ...DEFAULT_TERRAIN_OPTIONS,
            seed
        };
    }

    const terrainStyle = LevelRegistry.getTerrainStyle(levelData.terrain.style);

    return {
        roughness: terrainStyle.roughness,
        minHeightPercent: levelData.terrain.minHeight / resolvedHeight,
        maxHeightPercent: levelData.terrain.maxHeight / resolvedHeight,
        seed
    };
}

/**
 * Create a deterministic baseline slot layout for a level.
 * @param {string} levelId - Level ID
 * @param {object|null} [levelData] - Level metadata from LevelRegistry
 * @param {object} [options] - Optional configuration
 * @param {number} [options.sampleCount=240] - Terrain sample count
 * @param {number} [options.width=1200] - Terrain generation width
 * @param {number} [options.height=800] - Terrain generation height
 * @param {number} [options.enemyXNorm=0.8] - Default enemy X position
 * @returns {{terrainSamples: number[], enemyXNorm: number}}
 */
export function createBaselineSlotLayout(levelId, levelData = null, options = {}) {
    const sampleCount = Math.max(1, Math.floor(options.sampleCount || DEFAULT_LEVEL_LAYOUT_SAMPLE_COUNT));
    const width = Math.max(2, Math.floor(options.width || CANVAS.DESIGN_WIDTH));
    const height = Math.max(2, Math.floor(options.height || CANVAS.DESIGN_HEIGHT));
    const enemyXNorm = clamp01(typeof options.enemyXNorm === 'number' ? options.enemyXNorm : 0.80);

    const resolvedLevelData = levelData || LevelRegistry.getLevel(levelId);
    const terrainOptions = resolveTerrainOptions(levelId, resolvedLevelData, height);
    const terrain = generateTerrain(width, height, terrainOptions);

    return {
        terrainSamples: sampleTerrainToNormalized(terrain, sampleCount, height),
        enemyXNorm
    };
}
