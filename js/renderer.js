/**
 * Scorched Earth: Synthwave Edition
 * Canvas rendering module
 */

import { CANVAS, COLORS } from './constants.js';

// Canvas and context references
let canvas = null;
let ctx = null;

// Scaling state for coordinate conversion
// scaleFactor converts from design coordinates (1200x800) to actual canvas coordinates
let scaleFactor = 1;
let devicePixelRatio = 1;

// Debounce timer for resize events
let resizeTimeout = null;
const RESIZE_DEBOUNCE_MS = 100;

/**
 * Initialize the renderer by getting canvas element by ID
 * @param {string} [canvasId='game'] - The canvas element ID
 * @returns {CanvasRenderingContext2D|null} The 2D context if successful, null otherwise
 */
export function init(canvasId = 'game') {
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

    // Handle window resize with debouncing
    window.addEventListener('resize', handleResize);

    // Handle mobile orientation changes
    window.addEventListener('orientationchange', handleResize);

    // Render black rectangle as initialization test
    renderTestRectangle();

    console.log('Renderer initialized');
    return ctx;
}

/**
 * Render a black rectangle as a test to verify canvas is working.
 * Uses design coordinates (1200x800) since context is already transformed.
 */
function renderTestRectangle() {
    if (!ctx || !canvas) return;

    // Clear with background color (use design dimensions)
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);

    // Draw a black test rectangle in center using design coordinates
    const rectWidth = 200;
    const rectHeight = 100;
    const x = (CANVAS.DESIGN_WIDTH - rectWidth) / 2;
    const y = (CANVAS.DESIGN_HEIGHT - rectHeight) / 2;

    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, rectWidth, rectHeight);

    // Draw border for visibility
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, rectWidth, rectHeight);

    console.log('Test rectangle rendered at design coordinates');
}

/**
 * Debounced resize handler to avoid excessive resize calls
 */
function handleResize() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
        resizeCanvas();
        resizeTimeout = null;
    }, RESIZE_DEBOUNCE_MS);
}

/**
 * Resize canvas to fit window while maintaining 3:2 aspect ratio.
 * Accounts for devicePixelRatio for crisp rendering on high-DPI displays.
 *
 * The canvas is scaled to fill the viewport while maintaining aspect ratio.
 * CSS width/height control display size, canvas.width/height control resolution.
 */
export function resizeCanvas() {
    if (!canvas) return;

    // Get current device pixel ratio (may change if window moved between displays)
    devicePixelRatio = window.devicePixelRatio || 1;

    // Get available viewport size
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate the display size (CSS pixels) that maintains aspect ratio
    // while filling as much of the viewport as possible
    let displayWidth, displayHeight;

    const viewportAspect = viewportWidth / viewportHeight;

    if (viewportAspect > CANVAS.ASPECT_RATIO) {
        // Viewport is wider than our aspect ratio - constrain by height
        displayHeight = viewportHeight;
        displayWidth = displayHeight * CANVAS.ASPECT_RATIO;
    } else {
        // Viewport is taller than our aspect ratio - constrain by width
        displayWidth = viewportWidth;
        displayHeight = displayWidth / CANVAS.ASPECT_RATIO;
    }

    // Set CSS display size
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Center the canvas in the viewport
    canvas.style.position = 'absolute';
    canvas.style.left = `${(viewportWidth - displayWidth) / 2}px`;
    canvas.style.top = `${(viewportHeight - displayHeight) / 2}px`;

    // Set internal resolution (accounts for device pixel ratio for crisp rendering)
    // The canvas resolution scales with the display to match high-DPI screens
    const resolutionWidth = Math.floor(displayWidth * devicePixelRatio);
    const resolutionHeight = Math.floor(displayHeight * devicePixelRatio);

    canvas.width = resolutionWidth;
    canvas.height = resolutionHeight;

    // Calculate scale factor: converts design coordinates to canvas coordinates
    // Design space is CANVAS.DESIGN_WIDTH x CANVAS.DESIGN_HEIGHT (1200x800)
    // This allows game logic to work in consistent design coordinates
    scaleFactor = resolutionWidth / CANVAS.DESIGN_WIDTH;

    // Scale the context to match the design coordinate system
    // This means all drawing operations can use design coordinates directly
    if (ctx) {
        ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    }

    console.log(
        `Canvas resized: display=${Math.round(displayWidth)}x${Math.round(displayHeight)}, ` +
        `resolution=${resolutionWidth}x${resolutionHeight}, ` +
        `dpr=${devicePixelRatio}, scale=${scaleFactor.toFixed(3)}`
    );
}

/**
 * Clear the canvas with the background color.
 * Uses design coordinates since context is already scaled.
 */
export function clear() {
    if (!ctx) return;
    ctx.fillStyle = COLORS.BACKGROUND;
    // Use design dimensions since the context transform handles scaling
    ctx.fillRect(0, 0, CANVAS.DESIGN_WIDTH, CANVAS.DESIGN_HEIGHT);
}

/**
 * Get the design width (game logic should use this)
 * @returns {number} Design width (1200)
 */
export function getWidth() {
    return CANVAS.DESIGN_WIDTH;
}

/**
 * Get the design height (game logic should use this)
 * @returns {number} Design height (800)
 */
export function getHeight() {
    return CANVAS.DESIGN_HEIGHT;
}

/**
 * Get the actual canvas resolution width (for advanced use)
 * @returns {number} Actual canvas width in pixels
 */
export function getActualWidth() {
    return canvas ? canvas.width : 0;
}

/**
 * Get the actual canvas resolution height (for advanced use)
 * @returns {number} Actual canvas height in pixels
 */
export function getActualHeight() {
    return canvas ? canvas.height : 0;
}

/**
 * Get the current scale factor (design coordinates to canvas coordinates)
 * @returns {number} Scale factor
 */
export function getScaleFactor() {
    return scaleFactor;
}

/**
 * Get the current device pixel ratio
 * @returns {number} Device pixel ratio
 */
export function getDevicePixelRatio() {
    return devicePixelRatio;
}

/**
 * Convert screen/mouse coordinates to design coordinates.
 * Use this when handling mouse/touch events.
 * @param {number} screenX - X coordinate from mouse/touch event
 * @param {number} screenY - Y coordinate from mouse/touch event
 * @returns {{x: number, y: number}} Design coordinates
 */
export function screenToDesign(screenX, screenY) {
    if (!canvas) return { x: 0, y: 0 };

    // Get canvas bounding rect (accounts for CSS positioning)
    const rect = canvas.getBoundingClientRect();

    // Convert screen coords to position relative to canvas display
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    // Convert to design coordinates
    // displayWidth / DESIGN_WIDTH gives us the CSS-to-design ratio
    const cssToDesign = CANVAS.DESIGN_WIDTH / rect.width;

    return {
        x: canvasX * cssToDesign,
        y: canvasY * cssToDesign
    };
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
