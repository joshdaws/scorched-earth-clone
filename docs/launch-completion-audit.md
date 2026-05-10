# Launch Completion Audit

Generated on 2026-05-09 for the active polish/App Store objective.

## Objective Restated As Success Criteria

The game is complete only when all of the following are true:

1. The game has been played in a browser and verified through real browser automation.
2. `$computer-use` and `$imagegen` have been used where applicable, or any tool failure is documented.
3. Every feature branch has been mapped with a merge/preserve/prune disposition.
4. Temporary assets have been replaced by production-quality assets, with no known missing runtime assets.
5. Weapons and levels increase in difficulty across a synth/synthwave campaign arc.
6. Controls are intuitive on desktop and mobile-style inputs.
7. The long weapon scroller problem is fixed.
8. Secondary flows, especially level-complete/star earning and between-level screens, are polished.
9. Animation and visual polish exist where the user naturally expects feedback.
10. Performance is smooth with no known lag regressions.
11. The project is ready to convert/sync to iOS.
12. The project is ready to upload to the App Store.

## Prompt-To-Artifact Checklist

| Requirement | Evidence inspected | Status |
| --- | --- | --- |
| Use `$imagegen` | Generated supply-drop and weapon-icon raster assets were added under `assets/images/...`; manifest now covers all 40 weapon icons and 40 projectile visual entries; `tests/unit/weapon-visual-assets.test.js` passed in `npm run check`. | Covered for current asset replacement work. |
| Use `$computer-use` | Computer Use attached to Chrome on 2026-05-10 at `http://127.0.0.1:5173/` and clicked the live canvas `FIRE!` button in a running gameplay scene. Earlier adapter failures were documented, then a later retry succeeded. | Covered. |
| Open a browser and play/verify the game | `npm run smoke:browser -- --scenario controls --quality balanced` passed and wrote `artifacts/browser-smoke/2026-05-09T19-24-12-185Z-controls.png` plus metrics/console JSON. Expanded browser smokes for idle, projectile, terrain, high-scores, and visual impact also passed. Playwright collection/drop flow passed. | Covered through repo browser automation, not Computer Use. |
| Map every feature branch | `docs/branch-map.md` was refreshed on 2026-05-10 and maps `codex/gameplay-improvements`, `feature/game-engine-upgrade`, `native`, `legacy-v1`, `origin/codex/find-and-fix-important-bug`, `main`, and origin aliases with current heads, ahead/behind counts, and disposition. | Covered. |
| Replace temporary assets | `assets/manifest.json` has 155 runtime paths and the manifest scan finds no placeholder/temp/test/dummy/sample/fallback/Gemini runtime entries. `scripts/copy-production-assets.js` copies manifest assets and explicit runtime dirs while excluding `assets/references` and source-only mockups. `rg` still finds fallback code in runtime modules by design for missing-load resilience. | Covered for runtime assets; source/reference files remain outside release output. |
| Weapon types increase in difficulty | Commits `7796310`, `bf9d30f`, and `6120d80` staged ammo progression and completed visual coverage. `tests/unit/weapon-bar.test.js`, `tests/unit/weapon-visual-assets.test.js`, and `tests/e2e/level-mode-journey.spec.js` passed through `npm run check`. | Covered by progression tests and weapon visual tests. |
| Level designs increase in difficulty and feel like synth worlds | `assets/levels/layouts.v1.json`, `js/level-progression.js`, `docs/campaign-puzzle-balance-notes.md`, and level tests cover six synthworlds with ricochet, shield, teleport, and bunker mechanics. `tests/unit/level-layouts.test.js` and `tests/e2e/level-mode-journey.spec.js` now prove authored object coverage and playable browser routes. | Covered by authored layouts/tests; subjective level feel still benefits from real player feedback. |
| Intuitive controls | Browser smoke controls scenario passed at balanced quality; `tests/e2e/new-player-journey.spec.js` and `tests/e2e/level-mode-journey.spec.js` are part of the test suite. | Covered in automation; needs physical iOS device confirmation. |
| Long weapon scroller fixed | Compact weapon bar changes landed in `js/ui.js`/`js/main.js`; `tests/unit/weapon-bar.test.js` passed. | Covered. |
| Secondary screens and star earning polished | Level-complete threshold/theme/button polish landed; Garage/Armory secondary progression entry points landed in `c499a26`; survival now uses Run Over/New Run/Garage actions, delayed battlefield-preserving reveals, between-round perks, and animated reward count-ups. `tests/e2e/collection-gacha.spec.js`, `tests/e2e/survival-flow.spec.js`, and `tests/unit/levels-stars.test.js` passed. | Covered in web automation. |
| Animation where expected | Existing effect systems and level-complete/supply-drop flows are covered by e2e/smoke tests. `npm run audit:visual` passed 90 captures across title/menu, secondary screens, gameplay HUD, aiming, pause, shop, victory/defeat, round transition, level complete, impact effects, tank pivots, and terrain collapse. | Covered in automated visual audit; physical-device feel still needs TestFlight feedback. |
| No lag / strong performance | `npm run check`, `npm run build`, `npm run ios:check`, browser smoke controls, and expanded browser smokes passed. Latest balanced smoke p95 frame times: idle 16.7ms, projectile 16.7ms with max dropped backlog 50ms under the 80ms cap, terrain 16.7ms with zero dropped backlog, high-scores 9.2ms, visual impact 17.4ms. | Covered for automated smoke paths; physical-device thermal/performance testing remains. |
| Ready to convert/sync to iOS | `npm run ios:check` passed, including build, release budget, and `npx cap sync ios`. | Covered for local Capacitor readiness. |
| Ready to upload to App Store | Open/blocked beads remain: `scorched-earth-3fe.4` App Store submission preparation, `scorched-earth-3fe.5` Submit to App Store and launch, `scorched-earth-3fe.2` beta feedback, and deferred monetization epic `scorched-earth-ttk`. Local metadata and screenshot inventory draft exists at `docs/release/app-store-materials.md`; local privacy/support pages exist at `public/privacy.html` and `public/support.html`, with in-app Settings actions pointing to them. | Not complete. |

