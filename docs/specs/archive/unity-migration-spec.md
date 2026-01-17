> ⚠️ **ARCHIVED - DO NOT USE DIRECTLY**
>
> This spec was written for Unity native development. The project has pivoted back to the web version.
> This document is preserved for reference only. A new web-focused spec will be created.
>
> The research and best practices sections (mechanics, progression, monetization, UI/UX) remain valuable
> and should be adapted for the web implementation.

# Unity Migration Specification
## Scorched Earth: Synthwave Edition - Complete Port Specification

**Document Version:** 1.0
**Date:** January 12, 2026
**Purpose:** Comprehensive blueprint for migrating from web (Canvas 2D + JavaScript) to Unity native

---

## Executive Summary

This document defines the complete migration strategy for porting Scorched Earth: Synthwave Edition from a web-based prototype to a native Unity application for iOS and macOS. The migration combines:

1. **Proven best practices** from artillery game research (slingshot controls, weapon variety, juice/polish)
2. **Existing working prototype** (57 JavaScript modules, 11+ weapons, supply drop system, achievements)
3. **Modern Unity architecture** (URP 2D, ScriptableObjects, modular design patterns)

### Timeline Estimate

**16 weeks total** (following phased approach from best practices research):
- Weeks 1-2: Foundation (terrain, physics)
- Weeks 3-4: Core gameplay (tanks, weapons, AI)
- Weeks 5-6: Visual polish (effects, shaders, post-processing)
- Weeks 7-8: Progression (levels, unlocks, economy)
- Weeks 9-10: Content (60 levels, 40 weapons)
- Weeks 11-12: Monetization (ads, IAP, shop UI)
- Weeks 13-16: Beta, polish, and launch

### Scope

**What we're migrating:**
- ✅ Complete gameplay mechanics (turn-based artillery combat)
- ✅ Terrain generation and destruction
- ✅ 11+ weapon types with unique behaviors
- ✅ AI opponents (3 difficulty levels)
- ✅ Economy and shop system
- ✅ Supply drop system with rarity tiers
- ✅ Achievement system (4 categories)
- ✅ Synthwave visual aesthetic
- ✅ Audio system (music + SFX)
- ✅ **CRITICAL: Animated title screen with Three.js-style synthwave grid**

**What we're improving/adding (based on best practices research):**
- 🆕 Hybrid slingshot/slider aiming controls (player choice)
- 🆕 Trajectory preview line
- 🆕 Enhanced "juice" (screen shake, particles, slow-mo on big hits)
- 🆕 60 levels across 6 synthwave-themed worlds (vs current endless rounds)
- 🆕 3-star rating system per level
- 🆕 Daily challenges and events
- 🆕 Expanded weapon roster (target 40 at launch, path to 100+)
- 🆕 Ethical F2P monetization (freemium model)

---

## 1. Game Design Decisions

### 1.1 Core Mechanics (informed by artillery-game-best-practices.md)

#### Aiming System

**Decision: Hybrid approach (let players choose)**

```
Player preference setting in options:
├─ "Classic" mode: Angle (0-180°) + Power (0-100%) sliders
├─ "Slingshot" mode: Drag-and-release touch control
└─ "Hybrid" mode: Sliders with drag overlay (both work)
```

**Rationale:**
- Best practices research shows slingshot wins on mobile (Angry Birds standard)
- But Scorched Earth fans expect precision slider controls
- Solution: Default to slingshot on mobile, sliders on desktop, let users switch
- Trajectory preview ALWAYS shown (industry standard)

**Unity Implementation:**
- Separate `SlingshotAiming.cs` and `SliderAiming.cs` components
- Both implement `IAimingControl` interface
- `AimingManager.cs` switches between them based on player preference
- Trajectory visualization using LineRenderer with ballistic math

#### Progression Structure

**Decision: Level-based with star ratings (adapted from research)**

```
Structure:
├─ 6 Worlds (10 levels each = 60 total at launch)
│  ├─ Neon Wasteland (Tutorial + Easy)
│  ├─ Cyber City (Medium)
│  ├─ Retro Ridge (Medium-Hard)
│  ├─ Digital Desert (Hard)
│  ├─ Pixel Paradise (Very Hard)
│  └─ Synthwave Summit (Expert)
└─ Each level:
   ├─ 1-3 star rating based on performance
   ├─ Damage dealt, ammo efficiency, time bonus
   └─ Stars unlock weapons, skins, worlds
```

**Rationale:**
- Research shows star ratings drive replayability
- Clearer progression than endless rounds
- Easier difficulty balancing
- Better onboarding (tutorials in World 1)

**Migration from current:**
- Current "round" system becomes level progression
- Enemy health scaling (from `runState.js`) maps to level difficulty
- Current shop unlocks adapt to star-based gates

#### Unlocks & Economy

**Decision: Dual currency with fair unlock rates**

```
Currency System:
├─ Coins (soft currency)
│  ├─ Earned: damage dealt, level completion, daily rewards
│  ├─ Used for: weapon purchases, continue tokens
│  └─ Exchange rate: balanced for 2-3 levels per weapon unlock
│
└─ Gems (premium currency)
   ├─ Earned: achievements, daily login (small amounts)
   ├─ Purchased: IAP gem packs
   └─ Used for: cosmetic skins, premium weapons, time skips
```

**Weapon Unlock Structure:**
```
Unlock Triggers:
├─ Level completion (basic weapons)
├─ Star collection milestones (advanced weapons)
├─ Achievements (unique/hidden weapons)
├─ Supply drops (random cosmetics + weapon variants)
└─ Premium shop (optional shortcuts, not pay-to-win)
```

**Rationale:**
- Research emphasizes ethical F2P (rewarded ads + fair unlock rates)
- ShellShock Live / Pocket Tanks success = weapon variety
- Avoid pay-to-win (premium weapons balanced, not OP)

#### Monetization Approach

**Decision: Freemium hybrid model**

```
Revenue Streams:
├─ Free Download
│  ├─ Full game playable
│  ├─ Rewarded video ads (opt-in for bonuses)
│  └─ Interstitial ads (between rounds, skippable)
│
├─ Premium Upgrade ($0.99)
│  ├─ Removes ads permanently
│  ├─ Daily gem bonus (10 gems/day)
│  ├─ Exclusive "Premium" tank skin
│  └─ Early access to new weapons/worlds
│
└─ Optional IAPs
   ├─ Gem packs ($1.99-$9.99)
   ├─ Tank skin bundles ($0.99-$2.99)
   └─ Season pass (future expansion)
```

**Rationale:**
- Research shows hybrid models maximize revenue + player satisfaction
- Rewarded ads are player-friendly ($14+ eCPM on iOS)
- Premium upgrade provides clean experience for paying users
- No energy systems or pay-to-win mechanics

---

## 2. Asset Manifest

### 2.1 Visual Assets (from web-reference/assets/images/)

#### Tank Sprites (34 total)
```
Base tank sprite: tank-player.png (reusable for all skins)

Skins by rarity:
├─ Common (6): standard, midnight, tactical-gray, desert-camo, forest-camo, arctic, crimson
├─ Uncommon (8): neon-pink, neon-cyan, digital-camo, sunset-gradient, gold-plated, zebra, tiger, chrome
├─ Rare (8): miami-vice, knight-rider, delorean, outrun, tron-cycle, hotline, cobra-commander
├─ Epic (7): starfield, ghost-protocol, lightning-strike, plasma-core, flame-rider, holographic
└─ Legendary (5): blood-dragon, synthwave-supreme, arcade-champion, terminator, golden-god

Unity Migration:
✅ All PNG sprites can be imported directly
✅ Use Unity Sprite Atlas for batching
✅ Create ScriptableObject per skin with rarity, unlock conditions, price
```

#### UI Elements (11 weapon icons)
```
Weapon icons: weapon-icon-{basic-shot, mirv, roller, digger, heavy-roller, heavy-digger, missile, big-shot, nuke, mini-nuke, deaths-head}.png

Unity Migration:
✅ Import as UI sprites (Sprite Mode: Single)
✅ Reference in weapon ScriptableObjects
✅ Use for shop UI, HUD weapon display
```

#### Supply Drop Assets (13 images)
```
Crate + parachutes by rarity:
├─ crate.png (base)
├─ plane.png, helicopter.png (delivery vehicles)
├─ parachute-{common, uncommon, rare, epic, legendary}.png
└─ banner-{common, uncommon, rare, epic, legendary}.png

Unity Migration:
✅ Import as sprites
✅ Create prefabs for each rarity tier
✅ Use Sprite Renderer + Animator for drop sequence
```

#### Background/Effects (placeholder folders)
```
Current state:
- backgrounds/ (empty, using procedural generation)
- effects/ (empty, using particle systems)

Unity Migration:
✅ Keep procedural approach
✅ Use Unity Particle System for explosions, debris
✅ Use Shader Graph for background gradients
```

### 2.2 Audio Assets (from web-reference/assets/audio/)

