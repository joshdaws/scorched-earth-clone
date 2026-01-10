# Achievements & Unlockables System Specification

## Overview

A comprehensive system adding achievements, collectible tank skins, and a dramatic unlock experience that rewards skilled play while maintaining the thrill of discovery. The system emphasizes the synthwave aesthetic with 80s action movie-inspired reveal mechanics.

---

## Design Philosophy

### Core Principles

1. **Skill Rewards Skill** - Better performance = better unlock odds, not just more attempts
2. **Collection is Fun** - Building a tank collection should feel rewarding, not grindy
3. **No Pay-to-Win** - All unlocks are purely cosmetic
4. **Dramatic Reveals** - Every unlock feels like an 80s action movie moment
5. **Clear Progression** - Players always know what they're working toward

### Player Psychology Goals

- **Competence**: Achievements validate skill mastery
- **Discovery**: Hidden achievements create "wow" moments
- **Collection**: Tank variety provides psychological freshness
- **Anticipation**: The unlock reveal builds excitement
- **Investment**: Streaks and performance create meaningful stakes

---

## Part 1: Achievement System

### Achievement Categories

#### Combat Achievements
| Achievement | Description | Difficulty |
|-------------|-------------|------------|
| **First Blood** | Destroy your first enemy tank | Tutorial |
| **Direct Hit** | Land a projectile directly on enemy (no splash) | Easy |
| **Overkill** | Deal 150%+ of enemy's remaining health in one hit | Medium |
| **Untouchable** | Win a round without taking any damage | Medium |
| **Comeback King** | Win after dropping below 20% health | Medium |
| **Nail Biter** | Win with less than 10% health remaining | Hard |
| **Flawless Victory** | Win 3 consecutive rounds without damage | Hard |

#### Precision Achievements
| Achievement | Description | Difficulty |
|-------------|-------------|------------|
| **Sharpshooter** | Hit 3 consecutive shots | Easy |
| **Eagle Eye** | Hit 5 consecutive shots | Medium |
| **Sniper Elite** | Hit enemy from maximum map distance | Medium |
| **Wind Whisperer** | Score a hit in 15+ wind conditions | Medium |
| **Storm Chaser** | Score a hit in 25+ wind conditions | Hard |
| **Trick Shot** | Hit enemy after projectile bounces off terrain | Hard |
| **Hole in One** | Direct hit on first shot of the match | Hard |

#### Weapon Mastery Achievements
| Achievement | Description | Unlock |
|-------------|-------------|--------|
| **Basic Training** | Win using only Basic Shots | Tank Skin |
| **Missile Command** | Get a kill with Missile | Badge |
| **Big Game Hunter** | Get a kill with Big Shot | Badge |
| **Cluster Bomb** | Get a kill with MIRV | Badge |
| **Death Dealer** | Get a kill with Death's Head | Badge |
| **Roller Coaster** | Get a kill with Roller | Badge |
| **Heavy Roller** | Get a kill with Heavy Roller | Badge |
| **Dig Dug** | Get a kill with Digger | Badge |
| **Deep Impact** | Get a kill with Heavy Digger | Badge |
| **Mini Meltdown** | Get a kill with Mini Nuke | Badge |
| **Nuclear Winter** | Get a kill with Nuke | Badge |
| **Arsenal Master** | Kill with every weapon type | Tank Skin |

#### Progression Achievements
| Achievement | Description | Difficulty |
|-------------|-------------|------------|
| **Survivor** | Reach Round 5 | Easy |
| **Veteran** | Reach Round 10 | Medium |
| **War Hero** | Reach Round 15 | Hard |
| **Legend** | Reach Round 20 | Very Hard |
| **Immortal** | Reach Round 25 | Extreme |

#### Economy Achievements
| Achievement | Description | Difficulty |
|-------------|-------------|------------|
| **Penny Saved** | Accumulate $5,000 total | Easy |
| **War Chest** | Accumulate $10,000 total | Medium |
| **Arms Dealer** | Accumulate $25,000 total | Hard |
| **Fully Loaded** | Own at least 1 of every weapon | Medium |
| **Stockpile** | Own 50+ total weapons | Medium |

#### Hidden Achievements (Not shown until unlocked)
| Achievement | Description | Trigger |
|-------------|-------------|---------|
| **Self Destruct** | Destroy yourself with your own weapon | Accident |
| **Mutual Destruction** | Both tanks destroyed same round | Rare event |
| **Patient Zero** | Miss 10 shots in a row, then win | Persistence |
| **Against All Odds** | Beat Hard AI on Round 1 | Skill |
| **Minimalist** | Win with only 1 weapon in inventory | Challenge |

