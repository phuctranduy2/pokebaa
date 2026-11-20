import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isHaNoiPhoOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import type { IntersectionColliderBox } from './WestIntersectionSystem';

export const HA_NOI_PHO_FLOOR_H = 3.85;

export interface HaNoiPhoRestaurantBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: HaNoiPhoNpcController | null
  ) => void;
  getClosedFactor: () => number;
}

// Center of Hà Nội Phố restaurant plot at SE corner of East 4-Way Intersection
const HNP_ORIGIN_X = 222.0;
const HNP_ORIGIN_Z = 56.0;

// =========================================================================
// COLLIDERS: HÀ NỘI PHỐ — LẨU CUA ĐỒNG ĐẶC BIỆT (4 WALKABLE FLOORS + TERRACE)
// World center (222.0, 56.0). Keeps NW Corner Portal & North Boulevard
// Portal open during 12:00 - 23:00 (gated by rolling shutter when closed)
// and scopes Floor 1..4 walls, tables & switchback stairwell cleanly!
// =========================================================================
const UPPER_FLOOR_TABLE_OFFSETS: ReadonlyArray<[number, number]> = [
  [-4.2, -1.8],
  [0.8, -3.6],
  [-4.2, 4.4],
  [1.2, 4.4],
];

export const HA_NOI_PHO_COLLIDERS: IntersectionColliderBox[] = [
  // Floor 1 Outer & Interior Perimeter
  { minX: 230.6, maxX: 231.5, minZ: 47.0, maxZ: 65.5, floor: 1 }, // East Rear Wall
  { minX: 212.8, maxX: 231.5, minZ: 64.6, maxZ: 65.5, floor: 1 }, // South Rear Wall
  { minX: 217.5, maxX: 219.5, minZ: 46.8, maxZ: 47.5, floor: 1 }, // NW pier between corner & North portal
  { minX: 223.3, maxX: 231.4, minZ: 46.8, maxZ: 47.5, floor: 1 }, // NE storefront glass bay
  { minX: 212.8, maxX: 213.6, minZ: 51.0, maxZ: 65.4, floor: 1 }, // West storefront glass bay
  { minX: 225.8, maxX: 230.6, minZ: 57.2, maxZ: 64.5, floor: 1 }, // Floor 1 Open Broth Kitchen
  { minX: 217.5, maxX: 218.7, minZ: 50.2, maxZ: 51.4, floor: 1 }, // Hostess Reception Podium
  { minX: 215.5, maxX: 216.3, minZ: 47.0, maxZ: 47.8, floor: 1 }, // Entrance Menu Standee
  { minX: 219.5, maxX: 220.4, minZ: 42.5, maxZ: 43.3, floor: 1 }, // Xanh SM Curbside Drop-off Totem

  { minX: 232.8, maxX: 233.8, minZ: 42.2, maxZ: 68.5, floor: 1 }, // East Plaza Property Edge
  // Floor 1 Switchback Stairwell Enclosure (West flight worldX=227.0..228.75 open; East under-flight blocked)
  { minX: 226.85, maxX: 227.12, minZ: 48.2, maxZ: 55.1, floor: 1 }, // Stairwell West Wall
  { minX: 228.72, maxX: 230.65, minZ: 48.2, maxZ: 55.1, floor: 1 }, // Under East flight enclosure
  { minX: 227.0, maxX: 230.65, minZ: 48.0, maxZ: 48.28, floor: 1 }, // Stairwell North Wall

  // 4 Floor-1 Indoor Hotpot Dining Tables + Stools
  ...[
    [217.8, 54.4],
    [222.8, 54.2],
    [217.8, 60.4],
    [222.5, 60.4],
  ].map(([tx, tz]) => ({
    minX: tx - 1.12,
    maxX: tx + 1.12,
    minZ: tz - 0.92,
    maxZ: tz + 0.92,
    floor: 1,
  })),

  // 4 Outdoor Terrace Hotpot Tables (North Plaza & West Plaza — walkways remain clear)
  ...[
    [225.6, 44.7],
    [229.6, 44.7],
    [210.4, 54.6],
    [210.4, 58.6],
  ].map(([tx, tz]) => ({
    minX: tx - 1.05,
    maxX: tx + 1.05,
    minZ: tz - 0.95,
    maxZ: tz + 0.95,
    floor: 1,
  })),

  // Floors 2, 3, 4 Walkable Interiors: Perimeter Glass/Walls, Stairwell Balustrades, Tables & Sideboards
  ...[2, 3, 4].flatMap((fl): IntersectionColliderBox[] => [
    // Perimeter walls & glass
    { minX: 230.5, maxX: 231.5, minZ: 47.0, maxZ: 65.5, floor: fl }, // East Rear Wall
    { minX: 212.8, maxX: 231.5, minZ: 64.5, maxZ: 65.5, floor: fl }, // South Rear Wall
    { minX: 217.5, maxX: 231.5, minZ: 46.8, maxZ: 47.6, floor: fl }, // North Glass Wall
    { minX: 212.8, maxX: 213.6, minZ: 51.0, maxZ: 65.5, floor: fl }, // West Glass Wall
    // Curved NW Corner Glass Approximation
    { minX: 213.0, maxX: 215.1, minZ: 48.6, maxZ: 51.4, floor: fl },
    { minX: 214.9, maxX: 217.7, minZ: 46.9, maxZ: 48.9, floor: fl },
    // Stairwell Shaft Guardrails (South entrance mouth worldZ=55.0 remains open!)
    { minX: 226.85, maxX: 227.12, minZ: 48.2, maxZ: 55.1, floor: fl }, // West Balustrade
    { minX: 228.72, maxX: 228.88, minZ: 50.2, maxZ: 54.9, floor: fl }, // Center Flight Divider
    { minX: 227.0, maxX: 230.65, minZ: 48.0, maxZ: 48.28, floor: fl }, // North Back Wall
    // On Floor 4, close West stair shaft edge since stairs do not continue to roof
    ...(fl === 4 ? [{ minX: 227.0, maxX: 228.82, minZ: 54.85, maxZ: 55.18, floor: 4 }] : []),
    // SE Wall Tea & Condiment Sideboard
    { minX: 229.3, maxX: 230.6, minZ: 58.1, maxZ: 63.5, floor: fl },
    // 4 Upper-Floor Hotpot Tables per Floor
    ...UPPER_FLOOR_TABLE_OFFSETS.map(([lx, lz]) => ({
      minX: HNP_ORIGIN_X + lx - 1.08,
      maxX: HNP_ORIGIN_X + lx + 1.08,
      minZ: HNP_ORIGIN_Z + lz - 0.90,
      maxZ: HNP_ORIGIN_Z + lz + 0.90,
      floor: fl,
    })),
  ]),
];

