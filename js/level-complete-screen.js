/**
 * Scorched Earth: Synthwave Edition
 * Level Complete Screen UI
 *
 * Displays victory, star animation, score breakdown, and navigation buttons
 * after completing a level in level-based progression mode.
 */

import { COLORS, UI, GAME_STATES } from './constants.js';
import * as Renderer from './renderer.js';
import * as Game from './game.js';
import * as Input from './input.js';
import * as Sound from './sound.js';
import * as Music from './music.js';
import { LevelRegistry, LEVEL_CONSTANTS, WORLD_THEMES } from './levels.js';
import { Stars } from './stars.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Timing
    APPEAR_DELAY: 800,           // Delay before screen appears (ms)
    STAR_REVEAL_DELAY: 400,      // Delay between each star reveal (ms)
    STAR_ANIMATION_DURATION: 300, // Duration of star fill animation (ms)
    SCORE_LINE_DELAY: 100,       // Delay between each score line appearing (ms)

    // Layout
    TITLE_Y: 100,
    STARS_Y: 200,
    SCORE_START_Y: 300,
    SCORE_LINE_HEIGHT: 36,
    BUTTONS_Y_OFFSET: 80,        // From bottom

    // Star sizes
    STAR_SIZE: 56,
    STAR_SPACING: 80,

    // Button dimensions
    BUTTON_WIDTH: 160,
    BUTTON_HEIGHT: 50,
    BUTTON_GAP: 20,

    // Animation
    PULSE_SPEED: 0.003
};

// =============================================================================
// STATE
// =============================================================================

/** Whether the screen is active */
let isVisible = false;

/** Whether content is showing (after appear delay) */
let contentVisible = false;

/** Level completion data */
let completionData = {
    levelId: null,
    level: null,
    worldNum: 1,
    levelNum: 1,
    stats: {
        damageDealt: 0,
        accuracy: 0,
        turnsUsed: 0,
        won: true
    },
    result: null,       // Star calculation result
    previousStars: 0,   // Stars before this completion
    isFirstClear: false,
    coinsEarned: 0
};

/** Animation timing */
let animationTime = 0;
let showTime = 0;

/** Star reveal animation state */
let starsRevealed = 0;          // Number of stars revealed (0-3)
let starAnimationProgress = [0, 0, 0]; // Fill progress for each star (0-1)
let lastStarRevealTime = 0;

/** Score line reveal animation state */
let scoreLinesRevealed = 0;
let lastScoreLineTime = 0;

/** Button hover state */
let hoveredButton = null;

/** World unlock celebration state */
let worldUnlockCelebration = {
    active: false,
    worldNum: 0,
    animationTime: 0,
    confetti: []
};

/** Callbacks */
let onRetryCallback = null;
let onNextCallback = null;
let onMenuCallback = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Show the level complete screen.
 * @param {Object} options - Completion data
 * @param {string} options.levelId - Level ID (e.g., 'world1-level3')
 * @param {Object} options.stats - Performance statistics
 * @param {number} options.stats.damageDealt - Total damage dealt
 * @param {number} options.stats.accuracy - Hit accuracy (0.0 - 1.0)
 * @param {number} options.stats.turnsUsed - Number of turns taken
 * @param {boolean} options.stats.won - Whether player won
 * @param {number} options.coinsEarned - Coins earned this level
 */
