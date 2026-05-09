import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function freshStateModules() {
  vi.resetModules();
  const constants = await import('../../js/constants.js');
  const game = await import('../../js/game.js');
  const turn = await import('../../js/turn.js');
  game.init();
  turn.init();
  return { constants, game, turn };
}

describe('game state machine integration', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines the current screen/game states and starts at menu', async () => {
    const { constants, game } = await freshStateModules();
    const { GAME_STATES } = constants;

    expect(GAME_STATES).toMatchObject({
      MENU: 'menu',
      MODE_SELECT: 'mode_select',
      DIFFICULTY_SELECT: 'difficulty_select',
      LEVEL_SELECT: 'level_select',
      HIGH_SCORES: 'high_scores',
      ACHIEVEMENTS: 'achievements',
      COLLECTION: 'collection',
      SUPPLY_DROP: 'supply_drop',
      PLAYING: 'playing',
      AIMING: 'aiming',
      FIRING: 'firing',
      PAUSED: 'paused',
      SHOP: 'shop',
      ROUND_TRANSITION: 'round_transition',
      LEVEL_COMPLETE: 'level_complete',
      VICTORY: 'victory',
      DEFEAT: 'defeat',
      GAME_OVER: 'game_over'
    });
    expect(game.getState()).toBe(GAME_STATES.MENU);
  });

  it('supports menu transitions to gameplay and major menu screens', async () => {
    const { constants, game } = await freshStateModules();
    const { GAME_STATES } = constants;

    expect(game.setState(GAME_STATES.MODE_SELECT)).toBe(true);
    expect(game.getState()).toBe(GAME_STATES.MODE_SELECT);
    expect(game.setState(GAME_STATES.DIFFICULTY_SELECT)).toBe(true);
    expect(game.setState(GAME_STATES.PLAYING)).toBe(true);

    game.init();
    expect(game.setState(GAME_STATES.LEVEL_SELECT)).toBe(true);
    expect(game.getState()).toBe(GAME_STATES.LEVEL_SELECT);

    game.init();
    expect(game.setState(GAME_STATES.COLLECTION)).toBe(true);
    expect(game.getState()).toBe(GAME_STATES.COLLECTION);

    game.init();
    expect(game.setState(GAME_STATES.ACHIEVEMENTS)).toBe(true);
    expect(game.getState()).toBe(GAME_STATES.ACHIEVEMENTS);

    game.init();
    expect(game.setState(GAME_STATES.SUPPLY_DROP)).toBe(true);
    expect(game.getState()).toBe(GAME_STATES.SUPPLY_DROP);
  });

  it('supports contextual secondary progression navigation', async () => {
    const { constants, game } = await freshStateModules();
    const { GAME_STATES } = constants;

    expect(game.setState(GAME_STATES.COLLECTION)).toBe(true);
    expect(game.setState(GAME_STATES.ACHIEVEMENTS)).toBe(true);
    expect(game.setState(GAME_STATES.COLLECTION)).toBe(true);
    expect(game.setState(GAME_STATES.SUPPLY_DROP)).toBe(true);
    expect(game.setState(GAME_STATES.COLLECTION)).toBe(true);

    game.init();
    expect(game.setState(GAME_STATES.SHOP)).toBe(true);
    expect(game.setState(GAME_STATES.SUPPLY_DROP)).toBe(true);
    expect(game.setState(GAME_STATES.SHOP)).toBe(true);
  });

  it('runs the player and AI gameplay turn flow through projectile resolution', async () => {
    const { constants, game, turn } = await freshStateModules();
    const { GAME_STATES, TURN_PHASES } = constants;
    const phaseChanges = [];
    turn.onPhaseChange((newPhase, oldPhase) => phaseChanges.push([oldPhase, newPhase]));

    expect(game.setState(GAME_STATES.PLAYING)).toBe(true);
    expect(game.setState(GAME_STATES.AIMING)).toBe(true);
    expect(turn.getPhase()).toBe(TURN_PHASES.PLAYER_AIM);
    expect(turn.canPlayerAim()).toBe(true);
    expect(turn.canPlayerFire()).toBe(true);

    expect(game.setState(GAME_STATES.FIRING)).toBe(true);
    expect(turn.playerFire()).toBe(true);
    expect(turn.getPhase()).toBe(TURN_PHASES.PROJECTILE_FLIGHT);
    expect(turn.isProjectileInFlight()).toBe(true);
    expect(turn.getCurrentShooter()).toBe('player');

    expect(game.setState(GAME_STATES.AIMING)).toBe(true);
    expect(turn.projectileResolved()).toBe(true);
    expect(turn.getPhase()).toBe(TURN_PHASES.AI_AIM);
    expect(turn.isAiTurn()).toBe(true);

    expect(game.setState(GAME_STATES.FIRING)).toBe(true);
    expect(turn.aiFire()).toBe(true);
    expect(turn.getPhase()).toBe(TURN_PHASES.PROJECTILE_FLIGHT);
    expect(turn.getCurrentShooter()).toBe('ai');

    expect(game.setState(GAME_STATES.AIMING)).toBe(true);
    expect(turn.projectileResolved()).toBe(true);
    expect(turn.getPhase()).toBe(TURN_PHASES.PLAYER_AIM);
    expect(turn.isPlayerTurn()).toBe(true);

    expect(phaseChanges).toEqual([
      [TURN_PHASES.PLAYER_AIM, TURN_PHASES.PLAYER_FIRE],
      [TURN_PHASES.PLAYER_FIRE, TURN_PHASES.PROJECTILE_FLIGHT],
      [TURN_PHASES.PROJECTILE_FLIGHT, TURN_PHASES.AI_AIM],
      [TURN_PHASES.AI_AIM, TURN_PHASES.AI_FIRE],
      [TURN_PHASES.AI_FIRE, TURN_PHASES.PROJECTILE_FLIGHT],
      [TURN_PHASES.PROJECTILE_FLIGHT, TURN_PHASES.PLAYER_AIM]
    ]);
  });

  it('routes projectile resolution to win/loss and round flow states', async () => {
    const { constants, game } = await freshStateModules();
    const { GAME_STATES } = constants;

    expect(game.setState(GAME_STATES.PLAYING)).toBe(true);
    expect(game.setState(GAME_STATES.AIMING)).toBe(true);
    expect(game.setState(GAME_STATES.FIRING)).toBe(true);
    expect(game.setState(GAME_STATES.ROUND_TRANSITION)).toBe(true);
    expect(game.setState(GAME_STATES.SHOP)).toBe(true);
    expect(game.setState(GAME_STATES.PLAYING)).toBe(true);

    expect(game.setState(GAME_STATES.VICTORY)).toBe(true);
    expect(game.setState(GAME_STATES.GAME_OVER)).toBe(true);
    expect(game.setState(GAME_STATES.MENU)).toBe(true);

    expect(game.setState(GAME_STATES.PLAYING)).toBe(true);
    expect(game.setState(GAME_STATES.DEFEAT)).toBe(true);
    expect(game.setState(GAME_STATES.MENU)).toBe(true);
  });

  it('pauses and resumes from gameplay states without allowing pause from menus', async () => {
    const { constants, game } = await freshStateModules();
    const { GAME_STATES } = constants;

    expect(game.setState(GAME_STATES.PAUSED)).toBe(false);
    expect(game.getState()).toBe(GAME_STATES.MENU);

    expect(game.setState(GAME_STATES.PLAYING)).toBe(true);
    expect(game.setState(GAME_STATES.PAUSED)).toBe(true);
    expect(game.getState()).toBe(GAME_STATES.PAUSED);
    expect(game.setState(GAME_STATES.PLAYING)).toBe(true);

    expect(game.setState(GAME_STATES.AIMING)).toBe(true);
    expect(game.setState(GAME_STATES.PAUSED)).toBe(true);
    expect(game.setState(GAME_STATES.AIMING)).toBe(true);

    expect(game.setState(GAME_STATES.FIRING)).toBe(true);
    expect(game.setState(GAME_STATES.PAUSED)).toBe(true);
    expect(game.setState(GAME_STATES.MENU)).toBe(true);
  });

  it('rejects invalid state and turn transitions', async () => {
    const { constants, game, turn } = await freshStateModules();
    const { GAME_STATES, TURN_PHASES } = constants;

    expect(game.setState('bogus')).toBe(false);
    expect(game.getState()).toBe(GAME_STATES.MENU);

    expect(game.setState(GAME_STATES.PLAYING)).toBe(true);
    expect(game.setState(GAME_STATES.SHOP)).toBe(false);
    expect(game.getState()).toBe(GAME_STATES.PLAYING);

    turn.setPhase(TURN_PHASES.PLAYER_FIRE);
    expect(turn.playerFire()).toBe(false);
    expect(turn.setPhase(TURN_PHASES.AI_AIM)).toBe(false);

    turn.init();
    turn.playerFire();
    turn.projectileResolved();
    expect(turn.getPhase()).toBe(TURN_PHASES.AI_AIM);
    expect(turn.playerFire()).toBe(false);

    expect(turn.setPhase('invalid')).toBe(false);
    expect(turn.getPhase()).toBe(TURN_PHASES.AI_AIM);
  });

  it('fires state hooks and state change listeners in transition order', async () => {
    const { constants, game } = await freshStateModules();
    const { GAME_STATES } = constants;
    const events = [];
    const unsubscribe = game.onStateChange((newState, oldState) => {
      events.push(`listener:${oldState}->${newState}`);
    });

    game.registerStateHandlers(GAME_STATES.MENU, {
      onExit: toState => events.push(`menu:exit:${toState}`)
    });
    game.registerStateHandlers(GAME_STATES.MODE_SELECT, {
      onEnter: fromState => events.push(`mode:enter:${fromState}`),
      onExit: toState => events.push(`mode:exit:${toState}`)
    });
    game.registerStateHandlers(GAME_STATES.LEVEL_SELECT, {
      onEnter: fromState => events.push(`level:enter:${fromState}`)
    });

    expect(game.setState(GAME_STATES.MODE_SELECT)).toBe(true);
    expect(game.setState(GAME_STATES.LEVEL_SELECT)).toBe(true);
    unsubscribe();

    expect(events).toEqual([
      `menu:exit:${GAME_STATES.MODE_SELECT}`,
      `listener:${GAME_STATES.MENU}->${GAME_STATES.MODE_SELECT}`,
      `mode:enter:${GAME_STATES.MENU}`,
      `mode:exit:${GAME_STATES.LEVEL_SELECT}`,
      `listener:${GAME_STATES.MODE_SELECT}->${GAME_STATES.LEVEL_SELECT}`,
      `level:enter:${GAME_STATES.MODE_SELECT}`
    ]);
  });
});
