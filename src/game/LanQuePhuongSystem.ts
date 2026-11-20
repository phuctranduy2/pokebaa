import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  ADULT_NPC_MODELS,
  CASHIER_NPC_MODEL,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isLanQuePhuongOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';

export const LAN_QUE_FLOOR2_Y = 4.40;

export function isPlayerInLanQuePhuongZone(x: number, z: number): boolean {
  return x >= 147.0 && x <= 180.2 && z >= -44.2 && z <= -14.2;
}

export interface LanQuePhuongBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: LanQuePhuongNpcController | null
  ) => void;
  getClosedFactor: () => number;
}

// =========================================================================
// COLLIDERS: QUÁN NHẬU LAN QUẾ PHƯỜNG (X = 147.0..180.0, Z = -44.0..-14.2)
// Central Hong Kong neon alleyway (Z = -31.8..-26.4) & sidewalk wings stay wide open!
// Staircase climbs East->West (X = 159.0->153.5, Z = -30.6..-27.6) up to Floor 2!
// =========================================================================
export const LAN_QUE_COLLIDERS: IntersectionColliderBox[] = [
  // Perimeter Exterior Walls (West rear, North side, South wall next to TOXIC)
  { minX: 147.0, maxX: 148.0, minZ: -44.0, maxZ: -14.2, floor: 'both' },
  { minX: 147.2, maxX: 175.4, minZ: -44.1, maxZ: -43.3, floor: 'both' },
  { minX: 147.2, maxX: 175.4, minZ: -14.6, maxZ: -13.9, floor: 'both' },

  // Front Steel Gantry Pillars along Phố Đi Bộ Edge (X = 178.1..178.7)
  { minX: 178.0, maxX: 178.8, minZ: -43.6, maxZ: -42.8, floor: 1 },
  { minX: 178.0, maxX: 178.8, minZ: -33.4, maxZ: -32.6, floor: 1 },
  { minX: 178.0, maxX: 178.8, minZ: -25.6, maxZ: -24.8, floor: 1 },
  { minX: 178.0, maxX: 178.8, minZ: -15.4, maxZ: -14.6, floor: 1 },

  // Heritage Facade Columns (X = 174.3..175.1)
  { minX: 174.2, maxX: 175.2, minZ: -43.5, maxZ: -42.6, floor: 1 },
  { minX: 174.2, maxX: 175.2, minZ: -32.6, maxZ: -31.7, floor: 1 },
  { minX: 174.2, maxX: 175.2, minZ: -26.5, maxZ: -25.6, floor: 1 },
  { minX: 174.2, maxX: 175.2, minZ: -15.6, maxZ: -14.6, floor: 1 },

  // Wing Bar Counters (North Crimson Dai Pai Dong Bar & South Emerald HK Pub Bar)
  { minX: 152.2, maxX: 158.2, minZ: -42.6, maxZ: -38.6, floor: 1 },
  { minX: 152.2, maxX: 158.2, minZ: -20.0, maxZ: -15.8, floor: 1 },

  // Floor 1 Sidewalk & Indoor Quán Nhậu Tables (10 tables)
  ...[
    [176.2, -39.5],
    [176.2, -35.2],
    [176.2, -23.0],
    [176.2, -18.7],
    [168.5, -39.6],
    [168.5, -35.0],
    [162.5, -39.6],
    [168.5, -23.2],
    [168.5, -18.6],
    [162.5, -18.6],
  ].map(([tx, tz]) => ({
    minX: tx - 0.95,
    maxX: tx + 0.95,
    minZ: tz - 0.85,
    maxZ: tz + 0.85,
    floor: 1 as const,
  })),

  // Central Alley Staircase Side Guards (open at East foot X = 159.0!)
  { minX: 153.5, maxX: 159.1, minZ: -30.85, maxZ: -30.55, floor: 1 },
  { minX: 153.5, maxX: 159.1, minZ: -27.65, maxZ: -27.35, floor: 1 },

  // Floor 2 Atrium Balustrades overlooking central neon alley (Z = -32.1..-26.1)
  { minX: 153.5, maxX: 175.0, minZ: -32.2, maxZ: -31.8, floor: 2 },
  { minX: 153.5, maxX: 175.0, minZ: -26.4, maxZ: -26.0, floor: 2 },
  { minX: 174.6, maxX: 175.2, minZ: -43.5, maxZ: -14.5, floor: 2 },

  // Floor 2 Dining Tables (4 tables)
  ...[
    [169.0, -39.2],
    [162.0, -39.2],
    [169.0, -19.0],
    [162.0, -19.0],
  ].map(([tx, tz]) => ({
    minX: tx - 0.95,
    maxX: tx + 0.95,
    minZ: tz - 0.85,
    maxZ: tz + 0.85,
    floor: 2 as const,
  })),
];

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/**
 * Sky-Cutout Hero Roof Sign: "LAN QUẾ PHƯỜNG" in crisp jagged Kowloon amber-gold block letters
 */
function createLanQueHeroRoofSignTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 176px Impact, "Arial Black", sans-serif';

  // Deep extruded crimson-brown backing for punchy sky silhouette
  ctx.lineJoin = 'round';
  ctx.lineWidth = 26;
  ctx.strokeStyle = '#451a03';
  ctx.strokeText('LAN QUẾ PHƯỜNG', w * 0.5 + 8, h * 0.56 + 8);

  // Outer warm golden neon halo
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 34;
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#fef3c7';
  ctx.strokeText('LAN QUẾ PHƯỜNG', w * 0.5, h * 0.54);

  const grad = ctx.createLinearGradient(0, h * 0.18, 0, h * 0.84);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.45, '#fbbf24');
  grad.addColorStop(1, '#ea580c');
  ctx.fillStyle = grad;
  ctx.fillText('LAN QUẾ PHƯỜNG', w * 0.5, h * 0.54);
  ctx.shadowBlur = 0;

  // Subtle horizontal venetian louver slats across the jagged Hong Kong sign face (like Image 2)
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(120, 53, 15, 0.20)';
  for (let y = 24; y < h; y += 22) {
    ctx.fillRect(0, y, w, 4);
  }
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Crisp Illuminated Truss Lattice Frieze ("海 蘭 | 研 煎 | 海 蘭 | 研 煎")
 * Square backlit bays with crisp dark brush characters (never horizontally stretched)
 */
function createTrussChineseBannerTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 144;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#fff7ed');
  bgGrad.addColorStop(0.55, '#fef2f2');
  bgGrad.addColorStop(1, '#fed7aa');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle red backlit underside wash along truss lattice
  const chars = ['海', '蘭', '研', '煎', '海', '蘭', '研', '煎', '海', '蘭', '研', '煎', '海', '蘭', '研', '煎'];
  const cellW = w / chars.length;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 84px "PingFang TC", "Noto Serif TC", "Microsoft JhengHei", serif';

  chars.forEach((ch, idx) => {
    const x0 = idx * cellW;
    // Steel truss diagonal wireframe backing
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.52)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + cellW, h);
    ctx.moveTo(x0 + cellW, 0);
    ctx.lineTo(x0, h);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(203, 213, 225, 0.75)';
    ctx.lineWidth = 5;
    ctx.strokeRect(x0 + 2, 2, cellW - 4, h - 4);

    // Character with clean light halo
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#18181b';
    ctx.fillText(ch, x0 + cellW * 0.5, h * 0.53);
    ctx.shadowBlur = 0;
  });

  // Warm illuminated steel chords top & bottom
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, 8);
  ctx.fillRect(0, h - 8, w, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Procedural Hong Kong Neon Lightbox CanvasTexture
 */
function createHkNeonSignTex(opts: {
  bg: string;
  border: string;
  textColor: string;
  subColor?: string;
  lines: string[];
  vertical?: boolean;
  w?: number;
  h?: number;
  glow?: string;
  crown?: boolean;
}): THREE.CanvasTexture {
  const w = opts.w ?? (opts.vertical ? 256 : 512);
  const h = opts.h ?? (opts.vertical ? 768 : 256);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle metallic bevel + neon border
  ctx.shadowColor = opts.glow ?? opts.border;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = opts.border;
  ctx.lineWidth = 14;
  roundRectPath(ctx, 12, 12, w - 24, h - 24, 16);
  ctx.stroke();

  ctx.shadowBlur = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = 3;
  roundRectPath(ctx, 24, 24, w - 48, h - 48, 10);
  ctx.stroke();

  // Optional golden crown header (signature of 郭襄海鮮餐廳)
  let topPad = 42;
  if (opts.crown && opts.vertical) {
    topPad = 104;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(w * 0.25, 86);
    ctx.lineTo(w * 0.20, 44);
    ctx.lineTo(w * 0.38, 66);
    ctx.lineTo(w * 0.50, 36);
    ctx.lineTo(w * 0.62, 66);
    ctx.lineTo(w * 0.80, 44);
    ctx.lineTo(w * 0.75, 86);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowBlur = 12;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (opts.vertical) {
    const chars = opts.lines[0].split('');
    const usableH = h - topPad - 40;
    const stepY = usableH / Math.max(1, chars.length);
    const fontSize = Math.min(w * 0.62, stepY * 0.80);
    ctx.font = `900 ${Math.round(fontSize)}px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", serif`;
    ctx.fillStyle = opts.textColor;
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, w * 0.5, topPad + stepY * (idx + 0.5));
    });
  } else {
    const count = opts.lines.length;
    opts.lines.forEach((ln, idx) => {
      const y = ((idx + 1) / (count + 1)) * h;
      const isMain = idx === 0;
      const size = isMain ? Math.min(72, (h / (count + 0.4)) * 0.56) : Math.min(38, (h / (count + 0.4)) * 0.36);
      ctx.font = `900 ${Math.round(size)}px "PingFang TC", system-ui, sans-serif`;
      ctx.fillStyle = isMain ? opts.textColor : (opts.subColor ?? opts.textColor);
      ctx.fillText(ln, w * 0.5, y, w - 48);
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Iconic Scalloped Blue Pawnshop Medallion: "和泰 押"
 */
function createPawnshopMedallionTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  ctx.fillStyle = '#091124';
  ctx.beginPath();
  ctx.arc(256, 155, 118, 0, Math.PI * 2);
  ctx.arc(256, 338, 148, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 10;
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(256, 155, 112, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 338, 142, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 6;
  ctx.fillStyle = '#e0f2fe';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(256 + Math.cos(a) * 142, 338 + Math.sin(a) * 142, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ef4444';
  ctx.font = '900 72px serif';
  ctx.fillText('和泰', 256, 155);
  ctx.font = '900 132px serif';
  ctx.fillText('押', 256, 344);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Giant Crimson Hotpot Bowl Sign: "火鍋 / FOOD"
 */
function createHotpotSignTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  ctx.fillStyle = '#991b1b';
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 14;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 24;

  ctx.beginPath();
  ctx.moveTo(42, 130);
  ctx.lineTo(470, 130);
  ctx.quadraticCurveTo(458, 360, 340, 395);
  ctx.lineTo(340, 442);
  ctx.lineTo(172, 442);
  ctx.lineTo(172, 395);
  ctx.quadraticCurveTo(54, 360, 42, 130);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 112px "PingFang TC", serif';
  ctx.fillText('火鍋', 256, 224);
  ctx.fillStyle = '#fde047';
  ctx.font = '900 66px system-ui, sans-serif';
  ctx.fillText('FOOD', 256, 336);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Glowing White Round Medallion ("1", "9", "7", "9", "LAN", "QUẾ", "PHƯỜNG", "蘭")
 */
function createRoundDiscSignTex(label: string, color = '#dc2626'): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(128, 128, 105, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = label.length <= 2 ? '900 118px system-ui, sans-serif' : '900 42px system-ui, sans-serif';
  ctx.fillText(label, 128, 132);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * White & Crimson Triangle Pedestrian Crossing Sign Texture (Image 2 foreground)
 */
function createPedestrianTriangleSignTex(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 22;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(128, 22);
  ctx.lineTo(234, 222);
  ctx.lineTo(22, 222);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pedestrian icon inside triangle
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(128, 112, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#18181b';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(126, 164);
  ctx.lineTo(106, 200);
  ctx.moveTo(126, 164);
  ctx.lineTo(150, 200);
  ctx.moveTo(104, 148);
  ctx.lineTo(148, 148);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Colonial French Shuttered Window Facade Texture (Warm Amber Glowing Interior Windows)
 */
function createHeritageWindowFacadeTex(tintBg: string): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = tintBg;
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal plaster joints
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < h; y += 32) {
    ctx.fillRect(0, y, w, 3);
  }

  // Two arched/tall Hong Kong colonial French windows with warm amber glowing panes
  [54, 286].forEach((wx) => {
    // Dark green/wood shutter frame
    ctx.fillStyle = '#3f2e21';
    roundRectPath(ctx, wx - 10, 34, 192, 314, 14);
    ctx.fill();

    // Warm golden lit interior pane gradient
    const g = ctx.createLinearGradient(0, 48, 0, 332);
    g.addColorStop(0, '#fef3c7');
    g.addColorStop(0.55, '#fbbf24');
    g.addColorStop(1, '#d97706');
    ctx.fillStyle = g;
    roundRectPath(ctx, wx + 8, 48, 156, 286, 8);
    ctx.fill();

    // Crisp cream mullions (window muntin bars)
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(wx + 82, 48, 8, 286);
    for (let my = 112; my <= 280; my += 64) {
      ctx.fillRect(wx + 8, my, 156, 7);
    }
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Retro Hong Kong Bar/Dai Pai Dong Beer Poster Wall Art Texture
 */
function createRetroBeerWallTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#29150c';
  ctx.fillRect(0, 0, w, h);

  // 3 glowing vintage HK poster frames
  const cards = [
    { x: 24, bg: '#064e3b', border: '#4ade80', title: 'CARLSBERG', sub: 'HONG KONG 1979' },
    { x: 184, bg: '#7f1d1d', border: '#fde047', title: '青島啤酒', sub: 'ICE COLD BEER' },
    { x: 344, bg: '#1e3a8a', border: '#38bdf8', title: 'LKF CLUB', sub: 'OPEN TILL LATE' },
  ];
  cards.forEach((card) => {
    ctx.fillStyle = card.bg;
    ctx.strokeStyle = card.border;
    ctx.lineWidth = 6;
    roundRectPath(ctx, card.x, 26, 144, 204, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.fillText(card.title, card.x + 72, 112);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText(card.sub, card.x + 72, 152);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLanQueGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(253, 224, 71, 0.78)');
  g.addColorStop(0.45, 'rgba(251, 146, 60, 0.40)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createLanQuePhuongStructure(): LanQuePhuongBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared Architectural Materials (Warm Hong Kong Heritage Plaster + Emerald Pub + Crimson Dai Pai Dong)
  const darkAsphaltMat = new THREE.MeshStandardMaterial({ color: 0x242731, roughness: 0.88 });
  const hkSidewalkMat = new THREE.MeshStandardMaterial({ color: 0x575049, roughness: 0.82 });
  const creamPlasterMat = new THREE.MeshStandardMaterial({ color: 0xf1e8da, roughness: 0.72 });
  const warmTimberFloorMat = new THREE.MeshStandardMaterial({ color: 0x6b3e26, roughness: 0.78 });
  const emeraldWallMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.65 });
  const crimsonBrickMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 });
  const warmTerracottaMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.74 });
  const steelFrameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.42, metalness: 0.65 });
  const trussWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.38, metalness: 0.45 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c2b0e, roughness: 0.64 });

  // Warm illuminated interior soffit & awning materials (eliminates dark cave voids!)
  const warmCeilingSoffitMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xd97706,
    emissiveIntensity: 0.34,
    roughness: 0.6,
  });
  const pinkPleatedCanopyMat = new THREE.MeshStandardMaterial({
    color: 0xfbcfe8,
    emissive: 0xf472b6,
    emissiveIntensity: 0.52,
    roughness: 0.45,
  });
  const crimsonAtticGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    emissive: 0xdc2626,
    emissiveIntensity: 0.62,
    roughness: 0.48,
  });
  const beerGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.62,
    roughness: 0.22,
  });

  const amberNeonMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });
  const redLanternMat = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xef4444,
    emissiveIntensity: 1.45,
    roughness: 0.32,
  });
  const pinkNeonMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xec4899,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });
  const cyanNeonMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });
  const greenNeonMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  neonMats.push(amberNeonMat, pinkNeonMat, cyanNeonMat, greenNeonMat);
  lanternMats.push(redLanternMat);

  const signDynamicMats: THREE.MeshStandardMaterial[] = [];

  const poolTex = createLanQueGlowPoolTex();
  const lqPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(lqPoolMat);

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material
  ) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)),
      mat
    );
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    staticGroup.add(m);
    return m;
  };

  // =========================================================================
  // 1. GROUND SLABS, HONG KONG STREET CROSSWALK ALLEY & TRAFFIC PROPS (IMAGE 2)
  // =========================================================================
  addBox(147.0, 180.0, -0.24, 0.0, -44.0, -31.8, hkSidewalkMat);
  addBox(147.0, 180.0, -0.24, 0.0, -26.4, -14.2, hkSidewalkMat);
  addBox(147.0, 180.0, -0.25, 0.01, -31.8, -26.4, darkAsphaltMat);
  // Warm tiled indoor wing floor accents
  addBox(148.0, 174.5, 0.002, 0.014, -43.2, -32.2, warmTimberFloorMat);
  addBox(148.0, 174.5, 0.002, 0.014, -26.0, -14.8, warmTimberFloorMat);

  // White Zebra Crosswalk at Phố Đi Bộ Mouth (X=177.2..179.4) + Center Dashed Strip
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
  for (let sz = -31.2; sz <= -26.8; sz += 0.88) {
    addBox(177.2, 179.4, 0.012, 0.024, sz - 0.19, sz + 0.19, stripeMat);
  }
  for (let cx = 160.2; cx <= 176.4; cx += 2.3) {
    addBox(cx, cx + 1.25, 0.012, 0.024, -29.18, -29.02, stripeMat);
  }

  // Warm Golden Street & Wing Glow Pools
  const streetPool = new THREE.Mesh(new THREE.PlaneGeometry(26, 28), lqPoolMat);
  streetPool.rotation.x = -Math.PI / 2;
  streetPool.position.set(171.5, 0.025, -29.1);
  staticGroup.add(streetPool);

  // Red Fire Hydrant + Bright Orange HK Curb Bins
  const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.78, 10), crimsonBrickMat);
  hydrant.position.set(177.8, 0.39, -32.2);
  staticGroup.add(hydrant);
  const hydrantCap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), redLanternMat);
  hydrantCap.position.set(177.8, 0.80, -32.2);
  staticGroup.add(hydrantCap);

  [-25.9, -16.4, -42.0].forEach((bz) => {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.88, 10), warmTerracottaMat);
    bin.position.set(177.9, 0.44, bz);
    staticGroup.add(bin);
    const binCap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 10), steelFrameMat);
    binCap.position.set(177.9, 0.90, bz);
    staticGroup.add(binCap);
  });

  // Crisp White/Red Pedestrian Crossing Triangle Signs (facing East & West)
  const triSignTex = createPedestrianTriangleSignTex();
  const triSignMat = new THREE.MeshStandardMaterial({
    map: triSignTex,
    emissive: 0xffffff,
    emissiveMap: triSignTex,
    emissiveIntensity: 0.75,
    alphaTest: 0.2,
    side: THREE.DoubleSide,
  });
  [-33.8, -24.4].forEach((sz) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.95, 8), steelFrameMat);
    pole.position.set(178.42, 1.475, sz);
    staticGroup.add(pole);
    const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), triSignMat);
    signBoard.rotation.y = Math.PI / 2;
    signBoard.position.set(178.48, 2.75, sz);
    staticGroup.add(signBoard);
  });

  // Twin Hong Kong Traffic Signal Heads mounted on middle gantry pillars (Image 2!)
  [-32.95, -25.25].forEach((sz, idx) => {
    addBox(178.55, 178.88, 2.85, 3.85, sz - 0.18, sz + 0.18, steelFrameMat);
    const redOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 8, 8),
      idx === 0 ? redLanternMat : steelFrameMat
    );
    redOrb.position.set(178.90, 3.62, sz);
    staticGroup.add(redOrb);

    const amberOrb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), amberNeonMat);
    amberOrb.position.set(178.90, 3.35, sz);
    staticGroup.add(amberOrb);

    const greenOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 8, 8),
      idx === 1 ? greenNeonMat : steelFrameMat
    );
    greenOrb.position.set(178.90, 3.08, sz);
    staticGroup.add(greenOrb);
  });

  // =========================================================================
  // 2. MONUMENTAL STEEL TRUSS GANTRY + GLOWING ATTIC ROOF + "LAN QUẾ PHƯỜNG"
  // =========================================================================
  // Four Front Steel Gantry Pillars with subtle warm trim bases
  [-43.2, -33.0, -25.2, -15.0].forEach((pz) => {
    addBox(178.18, 178.62, 0.0, 8.95, pz - 0.22, pz + 0.22, steelFrameMat);
    addBox(178.12, 178.68, 0.0, 0.35, pz - 0.26, pz + 0.26, creamPlasterMat);
  });

  // Overhead Steel Truss Frame (Y = 7.65 .. 8.85, spanning all Z = -43.5..-14.7)
  addBox(178.25, 178.65, 8.68, 8.86, -43.5, -14.7, trussWhiteMat);
  addBox(178.25, 178.65, 7.60, 7.78, -43.5, -14.7, trussWhiteMat);
  for (let zt = -43.0; zt <= -15.0; zt += 1.8) {
    addBox(178.28, 178.62, 7.68, 8.76, zt - 0.05, zt + 0.05, trussWhiteMat);
  }

  // Crisp Square-Tile Illuminated Chinese Truss Frieze ("海 蘭 研 煎 ...")
  const chineseFriezeTex = createTrussChineseBannerTex();
  const chineseFriezeMat = new THREE.MeshStandardMaterial({
    map: chineseFriezeTex,
    emissive: 0xffffff,
    emissiveMap: chineseFriezeTex,
    emissiveIntensity: 1.05,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(chineseFriezeMat);
  const chineseFrieze = new THREE.Mesh(new THREE.PlaneGeometry(28.4, 0.96), chineseFriezeMat);
  chineseFrieze.rotation.y = Math.PI / 2;
  chineseFrieze.position.set(178.70, 8.22, -29.1);
  staticGroup.add(chineseFrieze);

  // Upper Floor 3 Colonial Corrugated Roof & Glowing Crimson Attic Backdrop behind "LAN QUẾ PHƯỜNG" (Image 2!)
  const atticWindowTex = createHeritageWindowFacadeTex('#7f1d1d');
  const atticWindowMat = new THREE.MeshStandardMaterial({
    map: atticWindowTex,
    emissive: 0xf97316,
    emissiveMap: atticWindowTex,
    emissiveIntensity: 0.65,
    roughness: 0.6,
  });
  addBox(173.4, 174.4, 8.4, 10.75, -43.2, -15.0, crimsonAtticGlowMat);
  const atticFace = new THREE.Mesh(new THREE.PlaneGeometry(27.6, 2.2), atticWindowMat);
  atticFace.rotation.y = Math.PI / 2;
  atticFace.position.set(174.45, 9.65, -29.1);
  staticGroup.add(atticFace);
  // Crown cornice overhang
  addBox(173.2, 175.4, 10.65, 10.95, -43.5, -14.7, creamPlasterMat);

  // Giant Sky-Cutout Golden Signboard: "LAN QUẾ PHƯỜNG" resting atop the truss!
  const heroSignTex = createLanQueHeroRoofSignTex();
  const heroSignMat = new THREE.MeshStandardMaterial({
    map: heroSignTex,
    emissive: 0xffffff,
    emissiveMap: heroSignTex,
    emissiveIntensity: 1.18,
    alphaTest: 0.24,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(heroSignMat);
  const heroSign = new THREE.Mesh(new THREE.PlaneGeometry(25.2, 3.65), heroSignMat);
  heroSign.rotation.y = Math.PI / 2;
  heroSign.position.set(178.78, 10.20, -29.1);
  staticGroup.add(heroSign);

  // Top Steel Wireframe Rack wrapping the giant calligraphy letters
  addBox(178.40, 178.52, 11.42, 11.50, -43.3, -14.9, trussWhiteMat);
  addBox(178.40, 178.52, 10.05, 10.11, -43.3, -14.9, trussWhiteMat);
  [-43.3, -36.2, -29.1, -22.0, -14.9].forEach((pz) => {
    addBox(178.40, 178.52, 8.85, 11.48, pz - 0.045, pz + 0.045, trussWhiteMat);
  });

  // =========================================================================
  // 3. TWO-FLOOR HONG KONG HERITAGE WINGS + WARM FACADE WINDOWS + BALUSTRADES
  // =========================================================================
  const f2Y = LAN_QUE_FLOOR2_Y;

  // Perimeter Exterior Walls + Corrugated Roof Canopy
  addBox(147.1, 147.8, 0.0, 9.4, -44.0, -14.2, creamPlasterMat);
  addBox(147.2, 175.0, 0.0, 9.4, -44.0, -43.4, crimsonBrickMat);
  addBox(147.2, 175.0, 0.0, 9.4, -14.6, -14.0, emeraldWallMat);

  // Wing Roofs + Glowing White-Pink Ribbed Pleated Veranda Awning over Center Alley (Image 2!)
  addBox(147.2, 175.2, 8.65, 9.05, -44.0, -31.8, steelFrameMat);
  addBox(147.2, 175.2, 8.65, 9.05, -26.4, -14.2, steelFrameMat);
  addBox(147.2, 178.4, 8.70, 8.92, -31.9, -26.3, pinkPleatedCanopyMat);

  // Ribbed pink/white pleated awning baffles under center truss (X = 171.2..178.1, Y = 7.4..8.65)
  for (let ax = 171.5; ax <= 177.9; ax += 0.65) {
    addBox(ax - 0.14, ax + 0.14, 7.15, 7.70, -32.2, -26.0, pinkPleatedCanopyMat);
  }

  // Floor 1 Warm Illuminated Ceilings + Recessed Amber Light Strips (fixes dark cave!)
  addBox(148.0, 174.8, 4.10, 4.22, -43.5, -31.9, warmCeilingSoffitMat);
  addBox(148.0, 174.8, 4.10, 4.22, -26.3, -14.6, warmCeilingSoffitMat);
  [171.5, 165.5, 159.5, 154.0].forEach((cx) => {
    addBox(cx - 0.25, cx + 0.25, 4.02, 4.10, -42.0, -33.2, amberNeonMat);
    addBox(cx - 0.25, cx + 0.25, 4.02, 4.10, -25.0, -16.0, amberNeonMat);
  });

  // Classic Cream Fluted Architectural Columns & Architraves (X = 174.3..175.1)
  [-43.0, -32.1, -26.0, -15.1].forEach((cz) => {
    addBox(174.35, 175.05, 0.0, f2Y + 4.1, cz - 0.42, cz + 0.42, creamPlasterMat);
    addBox(174.25, 175.15, 0.0, 0.55, cz - 0.50, cz + 0.50, creamPlasterMat);
    addBox(174.25, 175.15, f2Y - 0.35, f2Y + 0.05, cz - 0.50, cz + 0.50, creamPlasterMat);
  });

  // Rolling Security Shutters across North Wing, Center HK Alley & South Wing (Closed 07:00 - 12:00 trưa)
  const lqShutterTex = createRollingShutterTexture({
    title: 'LAN QUẾ PHƯỜNG',
    hoursLabel: 'MỞ CỬA: 12:00 TRƯA – 07:00 SÁNG',
    accentHex: '#b45309',
  });
  const lqShutterMat = new THREE.MeshStandardMaterial({
    map: lqShutterTex,
    roughness: 0.5,
    metalness: 0.48,
  });
  const lqShutters: RollingShutterHandle[] = [
    createRollingShutterDoor(
      staticGroup,
      { id: 'lq_north_shutter', axis: 'z', pos: 174.7, spanCenter: -37.55, width: 9.6, baseY: 0, topY: 3.95 },
      lqShutterMat,
      steelFrameMat
    ),
    createRollingShutterDoor(
      staticGroup,
      { id: 'lq_alley_shutter', axis: 'z', pos: 174.7, spanCenter: -29.05, width: 5.4, baseY: 0, topY: 3.45 },
      lqShutterMat,
      steelFrameMat
    ),
    createRollingShutterDoor(
      staticGroup,
      { id: 'lq_south_shutter', axis: 'z', pos: 174.7, spanCenter: -20.55, width: 9.6, baseY: 0, topY: 3.95 },
      lqShutterMat,
      steelFrameMat
    ),
  ];

  // Floor 1 Wings Identity Swap to Match Image 2:
  // - Screen-LEFT (+Z, Z = -26.4..-14.2 next to TOXIC): Emerald Green Hong Kong Pub Wing!
  // - Screen-RIGHT (-Z, Z = -44.0..-31.8): Crimson-Gold Hong Kong Dai Pai Dong Wing!
  addBox(152.0, 174.6, 0.0, 4.1, -15.1, -14.7, emeraldWallMat);
  addBox(174.3, 175.0, 0.0, 4.2, -26.4, -25.7, emeraldWallMat);
  addBox(174.3, 175.0, 0.0, 4.2, -15.5, -14.6, emeraldWallMat);

  addBox(152.0, 174.6, 0.0, 4.1, -43.3, -42.9, crimsonBrickMat);
  addBox(174.3, 175.0, 0.0, 4.2, -43.4, -42.7, crimsonBrickMat);
  addBox(174.3, 175.0, 0.0, 4.2, -32.5, -31.8, crimsonBrickMat);

  // Retro Hong Kong Beer Posters & Lit Shophouse Alcoves along Inner Wing Walls
  const retroBeerTex = createRetroBeerWallTex();
  const retroBeerMat = new THREE.MeshStandardMaterial({
    map: retroBeerTex,
    emissive: 0xffffff,
    emissiveMap: retroBeerTex,
    emissiveIntensity: 0.78,
  });
  signDynamicMats.push(retroBeerMat);

  const beerPanelSouth = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.2), retroBeerMat);
  beerPanelSouth.position.set(164.0, 2.15, -15.15);
  beerPanelSouth.rotation.y = Math.PI;
  staticGroup.add(beerPanelSouth);

  const beerPanelNorth = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.2), retroBeerMat);
  beerPanelNorth.position.set(164.0, 2.15, -42.85);
  staticGroup.add(beerPanelNorth);

  // Illuminated Wire-Mesh Pub Wall Accent at Back of Lobby (X = 148.1, Image 3 bottom center!)
  const lobbyBackWallMat = new THREE.MeshStandardMaterial({
    color: 0x581c87,
    emissive: 0x9333ea,
    emissiveIntensity: 0.55,
    roughness: 0.5,
  });
  addBox(147.8, 148.05, 0.0, 8.6, -43.2, -14.8, lobbyBackWallMat);
  for (let wz = -31.0; wz <= -27.0; wz += 1.0) {
    addBox(148.05, 148.15, 0.2, 8.4, wz - 0.03, wz + 0.03, amberNeonMat);
  }

  // Heritage Shuttered Colonial Windows along Floor 2 Back Gallery Walls (eliminates Floor 2 dark void!)
  const f2NorthWinTex = createHeritageWindowFacadeTex('#991b1b');
  const f2SouthWinTex = createHeritageWindowFacadeTex('#065f46');
  const f2NorthWinMat = new THREE.MeshStandardMaterial({
    map: f2NorthWinTex,
    emissive: 0xf59e0b,
    emissiveMap: f2NorthWinTex,
    emissiveIntensity: 0.72,
  });
  const f2SouthWinMat = new THREE.MeshStandardMaterial({
    map: f2SouthWinTex,
    emissive: 0xf59e0b,
    emissiveMap: f2SouthWinTex,
    emissiveIntensity: 0.72,
  });

  // Floor 2 illuminated back facades behind diners (facing East toward Phố Đi Bộ)
  const f2NorthBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 3.6), f2NorthWinMat);
  f2NorthBackdrop.rotation.y = Math.PI / 2;
  f2NorthBackdrop.position.set(158.0, f2Y + 2.0, -37.5);
  staticGroup.add(f2NorthBackdrop);

  const f2SouthBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 3.6), f2SouthWinMat);
  f2SouthBackdrop.rotation.y = Math.PI / 2;
  f2SouthBackdrop.position.set(158.0, f2Y + 2.0, -20.5);
  staticGroup.add(f2SouthBackdrop);

  // Helper: Classic Hong Kong Turned White Stone Balustrade Railing Segment
  const addBalustradeRun = (x0: number, x1: number, y: number, z0: number, z1: number) => {
    const isAlongZ = Math.abs(z1 - z0) > Math.abs(x1 - x0);
    addBox(x0 - 0.10, x1 + 0.10, y, y + 0.16, z0 - 0.10, z1 + 0.10, creamPlasterMat);
    addBox(x0 - 0.12, x1 + 0.12, y + 0.92, y + 1.08, z0 - 0.12, z1 + 0.12, creamPlasterMat);
    const len = isAlongZ ? Math.abs(z1 - z0) : Math.abs(x1 - x0);
    const count = Math.max(2, Math.floor(len / 0.55));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const bx = isAlongZ ? (x0 + x1) * 0.5 : THREE.MathUtils.lerp(x0, x1, t);
      const bz = isAlongZ ? THREE.MathUtils.lerp(z0, z1, t) : (z0 + z1) * 0.5;
      const bal = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.78, 8), creamPlasterMat);
      bal.position.set(bx, y + 0.54, bz);
      staticGroup.add(bal);
    }
  };

  // Floor 2 Deck Slabs: North Wing, South Wing, Center Gallery Bridge (X = 169.8..174.8), & West Stair Landing
  addBox(147.8, 175.0, f2Y - 0.22, f2Y, -43.5, -31.8, creamPlasterMat);
  addBox(147.8, 175.0, f2Y - 0.22, f2Y, -26.4, -14.6, creamPlasterMat);
  addBox(147.8, 153.8, f2Y - 0.22, f2Y, -31.8, -26.4, creamPlasterMat);
  addBox(169.8, 175.0, f2Y - 0.22, f2Y, -31.8, -26.4, creamPlasterMat);

  // Classic Stone Balustrades along Front Floor 2 Facade & Inner Courtyard Overlooks
  addBalustradeRun(174.75, 174.85, f2Y, -43.3, -14.8);
  addBalustradeRun(153.8, 169.8, f2Y, -32.05, -31.95);
  addBalustradeRun(153.8, 169.8, f2Y, -26.25, -26.15);
  addBalustradeRun(169.8, 169.9, f2Y, -32.0, -26.2);

  // Iconic Central Architrave Neon Sign: "LAN KWAI FONG" (Image 2 & 3!)
  const lkfTex = createHkNeonSignTex({
    bg: '#1c1917',
    border: '#f59e0b',
    textColor: '#fef08a',
    lines: ['LAN KWAI FONG'],
    w: 512,
    h: 112,
    glow: '#fb923c',
  });
  const lkfMat = new THREE.MeshStandardMaterial({
    map: lkfTex,
    emissive: 0xffffff,
    emissiveMap: lkfTex,
    emissiveIntensity: 1.18,
  });
  signDynamicMats.push(lkfMat);
  const lkfSign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.92), lkfMat);
  lkfSign.rotation.y = Math.PI / 2;
  lkfSign.position.set(175.10, 3.88, -29.1);
  staticGroup.add(lkfSign);

  // Curved "HONG KONG BY NIGHT" Semi-Circular Balcony inside Alley (Image 4!)
  const curvedBalcony = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.35, 0.26, 18, 1, false, -Math.PI * 0.5, Math.PI),
    creamPlasterMat
  );
  curvedBalcony.rotation.y = Math.PI / 2;
  curvedBalcony.position.set(169.8, f2Y - 0.12, -29.1);
  staticGroup.add(curvedBalcony);

  const hkByNightTex = createHkNeonSignTex({
    bg: '#3f2c27',
    border: '#f43f5e',
    textColor: '#fda4af',
    lines: ['HONG KONG BY NIGHT'],
    w: 512,
    h: 96,
    glow: '#fb7185',
  });
  const hkByNightMat = new THREE.MeshStandardMaterial({
    map: hkByNightTex,
    emissive: 0xffffff,
    emissiveMap: hkByNightTex,
    emissiveIntensity: 1.15,
  });
  signDynamicMats.push(hkByNightMat);
  const hkByNightSign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.68), hkByNightMat);
  hkByNightSign.rotation.y = Math.PI / 2;
  hkByNightSign.position.set(169.72, f2Y - 0.12, -29.1);
  staticGroup.add(hkByNightSign);

  // Open Central Alleyway Staircase (X = 159.0 -> 153.5, Z = -30.6..-27.6, Y = 0..4.40)
  const stairSteps = 14;
  for (let i = 0; i < stairSteps; i++) {
    const t0 = i / stairSteps;
    const t1 = (i + 1) / stairSteps;
    const sx0 = 159.0 - t1 * 5.5;
    const sx1 = 159.0 - t0 * 5.5;
    const sy = t1 * f2Y;
    addBox(sx0, sx1, sy - 0.14, sy, -30.6, -27.6, creamPlasterMat);
    addBox(sx1 - 0.05, sx1, sy - 0.02, sy + 0.01, -30.5, -27.7, amberNeonMat);
  }
  addBox(153.5, 159.0, 0.0, f2Y, -30.8, -30.6, steelFrameMat);
  addBox(153.5, 159.0, 0.0, f2Y, -27.6, -27.4, steelFrameMat);

  // =========================================================================
  // 4. NON-OCCLUDING HONG KONG NEON SIGN FOREST + INDUSTRIAL WALL FANS
  // =========================================================================
  const addHangingLightbox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    faceEastWest: boolean,
    tex: THREE.CanvasTexture
  ) => {
    const depth = 0.18;
    const mMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 1.08,
    });
    signDynamicMats.push(mMat);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(faceEastWest ? depth : w, h, faceEastWest ? w : depth),
      [
        faceEastWest ? mMat : steelFrameMat,
        faceEastWest ? mMat : steelFrameMat,
        steelFrameMat,
        steelFrameMat,
        faceEastWest ? steelFrameMat : mMat,
        faceEastWest ? steelFrameMat : mMat,
      ]
    );
    box.position.set(x, y, z);
    staticGroup.add(box);

    const rodH = Math.max(0.4, 8.6 - (y + h * 0.5));
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, rodH, 6), steelFrameMat);
    rod.position.set(x, y + h * 0.5 + rodH * 0.5, z);
    staticGroup.add(rod);
  };

  // Vertical Signature HK Neon Signs (distinct storefronts, zero duplicates across front gantry)
  const signBaZhen = createHkNeonSignTex({ bg: '#09090b', border: '#f97316', textColor: '#fef08a', lines: ['八珍食品'], vertical: true });
  const signGuoXiang = createHkNeonSignTex({ bg: '#091529', border: '#38bdf8', textColor: '#fde047', lines: ['郭襄海鮮餐廳'], vertical: true, crown: true });
  const signLiuFu = createHkNeonSignTex({ bg: '#09090b', border: '#ef4444', textColor: '#f8fafc', lines: ['六福珠寶'], vertical: true });
  const signXiYi = createHkNeonSignTex({ bg: '#f8fafc', border: '#18181b', textColor: '#09090b', lines: ['西醫何必利'], vertical: true });
  const signAoMen = createHkNeonSignTex({ bg: '#09090b', border: '#22d3ee', textColor: '#f8fafc', lines: ['澳門冰室'], vertical: true });
  const signGangLong = createHkNeonSignTex({ bg: '#18181b', border: '#facc15', textColor: '#fef08a', lines: ['港龍麻雀會所'], vertical: true });
  const signHeTai = createHkNeonSignTex({ bg: '#1f2912', border: '#a3e635', textColor: '#fef08a', lines: ['和泰酒樓'], vertical: true });

  // Four distinct vertical marquee signs on the front steel gantry pillars (Image 2)
  addHangingLightbox(177.2, 5.85, -40.5, 1.15, 3.3, true, signBaZhen);
  addHangingLightbox(177.2, 5.85, -32.6, 1.15, 3.3, true, signHeTai);
  addHangingLightbox(177.2, 5.85, -25.4, 1.15, 3.3, true, signGuoXiang);
  addHangingLightbox(177.2, 5.85, -17.5, 1.15, 3.3, true, signGangLong);

  // Mid & Deep Alley Layered Vertical Signs (staggered along alley walls Z=-31.1 & Z=-27.1 so center stays clear!)
  addHangingLightbox(172.2, 5.85, -31.1, 1.15, 3.3, false, signGuoXiang);
  addHangingLightbox(171.6, 5.80, -27.1, 1.15, 3.2, false, signAoMen);
  addHangingLightbox(168.4, 6.20, -27.1, 1.15, 3.2, false, signXiYi);
  addHangingLightbox(164.2, 5.90, -31.2, 1.15, 3.2, false, signLiuFu);
  addHangingLightbox(161.2, 5.80, -27.0, 1.15, 3.2, false, signAoMen);
  addHangingLightbox(173.4, 5.95, -20.5, 1.15, 3.2, true, signXiYi);

  // Horizontal Glowing Signs (Images 3 & 4)
  const signErWang = createHkNeonSignTex({
    bg: '#052e16',
    border: '#4ade80',
    textColor: '#f0fdf4',
    subColor: '#86efac',
    lines: ['二王冠', '所有的菜 都來自蛇'],
    glow: '#22c55e',
  });
  const signBigHorse = createHkNeonSignTex({
    bg: '#f8fafc',
    border: '#dc2626',
    textColor: '#09090b',
    subColor: '#dc2626',
    lines: ['大馬鞋店', 'Big Horse Shoes'],
    glow: '#ef4444',
  });
  const signHoiLoon = createHkNeonSignTex({
    bg: '#172554',
    border: '#facc15',
    textColor: '#fde047',
    lines: ['HOI LOON HOTEL'],
    glow: '#f59e0b',
  });
  const signHuiLau = createHkNeonSignTex({
    bg: '#431407',
    border: '#fb923c',
    textColor: '#ffedd5',
    subColor: '#fde047',
    lines: ['許留山', 'HUI LAU SHAN'],
    glow: '#f97316',
  });
  const signParkGuest = createHkNeonSignTex({
    bg: '#f59e0b',
    border: '#78350f',
    textColor: '#1c1917',
    subColor: '#1c1917',
    lines: ['公园旅宿 PARK GUEST HOUSE', '一字樓 1/F • 喝酒優先折扣'],
  });
  const signChaoFa = createHkNeonSignTex({
    bg: '#1c1917',
    border: '#fbbf24',
    textColor: '#fde047',
    subColor: '#f8fafc',
    lines: ['霓虹夜總會', 'NIGHTCLUB & BEER'],
    glow: '#f59e0b',
  });

  // Elevated "二王冠" high over left edge so it NEVER occludes "1 9 7 9 / LAN QUẾ PHƯỜNG" discs behind it!
  addHangingLightbox(171.8, 6.75, -27.2, 2.8, 0.96, false, signErWang);
  addHangingLightbox(171.2, 4.10, -26.9, 2.6, 0.92, false, signBigHorse);
  addHangingLightbox(165.6, 4.15, -31.1, 2.9, 1.02, false, signHoiLoon);
  addHangingLightbox(164.6, 5.55, -27.2, 2.5, 0.96, false, signHuiLau);
  addHangingLightbox(162.4, 4.25, -29.1, 2.8, 0.92, true, signParkGuest);
  addHangingLightbox(174.2, 6.85, -20.5, 3.0, 0.95, true, signChaoFa);

  // Scalloped Pawnshop Medallion ("和泰 押") on North Dai Pai Dong Wing & Crimson Hotpot Bowl Sign ("火鍋 FOOD")
  const pawnTex = createPawnshopMedallionTex();
  const pawnMat = new THREE.MeshStandardMaterial({
    map: pawnTex,
    emissive: 0xffffff,
    emissiveMap: pawnTex,
    emissiveIntensity: 1.15,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(pawnMat);
  const pawnSign = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), pawnMat);
  pawnSign.rotation.y = Math.PI / 2;
  pawnSign.position.set(175.8, 5.15, -36.5);
  staticGroup.add(pawnSign);

  const pawnSignInner = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), pawnMat);
  pawnSignInner.position.set(167.2, 4.95, -31.3);
  staticGroup.add(pawnSignInner);

  const hotpotTex = createHotpotSignTex();
  const hotpotMat = new THREE.MeshStandardMaterial({
    map: hotpotTex,
    emissive: 0xffffff,
    emissiveMap: hotpotTex,
    emissiveIntensity: 1.15,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(hotpotMat);
  const hotpotSign = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 2.45), hotpotMat);
  hotpotSign.rotation.y = Math.PI / 2;
  hotpotSign.position.set(175.8, 6.25, -41.4);
  staticGroup.add(hotpotSign);

  // Glowing Round Street Signs ("蘭" on North Dai Pai Dong storefront like Image 2)
  const lanDiscTex = createRoundDiscSignTex('蘭', '#b91c1c');
  const lanDiscMat = new THREE.MeshStandardMaterial({
    map: lanDiscTex,
    emissive: 0xffffff,
    emissiveMap: lanDiscTex,
    emissiveIntensity: 1.1,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(lanDiscMat);
  const lanDisc = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), lanDiscMat);
  lanDisc.rotation.y = Math.PI / 2;
  lanDisc.position.set(175.6, 2.85, -38.8);
  staticGroup.add(lanDisc);

  // Round Illuminated Disc Arch ("1 9 7 9" & "LAN QUẾ PHƯỜNG") unobstructed across central alley (Image 4!)
  const discLabels = ['1', '9', '7', '9'];
  discLabels.forEach((lbl, idx) => {
    const tex = createRoundDiscSignTex(lbl, '#dc2626');
    const dMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 1.1,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
    });
    signDynamicMats.push(dMat);
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), dMat);
    disc.rotation.y = Math.PI / 2;
    const t = idx / 3;
    disc.position.set(166.4, 6.45 + Math.sin(t * Math.PI) * 0.48, -30.9 + t * 3.6);
    staticGroup.add(disc);
  });
  ['LAN', 'QUẾ', 'PHƯỜNG'].forEach((lbl, idx) => {
    const tex = createRoundDiscSignTex(lbl, '#b91c1c');
    const dMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 1.1,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
    });
    signDynamicMats.push(dMat);
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), dMat);
    disc.rotation.y = Math.PI / 2;
    disc.position.set(166.4, 5.40, -30.5 + idx * 1.4);
    staticGroup.add(disc);
  });

  // Framed Rectangular "LAN QUẾ PHƯỜNG" Orange Neon Artwork inside Emerald South Wing (Image 2 & 3!)
  const lqpWallTex = createHkNeonSignTex({
    bg: '#1c1917',
    border: '#f97316',
    textColor: '#fef08a',
    subColor: '#fb923c',
    lines: ['LAN QUẾ', 'PHƯỜNG', '★ HONG KONG PUB ★'],
    w: 384,
    h: 512,
    glow: '#ea580c',
  });
  const lqpWallMat = new THREE.MeshStandardMaterial({
    map: lqpWallTex,
    emissive: 0xffffff,
    emissiveMap: lqpWallTex,
    emissiveIntensity: 1.15,
  });
  signDynamicMats.push(lqpWallMat);
  // Facing both East (+X sidewalk view) and inside wing (-Z)
  const lqpWallSignEast = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.4), lqpWallMat);
  lqpWallSignEast.rotation.y = Math.PI / 2;
  lqpWallSignEast.position.set(170.5, 2.25, -21.0);
  staticGroup.add(lqpWallSignEast);

  const lqpWallSignSide = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 2.4), lqpWallMat);
  lqpWallSignSide.position.set(171.8, 2.25, -25.62);
  staticGroup.add(lqpWallSignSide);

  // Industrial Wall/Column Mesh Exhaust Fans (signature Hong Kong pub detail from Image 3!)
  [
    [172.0, 3.25, -26.35],
    [172.0, 3.25, -31.85],
    [166.5, 3.25, -26.35],
    [166.5, 3.25, -31.85],
  ].forEach(([fx, fy, fz]) => {
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 16), steelFrameMat);
    cage.position.set(fx, fy, fz);
    staticGroup.add(cage);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.08, 8), steelFrameMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(fx, fy, fz);
    staticGroup.add(hub);
  });

  // 28 Glowing Red Silk Chinese Lanterns strung across ceiling rafters & verandas!
  const lanternCoords: Array<[number, number, number]> = [
    [176.4, 3.95, -41.0], [176.4, 3.95, -37.2], [176.4, 3.95, -34.0],
    [176.4, 3.95, -24.2], [176.4, 3.95, -20.8], [176.4, 3.95, -17.0],
    [172.0, 7.20, -39.0], [172.0, 7.20, -35.0], [172.0, 7.20, -23.0], [172.0, 7.20, -18.5],
    [166.0, 7.20, -39.0], [166.0, 7.20, -35.0], [166.0, 7.20, -23.0], [166.0, 7.20, -18.5],
    [173.5, 6.75, -29.1], [170.5, 6.75, -29.1], [167.5, 6.75, -29.1], [164.0, 6.75, -29.1], [160.5, 6.75, -29.1],
    [162.5, 3.55, -40.0], [162.5, 3.55, -35.0], [162.5, 3.55, -22.5], [162.5, 3.55, -17.5],
    [156.5, 3.55, -35.5], [156.5, 3.55, -40.5], [156.5, 3.55, -22.5], [156.5, 3.55, -17.5],
    [152.0, 6.90, -29.1],
  ];
  lanternCoords.forEach(([lx, ly, lz]) => {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), redLanternMat);
    body.scale.set(1.0, 1.22, 1.0);
    body.position.set(lx, ly, lz);
    staticGroup.add(body);
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 8), amberNeonMat);
    topCap.position.set(lx, ly + 0.34, lz);
    staticGroup.add(topCap);
  });

  // =========================================================================
  // 5. QUÁN NHẬU BARS, SIDEWALK & INDOOR DINING TABLES, HOTPOTS & GOLDEN BEERS
  // =========================================================================
  // North Dai Pai Dong Crimson Bar (X=152.5..158.0, Z=-42.4..-38.8) & South Emerald Pub Bar (Z=-19.8..-16.0)
  addBox(152.5, 158.0, 0.0, 1.12, -42.4, -38.8, darkWoodMat);
  addBox(152.4, 158.1, 1.06, 1.16, -42.5, -38.7, redLanternMat);
  addBox(152.5, 158.0, 0.0, 1.12, -19.8, -16.0, darkWoodMat);
  addBox(152.4, 158.1, 1.06, 1.16, -19.9, -15.9, amberNeonMat);

  const addPubTable = (tx: number, tz: number, baseY = 0) => {
    const g = new THREE.Group();
    g.position.set(tx, baseY, tz);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.07, 1.15), darkWoodMat);
    top.position.y = 0.74;
    g.add(top);

    [
      [-0.6, -0.45],
      [0.6, -0.45],
      [-0.6, 0.45],
      [0.6, 0.45],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), steelFrameMat);
      leg.position.set(lx, 0.36, lz);
      g.add(leg);
    });

    // Hotpot Dish + Amber Beer Mugs + Green Beer Bottles
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.16, 0.14, 10), trussWhiteMat);
    pot.position.set(0, 0.84, 0);
    g.add(pot);
    const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 10), redLanternMat);
    soup.position.set(0, 0.91, 0);
    g.add(soup);
    [
      [-0.42, -0.22],
      [0.44, 0.24],
    ].forEach(([bx, bz]) => {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.26, 8), greenNeonMat);
      bottle.position.set(bx, 0.90, bz);
      g.add(bottle);
    });
    [
      [-0.36, 0.28],
      [0.38, -0.25],
    ].forEach(([gx, gz]) => {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.050, 0.15, 8), beerGlassMat);
      mug.position.set(gx, 0.85, gz);
      g.add(mug);
    });

    // Four Pub Stools around Table
    [
      [0, -0.78],
      [0, 0.78],
      [-0.92, 0],
      [0.92, 0],
    ].forEach(([sx, sz]) => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.46, 8), darkWoodMat);
      stool.position.set(sx, 0.23, sz);
      g.add(stool);
    });

    staticGroup.add(g);
  };

  // Floor 1 Sidewalk & Indoor Wings (10 tables)
  [
    [176.2, -39.5],
    [176.2, -35.2],
    [176.2, -23.0],
    [176.2, -18.7],
    [168.5, -39.6],
    [168.5, -35.0],
    [162.5, -39.6],
    [168.5, -23.2],
    [168.5, -18.6],
    [162.5, -18.6],
  ].forEach(([tx, tz]) => addPubTable(tx, tz, 0));

  // Floor 2 Heritage Balcony Tables (4 tables)
  [
    [169.0, -39.2],
    [162.0, -39.2],
    [169.0, -19.0],
    [162.0, -19.0],
  ].forEach(([tx, tz]) => addPubTable(tx, tz, f2Y));

  // =========================================================================
  // 6. CALIBRATED POINT LIGHTING (WARM HONG KONG HERITAGE + VIBRANT ALLEY)
  // =========================================================================
  const registerLight = (
    color: number,
    x: number,
    y: number,
    z: number,
    dist: number,
    dayInt: number,
    nightInt: number
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 1.25);
    l.position.set(x, y, z);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => 1.0,
    });
  };

  registerLight(0xfbbf24, 177.2, 6.4, -29.1, 36, 7, 30); // Main Truss Warm Golden Wash
  registerLight(0xf43f5e, 168.0, 5.2, -29.1, 32, 5, 24); // Central Neon Alley Crimson/Pink Wash
  registerLight(0xf59e0b, 165.5, 3.2, -37.5, 26, 5, 22); // North Dai Pai Dong Wing Warm Tungsten Glow
  registerLight(0xfde047, 165.5, 3.2, -20.5, 26, 5, 22); // South Emerald HK Pub Warm Interior Glow
  registerLight(0xfbbf24, 165.5, 7.0, -37.5, 24, 4, 18); // Floor 2 North Heritage Gallery Glow
  registerLight(0xfbbf24, 165.5, 7.0, -20.5, 24, 4, 18); // Floor 2 South Heritage Gallery Glow
  registerLight(0xfb7185, 175.0, 8.2, -29.1, 30, 5, 20); // Roof Canopy & Pleated Awning Pink-Gold Glow

  let closedFactor = 0.0;
  let animClock = 0;

  for (let i = 0; i < scaledLights.length; i++) {
    const minKeep = i === 0 || i === 5 ? 0.16 : 0.05;
    scaledLights[i].getScale = () => Math.max(minKeep, 1.0 - closedFactor);
  }

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: LanQuePhuongNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isLanQuePhuongOpenAtHour(rawHour);
    const targetClosed = isOpen ? 0.0 : 1.0;
    closedFactor = dt > 0 ? THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 3.5)) : targetClosed;
    for (let i = 0; i < lqShutters.length; i++) {
      setShutterProgress(lqShutters[i], closedFactor);
    }

    const openScale = 1.0 - closedFactor;
    animClock += dt * openScale;

    amberNeonMat.emissiveIntensity = (1.0 + lampFactor * 0.85 + Math.sin(animClock * 2.4) * 0.12) * openScale;
    redLanternMat.emissiveIntensity = (0.92 + lampFactor * 0.85) * openScale;
    pinkNeonMat.emissiveIntensity = (0.95 + lampFactor * 0.85) * openScale;
    cyanNeonMat.emissiveIntensity = (0.95 + lampFactor * 0.85) * openScale;
    greenNeonMat.emissiveIntensity = (0.92 + lampFactor * 0.8) * openScale;
    beerGlassMat.emissiveIntensity = (0.45 + lampFactor * 0.45) * openScale;
    warmCeilingSoffitMat.emissiveIntensity = (0.22 + lampFactor * 0.24) * openScale;
    pinkPleatedCanopyMat.emissiveIntensity = (0.35 + lampFactor * 0.35) * openScale;
    crimsonAtticGlowMat.emissiveIntensity = (0.40 + lampFactor * 0.38) * Math.max(0.25, openScale);
    lqPoolMat.opacity = 0.56 * lampFactor * openScale;

    const signGlow = (0.90 + lampFactor * 0.34) * Math.max(0.22, openScale);
    for (let i = 0; i < signDynamicMats.length; i++) {
      signDynamicMats[i].emissiveIntensity = signGlow;
    }

    npcController?.update(delta, rawHour);
  };

  updateOperatingHours(20.0, 0, 1.0, null);

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    updateOperatingHours,
    getClosedFactor: () => closedFactor,
  };
}