## Latest Gate Evidence

Recent commands run successfully on `codex/gameplay-improvements`:

```bash
npm run test -- tests/unit/puzzle-objects.test.js tests/unit/level-layouts.test.js
npm run test:e2e -- tests/e2e/level-mode-journey.spec.js --project=chromium-desktop
npm run test:e2e -- tests/e2e/survival-flow.spec.js --project=chromium-desktop
npm run check
npm run test:e2e -- tests/e2e/collection-gacha.spec.js
npm run build
npm run ios:check
npm run smoke:browser -- --scenario controls --quality balanced
npm run smoke:browser -- --scenario idle --quality balanced
npm run smoke:browser -- --scenario projectile --quality balanced --max-dropped-backlog-ms 80
npm run smoke:browser -- --scenario terrain --quality balanced
npm run smoke:browser -- --scenario high-scores --quality balanced
npm run smoke:browser -- --scenario visual --scene visual-impact --quality balanced
npm run audit:visual
npm run screenshots:app-store -- --skip-build --devices iphone-6-5 --targets 01-title-menu
npm run screenshots:app-store
bd ready
```

Latest local App Store support/privacy work also passed:

```bash
npm run check
npm run build
npm run ios:check
node --input-type=module <settings privacy/support Playwright smoke>
```

The build gate now verifies that `www/index.html` references existing generated
JS/CSS chunks, after browser verification found that the old static asset copy
step could delete the Vite bundle from `www/assets`.

App Store screenshot capture is automated by:

```text
scripts/capture-app-store-screenshots.js
npm run screenshots:app-store
```

The latest full App Store screenshot capture passed 24 captures across four
device slots and six recommended scenes:

```text
artifacts/app-store-screenshots/2026-05-10T02-03-38-441Z/summary.json
```

The latest public release deployment serves the offline-first build and App
Store support pages:

```text
https://scorched-earth.vercel.app/
https://scorched-earth.vercel.app/privacy.html
https://scorched-earth.vercel.app/support.html
```

Verification on 2026-05-09:

