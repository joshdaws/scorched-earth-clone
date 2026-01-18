<!-- PHASE_1_SPEC_GAP: COMPLETE -->
<!-- PHASE_2_BROWSER_QA: PENDING -->
<!-- PHASE_3_VISUAL_AUDIT: PENDING -->
<!-- PHASE_4_TEST_COVERAGE: PENDING -->

# Final Phase: QA & Gap Analysis

When all implementation issues are complete, Ralph enters the final phase. This is a PM/QA pass to ensure the game is complete, polished, and working correctly.

**How it works:**
- Each phase below runs as a separate iteration
- Work through ONE phase, file issues for anything found, mark it COMPLETE, then stop
- Ralph will work the new issues, then continue to the next phase
- After all phases are COMPLETE, Ralph exits

---

## PHASE 1: Spec Gap Analysis

**Goal**: Verify every feature in the spec exists and is accessible to players.

### Instructions

1. **Read the specs thoroughly**: Open `docs/specs/game-spec.md` and `docs/specs/web-2.0-spec.md` and use extended thinking to analyze them section by section.

2. **Check each major feature area**:

   **Core Gameplay** ✅
   - [x] Turn-based combat (player → AI → player) - js/turn.js, js/game.js
   - [x] Angle adjustment (0-180°) - js/aimingControls.js, js/controls/slingshotAiming.js
   - [x] Power adjustment (0-100%) - js/aimingControls.js
   - [x] Wind indicator and physics effect - js/wind.js, js/projectile.js
   - [x] Projectile physics (gravity, wind) - js/projectile.js, PHYSICS constants
   - [x] Terrain destruction on impact - js/terrain.js
   - [x] Damage calculation (blast radius falloff) - js/damage.js
   - [x] Tank health system (100 HP each) - js/tank.js
   - [x] Win/lose detection - js/game.js, js/victoryDefeat.js
   - [x] Round transitions - js/roundTransition.js

   **Weapons System** ✅ (40 weapons implemented, exceeds spec)
   - [x] Basic Shot (unlimited ammo) - baby-shot and basic-shot have Infinity ammo
   - [x] All weapons implemented (40 total across 6 categories):
     - Standard: Baby Shot, Basic Shot, Missile, Big Shot, Mega Shot, Armor Piercer, Tracer, Precision Strike
     - Splitting: MIRV, Death's Head, Cluster Bomb, Chain Reaction, Scatter Shot, Fireworks
     - Rolling: Roller, Heavy Roller, Bouncer, Super Bouncer, Land Mine, Sticky Bomb
     - Digging: Digger, Heavy Digger, Sandhog, Drill, Laser Drill, Tunnel Maker
     - Nuclear: Mini Nuke, Nuke, Tactical Nuke, Neutron Bomb, EMP Blast, Fusion Strike
     - Special: Napalm, Liquid Dirt, Teleporter, Shield Buster, Wind Bomb, Gravity Well, Lightning Strike, Ion Cannon
   - [x] Weapon selection UI - js/ui.js, js/shop.js
   - [x] Ammo tracking per weapon - js/runState.js
   - [x] Weapon-specific behaviors - js/projectile.js handles all types

   **Terrain System** ✅
   - [x] Procedural terrain generation - js/terrain.js
   - [x] Destructible terrain on explosion - js/terrain.js destroyCircle()
   - [x] Tank placement on terrain - js/tank.js, getHeight()
   - [x] Terrain affects projectile collision - js/projectile.js checks terrain

   **AI Opponents** ✅
   - [x] Easy AI (high error margin) - DIFFICULTY_CONFIG[EASY] angleError ±15°
   - [x] Medium AI (partial wind compensation) - 50% windCompensationAccuracy
   - [x] Hard AI (full ballistic calculation) - 85% accuracy, Hard+ 95%
   - [x] AI weapon selection - js/ai.js weapon pool management
   - [x] AI turn execution with delay - thinkingDelay configurable per difficulty

   **Economy & Shop** ✅
   - [x] Starting money ($1,000) - GAME.STARTING_MONEY = 1000 in constants.js
   - [x] Money earned from damage and wins - js/money.js
   - [x] Shop opens between rounds - GAME_STATES.SHOP
   - [x] Weapon purchasing - js/shop.js with shields/items too
   - [x] Insufficient funds handling - shop.js validates before purchase

   **Progression Systems** ✅
   - [x] Roguelike run tracking - js/runState.js
   - [x] Round progression with difficulty scaling - js/levels.js 60 levels in 6 worlds
   - [x] High score tracking - js/highScores.js with leaderboard support
   - [x] Lifetime statistics - js/lifetime-stats.js

   **Tank Collection & Gacha** ✅
   - [x] Tank skins (33 skins, 5 rarities) - js/tank-skins.js
   - [x] Supply drop system - js/supply-drop.js with crate animations
   - [x] Pity mechanics - js/pity-system.js with soft/hard pity
   - [x] Skin equipping - js/tank-collection.js
   - [x] Token rewards - js/tokens.js

   **Achievements** ✅
   - [x] 40+ achievements across 6 categories - js/achievements.js
   - [x] Achievement unlock notifications - js/achievement-popup.js
   - [x] Achievement token rewards - DIFFICULTY_TOKEN_REWARDS mapping
   - [x] Achievement gallery/viewer - js/achievement-screen.js

   **Visual Effects** ✅
   - [x] Explosion particles - js/effects.js createExplosionParticles()
   - [x] Screen shake - js/effects.js screenShake(), screenShakeForBlastRadius()
   - [x] Screen flash (nuclear weapons) - js/effects.js screenFlash()
   - [x] CRT/scanline effect (optional) - js/effects.js CRT_CONFIG
   - [x] Synthwave aesthetic (neon colors, grid) - Throughout CSS and renderer

   **Audio** ✅
   - [x] Sound effects (fire, explosions, hits) - js/sound.js comprehensive SFX
   - [x] Background music - js/music.js with Web Audio API
   - [x] Volume controls (master, music, SFX) - js/volumeControls.js
   - [x] Music ducking during explosions - js/sound.js duckMusic()/unduckMusic()

   **UI/UX** ✅
   - [x] Main menu - GAME_STATES.MENU with mode selection
   - [x] Pause menu - js/pauseMenu.js
   - [x] HUD (health, money, wind, weapons) - js/ui.js comprehensive HUD
   - [x] Victory screen - js/victoryDefeat.js
   - [x] Defeat screen - js/victoryDefeat.js
   - [x] Settings screen - Settings accessible via pause menu

   **Mobile Support** ✅
   - [x] Touch controls working - js/touchAiming.js, js/input.js pointer abstraction
   - [x] Responsive canvas scaling - js/screenSize.js maintains 3:2 aspect ratio
   - [x] Safe area handling (notch) - js/safeArea.js

