#!/usr/bin/env node
/**
 * Generate Placeholder Tank Sprites
 *
 * Creates simple 64x32 geometric placeholder sprites for all tank skins.
 * Each sprite shows a basic tank shape with rarity color coding.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images', 'tanks');

// Sprite dimensions (per manifest)
const WIDTH = 64;
const HEIGHT = 32;

// Rarity color schemes
const RARITY_COLORS = {
    common: {
        primary: '#6B7280',    // Gray-500
        secondary: '#9CA3AF',  // Gray-400
        border: '#D1D5DB',     // Gray-300
        glow: null
    },
    uncommon: {
        primary: '#059669',    // Emerald-600
        secondary: '#10B981',  // Emerald-500
        border: '#34D399',     // Emerald-400
        glow: '#10B981'
    },
    rare: {
        primary: '#2563EB',    // Blue-600
        secondary: '#3B82F6',  // Blue-500
        border: '#60A5FA',     // Blue-400
        glow: '#3B82F6'
    },
    epic: {
        primary: '#7C3AED',    // Violet-600
        secondary: '#8B5CF6',  // Violet-500
        border: '#A78BFA',     // Violet-400
        glow: '#8B5CF6'
    },
    legendary: {
        primary: '#D97706',    // Amber-600
        secondary: '#F59E0B',  // Amber-500
        border: '#FBBF24',     // Amber-400
        glow: '#F59E0B'
    }
};

// All tank definitions (from tank-skins.js)
const TANKS = [
    // Common (7)
    { id: 'standard', rarity: 'common', color: '#00FFFF' },
    { id: 'desert-camo', rarity: 'common', color: '#C2B280' },
    { id: 'forest-camo', rarity: 'common', color: '#228B22' },
    { id: 'arctic', rarity: 'common', color: '#E0FFFF' },
    { id: 'midnight', rarity: 'common', color: '#191970' },
    { id: 'crimson', rarity: 'common', color: '#DC143C' },
    { id: 'tactical-gray', rarity: 'common', color: '#708090' },

    // Uncommon (8)
    { id: 'neon-pink', rarity: 'uncommon', color: '#FF00FF' },
    { id: 'neon-cyan', rarity: 'uncommon', color: '#00FFFF' },
    { id: 'chrome', rarity: 'uncommon', color: '#C0C0C0' },
    { id: 'gold-plated', rarity: 'uncommon', color: '#FFD700' },
    { id: 'zebra', rarity: 'uncommon', color: '#000000', secondary: '#FFFFFF' },
    { id: 'tiger', rarity: 'uncommon', color: '#FF8C00', secondary: '#000000' },
    { id: 'digital-camo', rarity: 'uncommon', color: '#556B2F' },
    { id: 'sunset-gradient', rarity: 'uncommon', color: '#FF6B35' },

    // Rare (7)
    { id: 'delorean', rarity: 'rare', color: '#C0C0C0' },
    { id: 'tron-cycle', rarity: 'rare', color: '#00FFFF' },
    { id: 'miami-vice', rarity: 'rare', color: '#FF69B4' },
    { id: 'outrun', rarity: 'rare', color: '#FF00FF' },
    { id: 'hotline', rarity: 'rare', color: '#FF1493' },
    { id: 'cobra-commander', rarity: 'rare', color: '#0000FF' },
    { id: 'knight-rider', rarity: 'rare', color: '#000000', accent: '#FF0000' },

    // Epic (6)
    { id: 'flame-rider', rarity: 'epic', color: '#FF4500' },
    { id: 'lightning-strike', rarity: 'epic', color: '#00BFFF' },
    { id: 'holographic', rarity: 'epic', color: '#FF00FF' },
    { id: 'ghost-protocol', rarity: 'epic', color: '#87CEEB' },
    { id: 'plasma-core', rarity: 'epic', color: '#9400D3' },
    { id: 'starfield', rarity: 'epic', color: '#4B0082' },

    // Legendary (5)
    { id: 'blood-dragon', rarity: 'legendary', color: '#FF0066' },
    { id: 'terminator', rarity: 'legendary', color: '#FF0000' },
    { id: 'golden-god', rarity: 'legendary', color: '#FFD700' },
    { id: 'arcade-champion', rarity: 'legendary', color: '#00FF00' },
    { id: 'synthwave-supreme', rarity: 'legendary', color: '#FF00FF' }
];

/**
 * Draw a basic tank shape
 */
