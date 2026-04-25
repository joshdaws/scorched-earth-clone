# Performance and iOS Readiness Audit

Date: 2026-04-24
Branch: `codex/image-gen-2`

## Scope

Audit focus:

- Runtime rendering performance for title/menu and gameplay.
- Startup, bundle, and asset payload.
- iOS/Capacitor readiness for TestFlight-quality validation.
- Graphics architecture readiness for heavier generated image assets and Pixi terrain effects.

This is an audit only. It does not change runtime behavior.

## Measurements

Commands and checks run:

- `npm run build`
- Browser smoke at `http://127.0.0.1:8001/`
- Browser smoke at `http://127.0.0.1:8001/?scene=physics-sandbox&wind=0&audit=perf`
- `TestAPI.fireDirect()` projectile smoke
- `TestAPI.destroyTerrain({ x: 620, y: 505, radius: 90 })` de-rez smoke

Production build output:

- Main chunks: `853.84 kB` and `1,317.73 kB` minified JS.
- Sourcemaps in `www`: `3.48 MB` and `6.09 MB`.
- Build warnings:
  - `config.js` cannot be bundled without `type="module"`.
  - `unlockRandomTank` import warning in `js/main.js`.
  - Chunks over Vite's 500 kB warning threshold.

Asset/output payload:

- `assets`: 17 MB.
- `www`: 28 MB after build and static copy.
- Largest assets copied into release output:
  - `assets/images/backgrounds/Gemini_Generated_Image_mps1t8mps1t8mps1.png`: 7.24 MB.
  - `assets/TextMesh Pro/.../LiberationSans SDF.asset`: 2.26 MB.
  - `assets/images/backgrounds/bg-gameplay.png`: 2.07 MB.
  - `assets/images/effects/explosion-synthwave.png`: 1.06 MB.
  - `assets/references/*`: multiple 0.49-0.66 MB reference files copied to release.

Browser runtime snapshots on desktop:

- Title/menu over 3s:
  - Average frame interval: 21.3 ms.
  - p95 frame interval: 26.5 ms.
  - Max frame interval: 67 ms.
  - 31 frames over 25 ms.
  - JS heap used: about 110 MB.
  - Two visible canvases: 2D game canvas and Three.js title canvas.
- Gameplay sandbox idle over 2.5s:
  - Average frame interval: 13.5 ms.
  - p95 frame interval: 17.5 ms.
  - Max frame interval: 25.7 ms.
- Projectile flight over 2.5s:
  - Average frame interval: 14.1 ms.
  - p95 frame interval: 17.9 ms.
  - Max frame interval: 24.8 ms.
- Terrain de-rez after destroying 133 cells:
  - Average frame interval: 14.0 ms.
  - p95 frame interval: 18.1 ms.
  - Max frame interval: 50.2 ms.
  - One frame over 33 ms.

These desktop numbers are good enough for current gameplay, but the menu/title and release payload are not yet where they should be for iOS.

## Executive Summary

The biggest iOS/performance risk is eager initialization and eager loading. `js/main.js` imports nearly every game system, engagement screen, editor, collection, Convex-facing screen, Three.js title scene, Pixi terrain layer, TestAPI, sound system, and renderer path up front. Even before the player starts a round, the app has paid most of the code and initialization cost.

Gameplay frame timing is currently acceptable on desktop after the fixed-step catch-up patch. The title/menu is the heavier runtime path because it runs a separate Three.js animation with bloom behind the 2D UI. On iOS, that should be treated as a premium effect with quality tiers and battery/thermal controls.

The asset pipeline is the other release blocker. `copy-static` blindly copies references, unused/generated experiments, Unity/TextMeshPro leftovers, source references, and sourcemaps into `www`. This inflates the iOS app and startup decode surface, and it makes it harder to reason about which Image Gen assets are production assets versus source/reference material.

## Priority Findings

### P1: Initial App Path Is Too Large

Location:

- `js/main.js`
- `vite.config.js`
- `package.json`

Evidence:

- `main.js` is about 1.49 MB decoded in dev and imports most systems at top level.
- Production emits two large chunks: 853.84 kB and 1,317.73 kB minified.
- Gameplay-only loads still include menu/editor/collection/supply-drop/high-score/achievement modules.

Impact:

- Slower startup on iOS WebView.
- More memory retained before gameplay.
- Harder to avoid frame hitches because unrelated modules execute during initialization.

Recommendation:

- Split `main.js` into a small boot/orchestrator plus lazily imported state modules.
- Lazy-load non-critical screens: shop, high scores, achievements, collection, supply drops, level editor, tank editor, engagement UI.
- Keep core gameplay modules in the initial gameplay chunk.
- Gate `TestAPI` behind dev/test scene flags so it is not part of release startup.
- Add `manualChunks` or route/state-level dynamic imports after the module boundaries exist.

Related existing issue:

- `scorched-earth-qtq.6`

### P1: Release Output Copies Non-Production Assets

Location:

- `package.json` `copy-static`
- `assets/`
- `www/`

Evidence:

