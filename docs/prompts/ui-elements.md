# UI Element Prompts - Buttons, Bars, Indicators

Prompts for generating UI elements for Scorched Earth: Synthwave Edition HUD.

## Tool Recommendation

**Primary**: Leonardo.ai (excellent transparency control, clean edges)
**Alternative**: NanoBanana Pro

## Style Consistency Reference

```
Primary colors:
- Neon Pink: #FF00FF (primary accent)
- Electric Cyan: #00FFFF (secondary accent)
- Dark Fill: #0a0015 (semi-transparent)
- Border Glow: 2-4px blur

Common elements:
- Chrome/metallic accents
- Neon glow borders
- Dark semi-transparent fill
- Rounded or beveled corners
- Consistent border thickness
```

## Design Notes

UI elements must:
- **Consistent style**: Same border treatment across all elements
- **Readable overlays**: Work on any background (terrain, sky)
- **Semi-transparent**: Allow background visibility
- **Neon edges**: Glowing borders for synthwave aesthetic
- **Clean geometry**: Precise shapes for functional UI

### UI Element Principles

1. **Dark fill with transparency**: 80-90% opacity dark background
2. **Neon border**: 2px border with 3-4px glow
3. **Corner treatment**: Rounded (10px radius) or beveled
4. **Glow color**: Pink primary, cyan for interactive states
5. **No text in assets**: Text rendered separately by game engine

---

## Asset 1: Generic Button (ui-button.png)

### Specifications
- **Dimensions**: 120x40 pixels
- **Color Scheme**: Pink neon border, dark fill
- **Visual**: Rounded rectangle button frame

### Prompt (Leonardo.ai)

```
Game UI button frame, synthwave style,
rounded rectangle 120x40 pixels,
dark semi-transparent fill (#0a0015 at 85% opacity),
neon pink (#FF00FF) glowing border 2px thick,
subtle inner bevel or highlight on top edge,
soft glow effect around border 3-4px blur,
no text just empty button frame,
transparent PNG background,
futuristic retro gaming aesthetic
```

### Prompt (NanoBanana Pro Alternative)

```
2D game UI button, synthwave neon style,
rounded rectangle button frame, empty no text,
dark purple semi-transparent fill,
glowing pink neon border with glow effect,
soft inner highlight, futuristic gaming button,
game asset, transparent background,
120x40 pixels, clean crisp edges
```

### Button States to Consider
Generate variants for:
- **Default**: Pink border glow
- **Hover/Active**: Cyan border glow (brighter)
- **Disabled**: Dimmed pink (50% opacity)

### Key Elements to Verify
- [ ] Rounded rectangle shape
- [ ] Dark semi-transparent fill (not opaque black)
- [ ] Pink neon border with glow
- [ ] No text content
- [ ] Transparent outer background
- [ ] Dimensions match 120x40
- [ ] Clean anti-aliased edges

---

## Asset 2: Power Meter Frame (ui-power-bar.png)

### Specifications
- **Dimensions**: 200x20 pixels
- **Color Scheme**: Pink border, dark fill, with meter marking area
- **Visual**: Horizontal bar frame for power level display

### Prompt (Leonardo.ai)

```
Game UI power meter frame, synthwave style,
horizontal bar 200x20 pixels,
dark semi-transparent fill (#0a0015 at 85% opacity),
neon pink (#FF00FF) glowing border 2px thick,
rectangular shape with slight rounded corners,
subtle tick marks or segment lines inside,
space for meter fill overlay,
soft glow effect around border,
no text just empty meter frame,
transparent PNG background,
futuristic retro gaming aesthetic
```

### Prompt (NanoBanana Pro Alternative)

```
2D game UI power bar frame, synthwave neon style,
horizontal meter rectangle, empty for fill overlay,
dark purple semi-transparent background,
glowing pink neon border with glow effect,
subtle inner tick marks or segments,
futuristic gaming health/power bar design,
game asset, transparent background,
200x20 pixels, clean crisp edges
```

### Meter Fill Considerations
The game will render the fill separately. Frame should:
- Have subtle inner edge for fill boundary
- Optional: vertical tick marks at 25%, 50%, 75%
- Leave inner area clearly defined for fill color

