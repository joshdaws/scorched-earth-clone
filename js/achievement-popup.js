/**
 * Scorched Earth: Synthwave Edition
 * Achievement Popup Notification System
 *
 * Displays non-blocking popup notifications when achievements are unlocked.
 * Features slide-in/fade-out animations, queuing for multiple achievements,
 * and synthwave styling consistent with the game theme.
 */

import { CANVAS, COLORS, UI } from './constants.js';
import { onAchievementUnlock, getAchievement } from './achievements.js';
import * as Sound from './sound.js';

// =============================================================================
// POPUP CONFIGURATION
// =============================================================================

/**
 * Popup layout and animation configuration.
 */
const POPUP_CONFIG = {
    // Position (from top-right corner)
    MARGIN_RIGHT: 20,
    MARGIN_TOP: 20,

    // Dimensions
    WIDTH: 320,
    HEIGHT: 100,
    BORDER_RADIUS: 12,
    PADDING: 16,

    // Animation timing (in milliseconds)
    SLIDE_IN_DURATION: 300,
    HOLD_DURATION: 3000,
    FADE_OUT_DURATION: 500,
    QUEUE_STAGGER: 500,

    // Visual effects
    GLOW_INTENSITY: 12,
    STAR_SIZE: 24,

    // Category colors for accent
    CATEGORY_COLORS: {
        combat: COLORS.NEON_PINK,
        precision: COLORS.NEON_CYAN,
        weapon_mastery: COLORS.NEON_ORANGE,
        progression: COLORS.NEON_PURPLE,
        economy: COLORS.NEON_YELLOW,
        hidden: COLORS.NEON_PURPLE
    }
};

// =============================================================================
// POPUP STATE
// =============================================================================

/**
 * Active popup notifications.
 * @type {Array<PopupState>}
 */
const activePopups = [];

/**
 * Queue of pending achievement unlocks waiting to be displayed.
 * @type {Array<{achievement: Object, reward: number, specialReward: string|null}>}
 */
const pendingQueue = [];

/**
 * Whether the popup system is initialized.
 * @type {boolean}
 */
let isInitialized = false;

/**
 * Time of last popup spawn (for stagger timing).
 * @type {number}
 */
let lastPopupSpawnTime = 0;

/**
 * @typedef {Object} PopupState
 * @property {Object} achievement - Achievement definition
 * @property {number} reward - Token reward amount
 * @property {string|null} specialReward - Special reward type (e.g., 'tank_skin')
 * @property {number} startTime - Animation start timestamp
 * @property {string} phase - Current animation phase: 'slide_in' | 'hold' | 'fade_out'
 * @property {number} y - Current Y position for stacking
 */

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the achievement popup system.
 * Registers callback with achievement system to receive unlock notifications.
 */
export function init() {
    if (isInitialized) {
        return;
    }

    // Register for achievement unlock events
    onAchievementUnlock(handleAchievementUnlock);

    isInitialized = true;
    console.log('[AchievementPopup] System initialized');
}

/**
 * Handle achievement unlock event from achievements.js.
 * @param {Object} data - Unlock data
 * @param {Object} data.achievement - Achievement definition
 * @param {number} data.reward - Token reward
 * @param {string|null} data.specialReward - Special reward type
 */
function handleAchievementUnlock(data) {
    const { achievement, reward, specialReward } = data;

    // Add to pending queue
    pendingQueue.push({ achievement, reward, specialReward });

    // Try to spawn popup (respects stagger timing)
    trySpawnNextPopup();
}

// =============================================================================
// POPUP LIFECYCLE
// =============================================================================

/**
 * Attempt to spawn the next popup from the queue.
 * Respects stagger timing to prevent overlapping animations.
 */
function trySpawnNextPopup() {
    if (pendingQueue.length === 0) {
        return;
    }

    const now = performance.now();
    const timeSinceLastSpawn = now - lastPopupSpawnTime;

    // Respect stagger timing
    if (timeSinceLastSpawn < POPUP_CONFIG.QUEUE_STAGGER && activePopups.length > 0) {
        // Schedule retry after remaining stagger time
        setTimeout(trySpawnNextPopup, POPUP_CONFIG.QUEUE_STAGGER - timeSinceLastSpawn);
        return;
    }

    // Spawn next popup
    const data = pendingQueue.shift();
    spawnPopup(data.achievement, data.reward, data.specialReward);
    lastPopupSpawnTime = now;
}

/**
 * Spawn a new popup for an achievement unlock.
 * @param {Object} achievement - Achievement definition
 * @param {number} reward - Token reward
 * @param {string|null} specialReward - Special reward type
 */
