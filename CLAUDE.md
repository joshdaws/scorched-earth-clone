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
  assets.js             # Asset loader and manifest
docs/
  research/             # Research on original game
  specs/                # Game specifications
  architecture/         # Technical decisions
assets/
  manifest.json         # Asset manifest (paths, dimensions, animations)
  images/
    tanks/              # Tank sprites (tank-player.png, tank-enemy.png)
    weapons/            # Weapon/projectile sprites
    terrain/            # Terrain textures
    effects/            # Explosion sprites, particles
    ui/                 # UI elements, buttons, icons
    backgrounds/        # Sky gradients, parallax layers
  audio/
    music/              # Background tracks
    sfx/                # Sound effects
```

## Asset Architecture (Swappable Graphics)

**All visual elements use sprites that can be swapped without code changes.**

### Asset Manifest (`assets/manifest.json`)
```json
{
  "tanks": {
    "player": { "path": "images/tanks/tank-player.png", "width": 64, "height": 32 },
    "enemy": { "path": "images/tanks/tank-enemy.png", "width": 64, "height": 32 }
  },
  "projectiles": {
    "basic": { "path": "images/weapons/shot-basic.png", "width": 8, "height": 8 },
    "mirv": { "path": "images/weapons/shot-mirv.png", "width": 12, "height": 12 }
  },
  "effects": {
    "explosion-small": { "path": "images/effects/explosion-small.png", "frames": 8 },
    "explosion-large": { "path": "images/effects/explosion-large.png", "frames": 12 }
  }
}
```

### Placeholder Strategy
Ralph will create simple geometric placeholders (colored rectangles/circles) that render correctly. When custom art is ready (via NanoBanana), just:
1. Drop new images in `assets/images/`
2. Update dimensions in `manifest.json` if needed
3. Refresh - new graphics appear

### Naming Conventions
- `tank-{type}.png` - Tank sprites
- `shot-{weapon}.png` - Projectile sprites
- `explosion-{size}.png` - Explosion spritesheets
- `bg-{layer}.png` - Background layers
- `ui-{element}.png` - UI elements

## Current Status

**Phase:** Implementation Ready

All planning complete. Tech stack setup must be completed before any implementation work begins.

### Epic Breakdown

| Epic | ID | Issues | Priority | Description |
|------|-----|--------|----------|-------------|
| **Tech Stack Setup** | `scorched-earth-7ku` | TBD | P1 | Project scaffolding, HTML/JS structure |
| **Core Game Engine** | `scorched-earth-5zm` | 6 | P1 | Canvas, game loop, state machine, input, assets |
| **Terrain System** | `scorched-earth-v3c` | 6 | P1 | Heightmap, generation, rendering, destruction |
| **Tank & Projectile** | `scorched-earth-wu8` | 8 | P1 | Tank entity, physics, collision, damage, wind |
| **Weapons System** | `scorched-earth-8qc` | 9 | P1 | All 11 weapons with unique behaviors |
| **AI Opponents** | `scorched-earth-7hv` | 5 | P1 | Easy/Medium/Hard AI, turn execution |
| **UI and Menus** | `scorched-earth-x47` | 6 | P1 | HUD, menus, aiming controls, screens |
| **Economy & Shop** | `scorched-earth-wzf` | 5 | P1 | Money, shop UI, inventory, rounds |
| **Visual Effects** | `scorched-earth-qff` | 5 | P2 | Particles, shake, flash, backgrounds |
| **Audio System** | `scorched-earth-cu2` | 5 | P2 | SFX, music, volume controls |
| **Mobile Support** | `scorched-earth-pxn` | 5 | P2 | Touch controls, scaling, iOS |

**Total:** 10 epics, 60+ issues

### Implementation Order

1. **Tech Stack Setup** (scorched-earth-7ku) - FIRST, blocks everything
2. **Core Game Engine** → **Terrain System** → **Tank & Projectile** (parallel work possible)
3. **Weapons System** (depends on projectile physics)
4. **UI and Menus** + **Economy & Shop** (can work in parallel)
5. **AI Opponents** (needs weapons and damage)
6. **Visual Effects** + **Audio System** (polish phase)
7. **Mobile Support** (final phase)

### Key Dependencies

- ALL implementation issues are blocked by `scorched-earth-7ku` (tech stack)
- Weapons depend on projectile physics being complete
- AI depends on weapons and damage calculation
- Shop depends on weapon registry and economy

Run `bd ready` to see what's available to work on.
