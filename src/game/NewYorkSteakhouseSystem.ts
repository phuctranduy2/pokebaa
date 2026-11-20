import * as THREE from 'three';
import manhattanArtUrl from '../assets/images/nyc_steakhouse_manhattan_1794576028324.jpg';
import brooklynBridgeArtUrl from '../assets/images/nyc_brooklyn_bridge_gold_1794576028464.jpg';
import steakStillLifeArtUrl from '../assets/images/prime_steak_still_life_1794576028994.jpg';
import speakeasyBarArtUrl from '../assets/images/nyc_speakeasy_bar_art_1794576029183.jpg';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isSteakhouseOpenAtHour,
  RollingShutterHandle,
  setShutterProgress,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface SteakhouseCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

const steakArtTextureLoader = new THREE.TextureLoader();

function loadSteakhouseArtworkTexture(url: string): THREE.Texture {
  const tex = steakArtTextureLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAgedNyBrickTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Dark weathered brownstone mortar (zero white glare)
  ctx.fillStyle = '#33231d';
  ctx.fillRect(0, 0, w, h);

  const rows = 16;
  const cols = 8;
  const rowH = h / rows;
  const colW = w / cols;
  const palette = ['#5c2319', '#67291d', '#4c1c14', '#542017', '#61261b', '#431811'];

  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : colW * 0.5;
    for (let col = -1; col <= cols; col++) {
      const idx = Math.abs((r * 7 + col * 13) % palette.length);
      ctx.fillStyle = palette[idx];
      ctx.fillRect(col * colW + offset + 3, r * rowH + 3, colW - 6, rowH - 6);

      // Subtle weathered brick shadow bottom edge
      ctx.fillStyle = 'rgba(12, 6, 4, 0.28)';
      ctx.fillRect(col * colW + offset + 3, r * rowH + rowH - 6, colW - 6, 3);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = 4;
  return tex;
}

function createVintageHardwoodFloorTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  // Deep classic Manhattan walnut parquet & warm muted amber-ochre stone inlay
  ctx.fillStyle = '#24140d';
  ctx.fillRect(0, 0, size, size);

  const planks = 8;
  const plankH = size / planks;
  const woodShades = ['#2c1810', '#351e13', '#25140d', '#3b2216', '#2f1a11'];

  for (let y = 0; y < planks; y++) {
    const segOffset = (y % 2) * 128;
    for (let x = -1; x < 3; x++) {
      const sx = x * 256 + segOffset;
      const sy = y * plankH;
      ctx.fillStyle = woodShades[(y * 3 + Math.abs(x)) % woodShades.length];
      ctx.fillRect(sx + 2, sy + 2, 252, plankH - 4);

      // Subtle dark grain lines
      ctx.fillStyle = 'rgba(15, 7, 3, 0.24)';
      ctx.fillRect(sx + 4, sy + plankH * 0.35, 248, 2);
      ctx.fillRect(sx + 4, sy + plankH * 0.72, 248, 2);
    }
  }

  // Subtle brass inlay border motif
  ctx.strokeStyle = 'rgba(168, 128, 56, 0.16)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 9);
  tex.anisotropy = 4;
  return tex;
}

function createSaltBrickBackwallTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#3b150e';
  ctx.fillRect(0, 0, w, h);

  const rows = 8;
  const cols = 8;
  const bw = w / cols;
  const bh = h / rows;
  const saltTones = ['#9a3412', '#b45309', '#7c2d12', '#a13f18', '#8c3114'];

  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (bw * 0.5);
    for (let col = -1; col <= cols; col++) {
      ctx.fillStyle = saltTones[(r * 5 + col * 3 + 10) % saltTones.length];
      ctx.fillRect(col * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSteakhouseSignTexture(): THREE.CanvasTexture {
  const w = 1536;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#120a06');
  grad.addColorStop(1, '#211109');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Classic matte antique gold double border
  ctx.strokeStyle = '#b8923a';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  // Left & Right Heritage Crest Medallions
  [120, w - 120].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, h / 2, 56, 0, Math.PI * 2);
    ctx.fillStyle = '#691818';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ca9e3e';
    ctx.stroke();

    ctx.fillStyle = '#f5deb3';
    ctx.font = '900 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('USDA', cx, h / 2 - 14);
    ctx.font = '800 22px Georgia, serif';
    ctx.fillStyle = '#e5b84b';
    ctx.fillText('PRIME', cx, h / 2 + 18);
  });

  ctx.fillStyle = '#f3dfb6';
  ctx.font = '900 84px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MANHATTAN PRIME', w / 2, h / 2 - 22);

  ctx.fillStyle = '#cfa346';
  ctx.font = '700 30px Georgia, serif';
  ctx.fillText('NEW YORK STEAKHOUSE  •  28-DAY DRY-AGED  •  EST. 1928', w / 2, h / 2 + 58);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSidewalkMenuTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#160e0a';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#b8923a';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.fillStyle = '#6b1818';
  ctx.fillRect(24, 24, w - 48, 86);

  ctx.fillStyle = '#f3dfb6';
  ctx.font = '900 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEW YORK MENU', w / 2, 68);

  const items = [
    ['PORTERHOUSE FOR 2', '$165'],
    ['TOMAHAWK RIBEYE', '$148'],
    ['NY STRIP AU POIVRE', '$96'],
    ['FILET MIGNON', '$88'],
    ['LOBSTER MAC & WEDGE', '$54'],
    ['OLD FASHIONED BAR', '$62'],
  ];

  items.forEach(([label, price], idx) => {
    const y = 165 + idx * 72;
    ctx.fillStyle = '#ead09e';
    ctx.font = '700 24px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 42, y);

    ctx.fillStyle = '#d97706';
    ctx.font = '900 26px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(price, w - 42, y);

    ctx.strokeStyle = 'rgba(184, 146, 58, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(42, y + 26);
    ctx.lineTo(w - 42, y + 26);
    ctx.stroke();
  });

  ctx.fillStyle = '#cfa346';
  ctx.font = '800 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHOP HOUSE  •  ESTABLISHED 1928', w / 2, 592);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createDryAgingHeaderTexture(): THREE.CanvasTexture {
  const w = 768;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1f0d09';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b8923a';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  ctx.fillStyle = '#f3dfb6';
  ctx.font = '900 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DRY-AGING VAULT • 28–45 DAYS', w / 2, 60);

  ctx.fillStyle = '#d99a4e';
  ctx.font = '700 24px Georgia, serif';
  ctx.fillText('USDA PRIME BEEF  •  HIMALAYAN SALT BRICKS', w / 2, 114);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKitchenHeaderTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#180d09';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b8923a';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#f3dfb6';
  ctx.font = '900 46px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HICKORY CHARCOAL GRILL  •  CHEF PASS', w / 2, 60);

  ctx.fillStyle = '#d99a4e';
  ctx.font = '700 24px Georgia, serif';
  ctx.fillText('HAND-CUT MANHATTAN STEAKS SEARED OVER OAK & HICKORY', w / 2, 114);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface SteakhouseBuildResult {
  staticGroup: THREE.Group;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
  updateOperatingHours: (rawHour: number, delta: number, npcController?: NewYorkSteakhouseNpcController | null) => void;
  getClosedFactor: () => number;
}

