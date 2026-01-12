# Epic: Adaptive Screen Sizing for iOS

## Overview
Make the game fill the entire screen on iOS devices by using dynamic canvas sizing, relative HUD positioning, and proper safe area handling. Lock orientation to landscape.

## Scope
- Lock iOS orientation to landscape only
- Dynamic canvas sizing based on device dimensions
- Query and respect iOS safe area insets (notch, home indicator)
- Refactor all HUD/UI elements to use edge-relative positioning
- Variable-width terrain and tank positioning
- Test across iPhone and iPad form factors

## Dependencies
- Requires current mobile support to be working (scorched-earth-pxn - closed)
- Affects renderer.js, ui.js, terrain.js, tank.js, constants.js, game.js

## Technical Approach

### Current State
- Fixed design space: 1200x800 (3:2 aspect ratio)
- Canvas scales to fit viewport with letterboxing
- HUD positions are absolute coordinates

### Target State
- Canvas matches device screen exactly (minus safe areas)
- Game world expands to fill available space
- HUD elements positioned relative to screen edges + safe areas
- Consistent gameplay feel across all device sizes

### Key Considerations
- iPhone aspect ratios: ~19.5:9 (very wide)
- iPad aspect ratios: ~4:3 (more square)
- Safe areas vary by device (notch vs no notch, Face ID vs Touch ID)
- Gameplay balance: wider screens = more horizontal battlefield

---

# Issue: Lock iOS Orientation to Landscape

type: task
priority: P1
estimate: 15

## Description
Configure Capacitor and iOS project to only allow landscape orientations. The game should never display in portrait mode on iOS.

## Implementation
1. Update `capacitor.config.json` with orientation preference
2. Verify `Info.plist` has correct `UISupportedInterfaceOrientations` values
3. Remove portrait orientations, keep only `UIInterfaceOrientationLandscapeLeft` and `UIInterfaceOrientationLandscapeRight`

## Acceptance Criteria
- [ ] App launches in landscape mode
- [ ] Rotating device to portrait does not rotate the app
- [ ] Works on both iPhone and iPad

---

# Issue: Query iOS Safe Area Insets

type: task
priority: P1
estimate: 30

## Description
Create a module to query and expose iOS safe area insets so UI elements can avoid the notch, Dynamic Island, and home indicator areas.

