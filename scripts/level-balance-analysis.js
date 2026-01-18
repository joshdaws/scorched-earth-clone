#!/usr/bin/env node
/**
 * Level Balance Analysis Script
 * Validates all 60 levels for balance and consistency
 *
 * Run with: node scripts/level-balance-analysis.js
 */

import { LevelRegistry, ALL_LEVELS, LEVEL_CONSTANTS, WORLD_THEMES } from '../js/levels.js';

// Balance thresholds and expected ranges
const BALANCE_RULES = {
    // Star criteria
    star2Damage: { min: 50, max: 160 },
    star3Accuracy: { min: 0.4, max: 0.8 },
    star3MaxTurns: { min: 3, max: 15 },

    // Health ranges
    enemyHealth: { min: 80, max: 200 },
    playerHealth: { min: 100, max: 100 }, // Player always 100

    // Wind ranges
    windMin: { min: -10, max: 0 },
    windMax: { min: 0, max: 10 },

    // Terrain height ranges
    terrainMinHeight: { min: 40, max: 200 },
    terrainMaxHeight: { min: 280, max: 720 },

    // Reward ranges
    coins: { min: 100, max: 1100 },
    firstClear: { min: 50, max: 550 }
};

// Expected difficulty progression by world
const EXPECTED_PROGRESSION = {
    1: {
        aiDifficulties: ['easy', 'medium'],
        windRange: [0, 2],
        enemyHealthRange: [80, 120],
        star3AccuracyRange: [0.4, 0.6]
    },
    2: {
        aiDifficulties: ['medium', 'hard'],
        windRange: [2, 4],
        enemyHealthRange: [100, 130],
        star3AccuracyRange: [0.55, 0.65]
    },
    3: {
        aiDifficulties: ['medium', 'hard'],
        windRange: [4, 7],
        enemyHealthRange: [110, 140],
        star3AccuracyRange: [0.62, 0.68]
    },
    4: {
        aiDifficulties: ['hard', 'hard_plus'],
        windRange: [6, 8],
        enemyHealthRange: [120, 150],
        star3AccuracyRange: [0.64, 0.70]
    },
    5: {
        aiDifficulties: ['hard', 'hard_plus'],
        windRange: [7, 7],
        enemyHealthRange: [130, 160],
        star3AccuracyRange: [0.68, 0.73]
    },
    6: {
        aiDifficulties: ['hard_plus'],
        windRange: [8, 10],
        enemyHealthRange: [140, 180],
        star3AccuracyRange: [0.70, 0.76]
    }
};

const issues = [];
const warnings = [];
const stats = {
    totalLevels: 0,
    levelsWithIssues: 0,
    issuesByType: {},
    worldStats: {}
};

function logIssue(levelId, type, message) {
    issues.push({ levelId, type, message });
    stats.issuesByType[type] = (stats.issuesByType[type] || 0) + 1;
}

function logWarning(levelId, type, message) {
    warnings.push({ levelId, type, message });
}

