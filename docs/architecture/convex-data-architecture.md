# Convex Data Architecture

This document describes the data architecture for the Convex backend supporting high scores, achievements, tank collectibles, and future Game Center integration.

## Overview

The backend provides:
- **Global leaderboards** - Real-time, global high score rankings
- **Player profiles** - Persistent player data across sessions (same device initially)
- **Collection sync** - Tank skins, achievements, and tokens synchronized to the cloud
- **Future Game Center** - Migration path to Apple Game Center authentication for iOS

## Authentication Strategy

### Phase 1: Anonymous Players (MVP)

Players start without authentication:
1. **Device ID** - Generated on first launch, stored in localStorage
2. **Display Name** - Player-chosen name shown on leaderboards
3. **Local Binding** - All data tied to device ID

```
┌─────────────────────────────────────────────────────────────────┐
│                       ANONYMOUS FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│  1. First launch: Generate UUID → store in localStorage         │
│  2. Prompt for display name (optional, "Player" default)        │
│  3. All API calls include deviceId in request                   │
│  4. Backend creates/updates player record keyed by deviceId     │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Game Center Integration (iOS App)

When the iOS app launches with Game Center:
1. **Automatic Sign-In** - Game Center authenticates the player
2. **Player ID** - Game Center provides a stable `gamePlayerId`
3. **Data Migration** - Link existing deviceId data to Game Center account

```
┌─────────────────────────────────────────────────────────────────┐
│                    GAME CENTER FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│  1. iOS app: GameServices.signIn()                              │
│  2. Get gamePlayerId from Game Center                           │
│  3. Call linkGameCenterAccount(deviceId, gamePlayerId)          │
│  4. Backend merges data, sets player.gameCenterId               │
│  5. Future requests use gamePlayerId as primary key             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schema Design

### Table: `players`

Central player profile table. All other data references this.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    // === Identity ===
    deviceId: v.string(),                    // Primary key for anonymous users
    gameCenterId: v.optional(v.string()),    // Set when linked to Game Center
    displayName: v.string(),                 // Shown on leaderboards

    // === Profile ===
    createdAt: v.number(),                   // Timestamp of first seen
    lastSeenAt: v.number(),                  // Timestamp of last activity
    platform: v.string(),                    // "web" | "ios" | "android"

    // === Currency ===
    tokens: v.number(),                      // Current token balance
    scrap: v.number(),                       // Current scrap balance

    // === Equipped ===
    equippedTankId: v.string(),              // Currently equipped tank skin

    // === Stats Summary (denormalized for quick access) ===
    highestRound: v.number(),
    totalWins: v.number(),
    totalKills: v.number(),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_gameCenterId", ["gameCenterId"])
    .index("by_displayName", ["displayName"]),
});
```

### Table: `highScores`

Global leaderboard entries. Each player can have multiple entries (one per run).

```typescript
  highScores: defineTable({
    // === Player Reference ===
    playerId: v.id("players"),
    displayName: v.string(),                  // Denormalized for fast queries

    // === Score Data ===
    roundsSurvived: v.number(),               // Primary ranking metric
    totalDamage: v.number(),                  // Tiebreaker
    enemiesDestroyed: v.number(),
    shotsFired: v.number(),
    shotsHit: v.number(),
    hitRate: v.number(),                      // 0-100 percentage
    biggestHit: v.number(),

    // === Metadata ===
    timestamp: v.number(),                    // When the run ended
    platform: v.string(),                     // Platform where achieved

    // === Anti-cheat ===
    validated: v.boolean(),                   // Server-side validation passed
    runHash: v.optional(v.string()),          // Hash of run events (future)
  })
    .index("by_roundsSurvived", ["roundsSurvived"])
    .index("by_playerId", ["playerId"])
    .index("by_timestamp", ["timestamp"]),
```

### Table: `achievements`

Achievement unlock records per player.

```typescript
  achievements: defineTable({
    playerId: v.id("players"),
    achievementId: v.string(),                // e.g., "first_blood", "veteran"

    // === Progress ===
    progress: v.number(),                     // Current progress (for counters)
    target: v.number(),                       // Required for completion

    // === State ===
    unlocked: v.boolean(),
    unlockedAt: v.optional(v.number()),       // Timestamp when unlocked
    viewed: v.boolean(),                      // Has player seen this unlock?

    // === Reward ===
    tokenReward: v.number(),                  // Tokens awarded
    specialReward: v.optional(v.string()),    // Tank skin ID if applicable
  })
    .index("by_playerId", ["playerId"])
    .index("by_playerId_achievementId", ["playerId", "achievementId"]),
