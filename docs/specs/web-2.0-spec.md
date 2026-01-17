# Scorched Earth: Synthwave Edition - Web 2.0 Specification

**Document Version:** 1.0
**Date:** January 17, 2026
**Purpose:** Definitive specification for the web-first implementation of Scorched Earth: Synthwave Edition

---

## Executive Summary

### Vision

Scorched Earth: Synthwave Edition is a modern reimagining of the classic 1991 DOS artillery game, rebuilt with synthwave aesthetics and modern web technologies. The game delivers turn-based artillery combat with destructible terrain, a roguelike progression system, and full 80s synthwave visual design.

### Current State

The web codebase is **production-grade and feature-complete** with:
- **57 JavaScript modules** (~45,000 lines of code)
- **13 game states** with proper state machine
- **11 unique weapons** with distinct physics behaviors
- **4 AI difficulty levels** with ballistic calculation
- **40+ achievements** with token reward system
- **Full particle effects system** with color gradients
- **Complete audio system** with music ducking
- **Responsive mobile UI** with safe area support
- **Roguelike progression** with run tracking and permadeath
- **Tank collection system** with 5 rarity tiers (34 skins)
- **Supply drop gacha system** with pity mechanics

### What's Missing (Gap Analysis)

Based on cross-referencing against artillery game best practices, the original Scorched Earth, and the archived Unity spec, the following gaps exist:

| Category | Current State | 2.0 Target | Priority |
|----------|--------------|------------|----------|
| **Progression** | Endless roguelike rounds | 60 levels across 6 worlds + star ratings | P1 |
| **Controls** | Sliders only | Hybrid slingshot + sliders (player choice) | P1 |
| **Weapons** | 11 weapons | 40 weapons at launch | P1 |
| **Daily Engagement** | None | Daily challenges + login rewards | P1 |
| **Monetization** | None | Freemium (rewarded ads + premium upgrade + IAP) | P1 |
| **Multiplayer** | None | Pass-and-play local (Phase 1) | P2 |
| **Events/LiveOps** | None | Weekly events, seasonal content | P2 |
| **Trajectory Preview** | None | Full preview with wind compensation | P1 |

### Timeline Estimate

**12-16 weeks** for 2.0 launch (assuming single developer):
- Weeks 1-2: Level-based progression system
- Weeks 3-4: Trajectory preview + slingshot controls
- Weeks 5-6: Expanded weapon roster (40 weapons)
- Weeks 7-8: Daily challenges and engagement systems
- Weeks 9-10: Monetization integration (ads, IAP)
- Weeks 11-12: Content creation (60 levels)
- Weeks 13-16: Polish, beta testing, launch

---

## 1. Current State Assessment

### 1.1 Codebase Inventory

#### Core Systems (Fully Implemented)

| System | File(s) | Lines | Status | Notes |
|--------|---------|-------|--------|-------|
| **Game Loop** | `main.js`, `game.js` | 5,926 | Complete | Fixed timestep, 13 states, transition hooks |
| **State Machine** | `game.js` | 499 | Complete | MENU, PLAYING, AIMING, FIRING, PAUSED, SHOP, etc. |
| **Renderer** | `renderer.js` | 252 | Complete | Dynamic sizing, DPR scaling, safe areas |
| **Input** | `input.js` | 791 | Complete | Unified pointer API (mouse + touch + keyboard) |
| **Assets** | `assets.js` | ~300 | Complete | Manifest-based loading, lazy initialization |

#### Gameplay Systems (Fully Implemented)

| System | File(s) | Lines | Status | Notes |
|--------|---------|-------|--------|-------|
| **Tank** | `tank.js` | 906 | Complete | Health, inventory, turret, falling, damage |
| **Terrain** | `terrain.js` | 621 | Complete | Float32Array heightmap, destruction, settling |
| **Projectile** | `projectile.js` | 1,071 | Complete | Ballistics, gravity, wind, MIRV, roller, digger |
| **Weapons** | `weapons.js` | 367 | Complete | 11 weapons, registry pattern, purchasable |
| **AI** | `ai.js` | 1,528 | Complete | 4 difficulties, ballistic calculation |
| **Damage** | `damage.js` | ~300 | Complete | Blast radius, falloff, splash |
| **Wind** | `wind.js` | ~150 | Complete | Random per round, visual indicator |

#### Progression & Meta (Fully Implemented)

| System | File(s) | Lines | Status | Notes |
|--------|---------|-------|--------|-------|
| **Run State** | `runState.js` | ~300 | Complete | Roguelike tracking, permadeath |
| **Economy** | `money.js` | ~200 | Complete | Coins, damage rewards |
| **Shop** | `shop.js` | 1,949 | Complete | Categories, purchase flow, animations |
| **Achievements** | `achievements.js` + 5 files | ~2,700 | Complete | 40+ achievements, 6 categories, tokens |
| **Supply Drops** | `supply-drop.js`, `drop-rates.js` | ~2,600 | Complete | Full animation, rarity system, pity |
| **Tank Collection** | `tank-collection.js`, `tank-skins.js` | ~1,000 | Complete | 34 skins, 5 rarities, equipping |
| **High Scores** | `highScores.js` | 694 | Complete | Top scores, name entry |
| **Lifetime Stats** | `lifetime-stats.js` | 629 | Complete | Career statistics |

#### Visual & Audio (Fully Implemented)

| System | File(s) | Lines | Status | Notes |
|--------|---------|-------|--------|-------|
| **Effects** | `effects.js` | 1,616 | Complete | Particles, screen shake, flash, CRT |
| **Sound** | `sound.js` | 2,579 | Complete | Web Audio, pooling, ducking |
| **Music** | `music.js` | 816 | Complete | Crossfading, volume control |
| **Title Scene** | `titleScene/titleScene.js` | 23,950 | Complete | Three.js 3D synthwave grid |

#### UI Systems (Fully Implemented)

| System | File(s) | Lines | Status | Notes |
|--------|---------|-------|--------|-------|
| **HUD** | `ui.js` | 2,290 | Complete | Health, weapons, money, wind |
| **Aiming** | `aimingControls.js`, `touchAiming.js` | ~1,400 | Complete | Sliders, keyboard, touch |
| **Menus** | `pauseMenu.js`, various | ~1,500 | Complete | Pause, victory, defeat, transitions |
| **Volume** | `volumeControls.js` | 617 | Complete | Master, music, SFX sliders |

