#!/usr/bin/env node
/* global console */
/**
 * Generate deterministic baseline slot layouts for all 60 levels.
 *
 * Output file: assets/levels/layouts.v1.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LevelRegistry } from '../js/levels.js';
import {
    DEFAULT_LEVEL_LAYOUT_GLOBAL,
    DEFAULT_LEVEL_LAYOUT_SAMPLE_COUNT,
    createBaselineSlotLayout
} from '../js/level-layouts-baseline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '..', 'Assets', 'levels', 'layouts.v1.json');

function toFixedSamples(samples, precision = 6) {
    return samples.map(value => Number(value.toFixed(precision)));
}

function main() {
    const levels = LevelRegistry.getAllLevels()
        .slice()
        .sort((a, b) => (a.world - b.world) || (a.level - b.level));

    const payload = {
        version: 1,
        meta: {
            sampleCount: DEFAULT_LEVEL_LAYOUT_SAMPLE_COUNT,
            generatedFrom: 'levels.js',
            generatedAt: new Date().toISOString()
        },
        global: {
            ...DEFAULT_LEVEL_LAYOUT_GLOBAL
        },
        slots: {}
    };

    for (const level of levels) {
        const baseline = createBaselineSlotLayout(level.id, level, {
            sampleCount: DEFAULT_LEVEL_LAYOUT_SAMPLE_COUNT,
            width: 1200,
            height: 800,
            enemyXNorm: 0.80
        });

        payload.slots[level.id] = {
            terrainSamples: toFixedSamples(baseline.terrainSamples),
            enemyXNorm: Number(baseline.enemyXNorm.toFixed(4))
        };
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    console.log(`Generated ${levels.length} slot layouts → ${OUTPUT_PATH}`);
}

main();
