# Animated Synthwave Title Screen

## Overview

Replace the static menu background with a fully animated, procedurally generated synthwave scene using Three.js. The effect creates the illusion of driving down an endless neon grid road toward a sunset, with wireframe mountains scrolling past on either side.

## Visual Reference

Classic "OutRun" / synthwave aesthetic:
- Perspective grid road stretching to horizon
- Glowing sun with horizontal scan lines
- Wireframe mountains on both sides
- Starfield in the sky
- Everything animated: grid scrolls toward viewer, mountains pass by

## Technical Approach

### Why Three.js

The "driving forward" effect is fundamentally a 3D perspective problem. Three.js handles this natively:
- Camera positioned above the grid, looking toward horizon
- Moving camera forward (or scrolling world backward) creates motion
- Mountains at different Z depths naturally parallax correctly
- Built-in bloom post-processing for authentic neon glow

### Architecture

```
js/
  titleScene/
    titleScene.js      # Main module - init, update, render, cleanup
    grid.js            # Infinite scrolling grid plane
    sun.js             # Sun with gradient and scan lines
    mountains.js       # Procedural wireframe mountain generation
    stars.js           # Starfield background
    postProcessing.js  # Bloom and color grading
```

### Three.js Setup

```javascript
// Orthographic camera looking down the Z axis
// Or perspective camera tilted down at grid

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
camera.position.set(0, 5, 0);  // Above grid
camera.rotation.x = -0.3;       // Tilt down toward horizon

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

// Post-processing for bloom
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(resolution, strength, radius, threshold));
```

## Components

### 1. Infinite Scrolling Grid

The grid creates the "road" effect - lines converging at the horizon that scroll toward the viewer.

**Approach A: Shader-based (recommended)**
- Single plane with custom shader
- UV coordinates offset over time for scrolling
- Grid lines drawn in fragment shader
- Infinite seamless scrolling with no geometry updates

**Approach B: Geometry-based**
- LineSegments geometry for grid lines
- Translate Z positions each frame
- Reset lines that pass camera to back of queue
- More objects but simpler shader

**Visual properties:**
- Magenta/cyan lines (#ff00ff, #00ffff)
- Glow/emission on lines
- Perspective convergence at horizon
- Line spacing increases toward viewer (perspective)

### 2. Sun

Semi-circle at the horizon with gradient coloring and horizontal scan lines.

**Approach:**
- Flat circle geometry (or sprite) at far Z
- Custom shader for:
  - Radial gradient (yellow center → orange → magenta edge)
  - Horizontal bands cut out (scan line effect)
  - Subtle pulsing glow

**Properties:**
- Position: Center horizon, far Z distance
- Colors: #ffff00 → #ff8800 → #ff0066
- 6-8 horizontal scan line gaps
- Subtle bloom glow

### 3. Wireframe Mountains

Procedurally generated mountain silhouettes on both sides of the road.

**Generation:**
```javascript
function generateMountainProfile(segments, maxHeight, roughness) {
    const points = [];
    // Use simplex/perlin noise or midpoint displacement
    for (let i = 0; i <= segments; i++) {
        const x = i / segments;
        const height = noise(x * roughness) * maxHeight;
        points.push(new THREE.Vector3(x, height, 0));
    }
    return points;
}
```

**Rendering:**
- LineSegments geometry connecting vertices
- Multiple mountain layers at different Z depths
- Cyan/blue wireframe color (#00ffff, #0088ff)
- Further mountains = darker/more transparent

**Animation:**
- Mountains placed at intervals along Z axis
- As camera moves forward (or world scrolls back), mountains pass by
- Mountains that pass behind camera respawn far ahead
- Different layers move at different speeds (parallax via actual depth)

**Wireframe style:**
- Horizontal lines connecting points at each height
- Vertical lines connecting to ground
- Optional: diagonal cross-lines for more detail

### 4. Starfield

Background stars in the sky portion.

**Approach:**
- Points geometry with random positions
- Constrain to upper hemisphere (above horizon)
- Very slow parallax (almost static) or completely static
- Optional: twinkling via opacity animation

**Properties:**
- 100-200 stars
- White with slight color variation
- Various sizes (1-3 pixels)
- Very subtle or no movement

### 5. Post-Processing

Bloom effect for authentic neon glow.

**Setup:**
```javascript
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    1.5,    // strength
    0.4,    // radius
    0.85    // threshold
);
```

**Optional additions:**
- Chromatic aberration at edges
- Film grain
- Vignette
- Color grading (push toward magenta/cyan)

## Animation Loop

```javascript
function update(deltaTime) {
    // Scroll grid
    gridMaterial.uniforms.offset.value += speed * deltaTime;

    // Move mountains (or move camera)
    mountains.forEach(m => {
        m.position.z += speed * deltaTime;
        if (m.position.z > camera.position.z) {
            // Respawn far ahead
            m.position.z -= totalDepth;
            regenerateMountainProfile(m);
        }
    });

    // Subtle sun pulse
    sun.material.uniforms.pulse.value = Math.sin(time * 2) * 0.1 + 1;
}
```

## Integration with Game

### Module Interface

```javascript
// js/titleScene/titleScene.js

export function init(canvas) {
    // Set up Three.js scene, renderer, composer
    // Create all elements
    // Start animation loop
}

export function start() {
    // Begin animation (when entering MENU state)
}

export function stop() {
    // Pause animation (when leaving MENU state)
}

export function cleanup() {
    // Dispose geometries, materials, textures
    // Remove from DOM
}

export function resize(width, height) {
    // Handle canvas resize
}
```

### Canvas Layering

Two options:

**Option A: Separate canvases (recommended)**
- Three.js renders to background canvas
- Existing 2D canvas overlays for UI (title, buttons)
- Clean separation of concerns

**Option B: Single canvas**
- Three.js renders background
- Copy to 2D canvas or render 2D elements in Three.js
- More complex, less flexible

### State Integration

```javascript
// In main.js
Game.registerStateHandlers(GAME_STATES.MENU, {
    onEnter: () => {
        TitleScene.start();
    },
    onExit: () => {
        TitleScene.stop();
    },
    update: (dt) => {
        TitleScene.update(dt);
    },
    render: (ctx) => {
        // TitleScene renders to its own canvas
        // This renders UI overlay
        renderMenuUI(ctx);
    }
});
```

## Performance Considerations

- Target 60fps on mobile
- Bloom is expensive - may need to reduce on low-end devices
- Mountain geometry is simple (just lines)
- Grid shader is cheap
- Total draw calls should be < 20

## Dependencies

```json
{
    "three": "^0.160.0"
}
```

Plus post-processing from three/examples:
- EffectComposer
- RenderPass
- UnrealBloomPass

Can be imported as ES modules or bundled.

## File Size Impact

- three.js core: ~150KB minified
- Post-processing: ~30KB
- Total: ~180KB additional

## Implementation Order

1. Basic Three.js setup and canvas integration
2. Scrolling grid (biggest visual impact)
3. Sun with gradient and scan lines
4. Wireframe mountains (static first)
5. Mountain scrolling/parallax animation
6. Starfield
7. Post-processing (bloom)
8. Polish and performance optimization

## Success Criteria

- [ ] Smooth 60fps animation
- [ ] Seamless infinite grid scrolling
- [ ] Mountains convincingly "pass by" the viewer
- [ ] Authentic synthwave color palette
- [ ] Bloom glow on all neon elements
- [ ] Clean integration with existing menu UI
- [ ] Works on iOS/Safari
- [ ] No visual glitches or seams
