/**
 * Weapon Icon Generator Script
 *
 * Generates 64x64 PNG placeholder icons for all weapons.
 * Run with: node scripts/generate-weapon-icons.js
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images', 'ui');

// Icon size
const SIZE = 64;

// Weapon definitions with colors and shapes
const WEAPONS = {
    'basic-shot': { name: 'Basic', color: '#00ffff', shape: 'circle' },
    'missile': { name: 'Missile', color: '#ff6600', shape: 'triangle' },
    'big-shot': { name: 'Big Shot', color: '#ffff00', shape: 'largeCircle' },
    'mirv': { name: 'MIRV', color: '#ff00ff', shape: 'star5' },
    'deaths-head': { name: "Death's Head", color: '#ff0044', shape: 'star9' },
    'roller': { name: 'Roller', color: '#00ff88', shape: 'roller' },
    'heavy-roller': { name: 'Heavy Roller', color: '#006633', shape: 'heavyRoller' },
    'digger': { name: 'Digger', color: '#996633', shape: 'arrow' },
    'heavy-digger': { name: 'Heavy Digger', color: '#663300', shape: 'thickArrow' },
    'mini-nuke': { name: 'Mini Nuke', color: '#ffcc00', shape: 'radiation' },
    'nuke': { name: 'Nuke', color: '#ff4400', shape: 'radiationLarge' }
};

/**
 * Draw a star shape
 */
function drawStar(ctx, cx, cy, points, outerR, innerR) {
    const step = Math.PI / points;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = -Math.PI / 2 + i * step;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
}

/**
 * Draw the shape for a weapon
 */
function drawShape(ctx, shape, color) {
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE * 0.35;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    switch (shape) {
        case 'circle':
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;

        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r, cy + r * 0.8);
            ctx.lineTo(cx - r, cy + r * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;

        case 'largeCircle':
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'star5':
            drawStar(ctx, cx, cy, 5, r * 0.9, r * 0.4);
            ctx.fill();
            ctx.stroke();
            break;

        case 'star9':
            drawStar(ctx, cx, cy, 9, r * 0.9, r * 0.5);
            ctx.fill();
            ctx.stroke();
            break;

        case 'roller':
            ctx.beginPath();
            ctx.arc(cx, cy - 4, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Ground line
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.9, cy + r * 0.5);
            ctx.lineTo(cx + r * 0.9, cy + r * 0.5);
            ctx.stroke();
            break;

        case 'heavyRoller':
            ctx.beginPath();
            ctx.arc(cx, cy - 4, r * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Ground lines
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.95, cy + r * 0.5);
            ctx.lineTo(cx + r * 0.95, cy + r * 0.5);
            ctx.moveTo(cx - r * 0.9, cy + r * 0.7);
            ctx.lineTo(cx + r * 0.9, cy + r * 0.7);
            ctx.stroke();
            break;

        case 'arrow':
            // Down arrow (digger)
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx + r * 0.7, cy - r * 0.3);
            ctx.lineTo(cx + r * 0.3, cy - r * 0.3);
            ctx.lineTo(cx + r * 0.3, cy - r);
            ctx.lineTo(cx - r * 0.3, cy - r);
            ctx.lineTo(cx - r * 0.3, cy - r * 0.3);
            ctx.lineTo(cx - r * 0.7, cy - r * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;

        case 'thickArrow':
            // Thicker down arrow
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx + r * 0.8, cy - r * 0.2);
            ctx.lineTo(cx + r * 0.4, cy - r * 0.2);
            ctx.lineTo(cx + r * 0.4, cy - r);
            ctx.lineTo(cx - r * 0.4, cy - r);
            ctx.lineTo(cx - r * 0.4, cy - r * 0.2);
            ctx.lineTo(cx - r * 0.8, cy - r * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;

        case 'radiation':
        case 'radiationLarge':
            // Radiation symbol (3 sectors)
            const radius = shape === 'radiationLarge' ? r * 0.9 : r * 0.8;
            const sectors = 3;
            const sectorAngle = (Math.PI * 2) / sectors;
            ctx.beginPath();
            for (let i = 0; i < sectors; i++) {
                const angle = -Math.PI / 2 + i * sectorAngle;
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, angle, angle + sectorAngle * 0.6);
                ctx.closePath();
            }
            ctx.fill();
            // Center dot
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = '#1a0a2e';
            ctx.fill();
            break;
    }
}

/**
 * Generate a single weapon icon
 */
function generateIcon(weaponId, config) {
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    // Background - dark with subtle synthwave gradient
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Add subtle glow effect
    ctx.shadowColor = config.color;
    ctx.shadowBlur = 8;

    // Draw the weapon shape
    drawShape(ctx, config.shape, config.color);

    // Reset shadow
    ctx.shadowBlur = 0;

    return canvas.toBuffer('image/png');
}

/**
 * Main function
 */
function main() {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('Generating weapon icons...\n');

    for (const [weaponId, config] of Object.entries(WEAPONS)) {
        const filename = `weapon-icon-${weaponId}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);

        const buffer = generateIcon(weaponId, config);
        fs.writeFileSync(filepath, buffer);

        console.log(`  ✓ ${filename} (${config.name})`);
    }

    console.log(`\nGenerated ${Object.keys(WEAPONS).length} weapon icons in ${OUTPUT_DIR}`);
}

main();
