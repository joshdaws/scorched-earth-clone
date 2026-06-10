/**
 * Shared UI icon drawing with generated-asset rendering and glyph fallbacks.
 *
 * Star and lock icons appear across level select, level complete, and HUD
 * surfaces; this module keeps their look consistent and lets generated art
 * degrade gracefully to the original Unicode glyphs when assets are missing.
 */

import { get as getAsset } from './assets.js';
import { COLORS, UI } from './constants.js';

function isRenderable(image) {
    return Boolean(image && image.complete && image.naturalWidth > 0);
}

/**
 * Draw a star icon centered at (x, y).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Center x
 * @param {number} y - Center y
 * @param {number} size - Rendered width/height in px
 * @param {boolean} filled - Earned (gold) vs empty socket
 * @param {object} [options]
 * @param {number} [options.glow=0] - Extra glow blur for earned stars
 * @param {number} [options.alpha=1] - Draw alpha
 */
export function drawStarIcon(ctx, x, y, size, filled, options = {}) {
    const { glow = 0, alpha = 1 } = options;
    const sprite = getAsset(filled ? 'ui.starFilled' : 'ui.starEmpty');

    ctx.save();
    ctx.globalAlpha = alpha;

    if (isRenderable(sprite)) {
        if (filled && glow > 0) {
            ctx.shadowColor = COLORS.NEON_YELLOW;
            ctx.shadowBlur = glow;
        }
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
        ctx.restore();
        return;
    }

    // Glyph fallback keeps the original look when art has not loaded.
    ctx.font = `${Math.round(size)}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (filled) {
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.shadowColor = COLORS.NEON_YELLOW;
        ctx.shadowBlur = Math.max(6, glow);
        ctx.fillText('★', x, y);
    } else {
        ctx.fillStyle = 'rgba(136, 136, 153, 0.5)';
        ctx.fillText('☆', x, y);
    }
    ctx.restore();
}

/**
 * Draw a padlock icon centered at (x, y).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Center x
 * @param {number} y - Center y
 * @param {number} size - Rendered width/height in px
 * @param {number} [alpha=0.9] - Draw alpha
 */
export function drawLockIcon(ctx, x, y, size, alpha = 0.9) {
    const sprite = getAsset('ui.lock');

    ctx.save();
    ctx.globalAlpha = alpha;

    if (isRenderable(sprite)) {
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
        ctx.restore();
        return;
    }

    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = `bold ${Math.round(size * 0.8)}px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', x, y);
    ctx.restore();
}
