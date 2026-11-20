import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isSamsungStoreOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface SamsungStoreBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  getClosedFactor: () => number;
  update: (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: SamsungStoreNpcController | null
  ) => void;
}

// =========================================================================
// SAMSUNG FLAGSHIP SHOWCASE STORE — ĐƯỜNG SƠN TÂY BẮC (BÊN CẠNH JOHN HENRY)
// Total Plot: X = 329.8 .. 356.5, Z = -35.8 .. -10.2
//   - Facing East (+X) directly across Đường Sơn Tây Bắc toward Apple Flagship Store
//   - South neighbor: John Henry Store (Z = -8.4 .. 15.6) -> 1.8m setback gap
//   - North neighbor: Modern Block (Z = -59.0 .. -37.0) -> 1.2m setback gap
//   - Storefront Glass Line: X = 352.6 | Front Covered Apron: X = 352.6 .. 356.5
//   - Podium Floor: Y = 0.08m
//   - Automatic Bi-Parting Double Sliding Glass Doors: X = 352.6, Z = -28.6 (4.2m wide: -30.7..-26.5)
//   - Left Bay (+Z: -22.6..-10.2): Glowing SAMSUNG + Blue Capsule Tunnel + Vertical Acrylic Fins
//   - Right Bay (-Z: -35.8..-22.6): Warm Golden Lounge + Bold Square LED Ceiling Coffer + Tables
//   - Rooftop: Sculpted 8-Tile Rounded-Corner Curved Mosaic Gallery (2x4 dynamic collage)
// =========================================================================

export const SAMSUNG_PODIUM_Y = 0.08;

const SAMSUNG_DOOR_X = 352.6;
const SAMSUNG_DOOR_Z = -28.6;
const SAMSUNG_MIN_Z = -35.8;
const SAMSUNG_MAX_Z = -10.2;
const SAMSUNG_CENTER_Z = -23.0;

export const SAMSUNG_COLLIDERS: IntersectionColliderBox[] = [
  // Perimeter Structural Walls
  { minX: 329.6, maxX: 330.65, minZ: -35.9, maxZ: -10.1, floor: 1 }, // West Rear Wall
  { minX: 329.6, maxX: 352.8, minZ: -35.9, maxZ: -34.95, floor: 1 }, // North Side Wall
  { minX: 329.6, maxX: 352.8, minZ: -11.05, maxZ: -10.1, floor: 1 }, // South Side Wall

  // East Front Panoramic Glass Facade (split cleanly around 4.2m Sliding Doorway Z = -30.7..-26.5)
  { minX: 352.25, maxX: 352.95, minZ: -35.8, maxZ: -30.7, floor: 1 },
  { minX: 352.25, maxX: 352.95, minZ: -26.5, maxZ: -10.2, floor: 1 },

  // Exterior Digital Kiosk Totem flanking Door Left
  { minX: 352.7, maxX: 353.3, minZ: -25.65, maxZ: -24.45, floor: 1 },

  // Interior Left Zone (Blue Light Tunnel & Galaxy Flagship Pedestals)
  { minX: 334.4, maxX: 345.8, minZ: -17.6, maxZ: -13.6, floor: 1 }, // Blue LED Portal Tunnel & Snowboard Stand
  { minX: 345.0, maxX: 348.6, minZ: -22.2, maxZ: -18.2, floor: 1 }, // Vertical Blue Acrylic Louver Fins Bank
  { minX: 348.2, maxX: 350.0, minZ: -21.4, maxZ: -18.2, floor: 1 }, // Front Galaxy Smartphone Pedestals Row

  // Interior Right Zone (Warm Gold Galaxy Tables, Lounge & Accessory Bays)
  { minX: 344.8, maxX: 347.2, minZ: -34.0, maxZ: -30.2, floor: 1 }, // Front North Galaxy Flagship Table
  { minX: 339.2, maxX: 341.6, minZ: -31.8, maxZ: -26.2, floor: 1 }, // Center Warm-Oak Galaxy Ecosystem Table
  { minX: 333.2, maxX: 336.0, minZ: -32.2, maxZ: -25.2, floor: 1 }, // Rear White Lounge Armchairs & Coffee Table
  { minX: 337.0, maxX: 349.5, minZ: -35.15, maxZ: -34.15, floor: 1 }, // North Wall Accessory & Wearables Shelf Bay
  { minX: 337.5, maxX: 345.0, minZ: -23.5, maxZ: -22.3, floor: 1 }, // Center Wood-Slat Divider Pier
];

// =========================================================================
// CUSTOM ARCHITECTURAL GEOMETRY HELPERS
// =========================================================================

function createRoundedShape(w: number, h: number, radius: number): THREE.Shape {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = Math.min(radius, hw * 0.45, hh * 0.45);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

function createRoundedScreenGeo(w: number, h: number, radius: number, segments = 10): THREE.ShapeGeometry {
  const shape = createRoundedShape(w, h, radius);
  const geo = new THREE.ShapeGeometry(shape, segments);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const hw = w * 0.5;
  const hh = h * 0.5;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + hw) / w, (pos.getY(i) + hh) / h);
  }
  uv.needsUpdate = true;
  return geo;
}

function createRoundedBezelGeo(w: number, h: number, radius: number, depth = 0.14): THREE.ExtrudeGeometry {
  const shape = createRoundedShape(w, h, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.translate(0, 0, -depth);
  return geo;
}

function createSlopedGlassBayGeo(
  spanZ: number,
  yBot: number,
  yTopStart: number,
  yTopEnd: number
): THREE.BufferGeometry {
  const hz = spanZ * 0.5;
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    0, yBot, -hz,
    0, yBot, hz,
    0, yTopEnd, hz,
    0, yTopStart, -hz,
  ]);
  const indices = [0, 1, 2, 0, 2, 3];
  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createArchFrameRingGeo(outerW: number, outerH: number, thickness: number, depth: number): THREE.ExtrudeGeometry {
  const outer = createRoundedShape(outerW, outerH, 0.55);
  const inner = createRoundedShape(outerW - thickness * 2, outerH - thickness * 2, 0.42);
  outer.holes.push(inner);
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

// =========================================================================
// HIGH-CRAFT PROCEDURAL TEXTURES (ZERO EXTERNAL ASSET REQUESTS)
// =========================================================================

function createSamsungFloorTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ddd6ca';
  ctx.fillRect(0, 0, w, h);

  const cell = 128;
  for (let r = 0; r < 4; r++) {
    for (let col = 0; col < 4; col++) {
      const shade = ((r * 7 + col * 13) % 5) - 2;
      ctx.fillStyle = `rgb(${224 + shade * 3}, ${217 + shade * 3}, ${206 + shade * 3})`;
      ctx.fillRect(col * cell + 1, r * cell + 1, cell - 2, cell - 2);
    }
  }

  ctx.strokeStyle = 'rgba(138, 127, 114, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= w; i += cell) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }

  for (let i = 0; i < 160; i++) {
    const x = (i * 89) % w;
    const y = (i * 53) % h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.34)' : 'rgba(120,113,108,0.12)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = 4;
  return tex;
}

function createApronGraniteTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#363c46';
  ctx.fillRect(0, 0, w, h);

  const cols = 4;
  const rows = 8;
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lum = 54 + ((r * 11 + col * 7) % 12);
      ctx.fillStyle = `rgb(${lum}, ${lum + 4}, ${lum + 10})`;
      ctx.fillRect(col * cw + 2, r * ch + 2, cw - 4, ch - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(col * cw + 4, r * ch + 3, cw - 8, 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.anisotropy = 4;
  return tex;
}

function createMetalCladdingTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2a303c');
  g.addColorStop(0.5, '#343b49');
  g.addColorStop(1, '#232833');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Architectural vertical composite panel seams
  const cols = 4;
  const cw = w / cols;
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(i * cw, 0, 3, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(i * cw + 3, 0, 2, h);
  }
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fillRect(0, h * 0.5, w, 3);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = 4;
  return tex;
}

function createWarmBrickWallTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#eadfcb';
  ctx.fillRect(0, 0, w, h);

  const rows = 18;
  const cols = 6;
  const bh = h / rows;
  const bw = w / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (bw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const shade = ((r * 5 + col * 11) % 7) - 3;
      ctx.fillStyle = `rgb(${236 + shade * 3}, ${224 + shade * 3}, ${205 + shade * 3})`;
      ctx.fillRect(col * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1.5);
  tex.anisotropy = 4;
  return tex;
}

function createSamsungWordmarkTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 320px "Arial Black", "Montserrat", system-ui, sans-serif';
  const letters = 'SAMSUNG'.split('');
  const spacing = 262;
  const startX = w * 0.5 - ((letters.length - 1) * spacing) * 0.5;
  letters.forEach((ch, idx) => {
    ctx.fillText(ch, startX + idx * spacing, h * 0.52);
  });
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createShowcaseDecalTex(onDarkRibbon: boolean): THREE.CanvasTexture {
  const w = 1280;
  const h = 224;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  if (onDarkRibbon) {
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(24, 20, w - 48, h - 40);
    ctx.strokeStyle = '#c89b3c';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 22, w - 52, h - 44);
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 76px system-ui, -apple-system, sans-serif';
  ctx.fillText('SAMSUNG', w * 0.34, h * 0.5);

  ctx.fillStyle = onDarkRibbon ? '#fde68a' : '#e2e8f0';
  ctx.font = '300 68px system-ui, -apple-system, sans-serif';
  ctx.fillText('showcase', w * 0.70, h * 0.51);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createSamsungHoursPlaqueTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText('SAMSUNG', w * 0.5, 78);

  ctx.fillStyle = '#93c5fd';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText('EXPERIENCE SHOWCASE', w * 0.5, 128);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.fillRect(88, 162, w - 176, 3);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText('GIỜ MỞ CỬA • OPEN DAILY', w * 0.5, 214);

  ctx.fillStyle = '#fde68a';
  ctx.font = '900 50px system-ui, sans-serif';
  ctx.fillText('07:00 - 23:00', w * 0.5, 286);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPedestalBadgeTex(label: string): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, w, 58);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText('GALAXY', w * 0.5, 30);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 84px system-ui, sans-serif';
  ctx.fillText(label, w * 0.5, 152);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

type SamsungScreenVariant =
  | 'phone'
  | 'fold'
  | 'flip'
  | 'tablet'
  | 'laptop'
  | 'watch'
  | 'frame_tv'
  | 'kiosk';

