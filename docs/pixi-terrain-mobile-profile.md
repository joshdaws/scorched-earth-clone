# Pixi Terrain Mobile Profile

Date: 2026-04-25
Bead: `scorched-earth-qtq.4.2.2`

Update: launch performance follow-up disabled the optional Pixi de-rez `NoiseFilter` sweep across runtime quality profiles. Mobile and desktop still keep Pixi terrain chunks and terrain-cell debris, but skip the extra filter pass until it can be profiled on real devices behind an experimental flag.

## Scope

This pass profiles the lazy-loaded Pixi terrain layer under the local browser smoke environment and records the iOS WebView decision points. It does not replace a real-device TestFlight run; WebKit GPU scheduling, thermal throttling, and memory pressure still need device validation.

## Environment

- Runtime: local Vite server, offline service config.
- Browser: Chrome 147 on macOS via MCP Playwright.
- Viewport: 1280x768, DPR 1.
- WebGL: available.
- Scenario: `/?scene=physics-sandbox&wind=0`, deterministic terrain seed `4128`, three terrain impacts at current surface height plus 18 px, radius 82.
- Console: 0 errors, 1 known audio warning (`Cannot play music: Audio not initialized`).

## Results

| Quality | Frame p95 | Frame max | FPS estimate | Pixi rebuild p95 | Pixi render p95 | Frame render p95 | Impact p95 | Last removed cells | Memory |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| High | 16.8 ms | 50.0 ms | 87.0 | 2.8 ms | 0.5 ms | 7.3 ms | 2.9 ms | 188 | 356 MB |
| Balanced | 16.7 ms | 18.2 ms | 108.0 | 2.4 ms | 0.4 ms | 0.9 ms | 1.1 ms | 188 | 382 MB |
| Low | 16.7 ms | 16.9 ms | 109.4 | 2.6 ms | 0.2 ms | 0.8 ms | 0.9 ms | 188 | 321 MB |

Build output from the current release build is 4.88 MB across 106 files. The largest runtime JS chunks are currently about 1.34 MB and 0.85 MB before gzip, so Pixi remains acceptable only if it stays lazy-loaded and gameplay assets stay grouped.

## Decision

Keep the Pixi terrain layer, but keep iOS defaulting to `balanced`.

The terrain-specific costs are low enough to keep the architecture: dirty-chunk rebuild p95 stayed under 3 ms, Pixi render p95 stayed under 0.5 ms, and terrain impact p95 stayed under 3 ms. The main risk is not terrain rebuild time; it is high-quality whole-frame spikes, memory pressure, and the optional de-rez filter sweep. High quality should stay a desktop/default-high profile; balanced should remain the iOS default.

## iOS Validation Thresholds

On physical iPhone/iPad or TestFlight WebView, keep Pixi terrain enabled only if:

- `frame.p95Ms <= 24` after five repeated terrain impacts.
- `frame.maxMs <= 55` outside first-load asset decode.
- `pixiTerrainRebuild.p95Ms <= 8`.
- `pixiTerrainRender.p95Ms <= 2`.
- JS heap remains below 450 MB after three rounds with repeated impacts.
- No WebGL context lost, black terrain frames, or thermal throttling after 3 minutes.

If those fail, force the iOS profile to `low` before reducing terrain cell density.

## Next Recommendations

- Add the repo-native browser smoke dependency in `scorched-earth-qtq.10` so this profile can run without MCP-only tooling.
- Add projectile interpolation and hitch metrics in `scorched-earth-qtq.12`; current spikes are frame-level, not terrain-rebuild-level.
- Keep Pixi scoped to terrain/effects until we have real iOS data. Moving more UI/gameplay rendering into Pixi now would increase migration risk without fixing the measured bottleneck.
