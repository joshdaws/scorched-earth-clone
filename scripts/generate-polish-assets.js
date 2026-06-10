import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const backgroundsDir = path.join(root, 'assets/images/backgrounds');
const puzzleDir = path.join(root, 'assets/images/puzzle-objects');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stars(seed, count = 120) {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  return Array.from({ length: count }, () => {
    const x = Math.round(rnd() * 1536);
    const y = Math.round(rnd() * 470);
    const r = (0.8 + rnd() * 2.2).toFixed(1);
    const a = (0.32 + rnd() * 0.62).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${a}"/>`;
  }).join('\n');
}

function gridLines(color = '#ff2a6d') {
  const horizontal = Array.from({ length: 15 }, (_, i) => {
    const t = i / 14;
    const y = 565 + Math.pow(t, 1.85) * 459;
    return `<line x1="0" y1="${y.toFixed(1)}" x2="1536" y2="${y.toFixed(1)}" stroke="${color}" stroke-opacity="${(0.08 + t * 0.35).toFixed(2)}" stroke-width="${(1 + t * 3).toFixed(1)}"/>`;
  }).join('\n');

  const vertical = Array.from({ length: 25 }, (_, i) => {
    const x = 768 + (i - 12) * 80;
    const bottomX = 768 + (i - 12) * 230;
    return `<line x1="${x}" y1="560" x2="${bottomX}" y2="1024" stroke="${color}" stroke-opacity="0.22" stroke-width="2"/>`;
  }).join('\n');

  return `${horizontal}\n${vertical}`;
}

function sunDisc(color, cx = 768, cy = 524, radius = 132, stripe = '#070412') {
  const cuts = Array.from({ length: 8 }, (_, i) => {
    const y = cy - radius + 28 + i * 25;
    return `<rect x="${cx - radius - 12}" y="${y}" width="${radius * 2 + 24}" height="${7 + i * 0.8}" fill="${stripe}" opacity="${0.24 + i * 0.045}"/>`;
  }).join('\n');
  return `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" opacity="0.82"/>
    ${cuts}
  `;
}

function mountainLayer(points, color, opacity = 1, stroke = '#ff2a6d') {
  return `
    <polygon points="0,560 ${points} 1536,560 1536,1024 0,1024" fill="${color}" opacity="${opacity}"/>
    <polyline points="0,560 ${points} 1536,560" fill="none" stroke="${stroke}" stroke-opacity="0.68" stroke-width="3"/>
  `;
}

