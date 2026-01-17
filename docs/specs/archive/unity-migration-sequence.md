> ⚠️ **ARCHIVED - DO NOT USE DIRECTLY**
>
> This sequence was written for Unity native development. The project has pivoted back to the web version.
> This document is preserved for reference only.

# Unity Migration Sequence
## Scorched Earth: Synthwave Edition - Implementation Order

**Document Version:** 1.0
**Date:** January 12, 2026
**Purpose:** Recommended order of epic completion, critical path analysis, and parallelization opportunities

---

## Overview

This document defines the optimal sequence for implementing the Unity migration. It identifies:
- **Critical path** tasks that block other work
- **Parallelization opportunities** where multiple epics can progress simultaneously
- **Milestone definitions** for tracking overall progress
- **Dependency graph** showing epic relationships

Total estimated timeline: **16 weeks** (per spec section 1)

---

## Epic Dependency Graph

```
[Unity Project Setup] ← MUST BE FIRST
    ↓
    ├─→ [Asset Migration] ────────────────┐
    ├─→ [Core Systems Port] ──────────┐   │
    │       ↓                          ↓   ↓
    │   [Terrain System] ─────→ [Tank & Combat] ─→ [Weapons Arsenal] ─→ [AI System]
    │       ↓                          ↓                  ↓                  ↓
    │   [Visual Polish] ←──────────────┴──────────────────┘                 │
    │       ↓                                                                │
    │   [Animated Title Screen]                                             │
    │       ↓                                                                │
    │   [UI/UX] ←────────────────────────────────────────────────────────────┘
    │       ↓
    │   [Economy & Progression]
    │       ↓
    │   [Audio Integration]
    │       ↓
    │   [Mobile Optimization] ← FINAL PHASE
```

**Legend:**
- `→` : Blocking dependency (left must complete before right)
- Vertical alignment: Can work in parallel (with shared dependencies)

---

## Critical Path

The **critical path** (longest sequence of dependent tasks) determines minimum timeline:

1. **Unity Project Setup** (Week 1)
2. **Core Systems Port** (Week 1-2)
3. **Terrain System** (Week 1-2)
4. **Tank & Combat** (Week 3-4)
5. **Weapons Arsenal** (Week 3-4)
6. **AI System** (Week 3-4)
7. **Visual Polish** (Week 5-6)
8. **UI/UX** (Week 5-8)
9. **Economy & Progression** (Week 7-8)
10. **Mobile Optimization** (Week 9-12)

**Critical path duration:** 12 weeks (foundation → gameplay → content → optimization)

---

## Phase Breakdown

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core gameplay loop works

#### Epic: Unity Project Setup (P0) - **MUST BE FIRST**
**Status:** Ready to start
**Blockers:** None
**Blocking:** Everything else

**Tasks:**
- scorched-earth-2a6.1: Create Unity 6 project with 2D URP template
- scorched-earth-2a6.2: Configure iOS and macOS build settings (blocked by 2a6.1)
- scorched-earth-2a6.3: Import essential Unity packages
- scorched-earth-2a6.4: Set up proper folder structure
- scorched-earth-2a6.5: Configure Git LFS for Unity binaries

**Estimated Duration:** 1 week (5-8 hours total)

---

#### Epic: Asset Migration (P1) - **Can start after project setup**
**Status:** Blocked by Unity Project Setup
**Blockers:** scorched-earth-2a6
**Blocking:** Visual Polish, UI/UX, Weapons Arsenal (for icons)

**Key Tasks:**
- Import 34 tank skin sprites
- Import 11 weapon icons
- Import supply drop assets
- Configure sprite atlases
- Set up fonts (TextMeshPro)

**Estimated Duration:** 1 week (8-12 hours)
**Parallelizable:** Can work alongside Core Systems Port

---

#### Epic: Core Systems Port (P0) - **Critical path**
**Status:** Blocked by Unity Project Setup
**Blockers:** scorched-earth-2a6
**Blocking:** All gameplay epics (provides managers)

