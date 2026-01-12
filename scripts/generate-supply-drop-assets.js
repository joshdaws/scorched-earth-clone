#!/usr/bin/env node
/**
 * Generate Supply Drop Animation Assets
 *
 * Creates placeholder assets for supply drop animation sequence:
 * - Cargo plane sprite
 * - Crate sprite
 * - Parachutes (5 rarity variants)
 * - Helicopter sprite (for Extraction reveal)
 * - Rarity banners
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images', 'supply-drop');

// Rarity colors
const RARITY_COLORS = {
    common: '#FFFFFF',
    uncommon: '#00FFFF',
    rare: '#8B5CF6',
    epic: '#FFD700',
    legendary: '#FF0066'
};

/**
 * Ensure output directory exists
 */
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Save canvas to PNG file
 */
function saveCanvas(canvas, filename) {
    const filepath = path.join(OUTPUT_DIR, filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);
    console.log('  Created: ' + filename);
    return filepath;
}

/**
 * Generate cargo plane sprite (128x48)
 */
function generatePlane() {
    const width = 128;
    const height = 48;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Clear with transparency
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Plane glow effect
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 8;

    // Fuselage - elongated ellipse
    ctx.fillStyle = '#1a1a3a';
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 50, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wings
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX - 35, centerY - 18);
    ctx.lineTo(centerX - 35, centerY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 20, centerY);
    ctx.lineTo(centerX + 35, centerY - 18);
    ctx.lineTo(centerX + 35, centerY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail fin
    ctx.beginPath();
    ctx.moveTo(centerX - 45, centerY);
    ctx.lineTo(centerX - 55, centerY - 15);
    ctx.lineTo(centerX - 40, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit glow
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#00FFFF';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(centerX + 40, centerY - 3, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engine pods
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a1a3a';
    ctx.strokeStyle = '#FF6B35';
    ctx.shadowColor = '#FF6B35';
    ctx.shadowBlur = 4;

    // Left engine
    ctx.fillRect(centerX - 30, centerY + 2, 12, 8);
    ctx.strokeRect(centerX - 30, centerY + 2, 12, 8);

    // Right engine
    ctx.fillRect(centerX + 18, centerY + 2, 12, 8);
    ctx.strokeRect(centerX + 18, centerY + 2, 12, 8);

    return saveCanvas(canvas, 'plane.png');
}

/**
 * Generate crate sprite (64x64)
 */
function generateCrate() {
    const size = 64;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);

    const padding = 4;

    // Crate shadow/depth
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(padding + 2, padding + 2, size - padding * 2, size - padding * 2);

    // Crate body
    ctx.fillStyle = '#3a2a1a';
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FF6B35';
    ctx.shadowBlur = 6;

    ctx.fillRect(padding, padding, size - padding * 2, size - padding * 2);
    ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);

    // Cross straps
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(size - padding, size - padding);
    ctx.moveTo(size - padding, padding);
    ctx.lineTo(padding, size - padding);
    ctx.stroke();

    // Horizontal strap
    ctx.beginPath();
    ctx.moveTo(padding, size / 2);
    ctx.lineTo(size - padding, size / 2);
    ctx.stroke();

    // Vertical strap
    ctx.beginPath();
    ctx.moveTo(size / 2, padding);
    ctx.lineTo(size / 2, size - padding);
    ctx.stroke();

    // Question mark
    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', size / 2, size / 2);

    return saveCanvas(canvas, 'crate.png');
}

/**
 * Generate parachute sprite (80x64)
 */
function generateParachute(rarity, color) {
    const width = 80;
    const height = 64;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const canopyTop = 8;
    const canopyBottom = 35;
    const canopyWidth = 70;

    // Parachute canopy glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // Canopy dome
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX - canopyWidth / 2, canopyBottom);
    ctx.quadraticCurveTo(centerX - canopyWidth / 2 - 5, canopyTop, centerX, canopyTop);
    ctx.quadraticCurveTo(centerX + canopyWidth / 2 + 5, canopyTop, centerX + canopyWidth / 2, canopyBottom);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.stroke();

    // Canopy segments
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.6;
    const segments = 5;
    for (let i = 1; i < segments; i++) {
        const x = centerX - canopyWidth / 2 + (canopyWidth / segments) * i;
        ctx.beginPath();
        ctx.moveTo(x, canopyBottom);
        ctx.quadraticCurveTo(x, canopyTop + 5, centerX, canopyTop);
        ctx.stroke();
    }

    // Suspension lines
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    const attachY = height - 8;

    ctx.beginPath();
    ctx.moveTo(centerX - canopyWidth / 2 + 5, canopyBottom);
    ctx.lineTo(centerX, attachY);
    ctx.moveTo(centerX - canopyWidth / 4, canopyBottom - 5);
    ctx.lineTo(centerX, attachY);
    ctx.moveTo(centerX, canopyBottom - 8);
    ctx.lineTo(centerX, attachY);
    ctx.moveTo(centerX + canopyWidth / 4, canopyBottom - 5);
    ctx.lineTo(centerX, attachY);
    ctx.moveTo(centerX + canopyWidth / 2 - 5, canopyBottom);
    ctx.lineTo(centerX, attachY);
    ctx.stroke();

    // Small attachment point
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, attachY, 3, 0, Math.PI * 2);
    ctx.fill();

    return saveCanvas(canvas, 'parachute-' + rarity + '.png');
}

/**
 * Generate rainbow parachute for legendary (animated would need spritesheet)
 */
