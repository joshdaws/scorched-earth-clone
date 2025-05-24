# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Install dependencies
npm install

# Start development server (port 8080)
npm start

# Take screenshots for visual testing
npm run screenshot:menu    # Capture main menu
npm run screenshot:game    # Capture gameplay
npm run screenshot         # Capture menu (default)
```

### Git Operations
```bash
# The game is hosted on GitHub Pages at:
# https://joshdaws.github.io/scorched-earth-clone/
```

## Architecture

### Core Game Loop
The game uses a Manager/System pattern with these key components:
- `Game` class orchestrates the main loop: `animate() → update() → render()`
- `UIManager` handles all DOM interactions and screen transitions
- Turn-based state machine: MENU → GAME_SETUP → PLAYING (with SHOP phases) → GAME_OVER

### Module Interaction Flow
```
Tank.fire() → ProjectileManager.fireWeapon() → WeaponSystem.createProjectile()
    ↓
Physics updates projectile trajectory each frame
    ↓
On collision → WeaponSystem.explodeProjectile() → Effects + Terrain deformation
    ↓
Terrain.applyTerrainCollapse() → Cascading physics for floating terrain
```

### Key Architectural Patterns

**Double Canvas Rendering**: Terrain pre-rendered to off-screen canvas, composited with dynamic elements on main canvas.

**Physics System**: Centralized physics calculations with configurable boundary behaviors (wrap/bounce/absorb). Projectiles query physics for updates rather than owning physics logic.

**AI Architecture**: AIControllers analyze game state and use `Physics.calculateOptimalShot()` for targeting. Accuracy varies by AI type (SHOOTER: 60%, CYBORG: 85%, KILLER: 95%).

**Menu Animation**: Self-contained animation system in `menu-background.js` with procedural synthwave graphics (sun, grid, mountains) running independently via requestAnimationFrame.

### Sound System
Uses Web Audio API with procedural sound generation. Must be initialized after user interaction due to browser policies. Volume control integrated into HUD.

### Visual Style
Synthwave aesthetic throughout:
- Gradient backgrounds: #0a0015 → #1a0033 → #ff0066 → #ffcc00
- Neon colors: #ff00ff (pink), #00ffff (cyan), #ffff00 (yellow)
- Glow effects via shadowBlur on all interactive elements
- Tank colors are vibrant neons with drop shadows

## Performance Optimizations

### Spatial Grid
The game uses a spatial grid (`SpatialGrid`) for efficient collision detection. Instead of checking every tank against every projectile, only nearby objects are tested. The grid automatically updates when tanks move.

### WebGL Renderer
The game attempts to use WebGL for hardware-accelerated rendering. Falls back to Canvas2D if WebGL is unavailable. The renderer abstraction (`Renderer`) handles both modes transparently.

### Dirty Rectangle System
The `DirtyRectManager` tracks which parts of the screen need redrawing. Only changed regions are redrawn each frame, significantly improving performance on large displays.

To enable debug visualization:
```javascript
game.toggleDebug(); // Shows spatial grid and dirty rectangles
```

## Development Notes

### Adding New Weapons
1. Add weapon definition to `CONSTANTS.WEAPONS` in `constants.js`
2. Implement special behavior in `WeaponSystem.updateProjectile()` if needed
3. Add to shop items in `CONSTANTS.SHOP_ITEMS`

### Modifying Terrain Generation
Terrain uses midpoint displacement algorithm in `Terrain.generate()`. Smoothing passes and height constraints can be adjusted.

### Performance Considerations
- Spatial grid divides screen into 50x50 pixel cells
- WebGL renderer caches textures for repeated elements
- Dirty rectangles merge if too many small updates occur
- Particle effects limited to prevent slowdown
- Trail arrays capped at 100 points
- Stars and terrain cached after first render