#### Music
```
Current: test-loop.wav (172KB, placeholder)

Migration Plan:
🎵 Commission synthwave soundtrack:
  ├─ Menu theme (looping, 2-3 min)
  ├─ Gameplay theme 1-3 (rotating tracks)
  ├─ Boss battle theme (world 6)
  └─ Victory/defeat stingers

Unity Setup:
✅ Import as compressed (Vorbis on mobile)
✅ Use Audio Mixer with Music/SFX groups
✅ Crossfade between tracks (AudioSource.CrossFade)
```

#### Sound Effects
```
Current: test-beep.wav (17KB, placeholder)

Required SFX (from sound.js analysis):
├─ Explosions (small, medium, large, nuclear)
├─ Projectile launches (whoosh variations)
├─ Terrain impact (thud, crash)
├─ UI sounds (button click, purchase, achievement unlock)
├─ Tank damage (metal clang, warning beeps)
├─ Supply drop (plane flyby, crate thud, parachute rustle)
└─ Special weapon effects (MIRV split, roller bounce, digger burrow)

Unity Migration:
✅ Use Unity's AudioSource with spatial blend for 2D (0.0)
✅ Random pitch/volume variation for variety
✅ Audio pooling for frequent sounds (explosions)
```

### 2.3 Other Assets

#### Icons (iOS app icons)
```
Already have: Various sizes from 20x20 to 1024x1024

Unity Migration:
✅ Configure in Unity Player Settings > iOS
✅ Regenerate splash screens with Unity Splash Screen API
```

#### Fonts
```
Current: Using system fonts

Unity Migration:
🆕 Import synthwave-style font (e.g., Orbitron, Audiowide from Google Fonts)
✅ Use TextMeshPro for all UI text
✅ Create TMP Font Asset with SDF shader for crisp scaling
```

---

## 3. Code Portability Matrix

### 3.1 Module Analysis (57 JavaScript files → Unity C# equivalents)

| Module | Lines | Logic Type | Portable? | Unity Equivalent | Effort | Notes |
|--------|-------|------------|-----------|------------------|--------|-------|
| **Core Game Loop** |
| `main.js` | 5427 | Game loop, state machine | ⚠️ Partial | MonoBehaviour + SceneManager | High | Refactor to Unity lifecycle (Update, FixedUpdate) |
| `game.js` | 499 | State management | ✅ Yes | GameManager.cs singleton | Low | FSM logic ports directly |
| `runState.js` | ~300 | Progression tracking | ✅ Yes | ProgressionManager.cs | Low | Pure logic, no rendering |
| **Terrain System** |
| `terrain.js` | 621 | Heightmap data structure | ✅ Yes | Terrain.cs class | Low | Float32Array → float[] |
| - Midpoint displacement | - | Procedural generation | ✅ Yes | TerrainGenerator.cs | Low | Algorithm is pure math |
| - Crater destruction | - | Circular carving | ✅ Yes | TerrainDestruction.cs | Medium | Same logic, Texture2D manipulation |
| - Falling dirt | - | Physics simulation | ✅ Yes | FallingDirtSimulator.cs | Medium | Iterator-based settling |
| `renderer.js` | ~800 | Canvas 2D rendering | ❌ No | TerrainRenderer.cs | High | Rewrite for Unity: Mesh or Texture2D |
| **Tank System** |
| `tank.js` | 906 | Tank data, positioning | ✅ Yes | Tank.cs MonoBehaviour | Medium | Position tracking, health, inventory |
| - Terrain collision | - | Y-position on heightmap | ✅ Yes | Tank.UpdateGroundPosition() | Low | Same heightmap lookup |
| - Fall damage | - | Velocity-based damage | ✅ Yes | Tank.ApplyFallDamage() | Low | Physics.velocity.y check |
| `tank-collection.js` | ~300 | Unlock tracking | ✅ Yes | TankSkinCollection.cs + SO | Low | Data structure ports cleanly |
| **Weapons & Projectiles** |
| `weapons.js` | 366 | Weapon definitions | ✅ Yes | Weapon ScriptableObjects | Low | Perfect use case for SO |
| `projectile.js` | 1071 | Ballistic physics, collision | ✅ Yes | Projectile.cs MonoBehaviour | Medium | Use Rigidbody2D or custom physics |
| - MIRV split logic | - | Timed multi-projectile | ✅ Yes | MirvProjectile.cs : Projectile | Low | Instantiate prefabs on split |
| - Roller physics | - | Ground-following | ⚠️ Partial | RollerProjectile.cs | Medium | May use Unity Physics2D |
| - Digger tunneling | - | Terrain collision override | ✅ Yes | DiggerProjectile.cs | Low | Custom collision detection |
| **Physics** |
| `physics.js` (implicit in projectile) | - | Gravity, wind, ballistics | ✅ Yes | Physics2D or custom | Medium | gravity = 9.81, wind force |
| `wind.js` | ~150 | Wind speed/direction | ✅ Yes | WindManager.cs | Low | Simple RNG + time-based change |
| **AI** |
| `ai.js` | 1528 | Opponent logic (easy/med/hard) | ✅ Yes | AIController.cs | Medium | Decision tree, aiming algorithm |
| - Difficulty levels | - | Accuracy variation | ✅ Yes | AIDifficulty SO | Low | Parameters in ScriptableObjects |
| **UI Systems** |
| `ui.js` | 2290 | HUD rendering (Canvas) | ❌ No | Unity UI Toolkit or Canvas | High | Rebuild with Unity UI |
| `aimingControls.js` | 750 | Slider UI + input | ⚠️ Partial | SliderAiming.cs + UI | Medium | Input logic ports, UI rebuild |
| `touchAiming.js` | ~300 | Touch gesture handling | ⚠️ Partial | SlingshotAiming.cs | Medium | Use Unity Input.touches |
| `shop.js` | 1949 | Shop UI + transactions | ⚠️ Partial | ShopUI.cs + ShopManager | High | UI rebuild, logic ports |
| `pauseMenu.js` | ~400 | Pause overlay | ❌ No | PauseMenu.cs + UI | Medium | Unity UI implementation |
| `victoryDefeat.js` | ~600 | End-round screen | ❌ No | LevelCompleteUI.cs | Medium | Unity UI with star animations |
| **Effects & Polish** |
| `effects.js` | 1616 | Particles, shake, flash | ⚠️ Partial | EffectsManager.cs | High | Use Unity ParticleSystem |
| - Screen shake | - | Camera offset | ✅ Yes | CameraShake.cs | Low | Same math, apply to Camera.transform |
| - Explosion particles | - | Debris spawning | ❌ No | ParticleSystem + prefabs | Medium | Unity particle systems |
| - CRT effects | - | Post-processing | ❌ No | URP post-processing | Low | Use Bloom, scanlines shader |
| `titleScene/titleScene.js` | 23950 (!) | Three.js 3D background | ❌ No | **CRITICAL** SynthwaveGrid.cs | **Very High** | See section 4.1 |
| **Audio** |
| `sound.js` | 2579 | SFX playback + pooling | ⚠️ Partial | AudioManager.cs | Medium | Use AudioSource pooling |
| `music.js` | 816 | Music crossfading | ⚠️ Partial | MusicManager.cs | Medium | AudioSource.CrossFade equivalent |
| `volumeControls.js` | ~300 | Volume sliders | ⚠️ Partial | SettingsUI.cs | Low | UI rebuild, AudioMixer.SetFloat |
| **Progression & Meta** |
| `achievements.js` | 1265 | Achievement system | ✅ Yes | AchievementManager.cs + SO | Medium | Event-driven unlocks |
| `combat-achievements.js` | ~400 | Combat tracking | ✅ Yes | CombatAchievements.cs | Low | Listeners on damage events |
| `weapon-achievements.js` | ~300 | Weapon usage tracking | ✅ Yes | WeaponAchievements.cs | Low | Counter per weapon type |
| `progression-achievements.js` | ~300 | Level/round milestones | ✅ Yes | ProgressionAchievements.cs | Low | Hook into level complete |
| `precision-achievements.js` | ~300 | Accuracy tracking | ✅ Yes | PrecisionAchievements.cs | Low | Calculate shot precision |
| `hidden-achievements.js` | ~200 | Secret unlocks | ✅ Yes | HiddenAchievements.cs | Low | Easter egg conditions |
| `supply-drop.js` | 1906 | Drop spawn logic | ✅ Yes | SupplyDropManager.cs | Medium | Prefab instantiation |
| `supply-drop-screen.js` | 753 | Crate opening UI | ❌ No | SupplyDropUI.cs | Medium | Unity UI with animations |
| `drop-rates.js` | 737 | Rarity RNG | ✅ Yes | DropRates.cs | Low | Pure probability logic |
| `pity-system.js` | ~300 | Guaranteed legendary | ✅ Yes | PitySystem.cs | Low | Counter logic |
| `money.js` | ~200 | Currency tracking | ✅ Yes | CurrencyManager.cs | Low | Coin/gem storage |
| `tokens.js` | ~150 | Continue tokens | ✅ Yes | TokenManager.cs | Low | Simple inventory |
| **Input & Platform** |
| `input.js` | 791 | Mouse/touch abstraction | ⚠️ Partial | Unity Input System | Medium | Use new Input System package |
| `haptics.js` | ~200 | iOS haptic feedback | ✅ Yes | Handheld.Vibrate() | Low | Unity has built-in support |
| `screenSize.js` | ~300 | Responsive scaling | ⚠️ Partial | Camera orthographic size | Low | Unity Canvas scaler |
| `safeArea.js` | ~200 | Notch handling | ✅ Yes | Screen.safeArea in UI | Low | Unity provides API |
| **Backend Integration** |
| `convex-api.js` | ~800 | Leaderboards, cloud save | ⚠️ TBD | GameCenter / PlayFab | High | Replace with native services |
| **Debug & Tools** |
| `debug.js` | ~200 | Debug overlay | ⚠️ Partial | DebugUI.cs | Low | Unity OnGUI or Canvas |
| `debugTools.js` | ~400 | Dev cheats | ✅ Yes | CheatManager.cs | Low | Conditional compilation |
| `performance-tracking.js` | ~300 | FPS monitoring | ❌ No | Unity Profiler | N/A | Use built-in tools |