3. **For each missing or incomplete feature**, file an issue:
   ```bash
   bd create "Implement [feature name]" --type task --label gap --parent scorched-earth-1sy \
     --description "Per spec section [X], this feature should [description]. Currently missing/incomplete."
   ```

4. **Mark phase complete**:
   - Edit this file: change `PHASE_1_SPEC_GAP: PENDING` to `PHASE_1_SPEC_GAP: COMPLETE`
   - Commit: `git add .ralph/FINAL_PHASE.md && git commit -m "chore: Complete final phase 1 (spec gap analysis)"`

5. **Stop here** - Ralph will work the new issues before continuing to phase 2.

---

## PHASE 2: Browser QA Testing

**Goal**: Test every user flow in a real browser to find bugs and UX issues. Use TestAPI for programmatic testing and browser automation for visual verification.

### Available Testing Tools

```javascript
// TestAPI - Programmatic control (access via browser console)
TestAPI.aim({ angle: 45, power: 75 });
TestAPI.fire();
TestAPI.fireDirect(); // Bypass turn validation
TestAPI.simulateProjectile({ angle: 45, power: 75 });
TestAPI.generateTerrain({ seed: 12345 });
TestAPI.setTankPositions({ player: 200, enemy: 1000 });
TestAPI.snapshot('name'); // Capture game state
TestAPI.compareSnapshots('before', 'after');

// Debug Commands (press D to enable debug mode first)
Debug.skipToShop(10000);
Debug.skipToVictory();
Debug.skipToDefeat();
Debug.giveAllWeapons(10);
Debug.killEnemy();
Debug.toggleGodMode();

// URL Parameters
?scene=physics-sandbox&seed=12345&wind=0&debug=true
?scene=shop&money=100000
?scene=round-start&round=10&difficulty=hard
```

### Instructions

1. **Start the game** and open browser to the game URL (typically `file://` or local server)