```text
privacy.html: HTTP 200
support.html: HTTP 200
config.js: SERVICE_MODE 'offline', OFFLINE_SERVICES true, CONVEX_URL ''
```

Local App Store material preparation now has an in-repo draft:

```text
docs/release/app-store-materials.md
docs/release/app-store-submission-checklist.md
public/privacy.html
public/support.html
scripts/capture-app-store-screenshots.js
```

`bd ready` reports:

```text
No ready work found (all issues have blocking dependencies)
```

The pushed branch is up to date with `origin/codex/gameplay-improvements` at
`8ef914d` after 37 commits on top of `main`, including:

```text
8ef914d Polish battlefield and reward visuals
ddec960 Record public App Store URL check
77f16c3 Refresh App Store screenshots evidence
7ba9784 Record App Store blocker handoff
b9c2a20 Correct computer-use audit status
91fb5d7 Verify campaign puzzle routes
175cb18 Tune survival perk balance
8ac2a98 Document survival opener playthrough
80faec5 Tune survival terrain and shot probes
c469086 Add survival balance browser evidence
63ff078 Tune survival AI weapon progression
e4f5522 Cover survival delayed result reveals
668467a Animate survival round rewards
e27da86 Add survival between-round perk choices
52cf6fa Polish survival run over actions
5a7acd1 Expand campaign puzzle progression
d9477ac Start survival runs directly from game over
de3f5be Add puzzle combat polish slice
522b24a Deploy App Store support pages
1cffe2b Add App Store submission checklist
2dfa3ec Add App Store screenshot capture
2156e7a Add App Store privacy and support pages
a58c371 Draft App Store submission materials
d32caf0 Record expanded browser smoke receipts
e4f8212 Update audit with visual receipt commit
450f105 Fix visual audit canvas sampling
a059189 Record launch completion audit
f7aa1f2 Document feature branch map
c499a26 Rehome progression entry points
6120d80 Complete weapon visual coverage
9f6c83e Fix terrain frame pacing
58f1db1 Polish level layouts and runtime assets
6e2c9ac Update knight rider tank sprite
bf9d30f Tune staged ammo progression
7796310 Stage level ammo progression
3febec1 Simplify game flow entry points
0abcb4a Add gameplay simplification follow-up issues
```

The latest full visual audit passed:

```text
Passed 90 captures. Summary: artifacts/visual-audit/2026-05-09T19-32-31-161Z/summary.json
```

Latest gameplay-polish receipts added after the original audit:

```text
docs/survival-balance-notes.md
docs/campaign-puzzle-balance-notes.md
scorched-earth-cro closed: survival rounds 1-11 documented, perk/economy tuning verified.
scorched-earth-k9s closed: all world puzzle-object progression and playable route coverage verified.
```

The latest expanded browser smoke pass wrote these receipts:

```text
artifacts/browser-smoke/2026-05-09T19-39-07-669Z-idle.metrics.json
artifacts/browser-smoke/2026-05-09T19-39-16-357Z-projectile.metrics.json
artifacts/browser-smoke/2026-05-09T19-39-25-220Z-terrain.metrics.json
artifacts/browser-smoke/2026-05-09T19-39-30-260Z-high-scores.metrics.json
artifacts/browser-smoke/2026-05-09T19-39-38-199Z-visual.metrics.json
```

Resume audit on 2026-05-10 verified the current pushed branch state:

```text
computer-use attached to Chrome on http://127.0.0.1:5173/ and fired a live
gameplay shot through the canvas UI.

develop-web-game Playwright client captured live gameplay screenshots/state:
artifacts/manual-play/resume-2026-05-10-space/shot-0.png
artifacts/manual-play/resume-2026-05-10-space/state-0.json

npm run smoke:browser -- --scenario controls --quality balanced
passed with p95 frame time 17ms, max frame time 17.5ms, and zero dropped backlog:
artifacts/browser-smoke/2026-05-10T01-12-19-262Z-controls.metrics.json
```

Visual polish correction on 2026-05-10 addressed the screenshot issues raised during
review:

```text
Generated and wired six distinct world battlefield backgrounds:
assets/images/backgrounds/world-1-neon-dunes.png
assets/images/backgrounds/world-2-chrome-canyons.png
assets/images/backgrounds/world-3-prism-bunkers.png
assets/images/backgrounds/world-4-vector-vortex.png
assets/images/backgrounds/world-5-pixel-wastes.png
assets/images/backgrounds/world-6-midnight-citadel.png

Replaced shield, ricochet, teleporter, and bunker puzzle-object art with flat
2D synthwave PNG assets, and preloaded selected level backdrop/puzzle/loadout
art before the first gameplay frame to avoid fallback placeholders.

Replaced the most visible supply-drop and collection tank reward placeholders
with high-resolution generated Standard Issue and Arctic tank portraits.

Manual visual receipts:
artifacts/manual-play/polish-visuals-2026-05-10/world4-preloaded-entry-loadout.png
artifacts/manual-play/polish-visuals-2026-05-10/world3-shield-bunker-settled.png
artifacts/manual-play/polish-visuals-2026-05-10/world5-shield-bunker-settled.png
artifacts/manual-play/polish-visuals-2026-05-10/supply-drop-arctic-reveal-final.png
artifacts/manual-play/polish-visuals-2026-05-10/collection-portraits-2.png

npm run check
npm run build
npm run ios:check
npm run smoke:browser -- --scenario controls --quality balanced
npm run audit:visual -- --targets gameplay-hud,collection,supply-drop --viewports desktop,iphone-14
all passed after the visual polish correction.
```

Current manifest and content checks:

```text
weaponIcons: 40/40 weapon IDs covered by authored assets
weaponVisuals.projectileCoverage: 40/40 weapon IDs documented as approved
audio manifest: synthwave-title-loop.wav, neon-battle-loop.wav,
garage-shop-loop.wav, and production-named SFX WAVs; no runtime test-beep/test-loop
entries remain
Assets/levels/layouts.v1.json: authored puzzle objects exist across all worlds,
including W6 final combined teleport/ricochet/shield/bunker route coverage
bd ready --json: []
```

Native Xcode handoff check on 2026-05-10:

```text
xcode-select -p
/Library/Developer/CommandLineTools

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -version
Xcode 26.4.1
Build version 17E202

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -list -project ios/App/App.xcodeproj
blocked by local machine state:
You have not agreed to the Xcode license agreements.
```

The repo-side Capacitor/iOS checks pass, but native archive validation still
requires the owner to accept the Xcode license and configure signing/team in
Xcode.

The owner/release handoff verifier is now available as:

```bash
npm run release:handoff
```

It checks the local App Store evidence package, validates the latest screenshot
summary shape, and reports remaining owner/App Store actions without treating
those account-controlled steps as repo-side failures.

## Remaining Blockers

The objective is not complete because App Store launch readiness cannot be honestly verified from the repo alone:

- `scorched-earth-3fe.4` is still open and depends on beta/launch dependencies. It requires App Store screenshots, metadata, privacy policy URL, support URL, App Store Connect configuration, IAP product readiness, and a final submission checklist.
- `scorched-earth-3fe.5` is still open and depends on `scorched-earth-3fe.4`. It requires uploading the final build, Apple approval, launch date, live App Store release, and post-launch monitoring.
- `scorched-earth-3fe.2` is blocked pending TestFlight/beta setup and feedback. It requires real beta tester feedback and P0/P1 bug triage.
- `scorched-earth-ttk` and its monetization children are explicitly deferred by notes: "Do not work on this epic until explicitly unblocked by Josh." This blocks any App Store path that requires ads/IAP products.
- `docs/release/app-store-materials.md` drafts metadata and a screenshot inventory, `docs/release/app-store-submission-checklist.md` maps the final upload handoff and privacy-label draft, local privacy/support pages now exist with in-app Settings navigation, verified public privacy/support URLs are live, and release-build App Store screenshot capture is automated. Any region-specific support contact details, owner copyright string, final pricing/availability, TestFlight build, final screenshot selection/upload, and App Store Connect submission still need owner/account work.

## Conclusion

Do not mark the active goal complete yet. The web game is substantially polished and passes the current automated web/iOS gates, but the App Store upload portion is blocked by product/account work and real-device beta validation that is not complete in the repo.
