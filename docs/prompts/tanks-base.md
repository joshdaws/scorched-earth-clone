# Tank Sprite Prompts - Player & Enemy

Prompts for generating base tank sprites for Scorched Earth: Synthwave Edition.

## Tool Recommendation

**Primary**: NanoBanana Pro
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
- Grid line overlays
- Geometric shapes
```

---

## Asset 1: Player Tank (tank-player.png)

### Specifications
- **Dimensions**: 64x32 pixels
- **Color Scheme**: Cyan/teal neon glow
- **Orientation**: Side view, facing right

### Prompt (NanoBanana Pro)

```
2D side-view military tank sprite, synthwave style, glowing neon cyan outline,
chrome metallic body with electric cyan and teal accents,
distinct turret cannon pointing right, visible treads/wheels,
simple geometric design, game asset, transparent background,
64x32 pixels, clean edges, pixel art style
```

### Prompt (Leonardo.ai Alternative)

```
Game sprite of a futuristic tank, side profile facing right, synthwave aesthetic,
neon cyan glow (#00FFFF) outlining chrome metallic body,
teal and electric blue color palette, visible turret and treads,
minimalist geometric design, transparent PNG background,
64 pixels wide by 32 pixels tall, crisp clean edges
```

### Key Elements to Verify
- [ ] Turret is visible and distinct from body
- [ ] Treads/wheels are visible
- [ ] Side view, facing right
- [ ] Transparent background
- [ ] Neon glow effect present
- [ ] Dimensions match 64x32

---

## Asset 2: Enemy Tank (tank-enemy.png)

### Specifications
- **Dimensions**: 64x32 pixels
- **Color Scheme**: Pink/magenta neon glow
- **Orientation**: Side view, facing right

### Prompt (NanoBanana Pro)

```
2D side-view military tank sprite, synthwave style, glowing neon pink outline,
chrome metallic body with hot pink and magenta accents,
distinct turret cannon pointing right, visible treads/wheels,
simple geometric design, game asset, transparent background,
64x32 pixels, clean edges, pixel art style
```

### Prompt (Leonardo.ai Alternative)

```
Game sprite of a futuristic tank, side profile facing right, synthwave aesthetic,
neon magenta glow (#FF00FF) outlining chrome metallic body,
hot pink and purple color palette, visible turret and treads,
minimalist geometric design, transparent PNG background,
64 pixels wide by 32 pixels tall, crisp clean edges
```

### Key Elements to Verify
- [ ] Turret is visible and distinct from body
- [ ] Treads/wheels are visible
- [ ] Side view, facing right
- [ ] Transparent background
- [ ] Neon glow effect present
- [ ] Dimensions match 64x32

---

## Batch Generation Tips

1. **Generate both tanks in same session** for style consistency
2. **Use same seed** (if available) for silhouette consistency
3. **Generate 3-5 variations** and select best match
4. **Compare side-by-side** before finalizing to ensure enemy/player are visually distinct but stylistically unified

## Post-Processing Notes

If transparency needs cleanup:
1. Use remove.bg or Leonardo.ai transparent PNG tool
2. Ensure anti-aliased edges don't have white fringing
3. Verify glow effect doesn't get cut off

## Integration

After generation:
1. Place files in `assets/images/tanks/`
2. Verify dimensions in `assets/manifest.json`:
```json
{
  "tanks": {
    "player": { "path": "images/tanks/tank-player.png", "width": 64, "height": 32 },
    "enemy": { "path": "images/tanks/tank-enemy.png", "width": 64, "height": 32 }
  }
}
```
3. Test in-game rendering