2. **Test each user flow systematically**:

   **New Game Flow**
   - [ ] Main menu loads correctly
   - [ ] Can start new game
   - [ ] First round initializes properly
   - [ ] Terrain generates
   - [ ] Tanks placed on terrain
   - [ ] Wind indicator shows

   **Aiming & Firing**
   - [ ] Angle slider works (keyboard and touch/mouse)
   - [ ] Power slider works
   - [ ] Weapon selection works
   - [ ] Fire button fires projectile
   - [ ] Projectile follows physics (gravity + wind)
   - [ ] Use TestAPI to validate physics: `TestAPI.validatePhysics({ angle: 45, power: 100, expectedRange: 500, tolerance: 50 })`

   **Combat Flow**
   - [ ] Hit detection works on enemy tank
   - [ ] Damage calculated correctly
   - [ ] Health bar updates
   - [ ] Terrain destruction on impact
   - [ ] AI takes turn after player
   - [ ] Turn indicator updates

   **Weapon Behaviors** (test each with TestAPI)
   - [ ] Basic Shot - standard explosion
   - [ ] Missile - larger explosion
   - [ ] Big Shot - large damage
   - [ ] MIRV - splits at apex into 5 warheads
   - [ ] Death's Head - splits into 9 warheads
   - [ ] Roller - rolls along terrain
   - [ ] Heavy Roller - heavier roller
   - [ ] Digger - tunnels through terrain
   - [ ] Heavy Digger - longer tunnel
   - [ ] Mini Nuke - large explosion + screen effects
   - [ ] Nuke - massive explosion + mushroom cloud

   **Round End**
   - [ ] Victory triggers when enemy destroyed
   - [ ] Defeat triggers when player destroyed
   - [ ] Money awarded correctly
   - [ ] Shop opens after round

   **Shop Flow**
   - [ ] Shop displays weapons and prices
   - [ ] Can purchase weapons with sufficient funds
   - [ ] Cannot purchase with insufficient funds
   - [ ] Inventory updates after purchase
   - [ ] Can exit shop to start next round

   **Progression**
   - [ ] Rounds increment
   - [ ] AI difficulty scales
   - [ ] Run statistics tracked
   - [ ] Game over shows final stats

   **Edge Cases**
   - [ ] Both tanks destroyed same turn
   - [ ] Projectile goes off-screen
   - [ ] Zero power fire
   - [ ] Empty weapon ammo handling
   - [ ] Pause during projectile flight
   - [ ] Quick consecutive inputs

3. **For each bug found**, file an issue:
   ```bash
   bd create "[Brief description of bug]" --type bug --label qa --parent scorched-earth-1sy \
     --description "Steps to reproduce:\n1. ...\n2. ...\n\nExpected: ...\nActual: ...\n\nTestAPI reproduction: ..."
   ```

4. **Mark phase complete**:
   - Edit this file: change `PHASE_2_BROWSER_QA: PENDING` to `PHASE_2_BROWSER_QA: COMPLETE`
   - Commit: `git add .ralph/FINAL_PHASE.md && git commit -m "chore: Complete final phase 2 (browser QA)"`

5. **Stop here** - Ralph will work the new issues before continuing to phase 3.

---

## PHASE 3: Visual/Mobile Audit

**Goal**: Ensure the game looks polished at all breakpoints. This is designed for iOS mobile!

### Instructions

1. **Test at each breakpoint** by resizing the browser:

   | Width | Device |
   |-------|--------|
   | 375px | iPhone SE/mini |
   | 390px | iPhone 14 |
   | 414px | iPhone Plus/Max |
   | 768px | iPad/tablet |
   | 1024px+ | Desktop |

2. **At EACH breakpoint, check EVERY screen for**:
   - [ ] Canvas scales correctly (maintains 3:2 aspect ratio)
   - [ ] No content clipped or hidden
   - [ ] Touch targets at least 44px (buttons, sliders)
   - [ ] HUD readable and properly positioned
   - [ ] Menu buttons accessible
   - [ ] Sliders usable (not too small)
   - [ ] Safe area respected (notch area clear)

3. **Screens to audit**:
   - [ ] Title screen / Main menu
   - [ ] Gameplay screen (tanks, terrain, HUD)
   - [ ] Pause menu
   - [ ] Shop screen
   - [ ] Victory screen
   - [ ] Defeat screen
   - [ ] High scores screen
   - [ ] Settings/options screen
   - [ ] Achievements screen
   - [ ] Tank collection screen
   - [ ] Supply drop animation

