/**
 * Convex API Module
 *
 * Provides a wrapper for Convex backend communication.
 * Uses the ConvexHttpClient for non-reactive queries and mutations.
 */

// Convex deployment URL - hardcoded for vanilla JS without build process
// In production, this could be set via a config file or inline script
const CONVEX_URL = 'https://clean-avocet-794.convex.cloud';

// LocalStorage keys
const STORAGE_KEYS = {
    DEVICE_ID: 'scorched_earth_device_id',
    PLAYER_NAME: 'scorched_earth_player_name',
    OFFLINE_QUEUE: 'scorched_earth_offline_queue'
};

// Connection state
let client = null;
let isOnline = navigator.onLine;
let connectionError = null;
let deviceId = null;
let playerName = null;

// =============================================================================
// DEVICE ID MANAGEMENT
// =============================================================================

/**
 * Generate a UUID v4 for device identification
 */
function generateUUID() {
    // Use crypto.randomUUID if available (modern browsers)
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get or create the device ID
 */
function getDeviceId() {
    if (deviceId) return deviceId;

    deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
        console.log('[ConvexAPI] Generated new device ID:', deviceId);
    }
    return deviceId;
}

/**
 * Get stored player name
 */
function getStoredPlayerName() {
    if (playerName) return playerName;
    playerName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
    return playerName;
}

/**
 * Store player name locally
 */
function setStoredPlayerName(name) {
    playerName = name;
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
}

// =============================================================================
// OFFLINE DETECTION & QUEUE
// =============================================================================

/**
 * Check if we're currently online
 */
function checkOnline() {
    return isOnline && !connectionError;
}

/**
 * Get the offline action queue
 */
function getOfflineQueue() {
    try {
        const queue = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
        return queue ? JSON.parse(queue) : [];
    } catch (e) {
        console.error('[ConvexAPI] Failed to parse offline queue:', e);
        return [];
    }
}

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    maxAgeMs: 24 * 60 * 60 * 1000 // Discard actions older than 24 hours
};

/**
 * Add an action to the offline queue
 */
function queueOfflineAction(action) {
    const queue = getOfflineQueue();
    queue.push({
        ...action,
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: 0
    });
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    console.log('[ConvexAPI] Queued offline action:', action.type);
}

/**
 * Clear processed actions from queue
 */
function clearOfflineQueue() {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
}

/**
 * Calculate delay with exponential backoff
 * @param {number} retryCount - Number of previous retry attempts
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(retryCount) {
    const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount),
        RETRY_CONFIG.maxDelayMs
    );
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
}

/**
 * Process offline queue when connection is restored
 * Uses exponential backoff for failed operations
 */
async function processOfflineQueue() {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    console.log('[ConvexAPI] Processing offline queue:', queue.length, 'actions');

    const now = Date.now();
    const failedActions = [];
    const processedCount = { success: 0, failed: 0, skipped: 0, expired: 0 };

    for (const action of queue) {
        // Skip if action is too old
        if (now - action.timestamp > RETRY_CONFIG.maxAgeMs) {
            console.warn('[ConvexAPI] Discarding expired action:', action.type, 'age:', Math.round((now - action.timestamp) / 1000 / 60), 'min');
            processedCount.expired++;
            continue;
        }

        // Skip if not ready for retry yet (backoff period)
        if (action.nextRetryAt && now < action.nextRetryAt) {
            console.log('[ConvexAPI] Action not ready for retry yet:', action.type, 'wait:', Math.round((action.nextRetryAt - now) / 1000), 's');
            failedActions.push(action);
            processedCount.skipped++;
            continue;
        }

        // Skip if max retries exceeded
        if (action.retryCount >= RETRY_CONFIG.maxRetries) {
            console.error('[ConvexAPI] Max retries exceeded for action:', action.type, 'discarding');
            processedCount.failed++;
            continue;
        }

        try {
            switch (action.type) {
                case 'submit_score':
                    // For score submissions, server's score always wins (no conflict)
                    // We just submit and let the server handle deduplication
                    await submitScore(action.runStats);
                    break;
                case 'update_name':
                    await updatePlayerName(action.newName);
                    break;
                // Add more action types as needed
                default:
                    console.warn('[ConvexAPI] Unknown offline action type:', action.type);
            }
            processedCount.success++;
        } catch (e) {
            console.error('[ConvexAPI] Failed to process offline action:', action.type, e);

            // Update retry count and calculate next retry time
            const newRetryCount = (action.retryCount || 0) + 1;
            const backoffDelay = calculateBackoffDelay(newRetryCount);

            failedActions.push({
                ...action,
                retryCount: newRetryCount,
                nextRetryAt: now + backoffDelay,
                lastError: e.message
            });
            processedCount.failed++;
        }
    }

    console.log('[ConvexAPI] Queue processing complete:', processedCount);

    if (failedActions.length > 0) {
        localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(failedActions));

        // Schedule next retry attempt if there are actions waiting
        const nextRetryAction = failedActions.find(a => a.nextRetryAt);
        if (nextRetryAction && isOnline) {
            const waitTime = Math.max(0, nextRetryAction.nextRetryAt - Date.now());
            console.log('[ConvexAPI] Scheduling retry in', Math.round(waitTime / 1000), 'seconds');
            setTimeout(() => {
                if (isOnline) processOfflineQueue();
            }, waitTime);
        }
    } else {
        clearOfflineQueue();
    }
}

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

