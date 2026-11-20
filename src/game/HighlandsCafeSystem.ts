import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isHighlandsOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface HighlandsCafeBuildResult {
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
    npcController?: HighlandsNpcController | null
  ) => void;
}

// =========================================================================
// HIGHLANDS COFFEE CORNER FLAGSHIP — NGÃ TƯ SƠN TÂY (SE CORNER)
// Directly East across Sơn Tây Nam Street from DESERT (X = 328.4..353.4)
// Plot Footprint: X = 383.8 .. 411.8 (28.0m wide), Z = 42.5 .. 70.5 (28.0m deep)
// Corner Curve Center: (CX = 396.5, CZ = 55.2), Building Radius R = 7.0m, Patio Radius R_p = 12.1m
// Double Corner Glass Entrance Doorway: 45° NW corner at (391.55, 50.25) facing Ngã Tư Sơn Tây
// =========================================================================

const CORNER_CX = 396.5;
const CORNER_CZ = 55.2;
const BLDG_R = 7.0;
const NORTH_END_X = 410.8;
const SOUTH_END_Z = 69.5;
const DOOR_CENTER_X = CORNER_CX - BLDG_R * Math.SQRT1_2; // 391.55025
const DOOR_CENTER_Z = CORNER_CZ - BLDG_R * Math.SQRT1_2; // 50.25025

export const HIGHLANDS_COLLIDERS: IntersectionColliderBox[] = [
  // Solid Back Walls (East & South)
  { minX: 410.35, maxX: 411.2, minZ: 48.0, maxZ: 69.85, floor: 1 }, // East Rear Wall
  { minX: 389.25, maxX: 411.2, minZ: 69.05, maxZ: 69.9, floor: 1 }, // South Rear Wall

  // Front Straight Storefront Curtain Glass Walls
  { minX: 396.4, maxX: 410.8, minZ: 47.85, maxZ: 48.55, floor: 1 }, // North Storefront Glass
  { minX: 389.15, maxX: 389.85, minZ: 55.1, maxZ: 69.5, floor: 1 }, // West Storefront Glass

  // Curved NW Corner Glass Side Piers (slim stepped segments hugging R=7.0 arc, leaving full 3.05m doorway wide open)
  { minX: 393.15, maxX: 394.8, minZ: 48.55, maxZ: 49.15, floor: 1 }, // North-of-Door Curved Glass Pier A
  { minX: 394.7, maxX: 396.5, minZ: 48.05, maxZ: 48.65, floor: 1 }, // North-of-Door Curved Glass Pier B
  { minX: 389.85, maxX: 390.45, minZ: 51.85, maxZ: 53.5, floor: 1 }, // West-of-Door Curved Glass Pier A
  { minX: 389.35, maxX: 389.95, minZ: 53.4, maxZ: 55.2, floor: 1 }, // West-of-Door Curved Glass Pier B

  // Outdoor Patio Umbrella & Cafe Table Clusters (leaves wide corner plaza & perimeter walkways open)
  { minX: 396.9, maxX: 401.3, minZ: 44.3, maxZ: 46.8, floor: 1 }, // North-NW Patio Set 1
  { minX: 404.0, maxX: 408.8, minZ: 44.3, maxZ: 46.8, floor: 1 }, // North-NE Patio Set 2
  { minX: 385.5, maxX: 388.1, minZ: 56.0, maxZ: 60.4, floor: 1 }, // West-NW Patio Set 3
  { minX: 385.5, maxX: 388.1, minZ: 63.0, maxZ: 67.4, floor: 1 }, // West-SW Patio Set 4

  // Architectural Accent Totem & Sidewalk Sign near West/South Patio Corner
  { minX: 384.6, maxX: 385.7, minZ: 53.0, maxZ: 54.0, floor: 1 }, // Timber Uplight Totem

  // Indoor Service Counter & Barista Zone (East Interior Wing)
  { minX: 403.3, maxX: 407.6, minZ: 53.5, maxZ: 64.2, floor: 1 },
  { minX: 409.1, maxX: 410.6, minZ: 53.5, maxZ: 64.8, floor: 1 }, // Back-Bar Credenza & Syrup Wall

  // North-East Retail Merchandise Shelf (Roast Coffee Bags, Phin Filters & Tumblers)
  { minX: 409.6, maxX: 410.5, minZ: 48.7, maxZ: 52.9, floor: 1 },

  // West Self-Service Condiment & Tray Return Station
  { minX: 389.9, maxX: 390.95, minZ: 62.9, maxZ: 64.8, floor: 1 },

  // Indoor Rear Sofa Banquette & Lounge Tables (South Interior Wing)
  { minX: 392.0, maxX: 401.6, minZ: 66.8, maxZ: 69.0, floor: 1 },

  // Indoor Central Cafe Seating Tables
  { minX: 394.6, maxX: 397.4, minZ: 56.6, maxZ: 58.6, floor: 1 },
  { minX: 394.6, maxX: 397.4, minZ: 61.2, maxZ: 63.2, floor: 1 },
];

// =========================================================================
// PROCEDURAL BRANDING & ARCHITECTURAL TEXTURES (HIGHLANDS COFFEE)
// =========================================================================

function drawHighlandsOvalEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  darkHex: string,
  creamHex: string
) {
  ctx.save();
  // Outer oval ring
  ctx.fillStyle = creamHex;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = darkHex;
  ctx.lineWidth = Math.max(4, rx * 0.08);
  ctx.stroke();

  // Inner landscape curves: stylized Vietnamese coffee terraces, hills, and cup wave
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.88, ry * 0.84, 0, 0, Math.PI * 2);
  ctx.clip();

  // Upper mountain / coffee-bean ridge
  ctx.fillStyle = darkHex;
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy - ry * 0.12);
  ctx.bezierCurveTo(cx - rx * 0.45, cy - ry * 0.62, cx + rx * 0.05, cy - ry * 0.56, cx + rx * 0.42, cy - ry * 0.24);
  ctx.bezierCurveTo(cx + rx * 0.68, cy - ry * 0.02, cx + rx * 0.85, cy - ry * 0.18, cx + rx, cy - ry * 0.28);
  ctx.lineTo(cx + rx, cy + ry);
  ctx.lineTo(cx - rx, cy + ry);
  ctx.closePath();
  ctx.fill();

  // Flowing cream wave ribbon 1
  ctx.fillStyle = creamHex;
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy + ry * 0.08);
  ctx.bezierCurveTo(cx - rx * 0.38, cy - ry * 0.26, cx + rx * 0.16, cy - ry * 0.08, cx + rx, cy + ry * 0.16);
  ctx.lineTo(cx + rx, cy + ry * 0.42);
  ctx.bezierCurveTo(cx + rx * 0.22, cy + ry * 0.14, cx - rx * 0.35, cy + ry * 0.04, cx - rx, cy + ry * 0.30);
  ctx.closePath();
  ctx.fill();

  // Lower dark hill terrace + cream crescent highlight
  ctx.fillStyle = creamHex;
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy + ry * 0.54);
  ctx.bezierCurveTo(cx - rx * 0.28, cy + ry * 0.32, cx + rx * 0.32, cy + ry * 0.44, cx + rx, cy + ry * 0.62);
  ctx.lineTo(cx + rx, cy + ry);
  ctx.lineTo(cx - rx, cy + ry);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  stepAngle: number,
  flipBottom: boolean
) {
  ctx.save();
  const totalSpan = stepAngle * (text.length - 1);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const angle = startAngle - totalSpan * 0.5 + i * stepAngle;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + (flipBottom ? -Math.PI * 0.5 : Math.PI * 0.5));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function createHighlandsRoundLogoTex(isMural = false): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.5;
  const bgHex = isMural ? 'rgba(92, 32, 22, 0.85)' : '#4c1d18';
  const ringHex = isMural ? '#f3dfc8' : '#ffffff';

  // Outer white/cream border disc
  ctx.fillStyle = ringHex;
  ctx.beginPath();
  ctx.arc(cx, cy, 488, 0, Math.PI * 2);
  ctx.fill();

  // Deep espresso-burgundy disc
  ctx.fillStyle = bgHex;
  ctx.beginPath();
  ctx.arc(cx, cy, 462, 0, Math.PI * 2);
  ctx.fill();

  // Inner concentric fine ring
  ctx.strokeStyle = ringHex;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 324, 0, Math.PI * 2);
  ctx.stroke();

  // Central iconic oval crest
  drawHighlandsOvalEmblem(ctx, cx, cy, 290, 210, isMural ? '#5c2016' : '#4c1d18', ringHex);

  // Curved "HIGHLANDS" top & "COFFEE" bottom arc typography
  ctx.fillStyle = ringHex;
  ctx.font = '900 92px "Montserrat", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawArcText(ctx, 'HIGHLANDS', cx, cy, 392, -Math.PI * 0.5, 0.255, false);

  ctx.font = '900 84px "Montserrat", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  // Bottom arc reads left-to-right when viewed upright
  const botText = 'COFFEE';
  const botStep = 0.26;
  const botSpan = botStep * (botText.length - 1);
  for (let i = 0; i < botText.length; i++) {
    const angle = Math.PI * 0.5 + botSpan * 0.5 - i * botStep;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * 394, cy + Math.sin(angle) * 394);
    ctx.rotate(angle - Math.PI * 0.5);
    ctx.fillText(botText[i], 0, 0);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsWordmarkTex(): THREE.CanvasTexture {
  const w = 1536;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Subtle warm amber back-halo behind crisp white 3D channel letters
  ctx.save();
  ctx.shadowColor = 'rgba(251, 191, 36, 0.85)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 156px "Montserrat", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIGHLANDS', w * 0.5, h * 0.52);
  ctx.restore();

  // Sharp second pass for razor-clean foreground face
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 156px "Montserrat", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIGHLANDS', w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsCopperGridTex(isUpperLouver = false): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (isUpperLouver) {
    grad.addColorStop(0, '#5a2318');
    grad.addColorStop(0.55, '#6e2b1d');
    grad.addColorStop(1, '#4d1c13');
  } else {
    grad.addColorStop(0, '#7c2f1f');
    grad.addColorStop(0.5, '#923a25');
    grad.addColorStop(1, '#6c2618');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Architectural perforated copper-mesh square grid panels matching Image 2 & Image 3
  const cols = 8;
  const rows = 8;
  const cw = w / cols;
  const ch = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const shade = ((r * 7 + col * 13) % 5) * 0.025;
      ctx.fillStyle = `rgba(255, 195, 145, ${0.03 + shade})`;
      ctx.fillRect(col * cw + 3, r * ch + 3, cw - 6, ch - 6);

      if (isUpperLouver) {
        // Subtle dark semi-open architectural backing louvers
        ctx.fillStyle = 'rgba(20, 14, 12, 0.36)';
        for (let l = 10; l < ch - 6; l += 14) {
          ctx.fillRect(col * cw + 6, r * ch + l, cw - 12, 5);
        }
      } else {
        // Fine perforated metal dot texture
        ctx.fillStyle = 'rgba(42, 16, 10, 0.16)';
        for (let py = 10; py < ch - 6; py += 12) {
          for (let px = 10; px < cw - 6; px += 12) {
            ctx.fillRect(col * cw + px, r * ch + py, 3, 3);
          }
        }
      }

      // Crisp dark metallic panel seam joints
      ctx.strokeStyle = 'rgba(34, 14, 10, 0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(col * cw + 1, r * ch + 1, cw - 2, ch - 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 2);
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsPatioTileTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#c8bfb4';
  ctx.fillRect(0, 0, size, size);

  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const n = ((x * 17 + y * 31) % 7) - 3;
      const v = 198 + n * 3;
      ctx.fillStyle = `rgb(${v}, ${v - 7}, ${v - 14})`;
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  ctx.strokeStyle = 'rgba(85, 76, 68, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsUmbrellaSkirtTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(0, h - 18, w, 18);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIGHLANDS COFFEE', w * 0.5, h * 0.44);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsMenuBoardTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 448;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#291512';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(28, 28, w - 56, 74);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIGHLANDS COFFEE  •  MENU', w * 0.5, 66);

  const cols = [
    {
      title: 'CÀ PHÊ PHIN',
      items: [
        ['Phin Sữa Đá', '29.000đ'],
        ['Phin Đen Đá', '29.000đ'],
        ['Bạc Xỉu Đá', '29.000đ'],
        ['Phindi Hạnh Nhân', '45.000đ'],
      ],
    },
    {
      title: 'TRÀ & FREEZE',
      items: [
        ['Trà Sen Vàng', '45.000đ'],
        ['Trà Thạch Đào', '45.000đ'],
        ['Freeze Trà Xanh', '55.000đ'],
        ['Cookies & Cream', '55.000đ'],
      ],
    },
    {
      title: 'BÁNH MÌ & BÁNH',
      items: [
        ['Bánh Mì Que Pate', '19.000đ'],
        ['Phô Mai Chanh Dây', '29.000đ'],
        ['Mousse Cacao', '35.000đ'],
        ['Tiramisu', '35.000đ'],
      ],
    },
  ];

  cols.forEach((col, ci) => {
    const x0 = 56 + ci * 316;
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(col.title, x0, 146);

    col.items.forEach(([name, price], ii) => {
      const y = 198 + ii * 54;
      ctx.fillStyle = '#fef3c7';
      ctx.font = '600 23px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(name, x0, y);

      ctx.fillStyle = '#fca5a5';
      ctx.font = '800 23px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(price, x0 + 276, y);
    });
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsFeatureWallTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#4c1d18');
  grad.addColorStop(1, '#7c2d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  drawHighlandsOvalEmblem(ctx, 185, h * 0.5, 118, 88, '#4c1d18', '#fef3c7');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 72px "Montserrat", system-ui, sans-serif';
  ctx.fillText('HIGHLANDS', 345, 134);
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 44px "Montserrat", system-ui, sans-serif';
  ctx.fillText('COFFEE  •  SINCE 1999', 345, 208);
  ctx.fillStyle = '#fca5a5';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('TỰ HÀO SINH RA TỪ ĐẤT VIỆT', 345, 272);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsStandeeTex(): THREE.CanvasTexture {
  const w = 320;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, w, 128);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.fillText('HIGHLANDS', w * 0.5, 48);
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('PHIN SỮA ĐÁ ĐẬM ĐÀ', w * 0.5, 92);

  ctx.fillStyle = '#7c2d12';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('TRÀ SEN VÀNG', w * 0.5, 200);
  ctx.fillText('FREEZE TRÀ XANH', w * 0.5, 250);

  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(w * 0.5, 360, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.fillText('29K+', w * 0.5, 362);

  ctx.fillStyle = '#334155';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('MỞ CỬA: 07:00 - 23:00', w * 0.5, 468);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(254, 215, 170, 0.36)');
  grad.addColorStop(0.55, 'rgba(251, 146, 60, 0.14)');
  grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHighlandsIndoorFloorTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#47362e';
  ctx.fillRect(0, 0, size, size);

  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const alt = ((x / step) + (y / step)) % 2 === 0;
      ctx.fillStyle = alt ? '#533f35' : '#403028';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      // Subtle terrazzo speckles
      ctx.fillStyle = 'rgba(255, 240, 220, 0.08)';
      ctx.fillRect(x + 12, y + 14, 4, 4);
      ctx.fillRect(x + 42, y + 36, 3, 3);
      ctx.fillStyle = 'rgba(185, 28, 28, 0.10)';
      ctx.fillRect(x + 28, y + 48, 3, 3);
    }
  }
  ctx.strokeStyle = '#291d18';
  ctx.lineWidth = 3;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.55, 0.55);
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsPosterTex(variant: 'sen' | 'phin' | 'origin'): THREE.CanvasTexture {
  const w = 320;
  const h = 420;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = variant === 'sen' ? '#3d1c16' : variant === 'phin' ? '#241410' : '#4a1d17';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  if (variant === 'sen') {
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(24, 24, w - 48, 54);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIGNATURE TEA', w * 0.5, 51);

    // Stylized golden lotus tea cup illustration
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(w * 0.5, 195, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.fillRect(w * 0.5 - 38, 155, 76, 86);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(w * 0.5 - 44, 145, 88, 16);

    ctx.fillStyle = '#fde68a';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText('TRÀ SEN VÀNG', w * 0.5, 315);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText('45.000đ', w * 0.5, 360);
  } else if (variant === 'phin') {
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(24, 24, w - 48, 54);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VIETNAMESE PHIN', w * 0.5, 51);

    ctx.fillStyle = '#f5e6d3';
    ctx.beginPath();
    ctx.arc(w * 0.5, 195, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(w * 0.5 - 34, 162, 68, 72);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(w * 0.5 - 40, 140, 80, 22);

    ctx.fillStyle = '#fde68a';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText('PHIN SỮA ĐÁ', w * 0.5, 315);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText('29.000đ', w * 0.5, 360);
  } else {
    drawHighlandsOvalEmblem(ctx, w * 0.5, 130, 86, 64, '#4a1d17', '#fef3c7');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText('CÀ PHÊ CAO NGUYÊN', w * 0.5, 245);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('LÂM ĐỒNG • ĐẮK LẮK', w * 0.5, 288);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText('100% HẠT CHỌN LỌC', w * 0.5, 330);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(46, 362, w - 92, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillText('NGUYÊN BẢN TỪ 1999', w * 0.5, 378);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHighlandsRetailHeaderTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 112;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 30px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CÀ PHÊ GÓI  •  BÌNH GIỮ NHIỆT', w * 0.5, h * 0.5);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// =========================================================================
// PARAMETRIC ROUNDED-CORNER FACADE SPINE & 3D WAVY CLADDING BUILDER
// =========================================================================

interface SpineSample {
  x: number;
  z: number;
  nx: number;
  nz: number;
  s: number; // arc length from East end (0..TOTAL_LEN)
  u: number; // normalized centered coordinate [-1..1], 0 = exact 45° NW corner
}

const NORTH_STRAIGHT_LEN = NORTH_END_X - CORNER_CX; // 14.3
const ARC_LEN = BLDG_R * (Math.PI * 0.5); // ~10.9956
const WEST_STRAIGHT_LEN = SOUTH_END_Z - CORNER_CZ; // 14.3
const TOTAL_SPINE_LEN = NORTH_STRAIGHT_LEN + ARC_LEN + WEST_STRAIGHT_LEN; // ~39.5956

function evalFacadeSpine(s: number): SpineSample {
  const sc = THREE.MathUtils.clamp(s, 0, TOTAL_SPINE_LEN);
  const u = (sc - TOTAL_SPINE_LEN * 0.5) / (TOTAL_SPINE_LEN * 0.5);

  if (sc <= NORTH_STRAIGHT_LEN) {
    // East -> Corner Tangent along North Wall (Z = 48.2, normal = (0, -1))
    return {
      x: NORTH_END_X - sc,
      z: CORNER_CZ - BLDG_R,
      nx: 0,
      nz: -1,
      s: sc,
      u,
    };
  }
  if (sc <= NORTH_STRAIGHT_LEN + ARC_LEN) {
    // Quarter circle: θ from 1.5π down to π
    const arcS = sc - NORTH_STRAIGHT_LEN;
    const theta = Math.PI * 1.5 - (arcS / ARC_LEN) * (Math.PI * 0.5);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return {
      x: CORNER_CX + BLDG_R * cosT,
      z: CORNER_CZ + BLDG_R * sinT,
      nx: cosT,
      nz: sinT,
      s: sc,
      u,
    };
  }
  // Corner Tangent -> South along West Wall (X = 389.5, normal = (-1, 0))
  const wS = sc - (NORTH_STRAIGHT_LEN + ARC_LEN);
  return {
    x: CORNER_CX - BLDG_R,
    z: CORNER_CZ + wS,
    nx: -1,
    nz: 0,
    s: sc,
    u,
  };
}

// Smooth organic wave functions matching Image 2 & Image 3
function evalWaveHeights(u: number) {
  const cornerArch = Math.exp(-u * u * 7.5); // peaks smoothly at NW corner (u = 0)
  const wingRipple1 = Math.sin(u * Math.PI * 3.5);
  const wingRipple2 = Math.cos(u * Math.PI * 4.5);

  // Wave 1 (above glass storefront): dips along wings, swells gracefully over corner entrance
  const y1Bot = 3.58 + 0.36 * cornerArch + 0.16 * Math.cos(u * Math.PI * 5.0);
  const y1Top = y1Bot + 0.78 + 0.14 * cornerArch;

  // Wave 2 (middle copper band): undulates across whole facade
  const y2Top = 6.55 + 0.72 * cornerArch + 0.24 * wingRipple2 + 0.10 * wingRipple1;

  // Wave 3 (upper roofline crown): dramatic domed corner arch (10.5m) sloping gently down to wings (8.1m)
  const y3Top = 8.15 + 2.45 * cornerArch + 0.18 * Math.cos(u * Math.PI * 3.0);

  return { y1Bot, y1Top, y2Top, y3Top };
}

/**
 * Builds a solid 3D curved ribbon shell (outer face, inner face, top bevel cap, bottom soffit)
 * along the rounded corner spine so there are no paper-thin backfaces.
 */
function buildCurvedWaveBandGeometry(
  segments: number,
  getProfile: (sample: SpineSample) => { yBot: number; yTop: number; outBot: number; outTop: number; innerOffset: number }
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const samples: SpineSample[] = [];
  const profs: Array<{ yBot: number; yTop: number; outBot: number; outTop: number; innerOffset: number }> = [];
  for (let i = 0; i <= segments; i++) {
    const s = (i / segments) * TOTAL_SPINE_LEN;
    const sp = evalFacadeSpine(s);
    samples.push(sp);
    profs.push(getProfile(sp));
  }

  // Helper to push a quad strip between two 3D curves A(i) -> B(i)
  const addStrip = (
    ptsA: THREE.Vector3[],
    ptsB: THREE.Vector3[],
    uScale: number,
    flipWinding = false
  ) => {
    const baseIdx = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = ptsA[i];
      const b = ptsB[i];
      const uTex = (i / segments) * uScale;
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      uvs.push(uTex, 0, uTex, 1);
    }
    for (let i = 0; i < segments; i++) {
      const i0 = baseIdx + i * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      if (!flipWinding) {
        indices.push(i0, i2, i3, i0, i3, i1);
      } else {
        indices.push(i0, i3, i2, i0, i1, i3);
      }
    }
  };

  const outBotPts: THREE.Vector3[] = [];
  const outTopPts: THREE.Vector3[] = [];
  const inBotPts: THREE.Vector3[] = [];
  const inTopPts: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const sp = samples[i];
    const pr = profs[i];
    outBotPts.push(new THREE.Vector3(sp.x + sp.nx * pr.outBot, pr.yBot, sp.z + sp.nz * pr.outBot));
    outTopPts.push(new THREE.Vector3(sp.x + sp.nx * pr.outTop, pr.yTop, sp.z + sp.nz * pr.outTop));
    inBotPts.push(new THREE.Vector3(sp.x + sp.nx * pr.innerOffset, pr.yBot, sp.z + sp.nz * pr.innerOffset));
    inTopPts.push(new THREE.Vector3(sp.x + sp.nx * pr.innerOffset, pr.yTop, sp.z + sp.nz * pr.innerOffset));
  }

  // Outer visible facade
  addStrip(outBotPts, outTopPts, 4.0, false);
  // Inner back face
  addStrip(inBotPts, inTopPts, 4.0, true);
  // Top cap
  addStrip(outTopPts, inTopPts, 4.0, false);
  // Bottom soffit
  addStrip(inBotPts, outBotPts, 4.0, false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// =========================================================================
// FURNITURE & UMBRELLA HELPERS
// =========================================================================

function buildHighlandsUmbrella(
  x: number,
  y: number,
  z: number,
  poleMat: THREE.Material,
  canopyMat: THREE.Material,
  skirtMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.12, 0.64), poleMat);
  base.position.y = 0.06;
  grp.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 2.52, 8), poleMat);
  pole.position.y = 1.32;
  grp.add(pole);

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.72, 0.56, 8), canopyMat);
  canopy.position.y = 2.62;
  grp.add(canopy);

  const topCap = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.20, 8), canopyMat);
  topCap.position.y = 2.94;
  grp.add(topCap);

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.16, 8, 1, true), skirtMat);
  skirt.position.y = 2.26;
  grp.add(skirt);

  return grp;
}

function buildHighlandsCafeTableSet(
  x: number,
  y: number,
  z: number,
  tableTopMat: THREE.Material,
  frameMat: THREE.Material,
  cupMat: THREE.Material,
  cupLabelMat: THREE.Material,
  chairYawA = Math.PI * 0.5,
  chairYawB = -Math.PI * 0.5
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 14), tableTopMat);
  top.position.y = 0.72;
  grp.add(top);

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.70, 8), frameMat);
  leg.position.y = 0.36;
  grp.add(leg);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.035, 10), frameMat);
  foot.position.y = 0.018;
  grp.add(foot);

  // Two Highlands iced coffee cups on table
  [
    [-0.10, 0.06],
    [0.11, -0.05],
  ].forEach(([cx, cz]) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.030, 0.13, 10), cupMat);
    cup.position.set(cx, 0.805, cz);
    grp.add(cup);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.038, 0.045, 10), cupLabelMat);
    band.position.set(cx, 0.805, cz);
    grp.add(band);
  });

  // Two dark steel / woven patio armchairs flanking the table
  [chairYawA, chairYawB].forEach((yaw) => {
    const ch = new THREE.Group();
    const dist = 0.62;
    ch.position.set(-Math.sin(yaw) * dist, 0, -Math.cos(yaw) * dist);
    ch.rotation.y = yaw;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.045, 0.44), frameMat);
    seat.position.y = 0.44;
    ch.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.40, 0.045), frameMat);
    back.position.set(0, 0.65, -0.20);
    back.rotation.x = -0.10;
    ch.add(back);

    [-0.22, 0.22].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.40), frameMat);
      arm.position.set(ax, 0.59, -0.01);
      ch.add(arm);
    });

    [-0.19, 0.19].forEach((lx) => {
      [-0.18, 0.18].forEach((lz) => {
        const cLeg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.035), frameMat);
        cLeg.position.set(lx, 0.22, lz);
        ch.add(cLeg);
      });
    });

    grp.add(ch);
  });

  return grp;
}