function generateLegendaryParachute() {
    const width = 80;
    const height = 64;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const canopyTop = 8;
    const canopyBottom = 35;
    const canopyWidth = 70;

    // Rainbow gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#FF0066');
    gradient.addColorStop(0.2, '#FF6B35');
    gradient.addColorStop(0.4, '#FFD700');
    gradient.addColorStop(0.6, '#00FF00');
    gradient.addColorStop(0.8, '#00FFFF');
    gradient.addColorStop(1, '#FF00FF');

    // Parachute canopy glow
    ctx.shadowColor = '#FF00FF';
    ctx.shadowBlur = 15;

    // Canopy dome
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX - canopyWidth / 2, canopyBottom);
    ctx.quadraticCurveTo(centerX - canopyWidth / 2 - 5, canopyTop, centerX, canopyTop);
    ctx.quadraticCurveTo(centerX + canopyWidth / 2 + 5, canopyTop, centerX + canopyWidth / 2, canopyBottom);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.stroke();

    // Canopy segments
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFFFFF';
    ctx.globalAlpha = 0.7;
    const segments = 5;
    for (let i = 1; i < segments; i++) {
        const x = centerX - canopyWidth / 2 + (canopyWidth / segments) * i;
        ctx.beginPath();
        ctx.moveTo(x, canopyBottom);
        ctx.quadraticCurveTo(x, canopyTop + 5, centerX, canopyTop);
        ctx.stroke();
    }

    // Suspension lines
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    const attachY = height - 8;

    ctx.beginPath();
    ctx.moveTo(centerX - canopyWidth / 2 + 5, canopyBottom);
    ctx.lineTo(centerX, attachY);
    ctx.moveTo(centerX - canopyWidth / 4, canopyBottom - 5);
    ctx.lineTo(centerX, attachY);
    ctx.moveTo(centerX, canopyBottom - 8);
    ctx.lineTo(centerX, attachY);
    ctx.moveTo(centerX + canopyWidth / 4, canopyBottom - 5);
    ctx.lineTo(centerX, attachY);
    ctx.moveTo(centerX + canopyWidth / 2 - 5, canopyBottom);
    ctx.lineTo(centerX, attachY);
    ctx.stroke();

    // Gold attachment point
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(centerX, attachY, 4, 0, Math.PI * 2);
    ctx.fill();

    return saveCanvas(canvas, 'parachute-legendary.png');
}

/**
 * Generate helicopter sprite (96x48)
 */
function generateHelicopter() {
    const width = 96;
    const height = 48;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2 + 4;

    // Helicopter glow
    ctx.shadowColor = '#FF0066';
    ctx.shadowBlur = 8;

    // Main body
    ctx.fillStyle = '#1a1a3a';
    ctx.strokeStyle = '#FF0066';
    ctx.lineWidth = 2;

    // Fuselage
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 25, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cockpit bubble
    ctx.beginPath();
    ctx.ellipse(centerX + 15, centerY - 4, 12, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tail boom
    ctx.beginPath();
    ctx.moveTo(centerX - 25, centerY);
    ctx.lineTo(centerX - 45, centerY - 5);
    ctx.lineTo(centerX - 45, centerY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail rotor
    ctx.fillStyle = '#FF0066';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(centerX - 42, centerY, 4, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main rotor (blade blur effect)
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 15, 40, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotor hub
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a1a3a';
    ctx.strokeStyle = '#FF0066';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotor mast
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 12);
    ctx.lineTo(centerX, centerY - 18);
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cockpit glow
    ctx.fillStyle = '#FF0066';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(centerX + 18, centerY - 5, 6, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Skids
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#FF0066';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;

    // Left skid
    ctx.beginPath();
    ctx.moveTo(centerX - 15, centerY + 12);
    ctx.lineTo(centerX + 20, centerY + 12);
    ctx.stroke();

    // Right skid support
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY + 12);
    ctx.lineTo(centerX - 8, centerY + 8);
    ctx.moveTo(centerX + 12, centerY + 12);
    ctx.lineTo(centerX + 12, centerY + 8);
    ctx.stroke();

    // Cable/winch element
    ctx.strokeStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + 8);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();

    // Winch hook
    ctx.beginPath();
    ctx.arc(centerX, centerY + 22, 3, 0, Math.PI);
    ctx.stroke();

    return saveCanvas(canvas, 'helicopter.png');
}

/**
 * Generate rarity banner sprite
 */
function generateRarityBanner(rarity, color) {
    const width = 200;
    const height = 40;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);

    // Banner background with glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#0a0a1a';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Rounded rectangle banner
    const radius = 8;
    ctx.beginPath();
    ctx.roundRect(2, 2, width - 4, height - 4, radius);
    ctx.fill();
    ctx.stroke();

    // Rarity text
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rarity.toUpperCase(), width / 2, height / 2);

    return saveCanvas(canvas, 'banner-' + rarity + '.png');
}

/**
 * Main generation function
 */
function generateAllAssets() {
    ensureDir(OUTPUT_DIR);

    console.log('Generating supply drop placeholder assets...');
    console.log('Output directory: ' + OUTPUT_DIR);
    console.log('');

    let count = 0;

    // Generate plane
    generatePlane();
    count++;

    // Generate crate
    generateCrate();
    count++;

    // Generate parachutes for each rarity
    for (const [rarity, color] of Object.entries(RARITY_COLORS)) {
        if (rarity === 'legendary') {
            generateLegendaryParachute();
        } else {
            generateParachute(rarity, color);
        }
        count++;
    }

    // Generate helicopter
    generateHelicopter();
    count++;

    // Generate rarity banners
    for (const [rarity, color] of Object.entries(RARITY_COLORS)) {
        generateRarityBanner(rarity, color);
        count++;
    }

    console.log('');
    console.log('Summary:');
    console.log('  Total: ' + count + ' assets generated');
}

// Run generation
generateAllAssets();