function buildings(color, accent) {
  return Array.from({ length: 16 }, (_, i) => {
    const w = 60 + (i % 3) * 24;
    const h = 120 + ((i * 47) % 190);
    const x = 22 + i * 96;
    const y = 560 - h;
    const windows = Array.from({ length: Math.floor(h / 34) }, (_, row) =>
      Array.from({ length: 3 }, (_, col) =>
        `<rect x="${x + 12 + col * 17}" y="${y + 18 + row * 30}" width="8" height="12" fill="${accent}" opacity="${0.18 + ((row + col + i) % 3) * 0.18}"/>`
      ).join('')
    ).join('');
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="0.82"/><path d="M${x} ${y}H${x + w}V560" fill="none" stroke="${accent}" stroke-opacity="0.48" stroke-width="2"/>${windows}`;
  }).join('\n');
}

function dunes(fill, stroke) {
  return `
    <path d="M0 560C150 505 300 505 450 560S755 614 930 545S1270 498 1536 560V1024H0Z" fill="${fill}" opacity="0.9"/>
    <path d="M0 584C190 540 360 536 520 592S850 642 1065 574S1360 534 1536 604" fill="none" stroke="${stroke}" stroke-width="4" stroke-opacity="0.75"/>
    <path d="M0 650C230 600 430 612 610 668S1020 700 1536 622" fill="none" stroke="#05d9e8" stroke-width="3" stroke-opacity="0.42"/>
  `;
}

function canyonSpans(fill, stroke) {
  return `
    <path d="M0 560H1536V1024H0Z" fill="${fill}" opacity="0.86"/>
    <g fill="#08101f" stroke="${stroke}" stroke-width="5" stroke-linejoin="round">
      <path d="M40 560L170 356L290 560Z"/>
      <path d="M1250 560L1370 330L1492 560Z"/>
      <path d="M470 560L585 408L690 560Z" opacity="0.78"/>
      <path d="M840 560L990 380L1120 560Z" opacity="0.86"/>
    </g>
    <path d="M0 560H1536" stroke="${stroke}" stroke-width="5" stroke-opacity="0.85"/>
  `;
}

function prismFortress(fill, stroke, accent) {
  return `
    <path d="M0 560H1536V1024H0Z" fill="${fill}" opacity="0.9"/>
    <g fill="#17112f" stroke="${stroke}" stroke-width="5">
      <polygon points="178,560 300,420 422,560"/>
      <polygon points="1110,560 1222,392 1340,560"/>
      <rect x="560" y="438" width="118" height="122"/>
      <rect x="690" y="384" width="158" height="176"/>
      <rect x="862" y="452" width="118" height="108"/>
    </g>
    <g stroke="${accent}" stroke-width="4" opacity="0.72">
      <path d="M300 420L300 560M1222 392L1222 560M690 438H848M730 384V560M810 384V560"/>
    </g>
  `;
}

function vectorVortex(fill, stroke, accent) {
  const rings = Array.from({ length: 7 }, (_, i) => {
    const r = 64 + i * 44;
    return `<polygon points="${768},${520 - r} ${768 + r},520 ${768},${520 + r} ${768 - r},520" fill="none" stroke="${i % 2 ? stroke : accent}" stroke-width="${7 - i * 0.55}" opacity="${0.68 - i * 0.07}"/>`;
  }).join('\n');
  return `
    <path d="M0 560H1536V1024H0Z" fill="${fill}" opacity="0.92"/>
    <g>${rings}</g>
    <path d="M0 560L280 500L520 570L768 520L1010 574L1280 500L1536 560" fill="none" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>
    <g fill="none" stroke="${accent}" stroke-width="5" opacity="0.8">
      <path d="M205 455H365V615H205Z"/>
      <path d="M1160 430L1290 520L1160 610L1030 520Z"/>
    </g>
  `;
}

function pixelWastes(fill, stroke, accent) {
  const blocks = Array.from({ length: 52 }, (_, i) => {
    const x = 32 + (i * 137) % 1460;
    const y = 386 + (i * 61) % 174;
    const s = 16 + (i % 5) * 10;
    return `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${i % 2 ? stroke : accent}" opacity="${0.34 + (i % 3) * 0.12}"/>`;
  }).join('\n');
  return `
    <path d="M0 560H1536V1024H0Z" fill="${fill}" opacity="0.92"/>
    <path d="M0 560H180V528H330V560H520V512H690V560H850V536H1030V560H1220V504H1400V560H1536" fill="#111928" stroke="${stroke}" stroke-width="5"/>
    <g>${blocks}</g>
    <path d="M0 626H1536" stroke="${accent}" stroke-width="4" stroke-dasharray="20 22" stroke-opacity="0.65"/>
  `;
}

function midnightCitadel(fill, stroke, accent) {
  return `
    <path d="M0 560H1536V1024H0Z" fill="${fill}" opacity="0.94"/>
    <g fill="#080914" stroke="${stroke}" stroke-width="5">
      <path d="M600 560V410H655V350H710V280H768V214H826V280H884V350H938V410H994V560Z"/>
      <path d="M318 560V465H366V410H430V560Z" opacity="0.82"/>
      <path d="M1108 560V430H1172V360H1242V560Z" opacity="0.82"/>
    </g>
    <g stroke="${accent}" stroke-width="4" opacity="0.74">
      <path d="M710 350H826M655 410H938M768 214V560M600 500H994"/>
      <path d="M730 462H806V560H730Z" fill="#050711"/>
    </g>
  `;
}

