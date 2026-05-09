# Campaign Puzzle Balance Notes

Updated 2026-05-09.

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
| 5 | Pixel Wastes | Precision bunker slits, shield-buster checks, and glitch gate mixes. |
| 6 | Midnight Citadel | Expert combined gates, banks, shields, bunkers, and late weapons. |

## Route Evidence

`tests/e2e/level-mode-journey.spec.js` now includes browser route coverage for
the primary puzzle mechanics:

| Mechanic | Representative level | Evidence |
| --- | --- | --- |
| Ricochet | `world1-level7` | A damaging route must interact with a ricochet panel. |
| Shield | `world5-level3` | A route must bust a shield and a separate route must damage the enemy. |
| Teleport | `world4-level1` | A damaging route must pass through a teleport gate. |
| Bunker | `world5-level1` | A route must hit bunker cover, and a separate route must damage the enemy. |

The QA trajectory probe scans active runtime puzzle objects rather than static
layout JSON, so the browser test validates what the player actually sees in the
level.

## Verification

- `npm run test -- tests/unit/puzzle-objects.test.js tests/unit/level-layouts.test.js`
- `npm run test:e2e -- tests/e2e/level-mode-journey.spec.js --project=chromium-desktop`

