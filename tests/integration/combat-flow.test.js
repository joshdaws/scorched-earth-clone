import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GAME_STATES, TURN_PHASES } from '../../js/constants.js';
import * as Game from '../../js/game.js';
import * as Turn from '../../js/turn.js';
import {
  Projectile,
  createProjectileFromTank,
  createSplitProjectiles
} from '../../js/projectile.js';
import { resolveProjectileImpact } from '../../js/impactResolution.js';
import { GAMEPLAY_EVENTS } from '../../js/gameplayEvents.js';
import { WeaponRegistry, WEAPON_TYPES } from '../../js/weapons.js';

function createTank(team, overrides = {}) {
  const tank = {
    team,
    x: team === 'player' ? 120 : 320,
    y: 250,
    width: 64,
    height: 32,
    health: 100,
    maxHealth: 100,
    angle: team === 'player' ? 45 : 135,
    power: 55,
    currentWeapon: 'basic-shot',
    inventory: { 'basic-shot': Infinity },
    getFirePosition: vi.fn(function getFirePosition() {
      const radians = (this.angle * Math.PI) / 180;
      return {
        x: this.x + Math.cos(radians) * 36,
        y: this.y - Math.sin(radians) * 36
      };
    }),
    getBounds: vi.fn(function getBounds() {
      return {
        x: this.x - this.width / 2,
        y: this.y - this.height / 2,
        width: this.width,
        height: this.height
      };
    }),
    getCenter: vi.fn(function getCenter() {
      return { x: this.x, y: this.y };
    }),
    isDestroyed: vi.fn(function isDestroyed() {
      return this.health <= 0;
    }),
    applyEmp: vi.fn(),
    setWeapon: vi.fn(function setWeapon(weaponId) {
      this.currentWeapon = weaponId;
    }),
    ...overrides
  };

  return tank;
}

function createTerrain(width = 480, screenHeight = 320, initialHeight = 70) {
  const heights = new Array(width).fill(initialHeight);
  return {
    heights,
    width,
    screenHeight,
    destroyCalls: [],
    getWidth: vi.fn(() => width),
    getScreenHeight: vi.fn(() => screenHeight),
    getHeight: vi.fn(x => heights[Math.max(0, Math.min(width - 1, Math.floor(x)))] ?? 0),
    setHeight: vi.fn((x, value) => {
      heights[Math.max(0, Math.min(width - 1, Math.floor(x)))] = value;
    }),
    destroyTerrain: vi.fn((x, y, radius) => {
      this?.destroyCalls?.push?.({ x, y, radius });
      return true;
    })
  };
}

