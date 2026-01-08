# Tech Stack - Scorched Earth: Synthwave Edition

This document captures all technology decisions for the project.

## Rendering: Canvas 2D

**Decision:** Use HTML5 Canvas 2D Context (not PixiJS/WebGL)

**Rationale:**

- **Simplicity over power:** Scorched Earth is a 2D turn-based artillery game. We don't need 60+ sprites on screen or advanced WebGL shaders.
- **Terrain destruction:** Canvas 2D provides direct pixel manipulation via `getImageData`/`putImageData`, which is ideal for destructible terrain heightmaps.
- **Particle effects:** For our needs (explosion debris, smoke), Canvas 2D is sufficient. We're not rendering thousands of particles simultaneously.
- **Bundle size:** Zero dependencies. No 500KB+ WebGL framework for a game that runs fine on Canvas.
- **Mobile performance:** Canvas 2D is well-optimized across all browsers including mobile Safari.

**Implementation:**

- `js/renderer.js` - Canvas initialization and rendering utilities
- Design coordinates: 1200x800 (3:2 aspect ratio)
- High-DPI support via devicePixelRatio scaling
- Context transform automatically scales all drawing operations

## Physics: Custom Implementation

**Decision:** Custom physics for ballistics and terrain collision (no physics engine)

**Rationale:**

- **Artillery games need precision, not general physics:** Box2D, Matter.js, etc. are overkill. We need: gravity, wind, projectile trajectory, terrain collision.
- **Terrain destruction is non-standard:** Physics engines don't handle heightmap terrain well. Our terrain is a pixel-based heightmap that gets modified on each explosion.
- **Predictability:** Custom physics means we control exactly how projectiles behave. No fighting engine quirks.

**Key Physics:**

- **Gravity:** Constant downward acceleration (0.15 px/frame²)
- **Wind:** Horizontal force that varies per round
- **Trajectory:** Standard projectile motion `v = v0 + a*t`, `p = p0 + v*t`
- **Terrain collision:** Check projectile Y against terrain heightmap at X

Constants defined in `js/constants.js` under `PHYSICS`.

## Audio: Web Audio API

**Decision:** Native Web Audio API (no library)

**Rationale:**

- **Complete control:** SFX and music need separate volume channels. Web Audio's gain node routing handles this perfectly.
- **Performance:** No audio library overhead. Direct buffer playback.
- **Crossfade support:** Music tracks can smoothly transition using gain ramps.
- **iOS compatibility:** WebKit AudioContext is handled with proper resume patterns.

**Implementation:**

- `js/sound.js` - Complete audio system
- Three-tier gain structure: Master → Music/SFX → Per-sound
- Separate caches for music and sound effects
- Support for fade in/out and crossfade

## Build System: None (ES Modules)

**Decision:** Vanilla ES Modules, no bundler

**Rationale:**

- **Modern browsers support ES modules natively.** All target browsers (Chrome, Firefox, Safari, iOS Safari) handle `<script type="module">` perfectly.
- **Development speed:** No build step means instant iteration. Save file, refresh browser.
- **Debugging:** Source maps aren't needed when the browser runs your actual source files.
- **Deployment:** For production, a simple minification step if desired. No complex webpack/vite config.

**Structure:**

```
index.html              # Entry point
js/
  main.js               # Application initialization
  game.js               # Game loop and state machine
  renderer.js           # Canvas rendering
  input.js              # Mouse/touch/keyboard input
  sound.js              # Web Audio API
  assets.js             # Image loader from manifest
  constants.js          # All game constants
  debug.js              # FPS counter and debug tools
```

## Mobile Strategy: Capacitor (Future)

**Decision:** Capacitor for iOS/Android deployment

**Rationale:**

- **Web-first, native wrapper:** The game is built entirely in standard web tech. Capacitor wraps it for app stores.
- **Plugin ecosystem:** Camera roll for screenshots, haptics for feedback, native share dialogs.
- **One codebase:** Same JavaScript runs in browser and native apps.

**Mobile-Ready Design (Already Implemented):**

- Touch input abstraction in `js/input.js`
- Unified "pointer" API works for both mouse and touch
- Canvas scales responsively to any viewport size
- UI designed for thumb zones (to be implemented)
- Touch events use `{ passive: false }` for proper handling

## Asset System: Manifest-Based Loading

**Decision:** JSON manifest with hot-swappable assets

**Rationale:**

- **Designer-friendly:** Drop new PNGs in `assets/images/`, update `manifest.json` dimensions if needed. No code changes.
- **Progressive loading:** Assets load from manifest with progress callbacks for loading screens.
- **Graceful degradation:** Missing assets return null; game code can fall back to geometric placeholders.

**Implementation:**

- `assets/manifest.json` - Declares all images with paths and dimensions
- `js/assets.js` - Loader with caching and dot-notation access
- Assets accessed via `assets.get('tanks.player')` pattern

## Game Loop: requestAnimationFrame

**Implementation:**

- `js/game.js` - State machine with game loop
- Delta time passed to update functions
- State-specific update/render handlers via `registerStateHandlers()`
- Transition hooks (onEnter/onExit) for state changes

**States:**

- `menu` - Main menu
- `playing` - Active gameplay
- `aiming` - Player adjusting aim
- `firing` - Projectile in flight
- `paused` - Game paused
- `shop` - Between rounds
- `round_end`, `victory`, `defeat`, `game_over` - End states

## Input Abstraction

**Implementation:**

- `js/input.js` - Unified input system
- **Pointer API:** `isPointerDown()`, `getPointerPosition()` work for both mouse and touch
- **Keyboard:** `isKeyDown()` for held keys, `wasKeyPressed()` for single-fire events
- Coordinates automatically converted to design space (1200x800)
- Game keys prevent default browser behavior (arrow scrolling, etc.)

## Design Decisions Summary

| Concern | Decision | Why |
|---------|----------|-----|
| Rendering | Canvas 2D | Simplicity, pixel access for terrain |
| Physics | Custom | Predictable ballistics, terrain destruction |
| Audio | Web Audio API | Gain routing, crossfade, no dependencies |
| Build | None (ES modules) | Fast iteration, modern browser support |
| Mobile | Capacitor (future) | Web-first with native wrapper |
| Assets | Manifest JSON | Hot-swappable, progressive loading |

## Browser Support

Tested and working in:

- Chrome (desktop/mobile)
- Firefox
- Safari (desktop)
- iOS Safari (primary mobile target)

## Performance Targets

- 60 FPS on modern devices
- Smooth terrain destruction animation
- Responsive canvas scaling with no layout shift
- Audio latency < 50ms for SFX
