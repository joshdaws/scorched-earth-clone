# Endless Neon Run Balance Notes

Updated 2026-05-09.

## Current Tuning Slice

This pass fixes the survival AI progression wiring and smooths the first run-perk
set. The goal is not final balance; it is to make the curve coherent enough for
hands-on playtesting.

## Round Curve

| Round | Enemy HP | AI | Money | Victory | AI weapon pool |
| --- | ---: | --- | ---: | ---: | --- |
| 1 | 100 | Easy | 1.0x | $500 | Basic |
| 2 | 100 | Easy | 1.0x | $500 | Basic |
| 3 | 100 | Medium | 1.1x | $600 | Basic, Missile |
| 4 | 120 | Medium | 1.1x | $600 | Basic, Missile |
| 5 | 120 | Medium | 1.2x | $700 | Basic, Missile, Roller, Big Shot |
| 6 | 120 | Hard | 1.2x | $700 | Basic, Missile, Roller, Big Shot |
| 7 | 140 | Hard | 1.3x | $850 | Adds Digger, Heavy Roller |
| 8 | 140 | Hard | 1.3x | $850 | Adds Digger, Heavy Roller |
| 9 | 140 | Hard | 1.4x | $1,000 | Adds Heavy Digger, MIRV, Mini Nuke |
| 10 | 160 | Hard+ | 1.4x | $1,000 | Heavy Digger, MIRV, Mini Nuke cap |
| 11 | 160 | Hard+ | 1.5x | $1,200 | Adds Nuke |
| 12 | 160 | Hard+ | 1.5x | $1,200 | Nuke enabled |

## Perk Values

| Perk | Value | Role |
| --- | --- | --- |
| Field Repair | +20 hull next round | Reliable survivability without outclassing shield. |
| Hardlight Shield | +40 shield | Best against burst/first-hit threats. |
| Ammo Cache | +3 missiles, +2 bouncers | Route/damage option for players who want tempo over defense. |

## Notes

- Before this slice, actual gameplay set AI difficulty by round but did not set
  the round weapon pool, so purchased AI weapons could be filtered out by the
  default basic-only pool.
- Nukes now enter at round 11 instead of round 9/10. Round 9 introduces mini
  nukes and MIRV first so late-game danger ramps instead of spiking abruptly.
- Purchases are now filtered by the active round pool, so AI budget cannot be
  wasted on locked weapons.
- `?scene=round-start&wind=0` now preserves fixed zero wind for deterministic
  survival playtests instead of treating `0` as a missing URL value.

## Browser Playtest Ledger

Generated with Chromium against `round-start` scenes on 2026-05-09. Evidence was
captured locally in `artifacts/survival-balance/2026-05-09-rounds/`.

| Round | Seed | Enemy HP | Enemy purchased loadout | Read |
| --- | ---: | ---: | --- | --- |
| 1 | 73001 | 100 | Basic only | Clean opener. No paid ammo pressure. |
| 2 | 73002 | 100 | Basic only | Still readable before economy opens. |
| 3 | 73003 | 100 | 5 missiles | First pressure spike is clear but not nuclear. |
| 4 | 73004 | 120 | 5 missiles | Health bump plus missiles feels like the first real duel. |
| 5 | 73005 | 120 | 5 missiles, 3 rollers | Terrain-route tools enter before heavy burst. |
| 6 | 73006 | 120 | 3 big shots, 5 missiles, 3 rollers | Hard AI starts using burst without adding HP yet. |
| 7 | 73007 | 140 | 2 heavy rollers, 3 big shots, 5 missiles | Mid-run danger moves to route denial and heavier hits. |
| 8 | 73008 | 140 | 2 heavy rollers, 3 big shots, 5 missiles | Stable second round at this tier. |
| 9 | 73009 | 140 | 2 mini-nukes, 3 big shots | Late-game warning shot; no full nuke yet. |
| 10 | 73010 | 160 | 2 mini-nukes, 2 MIRV, 3 big shots | Hard+ cap looks dangerous without immediate full-nuke access. |
| 11 | 73011 | 160 | 1 nuke | Full nuke arrives as explicit late-run escalation. |
| 12 | 73012 | 160 | 1 nuke | Same late tier; needs hands-on survivability tuning. |

## Regression Evidence

- `npm run test:e2e -- tests/e2e/survival-flow.spec.js --project=chromium-desktop`
  now covers fixed wind, enemy loadout progression, forced survival win, and
  forced run-over delayed overlays after tuning.
- `window.render_game_to_text()` now includes the survival round and richer tank
  state so balance captures can inspect max health, shields, selected weapons,
  and inventories without relying on console-only state.

## Remaining Playtest

- Play rounds 1-10 by hand with the current perk values.
- Verify round 10 Hard+ is dangerous but not a sudden one-shot wall.
- Verify round 11+ nuke access feels like a late-run escalation.
- Tune rewards/shop pressure after observing whether players can consistently
  buy at least one meaningful weapon pack every two wins.