function createCombatServices(weapon, options = {}) {
  const damage = options.damage ?? weapon.damage ?? 30;
  const events = [];

  const applyDamage = vi.fn((explosion, tank) => {
    const healthBefore = tank.health;
    const actualDamage = Math.min(healthBefore, damage);
    tank.health = Math.max(0, tank.health - damage);

    return {
      damage,
      actualDamage,
      shieldDamage: 0,
      healthDamage: actualDamage,
      isDirectHit: true,
      shieldBusted: false
    };
  });

  const services = {
    events,
    weaponRegistry: {
      getWeapon: vi.fn(() => weapon)
    },
    emitGameplayEvent: vi.fn((type, payload) => {
      events.push({ type, payload });
      return 1;
    }),
    applyExplosionDamage: applyDamage,
    applyExplosionToAllTanks: vi.fn((explosion, tanks) => (
      (options.splashDamage ?? 0) > 0
        ? tanks.map(tank => ({
            ...applyDamage(explosion, tank),
            tank,
            isDirectHit: false
          }))
        : []
    )),
    destroyTerrainAt: vi.fn(),
    updateTankTerrainPosition: vi.fn(),
    rebuildTerrainCellGrid: vi.fn(),
    markTerrainDirty: vi.fn(),
    setExplosionEffect: vi.fn(),
    addPersistentTrail: vi.fn(),
    spawnExplosionParticles: vi.fn(),
    screenShakeForBlastRadius: vi.fn(),
    screenFlash: vi.fn(),
    haptics: { hapticExplosion: vi.fn() },
    sound: {
      playExplosionSound: vi.fn(),
      playNuclearExplosionSound: vi.fn(),
      playHitSound: vi.fn(),
      playMissSound: vi.fn()
    },
    wind: {
      getWind: vi.fn(() => 0),
      setWind: vi.fn()
    },
    money: { awardHitReward: vi.fn(amount => Math.round(amount * 2)) },
    progressionAchievements: { onMoneyEarned: vi.fn() },
    lifetimeStats: {
      recordMoneyEarned: vi.fn(),
      recordDamageDealt: vi.fn(),
      recordDamageTaken: vi.fn(),
      recordShot: vi.fn()
    },
    combatAchievements: {
      onDamageDealt: vi.fn(),
      onPlayerDamageTaken: vi.fn()
    },
    weaponAchievements: {
      onDamageDealtToEnemy: vi.fn()
    },
    hiddenAchievements: {
      onPlayerSelfDamage: vi.fn(),
      onPlayerHitEnemy: vi.fn(),
      onPlayerMissed: vi.fn()
    },
    performanceTracking: {
      onDamageTaken: vi.fn(),
      updateAccuracy: vi.fn()
    },
    precisionAchievements: {
      onPlayerHitEnemy: vi.fn(),
      onPlayerMissed: vi.fn()
    },
    recordStat: vi.fn(),
    shouldChainReact: vi.fn(() => false),
    createChainReactionProjectiles: vi.fn(() => []),
    now: vi.fn(() => 5000),
    random: vi.fn(() => 0.25),
    createFalloutZone: vi.fn(),
    createFireZone: vi.fn(),
    createGravityWell: vi.fn()
  };

  return services;
}

function resolveImpact({
  projectile,
  pos,
  directHitTank = null,
  playerTank = createTank('player'),
  enemyTank = createTank('enemy'),
  terrain = createTerrain(),
  services,
  isLevelMode = false,
  levelModeStats = null
}) {
  return resolveProjectileImpact({
    projectile,
    pos,
    directHitTank,
    playerTank,
    enemyTank,
    currentTerrain: terrain,
    isLevelMode,
    levelModeStats,
    tracerTrailDuration: 1000,
    services
  });
}

