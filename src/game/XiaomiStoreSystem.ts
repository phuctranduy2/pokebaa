import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isXiaomiStoreOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface XiaomiStoreBuildResult {
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
    npcController?: XiaomiStoreNpcController | null
  ) => void;
}

// =========================================================================
// XIAOMI FLAGSHIP STORE (XIAOMI HOME) — ĐƯỜNG SƠN TÂY BẮC (BÊN CẠNH SAMSUNG)
// Total Plot: X = 329.8 .. 356.5, Z = -62.4 .. -37.6
//   - Facing East (+X) across Đường Sơn Tây Bắc (North of Samsung Flagship Store)
//   - 5-Bay x 4-Row Blackened-Steel Curtain Wall with Richly Shaded Backlit Opal Bands
//   - Deep Saturated Xiaomi Orange (#FF6900) 3D Squircle Crown Emblem w/ Crisp White "mi"
//   - Floor 1: Concentric LED Ceiling Rings, Brushed-Steel Hero Island, Experience Tables,
//     Xiaomi Smart Mobility Scooter Bay, Ecosystem Packaging Shelves, Smart Living TV/Appliance Zone,
//     Architectural Staircase w/ Steel Stringers & Glass Balustrades, & Service Bar
//   - Floor 2: Elevated Hinged 3-Panel Leica Photo Exhibitions (100% Visible Above Transom),
//     Backlit Wall Gallery Prints, Smart Living Room Sofa & 86" Mini-LED Lounge, & Creator Desk
//   - Podium: Y = 0.08m | Floor 2: Y = 5.08m (XIAOMI_FLOOR_H = 5.0m) via NW Switchback Staircase
// =========================================================================

export const XIAOMI_PODIUM_Y = 0.08;
export const XIAOMI_FLOOR_H = 5.0;

const XIAOMI_MIN_Z = -62.4;
const XIAOMI_MAX_Z = -37.6;
const XIAOMI_CENTER_Z = -50.0;
const XIAOMI_DOOR_X = 352.6;
const XIAOMI_DOOR_Z = -50.0;

export const XIAOMI_COLLIDERS: IntersectionColliderBox[] = [
  // Perimeter Structural Walls (Floor 1 & Floor 2)
  { minX: 329.6, maxX: 330.68, minZ: -62.5, maxZ: -37.5, floor: 'both' }, // West Rear Wall
  { minX: 329.6, maxX: 352.75, minZ: -62.5, maxZ: -61.65, floor: 'both' }, // North Side Wall
  { minX: 329.6, maxX: 352.75, minZ: -38.35, maxZ: -37.5, floor: 'both' }, // South Side Wall

  // East Front Panoramic Curtain Wall (Floor 1 leaves Center Doorway Z = -52.36 .. -47.64 open)
  { minX: 352.25, maxX: 352.95, minZ: -62.4, maxZ: -52.36, floor: 'both' },
  { minX: 352.25, maxX: 352.95, minZ: -47.64, maxZ: -37.6, floor: 'both' },
  { minX: 352.25, maxX: 352.95, minZ: -52.4, maxZ: -47.6, floor: 2 }, // Floor 2 continuous curtain glass

  // Outdoor Digital Flagship Totem Kiosk (North sidewalk bay) & A-Frame Promo Easel (South bay)
  { minX: 352.7, maxX: 353.45, minZ: -56.85, maxZ: -55.55, floor: 1 },
  { minX: 353.0, maxX: 353.75, minZ: -44.2, maxZ: -42.85, floor: 1 },

  // Central Cylindrical Architectural Concrete Column (visible in Row 1 & Row 3)
  { minX: 344.32, maxX: 345.68, minZ: -50.68, maxZ: -49.32, floor: 'both' },

  // Floor 1 Display Islands, Mobility Podium, Shelving & Service Counter
  { minX: 345.7, maxX: 348.7, minZ: -55.1, maxZ: -52.1, floor: 1 }, // Circular Hero Island (Xiaomi 15 Ultra)
  { minX: 345.8, maxX: 347.4, minZ: -46.3, maxZ: -42.1, floor: 1 }, // Front South Flagship Table
  { minX: 340.4, maxX: 342.0, minZ: -56.9, maxZ: -52.7, floor: 1 }, // Mid North AIoT & Pad Table
  { minX: 340.4, maxX: 342.0, minZ: -46.3, maxZ: -42.1, floor: 1 }, // Mid South Ecosystem Table
  { minX: 333.85, maxX: 335.4, minZ: -53.1, maxZ: -46.9, floor: 1 }, // Rear Service & Cashier Bar
  { minX: 338.2, maxX: 349.0, minZ: -39.5, maxZ: -38.2, floor: 1 }, // South Smart Living TV & Appliance Plinth
  { minX: 346.3, maxX: 350.7, minZ: -61.7, maxZ: -58.0, floor: 1 }, // North-East Xiaomi Smart Scooter Podium
  { minX: 336.6, maxX: 345.7, minZ: -61.8, maxZ: -60.5, floor: 1 }, // North Ecosystem Retail Shelf Wall

  // NW Switchback Stairwell Enclosure (X = 331.4..335.8, Z = -61.5..-54.5)
  { minX: 335.68, maxX: 336.02, minZ: -61.6, maxZ: -54.45, floor: 'both' }, // Stairwell East Glass Rail
  { minX: 331.35, maxX: 333.62, minZ: -54.55, maxZ: -54.32, floor: 2 }, // Floor 2 Guard across Down-Flight West slot

  // Floor 2 Gallery & Smart Living Lounge Obstacles
  { minX: 348.8, maxX: 350.4, minZ: -59.1, maxZ: -52.9, floor: 2 }, // North Folding Leica Exhibition Screen
  { minX: 348.8, maxX: 350.4, minZ: -47.1, maxZ: -40.9, floor: 2 }, // South Folding Leica Exhibition Screen
  { minX: 337.9, maxX: 341.9, minZ: -48.6, maxZ: -42.2, floor: 2 }, // Floor 2 Smart Living Sofa Lounge
  { minX: 341.5, maxX: 343.6, minZ: -57.3, maxZ: -52.7, floor: 2 }, // Floor 2 Creator & Smart Home Desk
];

// =========================================================================
// CUSTOM GEOMETRY & HIGH-CONTRAST PROCEDURAL TEXTURES
// =========================================================================

