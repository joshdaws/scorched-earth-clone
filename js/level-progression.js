/**
 * Level progression teaching plan.
 *
 * The level registry owns combat tuning. This module owns the player-facing
 * curriculum: which mechanic is being taught, which ammo type is introduced,
 * and what trial loadout a level should grant.
 */

import { WeaponRegistry } from './weapons.js';

const BASIC_LOADOUT = Object.freeze({
    'basic-shot': Infinity
});

const LEVEL_MILESTONES = Object.freeze([
    {
        levelId: 'world1-level1',
        title: 'Aim Lab',
        mechanic: 'Aim and fire',
        summary: 'Start with clear shots and no wind.',
        loadout: { ...BASIC_LOADOUT }
    },
    {
        levelId: 'world1-level2',
        title: 'Tracer Trial',
        mechanic: 'Ranging shots',
        summary: 'Use Tracers to learn distance before committing damage.',
        introducedWeapon: 'tracer',
        loadout: { ...BASIC_LOADOUT, tracer: 6 }
    },
    {
        levelId: 'world1-level3',
        title: 'Missile Trial',
        mechanic: 'Bigger blast radius',
        summary: 'Missiles reward close hits with a more forgiving blast.',
        introducedWeapon: 'missile',
        loadout: { ...BASIC_LOADOUT, tracer: 3, missile: 4 }
    },
    {
        levelId: 'world1-level5',
        title: 'Roller Trial',
        mechanic: 'Terrain-following ammo',
        summary: 'Land short and let the slope carry Rollers into cover.',
        introducedWeapon: 'roller',
        loadout: { ...BASIC_LOADOUT, missile: 2, roller: 4 }
    },
    {
        levelId: 'world1-level7',
        title: 'Bounce Trial',
        mechanic: 'Banked shots',
        summary: 'Bouncers solve awkward angles when direct arcs are blocked.',
        introducedWeapon: 'bouncer',
        loadout: { ...BASIC_LOADOUT, roller: 2, bouncer: 4 }
    },
    {
        levelId: 'world1-level9',
        title: 'World 1 Mix',
        mechanic: 'Basic toolkit mastery',
        summary: 'Combine Tracer, Missile, Roller, and Bouncer choices.',
        loadout: { ...BASIC_LOADOUT, tracer: 2, missile: 3, roller: 2, bouncer: 2 }
    },
    {
        levelId: 'world2-level1',
        title: 'Big Shot Trial',
        mechanic: 'Heavy direct damage',
        summary: 'Use Big Shot when the target is exposed but needs more damage.',
        introducedWeapon: 'big-shot',
        loadout: { ...BASIC_LOADOUT, missile: 2, 'big-shot': 3 }
    },
    {
        levelId: 'world2-level3',
        title: 'MIRV Trial',
        mechanic: 'Airburst splitting',
        summary: 'Split warheads punish clustered or hidden positions.',
        introducedWeapon: 'mirv',
        loadout: { ...BASIC_LOADOUT, tracer: 2, missile: 2, mirv: 3 }
    },
    {
        levelId: 'world2-level5',
        title: 'Digger Trial',
        mechanic: 'Through-terrain attacks',
        summary: 'Digger bypasses rooftops and ridges that block normal arcs.',
        introducedWeapon: 'digger',
        loadout: { ...BASIC_LOADOUT, missile: 2, digger: 4 }
    },
    {
        levelId: 'world2-level7',
        title: 'Wind Bomb Trial',
        mechanic: 'Wind manipulation',
        summary: 'Wind Bomb changes the battlefield when the weather is hostile.',
        introducedWeapon: 'wind-bomb',
        loadout: { ...BASIC_LOADOUT, tracer: 2, 'wind-bomb': 3, missile: 2 }
    },
    {
        levelId: 'world2-level9',
        title: 'City Mix',
        mechanic: 'Urban toolkit mastery',
        summary: 'Pick between heavy arcs, splits, digs, and wind control.',
        loadout: { ...BASIC_LOADOUT, 'big-shot': 2, mirv: 2, digger: 2, 'wind-bomb': 2 }
    },
    {
        levelId: 'world3-level1',
        title: 'Heavy Roller Trial',
        mechanic: 'Slope damage',
        summary: 'Heavy Rollers convert steep terrain into offensive pressure.',
        introducedWeapon: 'heavy-roller',
        loadout: { ...BASIC_LOADOUT, roller: 2, 'heavy-roller': 3 }
    },
    {
        levelId: 'world3-level3',
        title: 'Liquid Dirt Trial',
        mechanic: 'Terrain creation',
        summary: 'Bury or reshape positions when destruction is not enough.',
        introducedWeapon: 'liquid-dirt',
        loadout: { ...BASIC_LOADOUT, digger: 2, 'liquid-dirt': 3 }
    },
    {
        levelId: 'world3-level5',
        title: 'Heavy Digger Trial',
        mechanic: 'Deep tunneling',
        summary: 'Heavy Digger creates wider attack paths through peaks.',
        introducedWeapon: 'heavy-digger',
        loadout: { ...BASIC_LOADOUT, digger: 2, 'heavy-digger': 3 }
    },
    {
        levelId: 'world3-level7',
        title: 'Scatter Trial',
        mechanic: 'Wide area coverage',
        summary: 'Scatter Shot covers uneven terrain when precision is risky.',
        introducedWeapon: 'scatter-shot',
        loadout: { ...BASIC_LOADOUT, missile: 2, 'scatter-shot': 3 }
    },
    {
        levelId: 'world3-level9',
        title: 'Ridge Mix',
        mechanic: 'Mountain toolkit mastery',
        summary: 'Solve steep, blocked, or unstable terrain with the right ammo.',
        loadout: { ...BASIC_LOADOUT, 'heavy-roller': 2, 'liquid-dirt': 2, 'heavy-digger': 2, 'scatter-shot': 2 }
    },
    {
        levelId: 'world4-level1',
        title: 'Napalm Trial',
        mechanic: 'Area denial',
        summary: 'Napalm pressures targets that survive the first impact.',
        introducedWeapon: 'napalm',
        loadout: { ...BASIC_LOADOUT, missile: 2, napalm: 3 }
    },
    {
        levelId: 'world4-level3',
        title: 'EMP Trial',
        mechanic: 'Weapon disruption',
        summary: 'EMP Blast buys time by disabling enemy advanced weapons.',
        introducedWeapon: 'emp-blast',
        loadout: { ...BASIC_LOADOUT, 'wind-bomb': 2, 'emp-blast': 2 }
    },
    {
        levelId: 'world4-level5',
        title: 'Mini Nuke Trial',
        mechanic: 'Large terrain changes',
        summary: 'Mini Nukes reshape dunes and punish shielded positions.',
        introducedWeapon: 'mini-nuke',
        loadout: { ...BASIC_LOADOUT, 'big-shot': 2, 'mini-nuke': 2 }
    },
    {
        levelId: 'world4-level7',
        title: 'Teleporter Trial',
        mechanic: 'Repositioning',
        summary: 'Teleport when survival matters more than immediate damage.',
        introducedWeapon: 'teleporter',
        loadout: { ...BASIC_LOADOUT, tracer: 2, teleporter: 2, missile: 2 }
    },
    {
        levelId: 'world4-level9',
        title: 'Desert Mix',
        mechanic: 'Wind mastery toolkit',
        summary: 'Control wind, deny space, and reshape terrain under pressure.',
        loadout: { ...BASIC_LOADOUT, napalm: 2, 'emp-blast': 2, 'mini-nuke': 1, teleporter: 1 }
    },
    {
        levelId: 'world5-level1',
        title: 'Armor Piercer Trial',
        mechanic: 'Precision damage',
        summary: 'Small blast, high impact: reward exact aim on exposed targets.',
        introducedWeapon: 'armor-piercer',
        loadout: { ...BASIC_LOADOUT, tracer: 2, 'armor-piercer': 3 }
    },
    {
        levelId: 'world5-level3',
        title: 'Shield Buster Trial',
        mechanic: 'Counter-defense ammo',
        summary: 'Shield Buster teaches when to attack protection first.',
        introducedWeapon: 'shield-buster',
        loadout: { ...BASIC_LOADOUT, 'armor-piercer': 2, 'shield-buster': 3 }
    },
    {
        levelId: 'world5-level5',
        title: 'Cluster Trial',
        mechanic: 'Saturation fire',
        summary: 'Cluster Bombs cover impossible terrain with many small blasts.',
        introducedWeapon: 'cluster-bomb',
        loadout: { ...BASIC_LOADOUT, mirv: 2, 'cluster-bomb': 2 }
    },
    {
        levelId: 'world5-level7',
        title: 'Lightning Trial',
        mechanic: 'Vertical strikes',
        summary: 'Lightning Strike bypasses terrain when arcs cannot reach.',
        introducedWeapon: 'lightning-strike',
        loadout: { ...BASIC_LOADOUT, 'heavy-digger': 2, 'lightning-strike': 3 }
    },
    {
        levelId: 'world5-level9',
        title: 'Paradise Mix',
        mechanic: 'Advanced terrain toolkit',
        summary: 'Choose precision, shield counters, saturation, or vertical hits.',
        loadout: { ...BASIC_LOADOUT, 'armor-piercer': 2, 'shield-buster': 2, 'cluster-bomb': 1, 'lightning-strike': 2 }
    },
    {
        levelId: 'world6-level1',
        title: 'Death\'s Head Trial',
        mechanic: 'Boss spread damage',
        summary: 'Death\'s Head splits into decisive coverage for expert arenas.',
        introducedWeapon: 'deaths-head',
        loadout: { ...BASIC_LOADOUT, mirv: 2, 'deaths-head': 2 }
    },
    {
        levelId: 'world6-level3',
        title: 'Sandhog Trial',
        mechanic: 'Long shield-busting tunnels',
        summary: 'Sandhog reaches protected targets through extreme terrain.',
        introducedWeapon: 'sandhog',
        loadout: { ...BASIC_LOADOUT, 'heavy-digger': 2, sandhog: 3 }
    },
    {
        levelId: 'world6-level5',
        title: 'Neutron Trial',
        mechanic: 'Clean high damage',
        summary: 'Neutron Bomb damages tanks without destroying terrain.',
        introducedWeapon: 'neutron-bomb',
        loadout: { ...BASIC_LOADOUT, 'mini-nuke': 1, 'neutron-bomb': 2 }
    },
    {
        levelId: 'world6-level7',
        title: 'Nuke Trial',
        mechanic: 'Full battlefield reshaping',
        summary: 'Nukes decide late fights but demand disciplined timing.',
        introducedWeapon: 'nuke',
        loadout: { ...BASIC_LOADOUT, 'neutron-bomb': 1, nuke: 1, teleporter: 1 }
    },
    {
        levelId: 'world6-level9',
        title: 'Ion Trial',
        mechanic: 'Orbital precision',
        summary: 'Ion Cannon turns impossible cover into a timing problem.',
        introducedWeapon: 'ion-cannon',
        loadout: { ...BASIC_LOADOUT, 'lightning-strike': 2, 'ion-cannon': 2 }
    },
    {
        levelId: 'world6-level10',
        title: 'Final Arsenal',
        mechanic: 'Champion loadout',
        summary: 'Bring the full expert toolkit into the final arena.',
        introducedWeapon: 'fusion-strike',
        loadout: { ...BASIC_LOADOUT, 'deaths-head': 1, sandhog: 2, nuke: 1, 'ion-cannon': 1, 'fusion-strike': 1 }
    }
]);