export function show(options = {}) {
    const {
        levelId,
        stats = {},
        coinsEarned = 0
    } = options;

    // Reset state
    isVisible = true;
    contentVisible = false;
    animationTime = 0;
    showTime = 0;
    starsRevealed = 0;
    starAnimationProgress = [0, 0, 0];
    lastStarRevealTime = 0;
    scoreLinesRevealed = 0;
    lastScoreLineTime = 0;
    hoveredButton = null;
    worldUnlockCelebration = {
        active: false,
        worldNum: 0,
        animationTime: 0,
        confetti: []
    };

    // Get level info
    const level = LevelRegistry.getLevel(levelId);
    const { worldNum, levelNum } = LevelRegistry.parseLevelId(levelId) || { worldNum: 1, levelNum: 1 };

    // Get previous stars before recording completion
    const previousStars = Stars.getForLevel(levelId);
    const previousTotalStars = Stars.getTotalStars();

    // Calculate and record stars
    const result = Stars.recordCompletion(levelId, stats);

    // Check if a new world was unlocked by this completion
    if (result.stars > previousStars) {
        const newTotalStars = Stars.getTotalStars();
        // Check each world that could have been unlocked
        for (let w = 2; w <= LEVEL_CONSTANTS.WORLDS; w++) {
            const threshold = LEVEL_CONSTANTS.STAR_THRESHOLDS[w];
            if (previousTotalStars < threshold && newTotalStars >= threshold) {
                // World w was just unlocked!
                worldUnlockCelebration.active = true;
                worldUnlockCelebration.worldNum = w;
                worldUnlockCelebration.animationTime = 0;
                // Generate confetti particles
                worldUnlockCelebration.confetti = generateConfetti(100);
                // Play world unlock sound
                playWorldUnlockSound();
                console.log(`[LevelComplete] World ${w} unlocked!`);
                break; // Only celebrate one world at a time
            }
        }
    }

    // Check if this is a first clear (no previous stars)
    const isFirstClear = previousStars === 0 && result.stars > 0;

    // Store completion data
    completionData = {
        levelId,
        level,
        worldNum,
        levelNum,
        stats: {
            damageDealt: stats.damageDealt || 0,
            accuracy: stats.accuracy || 0,
            turnsUsed: stats.turnsUsed || 0,
            won: stats.won !== false
        },
        result,
        previousStars,
        isFirstClear,
        coinsEarned
    };

    console.log('[LevelComplete] Screen queued:', {
        levelId,
        stars: result.stars,
        isNewRecord: result.isNewRecord,
        isFirstClear
    });

    // Show content after delay
    setTimeout(() => {
        contentVisible = true;
        lastStarRevealTime = animationTime;
        lastScoreLineTime = animationTime;
    }, CONFIG.APPEAR_DELAY);
}

/**
 * Hide the level complete screen.
 */
export function hide() {
    isVisible = false;
    contentVisible = false;
    completionData = {
        levelId: null,
        level: null,
        worldNum: 1,
        levelNum: 1,
        stats: { damageDealt: 0, accuracy: 0, turnsUsed: 0, won: true },
        result: null,
        previousStars: 0,
        isFirstClear: false,
        coinsEarned: 0
    };
}

/**
 * Check if the screen is visible.
 * @returns {boolean}
 */
export function isShowing() {
    return isVisible && contentVisible;
}

/**
 * Check if the screen is active (even during appear delay).
 * @returns {boolean}
 */
export function isActive() {
    return isVisible;
}

// =============================================================================
// CALLBACKS
// =============================================================================

/**
 * Register callback for Retry button.
 * @param {Function} callback
 */
export function onRetry(callback) {
    onRetryCallback = callback;
}

/**
 * Register callback for Next button.
 * @param {Function} callback
 */
export function onNext(callback) {
    onNextCallback = callback;
}

/**
 * Register callback for Menu button.
 * @param {Function} callback
 */
export function onMenu(callback) {
    onMenuCallback = callback;
}

// =============================================================================
// BUTTON LAYOUT
// =============================================================================

/**
 * Get button rectangles for hit testing.
 * @returns {{retry: Object, next: Object, menu: Object}}
 */
function getButtonRects() {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const centerX = width / 2;
    const buttonsY = height - CONFIG.BUTTONS_Y_OFFSET;

    const totalWidth = CONFIG.BUTTON_WIDTH * 3 + CONFIG.BUTTON_GAP * 2;
    const startX = centerX - totalWidth / 2;

    return {
        retry: {
            x: startX,
            y: buttonsY - CONFIG.BUTTON_HEIGHT / 2,
            width: CONFIG.BUTTON_WIDTH,
            height: CONFIG.BUTTON_HEIGHT
        },
        next: {
            x: startX + CONFIG.BUTTON_WIDTH + CONFIG.BUTTON_GAP,
            y: buttonsY - CONFIG.BUTTON_HEIGHT / 2,
            width: CONFIG.BUTTON_WIDTH,
            height: CONFIG.BUTTON_HEIGHT
        },
        menu: {
            x: startX + (CONFIG.BUTTON_WIDTH + CONFIG.BUTTON_GAP) * 2,
            y: buttonsY - CONFIG.BUTTON_HEIGHT / 2,
            width: CONFIG.BUTTON_WIDTH,
            height: CONFIG.BUTTON_HEIGHT
        }
    };
}