export function createNewYorkSteakhouseStructure(): SteakhouseBuildResult {
  // Building R2 occupies X = +31 to +50 (center X = 40.5, width = 19.0m), Z = -18.0 to +15.6 (depth = 33.6m)
  // Local origin (0, 0, 0) sits at world (40.5, 0, 8.8)
  const group = new THREE.Group();
  group.position.set(40.5, 0, 8.8);

  const neonMats: THREE.MeshStandardMaterial[] = [];

  // Matte weathered heritage brick — zero plastic sheen
  const brickTex = createAgedNyBrickTexture();
  const brickMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.94,
    metalness: 0.02,
  });

  // Rich dark walnut hardwood floor — zero white tile glare
  const floorTex = createVintageHardwoodFloorTexture();
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.84,
    metalness: 0.03,
  });

  const darkCastIronMat = new THREE.MeshStandardMaterial({
    color: 0x161714,
    roughness: 0.72,
    metalness: 0.28,
  });
  const mahoganyMat = new THREE.MeshStandardMaterial({
    color: 0x2e130b,
    roughness: 0.78,
    metalness: 0.04,
  });
  const darkWalnutMat = new THREE.MeshStandardMaterial({
    color: 0x210e08,
    roughness: 0.82,
    metalness: 0.03,
  });
  const brownstoneMat = new THREE.MeshStandardMaterial({
    color: 0x452d21,
    roughness: 0.90,
    metalness: 0.02,
  });
  const antiqueBrassMat = new THREE.MeshStandardMaterial({
    color: 0xb8913a,
    metalness: 0.58,
    roughness: 0.44,
  });
  const antiqueCopperMat = new THREE.MeshStandardMaterial({
    color: 0x7c3e22,
    metalness: 0.48,
    roughness: 0.50,
  });
  const blackenedSteelMat = new THREE.MeshStandardMaterial({
    color: 0x24201e,
    metalness: 0.45,
    roughness: 0.58,
  });
  const leatherBoothMat = new THREE.MeshStandardMaterial({
    color: 0x6b1818, // Deep heritage oxblood burgundy leather
    roughness: 0.72,
    metalness: 0.02,
  });
  // Warm candlelit ivory-cream damask (replaces glaring white linen)
  const warmLinenMat = new THREE.MeshStandardMaterial({
    color: 0xcab89c,
    roughness: 0.90,
    metalness: 0.01,
  });
  const steakCharMat = new THREE.MeshStandardMaterial({
    color: 0x3b1504,
    roughness: 0.78,
  });
  const steakRareMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.62,
  });
  const wineBottleMat = new THREE.MeshStandardMaterial({
    color: 0x142616,
    roughness: 0.48,
    metalness: 0.12,
  });
  const amberBottleMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.42,
    metalness: 0.10,
  });

  // Warm bronze-tinted glass (cuts exterior glare, preserves clear walk-in sightlines)
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x472d18,
    roughness: 0.58,
    metalness: 0.04,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });

  // Exterior warm sconce bulb mat (stays managed by town dusk/dawn cycle)
  const exteriorLanternBulbMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.6,
  });
  neonMats.push(exteriorLanternBulbMat);

  // Soft classic vintage amber filament material for INTERIOR chandeliers & heat lamps (powers down at 22:00)
  const vintageAmberBulbMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.6,
  });

  // Subtle warm candlelit lamp shade material (powers down at 22:00)
  const lampShadeMat = new THREE.MeshStandardMaterial({
    color: 0xefb866,
    emissive: 0xb45309,
    emissiveIntensity: 0.42,
    roughness: 0.75,
  });

  const emberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    emissive: 0xea580c,
    emissiveIntensity: 0.75,
    roughness: 0.65,
  });

  // Classic Warm Vintage Golden Interior PointLights (2 wide 2400K Tungsten lights — zero glare, lean GPU shader load)
  const lightDefs = [
    { wx: 40.5, wy: 4.3, wz: 5.5, dayInt: 6.5, nightInt: 20.0, dist: 26.0 },
    { wx: 40.5, wy: 4.2, wz: -10.5, dayInt: 6.5, nightInt: 20.0, dist: 25.0 },
  ];
  const interiorPointLights = lightDefs.map((ld) => {
    const light = new THREE.PointLight(0xff9f38, ld.dayInt, ld.dist, 1.35);
    light.position.set(ld.wx, ld.wy, ld.wz);
    return { light, dayInt: ld.dayInt, nightInt: ld.nightInt };
  });

  // 1. Classic Dark Walnut Hardwood Floor (18.8m wide x 33.4m deep)
  const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.08, 33.4), floorMat);
  floorSlab.position.set(0, 0.04, -10.0);
  group.add(floorSlab);

  // Burgundy & Gold Heritage Runner Carpet along the main central aisle
  const aisleCarpetMat = new THREE.MeshStandardMaterial({
    color: 0x4c1212,
    roughness: 0.95,
    metalness: 0.0,
  });
  const aisleCarpet = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.015, 25.0), aisleCarpetMat);
  aisleCarpet.position.set(-1.3, 0.088, -6.8);
  group.add(aisleCarpet);

  // 2. Structural Shell: Aged Red-Brick Upper Walls, Dark Mahogany Wainscoting, Timber Beams
  const backBrick = new THREE.Mesh(new THREE.BoxGeometry(19.0, 9.6, 0.7), brickMat);
  backBrick.position.set(0, 4.8, -26.8);
  group.add(backBrick);

  [-9.3, 9.3].forEach((wx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 9.6, 33.8), brickMat);
    sideWall.position.set(wx, 4.8, -10.0);
    group.add(sideWall);

    // Interior Dark Mahogany Wainscoting Lower Panelling (Y = 0..1.45)
    const wainscot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 32.8), mahoganyMat);
    wainscot.position.set(wx > 0 ? wx - 0.28 : wx + 0.28, 0.76, -10.0);
    group.add(wainscot);

    // Wainscot vertical pilasters for classic wood-paneling relief
    for (let pz = 4.0; pz >= -24.0; pz -= 4.0) {
      const panelRib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.38, 0.16), darkWalnutMat);
      panelRib.position.set(wx > 0 ? wx - 0.29 : wx + 0.29, 0.75, pz);
      group.add(panelRib);
    }

    const chairRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 32.8), antiqueBrassMat);
    chairRail.position.set(wx > 0 ? wx - 0.28 : wx + 0.28, 1.48, -10.0);
    group.add(chairRail);
  });

  // Coffered Dark Wood Dining Ceiling at Y = 5.45m + Cross Timber Beams
  const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.22, 33.2), darkWalnutMat);
  ceilingSlab.position.set(0, 5.45, -10.0);
  group.add(ceilingSlab);

  for (let bz = 4.0; bz >= -24.0; bz -= 4.6) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.26, 0.34), mahoganyMat);
    beam.position.set(0, 5.26, bz);
    group.add(beam);
  }

  // Upper Brownstone & Brick Facade Mass (Y = 5.5..9.6)
  const upperMass = new THREE.Mesh(new THREE.BoxGeometry(19.0, 4.1, 33.8), brickMat);
  upperMass.position.set(0, 7.55, -10.0);
  group.add(upperMass);

  // Brownstone Roof Cornice
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(19.5, 0.55, 34.2), brownstoneMat);
  cornice.position.set(0, 9.65, -10.0);
  group.add(cornice);

  // Upper 2nd-Floor NYC Brownstone Windows along Front Facade (matte non-glare panes + 6-pane mullions)
  const upperWindowPaneMat = new THREE.MeshStandardMaterial({
    color: 0x1a110a,
    emissive: 0x78350f,
    emissiveIntensity: 0.16,
    roughness: 0.94,
    metalness: 0.0,
  });

  [-6.2, -2.2, 2.2, 6.2].forEach((wx) => {
    const winTrim = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.15, 0.18), brownstoneMat);
    winTrim.position.set(wx, 7.45, 6.92);
    group.add(winTrim);

    const winPane = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.72), upperWindowPaneMat);
    winPane.position.set(wx, 7.45, 7.02);
    group.add(winPane);

    // Classic Manhattan window muntin grid (stops flat blank/glare look)
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.74, 0.05), darkCastIronMat);
    vBar.position.set(wx, 7.45, 7.04);
    group.add(vBar);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.06, 0.05), darkCastIronMat);
    hBar.position.set(wx, 7.45, 7.04);
    group.add(hBar);
  });

  // 3. Classic New York Cast-Iron Storefront (localZ = +6.75 -> worldZ = +15.55)
  [-9.15, -5.5, -1.8, 1.8, 5.5, 9.15].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.5, 0.34), darkCastIronMat);
    pilaster.position.set(px, 2.25, 6.75);
    group.add(pilaster);
  });

  [-5.5, 5.5].forEach((sx) => {
    const stallriser = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.72, 0.24), darkCastIronMat);
    stallriser.position.set(sx, 0.36, 6.75);
    group.add(stallriser);

    const windowPane = new THREE.Mesh(new THREE.BoxGeometry(7.1, 3.1, 0.08), glassMat);
    windowPane.position.set(sx, 2.27, 6.75);
    group.add(windowPane);

    const mullionBar = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.07, 0.12), antiqueBrassMat);
    mullionBar.position.set(sx, 3.05, 6.75);
    group.add(mullionBar);
  });

  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.26, 0.30), darkCastIronMat);
  doorHeader.position.set(0, 3.15, 6.75);
  group.add(doorHeader);

  const transomGlass = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 0.08), glassMat);
  transomGlass.position.set(0, 3.72, 6.75);
  group.add(transomGlass);

  // Automatic Brass-Trimmed Double Glass Entrance Doors (userData.noMerge = true!)
  const createSteakhouseDoorLeaf = (isLeft: boolean) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;

    const leafGlass = new THREE.Mesh(new THREE.BoxGeometry(1.66, 2.90, 0.06), glassMat);
    leafGlass.position.y = 1.50;
    leaf.add(leafGlass);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.12, 0.10), darkCastIronMat);
    frameTop.position.y = 2.95;
    leaf.add(frameTop);

    const frameBot = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.34, 0.10), darkCastIronMat);
    frameBot.position.y = 0.19;
    leaf.add(frameBot);

    const brassHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 10), antiqueBrassMat);
    brassHandle.position.set(isLeft ? 0.68 : -0.68, 1.32, 0.08);
    leaf.add(brassHandle);

    return leaf;
  };

  const doorLeft = createSteakhouseDoorLeaf(true);
  doorLeft.position.set(-0.85, 0, 6.70);
  group.add(doorLeft);

  const doorRight = createSteakhouseDoorLeaf(false);
  doorRight.position.set(0.85, 0, 6.70);
  group.add(doorRight);

  // 4. Classic Burgundy Canvas Entrance Awning + Matte Non-Glare Signboard
  const awningMat = new THREE.MeshStandardMaterial({ color: 0x5f1515, roughness: 0.92, metalness: 0.0 });
  const awningSlope = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.14, 1.95), awningMat);
  awningSlope.position.set(0, 3.72, 7.65);
  awningSlope.rotation.x = 0.25;
  group.add(awningSlope);

  const awningValance = new THREE.Mesh(new THREE.BoxGeometry(6.84, 0.32, 0.08), darkCastIronMat);
  awningValance.position.set(0, 3.38, 8.58);
  group.add(awningValance);

  const awningGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(6.86, 0.06, 0.09), antiqueBrassMat);
  awningGoldTrim.position.set(0, 3.24, 8.59);
  group.add(awningGoldTrim);

  // Matte Classic Signboard (roughness 0.92 + gentle warm amber glow -> zero sunlight glare!)
  const signTex = createSteakhouseSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: 0xffd599,
    emissiveMap: signTex,
    emissiveIntensity: 0.18,
    roughness: 0.92,
    metalness: 0.02,
  });

  const signBacking = new THREE.Mesh(new THREE.BoxGeometry(14.0, 2.2, 0.22), darkCastIronMat);
  signBacking.position.set(0, 5.2, 6.90);
  group.add(signBacking);

  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 2.0), signMat);
  signFace.position.set(0, 5.2, 7.02);
  group.add(signFace);

  // Twin Warm Gas-Lamp Wall Sconces flanking entrance
  [-2.35, 2.35].forEach((lx) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.28), darkCastIronMat);
    bracket.position.set(lx, 2.55, 6.95);
    group.add(bracket);

    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), exteriorLanternBulbMat);
    lantern.position.set(lx, 2.75, 7.08);
    group.add(lantern);
  });

  // Sidewalk Heritage Menu Easel Stand (matte finish)
  const menuStand = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.55, 0.14), mahoganyMat);
  menuStand.position.set(-3.1, 0.85, 7.55);
  menuStand.rotation.y = 0.22;
  group.add(menuStand);

  const menuTex = createSidewalkMenuTexture();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xffd599,
    emissiveMap: menuTex,
    emissiveIntensity: 0.16,
    roughness: 0.90,
    metalness: 0.02,
  });

  const menuFace = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.15), menuMat);
  menuFace.position.set(-3.08, 1.02, 7.63);
  menuFace.rotation.y = 0.22;
  group.add(menuFace);

  // 5. Five Hanging Vintage Brass Chandeliers with Warm Amber Candle Shades
  [2.0, -4.5, -10.5, -16.5, -22.5].forEach((cz) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), antiqueBrassMat);
    rod.position.set(0, 4.9, cz);
    group.add(rod);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.04, 8, 24), antiqueBrassMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 4.42, cz);
    group.add(ring);

    for (let b = 0; b < 6; b++) {
      const ang = (b * Math.PI * 2) / 6;
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.14, 10), lampShadeMat);
      shade.position.set(Math.cos(ang) * 0.82, 4.54, cz + Math.sin(ang) * 0.82);
      group.add(shade);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), vintageAmberBulbMat);
      bulb.position.set(Math.cos(ang) * 0.82, 4.46, cz + Math.sin(ang) * 0.82);
      group.add(bulb);
    }
  });

  // Interior Warm Wall Sconces along West & East brick walls above wainscoting
  [-4.2, -9.8, -15.4, -20.8].forEach((sz) => {
    [-8.95, 8.95].forEach((sx) => {
      const sconceBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.18), antiqueBrassMat);
      sconceBack.position.set(sx, 2.35, sz);
      group.add(sconceBack);

      const sconceShade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 10), lampShadeMat);
      sconceShade.position.set(sx > 0 ? sx - 0.14 : sx + 0.14, 2.48, sz);
      group.add(sconceShade);
    });
  });

  // 6. Front Maitre D' Host Podium
  const hostStand = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.12, 0.68), mahoganyMat);
  hostStand.position.set(-2.2, 0.60, 3.6);
  group.add(hostStand);

  const hostLamp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 12), lampShadeMat);
  hostLamp.position.set(-1.85, 1.34, 3.6);
  group.add(hostLamp);

  // 7. Glass-Fronted Himalayan Salt & Dry-Aging Beef Vault (Gunmetal Bronze Frame + Salt Brick Wall — NO glare!)
  const vaultFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.2, 4.6), blackenedSteelMat);
  vaultFrame.position.set(-8.55, 1.68, -1.2);
  group.add(vaultFrame);

  const saltBrickTex = createSaltBrickBackwallTexture();
  const saltBackMat = new THREE.MeshStandardMaterial({
    map: saltBrickTex,
    emissive: 0x9a3412,
    emissiveMap: saltBrickTex,
    emissiveIntensity: 0.25,
    roughness: 0.88,
  });
  const vaultBackGlow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 4.2), saltBackMat);
  vaultBackGlow.position.set(-8.02, 1.72, -1.2);
  group.add(vaultBackGlow);

  const vaultGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 4.3), glassMat);
  vaultGlass.position.set(-7.92, 1.72, -1.2);
  group.add(vaultGlass);

  // Brass hanging rail & dry-aged ribeye subprimals
  const meatRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.0, 8), antiqueBrassMat);
  meatRail.rotation.x = Math.PI / 2;
  meatRail.position.set(-8.22, 2.75, -1.2);
  group.add(meatRail);

  [-2.6, -1.7, -0.8, 0.1].forEach((mz) => {
    const cut = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 10), steakRareMat);
    cut.position.set(-8.22, 2.05, mz);
    group.add(cut);
  });

  const vaultSignTex = createDryAgingHeaderTexture();
  const vaultSignMat = new THREE.MeshStandardMaterial({
    map: vaultSignTex,
    emissive: 0xffd599,
    emissiveMap: vaultSignTex,
    emissiveIntensity: 0.16,
    roughness: 0.90,
  });

  const vaultHeader = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.85), vaultSignMat);
  vaultHeader.rotation.y = Math.PI / 2;
  vaultHeader.position.set(-7.96, 3.68, -1.2);
  group.add(vaultHeader);

  // 8. Classic Mahogany Bar & Warm Illuminated Spirit Backbar (East Wall — NO solid white slab!)
  const barCounter = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.12, 10.6), mahoganyMat);
  barCounter.position.set(6.35, 0.60, -6.8);
  group.add(barCounter);

  const barTop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 10.8), darkWalnutMat);
  barTop.position.set(6.35, 1.18, -6.8);
  group.add(barTop);

  const barBrassRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 10.4, 8), antiqueBrassMat);
  barBrassRail.rotation.x = Math.PI / 2;
  barBrassRail.position.set(5.72, 0.22, -6.8);
  group.add(barBrassRail);

  [-10.5, -8.7, -6.9, -5.1, -3.3].forEach((sz) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.72, 10), antiqueBrassMat);
    stem.position.set(5.35, 0.40, sz);
    group.add(stem);

    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14), leatherBoothMat);
    cushion.position.set(5.35, 0.78, sz);
    group.add(cushion);
  });

  // Backbar Bottle Display Cabinet (Warm dark wood + glowing amber shelf strip + liquor bottles!)
  const backbarUnit = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.0, 10.2), darkWalnutMat);
  backbarUnit.position.set(8.65, 1.56, -6.8);
  group.add(backbarUnit);

  const backbarCoveMat = new THREE.MeshStandardMaterial({
    color: 0x3b1a0a,
    emissive: 0x92400e,
    emissiveIntensity: 0.28,
    roughness: 0.88,
  });
  const backbarRecess = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.65, 9.4), backbarCoveMat);
  backbarRecess.position.set(8.30, 2.02, -6.8);
  group.add(backbarRecess);

  // 3 Wooden Backbar Liquor Shelves + Bourbon / Wine Bottles
  [1.45, 2.0, 2.55].forEach((shelfY, rowIdx) => {
    const shelfBoard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 9.4), mahoganyMat);
    shelfBoard.position.set(8.22, shelfY, -6.8);
    group.add(shelfBoard);

    for (let bz = -11.0; bz <= -2.6; bz += 0.55) {
      const matChoice = ((Math.round(bz * 2) + rowIdx) % 2 === 0) ? amberBottleMat : wineBottleMat;
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.30, 8), matChoice);
      bottle.position.set(8.20, shelfY + 0.17, bz);
      group.add(bottle);
    }
  });

  // 9. Helper for Classic Warm-Linen Steak Tables with Brass Table Lamps & Sizzling Steak Skillets
  const addSteakDiningTable = (tx: number, tz: number, withBooths: boolean) => {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.34, 0.72, 12), darkCastIronMat);
    ped.position.set(tx, 0.40, tz);
    group.add(ped);

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 2.05), warmLinenMat);
    tableTop.position.set(tx, 0.78, tz);
    group.add(tableTop);

    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.10, 0.22, 10), antiqueBrassMat);
    lampBase.position.set(tx, 0.93, tz);
    group.add(lampBase);
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 12), lampShadeMat);
    lampShade.position.set(tx, 1.08, tz);
    group.add(lampShade);

    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 10), wineBottleMat);
    bottle.position.set(tx + 0.18, 0.96, tz - 0.24);
    group.add(bottle);

    [-0.52, 0.52].forEach((pz) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.03, 14), warmLinenMat);
      plate.position.set(tx - 0.16, 0.835, tz + pz);
      group.add(plate);

      const steak = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.15), steakCharMat);
      steak.position.set(tx - 0.18, 0.865, tz + pz);
      steak.rotation.y = 0.25;
      group.add(steak);
    });

    if (withBooths) {
      [-1.32, 1.32].forEach((bz) => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.44, 0.65), leatherBoothMat);
        seat.position.set(tx, 0.26, tz + bz);
        group.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.78, 0.18), leatherBoothMat);
        back.position.set(tx, 0.76, tz + bz + (bz > 0 ? 0.24 : -0.24));
        group.add(back);
      });
    } else {
      [-1.25, 1.25].forEach((cz) => {
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.45, 0.52), leatherBoothMat);
        chairSeat.position.set(tx, 0.26, tz + cz);
        group.add(chairSeat);

        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.55, 0.08), mahoganyMat);
        chairBack.position.set(tx, 0.72, tz + cz + (cz > 0 ? 0.22 : -0.22));
        group.add(chairBack);
      });
    }
  };

  // 3 West Wall Tufted Leather Booths
  addSteakDiningTable(-7.0, -7.2, true);
  addSteakDiningTable(-7.0, -12.6, true);
  addSteakDiningTable(-7.0, -18.0, true);

  // 3 Center-East Tables
  addSteakDiningTable(1.8, -5.8, false);
  addSteakDiningTable(1.8, -11.5, false);
  addSteakDiningTable(2.2, -17.8, false);

  // 10. Ornate Gallery Paintings Hung on the Steakhouse Walls (Real Artwork Textures, Zero Glare!)
  const artTextures = {
    manhattan: loadSteakhouseArtworkTexture(manhattanArtUrl),
    brooklyn: loadSteakhouseArtworkTexture(brooklynBridgeArtUrl),
    steakStillLife: loadSteakhouseArtworkTexture(steakStillLifeArtUrl),
    speakeasy: loadSteakhouseArtworkTexture(speakeasyBarArtUrl),
  };

  const addFramedGalleryPainting = (
    tex: THREE.Texture,
    px: number,
    py: number,
    pz: number,
    rotY: number,
    width: number,
    height: number
  ) => {
    const frameGroup = new THREE.Group();
    frameGroup.position.set(px, py, pz);
    frameGroup.rotation.y = rotY;
    frameGroup.userData.noMerge = true;

    // Outer dark walnut frame box
    const outerFrame = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.26, height + 0.26, 0.06),
      darkWalnutMat
    );
    frameGroup.add(outerFrame);

    // Inner antique brass fillet border
    const brassFillet = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.10, height + 0.10, 0.075),
      antiqueBrassMat
    );
    frameGroup.add(brassFillet);

    // Oil painting / vintage photograph canvas (matte oil finish, subtle warm candlelight visibility)
    const artMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffd296,
      emissiveMap: tex,
      emissiveIntensity: 0.14,
      roughness: 0.88,
      metalness: 0.0,
    });
    const artCanvas = new THREE.Mesh(new THREE.PlaneGeometry(width, height), artMat);
    artCanvas.position.z = 0.045;
    artCanvas.userData.noMerge = true;
    frameGroup.add(artCanvas);

    // Vintage Brass Picture-Light Bar mounted above the painting
    const lightArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.24), antiqueBrassMat);
    lightArm.position.set(0, height * 0.5 + 0.18, 0.10);
    frameGroup.add(lightArm);

    const lightHood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, width * 0.45, 10),
      antiqueBrassMat
    );
    lightHood.rotation.z = Math.PI / 2;
    lightHood.position.set(0, height * 0.5 + 0.18, 0.22);
    frameGroup.add(lightHood);

    group.add(frameGroup);
  };

  // West Wall Gallery Paintings above the 3 Oxblood Booths
  addFramedGalleryPainting(artTextures.manhattan, -9.02, 2.85, -7.2, Math.PI / 2, 2.6, 1.95);
  addFramedGalleryPainting(artTextures.brooklyn, -9.02, 2.85, -12.6, Math.PI / 2, 2.6, 1.95);
  addFramedGalleryPainting(artTextures.steakStillLife, -9.02, 2.85, -18.0, Math.PI / 2, 2.6, 1.95);

  // East Wall Paintings flanking the Bar & Front Dining Entry
  addFramedGalleryPainting(artTextures.speakeasy, 9.02, 2.85, 2.2, -Math.PI / 2, 2.6, 1.95);
  addFramedGalleryPainting(artTextures.steakStillLife, 9.02, 2.85, -15.8, -Math.PI / 2, 2.5, 1.88);
  addFramedGalleryPainting(artTextures.manhattan, 9.02, 2.85, -20.5, -Math.PI / 2, 2.5, 1.88);

  // East Wall Centerpiece above the Backbar Cabinet
  addFramedGalleryPainting(artTextures.speakeasy, 8.95, 4.10, -6.8, -Math.PI / 2, 3.0, 1.75);

  // 11. Open Charcoal & Hickory Steak Grill Kitchen (Copper & Blackened Steel Hood — ZERO glare!)
  const passCounter = new THREE.Mesh(new THREE.BoxGeometry(11.6, 1.08, 0.95), mahoganyMat);
  passCounter.position.set(-1.5, 0.58, -22.4);
  group.add(passCounter);

  const passTop = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.08, 1.1), darkWalnutMat);
  passTop.position.set(-1.5, 1.14, -22.4);
  group.add(passTop);

  // Hammered Antique Copper & Blackened Iron Kitchen Exhaust Hood
  const exhaustHood = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.15, 1.8), antiqueCopperMat);
  exhaustHood.position.set(-1.5, 3.85, -24.8);
  group.add(exhaustHood);

  const hoodUpperFlue = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.1, 1.3), blackenedSteelMat);
  hoodUpperFlue.position.set(-1.5, 4.85, -25.0);
  group.add(hoodUpperFlue);

  const hoodTrim = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.14, 1.86), antiqueBrassMat);
  hoodTrim.position.set(-1.5, 3.26, -24.8);
  group.add(hoodTrim);

  // Warm Engraved Header Sign on Exhaust Hood Front
  const kitchenSignTex = createKitchenHeaderTexture();
  const kitchenSignMat = new THREE.MeshStandardMaterial({
    map: kitchenSignTex,
    emissive: 0xffd599,
    emissiveMap: kitchenSignTex,
    emissiveIntensity: 0.18,
    roughness: 0.90,
  });
  const kitchenSign = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 0.92), kitchenSignMat);
  kitchenSign.position.set(-1.5, 3.86, -23.88);
  group.add(kitchenSign);

  // Warm Hanging Copper Heat-Lamp Bells over the Chef Pass Counter
  [-4.5, -2.5, -0.5, 1.5].forEach((lx) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 6), blackenedSteelMat);
    cord.position.set(lx, 2.7, -22.4);
    group.add(cord);

    const heatBell = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 12), antiqueCopperMat);
    heatBell.position.set(lx, 2.12, -22.4);
    group.add(heatBell);

    const heatBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), vintageAmberBulbMat);
    heatBulb.position.set(lx, 2.02, -22.4);
    group.add(heatBulb);
  });

  // Charcoal Grill Station with Glowing Amber-Red Embers & Sizzling Cuts
  const grillBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.96, 1.25), darkCastIronMat);
  grillBody.position.set(-1.5, 0.52, -25.1);
  group.add(grillBody);

  const emberBed = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 0.92), emberGlowMat);
  emberBed.position.set(-1.5, 1.02, -25.1);
  group.add(emberBed);

  [-3.2, -2.1, -0.9, 0.2].forEach((gx) => {
    const grillingSteak = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.34), steakCharMat);
    grillingSteak.position.set(gx, 1.08, -25.1);
    group.add(grillingSteak);
  });

  // Track interior-only painting mats so artwork lighting powers off cleanly at 22:00
  const artMats: THREE.MeshStandardMaterial[] = [];
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      if (
        obj.material !== exteriorLanternBulbMat &&
        obj.material !== signMat &&
        obj.material !== menuMat &&
        obj.material !== upperWindowPaneMat &&
        obj.material.emissiveIntensity > 0 &&
        obj.material !== vintageAmberBulbMat &&
        obj.material !== lampShadeMat &&
        obj.material !== emberGlowMat &&
        obj.material !== saltBackMat &&
        obj.material !== backbarCoveMat &&
        obj.material !== vaultSignMat &&
        obj.material !== kitchenSignMat
      ) {
        artMats.push(obj.material);
      }
    }
  });

  // Security Rolling Shutter inside front entrance (local Z = 6.52 -> world Z = 15.32, width = 3.55m)
  const shutterTex = createRollingShutterTexture({
    title: 'MANHATTAN PRIME • STEAKHOUSE',
    hoursLabel: 'GIỜ MỞ CỬA: 07:00 – 22:00',
    accentHex: '#b45309',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.72,
    metalness: 0.28,
  });
  const shutterHousingMat = new THREE.MeshStandardMaterial({
    color: 0x161714,
    roughness: 0.65,
    metalness: 0.35,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    group,
    { id: 'steakhouse_main', axis: 'x', pos: 6.52, spanCenter: 0, width: 3.55, baseY: 0.08, topY: 3.12 },
    shutterMat,
    shutterHousingMat
  );

  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    npcController?: NewYorkSteakhouseNpcController | null
  ) => {
    const isOpen = isSteakhouseOpenAtHour(rawHour);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (rawHour < 7.0 || rawHour >= 22.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, Math.max(0, mainShutter.progress - delta * 1.15));
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
    } else {
      closingElapsed += delta;
      const canClose =
        closingElapsed >= 20.0 ||
        (closingElapsed >= 1.5 && Boolean(npcController?.isFullyClosedAndEmpty()));
      if (canClose) {
        setShutterProgress(mainShutter, Math.min(1.0, mainShutter.progress + delta * 0.75));
      }
    }
    wasOpen = isOpen;

    const litScale = 1.0 - mainShutter.progress;
    vintageAmberBulbMat.emissiveIntensity = 0.65 * litScale;
    lampShadeMat.emissiveIntensity = 0.42 * litScale;
    emberGlowMat.emissiveIntensity = 0.75 * litScale;
    saltBackMat.emissiveIntensity = 0.25 * litScale;
    backbarCoveMat.emissiveIntensity = 0.28 * litScale;
    vaultSignMat.emissiveIntensity = 0.16 * litScale;
    kitchenSignMat.emissiveIntensity = 0.18 * litScale;
    upperWindowPaneMat.emissiveIntensity = 0.16 * litScale;
    for (const am of artMats) {
      am.emissiveIntensity = 0.14 * litScale;
    }
  };

  return {
    staticGroup: group,
    doorLeft,
    doorRight,
    neonMats,
    interiorPointLights,
    updateOperatingHours,
    getClosedFactor: () => mainShutter.progress,
  };
}