function buildPottedPalm(
  x: number,
  y: number,
  z: number,
  potMat: THREE.Material,
  trunkMat: THREE.Material,
  leafMat: THREE.Material,
  scale = 1.0
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.22, 0.48, 10), potMat);
  pot.position.y = 0.24;
  grp.add(pot);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.10, 1.35, 8), trunkMat);
  trunk.position.y = 1.05;
  grp.add(trunk);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 1.05), leafMat);
    frond.position.set(Math.sin(ang) * 0.45, 1.72, Math.cos(ang) * 0.45);
    frond.rotation.y = ang;
    frond.rotation.x = 0.42;
    grp.add(frond);
  }

  return grp;
}

// =========================================================================
// MAIN STRUCTURE BUILDER
// =========================================================================

export function createHighlandsCafeStructure(): HighlandsCafeBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Signature Highlands Materials
  const copperMeshMat = new THREE.MeshStandardMaterial({
    map: createHighlandsCopperGridTex(false),
    roughness: 0.46,
    metalness: 0.34,
  });
  const upperLouverMat = new THREE.MeshStandardMaterial({
    map: createHighlandsCopperGridTex(true),
    roughness: 0.50,
    metalness: 0.38,
    transparent: true,
    opacity: 0.92,
  });
  const burgundyCurbMat = new THREE.MeshStandardMaterial({ color: 0x7a2b20, roughness: 0.72, metalness: 0.06 });
  const highlandsRedMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.62,
    side: THREE.DoubleSide,
  });
  const umbrellaSkirtMat = new THREE.MeshStandardMaterial({
    map: createHighlandsUmbrellaSkirtTex(),
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const darkBronzeMat = new THREE.MeshStandardMaterial({ color: 0x26211f, roughness: 0.44, metalness: 0.45 });
  const brushedAlumMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.32, metalness: 0.65 });
  const warmTimberMat = new THREE.MeshStandardMaterial({ color: 0xb47746, roughness: 0.68 });
  const darkWalnutMat = new THREE.MeshStandardMaterial({ color: 0x452719, roughness: 0.62 });
  const creamPlasterMat = new THREE.MeshStandardMaterial({ color: 0xf7efe4, roughness: 0.84 });
  const patioTileMat = new THREE.MeshStandardMaterial({ map: createHighlandsPatioTileTex(), roughness: 0.82 });
  const gravelMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.96 });
  const indoorFloorMat = new THREE.MeshStandardMaterial({
    map: createHighlandsIndoorFloorTex(),
    roughness: 0.56,
    metalness: 0.06,
  });
  const brushedBrassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.32, metalness: 0.72 });
  const pendantShadeMat = new THREE.MeshStandardMaterial({
    color: 0x1f1a18,
    roughness: 0.40,
    metalness: 0.50,
    side: THREE.DoubleSide,
  });
  const creamWallMat = new THREE.MeshStandardMaterial({ color: 0xeadbc8, roughness: 0.82 });
  const greenPlantMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x2f4f5e,
    transparent: true,
    opacity: 0.18,
    roughness: 0.25,
    metalness: 0.10,
  });
  const warmLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.15,
    roughness: 0.25,
  });
  neonMats.push(warmLedMat);

  const cupBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const cupBandMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.88 });

  // =========================================================================
  // 1. RAISED CURVED STONE PATIO TERRACE & TERRACOTTA CURB (IMAGE 3)
  // =========================================================================
  // Shape in X-Z plane mapped via rotateX(Math.PI / 2): shape (x, y) -> world (x, Y, y)
  const patioShape = new THREE.Shape();
  const patioR = 12.1; // Corner center (396.5, 55.2) -> minX=384.4, minZ=43.1
  patioShape.moveTo(NORTH_END_X + 0.4, 43.1);
  patioShape.lineTo(CORNER_CX, 43.1);
  patioShape.absarc(CORNER_CX, CORNER_CZ, patioR, Math.PI * 1.5, Math.PI, true);
  patioShape.lineTo(384.4, SOUTH_END_Z + 0.4);
  patioShape.lineTo(NORTH_END_X + 0.4, SOUTH_END_Z + 0.4);
  patioShape.closePath();

  const patioGeo = new THREE.ExtrudeGeometry(patioShape, {
    depth: 0.18,
    bevelEnabled: false,
    curveSegments: 24,
  });
  patioGeo.rotateX(Math.PI * 0.5);
  const patioFloor = new THREE.Mesh(patioGeo, patioTileMat);
  patioFloor.position.y = 0.16;
  staticGroup.add(patioFloor);

  // Subtle grey gravel strip around outer edge of terrace (matching Image 3!)
  const gravelShape = new THREE.Shape();
  const gravR = 12.55;
  gravelShape.moveTo(NORTH_END_X + 0.7, 42.65);
  gravelShape.lineTo(CORNER_CX, 42.65);
  gravelShape.absarc(CORNER_CX, CORNER_CZ, gravR, Math.PI * 1.5, Math.PI, true);
  gravelShape.lineTo(383.95, SOUTH_END_Z + 0.7);
  gravelShape.lineTo(NORTH_END_X + 0.7, SOUTH_END_Z + 0.7);
  gravelShape.closePath();
  const gravelGeo = new THREE.ExtrudeGeometry(gravelShape, {
    depth: 0.06,
    bevelEnabled: false,
    curveSegments: 24,
  });
  gravelGeo.rotateX(Math.PI * 0.5);
  const gravelBed = new THREE.Mesh(gravelGeo, gravelMat);
  gravelBed.position.y = 0.04;
  staticGroup.add(gravelBed);

  // Signature Terracotta-Burgundy Raised Stone Curb around Patio Perimeter
  // Leave a wide 4.2m walkable entry ramp right at the 45° NW corner (theta around 1.25π)
  const curbSegs = 28;
  for (let i = 0; i < curbSegs; i++) {
    const t0 = i / curbSegs;
    const t1 = (i + 1) / curbSegs;
    const theta0 = Math.PI * 1.5 - t0 * (Math.PI * 0.5);
    const theta1 = Math.PI * 1.5 - t1 * (Math.PI * 0.5);
    const thetaMid = (theta0 + theta1) * 0.5;
    // Skip central 45° entry opening (~3.8m wide)
    if (Math.abs(thetaMid - Math.PI * 1.25) < 0.17) continue;

    const x0 = CORNER_CX + patioR * Math.cos(theta0);
    const z0 = CORNER_CZ + patioR * Math.sin(theta0);
    const x1 = CORNER_CX + patioR * Math.cos(theta1);
    const z1 = CORNER_CZ + patioR * Math.sin(theta1);
    const segLen = Math.hypot(x1 - x0, z1 - z0) + 0.05;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.22, 0.26), burgundyCurbMat);
    seg.position.set((x0 + x1) * 0.5, 0.11, (z0 + z1) * 0.5);
    seg.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
    staticGroup.add(seg);
  }
  // Straight North & West patio curbs (leaving open walk-in gaps at far East & South patio ends)
  const northCurb = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.22, 0.26), burgundyCurbMat);
  northCurb.position.set(402.0, 0.11, 43.1);
  staticGroup.add(northCurb);
  const westCurb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 10.8), burgundyCurbMat);
  westCurb.position.set(384.4, 0.11, 60.7);
  staticGroup.add(westCurb);

  // =========================================================================
  // 2. SIGNATURE 3-TIER WAVY TERRACOTTA FACADE & AMBER LED RIBBONS (IMAGE 2 & 3)
  // =========================================================================
  const facadeSegs = 48;

  // Wave 1: Lower protruding wavy fascia canopy above ground-floor glass
  const wave1Geo = buildCurvedWaveBandGeometry(facadeSegs, (sp) => {
    const { y1Bot, y1Top } = evalWaveHeights(sp.u);
    return { yBot: y1Bot, yTop: y1Top, outBot: 0.44, outTop: 0.26, innerOffset: -0.18 };
  });
  staticGroup.add(new THREE.Mesh(wave1Geo, copperMeshMat));

  // Wave 2: Middle terracotta copper-grid facade tier
  const wave2Geo = buildCurvedWaveBandGeometry(facadeSegs, (sp) => {
    const { y1Top, y2Top } = evalWaveHeights(sp.u);
    return { yBot: y1Top - 0.04, yTop: y2Top, outBot: 0.20, outTop: 0.34, innerOffset: -0.18 };
  });
  staticGroup.add(new THREE.Mesh(wave2Geo, copperMeshMat));

  // Wave 3: Upper domed corner crown & perforated semi-open louver band
  const wave3Geo = buildCurvedWaveBandGeometry(facadeSegs, (sp) => {
    const { y2Top, y3Top } = evalWaveHeights(sp.u);
    return { yBot: y2Top - 0.04, yTop: y3Top, outBot: 0.14, outTop: 0.24, innerOffset: -0.18 };
  });
  staticGroup.add(new THREE.Mesh(wave3Geo, upperLouverMat));

  // Solid lower backing parapet behind central arched emblem so the logo pops crisply
  const cornerBackGeo = buildCurvedWaveBandGeometry(20, (sp) => {
    const { y2Top, y3Top } = evalWaveHeights(sp.u);
    const crownMask = Math.exp(-sp.u * sp.u * 8.0);
    return {
      yBot: y2Top,
      yTop: y2Top + (y3Top - y2Top) * (0.25 + 0.65 * crownMask),
      outBot: -0.20,
      outTop: -0.20,
      innerOffset: -0.45,
    };
  });
  staticGroup.add(new THREE.Mesh(cornerBackGeo, darkBronzeMat));

  // 3 Continuous Glowing Warm-Amber LED Wave Ribbons (TubeGeometry along each wave ridge!)
  const addWaveLedTube = (getCurvePt: (sp: SpineSample) => THREE.Vector3, radius: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 56; i++) {
      pts.push(getCurvePt(evalFacadeSpine((i / 56) * TOTAL_SPINE_LEN)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, radius, 6, false);
    staticGroup.add(new THREE.Mesh(tubeGeo, warmLedMat));
  };

  addWaveLedTube((sp) => {
    const { y1Bot } = evalWaveHeights(sp.u);
    return new THREE.Vector3(sp.x + sp.nx * 0.46, y1Bot + 0.03, sp.z + sp.nz * 0.46);
  }, 0.055);
  addWaveLedTube((sp) => {
    const { y2Top } = evalWaveHeights(sp.u);
    return new THREE.Vector3(sp.x + sp.nx * 0.36, y2Top + 0.02, sp.z + sp.nz * 0.36);
  }, 0.055);
  addWaveLedTube((sp) => {
    const { y3Top } = evalWaveHeights(sp.u);
    return new THREE.Vector3(sp.x + sp.nx * 0.27, y3Top + 0.02, sp.z + sp.nz * 0.27);
  }, 0.06);

  // =========================================================================
  // 3. ILLUMINATED "HIGHLANDS COFFEE" ROUND MEDALLION, CHANNEL TEXT & SIDE MURAL
  // =========================================================================
  const roundLogoTex = createHighlandsRoundLogoTex(false);
  const roundLogoMat = new THREE.MeshStandardMaterial({
    map: roundLogoTex,
    emissive: 0xffffff,
    emissiveMap: roundLogoTex,
    emissiveIntensity: 0.48,
    transparent: true,
    alphaTest: 0.05,
    roughness: 0.35,
  });
  neonMats.push(roundLogoMat);

  // Giant Illuminated Circular Emblem mounted high on the curved NW corner dome (Y = 8.75m)
  const logoCenterX = CORNER_CX - (BLDG_R + 0.30) * Math.SQRT1_2;
  const logoCenterZ = CORNER_CZ - (BLDG_R + 0.30) * Math.SQRT1_2;
  const emblemHousing = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.56, 0.22, 28), darkBronzeMat);
  emblemHousing.rotation.order = 'YXZ';
  emblemHousing.rotation.y = -Math.PI * 0.75;
  emblemHousing.rotation.x = Math.PI * 0.5;
  emblemHousing.position.set(logoCenterX, 8.75, logoCenterZ);
  staticGroup.add(emblemHousing);

  const emblemFace = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), roundLogoMat);
  emblemFace.userData.noMerge = true;
  emblemFace.rotation.y = -Math.PI * 0.75;
  emblemFace.position.set(
    CORNER_CX - (BLDG_R + 0.44) * Math.SQRT1_2,
    8.75,
    CORNER_CZ - (BLDG_R + 0.44) * Math.SQRT1_2
  );
  staticGroup.add(emblemFace);

  // Curved Glowing White "HIGHLANDS" Channel Text on Lower Wave 1 Fascia (exact match to Image 3!)
  const wordmarkTex = createHighlandsWordmarkTex();
  const wordmarkMat = new THREE.MeshStandardMaterial({
    map: wordmarkTex,
    emissive: 0xffffff,
    emissiveMap: wordmarkTex,
    emissiveIntensity: 0.85,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.30,
  });
  neonMats.push(wordmarkMat);

  // Build curved cylindrical arc strip hugging Wave 1 outward face around theta = 1.25π
  const wordArcGeo = new THREE.CylinderGeometry(
    BLDG_R + 0.42,
    BLDG_R + 0.47,
    0.86,
    20,
    1,
    true,
    Math.PI * 1.25 - 0.38,
    0.76
  );
  // Note: Three.js CylinderGeometry places theta=0 at +Z, increasing toward +X: (sin θ, y, cos θ)
  // Wait: in CylinderGeometry, vertex is (r * sin(theta), y, r * cos(theta)).
  // Our NW corner direction is (-0.707, 0, -0.707) -> sin(alpha)=-0.707, cos(alpha)=-0.707 -> alpha = -0.75π (or 1.25π)!
  // Let's verify UV orientation: as theta increases from 1.25π - 0.38 to 1.25π + 0.38:
  // sin increases from negative toward 0? At 1.25π: sin=-0.707, cos=-0.707; at 1.25π+0.38 (~267°): sin≈-0.99, cos≈-0.05 (moves toward -X, +Z!).
  // Wait: from viewer at NW looking SE, viewer's LEFT-TO-RIGHT is (-0.707, 0, +0.707)! That matches theta INCREASING!
  // Let's double check! At 1.25π - 0.38 (~203°): sin=-0.39, cos=-0.92 (North/East side, viewer's LEFT!).
  // At 1.25π + 0.38 (~247°): sin=-0.92, cos=-0.39 (West/South side, viewer's RIGHT!).
  // So u=0 -> u=1 goes directly LEFT-TO-RIGHT from the viewer's perspective!
  const wordArcMesh = new THREE.Mesh(wordArcGeo, wordmarkMat);
  wordArcMesh.userData.noMerge = true;
  wordArcMesh.position.set(CORNER_CX, 4.38, CORNER_CZ);
  staticGroup.add(wordArcMesh);

  // Large Subtle Heritage Mural on the North Wing Copper Cladding (seen on left wall in Image 2)
  const muralTex = createHighlandsRoundLogoTex(true);
  const muralMat = new THREE.MeshStandardMaterial({
    map: muralTex,
    transparent: true,
    opacity: 0.72,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.65,
  });
  const northMural = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), muralMat);
  northMural.userData.noMerge = true;
  northMural.rotation.y = Math.PI;
  northMural.position.set(405.8, 5.75, 47.82);
  staticGroup.add(northMural);

  // =========================================================================
  // 4. GROUND FLOOR STOREFRONT, CURVED CORNER GLASS & AUTOMATIC DOUBLE DOORS
  // =========================================================================
  // Solid Back Walls (East & South) + Interior Roof Deck (Y = 3.72m)
  const eastBackWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.3, 21.8), darkWalnutMat);
  eastBackWall.position.set(410.8, 4.15, 58.9);
  staticGroup.add(eastBackWall);

  const southBackWall = new THREE.Mesh(new THREE.BoxGeometry(21.8, 8.3, 0.45), darkWalnutMat);
  southBackWall.position.set(400.1, 4.15, 69.5);
  staticGroup.add(southBackWall);

  // Interior Ceiling Deck + Acoustic Timber Slats
  const ceilingShape = new THREE.Shape();
  ceilingShape.moveTo(NORTH_END_X, CORNER_CZ - BLDG_R);
  ceilingShape.lineTo(CORNER_CX, CORNER_CZ - BLDG_R);
  ceilingShape.absarc(CORNER_CX, CORNER_CZ, BLDG_R, Math.PI * 1.5, Math.PI, true);
  ceilingShape.lineTo(CORNER_CX - BLDG_R, SOUTH_END_Z);
  ceilingShape.lineTo(NORTH_END_X, SOUTH_END_Z);
  ceilingShape.closePath();

  const ceilingGeo = new THREE.ExtrudeGeometry(ceilingShape, {
    depth: 0.25,
    bevelEnabled: false,
    curveSegments: 20,
  });
  ceilingGeo.rotateX(Math.PI * 0.5);
  const indoorCeiling = new THREE.Mesh(ceilingGeo, darkBronzeMat);
  indoorCeiling.position.y = 3.92;
  staticGroup.add(indoorCeiling);

  const indoorFloor = new THREE.Mesh(ceilingGeo, indoorFloorMat);
  indoorFloor.position.y = 0.165;
  staticGroup.add(indoorFloor);

  // Ground-Floor Curtain Wall Mullions & Glass Panels along Straight Wings + Curved Corner Bays
  const doorHalfArc = 0.225; // ~3.15m doorway chord at R=7.0
  const doorStartS = TOTAL_SPINE_LEN * 0.5 - doorHalfArc * BLDG_R;
  const doorEndS = TOTAL_SPINE_LEN * 0.5 + doorHalfArc * BLDG_R;

  const glassSegs = 26;
  for (let i = 0; i < glassSegs; i++) {
    const s0 = (i / glassSegs) * TOTAL_SPINE_LEN;
    const s1 = ((i + 1) / glassSegs) * TOTAL_SPINE_LEN;
    const sMid = (s0 + s1) * 0.5;
    const sp0 = evalFacadeSpine(s0);
    const sp1 = evalFacadeSpine(s1);
    const spMid = evalFacadeSpine(sMid);
    const span = Math.hypot(sp1.x - sp0.x, sp1.z - sp0.z);
    const rotY = Math.atan2(-(sp1.z - sp0.z), sp1.x - sp0.x);

    // Vertical dark-bronze mullion post at s0 (skip any mullion inside the automatic doorway bay!)
    const inDoorOpening = s0 > doorStartS + 0.05 && s0 < doorEndS - 0.05;
    if (!inDoorOpening) {
      const mul = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.65, 0.16), darkBronzeMat);
      mul.position.set(sp0.x, 1.98, sp0.z);
      mul.rotation.y = rotY;
      staticGroup.add(mul);
    }

    // Low dark plinth & upper transom rail
    const isDoorBay = sMid >= doorStartS && sMid <= doorEndS;
    if (!isDoorBay) {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(span, 0.24, 0.14), darkBronzeMat);
      plinth.position.set(spMid.x, 0.28, spMid.z);
      plinth.rotation.y = rotY;
      staticGroup.add(plinth);

      const glass = new THREE.Mesh(new THREE.BoxGeometry(span - 0.04, 3.35, 0.05), glassMat);
      glass.position.set(spMid.x, 2.02, spMid.z);
      glass.rotation.y = rotY;
      staticGroup.add(glass);
    } else {
      // Transom glass above 2.95m doorway
      const topGlass = new THREE.Mesh(new THREE.BoxGeometry(span, 0.72, 0.06), glassMat);
      topGlass.position.set(spMid.x, 3.36, spMid.z);
      topGlass.rotation.y = rotY;
      staticGroup.add(topGlass);
    }

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(span + 0.04, 0.14, 0.16), darkBronzeMat);
    topRail.position.set(spMid.x, 3.68, spMid.z);
    topRail.rotation.y = rotY;
    staticGroup.add(topRail);
  }

  // Final end mullion at South wing end
  const endMul = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.65, 0.18), darkBronzeMat);
  endMul.position.set(CORNER_CX - BLDG_R, 1.98, SOUTH_END_Z);
  staticGroup.add(endMul);

  // Two Signature Warm Vertical Amber Wall Sconces flanking the Corner Entrance Pillars (Image 2 & 3!)
  [-0.27, 0.27].forEach((angOff) => {
    const th = Math.PI * 1.25 + angOff;
    const px = CORNER_CX + (BLDG_R + 0.12) * Math.cos(th);
    const pz = CORNER_CZ + (BLDG_R + 0.12) * Math.sin(th);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.65, 0.42), darkBronzeMat);
    pillar.position.set(px, 1.98, pz);
    pillar.rotation.y = -th;
    staticGroup.add(pillar);

    const sx = CORNER_CX + (BLDG_R + 0.35) * Math.cos(th);
    const sz = CORNER_CZ + (BLDG_R + 0.35) * Math.sin(th);
    const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.10), warmLedMat);
    sconce.position.set(sx, 2.15, sz);
    sconce.rotation.y = -Math.PI * 0.75;
    staticGroup.add(sconce);
  });

  // Animated 45° Bi-Parting Automatic Corner Glass Doors at (DOOR_CENTER_X, DOOR_CENTER_Z)
  const doorGroup = new THREE.Group();
  doorGroup.userData.noMerge = true;
  doorGroup.position.set(DOOR_CENTER_X, 0.16, DOOR_CENTER_Z);
  doorGroup.rotation.y = -Math.PI * 0.75; // Local +Z faces NW out toward intersection, Local +X is right-along-door
  staticGroup.add(doorGroup);

  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.20, 0.24), darkBronzeMat);
  doorHeader.position.set(0, 2.86, 0);
  doorGroup.add(doorHeader);

  const buildDoorLeaf = (isRight: boolean) => {
    const leaf = new THREE.Group();
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(1.38, 2.70, 0.045), glassMat);
    leaf.add(glassPane);

    // Outer sliding stile in dark bronze, slim brushed-aluminum meeting edge so there's no thick dark bar in the center
    const outerStileX = isRight ? 0.69 : -0.69;
    const outerStile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.76, 0.075), darkBronzeMat);
    outerStile.position.set(outerStileX, 0, 0);
    leaf.add(outerStile);

    const innerEdgeX = isRight ? -0.69 : 0.69;
    const innerEdge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.72, 0.055), brushedAlumMat);
    innerEdge.position.set(innerEdgeX, 0, 0);
    leaf.add(innerEdge);
    const topR = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.075), darkBronzeMat);
    topR.position.set(0, 1.36, 0);
    leaf.add(topR);
    const botR = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 0.075), darkBronzeMat);
    botR.position.set(0, -1.33, 0);
    leaf.add(botR);

    const hx = isRight ? -0.50 : 0.50;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), brushedAlumMat);
    handle.position.set(hx, 0, 0.06);
    leaf.add(handle);
    return leaf;
  };

  const doorLeftLeaf = buildDoorLeaf(false);
  doorLeftLeaf.position.set(-0.71, 1.38, -0.05);
  doorGroup.add(doorLeftLeaf);

  const doorRightLeaf = buildDoorLeaf(true);
  doorRightLeaf.position.set(0.71, 1.38, -0.05);
  doorGroup.add(doorRightLeaf);

  // Security Rolling Shutter inside Doorway Group (local coordinates!)
  const shutterTex = createRollingShutterTexture({
    title: 'HIGHLANDS COFFEE  •  NGÃ TƯ SƠN TÂY',
    hoursLabel: 'MỞ CỬA: 07:00 - 23:00',
    accentHex: '#b91c1c',
    slatDarkHex: '#2c1512',
    slatLightHex: '#4c1d18',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.65, metalness: 0.15 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    doorGroup,
    {
      id: 'highlands_main_door',
      axis: 'x',
      pos: 0.09,
      spanCenter: 0,
      width: 3.05,
      baseY: 0,
      topY: 2.78,
      thickness: 0.08,
    },
    shutterMat,
    darkBronzeMat
  );

  // =========================================================================
  // 5. OUTDOOR TERRACE: RED UMBRELLAS, PATIO SEATING, PALMS & SIGNAGE (IMAGE 3)
  // =========================================================================
  const outdoorClusters: Array<{ x: number; z: number; yawA: number; yawB: number }> = [
    { x: 399.1, z: 45.5, yawA: Math.PI * 0.5, yawB: -Math.PI * 0.5 }, // North-NW umbrella table
    { x: 406.4, z: 45.5, yawA: Math.PI * 0.5, yawB: -Math.PI * 0.5 }, // North-NE umbrella table
    { x: 386.8, z: 58.2, yawA: 0, yawB: Math.PI }, // West-NW umbrella table
    { x: 386.8, z: 65.2, yawA: 0, yawB: Math.PI }, // West-SW umbrella table
  ];

  outdoorClusters.forEach((cl) => {
    staticGroup.add(
      buildHighlandsUmbrella(cl.x, 0.16, cl.z, darkBronzeMat, highlandsRedMat, umbrellaSkirtMat)
    );
    staticGroup.add(
      buildHighlandsCafeTableSet(
        cl.x,
        0.16,
        cl.z,
        darkWalnutMat,
        darkBronzeMat,
        cupBodyMat,
        cupBandMat,
        cl.yawA,
        cl.yawB
      )
    );
  });

  // Angled Architectural Uplight Timber Totem on West Patio Corner (Image 3 right foreground!)
  const totemGroup = new THREE.Group();
  totemGroup.position.set(385.15, 0.16, 53.5);
  totemGroup.rotation.y = 0.25;
  const totemPost = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.25, 0.22), warmTimberMat);
  totemPost.position.y = 1.12;
  totemPost.rotation.z = -0.12;
  totemGroup.add(totemPost);
  const totemGlow = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.26), warmLedMat);
  totemGlow.position.y = 0.08;
  totemGroup.add(totemGlow);
  staticGroup.add(totemGroup);

  // Highlands Red Lollipop Pole Sign & A-Frame Promo Standee flanking Corner Approach
  const poleSignGroup = new THREE.Group();
  poleSignGroup.position.set(409.5, 0.16, 43.7);
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.75, 10), darkBronzeMat);
  signPole.position.y = 1.38;
  poleSignGroup.add(signPole);
  const signDiscRim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), highlandsRedMat);
  signDiscRim.rotation.x = Math.PI * 0.5;
  signDiscRim.position.y = 2.65;
  poleSignGroup.add(signDiscRim);
  [-0.045, 0.045].forEach((sz) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), roundLogoMat);
    face.userData.noMerge = true;
    face.position.set(0, 2.65, sz);
    if (sz < 0) face.rotation.y = Math.PI;
    poleSignGroup.add(face);
  });
  staticGroup.add(poleSignGroup);

  // A-Frame Standee near Corner Patio
  const standee = new THREE.Group();
  standee.position.set(395.2, 0.16, 45.6);
  standee.rotation.y = -0.35;
  const sBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 1.05, 0.05),
    new THREE.MeshStandardMaterial({ map: createHighlandsStandeeTex(), roughness: 0.6 })
  );
  sBoard.position.y = 0.58;
  sBoard.rotation.x = -0.10;
  standee.add(sBoard);
  const sLeg = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.12, 0.03), darkBronzeMat);
  sLeg.position.set(0, 0.56, -0.14);
  sLeg.rotation.x = 0.12;
  standee.add(sLeg);
  staticGroup.add(standee);

  // Potted Tropical Palms flanking patio corners (Image 2 & 3!)
  staticGroup.add(buildPottedPalm(385.1, 0.16, 68.8, creamPlasterMat, trunkMat, palmLeafMat, 1.05));
  staticGroup.add(buildPottedPalm(409.6, 0.16, 47.4, creamPlasterMat, trunkMat, palmLeafMat, 0.98));

  // =========================================================================
  // 6. RICH WALK-IN CAFE INTERIOR (COUNTER, BACK-BAR, RETAIL, CEILING & LOUNGE)
  // =========================================================================

  // 6A. Architectural Acoustic Wood-Slat Ceiling, Beams & Brass Cove Lighting
  for (let cz = 50.0; cz <= 68.5; cz += 3.1) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.14, 0.22), darkBronzeMat);
    beam.position.set(400.6, 3.74, cz);
    staticGroup.add(beam);
  }
  for (let sx = 392.4; sx <= 409.6; sx += 0.75) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 17.5), warmTimberMat);
    slat.position.set(sx, 3.79, 59.8);
    staticGroup.add(slat);
  }
  // Warm ceiling cove LED strip hovering above the bar & lounge corridor
  const barCoveLed = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 12.0), warmLedMat);
  barCoveLed.position.set(403.5, 3.72, 58.8);
  staticGroup.add(barCoveLed);
  const loungeCoveLed = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.06, 0.10), warmLedMat);
  loungeCoveLed.position.set(397.8, 3.72, 68.6);
  staticGroup.add(loungeCoveLed);

  // 6B. Order & Barista Front Counter (East Interior Wing: X = 403.3..407.4, Z = 53.5..64.0)
  const barFront = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.12, 10.2), darkWalnutMat);
  barFront.position.set(403.8, 0.72, 58.8);
  staticGroup.add(barFront);
  // Fluted vertical timber ribs + brass kickplate along counter front facing customers
  for (let bz = 54.0; bz <= 63.6; bz += 0.26) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.96, 0.09), warmTimberMat);
    rib.position.set(403.51, 0.74, bz);
    staticGroup.add(rib);
  }
  const barKick = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.12, 10.25), brushedBrassMat);
  barKick.position.set(403.78, 0.22, 58.8);
  staticGroup.add(barKick);
  const barTerracottaBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 10.2), burgundyCurbMat);
  barTerracottaBand.position.set(403.50, 1.20, 58.8);
  staticGroup.add(barTerracottaBand);

  const barTop = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 10.4), creamPlasterMat);
  barTop.position.set(403.8, 1.32, 58.8);
  staticGroup.add(barTop);

  // North Counter Return (Order Pickup & Self-Pickup Bay)
  const barReturn = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.12, 0.55), darkWalnutMat);
  barReturn.position.set(405.6, 0.72, 53.9);
  staticGroup.add(barReturn);
  const barReturnKick = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.12, 0.58), brushedBrassMat);
  barReturnKick.position.set(405.6, 0.22, 53.9);
  staticGroup.add(barReturnKick);
  const barReturnTop = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.08, 0.88), creamPlasterMat);
  barReturnTop.position.set(405.6, 1.32, 53.9);
  staticGroup.add(barReturnTop);

  // Glass Sneeze Guard along the Espresso Prep Segment
  const sneezeGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 3.6), glassMat);
  sneezeGlass.position.set(403.36, 1.56, 56.6);
  staticGroup.add(sneezeGlass);
  [54.85, 56.6, 58.35].forEach((pz) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 6), brushedAlumMat);
    post.position.set(403.36, 1.56, pz);
    staticGroup.add(post);
  });

  // 2 Commercial Espresso Grinders + Detailed 2-Group Espresso Machine + Cup Warmer
  [55.0, 55.35].forEach((gz) => {
    const gBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.24), darkBronzeMat);
    gBase.position.set(403.85, 1.53, gz);
    staticGroup.add(gBase);
    const gHopper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.24, 10), glassMat);
    gHopper.position.set(403.85, 1.82, gz);
    staticGroup.add(gHopper);
    const beansFill = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.14, 10), darkWalnutMat);
    beansFill.position.set(403.85, 1.78, gz);
    staticGroup.add(beansFill);
  });

  const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.96), brushedAlumMat);
  espresso.position.set(403.85, 1.60, 56.25);
  staticGroup.add(espresso);
  const espressoAccent = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.92), highlandsRedMat);
  espressoAccent.position.set(403.85, 1.76, 56.25);
  staticGroup.add(espressoAccent);
  [56.0, 56.5].forEach((gwz) => {
    const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.10, 8), darkBronzeMat);
    groupHead.position.set(404.12, 1.54, gwz);
    staticGroup.add(groupHead);
  });
  // Ceramic cup stacks on espresso warmer top
  [55.95, 56.22, 56.48].forEach((cz) => {
    const cupStack = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.040, 0.16, 10), creamPlasterMat);
    cupStack.position.set(403.85, 1.92, cz);
    staticGroup.add(cupStack);
  });

  // 3 Signature Stainless Vietnamese Phin Brewers on Drip Tray
  const phinTray = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 1.65), darkBronzeMat);
  phinTray.position.set(403.82, 1.38, 57.95);
  staticGroup.add(phinTray);
  [57.4, 57.95, 58.5].forEach((pz) => {
    const phinBody = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.34, 12), brushedAlumMat);
    phinBody.position.set(403.82, 1.57, pz);
    staticGroup.add(phinBody);
    const phinLid = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), brushedBrassMat);
    phinLid.position.set(403.82, 1.76, pz);
    staticGroup.add(phinLid);
  });

  // Dual POS Order Terminals, Contactless Payment Readers & Pickup Red Cup Stacks
  [59.45, 60.45].forEach((pz) => {
    const posStand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), darkBronzeMat);
    posStand.position.set(403.68, 1.47, pz);
    staticGroup.add(posStand);
    const posScreen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.40), darkBronzeMat);
    posScreen.position.set(403.65, 1.64, pz);
    posScreen.rotation.z = 0.25;
    staticGroup.add(posScreen);
    const posGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), warmLedMat);
    posGlow.position.set(403.62, 1.64, pz);
    posGlow.rotation.y = -Math.PI * 0.5;
    staticGroup.add(posGlow);
    const cardReader = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.10), brushedAlumMat);
    cardReader.position.set(403.48, 1.41, pz + 0.26);
    staticGroup.add(cardReader);
  });

  // Pickup Counter Area (North Return): Tray, Napkin Dispenser, Sugar Caddy & Branded Cup Stacks
  const pickupMat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.025, 0.44), darkBronzeMat);
  pickupMat.position.set(405.1, 1.37, 53.85);
  staticGroup.add(pickupMat);
  [404.85, 405.05, 405.25].forEach((cx, idx) => {
    const stackH = 0.28 + (idx % 2) * 0.08;
    const cupStack = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, stackH, 10), cupBodyMat);
    cupStack.position.set(cx, 1.38 + stackH * 0.5, 53.85);
    staticGroup.add(cupStack);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.050, 0.07, 10), cupBandMat);
    band.position.set(cx, 1.38 + stackH * 0.65, 53.85);
    staticGroup.add(band);
  });
  const napkinCaddy = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.24), warmTimberMat);
  napkinCaddy.position.set(406.0, 1.44, 53.85);
  staticGroup.add(napkinCaddy);

  // Illuminated Refrigerated Glass Pastry & Cake Display Showcase (Z = 61.2..63.4)
  const pastryBase = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.26, 2.25), darkBronzeMat);
  pastryBase.position.set(403.82, 1.49, 62.35);
  staticGroup.add(pastryBase);
  const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.68, 2.20), glassMat);
  pastryCase.position.set(403.82, 1.94, 62.35);
  staticGroup.add(pastryCase);
  const pastryTopLed = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.04, 2.05), warmLedMat);
  pastryTopLed.position.set(403.82, 2.24, 62.35);
  staticGroup.add(pastryTopLed);
  // 2 inner shelves stocked with colorful pastries, bánh mì que & bottled cold brew
  [1.76, 2.02].forEach((sy, sIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 2.08), brushedAlumMat);
    shelf.position.set(403.82, sy, 62.35);
    staticGroup.add(shelf);
    for (let pz = 61.55; pz <= 63.15; pz += 0.36) {
      const cakeColor = sIdx === 0 ? warmTimberMat : pz < 62.3 ? creamWallMat : highlandsRedMat;
      const cake = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.20), cakeColor);
      cake.position.set(403.75, sy + 0.07, pz);
      staticGroup.add(cake);
    }
  });

  // 6C. Back-Bar Prep Counter, Syrup Bottle Rack, Roast Shelves & 3-Panel Illuminated Menu Wall
  const backBarBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.96, 10.6), darkWalnutMat);
  backBarBase.position.set(410.05, 0.64, 58.9);
  staticGroup.add(backBarBase);
  const backBarTop = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.07, 10.7), creamPlasterMat);
  backBarTop.position.set(410.02, 1.15, 58.9);
  staticGroup.add(backBarTop);

  // Freeze Blender Pitchers & Stainless Sink / Faucet on Back-Bar
  [55.0, 55.45].forEach((fz) => {
    const blenderBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.24), darkBronzeMat);
    blenderBase.position.set(409.95, 1.26, fz);
    staticGroup.add(blenderBase);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.32, 10), glassMat);
    jar.position.set(409.95, 1.50, fz);
    staticGroup.add(jar);
    const matchaFill = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.18, 10), greenPlantMat);
    matchaFill.position.set(409.95, 1.44, fz);
    staticGroup.add(matchaFill);
  });
  const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.85), brushedAlumMat);
  sinkBasin.position.set(409.95, 1.19, 57.0);
  staticGroup.add(sinkBasin);
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), brushedAlumMat);
  faucet.position.set(410.18, 1.36, 57.0);
  staticGroup.add(faucet);

  // Stepped Syrup & Sauce Rack with Colorful Monin Bottles (Z = 58.2..60.8)
  const syrupColors = [highlandsRedMat, warmLedMat, greenPlantMat, warmTimberMat, burgundyCurbMat, brushedBrassMat];
  for (let row = 0; row < 2; row++) {
    const stepBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10 + row * 0.10, 2.4), darkBronzeMat);
    stepBox.position.set(409.85 + row * 0.24, 1.24 + row * 0.05, 59.6);
    staticGroup.add(stepBox);
    for (let bi = 0; bi < 7; bi++) {
      const bz = 58.65 + bi * 0.32;
      const bMat = syrupColors[(bi + row * 2) % syrupColors.length];
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.26, 8), bMat);
      bottle.position.set(409.85 + row * 0.24, 1.42 + row * 0.10, bz);
      staticGroup.add(bottle);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.08, 6), creamPlasterMat);
      neck.position.set(409.85 + row * 0.24, 1.59 + row * 0.10, bz);
      staticGroup.add(neck);
    }
  }

  // Back-Bar Timber Wall Shelves (at Y = 1.65 & 2.05) + Roast Canisters
  [1.66, 2.04].forEach((sy) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 3.6), warmTimberMat);
    shelf.position.set(410.36, sy, 62.2);
    staticGroup.add(shelf);
    for (let ti = 0; ti < 7; ti++) {
      const tz = 60.75 + ti * 0.48;
      const tin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.22, 10),
        ti % 2 === 0 ? highlandsRedMat : brushedBrassMat
      );
      tin.position.set(410.35, sy + 0.14, tz);
      staticGroup.add(tin);
    }
  });

  // Illuminated Highlands Menu Board + Flanking Trà Sen Vàng & Phin Sữa Đá Lightboxes on East Back Wall
  const menuTex = createHighlandsMenuBoardTex();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xfef3c7,
    emissiveMap: menuTex,
    emissiveIntensity: 0.26,
    roughness: 0.48,
  });
  const menuBoard = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.25), menuMat);
  menuBoard.position.set(410.52, 2.95, 58.8);
  menuBoard.rotation.y = -Math.PI * 0.5;
  staticGroup.add(menuBoard);

  const senPosterTex = createHighlandsPosterTex('sen');
  const senPosterMat = new THREE.MeshStandardMaterial({
    map: senPosterTex,
    emissive: 0xfef3c7,
    emissiveMap: senPosterTex,
    emissiveIntensity: 0.20,
    roughness: 0.45,
  });
  const phinPosterTex = createHighlandsPosterTex('phin');
  const phinPosterMat = new THREE.MeshStandardMaterial({
    map: phinPosterTex,
    emissive: 0xfef3c7,
    emissiveMap: phinPosterTex,
    emissiveIntensity: 0.20,
    roughness: 0.45,
  });
  const leftPromo = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.05), senPosterMat);
  leftPromo.position.set(410.52, 2.95, 54.9);
  leftPromo.rotation.y = -Math.PI * 0.5;
  staticGroup.add(leftPromo);
  const rightPromo = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.05), phinPosterMat);
  rightPromo.position.set(410.52, 2.95, 62.7);
  rightPromo.rotation.y = -Math.PI * 0.5;
  staticGroup.add(rightPromo);

  // 6D. North-East Retail Merchandise Display Rack (X = 409.7..410.4, Z = 48.8..52.8)
  const retailBack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.75, 3.9), darkWalnutMat);
  retailBack.position.set(410.45, 1.54, 50.8);
  staticGroup.add(retailBack);
  [-1.9, 1.9].forEach((dz) => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.75, 0.10), darkWalnutMat);
    side.position.set(410.12, 1.54, 50.8 + dz);
    staticGroup.add(side);
  });
  const retailHeaderTex = createHighlandsRetailHeaderTex();
  const retailHeaderMat = new THREE.MeshStandardMaterial({
    map: retailHeaderTex,
    emissive: 0xfef3c7,
    emissiveMap: retailHeaderTex,
    emissiveIntensity: 0.22,
    roughness: 0.45,
  });
  const retailHeader = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.46), retailHeaderMat);
  retailHeader.position.set(409.78, 2.66, 50.8);
  retailHeader.rotation.y = -Math.PI * 0.5;
  staticGroup.add(retailHeader);

  [0.52, 1.12, 1.72, 2.28].forEach((sy, sIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 3.76), warmTimberMat);
    shelf.position.set(410.12, sy, 50.8);
    staticGroup.add(shelf);
    for (let bi = 0; bi < 8; bi++) {
      const bz = 49.25 + bi * 0.44;
      if (sIdx >= 2) {
        // Highlands packaged roast coffee bags
        const bagMat = bi % 3 === 0 ? highlandsRedMat : bi % 3 === 1 ? brushedBrassMat : darkWalnutMat;
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.30, 0.22), bagMat);
        bag.position.set(410.02, sy + 0.18, bz);
        staticGroup.add(bag);
      } else {
        // Branded red/cream tumblers & canned Phin Sữa Đá
        const tumMat = bi % 2 === 0 ? highlandsRedMat : creamWallMat;
        const tum = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.26, 10), tumMat);
        tum.position.set(410.02, sy + 0.16, bz);
        staticGroup.add(tum);
      }
    }
  });

  // 6E. West Self-Service Condiment & Tray Return Station (X = 390.0..390.85, Z = 63.0..64.7)
  const condBody = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.02, 1.65), darkWalnutMat);
  condBody.position.set(390.4, 0.67, 63.85);
  staticGroup.add(condBody);
  const condTop = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 1.72), creamPlasterMat);
  condTop.position.set(390.4, 1.21, 63.85);
  staticGroup.add(condTop);
  const trayStack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.56), darkBronzeMat);
  trayStack.position.set(390.42, 1.33, 63.4);
  staticGroup.add(trayStack);
  const strawJar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 10), brushedAlumMat);
  strawJar.position.set(390.42, 1.35, 64.25);
  staticGroup.add(strawJar);

  // 6F. South Heritage Feature Wall, Tufted Burgundy Banquette & Framed Artwork
  const rearFeaturePanel = new THREE.Mesh(new THREE.BoxGeometry(18.8, 3.65, 0.18), darkWalnutMat);
  rearFeaturePanel.position.set(399.8, 1.98, 69.15);
  staticGroup.add(rearFeaturePanel);
  for (let wx = 390.8; wx <= 408.8; wx += 0.55) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.10, 3.55, 0.08), warmTimberMat);
    slat.position.set(wx, 1.98, 69.03);
    staticGroup.add(slat);
  }
  const featureTex = createHighlandsFeatureWallTex();
  const featureMat = new THREE.MeshStandardMaterial({
    map: featureTex,
    emissive: 0xfde68a,
    emissiveMap: featureTex,
    emissiveIntensity: 0.22,
    roughness: 0.48,
  });
  const featureSignFrame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.35, 0.08), brushedBrassMat);
  featureSignFrame.position.set(397.2, 2.52, 68.98);
  staticGroup.add(featureSignFrame);
  const featureSign = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 2.10), featureMat);
  featureSign.position.set(397.2, 2.52, 68.92);
  featureSign.rotation.y = Math.PI;
  staticGroup.add(featureSign);

  // Flanking Heritage Origin & Coffee Posters on South Wall + Wall Sconces
  const originPosterTex = createHighlandsPosterTex('origin');
  const originPosterMat = new THREE.MeshStandardMaterial({
    map: originPosterTex,
    emissive: 0xfef3c7,
    emissiveMap: originPosterTex,
    emissiveIntensity: 0.14,
    roughness: 0.5,
  });
  [392.3, 402.1].forEach((px, pIdx) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.92, 0.07), darkBronzeMat);
    frame.position.set(px, 2.48, 68.98);
    staticGroup.add(frame);
    const pPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.32, 1.74),
      pIdx === 0 ? originPosterMat : phinPosterMat
    );
    pPlane.position.set(px, 2.48, 68.93);
    pPlane.rotation.y = Math.PI;
    staticGroup.add(pPlane);
  });
  [393.5, 400.9].forEach((sx) => {
    const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 0.10), warmLedMat);
    sconce.position.set(sx, 2.45, 68.96);
    staticGroup.add(sconce);
  });

  // Tufted Burgundy Leather Banquette Sofa & Corner Indoor Plants
  const rearSofa = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.44, 0.90), highlandsRedMat);
  rearSofa.position.set(396.8, 0.38, 68.4);
  staticGroup.add(rearSofa);
  const rearSofaBack = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.68, 0.22), highlandsRedMat);
  rearSofaBack.position.set(396.8, 0.80, 68.82);
  staticGroup.add(rearSofaBack);
  // Vertical quilted sofa ribs + side armrests
  for (let rx = 392.6; rx <= 401.0; rx += 0.84) {
    const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.60, 0.06), burgundyCurbMat);
    tuft.position.set(rx, 0.82, 68.70);
    staticGroup.add(tuft);
  }
  [392.15, 401.45].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.92), burgundyCurbMat);
    arm.position.set(ax, 0.56, 68.4);
    staticGroup.add(arm);
  });

  // Indoor Corner Potted Tropical Foliage
  staticGroup.add(buildPottedPalm(390.65, 0.16, 67.85, creamWallMat, trunkMat, greenPlantMat, 0.82));
  staticGroup.add(buildPottedPalm(402.85, 0.16, 67.85, creamWallMat, trunkMat, greenPlantMat, 0.82));

  [394.0, 396.8, 399.6].forEach((tx, idx) => {
    staticGroup.add(
      buildHighlandsCafeTableSet(tx, 0.16, 67.3, warmTimberMat, darkBronzeMat, cupBodyMat, cupBandMat, 0, Math.PI)
    );
    const tent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.06), highlandsRedMat);
    tent.position.set(tx, 0.79, 67.3);
    tent.rotation.y = idx * 0.3;
    staticGroup.add(tent);
  });

  // Indoor Central Cafe Tables + Table Tents
  [
    [396.0, 57.6],
    [396.0, 62.2],
  ].forEach(([tx, tz], idx) => {
    staticGroup.add(
      buildHighlandsCafeTableSet(tx, 0.16, tz, warmTimberMat, darkBronzeMat, cupBodyMat, cupBandMat, Math.PI * 0.5, -Math.PI * 0.5)
    );
    const tent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.06), highlandsRedMat);
    tent.position.set(tx, 0.79, tz);
    tent.rotation.y = 0.4 + idx * 0.5;
    staticGroup.add(tent);
  });

  // 6G. Black-Cone Pendant Lamps & Warm Filament Globes Inside
  [
    [394.8, 3.05, 53.5],
    [396.0, 3.05, 57.6],
    [396.0, 3.05, 62.2],
    [403.8, 2.95, 56.2],
    [403.8, 2.95, 60.4],
    [397.0, 3.05, 66.2],
  ].forEach(([lx, ly, lz]) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.92, 6), darkBronzeMat);
    cord.position.set(lx, ly + 0.46, lz);
    staticGroup.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 14, 1, true), pendantShadeMat);
    shade.position.set(lx, ly + 0.08, lz);
    staticGroup.add(shade);
    const brassCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 10), brushedBrassMat);
    brassCollar.position.set(lx, ly + 0.20, lz);
    staticGroup.add(brassCollar);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), warmLedMat);
    globe.position.set(lx, ly - 0.02, lz);
    staticGroup.add(globe);
  });

  // =========================================================================
  // 7. LIGHTING & OPERATING HOURS UPDATE LOOP (07:00 - 23:00)
  // =========================================================================
  const cornerPatioLight = new THREE.PointLight(0xffedd5, 4.2, 34.0, 0.92);
  cornerPatioLight.position.set(389.0, 5.2, 47.6);
  scaledLights.push({
    light: cornerPatioLight,
    dayInt: 4.2,
    nightInt: 18.0,
    getScale: () => 1.0 - mainShutter.progress * 0.85,
  });

  const indoorMainLight = new THREE.PointLight(0xfde68a, 5.6, 36.0, 0.92);
  indoorMainLight.position.set(397.8, 3.45, 58.2);
  scaledLights.push({
    light: indoorMainLight,
    dayInt: 5.6,
    nightInt: 20.0,
    getScale: () => 1.0 - mainShutter.progress,
  });

  const barLight = new THREE.PointLight(0xfffbeb, 5.2, 26.0, 0.92);
  barLight.position.set(405.8, 3.45, 58.8);
  scaledLights.push({
    light: barLight,
    dayInt: 5.2,
    nightInt: 19.0,
    getScale: () => 1.0 - mainShutter.progress,
  });

  const loungeLight = new THREE.PointLight(0xfed7aa, 4.4, 24.0, 0.92);
  loungeLight.position.set(397.2, 3.35, 65.8);
  scaledLights.push({
    light: loungeLight,
    dayInt: 4.4,
    nightInt: 16.5,
    getScale: () => 1.0 - mainShutter.progress,
  });

  const poolTex = createHighlandsGlowPoolTex();
  const patioPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(patioPoolMat);
  const patioPool = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 18.0), patioPoolMat);
  patioPool.rotation.x = -Math.PI / 2;
  patioPool.position.set(389.2, 0.175, 47.8);
  staticGroup.add(patioPool);

  let doorOpenAmount = 0.0;
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: HighlandsNpcController | null
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isHighlandsOpenAtHour(h);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (h < 7.0 || h >= 23.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, Math.max(0, mainShutter.progress - dt * 1.1));
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
    } else {
      closingElapsed += dt;
      const canClose = closingElapsed >= 15.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.7) {
        setShutterProgress(mainShutter, Math.min(1.0, mainShutter.progress + dt * 0.85));
      }
    }
    wasOpen = isOpen;

    // Proximity-activated automatic sliding glass double doors at NW corner
    const nearPlayer =
      !!playerPos &&
      Math.hypot(playerPos.x - DOOR_CENTER_X, playerPos.z - DOOR_CENTER_Z) <= 4.6 &&
      playerPos.y <= 3.5;
    const nearNpc = Boolean(npcController?.hasNpcNearDoor());
    const sensorTriggered = nearPlayer || nearNpc;
    const targetDoor = (isOpen || !mainShutter.progress) && sensorTriggered ? 1.0 : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetDoor, Math.min(1, dt * 6.5));
    doorLeftLeaf.position.x = -0.71 - doorOpenAmount * 1.18;
    doorRightLeaf.position.x = 0.71 + doorOpenAmount * 1.18;

    const litScale = 1.0 - mainShutter.progress * 0.85;
    warmLedMat.emissiveIntensity = (0.72 + lampFactor * 1.05) * litScale;
    roundLogoMat.emissiveIntensity = (0.28 + lampFactor * 0.65) * litScale;
    wordmarkMat.emissiveIntensity = (0.52 + lampFactor * 0.85) * litScale;
    const interiorLit = 1.0 - mainShutter.progress;
    menuMat.emissiveIntensity = (0.24 + lampFactor * 0.42) * interiorLit;
    senPosterMat.emissiveIntensity = (0.18 + lampFactor * 0.35) * interiorLit;
    phinPosterMat.emissiveIntensity = (0.18 + lampFactor * 0.35) * interiorLit;
    originPosterMat.emissiveIntensity = (0.14 + lampFactor * 0.28) * interiorLit;
    retailHeaderMat.emissiveIntensity = (0.20 + lampFactor * 0.35) * interiorLit;
    featureMat.emissiveIntensity = (0.20 + lampFactor * 0.45) * interiorLit;
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => mainShutter.progress,
    update,
  };
}

