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
  isToxicNightPartyAtHour,
  isToxicPubOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';

export const TOXIC_FLOOR2_Y = 4.50;
const TOXIC_LOGO_URL = '/assets/toxic_logo.png';

export function isPlayerInToxicPubZone(x: number, z: number): boolean {
  return x >= 146.5 && x <= 180.2 && z >= -14.5 && z <= 16.5;
}

export function computeToxicDjVolume(px: number, pz: number, isOpen: boolean): number {
  if (!isOpen) return 0;
  const dx = px < 147.0 ? 147.0 - px : px > 179.5 ? px - 179.5 : 0;
  const dz = pz < -14.0 ? -14.0 - pz : pz > 15.6 ? pz - 15.6 : 0;
  const dist = Math.hypot(dx, dz);
  if (dist <= 0.01) return 1.0;
  const maxHearDist = 13.5;
  if (dist > maxHearDist) return 0;
  const t = 1 - dist / maxHearDist;
  return Number((0.14 + 0.86 * t * t).toFixed(3));
}

export interface ToxicPubBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: ToxicPubNpcController | null,
    playerPos?: { x: number; z: number } | null,
    onUpdateDjAudio?: (volumeScale: number) => void
  ) => void;
  getClosedFactor: () => number;
}

// =========================================================================
// COLLIDERS: QUÁN NHẬU GIỚI TRẺ & BEER CLUB TOXIC (X = 147.0 .. 180.0, Z = -14.0 .. +15.6)
// Floor 1 & Floor 2 strictly scoped; South Portal (X=156.5..163.5), East Portal (Z=-1.5..5.5),
// central dance floor, DJ front & SW staircase (X=148.2..151.4, Z=5.2..11.6) remain wide open!
// =========================================================================
export const TOXIC_COLLIDERS: IntersectionColliderBox[] = [
  // Patio perimeter planters (South Boulevard sidewalk open X=155.5..179.5, East Phố Đi Bộ open!)
  { minX: 147.0, maxX: 180.0, minZ: -14.2, maxZ: -13.4, floor: 1 }, // North rear boundary wall
  { minX: 147.0, maxX: 155.2, minZ: 14.4, maxZ: 15.5, floor: 1 }, // SW Sidewalk luxury palm planter
  // Corner Illuminated Logo Totem Monolith (SE Patio corner)
  { minX: 177.9, maxX: 179.0, minZ: 13.9, maxZ: 15.0, floor: 1 },
  // Two Illuminated Welcome Menu Standees
  { minX: 155.3, maxX: 156.3, minZ: 13.0, maxZ: 13.5, floor: 1 }, // South entrance standee
  { minX: 172.3, maxX: 172.8, minZ: -2.8, maxZ: -1.6, floor: 1 }, // East Phố Đi Bộ standee
  // Red velvet VIP rope stanchions flanking South entrance (leaves X=156.5..163.5 wide open)
  { minX: 156.1, maxX: 156.5, minZ: 13.5, maxZ: 15.0, floor: 1 },
  { minX: 163.5, maxX: 163.9, minZ: 13.5, maxZ: 15.0, floor: 1 },
  // 4 Outdoor Youth High-Top Beer Tables along East Phố Đi Bộ & South Patio
  ...[
    [176.2, -9.2],
    [176.2, -5.0],
    [176.2, 8.2],
    [168.4, 13.8],
  ].map(([tx, tz]) => ({
    minX: tx - 1.15,
    maxX: tx + 1.15,
    minZ: tz - 1.05,
    maxZ: tz + 1.05,
    floor: 1 as const,
  })),

  // Floor 1 Building Exterior Curtain Walls (leaving wide open South & East portals)
  { minX: 147.1, maxX: 147.8, minZ: -13.6, maxZ: 12.4, floor: 1 }, // West exterior wall
  { minX: 147.2, maxX: 156.5, minZ: 11.8, maxZ: 12.5, floor: 1 }, // South wall West of portal
  { minX: 163.5, maxX: 172.3, minZ: 11.8, maxZ: 12.5, floor: 1 }, // South wall East of portal
  { minX: 171.8, maxX: 172.5, minZ: -13.6, maxZ: -1.5, floor: 1 }, // East wall North of portal
  { minX: 171.8, maxX: 172.5, minZ: 5.5, maxZ: 12.4, floor: 1 }, // East wall South of portal

  // Floor 1 DJ Stage & Subwoofer Stacks (North-West-Center: X = 150.6..159.4, Z = -13.4..-9.4)
  { minX: 150.6, maxX: 159.4, minZ: -13.4, maxZ: -9.4, floor: 1 },
  // Floor 1 Neon Cocktail & Craft Beer Bar (North-East: X = 162.4..171.4, Z = -13.4..-8.8)
  { minX: 162.4, maxX: 171.4, minZ: -13.4, maxZ: -8.8, floor: 1 },

  // Floor 1 Indoor High-Top Youth Nhậu Tables (Dance Floor X=152..163, Z=-8.2..+1.8 stays wide open!)
  ...[
    [166.8, -4.6],
    [166.8, 2.2],
    [166.8, 8.2],
    [156.0, 7.6],
  ].map(([tx, tz]) => ({
    minX: tx - 1.25,
    maxX: tx + 1.25,
    minZ: tz - 1.1,
    maxZ: tz + 1.1,
    floor: 1 as const,
  })),

  // Floor 1 Staircase East safety side wall (walk-up entry from South Z=11.6 only)
  { minX: 151.3, maxX: 151.7, minZ: 5.2, maxZ: 11.6, floor: 1 },

  // Floor 2 Mezzanine & Wrap-Around Sky-Balcony Railings (X = 147.2..176.2, Z = -13.6..+15.2)
  { minX: 147.1, maxX: 147.8, minZ: -13.6, maxZ: 15.3, floor: 2 },
  { minX: 147.2, maxX: 176.3, minZ: -13.8, maxZ: -13.2, floor: 2 },
  { minX: 175.8, maxX: 176.4, minZ: -13.6, maxZ: 15.3, floor: 2 },
  { minX: 147.2, maxX: 176.3, minZ: 14.9, maxZ: 15.4, floor: 2 },
  // Floor 2 Facade Walls flanking open Balcony Portals (East portal Z=-3.5..7.5, South portal X=155.5..165.5)
  { minX: 171.8, maxX: 172.5, minZ: -13.6, maxZ: -3.5, floor: 2 },
  { minX: 171.8, maxX: 172.5, minZ: 7.5, maxZ: 12.4, floor: 2 },
  { minX: 147.2, maxX: 155.5, minZ: 11.8, maxZ: 12.5, floor: 2 },
  { minX: 165.5, maxX: 172.3, minZ: 11.8, maxZ: 12.5, floor: 2 },
  // Floor 2 Double-Height Atrium Glass Balustrade overlooking DJ Stage below
  { minX: 151.5, maxX: 162.0, minZ: -13.4, maxZ: -1.0, floor: 2 },
  // Floor 2 Stairwell Opening Safety Balustrade (open ONLY at North landing Z <= 5.6)
  { minX: 151.3, maxX: 151.7, minZ: 5.2, maxZ: 12.1, floor: 2 },
  { minX: 147.6, maxX: 151.7, minZ: 11.7, maxZ: 12.1, floor: 2 },
  // Floor 2 VIP Bottle Bar & Lounge Tables
  { minX: 166.5, maxX: 171.5, minZ: -13.0, maxZ: -8.8, floor: 2 },
  ...[
    [167.2, -3.5],
    [167.2, 4.5],
    [158.0, 6.2],
    [174.1, -6.5],
    [174.1, 4.5],
    [160.5, 13.5],
  ].map(([tx, tz]) => ({
    minX: tx - 1.15,
    maxX: tx + 1.15,
    minZ: tz - 1.0,
    maxZ: tz + 1.0,
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

let cachedLogoImg: HTMLImageElement | null = null;
const pendingLogoCallbacks: Array<(img: HTMLImageElement) => void> = [];

function onToxicLogoLoaded(cb: (img: HTMLImageElement) => void) {
  if (typeof Image === 'undefined') return;
  if (cachedLogoImg && cachedLogoImg.complete && cachedLogoImg.naturalWidth > 0) {
    cb(cachedLogoImg);
    return;
  }
  pendingLogoCallbacks.push(cb);
  if (!cachedLogoImg) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      while (pendingLogoCallbacks.length > 0) {
        const fn = pendingLogoCallbacks.shift();
        fn?.(img);
      }
    };
    img.src = TOXIC_LOGO_URL;
    cachedLogoImg = img;
  }
}

function drawToxicFallbackLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.fillStyle = '#050507';
  roundRectPath(ctx, cx - size * 0.5, cy - size * 0.5, size, size, size * 0.14);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = Math.max(2, size * 0.03);
  roundRectPath(ctx, cx - size * 0.5, cy - size * 0.5, size, size, size * 0.14);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ef4444';
  ctx.font = `900 ${Math.round(size * 0.25)}px system-ui, sans-serif`;
  ctx.fillText('TOXIC', cx, cy - size * 0.08);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(size * 0.14)}px system-ui, sans-serif`;
  ctx.fillText('CITY >>>', cx, cy + size * 0.17);
  ctx.restore();
}

function createToxicBillboardTex(
  eyebrow: string,
  headline: string,
  tags: string[],
  rightTop: string,
  rightBottom: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1792;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const paint = (logoImg?: HTMLImageElement) => {
    const bg = ctx.createLinearGradient(0, 0, c.width, c.height);
    bg.addColorStop(0, '#06070a');
    bg.addColorStop(0.35, '#120810');
    bg.addColorStop(0.55, '#090d16');
    bg.addColorStop(0.8, '#120810');
    bg.addColorStop(1, '#06070a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);

    // Architectural carbon diagonal micro-texture
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.lineWidth = 14;
    for (let lx = -160; lx < c.width + 160; lx += 96) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx + 130, c.height);
      ctx.stroke();
    }
    ctx.restore();

    // Sleek double hairline architectural frame
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    roundRectPath(ctx, 10, 10, c.width - 20, c.height - 20, 16);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.72)';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, 20, 20, c.width - 40, c.height - 40, 12);
    ctx.stroke();

    // Left Integrated TOXIC CITY Logo Frame
    const logoSize = 188;
    const logoX = 40;
    const logoY = 34;
    ctx.fillStyle = '#000000';
    roundRectPath(ctx, logoX, logoY, logoSize, logoSize, 16);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    roundRectPath(ctx, logoX, logoY, logoSize, logoSize, 16);
    ctx.stroke();

    if (logoImg) {
      ctx.save();
      roundRectPath(ctx, logoX + 4, logoY + 4, logoSize - 8, logoSize - 8, 12);
      ctx.clip();
      ctx.drawImage(logoImg, logoX + 4, logoY + 4, logoSize - 8, logoSize - 8);
      ctx.restore();
    } else {
      drawToxicFallbackLogo(ctx, logoX + logoSize * 0.5, logoY + logoSize * 0.5, logoSize - 10);
    }

    // Right VIP Badge
    const sealX = c.width - 332;
    const sealY = 40;
    const sealW = 288;
    const sealH = 176;
    const sealBg = ctx.createLinearGradient(sealX, sealY, sealX, sealY + sealH);
    sealBg.addColorStop(0, '#1f0a10');
    sealBg.addColorStop(1, '#0b0f17');
    ctx.fillStyle = sealBg;
    roundRectPath(ctx, sealX, sealY, sealW, sealH, 16);
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, sealX, sealY, sealW, sealH, 16);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#67e8f9';
    ctx.font = '800 19px system-ui, -apple-system, sans-serif';
    ctx.fillText('LIVE ON DECK', sealX + sealW * 0.5, sealY + 38);

    ctx.fillStyle = '#f87171';
    ctx.font = '900 40px system-ui, -apple-system, sans-serif';
    ctx.fillText(rightTop, sealX + sealW * 0.5, sealY + 90);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 19px system-ui, -apple-system, sans-serif';
    ctx.fillText(rightBottom, sealX + sealW * 0.5, sealY + 138);

    // Center Luxury Club Title
    const centerX = (254 + (sealX - 24)) * 0.5;
    const centerMaxW = sealX - 284;

    ctx.fillStyle = '#94a3b8';
    fitText(ctx, eyebrow, centerX, 46, centerMaxW, 20, 15, '800');

    ctx.save();
    ctx.shadowColor = 'rgba(239, 68, 68, 0.75)';
    ctx.shadowBlur = 14;
    const titleGrad = ctx.createLinearGradient(0, 68, 0, 148);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.55, '#fca5a5');
    titleGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = titleGrad;
    fitText(ctx, headline, centerX, 108, centerMaxW, 74, 40, '900');
    ctx.restore();

    ctx.font = '700 20px system-ui, -apple-system, sans-serif';
    const pillPadX = 20;
    const pillGap = 14;
    const tagWidths = tags.map((t) => ctx.measureText(t).width + pillPadX * 2);
    const totalTagsW = tagWidths.reduce((a, b) => a + b, 0) + pillGap * (tags.length - 1);
    let tx = centerX - totalTagsW * 0.5;
    tags.forEach((tag, i) => {
      const tw = tagWidths[i];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      roundRectPath(ctx, tx, 174, tw, 42, 8);
      ctx.fill();
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(239, 68, 68, 0.65)' : 'rgba(34, 211, 238, 0.55)';
      ctx.lineWidth = 1.8;
      roundRectPath(ctx, tx, 174, tw, 42, 8);
      ctx.stroke();
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(tag, tx + tw * 0.5, 195);
      tx += tw + pillGap;
    });

    tex.needsUpdate = true;
  };

  paint();
  onToxicLogoLoaded((img) => paint(img));
  return tex;
}

function createToxicBladeTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 1024;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const paint = (logoImg?: HTMLImageElement) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#14060b');
    grad.addColorStop(0.5, '#07090e');
    grad.addColorStop(1, '#071521');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 384, 1024);

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 8;
    roundRectPath(ctx, 10, 10, 364, 1004, 18);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, 22, 22, 340, 980, 12);
    ctx.stroke();

    ctx.fillStyle = '#000000';
    roundRectPath(ctx, 72, 48, 240, 240, 20);
    ctx.fill();
    if (logoImg) {
      ctx.save();
      roundRectPath(ctx, 76, 52, 232, 232, 16);
      ctx.clip();
      ctx.drawImage(logoImg, 76, 52, 232, 232);
      ctx.restore();
    } else {
      drawToxicFallbackLogo(ctx, 192, 168, 224);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#18181b';
    roundRectPath(ctx, 42, 316, 300, 64, 12);
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, 42, 316, 300, 64, 12);
    ctx.stroke();
    ctx.fillStyle = '#67e8f9';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText('DJ LIVE • 24/7', 192, 348);

    ctx.fillStyle = '#cbd5e1';
    fitText(ctx, 'YOUTH PUB & LOUNGE', 192, 426, 300, 24, 16, '800');

    ctx.save();
    ctx.shadowColor = 'rgba(239, 68, 68, 0.85)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ef4444';
    fitText(ctx, 'TOXIC', 192, 514, 310, 92, 56, '900');
    ctx.fillStyle = '#ffffff';
    fitText(ctx, 'BEER CLUB', 192, 598, 300, 44, 28, '900');
    ctx.restore();

    const items = [
      ['DJ ĐÁNH NHẠC LIVE', '#ef4444'],
      ['BIA ÚP NGƯỢC -4°C', '#22d3ee'],
      ['COCKTAIL & SOJU', '#e879f9'],
      ['VIP SKY LOUNGE TẦNG 2', '#f59e0b'],
    ];
    items.forEach(([label, col], idx) => {
      const y = 696 + idx * 72;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      roundRectPath(ctx, 36, y - 24, 312, 50, 10);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      roundRectPath(ctx, 36, y - 24, 312, 50, 10);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      fitText(ctx, label, 192, y, 286, 20, 15, '800');
    });

    tex.needsUpdate = true;
  };

  paint();
  onToxicLogoLoaded((img) => paint(img));
  return tex;
}

function createToxicMenuStandeeTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 896;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const paint = (logoImg?: HTMLImageElement) => {
    const bg = ctx.createLinearGradient(0, 0, 0, 896);
    bg.addColorStop(0, '#14060b');
    bg.addColorStop(0.55, '#07090e');
    bg.addColorStop(1, '#081826');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 896);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    roundRectPath(ctx, 10, 10, 492, 876, 20);
    ctx.stroke();

    ctx.fillStyle = '#000000';
    roundRectPath(ctx, 186, 28, 140, 140, 16);
    ctx.fill();
    if (logoImg) {
      ctx.save();
      roundRectPath(ctx, 190, 32, 132, 132, 14);
      ctx.clip();
      ctx.drawImage(logoImg, 190, 32, 132, 132);
      ctx.restore();
    } else {
      drawToxicFallbackLogo(ctx, 256, 98, 132);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#67e8f9';
    ctx.font = '800 19px system-ui, sans-serif';
    ctx.fillText('QUÁN NHẬU GIỚI TRẺ • BEER CLUB', 256, 192);

    ctx.fillStyle = '#dc2626';
    roundRectPath(ctx, 76, 218, 360, 42, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.fillText('DJ LIVE ON DECK • MỞ CỬA 24/7', 256, 239);

    const specials = [
      ['THÁP BIA ÚP NGƯỢC 3L', 'Tiger / Strongbow • Đá khô bốc khói', '169K', '#22d3ee'],
      ['COMBO SOJU YAKULT + MỒI', '4 Chai Soju + Khô Gà + Bò Khô', '249K', '#e879f9'],
      ['CHÂN GÀ RÚT XƯƠNG SỐT THÁI', 'Cay tê chuẩn gu giới trẻ', '119K', '#ef4444'],
      ['MẸT ĐỒ NƯỚNG MIX TOXIC', 'Ba chỉ cuộn nấm • Xúc xích • Bạch tuộc', '259K', '#f59e0b'],
      ['TẦNG 2 • VIP SKY LOUNGE', 'View thẳng sân khấu DJ & Phố Đi Bộ', 'OPEN', '#4ade80'],
    ];

    specials.forEach(([name, desc, price, accent], idx) => {
      const cy = 286 + idx * 114;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRectPath(ctx, 28, cy, 456, 94, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.8;
      roundRectPath(ctx, 28, cy, 456, 94, 14);
      ctx.stroke();

      ctx.fillStyle = accent;
      roundRectPath(ctx, 28, cy, 8, 94, 4);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      fitText(ctx, name, 50, cy + 32, 306, 23, 16, '900');
      ctx.fillStyle = '#cbd5e1';
      fitText(ctx, desc, 50, cy + 64, 306, 17, 13, '600');

      ctx.fillStyle = accent;
      roundRectPath(ctx, 376, cy + 23, 92, 48, 10);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#09090b';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.fillText(price, 422, cy + 47);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#67e8f9';
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText('TOXIC CITY >>> LÊN NHẠC LÀ QUẨY!', 256, 864);

    tex.needsUpdate = true;
  };

  paint();
  onToxicLogoLoaded((img) => paint(img));
  return tex;
}

function createDjBackdropTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const paint = (logoImg?: HTMLImageElement) => {
    const bg = ctx.createRadialGradient(512, 256, 20, 512, 256, 540);
    bg.addColorStop(0, '#300612');
    bg.addColorStop(0.55, '#07080d');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.16)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 1024; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    const lw = 330;
    const lh = 330;
    const lx = (1024 - lw) * 0.5;
    const ly = 56;
    ctx.fillStyle = '#000000';
    roundRectPath(ctx, lx, ly, lw, lh, 24);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 5;
    roundRectPath(ctx, lx, ly, lw, lh, 24);
    ctx.stroke();

    if (logoImg) {
      ctx.save();
      roundRectPath(ctx, lx + 6, ly + 6, lw - 12, lh - 12, 18);
      ctx.clip();
      ctx.drawImage(logoImg, lx + 6, ly + 6, lw - 12, lh - 12);
      ctx.restore();
    } else {
      drawToxicFallbackLogo(ctx, 512, ly + lh * 0.5, lw - 16);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#67e8f9';
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillText('★ TOXIC LIVE DJ STAGE • VINAHOUSE & EDM ★', 512, 444);

    tex.needsUpdate = true;
  };

  paint();
  onToxicLogoLoaded((img) => paint(img));
  return tex;
}

function createLoungeWallNeonTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#090b10';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
  ctx.lineWidth = 6;
  roundRectPath(ctx, 14, 14, 484, 228, 18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fca5a5';
  ctx.font = '900 58px system-ui, sans-serif';
  ctx.fillText('TOXIC NIGHTS', 256, 108);
  ctx.restore();
  ctx.fillStyle = '#67e8f9';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText('VIP SKY LOUNGE • DRAFT BEER & COCKTAILS', 256, 174);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createClubFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#090b12';
  ctx.fillRect(0, 0, 512, 512);
  const grid = 4;
  const step = 512 / grid;
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const x = gx * step;
      const y = gy * step;
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#11131a' : '#161b26';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      ctx.strokeStyle = (gx + gy) % 2 === 0 ? 'rgba(239,68,68,0.18)' : 'rgba(34,211,238,0.16)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 8, y + 8, step - 16, step - 16);
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

function createToxicGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.24)');
  grad.addColorStop(0.5, 'rgba(34, 211, 238, 0.12)');
  grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createToxicPubStructure(): ToxicPubBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const logoLoader = new THREE.TextureLoader();
  const toxicLogoTex = logoLoader.load(TOXIC_LOGO_URL);
  toxicLogoTex.colorSpace = THREE.SRGBColorSpace;
  toxicLogoTex.anisotropy = 4;

  const toxicLogoBoxMat = new THREE.MeshStandardMaterial({
    map: toxicLogoTex,
    emissive: 0xffffff,
    emissiveMap: toxicLogoTex,
    emissiveIntensity: 0.92,
    roughness: 0.25,
  });

  // Luxury Industrial & Architectural Nightclub Materials (calibrated to never blow out white)
  const patioDarkStoneMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.82 });
  const clubFloorTex = createClubFloorTexture();
  const clubFloorMat = new THREE.MeshStandardMaterial({
    map: clubFloorTex,
    emissive: 0x0f172a,
    emissiveIntensity: 0.14,
    roughness: 0.34,
    metalness: 0.25,
  });
  const floor2WoodMat = new THREE.MeshStandardMaterial({
    color: 0x261d17,
    roughness: 0.56,
    metalness: 0.1,
  });
  const ceilingSoffitMat = new THREE.MeshStandardMaterial({
    color: 0x0b0e14,
    roughness: 0.85,
    metalness: 0.18,
  });
  const obsidianSteelMat = new THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.38, metalness: 0.72 });
  const charcoalSteelMat = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.44, metalness: 0.65 });
  const slateWallMat = new THREE.MeshStandardMaterial({ color: 0x1d222c, roughness: 0.72, metalness: 0.18 });
  const warmWalnutMat = new THREE.MeshStandardMaterial({ color: 0x4e2d1a, roughness: 0.58, metalness: 0.08 });
  const brushedBrassMat = new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.26, metalness: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.9 });
  const smokedGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.38,
  });
  const foliageDarkMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.82 });
  const foliageBrightMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.76 });
  const redVelvetMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.58 });
  const redCushionMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
  const blackLeatherMat = new THREE.MeshStandardMaterial({ color: 0x090b0f, roughness: 0.42 });
  const speakerConeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.4 });
  const beerAmberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.18,
  });
  const warmBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  const neonRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.55,
    roughness: 0.25,
  });
  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 1.45,
    roughness: 0.25,
  });
  const neonPurpleMat = new THREE.MeshStandardMaterial({
    color: 0xe879f9,
    emissive: 0xc026d3,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });
  const ceilSpotMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  neonMats.push(neonRedMat, neonCyanMat, neonPurpleMat);
  lanternMats.push(ceilSpotMat, warmBulbMat);

  const signDynamicMats: THREE.MeshStandardMaterial[] = [toxicLogoBoxMat];

  const poolTex = createToxicGlowPoolTex();
  const clubPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(clubPoolMat);

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

  const addPlantCluster = (px: number, py: number, pz: number, scale = 1.0) => {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 * scale, 1), foliageDarkMat);
    base.position.set(px, py + 0.25 * scale, pz);
    staticGroup.add(base);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + px;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.72 * scale, 6), foliageBrightMat);
      frond.position.set(px + Math.cos(ang) * 0.18 * scale, py + 0.52 * scale, pz + Math.sin(ang) * 0.18 * scale);
      frond.rotation.z = Math.cos(ang) * 0.42;
      frond.rotation.x = Math.sin(ang) * 0.42;
      staticGroup.add(frond);
    }
  };

  // =========================================================================
  // 1. OUTDOOR BEER GARDEN PATIO & FLOOR 1 SLABS (X = 147.0..180.0, Z = -14.0..+15.58)
  // =========================================================================
  addBox(172.0, 180.0, -0.25, 0.0, -14.0, 15.58, patioDarkStoneMat);
  addBox(147.0, 172.0, -0.25, 0.0, 12.0, 15.58, patioDarkStoneMat);
  addBox(147.2, 172.2, -0.25, 0.01, -13.6, 12.2, clubFloorMat);

  // Subtle VIP crimson-edge welcome carpet runner through South Portal
  addBox(158.4, 161.6, 0.012, 0.025, 9.8, 15.1, redVelvetMat);
  addBox(158.32, 158.4, 0.014, 0.028, 9.8, 15.1, brushedBrassMat);
  addBox(161.6, 161.68, 0.014, 0.028, 9.8, 15.1, brushedBrassMat);

  // Glowing dancefloor perimeter inlays (X = 152.2..163.2, Z = -8.2..+1.8)
  addBox(152.2, 163.2, 0.012, 0.022, -8.24, -8.14, neonCyanMat);
  addBox(152.2, 163.2, 0.012, 0.022, 1.76, 1.86, neonCyanMat);
  addBox(152.16, 152.26, 0.012, 0.022, -8.2, 1.8, neonRedMat);
  addBox(163.16, 163.26, 0.012, 0.022, -8.2, 1.8, neonRedMat);

  // Ambient nightlife glow pools (gentle additive floor tint)
  const addPool = (px: number, pz: number, sx: number, sz: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), clubPoolMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(px, 0.03, pz);
    staticGroup.add(m);
  };
  addPool(157.5, -3.5, 11.0, 10.0);
  addPool(160.0, 13.6, 8.5, 4.0);
  addPool(175.8, 1.5, 6.5, 14.0);

  // =========================================================================
  // 2. FLOOR 1 ARCHITECTURAL CURTAIN WALLS, CANOPY, STANCHIONS & STAIRCASE
  // =========================================================================
  // North Rear Wall & West Wall with Warm Walnut Acoustic Slats
  addBox(147.1, 172.4, 0.0, 4.4, -13.8, -13.3, slateWallMat);
  addBox(147.1, 147.7, 0.0, 4.4, -13.6, 12.4, slateWallMat);
  for (let rz = -12.0; rz <= 10.5; rz += 2.2) {
    addBox(146.92, 147.12, 0.0, 8.95, rz - 0.1, rz + 0.1, warmWalnutMat);
  }

  // South Boulevard Facade Wall (Open grand portal X = 156.5..163.5)
  // Left Bay (X = 147.2..156.5) - sleek dark stone spandrel + panoramic glass + acoustic wood slats
  addBox(147.2, 156.5, 0.0, 0.65, 11.9, 12.4, slateWallMat);
  addBox(147.2, 156.5, 0.65, 4.1, 12.12, 12.2, smokedGlassMat);
  addBox(147.2, 156.5, 4.1, 4.5, 11.8, 12.5, obsidianSteelMat);
  for (let mx = 148.0; mx <= 155.8; mx += 1.9) {
    addBox(mx - 0.05, mx + 0.05, 0.65, 4.1, 12.08, 12.26, obsidianSteelMat);
  }
  // Vertical walnut slats accent bay (far left corner)
  for (let sx = 147.55; sx <= 149.15; sx += 0.32) {
    addBox(sx - 0.06, sx + 0.06, 0.65, 4.1, 12.35, 12.48, warmWalnutMat);
  }

  // Right Bay (X = 163.5..172.3)
  addBox(163.5, 172.3, 0.0, 0.65, 11.9, 12.4, slateWallMat);
  addBox(163.5, 172.3, 0.65, 4.1, 12.12, 12.2, smokedGlassMat);
  addBox(163.5, 172.3, 4.1, 4.5, 11.8, 12.5, obsidianSteelMat);
  for (let mx = 164.2; mx <= 171.6; mx += 1.9) {
    addBox(mx - 0.05, mx + 0.05, 0.65, 4.1, 12.08, 12.26, obsidianSteelMat);
  }
  for (let sx = 170.35; sx <= 171.95; sx += 0.32) {
    addBox(sx - 0.06, sx + 0.06, 0.65, 4.1, 12.35, 12.48, warmWalnutMat);
  }

  // Sleek South Entrance Portal Pillars + Cantilevered Luxury Canopy + Illuminated TOXIC Plaque
  addBox(156.18, 156.55, 0.0, 4.25, 11.85, 12.5, obsidianSteelMat);
  addBox(163.45, 163.82, 0.0, 4.25, 11.85, 12.5, obsidianSteelMat);
  // Razor-thin architectural LED strips on portal pillars (replacing thick neon blocks)
  addBox(156.51, 156.57, 0.0, 4.1, 12.44, 12.51, neonRedMat);
  addBox(163.43, 163.49, 0.0, 4.1, 12.44, 12.51, neonRedMat);
  // Cantilevered Entrance Canopy jutting out to Z = 14.1
  addBox(155.6, 164.4, 4.02, 4.34, 12.1, 14.1, obsidianSteelMat);
  addBox(155.58, 164.42, 4.0, 4.05, 14.04, 14.12, neonCyanMat);
  addBox(155.58, 164.42, 4.32, 4.37, 14.04, 14.12, neonRedMat);
  // Canopy Centered Illuminated TOXIC Emblem Plaque
  addBox(159.35, 160.65, 4.05, 4.65, 14.02, 14.22, obsidianSteelMat);
  const canopyLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.52), toxicLogoBoxMat);
  canopyLogo.position.set(160.0, 4.35, 14.24);
  staticGroup.add(canopyLogo);
  // Recessed warm canopy downlights
  [157.5, 160.0, 162.5].forEach((lx) => {
    const down = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12), warmBulbMat);
    down.position.set(lx, 4.0, 13.3);
    staticGroup.add(down);
  });

  // Red Velvet VIP Rope Stanchions flanking South Entrance
  [156.3, 163.7].forEach((sx) => {
    [13.6, 14.9].forEach((sz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.92, 10), brushedBrassMat);
      post.position.set(sx, 0.46, sz);
      staticGroup.add(post);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.05, 12), obsidianSteelMat);
      base.position.set(sx, 0.025, sz);
      staticGroup.add(base);
    });
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), redVelvetMat);
    rope.rotation.x = Math.PI / 2;
    rope.position.set(sx, 0.78, 14.25);
    staticGroup.add(rope);
  });

  // East Phố Đi Bộ Facade Wall (Open portal Z = -1.5..+5.5) + Cantilevered Side Canopy
  addBox(171.9, 172.4, 0.0, 0.65, -13.6, -1.5, slateWallMat);
  addBox(172.08, 172.2, 0.65, 4.1, -13.4, -1.5, smokedGlassMat);
  addBox(171.8, 172.5, 4.1, 4.5, -13.6, -1.5, obsidianSteelMat);
  for (let mz = -12.0; mz <= -2.5; mz += 2.2) {
    addBox(172.06, 172.24, 0.65, 4.1, mz - 0.05, mz + 0.05, obsidianSteelMat);
  }

  addBox(171.9, 172.4, 0.0, 0.65, 5.5, 12.4, slateWallMat);
  addBox(172.08, 172.2, 0.65, 4.1, 5.5, 12.4, smokedGlassMat);
  addBox(171.8, 172.5, 4.1, 4.5, 5.5, 12.4, obsidianSteelMat);
  for (let mz = 6.5; mz <= 11.5; mz += 2.2) {
    addBox(172.06, 172.24, 0.65, 4.1, mz - 0.05, mz + 0.05, obsidianSteelMat);
  }

  // East Portal Sleek Columns & Thin LED Strips + Canopy
  addBox(171.85, 172.5, 0.0, 4.25, -1.78, -1.45, obsidianSteelMat);
  addBox(171.85, 172.5, 0.0, 4.25, 5.45, 5.78, obsidianSteelMat);
  addBox(172.45, 172.52, 0.0, 4.1, -1.52, -1.46, neonCyanMat);
  addBox(172.45, 172.52, 0.0, 4.1, 5.46, 5.52, neonCyanMat);
  addBox(172.2, 173.6, 4.02, 4.3, -1.8, 5.8, obsidianSteelMat);
  addBox(173.54, 173.62, 4.0, 4.06, -1.8, 5.8, neonRedMat);

  // Rolling Security Shutters (Closed 07:00 - 16:00) on South Boulevard & East Phố Đi Bộ Portals
  const toxicShutterTex = createRollingShutterTexture({
    title: 'TOXIC BEER CLUB',
    hoursLabel: 'MỞ CỬA: 16:00 – 07:00 SÁNG',
    accentHex: '#dc2626',
  });
  const toxicShutterMat = new THREE.MeshStandardMaterial({
    map: toxicShutterTex,
    roughness: 0.48,
    metalness: 0.55,
  });
  const southPortalShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'toxic_south_shutter',
      axis: 'x',
      pos: 12.15,
      spanCenter: 160.0,
      width: 6.9,
      baseY: 0.0,
      topY: 4.02,
    },
    toxicShutterMat,
    obsidianSteelMat
  );
  const eastPortalShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'toxic_east_shutter',
      axis: 'z',
      pos: 172.15,
      spanCenter: 2.0,
      width: 6.9,
      baseY: 0.0,
      topY: 4.02,
    },
    toxicShutterMat,
    obsidianSteelMat
  );
  const toxicShutters: RollingShutterHandle[] = [southPortalShutter, eastPortalShutter];

  // Structural Matte Steel Columns
  [
    [147.4, -13.5],
    [147.4, 12.15],
    [172.15, -13.5],
    [172.15, 12.15],
    [175.95, 15.05],
    [175.95, -13.4],
    [147.4, 15.05],
  ].forEach(([cx, cz]) => {
    addBox(cx - 0.2, cx + 0.2, 0.0, 8.95, cz - 0.2, cz + 0.2, obsidianSteelMat);
  });

  // SW Sidewalk Luxury Basalt Planter Bench with Tropical Palms & Uplights
  addBox(147.0, 155.2, 0.0, 0.58, 14.5, 15.45, obsidianSteelMat);
  addBox(147.1, 155.1, 0.52, 0.60, 14.52, 15.42, warmWalnutMat);
  addBox(147.2, 155.0, 0.58, 0.65, 15.4, 15.46, warmBulbMat);
  for (let px = 148.0; px <= 154.2; px += 1.55) {
    addPlantCluster(px, 0.6, 14.95, 1.05);
  }

  // East Phố Đi Bộ Beer Garden Pergola Beams & Warm Festoon Bulb Strings
  for (let pz = -10.5; pz <= 11.5; pz += 5.5) {
    addBox(172.4, 179.6, 3.65, 3.82, pz - 0.1, pz + 0.1, obsidianSteelMat);
    for (let bx = 173.2; bx <= 179.2; bx += 1.5) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), warmBulbMat);
      bulb.position.set(bx, 3.55, pz);
      staticGroup.add(bulb);
    }
  }
  addBox(179.45, 179.65, 0.0, 3.85, -12.0, -11.8, obsidianSteelMat);
  addBox(179.45, 179.65, 0.0, 3.85, 11.4, 11.6, obsidianSteelMat);
  addBox(179.45, 179.65, 3.65, 3.82, -12.0, 11.6, obsidianSteelMat);

  // Industrial Steel Staircase to Floor 2 (X = 148.2..151.4, foot at South Z=11.4, top at North Z=5.6)
  const stairSteps = 14;
  for (let i = 0; i < stairSteps; i++) {
    const t0 = i / stairSteps;
    const t1 = (i + 1) / stairSteps;
    const sz1 = 11.4 - t0 * 5.8;
    const sz0 = 11.4 - t1 * 5.8;
    const sy = t1 * TOXIC_FLOOR2_Y;
    addBox(148.2, 151.3, sy - 0.16, sy, sz0, sz1, obsidianSteelMat);
    addBox(148.25, 151.25, sy - 0.025, sy + 0.01, sz1 - 0.04, sz1, warmBulbMat);
  }
  addBox(151.32, 151.5, 0.0, TOXIC_FLOOR2_Y, 5.4, 11.5, obsidianSteelMat);

  // =========================================================================
  // 3. HERO LIVE DJ STAGE, DUAL CDJs, SUBWOOFERS, EQ WALL & SWEEPING LASERS
  // =========================================================================
  addBox(150.8, 159.2, 0.0, 0.58, -13.2, -9.6, obsidianSteelMat);
  addBox(150.8, 159.2, 0.53, 0.59, -9.64, -9.57, neonRedMat);
  addBox(150.76, 150.83, 0.53, 0.59, -13.2, -9.6, neonCyanMat);
  addBox(159.17, 159.24, 0.53, 0.59, -13.2, -9.6, neonCyanMat);

  const wooferCones: THREE.Mesh[] = [];
  [151.6, 158.4].forEach((sx) => {
    addBox(sx - 0.72, sx + 0.72, 0.58, 2.35, -11.4, -10.1, blackLeatherMat);
    addBox(sx - 0.74, sx + 0.74, 2.31, 2.37, -11.42, -10.08, neonRedMat);
    [1.02, 1.82].forEach((wy) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 10, 20), neonCyanMat);
      ring.position.set(sx, wy, -10.08);
      staticGroup.add(ring);

      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.14, 0.12, 16), speakerConeMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(sx, wy, -10.06);
      cone.userData.noMerge = true;
      staticGroup.add(cone);
      wooferCones.push(cone);
    });
  });

  // Central DJ Booth Console Desk + TOXIC Logo Lightbox
  addBox(153.2, 156.8, 0.58, 1.54, -11.2, -10.1, obsidianSteelMat);
  addBox(153.16, 156.84, 1.52, 1.60, -11.24, -10.06, blackLeatherMat);
  addBox(153.18, 156.82, 1.49, 1.54, -10.07, -10.02, neonCyanMat);

  const djFrontLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), toxicLogoBoxMat);
  djFrontLogo.position.set(155.0, 1.04, -10.03);
  staticGroup.add(djFrontLogo);

  const platters: THREE.Mesh[] = [];
  [154.05, 155.95].forEach((px) => {
    addBox(px - 0.34, px + 0.34, 1.60, 1.67, -10.95, -10.30, obsidianSteelMat);
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20), chromeMat);
    platter.position.set(px, 1.68, -10.62);
    platter.userData.noMerge = true;
    staticGroup.add(platter);
    platters.push(platter);

    const vinylMark = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.04), neonRedMat);
    vinylMark.position.set(0, 0.025, 0.06);
    platter.add(vinylMark);
  });
  addBox(154.62, 155.38, 1.60, 1.68, -10.96, -10.28, blackLeatherMat);
  addBox(154.74, 154.82, 1.68, 1.70, -10.85, -10.42, neonCyanMat);
  addBox(155.18, 155.26, 1.68, 1.70, -10.85, -10.42, neonRedMat);
  const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.03), neonCyanMat);
  laptopScreen.position.set(155.0, 1.92, -10.35);
  laptopScreen.rotation.x = 0.25;
  staticGroup.add(laptopScreen);

  // Giant Backlit DJ LED Backdrop Wall (7.4m x 2.8m) + 16 Animated Equalizer Bars
  const djBackdropMat = new THREE.MeshStandardMaterial({
    map: createDjBackdropTex(),
    emissive: 0xffffff,
    emissiveMap: createDjBackdropTex(),
    emissiveIntensity: 0.95,
  });
  signDynamicMats.push(djBackdropMat);
  addBox(151.1, 158.9, 1.15, 4.15, -13.28, -13.14, obsidianSteelMat);
  const djScreen = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.8), djBackdropMat);
  djScreen.position.set(155.0, 2.65, -13.12);
  staticGroup.add(djScreen);

  const eqBars: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const side = i < 8 ? -1 : 1;
    const idxInSide = i < 8 ? i : i - 8;
    const bx = side < 0 ? 151.65 + idxInSide * 0.22 : 156.85 + idxInSide * 0.22;
    const barMat = i % 2 === 0 ? neonRedMat : neonCyanMat;
    const geo = new THREE.BoxGeometry(0.14, 1.0, 0.08);
    geo.translate(0, 0.5, 0);
    const bar = new THREE.Mesh(geo, barMat);
    bar.position.set(bx, 1.45, -13.04);
    bar.userData.noMerge = true;
    staticGroup.add(bar);
    eqBars.push(bar);
  }

  // Overhead Atrium Truss & Illuminated Geometric Neon Ring + 6 Sweeping Volumetric Lasers
  addBox(151.2, 162.4, 7.65, 7.88, -12.6, -12.35, obsidianSteelMat);
  addBox(151.2, 162.4, 7.65, 7.88, -3.4, -3.15, obsidianSteelMat);
  addBox(151.2, 151.45, 7.65, 7.88, -12.6, -3.15, obsidianSteelMat);
  addBox(162.15, 162.4, 7.65, 7.88, -12.6, -3.15, obsidianSteelMat);

  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.06, 8, 28), neonRedMat);
  haloRing.rotation.x = Math.PI / 2;
  haloRing.position.set(156.8, 7.52, -7.8);
  staticGroup.add(haloRing);

  const laserBeams: Array<{ pivot: THREE.Group; mat: THREE.MeshBasicMaterial; phase: number; axis: 'x' | 'z' }> = [];
  const beamColors = [0xef4444, 0x22d3ee, 0xd946ef, 0x22d3ee, 0xef4444, 0xf59e0b];
  [
    [152.6, -12.4, 0, 'x'],
    [155.0, -12.4, 1.1, 'z'],
    [157.4, -12.4, 2.2, 'x'],
    [153.4, -3.3, 3.3, 'z'],
    [156.6, -3.3, 4.4, 'x'],
    [159.8, -3.3, 5.5, 'z'],
  ].forEach(([lx, lz, ph, ax], idx) => {
    const pivot = new THREE.Group();
    pivot.position.set(lx as number, 7.62, lz as number);
    pivot.userData.noMerge = true;

    const bMat = new THREE.MeshBasicMaterial({
      color: beamColors[idx % beamColors.length],
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const coneGeo = new THREE.ConeGeometry(1.35, 7.3, 14, 1, true);
    coneGeo.translate(0, -3.65, 0);
    const cone = new THREE.Mesh(coneGeo, bMat);
    cone.userData.noMerge = true;
    pivot.add(cone);
    staticGroup.add(pivot);
    laserBeams.push({ pivot, mat: bMat, phase: ph as number, axis: ax as 'x' | 'z' });
  });

  // =========================================================================
  // 4. FLOOR 1 NEON COCKTAIL & CRAFT BEER BAR (X = 162.6..171.2, Z = -13.2..-9.0)
  // =========================================================================
  addBox(162.6, 171.2, 0.0, 1.12, -10.2, -9.2, obsidianSteelMat);
  addBox(162.5, 171.3, 1.12, 1.22, -10.35, -9.05, blackLeatherMat);
  addBox(162.55, 171.25, 0.85, 0.91, -9.14, -9.08, neonCyanMat);
  addBox(162.55, 171.25, 1.10, 1.14, -9.06, -9.02, brushedBrassMat);
  addBox(162.8, 171.2, 0.0, 3.65, -13.2, -12.75, obsidianSteelMat);
  [1.3, 2.1, 2.9].forEach((sy, sIdx) => {
    addBox(163.0, 171.0, sy, sy + 0.06, -12.8, -12.45, sIdx === 1 ? neonRedMat : neonCyanMat);
    for (let bx = 163.5; bx <= 170.5; bx += 0.55) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.34, 8),
        Math.round(bx * 2) % 2 === 0 ? beerAmberMat : neonPurpleMat
      );
      bottle.position.set(bx, sy + 0.24, -12.62);
      staticGroup.add(bottle);
    }
  });
  for (let sx = 163.6; sx <= 170.2; sx += 1.35) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.16, 0.72, 10), chromeMat);
    leg.position.set(sx, 0.36, -8.55);
    staticGroup.add(leg);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.10, 14), redCushionMat);
    seat.position.set(sx, 0.76, -8.55);
    staticGroup.add(seat);
  }

  // =========================================================================
  // 5. FLOOR 1 & PATIO YOUTH NHẬU HIGH-TOP TABLES WITH BEER TOWERS
  // =========================================================================
  const addYouthTableSet = (tx: number, tz: number, baseY = 0, withTower = true) => {
    const g = new THREE.Group();
    g.position.set(tx, baseY, tz);

    const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.04, 12), obsidianSteelMat);
    basePlate.position.y = 0.02;
    g.add(basePlate);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.78, 10), obsidianSteelMat);
    post.position.y = 0.41;
    g.add(post);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 1.05), blackLeatherMat);
    top.position.y = 0.80;
    g.add(top);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.025, 1.08), brushedBrassMat);
    rim.position.y = 0.77;
    g.add(rim);

    if (withTower) {
      const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 12), obsidianSteelMat);
      towerBase.position.set(0, 0.90, 0);
      g.add(towerBase);
      const towerTube = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.48, 12), beerAmberMat);
      towerTube.position.set(0, 1.18, 0);
      g.add(towerTube);
      const towerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.05, 12), neonRedMat);
      towerCap.position.set(0, 1.44, 0);
      g.add(towerCap);
    }

    [
      [-0.45, -0.82],
      [0.45, -0.82],
      [-0.45, 0.82],
      [0.45, 0.82],
    ].forEach(([sx, sz]) => {
      const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.14, 0.50, 8), chromeMat);
      sLeg.position.set(sx, 0.25, sz);
      g.add(sLeg);
      const sTop = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.08, 12), redCushionMat);
      sTop.position.set(sx, 0.52, sz);
      g.add(sTop);
    });

    staticGroup.add(g);
  };

  [
    [176.2, -9.2],
    [176.2, -5.0],
    [176.2, 8.2],
    [168.4, 13.8],
  ].forEach(([tx, tz]) => addYouthTableSet(tx, tz, 0, true));

  [
    [166.8, -4.6],
    [166.8, 2.2],
    [166.8, 8.2],
    [156.0, 7.6],
  ].forEach(([tx, tz]) => addYouthTableSet(tx, tz, 0, true));

  // =========================================================================
  // 6. FLOOR 2 ARCHITECTURAL CURTAIN-GLASS FACADE, SKY-BALCONY & DARK COFFERED CEILING
  // =========================================================================
  const f2Y = TOXIC_FLOOR2_Y;
  addBox(162.0, 176.1, f2Y - 0.16, f2Y, -13.6, 15.2, floor2WoodMat);
  addBox(147.3, 162.0, f2Y - 0.16, f2Y, -1.0, 5.6, floor2WoodMat);
  addBox(151.5, 162.0, f2Y - 0.16, f2Y, 5.6, 15.2, floor2WoodMat);
  addBox(147.3, 148.2, f2Y - 0.16, f2Y, 5.6, 15.2, floor2WoodMat);
  addBox(147.3, 151.5, f2Y - 0.16, f2Y, 11.8, 15.2, floor2WoodMat);
  addBox(147.3, 151.5, f2Y - 0.16, f2Y, -13.6, -1.0, floor2WoodMat);

  // Dark Matte Coffered Ceiling Overhang (NO blinding full-area cyan slab!) + Subtle Perimeter LED Strips
  addBox(147.0, 176.5, 8.75, 9.18, -13.8, 15.4, ceilingSoffitMat);
  addBox(147.05, 176.45, 8.70, 8.76, 15.28, 15.36, neonCyanMat); // Thin South perimeter edge cove
  addBox(176.34, 176.42, 8.70, 8.76, -13.7, 15.36, neonCyanMat); // Thin East perimeter edge cove
  // Architectural exposed steel ceiling ribs + warm recessed pendants over Floor 2 Sky-Balcony
  for (let rx = 149.0; rx <= 174.5; rx += 5.1) {
    addBox(rx - 0.08, rx + 0.08, 8.64, 8.76, -13.5, 15.2, obsidianSteelMat);
  }
  [
    [152.5, 13.8],
    [160.5, 13.8],
    [168.5, 13.8],
    [174.2, 9.0],
    [174.2, 1.0],
    [174.2, -7.0],
  ].forEach(([px, pz]) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), obsidianSteelMat);
    stem.position.set(px, 8.42, pz);
    staticGroup.add(stem);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), warmBulbMat);
    globe.position.set(px, 8.06, pz);
    staticGroup.add(globe);
  });

  // Floor 2 West & North Walls
  addBox(147.1, 147.7, f2Y, 8.8, -13.6, 12.4, slateWallMat);
  addBox(147.1, 172.4, f2Y, 8.8, -13.8, -13.3, slateWallMat);

  // Floor 2 South Curtain-Glass Bays (Replacing old blank black blocks!)
  // West Bay (X = 147.2..155.5)
  addBox(147.2, 155.5, f2Y, f2Y + 0.52, 11.9, 12.4, slateWallMat); // Spandrel base
  addBox(147.2, 155.5, f2Y + 0.52, 8.55, 12.12, 12.22, smokedGlassMat); // Panoramic Curtain Glass
  addBox(147.2, 155.5, 8.55, 8.8, 11.85, 12.45, obsidianSteelMat);
  for (let mx = 149.2; mx <= 155.4; mx += 1.55) {
    addBox(mx - 0.05, mx + 0.05, f2Y + 0.52, 8.55, 12.08, 12.28, obsidianSteelMat);
  }
  // Vertical walnut + LED architectural louver fins on outer left bay
  for (let sx = 147.55; sx <= 149.0; sx += 0.36) {
    addBox(sx - 0.06, sx + 0.06, f2Y + 0.52, 8.55, 12.34, 12.48, warmWalnutMat);
  }
  addBox(155.35, 155.5, f2Y, 8.7, 12.36, 12.46, neonRedMat);

  // East Bay (X = 165.5..172.3)
  addBox(165.5, 172.3, f2Y, f2Y + 0.52, 11.9, 12.4, slateWallMat);
  addBox(165.5, 172.3, f2Y + 0.52, 8.55, 12.12, 12.22, smokedGlassMat);
  addBox(165.5, 172.3, 8.55, 8.8, 11.85, 12.45, obsidianSteelMat);
  for (let mx = 165.6; mx <= 170.5; mx += 1.6) {
    addBox(mx - 0.05, mx + 0.05, f2Y + 0.52, 8.55, 12.08, 12.28, obsidianSteelMat);
  }
  for (let sx = 170.55; sx <= 172.0; sx += 0.36) {
    addBox(sx - 0.06, sx + 0.06, f2Y + 0.52, 8.55, 12.34, 12.48, warmWalnutMat);
  }
  addBox(165.5, 165.65, f2Y, 8.7, 12.36, 12.46, neonRedMat);

  // Floor 2 East Phố Đi Bộ Curtain-Glass Facade Bays (Z = -13.6..-3.5 & Z = 7.5..12.4)
  addBox(171.9, 172.4, f2Y, f2Y + 0.52, -13.6, -3.5, slateWallMat);
  addBox(172.08, 172.2, f2Y + 0.52, 8.55, -13.4, -3.5, smokedGlassMat);
  addBox(171.85, 172.45, 8.55, 8.8, -13.6, -3.5, obsidianSteelMat);
  for (let mz = -12.0; mz <= -4.0; mz += 2.0) {
    addBox(172.06, 172.24, f2Y + 0.52, 8.55, mz - 0.05, mz + 0.05, obsidianSteelMat);
  }

  addBox(171.9, 172.4, f2Y, f2Y + 0.52, 7.5, 12.4, slateWallMat);
  addBox(172.08, 172.2, f2Y + 0.52, 8.55, 7.5, 12.4, smokedGlassMat);
  addBox(171.85, 172.45, 8.55, 8.8, 7.5, 12.4, obsidianSteelMat);
  for (let mz = 8.5; mz <= 11.5; mz += 1.8) {
    addBox(172.06, 172.24, f2Y + 0.52, 8.55, mz - 0.05, mz + 0.05, obsidianSteelMat);
  }

  // Floor 2 Interior Illuminated "TOXIC NIGHTS" Back-Wall Neon Sign (visible from street through glass!)
  const loungeNeonMat = new THREE.MeshStandardMaterial({
    map: createLoungeWallNeonTex(),
    emissive: 0xffffff,
    emissiveMap: createLoungeWallNeonTex(),
    emissiveIntensity: 0.9,
  });
  signDynamicMats.push(loungeNeonMat);
  const loungeWallSign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.2), loungeNeonMat);
  loungeWallSign.position.set(166.5, f2Y + 2.4, -13.24);
  staticGroup.add(loungeWallSign);

  // Floor 2 Outer Sky-Balcony Frameless Smoked-Glass Railings + Warm Brass Handrail + Balcony Plants
  addBox(175.88, 176.12, f2Y, f2Y + 1.05, -13.5, 15.1, smokedGlassMat);
  addBox(175.85, 176.15, f2Y + 1.05, f2Y + 1.13, -13.5, 15.1, obsidianSteelMat);
  addBox(175.82, 175.88, f2Y + 0.02, f2Y + 0.06, -13.4, 15.0, warmBulbMat); // Subtle floor edge LED
  addBox(147.3, 176.1, f2Y, f2Y + 1.05, 15.02, 15.22, smokedGlassMat);
  addBox(147.3, 176.1, f2Y + 1.05, f2Y + 1.13, 15.0, 15.25, obsidianSteelMat);
  addBox(147.4, 176.0, f2Y + 0.02, f2Y + 0.06, 15.16, 15.22, warmBulbMat);
  addBox(147.25, 147.55, f2Y, f2Y + 1.05, 12.2, 15.2, smokedGlassMat);

  // Balcony Planters on Floor 2 Corners
  addPlantCluster(148.2, f2Y + 0.02, 14.3, 0.95);
  addPlantCluster(175.0, f2Y + 0.02, 14.3, 0.95);
  addPlantCluster(175.0, f2Y + 0.02, -12.6, 0.95);

  // Floor 2 Double-Height Atrium Glass Balustrade overlooking DJ Stage below
  addBox(151.5, 162.0, f2Y, f2Y + 1.05, -1.2, -1.0, smokedGlassMat);
  addBox(151.5, 162.0, f2Y + 1.05, f2Y + 1.13, -1.2, -1.0, neonRedMat);
  addBox(151.5, 151.7, f2Y, f2Y + 1.05, -13.2, -1.0, smokedGlassMat);
  addBox(161.85, 162.05, f2Y, f2Y + 1.05, -13.2, -1.0, smokedGlassMat);
  addBox(161.85, 162.05, f2Y + 1.05, f2Y + 1.13, -13.2, -1.0, neonCyanMat);

  // Floor 2 Stairwell Balustrade
  addBox(151.35, 151.55, f2Y, f2Y + 1.05, 5.4, 11.9, smokedGlassMat);
  addBox(147.8, 151.55, f2Y, f2Y + 1.05, 11.8, 12.0, smokedGlassMat);

  // Floor 2 VIP Bottle Service Bar & Sky Lounge Tables
  addBox(166.8, 171.2, f2Y, f2Y + 1.1, -12.8, -9.2, obsidianSteelMat);
  addBox(166.7, 171.3, f2Y + 0.85, f2Y + 0.92, -9.26, -9.18, neonPurpleMat);
  [
    [167.2, -3.5],
    [167.2, 4.5],
    [158.0, 6.2],
    [174.1, -6.5],
    [174.1, 4.5],
    [160.5, 13.5],
  ].forEach(([tx, tz]) => addYouthTableSet(tx, tz, f2Y, true));

  // =========================================================================
  // 7. INTEGRATED ARCHITECTURAL PARAPET SIGNAGE, BLADE SIGN, TOTEM MONOLITH & STANDEES
  // =========================================================================
  // 7A. Continuous Dark Titanium Architectural Parapet Crown (Y = 9.05..12.55)
  addBox(147.2, 176.2, 9.05, 9.45, 12.0, 12.6, obsidianSteelMat);
  addBox(172.0, 176.2, 9.05, 9.45, -13.6, 12.6, obsidianSteelMat);

  // 7B. South Boulevard Main Flagship Fascia Recessed into Parapet (X = 152.0..171.2)
  const southBillboardTex = createToxicBillboardTex(
    '★ QUÁN NHẬU GIỚI TRẺ & BEER CLUB • PHỐ ĐI BỘ ★',
    'TOXIC BEER CLUB',
    ['DJ ĐÁNH NHẠC LIVE', 'BIA ÚP NGƯỢC -4°C', 'SOJU & MỒI BÉN', 'TẦNG 2 VIP'],
    'DJ LIVE',
    'MỞ CỬA 24/7'
  );
  const southBillboardMat = new THREE.MeshStandardMaterial({
    map: southBillboardTex,
    emissive: 0xffffff,
    emissiveMap: southBillboardTex,
    emissiveIntensity: 0.92,
  });
  signDynamicMats.push(southBillboardMat);
  addBox(152.0, 171.6, 9.45, 12.45, 11.95, 12.45, obsidianSteelMat);
  addBox(152.0, 171.6, 12.45, 12.6, 11.9, 12.55, brushedBrassMat); // Top architectural cap trim
  const southBillboardFace = new THREE.Mesh(new THREE.PlaneGeometry(19.0, 2.7), southBillboardMat);
  southBillboardFace.position.set(161.8, 10.95, 12.48);
  staticGroup.add(southBillboardFace);

  // 7C. Integrated Architectural Left Crown Emblem Pylon (Flush with Roofline — no floating box!)
  addBox(147.4, 151.8, 9.15, 13.05, 11.85, 12.55, obsidianSteelMat);
  addBox(147.35, 151.85, 13.05, 13.22, 11.8, 12.62, neonRedMat);
  for (let lx = 147.8; lx <= 148.6; lx += 0.25) {
    addBox(lx - 0.05, lx + 0.05, 9.45, 12.75, 12.52, 12.62, warmWalnutMat);
  }
  const crownLogoPanel = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 2.55), toxicLogoBoxMat);
  crownLogoPanel.position.set(150.1, 11.15, 12.58);
  staticGroup.add(crownLogoPanel);

  // 7D. East Phố Đi Bộ Integrated Parapet Billboard
  const eastBillboardTex = createToxicBillboardTex(
    '★ BEER CLUB & YOUTH PUB • PHỐ ĐI BỘ AEON ★',
    'TOXIC • DJ & NHẬU',
    ['VINAHOUSE • EDM', 'THÁP BIA TƯƠI', 'COMBO ĐỒ NƯỚNG', 'BAN CÔNG VIP'],
    'OPEN 24/7',
    'DJ LIVE TRONG QUÁN'
  );
  const eastBillboardMat = new THREE.MeshStandardMaterial({
    map: eastBillboardTex,
    emissive: 0xffffff,
    emissiveMap: eastBillboardTex,
    emissiveIntensity: 0.92,
  });
  signDynamicMats.push(eastBillboardMat);
  addBox(171.95, 172.42, 9.45, 12.45, -8.3, 10.7, obsidianSteelMat);
  addBox(171.9, 172.5, 12.45, 12.6, -8.35, 10.75, brushedBrassMat);
  const eastBillboardFace = new THREE.Mesh(new THREE.PlaneGeometry(18.5, 2.65), eastBillboardMat);
  eastBillboardFace.rotation.y = Math.PI / 2;
  eastBillboardFace.position.set(172.44, 10.95, 1.2);
  staticGroup.add(eastBillboardFace);

  // 7E. Projecting Corner Vertical Blade Sign at SE Balcony Corner
  const bladeTex = createToxicBladeTex();
  const bladeMat = new THREE.MeshStandardMaterial({
    map: bladeTex,
    emissive: 0xffffff,
    emissiveMap: bladeTex,
    emissiveIntensity: 0.92,
  });
  signDynamicMats.push(bladeMat);
  addBox(176.1, 176.8, 6.72, 6.86, 14.8, 14.96, obsidianSteelMat);
  addBox(176.6, 177.56, 5.55, 8.05, 14.78, 14.98, obsidianSteelMat);
  [-0.11, 0.11].forEach((oz, idx) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.4), bladeMat);
    face.rotation.y = idx === 0 ? Math.PI : 0;
    face.position.set(177.08, 6.8, 14.88 + oz);
    staticGroup.add(face);
  });

  // 7F. Sleek SE Patio Corner Luxury Totem Monolith (X = 178.45, Z = 14.45)
  addBox(178.02, 178.88, 0.0, 3.85, 14.02, 14.88, obsidianSteelMat);
  addBox(177.98, 178.92, 0.0, 0.25, 13.98, 14.92, brushedBrassMat);
  addBox(177.98, 178.92, 3.82, 3.9, 13.98, 14.92, neonRedMat);
  const totemFront = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), toxicLogoBoxMat);
  totemFront.position.set(178.45, 3.1, 14.90);
  staticGroup.add(totemFront);
  const totemEast = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), toxicLogoBoxMat);
  totemEast.rotation.y = Math.PI / 2;
  totemEast.position.set(178.90, 3.1, 14.45);
  staticGroup.add(totemEast);

  // 7G. Two Illuminated Welcome Menu Standees
  const menuTex = createToxicMenuStandeeTex();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xffffff,
    emissiveMap: menuTex,
    emissiveIntensity: 0.9,
  });
  signDynamicMats.push(menuMat);
  addBox(155.38, 156.28, 0.0, 0.12, 13.08, 13.42, obsidianSteelMat);
  addBox(155.4, 156.26, 0.12, 1.88, 13.16, 13.34, obsidianSteelMat);
  const southMenuFace = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.66), menuMat);
  southMenuFace.position.set(155.83, 1.0, 13.36);
  staticGroup.add(southMenuFace);

  addBox(172.38, 172.72, 0.0, 0.12, -2.72, -1.68, obsidianSteelMat);
  addBox(172.44, 172.66, 0.12, 1.88, -2.70, -1.70, obsidianSteelMat);
  const eastMenuFace = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.66), menuMat);
  eastMenuFace.rotation.y = Math.PI / 2;
  eastMenuFace.position.set(172.68, 1.0, -2.2);
  staticGroup.add(eastMenuFace);

  // =========================================================================
  // 8. CALIBRATED NIGHTCLUB POINT LIGHTS (RICH MOOD WITHOUT BLOWOUT!)
  // =========================================================================
  const registerClubLight = (
    color: number,
    x: number,
    y: number,
    z: number,
    dist: number,
    dayInt: number,
    nightInt: number
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 1.35);
    l.position.set(x, y, z);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => 1.0,
    });
  };

  registerClubLight(0xef4444, 155.0, 3.6, -8.5, 28, 4.5, 22); // DJ Stage Crimson Glow
  registerClubLight(0x06b6d4, 163.0, 3.6, -1.5, 28, 4.5, 20); // Dancefloor & Cocktail Bar Cyan
  registerClubLight(0xf59e0b, 175.8, 3.4, 2.0, 28, 4.5, 20); // East Phố Đi Bộ Patio Warm Festoon Glow
  registerClubLight(0xfb7185, 160.0, 3.6, 13.2, 26, 4.0, 18); // South Boulevard Entrance Wash
  registerClubLight(0xf59e0b, 165.5, 7.6, 3.0, 30, 4.5, 20); // Floor 2 VIP Lounge Warm Amber

  let beatClock = 0;
  let closedFactor = 0.0;

  const registerClubLightScaled = (
    lIdx: number,
    minKeepClosed: number
  ) => {
    scaledLights[lIdx].getScale = () => Math.max(minKeepClosed, 1.0 - closedFactor);
  };
  registerClubLightScaled(0, 0.05);
  registerClubLightScaled(1, 0.05);
  registerClubLightScaled(2, 0.14);
  registerClubLightScaled(3, 0.14);
  registerClubLightScaled(4, 0.05);

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: ToxicPubNpcController | null,
    playerPos?: { x: number; z: number } | null,
    onUpdateDjAudio?: (volumeScale: number) => void
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isToxicPubOpenAtHour(rawHour);
    const isNightParty = isToxicNightPartyAtHour(rawHour);
    const targetClosed = isOpen ? 0.0 : 1.0;
    closedFactor = dt > 0 ? THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 3.5)) : targetClosed;
    for (let i = 0; i < toxicShutters.length; i++) {
      setShutterProgress(toxicShutters[i], closedFactor);
    }

    const openScale = 1.0 - closedFactor;
    beatClock += dt * openScale;
    const beatPulse = Math.pow(Math.max(0, Math.sin(beatClock * Math.PI * 2 * 2.2)), 4) * openScale;
    const partyMult = (isNightParty ? 1.0 : 0.55) * openScale;

    for (let i = 0; i < platters.length; i++) {
      platters[i].rotation.y += dt * (i === 0 ? 3.2 : -2.8) * openScale;
    }

    for (let i = 0; i < wooferCones.length; i++) {
      wooferCones[i].position.z = -10.06 + beatPulse * 0.045;
    }

    for (let i = 0; i < eqBars.length; i++) {
      const wave =
        0.28 +
        0.72 *
          Math.abs(
            Math.sin(beatClock * 7.5 + i * 0.68) * 0.65 + Math.cos(beatClock * 11.3 - i * 0.45) * 0.35
          );
      eqBars[i].scale.y = 0.12 + wave * 2.05 * (0.65 + 0.35 * beatPulse) * openScale;
    }

    for (let i = 0; i < laserBeams.length; i++) {
      const b = laserBeams[i];
      const swingA = Math.sin(beatClock * 1.85 + b.phase) * 0.42;
      const swingB = Math.cos(beatClock * 1.25 + b.phase * 1.3) * 0.28;
      if (b.axis === 'x') {
        b.pivot.rotation.x = swingA;
        b.pivot.rotation.z = swingB;
      } else {
        b.pivot.rotation.z = swingA;
        b.pivot.rotation.x = swingB;
      }
      b.mat.opacity = (0.07 + 0.10 * lampFactor + 0.05 * beatPulse) * partyMult;
    }

    const neonBase = (0.78 + lampFactor * 0.92 + beatPulse * 0.32) * openScale;
    neonRedMat.emissiveIntensity = neonBase + 0.12 * lampFactor * (1 - openScale);
    neonCyanMat.emissiveIntensity = (0.78 + lampFactor * 0.88 + (1 - beatPulse) * 0.26) * openScale;
    neonPurpleMat.emissiveIntensity = neonBase * 0.9;
    ceilSpotMat.emissiveIntensity = (0.55 + lampFactor * 0.95) * openScale;
    warmBulbMat.emissiveIntensity = (0.65 + lampFactor * 1.0) * openScale;
    clubPoolMat.opacity = (0.45 + 0.35 * partyMult) * lampFactor * openScale;

    const signGlow = (0.76 + lampFactor * 0.34) * Math.max(0.22, openScale);
    for (let i = 0; i < signDynamicMats.length; i++) {
      signDynamicMats[i].emissiveIntensity = signGlow;
    }

    if (playerPos && onUpdateDjAudio && dt > 0) {
      const djVol = computeToxicDjVolume(playerPos.x, playerPos.z, isOpen);
      onUpdateDjAudio(djVol);
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
// LIVE NPCS (28 NPCS): LIVE DJ, DOOR HOSTS, BARTENDERS, WAITERS, DANCERS,
// SEATED DINERS & CONTINUOUS STREAM OF GUESTS ENTERING AND EXITING
// =========================================================================

interface ToxicNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  role: 'dj' | 'dancer' | 'host' | 'staff' | 'diner_seated' | 'diner_walk';
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  idleYaw?: number;
  seated?: boolean;
  cheerOffset: number;
  exitPath: THREE.Vector3[];
  exitWp: { idx: number };
  glbHandle: GlbHumanHandle;
}

function buildToxicCharacterMesh(
  helpers: HospitalCharacterHelpers,
  shirt: number,
  pants: number,
  skin: string,
  hairColor: number,
  opts: { isDj?: boolean; isHost?: boolean; apronColor?: number | null; seated?: boolean }
) {
  const grp = new THREE.Group();
  const hips = new THREE.Group();
  grp.add(hips);

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.25), shirtMat);
  torso.position.y = 1.04;
  hips.add(torso);

  if (opts.apronColor !== null && opts.apronColor !== undefined) {
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.48, 0.27),
      new THREE.MeshStandardMaterial({ color: opts.apronColor, roughness: 0.6 })
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

  if (opts.isDj) {
    const hpMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.025, 8, 16, Math.PI), hpMat);
    band.position.set(0, 1.54, 0);
    hips.add(band);
    [-0.165, 0.165].forEach((ex) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), hpMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(ex, 1.49, 0);
      hips.add(cup);
    });
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.06, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.6 })
    );
    shades.position.set(0, 1.50, 0.145);
    hips.add(shades);
  } else if (opts.isHost) {
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.055, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.6 })
    );
    shades.position.set(0, 1.50, 0.145);
    hips.add(shades);
  }

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

  if (opts.seated) {
    hips.position.y = -0.26;
    leftLeg.rotation.x = -Math.PI / 2;
    rightLeg.rotation.x = -Math.PI / 2;
    leftArm.rotation.x = -0.4;
    rightArm.rotation.x = -0.4;
  }

  return { group: grp, hips, leftArm, rightArm, leftLeg, rightLeg };
}

export class ToxicPubNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: ToxicNpcActor[] = [];
  private wasOpen = true;
  private fullyCleared = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const f2Y = TOXIC_FLOOR2_Y;
    const specs: Array<{
      role: 'dj' | 'dancer' | 'host' | 'staff' | 'diner_seated' | 'diner_walk';
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      apron?: number | null;
      isDj?: boolean;
      isHost?: boolean;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      seated?: boolean;
      speed?: number;
    }> = [
      // 1. LIVE DJ ON THE STAGE DECKS
      {
        role: 'dj',
        shirt: 0x09090b,
        pants: 0x18181b,
        skin: '#fbd3b4',
        hair: 0xef4444,
        isDj: true,
        waypoints: [new THREE.Vector3(155.0, 0.58, -11.55)],
        idleYaw: 0,
      },
      // 2. Two Door Hosts / VIP Bouncers greeting arriving guests at South Canopy
      {
        role: 'host',
        shirt: 0x0f172a,
        pants: 0x09090b,
        skin: '#f5c7a3',
        hair: 0x111827,
        isHost: true,
        waypoints: [new THREE.Vector3(156.9, 0.02, 13.6)],
        idleYaw: 0.35,
      },
      {
        role: 'host',
        shirt: 0x0f172a,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x18181b,
        isHost: true,
        waypoints: [new THREE.Vector3(163.1, 0.02, 13.6)],
        idleYaw: -0.35,
      },
      // 3. Six Youth Clubbers Dancing on the Central Dance Floor
      {
        role: 'dancer',
        shirt: 0xef4444,
        pants: 0x0f172a,
        skin: '#fce0c8',
        hair: 0x111827,
        waypoints: [new THREE.Vector3(154.0, 0.02, -5.8)],
        idleYaw: Math.PI,
      },
      {
        role: 'dancer',
        shirt: 0x22d3ee,
        pants: 0x18181b,
        skin: '#fbd3b4',
        hair: 0x27150a,
        waypoints: [new THREE.Vector3(157.8, 0.02, -5.4)],
        idleYaw: Math.PI - 0.3,
      },
      {
        role: 'dancer',
        shirt: 0xd946ef,
        pants: 0x1e293b,
        skin: '#f5c7a3',
        hair: 0x18181b,
        waypoints: [new THREE.Vector3(155.8, 0.02, -3.1)],
        idleYaw: Math.PI + 0.25,
      },
      {
        role: 'dancer',
        shirt: 0xfacc15,
        pants: 0x0f172a,
        skin: '#fce0c8',
        hair: 0x3b0764,
        waypoints: [new THREE.Vector3(159.4, 0.02, -3.8)],
        idleYaw: -Math.PI * 0.78,
      },
      {
        role: 'dancer',
        shirt: 0xfb7185,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [new THREE.Vector3(153.2, 0.02, -2.6)],
        idleYaw: Math.PI - 0.4,
      },
      {
        role: 'dancer',
        shirt: 0x34d399,
        pants: 0x18181b,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [new THREE.Vector3(160.8, 0.02, -6.2)],
        idleYaw: -Math.PI + 0.4,
      },
      // 4. Two Bartenders (Floor 1 & Floor 2 VIP) + Three Waiters
      {
        role: 'staff',
        shirt: 0x0f172a,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        apron: 0x06b6d4,
        waypoints: [new THREE.Vector3(166.8, 0.02, -11.2)],
        idleYaw: 0,
      },
      {
        role: 'staff',
        shirt: 0x0f172a,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x18181b,
        apron: 0xd946ef,
        waypoints: [new THREE.Vector3(169.0, f2Y + 0.02, -11.0)],
        idleYaw: 0,
      },
      {
        role: 'staff',
        shirt: 0xdc2626,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x18181b,
        apron: 0x09090b,
        waypoints: [
          new THREE.Vector3(164.0, 0.02, -8.2),
          new THREE.Vector3(163.5, 0.02, 2.0),
          new THREE.Vector3(173.8, 0.02, 2.0),
          new THREE.Vector3(173.8, 0.02, -6.5),
          new THREE.Vector3(163.5, 0.02, 2.0),
        ],
        speed: 1.55,
      },
      {
        role: 'staff',
        shirt: 0xdc2626,
        pants: 0x09090b,
        skin: '#f5c7a3',
        hair: 0x111827,
        apron: 0x09090b,
        waypoints: [
          new THREE.Vector3(153.2, 0.02, 11.4),
          new THREE.Vector3(149.8, 0.02, 11.4),
          new THREE.Vector3(149.8, f2Y + 0.02, 5.6),
          new THREE.Vector3(163.5, f2Y + 0.02, 2.5),
          new THREE.Vector3(164.5, f2Y + 0.02, -6.5),
          new THREE.Vector3(163.5, f2Y + 0.02, 2.5),
          new THREE.Vector3(149.8, f2Y + 0.02, 5.6),
          new THREE.Vector3(149.8, 0.02, 11.4),
        ],
        speed: 1.5,
      },
      // 5. Seated Guests (Patio, Floor 1 Indoor, Floor 2 Sky-Balcony)
      { role: 'diner_seated', shirt: 0x06b6d4, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(175.75, 0.02, -5.82)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xf43f5e, pants: 0x0f172a, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(176.65, 0.02, -4.18)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0xa855f7, pants: 0x18181b, skin: '#e8b48e', hair: 0x111827, waypoints: [new THREE.Vector3(175.75, 0.02, 7.38)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0x22c55e, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(166.35, 0.02, 1.38)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xf97316, pants: 0x1e293b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(167.25, 0.02, 3.02)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0x3b82f6, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(166.75, f2Y + 0.02, -4.32)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xec4899, pants: 0x18181b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(173.65, f2Y + 0.02, 3.68)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xeab308, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(160.05, f2Y + 0.02, 12.68)], idleYaw: 0, seated: true },

      // 6. EIGHT DYNAMIC WALKING GUESTS ENTERING & EXITING CONSTANTLY (BOTH PORTALS + STAIRS)
      // Guest A: Enters from South Boulevard Sidewalk -> Inside Dance Floor -> Exits East Phố Đi Bộ -> Loops along street back to South Portal
      {
        role: 'diner_walk',
        shirt: 0x8b5cf6,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(153.5, 0.02, 17.5),
          new THREE.Vector3(160.0, 0.02, 16.5),
          new THREE.Vector3(160.0, 0.02, 10.2),
          new THREE.Vector3(161.2, 0.02, 2.0),
          new THREE.Vector3(173.8, 0.02, 2.0),
          new THREE.Vector3(183.0, 0.02, 2.2),
          new THREE.Vector3(182.8, 0.02, 16.8),
          new THREE.Vector3(162.0, 0.02, 17.2),
        ],
        speed: 1.45,
      },
      // Guest B: Arrives from Phố Đi Bộ -> Enters East Portal -> Visits Cocktail Bar -> Exits South Canopy -> Loops around corner
      {
        role: 'diner_walk',
        shirt: 0xf43f5e,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(184.5, 0.02, 1.5),
          new THREE.Vector3(173.5, 0.02, 1.8),
          new THREE.Vector3(163.2, 0.02, -4.8),
          new THREE.Vector3(161.5, 0.02, 4.0),
          new THREE.Vector3(160.2, 0.02, 14.5),
          new THREE.Vector3(164.0, 0.02, 17.4),
          new THREE.Vector3(183.5, 0.02, 17.4),
        ],
        speed: 1.5,
      },
      // Guest C: Enters South Portal -> Climbs SW Staircase up to Floor 2 Sky-Balcony -> Strolls balcony overlooking street -> Exits back down
      {
        role: 'diner_walk',
        shirt: 0x06b6d4,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(161.0, 0.02, 17.2),
          new THREE.Vector3(159.5, 0.02, 11.4),
          new THREE.Vector3(149.8, 0.02, 11.4),
          new THREE.Vector3(149.8, f2Y + 0.02, 5.6),
          new THREE.Vector3(154.0, f2Y + 0.02, 10.5),
          new THREE.Vector3(164.0, f2Y + 0.02, 10.5),
          new THREE.Vector3(164.0, f2Y + 0.02, 1.5),
          new THREE.Vector3(153.5, f2Y + 0.02, 2.2),
          new THREE.Vector3(149.8, f2Y + 0.02, 5.6),
          new THREE.Vector3(149.8, 0.02, 11.4),
          new THREE.Vector3(159.5, 0.02, 11.4),
          new THREE.Vector3(159.8, 0.02, 17.2),
        ],
        speed: 1.38,
      },
      // Guest D: Friend group entry from East Boulevard -> East Patio -> South Portal exit
      {
        role: 'diner_walk',
        shirt: 0xf59e0b,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(179.0, 0.02, 17.8),
          new THREE.Vector3(173.8, 0.02, 15.2),
          new THREE.Vector3(173.8, 0.02, 2.5),
          new THREE.Vector3(163.0, 0.02, 2.5),
          new THREE.Vector3(160.2, 0.02, 11.2),
          new THREE.Vector3(160.5, 0.02, 17.8),
        ],
        speed: 1.42,
      },
      // Guest E: Phố Đi Bộ North -> Steps into Outdoor Beer Garden -> Enters Dancefloor -> Exits Phố Đi Bộ North
      {
        role: 'diner_walk',
        shirt: 0xe879f9,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x3b0764,
        waypoints: [
          new THREE.Vector3(183.0, 0.02, -10.5),
          new THREE.Vector3(178.2, 0.02, -8.0),
          new THREE.Vector3(174.0, 0.02, 1.5),
          new THREE.Vector3(162.5, 0.02, 1.5),
          new THREE.Vector3(161.8, 0.02, -5.0),
          new THREE.Vector3(163.0, 0.02, 2.2),
          new THREE.Vector3(174.5, 0.02, 2.2),
          new THREE.Vector3(183.0, 0.02, -2.0),
        ],
        speed: 1.36,
      },
      // Guest F: Enters from South West -> Checks Menu Standee -> Walks into Lounge -> Climbs to Floor 2 East Balcony -> Returns
      {
        role: 'diner_walk',
        shirt: 0x10b981,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(150.0, 0.02, 17.0),
          new THREE.Vector3(157.8, 0.02, 15.5),
          new THREE.Vector3(158.8, 0.02, 11.4),
          new THREE.Vector3(149.8, 0.02, 11.4),
          new THREE.Vector3(149.8, f2Y + 0.02, 5.6),
          new THREE.Vector3(164.0, f2Y + 0.02, 1.0),
          new THREE.Vector3(172.5, f2Y + 0.02, 1.0),
          new THREE.Vector3(172.5, f2Y + 0.02, 10.0),
          new THREE.Vector3(164.0, f2Y + 0.02, 10.0),
          new THREE.Vector3(149.8, f2Y + 0.02, 5.6),
          new THREE.Vector3(149.8, 0.02, 11.4),
          new THREE.Vector3(159.2, 0.02, 11.4),
          new THREE.Vector3(158.0, 0.02, 17.0),
        ],
        speed: 1.4,
      },
      // Guest G: Fast VIP entering from South -> heading straight to Cocktail Bar -> walking out to Phố Đi Bộ
      {
        role: 'diner_walk',
        shirt: 0x38bdf8,
        pants: 0x0f172a,
        skin: '#e8b48e',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(160.2, 0.02, 18.2),
          new THREE.Vector3(160.2, 0.02, 10.0),
          new THREE.Vector3(163.2, 0.02, -7.2),
          new THREE.Vector3(163.5, 0.02, 2.0),
          new THREE.Vector3(174.5, 0.02, 2.0),
          new THREE.Vector3(184.5, 0.02, 6.0),
          new THREE.Vector3(181.0, 0.02, 18.0),
        ],
        speed: 1.55,
      },
      // Guest H: Strolling East-West in front of South VIP Canopy & Stepping Inside
      {
        role: 'diner_walk',
        shirt: 0xffffff,
        pants: 0x18181b,
        skin: '#fce0c8',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(174.0, 0.02, 16.5),
          new THREE.Vector3(160.0, 0.02, 16.0),
          new THREE.Vector3(160.0, 0.02, 4.5),
          new THREE.Vector3(162.8, 0.02, -1.5),
          new THREE.Vector3(160.0, 0.02, 4.5),
          new THREE.Vector3(160.0, 0.02, 16.0),
          new THREE.Vector3(148.5, 0.02, 16.6),
          new THREE.Vector3(160.0, 0.02, 16.6),
        ],
        speed: 1.32,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildToxicCharacterMesh(helpers, s.shirt, s.pants, s.skin, s.hair, {
        isDj: s.isDj,
        isHost: s.isHost,
        apronColor: s.apron ?? null,
        seated: s.seated,
      });
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const spec =
        s.role === 'host'
          ? CASHIER_NPC_MODEL
          : s.seated
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
        initialState: s.seated
          ? 'Sit'
          : s.role === 'dj' || s.role === 'dancer'
          ? 'Wave'
          : s.waypoints.length > 1
          ? 'Walk'
          : 'Idle',
        phaseOffset: idx * 0.85,
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
        speed: s.speed ?? 1.4,
        walkPhase: idx * 0.85,
        idleYaw: s.idleYaw,
        seated: s.seated,
        cheerOffset: idx * 1.25,
        exitPath: [new THREE.Vector3(172.0, 0.02, 2.0), new THREE.Vector3(181.5, 0.02, 2.0)],
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
    const isOpen = isToxicPubOpenAtHour(rawHour);

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
        a.glbHandle.setAnimState(
          a.seated ? 'Sit' : a.role === 'dj' || a.role === 'dancer' ? 'Wave' : a.waypoints.length > 1 ? 'Walk' : 'Idle'
        );
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
        const done = advanceNpcExitPath(a.group, a.exitPath, a.exitWp, 2.2, dt);
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

      if (a.role === 'dj') {
        a.glbHandle.setAnimState('Wave');
        a.walkPhase += dt * 8.4;
        a.hips.position.y = Math.abs(Math.sin(a.walkPhase)) * 0.04;
        a.group.rotation.y = Math.sin(a.walkPhase * 0.25) * 0.16;
        a.leftArm.rotation.x = -0.85 + Math.sin(a.walkPhase * 2.0) * 0.18;
        a.rightArm.rotation.x = -1.65 + Math.sin(a.walkPhase) * 0.55;
        a.rightArm.rotation.z = -0.25 - Math.cos(a.walkPhase * 0.5) * 0.2;
        continue;
      }

      if (a.role === 'dancer') {
        a.glbHandle.setAnimState('Wave');
        a.walkPhase += dt * 6.9;
        const bounce = Math.abs(Math.sin(a.walkPhase + a.cheerOffset));
        a.hips.position.y = bounce * 0.06;
        a.group.rotation.y = (a.idleYaw ?? Math.PI) + Math.sin(a.walkPhase * 0.35 + a.cheerOffset) * 0.38;
        a.leftArm.rotation.x = -0.95 + Math.sin(a.walkPhase + a.cheerOffset) * 0.65;
        a.rightArm.rotation.x = -1.15 - Math.sin(a.walkPhase + a.cheerOffset) * 0.65;
        a.leftLeg.rotation.x = Math.sin(a.walkPhase + a.cheerOffset) * 0.22;
        a.rightLeg.rotation.x = -Math.sin(a.walkPhase + a.cheerOffset) * 0.22;
        continue;
      }

      if (a.role === 'host') {
        a.glbHandle.setAnimState('Idle');
        a.walkPhase += dt * 2.2;
        a.group.rotation.y = (a.idleYaw ?? 0) + Math.sin(a.walkPhase * 0.4 + a.cheerOffset) * 0.15;
        a.hips.position.y = Math.sin(a.walkPhase) * 0.008;
        a.rightArm.rotation.x = -0.22 + Math.max(0, Math.sin(a.walkPhase * 0.7)) * 0.35;
        a.leftArm.rotation.x = 0.05;
        continue;
      }

      if (a.waypoints.length <= 1) {
        a.glbHandle.setAnimState(a.seated ? 'Sit' : 'Idle');
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.walkPhase += dt * 2.4;
        if (a.seated) {
          const toastWave = Math.max(0, Math.sin(a.walkPhase * 0.8 + a.cheerOffset));
          a.rightArm.rotation.x = -0.4 - toastWave * 0.9;
          a.leftArm.rotation.x = -0.4;
        } else {
          a.hips.position.y = Math.sin(a.walkPhase) * 0.01;
          a.rightArm.rotation.x = -0.45 + Math.sin(a.walkPhase * 2.2) * 0.28;
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