### 3.2 Portability Summary

**High Confidence (Direct Port):** 28 modules (~60%)
- Pure logic (achievements, progression, currency)
- Data structures (terrain heightmap, weapons)
- Algorithms (terrain generation, AI, ballistics)

**Medium Confidence (Adapt):** 18 modules (~32%)
- Input handling (touch → Unity Input System)
- Physics (use Unity Physics2D or adapt custom)
- Audio (AudioSource instead of Web Audio API)

**Low Confidence (Rewrite):** 11 modules (~8%)
- All rendering code (Canvas 2D → Unity rendering)
- UI systems (rebuild with Unity UI)
- Title screen 3D background (**critical challenge**)

**Total Estimated Effort:**
- **Low effort:** 25 modules (3-8 hours each) = 125-200 hours
- **Medium effort:** 20 modules (8-16 hours each) = 160-320 hours
- **High effort:** 12 modules (16-40 hours each) = 192-480 hours
- **TOTAL:** 477-1000 hours (12-25 weeks for solo dev)

---

## 4. Unity Architecture Blueprint

### 4.1 Scene Organization

```
Scenes/
├── 00_Bootstrap.unity (Persistent managers, init)
├── 01_TitleScreen.unity (Synthwave grid background + main menu)
├── 02_LevelSelect.unity (World map, level grid)
├── 03_Gameplay.unity (Main game loop)
├── 04_Shop.unity (Weapon/skin purchases)
├── 05_Collection.unity (View unlocked tanks/weapons)
└── 06_Settings.unity (Audio, controls, preferences)

SceneManager flow:
Bootstrap → TitleScreen ⇄ LevelSelect → Gameplay → (Victory/Defeat) → LevelSelect
                         ↓
                    Shop / Collection / Settings
```

### 4.2 GameObject Hierarchy (Gameplay Scene)

```
03_Gameplay.unity
├── [PERSISTENT] GameManager (DontDestroyOnLoad from Bootstrap)
│   ├─ ProgressionManager
│   ├─ CurrencyManager
│   ├─ AchievementManager
│   └─ AudioManager
│
├── [SCENE] LevelController
│   ├─ TerrainSystem
│   │  ├─ TerrainRenderer (MeshRenderer with generated mesh)
│   │  ├─ TerrainDestruction (modifies mesh/texture on explosions)
│   │  └─ FallingDirtSimulator (physics settling)
│   │
│   ├─ TankSystem
│   │  ├─ PlayerTank (Tank.cs + input)
│   │  └─ EnemyTank (Tank.cs + AIController.cs)
│   │
│   ├─ WeaponSystem
│   │  ├─ ProjectilePool (object pooling for performance)
│   │  └─ WeaponRegistry (ScriptableObject references)
│   │
│   ├─ EffectsSystem
│   │  ├─ ParticlePool (explosion, debris, smoke particles)
│   │  ├─ CameraShake (applies to Main Camera)
│   │  └─ ScreenFlash (UI overlay for nuke flashes)
│   │
│   └─ WindManager (affects projectile trajectories)
│
├── [RENDERING] Main Camera (Orthographic 2D)
│   ├─ Post-Processing Volume (URP Bloom, Color Grading)
│   └─ CameraShake.cs component
│
├── [UI] GameplayCanvas (Screen Space - Overlay)
│   ├─ HUD (health bars, ammo, wind indicator)
│   ├─ AimingControls (sliders or slingshot visual)
│   ├─ TrajectoryPreview (LineRenderer or UI line)
│   └─ PauseButton
│
└── [BACKGROUND] SynthwaveBackground (Quad with scrolling shader or particle system)
```

### 4.3 Key C# Classes

#### Core Singletons
```csharp
// Persistent across scenes (DontDestroyOnLoad)
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }
    public ProgressionManager Progression { get; private set; }
    public CurrencyManager Currency { get; private set; }
    public AchievementManager Achievements { get; private set; }
    public AudioManager Audio { get; private set; }
    // ...
}

// Per-scene controller
public class LevelController : MonoBehaviour
{
    public TerrainSystem Terrain { get; private set; }
    public TankSystem Tanks { get; private set; }
    public WeaponSystem Weapons { get; private set; }
    public WindManager Wind { get; private set; }

    private void Start()
    {
        InitializeLevel(GameManager.Instance.Progression.CurrentLevel);
    }
}
```

#### Terrain System
```csharp
// Core data structure (ports directly from terrain.js)
public class Terrain
{
    private float[] heightmap; // Ports from Float32Array
    public int Width { get; private set; }
    public int ScreenHeight { get; private set; }

    public float GetHeight(int x) { /* ... */ }
    public void SetHeight(int x, float y) { /* ... */ }
    public void DestroyTerrain(Vector2 center, float radius) { /* Crater algorithm */ }
    public void ApplyFallingDirt(Vector2 center, float radius) { /* Settling physics */ }
}

// Rendering (Unity-specific)
public class TerrainRenderer : MonoBehaviour
{
    private Terrain terrain;
    private Mesh terrainMesh;
    private MeshFilter meshFilter;
    private MeshRenderer meshRenderer;

    public void Initialize(Terrain terrain)
    {
        this.terrain = terrain;
        GenerateMesh();
    }

    private void GenerateMesh()
    {
        // Create mesh from heightmap data
        // Use triangles to form terrain surface
        // Apply synthwave gradient material
    }

    public void UpdateMesh()
    {
        // Called after terrain destruction
        // Update vertex positions from heightmap
    }
}

// Destruction (Unity-specific)
public class TerrainDestruction : MonoBehaviour
{
    public void CreateCrater(Vector2 explosionPos, float radius, bool isNuclear)
    {
        // Call terrain.DestroyTerrain()
        // Spawn particles
        // Update renderer mesh
        // Apply falling dirt
    }
}
```

#### Tank System
```csharp
public class Tank : MonoBehaviour
{
    [SerializeField] private TankStats baseStats; // ScriptableObject

    public float Health { get; private set; }
    public float MaxHealth => baseStats.maxHealth;
    public Inventory Inventory { get; private set; }
    public TankSkin CurrentSkin { get; private set; }

    private Rigidbody2D rb;
    private Terrain terrain;
    private bool isFalling;
    private float fallStartY;

    public void TakeDamage(float amount, DamageSource source)
    {
        Health -= amount;
        // Trigger hit animation
        // Play damage sound
        if (Health <= 0) Die();
    }

    private void FixedUpdate()
    {
        UpdateGroundPosition(); // Snap to terrain heightmap
        CheckFallDamage();      // Apply velocity-based damage
    }

    private void UpdateGroundPosition()
    {
        float groundY = terrain.GetHeight((int)transform.position.x);
        float targetY = groundY; // Convert to world space

        if (transform.position.y > targetY + 1f)
            isFalling = true;
        else
        {
            transform.position = new Vector2(transform.position.x, targetY);
            rb.velocity = Vector2.zero;
            if (isFalling) CheckFallDamage();
            isFalling = false;
        }
    }
}

// Tank inventory (weapon ammo, continue tokens)
public class Inventory
{
    private Dictionary<WeaponType, int> ammo = new Dictionary<WeaponType, int>();
    public int ContinueTokens { get; set; }

    public bool HasAmmo(WeaponType weapon) => ammo.GetValueOrDefault(weapon, 0) > 0;
    public void UseAmmo(WeaponType weapon) { if (HasAmmo(weapon)) ammo[weapon]--; }
    public void AddAmmo(WeaponType weapon, int count) { /* ... */ }
}
```

