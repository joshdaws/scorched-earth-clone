/**
 * Scorched Earth: Synthwave Edition
 * Engagement UI Screens
 *
 * UI components for daily rewards popup and challenge progress panel.
 * Uses synthwave styling with neon accents consistent with game theme.
 */

import * as Sound from '../sound.js';
import { getUIScale, scaled, isMobileDevice } from '../uiPosition.js';
import { getScreenWidth, getScreenHeight } from '../screenSize.js';
import {
    canClaim,
    claim,
    processRewards,
    getCurrentDay,
    getAllRewards,
    getStreak,
    getTimeUntilClaim,
    REWARD_TYPES
} from './dailyRewards.js';
import {
    getChallenges,
    areAllCompleted,
    isBonusClaimed,
    getBonusReward,
    getCompletionCounts,
    getTimeUntilRefresh,
    CHALLENGE_DIFFICULTY
} from './dailyChallenges.js';
import { addMoney } from '../money.js';
import { addTokens } from '../tokens.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Daily Rewards Popup
    POPUP: {
        WIDTH: 500,
        HEIGHT: 450,
        BORDER_RADIUS: 16,
        PADDING: 24,
        DAY_SLOT_SIZE: 56,
        DAY_SLOT_GAP: 8,
        CLAIM_BUTTON: {
            WIDTH: 180,
            HEIGHT: 50
        }
    },

    // Challenge Panel
    PANEL: {
        WIDTH: 400,
        HEIGHT: 380,
        BORDER_RADIUS: 12,
        PADDING: 20,
        CHALLENGE_HEIGHT: 80,
        CHALLENGE_GAP: 12,
        PROGRESS_BAR_HEIGHT: 8
    },

    // Colors (synthwave theme)
    COLORS: {
        OVERLAY: 'rgba(0, 0, 0, 0.85)',
        POPUP_BG: 'rgba(10, 10, 30, 0.98)',
        POPUP_BORDER: '#FF00FF',
        PANEL_BG: 'rgba(15, 15, 40, 0.95)',
        PANEL_BORDER: '#00FFFF',

        // Day slot colors
        DAY_INACTIVE: 'rgba(40, 40, 80, 0.6)',
        DAY_CLAIMED: '#10B981',
        DAY_CURRENT: '#FF00FF',
        DAY_FUTURE: 'rgba(60, 60, 100, 0.8)',

        // Challenge difficulty colors
        DIFFICULTY_EASY: '#10B981',
        DIFFICULTY_MEDIUM: '#F59E0B',
        DIFFICULTY_HARD: '#EF4444',

        // Progress bar
        PROGRESS_BG: 'rgba(40, 40, 80, 0.6)',
        PROGRESS_FILL: '#00FFFF',
        PROGRESS_COMPLETE: '#10B981',

        // Text
        TEXT_PRIMARY: '#FFFFFF',
        TEXT_SECONDARY: '#9CA3AF',
        TEXT_GOLD: '#F59E0B',
        TEXT_PINK: '#FF00FF',
        TEXT_CYAN: '#00FFFF',

        // Buttons
        BUTTON_ENABLED: '#FF00FF',
        BUTTON_DISABLED: '#374151',
        BUTTON_HOVER: '#FF66FF'
    },

    // Animation
    ANIMATION: {
        FADE_IN_DURATION: 300,
        PULSE_SPEED: 2,
        GLOW_INTENSITY: 15
    }
};

// =============================================================================
// MODULE STATE
// =============================================================================

const state = {
    // Daily rewards popup
    popupVisible: false,
    popupAnimationStart: 0,
    claimButtonHovered: false,
    justClaimed: false,
    claimedReward: null,

    // Challenge panel
    panelVisible: false,
    panelAnimationStart: 0,
    closeButtonHovered: false,

    // Shared
    animationTime: 0
};