function validateLevel(level) {
    const levelIssues = [];
    const world = level.world;
    const expected = EXPECTED_PROGRESSION[world];

    // Validate AI difficulty matches world expectations
    if (!expected.aiDifficulties.includes(level.aiDifficulty)) {
        logWarning(level.id, 'ai_difficulty',
            `AI difficulty '${level.aiDifficulty}' unusual for World ${world} (expected: ${expected.aiDifficulties.join(', ')})`);
    }

    // Validate wind range matches world theme
    const maxWind = Math.max(Math.abs(level.wind.min), Math.abs(level.wind.max));
    if (maxWind < expected.windRange[0] || maxWind > expected.windRange[1]) {
        logWarning(level.id, 'wind_range',
            `Wind ${maxWind} outside expected range [${expected.windRange.join('-')}] for World ${world}`);
    }

    // Validate enemy health progression
    if (level.enemyHealth < expected.enemyHealthRange[0] || level.enemyHealth > expected.enemyHealthRange[1]) {
        logWarning(level.id, 'enemy_health',
            `Enemy health ${level.enemyHealth} outside expected range [${expected.enemyHealthRange.join('-')}] for World ${world}`);
    }

    // Validate star3 accuracy is achievable
    if (level.star3Accuracy < expected.star3AccuracyRange[0] || level.star3Accuracy > expected.star3AccuracyRange[1]) {
        logWarning(level.id, 'star3_accuracy',
            `Star3 accuracy ${level.star3Accuracy} outside expected range [${expected.star3AccuracyRange.join('-')}] for World ${world}`);
    }

    // Check for impossible star conditions
    // Star3 requires both accuracy AND max turns - ensure they're achievable together
    if (level.star3MaxTurns < 3) {
        logIssue(level.id, 'impossible_star',
            `Star3 max turns (${level.star3MaxTurns}) too low - may be impossible to achieve required accuracy in time`);
    }

    // Check if star3 accuracy is unreasonably high for early worlds
    if (world <= 2 && level.star3Accuracy > 0.65) {
        logIssue(level.id, 'harsh_star_criteria',
            `Star3 accuracy (${level.star3Accuracy}) too high for World ${world} tutorial/medium levels`);
    }

    // Validate terrain height makes sense
    const heightRange = level.terrain.maxHeight - level.terrain.minHeight;
    if (heightRange < 100) {
        logWarning(level.id, 'flat_terrain',
            `Terrain height range (${heightRange}) very narrow - may make level too easy`);
    }
    if (heightRange > 600) {
        logWarning(level.id, 'extreme_terrain',
            `Terrain height range (${heightRange}) very large - may make level frustrating`);
    }

    // Validate rewards scale with difficulty
    const expectedMinCoins = 100 + (world - 1) * 50 + (level.level - 1) * 10;
    const expectedMaxCoins = expectedMinCoins + 300;
    if (level.rewards.coins < expectedMinCoins * 0.7 || level.rewards.coins > expectedMaxCoins * 1.5) {
        logWarning(level.id, 'reward_scaling',
            `Coin reward (${level.rewards.coins}) seems off for World ${world} Level ${level.level}`);
    }

    // Validate firstClear bonus is roughly half of coins
    const expectedFirstClear = level.rewards.coins * 0.5;
    if (Math.abs(level.rewards.firstClear - expectedFirstClear) > level.rewards.coins * 0.15) {
        logWarning(level.id, 'firstclear_bonus',
            `FirstClear bonus (${level.rewards.firstClear}) should be ~50% of coins (${level.rewards.coins})`);
    }

    // Validate player health is always 100
    if (level.playerHealth !== 100) {
        logIssue(level.id, 'player_health',
            `Player health (${level.playerHealth}) should always be 100 for fairness`);
    }

    // Boss levels should have extra enemy health
    if (level.level === 10 && level.enemyHealth < 120) {
        logWarning(level.id, 'boss_health',
            `Boss level has low enemy health (${level.enemyHealth}) - should feel challenging`);
    }

    // Tutorial levels should have tips
    if (world === 1 && level.level <= 5 && !level.tutorialTips) {
        logWarning(level.id, 'missing_tutorial',
            `Tutorial level missing tutorialTips - World 1 levels 1-5 should guide players`);
    }

    // Check for windShift flag consistency
    if (level.windShift && maxWind < 7) {
        logWarning(level.id, 'windshift_mild',
            `Level has windShift but mild wind (${maxWind}) - windShift more impactful with strong wind`);
    }

    return levelIssues.length === 0;
}

function analyzeDifficultyCurve() {
    console.log('\n=== DIFFICULTY CURVE ANALYSIS ===\n');

    let prevEnemy = 0;
    let prevWind = 0;
    let prevAccuracy = 0;

    for (let world = 1; world <= 6; world++) {
        const worldLevels = LevelRegistry.getLevelsByWorld(world);
        const theme = WORLD_THEMES[world];

        console.log(`\nWorld ${world}: ${theme.name} (${theme.difficulty})`);
        console.log('─'.repeat(60));

        let worldEnemyTotal = 0;
        let worldWindTotal = 0;
        let worldAccuracyTotal = 0;

        for (const level of worldLevels) {
            const maxWind = Math.max(Math.abs(level.wind.min), Math.abs(level.wind.max));
            worldEnemyTotal += level.enemyHealth;
            worldWindTotal += maxWind;
            worldAccuracyTotal += level.star3Accuracy;

            console.log(
                `  ${level.level.toString().padStart(2)}: ${level.name.padEnd(22)} | ` +
                `HP:${level.enemyHealth.toString().padStart(3)} | ` +
                `Wind:±${maxWind.toString().padStart(2)} | ` +
                `Acc:${(level.star3Accuracy * 100).toFixed(0)}% | ` +
                `Turns:${level.star3MaxTurns.toString().padStart(2)} | ` +
                `AI:${level.aiDifficulty.padEnd(9)}`
            );
        }

        const avgEnemy = worldEnemyTotal / 10;
        const avgWind = worldWindTotal / 10;
        const avgAccuracy = worldAccuracyTotal / 10;

        stats.worldStats[world] = {
            avgEnemyHealth: avgEnemy,
            avgWind: avgWind,
            avgAccuracy: avgAccuracy
        };

        console.log('─'.repeat(60));
        console.log(`  AVG: Enemy HP: ${avgEnemy.toFixed(0)} | Wind: ±${avgWind.toFixed(1)} | Accuracy: ${(avgAccuracy * 100).toFixed(0)}%`);

        // Check difficulty progression between worlds
        if (world > 1) {
            if (avgEnemy < prevEnemy) {
                logIssue(`world${world}`, 'reverse_progression',
                    `World ${world} avg enemy HP (${avgEnemy.toFixed(0)}) lower than World ${world-1} (${prevEnemy.toFixed(0)})`);
            }
            if (avgAccuracy < prevAccuracy - 0.02) {
                logIssue(`world${world}`, 'reverse_progression',
                    `World ${world} avg accuracy (${(avgAccuracy * 100).toFixed(0)}%) easier than World ${world-1} (${(prevAccuracy * 100).toFixed(0)}%)`);
            }
        }

        prevEnemy = avgEnemy;
        prevWind = avgWind;
        prevAccuracy = avgAccuracy;
    }
}

