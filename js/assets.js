/**
 * Scorched Earth: Synthwave Edition
 * Asset Loader Module
 *
 * Loads images from manifest.json and provides cached access.
 * Audio assets are handled separately by sound.js.
 */

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {Object|null} Parsed manifest data */
let manifest = null;

/** @type {Map<string, HTMLImageElement>} Cache of loaded images */
const imageCache = new Map();

/** @type {boolean} Whether all assets have been loaded */
let loaded = false;

/** @type {number} Current loading progress (0-100) */
let loadingProgress = 0;

/** @type {number} Total assets to load */
let totalAssets = 0;

/** @type {number} Assets loaded so far */
let loadedAssets = 0;

// =============================================================================
// MANIFEST LOADING
// =============================================================================

/**
 * Load and parse the asset manifest.
 * Falls back to an empty manifest if loading fails.
 * @param {string} [path='assets/manifest.json'] - Path to manifest file
 * @returns {Promise<Object>} The parsed manifest or empty object
 */
export async function loadManifest(path = 'assets/manifest.json') {
    try {
        const response = await fetch(path);

        if (!response.ok) {
            console.warn(`Asset manifest not found (${response.status}), using empty manifest`);
            manifest = {};
            return manifest;
        }

        manifest = await response.json();
        console.log('Asset manifest loaded');
        return manifest;
    } catch (error) {
        console.warn('Failed to load asset manifest, using empty manifest:', error.message);
        manifest = {};
        return manifest;
    }
}

/**
 * Get the loaded manifest.
 * @returns {Object|null} The manifest or null if not loaded
 */
export function getManifest() {
    return manifest;
}

// =============================================================================
// PLACEHOLDER GENERATION
// =============================================================================

/**
 * Color palette for placeholder images based on asset category.
 * Colors are synthwave-themed for visual consistency.
 */
const PLACEHOLDER_COLORS = {
    tanks: '#ff00ff',      // Magenta
    projectiles: '#00ffff', // Cyan
    effects: '#ff6600',     // Orange
    ui: '#00ff88',          // Green
    backgrounds: '#6600ff', // Purple
    default: '#ff0088'      // Pink
};

/**
 * Generate a placeholder image for a missing asset.
 * Creates a colored rectangle with the asset key text.
 * @param {string} key - Asset key (e.g., 'tanks.player')
 * @param {Object} meta - Asset metadata (width, height, etc.)
 * @returns {HTMLImageElement} Generated placeholder image
 */
function createPlaceholder(key, meta) {
    const width = meta?.width || 64;
    const height = meta?.height || 64;

    // Create an offscreen canvas for the placeholder
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Determine color based on asset category
    const category = key.split('.')[0];
    const color = PLACEHOLDER_COLORS[category] || PLACEHOLDER_COLORS.default;

    // Fill background with color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // Add a border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Add diagonal lines to indicate placeholder
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.moveTo(width, 0);
    ctx.lineTo(0, height);
    ctx.stroke();

    // Add text label (shortened key)
    const label = key.split('.').pop() || '?';
    const fontSize = Math.min(12, Math.floor(width / 4));
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.substring(0, 8), width / 2, height / 2);

    // Convert canvas to image
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    img.width = width;
    img.height = height;

    return img;
}

// =============================================================================
// IMAGE LOADING
// =============================================================================

/**
 * Load a single image.
 * @param {string} path - Path to the image file
 * @returns {Promise<HTMLImageElement>} The loaded image
 */