### 1.2 Technical Architecture

**Module Organization:**
- Pure ES6 modules (no bundler required)
- Single responsibility principle
- Registry pattern (weapons, achievements)
- State machine pattern (game flow)
- Callback system (lifecycle hooks)

**Coordinate Systems:**
- Design coordinates: 1200×800 (base)
- Canvas coordinates: scaled by devicePixelRatio
- Screen coordinates: dynamic (fills viewport)
- Terrain height: from bottom (inverted Y)

**Physics:**
- Fixed timestep (16.67ms) for consistency
- Gravity: 0.15 px/frame²
- Wind: -10 to +10 px/frame horizontal acceleration
- Collision: circle/heightmap-based

**Performance:**
- Object pooling for particles
- Deferred array filtering
- Float32Array for terrain heightmap
- Lazy-loaded audio buffers
- Debounced resize events

### 1.3 What Works Well

1. **Solid Core Gameplay** - Turn-based artillery with satisfying physics
2. **Synthwave Aesthetic** - Neon colors, CRT effects, animated title screen
3. **Responsive Design** - Works on mobile and desktop
4. **Roguelike Loop** - Run tracking, permadeath, supply drops create engagement
5. **Achievement System** - 40+ achievements with token rewards
6. **Tank Collection** - Gacha mechanics with pity system

### 1.4 What Needs Work

1. **No Trajectory Preview** - Players must guess projectile path
2. **Sliders Only** - Missing slingshot controls for mobile
3. **Limited Weapons** - 11 vs 40+ target
4. **No Daily Engagement** - Missing login rewards, daily challenges
5. **No Monetization** - No ads, no IAP infrastructure
6. **Endless Mode Only** - No structured level progression with stars
7. **No Multiplayer** - Single player only

---

## 2. Feature Specifications

### 2.1 Level-Based Progression System

#### Overview

Replace endless roguelike rounds with structured level-based progression featuring star ratings, world progression, and unlock gates.

#### Structure

```
6 Worlds × 10 Levels = 60 Total Levels

World 1: Neon Wasteland (Tutorial + Easy)
World 2: Cyber City (Medium)
World 3: Retro Ridge (Medium-Hard)
World 4: Digital Desert (Hard, wind mechanics)
World 5: Pixel Paradise (Very Hard)
World 6: Synthwave Summit (Expert)
```

#### Star Rating System

Each level awards 1-3 stars based on performance:

| Stars | Criteria |
|-------|----------|
| 1★ | Win the match |
| 2★★ | Win + deal X damage (efficiency bonus) |
| 3★★★ | Win + ≥70% accuracy + complete in Y turns |

#### Progression Gating

| World | Star Requirement |
|-------|-----------------|
| World 1 | 0 (unlocked) |
| World 2 | 15 stars |
| World 3 | 35 stars |
| World 4 | 60 stars |
| World 5 | 90 stars |
| World 6 | 125 stars |

#### Level Data Structure

```javascript
// New file: js/levels.js
const LevelRegistry = {
  levels: {
    'world1-level1': {
      id: 'world1-level1',
      world: 1,
      level: 1,
      name: 'First Shot',
      difficulty: 'tutorial',
      aiDifficulty: 'easy',
      enemyHealth: 80,
      playerHealth: 100,
      wind: { min: -2, max: 2 },
      terrain: { style: 'gentle', minHeight: 150, maxHeight: 350 },
      star2Damage: 60,
      star3Accuracy: 0.7,
      star3MaxTurns: 8,
      tutorialTips: ['angle', 'power', 'fire'],
      rewards: { coins: 100, firstClear: 50 }
    },
    // ... 59 more levels
  },

  getLevel(id) { /* ... */ },
  getLevelsByWorld(worldNum) { /* ... */ },
  getNextLevel(currentId) { /* ... */ },
  isWorldUnlocked(worldNum, totalStars) { /* ... */ }
};
```

#### Migration from Roguelike Mode

- Keep roguelike as "Endless Mode" accessible from main menu
- Roguelike uses progressive difficulty scaling (current behavior)
- Level mode becomes default/primary game mode
- Shared systems: weapons, tank collection, achievements, economy

#### UI Changes

- **Level Select Screen**: World map with level grid (10 levels per world)
- **Level Complete Screen**: Star animation, score breakdown, rewards
- **World Unlock**: Celebration animation when reaching star threshold

### 2.2 Trajectory Preview System

#### Overview

Add real-time trajectory visualization during aiming to improve accessibility and match industry standards (Angry Birds, etc.).

#### Implementation

```javascript
// New file: js/trajectoryPreview.js
class TrajectoryPreview {
  constructor(terrain) {
    this.terrain = terrain;
    this.points = [];
    this.maxPoints = 60;
    this.timeStep = 0.016; // 16ms per frame
    this.visible = true;
  }

  calculate(startX, startY, angle, power, windSpeed) {
    this.points = [];

    // Convert angle to radians
    const radians = angle * (Math.PI / 180);

    // Initial velocity
    const velocityScale = PROJECTILE.MAX_VELOCITY / 100;
    let vx = Math.cos(radians) * power * velocityScale;
    let vy = -Math.sin(radians) * power * velocityScale; // Negative = upward

    let x = startX;
    let y = startY;

    for (let i = 0; i < this.maxPoints; i++) {
      this.points.push({ x, y });

      // Apply physics
      vx += windSpeed * this.timeStep;
      vy += PHYSICS.GRAVITY * this.timeStep;

      x += vx * this.timeStep;
      y += vy * this.timeStep;

      // Stop at terrain collision
      const terrainY = this.terrain.getHeight(Math.floor(x));
      if (y >= terrainY) {
        this.points.push({ x, y: terrainY }); // End at impact
        break;
      }

      // Stop at screen bounds
      if (x < 0 || x > this.terrain.width || y > this.terrain.screenHeight) {
        break;
      }
    }
  }

  render(ctx) {
    if (!this.visible || this.points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }

    ctx.stroke();

    // Draw impact marker
    const lastPoint = this.points[this.points.length - 1];
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.restore();
  }

  setVisible(visible) {
    this.visible = visible;
  }
}
```

