import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isKatinatOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface KatinatCafeBuildResult {
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
    npcController?: KatinatNpcController | null
  ) => void;
}

// =========================================================================
// KATINAT COFFEE & TEA HOUSE — ĐƯỜNG SƠN TÂY NAM (NGAY CẠNH DESERT)
// Footprint: X = 328.4 .. 356.5 (28.1m deep), Z = 69.0 .. 95.0 (26.0m wide)
//   - Facing East (+X) onto Đường Sơn Tây Nam Sidewalk (X = 356.5..361.8)
//   - 1.5m architectural setback North from DESERT (Z = 42.5..67.5)
//   - Front Stone Apron: X = 353.8 .. 356.6 (Y = 0.02)
//   - Covered Colonnade Veranda: X = 349.6 .. 353.8 (Y = 0.08 podium)
//   - Main French Storefront Glass Line: X = 349.6
//   - Central French Double Glass Doorway: X = 349.6, Z = 80.2 .. 83.8 (3.6m wide)
//   - Walkable Café Interior Hall: X = 328.4 .. 349.6, Z = 69.4 .. 94.6
// =========================================================================

export const KATINAT_PODIUM_Y = 0.08;

const MIN_X = 328.4;
const STORE_GLASS_X = 349.6;
const FACADE_X = 353.8;
const MIN_Z = 69.0;
const MAX_Z = 95.0;
const MID_Z = (MIN_Z + MAX_Z) * 0.5; // 82.0
const DOOR_HALF_W = 1.8; // Aperture Z = 80.2 .. 83.8

export const KATINAT_COLLIDERS: IntersectionColliderBox[] = [
  // Solid Perimeter Structural Walls (West Back, North Side, South Side extending cleanly to veranda piers)
  { minX: 328.1, maxX: 329.0, minZ: 68.9, maxZ: 95.1, floor: 1 }, // West Rear Wall
  { minX: 328.2, maxX: 353.8, minZ: 68.8, maxZ: 69.6, floor: 1 }, // North Wall
  { minX: 328.2, maxX: 353.8, minZ: 94.4, maxZ: 95.2, floor: 1 }, // South Wall

  // Front Multi-Pane French Storefront Glass (carving out central 3.6m entrance Z = 80.2 .. 83.8)
  { minX: 349.25, maxX: 349.95, minZ: 69.0, maxZ: 80.2, floor: 1 }, // North Storefront Wing
  { minX: 349.25, maxX: 349.95, minZ: 83.8, maxZ: 95.0, floor: 1 }, // South Storefront Wing

  // 6 Veranda Colonnade Piers (X = 353.38)
  { minX: 353.0, maxX: 353.78, minZ: 69.15, maxZ: 69.95, floor: 1 },
  { minX: 353.0, maxX: 353.78, minZ: 74.1, maxZ: 74.9, floor: 1 },
  { minX: 353.0, maxX: 353.78, minZ: 79.05, maxZ: 79.85, floor: 1 },
  { minX: 353.0, maxX: 353.78, minZ: 84.15, maxZ: 84.95, floor: 1 },
  { minX: 353.0, maxX: 353.78, minZ: 89.1, maxZ: 89.9, floor: 1 },
  { minX: 353.0, maxX: 353.78, minZ: 94.05, maxZ: 94.85, floor: 1 },

  // Veranda Patio Café Tables & Planters (leaves center walkway Z = 79.8..84.2 & veranda aisle open)
  { minX: 350.6, maxX: 352.4, minZ: 71.0, maxZ: 73.2, floor: 1 }, // North Bay Patio Table 1
  { minX: 350.6, maxX: 352.4, minZ: 75.7, maxZ: 77.9, floor: 1 }, // North Bay Patio Table 2
  { minX: 350.6, maxX: 352.4, minZ: 86.1, maxZ: 88.3, floor: 1 }, // South Bay Patio Table 3
  { minX: 350.6, maxX: 352.4, minZ: 90.8, maxZ: 93.0, floor: 1 }, // South Bay Patio Table 4
  { minX: 352.3, maxX: 353.0, minZ: 79.15, maxZ: 79.95, floor: 1 }, // North Entrance Planter
  { minX: 352.3, maxX: 353.0, minZ: 84.05, maxZ: 84.85, floor: 1 }, // South Entrance Planter

  // Parked Scooters Bay on South Outer Apron Edge (clear of central sidewalk/entrance)
  { minX: 354.1, maxX: 355.8, minZ: 90.0, maxZ: 94.4, floor: 1 },

  // Indoor Barista & Pastry Counter + Back Espresso Credenza + Flanking Arched Retail Alcoves (West Wall)
  { minX: 332.6, maxX: 335.6, minZ: 76.2, maxZ: 87.8, floor: 1 }, // Main Service Counter & Pastry Showcase
  { minX: 328.9, maxX: 330.6, minZ: 76.2, maxZ: 87.8, floor: 1 }, // Back-Bar Credenza & Syrup Wall
  { minX: 328.8, maxX: 330.4, minZ: 70.8, maxZ: 76.1, floor: 1 }, // North Retail Merch Alcove
  { minX: 328.8, maxX: 330.4, minZ: 87.9, maxZ: 93.2, floor: 1 }, // South Retail Merch Alcove

  // North Interior Café Lounge (Tufted Banquette Sofa + Bistro Tables)
  { minX: 331.0, maxX: 347.2, minZ: 69.6, maxZ: 71.6, floor: 1 }, // North Wall Velvet Banquette
  { minX: 337.1, maxX: 339.3, minZ: 72.5, maxZ: 74.7, floor: 1 }, // North Bistro Table 1
  { minX: 342.5, maxX: 344.7, minZ: 72.5, maxZ: 74.7, floor: 1 }, // North Bistro Table 2

  // South Interior Café Lounge (Tufted Banquette Sofa + Bistro Tables)
  { minX: 331.0, maxX: 347.2, minZ: 92.4, maxZ: 94.4, floor: 1 }, // South Wall Velvet Banquette
  { minX: 337.1, maxX: 339.3, minZ: 89.3, maxZ: 91.5, floor: 1 }, // South Bistro Table 1
  { minX: 342.5, maxX: 344.7, minZ: 89.3, maxZ: 91.5, floor: 1 }, // South Bistro Table 2

  // Front Flanking Window Lounge Tables + Corner Tree + Self-Serve Condiment Station (leaving central 4.8m corridor Z=79.6..84.4 open)
  { minX: 345.7, maxX: 348.0, minZ: 76.1, maxZ: 78.3, floor: 1 }, // NE Window Table
  { minX: 345.7, maxX: 348.0, minZ: 85.7, maxZ: 87.9, floor: 1 }, // SE Window Table
  { minX: 347.2, maxX: 348.8, minZ: 70.6, maxZ: 72.1, floor: 1 }, // NE Corner Olive Tree
  { minX: 347.2, maxX: 348.9, minZ: 90.2, maxZ: 93.8, floor: 1 }, // SE Corner Planter & Condiment Station
];

export interface KatinatPlacementConfig {
  /** World X where KATINAT front apron center (orig X=356.5, Z=82.0) is anchored */
  anchorX: number;
  /** World Z where KATINAT front apron center (orig X=356.5, Z=82.0) is anchored */
  anchorZ: number;
  /** Y-axis rotation in radians (0 = faces +X; +Math.PI/2 = faces -Z North) */
  rotationY: number;
  /** Optional NPC catalog seed offset so branch patrons/staff look distinct */
  seedOffset?: number;
}

const KATINAT_ORIG_ANCHOR_X = 356.5;
const KATINAT_ORIG_ANCHOR_Z = MID_Z; // 82.0

/**
 * KATINAT Coffee & Tea House — Chi nhánh Đường Bạch Đằng (ngay bên cạnh THE GANG):
 * - Footprint: X = 119.8 .. 145.8 (26.0m wide, 1.2m architectural setback West of THE GANG X = 147.0)
 * - Depth:     Z = -104.0 .. -75.9 (28.1m deep, front apron flush with Đường Bạch Đằng South sidewalk Z = -104.0)
 * - Facing:    North (-Z) directly toward Sông Hàn & Đường Bạch Đằng
 * - Doorway:   X = 131.0 .. 134.6, Z = -97.1
 */
export const KATINAT_BACH_DANG_PLACEMENT: KatinatPlacementConfig = {
  anchorX: 132.8,
  anchorZ: -104.0,
  rotationY: Math.PI * 0.5,
  seedOffset: 37,
};

function transformKatinatPointXZ(
  ox: number,
  oz: number,
  placement: KatinatPlacementConfig
): { x: number; z: number } {
  const lx = ox - KATINAT_ORIG_ANCHOR_X;
  const lz = oz - KATINAT_ORIG_ANCHOR_Z;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: placement.anchorX + lx * c + lz * s,
    z: placement.anchorZ - lx * s + lz * c,
  };
}

function inverseTransformKatinatPointXZ(
  wx: number,
  wz: number,
  placement: KatinatPlacementConfig
): { x: number; z: number } {
  const dx = wx - placement.anchorX;
  const dz = wz - placement.anchorZ;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: KATINAT_ORIG_ANCHOR_X + dx * c - dz * s,
    z: KATINAT_ORIG_ANCHOR_Z + dx * s + dz * c,
  };
}

export function createTransformedKatinatColliders(
  placement: KatinatPlacementConfig
): IntersectionColliderBox[] {
  return KATINAT_COLLIDERS.map((box) => {
    const p1 = transformKatinatPointXZ(box.minX, box.minZ, placement);
    const p2 = transformKatinatPointXZ(box.maxX, box.maxZ, placement);
    const p3 = transformKatinatPointXZ(box.minX, box.maxZ, placement);
    const p4 = transformKatinatPointXZ(box.maxX, box.minZ, placement);
    return {
      minX: Math.min(p1.x, p2.x, p3.x, p4.x),
      maxX: Math.max(p1.x, p2.x, p3.x, p4.x),
      minZ: Math.min(p1.z, p2.z, p3.z, p4.z),
      maxZ: Math.max(p1.z, p2.z, p3.z, p4.z),
      floor: box.floor,
    };
  });
}

export const KATINAT_BACH_DANG_COLLIDERS: IntersectionColliderBox[] =
  createTransformedKatinatColliders(KATINAT_BACH_DANG_PLACEMENT);

// =========================================================================
// PROCEDURAL BRANDING & ARCHITECTURAL TEXTURES (KATINAT COFFEE & TEA HOUSE)
// =========================================================================

function createKatinatChampagnePanelTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#c8af7e');
  grad.addColorStop(0.5, '#cfb787');
  grad.addColorStop(1, '#c0a574');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural plaster speckle
  let seed = 109;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 4200; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,248,230,0.06)' : 'rgba(92,74,45,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Vertical architectural panel groove seams matching Photos 2 & 3
  const panels = 12;
  const step = w / panels;
  for (let i = 1; i < panels; i++) {
    const sx = Math.round(i * step);
    ctx.fillStyle = 'rgba(72, 58, 36, 0.34)';
    ctx.fillRect(sx - 2, 0, 3, h);
    ctx.fillStyle = 'rgba(255, 246, 220, 0.18)';
    ctx.fillRect(sx + 1, 0, 2, h);
  }

  // Subtle horizontal frieze seam line near top
  ctx.fillStyle = 'rgba(72, 58, 36, 0.24)';
  ctx.fillRect(0, 44, w, 3);
  ctx.fillStyle = 'rgba(255, 246, 220, 0.16)';
  ctx.fillRect(0, 47, w, 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatPatioTileTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ddd3be';
  ctx.fillRect(0, 0, s, s);

  const cells = 4;
  const cell = s / cells;
  for (let gx = 0; gx < cells; gx++) {
    for (let gy = 0; gy < cells; gy++) {
      const cx = gx * cell + cell * 0.5;
      const cy = gy * cell + cell * 0.5;
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#e5dcc8' : '#d5c9b0';
      ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);

      // Subtle classic Indochine rosette motif
      ctx.strokeStyle = 'rgba(116, 98, 72, 0.26)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.28, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(75, 85, 99, 0.22)';
      ctx.beginPath();
      ctx.moveTo(cx - cell * 0.36, cy);
      ctx.lineTo(cx + cell * 0.36, cy);
      ctx.moveTo(cx, cy - cell * 0.36);
      ctx.lineTo(cx, cy + cell * 0.36);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatWoodFloorTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#9b7349';
  ctx.fillRect(0, 0, s, s);

  const planks = 8;
  const pw = s / planks;
  const shades = ['#926a42', '#a27950', '#8b633c', '#a98157', '#966e46'];
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = shades[i % shades.length];
    ctx.fillRect(i * pw, 0, pw - 2, s);
    ctx.fillStyle = 'rgba(42, 26, 14, 0.36)';
    ctx.fillRect((i + 1) * pw - 2, 0, 2, s);
    for (let y = 0; y < s; y += 128) {
      if ((y / 128 + i) % 2 === 0) {
        ctx.fillRect(i * pw, y, pw, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatMedallionTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#faf6eb';
  ctx.fillRect(0, 0, s, s);

  const cx = s * 0.5;
  const cy = s * 0.5;

  // Outer fine gold ring & tick marks
  ctx.strokeStyle = '#9a7a44';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, 224, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#c5a467';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 206, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle heritage clock / compass tick marks around rim
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r0 = i % 2 === 0 ? 186 : 194;
    const r1 = 204;
    ctx.strokeStyle = '#8b6e3c';
    ctx.lineWidth = i % 2 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }

  // Central stylized monogram + botanical cup crown
  ctx.fillStyle = '#33414a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 56px Georgia, "Times New Roman", serif';
  ctx.fillText('KATINAT', cx, cy - 12);

  ctx.strokeStyle = '#9a7a44';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 105, cy + 28);
  ctx.lineTo(cx + 105, cy + 28);
  ctx.stroke();

  ctx.fillStyle = '#7c6238';
  ctx.font = '700 22px "Montserrat", system-ui, sans-serif';
  ctx.fillText('COFFEE & TEA HOUSE', cx, cy + 56);

  ctx.fillStyle = '#9a7a44';
  ctx.font = '700 18px Georgia, serif';
  ctx.fillText('EST. 2016', cx, cy - 72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatQuoteBeamTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#2d3740';
  ctx.fillRect(0, 0, w, h);

  // Subtle top & bottom warm metallic hairline border
  ctx.fillStyle = '#9d8252';
  ctx.fillRect(0, 0, w, 5);
  ctx.fillRect(0, h - 5, w, 5);

  ctx.fillStyle = '#f8f4ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 44px Georgia, "Times New Roman", serif';
  ctx.fillText('THE BLEND OF WIND, MOUNTAINS, SEA AND EXCITING TASTE', w * 0.5, h * 0.54);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatTransomSignTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1e1916';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b99658';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#fcf9f0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 66px Georgia, "Times New Roman", serif';
  ctx.fillText('KATINAT', w * 0.5, 68);

  ctx.fillStyle = '#e5cf9c';
  ctx.font = '700 20px "Montserrat", system-ui, sans-serif';
  ctx.fillText('COFFEE & TEA HOUSE', w * 0.5, 118);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatFeatureWallSignTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#fff9eb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 144px Georgia, "Times New Roman", serif';
  ctx.fillText('KATINAT', w * 0.5, 152);

  // Signature underline bar matching Photo 2
  ctx.fillStyle = '#f5dfb1';
  ctx.fillRect(w * 0.24, 240, w * 0.52, 16);

  ctx.fillStyle = '#f3ddb0';
  ctx.font = '700 38px "Montserrat", system-ui, sans-serif';
  ctx.fillText('COFFEE & TEA HOUSE', w * 0.5, 304);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatSubBrandRibbonTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#333d45';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d4af63';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#faf6eb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 54px "Montserrat", system-ui, sans-serif';
  ctx.fillText('COFFEE & TEA HOUSE', w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatMenuBoardTex(boardIdx: number): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#242c33';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#c5a467';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  const titles = ['SIGNATURE KATINAT', 'TRÀ & OOLONG NƯỚNG', 'CÀ PHÊ PHIN & Ý'];
  const items: Array<Array<[string, string]>> = [
    [
      ['Bơ Già Dừa Non', '59.000đ'],
      ['Trà Sữa Chôm Chôm', '55.000đ'],
      ['Hồng Trà Sữa Macchiato', '52.000đ'],
      ['Trà Đào Hồng Đài', '55.000đ'],
    ],
    [
      ['Oolong Nướng Sữa', '52.000đ'],
      ['Oolong Tứ Quý Sữa', '52.000đ'],
      ['Trà Vải Nhài Thanh Mát', '55.000đ'],
      ['Matcha Sữa Yến Mạch', '59.000đ'],
    ],
    [
      ['Cà Phê Sữa Đá Mê', '39.000đ'],
      ['Bạc Xỉu Katinat', '45.000đ'],
      ['Latte Hạnh Nhân', '55.000đ'],
      ['Cold Brew Cam Vàng', '55.000đ'],
    ],
  ];

  ctx.fillStyle = '#e7c98a';
  ctx.textAlign = 'center';
  ctx.font = '800 30px "Montserrat", system-ui, sans-serif';
  ctx.fillText(titles[boardIdx % titles.length], w * 0.5, 58);

  ctx.fillStyle = '#9a7a44';
  ctx.fillRect(46, 82, w - 92, 3);

  const rows = items[boardIdx % items.length];
  rows.forEach(([name, price], i) => {
    const ry = 136 + i * 58;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#faf6eb';
    ctx.font = '600 25px system-ui, sans-serif';
    ctx.fillText(name, 40, ry);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#e7c98a';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText(price, w - 40, ry);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(253, 230, 168, 0.42)');
  grad.addColorStop(0.5, 'rgba(245, 196, 114, 0.16)');
  grad.addColorStop(1, 'rgba(245, 196, 114, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKatinatIndochineRugTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#e7decb';
  ctx.fillRect(0, 0, w, h);

  // Outer charcoal-slate & gold Indochine carpet borders
  ctx.strokeStyle = '#333e47';
  ctx.lineWidth = 24;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.strokeStyle = '#b99658';
  ctx.lineWidth = 6;
  ctx.strokeRect(42, 42, w - 84, h - 84);
  ctx.strokeStyle = '#3e5252';
  ctx.lineWidth = 4;
  ctx.strokeRect(56, 56, w - 112, h - 112);

  // Repeating geometric Indochine encaustic tile medallions inside carpet
  const grid = 4;
  const start = 64;
  const span = (w - start * 2) / grid;
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const cx = start + (gx + 0.5) * span;
      const cy = start + (gy + 0.5) * span;
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#ede5d4' : '#ded2ba';
      ctx.fillRect(start + gx * span + 2, start + gy * span + 2, span - 4, span - 4);

      ctx.strokeStyle = 'rgba(51, 62, 71, 0.36)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, span * 0.30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(154, 122, 68, 0.35)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - span * 0.22);
      ctx.lineTo(cx + span * 0.22, cy);
      ctx.lineTo(cx, cy + span * 0.22);
      ctx.lineTo(cx - span * 0.22, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatArtPosterTex(variant: number): THREE.CanvasTexture {
  const w = 320;
  const h = 420;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const v = variant % 4;
  const bg = v === 0 ? '#efe7d6' : v === 1 ? '#29333b' : v === 2 ? '#3e5252' : '#f4ecd8';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = v === 1 || v === 2 ? '#d6b061' : '#8b6e3c';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (v === 0) {
    // Botanical Coffee Crest
    ctx.fillStyle = '#3e5252';
    ctx.beginPath();
    ctx.arc(w * 0.5, 165, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d6b061';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#faf6eb';
    ctx.font = '800 34px Georgia, serif';
    ctx.fillText('KATINAT', w * 0.5, 158);
    ctx.fillStyle = '#e7c98a';
    ctx.font = '700 13px "Montserrat", sans-serif';
    ctx.fillText('COFFEE & TEA', w * 0.5, 192);
    ctx.fillStyle = '#333e47';
    ctx.font = '700 20px Georgia, serif';
    ctx.fillText('SAIGON HERITAGE', w * 0.5, 305);
    ctx.fillStyle = '#7c6238';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('WIND • MOUNTAINS • SEA', w * 0.5, 342);
  } else if (v === 1) {
    // Indochine Archway & Bridge Illustration
    ctx.fillStyle = '#e7c98a';
    ctx.font = '700 18px Georgia, serif';
    ctx.fillText('ĐÀ NẴNG — SÔNG HÀN', w * 0.5, 68);
    ctx.strokeStyle = '#faf6eb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w * 0.5, 215, 78, Math.PI, 0);
    ctx.lineTo(w * 0.5 + 78, 300);
    ctx.lineTo(w * 0.5 - 78, 300);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#c5a467';
    ctx.fillRect(62, 238, w - 124, 10);
    ctx.beginPath();
    ctx.arc(w * 0.5, 195, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#faf6eb';
    ctx.font = '800 22px Georgia, serif';
    ctx.fillText('KATINAT HOUSE', w * 0.5, 346);
  } else if (v === 2) {
    // Signature Avocado Coconut Promo Poster
    ctx.fillStyle = '#e7c98a';
    ctx.font = '800 22px "Montserrat", sans-serif';
    ctx.fillText('BEST SELLER', w * 0.5, 66);
    ctx.fillStyle = '#84a96c';
    ctx.beginPath();
    ctx.arc(w * 0.5, 185, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#faf6eb';
    ctx.fillRect(w * 0.5 - 32, 138, 64, 92);
    ctx.fillStyle = '#658b4e';
    ctx.fillRect(w * 0.5 - 28, 165, 56, 60);
    ctx.fillStyle = '#faf6eb';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText('BƠ GIÀ DỪA NON', w * 0.5, 312);
    ctx.fillStyle = '#e7c98a';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('59.000đ', w * 0.5, 352);
  } else {
    // Roasted Oolong Milk Tea Print
    ctx.fillStyle = '#8b6e3c';
    ctx.font = '700 16px "Montserrat", sans-serif';
    ctx.fillText('TINH HOA TRÀ VIỆT', w * 0.5, 64);
    ctx.fillStyle = '#b77f45';
    ctx.beginPath();
    ctx.arc(w * 0.5, 185, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff9ed';
    ctx.fillRect(w * 0.5 - 30, 140, 60, 88);
    ctx.fillStyle = '#a06935';
    ctx.fillRect(w * 0.5 - 26, 165, 52, 58);
    ctx.fillStyle = '#333e47';
    ctx.font = '800 23px Georgia, serif';
    ctx.fillText('OOLONG NƯỚNG', w * 0.5, 312);
    ctx.fillStyle = '#8b6e3c';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('HƯƠNG KHÓI THAN HOA', w * 0.5, 348);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKatinatRetailHeaderTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 96;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#242c33';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d6b061';
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.fillStyle = '#f8f0dc';
  ctx.font = '700 24px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CÀ PHÊ GÓI • LY GIỮ NHIỆT • TRÀ', w * 0.5, h * 0.5);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// =========================================================================
// CUSTOM 3D FACADE GEOMETRY HELPERS (SCALLOPED WAVE MOLDING & 3D LETTERS)
// =========================================================================

function buildScallopedMoldingShape(spanW: number, baseY: number, yOffset = 0): THREE.Shape {
  const half = spanW * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-half, baseY - 0.12);
  shape.lineTo(half, baseY - 0.12);

  // Trace upper wavy scalloped profile right-to-left (Photo 2 & 3 heritage arch profile)
  const steps = 96;
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = -half + t * spanW;
    const distCenter = Math.abs(x);

    // Central raised ogee arch crown (distCenter <= 3.6m) + scalloped coastal waves along flanks
    let archLift = 0;
    if (distCenter < 3.6) {
      const u = distCenter / 3.6;
      const bell = Math.cos(u * Math.PI * 0.5);
      archLift = 1.08 * Math.pow(bell, 1.45);
    }
    const wave = Math.abs(Math.sin((distCenter / 1.45) * Math.PI)) * 0.24;
    const y = baseY + 0.18 + archLift + wave + yOffset;
    shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function build3DKatinatLetterShapes(ch: string, w: number, h: number, stroke: number): THREE.Shape[] {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const s = stroke;

  const rectShape = (x0: number, y0: number, x1: number, y1: number) => {
    const sh = new THREE.Shape();
    sh.moveTo(x0, y0);
    sh.lineTo(x1, y0);
    sh.lineTo(x1, y1);
    sh.lineTo(x0, y1);
    sh.closePath();
    return sh;
  };
  const quadShape = (pts: Array<[number, number]>) => {
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    sh.closePath();
    return sh;
  };

  switch (ch) {
    case 'K':
      return [
        rectShape(-hw, -hh, -hw + s, hh),
        quadShape([
          [-hw + s * 0.6, 0.02],
          [hw - s, hh],
          [hw, hh],
          [-hw + s * 1.4, -0.04],
        ]),
        quadShape([
          [-hw + s * 0.7, 0.05],
          [hw, -hh],
          [hw - s, -hh],
          [-hw + s * 0.6, -0.08],
        ]),
      ];
    case 'A':
      return [
        quadShape([
          [-hw, -hh],
          [-hw + s, -hh],
          [s * 0.35, hh],
          [-s * 0.35, hh],
        ]),
        quadShape([
          [hw - s, -hh],
          [hw, -hh],
          [s * 0.35, hh],
          [-s * 0.35, hh],
        ]),
        rectShape(-hw * 0.58, -hh * 0.28, hw * 0.58, -hh * 0.28 + s * 0.82),
      ];
    case 'T':
      return [
        rectShape(-hw, hh - s, hw, hh),
        rectShape(-s * 0.52, -hh, s * 0.52, hh),
      ];
    case 'I':
      return [rectShape(-s * 0.55, -hh, s * 0.55, hh)];
    case 'N':
      return [
        rectShape(-hw, -hh, -hw + s, hh),
        rectShape(hw - s, -hh, hw, hh),
        quadShape([
          [-hw + 0.02, hh],
          [-hw + s, hh],
          [hw - 0.02, -hh],
          [hw - s, -hh],
        ]),
      ];
    default:
      return [];
  }
}

// =========================================================================
// FURNITURE & PROP BUILDERS (BISTRO SETS, PLANTERS, SCOOTERS)
// =========================================================================

function buildKatinatBistroSet(
  x: number,
  y: number,
  z: number,
  woodMat: THREE.Material,
  darkSlateMat: THREE.Material,
  goldMat: THREE.Material,
  cupMat: THREE.Material,
  teaMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  // Round café table with pedestal base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.05, 14), darkSlateMat);
  base.position.y = 0.025;
  grp.add(base);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.70, 10), darkSlateMat);
  leg.position.y = 0.36;
  grp.add(leg);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 18), goldMat);
  rim.position.y = 0.71;
  grp.add(rim);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.03, 18), woodMat);
  top.position.y = 0.725;
  grp.add(top);

  // Two signature iced drinks with straws, dessert plate & brass table tent
  [
    [-0.12, -0.09],
    [0.14, 0.08],
  ].forEach(([cx, cz]) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.036, 0.14, 10), teaMat);
    cup.position.set(cx, 0.81, cz);
    grp.add(cup);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.025, 10), cupMat);
    lid.position.set(cx, 0.885, cz);
    grp.add(lid);
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), darkSlateMat);
    straw.position.set(cx + 0.01, 0.925, cz);
    straw.rotation.z = -0.15;
    grp.add(straw);
  });

  // Miniature brass vase & table number stand
  const tableStand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.04), goldMat);
  tableStand.position.set(-0.16, 0.785, 0.12);
  grp.add(tableStand);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.018, 12), cupMat);
  saucer.position.set(0.10, 0.748, -0.14);
  grp.add(saucer);
  const pastry = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.07), teaMat);
  pastry.position.set(0.10, 0.785, -0.14);
  grp.add(pastry);

  // Two French bistro chairs flanking along Z
  [-0.64, 0.64].forEach((cz) => {
    const dir = cz > 0 ? -1 : 1;
    const cGrp = new THREE.Group();
    cGrp.position.set(0, 0, cz);
    cGrp.rotation.y = dir > 0 ? 0 : Math.PI;

    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.20, 0.04, 14), woodMat);
    seat.position.y = 0.44;
    cGrp.add(seat);

    [
      [-0.14, -0.14],
      [0.14, -0.14],
      [-0.14, 0.14],
      [0.14, 0.14],
    ].forEach(([lx, lz]) => {
      const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.44, 6), darkSlateMat);
      cLeg.position.set(lx, 0.22, lz);
      cGrp.add(cLeg);
    });

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.04), darkSlateMat);
    back.position.set(0, 0.64, -0.17);
    cGrp.add(back);
    const backPad = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.20, 0.05), woodMat);
    backPad.position.set(0, 0.68, -0.16);
    cGrp.add(backPad);

    grp.add(cGrp);
  });

  return grp;
}

