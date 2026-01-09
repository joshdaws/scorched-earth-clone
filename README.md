# Scorched Earth: Synthwave Edition

A modern reimagining of the classic 1991 DOS artillery game, rebuilt with synthwave aesthetics and modern web technologies.

**[Play Now](https://scorched-earth.vercel.app)**

## About

Turn-based artillery combat with destructible terrain. Two tanks battle it out - adjust your power and angle, account for wind, and watch the physics play out. Terrain explodes, dirt falls, and the battlefield reshapes with every shot.

## Features

- **Turn-based combat** - Strategic artillery gameplay against AI opponents
- **Destructible terrain** - Every explosion reshapes the battlefield
- **Physics simulation** - Realistic projectile trajectories with wind effects
- **Multiple weapons** - From basic shots to MIRVs and nukes
- **Synthwave aesthetic** - Neon colors, grid lines, and retro-futuristic vibes
- **Mobile support** - Touch controls for phones and tablets

## Controls

- **Arrow keys** or **A/D** - Adjust aim angle
- **Shift + Arrow** - Fine-tune angle
- **W/S** or **Up/Down** - Adjust power
- **Space** or **Enter** - Fire
- **Touch** - Drag to aim, tap to fire (mobile)

## Run Locally

No build step required - just serve the files:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# Then open http://localhost:8000
```

## Tech Stack

- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas for rendering
- Web Audio API for sound
- No frameworks, no build tools

## License

MIT
