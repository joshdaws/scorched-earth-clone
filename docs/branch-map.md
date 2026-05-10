# Feature Branch Map

Generated on 2026-05-10 from local and `origin/*` refs after the refreshed
world and puzzle-object art commit. Branch dispositions are audited as of
`010f5a6`; the documentation commit containing this refresh may sit above that
handoff payload without changing branch topology.

## Audit Commands

```bash
git for-each-ref --format='%(refname:short)%09%(objectname:short)%09%(committerdate:iso8601)%09%(subject)' refs/heads refs/remotes/origin
git rev-list --left-right --count main...<branch>
git rev-list --left-right --count codex/gameplay-improvements...<branch>
git log --oneline --decorate main..codex/gameplay-improvements
git diff --stat main...codex/gameplay-improvements
```

## Summary

| Branch | Audited head | Main relationship at audit | Active branch relationship at audit | Disposition |
| --- | --- | --- | --- | --- |
| `codex/gameplay-improvements` / `origin/codex/gameplay-improvements` | `010f5a6` | `0 behind / 67 ahead` | active branch | Keep. This is the current web/Capacitor launch-polish branch. |
| `feature/game-engine-upgrade` / `origin/feature/game-engine-upgrade` | `6178456` | `396 behind / 9 ahead` | `463 behind / 9 ahead` | Preserve as stale idea archive; do not merge wholesale. |
| `native` | `5c44d7a` | `96 behind / 129 ahead` | `163 behind / 129 ahead` | Preserve as Unity/native pivot reference; blocked unless product direction changes. |
| `legacy-v1` / `origin/legacy-v1` | `84b361f` | `380 behind / 0 ahead` | `447 behind / 0 ahead` | Historical branch; fully merged into `main`, no launch action. |
| `origin/codex/find-and-fix-important-bug` | `42efa06` | `395 behind / 0 ahead` | `462 behind / 0 ahead` | Historical bugfix branch; safe to prune after owner confirmation. |
| `main` / `origin/main` | `9b33326` | baseline | `67 behind / 0 ahead` from active | Production baseline. Merge active branch only after final launch blockers are resolved or intentionally deferred. |

`origin/HEAD` points to `origin/main`.

## Active Branch Payload

At audited handoff-verification head `010f5a6`, `codex/gameplay-improvements`
contained 67 commits on top of `main`:

```text
010f5a6 Polish world and puzzle object art
9fe38da Check App Store screenshot PNGs
e73f06e Refresh branch map to image audit head
95fcfad Check App Store image dimensions
47d4a60 Refresh branch map to sidecar audit head
cdffb11 Check visual audit sidecars in handoff
43397bc Refresh branch map to visual audit head
945189e Gate full visual audit in handoff
90cdc3b Check release script surface in handoff
4e48a5d Check screenshot matrix in handoff
a1e0c6f Check screenshot errors in handoff
879d513 Check web bundle freshness in handoff
f6ad9b0 Gate runtime manifest assets in handoff
f9d402c Track screenshot scene freshness
8af3d80 Track campaign files in world audit freshness
c2355ea Check browser smoke sidecars in handoff
1aa8ce9 Clarify audited branch head
c99ba1c Require performance receipts in handoff
5532801 Refresh launch audit head
ac43115 Verify native bundle in handoff
e3d6d81 Verify iOS bundle sync freshness
28b73cd Check handoff receipt freshness
a8f75c7 Require world audit in handoff check
dddc878 Clarify branch audit head
63f6145 Refresh branch audit receipts
9307835 Add campaign world visual audit
63782c0 Add App Store handoff verifier
5975df6 Document native Xcode handoff blocker
664f8e6 Refresh App Store screenshot evidence
6c0554b Refresh launch audit evidence
8ef914d Polish battlefield and reward visuals
ddec960 Record public App Store URL check
77f16c3 Refresh App Store screenshots evidence
7ba9784 Record App Store blocker handoff
b9c2a20 Correct computer-use audit status
91fb5d7 Verify campaign puzzle routes
175cb18 Tune survival perk balance
8ac2a98 Document survival opener playthrough
80faec5 Tune survival terrain and shot probes
c469086 Add survival balance browser evidence
63ff078 Tune survival AI weapon progression
e4f5522 Cover survival delayed result reveals
668467a Animate survival round rewards
e27da86 Add survival between-round perk choices
52cf6fa Polish survival run over actions
5a7acd1 Expand campaign puzzle progression
d9477ac Start survival runs directly from game over
de3f5be Add puzzle combat polish slice
522b24a Deploy App Store support pages
1cffe2b Add App Store submission checklist
2dfa3ec Add App Store screenshot capture
2156e7a Add App Store privacy and support pages
a58c371 Draft App Store submission materials
d32caf0 Record expanded browser smoke receipts
e4f8212 Update audit with visual receipt commit
450f105 Fix visual audit canvas sampling
a059189 Record launch completion audit
f7aa1f2 Document feature branch map
c499a26 Rehome progression entry points
6120d80 Complete weapon visual coverage
9f6c83e Fix terrain frame pacing
58f1db1 Polish level layouts and runtime assets
6e2c9ac Update knight rider tank sprite
bf9d30f Tune staged ammo progression
7796310 Stage level ammo progression
3febec1 Simplify game flow entry points
0abcb4a Add gameplay simplification follow-up issues
```

