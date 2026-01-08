# Scorched Earth: Synthwave Edition

A modern reimagining of the classic 1991 DOS artillery game, rebuilt with synthwave aesthetics and modern web technologies.

## Project Vision

**Gameplay:** Turn-based artillery combat. Two tanks on destructible terrain. Adjust power and angle, fire projectiles, watch physics play out. Terrain explodes, dirt falls, reshape the battlefield. Earn money, buy better weapons. Simple to learn, satisfying to master.

**Aesthetic:** Full 80s synthwave. Neon colors, grid lines, sunset gradients, CRT glow effects. Think Outrun, Hotline Miami, Far Cry Blood Dragon. The Dr Disrespect gaming aesthetic.

**Audio:** Synthwave soundtrack. Pulsing basslines, arpeggiated synths, dramatic hits for explosions.

**Platform:** Web-first (HTML5 Canvas/WebGL), designed for eventual iOS mobile port.

## Game Features

### Core Mechanics

- Turn-based combat between player tank and AI opponent
- Power (0-100%) and angle (0-180°) aiming controls
- Projectile trajectory visualization
- Realistic physics (gravity, wind effects)
- Destructible terrain with falling dirt physics

### Weapons

- **Basic Shot** - Unlimited ammo, moderate damage
- **MIRV** - Splits into multiple warheads mid-flight
- **Roller** - Rolls along terrain until it hits something
- **Digger** - Burrows through terrain
- **Nuke** - Massive explosion radius
- **Mini Nuke** - Smaller but still devastating
- And more to be defined in spec...

### Progression

- Earn money from damage dealt and wins
- Shop between rounds to buy weapons
- AI opponents with varying difficulty

## Development Workflow

### Task Management

This project uses **Beads** for issue tracking and **Ralph** for autonomous development loops.

```bash
# See what's ready to work on
bd ready

# Claim an issue before starting
bd update <issue-id> --claim

# Close when done
bd close <issue-id>

# Run autonomous loop
./ralph.sh --all
```

### Key Files

- `ralph.sh` - Autonomous development loop script
- `.ralph/PROMPT.md` - Loop prompt template
- `.ralph/AGENT.md` - Project-specific agent instructions
- `docs/research/` - Research documentation
- `docs/specs/` - Game specifications

## Tech Stack

To be finalized in `scorched-earth-7ku`, but likely:

- **Rendering:** Canvas 2D or PixiJS (2D WebGL)
- **Physics:** Custom ballistics + terrain collision (general physics engines are overkill)
- **Audio:** Web Audio API
- **Build:** Minimal or none (vanilla JS ES modules)
- **Mobile:** Capacitor wrapper for iOS App Store

### Mobile-First Considerations

- Abstract input layer (mouse + touch) from day one
- Responsive canvas sizing
- Test in mobile Safari early and often
- Design UI for thumb zones

## Code Style

- Vanilla JavaScript (ES6+ modules)
- Clear separation: rendering, physics, game logic, UI
- Document complex physics/math with comments explaining WHY
- No placeholder implementations - full working code only

## Directory Structure

```
index.html              # Entry point
style.css               # Styling (synthwave theme)
js/
  main.js               # Initialization
  game.js               # Game loop and state
  tank.js               # Tank entity
  terrain.js            # Terrain generation/destruction
  projectile.js         # Projectile physics
  weapons.js            # Weapon definitions
  physics.js            # Physics calculations
  ai.js                 # AI opponent logic
  renderer.js           # Canvas/WebGL rendering
  ui.js                 # UI elements
  effects.js            # Visual effects (explosions, particles)
  sound.js              # Audio system
  shop.js               # Weapon shop
  constants.js          # Game constants
docs/
  research/             # Research on original game
  specs/                # Game specifications
  architecture/         # Technical decisions
assets/
  images/               # Sprites, backgrounds
  audio/                # Sound effects, music
```

## Current Status

**Phase:** Initial Setup

**Active Issues:**

1. `scorched-earth-7mz` - Research original Scorched Earth game
2. `scorched-earth-33s` - Write game specification (blocked)
3. `scorched-earth-28e` - Break spec into epics/issues (blocked)
4. `scorched-earth-7ku` - Set up tech stack (blocked)

Run `bd ready` to see what's available to work on.