### Achievement Rewards

Achievements grant **Unlock Tokens** used in the unlock system:

| Difficulty | Token Reward |
|------------|--------------|
| Tutorial | 1 Token |
| Easy | 2 Tokens |
| Medium | 5 Tokens |
| Hard | 10 Tokens |
| Very Hard | 15 Tokens |
| Extreme | 25 Tokens |

Special achievements (Arsenal Master, etc.) grant **Guaranteed Tank Unlocks** instead of tokens.

---

## Part 2: Tank Collection System

### Tank Rarity Tiers

| Rarity | Drop Rate | Visual Style | Examples |
|--------|-----------|--------------|----------|
| **Common** | 55% | Color variations, basic designs | Red Tank, Blue Tank, Green Camo |
| **Uncommon** | 28% | Pattern skins, themed colors | Neon Pink, Chrome, Zebra Stripe |
| **Rare** | 12% | Distinct designs, 80s references | DeLorean Tank, Tron Tank, Miami Vice |
| **Epic** | 4% | Animated effects, special trails | Flame Trail, Lightning, Holographic |
| **Legendary** | 1% | Unique designs, custom explosions | Golden Tank, Terminator, Blood Dragon |

### Tank Collection Examples

#### Common Tanks (55%)
- **Standard Issue** - Default tank, multiple color swaps
- **Desert Camo** - Tan/brown camouflage
- **Forest Camo** - Green/brown camouflage
- **Arctic** - White/light blue
- **Midnight** - Dark blue/black
- **Crimson** - Deep red
- **Tactical Gray** - Military gray

#### Uncommon Tanks (28%)
- **Neon Pink** - Hot pink with glow effect
- **Neon Cyan** - Synthwave cyan
- **Chrome** - Reflective silver finish
- **Gold Plated** - Metallic gold
- **Zebra** - Black and white stripes
- **Tiger** - Orange with black stripes
- **Digital Camo** - Pixel pattern
- **Sunset Gradient** - Orange to pink fade

#### Rare Tanks (12%)
- **DeLorean** - Stainless steel, blue glow (Back to the Future)
- **Tron Cycle** - Black with cyan grid lines
- **Miami Vice** - White with pink/teal accents
- **Outrun** - Purple with sunset gradient
- **Hotline** - White with blood splatter (Hotline Miami)
- **Cobra Commander** - Blue with red visor
- **Knight Rider** - Black with red scanner light

#### Epic Tanks (4%)
- **Flame Rider** - Leaves fire trail behind shots
- **Lightning Strike** - Electric crackling effect on movement
- **Holographic** - Shimmering rainbow effect
- **Ghost Protocol** - Semi-transparent, glitch effect
- **Plasma Core** - Pulsing energy core visible
- **Starfield** - Animated star pattern

#### Legendary Tanks (1%)
- **Blood Dragon** - Neon dinosaur tank (Far Cry BD style)
- **The Terminator** - Chrome endoskeleton aesthetic
- **Golden God** - Solid gold with unique explosion
- **Arcade Champion** - Pixelated retro style
- **Synthwave Supreme** - Maximum 80s aesthetic, animated

### Collection Screen

```
┌─────────────────────────────────────────────────────────────────┐
│                     TANK COLLECTION                             │
│                   23 / 45 UNLOCKED                              │
├─────────────────────────────────────────────────────────────────┤
│  FILTER: [ALL] [COMMON] [UNCOMMON] [RARE] [EPIC] [LEGENDARY]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ [TANK] │ │ [TANK] │ │  ???   │ │ [TANK] │ │  ???   │        │
│  │Standard│ │ Neon   │ │UNCOMMON│ │ Chrome │ │  RARE  │        │
│  │  ✓     │ │ NEW!   │ │        │ │   ✓    │ │        │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │  ???   │ │ [TANK] │ │  ???   │ │  ???   │ │  ???   │        │
│  │  EPIC  │ │Outrun  │ │  RARE  │ │LEGENDRY│ │UNCOMMON│        │
│  │        │ │   ✓    │ │        │ │        │ │        │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                                 │
│                    (scroll for more)                            │
├─────────────────────────────────────────────────────────────────┤
│  SELECTED: Outrun                                               │
│  "Cruise through the neon sunset in this synthwave classic"     │
│                                                                 │
│  [ EQUIP ]                                [ PREVIEW ]           │
└─────────────────────────────────────────────────────────────────┘
```

