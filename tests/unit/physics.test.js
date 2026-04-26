import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PHYSICS } from '../../js/constants.js';
import { calculateTrajectory, Projectile } from '../../js/projectile.js';

function createProjectile(options = {}) {
  return new Projectile({
    x: 400,
    y: 420,
    angle: 45,
    power: 50,
    weaponId: 'basic-shot',
    owner: 'player',
    ...options
  });
}

function lastPoint(points) {
  return points[points.length - 1];
}

function rangeUntilReturnToLaunchHeight(points, launchY) {
  const returning = points.find((point, index) => index > 1 && point.y >= launchY);
  return (returning ?? lastPoint(points)).x - points[0].x;
}

describe('physics trajectory calculation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('returns an ordered array of trajectory points including the start', () => {
    const points = calculateTrajectory(120, 360, 45, 50, 0, 8);

    expect(points).toHaveLength(9);
    expect(points[0]).toEqual({ x: 120, y: 360 });
    expect(points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  it('forms a parabolic arc with no wind', () => {
    const points = calculateTrajectory(300, 520, 60, 70, 0, 90);
    const start = points[0];
    const peak = points.reduce((best, point) => point.y < best.y ? point : best, start);
    const end = lastPoint(points);

    expect(peak.y).toBeLessThan(start.y);
    expect(end.y).toBeGreaterThan(peak.y);
    expect(points.at(1).x - start.x).toBeCloseTo(points.at(2).x - points.at(1).x, 5);
  });

  it('sends higher power farther than lower power under the same launch angle', () => {
    const lowPower = calculateTrajectory(100, 500, 45, 35, 0, 100);
    const highPower = calculateTrajectory(100, 500, 45, 70, 0, 100);

    expect(lastPoint(highPower).x - highPower[0].x).toBeGreaterThan(lastPoint(lowPower).x - lowPower[0].x);
  });

  it('gives 45 degrees the longest no-wind range among common artillery angles', () => {
    const startX = 100;
    const startY = 700;
    const shallow = calculateTrajectory(startX, startY, 30, 50, 0, 160);
    const balanced = calculateTrajectory(startX, startY, 45, 50, 0, 160);
    const steep = calculateTrajectory(startX, startY, 60, 50, 0, 160);

    const range30 = rangeUntilReturnToLaunchHeight(shallow, startY);
    const range45 = rangeUntilReturnToLaunchHeight(balanced, startY);
    const range60 = rangeUntilReturnToLaunchHeight(steep, startY);

    expect(range45).toBeGreaterThan(range30);
    expect(range45).toBeGreaterThan(range60);
  });

  it('fires 0 and 180 degrees horizontally at launch', () => {
    expect(createProjectile({ angle: 0, power: 50 }).getVelocity()).toMatchObject({
      vx: 10,
      vy: -0
    });
    expect(createProjectile({ angle: 180, power: 50 }).getVelocity().vx).toBeCloseTo(-10, 5);
    expect(createProjectile({ angle: 180, power: 50 }).getVelocity().vy).toBeCloseTo(0, 5);
  });
});

describe('projectile gravity and velocity', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('uses the configured gravity constant', () => {
    expect(PHYSICS.GRAVITY).toBe(0.15);
  });

  it('accelerates vertical velocity downward each update', () => {
    const projectile = createProjectile({ angle: 90, power: 50 });
    const initialVy = projectile.getVelocity().vy;

    projectile.update(0);
    const afterOne = projectile.getVelocity().vy;
    projectile.update(0);
    const afterTwo = projectile.getVelocity().vy;

    expect(afterOne).toBeCloseTo(initialVy + PHYSICS.GRAVITY, 5);
    expect(afterTwo).toBeCloseTo(afterOne + PHYSICS.GRAVITY, 5);
  });

  it('maps 100 percent power to max velocity and zero power to zero velocity', () => {
    expect(createProjectile({ angle: 0, power: 100 }).getSpeed()).toBeCloseTo(PHYSICS.MAX_VELOCITY, 5);
    expect(createProjectile({ angle: 37, power: 0 }).getSpeed()).toBe(0);
  });

  it('scales launch velocity linearly with power', () => {
    const quarter = createProjectile({ angle: 0, power: 25 }).getSpeed();
    const half = createProjectile({ angle: 0, power: 50 }).getSpeed();
    const full = createProjectile({ angle: 0, power: 100 }).getSpeed();

    expect(half).toBeCloseTo(quarter * 2, 5);
    expect(full).toBeCloseTo(half * 2, 5);
  });
});

describe('wind physics', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('deflects right for positive wind and left for negative wind in trajectory previews', () => {
    const calm = calculateTrajectory(300, 520, 60, 55, 0, 60);
    const right = calculateTrajectory(300, 520, 60, 55, 8, 60);
    const left = calculateTrajectory(300, 520, 60, 55, -8, 60);

    expect(lastPoint(right).x).toBeGreaterThan(lastPoint(calm).x);
    expect(lastPoint(left).x).toBeLessThan(lastPoint(calm).x);
  });

  it('applies wind proportionally through the configured multiplier', () => {
    const startX = 300;
    const mild = calculateTrajectory(startX, 520, 60, 55, 4, 60);
    const strong = calculateTrajectory(startX, 520, 60, 55, 8, 60);
    const calm = calculateTrajectory(startX, 520, 60, 55, 0, 60);

    const mildDeflection = lastPoint(mild).x - lastPoint(calm).x;
    const strongDeflection = lastPoint(strong).x - lastPoint(calm).x;

    expect(strongDeflection).toBeCloseTo(mildDeflection * 2, 0);
  });

  it('leaves horizontal velocity unchanged when force is zero', () => {
    const projectile = createProjectile({ angle: 45, power: 50 });
    const initialVx = projectile.getVelocity().vx;

    projectile.update(0);

    expect(projectile.getVelocity().vx).toBeCloseTo(initialVx, 5);
  });
});

describe('physics edge cases', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('keeps very high and very low angles finite', () => {
    const high = calculateTrajectory(400, 500, 89, 80, 0, 40);
    const low = calculateTrajectory(400, 500, 1, 80, 0, 40);

    expect(high.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(low.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(lastPoint(high).y).toBeLessThan(high[0].y);
    expect(lastPoint(low).x).toBeGreaterThan(low[0].x);
  });

  it('handles extreme wind values without producing invalid points', () => {
    const points = calculateTrajectory(400, 500, 45, 65, PHYSICS.WIND_RANGE * 3, 30);

    expect(points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  it('documents linear behavior for out-of-range power inputs', () => {
    const overloaded = createProjectile({ angle: 0, power: 150 });

    expect(overloaded.getSpeed()).toBeCloseTo(PHYSICS.MAX_VELOCITY * 1.5, 5);
  });
});
