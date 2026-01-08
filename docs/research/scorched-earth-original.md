# Original Scorched Earth (1991) - Research Document

## Overview

**Scorched Earth** is a turn-based artillery video game released for MS-DOS in 1991, developed by Wendell Hicken using Borland C++ and Turbo Assembler. Often called "The Mother of All Games," it established the template for the artillery genre and directly influenced games like Worms, Gunbound, and Pocket Tanks.

The game supports up to 10 players (human or AI) controlling tanks on two-dimensional destructible terrain. Players adjust angle and power to fire projectiles, accounting for gravity, wind, and other physics parameters.

---

## Weapons System

### Weapon Categories

The game organizes its 30+ weapons into distinct categories:

1. **Standard Weapons** - Explosive projectiles of varying power
2. **Earth-Destroying Weapons** - Tunnel through or remove terrain
3. **Earth-Producing Weapons** - Create terrain to bury enemies
4. **Energy Weapons** - Require battery power, variable damage

### Complete Weapon List

#### Standard Weapons

| Weapon | Cost | Bundle Size | Blast Radius | Behavior |
|--------|------|-------------|--------------|----------|
| Baby Missile | $400 | 10 | Small | Basic projectile, unlimited in some modes |
| Missile | $1,875 | 5 | 20 | Standard explosive |
| Baby Nuke | $10,000 | 3 | 40 | Small nuclear blast |
| Nuke | $12,000 | 1 | 75 | Large nuclear blast |
| Leapfrog | $10,000 | 2 | Variable | Three sequential warheads |
| MIRV | $10,000 | 3 | Variable | Splits into 5 warheads mid-flight |
| Death's Head | $20,000 | 1 | Variable | Splits into 9 warheads |
| Napalm | $10,000 | 10 | Spreading | Creates burning pools; damage proportional to pooling depth |
| Hot Napalm | Higher | Fewer | Spreading | More intense version |
| Funky Bomb | $7,000 | 2 | Variable | Multi-colored explosions in random directions |

#### Roller Weapons

| Weapon | Cost | Bundle Size | Behavior |
|--------|------|-------------|----------|
| Baby Roller | Low | Many | Rolls down slopes until hitting obstacle |
| Roller | Medium | Medium | Standard rolling projectile |
| Heavy Roller | High | Few | Heavy rolling projectile |

**Roller Mechanic:** When hitting a slope, rollers descend until colliding with a tank or obstacle. Effective for enemies in valleys.

#### Earth-Destroying Weapons

| Weapon | Cost | Bundle Size | Behavior |
|--------|------|-------------|----------|
| Riot Charge | $2,000 | 10 | Removes terrain |
| Riot Blast | $5,000 | 5 | Larger terrain removal |
| Baby Digger | $3,000 | 10 | Tunnels through terrain |
| Heavy Digger | $6,750 | 2 | Deeper tunneling |
| Sandhog | $16,750 | 5 | Tunnels beneath shields |

**Sandhog Specialty:** Can tunnel under shields, bypassing magnetic deflectors entirely.

#### Earth-Producing Weapons

| Weapon | Cost | Bundle Size | Radius | Behavior |
|--------|------|-------------|--------|----------|
| Dirt Clod | $5,000 | 10 | 20 | Creates solid terrain |
| Dirt Ball | $5,000 | 5 | 35 | Larger terrain creation |
| Ton of Dirt | $6,750 | 2 | 70 | Massive terrain dump |
| Liquid Dirt | $5,000 | 10 | Variable | Flows into spaces smoothly |

**Burial Mechanic:** Tanks covered with dirt must shoot themselves free, taking self-damage in the process.

#### Energy Weapons

| Weapon | Cost | Bundle Size | Radius | Behavior |
|--------|------|-------------|--------|----------|
| Plasma Blast | $9,000 | 5 | 10-75 | Damage scales with battery expenditure |
| Laser | $5,000 | 5 | Variable | Requires battery; wraps around screen |

**Energy Mechanic:** These weapons require batteries. Damage output scales with energy spent (each battery = 10 energy points).

