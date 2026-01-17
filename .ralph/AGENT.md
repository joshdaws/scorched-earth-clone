# Agent Instructions - Scorched Earth

This file captures learnings about how to build, test, and run the project.
Update this when you discover better ways to work with the codebase.

## Task Management with Beads

```bash
bd ready                                    # Find unblocked issues to work on
bd show scorched-earth-XXX                  # View issue details and acceptance criteria
bd update scorched-earth-XXX --claim        # Claim issue (sets status to in_progress)
bd close scorched-earth-XXX                 # Mark complete when done
bd create --title "..." --type bug --priority P2  # Report new bugs
```

## Project Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Build**: Vite (dev server and production builds)
- **Testing**: Vitest with happy-dom
- **Linting**: ESLint with modern ES6+ rules
- **Type Checking**: TypeScript (for Convex files)

## Quality Gates (MANDATORY)

**ALWAYS run quality checks before committing:**

```bash
npm run check    # Runs lint + typecheck + tests
```

Individual commands:
```bash
npm run lint        # ESLint - must pass (0 errors, warnings OK)
npm run lint:fix    # Auto-fix style issues
npm run typecheck   # TypeScript check
npm run test        # Run all tests
npm run test:watch  # Watch mode for development
```

### Pre-commit Hook

The pre-commit hook automatically runs:
1. ESLint (errors block commit)
2. TypeScript check (errors block commit)
3. Tests (failures block commit)
4. Beads sync

**If the pre-commit hook fails:**
1. Read the error message
2. Fix the issue
3. Try committing again

### Test-Driven Development

**For new features:**
1. Write tests first in `tests/unit/` or `tests/integration/`
2. Run tests (they should fail)
3. Implement the feature
4. Run tests (they should pass)
5. Run full `npm run check`
6. Commit

**For bug fixes:**
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Run full `npm run check`
5. Commit

### Writing Tests

Test files live in:
```
tests/
  unit/           # Pure function tests (physics, damage, weapons)
  integration/    # System integration tests (game flow, turns)
  helpers/        # Test utilities and mocks
```

Example test:
```javascript
import { describe, it, expect } from 'vitest';
import { WeaponRegistry } from '../../js/weapons.js';

describe('WeaponRegistry', () => {
  it('returns weapon by ID', () => {
    const weapon = WeaponRegistry.getWeapon('basic-shot');
    expect(weapon).not.toBeNull();
    expect(weapon.id).toBe('basic-shot');
  });
});
```

## Running the Game

Use Vite dev server (recommended) or simple HTTP server:

```bash
# Option 1: Vite dev server (recommended - has hot reload)
npm run dev
# Opens http://localhost:8000 automatically

# Option 2: Python simple server
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Testing with Chrome Extension (MANDATORY)

**ALL changes must be verified using the Chrome browser extension before closing issues.**

### Start the Server
```bash
python3 -m http.server 8000
```

### Test Workflow
```
1. Navigate to game:
   mcp__claude-in-chrome__navigate url="http://localhost:8000" tabId=<tab>

2. Take screenshot to verify visuals:
   mcp__claude-in-chrome__computer action=screenshot tabId=<tab>

3. Check for JavaScript errors:
   mcp__claude-in-chrome__read_console_messages tabId=<tab>

4. Test interactions (click, input):
   mcp__claude-in-chrome__computer action=left_click coordinate=[x,y] tabId=<tab>

5. Read page state if needed:
   mcp__claude-in-chrome__read_page tabId=<tab>
```

### Before Closing Any Issue
- Screenshot shows the feature working
- Console has no errors related to your changes
- All acceptance criteria verified visually
- If something doesn't work, FIX IT before closing

## File Structure

```
index.html          # Main HTML entry point
style.css           # Game styling
js/
  main.js           # Entry point, game initialization
  game.js           # Core game loop and state
  tank.js           # Tank entities
  terrain.js        # Terrain generation and destruction
  projectile.js     # Projectile physics
  weapons.js        # Weapon definitions
  physics.js        # Physics calculations
  ai.js             # AI opponent logic
  renderer.js       # Canvas rendering
  ui.js             # UI elements
  effects.js        # Visual effects
  sound.js          # Audio
  shop.js           # Weapon shop between rounds
  constants.js      # Game constants
```

## Code Patterns

### Game Loop
The game uses requestAnimationFrame for the main loop. State is managed in game.js.

### Canvas Rendering
All rendering goes through renderer.js. Use the existing patterns for drawing.

### Physics
Projectile physics and collision detection in physics.js. Terrain destruction modifies terrain data.

## Issue Sizing & Decomposition

Before starting work on any issue, evaluate its size:

| Size | Files | Distinct Changes | Action |
|------|-------|------------------|--------|
| S | 1-2 | 1-2 | Work directly |
| M | 3-5 | 2-4 | Work directly |
| L | 6-10 | 5-8 | Decompose first |
| XL | 10+ | 8+ | Must decompose |

### Decomposition Example

**Original Issue:** "Fix Responsive Scaling - Everything Must Scale Proportionally"

This is an XL issue (10+ files, multiple systems). Decompose it:

```bash
# Create focused sub-issues
bd create --title "Add global scale factor calculation" --type task --parent scorched-earth-580
bd create --title "Apply scaling to tank rendering" --type task --parent scorched-earth-580
bd create --title "Apply scaling to terrain generation" --type task --parent scorched-earth-580
bd create --title "Apply scaling to projectiles & effects" --type task --parent scorched-earth-580
bd create --title "Apply scaling to UI elements" --type task --parent scorched-earth-580
bd create --title "Handle aspect ratio edge cases" --type task --parent scorched-earth-580
```

**Result:**
```
scorched-earth-580: Fix Responsive Scaling (parent, XL - blocked)
  ├── scorched-earth-xxx: Add global scale factor calculation (S)
  ├── scorched-earth-xxx: Apply scaling to tank rendering (S)
  ├── scorched-earth-xxx: Apply scaling to terrain generation (M)
  ├── scorched-earth-xxx: Apply scaling to projectiles & effects (M)
  ├── scorched-earth-xxx: Apply scaling to UI elements (M)
  └── scorched-earth-xxx: Handle aspect ratio edge cases (S)
```

### Decomposition Patterns

**Feature Implementation (L/XL):**
1. Core data structure/model
2. Core logic/algorithm
3. Integration with existing systems
4. UI/rendering
5. Tests (if applicable)

**Bug Fix (L):**
1. Add minimal reproduction test
2. Fix the root cause
3. Add edge case handling
4. Update related areas

**Refactoring (L/XL):**
1. Extract/create new module
2. Update first consumer
3. Update remaining consumers
4. Remove old code
5. Update imports/references

### Key Rules

- Each sub-issue should be independently testable
- Each sub-issue should result in one focused commit
- Use `--blocked-by` when order matters
- Parent issue becomes a container (mark as blocked)
- Work on sub-issues in order, one at a time

## Learnings

(Add discoveries here as you work)