**Tasks:**
- scorched-earth-cd4.1: Create Bootstrap scene and GameManager singleton
- scorched-earth-cd4.2: Implement game state machine
- scorched-earth-cd4.3: Create ProgressionManager for level tracking
- scorched-earth-cd4.4: Create CurrencyManager for coins and gems
- scorched-earth-cd4.5: Implement SaveLoadManager with persistence

**Estimated Duration:** 1 week (12-16 hours)
**Parallelizable:** Can work alongside Asset Migration

---

#### Epic: Terrain System (P0) - **Critical path**
**Status:** Blocked by Core Systems Port
**Blockers:** scorched-earth-cd4 (needs managers)
**Blocking:** Tank & Combat, Visual Polish

**Tasks:**
- scorched-earth-5wn.1: Implement Terrain.cs heightmap data structure
- scorched-earth-5wn.2: Port midpoint displacement generation algorithm
- scorched-earth-5wn.3: Create mesh-based TerrainRenderer
- scorched-earth-5wn.4: Implement crater destruction algorithm
- scorched-earth-5wn.5: Implement falling dirt physics simulation

**Estimated Duration:** 1.5 weeks (16-24 hours)
**Note:** Most technically complex epic. Mesh rendering is critical path item.

---

### Phase 2: Core Gameplay (Weeks 3-4)

**Goal:** Playable game loop (player vs AI)

#### Epic: Tank & Combat (P0) - **Critical path**
**Status:** Blocked by Terrain System
**Blockers:** scorched-earth-5wn (terrain collision), scorched-earth-cd4 (managers)
**Blocking:** Weapons Arsenal, AI System, Visual Polish

**Tasks:**
- scorched-earth-dz4.1: Create Tank.cs core class with health and positioning
- scorched-earth-dz4.2: Implement ballistic projectile physics
- scorched-earth-dz4.3: Create aiming controls with trajectory preview
- Additional: Turn-based combat flow, damage system, wind integration

**Estimated Duration:** 2 weeks (20-28 hours)

---

#### Epic: Weapons Arsenal (P1) - **Critical path**
**Status:** Blocked by Tank & Combat
**Blockers:** scorched-earth-dz4 (projectile base), scorched-earth-8rv (weapon icons)
**Blocking:** AI System, Economy & Progression

**Tasks:**
- scorched-earth-jxq.1: Create WeaponData ScriptableObject system
- scorched-earth-jxq.2: Implement MIRV projectile with split behavior
- Additional: Roller, Digger, Nuke, and 15+ other weapons

**Estimated Duration:** 2 weeks (24-32 hours)
**Parallelizable:** Can work on multiple weapons simultaneously

---

#### Epic: AI System (P1) - **Critical path for content**
**Status:** Blocked by Weapons Arsenal
**Blockers:** scorched-earth-dz4 (combat system), scorched-earth-jxq (weapons)
**Blocking:** UI/UX (needs AI for gameplay testing)

**Tasks:**
- Create AIDifficulty ScriptableObjects
- Port aiming algorithm from ai.js
- Implement weapon selection logic
- Create three difficulty levels

**Estimated Duration:** 1.5 weeks (16-20 hours)

---

### Phase 3: Visual Polish (Weeks 5-6)

**Goal:** Synthwave aesthetic complete

#### Epic: Visual Polish (P2)
**Status:** Blocked by Terrain, Tank & Combat, Weapons
**Blockers:** scorched-earth-5wn, scorched-earth-dz4, scorched-earth-jxq
**Blocking:** Animated Title Screen (shares post-processing setup)

**Tasks:**
- Configure URP Volume Profile (Bloom, Color Grading)
- Create explosion particle systems
- Implement screen shake (Cinemachine)
- Create projectile trails
- Nuclear effects (mushroom cloud, flash)
- Terrain gradient shader

**Estimated Duration:** 2 weeks (20-28 hours)
**Parallelizable:** Can start particles while weapons are still being added

---

