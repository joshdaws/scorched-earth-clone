# Performance Smoke Budgets

Runtime metrics are exposed through `window.TestAPI` so browser smokes can reset, sample, and budget title/gameplay/impact scenes without adding one-off probes.

## Local Service Mode

Local browser smokes should run with generated `config.js` set to `SERVICE_MODE: 'offline'`, so high scores use local storage and do not contact Convex. To create or restore the smoke-safe config after testing an online deployment config, run:

```bash
npm run generate-config:offline
```

Production/online config generation still requires a real Convex URL:

```bash
CONVEX_URL=https://your-deployment.convex.cloud npm run generate-config
```

## Browser Flow

1. Open the target scene.
2. Wait for `window.TestAPI.isInitialized()` when using gameplay scenes.
3. Run:

```js
window.TestAPI.resetPerformance();
```

4. Exercise the scenario for at least 5 seconds.
5. Capture:

```js
JSON.stringify(window.TestAPI.getPerformanceMetrics().metrics, null, 2);
```

6. Save that JSON and run:

```bash
npm run perf:budget -- --input metrics.json --scene gameplay
```

## Suggested Scenarios

- `title`: load `/`, let the animated title run idle for 8-10 seconds.
- `gameplay-idle`: load `/?scene=physics-sandbox&wind=0`, wait 5 seconds without input.
- `projectile-flight`: load the physics sandbox, call `TestAPI.aim({ angle: 42, power: 70 })`, then `TestAPI.fireDirect()`, and sample until the shot resolves.
- `terrain-impact`: load the physics sandbox, call `TestAPI.destroyTerrain({ x: 620, y: 500, radius: 90 })`, and sample through the de-rez fade.

## Default Budgets

The budget script imports `DEFAULT_PERFORMANCE_BUDGETS` from `js/performanceMetrics.js`. Budgets can be overridden per run:

```bash
npm run perf:budget -- --input metrics.json --scene impact --budget frameP95Ms=28 --budget pixiTerrainRebuildP95Ms=24
```

The metrics snapshot includes rolling p95/max frame interval, update durations, dropped fixed-step backlog, terrain impact time, Pixi terrain rebuild/render time, active particle counts, Pixi de-rez fragments, and browser memory when available.
