/**
 * Scorched Earth: Synthwave Edition
 * Wind system
 *
 * Manages wind that affects projectile trajectory.
 * Wind is randomized each round and visually indicated with an arrow.
 */

import { PHYSICS, COLORS, UI, CANVAS } from './constants.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * Current wind value.
 * Range: -PHYSICS.WIND_RANGE to +PHYSICS.WIND_RANGE (-10 to +10)
 * Negative = blowing left, Positive = blowing right
 * @type {number}
 */
let currentWind = 0;

// =============================================================================
// WIND RANGE SCALING
// =============================================================================

/**
 * Current maximum wind range for the active round.
 * Updated by generateRandomWind() when called with a custom range.
 * Used for normalizing the wind indicator display.
 * @type {number}
 */
let currentMaxRange = PHYSICS.WIND_RANGE;

/**
 * Get the wind range for a given round number.
 * Wind becomes more extreme in later rounds, making shots harder to land.
 *
 * Wind Scaling Table:
 * - Rounds 1-3:  ±5  (Light wind)
 * - Rounds 4-6:  ±8  (Moderate wind)
 * - Rounds 7-9:  ±10 (Strong wind - default max)
 * - Rounds 10+:  ±12 (Extreme wind - extended range)
 *
 * @param {number} roundNumber - Current round (1-based)
 * @returns {number} Maximum wind range for this round
 */
export function getWindRangeForRound(roundNumber) {
    if (roundNumber <= 3) return 5;
    if (roundNumber <= 6) return 8;
    if (roundNumber <= 9) return 10;
    return 12; // Extended range for late game
}

// =============================================================================
// WIND MANAGEMENT
// =============================================================================

/**
 * Generate a new random wind value for the round.
 * Wind ranges from -maxRange to +maxRange.
 * Can produce both left (negative) and right (positive) wind.
 *
 * @param {number} [maxRange=PHYSICS.WIND_RANGE] - Maximum wind range (default: 10)
 * @returns {number} The new wind value
 */
export function generateRandomWind(maxRange = PHYSICS.WIND_RANGE) {
    // Store the current max range for wind indicator normalization
    currentMaxRange = maxRange;

    // Generate random value from -maxRange to +maxRange
    // Math.random() gives 0-1, multiply by 2 * range and subtract range
    // to get the full range from -range to +range
    currentWind = (Math.random() * 2 * maxRange) - maxRange;

    // Round to 1 decimal place for cleaner display
    currentWind = Math.round(currentWind * 10) / 10;

    console.log(`Wind generated: ${currentWind > 0 ? '+' : ''}${currentWind.toFixed(1)} (${getWindDirectionText()}, range: ±${maxRange})`);

    return currentWind;
}

/**
 * Get the current wind value.
 * @returns {number} Current wind value (-10 to +10)
 */
export function getWind() {
    return currentWind;
}

/**
 * Get the wind force to apply to projectile velocity each frame.
 * This converts the wind value to an actual velocity change per frame.
 *
 * @returns {number} Wind force in pixels per frame
 */
export function getWindForce() {
    return currentWind * PHYSICS.WIND_FORCE_MULTIPLIER;
}

/**
 * Set the wind to a specific value (for testing or special scenarios).
 * Clamps to the current round's max range.
 * @param {number} value - Wind value to set
 */
export function setWind(value) {
    currentWind = Math.max(-currentMaxRange, Math.min(currentMaxRange, value));
}

/**
 * Reset wind to zero (calm conditions).
 */
export function resetWind() {
    currentWind = 0;
}

// =============================================================================
// WIND DISPLAY HELPERS
// =============================================================================

/**
 * Get the wind direction as human-readable text.
 * @returns {string} 'LEFT', 'RIGHT', or 'CALM'
 */
export function getWindDirectionText() {
    if (currentWind < -0.5) return 'LEFT';
    if (currentWind > 0.5) return 'RIGHT';
    return 'CALM';
}

/**
 * Get the wind strength as a descriptive string.
 * Thresholds scale with the current max range.
 * @returns {string} 'CALM', 'LIGHT', 'MODERATE', 'STRONG', or 'GALE'
 */
export function getWindStrengthText() {
    const absWind = Math.abs(currentWind);
    // Scale thresholds based on current max range
    const scale = currentMaxRange / 10;
    if (absWind < 0.5) return 'CALM';
    if (absWind < 2.5 * scale) return 'LIGHT';
    if (absWind < 5 * scale) return 'MODERATE';
    if (absWind < 7.5 * scale) return 'STRONG';
    return 'GALE';
}

/**
 * Get the normalized wind strength (0-1 scale).
 * Used for scaling visual indicators.
 * Uses the current round's max range for proper normalization.
 * @returns {number} Normalized strength (0 = calm, 1 = max wind)
 */