#### Settings Integration

```javascript
// In settings/options
const trajectorySettings = {
  mode: 'full', // 'full', 'partial', 'none'
  // full: Shows entire predicted path
  // partial: Shows first half only (harder)
  // none: Classic mode (hardest)
};
```

#### Difficulty Integration

| Difficulty | Trajectory Preview |
|------------|-------------------|
| Easy | Full preview |
| Medium | Full preview |
| Hard | Partial preview |
| Hard+ | No preview |

### 2.3 Slingshot Control System

#### Overview

Add alternative slingshot/drag-to-aim control scheme as the default for mobile, while keeping sliders as an option.

#### Implementation

```javascript
// New file: js/slingshotAiming.js
class SlingshotAiming {
  constructor(tank, terrain, trajectoryPreview) {
    this.tank = tank;
    this.terrain = terrain;
    this.preview = trajectoryPreview;

    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;

    this.maxDragDistance = 150;
    this.sensitivityAngle = 1.0;
    this.sensitivityPower = 1.0;
  }

  onPointerDown(x, y) {
    // Check if touch is near tank
    const tankPos = this.tank.getPosition();
    const distance = Math.hypot(x - tankPos.x, y - tankPos.y);

    if (distance < 80) { // Generous hit area for touch
      this.isDragging = true;
      this.dragStart = { x, y };
      this.dragCurrent = { x, y };
    }
  }

  onPointerMove(x, y) {
    if (!this.isDragging) return;

    this.dragCurrent = { x, y };

    // Calculate angle and power from drag vector
    const dx = this.dragStart.x - x; // Drag backward = fire forward
    const dy = this.dragStart.y - y;

    // Angle: atan2 gives direction, convert to 0-180 range
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = Math.max(0, Math.min(180, angle + 90)); // Normalize to turret range

    // Power: distance from start point, clamped
    const dragDistance = Math.min(Math.hypot(dx, dy), this.maxDragDistance);
    const power = (dragDistance / this.maxDragDistance) * 100;

    // Update tank
    this.tank.setAngle(angle);
    this.tank.setPower(power);

    // Update preview
    this.preview.calculate(
      this.tank.getFirePosition().x,
      this.tank.getFirePosition().y,
      angle,
      power,
      Wind.getSpeed()
    );
  }

  onPointerUp() {
    if (this.isDragging) {
      this.isDragging = false;
      return { shouldFire: true };
    }
    return { shouldFire: false };
  }

  render(ctx) {
    if (!this.isDragging) return;

    const tankPos = this.tank.getPosition();

    // Draw rubber band line
    ctx.save();
    ctx.strokeStyle = COLORS.NEON_PINK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tankPos.x, tankPos.y);
    ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
    ctx.stroke();

    // Draw pull indicator circle
    ctx.beginPath();
    ctx.arc(this.dragCurrent.x, this.dragCurrent.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 20, 147, 0.5)';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  cancel() {
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
  }
}
```

#### Control Mode Selection

```javascript
// In settings
const controlModes = {
  SLINGSHOT: 'slingshot',
  SLIDERS: 'sliders',
  HYBRID: 'hybrid' // Sliders visible, but drag also works
};

// Default based on platform
function getDefaultControlMode() {
  if (isTouchDevice()) {
    return controlModes.SLINGSHOT;
  }
  return controlModes.SLIDERS;
}
```

### 2.4 Expanded Weapon Roster

#### Overview

Expand from 11 to 40 weapons at launch, organized into categories with progressive unlocks.

#### Weapon Categories

| Category | Weapons (11 → 40) |
|----------|-------------------|
| **Standard** (8) | Baby Shot, Basic Shot, Missile, Big Shot, Mega Shot, Armor Piercer, Tracer, Precision Strike |
| **Splitting** (6) | MIRV, Death's Head, Cluster Bomb, Chain Reaction, Scatter Shot, Fireworks |
| **Rolling** (6) | Roller, Heavy Roller, Bouncer, Super Bouncer, Land Mine, Sticky Bomb |
| **Digging** (6) | Digger, Heavy Digger, Sandhog, Drill, Laser Drill, Tunnel Maker |
| **Nuclear** (6) | Mini Nuke, Nuke, Tactical Nuke, Neutron Bomb, EMP Blast, Fusion Strike |
| **Special** (8) | Napalm, Liquid Dirt, Teleporter, Shield Buster, Wind Bomb, Gravity Well, Lightning Strike, Ion Cannon |

#### New Weapon Definitions

