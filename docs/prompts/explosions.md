# Explosion Sprite Sheet Prompts - 3 Sizes

Prompts for generating explosion sprite sheets for Scorched Earth: Synthwave Edition.

## Tool Recommendation

**Primary**: NanoBanana Pro (best for sprite sheet generation)
**Alternative**: Leonardo.ai (good transparency support)

## Style Consistency Reference

```
Primary colors:
- Neon Pink: #FF00FF
- Electric Cyan: #00FFFF
- Deep Purple: #8B00FF
- Hot Orange: #FF6600

Common elements:
- Chrome/metallic surfaces
- Neon glow effects (2-4px blur)
- Energy bursts
- Particle effects
```

## Design Notes

Explosion sprite sheets must:
- **Horizontal layout**: Frames arranged left to right in single row
- **Consistent frame size**: All frames same dimensions
- **Animation flow**: Flash → Expansion → Dissipation
- **Synthwave palette**: Pink/magenta core with cyan edges

### Animation Phases

1. **Frame 1**: Initial bright flash (white/yellow core)
2. **Early frames**: Fireball expansion with core color
3. **Middle frames**: Full expansion with particle dispersion
4. **Final frames**: Dissipation, fading glow, smoke wisps

---

## Asset 1: Small Explosion (explosion-small.png)

### Specifications
- **Total Dimensions**: 256x32 pixels (8 frames × 32x32)
- **Frame Size**: 32x32 pixels
- **Frame Count**: 8 frames
- **Color Scheme**: Pink/magenta core, cyan sparks
- **Use Case**: Basic hit explosions, bullet impacts

### Prompt (NanoBanana Pro)

```
2D explosion animation sprite sheet, 8 frames, horizontal layout, synthwave style,
small explosion starting with bright white flash,
neon pink and magenta fireball core,
electric cyan sparks and edge particles,
expanding circular burst then dissipating,
each frame 32x32 pixels, transparent background,
game asset, clean pixel art edges, seamless animation
```

### Prompt (Leonardo.ai Alternative)

```
Game sprite sheet of small explosion animation, 8 frames side by side,
synthwave aesthetic explosion sequence,
frame 1 bright flash, frames 2-5 expanding pink (#FF00FF) fireball,
cyan (#00FFFF) particle sparks on edges,
frames 6-8 fading dissipation effect,
each frame 32 pixels square, transparent PNG background,
total 256x32 pixels, horizontal strip format
```

### Key Elements to Verify
- [ ] 8 distinct frames visible in horizontal row
- [ ] Each frame is 32x32 pixels
- [ ] Total dimensions 256x32 pixels
- [ ] Pink/magenta core color visible
- [ ] Cyan edge particles/sparks present
- [ ] Clear animation progression (flash → expand → dissipate)
- [ ] Transparent background throughout
- [ ] No frame overlap or cropping

---

## Asset 2: Medium Explosion (explosion-medium.png)

### Specifications
- **Total Dimensions**: 640x64 pixels (10 frames × 64x64)
- **Frame Size**: 64x64 pixels
- **Frame Count**: 10 frames
- **Color Scheme**: Pink/orange core, cyan ring, purple smoke
- **Use Case**: Standard weapon explosions, most projectile impacts

### Prompt (NanoBanana Pro)

```
2D explosion animation sprite sheet, 10 frames, horizontal layout, synthwave style,
medium explosion with intense bright flash start,
neon pink and hot orange fireball core,
expanding shockwave ring with electric cyan edge,
purple smoke wisps in dissipation frames,
each frame 64x64 pixels, transparent background,
game asset, clean pixel art, dramatic lighting, seamless animation
```

### Prompt (Leonardo.ai Alternative)

```
Game sprite sheet of medium explosion animation, 10 frames side by side,
synthwave aesthetic explosion sequence,
frame 1 bright white flash, frames 2-4 expanding fireball with pink (#FF00FF) and orange (#FF6600) core,
frames 5-7 full expansion with cyan (#00FFFF) shockwave ring,
frames 8-10 dissipation with purple (#8B00FF) smoke,
each frame 64 pixels square, transparent PNG background,
total 640x64 pixels, horizontal strip format
```

### Key Elements to Verify
- [ ] 10 distinct frames visible in horizontal row
- [ ] Each frame is 64x64 pixels
- [ ] Total dimensions 640x64 pixels
- [ ] Pink/orange core gradient visible
- [ ] Cyan shockwave ring in expansion frames
- [ ] Purple smoke in dissipation phase
- [ ] Clear animation progression with smooth flow
- [ ] Transparent background throughout
- [ ] Proportionally larger and more detailed than small explosion