function roundRect(
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
 * Heritage Indochine patterned ceramic floor tile texture
 */
function createIndochineFloorTileTex(repeatX = 9, repeatY = 9): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#e7dec8';
  ctx.fillRect(0, 0, size, size);

  const cell = size / 2;
  for (let gx = 0; gx < 2; gx++) {
    for (let gy = 0; gy < 2; gy++) {
      const ox = gx * cell;
      const oy = gy * cell;
      const alt = (gx + gy) % 2 === 0;
      ctx.fillStyle = alt ? '#ede4cf' : '#dfd2b5';
      ctx.fillRect(ox + 2, oy + 2, cell - 4, cell - 4);

      ctx.strokeStyle = '#7c4a2d';
      ctx.lineWidth = 3;
      ctx.strokeRect(ox + 8, oy + 8, cell - 16, cell - 16);

      const cx = ox + cell * 0.5;
      const cy = oy + cell * 0.5;
      ctx.fillStyle = alt ? '#9a3412' : '#365314';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 30);
      ctx.lineTo(cx + 30, cy);
      ctx.lineTo(cx, cy + 30);
      ctx.lineTo(cx - 30, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Warm Indochine parquet wood floor texture for upper dining rooms (Floors 2..4)
 */
function createUpperParquetTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#6c3e22';
  ctx.fillRect(0, 0, size, size);

  const rows = 4;
  const cols = 2;
  const pw = size / cols;
  const ph = size / rows;
  const tones = ['#7c4a2a', '#683c21', '#754425', '#5e341b'];
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const offset = r % 2 === 0 ? 0 : pw * 0.5;
      ctx.fillStyle = tones[(r * 3 + col) % tones.length];
      ctx.fillRect((col * pw + offset) % size, r * ph + 1, pw - 2, ph - 2);
      if (offset > 0 && col === 1) {
        ctx.fillRect(0, r * ph + 1, offset - 2, ph - 2);
      }
      ctx.strokeStyle = 'rgba(39, 20, 10, 0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(col * pw, r * ph, pw, ph);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Rich Dark-Slate & Brass Culinary Menu Gallery Strip
 */
function createMenuPhotoStripTex(): THREE.CanvasTexture {
  const w = 1536;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, '#160d09');
  bg.addColorStop(0.5, '#26160e');
  bg.addColorStop(1, '#160d09');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const dishes = [
    { card: '#2c150f', broth: '#ea580c', rim: '#f59e0b', herb: '#22c55e', label: 'LẨU CUA ĐỒNG', price: '299K' },
    { card: '#1e1b18', broth: '#b45309', rim: '#fbbf24', herb: '#4ade80', label: 'BÚN CHẢ HÀ NỘI', price: '85K' },
    { card: '#271710', broth: '#ca8a04', rim: '#fde047', herb: '#16a34a', label: 'CHẢ CÁ LÃ VỌNG', price: '185K' },
    { card: '#1c2017', broth: '#d97706', rim: '#fcd34d', herb: '#84cc16', label: 'GÀ ĐỒI HẤP LÁ', price: '240K' },
    { card: '#291515', broth: '#dc2626', rim: '#fbbf24', herb: '#4ade80', label: 'NEM CUA BỂ', price: '115K' },
    { card: '#1b1612', broth: '#9a3412', rim: '#f59e0b', herb: '#22c55e', label: 'RIÊU CUA BẮP BÒ', price: '349K' },
  ];

  const tileW = w / dishes.length;
  dishes.forEach((d, idx) => {
    const x0 = idx * tileW + 8;
    const tw = tileW - 16;

    ctx.fillStyle = d.card;
    roundRect(ctx, x0, 10, tw, 154, 12);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    roundRect(ctx, x0, 10, tw, 154, 12);
    ctx.stroke();

    const cx = x0 + tw * 0.5;
    const cy = 74;

    const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 52);
    glow.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
    glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = d.rim;
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = d.broth;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 6, 11, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy + 5, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = d.herb;
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 12, 8, 0, Math.PI * 2);
    ctx.arc(cx - 12, cy + 12, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef3c7';
    ctx.font = '800 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.label, cx - 22, 144);

    ctx.fillStyle = '#dc2626';
    roundRect(ctx, x0 + tw - 58, 130, 50, 26, 6);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 14px system-ui, sans-serif';
    ctx.fillText(d.price, x0 + tw - 33, 143);
  });

  ctx.fillStyle = '#120a07';
  ctx.fillRect(0, 172, w, 84);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 172, w, 4);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(251, 191, 36, 0.72)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#fde047';
  ctx.font = '900 38px system-ui, -apple-system, sans-serif';
  ctx.fillText('CÁC MÓN ĐẶC SẢN VÙNG MIỀN  •  MỞ CỬA: 12:00 – 23:00', w * 0.5, 216);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Curved Floor-3 Golden LED Marquee: "LẨU CUA ĐỒNG ĐẶC BIỆT"
 */
function createLauCuaDongSignTex(): THREE.CanvasTexture {
  const w = 1536;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#1a0c08');
  grad.addColorStop(0.5, '#3b140d');
  grad.addColorStop(1, '#1a0c08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 7;
  roundRect(ctx, 8, 8, w - 16, h - 16, 16);
  ctx.stroke();

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  roundRect(ctx, 18, 18, w - 36, h - 36, 10);
  ctx.stroke();

  [120, w - 120].forEach((ex) => {
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(ex, h * 0.5, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(ex, h * 0.5 + 8, 26, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(ex - 28, h * 0.5 - 2, 56, 8);
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(253, 224, 71, 0.78)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 84px system-ui, -apple-system, sans-serif';
  ctx.fillText('LẨU CUA ĐỒNG ĐẶC BIỆT', w * 0.5, h * 0.52);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Rooftop Crown Cursive Warm-Gold Sign: "Hà Nội Phố • CÁC MÓN ĐẶC SẢN"
 */
function createRooftopHaNoiPhoTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#140c08');
  grad.addColorStop(0.5, '#2b140c');
  grad.addColorStop(1, '#140c08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 7;
  roundRect(ctx, 8, 8, w - 16, h - 16, 18);
  ctx.stroke();

  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  roundRect(ctx, 20, 20, w - 40, h - 40, 12);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(253, 224, 71, 0.78)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#fef08a';
  ctx.font = 'italic 900 108px Georgia, "Times New Roman", serif';
  ctx.fillText('Hà Nội Phố', w * 0.5, 108);

  ctx.shadowBlur = 5;
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 30px system-ui, -apple-system, sans-serif';
  ctx.fillText('4 TẦNG PHỤC VỤ  •  12:00 – 23:00', w * 0.5, 198);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Vertical Corner Blade Sign Texture: "LẨU CUA ĐỒNG • HÀ NỘI PHỐ"
 */
function createVerticalBladeSignTex(): THREE.CanvasTexture {
  const w = 192;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 8;
  roundRect(ctx, 8, 8, w - 16, h - 16, 16);
  ctx.stroke();

  ctx.fillStyle = '#450a0a';
  roundRect(ctx, 22, 22, w - 44, 96, 12);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic 900 32px Georgia, serif';
  ctx.fillText('Hà Nội', w * 0.5, 56);
  ctx.fillText('Phố', w * 0.5, 92);

  const chars = ['LẨU', 'CUA', 'ĐỒNG', '•', '4', 'TẦNG', 'VIP'];
  ctx.shadowColor = 'rgba(253, 224, 71, 0.65)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 36px system-ui, sans-serif';
  chars.forEach((ch, idx) => {
    ctx.fillText(ch, w * 0.5, 178 + idx * 82);
  });
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Entrance Menu A-Frame Standee Texture
 */
function createStandeeTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1c120d';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  roundRect(ctx, 8, 8, w - 16, h - 16, 12);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.font = 'italic 900 34px Georgia, serif';
  ctx.fillText('Hà Nội Phố', w * 0.5, 52);

  ctx.fillStyle = '#dc2626';
  roundRect(ctx, 24, 72, w - 48, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.fillText('MENU 4 TẦNG', w * 0.5, 95);

  const items = [
    'Lẩu Cua Đồng ....... 299K',
    'Riêu Cua Bắp Bò ... 349K',
    'Chả Cá Lã Vọng .... 185K',
    'Nem Cua Bể ............ 115K',
    'Bún Chả Hà Nội ....... 85K',
  ];
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fef3c7';
  ctx.font = '700 16px system-ui, sans-serif';
  items.forEach((line, idx) => {
    ctx.fillText(line, 24, 146 + idx * 36);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4ade80';
  ctx.font = '900 17px system-ui, sans-serif';
  ctx.fillText('MỞ CỬA: 12:00 – 23:00', w * 0.5, 348);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Xanh SM Curbside Drop-Off Totem Texture
 */
function createXanhSmTotemTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#007f86');
  grad.addColorStop(0.5, '#00b6ba');
  grad.addColorStop(1, '#024d52');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  roundRect(ctx, 8, 8, w - 16, h - 16, 16);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText('XANH SM', w * 0.5, 76);

  ctx.fillStyle = '#fef08a';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText('ĐIỂM ĐÓN / TRẢ KHÁCH', w * 0.5, 134);

  ctx.fillStyle = '#0f172a';
  roundRect(ctx, 22, 166, w - 44, 118, 12);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  roundRect(ctx, 22, 166, w - 44, 118, 12);
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.font = 'italic 900 32px Georgia, serif';
  ctx.fillText('Hà Nội Phố', w * 0.5, 212);
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.fillText('LẨU CUA ĐỒNG', w * 0.5, 256);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('12:00 – 23:00', w * 0.5, 336);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Dynamic Open / Closed Badge beside Entrance ("12:00 – 23:00")
 */
function createOpenStatusSignTex(isOpen: boolean): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = isOpen ? '#052e16' : '#450a0a';
  roundRect(ctx, 6, 6, w - 12, h - 12, 20);
  ctx.fill();
  ctx.strokeStyle = isOpen ? '#4ade80' : '#f87171';
  ctx.lineWidth = 8;
  roundRect(ctx, 10, 10, w - 20, h - 20, 16);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isOpen ? '#86efac' : '#fca5a5';
  ctx.font = '900 44px system-ui, -apple-system, sans-serif';
  ctx.fillText(isOpen ? 'ĐANG MỞ CỬA' : 'ĐÃ ĐÓNG CỬA', w * 0.5, 84);

  ctx.fillStyle = '#fde68a';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('12:00 TRƯA – 23:00 TỐI', w * 0.5, 168);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createWarmFloorPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(254, 240, 138, 0.52)');
  g.addColorStop(0.5, 'rgba(245, 158, 11, 0.20)');
  g.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface SteamPuffEntry {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  speed: number;
  radius: number;
}

/**
 * Builds the 4-Story Indochine Corner Restaurant "Hà Nội Phố — Lẩu Cua Đồng Đặc Biệt"
 * at world (222.0, 56.0) with walk-in dining halls on ALL 4 FLOORS, 4-floor switchback
 * interior staircase, steaming copper hotpots, glowing silk lanterns, rolling shutters,
 * and 12:00 trưa – 23:00 tối operating schedule.
 */
export function createHaNoiPhoRestaurantStructure(): HaNoiPhoRestaurantBuildResult {
  const staticGroup = new THREE.Group();
  staticGroup.position.set(HNP_ORIGIN_X, 0, HNP_ORIGIN_Z);

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];
  const shutterHandles: RollingShutterHandle[] = [];

  const steamPuffs: SteamPuffEntry[] = [];
  const swayingLanterns: Array<{ pivot: THREE.Group; phase: number }> = [];

  // Warm Indochine Limestone, Teak, Terracotta & Brushed Brass Palette
  const creamWallMat = new THREE.MeshStandardMaterial({
    color: 0xf4e8d1,
    emissive: 0x3b2a17,
    emissiveIntensity: 0.16,
    roughness: 0.68,
    metalness: 0.05,
  });
  const warmSandMat = new THREE.MeshStandardMaterial({
    color: 0xe3cda8,
    emissive: 0x2d1e0f,
    emissiveIntensity: 0.14,
    roughness: 0.72,
    metalness: 0.05,
  });
  const espressoTrimMat = new THREE.MeshStandardMaterial({ color: 0x2c1c12, roughness: 0.42, metalness: 0.3 });
  const teakWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c341d, roughness: 0.56, metalness: 0.08 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.78 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.64, metalness: 0.08 });
  const ironRailMat = new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.32, metalness: 0.8 });
  const clearStoreGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    metalness: 0.18,
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
  });
  const balconyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.14,
    metalness: 0.3,
    transparent: true,
    opacity: 0.34,
  });
  const plazaTileMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.84 });
  const carpetWalkMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.78 });
  const planterSoilMat = new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.9 });
  const plantLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.76 });
  const blossomMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.65 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.82 });
  const stainlessMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.26, metalness: 0.78 });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32 });
  const brothGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const stoveGlowMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xf97316,
    emissiveIntensity: 1.0,
    roughness: 0.3,
  });

  // NOTE: Keep redSilkMat & goldSilkMat OUT of `lanternMats` (`exteriorLampGlowMats`)
  // so ShopScene's daytime bulb desaturation never turns silk lanterns white/gray!
  const redSilkMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.75,
    roughness: 0.38,
  });
  const goldSilkMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });
  const sconceGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  lanternMats.push(sconceGlowMat);

  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.30,
    depthWrite: false,
  });

  const indochineFloorTex = createIndochineFloorTileTex(9, 9);
  const indochineFloorMat = new THREE.MeshStandardMaterial({ map: indochineFloorTex, roughness: 0.65 });
  const upperParquetMat = new THREE.MeshStandardMaterial({
    map: createUpperParquetTex(),
    roughness: 0.56,
    metalness: 0.08,
  });

  const menuStripTex = createMenuPhotoStripTex();
  const menuStripMat = new THREE.MeshStandardMaterial({
    map: menuStripTex,
    emissive: 0xffffff,
    emissiveMap: menuStripTex,
    emissiveIntensity: 0.62,
    roughness: 0.32,
  });

  const lauCuaSignTex = createLauCuaDongSignTex();
  const lauCuaSignMat = new THREE.MeshStandardMaterial({
    map: lauCuaSignTex,
    emissive: 0xffffff,
    emissiveMap: lauCuaSignTex,
    emissiveIntensity: 0.94,
    roughness: 0.28,
  });

  const rooftopSignTex = createRooftopHaNoiPhoTex();
  const rooftopSignMat = new THREE.MeshStandardMaterial({
    map: rooftopSignTex,
    emissive: 0xffffff,
    emissiveMap: rooftopSignTex,
    emissiveIntensity: 0.96,
    roughness: 0.26,
  });

  const bladeSignTex = createVerticalBladeSignTex();
  const bladeSignMat = new THREE.MeshStandardMaterial({
    map: bladeSignTex,
    emissive: 0xffffff,
    emissiveMap: bladeSignTex,
    emissiveIntensity: 0.88,
    roughness: 0.28,
  });

  const standeeTex = createStandeeTex();
  const standeeMat = new THREE.MeshStandardMaterial({
    map: standeeTex,
    emissive: 0xffffff,
    emissiveMap: standeeTex,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });

  const totemTex = createXanhSmTotemTex();
  const totemMat = new THREE.MeshStandardMaterial({
    map: totemTex,
    emissive: 0xffffff,
    emissiveMap: totemTex,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });

  const warmEaveLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.18,
    roughness: 0.2,
  });

  const shutterTex = createRollingShutterTexture({
    title: 'HÀ NỘI PHỐ • LẨU CUA ĐỒNG',
    hoursLabel: 'MỞ CỬA: 12:00 TRƯA – 23:00 TỐI',
    accentHex: '#b91c1c',
    slatDarkHex: '#451a03',
    slatLightHex: '#78350f',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.45,
    metalness: 0.38,
  });

  neonMats.push(lauCuaSignMat, rooftopSignMat, bladeSignMat);

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    staticGroup.add(m);
    return m;
  };

  // Helper: 3D Hanging Indochine Silk Lantern (sways gently in update)
  const addHangingLantern = (lx: number, ly: number, lz: number, useGold: boolean, scale = 1.0, phase = 0) => {
    const pivot = new THREE.Group();
    pivot.position.set(lx, ly, lz);
    pivot.userData.noMerge = true;

    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), espressoTrimMat);
    cord.position.y = -0.14;
    pivot.add(cord);

    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.13 * scale, 0.05, 10), brassMat);
    capTop.position.y = -0.28;
    pivot.add(capTop);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(0.24 * scale, 14, 12),
      useGold ? goldSilkMat : redSilkMat
    );
    globe.scale.set(1.0, 1.18, 1.0);
    globe.position.y = -0.52;
    pivot.add(globe);

    const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.10 * scale, 0.05, 10), brassMat);
    capBot.position.y = -0.78;
    pivot.add(capBot);

    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.015 * scale, 0.20, 6), brassMat);
    tassel.position.y = -0.90;
    pivot.add(tassel);

    staticGroup.add(pivot);
    swayingLanterns.push({ pivot, phase });
  };

  // Helper: Brass Facade Wall Sconce
  const addWallSconce = (lx: number, ly: number, lz: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(lx, ly, lz);
    g.rotation.y = rotY;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.30, 0.06), brassMat);
    g.add(plate);
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.22, 10), sconceGlowMat);
    bulb.position.set(0, 0.08, 0.10);
    g.add(bulb);
    staticGroup.add(g);
  };

  // Helper: Composite Hotpot Table Set at exact floor elevation yBase
  const addHotpotTableSet = (lx: number, yBase: number, lz: number, outdoor: boolean, phaseSeed: number) => {
    const g = new THREE.Group();
    g.position.set(lx, yBase, lz);

    const tableTopMat = outdoor ? teakWoodMat : espressoTrimMat;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 1.08), tableTopMat);
    top.position.y = 0.74;
    g.add(top);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.04, 1.12), brassMat);
    rim.position.y = 0.71;
    g.add(rim);

    [
      [-0.64, -0.44],
      [0.64, -0.44],
      [-0.64, 0.44],
      [0.64, 0.44],
    ].forEach(([px, pz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.70, 0.07), ironRailMat);
      leg.position.set(px, 0.35, pz);
      g.add(leg);
    });

    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 16), ironRailMat);
    burner.position.y = 0.79;
    g.add(burner);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 18), stoveGlowMat);
    coil.rotation.x = Math.PI / 2;
    coil.position.y = 0.805;
    g.add(coil);

    const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.20, 0.16, 18), copperMat);
    potBody.position.y = 0.88;
    g.add(potBody);
    const potBroth = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), brothGlowMat);
    potBroth.position.y = 0.945;
    g.add(potBroth);
    const crabPaste = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), terracottaMat);
    crabPaste.scale.set(1.2, 0.65, 1.1);
    crabPaste.position.set(-0.04, 0.96, 0.03);
    g.add(crabPaste);
    const greens = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.08), plantLeafMat);
    greens.position.set(0.07, 0.96, -0.05);
    g.add(greens);

    [
      [-0.48, -0.22],
      [0.48, 0.22],
      [-0.45, 0.26],
      [0.46, -0.24],
    ].forEach(([px, pz], idx) => {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.11, 0.025, 12),
        idx % 2 === 0 ? ceramicMat : teakWoodMat
      );
      plate.position.set(px, 0.795, pz);
      g.add(plate);
      const topping = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 8, 6),
        idx % 2 === 0 ? blossomMat : plantLeafMat
      );
      topping.scale.set(1.2, 0.45, 1.0);
      topping.position.set(px, 0.815, pz);
      g.add(topping);
    });

    [
      [-0.40, -0.78],
      [0.40, -0.78],
      [-0.40, 0.78],
      [0.40, 0.78],
    ].forEach(([sx, sz]) => {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.06, 12), teakWoodMat);
      seat.position.set(sx, 0.44, sz);
      g.add(seat);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.42, 8), ironRailMat);
      post.position.set(sx, 0.21, sz);
      g.add(post);
    });

    staticGroup.add(g);

    // Rising hotpot steam puffs (unmerged for smooth vertical drift)
    for (let k = 0; k < 3; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), steamMat);
      puff.userData.noMerge = true;
      puff.position.set(lx, yBase + 1.05 + k * 0.28, lz);
      staticGroup.add(puff);
      steamPuffs.push({
        mesh: puff,
        baseX: lx,
        baseY: yBase + 1.02,
        baseZ: lz,
        phase: phaseSeed + k * 2.1,
        speed: 0.48 + (k % 2) * 0.12,
        radius: 0.065,
      });
    }
  };

  // =========================================================================
  // 1. FORECOURT PLAZA APRON, FLOOR-1 BASE & FULL-HEIGHT REAR PERIMETER WALLS
  // =========================================================================
  addBox(-15.0, 11.5, -0.25, 0.0, -13.5, 12.2, plazaTileMat);
  addBox(-2.2, 1.4, -0.02, 0.015, -13.4, -8.8, carpetWalkMat);

  const interiorFloor = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 18.0), indochineFloorMat);
  interiorFloor.rotation.x = -Math.PI / 2;
  interiorFloor.position.set(0.2, 0.02, 0.2);
  staticGroup.add(interiorFloor);

  const floorH = HA_NOI_PHO_FLOOR_H; // 3.85m
  const totalWallH = floorH * 4; // 15.40m
  const cx = -3.2;
  const cz = -3.2;
  const coreRadius = 6.0;

  // Full-height Solid East & South Rear Walls (spanning Floor 1 .. Floor 4)
  addBox(8.7, 9.2, 0.0, totalWallH, -8.8, 9.2, creamWallMat);
  addBox(-8.8, 9.2, 0.0, totalWallH, 8.7, 9.2, creamWallMat);

  // Full-height Corner & Wing Structural Pilasters
  addBox(-3.65, -2.85, 0.0, totalWallH, -9.45, -8.75, warmSandMat);
  addBox(-9.45, -8.75, 0.0, totalWallH, -3.65, -2.85, warmSandMat);
  addBox(8.55, 9.35, 0.0, totalWallH, -9.15, -8.45, espressoTrimMat);
  addBox(-9.15, -8.45, 0.0, totalWallH, 8.55, 9.35, espressoTrimMat);

  // =========================================================================
  // 2. FLOOR 1 OPEN STOREFRONT, PORTALS, OPEN KITCHEN, HOSTESS & ROLLING SHUTTERS
  // =========================================================================
  const curveSegments = 4;
  const angStart = Math.PI + 0.06;
  const angEnd = Math.PI * 1.5 - 0.06;
  const angStep = (angEnd - angStart) / curveSegments;

  for (let s = 0; s < curveSegments; s++) {
    const a0 = angStart + s * angStep;
    const a1 = a0 + angStep;
    const aMid = (a0 + a1) * 0.5;
    const rWin = 6.08;
    const chordW = 2 * rWin * Math.sin(angStep * 0.5) * 0.94;

    if (s === 0 || s === 3) {
      const wainscot = new THREE.Mesh(new THREE.BoxGeometry(chordW, 0.62, 0.18), teakWoodMat);
      wainscot.position.set(cx + Math.sin(aMid) * rWin, 0.31, cz + Math.cos(aMid) * rWin);
      wainscot.rotation.y = aMid;
      staticGroup.add(wainscot);

      const glassPane = new THREE.Mesh(new THREE.BoxGeometry(chordW, 2.55, 0.06), clearStoreGlassMat);
      glassPane.position.set(cx + Math.sin(aMid) * rWin, 1.92, cz + Math.cos(aMid) * rWin);
      glassPane.rotation.y = aMid;
      staticGroup.add(glassPane);
    } else {
      const transom = new THREE.Mesh(new THREE.BoxGeometry(chordW + 0.14, 0.65, 0.24), espressoTrimMat);
      transom.position.set(cx + Math.sin(aMid) * rWin, floorH - 0.35, cz + Math.cos(aMid) * rWin);
      transom.rotation.y = aMid;
      staticGroup.add(transom);
    }

    if (s !== 2) {
      const colX = cx + Math.sin(a0) * (rWin + 0.06);
      const colZ = cz + Math.cos(a0) * (rWin + 0.06);
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, floorH - 0.1, 0.28), espressoTrimMat);
      col.position.set(colX, floorH * 0.5, colZ);
      col.rotation.y = a0;
      staticGroup.add(col);
    }
  }
  {
    const colX = cx + Math.sin(angEnd) * 6.14;
    const colZ = cz + Math.cos(angEnd) * 6.14;
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, floorH - 0.1, 0.28), espressoTrimMat);
    col.position.set(colX, floorH * 0.5, colZ);
    col.rotation.y = angEnd;
    staticGroup.add(col);
  }

  // North Wing Floor-1 Storefront: Open North Boulevard Portal (lx = -2.5..+1.3) + Clear Glass Wing
  addBox(-2.6, 1.5, 3.25, floorH, -9.0, -8.72, espressoTrimMat);
  addBox(-2.85, -2.5, 0.0, floorH, -9.05, -8.7, espressoTrimMat);
  addBox(1.3, 1.65, 0.0, floorH, -9.05, -8.7, espressoTrimMat);
  addBox(1.65, 8.55, 0.0, 0.62, -9.0, -8.75, teakWoodMat);
  addBox(1.65, 8.55, 0.62, 3.25, -8.92, -8.84, clearStoreGlassMat);
  addBox(1.65, 8.55, 3.25, floorH, -9.0, -8.75, espressoTrimMat);
  addBox(5.0, 5.2, 0.62, 3.25, -8.98, -8.78, espressoTrimMat);

  // West Wing Floor-1 Clear Glass Bays
  addBox(-9.0, -8.75, 0.0, 0.62, -2.8, 8.6, teakWoodMat);
  addBox(-8.92, -8.84, 0.62, 3.25, -2.8, 8.6, clearStoreGlassMat);
  addBox(-9.0, -8.75, 3.25, floorH, -2.8, 8.6, espressoTrimMat);
  addBox(-8.98, -8.78, 0.62, 3.25, 2.7, 2.9, espressoTrimMat);

  // Rolling Shutters for North Portal & NW Corner Portal (active when closed 23:00 - 12:00)
  shutterHandles.push(
    createRollingShutterDoor(
      staticGroup,
      {
        id: 'hnp_north',
        axis: 'x',
        pos: -8.88,
        spanCenter: -0.6,
        width: 3.8,
        baseY: 0,
        topY: 3.25,
        thickness: 0.12,
      },
      shutterMat,
      espressoTrimMat
    )
  );
  {
    const aMidPortal = 1.25 * Math.PI;
    const rPier = 6.12;
    const rChord = rPier * Math.cos(angStep);
    const wChord = 2 * rPier * Math.sin(angStep) - 0.10;
    const nwShutterPivot = new THREE.Group();
    nwShutterPivot.position.set(cx + Math.sin(aMidPortal) * rChord, 0, cz + Math.cos(aMidPortal) * rChord);
    nwShutterPivot.rotation.y = aMidPortal;
    staticGroup.add(nwShutterPivot);
    shutterHandles.push(
      createRollingShutterDoor(
        nwShutterPivot,
        {
          id: 'hnp_nw',
          axis: 'x',
          pos: 0,
          spanCenter: 0,
          width: wChord,
          baseY: 0,
          topY: 3.20,
          thickness: 0.12,
        },
        shutterMat,
        espressoTrimMat
      )
    );
  }

  // Dynamic Open / Closed Status Plaque beside North Entrance (visible from Boulevard & Xanh SM drop-off)
  const openBadgeTex = createOpenStatusSignTex(true);
  const closedBadgeTex = createOpenStatusSignTex(false);
  const openBadgeMat = new THREE.MeshStandardMaterial({
    map: openBadgeTex,
    emissive: 0xffffff,
    emissiveMap: openBadgeTex,
    emissiveIntensity: 0.95,
  });
  const closedBadgeMat = new THREE.MeshStandardMaterial({
    map: closedBadgeTex,
    emissive: 0xffffff,
    emissiveMap: closedBadgeTex,
    emissiveIntensity: 0.72,
  });
  addBox(1.58, 3.08, 2.08, 2.88, -9.05, -8.95, espressoTrimMat);
  const openBadgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.71), openBadgeMat);
  openBadgeMesh.rotation.y = Math.PI;
  openBadgeMesh.position.set(2.33, 2.48, -9.06);
  openBadgeMesh.userData.noMerge = true;
  staticGroup.add(openBadgeMesh);

  const closedBadgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.71), closedBadgeMat);
  closedBadgeMesh.rotation.y = Math.PI;
  closedBadgeMesh.position.set(2.33, 2.48, -9.06);
  closedBadgeMesh.userData.noMerge = true;
  staticGroup.add(closedBadgeMesh);

  // Floor-1 Open Crab-Broth Kitchen Counter (East Interior Wing: lx = +4.0..+8.6, lz = +1.4..+8.4)
  addBox(4.0, 8.6, 0.0, 1.02, 1.4, 2.3, espressoTrimMat);
  addBox(4.0, 8.6, 1.02, 1.08, 1.35, 2.35, stainlessMat);
  addBox(4.0, 4.9, 0.0, 1.02, 2.3, 8.4, espressoTrimMat);
  addBox(3.95, 4.95, 1.02, 1.08, 2.3, 8.4, stainlessMat);
  addBox(7.2, 8.6, 0.0, 1.02, 2.3, 8.4, teakWoodMat);
  addBox(6.8, 8.6, 2.35, 2.85, 2.4, 8.2, stainlessMat);
  addBox(7.4, 8.4, 2.85, 3.65, 3.8, 6.8, stainlessMat);
  [3.6, 6.2].forEach((kz, kIdx) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.44, 18), copperMat);
    pot.position.set(7.8, 1.24, kz);
    staticGroup.add(pot);
    const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), brothGlowMat);
    broth.position.set(7.8, 1.45, kz);
    staticGroup.add(broth);

    for (let s = 0; s < 3; s++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), steamMat);
      puff.userData.noMerge = true;
      puff.position.set(7.8, 1.56 + s * 0.32, kz);
      staticGroup.add(puff);
      steamPuffs.push({
        mesh: puff,
        baseX: 7.8,
        baseY: 1.54,
        baseZ: kz,
        phase: kIdx * 2.5 + s * 1.9,
        speed: 0.56,
        radius: 0.09,
      });
    }
  });

  // Hostess Reception Podium
  addBox(-4.45, -3.55, 0.0, 1.12, -5.65, -4.75, teakWoodMat);
  addBox(-4.5, -3.5, 1.12, 1.18, -5.7, -4.7, brassMat);
  const deskLamp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 12), sconceGlowMat);
  deskLamp.position.set(-4.2, 1.42, -5.2);
  staticGroup.add(deskLamp);

  // Exterior Menu A-Frame Standee
  {
    const sg = new THREE.Group();
    sg.position.set(-6.1, 0, -8.6);
    sg.rotation.y = Math.PI * 0.25;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.32, 0.10), espressoTrimMat);
    frame.position.y = 0.68;
    sg.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 1.18), standeeMat);
    face.position.set(0, 0.68, 0.056);
    sg.add(face);
    const faceBack = face.clone();
    faceBack.rotation.y = Math.PI;
    faceBack.position.z = -0.056;
    sg.add(faceBack);
    staticGroup.add(sg);
  }

  // Xanh SM Curbside Drop-Off Totem
  {
    const tg = new THREE.Group();
    tg.position.set(-2.0, 0, -13.1);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.24, 0.44), espressoTrimMat);
    plinth.position.y = 0.12;
    tg.add(plinth);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.95, 0.18), espressoTrimMat);
    body.position.y = 1.21;
    tg.add(body);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 1.82), totemMat);
    front.position.set(0, 1.22, 0.095);
    tg.add(front);
    const back = front.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.095;
    tg.add(back);
    staticGroup.add(tg);
  }

  // Floor-1 Hotpot Tables (4 Indoor + 4 Outdoor Terrace)
  addHotpotTableSet(-4.2, 0, -1.6, false, 0.2);
  addHotpotTableSet(0.8, 0, -1.8, false, 1.4);
  addHotpotTableSet(-4.2, 0, 4.4, false, 2.6);
  addHotpotTableSet(0.5, 0, 4.4, false, 3.8);

  addHotpotTableSet(3.6, 0, -11.3, true, 0.9);
  addHotpotTableSet(7.6, 0, -11.3, true, 2.1);
  addHotpotTableSet(-11.6, 0, -1.4, true, 3.3);
  addHotpotTableSet(-11.6, 0, 2.6, true, 4.5);

  // Floor 1 & Outdoor Silk Lanterns
  addHangingLantern(-6.8, 3.15, -6.8, false, 1.0, 0.0);
  addHangingLantern(-5.2, 3.15, -8.2, true, 0.95, 0.8);
  addHangingLantern(-0.6, 3.15, -10.2, false, 1.0, 1.6);
  addHangingLantern(3.6, 3.10, -10.6, true, 0.92, 2.4);
  addHangingLantern(7.6, 3.10, -10.6, false, 0.92, 3.1);
  addHangingLantern(-10.6, 3.10, -1.4, false, 0.92, 0.5);
  addHangingLantern(-10.6, 3.10, 2.6, true, 0.92, 1.3);
  addHangingLantern(-4.2, 3.55, -1.6, true, 1.05, 0.4);
  addHangingLantern(0.8, 3.55, -1.8, false, 1.05, 1.2);
  addHangingLantern(-4.2, 3.55, 4.4, false, 1.05, 2.0);
  addHangingLantern(0.5, 3.55, 4.4, true, 1.05, 2.8);

  // =========================================================================
  // 3. OPEN WALK-IN UPPER FLOORS (FLOORS 2, 3, 4) + 4-FLOOR SWITCHBACK STAIRCASE
  // =========================================================================
  // 3A. Floor Slabs for Floors 2, 3, 4 (with clean Stairwell Opening lx=+5.0..+8.6, lz=-7.8..-1.0)
  for (let f = 1; f < 4; f++) {
    const yBase = f * floorH;
    // Structural teak ceiling / floor slab below yBase
    addBox(-3.2, 5.0, yBase - 0.24, yBase - 0.02, -8.8, 9.0, teakWoodMat);
    addBox(5.0, 8.8, yBase - 0.24, yBase - 0.02, -1.0, 9.0, teakWoodMat);
    addBox(5.0, 8.8, yBase - 0.24, yBase - 0.02, -8.8, -7.8, teakWoodMat);
    addBox(-8.8, -3.2, yBase - 0.24, yBase - 0.02, -3.2, 9.0, teakWoodMat);
    const ceilDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRadius, coreRadius, 0.22, 24, 1, false, Math.PI, Math.PI / 2),
      teakWoodMat
    );
    ceilDrum.position.set(cx, yBase - 0.13, cz);
    staticGroup.add(ceilDrum);

    // Warm Indochine Parquet Floor Surface (top exactly at yBase + 0.01)
    addBox(-3.2, 5.0, yBase - 0.02, yBase + 0.01, -8.8, 9.0, upperParquetMat);
    addBox(5.0, 8.8, yBase - 0.02, yBase + 0.01, -1.0, 9.0, upperParquetMat);
    addBox(5.0, 8.8, yBase - 0.02, yBase + 0.01, -8.8, -7.8, upperParquetMat);
    addBox(-8.8, -3.2, yBase - 0.02, yBase + 0.01, -3.2, 9.0, upperParquetMat);
    const floorDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRadius, coreRadius, 0.03, 24, 1, false, Math.PI, Math.PI / 2),
      upperParquetMat
    );
    floorDrum.position.set(cx, yBase - 0.005, cz);
    staticGroup.add(floorDrum);
  }

  // Full Roof Ceiling Slab at Floor 4 Top (totalWallH = 15.40)
  addBox(-3.2, 9.0, totalWallH - 0.24, totalWallH, -8.8, 9.0, teakWoodMat);
  addBox(-8.8, -3.2, totalWallH - 0.24, totalWallH, -3.2, 9.0, teakWoodMat);
  const roofCeilDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(coreRadius, coreRadius, 0.24, 24, 1, false, Math.PI, Math.PI / 2),
    teakWoodMat
  );
  roofCeilDrum.position.set(cx, totalWallH - 0.12, cz);
  staticGroup.add(roofCeilDrum);

  // 3B. 4-Floor Switchback Staircase (lx = +5.0..+8.6, lz = -7.8..-1.0 -> worldX 227.0..230.6, worldZ 48.2..55.0)
  // Floor 1 under-stair divider partition under elevated East flight
  addBox(6.82, 8.65, 0.0, 2.4, -1.12, -0.95, teakWoodMat);
  addBox(4.92, 5.05, 0.0, floorH, -7.85, -1.0, creamWallMat); // Stairwell West wall on Floor 1

  for (let f = 0; f < 3; f++) {
    const y0 = f * floorH;
    const yMid = y0 + floorH * 0.5;
    const stepCount = 10;
    const flightLen = 4.8; // lz -1.2 .. -6.0

    // West Flight (Flight A): climbs North from lz=-1.2 to lz=-6.0 (y0 -> yMid)
    for (let st = 0; st < stepCount; st++) {
      const sz = -1.2 - (st + 0.5) * (flightLen / stepCount);
      const sy = y0 + ((st + 1) / stepCount) * (floorH * 0.5);
      addBox(5.06, 6.74, sy - 0.14, sy, sz - 0.25, sz + 0.25, teakWoodMat);
    }
    // Sloped stringer beam under West flight
    const strLen = Math.hypot(flightLen, floorH * 0.5);
    const strAng = Math.atan2(floorH * 0.5, flightLen);
    const stringerW = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, strLen), espressoTrimMat);
    stringerW.position.set(5.90, y0 + floorH * 0.25 - 0.14, -3.6);
    stringerW.rotation.x = strAng;
    staticGroup.add(stringerW);

    // North Mid-Landing (lx = 5.05..8.58, lz = -7.8..-6.0 at yMid)
    addBox(5.05, 8.62, yMid - 0.18, yMid, -7.8, -6.0, teakWoodMat);
    addBox(5.05, 8.62, yMid - 0.22, yMid - 0.18, -7.8, -6.0, espressoTrimMat);

    // East Flight (Flight B): climbs South from lz=-6.0 to lz=-1.2 (yMid -> y0 + floorH)
    for (let st = 0; st < stepCount; st++) {
      const sz = -6.0 + (st + 0.5) * (flightLen / stepCount);
      const sy = yMid + ((st + 1) / stepCount) * (floorH * 0.5);
      addBox(6.86, 8.56, sy - 0.14, sy, sz - 0.25, sz + 0.25, teakWoodMat);
    }
    const stringerE = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, strLen), espressoTrimMat);
    stringerE.position.set(7.70, yMid + floorH * 0.25 - 0.14, -3.6);
    stringerE.rotation.x = -strAng;
    staticGroup.add(stringerE);

    // Center Brass-and-Iron Handrail between West & East flights
    addBox(6.77, 6.83, y0 + 0.88, y0 + floorH + 0.92, -6.0, -5.92, ironRailMat);
    addBox(6.77, 6.83, y0 + 0.0, y0 + 0.95, -1.25, -1.17, ironRailMat);
    const divRailW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, strLen), brassMat);
    divRailW.position.set(6.76, y0 + floorH * 0.25 + 0.88, -3.6);
    divRailW.rotation.x = strAng;
    staticGroup.add(divRailW);
    const divRailE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, strLen), brassMat);
    divRailE.position.set(6.84, yMid + floorH * 0.25 + 0.88, -3.6);
    divRailE.rotation.x = -strAng;
    staticGroup.add(divRailE);
  }

  // 3C. Open Glass Perimeter, Balconies, Guardrails, Sideboards, Lanterns & Hotpots on Floors 2, 3, 4
  for (let f = 1; f < 4; f++) {
    const yBase = f * floorH;
    const winBottom = yBase + 0.56;
    const winTop = yBase + floorH - 0.42;
    const winH = winTop - winBottom;
    const winMidY = (winBottom + winTop) * 0.5;

    // Curved Corner Clear Glass Storefront Bays (4 bays per upper floor so guests & lanterns glow through!)
    for (let s = 0; s < curveSegments; s++) {
      const a0 = angStart + s * angStep;
      const a1 = a0 + angStep;
      const aMid = (a0 + a1) * 0.5;
      const rWin = 6.08;
      const chordW = 2 * rWin * Math.sin(angStep * 0.5) * 0.94;

      const wainscot = new THREE.Mesh(new THREE.BoxGeometry(chordW, 0.56, 0.18), teakWoodMat);
      wainscot.position.set(cx + Math.sin(aMid) * rWin, yBase + 0.28, cz + Math.cos(aMid) * rWin);
      wainscot.rotation.y = aMid;
      staticGroup.add(wainscot);

      const glassPane = new THREE.Mesh(new THREE.BoxGeometry(chordW, winH, 0.06), clearStoreGlassMat);
      glassPane.position.set(cx + Math.sin(aMid) * rWin, winMidY, cz + Math.cos(aMid) * rWin);
      glassPane.rotation.y = aMid;
      staticGroup.add(glassPane);

      const header = new THREE.Mesh(new THREE.BoxGeometry(chordW + 0.08, 0.42, 0.20), creamWallMat);
      header.position.set(cx + Math.sin(aMid) * rWin, yBase + floorH - 0.21, cz + Math.cos(aMid) * rWin);
      header.rotation.y = aMid;
      staticGroup.add(header);

      const colX = cx + Math.sin(a0) * (rWin + 0.06);
      const colZ = cz + Math.cos(a0) * (rWin + 0.06);
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, floorH - 0.1, 0.26), espressoTrimMat);
      col.position.set(colX, yBase + floorH * 0.5, colZ);
      col.rotation.y = a0;
      staticGroup.add(col);

      if (s > 0) {
        const scX = cx + Math.sin(a0) * (rWin + 0.22);
        const scZ = cz + Math.cos(a0) * (rWin + 0.22);
        addWallSconce(scX, yBase + 2.25, scZ, a0);
      }
    }

    // North-East Wing Clear Glass Bays + Balconies (lx = -2.85 .. +8.65, lz = -8.88)
    addBox(-2.85, 8.65, yBase, winBottom, -8.98, -8.76, creamWallMat);
    addBox(-2.85, 8.65, yBase + 0.46, winBottom, -9.00, -8.74, teakWoodMat);
    addBox(-2.85, 8.65, winBottom, winTop, -8.92, -8.85, clearStoreGlassMat);
    addBox(-2.85, 8.65, winTop, yBase + floorH, -8.98, -8.76, creamWallMat);
    [-2.5, 1.3, 4.95, 8.55].forEach((mx) => {
      addBox(mx - 0.12, mx + 0.12, yBase, yBase + floorH, -9.02, -8.74, espressoTrimMat);
    });
    [0.2, 4.9].forEach((bx) => {
      addBox(bx - 2.25, bx + 2.25, yBase - 0.16, yBase + 0.08, -9.55, -8.75, espressoTrimMat);
      addBox(bx - 2.22, bx + 2.22, yBase + 0.08, yBase + 0.96, -9.52, -9.45, balconyGlassMat);
      addBox(bx - 2.25, bx + 2.25, yBase + 0.94, yBase + 1.02, -9.55, -9.43, ironRailMat);
      addWallSconce(bx - 2.15, yBase + 2.2, -9.05, Math.PI);
    });

    // West-South Wing Clear Glass Bays + Balconies (lx = -8.88, lz = -2.85 .. +8.65)
    addBox(-8.98, -8.76, yBase, winBottom, -2.85, 8.65, creamWallMat);
    addBox(-9.00, -8.74, yBase + 0.46, winBottom, -2.85, 8.65, teakWoodMat);
    addBox(-8.92, -8.85, winBottom, winTop, -2.85, 8.65, clearStoreGlassMat);
    addBox(-8.98, -8.76, winTop, yBase + floorH, -2.85, 8.65, creamWallMat);
    [-2.5, 2.8, 8.55].forEach((mz) => {
      addBox(-9.02, -8.74, yBase, yBase + floorH, mz - 0.12, mz + 0.12, espressoTrimMat);
    });
    [0.2, 4.9].forEach((bz) => {
      addBox(-9.55, -8.75, yBase - 0.16, yBase + 0.08, bz - 2.25, bz + 2.25, espressoTrimMat);
      addBox(-9.52, -9.45, yBase + 0.08, yBase + 0.96, bz - 2.22, bz + 2.22, balconyGlassMat);
      addBox(-9.55, -9.43, yBase + 0.94, yBase + 1.02, bz - 2.25, bz + 2.25, ironRailMat);
      addWallSconce(-9.05, yBase + 2.2, bz - 2.15, -Math.PI / 2);
    });

    // Projecting Curved Corner Balcony Deck + Railings + Flowering Planters
    const balcR = 6.95;
    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(balcR, balcR, 0.34, 24, 1, false, Math.PI - 0.04, Math.PI / 2 + 0.08),
      espressoTrimMat
    );
    slab.position.set(cx, yBase - 0.06, cz);
    staticGroup.add(slab);

    const railTop = new THREE.Mesh(
      new THREE.CylinderGeometry(balcR - 0.05, balcR - 0.05, 0.08, 24, 1, true, Math.PI - 0.02, Math.PI / 2 + 0.04),
      ironRailMat
    );
    railTop.position.set(cx, yBase + 1.04, cz);
    staticGroup.add(railTop);

    const railGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(balcR - 0.08, balcR - 0.08, 0.92, 24, 1, true, Math.PI - 0.02, Math.PI / 2 + 0.04),
      balconyGlassMat
    );
    railGlass.position.set(cx, yBase + 0.56, cz);
    staticGroup.add(railGlass);

    for (let bi = 0; bi <= 6; bi++) {
      const ba = Math.PI + (bi / 6) * (Math.PI / 2);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.98, 0.08), ironRailMat);
      post.position.set(cx + Math.sin(ba) * (balcR - 0.06), yBase + 0.58, cz + Math.cos(ba) * (balcR - 0.06));
      staticGroup.add(post);

      if ((f === 1 || f === 2) && bi % 2 === 1) {
        const pr = balcR - 0.42;
        const px = cx + Math.sin(ba) * pr;
        const pz = cz + Math.cos(ba) * pr;
        const pot = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.36, 0.44), planterSoilMat);
        pot.position.set(px, yBase + 0.26, pz);
        pot.rotation.y = ba;
        staticGroup.add(pot);

        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), plantLeafMat);
        bush.position.set(px, yBase + 0.62, pz);
        staticGroup.add(bush);

        const flower1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), blossomMat);
        flower1.position.set(px + 0.14, yBase + 0.78, pz - 0.10);
        staticGroup.add(flower1);
        const flower2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), blossomMat);
        flower2.position.set(px - 0.15, yBase + 0.68, pz + 0.14);
        staticGroup.add(flower2);
      }
    }

    const eaveArc = new THREE.Mesh(
      new THREE.CylinderGeometry(balcR - 0.25, balcR - 0.25, 0.06, 20, 1, true, Math.PI + 0.04, Math.PI / 2 - 0.08),
      warmEaveLedMat
    );
    eaveArc.position.set(cx, yBase - 0.23, cz);
    staticGroup.add(eaveArc);

    // Stairwell Opening Safety Balustrades on Floors 2, 3, 4 (West edge & North rim; South entrance open)
    addBox(4.92, 5.04, yBase, yBase + 0.92, -7.8, -1.0, balconyGlassMat);
    addBox(4.90, 5.06, yBase + 0.92, yBase + 1.00, -7.8, -0.95, ironRailMat);
    for (let pz = -7.7; pz <= -1.0; pz += 1.68) {
      addBox(4.93, 5.03, yBase, yBase + 1.00, pz - 0.04, pz + 0.04, brassMat);
    }
    if (f === 3) {
      // Floor 4 top: guard West lane edge so player exits strictly down the East flight
      addBox(5.0, 6.80, yBase, yBase + 0.92, -1.04, -0.96, balconyGlassMat);
      addBox(5.0, 6.82, yBase + 0.92, yBase + 1.00, -1.06, -0.94, ironRailMat);
    }

    // SE Wall Hospitality Tea & Condiment Sideboard
    addBox(7.4, 8.6, yBase, yBase + 0.98, 2.2, 7.4, teakWoodMat);
    addBox(7.35, 8.65, yBase + 0.98, yBase + 1.04, 2.15, 7.45, brassMat);
    [3.2, 4.8, 6.4].forEach((vz) => {
      const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.34, 12), copperMat);
      urn.position.set(7.95, yBase + 1.21, vz);
      staticGroup.add(urn);
    });

    // 4 Walk-In Hotpot Tables + Hanging Silk Lanterns on every Upper Floor!
    UPPER_FLOOR_TABLE_OFFSETS.forEach(([tx, tz], tIdx) => {
      addHotpotTableSet(tx, yBase, tz, false, f * 3.1 + tIdx * 1.3);
      addHangingLantern(tx, yBase + 3.45, tz, (f + tIdx) % 2 === 0, 1.0, f * 1.4 + tIdx * 0.9);
    });
    // Extra silk lantern over stairwell & corner window
    addHangingLantern(-5.2, yBase + 3.45, -5.2, f % 2 === 1, 1.05, f * 1.7);
    addHangingLantern(6.8, yBase + 3.45, -2.5, f % 2 === 0, 0.95, f * 2.1);
  }

  // Floor 1 Curved Canopy & Outdoor Terrace Pergolas
  {
    const balcR = 6.95;
    const f1Canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(balcR, balcR, 0.34, 24, 1, false, Math.PI - 0.04, Math.PI / 2 + 0.08),
      espressoTrimMat
    );
    f1Canopy.position.set(cx, floorH - 0.06, cz);
    staticGroup.add(f1Canopy);
    addBox(-2.8, 9.0, 3.35, 3.65, -12.6, -9.0, espressoTrimMat);
    for (let rx = -2.2; rx <= 8.6; rx += 0.9) {
      addBox(rx - 0.06, rx + 0.06, 3.55, 3.75, -12.6, -9.0, teakWoodMat);
    }
    addBox(-12.6, -9.0, 3.35, 3.65, -2.8, 8.8, espressoTrimMat);
    for (let rz = -2.2; rz <= 8.4; rz += 0.9) {
      addBox(-12.6, -9.0, 3.55, 3.75, rz - 0.06, rz + 0.06, teakWoodMat);
    }
  }

  // =========================================================================
  // 4. SIGNATURE ILLUMINATED SIGNBOARDS & TERRACOTTA INDOCHINE ROOF CROWN
  // =========================================================================
  // Ground-Floor Curved Menu Gallery
  const menuArc = new THREE.Mesh(
    new THREE.CylinderGeometry(7.08, 7.08, 1.05, 24, 1, true, Math.PI + 0.05, Math.PI / 2 - 0.10),
    menuStripMat
  );
  menuArc.position.set(cx, 3.55, cz);
  menuArc.userData.noMerge = true;
  staticGroup.add(menuArc);

  const menuBack = new THREE.Mesh(
    new THREE.CylinderGeometry(7.02, 7.02, 1.12, 24, 1, true, Math.PI + 0.04, Math.PI / 2 - 0.08),
    espressoTrimMat
  );
  menuBack.position.set(cx, 3.55, cz);
  staticGroup.add(menuBack);

  // Floor-3 Curved Corner Marquee: "LẨU CUA ĐỒNG ĐẶC BIỆT" (100% unobstructed!)
  const lauCuaArc = new THREE.Mesh(
    new THREE.CylinderGeometry(7.08, 7.08, 0.94, 24, 1, true, Math.PI + 0.04, Math.PI / 2 - 0.08),
    lauCuaSignMat
  );
  lauCuaArc.position.set(cx, floorH * 3 - 0.18, cz);
  lauCuaArc.userData.noMerge = true;
  staticGroup.add(lauCuaArc);

  const lauCuaBack = new THREE.Mesh(
    new THREE.CylinderGeometry(7.02, 7.02, 1.02, 24, 1, true, Math.PI + 0.02, Math.PI / 2 - 0.04),
    espressoTrimMat
  );
  lauCuaBack.position.set(cx, floorH * 3 - 0.18, cz);
  staticGroup.add(lauCuaBack);

  // Vertical Blade Sign mounted off the West Wing Pier (zero overlap over curved marquee!)
  {
    const bladeGrp = new THREE.Group();
    bladeGrp.position.set(-10.25, 8.4, -2.55);
    bladeGrp.rotation.y = Math.PI * 0.5;
    const bracketTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.35), ironRailMat);
    bracketTop.position.set(0, 1.8, 0.65);
    bladeGrp.add(bracketTop);
    const bracketBot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.35), ironRailMat);
    bracketBot.position.set(0, -1.8, 0.65);
    bladeGrp.add(bracketBot);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.35, 1.08), espressoTrimMat);
    bladeGrp.add(frame);
    const fRight = new THREE.Mesh(new THREE.PlaneGeometry(1.00, 4.20), bladeSignMat);
    fRight.rotation.y = Math.PI / 2;
    fRight.position.x = 0.12;
    fRight.userData.noMerge = true;
    bladeGrp.add(fRight);
    const fLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.00, 4.20), bladeSignMat);
    fLeft.rotation.y = -Math.PI / 2;
    fLeft.position.x = -0.12;
    fLeft.userData.noMerge = true;
    bladeGrp.add(fLeft);
    staticGroup.add(bladeGrp);
  }

  // Rooftop Terracotta Clay Tile Eave + Louvers + "Hà Nội Phố" Illuminated Crown
  const roofY = totalWallH;
  const roofCornice = new THREE.Mesh(
    new THREE.CylinderGeometry(7.25, 6.70, 0.56, 24, 1, false, Math.PI - 0.06, Math.PI / 2 + 0.12),
    terracottaMat
  );
  roofCornice.position.set(cx, roofY + 0.22, cz);
  staticGroup.add(roofCornice);

  for (let lx = -2.2; lx <= 8.2; lx += 0.65) {
    addBox(lx - 0.08, lx + 0.08, roofY - 0.18, roofY + 0.14, -9.65, -8.75, teakWoodMat);
  }
  for (let lz = -2.2; lz <= 8.2; lz += 0.65) {
    addBox(-9.65, -8.75, roofY - 0.18, roofY + 0.14, lz - 0.08, lz + 0.08, teakWoodMat);
  }
  addBox(-3.2, 9.2, roofY, roofY + 0.52, -9.65, 9.2, terracottaMat);
  addBox(-9.65, -3.2, roofY, roofY + 0.52, -3.2, 9.2, terracottaMat);

  const crownDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(6.35, 6.35, 1.85, 24, 1, false, Math.PI, Math.PI / 2),
    espressoTrimMat
  );
  crownDrum.position.set(cx, roofY + 1.35, cz);
  staticGroup.add(crownDrum);

  const rooftopSignArc = new THREE.Mesh(
    new THREE.CylinderGeometry(6.52, 6.52, 1.60, 24, 1, true, Math.PI + 0.06, Math.PI / 2 - 0.12),
    rooftopSignMat
  );
  rooftopSignArc.position.set(cx, roofY + 1.35, cz);
  rooftopSignArc.userData.noMerge = true;
  staticGroup.add(rooftopSignArc);

  const crownCap = new THREE.Mesh(
    new THREE.CylinderGeometry(6.55, 6.55, 0.14, 24, 1, false, Math.PI + 0.04, Math.PI / 2 - 0.08),
    brassMat
  );
  crownCap.position.set(cx, roofY + 2.26, cz);
  staticGroup.add(crownCap);

  // Ground Sidewalk & Terrace Warm Glow Pools
  const poolTex = createWarmFloorPoolTex();
  const sharedPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(sharedPoolMat);

  [
    [cx - 5.6, cz - 5.6],
    [0.5, -11.4],
    [5.8, -11.4],
    [-11.4, 0.6],
    [-1.2, 1.2],
  ].forEach(([px, pz]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 8.5), sharedPoolMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(px, 0.032, pz);
    staticGroup.add(p);
  });

  // =========================================================================
  // 5. WARM MULTI-FLOOR & EXTERIOR ILLUMINATION RIG (OPERATING-HOUR SCALED)
  // =========================================================================
  let closedFactor = 0.0;
  const registerLight = (
    color: number,
    lx: number,
    ly: number,
    lz: number,
    dist: number,
    dayInt: number,
    nightInt: number,
    minKeepClosed = 0.06
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 1.3);
    l.position.set(HNP_ORIGIN_X + lx, ly, HNP_ORIGIN_Z + lz);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => Math.max(minKeepClosed, 1.0 - closedFactor),
    });
  };

  registerLight(0xfbbf24, -8.5, 4.2, -8.5, 28, 3, 18, 0.22); // NW Corner Entrance & Boulevard Wash
  registerLight(0xfde68a, 1.5, 4.2, -12.0, 26, 3, 16, 0.18); // North Terrace & Xanh SM Curb Bay
  registerLight(0xffedd5, -1.0, 3.2, 0.5, 24, 5, 16, 0.04); // Floor 1 Open Dining Hall
  registerLight(0xffedd5, -1.0, 7.1, 0.5, 24, 5, 16, 0.04); // Floor 2 Open Dining Hall
  registerLight(0xffedd5, -1.0, 10.9, 0.5, 24, 5, 16, 0.04); // Floor 3 Open Dining Hall
  registerLight(0xfde68a, -1.0, 14.7, 0.5, 24, 5, 16, 0.04); // Floor 4 VIP Dining Hall & Rooftop Glow

  let elapsed = 0;
  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: HaNoiPhoNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    elapsed += dt;
    const isOpen = isHaNoiPhoOpenAtHour(rawHour);
    const targetClosed = isOpen ? 0.0 : 1.0;
    closedFactor = THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 3.5));

    // Rolling shutter open/close motion
    for (let i = 0; i < shutterHandles.length; i++) {
      setShutterProgress(shutterHandles[i], closedFactor);
    }

    // Dynamic Open / Closed plaque swap
    openBadgeMesh.visible = isOpen;
    closedBadgeMesh.visible = !isOpen;

    const openScale = 1.0 - closedFactor;

    creamWallMat.emissiveIntensity = openScale * (0.08 + lampFactor * 0.24) + (1 - openScale) * lampFactor * 0.08;
    warmSandMat.emissiveIntensity = openScale * (0.07 + lampFactor * 0.20) + (1 - openScale) * lampFactor * 0.06;

    const signGlow = openScale > 0.05 ? openScale * (0.32 + lampFactor * 0.88) : 0.28 * Math.max(0.4, lampFactor);
    lauCuaSignMat.emissiveIntensity = signGlow;
    rooftopSignMat.emissiveIntensity = signGlow;
    bladeSignMat.emissiveIntensity = signGlow;
    menuStripMat.emissiveIntensity = openScale * (0.26 + lampFactor * 0.65) + (1 - openScale) * 0.14;
    standeeMat.emissiveIntensity = openScale * (0.20 + lampFactor * 0.52) + (1 - openScale) * 0.12;
    totemMat.emissiveIntensity = 0.24 + lampFactor * 0.62;
    warmEaveLedMat.emissiveIntensity = openScale * (0.22 + lampFactor * 1.15) + (1 - openScale) * lampFactor * 0.28;
    sharedPoolMat.opacity = (0.12 + lampFactor * 0.66) * Math.max(0.24, openScale);

    // Rich Crimson & Gold Silk Lantern glow without losing hue in daytime!
    const silkGlow = openScale * (0.45 + lampFactor * 0.95) + (1 - openScale) * 0.06;
    redSilkMat.emissiveIntensity = silkGlow;
    goldSilkMat.emissiveIntensity = silkGlow;

    // Gentle simmer flicker on induction stoves & crab-broth glow while open
    stoveGlowMat.emissiveIntensity = openScale * (0.85 + Math.sin(elapsed * 5.2) * 0.22);
    brothGlowMat.emissiveIntensity = openScale * (0.55 + Math.sin(elapsed * 3.4) * 0.14);

    // Animate rising & swirling hotpot steam puffs across all 4 floors when open
    const steamVisible = openScale > 0.35;
    for (let i = 0; i < steamPuffs.length; i++) {
      const sp = steamPuffs[i];
      if (!steamVisible) {
        sp.mesh.visible = false;
        continue;
      }
      const cyc = (elapsed * sp.speed + sp.phase) % 1.0;
      const lift = cyc * 0.92;
      const swayX = Math.sin(elapsed * 2.4 + sp.phase) * sp.radius * (0.4 + cyc);
      const swayZ = Math.cos(elapsed * 2.1 + sp.phase) * sp.radius * (0.4 + cyc);
      sp.mesh.position.set(sp.baseX + swayX, sp.baseY + lift, sp.baseZ + swayZ);
      const sc = 0.55 + cyc * 1.25;
      sp.mesh.scale.setScalar(sc);
      sp.mesh.visible = cyc < 0.95;
    }

    // Gentle breeze sway on hanging silk lanterns
    for (let i = 0; i < swayingLanterns.length; i++) {
      const sl = swayingLanterns[i];
      sl.pivot.rotation.z = Math.sin(elapsed * 1.65 + sl.phase) * 0.055;
      sl.pivot.rotation.x = Math.cos(elapsed * 1.3 + sl.phase) * 0.035;
    }

    npcController?.update(delta, rawHour);
  };

  updateOperatingHours(12.5, 0, 0.2, null);

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
// LIVE ANIMATED NPCS ACROSS ALL 4 FLOORS (12:00 TRƯA – 23:00 TỐI)
// =========================================================================