```javascript
// Additions to weapons.js
const NEW_WEAPONS = [
  // Standard Category
  {
    id: 'baby-shot',
    name: 'Baby Shot',
    type: 'standard',
    cost: 0,
    startingAmmo: Infinity,
    damage: 15,
    blastRadius: 20,
    description: 'Tiny but free'
  },
  {
    id: 'mega-shot',
    name: 'Mega Shot',
    type: 'standard',
    cost: 3000,
    startingAmmo: 2,
    damage: 70,
    blastRadius: 70,
    description: 'Massive explosive round'
  },
  {
    id: 'armor-piercer',
    name: 'Armor Piercer',
    type: 'standard',
    cost: 2500,
    startingAmmo: 3,
    damage: 55,
    blastRadius: 15,
    penetration: true,
    description: 'High damage, small blast'
  },

  // Splitting Category
  {
    id: 'cluster-bomb',
    name: 'Cluster Bomb',
    type: 'splitting',
    cost: 4000,
    startingAmmo: 2,
    damage: 12,
    splitCount: 8,
    blastRadius: 25,
    description: 'Splits into 8 mini bombs'
  },
  {
    id: 'chain-reaction',
    name: 'Chain Reaction',
    type: 'splitting',
    cost: 6000,
    startingAmmo: 1,
    damage: 20,
    chainDepth: 3,
    blastRadius: 30,
    description: 'Each explosion spawns more explosions'
  },

  // Rolling Category
  {
    id: 'bouncer',
    name: 'Bouncer',
    type: 'rolling',
    cost: 2000,
    startingAmmo: 3,
    damage: 25,
    bounces: 3,
    blastRadius: 30,
    description: 'Bounces off terrain 3 times'
  },
  {
    id: 'land-mine',
    name: 'Land Mine',
    type: 'rolling',
    cost: 1500,
    startingAmmo: 5,
    damage: 40,
    blastRadius: 35,
    deployable: true,
    description: 'Rolls to position, explodes when enemy approaches'
  },

  // Digging Category
  {
    id: 'sandhog',
    name: 'Sandhog',
    type: 'digging',
    cost: 4000,
    startingAmmo: 2,
    damage: 35,
    tunnelLength: 200,
    bypassShields: true,
    description: 'Tunnels under defenses'
  },
  {
    id: 'laser-drill',
    name: 'Laser Drill',
    type: 'digging',
    cost: 5000,
    startingAmmo: 2,
    damage: 40,
    tunnelWidth: 50,
    continuous: true,
    description: 'Wide beam cuts through everything'
  },

  // Nuclear Category
  {
    id: 'tactical-nuke',
    name: 'Tactical Nuke',
    type: 'nuclear',
    cost: 12000,
    startingAmmo: 1,
    damage: 90,
    blastRadius: 120,
    fallout: true,
    description: 'Large blast with lingering damage zone'
  },
  {
    id: 'emp-blast',
    name: 'EMP Blast',
    type: 'nuclear',
    cost: 8000,
    startingAmmo: 1,
    damage: 30,
    blastRadius: 150,
    disableWeapons: true,
    description: 'Disables advanced weapons for 3 turns'
  },

  // Special Category
  {
    id: 'napalm',
    name: 'Napalm',
    type: 'special',
    cost: 3500,
    startingAmmo: 3,
    damage: 8,
    burning: true,
    burnDuration: 5,
    burnDamage: 5,
    description: 'Creates burning pools'
  },
  {
    id: 'liquid-dirt',
    name: 'Liquid Dirt',
    type: 'special',
    cost: 2500,
    startingAmmo: 4,
    damage: 0,
    dirtAmount: 100,
    description: 'Buries enemy in dirt'
  },
  {
    id: 'gravity-well',
    name: 'Gravity Well',
    type: 'special',
    cost: 7000,
    startingAmmo: 1,
    damage: 50,
    pullRadius: 200,
    description: 'Pulls tanks toward explosion center'
  },
  // ... more weapons
];
```

#### Unlock Structure

| Unlock Method | Example |
|---------------|---------|
| **Level Completion** | Basic Shot → Baby Shot (World 1-3) |
| **Star Milestones** | 30 stars → Cluster Bomb |
| **Coins Purchase** | 5000 coins → Gravity Well |
| **Achievement** | "Win 10 matches" → Lightning Strike |
| **Supply Drop** | Random chance at rare weapons |

### 2.5 Daily Engagement System

#### Daily Login Rewards

7-day escalating cycle:

| Day | Reward |
|-----|--------|
| 1 | 100 coins |
| 2 | 150 coins |
| 3 | 200 coins |
| 4 | 1× Nuke (consumable) |
| 5 | 300 coins |
| 6 | Random tank skin |
| 7 | 500 coins + 50 tokens + supply drop |

Implementation:

```javascript
// New file: js/dailyRewards.js
const DailyRewards = {
  rewards: [
    { day: 1, type: 'coins', amount: 100 },
    { day: 2, type: 'coins', amount: 150 },
    { day: 3, type: 'coins', amount: 200 },
    { day: 4, type: 'weapon', weaponId: 'nuke', amount: 1 },
    { day: 5, type: 'coins', amount: 300 },
    { day: 6, type: 'skin', rarity: 'random' },
    { day: 7, type: 'bundle', contents: [
      { type: 'coins', amount: 500 },
      { type: 'tokens', amount: 50 },
      { type: 'supply-drop', amount: 1 }
    ]}
  ],

  state: {
    currentDay: 0,
    lastClaimDate: null,
    streak: 0
  },

  canClaim() {
    if (!this.state.lastClaimDate) return true;

    const now = new Date();
    const last = new Date(this.state.lastClaimDate);
    const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));

    return daysSince >= 1;
  },

  claim() {
    if (!this.canClaim()) return null;

    const now = new Date();
    const last = this.state.lastClaimDate ? new Date(this.state.lastClaimDate) : null;

    // Check streak continuation (24-48 hours grace period)
    if (last) {
      const hoursSince = (now - last) / (1000 * 60 * 60);
      if (hoursSince > 48) {
        this.state.streak = 0;
        this.state.currentDay = 0;
      }
    }

    this.state.currentDay = (this.state.currentDay % 7) + 1;
    this.state.streak++;
    this.state.lastClaimDate = now.toISOString();

    this.save();

    return this.rewards[this.state.currentDay - 1];
  },

  save() {
    localStorage.setItem('dailyRewards', JSON.stringify(this.state));
  },

  load() {
    const saved = localStorage.getItem('dailyRewards');
    if (saved) {
      this.state = JSON.parse(saved);
    }
  }
};
```

#### Daily Challenges

3 challenges per day, refreshing at midnight UTC:

```javascript
// New file: js/dailyChallenges.js
const ChallengeTypes = {
  WIN_MATCHES: { id: 'win_matches', template: 'Win {count} matches', rewardBase: 50 },
  DEAL_DAMAGE: { id: 'deal_damage', template: 'Deal {count} total damage', rewardBase: 30 },
  USE_WEAPON: { id: 'use_weapon', template: 'Win using {weapon}', rewardBase: 75 },
  ACCURACY: { id: 'accuracy', template: 'Achieve {count}% accuracy in a match', rewardBase: 100 },
  PERFECT_WIN: { id: 'perfect_win', template: 'Win without taking damage', rewardBase: 150 },
  STAR_COUNT: { id: 'star_count', template: 'Earn {count} stars', rewardBase: 40 },
  WORLD_COMPLETE: { id: 'world_complete', template: 'Complete any level in World {world}', rewardBase: 60 }
};

const DailyChallenges = {
  challenges: [],

  generate() {
    // Use date as seed for consistent daily challenges across users
    const today = new Date().toISOString().split('T')[0];
    const seed = hashString(today);
    const rng = seededRandom(seed);

    this.challenges = [];
    const types = Object.values(ChallengeTypes);

    for (let i = 0; i < 3; i++) {
      const type = types[Math.floor(rng() * types.length)];
      const challenge = this.createChallenge(type, i + 1, rng);
      this.challenges.push(challenge);
    }

    // Bonus for completing all 3
    this.bonusReward = { coins: 200, supplyDrop: 1 };
  },

  createChallenge(type, tier, rng) {
    const params = this.getParamsForTier(type, tier, rng);
    return {
      id: `${type.id}_${tier}`,
      type: type.id,
      description: type.template.replace(/{(\w+)}/g, (_, key) => params[key] || ''),
      params,
      progress: 0,
      target: params.count || 1,
      reward: Math.floor(type.rewardBase * tier),
      completed: false
    };
  },

  updateProgress(eventType, data) {
    this.challenges.forEach(challenge => {
      if (challenge.completed) return;

      const progress = this.calculateProgress(challenge, eventType, data);
      challenge.progress = Math.min(challenge.progress + progress, challenge.target);

      if (challenge.progress >= challenge.target) {
        challenge.completed = true;
        this.awardReward(challenge);
      }
    });

    // Check bonus completion
    if (this.challenges.every(c => c.completed)) {
      this.awardBonus();
    }

    this.save();
  }
};
```