```

### Table: `tankCollection`

Owned tanks per player.

```typescript
  tankCollection: defineTable({
    playerId: v.id("players"),
    tankId: v.string(),                       // e.g., "standard", "neon-rider"

    // === Ownership ===
    ownedAt: v.number(),                      // Timestamp of first acquisition
    duplicateCount: v.number(),               // Times received after first
    source: v.string(),                       // "supply_drop" | "achievement" | "scrap_shop"

    // === State ===
    isNew: v.boolean(),                       // Not yet viewed in collection
  })
    .index("by_playerId", ["playerId"])
    .index("by_playerId_tankId", ["playerId", "tankId"]),
```

### Table: `lifetimeStats`

Aggregate statistics per player (single record per player).

```typescript
  lifetimeStats: defineTable({
    playerId: v.id("players"),

    // === Combat ===
    totalWins: v.number(),
    totalLosses: v.number(),
    totalRounds: v.number(),
    highestRound: v.number(),
    totalDamageDealt: v.number(),
    totalDamageTaken: v.number(),
    biggestHit: v.number(),

    // === Accuracy ===
    totalShotsFired: v.number(),
    totalShotsHit: v.number(),
    bestSingleRoundAccuracy: v.number(),      // 0-1 decimal

    // === Kills ===
    totalKills: v.number(),
    killsByWeapon: v.any(),                   // { weaponId: count }
    flawlessWins: v.number(),

    // === Streaks ===
    longestWinStreak: v.number(),
    currentWinStreak: v.number(),

    // === Economy ===
    totalMoneyEarned: v.number(),
    totalMoneySpent: v.number(),
    totalTokensEarned: v.number(),
    totalTokensSpent: v.number(),

    // === Collection ===
    tanksUnlocked: v.number(),
    supplyDropsOpened: v.number(),
    achievementsUnlocked: v.number(),

    // === Session ===
    totalPlayTime: v.number(),                // Milliseconds
    totalRuns: v.number(),
    firstPlayDate: v.number(),
    lastPlayDate: v.number(),
  })
    .index("by_playerId", ["playerId"]),