function createScreenShowcaseTex(variant: SamsungScreenVariant): THREE.CanvasTexture {
  const w = variant === 'watch' ? 256 : 512;
  const h =
    variant === 'kiosk'
      ? 768
      : variant === 'phone' || variant === 'flip'
        ? 768
        : variant === 'watch'
          ? 256
          : 340;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  if (variant === 'kiosk') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#020617');
    g.addColorStop(0.55, '#0c4a6e');
    g.addColorStop(1, '#0369a1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const rg = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, 165);
    rg.addColorStop(0, '#bae6fd');
    rg.addColorStop(0.55, '#0284c7');
    rg.addColorStop(1, 'rgba(2,132,199,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '900 58px system-ui, sans-serif';
    ctx.fillText('Galaxy AI', w * 0.5, h * 0.42);
    ctx.font = '700 28px system-ui, sans-serif';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText('SAMSUNG SHOWCASE', w * 0.5, h * 0.52);
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText('S25 ULTRA • Z FOLD6', w * 0.5, h * 0.84);
  } else if (variant === 'watch') {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 92, -Math.PI * 0.75, Math.PI * 0.45);
    ctx.stroke();
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 74, -Math.PI * 0.5, Math.PI * 0.7);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillText('10:08', w * 0.5, h * 0.47);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('ULTRA', w * 0.5, h * 0.67);
  } else if (variant === 'phone' || variant === 'flip') {
    const isFlip = variant === 'flip';
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, isFlip ? '#1e1b4b' : '#061224');
    g.addColorStop(0.45, isFlip ? '#7c3aed' : '#0284c7');
    g.addColorStop(1, isFlip ? '#f472b6' : '#67e8f9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Abstract Titanium Ribbon / Aurora Swoosh
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.52, 175, 95, -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(186,230,253,0.28)';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.48, 120, 190, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Lock screen clock + status bar
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.font = '800 84px system-ui, sans-serif';
    ctx.fillText('12:45', w * 0.5, 175);
    ctx.font = '600 26px system-ui, sans-serif';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(isFlip ? 'Galaxy Z Flip6' : 'Galaxy S25 Ultra', w * 0.5, 228);

    // Bottom One UI App Icons Dock
    const dockCols = ['#38bdf8', '#22c55e', '#f59e0b', '#a855f7'];
    dockCols.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(78 + i * 96, h - 108, 68, 68, 18);
      ctx.fill();
    });
  } else if (variant === 'fold') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#3b82f6');
    g.addColorStop(1, '#a855f7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Dual-Wing Split Workspace UI
    ctx.fillStyle = 'rgba(15, 23, 42, 0.48)';
    ctx.fillRect(20, 24, w * 0.44, h - 48);
    ctx.fillRect(w * 0.52, 24, w * 0.44, h - 48);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText('Galaxy AI', w * 0.26, h * 0.46);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('Z Fold6', w * 0.74, h * 0.46);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(w * 0.495, 16, 4, h - 32);
  } else if (variant === 'tablet' || variant === 'laptop') {
    const isLaptop = variant === 'laptop';
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#09111f');
    g.addColorStop(0.55, isLaptop ? '#1d4ed8' : '#0369a1');
    g.addColorStop(1, isLaptop ? '#06b6d4' : '#38bdf8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Floating Creative Canvas Cards
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(36, 36, w * 0.56, h - 92);
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.fillRect(w * 0.66, 36, w * 0.28, h - 92);
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText(isLaptop ? 'Galaxy Book4 Ultra' : 'Galaxy Tab S10', w * 0.36, h * 0.46);
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText(isLaptop ? 'AMOLED 2X Studio' : 'S Pen Creative Pro', w * 0.36, h * 0.62);
    // Taskbar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(0, h - 38, w, 38);
  } else {
    // frame_tv
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#0c4a6e');
    g.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const sun = ctx.createRadialGradient(w * 0.68, h * 0.4, 8, w * 0.68, h * 0.4, 150);
    sun.addColorStop(0, '#fde68a');
    sun.addColorStop(0.4, '#f97316');
    sun.addColorStop(1, 'rgba(249,115,22,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = '900 38px system-ui, sans-serif';
    ctx.fillText('Neo QLED 8K', 36, h * 0.42);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText('Music Frame • Dolby Atmos', 36, h * 0.58);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createSpecPlacardTex(title: string, spec: string, price: string): THREE.CanvasTexture {
  const w = 256;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, w, 16);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText(title, 18, 52);

  ctx.fillStyle = '#475569';
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillText(spec, 18, 88);

  ctx.fillStyle = '#0369a1';
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText(price, 18, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createRetailBoxTex(model: string, subtitle: string, accentHex: string, darkBox: boolean): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = darkBox ? '#141820' : '#f1f5f9';
  ctx.fillRect(0, 0, w, h);

  // Clean outer border
  ctx.strokeStyle = darkBox ? '#2b3342' : '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  // Brand + Model at top
  ctx.textAlign = 'center';
  ctx.fillStyle = darkBox ? '#e2e8f0' : '#0f172a';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.fillText('SAMSUNG', w * 0.5, 36);

  ctx.fillStyle = darkBox ? '#ffffff' : '#0f172a';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText(model, w * 0.5, 68);

  // Stylized graphic emblem in center
  const g = ctx.createLinearGradient(56, 108, 200, 290);
  g.addColorStop(0, accentHex);
  g.addColorStop(1, darkBox ? '#1e293b' : '#94a3b8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(68, 104, 120, 198, 16);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(76, 112, 104, 182, 12);
  ctx.stroke();

  ctx.fillStyle = darkBox ? '#94a3b8' : '#475569';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(subtitle, w * 0.5, 344);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBayHeaderTex(title: string): THREE.CanvasTexture {
  const w = 512;
  const h = 72;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#181c24';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c89b3c';
  ctx.fillRect(0, h - 4, w, 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText(title, w * 0.5, h * 0.48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createMosaicTileTex(tileIndex: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 576;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Clean instant gradient placeholder while local photo decodes (<5ms)
  const fallbackColors = [
    ['#0f766e', '#14b8a6'],
    ['#0284c7', '#38bdf8'],
    ['#dc2626', '#6d28d9'],
    ['#65a30d', '#84cc16'],
    ['#0369a1', '#1d4ed8'],
    ['#ea580c', '#dc2626'],
    ['#d97706', '#facc15'],
    ['#1e3a8a', '#2563eb'],
  ];
  const [c0, c1] = fallbackColors[tileIndex % fallbackColors.length];
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  // Load user's 8 high-resolution local photos with aspect-preserving cover fit
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
    const canvasRatio = w / h;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (imgRatio > canvasRatio) {
      sw = img.naturalHeight * canvasRatio;
      sx = (img.naturalWidth - sw) * 0.5;
    } else {
      sh = img.naturalWidth / canvasRatio;
      sy = (img.naturalHeight - sh) * 0.42; // slight upper bias for portraits
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    tex.needsUpdate = true;
  };
  img.src = `/assets/samsung-mosaic/tile-${tileIndex}.jpg`;

  return tex;
}

function createSamsungBagTex(): THREE.CanvasTexture {
  const w = 128;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(0, 0, w, 26);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.fillText('SAMSUNG', w * 0.5, h * 0.56);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Smooth arched canopy soffit curve matching Image 2 & Image 3
function getCanopyY(z: number): number {
  const halfSpan = (SAMSUNG_MAX_Z - SAMSUNG_MIN_Z) * 0.5; // 12.8m
  const u = THREE.MathUtils.clamp((z - SAMSUNG_CENTER_Z) / halfSpan, -1, 1);
  return 4.65 + 0.88 * (1 - u * u * 0.9);
}

// =========================================================================
// MAIN 3D ARCHITECTURE BUILDER
// =========================================================================

export function createSamsungStoreStructure(): SamsungStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Architectural Material Palette
  const podiumGraniteMat = new THREE.MeshStandardMaterial({
    map: createApronGraniteTex(),
    roughness: 0.4,
    metalness: 0.16,
  });
  const terrazzoMat = new THREE.MeshStandardMaterial({
    map: createSamsungFloorTex(),
    roughness: 0.22,
    metalness: 0.08,
  });
  const blueZoneFloorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.16,
    metalness: 0.34,
  });
  const darkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x1b1f27,
    roughness: 0.3,
    metalness: 0.72,
  });
  const satinSilverMat = new THREE.MeshStandardMaterial({
    color: 0xdce3ec,
    roughness: 0.24,
    metalness: 0.72,
  });
  const canopySoffitMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.15,
    roughness: 0.28,
    metalness: 0.38,
  });
  const warmOakMat = new THREE.MeshStandardMaterial({
    color: 0xc28a52,
    roughness: 0.54,
    metalness: 0.05,
  });
  const warmBrickWallMat = new THREE.MeshStandardMaterial({
    map: createWarmBrickWallTex(),
    roughness: 0.72,
    metalness: 0.04,
  });
  const exteriorCladdingMat = new THREE.MeshStandardMaterial({
    map: createMetalCladdingTex(),
    roughness: 0.38,
    metalness: 0.45,
  });
  const whiteLoungeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.52,
    metalness: 0.05,
  });
  const curtainGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.16,
    roughness: 0.06,
    metalness: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Emissive accents (self-managed in update() so daytime brightness stays luminous!)
  const electricBlueLedMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 2.4,
    roughness: 0.18,
  });

  const deepCobaltLedMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    emissive: 0x1d4ed8,
    emissiveIntensity: 2.1,
    roughness: 0.2,
  });

  const warmGoldHaloMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf2,
    emissive: 0xfef08a,
    emissiveIntensity: 2.4,
    roughness: 0.16,
  });

  const soffitDownlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 2.8,
    roughness: 0.14,
  });

  const showcaseRibbonTex = createShowcaseDecalTex(true);
  const showcaseRibbonMat = new THREE.MeshStandardMaterial({
    map: showcaseRibbonTex,
    emissive: 0xffffff,
    emissiveMap: showcaseRibbonTex,
    emissiveIntensity: 0.58,
    roughness: 0.34,
    metalness: 0.12,
  });
  neonMats.push(showcaseRibbonMat);

  const showcaseGlassDecalMat = new THREE.MeshStandardMaterial({
    map: createShowcaseDecalTex(false),
    transparent: true,
    emissive: 0xffffff,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    depthWrite: false,
  });
  neonMats.push(showcaseGlassDecalMat);

  // -------------------------------------------------------------------------
  // 1. RAISED PODIUM FLOOR SLAB & ENTRY BEVEL (X = 329.8..356.5, Z = -35.8..-10.2)
  // -------------------------------------------------------------------------
  const frontApron = new THREE.Mesh(
    new THREE.BoxGeometry(3.9, SAMSUNG_PODIUM_Y + 0.04, 25.6),
    podiumGraniteMat
  );
  frontApron.position.set(354.55, (SAMSUNG_PODIUM_Y - 0.04) * 0.5, SAMSUNG_CENTER_Z);
  staticGroup.add(frontApron);

  const entryStep = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 25.6), podiumGraniteMat);
  entryStep.position.set(356.25, 0.025, SAMSUNG_CENTER_Z);
  staticGroup.add(entryStep);

  // Right warm terrazzo floor (Z = -35.8..-22.6)
  const rightInteriorFloor = new THREE.Mesh(
    new THREE.BoxGeometry(22.8, SAMSUNG_PODIUM_Y + 0.04, 13.2),
    terrazzoMat
  );
  rightInteriorFloor.position.set(341.2, (SAMSUNG_PODIUM_Y - 0.04) * 0.5, -29.2);
  staticGroup.add(rightInteriorFloor);

  // Left glossy dark reflective floor under Blue Light Tunnel (Z = -22.6..-10.2)
  const leftInteriorFloor = new THREE.Mesh(
    new THREE.BoxGeometry(22.8, SAMSUNG_PODIUM_Y + 0.04, 12.4),
    blueZoneFloorMat
  );
  leftInteriorFloor.position.set(341.2, (SAMSUNG_PODIUM_Y - 0.04) * 0.5, -16.4);
  staticGroup.add(leftInteriorFloor);

  // -------------------------------------------------------------------------
  // 2. STRUCTURAL ENVELOPE (ARCHITECTURAL CLADDING & SEAMLESS ARCHED ENCLOSURE)
  // -------------------------------------------------------------------------
  // Extrude Rear Wall cleanly along curved canopy profile so zero gap or overlap occurs
  const buildCurvedArchBandGeo = (
    xDepth: number,
    yBottomFn: (z: number) => number,
    yTopFn: (z: number) => number,
    steps = 36
  ): THREE.BufferGeometry => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= steps; i++) {
      const z = SAMSUNG_MIN_Z + (i / steps) * (SAMSUNG_MAX_Z - SAMSUNG_MIN_Z);
      const y = yBottomFn(z);
      if (i === 0) shape.moveTo(z, y);
      else shape.lineTo(z, y);
    }
    for (let i = steps; i >= 0; i--) {
      const z = SAMSUNG_MIN_Z + (i / steps) * (SAMSUNG_MAX_Z - SAMSUNG_MIN_Z);
      shape.lineTo(z, yTopFn(z));
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: xDepth, bevelEnabled: false });
    // Shape was in (X=z, Y=y) extruded along +Z=xDepth -> rotateY(-PI/2) maps ShapeX->+Z, ShapeY->+Y, ExtrudeZ->-X
    // Instead rotateY(+PI/2) maps ShapeX->-Z, wait: let's map explicitly so vertices are exact world (X in [0..xDepth], Y, Z=z)!
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const spanZ = SAMSUNG_MAX_Z - SAMSUNG_MIN_Z;
    for (let i = 0; i < pos.count; i++) {
      const sZ = pos.getX(i);
      const sY = pos.getY(i);
      const sX = pos.getZ(i);
      pos.setXYZ(i, sX, sY, sZ);
      if (uv) {
        uv.setXY(i, (sZ - SAMSUNG_MIN_Z) / spanZ, sY / 5.5);
      }
    }
    if (uv) uv.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };

  const rearWallGeo = buildCurvedArchBandGeo(0.8, () => 0, (z) => getCanopyY(z) + 0.02);
  const rearWall = new THREE.Mesh(rearWallGeo, exteriorCladdingMat);
  rearWall.position.set(329.8, 0, 0);
  staticGroup.add(rearWall);

  // Warm Brick Rear Feature Wall on Right Zone Interior (X = 330.62..330.78, Z = -34.8..-23.2)
  const brickFeatureWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.72, 11.6), warmBrickWallMat);
  brickFeatureWall.position.set(330.7, 2.44, -29.0);
  staticGroup.add(brickFeatureWall);

  // Crisp Dark Architectural Ribbon + Backlit "SAMSUNG showcase" on Rear Wall (100% legible!)
  const rearSignBackdrop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.24, 6.7), darkBronzeMat);
  rearSignBackdrop.position.set(330.8, 2.72, -29.0);
  staticGroup.add(rearSignBackdrop);

  const rearSign = new THREE.Mesh(new THREE.PlaneGeometry(6.55, 1.15), showcaseRibbonMat);
  rearSign.position.set(330.85, 2.72, -29.0);
  rearSign.rotation.y = Math.PI / 2;
  rearSign.userData.noMerge = true;
  staticGroup.add(rearSign);

  // North & South Side Walls (start cleanly at X = 330.61 -> zero overlap with rearWall or canopy!)
  const sideWallTopY = 4.72;
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(21.99, sideWallTopY, 0.85), exteriorCladdingMat);
  northWall.position.set(341.605, sideWallTopY * 0.5, -35.38);
  staticGroup.add(northWall);

  const southWall = new THREE.Mesh(new THREE.BoxGeometry(21.99, sideWallTopY, 0.85), exteriorCladdingMat);
  southWall.position.set(341.605, sideWallTopY * 0.5, -10.62);
  staticGroup.add(southWall);

  // -------------------------------------------------------------------------
  // 3. CONTINUOUS SMOOTH ARCHED CANOPY (ZERO SEGMENT SEAMS OR Z-FIGHTING!)
  // -------------------------------------------------------------------------
  // Continuous Satin-White Arched Soffit (X = 329.8 .. 355.54)
  const canopySoffitGeo = buildCurvedArchBandGeo(
    25.74,
    (z) => getCanopyY(z),
    (z) => getCanopyY(z) + 0.14
  );
  const canopySoffit = new THREE.Mesh(canopySoffitGeo, canopySoffitMat);
  canopySoffit.position.set(329.8, 0, 0);
  staticGroup.add(canopySoffit);

  // Continuous Satin-Silver Upper Roof Deck (0.008m above soffit, zero coplanar overlap)
  const canopyRoofGeo = buildCurvedArchBandGeo(
    25.7,
    (z) => getCanopyY(z) + 0.148,
    (z) => getCanopyY(z) + 0.23
  );
  const canopyRoof = new THREE.Mesh(canopyRoofGeo, satinSilverMat);
  canopyRoof.position.set(329.8, 0, 0);
  staticGroup.add(canopyRoof);

  // Sleek Curved Front Brushed-Silver Eyebrow Fascia (X = 355.54 .. 355.66)
  const fasciaSilverGeo = buildCurvedArchBandGeo(
    0.12,
    (z) => getCanopyY(z) + 0.055,
    (z) => getCanopyY(z) + 0.245
  );
  const fasciaSilver = new THREE.Mesh(fasciaSilverGeo, satinSilverMat);
  fasciaSilver.position.set(355.54, 0, 0);
  staticGroup.add(fasciaSilver);

  // Recessed Dark Shadow-Reveal Drip Edge Beneath Front Fascia (X = 355.50 .. 355.61)
  const fasciaTrimGeo = buildCurvedArchBandGeo(
    0.11,
    (z) => getCanopyY(z) + 0.006,
    (z) => getCanopyY(z) + 0.048
  );
  const fasciaTrim = new THREE.Mesh(fasciaTrimGeo, darkBronzeMat);
  fasciaTrim.position.set(355.50, 0, 0);
  staticGroup.add(fasciaTrim);

  // Recessed Warm Soffit LED Downlights cleanly flush beneath the curved canopy + interior vaulted ceiling
  for (let i = 1; i <= 9; i++) {
    const lz = SAMSUNG_MIN_Z + (i / 10) * (SAMSUNG_MAX_Z - SAMSUNG_MIN_Z);
    const dl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.028, 16), soffitDownlightMat);
    dl.position.set(354.25, getCanopyY(lz) - 0.014, lz);
    staticGroup.add(dl);
  }
  [349.6, 344.2, 338.8, 333.8].forEach((bx) => {
    [-32.5, -28.8, -25.1, -19.5, -15.6, -12.4].forEach((bz) => {
      const ceilingBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.028, 14), soffitDownlightMat);
      ceilingBulb.position.set(bx, getCanopyY(bz) - 0.014, bz);
      staticGroup.add(ceilingBulb);
    });
  });

  // -------------------------------------------------------------------------
  // 4. FRAMELESS SLOPED CURTAIN GLASS, LARGE SAMSUNG LOGO & SLIDING DOORS
  // -------------------------------------------------------------------------
  // Slim base shadow reveal tracks (trimmed strictly inside north/south inner wall faces)
  const northBaseTrack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 4.2), darkBronzeMat);
  northBaseTrack.position.set(SAMSUNG_DOOR_X, SAMSUNG_PODIUM_Y + 0.03, -32.8);
  staticGroup.add(northBaseTrack);

  const southBaseTrack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 15.4), darkBronzeMat);
  southBaseTrack.position.set(SAMSUNG_DOOR_X, SAMSUNG_PODIUM_Y + 0.03, -18.8);
  staticGroup.add(southBaseTrack);

  // Ultra-slim structural vertical mullions following the curved canopy profile (inside wall bounds)
  const mullionZs = [-34.9, -32.8, -30.7, -26.5, -24.4, -22.2, -19.8, -17.4, -15.0, -13.0, -11.1];
  mullionZs.forEach((mz) => {
    const topY = getCanopyY(mz) - 0.015;
    const h = topY - SAMSUNG_PODIUM_Y;
    const mul = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.042), darkBronzeMat);
    mul.position.set(SAMSUNG_DOOR_X, SAMSUNG_PODIUM_Y + h * 0.5, mz);
    staticGroup.add(mul);
  });

  // Slim doorway header rail (Z = -30.7..-26.5 at Y = 3.05m)
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 4.22), darkBronzeMat);
  doorHeader.position.set(SAMSUNG_DOOR_X, SAMSUNG_PODIUM_Y + 3.02, SAMSUNG_DOOR_Z);
  staticGroup.add(doorHeader);

  // Sloped custom glass curtain panels matching curved soffit seamlessly (ZERO gaps!)
  const glassBays: Array<{ z0: number; z1: number; yMin: number }> = [
    { z0: -34.9, z1: -32.8, yMin: SAMSUNG_PODIUM_Y + 0.05 },
    { z0: -32.8, z1: -30.7, yMin: SAMSUNG_PODIUM_Y + 0.05 },
    { z0: -30.7, z1: -26.5, yMin: SAMSUNG_PODIUM_Y + 3.06 }, // upper doorway transom
    { z0: -26.5, z1: -22.2, yMin: SAMSUNG_PODIUM_Y + 0.05 },
    { z0: -22.2, z1: -17.4, yMin: SAMSUNG_PODIUM_Y + 0.05 },
    { z0: -17.4, z1: -11.1, yMin: SAMSUNG_PODIUM_Y + 0.05 },
  ];
  glassBays.forEach((bay) => {
    const zMid = (bay.z0 + bay.z1) * 0.5;
    const spanZ = bay.z1 - bay.z0;
    const geo = createSlopedGlassBayGeo(
      spanZ,
      bay.yMin,
      getCanopyY(bay.z0) - 0.01,
      getCanopyY(bay.z1) - 0.01
    );
    const glass = new THREE.Mesh(geo, curtainGlassMat);
    glass.position.set(SAMSUNG_DOOR_X, 0, zMid);
    staticGroup.add(glass);
  });

  // Large Bold Glowing White "SAMSUNG" Flagship Wordmark on Upper-Left Glass Facade
  const wordmarkTex = createSamsungWordmarkTex();
  const logoMat = new THREE.MeshStandardMaterial({
    map: wordmarkTex,
    transparent: true,
    emissive: 0xffffff,
    emissiveMap: wordmarkTex,
    emissiveIntensity: 2.1,
    roughness: 0.14,
    depthWrite: false,
  });
  const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 1.92), logoMat);
  logoPlane.position.set(SAMSUNG_DOOR_X + 0.09, 3.88, -17.0);
  logoPlane.rotation.y = Math.PI / 2;
  logoPlane.userData.noMerge = true;
  staticGroup.add(logoPlane);

  // Subtle translucent glass manifestation "SAMSUNG showcase" band on right front glass
  const glassBandRight = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), showcaseGlassDecalMat);
  glassBandRight.position.set(SAMSUNG_DOOR_X + 0.05, 1.32, -32.85);
  glassBandRight.rotation.y = Math.PI / 2;
  glassBandRight.userData.noMerge = true;
  staticGroup.add(glassBandRight);

  // Automatic Bi-Parting Double Sliding Glass Doors (Z = -30.7..-26.5)
  const leafWidth = 2.08;
  const leafHeight = 2.98;
  const makeDoorLeaf = (closedZ: number) => {
    const leafGroup = new THREE.Group();
    const glassLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, leafHeight, leafWidth),
      curtainGlassMat
    );
    glassLeaf.userData.noMerge = true;
    leafGroup.add(glassLeaf);

    const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, leafWidth), darkBronzeMat);
    railTop.position.y = leafHeight * 0.5 - 0.028;
    railTop.userData.noMerge = true;
    leafGroup.add(railTop);

    const railBot = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, leafWidth), darkBronzeMat);
    railBot.position.y = -leafHeight * 0.5 + 0.028;
    railBot.userData.noMerge = true;
    leafGroup.add(railBot);

    const handleZ = closedZ < SAMSUNG_DOOR_Z ? leafWidth * 0.5 - 0.14 : -leafWidth * 0.5 + 0.14;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.92, 10), satinSilverMat);
    handle.position.set(0.035, -0.15, handleZ);
    handle.userData.noMerge = true;
    leafGroup.add(handle);

    leafGroup.position.set(SAMSUNG_DOOR_X - 0.03, SAMSUNG_PODIUM_Y + leafHeight * 0.5, closedZ);
    staticGroup.add(leafGroup);
    return leafGroup;
  };

  const doorLeafNorthClosedZ = SAMSUNG_DOOR_Z - leafWidth * 0.5;
  const doorLeafSouthClosedZ = SAMSUNG_DOOR_Z + leafWidth * 0.5;
  const doorLeafNorth = makeDoorLeaf(doorLeafNorthClosedZ);
  const doorLeafSouth = makeDoorLeaf(doorLeafSouthClosedZ);

  const radarSensor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.42), darkBronzeMat);
  radarSensor.position.set(SAMSUNG_DOOR_X + 0.07, SAMSUNG_PODIUM_Y + 3.12, SAMSUNG_DOOR_Z);
  staticGroup.add(radarSensor);

  const hoursPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.48),
    new THREE.MeshBasicMaterial({ map: createSamsungHoursPlaqueTex() })
  );
  hoursPlaque.position.set(SAMSUNG_DOOR_X + 0.06, 1.55, -26.08);
  hoursPlaque.rotation.y = Math.PI / 2;
  hoursPlaque.userData.noMerge = true;
  staticGroup.add(hoursPlaque);

  // Exterior Sleek Digital Kiosk Totem flanking Door Left
  const kioskStand = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.22, 1.04), darkBronzeMat);
  kioskStand.position.set(353.0, SAMSUNG_PODIUM_Y + 1.11, -25.05);
  staticGroup.add(kioskStand);

  const kioskTex = createScreenShowcaseTex('kiosk');
  const kioskScreenMat = new THREE.MeshStandardMaterial({
    map: kioskTex,
    color: 0xdbeafe,
    emissive: 0xffffff,
    emissiveMap: kioskTex,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  neonMats.push(kioskScreenMat);
  const kioskScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.72), kioskScreenMat);
  kioskScreen.position.set(353.15, SAMSUNG_PODIUM_Y + 1.22, -25.05);
  kioskScreen.rotation.y = Math.PI / 2;
  kioskScreen.userData.noMerge = true;
  staticGroup.add(kioskScreen);

  // Nocturnal Security Rolling Shutter
  const shutterTex = createRollingShutterTexture({
    title: 'SAMSUNG SHOWCASE',
    hoursLabel: '07:00 - 23:00',
    accentHex: '#0284c7',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.48,
    metalness: 0.6,
  });
  const shutterHandle: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'samsung_main_shutter',
      axis: 'z',
      pos: SAMSUNG_DOOR_X + 0.08,
      spanCenter: SAMSUNG_DOOR_Z,
      width: 4.22,
      baseY: SAMSUNG_PODIUM_Y,
      topY: SAMSUNG_PODIUM_Y + 2.98,
    },
    shutterMat,
    darkBronzeMat
  );

  // -------------------------------------------------------------------------
  // 5. LEFT BAY: METALLIC ROUNDED BLUE INFINITY LIGHT TUNNEL & ACRYLIC FINS
  // -------------------------------------------------------------------------
  const tunnelCenterZ = -15.6;

  // Outer sleek brushed-silver rounded capsule arch frame (signature Image 2 look!)
  const capsuleOuterShell = new THREE.Mesh(
    createArchFrameRingGeo(4.36, 4.02, 0.28, 1.8),
    satinSilverMat
  );
  capsuleOuterShell.position.set(344.9, SAMSUNG_PODIUM_Y + 2.0, tunnelCenterZ);
  staticGroup.add(capsuleOuterShell);

  // Dark deep-navy inner tunnel chamber & mirror floor
  const tunnelFloorPlate = new THREE.Mesh(
    new THREE.BoxGeometry(10.2, 0.06, 3.65),
    new THREE.MeshStandardMaterial({ color: 0x091326, roughness: 0.12, metalness: 0.65 })
  );
  tunnelFloorPlate.position.set(340.3, SAMSUNG_PODIUM_Y + 0.03, tunnelCenterZ);
  staticGroup.add(tunnelFloorPlate);

  // 8 nested rounded glowing LED portal rings receding cleanly into tunnel depth
  for (let i = 0; i < 8; i++) {
    const rx = 345.55 - i * 1.32;
    const ledGeo = createArchFrameRingGeo(3.64 - i * 0.04, 3.34 - i * 0.04, 0.08, 0.09);
    const ledRing = new THREE.Mesh(
      ledGeo,
      i % 2 === 0 ? electricBlueLedMat : deepCobaltLedMat
    );
    ledRing.position.set(rx, SAMSUNG_PODIUM_Y + 1.72, tunnelCenterZ);
    staticGroup.add(ledRing);
  }

  // Deep tunnel luminous rear backdrop + Snowboard VR Experience Display
  const tunnelBackdrop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.45, 3.45), deepCobaltLedMat);
  tunnelBackdrop.position.set(335.4, SAMSUNG_PODIUM_Y + 1.72, tunnelCenterZ);
  staticGroup.add(tunnelBackdrop);

  const snowboardBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 1.3), darkBronzeMat);
  snowboardBase.position.set(341.0, SAMSUNG_PODIUM_Y + 0.16, tunnelCenterZ);
  staticGroup.add(snowboardBase);

  const snowboardDeck = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.055, 0.4), satinSilverMat);
  snowboardDeck.position.set(341.0, SAMSUNG_PODIUM_Y + 0.44, tunnelCenterZ);
  snowboardDeck.rotation.z = 0.08;
  snowboardDeck.rotation.x = 0.14;
  staticGroup.add(snowboardDeck);

  // Vertical Illuminated Acrylic Louver Fins (alternating satin-silver face + electric-blue edge glow!)
  const finCount = 13;
  for (let i = 0; i < finCount; i++) {
    const fz = -22.1 + i * 0.32;
    const finBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 4.1, 0.045),
      i % 2 === 0 ? electricBlueLedMat : deepCobaltLedMat
    );
    finBody.position.set(346.6, SAMSUNG_PODIUM_Y + 2.06, fz);
    staticGroup.add(finBody);

    const finEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.12, 0.05), satinSilverMat);
    finEdge.position.set(346.84, SAMSUNG_PODIUM_Y + 2.06, fz);
    staticGroup.add(finEdge);
  }

  // Sleek Galaxy Flagship Showcase Pedestals shifted clear of tunnel vista (-21.0 .. -18.4)
  const phoneTex = createScreenShowcaseTex('phone');
  const phoneScreenMat = new THREE.MeshStandardMaterial({
    map: phoneTex,
    emissive: 0xffffff,
    emissiveMap: phoneTex,
    emissiveIntensity: 0.62,
    roughness: 0.14,
  });
  neonMats.push(phoneScreenMat);

  const foldTex = createScreenShowcaseTex('fold');
  const foldScreenMat = new THREE.MeshStandardMaterial({
    map: foldTex,
    emissive: 0xffffff,
    emissiveMap: foldTex,
    emissiveIntensity: 0.62,
    roughness: 0.14,
  });
  neonMats.push(foldScreenMat);

  const flipTex = createScreenShowcaseTex('flip');
  const flipScreenMat = new THREE.MeshStandardMaterial({
    map: flipTex,
    emissive: 0xffffff,
    emissiveMap: flipTex,
    emissiveIntensity: 0.62,
    roughness: 0.14,
  });
  neonMats.push(flipScreenMat);

  const tabletTex = createScreenShowcaseTex('tablet');
  const tabletScreenMat = new THREE.MeshStandardMaterial({
    map: tabletTex,
    emissive: 0xffffff,
    emissiveMap: tabletTex,
    emissiveIntensity: 0.58,
    roughness: 0.14,
  });
  neonMats.push(tabletScreenMat);

  const laptopTex = createScreenShowcaseTex('laptop');
  const laptopScreenMat = new THREE.MeshStandardMaterial({
    map: laptopTex,
    emissive: 0xffffff,
    emissiveMap: laptopTex,
    emissiveIntensity: 0.58,
    roughness: 0.14,
  });
  neonMats.push(laptopScreenMat);

  const watchTex = createScreenShowcaseTex('watch');
  const watchScreenMat = new THREE.MeshStandardMaterial({
    map: watchTex,
    emissive: 0xffffff,
    emissiveMap: watchTex,
    emissiveIntensity: 0.65,
    roughness: 0.14,
  });
  neonMats.push(watchScreenMat);

  const titaniumSilverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.24,
    metalness: 0.82,
  });
  const titaniumBlueMat = new THREE.MeshStandardMaterial({
    color: 0x3b6998,
    roughness: 0.28,
    metalness: 0.72,
  });
  const titaniumBlackMat = new THREE.MeshStandardMaterial({
    color: 0x151922,
    roughness: 0.22,
    metalness: 0.78,
  });
  const warmBrassTrimMat = new THREE.MeshStandardMaterial({
    color: 0xc89b3c,
    roughness: 0.28,
    metalness: 0.82,
  });
  const cameraLensMat = new THREE.MeshStandardMaterial({
    color: 0x050811,
    roughness: 0.08,
    metalness: 0.92,
  });

  // Clean local-group product builders (screen faces +X locally, never slices body!)
  const addGalaxyPhoneDisplay = (
    px: number,
    baseY: number,
    pz: number,
    yaw: number,
    chassisMat: THREE.Material,
    scrMat: THREE.Material,
    scale = 1.0
  ) => {
    const unit = new THREE.Group();
    unit.position.set(px, baseY, pz);
    unit.rotation.y = yaw;
    unit.scale.setScalar(scale);

    // Brushed aluminum security puck & tilted cradle arm
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, 0.022, 16), satinSilverMat);
    puck.position.set(0, 0.011, 0);
    unit.add(puck);

    const cradleStem = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.07, 0.028), titaniumSilverMat);
    cradleStem.position.set(-0.02, 0.042, 0);
    cradleStem.rotation.z = 0.25;
    unit.add(cradleStem);

    // Tilted local device group so body, screen & cameras share identical transform
    const device = new THREE.Group();
    device.position.set(0, 0.125, 0);
    device.rotation.z = 0.56; // Tilts screen cleanly upward & forward toward +X!

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.21, 0.105), chassisMat);
    device.add(body);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.20, 0.098), titaniumBlackMat);
    bezel.position.x = 0.0075;
    device.add(bezel);

    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.091, 0.188), scrMat);
    scr.position.x = 0.0102;
    scr.rotation.y = Math.PI / 2;
    scr.userData.noMerge = true;
    device.add(scr);

    // Iconic triple vertical Samsung camera rings on rear (-X face)
    for (let c = 0; c < 3; c++) {
      const camRing = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 12), satinSilverMat);
      camRing.rotation.z = Math.PI / 2;
      camRing.position.set(-0.0085, 0.068 - c * 0.026, -0.028);
      device.add(camRing);

      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.007, 12), cameraLensMat);
      lens.rotation.z = Math.PI / 2;
      lens.position.set(-0.009, 0.068 - c * 0.026, -0.028);
      device.add(lens);
    }

    unit.add(device);
    staticGroup.add(unit);
  };

  const addGalaxyFoldDisplay = (px: number, baseY: number, pz: number, yaw: number) => {
    const unit = new THREE.Group();
    unit.position.set(px, baseY, pz);
    unit.rotation.y = yaw;

    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.022, 16), satinSilverMat);
    puck.position.set(0, 0.011, 0);
    unit.add(puck);

    const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.065, 0.08), titaniumSilverMat);
    cradle.position.set(-0.015, 0.04, 0);
    unit.add(cradle);

    const device = new THREE.Group();
    device.position.set(0, 0.135, 0);
    device.rotation.z = 0.45;

    // Central Armor Aluminum Hinge Spine
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.215, 12), satinSilverMat);
    device.add(spine);

    // Left & Right Unfolded Wings (open 145 deg book angle facing +X)
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.rotation.y = side * -0.26;
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.21, 0.105), titaniumBlueMat);
      chassis.position.z = side * 0.056;
      wing.add(chassis);

      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.098, 0.196), foldScreenMat);
      scr.position.set(0.0068, 0, side * 0.056);
      scr.rotation.y = Math.PI / 2;
      scr.userData.noMerge = true;
      wing.add(scr);

      if (side === -1) {
        for (let c = 0; c < 3; c++) {
          const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 10), cameraLensMat);
          lens.rotation.z = Math.PI / 2;
          lens.position.set(-0.007, 0.062 - c * 0.022, -0.082);
          wing.add(lens);
        }
      }
      device.add(wing);
    });

    unit.add(device);
    staticGroup.add(unit);
  };

  const addGalaxyFlipDisplay = (px: number, baseY: number, pz: number, yaw: number) => {
    const unit = new THREE.Group();
    unit.position.set(px, baseY, pz);
    unit.rotation.y = yaw;

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.072, 0.014, 18), whiteLoungeMat);
    pad.position.y = 0.007;
    unit.add(pad);

    // Lower folded deck sitting flat on pad
    const lowerDeck = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.012, 0.096), titaniumBlueMat);
    lowerDeck.position.set(0.015, 0.02, 0);
    unit.add(lowerDeck);

    // Hinged upper display tilted 105 deg in Flex Mode
    const upper = new THREE.Group();
    upper.position.set(-0.036, 0.024, 0);
    upper.rotation.z = 0.22;

    const upperShell = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.11, 0.096), titaniumBlueMat);
    upperShell.position.y = 0.055;
    upper.add(upperShell);

    const upperScr = new THREE.Mesh(new THREE.PlaneGeometry(0.086, 0.098), flipScreenMat);
    upperScr.position.set(0.0068, 0.055, 0);
    upperScr.rotation.y = Math.PI / 2;
    upperScr.userData.noMerge = true;
    upper.add(upperScr);

    unit.add(upper);
    staticGroup.add(unit);
  };

  const addGalaxyTabDisplay = (px: number, baseY: number, pz: number, yaw: number) => {
    const unit = new THREE.Group();
    unit.position.set(px, baseY, pz);
    unit.rotation.y = yaw;

    // Aluminum easel base + neck
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.2), satinSilverMat);
    base.position.set(-0.02, 0.006, 0);
    unit.add(base);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.11, 0.065), satinSilverMat);
    neck.position.set(-0.045, 0.06, 0);
    neck.rotation.z = 0.28;
    unit.add(neck);

    const tablet = new THREE.Group();
    tablet.position.set(0, 0.15, 0);
    tablet.rotation.z = 0.48;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.24, 0.36), titaniumSilverMat);
    tablet.add(body);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.228, 0.346), titaniumBlackMat);
    bezel.position.x = 0.007;
    tablet.add(bezel);

    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.214), tabletScreenMat);
    scr.position.x = 0.0098;
    scr.rotation.y = Math.PI / 2;
    scr.userData.noMerge = true;
    tablet.add(scr);

    unit.add(tablet);

    // Slim S Pen resting cleanly on tabletop in front of tablet
    const sPen = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 10), titaniumBlackMat);
    sPen.rotation.x = Math.PI / 2;
    sPen.position.set(0.11, 0.007, 0);
    unit.add(sPen);

    staticGroup.add(unit);
  };

  const addGalaxyBookDisplay = (px: number, baseY: number, pz: number, yaw: number) => {
    const unit = new THREE.Group();
    unit.position.set(px, baseY, pz);
    unit.rotation.y = yaw;

    // Brushed graphite lower chassis
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.016, 0.34), titaniumBlackMat);
    base.position.set(0, 0.008, 0);
    unit.add(base);

    // Keyboard recessed island + glass trackpad
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.003, 0.28), darkBronzeMat);
    kb.position.set(-0.025, 0.017, 0);
    unit.add(kb);
    const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.003, 0.12), satinSilverMat);
    trackpad.position.set(0.072, 0.017, 0);
    unit.add(trackpad);

    // Open hinged AMOLED display lid
    const lid = new THREE.Group();
    lid.position.set(-0.115, 0.016, 0);
    lid.rotation.z = 0.26;

    const lidFrame = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.22, 0.34), titaniumBlackMat);
    lidFrame.position.y = 0.11;
    lid.add(lidFrame);

    const lidScr = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.20), laptopScreenMat);
    lidScr.position.set(0.0062, 0.11, 0);
    lidScr.rotation.y = Math.PI / 2;
    lidScr.userData.noMerge = true;
    lid.add(lidScr);

    unit.add(lid);
    staticGroup.add(unit);
  };

  const addGalaxyWatchTray = (px: number, baseY: number, pz: number, yaw: number) => {
    const unit = new THREE.Group();
    unit.position.set(px, baseY, pz);
    unit.rotation.y = yaw;

    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.34), whiteLoungeMat);
    tray.position.y = 0.009;
    unit.add(tray);

    const strapCols = [0xf97316, 0x0f172a];
    [-0.085, 0.085].forEach((wz, idx) => {
      const strapMat = new THREE.MeshStandardMaterial({ color: strapCols[idx], roughness: 0.6 });
      const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.065, 16), satinSilverMat);
      puck.rotation.x = Math.PI / 2;
      puck.position.set(0, 0.05, wz);
      unit.add(puck);

      const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.034, 16), strapMat);
      strap.rotation.x = Math.PI / 2;
      strap.position.set(0, 0.052, wz);
      unit.add(strap);

      const watchHead = new THREE.Group();
      watchHead.position.set(0, 0.095, wz);
      watchHead.rotation.z = -0.4;

      const watchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 16), titaniumSilverMat);
      watchHead.add(watchBody);

      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.023, 18), watchScreenMat);
      dial.position.set(0, 0.0102, 0);
      dial.rotation.x = -Math.PI / 2;
      dial.userData.noMerge = true;
      watchHead.add(dial);

      unit.add(watchHead);
    });

    staticGroup.add(unit);
  };

  const addGalaxyBudsDisplay = (px: number, baseY: number, pz: number, yaw: number) => {
    const unit = new THREE.Group();
    unit.position.set(px, baseY, pz);
    unit.rotation.y = yaw;

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.075, 0.032, 18), titaniumSilverMat);
    plinth.position.y = 0.016;
    unit.add(plinth);

    const caseBase = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.032, 0.08), titaniumBlackMat);
    caseBase.position.y = 0.048;
    unit.add(caseBase);

    const caseLid = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.018, 0.08), satinSilverMat);
    caseLid.position.set(-0.032, 0.092, 0);
    caseLid.rotation.z = 1.2;
    unit.add(caseLid);

    [-0.018, 0.018].forEach((ez) => {
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.034, 0.012), satinSilverMat);
      stem.position.set(0.008, 0.068, ez);
      unit.add(stem);
      const bladeLight = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.024, 0.004), electricBlueLedMat);
      bladeLight.position.set(0.015, 0.068, ez);
      unit.add(bladeLight);
    });

    staticGroup.add(unit);
  };

  const addSpecPlacard = (px: number, baseY: number, pz: number, yaw: number, title: string, spec: string, price: string) => {
    const cardMat = new THREE.MeshStandardMaterial({
      map: createSpecPlacardTex(title, spec, price),
      roughness: 0.35,
    });
    const holder = new THREE.Group();
    holder.position.set(px, baseY, pz);
    holder.rotation.y = yaw;

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.095), satinSilverMat);
    foot.position.y = 0.003;
    holder.add(foot);

    const cardGrp = new THREE.Group();
    cardGrp.position.set(0, 0.032, 0);
    cardGrp.rotation.z = 0.42;

    const cardBack = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.062, 0.098), titaniumBlackMat);
    cardGrp.add(cardBack);

    const cardFace = new THREE.Mesh(new THREE.PlaneGeometry(0.094, 0.058), cardMat);
    cardFace.position.set(0.003, 0, 0);
    cardFace.rotation.y = Math.PI / 2;
    cardFace.userData.noMerge = true;
    cardGrp.add(cardFace);

    holder.add(cardGrp);
    staticGroup.add(holder);
  };

  // Front Blue-Zone Flagship Pedestals (S24, S25, Z Fold6 — crisp local-group cradles!)
  ['S24', 'S25', 'Z'].forEach((label, idx) => {
    const pz = -21.0 + idx * 1.28;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 1.04, 20), whiteLoungeMat);
    ped.position.set(349.1, SAMSUNG_PODIUM_Y + 0.52, pz);
    staticGroup.add(ped);

    const ringGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.045, 20),
      electricBlueLedMat
    );
    ringGlow.position.set(349.1, SAMSUNG_PODIUM_Y + 1.05, pz);
    staticGroup.add(ringGlow);

    const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.015, 20), satinSilverMat);
    topPlate.position.set(349.1, SAMSUNG_PODIUM_Y + 1.08, pz);
    staticGroup.add(topPlate);

    if (label === 'Z') {
      addGalaxyFoldDisplay(349.1, SAMSUNG_PODIUM_Y + 1.088, pz, 0);
    } else {
      addGalaxyPhoneDisplay(
        349.1,
        SAMSUNG_PODIUM_Y + 1.088,
        pz,
        0,
        idx === 0 ? titaniumSilverMat : titaniumBlueMat,
        phoneScreenMat,
        1.12
      );
    }

    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.36),
      new THREE.MeshBasicMaterial({ map: createPedestalBadgeTex(label) })
    );
    badge.position.set(349.45, SAMSUNG_PODIUM_Y + 0.62, pz);
    badge.rotation.y = Math.PI / 2;
    badge.userData.noMerge = true;
    staticGroup.add(badge);
  });

  // -------------------------------------------------------------------------
  // 6. RIGHT BAY: WARM GOLDEN ARCHITECTURAL LOUNGE, BOLD SQUARE HALO & TABLES
  // -------------------------------------------------------------------------
  // Dense Vertical Honey-Oak Wood-Slat Feature Divider reaching cleanly up to arched soffit (Z = -22.9)
  const slatFullH = getCanopyY(-22.9) - SAMSUNG_PODIUM_Y - 0.01;
  for (let s = 0; s < 22; s++) {
    const sx = 337.6 + s * 0.34;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, slatFullH, 0.32), warmOakMat);
    slat.position.set(sx, SAMSUNG_PODIUM_Y + slatFullH * 0.5, -22.9);
    staticGroup.add(slat);
  }

  // Bold Illuminated Square Ceiling Coffer Halo Frames suspended from vaulted soffit
  const buildCeilingHalo = (cx: number, cz: number, size: number, cy: number) => {
    const outerRim = 0.42;
    const diffW = 0.28;
    const barH = 0.14;
    const bars: Array<{ dim: [number, number, number]; pos: [number, number, number] }> = [
      { pos: [cx, cy, cz - size * 0.5], dim: [size + outerRim, barH, outerRim] },
      { pos: [cx, cy, cz + size * 0.5], dim: [size + outerRim, barH, outerRim] },
      { pos: [cx - size * 0.5, cy, cz], dim: [outerRim, barH, size] },
      { pos: [cx + size * 0.5, cy, cz], dim: [outerRim, barH, size] },
    ];
    bars.forEach((b) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.dim[0], b.dim[1], b.dim[2]), warmGoldHaloMat);
      m.position.set(b.pos[0], b.pos[1], b.pos[2]);
      staticGroup.add(m);

      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(b.dim[0] + 0.06, 0.04, b.dim[2] === outerRim ? diffW + 0.18 : b.dim[2]),
        darkBronzeMat
      );
      rim.position.set(b.pos[0], b.pos[1] + 0.07, b.pos[2]);
      staticGroup.add(rim);
    });

    // 4 slender bronze hanger rods anchoring each halo cleanly into the arched soffit
    [
      [-size * 0.5, -size * 0.5],
      [size * 0.5, -size * 0.5],
      [-size * 0.5, size * 0.5],
      [size * 0.5, size * 0.5],
    ].forEach(([dx, dz]) => {
      const rz = cz + dz;
      const rodTop = getCanopyY(rz);
      const rodBot = cy + 0.08;
      const rodH = Math.max(0.1, rodTop - rodBot);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rodH, 8), darkBronzeMat);
      rod.position.set(cx + dx, rodBot + rodH * 0.5, rz);
      staticGroup.add(rod);
    });
  };
  buildCeilingHalo(344.2, -28.8, 5.4, 4.38);
  buildCeilingHalo(336.8, -28.8, 4.0, 4.42);

  // Galaxy Experience Display Tables (Dark Obsidian Plinths + Brass Reveal + Honey Oak Tops)
  const buildTableShell = (tx: number, tz: number, lenZ: number) => {
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 0.78, lenZ * 0.74),
      darkBronzeMat
    );
    plinth.position.set(tx, SAMSUNG_PODIUM_Y + 0.43, tz);
    staticGroup.add(plinth);

    const brassReveal = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.05, lenZ * 0.75),
      warmBrassTrimMat
    );
    brassReveal.position.set(tx, SAMSUNG_PODIUM_Y + 0.025, tz);
    staticGroup.add(brassReveal);

    const apronTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.04, lenZ * 0.88),
      titaniumBlackMat
    );
    apronTrim.position.set(tx, SAMSUNG_PODIUM_Y + 0.82, tz);
    staticGroup.add(apronTrim);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, lenZ), warmOakMat);
    top.position.set(tx, SAMSUNG_PODIUM_Y + 0.88, tz);
    staticGroup.add(top);

    // Sleek recessed brushed-aluminum power & cable channel down table centerline
    const powerChannel = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.008, lenZ * 0.84),
      titaniumBlackMat
    );
    powerChannel.position.set(tx, SAMSUNG_PODIUM_Y + 0.922, tz);
    staticGroup.add(powerChannel);

    const channelTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.004, lenZ * 0.85),
      satinSilverMat
    );
    channelTrim.position.set(tx, SAMSUNG_PODIUM_Y + 0.92, tz);
    staticGroup.add(channelTrim);

    return SAMSUNG_PODIUM_Y + 0.92;
  };

  // Table 1 (Front North Flagship Smartphones & Foldables, X = 346.0, Z = -32.1, lenZ = 3.2)
  const t1X = 346.0;
  const t1Z = -32.1;
  const t1TopY = buildTableShell(t1X, t1Z, 3.2);

  // East Side (+X facing sliding entrance)
  addGalaxyPhoneDisplay(t1X + 0.34, t1TopY, t1Z - 1.05, 0, titaniumBlackMat, phoneScreenMat);
  addSpecPlacard(t1X + 0.56, t1TopY, t1Z - 1.05, 0, 'Galaxy S25 Ultra', 'Titanium Black', '29.990.000d');

  addGalaxyFoldDisplay(t1X + 0.34, t1TopY, t1Z - 0.12, 0);
  addSpecPlacard(t1X + 0.56, t1TopY, t1Z - 0.12, 0, 'Galaxy Z Fold6', 'Galaxy AI • 7.6"', '41.990.000d');

  addGalaxyFlipDisplay(t1X + 0.34, t1TopY, t1Z + 0.78, 0);
  addGalaxyBudsDisplay(t1X + 0.34, t1TopY, t1Z + 1.24, 0);

  // West Side (-X facing center aisle)
  addGalaxyPhoneDisplay(t1X - 0.34, t1TopY, t1Z - 0.92, Math.PI, titaniumBlueMat, phoneScreenMat);
  addSpecPlacard(t1X - 0.56, t1TopY, t1Z - 0.92, Math.PI, 'Galaxy S25+', 'Silver Shadow', '25.990.000d');

  addGalaxyPhoneDisplay(t1X - 0.34, t1TopY, t1Z + 0.05, Math.PI, titaniumSilverMat, phoneScreenMat);
  addGalaxyFoldDisplay(t1X - 0.34, t1TopY, t1Z + 0.98, Math.PI);

  // Table 2 (Center Warm-Oak Galaxy Ecosystem Table, X = 340.4, Z = -29.0, lenZ = 4.8)
  const t2X = 340.4;
  const t2Z = -29.0;
  const t2TopY = buildTableShell(t2X, t2Z, 4.8);

  // East Side (+X)
  addGalaxyBookDisplay(t2X + 0.34, t2TopY, t2Z - 1.55, 0);
  addSpecPlacard(t2X + 0.58, t2TopY, t2Z - 1.55, 0, 'Galaxy Book4', '16" AMOLED 2X', '44.990.000d');

  addGalaxyTabDisplay(t2X + 0.34, t2TopY, t2Z - 0.45, 0);
  addSpecPlacard(t2X + 0.58, t2TopY, t2Z - 0.45, 0, 'Tab S10 Ultra', '14.6" + S Pen', '28.490.000d');

  addGalaxyWatchTray(t2X + 0.34, t2TopY, t2Z + 0.65, 0);
  addSpecPlacard(t2X + 0.56, t2TopY, t2Z + 0.65, 0, 'Watch Ultra', 'Titanium 47mm', '16.990.000d');

  addGalaxyPhoneDisplay(t2X + 0.34, t2TopY, t2Z + 1.65, 0, titaniumBlackMat, phoneScreenMat);

  // West Side (-X)
  addGalaxyTabDisplay(t2X - 0.34, t2TopY, t2Z - 1.45, Math.PI);
  addGalaxyBookDisplay(t2X - 0.34, t2TopY, t2Z - 0.25, Math.PI);
  addGalaxyBudsDisplay(t2X - 0.34, t2TopY, t2Z + 0.72, Math.PI);
  addGalaxyFlipDisplay(t2X - 0.34, t2TopY, t2Z + 1.55, Math.PI);

  // Minimalist Experience Stools tucked neatly inside Table 2 West overhang (zero NPC/player clash!)
  [-30.2, -27.8].forEach((sz) => {
    const stoolFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 14), titaniumBlackMat);
    stoolFoot.position.set(339.48, SAMSUNG_PODIUM_Y + 0.015, sz);
    staticGroup.add(stoolFoot);
    const stoolStem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.58, 10), satinSilverMat);
    stoolStem.position.set(339.48, SAMSUNG_PODIUM_Y + 0.31, sz);
    staticGroup.add(stoolStem);
    const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), warmOakMat);
    stoolSeat.position.set(339.48, SAMSUNG_PODIUM_Y + 0.62, sz);
    staticGroup.add(stoolSeat);
  });

  // Rear Cozy White Lounge Armchairs & Coffee Table
  [-31.1, -26.9].forEach((cz) => {
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.95), whiteLoungeMat);
    chairSeat.position.set(334.4, SAMSUNG_PODIUM_Y + 0.24, cz);
    staticGroup.add(chairSeat);

    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.76, 0.95), whiteLoungeMat);
    chairBack.position.set(334.02, SAMSUNG_PODIUM_Y + 0.56, cz);
    staticGroup.add(chairBack);
  });
  const loungeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.42, 18), warmOakMat);
  loungeTable.position.set(335.1, SAMSUNG_PODIUM_Y + 0.21, -29.0);
  staticGroup.add(loungeTable);

  // Tablet + Ceramic Espresso Cup on VIP Lounge Coffee Table
  addGalaxyTabDisplay(335.1, SAMSUNG_PODIUM_Y + 0.42, -29.15, Math.PI * 0.25);
  const espressoSaucer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.012, 14), whiteLoungeMat);
  espressoSaucer.position.set(335.18, SAMSUNG_PODIUM_Y + 0.426, -28.72);
  staticGroup.add(espressoSaucer);
  const espressoCup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.065, 14), whiteLoungeMat);
  espressoCup.position.set(335.18, SAMSUNG_PODIUM_Y + 0.46, -28.72);
  staticGroup.add(espressoCup);

  // North Inner Wall: 3-Bay Architectural Samsung Accessories & Ecosystem Gallery
  const alabasterWallMat = new THREE.MeshStandardMaterial({
    color: 0xe6e0d5,
    roughness: 0.72,
    metalness: 0.04,
  });

  // Lower dark obsidian credenza cabinet running beneath all 3 bays
  const accessoryCabinet = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.86, 0.72), darkBronzeMat);
  accessoryCabinet.position.set(343.2, SAMSUNG_PODIUM_Y + 0.43, -34.62);
  staticGroup.add(accessoryCabinet);

  const cabinetTopOak = new THREE.Mesh(new THREE.BoxGeometry(11.82, 0.045, 0.74), warmOakMat);
  cabinetTopOak.position.set(343.2, SAMSUNG_PODIUM_Y + 0.88, -34.62);
  staticGroup.add(cabinetTopOak);

  // Warm limestone recessed niche backing + dark architectural perimeter frame
  const accessoryRecessFrame = new THREE.Mesh(new THREE.BoxGeometry(11.8, 2.86, 0.14), darkBronzeMat);
  accessoryRecessFrame.position.set(343.2, SAMSUNG_PODIUM_Y + 2.33, -34.94);
  staticGroup.add(accessoryRecessFrame);

  const accessoryBackWall = new THREE.Mesh(new THREE.BoxGeometry(11.4, 2.66, 0.08), alabasterWallMat);
  accessoryBackWall.position.set(343.2, SAMSUNG_PODIUM_Y + 2.31, -34.86);
  staticGroup.add(accessoryBackWall);

  // Upper cornice overhang + warm architectural top-cove LED strip (soft boutique wash, NOT glaring wall)
  const accessoryCornice = new THREE.Mesh(new THREE.BoxGeometry(11.82, 0.14, 0.56), darkBronzeMat);
  accessoryCornice.position.set(343.2, SAMSUNG_PODIUM_Y + 3.69, -34.68);
  staticGroup.add(accessoryCornice);

  const coveStrip = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.025, 0.08), warmGoldHaloMat);
  coveStrip.position.set(343.2, SAMSUNG_PODIUM_Y + 3.61, -34.76);
  staticGroup.add(coveStrip);

  // Vertical honey-oak & bronze architectural bay dividers creating 3 distinct gallery bays
  [337.4, 341.25, 345.15, 349.0].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.74, 0.44), darkBronzeMat);
    mullion.position.set(mx, SAMSUNG_PODIUM_Y + 2.27, -34.72);
    staticGroup.add(mullion);

    const oakAccent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.74, 0.46), warmOakMat);
    oakAccent.position.set(mx, SAMSUNG_PODIUM_Y + 2.27, -34.71);
    staticGroup.add(oakAccent);
  });

  // Bay Header Plaques
  [
    { x: 339.32, title: 'CASES & S PEN' },
    { x: 343.2, title: 'GALAXY ECOSYSTEM' },
    { x: 347.08, title: 'TV & SOUND' },
  ].forEach((bay) => {
    const hdr = new THREE.Mesh(
      new THREE.PlaneGeometry(3.3, 0.34),
      new THREE.MeshBasicMaterial({ map: createBayHeaderTex(bay.title) })
    );
    hdr.position.set(bay.x, SAMSUNG_PODIUM_Y + 3.44, -34.78);
    hdr.userData.noMerge = true;
    staticGroup.add(hdr);
  });

  // --- BAY 1 (Left, X = 337.6 .. 341.0): Sculpted Official Galaxy Cases & S Pen Peg Wall ---
  const caseColors = [0x1e293b, 0x0284c7, 0xd97706, 0x10b981, 0x6366f1, 0xe11d48, 0xcbd5e1];
  [1.48, 2.18, 2.86].forEach((sy, rowIdx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 0.24), titaniumBlackMat);
    rail.position.set(339.32, SAMSUNG_PODIUM_Y + sy, -34.72);
    staticGroup.add(rail);

    const underLed = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.015, 0.03), warmGoldHaloMat);
    underLed.position.set(339.32, SAMSUNG_PODIUM_Y + sy - 0.024, -34.68);
    staticGroup.add(underLed);

    for (let k = 0; k < 6; k++) {
      const cx = 337.98 + k * 0.53;
      const caseMat = new THREE.MeshStandardMaterial({
        color: caseColors[(k + rowIdx * 2) % caseColors.length],
        roughness: 0.42,
        metalness: 0.08,
      });
      // Angled sleek smartphone case silhouette + camera cutout bump
      const caseGrp = new THREE.Group();
      caseGrp.position.set(cx, SAMSUNG_PODIUM_Y + sy + 0.16, -34.69);
      caseGrp.rotation.x = -0.18;

      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.27, 0.022), caseMat);
      caseGrp.add(shell);

      const camWindow = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.095, 0.008), titaniumBlackMat);
      camWindow.position.set(-0.036, 0.072, 0.011);
      caseGrp.add(camWindow);

      const magRing = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.004, 6, 16), satinSilverMat);
      magRing.position.set(0, -0.015, 0.012);
      caseGrp.add(magRing);

      staticGroup.add(caseGrp);
    }
  });

  // --- BAY 2 (Center, X = 341.4 .. 344.9): Galaxy Audio, Wearables & Retail Box Gallery ---
  const retailBoxMats = [
    createRetailBoxTex('S25 Ultra', '256GB • Titanium', '#0284c7', true),
    createRetailBoxTex('Z Fold6', 'Galaxy AI • 512GB', '#7c3aed', true),
    createRetailBoxTex('Buds3 Pro', 'Hi-Fi 24bit Audio', '#38bdf8', false),
    createRetailBoxTex('Watch Ultra', 'Titanium 47mm', '#f97316', true),
    createRetailBoxTex('Tab S10+', 'S Pen Included', '#0ea5e9', false),
  ].map((tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }));

  // Row 1 (Top): Curved Galaxy Buds3 Pro & Watch Showcase on Illuminated Oak Shelf
  const midShelfTopY = SAMSUNG_PODIUM_Y + 2.62;
  const b2TopShelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 0.38), warmOakMat);
  b2TopShelf.position.set(343.2, midShelfTopY, -34.66);
  staticGroup.add(b2TopShelf);

  const b2TopLed = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.016, 0.03), warmGoldHaloMat);
  b2TopLed.position.set(343.2, midShelfTopY - 0.028, -34.56);
  staticGroup.add(b2TopLed);

  addGalaxyBudsDisplay(342.15, midShelfTopY + 0.025, -34.62, -Math.PI / 2);
  addGalaxyWatchTray(343.2, midShelfTopY + 0.025, -34.62, -Math.PI / 2);
  addGalaxyBudsDisplay(344.25, midShelfTopY + 0.025, -34.62, -Math.PI / 2);

  // Row 2 (Middle) & Row 3 (Credenza Counter): Retail Galaxy Flagship Packaging Sets
  [SAMSUNG_PODIUM_Y + 1.56, SAMSUNG_PODIUM_Y + 0.905].forEach((shelfY, rIdx) => {
    if (rIdx === 0) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 0.38), warmOakMat);
      sh.position.set(343.2, shelfY, -34.66);
      staticGroup.add(sh);
      const sLed = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.016, 0.03), warmGoldHaloMat);
      sLed.position.set(343.2, shelfY - 0.028, -34.56);
      staticGroup.add(sLed);
    }

    for (let b = 0; b < 5; b++) {
      const boxW = b === 4 ? 0.34 : 0.24;
      const boxH = b === 4 ? 0.44 : 0.36;
      const bx = 341.88 + b * 0.66;
      const mat = retailBoxMats[(b + rIdx * 2) % retailBoxMats.length];
      const box = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, 0.14), mat);
      box.position.set(bx, shelfY + boxH * 0.5 + 0.02, -34.64);
      staticGroup.add(box);
    }
  });

  // --- BAY 3 (Right, X = 345.3 .. 348.8): Neo QLED 8K / Music Frame & Dolby Atmos Soundbar ---
  const tvTex = createScreenShowcaseTex('frame_tv');
  const tvScreenMat = new THREE.MeshStandardMaterial({
    map: tvTex,
    emissive: 0xffffff,
    emissiveMap: tvTex,
    emissiveIntensity: 0.62,
    roughness: 0.18,
  });
  neonMats.push(tvScreenMat);

  const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.38, 0.08), titaniumBlackMat);
  tvBezel.position.set(347.08, SAMSUNG_PODIUM_Y + 2.38, -34.78);
  staticGroup.add(tvBezel);

  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.54, 1.28), tvScreenMat);
  tvScreen.position.set(347.08, SAMSUNG_PODIUM_Y + 2.38, -34.73);
  tvScreen.userData.noMerge = true;
  staticGroup.add(tvScreen);

  // Sleek Q-Series Soundbar + Wireless Subwoofer resting on credenza below TV
  const soundbar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.13, 0.22), titaniumBlackMat);
  soundbar.position.set(346.75, SAMSUNG_PODIUM_Y + 0.97, -34.56);
  staticGroup.add(soundbar);

  const soundbarMesh = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.09, 0.02), satinSilverMat);
  soundbarMesh.position.set(346.75, SAMSUNG_PODIUM_Y + 0.97, -34.44);
  staticGroup.add(soundbarMesh);

  const subWoofer = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.42), titaniumBlackMat);
  subWoofer.position.set(348.35, SAMSUNG_PODIUM_Y + 1.18, -34.58);
  staticGroup.add(subWoofer);

  const subRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.014, 8, 20), satinSilverMat);
  subRing.position.set(348.35, SAMSUNG_PODIUM_Y + 1.18, -34.36);
  staticGroup.add(subRing);

  // -------------------------------------------------------------------------
  // 7. HERO ROOFTOP 8-PANEL CURVED ROUNDED-CORNER MOSAIC GALLERY (IMAGE 2 & 3!)
  // -------------------------------------------------------------------------
  const mosaicCols = 4;
  const mosaicRows = 2;
  const mosaicSpanZ = 21.4;
  const colSpacing = mosaicSpanZ / mosaicCols; // 5.35m
  const startZ = -12.3;

  // Sleek hidden rear structural steel masts tying the 8 tiles cleanly onto the roof deck
  [-32.2, -26.1, -19.9, -13.8].forEach((tz) => {
    const baseY = getCanopyY(tz);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.3, 0.24), darkBronzeMat);
    mast.position.set(350.95, baseY + 2.15, tz);
    staticGroup.add(mast);
  });

  const billboardTileMats: THREE.MeshStandardMaterial[] = [];

  for (let row = 0; row < mosaicRows; row++) {
    for (let col = 0; col < mosaicCols; col++) {
      const tileIdx = row * mosaicCols + col;
      const pz = startZ - colSpacing * 0.5 - col * colSpacing;
      const normU = ((col + 0.5) / mosaicCols - 0.5) * 2; // -1 .. +1
      const px = 352.05 + normU * normU * 0.62;
      const baseHeight = row === 0 ? 10.0 : 7.1;
      const py = baseHeight + (col === 1 || col === 2 ? 0.14 : -0.04);
      const tileW = col === 1 || col === 2 ? 4.92 : 4.62;
      const tileH = 2.52;
      const curveYaw = Math.PI / 2 - normU * 0.16;

      // Exact rounded-corner beveled obsidian casing matching tile silhouette
      const bezelMesh = new THREE.Mesh(
        createRoundedBezelGeo(tileW + 0.12, tileH + 0.12, 0.34, 0.16),
        darkBronzeMat
      );
      bezelMesh.position.set(px, py, pz);
      bezelMesh.rotation.y = curveYaw;
      staticGroup.add(bezelMesh);

      // Photographic rounded-corner LED display panel
      const tileTex = createMosaicTileTex(tileIdx);
      const tileMat = new THREE.MeshStandardMaterial({
        map: tileTex,
        color: 0xd8dee9,
        emissive: 0xffffff,
        emissiveMap: tileTex,
        emissiveIntensity: 0.26,
        roughness: 0.26,
        metalness: 0.04,
      });
      billboardTileMats.push(tileMat);

      const tileMesh = new THREE.Mesh(
        createRoundedScreenGeo(tileW, tileH, 0.3, 12),
        tileMat
      );
      const yawDelta = normU * 0.16;
      tileMesh.position.set(
        px + Math.cos(yawDelta) * 0.045,
        py,
        pz + Math.sin(yawDelta) * 0.045
      );
      tileMesh.rotation.y = curveYaw;
      tileMesh.userData.noMerge = true;
      staticGroup.add(tileMesh);
    }
  }

  // -------------------------------------------------------------------------
  // 8. BALANCED STORE LIGHTING (COOL BLUE ZONE + WARM GOLD LOUNGE + CANOPY)
  // -------------------------------------------------------------------------
  let currentOpenFactor = 1;
  const addLight = (
    color: number,
    dayInt: number,
    nightInt: number,
    distance: number,
    x: number,
    y: number,
    z: number,
    alwaysOn = false
  ) => {
    const light = new THREE.PointLight(color, dayInt, distance, 1.4);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => (alwaysOn ? 1 : currentOpenFactor),
    });
  };

  // Left Cool Electric-Blue Light Tunnel Illumination
  addLight(0x38bdf8, 5.2, 8.6, 24, 343.0, 3.2, -16.2);
  // Right Warm Golden Architectural Lounge Illumination
  addLight(0xfde68a, 5.8, 9.6, 28, 343.5, 3.8, -28.8);
  // Rear Brick Feature Wall Wash
  addLight(0xfef3c7, 4.4, 7.2, 22, 333.5, 3.4, -29.0);
  // Front Canopy Entrance Warm Pool
  addLight(0xfef3c7, 1.5, 4.8, 22, 354.5, 4.4, -23.0, true);

  // Warm subtle glow pool across covered promenade
  const apronPoolMat = new THREE.MeshBasicMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  poolMats.push(apronPoolMat);
  const apronPool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 22.0), apronPoolMat);
  apronPool.rotation.x = -Math.PI / 2;
  apronPool.position.set(354.8, SAMSUNG_PODIUM_Y + 0.015, SAMSUNG_CENTER_Z);
  apronPool.userData.noMerge = true;
  staticGroup.add(apronPool);

  // -------------------------------------------------------------------------
  // 9. OPERATING STATE, AUTOMATIC DOOR & ROLLING SHUTTER UPDATE LOOP
  // -------------------------------------------------------------------------
  let doorOpenAmount = 0;
  let shutterProgress = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: SamsungStoreNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isSamsungStoreOpenAtHour(rawHour);
    currentOpenFactor = isOpen ? 1 : THREE.MathUtils.lerp(1, 0.25, shutterProgress);

    // Rich saturated daytime mosaic vs luminous backlit night mosaic
    const tileGlow = THREE.MathUtils.lerp(0.25, 0.78, lampFactor);
    for (let i = 0; i < billboardTileMats.length; i++) {
      billboardTileMats[i].emissiveIntensity = tileGlow;
    }

    electricBlueLedMat.emissiveIntensity = THREE.MathUtils.lerp(2.2, 4.2, lampFactor) * currentOpenFactor;
    deepCobaltLedMat.emissiveIntensity = THREE.MathUtils.lerp(1.9, 3.6, lampFactor) * currentOpenFactor;
    warmGoldHaloMat.emissiveIntensity = THREE.MathUtils.lerp(2.2, 4.0, lampFactor) * currentOpenFactor;
    soffitDownlightMat.emissiveIntensity = THREE.MathUtils.lerp(2.6, 4.8, lampFactor) * currentOpenFactor;
    logoMat.emissiveIntensity = THREE.MathUtils.lerp(1.85, 3.2, lampFactor);

    let wantsDoorOpen = false;
    if (isOpen) {
      if (playerPos) {
        const dist = Math.hypot(playerPos.x - SAMSUNG_DOOR_X, playerPos.z - SAMSUNG_DOOR_Z);
        if (dist <= 4.3) wantsDoorOpen = true;
      }
      if (!wantsDoorOpen && npcController?.hasNpcNearDoor()) {
        wantsDoorOpen = true;
      }
    }

    const targetDoor = wantsDoorOpen ? 1 : 0;
    doorOpenAmount += (targetDoor - doorOpenAmount) * Math.min(1, dt * 6.5);
    const slideOffset = doorOpenAmount * 1.9;
    doorLeafNorth.position.z = doorLeafNorthClosedZ - slideOffset;
    doorLeafSouth.position.z = doorLeafSouthClosedZ + slideOffset;

    const npcsEmpty = npcController ? npcController.isFullyClosedAndEmpty() : true;
    const targetShutter = !isOpen && (npcsEmpty || shutterProgress > 0.05) ? 1 : 0;
    shutterProgress += (targetShutter - shutterProgress) * Math.min(1, dt * 2.2);
    setShutterProgress(shutterHandle, shutterProgress);
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => shutterProgress,
    update,
  };
}