// =========================================================================
// HIGHLANDS COFFEE NPC CONTROLLER (BARISTAS & PATIO / INDOOR GUESTS)
// =========================================================================

interface HighlandsSeatSlot {
  id: string;
  seatPos: THREE.Vector3;
  yaw: number;
  hipsY: number;
  toSeat: THREE.Vector3[];
  fromSeat: THREE.Vector3[];
  occupiedBy: number | null;
}

const HIGHLANDS_PROFILES = [
  { shirt: 0xb91c1c, pants: 0x1e293b, hair: 0x111827, skinHex: '#fbe0c8' },
  { shirt: 0x0284c7, pants: 0x0f172a, hair: 0x291c15, skinHex: '#f5c7a3' },
  { shirt: 0x059669, pants: 0x334155, hair: 0x1e1b4b, skinHex: '#fbe0c8' },
  { shirt: 0xd97706, pants: 0x1e293b, hair: 0x3b2314, skinHex: '#e8b48e' },
  { shirt: 0x7c3aed, pants: 0x1e293b, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0xe11d48, pants: 0x334155, hair: 0x2c1a10, skinHex: '#fbe0c8' },
  { shirt: 0x0f766e, pants: 0x0f172a, hair: 0x4a2c18, skinHex: '#f5c7a3' },
  { shirt: 0xf59e0b, pants: 0x475569, hair: 0x18181b, skinHex: '#fbe0c8' },
];