const INTRO_TUNING = Object.freeze({
    'basic-shot': { enemyHealth: 70, wind: { min: 0, max: 0 }, star2Damage: 45, star3Accuracy: 0.38, star3MaxTurns: 12 },
    tracer: { enemyHealth: 75, wind: { min: 0, max: 0 }, star2Damage: 35, star3Accuracy: 0.35, star3MaxTurns: 12 },
    missile: { enemyHealth: 85, wind: { min: 0, max: 0 }, star2Damage: 60, star3Accuracy: 0.45, star3MaxTurns: 10 },
    roller: { enemyHealth: 90, wind: { min: -1, max: 1 }, star2Damage: 60, star3Accuracy: 0.46, star3MaxTurns: 10 },
    bouncer: { enemyHealth: 95, wind: { min: -2, max: 2 }, star2Damage: 65, star3Accuracy: 0.48, star3MaxTurns: 9 },
    'big-shot': { enemyHealth: 95, wind: { min: -2, max: 2 }, star2Damage: 70, star3Accuracy: 0.52, star3MaxTurns: 9 },
    mirv: { enemyHealth: 95, wind: { min: -2, max: 2 }, star2Damage: 70, star3Accuracy: 0.52, star3MaxTurns: 9 },
    digger: { enemyHealth: 100, wind: { min: -3, max: 3 }, star2Damage: 65, star3Accuracy: 0.5, star3MaxTurns: 9 },
    'wind-bomb': { enemyHealth: 105, wind: { min: -6, max: 6 }, star2Damage: 70, star3Accuracy: 0.52, star3MaxTurns: 9 },
    'heavy-roller': { enemyHealth: 105, wind: { min: -3, max: 3 }, star2Damage: 75, star3Accuracy: 0.56, star3MaxTurns: 8 },
    'liquid-dirt': { enemyHealth: 105, wind: { min: -4, max: 4 }, star2Damage: 70, star3Accuracy: 0.54, star3MaxTurns: 8 },
    'heavy-digger': { enemyHealth: 110, wind: { min: -4, max: 4 }, star2Damage: 80, star3Accuracy: 0.56, star3MaxTurns: 8 },
    'scatter-shot': { enemyHealth: 115, wind: { min: -5, max: 5 }, star2Damage: 85, star3Accuracy: 0.58, star3MaxTurns: 8 },
    napalm: { enemyHealth: 115, wind: { min: -5, max: 5 }, star2Damage: 80, star3Accuracy: 0.58, star3MaxTurns: 8 },
    'emp-blast': { enemyHealth: 115, wind: { min: -6, max: 6 }, star2Damage: 75, star3Accuracy: 0.58, star3MaxTurns: 8 },
    'mini-nuke': { enemyHealth: 125, wind: { min: -6, max: 6 }, star2Damage: 95, star3Accuracy: 0.6, star3MaxTurns: 7 },
    teleporter: { enemyHealth: 120, wind: { min: -6, max: 6 }, star2Damage: 80, star3Accuracy: 0.58, star3MaxTurns: 8 },
    'armor-piercer': { enemyHealth: 125, wind: { min: -5, max: 5 }, star2Damage: 95, star3Accuracy: 0.62, star3MaxTurns: 7 },
    'shield-buster': { enemyHealth: 125, wind: { min: -5, max: 5 }, star2Damage: 90, star3Accuracy: 0.62, star3MaxTurns: 7 },
    'cluster-bomb': { enemyHealth: 130, wind: { min: -6, max: 6 }, star2Damage: 95, star3Accuracy: 0.62, star3MaxTurns: 7 },
    'lightning-strike': { enemyHealth: 135, wind: { min: -7, max: 7 }, star2Damage: 105, star3Accuracy: 0.64, star3MaxTurns: 6 },
    'deaths-head': { enemyHealth: 135, wind: { min: -7, max: 7 }, star2Damage: 100, star3Accuracy: 0.64, star3MaxTurns: 6 },
    sandhog: { enemyHealth: 140, wind: { min: -7, max: 7 }, star2Damage: 100, star3Accuracy: 0.64, star3MaxTurns: 6 },
    'neutron-bomb': { enemyHealth: 145, wind: { min: -8, max: 8 }, star2Damage: 110, star3Accuracy: 0.66, star3MaxTurns: 6 },
    nuke: { enemyHealth: 150, wind: { min: -8, max: 8 }, star2Damage: 120, star3Accuracy: 0.66, star3MaxTurns: 6 },
    'ion-cannon': { enemyHealth: 150, wind: { min: -10, max: 10 }, star2Damage: 120, star3Accuracy: 0.68, star3MaxTurns: 6 },
    'fusion-strike': { enemyHealth: 170, wind: { min: -10, max: 10 }, star2Damage: 140, star3Accuracy: 0.7, star3MaxTurns: 6 }
});

