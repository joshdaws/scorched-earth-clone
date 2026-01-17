# Artillery Game Best Practices
## Research on Successful Mobile Artillery/Slingshot Games

**Research Date:** January 12, 2026
**Purpose:** Inform Unity migration specification for Scorched Earth: Synthwave Edition

---

## Executive Summary

After analyzing 6+ successful artillery and slingshot games (Angry Birds, Angry Birds 2, Pocket Tanks, ShellShock Live, Worms series, and Bad Piggies), several key patterns emerge:

### Core Findings

1. **Slingshot Mechanics Win on Mobile**: Drag-and-release controls with trajectory preview are the industry standard for mobile artillery games, providing superior touch experience over angle/power sliders.

2. **"Juice" is Non-Negotiable**: Screen shake, particle effects, slow-motion on big impacts, and satisfying audio feedback are what separate good artillery games from great ones. Angry Birds' success is partly attributed to these polish elements.

3. **Hybrid Monetization is Standard**: By 2026, successful games blend rewarded ads, optional IAPs, and (optionally) battle passes. Single-model monetization underperforms.

4. **Weapon Variety Drives Retention**: The most successful artillery games (ShellShock Live with 400+ weapons, Pocket Tanks with 400+ weapons) prioritize massive weapon variety as their core progression hook.

5. **Star-Based Progression Works**: The 1-3 star rating system per level creates clear goals and replayability. Players understand "beat it" vs "master it."

6. **Daily Engagement Mechanics Are Expected**: Daily login rewards, limited-time events, and progression systems that reward regular play are industry standard in 2026, with research showing 30% increase in D7 retention.

### Key Metrics to Target (2026 Industry Standards)

- **D1 Retention**: 45%+ (Day 1)
- **D7 Retention**: 20%+ (Day 7)
- **D30 Retention**: 15%+ (Day 30)
- **Rewarded Ad eCPM**: $14+ on iOS (US market)

---

## 1. Mechanics Deep Dive

### 1.1 Aiming & Firing Systems

#### Slingshot/Pull-Back Mechanic (Angry Birds Model)

**Implementation:**
- Player touches projectile/tank and drags backward
- Visual rubber band or trajectory arc appears
- Release = fire
- Pull distance = power
- Pull angle = launch angle

**Advantages:**
- Intuitive on touchscreens
- Single gesture controls both angle and power
- Natural feedback (pull harder = more power)
- Works in portrait or landscape

**When to Use:**
- Mobile-first games
- Casual audience
- Quick, arcade-style play
- Physics-based puzzle emphasis

