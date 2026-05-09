# Scorched Earth: Synthwave Edition - Gameplay Polish Direction

Updated on 2026-05-09 after product direction reset.

## Product Target

Scorched Earth: Synthwave Edition should feel like a premium mobile puzzle
artillery game: the aiming satisfaction of classic Scorched Earth, the
readability and level craftsmanship of Angry Birds, and a strong synthwave
identity that makes every screen feel intentional.

The current game has useful systems, but the next polish pass must stop treating
levels as progressively harder duels only. Campaign levels should become
readable combat puzzles: the player studies a neon battlefield, identifies the
mechanic in play, chooses the right shot, and gets a satisfying chain reaction
when the plan works.

## Core Player Loop

1. Pick a campaign level or start a survival run.
2. Read the battlefield: enemy position, terrain silhouette, wind, shields,
   ricochet panels, teleport gates, bunkers, hazards, and pickups.
3. Choose a weapon with a clear role.
4. Aim with touch-friendly controls and trajectory feedback.
5. Fire, then watch the full shot outcome: travel, bounce/teleport/impact,
   terrain collapse, shield break, tank destruction, rewards.
6. See a polished result screen that explains what happened and what improved.
7. Spend rewards on meaningful upgrades, tank cosmetics, and strategic unlocks.

The game should reward planning more than repeated brute-force shots.

## Game Modes

### Campaign: Neon Warpath

Campaign is the primary mode. It has handcrafted puzzle-combat levels across
six worlds. Each world introduces one new mechanic, then combines it with older
mechanics. Stars are earned for efficient, accurate, and stylish clears.

Campaign language should be "Level", "World", "Stars", "Intel", and "Next
Target". It should never feel like the player is dumped back into survival flow
after beating a level.

### Survival: Endless Neon Run

Survival is a separate roguelike arcade mode. It is not level progression.
It should be framed as:

- "Survive as many duels as possible."
- "Win a duel, collect salvage, visit the Armory, choose a risk/reward upgrade."
- "Death ends the run."

Survival needs a satisfying terminal sequence: final explosion, slow-motion
beat, run summary, high-score comparison, and clear "New Run" / "Garage" /
"Main Menu" actions. A black screen or immediate mode jump is unacceptable.

## Campaign World Progression

| World | Theme | New mechanic | Level design promise |
| --- | --- | --- | --- |
| 1. Neon Dunes | Clean synth desert, grid horizon | Terrain reading and basic wind | Teach aim, power, terrain carving, and stars. |
| 2. Chrome Canyons | Reflective city canyons | Ricochet panels | Solve bank-shot puzzles around cover. |
| 3. Prism Bunkers | Laser-lit fortresses | Shields and shield generators | Break or bypass defenses before the kill shot. |
| 4. Vector Vortex | Floating vector ruins | Teleport gates | Route shots through portals to hidden tanks. |
| 5. Pixel Wastes | Glitch fields and broken terrain | Hazards and unstable terrain | Trigger collapses, chain reactions, and hazard kills. |
| 6. Midnight Citadel | Final synth fortress | Combined mechanics | Multi-step puzzle duels with shields, portals, bounces, and advanced weapons. |

Each world should have a strong visual signature, not just different terrain
numbers. Backgrounds, terrain colors, enemy tanks, pickups, and result copy
should reinforce the world identity.

## Puzzle Mechanics

### Shields

Shields protect tanks or bunkers from direct splash damage until depleted.
They should have:

- A visible neon dome or segmented barrier.
- A clear hit reaction: ripple, crack, color shift, audio tick.
- A break moment: burst, particle ring, temporary vulnerability callout.
- Level hooks: shielded tank, shield generator object, timed shield recharge.

Weapon roles:

- Laser/drill weapons pierce weak shields.
- EMP or disruptor disables shields.
- Heavy explosives brute-force shields but waste turns.

### Ricochet Panels

Ricochet panels are fixed neon surfaces that reflect certain projectile types.
They make levels feel like bank-shot puzzles.

Rules:

- Panels are clearly marked with animated arrows or glowing edge lines.
- Only "solid" projectile families bounce. Diggers, rollers, mines, and nukes
  should not produce confusing panel behavior.
- Panel hit effects must show angle and momentum with sparks/trails.

### Teleport Gates

Teleport gates let shots enter one portal and exit another with preserved or
modified velocity. They create routing puzzles for enemies behind bunkers.

Rules:

- Paired gates use matching colors/symbols.
- Entry and exit must be obvious before firing.
- The projectile trail should visibly splice between gates with a glitch pulse.

### Bunkers And Cover

Bunkers are authored defensive structures made from terrain or special armor
objects. They should teach weapon selection:

- Direct shot blocked: use bouncer/teleporter.
- Thick cover: use digger/drill.
- Exposed weak point: use precision or laser.
- Shielded bunker: destroy generator first.

### Hazards

Hazards are world-specific puzzle targets:

- Neon fuel cells: explode when hit.
- Gravity wells: curve shots locally.
- Glitch mines: detonate after being disturbed.
- Collapse nodes: remove terrain supports when destroyed.

Hazards should be used sparingly and introduced one at a time.

## Weapons And Upgrade Roles

The arsenal should be organized by purpose rather than just bigger damage.

| Role | Example weapons | Player promise |
| --- | --- | --- |
| Precision | Basic Shot, Sniper, Laser | Hit exposed weak points and earn accuracy stars. |
| Demolition | Missile, Big Shot, Nuke | Destroy terrain and force openings. |
| Routing | Bouncer, Teleporter, Splitter | Reach enemies behind cover. |
| Burrow | Digger, Drill, Roller | Attack from under bunkers or through walls. |
| Control | EMP, Shield Breaker, Gravity Well | Disable mechanics before the kill shot. |
| Chain | Cluster, MIRV, Firestorm | Trigger hazards and multi-target clears. |

Upgrade design should make choices interesting:

- Campaign unlocks new weapon families through worlds.
- Survival offers temporary run upgrades and permanent garage upgrades.
- Weapon cards should show role, damage, blast, and special behavior at a
  glance.
- The weapon bar must stay compact. More weapons should not mean a long,
  tedious scroller.

## Tanks, Drops, And Rewards

Tank visuals should feel collectible and high quality. A professional pass needs
authored tank families, not placeholder silhouettes:

- Player starter tank: iconic cyan/pink synth rover.
- Enemy factions per world: chrome scouts, prism bunker units, glitch raiders,
  citadel elites.
- Tank silhouettes should remain readable at gameplay size.
- Cosmetic rarity should affect trim, glow, animated accents, and victory poses,
  not gameplay fairness.

Supply drops should become moments of delight:

- Crate lands or opens with a short animation.
- Reward cards flip/reveal with rarity color.
- Duplicate conversion to scrap is clear and satisfying.
- Drops should be accessible from Garage and round-end surfaces.

## Result Screens And Feedback

Every terminal combat result needs a full beat:

- Kill shot lands.
- Explosion/tank destruction plays in-world.
- Camera/overlay gives the result room to breathe.
- Result screen fades in over the battlefield, not to a blank void.
- Rewards count up.
- Next action is mode-correct.

Campaign win:

- Level Complete with stars, reason for each star, coins, next level, retry.

Campaign loss:

- Level Failed with retry, weapon tip, and return to level select.

Survival win:

- Round Complete with damage, coins, tokens, streak, next-round threat, Armory.

Survival loss:

- Run Over with rounds survived, enemies destroyed, best run comparison, New
  Run, Garage, Main Menu.

## Visual And Audio Polish Bar

The game should look professional at a glance:

- No placeholder-looking tanks, drops, weapon icons, or world art.
- No black-screen transitions unless used intentionally as a cinematic cut.
- Every button has pressed/hover/touch feedback.
- Every reward has count-up motion and sound.
- Projectile travel has trails that clarify behavior.
- Shields, bounces, teleports, and hazards have distinct colors and sounds.
- Level select should preview world mechanics and star progress.
- Garage should feel like a place to inspect and upgrade, not a debug list.

## First Vertical Slice

The next shippable slice should prove the new direction by fixing a player-visible
moment and adding a mechanic foundation:

1. Make survival win/loss and campaign win/loss mode-correct, with satisfying
   in-world destruction before overlays appear.
2. Add a puzzle-object data model for shields, ricochet panels, teleport gates,
   bunkers, and hazards.
3. Author one World 2 ricochet level and one World 3 shield level using that
   model.
4. Generate and integrate a small set of high-quality tank/drop art with
   `imagegen`, replacing the most obvious placeholder-looking assets.
5. Verify through browser play, visual audit, and performance smoke.

This slice should be judged by player feel: the game must communicate "I solved
a stylish artillery puzzle" instead of "I won a stat-scaled duel."