// =========================================================================
// SAMSUNG STORE NPC CONTROLLER (SPECIALISTS & SHOPPERS)
// =========================================================================

interface SamsungActor {
  id: number;
  kind: 'specialist' | 'shopper';
  root: THREE.Group;
  headMesh: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  bagMesh: THREE.Mesh;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: 'browse' | 'admire' | 'walk_leave' | 'respawn_wait';
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  targetYaw: number;
  stateTimer: number;
  walkPhase: number;
  walkPhaseRef: { phase: number };
  exitRef: { idx: number };
  exitDone: boolean;
  speed: number;
  seed: number;
  glbHandle: GlbHumanHandle;
}

const SAMSUNG_BROWSE_SPOTS: Array<{ x: number; z: number; yaw: number }> = [
  { x: 348.2, z: -29.8, yaw: -Math.PI / 2 }, // Inside sliding doors
  { x: 343.2, z: -31.8, yaw: Math.PI }, // North Galaxy Experience Table
  { x: 343.2, z: -26.0, yaw: 0 }, // Center Warm Oak Experience Table
  { x: 338.2, z: -29.2, yaw: -Math.PI / 2 }, // Looking toward Samsung Showcase Brick Wall
  { x: 341.8, z: -33.6, yaw: Math.PI }, // Accessory & Wearables Shelf Bay
  { x: 350.1, z: -19.6, yaw: -Math.PI / 2 }, // Blue Zone Galaxy Pedestals (clear of tunnel vista)
  { x: 346.6, z: -13.2, yaw: -Math.PI / 2 }, // Side of Blue LED Light Tunnel
  { x: 337.2, z: -26.5, yaw: -Math.PI / 2 }, // Near White Lounge area
];

