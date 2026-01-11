/**
 * Reusable Button component for canvas menu UI.
 * Provides a standardized, neon-styled button with configurable appearance and states.
 *
 * @module ui/Button
 */

import { COLORS, UI } from '../constants.js';

// =============================================================================
// BUTTON DEFAULTS
// =============================================================================

/**
 * Default button styling configuration.
 */
const BUTTON_DEFAULTS = {
    // Dimensions
    width: 200,
    height: 50,
    padding: 16,
    borderRadius: 8,

    // Font
    fontSize: UI.FONT_SIZE_LARGE,
    fontFamily: UI.FONT_FAMILY,

    // Colors
    bgColor: 'rgba(26, 26, 46, 0.8)',
    borderColor: COLORS.NEON_CYAN,
    textColor: COLORS.TEXT_LIGHT,
    glowColor: COLORS.NEON_CYAN,

    // Disabled state colors
    disabledBgColor: 'rgba(26, 26, 46, 0.5)',
    disabledBorderColor: COLORS.TEXT_MUTED,
    disabledTextColor: COLORS.TEXT_MUTED,

    // Hover state adjustments
    hoverBrightnessBoost: 1.3,
    hoverGlowBoost: 1.5,

    // Active/pressed state adjustments
    activeBrightnessBoost: 0.9,
    activeScaleReduction: 0.98,

    // Glow settings
    borderWidth: 2,
    glowBlur: 15,
    glowPulseRange: 10, // Additional blur on pulse
    textGlowBlur: 4,
    textGlowPulseRange: 2
};

// =============================================================================
// BUTTON CLASS
// =============================================================================

/**
 * Reusable canvas button with neon styling and state management.
 */
export class Button {
    /**
     * Create a new Button instance.
     * @param {Object} config - Button configuration
     * @param {string} config.text - Button label text
     * @param {number} config.x - Center X position
     * @param {number} config.y - Center Y position
     * @param {number} [config.width] - Button width (auto-sized if not provided)
     * @param {number} [config.height] - Button height (auto-sized if not provided)
     * @param {number} [config.fontSize] - Text font size in pixels
     * @param {number} [config.padding] - Internal padding around text
     * @param {string} [config.fontFamily] - Font family for text
     * @param {string} [config.bgColor] - Background color
     * @param {string} [config.borderColor] - Border color
     * @param {string} [config.textColor] - Text color
     * @param {string} [config.glowColor] - Glow effect color
     * @param {number} [config.borderRadius] - Corner radius
     * @param {number} [config.borderWidth] - Border line width
     * @param {boolean} [config.disabled=false] - Whether button is disabled
     * @param {boolean} [config.autoSize=true] - Auto-size based on text if width/height not provided
     * @param {Function} [config.onClick] - Click callback function
     */
    constructor(config) {
        // Text content
        this.text = config.text || '';

        // Position (center-based, matching existing convention)
        this.x = config.x || 0;
        this.y = config.y || 0;

        // Font settings
        this.fontSize = config.fontSize ?? BUTTON_DEFAULTS.fontSize;
        this.fontFamily = config.fontFamily ?? BUTTON_DEFAULTS.fontFamily;
        this.padding = config.padding ?? BUTTON_DEFAULTS.padding;

        // Colors
        this.bgColor = config.bgColor ?? BUTTON_DEFAULTS.bgColor;
        this.borderColor = config.borderColor ?? BUTTON_DEFAULTS.borderColor;
        this.textColor = config.textColor ?? BUTTON_DEFAULTS.textColor;
        this.glowColor = config.glowColor ?? BUTTON_DEFAULTS.glowColor;

        // Border settings
        this.borderRadius = config.borderRadius ?? BUTTON_DEFAULTS.borderRadius;
        this.borderWidth = config.borderWidth ?? BUTTON_DEFAULTS.borderWidth;

        // Dimensions - auto-size if not provided
        this._explicitWidth = config.width;
        this._explicitHeight = config.height;
        this._autoSize = config.autoSize !== false;

        // Calculate dimensions (will be recalculated on render if auto-sizing)
        this.width = config.width ?? BUTTON_DEFAULTS.width;
        this.height = config.height ?? BUTTON_DEFAULTS.height;

        // State
        this.disabled = config.disabled ?? false;
        this.enabled = !this.disabled; // Legacy compatibility
        this._hovered = false;
        this._pressed = false;

        // Callback
        this.onClick = config.onClick || null;

        // Cache for text measurement
        this._measuredWidth = null;
        this._lastMeasuredText = null;
        this._lastMeasuredFont = null;
    }

    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================

