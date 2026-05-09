# Feature Branch Map

Generated on 2026-05-09 from local and `origin/*` refs.

## Audit Commands

```bash
git branch -vv --all
git for-each-ref --format='%(refname:short)%09%(objectname:short)%09%(committerdate:iso8601)%09%(subject)' refs/heads refs/remotes/origin
git rev-list --left-right --count main...<branch>
git rev-list --left-right --count codex/gameplay-improvements...<branch>
git log --oneline --decorate --max-count=12 main..<branch>
git diff --stat main...<branch>
```

## Summary

| Branch | Head | Main relationship | Current relationship | Disposition |
| --- | --- | --- | --- | --- |
| `codex/gameplay-improvements` / `origin/codex/gameplay-improvements` | `c499a26` | `0 behind / 9 ahead` | active branch | Keep and continue launch polish here. |
| `feature/game-engine-upgrade` / `origin/feature/game-engine-upgrade` | `6178456` | `396 behind / 9 ahead` | `405 behind / 9 ahead` | Preserve as stale reference; do not merge wholesale. |
| `native` | `5c44d7a` | `96 behind / 129 ahead` | `105 behind / 129 ahead` | Preserve as Unity/native pivot reference; blocked for current web/Capacitor launch path. |
| `legacy-v1` / `origin/legacy-v1` | `84b361f` | `380 behind / 0 ahead` | `389 behind / 0 ahead` | Fully merged historical branch; no action. |
| `origin/codex/find-and-fix-important-bug` | `42efa06` | `395 behind / 0 ahead` | `404 behind / 0 ahead` | Fully merged historical bugfix branch; safe to prune after owner confirmation. |
| `main` / `origin/main` | `9b33326` | baseline | `9 behind / 0 ahead` from current | Production baseline; current branch is ahead. |

`origin/HEAD` points to `origin/main`.

## Branch Notes

### `codex/gameplay-improvements`

This is the active polish branch. It contains nine commits on top of `main`:

```text
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

Relevant launch-polish areas changed here include generated weapon icons, level layouts, staged ammo progression, compact weapon bar behavior, performance frame pacing, supply drop assets/audio, Garage/Armory progression entry points, and the related unit/e2e coverage.

Recommendation: continue all web/Capacitor polish on this branch.

### `feature/game-engine-upgrade`

This branch diverged before the current production baseline. It has nine commits not in `main`, but it is missing 396 commits from `main` and 405 commits from the active branch.

Notable commits:

```text
6178456 Add player progression system and mobile-responsive 16:9 layout
d9190ef Improve enhancement fallback for non-WebGL devices
6830584 Fix GameEnhanced UI method overrides
a78f4cc Fix game-enhanced.js UI manager reference error
a069bd3 Fix tank state bugs and sound spam
ab0751a Add debugging for self-kill draw issue
2e93d7a Fix self-kill behavior and round end timing
7bd090d Fix win conditions and replace alerts with professional UI
ea25dc8 Add enhanced game features with modern libraries
```

Files unique to this branch include `js/game-enhanced.js`, `js/physics-enhanced.js`, `js/renderer-pixi.js`, `js/ui-animations.js`, `css/synthwave-theme.css`, `ENHANCED_FEATURES.md`, `GAME_DESIGN_DOC.md`, `MOBILE_APP_ROADMAP.md`, `test-enhanced.html`, and `webpack.config.js`.

The branch explored WebGL/Pixi, GSAP-style UI animations, spatial-grid performance ideas, a separate progression module, and a more ambitious mobile roadmap. The current active branch already has newer systems for level progression, Pixi terrain experimentation, mobile checks, generated assets, and tested gameplay flows. The stale branch also carries older build assumptions such as `webpack.config.js` and a `server.log`.

Recommendation: do not merge wholesale. Use only as an idea archive if a future task specifically needs a concept such as UI animation patterns or the old design notes.

### `native`

This local-only branch is a large Unity/native pivot. It is missing 105 commits from the active branch and has 129 commits not in the active branch.

Notable commits:

```text
5c44d7a chore: Save Unity native branch progress before potential pivot
30772bc chore: Mark P2 Unity Editor tasks as needs-user
e710db1 feat(debug): Add performance profiling infrastructure for iOS testing
b52b163 feat(ui): Implement scene transition system with synthwave effects
c6bc3e1 docs: Add comprehensive iOS TestFlight deployment guide
cd99cde feat(assets): Generate Unity .meta files for supply drop sprites
86322aa feat(ui): Implement Supply Drop opening screen
```

The diff moves the web game into `web-reference/` and adds Unity-style `Assets/`, `ProjectSettings/`, C# scripts, shaders, prefabs, generated `.meta` files, iOS icons, and native app scaffolding. It also includes `docs/research/native-app-analysis.md`, which recommends Unity as a potential long-term path for premium mobile polish.

Recommendation: preserve as an architectural/reference branch. Do not merge into the active web/Capacitor branch unless the product decision changes from "ship the current web game through Capacitor" to "restart as Unity/native."

### `legacy-v1`

This branch has zero commits ahead of `main`; it is fully contained in the current baseline. It is 389 commits behind the active branch.

Recommendation: no launch-polish action needed. Keep only if historical reference is useful.

### `origin/codex/find-and-fix-important-bug`

This remote branch has zero commits ahead of `main`; it is fully contained in the current baseline. Its final commit is:

```text
42efa06 fix player name update
```

The branch touched `js/ui.js` only at its head. Because it is already merged into `main`, it has no remaining launch-polish payload.

Recommendation: safe to prune after owner confirmation.

### `main` / `origin/main`

`main` is the production baseline at:

```text
9b33326 Upgrade visuals, terrain physics, and iOS rendering path
```

The active branch is nine commits ahead and zero commits behind `main`.

Recommendation: merge `codex/gameplay-improvements` back to `main` only after the blocked App Store/TestFlight tasks are explicitly unblocked or intentionally deferred.
