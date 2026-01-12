# AI Asset Generation for Scorched Earth: Synthwave Edition

Research documentation on AI image generation tools and workflows for creating 2D game assets with a synthwave aesthetic.

## Tool Comparison Matrix

| Tool | Style Consistency | Sprite Sheets | Transparency | Size Control | Speed | Cost | Best For |
|------|-------------------|---------------|--------------|--------------|-------|------|----------|
| **NanoBanana Pro** | Excellent | Native | Native alpha | Yes | Fast (30 sprites/60s) | Free tier + paid | Sprites, animations |
| **DALL-E 3 (ChatGPT)** | Good | Manual | Post-process | Limited | Medium | $20/mo (Plus) | Concept art, single assets |
| **Midjourney** | Excellent | Manual | Post-process | Aspect ratio only | Fast | $10-30/mo | Backgrounds, concept art |
| **Stable Diffusion** | Customizable | With LoRAs | Post-process | Full control | Varies | Free (local) | Maximum customization |
| **Leonardo.ai** | Very good | Good | Native | Good | Fast | Free tier + paid | All-rounder, UI elements |

## Recommended Primary Tool: NanoBanana Pro

For Scorched Earth's game assets, **NanoBanana Pro** is the recommended primary tool for these reasons:

### Why NanoBanana Pro

1. **Native Sprite Sheet Generation**: Can generate complete animation frames (30+ sprites in 60 seconds)
2. **Game-Ready Output**: Exports clean PNGs for Unity, Godot, and other engines
3. **Consistency**: Maintains style across a set of assets using "engineering mindset" prompting
4. **Speed**: Production-ready results quickly, ideal for rapid iteration
5. **Transparency Support**: Native alpha channel output without post-processing
6. **Royalty-Free**: All generated images are royalty-free for commercial use

### Secondary Tools

- **Leonardo.ai**: For UI elements and backgrounds (excellent transparency support)
- **Midjourney V4**: For concept art and style exploration (best pixel art in V4)
- **Stable Diffusion + LoRAs**: For highly customized assets when fine control is needed

## Prompting Best Practices for Synthwave Style

### Core Synthwave Elements

Include these elements in your prompts:

- **Color palette**: neon pink, electric blue, purple, cyan, hot magenta
- **Lighting**: neon glow, light bloom, rim lighting, gradient sunsets
- **Visual motifs**: grid lines, geometric shapes, chrome/metallic surfaces
- **Environment**: palm trees, retro-futuristic cities, sunset horizons
- **Effects**: CRT scan lines, light trails, laser beams, holographic elements

### Prompt Structure Template

```
[Asset type] in synthwave style, [specific details],
neon colors (pink, blue, purple, cyan),
[background specification],
[technical requirements: resolution, format]
```

### Example Prompts for Scorched Earth Assets

#### Tank Sprites
```
2D side-view tank sprite, synthwave style, glowing neon cyan outline,
chrome metallic body with purple and pink accents,
simple geometric design, game asset, transparent background,
64x32 pixels, clean edges
```

#### Explosion Effects
```
Sprite sheet of explosion animation, 8 frames, synthwave style,
neon pink and orange burst with electric blue sparks,
circular expanding effect, transparent background,
each frame 64x64 pixels, clean pixel edges
```

#### Terrain Textures
```
Tileable ground texture, synthwave desert style,
dark purple sand with neon grid lines overlay,
subtle geometric patterns, game texture,
seamless tile, 128x128 pixels
```

#### Background Layers
```
Synthwave sunset gradient background,
hot pink to deep purple to dark blue,
low sun with horizontal light streaks,
distant city silhouette with neon lights,
1200x800 pixels, layered for parallax
```

#### UI Elements
```
Game UI button, synthwave style,
chrome frame with neon pink glow,
rounded rectangle, futuristic design,
transparent background, 120x40 pixels
```

### Prompting Tips

1. **Be specific about dimensions**: Always specify exact pixel dimensions
2. **Request transparent backgrounds**: Essential for game sprites
3. **Describe the style twice**: Once as "synthwave" and once with specific colors/effects
4. **Use game-specific terms**: "sprite", "game asset", "tileable", "sprite sheet"
5. **Limit complexity**: Simpler descriptions often yield cleaner results
6. **Include frame counts**: For animations, specify exact number of frames

### What to Avoid in Prompts

- Overly complex descriptions (AI generates muddled results)
- Realistic style references (conflicts with stylized synthwave)
- Too many elements in one prompt
- Vague size requirements

## Workflow: From Generation to Game-Ready Asset

### Step 1: Plan Your Assets

Before generating, define:
- Exact dimensions needed (match manifest.json specs)
- Color palette consistency (document specific hex codes)
- Animation frame counts

### Step 2: Generate Base Assets