const MIX_TUNING_BY_WORLD = Object.freeze({
    1: { enemyHealth: 105, wind: { min: -2, max: 2 }, star2Damage: 80, star3Accuracy: 0.55, star3MaxTurns: 8 },
    2: { enemyHealth: 120, wind: { min: -4, max: 4 }, star2Damage: 90, star3Accuracy: 0.6, star3MaxTurns: 8 },
    3: { enemyHealth: 130, wind: { min: -6, max: 6 }, star2Damage: 100, star3Accuracy: 0.64, star3MaxTurns: 7 },
    4: { enemyHealth: 140, wind: { min: -8, max: 8 }, star2Damage: 110, star3Accuracy: 0.66, star3MaxTurns: 7 },
    5: { enemyHealth: 150, wind: { min: -7, max: 7 }, star2Damage: 120, star3Accuracy: 0.68, star3MaxTurns: 6 },
    6: { enemyHealth: 165, wind: { min: -10, max: 10 }, star2Damage: 135, star3Accuracy: 0.7, star3MaxTurns: 6 }
});

const TUNING_FIELDS = Object.freeze([
    'enemyHealth',
    'playerHealth',
    'wind',
    'star2Damage',
    'star3Accuracy',
    'star3MaxTurns'
]);

function parseLevelOrder(levelId) {
    const match = /^world(\d+)-level(\d+)$/.exec(levelId || '');
    if (!match) return -1;
    return Number(match[1]) * 100 + Number(match[2]);
}