The active branch now covers compact level-mode weapon loadouts, generated
weapon icons, staged ammo progression, authored campaign puzzle layouts,
survival reward/perk flow, delayed battlefield-preserving result reveals,
flat puzzle-object art, six distinct world backdrops, upgraded supply-drop and
collection reward art, performance/frame pacing work, release-build screenshot
automation, App Store material drafts, public privacy/support pages, and
current launch-completion audit receipts. The handoff verifier now gates
screenshot matrix coverage, runtime asset naming/file existence, generated web
bundle freshness, native iOS bundle sync, browser-smoke performance sidecars,
world-specific art audits, and the full 90-capture screen/effect visual audit
with per-capture detail sidecars. It also verifies App Store icon and launch
image PNG dimensions in both the native iOS readiness check and release handoff,
plus actual App Store screenshot PNG dimensions in the release handoff.

Recommendation: continue any remaining web/Capacitor launch work here. Do not
branch-hop for old enhancement or native code unless a new task explicitly
changes the ship path.

## Stale Branch Notes

### `feature/game-engine-upgrade`

This branch diverged before the current production baseline. It explored a
separate enhanced web stack with files such as `js/game-enhanced.js`,
`js/physics-enhanced.js`, `js/renderer-pixi.js`, `js/ui-animations.js`,
`css/synthwave-theme.css`, `ENHANCED_FEATURES.md`, `GAME_DESIGN_DOC.md`,
`MOBILE_APP_ROADMAP.md`, `test-enhanced.html`, and `webpack.config.js`.

The current active branch already has newer level progression, Pixi terrain
experimentation, mobile checks, generated assets, and tested gameplay flows.

Recommendation: keep as an idea archive only.

### `native`

This local-only branch is a large Unity/native pivot. It moves the web game into
`web-reference/` and adds Unity-style `Assets/`, `ProjectSettings/`, C# scripts,
shaders, prefabs, generated `.meta` files, iOS icons, and native app scaffolding.
It also includes `docs/research/native-app-analysis.md`, which recommends Unity
as a possible long-term path for premium mobile polish.

Recommendation: preserve as an architectural reference. Do not merge into the
web/Capacitor launch branch unless the product decision changes to a native
restart.

### Historical Merged Branches

`legacy-v1` and `origin/codex/find-and-fix-important-bug` have zero commits ahead
of `main`. They carry no remaining launch-polish payload.
