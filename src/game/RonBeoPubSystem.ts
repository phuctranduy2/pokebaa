import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { ADULT_NPC_MODELS, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isRonBeoOpenAtHour,
  RollingShutterHandle,
  setShutterProgress,
} from './VenueOperatingHours';

export const RON_BEO_FLOOR2_Y = 4.50;

export function computeRonBeoCheerVolume(px: number, pz: number, isOpen: boolean): number {
  if (!isOpen) return 0;
  // Active dining zone (Patio + Floor 1 + Floor 2 Balcony): X = 207.0..235.8, Z = -12.0..15.6
  const dx = px < 207.0 ? 207.0 - px : px > 235.8 ? px - 235.8 : 0;
  const dz = pz < -12.0 ? -12.0 - pz : pz > 15.6 ? pz - 15.6 : 0;
  const dist = Math.hypot(dx, dz);
  if (dist <= 0.01) return 1.0;
  const maxHearDist = 11.5;
  if (dist > maxHearDist) return 0;
  const t = 1 - dist / maxHearDist;
  return Number((0.16 + 0.84 * t * t).toFixed(3));
}

export interface RonBeoPubBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: RonBeoPubNpcController | null,
    playerPos?: { x: number; z: number } | null,
    onPlayCheer?: (volumeScale: number) => void
  ) => void;
  getClosedFactor: () => number;
}