type HLCustomerPhase =
  | 'respawn_wait'
  | 'walk_to_bar'
  | 'order_at_bar'
  | 'walk_to_seat'
  | 'drinking_seated'
  | 'walk_leave';

interface HighlandsActor {
  id: number;
  root: THREE.Group;
  hipsGroup: THREE.Group;
  torsoMesh: THREE.Mesh;
  leftArm: THREE.Group;
  leftArmMesh: THREE.Mesh;
  rightArm: THREE.Group;
  rightArmMesh: THREE.Mesh;
  leftLeg: THREE.Group;
  leftLegMesh: THREE.Mesh;
  rightLeg: THREE.Group;
  rightLegMesh: THREE.Mesh;
  headMesh: THREE.Mesh;
  hairMesh: THREE.Mesh;
  cupGroup: THREE.Group;
  kind: 'barista' | 'customer';
  homePos: THREE.Vector3;
  homeYaw: number;
  seed: number;
  walkPhase: number;
  speed: number;
  profileIdx: number;
  phase: HLCustomerPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  stateTimer: number;
  waitYaw: number;
  claimedSeatIdx: number | null;
  exiting: boolean;
  exitDone: boolean;
  exitWaypoints?: THREE.Vector3[];
  exitRef: { idx: number };
  walkPhaseRef: { phase: number };
  glbHandle?: GlbHumanHandle;
}

