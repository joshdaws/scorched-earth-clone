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

For repo-native browser automation, install the Playwright Chromium runtime once after a clean checkout:

```bash
npm run smoke:browser:install
```

Then run the default terrain-impact smoke:

```bash
npm run smoke:browser
```

The smoke runner starts Vite on a local port, waits for `window.TestAPI` or visual scene readiness, fails on console/page errors, and writes ignored artifacts to `artifacts/browser-smoke/`: a screenshot, metrics JSON, and console JSON. Useful variants:

```bash
npm run smoke:browser -- --scenario visual --scene visual-impact
npm run smoke:browser -- --scenario projectile --quality low
npm run smoke:browser -- --scenario projectile --quality balanced --max-dropped-backlog-ms 80
npm run smoke:browser -- --scenario controls --quality balanced
npm run smoke:browser -- --scenario terrain --quality balanced
npm run smoke:browser -- --scenario high-scores --quality balanced
npm run smoke:browser -- --scenario idle --quality balanced
```

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
- `controls`: load the physics sandbox, assert keyboard angle/power changes, Tab/Shift+Tab weapon cycling, mouse angle arc dragging, touch slingshot aiming, secondary-touch release safety, and release-to-fire.
- `terrain`: load the physics sandbox, assert seeded generation reproducibility, seed variation, height bounds, tank surface placement, accumulated crater destruction, and projectile-to-terrain collision accuracy.
- `high-scores`: load the physics sandbox in offline service mode, assert name entry, local high-score ranking/trimming, offline leaderboard backup names, run-stat math, aggregate lifetime stats, reload persistence, and high-scores screen entry.

The projectile smoke can also fail when fixed-step catch-up exceeds a threshold by passing `--max-dropped-backlog-ms`. Use that on shot-smoothness work so the screenshot and metrics prove the fired shot did not visibly sprint after a frame hitch.

The Pixi terrain de-rez pass is quality-gated. Low quality disables the filter sweep; balanced and high add a capped Pixi `NoiseFilter` sweep layer over the removed TerrainCellGrid cells. Watch `pixiDerezSweeps`, `pixiFragments`, `pixiTerrainRebuild`, and `pixiTerrainRender` together when tuning this effect for iOS.

Current local Pixi terrain profile results and iOS pass/fail thresholds are recorded in [pixi-terrain-mobile-profile.md](pixi-terrain-mobile-profile.md).

## Visual Audit Runner

Use the visual audit runner for Phase 3 mobile/desktop screenshot coverage:

```bash
npm run audit:visual
npm run audit:visual -- --targets title-menu,gameplay-hud --viewports iphone-14,desktop
```

The runner captures deterministic canvas screenshots to ignored `artifacts/visual-audit/` folders for five viewport classes: iPhone SE, iPhone 14, iPhone Plus/Max, iPad, and desktop. It covers menu/options, level select, high scores, achievements, collection, supply drop, gameplay HUD, aiming, pause, shop, victory, defeat, round transition, level complete, impact effects, tank pivots, and terrain collapse. Each capture fails on console/page errors, blank canvases, or canvas overflow beyond the viewport.

## Visual Regression Scenes

Use these deterministic routes for screenshot capture after graphics changes:

- `/?scene=visual-hud`: HUD, weapon dock, tanks, aiming controls, and terrain.
- `/?scene=visual-impact`: pre-carved crater with active terrain de-rez fragments.
- `/?scene=visual-tank-pivots`: player/enemy tank body and turret pivot alignment.
- `/?scene=visual-terrain-collapse`: side-impact crater and settled terrain columns.

Impact scenes expose `window.__SCORCHED_VISUAL_SCENE.ready` and `window.__SCORCHED_VISUAL_SCENE.trigger()`. For de-rez captures, call `trigger()` immediately before screenshot capture to refresh the deterministic crater/debris moment.

For iOS aspect captures, reuse `visual-hud` with the target viewport, for example `390x844`, `430x932`, and `1024x1366`.

## Default Budgets

The budget script imports `DEFAULT_PERFORMANCE_BUDGETS` from `js/performanceMetrics.js`. Budgets can be overridden per run:

```bash
npm run perf:budget -- --input metrics.json --scene impact --budget frameP95Ms=28 --budget pixiTerrainRebuildP95Ms=24
```

The metrics snapshot includes rolling p95/max frame interval, update durations, dropped fixed-step backlog, loop interpolation gauges, terrain impact time, Pixi terrain rebuild/render time, active particle counts, Pixi de-rez fragments, and browser memory when available.
