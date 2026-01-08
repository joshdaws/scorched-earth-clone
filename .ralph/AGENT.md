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
- **Styling**: CSS
- **No build step**: Direct browser loading via index.html

## Running the Game

Open `index.html` directly in a browser, or use a local server:

```bash
# Option 1: Python simple server
python3 -m http.server 8000
# Then open http://localhost:8000

# Option 2: Node serve (if available)
npx serve .
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

## Learnings

(Add discoveries here as you work)