**Collection Screen Features:**
- Grid view of all tanks (unlocked shown, locked as silhouettes with rarity label)
- "NEW!" badge on recently unlocked tanks
- Filter by rarity tier
- Selected tank shows name, description, preview
- Equip button to set as active tank
- Preview button to see tank in action (short animation)
- Progress counter: "X / Y UNLOCKED"

---

## Part 3: The Unlock Experience

### "SUPPLY DROP" Reveal Mechanic

Instead of a vending machine, unlocks use a **military supply drop** aesthetic with synthwave flair.

#### The Concept

A C-130 cargo plane (stylized, neon-lit) flies across the screen and drops a crate with a parachute. The crate lands, opens dramatically, and reveals the tank inside with appropriate fanfare based on rarity.

#### Reveal Sequence

**Phase 1: Approach (1.5 seconds)**
```
Sky darkens slightly
Distant engine rumble
Neon-lit cargo plane silhouette appears on horizon
Flies across top of screen, leaving contrail
```

**Phase 2: Drop (1 second)**
```
Crate ejects from plane
Parachute deploys (neon-colored based on rarity)
Crate descends with gentle sway
Spotlight beam follows crate down
```

**Phase 3: Landing (0.5 seconds)**
```
Crate touches down on grid platform
Small dust/particle effect
Parachute detaches and floats away
Dramatic pause
```

**Phase 4: Reveal (2 seconds)**
```
Crate panels blow outward (explosion effect)
Light beams emanate from inside
Tank rises on platform (or drives out)
Rarity banner displays
Tank name and description appear
```

#### Rarity-Based Variations

| Rarity | Parachute Color | Reveal Effect | Audio |
|--------|-----------------|---------------|-------|
| Common | White | Simple panel open | Basic synth hit |
| Uncommon | Cyan | Glow effect | Ascending synth |
| Rare | Purple | Electric sparks | Power chord |
| Epic | Gold | Holographic shimmer | Full synth riff |
| Legendary | Rainbow/Animated | Maximum explosion, screen shake | Epic 80s anthem sting |

#### Alternative Reveal: "EXTRACTION" (for Legendary)

For Legendary tanks, an even more dramatic reveal:

```
Screen goes to static briefly
"INCOMING TRANSMISSION" text
Helicopter spotlight sweeps the area
Chopper descends through fog
Tank lowered on cable
Dramatic spotlight reveal
Text: "LEGENDARY ASSET ACQUIRED"
```

### Skip Option

Players can tap/click to skip the animation after seeing it once, but:
- First time seeing a rarity tier = forced watch
- Skip still shows the result card
- "Hold to skip" prevents accidental skips

---

## Part 4: Performance-Based Odds System

### Streak Multipliers

Player performance directly affects unlock quality through a **Performance Rating** system.

#### Performance Factors

| Factor | Impact |
|--------|--------|
| **Win Streak** | +5% rare+ chance per consecutive win (max +25%) |
| **Flawless Round** | +10% rare+ chance (no damage taken) |
| **High Accuracy** | +3% per 10% accuracy above 50% |
| **Round Reached** | +1% per round beyond 5 |
| **Achievement Unlocked** | +15% for that unlock attempt |

#### Streak Decay

| Factor | Impact |
|--------|--------|
| **Loss** | Resets win streak |
| **Taking 50%+ damage** | -5% bonus |
| **Missing 5+ shots in a row** | -3% accuracy bonus |
| **Losing streak (3+)** | Increased duplicate chance |

#### Example Scenarios

**Scenario A: Hot Streak**
- Player has won 4 rounds in a row (+20%)
- Current round won flawlessly (+10%)
- 75% accuracy this session (+7.5%)
- **Total bonus: +37.5% to rare+ drop chance**

**Scenario B: Struggling**
- Player on 3-loss streak
- Low accuracy (30%)
- **Result: Higher duplicate chance, but pity system protects**

### Duplicate Protection

To prevent frustration:

1. **Soft Protection**: Can't receive same tank twice in a row
2. **Pity Timer**: Guaranteed new tank after 5 consecutive duplicates
3. **Duplicate Conversion**: Duplicates grant "Scrap" currency
4. **Scrap Shop**: 10 Scrap = choose any Common, 25 = Uncommon, 50 = Rare, 100 = Epic

### Pity System

Prevents extended bad luck:

| Pulls Without Rare+ | Bonus to Next Pull |
|---------------------|-------------------|
| 5 | +5% |
| 10 | +15% |
| 15 | +30% |
| 20 | Guaranteed Rare or better |

