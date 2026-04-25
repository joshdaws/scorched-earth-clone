import { describe, expect, it } from 'vitest';
import { getScene, listScenes, SCENES } from '../../js/sceneIsolation.js';

describe('sceneIsolation graphics modernization scenes', () => {
  it('registers deterministic visual regression scene routes', () => {
    expect(listScenes()).toEqual(expect.arrayContaining([
      'visual-hud',
      'visual-impact',
      'visual-tank-pivots',
      'visual-terrain-collapse'
    ]));
  });

  it('marks visual scenes with stable setup metadata for browser captures', () => {
    const sceneNames = [
      'visual-hud',
      'visual-impact',
      'visual-tank-pivots',
      'visual-terrain-collapse'
    ];

    for (const sceneName of sceneNames) {
      const scene = getScene(sceneName);

      expect(scene).toBe(SCENES[sceneName]);
      expect(scene.initialState).toBe('playing');
      expect(scene.setup).toMatchObject({
        terrain: true,
        playerTank: true,
        enemyTank: true,
        skipMenu: true,
        visualRegression: true
      });
      expect(scene.setup.seed).toEqual(expect.any(Number));
      expect(scene.setup.visualType).toEqual(expect.any(String));
    }
  });

  it('defines impact coordinates for crater-focused visual captures', () => {
    expect(getScene('visual-impact').setup).toMatchObject({
      visualType: 'impact',
      impactX: expect.any(Number),
      impactRadius: expect.any(Number)
    });
    expect(getScene('visual-terrain-collapse').setup).toMatchObject({
      visualType: 'terrain-collapse',
      impactX: expect.any(Number),
      impactRadius: expect.any(Number)
    });
  });
});