#### Epic: Animated Title Screen (P0) - **CRITICAL FEATURE**
**Status:** Blocked by Visual Polish (for post-processing)
**Blockers:** scorched-earth-2a6 (URP setup), scorched-earth-kfp (post-processing)
**Blocking:** None (but critical for first impressions)

**Tasks:**
- scorched-earth-n4p.1: Create synthwave grid shader (Option 1 approach)
- scorched-earth-n4p.2: Create title screen scene with animated background

**Estimated Duration:** 1 week (6-10 hours with shader approach)
**Note:** This feature is CRITICAL per spec. High priority despite P0 label coming later in sequence.

---

### Phase 4: Progression (Weeks 7-8)

**Goal:** Level structure and unlocks working

#### Epic: Economy & Progression (P2)
**Status:** Blocked by Weapons Arsenal, UI/UX
**Blockers:** scorched-earth-jxq (unlock targets), scorched-earth-2sj (shop UI)
**Blocking:** None

**Tasks:**
- Implement dual currency system
- Create 60 LevelData ScriptableObjects
- Implement star rating calculation
- Configure weapon unlock gates
- Supply drop system integration

**Estimated Duration:** 2 weeks (20-28 hours)
**Parallelizable:** Level data creation can be parallelized

---

#### Epic: UI/UX (P1)
**Status:** Blocked by all gameplay epics
**Blockers:** scorched-earth-8rv (fonts, sprites), scorched-earth-cd4 (managers), scorched-earth-dz4 (gameplay HUD), scorched-earth-jxq (shop items), scorched-earth-ihk (AI testing)
**Blocking:** Economy & Progression (shop UI)

**Tasks:**
- Main menu
- Level select UI
- Gameplay HUD
- Shop UI
- Settings screen
- Pause menu
- Level complete screen
- Collection screen

**Estimated Duration:** 3 weeks (28-40 hours)
**Note:** Major rewrite from web. Can start early screens (menu) before gameplay complete.

---

#### Epic: Audio Integration (P2)
**Status:** Blocked by Core Systems
**Blockers:** scorched-earth-cd4 (AudioManager), scorched-earth-8rv (audio files)
**Blocking:** None

**Tasks:**
- AudioManager with pooling
- Music crossfading system
- SFX playback
- Audio Mixer setup
- Volume controls

**Estimated Duration:** 1.5 weeks (16-20 hours)
**Parallelizable:** Can work entirely independently after managers are ready

---

### Phase 5-6: Mobile & Content (Weeks 9-12)

**Goal:** 60 FPS on iOS, full content

#### Epic: Mobile Optimization (P1) - **FINAL PHASE**
**Status:** Blocked by all gameplay epics
**Blockers:** Everything (needs features to optimize)
**Blocking:** Launch

**Tasks:**
- Slingshot aiming implementation
- Touch input handling
- Performance profiling on iPhone SE
- Texture atlas optimization
- Particle count tuning
- Safe area handling
- iOS haptic feedback
- TestFlight build

**Estimated Duration:** 3-4 weeks (32-48 hours)
**Note:** Performance testing must use real devices. iPhone SE is minimum target.

---

## Parallelization Opportunities

### Week 1-2: Three parallel streams
1. **Stream A:** Unity Project Setup → Core Systems Port
2. **Stream B:** Asset Migration (after project setup)
3. **Stream C:** Terrain System (after core systems)

### Week 3-4: Two parallel streams
1. **Stream A:** Tank & Combat → Weapons Arsenal
2. **Stream B:** Visual Polish (particles and effects)

### Week 5-8: Three parallel streams
1. **Stream A:** Animated Title Screen
2. **Stream B:** UI/UX (early screens)
3. **Stream C:** Audio Integration

### Week 7-10: Two parallel streams
1. **Stream A:** Economy & Progression
2. **Stream B:** UI/UX (shop, level select)

### Week 9-12: Focus stream
1. **Mobile Optimization** (requires full attention, real device testing)

---

## Milestone Definitions