function analyzeRewardCurve() {
    console.log('\n=== REWARD CURVE ANALYSIS ===\n');

    let totalCoins = 0;
    let totalFirstClear = 0;

    for (let world = 1; world <= 6; world++) {
        const worldLevels = LevelRegistry.getLevelsByWorld(world);
        let worldCoins = 0;
        let worldFirstClear = 0;

        for (const level of worldLevels) {
            worldCoins += level.rewards.coins;
            worldFirstClear += level.rewards.firstClear;
        }

        console.log(`World ${world}: Coins: $${worldCoins} | FirstClear: $${worldFirstClear} | Total: $${worldCoins + worldFirstClear}`);
        totalCoins += worldCoins;
        totalFirstClear += worldFirstClear;
    }

    console.log('─'.repeat(50));
    console.log(`TOTAL: Coins: $${totalCoins} | FirstClear: $${totalFirstClear} | Combined: $${totalCoins + totalFirstClear}`);
    console.log(`\nMax possible earnings (all 3-star clears): $${totalCoins + totalFirstClear}`);
}

function analyzeWindProgression() {
    console.log('\n=== WIND PROGRESSION ANALYSIS ===\n');

    for (let world = 1; world <= 6; world++) {
        const worldLevels = LevelRegistry.getLevelsByWorld(world);
        const windValues = worldLevels.map(l => Math.max(Math.abs(l.wind.min), Math.abs(l.wind.max)));
        const hasShift = worldLevels.filter(l => l.windShift).length;

        console.log(`World ${world}: Wind range [${Math.min(...windValues)} - ${Math.max(...windValues)}] | Shifting: ${hasShift}/10 levels`);
    }
}

function printReport() {
    console.log('\n' + '='.repeat(70));
    console.log('                    LEVEL BALANCE ANALYSIS REPORT');
    console.log('='.repeat(70));
    console.log(`Total Levels Analyzed: ${stats.totalLevels}`);

    if (issues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        console.log('─'.repeat(50));
        for (const issue of issues) {
            console.log(`  [${issue.levelId}] ${issue.type}: ${issue.message}`);
        }
    } else {
        console.log('\n✅ No critical issues found!');
    }

    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        console.log('─'.repeat(50));
        for (const warning of warnings) {
            console.log(`  [${warning.levelId}] ${warning.type}: ${warning.message}`);
        }
    } else {
        console.log('\n✅ No warnings!');
    }

    // Print world stats comparison
    console.log('\n=== WORLD COMPARISON ===\n');
    console.log('World | Avg HP | Avg Wind | Avg Accuracy');
    console.log('─'.repeat(45));
    for (let w = 1; w <= 6; w++) {
        const ws = stats.worldStats[w];
        console.log(`  ${w}   |  ${ws.avgEnemyHealth.toFixed(0).padStart(3)}  |   ±${ws.avgWind.toFixed(1).padStart(4)}  |    ${(ws.avgAccuracy * 100).toFixed(0)}%`);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Summary: ${issues.length} issues, ${warnings.length} warnings`);
    console.log('='.repeat(70));
}

// Main execution
console.log('Starting Level Balance Analysis...\n');

// Validate each level
for (const level of ALL_LEVELS) {
    stats.totalLevels++;
    validateLevel(level);
}

// Run curve analyses
analyzeDifficultyCurve();
analyzeRewardCurve();
analyzeWindProgression();

// Print final report
printReport();

// Exit with error code if critical issues found
if (issues.length > 0) {
    process.exit(1);
}