/**
 * Check if a point is inside a rectangle.
 * @param {{x: number, y: number}} pos
 * @param {{x: number, y: number, width: number, height: number}} rect
 * @returns {boolean}
 */
function isInsideRect(pos, rect) {
    return (
        pos.x >= rect.x &&
        pos.x <= rect.x + rect.width &&
        pos.y >= rect.y &&
        pos.y <= rect.y + rect.height
    );
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle click/tap on the screen.
 * @param {{x: number, y: number}} pos - Click position
 * @returns {boolean} Whether a button was clicked
 */
export function handleClick(pos) {
    if (!contentVisible) return false;

    const buttons = getButtonRects();

    // Check Retry button
    if (isInsideRect(pos, buttons.retry)) {
        Sound.playClickSound();
        console.log('[LevelComplete] Retry clicked');
        if (onRetryCallback) {
            onRetryCallback(completionData.levelId, completionData.worldNum, completionData.levelNum);
        }
        return true;
    }

    // Check Next button
    if (isInsideRect(pos, buttons.next)) {
        // Check if next level exists and is unlocked
        const nextLevelNum = completionData.levelNum + 1;
        const nextLevelId = `world${completionData.worldNum}-level${nextLevelNum}`;
        const nextLevel = LevelRegistry.getLevel(nextLevelId);

        if (nextLevel) {
            Sound.playClickSound();
            console.log('[LevelComplete] Next clicked');
            if (onNextCallback) {
                onNextCallback(nextLevelId, completionData.worldNum, nextLevelNum);
            }
        } else {
            // No next level - check for next world
            const nextWorldNum = completionData.worldNum + 1;
            const totalStars = Stars.getTotalStars();

            if (nextWorldNum <= LEVEL_CONSTANTS.WORLDS &&
                LevelRegistry.isWorldUnlocked(nextWorldNum, totalStars)) {
                const firstLevelId = `world${nextWorldNum}-level1`;
                Sound.playClickSound();
                console.log('[LevelComplete] Next world clicked');
                if (onNextCallback) {
                    onNextCallback(firstLevelId, nextWorldNum, 1);
                }
            } else {
                // Play error sound - no next level available
                Sound.playErrorSound();
            }
        }
        return true;
    }

    // Check Menu button
    if (isInsideRect(pos, buttons.menu)) {
        Sound.playClickSound();
        console.log('[LevelComplete] Menu clicked');
        if (onMenuCallback) {
            onMenuCallback();
        } else {
            hide();
            Game.setState(GAME_STATES.LEVEL_SELECT);
        }
        return true;
    }

    return false;
}

/**
 * Handle pointer move for hover effects.
 * @param {{x: number, y: number}} pos
 */
function handlePointerMove(pos) {
    if (!contentVisible) {
        hoveredButton = null;
        return;
    }

    const buttons = getButtonRects();

    if (isInsideRect(pos, buttons.retry)) {
        hoveredButton = 'retry';
    } else if (isInsideRect(pos, buttons.next)) {
        hoveredButton = 'next';
    } else if (isInsideRect(pos, buttons.menu)) {
        hoveredButton = 'menu';
    } else {
        hoveredButton = null;
    }
}

/**
 * Handle key press.
 * @param {string} keyCode
 */
function handleKeyDown(keyCode) {
    if (!contentVisible) return;

    if (keyCode === 'Escape') {
        Sound.playClickSound();
        if (onMenuCallback) {
            onMenuCallback();
        } else {
            hide();
            Game.setState(GAME_STATES.LEVEL_SELECT);
        }
    }
}

// =============================================================================
// WORLD UNLOCK CELEBRATION
// =============================================================================

/**
 * Generate confetti particles for world unlock celebration.
 * @param {number} count - Number of particles to generate
 * @returns {Array} Array of confetti particle objects
 */
function generateConfetti(count) {
    const particles = [];
    const colors = [COLORS.NEON_CYAN, COLORS.NEON_PINK, COLORS.NEON_YELLOW, COLORS.NEON_PURPLE, COLORS.NEON_ORANGE];

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * Renderer.getWidth(),
            y: -20 - Math.random() * 100,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: Math.random() > 0.5 ? 'rect' : 'circle'
        });
    }

    return particles;
}