interface HaNoiPhoNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Mesh;
  role: 'hostess' | 'chef' | 'waiter' | 'diner_seated' | 'guest_walk';
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  phase: number;
  walkPhase: number;
  idleYaw?: number;
  seated?: boolean;
  exitPath: THREE.Vector3[];
  exitWp: { idx: number };
  glbHandle: GlbHumanHandle;
}

function buildHaNoiPhoNpcMesh(
  helpers: HospitalCharacterHelpers,
  shirt: number,
  pants: number,
  skin: string,
  hairColor: number,
  options?: {
    apronColor?: number | null;
    chefHat?: boolean;
    hasTray?: boolean;
    seated?: boolean;
    aoDaiSkirt?: boolean;
  }
) {
  const grp = new THREE.Group();
  const hips = new THREE.Group();
  grp.add(hips);

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.72 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), shirtMat);
  torso.position.y = 1.04;
  hips.add(torso);

  if (options?.aoDaiSkirt) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.44, 0.25), shirtMat);
    skirt.position.y = 0.68;
    hips.add(skirt);
  }

  if (options?.apronColor != null) {
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.48, 0.26),
      new THREE.MeshStandardMaterial({ color: options.apronColor, roughness: 0.65 })
    );
    apron.position.y = 0.86;
    hips.add(apron);
  }

  const faceTex = helpers.createFaceTexture('happy', skin);
  const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
  head.position.y = 1.48;
  hips.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
  hair.position.y = 1.61;
  hips.add(hair);

  if (options?.chefHat) {
    const toqueMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const toque = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.22, 12), toqueMat);
    toque.position.y = 1.74;
    hips.add(toque);
  }

  const makeArm = (ax: number) => {
    const p = new THREE.Group();
    p.position.set(ax, 1.26, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), shirtMat);
    m.position.y = -0.18;
    p.add(m);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), skinMat);
    hand.position.y = -0.43;
    p.add(hand);
    hips.add(p);
    return p;
  };
  const leftArm = makeArm(-0.29);
  const rightArm = makeArm(0.29);

  if (options?.hasTray) {
    const trayGroup = new THREE.Group();
    trayGroup.position.set(-0.04, -0.36, 0.22);
    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.20, 0.03, 14),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.5 })
    );
    trayGroup.add(tray);
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.08, 0.09, 10),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.7 })
    );
    bowl.position.y = 0.06;
    trayGroup.add(bowl);
    rightArm.add(trayGroup);
  }

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

  if (options?.seated) {
    hips.position.y = -0.26;
    leftLeg.rotation.x = -Math.PI / 2;
    rightLeg.rotation.x = -Math.PI / 2;
    leftArm.rotation.x = -0.42;
    rightArm.rotation.x = -0.42;
  }

  return { group: grp, hips, leftArm, rightArm, leftLeg, rightLeg, head };
}

