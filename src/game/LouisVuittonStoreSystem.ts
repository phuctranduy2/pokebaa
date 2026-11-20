import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isLouisVuittonOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface LouisVuittonBuildResult {
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
    npcController?: LouisVuittonNpcController | null
  ) => void;
}

// =========================================================================
// LOUIS VUITTON FLAGSHIP BOUTIQUE — NGÃ TƯ SƠN TÂY (NE CORNER)
// Directly East across Sơn Tây Bắc Street from John Henry (X = 329.8..354.8)
// Plot Footprint: X = 383.8 .. 411.5 (27.7m wide), Z = -12.4 .. 15.58 (27.98m deep)
// Podium Floor: Y = 0.32m accessed via South & West glowing granite stairs
// Dual Portals:
//   1. South Portal: X = 397.0, Z = 12.92 (3.0m clear automatic doorway)
//   2. West Portal (facing Đường Sơn Tây Bắc): X = 386.25, Z = 0.70 (3.0m clear automatic doorway)
// =========================================================================

export const LV_PODIUM_Y = 0.32;
export const LV_FLOOR_H = 4.0;

const SOUTH_DOOR_X = 397.0;
const SOUTH_DOOR_Z = 12.92;
const WEST_DOOR_X = 386.25;
const WEST_DOOR_Z = 0.7;
const PODIUM_Y = LV_PODIUM_Y;

export const LOUIS_VUITTON_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 (Y = 0.32m) — Exterior Envelope, Portals, Stairwell & Salons
  // =========================================================================
  { minX: 410.6, maxX: 411.4, minZ: -12.1, maxZ: 10.95, floor: 1 }, // East Wall
  { minX: 388.0, maxX: 411.4, minZ: -12.15, maxZ: -11.4, floor: 1 }, // North Rear Wall

  // West Curtain Glass Wall (split cleanly around 5.5m West Vestibule Z = -2.05..3.45)
  { minX: 388.0, maxX: 388.6, minZ: -12.0, maxZ: -2.05, floor: 1 },
  { minX: 388.0, maxX: 388.6, minZ: 3.45, maxZ: 10.95, floor: 1 },

  // West Botanical Terrarium Glass Showcases flanking West Doorway (Z = -0.80..2.20)
  { minX: 386.1, maxX: 388.3, minZ: -2.1, maxZ: -0.8, floor: 1 },
  { minX: 386.1, maxX: 388.3, minZ: 2.2, maxZ: 3.5, floor: 1 },

  // South Curtain Glass Wall (split cleanly around 5.8m South Vestibule X = 394.1..399.9)
  { minX: 388.0, maxX: 394.2, minZ: 10.35, maxZ: 10.95, floor: 1 },
  { minX: 399.8, maxX: 411.0, minZ: 10.35, maxZ: 10.95, floor: 1 },

  // South Botanical Terrarium Glass Showcases flanking South Doorway (X = 395.5..398.5)
  { minX: 394.15, maxX: 395.5, minZ: 10.55, maxZ: 13.05, floor: 1 },
  { minX: 398.5, maxX: 399.85, minZ: 10.55, maxZ: 13.05, floor: 1 },

  // Monumental Colonnade Column Plinths
  { minX: 385.82, maxX: 387.38, minZ: 11.32, maxZ: 12.88, floor: 1 },
  { minX: 392.42, maxX: 393.98, minZ: 11.32, maxZ: 12.88, floor: 1 },
  { minX: 400.02, maxX: 401.58, minZ: 11.32, maxZ: 12.88, floor: 1 },
  { minX: 406.62, maxX: 408.18, minZ: 11.32, maxZ: 12.88, floor: 1 },
  { minX: 385.82, maxX: 387.38, minZ: 3.82, maxZ: 5.38, floor: 1 },
  { minX: 385.82, maxX: 387.38, minZ: -3.98, maxZ: -2.42, floor: 1 },
  { minX: 385.82, maxX: 387.38, minZ: -11.58, maxZ: -10.02, floor: 1 },

  // Exterior Foreground Travertine Planter Boxes
  { minX: 388.8, maxX: 392.5, minZ: 13.7, maxZ: 15.2, floor: 1 },
  { minX: 401.8, maxX: 410.4, minZ: 13.7, maxZ: 15.2, floor: 1 },

  // Floor 1 Interior Boutique Zones & Stairwell Rails
  { minX: 395.6, maxX: 398.4, minZ: 1.8, maxZ: 4.6, floor: 1 }, // Centerpiece Monogram Trunk Tower
  { minX: 394.6, maxX: 399.4, minZ: -4.4, maxZ: -2.0, floor: 1 }, // Central Fine Jewelry & Watches Vitrine
  { minX: 388.6, maxX: 390.2, minZ: -8.8, maxZ: -3.0, floor: 1 }, // West Handbag Gallery North Wing
  { minX: 388.6, maxX: 390.2, minZ: 4.3, maxZ: 8.4, floor: 1 }, // West Handbag Gallery South Wing
  { minX: 408.8, maxX: 410.6, minZ: -3.6, maxZ: 4.4, floor: 1 }, // East Ready-to-Wear & Footwear Salon (clear of Z = -4.4 stairwell)
  { minX: 393.5, maxX: 400.5, minZ: -10.8, maxZ: -8.9, floor: 1 }, // North Marble Concierge Counter
  { minX: 403.6, maxX: 409.4, minZ: 5.4, maxZ: 9.6, floor: 1 }, // SE VIP Champagne Lounge
  { minX: 405.25, maxX: 405.55, minZ: -11.4, maxZ: -4.3, floor: 1 }, // NE Stairwell West Balustrade
  { minX: 407.82, maxX: 408.18, minZ: -9.45, maxZ: -4.3, floor: 1 }, // NE Stairwell Center Spine
  { minX: 408.15, maxX: 410.6, minZ: -4.65, maxZ: -4.3, floor: 1 }, // Floor 1 Under-Stair Partition (blocks under Flight 2)
  { minX: 404.2, maxX: 405.0, minZ: -4.3, maxZ: -3.6, floor: 1 }, // Directory Totem

  // =========================================================================
  // FLOOR 2 (Y = 4.32m) — Haute Couture, Objets Nomades & Les Parfums
  // =========================================================================
  { minX: 410.55, maxX: 411.4, minZ: -12.1, maxZ: 10.95, floor: 2 }, // East Wall
  { minX: 388.0, maxX: 411.4, minZ: -12.15, maxZ: -11.35, floor: 2 }, // North Wall
  { minX: 388.0, maxX: 388.55, minZ: -12.0, maxZ: 10.95, floor: 2 }, // West Curtain Glass
  { minX: 388.0, maxX: 411.0, minZ: 10.35, maxZ: 10.95, floor: 2 }, // South Curtain Glass
  { minX: 394.35, maxX: 399.65, minZ: 4.85, maxZ: 9.35, floor: 2 }, // Double-Height Atrium Balustrade
  { minX: 405.25, maxX: 405.55, minZ: -11.4, maxZ: -4.3, floor: 2 }, // NE Stairwell West Balustrade
  { minX: 407.82, maxX: 408.18, minZ: -9.45, maxZ: -4.3, floor: 2 }, // NE Stairwell Center Spine
  { minX: 388.6, maxX: 391.4, minZ: -8.9, maxZ: 7.9, floor: 2 }, // West Haute Couture Runway & Mannequins
  { minX: 394.6, maxX: 399.6, minZ: -7.3, maxZ: -1.6, floor: 2 }, // Center Objets Nomades & Wardrobe Trunk Salon
  { minX: 408.8, maxX: 410.6, minZ: 0.4, maxZ: 9.2, floor: 2 }, // East Les Parfums Glowing Wall Library
  { minX: 403.5, maxX: 405.6, minZ: 3.1, maxZ: 6.5, floor: 2 }, // Travertine Fragrance Bar Island
  { minX: 403.6, maxX: 405.5, minZ: -0.6, maxZ: 1.1, floor: 2 }, // Haute Horlogerie Watch Vitrine

  // =========================================================================
  // FLOOR 3 (Y = 8.32m) — Le Café Louis Vuitton & VIP Art Penthouse
  // =========================================================================
  { minX: 410.55, maxX: 411.4, minZ: -12.1, maxZ: 10.95, floor: 3 }, // East Wall
  { minX: 388.0, maxX: 411.4, minZ: -12.15, maxZ: -11.35, floor: 3 }, // North Wall
  { minX: 388.0, maxX: 388.55, minZ: -12.0, maxZ: 10.95, floor: 3 }, // West Curtain Glass
  { minX: 388.0, maxX: 411.0, minZ: 10.35, maxZ: 10.95, floor: 3 }, // South Curtain Glass
  { minX: 394.35, maxX: 399.65, minZ: 4.85, maxZ: 9.35, floor: 3 }, // Double-Height Atrium Balustrade
  { minX: 405.25, maxX: 405.55, minZ: -11.4, maxZ: -4.3, floor: 3 }, // NE Stairwell West Balustrade
  { minX: 407.82, maxX: 408.18, minZ: -9.45, maxZ: -4.3, floor: 3 }, // NE Stairwell Center Spine
  { minX: 405.5, maxX: 407.85, minZ: -5.3, maxZ: -4.25, floor: 3 }, // Floor 3 Left Bay Stanchion Barrier
  { minX: 390.1, maxX: 399.8, minZ: -10.8, maxZ: -6.3, floor: 3 }, // North Le Café Counter & Patisserie Bar
  { minX: 388.8, maxX: 392.4, minZ: -4.4, maxZ: 8.2, floor: 3 }, // West Bistro Banquettes & Marble Tables
  { minX: 402.8, maxX: 409.6, minZ: 1.2, maxZ: 9.3, floor: 3 }, // SE VIP Art & Reading Lounge
];

// =========================================================================
// PROCEDURAL LUXURY TEXTURES & GRAPHICS (LOUIS VUITTON)
// =========================================================================

function createFlutedLimestoneTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ddd3c5';
  ctx.fillRect(0, 0, w, h);

  const flutes = 16;
  const fw = w / flutes;
  for (let i = 0; i < flutes; i++) {
    const x0 = i * fw;
    const g = ctx.createLinearGradient(x0, 0, x0 + fw, 0);
    g.addColorStop(0.0, '#c2b3a0');
    g.addColorStop(0.2, '#aa9882');
    g.addColorStop(0.52, '#f2eadf');
    g.addColorStop(0.84, '#d8cbb9');
    g.addColorStop(1.0, '#c2b3a0');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, fw, h);

    ctx.fillStyle = '#f7f1e8';
    ctx.fillRect(x0, 0, 2, h);
  }

  ctx.strokeStyle = 'rgba(115, 96, 76, 0.24)';
  ctx.lineWidth = 2;
  for (let y = 64; y < h; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createStarDiamondLatticeTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  // Luminous crisp silver-champagne metallic gradient (matches nighttime backlit LV stars)
  const bg = ctx.createRadialGradient(size * 0.5, size * 0.5, 18, size * 0.5, size * 0.5, size * 0.68);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.55, '#f1eae0');
  bg.addColorStop(1, '#cfc2b0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // High-contrast crisp diamond lattice perforations
  ctx.strokeStyle = 'rgba(42, 34, 28, 0.48)';
  ctx.lineWidth = 2.4;
  const step = 18;
  for (let x = -size; x <= size * 2; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, size);
    ctx.lineTo(x + size, 0);
    ctx.stroke();
  }

  // Crisp bright silver diamond center highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let y = 9; y < size; y += step) {
    for (let x = 9; x < size; x += step) {
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.24, 0.24);
  tex.anisotropy = 4;
  return tex;
}

function createHeroLvEmblemTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Crisp luminous pure-white interlocked LV serif monogram (pops brilliantly at night like Image 2)
  const drawLvMark = (fillHex: string) => {
    ctx.fillStyle = fillHex;
    ctx.save();
    ctx.translate(size * 0.45, size * 0.45);
    ctx.font = '700 232px "Times New Roman", "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', -24, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(size * 0.55, size * 0.54);
    ctx.font = 'italic 700 238px "Times New Roman", "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', 14, 4);
    ctx.restore();
  };

  ctx.save();
  ctx.shadowColor = 'rgba(255, 240, 210, 0.95)';
  ctx.shadowBlur = 26;
  drawLvMark('#ffffff');
  ctx.restore();
  drawLvMark('#ffffff');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createLouisVuittonWordmarkTex(subtitle?: string): THREE.CanvasTexture {
  const w = 1536;
  const h = subtitle ? 320 : 220;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.shadowColor = 'rgba(255, 244, 214, 0.92)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 108px "Montserrat", "Didot", "Georgia", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = 'LOUIS VUITTON';
  const spacing = 84;
  const startX = w * 0.5 - (title.length - 1) * spacing * 0.5;
  const ty = subtitle ? h * 0.42 : h * 0.52;
  for (let i = 0; i < title.length; i++) {
    ctx.fillText(title[i], startX + i * spacing, ty);
  }
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 108px "Montserrat", "Didot", "Georgia", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < title.length; i++) {
    ctx.fillText(title[i], startX + i * spacing, ty);
  }

  if (subtitle) {
    ctx.fillStyle = '#e5c17b';
    ctx.font = '600 44px "Montserrat", "Didot", sans-serif';
    const subSpacing = 38;
    const sx = w * 0.5 - (subtitle.length - 1) * subSpacing * 0.5;
    for (let i = 0; i < subtitle.length; i++) {
      ctx.fillText(subtitle[i], sx + i * subSpacing, h * 0.78);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createLuxuryMarbleFloorTex(): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ede7de';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(176, 152, 120, 0.28)';
  for (let i = 0; i < 24; i++) {
    ctx.lineWidth = 1.5 + (i % 4) * 1.4;
    ctx.beginPath();
    let x = (i * 113) % size;
    let y = 0;
    ctx.moveTo(x, y);
    for (let s = 1; s <= 6; s++) {
      x += Math.sin(i * 1.7 + s) * 90;
      y = (s / 6) * size;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(148, 129, 102, 0.35)';
  ctx.lineWidth = 3;
  for (let k = 0; k <= size; k += 256) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, k);
    ctx.lineTo(size, k);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = 4;
  return tex;
}

function createLvTrunkMonogramTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#3b2416';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#c59b5f';
  ctx.strokeStyle = '#c59b5f';
  ctx.lineWidth = 2.5;
  ctx.font = '700 28px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const step = 64;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cx = col * step + step * 0.5;
      const cy = row * step + step * 0.5;
      if ((row + col) % 2 === 0) {
        ctx.fillText('LV', cx, cy);
      } else {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 12);
        ctx.quadraticCurveTo(cx + 3, cy - 3, cx + 12, cy);
        ctx.quadraticCurveTo(cx + 3, cy + 3, cx, cy + 12);
        ctx.quadraticCurveTo(cx - 3, cy + 3, cx - 12, cy);
        ctx.quadraticCurveTo(cx - 3, cy - 3, cx, cy - 12);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createLuxurySignTex(title: string, subtitle: string): THREE.CanvasTexture {
  const w = 1280;
  const h = 280;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1b140f';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4a652';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.fillStyle = '#fff8eb';
  ctx.font = '600 62px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, w * 0.5, h * 0.40);

  ctx.fillStyle = '#e5c17b';
  ctx.font = '500 32px "Montserrat", sans-serif';
  ctx.fillText(subtitle, w * 0.5, h * 0.74);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createDirectoryTotemTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#19130f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9ac56';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  ctx.fillStyle = '#f3d58e';
  ctx.font = '700 38px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOUIS VUITTON', w * 0.5, 92);

  ctx.fillStyle = '#bfa065';
  ctx.fillRect(90, 130, w - 180, 3);

  const rows = [
    ['3F', 'LE CAFÉ LV & ART LOUNGE'],
    ['2F', 'HAUTE COUTURE & PARFUMS'],
    ['1F', 'MAROQUINERIE & JOAILLERIE'],
  ];
  rows.forEach(([fl, desc], i) => {
    const ry = 240 + i * 165;
    ctx.fillStyle = '#e8c474';
    ctx.font = '700 50px "Georgia", serif';
    ctx.fillText(fl, w * 0.5, ry);
    ctx.fillStyle = '#f5efe6';
    ctx.font = '600 24px "Montserrat", sans-serif';
    ctx.fillText(desc, w * 0.5, ry + 48);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGalleryArtworkTex(variant: number): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const palettes = [
    ['#1e1b18', '#d97706', '#fef3c7', '#78350f'],
    ['#0f172a', '#e11d48', '#fde68a', '#38bdf8'],
    ['#14332a', '#eab308', '#faf5ef', '#065f46'],
  ];
  const pal = palettes[variant % palettes.length];
  ctx.fillStyle = pal[0];
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = pal[1];
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.44, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pal[2];
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.58, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = pal[3];
  ctx.fillRect(w * 0.16, h * 0.72, w * 0.68, 48);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// =========================================================================
// 3D CONCAVE 4-POINTED STAR DIAMOND GEOMETRY HELPER
// =========================================================================

function createConcaveStarGeometry(rx: number, ry: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const pinchX = rx * 0.25;
  const pinchY = ry * 0.25;

  shape.moveTo(0, ry);
  shape.quadraticCurveTo(pinchX, pinchY, rx, 0);
  shape.quadraticCurveTo(pinchX, -pinchY, 0, -ry);
  shape.quadraticCurveTo(-pinchX, -pinchY, -rx, 0);
  shape.quadraticCurveTo(-pinchX, pinchY, 0, ry);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geo.center();
  return geo;
}

// =========================================================================
// MAIN LOUIS VUITTON BOUTIQUE STRUCTURE BUILDER
// =========================================================================

export function createLouisVuittonStoreStructure(): LouisVuittonBuildResult {
  const staticGroup = new THREE.Group();
  staticGroup.name = 'LouisVuittonFlagshipGroup';

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared Architectural Materials
  const limestoneTex = createFlutedLimestoneTex();
  const flutedLimestoneMat = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    color: 0xebe3d7,
    emissive: 0x3b2c1a,
    emissiveIntensity: 0.16,
    roughness: 0.56,
    metalness: 0.08,
  });
  lanternMats.push(flutedLimestoneMat);

  const limestoneMat = new THREE.MeshStandardMaterial({
    color: 0xd9cfc1,
    emissive: 0x261c11,
    emissiveIntensity: 0.10,
    roughness: 0.62,
    metalness: 0.06,
  });
  const travertinePlinthMat = new THREE.MeshStandardMaterial({
    color: 0xcbbfae,
    roughness: 0.54,
    metalness: 0.06,
  });
  const graniteStepMat = new THREE.MeshStandardMaterial({
    color: 0xdfd8ce,
    roughness: 0.42,
    metalness: 0.08,
  });
  const gildedGoldMat = new THREE.MeshStandardMaterial({
    color: 0xe3b862,
    emissive: 0x704910,
    emissiveIntensity: 0.36,
    roughness: 0.24,
    metalness: 0.88,
  });
  lanternMats.push(gildedGoldMat);

  const darkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x211914,
    roughness: 0.32,
    metalness: 0.74,
  });
  const champagneRibMat = new THREE.MeshStandardMaterial({
    color: 0xc2aa88,
    emissive: 0x291e12,
    emissiveIntensity: 0.16,
    roughness: 0.30,
    metalness: 0.78,
  });
  const teakLouverMat = new THREE.MeshStandardMaterial({
    color: 0x6b4022,
    roughness: 0.62,
    metalness: 0.08,
  });

  // Luminous silver-champagne perforated 4-pointed star materials
  const starLatticeTex = createStarDiamondLatticeTex();
  const starDiamondMat = new THREE.MeshStandardMaterial({
    map: starLatticeTex,
    color: 0xffffff,
    emissive: 0xe5d7c4,
    emissiveMap: starLatticeTex,
    emissiveIntensity: 0.58,
    roughness: 0.22,
    metalness: 0.62,
  });
  lanternMats.push(starDiamondMat);

  const starTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfff8eb,
    emissive: 0xffe4b8,
    emissiveIntensity: 0.68,
    roughness: 0.22,
    metalness: 0.80,
  });
  lanternMats.push(starTrimMat);

  const clearGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdce6ed,
    transparent: true,
    opacity: 0.28,
    roughness: 0.08,
    metalness: 0.14,
    depthWrite: false,
  });
  const smokedAtriumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x24211e,
    transparent: true,
    opacity: 0.24,
    roughness: 0.08,
    metalness: 0.42,
    depthWrite: false,
  });
  const upperGalleryWallMat = new THREE.MeshStandardMaterial({
    color: 0x3b2c1f,
    emissive: 0x452b11,
    emissiveIntensity: 0.35,
    roughness: 0.65,
  });
  lanternMats.push(upperGalleryWallMat);

  const upperPenthouseGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1b1918,
    emissive: 0x4a3114,
    emissiveIntensity: 0.24,
    roughness: 0.16,
    metalness: 0.68,
  });
  lanternMats.push(upperPenthouseGlassMat);

  const warmSoffitGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe7bd,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.55,
    roughness: 0.28,
  });
  neonMats.push(warmSoffitGlowMat);

  const stepLedMat = new THREE.MeshStandardMaterial({
    color: 0xfff1d0,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.65,
    roughness: 0.24,
  });
  neonMats.push(stepLedMat);

  const marbleFloorTex = createLuxuryMarbleFloorTex();
  const marbleFloorMat = new THREE.MeshStandardMaterial({
    map: marbleFloorTex,
    color: 0xf4eee6,
    roughness: 0.24,
    metalness: 0.08,
  });
  const walnutParquetMat = new THREE.MeshStandardMaterial({
    color: 0x4f3320,
    roughness: 0.42,
    metalness: 0.06,
  });
  const ceilingPlasterMat = new THREE.MeshStandardMaterial({
    color: 0xf5efe6,
    emissive: 0x5c4226,
    emissiveIntensity: 0.30,
    roughness: 0.68,
  });
  const creamBoucleMat = new THREE.MeshStandardMaterial({
    color: 0xf3ece1,
    roughness: 0.85,
  });
  const trunkMonogramTex = createLvTrunkMonogramTex();
  const trunkCanvasMat = new THREE.MeshStandardMaterial({
    map: trunkMonogramTex,
    roughness: 0.48,
    metalness: 0.12,
  });

  // =========================================================================
  // 1. PODIUM SLAB, APRONS & DUAL GLOWING GRANITE ENTRY STEPS (SOUTH + WEST)
  // =========================================================================
  const frontApron = new THREE.Mesh(new THREE.BoxGeometry(27.7, 0.04, 2.2), travertinePlinthMat);
  frontApron.position.set(397.65, 0.0, 14.48);
  staticGroup.add(frontApron);

  const westApron = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 25.8), travertinePlinthMat);
  westApron.position.set(385.1, 0.0, 0.5);
  staticGroup.add(westApron);

  const mainPodium = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.34, 25.5), graniteStepMat);
  mainPodium.position.set(398.8, 0.15, 0.65);
  staticGroup.add(mainPodium);

  // South 4-Step Illuminated Granite Stairs (X = 397.0, Z = 15.1 -> 13.4)
  for (let s = 0; s < 4; s++) {
    const stepTopY = ((s + 1) / 4) * PODIUM_Y;
    const stepZ = 15.1 - s * 0.48;
    const stepW = 8.4 - s * 0.24;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepTopY, 0.52), graniteStepMat);
    stepMesh.position.set(SOUTH_DOOR_X, stepTopY * 0.5, stepZ);
    staticGroup.add(stepMesh);

    const ledFront = new THREE.Mesh(new THREE.BoxGeometry(stepW - 0.12, 0.028, 0.045), stepLedMat);
    ledFront.position.set(SOUTH_DOOR_X, stepTopY - 0.02, stepZ + 0.27);
    staticGroup.add(ledFront);

    // Side mitered LED accent glow (matching Image 2!)
    [-1, 1].forEach((side) => {
      const ledSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.028, 0.52), stepLedMat);
      ledSide.position.set(SOUTH_DOOR_X + side * (stepW * 0.5 + 0.01), stepTopY - 0.02, stepZ);
      staticGroup.add(ledSide);
    });
  }

  // West 4-Step Illuminated Granite Stairs (Z = 0.70, X = 384.25 -> 386.15)
  for (let s = 0; s < 4; s++) {
    const stepTopY = ((s + 1) / 4) * PODIUM_Y;
    const stepX = 384.42 + s * 0.48;
    const stepSpanZ = 6.2 - s * 0.20;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, stepTopY, stepSpanZ), graniteStepMat);
    stepMesh.position.set(stepX, stepTopY * 0.5, WEST_DOOR_Z);
    staticGroup.add(stepMesh);

    const ledWest = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.028, stepSpanZ - 0.12), stepLedMat);
    ledWest.position.set(stepX - 0.27, stepTopY - 0.02, WEST_DOOR_Z);
    staticGroup.add(ledWest);

    [-1, 1].forEach((side) => {
      const ledSide = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.028, 0.04), stepLedMat);
      ledSide.position.set(stepX, stepTopY - 0.02, WEST_DOOR_Z + side * (stepSpanZ * 0.5 + 0.01));
      staticGroup.add(ledSide);
    });
  }

  // Foreground Travertine Landscape Planters flanking South stairs
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x1e4d24, roughness: 0.76 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x357531, roughness: 0.72 });
  const bloomMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.55 });

  const addForegroundPlanter = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const pw = maxX - minX;
    const pd = maxZ - minZ;
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const planterBox = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.44, pd), travertinePlinthMat);
    planterBox.position.set(cx, 0.22, cz);
    staticGroup.add(planterBox);

    const soil = new THREE.Mesh(new THREE.BoxGeometry(pw - 0.18, 0.08, pd - 0.18), darkBronzeMat);
    soil.position.set(cx, 0.42, cz);
    staticGroup.add(soil);

    const count = Math.max(4, Math.floor(pw * 2.2));
    for (let i = 0; i < count; i++) {
      const fx = minX + 0.35 + ((i + 0.4) / count) * (pw - 0.7);
      const fz = cz + Math.sin(i * 2.1) * (pd * 0.2);
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 + (i % 3) * 0.07, 8, 6),
        i % 2 === 0 ? leafMat1 : leafMat2
      );
      bush.position.set(fx, 0.62, fz);
      bush.scale.set(1.2, 0.85, 1.0);
      staticGroup.add(bush);

      if (i % 3 === 1) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.10, 6, 5), bloomMat);
        flower.position.set(fx + 0.08, 0.78, fz + 0.06);
        staticGroup.add(flower);
      }
    }
  };
  addForegroundPlanter(388.9, 392.4, 13.75, 15.15);
  addForegroundPlanter(401.9, 410.3, 13.75, 15.15);

  // =========================================================================
  // 2. MONUMENTAL NEOCLASSICAL FLUTED COLONNADE WITH GOLD IONIC CAPITALS
  // =========================================================================
  const addIonicColumn = (cx: number, cz: number, rotateCornerY = 0) => {
    const colGroup = new THREE.Group();
    colGroup.position.set(cx, PODIUM_Y, cz);
    colGroup.rotation.y = rotateCornerY;

    const plinthLow = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.42, 1.56), travertinePlinthMat);
    plinthLow.position.y = 0.21;
    colGroup.add(plinthLow);

    const plinthMid = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.28, 1.36), limestoneMat);
    plinthMid.position.y = 0.56;
    colGroup.add(plinthMid);

    // Subtle warm uplight ring at column plinth top (casts golden architectural halo like Image 2)
    const uplightRing = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.67, 0.04, 20), warmSoffitGlowMat);
    uplightRing.position.y = 0.71;
    colGroup.add(uplightRing);

    const torusBot = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.64, 0.18, 20), limestoneMat);
    torusBot.position.y = 0.80;
    colGroup.add(torusBot);

    const torusTop = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 0.16, 20), limestoneMat);
    torusTop.position.y = 0.97;
    colGroup.add(torusTop);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.53, 9.95, 24), flutedLimestoneMat);
    shaft.position.y = 6.02;
    colGroup.add(shaft);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.50, 0.16, 20), gildedGoldMat);
    collar.position.y = 11.05;
    colGroup.add(collar);

    const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.50, 0.46, 16), gildedGoldMat);
    echinus.position.y = 11.36;
    colGroup.add(echinus);

    [-0.58, 0.58].forEach((vx) => {
      const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.86, 14), gildedGoldMat);
      volute.rotation.x = Math.PI * 0.5;
      volute.position.set(vx, 11.45, 0);
      colGroup.add(volute);

      const innerBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.92, 10), champagneRibMat);
      innerBoss.rotation.x = Math.PI * 0.5;
      innerBoss.position.set(vx, 11.45, 0);
      colGroup.add(innerBoss);
    });

    const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.28, 1.44), limestoneMat);
    abacus.position.y = 11.74;
    colGroup.add(abacus);

    staticGroup.add(colGroup);
  };

  addIonicColumn(386.6, 12.1);
  addIonicColumn(393.2, 12.1);
  addIonicColumn(400.8, 12.1);
  addIonicColumn(407.4, 12.1);

  addIonicColumn(386.6, 4.6, Math.PI * 0.5);
  addIonicColumn(386.6, -3.2, Math.PI * 0.5);
  addIonicColumn(386.6, -10.8, Math.PI * 0.5);

  // =========================================================================
  // 3. CLASSICAL ENTABLATURE, WARM GLOWING CORNICE & DARK RIBBED PENTHOUSE
  // =========================================================================
  const eastSolidWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 17.6, 22.8), limestoneMat);
  eastSolidWall.position.set(411.0, 8.8, -0.6);
  staticGroup.add(eastSolidWall);

  const northSolidWall = new THREE.Mesh(new THREE.BoxGeometry(23.2, 17.6, 0.6), limestoneMat);
  northSolidWall.position.set(399.7, 8.8, -11.8);
  staticGroup.add(northSolidWall);

  const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(25.4, 0.6, 25.0), limestoneMat);
  roofDeck.position.set(398.8, 17.4, 0.6);
  staticGroup.add(roofDeck);

  const southArchitrave = new THREE.Mesh(new THREE.BoxGeometry(26.2, 1.15, 2.6), limestoneMat);
  southArchitrave.position.set(398.5, 12.75, 11.7);
  staticGroup.add(southArchitrave);

  const westArchitrave = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.15, 24.8), limestoneMat);
  westArchitrave.position.set(387.1, 12.75, 0.4);
  staticGroup.add(westArchitrave);

  const southCornice = new THREE.Mesh(new THREE.BoxGeometry(27.2, 0.55, 3.4), travertinePlinthMat);
  southCornice.position.set(398.5, 13.62, 12.05);
  staticGroup.add(southCornice);

  const westCornice = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 25.6), travertinePlinthMat);
  westCornice.position.set(386.75, 13.62, 0.4);
  staticGroup.add(westCornice);

  // Warm illuminated architectural soffit strips tucked under cornice & architrave (signature glow in Image 2!)
  const southCorniceGlow = new THREE.Mesh(new THREE.BoxGeometry(26.2, 0.08, 0.22), warmSoffitGlowMat);
  southCorniceGlow.position.set(398.5, 13.30, 12.95);
  staticGroup.add(southCorniceGlow);

  const westCorniceGlow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 24.6), warmSoffitGlowMat);
  westCorniceGlow.position.set(385.85, 13.30, 0.4);
  staticGroup.add(westCorniceGlow);

  const southColonnadeCeilingGlow = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.08, 1.4), warmSoffitGlowMat);
  southColonnadeCeilingGlow.position.set(398.8, 12.14, 11.5);
  staticGroup.add(southColonnadeCeilingGlow);

  const westColonnadeCeilingGlow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 23.2), warmSoffitGlowMat);
  westColonnadeCeilingGlow.position.set(387.3, 12.14, 0.2);
  staticGroup.add(westColonnadeCeilingGlow);

  // Modillion brackets under South & West cornice
  for (let x = 386.2; x <= 410.8; x += 1.25) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.68), limestoneMat);
    bracket.position.set(x, 13.22, 13.28);
    staticGroup.add(bracket);
  }
  for (let z = -11.4; z <= 12.6; z += 1.25) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.32), limestoneMat);
    bracket.position.set(385.52, 13.22, z);
    staticGroup.add(bracket);
  }

  // Upper Sleek Dark-Smoked Ribbed Penthouse Crown (Y = 13.9..17.6)
  const upperSouthPanel = new THREE.Mesh(new THREE.BoxGeometry(23.6, 3.5, 0.4), upperPenthouseGlassMat);
  upperSouthPanel.position.set(399.5, 15.65, 11.2);
  staticGroup.add(upperSouthPanel);

  const upperWestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 22.8), upperPenthouseGlassMat);
  upperWestPanel.position.set(387.8, 15.65, -0.2);
  staticGroup.add(upperWestPanel);

  for (let x = 388.2; x <= 411.0; x += 0.90) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.6, 0.48), champagneRibMat);
    fin.position.set(x, 15.65, 11.45);
    staticGroup.add(fin);
  }
  for (let z = -11.4; z <= 11.2; z += 0.90) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.48, 3.6, 0.14), champagneRibMat);
    fin.position.set(387.55, 15.65, z);
    staticGroup.add(fin);
  }

  const penthouseCrown = new THREE.Mesh(new THREE.BoxGeometry(24.4, 0.38, 23.6), darkBronzeMat);
  penthouseCrown.position.set(399.5, 17.55, 0.1);
  staticGroup.add(penthouseCrown);

  // Right Wing Warm Timber Louver Screen & Hanging Botanicals
  const timberBack = new THREE.Mesh(new THREE.BoxGeometry(3.0, 7.9, 0.16), darkBronzeMat);
  timberBack.position.set(409.65, 8.15, 10.72);
  staticGroup.add(timberBack);

  for (let y = 4.4; y <= 11.9; y += 0.36) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 0.32), teakLouverMat);
    slat.position.set(409.65, y, 11.1);
    staticGroup.add(slat);
  }
  for (let i = 0; i < 14; i++) {
    const vx = 408.4 + ((i * 0.57) % 2.4);
    const vy = 4.9 + ((i * 1.13) % 6.8);
    const vine = new THREE.Mesh(
      new THREE.SphereGeometry(0.36 + (i % 3) * 0.12, 8, 6),
      i % 2 === 0 ? leafMat1 : leafMat2
    );
    vine.position.set(vx, vy, 11.28);
    vine.scale.set(1.3, 0.75, 0.7);
    staticGroup.add(vine);
  }

  // =========================================================================
  // 4. RECESSED 3-TIER GLASS CURTAIN ATRIUM, WARM GALLERY DEPTH & BALCONIES
  // =========================================================================
  // Ground-Floor Clear Storefront Glazing (South split around 394.2..399.8, West split around -2.05..3.45)
  const southGlassLeft = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.8), clearGlassMat);
  southGlassLeft.position.set(391.2, PODIUM_Y + 1.9, 10.6);
  southGlassLeft.userData.noMerge = true;
  staticGroup.add(southGlassLeft);

  const southGlassRight = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 3.8), clearGlassMat);
  southGlassRight.position.set(405.3, PODIUM_Y + 1.9, 10.6);
  southGlassRight.userData.noMerge = true;
  staticGroup.add(southGlassRight);

  // West Ground-Floor Glazing split cleanly around West Vestibule (Z = -2.05..3.45)
  const westGlassNorth = new THREE.Mesh(new THREE.PlaneGeometry(9.35, 3.8), clearGlassMat);
  westGlassNorth.rotation.y = -Math.PI * 0.5;
  westGlassNorth.position.set(388.25, PODIUM_Y + 1.9, -6.725);
  westGlassNorth.userData.noMerge = true;
  staticGroup.add(westGlassNorth);

  const westGlassSouth = new THREE.Mesh(new THREE.PlaneGeometry(7.15, 3.8), clearGlassMat);
  westGlassSouth.rotation.y = -Math.PI * 0.5;
  westGlassSouth.position.set(388.25, PODIUM_Y + 1.9, 7.025);
  westGlassSouth.userData.noMerge = true;
  staticGroup.add(westGlassSouth);

  // Upper Floors (Y = 4.2..12.2): Transparent Smoked Curtain Glass OVER Walkable Floors 2 & 3!
  const southUpperGlass = new THREE.Mesh(new THREE.PlaneGeometry(22.6, 8.0), smokedAtriumGlassMat);
  southUpperGlass.position.set(399.5, 8.2, 10.58);
  southUpperGlass.userData.noMerge = true;
  staticGroup.add(southUpperGlass);

  const westUpperGlass = new THREE.Mesh(new THREE.PlaneGeometry(22.0, 8.0), smokedAtriumGlassMat);
  westUpperGlass.rotation.y = -Math.PI * 0.5;
  westUpperGlass.position.set(388.25, 8.2, -0.4);
  westUpperGlass.userData.noMerge = true;
  staticGroup.add(westUpperGlass);

  // Full-Footprint Walkable Structural Slabs for Floor 2 (Y = 4.32m), Floor 3 (Y = 8.32m), and Roof Ceiling (Y = 12.08m)
  // Exact rectangular partition leaving open:
  //   1. NE Stairwell Void: X = 405.4 .. 410.7, Z = -11.5 .. -4.4
  //   2. Central Double-Height Atrium Void: X = 394.5 .. 399.5, Z = 5.0 .. 9.2
  const addMultiFloorSlabWithCutouts = (
    topY: number,
    thickness: number,
    floorMat: THREE.Material,
    includeStairCutout: boolean
  ) => {
    const segs: [number, number, number, number][] = [
      // West Band: X = 388.3..394.5, Z = -11.5..10.55
      [391.4, -0.475, 6.2, 22.05],
      // Center North of Atrium: X = 394.5..399.5, Z = -11.5..5.0
      [397.0, -3.25, 5.0, 16.5],
      // Center South of Atrium: X = 394.5..399.5, Z = 9.2..10.55
      [397.0, 9.875, 5.0, 1.35],
      // East South of Stairwell: X = 399.5..410.7, Z = -4.4..10.55
      [405.1, 3.075, 11.2, 14.95],
      // Mid-East North (West of Stairwell): X = 399.5..405.4, Z = -11.5..-4.4
      [402.45, -7.95, 5.9, 7.1],
    ];
    if (!includeStairCutout) {
      // Roof over stairwell bay: X = 405.4..410.7, Z = -11.5..-4.4
      segs.push([408.05, -7.95, 5.3, 7.1]);
    }
    segs.forEach(([cx, cz, w, d]) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), floorMat);
      slab.position.set(cx, topY - thickness * 0.5, cz);
      staticGroup.add(slab);
    });
  };

  // Floor 2 Structural Slab + Ceiling Soffit (top = 4.32m)
  addMultiFloorSlabWithCutouts(PODIUM_Y + LV_FLOOR_H, 0.24, marbleFloorMat, true);
  // Floor 3 Structural Slab + Ceiling Soffit (top = 8.32m)
  addMultiFloorSlabWithCutouts(PODIUM_Y + LV_FLOOR_H * 2, 0.24, marbleFloorMat, true);
  // Floor 3 Finished Ceiling (underside at Y = 12.00m)
  addMultiFloorSlabWithCutouts(12.22, 0.22, ceilingPlasterMat, false);

  // Warm illuminated architectural perimeter ceiling coves on Floors 2 & 3 (glow softly from street!)
  [PODIUM_Y + LV_FLOOR_H * 2 - 0.26, 11.96].forEach((cy) => {
    const sCove = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.05, 0.35), warmSoffitGlowMat);
    sCove.position.set(399.5, cy, 10.1);
    staticGroup.add(sCove);

    const wCove = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 20.0), warmSoffitGlowMat);
    wCove.position.set(388.7, cy, -0.4);
    staticGroup.add(wCove);
  });

  // Horizontal Curtain Wall Transoms (Y = 4.15 & 8.15)
  [4.15, 8.15].forEach((ty) => {
    const sTransom = new THREE.Mesh(new THREE.BoxGeometry(22.8, 0.24, 0.34), darkBronzeMat);
    sTransom.position.set(399.6, ty, 10.62);
    staticGroup.add(sTransom);

    const wTransom = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 22.2), darkBronzeMat);
    wTransom.position.set(388.25, ty, -0.4);
    staticGroup.add(wTransom);
  });

  // Vertical Curtain Wall Mullions — STRICTLY skip South Portal (394.2..399.8) & West Portal (-2.05..3.45)!
  [388.3, 390.3, 392.3, 394.2, 399.8, 402.4, 405.0, 407.8, 410.6].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 11.88, 0.28), darkBronzeMat);
    mullion.position.set(mx, 6.26, 10.62);
    staticGroup.add(mullion);
  });
  [-11.2, -8.2, -5.2, -2.05, 3.45, 6.0, 8.4, 10.6].forEach((mz) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.28, 11.88, 0.14), darkBronzeMat);
    mullion.position.set(388.25, 6.26, mz);
    staticGroup.add(mullion);
  });

  // Projecting Glowing Glass Balconies (2 South Bays + 2 West Corner Bays)
  const addGlowingBalcony = (cx: number, y: number, cz: number, span: number, depth: number, rotateY = 0) => {
    const balGroup = new THREE.Group();
    balGroup.position.set(cx, y, cz);
    balGroup.rotation.y = rotateY;

    const slab = new THREE.Mesh(new THREE.BoxGeometry(span, 0.24, depth), darkBronzeMat);
    balGroup.add(slab);

    const glowSoffit = new THREE.Mesh(new THREE.BoxGeometry(span - 0.26, 0.06, depth - 0.18), warmSoffitGlowMat);
    glowSoffit.position.y = -0.14;
    balGroup.add(glowSoffit);

    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(span - 0.08, 0.88, 0.06), clearGlassMat);
    frontGlass.position.set(0, 0.56, depth * 0.5 - 0.05);
    frontGlass.userData.noMerge = true;
    balGroup.add(frontGlass);

    const handrail = new THREE.Mesh(new THREE.BoxGeometry(span, 0.06, 0.08), champagneRibMat);
    handrail.position.set(0, 1.02, depth * 0.5 - 0.05);
    balGroup.add(handrail);

    staticGroup.add(balGroup);
  };
  addGlowingBalcony(397.0, 4.18, 11.2, 6.8, 1.35, 0);
  addGlowingBalcony(397.0, 8.18, 11.2, 6.8, 1.35, 0);
  addGlowingBalcony(387.55, 4.18, 0.7, 6.6, 1.35, -Math.PI * 0.5);
  addGlowingBalcony(387.55, 8.18, 0.7, 6.6, 1.35, -Math.PI * 0.5);

  // =========================================================================
  // 5. LUMINOUS CASCADING 3D CONCAVE 4-POINTED STAR DIAMONDS (IMAGE 2)
  // =========================================================================
  const addStarDiamond = (
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    depth: number,
    rotY = 0
  ) => {
    const geo = createConcaveStarGeometry(rx, ry, depth);
    const mesh = new THREE.Mesh(geo, starDiamondMat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    staticGroup.add(mesh);

    const rimGeo = createConcaveStarGeometry(rx * 1.03, ry * 1.03, depth * 0.45);
    const rimMesh = new THREE.Mesh(rimGeo, starTrimMat);
    rimMesh.position.set(x, y, z - Math.cos(rotY) * 0.015);
    rimMesh.rotation.y = rotY;
    staticGroup.add(rimMesh);
  };

  // South Facade Constellation
  const southStars: [number, number, number, number, number, number][] = [
    [388.4, 1.85, 13.05, 1.35, 1.55, 0.14],
    [387.3, 3.65, 12.95, 0.78, 0.90, 0.10],
    [387.6, 6.10, 12.90, 0.92, 1.05, 0.10],
    [389.4, 6.85, 12.60, 0.85, 0.98, 0.10],
    [388.1, 8.95, 12.88, 0.95, 1.10, 0.10],
    [390.6, 9.95, 12.92, 1.55, 1.80, 0.14],
    [389.0, 13.75, 13.35, 1.30, 1.50, 0.12],
    [386.6, 15.20, 13.25, 0.98, 1.15, 0.10],
    [394.6, 8.85, 12.15, 0.86, 1.00, 0.10],
    [396.0, 7.65, 12.05, 0.74, 0.86, 0.10],
    [398.4, 8.45, 12.05, 0.82, 0.96, 0.10],
    [401.2, 8.15, 12.85, 1.25, 1.44, 0.12],
    [400.2, 5.15, 12.85, 1.12, 1.30, 0.12],
    [403.6, 6.05, 12.40, 0.84, 0.96, 0.10],
  ];
  southStars.forEach(([x, y, z, rx, ry, d]) => addStarDiamond(x, y, z, rx, ry, d, 0));

  // HERO SOUTH CENTERPIECE STAR WITH LUMINOUS WHITE "LV" MONOGRAM
  addStarDiamond(392.9, 5.15, 13.15, 2.35, 2.65, 0.22, 0);
  const heroLvTex = createHeroLvEmblemTex();
  const heroLvMat = new THREE.MeshStandardMaterial({
    map: heroLvTex,
    transparent: true,
    alphaTest: 0.08,
    emissive: 0xffffff,
    emissiveMap: heroLvTex,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  neonMats.push(heroLvMat);
  const heroLvPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), heroLvMat);
  heroLvPlate.position.set(392.9, 5.15, 13.31);
  heroLvPlate.userData.noMerge = true;
  staticGroup.add(heroLvPlate);

  // West Corner Wrap-Around Star Constellation (stays clear above the West Entrance Z = -0.8..2.2)
  const westStars: [number, number, number, number, number, number][] = [
    [385.65, 2.20, 10.30, 1.10, 1.26, 0.12],
    [385.55, 4.40, 10.60, 1.15, 1.35, 0.12],
    [385.75, 7.60, 7.60, 0.95, 1.10, 0.10],
    [385.60, 10.40, 8.60, 1.32, 1.52, 0.12],
    [385.55, 12.90, 9.80, 1.15, 1.34, 0.12],
    [385.65, 15.10, 10.75, 1.02, 1.20, 0.10],
    [385.85, 6.20, 2.80, 1.05, 1.22, 0.10],
    [385.85, 8.95, -0.80, 1.20, 1.40, 0.12],
    [385.65, 6.60, -4.40, 1.10, 1.26, 0.10],
  ];
  westStars.forEach(([x, y, z, rx, ry, d]) => addStarDiamond(x, y, z, rx, ry, d, -Math.PI * 0.5));

  // Secondary West Hero LV Star above West Column / Bay (facing Đường Sơn Tây Bắc & John Henry)
  addStarDiamond(385.65, 5.65, 6.2, 1.75, 1.98, 0.18, -Math.PI * 0.5);
  const westHeroLvPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.30, 1.30), heroLvMat);
  westHeroLvPlate.rotation.y = -Math.PI * 0.5;
  westHeroLvPlate.position.set(385.52, 5.65, 6.2);
  westHeroLvPlate.userData.noMerge = true;
  staticGroup.add(westHeroLvPlate);

  // =========================================================================
  // 6. DUAL BOTANICAL GLASS ENTRANCE VESTIBULES (SOUTH & WEST)
  // =========================================================================
  const portalWordmarkTex = createLouisVuittonWordmarkTex();
  const portalWordmarkMat = new THREE.MeshStandardMaterial({
    map: portalWordmarkTex,
    transparent: true,
    alphaTest: 0.08,
    emissive: 0xffffff,
    emissiveMap: portalWordmarkTex,
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });
  neonMats.push(portalWordmarkMat);

  const terrariumBackMat = new THREE.MeshStandardMaterial({
    color: 0x1e150c,
    emissive: 0x5c360e,
    emissiveIntensity: 0.45,
    roughness: 0.72,
  });
  lanternMats.push(terrariumBackMat);

  const add3DBotanicalTerrarium = (
    cx: number,
    cz: number,
    sizeX: number,
    sizeZ: number
  ) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.34, sizeZ), darkBronzeMat);
    base.position.set(cx, PODIUM_Y + 0.17, cz);
    staticGroup.add(base);

    // Warm dark interior reflector + warm amber top/bottom LED strips
    const backCore = new THREE.Mesh(new THREE.BoxGeometry(sizeX - 0.36, 2.24, sizeZ - 0.36), terrariumBackMat);
    backCore.position.set(cx, PODIUM_Y + 1.46, cz);
    staticGroup.add(backCore);

    const topLed = new THREE.Mesh(new THREE.BoxGeometry(sizeX - 0.14, 0.06, sizeZ - 0.14), warmSoffitGlowMat);
    topLed.position.set(cx, PODIUM_Y + 2.66, cz);
    staticGroup.add(topLed);

    // Rich 3D emerald ferns & warm coral/gold floral accents inside the glass showcase
    for (let i = 0; i < 12; i++) {
      const ox = ((i % 3) - 1) * (sizeX * 0.26);
      const oz = (Math.floor(i / 3) - 1.5) * (sizeZ * 0.20);
      const fy = PODIUM_Y + 0.65 + (i % 4) * 0.42;
      const frond = new THREE.Mesh(
        new THREE.SphereGeometry(0.24 + (i % 3) * 0.07, 7, 6),
        i % 2 === 0 ? leafMat1 : leafMat2
      );
      frond.position.set(cx + ox, fy, cz + oz);
      frond.scale.set(1.25, 0.9, 1.15);
      staticGroup.add(frond);

      if (i % 4 === 1) {
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), bloomMat);
        bloom.position.set(cx + ox * 0.85, fy + 0.16, cz + oz * 0.85);
        staticGroup.add(bloom);
      }
    }

    // Clear exterior glass vitrine
    const glassBox = new THREE.Mesh(new THREE.BoxGeometry(sizeX - 0.02, 2.38, sizeZ - 0.02), clearGlassMat);
    glassBox.position.set(cx, PODIUM_Y + 1.53, cz);
    glassBox.userData.noMerge = true;
    staticGroup.add(glassBox);

    // Sleek corner bronze vertical frames
    [-sizeX * 0.48, sizeX * 0.48].forEach((ox) => {
      [-sizeZ * 0.48, sizeZ * 0.48].forEach((oz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.74, 0.06), darkBronzeMat);
        post.position.set(cx + ox, PODIUM_Y + 1.37, cz + oz);
        staticGroup.add(post);
      });
    });
  };

  // --- 6A. SOUTH ENTRANCE VESTIBULE (X = 397.0, Z = 10.6..13.0) ---
  const southFascia = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.68, 2.55), darkBronzeMat);
  southFascia.position.set(SOUTH_DOOR_X, PODIUM_Y + 3.06, 11.82);
  staticGroup.add(southFascia);

  const southGoldLine = new THREE.Mesh(new THREE.BoxGeometry(5.84, 0.06, 2.58), gildedGoldMat);
  southGoldLine.position.set(SOUTH_DOOR_X, PODIUM_Y + 3.41, 11.82);
  staticGroup.add(southGoldLine);

  const southWordmarkPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.62), portalWordmarkMat);
  southWordmarkPlane.position.set(SOUTH_DOOR_X, PODIUM_Y + 3.06, 13.12);
  southWordmarkPlane.userData.noMerge = true;
  staticGroup.add(southWordmarkPlane);

  add3DBotanicalTerrarium(394.82, 11.82, 1.32, 2.38);
  add3DBotanicalTerrarium(399.18, 11.82, 1.32, 2.38);

  // --- 6B. WEST ENTRANCE VESTIBULE (X = 386.15..388.25, Z = 0.70, facing Đường Sơn Tây Bắc) ---
  const westFascia = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.68, 5.5), darkBronzeMat);
  westFascia.position.set(387.2, PODIUM_Y + 3.06, WEST_DOOR_Z);
  staticGroup.add(westFascia);

  const westGoldLine = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.06, 5.54), gildedGoldMat);
  westGoldLine.position.set(387.2, PODIUM_Y + 3.41, WEST_DOOR_Z);
  staticGroup.add(westGoldLine);

  const westWordmarkPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.60), portalWordmarkMat);
  westWordmarkPlane.rotation.y = -Math.PI * 0.5;
  westWordmarkPlane.position.set(386.10, PODIUM_Y + 3.06, WEST_DOOR_Z);
  westWordmarkPlane.userData.noMerge = true;
  staticGroup.add(westWordmarkPlane);

  add3DBotanicalTerrarium(387.2, -1.42, 2.1, 1.24);
  add3DBotanicalTerrarium(387.2, 2.82, 2.1, 1.24);

  // --- Automatic Bi-Parting Sliding Glass Doors (BOTH South & West, 3.0m clear!) ---
  const makeDoorLeaf = (rotateY = 0) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;
    leaf.rotation.y = rotateY;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.48, 2.66, 0.05), clearGlassMat);
    pane.position.y = 1.33;
    leaf.add(pane);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.08, 0.07), darkBronzeMat);
    topRail.position.y = 2.68;
    leaf.add(topRail);

    const botRail = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.08, 0.07), darkBronzeMat);
    botRail.position.y = 0.04;
    leaf.add(botRail);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), gildedGoldMat);
    handle.position.set(0, 1.25, 0.055);
    leaf.add(handle);

    return leaf;
  };

  // South Sliding Doors (along X)
  const southLeftLeaf = makeDoorLeaf(0);
  const southLeftClosedX = SOUTH_DOOR_X - 0.75;
  southLeftLeaf.position.set(southLeftClosedX, PODIUM_Y, SOUTH_DOOR_Z);
  staticGroup.add(southLeftLeaf);

  const southRightLeaf = makeDoorLeaf(0);
  const southRightClosedX = SOUTH_DOOR_X + 0.75;
  southRightLeaf.position.set(southRightClosedX, PODIUM_Y, SOUTH_DOOR_Z);
  staticGroup.add(southRightLeaf);

  // West Sliding Doors (along Z)
  const westNorthLeaf = makeDoorLeaf(-Math.PI * 0.5);
  const westNorthClosedZ = WEST_DOOR_Z - 0.75;
  westNorthLeaf.position.set(WEST_DOOR_X, PODIUM_Y, westNorthClosedZ);
  staticGroup.add(westNorthLeaf);

  const westSouthLeaf = makeDoorLeaf(-Math.PI * 0.5);
  const westSouthClosedZ = WEST_DOOR_Z + 0.75;
  westSouthLeaf.position.set(WEST_DOOR_X, PODIUM_Y, westSouthClosedZ);
  staticGroup.add(westSouthLeaf);

  // Rolling Security Shutters (07:00 - 23:00) on BOTH South & West Portals
  const lvShutterTex = createRollingShutterTexture({
    title: 'LOUIS VUITTON',
    hoursLabel: 'OPEN 07:00 - 23:00',
    accentHex: '#c59b5f',
    slatDarkHex: '#231914',
    slatLightHex: '#3b2b22',
  });
  const lvShutterMat = new THREE.MeshStandardMaterial({
    map: lvShutterTex,
    roughness: 0.48,
    metalness: 0.55,
  });

  const southShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'louis-vuitton-south-shutter',
      axis: 'x',
      pos: 12.84,
      spanCenter: SOUTH_DOOR_X,
      width: 3.15,
      baseY: PODIUM_Y,
      topY: PODIUM_Y + 2.75,
      thickness: 0.08,
    },
    lvShutterMat,
    darkBronzeMat
  );

  const westShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'louis-vuitton-west-shutter',
      axis: 'z',
      pos: 386.33,
      spanCenter: WEST_DOOR_Z,
      width: 3.15,
      baseY: PODIUM_Y,
      topY: PODIUM_Y + 2.75,
      thickness: 0.08,
    },
    lvShutterMat,
    darkBronzeMat
  );

  // =========================================================================
  // 7. WALKABLE 3-FLOOR LUXURY BOUTIQUE INTERIOR & NE GRAND SWITCHBACK STAIRWELL
  // =========================================================================
  const FLOOR2_Y = PODIUM_Y + LV_FLOOR_H; // 4.32m
  const FLOOR3_Y = PODIUM_Y + LV_FLOOR_H * 2; // 8.32m

  // Additional Interior Luxury Materials
  const roseGoldMat = new THREE.MeshStandardMaterial({
    color: 0xe6a88a,
    emissive: 0x452212,
    emissiveIntensity: 0.25,
    roughness: 0.24,
    metalness: 0.85,
  });
  const emeraldVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x0f4c3a,
    roughness: 0.82,
  });
  const burgundyVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x6b1424,
    roughness: 0.82,
  });
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xe8edf2,
    roughness: 0.08,
    metalness: 0.94,
  });

  // -------------------------------------------------------------------------
  // 7.0 FLOOR 1 FLOORING & ARCHITECTURAL PILASTERS
  // -------------------------------------------------------------------------
  const interiorMarble = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.04, 22.0), marbleFloorMat);
  interiorMarble.position.set(399.5, PODIUM_Y + 0.01, -0.5);
  staticGroup.add(interiorMarble);

  const salonParquet = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.02, 13.6), walnutParquetMat);
  salonParquet.position.set(399.0, PODIUM_Y + 0.025, -0.6);
  staticGroup.add(salonParquet);

  // Fluted Travertine Pilasters & Illuminated Niches along North Wall (all 3 floors)
  [390.2, 392.8, 401.2, 404.2].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.55, 11.7, 0.34), flutedLimestoneMat);
    pilaster.position.set(px, PODIUM_Y + 5.85, -11.35);
    staticGroup.add(pilaster);
  });

  // Ring Chandeliers on Floor 1 & Floor 2 North Bays (Atrium gets 3-story cascading chandelier!)
  [PODIUM_Y + 3.55, FLOOR2_Y + 3.55].forEach((ry) => {
    [397.0, 405.5].forEach((rx) => {
      const rz = rx > 400 ? 3.2 : -3.2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.055, 8, 28), gildedGoldMat);
      ring.rotation.x = Math.PI * 0.5;
      ring.position.set(rx, ry, rz);
      staticGroup.add(ring);

      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.032, 6, 24), warmSoffitGlowMat);
      glowRing.rotation.x = Math.PI * 0.5;
      glowRing.position.set(rx, ry - 0.03, rz);
      staticGroup.add(glowRing);
    });
  });

  // -------------------------------------------------------------------------
  // 7.0B DOUBLE-HEIGHT ATRIUM BALUSTRADES (FLOORS 2 & 3) + 3-STORY CHANDELIER
  // -------------------------------------------------------------------------
  [FLOOR2_Y, FLOOR3_Y].forEach((fy) => {
    // South & North glass edges (X = 394.5..399.5, Z = 5.0 & Z = 9.2)
    [5.0, 9.2].forEach((bz) => {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.96, 0.05), clearGlassMat);
      glass.position.set(397.0, fy + 0.48, bz);
      glass.userData.noMerge = true;
      staticGroup.add(glass);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(5.08, 0.06, 0.09), gildedGoldMat);
      rail.position.set(397.0, fy + 0.98, bz);
      staticGroup.add(rail);
    });
    // West & East glass edges (Z = 5.0..9.2, X = 394.5 & X = 399.5)
    [394.5, 399.5].forEach((bx) => {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.96, 4.2), clearGlassMat);
      glass.position.set(bx, fy + 0.48, 7.1);
      glass.userData.noMerge = true;
      staticGroup.add(glass);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 4.28), gildedGoldMat);
      rail.position.set(bx, fy + 0.98, 7.1);
      staticGroup.add(rail);
    });
  });

  // 3-Story Cascading Champagne-Gold Chandelier inside Atrium Void (X = 397.0, Z = 7.1)
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.14, 24), gildedGoldMat);
  canopy.position.set(397.0, 11.95, 7.1);
  staticGroup.add(canopy);

  const chandelierTiers: [number, number][] = [
    [11.4, 1.35],
    [10.2, 1.15],
    [8.9, 0.98],
    [7.5, 0.82],
    [6.1, 0.66],
    [4.9, 0.50],
  ];
  chandelierTiers.forEach(([cy, cr], idx) => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(cr, 0.045, 8, 28), gildedGoldMat);
    hoop.rotation.x = Math.PI * 0.5;
    hoop.position.set(397.0, cy, 7.1);
    staticGroup.add(hoop);

    const glow = new THREE.Mesh(new THREE.TorusGeometry(cr * 0.92, 0.025, 6, 24), warmSoffitGlowMat);
    glow.rotation.x = Math.PI * 0.5;
    glow.position.set(397.0, cy - 0.03, 7.1);
    staticGroup.add(glow);

    // Crystal light drops suspended around each tier
    const dropCount = 8 - Math.floor(idx / 2);
    for (let d = 0; d < dropCount; d++) {
      const ang = (d / dropCount) * Math.PI * 2 + idx * 0.35;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.55, 6), gildedGoldMat);
      rod.position.set(397.0 + Math.cos(ang) * cr, cy - 0.25, 7.1 + Math.sin(ang) * cr);
      staticGroup.add(rod);

      const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), starTrimMat);
      prism.position.set(397.0 + Math.cos(ang) * cr, cy - 0.52, 7.1 + Math.sin(ang) * cr);
      staticGroup.add(prism);
    }
  });

  // -------------------------------------------------------------------------
  // 7.0C NE GRAND TRAVERTINE SWITCHBACK STAIRCASE (F1 -> F2 -> F3)
  // X = 405.4 .. 410.6, Z = -11.3 .. -4.4 (Open South entrance at Z = -4.4)
  // -------------------------------------------------------------------------
  const buildLvStairFlight = (baseY: number, floorNum: number) => {
    const stepsPerHalf = 10;
    const halfRise = LV_FLOOR_H * 0.5;
    const runLen = 5.0; // Z = -4.4 -> -9.4

    // Left Flight (Going UP North: X = 405.55..407.85, cx = 406.70)
    for (let s = 0; s < stepsPerHalf; s++) {
      const t = (s + 1) / stepsPerHalf;
      const sy = baseY + t * halfRise;
      const sz = -4.4 - ((s + 0.5) / stepsPerHalf) * runLen;
      const stepSlab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.54), graniteStepMat);
      stepSlab.position.set(406.7, sy - 0.09, sz);
      staticGroup.add(stepSlab);

      const led = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.025, 0.04), stepLedMat);
      led.position.set(406.7, sy - 0.015, sz + 0.25);
      staticGroup.add(led);
    }

    // Half-Landing (X = 405.55..410.6, Z = -11.3..-9.4, Y = baseY + 2.00)
    const landing = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.22, 1.9), graniteStepMat);
    landing.position.set(408.08, baseY + halfRise - 0.11, -10.35);
    staticGroup.add(landing);

    const landingTrim = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.05, 0.08), gildedGoldMat);
    landingTrim.position.set(408.08, baseY + halfRise - 0.02, -9.42);
    staticGroup.add(landingTrim);

    // Decorative Glowing LV Wall Sconce on North Landing Wall
    const sconce = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.10), warmSoffitGlowMat);
    sconce.position.set(408.08, baseY + halfRise + 1.15, -11.32);
    staticGroup.add(sconce);
    const sconceFrame = new THREE.Mesh(new THREE.BoxGeometry(1.94, 1.04, 0.06), darkBronzeMat);
    sconceFrame.position.set(408.08, baseY + halfRise + 1.15, -11.35);
    staticGroup.add(sconceFrame);

    // Right Flight (Continuing UP South: X = 408.15..410.55, cx = 409.35)
    for (let s = 0; s < stepsPerHalf; s++) {
      const t = (s + 1) / stepsPerHalf;
      const sy = baseY + halfRise + t * halfRise;
      const sz = -9.4 + ((s + 0.5) / stepsPerHalf) * runLen;
      const stepSlab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.54), graniteStepMat);
      stepSlab.position.set(409.35, sy - 0.09, sz);
      staticGroup.add(stepSlab);

      const led = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.025, 0.04), stepLedMat);
      led.position.set(409.35, sy - 0.015, sz - 0.25);
      staticGroup.add(led);
    }

    // Center Spine Divider (X = 408.0, Z = -9.4..-4.4)
    const spineGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.1, 5.0), clearGlassMat);
    spineGlass.position.set(408.0, baseY + halfRise + 0.55, -6.9);
    spineGlass.userData.noMerge = true;
    staticGroup.add(spineGlass);

    const spinePost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), gildedGoldMat);
    spinePost.position.set(408.0, baseY + 1.1 + floorNum * 0.02, -4.4);
    staticGroup.add(spinePost);

    // West Glass Balustrade along X = 405.42, Z = -11.3..-4.4
    const westRailGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 6.9), clearGlassMat);
    westRailGlass.position.set(405.42, baseY + halfRise + 0.3, -7.85);
    westRailGlass.userData.noMerge = true;
    staticGroup.add(westRailGlass);

    const westHandrail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 6.96), gildedGoldMat);
    westHandrail.position.set(405.42, baseY + 0.98, -7.85);
    staticGroup.add(westHandrail);
  };
  buildLvStairFlight(PODIUM_Y, 1);
  buildLvStairFlight(FLOOR2_Y, 2);

  // Floor 1 Under-Stair Marble Cabinet (closes off underside of Flight 2 at X = 408.15..410.55, Z = -4.45)
  const underStairWall = new THREE.Mesh(new THREE.BoxGeometry(2.45, 3.8, 0.22), walnutParquetMat);
  underStairWall.position.set(409.38, PODIUM_Y + 1.9, -4.45);
  staticGroup.add(underStairWall);

  // Directory Wayfinding Totem beside Stairwell Entry on Floor 1 & Floor 2
  [PODIUM_Y, FLOOR2_Y].forEach((fy) => {
    const totemBase = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.52), travertinePlinthMat);
    totemBase.position.set(404.6, fy + 0.08, -3.95);
    staticGroup.add(totemBase);

    const totemBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.56, 0.16), darkBronzeMat);
    totemBody.position.set(404.6, fy + 0.94, -3.95);
    staticGroup.add(totemBody);

    const dirTex = createDirectoryTotemTex();
    const dirMat = new THREE.MeshStandardMaterial({
      map: dirTex,
      emissive: 0xffe4b5,
      emissiveMap: dirTex,
      emissiveIntensity: 0.42,
      roughness: 0.3,
    });
    const dirFace = new THREE.Mesh(new THREE.PlaneGeometry(0.50, 0.85), dirMat);
    dirFace.position.set(404.6, fy + 1.05, -3.86);
    dirFace.userData.noMerge = true;
    staticGroup.add(dirFace);
  });

  // Floor 3 Stairwell West & Left-Bay Gold Stanchion + Velvet Rope
  const f3StanchionL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.14, 0.95, 10), gildedGoldMat);
  f3StanchionL.position.set(405.8, FLOOR3_Y + 0.48, -4.45);
  staticGroup.add(f3StanchionL);
  const f3StanchionR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.14, 0.95, 10), gildedGoldMat);
  f3StanchionR.position.set(407.6, FLOOR3_Y + 0.48, -4.45);
  staticGroup.add(f3StanchionR);
  const f3Rope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.8, 8), burgundyVelvetMat);
  f3Rope.rotation.z = Math.PI * 0.5;
  f3Rope.position.set(406.7, FLOOR3_Y + 0.82, -4.45);
  staticGroup.add(f3Rope);

  // -------------------------------------------------------------------------
  // 7.1 FLOOR 1 INTERIOR DETAILS (TRUNKS, JEWELRY, HANDBAGS, RTW, VIP LOUNGE)
  // -------------------------------------------------------------------------
  // 7a. Centerpiece Stacked Monogram Trunk Tower ("Malle Courrier" at X = 397.0, Z = 3.2)
  const trunkPlinthOuter = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.48, 0.20, 28), travertinePlinthMat);
  trunkPlinthOuter.position.set(397.0, PODIUM_Y + 0.10, 3.2);
  staticGroup.add(trunkPlinthOuter);

  const trunkPlinthInner = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.18, 0.22, 24), gildedGoldMat);
  trunkPlinthInner.position.set(397.0, PODIUM_Y + 0.30, 3.2);
  staticGroup.add(trunkPlinthInner);

  const trunkSizes: [number, number, number, number][] = [
    [1.48, 0.62, 0.96, 0.05],
    [1.24, 0.54, 0.82, -0.14],
    [1.00, 0.46, 0.68, 0.12],
    [0.78, 0.38, 0.54, -0.08],
    [0.54, 0.30, 0.42, 0.18],
  ];
  let trunkY = PODIUM_Y + 0.41;
  trunkSizes.forEach(([w, h, d, yaw]) => {
    const trunk = new THREE.Group();
    trunk.position.set(397.0, trunkY + h * 0.5, 3.2);
    trunk.rotation.y = yaw;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trunkCanvasMat);
    trunk.add(body);

    [-w * 0.32, w * 0.32].forEach((sx) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, h + 0.02, d + 0.03), gildedGoldMat);
      strap.position.x = sx;
      trunk.add(strap);
    });
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), gildedGoldMat);
    latch.position.set(0, 0, d * 0.5 + 0.02);
    trunk.add(latch);

    staticGroup.add(trunk);
    trunkY += h;
  });

  // 7b. Central Fine Jewelry & Watches Vitrine Island (X = 397.0, Z = -3.2)
  const jewelryBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.92, 1.9), travertinePlinthMat);
  jewelryBase.position.set(397.0, PODIUM_Y + 0.46, -3.2);
  staticGroup.add(jewelryBase);

  const jewelryGlass = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.56, 1.82), clearGlassMat);
  jewelryGlass.position.set(397.0, PODIUM_Y + 1.20, -3.2);
  jewelryGlass.userData.noMerge = true;
  staticGroup.add(jewelryGlass);

  const jewelryTrim = new THREE.Mesh(new THREE.BoxGeometry(4.38, 0.05, 1.88), gildedGoldMat);
  jewelryTrim.position.set(397.0, PODIUM_Y + 1.48, -3.2);
  staticGroup.add(jewelryTrim);

  for (let i = 0; i < 5; i++) {
    const jx = 395.3 + i * 0.85;
    const velvetPad = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.16, 12), creamBoucleMat);
    velvetPad.position.set(jx, PODIUM_Y + 1.0, -3.2);
    staticGroup.add(velvetPad);

    if (i % 2 === 0) {
      const bust = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 10), burgundyVelvetMat);
      bust.position.set(jx, PODIUM_Y + 1.20, -3.2);
      staticGroup.add(bust);
      const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.015, 6, 14), gildedGoldMat);
      necklace.rotation.x = Math.PI * 0.38;
      necklace.position.set(jx, PODIUM_Y + 1.22, -3.14);
      staticGroup.add(necklace);
    } else {
      const watchBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), darkBronzeMat);
      watchBox.position.set(jx, PODIUM_Y + 1.12, -3.2);
      staticGroup.add(watchBox);
      const watchDial = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 12), roseGoldMat);
      watchDial.position.set(jx, PODIUM_Y + 1.18, -3.2);
      staticGroup.add(watchDial);
    }
  }

  // 7c. West Handbag & Leather Goods Gallery (North & South wings flanking West Entrance)
  const handbagPalette = [0x4c2817, 0x7c2d12, 0xd6c7b2, 0x1e293b, 0x166534, 0x991b1b];
  const buildHandbagBay = (zCenter: number, nicheZs: number[]) => {
    const span = nicheZs.length * 2.7 + 0.6;
    const bagUnit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, span), travertinePlinthMat);
    bagUnit.position.set(389.2, PODIUM_Y + 0.36, zCenter);
    staticGroup.add(bagUnit);

    nicheZs.forEach((bz, b) => {
      const nicheBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.45, 2.0), ceilingPlasterMat);
      nicheBack.position.set(388.72, PODIUM_Y + 1.95, bz);
      staticGroup.add(nicheBack);

      const nicheFrame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.52, 2.08), gildedGoldMat);
      nicheFrame.position.set(388.66, PODIUM_Y + 1.95, bz);
      staticGroup.add(nicheFrame);

      [PODIUM_Y + 1.15, PODIUM_Y + 2.05].forEach((sy, sIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 1.92), gildedGoldMat);
        shelf.position.set(389.05, sy - 0.14, bz);
        staticGroup.add(shelf);

        [-0.45, 0.45].forEach((dz, hIdx) => {
          const bagMat = new THREE.MeshStandardMaterial({
            color: handbagPalette[(b + sIdx + hIdx) % handbagPalette.length],
            roughness: 0.38,
            metalness: 0.14,
          });
          const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.38), bagMat);
          bagBody.position.set(389.08, sy + 0.02, bz + dz);
          staticGroup.add(bagBody);

          const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 6, 12, Math.PI), gildedGoldMat);
          handle.rotation.y = Math.PI * 0.5;
          handle.position.set(389.08, sy + 0.16, bz + dz);
          staticGroup.add(handle);
        });
      });
    });
  };
  buildHandbagBay(-5.9, [-7.2, -4.5]);
  buildHandbagBay(6.35, [5.4, 7.6]);

  // 7d. East Ready-to-Wear, Footwear & Mirror Salon (X = 409.1..410.5, Z = -3.4..4.2, clear of Stairwell!)
  const rtwBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 7.6), walnutParquetMat);
  rtwBack.position.set(410.42, PODIUM_Y + 1.7, 0.4);
  staticGroup.add(rtwBack);

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 5.2, 8), gildedGoldMat);
  rail.rotation.x = Math.PI * 0.5;
  rail.position.set(409.7, PODIUM_Y + 1.92, -0.4);
  staticGroup.add(rail);

  const garmentColors = [0x1c1917, 0xd6cfc7, 0x7f1d1d, 0x1e3a5f, 0xb48a5a];
  for (let g = 0; g < 7; g++) {
    const gz = -2.8 + g * 0.76;
    const gMat = new THREE.MeshStandardMaterial({
      color: garmentColors[g % garmentColors.length],
      roughness: 0.72,
    });
    const coat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, 0.16), gMat);
    coat.position.set(409.7, PODIUM_Y + 1.38, gz);
    staticGroup.add(coat);
  }

  // Footwear Stepped Display + Full-Length Gilded Fitting Mirror (Z = 2.4..4.2)
  const shoePedestal = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 1.8), travertinePlinthMat);
  shoePedestal.position.set(409.65, PODIUM_Y + 0.26, 3.25);
  staticGroup.add(shoePedestal);
  for (let sh = 0; sh < 3; sh++) {
    const sneaker = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 0.16),
      sh % 2 === 0 ? creamBoucleMat : trunkCanvasMat
    );
    sneaker.position.set(409.65, PODIUM_Y + 0.60, 2.7 + sh * 0.52);
    staticGroup.add(sneaker);
  }
  const dressingMirror = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.35, 1.0), mirrorMat);
  dressingMirror.position.set(410.30, PODIUM_Y + 1.35, 3.25);
  staticGroup.add(dressingMirror);
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.44, 1.1), gildedGoldMat);
  mirrorFrame.position.set(410.33, PODIUM_Y + 1.35, 3.25);
  staticGroup.add(mirrorFrame);

  // 7e. North Marble Concierge Desk + Lamps + Tablet POS + "LOUIS VUITTON PARIS" Mural
  const conciergeDesk = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.04, 1.25), travertinePlinthMat);
  conciergeDesk.position.set(397.0, PODIUM_Y + 0.52, -9.8);
  staticGroup.add(conciergeDesk);

  const deskGoldStrip = new THREE.Mesh(new THREE.BoxGeometry(6.64, 0.08, 1.28), gildedGoldMat);
  deskGoldStrip.position.set(397.0, PODIUM_Y + 0.98, -9.8);
  staticGroup.add(deskGoldStrip);

  [-2.4, 2.4].forEach((ox) => {
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.36, 10), gildedGoldMat);
    lampStem.position.set(397.0 + ox, PODIUM_Y + 1.22, -9.8);
    staticGroup.add(lampStem);
    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.18, 12), warmSoffitGlowMat);
    lampShade.position.set(397.0 + ox, PODIUM_Y + 1.44, -9.8);
    staticGroup.add(lampShade);
  });
  const posTablet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.04), darkBronzeMat);
  posTablet.rotation.x = -0.45;
  posTablet.position.set(397.0, PODIUM_Y + 1.15, -9.75);
  staticGroup.add(posTablet);

  const muralPanel = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.8, 0.14), darkBronzeMat);
  muralPanel.position.set(397.0, PODIUM_Y + 2.1, -11.35);
  staticGroup.add(muralPanel);

  const muralSignTex = createLouisVuittonWordmarkTex('MAISON FONDEE EN 1854 • PARIS');
  const muralSignMat = new THREE.MeshStandardMaterial({
    map: muralSignTex,
    transparent: true,
    alphaTest: 0.08,
    emissive: 0xffe4b5,
    emissiveMap: muralSignTex,
    emissiveIntensity: 1.0,
  });
  neonMats.push(muralSignMat);
  const muralSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.3), muralSignMat);
  muralSignPlane.position.set(397.0, PODIUM_Y + 2.15, -11.24);
  muralSignPlane.userData.noMerge = true;
  staticGroup.add(muralSignPlane);

  // 7f. SE VIP Champagne Lounge
  const vipRug = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.025, 4.2), creamBoucleMat);
  vipRug.position.set(406.5, PODIUM_Y + 0.03, 7.6);
  staticGroup.add(vipRug);

  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.44, 1.15), creamBoucleMat);
  sofaBase.position.set(406.5, PODIUM_Y + 0.24, 8.75);
  staticGroup.add(sofaBase);

  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 0.28), creamBoucleMat);
  sofaBack.position.set(406.5, PODIUM_Y + 0.68, 9.18);
  staticGroup.add(sofaBack);

  const vipTable = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.65, 0.42, 16), travertinePlinthMat);
  vipTable.position.set(406.5, PODIUM_Y + 0.22, 7.15);
  staticGroup.add(vipTable);

  const champagneBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.26, 12), gildedGoldMat);
  champagneBucket.position.set(406.6, PODIUM_Y + 0.56, 7.15);
  staticGroup.add(champagneBucket);

  const arcLampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.18, 2.25, 10), gildedGoldMat);
  arcLampStand.position.set(408.8, PODIUM_Y + 1.14, 8.85);
  staticGroup.add(arcLampStand);
  const arcLampGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 10), warmSoffitGlowMat);
  arcLampGlobe.position.set(408.6, PODIUM_Y + 2.25, 8.65);
  staticGroup.add(arcLampGlobe);

  // -------------------------------------------------------------------------
  // 7.2 FLOOR 2 INTERIOR (Y = 4.32m — HAUTE COUTURE, OBJETS NOMADES & LES PARFUMS)
  // -------------------------------------------------------------------------
  const f2BannerTex = createLuxurySignTex('HAUTE COUTURE & LES PARFUMS', 'SAVOIR-FAIRE • ATELIER ASNIÈRES');
  const f2BannerMat = new THREE.MeshStandardMaterial({
    map: f2BannerTex,
    emissive: 0xffe4b5,
    emissiveMap: f2BannerTex,
    emissiveIntensity: 0.65,
    roughness: 0.28,
  });
  neonMats.push(f2BannerMat);
  const f2Banner = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.35), f2BannerMat);
  f2Banner.position.set(397.0, FLOOR2_Y + 2.35, -11.35);
  f2Banner.userData.noMerge = true;
  staticGroup.add(f2Banner);

  // 7.2a West Haute Couture Runway Podium & 5 Luxury Mannequins (X = 388.7..391.2, Z = -8.6..7.6)
  const runwayDeck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.24, 16.4), travertinePlinthMat);
  runwayDeck.position.set(389.9, FLOOR2_Y + 0.12, -0.5);
  staticGroup.add(runwayDeck);

  const runwayGoldEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 16.45), gildedGoldMat);
  runwayGoldEdge.position.set(391.1, FLOOR2_Y + 0.13, -0.5);
  staticGroup.add(runwayGoldEdge);

  const gownColors = [0x1c1917, 0x881337, 0xe7dfc6, 0x0f4c3a, 0x312e81];
  for (let m = 0; m < 5; m++) {
    const mz = -6.8 + m * 3.15;
    const gMat = new THREE.MeshStandardMaterial({
      color: gownColors[m % gownColors.length],
      roughness: 0.58,
      metalness: 0.14,
    });
    const mPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.22, 16), darkBronzeMat);
    mPedestal.position.set(389.9, FLOOR2_Y + 0.35, mz);
    staticGroup.add(mPedestal);

    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, 0.92, 14), gMat);
    skirt.position.set(389.9, FLOOR2_Y + 0.92, mz);
    staticGroup.add(skirt);

    const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.44, 12), gMat);
    bodice.position.set(389.9, FLOOR2_Y + 1.56, mz);
    staticGroup.add(bodice);

    const mHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), gildedGoldMat);
    mHead.position.set(389.9, FLOOR2_Y + 1.94, mz);
    staticGroup.add(mHead);
  }

  // 7.2b Center-North Objets Nomades & Wardrobe Trunk Lounge (X = 394.7..399.5, Z = -7.1..-1.8)
  const nomadesRug = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.03, 28), creamBoucleMat);
  nomadesRug.position.set(397.1, FLOOR2_Y + 0.015, -4.4);
  staticGroup.add(nomadesRug);

  // Open Wardrobe Trunk Showcase ("Malle Armoire")
  const armoireBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.95, 0.72), trunkCanvasMat);
  armoireBody.position.set(397.1, FLOOR2_Y + 1.0, -6.2);
  staticGroup.add(armoireBody);
  const armoireTrim = new THREE.Mesh(new THREE.BoxGeometry(1.20, 2.0, 0.08), gildedGoldMat);
  armoireTrim.position.set(397.1, FLOOR2_Y + 1.0, -5.85);
  staticGroup.add(armoireTrim);

  // Sculptural Petal Lounge Chairs + Low Travertine Table
  [-1.25, 1.25].forEach((ox) => {
    const chairSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.38, 0.44, 14), emeraldVelvetMat);
    chairSeat.position.set(397.1 + ox, FLOOR2_Y + 0.28, -3.5);
    staticGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.52, 0.56, 14, 1, false, -0.5, Math.PI),
      emeraldVelvetMat
    );
    chairBack.rotation.y = ox < 0 ? 0.5 : -1.2;
    chairBack.position.set(397.1 + ox, FLOOR2_Y + 0.62, -3.5);
    staticGroup.add(chairBack);
  });

  const nomadesTable = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.52, 0.38, 18), travertinePlinthMat);
  nomadesTable.position.set(397.1, FLOOR2_Y + 0.20, -3.5);
  staticGroup.add(nomadesTable);

  // 7.2c East & SE Les Parfums Glowing Wall Library + Fragrance Consultation Bar + Watch Vitrine
  const perfumeWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 8.6), walnutParquetMat);
  perfumeWallBack.position.set(410.42, FLOOR2_Y + 1.7, 4.8);
  staticGroup.add(perfumeWallBack);

  const flaconColors = [0xf59e0b, 0xfb7185, 0x34d399, 0xfbbf24, 0xc084fc, 0x38bdf8];
  [FLOOR2_Y + 1.15, FLOOR2_Y + 1.95, FLOOR2_Y + 2.72].forEach((sy, sIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 8.0), gildedGoldMat);
    shelf.position.set(410.12, sy - 0.14, 4.8);
    staticGroup.add(shelf);

    for (let b = 0; b < 8; b++) {
      const bz = 1.3 + b * 0.98;
      const flaconMat = new THREE.MeshStandardMaterial({
        color: flaconColors[(b + sIdx) % flaconColors.length],
        emissive: flaconColors[(b + sIdx) % flaconColors.length],
        emissiveIntensity: 0.72,
        roughness: 0.16,
      });
      neonMats.push(flaconMat);
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.28, 12), flaconMat);
      bottle.position.set(410.12, sy + 0.02, bz);
      staticGroup.add(bottle);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 10), darkBronzeMat);
      cap.position.set(410.12, sy + 0.19, bz);
      staticGroup.add(cap);
    }
  });

  // Central Fragrance Consultation Bar Island (X = 404.55, Z = 4.8)
  const parfumIsland = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.02, 3.1), travertinePlinthMat);
  parfumIsland.position.set(404.55, FLOOR2_Y + 0.51, 4.8);
  staticGroup.add(parfumIsland);
  const parfumIslandTop = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 3.18), gildedGoldMat);
  parfumIslandTop.position.set(404.55, FLOOR2_Y + 1.04, 4.8);
  staticGroup.add(parfumIslandTop);
  for (let i = 0; i < 3; i++) {
    const pz = 3.8 + i * 1.0;
    const tester = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10), roseGoldMat);
    tester.position.set(404.55, FLOOR2_Y + 1.18, pz);
    staticGroup.add(tester);
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.68, 12), creamBoucleMat);
    stool.position.set(403.35, FLOOR2_Y + 0.34, pz);
    staticGroup.add(stool);
  }

  // Haute Horlogerie Watch Vitrine (X = 404.55, Z = 0.25)
  const watchPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.02, 1.4), darkBronzeMat);
  watchPedestal.position.set(404.55, FLOOR2_Y + 0.51, 0.25);
  staticGroup.add(watchPedestal);
  const watchCaseGlass = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.54, 1.32), clearGlassMat);
  watchCaseGlass.position.set(404.55, FLOOR2_Y + 1.29, 0.25);
  watchCaseGlass.userData.noMerge = true;
  staticGroup.add(watchCaseGlass);
  const watchCapGold = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.05, 1.38), gildedGoldMat);
  watchCapGold.position.set(404.55, FLOOR2_Y + 1.56, 0.25);
  staticGroup.add(watchCapGold);

  // -------------------------------------------------------------------------
  // 7.3 FLOOR 3 INTERIOR (Y = 8.32m — LE CAFÉ LOUIS VUITTON & VIP ART PENTHOUSE)
  // -------------------------------------------------------------------------
  const cafeSignTex = createLuxurySignTex('LE CAFÉ LOUIS VUITTON', 'PATISSERIE • CHAMPAGNE • ART LOUNGE');
  const cafeSignMat = new THREE.MeshStandardMaterial({
    map: cafeSignTex,
    emissive: 0xffe4b5,
    emissiveMap: cafeSignTex,
    emissiveIntensity: 0.72,
    roughness: 0.28,
  });
  neonMats.push(cafeSignMat);
  const cafeSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.45), cafeSignMat);
  cafeSignPlane.position.set(395.2, FLOOR3_Y + 2.45, -11.35);
  cafeSignPlane.userData.noMerge = true;
  staticGroup.add(cafeSignPlane);

  // 7.3a North Le Café Counter, Illuminated Pastry Vitrine & Espresso Bar (X = 390.4..399.4, Z = -9.6..-6.5)
  const cafeCounter = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.06, 1.15), flutedLimestoneMat);
  cafeCounter.position.set(395.0, FLOOR3_Y + 0.53, -7.2);
  staticGroup.add(cafeCounter);
  const cafeCounterTop = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.07, 1.24), gildedGoldMat);
  cafeCounterTop.position.set(395.0, FLOOR3_Y + 1.08, -7.2);
  staticGroup.add(cafeCounterTop);

  // Glass Pastry Vitrine with Colorful Macarons & Gateaux
  const pastryVitrine = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.58, 0.85), clearGlassMat);
  pastryVitrine.position.set(392.8, FLOOR3_Y + 1.39, -7.2);
  pastryVitrine.userData.noMerge = true;
  staticGroup.add(pastryVitrine);
  const macaronColors = [0xf472b6, 0xfbbf24, 0x34d399, 0xfef3c7, 0x92400e];
  for (let p = 0; p < 8; p++) {
    const px = 391.5 + p * 0.36;
    const pastryMat = new THREE.MeshStandardMaterial({
      color: macaronColors[p % macaronColors.length],
      emissive: macaronColors[p % macaronColors.length],
      emissiveIntensity: 0.25,
      roughness: 0.45,
    });
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.14, 10), pastryMat);
    cake.position.set(px, FLOOR3_Y + 1.22, -7.2);
    staticGroup.add(cake);
  }

  // Brass Dual Espresso Machine
  const espressoMachine = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 0.62), gildedGoldMat);
  espressoMachine.position.set(397.4, FLOOR3_Y + 1.39, -7.2);
  staticGroup.add(espressoMachine);

  // Backlit Bar Shelving against North Wall (Z = -10.5)
  const backBarUnit = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.0, 0.72), walnutParquetMat);
  backBarUnit.position.set(395.0, FLOOR3_Y + 0.5, -10.3);
  staticGroup.add(backBarUnit);

  // 4 Champagne Barstools along Café Counter
  for (let bs = 0; bs < 4; bs++) {
    const bx = 392.0 + bs * 1.95;
    const stoolStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.20, 0.68, 10), gildedGoldMat);
    stoolStem.position.set(bx, FLOOR3_Y + 0.34, -6.15);
    staticGroup.add(stoolStem);
    const stoolPad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14), creamBoucleMat);
    stoolPad.position.set(bx, FLOOR3_Y + 0.72, -6.15);
    staticGroup.add(stoolPad);
  }

  // 7.3b West Panoramic Bistro Dining Tables & Indoor Olive Trees (X = 388.9..392.3, Z = -4.2..8.2)
  [-2.6, 1.1, 4.8].forEach((tz) => {
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 20), marbleFloorMat);
    tableTop.position.set(390.65, FLOOR3_Y + 0.74, tz);
    staticGroup.add(tableTop);
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.28, 0.72, 12), gildedGoldMat);
    tableLeg.position.set(390.65, FLOOR3_Y + 0.36, tz);
    staticGroup.add(tableLeg);

    const bistroLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.22, 10), warmSoffitGlowMat);
    bistroLamp.position.set(390.65, FLOOR3_Y + 0.88, tz);
    staticGroup.add(bistroLamp);

    const banquette = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.88, 1.65), emeraldVelvetMat);
    banquette.position.set(389.35, FLOOR3_Y + 0.44, tz);
    staticGroup.add(banquette);
  });

  // Sculpted Indoor Ficus / Olive Trees in Travertine Planters on Floor 3
  [
    [389.6, -5.2],
    [389.6, 8.9],
  ].forEach(([tx, tz]) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.36, 0.68, 14), travertinePlinthMat);
    pot.position.set(tx, FLOOR3_Y + 0.34, tz);
    staticGroup.add(pot);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.5, 8), walnutParquetMat);
    trunk.position.set(tx, FLOOR3_Y + 1.35, tz);
    staticGroup.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.78, 10, 8), leafMat2);
    crown.position.set(tx, FLOOR3_Y + 2.35, tz);
    crown.scale.set(1.1, 0.9, 1.1);
    staticGroup.add(crown);
  });

  // 7.3c SE VIP Art & Collector Reading Lounge (X = 402.8..409.6, Z = 1.4..9.2)
  const artLoungeRug = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.025, 7.2), creamBoucleMat);
  artLoungeRug.position.set(406.4, FLOOR3_Y + 0.015, 5.4);
  staticGroup.add(artLoungeRug);

  // Walnut Art Feature Wall & 3 Illuminated Framed Paintings along East Wall (X = 410.35)
  const artWallPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.3, 7.8), walnutParquetMat);
  artWallPanel.position.set(410.42, FLOOR3_Y + 1.65, 5.4);
  staticGroup.add(artWallPanel);

  [2.7, 5.4, 8.1].forEach((az, idx) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.72, 1.36), gildedGoldMat);
    frame.position.set(410.28, FLOOR3_Y + 2.05, az);
    staticGroup.add(frame);

    const artTex = createGalleryArtworkTex(idx);
    const artMat = new THREE.MeshStandardMaterial({
      map: artTex,
      emissive: 0xffe4c4,
      emissiveMap: artTex,
      emissiveIntensity: 0.32,
      roughness: 0.42,
    });
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 1.58), artMat);
    canvas.rotation.y = -Math.PI * 0.5;
    canvas.position.set(410.22, FLOOR3_Y + 2.05, az);
    canvas.userData.noMerge = true;
    staticGroup.add(canvas);
  });

  const l3Sofa = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.48, 4.4), creamBoucleMat);
  l3Sofa.position.set(407.8, FLOOR3_Y + 0.24, 5.4);
  staticGroup.add(l3Sofa);
  const l3SofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 4.4), creamBoucleMat);
  l3SofaBack.position.set(408.28, FLOOR3_Y + 0.68, 5.4);
  staticGroup.add(l3SofaBack);

  const l3Table = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.40, 2.4), travertinePlinthMat);
  l3Table.position.set(405.5, FLOOR3_Y + 0.20, 5.4);
  staticGroup.add(l3Table);

  // =========================================================================
  // 8. ARCHITECTURAL LIGHTING & GROUND POOLS (SCALED WITH LAMP FACTOR)
  // =========================================================================
  const poolTexCanvas = document.createElement('canvas');
  poolTexCanvas.width = 256;
  poolTexCanvas.height = 256;
  const pCtx = poolTexCanvas.getContext('2d')!;
  const pGrad = pCtx.createRadialGradient(128, 128, 10, 128, 128, 124);
  pGrad.addColorStop(0, 'rgba(255, 224, 168, 0.72)');
  pGrad.addColorStop(0.55, 'rgba(245, 180, 88, 0.28)');
  pGrad.addColorStop(1, 'rgba(245, 180, 88, 0.0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 256, 256);
  const poolTex = new THREE.CanvasTexture(poolTexCanvas);
  poolTex.colorSpace = THREE.SRGBColorSpace;

  const plazaPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  poolMats.push(plazaPoolMat);

  const southPool = new THREE.Mesh(new THREE.PlaneGeometry(16.0, 9.0), plazaPoolMat);
  southPool.rotation.x = -Math.PI * 0.5;
  southPool.position.set(397.0, 0.03, 14.8);
  southPool.userData.noMerge = true;
  staticGroup.add(southPool);

  const westPool = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 14.0), plazaPoolMat);
  westPool.rotation.x = -Math.PI * 0.5;
  westPool.position.set(383.8, 0.03, 0.7);
  westPool.userData.noMerge = true;
  staticGroup.add(westPool);

  let currentClosedFactor = 0;
  const addLvLight = (
    x: number,
    y: number,
    z: number,
    color: number,
    dayInt: number,
    nightInt: number,
    dist: number,
    dimWhenClosed = false
  ) => {
    const light = new THREE.PointLight(color, dayInt, dist, 1.4);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => (dimWhenClosed ? 1.0 - currentClosedFactor * 0.72 : 1.0),
    });
  };

  // Warm gold facade spotlights + Portals + Floor 1, Floor 2 & Floor 3 interior illumination
  addLvLight(393.0, 6.0, 15.2, 0xffe0a8, 0.50, 2.8, 26, false);
  addLvLight(384.6, 5.0, 4.0, 0xffe0a8, 0.45, 2.6, 24, false);
  addLvLight(397.0, 3.2, 13.8, 0xffe4b8, 0.60, 2.3, 18, false);
  // Floor 1
  addLvLight(397.0, 3.6, 3.0, 0xfff0d6, 0.90, 2.3, 19, true);
  addLvLight(397.0, 3.6, -5.5, 0xfff0d6, 0.85, 2.2, 19, true);
  // Floor 2 (Couture + Perfume Library + Atrium Glow)
  addLvLight(394.5, 7.6, 2.5, 0xfff0d6, 0.95, 2.4, 21, true);
  addLvLight(405.0, 7.6, 4.5, 0xffdfb3, 0.85, 2.2, 19, true);
  // Floor 3 (Le Café + Art Lounge + Chandelier Crown)
  addLvLight(395.0, 11.4, -3.5, 0xfff0d6, 0.95, 2.5, 21, true);
  addLvLight(403.0, 11.4, 5.5, 0xffdfb3, 0.88, 2.2, 19, true);

  // =========================================================================
  // 9. DYNAMIC UPDATE LOOP (DUAL SHUTTERS + INDEPENDENT BI-PARTING DOORS)
  // =========================================================================
  let southDoorOpen = 0;
  let westDoorOpen = 0;
  let shutterFactor = 0;

  const update = (
    delta: number,
    rawHour: number,
    _lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: LouisVuittonNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isLouisVuittonOpenAtHour(rawHour);

    const targetClosed = isOpen ? 0 : 1;
    shutterFactor = THREE.MathUtils.lerp(shutterFactor, targetClosed, Math.min(1, dt * 3.0));
    currentClosedFactor = shutterFactor;
    setShutterProgress(southShutter, shutterFactor);
    setShutterProgress(westShutter, shutterFactor);

    let wantSouthOpen = false;
    let wantWestOpen = false;
    if (isOpen && shutterFactor < 0.35) {
      if (playerPos) {
        if (Math.hypot(playerPos.x - SOUTH_DOOR_X, playerPos.z - SOUTH_DOOR_Z) <= 4.8) {
          wantSouthOpen = true;
        }
        if (Math.hypot(playerPos.x - WEST_DOOR_X, playerPos.z - WEST_DOOR_Z) <= 4.8) {
          wantWestOpen = true;
        }
      }
      if (!wantSouthOpen && npcController?.hasNpcNearDoor('south')) wantSouthOpen = true;
      if (!wantWestOpen && npcController?.hasNpcNearDoor('west')) wantWestOpen = true;
    }

    southDoorOpen = THREE.MathUtils.lerp(southDoorOpen, wantSouthOpen ? 1 : 0, Math.min(1, dt * 5.2));
    const southOffset = southDoorOpen * 1.42;
    southLeftLeaf.position.x = southLeftClosedX - southOffset;
    southRightLeaf.position.x = southRightClosedX + southOffset;

    westDoorOpen = THREE.MathUtils.lerp(westDoorOpen, wantWestOpen ? 1 : 0, Math.min(1, dt * 5.2));
    const westOffset = westDoorOpen * 1.42;
    westNorthLeaf.position.z = westNorthClosedZ - westOffset;
    westSouthLeaf.position.z = westSouthClosedZ + westOffset;
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => currentClosedFactor,
    update,
  };
}