function getWeaponName(weaponId) {
    return WeaponRegistry.getWeapon(weaponId)?.name || weaponId;
}

function getActiveMilestone(levelId) {
    const levelOrder = parseLevelOrder(levelId);
    let active = LEVEL_MILESTONES[0];

    for (const milestone of LEVEL_MILESTONES) {
        if (parseLevelOrder(milestone.levelId) <= levelOrder) {
            active = milestone;
        } else {
            break;
        }
    }

    return active;
}

function cloneTuning(tuning) {
    return {
        ...tuning,
        wind: tuning.wind ? { ...tuning.wind } : undefined
    };
}

function isMixMilestone(milestone) {
    return !milestone.introducedWeapon && /mix|arsenal/i.test(milestone.title);
}

function buildChallengeTuning(level, introTuning) {
    const source = cloneTuning(introTuning);
    const windRange = Math.max(Math.abs(source.wind?.min || 0), Math.abs(source.wind?.max || 0));
    const levelWindRange = Math.max(Math.abs(level.wind?.min || 0), Math.abs(level.wind?.max || 0));
    const challengeWindRange = Math.min(levelWindRange, windRange + 1);

    return {
        enemyHealth: Math.min(level.enemyHealth, source.enemyHealth + 10),
        wind: { min: -challengeWindRange, max: challengeWindRange },
        star2Damage: Math.min(level.star2Damage, source.star2Damage + 10),
        star3Accuracy: Math.min(level.star3Accuracy, Number((source.star3Accuracy + 0.03).toFixed(2))),
        star3MaxTurns: Math.max(level.star3MaxTurns, source.star3MaxTurns - 1)
    };
}