function createSquircleShape(w: number, h: number, radius: number): THREE.Shape {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = Math.min(radius, hw * 0.48, hh * 0.48);
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

function createXiaomiLogoTex(size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  const pad = size * 0.025;
  const side = size - pad * 2;
  const rad = side * 0.30;

  // Deep saturated Xiaomi Orange (prevents washed-out pastel look in daylight)
  const grad = ctx.createLinearGradient(0, pad, 0, size - pad);
  grad.addColorStop(0, '#ff6a00');
  grad.addColorStop(0.5, '#ff5900');
  grad.addColorStop(1, '#e24900');

  ctx.beginPath();
  ctx.moveTo(pad + rad, pad);
  ctx.lineTo(pad + side - rad, pad);
  ctx.quadraticCurveTo(pad + side, pad, pad + side, pad + rad);
  ctx.lineTo(pad + side, pad + side - rad);
  ctx.quadraticCurveTo(pad + side, pad + side, pad + side - rad, pad + side);
  ctx.lineTo(pad + rad, pad + side);
  ctx.quadraticCurveTo(pad, pad + side, pad, pad + side - rad);
  ctx.lineTo(pad, pad + rad);
  ctx.quadraticCurveTo(pad, pad, pad + rad, pad);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Crisp subtle dark perimeter outline for architectural sign framing (matches reference photo!)
  ctx.strokeStyle = '#3f1d0b';
  ctx.lineWidth = size * 0.018;
  ctx.stroke();

  // Crisp White "mi" Monogram
  ctx.fillStyle = '#ffffff';
  const s = size;
  const topY = s * 0.33;
  const botY = s * 0.67;
  const strokeW = s * 0.072;

  ctx.fillRect(s * 0.22, topY, strokeW, botY - topY);
  ctx.beginPath();
  ctx.moveTo(s * 0.22, topY);
  ctx.lineTo(s * 0.51, topY);
  ctx.quadraticCurveTo(s * 0.615, topY, s * 0.615, topY + s * 0.11);
  ctx.lineTo(s * 0.615, botY);
  ctx.lineTo(s * 0.615 - strokeW, botY);
  ctx.lineTo(s * 0.615 - strokeW, topY + s * 0.115);
  ctx.quadraticCurveTo(s * 0.615 - strokeW, topY + strokeW, s * 0.505, topY + strokeW);
  ctx.lineTo(s * 0.22, topY + strokeW);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(s * 0.382, topY + s * 0.125, strokeW, botY - (topY + s * 0.125));
  ctx.fillRect(s * 0.695, topY, strokeW, botY - topY);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBacklitOpalTex(variant = 0): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Distinct frosted opal studio-glow gradient (cool slate perimeter -> bright white center, like ảnh 2!)
  const vGrad = ctx.createLinearGradient(0, 0, 0, h);
  vGrad.addColorStop(0.0, '#8e9aaf');
  vGrad.addColorStop(0.14, '#cbd5e1');
  vGrad.addColorStop(0.5, '#f8fafc');
  vGrad.addColorStop(0.86, '#cbd5e1');
  vGrad.addColorStop(1.0, '#7c899e');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal structural tube shadow & lateral edge vignetting
  const hGrad = ctx.createLinearGradient(0, 0, w, 0);
  hGrad.addColorStop(0.0, 'rgba(71, 85, 105, 0.28)');
  hGrad.addColorStop(0.18, 'rgba(255, 255, 255, 0.05)');
  hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.28)');
  hGrad.addColorStop(0.82, 'rgba(255, 255, 255, 0.05)');
  hGrad.addColorStop(1.0, 'rgba(71, 85, 105, 0.28)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, w, h);

  const cx = w * (0.42 + (variant % 3) * 0.08);
  const rGrad = ctx.createRadialGradient(cx, h * 0.5, w * 0.04, w * 0.5, h * 0.5, w * 0.54);
  rGrad.addColorStop(0, 'rgba(255, 255, 255, 0.78)');
  rGrad.addColorStop(0.65, 'rgba(241, 245, 249, 0.20)');
  rGrad.addColorStop(1, 'rgba(100, 116, 139, 0.16)');
  ctx.fillStyle = rGrad;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPerforatedCladdingTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#20242c';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(10, 14, 22, 0.85)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= h; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (let y = 18; y < h; y += 22) {
    for (let x = 16; x < w; x += 24) {
      ctx.fillStyle = (x + y) % 44 === 0 ? 'rgba(226, 232, 240, 0.45)' : 'rgba(148, 163, 184, 0.20)';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  tex.anisotropy = 4;
  return tex;
}

function createXiaomiFloorTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ddd8cf';
  ctx.fillRect(0, 0, w, h);

  const cell = 128;
  for (let r = 0; r < 4; r++) {
    for (let col = 0; col < 4; col++) {
      const shade = ((r * 7 + col * 11) % 5) - 2;
      ctx.fillStyle = `rgb(${222 + shade * 4}, ${217 + shade * 4}, ${208 + shade * 4})`;
      ctx.fillRect(col * cell + 2, r * cell + 2, cell - 4, cell - 4);
    }
  }

  ctx.strokeStyle = 'rgba(120, 113, 108, 0.30)';
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

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
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

  ctx.fillStyle = '#2e333c';
  ctx.fillRect(0, 0, w, h);

  const cols = 4;
  const rows = 8;
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lum = 46 + ((r * 9 + col * 5) % 12);
      ctx.fillStyle = `rgb(${lum}, ${lum + 3}, ${lum + 8})`;
      ctx.fillRect(col * cw + 2, r * ch + 2, cw - 4, ch - 4);
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

function createGalleryPhotoTex(idx: number): THREE.CanvasTexture {
  const w = 384;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const paletteIdx = idx % 8;
  if (paletteIdx === 0) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, '#1e3a5f');
    sky.addColorStop(0.55, '#ea580c');
    sky.addColorStop(1, '#fde047');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#0f4c5c';
    ctx.fillRect(0, h * 0.58, w, h * 0.20);
    ctx.fillStyle = '#d6b48a';
    ctx.fillRect(0, h * 0.76, w, h * 0.24);

    ctx.fillStyle = 'rgba(254, 240, 138, 0.90)';
    ctx.beginPath();
    ctx.arc(w * 0.62, h * 0.44, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(w * 0.36, h * 0.56, 26, 78);
    ctx.beginPath();
    ctx.arc(w * 0.36 + 13, h * 0.53, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.48, h * 0.60, 22, 62);
    ctx.beginPath();
    ctx.arc(w * 0.48 + 11, h * 0.57, 11, 0, Math.PI * 2);
    ctx.fill();
  } else if (paletteIdx === 1) {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#78350f');
    bg.addColorStop(0.5, '#b45309');
    bg.addColorStop(1, '#451a03');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 191, 36, 0.24)' : 'rgba(132, 204, 22, 0.22)';
      ctx.beginPath();
      ctx.arc(((i * 73) % w), ((i * 97) % h), 28 + (i % 3) * 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.42, 64, 20, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3cfb6';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.52, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(w * 0.34, h * 0.61, w * 0.32, h * 0.32);
  } else if (paletteIdx === 2) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0f172a');
    sky.addColorStop(0.55, '#1e3a8a');
    sky.addColorStop(1, '#38bdf8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.62);
    ctx.lineTo(w * 0.36, h * 0.36);
    ctx.lineTo(w * 0.64, h * 0.56);
    ctx.lineTo(w, h * 0.40);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.24, 24, 0, Math.PI * 2);
    ctx.fill();
  } else if (paletteIdx === 3) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#431407');
    bg.addColorStop(0.5, '#9a3412');
    bg.addColorStop(1, '#7c2d12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#f5d0b5';
    ctx.beginPath();
    ctx.arc(w * 0.38, h * 0.46, 36, 0, Math.PI * 2);
    ctx.arc(w * 0.62, h * 0.50, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(w * 0.24, h * 0.58, w * 0.52, h * 0.34);
  } else if (paletteIdx === 4) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, w, h * 0.48);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, h * 0.48, w, h * 0.52);

    ctx.fillStyle = '#f97316';
    ctx.fillRect(w * 0.35, h * 0.46, w * 0.3, h * 0.42);
    ctx.fillStyle = '#f3cfb6';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.36, 28, 0, Math.PI * 2);
    ctx.fill();
  } else if (paletteIdx === 5) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#fef08a');
    bg.addColorStop(1, '#fb923c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(w * 0.40, h * 0.46, w * 0.20, h * 0.42);
    ctx.fillStyle = '#f3cfb6';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.36, 26, 0, Math.PI * 2);
    ctx.fill();
  } else if (paletteIdx === 6) {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#f4f4f5');
    bg.addColorStop(1, '#d4d4d8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(w * 0.28, h * 0.44, w * 0.44, h * 0.50);
    ctx.fillStyle = '#f3cfb6';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.33, 30, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#312e81');
    bg.addColorStop(0.55, '#db2777');
    bg.addColorStop(1, '#f97316');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.45, 76, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.80)';
  ctx.fillRect(0, h - 54, w, 54);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Xiaomi × Leica', 22, h - 22);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(w - 30, h - 28, 8, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGlassTransomTextTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.font = '700 44px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Xiaomi 15 Ultra', w * 0.5, h * 0.40);

  ctx.fillStyle = '#ea580c';
  ctx.font = '700 19px sans-serif';
  ctx.fillText('LEICA SUMMILUX  •  XIAOMI HOME', w * 0.5, h * 0.78);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createXiaomiHeaderTex(): THREE.CanvasTexture {
  const w = 640;
  const h = 140;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Rich matte dark graphite sign backing so it pops against bright warm stone wall!
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ff6900';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 46px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Xiaomi Home', w * 0.5, h * 0.42);

  ctx.fillStyle = '#fb923c';
  ctx.font = '600 18px sans-serif';
  ctx.fillText('FLAGSHIP SHOWROOM  •  LEICA OPTICS  •  AIoT', w * 0.5, h * 0.78);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createZoneBannerTex(title: string, subtitle: string): THREE.CanvasTexture {
  const w = 512;
  const h = 112;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ff6900';
  ctx.fillRect(0, 0, 14, h);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 34px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 34, 50);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 18px sans-serif';
  ctx.fillText(subtitle, 34, 84);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createXiaomiOutdoorKioskTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#18181b');
  g.addColorStop(0.55, '#27272a');
  g.addColorStop(1, '#09090b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ff6900';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('XIAOMI', w * 0.5, 58);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('15 Ultra', w * 0.5, 92);

  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w * 0.5, 215, 58, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(w * 0.5, 215, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(w * 0.43, 200, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(w * 0.57, 200, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('LEICA', w * 0.5, 250);

  ctx.fillStyle = '#fb923c';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('07:00 - 23:00', w * 0.5, 458);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPromoEaselTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#fafaf9';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ff6900';
  ctx.fillRect(0, 0, w, 58);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('XIAOMI HOME', w * 0.5, 36);

  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Xiaomi 15 Ultra', w * 0.5, 112);
  ctx.fillStyle = '#71717a';
  ctx.font = '15px sans-serif';
  ctx.fillText('Leica 200MP Telephoto', w * 0.5, 142);

  // Graphic phone camera ring icon
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w * 0.5, 232, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(w * 0.5, 232, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('LEICA', w * 0.5, 236);

  ctx.fillStyle = '#ea580c';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('OPEN 07:00 - 23:00', w * 0.5, 342);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createXiaomiDeviceScreenTex(kind: 'ultra' | 'fold' | 'flip' | 'pad' | 'laptop' | 'tv'): THREE.CanvasTexture {
  const w = 256;
  const h = kind === 'pad' || kind === 'laptop' || kind === 'tv' ? 160 : 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, w, h);
  if (kind === 'ultra') {
    g.addColorStop(0, '#09090b');
    g.addColorStop(0.55, '#431407');
    g.addColorStop(1, '#ea580c');
  } else if (kind === 'fold') {
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#1e3a8a');
    g.addColorStop(1, '#38bdf8');
  } else if (kind === 'flip') {
    g.addColorStop(0, '#4c1d95');
    g.addColorStop(0.6, '#db2777');
    g.addColorStop(1, '#fb923c');
  } else if (kind === 'pad') {
    g.addColorStop(0, '#1e293b');
    g.addColorStop(0.5, '#ea580c');
    g.addColorStop(1, '#fef3c7');
  } else if (kind === 'tv') {
    g.addColorStop(0, '#020617');
    g.addColorStop(0.45, '#9a3412');
    g.addColorStop(1, '#fb923c');
  } else {
    g.addColorStop(0, '#0f172a');
    g.addColorStop(1, '#475569');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.45, Math.min(w, h) * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  const label =
    kind === 'ultra'
      ? '15 Ultra'
      : kind === 'fold'
        ? 'MIX Fold 4'
        : kind === 'flip'
          ? 'MIX Flip'
          : kind === 'pad'
            ? 'Pad 7 Pro'
            : kind === 'tv'
              ? 'TV S Mini LED'
              : 'Book Pro';
  ctx.fillText(label, w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createXiaomiPlacardTex(title: string): THREE.CanvasTexture {
  const w = 128;
  const h = 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ff6900';
  ctx.fillRect(0, 0, w, 9);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w * 0.5, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createXiaomiOpenHoursTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ff6900';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('XIAOMI HOME', w * 0.5, 44);

  ctx.fillStyle = '#fb923c';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('07:00 - 23:00', w * 0.5, 92);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createXiaomiBagTex(): THREE.CanvasTexture {
  const w = 128;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ff6900';
  ctx.fillRect(42, 42, 44, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('mi', 64, 72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================================
// MAIN XIAOMI FLAGSHIP STORE BUILDER
// =========================================================================

export function createXiaomiStoreStructure(): XiaomiStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const STORE_W = XIAOMI_MAX_Z - XIAOMI_MIN_Z; // 24.8m (-62.4 .. -37.6)
  const F1_Y = XIAOMI_PODIUM_Y; // 0.08
  const F2_Y = XIAOMI_PODIUM_Y + XIAOMI_FLOOR_H; // 5.08
  const ROOF_Y = 10.62;

  // Materials
  const blackSteelMat = new THREE.MeshStandardMaterial({ color: 0x16191f, roughness: 0.34, metalness: 0.78 });
  const darkCladMat = new THREE.MeshStandardMaterial({
    map: createPerforatedCladdingTex(),
    color: 0xffffff,
    roughness: 0.52,
    metalness: 0.42,
  });
  const graniteMat = new THREE.MeshStandardMaterial({
    map: createApronGraniteTex(),
    color: 0xffffff,
    roughness: 0.44,
    metalness: 0.14,
  });
  const floorTileMat = new THREE.MeshStandardMaterial({
    map: createXiaomiFloorTex(),
    color: 0xffffff,
    roughness: 0.26,
    metalness: 0.08,
  });
  const whiteWallMat = new THREE.MeshStandardMaterial({ color: 0xebe6dd, roughness: 0.72 });
  const warmStoneMat = new THREE.MeshStandardMaterial({ color: 0xd8d1c5, roughness: 0.65 });
  const concreteColMat = new THREE.MeshStandardMaterial({ color: 0xc8c3b9, roughness: 0.56 });
  const walnutMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.52 });
  const oakWoodMat = new THREE.MeshStandardMaterial({ color: 0xc8a274, roughness: 0.50 });
  const brushedSteelMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.24, metalness: 0.86 });
  const darkTableBaseMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.55 });
  const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.9 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0xbeb7ab, roughness: 0.88 });
  const sofaFabricMat = new THREE.MeshStandardMaterial({ color: 0xe5e0d8, roughness: 0.82 });
  const railGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdff2ff,
    transparent: true,
    opacity: 0.34,
    roughness: 0.12,
    metalness: 0.15,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe2f3ff,
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const canopyGlassMat = new THREE.MeshStandardMaterial({
    color: 0xcbe8f6,
    transparent: true,
    opacity: 0.40,
    roughness: 0.1,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const ceiledRingLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 2.6,
    roughness: 0.16,
  });

  const ceilingBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffdf5,
    emissiveIntensity: 2.9,
    roughness: 0.14,
  });

  const orangeAccentMat = new THREE.MeshStandardMaterial({
    color: 0xff6200,
    emissive: 0xea580c,
    emissiveIntensity: 0.85,
    roughness: 0.24,
  });
  neonMats.push(orangeAccentMat);

  const backlitOpalMats: THREE.MeshStandardMaterial[] = [0, 1, 2].map((v) => {
    const tex = createBacklitOpalTex(v);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      emissive: 0xf8fafc,
      emissiveMap: tex,
      emissiveIntensity: 0.72,
      roughness: 0.24,
    });
    return mat;
  });

  // =========================================================================
  // 1. PODIUM SLAB, FRONT GRANITE PROMENADE APRON & BEVEL RAMP
  // =========================================================================
  const floor1Slab = new THREE.Mesh(new THREE.BoxGeometry(22.8, F1_Y, STORE_W), floorTileMat);
  floor1Slab.position.set(341.2, F1_Y * 0.5, XIAOMI_CENTER_Z);
  staticGroup.add(floor1Slab);

  const apronSlab = new THREE.Mesh(new THREE.BoxGeometry(3.25, F1_Y, STORE_W), graniteMat);
  apronSlab.position.set(354.225, F1_Y * 0.5, XIAOMI_CENTER_Z);
  staticGroup.add(apronSlab);

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.68, F1_Y, STORE_W), graniteMat);
  ramp.position.set(356.17, F1_Y * 0.48, XIAOMI_CENTER_Z);
  ramp.rotation.z = -0.11;
  staticGroup.add(ramp);

  // =========================================================================
  // 2. ARCHITECTURAL SHELL (REAR WALL, SIDE WALLS, FLOOR 2 DECK, ROOF)
  // =========================================================================
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(0.85, ROOF_Y + 0.85 - F1_Y, STORE_W), darkCladMat);
  rearWall.position.set(330.225, (ROOF_Y + 0.85 + F1_Y) * 0.5, XIAOMI_CENTER_Z);
  staticGroup.add(rearWall);

  const rearLiner = new THREE.Mesh(new THREE.BoxGeometry(0.08, ROOF_Y - F1_Y - 0.1, STORE_W - 1.5), whiteWallMat);
  rearLiner.position.set(330.69, (ROOF_Y + F1_Y) * 0.5, XIAOMI_CENTER_Z);
  staticGroup.add(rearLiner);

  // Decorative warm-walnut ribbed paneling slats behind rear Service Counter (adds rich depth!)
  for (let i = 0; i < 16; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.8, 0.14), walnutMat);
    slat.position.set(330.76, F1_Y + 2.35, -54.0 + i * 0.54);
    staticGroup.add(slat);
  }

  const addSideWall = (zCenter: number, linerOffsetZ: number) => {
    const ext = new THREE.Mesh(new THREE.BoxGeometry(21.9, ROOF_Y + 0.85 - F1_Y, 0.7), darkCladMat);
    ext.position.set(341.6, (ROOF_Y + 0.85 + F1_Y) * 0.5, zCenter);
    staticGroup.add(ext);

    const intLiner = new THREE.Mesh(new THREE.BoxGeometry(21.6, ROOF_Y - F1_Y - 0.1, 0.06), warmStoneMat);
    intLiner.position.set(341.6, (ROOF_Y + F1_Y) * 0.5, zCenter + linerOffsetZ);
    staticGroup.add(intLiner);
  };
  addSideWall(-62.05, 0.38);
  addSideWall(-37.95, -0.38);

  // Floor 2 Walkable Deck (Y = 4.88 .. 5.08), cleanly split around NW stairwell hole (X=330.8..336.0, Z=-61.7..-54.5)
  const f2EastDeck = new THREE.Mesh(new THREE.BoxGeometry(16.45, 0.20, 23.4), floorTileMat);
  f2EastDeck.position.set(344.225, F2_Y - 0.10, XIAOMI_CENTER_Z);
  staticGroup.add(f2EastDeck);

  const f1EastCeiling = new THREE.Mesh(new THREE.BoxGeometry(16.45, 0.04, 23.4), whiteWallMat);
  f1EastCeiling.position.set(344.225, F2_Y - 0.22, XIAOMI_CENTER_Z);
  staticGroup.add(f1EastCeiling);

  const f2SwDeck = new THREE.Mesh(new THREE.BoxGeometry(5.30, 0.20, 16.2), floorTileMat);
  f2SwDeck.position.set(333.35, F2_Y - 0.10, -46.4);
  staticGroup.add(f2SwDeck);

  const f1SwCeiling = new THREE.Mesh(new THREE.BoxGeometry(5.30, 0.04, 16.2), whiteWallMat);
  f1SwCeiling.position.set(333.35, F2_Y - 0.22, -46.4);
  staticGroup.add(f1SwCeiling);

  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.85, STORE_W), darkCladMat);
  roofSlab.position.set(341.7, ROOF_Y + 0.425, XIAOMI_CENTER_Z);
  staticGroup.add(roofSlab);

  const f2CeilingSlab = new THREE.Mesh(new THREE.BoxGeometry(21.7, 0.06, 23.4), whiteWallMat);
  f2CeilingSlab.position.set(341.6, ROOF_Y - 0.05, XIAOMI_CENTER_Z);
  staticGroup.add(f2CeilingSlab);

  const roofTrimFront = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.88, STORE_W + 0.16), blackSteelMat);
  roofTrimFront.position.set(352.72, ROOF_Y + 0.43, XIAOMI_CENTER_Z);
  staticGroup.add(roofTrimFront);

  [-62.1, -37.9].forEach((pz) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.90, ROOF_Y + 0.84 - F1_Y, 0.62), darkCladMat);
    pier.position.set(352.35, (ROOF_Y + 0.84 + F1_Y) * 0.5, pz);
    staticGroup.add(pier);
  });

  // Central Cylindrical Architectural Concrete Column with Stainless Plinth Collar (Row 1 & Row 3 focal point!)
  const centerColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, ROOF_Y - F1_Y - 0.08, 24),
    concreteColMat
  );
  centerColumn.position.set(345.0, (ROOF_Y + F1_Y) * 0.5, XIAOMI_CENTER_Z);
  staticGroup.add(centerColumn);

  const colPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.66, 0.14, 24), brushedSteelMat);
  colPlinth.position.set(345.0, F1_Y + 0.07, XIAOMI_CENTER_Z);
  staticGroup.add(colPlinth);

  const colPlinthF2 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.66, 0.14, 24), brushedSteelMat);
  colPlinthF2.position.set(345.0, F2_Y + 0.07, XIAOMI_CENTER_Z);
  staticGroup.add(colPlinthF2);

  // Two Flanking Interior Rear Concrete Columns
  [-56.2, -43.8].forEach((cz) => {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, F2_Y - 0.24 - F1_Y, 18),
      concreteColMat
    );
    col.position.set(339.2, (F2_Y - 0.24 + F1_Y) * 0.5, cz);
    staticGroup.add(col);
  });

  // =========================================================================
  // 3. 5-BAY × 4-ROW BLACKENED-STEEL CURTAIN WALL FACADE (X = 352.6)
  // =========================================================================
  const GRID_MIN_Z = -61.8;
  const GRID_MAX_Z = -38.2;
  const BAY_COUNT = 5;
  const BAY_W = (GRID_MAX_Z - GRID_MIN_Z) / BAY_COUNT; // 4.72m per bay

  for (let i = 0; i <= BAY_COUNT; i++) {
    const mz = GRID_MIN_Z + i * BAY_W;
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, ROOF_Y - F1_Y, 0.11), blackSteelMat);
    mullion.position.set(352.60, (ROOF_Y + F1_Y) * 0.5, mz);
    staticGroup.add(mullion);
  }

  const rowBounds = [F1_Y + 0.04, 4.35, 5.85, 8.35, ROOF_Y - 0.03];
  rowBounds.forEach((ty) => {
    const transom = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, GRID_MAX_Z - GRID_MIN_Z + 0.12), blackSteelMat);
    transom.position.set(352.60, ty, XIAOMI_CENTER_Z);
    staticGroup.add(transom);
  });

  for (let b = 0; b < BAY_COUNT; b++) {
    const bayCenterZ = GRID_MIN_Z + (b + 0.5) * BAY_W;
    const clearBayW = BAY_W - 0.12;

    // Row 4: Crown Backlit Opal Band
    const r4Mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(clearBayW, 2.15),
      backlitOpalMats[(b + 1) % backlitOpalMats.length]
    );
    r4Mesh.rotation.y = Math.PI / 2;
    r4Mesh.position.set(352.61, 9.48, bayCenterZ);
    r4Mesh.userData.noMerge = true;
    staticGroup.add(r4Mesh);

    const r4Back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.16, clearBayW), warmStoneMat);
    r4Back.position.set(352.53, 9.48, bayCenterZ);
    staticGroup.add(r4Back);

    // Row 3: Clear Floor 2 Gallery Window
    const r3Glass = new THREE.Mesh(new THREE.PlaneGeometry(clearBayW, 2.40), glassMat);
    r3Glass.rotation.y = Math.PI / 2;
    r3Glass.position.set(352.60, 7.10, bayCenterZ);
    staticGroup.add(r3Glass);

    // Row 2: Mid Backlit Opal Band
    const r2Mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(clearBayW, 1.40),
      backlitOpalMats[b % backlitOpalMats.length]
    );
    r2Mesh.rotation.y = Math.PI / 2;
    r2Mesh.position.set(352.61, 5.10, bayCenterZ);
    r2Mesh.userData.noMerge = true;
    staticGroup.add(r2Mesh);

    const r2Back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.41, clearBayW), warmStoneMat);
    r2Back.position.set(352.53, 5.10, bayCenterZ);
    staticGroup.add(r2Back);

    // Row 1: Ground Storefront Windows & Automated Sliding Doors
    if (b === 2) {
      const doorTransom = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, clearBayW), blackSteelMat);
      doorTransom.position.set(352.60, 3.38, bayCenterZ);
      staticGroup.add(doorTransom);

      const transomGlass = new THREE.Mesh(new THREE.PlaneGeometry(clearBayW, 0.90), glassMat);
      transomGlass.rotation.y = Math.PI / 2;
      transomGlass.position.set(352.60, 3.85, bayCenterZ);
      staticGroup.add(transomGlass);

      const decalMat = new THREE.MeshBasicMaterial({
        map: createGlassTransomTextTex(),
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
      });
      const decalPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.82), decalMat);
      decalPlane.rotation.y = Math.PI / 2;
      decalPlane.position.set(352.64, 3.86, bayCenterZ);
      decalPlane.userData.noMerge = true;
      staticGroup.add(decalPlane);
    } else {
      const r1Glass = new THREE.Mesh(new THREE.PlaneGeometry(clearBayW, 4.16), glassMat);
      r1Glass.rotation.y = Math.PI / 2;
      r1Glass.position.set(352.60, 2.22, bayCenterZ);
      staticGroup.add(r1Glass);

      if (b === 1 || b === 3) {
        const doorHead = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, clearBayW), blackSteelMat);
        doorHead.position.set(352.60, 3.38, bayCenterZ);
        staticGroup.add(doorHead);

        [-0.95, 0.95].forEach((dz) => {
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), brushedSteelMat);
          handle.position.set(352.67, 1.45, bayCenterZ + dz * 0.25);
          staticGroup.add(handle);
        });
      }
    }
  }

  // Automatic Sliding Glass Doors inside Center Bay 2
  const doorLeafNorthClosedZ = -51.14;
  const doorLeafSouthClosedZ = -48.86;
  const buildDoorLeaf = (zPos: number) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.22, 2.26), glassMat);
    glassPane.position.y = F1_Y + 1.63;
    grp.add(glassPane);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 2.30), blackSteelMat);
    frameTop.position.y = F1_Y + 3.25;
    grp.add(frameTop);

    const frameBot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 2.30), blackSteelMat);
    frameBot.position.y = F1_Y + 0.05;
    grp.add(frameBot);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 8), brushedSteelMat);
    handle.position.set(0.06, F1_Y + 1.40, zPos < XIAOMI_DOOR_Z ? 0.86 : -0.86);
    grp.add(handle);

    grp.position.set(XIAOMI_DOOR_X + 0.02, 0, zPos);
    staticGroup.add(grp);
    return grp;
  };
  const doorLeafNorth = buildDoorLeaf(doorLeafNorthClosedZ);
  const doorLeafSouth = buildDoorLeaf(doorLeafSouthClosedZ);

  // Rolling Shutter Door (23:00 - 07:00)
  const shutterTex = createRollingShutterTexture({
    title: 'XIAOMI HOME',
    hoursLabel: '07:00 - 23:00',
    accentHex: '#ea580c',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.48,
    metalness: 0.6,
  });
  const shutterHandle: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'xiaomi_main_shutter',
      axis: 'z',
      pos: XIAOMI_DOOR_X + 0.10,
      spanCenter: XIAOMI_DOOR_Z,
      width: 4.64,
      baseY: F1_Y,
      topY: F1_Y + 3.28,
    },
    shutterMat,
    blackSteelMat
  );

  // =========================================================================
  // 4. TWO CANTILEVERED GLASS STORM CANOPIES + TENSION RODS (BAYS 1 & 3)
  // =========================================================================
  const buildGlassCanopy = (centerZ: number) => {
    const canopyW = BAY_W - 0.18;
    const canopyDepth = 1.68;

    const glassSheet = new THREE.Mesh(new THREE.BoxGeometry(canopyDepth, 0.05, canopyW), canopyGlassMat);
    glassSheet.position.set(352.66 + canopyDepth * 0.5, 4.30, centerZ);
    staticGroup.add(glassSheet);

    const frontRim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, canopyW + 0.06), blackSteelMat);
    frontRim.position.set(352.66 + canopyDepth, 4.30, centerZ);
    staticGroup.add(frontRim);

    [-canopyW * 0.46, canopyW * 0.46].forEach((dz) => {
      const sideArm = new THREE.Mesh(new THREE.BoxGeometry(canopyDepth, 0.06, 0.06), blackSteelMat);
      sideArm.position.set(352.66 + canopyDepth * 0.5, 4.30, centerZ + dz);
      staticGroup.add(sideArm);

      const p0 = new THREE.Vector3(352.68, 5.42, centerZ + dz);
      const p1 = new THREE.Vector3(352.66 + canopyDepth * 0.85, 4.33, centerZ + dz);
      const rodLen = p0.distanceTo(p1);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rodLen, 8), blackSteelMat);
      rod.position.copy(p0).lerp(p1, 0.5);
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
      staticGroup.add(rod);
    });
  };
  buildGlassCanopy(GRID_MIN_Z + 1.5 * BAY_W);
  buildGlassCanopy(GRID_MIN_Z + 3.5 * BAY_W);

  // =========================================================================
  // 5. GIANT DEEP-ORANGE "mi" SQUIRCLE EMBLEM + DARK RIM BEZEL + OUTDOOR KIOSK/EASEL
  // =========================================================================
  const miLogoTex = createXiaomiLogoTex(512);
  const miBezelGeo = new THREE.ExtrudeGeometry(createSquircleShape(3.16, 3.16, 0.94), {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 16,
  });
  miBezelGeo.rotateY(Math.PI / 2);

  // Crisp Dark Perimeter Bezel Frame matching photo's dark edge outline!
  const miBezelMesh = new THREE.Mesh(miBezelGeo, blackSteelMat);
  miBezelMesh.position.set(352.65, 9.48, XIAOMI_CENTER_Z);
  staticGroup.add(miBezelMesh);

  // Deep Vibrant Xiaomi Orange Body + Luminous Glow
  const miHousingMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xc2410c,
    emissiveIntensity: 0.65,
    roughness: 0.24,
  });

  const miFaceMat = new THREE.MeshStandardMaterial({
    map: miLogoTex,
    color: 0xffffff,
    emissive: 0xff6a00,
    emissiveMap: miLogoTex,
    emissiveIntensity: 1.05,
    transparent: true,
    alphaTest: 0.12,
    roughness: 0.22,
  });

  const miFacePlane = new THREE.Mesh(new THREE.PlaneGeometry(3.04, 3.04), miFaceMat);
  miFacePlane.rotation.y = Math.PI / 2;
  miFacePlane.position.set(352.94, 9.48, XIAOMI_CENTER_Z);
  miFacePlane.userData.noMerge = true;
  staticGroup.add(miFacePlane);

  // Outdoor Digital Totem Kiosk (Left Sidewalk Bay)
  const kioskStand = new THREE.Mesh(new THREE.BoxGeometry(0.46, 2.05, 0.92), blackSteelMat);
  kioskStand.position.set(353.10, F1_Y + 1.025, -56.2);
  staticGroup.add(kioskStand);

  const kioskScreenTex = createXiaomiOutdoorKioskTex();
  const kioskScreenMat = new THREE.MeshStandardMaterial({
    map: kioskScreenTex,
    emissive: 0xffffff,
    emissiveMap: kioskScreenTex,
    emissiveIntensity: 0.72,
    roughness: 0.2,
  });
  neonMats.push(kioskScreenMat);
  const kioskScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.80, 1.72), kioskScreenMat);
  kioskScreen.rotation.y = Math.PI / 2;
  kioskScreen.position.set(353.34, F1_Y + 1.08, -56.2);
  kioskScreen.userData.noMerge = true;
  staticGroup.add(kioskScreen);

  // Outdoor Promo A-Frame Easel Sign (Right Sidewalk Bay — matches bottom-right A-frame in ảnh 2!)
  const easelGroup = new THREE.Group();
  easelGroup.position.set(353.38, F1_Y, -43.5);
  const easelFront = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.32, 0.88), blackSteelMat);
  easelFront.position.set(0.14, 0.65, 0);
  easelFront.rotation.z = 0.18;
  easelGroup.add(easelFront);

  const easelBack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.32, 0.88), blackSteelMat);
  easelBack.position.set(-0.14, 0.65, 0);
  easelBack.rotation.z = -0.18;
  easelGroup.add(easelBack);

  const easelPoster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 1.14),
    new THREE.MeshBasicMaterial({ map: createPromoEaselTex() })
  );
  easelPoster.rotation.y = Math.PI / 2;
  easelPoster.rotation.z = 0.18;
  easelPoster.position.set(0.17, 0.67, 0);
  easelPoster.userData.noMerge = true;
  easelGroup.add(easelPoster);
  staticGroup.add(easelGroup);

  // Open Hours Plaque cleanly mounted onto South Door Mullion Post (not floating in glass!)
  const hoursTex = createXiaomiOpenHoursTex();
  const hoursPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.29),
    new THREE.MeshBasicMaterial({ map: hoursTex })
  );
  hoursPlaque.rotation.y = Math.PI / 2;
  hoursPlaque.position.set(352.69, F1_Y + 1.48, -47.64);
  hoursPlaque.userData.noMerge = true;
  staticGroup.add(hoursPlaque);

  // =========================================================================
  // 6. FLOOR 1 CONCENTRIC CEILING RINGS, EXIT SIGNS & ARCHITECTURAL FEATURE WALL
  // =========================================================================
  const buildCeilingLightHalo = (cx: number, cz: number, radii: number[]) => {
    const outerR = radii[0] + 0.48;
    const recessDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(outerR, outerR, 0.025, 42),
      warmStoneMat
    );
    recessDisk.position.set(cx, F2_Y - 0.248, cz);
    staticGroup.add(recessDisk);

    radii.forEach((r) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.09, r + 0.09, 48), ceiledRingLedMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx, F2_Y - 0.264, cz);
      staticGroup.add(ring);
    });
  };
  buildCeilingLightHalo(345.0, -50.0, [4.6, 3.4, 2.2]);
  buildCeilingLightHalo(337.2, -50.0, [2.7, 1.6]);

  // Floor 1 Recessed Ceiling Downlight Bulbs across front bays & side wings
  [350.6, 347.8, 341.8, 338.2, 333.5].forEach((bx) => {
    [-59.2, -55.0, -50.0, -45.0, -40.8].forEach((bz) => {
      if (bx < 336.5 && bz < -54.0) return; // skip NW stairwell hole
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), ceilingBulbMat);
      bulb.position.set(bx, F2_Y - 0.255, bz);
      staticGroup.add(bulb);
    });
  });

  // Recessed Ceiling Track Spotlights & Illuminated Green EXIT Signs (matches ảnh 2 ceiling details!)
  const greenExitMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 1.35,
  });
  neonMats.push(greenExitMat);
  [-54.6, -45.4].forEach((ez) => {
    const exitSign = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.20, 0.48), greenExitMat);
    exitSign.position.set(351.8, 3.92, ez);
    staticGroup.add(exitSign);
  });

  // Rear Feature Wall Illuminated Orange "mi" Emblem & Dark-Framed Header
  const rearMiPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.42), miFaceMat);
  rearMiPlane.rotation.y = Math.PI / 2;
  rearMiPlane.position.set(330.80, 2.72, -53.8);
  rearMiPlane.userData.noMerge = true;
  staticGroup.add(rearMiPlane);

  const rearHeaderTex = createXiaomiHeaderTex();
  const rearHeaderMat = new THREE.MeshStandardMaterial({
    map: rearHeaderTex,
    emissive: 0xffffff,
    emissiveMap: rearHeaderTex,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const rearHeader = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.92), rearHeaderMat);
  rearHeader.rotation.y = Math.PI / 2;
  rearHeader.position.set(330.80, 3.68, XIAOMI_CENTER_Z);
  rearHeader.userData.noMerge = true;
  staticGroup.add(rearHeader);

  // Rear Service & Genius Bar (X = 334.6, Z = -50.0) with Dual Monitors & Stools
  const cashierBody = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.02, 5.4), darkTableBaseMat);
  cashierBody.position.set(334.6, F1_Y + 0.51, XIAOMI_CENTER_Z);
  staticGroup.add(cashierBody);
  const cashierTop = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.07, 5.55), whiteWallMat);
  cashierTop.position.set(334.6, F1_Y + 1.055, XIAOMI_CENTER_Z);
  staticGroup.add(cashierTop);

  // Dual POS Monitor Screens on Rear Service Bar
  [-51.4, -48.6].forEach((mz) => {
    const mon = new THREE.Group();
    mon.position.set(334.55, F1_Y + 1.09, mz);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.10), brushedSteelMat);
    stand.position.y = 0.08;
    mon.add(stand);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.56), blackSteelMat);
    panel.position.y = 0.30;
    mon.add(panel);
    staticGroup.add(mon);
  });

  // =========================================================================
  // 7. LOCAL-GROUP 3D XIAOMI PRODUCT BUILDERS, ISLANDS & ZONE SHOWCASES
  // =========================================================================
  const deviceTextures = {
    ultra: createXiaomiDeviceScreenTex('ultra'),
    fold: createXiaomiDeviceScreenTex('fold'),
    flip: createXiaomiDeviceScreenTex('flip'),
    pad: createXiaomiDeviceScreenTex('pad'),
    laptop: createXiaomiDeviceScreenTex('laptop'),
    tv: createXiaomiDeviceScreenTex('tv'),
  };

  const makeScreenMat = (tex: THREE.CanvasTexture) => {
    const m = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.68,
      roughness: 0.16,
    });
    neonMats.push(m);
    return m;
  };
  const screenMats = {
    ultra: makeScreenMat(deviceTextures.ultra),
    fold: makeScreenMat(deviceTextures.fold),
    flip: makeScreenMat(deviceTextures.flip),
    pad: makeScreenMat(deviceTextures.pad),
    laptop: makeScreenMat(deviceTextures.laptop),
    tv: makeScreenMat(deviceTextures.tv),
  };

  const addXiaomiPhone = (
    x: number,
    yTop: number,
    z: number,
    yaw: number,
    kind: 'ultra' | 'fold' | 'flip'
  ) => {
    const g = new THREE.Group();
    g.position.set(x, yTop, z);
    g.rotation.y = yaw;

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.08), brushedSteelMat);
    stand.position.y = 0.02;
    g.add(stand);

    const holder = new THREE.Group();
    holder.position.set(0, 0.055, 0);
    holder.rotation.x = -0.38;

    const w = kind === 'fold' ? 0.24 : 0.13;
    const h = kind === 'flip' ? 0.16 : 0.23;
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.022), blackSteelMat);
    chassis.position.y = h * 0.5;
    holder.add(chassis);

    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.018, h - 0.018), screenMats[kind]);
    scr.position.set(0, h * 0.5, 0.013);
    scr.userData.noMerge = true;
    holder.add(scr);

    if (kind === 'ultra') {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.010, 16), brushedSteelMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, h * 0.66, -0.015);
      holder.add(ring);
    }
    g.add(holder);
    staticGroup.add(g);
  };

  const addXiaomiTablet = (x: number, yTop: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    g.position.set(x, yTop, z);
    g.rotation.y = yaw;

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.11), brushedSteelMat);
    stand.position.y = 0.02;
    g.add(stand);

    const holder = new THREE.Group();
    holder.position.set(0, 0.05, 0);
    holder.rotation.x = -0.42;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.018), brushedSteelMat);
    body.position.y = 0.12;
    holder.add(body);

    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), screenMats.pad);
    scr.position.set(0, 0.12, 0.011);
    scr.userData.noMerge = true;
    holder.add(scr);

    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.22, 8), whiteWallMat);
    pen.rotation.z = Math.PI / 2;
    pen.position.set(0, 0.015, 0.14);
    g.add(pen);

    g.add(holder);
    staticGroup.add(g);
  };

  const addXiaomiLaptop = (x: number, yTop: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    g.position.set(x, yTop, z);
    g.rotation.y = yaw;

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.022, 0.28), brushedSteelMat);
    base.position.y = 0.011;
    g.add(base);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.022, -0.13);
    lidPivot.rotation.x = -0.25;

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.27, 0.014), brushedSteelMat);
    lid.position.y = 0.135;
    lidPivot.add(lid);

    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.24), screenMats.laptop);
    scr.position.set(0, 0.135, 0.009);
    scr.userData.noMerge = true;
    lidPivot.add(scr);

    g.add(lidPivot);
    staticGroup.add(g);
  };

  const addXiaomiWatch = (x: number, yTop: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, yTop, z);

    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.04, 14), whiteWallMat);
    puck.position.y = 0.02;
    g.add(puck);

    const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.018, 14), blackSteelMat);
    watch.position.y = 0.065;
    watch.rotation.x = 0.45;
    g.add(watch);

    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 14), orangeAccentMat);
    dial.position.set(0, 0.072, 0.004);
    dial.rotation.x = 0.45;
    g.add(dial);

    staticGroup.add(g);
  };

  // --- A. Circular Brushed-Aluminum Hero Island (Bay 1 Interior at 347.2, -53.6) ---
  const heroX = 347.2;
  const heroZ = -53.6;
  const heroPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, 0.72, 32), brushedSteelMat);
  heroPlinth.position.set(heroX, F1_Y + 0.36, heroZ);
  staticGroup.add(heroPlinth);

  const heroCounterTop = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.14, 36), whiteWallMat);
  heroCounterTop.position.set(heroX, F1_Y + 0.79, heroZ);
  staticGroup.add(heroCounterTop);

  // Concentric Dual Brushed-Metal & Luminous Halo Arch above Hero Island
  const heroRingArch = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 12, 32), brushedSteelMat);
  heroRingArch.position.set(heroX, F1_Y + 1.42, heroZ);
  heroRingArch.rotation.y = Math.PI / 2;
  staticGroup.add(heroRingArch);

  const heroInnerGlow = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.018, 10, 28), ceiledRingLedMat);
  heroInnerGlow.position.set(heroX, F1_Y + 1.42, heroZ);
  heroInnerGlow.rotation.y = Math.PI / 2;
  staticGroup.add(heroInnerGlow);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const px = heroX + Math.cos(ang) * 0.96;
    const pz = heroZ + Math.sin(ang) * 0.96;
    addXiaomiPhone(px, F1_Y + 0.86, pz, -ang + Math.PI / 2, i % 2 === 0 ? 'ultra' : 'flip');
  }

  // --- B. Three Experience Tables with Barstools & Product Spec Stands ---
  const buildExperienceTable = (tx: number, tz: number, mode: 'flagship' | 'aiot' | 'eco') => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.76, 3.6), darkTableBaseMat);
    base.position.set(tx, F1_Y + 0.38, tz);
    staticGroup.add(base);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.08, 4.10), oakWoodMat);
    top.position.set(tx, F1_Y + 0.80, tz);
    staticGroup.add(top);

    const yTop = F1_Y + 0.84;
    if (mode === 'flagship') {
      addXiaomiPhone(tx + 0.32, yTop, tz - 1.35, Math.PI / 2, 'ultra');
      addXiaomiPhone(tx + 0.32, yTop, tz - 0.45, Math.PI / 2, 'fold');
      addXiaomiPhone(tx + 0.32, yTop, tz + 0.45, Math.PI / 2, 'flip');
      addXiaomiPhone(tx + 0.32, yTop, tz + 1.35, Math.PI / 2, 'ultra');
      addXiaomiWatch(tx - 0.28, yTop, tz - 0.90);
      addXiaomiWatch(tx - 0.28, yTop, tz + 0.90);
    } else if (mode === 'aiot') {
      addXiaomiLaptop(tx + 0.28, yTop, tz - 1.1, Math.PI / 2);
      addXiaomiTablet(tx + 0.28, yTop, tz, Math.PI / 2);
      addXiaomiTablet(tx + 0.28, yTop, tz + 1.1, Math.PI / 2);
      addXiaomiPhone(tx - 0.32, yTop, tz - 0.6, -Math.PI / 2, 'fold');
    } else {
      addXiaomiPhone(tx + 0.32, yTop, tz - 1.2, Math.PI / 2, 'ultra');
      addXiaomiTablet(tx + 0.28, yTop, tz, Math.PI / 2);
      addXiaomiLaptop(tx + 0.28, yTop, tz + 1.2, Math.PI / 2);
      addXiaomiWatch(tx - 0.30, yTop, tz + 0.4);
    }

    const placard = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.09, 0.03),
      new THREE.MeshBasicMaterial({
        map: createXiaomiPlacardTex(mode === 'flagship' ? '15 Ultra' : mode === 'aiot' ? 'Pad 7 Pro' : 'Leica Studio'),
      })
    );
    placard.position.set(tx, yTop + 0.045, tz - 1.75);
    placard.rotation.y = Math.PI / 2;
    placard.userData.noMerge = true;
    staticGroup.add(placard);
  };
  buildExperienceTable(346.6, -44.2, 'flagship');
  buildExperienceTable(341.2, -54.8, 'aiot');
  buildExperienceTable(341.2, -44.2, 'eco');

  // --- C. North-East Bay 0: Xiaomi Smart Mobility Podium & Electric Scooters ---
  const scooterPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.24, 3.2), darkTableBaseMat);
  scooterPlinth.position.set(348.5, F1_Y + 0.12, -59.85);
  staticGroup.add(scooterPlinth);

  const scooterRim = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.04, 3.24), orangeAccentMat);
  scooterRim.position.set(348.5, F1_Y + 0.25, -59.85);
  staticGroup.add(scooterRim);

  const buildXiaomiScooter = (sx: number, sy: number, sz: number, yaw: number) => {
    const sg = new THREE.Group();
    sg.position.set(sx, sy, sz);
    sg.rotation.y = yaw;

    // Front & Rear Rubber Tires
    [-0.50, 0.50].forEach((wx) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 16), charcoalMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.14, 0);
      sg.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12), orangeAccentMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.14, 0);
      sg.add(hub);
    });

    // Deck Board
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 0.20), blackSteelMat);
    deck.position.set(0, 0.17, 0);
    sg.add(deck);

    // Angled Steering Stem & Handlebar
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 1.04, 10), charcoalMat);
    stem.position.set(0.42, 0.68, 0);
    stem.rotation.z = 0.18;
    sg.add(stem);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.48, 10), blackSteelMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0.32, 1.18, 0);
    sg.add(bar);

    const headLamp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.06), ceiledRingLedMat);
    headLamp.position.set(0.36, 1.12, 0);
    sg.add(headLamp);

    staticGroup.add(sg);
  };
  buildXiaomiScooter(347.8, F1_Y + 0.27, -60.5, 0.25);
  buildXiaomiScooter(349.0, F1_Y + 0.27, -59.1, -0.35);

  const mobilityBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.70),
    new THREE.MeshBasicMaterial({ map: createZoneBannerTex('SMART MOBILITY', 'Xiaomi Electric Scooter 4 Ultra') })
  );
  mobilityBanner.position.set(348.5, F1_Y + 2.85, -61.58);
  mobilityBanner.userData.noMerge = true;
  staticGroup.add(mobilityBanner);

  // --- D. North Wall Backlit Ecosystem Retail Packaging Shelving (X = 336.8..345.5, Z = -61.5) ---
  const shelfFrame = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.6, 0.56), walnutMat);
  shelfFrame.position.set(341.15, F1_Y + 1.8, -61.35);
  staticGroup.add(shelfFrame);

  const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(8.1, 3.2, 0.08), whiteWallMat);
  shelfBack.position.set(341.15, F1_Y + 1.85, -61.08);
  staticGroup.add(shelfBack);

  for (let row = 0; row < 3; row++) {
    const sy = F1_Y + 0.85 + row * 0.92;
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.05, 0.44), oakWoodMat);
    ledge.position.set(341.15, sy, -60.95);
    staticGroup.add(ledge);

    for (let col = 0; col < 10; col++) {
      const bx = 337.6 + col * 0.78;
      const boxColor = col % 3 === 0 ? orangeAccentMat : whiteWallMat;
      const pkg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), boxColor);
      pkg.position.set(bx, sy + 0.30, -60.92);
      staticGroup.add(pkg);
    }
  }

  // --- E. South Wall Smart Living Zone (TV Console, Air Purifiers, Robot Vacuum, Washer) ---
  const southPlinth = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.34, 1.15), darkTableBaseMat);
  southPlinth.position.set(343.6, F1_Y + 0.17, -38.88);
  staticGroup.add(southPlinth);

  const wallTvFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.58, 0.08), blackSteelMat);
  wallTvFrame.position.set(343.6, F1_Y + 1.85, -38.45);
  staticGroup.add(wallTvFrame);

  const wallTvScr = new THREE.Mesh(new THREE.PlaneGeometry(2.68, 1.48), screenMats.tv);
  wallTvScr.rotation.y = Math.PI;
  wallTvScr.position.set(343.6, F1_Y + 1.85, -38.50);
  wallTvScr.userData.noMerge = true;
  staticGroup.add(wallTvScr);

  const smartLivingBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.72),
    new THREE.MeshBasicMaterial({ map: createZoneBannerTex('SMART LIVING', 'Mini-LED TV  •  Home AIoT') })
  );
  smartLivingBanner.rotation.y = Math.PI;
  smartLivingBanner.position.set(343.6, F1_Y + 3.25, -38.42);
  smartLivingBanner.userData.noMerge = true;
  staticGroup.add(smartLivingBanner);

  // Two Xiaomi Air Purifiers + Robot Vacuum Omni Station + Smart Washer Cube
  [340.0, 347.2].forEach((px) => {
    const pur = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.82, 0.36), whiteWallMat);
    pur.position.set(px, F1_Y + 0.34 + 0.41, -38.85);
    staticGroup.add(pur);
    const purScreen = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), blackSteelMat);
    purScreen.rotation.y = Math.PI;
    purScreen.position.set(px, F1_Y + 0.88, -39.04);
    staticGroup.add(purScreen);
  });

  // Robot Vacuum X20+ Station & Disc
  const vacDock = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.40), whiteWallMat);
  vacDock.position.set(343.6, F1_Y + 0.34 + 0.31, -38.85);
  staticGroup.add(vacDock);
  const vacDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.09, 18), whiteWallMat);
  vacDisc.position.set(343.6, F1_Y + 0.34 + 0.045, -39.20);
  staticGroup.add(vacDisc);

  // =========================================================================
  // 8. ARCHITECTURAL NW SWITCHBACK STAIRCASE (STRINGERS, HANDRAILS & GLASS RAILS)
  // =========================================================================
  const stairXWest = 332.45;
  const stairXEast = 334.75;
  const stairZSouth = -54.55;
  const stairZLand = -59.5;
  const midY = F1_Y + XIAOMI_FLOOR_H * 0.5;
  const stepCount = 11;

  // Sloped Steel Stringers supporting West & East Flights (no floating treads!)
  const flightLen = Math.hypot(stairZSouth - stairZLand, XIAOMI_FLOOR_H * 0.5);
  const flightSlope = Math.atan2(XIAOMI_FLOOR_H * 0.5, stairZSouth - stairZLand);

  const westStringer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, flightLen), blackSteelMat);
  westStringer.position.set(stairXWest, F1_Y + XIAOMI_FLOOR_H * 0.25 - 0.14, (stairZSouth + stairZLand) * 0.5);
  westStringer.rotation.x = flightSlope;
  staticGroup.add(westStringer);

  const eastStringer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, flightLen), blackSteelMat);
  eastStringer.position.set(stairXEast, midY + XIAOMI_FLOOR_H * 0.25 - 0.14, (stairZSouth + stairZLand) * 0.5);
  eastStringer.rotation.x = -flightSlope;
  staticGroup.add(eastStringer);

  // Oak Stair Treads + Subtle Warm Step Rim
  for (let i = 0; i < stepCount; i++) {
    const t = (i + 0.5) / stepCount;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.10, 0.44), oakWoodMat);
    tread.position.set(
      stairXWest,
      F1_Y + t * (XIAOMI_FLOOR_H * 0.5) - 0.05,
      stairZSouth - t * (stairZSouth - stairZLand)
    );
    staticGroup.add(tread);
  }

  const midLanding = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.18, 2.15), oakWoodMat);
  midLanding.position.set(333.6, midY - 0.09, -60.55);
  staticGroup.add(midLanding);

  for (let i = 0; i < stepCount; i++) {
    const t = (i + 0.5) / stepCount;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.10, 0.44), oakWoodMat);
    tread.position.set(
      stairXEast,
      midY + t * (XIAOMI_FLOOR_H * 0.5) - 0.05,
      stairZLand + t * (stairZSouth - stairZLand)
    );
    staticGroup.add(tread);
  }

  // Sleek Handrails on Center Wall & Outer East Glass Wall
  const westHandrail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, flightLen), brushedSteelMat);
  westHandrail.position.set(333.48, F1_Y + XIAOMI_FLOOR_H * 0.25 + 0.92, (stairZSouth + stairZLand) * 0.5);
  westHandrail.rotation.x = flightSlope;
  staticGroup.add(westHandrail);

  const eastHandrail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, flightLen), brushedSteelMat);
  eastHandrail.position.set(335.72, midY + XIAOMI_FLOOR_H * 0.25 + 0.92, (stairZSouth + stairZLand) * 0.5);
  eastHandrail.rotation.x = -flightSlope;
  staticGroup.add(eastHandrail);

  const stairCenterWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, XIAOMI_FLOOR_H + 1.15, 5.15), warmStoneMat);
  stairCenterWall.position.set(333.6, F1_Y + (XIAOMI_FLOOR_H + 1.15) * 0.5, -57.0);
  staticGroup.add(stairCenterWall);

  const stairEastGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, XIAOMI_FLOOR_H + 1.15, 7.1), railGlassMat);
  stairEastGlass.position.set(335.85, F1_Y + (XIAOMI_FLOOR_H + 1.15) * 0.5, -58.0);
  staticGroup.add(stairEastGlass);

  const f2DownGuard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.12, 0.06), railGlassMat);
  f2DownGuard.position.set(332.45, F2_Y + 0.56, -54.42);
  staticGroup.add(f2DownGuard);

  // =========================================================================
  // 9. FLOOR 2 GALLERY: ELEVATED HINGED LEICA PHOTO SCREENS + LOUNGE + GALLERY PRINTS
  // =========================================================================
  // Raised on sleek 0.85m matte-black gallery legs so ALL 6 Leica photographs sit cleanly ABOVE
  // the Row 2 transom (Y = 5.85), 100% visible through Row 3 windows!
  const buildFoldingExhibition = (centerZ: number, basePhotoIdx: number) => {
    const screenW = 1.66;
    const screenH = 2.02;
    const legH = 0.86;
    const panelAngles = [0.22, -0.22, 0.22];
    const panelZOffsets = [-1.62, 0, 1.62];

    for (let i = 0; i < 3; i++) {
      const grp = new THREE.Group();
      const px = 349.6 + (i === 1 ? -0.18 : 0.02);
      const pz = centerZ + panelZOffsets[i];
      grp.position.set(px, F2_Y, pz);
      grp.rotation.y = panelAngles[i];

      [-screenW * 0.42, screenW * 0.42].forEach((lz) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, legH, 8), blackSteelMat);
        leg.position.set(0, legH * 0.5, lz);
        grp.add(leg);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.08), blackSteelMat);
        foot.position.set(0, 0.015, lz);
        grp.add(foot);
      });

      const frameY = legH + screenH * 0.5;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, screenH, screenW), blackSteelMat);
      frame.position.y = frameY;
      grp.add(frame);

      const photoTex = createGalleryPhotoTex(basePhotoIdx + i);
      const photoMat = new THREE.MeshStandardMaterial({
        map: photoTex,
        emissive: 0xffffff,
        emissiveMap: photoTex,
        emissiveIntensity: 0.48,
        roughness: 0.34,
      });
      neonMats.push(photoMat);

      const photoEast = new THREE.Mesh(new THREE.PlaneGeometry(screenW - 0.14, screenH - 0.16), photoMat);
      photoEast.rotation.y = Math.PI / 2;
      photoEast.position.set(0.045, frameY, 0);
      photoEast.userData.noMerge = true;
      grp.add(photoEast);

      const photoWest = new THREE.Mesh(new THREE.PlaneGeometry(screenW - 0.14, screenH - 0.16), photoMat);
      photoWest.rotation.y = -Math.PI / 2;
      photoWest.position.set(-0.045, frameY, 0);
      photoWest.userData.noMerge = true;
      grp.add(photoWest);

      staticGroup.add(grp);
    }
  };
  buildFoldingExhibition(-56.0, 0); // North Gallery (Bays 0 & 1 Row 3!)
  buildFoldingExhibition(-44.0, 3); // South Gallery (Bays 3 & 4 Row 3!)

  // Framed Backlit Wall Gallery Prints along F2 South Gallery Wall (visible through right Row 3 bay just like ảnh 2!)
  [342.2, 344.5, 346.8].forEach((wx, idx) => {
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.88, 0.08), walnutMat);
    frameBox.position.set(wx, F2_Y + 1.95, -38.42);
    staticGroup.add(frameBox);

    const artTex = createGalleryPhotoTex(6 + (idx % 2));
    const artMat = new THREE.MeshStandardMaterial({
      map: artTex,
      emissive: 0xffffff,
      emissiveMap: artTex,
      emissiveIntensity: 0.46,
      roughness: 0.35,
    });
    const art = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.72), artMat);
    art.rotation.y = Math.PI;
    art.position.set(wx, F2_Y + 1.95, -38.47);
    art.userData.noMerge = true;
    staticGroup.add(art);
  });

  // Floor 2 Smart Living Lounge (Rug, Sofa, Coffee Table w/ Smart Display, Plant, Wall 86" TV)
  const loungeRug = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.025, 5.2), rugMat);
  loungeRug.position.set(340.0, F2_Y + 0.0125, -45.4);
  staticGroup.add(loungeRug);

  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.44, 3.4), sofaFabricMat);
  sofaBase.position.set(339.1, F2_Y + 0.22, -45.4);
  staticGroup.add(sofaBase);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.86, 3.4), sofaFabricMat);
  sofaBack.position.set(338.62, F2_Y + 0.43, -45.4);
  staticGroup.add(sofaBack);
  [-47.0, -43.8].forEach((az) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.62, 0.22), sofaFabricMat);
    arm.position.set(339.1, F2_Y + 0.31, az);
    staticGroup.add(arm);
  });

  const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.36, 1.85), walnutMat);
  coffeeTable.position.set(340.75, F2_Y + 0.18, -45.4);
  staticGroup.add(coffeeTable);
  addXiaomiTablet(340.75, F2_Y + 0.36, -45.4, Math.PI / 2);

  // Floor 2 Architectural Planter beside Sofa
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.48, 16), whiteWallMat);
  pot.position.set(339.1, F2_Y + 0.24, -42.8);
  staticGroup.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 14), soilMat);
  soil.position.set(339.1, F2_Y + 0.47, -42.8);
  staticGroup.add(soil);
  const plantLeaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), foliageMat);
  plantLeaf.position.set(339.1, F2_Y + 1.05, -42.8);
  staticGroup.add(plantLeaf);

  // Floor 2 Rear 86" Xiaomi Mini-LED Wall TV
  const f2TvFrame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.65, 2.95), blackSteelMat);
  f2TvFrame.position.set(330.80, F2_Y + 2.05, -45.4);
  staticGroup.add(f2TvFrame);
  const f2TvScr = new THREE.Mesh(new THREE.PlaneGeometry(2.82, 1.54), screenMats.tv);
  f2TvScr.rotation.y = Math.PI / 2;
  f2TvScr.position.set(330.86, F2_Y + 2.05, -45.4);
  f2TvScr.userData.noMerge = true;
  staticGroup.add(f2TvScr);

  // Floor 2 Creator & Smart Home Desk (X = 342.5, Z = -55.0)
  const f2TableBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.76, 3.4), darkTableBaseMat);
  f2TableBase.position.set(342.5, F2_Y + 0.38, -55.0);
  staticGroup.add(f2TableBase);
  const f2TableTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 3.9), oakWoodMat);
  f2TableTop.position.set(342.5, F2_Y + 0.80, -55.0);
  staticGroup.add(f2TableTop);
  addXiaomiLaptop(342.7, F2_Y + 0.84, -56.1, Math.PI / 2);
  addXiaomiTablet(342.7, F2_Y + 0.84, -55.0, Math.PI / 2);
  addXiaomiPhone(342.7, F2_Y + 0.84, -53.9, Math.PI / 2, 'ultra');

  // Floor 2 Ceiling Recessed Circular Halo Lights & High-Output Ceiling Bulbs
  for (let i = 0; i < 4; i++) {
    const bz = -58.0 + i * 5.3;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 24), ceiledRingLedMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(344.2, ROOF_Y - 0.09, bz);
    staticGroup.add(ring);

    [336.0, 340.5, 344.2, 348.8].forEach((bx) => {
      const f2Bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.032, 12), ceilingBulbMat);
      f2Bulb.position.set(bx, ROOF_Y - 0.095, bz);
      staticGroup.add(f2Bulb);
    });
  }

  // =========================================================================
  // 10. BALANCED STORE LIGHTING & OPERATING HOURS / DOOR ANIMATION LOOP
  // =========================================================================
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
    const light = new THREE.PointLight(color, dayInt, distance, 1.3);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => (alwaysOn ? 1 : currentOpenFactor),
    });
  };

  addLight(0xfffbeb, 5.8, 9.8, 30, 344.5, 4.2, -50.0);
  addLight(0xfef3c7, 4.6, 7.6, 24, 336.5, 4.0, -50.0);
  addLight(0xfffbeb, 5.0, 8.4, 28, 346.5, F2_Y + 3.2, -55.5);
  addLight(0xfffbeb, 5.0, 8.4, 28, 346.5, F2_Y + 3.2, -44.5);
  addLight(0xfff7ed, 1.6, 4.8, 22, 354.6, 4.2, -50.0, true);

  const apronPoolMat = new THREE.MeshBasicMaterial({
    color: 0xffedd5,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  poolMats.push(apronPoolMat);
  const apronPool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 22.0), apronPoolMat);
  apronPool.rotation.x = -Math.PI / 2;
  apronPool.position.set(354.8, F1_Y + 0.015, XIAOMI_CENTER_Z);
  apronPool.userData.noMerge = true;
  staticGroup.add(apronPool);

  let doorOpenAmount = 0;
  let shutterProgress = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: XiaomiStoreNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isXiaomiStoreOpenAtHour(rawHour);
    currentOpenFactor = isOpen ? 1 : THREE.MathUtils.lerp(1, 0.25, shutterProgress);

    // Bright backlit opal bands, glowing ceiling rings & downlight bulbs
    const opalGlow = THREE.MathUtils.lerp(0.65, 1.45, lampFactor) * currentOpenFactor;
    for (let i = 0; i < backlitOpalMats.length; i++) {
      backlitOpalMats[i].emissiveIntensity = opalGlow;
    }

    ceiledRingLedMat.emissiveIntensity = THREE.MathUtils.lerp(2.5, 4.5, lampFactor) * currentOpenFactor;
    ceilingBulbMat.emissiveIntensity = THREE.MathUtils.lerp(2.7, 4.8, lampFactor) * currentOpenFactor;

    // Vibrant Xiaomi Orange glow across day & night
    miHousingMat.emissiveIntensity = THREE.MathUtils.lerp(0.55, 1.15, lampFactor);
    miFaceMat.emissiveIntensity = THREE.MathUtils.lerp(0.95, 1.85, lampFactor);

    let wantsDoorOpen = false;
    if (isOpen) {
      if (playerPos) {
        const dist = Math.hypot(playerPos.x - XIAOMI_DOOR_X, playerPos.z - XIAOMI_DOOR_Z);
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
// XIAOMI STORE NPC CONTROLLER (RED/ORANGE-SHIRT SPECIALISTS & SHOPPERS)
// =========================================================================

interface XiaomiActor {
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

const XIAOMI_BROWSE_SPOTS: Array<{ x: number; y: number; z: number; yaw: number }> = [
  { x: 349.4, y: XIAOMI_PODIUM_Y, z: -53.6, yaw: -Math.PI / 2 }, // Circular Hero Island
  { x: 348.2, y: XIAOMI_PODIUM_Y, z: -44.2, yaw: -Math.PI / 2 }, // Front South Flagship Table
  { x: 348.5, y: XIAOMI_PODIUM_Y, z: -57.2, yaw: Math.PI }, // Smart Mobility Scooter Podium
  { x: 342.8, y: XIAOMI_PODIUM_Y, z: -54.8, yaw: -Math.PI / 2 }, // AIoT & Pad Table
  { x: 342.8, y: XIAOMI_PODIUM_Y, z: -44.2, yaw: -Math.PI / 2 }, // Ecosystem Table
  { x: 343.6, y: XIAOMI_PODIUM_Y, z: -40.4, yaw: Math.PI }, // South Mini-LED TV Plinth
  { x: 336.4, y: XIAOMI_PODIUM_Y, z: -50.0, yaw: -Math.PI / 2 }, // Rear Service Counter
  { x: 347.2, y: XIAOMI_PODIUM_Y + XIAOMI_FLOOR_H, z: -56.0, yaw: Math.PI / 2 }, // Floor 2 Leica North Gallery
  { x: 347.2, y: XIAOMI_PODIUM_Y + XIAOMI_FLOOR_H, z: -44.0, yaw: Math.PI / 2 }, // Floor 2 Leica South Gallery
];

const F2_Y_NPC = XIAOMI_PODIUM_Y + XIAOMI_FLOOR_H;
const MID_Y_NPC = XIAOMI_PODIUM_Y + XIAOMI_FLOOR_H * 0.5;

function buildXiaomiBrowseRoute(
  fromPos: THREE.Vector3,
  spot: { x: number; y: number; z: number; yaw: number },
  spawnOutside: boolean
): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];
  const startOnF2 = fromPos.y > 2.2;
  const endOnF2 = spot.y > 2.2;

  if (spawnOutside) {
    path.push(
      new THREE.Vector3(356.2, XIAOMI_PODIUM_Y, XIAOMI_DOOR_Z),
      new THREE.Vector3(350.6, XIAOMI_PODIUM_Y, XIAOMI_DOOR_Z)
    );
  }

  if (!startOnF2 && endOnF2) {
    path.push(
      new THREE.Vector3(338.2, XIAOMI_PODIUM_Y, -52.5),
      new THREE.Vector3(332.45, XIAOMI_PODIUM_Y, -54.2),
      new THREE.Vector3(332.45, MID_Y_NPC, -60.5),
      new THREE.Vector3(334.75, MID_Y_NPC, -60.5),
      new THREE.Vector3(334.75, F2_Y_NPC, -54.2),
      new THREE.Vector3(339.0, F2_Y_NPC, -52.5)
    );
  } else if (startOnF2 && !endOnF2) {
    path.push(
      new THREE.Vector3(339.0, F2_Y_NPC, -52.5),
      new THREE.Vector3(334.75, F2_Y_NPC, -54.2),
      new THREE.Vector3(334.75, MID_Y_NPC, -60.5),
      new THREE.Vector3(332.45, MID_Y_NPC, -60.5),
      new THREE.Vector3(332.45, XIAOMI_PODIUM_Y, -54.2),
      new THREE.Vector3(338.2, XIAOMI_PODIUM_Y, -52.5)
    );
  } else if (!startOnF2 && !endOnF2) {
    path.push(new THREE.Vector3(349.6, XIAOMI_PODIUM_Y, -50.0));
  } else {
    path.push(new THREE.Vector3(345.0, F2_Y_NPC, -52.4));
  }

  path.push(new THREE.Vector3(spot.x, spot.y, spot.z));
  return path;
}

function buildXiaomiExitRoute(fromPos: THREE.Vector3, id: number): THREE.Vector3[] {
  const exitOffsetZ = id % 2 === 0 ? -0.9 : 0.9;
  const pts: THREE.Vector3[] = [];
  if (fromPos.y > 2.2) {
    pts.push(
      new THREE.Vector3(339.0, F2_Y_NPC, -52.5),
      new THREE.Vector3(334.75, F2_Y_NPC, -54.2),
      new THREE.Vector3(334.75, MID_Y_NPC, -60.5),
      new THREE.Vector3(332.45, MID_Y_NPC, -60.5),
      new THREE.Vector3(332.45, XIAOMI_PODIUM_Y, -54.2),
      new THREE.Vector3(338.2, XIAOMI_PODIUM_Y, -51.8)
    );
  } else {
    pts.push(new THREE.Vector3(Math.max(338.2, fromPos.x), XIAOMI_PODIUM_Y, -50.0));
  }
  pts.push(
    new THREE.Vector3(351.0, XIAOMI_PODIUM_Y, XIAOMI_DOOR_Z + exitOffsetZ),
    new THREE.Vector3(356.2, XIAOMI_PODIUM_Y, XIAOMI_DOOR_Z + exitOffsetZ),
    new THREE.Vector3(359.0, 0.0, XIAOMI_DOOR_Z + (id % 2 === 0 ? -5.0 : 5.0))
  );
  return pts;
}

export class XiaomiStoreNpcController {
  public rootGroup = new THREE.Group();
  private actors: XiaomiActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    const bagTex = createXiaomiBagTex();
    const bagMat = new THREE.MeshStandardMaterial({ map: bagTex, roughness: 0.45 });
    const lanyardMat = new THREE.MeshStandardMaterial({
      color: 0xff6900,
      emissive: 0xea580c,
      emissiveIntensity: 0.35,
    });

    const configs: Array<{
      kind: 'specialist' | 'shopper';
      x: number;
      y: number;
      z: number;
      yaw: number;
      shirtHex: number;
      pantsHex: number;
      skinHex: string;
      hairHex: number;
    }> = [
      { kind: 'specialist', x: 345.4, y: XIAOMI_PODIUM_Y, z: -53.6, yaw: Math.PI / 2, shirtHex: 0xdc2626, pantsHex: 0x18181b, skinHex: '#f3cfb6', hairHex: 0x1c1917 },
      { kind: 'specialist', x: 335.8, y: XIAOMI_PODIUM_Y, z: -48.6, yaw: Math.PI / 2, shirtHex: 0xea580c, pantsHex: 0x18181b, skinHex: '#ebc3a6', hairHex: 0x27272a },
      { kind: 'specialist', x: 343.6, y: F2_Y_NPC, z: -55.0, yaw: Math.PI / 2, shirtHex: 0xdc2626, pantsHex: 0x18181b, skinHex: '#f4d2bc', hairHex: 0x111827 },
      { kind: 'shopper', x: 349.4, y: XIAOMI_PODIUM_Y, z: -53.6, yaw: -Math.PI / 2, shirtHex: 0xf8fafc, pantsHex: 0x1e293b, skinHex: '#f5d4bd', hairHex: 0x292524 },
      { kind: 'shopper', x: 348.2, y: XIAOMI_PODIUM_Y, z: -44.2, yaw: -Math.PI / 2, shirtHex: 0x38bdf8, pantsHex: 0x334155, skinHex: '#ebc3a6', hairHex: 0x18181b },
      { kind: 'shopper', x: 342.8, y: XIAOMI_PODIUM_Y, z: -54.8, yaw: -Math.PI / 2, shirtHex: 0xfb923c, pantsHex: 0x0f172a, skinHex: '#f2ccb2', hairHex: 0x3f2e21 },
      { kind: 'shopper', x: 347.2, y: F2_Y_NPC, z: -56.0, yaw: Math.PI / 2, shirtHex: 0x10b981, pantsHex: 0x0f172a, skinHex: '#f3cfb6', hairHex: 0x1c1917 },
      { kind: 'shopper', x: 347.2, y: F2_Y_NPC, z: -44.0, yaw: Math.PI / 2, shirtHex: 0xa855f7, pantsHex: 0x1e293b, skinHex: '#f5d4bd', hairHex: 0x292524 },
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
            : pickStationaryCivilianModel(idx + 61)
          : pickShopCustomerModel(idx + 67);
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
        phaseOffset: idx * 0.73,
      });

      grp.position.set(cfg.x, cfg.y, cfg.z);
      grp.rotation.y = cfg.yaw;
      this.rootGroup.add(grp);

      const actor: XiaomiActor = {
        id: idx,
        kind: cfg.kind,
        root: grp,
        headMesh: head,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        bagMesh,
        homePos: new THREE.Vector3(cfg.x, cfg.y, cfg.z),
        homeYaw: cfg.yaw,
        phase: cfg.kind === 'specialist' ? 'admire' : 'browse',
        pathQueue: [],
        pathIdx: 0,
        targetYaw: cfg.yaw,
        stateTimer: 1.4 + idx * 0.7,
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

  private assignNewSpot(a: XiaomiActor, spawnOutside: boolean) {
    if (spawnOutside) {
      a.root.position.set(358.4, 0.0, XIAOMI_DOOR_Z + (a.id % 2 === 0 ? -1.4 : 1.4));
    }
    const spot = XIAOMI_BROWSE_SPOTS[Math.floor(Math.random() * XIAOMI_BROWSE_SPOTS.length)];
    a.targetYaw = spot.yaw;
    a.pathQueue = buildXiaomiBrowseRoute(a.root.position, spot, spawnOutside);
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
      if (p.y < 1.2 && Math.hypot(p.x - XIAOMI_DOOR_X, p.z - XIAOMI_DOOR_Z) <= 3.8) return true;
    }
    return false;
  }

  private stepPath(a: XiaomiActor, dt: number): boolean {
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
    const isOpen = isXiaomiStoreOpenAtHour(rawHour);

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
        a.pathQueue = buildXiaomiExitRoute(a.root.position, a.id);
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
            a.pathQueue = buildXiaomiExitRoute(a.root.position, a.id);
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
