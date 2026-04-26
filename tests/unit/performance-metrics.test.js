import { describe, expect, it, beforeEach } from 'vitest';
import {
  evaluatePerformanceBudget,
  getPerformanceSnapshot,
  recordDroppedBacklog,
  recordFrame,
  recordGameUpdate,
  recordMeasure,
  resetPerformanceMetrics,
  setPerformanceGauge
} from '../../js/performanceMetrics.js';

describe('performance metrics', () => {
  beforeEach(() => {
    resetPerformanceMetrics();
  });

  it('tracks rolling frame and update timing summaries', () => {
    recordFrame(100);
    recordFrame(116);
    recordFrame(134);
    recordGameUpdate(2);
    recordGameUpdate(6);

    const snapshot = getPerformanceSnapshot();

    expect(snapshot.frame.sampleCount).toBe(2);
    expect(snapshot.frame.maxMs).toBe(18);
    expect(snapshot.updates.count).toBe(2);
    expect(snapshot.updates.maxMs).toBe(6);
  });

  it('tracks dropped backlog, named measures, and gauges', () => {
    recordDroppedBacklog(24);
    recordDroppedBacklog(40);
    recordMeasure('terrainImpact', 12);
    recordMeasure('terrainImpact', 18);
    setPerformanceGauge('pixiFragments', 42);

    const snapshot = getPerformanceSnapshot({ particles: 11 });

    expect(snapshot.droppedBacklog.count).toBe(2);
    expect(snapshot.droppedBacklog.totalMs).toBe(64);
    expect(snapshot.measures.terrainImpact.count).toBe(2);
    expect(snapshot.measures.terrainImpact.maxMs).toBe(18);
    expect(snapshot.gauges.pixiFragments).toBe(42);
    expect(snapshot.gauges.particles).toBe(11);
  });

  it('evaluates performance budgets with actionable failures', () => {
    const result = evaluatePerformanceBudget({
      frame: { p95Ms: 33, maxMs: 80 },
      updates: { p95Ms: 3 },
      droppedBacklog: { totalMs: 0, maxMs: 0 },
      measures: {
        terrainImpact: { p95Ms: 10 },
        pixiTerrainRebuild: { p95Ms: 9 }
      },
      gauges: {
        pixiFragments: 20,
        particles: 30
      }
    }, {
      frameP95Ms: 24
    });

    expect(result.pass).toBe(false);
    expect(result.failures).toEqual([
      { name: 'frame.p95Ms', actual: 33, limit: 24 }
    ]);
  });
});