    /**
     * Set whether the button is disabled.
     * @param {boolean} disabled - Disabled state
     */
    setDisabled(disabled) {
        this.disabled = disabled;
        this.enabled = !disabled;
        if (disabled) {
            this._hovered = false;
            this._pressed = false;
        }
    }

    /**
     * Set the hovered state.
     * @param {boolean} hovered - Whether button is hovered
     */
    setHovered(hovered) {
        if (!this.disabled) {
            this._hovered = hovered;
        }
    }

    /**
     * Set the pressed state.
     * @param {boolean} pressed - Whether button is pressed
     */
    setPressed(pressed) {
        if (!this.disabled) {
            this._pressed = pressed;
        }
    }

    /**
     * Check if button is currently hovered.
     * @returns {boolean}
     */
    isHovered() {
        return this._hovered && !this.disabled;
    }

    /**
     * Check if button is currently pressed.
     * @returns {boolean}
     */
    isPressed() {
        return this._pressed && !this.disabled;
    }

    // =========================================================================
    // POSITIONING AND HIT DETECTION
    // =========================================================================

    /**
     * Update button position.
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Update button dimensions.
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     */
    setSize(width, height) {
        this._explicitWidth = width;
        this._explicitHeight = height;
        this.width = width;
        this.height = height;
    }