function buildTerracottaPlanter(
  x: number,
  y: number,
  z: number,
  potMat: THREE.Material,
  soilMat: THREE.Material,
  leafMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.48, 14), potMat);
  pot.position.y = 0.24;
  grp.add(pot);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.33, 0.07, 14), potMat);
  rim.position.y = 0.47;
  grp.add(rim);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 12), soilMat);
  soil.position.y = 0.48;
  grp.add(soil);

  // Ornamental café olive/ficus bush
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 8), soilMat);
  trunk.position.y = 0.72;
  grp.add(trunk);

  [
    [0, 1.08, 0, 0.34],
    [-0.16, 0.96, 0.14, 0.22],
    [0.16, 1.00, -0.12, 0.24],
  ].forEach(([lx, ly, lz, lr]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(lr, 10, 8), leafMat);
    f.position.set(lx, ly, lz);
    grp.add(f);
  });

  return grp;
}

function buildParkedScooter(
  x: number,
  y: number,
  z: number,
  yaw: number,
  bodyMat: THREE.Material,
  darkMat: THREE.Material,
  chromeMat: THREE.Material,
  seatMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  // Front & Rear Wheels
  [-0.56, 0.56].forEach((wz) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.10, 14), darkMat);
    tire.rotation.z = Math.PI * 0.5;
    tire.position.set(0, 0.21, wz);
    grp.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.11, 10), chromeMat);
    rim.rotation.z = Math.PI * 0.5;
    rim.position.set(0, 0.21, wz);
    grp.add(rim);
  });

  // Floorboard & rear fairing
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.92), darkMat);
  deck.position.set(0, 0.26, 0);
  grp.add(deck);
  const rearBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.70), bodyMat);
  rearBody.position.set(0, 0.46, -0.34);
  grp.add(rearBody);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.62), seatMat);
  seat.position.set(0, 0.68, -0.26);
  grp.add(seat);

  // Front apron shield & handlebar
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.58, 0.22), bodyMat);
  apron.position.set(0, 0.56, 0.44);
  apron.rotation.x = -0.18;
  grp.add(apron);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), chromeMat);
  stem.position.set(0, 0.90, 0.38);
  grp.add(stem);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.58, 8), darkMat);
  bar.rotation.z = Math.PI * 0.5;
  bar.position.set(0, 1.04, 0.38);
  grp.add(bar);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10), chromeMat);
  lamp.rotation.x = Math.PI * 0.5;
  lamp.position.set(0, 0.96, 0.46);
  grp.add(lamp);

  return grp;
}

// =========================================================================
// MAIN BUILDING STRUCTURE FACTORY
// =========================================================================

