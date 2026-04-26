#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import {
    DEFAULT_PERFORMANCE_BUDGETS,
    evaluatePerformanceBudget
} from '../js/performanceMetrics.js';

function parseArgs(argv) {
    const args = {
        input: null,
        scene: 'gameplay',
        budgets: {}
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--input' && argv[i + 1]) {
            args.input = argv[++i];
        } else if (arg === '--scene' && argv[i + 1]) {
            args.scene = argv[++i];
        } else if (arg === '--budget' && argv[i + 1]) {
            const [key, rawValue] = argv[++i].split('=');
            const value = Number(rawValue);
            if (key && Number.isFinite(value)) {
                args.budgets[key] = value;
            }
        } else if (arg === '--help' || arg === '-h') {
            args.help = true;
        }
    }

    return args;
}

function usage() {
    console.log(`Usage:
  node scripts/check-performance-budget.js --input metrics.json [--scene gameplay] [--budget frameP95Ms=24]

Metrics input should be the object returned by window.TestAPI.getPerformanceMetrics().metrics,
or a wrapper object containing a "metrics" field.

Default budgets:
${JSON.stringify(DEFAULT_PERFORMANCE_BUDGETS, null, 2)}
`);
}

function loadMetrics(inputPath) {
    const raw = fs.readFileSync(inputPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.metrics ?? parsed;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.input) {
    usage();
    process.exit(args.help ? 0 : 1);
}

const metrics = loadMetrics(args.input);
const result = evaluatePerformanceBudget(metrics, args.budgets);

console.log(`[perf:budget] scene=${args.scene} pass=${result.pass}`);
for (const failure of result.failures) {
    console.log(`  FAIL ${failure.name}: ${failure.actual.toFixed(2)} > ${failure.limit.toFixed(2)}`);
}

if (result.failures.length === 0) {
    console.log('  All performance budgets passed.');
}

process.exit(result.pass ? 0 : 1);