/**
 * Update confetti particles.
 * @param {number} deltaTime - Time since last frame in ms
 */
function updateConfetti(deltaTime) {
    if (!worldUnlockCelebration.active) return;

    const dt = deltaTime / 16; // Normalize to ~60fps

    for (const p of worldUnlockCelebration.confetti) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.1 * dt; // Gravity
        p.rotation += p.rotationSpeed * dt;
    }

    // Remove particles that have fallen off screen
    worldUnlockCelebration.confetti = worldUnlockCelebration.confetti.filter(
        p => p.y < Renderer.getHeight() + 50
    );

    // Deactivate celebration when all confetti is gone
    if (worldUnlockCelebration.confetti.length === 0 && worldUnlockCelebration.animationTime > 3000) {
        worldUnlockCelebration.active = false;
    }
}

/**
 * Render confetti particles.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderConfetti(ctx) {
    if (!worldUnlockCelebration.active) return;

    ctx.save();

    for (const p of worldUnlockCelebration.confetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;

        if (p.type === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    ctx.restore();
}

/**
 * Render world unlock celebration overlay.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} pulseIntensity - Glow pulse intensity (0-1)
 */
function renderWorldUnlockCelebration(ctx, pulseIntensity) {
    if (!worldUnlockCelebration.active) return;

    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const worldNum = worldUnlockCelebration.worldNum;
    const animTime = worldUnlockCelebration.animationTime;

    // Fade in the overlay
    const fadeIn = Math.min(1, animTime / 500);
    const fadeOut = animTime > 2500 ? Math.max(0, 1 - (animTime - 2500) / 500) : 1;
    const alpha = fadeIn * fadeOut;

    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Dark overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, width, height);

    // Render confetti first (behind text)
    renderConfetti(ctx);

    // "WORLD X UNLOCKED!" text
    const worldTheme = WORLD_THEMES[worldNum] || WORLD_THEMES[1];
    const centerY = height / 2;

    // Scale animation
    const scale = animTime < 300 ?
        0.5 + 0.5 * Math.pow(animTime / 300, 0.5) :
        1 + 0.02 * Math.sin(animTime * 0.005);

    ctx.save();
    ctx.translate(width / 2, centerY);
    ctx.scale(scale, scale);

    // "WORLD" label
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.font = `bold 24px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WORLD', 0, -50);

    // World number with glow
    ctx.font = `bold 72px ${UI.FONT_FAMILY}`;
    ctx.shadowColor = worldTheme.color;
    ctx.shadowBlur = 20 + pulseIntensity * 15;
    ctx.fillStyle = worldTheme.color;
    ctx.fillText(worldNum.toString(), 0, 0);
    ctx.shadowBlur = 0;

    // "UNLOCKED!" label
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold 36px ${UI.FONT_FAMILY}`;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 15 + pulseIntensity * 10;
    ctx.fillText('UNLOCKED!', 0, 60);
    ctx.shadowBlur = 0;

    ctx.restore();
    ctx.restore();
}

// =============================================================================
// UPDATE
// =============================================================================

/**
 * Update screen state.
 * @param {number} deltaTime - Time since last frame in ms
 */
