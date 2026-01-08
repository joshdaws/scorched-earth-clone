/**
 * Scorched Earth: Synthwave Edition
 * Canvas rendering module
 */

import { CANVAS, COLORS } from './constants.js';

// Canvas and context references
let canvas = null;
let ctx = null;

/**
 * Initialize the renderer by getting canvas element by ID
 * @param {string} [canvasId='game-canvas'] - The canvas element ID
 * @returns {CanvasRenderingContext2D|null} The 2D context if successful, null otherwise
 */
export function init(canvasId = 'game-canvas') {
    // Get canvas element by ID
    canvas = document.getElementById(canvasId);

    if (!canvas) {
        console.error(`Renderer: Canvas element with id '${canvasId}' not found`);
        return null;
    }

    // Get 2D rendering context
    ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error('Renderer: Could not get 2D rendering context');
        return null;
    }

    // Set initial canvas size
    resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    // Render black rectangle as initialization test
    renderTestRectangle();

    console.log('Renderer initialized');
    return ctx;
}

/**
 * Render a black rectangle as a test to verify canvas is working
 */
function renderTestRectangle() {
    if (!ctx || !canvas) return;

    // Clear with background color
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a black test rectangle in center
    const rectWidth = 200;
    const rectHeight = 100;
    const x = (canvas.width - rectWidth) / 2;
    const y = (canvas.height - rectHeight) / 2;

    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, rectWidth, rectHeight);

    // Draw border for visibility
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, rectWidth, rectHeight);

    console.log('Test rectangle rendered');
}

/**
 * Resize canvas to fit window while maintaining aspect ratio
 */
export function resizeCanvas() {
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    console.log(`Canvas resized to ${width}x${height}`);
}

/**
 * Clear the canvas with the background color
 */
export function clear() {
    if (!ctx) return;
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Get the canvas width
 * @returns {number} Canvas width in pixels
 */
export function getWidth() {
    return canvas ? canvas.width : 0;
}

/**
 * Get the canvas height
 * @returns {number} Canvas height in pixels
 */
export function getHeight() {
    return canvas ? canvas.height : 0;
}

/**
 * Get the 2D rendering context
 * @returns {CanvasRenderingContext2D|null} The 2D context
 */
export function getContext() {
    return ctx;
}

/**
 * Get the canvas element
 * @returns {HTMLCanvasElement|null} The canvas element
 */
export function getCanvas() {
    return canvas;
}