function spawnPopup(achievement, reward, specialReward) {
    // Calculate Y position (stack below existing popups)
    const stackOffset = activePopups.length * (POPUP_CONFIG.HEIGHT + 10);
    const y = POPUP_CONFIG.MARGIN_TOP + stackOffset;

    const popup = {
        achievement,
        reward,
        specialReward,
        startTime: performance.now(),
        phase: 'slide_in',
        y
    };

    activePopups.push(popup);

    // Play achievement sound
    playAchievementSound();

    console.log(`[AchievementPopup] Showing: ${achievement.name}`);
}

/**
 * Play the achievement unlock sound.
 */
function playAchievementSound() {
    // Use procedural chime sound via Web Audio API
    if (!Sound.isInitialized()) {
        return;
    }

    const ctx = Sound.getContext();
    const sfxGain = Sound.getSfxGain();
    if (!ctx || !sfxGain) return;

    try {
        const now = ctx.currentTime;
        const volume = 0.4;

        // Create a bright, celebratory chime sound
        // Three ascending notes for "achievement unlocked" feel

        // Note 1: Base note (C5 = 523 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.6, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(sfxGain);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Note 2: Third above (E5 = 659 Hz), slightly delayed
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659, now + 0.08);
        gain2.gain.setValueAtTime(0, now + 0.08);
        gain2.gain.linearRampToValueAtTime(volume * 0.5, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(sfxGain);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.4);

        // Note 3: Fifth above (G5 = 784 Hz), more delayed
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(784, now + 0.16);
        gain3.gain.setValueAtTime(0, now + 0.16);
        gain3.gain.linearRampToValueAtTime(volume * 0.7, now + 0.18);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc3.connect(gain3);
        gain3.connect(sfxGain);
        osc3.start(now + 0.16);
        osc3.stop(now + 0.55);

        // Shimmer/sparkle effect using triangle wave
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(1568, now + 0.2); // G6, two octaves up
        shimmer.frequency.exponentialRampToValueAtTime(2093, now + 0.4); // C7
        shimmerGain.gain.setValueAtTime(0, now + 0.2);
        shimmerGain.gain.linearRampToValueAtTime(volume * 0.2, now + 0.25);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(sfxGain);
        shimmer.start(now + 0.2);
        shimmer.stop(now + 0.55);
    } catch (error) {
        console.warn('[AchievementPopup] Error playing sound:', error);
    }
}

// =============================================================================
// UPDATE & RENDER
// =============================================================================

/**
 * Update all active popups.
 * Call this once per frame from the game loop.
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
export function update(deltaTime) {
    const now = performance.now();

    // Update each popup's animation phase
    for (let i = activePopups.length - 1; i >= 0; i--) {
        const popup = activePopups[i];
        const elapsed = now - popup.startTime;

        if (popup.phase === 'slide_in') {
            if (elapsed >= POPUP_CONFIG.SLIDE_IN_DURATION) {
                popup.phase = 'hold';
                popup.startTime = now; // Reset for hold phase
            }
        } else if (popup.phase === 'hold') {
            if (elapsed >= POPUP_CONFIG.HOLD_DURATION) {
                popup.phase = 'fade_out';
                popup.startTime = now; // Reset for fade phase
            }
        } else if (popup.phase === 'fade_out') {
            if (elapsed >= POPUP_CONFIG.FADE_OUT_DURATION) {
                // Remove popup
                activePopups.splice(i, 1);
                // Try to spawn next queued popup
                trySpawnNextPopup();
            }
        }
    }

    // Update Y positions for stacking (in case popups were removed)
    for (let i = 0; i < activePopups.length; i++) {
        const targetY = POPUP_CONFIG.MARGIN_TOP + i * (POPUP_CONFIG.HEIGHT + 10);
        activePopups[i].y = targetY; // Could animate this for smoother stacking
    }
}

/**
 * Render all active popups.
 * Call this after rendering the game scene.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function render(ctx) {
    if (!ctx || activePopups.length === 0) {
        return;
    }

    const now = performance.now();

    for (const popup of activePopups) {
        renderPopup(ctx, popup, now);
    }
}

/**
 * Render a single popup notification.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {PopupState} popup - Popup state
 * @param {number} now - Current timestamp
 */
