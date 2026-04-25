import { describe, expect, it, vi } from 'vitest';
import { renderGameplayScene } from '../../js/gameplayRenderer.js';

function createBaseConfig(calls, overrides = {}) {
  const push = name => vi.fn(() => calls.push(name));

  return {
    width: 1200,
    height: 800,
    playerTank: { angle: 0, power: 0 },
    enemyTank: { team: 'enemy' },
    playerAim: { angle: 43, power: 67 },
    currentTerrain: { id: 'terrain' },
    currentRound: 3,
    money: 1500,
    difficultyName: 'Hard',
    phase: 'aiming',
    isPlayerTurn: true,
    shooter: { team: 'player' },
    canFire: true,
    crtParams: { enabled: true },
    getScreenShakeOffset: vi.fn(() => ({ x: 4, y: -2 })),
    renderBackground: push('background'),
    renderTerrain: push('terrain'),
    renderTerrainDerezEffects: push('derez'),
    renderFalloutZones: push('fallout'),
    renderFireZones: push('fire'),
    renderTanks: push('tanks'),
    renderTankShields: push('shields'),
    renderActiveProjectile: push('projectiles'),
    renderHud: push('hud'),
    renderPauseButton: push('pause'),
    renderLevelEditorReturnButton: push('editor-return'),
    setTouchAimingEnabled: vi.fn(value => calls.push(`touch-enabled:${value}`)),
    renderTouchAiming: push('touch'),
    renderAimingControls: push('aiming'),
    renderScreenFlash: push('flash'),
    renderDebugOverlays: push('debug'),
    renderCrtEffects: push('crt'),
    ...overrides
  };
}

describe('gameplayRenderer', () => {
  it('renders the playing scene in the expected layered order', () => {
    const calls = [];
    const ctx = {
      save: vi.fn(() => calls.push('save')),
      translate: vi.fn(() => calls.push('translate')),
      restore: vi.fn(() => calls.push('restore'))
    };
    const config = createBaseConfig(calls);

    renderGameplayScene(ctx, config);

    expect(calls).toEqual([
      'save',
      'translate',
      'background',
      'terrain',
      'derez',
      'fallout',
      'fire',
      'tanks',
      'shields',
      'projectiles',
      'hud',
      'pause',
      'editor-return',
      'touch-enabled:true',
      'touch',
      'aiming',
      'restore',
      'flash',
      'debug',
      'crt'
    ]);
    expect(ctx.translate).toHaveBeenCalledWith(4, -2);
    expect(config.playerTank).toMatchObject({ angle: 43, power: 67 });
    expect(config.renderHud).toHaveBeenCalledWith(ctx, expect.objectContaining({
      money: 1500,
      currentRound: 3,
      difficulty: 'Hard',
      isPlayerTurn: true
    }));
  });

  it('disables touch aiming and skips touch visuals outside the player turn', () => {
    const calls = [];
    const ctx = {
      save: vi.fn(() => calls.push('save')),
      translate: vi.fn(() => calls.push('translate')),
      restore: vi.fn(() => calls.push('restore'))
    };
    const renderTouchAiming = vi.fn(() => calls.push('touch'));
    const config = createBaseConfig(calls, {
      isPlayerTurn: false,
      getScreenShakeOffset: vi.fn(() => ({ x: 0, y: 0 })),
      renderTouchAiming
    });

    renderGameplayScene(ctx, config);

    expect(calls).toContain('touch-enabled:false');
    expect(renderTouchAiming).not.toHaveBeenCalled();
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.restore).not.toHaveBeenCalled();
  });
});