## Implementation
1. Create `js/safeArea.js` module
2. Use CSS `env(safe-area-inset-*)` values via JavaScript
3. Alternatively, use Capacitor's native bridge to get precise values
4. Export `getSafeArea()` returning `{ top, bottom, left, right }` in design-space pixels
5. Update values on orientation change (though we're locked to landscape)

## Acceptance Criteria
- [ ] Safe area values are correctly detected on notched iPhones
- [ ] Safe area values are 0 on non-notched devices
- [ ] Values are accessible synchronously after init
- [ ] Values update if viewport changes

---

# Issue: Implement Dynamic Canvas Sizing

type: task
priority: P1
estimate: 60
depends: Query iOS Safe Area Insets

## Description
Replace the fixed 1200x800 design space with dynamic sizing that fills the device screen. The canvas should match the actual device dimensions while accounting for safe areas.

## Implementation
1. On init, query actual viewport size via `window.innerWidth/Height`
2. Account for device pixel ratio for crisp rendering
3. Subtract safe area insets to get usable game area
4. Set canvas dimensions to match
5. Store computed dimensions in a central location (new `screenSize.js` or update `constants.js`)
6. Fire resize events when dimensions change

## Key Decisions
- **Fixed height, variable width**: Keep vertical space consistent (~800 logical pixels), let width vary. This keeps UI proportions familiar while expanding the battlefield.
- **Or fully dynamic**: Both dimensions scale to device. More complex but more flexible.

Recommend: Fixed height approach for simplicity.

## Acceptance Criteria
- [ ] Canvas fills available screen space (no letterboxing)
- [ ] Safe areas are respected (content doesn't go under notch)
- [ ] Device pixel ratio is handled for sharp rendering
- [ ] Dimensions are queryable from other modules

---

# Issue: Refactor HUD to Edge-Relative Positioning

type: task
priority: P1
estimate: 120
depends: Implement Dynamic Canvas Sizing, Query iOS Safe Area Insets

## Description
Update all HUD and UI elements to position themselves relative to screen edges and safe areas instead of using absolute coordinates.

## Current HUD Elements (from ui.js)
- Power bar (bottom left area)
- Angle arc (bottom left area)
- Fire button (bottom right)
- Weapon selector (top or bottom)
- Wind indicator (top center)
- Health bars (near tanks or top)
- Money display (top)
- Turn indicator (top)
- Round counter (top)

## Implementation
1. Create positioning helper functions:
   - `fromLeft(offset)` → `safeArea.left + offset`
   - `fromRight(offset)` → `screenWidth - safeArea.right - offset`
   - `fromTop(offset)` → `safeArea.top + offset`
   - `fromBottom(offset)` → `screenHeight - safeArea.bottom - offset`
2. Update each HUD element to use these helpers
3. Ensure touch hit areas are also updated
4. Test that slider zones (for angle/power) use new coordinates

## Acceptance Criteria
- [ ] All HUD elements visible and not obscured by safe areas
- [ ] HUD scales appropriately on different screen sizes
- [ ] Touch targets remain functional
- [ ] Layout looks good on both wide (iPhone) and square (iPad) screens

---

# Issue: Update Terrain Generation for Variable Width

type: task
priority: P1
estimate: 45
depends: Implement Dynamic Canvas Sizing

## Description
Ensure terrain generation works correctly with variable screen widths. The heightmap array size should match the actual screen width.

## Implementation
1. Update `terrain.js` to accept width as parameter or query it dynamically
2. Heightmap array length = screen width in pixels
3. Terrain features (hills, valleys) should scale proportionally
4. Destruction crater sizes remain absolute (not relative to screen)
5. Falling dirt physics should work unchanged

## Acceptance Criteria
- [ ] Terrain generates correctly for any screen width
- [ ] Terrain features are distributed across full width
- [ ] Destruction works correctly at all positions
- [ ] No visual artifacts at screen edges

---

# Issue: Update Tank Positioning for Variable Width

type: task
priority: P1
estimate: 30
depends: Update Terrain Generation for Variable Width

## Description
Position tanks appropriately for variable-width battlefields. Tanks should be placed at consistent relative positions (e.g., 15% from left edge for player, 85% for enemy).

## Implementation
1. Update tank spawn logic in `game.js` or `tank.js`
2. Use percentage-based positioning: `x = screenWidth * 0.15` for player
3. Ensure tanks are placed on terrain correctly at their x position
4. Update AI targeting to work with variable distances

## Acceptance Criteria
- [ ] Player tank spawns on left side of screen
- [ ] Enemy tank spawns on right side of screen
- [ ] Tanks are correctly seated on terrain
- [ ] AI still functions correctly with variable distances

---

# Issue: Update Camera/Viewport System

type: task
priority: P2
estimate: 60
depends: Implement Dynamic Canvas Sizing

## Description
If the game has any camera or viewport scrolling logic, update it to work with dynamic screen sizes. Even if not currently implemented, ensure the renderer can handle the new dimensions.

## Implementation
1. Review `renderer.js` for any hardcoded dimensions
2. Update any viewport/camera bounds
3. Ensure background rendering fills the screen
4. Update any parallax or background layers to tile/stretch appropriately

## Acceptance Criteria
- [ ] Background fills entire screen without gaps
- [ ] No rendering artifacts at screen edges
- [ ] Any camera/pan logic works correctly

---

# Issue: Test on Multiple iOS Devices

type: task
priority: P2
estimate: 90
depends: Refactor HUD to Edge-Relative Positioning, Update Tank Positioning for Variable Width

## Description
Comprehensive testing across different iOS device form factors to ensure adaptive sizing works correctly everywhere.

## Test Devices (Simulators)
- iPhone SE (3rd gen) - smallest, 16:9
- iPhone 15 - standard notched, Dynamic Island
- iPhone 15 Pro Max - largest phone, Dynamic Island
- iPad (10th gen) - standard iPad, ~4:3
- iPad Pro 12.9" - largest iPad

## Test Cases
1. Game fills screen completely (no letterboxing)
2. HUD elements visible and not under notch/Dynamic Island
3. Touch controls work correctly
4. Gameplay feels balanced (not too easy/hard due to width)
5. All screen transitions work (menu → game → shop → game)
6. Rotating device doesn't break anything (should stay landscape)

## Acceptance Criteria
- [ ] All test cases pass on iPhone SE
- [ ] All test cases pass on iPhone 15
- [ ] All test cases pass on iPhone 15 Pro Max
- [ ] All test cases pass on iPad
- [ ] All test cases pass on iPad Pro