    /**
     * Get button bounds (top-left based).
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check if a point is inside the button.
     * @param {number} x - X coordinate in design space
     * @param {number} y - Y coordinate in design space
     * @returns {boolean}
     */
    containsPoint(x, y) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        return (
            x >= this.x - halfWidth &&
            x <= this.x + halfWidth &&
            y >= this.y - halfHeight &&
            y <= this.y + halfHeight
        );
    }

    /**
     * Alias for containsPoint for legacy compatibility.
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean}
     */
    isInside(x, y) {
        return this.containsPoint(x, y);
    }

    // =========================================================================
    // INPUT HANDLING
    // =========================================================================

    /**
     * Handle pointer down on button.
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if button was hit
     */
    handlePointerDown(x, y) {
        if (this.disabled) return false;

        if (this.containsPoint(x, y)) {
            this._pressed = true;
            return true;
        }
        return false;
    }

    /**
     * Handle pointer up. Triggers onClick if button was pressed and pointer is still inside.
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if click was triggered
     */
    handlePointerUp(x, y) {
        const wasPressed = this._pressed;
        this._pressed = false;

        if (this.disabled) return false;

        if (wasPressed && this.containsPoint(x, y)) {
            if (this.onClick) {
                this.onClick();
            }
            return true;
        }
        return false;
    }

    /**
     * Handle pointer move for hover state.
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if hover state changed
     */
    handlePointerMove(x, y) {
        if (this.disabled) {
            this._hovered = false;
            return false;
        }

        const wasHovered = this._hovered;
        this._hovered = this.containsPoint(x, y);
        return wasHovered !== this._hovered;
    }

    // =========================================================================
    // AUTO-SIZING
    // =========================================================================

    /**
     * Measure text width using a canvas context.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @returns {number} Text width in pixels
     */
    _measureText(ctx) {
        const font = `bold ${this.fontSize}px ${this.fontFamily}`;

        // Use cached measurement if text and font haven't changed
        if (this._lastMeasuredText === this.text && this._lastMeasuredFont === font) {
            return this._measuredWidth;
        }

        ctx.save();
        ctx.font = font;
        this._measuredWidth = ctx.measureText(this.text).width;
        this._lastMeasuredText = this.text;
        this._lastMeasuredFont = font;
        ctx.restore();

        return this._measuredWidth;
    }

    /**
     * Calculate auto-sized dimensions based on text content.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    _updateAutoSize(ctx) {
        if (!this._autoSize) return;

        // Only auto-size dimensions that weren't explicitly set
        if (this._explicitWidth === undefined) {
            const textWidth = this._measureText(ctx);
            this.width = textWidth + this.padding * 2;
        }

        if (this._explicitHeight === undefined) {
            this.height = this.fontSize + this.padding * 2;
        }
    }

    // =========================================================================
    // RENDERING
    // =========================================================================

    /**
     * Render the button to a canvas context.
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {number} [pulseIntensity=0] - Glow pulse intensity (0-1)
     */
    render(ctx, pulseIntensity = 0) {
        // Update auto-size if needed
        this._updateAutoSize(ctx);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const btnX = this.x - halfWidth;
        const btnY = this.y - halfHeight;

        ctx.save();

        // Apply scale for pressed state
        if (this._pressed && !this.disabled) {
            const scale = BUTTON_DEFAULTS.activeScaleReduction;
            ctx.translate(this.x, this.y);
            ctx.scale(scale, scale);
            ctx.translate(-this.x, -this.y);
        }

        // Determine colors based on state
        let bgColor = this.bgColor;
        let borderColor = this.borderColor;
        let textColor = this.textColor;
        let glowColor = this.glowColor;
        let glowIntensity = pulseIntensity;

        if (this.disabled) {
            bgColor = BUTTON_DEFAULTS.disabledBgColor;
            borderColor = BUTTON_DEFAULTS.disabledBorderColor;
            textColor = BUTTON_DEFAULTS.disabledTextColor;
            glowIntensity = 0;
        } else if (this._hovered) {
            glowIntensity = Math.min(1, pulseIntensity * BUTTON_DEFAULTS.hoverGlowBoost + 0.3);
        }

        // Button background with rounded corners
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, this.width, this.height, this.borderRadius);
        ctx.fill();

        // Neon border effect with outer glow
        if (!this.disabled) {
            // Outer glow layer - softer, wider glow
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = BUTTON_DEFAULTS.glowBlur + glowIntensity * BUTTON_DEFAULTS.glowPulseRange;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = this.borderWidth;
            ctx.beginPath();
            ctx.roundRect(btnX, btnY, this.width, this.height, this.borderRadius);
            ctx.stroke();

            // Inner border - crisp line without shadow
            ctx.shadowBlur = 0;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = this.borderWidth;
            ctx.beginPath();
            ctx.roundRect(btnX, btnY, this.width, this.height, this.borderRadius);
            ctx.stroke();
        } else {
            // Disabled button border
            ctx.strokeStyle = BUTTON_DEFAULTS.disabledBorderColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(btnX, btnY, this.width, this.height, this.borderRadius);
            ctx.stroke();
        }

        // Reset shadow for text
        ctx.shadowBlur = 0;

        // Button text with subtle glow
        if (!this.disabled) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = BUTTON_DEFAULTS.textGlowBlur + glowIntensity * BUTTON_DEFAULTS.textGlowPulseRange;
        }
        ctx.fillStyle = textColor;
        ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x, this.y);

        ctx.restore();
    }

    /**
     * Render the button with a badge notification count.
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {number} pulseIntensity - Glow pulse intensity (0-1)
     * @param {number} badgeCount - Number to show in badge (0 = no badge)
     */
    renderWithBadge(ctx, pulseIntensity = 0, badgeCount = 0) {
        // Render the base button first
        this.render(ctx, pulseIntensity);

        // Render badge if count > 0
        if (badgeCount > 0 && !this.disabled) {
            const bounds = this.getBounds();
            const badgeRadius = 12;
            const badgeX = bounds.x + this.width - 8;
            const badgeY = bounds.y + 8;

            ctx.save();

            // Badge background (red circle with glow)
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10 + pulseIntensity * 5;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Badge border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Badge text
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${UI.FONT_SIZE_SMALL}px ${this.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const badgeText = badgeCount > 9 ? '9+' : String(badgeCount);
            ctx.fillText(badgeText, badgeX, badgeY);

            ctx.restore();
        }
    }
}

// =============================================================================
// BUTTON FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a primary action button (cyan neon style).
 * @param {Object} config - Button configuration (see Button constructor)
 * @returns {Button}
 */
export function createPrimaryButton(config) {
    return new Button({
        ...config,
        borderColor: COLORS.NEON_CYAN,
        glowColor: COLORS.NEON_CYAN,
        textColor: COLORS.TEXT_LIGHT
    });
}

/**
 * Create a secondary/accent button (pink neon style).
 * @param {Object} config - Button configuration (see Button constructor)
 * @returns {Button}
 */
export function createSecondaryButton(config) {
    return new Button({
        ...config,
        borderColor: COLORS.NEON_PINK,
        glowColor: COLORS.NEON_PINK,
        textColor: COLORS.TEXT_LIGHT
    });
}

/**
 * Create a warning/danger button (orange neon style).
 * @param {Object} config - Button configuration (see Button constructor)
 * @returns {Button}
 */
export function createDangerButton(config) {
    return new Button({
        ...config,
        borderColor: COLORS.NEON_ORANGE,
        glowColor: COLORS.NEON_ORANGE,
        textColor: COLORS.TEXT_LIGHT
    });
}

export default Button;
