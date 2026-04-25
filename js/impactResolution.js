/**
 * Projectile impact resolution.
 *
 * This module owns impact-side gameplay decisions while main.js supplies live
 * state and rendering hooks. Keeping those boundaries explicit makes effects,
 * terrain physics, haptics, and achievements easier to evolve independently.
 */

import { TANK } from './constants.js';
import { applyExplosionDamage, applyExplosionToAllTanks } from './damage.js';
import { GAMEPLAY_EVENTS, emitGameplayEvent } from './gameplayEvents.js';
import { createChainReactionProjectiles, shouldChainReact } from './projectile.js';
import { WeaponRegistry, WEAPON_TYPES } from './weapons.js';
import * as Money from './money.js';
import * as Sound from './sound.js';
import * as Haptics from './haptics.js';
import * as Wind from './wind.js';
import * as CombatAchievements from './combat-achievements.js';
import * as PrecisionAchievements from './precision-achievements.js';
import * as WeaponAchievements from './weapon-achievements.js';
import * as ProgressionAchievements from './progression-achievements.js';
import * as HiddenAchievements from './hidden-achievements.js';
import * as PerformanceTracking from './performance-tracking.js';
import * as LifetimeStats from './lifetime-stats.js';
import { recordStat } from './runState.js';
import { screenFlash, screenShakeForBlastRadius, spawnExplosionParticles } from './effects.js';
import { updateTankTerrainPosition } from './tank.js';
import { getTerrainGridHeightAt, rebuildTerrainCellGrid } from './terrainCells.js';

const NOOP = () => {};

function service(services, key, fallback) {
    return services[key] ?? fallback;
}

function getNow(services) {
    const now = service(services, 'now', () => performance.now());
    return now();
}

function emitTankDamageEvent(emit, result, weaponId, source, tankOverride = null) {
    const tank = result?.tank || tankOverride;
    if (!tank || result.actualDamage <= 0) return;

    emit(GAMEPLAY_EVENTS.TANK_DAMAGED, {
        tank,
        team: tank.team,
        weaponId,
        damage: result.damage,
        actualDamage: result.actualDamage,
        shieldDamage: result.shieldDamage,
        healthDamage: result.healthDamage,
        isDirectHit: result.isDirectHit,
        shieldBusted: result.shieldBusted,
        source
    });
}

function getActiveTanks(playerTank, enemyTank, excludeTank = null) {
    return [playerTank, enemyTank].filter(tank => tank !== null && tank !== excludeTank);
}

function createDamageRecorder({
    projectile,
    playerTank,
    enemyTank,
    isLevelMode,
    levelModeStats,
    services,
    weaponId
}) {
    const stats = service(services, 'recordStat', recordStat);
    const money = service(services, 'money', Money);
    const progressionAchievements = service(services, 'progressionAchievements', ProgressionAchievements);
    const lifetimeStats = service(services, 'lifetimeStats', LifetimeStats);
    const combatAchievements = service(services, 'combatAchievements', CombatAchievements);
    const weaponAchievements = service(services, 'weaponAchievements', WeaponAchievements);
    const hiddenAchievements = service(services, 'hiddenAchievements', HiddenAchievements);
    const performanceTracking = service(services, 'performanceTracking', PerformanceTracking);
    const precisionAchievements = service(services, 'precisionAchievements', PrecisionAchievements);

    const state = {
        playerHitEnemy: false,
        wasDirectHit: false
    };

    function recordEnemyDamage(result, healthBefore) {
        const reward = money.awardHitReward(result.actualDamage);
        progressionAchievements.onMoneyEarned(reward);
        lifetimeStats.recordMoneyEarned(reward);
        stats('damageDealt', result.actualDamage);
        state.playerHitEnemy = true;

        if (result.isDirectHit) {
            state.wasDirectHit = true;
        }

        if (isLevelMode && levelModeStats) {
            levelModeStats.damageDealt += result.actualDamage;
        }

        lifetimeStats.recordDamageDealt(result.actualDamage);
        combatAchievements.onDamageDealt(result, result.tank, healthBefore);
        weaponAchievements.onDamageDealtToEnemy(weaponId, result.actualDamage, result.tank.health);
    }

    function recordPlayerDamage(result, isPlayerShot) {
        stats('damageTaken', result.actualDamage);
        lifetimeStats.recordDamageTaken(result.actualDamage);
        performanceTracking.onDamageTaken(result.actualDamage, TANK.START_HEALTH);
        combatAchievements.onPlayerDamageTaken(result.actualDamage, result.tank.health);
        hiddenAchievements.onPlayerSelfDamage(isPlayerShot, result.tank.health, result.actualDamage);
    }

    return {
        state,
        recordDamageResult(result, healthBefore) {
            if (!result?.tank || result.actualDamage <= 0) return;

            const isPlayerShot = projectile.owner === 'player';

            if (isPlayerShot && result.tank.team === 'enemy') {
                recordEnemyDamage(result, healthBefore);
            }

            if (result.tank.team === 'player') {
                recordPlayerDamage(result, isPlayerShot);
            }
        },
        finalizeShotAccuracy() {
            if (projectile.owner !== 'player') return;

            if (state.playerHitEnemy) {
                stats('shotHit');

                if (isLevelMode && levelModeStats) {
                    levelModeStats.shotsHit++;
                }

                lifetimeStats.recordShot(true);
                performanceTracking.updateAccuracy(true);
                precisionAchievements.onPlayerHitEnemy({
                    isDirectHit: state.wasDirectHit,
                    playerTank,
                    enemyTank
                });
                hiddenAchievements.onPlayerHitEnemy();
                return;
            }

            lifetimeStats.recordShot(false);
            performanceTracking.updateAccuracy(false);
            precisionAchievements.onPlayerMissed();
            hiddenAchievements.onPlayerMissed();
        }
    };
}