#### Tracers

All weapons can be upgraded with tracers ($500+) that display trajectory paths, allowing more accurate follow-up shots. **Smoke Tracers** added in version 1.1 provide visual trajectory feedback.

---

## Physics System

### Core Ballistics

The game uses a 2D ballistic trajectory model accounting for:

1. **Gravity** - Constant downward acceleration (configurable)
2. **Wind** - Horizontal force affecting projectile path (displayed on-screen with direction arrows and speed)
3. **Air Viscosity** - Drag coefficient slowing projectiles
4. **Initial Velocity** - Determined by power setting (0-100%)
5. **Launch Angle** - Set by turret rotation (0-180°)

### Physics Parameters (All Configurable)

| Parameter | Description | Effect |
|-----------|-------------|--------|
| Gravity | Downward acceleration | Higher = more arc required |
| Wind Speed | Horizontal force strength | Affects lead required |
| Air Viscosity | Drag coefficient | High = shorter range |
| Wall Behavior | Edge collision rules | Bounce, Wrap, Absorb, or Concrete |

### Wall/Edge Modes

- **Bounce** - Projectiles reflect off screen edges
- **Wrap** - Projectiles teleport to opposite edge
- **Absorb** - Projectiles destroyed at edges
- **Concrete** - Solid walls that can be destroyed

### Trajectory Calculation

Hicken's implementation updated trajectories at fixed intervals to maintain consistency across varying CPU speeds. The formula follows standard projectile motion:

```
x(t) = x₀ + v₀ₓ·t + ½·wind·t²
y(t) = y₀ + v₀ᵧ·t - ½·g·t²
```

Where velocity is affected by air viscosity each frame:
```
v(t+1) = v(t) · (1 - viscosity)
```

---

## Terrain System

### Generation

- Random terrain generation for each round
- Tanks placed "scattered more or less evenly" across landscape
- Registered version included 25 additional mountain designs
- Terrain stored as heightmap (2D array of heights)

### Destruction Mechanics

**Crater Formation:**
- Explosions carve circular craters
- Crater size = blast radius of weapon
- Terrain permanently altered for remainder of round

**Falling Dirt (Suspend Dirt Setting):**
- Probability setting for suspended dirt (0-100%)
- When disabled: all unsupported terrain falls immediately
- When enabled: dirt can "float" temporarily
- **Earth Disrupter** weapon forces all suspended dirt to settle

**Dirt Physics:**
- Unsupported terrain pixels fall downward
- Accumulates at bottom of craters
- Creates natural slopes over time

### Tank-Terrain Interactions

**Movement:**
- Tanks can move left/right using fuel
- Fuel consumption increases on steep slopes
- Impossible inclines cause movement failure

**Falling Damage:**
- Tanks take damage based on fall velocity
- Higher falls = more damage
- Parachutes mitigate fall damage when deployed

**Burial:**
- Tanks covered by dirt must shoot themselves free
- Self-damage from escaping
- Strategic use of dirt weapons can immobilize enemies

---

## Economy & Shop System

### Earning Money

**Scoring Modes:**

| Mode | How Money Is Earned |
|------|---------------------|
| BASIC | Points only for kills and survival |
| STANDARD | Points for all damage dealt |
| GREEDY | Ranking by net worth (cash + equipment value) |

### Starting Money

- Configurable: $0 to $1,000,000
- Default provides enough for basic loadout
- Higher settings enable more strategic diversity

### Interest Rate

- Configurable: 0% to 30% (default 5%)
- Applied to unspent money between rounds
- Rewards conservative spending

### Shop Mechanics

**Between Rounds:**
- Access shop to buy weapons and equipment
- Items sold in bundles (e.g., missiles in groups of 5)
- Maximum 99 units of any item
- Can sell items back at depreciated value

**Free Market Mode:**
- Implements supply-demand pricing
- Popular items become more expensive
- Prices recorded in `scorch.mkt` file

**AI Shopping:**
- "Computers Buy" option (default ON)
- AI opponents purchase equipment between rounds
- Can be disabled for easier difficulty

