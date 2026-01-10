# Roguelike Survival Mode Specification

## Table of Contents

1. [Overview](#overview)
2. [Core Concept](#core-concept)
3. [Run Structure](#run-structure)
4. [Difficulty Escalation](#difficulty-escalation)
5. [Economy Adjustments](#economy-adjustments)
6. [High Score & Stats System](#high-score--stats-system)
7. [UI/UX Changes](#uiux-changes)
8. [Meta-Progression (Future)](#meta-progression-future)
9. [Implementation Priority](#implementation-priority)

---

## Overview

This specification defines the conversion of the current endless/undefined round system into a roguelike-inspired survival mode. The core philosophy is borrowed from roguelike games: each run is a self-contained challenge where death is permanent, skill matters, and progression within a run creates meaningful decisions.

**Key Pillars:**
- **Permadeath** - Losing a round ends the run, no retries
- **Escalating Challenge** - Each round is harder than the last
- **Session-Based Progression** - Money and weapons only persist within a single run
- **Replayability** - High score tracking and varied AI behavior encourage repeated attempts

---

## Core Concept

### What is a "Run"?

A run is a single continuous session from starting the game until the player's tank is destroyed. Each run consists of multiple rounds against AI opponents, with difficulty increasing each round.

```
┌─────────────────────────────────────────────────────────────┐
│                       RUN LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │ New Run  │ ──► │ Round 1  │ ──► │  Shop    │            │
│  │  Start   │     │  (Easy)  │     │          │            │
│  └──────────┘     └──────────┘     └────┬─────┘            │
│                                         │                   │
│  ┌──────────┐     ┌──────────┐     ┌────▼─────┐            │
│  │   Shop   │ ◄── │ Round 2  │ ◄── │  Win?    │            │
│  └────┬─────┘     │  (Easy)  │     │  Yes     │            │
│       │           └──────────┘     └──────────┘            │
│       ▼                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │ Round 3  │ ──► │   Win?   │ ──► │  Shop    │ ... ──►    │
│  │ (Medium) │     │   Yes    │     │          │            │
│  └──────────┘     └──────────┘     └──────────┘            │
│                                                             │
│                   ┌──────────┐     ┌──────────┐            │
│                   │  Lose?   │ ──► │ Game Over│            │
│                   │          │     │  Screen  │            │
│                   └──────────┘     └──────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Permadeath Philosophy

In roguelike tradition, death is meaningful because it ends the run completely:

| Event | Result | Player Action |
|-------|--------|---------------|
| Win Round | Continue to shop → next round | Keep playing |
| Lose Round | **Run ends immediately** | View stats → Start new run |
| Draw (both tanks die) | **Run ends** (player tank destroyed) | View stats → Start new run |

This creates tension in every round - there are no extra lives, no continues.

---

## Run Structure

### Starting a New Run

When the player starts a new run:

1. **Reset All Progress**
   - Money: Set to starting amount (see Economy section)
   - Weapons: Only Basic Shot (unlimited)
   - Health: 100%
   - Round Counter: 1
   - Stats: All zeroed

2. **Initialize Game State**
   - Generate new terrain
   - Place tanks
   - Set initial wind
   - Set AI to starting difficulty (Easy)

3. **Display Run Start**
   - Brief "New Run" message or animation
   - Show starting conditions (money, difficulty)
   - Transition to Round 1

### Round Progression

```javascript
// Round progression logic
function getNextRoundConfig(roundNumber) {
    return {
        aiDifficulty: getDifficultyForRound(roundNumber),
        windRange: getWindRangeForRound(roundNumber),
        enemyHealth: getEnemyHealthForRound(roundNumber),
        moneyMultiplier: getMoneyMultiplierForRound(roundNumber)
    };
}
```

**Round Flow:**

| Phase | Description |
|-------|-------------|
| **Pre-Round** | Generate terrain, place tanks, show round info |
| **Combat** | Turn-based combat until one tank destroyed |
| **Post-Round (Win)** | Award money, show stats, open shop |
| **Post-Round (Lose)** | Trigger Game Over sequence |

### What Triggers Game Over

The run ends when:

1. **Player Tank Destroyed** - Health reaches 0 from:
   - Enemy projectile damage
   - Fall damage (terrain collapse)
   - Self-damage from own weapon

2. **Draw Condition** - Both tanks destroyed in same turn
   - Treated as player loss (run ends)
   - Special note on Game Over screen: "Mutual Destruction"

### End-of-Run Summary Screen

When a run ends, display a comprehensive summary:

```
┌─────────────────────────────────────────────────────────────┐
│                       GAME OVER                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     ROUNDS SURVIVED                         │
│                          12                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Total Damage Dealt:         1,847                          │
│  Enemies Destroyed:          12                             │
│  Shots Fired:                47                             │
│  Hit Rate:                   68%                            │
│  Money Earned:               $8,450                         │
│  Biggest Hit:                72 damage                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ★ NEW HIGH SCORE! ★                                        │
│  Previous Best: 9 rounds                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│           [ NEW RUN ]              [ MAIN MENU ]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Difficulty Escalation

### AI Difficulty Progression

AI difficulty increases as rounds progress:

| Rounds | AI Difficulty | Description |
|--------|---------------|-------------|
| 1-2 | Easy | Wide error margins, ignores wind |
| 3-5 | Medium | Moderate accuracy, partial wind compensation |
| 6-9 | Hard | High accuracy, good wind compensation |
| 10+ | Hard+ (Enhanced) | Near-perfect accuracy, strategic weapon use |

**Hard+ (Enhanced) Mode** - For rounds 10+:

```javascript
const ENHANCED_HARD_CONFIG = {
    name: 'Hard+',
    angleErrorMin: -2,
    angleErrorMax: 2,
    powerErrorMin: -3,
    powerErrorMax: 3,
    compensatesWind: true,
    windCompensationAccuracy: 0.95, // Nearly perfect
    onlyBasicWeapon: false,
    usesSpecialWeapons: true,       // Can use MIRV, Diggers, etc.
    strategicWeaponChoice: true,    // Picks optimal weapon for situation
    thinkingDelayMin: 300,
    thinkingDelayMax: 600
};
```

### Enemy Health Scaling

Enemy tanks become more durable in later rounds:

| Rounds | Enemy Health | Multiplier |
|--------|--------------|------------|
| 1-3 | 100 HP | 1.0x |
| 4-6 | 120 HP | 1.2x |
| 7-9 | 140 HP | 1.4x |
| 10-12 | 160 HP | 1.6x |
| 13+ | 180 HP | 1.8x (cap) |

```javascript
function getEnemyHealthForRound(roundNumber) {
    const BASE_HEALTH = 100;

    if (roundNumber <= 3) return BASE_HEALTH;
    if (roundNumber <= 6) return Math.floor(BASE_HEALTH * 1.2);
    if (roundNumber <= 9) return Math.floor(BASE_HEALTH * 1.4);
    if (roundNumber <= 12) return Math.floor(BASE_HEALTH * 1.6);
    return Math.floor(BASE_HEALTH * 1.8); // Cap at 180 HP
}
```

### Wind Variation

Wind becomes more extreme in later rounds:

| Rounds | Wind Range | Description |
|--------|------------|-------------|
| 1-3 | -5 to +5 | Light wind, easy to compensate |
| 4-6 | -8 to +8 | Moderate wind |
| 7-9 | -10 to +10 | Strong wind (current max) |
| 10+ | -12 to +12 | Extreme wind (extended range) |

```javascript
function getWindRangeForRound(roundNumber) {
    if (roundNumber <= 3) return 5;
    if (roundNumber <= 6) return 8;
    if (roundNumber <= 9) return 10;
    return 12; // Extended range for late game
}
```

### AI Weapon Availability

AI gains access to better weapons as rounds progress:

| Rounds | AI Weapon Pool |
|--------|----------------|
| 1-2 | Basic Shot only |
| 3-4 | Basic, Missile |
| 5-6 | Basic, Missile, Roller |
| 7-8 | Basic, Missile, Roller, Digger |
| 9+ | All weapons (including MIRV, Nukes) |

```javascript
function getAIWeaponPoolForRound(roundNumber) {
    const POOLS = {
        1: ['basic'],
        3: ['basic', 'missile'],
        5: ['basic', 'missile', 'roller'],
        7: ['basic', 'missile', 'roller', 'digger'],
        9: ['basic', 'missile', 'roller', 'digger', 'mirv', 'mini-nuke', 'nuke']
    };

    // Find the highest threshold <= current round
    const thresholds = Object.keys(POOLS).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
        if (roundNumber >= threshold) {
            return POOLS[threshold];
        }
    }
    return POOLS[1];
}
```

---

## Economy Adjustments

### Starting Money

| Mode | Starting Amount | Rationale |
|------|-----------------|-----------|
| Current | $1,000 | Baseline |
| **Roguelike** | $1,500 | Slightly higher to enable strategic first purchase |

The increased starting money allows players to make a meaningful choice before Round 1: buy a modest weapon immediately, or save for a bigger purchase after Round 2.

### Money Earned Per Round

Base rewards remain the same but scaling is adjusted:

**Hit Reward Formula:**
```javascript
reward = ($50 + (damage × 2)) × roundMultiplier
```

**Round Multipliers (Revised):**

| Rounds | Multiplier | Example Hit (50 damage) |
|--------|------------|-------------------------|
| 1-2 | 1.0x | $150 |
| 3-4 | 1.1x | $165 |
| 5-6 | 1.2x | $180 |
| 7-8 | 1.3x | $195 |
| 9-10 | 1.4x | $210 |
| 11+ | 1.5x | $225 |

**Victory Bonus Scaling:**

| Rounds | Victory Bonus |
|--------|---------------|
| 1-2 | $500 |
| 3-4 | $600 |
| 5-6 | $700 |
| 7-8 | $850 |
| 9-10 | $1,000 |
| 11+ | $1,200 |

### Shop Behavior

The shop opens after each won round:

**Available Items:**
- All weapons unlocked from start (no weapon gating)
- Prices remain constant (no inflation)
- No limit on owned weapons

**Balance Considerations:**

1. **Nuclear Weapons as Win Conditions**
   - Nukes are expensive ($8,000) but can end rounds quickly
   - Player must survive long enough to afford them
   - Creates strategic savings goals

2. **Weapon Economy Curve**
   - Early rounds: Basic Shot + maybe Missile
   - Mid rounds: Build arsenal (Rollers, Diggers)
   - Late rounds: Nuclear options become viable

3. **Money Sink**
   - Late-game weapon costs prevent excessive hoarding
   - Death resets everything, so spending is encouraged

### No Interest System

Unlike the original Scorched Earth, there is **no interest on unspent money**:

- Simpler mental model
- Encourages spending rather than hoarding
- Death penalty is already severe enough

---

## High Score & Stats System

### Stats Tracked Per Run

| Stat | Description | Storage Key |
|------|-------------|-------------|
| `roundsSurvived` | Highest round reached | Primary high score |
| `totalDamageDealt` | Sum of all damage to enemies | Secondary ranking |
| `enemiesDestroyed` | Number of AI tanks killed | Equal to rounds - 1 |
| `shotsFired` | Total projectiles launched | Efficiency metric |
| `shotsHit` | Shots that dealt damage | For hit rate calc |
| `hitRate` | `shotsHit / shotsFired × 100` | Accuracy metric |
| `moneyEarned` | Total money gained | Excludes starting money |
| `biggestHit` | Single highest damage instance | Highlight moment |
| `weaponsUsed` | Set of unique weapons fired | Variety metric |
| `nukesLaunched` | Number of nuclear weapons fired | Style points |

### Persistent Storage

High scores and stats stored in `localStorage`:

```javascript
const STORAGE_KEYS = {
    HIGH_SCORES: 'scorched_earth_high_scores',
    LIFETIME_STATS: 'scorched_earth_lifetime_stats'
};

// High score entry structure
const highScoreEntry = {
    roundsSurvived: 12,
    totalDamage: 1847,
    timestamp: Date.now(),
    // Additional context
    finalDifficulty: 'hard',
    longestWinStreak: 12
};

// Keep top 10 high scores
const MAX_HIGH_SCORES = 10;
```

### Leaderboard Structure

```javascript
// Local leaderboard (no online component for V1)
const leaderboard = {
    entries: [
        { rank: 1, rounds: 15, damage: 2340, date: '2024-01-15' },
        { rank: 2, rounds: 12, damage: 1847, date: '2024-01-14' },
        // ... up to 10 entries
    ],
    sortBy: 'rounds', // Primary: rounds survived
    tiebreaker: 'damage' // Secondary: total damage
};
```

### Lifetime Statistics

Track cumulative stats across all runs:

| Stat | Description |
|------|-------------|
| `totalRuns` | Number of runs started |
| `totalRoundsPlayed` | Sum of all rounds across all runs |
| `lifetimeDamage` | All damage ever dealt |
| `lifetimeEnemiesDestroyed` | All AI tanks killed |
| `bestRound` | Highest single-run rounds survived |
| `averageRounds` | `totalRoundsPlayed / totalRuns` |

---

## UI/UX Changes

### Main Menu Updates

Add roguelike elements to the main menu:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              SCORCHED EARTH                                 │
│            SYNTHWAVE EDITION                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│                    [ NEW RUN ]                              │
│                                                             │
│                   [ HIGH SCORES ]                           │
│                                                             │
│                    [ OPTIONS ]                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Best Run: 12 rounds                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Menu Changes:**
- "Play" becomes "New Run" (clearer roguelike language)
- Display best run prominently
- Add "High Scores" button

### In-Game HUD Additions

Add run context to the existing HUD:

```
┌──────────────────┐
│ PLAYER     100%  │
│ ████████████████ │
├──────────────────┤
│ $ 1,250          │
├──────────────────┤
│ ROUND  5         │  ← Current round number
│ MEDIUM           │  ← Current difficulty label
├──────────────────┤
│ ANGLE  │ POWER   │
│  45°   │  50%    │
└──────────────────┘
```

The round and difficulty info may already exist from the HUD redesign - ensure it's prominently displayed.

### Round Transition Screen

Between rounds, show a brief transition:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ROUND 5 COMPLETE                         │
│                                                             │
│                    Damage Dealt: 78                         │
│                    Money Earned: $234                       │
│                                                             │
│                    ─────────────                            │
│                                                             │
│                    NEXT ROUND: 6                            │
│                    Difficulty: HARD                         │
│                                                             │
│                    [ CONTINUE TO SHOP ]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Game Over Screen

See End-of-Run Summary Screen in Run Structure section.

**Key Elements:**
- Large "GAME OVER" title
- Rounds survived (prominently displayed)
- Run statistics
- High score notification if achieved
- "New Run" and "Main Menu" buttons

### High Scores Screen

Accessible from main menu:

```
┌─────────────────────────────────────────────────────────────┐
│                      HIGH SCORES                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   #  │  ROUNDS  │  DAMAGE  │  DATE                         │
│  ────┼──────────┼──────────┼────────                        │
│   1  │    15    │   2,340  │  Jan 15                        │
│   2  │    12    │   1,847  │  Jan 14                        │
│   3  │    11    │   1,654  │  Jan 12                        │
│   4  │    10    │   1,423  │  Jan 10                        │
│   5  │     9    │   1,102  │  Jan 09                        │
│   6  │     8    │     987  │  Jan 08                        │
│   7  │     7    │     756  │  Jan 07                        │
│   8  │     6    │     623  │  Jan 05                        │
│   9  │     5    │     445  │  Jan 03                        │
│  10  │     4    │     312  │  Jan 01                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Lifetime Stats:                                            │
│  Total Runs: 47  │  Avg Rounds: 6.2  │  Best: 15            │
│                                                             │
│                       [ BACK ]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Meta-Progression (Future)

**Note:** This section describes features for future enhancement beyond the initial roguelike survival mode implementation.

### Unlockables Concept

Persistent unlockables that carry across runs:

| Category | Examples | Unlock Condition |
|----------|----------|------------------|
| **Cosmetics** | Tank skins, explosion colors | Reach round X |
| **Starting Bonuses** | +$200 start, +1 Missile | Cumulative achievements |
| **Challenges** | "Naked Run" (Basic only) | Complete specific feats |

### Achievement System

Track accomplishments:

| Achievement | Requirement | Reward |
|-------------|-------------|--------|
| "First Steps" | Complete Round 1 | Unlock: Blue tank skin |
| "Veteran" | Reach Round 10 | Unlock: +$100 starting bonus |
| "Artillery Master" | 95%+ hit rate in a run | Unlock: Golden crosshair |
| "Nuclear Option" | Win a round with a Nuke | Unlock: Mushroom cloud emote |
| "Pacifist Run" | Win Round 1 with 1 shot | Unlock: "Efficient" title |

### Implementation Priority for Meta-Progression

1. **Phase 1 (MVP):** No meta-progression, pure roguelike
2. **Phase 2:** Cosmetic unlocks based on rounds reached
3. **Phase 3:** Starting bonuses and achievements
4. **Phase 4:** Challenge modes and special runs

---

## Implementation Priority

### Phase 1: Core Survival Loop

1. **Permadeath Implementation**
   - Remove any "continue" or "retry" functionality
   - Losing = immediate Game Over state

2. **Run State Management**
   - Track current run's stats
   - Reset all progress on new run
   - Persist nothing between runs except high scores

3. **Game Over Screen**
   - Display run stats
   - New Run / Main Menu buttons

4. **High Score Storage**
   - localStorage implementation
   - Top 10 leaderboard
   - Current best on main menu

### Phase 2: Difficulty Escalation

5. **Dynamic AI Difficulty**
   - Implement difficulty progression by round
   - Add "Hard+" configuration

6. **Enemy Health Scaling**
   - Implement health multiplier by round

7. **Wind Scaling**
   - Extend wind range for late rounds

8. **AI Weapon Progression**
   - Implement weapon pool per round

### Phase 3: Economy Tuning

9. **Revised Money System**
   - Update starting money
   - Implement graduated multipliers
   - Scale victory bonuses

10. **Balance Testing**
    - Playtest progression curve
    - Adjust weapon costs if needed

### Phase 4: UI Polish

11. **Main Menu Updates**
    - "New Run" button
    - High score display
    - High Scores screen

12. **Round Transition Screen**
    - Post-round stats
    - Next round preview

13. **HUD Updates**
    - Ensure round/difficulty visible
    - Any additional run context

### Phase 5: Stats & Polish

14. **Comprehensive Stats Tracking**
    - All per-run stats
    - Lifetime stats

15. **Enhanced Game Over Screen**
    - Full stat breakdown
    - High score celebration

---

## Appendix: Quick Reference

### Difficulty by Round

| Round | AI | Enemy HP | Wind | AI Weapons |
|-------|-----|----------|------|------------|
| 1 | Easy | 100 | ±5 | Basic |
| 2 | Easy | 100 | ±5 | Basic |
| 3 | Medium | 100 | ±5 | Basic, Missile |
| 4 | Medium | 120 | ±8 | Basic, Missile |
| 5 | Medium | 120 | ±8 | Basic, Missile, Roller |
| 6 | Hard | 120 | ±8 | Basic, Missile, Roller |
| 7 | Hard | 140 | ±10 | Basic, Missile, Roller, Digger |
| 8 | Hard | 140 | ±10 | Basic, Missile, Roller, Digger |
| 9 | Hard | 140 | ±10 | All weapons |
| 10+ | Hard+ | 160-180 | ±12 | All weapons |

### Money Quick Reference

| Event | Base | Round 5 (1.2x) | Round 10 (1.4x) |
|-------|------|----------------|-----------------|
| Hit (50 dmg) | $150 | $180 | $210 |
| Victory | $500 | $700 | $1,000 |

### Storage Keys

| Key | Contents |
|-----|----------|
| `scorched_earth_high_scores` | Top 10 runs array |
| `scorched_earth_lifetime_stats` | Cumulative statistics |
