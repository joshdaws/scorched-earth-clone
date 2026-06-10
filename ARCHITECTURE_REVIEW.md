# Scorched Earth: Synthwave Edition — Architectural Review

**Review date:** 2026-04-23
**Reviewer:** Automated architecture audit
**Repo:** `git@github.com:joshdaws/scorched-earth-clone.git`
**Scope:** Full repository audit of source layout, runtime architecture, dependency
health, and code quality. Report is based on static inspection of tracked files,
`package.json`, `vite.config.js`, `capacitor.config.json`, `tsconfig.json`,
`jsconfig.json`, the Convex schema, and a representative read of source modules
(notably `js/main.js`, `js/game.js`, `js/constants.js`, `js/renderer.js`,
`js/convex-api.js`).

> **Executive summary.** Scorched Earth is a browser-first HTML5 Canvas artillery
> game with a Capacitor iOS target and an optional Convex backend for leaderboards
> and progression. The runtime is vanilla ES6 modules (not TypeScript despite the
> task framing), checked with `tsc --noEmit` via `jsconfig.json`/`checkJs`. The
> architecture is pragmatic and ships real gameplay, but it shows strong
> "one big orchestrator" smell: `js/main.js` alone is ~8,300 lines and imports
> ~50 sibling modules, many of which mutate module-global state. Test coverage,
> dependency hygiene, and file organization are the clearest improvement axes.

---

## 1. Tech Stack and Build Topology

### 1.1 Runtime stack

| Layer            | Choice                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| Language         | Vanilla JavaScript (ES2020), JSDoc-typed, checked with TypeScript 5.9   |
| Rendering        | HTML5 Canvas 2D + a secondary `<canvas id="titleScene">` using Three.js |
| Physics          | Hand-rolled ballistics + terrain-pixel collision (`projectile.js`, `terrain.js`) |
| Audio            | Web Audio API (`sound.js`, `music.js`)                                  |
| Input            | Unified pointer abstraction over mouse/touch/keyboard (`input.js`)      |
| Mobile shell     | Capacitor 8 (`ios/`, `www/` is the build output)                        |
| Backend (opt-in) | Convex 1.31 (`convex/schema.ts`, `convex/players.ts`, `convex/highScores.ts`) |
| Testing          | Vitest 4 + happy-dom, `canvas` for Node-side canvas assertions          |
| Linting          | ESLint 9 flat config (`eslint.config.js`)                               |
| Type checking    | `tsc --noEmit`; `jsconfig.json` turns on `checkJs` for `js/**/*.js`     |

### 1.2 Build targets

- **Web / dev:** `vite` on port 8000. `index.html` contains an `importmap`
  shim so the app also runs on a plain HTTP server (see `nocache_server.py`)
  without Vite.
- **Production web:** `vite build` → `www/` with `base: './'` so relative
  asset paths work under both a web host and Capacitor's WKWebView.
- **iOS:** `npm run build:ios` = `vite build` + `npx cap sync ios`. App id
  `com.scorched.earth`, custom iOS settings in `capacitor.config.json`
  (splash screen, Haptics plugin, `scrollEnabled: false`).
- **Deployment:** `vercel.json` present; `config.js` is git-ignored and
  generated at deploy time from env vars (see `scripts/generate-config.js`).

### 1.3 TypeScript posture

Two compilers in one project, each with a different remit:

- `tsconfig.json` is **strict** and scopes only to `convex/**/*.ts`. Convex
  is genuinely TypeScript (schema, queries, mutations). It sets a `paths`
  mapping for `./_generated/*`.
- `jsconfig.json` runs `checkJs: true` but **`strict: false`** over the
  entire `js/**` and `tests/**` tree. This is the practical type-check for
  gameplay code. `js/vendor/**` is excluded.

This split is fine, but the `strict: false` posture on the gameplay code
means implicit-any and nullable-access bugs are only caught ad hoc by JSDoc.

### 1.4 Repository artifacts

There is a large collection of Unity-era artifacts at the repo root
(`Assembly-CSharp.csproj`, `ScorchedEarth.*.csproj`, `Library/`, `Temp/`,
`UserSettings/`, `Assets/`). `.gitignore` correctly ignores these
(`*.csproj`, `Library/`, `Temp/`, etc.) and `git ls-files` confirms none of
the `*.csproj` files are tracked. They exist on disk as untracked leftovers
from a previous native branch, which makes `ls`-style exploration noisy but
does not pollute the repo itself.

---

## 2. Folder and Module Structure

### 2.1 Top level