---

## Game Modes

### Turn Structure

**Sequential (Default):**
- Players take turns in order
- Each turn: adjust angle, set power, select weapon, fire
- Watch projectile resolve before next turn

**Simultaneous Mode:**
- All players control tanks concurrently
- Each player uses 6 dedicated keys:
  - Rotate left/right
  - Power up/down
  - Fire
  - Weapon selection
- Real-time chaos with multiple projectiles

### Team Play

- Players can form teams via System Menu
- Team-based victory conditions
- Friendly fire still applies (be careful!)

### Round Configuration

- 1 to 1,000 rounds per game
- Survivors buy equipment between rounds
- Cumulative scoring across rounds
- Final winner determined by total score

---

## AI Opponent Behavior

### AI Levels (Ranked by Difficulty)

| AI Type | Behavior | Difficulty |
|---------|----------|------------|
| **Moron** | Random angle and power | Trivial |
| **Shooter** | Direct line-of-sight only | Easy |
| **Poolshark** | Calculates wall bounces | Medium |
| **Tosser** | Iteratively refines aim | Medium-Hard |
| **Chooser** | Selects optimal tactic | Hard |
| **Spoiler** | Accounts for wind/gravity | Very Hard |
| **Cyborg** | Spoiler + targets weak tanks | Expert |
| **Unknown** | Random AI type (hidden) | Variable |

### AI Characteristics

**Targeting Priority:**
- Most AIs target nearest or random opponents
- Cyborg prioritizes weakened tanks or leading players
- Some AIs avoid shooting through terrain

**Accuracy:**
- Higher-level AIs calculate wind compensation
- Spoiler achieves near-perfect accuracy (except viscosity)
- Lower AIs may take multiple shots to calibrate

**Equipment Usage:**
- AIs purchase equipment when "Computers Buy" enabled
- Higher AIs make smarter purchasing decisions
- Some AIs use shields and guidance systems effectively

---

## Defensive Systems & Accessories

### Shields

| Type | Cost | Bundle | Behavior |
|------|------|--------|----------|
| Shield | $20,000 | 3 | Absorbs explosion damage |
| Force Shield | $25,000 | 3 | Deflects projectiles |
| Heavy Shield | $30,000 | 2 | Multiple hit resistance |

**Shield Mechanics:**
- Absorb damage from explosions
- Direct hits damage shield slightly without detonation
- Limited durability; can be overwhelmed

### Magnetic Deflectors

| Type | Cost | Bundle | Behavior |
|------|------|--------|----------|
| Mag Deflector | $10,000 | 2 | Upward force on nearby projectiles |
| Super Mag | $40,000 | 2 | Superior deflection + durability |

**Mag Mechanic:**
- Exerts upward force on projectiles above tank
- Fast-falling missiles may overwhelm deflectors
- Cannot absorb sustained fire

### Parachutes

| Type | Cost | Bundle | Behavior |
|------|------|--------|----------|
| Parachute | $10,000 | 8 | Prevents fall damage |

**Parachute Mechanics:**
- Activate automatically when falling
- Configurable safety threshold (V key in tank panel)
- Essential when terrain frequently destroyed

### Guidance Systems

| Type | Cost | Bundle | Behavior |
|------|------|--------|----------|
| Heat Guidance | $10,000 | 6 | Locks onto nearest enemy |
| Ballistic Guidance | $10,000 | 2 | Calculates optimal angle |
| Horizontal Guidance | $15,000 | 5 | Maintains horizontal target |
| Vertical Guidance | $20,000 | 5 | Maintains vertical target |
| Lazy Boy | $20,000 | 2 | Near-perfect targeting |

**Guidance Mechanics:**
- Applied after firing; prompts for target selection
- Cannot be used with MIRV, Death's Head, Riot weapons, Plasma
- Resets to "None" after use to prevent waste
- Lazy Boy explodes if missing target

### Support Equipment

