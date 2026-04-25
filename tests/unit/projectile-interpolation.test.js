import { describe, expect, it } from 'vitest';
import { Projectile } from '../../js/projectile.js';

function createProjectile() {
  return new Projectile({
    x: 10,
    y: 20,
    angle: 0,
    power: 50,
    weaponId: 'basic',
    owner: 'player'
  });
}

describe('projectile render interpolation', () => {
  it('interpolates between previous and current physics positions', () => {
    const projectile = createProjectile();

    projectile.capturePreviousPosition();
    projectile.x = 30;
    projectile.y = 40;

    expect(projectile.getRenderPosition(0)).toEqual({ x: 10, y: 20 });
    expect(projectile.getRenderPosition(0.5)).toEqual({ x: 20, y: 30 });
    expect(projectile.getRenderPosition(1)).toEqual({ x: 30, y: 40 });
  });

  it('captures the previous position before normal physics updates', () => {
    const projectile = createProjectile();
    const start = projectile.getPosition();

    projectile.update(0);

    expect(projectile.getRenderPosition(0)).toEqual(start);
    expect(projectile.getRenderPosition(1)).toEqual(projectile.getPosition());
  });

  it('clamps invalid interpolation alpha values', () => {
    const projectile = createProjectile();

    projectile.capturePreviousPosition();
    projectile.x = 30;
    projectile.y = 40;

    expect(projectile.getRenderPosition(-1)).toEqual({ x: 10, y: 20 });
    expect(projectile.getRenderPosition(2)).toEqual({ x: 30, y: 40 });
    expect(projectile.getRenderPosition(Number.NaN)).toEqual({ x: 30, y: 40 });
  });
});