export function update(deltaTime) {
    if (!isVisible) return;

    animationTime += deltaTime;

    // Update world unlock celebration
    if (worldUnlockCelebration.active) {
        worldUnlockCelebration.animationTime += deltaTime;
        updateConfetti(deltaTime);
    }

    if (!contentVisible) return;

    showTime += deltaTime;

    // Update star reveal animation
    const earnedStars = completionData.result?.stars || 0;

    if (starsRevealed < earnedStars) {
        const timeSinceLastReveal = animationTime - lastStarRevealTime;

        if (timeSinceLastReveal >= CONFIG.STAR_REVEAL_DELAY) {
            // Play star reveal sound
            playStarRevealSound(starsRevealed);

            starsRevealed++;
            lastStarRevealTime = animationTime;
        }
    }

    // Update star fill animations
    for (let i = 0; i < 3; i++) {
        if (i < starsRevealed) {
            // Animate fill
            const timeSinceReveal = animationTime - (lastStarRevealTime - (starsRevealed - i - 1) * CONFIG.STAR_REVEAL_DELAY);
            starAnimationProgress[i] = Math.min(1, timeSinceReveal / CONFIG.STAR_ANIMATION_DURATION);
        }
    }

    // Update score line reveals
    const totalScoreLines = 5; // damage, accuracy, turns, separator, score
    const starsFullyRevealed = starsRevealed >= earnedStars && starAnimationProgress[Math.max(0, earnedStars - 1)] >= 1;

    if (starsFullyRevealed && scoreLinesRevealed < totalScoreLines) {
        const timeSinceLastLine = animationTime - lastScoreLineTime;

        if (timeSinceLastLine >= CONFIG.SCORE_LINE_DELAY) {
            scoreLinesRevealed++;
            lastScoreLineTime = animationTime;
        }
    }
}

/**
 * Play sound for star reveal.
 * @param {number} starIndex - Which star is being revealed (0-2)
 */
function playStarRevealSound(starIndex) {
    // Use ascending pitch for each star
    const baseVolume = 0.4;
    const pitchMultiplier = 1 + starIndex * 0.15; // Higher pitch for each star

    // Synthesize a star reveal sound using Web Audio
    if (!Sound.isInitialized()) return;

    const ctx = Sound.getContext();
    if (!ctx) return;

    const sfxGain = Sound.getSfxGain();
    if (!sfxGain) return;

    const now = ctx.currentTime;

    // Create oscillators for a bright, magical sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Base frequency increases with each star
    const baseFreq = 523.25 * pitchMultiplier; // C5

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + 0.1);

    // Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(baseVolume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // Connect
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(sfxGain);

    // Play
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
}

/**
 * Play a fanfare sound for world unlock.
 * A more dramatic, celebratory sound than star reveal.
 */
function playWorldUnlockSound() {
    if (!Sound.isInitialized()) return;

    const audioCtx = Sound.getContext();
    if (!audioCtx) return;

    const sfxGain = Sound.getSfxGain();
    if (!sfxGain) return;

    const now = audioCtx.currentTime;
    const baseVolume = 0.35;

    // Create a fanfare with multiple ascending notes
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const delay = i * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(baseVolume, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);

        osc.connect(gain);
        gain.connect(sfxGain);

        osc.start(now + delay);
        osc.stop(now + delay + 0.4);
    });

    // Add a shimmering high note
    const shimmer = audioCtx.createOscillator();
    const shimmerGain = audioCtx.createGain();

    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(2093, now + 0.3); // C7
    shimmer.frequency.exponentialRampToValueAtTime(2093 * 1.5, now + 0.6);

    shimmerGain.gain.setValueAtTime(0, now + 0.3);
    shimmerGain.gain.linearRampToValueAtTime(baseVolume * 0.5, now + 0.35);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(sfxGain);

    shimmer.start(now + 0.3);
    shimmer.stop(now + 0.8);
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render the level complete screen.
 * @param {CanvasRenderingContext2D} ctx
 */
