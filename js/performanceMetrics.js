const DEFAULT_MAX_SAMPLES = 600;

export const DEFAULT_PERFORMANCE_BUDGETS = {
    frameP95Ms: 24,
    frameMaxMs: 90,
    updateP95Ms: 8,
    droppedBacklogTotalMs: 120,
    droppedBacklogMaxMs: 50,
    terrainImpactP95Ms: 28,
    pixiTerrainRebuildP95Ms: 18,
    pixiFragmentsMax: 520,
    particlesMax: 900
};

const metrics = {
    startedAt: now(),
    lastFrameTime: null,
    frameIntervals: [],
    updateDurations: [],
    updateCount: 0,
    droppedBacklog: {
        count: 0,
        totalMs: 0,
        maxMs: 0,
        lastMs: 0
    },
    measures: new Map(),
    gauges: new Map()
};

function now() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

function pushSample(buffer, value, maxSamples = DEFAULT_MAX_SAMPLES) {
    if (!Number.isFinite(value) || value < 0) return;
    buffer.push(value);
    if (buffer.length > maxSamples) {
        buffer.splice(0, buffer.length - maxSamples);
    }
}

function summarize(samples) {
    if (!Array.isArray(samples) || samples.length === 0) {
        return {
            sampleCount: 0,
            lastMs: 0,
            avgMs: 0,
            p95Ms: 0,
            maxMs: 0
        };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const total = samples.reduce((sum, value) => sum + value, 0);
    const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

    return {
        sampleCount: samples.length,
        lastMs: samples[samples.length - 1],
        avgMs: total / samples.length,
        p95Ms: sorted[p95Index],
        maxMs: sorted[sorted.length - 1]
    };
}

function getMeasure(name) {
    if (!metrics.measures.has(name)) {
        metrics.measures.set(name, {
            samples: [],
            count: 0,
            totalMs: 0,
            lastMs: 0,
            maxMs: 0
        });
    }
    return metrics.measures.get(name);
}

function getMemorySnapshot() {
    const memory = typeof performance !== 'undefined' ? performance.memory : null;
    if (!memory) return null;

    return {
        usedJSHeapSize: memory.usedJSHeapSize ?? null,
        totalJSHeapSize: memory.totalJSHeapSize ?? null,
        jsHeapSizeLimit: memory.jsHeapSizeLimit ?? null
    };
}

export function resetPerformanceMetrics() {
    metrics.startedAt = now();
    metrics.lastFrameTime = null;
    metrics.frameIntervals.length = 0;
    metrics.updateDurations.length = 0;
    metrics.updateCount = 0;
    metrics.droppedBacklog.count = 0;
    metrics.droppedBacklog.totalMs = 0;
    metrics.droppedBacklog.maxMs = 0;
    metrics.droppedBacklog.lastMs = 0;
    metrics.measures.clear();
    metrics.gauges.clear();
}

export function recordFrame(currentTime = now()) {
    if (metrics.lastFrameTime !== null) {
        pushSample(metrics.frameIntervals, currentTime - metrics.lastFrameTime);
    }
    metrics.lastFrameTime = currentTime;
}

export function recordGameUpdate(durationMs = 0) {
    metrics.updateCount++;
    pushSample(metrics.updateDurations, durationMs);
}

export function recordDroppedBacklog(droppedMs) {
    if (!Number.isFinite(droppedMs) || droppedMs <= 0) return;

    metrics.droppedBacklog.count++;
    metrics.droppedBacklog.totalMs += droppedMs;
    metrics.droppedBacklog.maxMs = Math.max(metrics.droppedBacklog.maxMs, droppedMs);
    metrics.droppedBacklog.lastMs = droppedMs;
}

export function recordMeasure(name, durationMs) {
    if (!name || !Number.isFinite(durationMs) || durationMs < 0) return;

    const measure = getMeasure(name);
    measure.count++;
    measure.totalMs += durationMs;
    measure.lastMs = durationMs;
    measure.maxMs = Math.max(measure.maxMs, durationMs);
    pushSample(measure.samples, durationMs);
}

export function measurePerformance(name, fn) {
    const start = now();
    try {
        return fn();
    } finally {
        recordMeasure(name, now() - start);
    }
}

export function setPerformanceGauge(name, value) {
    if (!name || !Number.isFinite(value)) return;
    metrics.gauges.set(name, value);
}

export function getPerformanceSnapshot(extraGauges = {}) {
    const frame = summarize(metrics.frameIntervals);
    const updates = summarize(metrics.updateDurations);
    const measures = {};
    const gauges = Object.fromEntries(metrics.gauges.entries());

    for (const [name, measure] of metrics.measures.entries()) {
        measures[name] = {
            ...summarize(measure.samples),
            count: measure.count,
            totalMs: measure.totalMs,
            lastMs: measure.lastMs,
            maxMs: measure.maxMs
        };
    }

    return {
        startedAt: metrics.startedAt,
        elapsedMs: now() - metrics.startedAt,
        frame: {
            ...frame,
            fpsEstimate: frame.avgMs > 0 ? 1000 / frame.avgMs : 0
        },
        updates: {
            ...updates,
            count: metrics.updateCount
        },
        droppedBacklog: { ...metrics.droppedBacklog },
        measures,
        gauges: {
            ...gauges,
            ...extraGauges
        },
        memory: getMemorySnapshot()
    };
}

export function evaluatePerformanceBudget(snapshot, budgets = {}) {
    const mergedBudgets = { ...DEFAULT_PERFORMANCE_BUDGETS, ...budgets };
    const failures = [];

    const check = (name, actual, limit) => {
        if (!Number.isFinite(limit) || limit <= 0) return;
        if (Number.isFinite(actual) && actual > limit) {
            failures.push({ name, actual, limit });
        }
    };

    check('frame.p95Ms', snapshot?.frame?.p95Ms, mergedBudgets.frameP95Ms);
    check('frame.maxMs', snapshot?.frame?.maxMs, mergedBudgets.frameMaxMs);
    check('updates.p95Ms', snapshot?.updates?.p95Ms, mergedBudgets.updateP95Ms);
    check('droppedBacklog.totalMs', snapshot?.droppedBacklog?.totalMs, mergedBudgets.droppedBacklogTotalMs);
    check('droppedBacklog.maxMs', snapshot?.droppedBacklog?.maxMs, mergedBudgets.droppedBacklogMaxMs);
    check('measures.terrainImpact.p95Ms', snapshot?.measures?.terrainImpact?.p95Ms, mergedBudgets.terrainImpactP95Ms);
    check('measures.pixiTerrainRebuild.p95Ms', snapshot?.measures?.pixiTerrainRebuild?.p95Ms, mergedBudgets.pixiTerrainRebuildP95Ms);
    check('gauges.pixiFragments', snapshot?.gauges?.pixiFragments, mergedBudgets.pixiFragmentsMax);
    check('gauges.particles', snapshot?.gauges?.particles, mergedBudgets.particlesMax);

    return {
        pass: failures.length === 0,
        budgets: mergedBudgets,
        failures
    };
}
