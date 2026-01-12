import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get global leaderboard (top 100 by default)
 */
export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    // Get top scores ordered by rounds survived (descending)
    // Note: Convex indexes are ascending, so we use .order("desc")
    const scores = await ctx.db
      .query("highScores")
      .withIndex("by_roundsSurvived")
      .order("desc")
      .take(limit);

    // Fetch player deviceIds for highlighting
    const scoresWithDeviceId = await Promise.all(
      scores.map(async (score, index) => {
        const player = await ctx.db.get(score.playerId);
        return {
          rank: index + 1,
          ...score,
          deviceId: player?.deviceId ?? null,
        };
      })
    );

    return scoresWithDeviceId;
  },
});

/**
 * Get a player's personal best scores
 */
export const getPlayerScores = query({
  args: {
    deviceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // First get the player
    const player = await ctx.db
      .query("players")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (!player) {
      return [];
    }

    // Get player's scores ordered by timestamp (most recent first)
    const scores = await ctx.db
      .query("highScores")
      .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(limit);

    return scores;
  },
});

/**
 * Get a player's rank on the leaderboard
 */
export const getPlayerRank = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    // Get the player
    const player = await ctx.db
      .query("players")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (!player) {
      return null;
    }

    // Get player's best score
    const playerScores = await ctx.db
      .query("highScores")
      .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
      .collect();

    if (playerScores.length === 0) {
      return null;
    }

    // Find the best score by rounds survived
    const bestScore = playerScores.reduce((best, score) =>
      score.roundsSurvived > best.roundsSurvived ? score : best
    );

    // Count how many scores are better than the player's best
    // This is an approximation - for accurate ranking, we'd use a different approach
    const betterScores = await ctx.db
      .query("highScores")
      .withIndex("by_roundsSurvived")
      .filter((q) => q.gt(q.field("roundsSurvived"), bestScore.roundsSurvived))
      .collect();

    return {
      rank: betterScores.length + 1,
      score: bestScore,
    };
  },
});

// Validation rules for anti-cheat
const VALIDATION_RULES = {
  maxRoundsPerHour: 60,
  maxDamagePerRound: 500,
  maxKillsPerRound: 1,
  minRoundDuration: 5000,
  maxHitRate: 100,
};

// Rate limiting configuration (v2)
const RATE_LIMITS = {
  scoreSubmits: { max: 10, windowMs: 60000 }, // 10 scores per minute
};

/**
 * Validate run stats for reasonableness (anti-cheat)
 */
function validateRunStats(stats: {
  roundsSurvived: number;
  totalDamage: number;
  enemiesDestroyed: number;
  shotsFired: number;
  shotsHit: number;
  biggestHit: number;
}): { valid: boolean; reason?: string } {
  // Check if stats are physically possible
  if (stats.roundsSurvived < 0 || stats.roundsSurvived > 1000) {
    return { valid: false, reason: "Invalid rounds value" };
  }

  if (stats.totalDamage > stats.roundsSurvived * VALIDATION_RULES.maxDamagePerRound) {
    return { valid: false, reason: "Damage too high for rounds played" };
  }

  if (stats.enemiesDestroyed > stats.roundsSurvived) {
    return { valid: false, reason: "More enemies destroyed than rounds played" };
  }

  // Check hit rate sanity
  if (stats.shotsFired > 0) {
    const hitRate = stats.shotsHit / stats.shotsFired;
    if (hitRate > 1.0) {
      return { valid: false, reason: "More hits than shots" };
    }
  }

  if (stats.shotsHit < 0 || stats.shotsFired < 0) {
    return { valid: false, reason: "Invalid shot stats" };
  }

  return { valid: true };
}

/**
 * Submit a score from a completed run
 */
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
    // Get the player
    const player = await ctx.db
      .query("players")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (!player) {
      throw new Error("Player not found");
    }

    // Rate limiting: Check recent submissions
    const windowStart = Date.now() - RATE_LIMITS.scoreSubmits.windowMs;
    const recentScores = await ctx.db
      .query("highScores")
      .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
      .filter((q) => q.gte(q.field("timestamp"), windowStart))
      .collect();

    if (recentScores.length >= RATE_LIMITS.scoreSubmits.max) {
      throw new Error(
        `Rate limit exceeded: Maximum ${RATE_LIMITS.scoreSubmits.max} score submissions per minute`
      );
    }

    // Validate the stats
    const validation = validateRunStats(args.runStats);
    if (!validation.valid) {
      throw new Error(`Invalid score: ${validation.reason}`);
    }

    // Calculate hit rate
    const hitRate =
      args.runStats.shotsFired > 0
        ? Math.round((args.runStats.shotsHit / args.runStats.shotsFired) * 100)
        : 0;

    // Create the score entry
    const scoreId = await ctx.db.insert("highScores", {
      playerId: player._id,
      displayName: player.displayName,
      roundsSurvived: args.runStats.roundsSurvived,
      totalDamage: args.runStats.totalDamage,
      enemiesDestroyed: args.runStats.enemiesDestroyed,
      shotsFired: args.runStats.shotsFired,
      shotsHit: args.runStats.shotsHit,
      hitRate,
      biggestHit: args.runStats.biggestHit,
      timestamp: Date.now(),
      platform: player.platform,
      validated: true, // Validation passed (would have thrown if not)
    });

    // Update player's stats if this is a new best
    const updates: Record<string, number> = {
      lastSeenAt: Date.now(),
    };

    if (args.runStats.roundsSurvived > player.highestRound) {
      updates.highestRound = args.runStats.roundsSurvived;
    }

    // Count enemies destroyed as wins
    updates.totalKills = player.totalKills + args.runStats.enemiesDestroyed;

    await ctx.db.patch(player._id, updates);

    // Calculate rank
    const betterScores = await ctx.db
      .query("highScores")
      .withIndex("by_roundsSurvived")
      .filter((q) => q.gt(q.field("roundsSurvived"), args.runStats.roundsSurvived))
      .collect();

    const rank = betterScores.length + 1;
    const isTop100 = rank <= 100;
    const isNewBest = args.runStats.roundsSurvived > (player.highestRound ?? 0);

    return {
      rank: isTop100 ? rank : null,
      isNewBest,
      isTop100,
    };
  },
});
