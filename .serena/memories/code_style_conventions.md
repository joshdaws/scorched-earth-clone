# Code Style and Conventions

## Language
- Vanilla JavaScript (ES6+ modules)
- No TypeScript, no bundler
- Browser-native ES6 module imports

## File Organization
```
js/
  main.js           - Initialization
  game.js           - Game loop and state
  tank.js           - Tank entity
  terrain.js        - Terrain generation/destruction
  projectile.js     - Projectile physics
  weapons.js        - Weapon definitions
  physics.js        - Physics calculations
  ai.js             - AI opponent logic
  renderer.js       - Canvas rendering
  ui.js             - UI elements
  effects.js        - Visual effects
  sound.js          - Audio system
  shop.js           - Weapon shop
  constants.js      - Game constants
  assets.js         - Asset loader
```

## Code Style
- Clear separation: rendering, physics, game logic, UI
- Document complex physics/math with comments explaining WHY
- No placeholder implementations - full working code only
- Mobile-first design considerations

## Asset Naming Conventions
- `tank-{type}.png` - Tank sprites
- `shot-{weapon}.png` - Projectile sprites
- `explosion-{size}.png` - Explosion spritesheets
- `bg-{layer}.png` - Background layers
- `ui-{element}.png` - UI elements

## Module Pattern
Files export functions/classes via ES6 exports and are imported via ES6 imports in other modules.