function applyLiquidDirt({ pos, currentTerrain, playerTank, enemyTank, emit, services }) {
    if (!currentTerrain) return;

    const updateTank = service(services, 'updateTankTerrainPosition', updateTankTerrainPosition);
    const rebuildGrid = service(services, 'rebuildTerrainCellGrid', rebuildTerrainCellGrid);
    const markTerrainDirty = service(services, 'markTerrainDirty', NOOP);
    const dirtRadius = 50;
    const dirtHeight = 100;

    for (let dx = -dirtRadius; dx <= dirtRadius; dx++) {
        const x = Math.floor(pos.x + dx);
        if (x >= 0 && x < currentTerrain.getWidth()) {
            const distFromCenter = Math.abs(dx) / dirtRadius;
            const heightMultiplier = 1 - (distFromCenter * distFromCenter);
            const addedHeight = dirtHeight * heightMultiplier;

            const currentHeight = getTerrainGridHeightAt(currentTerrain, x);
            currentTerrain.setHeight(x, currentHeight + addedHeight);
        }
    }

    rebuildGrid(currentTerrain);
    markTerrainDirty({ x: pos.x, radius: dirtRadius });

    if (playerTank) updateTank(playerTank, currentTerrain);
    if (enemyTank) updateTank(enemyTank, currentTerrain);

    emit(GAMEPLAY_EVENTS.TERRAIN_CHANGED, {
        source: 'liquid-dirt',
        x: pos.x,
        y: pos.y,
        radius: dirtRadius,
        terrain: currentTerrain
    });

    console.log(`Liquid Dirt added ${dirtHeight}px terrain at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
}

function applyIonCannonTerrain({ pos, currentTerrain, playerTank, enemyTank, emit, services }) {
    if (!currentTerrain) return;

    const updateTank = service(services, 'updateTankTerrainPosition', updateTankTerrainPosition);
    const rebuildGrid = service(services, 'rebuildTerrainCellGrid', rebuildTerrainCellGrid);
    const markTerrainDirty = service(services, 'markTerrainDirty', NOOP);
    const beamWidth = 10;

    for (let dx = -beamWidth; dx <= beamWidth; dx++) {
        const x = Math.floor(pos.x + dx);
        if (x >= 0 && x < currentTerrain.getWidth()) {
            const currentHeight = getTerrainGridHeightAt(currentTerrain, x);
            currentTerrain.setHeight(x, Math.max(0, currentHeight - 30));
        }
    }

    rebuildGrid(currentTerrain);
    markTerrainDirty({ x: pos.x, radius: beamWidth });

    if (playerTank) updateTank(playerTank, currentTerrain);
    if (enemyTank) updateTank(enemyTank, currentTerrain);

    emit(GAMEPLAY_EVENTS.TERRAIN_CHANGED, {
        source: 'ion-cannon',
        x: pos.x,
        y: pos.y,
        radius: beamWidth,
        terrain: currentTerrain
    });

    console.log(`Ion Cannon beam at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
}

/**
 * Resolve a projectile impact and return any spawned chain-reaction projectiles.
 *
 * @param {Object} params
 * @param {import('./projectile.js').Projectile} params.projectile
 * @param {{x: number, y: number}} params.pos
 * @param {import('./tank.js').Tank|null} params.directHitTank
 * @param {import('./tank.js').Tank|null} params.playerTank
 * @param {import('./tank.js').Tank|null} params.enemyTank
 * @param {import('./terrain.js').Terrain|null} params.currentTerrain
 * @param {boolean} [params.isLevelMode=false]
 * @param {{damageDealt: number, shotsHit: number}|null} [params.levelModeStats=null]
 * @param {number} [params.tracerTrailDuration=3000]
 * @param {Object} [params.services]
 * @returns {import('./projectile.js').Projectile[]}
 */
export function resolveProjectileImpact({
    projectile,
    pos,
    directHitTank,
    playerTank,
    enemyTank,
    currentTerrain,
    isLevelMode = false,
    levelModeStats = null,
    tracerTrailDuration = 3000,
    services = {}
}) {
    const weaponRegistry = service(services, 'weaponRegistry', WeaponRegistry);
    const emit = service(services, 'emitGameplayEvent', emitGameplayEvent);
    const applyDamage = service(services, 'applyExplosionDamage', applyExplosionDamage);
    const applyDamageToAll = service(services, 'applyExplosionToAllTanks', applyExplosionToAllTanks);
    const destroyTerrainAt = service(services, 'destroyTerrainAt', NOOP);
    const updateTank = service(services, 'updateTankTerrainPosition', updateTankTerrainPosition);
    const setExplosionEffect = service(services, 'setExplosionEffect', NOOP);
    const addPersistentTrail = service(services, 'addPersistentTrail', NOOP);
    const spawnParticles = service(services, 'spawnExplosionParticles', spawnExplosionParticles);
    const shake = service(services, 'screenShakeForBlastRadius', screenShakeForBlastRadius);
    const flash = service(services, 'screenFlash', screenFlash);
    const haptics = service(services, 'haptics', Haptics);
    const sound = service(services, 'sound', Sound);
    const wind = service(services, 'wind', Wind);
    const shouldReact = service(services, 'shouldChainReact', shouldChainReact);
    const createChainChildren = service(services, 'createChainReactionProjectiles', createChainReactionProjectiles);
    const random = service(services, 'random', Math.random);

    const weaponId = projectile.weaponId;
    const weapon = weaponRegistry.getWeapon(weaponId);
    const blastRadius = weapon ? weapon.blastRadius : 30;
    const isNuclear = weapon && weapon.type === WEAPON_TYPES.NUCLEAR;
    const explosion = { x: pos.x, y: pos.y, blastRadius };

    emit(GAMEPLAY_EVENTS.PROJECTILE_IMPACT, {
        projectile,
        weapon,
        weaponId,
        owner: projectile.owner,
        impact: { x: pos.x, y: pos.y },
        blastRadius,
        isNuclear,
        directHitTank
    });

    const damageRecorder = createDamageRecorder({
        projectile,
        playerTank,
        enemyTank,
        isLevelMode,
        levelModeStats,
        services,
        weaponId
    });

    if (directHitTank) {
        const healthBeforeDamage = directHitTank.health;
        const damageResult = applyDamage(explosion, directHitTank, weapon);
        const directResult = { ...damageResult, tank: directHitTank };
        emitTankDamageEvent(emit, directResult, weaponId, 'direct');
        damageRecorder.recordDamageResult(directResult, healthBeforeDamage);

        const splashTanks = getActiveTanks(playerTank, enemyTank, directHitTank);
        const splashHealthBefore = {};
        for (const tank of splashTanks) {
            splashHealthBefore[tank.team] = tank.health;
        }

        const splashResults = applyDamageToAll(explosion, splashTanks, weapon);
        for (const result of splashResults) {
            emitTankDamageEvent(emit, result, weaponId, 'splash');
            damageRecorder.recordDamageResult(result, splashHealthBefore[result.tank.team]);
        }

        console.log(`Tank hit! ${directHitTank.team} took ${damageResult.actualDamage} damage${damageResult.isDirectHit ? ' (DIRECT HIT!)' : ''}, health: ${directHitTank.health}`);
    } else {
        const allTanks = getActiveTanks(playerTank, enemyTank);
        const healthBefore = {};
        for (const tank of allTanks) {
            healthBefore[tank.team] = tank.health;
        }

        const damageResults = applyDamageToAll(explosion, allTanks, weapon);
        for (const result of damageResults) {
            emitTankDamageEvent(emit, result, weaponId, 'splash');
            damageRecorder.recordDamageResult(result, healthBefore[result.tank.team]);
            console.log(`Splash damage: ${result.tank.team} tank took ${result.actualDamage} damage, health: ${result.tank.health}`);
        }
    }

    damageRecorder.finalizeShotAccuracy();

    const explosionDuration = isNuclear ? 800 : 400;
    setExplosionEffect({
        active: true,
        x: pos.x,
        y: pos.y,
        radius: blastRadius,
        startTime: getNow(services),
        duration: explosionDuration,
        isNuclear,
        hasMushroomCloud: weapon?.mushroomCloud || false
    });

    if (weapon?.showsTrajectory && projectile) {
        const trail = projectile.getTrail();
        if (trail && trail.length > 0) {
            const trailCopy = trail.map(p => ({ x: p.x, y: p.y }));
            trailCopy.push({ x: pos.x, y: pos.y });
            addPersistentTrail({
                trail: trailCopy,
                startTime: getNow(services),
                duration: tracerTrailDuration,
                color: weapon.trailColor || '#ffffff'
            });
            console.log(`Tracer trail saved with ${trailCopy.length} points`);
        }
    }

    spawnParticles(pos.x, pos.y, blastRadius, isNuclear);
    shake(blastRadius);
    haptics.hapticExplosion(blastRadius);

    if (currentTerrain && !weapon?.noTerrainDamage) {
        destroyTerrainAt(pos.x, pos.y, blastRadius);
        if (playerTank) updateTank(playerTank, currentTerrain);
        if (enemyTank) updateTank(enemyTank, currentTerrain);
    } else if (weapon?.noTerrainDamage) {
        console.log(`${weapon.name} - no terrain damage (noTerrainDamage flag)`);
    }

    if (isNuclear) {
        console.log(`Nuclear explosion at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) - ${weapon.name}`);

        if (weapon.screenFlash) {
            flash('white', 300);
        }

        if (weapon.emp) {
            const allTanks = getActiveTanks(playerTank, enemyTank);
            for (const tank of allTanks) {
                const dx = tank.x - pos.x;
                const dy = tank.y - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= blastRadius) {
                    tank.applyEmp(2);
                }
            }
        }

        if (weapon.burning && weaponId === 'tactical-nuke') {
            service(services, 'createFalloutZone', NOOP)(pos.x, pos.y, blastRadius * 0.6, 2);
        }

        sound.playNuclearExplosionSound(blastRadius);
    } else {
        sound.playExplosionSound(blastRadius);
    }

    if (weapon && weapon.type === WEAPON_TYPES.SPECIAL) {
        if (weapon.burning && weaponId === 'napalm') {
            service(services, 'createFireZone', NOOP)(pos.x, pos.y, blastRadius);
            console.log(`Napalm fire zone created at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
        }

        if (weapon.buriesTank && weaponId === 'liquid-dirt') {
            applyLiquidDirt({ pos, currentTerrain, playerTank, enemyTank, emit, services });
        }

        if (weapon.teleport && weaponId === 'teleporter') {
            const firingTank = projectile.owner === 'player' ? playerTank : enemyTank;

            if (firingTank && !firingTank.isDestroyed()) {
                const teleportX = Math.max(32, Math.min(currentTerrain.getWidth() - 32, pos.x));
                firingTank.x = teleportX;
                updateTank(firingTank, currentTerrain);

                console.log(`${firingTank.team} tank teleported to (${teleportX.toFixed(1)}, ${firingTank.y.toFixed(1)})`);
                flash('#9900ff', 200);
            }
        }

        if (weapon.windEffect && weaponId === 'wind-bomb') {
            const currentWind = wind.getWind();
            const newWind = (random() * 20) - 10;
            wind.setWind(newWind);

            console.log(`Wind Bomb changed wind from ${currentWind.toFixed(1)} to ${newWind.toFixed(1)}`);
            flash('#87ceeb', 150);
        }

        if (weapon.gravityWell && weaponId === 'gravity-well') {
            service(services, 'createGravityWell', NOOP)(pos.x, pos.y);
            flash('#330066', 300);
        }

        if (weapon.vertical && weaponId === 'lightning-strike') {
            flash('#00ffff', 100);
            console.log(`Lightning Strike at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
        }

        if (weapon.vertical && weapon.beam && weaponId === 'ion-cannon') {
            flash('#ff00ff', 400);
            applyIonCannonTerrain({ pos, currentTerrain, playerTank, enemyTank, emit, services });
        }
    }

    if (directHitTank) {
        sound.playHitSound();
    } else {
        sound.playMissSound();
    }

    emit(GAMEPLAY_EVENTS.PROJECTILE_IMPACT_RESOLVED, {
        projectile,
        weapon,
        weaponId,
        owner: projectile.owner,
        impact: { x: pos.x, y: pos.y },
        blastRadius,
        isNuclear,
        directHitTank
    });

    if (shouldReact(projectile)) {
        return createChainChildren(projectile, pos);
    }

    return [];
}