- `www` is 28 MB.
- `assets/references/*` and TextMeshPro Unity assets are copied into release output.
- Largest background source PNG is 7.24 MB.
- Sourcemaps add about 9.57 MB to `www`.

Impact:

- Larger iOS app bundle.
- Higher install/download size.
- Higher chance of accidental runtime references to source/reference files.
- Slower asset audits and less predictable Image Gen production pipeline.

Recommendation:

- Replace `cp -r assets www/` with a release asset manifest/copy script.
- Exclude `assets/references`, `.DS_Store`, Unity/TextMeshPro leftovers, source grids/templates, and unused experiments.
- Generate production WebP/AVIF variants where Safari support allows it, with PNG fallback for transparent sprites.
- Disable production sourcemaps by default and add a separate debug build mode that keeps them.
- Add CI check that fails if `www` includes references or exceeds a size budget.

Related existing issue:

- `scorched-earth-i8b` covers unused generated UI/dirt assets, but release pruning needs a broader task.

### P1: iOS Needs Adaptive Render Quality

Location:

- `js/renderer.js`
- `js/screenSize.js`
- `js/effects.js`
- `js/titleScene/titleScene.js`
- `js/pixiTerrainLayer.js`
- `capacitor.config.json`

Evidence:

- Renderer uses current device pixel ratio for the 2D canvas.
- Title scene caps WebGL pixel ratio at 2, but gameplay canvas can still scale to high DPR.
- CRT noise draws random rectangles every frame across the full viewport.
- Title scene uses Three.js post-processing bloom and a self-owned `requestAnimationFrame` loop.
- Pixi terrain uses a separate renderer, then composites into the 2D canvas every gameplay frame.

Impact:

- High-DPR iPhones can turn one 1200x800 logical frame into a much larger physical framebuffer.
- Full-screen CRT noise and bloom are easy battery/thermal drains.
- Separate render loops make frame pacing harder to budget.

Recommendation:

- Add a central `RenderQuality` profile: `low`, `balanced`, `high`.
- Cap gameplay DPR independently from screen DPR, especially on iOS.
- Disable or lower CRT VHS noise, chromatic aberration, and title bloom on `low`/thermal-constrained profiles.
- Pause or fully stop title scene when not visible; consider destroying/recreating expensive WebGL resources on older devices.
- Add a setting to turn off CRT effects and persist it.
- Add an iOS device matrix and target budgets: 60 fps on recent devices, stable 30 fps fallback on older devices, memory ceiling, startup ceiling.

### P1: No Runtime Performance Budget or Hitch Telemetry

Location:

- `js/game.js`
- `js/debug.js`
- `js/testAPI.js`
- `tests/`

Evidence:

- Browser measurements had to be collected ad hoc from Playwright.
- The loop now drops stale fixed-step backlog, but there is no built-in counter for dropped time, hitches, active Pixi fragments, terrain rebuild time, or frame buckets.

Impact:

- Performance regressions will be subjective and hard to catch.
- iOS optimization becomes guesswork without device-side telemetry.

Recommendation:

- Add a small performance monitor module with rolling frame interval, update count, dropped fixed-step time, active particles/fragments, terrain rebuild duration, and heap where available.
- Expose it through `TestAPI` and optionally a debug overlay.
- Add a browser smoke test that fails when p95/max frame intervals exceed thresholds in title, idle gameplay, projectile flight, and terrain impact scenes.

Related existing issue:

- `scorched-earth-qtq.12` includes hitch metrics for projectile work; broaden or add a dedicated performance-budget task.

### P2: Pixi Terrain Rebuild Is Full-Scene and CPU Heavy

Location:

- `js/pixiTerrainLayer.js`
- `js/terrainCells.js`
- `js/main.js` `destroyTerrainAt`

Evidence:

- `renderPixiTerrainLayerToCanvas` calls `rebuildTerrainGraphics` whenever terrain is dirty.
- `rebuildTerrainGraphics` iterates every occupied terrain cell and appends fill/line rects to one `Graphics`.
- Every gameplay frame renders the Pixi app and copies `app.canvas` into the 2D canvas.

Impact:

- Current desktop numbers are acceptable, but larger cell counts, smaller cells, larger iOS DPR, or more generated effects can create hitches.
- Full-scene rebuilds after each terrain change will scale poorly as terrain gets more physically detailed.

Recommendation:

- Cache static terrain into a Pixi render texture after rebuild, then draw the cached texture each frame.
- Rebuild only dirty columns/regions after terrain impacts.
- Consider chunked terrain containers by column range so only modified chunks are regenerated.
- Keep de-rez debris in a separate particle layer.
- Add profiler marks around terrain rebuild, Pixi render, and canvas composite.

### P2: Title Scene Is Visually Strong but Heavy for Mobile

Location:

- `js/titleScene/titleScene.js`

Evidence:

- Desktop menu measurement averaged 21.3 ms per frame, p95 26.5 ms, max 67 ms.
- Uses Three.js, EffectComposer, UnrealBloomPass, many line chunks, star shader, and an independent RAF.

