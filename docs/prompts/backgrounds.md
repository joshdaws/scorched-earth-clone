# Background Layer Prompts - Sky, Mountains, Grid

Prompts for generating background layers for Scorched Earth: Synthwave Edition.

## Tool Recommendation

**Primary**: Midjourney (excellent for atmospheric scenes and gradients)
**Alternative**: Leonardo.ai (good gradient support, reliable transparency)

Note: Background layers benefit from higher resolution generation tools due to their large dimensions. NanoBanana is less suited for these assets.

## Style Consistency Reference

```
Primary colors:
- Deep Purple: #1a0033 (sky top)
- Neon Pink: #FF00FF
- Hot Orange: #FF6600
- Sunset Yellow: #FFD700
- Electric Cyan: #00FFFF
- Grid Dark: #0a0015

Common elements:
- Smooth gradients (no banding)
- Neon glow effects
- Retro-futuristic aesthetic
- Tron/Outrun visual style
```

## Design Notes

Background layers form a layered parallax system:
1. **Sky** (back layer): Static gradient with optional celestial elements
2. **Mountains** (middle layer): Silhouettes with transparency, slight parallax
3. **Grid** (front layer): Perspective lines over terrain, creates depth

### Layering Order (back to front)
```
[ Sky Gradient ] → [ Mountain Silhouettes ] → [ Terrain ] → [ Grid Overlay ]
```

---

## Asset 1: Sky Background (bg-sky.png)

### Specifications
- **Dimensions**: 1920x1080 pixels
- **Format**: Full color, no transparency needed
- **Visual**: Classic synthwave sunset gradient with optional elements

