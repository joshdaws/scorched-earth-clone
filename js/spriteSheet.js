/**
 * Minimal sprite-sheet frame playback.
 *
 * The asset manifest already supports `frames` metadata
 * ({columns, rows, count, width, height}) via assetMetadata.js; this module is
 * the runtime player that maps an animation progress value onto a source-rect
 * draw from the sheet image.
 */

/**
 * Resolve the source rectangle for a frame index.
 * @param {{columns:number, rows:number, count:number, width:number, height:number, spacing?:number, margin?:number}} frames
 * @param {number} index - Frame index (clamped to count)
 * @returns {{sx:number, sy:number, sw:number, sh:number}}
 */
export function getFrameSourceRect(frames, index) {
    const count = Math.max(1, frames.count || frames.columns * frames.rows);
    const clamped = Math.max(0, Math.min(count - 1, Math.floor(index)));
    const column = clamped % frames.columns;
    const row = Math.floor(clamped / frames.columns);
    const spacing = frames.spacing || 0;
    const margin = frames.margin || 0;

    return {
        sx: margin + column * (frames.width + spacing),
        sy: margin + row * (frames.height + spacing),
        sw: frames.width,
        sh: frames.height
    };
}

/**
 * Map an animation progress value (0..1) to a frame index.
 * @param {{count:number, columns:number, rows:number}} frames
 * @param {number} progress - 0..1 animation progress
 * @returns {number}
 */
export function getFrameIndexForProgress(frames, progress) {
    const count = Math.max(1, frames.count || frames.columns * frames.rows);
    const clamped = Math.max(0, Math.min(1, progress));
    return Math.min(count - 1, Math.floor(clamped * count));
}

/**
 * Draw the sheet frame matching an animation progress, centered on (cx, cy).
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement|HTMLCanvasElement} image - Loaded sheet image
 * @param {{columns:number, rows:number, count:number, width:number, height:number}} frames
 * @param {number} progress - 0..1 animation progress
 * @param {number} cx - Destination center x
 * @param {number} cy - Destination center y
 * @param {number} drawWidth - Destination width
 * @param {number} drawHeight - Destination height
 * @returns {boolean} Whether a frame was drawn
 */
export function drawSheetFrameForProgress(ctx, image, frames, progress, cx, cy, drawWidth, drawHeight) {
    if (!image || !frames || !(frames.columns > 0) || !(frames.width > 0) || !(frames.height > 0)) {
        return false;
    }

    const index = getFrameIndexForProgress(frames, progress);
    const { sx, sy, sw, sh } = getFrameSourceRect(frames, index);

    ctx.drawImage(image, sx, sy, sw, sh, cx - drawWidth / 2, cy - drawHeight / 2, drawWidth, drawHeight);
    return true;
}