interface SteakStaffEntry {
  group: THREE.Group;
  head: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  homePos: THREE.Vector3;
  baseYaw: number;
  phase: number;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitDone?: boolean;
  exitPhaseRef?: { phase: number };
  glbHandle?: GlbHumanHandle;
}

interface SteakSeatedDiner {
  group: THREE.Group;
  hips: THREE.Group;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  homePos: THREE.Vector3;
  baseYaw: number;
  isBooth: boolean;
  phase: number;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitDone?: boolean;
  exitPhaseRef?: { phase: number };
  glbHandle?: GlbHumanHandle;
}

export class NewYorkSteakhouseNpcController {
  public rootGroup: THREE.Group = new THREE.Group();
  private staff: SteakStaffEntry[] = [];
  private seatedDiners: SteakSeatedDiner[] = [];
  private waiterGroup: THREE.Group | null = null;
  private waiterLeftLeg: THREE.Object3D | null = null;
  private waiterRightLeg: THREE.Object3D | null = null;
  private waiterLeftArm: THREE.Object3D | null = null;
  private waiterRightArm: THREE.Object3D | null = null;
  private waiterGlbHandle: GlbHumanHandle | null = null;
  private waiterHomePos = new THREE.Vector3();
  private waiterExitPath: THREE.Vector3[] = [];
  private waiterExitWpRef = { idx: 0 };
  private waiterExitDone = false;
  private waiterExitPhaseRef = { phase: 0 };
  private waiterWaypoints = [
    { x: 37.8, z: -12.6 },
    { x: 37.8, z: -4.2 },
    { x: 37.8, z: 2.2 },
    { x: 40.5, z: -2.0 },
    { x: 39.5, z: -12.2 },
  ];
  private waiterWpIndex = 1;
  private waiterPause = 0;
  private waiterCycle = 0;
  private timer = 0;
  private isOpenState: boolean | null = null;
  private closingActive = false;
  private closingTimer = 0;
  private fullyClosedAndEmpty = false;