```
/                     Vite root; index.html, style.css, config files
/js/                  Runtime source (~64k LoC across 82 JS files)
/js/controls/         Aiming/slingshot control variants
/js/engagement/       Daily rewards, daily challenges, engagement UI
/js/titleScene/       Three.js title-screen background
/js/ui/               Generic UI primitives (Button)
/js/vendor/           Bundled ES-module shim
/convex/              Convex backend (schema.ts, players.ts, highScores.ts)
/tests/               Vitest unit tests + helpers (canvas-mock, game-fixtures)
/scripts/             Node scripts (asset generation, level baseline, config)
/docs/                Architecture notes, research, specs, workflow, epics
/assets/              Runtime game assets (images, audio, icons, manifests)
/ios/                 Xcode project (Capacitor)
/www/                 Vite build output (gitignored)
```

### 2.2 The `js/` layer by domain

Roughly 82 modules, grouped below by concern. The grouping is *logical*;
the filesystem is flat — almost everything sits directly in `js/`.

**Engine loop & state**
- `main.js` (8,328 LoC) — orchestrator, top-level `init()`, state wiring,
  scene routing, `update`/`render`/`postRender` hooks.
- `game.js` — state machine (`GAME_STATES`, `validTransitions`,
  `registerStateHandlers`, fixed-timestep loop with spiral-of-death clamp).
- `renderer.js` — canvas sizing, DPR scaling, coordinate conversion.
- `screenSize.js`, `safeArea.js`, `uiPosition.js` — responsive layout.
- `sceneIsolation.js` — URL-driven scene routing for tests.
- `input.js` — mouse/touch/keyboard → unified event queue.
- `turn.js`, `runState.js` — turn phases and run-level progression state.

**Simulation**
- `terrain.js` — heightmap generation and destruction.
- `projectile.js` (1,557 LoC) — ballistic integration, collision, chain
  reactions, MIRV splitting.
- `tank.js` — tank entity, movement, fall damage.
- `damage.js` — explosion damage model.
- `wind.js` — per-round wind.
- `weapons.js` (1,042 LoC) + `weapons.js` registry — weapon catalogue.

**AI**
- `ai.js` (1,528 LoC) — trajectory solver and difficulty tiers.

**Rendering / effects**
- `effects.js` (1,733 LoC) — particles, screen shake, screen flash,
  background, CRT overlay.
- `stars.js`, `titleScene/titleScene.js` — Three.js title background.
- `tank-visuals.js`, `tank-effect-renderer.js` — tank sprite composition.

**Progression / economy**
- `money.js`, `tokens.js`, `shop.js` (2,290 LoC), `items.js`.
- `levels.js` (1,553 LoC), `level-layouts.js`, `level-layouts-baseline.js`.
- `runState.js`, `roundTransition.js`, `victoryDefeat.js`, `gameOver.js`.
- `highScores.js`, `nameEntry.js`.

**Meta systems**
- `achievements.js` + 5 category modules (`combat-achievements.js`,
  `precision-achievements.js`, `weapon-achievements.js`,
  `progression-achievements.js`, `hidden-achievements.js`).
- `achievement-popup.js`, `achievement-screen.js`, `lifetime-stats.js`,
  `performance-tracking.js`, `unlocks.js`.
- Supply-drop: `supply-drop.js`, `supply-drop-screen.js`,
  `extraction-reveal.js`, `drop-rates.js`, `pity-system.js`, `scrap-tutorial.js`.
- Tank collection / authoring: `tank-collection.js`, `tank-skins.js`,
  `tank-skins-generated.js`, `tank-design-schema.js`,
  `tank-design-store.js`, `tank-design-runtime.js`,
  `tank-editor-screen.js`, `tank-turret-constraints.js`.
- Engagement: `engagement/dailyRewards.js`, `engagement/dailyChallenges.js`,
  `engagement/engagementUI.js`.

**UI screens**
- `ui.js` (2,558 LoC) — HUD/menus, likely the most cross-cutting UI module.
- `level-select-screen.js`, `level-complete-screen.js`,
  `level-editor-screen.js`, `tank-editor-screen.js`,
  `collection-screen.js`, `supply-drop-screen.js`, `achievement-screen.js`,
  `pauseMenu.js`, `volumeControls.js`, `controls/controlSettings.js`.
- `ui/Button.js` — only generic UI primitive that has been promoted to
  a subfolder.

**Audio**
- `sound.js` (2,579 LoC), `music.js`, `haptics.js`.