### 2.6 Monetization System

#### Business Model: Freemium

```
Revenue Streams:
├─ Free Download (full game playable)
│  ├─ Rewarded video ads (opt-in for bonuses)
│  └─ Interstitial ads (between rounds, skippable)
│
├─ Premium Upgrade ($4.99)
│  ├─ Remove all ads permanently
│  ├─ 2× coin earn rate
│  ├─ Exclusive "Retro Classic" tank skin pack
│  ├─ Daily premium bonus (500 coins/day)
│  └─ Early access to new weapons
│
└─ Optional IAPs
   ├─ Coin packs ($0.99-$9.99)
   ├─ Token packs ($0.99-$4.99)
   └─ Tank skin bundles ($1.99-$2.99)
```

#### Ad Integration

```javascript
// New file: js/ads.js
const Ads = {
  config: {
    rewardedVideoEnabled: true,
    interstitialEnabled: true,
    interstitialFrequency: 3, // Show every N rounds (non-premium)
    maxAdsPerHour: 5
  },

  state: {
    roundsSinceAd: 0,
    adsShownThisHour: 0,
    lastAdTime: null
  },

  // Rewarded video opportunities
  opportunities: {
    DOUBLE_COINS: { reward: { type: 'multiply', target: 'coins', factor: 2 } },
    CONTINUE_BATTLE: { reward: { type: 'heal', amount: 50 } },
    FREE_WEAPON: { reward: { type: 'weapon', random: true } },
    SUPPLY_DROP: { reward: { type: 'supplyDrop', amount: 1 } }
  },

  async showRewardedVideo(opportunity) {
    if (this.isPremium()) return this.grantReward(opportunity); // Premium = instant reward

    // Integrate with ad provider (Capacitor plugin)
    try {
      await AdProvider.showRewardedVideo();
      this.grantReward(opportunity);
      this.trackAdShown();
    } catch (e) {
      console.log('Ad not available or cancelled');
    }
  },

  shouldShowInterstitial() {
    if (this.isPremium()) return false;
    if (this.adsShownThisHour >= this.config.maxAdsPerHour) return false;

    this.state.roundsSinceAd++;
    return this.state.roundsSinceAd >= this.config.interstitialFrequency;
  },

  async showInterstitial() {
    if (!this.shouldShowInterstitial()) return;

    try {
      await AdProvider.showInterstitial();
      this.state.roundsSinceAd = 0;
      this.trackAdShown();
    } catch (e) {
      // Continue without ad
    }
  },

  isPremium() {
    return Store.isPurchased('premium_upgrade');
  }
};
```

#### IAP Integration

```javascript
// New file: js/store.js (via Capacitor)
const Store = {
  products: {
    'premium_upgrade': { id: 'premium_upgrade', price: 4.99, type: 'non-consumable' },
    'coins_small': { id: 'coins_small', price: 0.99, coins: 1000 },
    'coins_medium': { id: 'coins_medium', price: 2.99, coins: 3500 },
    'coins_large': { id: 'coins_large', price: 4.99, coins: 7000, bonus: '+40%' },
    'tokens_pack': { id: 'tokens_pack', price: 1.99, tokens: 100 }
  },

  purchases: [],

  async initialize() {
    // Capacitor In-App Purchase plugin
    if (Capacitor.isNativePlatform()) {
      await InAppPurchase.initialize();
      this.loadPurchases();
    }
  },

  async purchase(productId) {
    const product = this.products[productId];
    if (!product) return { success: false };

    try {
      const result = await InAppPurchase.purchase(product.id);

      if (result.success) {
        this.grantPurchase(product);
        this.purchases.push(productId);
        this.savePurchases();
        return { success: true };
      }
    } catch (e) {
      console.error('Purchase failed:', e);
    }

    return { success: false };
  },

  isPurchased(productId) {
    return this.purchases.includes(productId);
  },

  async restorePurchases() {
    const restored = await InAppPurchase.restore();
    this.purchases = restored.map(r => r.productId);
    this.savePurchases();
  }
};
```

---

## 3. Technical Architecture

### 3.1 Module Organization (2.0)