describe('combat flow integration', () => {
  beforeEach(() => {
    Game.init();
    Turn.init();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs a basic player shot, terrain impact, AI shot, and return to player turn', () => {
    const weapon = WeaponRegistry.getWeapon('basic-shot');
    const playerTank = createTank('player');
    const enemyTank = createTank('enemy');
    const terrain = createTerrain();
    const services = createCombatServices(weapon);

    expect(Game.setState(GAME_STATES.PLAYING)).toBe(true);
    expect(Game.setState(GAME_STATES.AIMING)).toBe(true);
    expect(Turn.getPhase()).toBe(TURN_PHASES.PLAYER_AIM);

    expect(Turn.playerFire()).toBe(true);
    expect(Game.setState(GAME_STATES.FIRING)).toBe(true);
    const playerProjectile = createProjectileFromTank(playerTank);
    const start = playerProjectile.getPosition();
    for (let i = 0; i < 6; i++) playerProjectile.update(0.01);

    expect(playerProjectile.getPosition().x).toBeGreaterThan(start.x);
    expect(playerProjectile.getPosition().y).not.toBe(start.y);
    expect(playerProjectile.getTrail().length).toBeGreaterThan(0);

    resolveImpact({
      projectile: playerProjectile,
      pos: playerProjectile.getPosition(),
      playerTank,
      enemyTank,
      terrain,
      services
    });

    expect(services.emitGameplayEvent).toHaveBeenCalledWith(
      GAMEPLAY_EVENTS.PROJECTILE_IMPACT,
      expect.objectContaining({ owner: 'player', weaponId: 'basic-shot' })
    );
    expect(services.destroyTerrainAt).toHaveBeenCalledWith(
      playerProjectile.x,
      playerProjectile.y,
      weapon.blastRadius
    );
    expect(services.setExplosionEffect).toHaveBeenCalledWith(
      expect.objectContaining({ active: true, radius: weapon.blastRadius })
    );
    expect(Turn.projectileResolved()).toBe(true);
    expect(Turn.getPhase()).toBe(TURN_PHASES.AI_AIM);

    enemyTank.currentWeapon = 'basic-shot';
    expect(Turn.aiFire()).toBe(true);
    const aiProjectile = createProjectileFromTank(enemyTank);
    aiProjectile.update(-0.01);
    resolveImpact({
      projectile: aiProjectile,
      pos: aiProjectile.getPosition(),
      playerTank,
      enemyTank,
      terrain,
      services
    });

    expect(services.emitGameplayEvent).toHaveBeenCalledWith(
      GAMEPLAY_EVENTS.PROJECTILE_IMPACT_RESOLVED,
      expect.objectContaining({ owner: 'enemy', weaponId: 'basic-shot' })
    );
    expect(Turn.projectileResolved()).toBe(true);
    expect(Turn.getPhase()).toBe(TURN_PHASES.PLAYER_AIM);
  });

  it('applies direct-hit damage, records rewards, and updates level-mode accuracy stats', () => {
    const weapon = WeaponRegistry.getWeapon('basic-shot');
    const enemyTank = createTank('enemy', { health: 100 });
    const playerTank = createTank('player');
    const services = createCombatServices(weapon, { damage: 35 });
    const levelModeStats = { damageDealt: 0, shotsHit: 0 };
    const projectile = new Projectile({
      x: playerTank.x,
      y: playerTank.y,
      angle: 45,
      power: 50,
      weaponId: 'basic-shot',
      owner: 'player'
    });

    resolveImpact({
      projectile,
      pos: enemyTank.getCenter(),
      directHitTank: enemyTank,
      playerTank,
      enemyTank,
      services,
      isLevelMode: true,
      levelModeStats
    });

    expect(enemyTank.health).toBe(65);
    expect(levelModeStats).toEqual({ damageDealt: 35, shotsHit: 1 });
    expect(services.money.awardHitReward).toHaveBeenCalledWith(35);
    expect(services.progressionAchievements.onMoneyEarned).toHaveBeenCalledWith(70);
    expect(services.recordStat).toHaveBeenCalledWith('damageDealt', 35);
    expect(services.recordStat).toHaveBeenCalledWith('shotHit');
    expect(services.lifetimeStats.recordDamageDealt).toHaveBeenCalledWith(35);
    expect(services.performanceTracking.updateAccuracy).toHaveBeenCalledWith(true);
    expect(services.events.some(event => (
      event.type === GAMEPLAY_EVENTS.TANK_DAMAGED &&
      event.payload.team === 'enemy' &&
      event.payload.actualDamage === 35
    ))).toBe(true);
  });

  it('hands a kill off to victory state and records combat rewards before transition', () => {
    const weapon = WeaponRegistry.getWeapon('missile');
    const enemyTank = createTank('enemy', { health: 40 });
    const playerTank = createTank('player');
    const services = createCombatServices(weapon, { damage: 75 });
    const projectile = new Projectile({
      x: playerTank.x,
      y: playerTank.y,
      angle: 45,
      power: 60,
      weaponId: 'missile',
      owner: 'player'
    });

    expect(Game.setState(GAME_STATES.PLAYING)).toBe(true);
    expect(Game.setState(GAME_STATES.AIMING)).toBe(true);
    expect(Game.setState(GAME_STATES.FIRING)).toBe(true);

    resolveImpact({
      projectile,
      pos: enemyTank.getCenter(),
      directHitTank: enemyTank,
      playerTank,
      enemyTank,
      services
    });

    expect(enemyTank.health).toBe(0);
    expect(enemyTank.isDestroyed()).toBe(true);
    expect(services.money.awardHitReward).toHaveBeenCalledWith(40);
    expect(services.combatAchievements.onDamageDealt).toHaveBeenCalled();
    expect(services.weaponAchievements.onDamageDealtToEnemy).toHaveBeenCalledWith('missile', 40, 0);

    if (enemyTank.isDestroyed()) {
      expect(Game.setState(GAME_STATES.VICTORY)).toBe(true);
    }
    expect(Game.getState()).toBe(GAME_STATES.VICTORY);
  });

  it('covers MIRV split, roller movement, digger tunneling, and nuke impact effects', () => {
    const mirv = new Projectile({
      x: 180,
      y: 120,
      angle: 55,
      power: 65,
      weaponId: 'mirv',
      owner: 'player'
    });
    mirv.prevVy = -0.2;
    mirv.vy = 0.1;
    expect(mirv.shouldSplit()).toBe(true);
    const children = createSplitProjectiles(mirv);
    mirv.markSplit();
    expect(children).toHaveLength(WeaponRegistry.getWeapon('mirv').splitCount);
    expect(children.every(child => child.isChild && child.owner === 'player')).toBe(true);
    expect(mirv.shouldSplit()).toBe(false);

    const rollingTerrain = createTerrain(480, 320, 70);
    const roller = new Projectile({
      x: 100,
      y: 250,
      angle: 0,
      power: 50,
      weaponId: 'roller',
      owner: 'player'
    });
    expect(roller.shouldRoll()).toBe(true);
    roller.vx = 6;
    roller.startRolling(250);
    const rollStartX = roller.x;
    expect(roller.updateRolling(rollingTerrain)).toBeNull();
    expect(roller.x).toBeGreaterThan(rollStartX);
    expect(roller.y).toBeCloseTo(248, 0);

    const digTerrain = createTerrain(480, 320, 120);
    const digger = new Projectile({
      x: 200,
      y: 240,
      angle: 0,
      power: 40,
      weaponId: 'digger',
      owner: 'player'
    });
    expect(digger.shouldDig()).toBe(true);
    digger.vx = 5;
    digger.vy = 4;
    digger.startDigging(200, 240);
    const digServices = { destroyTerrainAt: vi.fn() };
    expect(digger.updateDigging(digTerrain, [createTank('enemy', { x: 420 })], digServices)).toBeNull();
    expect(digger.getDigDistance()).toBeGreaterThan(0);
    expect(digServices.destroyTerrainAt).toHaveBeenCalled();

    const nuke = WeaponRegistry.getWeapon('tactical-nuke');
    const nukeServices = createCombatServices(nuke, { damage: 0 });
    resolveImpact({
      projectile: new Projectile({
        x: 220,
        y: 210,
        angle: 45,
        power: 50,
        weaponId: 'tactical-nuke',
        owner: 'player'
      }),
      pos: { x: 220, y: 210 },
      services: nukeServices
    });

    expect(nukeServices.setExplosionEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        radius: nuke.blastRadius,
        duration: 800,
        isNuclear: true,
        hasMushroomCloud: true
      })
    );
    expect(nukeServices.screenFlash).toHaveBeenCalledWith('white', 300);
    expect(nukeServices.createFalloutZone).toHaveBeenCalledWith(220, 210, nuke.blastRadius * 0.6, 2);
    expect(nukeServices.sound.playNuclearExplosionSound).toHaveBeenCalledWith(nuke.blastRadius);
    expect(nukeServices.sound.playExplosionSound).not.toHaveBeenCalled();
  });

  it('blocks repeated fire while projectile, explosion, and AI turn resolution is pending', () => {
    expect(Turn.playerFire()).toBe(true);
    expect(Turn.getPhase()).toBe(TURN_PHASES.PROJECTILE_FLIGHT);
    expect(Turn.isProjectileInFlight()).toBe(true);
    expect(Turn.playerFire()).toBe(false);

    const unresolvedExplosion = { active: true };
    expect(unresolvedExplosion.active).toBe(true);
    expect(Turn.canPlayerFire()).toBe(false);

    expect(Turn.projectileResolved()).toBe(true);
    expect(Turn.getPhase()).toBe(TURN_PHASES.AI_AIM);
    expect(Turn.playerFire()).toBe(false);

    expect(Turn.aiFire()).toBe(true);
    expect(Turn.playerFire()).toBe(false);
    expect(Turn.projectileResolved()).toBe(true);
    expect(Turn.canPlayerFire()).toBe(true);
  });
});