---

## Asset 3: Large Explosion (explosion-large.png)

### Specifications
- **Total Dimensions**: 1536x128 pixels (12 frames × 128x128)
- **Frame Size**: 128x128 pixels
- **Frame Count**: 12 frames
- **Color Scheme**: White/yellow core, pink fireball, cyan particles, purple aftermath
- **Use Case**: Nuke explosions, dramatic impacts

### Prompt (NanoBanana Pro)

```
2D explosion animation sprite sheet, 12 frames, horizontal layout, synthwave style,
massive nuclear-style explosion,
frame 1 blinding white flash with yellow corona,
neon pink and hot magenta mushroom cloud fireball,
electric cyan particle debris ring expanding outward,
purple and deep violet smoke in aftermath frames,
intense neon glow throughout, dramatic lighting,
each frame 128x128 pixels, transparent background,
game asset, clean pixel art, epic scale, seamless animation
```

### Prompt (Leonardo.ai Alternative)

```
Game sprite sheet of large nuclear explosion animation, 12 frames side by side,
synthwave aesthetic epic explosion sequence,
frame 1 blinding white flash with yellow glow,
frames 2-5 massive pink (#FF00FF) and magenta fireball expansion,
frames 6-8 full mushroom cloud with cyan (#00FFFF) debris particles,
frames 9-12 dramatic dissipation with purple (#8B00FF) smoke clouds,
each frame 128 pixels square, transparent PNG background,
total 1536x128 pixels, horizontal strip format, nuclear devastation scale
```

### Key Elements to Verify
- [ ] 12 distinct frames visible in horizontal row
- [ ] Each frame is 128x128 pixels
- [ ] Total dimensions 1536x128 pixels
- [ ] White/yellow flash in first frame
- [ ] Pink/magenta fireball core visible
- [ ] Cyan debris particles in expansion
- [ ] Purple smoke in aftermath frames
- [ ] Mushroom cloud or dramatic expansion shape
- [ ] Clear animation progression with extended dissipation
- [ ] Transparent background throughout
- [ ] Significantly more detailed than medium explosion
- [ ] Feels appropriately "epic" for nuke weapon

---

## Animation Timing Reference

For implementation in the game engine:

| Size | Frames | Suggested Duration | Frame Rate |
|------|--------|-------------------|------------|
| Small | 8 | 400ms | 20 FPS |
| Medium | 10 | 500ms | 20 FPS |
| Large | 12 | 800ms | 15 FPS |

Note: Larger explosions feel more dramatic with slightly slower frame rates.

---

## Batch Generation Tips

1. **Generate in order of size**: Start with small, then medium, then large
2. **Maintain color consistency**: Same pink/cyan palette across all sizes
3. **Scale detail appropriately**: Small = simple shapes, Large = complex details
4. **Generate 3-5 variations** of each and select best animation flow
5. **Preview at game speed**: Test timing before finalizing
6. **Check all frames**: Ensure no duplicate or broken frames in sequence

## Color Coding Summary

| Explosion | Core | Secondary | Edge/Particles | Smoke |
|-----------|------|-----------|----------------|-------|
| Small | Pink/Magenta | - | Cyan | - |
| Medium | Pink/Orange | Purple | Cyan | Purple |
| Large | White/Yellow → Pink | Magenta | Cyan | Deep Purple |

## Post-Processing Notes

### Frame Alignment
If generated frames are misaligned:
1. Use sprite sheet editor to ensure consistent grid
2. All frames must be same size with no gaps
3. First frame at x=0, subsequent frames at multiples of frame width

### Transparency Cleanup
1. Ensure no white fringing on anti-aliased edges
2. Glow effects should fade to full transparency
3. Test overlay on both dark and light backgrounds

### Sprite Sheet Verification
1. Load in sprite sheet preview tool
2. Play animation at target frame rate
3. Check for smooth transitions between frames
4. Verify loop point if explosion will loop (typically won't)

## Integration

After generation, place files in `assets/images/effects/`:

```json
{
  "effects": {
    "explosion-small": { 
      "path": "images/effects/explosion-small.png", 
      "frameWidth": 32, 
      "frameHeight": 32,
      "frames": 8 
    },
    "explosion-medium": { 
      "path": "images/effects/explosion-medium.png", 
      "frameWidth": 64, 
      "frameHeight": 64,
      "frames": 10 
    },
    "explosion-large": { 
      "path": "images/effects/explosion-large.png", 
      "frameWidth": 128, 
      "frameHeight": 128,
      "frames": 12 
    }
  }
}
```

Test in-game rendering and animation playback before finalizing.
