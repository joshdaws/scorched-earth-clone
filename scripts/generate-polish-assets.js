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
    motif: mountainLayer('120,500 230,536 360,486 510,548 670,505 790,555 930,492 1090,540 1260,503 1420,548', '#170728', 1, '#ff2a6d')
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
    motif: buildings('#0b1b31', '#05d9e8')
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
      ${mountainLayer('110,510 220,470 350,530 470,455 610,535 760,462 930,530 1080,470 1260,536 1420,480', '#180a2f', 1, '#d300c5')}
      <g opacity="0.78" stroke="#ff6b35" stroke-width="4" fill="#201339">
        <path d="M250 558V500H380V558"/>
        <path d="M980 558V482H1140V558"/>
        <path d="M600 558V515H760V558"/>
      </g>`
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
      ${mountainLayer('120,535 260,515 390,540 530,500 670,548 820,492 970,540 1120,506 1290,548 1440,518', '#190b23', 1, '#ff6b35')}
      <g fill="none" stroke="#f9f002" stroke-width="4" opacity="0.72">
        <polygon points="380,430 450,500 380,570 310,500"/>
        <polygon points="1080,390 1180,500 1080,610 980,500"/>
        <path d="M700 450C780 380 855 390 930 468"/>
      </g>`
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
      ${mountainLayer('80,532 190,508 300,544 410,500 520,548 650,510 760,552 900,505 1040,548 1160,512 1300,550 1460,518', '#101926', 1, '#f9f002')}
      <g opacity="0.65">
        ${Array.from({ length: 38 }, (_, i) => `<rect x="${80 + (i * 37) % 1380}" y="${380 + (i * 53) % 160}" width="${12 + (i % 4) * 8}" height="${8 + (i % 3) * 9}" fill="${i % 2 ? '#05d9e8' : '#f9f002'}" opacity="0.45"/>`).join('')}
      </g>`
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
      ${mountainLayer('90,532 220,505 350,546 470,498 600,550 735,470 870,550 1010,498 1140,548 1280,510 1430,538', '#070817', 1, '#ff2a6d')}
      <g stroke="#05d9e8" stroke-width="4" fill="#0d1026" opacity="0.86">
        <path d="M650 560V385H710V330H762V265H814V330H866V385H926V560Z"/>
        <path d="M548 560V455H626V560"/>
        <path d="M950 560V455H1028V560"/>
      </g>`
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
    <circle cx="768" cy="560" r="116" fill="${world.horizon}" opacity="0.2" filter="url(#softGlow)"/>
    <g opacity="0.32">${gridLines(world.grid)}</g>
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
      <defs><filter id="g"><feGaussianBlur stdDeviation="3"/></filter></defs>
      <circle cx="80" cy="80" r="58" fill="none" stroke="#05d9e8" stroke-width="5" opacity="0.3"/>
      <circle cx="80" cy="80" r="46" fill="none" stroke="#05d9e8" stroke-width="4"/>
      <path d="M52 92L80 36L108 92L80 124Z" fill="#11182d" stroke="#05d9e8" stroke-width="5" stroke-linejoin="round"/>
      <path d="M80 48V112M62 87H98" stroke="#ff2a6d" stroke-width="6" stroke-linecap="round"/>
      <circle cx="80" cy="80" r="18" fill="#05d9e8" opacity="0.28" filter="url(#g)"/>
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
      <defs><filter id="g"><feGaussianBlur stdDeviation="4"/></filter></defs>
      <ellipse cx="80" cy="88" rx="46" ry="62" fill="#110b2a" stroke="#d300c5" stroke-width="7"/>
      <ellipse cx="80" cy="88" rx="27" ry="40" fill="none" stroke="#05d9e8" stroke-width="5"/>
      <path d="M80 24V6M80 170V152M30 88H8M152 88H130" stroke="#ff2a6d" stroke-width="6" stroke-linecap="round"/>
      <path d="M56 62C78 42 104 58 98 84C92 112 60 104 64 82" fill="none" stroke="#f9f002" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="80" cy="88" rx="58" ry="74" fill="none" stroke="#d300c5" stroke-width="4" opacity="0.25" filter="url(#g)"/>
    </svg>`,
  'hardlight-bunker.png': `
    <svg xmlns="http://www.w3.org/2000/svg" width="224" height="112" viewBox="0 0 224 112">
      <path d="M18 88V52L54 24H170L206 52V88Z" fill="#12182e" stroke="#ff6b35" stroke-width="6" stroke-linejoin="round"/>
      <path d="M54 24L72 52H152L170 24M18 52H206M42 88V62M78 88V62M114 88V62M150 88V62M186 88V62" stroke="#05d9e8" stroke-width="4" opacity="0.72"/>
      <path d="M84 45H140" stroke="#f9f002" stroke-width="7" stroke-linecap="round"/>
      <rect x="34" y="88" width="156" height="12" fill="#05d9e8" opacity="0.32"/>
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
    hardlightBunker: { path: 'images/puzzle-objects/hardlight-bunker.png', width: 224, height: 112, runtimeGroup: 'gameplay' }
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
