# Synthwave Scorched Earth - Game Specification

## Table of Contents

1. [Core Gameplay](#core-gameplay)
2. [Controls & Input](#controls--input)
3. [Physics System](#physics-system)
4. [Weapons System](#weapons-system)
5. [Terrain System](#terrain-system)
6. [Economy & Progression](#economy--progression)
7. [AI Opponents](#ai-opponents)
8. [Visual Design](#visual-design)
9. [Audio Design](#audio-design)
10. [Asset Specifications](#asset-specifications)

---

## Core Gameplay

### Game Overview

Synthwave Scorched Earth is a turn-based artillery combat game where two tanks battle on destructible terrain. Players adjust angle and power to fire projectiles, accounting for gravity and wind. The terrain is permanently altered by explosions, creating an evolving battlefield.

### Turn Structure

```
┌─────────────────────────────────────────────────┐
│                  GAME LOOP                      │
├─────────────────────────────────────────────────┤
│  1. Round Start                                 │
│     ├─ Generate new terrain                     │
│     ├─ Place tanks on terrain                   │
│     ├─ Set random wind value                    │
│     └─ Player goes first                        │
│                                                 │
│  2. Player Turn                                 │
│     ├─ Adjust angle (0-180°)                    │
│     ├─ Adjust power (0-100%)                    │
│     ├─ Select weapon (optional)                 │
│     └─ Fire                                     │
│                                                 │
│  3. Projectile Resolution                       │
│     ├─ Calculate trajectory                     │
│     ├─ Apply wind and gravity                   │
│     ├─ Check terrain collision                  │
│     ├─ Check tank collision                     │
│     └─ Execute explosion (if hit)               │
│                                                 │
│  4. Post-Shot Effects                           │
│     ├─ Destroy terrain in blast radius          │
│     ├─ Apply falling dirt physics               │
│     ├─ Calculate damage to tanks                │
│     └─ Check for tank death                     │
│                                                 │
│  5. AI Turn (repeat steps 2-4)                  │
│                                                 │
│  6. Victory/Defeat Check                        │
│     ├─ If opponent destroyed → Victory          │
│     ├─ If player destroyed → Defeat             │
│     └─ Otherwise → Return to step 2             │
│                                                 │
│  7. Round End                                   │
│     ├─ Award money                              │
│     ├─ Open shop                                │
│     └─ Start next round                         │
└─────────────────────────────────────────────────┘
```

### Win/Lose Conditions

| Condition | Result |
|-----------|--------|
| Enemy tank health reaches 0 | **Victory** - Round won |
| Player tank health reaches 0 | **Defeat** - Round lost |
| Both tanks destroyed same turn | **Draw** - No money awarded |

### Damage Calculation

Damage is calculated based on distance from explosion center:

```javascript
// Damage formula
const maxDamage = weapon.damage;
const distance = distanceBetween(explosionCenter, tankCenter);
const blastRadius = weapon.blastRadius;

if (distance >= blastRadius) {
    damage = 0; // Outside blast radius
} else {
    // Linear falloff from center
    const falloff = 1 - (distance / blastRadius);
    damage = Math.floor(maxDamage * falloff);
}
```

**Direct Hit Bonus:** If projectile directly impacts tank (distance < 5 pixels), apply 1.5x damage multiplier.

### Tank Health

- Starting health: **100 HP**
- No health regeneration
- Health persists across turns within a round
- Full health restored at round start

---

## Controls & Input

### Desktop Controls (Mouse + Keyboard)

| Action | Primary | Secondary |
|--------|---------|-----------|
| Adjust Angle | Left/Right Arrow Keys | Click and drag on angle indicator |
| Adjust Power | Up/Down Arrow Keys | Click and drag on power slider |
| Fire | Spacebar | Click Fire button |
| Select Weapon | Tab / Shift+Tab | Click weapon in HUD |
| Open Shop | S key | Click Shop button (between rounds) |

### Mobile/Touch Controls

The game uses a **gesture-based aiming system** inspired by Angry Birds:

```
┌────────────────────────────────────────┐
│         TOUCH AIMING SYSTEM            │
├────────────────────────────────────────┤
│                                        │
│  1. Touch and hold on/near tank        │
│  2. Drag AWAY from target direction    │
│     - Distance = Power (0-100%)        │
│     - Angle = Direction of drag        │
│  3. Trajectory preview line appears    │
│  4. Release to fire                    │
│                                        │
│  Alternative: Use on-screen controls   │
│     - Angle slider (arc around tank)   │
│     - Power slider (vertical bar)      │
│     - Fire button                      │
│                                        │
└────────────────────────────────────────┘
```

### Input Abstraction Layer

All input goes through an abstraction layer to support both platforms:

```javascript
// Input events the game responds to
const InputEvents = {
    ANGLE_CHANGE: 'angle_change',      // delta: degrees
    POWER_CHANGE: 'power_change',      // delta: percentage
    FIRE: 'fire',
    SELECT_WEAPON: 'select_weapon',    // index: number
    OPEN_SHOP: 'open_shop',
    CONFIRM: 'confirm',
    CANCEL: 'cancel'
};
```

### Angle and Power Constraints

| Parameter | Range | Step (Desktop) | Step (Mobile) |
|-----------|-------|----------------|---------------|
| Angle | 0° - 180° | 1° per keypress | Continuous drag |
| Power | 0% - 100% | 2% per keypress | Continuous drag |

**Angle Reference:**
- 0° = Flat right
- 90° = Straight up
- 180° = Flat left

---

## Physics System

### Projectile Motion

The game uses standard 2D ballistic physics with wind:

```javascript
// Physics constants
const GRAVITY = 0.15;           // pixels/frame² (tunable)
const TIME_STEP = 1;            // frames
const MAX_VELOCITY = 20;        // pixels/frame (at 100% power)

// Projectile state
let x = tank.x;
let y = tank.y;
let vx = Math.cos(angleRad) * power * MAX_VELOCITY;
let vy = -Math.sin(angleRad) * power * MAX_VELOCITY; // Negative because Y is down

// Per-frame update
function updateProjectile(dt) {
    // Apply wind (horizontal acceleration)
    vx += wind * dt;

    // Apply gravity (vertical acceleration)
    vy += GRAVITY * dt;

    // Update position
    x += vx * dt;
    y += vy * dt;
}
```

### Wind System

| Property | Value |
|----------|-------|
| Range | -10 to +10 |
| Direction | Negative = Left, Positive = Right |
| Behavior | Constant throughout round |
| Change | New random value each round |

**Wind Display:** Show wind direction and strength with animated arrow indicator. Strength indicated by arrow size and particle speed.

### Collision Detection

#### Terrain Collision

```javascript
function checkTerrainCollision(x, y) {
    // Terrain is stored as heightmap: terrain[x] = groundHeight
    const groundHeight = terrain[Math.floor(x)];

    // Y increases downward, so collision when y >= groundHeight
    if (y >= groundHeight) {
        return {
            hit: true,
            x: x,
            y: groundHeight
        };
    }
    return { hit: false };
}
```

#### Tank Collision

```javascript
function checkTankCollision(x, y, tanks) {
    for (const tank of tanks) {
        // Tank hitbox is rectangular
        const hitbox = {
            left: tank.x - tank.width / 2,
            right: tank.x + tank.width / 2,
            top: tank.y - tank.height,
            bottom: tank.y
        };

        if (x >= hitbox.left && x <= hitbox.right &&
            y >= hitbox.top && y <= hitbox.bottom) {
            return { hit: true, tank: tank };
        }
    }
    return { hit: false };
}
```

#### Screen Bounds

| Edge | Behavior |
|------|----------|
| Left/Right | Destroy projectile (off-screen) |
| Top | Projectile continues (returns due to gravity) |
| Bottom | Destroy projectile |

### Physics Tuning Parameters

These values should be exposed for easy balancing:

```javascript
const PhysicsConfig = {
    gravity: 0.15,
    maxVelocity: 20,
    windRange: 10,
    airResistance: 0,        // Optional: velocity decay
    terminalVelocity: 30     // Optional: max fall speed
};
```

---

## Weapons System

### Weapon Categories

1. **Standard** - Basic explosive projectiles
2. **Splitting** - Projectiles that split into multiple warheads
3. **Rolling** - Projectiles that roll along terrain
4. **Digging** - Projectiles that tunnel through terrain
5. **Nuclear** - High damage, large blast radius

### Complete Weapon List

#### Standard Weapons

| Weapon | Cost | Ammo | Damage | Blast Radius | Special |
|--------|------|------|--------|--------------|---------|
| **Basic Shot** | Free | ∞ | 25 | 30px | Default weapon |
| **Missile** | $500 | 5 | 35 | 40px | Standard upgrade |
| **Big Shot** | $1,000 | 3 | 50 | 55px | High damage |

#### Splitting Weapons

| Weapon | Cost | Ammo | Damage (per) | Blast Radius | Special |
|--------|------|------|--------------|--------------|---------|
| **MIRV** | $3,000 | 2 | 20 | 25px | Splits into 5 warheads at apex |
| **Death's Head** | $5,000 | 1 | 15 | 20px | Splits into 9 warheads at apex |

**MIRV Behavior:**
```
Initial trajectory:      Split at apex:
       *                      * *
      /                      * * *
     /                        \ | /
    /                          \|/
   O───────>                O───────>
```

At apex (when vy becomes positive), projectile splits:
- 5 warheads spread in 30° arc
- Each warhead inherits horizontal velocity
- Each warhead is independent projectile

#### Rolling Weapons

| Weapon | Cost | Ammo | Damage | Blast Radius | Special |
|--------|------|------|--------|--------------|---------|
| **Roller** | $1,500 | 3 | 30 | 35px | Rolls down slopes |
| **Heavy Roller** | $2,500 | 2 | 45 | 45px | Heavier, faster roll |

**Roller Behavior:**
- On terrain contact, begins rolling instead of exploding
- Rolls downhill following terrain contour
- Explodes on:
  - Contact with tank
  - Contact with vertical surface (wall)
  - Reaching terrain minimum (valley bottom)
  - Timeout after 3 seconds

#### Digging Weapons

| Weapon | Cost | Ammo | Damage | Blast Radius | Special |
|--------|------|------|--------|--------------|---------|
| **Digger** | $2,000 | 3 | 25 | 25px | Tunnels through terrain |
| **Heavy Digger** | $3,500 | 2 | 40 | 35px | Deeper tunneling |

**Digger Behavior:**
- On terrain contact, continues moving in same direction
- Destroys terrain along path (tunnel radius: 10px)
- Emerges on other side or explodes after traveling 100px underground
- Explodes immediately on tank contact

#### Nuclear Weapons

| Weapon | Cost | Ammo | Damage | Blast Radius | Special |
|--------|------|------|--------|--------------|---------|
| **Mini Nuke** | $4,000 | 2 | 60 | 80px | Screen shake, flash |
| **Nuke** | $8,000 | 1 | 100 | 150px | Massive explosion |

**Nuclear Effects:**
- Screen shake (intensity based on blast radius)
- Screen flash (white)
- Mushroom cloud particle effect
- Longer explosion animation

### Weapon Selection UI

```
┌─────────────────────────────────────────────┐
│ WEAPONS                        [TAB to swap]│
├─────────────────────────────────────────────┤
│ ► Basic Shot      [∞]                       │
│   Missile         [5]                       │
│   MIRV            [2]                       │
│   Roller          [3]                       │
│   Digger          [3]                       │
│   Mini Nuke       [2]                       │
└─────────────────────────────────────────────┘
```

---

## Terrain System

### Terrain Generation

Use **midpoint displacement** (diamond-square variant) for natural-looking terrain:

```javascript
function generateTerrain(width, height) {
    const terrain = new Array(width);
    const roughness = 0.5;      // How jagged (0-1)
    const baseHeight = height * 0.6;  // Average ground level

    // Initialize endpoints
    terrain[0] = baseHeight + randomRange(-50, 50);
    terrain[width - 1] = baseHeight + randomRange(-50, 50);

    // Recursive midpoint displacement
    function displace(left, right, displacement) {
        if (right - left <= 1) return;

        const mid = Math.floor((left + right) / 2);
        const avgHeight = (terrain[left] + terrain[right]) / 2;
        terrain[mid] = avgHeight + randomRange(-displacement, displacement);

        // Clamp to valid range
        terrain[mid] = Math.max(height * 0.2, Math.min(height * 0.9, terrain[mid]));

        // Recurse with reduced displacement
        const newDisp = displacement * roughness;
        displace(left, mid, newDisp);
        displace(mid, right, newDisp);
    }

    displace(0, width - 1, 100);
    return terrain;
}
```

### Terrain Data Structure

```javascript
// Terrain stored as 1D heightmap
// terrain[x] = y coordinate of ground surface at x
const terrain = new Float32Array(canvasWidth);

// Example: Canvas is 1200x800
// terrain[100] = 450 means ground is at y=450 at x=100
// Sky is above (y < terrain[x])
// Ground is below (y >= terrain[x])
```

### Terrain Destruction

When explosion occurs:

```javascript
function destroyTerrain(centerX, centerY, radius) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (x < 0 || x >= terrain.length) continue;

        const dx = x - centerX;
        const maxDy = Math.sqrt(radius * radius - dx * dx);

        // Only destroy terrain within circular blast
        const craterBottom = centerY + maxDy;
        const craterTop = centerY - maxDy;

        // If terrain surface is within blast radius, lower it
        if (terrain[x] < craterBottom && terrain[x] > craterTop) {
            terrain[x] = craterBottom;
        }
    }
}
```

### Falling Dirt Physics

After each explosion, loose terrain falls:

```javascript
function applyFallingDirt() {
    // Scan each column
    for (let x = 0; x < terrain.length; x++) {
        // Check if there's a gap below this column
        // (terrain to left and right is higher)
        const left = terrain[x - 1] ?? terrain[x];
        const right = terrain[x + 1] ?? terrain[x];
        const current = terrain[x];

        // If this column is floating, it should fall
        if (current < left - 5 && current < right - 5) {
            // Gradually lower toward neighbors
            terrain[x] += 2; // Fall speed
        }
    }

    // Repeat until stable (or limit iterations)
}
```

**Simplification:** For V1, terrain destruction is instant. Falling dirt animation is a nice-to-have enhancement.

### Tank Placement

```javascript
function placeTanks(terrain, canvasWidth) {
    // Place player tank on left third
    const playerX = Math.floor(canvasWidth * 0.15) + randomRange(0, canvasWidth * 0.1);
    const playerY = terrain[playerX];

    // Place enemy tank on right third
    const enemyX = Math.floor(canvasWidth * 0.75) + randomRange(0, canvasWidth * 0.1);
    const enemyY = terrain[enemyX];

    return { player: { x: playerX, y: playerY }, enemy: { x: enemyX, y: enemyY } };
}
```

---

## Economy & Progression

### Starting Resources

| Resource | Starting Value |
|----------|----------------|
| Money | $1,000 |
| Basic Shot | ∞ (unlimited) |
| Other Weapons | 0 |

### Earning Money

| Event | Reward |
|-------|--------|
| Hit enemy tank | $50 + (damage dealt × 2) |
| Win round | $500 |
| Lose round | $100 (consolation) |

**Example:** Deal 45 damage, then win = $50 + $90 + $500 = $640

### Round Progression

| Round | AI Difficulty | Bonus Multiplier |
|-------|---------------|------------------|
| 1 | Easy | 1.0x |
| 2 | Easy | 1.0x |
| 3 | Medium | 1.2x |
| 4 | Medium | 1.2x |
| 5 | Hard | 1.5x |
| 6+ | Hard | 1.5x |

### Shop System

Shop opens between rounds:

```
┌──────────────────────────────────────────────────────┐
│                    WEAPON SHOP                       │
│                    Balance: $2,450                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  STANDARD                          SPECIAL           │
│  ─────────                          ───────          │
│  Missile      $500  [BUY]          MIRV     $3,000   │
│  Big Shot   $1,000  [BUY]          Roller   $1,500   │
│                                    Digger   $2,000   │
│  NUCLEAR                                             │
│  ───────                                             │
│  Mini Nuke  $4,000  [BUY]          Death's Head      │
│  Nuke       $8,000  [BUY]          $5,000  [BUY]     │
│                                                      │
│                     [DONE - Start Round]             │
└──────────────────────────────────────────────────────┘
```

### Shop Purchase Logic

```javascript
function buyWeapon(weaponId, quantity = 1) {
    const weapon = weapons[weaponId];
    const totalCost = weapon.cost * quantity;

    if (player.money < totalCost) {
        return { success: false, reason: 'Insufficient funds' };
    }

    player.money -= totalCost;
    player.inventory[weaponId] = (player.inventory[weaponId] || 0) + weapon.ammoPerPurchase;

    return { success: true };
}
```

---

## AI Opponents

### AI Difficulty Tiers

#### Easy AI

| Aspect | Behavior |
|--------|----------|
| **Accuracy** | ±15° angle error, ±20% power error |
| **Wind Compensation** | None |
| **Weapon Selection** | Basic Shot only |
| **Targeting** | Direct line to player |

```javascript
function easyAI(ai, player, wind) {
    // Calculate angle to player (ignore wind)
    const dx = player.x - ai.x;
    const dy = ai.y - player.y;
    let angle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);

    // Add error
    angle += randomRange(-15, 15);

    // Estimate power (very rough)
    const distance = Math.sqrt(dx * dx + dy * dy);
    let power = Math.min(100, distance / 10 + randomRange(-20, 20));

    return { angle, power, weapon: 'basic' };
}
```

#### Medium AI

| Aspect | Behavior |
|--------|----------|
| **Accuracy** | ±8° angle error, ±10% power error |
| **Wind Compensation** | Partial (50% correction) |
| **Weapon Selection** | Uses Missiles, Rollers |
| **Targeting** | Calculates arc trajectory |

```javascript
function mediumAI(ai, player, wind) {
    // Calculate optimal angle using basic physics
    const dx = player.x - ai.x;
    const dy = ai.y - player.y;

    // Simple ballistic solution
    const v = 15; // Estimated velocity
    const g = 0.15;

    // Quadratic formula for angle (simplified)
    let angle = Math.atan2(dy + 0.5 * g * Math.pow(dx / v, 2), dx) * (180 / Math.PI);

    // Partial wind compensation
    angle -= wind * 0.5;

    // Add error
    angle += randomRange(-8, 8);

    // Better power estimation
    let power = Math.min(100, Math.sqrt(dx * dx + dy * dy) / 8);
    power += randomRange(-10, 10);

    // Sometimes use better weapons
    const weapon = ai.inventory.missile > 0 && Math.random() > 0.5 ? 'missile' : 'basic';

    return { angle, power, weapon };
}
```

#### Hard AI

| Aspect | Behavior |
|--------|----------|
| **Accuracy** | ±3° angle error, ±5% power error |
| **Wind Compensation** | Full compensation |
| **Weapon Selection** | Strategic (MIRV for entrenched, Digger through terrain) |
| **Targeting** | Accounts for terrain obstacles |

```javascript
function hardAI(ai, player, wind) {
    // Use iterative solver for accurate trajectory
    const solution = solveBallisticArc(ai, player, wind);

    // Check if direct shot is blocked by terrain
    if (terrainBlocksShot(ai, player, solution)) {
        // Try high arc
        solution.angle = Math.min(solution.angle + 30, 85);
        solution.power = Math.min(solution.power * 1.2, 100);
    }

    // Small error for tension
    solution.angle += randomRange(-3, 3);
    solution.power += randomRange(-5, 5);

    // Strategic weapon selection
    if (isPlayerInValley(player) && ai.inventory.roller > 0) {
        solution.weapon = 'roller';
    } else if (terrainBlocksShot(ai, player, solution) && ai.inventory.digger > 0) {
        solution.weapon = 'digger';
    } else if (ai.inventory.mirv > 0 && Math.random() > 0.7) {
        solution.weapon = 'mirv';
    }

    return solution;
}
```

### AI Turn Execution

```javascript
async function executeAITurn(ai, player, wind) {
    // Show "AI thinking" indicator
    showThinkingIndicator();

    // Artificial delay for drama (1-2 seconds)
    await delay(1000 + Math.random() * 1000);

    // Calculate shot based on difficulty
    const shot = ai.difficulty === 'easy' ? easyAI(ai, player, wind) :
                 ai.difficulty === 'medium' ? mediumAI(ai, player, wind) :
                 hardAI(ai, player, wind);

    // Animate angle/power adjustment (optional polish)
    await animateAimAdjustment(ai, shot.angle, shot.power);

    // Fire
    hideThinkingIndicator();
    fireProjectile(ai, shot);
}
```

---

## Visual Design

### Color Palette (Synthwave)

```css
:root {
    /* Background */
    --bg-dark: #0a0a1a;         /* Deep space blue-black */
    --bg-gradient-top: #1a0a2e;  /* Dark purple */
    --bg-gradient-mid: #16213e;  /* Navy */
    --bg-gradient-bottom: #0f3460; /* Deep teal */

    /* Neon accents */
    --neon-pink: #ff2a6d;        /* Hot pink */
    --neon-cyan: #05d9e8;        /* Electric cyan */
    --neon-purple: #d300c5;      /* Magenta */
    --neon-yellow: #f9f002;      /* Electric yellow */
    --neon-orange: #ff6b35;      /* Sunset orange */

    /* UI elements */
    --ui-text: #ffffff;
    --ui-text-dim: #7f8c9a;
    --ui-panel-bg: rgba(10, 10, 26, 0.85);
    --ui-border: #05d9e8;

    /* Terrain */
    --terrain-fill: #1a0a2e;     /* Dark purple ground */
    --terrain-stroke: #ff2a6d;   /* Pink outline */

    /* Effects */
    --explosion-core: #ffffff;
    --explosion-inner: #f9f002;
    --explosion-outer: #ff2a6d;
}
```

### Visual Layers (Back to Front)

1. **Background Gradient** - Sunset gradient (top: dark purple → bottom: orange/pink)
2. **Stars** - Scattered white dots with twinkle animation
3. **Grid Lines** - Perspective grid on horizon (synthwave signature)
4. **Sun** - Large circle on horizon with horizontal lines
5. **Mountains** - Silhouette with neon edge highlights
6. **Terrain** - Destructible gameplay terrain
7. **Tanks** - Player and enemy sprites
8. **Projectiles** - Weapon projectiles with trails
9. **Explosions** - Particle effects
10. **UI** - HUD, controls, indicators

### Background Elements

#### Synthwave Sun
```
         ████████
       ██████████████
      ████████████████        ← Horizontal slice lines
     ██████████████████          through the sun
      ████████████████
       ██████████████
═══════════════════════════   ← Horizon line
    ╲   ╲   │   ╱   ╱         ← Perspective grid
      ╲  ╲  │  ╱  ╱              extending into distance
        ╲ ╲ │ ╱ ╱
```

#### Grid Floor
- Perspective lines converging at horizon
- Horizontal lines at regular intervals
- Cyan/pink gradient glow on lines
- Lines pulse subtly with music (if audio reactive)

### Tank Design

```
Player Tank (Cyan/Blue):
    ╱───╲
   │█████│      ← Turret
╔══╧═════╧══╗
║ ● ● ● ● ● ║   ← Body with neon edge
╚═══════════╝
  ◯◯◯◯◯◯◯◯     ← Treads

Enemy Tank (Pink/Red):
    ╱───╲
   │█████│      ← Turret
╔══╧═════╧══╗
║ ● ● ● ● ● ║   ← Body with neon edge
╚═══════════╝
  ◯◯◯◯◯◯◯◯     ← Treads
```

**Tank Visual Properties:**
- Neon outline glow (color matches team)
- Slight shadow underneath
- Turret rotates to show current angle
- Subtle idle animation (glow pulse)

### Explosion Effects

```javascript
const ExplosionTypes = {
    small: {
        radius: 30,
        particleCount: 20,
        colors: ['#ffffff', '#f9f002', '#ff2a6d'],
        duration: 500, // ms
        screenShake: 2
    },
    medium: {
        radius: 50,
        particleCount: 40,
        colors: ['#ffffff', '#f9f002', '#ff6b35', '#ff2a6d'],
        duration: 700,
        screenShake: 5
    },
    large: {
        radius: 80,
        particleCount: 60,
        colors: ['#ffffff', '#f9f002', '#ff6b35', '#ff2a6d', '#d300c5'],
        duration: 1000,
        screenShake: 10
    },
    nuclear: {
        radius: 150,
        particleCount: 100,
        colors: ['#ffffff', '#f9f002', '#ff6b35', '#ff2a6d', '#d300c5'],
        duration: 1500,
        screenShake: 20,
        screenFlash: true,
        mushroomCloud: true
    }
};
```

### UI Style

```
┌─────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Top bar (health, money)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      GAME AREA                              │
│                                                             │
├────────────────────────┬────────────────────────────────────┤
│   ANGLE: 45°           │  POWER: ████████░░ 80%             │ ← Bottom HUD
│   WIND: ←← 7           │  WEAPON: Basic Shot [∞]            │
│   [FIRE]               │  [NEXT WEAPON]                     │
└────────────────────────┴────────────────────────────────────┘

UI Design Principles:
- Neon borders (cyan or pink)
- Dark semi-transparent backgrounds
- Glowing text for important values
- Pixelated/retro font for numbers
- Smooth gradients for bars
```

### CRT/Scanline Effect (Optional)

Apply subtle post-processing:
- Horizontal scanlines (2px apart, 10% opacity)
- Slight vignette (darker corners)
- Subtle RGB chromatic aberration
- Screen curvature effect (very subtle)

---

## Audio Design

### Audio Style

**Genre:** 80s Synthwave
**Mood:** Energetic but not overwhelming; atmospheric during gameplay, intense during explosions
**Reference:** Kavinsky, Carpenter Brut, Perturbator (instrumental tracks)
**Vibe:** Dr Disrespect's gaming aesthetic - dramatic, over-the-top, but fun

### Music System

| State | Track Type | Characteristics |
|-------|------------|-----------------|
| **Menu** | Ambient synth | Slow arpeggios, pads, mysterious |
| **Gameplay** | Mid-tempo | 100-120 BPM, driving bassline, arpeggiated synths |
| **Victory** | Triumphant | Fanfare-style, major key, ascending melody |
| **Defeat** | Somber | Minor key, descending, brief |
| **Shop** | Chill | Relaxed synthwave, similar to menu |

### Sound Effects Needed

| Event | Sound Type | Duration |
|-------|------------|----------|
| **Fire** | Synthesized "pew" + thump | 300ms |
| **Explosion (Small)** | Punchy synth burst | 400ms |
| **Explosion (Medium)** | Deeper burst + rumble | 600ms |
| **Explosion (Large)** | Heavy rumble + debris | 900ms |
| **Explosion (Nuclear)** | Massive boom + sustained rumble | 1500ms |
| **Hit Tank** | Metallic impact + crunch | 400ms |
| **Miss (Terrain)** | Soft thud + dirt scatter | 300ms |
| **Angle Change** | Soft click/tick | 50ms |
| **Power Change** | Rising/falling tone | continuous |
| **Weapon Select** | Electronic blip | 100ms |
| **Menu Navigate** | Soft whoosh | 150ms |
| **Menu Select** | Satisfying click | 100ms |
| **Round Start** | Dramatic synth stinger | 1000ms |
| **Victory** | Triumphant fanfare | 2000ms |
| **Defeat** | Low synth drone + descend | 1500ms |
| **Buy Weapon** | Cash register "cha-ching" synth | 300ms |

### Audio Implementation

```javascript
// Web Audio API structure
const AudioManager = {
    context: null,          // AudioContext
    masterGain: null,       // Master volume
    musicGain: null,        // Music volume (0-1)
    sfxGain: null,          // SFX volume (0-1)

    tracks: {
        menu: null,
        gameplay: null,
        victory: null,
        defeat: null,
        shop: null
    },

    sfx: {
        fire: [],           // Array for variation
        explosion_small: [],
        explosion_medium: [],
        explosion_large: [],
        explosion_nuclear: [],
        hit: [],
        miss: [],
        ui_click: null,
        ui_select: null,
        // etc.
    },

    currentTrack: null
};
```

### Volume Ducking

When explosions occur, duck music volume briefly:

```javascript
function duckMusic(duration = 500) {
    const duckLevel = 0.3;  // Duck to 30%
    const fadeTime = 100;    // ms

    // Fade music down
    musicGain.gain.linearRampToValueAtTime(duckLevel, context.currentTime + fadeTime / 1000);

    // Fade music back up after explosion
    setTimeout(() => {
        musicGain.gain.linearRampToValueAtTime(1.0, context.currentTime + fadeTime / 1000);
    }, duration);
}
```

---

## Asset Specifications

### Asset Architecture Overview

All visual elements use swappable sprites loaded via `assets/manifest.json`. This allows graphics to be replaced without code changes.

### Directory Structure

```
assets/
├── manifest.json           # Asset definitions
├── images/
│   ├── tanks/
│   │   ├── tank-player.png
│   │   └── tank-enemy.png
│   ├── weapons/
│   │   ├── shot-basic.png
│   │   ├── shot-missile.png
│   │   ├── shot-mirv.png
│   │   ├── shot-roller.png
│   │   ├── shot-digger.png
│   │   ├── shot-nuke.png
│   │   └── shot-mini-nuke.png
│   ├── effects/
│   │   ├── explosion-small.png
│   │   ├── explosion-medium.png
│   │   ├── explosion-large.png
│   │   ├── explosion-nuclear.png
│   │   └── particles.png
│   ├── ui/
│   │   ├── hud-panel.png
│   │   ├── button-fire.png
│   │   ├── button-weapon.png
│   │   ├── slider-power.png
│   │   ├── slider-angle.png
│   │   ├── icon-money.png
│   │   └── icon-health.png
│   └── backgrounds/
│       ├── bg-sky.png
│       ├── bg-grid.png
│       ├── bg-sun.png
│       └── bg-mountains.png
└── audio/
    ├── music/
    │   ├── menu.mp3
    │   ├── gameplay.mp3
    │   ├── shop.mp3
    │   ├── victory.mp3
    │   └── defeat.mp3
    └── sfx/
        ├── fire.mp3
        ├── explosion-small.mp3
        ├── explosion-medium.mp3
        ├── explosion-large.mp3
        ├── explosion-nuclear.mp3
        ├── hit.mp3
        ├── miss.mp3
        ├── ui-click.mp3
        ├── ui-select.mp3
        └── buy.mp3
```

### Asset Manifest Schema

```json
{
  "version": "1.0",
  "tanks": {
    "player": {
      "path": "images/tanks/tank-player.png",
      "width": 64,
      "height": 32,
      "turretOffsetX": 32,
      "turretOffsetY": 8
    },
    "enemy": {
      "path": "images/tanks/tank-enemy.png",
      "width": 64,
      "height": 32,
      "turretOffsetX": 32,
      "turretOffsetY": 8
    }
  },
  "projectiles": {
    "basic": { "path": "images/weapons/shot-basic.png", "width": 8, "height": 8 },
    "missile": { "path": "images/weapons/shot-missile.png", "width": 12, "height": 6 },
    "mirv": { "path": "images/weapons/shot-mirv.png", "width": 10, "height": 10 },
    "roller": { "path": "images/weapons/shot-roller.png", "width": 14, "height": 14 },
    "digger": { "path": "images/weapons/shot-digger.png", "width": 10, "height": 10 },
    "mini-nuke": { "path": "images/weapons/shot-mini-nuke.png", "width": 12, "height": 16 },
    "nuke": { "path": "images/weapons/shot-nuke.png", "width": 16, "height": 20 }
  },
  "effects": {
    "explosion-small": {
      "path": "images/effects/explosion-small.png",
      "width": 64,
      "height": 64,
      "frames": 8,
      "frameDuration": 50
    },
    "explosion-medium": {
      "path": "images/effects/explosion-medium.png",
      "width": 96,
      "height": 96,
      "frames": 10,
      "frameDuration": 60
    },
    "explosion-large": {
      "path": "images/effects/explosion-large.png",
      "width": 128,
      "height": 128,
      "frames": 12,
      "frameDuration": 70
    },
    "explosion-nuclear": {
      "path": "images/effects/explosion-nuclear.png",
      "width": 256,
      "height": 256,
      "frames": 16,
      "frameDuration": 80
    },
    "particles": {
      "path": "images/effects/particles.png",
      "width": 8,
      "height": 8,
      "variants": 4
    }
  },
  "ui": {
    "hud-panel": { "path": "images/ui/hud-panel.png", "width": 300, "height": 100 },
    "button-fire": { "path": "images/ui/button-fire.png", "width": 80, "height": 40 },
    "button-weapon": { "path": "images/ui/button-weapon.png", "width": 120, "height": 30 },
    "slider-power": { "path": "images/ui/slider-power.png", "width": 200, "height": 20 },
    "slider-angle": { "path": "images/ui/slider-angle.png", "width": 100, "height": 100 },
    "icon-money": { "path": "images/ui/icon-money.png", "width": 24, "height": 24 },
    "icon-health": { "path": "images/ui/icon-health.png", "width": 24, "height": 24 }
  },
  "backgrounds": {
    "sky": { "path": "images/backgrounds/bg-sky.png", "width": 1920, "height": 1080 },
    "grid": { "path": "images/backgrounds/bg-grid.png", "width": 1920, "height": 400 },
    "sun": { "path": "images/backgrounds/bg-sun.png", "width": 400, "height": 400 },
    "mountains": { "path": "images/backgrounds/bg-mountains.png", "width": 1920, "height": 300 }
  },
  "audio": {
    "music": {
      "menu": { "path": "audio/music/menu.mp3", "loop": true },
      "gameplay": { "path": "audio/music/gameplay.mp3", "loop": true },
      "shop": { "path": "audio/music/shop.mp3", "loop": true },
      "victory": { "path": "audio/music/victory.mp3", "loop": false },
      "defeat": { "path": "audio/music/defeat.mp3", "loop": false }
    },
    "sfx": {
      "fire": { "path": "audio/sfx/fire.mp3" },
      "explosion-small": { "path": "audio/sfx/explosion-small.mp3" },
      "explosion-medium": { "path": "audio/sfx/explosion-medium.mp3" },
      "explosion-large": { "path": "audio/sfx/explosion-large.mp3" },
      "explosion-nuclear": { "path": "audio/sfx/explosion-nuclear.mp3" },
      "hit": { "path": "audio/sfx/hit.mp3" },
      "miss": { "path": "audio/sfx/miss.mp3" },
      "ui-click": { "path": "audio/sfx/ui-click.mp3" },
      "ui-select": { "path": "audio/sfx/ui-select.mp3" },
      "buy": { "path": "audio/sfx/buy.mp3" }
    }
  }
}
```

### Sprite Specifications

#### Tanks

| Asset | Dimensions | Format | Notes |
|-------|------------|--------|-------|
| tank-player.png | 64×32 | PNG-24 + alpha | Cyan/blue neon theme |
| tank-enemy.png | 64×32 | PNG-24 + alpha | Pink/red neon theme |

**Tank Sprite Layout:**
- Body fills bottom 24px
- Turret pivot point at center-top
- Transparent background
- Neon glow baked into sprite

#### Projectiles

| Asset | Dimensions | Format | Notes |
|-------|------------|--------|-------|
| shot-basic.png | 8×8 | PNG-24 + alpha | Simple glowing orb |
| shot-missile.png | 12×6 | PNG-24 + alpha | Elongated, pointed |
| shot-mirv.png | 10×10 | PNG-24 + alpha | Multi-pointed star |
| shot-roller.png | 14×14 | PNG-24 + alpha | Circular, spiked |
| shot-digger.png | 10×10 | PNG-24 + alpha | Drill-shaped |
| shot-mini-nuke.png | 12×16 | PNG-24 + alpha | Small warhead |
| shot-nuke.png | 16×20 | PNG-24 + alpha | Large warhead |

#### Explosion Spritesheets

| Asset | Frame Size | Frames | Total Size | Notes |
|-------|------------|--------|------------|-------|
| explosion-small.png | 64×64 | 8 | 512×64 | Horizontal strip |
| explosion-medium.png | 96×96 | 10 | 960×96 | Horizontal strip |
| explosion-large.png | 128×128 | 12 | 1536×128 | Horizontal strip |
| explosion-nuclear.png | 256×256 | 16 | 4096×256 | Includes mushroom cloud |

#### UI Elements

| Asset | Dimensions | Notes |
|-------|------------|-------|
| hud-panel.png | 300×100 | 9-slice scalable |
| button-fire.png | 80×40 | Include hover/pressed states |
| button-weapon.png | 120×30 | Include hover/pressed states |
| slider-power.png | 200×20 | Track + handle |
| slider-angle.png | 100×100 | Arc indicator |
| icon-money.png | 24×24 | Currency symbol |
| icon-health.png | 24×24 | Heart or similar |

#### Backgrounds

| Asset | Dimensions | Notes |
|-------|------------|-------|
| bg-sky.png | 1920×1080 | Gradient: purple → orange |
| bg-grid.png | 1920×400 | Perspective grid, lower portion |
| bg-sun.png | 400×400 | Circle with horizontal lines |
| bg-mountains.png | 1920×300 | Silhouette with neon edges |

### Placeholder Strategy

Until custom art is ready, generate programmatic placeholders:

```javascript
// Placeholder rendering for tanks
function drawPlaceholderTank(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 32, y - 24, 64, 24); // Body
    ctx.fillRect(x - 8, y - 32, 16, 8);   // Turret
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 32, y - 24, 64, 24);
}

// Placeholder rendering for projectiles
function drawPlaceholderProjectile(ctx, x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Placeholder explosion (expanding circle)
function drawPlaceholderExplosion(ctx, x, y, radius, progress) {
    const currentRadius = radius * progress;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 0, ${1 - progress})`;
    ctx.fill();
}
```

---

## Mobile (iOS) Considerations

### Screen Sizing

| Device | Resolution | Safe Area |
|--------|------------|-----------|
| iPhone SE | 375×667 | Full |
| iPhone 14 | 390×844 | -47px top, -34px bottom |
| iPhone 14 Pro Max | 430×932 | -59px top, -34px bottom |
| iPad | 1024×768+ | Full |

### Canvas Scaling

```javascript
function setupCanvas() {
    const canvas = document.getElementById('game');
    const dpr = window.devicePixelRatio || 1;

    // Design resolution
    const designWidth = 1200;
    const designHeight = 800;

    // Fit to screen
    const scale = Math.min(
        window.innerWidth / designWidth,
        window.innerHeight / designHeight
    );

    // Set display size
    canvas.style.width = `${designWidth * scale}px`;
    canvas.style.height = `${designHeight * scale}px`;

    // Set actual size in memory
    canvas.width = designWidth * dpr;
    canvas.height = designHeight * dpr;

    // Scale drawing operations
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
}
```

### Touch Handling

```javascript
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getTouchPos(touch);

    // Check if touching tank area (start aiming)
    if (isNearTank(pos, playerTank)) {
        startAiming(pos);
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isAiming) return;

    const touch = e.touches[0];
    const pos = getTouchPos(touch);
    updateAim(pos);
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (isAiming) {
        fire();
        stopAiming();
    }
}
```

### Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 (30 minimum) |
| Initial Load | < 3 seconds |
| Memory | < 150MB |
| Battery | Minimize GPU wake-ups |

### Capacitor Wrapper (Future)

For iOS App Store deployment:

```javascript
// capacitor.config.json
{
  "appId": "com.example.scorchedearth",
  "appName": "Scorched Earth",
  "bundledWebRuntime": false,
  "webDir": "dist",
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000
    },
    "Haptics": {}
  }
}
```

---

## Implementation Priority

### Phase 1: Core Gameplay

1. Canvas setup and rendering
2. Terrain generation and rendering
3. Tank placement and rendering
4. Basic projectile physics
5. Turn system (player → AI → player)
6. Basic Shot weapon only
7. Terrain destruction
8. Damage calculation
9. Win/lose detection

### Phase 2: Weapons & Shop

1. Weapon system architecture
2. Implement all weapons
3. Shop UI and purchasing
4. Economy system
5. Round progression

### Phase 3: AI & Polish

1. Easy AI
2. Medium AI
3. Hard AI
4. Explosion effects
5. Screen shake
6. Particle systems

### Phase 4: Visual Polish

1. Synthwave background layers
2. Neon effects and glow
3. UI styling
4. Tank sprites
5. Projectile sprites

### Phase 5: Audio

1. Audio system setup
2. Sound effects
3. Music integration
4. Volume controls

### Phase 6: Mobile

1. Touch controls
2. Responsive scaling
3. Mobile-optimized UI
4. Capacitor wrapper
5. iOS testing

---

## Appendix: Quick Reference

### Weapon Quick Stats

| Weapon | Cost | Ammo | Damage | Radius | Type |
|--------|------|------|--------|--------|------|
| Basic Shot | Free | ∞ | 25 | 30 | Standard |
| Missile | $500 | 5 | 35 | 40 | Standard |
| Big Shot | $1,000 | 3 | 50 | 55 | Standard |
| MIRV | $3,000 | 2 | 20×5 | 25 | Splitting |
| Death's Head | $5,000 | 1 | 15×9 | 20 | Splitting |
| Roller | $1,500 | 3 | 30 | 35 | Rolling |
| Heavy Roller | $2,500 | 2 | 45 | 45 | Rolling |
| Digger | $2,000 | 3 | 25 | 25 | Digging |
| Heavy Digger | $3,500 | 2 | 40 | 35 | Digging |
| Mini Nuke | $4,000 | 2 | 60 | 80 | Nuclear |
| Nuke | $8,000 | 1 | 100 | 150 | Nuclear |

### Physics Constants

| Constant | Value | Units |
|----------|-------|-------|
| Gravity | 0.15 | px/frame² |
| Max Velocity | 20 | px/frame |
| Wind Range | -10 to +10 | - |
| Angle Range | 0 to 180 | degrees |
| Power Range | 0 to 100 | percent |

### Color Hex Codes

| Name | Hex | Use |
|------|-----|-----|
| Deep Space | #0a0a1a | Background |
| Neon Pink | #ff2a6d | Accents, Enemy |
| Electric Cyan | #05d9e8 | Accents, Player |
| Magenta | #d300c5 | Effects |
| Electric Yellow | #f9f002 | Explosions |
| Sunset Orange | #ff6b35 | Sun, Fire |
