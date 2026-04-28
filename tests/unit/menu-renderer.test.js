import { describe, expect, it, vi } from 'vitest';
import { renderMenuScene } from '../../js/menuRenderer.js';

function createCtx(calls) {
  const gradient = {
    addColorStop: vi.fn()
  };

  return {
    save: vi.fn(() => calls.push('save')),
    restore: vi.fn(() => calls.push('restore')),
    setTransform: vi.fn(() => calls.push('setTransform')),
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(() => calls.push('fillRect')),
    fillStyle: null,
    globalAlpha: 1
  };
}

function button(calls, name) {
  return {
    render: vi.fn(() => calls.push(name)),
    renderWithBadge: vi.fn((_ctx, _pulse, badge) => calls.push(`${name}:${badge}`)),
    renderWithDot: vi.fn((_ctx, _pulse, active) => calls.push(`${name}:${active}`))
  };
}

function createConfig(calls, overrides = {}) {
  return {
    animationTime: 32,
    menuTransition: {
      active: false,
      alpha: 1,
      fadeOut: false,
      targetState: null,
      startTime: performance.now(),
      duration: 250
    },
    currentMenuLayout: { isCompact: false, titleScale: 1 },
    updateMenuButtonPositions: vi.fn(() => calls.push('positions')),
    width: 1200,
    height: 800,
    calculateMenuLayout: vi.fn(),
    titleSceneIsActive: vi.fn(() => true),
    clearTransparent: vi.fn(() => calls.push('clearTransparent')),
    getViewportDimensions: vi.fn(() => ({ width: 1200, height: 800 })),
    getDevicePixelRatio: vi.fn(() => 1),
    renderMenuBackground: vi.fn(() => calls.push('fallbackBackground')),
    drawSynthwaveText: vi.fn((_ctx, text) => calls.push(`title:${text}`)),
    drawNeonSubtitle: vi.fn((_ctx, text) => calls.push(`subtitle:${text}`)),
    drawMenuMetricTile: vi.fn((_ctx, tile) => calls.push(`tile:${tile.label}`)),
    menuButtons: {
      start: button(calls, 'start'),
      highScores: button(calls, 'highScores'),
      achievements: button(calls, 'achievements'),
      collection: button(calls, 'collection'),
      supplyDrop: button(calls, 'supplyDrop'),
      options: button(calls, 'options'),
      dailyChallenges: button(calls, 'dailyChallenges'),
      dailyRewards: button(calls, 'dailyRewards')
    },
    getUnviewedCount: vi.fn(() => 2),
    getNewTankCount: vi.fn(() => 3),
    getDailyChallengeCompletionCounts: vi.fn(() => ({ total: 4, completed: 1 })),
    canClaimDailyReward: vi.fn(() => true),
    getTokenBalance: vi.fn(() => 59),
    getBestRoundCount: vi.fn(() => 5),
    getTotalStars: vi.fn(() => 70),
    colors: {
      NEON_CYAN: '#00ffff',
      NEON_YELLOW: '#ffff00',
      NEON_PINK: '#ff00ff'
    },
    setState: vi.fn(),
    optionsOverlayVisible: false,
    renderOptionsOverlay: vi.fn(() => calls.push('optionsOverlay')),
    engagementUpdate: vi.fn(() => calls.push('engagementUpdate')),
    engagementRender: vi.fn(() => calls.push('engagementRender')),
    renderCrtEffects: vi.fn(() => calls.push('crt')),
    getCrtFullscreenParams: vi.fn(() => ({ enabled: true })),
    ...overrides
  };
}

describe('menuRenderer', () => {
  it('renders simplified home controls, metric tiles, engagement UI, and CRT effects', () => {
    const calls = [];
    const ctx = createCtx(calls);
    const config = createConfig(calls);

    const result = renderMenuScene(ctx, config);

    expect(result.animationTime).toBe(48);
    expect(calls).toContain('positions');
    expect(calls).toContain('clearTransparent');
    expect(calls).toContain('title:SCORCHED');
    expect(calls).toContain('title:EARTH');
    expect(calls).toContain('subtitle:SYNTHWAVE EDITION');
    expect(calls).toContain('start');
    expect(calls).toContain('highScores');
    expect(calls).toContain('collection');
    expect(calls).toContain('options');
    expect(calls).not.toContain('achievements:2');
    expect(calls).not.toContain('collection:3');
    expect(calls).not.toContain('supplyDrop');
    expect(calls).not.toContain('dailyChallenges:3');
    expect(calls).not.toContain('dailyRewards:true');
    expect(calls).toContain('tile:TOKENS');
    expect(calls).toContain('tile:BEST RUN');
    expect(calls).toContain('tile:STARS');
    expect(calls.at(-1)).toBe('crt');
  });

  it('hands off completed fade transitions to the state machine', () => {
    const calls = [];
    const ctx = createCtx(calls);
    const setState = vi.fn(() => calls.push('setState'));
    const config = createConfig(calls, {
      menuTransition: {
        active: true,
        alpha: 1,
        fadeOut: true,
        targetState: 'playing',
        startTime: performance.now() - 1000,
        duration: 100
      },
      setState
    });

    const result = renderMenuScene(ctx, config);

    expect(result.animationTime).toBe(48);
    expect(setState).toHaveBeenCalledWith('playing');
    expect(config.menuTransition.active).toBe(false);
    expect(calls).not.toContain('clearTransparent');
  });
});
