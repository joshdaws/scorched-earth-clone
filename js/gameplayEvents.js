/**
 * Lightweight gameplay event bus.
 *
 * This keeps simulation moments decoupled from visual/audio/native side effects
 * as the impact and effects systems get split out of main.js.
 */

export const GAMEPLAY_EVENTS = Object.freeze({
    PROJECTILE_IMPACT: 'projectile:impact',
    PROJECTILE_IMPACT_RESOLVED: 'projectile:impact-resolved',
    TERRAIN_CHANGED: 'terrain:changed',
    TANK_DAMAGED: 'tank:damaged',
    ROUND_RESULT: 'round:result'
});

const listenersByType = new Map();

/**
 * Subscribe to a gameplay event.
 * @param {string} type - Event type.
 * @param {(payload: any) => void} listener - Event listener.
 * @returns {() => void} Unsubscribe function.
 */
export function onGameplayEvent(type, listener) {
    if (typeof type !== 'string' || type.length === 0) {
        throw new TypeError('Gameplay event type must be a non-empty string');
    }

    if (typeof listener !== 'function') {
        throw new TypeError('Gameplay event listener must be a function');
    }

    if (!listenersByType.has(type)) {
        listenersByType.set(type, new Set());
    }

    const listeners = listenersByType.get(type);
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            listenersByType.delete(type);
        }
    };
}

/**
 * Subscribe to a gameplay event once.
 * @param {string} type - Event type.
 * @param {(payload: any) => void} listener - Event listener.
 * @returns {() => void} Unsubscribe function.
 */
export function onceGameplayEvent(type, listener) {
    let unsubscribe = () => {};

    const wrapped = (payload) => {
        unsubscribe();
        listener(payload);
    };

    unsubscribe = onGameplayEvent(type, wrapped);
    return unsubscribe;
}

/**
 * Emit a gameplay event.
 * @param {string} type - Event type.
 * @param {any} [payload={}] - Event payload.
 * @returns {number} Number of listeners invoked.
 */
export function emitGameplayEvent(type, payload = {}) {
    const listeners = listenersByType.get(type);
    if (!listeners || listeners.size === 0) {
        return 0;
    }

    const snapshot = Array.from(listeners);

    for (const listener of snapshot) {
        try {
            listener(payload);
        } catch (error) {
            console.error(`[GameplayEvents] Listener failed for ${type}:`, error);
        }
    }

    return snapshot.length;
}

/**
 * Remove all listeners, or all listeners for one event type.
 * @param {string} [type] - Optional event type.
 */
export function clearGameplayEventListeners(type) {
    if (type === undefined) {
        listenersByType.clear();
        return;
    }

    listenersByType.delete(type);
}

/**
 * Get listener count for tests/debug overlays.
 * @param {string} type - Event type.
 * @returns {number}
 */
export function getGameplayEventListenerCount(type) {
    return listenersByType.get(type)?.size || 0;
}
