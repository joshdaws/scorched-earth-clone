/**
 * Scorched Earth: Synthwave Edition
 * Canvas rendering module
 */

import { CANVAS, COLORS } from './constants.js';

// Canvas and context references
let canvas = null;
let ctx = null;

/**
 * Initialize the renderer with the canvas element
 * @param {HTMLCanvasElement} canvasElement - The canvas element to render to
 * @returns {boolean} True if initialization successful
 */
export function init(canvasElement) {
    if (!canvasElement) {
        console.error('Renderer: No canvas element provided');
        return false;
    }

    canvas = canvasElement;
    ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error('Renderer: Could not get 2D context');
        return false;
    }

    // Set initial canvas size
    resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    console.log('Renderer module initialized');
    return true;
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