1. Start with NanoBanana Pro for sprites and animations
2. Generate multiple variations (3-5 per asset type)
3. Use batch generation for consistency

### Step 3: Post-Processing (if needed)

For tools without native transparency:

1. **Background Removal**: Use Leonardo.ai's transparent PNG generator or remove.bg
2. **Edge Cleanup**: Ensure anti-aliased edges are clean
3. **Color Correction**: Match synthwave palette if colors drifted

### Step 4: Sprite Sheet Assembly

If not generated as sheets:
1. Use ImageSplitter.ai or similar to combine frames
2. Ensure consistent spacing between frames
3. Export as single PNG with proper grid alignment

### Step 5: Integration

1. Place files in `assets/images/` following naming conventions
2. Update `assets/manifest.json` with dimensions
3. Test in-game rendering

## Asset-Specific Recommendations

### Tanks (tank-player.png, tank-enemy.png)
- **Tool**: NanoBanana Pro
- **Style**: Chrome body, neon accents, simple geometric shapes
- **Dimensions**: 64x32 pixels
- **Tip**: Generate both at once with same style prompt for consistency

### Projectiles (shot-*.png)
- **Tool**: NanoBanana Pro or Leonardo.ai
- **Style**: Glowing orbs/shapes, bright neon colors
- **Dimensions**: 8-16 pixels
- **Tip**: Small assets need simpler designs; use solid colors with glow

### Explosions (explosion-*.png)
- **Tool**: NanoBanana Pro (best for sprite sheets)
- **Style**: Pink/orange/cyan bursts, particle effects
- **Frames**: 8-12 frames per explosion type
- **Tip**: Generate as sprite sheet, ensure consistent frame sizing

### Backgrounds (bg-*.png)
- **Tool**: Midjourney or Leonardo.ai
- **Style**: Gradient skies, neon cityscapes, grid horizons
- **Dimensions**: 1200x800 or larger for parallax layers
- **Tip**: Generate in layers (sky, city, grid) for parallax effect

### UI Elements (ui-*.png)
- **Tool**: Leonardo.ai (best transparency control)
- **Style**: Chrome frames, neon glows, clean edges
- **Tip**: Maintain consistent glow/shadow treatment across all UI

### Terrain Textures
- **Tool**: Stable Diffusion with tileable LoRA
- **Style**: Dark ground with subtle grid/pattern overlay
- **Tip**: Test tileability before finalizing

## Maintaining Style Consistency

### Create a Style Reference Document

Document these specifics for all prompts:
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
- Geometric shapes (triangles, hexagons)
```

### Use Reference Images

When available, include style reference images:
- Original synthwave artwork as inspiration
- Previously generated assets for consistency

### Batch Generation

Generate related assets in single sessions:
- All tank variants at once
- All projectile types together
- All UI elements in one batch

## Cost Considerations

### Free Options
- **NanoBanana**: Free tier available (limited generations)
- **Stable Diffusion**: Free if running locally
- **Leonardo.ai**: Free tier with daily credits

### Paid Tiers (Monthly)
- **ChatGPT Plus**: $20/mo (DALL-E 3 access)
- **Midjourney**: $10-30/mo depending on plan
- **Leonardo.ai Pro**: ~$12-48/mo
- **NanoBanana Pro**: Check current pricing

### Budget Recommendation

For this project:
1. Start with free tiers of NanoBanana and Leonardo.ai
2. Use Midjourney basic for concept exploration if needed
3. Only upgrade if free limits are consistently exceeded

## Future Capabilities (2026 Roadmap)

Based on current announcements:
- **NanoBanana**: Video generation coming in 2026
- **3D Asset Generation**: Direct 3D model generation from 2D concepts
- **Animation Sequence AI**: Automatic character action frame generation
- **Real-Time Collaborative Generation**: Multi-team member workflows

## References

- [NanoBanana Game Assets Guide](https://help.apiyi.com/nano-banana-pro-game-assets-generation-en.html)
- [Leonardo.ai Game Asset Suite](https://leonardo.ai/news/how-to-generate-a-full-game-asset-suite-with-leonardo-ai/)
- [Synthwave Style in Midjourney](https://midlibrary.io/styles/synthwave)
- [Stable Diffusion Pixel Art LoRAs](https://civitai.com/models/165876/2d-pixel-toolkit-2d)
- [AI Pixel Art Generator 2025](https://www.aiarty.com/ai-image-generator/ai-pixel-art-generator.htm)
- [Synthwave Prompting Deep Dive](https://medium.com/design-bootcamp/deep-dive-how-to-use-neon-and-synthwave-style-in-generative-ai-art-4add09991908)
- [Leonardo.ai Transparent PNG Generator](https://leonardo.ai/transparent-png-generator/)