// =========================================================================
// LIVE NPCS (28 NPCS): STREET HOSTS, BARTENDERS, 16 SEATED QUÁN NHẬU DINERS,
// 4 WAITSTAFF SERVERS & 4 WALKING ALLEY GUESTS
// =========================================================================

interface LanQueNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  role: 'host' | 'staff' | 'diner_seated' | 'walk';
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  idleYaw?: number;
  seated?: boolean;
  exitPath: THREE.Vector3[];
  exitWp: { idx: number };
  glbHandle: GlbHumanHandle;
}

function buildLanQueCharacterMesh(
  helpers: HospitalCharacterHelpers,
  shirt: number,
  pants: number,
  skin: string,
  hairColor: number,
  seated = false
) {
  const grp = new THREE.Group();
  const hips = new THREE.Group();
  grp.add(hips);

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.62 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.25), shirtMat);
  torso.position.y = 1.04;
  hips.add(torso);

  const faceTex = helpers.createFaceTexture('happy', skin);
  const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
  head.position.y = 1.48;
  hips.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
  hair.position.y = 1.61;
  hips.add(hair);

  const makeArm = (ax: number) => {
    const p = new THREE.Group();
    p.position.set(ax, 1.26, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), shirtMat);
    m.position.y = -0.18;
    p.add(m);
    hips.add(p);
    return p;
  };
  const leftArm = makeArm(-0.30);
  const rightArm = makeArm(0.30);

  const makeLeg = (lx: number) => {
    const p = new THREE.Group();
    p.position.set(lx, 0.76, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.16), pantsMat);
    leg.position.y = -0.32;
    p.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), shoeMat);
    shoe.position.set(0, -0.68, 0.03);
    p.add(shoe);
    hips.add(p);
    return p;
  };
  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);

  if (seated) {
    hips.position.y = -0.26;
    leftLeg.rotation.x = -Math.PI / 2;
    rightLeg.rotation.x = -Math.PI / 2;
    leftArm.rotation.x = -0.35;
    rightArm.rotation.x = -0.35;
  }

  return { group: grp, hips, leftArm, rightArm, leftLeg, rightLeg };
}