export function render(ctx) {
    if (!isVisible || !contentVisible) return;

    const width = Renderer.getWidth();
    const height = Renderer.getHeight();
    const centerX = width / 2;

    // Get theme color from world
    const theme = WORLD_THEMES[completionData.worldNum] || WORLD_THEMES[1];
    const mainColor = theme.primaryColor;
    const pulseIntensity = (Math.sin(animationTime * CONFIG.PULSE_SPEED) + 1) / 2;

    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.97)';
    ctx.fillRect(0, 0, width, height);

    // Scanlines effect
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < height; y += 4) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, y, width, 2);
    }
    ctx.globalAlpha = 1;

    // ==========================================================================
    // VICTORY HEADER
    // ==========================================================================
    renderVictoryHeader(ctx, centerX, mainColor, pulseIntensity);

    // ==========================================================================
    // LEVEL NAME
    // ==========================================================================
    const levelName = completionData.level?.name || `Level ${completionData.levelNum}`;
    ctx.font = `bold 20px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.TEXT_LIGHT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`LEVEL ${completionData.worldNum}-${completionData.levelNum}: ${levelName.toUpperCase()}`, centerX, CONFIG.TITLE_Y + 50);

    // ==========================================================================
    // STARS
    // ==========================================================================
    renderStars(ctx, centerX, CONFIG.STARS_Y, pulseIntensity);

    // ==========================================================================
    // SCORE BREAKDOWN
    // ==========================================================================
    renderScoreBreakdown(ctx, centerX, CONFIG.SCORE_START_Y);

    // ==========================================================================
    // COIN REWARD
    // ==========================================================================
    renderCoinReward(ctx, centerX, CONFIG.SCORE_START_Y + CONFIG.SCORE_LINE_HEIGHT * 5 + 30);

    // ==========================================================================
    // NEW BEST INDICATOR
    // ==========================================================================
    if (completionData.result?.isNewRecord) {
        renderNewBest(ctx, centerX, CONFIG.STARS_Y + 60, pulseIntensity);
    }

    // ==========================================================================
    // BUTTONS
    // ==========================================================================
    renderButtons(ctx, pulseIntensity);

    // ==========================================================================
    // DECORATIVE FRAME
    // ==========================================================================
    renderFrame(ctx, mainColor, pulseIntensity);

    ctx.restore();

    // ==========================================================================
    // WORLD UNLOCK CELEBRATION (renders on top of everything)
    // ==========================================================================
    renderWorldUnlockCelebration(ctx, pulseIntensity);
}

/**
 * Render the victory header with glowing text.
 */
function renderVictoryHeader(ctx, centerX, mainColor, pulseIntensity) {
    ctx.save();

    // Glow effect
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 40 + pulseIntensity * 20;

    // Main title
    ctx.font = `bold 48px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = mainColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VICTORY!', centerX, CONFIG.TITLE_Y);

    // Decorative stars on sides
    ctx.shadowBlur = 15;
    ctx.font = `24px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.fillText('\u2605 \u2605 \u2605', centerX - 150, CONFIG.TITLE_Y);
    ctx.fillText('\u2605 \u2605 \u2605', centerX + 150, CONFIG.TITLE_Y);

    ctx.restore();
}

/**
 * Render the star display with animation.
 */
function renderStars(ctx, centerX, y, pulseIntensity) {
    const earnedStars = completionData.result?.stars || 0;
    const startX = centerX - CONFIG.STAR_SPACING;

    ctx.save();

    for (let i = 0; i < 3; i++) {
        const x = startX + i * CONFIG.STAR_SPACING;
        const isEarned = i < earnedStars;
        const isRevealed = i < starsRevealed;
        const fillProgress = starAnimationProgress[i];

        // Determine star state
        if (isRevealed && fillProgress >= 1) {
            // Fully filled star
            ctx.font = `${CONFIG.STAR_SIZE}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = COLORS.NEON_YELLOW;
            ctx.shadowColor = COLORS.NEON_YELLOW;
            ctx.shadowBlur = 15 + pulseIntensity * 10;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('\u2605', x, y);
        } else if (isRevealed && fillProgress > 0) {
            // Animating star - scale effect
            const scale = 0.5 + fillProgress * 0.5;
            const alpha = fillProgress;

            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);

            // Glow during animation
            ctx.font = `${CONFIG.STAR_SIZE}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = COLORS.NEON_YELLOW;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = COLORS.NEON_YELLOW;
            ctx.shadowBlur = 30 * fillProgress;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('\u2605', 0, 0);

            ctx.restore();

            // Also draw empty star behind it
            ctx.font = `${CONFIG.STAR_SIZE}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = COLORS.TEXT_MUTED;
            ctx.globalAlpha = 1 - alpha;
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('\u2606', x, y);
            ctx.globalAlpha = 1;
        } else {
            // Empty star
            ctx.font = `${CONFIG.STAR_SIZE}px ${UI.FONT_FAMILY}`;
            ctx.fillStyle = 'rgba(136, 136, 153, 0.5)';
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('\u2606', x, y);
        }
    }

    ctx.restore();
}