  constructor(helpers: SteakhouseCharacterHelpers) {
    // 1. Maitre D' Host at Front Stand
    const host = this.buildCharacter(helpers, 0x0f172a, 0x090d14, 0x7f1d1d, '#f8d9c0', 'smile', false, false);
    host.group.position.set(38.3, 0.08, 11.4);
    host.group.rotation.y = 0.25;
    const hostGlb = attachGlbHumanToNpc({
      modelSource: CASHIER_NPC_MODEL.modelSource,
      hostGroup: host.group,
      fallbackMeshes: [host.fallbackGroup],
      targetHeight: CASHIER_NPC_MODEL.targetHeight,
      rotationY: CASHIER_NPC_MODEL.rotationY,
      clipProfile: CASHIER_NPC_MODEL.clipProfile,
      initialState: 'Idle',
      phaseOffset: 0.2,
    });
    this.rootGroup.add(host.group);
    this.staff.push({
      group: host.group,
      head: host.head,
      rightArm: host.rightArm,
      leftArm: host.leftArm,
      leftLeg: host.leftLeg,
      rightLeg: host.rightLeg,
      homePos: host.group.position.clone(),
      baseYaw: 0.25,
      phase: 0,
      glbHandle: hostGlb,
    });

    // 2. Classic NY Bartender behind East Mahogany Bar
    const bartender = this.buildCharacter(helpers, 0xe7dfd3, 0x18181b, 0x18181b, '#f1c9a5', 'smile', false, false);
    bartender.group.position.set(48.0, 0.08, 2.0);
    bartender.group.rotation.y = -Math.PI / 2;
    const bartenderSpec = pickStationaryCivilianModel(221);
    const bartenderGlb = attachGlbHumanToNpc({
      modelSource: bartenderSpec.modelSource,
      hostGroup: bartender.group,
      fallbackMeshes: [bartender.fallbackGroup],
      targetHeight: bartenderSpec.targetHeight,
      rotationY: bartenderSpec.rotationY,
      clipProfile: bartenderSpec.clipProfile,
      initialState: 'Idle',
      phaseOffset: 1.5,
    });
    this.rootGroup.add(bartender.group);
    this.staff.push({
      group: bartender.group,
      head: bartender.head,
      rightArm: bartender.rightArm,
      leftArm: bartender.leftArm,
      leftLeg: bartender.leftLeg,
      rightLeg: bartender.rightLeg,
      homePos: bartender.group.position.clone(),
      baseYaw: -Math.PI / 2,
      phase: 1.5,
      glbHandle: bartenderGlb,
    });

    // 3. Head Grill Chef in Coat & Toque Hat at Open Charcoal Grill
    const chef = this.buildCharacter(helpers, 0xefe8dc, 0x18181b, 0x7f1d1d, '#e8be9e', 'smile', true, false);
    chef.group.position.set(39.0, 0.08, -15.4);
    chef.group.rotation.y = Math.PI;
    const chefSpec = pickStationaryCivilianModel(222);
    const chefGlb = attachGlbHumanToNpc({
      modelSource: chefSpec.modelSource,
      hostGroup: chef.group,
      fallbackMeshes: [chef.fallbackGroup],
      targetHeight: chefSpec.targetHeight,
      rotationY: chefSpec.rotationY,
      clipProfile: chefSpec.clipProfile,
      initialState: 'Idle',
      phaseOffset: 2.8,
    });
    this.rootGroup.add(chef.group);
    this.staff.push({
      group: chef.group,
      head: chef.head,
      rightArm: chef.rightArm,
      leftArm: chef.leftArm,
      leftLeg: chef.leftLeg,
      rightLeg: chef.rightLeg,
      homePos: chef.group.position.clone(),
      baseYaw: Math.PI,
      phase: 2.8,
      glbHandle: chefGlb,
    });

    // 4. Patrolling Waiter carrying a Steak Tray along the central dining aisle
    const waiter = this.buildCharacter(helpers, 0xeae2d6, 0x090d14, 0x7f1d1d, '#f5cfa0', 'smile', false, true);
    waiter.group.position.set(this.waiterWaypoints[0].x, 0.08, this.waiterWaypoints[0].z);
    const waiterSpec = pickStationaryCivilianModel(223);
    this.waiterGlbHandle = attachGlbHumanToNpc({
      modelSource: waiterSpec.modelSource,
      hostGroup: waiter.group,
      fallbackMeshes: [waiter.fallbackGroup],
      targetHeight: waiterSpec.targetHeight,
      rotationY: waiterSpec.rotationY,
      clipProfile: waiterSpec.clipProfile,
      initialState: 'Walk',
      phaseOffset: 0.9,
    });
    this.rootGroup.add(waiter.group);
    this.waiterGroup = waiter.group;
    this.waiterLeftLeg = waiter.leftLeg;
    this.waiterRightLeg = waiter.rightLeg;
    this.waiterLeftArm = waiter.leftArm;
    this.waiterRightArm = waiter.rightArm;
    this.waiterHomePos.copy(waiter.group.position);

    // 5. Six Seated NYC Diners in Red-Leather Booths & Warm-Linen Tables
    const dinerSeats = [
      { x: 33.5, z: 0.35, yaw: 0, isBooth: true, shirt: 0x1e3a8a, pants: 0x18181b, skin: '#f8d9c0', phase: 0.2 },
      { x: 33.5, z: 2.85, yaw: Math.PI, isBooth: true, shirt: 0x701a75, pants: 0x18181b, skin: '#f1c9a5', phase: 1.1 },
      { x: 33.5, z: -5.05, yaw: 0, isBooth: true, shirt: 0x334155, pants: 0x0f172a, skin: '#e8be9e', phase: 2.0 },
      { x: 33.5, z: -2.55, yaw: Math.PI, isBooth: true, shirt: 0x065f46, pants: 0x18181b, skin: '#f5cfa0', phase: 2.9 },
      { x: 42.3, z: 1.78, yaw: 0, isBooth: false, shirt: 0x3f3f46, pants: 0x090d14, skin: '#f8d9c0', phase: 3.7 },
      { x: 42.3, z: -3.95, yaw: 0, isBooth: false, shirt: 0x7c2d12, pants: 0x18181b, skin: '#f1c9a5', phase: 4.5 },
    ];

    dinerSeats.forEach((ds, idx) => {
      const diner = this.buildSeatedDiner(helpers, ds.shirt, ds.pants, ds.skin);
      diner.group.position.set(ds.x, 0.08, ds.z);
      diner.group.rotation.y = ds.yaw;
      const dinerSpec = pickSeatedCivilianModel(230 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: dinerSpec.modelSource,
        hostGroup: diner.group,
        fallbackMeshes: [diner.hips],
        targetHeight: dinerSpec.targetHeight,
        rotationY: dinerSpec.rotationY,
        clipProfile: dinerSpec.clipProfile,
        initialState: 'Sit',
        phaseOffset: ds.phase,
      });
      this.rootGroup.add(diner.group);
      this.seatedDiners.push({
        group: diner.group,
        hips: diner.hips,
        head: diner.head,
        leftArm: diner.leftArm,
        rightArm: diner.rightArm,
        leftLeg: diner.leftLeg,
        rightLeg: diner.rightLeg,
        homePos: diner.group.position.clone(),
        baseYaw: ds.yaw,
        isBooth: ds.isBooth,
        phase: ds.phase,
        glbHandle,
      });
    });