| Pulls Without Epic+ | Bonus to Next Pull |
|---------------------|-------------------|
| 15 | +2% |
| 25 | +5% |
| 35 | +10% |
| 50 | Guaranteed Epic or better |

---

## Part 5: Unlock Token Economy

### Earning Tokens

| Activity | Tokens Earned |
|----------|---------------|
| Win a round | 5 |
| Flawless win | 10 |
| Reach new round milestone (5, 10, 15, 20, 25) | 15 |
| Unlock achievement (varies) | 2-25 |
| First win of session | 5 bonus |
| Win streak bonus (per 3 wins) | 5 |

### Spending Tokens

| Action | Cost |
|--------|------|
| Standard Supply Drop | 50 tokens |
| Premium Supply Drop (+10% rare+) | 100 tokens |
| Guaranteed Rare+ Drop | 250 tokens |

### Token Display

Always visible in:
- Main menu header
- Post-round summary
- Collection screen
- Pre-unlock confirmation

---

## Part 6: UI Integration

### Achievement Popup

When an achievement unlocks during gameplay:

```
┌────────────────────────────────────┐
│ ★ ACHIEVEMENT UNLOCKED ★           │
│                                    │
│ 🎯 SHARPSHOOTER                    │
│ "Hit 3 consecutive shots"          │
│                                    │
│ +5 TOKENS                          │
└────────────────────────────────────┘
```

- Slides in from top-right
- Stays for 3 seconds
- Doesn't block gameplay
- Queues if multiple unlock simultaneously

### Post-Round Summary Enhancement

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROUND COMPLETE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RESULT: VICTORY                                                │
│                                                                 │
│  Damage Dealt: 127        Accuracy: 75%                         │
│  Damage Taken: 45         Shots Fired: 8                        │
│  Money Earned: $850                                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  TOKENS EARNED                                                  │
│                                                                 │
│  Round Win:                    +5                               │
│  Accuracy Bonus:               +3                               │
│  Win Streak (x3):              +5                               │
│  ──────────────────────────                                     │
│  TOTAL:                        13 tokens                        │
│                                                                 │
│  Your Balance: 67 tokens       [ OPEN SUPPLY DROP: 50 ]         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ACHIEVEMENTS THIS ROUND                                        │
│                                                                 │
│  ★ Eagle Eye - Hit 5 consecutive shots (+5 tokens)              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [ CONTINUE ]              [ SHOP ]             [ COLLECTION ]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Main Menu Addition

Add new buttons:
- **COLLECTION** - View tank collection and equip
- **ACHIEVEMENTS** - View all achievements and progress
- **SUPPLY DROP** - Spend tokens on unlocks (if have enough)

### Achievement Screen

