# Scorched Earth: Synthwave Edition - Project Overview

## Purpose
A modern web-based reimagining of the classic 1991 DOS artillery game "Scorched Earth" with synthwave aesthetics (neon colors, grid lines, sunset gradients, CRT glow effects).

## Core Gameplay
- Turn-based artillery combat between player tank and AI opponent
- Power (0-100%) and angle (0-180°) aiming controls
- Projectile trajectory visualization with realistic physics (gravity, wind)
- Destructible terrain with falling dirt physics
- Earn money from damage dealt and wins
- Shop between rounds to buy weapons

## Tech Stack
- **Frontend:** Vanilla JavaScript (ES6+ modules) - no bundler needed
- **Rendering:** HTML5 Canvas 2D (not WebGL/PixiJS - simpler for terrain pixel manipulation)
- **Physics:** Custom ballistics + terrain collision
- **Audio:** Web Audio API with separate music/SFX channels
- **Mobile:** Capacitor wrapper for iOS App Store
- **No test framework** - manual testing via browser

## Key Design Principles
- Mobile-first design with unified pointer API (mouse + touch)
- Canvas scales responsively (3:2 aspect ratio, design coordinates 1200x800)
- High-DPI support via devicePixelRatio scaling
- All visual elements use swappable sprites via asset manifest
- No placeholder implementations - full working code only