/**
 * Initialize the Convex client
 */
function initClient() {
    if (client) return client;

    // Check that the convex global is available (loaded from browser.bundle.js)
    if (typeof convex === 'undefined' || !convex.ConvexHttpClient) {
        console.error('[ConvexAPI] Convex library not loaded. Make sure browser.bundle.js is loaded first.');
        connectionError = new Error('Convex library not loaded');
        return null;
    }

    try {
        client = new convex.ConvexHttpClient(CONVEX_URL, {
            // Disable verbose logging in production
            logger: false
        });
        console.log('[ConvexAPI] Client initialized successfully');
        connectionError = null;
        return client;
    } catch (e) {
        console.error('[ConvexAPI] Failed to initialize client:', e);
        connectionError = e;
        return null;
    }
}

/**
 * Set up online/offline event listeners
 */
function setupNetworkListeners() {
    window.addEventListener('online', () => {
        console.log('[ConvexAPI] Network online');
        isOnline = true;
        connectionError = null;
        // Attempt to process any queued actions
        processOfflineQueue();
    });

    window.addEventListener('offline', () => {
        console.log('[ConvexAPI] Network offline');
        isOnline = false;
    });
}

// =============================================================================
// API WRAPPER FUNCTIONS
// =============================================================================

/**
 * Execute a query with error handling
 */
async function executeQuery(functionPath, args = {}) {
    if (!checkOnline()) {
        throw new Error('Offline - cannot execute query');
    }

    const c = initClient();
    if (!c) {
        throw new Error('Client not initialized');
    }

    try {
        // Using anyApi to call functions without generated types
        const result = await c.query(convex.anyApi[functionPath.split(':')[0]][functionPath.split(':')[1]], args);
        connectionError = null;
        return result;
    } catch (e) {
        console.error('[ConvexAPI] Query error:', functionPath, e);
        if (e.message?.includes('fetch') || e.message?.includes('network')) {
            connectionError = e;
        }
        throw e;
    }
}

/**
 * Execute a mutation with error handling
 */
async function executeMutation(functionPath, args = {}) {
    if (!checkOnline()) {
        throw new Error('Offline - cannot execute mutation');
    }

    const c = initClient();
    if (!c) {
        throw new Error('Client not initialized');
    }

    try {
        const result = await c.mutation(convex.anyApi[functionPath.split(':')[0]][functionPath.split(':')[1]], args);
        connectionError = null;
        return result;
    } catch (e) {
        console.error('[ConvexAPI] Mutation error:', functionPath, e);
        if (e.message?.includes('fetch') || e.message?.includes('network')) {
            connectionError = e;
        }
        throw e;
    }
}

// =============================================================================
// PLAYER API
// =============================================================================

/**
 * Get or create the player profile
 * Returns the player object or null if offline
 */
export async function ensurePlayer(displayName = null) {
    const id = getDeviceId();
    const name = displayName || getStoredPlayerName() || `Player_${id.substring(0, 8)}`;

    if (!checkOnline()) {
        console.log('[ConvexAPI] Offline - returning local player info');
        return {
            deviceId: id,
            displayName: name,
            _offline: true
        };
    }

    try {
        const player = await executeMutation('players:createPlayer', {
            deviceId: id,
            displayName: name,
            platform: detectPlatform()
        });

        if (player) {
            setStoredPlayerName(player.displayName);
        }

        return player;
    } catch (e) {
        console.error('[ConvexAPI] Failed to ensure player:', e);
        return {
            deviceId: id,
            displayName: name,
            _offline: true,
            _error: e.message
        };
    }
}