#### Weapon System (ScriptableObject-driven)
```csharp
[CreateAssetMenu(fileName = "Weapon", menuName = "ScorchedEarth/Weapon")]
public class WeaponData : ScriptableObject
{
    public string weaponName;
    public WeaponType weaponType;
    public Sprite icon;
    public GameObject projectilePrefab;

    [Header("Damage")]
    public float baseDamage;
    public float blastRadius;

    [Header("Unlock")]
    public int unlockLevel;
    public int starRequirement;
    public int coinCost;
    public int gemCost;

    [Header("Gameplay")]
    public int maxAmmo; // -1 = unlimited (basic shot)
    public bool isNuclear; // Triggers special effects
}

public enum WeaponType
{
    BasicShot,   // Unlimited ammo
    MIRV,        // Splits into 5 bomblets
    Roller,      // Rolls along terrain
    Digger,      // Tunnels through terrain
    HeavyRoller, // Bigger roller
    HeavyDigger, // Bigger digger
    Missile,     // Fast, medium blast
    BigShot,     // Large blast radius
    MiniNuke,    // Small nuke
    Nuke,        // Large nuke
    DeathsHead   // Massive damage
}
```

#### Projectile System
```csharp
public abstract class Projectile : MonoBehaviour
{
    protected WeaponData weaponData;
    protected Tank firedBy;
    protected Rigidbody2D rb;
    protected TrailRenderer trail;

    public virtual void Initialize(WeaponData weapon, Tank owner, Vector2 velocity)
    {
        this.weaponData = weapon;
        this.firedBy = owner;
        rb.velocity = velocity;
    }

    protected virtual void FixedUpdate()
    {
        ApplyWind();
        CheckCollisions();
    }

    protected virtual void ApplyWind()
    {
        Vector2 windForce = WindManager.Instance.GetWindForce() * Time.fixedDeltaTime;
        rb.velocity += windForce;
    }

    protected abstract void CheckCollisions();
    protected abstract void OnImpact(Vector2 impactPoint);
}

// Example: MIRV projectile
public class MirvProjectile : Projectile
{
    [SerializeField] private float splitTime = 2f;
    [SerializeField] private GameObject bombletPrefab;
    [SerializeField] private int bombletCount = 5;

    private float launchTime;
    private bool hasSplit;

    public override void Initialize(WeaponData weapon, Tank owner, Vector2 velocity)
    {
        base.Initialize(weapon, owner, velocity);
        launchTime = Time.time;
    }

    protected override void FixedUpdate()
    {
        base.FixedUpdate();

        if (!hasSplit && Time.time - launchTime >= splitTime)
        {
            Split();
        }
    }

    private void Split()
    {
        hasSplit = true;

        // Spawn bomblets in spread pattern
        for (int i = 0; i < bombletCount; i++)
        {
            float angle = -90 + (i - bombletCount / 2f) * 15f; // Spread
            Vector2 velocity = Quaternion.Euler(0, 0, angle) * Vector2.down * 10f;

            GameObject bomblet = Instantiate(bombletPrefab, transform.position, Quaternion.identity);
            bomblet.GetComponent<Projectile>().Initialize(weaponData, firedBy, velocity);
        }

        // Visual split effect
        EffectsManager.Instance.PlaySplitEffect(transform.position);

        // Destroy parent projectile
        Destroy(gameObject);
    }

    protected override void OnImpact(Vector2 impactPoint)
    {
        // Bomblets explode normally
        EffectsManager.Instance.CreateExplosion(impactPoint, weaponData.blastRadius, weaponData.baseDamage);
        Destroy(gameObject);
    }
}
```

#### AI System
```csharp
[CreateAssetMenu(fileName = "AIDifficulty", menuName = "ScorchedEarth/AIDifficulty")]
public class AIDifficulty : ScriptableObject
{
    public string difficultyName;
    public float aimAccuracy; // 0.0-1.0 (how close to perfect aim)
    public float thinkTime;   // Delay before firing
    public bool useAdvancedWeapons; // Can use MIRV, nukes, etc.
}

public class AIController : MonoBehaviour
{
    [SerializeField] private AIDifficulty difficulty;
    private Tank aiTank;
    private Tank playerTank;

    public void TakeTurn()
    {
        StartCoroutine(ThinkAndFire());
    }

    private IEnumerator ThinkAndFire()
    {
        // Simulate "thinking" delay
        yield return new WaitForSeconds(difficulty.thinkTime);

        // Calculate perfect shot
        Vector2 targetPos = playerTank.transform.position;
        float distance = Vector2.Distance(aiTank.transform.position, targetPos);

        // Calculate trajectory (ballistics math)
        (float angle, float power) = CalculatePerfectShot(targetPos, distance);

        // Add inaccuracy based on difficulty
        angle += Random.Range(-5f, 5f) * (1f - difficulty.aimAccuracy);
        power += Random.Range(-10f, 10f) * (1f - difficulty.aimAccuracy);

        // Choose weapon
        WeaponType weapon = ChooseWeapon();

        // Fire
        aiTank.FireWeapon(weapon, angle, power);
    }

    private (float, float) CalculatePerfectShot(Vector2 target, float distance)
    {
        // Ballistics math (ports from ai.js)
        // Returns (angle in degrees, power 0-100)
        // Accounts for wind, terrain obstacles

        // Simplified example:
        float gravity = 9.81f;
        float desiredAngle = 45f; // Optimal for distance
        float requiredVelocity = Mathf.Sqrt((distance * gravity) / Mathf.Sin(2 * desiredAngle * Mathf.Deg2Rad));
        float power = (requiredVelocity / 50f) * 100f; // Scale to 0-100

        return (desiredAngle, Mathf.Clamp(power, 0f, 100f));
    }
}
```

### 4.4 ScriptableObject Structure

```
Assets/
├── Data/
│   ├── Weapons/
│   │   ├── BasicShot.asset
│   │   ├── MIRV.asset
│   │   ├── Roller.asset
│   │   └── ... (40 total weapons)
│   │
│   ├── Tanks/
│   │   ├── Stats/
│   │   │   ├── PlayerTankStats.asset
│   │   │   └── EnemyTankStats.asset
│   │   └── Skins/
│   │       ├── Common_Standard.asset
│   │       ├── Legendary_BloodDragon.asset
│   │       └── ... (34 total skins)
│   │
│   ├── Levels/
│   │   ├── World1_Neon_Wasteland/
│   │   │   ├── Level_1_1.asset (tutorial)
│   │   │   ├── Level_1_2.asset
│   │   │   └── ... (10 levels)
│   │   └── ... (6 worlds)
│   │
│   ├── AI/
│   │   ├── Easy.asset
│   │   ├── Medium.asset
│   │   └── Hard.asset
│   │
│   └── Achievements/
│       ├── Combat/
│       ├── Precision/
│       ├── Weapon/
│       ├── Progression/
│       └── Hidden/
```

---

## 5. Technical Specifications

### 5.1 Terrain System (Critical Migration)

#### Current Implementation (terrain.js)
```javascript
// Heightmap: Float32Array where heightmap[x] = y-coordinate from bottom
class Terrain {
    constructor(width, height) {
        this.heightmap = new Float32Array(width);
    }

    destroyTerrain(x, y, radius) {
        // Circular crater using: r² = dx² + dy²
        // For each x-column in blast radius:
        //   - Calculate vertical extent: dy = sqrt(r² - dx²)
        //   - Lower terrain to crater bottom
    }

    applyFallingDirt(centerX, radius) {
        // Detect "floating" terrain (significantly higher than neighbors)
        // Settle iteratively until stable
    }
}

// Generation: Midpoint displacement algorithm
function generateTerrain(width, height, roughness) {
    // Recursive subdivision with diminishing displacement
}
```

#### Unity Implementation

**Option 1: Mesh-based (Recommended for Performance)**
```csharp
public class TerrainRenderer : MonoBehaviour
{
    private Mesh terrainMesh;
    private float[] heightmap;
    private int width;

    public void GenerateMesh()
    {
        Vector3[] vertices = new Vector3[width * 2]; // Top and bottom rows
        int[] triangles = new int[(width - 1) * 6];  // 2 triangles per column
        Vector2[] uvs = new Vector2[width * 2];
        Color[] colors = new Color[width * 2];

        // Build vertices from heightmap
        for (int x = 0; x < width; x++)
        {
            float height = heightmap[x];

            // Top vertex (terrain surface)
            vertices[x * 2] = new Vector3(x, height, 0);
            colors[x * 2] = GetTerrainColor(x, height); // Synthwave gradient

            // Bottom vertex (screen bottom)
            vertices[x * 2 + 1] = new Vector3(x, 0, 0);
            colors[x * 2 + 1] = Color.black;

            uvs[x * 2] = new Vector2((float)x / width, 1f);
            uvs[x * 2 + 1] = new Vector2((float)x / width, 0f);
        }

        // Build triangles (quad per column)
        for (int x = 0; x < width - 1; x++)
        {
            int baseIndex = x * 6;
            int vertexIndex = x * 2;

            // First triangle
            triangles[baseIndex] = vertexIndex;
            triangles[baseIndex + 1] = vertexIndex + 2;
            triangles[baseIndex + 2] = vertexIndex + 1;

            // Second triangle
            triangles[baseIndex + 3] = vertexIndex + 1;
            triangles[baseIndex + 4] = vertexIndex + 2;
            triangles[baseIndex + 5] = vertexIndex + 3;
        }

        terrainMesh.vertices = vertices;
        terrainMesh.triangles = triangles;
        terrainMesh.uv = uvs;
        terrainMesh.colors = colors;
        terrainMesh.RecalculateNormals();
    }

    private Color GetTerrainColor(int x, float height)
    {
        // Synthwave gradient: pink at peaks, cyan at valleys
        float t = height / screenHeight;
        return Color.Lerp(
            new Color(0f, 1f, 1f), // Cyan (#00FFFF)
            new Color(1f, 0.08f, 0.58f), // Hot pink (#FF1493)
            t
        );
    }

    public void UpdateMesh()
    {
        // Called after terrain destruction
        // Only update vertex positions (faster than full regeneration)
        Vector3[] vertices = terrainMesh.vertices;
        for (int x = 0; x < width; x++)
        {
            vertices[x * 2].y = heightmap[x];
        }
        terrainMesh.vertices = vertices;
        terrainMesh.RecalculateBounds();
    }
}
```

