# Button Component

A reusable canvas-based button component with neon synthwave styling, state management, and configurable appearance.

## Location

`js/ui/Button.js`

## Import

```javascript
import { Button, createPrimaryButton, createSecondaryButton, createDangerButton } from './ui/Button.js';
```

## Constructor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | `''` | Button label text |
| `x` | number | `0` | Center X position |
| `y` | number | `0` | Center Y position |
| `width` | number | auto | Button width (auto-sized from text if not provided) |
| `height` | number | auto | Button height (auto-sized from text if not provided) |
| `fontSize` | number | `24` | Text font size in pixels |
| `fontFamily` | string | `'Audiowide'` | Font family for text |
| `padding` | number | `16` | Internal padding around text |
| `bgColor` | string | `'rgba(26, 26, 46, 0.8)'` | Background color |
| `borderColor` | string | `COLORS.NEON_CYAN` | Border/glow color |
| `textColor` | string | `COLORS.TEXT_LIGHT` | Text color |
| `glowColor` | string | `COLORS.NEON_CYAN` | Glow effect color |
| `borderRadius` | number | `8` | Corner radius |
| `borderWidth` | number | `2` | Border line width |
| `disabled` | boolean | `false` | Whether button is disabled |
| `autoSize` | boolean | `true` | Auto-size based on text if width/height not provided |
| `onClick` | Function | `null` | Click callback function |

## Methods

### State Management

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `setDisabled(disabled)` | `boolean` | void | Set disabled state |
| `setHovered(hovered)` | `boolean` | void | Set hover state |
| `setPressed(pressed)` | `boolean` | void | Set pressed state |
| `isHovered()` | none | `boolean` | Check if currently hovered |
| `isPressed()` | none | `boolean` | Check if currently pressed |

### Positioning

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `setPosition(x, y)` | `number, number` | void | Update center position |
| `setSize(width, height)` | `number, number` | void | Update dimensions |
| `getBounds()` | none | `{x, y, width, height}` | Get top-left based bounds |
| `containsPoint(x, y)` | `number, number` | `boolean` | Check if point is inside button |

### Input Handling

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `handlePointerDown(x, y)` | `number, number` | `boolean` | Handle pointer down, returns true if hit |
| `handlePointerUp(x, y)` | `number, number` | `boolean` | Handle pointer up, triggers onClick if valid |
| `handlePointerMove(x, y)` | `number, number` | `boolean` | Handle move for hover, returns true if state changed |

### Rendering

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `render(ctx, pulseIntensity)` | `CanvasRenderingContext2D, number` | void | Render button to canvas |
| `renderWithBadge(ctx, pulseIntensity, badgeCount)` | `CanvasRenderingContext2D, number, number` | void | Render with notification badge |

## Factory Functions

Convenience functions that create pre-styled buttons:

- `createPrimaryButton(config)` - Cyan neon style (main actions)
- `createSecondaryButton(config)` - Pink neon style (secondary actions)
- `createDangerButton(config)` - Orange neon style (warning/danger actions)

## Usage Examples

### Example 1: Primary Button (Auto-sized)

```javascript
import { Button } from './ui/Button.js';
import { COLORS } from './constants.js';

// Create a primary-style button that auto-sizes to fit text
const startButton = new Button({
    text: 'START GAME',
    x: 600,  // Center X
    y: 400,  // Center Y
    borderColor: COLORS.NEON_CYAN,
    glowColor: COLORS.NEON_CYAN,
    onClick: () => {
        console.log('Starting game!');
        Game.setState('PLAYING');
    }
});

// In render loop
function render(ctx) {
    const pulseIntensity = (Math.sin(Date.now() / 500) + 1) / 2;
    startButton.render(ctx, pulseIntensity);
}

// In input handler
function handleClick(x, y) {
    if (startButton.containsPoint(x, y) && !startButton.disabled) {
        startButton.onClick();
    }
}
```

### Example 2: Secondary Button (Fixed Size)

```javascript
import { createSecondaryButton } from './ui/Button.js';

// Create a fixed-size secondary button
const optionsButton = createSecondaryButton({
    text: 'OPTIONS',
    x: 600,
    y: 500,
    width: 200,
    height: 50,
    fontSize: 18,
    onClick: () => openOptionsMenu()
});

// Update position dynamically (e.g., on resize)
function updateLayout() {
    const screenWidth = Renderer.getWidth();
    optionsButton.setPosition(screenWidth / 2, 500);
}
```

