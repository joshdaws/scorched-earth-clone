# Particle Effect Prompts - Dirt, Sparks, Smoke, Glow

Prompts for generating particle effect sprites for Scorched Earth: Synthwave Edition.

## Tool Recommendation

**Primary**: NanoBanana Pro (good for tiny sprites)
**Alternative**: Leonardo.ai

Note: Particle sprites are very small (4-8 pixels). Most AI generators struggle at this scale. Consider:
1. Generate at 2x or 4x size, then scale down
2. Create in a pixel art editor manually
3. Use procedural generation in-game

## Base Specifications

```
Size: Very small (4-8 pixels)
Background: Transparent (PNG with alpha)
Shape: Simple, works when rotated and scaled
Color: Single color with transparency gradient
```

## Design Notes

Particles must:
- **Work at any rotation**: Symmetrical or near-symmetrical shapes
- **Scale well**: Look good from 25% to 200% size
- **Blend smoothly**: Soft edges for additive blending
- **Be subtle**: Support gameplay, not distract from it

---

## Asset 1: Dirt Particle (dirt-particle.png)

### Specifications
- **Dimensions**: 4x4 pixels
- **Color**: Brown/tan earth tones
- **Visual**: Small irregular chunk of terrain debris

### Prompt (NanoBanana Pro) - Generate at 16x16, scale to 4x4

```
2D game particle sprite, tiny dirt debris chunk,
small irregular brown rock fragment,
tan and dark brown colors, pixel art style,
simple shape that works when rotated,
transparent background,
16x16 pixels for detail, will scale to 4x4,
game terrain debris particle
```

### Manual Creation Guidelines

If AI generation fails, create manually:
```
4x4 pixel grid:
. B . .
B T B .
. B T .
. . B .

B = Brown (#6B4423)
T = Tan (#8B7355)
. = Transparent
```

### Variations to Generate

Create 3-4 variations for visual variety:
- dirt-particle-01.png
- dirt-particle-02.png
- dirt-particle-03.png
- dirt-particle-04.png

### Key Elements to Verify
- [ ] Irregular shape (not perfect circle/square)
- [ ] Earth tone colors (brown/tan)
- [ ] Works when rotated
- [ ] Transparent background
- [ ] Dimensions match 4x4 (or 16x16 pre-scale)

---

## Asset 2: Spark Particle (spark-particle.png)

### Specifications
- **Dimensions**: 4x4 pixels
- **Color**: Bright orange/yellow
- **Visual**: Small glowing spark for explosions

### Prompt (NanoBanana Pro) - Generate at 16x16, scale to 4x4

```
2D game particle sprite, tiny glowing spark,
small bright orange and yellow point of light,
radial gradient fading to transparent edges,
energy spark from explosion,
transparent background,
16x16 pixels for detail, will scale to 4x4,
game explosion spark particle
```

### Manual Creation Guidelines

```
4x4 pixel grid (with alpha gradients):
. Y50 . .
O100 Y100 O50 .
. Y50 O50 .
. . . .

Y = Yellow (#FFFF00) at % opacity
O = Orange (#FF8800) at % opacity
. = Transparent
```

### Key Elements to Verify
- [ ] Bright center fading to edges
- [ ] Orange/yellow spark colors
- [ ] Radial gradient (center brightest)
- [ ] Transparent background
- [ ] Small enough for explosion effects

---

## Asset 3: Smoke Particle (smoke-particle.png)

### Specifications
- **Dimensions**: 8x8 pixels
- **Color**: Gray with transparency
- **Visual**: Soft circular smoke puff

### Prompt (NanoBanana Pro) - Generate at 32x32, scale to 8x8

```
2D game particle sprite, soft smoke puff,
circular gray cloud shape,
dark gray center fading to transparent edges,
smooth soft edges, wispy smoke aesthetic,
transparent background,
32x32 pixels for detail, will scale to 8x8,
game smoke trail particle
```

### Manual Creation Guidelines

```
8x8 pixel grid (simplified):
. . G20 G40 G40 G20 . .
. G30 G50 G60 G60 G50 G30 .
G20 G50 G70 G80 G80 G70 G50 G20
G30 G60 G80 G90 G90 G80 G60 G30
G30 G60 G80 G90 G90 G80 G60 G30
G20 G50 G70 G80 G80 G70 G50 G20
. G30 G50 G60 G60 G50 G30 .
. . G20 G40 G40 G20 . .

G = Gray (#666666) at % opacity
. = Transparent
```

### Variations

Create variations with different densities:
- smoke-particle-light.png (more transparent)
- smoke-particle-medium.png
- smoke-particle-dense.png (more opaque)

### Key Elements to Verify
- [ ] Circular soft shape
- [ ] Gray color with transparency
- [ ] Smooth edges (not hard)
- [ ] Works for additive blending
- [ ] Dimensions match 8x8

---

## Asset 4: Glow Particle (glow-particle.png)

### Specifications
- **Dimensions**: 8x8 pixels
- **Color**: Synthwave neon (pink or cyan variants)
- **Visual**: Soft radial glow for energy effects

### Prompt (NanoBanana Pro) - Generate at 32x32, scale to 8x8