// =========================================================================
// LOUIS VUITTON BOUTIQUE NPC CONTROLLER (2 CLIENT ADVISORS + 6 VIP SHOPPERS)
// =========================================================================

type LvNpcKind = 'advisor' | 'shopper';
type LvPhase = 'browse' | 'admire' | 'walk_leave' | 'respawn_wait';

interface LvActor {
  id: number;
  kind: LvNpcKind;
  root: THREE.Group;
  headMesh: THREE.Mesh;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  toteBag: THREE.Group;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: LvPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  targetYaw: number;
  stateTimer: number;
  walkPhase: number;
  walkPhaseRef: { phase: number };
  speed: number;
  seed: number;
  exiting: boolean;
  exitDone: boolean;
  exitRef: { idx: number };
  exitWaypoints: THREE.Vector3[] | null;
  glbHandle: GlbHumanHandle;
}

const SHOPPER_SPOTS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [393.8, PODIUM_Y, 3.4], yaw: Math.PI * 0.5 },
  { pos: [391.2, PODIUM_Y, -5.0], yaw: -Math.PI * 0.5 },
  { pos: [391.2, PODIUM_Y, 6.2], yaw: -Math.PI * 0.5 },
  { pos: [397.0, PODIUM_Y, -0.8], yaw: Math.PI },
  { pos: [407.6, PODIUM_Y, -2.5], yaw: Math.PI * 0.5 },
  { pos: [403.5, PODIUM_Y, 6.8], yaw: Math.PI * 0.35 },
  { pos: [396.2, PODIUM_Y, -8.2], yaw: Math.PI },
];

