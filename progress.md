Original prompt: Upgrade game graphical assets with ChatGPT Image Gen 2 and improve tanks so the turret feels embedded rather than overlaid.

2026-04-22:
- Generated and processed cohesive weapon icons, UI placeholders, dirt particle, and split player/enemy tank body and turret sprites.
- Added manifest entries and renderer support for default player/enemy split tank sprites.
- Verified with `npm run check`, `npm run build`, and a Vite/Playwright gameplay screenshot.
- Polished the shared canvas Button renderer and gameplay FIRE button with layered bevels, highlights, stronger armed/pressed states, and menu hover handling.
- Filed `scorched-earth-7wu` to replace the old test explosion sprite sheet with a fresh generated animation before wiring sprite-frame explosions.
- Follow-up correction: made the FIRE button polish much more visible with a bright inset launch surface, heavier hardware frame, stronger glow/charge rail, and shifted it left to avoid crowding the pause button. Also strengthened shared Button interiors so menu buttons read as filled controls rather than plain stroked rectangles.
- Broader UI polish pass: upgraded menu stat/resource tiles, gameplay HUD chrome, health bars, wind rail, weapon dock, weapon slots, and angle readout so the non-title UI matches the quality of the new title/background. Kept this pass canvas-native; no new bitmap UI assets were necessary.
- Top HUD follow-up: upgraded the player info, enemy health, and turn/wind panels to sharper chamfered cockpit-style instrument frames, added a cash chip, and made enemy status read as a complete module.
- Explosion animation pass: generated a new 4x4 transparent synthwave explosion atlas with the Image API, replaced the old test sprite sheet, added manifest frame metadata, and rendered frame-based explosions over the existing procedural shockwave/particles with static PNG fallbacks.
- Explosion correction: user rejected the generated 4x4 animation because frames drift and get cut off. Reverted runtime explosions to the previous static small/medium/large overlay path and filed `scorched-earth-bob` for a future centered atlas.
- HUD alignment tweak: locked the enemy health module to the same top Y as the player info panel so the two top-corner modules align on a shared horizontal baseline.
- No open TODOs from the button polish pass.

2026-04-24:
- Architecture modernization roadmap created under bead `scorched-earth-qtq`, with child tasks for impact extraction, gameplay events, generated asset metadata, Tron-style terrain de-res effects, angle-of-repose dirt physics, main.js splitting, iOS hardening, and visual regression scenes.
- Began foundation work on `scorched-earth-qtq.2`: added a lightweight gameplay event bus and wired projectile impact, impact resolved, tank damaged, and terrain changed events from existing impact paths without changing current gameplay behavior.
- Began `scorched-earth-qtq.3`: added asset metadata normalization/validation for generated art, including anchors, pivots, frame grids, safe bounds, scale policies, and source provenance. Added sample turret pivot and explosion anchor metadata to the manifest.
- Browser smoke found startup could hang when external Google font loading is blocked. Filed and fixed `scorched-earth-qtq.7.1` by adding a timeout fallback around title font preload so the game can initialize offline/local.
- Completed `scorched-earth-qtq.1`: extracted projectile impact resolution into `js/impactResolution.js`, leaving `main.js` to inject live state and render/effect hooks. Added resolver unit tests for lifecycle events, damage events, terrain/no-terrain paths, chain reactions, and Liquid Dirt terrain mutation.
- Verified the resolver extraction with full check/build and a 30s browser smoke against the physics sandbox; canvas rendered successfully with only the known external-service console errors ignored.