export function getNormalizedStrength() {
    return Math.abs(currentWind) / currentMaxRange;
}

/**
 * Get the current maximum wind range.
 * Useful for UI display to show the possible range.
 * @returns {number} Current maximum wind range
 */
export function getCurrentMaxRange() {
    return currentMaxRange;
}

// =============================================================================
// WIND INDICATOR RENDERING
// =============================================================================

/**
 * Render the wind indicator UI.
 * Displays an arrow showing wind direction and strength.
 * Arrow size scales with wind strength.
 *
 * Visual design:
 * - Background pill shape with label "WIND"
 * - Arrow pointing in wind direction
 * - Arrow length proportional to wind strength
 * - Color: Neon cyan for left, neon pink for right, muted for calm
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function renderWindIndicator(ctx) {
    const x = UI.WIND_INDICATOR_X;
    const y = UI.WIND_INDICATOR_Y;

    ctx.save();

    // Background pill dimensions
    const pillWidth = 140;
    const pillHeight = 40;
    const pillX = x - pillWidth / 2;
    const pillY = y - pillHeight / 2;

    // Draw background pill
    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 8);
    ctx.fill();

    // Determine color based on wind direction
    let color = COLORS.TEXT_MUTED; // Calm
    if (currentWind < -0.5) {
        color = COLORS.NEON_CYAN; // Left wind
    } else if (currentWind > 0.5) {
        color = COLORS.NEON_PINK; // Right wind
    }

    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw "WIND" label
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `${UI.FONT_SIZE_SMALL}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('WIND', pillX + 10, y);

    // Calculate arrow properties
    const arrowCenterX = x + 30; // Center of arrow area
    const arrowCenterY = y;
    const normalizedStrength = getNormalizedStrength();
    const arrowWidth = normalizedStrength * UI.WIND_ARROW_MAX_WIDTH;

    // Draw wind arrow (or calm indicator)
    if (Math.abs(currentWind) < 0.5) {
        // Draw calm indicator (small circle)
        ctx.beginPath();
        ctx.arc(arrowCenterX, arrowCenterY, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    } else {
        // Draw arrow pointing in wind direction
        drawWindArrow(ctx, arrowCenterX, arrowCenterY, arrowWidth, currentWind > 0, color);
    }

    ctx.restore();
}

/**
 * Draw a wind arrow.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} centerX - Center X position of arrow
 * @param {number} centerY - Center Y position of arrow
 * @param {number} width - Total width of arrow
 * @param {boolean} pointRight - True if arrow points right, false for left
 * @param {string} color - Arrow color
 */
function drawWindArrow(ctx, centerX, centerY, width, pointRight, color) {
    const arrowHeight = UI.WIND_ARROW_HEIGHT;
    const headWidth = Math.min(width * 0.4, 15); // Arrow head width
    const shaftWidth = width - headWidth;

    ctx.save();

    // Apply glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Calculate positions based on direction
    const direction = pointRight ? 1 : -1;
    const startX = centerX - direction * (width / 2);
    const endX = centerX + direction * (width / 2);
    const shaftEndX = startX + direction * shaftWidth;

    ctx.beginPath();

    // Draw arrow shape
    // Start at shaft back-top
    ctx.moveTo(startX, centerY - arrowHeight / 4);

    // Shaft top edge
    ctx.lineTo(shaftEndX, centerY - arrowHeight / 4);

    // Arrow head top
    ctx.lineTo(shaftEndX, centerY - arrowHeight / 2);

    // Arrow point
    ctx.lineTo(endX, centerY);

    // Arrow head bottom
    ctx.lineTo(shaftEndX, centerY + arrowHeight / 2);

    // Shaft bottom edge
    ctx.lineTo(shaftEndX, centerY + arrowHeight / 4);

    // Shaft back-bottom
    ctx.lineTo(startX, centerY + arrowHeight / 4);

    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

/**
 * Render a compact wind indicator (number + arrow) for space-constrained areas.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export function renderWindCompact(ctx, x, y) {
    ctx.save();

    // Determine color
    let color = COLORS.TEXT_MUTED;
    if (currentWind < -0.5) color = COLORS.NEON_CYAN;
    if (currentWind > 0.5) color = COLORS.NEON_PINK;

    // Draw wind value
    ctx.fillStyle = color;
    ctx.font = `bold ${UI.FONT_SIZE_MEDIUM}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Format: show direction symbol and value
    let windText;
    if (Math.abs(currentWind) < 0.5) {
        windText = '---'; // Calm
    } else if (currentWind < 0) {
        windText = `<<< ${Math.abs(currentWind).toFixed(1)}`; // Left
    } else {
        windText = `${currentWind.toFixed(1)} >>>`; // Right
    }

    ctx.fillText(windText, x, y);

    ctx.restore();
}