| Type | Cost | Bundle | Effect |
|------|------|--------|--------|
| Battery | $5,000 | 10 | 10 energy points each |
| Fuel Tank | $10,000 | 10 | 10 movement units each |
| Contact Trigger | $1,000 | 25 | Forces immediate detonation |
| Auto Defense | $1,500 | 1 | Turn-start defense config |

---

## Controls (Keyboard & Mouse)

### Primary Controls

| Action | Keyboard | Mouse |
|--------|----------|-------|
| Increase Power | UP Arrow | - |
| Decrease Power | DOWN Arrow | - |
| Rapid Power Change | PAGE UP/DOWN | - |
| Rotate Turret Left | LEFT Arrow | - |
| Rotate Turret Right | RIGHT Arrow | - |
| Fire | SPACEBAR or ENTER | Both buttons |
| Cycle Weapon | TAB / SHIFT-TAB | Click weapon name |

### Tank Control Panel (Press T)

| Key | Function |
|-----|----------|
| B | Discharge battery |
| P | Toggle parachute state |
| V | Adjust parachute threshold |
| S | Select shield type |
| E | Engage shields |
| G | Select guidance system |
| T | Toggle contact triggers |
| F | Access movement controls |

### Status Bar Controls

| Key | Function |
|-----|----------|
| B | Activate battery |
| P | Toggle parachutes |
| S | Select shield type |
| E | Engage shields |
| G | Select guidance |
| F | Use fuel (movement) |

### System Controls

| Key | Function |
|-----|----------|
| F1 / ALT-S | System menu |
| I | Inventory panel |
| K | Anti-kibitzing message |
| R | Retreat (forfeit round) |
| U | Game status update |
| 0-9 | Display tank info |

---

## Power-Ups & Special Items

The game refers to purchasable equipment as "accessories" rather than traditional power-ups. All items are bought between rounds:

### Offensive Accessories
- **Contact Triggers** - Force immediate detonation on impact
- **Guidance Systems** - Improve accuracy dramatically

### Defensive Accessories
- **Shields** - Absorb/deflect damage
- **Mag Deflectors** - Push away projectiles
- **Parachutes** - Prevent fall damage

### Utility Accessories
- **Batteries** - Power energy weapons and recharge tank
- **Fuel Tanks** - Enable tank movement
- **Auto Defense** - Quick access to defense config

### Registered Version Extras
- Triple-turreted tanks (fire 3 directions)
- 25 additional mountain/terrain designs
- Additional customization options

---

## What Made Scorched Earth Fun & Addictive

### 1. Simple Core, Deep Mastery

The basic loop is immediately understandable: aim, set power, fire. But mastering wind compensation, weapon selection, and terrain manipulation takes hours. This "easy to learn, hard to master" design keeps players engaged.

### 2. Highly Configurable

Computer Gaming World (1993) called it "the most configurable artillery game I have come across." Players could adjust:
- Gravity, wind, viscosity
- Wall behavior (bounce, wrap, absorb)
- Economy settings
- AI difficulty mix
- Round count

This allowed groups to find their preferred balance.

### 3. Massive Weapon Variety

30+ weapons with distinct behaviors created emergent strategies:
- MIRV for area denial
- Sandhogs to bypass shields
- Dirt weapons for immobilization
- Rollers for valley targets
- Nukes for desperate situations

### 4. Dynamic Battlefields

Every shot permanently altered terrain. Strategies had to evolve mid-match:
- Craters created cover opportunities
- Terrain shifts changed viable angles
- Falling dirt could expose or bury tanks

### 5. Social Multiplayer

Supporting 10 players on one machine created memorable moments:
- Trash talk via customizable quips
- Betrayals in free-for-all mode
- Alliance formation and breaking
- Shared keyboard chaos in simultaneous mode

One player recalled: "This game used to tear my family apart. Many great nights with everybody sitting around the 386."

### 6. Risk/Reward Economy

The shop system added strategic depth:
- Spend big on nukes or save for interest?
- Buy shields or more offensive options?
- How much to invest in guidance systems?

### 7. Satisfying Feedback

