import {
  createPuzzleObjects,
  findActiveHazardsInRadius,
  isHazardObject,
  resolvePuzzleObjectCollision,
} from '../../js/puzzleObjects.js';

function makeProjectile(overrides = {}) {
  return {
    active: true,
    x: 100,
    y: 100,
    previousX: 90,
    previousY: 100,
    vx: 8,
    vy: 0,
    isActive() {
      return this.active;
    },
    capturePreviousPosition() {
      this.previousX = this.x;
      this.previousY = this.y;
    },
    ...overrides,
  };
}

describe('puzzle objects', () => {
  it('teleports projectiles between paired gates', () => {
    const objects = createPuzzleObjects([
      { id: 'entry', type: 'teleport', xNorm: 0.1, yNorm: 0.2, radiusNorm: 0.04, pairId: 'gate' },
      { id: 'exit', type: 'teleport', xNorm: 0.7, yNorm: 0.3, radiusNorm: 0.04, pairId: 'gate' },
    ], 1000, 500);
    const projectile = makeProjectile({ x: 100, y: 100 });

    const hit = resolvePuzzleObjectCollision(projectile, objects, null);

    expect(hit).toMatchObject({ type: 'teleport', continueFlight: true });
    expect(projectile.x).toBeCloseTo(700, 6);
    expect(projectile.y).toBeCloseTo(150, 6);
    expect(projectile.puzzleTeleportCooldown).toBeGreaterThan(0);
  });

  it('reflects projectiles off ricochet panels', () => {
    const objects = createPuzzleObjects([
      { id: 'panel', type: 'ricochet', xNorm: 0.1, yNorm: 0.2, widthNorm: 0.2, angleDeg: 90, retention: 1 },
    ], 1000, 500);
    const projectile = makeProjectile({ x: 100, y: 100, previousX: 84, previousY: 100, vx: 8, vy: 0 });

    const hit = resolvePuzzleObjectCollision(projectile, objects, null);

    expect(hit).toMatchObject({ type: 'ricochet', continueFlight: true });
    expect(projectile.vx).toBeLessThan(0);
  });

  it('blocks ordinary shots with shields but lets shield busters continue', () => {
    const objects = createPuzzleObjects([
      { id: 'shield', type: 'shield', xNorm: 0.1, yNorm: 0.2, radiusNorm: 0.06, strength: 2 },
    ], 1000, 500);
    const blocked = resolvePuzzleObjectCollision(makeProjectile(), objects, { shieldBuster: false });

    expect(blocked).toMatchObject({ type: 'shield-block', block: true });
    expect(objects[0].active).toBe(true);
    expect(objects[0].strength).toBe(1);

    const busted = resolvePuzzleObjectCollision(makeProjectile(), objects, { shieldBuster: true });

    expect(busted).toMatchObject({ type: 'shield-busted', continueFlight: true });
    expect(objects[0].active).toBe(false);
  });

  it('blocks shots with bunkers until their strength is depleted', () => {
    const objects = createPuzzleObjects([
      { id: 'bunker', type: 'bunker', xNorm: 0.1, yNorm: 0.2, widthNorm: 0.12, heightNorm: 0.08, strength: 2 },
    ], 1000, 500);

    const firstHit = resolvePuzzleObjectCollision(makeProjectile(), objects, {});

    expect(firstHit).toMatchObject({ type: 'bunker-hit', block: true });
    expect(objects[0].active).toBe(true);

    const secondHit = resolvePuzzleObjectCollision(makeProjectile(), objects, {});

    expect(secondHit).toMatchObject({ type: 'bunker-hit', block: true });
    expect(objects[0].active).toBe(false);
  });

  it('normalizes fuel cells and collapse nodes with hazard runtime fields', () => {
    const objects = createPuzzleObjects([
      { id: 'cell', type: 'fuel-cell', xNorm: 0.1, yNorm: 0.2 },
      { id: 'node', type: 'collapse-node', xNorm: 0.6, yNorm: 0.4 },
    ], 1000, 500);

    expect(objects[0]).toMatchObject({ type: 'fuel-cell', damage: 35 });
    expect(objects[0].radius).toBeGreaterThan(0);
    expect(objects[0].blastRadius).toBeGreaterThan(objects[0].radius);
    expect(objects[1]).toMatchObject({ type: 'collapse-node', damage: 14 });
    expect(objects[1].collapseRadius).toBeGreaterThan(objects[1].radius);
    expect(isHazardObject(objects[0])).toBe(true);
    expect(isHazardObject(objects[1])).toBe(true);
    expect(isHazardObject({ type: 'shield' })).toBe(false);
  });

  it('returns a detonate result when projectiles strike hazards', () => {
    const objects = createPuzzleObjects([
      { id: 'cell', type: 'fuel-cell', xNorm: 0.1, yNorm: 0.2, radiusNorm: 0.06 },
    ], 1000, 500);

    const hit = resolvePuzzleObjectCollision(makeProjectile(), objects, null);

    expect(hit).toMatchObject({
      type: 'fuel-cell-detonate',
      detonate: true,
      block: true,
    });
    expect(hit.pos.x).toBeCloseTo(objects[0].x, 6);

    // Hazards queued for detonation stop colliding so chains cannot double-fire.
    objects[0].detonationQueued = true;
    expect(resolvePuzzleObjectCollision(makeProjectile(), objects, null)).toBeNull();
  });

  it('finds active hazards within a blast radius for chain reactions', () => {
    const objects = createPuzzleObjects([
      { id: 'near', type: 'fuel-cell', xNorm: 0.1, yNorm: 0.2 },
      { id: 'far', type: 'fuel-cell', xNorm: 0.9, yNorm: 0.2 },
      { id: 'node', type: 'collapse-node', xNorm: 0.14, yNorm: 0.2 },
      { id: 'shield', type: 'shield', xNorm: 0.1, yNorm: 0.22 },
    ], 1000, 500);

    const found = findActiveHazardsInRadius(objects, 100, 100, 80);
    const ids = found.map(object => object.id);

    expect(ids).toContain('near');
    expect(ids).toContain('node');
    expect(ids).not.toContain('far');
    expect(ids).not.toContain('shield');

    objects[0].detonationQueued = true;
    const refound = findActiveHazardsInRadius(objects, 100, 100, 80);
    expect(refound.map(object => object.id)).not.toContain('near');
  });
});
