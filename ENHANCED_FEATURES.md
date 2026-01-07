# Enhanced Features Guide

## Overview
The game includes optional enhancements that provide improved graphics and animations on devices with WebGL support. These enhancements are automatically enabled when available.

## How to Use Enhanced Features

### 1. Automatic Detection
The game automatically detects WebGL support and enables enhancements when available:
- **Desktop browsers**: Usually have WebGL support - enhancements will be active
- **Mobile devices**: May have limited WebGL support - standard renderer used for performance
- **Older devices**: No WebGL support - standard renderer provides excellent gameplay

### 2. Debug Mode
Access debug mode with performance monitoring:
```
http://localhost:8080/#debug
```

Features in debug mode:
- FPS counter
- Auto-starts a 4-player test game
- Performance statistics (press 'd' to toggle debug view)

### 3. Console Commands
Use these commands in the browser console:

```javascript
// Check if enhancements are active
gameEnhanced.enhanced  // true/false

// See which renderer is being used
gameEnhanced.pixiRenderer ? 'PIXI (WebGL)' : 'Canvas2D'

// Toggle enhancements on/off
gameEnhanced.toggleEnhanced()

// Start performance monitoring
gameEnhanced.startPerformanceMonitoring()

// Toggle debug mode in-game
game.toggleDebug()
```

## Enhanced Features When Available

### Visual Enhancements (PIXI.js/WebGL)
- **Particle Effects**: Realistic explosion particles with physics
- **Glow Effects**: Neon glows on tanks and projectiles
- **Screen Shake**: Camera shake on large explosions
- **Animated Shields**: Rotating, pulsing shield effects
- **Trail Effects**: Dynamic projectile trails
- **Damage Animation**: Tank flash and shake when hit

### UI Animations (GSAP)
- **Smooth Transitions**: Animated screen changes
- **Button Effects**: Hover animations and click feedback
- **Victory Animations**: Fireworks and celebration effects
- **Round End Overlays**: Professional animated notifications

### Performance Features
- **Spatial Grid**: Efficient collision detection
- **Dirty Rectangle System**: Only redraws changed screen areas
- **WebGL Acceleration**: Hardware-accelerated rendering when available

## Fallback Behavior

If your device doesn't support WebGL:
- The game automatically uses the standard Canvas2D renderer
- All gameplay features remain available
- Performance is optimized for your device
- No error messages will appear

## Testing Different Modes

To test how the game works on different devices:

1. **Force standard mode** (simulate non-WebGL device):
   - Open Chrome DevTools (F12)
   - Go to Rendering settings
   - Check "Disable WebGL"
   - Refresh the page

2. **Test mobile mode**:
   - Use Chrome DevTools device emulation
   - Select a mobile device preset
   - The game will adapt its renderer accordingly

## Troubleshooting

**Q: I don't see enhanced effects**
A: Your device may not support WebGL. The standard renderer provides excellent gameplay.

**Q: The game runs slowly with enhancements**
A: Try refreshing the page. The game will re-evaluate performance and may switch to standard mode.

**Q: How do I know which mode is active?**
A: Open the console and type `gameEnhanced.pixiRenderer ? 'Enhanced' : 'Standard'`