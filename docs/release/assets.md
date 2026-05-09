# Release Asset Policy

The iOS/web release build should include runtime assets only. Source references,
generation templates, and local editor leftovers should stay in the repository
but not ship inside `www`.

The runtime asset copy step must preserve Vite-generated application chunks in
`www/assets`; only the game asset folders and release asset report are cleaned
and recopied.

## Runtime Assets

`npm run copy-static` copies:

- `assets/manifest.json`
- Existing files referenced by `assets/manifest.json`
- `assets/audio`
- `assets/icons`
- `assets/levels`
- `assets/tank-designs`

The copy step also writes `www/assets/release-assets.json`, which records the
files copied, missing manifest references, and excluded source-only classes.

## Source-Only Assets

These are intentionally excluded from release output:

- `assets/references`
- `assets/TextMesh Pro`
- `.DS_Store`
- `.gitkeep`
- Generated mockups, grids, and reference PNGs that are not referenced by the
  runtime manifest

## Budgets

`npm run budget:release` enforces the current release budgets:

- Total `www`: 15 MB
- Single image asset: 3 MB
- Single JS chunk: 1.5 MB
- No sourcemaps in default release builds
- No source-only asset directories in `www`

Override budgets with environment variables when intentionally testing a larger
build:

- `RELEASE_TOTAL_BUDGET_BYTES`
- `RELEASE_ASSET_BUDGET_BYTES`
- `RELEASE_JS_CHUNK_BUDGET_BYTES`

Use `npm run build:debug` when source maps are needed locally. Debug builds are
not release-budgeted.