**Backend bridge**
- `convex-api.js` — dynamic-import Convex bridge with localStorage fallback.

**Tooling**
- `debug.js`, `debugTools.js`, `debugOverlays.js`, `testAPI.js` (1,332 LoC).
- `assets.js` — asset manifest loader.

### 2.3 Observations on structure

- **Flat-ish layout.** Only four subfolders under `js/` (`controls/`,
  `engagement/`, `titleScene/`, `ui/`, `vendor/`). The other ~75 modules
  share the same directory. This works at the current size but will keep
  degrading as concerns like achievements (6 modules) or tank authoring
  (7 modules) continue to grow.
- **Naming is inconsistent.** camelCase (`runState.js`), kebab-case
  (`supply-drop-screen.js`), and mixed (`highScores.js` vs
  `high-scores.js`'s absence) coexist. No module is clearly "the canonical
  spelling."
- **Screen modules vs domain modules are not separated.** `shop.js` is
  both the shop data model and a screen renderer; same for `supply-drop.js`
  vs `supply-drop-screen.js` (two modules are better).
- **Vendor directory is tiny.** Only `es-module-shims.js`. Fine, but
  flagged because `jsconfig.json` excludes that path from type checking.

### 2.4 Convex backend

`convex/schema.ts` defines six tables with proper indexes:

- `players` (identity + denormalized stats)
- `highScores` (leaderboard rows, per-run)
- `achievements` (per-player unlocks + rewards)
- `tankCollection` (owned tanks, source, dup count)
- `lifetimeStats` (single aggregate row per player)
- `syncQueue` (offline action queue)

This is a reasonable cloud schema for a solo-player progression game.
`convex/highScores.ts` and `convex/players.ts` host the queries/mutations.
`convex/_generated/` is gitignored; `tsconfig.json` paths-alias
`./_generated/*` to the generated directory.

---

## 3. Key Design Patterns

### 3.1 State machine with transition whitelisting

`game.js` exposes `registerStateHandlers(state, { onEnter, onExit, update,
render })` and a `validTransitions` table. `setState(newState)` rejects
invalid transitions and logs them. This is a genuinely good pattern for a
game with 20+ states. Debug logging lists allowed transitions on rejection,
which helps during development.

### 3.2 Fixed-timestep game loop with render interpolation hook

`game.js → startLoop()` uses the classic accumulator pattern
(`FIXED_TIMESTEP = TIMING.FRAME_DURATION`, `MAX_ACCUMULATED_TIME = 5×`) to
decouple physics from render. An `alpha = accumulator / FIXED_TIMESTEP`
value is computed (currently commented out) and can be fed to renderers for
interpolation. Pause and resume are supported.

### 3.3 Module-as-singleton with explicit `init()`

Every module exports `init()` (or similar) plus a handful of
`get*`/`set*`/`update`/`render` functions. State lives in module-scoped
`let` variables (see `game.js` — `currentState`, `isRunning`, `accumulator`
are file-locals). There are effectively no classes for gameplay state; the
module *is* the instance. This keeps call sites terse but:

- blocks multiple concurrent worlds (e.g., test harness, split-screen);
- makes reset semantics implicit and error-prone;
- encourages cross-module getter imports, which is visible in `main.js`'s
  ~50 `import * as X from './X.js'` namespace imports.

### 3.4 Post-render overlay callback

`game.js → setPostRenderCallback()` runs after state-specific render hooks
so overlays (achievement popups, name-entry modal, supply-drop animation)
always paint on top. `main.js → postRender()` is the single registered
callback. This is a pragmatic compromise for a Canvas 2D app that lacks a
real scene graph.

### 3.5 URL-driven scene isolation for testing

`sceneIsolation.js` reads query params (`?scene=physics-sandbox&seed=42`)
and deterministically brings the game to a specific testable state. This is
paired with `testAPI.js` (1,332 LoC of programmatic control) and
`Debug.*` console commands, all documented in `CLAUDE.md`.

### 3.6 Asset manifest + sprite swap

`assets/manifest.json` enumerates tanks, projectiles, effects, and
backgrounds with paths + frame counts. Runtime code only refers to logical
keys, so artwork can be swapped without code changes. `CLAUDE.md` describes
the "placeholder strategy" used during ralph-loop development.

### 3.7 Dynamic imports for optional backend

`convex-api.js` `import()`s `convex/browser` and
`../convex/_generated/api.js` inside a `try/catch`. On failure (e.g., the
plain `python3 -m http.server` path shown in the README), the game
silently falls back to localStorage. `vite.config.js` explicitly marks
`/^convex/` and `/convex\/_generated/` as `external` in rollupOptions to
prevent Vite from trying to bundle them. Comments explain the
`@vite-ignore` pragma. This is a strong pattern and is well-commented.

### 3.8 Runtime configuration injection

`config.js` is generated from env vars at deploy time (see
`scripts/generate-config.js`, `vercel.json`, `.gitignore`) and loaded as a
classic `<script src="config.js">` before the module graph starts.
`convex-api.js` reads `window.SCORCHED_EARTH_CONFIG?.CONVEX_URL`. Clean
separation of build vs. runtime config.

### 3.9 Cache-busting import query

Three call sites use versioned import specifiers like
`./ui.js?v=20260111d` and `./aimingControls.js?v=20260111a`. These pin a
reload to the import-map cache after breaking changes. Harmless but a code
smell: it implies the team has been bitten by stale service-worker /
browser cache of those two modules specifically.

---

## 4. Data Flow

### 4.1 Bootstrap

1. `index.html` loads `style.css`, Google fonts, an importmap (for
   non-Vite local dev), `config.js` (runtime config), then the module
   `js/main.js`.
2. `main.js` waits for DOMContentLoaded, then calls a large `init()` that:
   - initializes Renderer, ScreenSize, Input, Assets, Sound, Music,
     Debug, VolumeControls, PauseMenu, HUD, AimingControls, etc.;
   - hydrates onboarding flags from localStorage;
   - registers state handlers for every `GAME_STATES.*` via
     `Game.registerStateHandlers(...)`;
   - parses scene-isolation URL params;
   - sets `Game.setPostRenderCallback(postRender)`;
   - calls `Game.startLoop(update, render, ctx)`.

### 4.2 Per-frame

```
requestAnimationFrame
  └─ loop(currentTime)
       ├─ if paused: render state + postRender, return
       ├─ accumulator += deltaTime
       ├─ while (accumulator >= FIXED_TIMESTEP):
       │    ├─ stateHandlers[current].update(FIXED_TIMESTEP)
       │    └─ main.js:update(FIXED_TIMESTEP)   ← particles, AI, input drain
       ├─ renderFn(ctx)                         ← clear + global background
       ├─ stateHandlers[current].render(ctx)    ← state-specific scene
       └─ postRenderCallback(ctx)               ← overlays (achievements, modals)
```

### 4.3 Input pipeline

`input.js` collects pointer/keyboard events into a queue that
`Input.processInputQueue()` drains every tick. Continuous input (held keys)
is generated by `Input.updateContinuousInput(dt)` so angle/power nudges
happen at a predictable cadence regardless of frame rate. Single-fire
state (`wasKeyPressed()`) is cleared at the end of each frame via
`Input.clearFrameState()`, ensuring any subsystem can query it during
update.

### 4.4 Turn flow (high level)

```
AIMING
  ↓ player or AI picks angle/power/weapon
FIRING
  ↓ Projectile simulated each FIXED_TIMESTEP
  ↓ collisions → damage.js → tank.applyDamage / terrain.destroy
  ↓ all tanks settled → next turn
AIMING   (other side)
  ...
ROUND_END → SHOP → PLAYING → ...
VICTORY / DEFEAT / LEVEL_COMPLETE
```

Round-end hooks fan out into achievements (`combat-`, `precision-`,
`weapon-`, `progression-`, `hidden-`), run stats, shop availability, and
supply-drop eligibility. The mediation point is `runState.js` +
`roundTransition.js`.

### 4.5 Persistence layers

- **Local-only (always available):**
  `localStorage` for onboarding flags, device id, player name, control
  settings, CRT/volume toggles, level-editor drafts, tank-design overrides,
  lifetime stats, daily engagement state.
- **Cloud (optional, behind Convex):**
  `players`, `highScores`, `achievements`, `tankCollection`,
  `lifetimeStats`, `syncQueue`. The client writes to `syncQueue` first
  when offline and drains when online.

This offline-first design is the correct choice for a mobile App Store
product with spotty networks.

---

## 5. Technical Debt and Code Smells

The game is clearly functional and has been iterated on heavily
(200+ commits; recent work is asset/HUD polish). The debts below are
prioritized by how much they will cost to carry forward.

### 5.1 `js/main.js` is a 8,328-line god module — **High**

`main.js` both declares module-level state (terrain, tanks, round counter,
onboarding flags) *and* wires every subsystem, *and* owns the per-frame
`update`/`render`/`postRender`, *and* routes scene-isolation URLs. It
imports ~50 other modules, many as `* as` namespaces. Two of those imports
carry cache-busting query strings (`ui.js?v=20260111d`,
`aimingControls.js?v=20260111a`). Symptoms:

- Any cross-cutting change usually edits `main.js`.
- Merge conflicts are expensive.
- State is impossible to reason about without loading the full file.
- `tsc --noEmit` checks the file, but the review tool refused to read
  it in one shot because it exceeds 256 KB — a human reading proxy for
  "too big to hold in your head."

### 5.2 Other oversized modules — **High**

Modules above 1,000 lines:

| File                           | LoC   |
| ------------------------------ | ----- |
| `main.js`                      | 8,328 |
| `sound.js`                     | 2,579 |
| `ui.js`                        | 2,558 |
| `shop.js`                      | 2,290 |
| `supply-drop.js`               | 1,906 |
| `effects.js`                   | 1,733 |
| `tank-editor-screen.js`        | 1,684 |
| `projectile.js`                | 1,557 |
| `levels.js`                    | 1,553 |
| `ai.js`                        | 1,528 |
| `level-editor-screen.js`       | 1,342 |
| `testAPI.js`                   | 1,332 |
| `level-complete-screen.js`     | 1,278 |
| `achievements.js`              | 1,265 |
| `collection-screen.js`         | 1,218 |
| `extraction-reveal.js`         | 1,102 |
| `tank.js`                      | 1,064 |
| `weapons.js`                   | 1,042 |

All of these are candidates for decomposition.

### 5.3 Module-scoped mutable state everywhere — **Medium**

Nearly every module owns mutable `let` state (e.g. `game.js`:
`currentState`, `accumulator`, `frameCount`; `renderer.js`: `canvas`,
`ctx`, `scaleFactor`, `contentOffsetX`). This is the "module as singleton"
trade-off — fine for a single-instance game, painful once you need:

- deterministic replays,
- headless simulation for AI training,
- split-screen or spectator modes,
- concurrent unit tests that don't interfere.

### 5.4 Type-check posture is split and lax — **Medium**

- `tsconfig.json` is `strict: true` but only covers `convex/`.
- `jsconfig.json` is `strict: false` over all gameplay code.

JSDoc is generally present (the file headers show `@type {…}`, `@param`,
`@returns`), but the weakness of `checkJs` with `strict: false` means
nullable access and implicit `any` silently pass. The project would benefit
from either (a) tightening `jsconfig.json` to `strict: true` and fixing the
fallout, or (b) migrating `js/**` to TypeScript in waves.

### 5.5 Console logging as a load-bearing feature — **Medium**

`console.log|warn|error` appears 752 times across 68 files. `main.js`
alone holds 156. There is no logging abstraction, no log-level gating in
production builds, and no redaction. For a shipping mobile/web product this
is noisy (Capacitor WKWebView console is visible to anyone with a debugger)
and slow.

### 5.6 Cache-busting querystring on imports — **Low**

`./ui.js?v=20260111d`, `./aimingControls.js?v=20260111a`. These are
hand-rotated version suffixes to defeat cache. Two files have been bumped;
the rest haven't. Vite already handles this via content-hashed file names
in production, so the pattern is only doing work for the no-bundler dev
path. It will rot (the date never updates automatically) and it fragments
your import map.

### 5.7 Mixed file-name conventions — **Low**

`runState.js`, `highScores.js`, `roundTransition.js`, `nameEntry.js` use
camelCase; `supply-drop-screen.js`, `tank-collection.js`,
`level-complete-screen.js`, `daily-rewards.js`-not-actually-that-one use
kebab-case. Pick one and rename in a mechanical PR.

### 5.8 Deep namespace imports in `main.js` — **Low**

`import * as X from './X.js'` for 50+ modules is the "glue module" smell.
Named imports force you to confront the coupling surface; star imports
hide it. Each wildcard import is also a hint that the exporter has too
wide an API.

### 5.9 Integration tests directory is empty — **Medium**

`tests/integration/` exists but is empty. `tests/unit/` has 7 files
(constants, damage, level-layouts, tank-design-schema,
tank-turret-constraints, tank-visuals-pivot, weapons). Given the size of
the simulation (projectile, AI, terrain, damage), this is very light
coverage. `testAPI.js` has 1,332 lines of programmatic game control with
no tests consuming it inside the repo.

### 5.10 Two canvases, no explicit z-ordering contract — **Low**

`index.html` ships `<canvas id="game">` and `<canvas id="titleScene">`.
`titleScene` is a Three.js background layer for menu states. `main.js`
switches between `Renderer.clear()` (opaque) and
`Renderer.clearTransparent()` (so the 3D layer shows through) based on
game state. This works but the contract lives in one `render()` function;
an explicit "which canvases are live in which GAME_STATES" table would be
safer.

### 5.11 Untracked Unity-era artifacts on disk — **Low**

`Assembly-CSharp*.csproj`, 12× `ScorchedEarth.*.csproj`, `Library/`,
`Temp/`, `UserSettings/`, `Assets/` exist at the root. They are
gitignored. They still confuse IDEs (VS Code will happily offer to restore
packages) and exploration tools. Consider archiving them to a branch
(`legacy/unity`) and nuking from the working copy.

### 5.12 Hand-rotated build markers in filenames — **Low**

`level-layouts-baseline.js` coexists with `level-layouts.js`. Baselines
are also generated by a script (`scripts/generate-level-layout-baseline.js`).
That is fine, but the "generated" vs "authored" distinction is not
self-documenting; future maintainers will edit the wrong one.

### 5.13 `tank-skins-generated.js` is 7 lines — **Info**

Just noting it. Either the generator has not run recently or most tank
skins live elsewhere. Worth confirming the generator pipeline still
produces the expected content.

### 5.14 Two root HTML demo files — **Low**

`demo-explosion.html` and `demo-walk.html` live at the repo root. They're
useful historical references but clutter the root and aren't linked from
anywhere. Consider moving under `docs/examples/` or deleting.

### 5.15 `AGENTS.md`, `CLAUDE.md`, `.ralph/`, `progress.md` — **Info**

These are agent-loop artifacts from the Ralph/Beads workflow. They are
valuable history but add onboarding noise for a new human contributor who
isn't using the agent loop. A short "for humans" note in `README.md`
pointing to the agent metadata would help.

---

## 6. Dependency Health

### 6.1 Declared dependencies (`package.json`)

Runtime:
- `@capacitor/cli ^8.0.0`
- `@capacitor/core ^8.0.0`
- `@capacitor/haptics ^8.0.0`
- `@capacitor/ios ^8.0.0`
- `convex ^1.31.3`
- `sharp ^0.34.5`
- `three ^0.182.0`

Dev:
- `@eslint/js ^9.39.2`
- `@vitest/coverage-v8 ^4.0.17`
- `canvas ^3.2.0`
- `eslint ^9.39.2`
- `globals ^17.0.0`
- `happy-dom ^20.3.1`
- `typescript ^5.9.3`
- `vite ^7.3.1`
- `vitest ^4.0.17`

Two concerns jump out:

1. **`sharp` as a runtime dependency.** `sharp` is a Node-only image
   library. It's listed under `dependencies`, not `devDependencies`, but
   it can't run in a browser or in a WKWebView. It's almost certainly only
   used by the asset-generation scripts (`scripts/generate-*.js`). This
   bloats `node_modules` for anyone who just wants to run the game and
   can cause native-build failures on CI runners without libvips. It
   should move to `devDependencies`.

2. **`@capacitor/cli` as a runtime dependency.** Same problem: the CLI
   is a build-time tool. Move to `devDependencies`.

### 6.2 Outdated versions (`npm outdated`)

```
Package       Current   Latest   Gap
@eslint/js    9.39.4    10.0.1   major
eslint        9.39.4    10.2.1   major
three         0.182.0   0.184.0  minor
typescript    5.9.3     6.0.3    major
vite          7.3.2     8.0.10   major
```

No runtime dep is more than a major version behind, but four majors are
available. Three.js is notoriously API-churny; plan a 0.182→0.184 bump
with regression test on the title scene.

### 6.3 Security (`npm audit`)

```
12 vulnerabilities (2 moderate, 10 high)
```

High-severity issues include:

- `@capacitor/cli` — transitive `tar` vulnerability (high).
- `@isaacs/brace-expansion` — uncontrolled resource consumption (high).
- `@xmldom/xmldom` — high.
- `vite` — path traversal via `.map` handling (high); `server.fs.deny`
  bypass with queries (high); arbitrary file read via dev-server
  WebSocket (high).

All issues are "fix available via `npm audit fix`" per the audit
reporter. Most hit dev-time tooling, but the Vite dev-server issues
matter for any developer who exposes `npm run dev` on a network they do
not trust.

### 6.4 Lockfile

`package-lock.json` is 164 KB and tracked. Good — reproducible installs.

### 6.5 Convex generated folder

`convex/_generated/` is gitignored and produced by the Convex CLI. The
`vite.config.js` `external` rule keeps rollup from trying to bundle it.
The dynamic-import bridge in `convex-api.js` handles the "folder missing"
case. This is a coherent chain.

---

## 7. Testing Posture

### 7.1 What exists

- `vitest.config.js` + `tests/unit/*.test.js` — 7 unit files: `constants`,
  `damage`, `level-layouts`, `tank-design-schema`,
  `tank-turret-constraints`, `tank-visuals-pivot`, `weapons`.
- `tests/helpers/canvas-mock.js` and `tests/helpers/game-fixtures.js`.
- `tests/integration/` is empty.
- `testAPI.js` (1,332 LoC) is a programmatic control surface ideal for
  integration tests, but nothing in `tests/` consumes it.
- `Debug.*` console commands + URL params for manual QA.

### 7.2 Gaps

- No coverage on the state machine (`game.js`) — transition validation is
  a whole class of bugs currently only caught at runtime via `console.error`.
- No coverage on `projectile.js` physics (1,557 LoC, core of the game).
- No coverage on `ai.js` (1,528 LoC).
- No integration test exercises a full turn end-to-end using `testAPI`.
- `test:coverage` exists but no coverage thresholds are enforced.

---

## 8. Performance Observations

Only static observations, but worth flagging:

- **Fixed-timestep accumulator is correctly clamped.** No spiral-of-death
  on slow frames; `deltaTime` is capped at `5 × FIXED_TIMESTEP`.
- **Per-frame ~20+ subsystem calls in `main.js → update()`** (particles,
  trails, falling tanks, background, achievement popups, supply drop,
  name entry, input processing, etc). This is fine but if you need to
  hit 60 fps on older iOS devices, each of these is a candidate for
  "skip if inactive" guards. The render path already short-circuits for
  menu vs gameplay, which is good.
- **DPR-aware canvas sizing** in `renderer.js` is correct — `scaleFactor`
  separate from `devicePixelRatio`, debounced resize.
- **Three.js is only loaded for the title background.** That's a decent
  sized dependency (~0.5 MB min+gz) to spend on one scene; verify it's
  worth the bundle cost vs. a 2D animated title.

---

## 9. Observability / Debuggability

This is a genuine strength. `CLAUDE.md` documents a full suite:

- `TestAPI.*` — programmatic control (aim, fire, simulate, snapshot,
  diff, terrain seed, tank positions).
- `Debug.*` — jump-to-state, give weapons/money, toggle god mode.
- Keyboard shortcuts (`D`, `Shift+1..0`, `Shift+T/C/G/V/X/A`).
- `?scene=...` URL router.
- `?seed=...&wind=...&round=...&money=...` reproducibility knobs.

The only missing piece is structured logging. Replacing raw `console.log`
with a leveled logger (silent by default in production, toggled by
`?debug=true`) would keep this without the runtime noise flagged in §5.5.

---

## 10. Recommendations

Prioritized, with concrete next actions.

### P0 — Risk / security

1. **Run `npm audit fix` and ship the updated lockfile.** All reported
   vulnerabilities have fixes available. In particular, upgrade `vite` to
   a patch release that fixes the three known dev-server CVEs.
2. **Move `sharp` and `@capacitor/cli` to `devDependencies`.** They will
   never run in the browser/WKWebView. This shrinks the runtime install
   and reduces attack surface for end users.

### P1 — Structural health

3. **Break up `js/main.js`.** Extract:
   - scene-isolation routing → `js/sceneRouter.js` (already half present
     in `sceneIsolation.js`);
   - state-handler registration → one file per major state group
     (`handlers/playing.js`, `handlers/menu.js`, etc.);
   - the per-frame `update`/`render`/`postRender` stays in `main.js`
     but only as a dispatcher.
   Target: `main.js` < 500 lines.
4. **Decompose `ui.js`, `shop.js`, `sound.js`, `supply-drop.js`,
   `effects.js`.** These are all 1.7k–2.6k LoC. Pull screen rendering
   into one file per screen; pull domain logic into headless data
   modules.
5. **Adopt a flat folder convention or committed subfolders.** Proposal:

   ```
   js/engine/        game.js, renderer.js, input.js, screenSize.js, safeArea.js
   js/sim/           terrain.js, projectile.js, tank.js, damage.js, wind.js, weapons.js, ai.js
   js/ui/            ui.js split into hud/, menus/, modals/
   js/screens/       *-screen.js files
   js/progression/   achievements, supply-drop, tokens, money, unlocks, runState
   js/tank-forge/    tank-design-* files
   js/audio/         sound.js, music.js, haptics.js, volumeControls.js
   js/backend/       convex-api.js, highScores.js, nameEntry.js
   js/debug/         debug*, testAPI, sceneIsolation
   ```
6. **Tighten the type posture.** Either flip `jsconfig.json` to
   `strict: true` and fix the fallout (likely O(100) JSDoc edits), or
   start a bottom-up TS migration starting from the `sim/` layer
   (pure, most testable).

### P2 — Quality / maintainability

7. **Write integration tests that drive `TestAPI`.** Fire-and-snapshot
   flow, shop purchase → weapon inventory update, round-end → achievement
   unlock, AI decision regression, etc. `tests/integration/` already
   exists, just unused.
8. **Add a `logger.js` wrapper.** Replace 752 `console.*` calls in waves,
   with `?debug=true` gating production verbosity.
9. **Remove the `?v=YYYYMMDD` import-cache-busting strings.** Rely on
   Vite's content-hashed production output; for the no-bundler dev path,
   advise contributors to hard-reload.
10. **Normalize file-name casing** (kebab-case is the majority).
11. **Move or delete `demo-explosion.html`, `demo-walk.html`.**
12. **Archive the Unity-era artifacts** (`Assembly-*.csproj`,
    `ScorchedEarth.*.csproj`, `Library/`, `Temp/`, `UserSettings/`,
    `Assets/`) to a `legacy/unity` branch and remove from the working
    copy. They are gitignored so this is purely a developer-ergonomics
    cleanup.
13. **Document the "generated vs authored" files.** `tank-skins-generated.js`,
    `level-layouts-baseline.js`, and `config.js` are all machine-written.
    Add a top-of-file banner saying "do not edit by hand, run
    `scripts/…`."

### P3 — Ergonomics

14. **Pin dev dependency majors explicitly.** `vite 7 → 8`, `typescript
    5 → 6`, `eslint 9 → 10` are all coming. Plan the upgrades rather
    than letting `^` drag them in unexpectedly.
15. **Adopt a `CONTRIBUTING.md` for humans** that explains the
    Beads/Ralph agent loop is optional, with a human quickstart
    (`npm install && npm run dev`).
16. **Add `npm run precommit` to a real git hook** (`husky` or
    `lefthook`) so lint/typecheck/test runs before local commits.
17. **Enforce a coverage floor.** `test:coverage` exists; add a Vitest
    `coverage.thresholds` block so regressions show up in CI.

---

## 11. Strengths Worth Preserving

- **Thoughtful state machine** (`game.js`) with transition whitelisting,
  enter/exit hooks, pause/resume semantics, and debug-mode logging.
- **Correct fixed-timestep loop** with spiral-of-death clamp.
- **Offline-first persistence** with a clean Convex dynamic-import bridge
  that fails soft.
- **Unified input abstraction** for mouse + touch + keyboard with queued
  event draining and continuous-key handling.
- **Strong testability surface** via `TestAPI`, `Debug.*`, and
  `?scene=...` URL routing — rare in a canvas game.
- **Responsive canvas** with DPR + safe-area awareness; Capacitor-ready
  out of the box.
- **Real Convex schema** with proper indexes, denormalized leaderboard
  fields, and a `syncQueue` for offline actions.
- **Swappable asset manifest** so artwork can be updated without code
  changes.

---

## 12. At a Glance

| Axis                    | Grade | Notes                                                   |
| ----------------------- | ----- | ------------------------------------------------------- |
| Architecture (macro)    | B     | Clean ideas (state machine, fixed-timestep); god file.  |
| Architecture (micro)    | C+    | Module-globals and 1k+ LoC files common.                |
| Type safety             | C     | JSDoc everywhere, but `strict: false` on `checkJs`.     |
| Tests                   | C-    | Unit tests on a handful of modules; no integration.     |
| Observability / debug   | A-    | `TestAPI`, `Debug.*`, scene isolation are excellent.    |
| Dependency hygiene      | C     | Runtime deps include build-time tools; 12 CVEs open.    |
| Build / deploy          | B+    | Vite + Capacitor + Vercel + Convex chain is coherent.   |
| Documentation           | B     | `CLAUDE.md` is rich; `README.md` is terse; human docs light. |

Overall: a **B-grade** codebase — genuinely playable, thoughtful in the
right places, but with accumulated size debt (mostly in `main.js` and the
1k+-line peers) and dependency hygiene debt that will cost increasingly
more the longer they're left in place.