/**
 * Get player by device ID
 */
export async function getPlayer() {
    if (!checkOnline()) return null;

    const id = getDeviceId();
    try {
        return await executeQuery('players:getPlayer', { deviceId: id });
    } catch (e) {
        console.error('[ConvexAPI] Failed to get player:', e);
        return null;
    }
}

/**
 * Update player display name
 */
export async function updatePlayerName(newName) {
    const id = getDeviceId();
    setStoredPlayerName(newName);

    if (!checkOnline()) {
        console.log('[ConvexAPI] Offline - name stored locally');
        return { success: true, _offline: true };
    }

    try {
        await executeMutation('players:updateDisplayName', {
            deviceId: id,
            displayName: newName
        });
        return { success: true };
    } catch (e) {
        console.error('[ConvexAPI] Failed to update name:', e);
        return { success: false, error: e.message };
    }
}

// =============================================================================
// HIGH SCORES API
// =============================================================================

/**
 * Submit a score from a completed run
 */
export async function submitScore(runStats) {
    const id = getDeviceId();

    if (!checkOnline()) {
        // Queue for later
        queueOfflineAction({
            type: 'submit_score',
            runStats
        });
        return {
            success: true,
            _offline: true,
            _queued: true
        };
    }

    try {
        const result = await executeMutation('highScores:submitScore', {
            deviceId: id,
            runStats
        });
        return {
            success: true,
            ...result
        };
    } catch (e) {
        console.error('[ConvexAPI] Failed to submit score:', e);
        // Queue for retry if it was a network error
        if (e.message?.includes('fetch') || e.message?.includes('network')) {
            queueOfflineAction({
                type: 'submit_score',
                runStats
            });
            return {
                success: false,
                _queued: true,
                error: e.message
            };
        }
        return { success: false, error: e.message };
    }
}

/**
 * Get global leaderboard
 */
export async function getLeaderboard(limit = 100) {
    if (!checkOnline()) return null;

    try {
        return await executeQuery('highScores:getLeaderboard', { limit });
    } catch (e) {
        console.error('[ConvexAPI] Failed to get leaderboard:', e);
        return null;
    }
}

/**
 * Get player's scores
 */
export async function getPlayerScores(limit = 10) {
    if (!checkOnline()) return null;

    const id = getDeviceId();
    try {
        return await executeQuery('highScores:getPlayerScores', {
            deviceId: id,
            limit
        });
    } catch (e) {
        console.error('[ConvexAPI] Failed to get player scores:', e);
        return null;
    }
}

/**
 * Get player's rank on leaderboard
 */
export async function getPlayerRank() {
    if (!checkOnline()) return null;

    const id = getDeviceId();
    try {
        return await executeQuery('highScores:getPlayerRank', { deviceId: id });
    } catch (e) {
        console.error('[ConvexAPI] Failed to get player rank:', e);
        return null;
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Detect the current platform
 */
function detectPlatform() {
    // Check for iOS web view (Capacitor)
    if (window.Capacitor && window.Capacitor.getPlatform) {
        return window.Capacitor.getPlatform();
    }

    // Check user agent for mobile
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
        return 'ios';
    }
    if (/Android/.test(ua)) {
        return 'android';
    }

    return 'web';
}

/**
 * Get connection status for UI display
 */
export function getConnectionStatus() {
    return {
        isOnline: isOnline,
        hasError: !!connectionError,
        errorMessage: connectionError?.message || null,
        queuedActions: getOfflineQueue().length
    };
}

/**
 * Force retry connection (e.g., when user taps a "retry" button)
 */
export async function retryConnection() {
    connectionError = null;
    isOnline = navigator.onLine;

    if (isOnline) {
        await processOfflineQueue();
    }

    return checkOnline();
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the Convex API module
 * Call this early in the application lifecycle
 */
export async function init() {
    console.log('[ConvexAPI] Initializing...');

    // Set up network listeners
    setupNetworkListeners();

    // Ensure device ID exists
    getDeviceId();

    // Initialize client
    initClient();

    // Try to process any queued offline actions
    if (isOnline) {
        await processOfflineQueue();
    }

    console.log('[ConvexAPI] Initialized. Device ID:', deviceId, 'Online:', isOnline);

    return {
        deviceId,
        isOnline,
        hasStoredName: !!getStoredPlayerName()
    };
}

// Export storage keys for external use if needed
export { STORAGE_KEYS };

// Export the raw device ID getter
export { getDeviceId, getStoredPlayerName, setStoredPlayerName };