Despite simple graphics:
- Explosions were visually satisfying
- Terrain deformation felt impactful
- Customizable death messages added personality
- Nuclear weapons felt appropriately devastating

### 8. Quick Rounds, Long Sessions

Individual rounds resolved quickly, but the "one more round" pull kept sessions going for hours. The round-based progression with equipment purchasing created addictive loops.

---

## Mobile/Touch Adaptation Considerations

### Mechanics That Map Well to Touch

| Mechanic | Touch Adaptation |
|----------|------------------|
| Angle adjustment | Swipe gesture or slider |
| Power setting | Drag/slider control |
| Weapon selection | Tap to open wheel/grid |
| Firing | Tap button or release gesture |
| Shop interface | Native touch scrolling |

### Mechanics Requiring Adaptation

| Challenge | Consideration |
|-----------|---------------|
| Precision aiming | Need zoom or fine-tune mode |
| Simultaneous mode | Not feasible on single device |
| 10-player local | Impractical; focus on 2-player or online |
| Status bar controls | Replace with touch-friendly panels |
| Keyboard shortcuts | Convert to toolbar buttons |

### Orientation Considerations

**Landscape (Recommended):**
- Matches original game's horizontal battlefield
- More terrain visible at once
- Better for trajectory visualization
- Standard for similar mobile games (Angry Birds, etc.)

**Portrait Considerations:**
- Could work with vertical terrain generation
- Smaller projectile paths
- HUD placement challenges
- Less common for artillery games

### Touch-Specific Opportunities

1. **Gesture-Based Aiming**
   - Drag from tank to set angle and power simultaneously
   - Release to fire (like Angry Birds)
   - Provides intuitive physics feedback

2. **Touch-Friendly Shop**
   - Grid-based weapon browser
   - Swipe between categories
   - Tap to purchase

3. **Pinch-to-Zoom**
   - Zoom into specific areas
   - Important for precise aiming on small screens

4. **Haptic Feedback**
   - Vibration on explosions
   - Subtle feedback on UI interactions

### Mobile-Specific Features to Consider

- Auto-save between turns
- Push notifications for async multiplayer
- Touch-optimized tutorials
- Simplified control scheme option
- Portrait orientation quick-play mode

---

## Version History

| Version | Notable Additions |
|---------|-------------------|
| 1.0 | Original release |
| 1.1 | Napalm, Hot Napalm, Liquid Dirt, Smoke Tracers |
| 1.5 | Lasers, SuperMags, additional scenery |

### Hidden/Unused Content

Found in game files but not accessible in normal gameplay:
- Jump Jets
- Teleporter
- Popcorn Bomb

---

## Technical Implementation Notes

### Performance Optimization

Hicken optimized physics simulations for slower hardware by:
- Updating trajectories at fixed intervals
- Factoring mass, momentum, wind, gravity consistently
- Using Turbo Assembler for critical sections

### Display

- 640x480 VGA graphics (or lower)
- EGA support for older systems
- Terrain rendered as colored pixels
- Simple sprite-based tanks

### Sound

- PC Speaker support
- Sound Blaster support for enhanced audio
- Customizable sound effects

---

## Sources

- [Abandonware DOS - Scorched Earth Manual](https://www.abandonwaredos.com/docawd.php?sf=scorchedearthmanual.txt)
- [MobyGames - Scorched Earth](https://www.mobygames.com/game/402/scorched-earth/)
- [My Abandonware - Scorched Earth](https://www.myabandonware.com/game/scorched-earth-192)
- [ClassicReload - Scorched Earth](https://classicreload.com/res/scorched-earth.html)
- [The Cutting Room Floor - Scorched Earth](https://tcrf.net/Scorched_Earth)
- [RGB Classic Games - Scorched Earth](https://www.classicdosgames.com/game/Scorched_Earth.html)
- [DOS Games Archive](https://www.dosgamesarchive.com/download/scorched-earth)
- [Internet Archive - Scorched Earth](https://archive.org/details/msdos_Scorched_Earth_1991)