function buildSamsungBrowseRoute(
  fromPos: THREE.Vector3,
  spot: { x: number; z: number; yaw: number },
  spawnOutside: boolean
): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];
  if (spawnOutside) {
    path.push(
      new THREE.Vector3(356.2, SAMSUNG_PODIUM_Y, SAMSUNG_DOOR_Z),
      new THREE.Vector3(350.8, SAMSUNG_PODIUM_Y, SAMSUNG_DOOR_Z)
    );
  }
  const crossesZone = (fromPos.z < -23.0 && spot.z >= -23.0) || (fromPos.z >= -23.0 && spot.z < -23.0);
  if (crossesZone) {
    path.push(
      new THREE.Vector3(350.2, SAMSUNG_PODIUM_Y, fromPos.z > -23.0 ? -15.6 : -27.2),
      new THREE.Vector3(350.2, SAMSUNG_PODIUM_Y, spot.z > -23.0 ? -15.6 : -27.2)
    );
  }
  path.push(new THREE.Vector3(spot.x, SAMSUNG_PODIUM_Y, spot.z));
  return path;
}

function buildSamsungExitRoute(fromPos: THREE.Vector3, id: number): THREE.Vector3[] {
  const exitOffsetZ = id % 2 === 0 ? -0.9 : 0.9;
  const pts: THREE.Vector3[] = [];
  if (fromPos.z > -23.0) {
    pts.push(
      new THREE.Vector3(350.2, SAMSUNG_PODIUM_Y, -15.6),
      new THREE.Vector3(350.2, SAMSUNG_PODIUM_Y, -27.8)
    );
  } else {
    pts.push(new THREE.Vector3(Math.max(338.0, fromPos.x), SAMSUNG_PODIUM_Y, -27.8));
  }
  pts.push(
    new THREE.Vector3(351.2, SAMSUNG_PODIUM_Y, SAMSUNG_DOOR_Z + exitOffsetZ),
    new THREE.Vector3(356.2, SAMSUNG_PODIUM_Y, SAMSUNG_DOOR_Z + exitOffsetZ),
    new THREE.Vector3(359.0, 0.0, SAMSUNG_DOOR_Z + (id % 2 === 0 ? -5.0 : 5.0))
  );
  return pts;
}

