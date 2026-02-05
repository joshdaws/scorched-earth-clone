#!/usr/bin/env node

/**
 * Import Tank Forge design pack into generated assets and registry.
 *
 * Usage:
 *   node scripts/import-tank-design-pack.js [packPath]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from 'canvas';
import {
    TANK_CANVAS,
    normalizeTankDesign,
    validateTankDesignPack
} from '../js/tank-design-schema.js';
import { enforceTurretAnchorGuardrail } from '../js/tank-turret-constraints.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const packPath = path.resolve(projectRoot, process.argv[2] || 'Assets/tank-designs/tank-design-pack.v1.json');
const manifestPath = path.resolve(projectRoot, 'assets/manifest.json');
const generatedImageDir = path.resolve(projectRoot, 'assets/images/tanks/generated');
const generatedRegistryPath = path.resolve(projectRoot, 'js/tank-skins-generated.js');

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hexToRgba(hex, alpha = 1) {
    if (typeof hex !== 'string') return `rgba(0,255,255,${alpha})`;
    const sanitized = hex.replace('#', '');
    if (sanitized.length !== 6) return `rgba(0,255,255,${alpha})`;

    const r = parseInt(sanitized.slice(0, 2), 16);
    const g = parseInt(sanitized.slice(2, 4), 16);
    const b = parseInt(sanitized.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function paletteColor(design, index, fallback = '#00ffff') {
    if (!Array.isArray(design.palette)) return fallback;
    return design.palette[index] || fallback;
}

function decodePixels(raw) {
    if (typeof raw !== 'string') return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((entry) => {
                if (!entry || typeof entry !== 'object') return null;
                if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) return null;
                if (typeof entry.color !== 'string' || !entry.color) return null;
                return {
                    x: Math.round(entry.x),
                    y: Math.round(entry.y),
                    color: entry.color
                };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

function renderDesignPng(design, outputFile) {
    const canvas = createCanvas(TANK_CANVAS.WIDTH, TANK_CANVAS.HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, TANK_CANVAS.WIDTH, TANK_CANVAS.HEIGHT);

    // Hull
    ctx.fillStyle = paletteColor(design, 0, '#1f2937');
    ctx.fillRect(8, 12, 48, 10);
    ctx.fillRect(17, 8, 30, 5);

    // Treads
    ctx.fillStyle = paletteColor(design, 2, '#374151');
    ctx.fillRect(6, 23, 52, 6);

    // Wheels
    ctx.fillStyle = paletteColor(design, 4, '#f59e0b');
    [14, 24, 34, 44, 54].forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, 26, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Barrel
    ctx.fillStyle = paletteColor(design, 1, '#10b981');
    ctx.fillRect(40, 9, 18, 3);
    ctx.fillStyle = paletteColor(design, 3, '#60a5fa');
    ctx.fillRect(55, 8, 5, 5);

    // Layers
    const compositeMap = {
        normal: 'source-over',
        add: 'lighter',
        screen: 'screen',
        multiply: 'multiply'
    };

    (design.layers || [])
        .filter((layer) => layer.visible !== false)
        .forEach((layer) => {
            ctx.globalCompositeOperation = compositeMap[layer.blend] || 'source-over';
            decodePixels(layer.pixels).forEach((pixel) => {
                if (pixel.x < 0 || pixel.x >= TANK_CANVAS.WIDTH || pixel.y < 0 || pixel.y >= TANK_CANVAS.HEIGHT) {
                    return;
                }
                ctx.fillStyle = pixel.color;
                ctx.fillRect(pixel.x, pixel.y, 1, 1);
            });
            ctx.globalCompositeOperation = 'source-over';
        });

    // Simple effect bake for readability in previews.
    (design.effects || []).forEach((effect) => {
        if (effect.type === 'neonPulse') {
            ctx.strokeStyle = hexToRgba(effect.color, 0.35);
            ctx.lineWidth = 1;
            ctx.strokeRect(7.5, 7.5, 49, 20);
        }
    });

    fs.writeFileSync(outputFile, canvas.toBuffer('image/png'));
}

function titleFromSkinId(skinId) {
    return skinId
        .split('-')
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
}

function buildSpecialEffects(design) {
    const effect = design.effects?.[0];
    if (!effect) return null;

    return {
        type: effect.type,
        color: effect.color
    };
}

function sortObjectKeys(input) {
    const keys = Object.keys(input).sort();
    const output = {};
    keys.forEach((key) => {
        output[key] = input[key];
    });
    return output;
}

function writeGeneratedRegistry(designs) {
    const serialized = JSON.stringify(designs, null, 2)
        .replace(/"([^"]+)":/g, '$1:')
        .replace(/"([^\"]+)"/g, (_, str) => {
            if (/^#?[0-9a-fA-F]{6}$/.test(str) || str.includes('-') || str.includes(' ')) {
                return `"${str}"`;
            }
            return `"${str}"`;
        });

    const fileContents = `/**\n * Generated tank skin registry.\n *\n * This file is auto-generated by scripts/import-tank-design-pack.js\n */\n\nexport const GENERATED_TANK_SKINS = ${serialized};\n`;

    fs.writeFileSync(generatedRegistryPath, fileContents, 'utf8');
}

function main() {
    if (!fs.existsSync(packPath)) {
        console.error(`[TankPackImport] Pack not found: ${packPath}`);
        process.exit(1);
    }

    ensureDir(generatedImageDir);

    const pack = readJson(packPath);
    const validation = validateTankDesignPack(pack);

    if (!validation.valid) {
        console.error('[TankPackImport] Validation failed:');
        validation.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
    }

    const warnings = [];
    const generatedSkins = [];
    const manifest = readJson(manifestPath);
    manifest.tankSkins = manifest.tankSkins || {};

    validation.designs
        .map((design) => normalizeTankDesign(design))
        .sort((a, b) => {
            if (a.rarity !== b.rarity) {
                return a.rarity.localeCompare(b.rarity);
            }
            return a.skinId.localeCompare(b.skinId);
        })
        .forEach((design) => {
            const guardrail = enforceTurretAnchorGuardrail(design);
            const finalDesign = guardrail.design;

            guardrail.warnings.forEach((warning) => {
                warnings.push(`[${finalDesign.skinId}] ${warning}`);
            });

            const fileName = `tank-${finalDesign.rarity}-${finalDesign.skinId}.png`;
            const outputPath = path.resolve(generatedImageDir, fileName);
            const manifestPathValue = `images/tanks/generated/${fileName}`;

            renderDesignPng(finalDesign, outputPath);

            const manifestKey = `${finalDesign.rarity}-${finalDesign.skinId}`;
            manifest.tankSkins[manifestKey] = {
                path: manifestPathValue,
                width: TANK_CANVAS.WIDTH,
                height: TANK_CANVAS.HEIGHT
            };

            generatedSkins.push({
                id: finalDesign.skinId,
                name: titleFromSkinId(finalDesign.skinId),
                description: `Custom Tank Forge skin (${finalDesign.familyId}).`,
                rarity: finalDesign.rarity,
                assetPath: manifestPathValue,
                glowColor: finalDesign.palette?.[1] || '#00ffff',
                animated: Array.isArray(finalDesign.effects) && finalDesign.effects.length > 0,
                specialEffects: buildSpecialEffects(finalDesign)
            });
        });

    manifest.tankSkins = sortObjectKeys(manifest.tankSkins);

    writeGeneratedRegistry(generatedSkins);
    writeJson(manifestPath, manifest);

    console.log(`[TankPackImport] Imported ${generatedSkins.length} designs.`);
    console.log(`[TankPackImport] Generated PNG output: ${generatedImageDir}`);
    console.log(`[TankPackImport] Updated registry: ${generatedRegistryPath}`);
    console.log(`[TankPackImport] Updated manifest: ${manifestPath}`);

    if (warnings.length > 0) {
        console.log('[TankPackImport] Warnings:');
        warnings.forEach((warning) => console.log(`  - ${warning}`));
    }
}

main();