```
js/
├── core/
│   ├── main.js          (entry point, initialization)
│   ├── game.js          (state machine, loop)
│   ├── constants.js     (all game constants)
│   └── events.js        (new: event bus for decoupling)
│
├── rendering/
│   ├── renderer.js      (canvas management)
│   ├── effects.js       (particles, shake, flash)
│   └── ui.js            (HUD rendering)
│
├── gameplay/
│   ├── terrain.js       (heightmap, destruction)
│   ├── tank.js          (tank entity)
│   ├── projectile.js    (ballistics)
│   ├── weapons.js       (weapon registry)
│   ├── ai.js            (opponent logic)
│   ├── damage.js        (damage calculation)
│   └── wind.js          (wind system)
│
├── controls/
│   ├── input.js         (unified input)
│   ├── aimingControls.js (slider controls)
│   ├── slingshotAiming.js (new: drag controls)
│   └── trajectoryPreview.js (new: trajectory viz)
│
├── progression/
│   ├── levels.js        (new: level registry)
│   ├── stars.js         (new: star calculation)
│   ├── runState.js      (roguelike tracking)
│   ├── achievements.js  (achievement system)
│   └── unlocks.js       (new: unlock manager)
│
├── engagement/
│   ├── dailyRewards.js  (new: login rewards)
│   ├── dailyChallenges.js (new: daily challenges)
│   └── events.js        (new: weekly events)
│
├── economy/
│   ├── money.js         (coins)
│   ├── tokens.js        (tokens)
│   ├── shop.js          (shop UI)
│   └── store.js         (new: IAP integration)
│
├── collection/
│   ├── tank-collection.js (owned tanks)
│   ├── tank-skins.js    (skin definitions)
│   ├── supply-drop.js   (gacha mechanics)
│   └── drop-rates.js    (rarity tables)
│
├── audio/
│   ├── sound.js         (SFX playback)
│   └── music.js         (music playback)
│
├── ads/
│   └── ads.js           (new: ad integration)
│
├── platform/
│   ├── screenSize.js    (responsive sizing)
│   ├── safeArea.js      (notch handling)
│   └── haptics.js       (vibration feedback)
│
└── ui/
    ├── screens/
    │   ├── titleScene/  (3D animated title)
    │   ├── levelSelect.js (new: world/level picker)
    │   ├── levelComplete.js (new: star reveal)
    │   ├── shop.js
    │   ├── collection.js
    │   └── settings.js
    └── components/
        ├── Button.js
        ├── Modal.js     (new: generic modal)
        └── StarDisplay.js (new: star animation)
```

### 3.2 New Constants

```javascript
// Additions to constants.js

export const LEVELS = {
  WORLDS: 6,
  LEVELS_PER_WORLD: 10,
  STAR_THRESHOLDS: [0, 15, 35, 60, 90, 125]
};

export const TRAJECTORY = {
  MAX_POINTS: 60,
  TIME_STEP: 0.016,
  LINE_DASH: [5, 5],
  LINE_COLOR: 'rgba(255, 255, 255, 0.5)'
};

export const SLINGSHOT = {
  MAX_DRAG_DISTANCE: 150,
  HIT_AREA_RADIUS: 80,
  LINE_COLOR: COLORS.NEON_PINK,
  LINE_WIDTH: 3
};

export const DAILY = {
  RESET_HOUR_UTC: 0,
  GRACE_PERIOD_HOURS: 48,
  CHALLENGES_PER_DAY: 3,
  STREAK_BONUS_MULTIPLIER: 1.1
};

export const ADS = {
  INTERSTITIAL_FREQUENCY: 3,
  MAX_PER_HOUR: 5,
  REWARDED_COIN_MULTIPLIER: 2
};
```

### 3.3 Event Bus (New)

For decoupled communication between systems:

```javascript
// New file: js/core/events.js
export const GameEvents = {
  listeners: {},

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }
};

// Event types
export const Events = {
  // Gameplay
  SHOT_FIRED: 'shot_fired',
  DAMAGE_DEALT: 'damage_dealt',
  TANK_DESTROYED: 'tank_destroyed',
  ROUND_WON: 'round_won',
  ROUND_LOST: 'round_lost',
  LEVEL_COMPLETE: 'level_complete',

  // Progression
  STARS_EARNED: 'stars_earned',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  WEAPON_UNLOCKED: 'weapon_unlocked',
  SKIN_UNLOCKED: 'skin_unlocked',

  // Economy
  COINS_EARNED: 'coins_earned',
  COINS_SPENT: 'coins_spent',
  PURCHASE_COMPLETE: 'purchase_complete',

  // Engagement
  DAILY_REWARD_CLAIMED: 'daily_reward_claimed',
  CHALLENGE_PROGRESS: 'challenge_progress',
  CHALLENGE_COMPLETE: 'challenge_complete'
};
```

---

## 4. UI/UX Guidelines

### 4.1 Screen Layouts

#### Level Select Screen

```
┌─────────────────────────────────────────────────┐
│  ←  WORLD 1: NEON WASTELAND    ★★★ 24/30       │
├─────────────────────────────────────────────────┤
│                                                  │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│   │  1  │ │  2  │ │  3  │ │  4  │ │  5  │      │
│   │ ★★★ │ │ ★★☆ │ │ ★☆☆ │ │ ★☆☆ │ │ 🔒  │      │
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
│                                                  │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│   │  6  │ │  7  │ │  8  │ │  9  │ │ 10  │      │
│   │ 🔒  │ │ 🔒  │ │ 🔒  │ │ 🔒  │ │ 🔒  │      │
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
│                                                  │
│  ● World 1  ○ World 2  ○ World 3  ○ ...       │
└─────────────────────────────────────────────────┘
```

#### Level Complete Screen

```
┌─────────────────────────────────────────────────┐
│                                                  │
│              ★ ★ ★ ← VICTORY! → ★ ★ ★           │
│                                                  │
│          ┌───────────────────────────┐           │
│          │   LEVEL 1-3 COMPLETE     │           │
│          │                           │           │
│          │   ☆ → ★  ☆ → ★  ☆        │   ← Stars animate
│          │                           │           │
│          │   Damage:       1,450     │           │
│          │   Accuracy:        82%    │           │
│          │   Turns:            5     │           │
│          │   ─────────────────       │           │
│          │   Score:        2,840     │           │
│          │                           │           │
│          │   +350 coins              │           │
│          └───────────────────────────┘           │
│                                                  │
│      [ RETRY ]    [ NEXT → ]    [ MENU ]        │
└─────────────────────────────────────────────────┘
```

#### Daily Rewards Popup

```
┌─────────────────────────────────────────────────┐
│                                                  │
│            🎁 DAILY REWARD! 🎁                  │
│                                                  │
│   Day 1   Day 2   Day 3   Day 4   Day 5   ...  │
│   [100]   [150]   [200]   [🚀]    [300]         │
│    ✓       ✓       ✓       ←                    │
│                    TODAY                         │
│                                                  │
│          ┌─────────────────────┐                │
│          │                     │                │
│          │    200 COINS! 🪙   │                │
│          │                     │                │
│          └─────────────────────┘                │
│                                                  │
│              [ CLAIM! ]                          │
│                                                  │
│         Streak: 3 days 🔥                       │
└─────────────────────────────────────────────────┘
```