### Milestone 1: Foundation Complete (End of Week 2)
**Criteria:**
- ✅ Unity project configured and committed
- ✅ All essential packages installed
- ✅ Assets imported and organized
- ✅ Core managers implemented
- ✅ Terrain generates and renders
- ✅ Terrain destruction works
- ✅ Can create craters that settle

**Demo:** Generate terrain, click to create craters, watch dirt fall

---

### Milestone 2: Core Gameplay Loop (End of Week 4)
**Criteria:**
- ✅ Player tank spawns on terrain
- ✅ Aiming controls work (angle/power sliders)
- ✅ Trajectory preview shows arc
- ✅ Projectile fires and follows ballistic path
- ✅ Explosion creates crater and damages tanks
- ✅ AI opponent fires back
- ✅ Turn-based flow works
- ✅ Win/lose conditions detect
- ✅ At least 5 weapons implemented (Basic, MIRV, Roller, Digger, Nuke)

**Demo:** Play a full round against AI opponent

---

### Milestone 3: Visual Polish Complete (End of Week 6)
**Criteria:**
- ✅ Synthwave color palette throughout
- ✅ Bloom post-processing on neon elements
- ✅ Explosion particles look impactful
- ✅ Screen shake on explosions
- ✅ Nuclear effects (mushroom cloud, screen flash)
- ✅ Animated title screen with grid background
- ✅ Game has distinctive synthwave aesthetic

**Demo:** Title screen → gameplay with explosions showcasing visual polish

---

### Milestone 4: Progression Systems (End of Week 8)
**Criteria:**
- ✅ 30 levels created across 3 worlds (MVP reduced scope)
- ✅ Star rating system working
- ✅ Coins earned from gameplay
- ✅ Shop UI functional
- ✅ Weapons unlock based on progression
- ✅ Save/load preserves progress
- ✅ Main menu, level select, settings screens working

**Demo:** Complete a level, earn stars/coins, buy weapon in shop, progress to next level

---

### Milestone 5: Launch Ready (End of Week 12)
**Criteria:**
- ✅ 60 FPS on iPhone SE (minimum)
- ✅ Touch controls (slingshot mode) working
- ✅ Safe area handling for notched devices
- ✅ All 20 weapons implemented and balanced
- ✅ Audio system complete with music and SFX
- ✅ No critical bugs in TestFlight
- ✅ App Store metadata prepared
- ✅ Ready for submission

**Demo:** Full playthrough on real iOS device from title screen through multiple levels

---

## Risk Mitigation

### High-Risk Items (Address Early)

1. **Terrain destruction performance**
   - **Risk:** Mesh updates too slow on mobile
   - **Mitigation:** Profile early (Week 2), optimize mesh update algorithm
   - **Fallback:** Texture-based terrain if mesh fails

2. **Title screen 3D complexity**
   - **Risk:** Shader approach doesn't match original feel
   - **Mitigation:** Start with shader (fastest), have particle system as backup
   - **Fallback:** Simpler 2D grid animation

3. **Touch controls feel**
   - **Risk:** Slingshot aiming doesn't feel responsive
   - **Mitigation:** Implement slider controls first (proven), add slingshot later
   - **Fallback:** Slider-only mode is acceptable

4. **60 FPS target on iPhone SE**
   - **Risk:** Performance below target
   - **Mitigation:** Profile continuously, optimize particle counts early
   - **Fallback:** Lower graphics quality setting for older devices

### Medium-Risk Items (Monitor)

1. **AI too easy/hard**
   - Test difficulty curve extensively in Phase 2
   - Tune accuracy parameters based on playtesting

2. **Content creation time (60 levels)**
   - Start with 30 levels for MVP (reduced scope per spec)
   - Add more levels post-launch

3. **Weapon balance**
   - Copy web version balance as baseline
   - Iterate based on testing

---

## Dependencies Summary

### Epic Dependencies (What blocks what)