function getLevelTuning(level, progression) {
    const milestone = getActiveMilestone(level.id);
    const introWeapon = milestone.introducedWeapon || 'basic-shot';
    const isIntro = progression.isIntroLevel || level.id === 'world1-level1';

    if (isMixMilestone(milestone)) {
        const tuning = cloneTuning(MIX_TUNING_BY_WORLD[level.world] || MIX_TUNING_BY_WORLD[1]);
        return {
            ...tuning,
            role: level.id === milestone.levelId ? 'mix' : 'mastery',
            note: 'Mixed arsenal check tuned around choosing the right weapon instead of shopping for more.'
        };
    }

    if (isIntro) {
        const tuning = cloneTuning(INTRO_TUNING[introWeapon]);
        return {
            ...tuning,
            role: 'intro',
            note: `${getWeaponName(introWeapon)} practice tuned for experimentation before the follow-up challenge.`
        };
    }

    const tuning = buildChallengeTuning(level, INTRO_TUNING[introWeapon]);
    return {
        ...tuning,
        role: 'challenge',
        note: `${getWeaponName(introWeapon)} follow-up tuned to combine the new ammo with prior aiming skills.`
    };
}

function applyLevelTuning(level, tuning) {
    const tunedLevel = { ...level };

    for (const field of TUNING_FIELDS) {
        if (tuning[field] === undefined) continue;
        tunedLevel[field] = typeof tuning[field] === 'object'
            ? { ...tuning[field] }
            : tuning[field];
    }

    return tunedLevel;
}

export function getLevelProgression(levelOrId) {
    const levelId = typeof levelOrId === 'string' ? levelOrId : levelOrId?.id;
    const milestone = getActiveMilestone(levelId);
    const isIntroLevel = milestone.levelId === levelId && Boolean(milestone.introducedWeapon);
    const introducedWeaponName = isIntroLevel ? getWeaponName(milestone.introducedWeapon) : null;
    const loadout = { ...milestone.loadout };
    const recommendedWeapon = milestone.introducedWeapon && loadout[milestone.introducedWeapon] > 0
        ? milestone.introducedWeapon
        : null;

    return {
        title: milestone.title,
        mechanic: milestone.mechanic,
        summary: milestone.summary,
        introducedWeapon: isIntroLevel ? milestone.introducedWeapon : null,
        introducedWeaponName,
        recommendedWeapon,
        recommendedWeaponName: recommendedWeapon ? getWeaponName(recommendedWeapon) : null,
        isIntroLevel,
        loadout,
        loadoutWeaponNames: Object.keys(loadout).map(getWeaponName)
    };
}

export function getLevelLoadout(levelOrId) {
    return { ...getLevelProgression(levelOrId).loadout };
}

export function enrichLevelProgression(level) {
    const progression = getLevelProgression(level.id);
    const tuning = getLevelTuning(level, progression);
    const tunedLevel = applyLevelTuning(level, tuning);

    return {
        ...tunedLevel,
        progression: {
            ...progression,
            tuning
        }
    };
}

export function getProgressionMilestones() {
    return LEVEL_MILESTONES.map(milestone => ({
        ...milestone,
        loadout: { ...milestone.loadout }
    }));
}