export function createKatinatCafeStructure(
  placement?: KatinatPlacementConfig
): KatinatCafeBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Core KATINAT Architectural Palette (Photos 2 & 3)
  const champagneWallMat = new THREE.MeshStandardMaterial({
    map: createKatinatChampagnePanelTex(),
    roughness: 0.70,
    metalness: 0.06,
  });
  const champagneSolidMat = new THREE.MeshStandardMaterial({ color: 0xcab180, roughness: 0.68, metalness: 0.06 });
  const warmCreamInteriorMat = new THREE.MeshStandardMaterial({ color: 0xefe6d4, roughness: 0.78 });
  const darkSlateMat = new THREE.MeshStandardMaterial({ color: 0x333e47, roughness: 0.52, metalness: 0.22 });
  const taupeBronzeColMat = new THREE.MeshStandardMaterial({ color: 0x76624b, roughness: 0.54, metalness: 0.18 });
  const darkBronzeMat = new THREE.MeshStandardMaterial({ color: 0x26201c, roughness: 0.34, metalness: 0.58 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd6b061, roughness: 0.26, metalness: 0.78 });
  const warmWoodMat = new THREE.MeshStandardMaterial({ color: 0x8f6640, roughness: 0.58 });
  const velvetSageMat = new THREE.MeshStandardMaterial({ color: 0x3e5252, roughness: 0.84 });
  const stoneCounterMat = new THREE.MeshStandardMaterial({ color: 0xe7decb, roughness: 0.42 });
  const patioTileMat = new THREE.MeshStandardMaterial({ map: createKatinatPatioTileTex(), roughness: 0.62 });
  const interiorWoodFloorMat = new THREE.MeshStandardMaterial({ map: createKatinatWoodFloorTex(), roughness: 0.54 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.14,
    roughness: 0.14,
    metalness: 0.16,
  });

  const potMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.76 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.90 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6b3f, roughness: 0.80 });
  const scooterCreamMat = new THREE.MeshStandardMaterial({ color: 0xf1ece1, roughness: 0.35, metalness: 0.2 });
  const scooterSlateMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.25 });
  const seatLeatherMat = new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.74 });
  const teaCupMat = new THREE.MeshStandardMaterial({ color: 0xc28e52, roughness: 0.48 });

  // Emissive Materials
  const katinatLetterMat = new THREE.MeshStandardMaterial({
    color: 0xfcf9f0,
    emissive: 0xffefc6,
    emissiveIntensity: 0.36,
    roughness: 0.28,
  });
  neonMats.push(katinatLetterMat);

  const warmCoveMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d1,
    emissive: 0xffd27d,
    emissiveIntensity: 0.52,
    roughness: 0.32,
  });
  lanternMats.push(warmCoveMat);

  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde092,
    emissiveIntensity: 0.58,
    roughness: 0.28,
  });
  lanternMats.push(lanternGlassMat);

  const creamTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfbf7ec,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.14,
    roughness: 0.45,
  });
  lanternMats.push(creamTrimMat);

  // =========================================================================
  // 1. FLOOR SLABS, WALKABLE APRON & PERIMETER STRUCTURAL SHELL
  // =========================================================================
  // Front Apron joining Đường Sơn Tây Nam Sidewalk (X = 353.8 .. 356.6, Z = 69.0 .. 95.0, Y = 0.02)
  const frontApron = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.04, 26.0), patioTileMat);
  frontApron.position.set(355.2, 0.00, MID_Z);
  staticGroup.add(frontApron);

  // Covered Veranda Patio Slab (X = 349.6 .. 353.8, Y = 0.08 podium top)
  const verandaSlab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 26.0), patioTileMat);
  verandaSlab.position.set(351.7, 0.0, MID_Z);
  staticGroup.add(verandaSlab);

  // Interior Café Hall Floor Slab (inset slightly inside rear & side walls to prevent Z-fighting)
  const interiorSlab = new THREE.Mesh(new THREE.BoxGeometry(21.08, 0.16, 25.6), interiorWoodFloorMat);
  interiorSlab.position.set((MIN_X + 0.12 + STORE_GLASS_X) * 0.5, 0.0, MID_Z);
  staticGroup.add(interiorSlab);

  // Exterior Side & Rear Walls (stop cleanly at Y = 8.80 below roof parapet; rear wall inset between side walls)
  const westRearWall = new THREE.Mesh(new THREE.BoxGeometry(0.46, 8.80, 25.76), warmCreamInteriorMat);
  westRearWall.position.set(MIN_X + 0.23, 4.40, MID_Z);
  staticGroup.add(westRearWall);

  [MIN_Z + 0.23, MAX_Z - 0.23].forEach((wz) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(25.35, 8.80, 0.46), champagneSolidMat);
    sideWall.position.set(341.1, 4.40, wz);
    staticGroup.add(sideWall);
  });

  // Ground Ceiling & Veranda Soffit + Roof Deck
  const interiorCeiling = new THREE.Mesh(new THREE.BoxGeometry(25.3, 0.26, 25.4), warmCreamInteriorMat);
  interiorCeiling.position.set(341.1, 4.46, MID_Z);
  staticGroup.add(interiorCeiling);

  const verandaSoffit = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.16, 25.9), champagneSolidMat);
  verandaSoffit.position.set(351.7, 3.68, MID_Z);
  staticGroup.add(verandaSoffit);

  const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(25.5, 0.30, 26.0), darkSlateMat);
  upperRoof.position.set(341.1, 8.95, MID_Z);
  staticGroup.add(upperRoof);

  // =========================================================================
  // 2. ICONIC UPPER KATINAT FACADE (PHOTOS 2 & 3 — FACING EAST +X)
  // =========================================================================
  // Upper architectural wall box (Y = 4.55 .. 8.85, front face at X = 353.80)
  const upperFacadeWall = new THREE.Mesh(new THREE.BoxGeometry(0.60, 4.30, 25.96), champagneSolidMat);
  upperFacadeWall.position.set(FACADE_X - 0.30, 6.70, MID_Z);
  staticGroup.add(upperFacadeWall);

  // Textured champagne vertical-paneled veneer plane facing +X
  const upperFacadeTexPlane = new THREE.Mesh(new THREE.PlaneGeometry(25.92, 4.26), champagneWallMat);
  upperFacadeTexPlane.userData.noMerge = true;
  upperFacadeTexPlane.rotation.y = Math.PI * 0.5;
  upperFacadeTexPlane.position.set(FACADE_X + 0.02, 6.70, MID_Z);
  staticGroup.add(upperFacadeTexPlane);

  // Stepped Dark Slate Parapet & Champagne Upper Cornice Coping (Y = 8.70 .. 9.14)
  const topChampagneTrim = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 26.10), champagneSolidMat);
  topChampagneTrim.position.set(FACADE_X - 0.22, 8.78, MID_Z);
  staticGroup.add(topChampagneTrim);

  const topSlateCoping = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.22, 26.18), darkSlateMat);
  topSlateCoping.position.set(FACADE_X - 0.20, 8.99, MID_Z);
  staticGroup.add(topSlateCoping);

  // Horizontal Ribbed Champagne Frieze Beam & Quote Fascia (Y = 3.62 .. 4.65)
  const canopyBaseBeam = new THREE.Mesh(new THREE.BoxGeometry(0.70, 1.04, 26.04), champagneSolidMat);
  canopyBaseBeam.position.set(FACADE_X - 0.26, 4.14, MID_Z);
  staticGroup.add(canopyBaseBeam);

  // 4 Signature Horizontal Ribs on Upper Part of Canopy Beam (Photo 2)
  [4.04, 4.20, 4.36, 4.52].forEach((ry) => {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 26.06), champagneSolidMat);
    rib.position.set(FACADE_X + 0.08, ry, MID_Z);
    staticGroup.add(rib);
  });

  // Dark Slate Canopy Bottom Fascia Bar Carrying White Brand Quote
  const quoteBeam = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.34, 26.08), darkSlateMat);
  quoteBeam.position.set(FACADE_X + 0.05, 3.76, MID_Z);
  staticGroup.add(quoteBeam);

  const quoteTex = createKatinatQuoteBeamTex();
  const quoteMat = new THREE.MeshStandardMaterial({
    map: quoteTex,
    emissive: 0xffffff,
    emissiveMap: quoteTex,
    emissiveIntensity: 0.16,
    roughness: 0.42,
  });
  neonMats.push(quoteMat);
  const quotePlane = new THREE.Mesh(new THREE.PlaneGeometry(25.6, 0.32), quoteMat);
  quotePlane.userData.noMerge = true;
  quotePlane.rotation.y = Math.PI * 0.5;
  quotePlane.position.set(FACADE_X + 0.17, 3.76, MID_Z);
  staticGroup.add(quotePlane);

  // Iconic Scalloped Wavy Dark Slate Molding + Cream Backing + Golden Cove Halo (Y = 4.65 .. 6.25)
  const coveHaloGeo = new THREE.ExtrudeGeometry(buildScallopedMoldingShape(25.92, 4.68, 0.09), {
    depth: 0.04,
    bevelEnabled: false,
  });
  const coveHaloMesh = new THREE.Mesh(coveHaloGeo, warmCoveMat);
  coveHaloMesh.rotation.y = Math.PI * 0.5;
  coveHaloMesh.position.set(FACADE_X + 0.02, 0, MID_Z);
  staticGroup.add(coveHaloMesh);

  const creamScallopGeo = new THREE.ExtrudeGeometry(buildScallopedMoldingShape(25.96, 4.65, 0.05), {
    depth: 0.09,
    bevelEnabled: false,
  });
  const creamScallopMesh = new THREE.Mesh(creamScallopGeo, creamTrimMat);
  creamScallopMesh.rotation.y = Math.PI * 0.5;
  creamScallopMesh.position.set(FACADE_X + 0.05, 0, MID_Z);
  staticGroup.add(creamScallopMesh);

  const slateScallopGeo = new THREE.ExtrudeGeometry(buildScallopedMoldingShape(26.02, 4.62, -0.02), {
    depth: 0.14,
    bevelEnabled: false,
  });
  const slateScallopMesh = new THREE.Mesh(slateScallopGeo, darkSlateMat);
  slateScallopMesh.rotation.y = Math.PI * 0.5;
  slateScallopMesh.position.set(FACADE_X + 0.09, 0, MID_Z);
  staticGroup.add(slateScallopMesh);

  // Architectural Up/Down Spot Brackets Mounted Along Scalloped Wave
  [-9.6, -5.8, -2.4, 2.4, 5.8, 9.6].forEach((dz) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.16), darkBronzeMat);
    bracket.position.set(FACADE_X + 0.24, 4.92, MID_Z + dz);
    staticGroup.add(bracket);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.12), warmCoveMat);
    lens.position.set(FACADE_X + 0.30, 4.96, MID_Z + dz);
    staticGroup.add(lens);
  });

  // Circular Cream & Gold Crest Medallion Centered on Scalloped Arch (Z = 82.0, Y = 5.42)
  const medallionRing = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.12, 28), goldTrimMat);
  medallionRing.rotation.z = Math.PI * 0.5;
  medallionRing.position.set(FACADE_X + 0.22, 5.40, MID_Z);
  staticGroup.add(medallionRing);

  const medallionOuterSlate = new THREE.Mesh(new THREE.CylinderGeometry(0.79, 0.79, 0.08, 28), darkSlateMat);
  medallionOuterSlate.rotation.z = Math.PI * 0.5;
  medallionOuterSlate.position.set(FACADE_X + 0.19, 5.40, MID_Z);
  staticGroup.add(medallionOuterSlate);

  // Small Architectural Crown Finial Atop Medallion (Photo 2)
  const finial = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.22), goldTrimMat);
  finial.position.set(FACADE_X + 0.23, 6.20, MID_Z);
  staticGroup.add(finial);

  const medallionMat = new THREE.MeshStandardMaterial({
    map: createKatinatMedallionTex(),
    emissive: 0xfff8e1,
    emissiveIntensity: 0.16,
    roughness: 0.32,
  });
  neonMats.push(medallionMat);
  const medallionFace = new THREE.Mesh(new THREE.CircleGeometry(0.68, 28), medallionMat);
  medallionFace.userData.noMerge = true;
  medallionFace.rotation.y = Math.PI * 0.5;
  medallionFace.position.set(FACADE_X + 0.295, 5.40, MID_Z);
  staticGroup.add(medallionFace);

  // 3D Sculpted "KATINAT" Block Letters + Cream Underline Bar + "COFFEE & TEA HOUSE" Sub-Ribbon
  const katinatLettersGroup = new THREE.Group();
  katinatLettersGroup.position.set(FACADE_X + 0.04, 7.52, MID_Z);
  katinatLettersGroup.rotation.y = Math.PI * 0.5;

  const chars = ['K', 'A', 'T', 'I', 'N', 'A', 'T'];
  const letterWidths = [0.76, 0.80, 0.72, 0.34, 0.78, 0.80, 0.72];
  const letterGap = 0.22;
  const totalWordW =
    letterWidths.reduce((acc, v) => acc + v, 0) + letterGap * (chars.length - 1);
  let cursorX = -totalWordW * 0.5;

  chars.forEach((ch, idx) => {
    const lw = letterWidths[idx];
    const cx = cursorX + lw * 0.5;
    const shapes = build3DKatinatLetterShapes(ch, lw, 1.06, 0.20);
    shapes.forEach((sh) => {
      // Gold/brass depth return
      const sideGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false });
      const sideMesh = new THREE.Mesh(sideGeo, goldTrimMat);
      sideMesh.position.set(cx, 0, 0);
      katinatLettersGroup.add(sideMesh);

      // Luminous cream front face
      const faceGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false });
      const faceMesh = new THREE.Mesh(faceGeo, katinatLetterMat);
      faceMesh.position.set(cx, 0, 0.14);
      katinatLettersGroup.add(faceMesh);
    });
    cursorX += lw + letterGap;
  });

  // Signature Cream Underline Bar Beneath "KATINAT" (Photo 2)
  const underlineSide = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.18, 0.12), goldTrimMat);
  underlineSide.position.set(0, -0.74, 0.06);
  katinatLettersGroup.add(underlineSide);
  const underlineFace = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.18, 0.04), katinatLetterMat);
  underlineFace.position.set(0, -0.74, 0.14);
  katinatLettersGroup.add(underlineFace);

  staticGroup.add(katinatLettersGroup);

  // "COFFEE & TEA HOUSE" Sub-Plaque Below Underline (Photo 3)
  const subRibbonGeo = new THREE.BoxGeometry(0.10, 0.44, 3.05);
  const subRibbonBacking = new THREE.Mesh(subRibbonGeo, darkSlateMat);
  subRibbonBacking.position.set(FACADE_X + 0.07, 6.46, MID_Z);
  staticGroup.add(subRibbonBacking);

  const subRibbonMat = new THREE.MeshStandardMaterial({
    map: createKatinatSubBrandRibbonTex(),
    emissive: 0xfff3c4,
    emissiveMap: createKatinatSubBrandRibbonTex(),
    emissiveIntensity: 0.22,
    roughness: 0.36,
  });
  neonMats.push(subRibbonMat);
  const subRibbonFace = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.42), subRibbonMat);
  subRibbonFace.userData.noMerge = true;
  subRibbonFace.rotation.y = Math.PI * 0.5;
  subRibbonFace.position.set(FACADE_X + 0.135, 6.46, MID_Z);
  staticGroup.add(subRibbonFace);

  // =========================================================================
  // 3. COVERED VERANDA COLONNADE, GOLD-RINGED COLUMNS, LANTERNS & PATIO SEATING
  // =========================================================================
  const colZs = [69.55, 74.5, 79.45, 84.55, 89.5, 94.45];
  colZs.forEach((cz, idx) => {
    const colX = 353.38;
    // Slate-charcoal stone plinth base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.58), darkSlateMat);
    base.position.set(colX, 0.31, cz);
    staticGroup.add(base);

    // Taupe-bronze column shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.46, 3.12, 0.46), taupeBronzeColMat);
    shaft.position.set(colX, 2.08, cz);
    staticGroup.add(shaft);

    // Signature Twin Champagne-Gold Collar Rings Near Capital (Photo 2)
    [3.14, 3.36].forEach((ry) => {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.54), goldTrimMat);
      collar.position.set(colX, ry, cz);
      staticGroup.add(collar);
    });

    // Dark Slate Column Capital Cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.56), darkSlateMat);
    cap.position.set(colX, 3.56, cz);
    staticGroup.add(cap);

    // Warm Brass & Glass Column Sconce Lanterns on Inner Columns (Photo 2)
    if (idx >= 1 && idx <= 4) {
      const lx = colX - 0.30;
      const sconceCap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), darkBronzeMat);
      sconceCap.position.set(lx, 2.48, cz);
      staticGroup.add(sconceCap);
      const sconceGlow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.36, 0.11), lanternGlassMat);
      sconceGlow.position.set(lx, 2.28, cz);
      staticGroup.add(sconceGlow);
      const sconceBot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), darkBronzeMat);
      sconceBot.position.set(lx, 2.08, cz);
      staticGroup.add(sconceBot);
    }
  });

  // Veranda Soffit Recessed Spotlights
  [72.0, 77.0, 82.0, 87.0, 92.0].forEach((sz) => {
    const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 12), lanternGlassMat);
    spot.position.set(351.6, 3.59, sz);
    staticGroup.add(spot);
  });

  // Veranda Patio Bistro Seating (4 Tables: 2 North Bay + 2 South Bay)
  [72.1, 76.8, 87.2, 91.9].forEach((tz) => {
    staticGroup.add(
      buildKatinatBistroSet(
        351.45,
        KATINAT_PODIUM_Y,
        tz,
        warmWoodMat,
        darkSlateMat,
        goldTrimMat,
        chromeMat,
        teaCupMat
      )
    );
  });

  // Flanking Lush Planters Around Entrance Bay (Z = 79.55 & Z = 84.45)
  [79.55, 84.45].forEach((pz) => {
    staticGroup.add(buildTerracottaPlanter(352.65, KATINAT_PODIUM_Y, pz, potMat, soilMat, leafMat));
  });

  // 2 Stylish Parked Scooters on Far South Outer Apron Bay (Photo 2 & 3 Vietnamese Katinat vibe)
  staticGroup.add(
    buildParkedScooter(354.9, 0.02, 91.2, -Math.PI * 0.42, scooterCreamMat, darkSlateMat, chromeMat, seatLeatherMat)
  );
  staticGroup.add(
    buildParkedScooter(354.9, 0.02, 93.1, -Math.PI * 0.45, scooterSlateMat, darkSlateMat, chromeMat, seatLeatherMat)
  );

  // =========================================================================
  // 4. FRENCH MULTI-PANE GLASS STOREFRONT, AUTO SWINGING DOORS & SHUTTER
  // =========================================================================
  // Low Wainscot Sill Wall Under Left & Right French Windows (Y = 0.08 .. 0.64)
  [
    { z0: 69.3, z1: 80.2 },
    { z0: 83.8, z1: 94.7 },
  ].forEach((seg) => {
    const len = seg.z1 - seg.z0;
    const cz = (seg.z0 + seg.z1) * 0.5;
    const wainscot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, len), taupeBronzeColMat);
    wainscot.position.set(STORE_GLASS_X, 0.36, cz);
    staticGroup.add(wainscot);

    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, len + 0.06), darkSlateMat);
    sill.position.set(STORE_GLASS_X, 0.65, cz);
    staticGroup.add(sill);

    // Full Clear French Glass Sheet
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.74, len - 0.12), glassMat);
    glassPane.userData.noMerge = true;
    glassPane.position.set(STORE_GLASS_X, 2.04, cz);
    staticGroup.add(glassPane);

    // Top Header Frame (Y = 3.45) & Vertical Mullions Every ~1.8m
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, len), darkBronzeMat);
    topBar.position.set(STORE_GLASS_X, 3.52, cz);
    staticGroup.add(topBar);

    const panels = Math.max(3, Math.round(len / 1.8));
    for (let i = 0; i <= panels; i++) {
      const mz = seg.z0 + (i / panels) * len;
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.86, 0.11), darkBronzeMat);
      mullion.position.set(STORE_GLASS_X, 2.06, mz);
      staticGroup.add(mullion);
    }

    // Horizontal French Muntin Bars Across Windows
    [1.60, 2.60].forEach((my) => {
      const muntin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, len), darkBronzeMat);
      muntin.position.set(STORE_GLASS_X, my, cz);
      staticGroup.add(muntin);
    });
  });

  // Central Entrance Portal Frame & Backlit "KATINAT" Transom Sign (Z = 80.2 .. 83.8)
  [MID_Z - DOOR_HALF_W, MID_Z + DOOR_HALF_W].forEach((jz) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.56, 0.18), darkBronzeMat);
    jamb.position.set(STORE_GLASS_X, 1.86, jz);
    staticGroup.add(jamb);

    // Vertical Warm Pier Lantern Flanking Doorway
    const pLantern = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.40, 0.10), lanternGlassMat);
    pLantern.position.set(STORE_GLASS_X + 0.18, 2.32, jz);
    staticGroup.add(pLantern);
  });

  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.90, DOOR_HALF_W * 2 + 0.2), darkBronzeMat);
  doorHeader.position.set(STORE_GLASS_X, 3.19, MID_Z);
  staticGroup.add(doorHeader);

  const transomMat = new THREE.MeshStandardMaterial({
    map: createKatinatTransomSignTex(),
    emissive: 0xfff5d6,
    emissiveMap: createKatinatTransomSignTex(),
    emissiveIntensity: 0.42,
    roughness: 0.35,
  });
  neonMats.push(transomMat);
  const transomSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.72), transomMat);
  transomSign.userData.noMerge = true;
  transomSign.rotation.y = Math.PI * 0.5;
  transomSign.position.set(STORE_GLASS_X + 0.175, 3.19, MID_Z);
  staticGroup.add(transomSign);

  // Overhead Motion Sensor Pods & Status LEDs flanking Entrance Header (Exterior + Interior)
  const sensorStatusMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });
  neonMats.push(sensorStatusMat);
  [STORE_GLASS_X + 0.17, STORE_GLASS_X - 0.17].forEach((sx) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.34), darkBronzeMat);
    pod.position.set(sx, 2.74, MID_Z);
    staticGroup.add(pod);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.11), sensorStatusMat);
    led.position.set(sx + (sx > STORE_GLASS_X ? 0.042 : -0.042), 2.74, MID_Z);
    staticGroup.add(led);
  });

  // Auto-Swinging Double French Glass Doors (hinges at Z = 80.26 & Z = 83.74; swing cleanly INWARD -X)
  const buildFrenchDoorLeaf = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.userData.noMerge = true;
    pivot.position.set(STORE_GLASS_X, KATINAT_PODIUM_Y, MID_Z + side * 1.74);

    const leafW = 1.72;
    const leafH = 2.62;
    const centerOffZ = -side * leafW * 0.5;

    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, leafH - 0.18, leafW - 0.14), glassMat);
    glass.userData.noMerge = true;
    glass.position.set(0, leafH * 0.5, centerOffZ);
    pivot.add(glass);

    // Outer bronze rails & stiles
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, leafW), darkBronzeMat);
    topRail.userData.noMerge = true;
    topRail.position.set(0, leafH - 0.06, centerOffZ);
    pivot.add(topRail);
    const botKick = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, leafW), darkBronzeMat);
    botKick.userData.noMerge = true;
    botKick.position.set(0, 0.12, centerOffZ);
    pivot.add(botKick);
    [-0.04, -leafW + 0.04].forEach((dz) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.09, leafH, 0.08), darkBronzeMat);
      stile.userData.noMerge = true;
      stile.position.set(0, leafH * 0.5, side * dz);
      pivot.add(stile);
    });
    // French cross muntin grid
    [0.95, 1.75].forEach((my) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, leafW - 0.1), darkBronzeMat);
      bar.userData.noMerge = true;
      bar.position.set(0, my, centerOffZ);
      pivot.add(bar);
    });
    const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, leafH - 0.24, 0.05), darkBronzeMat);
    centerMullion.userData.noMerge = true;
    centerMullion.position.set(0, leafH * 0.5, centerOffZ);
    pivot.add(centerMullion);

    // Brushed gold vertical push-pull handles (both exterior & interior sides)
    [-0.075, 0.075].forEach((hx) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.56, 8), goldTrimMat);
      handle.userData.noMerge = true;
      handle.position.set(hx, 1.15, -side * (leafW - 0.18));
      pivot.add(handle);
    });

    return pivot;
  };

  const northDoorPivot = buildFrenchDoorLeaf(-1);
  const southDoorPivot = buildFrenchDoorLeaf(1);
  staticGroup.add(northDoorPivot, southDoorPivot);

  // Rolling Shutter Door (07:00 - 23:00; sits just outside closed French doors)
  const shutterTex = createRollingShutterTexture({
    title: 'KATINAT COFFEE & TEA HOUSE',
    hoursLabel: '07:00 - 23:00',
    accentHex: '#d6b061',
    slatDarkHex: '#262f37',
    slatLightHex: '#43515e',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.45,
    metalness: 0.4,
  });
  const shutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'katinat_main_shutter',
      axis: 'z',
      pos: STORE_GLASS_X + 0.16,
      spanCenter: MID_Z,
      width: 3.65,
      baseY: KATINAT_PODIUM_Y,
      topY: 2.74,
      thickness: 0.08,
    },
    shutterMat,
    darkBronzeMat
  );

  // =========================================================================
  // 5. WALKABLE INTERIOR: INDOCHINE ARCHITECTURE, BARISTA BAR & LOUNGE DETAILS
  // =========================================================================
  const walnutMat = new THREE.MeshStandardMaterial({ color: 0x4b3222, roughness: 0.62 });
  const cognacLeatherMat = new THREE.MeshStandardMaterial({ color: 0x8b522e, roughness: 0.68 });
  const syrupRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35 });
  const syrupGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.35 });
  const syrupGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.32 });

  // 5A. Patterned Indochine Tile Rug Inlays Inset on Interior Oak Floor
  const rugMat = new THREE.MeshStandardMaterial({ map: createKatinatIndochineRugTex(), roughness: 0.66 });
  [
    { x: 341.6, z: 73.6, w: 10.6, d: 4.2 }, // North Lounge Rug
    { x: 341.6, z: 90.4, w: 10.6, d: 4.2 }, // South Lounge Rug
    { x: 342.4, z: 82.0, w: 12.6, d: 3.3 }, // Central Welcome Promenade Runner
  ].forEach((r) => {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.012, r.d), rugMat);
    rug.userData.noMerge = true;
    rug.position.set(r.x, KATINAT_PODIUM_Y + 0.006, r.z);
    staticGroup.add(rug);
  });

  // 5B. Coffered Dark-Walnut Ceiling Beams & Chandeliers
  [74.0, 79.4, 84.6, 90.0].forEach((bz) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.22, 0.28), walnutMat);
    beam.position.set(339.2, 4.26, bz);
    staticGroup.add(beam);
  });
  [333.2, 338.2, 343.6, 348.2].forEach((bx) => {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 25.0), walnutMat);
    rib.position.set(bx, 4.28, MID_Z);
    staticGroup.add(rib);
  });

  // 3 Tiered Brass & Frosted-Glass KATINAT Chandeliers Down the Central Bay
  [338.2, 342.4, 346.6].forEach((cx) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95, 8), goldTrimMat);
    rod.position.set(cx, 3.84, MID_Z);
    staticGroup.add(rod);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.06, 20, 1, true), goldTrimMat);
    ring.position.set(cx, 3.36, MID_Z);
    staticGroup.add(ring);
    const canopyGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.04, 18), warmCoveMat);
    canopyGlow.position.set(cx, 3.34, MID_Z);
    staticGroup.add(canopyGlow);
    for (let gi = 0; gi < 6; gi++) {
      const a = (gi / 6) * Math.PI * 2;
      const gx = cx + Math.cos(a) * 0.52;
      const gz = MID_Z + Math.sin(a) * 0.52;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lanternGlassMat);
      bulb.position.set(gx, 3.22, gz);
      staticGroup.add(bulb);
    }
  });

  // 5C. Back Fluted Timber & Champagne Feature Wall + Arched Retail Merch Alcoves (West Wall)
  const backFeatureWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.25, 25.0), champagneSolidMat);
  backFeatureWall.position.set(MIN_X + 0.55, 2.20, MID_Z);
  staticGroup.add(backFeatureWall);

  for (let z = 75.8; z <= 88.2; z += 0.34) {
    if (z >= 79.0 && z <= 85.0) continue;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.10, 0.12), warmWoodMat);
    slat.position.set(MIN_X + 0.68, 2.15, z);
    staticGroup.add(slat);
  }

  // Backlit "KATINAT COFFEE & TEA HOUSE" Interior Wall Sign (visible from street/veranda like Photo 2!)
  const interiorSignMat = new THREE.MeshStandardMaterial({
    map: createKatinatFeatureWallSignTex(),
    emissive: 0xffe4a0,
    emissiveMap: createKatinatFeatureWallSignTex(),
    emissiveIntensity: 0.45,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.32,
  });
  neonMats.push(interiorSignMat);
  const interiorSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.1), interiorSignMat);
  interiorSign.userData.noMerge = true;
  interiorSign.rotation.y = Math.PI * 0.5;
  interiorSign.position.set(MIN_X + 0.67, 2.86, MID_Z);
  staticGroup.add(interiorSign);

  // Flanking Illuminated Retail Merchandise Alcoves (North Z=71.2..75.6 & South Z=88.4..92.8)
  const retailHeaderTex = createKatinatRetailHeaderTex();
  const retailHeaderMat = new THREE.MeshStandardMaterial({
    map: retailHeaderTex,
    emissive: 0xffe8b0,
    emissiveMap: retailHeaderTex,
    emissiveIntensity: 0.28,
    roughness: 0.4,
  });
  neonMats.push(retailHeaderMat);

  [73.4, 90.6].forEach((az) => {
    const nicheBack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.65, 4.3), darkSlateMat);
    nicheBack.position.set(329.06, 1.90, az);
    staticGroup.add(nicheBack);
    [-2.15, 2.15].forEach((dz) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.82, 3.65, 0.14), walnutMat);
      side.position.set(329.42, 1.90, az + dz);
      staticGroup.add(side);
    });
    const baseCab = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.68, 4.2), darkSlateMat);
    baseCab.position.set(329.44, 0.42, az);
    staticGroup.add(baseCab);
    const headerPlaque = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 0.56), retailHeaderMat);
    headerPlaque.userData.noMerge = true;
    headerPlaque.rotation.y = Math.PI * 0.5;
    headerPlaque.position.set(329.86, 3.36, az);
    staticGroup.add(headerPlaque);

    [0.82, 1.44, 2.06, 2.66].forEach((sy, sIdx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 4.12), warmWoodMat);
      shelf.position.set(329.44, sy, az);
      staticGroup.add(shelf);
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 3.9), warmCoveMat);
      ledStrip.position.set(329.22, sy - 0.04, az);
      staticGroup.add(ledStrip);

      for (let bi = 0; bi < 8; bi++) {
        const bz = az - 1.72 + bi * 0.49;
        if (sIdx === 3) {
          // Top shelf: cascading greenery & brass gift tins
          if (bi % 3 === 0) {
            const pPot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.18, 10), goldTrimMat);
            pPot.position.set(329.52, sy + 0.12, bz);
            staticGroup.add(pPot);
            const bush = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 6), leafMat);
            bush.position.set(329.56, sy + 0.28, bz);
            staticGroup.add(bush);
          } else {
            const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 10), darkSlateMat);
            tin.position.set(329.48, sy + 0.15, bz);
            staticGroup.add(tin);
          }
        } else if (sIdx === 2) {
          // Branded Katinat whole-bean roast bags
          const bagMat = bi % 3 === 0 ? goldTrimMat : bi % 3 === 1 ? velvetSageMat : darkSlateMat;
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.30, 0.22), bagMat);
          bag.position.set(329.48, sy + 0.18, bz);
          staticGroup.add(bag);
        } else {
          // Thermal tumblers & porcelain mugs
          const tumMat = bi % 2 === 0 ? champagneSolidMat : velvetSageMat;
          const tum = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.24, 10), tumMat);
          tum.position.set(329.48, sy + 0.15, bz);
          staticGroup.add(tum);
          const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.03, 10), goldTrimMat);
          lid.position.set(329.48, sy + 0.28, bz);
          staticGroup.add(lid);
        }
      }
    });
  });

  // 5D. Detailed Back-Bar Prep Credenza: Sink, Blenders, Stepped Syrup Rack & Floating Shelves
  const credenza = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.94, 11.0), darkSlateMat);
  credenza.position.set(329.75, 0.55, MID_Z);
  staticGroup.add(credenza);
  const credenzaTop = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 11.08), stoneCounterMat);
  credenzaTop.position.set(329.75, 1.05, MID_Z);
  staticGroup.add(credenzaTop);

  // Stainless prep sink + gooseneck faucet (Z = 82.0)
  const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 1.05), chromeMat);
  sinkBasin.position.set(329.75, 1.09, 82.0);
  staticGroup.add(sinkBasin);
  const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), chromeMat);
  faucetStem.position.set(329.45, 1.28, 82.0);
  staticGroup.add(faucetStem);

  // Twin Commercial Matcha / Avocado Freeze Blenders (Z = 84.8 & 85.4)
  [84.8, 85.4].forEach((fz) => {
    const bBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.24), darkBronzeMat);
    bBase.position.set(329.78, 1.16, fz);
    staticGroup.add(bBase);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.32, 10), glassMat);
    jar.position.set(329.78, 1.40, fz);
    staticGroup.add(jar);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.18, 10), leafMat);
    fill.position.set(329.78, 1.34, fz);
    staticGroup.add(fill);
  });

  // Stepped 2-Tier Syrup & Tea Essence Rack (Z = 78.2 .. 80.6)
  const syrupMats = [syrupRedMat, syrupGoldMat, syrupGreenMat, teaCupMat, goldTrimMat];
  for (let row = 0; row < 2; row++) {
    const stepBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09 + row * 0.09, 2.3), walnutMat);
    stepBox.position.set(329.52 + row * 0.24, 1.12 + row * 0.045, 79.4);
    staticGroup.add(stepBox);
    for (let bi = 0; bi < 7; bi++) {
      const bz = 78.42 + bi * 0.32;
      const bMat = syrupMats[(bi + row * 2) % syrupMats.length];
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.048, 0.24, 8), bMat);
      bottle.position.set(329.52 + row * 0.24, 1.29 + row * 0.09, bz);
      staticGroup.add(bottle);
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.08, 6), stoneCounterMat);
      pump.position.set(329.52 + row * 0.24, 1.45 + row * 0.09, bz);
      staticGroup.add(pump);
    }
  }

  // Floating Lit Back-Bar Shelves & Tea/Coffee Canisters (Y = 1.62)
  const backShelf = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 8.6), warmWoodMat);
  backShelf.position.set(329.22, 1.64, MID_Z);
  staticGroup.add(backShelf);
  for (let i = 0; i < 8; i++) {
    const cz = 78.2 + i * 1.08;
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.26, 10),
      i % 2 === 0 ? goldTrimMat : darkSlateMat
    );
    jar.position.set(329.25, 1.80, cz);
    staticGroup.add(jar);
  }

  // 5E. Main Order, Barista & Pastry Counter (X = 333.2 .. 335.2, Z = 76.4 .. 87.6)
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.02, 11.2), darkSlateMat);
  counterBase.position.set(334.2, 0.59, MID_Z);
  staticGroup.add(counterBase);
  const counterKick = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.10, 11.24), goldTrimMat);
  counterKick.position.set(334.2, 0.13, MID_Z);
  staticGroup.add(counterKick);
  const counterStoneTop = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.08, 11.38), stoneCounterMat);
  counterStoneTop.position.set(334.2, 1.14, MID_Z);
  staticGroup.add(counterStoneTop);

  for (let z = 76.8; z <= 87.2; z += 0.55) {
    const flute = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.90, 0.06), goldTrimMat);
    flute.position.set(335.14, 0.60, z);
    staticGroup.add(flute);
  }

  // Glass Sneeze Guard Along Espresso Prep Bay (Z = 81.0 .. 84.5)
  const sneezeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 3.4), glassMat);
  sneezeGuard.userData.noMerge = true;
  sneezeGuard.position.set(335.06, 1.39, 82.75);
  staticGroup.add(sneezeGuard);
  [81.1, 82.75, 84.4].forEach((pz) => {
    const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 6), goldTrimMat);
    sPost.position.set(335.06, 1.39, pz);
    staticGroup.add(sPost);
  });

  // Illuminated 2-Tier Refrigerated Glass Pastry & Cold-Brew Showcase (Z = 76.8 .. 79.3)
  const pastryDeck = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.16, 2.45), darkBronzeMat);
  pastryDeck.position.set(334.25, 1.26, 78.05);
  staticGroup.add(pastryDeck);
  const pastryBox = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 2.40), glassMat);
  pastryBox.userData.noMerge = true;
  pastryBox.position.set(334.25, 1.70, 78.05);
  staticGroup.add(pastryBox);
  const pastryFrame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 2.44), darkBronzeMat);
  pastryFrame.position.set(334.25, 2.08, 78.05);
  staticGroup.add(pastryFrame);
  const pastryLed = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.03, 2.25), warmCoveMat);
  pastryLed.position.set(334.25, 2.03, 78.05);
  staticGroup.add(pastryLed);
  [1.46, 1.76].forEach((sy, sIdx) => {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.03, 2.26), chromeMat);
    rack.position.set(334.25, sy, 78.05);
    staticGroup.add(rack);
    for (let p = 0; p < 5; p++) {
      const pz = 77.15 + p * 0.45;
      const cakeMat =
        sIdx === 0
          ? p % 2 === 0
            ? teaCupMat
            : scooterCreamMat
          : p % 3 === 0
            ? syrupGoldMat
            : p % 3 === 1
              ? leafMat
              : cognacLeatherMat;
      const item =
        sIdx === 1 && p >= 3
          ? new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 10), teaCupMat)
          : new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.20), cakeMat);
      item.position.set(334.25, sy + 0.08, pz);
      staticGroup.add(item);
    }
  });

  // 2-Group Commercial Espresso Machine + Twin Conical Grinders + Cup Stacks (Z = 81.4 .. 83.6)
  const espressoBody = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.50, 1.15), chromeMat);
  espressoBody.position.set(333.85, 1.43, 82.0);
  staticGroup.add(espressoBody);
  const espressoCrown = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 1.12), darkSlateMat);
  espressoCrown.position.set(333.85, 1.62, 82.0);
  staticGroup.add(espressoCrown);
  [81.72, 82.28].forEach((gz) => {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.10, 8), darkBronzeMat);
    head.position.set(333.54, 1.38, gz);
    staticGroup.add(head);
    const cupStack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.16, 10), scooterCreamMat);
    cupStack.position.set(333.85, 1.76, gz);
    staticGroup.add(cupStack);
  });
  [82.85, 83.22].forEach((gz) => {
    const grinder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.24), darkBronzeMat);
    grinder.position.set(333.85, 1.35, gz);
    staticGroup.add(grinder);
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.22, 10), glassMat);
    hopper.position.set(333.85, 1.62, gz);
    staticGroup.add(hopper);
    const beans = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.13, 10), walnutMat);
    beans.position.set(333.85, 1.59, gz);
    staticGroup.add(beans);
  });

  // Tea Shaker & Ice Well + Pickup Mat, Branded Cup Stacks & Napkin Caddy (Z = 84.0 .. 87.2)
  const iceWell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.72), chromeMat);
  iceWell.position.set(333.85, 1.20, 84.05);
  staticGroup.add(iceWell);
  const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.24, 10), chromeMat);
  shaker.position.set(333.92, 1.32, 83.95);
  staticGroup.add(shaker);

  [80.2, 85.4].forEach((pz) => {
    const posStand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.16), darkBronzeMat);
    posStand.position.set(334.48, 1.30, pz);
    staticGroup.add(posStand);
    const posScreen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.40), darkBronzeMat);
    posScreen.position.set(334.50, 1.46, pz);
    posScreen.rotation.z = -0.22;
    staticGroup.add(posScreen);
    const posGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.20), warmCoveMat);
    posGlow.position.set(334.54, 1.46, pz);
    posGlow.rotation.y = Math.PI * 0.5;
    staticGroup.add(posGlow);
  });

  const pickupMat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 1.1), darkBronzeMat);
  pickupMat.position.set(334.62, 1.19, 86.65);
  staticGroup.add(pickupMat);
  [86.3, 86.52, 86.74].forEach((cz, idx) => {
    const ch = 0.26 + (idx % 2) * 0.08;
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, ch, 10), scooterCreamMat);
    stack.position.set(334.55, 1.20 + ch * 0.5, cz);
    staticGroup.add(stack);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.049, 0.06, 10), goldTrimMat);
    band.position.set(334.55, 1.20 + ch * 0.65, cz);
    staticGroup.add(band);
  });
  const napkinBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.24), warmWoodMat);
  napkinBox.position.set(334.72, 1.26, 87.12);
  staticGroup.add(napkinBox);

  // Hanging Overhead Illuminated Menu Board Triptych Above Counter (X = 334.2, Y = 3.55)
  [-2.6, 0, 2.6].forEach((dz, idx) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 2.25), darkBronzeMat);
    frame.position.set(334.2, 3.55, MID_Z + dz);
    staticGroup.add(frame);
    const mTex = createKatinatMenuBoardTex(idx);
    const mMat = new THREE.MeshStandardMaterial({
      map: mTex,
      emissive: 0xfff3d1,
      emissiveMap: mTex,
      emissiveIntensity: 0.30,
      roughness: 0.35,
    });
    neonMats.push(mMat);
    const mFace = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 0.96), mMat);
    mFace.userData.noMerge = true;
    mFace.rotation.y = Math.PI * 0.5;
    mFace.position.set(334.27, 3.55, MID_Z + dz);
    staticGroup.add(mFace);
  });

  // 5F. North & South Heritage Walls: Wainscoting, Framed Indochine Art, Brass Sconces & Velvet Banquettes
  const artPosterMats = [0, 1, 2, 3].map((v) => {
    const tex = createKatinatArtPosterTex(v);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xfff3d1,
      emissiveMap: tex,
      emissiveIntensity: 0.14,
      roughness: 0.45,
    });
    neonMats.push(mat);
    return mat;
  });

  [
    { wallZ: 70.3, dir: 1 },
    { wallZ: 93.7, dir: -1 },
  ].forEach(({ wallZ, dir }, sideIdx) => {
    const wallFaceZ = wallZ - dir * 0.78;
    // Lower walnut & taupe wainscot molding along North & South walls
    const wainscotPanel = new THREE.Mesh(new THREE.BoxGeometry(19.6, 1.15, 0.08), walnutMat);
    wainscotPanel.position.set(339.4, 0.66, wallFaceZ);
    staticGroup.add(wainscotPanel);
    const dadoRail = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.08, 0.12), goldTrimMat);
    dadoRail.position.set(339.4, 1.25, wallFaceZ);
    staticGroup.add(dadoRail);

    // Tufted Sage-Velvet Banquette Sofa + Brass Plinth + Accent Pillows
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.10, 0.88), goldTrimMat);
    plinth.position.set(339.2, 0.13, wallZ + dir * 0.30);
    staticGroup.add(plinth);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.42, 0.92), velvetSageMat);
    seat.position.set(339.2, 0.38, wallZ + dir * 0.30);
    staticGroup.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.88, 0.24), velvetSageMat);
    back.position.set(339.2, 0.78, wallZ);
    staticGroup.add(back);

    for (let px = 332.4; px <= 346.0; px += 1.7) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.14), cognacLeatherMat);
      pillow.position.set(px, 0.72, wallZ + dir * 0.18);
      pillow.rotation.x = dir * 0.18;
      staticGroup.add(pillow);
    }

    // 4 Framed Illustrated Heritage Art Prints + Brass Wall Sconces
    for (let i = 0; i < 4; i++) {
      const ax = 333.2 + i * 3.9;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.50, 0.06), darkBronzeMat);
      frame.position.set(ax, 2.52, wallFaceZ + dir * 0.04);
      staticGroup.add(frame);
      const artPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.02, 1.34),
        artPosterMats[(i + sideIdx * 2) % artPosterMats.length]
      );
      artPlane.userData.noMerge = true;
      artPlane.rotation.y = dir > 0 ? 0 : Math.PI;
      artPlane.position.set(ax, 2.52, wallFaceZ + dir * 0.08);
      staticGroup.add(artPlane);

      if (i < 3) {
        const sx = ax + 1.95;
        const sconceBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), goldTrimMat);
        sconceBase.rotation.x = Math.PI * 0.5;
        sconceBase.position.set(sx, 2.48, wallFaceZ + dir * 0.05);
        staticGroup.add(sconceBase);
        const sconceGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lanternGlassMat);
        sconceGlobe.position.set(sx, 2.60, wallFaceZ + dir * 0.16);
        staticGroup.add(sconceGlobe);
      }
    }
  });

  // 5G. Interior Café Bistro Tables, Corner Indoor Olive Trees & Self-Serve Water/Condiment Station
  [
    [338.2, 73.6],
    [343.6, 73.6],
    [338.2, 90.4],
    [343.6, 90.4],
    [346.8, 77.2],
    [346.8, 86.8],
  ].forEach(([tx, tz]) => {
    staticGroup.add(
      buildKatinatBistroSet(
        tx,
        KATINAT_PODIUM_Y,
        tz,
        warmWoodMat,
        darkSlateMat,
        goldTrimMat,
        chromeMat,
        teaCupMat
      )
    );
  });

  // NE Corner Tall Sculpted Olive / Ficus Planter Tree (X = 348.0, Z = 71.3)
  staticGroup.add(buildTerracottaPlanter(348.0, KATINAT_PODIUM_Y, 71.3, stoneCounterMat, soilMat, leafMat));
  const tallCanopy = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), leafMat);
  tallCanopy.position.set(348.0, KATINAT_PODIUM_Y + 1.56, 71.3);
  staticGroup.add(tallCanopy);

  // SE Corner Self-Service Water Carafe, Condiment & Tray-Return Station + Indoor Planter
  const condBody = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.00, 1.75), walnutMat);
  condBody.position.set(348.1, KATINAT_PODIUM_Y + 0.50, 92.6);
  staticGroup.add(condBody);
  const condTop = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 1.82), stoneCounterMat);
  condTop.position.set(348.1, KATINAT_PODIUM_Y + 1.03, 92.6);
  staticGroup.add(condTop);
  const waterDispenser = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 12), glassMat);
  waterDispenser.position.set(348.1, KATINAT_PODIUM_Y + 1.24, 92.15);
  staticGroup.add(waterDispenser);
  const waterLid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12), goldTrimMat);
  waterLid.position.set(348.1, KATINAT_PODIUM_Y + 1.43, 92.15);
  staticGroup.add(waterLid);
  const trayStack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.54), darkBronzeMat);
  trayStack.position.set(348.1, KATINAT_PODIUM_Y + 1.14, 93.05);
  staticGroup.add(trayStack);
  staticGroup.add(buildTerracottaPlanter(348.0, KATINAT_PODIUM_Y, 91.0, stoneCounterMat, soilMat, leafMat));

  // Indoor Ceiling Warm Pendant Globes & Linear Cove Strips Over Bistro Wings
  [
    [339.5, 73.6],
    [339.5, 82.0],
    [339.5, 90.4],
  ].forEach(([lx, lz]) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.06, 0.22), warmCoveMat);
    strip.position.set(lx, 4.30, lz);
    staticGroup.add(strip);
  });

  [
    [338.2, 73.6],
    [343.6, 73.6],
    [338.2, 90.4],
    [343.6, 90.4],
    [346.8, 77.2],
    [346.8, 86.8],
  ].forEach(([px, pz]) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.28, 6), darkBronzeMat);
    cord.position.set(px, 3.72, pz);
    staticGroup.add(cord);
    const shadeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, 0.10, 12), goldTrimMat);
    shadeCap.position.set(px, 3.16, pz);
    staticGroup.add(shadeCap);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), lanternGlassMat);
    globe.position.set(px, 3.00, pz);
    staticGroup.add(globe);
  });

  // =========================================================================
  // 6. LIGHTING & GROUND GLOW POOLS (BUDGET-CONSCIOUS + EVENING ATMOSPHERE)
  // =========================================================================
  const interiorLight = new THREE.PointLight(0xffe1a6, 6.2, 32.0, 0.95);
  interiorLight.position.set(340.2, 3.85, MID_Z);
  scaledLights.push({
    light: interiorLight,
    dayInt: 6.2,
    nightInt: 20.0,
    getScale: () => 1.0 - shutter.progress,
  });

  const verandaLight = new THREE.PointLight(0xffe4ad, 4.4, 24.0, 1.05);
  verandaLight.position.set(352.2, 3.35, MID_Z);
  scaledLights.push({
    light: verandaLight,
    dayInt: 4.4,
    nightInt: 16.5,
    getScale: () => 1.0 - shutter.progress,
  });

  const facadeWashLight = new THREE.PointLight(0xffd78c, 3.6, 22.0, 1.1);
  facadeWashLight.position.set(355.6, 6.2, MID_Z);
  scaledLights.push({
    light: facadeWashLight,
    dayInt: 3.6,
    nightInt: 15.0,
    getScale: () => 1.0 - shutter.progress * 0.7,
  });

  const poolTex = createKatinatGlowPoolTex();
  const groundPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(groundPoolMat);

  [74.0, 82.0, 90.0].forEach((pz) => {
    const verandaPool = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 8.2), groundPoolMat);
    verandaPool.rotation.x = -Math.PI / 2;
    verandaPool.position.set(353.5, 0.095, pz);
    staticGroup.add(verandaPool);
  });

  if (placement) {
    for (let i = 0; i < scaledLights.length; i++) {
      const lt = scaledLights[i].light;
      const wp = transformKatinatPointXZ(lt.position.x, lt.position.z, placement);
      lt.position.set(wp.x, lt.position.y, wp.z);
    }
  }

  // =========================================================================
  // 7. REAL-TIME OPERATING HOURS, AUTO-SWINGING FRENCH DOORS & LIGHTING
  // =========================================================================
  let shutterProgress = 0; // 0 = open, 1 = closed
  let doorOpenT = 0;
  let closedFactor = 0;

  const isPosNearDoor = (p?: THREE.Vector3): boolean => {
    if (!p) return false;
    let px = p.x;
    let pz = p.z;
    if (placement) {
      const lp = inverseTransformKatinatPointXZ(px, pz, placement);
      px = lp.x;
      pz = lp.z;
    }
    return px >= STORE_GLASS_X - 4.2 && px <= STORE_GLASS_X + 5.4 && pz >= 78.6 && pz <= 85.4;
  };

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: KatinatNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const open = isKatinatOpenAtHour(rawHour);

    const targetShutter = open ? 0 : 1;
    shutterProgress = THREE.MathUtils.lerp(shutterProgress, targetShutter, Math.min(1, dt * 3.5));
    if (Math.abs(shutterProgress - targetShutter) < 0.002) shutterProgress = targetShutter;
    setShutterProgress(shutter, shutterProgress);
    closedFactor = shutterProgress;

    const npcNear = npcController?.isAnyNpcNearDoor() ?? false;
    const wantDoorOpen = open && (isPosNearDoor(playerPos) || npcNear);
    doorOpenT = THREE.MathUtils.lerp(doorOpenT, wantDoorOpen ? 1 : 0, Math.min(1, dt * 6.5));
    const swingAngle = doorOpenT * (Math.PI * 0.45);
    northDoorPivot.rotation.y = -swingAngle;
    southDoorPivot.rotation.y = swingAngle;

    if (!open) {
      sensorStatusMat.color.setHex(0xef4444);
      sensorStatusMat.emissive.setHex(0xef4444);
    } else if (wantDoorOpen) {
      sensorStatusMat.color.setHex(0x22c55e);
      sensorStatusMat.emissive.setHex(0x22c55e);
    } else {
      sensorStatusMat.color.setHex(0xf59e0b);
      sensorStatusMat.emissive.setHex(0xf59e0b);
    }

    const litScale = open ? 1.0 : 0.12;
    katinatLetterMat.emissiveIntensity = (0.22 + lampFactor * 0.46) * litScale;
    transomMat.emissiveIntensity = (0.28 + lampFactor * 0.42) * litScale;
    interiorSignMat.emissiveIntensity = (0.34 + lampFactor * 0.48) * litScale;
    subRibbonMat.emissiveIntensity = (0.14 + lampFactor * 0.28) * litScale;
    quoteMat.emissiveIntensity = (0.12 + lampFactor * 0.24) * litScale;
    medallionMat.emissiveIntensity = (0.12 + lampFactor * 0.26) * litScale;
    retailHeaderMat.emissiveIntensity = (0.18 + lampFactor * 0.34) * litScale;
    artPosterMats.forEach((m) => {
      m.emissiveIntensity = (0.10 + lampFactor * 0.24) * litScale;
    });
    warmCoveMat.emissiveIntensity = (0.28 + lampFactor * 0.65) * litScale;
    lanternGlassMat.emissiveIntensity = (0.32 + lampFactor * 0.72) * litScale;
    creamTrimMat.emissiveIntensity = (0.08 + lampFactor * 0.22) * litScale;
    groundPoolMat.opacity = (0.16 + lampFactor * 0.38) * litScale;
  };

  update(0, 12.0, 0);

  let finalStaticGroup = staticGroup;
  if (placement) {
    const outerGroup = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.position.set(placement.anchorX, 0, placement.anchorZ);
    pivot.rotation.y = placement.rotationY;
    staticGroup.position.set(-KATINAT_ORIG_ANCHOR_X, 0, -KATINAT_ORIG_ANCHOR_Z);
    pivot.add(staticGroup);
    outerGroup.add(pivot);
    finalStaticGroup = outerGroup;
  }

  return {
    staticGroup: finalStaticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => closedFactor,
    update,
  };
}

