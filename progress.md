Original prompt: Upgrade game graphical assets with ChatGPT Image Gen 2 and improve tanks so the turret feels embedded rather than overlaid.

2026-04-22:
- Generated and processed cohesive weapon icons, UI placeholders, dirt particle, and split player/enemy tank body and turret sprites.
- Added manifest entries and renderer support for default player/enemy split tank sprites.
- Verified with `npm run check`, `npm run build`, and a Vite/Playwright gameplay screenshot.
- Polished the shared canvas Button renderer and gameplay FIRE button with layered bevels, highlights, stronger armed/pressed states, and menu hover handling.
- Filed `scorched-earth-7wu` to replace the old test explosion sprite sheet with a fresh generated animation before wiring sprite-frame explosions.
- Follow-up correction: made the FIRE button polish much more visible with a bright inset launch surface, heavier hardware frame, stronger glow/charge rail, and shifted it left to avoid crowding the pause button. Also strengthened shared Button interiors so menu buttons read as filled controls rather than plain stroked rectangles.
- Broader UI polish pass: upgraded menu stat/resource tiles, gameplay HUD chrome, health bars, wind rail, weapon dock, weapon slots, and angle readout so the non-title UI matches the quality of the new title/background. Kept this pass canvas-native; no new bitmap UI assets were necessary.
- No open TODOs from the button polish pass.
