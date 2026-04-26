import { describe, it, expect, vi } from 'vitest';
import { resolveProjectileImpact } from '../../js/impactResolution.js';
import { GAMEPLAY_EVENTS } from '../../js/gameplayEvents.js';
import { WEAPON_TYPES } from '../../js/weapons.js';

function createTank(team, overrides = {}) {
  return {
    team,
    x: team === 'player' ? 100 : 250,
    y: 300,
    health: 100,
    isDestroyed: vi.fn(() => false),
    applyEmp: vi.fn(),
    ...overrides
  };
}

function createTerrain(width = 400, height = 200) {
  const heights = new Array(width).fill(height);
  return {
    heights,
    getWidth: vi.fn(() => width),
    getHeight: vi.fn(x => heights[Math.floor(x)] ?? 0),
    setHeight: vi.fn((x, value) => {
      heights[Math.floor(x)] = value;
    })
  };
}

function createBaseServices(weapon) {
  return {
    weaponRegistry: {
      getWeapon: vi.fn(() => weapon)
    },
    emitGameplayEvent: vi.fn(),
    applyExplosionDamage: vi.fn(() => ({
      damage: 30,
      actualDamage: 30,
      shieldDamage: 0,
      healthDamage: 30,
      isDirectHit: true,
      shieldBusted: false
    })),
    applyExplosionToAllTanks: vi.fn(() => []),
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
    money: { awardHitReward: vi.fn(() => 15) },
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
    now: vi.fn(() => 1234),
    random: vi.fn(() => 0.75),
    createFalloutZone: vi.fn(),
    createFireZone: vi.fn(),
    createGravityWell: vi.fn()
  };
}

function resolve(overrides = {}) {
  const weapon = overrides.weapon || { name: 'Basic Shot', blastRadius: 40, damage: 30 };
  const services = overrides.services || createBaseServices(weapon);
  const playerTank = overrides.playerTank || createTank('player');
  const enemyTank = overrides.enemyTank || createTank('enemy');
  const projectile = overrides.projectile || {
    weaponId: 'basic-shot',
    owner: 'player',
    getTrail: vi.fn(() => [])
  };

  const result = resolveProjectileImpact({
    projectile,
    pos: overrides.pos || { x: 200, y: 220 },
    directHitTank: overrides.directHitTank ?? null,
    playerTank,
    enemyTank,
    currentTerrain: overrides.currentTerrain ?? createTerrain(),
    isLevelMode: overrides.isLevelMode ?? false,
    levelModeStats: overrides.levelModeStats ?? { damageDealt: 0, shotsHit: 0 },
    tracerTrailDuration: 2500,
    services
  });

  return { result, services, projectile, playerTank, enemyTank };
}

describe('resolveProjectileImpact', () => {
  it('emits impact lifecycle events and delegates visuals, terrain, and hit damage', () => {
    const enemyTank = createTank('enemy', { health: 70 });
    const { result, services } = resolve({ directHitTank: enemyTank, enemyTank });

    expect(result).toEqual([]);
    expect(services.applyExplosionDamage).toHaveBeenCalledWith(
      { x: 200, y: 220, blastRadius: 40 },
      enemyTank,
      expect.objectContaining({ name: 'Basic Shot' })
    );
    expect(services.emitGameplayEvent).toHaveBeenCalledWith(
      GAMEPLAY_EVENTS.PROJECTILE_IMPACT,
      expect.objectContaining({ weaponId: 'basic-shot', blastRadius: 40, directHitTank: enemyTank })
    );
    expect(services.emitGameplayEvent).toHaveBeenCalledWith(
      GAMEPLAY_EVENTS.TANK_DAMAGED,
      expect.objectContaining({ team: 'enemy', actualDamage: 30, source: 'direct' })
    );
    expect(services.emitGameplayEvent).toHaveBeenCalledWith(
      GAMEPLAY_EVENTS.PROJECTILE_IMPACT_RESOLVED,
      expect.objectContaining({ weaponId: 'basic-shot', blastRadius: 40 })
    );
    expect(services.setExplosionEffect).toHaveBeenCalledWith(
      expect.objectContaining({ x: 200, y: 220, radius: 40, startTime: 1234 })
    );
    expect(services.spawnExplosionParticles).toHaveBeenCalledWith(200, 220, 40, false);
    expect(services.screenShakeForBlastRadius).toHaveBeenCalledWith(40);
    expect(services.haptics.hapticExplosion).toHaveBeenCalledWith(40);
    expect(services.destroyTerrainAt).toHaveBeenCalledWith(200, 220, 40);
    expect(services.sound.playExplosionSound).toHaveBeenCalledWith(40);
    expect(services.sound.playHitSound).toHaveBeenCalled();
    expect(services.recordStat).toHaveBeenCalledWith('shotHit');
  });

  it('skips terrain destruction for noTerrainDamage weapons', () => {
    const weapon = { name: 'EMP', blastRadius: 55, damage: 0, noTerrainDamage: true };
    const services = createBaseServices(weapon);

    resolve({ services, weapon });

    expect(services.destroyTerrainAt).not.toHaveBeenCalled();
    expect(services.updateTankTerrainPosition).not.toHaveBeenCalled();
  });

  it('returns chain reaction children when the projectile should react', () => {
    const weapon = { name: 'Cluster', blastRadius: 45, damage: 20 };
    const child = { weaponId: 'child' };
    const services = createBaseServices(weapon);
    services.shouldChainReact.mockReturnValue(true);
    services.createChainReactionProjectiles.mockReturnValue([child]);

    const { result, projectile } = resolve({ services, weapon });

    expect(services.createChainReactionProjectiles).toHaveBeenCalledWith(projectile, { x: 200, y: 220 });
    expect(result).toEqual([child]);
  });

  it('applies liquid dirt terrain changes through the resolver', () => {
    const weapon = {
      name: 'Liquid Dirt',
      blastRadius: 35,
      damage: 0,
      type: WEAPON_TYPES.SPECIAL,
      buriesTank: true
    };
    const services = createBaseServices(weapon);
    const currentTerrain = createTerrain(400, 100);

    resolve({
      weapon,
      services,
      currentTerrain,
      projectile: {
        weaponId: 'liquid-dirt',
        owner: 'player',
        getTrail: vi.fn(() => [])
      }
    });

    expect(currentTerrain.setHeight).toHaveBeenCalled();
    expect(currentTerrain.heights[200]).toBeGreaterThan(100);
    expect(services.rebuildTerrainCellGrid).toHaveBeenCalledWith(currentTerrain);
    expect(services.markTerrainDirty).toHaveBeenCalledWith({ x: 200, radius: 50 });
    expect(services.emitGameplayEvent).toHaveBeenCalledWith(
      GAMEPLAY_EVENTS.TERRAIN_CHANGED,
      expect.objectContaining({ source: 'liquid-dirt', radius: 50, terrain: currentTerrain })
    );
  });
});
