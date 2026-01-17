# Claude Skill for Automated Asset Generation via NanoBanana

Research documentation for creating a Claude skill that automates production-quality game asset generation using NanoBanana Pro API.

**Research Date:** January 12, 2026
**Status:** Feasibility Confirmed - Full automation possible
**Priority:** P0

---

## Executive Summary

**Key Finding:** Full automation of asset generation is achievable using NanoBanana Pro (Gemini API).

- ✅ **API Available:** Gemini API provides programmatic access via REST endpoints
- ✅ **Transparent Backgrounds:** Supported via prompt engineering
- ✅ **Post-Processing:** Mature CLI toolchain available (ImageMagick, rembg)
- ✅ **Integration Path:** Can integrate with existing asset manifest system
- ⚠️ **Sprite Sheets:** Not natively supported - requires post-processing assembly
- ⚠️ **Cost:** No free tier - requires billing enabled ($0.134-$0.24 per image)

**Recommended Approach:** Build skill with three-phase pipeline:
1. **Generation:** NanoBanana Pro API with optimized prompts
2. **Post-Processing:** ImageMagick for assembly, rembg for cleanup
3. **Integration:** Automatic placement and manifest updates

---

## 1. NanoBanana API Specification

### Overview

NanoBanana is powered by Google's Gemini models (Gemini 2.5 Flash and Gemini 3 Pro). The API provides programmatic image generation with extensive customization options.

### API Endpoints

**Base URL:** `https://generativelanguage.googleapis.com/v1beta/models/`

**Available Models:**
- `gemini-2.5-flash-image:generateContent` - Fast, 1024px fixed resolution
- `gemini-3-pro-image-preview:generateContent` - High quality, 1K/2K/4K support

### Authentication

**Method:** API Key via HTTP header
**Header:** `x-goog-api-key: YOUR_API_KEY`
**Key Source:** https://aistudio.google.com/apikey

### Request Format

```json
POST /{model}:generateContent
{
  "contents": [
    {
      "parts": [
        { "text": "your prompt here" }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {
      "aspectRatio": "1:1",
      "imageSize": "2K"
    }
  }
}
```

### Generation Parameters

| Parameter | Options | Notes |
|-----------|---------|-------|
| **aspectRatio** | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 | Choose based on asset type |
| **imageSize** | "1K", "2K", "4K" | Gemini 3 Pro only, uppercase K required |
| **responseModalities** | ["TEXT", "IMAGE"], ["IMAGE"] | Include TEXT for reasoning |
| **thinking** | `{include_thoughts: true}` | Shows model reasoning (optional) |
| **tools** | `[{"google_search": {}}]` | Real-time search grounding |

### Response Format

```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "inline_data": {
          "mime_type": "image/png",
          "data": "base64_encoded_image_data"
        }
      }]
    }
  }]
}
```

### Transparent Background Support

**Method:** Explicit prompt instructions
**Examples:**
- "The background must be transparent"
- "transparent background, PNG with alpha channel"
- "isolated subject on transparent background"

**Note:** Gemini models understand transparency requests but success depends on prompt clarity.

### Rate Limits & Pricing

**Cost per Image:**
- Standard (1K-2K): $0.134 per image
- High-resolution (4K): $0.24 per image
- Batch API: 50% discount (24-hour turnaround)

**Rate Limits:** See https://ai.google.dev/gemini-api/docs/rate-limits

**Free Tier:** None - requires billing enabled on Google Cloud project

### Sprite Sheet Generation

**Native Support:** ❌ No built-in sprite sheet generation

**Workaround:** Generate individual frames and assemble using ImageMagick:
```bash
magick montage -tile 8x4 -geometry +0+0 -background transparent frame*.png spritesheet.png
```

### Code Example (Python)

```python
from google import genai
from google.genai import types
import base64

client = genai.Client(api_key="YOUR_API_KEY")

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="2D tank sprite, synthwave style, neon cyan outline, transparent background",
    config=types.GenerateContentConfig(
        response_modalities=['IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="2:1",
            image_size="2K"
        )
    )
)

# Extract and save image
for part in response.parts:
    if image := part.as_image():
        image.save("tank.png")
```

**Requirements:**
- Python 3.11+
- `google-genai` SDK 1.52.0+

### API Documentation Sources