export class LouisVuittonNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: LvActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.name = 'LouisVuittonNpcGroup';

    const advisorSpecs: { x: number; y: number; z: number; yaw: number }[] = [
      // Floor 1 Advisors
      { x: 397.0, y: PODIUM_Y, z: -10.65, yaw: 0 },
      { x: 401.2, y: PODIUM_Y, z: 0.6, yaw: -Math.PI * 0.4 },
      // Floor 2 Fragrance & Couture Advisors
      { x: 405.8, y: PODIUM_Y + LV_FLOOR_H, z: 4.8, yaw: -Math.PI * 0.5 },
      { x: 393.4, y: PODIUM_Y + LV_FLOOR_H, z: -4.2, yaw: -Math.PI * 0.3 },
      { x: 401.4, y: PODIUM_Y + LV_FLOOR_H, z: 6.4, yaw: Math.PI * 0.65 },
      // Floor 3 Le Café Barista & Lounge Guests
      { x: 394.8, y: PODIUM_Y + LV_FLOOR_H * 2, z: -8.6, yaw: 0 },
      { x: 392.8, y: PODIUM_Y + LV_FLOOR_H * 2, z: 1.1, yaw: -Math.PI * 0.5 },
      { x: 404.2, y: PODIUM_Y + LV_FLOOR_H * 2, z: 3.4, yaw: Math.PI * 0.4 },
    ];
    advisorSpecs.forEach((sp, idx) => {
      this.actors.push(
        this.spawnActor(idx, 'advisor', helpers, new THREE.Vector3(sp.x, sp.y, sp.z), sp.yaw)
      );
    });

    for (let i = 0; i < 6; i++) {
      const spot = SHOPPER_SPOTS[i % SHOPPER_SPOTS.length];
      this.actors.push(
        this.spawnActor(
          10 + i,
          'shopper',
          helpers,
          new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]),
          spot.yaw
        )
      );
    }
  }

  private spawnActor(
    id: number,
    kind: LvNpcKind,
    helpers: HospitalCharacterHelpers,
    homePos: THREE.Vector3,
    homeYaw: number
  ): LvActor {
    const root = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    root.add(fallbackGroup);
    root.position.copy(homePos);
    root.rotation.y = homeYaw;

    const paletteShirt = [0x171717, 0xf5f5f4, 0x451a03, 0x1e293b, 0x7c2d12, 0xd6cfc7];
    const palettePants = [0x111827, 0x292524, 0x3f3f46, 0xe7e5e4];
    const isAdvisor = kind === 'advisor';
    const shirtColor = isAdvisor ? 0x111827 : paletteShirt[id % paletteShirt.length];
    const pantsColor = isAdvisor ? 0x0f172a : palettePants[id % palettePants.length];
    const skinHex = ['#f3d2b3', '#e8be94', '#f1c7a4'][id % 3];

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.78 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.45 });
    const goldLapelMat = new THREE.MeshStandardMaterial({ color: 0xd8a84e, metalness: 0.8, roughness: 0.25 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: id % 2 === 0 ? 0x18181b : 0x3f2718, roughness: 0.78 });

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.12, 0.74, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.70, 0.22), pantsMat);
    leftLegMesh.position.y = -0.35;
    leftLeg.add(leftLegMesh);
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.10, 0.28), shoeMat);
    shoeL.position.set(0, -0.69, 0.03);
    leftLeg.add(shoeL);
    fallbackGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.12, 0.74, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.70, 0.22), pantsMat);
    rightLegMesh.position.y = -0.35;
    rightLeg.add(rightLegMesh);
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.10, 0.28), shoeMat);
    shoeR.position.set(0, -0.69, 0.03);
    rightLeg.add(shoeR);
    fallbackGroup.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.64, 0.26), shirtMat);
    torso.position.y = 1.06;
    fallbackGroup.add(torso);

    if (isAdvisor) {
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.02), goldLapelMat);
      badge.position.set(0.12, 0.14, 0.14);
      torso.add(badge);
    }

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.33, 1.34, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.56, 0.16), shirtMat);
    leftArmMesh.position.y = -0.27;
    leftArm.add(leftArmMesh);
    fallbackGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.33, 1.34, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.56, 0.16), shirtMat);
    rightArmMesh.position.y = -0.27;
    rightArm.add(rightArmMesh);
    fallbackGroup.add(rightArm);

    const toteBag = new THREE.Group();
    const bagMat = new THREE.MeshStandardMaterial({ color: 0xea7a22, roughness: 0.52 });
    const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.28), bagMat);
    bagMesh.position.set(0.02, -0.58, 0.04);
    toteBag.add(bagMesh);
    toteBag.visible = false;
    rightArm.add(toteBag);

    const headTex = helpers.createFaceTexture(id % 2 === 0 ? 'happy' : 'neutral', skinHex);
    const headMesh = helpers.createHeadMesh(skinMat, headTex, 0.34, 0.34, 0.34);
    headMesh.position.y = 1.56;
    fallbackGroup.add(headMesh);

    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.36), hairMat);
    hairCap.position.y = 0.16;
    headMesh.add(hairCap);

    const spec = isAdvisor
      ? id === 0
        ? CASHIER_NPC_MODEL
        : pickStationaryCivilianModel(id + 107)
      : pickShopCustomerModel(id + 109);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: root,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: isAdvisor && id === 0 ? 'Checkout' : 'Idle',
      phaseOffset: id * 0.57,
    });

    this.rootGroup.add(root);

    return {
      id,
      kind,
      root,
      headMesh,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      toteBag,
      homePos: homePos.clone(),
      homeYaw,
      phase: 'admire',
      pathQueue: [],
      pathIdx: 0,
      targetYaw: homeYaw,
      stateTimer: 5.0 + (id % 5) * 3.0,
      walkPhase: id * 1.1,
      walkPhaseRef: { phase: id * 1.1 },
      speed: 1.38 + (id % 3) * 0.12,
      seed: id * 1.47,
      exiting: false,
      exitDone: false,
      exitRef: { idx: 0 },
      exitWaypoints: null,
      glbHandle,
    };
  }

  private assignNewSpot(a: LvActor, spawnOutside = false) {
    const spot = SHOPPER_SPOTS[(a.id + Math.floor(this.timer * 0.5)) % SHOPPER_SPOTS.length];
    const targetPos = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]);

    if (spawnOutside) {
      const useWest = a.id % 2 === 0;
      a.toteBag.visible = false;
      if (useWest) {
        a.root.position.set(381.4, 0.02, 0.7);
        a.pathQueue = [
          new THREE.Vector3(384.0, 0.04, WEST_DOOR_Z),
          new THREE.Vector3(WEST_DOOR_X, PODIUM_Y, WEST_DOOR_Z),
          new THREE.Vector3(393.0, PODIUM_Y, WEST_DOOR_Z),
          targetPos,
        ];
      } else {
        a.root.position.set(SOUTH_DOOR_X, 0.02, 17.5);
        a.pathQueue = [
          new THREE.Vector3(SOUTH_DOOR_X, 0.05, 15.6),
          new THREE.Vector3(SOUTH_DOOR_X, PODIUM_Y, 13.0),
          new THREE.Vector3(SOUTH_DOOR_X, PODIUM_Y, 8.2),
          targetPos,
        ];
      }
    } else {
      a.pathQueue = [new THREE.Vector3(394.6, PODIUM_Y, 0.7), targetPos];
    }
    a.pathIdx = 0;
    a.targetYaw = spot.yaw;
    a.phase = 'browse';
  }

  private snapClosed() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.root.visible = false;
      a.exiting = false;
      a.exitDone = true;
    }
  }

  private reopen() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = false;
      a.exitDone = false;
      a.exitRef.idx = 0;
      a.leftLeg.rotation.x = 0;
      a.rightLeg.rotation.x = 0;
      a.leftArm.rotation.x = 0;
      a.rightArm.rotation.x = 0;
      a.toteBag.visible = false;
      a.root.position.copy(a.homePos);
      a.root.rotation.y = a.homeYaw;
      a.root.visible = true;
      a.phase = 'admire';
      a.stateTimer = 4.0 + (a.id % 5) * 3.2;
      a.glbHandle.setAnimState(a.kind === 'advisor' && a.id === 0 ? 'Checkout' : 'Idle');
    }
  }

  private beginClosing() {
    this.closingActive = true;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = true;
      a.exitRef.idx = 0;
      if (!a.root.visible || a.homePos.y > PODIUM_Y + 0.5) {
        a.root.visible = false;
        a.exitDone = true;
        a.glbHandle.setAnimState('Idle');
        continue;
      }
      a.exitDone = false;
      a.glbHandle.setAnimState('Walk');
      if (a.id % 2 === 0) {
        a.exitWaypoints = [
          new THREE.Vector3(393.0, PODIUM_Y, WEST_DOOR_Z),
          new THREE.Vector3(WEST_DOOR_X, PODIUM_Y, WEST_DOOR_Z),
          new THREE.Vector3(384.0, 0.04, WEST_DOOR_Z),
          new THREE.Vector3(381.4, 0.02, 5.5),
        ];
      } else {
        a.exitWaypoints = [
          new THREE.Vector3(SOUTH_DOOR_X, PODIUM_Y, 9.2),
          new THREE.Vector3(SOUTH_DOOR_X, PODIUM_Y, 13.0),
          new THREE.Vector3(SOUTH_DOOR_X, 0.04, 15.6),
          new THREE.Vector3(404.5, 0.02, 17.5),
        ];
      }
    }
  }

  public hasNpcNearDoor(side: 'south' | 'west'): boolean {
    if (this.fullyClosedAndEmpty) return false;
    const dxCenter = side === 'south' ? SOUTH_DOOR_X : WEST_DOOR_X;
    const dzCenter = side === 'south' ? SOUTH_DOOR_Z : WEST_DOOR_Z;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - dxCenter, p.z - dzCenter) <= 3.6) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: LvActor, dt: number): boolean {
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

    a.walkPhase += dt * 5.6;
    const swing = Math.sin(a.walkPhase) * 0.36;
    a.leftLeg.rotation.x = swing;
    a.rightLeg.rotation.x = -swing;
    a.leftArm.rotation.x = -swing * 0.5;
    a.rightArm.rotation.x = swing * 0.5;
    return false;
  }

  public update(delta: number, rawHour = 10.0) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    const isOpen = isLouisVuittonOpenAtHour(rawHour);
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
        a.glbHandle.setAnimState('Walk');
        const exitPts = a.exitWaypoints ?? [
          new THREE.Vector3(SOUTH_DOOR_X, PODIUM_Y, 13.0),
          new THREE.Vector3(SOUTH_DOOR_X, 0.04, 15.6),
          new THREE.Vector3(381.4, 0.02, 17.5),
        ];
        const done = advanceNpcExitPath(
          a.root,
          exitPts,
          a.exitRef,
          1.45,
          dt,
          { legL: a.leftLeg, legR: a.rightLeg, armL: a.leftArm, armR: a.rightArm },
          a.walkPhaseRef
        );
        if (done) {
          a.exitDone = true;
          a.root.visible = false;
          a.glbHandle.setAnimState('Idle');
        }
        continue;
      }

      if (a.kind === 'advisor') {
        a.root.visible = true;
        a.glbHandle.setAnimState(a.id === 0 ? 'Checkout' : 'Idle');
        a.headMesh.rotation.y = Math.sin(this.timer * 1.15 + a.seed) * 0.24;
        a.rightArm.rotation.x = -0.18 + Math.sin(this.timer * 1.4 + a.seed) * 0.08;
        continue;
      }

      if (a.phase === 'respawn_wait') {
        a.root.visible = false;
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          this.assignNewSpot(a, true);
          a.glbHandle.setAnimState('Walk');
        }
        continue;
      }

      a.root.visible = true;
      if (a.phase === 'browse') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'admire';
          a.stateTimer = 7.0 + ((a.id * 3) % 7);
          a.glbHandle.setAnimState('Idle');
        }
      } else if (a.phase === 'admire') {
        a.glbHandle.setAnimState('Idle');
        let diff = a.targetYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 6.5);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.leftArm.rotation.x = THREE.MathUtils.lerp(a.leftArm.rotation.x, 0, Math.min(1, dt * 10));
        a.rightArm.rotation.x = THREE.MathUtils.lerp(a.rightArm.rotation.x, -0.15, Math.min(1, dt * 8));
        a.headMesh.rotation.y = Math.sin(this.timer * 1.2 + a.seed) * 0.22;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          if ((a.id + Math.floor(this.timer)) % 3 === 0) {
            a.toteBag.visible = true;
            if (a.id % 2 === 0) {
              a.pathQueue = [
                new THREE.Vector3(393.0, PODIUM_Y, WEST_DOOR_Z),
                new THREE.Vector3(WEST_DOOR_X, PODIUM_Y, WEST_DOOR_Z),
                new THREE.Vector3(384.0, 0.04, WEST_DOOR_Z),
                new THREE.Vector3(381.4, 0.02, 5.5),
              ];
            } else {
              a.pathQueue = [
                new THREE.Vector3(SOUTH_DOOR_X, PODIUM_Y, 9.2),
                new THREE.Vector3(SOUTH_DOOR_X, PODIUM_Y, 13.0),
                new THREE.Vector3(SOUTH_DOOR_X, 0.04, 15.6),
                new THREE.Vector3(404.5, 0.02, 17.5),
              ];
            }
            a.pathIdx = 0;
            a.phase = 'walk_leave';
            a.glbHandle.setAnimState('Walk');
          } else {
            this.assignNewSpot(a, false);
            a.glbHandle.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.root.visible = false;
          a.toteBag.visible = false;
          a.phase = 'respawn_wait';
          a.stateTimer = 2.0 + (a.id % 3) * 1.2;
          a.glbHandle.setAnimState('Idle');
        }
      }
    }

    if (this.closingActive && allCleared) {
      this.fullyClosedAndEmpty = true;
    }
  }
}