```

### Table: `syncQueue`

Offline action queue for clients with poor connectivity.

```typescript
  syncQueue: defineTable({
    // === Identity ===
    deviceId: v.string(),                     // Device that queued the action

    // === Action ===
    actionType: v.string(),                   // "submit_score" | "unlock_achievement" | etc.
    payload: v.any(),                         // Action-specific data

    // === Metadata ===
    clientTimestamp: v.number(),              // When action occurred locally
    serverTimestamp: v.optional(v.number()),  // When processed

    // === State ===
    status: v.string(),                       // "pending" | "processed" | "failed"
    errorMessage: v.optional(v.string()),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_status", ["status"]),
```

---

## API Endpoints

### Player Management

```typescript
// === Queries ===

// Get or create player by deviceId
getPlayer({ deviceId: string }): Player | null

// Get player by Game Center ID
getPlayerByGameCenter({ gameCenterId: string }): Player | null

// === Mutations ===

// Create new player (first launch)
createPlayer({
  deviceId: string,
  displayName: string,
  platform: "web" | "ios" | "android"
}): Player

// Update display name
updateDisplayName({
  deviceId: string,
  displayName: string
}): void

// Link Game Center account (migration)
linkGameCenterAccount({
  deviceId: string,
  gameCenterId: string,
  displayName: string  // From Game Center
}): Player
```

### High Scores / Leaderboard

```typescript
// === Queries ===

// Get global leaderboard (top 100)
getLeaderboard({ limit?: number }): HighScore[]

// Get player's personal best scores
getPlayerScores({ deviceId: string, limit?: number }): HighScore[]

// Get player rank
getPlayerRank({ deviceId: string }): { rank: number, score: HighScore } | null

// === Mutations ===

// Submit a score
submitScore({
  deviceId: string,
  runStats: {
    roundsSurvived: number,
    totalDamage: number,
    enemiesDestroyed: number,
    shotsFired: number,
    shotsHit: number,
    biggestHit: number,
  }
}): { rank: number | null, isNewBest: boolean, isTop100: boolean }
```

### Achievements

```typescript
// === Queries ===

// Get all achievements for player
getPlayerAchievements({ deviceId: string }): Achievement[]

// Get achievement stats
getAchievementStats({ deviceId: string }): {
  total: number,
  unlocked: number,
  tokensEarned: number
}

// === Mutations ===

// Unlock achievement
unlockAchievement({
  deviceId: string,
  achievementId: string
}): { success: boolean, reward: number, specialReward?: string }

// Update achievement progress (for counter-type)
updateAchievementProgress({
  deviceId: string,
  achievementId: string,
  progress: number
}): { unlocked: boolean, current: number, required: number }

// Sync all achievements (bulk update from client)
syncAchievements({
  deviceId: string,
  achievements: Array<{ id: string, progress: number, unlocked: boolean }>
}): void
```

### Tank Collection

```typescript
// === Queries ===

// Get player's tank collection
getCollection({ deviceId: string }): Tank[]

// Get collection progress
getCollectionProgress({ deviceId: string }): {
  owned: number,
  total: number,
  percentage: number
}

// === Mutations ===

// Add tank to collection
addTank({
  deviceId: string,
  tankId: string,
  source: "supply_drop" | "achievement" | "scrap_shop"
}): { isNew: boolean, scrapAwarded: number }

// Set equipped tank
setEquippedTank({
  deviceId: string,
  tankId: string
}): boolean

// Mark tanks as viewed
markTanksViewed({
  deviceId: string,
  tankIds: string[]
}): void
```

### Currency

```typescript
// === Queries ===

// Get currency balances
getCurrencyBalance({ deviceId: string }): {
  tokens: number,
  scrap: number
}

// === Mutations ===

// Add tokens (from achievements, wins)
addTokens({
  deviceId: string,
  amount: number,
  source: string
}): number  // New balance

// Spend tokens (on supply drops)
spendTokens({
  deviceId: string,
  amount: number
}): boolean

// Add scrap (from duplicates)
addScrap({
  deviceId: string,
  amount: number,
  source: string
}): number

// Spend scrap (in scrap shop)
spendScrap({
  deviceId: string,
  amount: number
}): boolean
```

### Sync

```typescript
// === Mutations ===

// Full sync from client (called periodically or on app foreground)
fullSync({
  deviceId: string,
  clientData: {
    tokens: number,
    scrap: number,
    equippedTankId: string,
    achievements: Achievement[],
    collection: Tank[],
    lifetimeStats: LifetimeStats
  }
}): {
  serverData: {
    tokens: number,
    scrap: number,
    equippedTankId: string,
    // ... merged authoritative data
  },
  conflicts: Array<{ field: string, clientValue: any, serverValue: any }>
}

// Queue offline action
queueOfflineAction({
  deviceId: string,
  actionType: string,
  payload: any,
  clientTimestamp: number
}): string  // Queue ID

// Process offline queue
processOfflineQueue({
  deviceId: string
}): { processed: number, failed: number }
```

---

## Migration: Anonymous to Game Center

### Scenario 1: Fresh iOS Install (No Previous Web Play)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User installs iOS app                                       │
│  2. Game Center auto-authenticates                              │
│  3. App gets gamePlayerId                                       │
│  4. Backend: Check if gameCenterId exists                       │
│  5. No match → Create new player with gameCenterId              │
│  6. No migration needed                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Scenario 2: Existing Web Player, New iOS Install

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User has played on web (data exists for deviceId_web_xxx)   │
│  2. Installs iOS app                                            │
│  3. iOS app generates new deviceId_ios_xxx                      │
│  4. Game Center authenticates → gamePlayerId available          │
│  5. App calls linkGameCenterAccount(deviceId_ios, gamePlayerId) │
│  6. User prompted: "Link existing account?"                     │
│  7. If yes: Enter web account email or scan QR code             │
│  8. Backend merges: web deviceId data → new iOS player          │
│  9. Web deviceId marked as migrated (read-only)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Scenario 3: Existing iOS Player, Add Game Center

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User has iOS app without Game Center signed in              │
│  2. Data exists under deviceId only                             │
│  3. User signs into Game Center                                 │
│  4. App calls linkGameCenterAccount(deviceId, gamePlayerId)     │
│  5. Backend updates player.gameCenterId                         │
│  6. Future lookups can use either deviceId or gameCenterId      │
└─────────────────────────────────────────────────────────────────┘
```

### Migration Rules

1. **Data Merging** - Higher values win for stats (max of client/server)
2. **Collections Merge** - Union of owned tanks/achievements
3. **Currency** - Server is authoritative (anti-cheat)
4. **One-Way Link** - Once linked to Game Center, cannot unlink
5. **Cross-Platform** - Game Center ID allows cross-device sync on iOS

---

## Offline/Sync Strategy

### Client-First Architecture

The game uses localStorage as the primary data store for responsiveness:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT-SERVER SYNC                           │
├─────────────────────────────────────────────────────────────────┤
│  Client (localStorage)           Server (Convex)                │
│  ─────────────────────           ──────────────────             │
│  Primary for gameplay            Source of truth for:           │
│  Immediate feedback              - High scores (global)         │
│  Works offline                   - Anti-cheat validation        │
│                                  - Cross-device sync            │
│                                                                 │
│  Sync triggers:                                                 │
│  - Run ends → submit score                                      │
│  - Achievement unlocks → notify server                          │
│  - App foreground → full sync                                   │
│  - Supply drop opened → verify server                           │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Timing

| Event | Sync Action |
|-------|-------------|
| App launch | Full sync (pull server state) |
| Run ends | Submit score, sync stats |
| Achievement unlocked | Single achievement sync |
| Supply drop opened | Verify tokens, sync tank |
| App background | Push pending changes |
| Periodic (5 min) | Full sync if changes pending |

### Conflict Resolution

```typescript
// Server-side conflict resolution
function resolveConflict(field: string, client: any, server: any): any {
  switch (field) {
    // Server authoritative (anti-cheat)
    case 'tokens':
    case 'scrap':
      return server;

    // Higher value wins (progress)
    case 'highestRound':
    case 'totalKills':
    case 'longestWinStreak':
      return Math.max(client, server);

    // Union merge (collections)
    case 'ownedTanks':
    case 'unlockedAchievements':
      return [...new Set([...client, ...server])];

    // Client wins (preferences)
    case 'displayName':
    case 'equippedTankId':
      return client;

    default:
      return server; // Server authoritative by default
  }
}
```

---

## Security & Anti-Cheat

### Validation Layers

#### 1. Input Validation (All Requests)

```typescript
// Example: submitScore mutation
export const submitScore = mutation({
  args: {
    deviceId: v.string(),
    runStats: v.object({
      roundsSurvived: v.number(),
      totalDamage: v.number(),
      enemiesDestroyed: v.number(),
      shotsFired: v.number(),
      shotsHit: v.number(),
      biggestHit: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Validate ranges
    if (args.runStats.roundsSurvived < 0 || args.runStats.roundsSurvived > 1000) {
      throw new Error("Invalid rounds value");
    }
    if (args.runStats.shotsFired < args.runStats.shotsHit) {
      throw new Error("Invalid shot stats");
    }
    // ... continue with save
  },
});
```

#### 2. Reasonableness Checks

```typescript
const VALIDATION_RULES = {
  maxRoundsPerHour: 60,           // Can't play more than 60 rounds/hour
  maxDamagePerRound: 500,         // Max damage possible per round
  maxKillsPerRound: 1,            // Only 1 enemy per round
  minRoundDuration: 5000,         // Rounds take at least 5 seconds
  maxHitRate: 100,                // Hit rate can't exceed 100%
};

function validateRunStats(stats: RunStats, player: Player): boolean {
  // Check if stats are physically possible
  if (stats.totalDamage > stats.roundsSurvived * VALIDATION_RULES.maxDamagePerRound) {
    return false; // Damage too high for rounds played
  }

  if (stats.enemiesDestroyed > stats.roundsSurvived) {
    return false; // Can't kill more enemies than rounds played
  }

  // Check hit rate sanity
  const hitRate = stats.shotsHit / stats.shotsFired;
  if (hitRate > 1.0) {
    return false; // More hits than shots
  }

  return true;
}
```

#### 3. Rate Limiting

```typescript
// Per-player rate limits
const RATE_LIMITS = {
  scoreSubmits: { max: 10, windowMs: 60000 },      // 10 per minute
  achievementUnlocks: { max: 20, windowMs: 60000 }, // 20 per minute
  syncRequests: { max: 30, windowMs: 60000 },       // 30 per minute
};
```

#### 4. Server-Side Scoring (Future)

For high-value competitive scenarios, run simulation server-side:

```typescript
// Future: Replay-based validation
interface RunReplay {
  seed: number;              // Terrain/wind seed
  inputs: PlayerInput[];     // All player inputs with timestamps
}

async function validateReplay(replay: RunReplay): Promise<boolean> {
  // Re-simulate the game with same seed + inputs
  // Compare results to claimed score
  const simulated = await simulateRun(replay.seed, replay.inputs);
  return simulated.score === replay.claimedScore;
}
```

### Trust Levels

| Data Type | Trust Level | Validation |
|-----------|-------------|------------|
| Scores | Low | Server validates all stats |
| Achievements | Medium | Validate preconditions server-side |
| Currency (tokens/scrap) | Server Only | Client cannot modify |
| Collection | Medium | Verify unlock source |
| Display Name | Client | Basic profanity filter |

---

## Game Center Integration Details

### Capacitor Plugin

Using `@openforge/capacitor-game-connect` for iOS Game Center:

```typescript
// services/gamecenter.ts
import { GameConnect } from '@openforge/capacitor-game-connect';
import { Capacitor } from '@capacitor/core';

export const GameCenterService = {
  async signIn(): Promise<string | null> {
    if (Capacitor.getPlatform() !== 'ios') return null;

    try {
      const result = await GameConnect.signIn();
      return result.playerId; // Game Center player ID
    } catch (e) {
      console.warn('Game Center sign-in failed:', e);
      return null;
    }
  },

  async submitScore(leaderboardId: string, score: number): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios') return;

    await GameConnect.submitScore({
      leaderboardID: leaderboardId,
      score: score,
    });
  },

  async unlockAchievement(achievementId: string): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios') return;

    await GameConnect.unlockAchievement({
      achievementID: achievementId,
    });
  },
};
```

### Dual Submission Strategy

When on iOS with Game Center:

```
┌─────────────────────────────────────────────────────────────────┐
│  Player completes run                                           │
│       │                                                         │
│       ▼                                                         │
│  Submit to Convex backend (primary)                             │
│       │                                                         │
│       ├──► Success ──► Also submit to Game Center               │
│       │                                                         │
│       └──► Failure ──► Queue for retry                          │
│                        (Game Center not updated)                │
└─────────────────────────────────────────────────────────────────┘
```

This ensures:
1. Convex is source of truth for cross-platform
2. Game Center receives scores for native iOS features
3. Network failures don't lose data

### Game Center Leaderboard Mapping

| Convex Score | Game Center Leaderboard |
|--------------|------------------------|
| roundsSurvived | `scorched_earth_rounds` |
| totalDamage | `scorched_earth_damage` |
| totalKills | `scorched_earth_kills` |

### Game Center Achievement Mapping

Map internal achievement IDs to Game Center achievement IDs:

```typescript
const GAME_CENTER_ACHIEVEMENTS = {
  'first_blood': 'scorched_earth.first_blood',
  'veteran': 'scorched_earth.veteran',
  'legend': 'scorched_earth.legend',
  // ... etc
};
```

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)

- [ ] Basic Convex schema (players, highScores)
- [ ] Anonymous authentication with deviceId
- [ ] Global leaderboard query
- [ ] Score submission with basic validation
- [ ] Client integration (submit on run end)

### Phase 2: Full Sync (Week 3-4)

- [ ] Achievement sync
- [ ] Collection sync
- [ ] Currency (tokens/scrap) server-side management
- [ ] Lifetime stats sync
- [ ] Conflict resolution

### Phase 3: Game Center (Week 5-6)

- [ ] Capacitor plugin integration
- [ ] Game Center authentication
- [ ] Account linking/migration
- [ ] Dual submission to Convex + Game Center
- [ ] Achievement mapping

### Phase 4: Anti-Cheat & Polish (Week 7-8)

- [ ] Enhanced validation rules
- [ ] Rate limiting
- [ ] Admin tools for score review
- [ ] Performance optimization
- [ ] Real-time leaderboard updates

---

## File Structure

```
convex/
  schema.ts              # Database schema
  players.ts             # Player management functions
  highScores.ts          # Leaderboard functions
  achievements.ts        # Achievement sync functions
  collection.ts          # Tank collection functions
  currency.ts            # Token/scrap functions
  sync.ts                # Full sync logic
  validation.ts          # Anti-cheat validation
  _generated/            # Auto-generated types

js/
  services/
    convex.js            # Convex client wrapper
    sync.js              # Sync orchestration
    gamecenter.js        # Game Center integration (iOS)
```

---

## References

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Schema Design](https://docs.convex.dev/database/schemas)
- [Apple Game Center Guide](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/GameKit_Guide/Introduction/Introduction.html)
- [Capacitor Game Connect Plugin](https://github.com/openforge/capacitor-game-connect)
- [WWDC20: Tap into Game Center](https://developer.apple.com/videos/play/wwdc2020/10619/)
