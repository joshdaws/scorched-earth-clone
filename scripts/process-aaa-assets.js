/**
 * Post-process AI-generated AAA art from assets/staging/aaa into production
 * runtime assets + manifest entries.
 *
 * Usage:
 *   node scripts/process-aaa-assets.js            # process everything staged
 *   node scripts/process-aaa-assets.js --only tank-player-turret,bg-world1
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const STAGING = path.join(root, 'assets/staging/aaa');
const MANIFEST_PATH = path.join(root, 'assets/manifest.json');

const onlyArg = process.argv.find(a => a.startsWith('--only'));
const only = onlyArg ? (onlyArg.split('=')[1] || process.argv[process.argv.indexOf(onlyArg) + 1] || '').split(',').filter(Boolean) : null;

function wants(name) {
  return !only || only.includes(name);
}

function stagingPath(name) {
  return path.join(STAGING, `${name}.png`);
}

function hasStaged(name) {
  return fs.existsSync(stagingPath(name));
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
let manifestDirty = false;

function setManifest(group, key, value) {
  manifest[group] = manifest[group] || {};
  manifest[group][key] = value;
  manifestDirty = true;
}

const report = [];

// ---------------------------------------------------------------------------
// Backgrounds: 1536x1024 PNG -> WebP q82, replace old SVG-generated PNGs.
// ---------------------------------------------------------------------------
const BACKGROUNDS = [
  { name: 'bg-world1', key: 'world1', slug: 'world-1-neon-dunes' },
  { name: 'bg-world2', key: 'world2', slug: 'world-2-chrome-canyons' },
  { name: 'bg-world3', key: 'world3', slug: 'world-3-prism-bunkers' },
  { name: 'bg-world4', key: 'world4', slug: 'world-4-vector-vortex' },
  { name: 'bg-world5', key: 'world5', slug: 'world-5-pixel-wastes' },
  { name: 'bg-world6', key: 'world6', slug: 'world-6-midnight-citadel' },
  { name: 'bg-gameplay', key: 'gameplay', slug: 'bg-gameplay' }
];

async function processBackgrounds() {
  for (const bg of BACKGROUNDS) {
    if (!wants(bg.name) || !hasStaged(bg.name)) continue;

    const outRel = `images/backgrounds/${bg.slug}.webp`;
    const outAbs = path.join(root, 'assets', outRel);
    await sharp(stagingPath(bg.name))
      .resize(1536, 1024, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(outAbs);

    const oldPng = path.join(root, 'assets', `images/backgrounds/${bg.slug}.png`);
    if (fs.existsSync(oldPng)) fs.rmSync(oldPng);

    setManifest('backgrounds', bg.key, {
      path: outRel,
      width: 1536,
      height: 1024,
      runtimeGroup: 'gameplay'
    });
    report.push(`background ${bg.key} -> ${outRel} (${(fs.statSync(outAbs).size / 1024).toFixed(0)} KB)`);
  }
}

// ---------------------------------------------------------------------------
// Tanks: trim alpha, fit into 4x display boxes.
// Body: 256x128 (display 64x32), anchored bottom-center.
// Turret: 112x48 (display 28x12), cap center placed at source pivot (24,24).
// ---------------------------------------------------------------------------
const TANKS = [
  { name: 'tank-player-body', kind: 'body', key: 'playerBody', file: 'tank-player-body-hd.png' },
  // Enemy hull is authored facing left (toward the player side); the renderer
  // draws bodies without mirroring, matching the legacy sprite orientation.
  { name: 'tank-enemy-body', kind: 'body', key: 'enemyBody', file: 'tank-enemy-body-hd.png' },
  {
    name: 'tank-player-turret', kind: 'turret', key: 'playerTurret', file: 'tank-player-turret-hd.png',
    capXRatio: 0.42, capYRatio: 0.58
  },
  {
    name: 'tank-enemy-turret', kind: 'turret', key: 'enemyTurret', file: 'tank-enemy-turret-hd.png',
    capXRatio: 0.42, capYRatio: 0.58
  }
];

async function processTanks() {
  for (const tank of TANKS) {
    if (!wants(tank.name) || !hasStaged(tank.name)) continue;

    const trimmed = await sharp(stagingPath(tank.name)).trim({ threshold: 12 }).png().toBuffer();
    const meta = await sharp(trimmed).metadata();

    const outRel = `images/tanks/${tank.file}`;
    const outAbs = path.join(root, 'assets', outRel);

    if (tank.kind === 'body') {
      const boxW = 256;
      const boxH = 128;
      const scale = Math.min((boxW * 0.96) / meta.width, (boxH * 0.96) / meta.height);
      const w = Math.round(meta.width * scale);
      const h = Math.round(meta.height * scale);
      const resized = await sharp(trimmed).resize(w, h).png().toBuffer();

      await sharp({
        create: { width: boxW, height: boxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
        .composite([{ input: resized, left: Math.round((boxW - w) / 2), top: boxH - h }])
        .png({ compressionLevel: 9 })
        .toFile(outAbs);

      setManifest('tanks', tank.key, {
        ...(manifest.tanks?.[tank.key] || {}),
        path: outRel,
        width: boxW,
        height: boxH
      });
    } else {
      const boxW = 112;
      const boxH = 48;
      const pivotX = 24; // display pivot (6,6) * 4
      const pivotY = 24;
      const capXRatio = tank.capXRatio ?? 0.5;
      const capYRatio = tank.capYRatio ?? 0.55;

      const scale = Math.min((boxW - 4) / meta.width, (boxH - 4) / meta.height);
      const w = Math.round(meta.width * scale);
      const h = Math.round(meta.height * scale);
      const resized = await sharp(trimmed).resize(w, h).png().toBuffer();

      // Estimate the rotation cap center inside the trimmed art, then place it
      // on the canonical pivot point.
      const capX = Math.round(h * capXRatio);
      const capY = Math.round(h * capYRatio);
      const left = Math.max(0, Math.min(boxW - w, pivotX - capX));
      const top = Math.max(0, Math.min(boxH - h, pivotY - capY));

      await sharp({
        create: { width: boxW, height: boxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
        .composite([{ input: resized, left, top }])
        .png({ compressionLevel: 9 })
        .toFile(outAbs);

      setManifest('tanks', tank.key, {
        ...(manifest.tanks?.[tank.key] || {}),
        path: outRel,
        width: boxW,
        height: boxH
      });
    }

    report.push(`tank ${tank.key} -> ${outRel} (${(fs.statSync(outAbs).size / 1024).toFixed(0)} KB)`);
  }
}

// ---------------------------------------------------------------------------
// Terrain tile: mirror-tile to guarantee seamless wrap, 768x768 output.
// ---------------------------------------------------------------------------
async function processTerrainTile() {
  const name = 'terrain-tile';
  if (!wants(name) || !hasStaged(name)) return;

  const base = await sharp(stagingPath(name))
    .resize(384, 384, { fit: 'cover' })
    .png()
    .toBuffer();
  const flopped = await sharp(base).flop().toBuffer();
  const flipped = await sharp(base).flip().toBuffer();
  const both = await sharp(base).flip().flop().toBuffer();

  const outRel = 'images/terrain/dirt-tile.webp';
  const outAbs = path.join(root, 'assets', outRel);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });

  await sharp({
    create: { width: 768, height: 768, channels: 3, background: { r: 26, g: 10, b: 46 } }
  })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: flopped, left: 384, top: 0 },
      { input: flipped, left: 0, top: 384 },
      { input: both, left: 384, top: 384 }
    ])
    .webp({ quality: 80 })
    .toFile(outAbs);

  const stalePng = path.join(root, 'assets', 'images/terrain/dirt-tile.png');
  if (fs.existsSync(stalePng)) fs.rmSync(stalePng);

  setManifest('terrain', 'dirtTexture', {
    path: outRel,
    width: 768,
    height: 768,
    runtimeGroup: 'gameplay'
  });
  report.push(`terrain dirtTexture -> ${outRel} (${(fs.statSync(outAbs).size / 1024).toFixed(0)} KB)`);
}

// ---------------------------------------------------------------------------
// Explosion sheets: 4x4 grids, downscale to 768 (192px frames).
// ---------------------------------------------------------------------------
const SHEETS = [
  { name: 'explosion-sheet', key: 'explosionSheet', file: 'explosion-sheet.webp' },
  { name: 'nuke-sheet', key: 'nukeSheet', file: 'nuke-sheet.webp' }
];

async function processSheets() {
  for (const sheet of SHEETS) {
    if (!wants(sheet.name) || !hasStaged(sheet.name)) continue;

    const outRel = `images/effects/${sheet.file}`;
    const outAbs = path.join(root, 'assets', outRel);
    await sharp(stagingPath(sheet.name))
      .resize(768, 768, { fit: 'fill' })
      .webp({ quality: 90 })
      .toFile(outAbs);

    const stalePng = outAbs.replace(/\.webp$/, '.png');
    if (fs.existsSync(stalePng)) fs.rmSync(stalePng);

    setManifest('effects', sheet.key, {
      path: outRel,
      width: 768,
      height: 768,
      runtimeGroup: 'gameplay',
      scalePolicy: 'smooth',
      frames: { columns: 4, rows: 4, count: 16, width: 192, height: 192, durationMs: 28 }
    });
    report.push(`effect ${sheet.key} -> ${outRel} (${(fs.statSync(outAbs).size / 1024).toFixed(0)} KB)`);
  }
}

// ---------------------------------------------------------------------------
// Puzzle objects: trim + contain into 2x boxes, overwrite existing paths.
// ---------------------------------------------------------------------------
const PUZZLE_OBJECTS = [
  { name: 'po-shield', key: 'shieldGenerator', file: 'shield-generator.png', box: [320, 320] },
  { name: 'po-ricochet', key: 'ricochetPanel', file: 'ricochet-panel.png', box: [384, 224] },
  { name: 'po-teleport', key: 'teleportGate', file: 'teleport-gate.png', box: [320, 352] },
  { name: 'po-bunker', key: 'hardlightBunker', file: 'hardlight-bunker.png', box: [448, 224] },
  { name: 'po-fuel', key: 'fuelCell', file: 'fuel-cell.png', box: [256, 336] },
  { name: 'po-collapse', key: 'collapseNode', file: 'collapse-node.png', box: [288, 288] }
];

async function processPuzzleObjects() {
  for (const po of PUZZLE_OBJECTS) {
    if (!wants(po.name) || !hasStaged(po.name)) continue;

    const [boxW, boxH] = po.box;
    const trimmed = await sharp(stagingPath(po.name)).trim({ threshold: 12 }).png().toBuffer();
    const meta = await sharp(trimmed).metadata();
    const scale = Math.min(boxW / meta.width, boxH / meta.height);
    const w = Math.round(meta.width * scale);
    const h = Math.round(meta.height * scale);
    const resized = await sharp(trimmed).resize(w, h).png().toBuffer();

    const outRel = `images/puzzle-objects/${po.file}`;
    const outAbs = path.join(root, 'assets', outRel);
    await sharp({
      create: { width: boxW, height: boxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: resized, left: Math.round((boxW - w) / 2), top: Math.round((boxH - h) / 2) }])
      .png({ compressionLevel: 9 })
      .toFile(outAbs);

    setManifest('puzzleObjects', po.key, {
      path: outRel,
      width: boxW,
      height: boxH,
      runtimeGroup: 'gameplay'
    });
    report.push(`puzzleObject ${po.key} -> ${outRel} (${(fs.statSync(outAbs).size / 1024).toFixed(0)} KB)`);
  }
}

// ---------------------------------------------------------------------------
// UI icons: trim + contain into 192x192 boxes.
// ---------------------------------------------------------------------------
const UI_ICONS = [
  { name: 'ui-star-filled', key: 'starFilled', file: 'icon-star-filled.png' },
  { name: 'ui-star-empty', key: 'starEmpty', file: 'icon-star-empty.png' },
  { name: 'ui-lock', key: 'lock', file: 'icon-lock.png' }
];

async function processUiIcons() {
  for (const icon of UI_ICONS) {
    if (!wants(icon.name) || !hasStaged(icon.name)) continue;

    const box = 192;
    const trimmed = await sharp(stagingPath(icon.name)).trim({ threshold: 12 }).png().toBuffer();
    const meta = await sharp(trimmed).metadata();
    const scale = Math.min(box / meta.width, box / meta.height);
    const w = Math.round(meta.width * scale);
    const h = Math.round(meta.height * scale);
    const resized = await sharp(trimmed).resize(w, h).png().toBuffer();

    const outRel = `images/ui/${icon.file}`;
    const outAbs = path.join(root, 'assets', outRel);
    await sharp({
      create: { width: box, height: box, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: resized, left: Math.round((box - w) / 2), top: Math.round((box - h) / 2) }])
      .png({ compressionLevel: 9 })
      .toFile(outAbs);

    setManifest('ui', icon.key, {
      path: outRel,
      width: box,
      height: box,
      runtimeGroup: 'gameplay'
    });
    report.push(`ui ${icon.key} -> ${outRel} (${(fs.statSync(outAbs).size / 1024).toFixed(0)} KB)`);
  }
}

async function main() {
  await processBackgrounds();
  await processTanks();
  await processTerrainTile();
  await processSheets();
  await processPuzzleObjects();
  await processUiIcons();

  if (manifestDirty) {
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (report.length === 0) {
    console.log('Nothing staged to process.');
  } else {
    console.log(report.join('\n'));
    console.log(`\nProcessed ${report.length} assets. Manifest ${manifestDirty ? 'updated' : 'unchanged'}.`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