```
2D game particle sprite, soft neon glow point,
circular radial gradient, bright center,
neon pink (#FF00FF) or cyan (#00FFFF) color,
fading to transparent at edges,
synthwave energy effect aesthetic,
transparent background,
32x32 pixels for detail, will scale to 8x8,
game energy glow particle
```

### Color Variants

Generate two versions:
- glow-particle-pink.png (#FF00FF)
- glow-particle-cyan.png (#00FFFF)

### Manual Creation Guidelines

```
8x8 radial gradient:
- Center (2x2): 100% opacity color
- Ring 1: 75% opacity
- Ring 2: 50% opacity
- Ring 3: 25% opacity
- Edge: Transparent
```

### Key Elements to Verify
- [ ] Radial gradient (bright center)
- [ ] Neon color (pink or cyan)
- [ ] Soft edges fading to transparent
- [ ] Works for additive blending
- [ ] Dimensions match 8x8

---

## Bonus: Debris Chunk (debris-chunk.png)

### Specifications
- **Dimensions**: 6x6 pixels
- **Color**: Gray/brown rock
- **Visual**: Angular chunk for terrain destruction

### Prompt (NanoBanana Pro) - Generate at 24x24, scale to 6x6

```
2D game particle sprite, angular debris chunk,
small irregular rock fragment,
dark gray and brown stone colors,
angular broken edges, rough texture,
transparent background,
24x24 pixels for detail, will scale to 6x6,
game terrain debris chunk
```

### Key Elements to Verify
- [ ] Angular/irregular shape
- [ ] Rock-like appearance
- [ ] Works when rotated
- [ ] Transparent background
- [ ] Larger than dirt particle

---

## Particle System Usage

### Terrain Destruction
```
Effect: Dirt exploding upward
Particles: dirt-particle (×20-30)
Behavior: Fountain pattern, gravity falloff
Lifetime: 0.5-1.0 seconds
```

### Explosion
```
Effect: Explosion sparkles
Particles: spark-particle (×15-25)
Behavior: Radial burst, fade out
Lifetime: 0.3-0.5 seconds
```

### Smoke Trail
```
Effect: Projectile trail
Particles: smoke-particle (×5-10)
Behavior: Spawn behind projectile, rise slowly
Lifetime: 1.0-2.0 seconds
```

### Energy Effect
```
Effect: Power-up or special weapon glow
Particles: glow-particle (×10-20)
Behavior: Orbit or radiate, pulse opacity
Lifetime: 0.5-1.5 seconds
```

---

## Scaling Strategy

Since AI generators struggle at 4x4:

### Method 1: Generate Large, Scale Down
1. Generate at 4x size (e.g., 16x16 for 4x4 target)
2. Scale down with nearest-neighbor sampling
3. Clean up edges if needed

### Method 2: Procedural Generation
For particles, consider generating in-game:
```javascript
// Example: Generate dirt particle procedurally
ctx.fillStyle = '#6B4423';
ctx.fillRect(0, 1, 2, 2);
ctx.fillRect(1, 0, 2, 2);
ctx.fillStyle = '#8B7355';
ctx.fillRect(1, 1, 1, 1);
```

### Method 3: Sprite Sheet
Create single sheet with multiple particles:
- 1 row dirt variations
- 1 row spark variations
- 1 row smoke variations
- 1 row glow variations

---

## Batch Generation Tips

1. **Generate at 4x resolution** for better AI results
2. **Create 3-4 variations** of each particle type
3. **Test with particle system** before finalizing
4. **Check rotation behavior** for all particles
5. **Verify transparency** works with additive blending

## Post-Processing Notes

### Transparency
- Ensure clean alpha channel
- Soft edges should fade to 0 alpha
- No white/black fringing

### Scale-Down Quality
- Use nearest-neighbor for pixel-perfect
- Or bilinear for softer look
- Test both approaches

### Variation Set
- Having 3-4 variations per type adds visual variety
- Prevents repetitive patterns in particle systems

---

## Integration

After generation, place files in `assets/images/particles/`:

```json
{
  "particles": {
    "dirt": [
      { "path": "images/particles/dirt-particle-01.png", "width": 4, "height": 4 },
      { "path": "images/particles/dirt-particle-02.png", "width": 4, "height": 4 },
      { "path": "images/particles/dirt-particle-03.png", "width": 4, "height": 4 }
    ],
    "spark": [
      { "path": "images/particles/spark-particle.png", "width": 4, "height": 4 }
    ],
    "smoke": [
      { "path": "images/particles/smoke-particle-light.png", "width": 8, "height": 8 },
      { "path": "images/particles/smoke-particle-medium.png", "width": 8, "height": 8 },
      { "path": "images/particles/smoke-particle-dense.png", "width": 8, "height": 8 }
    ],
    "glow": {
      "pink": { "path": "images/particles/glow-particle-pink.png", "width": 8, "height": 8 },
      "cyan": { "path": "images/particles/glow-particle-cyan.png", "width": 8, "height": 8 }
    },
    "debris": [
      { "path": "images/particles/debris-chunk.png", "width": 6, "height": 6 }
    ]
  }
}
```

Test in particle system with full effect before finalizing.