    // 6. Guest standing at the Dry-Aging Vault admiring the Prime Beef Cuts
    const vaultGuest = this.buildCharacter(helpers, 0x334155, 0x0f172a, 0xb8913a, '#f8d9c0', 'neutral', false, false);
    vaultGuest.group.position.set(34.0, 0.08, 7.6);
    vaultGuest.group.rotation.y = -Math.PI / 2;
    const vaultSpec = pickStationaryCivilianModel(240);
    const vaultGlb = attachGlbHumanToNpc({
      modelSource: vaultSpec.modelSource,
      hostGroup: vaultGuest.group,
      fallbackMeshes: [vaultGuest.fallbackGroup],
      targetHeight: vaultSpec.targetHeight,
      rotationY: vaultSpec.rotationY,
      clipProfile: vaultSpec.clipProfile,
      initialState: 'Idle',
      phaseOffset: 3.3,
    });
    this.rootGroup.add(vaultGuest.group);
    this.staff.push({
      group: vaultGuest.group,
      head: vaultGuest.head,
      rightArm: vaultGuest.rightArm,
      leftArm: vaultGuest.leftArm,
      leftLeg: vaultGuest.leftLeg,
      rightLeg: vaultGuest.rightLeg,
      homePos: vaultGuest.group.position.clone(),
      baseYaw: -Math.PI / 2,
      phase: 3.3,
      glbHandle: vaultGlb,
    });
  }

  private buildCharacter(
    helpers: SteakhouseCharacterHelpers,
    shirtHex: number,
    pantsHex: number,
    tieHex: number,
    skinHex: string,
    expr: string,
    isChef: boolean,
    carriesTray: boolean
  ) {
    const group = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    group.add(fallbackGroup);
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.78 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.75 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.82 });
    const tieMat = new THREE.MeshStandardMaterial({ color: tieHex, roughness: 0.6 });

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.1, 0.72, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
    leftLegMesh.position.y = -0.36;
    leftLeg.add(leftLegMesh);
    fallbackGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.1, 0.72, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
    rightLegMesh.position.y = -0.36;
    rightLeg.add(rightLegMesh);
    fallbackGroup.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), shirtMat);
    torso.position.set(0, 1.01, 0);
    fallbackGroup.add(torso);

    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.30, 0.02), tieMat);
    tie.position.set(0, 1.05, 0.125);
    fallbackGroup.add(tie);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.29, 1.24, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
    leftArmMesh.position.y = -0.22;
    leftArm.add(leftArmMesh);
    fallbackGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.29, 1.24, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
    rightArmMesh.position.y = -0.22;
    rightArm.add(rightArmMesh);
    fallbackGroup.add(rightArm);

    const faceTex = helpers.createFaceTexture(expr, skinHex);
    const head = helpers.createHeadMesh(skinMat, faceTex, 0.32, 0.32, 0.32);
    head.position.set(0, 1.48, 0);
    fallbackGroup.add(head);

    if (isChef) {
      const chefHat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.17, 0.32, 14),
        new THREE.MeshStandardMaterial({ color: 0xeae2d6, roughness: 0.85 })
      );
      chefHat.position.set(0, 1.78, 0);
      fallbackGroup.add(chefHat);
    }

    if (carriesTray) {
      rightArm.rotation.x = -1.1;
      const tray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.24, 0.03, 14),
        new THREE.MeshStandardMaterial({ color: 0x9c7c38, metalness: 0.5, roughness: 0.45 })
      );
      tray.position.set(0.0, -0.34, 0.28);
      rightArm.add(tray);

      const steakOnTray = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.05, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x5c1d0c, roughness: 0.75 })
      );
      steakOnTray.position.set(0.0, -0.30, 0.28);
      rightArm.add(steakOnTray);
    }

    return { group, fallbackGroup, head, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildSeatedDiner(
    helpers: SteakhouseCharacterHelpers,
    shirtHex: number,
    pantsHex: number,
    skinHex: string
  ) {
    const group = new THREE.Group();
    const hips = new THREE.Group();
    hips.position.y = -0.22;
    group.add(hips);

    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.78 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.75 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.82 });

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.1, 0.72, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.68, 0.16), pantsMat);
    leftLegMesh.position.y = -0.34;
    leftLeg.add(leftLegMesh);
    leftLeg.rotation.x = -1.35;
    hips.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.1, 0.72, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.68, 0.16), pantsMat);
    rightLegMesh.position.y = -0.34;
    rightLeg.add(rightLegMesh);
    rightLeg.rotation.x = -1.35;
    hips.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.22), shirtMat);
    torso.position.set(0, 1.02, 0);
    hips.add(torso);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.26, 1.22, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.12), shirtMat);
    leftArmMesh.position.y = -0.20;
    leftArm.add(leftArmMesh);
    leftArm.rotation.x = -0.6;
    hips.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.26, 1.22, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.12), shirtMat);
    rightArmMesh.position.y = -0.20;
    rightArm.add(rightArmMesh);
    rightArm.rotation.x = -0.65;
    hips.add(rightArm);

    const faceTex = helpers.createFaceTexture('smile', skinHex);
    const head = helpers.createHeadMesh(skinMat, faceTex, 0.31, 0.31, 0.31);
    head.position.set(0, 1.48, 0);
    hips.add(head);

    return { group, hips, head, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildExitPathFrom(x: number, z: number, idx: number, isBoothDiner = false): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const sideOutX = idx % 2 === 0 ? 33.5 : 47.5;

    if (z < -12.8) {
      // Head grill chef behind pass counter: exit around east pass gap (X=45.4)
      pts.push(new THREE.Vector3(45.4, 0.08, -14.8));
      pts.push(new THREE.Vector3(45.4, 0.08, -11.5));
      pts.push(new THREE.Vector3(40.0, 0.08, -11.5));
    } else if (x > 45.2) {
      // Bartender behind east bar counter
      pts.push(new THREE.Vector3(48.0, 0.08, 8.6));
      pts.push(new THREE.Vector3(40.5, 0.08, 8.8));
    } else if (isBoothDiner || x < 35.8) {
      // West booth diners or dry-aging vault guest
      pts.push(new THREE.Vector3(36.2, 0.08, z));
      pts.push(new THREE.Vector3(39.8, 0.08, Math.max(-10.0, z)));
    } else if (x > 40.8) {
      // Center-east table diners step into center aisle
      pts.push(new THREE.Vector3(39.8, 0.08, z));
    }

    pts.push(new THREE.Vector3(40.5, 0.08, 13.6));
    pts.push(new THREE.Vector3(40.5, 0.08, 15.6));
    pts.push(new THREE.Vector3(40.5, 0.08, 18.4));
    pts.push(new THREE.Vector3(sideOutX, 0.08, 19.0));
    return pts;
  }

  private beginClosingEvacuation() {
    this.closingActive = true;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    let idx = 0;

    for (const st of this.staff) {
      st.group.visible = true;
      st.head.rotation.y = 0;
      st.exitPath = this.buildExitPathFrom(st.group.position.x, st.group.position.z, idx++, false);
      st.exitWpRef = { idx: 0 };
      st.exitDone = false;
      st.exitPhaseRef = { phase: st.phase };
      st.glbHandle?.setAnimState('Walk');
    }

    for (const dn of this.seatedDiners) {
      dn.group.visible = true;
      dn.hips.position.y = 0;
      dn.leftLeg.rotation.x = 0;
      dn.rightLeg.rotation.x = 0;
      dn.leftArm.rotation.x = 0;
      dn.rightArm.rotation.x = 0;
      dn.head.rotation.y = 0;
      dn.exitPath = this.buildExitPathFrom(dn.group.position.x, dn.group.position.z, idx++, dn.isBooth);
      dn.exitWpRef = { idx: 0 };
      dn.exitDone = false;
      dn.exitPhaseRef = { phase: dn.phase };
      dn.glbHandle?.setAnimState('Walk');
    }

    if (this.waiterGroup) {
      this.waiterGroup.visible = true;
      this.waiterExitPath = this.buildExitPathFrom(
        this.waiterGroup.position.x,
        this.waiterGroup.position.z,
        idx++,
        false
      );
      this.waiterExitWpRef = { idx: 0 };
      this.waiterExitDone = false;
      this.waiterExitPhaseRef = { phase: this.waiterCycle };
      this.waiterGlbHandle?.setAnimState('Walk');
    } else {
      this.waiterExitDone = true;
    }
  }

  private hideAllNpcsImmediate() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (const st of this.staff) {
      st.group.visible = false;
      st.exitDone = true;
    }
    for (const dn of this.seatedDiners) {
      dn.group.visible = false;
      dn.exitDone = true;
    }
    if (this.waiterGroup) {
      this.waiterGroup.visible = false;
    }
    this.waiterExitDone = true;
  }

  private restoreForOpen() {
    this.closingActive = false;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;

    for (const st of this.staff) {
      st.group.position.copy(st.homePos);
      st.group.rotation.y = st.baseYaw;
      st.leftLeg.rotation.x = 0;
      st.rightLeg.rotation.x = 0;
      st.leftArm.rotation.x = 0;
      st.rightArm.rotation.x = 0;
      st.head.rotation.y = 0;
      st.group.visible = true;
      st.exitDone = false;
      st.glbHandle?.setAnimState('Idle');
    }

    for (const dn of this.seatedDiners) {
      dn.group.position.copy(dn.homePos);
      dn.group.rotation.y = dn.baseYaw;
      dn.hips.position.y = -0.22;
      dn.leftLeg.rotation.x = -1.35;
      dn.rightLeg.rotation.x = -1.35;
      dn.leftArm.rotation.x = -0.6;
      dn.rightArm.rotation.x = -0.65;
      dn.head.rotation.y = 0;
      dn.group.visible = true;
      dn.exitDone = false;
      dn.glbHandle?.setAnimState('Sit');
    }

    if (this.waiterGroup && this.waiterLeftLeg && this.waiterRightLeg) {
      this.waiterGroup.position.copy(this.waiterHomePos);
      this.waiterGroup.rotation.y = 0;
      this.waiterWpIndex = 1;
      this.waiterPause = 0;
      this.waiterLeftLeg.rotation.x = 0;
      this.waiterRightLeg.rotation.x = 0;
      if (this.waiterLeftArm) this.waiterLeftArm.rotation.x = 0;
      if (this.waiterRightArm) this.waiterRightArm.rotation.x = -1.1;
      this.waiterGroup.visible = true;
      this.waiterExitDone = false;
      this.waiterGlbHandle?.setAnimState('Walk');
    }
  }

  public hasExitingNpcNearDoor(): boolean {
    if (!this.closingActive) return false;
    const near = (p: THREE.Vector3, visible: boolean) =>
      visible && p.x >= 38.0 && p.x <= 43.0 && p.z >= 12.2 && p.z <= 19.2;
    for (const st of this.staff) {
      if (near(st.group.position, st.group.visible)) return true;
    }
    for (const dn of this.seatedDiners) {
      if (near(dn.group.position, dn.group.visible)) return true;
    }
    if (this.waiterGroup && near(this.waiterGroup.position, this.waiterGroup.visible)) return true;
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public update(delta: number, rawHour: number = 12.0) {
    const isOpen = isSteakhouseOpenAtHour(rawHour);

    if (this.isOpenState === null) {
      this.isOpenState = isOpen;
      if (!isOpen) {
        this.hideAllNpcsImmediate();
        return;
      }
    } else if (this.isOpenState && !isOpen) {
      this.isOpenState = false;
      if (rawHour >= 22.0 && rawHour < 22.35) {
        this.beginClosingEvacuation();
      } else {
        this.hideAllNpcsImmediate();
        return;
      }
    } else if (!this.isOpenState && isOpen) {
      this.isOpenState = true;
      this.restoreForOpen();
    } else if (!isOpen && !this.closingActive) {
      return;
    }

    if (!isOpen && this.closingActive) {
      this.closingTimer += delta;
      let anyRemaining = false;
      const exitSpeed = 2.15;

      for (const st of this.staff) {
        if (st.exitDone || !st.group.visible) continue;
        if (!st.exitPath || !st.exitWpRef || !st.exitPhaseRef) {
          st.group.visible = false;
          st.exitDone = true;
          continue;
        }
        const done = advanceNpcExitPath(
          st.group,
          st.exitPath,
          st.exitWpRef,
          exitSpeed,
          delta,
          { legL: st.leftLeg, legR: st.rightLeg, armL: st.leftArm, armR: st.rightArm },
          st.exitPhaseRef
        );
        if (done) {
          st.group.visible = false;
          st.exitDone = true;
        } else {
          anyRemaining = true;
        }
      }

      for (const dn of this.seatedDiners) {
        if (dn.exitDone || !dn.group.visible) continue;
        if (!dn.exitPath || !dn.exitWpRef || !dn.exitPhaseRef) {
          dn.group.visible = false;
          dn.exitDone = true;
          continue;
        }
        const done = advanceNpcExitPath(
          dn.group,
          dn.exitPath,
          dn.exitWpRef,
          exitSpeed,
          delta,
          { legL: dn.leftLeg, legR: dn.rightLeg, armL: dn.leftArm, armR: dn.rightArm },
          dn.exitPhaseRef
        );
        if (done) {
          dn.group.visible = false;
          dn.exitDone = true;
        } else {
          anyRemaining = true;
        }
      }

      if (this.waiterGroup && this.waiterLeftLeg && this.waiterRightLeg && !this.waiterExitDone && this.waiterGroup.visible) {
        const done = advanceNpcExitPath(
          this.waiterGroup,
          this.waiterExitPath,
          this.waiterExitWpRef,
          exitSpeed,
          delta,
          { legL: this.waiterLeftLeg, legR: this.waiterRightLeg, armL: this.waiterLeftArm ?? undefined },
          this.waiterExitPhaseRef
        );
        if (done) {
          this.waiterGroup.visible = false;
          this.waiterExitDone = true;
        } else {
          anyRemaining = true;
        }
      }

      if (!anyRemaining || this.closingTimer >= 24.0) {
        this.hideAllNpcsImmediate();
      }
      return;
    }

    this.timer += delta;

    this.staff.forEach((st) => {
      const t = this.timer + st.phase;
      st.head.rotation.y = 0.24 * Math.sin(t * 0.9);
      st.rightArm.rotation.x = -0.35 + 0.18 * Math.sin(t * 2.0);
      st.leftArm.rotation.x = -0.15 + 0.1 * Math.cos(t * 1.5);
    });

    this.seatedDiners.forEach((dn) => {
      const t = this.timer + dn.phase;
      dn.head.rotation.y = 0.22 * Math.sin(t * 0.8);
      dn.rightArm.rotation.x = -0.65 + 0.22 * Math.sin(t * 1.6);
    });

    if (this.waiterGroup && this.waiterLeftLeg && this.waiterRightLeg) {
      if (this.waiterPause > 0) {
        this.waiterGlbHandle?.setAnimState('Idle');
        this.waiterPause -= delta;
        this.waiterLeftLeg.rotation.x = THREE.MathUtils.lerp(this.waiterLeftLeg.rotation.x, 0, delta * 8);
        this.waiterRightLeg.rotation.x = THREE.MathUtils.lerp(this.waiterRightLeg.rotation.x, 0, delta * 8);
        return;
      }
      this.waiterGlbHandle?.setAnimState('Walk');

      const target = this.waiterWaypoints[this.waiterWpIndex];
      const dx = target.x - this.waiterGroup.position.x;
      const dz = target.z - this.waiterGroup.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.22) {
        this.waiterWpIndex = (this.waiterWpIndex + 1) % this.waiterWaypoints.length;
        this.waiterPause = 1.6;
        this.waiterGlbHandle?.setAnimState('Idle');
        return;
      }

      const step = Math.min(dist, 1.35 * delta);
      this.waiterGroup.position.x += (dx / dist) * step;
      this.waiterGroup.position.z += (dz / dist) * step;

      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - this.waiterGroup.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.waiterGroup.rotation.y += diff * Math.min(1, delta * 7.5);

      this.waiterCycle += delta * 5.2;
      const swing = Math.sin(this.waiterCycle) * 0.36;
      this.waiterLeftLeg.rotation.x = swing;
      this.waiterRightLeg.rotation.x = -swing;
    }
  }
}