### 4.2 Touch Optimization

- **Minimum touch target**: 44×44pt (iOS HIG)
- **Button spacing**: 8pt minimum between adjacent buttons
- **Thumb-friendly zones**: Primary actions at bottom corners
- **Large fire button**: 80×80pt minimum
- **Slingshot drag area**: Full screen during aiming

### 4.3 Synthwave Visual Style

**Color Palette:**
```javascript
const COLORS = {
  NEON_PINK: '#FF1493',
  CYAN: '#00FFFF',
  PURPLE: '#9400D3',
  ORANGE: '#FF6600',
  YELLOW: '#FFFF00',
  DEEP_PURPLE: '#020008',
  DARK_BG: '#0a0a1a'
};
```

**Typography:**
- Headings: Orbitron or Press Start 2P
- Body: System font (legibility)
- Numbers: LCD/digital style

**Effects:**
- Bloom/glow on neon elements
- Scanlines overlay (optional)
- Grid lines on terrain/background
- Glow trails on projectiles

---

## 5. Progression System

### 5.1 Weapon Unlocks

| Unlock Method | Weapons | Example |
|---------------|---------|---------|
| **Default** | 3 | Baby Shot, Basic Shot, Roller |
| **Level Completion** | 12 | Missile (1-5), Big Shot (2-3), etc. |
| **Star Milestones** | 10 | Cluster Bomb (30★), Chain Reaction (60★) |
| **Coins Purchase** | 10 | Gravity Well (5000), Ion Cannon (8000) |
| **Achievements** | 5 | Lightning Strike ("Win 10 matches") |

### 5.2 Star Rewards

| Stars | Reward |
|-------|--------|
| 10 | Uncommon skin random drop |
| 25 | New weapon unlock |
| 50 | Rare skin random drop |
| 75 | Premium weapon unlock |
| 100 | Epic skin random drop |
| 150 | Legendary skin + special weapon |

### 5.3 Daily Challenge Rewards

| Challenge | Coin Reward |
|-----------|-------------|
| Easy challenge | 50-75 |
| Medium challenge | 100-125 |
| Hard challenge | 150-200 |
| **All 3 completed** | +200 bonus + supply drop |

---

## 6. Monetization Strategy

### 6.1 Free Player Experience

- Full game access (all 60 levels)
- All weapons unlockable through play
- Rewarded video ads available (2× coins, continue, etc.)
- Interstitial ads every 3 rounds (skippable after 5 seconds)
- Estimated time to unlock all weapons: 15-20 hours of play

### 6.2 Premium Upgrade ($4.99)

- Remove ALL ads permanently
- 2× coin earn rate
- Exclusive "Retro Classic" skin pack (5 skins)
- Daily premium bonus (500 coins)
- Early access to new weapons (3-day head start)
- "Premium" badge in UI

### 6.3 IAP Pricing Structure

| Product | Price | Contents |
|---------|-------|----------|
| Starter Pack | $0.99 | 500 coins + 25 tokens + 1 supply drop |
| Coin Pack S | $0.99 | 1,000 coins |
| Coin Pack M | $2.99 | 3,500 coins (+17%) |
| Coin Pack L | $4.99 | 7,000 coins (+40%) **Best Value** |
| Token Pack | $1.99 | 100 tokens |
| Skin Bundle | $2.99 | 3 themed rare skins |

### 6.4 Ethical Guidelines

**DO:**
- Make game fully playable free
- Reward player skill, not spending
- Offer fair earn rates (2-3 levels per weapon)
- Respect player time

**DON'T:**
- Pay-to-win weapons (all balanced)
- Aggressive ad frequency
- Manipulative pricing
- Energy/lives systems that block play

---

## 7. Content Roadmap

### 7.1 Launch Content (2.0)

- 60 levels (6 worlds × 10 levels)
- 40 weapons (up from 11)
- 34 tank skins (existing)
- 40+ achievements (existing)
- Daily rewards + 3 daily challenges
- Premium upgrade + IAP store

### 7.2 Post-Launch Updates

| Month | Update | Content |
|-------|--------|---------|
| 1 | Polish | Bug fixes, balance tuning based on analytics |
| 2 | Content | World 7 (10 levels) + 5 new weapons |
| 3 | Multiplayer | Pass-and-play local 2-player |
| 4 | Events | Weekly event system + seasonal skins |
| 5 | Social | Leaderboards, friend challenges |
| 6 | Season 1 | Battle pass (optional), World 8 |

### 7.3 Multiplayer Phases

**Phase 1 (Month 3): Pass-and-Play**
- Two players, one device
- Alternate turns
- Local only

**Phase 2 (Month 6): Async PvP**
- Challenge friends
- Turn-based (24hr per turn)
- No real-time server needed

**Phase 3 (Month 9+): Real-time** (if successful)
- Live matches
- Ranked ladder
- Server infrastructure required

---

## 8. Implementation Priorities

### 8.1 Phase 1: Level System (Weeks 1-2)

1. Create `levels.js` with 60 level definitions
2. Implement star calculation logic
3. Build Level Select screen
4. Build Level Complete screen
5. Wire up level → game → results flow
6. Integrate star-based unlocks

### 8.2 Phase 2: Controls (Weeks 3-4)

1. Implement trajectory preview system
2. Build slingshot aiming controls
3. Add control mode toggle in settings
4. Integrate preview with wind/physics
5. Test on mobile devices

### 8.3 Phase 3: Weapons (Weeks 5-6)

1. Define all 40 weapon specs
2. Implement new weapon behaviors
3. Create weapon icons
4. Balance damage/cost
5. Test each weapon

### 8.4 Phase 4: Engagement (Weeks 7-8)

1. Build daily login reward system
2. Build daily challenge system
3. Create engagement UI screens
4. Add notification indicators
5. Test reward flow

### 8.5 Phase 5: Monetization (Weeks 9-10)

1. Integrate ad provider (Capacitor plugin)
2. Implement rewarded video opportunities
3. Implement interstitial logic
4. Build IAP store (Capacitor In-App Purchase)
5. Test purchase flows
6. Implement premium upgrade benefits