const worlds = [
  {
    id: 1,
    file: 'world-1-neon-dunes.png',
    title: 'Neon Dunes',
    skyA: '#14001f',
    skyB: '#421159',
    horizon: '#ff7a3d',
    grid: '#ff2a6d',
    accent: '#05d9e8',
    motif: `
      ${sunDisc('#ff7a3d', 768, 510, 126)}
      ${mountainLayer('90,510 225,545 360,488 520,550 680,506 800,558 945,492 1110,542 1268,506 1438,550', '#170728', 1, '#ff2a6d')}
      ${dunes('#221036', '#ff7a3d')}`
  },
  {
    id: 2,
    file: 'world-2-chrome-canyons.png',
    title: 'Chrome Canyons',
    skyA: '#071322',
    skyB: '#19395b',
    horizon: '#05d9e8',
    grid: '#05d9e8',
    accent: '#d300c5',
    motif: `
      ${sunDisc('#05d9e8', 1120, 514, 92)}
      ${buildings('#08182c', '#05d9e8')}
      ${canyonSpans('#09172a', '#05d9e8')}`
  },
  {
    id: 3,
    file: 'world-3-prism-bunkers.png',
    title: 'Prism Bunkers',
    skyA: '#160522',
    skyB: '#442062',
    horizon: '#d300c5',
    grid: '#d300c5',
    accent: '#ff6b35',
    motif: `
      ${sunDisc('#d300c5', 392, 510, 98)}
      ${prismFortress('#160b2a', '#d300c5', '#ff6b35')}`
  },
  {
    id: 4,
    file: 'world-4-vector-vortex.png',
    title: 'Vector Vortex',
    skyA: '#1c070f',
    skyB: '#4b1c39',
    horizon: '#ff6b35',
    grid: '#ff6b35',
    accent: '#f9f002',
    motif: `
      ${sunDisc('#ff6b35', 768, 520, 90)}
      ${vectorVortex('#210d1b', '#ff6b35', '#f9f002')}`
  },
  {
    id: 5,
    file: 'world-5-pixel-wastes.png',
    title: 'Pixel Wastes',
    skyA: '#080b1a',
    skyB: '#1c3b3d',
    horizon: '#f9f002',
    grid: '#f9f002',
    accent: '#05d9e8',
    motif: `
      ${sunDisc('#f9f002', 292, 516, 78)}
      ${pixelWastes('#0d1821', '#f9f002', '#05d9e8')}`
  },
  {
    id: 6,
    file: 'world-6-midnight-citadel.png',
    title: 'Midnight Citadel',
    skyA: '#030410',
    skyB: '#190628',
    horizon: '#ff2a6d',
    grid: '#ff2a6d',
    accent: '#05d9e8',
    motif: `
      ${sunDisc('#ff2a6d', 768, 500, 118)}
      ${midnightCitadel('#050713', '#ff2a6d', '#05d9e8')}`
  }
];