**Option 2: Texture-based (Alternative, Simpler but Slower)**
```csharp
// Render terrain as Texture2D, modify pixels for destruction
// Easier to implement, but slower updates
// Use for prototyping, switch to mesh later
```

#### Destruction Algorithm (Direct Port)
```csharp
public void DestroyTerrain(Vector2 explosionPos, float radius)
{
    float explosionHeight = screenHeight - explosionPos.y;

    int minX = Mathf.Max(0, Mathf.FloorToInt(explosionPos.x - radius));
    int maxX = Mathf.Min(width - 1, Mathf.CeilToInt(explosionPos.x + radius));

    for (int x = minX; x <= maxX; x++)
    {
        float dx = x - explosionPos.x;
        if (Mathf.Abs(dx) > radius) continue;

        // Circle equation: r² = dx² + dy²
        float verticalExtent = Mathf.Sqrt(radius * radius - dx * dx);
        float craterBottom = explosionHeight - verticalExtent;

        float currentHeight = heightmap[x];
        if (craterBottom < currentHeight)
        {
            heightmap[x] = Mathf.Max(0, craterBottom);
        }
    }

    terrainRenderer.UpdateMesh(); // Refresh visuals
    ApplyFallingDirt(explosionPos.x, radius); // Settling physics
}
```

#### Falling Dirt Physics (Direct Port)
```csharp
public void ApplyFallingDirt(float centerX, float radius)
{
    const float NEIGHBOR_RADIUS = 3;
    const float HEIGHT_THRESHOLD = 10f;
    const int MAX_ITERATIONS = 5;

    int minX = Mathf.Max(0, (int)(centerX - radius - NEIGHBOR_RADIUS * 2));
    int maxX = Mathf.Min(width - 1, (int)(centerX + radius + NEIGHBOR_RADIUS * 2));

    bool hasChanges = true;
    int iterations = 0;

    while (hasChanges && iterations < MAX_ITERATIONS)
    {
        hasChanges = false;
        iterations++;

        for (int x = minX; x <= maxX; x++)
        {
            float currentHeight = heightmap[x];
            if (currentHeight <= 0) continue;

            float avgHeight = GetAverageNeighborHeight(x, NEIGHBOR_RADIUS);
            float heightDiff = currentHeight - avgHeight;

            if (heightDiff > HEIGHT_THRESHOLD)
            {
                float targetHeight = avgHeight + HEIGHT_THRESHOLD * 0.5f;
                heightmap[x] = targetHeight;
                hasChanges = true;
            }
        }
    }

    if (iterations > 0)
        terrainRenderer.UpdateMesh();
}
```

### 5.2 Physics System

#### Ballistics (Custom or Unity Physics2D)

**Option A: Custom Ballistics (Full Control)**
```csharp
public class BallisticProjectile : MonoBehaviour
{
    private Vector2 velocity;
    private const float GRAVITY = 9.81f;

    private void FixedUpdate()
    {
        // Apply gravity
        velocity.y -= GRAVITY * Time.fixedDeltaTime;

        // Apply wind
        velocity += WindManager.Instance.GetWindForce() * Time.fixedDeltaTime;

        // Move
        transform.position += (Vector3)velocity * Time.fixedDeltaTime;

        // Check collision
        CheckTerrainCollision();
    }
}
```

**Option B: Unity Rigidbody2D (Simpler, Less Control)**
```csharp
public class PhysicsProjectile : MonoBehaviour
{
    private Rigidbody2D rb;

    public void Launch(float angle, float power)
    {
        rb.gravityScale = 1f; // Unity's gravity is 9.81 by default
        Vector2 direction = Quaternion.Euler(0, 0, angle) * Vector2.right;
        rb.velocity = direction * (power / 100f * 50f); // Scale power to velocity
    }

    private void FixedUpdate()
    {
        // Apply wind
        rb.AddForce(WindManager.Instance.GetWindForce(), ForceMode2D.Force);
    }
}
```

**Recommendation:** Option A (custom ballistics) for exact match to web version behavior.

#### Wind System
```csharp
public class WindManager : MonoBehaviour
{
    public static WindManager Instance { get; private set; }

    [SerializeField] private float minWindSpeed = -5f;
    [SerializeField] private float maxWindSpeed = 5f;
    [SerializeField] private float changeInterval = 5f;

    public float CurrentWindSpeed { get; private set; }
    private float nextChangeTime;

    private void Update()
    {
        if (Time.time >= nextChangeTime)
        {
            CurrentWindSpeed = Random.Range(minWindSpeed, maxWindSpeed);
            nextChangeTime = Time.time + changeInterval;
        }
    }

    public Vector2 GetWindForce()
    {
        return new Vector2(CurrentWindSpeed, 0f);
    }
}
```

### 5.3 Rendering & Visual Effects

#### Synthwave Color Palette
```csharp
public static class SynthwaveColors
{
    public static readonly Color HotPink = new Color(1f, 0.08f, 0.58f);    // #FF1493
    public static readonly Color Cyan = new Color(0f, 1f, 1f);              // #00FFFF
    public static readonly Color Purple = new Color(0.58f, 0f, 0.83f);     // #9400D3
    public static readonly Color Orange = new Color(1f, 0.4f, 0f);          // #FF6600
    public static readonly Color Yellow = new Color(1f, 1f, 0f);            // #FFFF00
    public static readonly Color DeepPurple = new Color(0.008f, 0f, 0.03f); // #020008
}
```

#### Post-Processing (URP)
```csharp
// Use Unity's Universal Render Pipeline
// Configure Volume Profile:

Bloom:
├─ Intensity: 1.3 (strong glow on neon elements)
├─ Threshold: 0.0 (glow everything bright)
├─ Scatter: 0.7 (diffuse glow)
└─ Clamp: 65472 (no limit)

Color Grading:
├─ Saturation: +20 (vibrant synthwave colors)
├─ Contrast: +10 (punchy blacks)
└─ Lift: Slight purple tint in shadows

Vignette:
├─ Intensity: 0.3 (subtle darkening at edges)
└─ Color: Deep purple (#020008)

(Optional) Scanlines:
└─ Custom shader for CRT effect (togglable in settings)
```

#### Particle Systems

**Explosion Particles:**
```csharp
ParticleSystem explosion:
├─ Shape: Sphere, radius = blast radius
├─ Start Color: Gradient (yellow → orange → pink)
├─ Start Speed: 10-20 (outward burst)
├─ Start Size: 0.5-2.0
├─ Lifetime: 0.5-1.5s
├─ Emission: 50-200 particles (burst)
├─ Color Over Lifetime: Fade to transparent
└─ Size Over Lifetime: Shrink to 0

ParticleSystem debris:
├─ Shape: Sphere
├─ Start Color: Terrain color (pink/cyan gradient)
├─ Gravity Modifier: 1.0 (falls naturally)
├─ Collision: Enable (bounces off terrain)
└─ Sub Emitter: Dust trail on collision
```

**Nuclear Explosion (Special Case):**
```csharp
ParticleSystem nuke:
├─ Mushroom cloud (2-stage particle emission)
│  ├─ Stage 1: Fireball (orange/yellow, expands rapidly)
│  └─ Stage 2: Smoke column (gray/black, rises slowly)
├─ Shockwave ring (expanding circle sprite)
└─ Screen flash (white overlay, fade out over 1s)
```

### 5.4 Audio System

#### Architecture
```csharp
public class AudioManager : MonoBehaviour
{
    [SerializeField] private AudioMixer mixer;

    // Music
    private AudioSource musicSource1;
    private AudioSource musicSource2;
    private AudioSource currentMusic;

    // SFX
    private ObjectPool<AudioSource> sfxPool;

    public void PlayMusic(AudioClip clip, float fadeTime = 1f)
    {
        // Crossfade between sources for smooth transitions
        AudioSource nextSource = (currentMusic == musicSource1) ? musicSource2 : musicSource1;
        StartCoroutine(CrossfadeMusic(currentMusic, nextSource, clip, fadeTime));
    }

    public void PlaySFX(AudioClip clip, float volume = 1f, float pitch = 1f)
    {
        AudioSource source = sfxPool.Get();
        source.clip = clip;
        source.volume = volume;
        source.pitch = Random.Range(pitch * 0.9f, pitch * 1.1f); // Variation
        source.Play();

        StartCoroutine(ReturnToPool(source, clip.length));
    }

    private IEnumerator CrossfadeMusic(AudioSource from, AudioSource to, AudioClip clip, float fadeTime)
    {
        to.clip = clip;
        to.volume = 0f;
        to.Play();

        float elapsed = 0f;
        while (elapsed < fadeTime)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / fadeTime;

            from.volume = Mathf.Lerp(1f, 0f, t);
            to.volume = Mathf.Lerp(0f, 1f, t);

            yield return null;
        }

        from.Stop();
        currentMusic = to;
    }
}
```