### 8.6 Phase 6: Content (Weeks 11-12)

1. Design and balance all 60 levels
2. Create level-specific terrain presets
3. Tune difficulty curve
4. Add tutorial overlays (World 1)
5. Playtest all content

### 8.7 Phase 7: Polish (Weeks 13-16)

1. TestFlight/beta distribution
2. Gather feedback
3. Fix critical bugs
4. Performance optimization
5. App Store submission
6. Launch!

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Performance on older iOS devices | Medium | Medium | Profile early, optimize particle counts |
| Slingshot feel not satisfying | Medium | Low | Iterate on sensitivity, test extensively |
| Ad integration issues | Low | Medium | Use established providers, test thoroughly |
| 60 levels takes too long | High | Medium | Launch with 40 levels, add more post-launch |

### 9.2 Business Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Monetization underperforms | Medium | Medium | Focus on premium upgrade, adjust ad frequency |
| Low retention | High | Medium | Daily rewards, achievements, level variety |
| App Store rejection | Low | Low | Follow guidelines, clear IAP descriptions |
| Market saturation | Medium | High | Synthwave aesthetic differentiates |

### 9.3 Content Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Difficulty curve too steep | Medium | Medium | Extensive playtesting, analytics |
| Weapon balance issues | Low | High | Start conservative, buff underused weapons |
| Not enough variety | Medium | Low | 40 weapons + 60 levels is substantial |

---

## 10. Success Metrics

### 10.1 Retention Targets (Industry Benchmarks)

| Metric | Target | Industry Average |
|--------|--------|------------------|
| D1 Retention | 45%+ | 40% |
| D7 Retention | 20%+ | 15% |
| D30 Retention | 15%+ | 10% |

### 10.2 Engagement Targets

| Metric | Target |
|--------|--------|
| Session length | 8+ minutes |
| Sessions per day | 2-3 |
| Daily challenge completion | 40%+ |
| Daily login claim | 60%+ |

### 10.3 Monetization Targets

| Metric | Target |
|--------|--------|
| Premium upgrade conversion | 5-10% |
| IAP conversion | 2-3% |
| Rewarded video eCPM | $14+ (iOS US) |
| ARPDAU | $0.05-0.10 |

---

## 11. Appendices

### Appendix A: Level Definitions Format

```javascript
{
  id: 'world1-level5',
  world: 1,
  level: 5,
  name: 'First Strike',
  difficulty: 'easy',
  aiDifficulty: 'easy',

  // Tank stats
  enemyHealth: 90,
  playerHealth: 100,

  // Environment
  wind: { min: -3, max: 3 },
  terrain: {
    style: 'hills',
    minHeight: 150,
    maxHeight: 400,
    roughness: 0.6
  },

  // Star criteria
  star2Damage: 80, // Deal 80+ damage for 2 stars
  star3Accuracy: 0.65, // 65%+ accuracy for 3 stars
  star3MaxTurns: 10, // Complete in ≤10 turns for 3 stars

  // Rewards
  rewards: {
    coins: 150,
    firstClear: 75
  },

  // Optional tutorial
  tutorialTips: null,

  // Unlock requirements
  requires: {
    previousLevel: 'world1-level4'
  }
}
```

### Appendix B: Weapon Definition Format

```javascript
{
  id: 'cluster-bomb',
  name: 'Cluster Bomb',
  type: 'splitting',

  // Economy
  cost: 4000,
  startingAmmo: 2,

  // Combat
  damage: 12,
  blastRadius: 25,

  // Special behavior
  splitCount: 8,
  splitDelay: 1.5, // seconds before split
  splitSpread: 30, // degrees

  // Unlock
  unlock: {
    type: 'stars',
    requirement: 30
  },

  // UI
  icon: 'weapon-icon-cluster-bomb.png',
  description: 'Splits into 8 mini bombs mid-flight',

  // Effects
  screenShake: 0.5,
  particleMultiplier: 1.0,
  isNuclear: false
}
```

### Appendix C: Daily Challenge Types

| Type ID | Template | Parameters |
|---------|----------|------------|
| `win_matches` | "Win {count} matches" | count: 1-5 |
| `deal_damage` | "Deal {count} total damage" | count: 1000-5000 |
| `use_weapon` | "Win using {weapon}" | weapon: any |
| `accuracy` | "Achieve {count}% accuracy" | count: 60-90 |
| `perfect_win` | "Win without taking damage" | - |
| `star_count` | "Earn {count} stars" | count: 3-10 |
| `world_level` | "Complete World {world} Level {level}" | world: 1-6 |
| `destroy_terrain` | "Destroy {count} terrain" | count: 500-2000 |
| `use_category` | "Win using only {category} weapons" | category: any |

### Appendix D: Ad Placement Guidelines

| Placement | Type | Frequency | Notes |
|-----------|------|-----------|-------|
| After level loss | Rewarded | Every time | "Watch ad to continue with 50% health" |
| After level win | Rewarded | Every time | "Watch ad for 2× coins" |
| Shop | Rewarded | Unlimited | "Watch ad for 200 coins" |
| Daily bonus | Rewarded | Once/day | "Watch ad to double daily reward" |
| Between levels | Interstitial | Every 3 levels | Non-premium only, skip after 5s |
| Main menu | Banner | Never | Banners look cheap, avoid |

---

## Conclusion

This specification provides a comprehensive blueprint for evolving Scorched Earth: Synthwave Edition from its current production-ready roguelike state to a fully-featured mobile game with:

1. **Structured Progression** - 60 levels, 6 worlds, star ratings
2. **Modern Controls** - Slingshot + sliders + trajectory preview
3. **Massive Content** - 40 weapons, 34 skins, 40+ achievements
4. **Daily Engagement** - Login rewards, daily challenges
5. **Ethical Monetization** - Premium upgrade, rewarded ads, fair IAP

The existing codebase is solid and well-architected. The 2.0 features build on this foundation without requiring major rewrites. With focused execution over 12-16 weeks, Scorched Earth: Synthwave Edition can launch as a compelling, polished mobile game that honors the 1991 classic while embracing modern mobile game best practices.

---

**END OF SPECIFICATION**

*This document should drive all implementation work. Create issues from each numbered section. Consult this spec as the single source of truth.*