// =========================================================================
// KATINAT NPC CONTROLLER (2 BARISTAS + 6 SEATED GUESTS + 3 PATRONS + 2 STROLLERS)
// =========================================================================

const KATINAT_PROFILES = [
  { shirt: 0x333e47, pants: 0x1e293b, hair: 0x171717, skinHex: '#f5c7a3' },
  { shirt: 0xfaf6eb, pants: 0x3f3f46, hair: 0x291c15, skinHex: '#fbe0c8' },
  { shirt: 0x7c5e3c, pants: 0x27272a, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0x3e5252, pants: 0xd6d3d1, hair: 0x3f2314, skinHex: '#fbe0c8' },
  { shirt: 0xc8af7e, pants: 0x18181b, hair: 0x1e1b4b, skinHex: '#f5c7a3' },
  { shirt: 0x475569, pants: 0x27272a, hair: 0x1c1917, skinHex: '#fbe0c8' },
];

type KatinatPhase =
  | 'respawn_wait'
  | 'walk_to_counter'
  | 'at_counter'
  | 'walk_to_spot'
  | 'relaxing'
  | 'walk_leave';

interface KatinatActor {
  id: number;
  root: THREE.Group;
  hipsGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  cupGroup: THREE.Group;
  kind: 'staff' | 'seated' | 'patron' | 'stroller';
  homePos: THREE.Vector3;
  homeYaw: number;
  seed: number;
  walkPhase: number;
  speed: number;
  phase: KatinatPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  stateTimer: number;
  waitYaw: number;
  spotIdx: number;
  strollDir?: 1 | -1;
  strollPauseTimer?: number;
  strollNextPause?: number;
  exiting: boolean;
  exitDone: boolean;
  exitWaypoints?: THREE.Vector3[];
  exitRef: { idx: number };
  walkPhaseRef: { phase: number };
  glbHandle: GlbHumanHandle;
}