// Callbacks for reward processing
let rewardCallbacks = {
    addMoney: null,
    addTokens: null,
    grantWeapon: null,
    grantRandomTank: null,
    grantSupplyDrop: null
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the engagement UI system.
 * @param {Object} callbacks - Callbacks for processing rewards
 */
export function init(callbacks = {}) {
    rewardCallbacks = {
        addMoney: callbacks.addMoney || ((amount) => addMoney(amount, 'daily_reward')),
        addTokens: callbacks.addTokens || ((amount) => addTokens(amount, 'daily_reward')),
        grantWeapon: callbacks.grantWeapon || null,
        grantRandomTank: callbacks.grantRandomTank || null,
        grantSupplyDrop: callbacks.grantSupplyDrop || null
    };

    console.log('[EngagementUI] Initialized');
}

// =============================================================================
// DAILY REWARDS POPUP
// =============================================================================

/**
 * Show the daily rewards popup.
 */
export function showDailyRewardsPopup() {
    state.popupVisible = true;
    state.popupAnimationStart = performance.now();
    state.justClaimed = false;
    state.claimedReward = null;
    console.log('[EngagementUI] Daily rewards popup shown');
}

/**
 * Hide the daily rewards popup.
 */
export function hideDailyRewardsPopup() {
    state.popupVisible = false;
    console.log('[EngagementUI] Daily rewards popup hidden');
}

/**
 * Check if daily rewards popup is visible.
 * @returns {boolean}
 */
export function isPopupVisible() {
    return state.popupVisible;
}

/**
 * Check if daily reward is claimable and should auto-show popup.
 * @returns {boolean}
 */
export function shouldShowDailyReward() {
    return canClaim();
}

/**
 * Render the daily rewards popup.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderDailyRewardsPopup(ctx) {
    if (!state.popupVisible) return;

    const scale = getUIScale();
    const screenWidth = getScreenWidth();
    const screenHeight = getScreenHeight();
    const mobile = isMobileDevice();

    // Calculate popup dimensions (smaller on mobile)
    const popupWidth = mobile ? Math.min(scaled(CONFIG.POPUP.WIDTH), screenWidth - 40) : scaled(CONFIG.POPUP.WIDTH);
    const popupHeight = mobile ? Math.min(scaled(CONFIG.POPUP.HEIGHT), screenHeight - 80) : scaled(CONFIG.POPUP.HEIGHT);
    const popupX = (screenWidth - popupWidth) / 2;
    const popupY = (screenHeight - popupHeight) / 2;

    // Animation progress
    const elapsed = performance.now() - state.popupAnimationStart;
    const fadeProgress = Math.min(1, elapsed / CONFIG.ANIMATION.FADE_IN_DURATION);

    ctx.save();
    ctx.globalAlpha = fadeProgress;

    // Overlay
    ctx.fillStyle = CONFIG.COLORS.OVERLAY;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // Popup glow
    const glowIntensity = CONFIG.ANIMATION.GLOW_INTENSITY;
    ctx.shadowColor = CONFIG.COLORS.POPUP_BORDER;
    ctx.shadowBlur = glowIntensity + Math.sin(state.animationTime * CONFIG.ANIMATION.PULSE_SPEED) * 5;

    // Popup background
    ctx.fillStyle = CONFIG.COLORS.POPUP_BG;
    roundRect(ctx, popupX, popupY, popupWidth, popupHeight, scaled(CONFIG.POPUP.BORDER_RADIUS));
    ctx.fill();

    // Popup border
    ctx.strokeStyle = CONFIG.COLORS.POPUP_BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    const padding = scaled(CONFIG.POPUP.PADDING);
    const contentX = popupX + padding;
    const contentY = popupY + padding;
    const contentWidth = popupWidth - padding * 2;

    // Title with emoji
    ctx.font = `bold ${scaled(24)}px "Press Start 2P", monospace`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_PINK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('DAILY REWARD!', popupX + popupWidth / 2, contentY);

    // 7-day track
    const daySlotSize = mobile ? scaled(40) : scaled(CONFIG.POPUP.DAY_SLOT_SIZE);
    const dayGap = scaled(CONFIG.POPUP.DAY_SLOT_GAP);
    const trackWidth = (daySlotSize * 7) + (dayGap * 6);
    const trackX = popupX + (popupWidth - trackWidth) / 2;
    const trackY = contentY + scaled(50);

    const currentDay = getCurrentDay();
    const rewards = getAllRewards();
    const streak = getStreak();

    // Render each day slot
    for (let i = 0; i < 7; i++) {
        const dayNum = i + 1;
        const slotX = trackX + i * (daySlotSize + dayGap);
        const reward = rewards[i];

        // Determine slot state
        let bgColor, borderColor, textColor;
        let isClaimed = false;
        let isCurrent = false;

        if (state.justClaimed && dayNum === currentDay - 1) {
            // Just claimed this one
            isClaimed = true;
            bgColor = CONFIG.COLORS.DAY_CLAIMED;
            borderColor = CONFIG.COLORS.DAY_CLAIMED;
            textColor = CONFIG.COLORS.TEXT_PRIMARY;
        } else if (dayNum < currentDay || (dayNum === currentDay && !canClaim())) {
            // Already claimed
            isClaimed = true;
            bgColor = CONFIG.COLORS.DAY_CLAIMED;
            borderColor = CONFIG.COLORS.DAY_CLAIMED;
            textColor = CONFIG.COLORS.TEXT_PRIMARY;
        } else if (dayNum === currentDay && canClaim()) {
            // Current day - ready to claim
            isCurrent = true;
            bgColor = CONFIG.COLORS.DAY_CURRENT;
            borderColor = CONFIG.COLORS.DAY_CURRENT;
            textColor = CONFIG.COLORS.TEXT_PRIMARY;
        } else {
            // Future day
            bgColor = CONFIG.COLORS.DAY_FUTURE;
            borderColor = 'rgba(100, 100, 150, 0.5)';
            textColor = CONFIG.COLORS.TEXT_SECONDARY;
        }

        // Pulsing glow for current day
        if (isCurrent) {
            ctx.shadowColor = CONFIG.COLORS.DAY_CURRENT;
            ctx.shadowBlur = 10 + Math.sin(state.animationTime * 3) * 5;
        }

        // Slot background
        ctx.fillStyle = bgColor;
        roundRect(ctx, slotX, trackY, daySlotSize, daySlotSize, 8);
        ctx.fill();

        // Slot border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Day number
        ctx.font = `bold ${scaled(10)}px "Press Start 2P", monospace`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(`Day ${dayNum}`, slotX + daySlotSize / 2, trackY + 6);

        // Reward icon/text
        ctx.font = `${scaled(8)}px monospace`;
        const rewardText = getRewardIcon(reward);
        ctx.fillText(rewardText, slotX + daySlotSize / 2, trackY + daySlotSize - 12);

        // Checkmark for claimed
        if (isClaimed) {
            ctx.font = `${scaled(16)}px sans-serif`;
            ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
            ctx.fillText('✓', slotX + daySlotSize / 2, trackY + daySlotSize / 2 + 4);
        }

        // Arrow for current
        if (isCurrent && !state.justClaimed) {
            ctx.font = `${scaled(12)}px sans-serif`;
            ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
            ctx.fillText('↑', slotX + daySlotSize / 2, trackY + daySlotSize + 15);
        }
    }

    // "TODAY" label
    if (canClaim() && !state.justClaimed) {
        ctx.font = `bold ${scaled(12)}px "Press Start 2P", monospace`;
        ctx.fillStyle = CONFIG.COLORS.TEXT_GOLD;
        const todaySlotX = trackX + (currentDay - 1) * (daySlotSize + dayGap);
        ctx.fillText('TODAY', todaySlotX + daySlotSize / 2, trackY + daySlotSize + 30);
    }

    // Current reward display
    const rewardBoxY = trackY + daySlotSize + scaled(55);
    const rewardBoxHeight = scaled(80);

    ctx.fillStyle = 'rgba(40, 40, 80, 0.6)';
    roundRect(ctx, contentX + scaled(40), rewardBoxY, contentWidth - scaled(80), rewardBoxHeight, 8);
    ctx.fill();

    ctx.strokeStyle = CONFIG.COLORS.TEXT_CYAN;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Reward text
    let displayReward;
    if (state.justClaimed && state.claimedReward) {
        displayReward = state.claimedReward;
    } else {
        displayReward = rewards[currentDay - 1];
    }

    ctx.font = `bold ${scaled(18)}px "Press Start 2P", monospace`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_GOLD;
    ctx.fillText(displayReward.description, popupX + popupWidth / 2, rewardBoxY + rewardBoxHeight / 2 - 5);

    // Claim button
    const buttonWidth = scaled(CONFIG.POPUP.CLAIM_BUTTON.WIDTH);
    const buttonHeight = scaled(CONFIG.POPUP.CLAIM_BUTTON.HEIGHT);
    const buttonX = popupX + (popupWidth - buttonWidth) / 2;
    const buttonY = rewardBoxY + rewardBoxHeight + scaled(20);

    const canClaimNow = canClaim() && !state.justClaimed;
    const buttonColor = canClaimNow
        ? (state.claimButtonHovered ? CONFIG.COLORS.BUTTON_HOVER : CONFIG.COLORS.BUTTON_ENABLED)
        : CONFIG.COLORS.BUTTON_DISABLED;

    // Button glow
    if (canClaimNow) {
        ctx.shadowColor = buttonColor;
        ctx.shadowBlur = 10;
    }

    ctx.fillStyle = buttonColor;
    roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
    ctx.fill();

    ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Button text
    ctx.font = `bold ${scaled(14)}px "Press Start 2P", monospace`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
    const buttonText = state.justClaimed ? 'CLAIMED!' : (canClaimNow ? 'CLAIM!' : 'CLAIMED');
    ctx.fillText(buttonText, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 4);

    // Streak counter
    const streakY = buttonY + buttonHeight + scaled(20);
    ctx.font = `${scaled(12)}px "Press Start 2P", monospace`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_CYAN;
    ctx.fillText(`Streak: ${streak} day${streak !== 1 ? 's' : ''} 🔥`, popupX + popupWidth / 2, streakY);

    // Time until next claim (if already claimed today)
    if (!canClaimNow && !state.justClaimed) {
        const timeInfo = getTimeUntilClaim();
        const timeText = `Next in: ${timeInfo.hours}h ${timeInfo.minutes}m`;
        ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
        ctx.fillText(timeText, popupX + popupWidth / 2, streakY + scaled(20));
    }

    // Tap to close hint
    ctx.font = `${scaled(10)}px monospace`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
    ctx.fillText('Tap outside to close', popupX + popupWidth / 2, popupY + popupHeight - 10);

    ctx.restore();

    // Store button bounds for hit testing
    state.claimButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
    state.popupBounds = { x: popupX, y: popupY, width: popupWidth, height: popupHeight };
}

/**
 * Get display icon/text for a reward.
 * @param {Object} reward - Reward definition
 * @returns {string} Display text
 */
function getRewardIcon(reward) {
    const firstReward = reward.rewards[0];
    switch (firstReward.type) {
        case REWARD_TYPES.COINS:
            return `${firstReward.amount}🪙`;
        case REWARD_TYPES.TOKENS:
            return `${firstReward.amount}⭐`;
        case REWARD_TYPES.WEAPON:
            return '🚀';
        case REWARD_TYPES.TANK_SKIN:
            return '🎨';
        case REWARD_TYPES.SUPPLY_DROP:
            return '📦';
        default:
            return '?';
    }
}

// =============================================================================
// CHALLENGE PANEL
// =============================================================================

/**
 * Show the challenge progress panel.
 */
export function showChallengePanel() {
    state.panelVisible = true;
    state.panelAnimationStart = performance.now();
    console.log('[EngagementUI] Challenge panel shown');
}

/**
 * Hide the challenge progress panel.
 */
export function hideChallengePanel() {
    state.panelVisible = false;
    console.log('[EngagementUI] Challenge panel hidden');
}

/**
 * Check if challenge panel is visible.
 * @returns {boolean}
 */
export function isPanelVisible() {
    return state.panelVisible;
}

/**
 * Toggle challenge panel visibility.
 */
export function toggleChallengePanel() {
    if (state.panelVisible) {
        hideChallengePanel();
    } else {
        showChallengePanel();
    }
}

/**
 * Render the challenge progress panel.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderChallengePanel(ctx) {
    if (!state.panelVisible) return;

    const scale = getUIScale();
    const screenWidth = getScreenWidth();
    const screenHeight = getScreenHeight();
    const mobile = isMobileDevice();

    // Calculate panel dimensions
    const panelWidth = mobile ? Math.min(scaled(CONFIG.PANEL.WIDTH), screenWidth - 40) : scaled(CONFIG.PANEL.WIDTH);
    const panelHeight = mobile ? Math.min(scaled(CONFIG.PANEL.HEIGHT), screenHeight - 80) : scaled(CONFIG.PANEL.HEIGHT);
    const panelX = (screenWidth - panelWidth) / 2;
    const panelY = (screenHeight - panelHeight) / 2;

    // Animation progress
    const elapsed = performance.now() - state.panelAnimationStart;
    const fadeProgress = Math.min(1, elapsed / CONFIG.ANIMATION.FADE_IN_DURATION);

    ctx.save();
    ctx.globalAlpha = fadeProgress;

    // Overlay
    ctx.fillStyle = CONFIG.COLORS.OVERLAY;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // Panel glow
    ctx.shadowColor = CONFIG.COLORS.PANEL_BORDER;
    ctx.shadowBlur = CONFIG.ANIMATION.GLOW_INTENSITY;

    // Panel background
    ctx.fillStyle = CONFIG.COLORS.PANEL_BG;
    roundRect(ctx, panelX, panelY, panelWidth, panelHeight, scaled(CONFIG.PANEL.BORDER_RADIUS));
    ctx.fill();

    // Panel border
    ctx.strokeStyle = CONFIG.COLORS.PANEL_BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    const padding = scaled(CONFIG.PANEL.PADDING);
    const contentX = panelX + padding;
    let contentY = panelY + padding;
    const contentWidth = panelWidth - padding * 2;

    // Title
    ctx.font = `bold ${scaled(18)}px "Press Start 2P", monospace`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_CYAN;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('DAILY CHALLENGES', panelX + panelWidth / 2, contentY);

    contentY += scaled(35);

    // Get challenges
    const challenges = getChallenges();
    const challengeHeight = scaled(CONFIG.PANEL.CHALLENGE_HEIGHT);
    const challengeGap = scaled(CONFIG.PANEL.CHALLENGE_GAP);

    // Render each challenge
    for (let i = 0; i < challenges.length; i++) {
        const challenge = challenges[i];
        const chalY = contentY + i * (challengeHeight + challengeGap);

        renderChallenge(ctx, challenge, contentX, chalY, contentWidth, challengeHeight);
    }

    // Bonus section
    const bonusY = contentY + 3 * (challengeHeight + challengeGap);
    renderBonusSection(ctx, panelX, bonusY, panelWidth, padding);

    // Time until refresh
    const timeInfo = getTimeUntilRefresh();
    const timeY = panelY + panelHeight - scaled(30);
    ctx.font = `${scaled(10)}px monospace`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
    ctx.textAlign = 'center';
    ctx.fillText(`Refreshes in: ${timeInfo.hours}h ${timeInfo.minutes}m`, panelX + panelWidth / 2, timeY);

    // Close button (X in corner)
    const closeSize = scaled(30);
    const closeX = panelX + panelWidth - closeSize - 8;
    const closeY = panelY + 8;

    ctx.fillStyle = state.closeButtonHovered ? CONFIG.COLORS.TEXT_PINK : CONFIG.COLORS.TEXT_SECONDARY;
    ctx.font = `bold ${scaled(20)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('×', closeX + closeSize / 2, closeY + closeSize / 2 + 6);

    // Tap to close hint
    ctx.font = `${scaled(10)}px monospace`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
    ctx.fillText('Tap outside to close', panelX + panelWidth / 2, panelY + panelHeight - 10);

    ctx.restore();

    // Store bounds for hit testing
    state.panelBounds = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
    state.closeButtonBounds = { x: closeX, y: closeY, width: closeSize, height: closeSize };
}

/**
 * Render a single challenge.
 */
function renderChallenge(ctx, challenge, x, y, width, height) {
    const scale = getUIScale();

    // Background
    ctx.fillStyle = challenge.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(40, 40, 80, 0.4)';
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();

    // Border with difficulty color
    const difficultyColor = getDifficultyColor(challenge.difficulty);
    ctx.strokeStyle = challenge.completed ? CONFIG.COLORS.PROGRESS_COMPLETE : difficultyColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    const padding = scaled(12);

    // Difficulty badge
    ctx.fillStyle = difficultyColor;
    ctx.font = `bold ${scaled(8)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(challenge.difficulty.toUpperCase(), x + padding, y + padding);

    // Challenge description
    ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
    ctx.font = `${scaled(11)}px "Press Start 2P", monospace`;
    ctx.fillText(challenge.description, x + padding, y + padding + scaled(18));

    // Progress bar
    const barY = y + height - padding - scaled(CONFIG.PANEL.PROGRESS_BAR_HEIGHT);
    const barWidth = width - padding * 2 - scaled(60); // Leave room for reward
    const progressPercent = challenge.target > 0 ? Math.min(1, challenge.progress / challenge.target) : 0;

    // Bar background
    ctx.fillStyle = CONFIG.COLORS.PROGRESS_BG;
    roundRect(ctx, x + padding, barY, barWidth, scaled(CONFIG.PANEL.PROGRESS_BAR_HEIGHT), 4);
    ctx.fill();

    // Bar fill
    if (progressPercent > 0) {
        ctx.fillStyle = challenge.completed ? CONFIG.COLORS.PROGRESS_COMPLETE : CONFIG.COLORS.PROGRESS_FILL;
        roundRect(ctx, x + padding, barY, barWidth * progressPercent, scaled(CONFIG.PANEL.PROGRESS_BAR_HEIGHT), 4);
        ctx.fill();
    }

    // Progress text
    ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
    ctx.font = `${scaled(9)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${challenge.progress}/${challenge.target}`, x + padding + barWidth / 2, barY + scaled(CONFIG.PANEL.PROGRESS_BAR_HEIGHT) / 2 + 3);

    // Reward (or checkmark if complete)
    const rewardX = x + width - padding - scaled(40);
    ctx.textAlign = 'center';

    if (challenge.completed) {
        ctx.font = `${scaled(24)}px sans-serif`;
        ctx.fillStyle = CONFIG.COLORS.PROGRESS_COMPLETE;
        ctx.fillText('✓', rewardX + scaled(20), y + height / 2 + 8);
    } else {
        ctx.font = `bold ${scaled(12)}px monospace`;
        ctx.fillStyle = CONFIG.COLORS.TEXT_GOLD;
        ctx.fillText(`${challenge.reward}🪙`, rewardX + scaled(20), y + height / 2 + 4);
    }
}

/**
 * Render the bonus section for completing all challenges.
 */
function renderBonusSection(ctx, panelX, y, panelWidth, padding) {
    const scale = getUIScale();
    const bonusWidth = panelWidth - padding * 2;
    const bonusHeight = scaled(50);
    const bonusX = panelX + padding;

    const allComplete = areAllCompleted();
    const bonusClaimed = isBonusClaimed();
    const bonus = getBonusReward();

    // Background
    ctx.fillStyle = allComplete ? 'rgba(245, 158, 11, 0.2)' : 'rgba(40, 40, 80, 0.3)';
    roundRect(ctx, bonusX, y, bonusWidth, bonusHeight, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = allComplete ? CONFIG.COLORS.TEXT_GOLD : 'rgba(100, 100, 150, 0.3)';
    ctx.lineWidth = allComplete ? 2 : 1;
    ctx.stroke();

    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (bonusClaimed) {
        ctx.font = `bold ${scaled(12)}px "Press Start 2P", monospace`;
        ctx.fillStyle = CONFIG.COLORS.PROGRESS_COMPLETE;
        ctx.fillText('BONUS CLAIMED! ✓', panelX + panelWidth / 2, y + bonusHeight / 2);
    } else if (allComplete) {
        ctx.font = `bold ${scaled(12)}px "Press Start 2P", monospace`;
        ctx.fillStyle = CONFIG.COLORS.TEXT_GOLD;
        ctx.fillText(`BONUS: ${bonus.coins}🪙 + ${bonus.supplyDrop}📦`, panelX + panelWidth / 2, y + bonusHeight / 2);
    } else {
        const counts = getCompletionCounts();
        ctx.font = `${scaled(10)}px "Press Start 2P", monospace`;
        ctx.fillStyle = CONFIG.COLORS.TEXT_SECONDARY;
        ctx.fillText(`Complete all 3 for bonus (${counts.completed}/${counts.total})`, panelX + panelWidth / 2, y + bonusHeight / 2);
    }
}

/**
 * Get color for challenge difficulty.
 */
function getDifficultyColor(difficulty) {
    switch (difficulty) {
        case CHALLENGE_DIFFICULTY.EASY:
            return CONFIG.COLORS.DIFFICULTY_EASY;
        case CHALLENGE_DIFFICULTY.MEDIUM:
            return CONFIG.COLORS.DIFFICULTY_MEDIUM;
        case CHALLENGE_DIFFICULTY.HARD:
            return CONFIG.COLORS.DIFFICULTY_HARD;
        default:
            return CONFIG.COLORS.TEXT_SECONDARY;
    }
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle pointer down event.
 * @param {number} x - Pointer X position
 * @param {number} y - Pointer Y position
 * @returns {boolean} True if event was handled
 */
export function handlePointerDown(x, y) {
    // Daily rewards popup
    if (state.popupVisible) {
        // Check claim button
        if (state.claimButtonBounds && isPointInBounds(x, y, state.claimButtonBounds)) {
            if (canClaim() && !state.justClaimed) {
                handleClaimReward();
            }
            return true;
        }

        // Check if clicked outside popup (to close)
        if (state.popupBounds && !isPointInBounds(x, y, state.popupBounds)) {
            hideDailyRewardsPopup();
            return true;
        }

        return true; // Consume click
    }

    // Challenge panel
    if (state.panelVisible) {
        // Check close button
        if (state.closeButtonBounds && isPointInBounds(x, y, state.closeButtonBounds)) {
            hideChallengePanel();
            return true;
        }

        // Check if clicked outside panel (to close)
        if (state.panelBounds && !isPointInBounds(x, y, state.panelBounds)) {
            hideChallengePanel();
            return true;
        }

        return true; // Consume click
    }

    return false;
}

/**
 * Handle pointer move event for hover states.
 * @param {number} x - Pointer X position
 * @param {number} y - Pointer Y position
 */
export function handlePointerMove(x, y) {
    // Update hover states
    if (state.popupVisible && state.claimButtonBounds) {
        state.claimButtonHovered = isPointInBounds(x, y, state.claimButtonBounds);
    }

    if (state.panelVisible && state.closeButtonBounds) {
        state.closeButtonHovered = isPointInBounds(x, y, state.closeButtonBounds);
    }
}

/**
 * Handle claiming the daily reward.
 */
function handleClaimReward() {
    const claimResult = claim();
    if (!claimResult) return;

    state.justClaimed = true;
    state.claimedReward = claimResult;

    // Process rewards
    processRewards(claimResult, rewardCallbacks);

    // Play sound
    playClaimSound();

    console.log('[EngagementUI] Reward claimed:', claimResult.description);
}

/**
 * Play sound for claiming reward.
 */
function playClaimSound() {
    if (!Sound.isInitialized()) return;

    const ctx = Sound.getContext();
    const sfxGain = Sound.getSfxGain();
    if (!ctx || !sfxGain) return;

    try {
        const now = ctx.currentTime;

        // Create a cheerful ascending chime
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';

        // Ascending notes
        osc1.frequency.setValueAtTime(523, now); // C5
        osc1.frequency.setValueAtTime(659, now + 0.1); // E5
        osc1.frequency.setValueAtTime(784, now + 0.2); // G5

        osc2.frequency.setValueAtTime(523, now);
        osc2.frequency.setValueAtTime(659, now + 0.1);
        osc2.frequency.setValueAtTime(784, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
    } catch (e) {
        console.warn('[EngagementUI] Failed to play claim sound:', e);
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if point is within bounds.
 */
function isPointInBounds(x, y, bounds) {
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
}

/**
 * Draw rounded rectangle path.
 */
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// =============================================================================
// UPDATE AND RENDER
// =============================================================================

/**
 * Update engagement UI state.
 * @param {number} deltaTime - Time since last update in seconds
 */
export function update(deltaTime) {
    state.animationTime += deltaTime;
}

/**
 * Render all visible engagement UI.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function render(ctx) {
    renderDailyRewardsPopup(ctx);
    renderChallengePanel(ctx);
}

/**
 * Check if any engagement UI is currently active.
 * @returns {boolean}
 */
export function isActive() {
    return state.popupVisible || state.panelVisible;
}

/**
 * Close all engagement UI.
 */
export function closeAll() {
    hideDailyRewardsPopup();
    hideChallengePanel();
}
