# Convex Backend Setup

This directory contains the Convex backend for Scorched Earth, providing:
- Global leaderboards
- Player profiles
- Achievement sync
- Tank collection management
- Future Game Center integration

## First-Time Setup

The Convex project requires manual initialization (interactive CLI). Run these commands in your terminal:

### 1. Initialize Convex Project

```bash
# From project root
npx convex dev --once --configure=new
```

This will:
1. Prompt for a project name (use `scorched-earth`)
2. Ask about cloud vs local deployment (choose `cloud deployment`)
3. Create `.env.local` with your deployment URL
4. Deploy the schema and functions

### 2. Verify Setup

After initialization, you should see:
- `.env.local` file with `CONVEX_DEPLOYMENT` variable
- `convex/_generated/` directory with generated types

### 3. Development Mode

For ongoing development:

```bash
npx convex dev
```

This watches for changes and auto-deploys to your dev deployment.

## Project Structure

```
convex/
  schema.ts          # Database schema (6 tables)
  players.ts         # Player management functions
  highScores.ts      # Leaderboard functions
  _generated/        # Auto-generated types (after init)
```

## Schema Overview

| Table | Purpose |
|-------|---------|
| `players` | Central player profiles with identity, currency, and stats |
| `highScores` | Global leaderboard entries |
| `achievements` | Achievement unlock records per player |
| `tankCollection` | Owned tanks per player |
| `lifetimeStats` | Aggregate statistics per player |
| `syncQueue` | Offline action queue for poor connectivity |

## API Functions

### Players
- `getPlayer({ deviceId })` - Get player by device ID
- `createPlayer({ deviceId, displayName, platform })` - Create new player
- `updateDisplayName({ deviceId, displayName })` - Update display name
- `linkGameCenterAccount({ deviceId, gameCenterId, displayName })` - Link Game Center

### High Scores
- `getLeaderboard({ limit? })` - Get global top scores
- `getPlayerScores({ deviceId, limit? })` - Get player's scores
- `getPlayerRank({ deviceId })` - Get player's rank
- `submitScore({ deviceId, runStats })` - Submit a score

## Environment Variables

After setup, these will be in `.env.local`:

```
CONVEX_DEPLOYMENT=dev:your-deployment-name
```

## Troubleshooting

### "Cannot prompt for input in non-interactive terminals"
Run the CLI in an interactive terminal (not in CI/CD without deploy keys).

### "No CONVEX_DEPLOYMENT set"
Run `npx convex dev` to initialize or check that `.env.local` exists.

### Schema not deploying
Ensure the schema compiles: `npx convex codegen`