export class KatinatNpcController {
  public readonly rootGroup = new THREE.Group();
  private actors: KatinatActor[] = [];
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

  private readonly loungeSpots = [
    { pos: new THREE.Vector3(346.0, KATINAT_PODIUM_Y, 79.0), yaw: -Math.PI * 0.5 },
    { pos: new THREE.Vector3(346.0, KATINAT_PODIUM_Y, 85.0), yaw: -Math.PI * 0.5 },
    { pos: new THREE.Vector3(340.5, KATINAT_PODIUM_Y, 76.4), yaw: 0 },
    { pos: new THREE.Vector3(340.5, KATINAT_PODIUM_Y, 87.6), yaw: Math.PI },
    { pos: new THREE.Vector3(351.8, KATINAT_PODIUM_Y, 78.6), yaw: -Math.PI * 0.35 },
  ];

  private readonly actorContainer: THREE.Group;

  constructor(
    private helpers: HospitalCharacterHelpers,
    placement?: KatinatPlacementConfig
  ) {
    this.rootGroup.userData.noMerge = true;
    const seedOffset = placement?.seedOffset ?? 0;
    if (placement) {
      const pivot = new THREE.Group();
      pivot.position.set(placement.anchorX, 0, placement.anchorZ);
      pivot.rotation.y = placement.rotationY;
      const inner = new THREE.Group();
      inner.position.set(-KATINAT_ORIG_ANCHOR_X, 0, -KATINAT_ORIG_ANCHOR_Z);
      pivot.add(inner);
      this.rootGroup.add(pivot);
      this.actorContainer = inner;
    } else {
      this.actorContainer = this.rootGroup;
    }

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 });
    const staffApronMat = new THREE.MeshStandardMaterial({ color: 0x2d3740, roughness: 0.65 });
    const cupBodyMat = new THREE.MeshStandardMaterial({ color: 0xf5ecd6, roughness: 0.45 });
    const cupBandMat = new THREE.MeshStandardMaterial({ color: 0xb08444, roughness: 0.42 });

    this.profileMats = KATINAT_PROFILES.map((p) => ({
      shirt: new THREE.MeshStandardMaterial({ color: p.shirt, roughness: 0.72 }),
      pants: new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.78 }),
      hair: new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.85 }),
      faceTex: helpers.createFaceTexture('happy', p.skinHex),
    }));

    const createActorRig = (
      kind: 'staff' | 'seated' | 'patron' | 'stroller',
      profileIdx: number,
      x: number,
      y: number,
      z: number,
      yaw: number,
      speed = 1.24
    ): KatinatActor => {
      const id = this.actors.length;
      const pm = this.profileMats[profileIdx % this.profileMats.length];
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.set(0, kind === 'seated' ? 0.52 : 0.80, 0);
      root.add(hipsGroup);

      const torsoMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.54, 0.24),
        kind === 'staff' ? staffApronMat : pm.shirt
      );
      torsoMesh.position.y = 0.28;
      hipsGroup.add(torsoMesh);

      const headMesh = helpers.createHeadMesh(this.skinMat, pm.faceTex, 0.27, 0.27, 0.27);
      headMesh.position.y = 0.72;
      hipsGroup.add(headMesh);

      const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.10, 0.29), pm.hair);
      hairMesh.position.y = 0.86;
      hipsGroup.add(hairMesh);

      const leftArm = new THREE.Group();
      leftArm.position.set(-0.27, 0.52, 0);
      const leftArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.44, 0.12),
        kind === 'staff' ? staffApronMat : pm.shirt
      );
      leftArmMesh.position.y = -0.20;
      leftArm.add(leftArmMesh);
      hipsGroup.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.27, 0.52, 0);
      const rightArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.44, 0.12),
        kind === 'staff' ? staffApronMat : pm.shirt
      );
      rightArmMesh.position.y = -0.20;
      rightArm.add(rightArmMesh);
      hipsGroup.add(rightArm);

      // Signature Katinat iced cup
      const cupGroup = new THREE.Group();
      cupGroup.position.set(0.02, -0.44, 0.08);
      const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.036, 0.15, 10), cupBodyMat);
      cupGroup.add(cupBody);
      const cupBand = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.044, 0.04, 10), cupBandMat);
      cupGroup.add(cupBand);
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
        return p;
      };
      const lLeg = makeLeg(-0.10);
      const rLeg = makeLeg(0.10);

      if (kind === 'seated') {
        lLeg.rotation.x = -Math.PI * 0.46;
        rLeg.rotation.x = -Math.PI * 0.46;
        leftArm.rotation.x = -0.42;
        rightArm.rotation.x = -0.48;
      }

      root.position.set(x, y, z);
      root.rotation.y = yaw;
      this.actorContainer.add(root);

      const seed = (id + seedOffset) * 1.93;
      const spec =
        kind === 'staff'
          ? id <= 1
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(id + 201 + seedOffset)
          : kind === 'seated'
            ? pickSeatedCivilianModel(id + 213 + seedOffset)
            : kind === 'stroller'
              ? pickOutsideNpcModel(id + 227 + seedOffset)
              : pickShopCustomerModel(id + 239 + seedOffset);

      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: root,
        fallbackMeshes: [hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState:
          kind === 'staff'
            ? 'Checkout'
            : kind === 'seated'
              ? 'Sit'
              : kind === 'stroller'
                ? 'Walk'
                : 'Idle',
        phaseOffset: seed * 0.37,
      });

      const actor: KatinatActor = {
        id,
        root,
        hipsGroup,
        leftArm,
        rightArm,
        leftLeg: lLeg,
        rightLeg: rLeg,
        cupGroup,
        kind,
        homePos: new THREE.Vector3(x, y, z),
        homeYaw: yaw,
        seed,
        walkPhase: seed,
        speed,
        phase: 'relaxing',
        pathQueue: [],
        pathIdx: 0,
        stateTimer: 5 + (id % 4) * 3,
        waitYaw: yaw,
        spotIdx: id % this.loungeSpots.length,
        exiting: false,
        exitDone: false,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      };
      this.actors.push(actor);
      return actor;
    };

    // 1. Two Baristas Behind Espresso Counter (X = 331.4, facing East +X toward entrance)
    createActorRig('staff', 0, 331.4, KATINAT_PODIUM_Y, 80.6, Math.PI * 0.5, 1.0);
    createActorRig('staff', 1, 331.4, KATINAT_PODIUM_Y, 84.8, Math.PI * 0.5, 1.0);

    // 2. Six Seated Guests (4 Indoor Lounge + 2 Covered Veranda Patio)
    const seatCoords: Array<[number, number, number]> = [
      [338.2, 74.24, Math.PI],
      [343.6, 89.76, 0],
      [346.8, 77.84, Math.PI],
      [346.8, 86.16, 0],
      [351.45, 72.74, Math.PI],
      [351.45, 91.26, 0],
    ];
    seatCoords.forEach(([sx, sz, syaw], i) => {
      createActorRig('seated', (i + 2) % KATINAT_PROFILES.length, sx, KATINAT_PODIUM_Y, sz, syaw, 1.0);
    });

    // 3. Three Walk-in Café Patrons Entering From Đường Sơn Tây Nam Sidewalk
    for (let i = 0; i < 3; i++) {
      const spot = this.loungeSpots[i % this.loungeSpots.length];
      const p = createActorRig(
        'patron',
        (i + 1) % KATINAT_PROFILES.length,
        spot.pos.x,
        spot.pos.y,
        spot.pos.z,
        spot.yaw,
        1.22 + (i % 2) * 0.1
      );
      p.spotIdx = i;
      p.phase = 'relaxing';
      p.stateTimer = 5 + i * 3.5;
      p.cupGroup.visible = true;
    }

    // 4. Two Sidewalk Strollers Along Front Sidewalk (stay clear of coastal palm line when placed on Bạch Đằng)
    const st1X = placement ? 357.5 : 358.2;
    const st2X = placement ? 357.8 : 358.8;
    const st1 = createActorRig('stroller', (4 + seedOffset) % KATINAT_PROFILES.length, st1X, 0.02, 76.0, 0, 1.15);
    st1.strollDir = 1;
    st1.strollNextPause = 4;
    const st2 = createActorRig('stroller', (5 + seedOffset) % KATINAT_PROFILES.length, st2X, 0.02, 58.0, Math.PI, 1.18);
    st2.strollDir = -1;
    st2.strollNextPause = 5.5;
  }

  private getSidewalkSpawnZ(): number {
    this.nextSpawnSide = (this.nextSpawnSide + 1) % 2;
    return this.nextSpawnSide === 0 ? 72.5 : 91.5;
  }

  private assignNewPatronOrder(a: KatinatActor) {
    const startZ = this.getSidewalkSpawnZ();
    a.root.position.set(358.0, 0.02, startZ);
    a.cupGroup.visible = false;
    const counterZ = a.id % 2 === 0 ? 80.6 : 84.8;
    a.pathQueue = [
      new THREE.Vector3(355.0, 0.02, 82.0),
      new THREE.Vector3(351.8, KATINAT_PODIUM_Y, 82.0),
      new THREE.Vector3(346.5, KATINAT_PODIUM_Y, 82.0),
      new THREE.Vector3(336.4, KATINAT_PODIUM_Y, counterZ),
    ];
    a.pathIdx = 0;
    a.phase = 'walk_to_counter';
    a.waitYaw = -Math.PI * 0.5;
    a.root.visible = true;
  }

  public isAnyNpcNearDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible) continue;
      if (a.kind === 'staff' || a.kind === 'seated' || a.kind === 'stroller') continue;
      const p = a.root.position;
      if (p.x >= 346.5 && p.x <= 354.2 && p.z >= 79.2 && p.z <= 84.8) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public update(delta: number, rawHour: number) {
    const dt = Math.min(delta, 0.1);
    this.timer += dt;

    const open = isKatinatOpenAtHour(rawHour);
    if (this.wasOpen === null) {
      this.wasOpen = open;
      if (!open) {
        this.closingActive = true;
        this.fullyClosedAndEmpty = true;
        for (let i = 0; i < this.actors.length; i++) {
          const a = this.actors[i];
          if (a.kind !== 'stroller') {
            a.root.visible = false;
            a.exiting = true;
            a.exitDone = true;
          }
        }
      }
    } else if (open !== this.wasOpen) {
      this.wasOpen = open;
      if (!open) {
        this.closingActive = true;
        this.fullyClosedAndEmpty = false;
        for (let i = 0; i < this.actors.length; i++) {
          const a = this.actors[i];
          if (a.kind === 'stroller') continue;
          a.exiting = true;
          a.exitDone = false;
          a.exitRef.idx = 0;
          if (!a.root.visible) {
            a.exitDone = true;
            continue;
          }
          a.exitWaypoints = [
            new THREE.Vector3(346.8, KATINAT_PODIUM_Y, MID_Z),
            new THREE.Vector3(351.8, KATINAT_PODIUM_Y, MID_Z),
            new THREE.Vector3(358.2, 0.02, a.id % 2 === 0 ? 70.0 : 94.0),
          ];
        }
      } else {
        this.closingActive = false;
        this.fullyClosedAndEmpty = false;
        for (let i = 0; i < this.actors.length; i++) {
          const a = this.actors[i];
          if (a.kind === 'stroller') continue;
          a.exiting = false;
          a.exitDone = false;
          a.root.visible = true;
          if (a.kind === 'staff' || a.kind === 'seated') {
            a.root.position.copy(a.homePos);
            a.root.rotation.y = a.homeYaw;
          } else {
            this.assignNewPatronOrder(a);
          }
        }
      }
    }

    if (this.closingActive) {
      let allOut = true;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        if (a.kind === 'stroller') continue;
        if (!a.exitDone && a.root.visible && a.exitWaypoints) {
          allOut = false;
          a.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(a.speed / 1.35, 0.85, 1.4));
          const done = advanceNpcExitPath(
            a.root,
            a.exitWaypoints,
            a.exitRef,
            a.speed * 1.15,
            dt,
            a.hipsGroup.visible
              ? {
                  legL: a.leftLeg,
                  legR: a.rightLeg,
                  armL: a.leftArm,
                  armR: a.rightArm,
                }
              : undefined,
            a.walkPhaseRef
          );
          if (done) {
            a.exitDone = true;
            a.root.visible = false;
          }
        }
      }
      if (allOut) this.fullyClosedAndEmpty = true;
    }

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible) {
        if (!this.closingActive && a.kind === 'patron' && a.phase === 'respawn_wait') {
          a.stateTimer -= dt;
          if (a.stateTimer <= 0) this.assignNewPatronOrder(a);
        }
        continue;
      }

      if (a.exiting && this.closingActive) continue;

      if (a.kind === 'staff') {
        a.glbHandle.setAnimState('Checkout', 1.0);
        if (a.hipsGroup.visible) {
          const sway = Math.sin(this.timer * 1.5 + a.seed);
          a.hipsGroup.position.y = 0.80 + Math.abs(sway) * 0.014;
          a.leftArm.rotation.x = -0.24 + sway * 0.10;
          a.rightArm.rotation.x = -0.34 - sway * 0.12;
        }
        continue;
      }

      if (a.kind === 'seated') {
        a.glbHandle.setAnimState('Sit', 1.0);
        if (a.hipsGroup.visible) {
          const sip = Math.sin(this.timer * 1.2 + a.seed) * 0.08;
          a.rightArm.rotation.x = -0.52 + sip;
        }
        continue;
      }

      if (a.kind === 'stroller') {
        a.strollPauseTimer = Math.max(0, (a.strollPauseTimer ?? 0) - dt);
        if ((a.strollPauseTimer ?? 0) > 0) {
          a.glbHandle.setAnimState('Idle', 1.0);
          a.root.rotation.y = THREE.MathUtils.lerp(a.root.rotation.y, -Math.PI * 0.5, Math.min(1, dt * 4));
          if (a.hipsGroup.visible) {
            a.leftLeg.rotation.x = 0;
            a.rightLeg.rotation.x = 0;
            a.leftArm.rotation.x = 0;
            a.rightArm.rotation.x = 0;
          }
        } else {
          a.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(a.speed / 1.35, 0.85, 1.4));
          const dir = a.strollDir ?? 1;
          a.root.position.z += dir * a.speed * dt;
          a.strollNextPause = (a.strollNextPause ?? 4) - dt;
          if ((a.strollNextPause ?? 0) <= 0 && a.root.position.z >= 75.0 && a.root.position.z <= 89.0) {
            a.strollPauseTimer = 2.6;
            a.strollNextPause = 7.5 + (a.id % 3) * 2.0;
          }
          if (a.root.position.z >= 94.0) a.strollDir = -1;
          if (a.root.position.z <= 48.0) a.strollDir = 1;
          const targetYaw = (a.strollDir ?? 1) > 0 ? 0 : Math.PI;
          let diff = targetYaw - a.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.root.rotation.y += diff * Math.min(1, dt * 6);
          if (a.hipsGroup.visible) {
            a.walkPhase += dt * a.speed * 4.2;
            const swing = Math.sin(a.walkPhase) * 0.52;
            a.leftLeg.rotation.x = swing;
            a.rightLeg.rotation.x = -swing;
            a.leftArm.rotation.x = -swing * 0.65;
            a.rightArm.rotation.x = swing * 0.65;
            a.hipsGroup.position.y = 0.80 + Math.abs(Math.cos(a.walkPhase)) * 0.03;
          }
        }
        continue;
      }

      // Walk-in Patron state machine
      if (a.phase === 'walk_to_counter' || a.phase === 'walk_to_spot' || a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(a.speed / 1.35, 0.85, 1.4));
        const target = a.pathQueue[a.pathIdx];
        if (!target) {
          if (a.phase === 'walk_to_counter') {
            a.phase = 'at_counter';
            a.stateTimer = 3.2;
          } else if (a.phase === 'walk_to_spot') {
            a.phase = 'relaxing';
            a.stateTimer = 7.0 + (a.id % 3) * 2.5;
          } else {
            a.root.visible = false;
            a.phase = 'respawn_wait';
            a.stateTimer = 2.0 + a.id * 1.1;
          }
          continue;
        }
        const dx = target.x - a.root.position.x;
        const dz = target.z - a.root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.25) {
          a.pathIdx++;
        } else {
          const step = Math.min(dist, a.speed * dt);
          a.root.position.x += (dx / dist) * step;
          a.root.position.z += (dz / dist) * step;
          a.root.position.y = THREE.MathUtils.lerp(a.root.position.y, target.y, Math.min(1, dt * 8));
          const targetYaw = Math.atan2(dx, dz);
          let diff = targetYaw - a.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.root.rotation.y += diff * Math.min(1, dt * 8);
          if (a.hipsGroup.visible) {
            a.walkPhase += dt * a.speed * 4.2;
            const swing = Math.sin(a.walkPhase) * 0.50;
            a.leftLeg.rotation.x = swing;
            a.rightLeg.rotation.x = -swing;
            a.leftArm.rotation.x = -swing * 0.65;
            a.rightArm.rotation.x = a.cupGroup.visible ? -0.35 : swing * 0.65;
            a.hipsGroup.position.y = 0.80 + Math.abs(Math.cos(a.walkPhase)) * 0.03;
          }
        }
      } else {
        a.glbHandle.setAnimState('Idle', 1.0);
        let diff = a.waitYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 5);
        if (a.hipsGroup.visible) {
          a.leftLeg.rotation.x = 0;
          a.rightLeg.rotation.x = 0;
          a.leftArm.rotation.x = 0;
          a.rightArm.rotation.x = a.cupGroup.visible ? -0.45 : -0.20;
        }
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          if (a.phase === 'at_counter') {
            a.cupGroup.visible = true;
            a.spotIdx = (a.spotIdx + 1) % this.loungeSpots.length;
            const spot = this.loungeSpots[a.spotIdx];
            a.pathQueue = [new THREE.Vector3(338.5, KATINAT_PODIUM_Y, 82.0), spot.pos.clone()];
            a.pathIdx = 0;
            a.waitYaw = spot.yaw;
            a.phase = 'walk_to_spot';
          } else if (a.phase === 'relaxing') {
            const leaveZ = this.getSidewalkSpawnZ();
            a.pathQueue = [
              new THREE.Vector3(346.8, KATINAT_PODIUM_Y, 82.0),
              new THREE.Vector3(351.8, KATINAT_PODIUM_Y, 82.0),
              new THREE.Vector3(355.0, 0.02, 82.0),
              new THREE.Vector3(358.2, 0.02, leaveZ),
            ];
            a.pathIdx = 0;
            a.phase = 'walk_leave';
          }
        }
      }
    }
  }
}