export class HaNoiPhoNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: HaNoiPhoNpcActor[] = [];
  private wasOpen = false;
  private fullyCleared = true;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const F2Y = HA_NOI_PHO_FLOOR_H + 0.02; // 3.87
    const F3Y = HA_NOI_PHO_FLOOR_H * 2 + 0.02; // 7.72
    const F4Y = HA_NOI_PHO_FLOOR_H * 3 + 0.02; // 11.57

    const specs: Array<{
      role: HaNoiPhoNpcActor['role'];
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      apron?: number | null;
      chefHat?: boolean;
      hasTray?: boolean;
      aoDaiSkirt?: boolean;
      seated?: boolean;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      speed?: number;
    }> = [
      // === FLOOR 1 & TERRACE (14 NPCs) ===
      {
        role: 'hostess',
        shirt: 0xb91c1c,
        pants: 0xfef3c7,
        skin: '#fce0c8',
        hair: 0x111827,
        aoDaiSkirt: true,
        waypoints: [new THREE.Vector3(217.2, 0.02, 50.2)],
        idleYaw: -Math.PI * 0.75,
      },
      {
        role: 'chef',
        shirt: 0xffffff,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x18181b,
        apron: 0x991b1b,
        chefHat: true,
        waypoints: [
          new THREE.Vector3(228.5, 0.02, 59.4),
          new THREE.Vector3(228.5, 0.02, 62.2),
        ],
        speed: 0.75,
      },
      {
        role: 'chef',
        shirt: 0xffffff,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x27150a,
        apron: 0x1e293b,
        chefHat: true,
        waypoints: [new THREE.Vector3(227.6, 0.02, 57.9)],
        idleYaw: Math.PI,
      },
      {
        role: 'waiter',
        shirt: 0xf59e0b,
        pants: 0x0f172a,
        skin: '#fce0c8',
        hair: 0x111827,
        apron: 0x2c1c12,
        hasTray: true,
        waypoints: [
          new THREE.Vector3(224.8, 0.02, 58.2),
          new THREE.Vector3(220.2, 0.02, 57.5),
          new THREE.Vector3(220.2, 0.02, 53.0),
          new THREE.Vector3(224.5, 0.02, 53.0),
          new THREE.Vector3(224.8, 0.02, 58.2),
        ],
        speed: 1.38,
      },
      {
        role: 'waiter',
        shirt: 0xf59e0b,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x18181b,
        apron: 0x2c1c12,
        hasTray: true,
        waypoints: [
          new THREE.Vector3(221.4, 0.02, 50.8),
          new THREE.Vector3(221.4, 0.02, 46.2),
          new THREE.Vector3(227.5, 0.02, 46.2),
          new THREE.Vector3(221.4, 0.02, 46.2),
          new THREE.Vector3(215.5, 0.02, 48.2),
          new THREE.Vector3(211.8, 0.02, 52.8),
          new THREE.Vector3(211.8, 0.02, 57.2),
          new THREE.Vector3(215.5, 0.02, 48.2),
        ],
        speed: 1.45,
      },
      // 4 Outdoor Terrace Hotpot Diners
      {
        role: 'diner_seated',
        shirt: 0x0ea5e9,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(225.2, 0.02, 43.92)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0xf43f5e,
        pants: 0x334155,
        skin: '#fce0c8',
        hair: 0x27150a,
        seated: true,
        waypoints: [new THREE.Vector3(226.0, 0.02, 45.48)],
        idleYaw: Math.PI,
      },
      {
        role: 'diner_seated',
        shirt: 0x22c55e,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x18181b,
        seated: true,
        waypoints: [new THREE.Vector3(229.2, 0.02, 43.92)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0xa855f7,
        pants: 0x1e293b,
        skin: '#e8b48e',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(210.0, 0.02, 55.38)],
        idleYaw: Math.PI,
      },
      // 4 Floor-1 Indoor Hotpot Diners
      {
        role: 'diner_seated',
        shirt: 0xec4899,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x27150a,
        seated: true,
        waypoints: [new THREE.Vector3(217.4, 0.02, 53.62)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0x3b82f6,
        pants: 0x0f172a,
        skin: '#fbd3b4',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(218.2, 0.02, 55.18)],
        idleYaw: Math.PI,
      },
      {
        role: 'diner_seated',
        shirt: 0xf97316,
        pants: 0x334155,
        skin: '#f5c7a3',
        hair: 0x18181b,
        seated: true,
        waypoints: [new THREE.Vector3(222.4, 0.02, 53.42)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0x14b8a6,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(222.1, 0.02, 61.18)],
        idleYaw: Math.PI,
      },
      // Strolling Walk-In Guest
      {
        role: 'guest_walk',
        shirt: 0x6366f1,
        pants: 0x0f172a,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(205.5, 0.02, 41.5),
          new THREE.Vector3(214.2, 0.02, 46.8),
          new THREE.Vector3(216.2, 0.02, 50.8),
          new THREE.Vector3(220.4, 0.02, 52.0),
          new THREE.Vector3(221.4, 0.02, 46.5),
          new THREE.Vector3(219.5, 0.02, 41.0),
          new THREE.Vector3(205.5, 0.02, 41.5),
        ],
        speed: 1.25,
      },

      // === FLOOR 2 HOTPOT DINING HALL (4 Seated Diners + 1 Waiter) ===
      {
        role: 'diner_seated',
        shirt: 0xef4444,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(217.4, F2Y, 53.42)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0x38bdf8,
        pants: 0x0f172a,
        skin: '#fbd3b4',
        hair: 0x27150a,
        seated: true,
        waypoints: [new THREE.Vector3(218.2, F2Y, 54.98)],
        idleYaw: Math.PI,
      },
      {
        role: 'diner_seated',
        shirt: 0xfacc15,
        pants: 0x334155,
        skin: '#f5c7a3',
        hair: 0x18181b,
        seated: true,
        waypoints: [new THREE.Vector3(222.4, F2Y, 51.62)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0x10b981,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(223.6, F2Y, 59.62)],
        idleYaw: 0,
      },
      {
        role: 'waiter',
        shirt: 0xf59e0b,
        pants: 0x0f172a,
        skin: '#fce0c8',
        hair: 0x111827,
        apron: 0x2c1c12,
        hasTray: true,
        waypoints: [
          new THREE.Vector3(228.5, F2Y, 58.2),
          new THREE.Vector3(224.2, F2Y, 56.8),
          new THREE.Vector3(220.0, F2Y, 56.5),
          new THREE.Vector3(220.0, F2Y, 52.0),
          new THREE.Vector3(225.5, F2Y, 56.5),
          new THREE.Vector3(228.5, F2Y, 58.2),
        ],
        speed: 1.35,
      },

      // === FLOOR 3 HOTPOT DINING HALL (4 Seated Diners + 1 Waiter) ===
      {
        role: 'diner_seated',
        shirt: 0xc084fc,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(217.4, F3Y, 53.42)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0xfb7185,
        pants: 0x0f172a,
        skin: '#fce0c8',
        hair: 0x27150a,
        seated: true,
        waypoints: [new THREE.Vector3(218.2, F3Y, 54.98)],
        idleYaw: Math.PI,
      },
      {
        role: 'diner_seated',
        shirt: 0x2dd4bf,
        pants: 0x334155,
        skin: '#f5c7a3',
        hair: 0x18181b,
        seated: true,
        waypoints: [new THREE.Vector3(223.2, F3Y, 53.18)],
        idleYaw: Math.PI,
      },
      {
        role: 'diner_seated',
        shirt: 0x60a5fa,
        pants: 0x1e293b,
        skin: '#e8b48e',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(218.2, F3Y, 61.18)],
        idleYaw: Math.PI,
      },
      {
        role: 'waiter',
        shirt: 0xf59e0b,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x18181b,
        apron: 0x2c1c12,
        hasTray: true,
        waypoints: [
          new THREE.Vector3(228.5, F3Y, 58.2),
          new THREE.Vector3(220.2, F3Y, 57.2),
          new THREE.Vector3(220.2, F3Y, 51.8),
          new THREE.Vector3(225.4, F3Y, 55.2),
          new THREE.Vector3(228.5, F3Y, 58.2),
        ],
        speed: 1.32,
      },

      // === FLOOR 4 VIP DINING HALL (4 Seated VIP Diners + 1 Waiter) ===
      {
        role: 'diner_seated',
        shirt: 0xfbbf24,
        pants: 0x0f172a,
        skin: '#fce0c8',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(217.4, F4Y, 53.42)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0x818cf8,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x27150a,
        seated: true,
        waypoints: [new THREE.Vector3(218.2, F4Y, 54.98)],
        idleYaw: Math.PI,
      },
      {
        role: 'diner_seated',
        shirt: 0x34d399,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x18181b,
        seated: true,
        waypoints: [new THREE.Vector3(222.4, F4Y, 51.62)],
        idleYaw: 0,
      },
      {
        role: 'diner_seated',
        shirt: 0xf472b6,
        pants: 0x334155,
        skin: '#fbd3b4',
        hair: 0x111827,
        seated: true,
        waypoints: [new THREE.Vector3(223.6, F4Y, 61.18)],
        idleYaw: Math.PI,
      },
      {
        role: 'waiter',
        shirt: 0xf59e0b,
        pants: 0x0f172a,
        skin: '#fce0c8',
        hair: 0x111827,
        apron: 0x2c1c12,
        hasTray: true,
        waypoints: [
          new THREE.Vector3(228.5, F4Y, 58.2),
          new THREE.Vector3(224.2, F4Y, 57.0),
          new THREE.Vector3(219.8, F4Y, 56.8),
          new THREE.Vector3(220.2, F4Y, 51.8),
          new THREE.Vector3(228.5, F4Y, 58.2),
        ],
        speed: 1.30,
      },

      // === STAIRCASE SERVER WALKING F1 <-> F2 VIA SWITCHBACK STAIRS ===
      {
        role: 'waiter',
        shirt: 0xf59e0b,
        pants: 0x0f172a,
        skin: '#fbd3b4',
        hair: 0x111827,
        apron: 0x991b1b,
        hasTray: true,
        waypoints: [
          new THREE.Vector3(225.4, 0.02, 56.2),
          new THREE.Vector3(227.9, 0.02, 55.2),
          new THREE.Vector3(227.9, 0.02 + HA_NOI_PHO_FLOOR_H * 0.5, 49.1),
          new THREE.Vector3(229.7, 0.02 + HA_NOI_PHO_FLOOR_H * 0.5, 49.1),
          new THREE.Vector3(229.7, F2Y, 55.4),
          new THREE.Vector3(225.2, F2Y, 56.0),
          new THREE.Vector3(229.7, F2Y, 55.4),
          new THREE.Vector3(229.7, 0.02 + HA_NOI_PHO_FLOOR_H * 0.5, 49.1),
          new THREE.Vector3(227.9, 0.02 + HA_NOI_PHO_FLOOR_H * 0.5, 49.1),
          new THREE.Vector3(227.9, 0.02, 55.2),
        ],
        speed: 1.40,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildHaNoiPhoNpcMesh(helpers, s.shirt, s.pants, s.skin, s.hair, {
        apronColor: s.apron,
        chefHat: s.chefHat,
        hasTray: s.hasTray,
        aoDaiSkirt: s.aoDaiSkirt,
        seated: s.seated,
      });
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const exitPath =
        s.waypoints[0].z < 46.5 || s.waypoints[0].x < 213.2
          ? [new THREE.Vector3(212.8, 0.02, 44.2), new THREE.Vector3(204.5, 0.02, 41.5)]
          : [new THREE.Vector3(221.4, 0.02, 51.0), new THREE.Vector3(221.4, 0.02, 43.2)];

      const spec =
        s.role === 'hostess'
          ? CASHIER_NPC_MODEL
          : s.seated
          ? pickSeatedCivilianModel(idx * 3 + 1)
          : s.role === 'guest_walk'
          ? pickOutsideNpcModel(idx * 5 + 2)
          : pickStationaryCivilianModel(idx * 3 + 1);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: built.group,
        fallbackMeshes: [built.hips],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: s.seated ? 'Sit' : s.waypoints.length > 1 ? 'Walk' : 'Idle',
        phaseOffset: idx * 0.9,
      });

      this.actors.push({
        group: built.group,
        hips: built.hips,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        head: built.head,
        role: s.role,
        waypoints: s.waypoints,
        wpIdx: s.waypoints.length > 1 ? 1 : 0,
        speed: s.speed ?? 1.25,
        phase: idx * 1.15,
        walkPhase: idx * 0.85,
        idleYaw: s.idleYaw,
        seated: s.seated,
        exitPath,
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
    const isOpen = isHaNoiPhoOpenAtHour(rawHour);

    if (isOpen && !this.wasOpen) {
      // Re-opening at 12:00 trưa: reset all NPCs across all 4 floors & terrace
      this.fullyCleared = false;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        a.exitWp.idx = 0;
        a.wpIdx = a.waypoints.length > 1 ? 1 : 0;
        a.group.position.copy(a.waypoints[0]);
        a.group.visible = true;
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.glbHandle.setAnimState(a.seated ? 'Sit' : a.waypoints.length > 1 ? 'Walk' : 'Idle');
      }
    } else if (!isOpen && this.wasOpen) {
      // Closing at 23:00 tối: evacuate standing Ground/Terrace staff cleanly
      for (let i = 0; i < this.actors.length; i++) {
        this.actors[i].exitWp.idx = 0;
        if (!this.actors[i].seated && this.actors[i].group.position.y <= 1.5) {
          this.actors[i].glbHandle.setAnimState('Walk', 1.15);
        }
      }
    }
    this.wasOpen = isOpen;

    if (!isOpen) {
      if (this.fullyCleared) {
        this.rootGroup.visible = false;
        return;
      }
      let allExited = true;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        if (!a.group.visible) continue;
        // Seated diners & upper-floor workers clear cleanly on close
        if (a.seated || a.group.position.y > 1.5) {
          a.group.visible = false;
          continue;
        }
        a.glbHandle.setAnimState('Walk', 1.15);
        const done = advanceNpcExitPath(
          a.group,
          a.exitPath,
          a.exitWp,
          a.speed * 1.15,
          dt,
          { legL: a.leftLeg, legR: a.rightLeg, armL: a.leftArm, armR: a.rightArm },
          { phase: a.walkPhase }
        );
        a.walkPhase += dt * 7.2;
        if (done) {
          a.group.visible = false;
        } else {
          allExited = false;
        }
      }
      if (allExited) {
        this.fullyCleared = true;
        this.rootGroup.visible = false;
      }
      return;
    }

    this.rootGroup.visible = true;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.group.visible = true;
      a.phase += dt * 2.4;

      if (a.waypoints.length <= 1) {
        a.glbHandle.setAnimState(a.seated ? 'Sit' : 'Idle');
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        if (a.seated) {
          const dip = Math.max(0, Math.sin(a.phase * 0.9));
          a.rightArm.rotation.x = -0.52 - dip * 0.65;
          a.leftArm.rotation.x = -0.38 - Math.sin(a.phase * 0.5 + 1.0) * 0.18;
          a.head.rotation.y = Math.sin(a.phase * 0.45) * 0.18;
        } else if (a.role === 'hostess') {
          a.hips.position.y = Math.sin(a.phase) * 0.008;
          a.rightArm.rotation.x = -0.35 - Math.max(0, Math.sin(a.phase * 0.7)) * 0.65;
          a.head.rotation.y = Math.sin(a.phase * 0.5) * 0.24;
        } else {
          a.hips.position.y = Math.sin(a.phase * 1.4) * 0.01;
          a.rightArm.rotation.x = -0.55 + Math.sin(a.phase * 3.0) * 0.28;
          a.leftArm.rotation.x = -0.45 + Math.cos(a.phase * 2.2) * 0.14;
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

        const walkCycle = a.phase * (1.8 + a.speed * 0.7);
        const swing = Math.sin(walkCycle) * 0.42;
        a.leftArm.rotation.x = swing;
        a.rightArm.rotation.x = a.role === 'waiter' ? -0.92 : -swing;
        a.leftLeg.rotation.x = -swing * 1.1;
        a.rightLeg.rotation.x = swing * 1.1;
        a.hips.position.y = Math.abs(Math.sin(walkCycle)) * 0.028;
      }
    }
  }
}