// =========================================================================
// COLLIDERS: QUÁN NHẬU 2 TẦNG RON BÉO (X = 207.0 .. 236.0, Z = -12.0 .. +15.6)
// Floor 1 & Floor 2 strictly scoped; central aisles, entrances, balcony
// portals & SE staircase (X = 231.6..234.8, Z = 6.2..11.6) remain wide open!
// =========================================================================
export const RON_BEO_COLLIDERS: IntersectionColliderBox[] = [
  // Patio perimeter planter hedges (South open between X = 211.0 .. 223.0 for Boulevard entry!)
  { minX: 207.0, maxX: 236.0, minZ: -12.0, maxZ: -11.0, floor: 1 }, // North rear boundary wall/planter
  { minX: 207.0, maxX: 211.0, minZ: 14.4, maxZ: 15.4, floor: 1 }, // SW Patio corner planter
  { minX: 223.0, maxX: 236.0, minZ: 14.4, maxZ: 15.4, floor: 1 }, // SE Sidewalk planter
  // Outdoor Charcoal BBQ Grill Station (North-West Patio)
  { minX: 211.2, maxX: 214.0, minZ: -11.0, maxZ: -6.8, floor: 1 },
  // Two Illuminated Welcome Menu Standees (flanking West & South entrances)
  { minX: 213.15, maxX: 213.55, minZ: -2.15, maxZ: -0.95, floor: 1 },
  { minX: 221.65, maxX: 222.85, minZ: 13.15, maxZ: 13.55, floor: 1 },
  // 4 Outdoor Beer-Garden Table Sets (Patio central aisle Z = -1.2 .. +4.8 open!)
  ...[
    [209.8, -6.8],
    [209.8, -3.2],
    [209.8, 6.4],
    [209.8, 10.4],
  ].map(([tx, tz]) => ({
    minX: tx - 1.25,
    maxX: tx + 1.25,
    minZ: tz - 1.05,
    maxZ: tz + 1.05,
    floor: 1,
  })),

  // Floor 1 Building Exterior Walls (leaving 3 wide open entrances!)
  { minX: 213.9, maxX: 214.5, minZ: -11.2, maxZ: -0.8, floor: 1 }, // West wall North segment
  { minX: 213.9, maxX: 214.5, minZ: 4.8, maxZ: 6.4, floor: 1 }, // West pillar between bays
  { minX: 213.9, maxX: 214.5, minZ: 10.8, maxZ: 12.8, floor: 1 }, // West SW corner column
  { minX: 214.2, maxX: 216.8, minZ: 12.3, maxZ: 12.9, floor: 1 }, // South wall West segment
  { minX: 221.4, maxX: 235.8, minZ: 12.3, maxZ: 12.9, floor: 1 }, // South wall East segment
  { minX: 235.3, maxX: 235.9, minZ: -11.4, maxZ: 12.8, floor: 1 }, // East rear wall

  // Floor 1 Interior Stations & Furniture
  { minX: 214.6, maxX: 221.6, minZ: -10.9, maxZ: -8.0, floor: 1 }, // Draught Beer Bar & Chillers
  { minX: 230.9, maxX: 235.3, minZ: -10.8, maxZ: 4.0, floor: 1 }, // Open Show Kitchen + Live Seafood Tanks
  // 6 Floor 1 Indoor Nhậu Table Sets
  ...[
    [218.5, -4.5],
    [218.5, 1.8],
    [218.5, 8.2],
    [225.5, -4.5],
    [225.5, 1.8],
    [225.5, 8.2],
  ].map(([tx, tz]) => ({
    minX: tx - 1.35,
    maxX: tx + 1.35,
    minZ: tz - 1.15,
    maxZ: tz + 1.15,
    floor: 1,
  })),
  // Staircase West safety wall below stairs so players enter only from South foot (Z = 11.6)
  { minX: 231.3, maxX: 231.7, minZ: 6.0, maxZ: 11.6, floor: 1 },

  // Floor 2 Wrap-Around Balcony Safety Railings (X = 211.2 .. 235.6, Z = -11.2 .. +15.2)
  { minX: 211.0, maxX: 211.4, minZ: -11.2, maxZ: 15.3, floor: 2 }, // West balcony outer railing
  { minX: 211.0, maxX: 235.8, minZ: 15.0, maxZ: 15.4, floor: 2 }, // South balcony outer railing
  { minX: 211.0, maxX: 235.8, minZ: -11.4, maxZ: -10.9, floor: 2 }, // Floor 2 North back wall
  { minX: 235.3, maxX: 235.9, minZ: -11.4, maxZ: 15.3, floor: 2 }, // Floor 2 East wall
  // Floor 2 Front Facade Wall segments framing open West & South Balcony Portals
  { minX: 213.9, maxX: 214.5, minZ: -11.2, maxZ: -3.0, floor: 2 }, // West facade N of balcony portal
  { minX: 213.9, maxX: 214.5, minZ: 8.5, maxZ: 12.8, floor: 2 }, // West facade S of balcony portal
  { minX: 214.2, maxX: 217.0, minZ: 12.3, maxZ: 12.9, floor: 2 }, // South facade W of balcony portal
  { minX: 225.5, maxX: 235.6, minZ: 12.3, maxZ: 12.9, floor: 2 }, // South facade E of balcony portal
  // Floor 2 Stairwell Opening Safety Balustrade (open ONLY at North landing Z <= 6.2)
  { minX: 231.3, maxX: 231.7, minZ: 6.0, maxZ: 12.3, floor: 2 },
  { minX: 231.3, maxX: 235.4, minZ: 11.9, maxZ: 12.3, floor: 2 },
  // Floor 2 VIP Partition Screen between VIP 1 & VIP 2
  { minX: 224.4, maxX: 224.9, minZ: -10.9, maxZ: -5.2, floor: 2 },
  // VIP 1 & VIP 2 Round Banquet Tables
  { minX: 218.2, maxX: 220.8, minZ: -9.4, maxZ: -6.8, floor: 2 },
  { minX: 228.5, maxX: 231.1, minZ: -9.4, maxZ: -6.8, floor: 2 },
  // Floor 2 Service Bar
  { minX: 229.0, maxX: 230.6, minZ: -3.2, maxZ: 2.6, floor: 2 },
  // Floor 2 Lounge & Balcony Nhậu Tables
  ...[
    [218.8, 0.5],
    [225.8, 0.5],
    [222.5, 7.5],
    [212.7, -5.5],
    [212.7, 5.5],
    [222.5, 13.9],
  ].map(([tx, tz]) => ({
    minX: tx - 1.15,
    maxX: tx + 1.15,
    minZ: tz - 1.05,
    maxZ: tz + 1.05,
    floor: 2,
  })),
];

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startPx: number,
  minPx: number,
  weight = '900'
) {
  let fontSize = startPx;
  while (fontSize > minPx) {
    ctx.font = `${weight} ${fontSize}px system-ui, -apple-system, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }
  ctx.font = `${weight} ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(text, x, y, maxWidth);
}

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

function drawBeerCrest(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  // Outer golden glow ring
  const ringGrad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.15);
  ringGrad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
  ringGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Dark brushed disc
  ctx.fillStyle = '#180c0d';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = Math.max(3, radius * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  // Stylized Beer Pint & Foam
  const bw = radius * 0.56;
  const bh = radius * 0.72;
  const bx = cx - bw * 0.52;
  const by = cy - bh * 0.38;

  // Handle
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = Math.max(4, radius * 0.09);
  roundRectPath(ctx, bx + bw - 2, by + bh * 0.22, bw * 0.36, bh * 0.46, radius * 0.14);
  ctx.stroke();

  // Glass body gradient
  const beerGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
  beerGrad.addColorStop(0, '#fcd34d');
  beerGrad.addColorStop(0.45, '#f59e0b');
  beerGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = beerGrad;
  roundRectPath(ctx, bx, by + bh * 0.16, bw, bh * 0.84, radius * 0.1);
  ctx.fill();

  // Crisp highlight streak
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(bx + bw * 0.18, by + bh * 0.26, bw * 0.16, bh * 0.62);

  // Fluffy beer foam head
  ctx.fillStyle = '#fffbeb';
  const puffs = [
    [bx + bw * 0.2, by + bh * 0.12, radius * 0.17],
    [bx + bw * 0.5, by + bh * 0.06, radius * 0.2],
    [bx + bw * 0.82, by + bh * 0.13, radius * 0.16],
  ];
  puffs.forEach(([px, py, pr]) => {
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function createPubBillboardTex(
  eyebrow: string,
  headline: string,
  tags: string[],
  hoursTop: string,
  hoursBottom: string
): THREE.CanvasTexture {
  // 1792 x 256 = exact 7:1 ratio matching 18.2 x 2.6 and 19.6 x 2.8 billboards (zero stretching!)
  const c = document.createElement('canvas');
  c.width = 1792;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Rich smoked-crimson & espresso obsidian backdrop
  const bg = ctx.createLinearGradient(0, 0, c.width, c.height);
  bg.addColorStop(0, '#16090b');
  bg.addColorStop(0.28, '#3b0d11');
  bg.addColorStop(0.5, '#4c1115');
  bg.addColorStop(0.72, '#3b0d11');
  bg.addColorStop(1, '#16090b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);

  // Warm radial spotlight wash in center
  const spot = ctx.createRadialGradient(c.width * 0.48, c.height * 0.45, 20, c.width * 0.48, c.height * 0.45, 620);
  spot.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
  spot.addColorStop(0.55, 'rgba(234, 88, 12, 0.08)');
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, c.width, c.height);

  // Subtle architectural diagonal sheen lines
  ctx.save();
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.06)';
  ctx.lineWidth = 22;
  for (let lx = -200; lx < c.width + 200; lx += 140) {
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx + 180, c.height);
    ctx.stroke();
  }
  ctx.restore();

  // Outer champagne-gold bevel border + glowing inner neon pinstripe
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 10;
  roundRectPath(ctx, 8, 8, c.width - 16, c.height - 16, 18);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 3;
  roundRectPath(ctx, 20, 20, c.width - 40, c.height - 40, 12);
  ctx.stroke();
  ctx.restore();

  // Left Stylized Beer Crest
  drawBeerCrest(ctx, 136, 128, 76);

  // Right Hours Seal Pill
  const sealX = c.width - 332;
  const sealY = 44;
  const sealW = 286;
  const sealH = 168;
  const sealBg = ctx.createLinearGradient(sealX, sealY, sealX, sealY + sealH);
  sealBg.addColorStop(0, '#064e3b');
  sealBg.addColorStop(1, '#022c22');
  ctx.fillStyle = sealBg;
  roundRectPath(ctx, sealX, sealY, sealW, sealH, 20);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 3.5;
  roundRectPath(ctx, sealX, sealY, sealW, sealH, 20);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '800 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('MỞ CỬA ĐÊM', sealX + sealW * 0.5, sealY + 38);

  ctx.fillStyle = '#fef08a';
  ctx.font = '900 44px system-ui, -apple-system, sans-serif';
  ctx.fillText(hoursTop, sealX + sealW * 0.5, sealY + 88);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(hoursBottom, sealX + sealW * 0.5, sealY + 136);

  // Center Typographic Composition
  const centerX = (228 + (sealX - 24)) * 0.5;
  const centerMaxW = sealX - 260;

  // Eyebrow ribbon
  ctx.fillStyle = '#fde68a';
  fitText(ctx, eyebrow, centerX, 46, centerMaxW, 22, 16, '800');

  // Monumental Glowing Gold Headline
  ctx.save();
  ctx.shadowColor = 'rgba(251, 146, 60, 0.85)';
  ctx.shadowBlur = 18;
  const titleGrad = ctx.createLinearGradient(0, 68, 0, 148);
  titleGrad.addColorStop(0, '#fffbeb');
  titleGrad.addColorStop(0.55, '#fde047');
  titleGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = titleGrad;
  fitText(ctx, headline, centerX, 112, centerMaxW, 78, 42, '900');
  ctx.restore();

  // Feature Pill Tags Row
  ctx.font = '800 21px system-ui, -apple-system, sans-serif';
  const pillPadX = 22;
  const pillGap = 16;
  const tagWidths = tags.map((t) => ctx.measureText(t).width + pillPadX * 2);
  const totalTagsW = tagWidths.reduce((a, b) => a + b, 0) + pillGap * (tags.length - 1);
  let tx = centerX - totalTagsW * 0.5;
  tags.forEach((tag, i) => {
    const tw = tagWidths[i];
    ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
    roundRectPath(ctx, tx, 174, tw, 44, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, tx, 174, tw, 44, 22);
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.fillText(tag, tx + tw * 0.5, 196);
    tx += tw + pillGap;
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGroundFasciaTex(): THREE.CanvasTexture {
  // 1536 x 192 = exact 8:1 ratio matching 8.8m x 1.1m Ground Floor Lightbox Fascia
  const c = document.createElement('canvas');
  c.width = 1536;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, c.width, 0);
  bg.addColorStop(0, '#140b0e');
  bg.addColorStop(0.5, '#2d1115');
  bg.addColorStop(1, '#140b0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  roundRectPath(ctx, 6, 6, c.width - 12, c.height - 12, 16);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, 16, 16, c.width - 32, c.height - 32, 10);
  ctx.stroke();
  ctx.restore();

  drawBeerCrest(ctx, 108, 96, 56);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = 'rgba(251, 191, 36, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fef08a';
  fitText(ctx, 'QUÁN NHẬU RON BÉO  •  TẦNG 1 & TẦNG 2', 745, 72, 1020, 50, 30, '900');
  ctx.restore();

  ctx.fillStyle = '#fed7aa';
  fitText(ctx, 'SÂN VƯỜN BIA TƯƠI  •  HẢI SẢN SỐNG  •  BẾP NƯỚNG THAN HOA  •  BAN CÔNG VIP', 745, 136, 1040, 24, 16, '700');

  // Right Open Badge
  const bx = c.width - 252;
  ctx.fillStyle = '#065f46';
  roundRectPath(ctx, bx, 38, 214, 116, 16);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 3;
  roundRectPath(ctx, bx, 38, 214, 116, 16);
  ctx.stroke();

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.fillText('MỞ CỬA HÀNG NGÀY', bx + 107, 68);
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText('15:00 – 04:00', bx + 107, 118);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPubBladeTex(): THREE.CanvasTexture {
  // 384 x 1024 = exact 3:8 ratio matching 0.90m x 2.40m corner blade sign
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 1024;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#3b0d11');
  grad.addColorStop(0.5, '#180c0d');
  grad.addColorStop(1, '#3b0d11');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 384, 1024);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 10;
  roundRectPath(ctx, 8, 8, 368, 1008, 22);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3;
  roundRectPath(ctx, 20, 20, 344, 984, 16);
  ctx.stroke();
  ctx.restore();

  drawBeerCrest(ctx, 192, 128, 66);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Hours pill
  ctx.fillStyle = '#065f46';
  roundRectPath(ctx, 42, 226, 300, 74, 18);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 3;
  roundRectPath(ctx, 42, 226, 300, 74, 18);
  ctx.stroke();
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 36px system-ui, sans-serif';
  ctx.fillText('15:00 – 04:00', 192, 263);

  ctx.fillStyle = '#fed7aa';
  fitText(ctx, 'QUÁN NHẬU 2 TẦNG', 192, 355, 310, 30, 20, '800');

  ctx.save();
  ctx.shadowColor = 'rgba(251, 146, 60, 0.85)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fde047';
  fitText(ctx, 'RON', 192, 465, 300, 108, 64, '900');
  fitText(ctx, 'BÉO', 192, 575, 300, 108, 64, '900');
  ctx.restore();

  // Bottom specialty tags
  const items = [
    ['BIA TƯƠI -2°C', '#f59e0b'],
    ['HẢI SẢN TẠI BỂ', '#38bdf8'],
    ['LẨU • NƯỚNG THAN', '#fb7185'],
    ['PHÒNG VIP TẦNG 2', '#4ade80'],
  ];
  items.forEach(([label, col], idx) => {
    const y = 684 + idx * 76;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRectPath(ctx, 36, y - 26, 312, 52, 14);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, 36, y - 26, 312, 52, 14);
    ctx.stroke();
    ctx.fillStyle = '#fffbeb';
    fitText(ctx, label, 192, y, 286, 24, 16, '800');
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createMenuStandeeTex(): THREE.CanvasTexture {
  // 512 x 896 = exact 4:7 ratio matching 0.96m x 1.68m Standing Welcome Menu Board
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 896;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 896);
  bg.addColorStop(0, '#2a0b10');
  bg.addColorStop(0.55, '#140c0d');
  bg.addColorStop(1, '#1e100d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 896);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 10;
  roundRectPath(ctx, 8, 8, 496, 880, 24);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Header
  ctx.fillStyle = '#fed7aa';
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('★ KÍNH CHÀO QUÝ KHÁCH ★', 256, 52);
  ctx.fillStyle = '#fde047';
  fitText(ctx, 'QUÁN NHẬU RON BÉO', 256, 102, 440, 44, 28, '900');

  ctx.fillStyle = '#065f46';
  roundRectPath(ctx, 96, 140, 320, 44, 22);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, 96, 140, 320, 44, 22);
  ctx.stroke();
  ctx.fillStyle = '#ecfdf5';
  ctx.font = '900 22px system-ui, sans-serif';
  ctx.fillText('MỞ CỬA: 15:00 – 04:00 SÁNG', 256, 162);

  // Menu showcase cards
  const specials = [
    ['THÁP BIA TƯƠI 3L', 'Bảo quản lạnh sâu -2°C', '149K', '#f59e0b'],
    ['BÒ NƯỚNG TẢNG', 'Than hoa thơm lừng tại bàn', '189K', '#fb7185'],
    ['LẨU THÁI HẢI SẢN', 'Tôm hùm, cua, nghêu tươi sống', '279K', '#38bdf8'],
    ['SƯỜN NON NƯỚNG MẬT', 'Sốt đặc biệt Quán Ron Béo', '169K', '#fb923c'],
    ['TẦNG 2 • VIP & BAN CÔNG', 'Xem bóng đá LED • Karaoke riêng', 'FREE', '#4ade80'],
  ];

  specials.forEach(([name, desc, price, accent], idx) => {
    const cy = 224 + idx * 120;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRectPath(ctx, 28, cy, 456, 98, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, 28, cy, 456, 98, 16);
    ctx.stroke();

    // Left accent strip
    ctx.fillStyle = accent;
    roundRectPath(ctx, 28, cy, 10, 98, 5);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fef08a';
    fitText(ctx, name, 54, cy + 34, 300, 26, 18, '900');
    ctx.fillStyle = '#e7e5e4';
    fitText(ctx, desc, 54, cy + 68, 305, 19, 14, '600');

    // Price pill
    ctx.fillStyle = accent;
    roundRectPath(ctx, 376, cy + 25, 92, 48, 12);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#18181b';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText(price, 422, cy + 49);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText('1 2 3 DÔ! • LỐI VÀO TẦNG 1 & CẦU THANG TẦNG 2', 256, 854);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createOpenStatusSignTex(isOpen: boolean): THREE.CanvasTexture {
  // 640 x 320 = exact 2:1 ratio matching 1.44m x 0.72m plaque
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 320;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 320);
  bg.addColorStop(0, isOpen ? '#052e16' : '#3b0a0a');
  bg.addColorStop(1, '#09090b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 640, 320);

  ctx.save();
  ctx.shadowColor = isOpen ? '#4ade80' : '#f87171';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = isOpen ? '#4ade80' : '#f87171';
  ctx.lineWidth = 10;
  roundRectPath(ctx, 12, 12, 616, 296, 26);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isOpen ? '#86efac' : '#fca5a5';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillText(isOpen ? '● ĐANG MỞ CỬA' : '● TẠM ĐÓNG CỬA', 320, 96);

  ctx.fillStyle = '#fde047';
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.fillText('15:00 – 04:00 SÁNG', 320, 178);

  ctx.fillStyle = '#f5f5f4';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(isOpen ? 'HÂN HẠNH PHỤC VỤ QUÝ KHÁCH!' : 'HẸN GẶP LẠI LÚC 3H CHIỀU', 320, 248);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createNeonQuoteTex(line1: string, line2: string, borderHex = '#f59e0b'): THREE.CanvasTexture {
  // 1280 x 256 = exact 5:1 ratio matching interior signage panels
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, c.width, 0);
  bg.addColorStop(0, '#140c0d');
  bg.addColorStop(0.5, '#261214');
  bg.addColorStop(1, '#140c0d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1280, 256);

  ctx.save();
  ctx.shadowColor = borderHex;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 8;
  roundRectPath(ctx, 10, 10, 1260, 236, 22);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, 22, 22, 1236, 212, 14);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = 'rgba(253, 224, 71, 0.6)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fef08a';
  fitText(ctx, line1, 640, 96, 1140, 62, 32, '900');
  ctx.restore();

  ctx.fillStyle = '#fed7aa';
  fitText(ctx, line2, 640, 178, 1140, 34, 20, '700');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createFootballScreenTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const ctx = c.getContext('2d')!;
  // Pitch green
  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 0, 640, 360);
  // Mowed stripes
  ctx.fillStyle = '#16a34a';
  for (let x = 0; x < 640; x += 64) {
    if ((x / 64) % 2 === 0) ctx.fillRect(x, 0, 64, 360);
  }
  // Pitch lines
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 592, 312);
  ctx.beginPath();
  ctx.moveTo(320, 24);
  ctx.lineTo(320, 336);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(320, 180, 52, 0, Math.PI * 2);
  ctx.stroke();
  // Scoreboard top bar
  ctx.fillStyle = 'rgba(15,23,42,0.88)';
  ctx.fillRect(24, 24, 290, 46);
  ctx.fillStyle = '#fde047';
  ctx.font = '900 22px system-ui, sans-serif';
  ctx.fillText('LIVE  VIE  2 - 1  THA   78\'', 38, 54);
  // Players dots
  const drawDots = (pts: Array<[number, number]>, col: string) => {
    ctx.fillStyle = col;
    pts.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  drawDots(
    [
      [120, 180],
      [210, 110],
      [240, 240],
      [340, 165],
      [410, 210],
    ],
    '#ef4444'
  );
  drawDots(
    [
      [510, 180],
      [440, 120],
      [380, 255],
      [295, 195],
      [230, 150],
    ],
    '#38bdf8'
  );
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBrickTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#44403c';
  ctx.fillRect(0, 0, 512, 512);
  const shades = ['#7c2d12', '#9a3412', '#6b2714', '#8a3216'];
  const rows = 16;
  const cols = 8;
  const rh = 512 / rows;
  const cw = 512 / cols;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 === 0 ? 0 : cw * 0.5;
    for (let col = -1; col <= cols; col++) {
      ctx.fillStyle = shades[Math.abs(r * 5 + col * 11) % shades.length];
      ctx.fillRect(col * cw + off + 3, r * rh + 3, cw - 6, rh - 6);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

function createPubFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d6d3d1';
  ctx.fillRect(0, 0, 512, 512);
  const grid = 4;
  const step = 512 / grid;
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const x = gx * step;
      const y = gy * step;
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#b45309' : '#78350f';
      ctx.fillRect(x + 4, y + 4, step - 8, step - 8);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(x + 28, y + 28, step - 56, step - 56);
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#92400e' : '#b45309';
      ctx.fillRect(x + 48, y + 48, step - 96, step - 96);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = 4;
  return tex;
}

function createPubGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(253, 224, 71, 0.42)');
  grad.addColorStop(0.5, 'rgba(251, 146, 60, 0.16)');
  grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRonBeoPubStructure(): RonBeoPubBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Materials (calibrated warm interior/exterior bounce so upper/lower halls shine cleanly day & night)
  const patioStoneMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.82 });
  const floorTileTex = createPubFloorTexture();
  const floorTileMat = new THREE.MeshStandardMaterial({
    map: floorTileTex,
    emissive: 0x451a03,
    emissiveIntensity: 0.16,
    roughness: 0.5,
  });
  const woodFloorMat = new THREE.MeshStandardMaterial({
    color: 0x9a5b32,
    emissive: 0x451a03,
    emissiveIntensity: 0.18,
    roughness: 0.58,
  });
  const brickTex = createBrickTexture();
  const brickMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    emissive: 0x431407,
    emissiveIntensity: 0.18,
    roughness: 0.8,
  });
  const warmWallMat = new THREE.MeshStandardMaterial({
    color: 0xfff8eb,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.34,
    roughness: 0.65,
  });
  const ceilGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde68a,
    emissiveIntensity: 0.42,
    roughness: 0.5,
  });
  const walnutMat = new THREE.MeshStandardMaterial({ color: 0x5c260a, roughness: 0.55 });
  const oakTableMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 });
  const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.36, metalness: 0.72 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.88 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.24,
  });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.88 });
  const stoolGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.52 });
  const redCushionMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.62 });
  const roofSlateMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.72 });
  const beerAmberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const hotpotSteelMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.28, metalness: 0.82 });
  const brothOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xc2410c,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });

  // Emissive lights controlled by Ron Béo operating hours (15:00 - 04:00) + architectural night glow
  const warmBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });
  const redLanternMat = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xef4444,
    emissiveIntensity: 1.75,
    roughness: 0.25,
  });
  const ceilLedMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 1.7,
    roughness: 0.18,
  });
  const ledRibbonMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });
  const seafoodTankMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.4,
    roughness: 0.15,
    transparent: true,
    opacity: 0.72,
  });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.6,
    roughness: 0.5,
  });
  const signDynamicMats: THREE.MeshStandardMaterial[] = [];
  const menuDynamicMats: THREE.MeshStandardMaterial[] = [];

  const poolTex = createPubGlowPoolTex();
  const warmPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(warmPoolMat);

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material,
    noMerge = false
  ) => {
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    const d = Math.abs(z1 - z0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    if (noMerge) mesh.userData.noMerge = true;
    staticGroup.add(mesh);
    return mesh;
  };

  // =========================================================================
  // 1. OUTDOOR BEER GARDEN PATIO & SLABS (X = 207.0 .. 236.2, Z = -12.0 .. +15.58)
  // =========================================================================
  addBox(207.0, 214.2, -0.25, 0.0, -12.0, 15.58, patioStoneMat);
  addBox(214.2, 236.2, -0.25, 0.01, -11.4, 15.58, floorTileMat);

  // North & South Planter Borders
  addBox(207.2, 235.8, 0.0, 0.42, -11.9, -11.3, brickMat);
  addBox(207.3, 235.7, 0.42, 0.85, -11.82, -11.38, hedgeMat);
  addBox(207.2, 211.0, 0.0, 0.42, 14.5, 15.2, brickMat);
  addBox(207.3, 210.9, 0.42, 0.85, 14.58, 15.12, hedgeMat);
  addBox(223.0, 235.6, 0.0, 0.42, 14.5, 15.2, brickMat);
  addBox(223.1, 235.5, 0.42, 0.85, 14.58, 15.12, hedgeMat);

  // Patio Glow Pools (fronting Phố Đi Bộ & South entrance)
  [
    [210.2, -4.8],
    [210.2, 2.0],
    [210.2, 8.8],
    [219.0, 13.8],
  ].forEach(([px, pz]) => {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 8.6), warmPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(px, 0.025, pz);
    staticGroup.add(pool);
  });

  // Outdoor Charcoal BBQ Grill Station (X = 211.4 .. 213.8, Z = -10.8 .. -7.0)
  addBox(211.4, 213.8, 0.0, 0.92, -10.8, -7.0, brickMat);
  addBox(211.35, 213.85, 0.92, 1.0, -10.85, -6.95, chromeMat);
  addBox(211.6, 212.9, 1.0, 1.12, -10.4, -7.4, emberMat); // Glowing charcoal bed
  // Skewers over grill
  for (let s = 0; s < 8; s++) {
    addBox(211.7, 212.8, 1.14, 1.18, -10.2 + s * 0.36, -10.12 + s * 0.36, oakTableMat);
  }
  // BBQ Exhaust Hood overhead
  addBox(211.3, 213.9, 2.55, 3.05, -10.8, -7.0, darkIronMat);
  addBox(212.3, 213.1, 3.05, 4.35, -9.3, -8.5, chromeMat);

  // =========================================================================
  // 2. REUSABLE NHẬU TABLE BUILDER (BEER TOWER, HOT POT, ICE BUCKET, MUGS, STOOLS)
  // =========================================================================
  const addNhauTable = (cx: number, cz: number, yBase: number, hasHotPot: boolean, withTableLamp = true) => {
    // Oak table top & iron frame
    addBox(cx - 0.88, cx + 0.88, yBase + 0.68, yBase + 0.76, cz - 0.56, cz + 0.56, oakTableMat);
    [
      [cx - 0.76, cz - 0.44],
      [cx + 0.76, cz - 0.44],
      [cx - 0.76, cz + 0.44],
      [cx + 0.76, cz + 0.44],
    ].forEach(([lx, lz]) => {
      addBox(lx - 0.04, lx + 0.04, yBase, yBase + 0.68, lz - 0.04, lz + 0.04, darkIronMat);
    });

    // 4 Green Plastic/Wood Stools flanking North & South sides
    [
      [cx - 0.45, cz - 0.85],
      [cx + 0.45, cz - 0.85],
      [cx - 0.45, cz + 0.85],
      [cx + 0.45, cz + 0.85],
    ].forEach(([sx, sz]) => {
      addBox(sx - 0.2, sx + 0.2, yBase + 0.38, yBase + 0.44, sz - 0.2, sz + 0.2, stoolGreenMat);
      addBox(sx - 0.14, sx + 0.14, yBase, yBase + 0.38, sz - 0.14, sz + 0.14, darkIronMat);
    });

    // Tabletop 3L Illuminated Draught Beer Tower
    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 12), darkIronMat);
    towerBase.position.set(cx + 0.45, yBase + 0.82, cz);
    staticGroup.add(towerBase);
    const towerTube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.44, 12), beerAmberMat);
    towerTube.position.set(cx + 0.45, yBase + 1.08, cz);
    staticGroup.add(towerTube);
    const towerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), brassMat);
    towerCap.position.set(cx + 0.45, yBase + 1.32, cz);
    staticGroup.add(towerCap);

    // Chilled Hot Pot Cauldron OR BBQ Grill Plate at center
    if (hasHotPot) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.16, 14), hotpotSteelMat);
      pot.position.set(cx - 0.08, yBase + 0.84, cz);
      staticGroup.add(pot);
      const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 14), brothOrangeMat);
      broth.position.set(cx - 0.08, yBase + 0.92, cz);
      staticGroup.add(broth);
    } else {
      addBox(cx - 0.34, cx + 0.16, yBase + 0.76, yBase + 0.81, cz - 0.24, cz + 0.24, chromeMat);
      addBox(cx - 0.26, cx + 0.08, yBase + 0.81, yBase + 0.85, cz - 0.16, cz + 0.16, emberMat);
    }

    // 4 Frothy Beer Mugs
    [
      [cx - 0.56, cz - 0.32],
      [cx - 0.56, cz + 0.32],
      [cx + 0.15, cz - 0.34],
      [cx + 0.15, cz + 0.34],
    ].forEach(([mx, mz]) => {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.15, 10), beerAmberMat);
      mug.position.set(mx, yBase + 0.835, mz);
      staticGroup.add(mug);
      const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.03, 10), foamMat);
      foam.position.set(mx, yBase + 0.92, mz);
      staticGroup.add(foam);
    });

    if (withTableLamp) {
      const tLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 10), warmBulbMat);
      tLamp.position.set(cx + 0.68, yBase + 0.85, cz - 0.34);
      staticGroup.add(tLamp);
    }
  };

  // Place 4 Outdoor Patio Beer-Garden Tables
  [
    [209.8, -6.8, false],
    [209.8, -3.2, true],
    [209.8, 6.4, false],
    [209.8, 10.4, true],
  ].forEach(([tx, tz, pot]) => addNhauTable(tx as number, tz as number, 0.0, pot as boolean, true));

  // Patio String-Light Posts aligned to architectural bays (NEVER blocking doors or fascia!)
  const patioPostXs = [207.6, 214.0];
  const festoonZs = [-10.6, -5.2, 5.6, 11.4, 14.3];
  festoonZs.forEach((fz) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.35, 8), darkIronMat);
    post.position.set(patioPostXs[0], 2.17, fz);
    staticGroup.add(post);

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6.4, 6), darkIronMat);
    cable.rotation.z = Math.PI / 2;
    cable.position.set(210.8, 4.18, fz);
    staticGroup.add(cable);

    for (let k = 0; k < 5; k++) {
      const bx = 208.2 + k * 1.28;
      const sag = Math.sin((k / 4) * Math.PI) * 0.20;
      const isRed = k % 2 === 1;
      const bulb = new THREE.Mesh(
        isRed ? new THREE.SphereGeometry(0.16, 10, 8) : new THREE.SphereGeometry(0.11, 8, 8),
        isRed ? redLanternMat : warmBulbMat
      );
      bulb.position.set(bx, 4.06 - sag, fz);
      staticGroup.add(bulb);
    }
  });

  // =========================================================================
  // 3. GROUND FLOOR BUILDING SHELL, ENTRANCES & ROLLING SHUTTERS
  // =========================================================================
  // Structural Columns & Open Wall Bays (Floor 1: Y = 0 .. 4.35)
  const f1TopY = 4.35;
  // West Facade (facing Phố Đi Bộ, X = 214.2): Main Bay Z=-0.8..4.8, Secondary Bay Z=6.4..10.8
  addBox(214.0, 214.4, 0, 1.05, -11.2, -0.8, brickMat);
  addBox(214.05, 214.35, 1.05, 3.35, -11.0, -1.0, glassMat);
  addBox(214.0, 214.4, 3.35, f1TopY, -11.2, 12.6, warmWallMat);
  addBox(213.95, 214.45, 0, f1TopY, 4.8, 6.4, brickMat);
  addBox(213.95, 214.45, 0, f1TopY, 10.8, 12.6, brickMat);

  // South Facade (facing Đại lộ Đông, Z = 12.6): South Entrance X = 216.8..221.4
  addBox(214.2, 216.8, 0, 1.05, 12.4, 12.8, brickMat);
  addBox(214.3, 216.7, 1.05, 3.35, 12.45, 12.75, glassMat);
  addBox(221.4, 235.6, 0, 1.05, 12.4, 12.8, brickMat);
  addBox(221.6, 235.4, 1.05, 3.35, 12.45, 12.75, glassMat);
  addBox(214.2, 235.6, 3.35, f1TopY, 12.4, 12.8, warmWallMat);

  // North & East Exterior Walls
  addBox(214.2, 235.6, 0, f1TopY, -11.3, -10.9, brickMat);
  addBox(235.3, 235.7, 0, f1TopY, -11.3, 12.8, brickMat);

  // Floor 2 Structural Slab with Warm Illuminated Floor 1 Soffit Ceiling & Stairwell Cutout
  addBox(211.2, 231.5, 4.30, RON_BEO_FLOOR2_Y, -11.2, 15.2, woodFloorMat);
  addBox(211.25, 231.45, 4.26, 4.30, -11.15, 15.15, ceilGlowMat);
  addBox(231.5, 235.6, 4.30, RON_BEO_FLOOR2_Y, -11.2, 5.8, woodFloorMat);
  addBox(231.5, 235.5, 4.26, 4.30, -11.15, 5.75, ceilGlowMat);
  addBox(231.5, 235.6, 4.30, RON_BEO_FLOOR2_Y, 12.2, 15.2, woodFloorMat);
  addBox(231.5, 235.5, 4.26, 4.30, 12.25, 15.15, ceilGlowMat);

  // Architectural Under-Slab Perimeter LED Cove Strips (Floor 1 Patio & South Arcade)
  addBox(211.18, 211.32, 4.22, 4.30, -11.2, 15.2, ledRibbonMat);
  addBox(211.18, 235.6, 4.22, 4.30, 15.12, 15.26, ledRibbonMat);
  addBox(213.94, 214.04, 3.32, 3.38, -11.2, 12.6, ledRibbonMat);
  addBox(214.2, 235.6, 3.32, 3.38, 12.74, 12.84, ledRibbonMat);

  // 3 Motorized Steel Rolling Shutters (Closed 04:00 - 15:00, Open 15:00 - 04:00)
  const shutterTex = createRollingShutterTexture({
    title: 'QUÁN NHẬU RON BÉO',
    hoursLabel: 'MỞ CỬA: 15:00 – 04:00 (3H CHIỀU ĐẾN 4H SÁNG)',
    accentHex: '#b91c1c',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.45, metalness: 0.55 });
  const shutterHandles: RollingShutterHandle[] = [
    createRollingShutterDoor(
      staticGroup,
      { id: 'ronbeo_west_main', axis: 'z', pos: 214.2, spanCenter: 2.0, width: 5.55, baseY: 0, topY: 3.35 },
      shutterMat,
      darkIronMat
    ),
    createRollingShutterDoor(
      staticGroup,
      { id: 'ronbeo_west_sec', axis: 'z', pos: 214.2, spanCenter: 8.6, width: 4.35, baseY: 0, topY: 3.35 },
      shutterMat,
      darkIronMat
    ),
    createRollingShutterDoor(
      staticGroup,
      { id: 'ronbeo_south', axis: 'x', pos: 12.6, spanCenter: 219.1, width: 4.55, baseY: 0, topY: 3.35 },
      shutterMat,
      darkIronMat
    ),
  ];

  // =========================================================================
  // 4. FLOOR 1 INTERIOR: DRAUGHT BEER BAR, LIVE SEAFOOD TANKS, KITCHEN & TABLES
  // =========================================================================
  // Draught Beer Bar & Refrigerated Beer Wall (X = 214.8 .. 221.6, Z = -10.8 .. -8.2)
  addBox(214.8, 221.4, 0, 1.08, -9.2, -8.3, walnutMat);
  addBox(214.75, 221.45, 1.08, 1.16, -9.25, -8.25, oakTableMat);
  // Brass 6-Tap Draught Beer Tower
  addBox(216.2, 218.2, 1.16, 1.82, -8.9, -8.6, brassMat);
  addBox(215.9, 218.5, 1.62, 1.86, -8.95, -8.55, beerAmberMat);
  // Illuminated Beer Chiller Fridges along North Bar Wall
  [216.0, 219.2].forEach((fx) => {
    addBox(fx - 1.1, fx + 1.1, 0, 2.45, -10.75, -10.05, darkIronMat);
    addBox(fx - 0.98, fx + 0.98, 0.25, 2.25, -10.08, -10.02, ceilLedMat);
    for (let r = 0; r < 3; r++) {
      for (let b = 0; b < 6; b++) {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8),
          b % 2 === 0 ? stoolGreenMat : beerAmberMat
        );
        bottle.position.set(fx - 0.72 + b * 0.28, 0.65 + r * 0.55, -9.96);
        staticGroup.add(bottle);
      }
    }
    addBox(fx - 1.0, fx + 1.0, 0.25, 2.25, -9.90, -9.86, glassMat);
  });
  // Bar Glowing Header (5.5m x 1.1m = 5:1 matching 1280x256)
  const barSignTex = createNeonQuoteTex('BIA TƯƠI RON BÉO', 'BẢO QUẢN LẠNH SÂU -2°C • TƯƠI MỖI NGÀY', '#fbbf24');
  const barSignMat = new THREE.MeshStandardMaterial({
    map: barSignTex,
    emissive: 0xffffff,
    emissiveMap: barSignTex,
    emissiveIntensity: 1.05,
  });
  signDynamicMats.push(barSignMat);
  addBox(215.25, 220.95, 2.48, 3.72, -10.90, -10.76, darkIronMat);
  const barSign = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.1), barSignMat);
  barSign.position.set(218.1, 3.1, -10.75);
  staticGroup.add(barSign);

  // Giant Live Football TV & Retro Neon Quote on North Wall (X = 225.2, Z = -10.85)
  const tvTex = createFootballScreenTex();
  const tvMat = new THREE.MeshStandardMaterial({
    map: tvTex,
    emissive: 0xffffff,
    emissiveMap: tvTex,
    emissiveIntensity: 0.95,
  });
  signDynamicMats.push(tvMat);
  addBox(222.8, 227.6, 1.45, 3.55, -10.88, -10.76, darkIronMat);
  const tv1 = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.9), tvMat);
  tv1.position.set(225.2, 2.5, -10.74);
  staticGroup.add(tv1);

  const mottoTex = createNeonQuoteTex('1 2 3 DÔ! • KHÔNG SAY KHÔNG VỀ', 'QUÁN NHẬU RON BÉO • CHIẾN HỮU HỘI NGỘ', '#fb923c');
  const mottoMat = new THREE.MeshStandardMaterial({
    map: mottoTex,
    emissive: 0xffffff,
    emissiveMap: mottoTex,
    emissiveIntensity: 1.05,
  });
  signDynamicMats.push(mottoMat);
  const mottoBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.9), mottoMat);
  mottoBoard.position.set(225.2, 3.86, -10.74);
  staticGroup.add(mottoBoard);

  // Open Kitchen Pass & 2-Tier Live Seafood Tanks (X = 231.0 .. 235.2, Z = -10.6 .. +3.8)
  addBox(231.0, 232.0, 0, 1.05, -10.6, -2.0, brickMat);
  addBox(230.95, 232.05, 1.05, 1.15, -10.65, -1.95, chromeMat);
  addBox(233.6, 235.2, 0, 1.02, -10.6, 3.8, chromeMat);
  addBox(233.2, 235.2, 2.65, 3.25, -10.6, 3.8, chromeMat); // Exhaust canopy hood
  const kitchenPassTex = createNeonQuoteTex('BẾP NƯỚNG & LẨU HẢI SẢN', 'HẢI SẢN TƯƠI TẠI BỂ • NƯỚNG THAN HOA', '#38bdf8');
  const kitchenPassMat = new THREE.MeshStandardMaterial({
    map: kitchenPassTex,
    emissive: 0xffffff,
    emissiveMap: kitchenPassTex,
    emissiveIntensity: 1.0,
  });
  signDynamicMats.push(kitchenPassMat);
  const kSign = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.1), kitchenPassMat);
  kSign.rotation.y = -Math.PI / 2;
  kSign.position.set(233.15, 2.95, -5.8);
  staticGroup.add(kSign);

  // Illuminated Cyan Live Seafood Aquariums (X = 231.1..232.3, Z = -1.6..+3.8)
  addBox(231.1, 232.3, 0, 0.85, -1.6, 3.8, darkIronMat);
  addBox(231.15, 232.25, 0.85, 2.25, -1.5, 3.7, seafoodTankMat);
  // Lobsters / Crabs silhouettes inside aquarium
  [0xf97316, 0xef4444, 0xf59e0b, 0x38bdf8].forEach((cHex, i) => {
    const sea = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 0.42),
      new THREE.MeshStandardMaterial({ color: cHex, roughness: 0.35 })
    );
    sea.position.set(231.7, 1.2 + (i % 2) * 0.48, -0.8 + i * 1.25);
    staticGroup.add(sea);
  });

  // 6 Floor 1 Indoor Nhậu Tables
  [
    [218.5, -4.5, true],
    [218.5, 1.8, false],
    [218.5, 8.2, true],
    [225.5, -4.5, false],
    [225.5, 1.8, true],
    [225.5, 8.2, false],
  ].forEach(([tx, tz, pot]) => addNhauTable(tx as number, tz as number, 0.0, pot as boolean, true));

  // Floor 1 Ceiling Lights & Rotating Fans
  const fanRotors: THREE.Group[] = [];
  const addCeilingFan = (fx: number, fy: number, fz: number) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), darkIronMat);
    rod.position.set(fx, fy - 0.21, fz);
    staticGroup.add(rod);
    const rotor = new THREE.Group();
    rotor.position.set(fx, fy - 0.42, fz);
    rotor.userData.noMerge = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.10, 12), brassMat);
    rotor.add(hub);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.025, 0.18), walnutMat);
      const ang = (b * Math.PI) / 2;
      blade.rotation.y = ang;
      blade.position.set(Math.cos(ang) * 0.62, 0, -Math.sin(ang) * 0.62);
      rotor.add(blade);
    }
    staticGroup.add(rotor);
    fanRotors.push(rotor);
  };
  [
    [220.0, 4.28, -2.0],
    [220.0, 4.28, 6.0],
    [226.5, 4.28, 2.0],
  ].forEach(([fx, fy, fz]) => addCeilingFan(fx, fy, fz));

  [
    [218.5, -4.5],
    [225.5, -4.5],
    [218.5, 1.8],
    [225.5, 1.8],
    [218.5, 8.2],
    [225.5, 8.2],
  ].forEach(([lx, lz]) => {
    addBox(lx - 0.9, lx + 0.9, 4.22, 4.28, lz - 0.25, lz + 0.25, ceilLedMat);
  });

  // =========================================================================
  // 5. GRAND WIDE WALKABLE STAIRCASE (X = 231.6 .. 234.8, Z = 6.2 .. 11.6)
  // =========================================================================
  const stairSteps = 18;
  for (let i = 0; i < stairSteps; i++) {
    const t0 = i / stairSteps;
    const t1 = (i + 1) / stairSteps;
    const stepZ0 = THREE.MathUtils.lerp(11.6, 6.2, t1);
    const stepZ1 = THREE.MathUtils.lerp(11.6, 6.2, t0);
    const stepTop = t1 * RON_BEO_FLOOR2_Y;
    addBox(231.65, 234.75, Math.max(0, stepTop - 0.24), stepTop, stepZ0, stepZ1, oakTableMat);
    // Illuminated warm LED step-nose edge
    addBox(231.7, 234.7, stepTop - 0.04, stepTop + 0.005, stepZ1 - 0.05, stepZ1, warmBulbMat);
  }
  // Staircase West glass & oak handrail on Floor 1 & Floor 2 stairwell guard
  addBox(231.5, 231.65, 0, RON_BEO_FLOOR2_Y, 6.0, 11.6, darkIronMat);
  addBox(231.48, 231.66, RON_BEO_FLOOR2_Y, RON_BEO_FLOOR2_Y + 1.05, 6.0, 12.2, glassMat);
  addBox(231.44, 231.70, RON_BEO_FLOOR2_Y + 1.02, RON_BEO_FLOOR2_Y + 1.10, 6.0, 12.2, oakTableMat);
  addBox(231.48, 235.3, RON_BEO_FLOOR2_Y, RON_BEO_FLOOR2_Y + 1.05, 12.02, 12.2, glassMat);
  addBox(231.44, 235.3, RON_BEO_FLOOR2_Y + 1.02, RON_BEO_FLOOR2_Y + 1.10, 11.98, 12.24, oakTableMat);

  // =========================================================================
  // 6. FLOOR 2: WRAP-AROUND BALCONY, VIP ALCOVES & NIGHT LOUNGE (Y = 4.50)
  // =========================================================================
  const f2Y = RON_BEO_FLOOR2_Y;
  const f2CeilY = 8.75;
  // Floor 2 Outer Walls & Glass Balcony Portals (Wide open West Z=-3.0..8.5, South X=217.0..225.5)
  addBox(214.0, 214.4, f2Y, f2Y + 1.05, -11.2, -3.0, brickMat);
  addBox(214.05, 214.35, f2Y + 1.05, f2Y + 3.3, -11.0, -3.1, glassMat);
  addBox(214.0, 214.4, f2Y, f2Y + 1.05, 8.5, 12.6, brickMat);
  addBox(214.05, 214.35, f2Y + 1.05, f2Y + 3.3, 8.6, 12.4, glassMat);
  addBox(214.0, 214.4, f2Y + 3.3, f2CeilY, -11.2, 12.6, warmWallMat);

  addBox(214.2, 217.0, f2Y, f2Y + 1.05, 12.4, 12.8, brickMat);
  addBox(214.4, 216.9, f2Y + 1.05, f2Y + 3.3, 12.45, 12.75, glassMat);
  addBox(225.5, 235.6, f2Y, f2Y + 1.05, 12.4, 12.8, brickMat);
  addBox(225.7, 235.4, f2Y + 1.05, f2Y + 3.3, 12.45, 12.75, glassMat);
  addBox(214.2, 235.6, f2Y + 3.3, f2CeilY, 12.4, 12.8, warmWallMat);

  addBox(214.2, 235.6, f2Y, f2CeilY, -11.3, -10.9, brickMat);
  addBox(235.3, 235.7, f2Y, f2CeilY, -11.3, 12.8, brickMat);

  // Floor 2 Wrap-Around Balcony Glass Railings & Pergola Canopy (X = 211.2..235.6, Z = -11.2..15.2)
  addBox(211.15, 211.32, f2Y, f2Y + 1.05, -11.2, 15.2, glassMat);
  addBox(211.10, 211.38, f2Y + 1.04, f2Y + 1.12, -11.2, 15.2, oakTableMat);
  addBox(211.15, 235.6, f2Y, f2Y + 1.05, 15.05, 15.22, glassMat);
  addBox(211.10, 235.6, f2Y + 1.04, f2Y + 1.12, 15.00, 15.28, oakTableMat);
  addBox(211.15, 214.2, f2Y, f2Y + 1.05, -11.25, -11.08, glassMat);
  addBox(235.45, 235.62, f2Y, f2Y + 1.05, 12.6, 15.2, glassMat);
  // Corner & perimeter iron pergola posts supporting Roof Slab
  [
    [211.25, -11.0],
    [211.25, -3.0],
    [211.25, 5.5],
    [211.25, 15.0],
    [218.5, 15.0],
    [227.0, 15.0],
    [235.4, 15.0],
  ].forEach(([px, pz]) => {
    addBox(px - 0.14, px + 0.14, f2Y, 8.95, pz - 0.14, pz + 0.14, darkIronMat);
  });

  // Balcony Glass Handrail LED Strip & Warm Edison String Bulbs along West & South Eaves
  addBox(211.12, 211.34, f2Y + 1.00, f2Y + 1.05, -11.2, 15.2, ledRibbonMat);
  addBox(211.12, 235.6, f2Y + 1.00, f2Y + 1.05, 15.10, 15.26, ledRibbonMat);
  addBox(211.18, 211.30, 8.66, 8.74, -11.2, 15.2, ledRibbonMat);
  addBox(211.18, 235.6, 8.66, 8.74, 15.10, 15.22, ledRibbonMat);
  for (let bz = -9.5; bz <= 14.0; bz += 2.35) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      Math.round(bz) % 2 === 0 ? warmBulbMat : redLanternMat
    );
    bulb.position.set(212.5, 8.45, bz);
    staticGroup.add(bulb);
  }
  for (let bx = 213.5; bx <= 234.0; bx += 2.5) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      Math.round(bx) % 2 === 0 ? warmBulbMat : redLanternMat
    );
    bulb.position.set(bx, 8.45, 13.8);
    staticGroup.add(bulb);
  }

  // Floor 2 VIP Private Alcoves (North Wall Z = -10.8 .. -5.2)
  // Center divider louver screen between VIP 1 & VIP 2
  addBox(224.45, 224.85, f2Y, f2CeilY, -10.8, -5.2, walnutMat);
  // Round VIP Banquet Tables + Red Armchairs
  [219.5, 229.8].forEach((vx, idx) => {
    const rTop = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.08, 20), oakTableMat);
    rTop.position.set(vx, f2Y + 0.74, -8.1);
    staticGroup.add(rTop);
    const rPed = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.72, 12), darkIronMat);
    rPed.position.set(vx, f2Y + 0.36, -8.1);
    staticGroup.add(rPed);
    const lazySusan = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.04, 18), glassMat);
    lazySusan.position.set(vx, f2Y + 0.80, -8.1);
    staticGroup.add(lazySusan);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.16, 12), hotpotSteelMat);
    pot.position.set(vx, f2Y + 0.90, -8.1);
    staticGroup.add(pot);
    for (let c = 0; c < 4; c++) {
      const ang = (c * Math.PI) / 2 + 0.4;
      const cx = vx + Math.cos(ang) * 1.42;
      const cz = -8.1 + Math.sin(ang) * 1.42;
      addBox(cx - 0.24, cx + 0.24, f2Y, f2Y + 0.46, cz - 0.24, cz + 0.24, redCushionMat);
    }
    // VIP Chandelier Ring & VIP Neon Sign (4.25 x 0.85 = 5:1 matching 1280x256)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 8, 20), warmBulbMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(vx, f2CeilY - 0.45, -8.1);
    staticGroup.add(ring);

    const vTex = createNeonQuoteTex(
      idx === 0 ? 'PHÒNG VIP 1 • RON BÉO' : 'PHÒNG VIP 2 • HỘI NGỘ',
      'MÁY LẠNH • KARAOKE • PHỤC VỤ RIÊNG',
      '#fbbf24'
    );
    const vMat = new THREE.MeshStandardMaterial({
      map: vTex,
      emissive: 0xffffff,
      emissiveMap: vTex,
      emissiveIntensity: 1.05,
    });
    signDynamicMats.push(vMat);
    const vBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.25, 0.85), vMat);
    vBoard.position.set(vx, f2Y + 2.85, -10.85);
    staticGroup.add(vBoard);
  });

  // Floor 2 Lounge + Balcony Tables
  [
    [218.8, 0.5, true],
    [225.8, 0.5, false],
    [222.5, 7.5, true],
    [212.7, -5.5, false],
    [212.7, 5.5, true],
    [222.5, 13.9, false],
  ].forEach(([tx, tz, pot]) => addNhauTable(tx as number, tz as number, f2Y, pot as boolean, true));

  // Floor 2 Service Bar & 2nd Sports LED TV
  addBox(229.1, 230.5, f2Y, f2Y + 1.08, -3.0, 2.4, walnutMat);
  addBox(229.05, 230.55, f2Y + 1.08, f2Y + 1.15, -3.05, 2.45, oakTableMat);
  addBox(229.3, 230.3, f2Y + 1.15, f2Y + 1.72, -1.2, 0.6, brassMat);
  addBox(235.15, 235.25, f2Y + 1.45, f2Y + 3.45, -2.2, 2.2, darkIronMat);
  const tv2 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.85), tvMat);
  tv2.rotation.y = -Math.PI / 2;
  tv2.position.set(235.12, f2Y + 2.45, 0.0);
  staticGroup.add(tv2);

  // Floor 2 Ceiling Lights, Warm Illuminated Soffit & Fans
  [
    [220.0, f2CeilY - 0.08, 1.0],
    [225.5, f2CeilY - 0.08, 7.0],
  ].forEach(([fx, fy, fz]) => addCeilingFan(fx, fy, fz));
  [
    [219.0, 0.5],
    [225.5, 0.5],
    [222.5, 7.5],
    [218.5, -5.0],
    [228.5, -5.0],
  ].forEach(([lx, lz]) => {
    addBox(lx - 1.15, lx + 1.15, f2CeilY - 0.14, f2CeilY - 0.07, lz - 0.28, lz + 0.28, ceilLedMat);
  });

  // =========================================================================
  // 7. ROOFTOP, PERGOLA CANOPY & REDESIGNED ILLUMINATED SIGNAGE SUITE
  // =========================================================================
  addBox(211.0, 235.8, f2CeilY - 0.04, f2CeilY, -11.4, 15.35, ceilGlowMat); // Warm glowing F2 soffit ceiling
  addBox(211.0, 235.8, f2CeilY, 9.02, -11.4, 15.35, roofSlateMat);
  addBox(210.9, 235.9, 9.02, 9.48, -11.5, 15.45, darkIronMat);
  // Dual architectural LED cornice ribbons wrapping the West & South roof slab
  addBox(210.82, 210.95, 8.98, 9.18, -11.5, 15.45, ledRibbonMat);
  addBox(210.82, 235.9, 8.98, 9.18, 15.38, 15.52, ledRibbonMat);

  // Monumental West Rooftop Billboard (facing Phố Đi Bộ: 18.2 x 2.6 = exact 7:1!)
  const westBillTex = createPubBillboardTex(
    '★ HỆ THỐNG BIA TƯƠI & ẨM THỰC ĐÊM PHỐ ĐI BỘ ★',
    'QUÁN NHẬU RON BÉO',
    ['BIA TƯƠI -2°C', 'LẨU HẢI SẢN', 'NƯỚNG THAN HOA', 'PHÒNG VIP 2 TẦNG'],
    '15:00 – 04:00',
    '3H CHIỀU ĐẾN 4H SÁNG'
  );
  const westBillMat = new THREE.MeshStandardMaterial({
    map: westBillTex,
    emissive: 0xffffff,
    emissiveMap: westBillTex,
    emissiveIntensity: 1.05,
  });
  signDynamicMats.push(westBillMat);
  // Brushed brass & iron cabinet frame + backlit halo bars + gooseneck spotlights
  addBox(210.98, 211.45, 9.48, 12.24, -7.45, 11.05, darkIronMat);
  addBox(210.90, 211.02, 12.22, 12.30, -7.45, 11.05, brassMat);
  addBox(210.90, 211.02, 9.45, 9.53, -7.45, 11.05, brassMat);
  const westBillFace = new THREE.Mesh(new THREE.PlaneGeometry(18.2, 2.6), westBillMat);
  westBillFace.rotation.y = -Math.PI / 2;
  westBillFace.position.set(210.94, 10.86, 1.8);
  staticGroup.add(westBillFace);
  [-5.2, -0.5, 4.2, 8.8].forEach((sz) => {
    addBox(210.35, 211.0, 12.28, 12.35, sz - 0.04, sz + 0.04, darkIronMat);
    addBox(210.22, 210.45, 12.16, 12.34, sz - 0.14, sz + 0.14, brassMat);
    addBox(210.30, 210.42, 12.14, 12.18, sz - 0.11, sz + 0.11, warmBulbMat);
  });

  // Monumental South Boulevard Rooftop Billboard (facing Đại lộ Đông: 19.6 x 2.8 = exact 7:1!)
  const southBillTex = createPubBillboardTex(
    '★ KHÔNG GIAN 2 TẦNG SÂN VƯỜN & BAN CÔNG THOÁNG MÁT ★',
    'QUÁN NHẬU RON BÉO • 2 TẦNG',
    ['BIA TƯƠI 0°C', 'BAN CÔNG VIEW ĐẸP', 'KARAOKE VIP', 'BÓNG ĐÁ LIVE'],
    '15:00 – 04:00',
    'MỞ CỬA MỌI NGÀY'
  );
  const southBillMat = new THREE.MeshStandardMaterial({
    map: southBillTex,
    emissive: 0xffffff,
    emissiveMap: southBillTex,
    emissiveIntensity: 1.05,
  });
  signDynamicMats.push(southBillMat);
  addBox(213.5, 233.3, 9.48, 12.38, 15.0, 15.42, darkIronMat);
  addBox(213.5, 233.3, 12.36, 12.44, 15.36, 15.48, brassMat);
  addBox(213.5, 233.3, 9.45, 9.53, 15.36, 15.48, brassMat);
  const southBillFace = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 2.8), southBillMat);
  southBillFace.position.set(223.4, 10.92, 15.45);
  staticGroup.add(southBillFace);
  [216.2, 221.0, 225.8, 230.6].forEach((sx) => {
    addBox(sx - 0.04, sx + 0.04, 12.42, 12.50, 15.4, 16.05, darkIronMat);
    addBox(sx - 0.14, sx + 0.14, 12.30, 12.48, 15.95, 16.18, brassMat);
    addBox(sx - 0.11, sx + 0.11, 12.28, 12.32, 15.98, 16.10, warmBulbMat);
  });

  // Ground Floor Lightbox Fascia above West Entrance Bays (8.8 x 1.1 = exact 8:1 matching 1536x192!)
  const groundFasciaTex = createGroundFasciaTex();
  const groundFasciaMat = new THREE.MeshStandardMaterial({
    map: groundFasciaTex,
    emissive: 0xffffff,
    emissiveMap: groundFasciaTex,
    emissiveIntensity: 1.05,
  });
  signDynamicMats.push(groundFasciaMat);
  addBox(213.88, 214.02, 3.24, 4.44, -2.1, 6.9, darkIronMat);
  addBox(213.84, 213.92, 3.22, 3.28, -2.1, 6.9, ledRibbonMat);
  const groundFascia = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 1.1), groundFasciaMat);
  groundFascia.rotation.y = -Math.PI / 2;
  groundFascia.position.set(213.86, 3.84, 2.4);
  staticGroup.add(groundFascia);

  // Corner Double-Sided Illuminated Vertical Blade Totem (0.90 x 2.40 = exact 3:8 matching 384x1024!)
  const bladeTex = createPubBladeTex();
  const bladeMat = new THREE.MeshStandardMaterial({
    map: bladeTex,
    emissive: 0xffffff,
    emissiveMap: bladeTex,
    emissiveIntensity: 1.05,
  });
  signDynamicMats.push(bladeMat);
  addBox(210.4, 211.2, 6.72, 6.88, 14.8, 14.96, darkIronMat);
  addBox(210.0, 210.96, 5.55, 8.05, 14.78, 14.98, darkIronMat);
  addBox(209.96, 210.02, 5.55, 8.05, 14.78, 14.98, ledRibbonMat);
  [-0.11, 0.11].forEach((oz, idx) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.4), bladeMat);
    face.rotation.y = idx === 0 ? Math.PI : 0;
    face.position.set(210.48, 6.8, 14.88 + oz);
    staticGroup.add(face);
  });

  // Two Illuminated Welcome & Specialty Menu Standees (0.96 x 1.68 = exact 4:7 matching 512x896!)
  const menuTex = createMenuStandeeTex();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xffffff,
    emissiveMap: menuTex,
    emissiveIntensity: 1.0,
  });
  menuDynamicMats.push(menuMat);
  // Standee 1: Flanking West Main Entrance Pillar (X = 213.35, Z = -1.55, clears entire Z=-0.8..4.8 bay)
  addBox(213.22, 213.48, 0.0, 0.12, -2.08, -1.02, darkIronMat);
  addBox(213.28, 213.42, 0.12, 1.88, -2.06, -1.04, brassMat);
  const westMenuFace = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.68), menuMat);
  westMenuFace.rotation.y = -Math.PI / 2;
  westMenuFace.position.set(213.26, 1.0, -1.55);
  staticGroup.add(westMenuFace);

  // Standee 2: Flanking South Boulevard Entrance (X = 222.25, Z = 13.35)
  addBox(221.72, 222.78, 0.0, 0.12, 13.22, 13.48, darkIronMat);
  addBox(221.74, 222.76, 0.12, 1.88, 13.28, 13.42, brassMat);
  const southMenuFace = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.68), menuMat);
  southMenuFace.position.set(222.25, 1.0, 13.44);
  staticGroup.add(southMenuFace);

  // Dynamic Open/Closed Neon Status Plaque beside Main Entrance (1.44 x 0.72 = exact 2:1!)
  const openBadgeMat = new THREE.MeshStandardMaterial({
    map: createOpenStatusSignTex(true),
    emissive: 0xffffff,
    emissiveMap: createOpenStatusSignTex(true),
    emissiveIntensity: 1.05,
  });
  const closedBadgeMat = new THREE.MeshStandardMaterial({
    map: createOpenStatusSignTex(false),
    emissive: 0xffffff,
    emissiveMap: createOpenStatusSignTex(false),
    emissiveIntensity: 0.78,
  });
  addBox(213.90, 214.0, 2.04, 2.86, 4.84, 6.36, darkIronMat);
  const openBadgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.72), openBadgeMat);
  openBadgeMesh.rotation.y = -Math.PI / 2;
  openBadgeMesh.position.set(213.88, 2.45, 5.6);
  openBadgeMesh.userData.noMerge = true;
  staticGroup.add(openBadgeMesh);

  const closedBadgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.72), closedBadgeMat);
  closedBadgeMesh.rotation.y = -Math.PI / 2;
  closedBadgeMesh.position.set(213.88, 2.45, 5.6);
  closedBadgeMesh.userData.noMerge = true;
  staticGroup.add(closedBadgeMesh);

  // =========================================================================
  // 8. CALIBRATED POINT LIGHTS (HIGH-LUMEN WARM PUB & FACADE WASH)
  // =========================================================================
  let closedFactor = 0.0;
  const registerPubLight = (
    color: number,
    x: number,
    y: number,
    z: number,
    dist: number,
    dayInt: number,
    nightInt: number,
    minKeepClosed = 0.16
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 0.85);
    l.position.set(x, y, z);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => Math.max(minKeepClosed, 1.0 - closedFactor),
    });
  };

  registerPubLight(0xfde68a, 209.8, 3.8, 2.0, 42, 12, 58, 0.24); // West Beer Garden Patio & Facade Wash
  registerPubLight(0xfffbeb, 219.5, 3.8, -2.5, 38, 14, 52, 0.10); // Floor 1 Beer Bar & North Tables
  registerPubLight(0xfef3c7, 224.0, 3.8, 7.2, 38, 14, 48, 0.12); // Floor 1 South Hall & Stairwell
  registerPubLight(0xe0f2fe, 232.0, 3.4, -1.5, 28, 12, 36, 0.08); // Open Kitchen & Live Seafood Tanks
  registerPubLight(0xfef3c7, 221.5, 8.2, -3.5, 40, 14, 52, 0.10); // Floor 2 VIP Alcoves & Lounge
  registerPubLight(0xfde68a, 219.5, 8.0, 10.5, 44, 12, 56, 0.22); // Floor 2 Wrap-Around Balcony & South Corner

  let fanAngle = 0;
  let wasNearPub = false;
  let cheerTimer = 1.2;
  let timeSinceLastCheer = 30.0;
  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: RonBeoPubNpcController | null,
    playerPos?: { x: number; z: number } | null,
    onPlayCheer?: (volumeScale: number) => void
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isRonBeoOpenAtHour(rawHour);
    const targetClosed = isOpen ? 0.0 : 1.0;
    closedFactor = THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 3.5));

    // Rolling shutter motion
    for (let i = 0; i < shutterHandles.length; i++) {
      setShutterProgress(shutterHandles[i], closedFactor);
    }

    // Dynamic Open / Closed sign swap
    openBadgeMesh.visible = isOpen;
    closedBadgeMesh.visible = !isOpen;

    // Spin ceiling fans while open
    if (closedFactor < 0.95) {
      fanAngle += dt * 4.8 * (1 - closedFactor);
      for (let i = 0; i < fanRotors.length; i++) {
        fanRotors[i].rotation.y = fanAngle + i * 0.9;
      }
    }

    // Operating-hour lighting scaling (retains warm architectural facade accent even when closed)
    const openScale = 1.0 - closedFactor;
    const bulbGlow = openScale * (0.55 + lampFactor * 1.45) + (1 - openScale) * lampFactor * 0.24;
    warmBulbMat.emissiveIntensity = bulbGlow;
    redLanternMat.emissiveIntensity = bulbGlow * 0.95;
    ceilLedMat.emissiveIntensity = openScale * (0.85 + lampFactor * 1.0) + (1 - openScale) * 0.14;
    ledRibbonMat.emissiveIntensity = openScale * (0.8 + lampFactor * 1.15) + (1 - openScale) * lampFactor * 0.42;
    ceilGlowMat.emissiveIntensity = openScale * (0.28 + lampFactor * 0.34) + (1 - openScale) * 0.06;
    warmWallMat.emissiveIntensity = openScale * (0.20 + lampFactor * 0.26) + (1 - openScale) * lampFactor * 0.08;
    brickMat.emissiveIntensity = openScale * (0.08 + lampFactor * 0.18) + (1 - openScale) * lampFactor * 0.04;
    floorTileMat.emissiveIntensity = openScale * (0.08 + lampFactor * 0.16);
    woodFloorMat.emissiveIntensity = openScale * (0.08 + lampFactor * 0.18);
    seafoodTankMat.emissiveIntensity = openScale * (0.8 + lampFactor * 0.85);
    emberMat.emissiveIntensity = openScale * (1.1 + 0.4 * Math.sin(fanAngle * 0.6));
    warmPoolMat.opacity = (openScale * 0.98 + (1 - openScale) * 0.26) * lampFactor;

    const signGlow = openScale > 0.05 ? openScale * (0.78 + lampFactor * 0.58) : 0.44 * Math.max(0.45, lampFactor);
    for (let i = 0; i < signDynamicMats.length; i++) {
      signDynamicMats[i].emissiveIntensity = signGlow;
    }
    const menuGlow = openScale > 0.05 ? openScale * (0.72 + lampFactor * 0.52) : 0.22;
    for (let i = 0; i < menuDynamicMats.length; i++) {
      menuDynamicMats[i].emissiveIntensity = menuGlow;
    }

    // Spatial occasional "1 2 3 Dô... 2 3 Uống..." cheer when inside or right next to the pub
    timeSinceLastCheer += dt;
    if (playerPos && onPlayCheer && dt > 0) {
      const cheerVol = computeRonBeoCheerVolume(playerPos.x, playerPos.z, isOpen && closedFactor < 0.35);
      if (cheerVol > 0) {
        if (!wasNearPub && timeSinceLastCheer >= 12.0) {
          cheerTimer = Math.min(cheerTimer, 0.9);
        }
        wasNearPub = true;
        cheerTimer -= dt;
        if (cheerTimer <= 0) {
          onPlayCheer(cheerVol);
          timeSinceLastCheer = 0;
          cheerTimer = 14.0 + Math.random() * 10.0;
        }
      } else {
        wasNearPub = false;
      }
    }

    npcController?.update(delta, rawHour);
  };

  updateOperatingHours(19.0, 0, 1.0, null);

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
// LIVE NPCS: CHEFS, BARTENDER, WAITERS, SEATED CHEERING DINERS & WALK-INS
// =========================================================================