export class LanQuePhuongNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: LanQueNpcActor[] = [];
  private wasOpen = true;
  private fullyCleared = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const f2Y = LAN_QUE_FLOOR2_Y;
    const specs: Array<{
      role: 'host' | 'staff' | 'diner_seated' | 'walk';
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      seated?: boolean;
      speed?: number;
    }> = [
      // 1. TWO STREET HOSTS AT PHỐ ĐI BỘ ALLEY ENTRANCE & TWO BAR STAFF (matched to North Crimson / South Emerald wings)
      { role: 'host', shirt: 0x991b1b, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(178.9, 0.02, -32.2)], idleYaw: Math.PI / 2 },
      { role: 'host', shirt: 0x047857, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(178.9, 0.02, -26.0)], idleYaw: Math.PI / 2 },
      { role: 'staff', shirt: 0xf8fafc, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(155.2, 0.02, -37.8)], idleYaw: 0 },
      { role: 'staff', shirt: 0xf8fafc, pants: 0x09090b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(155.2, 0.02, -20.8)], idleYaw: Math.PI },

      // 2. SIXTEEN SEATED QUÁN NHẬU DINERS (SIDEWALK + FLOOR 1 WINGS + FLOOR 2 BALCONIES)
      { role: 'diner_seated', shirt: 0xf59e0b, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(176.2, 0.02, -40.28)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(176.2, 0.02, -38.72)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0xef4444, pants: 0x09090b, skin: '#f5c7a3', hair: 0x18181b, waypoints: [new THREE.Vector3(176.2, 0.02, -35.98)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0x4ade80, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(176.2, 0.02, -22.22)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0xe879f9, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(176.2, 0.02, -19.48)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xfacc15, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(176.2, 0.02, -17.92)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0xf8fafc, pants: 0x1e293b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(168.5, 0.02, -40.38)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xfb7185, pants: 0x09090b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(168.5, 0.02, -34.22)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0x22d3ee, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(162.5, 0.02, -38.82)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0xa855f7, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(168.5, 0.02, -23.98)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xf59e0b, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(168.5, 0.02, -17.82)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0xec4899, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(162.5, 0.02, -19.38)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(169.0, f2Y + 0.02, -39.98)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xf43f5e, pants: 0x1e293b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(162.0, f2Y + 0.02, -38.42)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0x4ade80, pants: 0x09090b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(169.0, f2Y + 0.02, -19.78)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xfbbf24, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(162.0, f2Y + 0.02, -18.22)], idleYaw: Math.PI, seated: true },

      // 3. FOUR WAITSTAFF & CHEF SERVERS IN WINGS & ALLEY
      {
        role: 'staff',
        shirt: 0x991b1b,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(156.5, 0.02, -36.5),
          new THREE.Vector3(166.0, 0.02, -36.5),
          new THREE.Vector3(173.5, 0.02, -36.5),
          new THREE.Vector3(173.5, 0.02, -41.5),
          new THREE.Vector3(165.0, 0.02, -41.5),
        ],
        speed: 1.5,
      },
      {
        role: 'staff',
        shirt: 0x047857,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(156.5, 0.02, -21.5),
          new THREE.Vector3(166.0, 0.02, -21.5),
          new THREE.Vector3(173.5, 0.02, -21.5),
          new THREE.Vector3(173.5, 0.02, -16.8),
          new THREE.Vector3(165.0, 0.02, -16.8),
        ],
        speed: 1.48,
      },
      {
        role: 'staff',
        shirt: 0x09090b,
        pants: 0x09090b,
        skin: '#f5c7a3',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(160.5, 0.02, -29.1),
          new THREE.Vector3(173.0, 0.02, -29.1),
          new THREE.Vector3(174.5, 0.02, -36.0),
          new THREE.Vector3(174.5, 0.02, -22.0),
          new THREE.Vector3(173.0, 0.02, -29.1),
        ],
        speed: 1.52,
      },
      {
        role: 'staff',
        shirt: 0xf8fafc,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(166.0, f2Y + 0.02, -36.0),
          new THREE.Vector3(172.5, f2Y + 0.02, -36.0),
          new THREE.Vector3(172.5, f2Y + 0.02, -22.0),
          new THREE.Vector3(166.0, f2Y + 0.02, -22.0),
          new THREE.Vector3(172.5, f2Y + 0.02, -22.0),
          new THREE.Vector3(172.5, f2Y + 0.02, -36.0),
        ],
        speed: 1.38,
      },

      // 4. FOUR WALKING GUESTS STROLLING THE HONG KONG NEON ALLEY & STAIRS
      {
        role: 'walk',
        shirt: 0xfacc15,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(178.5, 0.02, -29.1),
          new THREE.Vector3(164.0, 0.02, -29.1),
          new THREE.Vector3(164.0, 0.02, -33.5),
          new THREE.Vector3(174.5, 0.02, -33.5),
          new THREE.Vector3(177.8, 0.02, -30.0),
        ],
        speed: 1.38,
      },
      {
        role: 'walk',
        shirt: 0xe879f9,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(177.0, 0.02, -28.0),
          new THREE.Vector3(160.0, 0.02, -29.1),
          new THREE.Vector3(153.5, f2Y + 0.02, -29.1),
          new THREE.Vector3(151.0, f2Y + 0.02, -36.0),
          new THREE.Vector3(153.5, f2Y + 0.02, -29.1),
          new THREE.Vector3(160.0, 0.02, -29.1),
        ],
        speed: 1.34,
      },
      {
        role: 'walk',
        shirt: 0x38bdf8,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(177.2, 0.02, -41.5),
          new THREE.Vector3(177.2, 0.02, -16.8),
          new THREE.Vector3(175.0, 0.02, -16.8),
          new THREE.Vector3(175.0, 0.02, -41.5),
        ],
        speed: 1.28,
      },
      {
        role: 'walk',
        shirt: 0x4ade80,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(150.5, f2Y + 0.02, -22.0),
          new THREE.Vector3(150.5, f2Y + 0.02, -36.0),
          new THREE.Vector3(165.0, f2Y + 0.02, -36.0),
          new THREE.Vector3(150.5, f2Y + 0.02, -36.0),
        ],
        speed: 1.32,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildLanQueCharacterMesh(helpers, s.shirt, s.pants, s.skin, s.hair, !!s.seated);
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const spec =
        s.role === 'host'
          ? CASHIER_NPC_MODEL
          : s.seated
          ? pickSeatedCivilianModel(idx * 3 + 1)
          : s.role === 'walk'
          ? ADULT_NPC_MODELS[idx % ADULT_NPC_MODELS.length]
          : pickStationaryCivilianModel(idx * 3 + 1);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: built.group,
        fallbackMeshes: [built.hips],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: s.seated ? 'Sit' : s.waypoints.length > 1 ? 'Walk' : 'Idle',
        phaseOffset: idx * 0.78,
      });

      this.actors.push({
        group: built.group,
        hips: built.hips,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        role: s.role,
        waypoints: s.waypoints,
        wpIdx: s.waypoints.length > 1 ? 1 : 0,
        speed: s.speed ?? 1.35,
        walkPhase: idx * 0.78,
        idleYaw: s.idleYaw,
        seated: s.seated,
        exitPath: [new THREE.Vector3(179.0, 0.02, -29.1), new THREE.Vector3(183.0, 0.02, -29.1)],
        exitWp: { idx: 0 },
        glbHandle,
      });
    });
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyCleared;
  }

  public update(delta: number, rawHour: number) {
    const dt = Math.min(delta, 0.1);
    const isOpen = isLanQuePhuongOpenAtHour(rawHour);

    if (isOpen && !this.wasOpen) {
      this.fullyCleared = false;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        a.exitWp.idx = 0;
        a.wpIdx = a.waypoints.length > 1 ? 1 : 0;
        a.group.position.copy(a.waypoints[0]);
        a.group.visible = true;
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.hips.position.y = a.seated ? -0.26 : 0;
        if (a.seated) {
          a.leftLeg.rotation.x = -Math.PI / 2;
          a.rightLeg.rotation.x = -Math.PI / 2;
        }
        a.glbHandle.setAnimState(a.seated ? 'Sit' : a.waypoints.length > 1 ? 'Walk' : 'Idle');
      }
    }
    this.wasOpen = isOpen;

    if (!isOpen) {
      if (this.fullyCleared) return;
      let allHidden = true;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        if (!a.group.visible) continue;
        a.hips.position.y = 0;
        a.glbHandle.setAnimState('Walk', 1.25);
        const done = advanceNpcExitPath(a.group, a.exitPath, a.exitWp, 2.1, dt);
        if (done) {
          a.group.visible = false;
        } else {
          allHidden = false;
          a.walkPhase += dt * 5.8;
          const swing = Math.sin(a.walkPhase) * 0.4;
          a.leftArm.rotation.x = swing;
          a.rightArm.rotation.x = -swing;
          a.leftLeg.rotation.x = -swing * 1.1;
          a.rightLeg.rotation.x = swing * 1.1;
        }
      }
      this.fullyCleared = allHidden;
      return;
    }

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.group.visible) continue;

      if (a.waypoints.length <= 1) {
        a.glbHandle.setAnimState(a.seated ? 'Sit' : 'Idle');
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.walkPhase += dt * 2.4;
        if (a.role === 'host') {
          a.group.rotation.y = (a.idleYaw ?? Math.PI / 2) + Math.sin(a.walkPhase * 0.5 + i) * 0.16;
          a.rightArm.rotation.x = -0.3 + Math.max(0, Math.sin(a.walkPhase * 0.8)) * 0.4;
        } else if (a.seated) {
          const toast = Math.max(0, Math.sin(a.walkPhase * 0.85 + i));
          a.rightArm.rotation.x = -0.35 - toast * 0.82;
        } else {
          a.hips.position.y = Math.sin(a.walkPhase) * 0.01;
        }
        continue;
      }

      a.glbHandle.setAnimState('Walk');
      const target = a.waypoints[a.wpIdx];
      const dx = target.x - a.group.position.x;
      const dy = target.y - a.group.position.y;
      const dz = target.z - a.group.position.z;
      const distXZ = Math.hypot(dx, dz);
      const dist3D = Math.hypot(dx, dy, dz);

      if (dist3D < 0.24) {
        a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
      } else {
        const step = Math.min(dist3D, a.speed * dt);
        const r = step / dist3D;
        a.group.position.x += dx * r;
        a.group.position.y += dy * r;
        a.group.position.z += dz * r;
        if (distXZ > 0.03) {
          a.group.rotation.y = Math.atan2(dx, dz);
        }
        a.walkPhase += dt * (4.4 + a.speed * 1.8);
        const swing = Math.sin(a.walkPhase) * 0.42;
        a.leftArm.rotation.x = swing;
        a.rightArm.rotation.x = -swing;
        a.leftLeg.rotation.x = -swing * 1.15;
        a.rightLeg.rotation.x = swing * 1.15;
        a.hips.position.y = Math.abs(Math.sin(a.walkPhase)) * 0.03;
      }
    }
  }
}
