#!/usr/bin/env node

/**
 * Generate the baseline Tank Forge content pack.
 *
 * The curated registry has 33 hand-authored skins. This pack adds 27 generated
 * Tank Forge designs so the unlockable tank registry lands at 60 skins.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.resolve(projectRoot, 'assets/tank-designs/tank-design-pack.v1.json');

const FAMILIES = ['retro-commander', 'arcade-chaos', 'legend-lab'];

const EFFECTS = {
    pulse: 'neonPulse',
    stripe: 'laserStripe',
    vent: 'plasmaVent',
    scanline: 'scanline',
    arc: 'sparkArc'
};

const DESIGNS = [
    ['forge-neon-recruit', 'common', 0, ['#142033', '#00e5ff', '#243b55', '#f8fbff', '#ff4fd8'], EFFECTS.pulse],
    ['forge-grid-runner', 'common', 1, ['#101827', '#6df7ff', '#293854', '#fff176', '#ff3d81'], EFFECTS.stripe],
    ['forge-night-patrol', 'common', 0, ['#171b2f', '#7cffe3', '#252a44', '#8ef9ff', '#f45b69'], EFFECTS.scanline],
    ['forge-sunrise-scout', 'common', 1, ['#21162d', '#ffb347', '#40294a', '#ffe66d', '#ff4f9a'], EFFECTS.pulse],
    ['forge-circuit-mule', 'common', 2, ['#10251f', '#26ff9a', '#233a32', '#b8ff6a', '#00c2ff'], EFFECTS.stripe],
    ['forge-vector-sentry', 'common', 0, ['#1d2332', '#51a7ff', '#2e3448', '#c7f9ff', '#ff5ec4'], EFFECTS.scanline],
    ['forge-cobalt-drifter', 'uncommon', 1, ['#0c1a36', '#2f80ff', '#1b315d', '#80ffe8', '#ff4f8b'], EFFECTS.stripe],
    ['forge-magenta-wasp', 'uncommon', 1, ['#24132e', '#ff2bd6', '#3a2246', '#ffe66d', '#57f7ff'], EFFECTS.pulse],
    ['forge-binary-comet', 'uncommon', 2, ['#111625', '#00f5a0', '#293047', '#ffffff', '#8f7dff'], EFFECTS.scanline],
    ['forge-glass-cannon', 'uncommon', 2, ['#172335', '#b5f7ff', '#304964', '#f8fbff', '#ff77d9'], EFFECTS.vent],
    ['forge-sunset-cruiser', 'uncommon', 0, ['#281b34', '#ff8a3d', '#49305c', '#ffd166', '#ef476f'], EFFECTS.pulse],
    ['forge-dataline-prowler', 'uncommon', 1, ['#101a2b', '#00d9ff', '#24324c', '#a2ff86', '#ff3f7f'], EFFECTS.stripe],
    ['forge-ion-panther', 'rare', 2, ['#090f1f', '#9b5cff', '#1e2540', '#5dffdc', '#ff4fd8'], EFFECTS.arc],
    ['forge-plasma-mantis', 'rare', 2, ['#111821', '#54ff6a', '#243329', '#d6ff00', '#00ccff'], EFFECTS.vent],
    ['forge-laser-lynx', 'rare', 1, ['#1e1329', '#ff3de8', '#342247', '#ffec99', '#44d7ff'], EFFECTS.stripe],
    ['forge-quantum-cobra', 'rare', 2, ['#101226', '#5f7dff', '#272b52', '#ffffff', '#ff6bcb'], EFFECTS.arc],
    ['forge-nebula-bulldog', 'rare', 0, ['#19182f', '#c084fc', '#322f56', '#67e8f9', '#fb7185'], EFFECTS.scanline],
    ['forge-oxide-phantom', 'rare', 0, ['#221b1b', '#ff6b35', '#3d2c2a', '#f7f052', '#00f5d4'], EFFECTS.vent],
    ['forge-chroma-reaper', 'epic', 1, ['#0b1023', '#ff00cc', '#20163d', '#00f5ff', '#fff95c'], EFFECTS.arc],
    ['forge-hyperion-rail', 'epic', 2, ['#10131f', '#ffdd57', '#2a2d42', '#80ffdb', '#ff006e'], EFFECTS.stripe],
    ['forge-aurora-juggernaut', 'epic', 2, ['#071927', '#34d399', '#17384e', '#a78bfa', '#f472b6'], EFFECTS.vent],
    ['forge-void-hammer', 'epic', 0, ['#090a14', '#7c3aed', '#1b1b33', '#22d3ee', '#ff477e'], EFFECTS.pulse],
    ['forge-neon-samurai', 'epic', 1, ['#160b1f', '#ff3366', '#2b193d', '#fef08a', '#38bdf8'], EFFECTS.arc],
    ['forge-solaris-titan', 'legendary', 2, ['#190f10', '#ffb000', '#3a1f19', '#fff4a3', '#ff2e63'], EFFECTS.pulse],
    ['forge-moonfall-oracle', 'legendary', 2, ['#0a1024', '#b8c0ff', '#202a55', '#ffffff', '#7dd3fc'], EFFECTS.scanline],
    ['forge-cosmic-dragon', 'legendary', 1, ['#15051f', '#ff00ff', '#2a1040', '#00ffff', '#fff700'], EFFECTS.arc],
    ['forge-singularity-ace', 'legendary', 0, ['#050814', '#00f0ff', '#141a33', '#a855f7', '#ff007a'], EFFECTS.vent]
];

const HULLS = ['standard', 'wedge', 'heavy', 'scout'];
const TREADS = ['classic', 'hover', 'spiked', 'smooth'];
const WHEELS = ['dual', 'triad', 'micro', null];
const BARRELS = ['standard', 'rail', 'stubby', 'long'];

function makePixelLayer(index, palette) {
    const pixels = [];
    const accent = palette[1];
    const hot = palette[4];
    const light = palette[3];

    for (let x = 10; x <= 54; x += 4) {
        pixels.push({ x, y: 11 + (index % 2), color: accent });
    }

    for (let x = 12 + (index % 3); x <= 50; x += 7) {
        pixels.push({ x, y: 19, color: hot });
        pixels.push({ x: x + 1, y: 20, color: light });
    }

    for (let y = 14; y <= 21; y += 3) {
        pixels.push({ x: 18 + (index % 5), y, color: accent });
        pixels.push({ x: 46 - (index % 5), y, color: hot });
    }

    return JSON.stringify(pixels);
}

function makeDecalLayer(index, palette) {
    const pixels = [];
    const color = palette[3];
    const cx = 30 + (index % 5);
    const cy = 14 + (index % 3);

    [
        [0, -2], [-1, -1], [0, -1], [1, -1],
        [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
        [-1, 1], [0, 1], [1, 1], [0, 2]
    ].forEach(([dx, dy]) => {
        pixels.push({ x: cx + dx, y: cy + dy, color });
    });

    return JSON.stringify(pixels);
}

function createDesign(entry, index) {
    const [skinId, rarity, familyIndex, palette, effectType] = entry;

    return {
        version: 1,
        skinId,
        rarity,
        canvas: { width: 64, height: 32 },
        familyId: FAMILIES[familyIndex],
        layers: [
            {
                id: 'base-layer',
                type: 'base',
                blend: 'normal',
                visible: true,
                pixels: '[]'
            },
            {
                id: 'paint-layer',
                type: 'paint',
                blend: index % 4 === 0 ? 'screen' : 'normal',
                visible: true,
                pixels: makePixelLayer(index, palette)
            },
            {
                id: 'decal-layer',
                type: 'decal',
                blend: 'add',
                visible: true,
                pixels: makeDecalLayer(index, palette)
            }
        ],
        parts: {
            hullPreset: HULLS[index % HULLS.length],
            treadPreset: TREADS[index % TREADS.length],
            wheelPreset: WHEELS[index % WHEELS.length],
            barrelPreset: BARRELS[index % BARRELS.length]
        },
        turret: {
            anchorX: 30 + (index % 5),
            anchorY: 7 + (index % 4),
            baseRadius: 7 + (index % 3)
        },
        effects: [
            {
                type: effectType,
                color: palette[1],
                intensity: Number((0.48 + (index % 5) * 0.08).toFixed(2)),
                speed: Number((0.8 + (index % 4) * 0.18).toFixed(2))
            }
        ],
        palette,
        meta: {
            author: 'Tank Forge Generator',
            updatedAt: 1777075200000,
            tags: [rarity, FAMILIES[familyIndex], effectType]
        }
    };
}

const pack = {
    version: 1,
    exportedAt: '2026-04-25T00:00:00.000Z',
    designs: DESIGNS.map(createDesign)
};

fs.writeFileSync(outputPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
console.log(`[TankForgePack] Wrote ${pack.designs.length} designs to ${outputPath}`);
