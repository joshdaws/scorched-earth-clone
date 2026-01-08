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

// =============================================================================
// MANIFEST LOADING
// =============================================================================

/**
 * Load and parse the asset manifest.
 * @param {string} [path='assets/manifest.json'] - Path to manifest file
 * @returns {Promise<Object>} The parsed manifest
 */
export async function loadManifest(path = 'assets/manifest.json') {
    try {
        const response = await fetch(path);

        if (!response.ok) {
            throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
        }

        manifest = await response.json();
        console.log('Asset manifest loaded');
        return manifest;
    } catch (error) {
        console.error('Failed to load asset manifest:', error);
        throw error;
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
 * @param {Function} [onProgress] - Progress callback (loaded, total)
 * @returns {Promise<number>} Number of images loaded successfully
 */
export async function loadAllAssets(onProgress) {
    if (!manifest) {
        console.warn('Manifest not loaded. Call loadManifest() first.');
        return 0;
    }

    const entries = extractImageEntries(manifest);
    const total = entries.length;
    let loadedCount = 0;
    let successCount = 0;

    for (const entry of entries) {
        try {
            const img = await loadImage(entry.path);
            imageCache.set(entry.key, img);
            successCount++;
        } catch (error) {
            console.warn(`Failed to load asset '${entry.key}': ${error.message}`);
            // Store null for failed loads so get() can return null
            imageCache.set(entry.key, null);
        }

        loadedCount++;

        if (onProgress) {
            onProgress(loadedCount, total);
        }
    }

    loaded = true;
    console.log(`Assets loaded: ${successCount}/${total}`);
    return successCount;
}

/**
 * Load a single asset by its manifest key.
 * @param {string} key - Dot-notation key (e.g., 'tanks.player')
 * @returns {Promise<HTMLImageElement|null>} The loaded image or null
 */
export async function loadAsset(key) {
    // Already cached
    if (imageCache.has(key)) {
        return imageCache.get(key);
    }

    // Need manifest to find the path
    if (!manifest) {
        console.warn('Manifest not loaded. Call loadManifest() first.');
        return null;
    }

    // Navigate to the entry in manifest
    const parts = key.split('.');
    let current = manifest;

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            console.warn(`Asset not found in manifest: ${key}`);
            return null;
        }
    }

    if (!current || !current.path) {
        console.warn(`Invalid asset entry: ${key}`);
        return null;
    }

    // Load the image
    try {
        const img = await loadImage(`assets/${current.path}`);
        imageCache.set(key, img);
        return img;
    } catch (error) {
        console.warn(`Failed to load asset '${key}': ${error.message}`);
        imageCache.set(key, null);
        return null;
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
 * Clear the asset cache.
 */
export function clearCache() {
    imageCache.clear();
    loaded = false;
}