function drawTankShape(ctx, tankColor, rarity) {
    const colors = RARITY_COLORS[rarity];

    // Clear canvas with transparency
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw glow effect for uncommon+
    if (colors.glow) {
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 4;
    }

    // Tank body (main rectangle)
    ctx.fillStyle = tankColor;
    ctx.fillRect(8, 14, 48, 14);

    // Tank treads (darker bottom)
    ctx.fillStyle = darkenColor(tankColor, 0.3);
    ctx.fillRect(4, 24, 56, 6);

    // Turret (top dome shape)
    ctx.fillStyle = lightenColor(tankColor, 0.1);
    ctx.beginPath();
    ctx.ellipse(32, 14, 14, 8, 0, Math.PI, 0);
    ctx.fill();

    // Barrel
    ctx.fillStyle = darkenColor(tankColor, 0.2);
    ctx.fillRect(42, 8, 18, 4);

    // Barrel tip
    ctx.fillStyle = lightenColor(tankColor, 0.2);
    ctx.fillRect(56, 7, 6, 6);

    // Reset shadow
    ctx.shadowBlur = 0;

    // Border based on rarity
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;

    // Body outline
    ctx.strokeRect(8, 14, 48, 14);

    // Turret outline
    ctx.beginPath();
    ctx.ellipse(32, 14, 14, 8, 0, Math.PI, 0);
    ctx.stroke();
}

/**
 * Draw rarity indicator badge
 */
function drawRarityBadge(ctx, rarity) {
    const colors = RARITY_COLORS[rarity];

    // Small rarity indicator in corner
    const badgeSize = 6;
    const x = 2;
    const y = 2;

    // Badge background
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();

    if (rarity === 'legendary') {
        // Star shape for legendary
        drawStar(ctx, x + badgeSize/2, y + badgeSize/2, 5, badgeSize/2, badgeSize/4);
        ctx.fill();
    } else if (rarity === 'epic') {
        // Diamond for epic
        ctx.moveTo(x + badgeSize/2, y);
        ctx.lineTo(x + badgeSize, y + badgeSize/2);
        ctx.lineTo(x + badgeSize/2, y + badgeSize);
        ctx.lineTo(x, y + badgeSize/2);
        ctx.closePath();
        ctx.fill();
    } else if (rarity === 'rare') {
        // Triangle for rare
        ctx.moveTo(x + badgeSize/2, y);
        ctx.lineTo(x + badgeSize, y + badgeSize);
        ctx.lineTo(x, y + badgeSize);
        ctx.closePath();
        ctx.fill();
    } else if (rarity === 'uncommon') {
        // Circle for uncommon
        ctx.arc(x + badgeSize/2, y + badgeSize/2, badgeSize/2, 0, Math.PI * 2);
        ctx.fill();
    }
    // Common has no badge
}

/**
 * Draw a 5-pointed star
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

/**
 * Darken a hex color
 */
function darkenColor(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex(
        Math.floor(rgb.r * (1 - amount)),
        Math.floor(rgb.g * (1 - amount)),
        Math.floor(rgb.b * (1 - amount))
    );
}

/**
 * Lighten a hex color
 */
function lightenColor(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex(
        Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * amount)),
        Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * amount)),
        Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * amount))
    );
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.test(hex);
    if (result) {
        const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        return {
            r: parseInt(match[1], 16),
            g: parseInt(match[2], 16),
            b: parseInt(match[3], 16)
        };
    }
    return { r: 128, g: 128, b: 128 };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Generate a single tank sprite
 */
function generateTankSprite(tank) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Draw the tank
    drawTankShape(ctx, tank.color, tank.rarity);

    // Draw rarity badge
    drawRarityBadge(ctx, tank.rarity);

    return canvas;
}

/**
 * Main generation function
 */
function generateAllSprites() {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('Generating ' + TANKS.length + ' tank placeholder sprites...');
    console.log('Output directory: ' + OUTPUT_DIR);
    console.log('');

    let generated = 0;
    const byRarity = {};

    for (const tank of TANKS) {
        const canvas = generateTankSprite(tank);
        const filename = 'tank-' + tank.rarity + '-' + tank.id + '.png';
        const filepath = path.join(OUTPUT_DIR, filename);

        // Write PNG file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filepath, buffer);

        // Track by rarity
        byRarity[tank.rarity] = (byRarity[tank.rarity] || 0) + 1;
        generated++;

        console.log('  Created: ' + filename);
    }

    console.log('');
    console.log('Summary:');
    for (const rarity of Object.keys(byRarity)) {
        console.log('  ' + rarity + ': ' + byRarity[rarity] + ' sprites');
    }
    console.log('  Total: ' + generated + ' sprites generated');
}

// Run generation
generateAllSprites();