```
┌─────────────────────────────────────────────────────────────────┐
│                      ACHIEVEMENTS                               │
│                   34 / 52 UNLOCKED                              │
├─────────────────────────────────────────────────────────────────┤
│  FILTER: [ALL] [COMBAT] [PRECISION] [WEAPONS] [PROGRESSION]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ★ FIRST BLOOD                                    UNLOCKED ✓   │
│    "Destroy your first enemy tank"                              │
│                                                                 │
│  ★ SHARPSHOOTER                                   UNLOCKED ✓   │
│    "Hit 3 consecutive shots"                                    │
│                                                                 │
│  ☆ EAGLE EYE                                      LOCKED       │
│    "Hit 5 consecutive shots"                       0/5          │
│                                                                 │
│  ☆ WIND WHISPERER                                 LOCKED       │
│    "Score a hit in 15+ wind conditions"            0/1          │
│                                                                 │
│  ? ? ? ? ? ? ?                                    HIDDEN       │
│    "Complete a secret challenge"                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 7: Data Persistence

### Saved Data Structure

```javascript
{
  // Achievement tracking
  achievements: {
    unlocked: ["first_blood", "sharpshooter", ...],
    progress: {
      "eagle_eye": { current: 3, required: 5 },
      "war_chest": { current: 7500, required: 10000 }
    }
  },

  // Collection
  tanks: {
    owned: ["standard", "neon_pink", "outrun", ...],
    equipped: "outrun",
    new: ["neon_pink"],  // Haven't been viewed yet
    duplicateCount: { "standard": 3, "neon_pink": 1 }
  },

  // Economy
  tokens: 67,
  scrap: 15,

  // Stats for performance calculation
  stats: {
    currentWinStreak: 4,
    sessionAccuracy: 0.72,
    roundsWithoutRare: 3,
    roundsWithoutEpic: 12,
    totalDuplicatesInRow: 0
  },

  // Lifetime stats
  lifetime: {
    totalWins: 47,
    totalRounds: 89,
    highestRound: 18,
    totalDamageDealt: 12450,
    totalTokensEarned: 892,
    tanksUnlocked: 23
  }
}
```

### Storage

- Use `localStorage` for web version
- Sync to device storage for iOS via Capacitor
- Consider optional cloud save for cross-device (future)

---

## Part 8: Implementation Priority

### Phase 1: Core Achievement System
1. Achievement data structure and tracking
2. In-game achievement popup
3. Achievement screen UI
4. Basic achievements (First Blood, combat, progression)
5. Token earning on achievement unlock

### Phase 2: Tank Collection Foundation
1. Tank registry with all tanks defined
2. Tank rarity tiers and drop rates
3. Collection screen UI (grid, filters, equip)
4. Tank rendering in-game based on equipped skin
5. Save/load collection data

### Phase 3: Supply Drop Experience
1. Supply drop animation sequence
2. Rarity-based reveal variations
3. Skip functionality
4. Token spending UI
5. Post-round integration

### Phase 4: Performance System
1. Streak tracking
2. Performance rating calculation
3. Modified drop rates based on performance
4. Pity system implementation
5. Duplicate protection and scrap conversion

### Phase 5: Polish & Content
1. All remaining achievements
2. All tank designs and assets
3. Audio for achievements and reveals
4. Legendary extraction animation
5. Edge cases and bug fixes

---

## Future Considerations

### Seasonal Content
- Time-limited tanks (holiday themes, events)
- Seasonal achievements
- Battle pass-style progression (optional)

### Social Features
- Share unlocked tanks
- Compare collections with friends
- Leaderboards for achievements

### Additional Customization
- Tank accessories (flags, decals, antennas)
- Custom explosion effects
- Projectile trails
- Victory animations

---

## Technical Notes

### Asset Requirements

**New Assets Needed:**
- Tank skin sprites (45+ variants at 64x32 each)
- Supply drop animation frames
- Cargo plane sprite
- Parachute sprites (5 colors)
- Crate sprite and open animation
- Achievement icons
- Rarity border effects
- UI elements (buttons, frames, badges)

**Audio Needed:**
- Plane flyover sound
- Parachute deploy
- Crate landing
- Crate opening (5 variations by rarity)
- Achievement unlock chime
- Legendary reveal fanfare

### Performance Considerations

- Lazy load tank sprites (only load equipped + collection previews)
- Cache supply drop animation after first play
- Throttle achievement checks to avoid frame drops
- Batch localStorage writes

---

## Appendix: Achievement Tracking Logic

### Combat Achievement Detection

```javascript
// Example: Detecting "Direct Hit"
function checkDirectHit(projectile, enemy) {
  const distance = getDistance(projectile.impactPoint, enemy.center);
  const isDirectHit = distance <= enemy.hitboxRadius;

  if (isDirectHit && !achievements.unlocked.includes('direct_hit')) {
    unlockAchievement('direct_hit');
  }
}

// Example: Detecting "Sharpshooter" / "Eagle Eye"
let consecutiveHits = 0;

function onProjectileResult(didHit) {
  if (didHit) {
    consecutiveHits++;
    if (consecutiveHits >= 3) checkAchievement('sharpshooter');
    if (consecutiveHits >= 5) checkAchievement('eagle_eye');
  } else {
    consecutiveHits = 0;
  }
}
```

### Drop Rate Calculation

```javascript
function calculateDropRates(playerStats) {
  const baseRates = {
    common: 0.55,
    uncommon: 0.28,
    rare: 0.12,
    epic: 0.04,
    legendary: 0.01
  };

  // Calculate performance bonus
  let bonus = 0;
  bonus += Math.min(playerStats.winStreak * 0.05, 0.25);
  bonus += playerStats.flawlessRound ? 0.10 : 0;
  bonus += Math.max(0, (playerStats.accuracy - 0.5) * 0.3);
  bonus += Math.max(0, (playerStats.roundReached - 5) * 0.01);

  // Apply pity bonus
  bonus += getPityBonus(playerStats.roundsWithoutRare);

  // Redistribute rates
  const rareBonus = bonus * 0.6;
  const epicBonus = bonus * 0.3;
  const legendaryBonus = bonus * 0.1;

  return {
    common: Math.max(0.30, baseRates.common - bonus),
    uncommon: baseRates.uncommon,
    rare: baseRates.rare + rareBonus,
    epic: baseRates.epic + epicBonus,
    legendary: Math.min(0.05, baseRates.legendary + legendaryBonus)
  };
}
```