function worldSvg(world) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
    <defs>
      <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${world.skyA}"/>
        <stop offset="0.62" stop-color="${world.skyB}"/>
        <stop offset="1" stop-color="#070412"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="54%" r="44%">
        <stop offset="0" stop-color="${world.horizon}" stop-opacity="0.58"/>
        <stop offset="0.34" stop-color="${world.horizon}" stop-opacity="0.17"/>
        <stop offset="1" stop-color="${world.horizon}" stop-opacity="0"/>
      </radialGradient>
      <filter id="softGlow"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <rect width="1536" height="1024" fill="url(#sky)"/>
    <rect width="1536" height="1024" fill="url(#glow)"/>
    ${stars(900 + world.id * 113)}
    <g opacity="0.24">${gridLines(world.grid)}</g>
    ${world.motif}
    <line x1="0" y1="560" x2="1536" y2="560" stroke="${world.accent}" stroke-width="3" stroke-opacity="0.72"/>
    <g opacity="0.16" stroke="#ffffff" stroke-width="1">
      ${Array.from({ length: 90 }, (_, i) => `<line x1="0" y1="${i * 12}" x2="1536" y2="${i * 12}"/>`).join('')}
    </g>
  </svg>`;
}

const puzzleSvgs = {
  'shield-generator.png': `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r="61" fill="#0b1630" stroke="#05d9e8" stroke-width="6"/>
      <path d="M80 28L123 55V105L80 132L37 105V55Z" fill="#121d3d" stroke="#05d9e8" stroke-width="5" stroke-linejoin="round"/>
      <path d="M80 42L109 61V99L80 118L51 99V61Z" fill="#1a1240" stroke="#ff2a6d" stroke-width="5" stroke-linejoin="round"/>
      <path d="M80 51V109M57 80H103" stroke="#f9f002" stroke-width="7" stroke-linecap="round"/>
    </svg>`,
  'ricochet-panel.png': `
    <svg xmlns="http://www.w3.org/2000/svg" width="192" height="112" viewBox="0 0 192 112">
      <path d="M18 76L54 32H174L138 76Z" fill="#10162b" stroke="#f9f002" stroke-width="6" stroke-linejoin="round"/>
      <path d="M48 66L72 42M82 66L106 42M116 66L140 42" stroke="#05d9e8" stroke-width="6" stroke-linecap="round"/>
      <path d="M28 82H144" stroke="#ff2a6d" stroke-width="4" stroke-linecap="round" opacity="0.78"/>
      <path d="M138 26L174 26L174 62" fill="none" stroke="#f9f002" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  'teleport-gate.png': `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="176" viewBox="0 0 160 176">
      <path d="M80 10L136 44V132L80 166L24 132V44Z" fill="#100b2b" stroke="#d300c5" stroke-width="7" stroke-linejoin="round"/>
      <path d="M80 34L112 55V121L80 142L48 121V55Z" fill="#071226" stroke="#05d9e8" stroke-width="6" stroke-linejoin="round"/>
      <path d="M58 72C74 52 105 63 101 88C97 113 65 118 58 96" fill="none" stroke="#f9f002" stroke-width="7" stroke-linecap="round"/>
      <path d="M101 69L102 92L123 81M58 107L58 84L37 95" fill="none" stroke="#ff2a6d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  'hardlight-bunker.png': `
    <svg xmlns="http://www.w3.org/2000/svg" width="224" height="112" viewBox="0 0 224 112">
      <rect x="16" y="30" width="192" height="66" rx="0" fill="#12182e" stroke="#ff6b35" stroke-width="7"/>
      <rect x="32" y="45" width="160" height="35" fill="#172744" stroke="#05d9e8" stroke-width="5"/>
      <path d="M48 80V48M80 80V48M112 80V48M144 80V48M176 80V48" stroke="#05d9e8" stroke-width="4" opacity="0.82"/>
      <path d="M78 61H146" stroke="#f9f002" stroke-width="8" stroke-linecap="round"/>
      <rect x="24" y="92" width="176" height="10" fill="#05d9e8" opacity="0.38"/>
    </svg>`,
  'fuel-cell.png': `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="168" viewBox="0 0 128 168">
      <defs>
        <linearGradient id="cellCore" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#fff96b"/>
          <stop offset="0.5" stop-color="#f9f002"/>
          <stop offset="1" stop-color="#ff9a3d"/>
        </linearGradient>
        <radialGradient id="cellGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#ff6b35" stop-opacity="0.5"/>
          <stop offset="1" stop-color="#ff6b35" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="64" cy="86" rx="60" ry="78" fill="url(#cellGlow)"/>
      <rect x="46" y="10" width="36" height="14" rx="5" fill="#1c1030" stroke="#ff6b35" stroke-width="4"/>
      <rect x="24" y="22" width="80" height="124" rx="20" fill="#1c1030" stroke="#ff6b35" stroke-width="6"/>
      <rect x="40" y="44" width="48" height="80" rx="10" fill="url(#cellCore)" stroke="#ffb14a" stroke-width="3"/>
      <path d="M70 52L54 86H66L58 116L82 78H68L78 52Z" fill="#1c1030" opacity="0.85"/>
      <path d="M34 36L64 26L94 36" fill="none" stroke="#05d9e8" stroke-width="4" stroke-linecap="round"/>
      <path d="M34 134L64 144L94 134" fill="none" stroke="#05d9e8" stroke-width="4" stroke-linecap="round"/>
      <rect x="30" y="64" width="6" height="40" rx="3" fill="#ff2a6d" opacity="0.85"/>
      <rect x="92" y="64" width="6" height="40" rx="3" fill="#ff2a6d" opacity="0.85"/>
    </svg>`,
  'collapse-node.png': `
    <svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#d300c5" stop-opacity="0.5"/>
          <stop offset="1" stop-color="#d300c5" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="72" cy="72" r="70" fill="url(#nodeGlow)"/>
      <path d="M44 128L72 96L100 128" fill="none" stroke="#d300c5" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
      <path d="M72 14L126 72L72 130L18 72Z" fill="#160a2e" stroke="#d300c5" stroke-width="6" stroke-linejoin="round"/>
      <path d="M72 32L110 72L72 112L34 72Z" fill="#1f1240" stroke="#ff2a6d" stroke-width="4" stroke-linejoin="round"/>
      <path d="M48 70L62 80L70 62L82 86L96 68" fill="none" stroke="#05d9e8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M64 44L72 52L80 44" fill="none" stroke="#f9f002" stroke-width="4" stroke-linecap="round"/>
      <circle cx="72" cy="72" r="7" fill="#f9f002" stroke="#ffffff" stroke-width="2"/>
    </svg>`
};

async function writePng(file, svg, options = {}) {
  await sharp(Buffer.from(svg)).png(options).toFile(file);
}

async function main() {
  ensureDir(backgroundsDir);
  ensureDir(puzzleDir);

  for (const world of worlds) {
    await writePng(path.join(backgroundsDir, world.file), worldSvg(world), { compressionLevel: 9 });
  }

  for (const [file, svg] of Object.entries(puzzleSvgs)) {
    await writePng(path.join(puzzleDir, file), svg, { compressionLevel: 9 });
  }

  const manifestPath = path.join(root, 'assets/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  manifest.backgrounds = {
    ...manifest.backgrounds,
    world1: { path: 'images/backgrounds/world-1-neon-dunes.png', width: 1536, height: 1024, runtimeGroup: 'gameplay' },
    world2: { path: 'images/backgrounds/world-2-chrome-canyons.png', width: 1536, height: 1024, runtimeGroup: 'gameplay' },
    world3: { path: 'images/backgrounds/world-3-prism-bunkers.png', width: 1536, height: 1024, runtimeGroup: 'gameplay' },
    world4: { path: 'images/backgrounds/world-4-vector-vortex.png', width: 1536, height: 1024, runtimeGroup: 'gameplay' },
    world5: { path: 'images/backgrounds/world-5-pixel-wastes.png', width: 1536, height: 1024, runtimeGroup: 'gameplay' },
    world6: { path: 'images/backgrounds/world-6-midnight-citadel.png', width: 1536, height: 1024, runtimeGroup: 'gameplay' }
  };

  manifest.puzzleObjects = {
    ...manifest.puzzleObjects,
    shieldGenerator: { path: 'images/puzzle-objects/shield-generator.png', width: 160, height: 160, runtimeGroup: 'gameplay' },
    ricochetPanel: { path: 'images/puzzle-objects/ricochet-panel.png', width: 192, height: 112, runtimeGroup: 'gameplay' },
    teleportGate: { path: 'images/puzzle-objects/teleport-gate.png', width: 160, height: 176, runtimeGroup: 'gameplay' },
    hardlightBunker: { path: 'images/puzzle-objects/hardlight-bunker.png', width: 224, height: 112, runtimeGroup: 'gameplay' },
    fuelCell: { path: 'images/puzzle-objects/fuel-cell.png', width: 128, height: 168, runtimeGroup: 'gameplay' },
    collapseNode: { path: 'images/puzzle-objects/collapse-node.png', width: 144, height: 144, runtimeGroup: 'gameplay' }
  };

  manifest.tankPortraits = {
    ...(manifest.tankPortraits || {}),
    standard: { path: 'images/tanks/portraits/tank-portrait-standard.png', width: 640, height: 360, runtimeGroups: ['collection', 'supplyDrop'] },
    arctic: { path: 'images/tanks/portraits/tank-portrait-arctic.png', width: 640, height: 360, runtimeGroups: ['collection', 'supplyDrop'] }
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('Generated world backgrounds, flat puzzle objects, and manifest entries.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