| Epic | Blocked By | Blocks |
|------|------------|--------|
| Unity Project Setup | None | Everything |
| Asset Migration | Unity Project Setup | Visual Polish, UI/UX, Weapons |
| Core Systems Port | Unity Project Setup | Terrain, Tank & Combat, Audio |
| Terrain System | Core Systems Port | Tank & Combat, Visual Polish |
| Tank & Combat | Terrain System, Core Systems | Weapons, AI, Visual Polish |
| Weapons Arsenal | Tank & Combat, Asset Migration | AI, Economy |
| AI System | Tank & Combat, Weapons | UI/UX (for testing) |
| Visual Polish | Terrain, Tank & Combat, Weapons | Animated Title Screen |
| Animated Title Screen | Unity Project Setup, Visual Polish | None |
| UI/UX | Asset Migration, all gameplay epics | Economy |
| Economy & Progression | Weapons, UI/UX | None |
| Audio Integration | Core Systems, Asset Migration | None |
| Mobile Optimization | All gameplay epics | Launch |

### Task-Level Blocking Examples

Within Unity Project Setup:
- 2a6.2 (Build settings) blocked by 2a6.1 (Project creation)
- 2a6.3 (Packages) blocked by 2a6.1 (Project creation)
- 2a6.4 (Folder structure) blocked by 2a6.1 (Project creation)

Within Terrain System:
- 5wn.3 (TerrainRenderer) blocked by 5wn.1 (Terrain.cs data structure)
- 5wn.4 (Crater destruction) blocked by 5wn.1 (data structure), 5wn.3 (renderer)
- 5wn.5 (Falling dirt) blocked by 5wn.4 (destruction must work first)

Within Tank & Combat:
- dz4.2 (Projectile physics) blocked by 5wn.1 (terrain collision detection)
- dz4.3 (Aiming controls) blocked by dz4.2 (needs projectile to preview)

---

## Recommended Start Sequence

### Week 1, Day 1-2: Setup Sprint
1. ✅ Create Unity project (2a6.1) - **User action required**
2. ✅ Configure build settings (2a6.2)
3. ✅ Import packages (2a6.3)
4. ✅ Set up folders (2a6.4)
5. ✅ Configure Git LFS (2a6.5)

### Week 1, Day 3-5: Core Systems Sprint
6. ✅ Create GameManager (cd4.1)
7. ✅ Implement state machine (cd4.2)
8. ✅ Create ProgressionManager (cd4.3)
9. ✅ Create CurrencyManager (cd4.4)
10. ⚠️ Parallel: Start asset import (8rv tasks)

### Week 2, Day 1-5: Terrain Sprint
11. ✅ Implement Terrain.cs (5wn.1)
12. ✅ Port generation algorithm (5wn.2)
13. ✅ Create TerrainRenderer (5wn.3) - **Critical path**
14. ✅ Implement crater destruction (5wn.4)
15. ✅ Implement falling dirt (5wn.5)

**Checkpoint:** Milestone 1 (Foundation Complete)

### Week 3-4: Gameplay Sprint
16. Continue with Tank & Combat tasks (dz4.x)
17. Then Weapons Arsenal (jxq.x)
18. Then AI System (ihk.x)

**Checkpoint:** Milestone 2 (Core Gameplay Loop)

---

## Notes

- **User action required** for Unity project creation (GUI operation)
- Tasks marked with ✅ are sequential (must complete in order)
- Tasks marked with ⚠️ can be parallelized
- Estimated hours are per task, not including testing/iteration
- All estimates assume solo developer working full-time
- Add 20-30% buffer for unexpected issues and iteration

---

## Success Criteria

By following this sequence:
- ✅ Critical path items completed in order
- ✅ Parallelization maximized where possible
- ✅ Risk items addressed early
- ✅ Milestones provide clear progress checkpoints
- ✅ 16-week timeline achievable with focused effort
- ✅ MVP launch ready with core features polished

---

**END OF SEQUENCE DOCUMENT**

*Last Updated: January 12, 2026*
*Reference: docs/specs/unity-migration-spec.md for detailed technical specifications*