/**
 * Render the score breakdown.
 */
function renderScoreBreakdown(ctx, centerX, startY) {
    const stats = completionData.stats;
    const breakdown = completionData.result?.breakdown || {};

    const lines = [
        { label: 'Damage:', value: formatNumber(stats.damageDealt), color: COLORS.NEON_PINK },
        { label: 'Accuracy:', value: `${Math.round(stats.accuracy * 100)}%`, color: getAccuracyColor(stats.accuracy) },
        { label: 'Turns:', value: stats.turnsUsed, color: COLORS.TEXT_LIGHT },
        { label: '', value: '───────────────', color: COLORS.GRID }, // Separator
        { label: 'Score:', value: formatNumber(calculateScore(stats)), color: COLORS.NEON_YELLOW, bold: true }
    ];

    ctx.save();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const y = startY + i * CONFIG.SCORE_LINE_HEIGHT;

        // Only show if revealed
        const alpha = i < scoreLinesRevealed ? 1 : 0;
        if (alpha === 0) continue;

        ctx.globalAlpha = alpha;

        // Label
        ctx.font = `${line.bold ? 'bold ' : ''}16px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.TEXT_MUTED;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.label, centerX - 20, y);

        // Value
        ctx.fillStyle = line.color;
        ctx.textAlign = 'left';
        if (line.bold) {
            ctx.shadowColor = line.color;
            ctx.shadowBlur = 8;
        }
        ctx.fillText(String(line.value), centerX + 20, y);
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

/**
 * Render the coin reward display.
 */
function renderCoinReward(ctx, centerX, y) {
    if (scoreLinesRevealed < 5) return;

    const coins = completionData.coinsEarned;
    const isFirstClear = completionData.isFirstClear;

    ctx.save();

    // Coin icon and amount
    ctx.font = `bold 24px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${formatNumber(coins)} coins`, centerX, y);

    // First clear bonus indicator
    if (isFirstClear) {
        ctx.shadowBlur = 0;
        ctx.font = `14px ${UI.FONT_FAMILY}`;
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.fillText('FIRST CLEAR BONUS!', centerX, y + 28);
    }

    ctx.restore();
}

/**
 * Render "New Best" indicator when stars improved.
 */
function renderNewBest(ctx, centerX, y, pulseIntensity) {
    ctx.save();

    const colorCycle = Math.floor(animationTime / 200) % 2;
    const color = colorCycle === 0 ? COLORS.NEON_CYAN : COLORS.NEON_PINK;

    ctx.font = `bold 18px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + pulseIntensity * 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2605 NEW BEST! \u2605', centerX, y);

    ctx.restore();
}

/**
 * Render action buttons.
 */
function renderButtons(ctx, pulseIntensity) {
    const buttons = getButtonRects();

    // Check if next level is available
    const nextLevelNum = completionData.levelNum + 1;
    const nextLevelId = `world${completionData.worldNum}-level${nextLevelNum}`;
    const nextLevel = LevelRegistry.getLevel(nextLevelId);
    const nextWorldUnlocked = completionData.worldNum < LEVEL_CONSTANTS.WORLDS &&
        LevelRegistry.isWorldUnlocked(completionData.worldNum + 1, Stars.getTotalStars());
    const hasNextLevel = nextLevel || nextWorldUnlocked;

    // Retry button
    renderButton(ctx, buttons.retry, 'RETRY', COLORS.NEON_ORANGE, hoveredButton === 'retry', pulseIntensity, true);

    // Next button (may be disabled)
    renderButton(ctx, buttons.next, hasNextLevel ? 'NEXT \u2192' : 'NEXT', COLORS.NEON_CYAN, hoveredButton === 'next', pulseIntensity, hasNextLevel);

    // Menu button
    renderButton(ctx, buttons.menu, 'MENU', COLORS.NEON_PURPLE, hoveredButton === 'menu', pulseIntensity, true);
}

