# Campaign Puzzle Balance Notes

Updated 2026-06-10.

## Puzzle Progression

The campaign now uses handcrafted puzzle-object routes across all six worlds.
Each world has at least three authored puzzle levels, and later worlds combine
multiple mechanics instead of relying only on higher health or wind.

| World | Theme | Puzzle route |
| --- | --- | --- |
| 1 | Neon Dunes | Ricochet intro, then bank plus light bunker cover. |
| 2 | Chrome Canyons | Multi-bank city routes with bunker bypasses. |
| 3 | Prism Bunkers | Shield and bunker reads, then shielded bank mixes. |
| 4 | Vector Vortex | Teleport gates, shielded exits, and bank chains. |
| 5 | Pixel Wastes | Hazard chains (fuel cells, collapse nodes), precision bunker slits, shield-buster checks, and glitch gate mixes. |
| 6 | Midnight Citadel | Expert combined gates, banks, shields, bunkers, and late weapons. |

## Hazards (World 5 signature mechanic)

World 5 now delivers its promised "hazards and unstable terrain" identity with
two hazard puzzle objects:

- **Neon fuel cell** (`fuel-cell`): detonates on projectile contact or when a
  weapon blast reaches it. Carves terrain, deals heavy splash damage
  (default 35 at center), and chain-triggers other hazards inside its blast
  radius with a 130-150ms stagger so cascades read clearly.
- **Collapse node** (`collapse-node`): detonating it carves the terrain support
  under itself so the ground above settles (falling-terrain physics), with
  light splash damage (default 14). Used to drop ridges that shelter enemies.

Authored placements:

| Level | Role | Setup |
| --- | --- | --- |
| `world5-level2` Glitch Garden | Hazard intro | Two chained fuel cells beside the enemy; the near cell splashes the enemy. |
| `world5-level4` Null Island | Collapse intro | Support node on the ridge chains into an island fuel cell next to the enemy. |
| `world5-level6` Void Valley | Remix | Fuel cell -> collapse node -> fuel cell cascade across the valley. |
| `world5-level8` Overflow Oasis | Remix+ | Three-link chain (cell, node, cell) winding up the enemy hill. |

Chain-link distances and enemy splash coverage were authored against the
interpolated slot terrain and verified live in the browser (direct projectile
contact, blast-triggered chains, terrain drop of ~70px at the Null Island
ridge, and hazard damage rewards). Player-triggered hazard damage awards hit
rewards and counts toward level-mode star damage; environmental damage to the
player only records damage-taken stats.

## Route Evidence

`tests/e2e/level-mode-journey.spec.js` now includes browser route coverage for
the primary puzzle mechanics:

| Mechanic | Representative level | Evidence |
| --- | --- | --- |
| Ricochet | `world1-level7` | A damaging route must interact with a ricochet panel. |
| Shield | `world5-level3` | A route must bust a shield and a separate route must damage the enemy. |
| Teleport | `world4-level1` | A damaging route must pass through a teleport gate. |
| Bunker | `world5-level1` | A route must hit bunker cover, and a separate route must damage the enemy. |
| Fuel cell | `world5-level2` | A probe route must detonate a fuel cell, plus a live-fire test proves cells detonate, chain, and damage the enemy in real gameplay. |
| Collapse node | `world5-level4` | A probe route must detonate the support node, and a separate route must damage the enemy. |

The QA trajectory probe scans active runtime puzzle objects rather than static
layout JSON, so the browser test validates what the player actually sees in the
level.

## Verification

- `npm run test -- tests/unit/puzzle-objects.test.js tests/unit/level-layouts.test.js`
- `npm run test:e2e -- tests/e2e/level-mode-journey.spec.js --project=chromium-desktop --workers=2`

