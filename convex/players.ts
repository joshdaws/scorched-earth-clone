import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get a player by their device ID
 */
export const getPlayer = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
  },
});

/**
 * Get a player by their Game Center ID (for iOS Game Center integration)
 */
export const getPlayerByGameCenter = query({
  args: { gameCenterId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_gameCenterId", (q) => q.eq("gameCenterId", args.gameCenterId))
      .unique();
  },
});

/**
 * Create a new player (first launch)
 */
export const createPlayer = mutation({
  args: {
    deviceId: v.string(),
    displayName: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if player already exists
    const existing = await ctx.db
      .query("players")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (existing) {
      // Update last seen timestamp
      await ctx.db.patch(existing._id, { lastSeenAt: Date.now() });
      return existing;
    }

    // Create new player with defaults
    const now = Date.now();
    const playerId = await ctx.db.insert("players", {
      deviceId: args.deviceId,
      displayName: args.displayName,
      platform: args.platform,
      createdAt: now,
      lastSeenAt: now,
      tokens: 0,
      scrap: 0,
      equippedTankId: "standard",
      highestRound: 0,
      totalWins: 0,
      totalKills: 0,
    });

    // Initialize lifetime stats
    await ctx.db.insert("lifetimeStats", {
      playerId,
      totalWins: 0,
      totalLosses: 0,
      totalRounds: 0,
      highestRound: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      biggestHit: 0,
      totalShotsFired: 0,
      totalShotsHit: 0,
      bestSingleRoundAccuracy: 0,
      totalKills: 0,
      killsByWeapon: {},
      flawlessWins: 0,
      longestWinStreak: 0,
      currentWinStreak: 0,
      totalMoneyEarned: 0,
      totalMoneySpent: 0,
      totalTokensEarned: 0,
      totalTokensSpent: 0,
      tanksUnlocked: 1, // Start with standard tank
      supplyDropsOpened: 0,
      achievementsUnlocked: 0,
      totalPlayTime: 0,
      totalRuns: 0,
      firstPlayDate: now,
      lastPlayDate: now,
    });

    // Add standard tank to collection
    await ctx.db.insert("tankCollection", {
      playerId,
      tankId: "standard",
      ownedAt: now,
      duplicateCount: 0,
      source: "default",
      isNew: false,
    });

    return await ctx.db.get(playerId);
  },
});

/**
 * Update a player's display name
 */
export const updateDisplayName = mutation({
  args: {
    deviceId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (!player) {
      throw new Error("Player not found");
    }

    await ctx.db.patch(player._id, {
      displayName: args.displayName,
      lastSeenAt: Date.now(),
    });
  },
});

/**
 * Link a Game Center account to an existing player (migration path)
 */
export const linkGameCenterAccount = mutation({
  args: {
    deviceId: v.string(),
    gameCenterId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    // Find existing player by device ID
    const player = await ctx.db
      .query("players")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (!player) {
      throw new Error("Player not found for device ID");
    }

    // Check if Game Center ID is already linked to another account
    const existingGC = await ctx.db
      .query("players")
      .withIndex("by_gameCenterId", (q) => q.eq("gameCenterId", args.gameCenterId))
      .unique();

    if (existingGC && existingGC._id !== player._id) {
      throw new Error("Game Center account already linked to another player");
    }

    // Link Game Center account
    await ctx.db.patch(player._id, {
      gameCenterId: args.gameCenterId,
      displayName: args.displayName,
      lastSeenAt: Date.now(),
    });

    return await ctx.db.get(player._id);
  },
});

/**
 * Update player's last seen timestamp
 */
export const updateLastSeen = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (player) {
      await ctx.db.patch(player._id, { lastSeenAt: Date.now() });
    }
  },
});