/**
 * Render a single button.
 */
function renderButton(ctx, rect, text, color, isHovered, pulseIntensity, enabled = true) {
    ctx.save();

    const { x, y, width, height } = rect;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Background
    ctx.fillStyle = isHovered && enabled ? 'rgba(30, 30, 60, 0.95)' : 'rgba(20, 20, 40, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    // Border
    if (enabled) {
        ctx.strokeStyle = isHovered ? color : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isHovered ? 3 : 2;
        if (isHovered) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15 + pulseIntensity * 10;
        }
    } else {
        ctx.strokeStyle = 'rgba(136, 136, 153, 0.3)';
        ctx.lineWidth = 1;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Text
    ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = enabled ? (isHovered ? color : COLORS.TEXT_LIGHT) : COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isHovered && enabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
    }
    ctx.fillText(text, centerX, centerY);

    ctx.restore();
}

/**
 * Render decorative frame.
 */
function renderFrame(ctx, mainColor, pulseIntensity) {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();

    ctx.save();

    // Main border
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 15 + pulseIntensity * 10;
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Corner accents
    const cornerSize = 25;
    ctx.strokeStyle = COLORS.NEON_YELLOW;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.lineWidth = 4;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(40, 40 + cornerSize);
    ctx.lineTo(40, 40);
    ctx.lineTo(40 + cornerSize, 40);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - 40 - cornerSize, 40);
    ctx.lineTo(width - 40, 40);
    ctx.lineTo(width - 40, 40 + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(40, height - 40 - cornerSize);
    ctx.lineTo(40, height - 40);
    ctx.lineTo(40 + cornerSize, height - 40);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - 40 - cornerSize, height - 40);
    ctx.lineTo(width - 40, height - 40);
    ctx.lineTo(width - 40, height - 40 - cornerSize);
    ctx.stroke();

    ctx.restore();
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format a number with commas.
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
    return Math.round(num).toLocaleString();
}

/**
 * Get color based on accuracy.
 * @param {number} accuracy - 0.0 to 1.0
 * @returns {string}
 */
function getAccuracyColor(accuracy) {
    if (accuracy >= 0.8) return COLORS.NEON_CYAN;
    if (accuracy >= 0.5) return COLORS.NEON_YELLOW;
    return COLORS.NEON_ORANGE;
}

/**
 * Calculate a simple score from stats.
 * @param {Object} stats
 * @returns {number}
 */
function calculateScore(stats) {
    const damageScore = stats.damageDealt;
    const accuracyBonus = Math.round(stats.accuracy * 1000);
    const turnBonus = Math.max(0, (20 - stats.turnsUsed) * 50);
    return damageScore + accuracyBonus + turnBonus;
}

// =============================================================================
// STATE SETUP
// =============================================================================

/**
 * Setup level complete screen state handlers.
 * Call this during game initialization.
 */
export function setup() {
    // Register click handlers
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.LEVEL_COMPLETE) {
            handleClick({ x, y });
        }
    });

    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_COMPLETE) {
            handlePointerMove({ x, y });
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_COMPLETE) {
            handleClick({ x, y });
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_COMPLETE) {
            handlePointerMove({ x, y });
        }
    });

    Input.onKeyDown((keyCode) => {
        if (Game.getState() === GAME_STATES.LEVEL_COMPLETE) {
            handleKeyDown(keyCode);
        }
    });

    // Register state handlers
    Game.registerStateHandlers(GAME_STATES.LEVEL_COMPLETE, {
        onEnter: (fromState) => {
            console.log('Entered LEVEL_COMPLETE state');
            // Music handled by whoever triggers the show() call
            Music.playForState(GAME_STATES.VICTORY);
        },
        onExit: (toState) => {
            console.log('Exiting LEVEL_COMPLETE state');
            hide();
        },
        update: update,
        render: render
    });
}

/**
 * Get current completion data (for external use).
 * @returns {Object}
 */
export function getCompletionData() {
    return { ...completionData };
}