### Key Elements to Verify
- [ ] Horizontal rectangular shape
- [ ] Dark semi-transparent fill
- [ ] Pink neon border with glow
- [ ] No fill content (frame only)
- [ ] Clear inner area for meter fill
- [ ] Transparent outer background
- [ ] Dimensions match 200x20
- [ ] Slight rounded corners

---

## Asset 3: Angle Indicator (ui-angle-indicator.png)

### Specifications
- **Dimensions**: 60x60 pixels
- **Color Scheme**: Cyan neon arc, dark background
- **Visual**: Semicircular arc gauge for angle display

### Prompt (Leonardo.ai)

```
Game UI angle indicator gauge, synthwave style,
semicircular arc display 60x60 pixels,
dark semi-transparent circular background,
neon cyan (#00FFFF) glowing arc border,
180-degree arc (half circle) facing upward,
subtle tick marks at key angles (0, 45, 90, 135, 180),
center point for indicator needle attachment,
soft glow effect on arc border,
no text just arc gauge frame,
transparent PNG background,
futuristic retro gaming aesthetic
```

### Prompt (NanoBanana Pro Alternative)

```
2D game UI angle gauge, synthwave neon style,
semicircular arc indicator, 180 degrees,
dark purple semi-transparent circular background,
glowing cyan neon arc border with glow effect,
subtle tick marks along arc edge,
futuristic gaming angle measurement display,
game asset, transparent background,
60x60 pixels, clean crisp edges
```

### Angle Display Notes
- Arc should span 180 degrees (horizontal left to right via top)
- Game renders the angle indicator needle separately
- Tick marks help user read angle values
- Center pivot point should be clearly defined

### Key Elements to Verify
- [ ] Semicircular arc shape (180 degrees)
- [ ] Dark semi-transparent background
- [ ] Cyan neon arc border with glow
- [ ] Tick marks at key angles
- [ ] Clear center point for needle
- [ ] No needle content (frame only)
- [ ] Transparent outer background
- [ ] Dimensions match 60x60

---

## UI Element Consistency Guide

### Border Standards

All UI elements should share:
- **Border thickness**: 2px
- **Glow blur**: 3-4px
- **Corner radius**: 5-10px (where applicable)
- **Fill opacity**: 80-90%

### Color Assignments

| Element | Border Color | Fill Color | Use Case |
|---------|--------------|------------|----------|
| Button | Pink #FF00FF | Dark #0a0015 | Clickable actions |
| Power Bar | Pink #FF00FF | Dark #0a0015 | Meter frames |
| Angle Gauge | Cyan #00FFFF | Dark #0a0015 | Measurement displays |

Note: Cyan used for angle indicator to differentiate from action buttons.

### Interactive States

For buttons requiring state variations:
```
Default:   Pink border, 100% opacity
Hover:     Cyan border, 100% opacity, brighter glow
Active:    Cyan border, slight inner glow
Disabled:  Pink border, 50% opacity, no glow
```

---

## Batch Generation Tips

1. **Generate all elements in same session** for consistent style
2. **Use identical border settings** across all elements
3. **Test transparency** on various backgrounds
4. **Generate state variants** for interactive elements
5. **Verify clean anti-aliasing** at actual display size

## Post-Processing Notes

### Transparency Verification
1. Check fill is semi-transparent (not opaque)
2. Verify outer background is fully transparent
3. Test overlay on light and dark backgrounds
4. Ensure glow doesn't create solid areas

### Edge Cleanup
1. Anti-alias edges should be smooth
2. No color fringing on borders
3. Glow should fade to full transparency
4. Border should be consistently thick

### Size Verification
1. Confirm exact pixel dimensions
2. Check elements are centered in canvas
3. Verify no content is cropped at edges

## Integration

After generation, place files in `assets/images/ui/`:

```json
{
  "ui": {
    "button": { 
      "path": "images/ui/ui-button.png", 
      "width": 120, 
      "height": 40,
      "nineSlice": { "left": 10, "right": 10, "top": 10, "bottom": 10 }
    },
    "powerBar": { 
      "path": "images/ui/ui-power-bar.png", 
      "width": 200, 
      "height": 20 
    },
    "angleIndicator": { 
      "path": "images/ui/ui-angle-indicator.png", 
      "width": 60, 
      "height": 60 
    }
  }
}
```

Note: Button may benefit from 9-slice scaling for different sizes.

Test in-game HUD rendering with actual content before finalizing.