export class SamsungStoreNpcController {
  public rootGroup = new THREE.Group();
  private actors: SamsungActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    const bagTex = createSamsungBagTex();
    const bagMat = new THREE.MeshStandardMaterial({ map: bagTex, roughness: 0.45 });
    const lanyardMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });

    const configs: Array<{
      kind: 'specialist' | 'shopper';
      x: number;
      z: number;
      yaw: number;
      shirtHex: number;
      pantsHex: number;
      skinHex: string;
      hairHex: number;
    }> = [
      // Specialists neatly stationed beside tables & tunnel
      { kind: 'specialist', x: 344.8, z: -29.2, yaw: Math.PI / 2, shirtHex: 0x0369a1, pantsHex: 0x0f172a, skinHex: '#f3cfb6', hairHex: 0x1c1917 },
      { kind: 'specialist', x: 346.6, z: -13.0, yaw: Math.PI / 2, shirtHex: 0x0284c7, pantsHex: 0x1e293b, skinHex: '#ebc3a6', hairHex: 0x27272a },
      { kind: 'specialist', x: 337.6, z: -29.0, yaw: Math.PI / 2, shirtHex: 0x0369a1, pantsHex: 0x0f172a, skinHex: '#f4d2bc', hairHex: 0x111827 },
      // Browsing Customers
      { kind: 'shopper', x: 343.2, z: -31.8, yaw: Math.PI, shirtHex: 0xf8fafc, pantsHex: 0x1e293b, skinHex: '#f5d4bd', hairHex: 0x292524 },
      { kind: 'shopper', x: 343.2, z: -26.0, yaw: 0, shirtHex: 0x38bdf8, pantsHex: 0x334155, skinHex: '#ebc3a6', hairHex: 0x18181b },
      { kind: 'shopper', x: 350.1, z: -19.6, yaw: -Math.PI / 2, shirtHex: 0xf97316, pantsHex: 0x0f172a, skinHex: '#f2ccb2', hairHex: 0x3f2e21 },
      { kind: 'shopper', x: 341.8, z: -33.6, yaw: Math.PI, shirtHex: 0x10b981, pantsHex: 0x0f172a, skinHex: '#f3cfb6', hairHex: 0x1c1917 },
    ];

    configs.forEach((cfg, idx) => {
      const grp = new THREE.Group();
      const fallbackGroup = new THREE.Group();
      grp.add(fallbackGroup);
      const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skinHex, roughness: 0.72 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: cfg.shirtHex, roughness: 0.65 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pantsHex, roughness: 0.74 });
      const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hairHex, roughness: 0.85 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.58, 0.25), shirtMat);
      torso.position.y = 1.06;
      fallbackGroup.add(torso);

      if (cfg.kind === 'specialist') {
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.02), lanyardMat);
        badge.position.set(0.09, 1.16, 0.13);
        fallbackGroup.add(badge);
      }

      const faceTex = helpers.createFaceTexture('happy', cfg.skinHex);
      const head = helpers.createHeadMesh(skinMat, faceTex, 0.34, 0.34, 0.34);
      head.position.y = 1.54;
      fallbackGroup.add(head);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.36), hairMat);
      hair.position.y = 1.69;
      fallbackGroup.add(hair);

      const makeArm = (ax: number) => {
        const p = new THREE.Group();
        p.position.set(ax, 1.3, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.13), shirtMat);
        m.position.y = -0.2;
        p.add(m);
        fallbackGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.29);
      const rightArm = makeArm(0.29);

      const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.24), bagMat);
      bagMesh.position.set(0.06, -0.44, 0.04);
      bagMesh.visible = cfg.kind === 'shopper' && idx % 2 === 1;
      rightArm.add(bagMesh);

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0.76, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.66, 0.17), pantsMat);
        leg.position.y = -0.33;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.25), shoeMat);
        shoe.position.set(0, -0.71, 0.04);
        p.add(shoe);
        fallbackGroup.add(p);
        return p;
      };
      const leftLeg = makeLeg(-0.11);
      const rightLeg = makeLeg(0.11);

      const spec =
        cfg.kind === 'specialist'
          ? idx === 0
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(idx + 41)
          : pickShopCustomerModel(idx + 47);
      const initState =
        cfg.kind === 'specialist' ? (idx === 0 ? 'Checkout' : 'Idle') : 'Walk';
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: grp,
        fallbackMeshes: [fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: initState,
        phaseOffset: idx * 0.71,
      });

      grp.position.set(cfg.x, SAMSUNG_PODIUM_Y, cfg.z);
      grp.rotation.y = cfg.yaw;
      this.rootGroup.add(grp);

      const actor: SamsungActor = {
        id: idx,
        kind: cfg.kind,
        root: grp,
        headMesh: head,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        bagMesh,
        homePos: new THREE.Vector3(cfg.x, SAMSUNG_PODIUM_Y, cfg.z),
        homeYaw: cfg.yaw,
        phase: cfg.kind === 'specialist' ? 'admire' : 'browse',
        pathQueue: [],
        pathIdx: 0,
        targetYaw: cfg.yaw,
        stateTimer: 1.5 + idx * 0.7,
        walkPhase: idx * 1.1,
        walkPhaseRef: { phase: idx * 1.1 },
        exitRef: { idx: 0 },
        exitDone: false,
        speed: 1.16 + (idx % 3) * 0.08,
        seed: idx * 1.9,
        glbHandle,
      };
      if (actor.kind === 'shopper') {
        this.assignNewSpot(actor, false);
      }
      this.actors.push(actor);
    });
  }

  private assignNewSpot(a: SamsungActor, spawnOutside: boolean) {
    if (spawnOutside) {
      a.root.position.set(358.4, 0.0, SAMSUNG_DOOR_Z + (a.id % 2 === 0 ? -1.4 : 1.4));
    }
    const spot = SAMSUNG_BROWSE_SPOTS[Math.floor(Math.random() * SAMSUNG_BROWSE_SPOTS.length)];
    a.targetYaw = spot.yaw;
    a.pathQueue = buildSamsungBrowseRoute(a.root.position, spot, spawnOutside);
    a.pathIdx = 0;
    a.phase = 'browse';
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public hasNpcNearDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - SAMSUNG_DOOR_X, p.z - SAMSUNG_DOOR_Z) <= 3.8) return true;
    }
    return false;
  }

  private stepPath(a: SamsungActor, dt: number): boolean {
    if (a.pathIdx >= a.pathQueue.length) return true;
    const target = a.pathQueue[a.pathIdx];
    const dx = target.x - a.root.position.x;
    const dy = target.y - a.root.position.y;
    const dz = target.z - a.root.position.z;
    const distXZ = Math.hypot(dx, dz);
    const dist3D = Math.hypot(dx, dy, dz);
    const step = a.speed * dt;

    if (dist3D <= step + 0.06) {
      a.root.position.copy(target);
      a.pathIdx += 1;
      return a.pathIdx >= a.pathQueue.length;
    }

    const ratio = step / dist3D;
    a.root.position.x += dx * ratio;
    a.root.position.y += dy * ratio;
    a.root.position.z += dz * ratio;

    if (distXZ > 0.03) {
      const moveYaw = Math.atan2(dx, dz);
      let diff = moveYaw - a.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.root.rotation.y += diff * Math.min(1, dt * 8.5);
    }

    a.walkPhase += dt * 6.8;
    const swing = Math.sin(a.walkPhase) * 0.42;
    a.leftLeg.rotation.x = swing;
    a.rightLeg.rotation.x = -swing;
    a.leftArm.rotation.x = -swing * 0.52;
    a.rightArm.rotation.x = swing * 0.52;
    return false;
  }

  public update(delta: number, rawHour: number) {
    const dt = Math.min(delta, 0.1);
    this.timer += dt;
    const isOpen = isSamsungStoreOpenAtHour(rawHour);

    if (this.wasOpen === null) {
      this.wasOpen = isOpen;
      if (!isOpen) {
        this.closingActive = false;
        this.fullyClosedAndEmpty = true;
        this.actors.forEach((a) => {
          a.root.visible = false;
          a.exitDone = true;
        });
        return;
      }
    }

    if (this.wasOpen && !isOpen) {
      this.closingActive = true;
      this.fullyClosedAndEmpty = false;
      this.actors.forEach((a) => {
        if (!a.root.visible) {
          a.exitDone = true;
          return;
        }
        a.exitDone = false;
        a.exitRef.idx = 0;
        a.pathQueue = buildSamsungExitRoute(a.root.position, a.id);
        a.glbHandle.setAnimState('Walk');
      });
    } else if (!this.wasOpen && isOpen) {
      this.closingActive = false;
      this.fullyClosedAndEmpty = false;
      this.actors.forEach((a) => {
        a.exitDone = false;
        a.root.visible = true;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = 0;
        a.rightArm.rotation.x = 0;
        if (a.kind === 'specialist') {
          a.root.position.copy(a.homePos);
          a.root.rotation.y = a.homeYaw;
          a.phase = 'admire';
          a.glbHandle.setAnimState(a.id === 0 ? 'Checkout' : 'Idle');
        } else {
          this.assignNewSpot(a, true);
          a.glbHandle.setAnimState('Walk');
        }
      });
    }
    this.wasOpen = isOpen;

    if (!isOpen) {
      if (this.closingActive) {
        let allDone = true;
        this.actors.forEach((a) => {
          if (!a.exitDone) {
            const done = advanceNpcExitPath(
              a.root,
              a.pathQueue,
              a.exitRef,
              a.speed * 1.15,
              dt,
              { legL: a.leftLeg, legR: a.rightLeg, armL: a.leftArm, armR: a.rightArm },
              a.walkPhaseRef
            );
            if (done) {
              a.exitDone = true;
              a.root.visible = false;
              a.glbHandle.setAnimState('Idle');
            } else {
              allDone = false;
            }
          }
        });
        if (allDone) {
          this.closingActive = false;
          this.fullyClosedAndEmpty = true;
        }
      }
      return;
    }

    this.actors.forEach((a) => {
      if (a.kind === 'specialist') {
        a.glbHandle.setAnimState(a.id === 0 ? 'Checkout' : 'Idle');
        a.root.rotation.y = a.homeYaw + Math.sin(this.timer * 1.1 + a.seed) * 0.08;
        a.headMesh.rotation.y = Math.sin(this.timer * 0.9 + a.seed) * 0.16;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = -0.04;
        a.rightArm.rotation.x = -0.04;
        return;
      }

      if (a.phase === 'respawn_wait') {
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          a.root.visible = true;
          a.bagMesh.visible = Math.random() > 0.4;
          this.assignNewSpot(a, true);
          a.glbHandle.setAnimState('Walk');
        }
        return;
      }

      if (a.phase === 'browse') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'admire';
          a.stateTimer = 4.0 + (a.id % 4) * 1.4;
          a.glbHandle.setAnimState('Idle');
        }
      } else if (a.phase === 'admire') {
        a.glbHandle.setAnimState('Idle');
        let diff = a.targetYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 5.0);
        a.headMesh.rotation.y = Math.sin(this.timer * 1.3 + a.seed) * 0.22;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = 0;
        a.rightArm.rotation.x = a.bagMesh.visible ? -0.18 : 0;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          if (Math.random() < 0.3) {
            a.phase = 'walk_leave';
            a.bagMesh.visible = true;
            a.pathQueue = buildSamsungExitRoute(a.root.position, a.id);
            a.pathIdx = 0;
            a.glbHandle.setAnimState('Walk');
          } else {
            this.assignNewSpot(a, false);
            a.glbHandle.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'respawn_wait';
          a.root.visible = false;
          a.stateTimer = 2.0 + (a.id % 3) * 1.2;
          a.glbHandle.setAnimState('Idle');
        }
      }
    });
  }
}
