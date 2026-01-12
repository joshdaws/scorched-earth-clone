#!/usr/bin/env node
/**
 * Generate Synthwave Splash Screen Images
 *
 * Creates iOS splash screen images with synthwave aesthetic:
 * - Dark background (#0a0a0f)
 * - Neon title text
 * - Simple, clean design
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Synthwave color palette
const COLORS = {
    background: '#0a0a0f',
    neonCyan: '#00ffff',
    neonMagenta: '#ff00ff',
    neonPink: '#ff6ec7',
    white: '#ffffff'
};

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');

// Size for universal splash (iOS uses this and scales)
const SIZE = 2732;

async function generateSplash() {
    console.log('Generating synthwave splash screen...');

    // Create SVG for the splash screen
    // Simple design: dark background with glowing "SCORCHED EARTH" title
    const svg = `
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <!-- Glow filter for neon effect -->
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="40" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <!-- Gradient for background -->
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#0a0a1a;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#1a0a2e;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0a0a0f;stop-opacity:1" />
            </linearGradient>
            <!-- Gradient for horizon glow -->
            <radialGradient id="horizonGlow" cx="50%" cy="70%" r="40%" fx="50%" fy="70%">
                <stop offset="0%" style="stop-color:#ff6ec7;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#ff6ec7;stop-opacity:0" />
            </radialGradient>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bgGradient)"/>

        <!-- Horizon glow effect -->
        <ellipse cx="${SIZE/2}" cy="${SIZE * 0.7}" rx="${SIZE * 0.6}" ry="${SIZE * 0.3}" fill="url(#horizonGlow)"/>

        <!-- Grid lines (synthwave floor) -->
        <g opacity="0.3" stroke="${COLORS.neonMagenta}" stroke-width="2">
            <!-- Horizontal lines -->
            ${Array.from({length: 8}, (_, i) => {
                const y = SIZE * 0.65 + (i * 40);
                return `<line x1="0" y1="${y}" x2="${SIZE}" y2="${y}" opacity="${0.5 - i * 0.05}"/>`;
            }).join('\n            ')}
            <!-- Vertical perspective lines -->
            ${Array.from({length: 15}, (_, i) => {
                const offset = (i - 7) * 100;
                const topX = SIZE/2 + offset * 0.3;
                const bottomX = SIZE/2 + offset * 2;
                return `<line x1="${topX}" y1="${SIZE * 0.65}" x2="${bottomX}" y2="${SIZE}" opacity="0.4"/>`;
            }).join('\n            ')}
        </g>

        <!-- Title: SCORCHED EARTH -->
        <text x="${SIZE/2}" y="${SIZE * 0.42}"
              font-family="Arial Black, Helvetica, sans-serif"
              font-size="180"
              font-weight="900"
              text-anchor="middle"
              fill="${COLORS.neonCyan}"
              filter="url(#glow-strong)">
            SCORCHED EARTH
        </text>

        <!-- Subtitle: SYNTHWAVE EDITION -->
        <text x="${SIZE/2}" y="${SIZE * 0.48}"
              font-family="Arial, Helvetica, sans-serif"
              font-size="60"
              font-weight="400"
              letter-spacing="15"
              text-anchor="middle"
              fill="${COLORS.neonMagenta}"
              filter="url(#glow)">
            SYNTHWAVE EDITION
        </text>

        <!-- Decorative line under title -->
        <line x1="${SIZE * 0.3}" y1="${SIZE * 0.52}" x2="${SIZE * 0.7}" y2="${SIZE * 0.52}"
              stroke="${COLORS.neonCyan}" stroke-width="4" filter="url(#glow)"/>

        <!-- Loading text -->
        <text x="${SIZE/2}" y="${SIZE * 0.85}"
              font-family="Arial, Helvetica, sans-serif"
              font-size="40"
              text-anchor="middle"
              fill="${COLORS.white}"
              opacity="0.6">
            LOADING...
        </text>
    </svg>
    `;

    // Convert SVG to PNG using sharp
    const buffer = Buffer.from(svg);

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Generate the splash images (all same size for universal)
    const outputPath1x = path.join(OUTPUT_DIR, 'splash-2732x2732-2.png');
    const outputPath2x = path.join(OUTPUT_DIR, 'splash-2732x2732-1.png');
    const outputPath3x = path.join(OUTPUT_DIR, 'splash-2732x2732.png');

    await sharp(buffer)
        .png()
        .toFile(outputPath3x);

    // Copy to other scales (they're all universal)
    fs.copyFileSync(outputPath3x, outputPath2x);
    fs.copyFileSync(outputPath3x, outputPath1x);

    console.log('Generated splash images:');
    console.log(`  - ${outputPath1x}`);
    console.log(`  - ${outputPath2x}`);
    console.log(`  - ${outputPath3x}`);
    console.log('Done!');
}

generateSplash().catch(err => {
    console.error('Failed to generate splash:', err);
    process.exit(1);
});