4. **Visual polish checks**:
   - [ ] Synthwave aesthetic consistent (neon colors, dark backgrounds)
   - [ ] No visual glitches in explosions
   - [ ] Particle effects don't lag
   - [ ] Text readable at all sizes
   - [ ] Buttons have proper hit states (hover, pressed)
   - [ ] Animations smooth (60fps target)

5. **Touch interaction checks** (use browser device emulation):
   - [ ] Tap to fire works
   - [ ] Slider drag smooth
   - [ ] No accidental fires while adjusting
   - [ ] Weapon selection touch targets adequate
   - [ ] Menu navigation works with touch

6. **For each visual issue**, file an issue:
   ```bash
   bd create "[Component] visual issue at [breakpoint]" --type bug --label visual --parent scorched-earth-1sy \
     --description "At [width]px, [description of issue].\n\nScreen: [screen name]\nDevice: [device type]"
   ```

7. **Mark phase complete**:
   - Edit this file: change `PHASE_3_VISUAL_AUDIT: PENDING` to `PHASE_3_VISUAL_AUDIT: COMPLETE`
   - Commit: `git add .ralph/FINAL_PHASE.md && git commit -m "chore: Complete final phase 3 (visual audit)"`

8. **Stop here** - Ralph will work the new issues before continuing to phase 4.

---

## PHASE 4: Test Coverage Review

**Goal**: Identify critical game logic that needs automated test coverage.

### Instructions

1. **Review TestAPI coverage**:
   ```bash
   # Find TestAPI implementation
   cat js/testAPI.js
   ```

2. **Review what's currently testable** via TestAPI:
   - Aiming (angle, power)
   - Firing and trajectory simulation
   - Terrain generation with seeds
   - Tank positioning
   - State snapshots and comparison
   - Physics validation

3. **Identify gaps** - Critical paths that NEED test coverage:

   **Physics System**
   - [ ] Gravity affects projectile correctly
   - [ ] Wind affects projectile correctly
   - [ ] Terrain collision detection accurate
   - [ ] Tank hit detection accurate
   - [ ] Damage falloff calculation correct

   **Weapon Behaviors**
   - [ ] MIRV splits at correct apex
   - [ ] Roller follows terrain contour
   - [ ] Digger tunnels correct distance
   - [ ] Nuclear weapons trigger screen effects
   - [ ] Each weapon damage matches spec

   **Game State**
   - [ ] Turn transitions correctly
   - [ ] Health updates on damage
   - [ ] Money calculation accurate
   - [ ] Round progression works
   - [ ] Win/lose conditions detected

   **AI System**
   - [ ] AI calculates shot within difficulty bounds
   - [ ] AI uses weapons appropriately
   - [ ] AI turn completes in reasonable time

   **Economy**
   - [ ] Starting money correct
   - [ ] Damage rewards calculated correctly
   - [ ] Win bonus applied
   - [ ] Shop transactions update inventory

4. **For each missing TestAPI capability**, file an issue:
   ```bash
   bd create "Add TestAPI method for [capability]" --type task --label test-coverage --parent scorched-earth-1sy \
     --description "Need TestAPI method to test: [what needs testing]\n\nSuggested API:\n\`\`\`javascript\nTestAPI.methodName({ params })\n\`\`\`"
   ```

5. **For each untestable critical path**, file an issue:
   ```bash
   bd create "Add automated test for [area]" --type task --label test-coverage --parent scorched-earth-1sy \
     --description "Critical path lacking test coverage:\n\n[Description]\n\nTest scenarios:\n- ...\n- ..."
   ```

6. **Mark phase complete**:
   - Edit this file: change `PHASE_4_TEST_COVERAGE: PENDING` to `PHASE_4_TEST_COVERAGE: COMPLETE`
   - Commit: `git add .ralph/FINAL_PHASE.md && git commit -m "chore: Complete final phase 4 (test coverage)"`

7. **Stop here** - Ralph will work any remaining issues, then this epic is complete.

---

## Notes

- **Be thorough** - It's better to file too many issues than to miss problems
- **Be specific** - Include exact steps, breakpoints, and descriptions
- **Use labels** - Helps organize: `gap`, `qa`, `visual`, `test-coverage`
- **Reference the spec** - When filing gap issues, cite specific spec sections
- **Use TestAPI** - Programmatic testing is more reliable than manual
- **One phase at a time** - Complete one phase fully before moving to the next

## Resetting

To re-run the final phase (e.g., after major changes):
1. Edit the status markers at the top of this file
2. Change `COMPLETE` back to `PENDING` for phases you want to re-run
3. Commit the change
4. Run Ralph again