function loadImage(path) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${path}`));

        img.src = path;
    });
}

/**
 * Recursively extract all image entries from manifest.
 * @param {Object} obj - Object to extract from
 * @param {string} prefix - Current path prefix
 * @returns {Array<{key: string, path: string, meta: Object}>} Array of image entries
 */
function extractImageEntries(obj, prefix = '') {
    const entries = [];

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        // Skip audio section entirely
        if (key === 'audio') continue;

        if (value && typeof value === 'object') {
            if (value.path && typeof value.path === 'string') {
                // This is an asset entry with a path
                // Only include if it's an image (has path ending in image extension)
                if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(value.path)) {
                    entries.push({
                        key: fullKey,
                        path: `assets/${value.path}`,
                        meta: value
                    });
                }
            } else {
                // This is a category, recurse into it
                entries.push(...extractImageEntries(value, fullKey));
            }
        }
    }

    return entries;
}

/**
 * Load all images from the manifest.
 * Missing assets are replaced with generated placeholders.
 * @param {Function} [onProgress] - Progress callback (loaded, total, percentage)
 * @returns {Promise<number>} Number of images loaded successfully (not including placeholders)
 */
export async function loadAllAssets(onProgress) {
    if (!manifest) {
        console.warn('Manifest not loaded. Call loadManifest() first.');
        loaded = true;
        loadingProgress = 100;
        return 0;
    }

    const entries = extractImageEntries(manifest);
    totalAssets = entries.length;
    loadedAssets = 0;
    loadingProgress = 0;
    let successCount = 0;
    let placeholderCount = 0;

    if (totalAssets === 0) {
        console.log('No assets to load');
        loaded = true;
        loadingProgress = 100;
        return 0;
    }

    console.log(`Loading ${totalAssets} assets...`);

    for (const entry of entries) {
        try {
            const img = await loadImage(entry.path);
            imageCache.set(entry.key, img);
            successCount++;
            console.log(`  ✓ ${entry.key}`);
        } catch (error) {
            // Generate placeholder for failed loads
            const placeholder = createPlaceholder(entry.key, entry.meta);
            imageCache.set(entry.key, placeholder);
            placeholderCount++;
            console.warn(`  ⚠ ${entry.key} (using placeholder)`);
        }

        loadedAssets++;
        loadingProgress = Math.round((loadedAssets / totalAssets) * 100);

        if (onProgress) {
            onProgress(loadedAssets, totalAssets, loadingProgress);
        }
    }

    loaded = true;
    console.log(`Asset loading complete: ${successCount} loaded, ${placeholderCount} placeholders`);
    return successCount;
}

/**
 * Load a single asset by its manifest key.
 * Falls back to placeholder if loading fails.
 * @param {string} key - Dot-notation key (e.g., 'tanks.player')
 * @returns {Promise<HTMLImageElement>} The loaded image or placeholder
 */
export async function loadAsset(key) {
    // Already cached
    if (imageCache.has(key)) {
        return imageCache.get(key);
    }

    // Need manifest to find the path
    if (!manifest) {
        console.warn('Manifest not loaded. Call loadManifest() first.');
        const placeholder = createPlaceholder(key, null);
        imageCache.set(key, placeholder);
        return placeholder;
    }

    // Navigate to the entry in manifest
    const parts = key.split('.');
    let current = manifest;

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            console.warn(`Asset not found in manifest: ${key}`);
            const placeholder = createPlaceholder(key, null);
            imageCache.set(key, placeholder);
            return placeholder;
        }
    }

    if (!current || !current.path) {
        console.warn(`Invalid asset entry: ${key}`);
        const placeholder = createPlaceholder(key, current);
        imageCache.set(key, placeholder);
        return placeholder;
    }

    // Load the image
    try {
        const img = await loadImage(`assets/${current.path}`);
        imageCache.set(key, img);
        return img;
    } catch (error) {
        console.warn(`Failed to load asset '${key}': ${error.message}, using placeholder`);
        const placeholder = createPlaceholder(key, current);
        imageCache.set(key, placeholder);
        return placeholder;
    }
}

// =============================================================================
// ASSET ACCESS
// =============================================================================

/**
 * Get a loaded asset by its manifest key.
 * @param {string} key - Dot-notation key (e.g., 'tanks.player')
 * @returns {HTMLImageElement|null} The image or null if not loaded/missing
 */
export function get(key) {
    return imageCache.get(key) || null;
}

/**
 * Get asset metadata from the manifest.
 * @param {string} key - Dot-notation key
 * @returns {Object|null} The metadata or null if not found
 */
export function getMeta(key) {
    if (!manifest) return null;

    const parts = key.split('.');
    let current = manifest;

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return null;
        }
    }

    return current || null;
}

/**
 * Check if an asset is loaded.
 * @param {string} key - Dot-notation key
 * @returns {boolean} True if asset is in cache (may be null if load failed)
 */
export function isLoaded(key) {
    return imageCache.has(key);
}

/**
 * Check if all assets have been loaded.
 * @returns {boolean} True if loadAllAssets has completed
 */
export function isFullyLoaded() {
    return loaded;
}

/**
 * Get the number of loaded assets.
 * @returns {number} Count of cached assets
 */
export function getLoadedCount() {
    return imageCache.size;
}

/**
 * Get the current loading progress as a percentage.
 * @returns {number} Progress percentage (0-100)
 */
export function getProgress() {
    return loadingProgress;
}

/**
 * Get detailed loading status.
 * @returns {{loaded: number, total: number, percentage: number, complete: boolean}}
 */
export function getLoadingStatus() {
    return {
        loaded: loadedAssets,
        total: totalAssets,
        percentage: loadingProgress,
        complete: loaded
    };
}

/**
 * Clear the asset cache.
 */
export function clearCache() {
    imageCache.clear();
    loaded = false;
    loadingProgress = 0;
    totalAssets = 0;
    loadedAssets = 0;
}