#### Audio Mixer Setup
```
Mixer Groups:
├─ Master
│  ├─ Music (-10dB)
│  │  └─ Exposed parameter: "MusicVolume"
│  └─ SFX (-5dB)
│     ├─ Explosions (-3dB)
│     ├─ UI (0dB)
│     └─ Exposed parameter: "SFXVolume"
```

---

## 6. Critical Feature: Animated Title Screen

### 6.1 Current Implementation (titleScene.js - 23,950 lines!)

**Technology:** Three.js (WebGL 3D library)

**What it does:**
1. Infinite scrolling synthwave grid (Tron-style)
2. Procedural mountain ridges (Simplex noise)
3. Gradient sunset sky (orange → pink)
4. Bloom post-processing (neon glow)
5. Perspective camera with forward motion

**Key components:**
```javascript
// Grid: 18 chunks of wireframe geometry, scrolling forward
// Mountains: Perlin noise heightmap on sides
// Sun: Gradient shader (orange top, pink bottom)
// Animation: Move camera forward, recycle chunks behind
// Post: EffectComposer with UnrealBloomPass
```

### 6.2 Unity Migration Strategy

**Option 1: Shader-based (Recommended - Lightweight)**

Create a custom shader that renders the synthwave grid as a 2D effect:

```csharp
// SynthwaveGridBackground.cs
public class SynthwaveGridBackground : MonoBehaviour
{
    [SerializeField] private Material gridMaterial; // Uses custom shader
    [SerializeField] private float scrollSpeed = 40f;

    private void Update()
    {
        // Scroll UV offset to simulate forward motion
        float offset = Time.time * scrollSpeed * 0.01f;
        gridMaterial.SetFloat("_ScrollOffset", offset);
    }
}
```

**Custom Shader Graph (or HLSL):**
```hlsl
Shader "Custom/SynthwaveGrid"
{
    Properties
    {
        _GridColor ("Grid Color", Color) = (1, 0, 1, 1)
        _SkyColor ("Sky Color", Color) = (0.008, 0, 0.03, 1)
        _SunColorTop ("Sun Top", Color) = (1, 0.67, 0, 1)
        _SunColorBottom ("Sun Bottom", Color) = (1, 0, 0.4, 1)
        _ScrollOffset ("Scroll Offset", Float) = 0
        _GridDensity ("Grid Density", Float) = 20
        _PerspectiveScale ("Perspective Scale", Float) = 2
    }

    SubShader
    {
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            float4 _GridColor, _SkyColor, _SunColorTop, _SunColorBottom;
            float _ScrollOffset, _GridDensity, _PerspectiveScale;

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            float4 frag (v2f i) : SV_Target
            {
                float2 uv = i.uv;

                // Sky gradient
                float4 skyColor = lerp(_SkyColor, _SunColorBottom, uv.y * 0.3);

                // Sun (circular gradient in upper half)
                float sunDist = distance(uv, float2(0.5, 0.8));
                float sun = smoothstep(0.3, 0.1, sunDist);
                float4 sunColor = lerp(_SunColorBottom, _SunColorTop, sun);
                skyColor = lerp(skyColor, sunColor, sun);

                // Grid (perspective-scaled)
                float perspective = pow(1.0 - uv.y, _PerspectiveScale); // More compressed at horizon
                float2 gridUV = float2(uv.x, uv.y + _ScrollOffset);
                gridUV.y *= perspective;

                // Grid lines (modulo creates repeating pattern)
                float gridX = frac(gridUV.x * _GridDensity);
                float gridY = frac(gridUV.y * _GridDensity);

                float lineThickness = 0.05;
                float gridMask = step(1.0 - lineThickness, gridX) + step(1.0 - lineThickness, gridY);
                gridMask = saturate(gridMask);

                // Fade grid at horizon
                float fadeFactor = smoothstep(0.0, 0.5, uv.y);
                gridMask *= fadeFactor;

                // Combine
                float4 color = lerp(skyColor, _GridColor, gridMask);

                return color;
            }
            ENDCG
        }
    }
}
```

**Pros:**
- ✅ Lightweight (single quad, runs on shader)
- ✅ 60 FPS on mobile guaranteed
- ✅ Easy to customize colors/speed
- ✅ No mesh complexity

**Cons:**
- ⚠️ Less 3D depth than original
- ⚠️ Mountains require extra work (can be faked with sprite overlays)

---

**Option 2: Unity Particle System (Alternative)**

Use particle system to simulate grid lines:

```csharp
ParticleSystem gridLines:
├─ Shape: Box (wide, extends into distance)
├─ Start Color: Magenta glow
├─ Start Size: Line renderer (thin rectangles)
├─ Velocity: Move toward camera (simulate forward motion)
├─ Looping: Recycle particles when they reach camera
└─ Emission: Constant stream
```

**Pros:**
- ✅ True 3D depth
- ✅ Can add mountain particles easily

**Cons:**
- ⚠️ Higher performance cost (mobile may struggle)
- ⚠️ More complex to set up

---

**Option 3: Actual 3D Mesh (Exact Port)**

Recreate the Three.js scene 1:1 in Unity:

```csharp
public class SynthwaveGrid3D : MonoBehaviour
{
    private List<GridChunk> chunks = new List<GridChunk>();

    [SerializeField] private int chunkCount = 18;
    [SerializeField] private float chunkSize = 60f;
    [SerializeField] private float scrollSpeed = 40f;

    private void Start()
    {
        for (int i = 0; i < chunkCount; i++)
        {
            GridChunk chunk = CreateChunk(i * chunkSize);
            chunks.Add(chunk);
        }
    }

    private GridChunk CreateChunk(float zPosition)
    {
        GameObject chunkObj = new GameObject("GridChunk");
        MeshFilter mf = chunkObj.AddComponent<MeshFilter>();
        MeshRenderer mr = chunkObj.AddComponent<MeshRenderer>();

        // Generate wireframe grid mesh
        Mesh mesh = GenerateGridMesh();
        mf.mesh = mesh;
        mr.material = gridMaterial; // Emissive magenta material

        chunkObj.transform.position = new Vector3(0, 0, zPosition);

        return new GridChunk { gameObject = chunkObj, zPosition = zPosition };
    }

    private void Update()
    {
        float deltaZ = scrollSpeed * Time.deltaTime;

        foreach (var chunk in chunks)
        {
            chunk.gameObject.transform.position += Vector3.back * deltaZ;

            // Recycle chunks that passed the camera
            if (chunk.gameObject.transform.position.z < -chunkSize)
            {
                float maxZ = chunks.Max(c => c.gameObject.transform.position.z);
                chunk.gameObject.transform.position = new Vector3(0, 0, maxZ + chunkSize);
            }
        }
    }
}
```

**Pros:**
- ✅ Exact match to original visual
- ✅ True 3D perspective depth
- ✅ Can add mountains, sun exactly as designed

**Cons:**
- ⚠️ **Very High** implementation effort (2-3 days)
- ⚠️ Performance cost on mobile (may need LOD)
- ⚠️ Requires 3D camera setup (rest of game is 2D)

---

### 6.3 Recommendation

**Phase 1 (MVP):** Option 1 (Shader-based)
- Fastest to implement (4-6 hours)
- Captures 80% of the visual appeal
- Guaranteed 60 FPS on all platforms
- Can enhance later if needed

**Phase 2 (Polish):** Add particle effects on top
- Glow particles rising from grid
- Shooting stars in background
- Heat wave distortion shader

**Future (If Time):** Option 3 (Full 3D)
- Post-launch update
- "Enhanced Graphics" setting for powerful devices

---

## 7. Unity Package Recommendations

### 7.1 Essential Packages (Must-Have)

```
From Unity Registry (free):
├─ Universal RP (URP) - Modern 2D rendering pipeline
├─ 2D Sprite - Sprite tools and atlas
├─ TextMeshPro - High-quality text rendering
├─ Input System - New input handling (touch, gamepad, keyboard)
├─ Cinemachine - Camera control and shake
└─ Addressables - Asset management (future: live ops)
```

### 7.2 Recommended Asset Store Packages