interface PubNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  role: 'staff' | 'diner_seated' | 'diner_walk';
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  idleYaw?: number;
  seated?: boolean;
  cheerOffset: number;
  evacuating: boolean;
  exitPath: THREE.Vector3[];
  exitWp: { idx: number };
  glbHandle: GlbHumanHandle;
}

function buildPubCharacterMesh(
  helpers: HospitalCharacterHelpers,
  shirt: number,
  pants: number,
  skin: string,
  hairColor: number,
  apronColor: number | null,
  seated = false
) {
  const grp = new THREE.Group();
  const hips = new THREE.Group();
  grp.add(hips);

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.25), shirtMat);
  torso.position.y = 1.04;
  hips.add(torso);

  if (apronColor !== null) {
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.50, 0.27),
      new THREE.MeshStandardMaterial({ color: apronColor, roughness: 0.65 })
    );
    apron.position.y = 0.88;
    hips.add(apron);
  }

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
    leftArm.rotation.x = -0.4;
    rightArm.rotation.x = -0.4;
  }

  return { group: grp, hips, leftArm, rightArm, leftLeg, rightLeg };
}

export class RonBeoPubNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: PubNpcActor[] = [];
  private wasOpen = true;
  private fullyCleared = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const f2Y = RON_BEO_FLOOR2_Y;
    const specs: Array<{
      role: 'staff' | 'diner_seated' | 'diner_walk';
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      apron: number | null;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      seated?: boolean;
      speed?: number;
    }> = [
      // 1. Outdoor BBQ Grill Chef
      {
        role: 'staff',
        shirt: 0xffffff,
        pants: 0x0f172a,
        skin: '#fbd3b4',
        hair: 0x111827,
        apron: 0xb91c1c,
        waypoints: [new THREE.Vector3(210.8, 0.02, -8.8)],
        idleYaw: Math.PI / 2,
      },
      // 2. Indoor Kitchen Seafood Chef
      {
        role: 'staff',
        shirt: 0xffffff,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x27150a,
        apron: 0xb91c1c,
        waypoints: [new THREE.Vector3(232.8, 0.02, -6.5)],
        idleYaw: -Math.PI / 2,
      },
      // 3. Draught Beer Bartender
      {
        role: 'staff',
        shirt: 0xd97706,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x18181b,
        apron: 0x1e293b,
        waypoints: [new THREE.Vector3(217.8, 0.02, -7.2)],
        idleYaw: 0,
      },
      // 4. Floor 1 + Patio Waiter
      {
        role: 'staff',
        shirt: 0xf97316,
        pants: 0x18181b,
        skin: '#fbd3b4',
        hair: 0x111827,
        apron: 0x18181b,
        waypoints: [
          new THREE.Vector3(229.8, 0.02, -5.0),
          new THREE.Vector3(222.0, 0.02, 2.0),
          new THREE.Vector3(212.5, 0.02, 2.0),
          new THREE.Vector3(211.6, 0.02, 7.2),
          new THREE.Vector3(222.0, 0.02, 2.0),
        ],
        speed: 1.55,
      },
      // 5. Floor 1 <-> Floor 2 Staircase Waiter
      {
        role: 'staff',
        shirt: 0xf97316,
        pants: 0x18181b,
        skin: '#fce0c8',
        hair: 0x27150a,
        apron: 0x18181b,
        waypoints: [
          new THREE.Vector3(229.8, 0.02, 11.8),
          new THREE.Vector3(233.2, 0.02, 11.8),
          new THREE.Vector3(233.2, f2Y + 0.02, 5.8),
          new THREE.Vector3(226.5, f2Y + 0.02, 4.5),
          new THREE.Vector3(221.0, f2Y + 0.02, -4.2),
          new THREE.Vector3(226.5, f2Y + 0.02, 4.5),
          new THREE.Vector3(233.2, f2Y + 0.02, 5.8),
          new THREE.Vector3(233.2, 0.02, 11.8),
        ],
        speed: 1.5,
      },
      // 6. Outdoor Patio Seated Diners (Cheering group)
      { role: 'diner_seated', shirt: 0x0ea5e9, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, apron: null, waypoints: [new THREE.Vector3(209.4, 0.02, -4.05)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xf43f5e, pants: 0x334155, skin: '#fce0c8', hair: 0x27150a, apron: null, waypoints: [new THREE.Vector3(210.2, 0.02, -2.35)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0x22c55e, pants: 0x0f172a, skin: '#e8b48e', hair: 0x18181b, apron: null, waypoints: [new THREE.Vector3(209.4, 0.02, 9.55)], idleYaw: 0, seated: true },
      // 7. Floor 1 Indoor Seated Diners
      { role: 'diner_seated', shirt: 0xa855f7, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, apron: null, waypoints: [new THREE.Vector3(218.1, 0.02, -5.35)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xeab308, pants: 0x334155, skin: '#f5c7a3', hair: 0x3f2305, apron: null, waypoints: [new THREE.Vector3(218.9, 0.02, -3.65)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0x14b8a6, pants: 0x0f172a, skin: '#fce0c8', hair: 0x111827, apron: null, waypoints: [new THREE.Vector3(225.1, 0.02, 0.95)], idleYaw: 0, seated: true },
      // 8. Floor 2 VIP & Balcony Seated Diners
      { role: 'diner_seated', shirt: 0xef4444, pants: 0x18181b, skin: '#fbd3b4', hair: 0x111827, apron: null, waypoints: [new THREE.Vector3(218.5, f2Y + 0.02, -9.1)], idleYaw: Math.PI / 4, seated: true },
      { role: 'diner_seated', shirt: 0x3b82f6, pants: 0x1e293b, skin: '#e8b48e', hair: 0x18181b, apron: null, waypoints: [new THREE.Vector3(212.3, f2Y + 0.02, 4.65)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xec4899, pants: 0x334155, skin: '#fce0c8', hair: 0x27150a, apron: null, waypoints: [new THREE.Vector3(222.9, f2Y + 0.02, 13.05)], idleYaw: 0, seated: true },
      // 9. Visiting Guest Strolling between Phố Đi Bộ -> Patio -> Floor 1 Entrance
      {
        role: 'diner_walk',
        shirt: 0x6366f1,
        pants: 0x0f172a,
        skin: '#fbd3b4',
        hair: 0x111827,
        apron: null,
        waypoints: [
          new THREE.Vector3(205.5, 0.02, 2.0),
          new THREE.Vector3(216.2, 0.02, 2.0),
          new THREE.Vector3(221.8, 0.02, 5.2),
          new THREE.Vector3(221.8, 0.02, -2.0),
          new THREE.Vector3(216.2, 0.02, 2.0),
        ],
        speed: 1.32,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildPubCharacterMesh(helpers, s.shirt, s.pants, s.skin, s.hair, s.apron, Boolean(s.seated));
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const spec =
        s.seated
          ? pickSeatedCivilianModel(idx * 3 + 1)
          : s.role === 'diner_walk'
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
        phaseOffset: idx * 0.8,
      });

      const startPos = s.waypoints[0];
      const exitPath =
        startPos.y >= 2.2
          ? [
              new THREE.Vector3(226.5, f2Y + 0.02, 5.2),
              new THREE.Vector3(233.2, f2Y + 0.02, 5.8),
              new THREE.Vector3(233.2, 0.02, 11.8),
              new THREE.Vector3(222.0, 0.02, 2.0),
              new THREE.Vector3(205.0, 0.02, 2.0),
            ]
          : [new THREE.Vector3(213.2, 0.02, 2.0), new THREE.Vector3(205.0, 0.02, 2.0)];

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
        walkPhase: idx * 0.8,
        idleYaw: s.idleYaw,
        seated: s.seated,
        cheerOffset: idx * 1.3,
        evacuating: false,
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
    const isOpen = isRonBeoOpenAtHour(rawHour);

    if (isOpen && !this.wasOpen) {
      // Re-opening at 15:00: reset NPCs cleanly to their stations & tables
      this.fullyCleared = false;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        a.evacuating = false;
        a.exitWp.idx = 0;
        a.wpIdx = a.waypoints.length > 1 ? 1 : 0;
        a.group.position.copy(a.waypoints[0]);
        a.group.visible = true;
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.glbHandle.setAnimState(a.seated ? 'Sit' : a.waypoints.length > 1 ? 'Walk' : 'Idle');
      }
    } else if (!isOpen && this.wasOpen) {
      // Closing at 04:00: trigger graceful exit walk for standing/patio NPCs
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        a.evacuating = true;
        a.exitWp.idx = 0;
        if (!a.seated) a.glbHandle.setAnimState('Walk', 1.25);
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
        if (a.seated) {
          // Seated diners clear immediately once closed
          a.group.visible = false;
          continue;
        }
        a.glbHandle.setAnimState('Walk', 1.25);
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
      if (a.waypoints.length <= 1) {
        a.glbHandle.setAnimState(a.seated ? 'Sit' : 'Idle');
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.walkPhase += dt * 2.1;
        if (a.seated) {
          // Periodic "1 2 3 Dô!" beer mug toast raise
          const toastWave = Math.max(0, Math.sin(a.walkPhase * 0.65 + a.cheerOffset));
          a.rightArm.rotation.x = -0.4 - toastWave * 0.95;
          a.leftArm.rotation.x = -0.4;
        } else {
          a.hips.position.y = Math.sin(a.walkPhase) * 0.008;
          a.rightArm.rotation.x = -0.25 + Math.sin(a.walkPhase * 1.8) * 0.22;
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
