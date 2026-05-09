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
| Use `$computer-use` | `mcp__computer_use__.list_apps` saw Google Chrome running. `mcp__computer_use__.get_app_state({ app: "Google Chrome" })` failed with `Apple event error -10005: cgWindowNotFound`. Earlier attempts hit the same failure. | Blocked by tool/app-state failure; browser verification uses Playwright instead. |
| Open a browser and play/verify the game | `npm run smoke:browser -- --scenario controls --quality balanced` passed and wrote `artifacts/browser-smoke/2026-05-09T19-24-12-185Z-controls.png` plus metrics/console JSON. Playwright collection/drop flow passed. | Covered through repo browser automation, not Computer Use. |
| Map every feature branch | `docs/branch-map.md` maps `codex/gameplay-improvements`, `feature/game-engine-upgrade`, `native`, `legacy-v1`, `origin/codex/find-and-fix-important-bug`, `main`, and origin aliases with ahead/behind counts and disposition. | Covered. |
| Replace temporary assets | `find assets -type f` found no files named placeholder/temp/test except reference grid templates. `rg` still finds placeholder fallback code in `js/assets.js`, tank fallback rendering, and historical spec docs. Manifest/file tests passed as part of `npm run check`. | Mostly covered for runtime files; fallback code remains intentionally for missing-load resilience. |
| Weapon types increase in difficulty | Commits `7796310`, `bf9d30f`, and `6120d80` staged ammo progression and completed visual coverage. `tests/unit/weapon-bar.test.js`, `tests/unit/weapon-visual-assets.test.js`, and `tests/e2e/level-mode-journey.spec.js` passed through `npm run check`. | Covered by progression tests and weapon visual tests. |
| Level designs increase in difficulty and feel like synth worlds | `Assets/levels/layouts.v1.json`, `js/level-progression.js`, and level tests were updated in prior polish commits. `tests/unit/level-layouts.test.js` and `tests/unit/levels-stars.test.js` passed. | Covered by authored layouts/tests; subjective level feel still benefits from real player feedback. |
| Intuitive controls | Browser smoke controls scenario passed at balanced quality; `tests/e2e/new-player-journey.spec.js` and `tests/e2e/level-mode-journey.spec.js` are part of the test suite. | Covered in automation; needs physical iOS device confirmation. |
| Long weapon scroller fixed | Compact weapon bar changes landed in `js/ui.js`/`js/main.js`; `tests/unit/weapon-bar.test.js` passed. | Covered. |
| Secondary screens and star earning polished | Level-complete threshold/theme/button polish landed; Garage/Armory secondary progression entry points landed in `c499a26`; `tests/e2e/collection-gacha.spec.js` and `tests/unit/levels-stars.test.js` passed. | Covered in web automation. |
| Animation where expected | Existing effect systems and level-complete/supply-drop flows are covered by e2e/smoke tests; visual audit tooling exists in `docs/performance-smokes.md`. | Partially covered; full visual audit across all viewports was not rerun in this audit pass. |
| No lag / strong performance | `npm run check`, `npm run build`, `npm run ios:check`, and browser smoke controls passed. Prior projectile and terrain frame pacing work passed budgets. Current controls smoke wrote metrics JSON. | Covered for automated smoke paths; physical-device thermal/performance testing remains. |
| Ready to convert/sync to iOS | `npm run ios:check` passed, including build, release budget, and `npx cap sync ios`. | Covered for local Capacitor readiness. |
| Ready to upload to App Store | Open/blocked beads remain: `scorched-earth-3fe.4` App Store submission preparation, `scorched-earth-3fe.5` Submit to App Store and launch, `scorched-earth-3fe.2` beta feedback, and deferred monetization epic `scorched-earth-ttk`. | Not complete. |

## Latest Gate Evidence

Recent commands run successfully on `codex/gameplay-improvements`:

```bash
npm run check
npm run test:e2e -- tests/e2e/collection-gacha.spec.js
npm run build
npm run ios:check
npm run smoke:browser -- --scenario controls --quality balanced
bd ready
```

`bd ready` reports:

```text
No ready work found (all issues have blocking dependencies)
```

The pushed branch is up to date with `origin/codex/gameplay-improvements` after:

```text
c499a26 Rehome progression entry points
f7aa1f2 Document feature branch map
```

## Remaining Blockers

The objective is not complete because App Store launch readiness cannot be honestly verified from the repo alone:

- `scorched-earth-3fe.4` is still open and depends on beta/launch dependencies. It requires App Store screenshots, metadata, privacy policy URL, support URL, App Store Connect configuration, IAP product readiness, and a final submission checklist.
- `scorched-earth-3fe.5` is still open and depends on `scorched-earth-3fe.4`. It requires uploading the final build, Apple approval, launch date, live App Store release, and post-launch monitoring.
- `scorched-earth-3fe.2` is blocked pending TestFlight/beta setup and feedback. It requires real beta tester feedback and P0/P1 bug triage.
- `scorched-earth-ttk` and its monetization children are explicitly deferred by notes: "Do not work on this epic until explicitly unblocked by Josh." This blocks any App Store path that requires ads/IAP products.
- Computer Use cannot currently drive Chrome because the plugin returns `cgWindowNotFound`; browser verification is covered through Playwright instead.

## Conclusion

Do not mark the active goal complete yet. The web game is substantially polished and passes the current automated web/iOS gates, but the App Store upload portion is blocked by product/account work and real-device beta validation that is not complete in the repo.