**References:**
- [Angry Birds original game](https://en.wikipedia.org/wiki/Angry_Birds_(video_game)) - Pioneered this mechanic
- [Touch control best practices](https://www.wayline.io/blog/one-touch-artillery-the-secret-to-mobile-game-replayability)

#### Angle/Power Sliders (Classic Artillery Model)

**Implementation:**
- Separate controls for angle (0-180°) and power (0-100%)
- Often keyboard-based (arrows to adjust)
- Explicit numerical readouts

**Advantages:**
- Precise control
- Easy to communicate values to other players
- Familiar to PC artillery game fans
- Natural for turn-based competitive play

**When to Use:**
- PC/console ports
- Competitive/hardcore audience
- Turn-based multiplayer where precision matters
- When wind/environmental factors require calculation

**References:**
- [Scorched Earth (1991)](https://en.wikipedia.org/wiki/Artillery_game) - Original model
- [Pocket Tanks](https://en.wikipedia.org/wiki/Artillery_game) - Modern implementation
- [ShellShock Live](https://store.steampowered.com/app/326460/ShellShock_Live/) - 400+ weapons with slider controls

#### Hybrid Approaches

**Bad Piggies Model:**
- Vehicle building + physics simulation
- No direct aiming - player designs contraption
- Indirect control through vehicle properties

**Worms Model:**
- Click to aim direction
- Hold spacebar for power (charging bar)
- Combines pointing with timing challenge

**Recommendation for Mobile:**
Modern mobile artillery games overwhelmingly favor slingshot mechanics. [One-touch artillery controls](https://www.wayline.io/blog/one-touch-artillery-the-secret-to-mobile-game-replayability) are proven to drive higher retention and engagement.

### 1.2 Trajectory Preview

**Industry Standard Features:**

1. **Dotted Line Arc**
   - Shows predicted path of projectile
   - Updates in real-time as player adjusts aim
   - [Chillingo added this to Angry Birds](https://stickmanphysics.com/stickman-physics-home/two-dimensional-motion/angry-birds-projectile-motion/) during final polish - became essential feature
   - Can be power-up / optional aid for difficulty tuning

2. **Ghost Projectile**
   - Semi-transparent projectile travels the predicted path
   - More visually clear than dotted line
   - Popular in 3D artillery games

3. **End Point Indicator**
   - Marker showing where projectile will land
   - Sometimes shows explosion radius
   - Critical for precision gameplay

**Implementation Patterns:**

```
Basic Physics Formula:
- Position(t) = initial_pos + velocity*t + 0.5*gravity*t²
- Draw line segments connecting positions at fixed time intervals
- Account for wind as constant horizontal acceleration
```

**Accuracy Considerations:**
- Full accuracy = easy game (player sees exact result)
- Partial accuracy = shows arc but not collision outcome
- No preview = hardcore mode (Scorched Earth original)

**Recommended Approach:**
- Default: Full trajectory preview (accessibility)
- Optional: Preview toggle for challenge seekers
- Hard mode: Limited preview or none
- [Unity implementation example](https://github.com/llamacademy/projectile-trajectory)

### 1.3 Physics "Feel"

#### Gravity Tuning

**Real-world gravity** (9.8 m/s²) often feels too fast for games.

**Common adjustments:**
- Angry Birds uses ~30-40% real gravity
- Worms uses variable gravity based on level design
- [Physics feel research](https://stickmanphysics.com/stickman-physics-home/two-dimensional-motion/angry-birds-projectile-motion/) shows players prefer exaggerated arcs

**Goal:** Satisfying arc that:
- Stays on screen long enough to track
- Feels powerful/impactful
- Allows player to appreciate physics simulation

#### Wind Mechanics

**Implementation Patterns:**

| Game | Wind Approach | Impact |
|------|---------------|--------|
| Scorched Earth | Random per turn, significant effect | Core strategic element |
| Worms | Minimal, mostly cosmetic | Visual flavor |
| Angry Birds | None | Simplicity focus |
| ShellShock Live | Present but moderate | Strategic variable |

**Recommendation:**
- Include wind as optional difficulty modifier
- Visual indicators (clouds, flags, particles)
- Make it feel "real" through visual consistency
- Consider weather themes (calm, breezy, storm)

#### Impact Feedback ("Juice")

**Essential Elements:**

1. **Screen Shake**
   - Magnitude proportional to explosion size
   - [Vlambeer is the master](https://gamedevacademy.org/game-feel-tutorial/) of screen shake
   - Typical duration: 0.1-0.3 seconds
   - Avoid motion sickness: cap intensity, add settings toggle

2. **Time Dilation / Slow Motion**
   - Brief slowdown (20-30% speed) on critical hits
   - Duration: 0.2-0.5 seconds
   - [Adds weight to impacts](https://www.bloodmooninteractive.com/articles/juice.html)
   - Used in Angry Birds on final pig elimination

3. **Particle Effects**
   - Explosion flash (bright, saturated)
   - Debris (dirt, structure pieces)
   - Smoke plumes
   - Dust clouds on landing
   - [Simple effects, dramatic impact](https://medium.com/@yemidigitalcash/when-you-play-a-great-game-it-feels-good-d23761b6eccf)

4. **Sound Design**
   - Layered explosion sounds (initial boom + rumble)
   - Environmental audio (debris falling)
   - Satisfying "thunk" sounds for impacts
   - Musical stings for big moments

5. **Camera Movement**
   - Follow projectile during flight
   - Zoom in on impact point
   - Smooth interpolation (ease in/out)
   - Return to overview after explosion

**Warning:** [The "juice" problem](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design) - Don't use flashy feedback to hide shallow gameplay. Juice amplifies good mechanics, it doesn't fix bad ones.

### 1.4 Destruction Physics

**What Makes It Satisfying:**

1. **Realistic Cascade Effects**
   - Structures collapse believably
   - Chain reactions (one explosion causes another)
   - [Gravity-driven falling debris](https://en.wikipedia.org/wiki/Angry_Birds_(video_game))

2. **Material Properties**
   - Wood: Splinters, lighter pieces
   - Stone: Heavy chunks, dust
   - Metal: Bends then breaks
   - Glass: Shatters into many small pieces

3. **Terrain Deformation**
   - Scorched Earth's core feature: destroyable terrain
   - Dirt falls realistically
   - Craters affect future shots
   - Strategic gameplay (dig to enemy, create barriers)

**Performance Considerations:**
- Limit active physics objects
- Merge/simplify debris after settling
- Use sprite-based destruction for distant/small elements
- Reserve full physics for focal areas

### 1.5 Turn Structure

#### Continuous Shots (Angry Birds Model)

**Flow:**
1. Player shoots bird
2. Waits for physics to settle
3. Immediately shoots next bird
4. Continue until all birds used or level won

**Advantages:**
- Fast-paced, arcade feel
- Player maintains control flow
- Good for single-player puzzle focus
- Natural difficulty scaling (more birds = more tries)

**Disadvantages:**
- Not truly competitive
- AI opponent can feel artificial
- Less strategic depth

#### Alternating Turns (Classic Artillery Model)

**Flow:**
1. Player 1 aims and shoots
2. Waits for projectile impact/physics
3. Player 2 aims and shoots
4. Repeat until winner decided

**Advantages:**
- True competitive gameplay
- Strategic mind games
- Wind/environmental changes between turns
- Natural multiplayer implementation
- Builds tension (will they hit me?)

**Disadvantages:**
- Slower paced
- Player waits during opponent turn
- Requires balanced AI for single-player

**Recommendation for Scorched Earth:**
Stick with **alternating turns** - it's core to the Scorched Earth identity. Modernize with:
- Smooth camera work during transitions
- Quick replays of impressive shots
- Background music keeps energy up
- Optional "fast forward" through enemy turn

---

## 2. Progression Framework

### 2.1 Level Structure

#### Star Rating System (1-3 Stars)

**How It Works:**
- Complete level = 1 star (minimum)
- Meet challenge goal = 2 stars
- Perfect performance = 3 stars

**Benefits:**
- Clear skill expression
- Replayability (go back for 3-star)
- Gates content (need X stars to unlock next world)
- Satisfying completion tracking

**Angry Birds Model:**
- Stars based on score threshold
- Score = damage dealt + birds remaining
- Formula encourages efficiency

**Artillery Game Adaptation:**
```
1 Star: Win the match
2 Stars: Win + accuracy bonus (hit enemy X times)
3 Stars: Win + accuracy + efficiency (use ≤Y weapons)
```

**Progression Gating:**
- World 2 requires 15 stars from World 1
- World 3 requires 30 stars from Worlds 1-2
- Forces some mastery before advancing
- [Mobile game progression patterns](https://lootbar.gg/blog/en/mobile-legends-rank-system-guide-climb-faster-and-dominate.html) show gating improves retention

### 2.2 Difficulty Curves

**Industry Best Practice:**

1. **Tutorial Levels (1-10)**
   - Introduce one mechanic at a time
   - Impossible to fail first 3-5 levels
   - Light enemy AI (stationary, poor aim)

2. **Early Game (11-30)**
   - Gentle difficulty increase
   - Introduce weapon variety
   - AI becomes mobile, slightly better aim

3. **Mid Game (31-60)**
   - Steeper curve
   - Complex terrain
   - AI uses weapon variety
   - Multiple enemies or objectives

4. **Late Game (61+)**
   - Assumes mastery
   - Precision required
   - AI approximates skilled human
   - Environmental hazards

**Difficulty Variables:**
- Enemy health
- Enemy aim accuracy
- Starting positions (cover/exposure)
- Terrain complexity
- Wind strength
- Weapon restrictions

### 2.3 Unlockable Content

#### Weapon Unlocks (Primary Progression Hook)

**Industry Leaders:**
- [ShellShock Live: 400+ weapons](https://store.steampowered.com/app/326460/ShellShock_Live/)
- [Pocket Tanks: 400+ weapons](https://en.wikipedia.org/wiki/Artillery_game) across various packs
- [Worms series: 50+ weapons](https://worms.fandom.com/wiki/Category:Weapons) with crafting system in recent entries

**Unlock Patterns:**

| Method | Example | Pros | Cons |
|--------|---------|------|------|
| **Level-based** | "Unlock MIRV at level 10" | Predictable, guaranteed progress | Can feel grindy |
| **Currency** | "Buy Nuke for 5000 coins" | Player choice, satisfying purchase | Requires balanced economy |
| **Achievement** | "Hit 3 enemies with one shot → unlock Cluster Bomb" | Rewards skill/creativity | Can block progression |
| **Random drops** | Loot boxes, crates | Excitement, "Christmas morning" feeling | Can feel unfair, gambling concerns |

**Recommended Hybrid:**
- Core weapons: Level-based unlocks (guaranteed)
- Advanced weapons: Currency purchases (choice)
- Special weapons: Achievement unlocks (prestige)

#### Cosmetic Unlocks

**What Works:**
- Tank skins/colors
- Projectile trails (Scorched Earth: synthwave neon trails!)
- Victory animations
- UI themes
- Soundtracks/music packs

**Why Cosmetics Matter:**
- Monetization without pay-to-win
- Self-expression
- Collection-completion drive
- Premium feeling rewards
- [Brawl Stars model](https://skycoach.gg/blog/brawl-stars/articles/brawlers-leveling-guide): Skins are major revenue driver

**Scorched Earth Opportunities:**
- Synthwave color palettes (Outrun, Hotline Miami, Blood Dragon)
- Tank chassis styles (cyberpunk, retro, neon)
- Explosion effects (grid-based, holographic, glitch)
- CRT filter intensity
- Custom music tracks

#### Stat Upgrades

**Approach with Caution:**
- Upgrading tank health/damage can create pay-to-win
- Works better: Unlock side-grades (different, not better)

**Safe Implementations:**
- Cosmetic upgrades that don't affect gameplay
- Single-player only upgrades
- Capped upgrades (max +20% health, everyone can reach cap)

### 2.4 Currency Systems

#### Single Currency (Simple)

**Example:** Coins earned from playing, spend on weapons/cosmetics

**Advantages:**
- Easy to understand
- Can't create exploits through exchange
- One earn rate to balance

**Disadvantages:**
- Less monetization flexibility
- No "premium" feeling currency

#### Dual Currency (Industry Standard)

**Common Pattern:**
- **Soft Currency**: Earned through play (coins, credits)
- **Hard Currency**: Purchased with real money (gems, diamonds)
- Hard currency can buy anything
- Soft currency limited to some items

**[Angry Birds 2 model](https://liteapks.com/angry-birds-2-2.html):**
- Gems (hard) + various soft currencies (feathers, coins)
- Can progress entirely free (but slowly)
- Hard currency accelerates progression

**Earn Rates (2026 Best Practices):**
- Player should unlock something meaningful every 2-3 sessions
- First weapon purchase: ~3 games of play
- Mid-tier weapon: ~10-15 games
- Premium weapon: ~30-40 games OR $2-5 IAP
- [Balance retention with monetization](https://maf.ad/en/blog/mobile-game-retention-benchmarks/)

**Anti-Frustration Features:**
- Never lock core mechanics behind currency
- Always offer earned path (not just paid)
- No "lose all your money on death" mechanics
- Show progress toward next unlock

---

## 3. Monetization Analysis

### 3.1 Business Model Options (2026 Landscape)

#### Premium (Paid Download)

**Model:** One-time purchase ($2.99 - $9.99), full game access

**Market Reality:**
- [95.37% of iOS apps are free](https://adjoe.io/blog/app-monetization-strategies/)
- Very difficult to convince users to pay upfront
- Works best for:
  - Established IP/brand
  - Ports of beloved classics
  - "Premium experience" positioning

**Revenue Potential:** Low volume, one-time payment

**Pros:**
- No ads
- No F2P stigma
- Predictable revenue per user
- Can charge more for "complete" experience

**Cons:**
- Extremely hard to get downloads
- No ongoing revenue per user
- Must compete with free alternatives
- High user expectation for polish

**Verdict for Scorched Earth:** **Not recommended** unless building cult following first via free version

#### Free-to-Play (F2P)

**Model:** Free download, monetize via ads and IAPs

**Market Reality:**
- Dominant model in mobile gaming (2026)
- User expectation is "try before you buy"
- Can reach massive audience

**Revenue Potential:** High volume × low conversion = significant revenue

**Pros:**
- No download barrier
- Large potential audience
- Multiple monetization streams
- Can optimize over time

**Cons:**
- Must balance monetization vs player experience
- Risk of "pay to win" perception
- More complex economy design
- Requires ongoing content/updates

**Verdict for Scorched Earth:** **Recommended** with ethical implementation

#### Hybrid / "Freemium"

**Model:** Free with optional "Premium Upgrade" IAP ($4.99 - $14.99)

**What Premium Unlocks:**
- Remove all ads
- Bonus starting currency
- Exclusive cosmetics
- Early access to weapons
- Double currency earn rate

**Best of Both Worlds:**
- Large free audience
- Satisfying "premium" purchase for supporters
- [Hybrid monetization is 2026 standard](https://studiokrew.com/blog/mobile-game-monetization-models-2026/)

**Verdict for Scorched Earth:** **Best overall approach**

### 3.2 Advertising Strategy

#### Rewarded Video Ads (Primary Ad Format)

**How It Works:**
- Player chooses to watch 15-30 second ad
- Receives reward (currency, extra life, power-up)
- No interruption of gameplay flow

**Why It Works:**
- [30%+ higher engagement](https://adjoe.io/blog/app-monetization-strategies/) than forced ads
- Player feels in control
- Generates strong revenue: [$14.16 eCPM on iOS (US)](https://studiokrew.com/blog/mobile-game-monetization-models-2026/)
- Minimal player frustration

**Best Practices:**
- Offer meaningful rewards (not insulting amounts)
- Multiple opportunities per session (not just one)
- Clear presentation ("Watch ad for 100 coins?")
- Never required for core progression
- Strategic placement: after loss, between rounds, in shop

**Scorched Earth Implementation:**
```
Rewarded Ad Opportunities:
- After losing match: "Continue with +50% health?"
- In weapon shop: "Watch ad for 200 coins?"
- Before special level: "Watch ad to start with MIRV?"
- Daily bonus: "Double your daily reward?"
```

#### Interstitial Ads (Use Sparingly)

**How It Works:**
- Full-screen ad appears at transition points
- Player must watch (can skip after 5-10 seconds)

**Best Practices:**
- [Place during natural breaks](https://yango-ads.com/blog/mobile-game-monetization-strategies-that-drive-revenue), never mid-gameplay
- Limit frequency (no more than 1 per 3-5 minutes)
- After match completion (win or loss)
- When returning to main menu
- **Never** during aiming/shooting

**Warning:** Overuse drives uninstalls. [User reviews consistently cite excessive ads](https://www.iion.io/blog/mobile-game-monetization-trends-best-strategies-to-monetize-your-game-in-2024) as #1 complaint.

**Recommendation:** Start with rewarded video only. Add interstitials only if needed after monitoring metrics.

#### Banner Ads (Avoid)

**Why Skip Them:**
- Low revenue (pennies per impression)
- Visual clutter
- Accidental clicks frustrate users
- Cheap/tacky feeling
- Screen real estate waste

**Verdict:** Not worth it for premium-feeling game like Scorched Earth

### 3.3 In-App Purchases (IAP)

#### Currency Packs

**Standard Pricing Structure (2026):**

| Pack | Price | Amount | Bonus | Value Prop |
|------|-------|--------|-------|------------|
| Starter | $0.99 | 500 gems | 0% | "Taste" of premium currency |
| Small | $2.99 | 1,500 gems | +10% | Best value for casual spenders |
| Medium | $4.99 | 3,000 gems | +20% | Most popular |
| Large | $9.99 | 7,000 gems | +40% | "Best value" badge |
| Huge | $19.99 | 18,000 gems | +80% | Whale bait |
| Mega | $49.99 | 55,000 gems | +120% | Serious spenders only |

**Psychology:**
- Medium pack is "goldilocks" (not too cheap, not too expensive)
- Large pack gets "best value" badge to push upsell
- Bonus % increases with price = incentive to spend more
- Multiple options = something for everyone

#### Consumable IAPs

**Examples:**
- Instant currency bundles
- Power-up packs (5× MIRV, 3× Nuke, etc.)
- Cosmetic unlocks
- "Continue" purchases (after losing)

**Best Practices:**
- Never required for progression
- Accelerators, not gatekeepers
- Clear value proposition
- No "gotcha" hidden costs

#### Non-Consumable IAPs

**Examples:**
- "Premium Upgrade" (remove ads forever)
- Permanent double currency
- Exclusive cosmetic packs
- Special game modes

**Best Practices:**
- Price at $4.99 - $9.99 (sweet spot)
- Should feel like meaningful upgrade
- [Premium upgrade often highest $/player](https://adapty.io/blog/mobile-game-monetization/)

**Scorched Earth Premium Upgrade ($6.99):**
```
✓ Remove all ads
✓ 2x currency earn rate
✓ Exclusive "Retro" tank skin pack
✓ Early access to new weapons (3 days)
✓ Daily premium reward (500 coins/day)
✓ Support indie dev!
```

#### Battle Pass / Season System

**How It Works:**
- 30-90 day season with tiered rewards
- Free track: Everyone gets some rewards
- Premium track ($9.99): Better rewards at each tier
- Progress by playing, completing challenges
- FOMO (fear of missing out) drives sales

**Why It Works:**
- [Predictable revenue](https://studiokrew.com/blog/mobile-game-monetization-models-2026/) each season
- Encourages regular play (must progress before season ends)
- Less "pay to win" than direct power purchases
- Feels like good value (if you play regularly)
- Premium track typically pays for itself in currency value

**Considerations:**
- Requires content updates each season
- Must balance free vs premium rewards
- Risk of treadmill feeling

**Verdict for Scorched Earth:** Consider for post-launch (3+ months) if player base is active

### 3.4 What to Avoid (2026 Red Flags)

**Don't Do These:**

1. **Pay-to-Win Mechanics**
   - Selling weapons that are objectively better (not just different)
   - Stat upgrades only accessible via IAP
   - PvP where spenders have major advantage

2. **Deceptive Pricing**
   - Hiding true cost (e.g., "$0.99!" but you need 3 of them)
   - Confusing currency conversions
   - "Limited time" offers that never end

3. **Manipulative Tactics**
   - Loot boxes with unknown odds (getting banned in some regions)
   - Fake "other players bought this" notifications
   - Aggressive pop-ups

4. **Energy/Lives Systems That Feel Punishing**
   - "Out of lives, wait 4 hours or pay"
   - Can work, but must be generous (free players should play 15-30 min sessions)

5. **Ads That Interrupt Gameplay**
   - Never during aiming, shooting, or active gameplay
   - Only at natural breaks

6. **Expensive Core Content**
   - If basic weapons/features cost $20+ to unlock
   - Free players should access 80%+ of content

**Apple App Store Guidelines to Follow:**
- Clear pricing
- Transparent odds (if any randomness)
- No "manipulative" tactics (their judgment)
- Kids Category: No ads, no loot boxes

---

## 4. UI/UX Guidelines

### 4.1 Touch Optimization

#### Screen Layout (Mobile)

**Landscape Orientation (Recommended for Artillery):**
```
┌─────────────────────────────────────────────┐
│  [HUD]         GAME VIEW          [HUD]     │
│  Health                            Weapon   │
│  Wind                              Power    │
│                                    Angle    │
│                                             │
│                                             │
│  [Bottom: large touch targets]             │
│  [FIRE]  [WEAPON SELECT]  [MENU]           │
└─────────────────────────────────────────────┘
```

**Key Principles:**
- [Important buttons in "thumb zone"](https://adroittechstudios.com/how-to-make-mobile-shooting-controls-fun/) (bottom corners)
- Game view is unobstructed
- HUD is informational, not interactive (except weapon select)
- Minimum 44×44pt touch targets (iOS HIG)
- Extra padding between adjacent buttons

**Portrait Orientation (If Supporting):**
- Less ideal for artillery (wide view helpful)
- Can work for casual modes
- UI at top and bottom, game in middle

#### Gesture Patterns

**Primary Aiming Gesture (Slingshot):**
1. Touch down on tank/projectile
2. Drag in opposite direction of desired fire
3. Visual feedback (trajectory arc appears)
4. Release to fire

**Supporting Gestures:**
- Pinch to zoom (examine battlefield)
- Double-tap to quick-zoom on enemy
- Swipe left/right to cycle weapons
- Two-finger drag to pan camera (during planning)

**Avoid Gesture Conflicts:**
- Don't use same gesture for multiple actions
- Provide visual feedback immediately on touch down
- [Clear visual distinction](https://www.wayline.io/blog/one-touch-artillery-the-secret-to-mobile-game-replayability) between game interaction vs UI buttons

#### Button Placement

**[Thumb-Friendly Zones](https://www.designrush.com/agency/mobile-app-design-development/trends/mobile-app-monetization):**
- Bottom left: Primary action (Fire)
- Bottom right: Secondary action (Weapon select)
- Top corners: Low-frequency actions (Settings, pause)
- Center bottom: Tertiary actions (Special abilities)

**Size Recommendations:**
- Primary buttons: 60×60pt minimum
- Secondary buttons: 50×50pt minimum
- Text buttons: 44pt height minimum

**Visual Design:**
- High contrast against background
- Clear labels or universally understood icons
- Active state feedback (button press animation)
- Disabled state clearly distinct

### 4.2 Feedback Systems

#### Power/Trajectory Indicators

**Real-Time Feedback:**
- Trajectory arc updates as player adjusts aim
- Power meter fills/empties based on pull distance
- Angle displayed numerically (optional, for precision)
- Wind indicator (flag, arrow, particles)

**Visual Language:**
```
Trajectory Arc:
- Green: Safe shot, will clear obstacles
- Yellow: Risky shot, might clip terrain
- Red: Will hit obstacle before reaching enemy

Power Meter:
- Color gradient: 0% (blue) → 50% (yellow) → 100% (red)
- Tick marks at 25%, 50%, 75%
- "Optimal power zone" highlighted (60-80% often best)
```

#### Score/Damage Feedback

**During Impact:**
- Floating damage numbers (large, bold)
- Color-coded: White (normal), Yellow (good), Red (critical)
- Combo indicators ("Double hit!", "Headshot!")
- Screen position: Above impact point

**After Round:**
- Detailed breakdown:
  - Damage dealt: XXX
  - Accuracy bonus: +XX
  - Efficiency bonus: +XX
  - Total score: XXXX
- Stars earned (animate 1, 2, or 3 stars)
- Currency reward
- Progress toward next unlock

**Example (Angry Birds Model):**
```
LEVEL COMPLETE!

Damage dealt:     12,450 pts
Birds remaining:  ×3  +9,000 pts
Time bonus:           +550 pts
                  ─────────────
TOTAL:           21,000 pts

★ ★ ☆  (2 Stars - 25,000 for 3★)

+350 coins
```

#### Level Complete Screens

**Best Practices:**
- Big, celebratory visuals (confetti, fireworks)
- Victory music sting
- Summary stats
- Rewards clearly displayed
- Clear "Continue" CTA
- Optional: Replay level, Share result, Watch ad for bonus

**Scorched Earth Opportunity:**
- Synthwave victory scene (neon grid, sunset, tank silhouette)
- Procedural "best shot" replay
- Leaderboard position (if implemented)

### 4.3 Shop/Inventory Presentation

#### Weapon Shop UI

**Information to Display:**
- Weapon icon/visual
- Name
- Description (what it does)
- Damage stats
- Special properties
- Unlock requirement OR price
- "New!" badge if recently unlocked

**Layout Patterns:**

**Grid View (Browsing):**
```
┌────┬────┬────┬────┐
│ Icon│ Icon│ Icon│ Icon│
│ Name│ Name│ Name│ Name│
│Price│Price│🔒  │Price│
└────┴────┴────┴────┘
```

**Detail View (Considering Purchase):**
```
┌───────────────────────────────────┐
│                                   │
│        [LARGE WEAPON ICON]        │
│                                   │
│  WEAPON NAME                      │
│  "Flavor text description..."     │
│                                   │
│  Damage:     ████████░░  80       │
│  Blast Radius: █████████░  90     │
│  Accuracy:   ████░░░░░░  40       │
│                                   │
│  Unlocks at Level 15              │
│  OR                               │
│  [BUY NOW - 5000 coins]           │
└───────────────────────────────────┘
```

**Purchase Flow:**
1. Player taps weapon
2. Detail view slides in
3. "Buy" or "Unlock" button prominent
4. Confirmation dialog (prevent accidental purchase)
5. Success animation + sound
6. "Equip now?" prompt

#### Currency Display

**Always Visible:**
- Current currency amount in HUD (top-left or top-right)
- Update with smooth animation when it changes
- [+ Amount] floats up when earned

**In Shop:**
- Player's currency at top
- Each item shows cost
- Insufficient funds = item grayed out
- "Get More" button leads to IAP or rewarded ad

### 4.4 Accessibility Considerations

**Visual:**
- Colorblind modes (deuteranopia, protanopia, tritanopia)
- High contrast mode
- Adjustable UI scale
- Clear iconography (don't rely on color alone)

**Audio:**
- Subtitles for any story/dialogue
- Visual indicators for sound cues (enemy shooting, incoming projectile)
- Independent volume sliders (music, SFX, voice)

**Motor:**
- Adjustable touch sensitivity
- Option to use sliders instead of slingshot (for precision)
- Toggleable auto-fire
- Generous touch targets

**Cognitive:**
- Tutorial can be replayed
- Clear labeling
- Consistent UI patterns
- Optional gameplay tips

**iOS Specific:**
- Support Dynamic Type (text scaling)
- VoiceOver compatibility (screen reader)
- Reduced motion option

---

## 5. Retention Mechanics

### 5.1 Daily Engagement

#### Daily Rewards

**Industry Standard Pattern:**

| Day | Reward | Purpose |
|-----|--------|---------|
| 1 | 100 coins | Participation trophy |
| 2 | 150 coins | Building habit |
| 3 | 200 coins | Commitment test |
| 4 | Weapon unlock (1-time use) | Exciting milestone |
| 5 | 300 coins | Staying engaged |
| 6 | Cosmetic item | Visual progress |
| 7 | 500 coins + Premium item | Big payoff, reset cycle |

**Best Practices:**
- [30% uptick in retention](https://segwise.ai/blog/boost-mobile-game-retention-strategies) for games with daily login bonuses
- Escalating rewards (each day better than last)
- "Streak" concept (miss a day = restart)
- Forgiveness: "Grace period" of 2-4 hours past midnight
- Visual calendar showing week's rewards

**Psychology:**
- Days 3-4 are dropout points (make Day 4 exciting)
- Day 7 should feel like a milestone
- Knowing what's coming tomorrow increases return rate
- [Unpredictable rewards](https://moldstud.com/articles/p-mobile-game-development-understanding-the-power-of-retention-mechanics) (70% more effective) - mix fixed + surprise bonuses

#### Daily Challenges

**Structure:**
- 3-5 challenges per day
- Variety: Combat, skill, exploration
- Completable in single session (15-30 min)
- Bonus for completing all

**Examples for Scorched Earth:**
- "Deal 5000 damage with explosive weapons"
- "Win 3 matches using only basic shot"
- "Hit enemy tank with your first shot"
- "Destroy 10 terrain obstacles"
- "Complete any level with 3 stars"

**Rewards:**
- Individual challenge: 50-100 coins
- Complete all: Bonus 200 coins + loot crate

**Why They Work:**
- [Gives players direction](https://www.blog.udonis.co/mobile-marketing/mobile-games/gaming-trends) ("what should I do today?")
- Encourages trying different strategies/weapons
- Breaks up monotony
- Feeling of accomplishment

### 5.2 Long-Term Hooks

#### Collection Completion

**Types of Collections:**
- Weapon unlocks (42 weapons = 42 checkboxes)
- Cosmetic skins (20 tank skins, 15 projectile trails)
- Achievement badges
- Level 3-stars (60 levels × 3 stars = 180 stars)

**Psychology:**
- [Completion drive is powerful motivator](https://www.bigabid.com/mobile-gaming-trends-2026/)
- Visible progress (75/100) encourages pushing to 100%
- Near-completion is strongest (95/100 is compelling)

**UI Display:**
- Collection screen shows all items (locked + unlocked)
- Progress bars (e.g., "Weapons: 28/42")
- Badges/achievements for milestones (50%, 75%, 100%)
- Leaderboards for collectors (optional)

#### Mastery Goals

**3-Star Everything:**
- Each level has 3-star challenge
- Completionists will replay levels
- Creates "easy" vs "hard" mode naturally
- Rewards skill improvement

**Leaderboards (Optional):**
- Global high scores per level
- Friends leaderboard (if social integration)
- Clan/team leaderboards (advanced feature)

**Prestige Systems (Late Game):**
- After completing main content, offer "New Game+"
- Harder difficulties with exclusive rewards
- Keeps top players engaged

### 5.3 Social Features

**Multiplayer:**
- Pass-and-play (local multiplayer, one device)
- Asynchronous PvP (take turn, opponent plays later)
- Real-time PvP (requires server infrastructure)

**Sharing:**
- Share victory screenshots
- Share impressive shots (replay video)
- Challenge friends to beat your score

**Clans/Guilds (Advanced):**
- Team-based events
- Clan chat
- Cooperative challenges
- Social pressure (don't let team down) increases retention

**Recommendation for Scorched Earth:**
- Start with: Pass-and-play local multiplayer (easy to implement)
- Phase 2: Asynchronous PvP (medium complexity)
- Optional: Real-time PvP if player base grows

### 5.4 Live Operations (LiveOps)

**What It Is:**
- Regular content updates
- Limited-time events
- Seasonal themes
- Balance updates

**Why It Matters:**
- [Interactive events spike retention by 25%](https://www.nudgenow.com/blogs/mobile-game-retention-benchmarks-industry)
- Keeps game feeling fresh
- FOMO drives engagement ("must play this week!")
- Shows game is actively supported

**Event Types:**

| Event Type | Example | Duration | Frequency |
|------------|---------|----------|-----------|
| **Daily Event** | "Explosive Monday" (2× damage with bombs) | 24 hours | Weekly rotation |
| **Weekly Challenge** | "Accuracy Challenge" (leaderboard) | 7 days | Ongoing |
| **Limited-Time Mode** | "Infinite Ammo Mode" | 3-7 days | Monthly |
| **Seasonal Event** | "Synthwave Summer" (beach theme) | 2-4 weeks | Quarterly |
| **Holiday Event** | "Neon New Year" (special rewards) | 1-2 weeks | Annual |

**Event Rewards:**
- Exclusive cosmetics (available only during event)
- Bonus currency
- Unique weapons (temporary or permanent)
- Leaderboard prizes

**Implementation:**
- Server-controlled event flags
- Local push notifications ("Event ending soon!")
- In-game banner advertising event
- Special event UI theme

**[AI-Driven LiveOps](https://www.bigabid.com/mobile-gaming-trends-2026/) (2026 Trend):**
- Analyze player behavior
- Personalize event difficulty
- Custom challenges based on play style
- Reported 40% boost in retention for early adopters

---

## 6. Case Studies

### 6.1 Angry Birds (2009) - The Gold Standard

**What Makes It Work:**

**Mechanics:**
- Slingshot control: Intuitive, single-gesture
- Trajectory preview: Added in final polish, became essential
- Varied bird abilities: Red (basic), Chuck (speed), Bomb (explosion), etc.
- Physics-driven destruction: Satisfying, emergent gameplay
- Clear goal: Eliminate all pigs

**Progression:**
- Level-based progression
- 3-star rating system
- Unlocking worlds requires stars (gating)
- Difficulty curve: Very gentle start, challenging late-game

**Monetization:**
- Initially premium ($0.99), then F2P in Angry Birds 2
- Premium model worked due to unique gameplay in 2009 market

**Polish:**
- [Trajectory lines, pinch-to-zoom, pig grunts](https://en.wikipedia.org/wiki/Angry_Birds_(video_game)) added by publisher
- Cartoonish sound effects
- Satisfying destruction physics
- Smooth animations

**Impact:**
- 5+ billion downloads across franchise
- Proved mobile gaming could be mainstream
- Established slingshot control as genre standard
- Inspired endless clones

**Key Takeaway:** Polish and feel matter more than complex mechanics. The slingshot control is perfect because it's simple and satisfying.

### 6.2 Angry Birds 2 (2015) - F2P Evolution

**Changes from Original:**

**Monetization:**
- Free-to-play with lives system
- Gems (hard currency) + multiple soft currencies
- [Ads (interstitial, rewarded video)](https://liteapks.com/angry-birds-2-2.html)
- Optional purchases to continue after losing

**Progression:**
- Card-based bird upgrades (gacha-lite)
- Daily challenges
- Clans/teams
- Arena PvP mode
- [Regular events and seasons](https://earlygame.com/codes/angry-birds-2-promo-codes)

**Gameplay:**
- Choose your bird order (strategy layer)
- Multi-stage levels
- Boss fights
- Destructo-meter (fills up, special ability)

**Reception:**
- Financially successful
- More complex than original (good and bad)
- Some players dislike F2P mechanics
- Strong ongoing engagement from core audience

**Key Takeaway:** F2P requires careful balance. More monetization = more complexity. Don't lose the core fun in pursuit of revenue.

### 6.3 Pocket Tanks (2001) - Turn-Based Classic

**Design:**

**Mechanics:**
- Classic artillery: Angle and power sliders
- Turn-based competitive (vs AI or local human)
- Destructible terrain
- [400+ weapons](https://en.wikipedia.org/wiki/Artillery_game) across various packs

**Weapon Variety:**
- Explosive weapons (napalm, dirt mover)
- Homing weapons (guided missiles)
- Environmental weapons (earthquakes, tornados)
- Creative weapons (teleporter, shield)

**Monetization:**
- Premium base game (~$5)
- Weapon pack DLC ($1-3 each)
- Sustainable model for indie dev

**Progression:**
- No levels, just matches
- Progression = buying new weapon packs
- Customizable match rules

**Why It Endures:**
- Simple, focused design
- Massive weapon variety keeps it fresh
- Hotseat multiplayer (pass the device)
- Fair monetization

**Key Takeaway:** Weapon variety can be the sole progression hook if weapons are creative and game-changing. Players will pay for content that expands playstyle options.

### 6.4 ShellShock Live (2015) - Modern Artillery Excellence

**Design:**

**Mechanics:**
- Similar to Pocket Tanks but with modern polish
- Real-time multiplayer (up to 6 players)
- Ranked competitive mode
- Destructible terrain with advanced physics

**Weapons:**
- [400+ weapons](https://store.steampowered.com/app/326460/ShellShock_Live/), all upgradeable
- Unlock via leveling, challenges, or shop
- Upgrades increase power/effect
- Balanced for competitive play

**Progression:**
- Level-based unlocks (weapon selection expands)
- Daily challenges
- Achievements
- Ranked ladder

**Monetization:**
- Premium purchase ($15) for full game
- No IAPs, no ads
- All content unlockable through play

**Community:**
- Active multiplayer community
- Regular balance updates
- Player-created content (maps)
- Tournaments

**Key Takeaway:** Modern artillery games can thrive on PC/console with premium model if they offer strong multiplayer and regular updates. Mobile needs F2P due to market expectations.

### 6.5 Worms Series (1995-Present) - Team Artillery

**Design:**

**Mechanics:**
- Turn-based, team-based (4 worms per team)
- Move worms across terrain (not stationary)
- [Huge weapon variety](https://worms.fandom.com/wiki/Category:Weapons) (bazookas, grenades, sheep, concrete donkey)
- Destructible terrain with water hazards
- Physics-based comedy (worms flying off cliffs)

**Unique Elements:**
- Personality: Worms have customizable voices, names, tombstones
- Team warfare: Losing 1 worm ≠ game over
- Environmental hazards: Mines, barrels, water
- [Crafting system](https://steamcommunity.com/sharedfiles/filedetails/?id=3129235306) in recent entries (Worms W.M.D.)

**Progression:**
- Campaign missions with objectives
- Multiplayer (local and online)
- Customization (team appearance, weapons loadout)
- Unlockable weapons, hats, voices

**Monetization:**
- Premium model (varies by platform)
- DLC weapon/cosmetic packs
- Mobile version is F2P with IAPs

**Why It's Beloved:**
- Personality and humor (cartoon violence)
- Incredibly deep strategy despite simple rules
- Accessible but high skill ceiling
- Social experience (great with friends)

**Key Takeaway:** Artillery games don't have to be sterile. Personality, humor, and character go a long way. Team-based play adds strategic depth and social appeal.

### 6.6 Bad Piggies (2012) - Artillery Adjacent

**Design:**

**Mechanics:**
- [Vehicle construction puzzle](https://angrybirds.fandom.com/wiki/Bad_Piggies_(game))
- Grid-based building (select parts, place, test)
- [42 parts available](https://angrybirds.fandom.com/wiki/Bad_Piggies_(game)): wheels, motors, balloons, TNT, etc.
- Goal: Build vehicle that gets pig to finish line

**Not Quite Artillery, But Relevant:**
- Physics-based
- Trial-and-error gameplay
- Explosion mechanics (TNT detonation)
- Trajectory planning (launching vehicle)

**Progression:**
- Level-based
- 3-star goals (reach finish, collect items, don't break parts)
- Unlocking new parts
- Sandbox mode (free building)

**Why It's Interesting:**
- Spin on artillery formula (build launcher vs aim)
- Strong creative expression
- "Make your own solution" design
- Appeals to engineering mindset

**Key Takeaway:** There's room for innovation in artillery genre. Core elements (physics, trajectory, destruction) can be remixed in novel ways.

---

## 7. Recommendations for Scorched Earth: Synthwave Edition

Based on all research, here are specific recommendations for Scorched Earth's Unity implementation:

### 7.1 Core Mechanics

**Aiming System: Hybrid Approach**

Implement **both** control schemes, let player choose:

1. **Primary (Slingshot Mode - Mobile Default):**
   - Drag projectile back, release to fire
   - Trajectory preview (dotted line)
   - Mobile-optimized, feels modern

2. **Classic (Slider Mode - Desktop/Optional):**
   - Angle slider (0-180°)
   - Power slider (0-100%)
   - Appeals to Scorched Earth veterans
   - Can be more precise

**Rationale:** Respect the original while embracing modern UX. Let players choose their preference.

**Trajectory Preview:**
- Default: Full preview (accessibility)
- Settings: Toggle preview intensity (full, partial, off)
- Hard difficulty: Auto-disable preview

**Physics Feel:**
- Gravity: ~40% of real-world (Angry Birds range)
- Generous hit detection (projectile vs tank)
- Exaggerated arcs feel more satisfying
- Wind: Moderate effect, clear visual indicators

**Juice Implementation (High Priority!):**
- Screen shake: Proportional to explosion size, capped to avoid motion sickness
- Particle effects: Neon synthwave colors, heavy use for explosions
- Time dilation: 30% slowdown for 0.3 seconds on big hits
- Camera: Follow projectile smoothly, zoom in on impact
- Sound: Layered explosions (initial boom + bass rumble + debris)

### 7.2 Progression & Content

**Weapon Unlocks:**

Target: **30-40 weapons at launch** (can expand post-launch)

Unlock structure:
- **Basic tier (10 weapons):** Unlocked via progression, levels 1-20
  - Basic Shot, MIRV, Roller, Digger, etc.
- **Advanced tier (15 weapons):** Purchase with coins (2000-5000 each)
  - Nuke, Mini Nuke, Laser, EMP, etc.
- **Special tier (10 weapons):** Achievement unlocks
  - "Get 10 triple-kills → Unlock Cluster Chain"
- **Legendary tier (5 weapons):** Rare drops or premium currency
  - Ultimate weapons with unique effects

**Level Structure:**
- **60 levels at launch** (expandable)
- 6 worlds × 10 levels each
- Worlds themed around synthwave aesthetics:
  - World 1: "Neon Beach" (tutorial, easy)
  - World 2: "Cyber City" (urban terrain)
  - World 3: "Digital Desert" (wind mechanics)
  - World 4: "Retro Ruins" (complex structures)
  - World 5: "Grid Mountains" (elevation challenges)
  - World 6: "Synthwave Showdown" (finale, hardest)

**Star System:**
- 1 star: Win the match
- 2 stars: Win + deal X damage (efficiency)
- 3 stars: Win + perfect accuracy (≥70% shots hit)

**Progression Gating:**
- World 2: Requires 10 stars from World 1
- World 3: Requires 25 stars from Worlds 1-2
- World 4: Requires 45 stars
- World 5: Requires 70 stars
- World 6: Requires 100 stars

### 7.3 Monetization Strategy

**Business Model: Freemium (F2P + Premium Upgrade)**

**Free Experience:**
- Full game access (all 60 levels)
- All weapons unlockable through play
- Rewarded video ads (player choice)
- Occasional interstitial ads (after matches only)

**Premium Upgrade ($6.99 USD):**
- Remove all ads permanently
- 2× currency earn rate
- Exclusive "Retro Classic" synthwave skin pack (5 tank skins)
- Daily premium bonus (500 coins/day)
- Early access to new weapons (3-day head start when added)

**Currency System: Dual Currency**

- **Coins (Soft):** Earned through play
  - Win match: 100-300 coins (based on performance)
  - 3-star level: +100 bonus
  - Daily login: 100-500 coins (escalating)
  - Daily challenges: 50-100 coins each
  - Rewarded ad: 200 coins

- **Gems (Hard):** Purchased with real money
  - Starting gift: 100 gems (after tutorial)
  - Very rarely earned (big achievements only)
  - Can buy anything coins can, plus exclusive items

**IAP Pricing:**

| Product | Price | Contents |
|---------|-------|----------|
| Premium Upgrade | $6.99 | Remove ads, 2× coins, exclusive skins, daily bonus |
| Starter Pack | $1.99 | 500 gems + 5000 coins + 3 weapon unlocks |
| Gem Pack Small | $2.99 | 1500 gems (+10%) |
| Gem Pack Medium | $4.99 | 3000 gems (+20%) |
| Gem Pack Large | $9.99 | 7000 gems (+40%) - "Best Value" |
| Weapon Bundle | $3.99 | 5 premium weapons unlocked |

**Ad Strategy:**
- **Rewarded video (primary):**
  - In shop: "Watch ad for 200 coins"
  - After loss: "Watch ad to continue with +50% health"
  - Before level: "Watch ad for random power-up"
  - Daily: "Watch ad to double your daily reward"
  - Limit: No more than 5 per hour (avoid spam)

- **Interstitial (secondary):**
  - After every 3-5 matches (non-paying users only)
  - Frequency cap: Max 1 per 5 minutes
  - Never during gameplay or menu navigation

- **No banner ads** (they're tacky and low revenue)

### 7.4 UI/UX Implementation

**Screen Layout (Mobile Landscape):**

```
┌────────────────────────────────────────────────┐
│ [☰] Coins: 2,450  [💎]        Wind: ←12 mph   │
│                                                 │
│                 [GAME VIEW]                     │
│         (unobstructed 70% of screen)            │
│                                                 │
│  Health: [████████░░] 80%                       │
│                                                 │
│  [FIRE]    [⚡ Select Weapon]      [⚙️ Menu]   │
└────────────────────────────────────────────────┘
```

**Key Screens:**

1. **Main Menu:**
   - Big "PLAY" button (center)
   - Weapon Shop (bottom left)
   - Settings (top right)
   - Daily Challenge indicator (top left)
   - Synthwave background (animated grid, sunset)

2. **Level Select:**
   - World map (6 worlds)
   - Each level shows: number, star count (X/3), high score
   - Lock indicator for locked levels
   - "Next" button prominent

3. **In-Game HUD:**
   - Minimal during aiming (don't obstruct view)
   - Expand to show stats after shot fired
   - Clear turn indicator ("Your turn" vs "Enemy turn")

4. **Weapon Select:**
   - Carousel or grid view
   - Shows: icon, name, ammo count (if limited)
   - Tap to select, visual confirmation
   - Can browse even during enemy turn (plan next move)

5. **End-of-Match:**
   - Big victory/defeat message
   - Star rating (animated reveal)
   - Score breakdown
   - Currency earned
   - Buttons: Continue, Retry (if lost), Share

**Synthwave Visual Style:**

- **Color Palette:**
  - Primary: Hot pink (#FF1493), Cyan (#00FFFF), Purple (#9400D3)
  - Accents: Orange (#FF6600), Yellow (#FFFF00)
  - Backgrounds: Deep purple gradients, starry sky

- **Effects:**
  - Bloom/glow on all neon elements
  - Scanlines overlay (subtle, togglable)
  - Grid lines on terrain and background
  - Glow trails on projectiles (neon pink/cyan)
  - CRT distortion (optional, settings toggle)

- **Typography:**
  - Bold, geometric sans-serif (e.g., Orbitron, Audiowide)
  - Neon glow effect on important text
  - Numbers: Digital/LCD style

### 7.5 Retention Features

**Daily Engagement:**

1. **Daily Login Rewards:**
   - 7-day cycle
   - Day 1: 100 coins
   - Day 2: 150 coins
   - Day 3: 200 coins
   - Day 4: 1× Nuke (consumable)
   - Day 5: 300 coins
   - Day 6: Exclusive tank skin (rotate monthly)
   - Day 7: 500 coins + 50 gems

2. **Daily Challenges (3 per day):**
   - "Win 3 matches"
   - "Deal 5000 damage with explosive weapons"
   - "Get 3 stars on any level"
   - Rewards: 100 coins each + 300 coin bonus for completing all 3

3. **Weekly Event:**
   - "Weapon of the Week" (featured weapon gets 2× damage)
   - "Explosive Week" (all explosions 50% larger)
   - "Wind Storm" (double wind speed, extra challenge)
   - Leaderboard for event (cosmetic rewards for top 100)

**Long-Term Goals:**

1. **Collections:**
   - Weapons: X/40 collected
   - Tank skins: X/25 collected
   - Projectile trails: X/15 collected
   - 3-stars: X/180 stars

2. **Achievements:**
   - "Sharpshooter" - Hit enemy 50 times
   - "Demolitionist" - Destroy 1000 terrain pieces
   - "Perfectionist" - 3-star all World 1 levels
   - "Weapon Master" - Use each weapon at least once
   - Each achievement: 500 coins + badge

3. **Prestige (Post-Launch Feature):**
   - After 3-starring all levels, unlock "New Game+"
   - Enemies have more health, better AI
   - Exclusive "Chrome" skin set
   - Keeps endgame players engaged

### 7.6 Multiplayer (Phased Rollout)

**Phase 1 (Launch):**
- **Pass-and-Play Local Multiplayer**
  - Two players, one device
  - Take turns
  - Easy to implement
  - Great for demos/parties

**Phase 2 (Post-Launch, Month 3):**
- **Asynchronous PvP**
  - Challenge friend (or random player)
  - Take your shot, game sends to opponent
  - They take their shot when they play next
  - No real-time server needed
  - Lower complexity than real-time

**Phase 3 (Optional, If Successful):**
- **Real-time PvP**
  - Live matches against other players
  - Requires server infrastructure
  - Ranked ladder
  - Highest retention, highest complexity

### 7.7 Post-Launch Content Cadence

**Monthly Updates (First 6 Months):**

| Month | Content | Purpose |
|-------|---------|---------|
| 1 (Launch) | 60 levels, 40 weapons | Core game |
| 2 | 10 new levels (World 7), 5 new weapons | Keep fresh |
| 3 | Asynchronous PvP, 3 new weapons | Multiplayer debut |
| 4 | 10 new levels (World 8), 5 new weapons, Daily Events | Content + engagement |
| 5 | Clan system, 3 new weapons | Social features |
| 6 | Battle Pass (Season 1), 10 new levels | Monetization boost |

**Reasoning:**
- [Regular updates spike retention by 25%](https://www.nudgenow.com/blogs/mobile-game-retention-benchmarks-industry)
- Keeps game feeling alive
- Press coverage for each update
- Prevents player churn

### 7.8 Platform-Specific Considerations

**iOS (Primary Target):**
- UIKit integration for native feel
- Haptic feedback on shots/impacts (Taptic Engine)
- Game Center integration (achievements, leaderboards)
- iCloud save sync
- Portrait and landscape support
- Optimized for iPhone 12+ and iPad
- Metal graphics API
- TestFlight beta program

**macOS (Secondary Target):**
- Mouse + keyboard controls (slider mode preferred)
- Trackpad gestures (swipe, pinch)
- Menu bar integration
- Windowed and fullscreen modes
- Controller support (Xbox, PlayStation, MFi)
- Mac App Store distribution

### 7.9 Development Priorities

**Phase 1: Core Gameplay (Weeks 1-4)**
1. Terrain system with destruction
2. Tank controller
3. Projectile physics
4. Weapon system (5 basic weapons)
5. Turn-based logic
6. Basic AI (stationary, random aim)

**Phase 2: Polish & Feel (Weeks 5-6)**
1. Trajectory preview
2. Screen shake, particles, juice
3. Sound effects and music
4. Camera work (follow, zoom)
5. Synthwave visual effects

**Phase 3: Progression (Weeks 7-8)**
1. Level system (10 levels for testing)
2. 3-star rating
3. Weapon unlocks
4. Currency system
5. Basic UI (main menu, level select, in-game HUD)

**Phase 4: Content (Weeks 9-10)**
1. 60 levels across 6 worlds
2. 40 weapons implemented
3. AI difficulty curve
4. Daily challenges

**Phase 5: Monetization (Weeks 11-12)**
1. Ad integration (rewarded + interstitial)
2. IAP setup (premium upgrade, gem packs)
3. Shop UI
4. Currency balance tuning

**Phase 6: Beta & Launch (Weeks 13-16)**
1. TestFlight beta
2. Feedback iteration
3. Performance optimization
4. App Store submission
5. Marketing materials
6. Launch!

---

## 8. Sources & References

### Research Sources

**Angry Birds & Mobile Gaming:**
- [Angry Birds (video game) - Wikipedia](https://en.wikipedia.org/wiki/Angry_Birds_(video_game))
- [Angry Birds Projectile Motion - StickMan Physics](https://stickmanphysics.com/stickman-physics-home/two-dimensional-motion/angry-birds-projectile-motion/)
- [The physics of Angry Birds - TechRadar](https://www.techradar.com/news/software/applications/the-physics-of-angry-birds-how-it-works-1067809)
- [Angry Birds 2 Promo Codes (January 2026) - EarlyGame](https://earlygame.com/codes/angry-birds-2-promo-codes)
- [Angry Birds 2 Mod (Unlimited Resources)](https://liteapks.com/angry-birds-2-2.html)

**Artillery Games:**
- [Artillery game - Wikipedia](https://en.wikipedia.org/wiki/Artillery_game)
- [ShellShock Live on Steam](https://store.steampowered.com/app/326460/ShellShock_Live/)
- [ShellShock Live - Wikipedia](https://en.wikipedia.org/wiki/ShellShock_Live)
- [Pocket Tanks discussion thread](https://steamcommunity.com/app/326460/discussions/0/3372657079036710625/)
- [List of artillery video games - Wikipedia](https://en.wikipedia.org/wiki/List_of_artillery_video_games)

**Worms Series:**
- [Worms (series) - Wikipedia](https://en.wikipedia.org/wiki/Worms_(series))
- [Worms W.M.D - Wikipedia](https://en.wikipedia.org/wiki/Worms_W.M.D)
- [Worms W.M.D on Steam](https://store.steampowered.com/app/327030/Worms_WMD/)
- [Worms Wiki - Category:Weapons](https://worms.fandom.com/wiki/Category:Weapons)

**Bad Piggies:**
- [Bad Piggies - Wikipedia](https://en.wikipedia.org/wiki/Bad_Piggies)
- [Bad Piggies (game) - Angry Birds Wiki](https://angrybirds.fandom.com/wiki/Bad_Piggies_(game))
- [Bad Piggies on App Store](https://apps.apple.com/us/app/bad-piggies/id533451786)

**Game Feel & Juice:**
- [Game Feel - GameDev Academy](https://gamedevacademy.org/game-feel-tutorial/)
- [Juice in Game Design - Blood Moon Interactive](https://www.bloodmooninteractive.com/articles/juice.html)
- [Game Design Series II: Game Juice - Medium](https://sefaertunc.medium.com/game-design-series-ii-game-juice-92f6702d4991)
- [Squeezing more juice out of game design - GameAnalytics](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)
- [The "Juice" Problem - Wayline](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design)
- [Game feel - Wikipedia](https://en.wikipedia.org/wiki/Game_feel)

**Mobile Game UX & Controls:**
- [One-Touch Artillery - Wayline](https://www.wayline.io/blog/one-touch-artillery-the-secret-to-mobile-game-replayability)
- [How to Make Mobile Shooting Controls Fun - Adroit Tech Studios](https://adroittechstudios.com/how-to-make-mobile-shooting-controls-fun/)
- [Unity touch controls discussion](https://discussions.unity.com/t/how-do-i-implement-touch-controls-for-a-2d-slingshot-game/860520)

**Mobile Game Monetization (2026):**
- [Mobile App Monetization Strategies 2026 - adjoe](https://adjoe.io/blog/app-monetization-strategies/)
- [Mobile Game Monetization Models 2026 - StudioKrew](https://studiokrew.com/blog/mobile-game-monetization-models-2026/)
- [Mobile Game Monetization Strategies - Adapty](https://adapty.io/blog/mobile-game-monetization/)
- [Mobile Game Monetization - Yango Ads](https://yango-ads.com/blog/mobile-game-monetization-strategies-that-drive-revenue)
- [Mobile App Monetization 2026 - DesignRush](https://www.designrush.com/agency/mobile-app-design-development/trends/mobile-app-monetization)
- [App Monetization 2026 - Mobidictum](https://mobidictum.com/app-monetization-in-2026/)

**Retention & Engagement (2026):**
- [Mobile Gaming Trends 2026 - Bigabid](https://www.bigabid.com/mobile-gaming-trends-2026/)
- [Gaming App Retention - ContextSDK](https://contextsdk.com/blogposts/gaming-app-retention-days-understanding-and-improving-user-retention-for-mobile-games)
- [Mobile Game Retention Strategies - Segwise](https://segwise.ai/blog/boost-mobile-game-retention-strategies)
- [Understanding Retention Mechanics - MoldStud](https://moldstud.com/articles/p-mobile-game-development-understanding-the-power-of-retention-mechanics)
- [Mobile Game Retention Benchmarks - NudgeNow](https://www.nudgenow.com/blogs/mobile-game-retention-benchmarks-industry)
- [Balance Retention and Monetization - MAF](https://maf.ad/en/blog/mobile-game-retention-benchmarks/)
- [Gaming Trends 2026 - Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/gaming-trends)

**Progression Systems:**
- [Mobile Legends Rank System 2025 - BitTopup](https://bittopup.com/article/Mobile-Legends-Rank-System-2025-Complete-Guide-to-Stars)
- [Brawl Stars Leveling Guide 2026 - SkyCoach](https://skycoach.gg/blog/brawl-stars/articles/brawlers-leveling-guide)
- [Mobile Legends Ranking Guide - LootBar](https://lootbar.gg/blog/en/mobile-legends-rank-system-guide-climb-faster-and-dominate.html)

**Technical Resources:**
- [Projectile Trajectory - GitHub llamacademy](https://github.com/llamacademy/projectile-trajectory)
- [Unity projectile trajectory discussions](https://discussions.unity.com/t/aim-preview-for-projectile-trajectory/26841)

---

## Conclusion

The artillery/slingshot game genre is well-established with proven patterns for success. The key lessons for Scorched Earth: Synthwave Edition:

1. **Respect the classics** (Scorched Earth's turn-based depth) **while embracing modern UX** (slingshot controls, trajectory preview)

2. **Weapon variety is king**: ShellShock Live and Pocket Tanks prove that 400+ weapons create endless replayability

3. **Polish matters more than features**: Angry Birds succeeded on simple mechanics executed perfectly with juice and feel

4. **F2P done ethically works**: Hybrid monetization (free + premium upgrade + rewarded ads) balances revenue with player satisfaction

5. **Retention mechanics are non-negotiable in 2026**: Daily rewards, challenges, events, and live ops are expected

6. **Synthwave aesthetic is our differentiator**: Use neon colors, glow effects, and retro-futuristic design to stand out in a crowded genre

The path forward is clear: Build the solid artillery core that made Scorched Earth legendary, wrap it in modern mobile UX patterns proven by Angry Birds and its successors, add the massive weapon variety that makes ShellShock Live and Pocket Tanks endlessly replayable, and tie it all together with a distinctive synthwave aesthetic that no other artillery game has attempted.

With this research as foundation, the Unity migration spec can be detailed and confident.