export class HighlandsNpcController {
  public readonly rootGroup = new THREE.Group();
  private actors: HighlandsActor[] = [];
  private seats: HighlandsSeatSlot[] = [];
  private profileMats: Array<{
    shirt: THREE.MeshStandardMaterial;
    pants: THREE.MeshStandardMaterial;
    hair: THREE.MeshStandardMaterial;
    faceTex: THREE.Texture;
  }> = [];
  private skinMat: THREE.MeshStandardMaterial;
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;
  private nextSpawnSide = 0;

  constructor(private helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x7c2d1d, roughness: 0.78 });
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.40 });
    const cupBandMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.48 });

    this.profileMats = HIGHLANDS_PROFILES.map((p) => ({
      shirt: new THREE.MeshStandardMaterial({ color: p.shirt, roughness: 0.72 }),
      pants: new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.78 }),
      hair: new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.85 }),
      faceTex: helpers.createFaceTexture('happy', p.skinHex),
    }));

    // Outdoor Red-Umbrella Patio Seats (visible from Ngã Tư Sơn Tây just like Image 2 & 3!)
    const patioSeats: Array<{ id: string; x: number; z: number; yaw: number; appX: number; appZ: number }> = [
      { id: 'patio_n1', x: 398.48, z: 45.5, yaw: Math.PI * 0.5, appX: 395.8, appZ: 45.5 },
      { id: 'patio_n2', x: 405.78, z: 45.5, yaw: Math.PI * 0.5, appX: 403.5, appZ: 44.0 },
      { id: 'patio_w1', x: 386.8, z: 57.58, yaw: 0, appX: 386.8, appZ: 55.2 },
      { id: 'patio_w2', x: 386.8, z: 64.58, yaw: 0, appX: 385.2, appZ: 62.5 },
    ];
    patioSeats.forEach((ps) => {
      this.seats.push({
        id: ps.id,
        seatPos: new THREE.Vector3(ps.x, 0.16, ps.z),
        yaw: ps.yaw,
        hipsY: 0.45,
        toSeat: [
          new THREE.Vector3(393.5, 0.16, 52.2),
          new THREE.Vector3(DOOR_CENTER_X, 0.16, DOOR_CENTER_Z),
          new THREE.Vector3(388.2, 0.16, 46.8),
          new THREE.Vector3(ps.appX, 0.16, ps.appZ),
          new THREE.Vector3(ps.x, 0.16, ps.z),
        ],
        fromSeat: [
          new THREE.Vector3(ps.appX, 0.16, ps.appZ),
          new THREE.Vector3(387.8, 0.16, 46.6),
          new THREE.Vector3(383.2, 0.02, 41.2),
        ],
        occupiedBy: null,
      });
    });

    // Indoor Lounge Chairs & Rear Banquette Seats
    const indoorSeats: Array<{ id: string; x: number; z: number; yaw: number; appX: number; appZ: number }> = [
      { id: 'in_t1', x: 395.38, z: 57.6, yaw: Math.PI * 0.5, appX: 393.5, appZ: 57.6 },
      { id: 'in_t2', x: 395.38, z: 62.2, yaw: Math.PI * 0.5, appX: 393.5, appZ: 62.2 },
      { id: 'in_b1', x: 394.0, z: 66.68, yaw: 0, appX: 394.0, appZ: 65.2 },
      { id: 'in_b2', x: 399.6, z: 66.68, yaw: 0, appX: 399.6, appZ: 65.2 },
    ];
    indoorSeats.forEach((is) => {
      this.seats.push({
        id: is.id,
        seatPos: new THREE.Vector3(is.x, 0.16, is.z),
        yaw: is.yaw,
        hipsY: 0.45,
        toSeat: [
          new THREE.Vector3(399.5, 0.16, 55.2),
          new THREE.Vector3(is.appX, 0.16, is.appZ),
          new THREE.Vector3(is.x, 0.16, is.z),
        ],
        fromSeat: [
          new THREE.Vector3(is.appX, 0.16, is.appZ),
          new THREE.Vector3(393.6, 0.16, 52.3),
          new THREE.Vector3(DOOR_CENTER_X, 0.16, DOOR_CENTER_Z),
          new THREE.Vector3(388.2, 0.16, 46.8),
          new THREE.Vector3(383.2, 0.02, 41.2),
        ],
        occupiedBy: null,
      });
    });

    const createActorRig = (
      kind: 'barista' | 'customer',
      profileIdx: number,
      x: number,
      y: number,
      z: number,
      yaw: number,
      speed = 1.26
    ): HighlandsActor => {
      const id = this.actors.length;
      const pm = this.profileMats[profileIdx % this.profileMats.length];
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.set(0, 0.80, 0);
      root.add(hipsGroup);

      const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.24), pm.shirt);
      torsoMesh.position.y = 0.28;
      hipsGroup.add(torsoMesh);

      if (kind === 'barista') {
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.46, 0.04), apronMat);
        apron.position.set(0, 0.20, 0.13);
        hipsGroup.add(apron);
      }

      const headMesh = helpers.createHeadMesh(this.skinMat, pm.faceTex, 0.27, 0.27, 0.27);
      headMesh.position.y = 0.72;
      hipsGroup.add(headMesh);

      const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.10, 0.29), pm.hair);
      hairMesh.position.y = 0.86;
      hipsGroup.add(hairMesh);

      const leftArm = new THREE.Group();
      leftArm.position.set(-0.27, 0.52, 0);
      const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), pm.shirt);
      leftArmMesh.position.y = -0.20;
      leftArm.add(leftArmMesh);
      hipsGroup.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.27, 0.52, 0);
      const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), pm.shirt);
      rightArmMesh.position.y = -0.20;
      rightArm.add(rightArmMesh);
      hipsGroup.add(rightArm);

      // Highlands Red-Banded Iced Coffee Cup
      const cupGroup = new THREE.Group();
      cupGroup.position.set(0, -0.43, 0.06);
      const cBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.13, 8), cupMat);
      cupGroup.add(cBody);
      const cBand = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.040, 0.045, 8), cupBandMat);
      cupGroup.add(cBand);
      cupGroup.visible = false;
      rightArm.add(cupGroup);

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.60, 0.15), pm.pants);
        leg.position.y = -0.30;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), shoeMat);
        shoe.position.set(0, -0.62, 0.03);
        p.add(shoe);
        hipsGroup.add(p);
        return { group: p, legMesh: leg };
      };
      const lLeg = makeLeg(-0.10);
      const rLeg = makeLeg(0.10);

      root.position.set(x, y, z);
      root.rotation.y = yaw;
      this.rootGroup.add(root);

      const seed = id * 1.47;
      const modelSpec =
        kind === 'barista'
          ? id === 0
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(160 + id)
          : pickSeatedCivilianModel(170 + id);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: root,
        fallbackMeshes: [hipsGroup],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: seed * 0.6,
      });

      const actor: HighlandsActor = {
        id,
        root,
        hipsGroup,
        torsoMesh,
        leftArm,
        leftArmMesh,
        rightArm,
        rightArmMesh,
        leftLeg: lLeg.group,
        leftLegMesh: lLeg.legMesh,
        rightLeg: rLeg.group,
        rightLegMesh: rLeg.legMesh,
        headMesh,
        hairMesh,
        cupGroup,
        kind,
        homePos: new THREE.Vector3(x, y, z),
        homeYaw: yaw,
        seed,
        walkPhase: seed * 0.6,
        speed,
        profileIdx,
        phase: 'respawn_wait',
        pathQueue: [],
        pathIdx: 0,
        stateTimer: 0,
        waitYaw: yaw,
        claimedSeatIdx: null,
        exiting: false,
        exitDone: false,
        exitWaypoints:
          kind === 'barista'
            ? [
                new THREE.Vector3(405.8, 0.16, 52.0),
                new THREE.Vector3(398.5, 0.16, 52.5),
                new THREE.Vector3(DOOR_CENTER_X, 0.16, DOOR_CENTER_Z),
                new THREE.Vector3(387.8, 0.16, 46.6),
                new THREE.Vector3(382.5, 0.02, 40.5),
              ]
            : undefined,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      };
      this.actors.push(actor);
      return actor;
    };

    // 2 Highlands Baristas behind the counter
    createActorRig('barista', 0, 405.6, 0.16, 57.0, -Math.PI * 0.5);
    createActorRig('barista', 3, 405.6, 0.16, 60.5, -Math.PI * 0.5);

    // 7 Dynamic Rotating Guests
    for (let i = 0; i < 7; i++) {
      createActorRig('customer', i % this.profileMats.length, 383.2, 0.02, 41.2, 0, 1.24 + (i % 3) * 0.06);
    }
  }

  private applyCustomerProfile(a: HighlandsActor, nextIdx: number) {
    a.profileIdx = nextIdx % this.profileMats.length;
    const pm = this.profileMats[a.profileIdx];
    a.torsoMesh.material = pm.shirt;
    a.leftArmMesh.material = pm.shirt;
    a.rightArmMesh.material = pm.shirt;
    a.leftLegMesh.material = pm.pants;
    a.rightLegMesh.material = pm.pants;
    a.hairMesh.material = pm.hair;
    if (Array.isArray(a.headMesh.material) && a.headMesh.material[4]) {
      const faceMat = a.headMesh.material[4] as THREE.MeshStandardMaterial;
      if (faceMat.map !== pm.faceTex) {
        faceMat.map = pm.faceTex;
        faceMat.needsUpdate = true;
      }
    }
  }

  private setStandingPose(a: HighlandsActor) {
    a.hipsGroup.position.set(0, 0.80, 0);
    a.leftLeg.rotation.x = 0;
    a.rightLeg.rotation.x = 0;
  }

  private setSeatedPose(a: HighlandsActor, hipsY: number) {
    a.hipsGroup.position.set(0, hipsY, -0.03);
    a.leftLeg.rotation.x = -Math.PI * 0.48;
    a.rightLeg.rotation.x = -Math.PI * 0.48;
  }

  private claimFreeSeat(actorId: number): number | null {
    const free: number[] = [];
    for (let i = 0; i < this.seats.length; i++) {
      if (this.seats[i].occupiedBy === null) free.push(i);
    }
    if (free.length === 0) return null;
    const pick = free[Math.floor(Math.random() * free.length)];
    this.seats[pick].occupiedBy = actorId;
    return pick;
  }

  private releaseSeat(a: HighlandsActor) {
    if (a.claimedSeatIdx !== null && this.seats[a.claimedSeatIdx]) {
      if (this.seats[a.claimedSeatIdx].occupiedBy === a.id) {
        this.seats[a.claimedSeatIdx].occupiedBy = null;
      }
      a.claimedSeatIdx = null;
    }
  }

  private assignNewCustomerArrival(a: HighlandsActor, rotateProfile: boolean) {
    this.releaseSeat(a);
    if (rotateProfile) {
      this.applyCustomerProfile(a, a.profileIdx + 3 + (a.id % 4));
    }
    this.setStandingPose(a);
    a.cupGroup.visible = false;

    const fromNorthSidewalk = this.nextSpawnSide++ % 2 === 0;
    const spawnX = fromNorthSidewalk ? 395.0 : 381.2;
    const spawnZ = fromNorthSidewalk ? 40.5 : 53.0;
    a.root.position.set(spawnX, 0.02, spawnZ);
    a.root.visible = true;

    const orderZ = 56.5 + (a.id % 3) * 1.4;
    a.pathQueue = [
      new THREE.Vector3(388.2, 0.16, 46.8),
      new THREE.Vector3(DOOR_CENTER_X, 0.16, DOOR_CENTER_Z),
      new THREE.Vector3(393.5, 0.16, 52.2),
      new THREE.Vector3(402.2, 0.16, orderZ),
    ];
    a.pathIdx = 0;
    a.phase = 'walk_to_bar';
    a.glbHandle?.setAnimState('Walk');
    a.waitYaw = Math.PI * 0.5; // Face +X toward barista counter
  }

  private snapClosed() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (let i = 0; i < this.seats.length; i++) this.seats[i].occupiedBy = null;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.root.visible = false;
      a.exiting = false;
      a.exitDone = true;
      a.claimedSeatIdx = null;
      a.cupGroup.visible = false;
      this.setStandingPose(a);
    }
  }

  private reopen() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.seats.length; i++) this.seats[i].occupiedBy = null;

    let custIdx = 0;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = false;
      a.exitDone = false;
      a.exitRef.idx = 0;
      this.setStandingPose(a);

      if (a.kind === 'barista') {
        a.root.visible = true;
        a.root.position.copy(a.homePos);
        a.root.rotation.y = a.homeYaw;
        a.glbHandle?.setAnimState('Idle');
        continue;
      }

      a.claimedSeatIdx = null;
      if (custIdx < 4) {
        const seatIdx = (custIdx * 2) % this.seats.length;
        const seat = this.seats[seatIdx];
        seat.occupiedBy = a.id;
        a.claimedSeatIdx = seatIdx;
        a.cupGroup.visible = true;
        a.root.visible = true;
        a.root.position.copy(seat.seatPos);
        a.root.rotation.y = seat.yaw;
        this.setSeatedPose(a, seat.hipsY);
        a.phase = 'drinking_seated';
        a.glbHandle?.setAnimState('Sit');
        a.stateTimer = 5.0 + custIdx * 5.0;
      } else {
        a.root.visible = false;
        a.phase = 'respawn_wait';
        a.stateTimer = (custIdx - 4) * 2.0;
      }
      custIdx++;
    }
  }

  private beginClosing() {
    this.closingActive = true;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = true;
      a.exitRef.idx = 0;
      this.setStandingPose(a);
      a.glbHandle?.setAnimState('Walk');

      if (a.kind === 'barista') {
        a.exitDone = false;
        continue;
      }

      if (!a.root.visible || a.phase === 'respawn_wait') {
        this.releaseSeat(a);
        a.exitDone = true;
        a.root.visible = false;
        continue;
      }

      a.exitDone = false;
      const leaveNorth = i % 2 === 0;
      const streetOut = new THREE.Vector3(leaveNorth ? 395.0 : 381.2, 0.02, leaveNorth ? 40.5 : 53.0);
      if (a.claimedSeatIdx !== null) {
        const seat = this.seats[a.claimedSeatIdx];
        a.exitWaypoints = [...seat.fromSeat.map((v) => v.clone()), streetOut];
        this.releaseSeat(a);
      } else {
        a.exitWaypoints = [
          new THREE.Vector3(393.5, 0.16, 52.2),
          new THREE.Vector3(DOOR_CENTER_X, 0.16, DOOR_CENTER_Z),
          new THREE.Vector3(388.2, 0.16, 46.8),
          streetOut,
        ];
      }
    }
  }

  public hasNpcNearDoor(): boolean {
    if (this.fullyClosedAndEmpty) return false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - DOOR_CENTER_X, p.z - DOOR_CENTER_Z) <= 3.3) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: HighlandsActor, dt: number): boolean {
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
      a.pathIdx++;
      return a.pathIdx >= a.pathQueue.length;
    }

    const r = step / dist3D;
    a.root.position.x += dx * r;
    a.root.position.y += dy * r;
    a.root.position.z += dz * r;

    if (distXZ > 0.03) {
      const yaw = Math.atan2(dx, dz);
      let diff = yaw - a.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.root.rotation.y += diff * Math.min(1, dt * 8.5);
    }

    a.walkPhase += dt * 5.8;
    const swing = Math.sin(a.walkPhase) * 0.40;
    a.leftLeg.rotation.x = swing;
    a.rightLeg.rotation.x = -swing;
    a.leftArm.rotation.x = -swing * 0.55;
    a.rightArm.rotation.x = a.cupGroup.visible ? -0.58 : swing * 0.55;
    return false;
  }

  public update(delta: number, rawHour = 10.0) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isHighlandsOpenAtHour(h);

    if (this.wasOpen === null) {
      if (!isOpen) this.snapClosed();
      else this.reopen();
    } else if (!isOpen && this.wasOpen) {
      this.beginClosing();
    } else if (isOpen && !this.wasOpen) {
      this.reopen();
    }
    this.wasOpen = isOpen;

    if (this.fullyClosedAndEmpty) return;

    let allCleared = true;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];

      if (this.closingActive && a.exiting) {
        if (a.exitDone) {
          a.root.visible = false;
          continue;
        }
        allCleared = false;
        const exitPts = a.exitWaypoints ?? [
          new THREE.Vector3(DOOR_CENTER_X, 0.16, DOOR_CENTER_Z),
          new THREE.Vector3(388.2, 0.16, 46.8),
          new THREE.Vector3(383.2, 0.02, 41.2),
        ];
        const done = advanceNpcExitPath(
          a.root,
          exitPts,
          a.exitRef,
          1.55,
          dt,
          { legL: a.leftLeg, legR: a.rightLeg, armL: a.leftArm, armR: a.rightArm },
          a.walkPhaseRef
        );
        if (done) {
          a.exitDone = true;
          a.root.visible = false;
        }
        continue;
      }

      if (a.kind === 'barista') {
        a.root.visible = true;
        const brew = Math.sin(this.timer * 3.1 + a.seed);
        a.rightArm.rotation.x = -0.60 + brew * 0.22;
        a.leftArm.rotation.x = -0.50 - brew * 0.16;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.4 + a.seed) * 0.20;
        continue;
      }

      if (a.phase === 'respawn_wait') {
        a.root.visible = false;
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          this.assignNewCustomerArrival(a, true);
        }
        continue;
      }

      a.root.visible = true;

      if (a.phase === 'walk_to_bar') {
        if (this.stepPath(a, dt)) {
          a.phase = 'order_at_bar';
          a.glbHandle?.setAnimState('Idle');
          a.stateTimer = 3.0 + (a.id % 3) * 0.8;
        }
      } else if (a.phase === 'order_at_bar') {
        let diff = a.waitYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 8.0);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightArm.rotation.x = -0.35 + Math.sin(this.timer * 2.5 + a.seed) * 0.12;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.6 + a.seed) * 0.18;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          a.cupGroup.visible = true;
          const freeSeatIdx = a.id % 5 === 4 ? null : this.claimFreeSeat(a.id);
          if (freeSeatIdx !== null) {
            const seat = this.seats[freeSeatIdx];
            a.claimedSeatIdx = freeSeatIdx;
            a.pathQueue = seat.toSeat.map((v) => v.clone());
            a.pathIdx = 0;
            a.phase = 'walk_to_seat';
            a.glbHandle?.setAnimState('Walk');
          } else {
            const leaveNorth = a.id % 2 === 0;
            a.pathQueue = [
              new THREE.Vector3(393.5, 0.16, 52.2),
              new THREE.Vector3(DOOR_CENTER_X, 0.16, DOOR_CENTER_Z),
              new THREE.Vector3(388.2, 0.16, 46.8),
              new THREE.Vector3(leaveNorth ? 395.0 : 381.2, 0.02, leaveNorth ? 40.5 : 53.0),
            ];
            a.pathIdx = 0;
            a.phase = 'walk_leave';
            a.glbHandle?.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'walk_to_seat') {
        if (this.stepPath(a, dt)) {
          const seat = a.claimedSeatIdx !== null ? this.seats[a.claimedSeatIdx] : null;
          if (seat) {
            a.root.position.copy(seat.seatPos);
            a.root.rotation.y = seat.yaw;
            this.setSeatedPose(a, seat.hipsY);
            a.phase = 'drinking_seated';
            a.glbHandle?.setAnimState('Sit');
            a.stateTimer = 14.0 + ((a.id * 3 + Math.floor(this.timer)) % 10);
          } else {
            a.phase = 'walk_leave';
            a.glbHandle?.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'drinking_seated') {
        const sip = Math.max(0, Math.sin(this.timer * 1.15 + a.seed));
        a.rightArm.rotation.x = -0.58 - sip * 0.50;
        a.leftArm.rotation.x = -0.35;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.05 + a.seed) * 0.22;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          this.setStandingPose(a);
          const seat = a.claimedSeatIdx !== null ? this.seats[a.claimedSeatIdx] : null;
          const leaveNorth = (a.id + Math.floor(this.timer)) % 2 === 0;
          const streetOut = new THREE.Vector3(leaveNorth ? 395.0 : 381.2, 0.02, leaveNorth ? 40.5 : 53.0);
          a.pathQueue = seat
            ? [...seat.fromSeat.map((v) => v.clone()), streetOut]
            : [new THREE.Vector3(383.2, 0.02, 41.2), streetOut];
          a.pathIdx = 0;
          this.releaseSeat(a);
          a.phase = 'walk_leave';
          a.glbHandle?.setAnimState('Walk');
        }
      } else if (a.phase === 'walk_leave') {
        if (this.stepPath(a, dt)) {
          a.root.visible = false;
          a.cupGroup.visible = false;
          a.phase = 'respawn_wait';
          a.stateTimer = 1.5 + (a.id % 4) * 0.9;
        }
      }
    }

    if (this.closingActive && allCleared) {
      this.fullyClosedAndEmpty = true;
    }
  }
}
