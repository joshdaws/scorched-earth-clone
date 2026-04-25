import { describe, expect, it } from 'vitest';
import { calculateFixedUpdatePlan } from '../../js/game.js';

describe('game loop fixed update planning', () => {
  it('keeps sub-frame accumulated time for interpolation', () => {
    const plan = calculateFixedUpdatePlan(10, 16, 2);

    expect(plan).toEqual({
      steps: 0,
      remainingTime: 10,
      droppedTime: 0
    });
  });

  it('runs normal fixed updates without dropping small remainder', () => {
    const plan = calculateFixedUpdatePlan(38, 16, 2);

    expect(plan).toEqual({
      steps: 2,
      remainingTime: 6,
      droppedTime: 0
    });
  });

  it('caps catch-up updates and drops stale backlog after a hitch', () => {
    const plan = calculateFixedUpdatePlan(92, 16, 2);

    expect(plan.steps).toBe(2);
    expect(plan.remainingTime).toBe(0);
    expect(plan.droppedTime).toBe(60);
  });
});