### Color Gradient (top to bottom)
1. **Top**: Deep purple/black (#1a0033 to #0a0015)
2. **Upper middle**: Purple (#4a0080)
3. **Middle**: Pink/magenta (#FF00FF blend)
4. **Lower middle**: Orange (#FF6600)
5. **Horizon**: Yellow/gold (#FFD700)

### Prompt (Midjourney)

```
Synthwave sunset sky background, horizontal panorama format,
gradient from deep dark purple at top through magenta pink to bright orange and yellow at horizon,
faint stars in upper portion, subtle horizontal cloud wisps,
neon glow at horizon line, retro 80s aesthetic,
smooth gradient transitions no banding,
1920x1080 pixels, 16:9 aspect ratio,
Outrun style, vaporwave colors, atmospheric
--ar 16:9 --stylize 250
```

### Prompt (Leonardo.ai Alternative)

```
Synthwave sunset sky wallpaper, horizontal format,
dark purple (#1a0033) at top transitioning through
magenta pink (#FF00FF) to orange (#FF6600) to yellow (#FFD700) at horizon,
scattered stars in dark upper area,
subtle neon glow effect at horizon,
smooth color gradients, retro 80s synthwave style,
1920 pixels wide by 1080 pixels tall,
Outrun aesthetic, vaporwave atmosphere
```

### Optional Elements to Request
- **Sun/moon**: Large setting sun at horizon (classic synthwave)
- **Stars**: Scattered points in upper dark portion
- **Clouds**: Horizontal wispy clouds catching gradient colors
- **Light streaks**: Horizontal neon lines near horizon

### Key Elements to Verify
- [ ] Smooth gradient (no color banding)
- [ ] Dark at top, bright at horizon
- [ ] Purple → Pink → Orange → Yellow progression
- [ ] Dimensions match 1920x1080
- [ ] Horizontal/landscape orientation
- [ ] Synthwave aesthetic present

---

## Asset 2: Mountain Silhouettes (bg-mountains.png)

### Specifications
- **Dimensions**: 1920x400 pixels
- **Format**: PNG with transparency (transparent above mountains)
- **Visual**: Layered mountain silhouettes for parallax effect

### Prompt (Midjourney)

```
Silhouette mountain range, synthwave style,
multiple layers of dark purple and black mountains,
deepest black mountains in front, lighter purple behind,
jagged peaks against transparent sky,
2-3 visible mountain layers creating depth,
no sky background only mountain silhouettes,
transparent background above mountains,
1920x400 pixels wide panoramic strip,
retrowave aesthetic, geometric mountain shapes
--ar 48:10 --stylize 100
```

### Prompt (Leonardo.ai Alternative)

```
Mountain silhouette layers, synthwave aesthetic,
dark purple (#2a0050) and black (#0a0015) mountain ranges,
2-3 overlapping mountain layers with depth,
front layer darkest black, back layers lighter purple,
jagged angular peaks, geometric shapes,
TRANSPARENT BACKGROUND above mountains,
only mountain silhouettes visible,
1920 pixels wide by 400 pixels tall,
PNG with alpha channel, retrowave style
```

### Layer Depth Colors
- **Back layer**: Dark purple (#2a0050) - furthest, lightest
- **Middle layer**: Deep purple (#1a0030)
- **Front layer**: Near black (#0a0015) - closest, darkest

### Key Elements to Verify
- [ ] Multiple overlapping mountain layers (2-3)
- [ ] Transparent area above mountains (PNG alpha)
- [ ] Mountains only in lower portion of image
- [ ] Dark silhouettes with subtle color variation
- [ ] Jagged peaks, not rounded
- [ ] Dimensions match 1920x400
- [ ] Works when overlaid on sky background

---

## Asset 3: Perspective Grid (bg-grid.png)

### Specifications
- **Dimensions**: 1920x1080 pixels
- **Format**: PNG with transparency (lines on transparent)
- **Visual**: Perspective grid converging at horizon, Tron/Outrun style

### Prompt (Midjourney)

```
Synthwave perspective grid, Tron Outrun style,
neon cyan grid lines on transparent background,
horizontal and vertical lines converging at center horizon,
perspective depth effect, evenly spaced grid squares,
grid fills lower two-thirds of image,
lines thin and clean with subtle glow,
vanishing point at center horizon,
1920x1080 pixels, 16:9 aspect ratio,
transparent background, PNG with alpha
--ar 16:9 --stylize 100
```

### Prompt (Leonardo.ai Alternative)

```
Perspective grid overlay, synthwave aesthetic,
neon cyan (#00FFFF) grid lines on TRANSPARENT background,
horizontal lines running left to right,
vertical lines converging at central vanishing point,
Tron-style perspective grid pattern,
grid denser near horizon vanishing point,
lines have subtle neon glow effect,
transparent PNG background,
1920 pixels wide by 1080 pixels tall,
Outrun retro-futuristic style
```

### Alternative Color Schemes
- **Pink grid**: Magenta (#FF00FF) lines instead of cyan
- **Dual color**: Cyan horizontals, pink verticals
- **Fading**: Lines fade in intensity toward horizon

### Grid Layout Notes
```
        Horizon line / vanishing point
               ___________
              /     |     \
             /      |      \
            /   |   |   |   \
           /____|___|___|____\
          /     |   |   |     \
         /______|___|___|______\
        
        Grid squares larger in foreground
        Converge toward center horizon
```

### Key Elements to Verify
- [ ] Perspective converging at horizon/center
- [ ] Transparent background (PNG alpha)
- [ ] Clean grid lines with subtle glow
- [ ] Grid denser near vanishing point
- [ ] Lines thin enough to not obscure gameplay
- [ ] Cyan neon color (or specified alternative)
- [ ] Dimensions match 1920x1080

---

## Layering Integration Guide

### How Layers Combine

```
Background Rendering Order:
1. Render bg-sky.png as base (full canvas)
2. Overlay bg-mountains.png (positioned at bottom)
3. Render terrain (gameplay element)
4. Overlay bg-grid.png with low opacity (10-20%)
```

### Parallax Settings (suggested)
- **Sky**: Static (0% parallax)
- **Mountains**: 10-20% parallax (slow movement)
- **Terrain**: 100% (gameplay layer)
- **Grid**: Optional slight parallax or static

### Transparency Notes

**bg-mountains.png**: Must have transparent upper portion
- Export as PNG-24 with alpha channel
- Verify transparency in image editor before integration
- Black edges should be anti-aliased against transparency

**bg-grid.png**: Must be fully transparent except lines
- Export as PNG-24 with alpha channel
- Grid lines should have semi-transparent glow
- Test overlay at 10-20% opacity on sky+mountains

---

## Batch Generation Tips

1. **Generate sky first** to establish color palette
2. **Use sky colors** to inform mountain silhouette shading
3. **Match grid color** to complement sky gradient (cyan works with purple/pink)
4. **Test layers together** before finalizing any asset
5. **Generate multiple variations** of each layer for options

## Color Palette Summary

| Layer | Primary Colors | Notes |
|-------|---------------|-------|
| Sky | Purple → Pink → Orange → Yellow | Gradient top to bottom |
| Mountains | Black, Dark Purple | Silhouettes, multiple layers |
| Grid | Cyan (or Pink) | Thin neon lines with glow |

## Post-Processing Notes

### Sky
- Remove any banding in gradients (use dithering if needed)
- Ensure smooth transitions between color zones
- Optional: Add subtle noise for texture

### Mountains
- Clean up any color fringing at edges
- Ensure transparent areas are fully transparent
- Add anti-aliasing to silhouette edges if jagged

### Grid
- Ensure lines are consistently thin
- Glow should not create solid areas
- Test at different opacity levels (10%, 15%, 20%)

## Integration

After generation, place files in `assets/images/backgrounds/`:

```json
{
  "backgrounds": {
    "sky": { 
      "path": "images/backgrounds/bg-sky.png", 
      "width": 1920, 
      "height": 1080,
      "parallax": 0
    },
    "mountains": { 
      "path": "images/backgrounds/bg-mountains.png", 
      "width": 1920, 
      "height": 400,
      "parallax": 0.15
    },
    "grid": { 
      "path": "images/backgrounds/bg-grid.png", 
      "width": 1920, 
      "height": 1080,
      "opacity": 0.15
    }
  }
}
```

Test all layers together in-game before finalizing.