### Example 3: Disabled Button

```javascript
import { Button } from './ui/Button.js';
import { COLORS } from './constants.js';

// Create a button that starts disabled
const continueButton = new Button({
    text: 'CONTINUE',
    x: 600,
    y: 450,
    borderColor: COLORS.NEON_CYAN,
    glowColor: COLORS.NEON_CYAN,
    disabled: true,  // Start disabled
    onClick: () => continueGame()
});

// Enable the button when conditions are met
function onRoundComplete() {
    continueButton.setDisabled(false);
}

// Disabled buttons render with muted colors automatically
```

### Example 4: Button with Hover States

```javascript
import { Button } from './ui/Button.js';
import { COLORS } from './constants.js';

const myButton = new Button({
    text: 'HOVER ME',
    x: 600,
    y: 400,
    borderColor: COLORS.NEON_PINK,
    glowColor: COLORS.NEON_PINK
});

// Track hover state for visual feedback
function handlePointerMove(x, y) {
    myButton.handlePointerMove(x, y);
    // Button automatically updates internal _hovered state
    // render() will show enhanced glow when hovered
}

function handlePointerDown(x, y) {
    if (myButton.handlePointerDown(x, y)) {
        Sound.playClickSound();
    }
}

function handlePointerUp(x, y) {
    myButton.handlePointerUp(x, y);
    // Automatically triggers onClick if pointer is still inside
}
```

### Example 5: Button with Notification Badge

```javascript
import { Button } from './ui/Button.js';
import { COLORS } from './constants.js';

const achievementsButton = new Button({
    text: 'ACHIEVEMENTS',
    x: 700,
    y: 400,
    borderColor: COLORS.NEON_PINK,
    glowColor: COLORS.NEON_PINK,
    onClick: () => showAchievements()
});

// In render loop - show badge for new unlocked achievements
function render(ctx) {
    const pulseIntensity = (Math.sin(Date.now() / 500) + 1) / 2;
    const newAchievements = Achievements.getNewUnlockedCount();

    // Use renderWithBadge instead of render
    achievementsButton.renderWithBadge(ctx, pulseIntensity, newAchievements);
}
```

### Example 6: Custom Colored Button

```javascript
import { Button } from './ui/Button.js';
import { COLORS } from './constants.js';

// Green button for success/confirm actions
const confirmButton = new Button({
    text: 'CONFIRM',
    x: 600,
    y: 400,
    borderColor: COLORS.NEON_GREEN,
    glowColor: COLORS.NEON_GREEN,
    textColor: '#ffffff',
    onClick: () => confirmAction()
});

// Yellow/gold button for premium actions
const goldButton = new Button({
    text: 'BUY NOW',
    x: 600,
    y: 500,
    borderColor: COLORS.NEON_YELLOW,
    glowColor: COLORS.NEON_YELLOW,
    textColor: COLORS.NEON_YELLOW,
    onClick: () => openStore()
});
```

## Color Constants Reference

From `js/constants.js`:

```javascript
COLORS.NEON_CYAN    // '#05d9e8' - Primary action color
COLORS.NEON_PINK    // '#ff2a6d' - Secondary/accent color
COLORS.NEON_PURPLE  // '#d300c5' - Alternative accent
COLORS.NEON_YELLOW  // '#ffd700' - Premium/gold actions
COLORS.NEON_GREEN   // '#39ff14' - Success/confirm
COLORS.NEON_ORANGE  // '#ff6b35' - Warning/danger
COLORS.TEXT_LIGHT   // '#ffffff' - Default text color
COLORS.TEXT_MUTED   // '#666677' - Disabled/muted text
```

## Best Practices

1. **Use center-based positioning** - Button x/y represents the center, not top-left
2. **Let buttons auto-size** - Unless you need fixed sizes for layout consistency
3. **Use factory functions** - `createPrimaryButton()` etc. for consistent styling
4. **Handle all input events** - pointerDown, pointerUp, and pointerMove for proper interaction
5. **Pass pulse intensity** - Creates the characteristic synthwave glow animation
6. **Use renderWithBadge()** - For buttons that can show notification counts
