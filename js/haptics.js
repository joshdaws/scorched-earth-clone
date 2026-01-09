/**
 * Haptic Feedback Module for Scorched Earth: Synthwave Edition
 *
 * Provides tactile feedback on supported devices (iOS/Android via Capacitor).
 * Gracefully degrades on web browsers where haptics are not available.
 *
 * Uses the Capacitor Haptics plugin for native haptic feedback.
 */

/**
 * @typedef {'light' | 'medium' | 'heavy'} ImpactStyle
 * @typedef {'success' | 'warning' | 'error'} NotificationStyle
 */

// Capacitor Haptics reference - loaded dynamically
let HapticsPlugin = null;
let hapticsAvailable = false;

/**
 * Initialize the haptics system.
 * Must be called before using any haptic functions.
 * @returns {Promise<boolean>} Whether haptics are available
 */
export async function initHaptics() {
    try {
        // Check if Capacitor is available
        if (typeof window !== 'undefined' && window.Capacitor) {
            const { Haptics } = await import('@capacitor/haptics');
            HapticsPlugin = Haptics;
            hapticsAvailable = true;
            console.log('[Haptics] Initialized successfully');
            return true;
        }
    } catch (error) {
        console.log('[Haptics] Not available:', error.message);
    }

    hapticsAvailable = false;
    return false;
}

/**
 * Check if haptics are available on this device.
 * @returns {boolean} True if haptic feedback is available
 */
export function isHapticsAvailable() {
    return hapticsAvailable;
}

/**
 * Trigger a simple haptic "click" - the lightest feedback.
 * Use for UI interactions like button presses.
 */
export async function hapticClick() {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        await HapticsPlugin.impact({ style: 'light' });
    } catch (error) {
        // Silently fail - haptics are optional
    }
}

/**
 * Trigger an impact haptic with specified intensity.
 * @param {ImpactStyle} style - 'light', 'medium', or 'heavy'
 */
export async function hapticImpact(style = 'medium') {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        await HapticsPlugin.impact({ style });
    } catch (error) {
        // Silently fail
    }
}

/**
 * Trigger a notification-style haptic.
 * @param {NotificationStyle} type - 'success', 'warning', or 'error'
 */
export async function hapticNotification(type = 'success') {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        await HapticsPlugin.notification({ type });
    } catch (error) {
        // Silently fail
    }
}

/**
 * Trigger haptic feedback for an explosion based on blast radius.
 * Larger explosions trigger stronger feedback.
 * @param {number} blastRadius - The explosion's blast radius
 */
export async function hapticExplosion(blastRadius) {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        // Scale haptic intensity based on blast radius
        // Small explosions: light, Medium: medium, Large/Nuke: heavy
        let style = 'light';
        if (blastRadius >= 80) {
            style = 'heavy';
        } else if (blastRadius >= 40) {
            style = 'medium';
        }

        await HapticsPlugin.impact({ style });

        // For very large explosions (nukes), add a second delayed impact
        if (blastRadius >= 100) {
            setTimeout(async () => {
                try {
                    await HapticsPlugin.impact({ style: 'heavy' });
                } catch (e) { /* ignore */ }
            }, 100);
        }
    } catch (error) {
        // Silently fail
    }
}

/**
 * Trigger haptic feedback when firing a weapon.
 */
export async function hapticFire() {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        await HapticsPlugin.impact({ style: 'medium' });
    } catch (error) {
        // Silently fail
    }
}

/**
 * Trigger haptic feedback for tank damage.
 * @param {number} damagePercent - Damage as percentage of max health (0-100)
 */
export async function hapticDamage(damagePercent) {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        // Heavy damage gets strong feedback
        if (damagePercent >= 50) {
            await HapticsPlugin.notification({ type: 'error' });
        } else if (damagePercent >= 20) {
            await HapticsPlugin.notification({ type: 'warning' });
        } else {
            await HapticsPlugin.impact({ style: 'light' });
        }
    } catch (error) {
        // Silently fail
    }
}

/**
 * Trigger haptic feedback for victory.
 */
export async function hapticVictory() {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        await HapticsPlugin.notification({ type: 'success' });
    } catch (error) {
        // Silently fail
    }
}

/**
 * Trigger haptic feedback for defeat.
 */
export async function hapticDefeat() {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        await HapticsPlugin.notification({ type: 'error' });
    } catch (error) {
        // Silently fail
    }
}

/**
 * Trigger a selection change haptic (for aiming adjustments).
 */
export async function hapticSelectionChange() {
    if (!hapticsAvailable || !HapticsPlugin) return;

    try {
        await HapticsPlugin.selectionChanged();
    } catch (error) {
        // selectionChanged may not be available on all devices
        // Fall back to light impact
        try {
            await HapticsPlugin.impact({ style: 'light' });
        } catch (e) { /* ignore */ }
    }
}