Impact:

- Menu can feel less smooth than gameplay.
- On iOS, it may consume battery and thermal headroom before a round starts.

Recommendation:

- Add quality tiers for title scene: reduce bloom/composer, grid chunk count, renderer DPR, and animation FPS on mobile.
- Consider rendering at 30 fps while menu is idle.
- Stop rendering if a modal or non-title screen covers it.
- Lazy-load the title scene only when entering menu states.

### P2: Canvas Effects Create Work Every Frame

Location:

- `js/effects.js`
- `js/aimingControls.js`
- `js/ui/Button.js`
- `js/main.js`

Evidence:

- CRT noise loops over many viewport cells every frame.
- Many UI/HUD paths create gradients and use `shadowBlur` during every render.
- Explosion particles create radial gradients per particle per frame.

Impact:

- Looks good, but this style gets expensive quickly on mobile Safari.
- As Image Gen assets become more polished, canvas-drawn glow may become redundant work.

Recommendation:

- Pre-render stable UI chrome and CRT/noise patterns to offscreen canvases.
- Use sprite/bitmap glow baked into Image Gen assets where possible.
- Limit live `shadowBlur` and gradients to active/interactive elements.
- For particles, use pooled sprites or precomputed small glow textures instead of per-frame radial gradients.

### P2: Asset Loader Eagerly Loads All Images

Location:

- `js/assets.js`
- `assets/manifest.json`
- `js/main.js`

Evidence:

- `Assets.loadAllAssets()` loads every manifest image before the game starts.
- This includes collection/supply-drop/editor/tank skin images that are not needed for the first rendered menu or first round.

Impact:

- Longer startup.
- Higher peak memory.
- Harder to add high-resolution generated assets safely.

Recommendation:

- Split asset manifest by domain: boot, gameplay, title/menu, collection/shop, editor, supply-drop.
- Load boot/title assets first.
- Lazy-load gameplay assets when starting a round.
- Lazy-load collection/shop/editor assets only when entering those screens.
- Add metadata for target display size, memory cost, and transparency so generated assets can be compressed appropriately.

### P2: iOS Native Release Automation Is Thin

Location:

- `package.json`
- `capacitor.config.json`

Evidence:

- Scripts exist for `build:ios`, `ios:sync`, `open:ios`.
- No scripted `npx cap doctor`, pod install validation, simulator boot/smoke, or release asset budget.

Impact:

- iOS readiness depends on manual Xcode checks.
- Web regressions can land without knowing whether the native wrapper still syncs cleanly.

Recommendation:

- Add an `ios:check` script: build, copy/sync, Capacitor doctor where feasible, verify `www` exists, verify release assets, and document manual Xcode steps.
- Add an iOS readiness document with device matrix, orientation policy, safe-area behavior, audio/haptics checklist, and TestFlight checklist.

### P3: Remote Services and Offline Mode Need Release Guardrails

Location:

- `config.js`
- `js/convex-api.js`
- high score/engagement screens

Evidence:

- Browser smoke has known external-service issues when Convex/test hosts are unavailable.
- Existing issue `scorched-earth-qtq.7.2` covers local/offline service configuration.

Impact:

- iOS offline/startup behavior can feel broken if network features fail loudly or block screens.

Recommendation:

- Make network screens explicitly optional and non-blocking.
- Add offline fallbacks for high scores/engagement.
- Ensure startup never waits on external services.

## Positive Findings

- Gameplay desktop frame timing is currently healthy in the tested sandbox.
- The recent fixed-step catch-up cap addresses a real smoothness problem without changing projectile physics.
- Pixi terrain is isolated behind a fallback path; if Pixi fails, Canvas terrain can still render.
- The renderer and screen-size modules already account for safe areas and fixed design-space scaling.
- Haptics are dynamically imported and gracefully no-op outside Capacitor.
- Title scene pauses its clock when the document is hidden.
- Terrain de-rez fragment caps are already in place.

## Recommended Work Order

1. Create release asset pipeline and size budget.
2. Add render quality profiles for iOS: DPR cap, reduced CRT/title effects, persistent setting.
3. Split `main.js` into lazy state modules; start with non-gameplay screens and TestAPI.
4. Add performance telemetry and visual/perf smoke scenes.
5. Optimize Pixi terrain with cached render textures and dirty-region rebuilds.
6. Lazy-load asset groups by screen/state.
7. Add iOS readiness automation and checklist.

## Proposed Budgets

Initial practical budgets before real-device profiling:

- Production JS initial chunk: under 500 kB gzip.
- Total production JS loaded before first menu interaction: under 900 kB gzip.
- Release `www` without sourcemaps: under 15 MB.
- Boot-to-first-menu on recent iPhone: under 2.5s.
- Gameplay p95 frame interval: under 18 ms on desktop, under 22 ms on recent iPhone.
- Terrain impact max frame interval: under 33 ms on recent iPhone.
- JS heap after first gameplay scene: under 120 MB on iOS.

These should be adjusted after measuring on actual devices.