function renderPopup(ctx, popup, now) {
    const elapsed = now - popup.startTime;
    const config = POPUP_CONFIG;

    // Calculate animation values
    let slideProgress = 1; // 0 = off-screen, 1 = fully visible
    let opacity = 1;

    if (popup.phase === 'slide_in') {
        slideProgress = easeOutCubic(Math.min(1, elapsed / config.SLIDE_IN_DURATION));
    } else if (popup.phase === 'fade_out') {
        const fadeProgress = Math.min(1, elapsed / config.FADE_OUT_DURATION);
        opacity = 1 - easeInCubic(fadeProgress);
    }

    // Calculate position (slides in from right)
    const targetX = CANVAS.DESIGN_WIDTH - config.MARGIN_RIGHT - config.WIDTH;
    const offscreenX = CANVAS.DESIGN_WIDTH + 20;
    const x = offscreenX + (targetX - offscreenX) * slideProgress;
    const y = popup.y;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Get category color for accent
    const accentColor = config.CATEGORY_COLORS[popup.achievement.category] || COLORS.NEON_CYAN;

    // Draw popup background
    drawPopupBackground(ctx, x, y, config.WIDTH, config.HEIGHT, accentColor);

    // Draw content
    drawPopupContent(ctx, x, y, popup, accentColor);

    ctx.restore();
}

/**
 * Draw the popup background with synthwave styling.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Popup width
 * @param {number} height - Popup height
 * @param {string} accentColor - Accent color for glow
 */
function drawPopupBackground(ctx, x, y, width, height, accentColor) {
    const config = POPUP_CONFIG;

    // Dark translucent background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, config.BORDER_RADIUS);
    ctx.fill();

    // Glowing border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = config.GLOW_INTENSITY;
    ctx.stroke();

    // Inner subtle gradient overlay
    ctx.shadowBlur = 0;
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, `${accentColor}15`); // 8% opacity at top
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
}

/**
 * Draw the popup content (title, achievement name, description, reward).
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {PopupState} popup - Popup state
 * @param {string} accentColor - Accent color
 */
function drawPopupContent(ctx, x, y, popup, accentColor) {
    const config = POPUP_CONFIG;
    const padding = config.PADDING;
    const achievement = popup.achievement;

    // Header: Star icon + "ACHIEVEMENT UNLOCKED"
    const headerY = y + padding + 4;

    // Draw star icon
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 6;
    ctx.font = `bold ${config.STAR_SIZE}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('\u2605', x + padding, headerY - 4); // Unicode star

    // Header text
    ctx.shadowBlur = 4;
    ctx.shadowColor = accentColor;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
    ctx.fillText('ACHIEVEMENT UNLOCKED', x + padding + config.STAR_SIZE + 8, headerY);

    // Achievement name
    const nameY = headerY + 24;
    ctx.shadowBlur = 6;
    ctx.shadowColor = accentColor;
    ctx.fillStyle = accentColor;
    ctx.font = `bold 18px ${UI.FONT_FAMILY}`;
    ctx.fillText(achievement.name.toUpperCase(), x + padding, nameY);

    // Achievement description
    const descY = nameY + 22;
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `13px ${UI.FONT_FAMILY}`;
    ctx.fillText(`"${achievement.description}"`, x + padding, descY);

    // Token reward (bottom right)
    if (popup.reward > 0) {
        const rewardX = x + config.WIDTH - padding;
        const rewardY = y + config.HEIGHT - padding - 4;

        ctx.shadowBlur = 4;
        ctx.shadowColor = COLORS.NEON_YELLOW;
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.fillText(`+${popup.reward} TOKENS`, rewardX, rewardY);
    } else if (popup.specialReward) {
        // Special reward (e.g., tank skin)
        const rewardX = x + config.WIDTH - padding;
        const rewardY = y + config.HEIGHT - padding - 4;

        ctx.shadowBlur = 4;
        ctx.shadowColor = COLORS.NEON_PURPLE;
        ctx.fillStyle = COLORS.NEON_PURPLE;
        ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.fillText('+ TANK SKIN UNLOCKED!', rewardX, rewardY);
    }

    // Reset text align
    ctx.textAlign = 'left';
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Ease-out cubic function for smooth slide-in animation.
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value (0-1)
 */
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease-in cubic function for smooth fade-out animation.
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value (0-1)
 */
function easeInCubic(t) {
    return t * t * t;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Manually trigger an achievement popup (for testing).
 * @param {string} achievementId - Achievement ID to show popup for
 */
export function showPopup(achievementId) {
    const achievement = getAchievement(achievementId);
    if (!achievement) {
        console.warn(`[AchievementPopup] Unknown achievement: ${achievementId}`);
        return;
    }

    handleAchievementUnlock({
        achievement,
        reward: achievement.tokenReward,
        specialReward: achievement.specialReward
    });
}

/**
 * Check if there are any active popups.
 * @returns {boolean} True if popups are being displayed
 */
export function hasActivePopups() {
    return activePopups.length > 0 || pendingQueue.length > 0;
}

/**
 * Get the number of active popups.
 * @returns {number} Number of active popups
 */
export function getActivePopupCount() {
    return activePopups.length;
}

/**
 * Clear all active popups (for game reset).
 */
export function clearAll() {
    activePopups.length = 0;
    pendingQueue.length = 0;
}