**1. 2D Destructible Terrain ([$20-40](https://assetstore.unity.com))**
- If mesh-based terrain proves too complex
- Pre-built pixel-perfect destruction
- Examples: "Destructible 2D", "Terrain2D"

**Alternative:** Build custom (recommended for learning)

**2. Shader Graph Nodes (Free)**
- "Shader Graph Essentials" (Unity)
- Extra nodes for synthwave effects (glow, gradients)

**3. DOTween (Free / $15 Pro)**
- Smooth UI animations
- Essential for menu transitions, shop, level select
- Example: `transform.DOScale(1.2f, 0.3f).SetEase(Ease.OutBack);`

**4. Odin Inspector ($55 - Optional)**
- Better Unity Inspector
- Makes ScriptableObject editing easier
- Quality of life for data entry (weapons, levels)

**5. Rewarded Ads Plugin**
- Unity Ads (free, official)
- AdMob (Google, free)
- Integrate both for fill-rate optimization

### 7.3 Audio Tools

**Synthwave Music Sources:**
- Commission from Fiverr/Upwork ($100-300 for 5 tracks)
- Royalty-free: Epidemic Sound, Artlist
- Asset Store: "Synthwave Music Pack" ($15-30)

**SFX Generation:**
- **Bfxr** (free, browser-based) - 8-bit SFX
- **SFXR** (free) - Retro game sounds
- **Freesound.org** - Creative Commons library
- Asset Store: "Sci-Fi SFX Pack" ($10-20)

### 7.4 Development Tools

**Unity Profiler** (built-in)
- Performance monitoring
- Identify bottlenecks (terrain updates, particles)

**Unity Cloud Build** (free tier)
- Automated iOS builds
- TestFlight deployment

**Unity Analytics** (free)
- Player behavior tracking
- Funnel analysis (tutorial completion, level progression)

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Terrain destruction performance on iOS** | High | Medium | Use mesh-based rendering (not texture manipulation), limit particle count, profile early |
| **Title screen 3D complexity** | Medium | High | Start with shader approach (Option 1), upgrade later if needed |
| **Exact visual feel mismatch** | Medium | Medium | Iterate on shaders/post-processing, A/B test with original |
| **Unity learning curve** | Low | High | Follow tutorials, use Asset Store packages, ask community |
| **Touch controls feel** | Medium | Low | Implement slingshot AND sliders, let players choose |
| **Ad integration breaking gameplay** | Low | Low | Use rewarded video only, no forced interstitials during rounds |

### 8.2 Content Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **60 levels is too much for launch** | Medium | Low | Start with 30 levels (5 worlds x 6), expand post-launch |
| **AI too easy/hard** | Medium | Medium | Extensive playtesting, difficulty curve tuning, adaptive difficulty |
| **Weapon balance issues** | Low | High | Copy existing weapon balance, tweak based on analytics |
| **Not enough content vs competitors** | High | Low | 40 weapons at launch > Angry Birds (5 birds), focus on variety |

### 8.3 Business Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Freemium model fails** | Medium | Low | Research shows hybrid F2P works, have premium upgrade fallback |
| **App Store rejection** | Low | Low | Follow guidelines, avoid pay-to-win, clear IAP descriptions |
| **Low retention** | High | Medium | Daily rewards, achievements, level variety, juice/polish |
| **Market saturation (artillery games)** | Medium | High | Synthwave aesthetic differentiates, no other neon artillery game |

---

## 9. Migration Sequence (Recommended Order)

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core gameplay loop works

```
1.1 Unity Project Setup
├─ Create 2D URP project in Unity 6
├─ Configure build settings (iOS, macOS)
├─ Import essential packages (URP, TextMeshPro, Input System)
└─ Set up version control (Git LFS for binaries)

1.2 Terrain System
├─ Implement Terrain.cs (heightmap data structure)
├─ Port midpoint displacement algorithm
├─ Create TerrainRenderer (mesh-based)
├─ Implement DestroyTerrain (crater algorithm)
└─ Implement ApplyFallingDirt (settling physics)

1.3 Basic Physics
├─ Projectile.cs with custom ballistics
├─ WindManager.cs
├─ Collision detection (terrain + tanks)
└─ Gravity and trajectory math

1.4 Tank Basics
├─ Tank.cs (health, position, inventory)
├─ Place tanks on terrain
├─ Fall damage implementation
└─ Basic sprite rendering
```

**Acceptance Criteria:**
- ✅ Terrain generates procedurally
- ✅ Terrain destructs with circular craters
- ✅ Projectile arc looks correct with gravity + wind
- ✅ Tanks sit on terrain surface
- ✅ Tanks take damage and die

---

### Phase 2: Core Gameplay (Weeks 3-4)

**Goal:** Playable game loop

```
2.1 Weapon System
├─ WeaponData ScriptableObjects (11 weapon types)
├─ Basic projectile types (shot, MIRV, roller, digger)
├─ Explosion effects (particles, camera shake)
└─ Damage calculation system

2.2 AI
├─ AIDifficulty ScriptableObjects (easy, medium, hard)
├─ AIController.cs (aiming algorithm)
├─ Turn-based state machine
└─ AI weapon selection logic

2.3 Input
├─ SliderAiming.cs (angle/power controls)
├─ Touch input handling
├─ Trajectory preview (LineRenderer)
└─ Fire button

2.4 Game Loop
├─ GameManager singleton
├─ Turn sequence (player → AI → repeat)
├─ Win/lose conditions
└─ Round restart
```

**Acceptance Criteria:**
- ✅ Player can aim and fire basic shot
- ✅ AI opponent fires back intelligently
- ✅ MIRV splits into bomblets
- ✅ Explosions destroy terrain and damage tanks
- ✅ Game ends when tank dies

---

### Phase 3: Visual Polish (Weeks 5-6)

**Goal:** Synthwave aesthetic complete

```
3.1 Post-Processing
├─ URP Volume Profile (Bloom, Color Grading, Vignette)
├─ Synthwave color palette application
├─ Terrain gradient shader (pink/cyan)
└─ Optional: Scanline/CRT shader

3.2 Particle Systems
├─ Explosion particles (multi-tier by weapon size)
├─ Debris/dirt particles on crater
├─ Projectile trails
├─ Nuke mushroom cloud
└─ Screen flash effect

3.3 Camera Effects
├─ Screen shake (Cinemachine Impulse)
├─ Slow-motion on big hits (Time.timeScale)
├─ Camera zoom on nuke
└─ Juice testing (feel iteration)

3.4 Title Screen
├─ Synthwave grid background (shader approach)
├─ Animated main menu
├─ Music playback
└─ Smooth transitions
```

**Acceptance Criteria:**
- ✅ Game looks synthwave (neon glow, gradients)
- ✅ Explosions feel impactful (shake, particles, sound)
- ✅ Title screen matches original animation
- ✅ All UI uses synthwave fonts/colors

---

### Phase 4: Progression (Weeks 7-8)

**Goal:** Level structure and unlocks

```
4.1 Level System
├─ LevelData ScriptableObjects (10 levels for MVP)
├─ 3-star rating logic
├─ Level select UI
└─ Difficulty progression (enemy health/AI)

4.2 Economy
├─ CurrencyManager (coins, gems)
├─ Earn rates (damage dealt, level completion)
├─ Persistent save system (PlayerPrefs or JSON)
└─ Continue token system

4.3 Unlocks
├─ Weapon unlock conditions (stars, coins)
├─ Tank skin unlock system
├─ Shop UI (purchase weapons/skins)
└─ Supply drop integration

4.4 UI Screens
├─ Level complete screen (star animation)
├─ Level select (world map grid)
├─ Shop UI
└─ Settings (volume, controls preference)
```

**Acceptance Criteria:**
- ✅ 10 levels playable with star ratings
- ✅ Coins earned and spent in shop
- ✅ Weapons unlock as player progresses
- ✅ Save/load works (resume progress)

---

### Phase 5: Content (Weeks 9-10)

**Goal:** Full launch content

```
5.1 Levels
├─ Create 60 LevelData assets (6 worlds x 10)
├─ Balance difficulty curve
├─ Test each level for fairness
└─ Add tutorial tooltips (World 1)

5.2 Weapons
├─ Implement all 40 weapons
├─ Balance damage/cost
├─ Create weapon icons
└─ Test each weapon's uniqueness

5.3 Achievements
├─ AchievementData ScriptableObjects (50+ achievements)
├─ Achievement unlock popup
├─ Achievement screen UI
└─ Hook into gameplay events

5.4 Daily Challenges
├─ Daily challenge system (random level + modifiers)
├─ Bonus rewards for completion
├─ Challenge UI
└─ Streak tracking
```

**Acceptance Criteria:**
- ✅ 60 levels across 6 worlds
- ✅ 40 weapons balanced and tested
- ✅ 50+ achievements trackable
- ✅ Daily challenge refreshes every 24h

---

### Phase 6: Monetization (Weeks 11-12)

**Goal:** Revenue streams implemented

```
6.1 Ads
├─ Unity Ads SDK integration
├─ Rewarded video (2x coins, continue tokens)
├─ Interstitial ads (between rounds, skippable)
└─ Ad frequency limits (not spammy)

6.2 IAP
├─ Unity IAP setup
├─ Premium upgrade ($0.99)
├─ Gem packs ($1.99-$9.99)
├─ Tank skin bundles
└─ Receipt validation (prevent piracy)

6.3 Shop Polish
├─ Premium tab in shop
├─ "Remove Ads" button (links to premium)
├─ Daily gem bonus for premium users
└─ Visual indicators (premium badge)

6.4 Balance
├─ Tune coin earn rates (2-3 levels per weapon)
├─ Test free player experience (ensure fun)
├─ Test premium value proposition
└─ Ethical F2P checks (no pay-to-win)
```

**Acceptance Criteria:**
- ✅ Rewarded video ads work (test mode)
- ✅ Premium upgrade purchase flow works
- ✅ IAP restore purchases works
- ✅ Game is fun without spending money

---

### Phase 7: Beta & Launch (Weeks 13-16)

**Goal:** Ship to App Store

```
7.1 TestFlight Beta
├─ Create App Store Connect record
├─ Upload first beta build
├─ Invite testers (friends, family, community)
└─ Collect feedback

7.2 Iteration
├─ Fix critical bugs
├─ Tune difficulty based on feedback
├─ Polish rough edges
└─ Second beta build

7.3 Optimization
├─ Profile on real devices (iPhone SE, iPad)
├─ Reduce texture sizes if needed
├─ Optimize particle counts
└─ Target 60 FPS on iPhone SE

7.4 App Store Submission
├─ Screenshots (5 per device size)
├─ App preview video (15-30s gameplay)
├─ Description (synthwave theme, keywords)
├─ Privacy policy (data collection disclosure)
├─ Submit for review

7.5 Launch
├─ Set release date
├─ Marketing (Twitter, Reddit, forums)
├─ Monitor reviews and crashes
└─ Hotfix build if needed (week 1)
```

**Acceptance Criteria:**
- ✅ 60 FPS on iPhone SE (2020)
- ✅ No critical bugs in TestFlight
- ✅ App Store approved
- ✅ Launch day monitoring plan in place

---

## 10. Summary & Next Steps

### What This Spec Provides

✅ **Game Design Decisions** - Hybrid controls, level-based progression, freemium monetization
✅ **Asset Inventory** - 34 tank skins, 11 weapon icons, audio placeholders
✅ **Code Portability Matrix** - 57 modules analyzed, 60% directly portable
✅ **Unity Architecture** - Scenes, GameObject hierarchy, ScriptableObject structure
✅ **Technical Specifications** - Terrain destruction algorithm, physics, rendering approach
✅ **Title Screen Solution** - 3 implementation options (shader recommended)
✅ **Package Recommendations** - URP, DOTween, Unity Ads, audio sources
✅ **Risk Assessment** - Technical, content, and business risks identified
✅ **Migration Sequence** - 16-week phased rollout plan

### Readiness for Implementation

This spec is **detailed enough to create implementation issues**. Each phase can become an epic with child tasks:

- **Epic:** "Phase 1: Foundation"
  - **Task:** Implement Terrain.cs heightmap data structure
  - **Task:** Port midpoint displacement algorithm
  - **Task:** Create mesh-based TerrainRenderer
  - **Task:** Implement crater destruction algorithm
  - (etc.)

### Critical Path Items (Must Address First)

1. **Terrain destruction performance** - Mesh vs texture approach decision
2. **Title screen implementation** - Shader vs 3D choice (affects timeline)
3. **Physics system** - Custom vs Unity Physics2D (affects feel)
4. **Input handling** - Slingshot implementation (new vs web)

### Open Questions (To Resolve During Phase 1)

- **Q:** Should we use Unity Physics2D for projectiles or custom ballistics?
  **A:** Custom recommended for exact web parity, revisit if timeline slips

- **Q:** Mesh or texture-based terrain rendering?
  **A:** Mesh (faster updates), fallback to texture if complexity too high

- **Q:** Full 3D title screen or shader approximation?
  **A:** Shader for MVP, upgrade post-launch if player feedback requests it

- **Q:** How many weapons at launch? 40 or start with 20?
  **A:** 20 balanced weapons better than 40 mediocre ones, expand post-launch

---

## Appendix A: Web Codebase Module Summary

**Total:** 57 JavaScript files, ~35,000 lines of code

**Largest modules:**
- `main.js` (5427 lines) - Main game loop, state machine
- `sound.js` (2579 lines) - Audio playback, pooling
- `ui.js` (2290 lines) - HUD rendering
- `shop.js` (1949 lines) - Shop UI, transactions
- `supply-drop.js` (1906 lines) - Drop system

**Core systems:**
- Terrain (621 lines) - Heightmap, destruction, generation
- Tank (906 lines) - Tank mechanics, damage
- Projectile (1071 lines) - Physics, collision
- Weapons (366 lines) - Weapon definitions
- AI (1528 lines) - Opponent logic
- Effects (1616 lines) - Particles, shake, glow

**Portability breakdown:**
- **Direct port (✅):** 28 modules (pure logic, data structures)
- **Adapt (⚠️):** 18 modules (input, physics, audio)
- **Rewrite (❌):** 11 modules (rendering, UI)

---

## Appendix B: Asset Counts

**Visual Assets:**
- Tank sprites: 34 (common to legendary rarities)
- Weapon icons: 11 (UI sprites)
- Supply drop assets: 13 (crate, parachutes, banners)
- Total PNG files: 58

**Audio Assets (placeholders):**
- Music: 1 test file (172KB WAV)
- SFX: 1 test file (17KB WAV)
- **Need to commission:** 5 music tracks, 30+ SFX

**Icons:**
- iOS app icons: Complete set (20x20 to 1024x1024)

---

## Appendix C: References

**Internal Documents:**
- `docs/research/artillery-game-best-practices.md` (best practices research)
- `docs/research/native-app-analysis.md` (Unity migration decision)
- `web-reference/` (working prototype codebase)

**External Resources:**
- Unity Manual: https://docs.unity3d.com/Manual/
- URP Documentation: https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest
- Shader Graph: https://docs.unity3d.com/Packages/com.unity.shadergraph@latest

---

## Appendix D: Implementation Status

### Phase 1: Foundation

#### 1.2 Terrain System ✅ COMPLETE (January 2026)

**Implemented Files:**
- `Assets/Scripts/Terrain/Terrain.cs` - Heightmap data structure with destruction and falling dirt physics
- `Assets/Scripts/Terrain/TerrainGenerator.cs` - Midpoint displacement procedural generation
- `Assets/Scripts/Terrain/TerrainRenderer.cs` - Mesh-based rendering with synthwave gradient

**Deliverables Verified:**
- ✅ Procedurally generated terrain using midpoint displacement algorithm
- ✅ Real-time terrain destruction with circular crater carving
- ✅ Physics-based dirt settling (iterative neighbor-averaging)
- ✅ Performant mesh updates with regional update optimization
- ✅ Synthwave aesthetic (pink/cyan gradient) applied to terrain

**Key Implementation Notes:**
- Mesh-based approach chosen (per spec section 5.1) for performance
- Destruction algorithm directly ported from web reference terrain.js
- Falling dirt uses configurable settings (threshold: 15px, max iterations: 5, neighbor radius: 5)
- Vertex colors used for gradient (no separate shader needed)

### Phase 2: Core Gameplay ✅ COMPLETE (January 2026)

#### Tank & Combat System ✅ COMPLETE

**Implemented Files:**
- `Assets/Scripts/Tanks/Tank.cs` - Tank MonoBehaviour with health, inventory, terrain positioning, fall damage
- `Assets/Scripts/Weapons/Projectile.cs` - Abstract base class with custom ballistic physics (gravity, wind, collision)
- `Assets/Scripts/Weapons/WindManager.cs` - Singleton wind manager with configurable speed range and auto-change
- `Assets/Scripts/UI/AimingControls.cs` - Slider-based aiming UI with angle (0-180°) and power (0-100%) controls
- `Assets/Scripts/UI/TrajectoryPreview.cs` - LineRenderer-based trajectory visualization with terrain clipping

**Deliverables Verified:**
- ✅ Tank spawns and sits on terrain (terrain heightmap collision)
- ✅ Player can aim and fire (slider controls with real-time tank updates)
- ✅ Projectile follows ballistic arc with gravity + wind (custom physics in FixedUpdate)
- ✅ Trajectory preview shows before firing (updates on angle/power/wind changes)
- ✅ Damage dealt to tanks on hit (TakeDamage system with events)
- ✅ Slider aiming mode works (angle/power sliders with fire button)
- ✅ Turn system foundations (AI/player separation via Team enum)

**Key Implementation Notes:**
- Custom ballistics chosen (per spec section 5.2) for exact parity with web version
- Gravity constant: 9.81 m/s², max velocity: 50 units/s at 100% power
- Wind applies horizontal force to projectiles (configurable -5 to +5 units/s)
- Fall damage system: threshold 50 units, lethal at 300 units
- Projectile uses stepped collision detection for high-speed accuracy
- Tank inventory supports unlimited ammo for basic shot, tracked ammo for special weapons

---

**END OF SPECIFICATION**

*This document should be reviewed and approved before beginning Unity implementation. Any changes to core decisions (aiming mechanics, monetization, title screen approach) should update this spec as the single source of truth.*
