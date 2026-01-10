import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // === PLAYERS TABLE ===
  // Central player profile table. All other data references this.
  players: defineTable({
    // === Identity ===
    deviceId: v.string(), // Primary key for anonymous users
    gameCenterId: v.optional(v.string()), // Set when linked to Game Center
    displayName: v.string(), // Shown on leaderboards

    // === Profile ===
    createdAt: v.number(), // Timestamp of first seen
    lastSeenAt: v.number(), // Timestamp of last activity
    platform: v.string(), // "web" | "ios" | "android"

    // === Currency ===
    tokens: v.number(), // Current token balance
    scrap: v.number(), // Current scrap balance

    // === Equipped ===
    equippedTankId: v.string(), // Currently equipped tank skin

    // === Stats Summary (denormalized for quick access) ===
    highestRound: v.number(),
    totalWins: v.number(),
    totalKills: v.number(),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_gameCenterId", ["gameCenterId"])
    .index("by_displayName", ["displayName"]),

  // === HIGH SCORES TABLE ===
  // Global leaderboard entries. Each player can have multiple entries (one per run).
  highScores: defineTable({
    // === Player Reference ===
    playerId: v.id("players"),
    displayName: v.string(), // Denormalized for fast queries

    // === Score Data ===
    roundsSurvived: v.number(), // Primary ranking metric
    totalDamage: v.number(), // Tiebreaker
    enemiesDestroyed: v.number(),
    shotsFired: v.number(),
    shotsHit: v.number(),
    hitRate: v.number(), // 0-100 percentage
    biggestHit: v.number(),

    // === Metadata ===
    timestamp: v.number(), // When the run ended
    platform: v.string(), // Platform where achieved

    // === Anti-cheat ===
    validated: v.boolean(), // Server-side validation passed
    runHash: v.optional(v.string()), // Hash of run events (future)
  })
    .index("by_roundsSurvived", ["roundsSurvived"])
    .index("by_playerId", ["playerId"])
    .index("by_timestamp", ["timestamp"]),

  // === ACHIEVEMENTS TABLE ===
  // Achievement unlock records per player.
  achievements: defineTable({
    playerId: v.id("players"),
    achievementId: v.string(), // e.g., "first_blood", "veteran"

    // === Progress ===
    progress: v.number(), // Current progress (for counters)
    target: v.number(), // Required for completion

    // === State ===
    unlocked: v.boolean(),
    unlockedAt: v.optional(v.number()), // Timestamp when unlocked
    viewed: v.boolean(), // Has player seen this unlock?

    // === Reward ===
    tokenReward: v.number(), // Tokens awarded
    specialReward: v.optional(v.string()), // Tank skin ID if applicable
  })
    .index("by_playerId", ["playerId"])
    .index("by_playerId_achievementId", ["playerId", "achievementId"]),

  // === TANK COLLECTION TABLE ===
  // Owned tanks per player.
  tankCollection: defineTable({
    playerId: v.id("players"),
    tankId: v.string(), // e.g., "standard", "neon-rider"

    // === Ownership ===
    ownedAt: v.number(), // Timestamp of first acquisition
    duplicateCount: v.number(), // Times received after first
    source: v.string(), // "supply_drop" | "achievement" | "scrap_shop"

    // === State ===
    isNew: v.boolean(), // Not yet viewed in collection
  })
    .index("by_playerId", ["playerId"])
    .index("by_playerId_tankId", ["playerId", "tankId"]),

  // === LIFETIME STATS TABLE ===
  // Aggregate statistics per player (single record per player).
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
    bestSingleRoundAccuracy: v.number(), // 0-1 decimal

    // === Kills ===
    totalKills: v.number(),
    killsByWeapon: v.any(), // { weaponId: count }
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
    totalPlayTime: v.number(), // Milliseconds
    totalRuns: v.number(),
    firstPlayDate: v.number(),
    lastPlayDate: v.number(),
  }).index("by_playerId", ["playerId"]),

  // === SYNC QUEUE TABLE ===
  // Offline action queue for clients with poor connectivity.
  syncQueue: defineTable({
    // === Identity ===
    deviceId: v.string(), // Device that queued the action

    // === Action ===
    actionType: v.string(), // "submit_score" | "unlock_achievement" | etc.
    payload: v.any(), // Action-specific data

    // === Metadata ===
    clientTimestamp: v.number(), // When action occurred locally
    serverTimestamp: v.optional(v.number()), // When processed

    // === State ===
    status: v.string(), // "pending" | "processed" | "failed"
    errorMessage: v.optional(v.string()),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_status", ["status"]),
});