- [Official Gemini API Docs](https://ai.google.dev/gemini-api/docs/nanobanana)
- [Complete Developer Tutorial](https://dev.to/googleai/introducing-nano-banana-pro-complete-developer-tutorial-5fc8)
- [AI/ML API Reference](https://docs.aimlapi.com/api-references/image-models/google/gemini-3-pro-image-preview)

---

## 2. Prompt Template Library

Building on existing research from `docs/research/ai-asset-generation.md`, here are optimized prompt templates for each asset type.

### Template Structure

All prompts follow this structure:
```
[Asset Type] + [Style: Synthwave] + [Specific Details] + [Technical Requirements]
```

### Core Synthwave Prompt Elements

Include in every prompt:
- **Style anchor:** "synthwave style" or "retrowave aesthetic"
- **Color palette:** "neon pink, cyan, purple, hot magenta"
- **Lighting:** "neon glow", "light bloom", "rim lighting"
- **Background:** "transparent background, PNG with alpha channel"
- **Format:** "2D game asset", "sprite", "clean edges"

### Template: Tank Sprites

```
2D side-view tank sprite, synthwave style, {color_scheme} neon outline,
chrome metallic body with geometric design, {specific_features},
game asset with clean edges, transparent background, isolated subject,
aspect ratio 2:1, high detail
```

**Variables:**
- `{color_scheme}`: cyan, magenta, purple, etc.
- `{specific_features}`: turret angle, barrel length, track details

**Example (Player Tank):**
```
2D side-view tank sprite, synthwave style, cyan neon outline,
chrome metallic body with geometric design, prominent turret,
game asset with clean edges, transparent background, isolated subject,
aspect ratio 2:1, high detail
```

**Example (Enemy Tank):**
```
2D side-view tank sprite, synthwave style, hot pink neon outline,
dark metallic body with angular design, aggressive turret,
game asset with clean edges, transparent background, isolated subject,
aspect ratio 2:1, high detail
```

### Template: Projectile Sprites

```
2D {projectile_type} projectile sprite, synthwave style,
glowing {color} energy orb with {effect_type} trail,
simple geometric shape, bright neon glow effect,
transparent background, game sprite, square aspect ratio 1:1
```

**Variables:**
- `{projectile_type}`: missile, energy bolt, plasma ball
- `{color}`: cyan, magenta, yellow
- `{effect_type}`: particle, light, energy

**Example (Basic Shot):**
```
2D energy projectile sprite, synthwave style,
glowing cyan energy orb with particle trail,
simple spherical shape, bright neon glow effect,
transparent background, game sprite, square aspect ratio 1:1
```

**Example (MIRV Warhead):**
```
2D missile sprite, synthwave style,
glowing magenta warhead with yellow accents,
geometric cone shape with neon grid lines,
transparent background, game sprite, aspect ratio 3:1
```

### Template: Explosion Effects (Multi-Frame)

```
{frame_description} of explosion animation, synthwave style,
{color_scheme} burst with {particle_type} particles,
circular expanding effect, neon glow bloom,
transparent background, clean edges, square format
```

**Approach:** Generate each frame separately with descriptive prompts

**Frame 1 (Initial):**
```
Frame 1 initial impact of explosion, synthwave style,
small bright white core with pink/orange inner ring,
beginning expansion, transparent background, square format
```

**Frame 4 (Mid):**
```
Frame 4 mid explosion, synthwave style,
large pink and orange burst with cyan electric sparks,
circular expanding effect with particle trails,
transparent background, square format
```

**Frame 8 (Dissipating):**
```
Frame 8 dissipating explosion, synthwave style,
fading pink smoke with purple edges, sparse particles,
transparent background, square format
```

**Post-Processing:** Assemble frames into sprite sheet using ImageMagick

### Template: Background Layers

```
{layer_type} background layer, synthwave style,
{gradient_description}, {atmospheric_elements},
parallax-ready game background, {dimension_spec}
```

**Example (Sky Layer):**
```
Sky background layer, synthwave style,
gradient from hot pink top to deep purple to dark blue bottom,
horizontal sun streaks and subtle grid overlay,
parallax-ready game background, ultra-wide aspect ratio 21:9
```

**Example (City Silhouette):**
```
City skyline silhouette layer, synthwave style,
dark geometric buildings with scattered neon window lights,
distant perspective with atmospheric haze,
parallax-ready game background, ultra-wide aspect ratio 21:9
```

### Template: UI Elements

```
2D game UI {element_type}, synthwave style,
{material} frame with {color} neon glow border,
{shape_description}, futuristic clean design,
transparent background, aspect ratio {ratio}
```

**Example (Fire Button):**
```
2D game UI button, synthwave style,
chrome metallic frame with magenta neon glow border,
rounded rectangle with "FIRE" text in bold geometric font,
transparent background, aspect ratio 3:1
```

**Example (Power Meter):**
```
2D game UI power meter, synthwave style,
dark frame with cyan neon outline and grid pattern interior,
horizontal bar design with percentage markers,
transparent background, aspect ratio 4:1
```

### Template: Terrain Textures

```
Tileable {terrain_type} texture, synthwave style,
{base_description} with {pattern_overlay},
seamless repeating pattern, game terrain texture,
square format, high detail
```

**Example (Ground Texture):**
```
Tileable ground texture, synthwave style,
dark purple sand base with subtle neon cyan grid line overlay,
geometric pattern elements, seamless repeating pattern,
game terrain texture, square format, high detail
```

### Prompt Engineering Best Practices

1. **Be hyper-specific:** Avoid vague terms like "cool" or "nice"
2. **Front-load important details:** Put critical info in first 20 words
3. **Use positive framing:** Say "isolated subject" not "no background clutter"
4. **Leverage cinematic terms:** "side view", "top-down", "isometric"
5. **Request transparency explicitly:** Always include "transparent background"
6. **Specify aspect ratio:** Match intended use case
7. **Include "game asset" or "sprite":** Helps model understand context
8. **Iterate incrementally:** Start simple, add details based on results

### What to Avoid

- ❌ Overly complex descriptions (causes muddled results)
- ❌ Realistic style references (conflicts with synthwave)
- ❌ Multiple competing subjects in one prompt
- ❌ Vague size/dimension requirements
- ❌ Negations ("no shadows" - use "flat lighting" instead)

---

## 3. Post-Processing Toolchain

### Required Tools Overview

| Tool | Purpose | Installation | Cost |
|------|---------|--------------|------|
| **ImageMagick** | Image manipulation, sprite sheet assembly, resizing | `brew install imagemagick` (macOS) | Free |
| **rembg** | Background removal (local, no API) | `pip install rembg` | Free |
| **remove.bg CLI** | Background removal (API-based) | npm/binary download | $0.02/image after 50 free |

### ImageMagick

**Purpose:** Cropping, resizing, format conversion, sprite sheet assembly

#### Installation

```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
apt-get install imagemagick

# Verify
magick --version
```

#### Key Commands for Asset Pipeline

**Resize Image:**
```bash
magick input.png -resize 64x32 output.png
```

**Crop to Content (Auto-trim transparent borders):**
```bash
magick input.png -trim +repage output.png
```

**Convert Format:**
```bash
magick input.jpg -background transparent -flatten output.png
```

**Assemble Sprite Sheet:**
```bash
magick montage frame*.png -tile 8x4 -geometry +0+0 -background transparent spritesheet.png
```

**Add Padding Between Frames:**
```bash
magick montage frame*.png -tile 8x4 -geometry +2+2 -background transparent spritesheet.png
```

**Batch Process Directory:**
```bash
for img in *.png; do
  magick "$img" -trim +repage "trimmed_$img"
done
```

**Color Correction (adjust to synthwave palette):**
```bash
magick input.png -modulate 100,150,100 output.png  # Boost saturation
```

#### Useful Options

- `-background transparent`: Set background for operations
- `-trim`: Remove transparent borders
- `+repage`: Reset virtual canvas after trim
- `-geometry +X+Y`: Spacing between tiles (X horizontal, Y vertical)
- `-tile WxH`: Grid layout for montage (width x height)
- `-resize`: Resize with aspect ratio preservation

**Documentation:** [ImageMagick Command-Line Options](https://imagemagick.org/script/command-line-options.php)

### Background Removal Tools

#### Option 1: rembg (Local, Free, Open Source)

**Advantages:**
- ✅ No API costs
- ✅ No rate limits
- ✅ Runs locally (privacy)
- ✅ GPU acceleration support

**Installation:**
```bash
pip install rembg
```

**Usage:**
```bash
# Single image
rembg i input.png output.png

# Batch process directory
rembg p input_folder output_folder
```

**Python API:**
```python
from rembg import remove
from PIL import Image

input_img = Image.open('input.png')
output_img = remove(input_img)
output_img.save('output.png')
```

**Performance:** 5-10x faster with GPU (CUDA)

**GitHub:** [danielgatis/rembg](https://github.com/danielgatis/rembg)

#### Option 2: remove.bg CLI (API-Based)

**Advantages:**
- ✅ Higher quality removal
- ✅ Better for complex images
- ❌ Costs $0.02 per image (after 50 free/month)

**Installation:**
```bash
# Download from GitHub releases
# https://github.com/remove-bg/remove-bg-cli
```

**Usage:**
```bash
# Set API key
export REMOVE_BG_API_KEY="your_api_key"

# Single image
removebg --output-file output.png input.png

# Batch process
removebg --path input_folder --output-path output_folder
```

**API Key:** Get from https://www.remove.bg/users/sign_up

**Documentation:** [remove.bg API Docs](https://www.remove.bg/api)

### Recommended Workflow

**For simple sprites (tanks, projectiles):**
1. Generate with "transparent background" in prompt
2. Use ImageMagick `-trim` to remove excess borders
3. Resize to target dimensions

**For complex assets (characters, detailed vehicles):**
1. Generate image (transparency may be imperfect)
2. Use `rembg` for background removal
3. Use ImageMagick `-trim` and resize

**For sprite sheets:**
1. Generate individual frames
2. Remove backgrounds if needed (`rembg`)
3. Trim all frames to consistent size
4. Assemble with `magick montage`

---

## 4. Claude Skill Architecture

### Design Overview

**Skill Name:** `/generate-asset` (or `/asset`)

**Purpose:** Generate production-ready game assets from natural language descriptions, handling the full pipeline from prompt generation to file placement.

**Phases:**
1. **Prompt Engineering** - Convert user request to optimal NanoBanana prompt
2. **API Generation** - Call Gemini API with configured parameters
3. **Post-Processing** - Background removal, trimming, resizing, sprite sheet assembly
4. **Integration** - Place files in correct directories, update asset manifest

### Skill Invocation Syntax

```
/generate-asset <type> <description> [options]
```

**Arguments:**
- `<type>`: Asset category (tank, projectile, explosion, ui, background, terrain)
- `<description>`: Natural language description of desired asset
- `[options]`: Optional flags for customization

**Examples:**
```
/generate-asset tank enemy synthwave cyan glow
/generate-asset explosion large 12-frame
/generate-asset ui button "FIRE" 120x40
/generate-asset background sunset-gradient parallax-sky
/generate-asset projectile nuke glowing-yellow
```

### Detailed Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ USER INPUT                                                   │
│ "/generate-asset tank player cyan-glow aggressive-design"   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: PROMPT ENGINEERING                                 │
│ - Parse user description                                    │
│ - Select prompt template (tank)                             │
│ - Apply synthwave style guide                               │
│ - Add technical requirements (aspect ratio, transparency)   │
│ - Output: Optimized NanoBanana prompt                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: API GENERATION                                     │
│ - Initialize Gemini client                                  │
│ - Configure generation (model, size, aspect ratio)          │
│ - Call API with prompt                                      │
│ - Decode base64 response                                    │
│ - Save raw PNG                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: POST-PROCESSING                                    │
│ - Background removal (if needed)                            │
│ - Trim transparent borders                                  │
│ - Resize to target dimensions                               │
│ - Color correction (optional)                               │
│ - Sprite sheet assembly (if multi-frame)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: INTEGRATION                                        │
│ - Determine file path (Assets/Sprites/Tanks/...)           │
│ - Move file to correct location                            │
│ - Update Unity meta files (if needed)                       │
│ - Generate usage report                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT                                                       │
│ ✓ Generated: Assets/Sprites/Tanks/tank-player-cyan.png     │
│ ✓ Dimensions: 128x64 (2:1 aspect ratio)                    │
│ ✓ Cost: $0.134                                              │
│ ✓ Ready for Unity import                                    │
└─────────────────────────────────────────────────────────────┘
```

### Input Parsing

**Type Detection:**
```python
ASSET_TYPES = {
    'tank': {'template': 'tank', 'aspect': '2:1', 'size': '2K'},
    'projectile': {'template': 'projectile', 'aspect': '1:1', 'size': '1K'},
    'explosion': {'template': 'explosion', 'aspect': '1:1', 'size': '2K', 'frames': 8},
    'ui': {'template': 'ui', 'aspect': 'variable', 'size': '1K'},
    'background': {'template': 'background', 'aspect': '21:9', 'size': '4K'},
    'terrain': {'template': 'terrain', 'aspect': '1:1', 'size': '2K'}
}
```

**Description Parsing:**
Extract keywords:
- Colors: cyan, magenta, purple, yellow, orange
- Style: aggressive, sleek, geometric, angular
- Features: turret, barrel, treads, glow, particles
- Dimensions: 64x32, 120x40, etc.

### Prompt Generation

```python
def generate_prompt(asset_type, description, options):
    # Load template
    template = PROMPT_TEMPLATES[asset_type]

    # Extract variables from description
    vars = parse_description(description)

    # Fill template
    prompt = template.format(**vars)

    # Add synthwave style guide
    prompt += "\n" + SYNTHWAVE_STYLE_GUIDE

    # Add technical requirements
    prompt += f"\ntransparent background, {options['aspect_ratio']}"

    return prompt
```

### API Integration

```python
from google import genai
from google.genai import types
import os

def generate_image(prompt, config):
    client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=['IMAGE'],
            image_config=types.ImageConfig(
                aspect_ratio=config['aspect_ratio'],
                image_size=config['size']
            )
        )
    )

    # Extract image
    for part in response.parts:
        if image := part.as_image():
            return image

    raise Exception("No image in response")
```

### Post-Processing Pipeline

```python
import subprocess
from PIL import Image

def post_process_asset(image_path, target_dims=None):
    # 1. Background removal (if needed)
    subprocess.run(['rembg', 'i', image_path, 'temp_nobg.png'])

    # 2. Trim transparent borders
    subprocess.run([
        'magick', 'temp_nobg.png',
        '-trim', '+repage',
        'temp_trimmed.png'
    ])

    # 3. Resize to target dimensions
    if target_dims:
        subprocess.run([
            'magick', 'temp_trimmed.png',
            '-resize', target_dims,
            image_path
        ])

    # Cleanup temp files
    os.remove('temp_nobg.png')
    os.remove('temp_trimmed.png')
```

### Error Handling

**Generation Failures:**
- Retry with slightly modified prompt
- Fall back to lower resolution
- Offer manual prompt editing

**API Rate Limits:**
- Queue requests if limit reached
- Suggest Batch API for large jobs
- Display wait time estimate

**Post-Processing Errors:**
- Skip failing steps (e.g., background removal if already transparent)
- Validate file existence before each step
- Provide partial results with warnings

### Configuration

**Environment Variables:**
```bash
export GEMINI_API_KEY="your_key_here"
export ASSET_OUTPUT_DIR="./Assets/Sprites"
export DEFAULT_IMAGE_SIZE="2K"
export USE_BATCH_API=false
```

**Config File:** `~/.claude/asset-generation.json`
```json
{
  "api_key": "your_key_here",
  "output_dir": "./Assets/Sprites",
  "default_size": "2K",
  "default_model": "gemini-3-pro-image-preview",
  "post_processing": {
    "background_removal": "rembg",
    "auto_trim": true,
    "color_correction": false
  },
  "synthwave_palette": {
    "cyan": "#00FFFF",
    "magenta": "#FF00FF",
    "purple": "#8B00FF",
    "orange": "#FF6600"
  }
}
```

### Output Format

**Success Message:**
```
✓ Generated asset: tank-player-cyan.png
  - Location: Assets/Sprites/Tanks/tank-player-cyan.png
  - Dimensions: 128x64 (2:1 aspect ratio)
  - File size: 24.5 KB
  - Cost: $0.134
  - Transparency: ✓ Alpha channel preserved

Ready for Unity import.
```

**Failure Message:**
```
✗ Generation failed: API rate limit exceeded
  - Retry in: 45 seconds
  - Alternative: Use Batch API (slower but cheaper)
  - Command: /generate-asset tank player cyan-glow --batch
```

---

## 5. Example Workflows

### Workflow 1: Generate Single Tank Sprite

**Goal:** Create a player tank sprite with cyan glow

**Command:**
```
/generate-asset tank player cyan-glow aggressive-turret
```

**Step-by-step execution:**

1. **Prompt Engineering (3s)**
   ```
   Input: "tank player cyan-glow aggressive-turret"

   Generated Prompt:
   "2D side-view tank sprite, synthwave style, cyan neon outline,
   chrome metallic body with geometric design, aggressive prominent turret,
   game asset with clean edges, transparent background, isolated subject,
   aspect ratio 2:1, high detail"
   ```

2. **API Call (8s)**
   ```
   Model: gemini-3-pro-image-preview
   Size: 2K
   Aspect: 2:1
   Cost: $0.134

   Response: 2048x1024 PNG with alpha channel
   ```

3. **Post-Processing (4s)**
   ```
   → rembg (already transparent, skipped)
   → magick trim: Removed 200px borders → 1648x824
   → magick resize: Scaled to 128x64
   → Final: 128x64 PNG, 18.2 KB
   ```

4. **File Placement (1s)**
   ```
   Saved: Assets/Sprites/Tanks/tank-player-cyan.png
   Unity meta file auto-generated
   ```

**Total Time:** 16 seconds
**Total Cost:** $0.134

---

### Workflow 2: Generate Explosion Animation (Multi-Frame)

**Goal:** Create 8-frame explosion sprite sheet

**Command:**
```
/generate-asset explosion large 8-frame pink-orange
```

**Step-by-step execution:**

1. **Prompt Engineering (2s)**
   ```
   Input: "explosion large 8-frame pink-orange"
   Frame count: 8 detected

   Generates 8 separate prompts:
   Frame 1: "initial impact explosion, synthwave style, small bright white core..."
   Frame 2: "early expansion explosion, synthwave style, pink inner ring..."
   ...
   Frame 8: "dissipating explosion, synthwave style, fading smoke..."
   ```

2. **API Calls (8 x 7s = 56s)**
   ```
   Model: gemini-3-pro-image-preview
   Size: 2K
   Aspect: 1:1
   Cost per frame: $0.134
   Total cost: $1.072

   Generated 8 individual PNGs (2048x2048 each)
   ```

3. **Post-Processing (15s)**
   ```
   For each frame:
     → magick trim: Remove borders
     → magick resize: Scale to 128x128

   All frames: 128x128 PNG, consistent dimensions
   ```

4. **Sprite Sheet Assembly (3s)**
   ```
   → magick montage: 8 frames, 8x1 tile grid
   → Output: 1024x128 sprite sheet
   → Added 2px padding between frames
   ```

5. **File Placement (1s)**
   ```
   Saved: Assets/Sprites/Effects/explosion-large.png
   Metadata: 8 frames, 128x128 each, 2px spacing
   ```

**Total Time:** 77 seconds
**Total Cost:** $1.072

---

### Workflow 3: Generate UI Button Set

**Goal:** Create FIRE, SHOP, and MENU buttons with consistent style

**Command:**
```
/generate-asset ui button-set "FIRE,SHOP,MENU" 120x40 magenta-glow
```

**Step-by-step execution:**

1. **Prompt Engineering (2s)**
   ```
   Input: "button-set FIRE,SHOP,MENU 120x40 magenta-glow"
   Detected batch: 3 buttons
   Dimensions: 120x40 specified

   Generated Prompts (consistent style):
   Button 1: "2D game UI button, synthwave style, chrome frame with magenta glow,
             'FIRE' text in bold geometric font, transparent background, 3:1 aspect"
   Button 2: Same template with "SHOP"
   Button 3: Same template with "MENU"
   ```

2. **API Calls (3 x 6s = 18s)**
   ```
   Model: gemini-2.5-flash-image (faster for UI)
   Size: 1K (sufficient for UI elements)
   Aspect: 3:1
   Cost per button: $0.134
   Total cost: $0.402

   Generated 3 PNGs (1536x512 each)
   ```

3. **Post-Processing (6s)**
   ```
   For each button:
     → magick trim: Remove excess borders
     → magick resize: Scale to exactly 120x40
     → Verify alpha channel
   ```

4. **File Placement (1s)**
   ```
   Saved:
     - Assets/UI/Buttons/button-fire.png
     - Assets/UI/Buttons/button-shop.png
     - Assets/UI/Buttons/button-menu.png
   ```

**Total Time:** 27 seconds
**Total Cost:** $0.402

---

### Workflow 4: Generate Parallax Background Layers

**Goal:** Create 3-layer parallax background (sky, city, grid)

**Command:**
```
/generate-asset background parallax-sunset 3-layer
```

**Step-by-step execution:**

1. **Prompt Engineering (3s)**
   ```
   Input: "parallax-sunset 3-layer"
   Detected: Multi-layer background

   Layer 1 (Sky):
   "Sky background layer, synthwave style, gradient from hot pink to deep purple
   to dark blue, horizontal sun streaks, parallax-ready, ultra-wide 21:9"

   Layer 2 (City):
   "City skyline silhouette, synthwave style, dark geometric buildings with neon
   windows, distant perspective, parallax-ready, ultra-wide 21:9"

   Layer 3 (Grid):
   "Ground grid layer, synthwave style, neon cyan grid lines perspective,
   vanishing point horizon, parallax-ready, ultra-wide 21:9"
   ```

2. **API Calls (3 x 12s = 36s)**
   ```
   Model: gemini-3-pro-image-preview
   Size: 4K (high res for backgrounds)
   Aspect: 21:9
   Cost per layer: $0.24
   Total cost: $0.72

   Generated 3 ultra-wide PNGs (4096x1755 each)
   ```

3. **Post-Processing (8s)**
   ```
   For each layer:
     → Verify dimensions match (consistency critical for parallax)
     → No resize needed (using at 4K resolution)
     → Color correction: slight saturation boost for layer 1
   ```

4. **File Placement (2s)**
   ```
   Saved:
     - Assets/Backgrounds/Parallax/bg-sky.png
     - Assets/Backgrounds/Parallax/bg-city.png
     - Assets/Backgrounds/Parallax/bg-grid.png

   Metadata: 4096x1755, parallax z-depths: 0.2, 0.5, 0.8
   ```

**Total Time:** 49 seconds
**Total Cost:** $0.72

---

### Workflow 5: Batch Generate Weapon Projectiles

**Goal:** Create 5 projectile types for different weapons

**Command:**
```
/generate-asset projectile batch basic,mirv,nuke,digger,roller
```

**Step-by-step execution:**

1. **Prompt Engineering (4s)**
   ```
   Input: "batch basic,mirv,nuke,digger,roller"
   Detected batch: 5 projectiles

   Prompts:
   Basic: "energy orb sprite, synthwave, glowing cyan, sphere, transparent bg"
   MIRV: "missile warhead sprite, synthwave, magenta with yellow accents, cone shape"
   Nuke: "large warhead sprite, synthwave, yellow glow with danger stripes"
   Digger: "drill projectile sprite, synthwave, purple with rotating tip"
   Roller: "wheel projectile sprite, synthwave, orange glowing rim"
   ```

2. **API Calls - Using Batch API (24 hours later)**
   ```
   Model: gemini-3-pro-image-preview
   Size: 2K
   Aspect: 1:1
   Cost per projectile: $0.067 (50% batch discount)
   Total cost: $0.335

   Submitted batch job ID: batch_abc123
   Wait time: ~24 hours
   ```

3. **Post-Processing (10s, automated after batch completes)**
   ```
   For each projectile:
     → rembg: Background removal
     → magick trim: Remove borders
     → magick resize: Scale to 16x16
   ```

4. **File Placement (2s)**
   ```
   Saved:
     - Assets/Sprites/Projectiles/shot-basic.png
     - Assets/Sprites/Projectiles/shot-mirv.png
     - Assets/Sprites/Projectiles/shot-nuke.png
     - Assets/Sprites/Projectiles/shot-digger.png
     - Assets/Sprites/Projectiles/shot-roller.png
   ```

**Total Time:** 16 seconds active + 24 hours wait
**Total Cost:** $0.335 (50% savings)

---

## 6. CLI Tool Requirements

### Installation Summary

**macOS:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install ImageMagick
brew install imagemagick

# Install Python and rembg
brew install python
pip3 install rembg

# Optional: Install remove.bg CLI
# Download from https://github.com/remove-bg/remove-bg-cli/releases
```

**Linux (Ubuntu/Debian):**
```bash
# Update package list
sudo apt-get update

# Install ImageMagick
sudo apt-get install imagemagick

# Install Python and pip
sudo apt-get install python3 python3-pip

# Install rembg
pip3 install rembg

# Optional: Install remove.bg CLI
# Download from https://github.com/remove-bg/remove-bg-cli/releases
```

**Verification:**
```bash
# Check installations
magick --version
python3 --version
rembg --help
```

### Python Dependencies

**For Skill Implementation:**
```bash
pip install google-genai pillow rembg
```

**requirements.txt:**
```
google-genai>=1.52.0
pillow>=10.0.0
rembg>=2.0.0
```

### Environment Setup

**Required Environment Variables:**
```bash
# Add to ~/.bashrc or ~/.zshrc

export GEMINI_API_KEY="your_api_key_here"
export ASSET_OUTPUT_DIR="./Assets/Sprites"
export REMOVE_BG_API_KEY="your_removebg_key_here"  # Optional
```

**Gemini API Key:**
1. Visit https://aistudio.google.com/apikey
2. Sign in with Google account
3. Create new API key
4. Enable billing in Google Cloud Console

**remove.bg API Key (Optional):**
1. Visit https://www.remove.bg/users/sign_up
2. Sign up for account
3. Get API key from dashboard (50 free calls/month)

---

## 7. Integration with Unity Migration

### Unity Asset Requirements

**Sprite Import Settings:**
```csharp
// Unity will need these settings for imported sprites
TextureImporterSettings:
  - Texture Type: Sprite (2D and UI)
  - Sprite Mode: Single or Multiple (for sprite sheets)
  - Pixels Per Unit: 100 (or match game scale)
  - Filter Mode: Point (for pixel-perfect) or Bilinear
  - Compression: None (preserve quality)
  - Max Size: 2048 or 4096
  - Alpha Source: Input Texture Alpha
  - Alpha Is Transparency: True
```

**Sprite Sheet Configuration:**
When generating sprite sheets, include metadata:
```json
{
  "name": "explosion-large",
  "frames": 8,
  "frameWidth": 128,
  "frameHeight": 128,
  "frameDuration": 0.05,
  "loop": false
}
```

### Directory Structure

```
Assets/
  Sprites/
    Tanks/
      tank-player.png
      tank-enemy.png
    Projectiles/
      shot-basic.png
      shot-mirv.png
      shot-nuke.png
    Effects/
      explosion-small.png
      explosion-large.png
      smoke-trail.png
    UI/
      Buttons/
        button-fire.png
        button-shop.png
      Meters/
        power-meter.png
  Backgrounds/
    Parallax/
      bg-sky.png
      bg-city.png
      bg-grid.png
```

### Automatic Import Configuration

The skill should generate Unity `.meta` files for proper import:

```yaml
# tank-player.png.meta
fileFormatVersion: 2
guid: [auto-generated]
TextureImporter:
  spritePixelsPerUnit: 100
  spriteBorder: {x: 0, y: 0, z: 0, w: 0}
  spriteGenerateFallbackPhysicsShape: 1
  alphaUsage: 1
  alphaIsTransparency: 1
  textureType: 8
  textureShape: 1
```

### Asset Manifest Integration

Currently, the web version uses `assets/manifest.json`. For Unity migration:

**Option A:** Continue using manifest.json for asset metadata
```json
{
  "tanks": {
    "player": {
      "sprite": "Assets/Sprites/Tanks/tank-player.png",
      "width": 128,
      "height": 64,
      "generated": "2026-01-12T15:30:00Z",
      "cost": 0.134
    }
  }
}
```

**Option B:** Generate Unity ScriptableObjects
```csharp
[CreateAssetMenu(fileName = "TankConfig", menuName = "ScriptableObjects/TankConfig")]
public class TankConfig : ScriptableObject {
    public Sprite sprite;
    public int width;
    public int height;
    public string generatedDate;
}
```

### Texture Atlas Considerations

For performance, Unity may combine sprites into texture atlases:

**Skill should support:**
- Generating sprites at sizes suitable for atlas packing
- Maintaining consistent padding (2-4px) around sprites
- Supporting power-of-two dimensions when possible
- Documenting which sprites should be in same atlas

**Unity Sprite Atlas Configuration:**
```
SpriteAtlas:
  - Name: GameplaySprites
  - Includes: Tanks/*, Projectiles/*
  - Max Size: 2048
  - Padding: 2
```

---

## 8. Alternative Approaches (If API Limitations Exist)

### Semi-Automated Workflow

If full automation isn't feasible, here's the best semi-automated approach:

**Claude Role:** Prompt engineering and post-processing automation
**Human Role:** Running prompts in NanoBanana web UI

**Workflow:**

1. **User invokes skill:**
   ```
   /generate-asset tank player cyan-glow
   ```

2. **Claude generates optimal prompt:**
   ```
   ✓ Generated prompt (copy to NanoBanana):

   "2D side-view tank sprite, synthwave style, cyan neon outline,
   chrome metallic body with geometric design, prominent turret,
   game asset with clean edges, transparent background, isolated subject,
   aspect ratio 2:1, high detail"

   Recommended settings:
   - Model: Gemini 3 Pro
   - Size: 2K
   - Aspect Ratio: 2:1
   ```

3. **User pastes prompt into NanoBanana web UI, downloads result**

4. **User places image in project directory:**
   ```
   /Users/user/projects/scorched-earth/temp/tank-player.png
   ```

5. **User invokes post-processing:**
   ```
   /process-asset temp/tank-player.png tank player
   ```

6. **Claude runs post-processing pipeline:**
   ```
   ✓ Background removed
   ✓ Trimmed borders
   ✓ Resized to 128x64
   ✓ Moved to Assets/Sprites/Tanks/tank-player.png
   ✓ Ready for Unity import
   ```

**Advantages:**
- ✅ Still gets optimal prompts from Claude
- ✅ Still automates tedious post-processing
- ✅ No API costs
- ❌ Requires manual web UI interaction

### Browser Automation (Advanced)

If web UI is the only option, could use Playwright/Selenium:

```python
from playwright.sync_api import sync_playwright

def generate_via_web(prompt, config):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Navigate to NanoBanana
        page.goto("https://aistudio.google.com")

        # Login (requires credentials)
        # ...

        # Select model
        page.click('text="Nano Banana Pro"')

        # Enter prompt
        page.fill('textarea[placeholder="Enter prompt"]', prompt)

        # Set config
        page.select_option('select[name="imageSize"]', config['size'])

        # Generate
        page.click('button:text("Generate")')

        # Wait for result
        page.wait_for_selector('img[alt="Generated image"]')

        # Download
        page.click('button:text("Download")')

        browser.close()
```

**Challenges:**
- Requires login credentials
- UI changes break automation
- Rate limiting
- Not officially supported

**Verdict:** Only consider if API truly unavailable and manual workflow too burdensome.

---

## 9. Cost Analysis & Optimization

### Cost Breakdown

**Per-Asset Costs (Standard API):**
- Tank sprite (2K): $0.134
- Projectile (1K): $0.134
- Explosion 8-frame (2K): $1.072 (8 x $0.134)
- UI button (1K): $0.134
- Background layer (4K): $0.24

**Typical Full Asset Set:**
- 2 tanks: $0.27
- 5 projectiles: $0.67
- 3 explosions (8 frames each): $3.22
- 5 UI buttons: $0.67
- 3 background layers: $0.72
- **Total:** ~$5.55

### Cost Optimization Strategies

**1. Use Batch API (50% savings)**
```
Standard: $5.55
Batch: $2.78
Savings: $2.77
Tradeoff: 24-hour wait time
```

**Best for:** Non-urgent bulk generation, initial asset creation

**2. Use Gemini 2.5 Flash for simple assets**
```
Flash (1K): $0.134
Pro (2K): $0.134
Pro (4K): $0.24
```

Flash is same price but faster - use for:
- Small UI elements
- Simple projectiles
- Icons

**3. Generate variations from single base**
Use ImageMagick to create variations:
```bash
# Generate one base tank, create color variants
magick tank-base.png -modulate 100,100,0 tank-red.png
magick tank-base.png -modulate 100,100,120 tank-blue.png
```

Cost: $0.134 (base) vs $0.402 (3 separate generations)

**4. Reuse prompts for consistency**
Cache successful prompts, reuse with minor tweaks:
```
Base prompt: $0.134
Variation 1: Change "cyan" to "magenta": $0.134
Variation 2: Change "aggressive" to "defensive": $0.134
```

Alternative: Generate once, recolor in post-processing

**5. Lower resolution when appropriate**
```
UI button 120x40: Generate at 1K (384x128), resize down
Cost: $0.134 vs $0.134 for 2K (same price, but faster)
```

### Free Alternatives Comparison

| Method | Quality | Speed | Effort | Cost |
|--------|---------|-------|--------|------|
| NanoBanana API | Excellent | Fast | Low | $0.134-0.24/img |
| Manual web UI | Excellent | Fast | Medium | $0 |
| Stable Diffusion Local | Good | Slow | High | $0 (hardware) |
| Existing assets + editing | Varies | Fast | High | $0 |

### Budget Recommendations

**Prototype Phase (First 50 assets):**
- Use API: ~$7-10
- Worth it for speed and quality
- Iterate quickly on art direction

**Production Phase (100+ assets):**
- Use Batch API where possible: 50% savings
- Reuse/recolor existing assets
- Manual generation for hero assets

**Post-Launch (Updates):**
- Generate new assets as needed
- Budget: ~$1-2 per update

---

## 10. Conclusion & Recommendations

### Feasibility: ✅ CONFIRMED

Full automation of asset generation is **technically feasible and practical** using NanoBanana Pro (Gemini API).

### Recommended Implementation Path

**Phase 1: MVP Skill (Week 1)**
- Implement basic `/generate-asset` command
- Support: tank, projectile, explosion types
- Use API directly (no batch)
- Auto-save to Assets/Sprites directory
- No sprite sheet assembly yet

**Phase 2: Full Pipeline (Week 2)**
- Add post-processing (ImageMagick, rembg)
- Sprite sheet assembly for animations
- UI and background support
- Unity meta file generation

**Phase 3: Optimization (Week 3)**
- Batch API support
- Prompt caching and reuse
- Cost tracking and reporting
- Advanced options (color variants, recoloring)

### Key Success Factors

1. **Prompt Quality:** Invest time in prompt templates - quality prompts = quality results
2. **Post-Processing:** Automate tedious tasks (trimming, resizing) to save time
3. **Cost Management:** Use Batch API for bulk generation, track spending
4. **Integration:** Seamless placement in Unity project structure

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API costs exceed budget | Use Batch API, generate in bulk, reuse assets |
| Generated assets inconsistent | Lock down prompt templates, use reference images |
| Transparency issues | Post-process with rembg, validate alpha channels |
| Sprite sheets misaligned | Automated assembly with ImageMagick, validate dimensions |

### Next Steps

1. **Prototype:** Build minimal skill that generates one tank sprite
2. **Test:** Verify API integration, cost, and quality
3. **Iterate:** Expand to all asset types based on success
4. **Document:** Create user guide for skill usage

### Alternative if API Unavailable

If for any reason the API becomes unavailable:
1. **Semi-automated workflow:** Claude generates prompts, human runs in web UI
2. **Automate post-processing:** Claude still handles trimming, resizing, placement
3. **Value proposition:** Still saves significant time on manual tasks

---

## References

**NanoBanana API:**
- [Official Gemini API Documentation](https://ai.google.dev/gemini-api/docs/nanobanana)
- [Complete Developer Tutorial (DEV Community)](https://dev.to/googleai/introducing-nano-banana-pro-complete-developer-tutorial-5fc8)
- [AI/ML API Documentation](https://docs.aimlapi.com/api-references/image-models/google/gemini-3-pro-image-preview)

**Post-Processing Tools:**
- [ImageMagick Sprite Sheets Guide](https://www.cultofgalaxy.com/blog/2025/02/imagemagick-sprite-sheets)
- [ImageMagick Command-Line Options](https://imagemagick.org/script/command-line-options.php)
- [rembg GitHub Repository](https://github.com/danielgatis/rembg)
- [remove.bg API Documentation](https://www.remove.bg/api)
- [remove.bg CLI Tool](https://github.com/remove-bg/remove-bg-cli)

**Existing Research:**
- [AI Asset Generation Research](../research/ai-asset-generation.md)
- [Web Reference: Supply Drop Asset Generator](../../web-reference/scripts/generate-supply-drop-assets.js)

---

**Document Status:** Complete
**Research Confidence:** High
**Implementation Readiness:** Ready to proceed
**Estimated Development Time:** 2-3 weeks for full implementation
