import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  createStarbucksEmblemTexture,
  createStarbucksMenuBoardTexture,
} from './StarbucksCafeSystem';
import { attachGlbHumanToNpc, steerYawSmooth, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

/**
 * STARBUCKS RESERVE® ROASTERY — Chi nhánh Flagship 2 Tầng Đường Bạch Đằng
 * - Vị trí: Ngay bên cạnh ADIDAS Flagship Bạch Đằng (X = -50.4 .. -24.4)
 * - Footprint: X = -86.0 .. -52.0 (rộng 34.0m), Z = -104.0 .. -74.0 (sâu 30.0m)
 * - Mặt tiền quay hướng Bắc (-Z) nhìn thẳng ra Đường Bạch Đằng & Sông Hàn
 * - Thiết kế mở 24/7 với sân vườn cafe mặt sông, cửa kính tự động rộng 4.8m,
 *   lò rang cà phê đồng thủ công cao 8.5m thông tầng & tầng 2 kính toàn cảnh view Sông Hàn.
 */
export const STARBUCKS_BD_MIN_X = -86.0;
export const STARBUCKS_BD_MAX_X = -52.0;
export const STARBUCKS_BD_MIN_Z = -104.0;
export const STARBUCKS_BD_MAX_Z = -74.0;
export const STARBUCKS_BD_PODIUM_Y = 0.24;
export const STARBUCKS_BD_FLOOR_H = 4.6;
export const STARBUCKS_BD_FLOOR2_Y = STARBUCKS_BD_PODIUM_Y + STARBUCKS_BD_FLOOR_H; // 4.84m

export interface StarbucksBachDangBuildResult {
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
    npcController?: StarbucksBachDangNpcController | null
  ) => void;
}

// =========================================================================
// COLLIDERS (Floor 1, Floor 2 & 'both')
// Open Entrance Promenade: X = -72.2 .. -65.8 (patio) -> Door X = -71.4 .. -66.6 at Z = -99.8
// Switchback Stairwell (SW corner): X = -84.8 .. -79.8, Z = -81.8 .. -74.8
//   - Flight 1 (East lane X = -82.2 .. -79.8): enters at Z = -81.8 (F1) -> climbs south to landing Z = -76.6..-74.8
//   - Flight 2 (West lane X = -84.8 .. -82.4): climbs north from Z = -76.6 -> exits onto Floor 2 at Z = -81.8
// =========================================================================
export const STARBUCKS_BACH_DANG_COLLIDERS: IntersectionColliderBox[] = [
  // Structural Outer Perimeter Walls (both floors)
  { minX: -86.2, maxX: -85.3, minZ: -100.1, maxZ: -73.8, floor: 'both' }, // West Wall
  { minX: -52.7, maxX: -51.8, minZ: -100.1, maxZ: -73.8, floor: 'both' }, // East Wall
  { minX: -86.1, maxX: -51.9, minZ: -74.7, maxZ: -73.8, floor: 'both' }, // South Rear Wall

  // Front Floor 1 Curtain Wall (Wide Open Door Aperture: X = -71.4 .. -66.6 at Z = -99.8)
  { minX: -86.0, maxX: -71.4, minZ: -100.15, maxZ: -99.45, floor: 1 }, // Front F1 West Glass & Piers
  { minX: -66.6, maxX: -52.0, minZ: -100.15, maxZ: -99.45, floor: 1 }, // Front F1 East Glass & Piers

  // Front Floor 2 Full Panoramic Glass Facade (Z = -100.1)
  { minX: -86.0, maxX: -52.0, minZ: -100.3, maxZ: -99.5, floor: 2 },

  // Outdoor Waterfront Patio Bistro Tables & Planters (leave wide X = -73.0 .. -65.0 promenade clear!)
  { minX: -85.8, maxX: -83.2, minZ: -103.9, maxZ: -103.0, floor: 1 }, // Patio West Boxwood Planter
  { minX: -54.8, maxX: -52.2, minZ: -103.9, maxZ: -103.0, floor: 1 }, // Patio East Boxwood Planter
  { minX: -81.6, maxX: -79.2, minZ: -102.9, maxZ: -100.9, floor: 1 }, // Patio Bistro Set 1 (Far West)
  { minX: -76.5, maxX: -74.1, minZ: -102.9, maxZ: -100.9, floor: 1 }, // Patio Bistro Set 2 (Mid West)
  { minX: -63.9, maxX: -61.5, minZ: -102.9, maxZ: -100.9, floor: 1 }, // Patio Bistro Set 3 (Mid East)
  { minX: -58.8, maxX: -56.4, minZ: -102.9, maxZ: -100.9, floor: 1 }, // Patio Bistro Set 4 (Far East)

  // Floor 1 Centerpiece Copper Roaster Cask Plinth (X = -69.0, Z = -87.8)
  { minX: -71.5, maxX: -66.5, minZ: -90.2, maxZ: -85.4, floor: 1 },

  // Floor 1 Grand Reserve Espresso & Pastry Island Bar (X = -76.5 .. -61.5, Z = -82.0 .. -78.6)
  { minX: -76.5, maxX: -61.5, minZ: -82.2, maxZ: -78.4, floor: 1 },
  // Floor 1 Rear Espresso Backbar & Cold Brew Equipment Wall
  { minX: -76.5, maxX: -61.5, minZ: -75.6, maxZ: -74.4, floor: 1 },

  // Floor 1 West Wing — Merchandise Gallery & Velvet Window Booths
  { minX: -85.3, maxX: -83.9, minZ: -96.5, maxZ: -85.5, floor: 1 }, // West Tumbler & Bean Shelving Wall
  { minX: -82.5, maxX: -77.5, minZ: -96.6, maxZ: -94.0, floor: 1 }, // West Front Window Lounge 1
  { minX: -82.5, maxX: -77.5, minZ: -91.4, maxZ: -88.8, floor: 1 }, // West Mid Window Lounge 2

  // Floor 1 East Wing — Communal Live-Edge Oak Work Table & Reading Nook
  { minX: -61.4, maxX: -56.0, minZ: -94.4, maxZ: -91.2, floor: 1 }, // Grand Communal Oak Work Table
  { minX: -60.5, maxX: -56.0, minZ: -86.6, maxZ: -83.8, floor: 1 }, // East Sofa Lounge Set
  { minX: -54.2, maxX: -52.6, minZ: -97.5, maxZ: -77.5, floor: 1 }, // East Wall Banquette & Bookshelf

  // Floor 1 Stairwell Side Enclosures (leave North entry at Z = -81.8 open!)
  { minX: -79.95, maxX: -79.45, minZ: -81.8, maxZ: -74.5, floor: 1 }, // Stairwell East Wall (F1)

  // Floor 2 Double-Height Atrium Void Glass Guardrails (open air hole: X = -75.0 .. -63.0, Z = -92.0 .. -82.5)
  { minX: -75.2, maxX: -62.8, minZ: -92.2, maxZ: -82.3, floor: 2 },

  // Floor 2 Stairwell Guardrail (protects drop along East side of stairwell; West flight opens North at Z = -81.8)
  { minX: -79.95, maxX: -79.45, minZ: -81.8, maxZ: -74.5, floor: 2 },

  // Floor 2 Panoramic Riverfront Window Bar (Z = -99.5 .. -98.2)
  { minX: -83.0, maxX: -55.0, minZ: -99.5, maxZ: -98.0, floor: 2 },

  // Floor 2 West Wing — Emerald Velvet Sofa Lounges
  { minX: -83.6, maxX: -78.2, minZ: -93.0, maxZ: -90.2, floor: 2 }, // F2 West Sofa 1
  { minX: -83.6, maxX: -78.2, minZ: -87.4, maxZ: -84.6, floor: 2 }, // F2 West Sofa 2

  // Floor 2 East Wing — Cold Brew & Matcha Bar + Library Tables
  { minX: -59.5, maxX: -53.2, minZ: -81.0, maxZ: -78.8, floor: 2 }, // F2 Matcha & Cold Brew Bar
  { minX: -60.2, maxX: -55.2, minZ: -92.0, maxZ: -89.0, floor: 2 }, // F2 East Library Table
  { minX: -54.0, maxX: -52.6, minZ: -96.5, maxZ: -82.5, floor: 2 }, // F2 East Roastery Bookshelf Wall
  { minX: -72.8, maxX: -65.2, minZ: -77.6, maxZ: -74.9, floor: 2 }, // F2 South Vinyl & Listening Credenza
];

// =========================================================================
// PROCEDURAL HIGH-DPI TEXTURES (Zero external files)
// =========================================================================
function createReserveCrownSignTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 280;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0d1a15');
  grad.addColorStop(0.5, '#07110d');
  grad.addColorStop(1, '#0d1a15');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Brushed brass & emerald pin-stripes
  ctx.fillStyle = '#00704A';
  ctx.fillRect(0, 0, w, 16);
  ctx.fillRect(0, h - 16, w, 16);
  ctx.fillStyle = '#d4a359';
  ctx.fillRect(0, 16, w, 5);
  ctx.fillRect(0, h - 21, w, 5);

  // Subtle decorative stars on flanks
  ctx.fillStyle = '#d4a359';
  ctx.font = '900 72px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 150, h / 2 - 22);
  ctx.fillText('★', w - 150, h / 2 - 22);
  ctx.font = '800 42px Georgia, serif';
  ctx.fillText('R', 150, h / 2 + 44);
  ctx.fillText('R', w - 150, h / 2 + 44);

  // Main flagship wordmark
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 108px system-ui, -apple-system, sans-serif';
  ctx.fillText('S T A R B U C K S', w / 2, h / 2 - 26);

  ctx.fillStyle = '#d4a359';
  ctx.font = '800 40px system-ui, -apple-system, sans-serif';
  ctx.fillText('R E S E R V E ®   R O A S T E R Y   •   B Ạ C H   Đ Ằ N G', w / 2, h / 2 + 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createReservePlaqueTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#121815';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#d4a359';
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, s - 40, s - 40);

  ctx.fillStyle = '#d4a359';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 130px system-ui, sans-serif';
  ctx.fillText('★', s / 2, 160);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 165px Georgia, serif';
  ctx.fillText('R', s / 2, 315);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText('RESERVE ROASTERY', s / 2, 435);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createStairSignTexture(): THREE.CanvasTexture {
  const w = 768;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0e1b16';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d4a359';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#d4a359';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↑ TẦNG 2 • RIVER VIEW LOUNGE', w / 2, 68);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText('STARBUCKS RESERVE®  •  MATCHA & COLD BREW BAR', w / 2, 132);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createRoasteryMuralTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0a291f');
  grad.addColorStop(0.5, '#071b14');
  grad.addColorStop(1, '#1c1917');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Stylized botanical coffee leaf curves in gold
  ctx.strokeStyle = 'rgba(212, 163, 89, 0.35)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(140 + i * 155, 256 + (i % 2 === 0 ? -40 : 40), 120, 0, Math.PI * 1.4);
    ctx.stroke();
  }

  ctx.strokeStyle = '#d4a359';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 68px Georgia, serif';
  ctx.fillText('HAN RIVER ROASTERY ★', w / 2, 175);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText('SMALL-LOT ARABICA  •  HANDCRAFTED ESPRESSO  •  ĐÀ NẴNG', w / 2, 275);

  ctx.fillStyle = '#d4a359';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText('OPEN 24 HOURS  •  FLOOR 1 ROASTERY & FLOOR 2 WATERFRONT LOUNGE', w / 2, 360);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createWarmWoodPlankTexture(baseHex: string, grainHex: string): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, s, s);

  // Subtle planks
  const rows = 8;
  const rh = s / rows;
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = r % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, r * rh, s, rh);
    ctx.fillStyle = grainHex;
    ctx.fillRect(0, r * rh, s, 2);
    for (let g = 0; g < 6; g++) {
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, r * rh + 6 + g * 9, s, 1.5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}

function createTerrazzoFloorTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e7e2d6';
  ctx.fillRect(0, 0, s, s);

  // Large tile grout grid
  ctx.strokeStyle = 'rgba(120, 113, 108, 0.25)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    const p = (i * s) / 4;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(s, p);
    ctx.stroke();
  }

  // Terrazzo mineral flecks (deterministic pseudo-random)
  const flecks = ['#a8a29e', '#78716c', '#00704A', '#d4a359', '#f5f5f4'];
  for (let i = 0; i < 240; i++) {
    const fx = ((i * 73 + 19) % 496) + 8;
    const fy = ((i * 137 + 41) % 496) + 8;
    const r = 2 + (i % 4);
    ctx.fillStyle = flecks[i % flecks.length];
    ctx.globalAlpha = 0.32;
    ctx.fillRect(fx, fy, r, r);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 6);
  return tex;
}

function createRadialGlowPoolTexture(rgb: string): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
  g.addColorStop(0, `rgba(${rgb}, 0.55)`);
  g.addColorStop(0.5, `rgba(${rgb}, 0.20)`);
  g.addColorStop(1, `rgba(${rgb}, 0.0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBarCanopySignTexture(title: string, subtitle: string): THREE.CanvasTexture {
  const w = 1024;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0d1a15';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d4a359';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, w / 2, 62);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '700 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(subtitle, w / 2, 118);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createWelcomeEaselTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0b1914';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d4a359';
  ctx.lineWidth = 12;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = '#d4a359';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.fillText('★ R', w / 2, 110);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px Georgia, serif';
  ctx.fillText('STARBUCKS RESERVE', w / 2, 188);

  ctx.fillStyle = '#34d399';
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText('SIGNATURE ROASTS TODAY', w / 2, 260);

  ctx.fillStyle = '#f5f5f4';
  ctx.font = '700 24px system-ui, sans-serif';
  const items = [
    '• Cầu Đất Arabica Pour-Over',
    '• Smoked Butterscotch Latte',
    '• Reserve Nitro Cold Brew',
    '• Kyoto Matcha Cream Cloud',
    '• Hazelnut Bianco Cortado',
    '• Fresh Butter Croissant',
  ];
  items.forEach((line, idx) => {
    ctx.fillText(line, w / 2, 340 + idx * 54);
  });

  ctx.fillStyle = '#d4a359';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('OPEN 24 HOURS • FLOOR 1 & 2', w / 2, 692);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createEmeraldRugTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0c3b2e';
  ctx.fillRect(0, 0, s, s);

  // Subtle woven fabric texture
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < s; y += 6) {
    ctx.fillRect(0, y, s, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let x = 0; x < s; x += 8) {
    ctx.fillRect(x, 0, 2, s);
  }

  // Double gold art-deco borders
  ctx.strokeStyle = '#d4a359';
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, s - 48, s - 48);
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, s - 96, s - 96);

  // Subtle geometric diamond center motif
  ctx.strokeStyle = 'rgba(212, 163, 89, 0.35)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(s / 2, 92);
  ctx.lineTo(s - 92, s / 2);
  ctx.lineTo(s / 2, s - 92);
  ctx.lineTo(92, s / 2);
  ctx.closePath();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// =========================================================================
// STRUCTURE BUILDER
// =========================================================================
export function createStarbucksBachDangStructure(): StarbucksBachDangBuildResult {
  const staticGroup = new THREE.Group();
  staticGroup.name = 'StarbucksBachDangFlagship2F';

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = STARBUCKS_BD_MIN_X; // -86.0
  const maxX = STARBUCKS_BD_MAX_X; // -52.0
  const centerX = (minX + maxX) * 0.5; // -69.0
  const width = maxX - minX; // 34.0
  const patioFrontZ = STARBUCKS_BD_MIN_Z; // -104.0
  const glassFrontZ = -99.8;
  const backZ = STARBUCKS_BD_MAX_Z; // -74.0
  const f1Y = STARBUCKS_BD_PODIUM_Y; // 0.24
  const f2Y = STARBUCKS_BD_FLOOR2_Y; // 4.84
  const roofBottomY = f2Y + 4.35; // 9.19
  const roofTopY = roofBottomY + 0.65; // 9.84

  // --- PBR Material Palette (Rich roughness/metalness contrast) ---
  const travertineMat = new THREE.MeshStandardMaterial({
    color: 0xe6dfd1,
    roughness: 0.72,
    metalness: 0.04,
  });
  const terrazzoMat = new THREE.MeshStandardMaterial({
    map: createTerrazzoFloorTexture(),
    roughness: 0.34,
    metalness: 0.08,
  });
  const walnutWoodMat = new THREE.MeshStandardMaterial({
    map: createWarmWoodPlankTexture('#5c3a21', '#3b2413'),
    roughness: 0.52,
    metalness: 0.06,
  });
  const cedarSoffitMat = new THREE.MeshStandardMaterial({
    map: createWarmWoodPlankTexture('#8c5a32', '#5e391d'),
    roughness: 0.62,
    metalness: 0.04,
  });
  const lightOakMat = new THREE.MeshStandardMaterial({
    map: createWarmWoodPlankTexture('#b5895a', '#8c643c'),
    roughness: 0.5,
    metalness: 0.04,
  });
  const espressoSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.36,
    metalness: 0.72,
  });
  const bronzeTrimMat = new THREE.MeshStandardMaterial({
    color: 0xb68a4c,
    roughness: 0.24,
    metalness: 0.86,
  });
  const hammeredCopperMat = new THREE.MeshStandardMaterial({
    color: 0xc87533,
    roughness: 0.22,
    metalness: 0.9,
  });
  const sbEmeraldMat = new THREE.MeshStandardMaterial({
    color: 0x00704a,
    roughness: 0.42,
    metalness: 0.12,
  });
  const deepEmeraldMat = new THREE.MeshStandardMaterial({
    color: 0x064e3b,
    roughness: 0.75,
    metalness: 0.04,
  });
  const velvetGreenMat = new THREE.MeshStandardMaterial({
    color: 0x0f5132,
    roughness: 0.88,
    metalness: 0.02,
  });
  const cognacLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.48,
    metalness: 0.08,
  });
  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8f6f0,
    roughness: 0.22,
    metalness: 0.1,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.14,
    metalness: 0.92,
  });
  const creamPlasterMat = new THREE.MeshStandardMaterial({
    color: 0xf3eee3,
    roughness: 0.8,
    metalness: 0.02,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdcf2ec,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const clearBalustradeMat = new THREE.MeshStandardMaterial({
    color: 0xe2f5f0,
    roughness: 0.06,
    metalness: 0.12,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x1e6b3a,
    roughness: 0.85,
    metalness: 0.0,
  });
  const foliageDarkMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.88,
    metalness: 0.0,
  });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d6,
    emissive: 0xffc56e,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.0,
  });
  lanternMats.push(warmGlowMat);

  const emeraldNeonMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x00a86b,
    emissiveIntensity: 0.95,
    roughness: 0.25,
    metalness: 0.1,
  });
  neonMats.push(emeraldNeonMat);

  const amberRoasterGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.05,
    roughness: 0.2,
    metalness: 0.1,
  });
  lanternMats.push(amberRoasterGlowMat);

  const addBox = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    z1: number,
    z2: number,
    mat: THREE.Material,
    parent: THREE.Object3D = staticGroup
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(x2 - x1), Math.abs(y2 - y1), Math.abs(z2 - z1)),
      mat
    );
    mesh.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5);
    parent.add(mesh);
    return mesh;
  };

  // =========================================================================
  // 1. PODIUM TERRACE, WATERFRONT STEPS & FLOOR SLABS (Zero Z-Fighting)
  // =========================================================================
  // Lower sub-podium step along Đường Bạch Đằng sidewalk edge
  addBox(minX, maxX, -0.18, 0.12, patioFrontZ, patioFrontZ + 1.2, travertineMat);
  // Main Ground Floor Podium Terrace (Patio + Interior) — cleanly inset inside side walls
  addBox(minX + 0.04, maxX - 0.04, 0.0, f1Y, patioFrontZ + 0.55, backZ - 0.04, travertineMat);
  // Interior Terrazzo Floor Skin (inset 0.45m inside exterior walls, +0.015m above podium to prevent z-fighting)
  addBox(minX + 0.5, maxX - 0.5, f1Y - 0.02, f1Y + 0.015, glassFrontZ + 0.05, backZ - 0.5, terrazzoMat);

  // Brass threshold inlay strip at doorway
  addBox(centerX - 2.6, centerX + 2.6, f1Y + 0.004, f1Y + 0.022, glassFrontZ - 0.18, glassFrontZ + 0.18, bronzeTrimMat);

  // =========================================================================
  // 2. OUTER STRUCTURAL SHELL (West, East, South Walls + Ceiling & Cantilevered Roof)
  // =========================================================================
  // West Structural Wall (0.60m thick: X = -86.0 .. -85.4, full height 0..roofBottomY)
  addBox(minX, minX + 0.6, 0.0, roofBottomY, glassFrontZ - 0.1, backZ, creamPlasterMat);
  // East Structural Wall (0.60m thick: X = -52.6 .. -52.0, full height 0..roofBottomY)
  addBox(maxX - 0.6, maxX, 0.0, roofBottomY, glassFrontZ - 0.1, backZ, creamPlasterMat);
  // South Rear Structural Wall (inset 0.08m inside East/West walls so corners never z-fight!)
  addBox(minX + 0.08, maxX - 0.08, 0.0, roofBottomY, backZ - 0.6, backZ, creamPlasterMat);

  // Exterior Architectural Walnut Vertical Cladding Bands on West & East Flanks (stand 0.05m proud)
  for (let z = glassFrontZ + 1.0; z <= backZ - 1.0; z += 3.2) {
    addBox(minX - 0.06, minX + 0.01, 0.3, roofBottomY - 0.2, z - 0.22, z + 0.22, walnutWoodMat);
    addBox(maxX - 0.01, maxX + 0.06, 0.3, roofBottomY - 0.2, z - 0.22, z + 0.22, walnutWoodMat);
  }
  // Horizontal dark bronze belt-course wrap at Floor 2 slab height (stands 0.08m proud)
  addBox(minX - 0.08, minX + 0.02, f2Y - 0.38, f2Y + 0.06, glassFrontZ - 0.12, backZ + 0.04, espressoSteelMat);
  addBox(maxX - 0.02, maxX + 0.08, f2Y - 0.38, f2Y + 0.06, glassFrontZ - 0.12, backZ + 0.04, espressoSteelMat);

  // Interior Warm Walnut Wainscoting & Cream Acoustic Wall Panels (inset inside walls)
  addBox(minX + 0.6, minX + 0.72, f1Y, f1Y + 1.4, glassFrontZ + 0.2, backZ - 0.65, walnutWoodMat);
  addBox(maxX - 0.72, maxX - 0.6, f1Y, f1Y + 1.4, glassFrontZ + 0.2, backZ - 0.65, walnutWoodMat);
  addBox(minX + 0.7, maxX - 0.7, f1Y, roofBottomY - 0.2, backZ - 0.72, backZ - 0.6, deepEmeraldMat);

  // Sculptural Cantilevered Flagship Roof & Cedar Soffit Overhang (projects 2.4m over patio!)
  addBox(minX - 0.55, maxX + 0.55, roofBottomY, roofTopY, glassFrontZ - 2.6, backZ + 0.4, espressoSteelMat);
  // Warm Cedar Wood Underside Soffit on the cantilevered overhang
  addBox(minX - 0.35, maxX + 0.35, roofBottomY - 0.08, roofBottomY, glassFrontZ - 2.4, glassFrontZ + 0.2, cedarSoffitMat);
  // Upper Rooftop Crown Parapet & Emerald Accent Trim
  addBox(minX - 0.62, maxX + 0.62, roofTopY, roofTopY + 0.18, glassFrontZ - 2.66, backZ + 0.45, bronzeTrimMat);
  addBox(minX - 0.4, maxX + 0.4, roofBottomY - 0.11, roofBottomY - 0.07, glassFrontZ - 2.35, glassFrontZ - 2.22, warmGlowMat);
  // Warm Emerald Accent Strip along top fascia edge
  addBox(minX - 0.6, maxX + 0.6, roofBottomY + 0.05, roofBottomY + 0.14, glassFrontZ - 2.66, glassFrontZ - 2.58, emeraldNeonMat);

  // =========================================================================
  // 3. GRAND TWO-STORY NORTH GLASS FACADE, COLUMNS & BRAND SIGNAGE
  // =========================================================================
  // Front Structural Piers (Espresso Steel + Fluted Walnut)
  const pierXs = [minX + 0.35, -78.6, -71.65, -66.35, -59.4, maxX - 0.35];
  pierXs.forEach((px) => {
    addBox(px - 0.32, px + 0.32, f1Y, roofBottomY, glassFrontZ - 0.32, glassFrontZ + 0.22, espressoSteelMat);
    addBox(px - 0.16, px + 0.16, f1Y + 0.1, roofBottomY - 0.1, glassFrontZ - 0.38, glassFrontZ - 0.31, bronzeTrimMat);
  });

  // Floor 2 Mid-Level Cantilevered Architectural Brow / Balcony Beam (Z = -101.2 .. -99.5)
  addBox(minX - 0.25, maxX + 0.25, f2Y - 0.38, f2Y + 0.08, glassFrontZ - 1.45, glassFrontZ + 0.25, espressoSteelMat);
  addBox(minX - 0.15, maxX + 0.15, f2Y - 0.44, f2Y - 0.38, glassFrontZ - 1.35, glassFrontZ + 0.1, cedarSoffitMat);
  addBox(minX - 0.28, maxX + 0.28, f2Y - 0.02, f2Y + 0.06, glassFrontZ - 1.48, glassFrontZ - 1.41, bronzeTrimMat);
  // Under-brow warm cove light over entrance & patio
  addBox(minX + 0.6, maxX - 0.6, f2Y - 0.47, f2Y - 0.43, glassFrontZ - 1.22, glassFrontZ - 1.12, warmGlowMat);

  // Floor 1 Front Fixed Glass Bays (West & East of the 4.8m automatic entrance)
  addBox(minX + 0.65, centerX - 2.4, f1Y + 0.08, f2Y - 0.38, glassFrontZ - 0.04, glassFrontZ + 0.04, glassMat);
  addBox(centerX + 2.4, maxX - 0.65, f1Y + 0.08, f2Y - 0.38, glassFrontZ - 0.04, glassFrontZ + 0.04, glassMat);
  // Transom glass above automatic entrance doors
  addBox(centerX - 2.4, centerX + 2.4, f1Y + 3.05, f2Y - 0.38, glassFrontZ - 0.04, glassFrontZ + 0.04, glassMat);
  addBox(centerX - 2.55, centerX + 2.55, f1Y + 2.95, f1Y + 3.12, glassFrontZ - 0.14, glassFrontZ + 0.14, espressoSteelMat);

  // Floor 2 Full-Span Panoramic Riverfront Glass Curtain Wall (34m wide!)
  addBox(minX + 0.65, maxX - 0.65, f2Y + 0.08, roofBottomY - 0.08, glassFrontZ - 0.04, glassFrontZ + 0.04, glassMat);
  // Rhythmic slender bronze glass mullions across Floor 1 & Floor 2
  for (let mx = minX + 2.8; mx <= maxX - 2.8; mx += 2.6) {
    if (Math.abs(mx - centerX) < 2.65) continue;
    addBox(mx - 0.04, mx + 0.04, f1Y + 0.05, f2Y - 0.38, glassFrontZ - 0.09, glassFrontZ + 0.09, espressoSteelMat);
  }
  for (let mx = minX + 2.4; mx <= maxX - 2.4; mx += 2.4) {
    addBox(mx - 0.045, mx + 0.045, f2Y + 0.08, roofBottomY - 0.06, glassFrontZ - 0.09, glassFrontZ + 0.09, espressoSteelMat);
  }
  // Decorative vertical walnut louvre fins framing East & West upper corners
  for (let i = 0; i < 6; i++) {
    const lxW = minX + 0.9 + i * 0.45;
    const lxE = maxX - 0.9 - i * 0.45;
    addBox(lxW - 0.05, lxW + 0.05, f2Y + 0.12, roofBottomY - 0.05, glassFrontZ - 0.45, glassFrontZ - 0.1, walnutWoodMat);
    addBox(lxE - 0.05, lxE + 0.05, f2Y + 0.12, roofBottomY - 0.05, glassFrontZ - 0.45, glassFrontZ - 0.1, walnutWoodMat);
  }

  // --- ILLUMINATED CROWN SIGNAGE & 3D SIREN MEDALLION (Facing North -Z toward Sông Hàn!) ---
  const crownSignTex = createReserveCrownSignTexture();
  const crownSignMat = new THREE.MeshStandardMaterial({
    map: crownSignTex,
    emissive: 0xffffff,
    emissiveMap: crownSignTex,
    emissiveIntensity: 0.72,
    roughness: 0.25,
    metalness: 0.1,
  });
  neonMats.push(crownSignMat);

  // Backlit fascia lightbox centered on the cantilevered roof crown (23m x 2.0m)
  addBox(centerX - 11.7, centerX + 11.7, roofBottomY + 0.02, roofTopY + 1.55, glassFrontZ - 2.74, glassFrontZ - 2.42, espressoSteelMat);
  const frontSignFace = new THREE.Mesh(new THREE.PlaneGeometry(23.0, 2.0), crownSignMat);
  frontSignFace.position.set(centerX, roofBottomY + 1.08, glassFrontZ - 2.76);
  frontSignFace.rotation.y = Math.PI; // Face North (-Z) toward Đường Bạch Đằng & Sông Hàn
  staticGroup.add(frontSignFace);

  // Iconic 3D Glowing Circular Starbucks Siren Medallion (2.5m diameter) above central entrance!
  const emblemTex = createStarbucksEmblemTexture(512);
  const emblemFaceMat = new THREE.MeshStandardMaterial({
    map: emblemTex,
    emissive: 0xffffff,
    emissiveMap: emblemTex,
    emissiveIntensity: 0.78,
    roughness: 0.22,
    metalness: 0.08,
    transparent: true,
  });
  neonMats.push(emblemFaceMat);

  const medallionGroup = new THREE.Group();
  medallionGroup.position.set(centerX, f2Y - 0.16, glassFrontZ - 1.55);
  const medHousing = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.24, 36), bronzeTrimMat);
  medHousing.rotation.x = Math.PI / 2;
  medallionGroup.add(medHousing);
  const medFaceFront = new THREE.Mesh(new THREE.CircleGeometry(1.22, 36), emblemFaceMat);
  medFaceFront.position.z = -0.13;
  medFaceFront.rotation.y = Math.PI;
  medallionGroup.add(medFaceFront);
  const medHalo = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.045, 12, 48), emeraldNeonMat);
  medHalo.position.z = -0.02;
  medallionGroup.add(medHalo);
  staticGroup.add(medallionGroup);

  // Flanking Reserve "★ R" Illuminated Plaques on East & West front piers
  const reservePlaqueTex = createReservePlaqueTexture();
  const reservePlaqueMat = new THREE.MeshStandardMaterial({
    map: reservePlaqueTex,
    emissive: 0xffffff,
    emissiveMap: reservePlaqueTex,
    emissiveIntensity: 0.65,
    roughness: 0.28,
    metalness: 0.15,
  });
  neonMats.push(reservePlaqueMat);
  [minX + 0.35, maxX - 0.35].forEach((px) => {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), reservePlaqueMat);
    plaque.position.set(px, f1Y + 2.35, glassFrontZ - 0.4);
    plaque.rotation.y = Math.PI;
    staticGroup.add(plaque);
  });

  // --- AUTOMATIC DOUBLE SLIDING GLASS DOORS (4.8m wide aperture: X = -71.4 .. -66.6) ---
  // Overhead infrared motion-sensor bar & recessed brushed steel floor slide rail
  addBox(centerX - 2.6, centerX + 2.6, f1Y + 3.02, f1Y + 3.16, glassFrontZ - 0.16, glassFrontZ + 0.16, espressoSteelMat);
  const doorSensorLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.15,
    roughness: 0.2,
  });
  neonMats.push(doorSensorLedMat);
  addBox(centerX - 0.38, centerX + 0.38, f1Y + 3.04, f1Y + 3.1, glassFrontZ - 0.18, glassFrontZ - 0.15, doorSensorLedMat);
  addBox(centerX - 0.38, centerX + 0.38, f1Y + 3.04, f1Y + 3.1, glassFrontZ + 0.15, glassFrontZ + 0.18, doorSensorLedMat);
  addBox(centerX - 4.7, centerX + 4.7, f1Y + 0.008, f1Y + 0.025, glassFrontZ - 0.09, glassFrontZ + 0.09, chromeMat);

  const doorLeftGroup = new THREE.Group();
  const doorRightGroup = new THREE.Group();
  doorLeftGroup.userData.noMerge = true;
  doorRightGroup.userData.noMerge = true;
  const doorHeight = 2.94;
  const doorPanelW = 2.38;
  const doorDecalMat = new THREE.MeshStandardMaterial({
    map: emblemTex,
    emissive: 0xffffff,
    emissiveMap: emblemTex,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.92,
    roughness: 0.25,
    side: THREE.DoubleSide,
  });
  const buildDoorLeaf = (grp: THREE.Group, handleSideX: number) => {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW - 0.12, doorHeight - 0.16, 0.05), glassMat);
    glass.position.y = doorHeight * 0.5;
    grp.add(glass);
    // Frosted horizontal safety stripe + circular Siren emblem on door glass
    const frostBand = new THREE.Mesh(
      new THREE.BoxGeometry(doorPanelW - 0.16, 0.06, 0.056),
      sbEmeraldMat
    );
    frostBand.position.y = 1.38;
    grp.add(frostBand);
    const doorLogo = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), doorDecalMat);
    doorLogo.position.set(0, 1.56, -0.032);
    doorLogo.rotation.y = Math.PI;
    grp.add(doorLogo);
    const doorLogoIn = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), doorDecalMat);
    doorLogoIn.position.set(0, 1.56, 0.032);
    grp.add(doorLogoIn);
    // Top, bottom, left, right dark espresso steel door rails
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW, 0.1, 0.085), espressoSteelMat);
    topRail.position.y = doorHeight - 0.05;
    grp.add(topRail);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW, 0.15, 0.085), espressoSteelMat);
    botRail.position.y = 0.075;
    grp.add(botRail);
    [-doorPanelW * 0.5 + 0.04, doorPanelW * 0.5 - 0.04].forEach((sx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.085, doorHeight, 0.085), espressoSteelMat);
      stile.position.set(sx, doorHeight * 0.5, 0);
      grp.add(stile);
    });
    // Vertical brushed brass pull handles (interior & exterior)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.92, 10), bronzeTrimMat);
    handle.position.set(handleSideX, 1.18, -0.075);
    grp.add(handle);
    const handleIn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.92, 10), bronzeTrimMat);
    handleIn.position.set(handleSideX, 1.18, 0.075);
    grp.add(handleIn);
    // CRITICAL: mark every child mesh noMerge so mergeStaticGroupMeshes NEVER freezes the sliding doors!
    grp.traverse((child) => {
      child.userData.noMerge = true;
    });
  };
  buildDoorLeaf(doorLeftGroup, doorPanelW * 0.5 - 0.18);
  buildDoorLeaf(doorRightGroup, -doorPanelW * 0.5 + 0.18);
  const doorLeftClosedX = centerX - 1.19;
  const doorRightClosedX = centerX + 1.19;
  doorLeftGroup.position.set(doorLeftClosedX, f1Y + 0.015, glassFrontZ);
  doorRightGroup.position.set(doorRightClosedX, f1Y + 0.015, glassFrontZ);
  staticGroup.add(doorLeftGroup, doorRightGroup);

  // =========================================================================
  // 4. OUTDOOR WATERFRONT COFFEE GARDEN PATIO (Z = -104.0 .. -99.8)
  // =========================================================================
  const buildPlanterBox = (x1: number, x2: number, z1: number, z2: number, yBase: number) => {
    addBox(x1, x2, yBase, yBase + 0.58, z1, z2, walnutWoodMat);
    addBox(x1 + 0.08, x2 - 0.08, yBase + 0.56, yBase + 0.92, z1 + 0.08, z2 - 0.08, foliageMat);
    const cx = (x1 + x2) * 0.5;
    const cz = (z1 + z2) * 0.5;
    for (let dx = -0.7; dx <= 0.71; dx += 0.7) {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), foliageDarkMat);
      bush.position.set(cx + dx, yBase + 0.95, cz);
      staticGroup.add(bush);
    }
  };
  buildPlanterBox(-85.6, -83.4, -103.8, -103.1, f1Y);
  buildPlanterBox(-54.6, -52.4, -103.8, -103.1, f1Y);
  // Entrance flanking ceramic olive trees
  [-72.4, -65.6].forEach((px) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.62, 16), deepEmeraldMat);
    pot.position.set(px, f1Y + 0.31, -101.2);
    staticGroup.add(pot);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.3, 8), walnutWoodMat);
    trunk.position.set(px, f1Y + 1.05, -101.2);
    staticGroup.add(trunk);
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), foliageMat);
    crown.position.set(px, f1Y + 1.85, -101.2);
    staticGroup.add(crown);
  });

  // Helper: Composite Coffee Cup Prop
  const addCoffeeCup = (x: number, y: number, z: number, parent: THREE.Object3D = staticGroup) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.14, 10), marbleMat);
    cup.position.set(x, y + 0.07, z);
    parent.add(cup);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.042, 0.055, 10), sbEmeraldMat);
    sleeve.position.set(x, y + 0.07, z);
    parent.add(sleeve);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.022, 10), espressoSteelMat);
    lid.position.set(x, y + 0.148, z);
    parent.add(lid);
  };

  // Helper: Composite Bistro Table + 2 Chairs + Optional Emerald Patio Umbrella
  const addPatioBistroSet = (cx: number, cz: number, withUmbrella: boolean) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 16), espressoSteelMat);
    base.position.set(cx, f1Y + 0.025, cz);
    staticGroup.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 12), espressoSteelMat);
    stem.position.set(cx, f1Y + 0.38, cz);
    staticGroup.add(stem);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 20), walnutWoodMat);
    top.position.set(cx, f1Y + 0.76, cz);
    staticGroup.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.018, 8, 24), bronzeTrimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, f1Y + 0.76, cz);
    staticGroup.add(rim);
    addCoffeeCup(cx - 0.18, f1Y + 0.785, cz + 0.08);
    addCoffeeCup(cx + 0.2, f1Y + 0.785, cz - 0.1);

    // Two facing bistro chairs
    [-0.85, 0.85].forEach((ox) => {
      const ch = new THREE.Group();
      ch.position.set(cx + ox, f1Y, cz);
      ch.rotation.y = ox < 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.44), lightOakMat);
      seat.position.y = 0.45;
      ch.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.05), velvetGreenMat);
      back.position.set(0, 0.68, -0.2);
      ch.add(back);
      [
        [-0.19, -0.18],
        [0.19, -0.18],
        [-0.19, 0.18],
        [0.19, 0.18],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.45, 8), espressoSteelMat);
        leg.position.set(lx, 0.225, lz);
        ch.add(leg);
      });
      staticGroup.add(ch);
    });

    if (withUmbrella) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.55, 10), bronzeTrimMat);
      pole.position.set(cx, f1Y + 1.28, cz);
      staticGroup.add(pole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.52, 8), sbEmeraldMat);
      canopy.position.set(cx, f1Y + 2.62, cz);
      staticGroup.add(canopy);
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), bronzeTrimMat);
      finial.position.set(cx, f1Y + 2.9, cz);
      staticGroup.add(finial);
    }
  };
  addPatioBistroSet(-80.4, -101.9, true);
  addPatioBistroSet(-75.3, -101.9, false);
  addPatioBistroSet(-62.7, -101.9, false);
  addPatioBistroSet(-57.6, -101.9, true);

  // =========================================================================
  // 5. FLOOR 2 SLAB WITH DOUBLE-HEIGHT CENTRAL ATRIUM & STAIRWELL OPENING
  // =========================================================================
  // Floor 2 slab thickness: Y = f2Y - 0.36 .. f2Y (4.48 .. 4.84), inset 0.48m inside walls
  // Atrium Void: X = -75.0 .. -63.0, Z = -92.0 .. -82.5
  // Stairwell Void (SW): X = -85.4 .. -79.8, Z = -82.0 .. -74.6
  const slabBotY = f2Y - 0.36;
  // North Riverfront Slab Strip (full width, Z = -99.7 .. -92.0)
  addBox(minX + 0.5, maxX - 0.5, slabBotY, f2Y, glassFrontZ + 0.08, -92.0, walnutWoodMat);
  // West Wing Slab (north of stairwell, X = -85.4 .. -75.0, Z = -92.0 .. -82.0)
  addBox(minX + 0.5, -75.0, slabBotY, f2Y, -92.0, -82.0, walnutWoodMat);
  // East Wing Slab (X = -63.0 .. -52.5, Z = -92.0 .. -74.6)
  addBox(-63.0, maxX - 0.5, slabBotY, f2Y, -92.0, backZ - 0.55, walnutWoodMat);
  // South Rear Gallery Slab (between stairwell & east wing: X = -79.8 .. -63.0, Z = -82.5 .. -74.6)
  addBox(-79.8, -63.0, slabBotY, f2Y, -82.5, backZ - 0.55, walnutWoodMat);

  // Floor 2 Ceiling Slab (inset 0.50m inside walls, sits cleanly below roofBottomY)
  addBox(minX + 0.5, maxX - 0.5, roofBottomY - 0.16, roofBottomY - 0.02, glassFrontZ + 0.1, backZ - 0.55, cedarSoffitMat);

  // Sculptural Acoustic Timber Ceiling Rib Beams across Floor 2 Ceiling
  for (let x = minX + 2.0; x <= maxX - 2.0; x += 2.2) {
    addBox(x - 0.08, x + 0.08, roofBottomY - 0.38, roofBottomY - 0.15, glassFrontZ + 0.4, backZ - 0.8, walnutWoodMat);
  }

  // Frameless Glass & Oak Guardrails around Floor 2 Central Atrium Void (X = -75.0..-63.0, Z = -92.0..-82.5)
  const addGuardrail = (x1: number, x2: number, z1: number, z2: number, yBase: number) => {
    addBox(x1, x2, yBase, yBase + 1.02, z1, z2, clearBalustradeMat);
    addBox(x1, x2, yBase + 1.0, yBase + 1.08, z1 - 0.03, z2 + 0.03, walnutWoodMat);
    addBox(x1, x2, yBase, yBase + 0.08, z1 - 0.02, z2 + 0.02, bronzeTrimMat);
  };
  addGuardrail(-75.05, -62.95, -92.06, -91.96, f2Y); // Atrium North Rail
  addGuardrail(-75.05, -62.95, -82.54, -82.44, f2Y); // Atrium South Rail
  addGuardrail(-75.06, -74.96, -92.05, -82.45, f2Y); // Atrium West Rail
  addGuardrail(-63.04, -62.94, -92.05, -82.45, f2Y); // Atrium East Rail

  // =========================================================================
  // 6. CENTERPIECE 8.5M HAMMERED COPPER COFFEE ROASTER CASK (Through Double-Height Atrium!)
  // =========================================================================
  const roasterX = centerX; // -69.0
  const roasterZ = -87.8;
  const roasterGroup = new THREE.Group();
  roasterGroup.position.set(roasterX, f1Y, roasterZ);

  // Circular terrazzo & bronze plinth base
  const rBase = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.3, 0.34, 32), espressoSteelMat);
  rBase.position.y = 0.17;
  roasterGroup.add(rBase);
  const rBaseTrim = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.05, 10, 36), bronzeTrimMat);
  rBaseTrim.rotation.x = Math.PI / 2;
  rBaseTrim.position.y = 0.34;
  roasterGroup.add(rBaseTrim);

  // Iconic Faceted Hammered Copper Roaster Cask (rises 8.5m straight through the Floor 2 atrium!)
  const caskLower = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.72, 3.2, 24), hammeredCopperMat);
  caskLower.position.y = 1.94;
  roasterGroup.add(caskLower);
  const caskUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.48, 4.9, 24), hammeredCopperMat);
  caskUpper.position.y = 5.95;
  roasterGroup.add(caskUpper);

  // Embossed decorative brass hoops & glowing amber bean-viewing bands
  [1.2, 2.6, 4.1, 5.8, 7.4].forEach((hy, idx) => {
    const rad = hy < 3.5 ? 1.62 - hy * 0.05 : 1.46 - (hy - 3.5) * 0.06;
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.055, 10, 32), bronzeTrimMat);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = hy;
    roasterGroup.add(hoop);
    if (idx === 1 || idx === 3) {
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(rad + 0.02, 0.032, 8, 32), amberRoasterGlowMat);
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.y = hy + 0.14;
      roasterGroup.add(glowRing);
    }
  });

  // Curved Pneumatic Copper Coffee-Bean Delivery Tubes arching from the Cask to the Espresso Bar!
  [-1.6, 0.0, 1.6].forEach((offsetX, idx) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(offsetX * 0.45, 4.8 + idx * 0.35, 1.15),
      new THREE.Vector3(offsetX * 0.85, 5.4 + idx * 0.25, 3.8),
      new THREE.Vector3(offsetX * 1.4, 3.6, 6.2),
      new THREE.Vector3(offsetX * 1.4, 1.65, 7.2),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.085, 10, false), bronzeTrimMat);
    roasterGroup.add(tube);
  });

  // Roastery Front Reserve Brass Emblem + Arabica Bean Hopper Silos & Siphon Tasting Display on Plinth!
  const roasterFrontPlaque = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), reservePlaqueMat);
  roasterFrontPlaque.position.set(0, 2.35, -1.73);
  roasterFrontPlaque.rotation.y = Math.PI;
  roasterGroup.add(roasterFrontPlaque);

  const roastBeanMat = new THREE.MeshStandardMaterial({ color: 0x3b1f0e, roughness: 0.68, metalness: 0.06 });
  // 4 Glass Coffee-Bean Hopper Silos flanking the roaster base
  [-1.75, -1.05, 1.05, 1.75].forEach((sx, idx) => {
    const sz = idx === 0 || idx === 3 ? -0.95 : -1.52;
    const siloStand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.56, 12), walnutWoodMat);
    siloStand.position.set(sx, 0.62, sz);
    roasterGroup.add(siloStand);
    const beanFill = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.12, 0.52, 12), roastBeanMat);
    beanFill.position.set(sx, 1.14, sz);
    roasterGroup.add(beanFill);
    const glassCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.68, 12), clearBalustradeMat);
    glassCylinder.position.set(sx, 1.24, sz);
    roasterGroup.add(glassCylinder);
    const siloLid = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 12), bronzeTrimMat);
    siloLid.position.set(sx, 1.6, sz);
    roasterGroup.add(siloLid);
  });

  // Animated Slowly Rotating Brass Coffee-Bean Cooling Drum & Agitator Arm on North Plinth Edge!
  const beanCoolerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.64, 20), espressoSteelMat);
  beanCoolerBase.position.set(0, 0.66, -1.85);
  roasterGroup.add(beanCoolerBase);
  const beanBed = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.08, 20), roastBeanMat);
  beanBed.position.set(0, 1.01, -1.85);
  roasterGroup.add(beanBed);
  const beanCoolerRim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.04, 10, 24), bronzeTrimMat);
  beanCoolerRim.rotation.x = Math.PI / 2;
  beanCoolerRim.position.set(0, 1.04, -1.85);
  roasterGroup.add(beanCoolerRim);

  const agitatorSpinner = new THREE.Group();
  agitatorSpinner.userData.noMerge = true;
  agitatorSpinner.position.set(roasterX, f1Y + 1.08, roasterZ - 1.85);
  const agitatorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 10), bronzeTrimMat);
  agitatorSpinner.add(agitatorHub);
  for (let arm = 0; arm < 2; arm++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.025, 0.035), chromeMat);
    bar.rotation.y = (arm * Math.PI) / 2;
    bar.position.y = 0.02;
    agitatorSpinner.add(bar);
    [-0.36, -0.18, 0.18, 0.36].forEach((tx) => {
      const tine = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.075, 0.025), bronzeTrimMat);
      tine.position.set(arm === 0 ? tx : 0, -0.025, arm === 0 ? 0 : tx);
      agitatorSpinner.add(tine);
    });
  }
  agitatorSpinner.traverse((c) => {
    c.userData.noMerge = true;
  });
  staticGroup.add(agitatorSpinner);

  // Grand Suspended Brass Halo Ring Chandelier + Cascading Teardrop Pendants orbiting the Copper Cask!
  const haloChandelier = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.07, 12, 48), bronzeTrimMat);
  haloChandelier.rotation.x = Math.PI / 2;
  haloChandelier.position.y = 6.95;
  roasterGroup.add(haloChandelier);
  const haloGlowRing = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.035, 8, 48), warmGlowMat);
  haloGlowRing.rotation.x = Math.PI / 2;
  haloGlowRing.position.y = 6.89;
  roasterGroup.add(haloGlowRing);
  // Suspension cables & staggered glowing teardrop glass pendants
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const drop = 0.55 + (i % 3) * 0.32;
    if (i < 6) {
      const ca = (i / 6) * Math.PI * 2;
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.9, 6), espressoSteelMat);
      cable.position.set(Math.cos(ca) * 3.4, 7.9, Math.sin(ca) * 3.4);
      roasterGroup.add(cable);
    }
    const pCord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, drop, 6), bronzeTrimMat);
    pCord.position.set(Math.cos(a) * 3.15, 6.9 - drop * 0.5, Math.sin(a) * 3.15);
    roasterGroup.add(pCord);
    const teardrop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), warmGlowMat);
    teardrop.scale.set(0.85, 1.35, 0.85);
    teardrop.position.set(Math.cos(a) * 3.15, 6.9 - drop - 0.1, Math.sin(a) * 3.15);
    roasterGroup.add(teardrop);
  }
  staticGroup.add(roasterGroup);

  // =========================================================================
  // 6B. ARCHITECTURAL FLOOR RUGS, COMPASS INLAY, CONDIMENT BAR & WINDOW COUNTERS
  // =========================================================================
  const emeraldRugMat = new THREE.MeshStandardMaterial({
    map: createEmeraldRugTexture(),
    roughness: 0.88,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const addFloorRug = (cx: number, cz: number, rw: number, rd: number, yBase: number) => {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.018, rd), emeraldRugMat);
    rug.position.set(cx, yBase + 0.018, cz);
    staticGroup.add(rug);
  };
  // Entrance Emerald & Brass Welcome Runner Mat
  addFloorRug(centerX, -97.9, 4.5, 2.7, f1Y);
  // Lounge Rugs under Floor 1 Velvet Booths & East Communal Work Table
  addFloorRug(-80.0, -95.3, 4.4, 3.2, f1Y);
  addFloorRug(-80.0, -90.1, 4.4, 3.2, f1Y);
  addFloorRug(-58.7, -92.8, 5.4, 3.6, f1Y);
  addFloorRug(-58.2, -85.2, 4.4, 3.2, f1Y);
  // Circular Brass Floor Compass Inlay encircling the Roaster Plinth
  const compassRing = new THREE.Mesh(new THREE.RingGeometry(2.75, 2.92, 40), bronzeTrimMat);
  compassRing.rotation.x = -Math.PI / 2;
  compassRing.position.set(roasterX, f1Y + 0.02, roasterZ);
  staticGroup.add(compassRing);

  // Floor 1 Ceiling Acoustic Walnut Slats under Floor 2 Slab (makes looking up inside Floor 1 rich & warm!)
  for (let x = minX + 1.4; x <= -75.8; x += 1.4) {
    addBox(x - 0.06, x + 0.06, slabBotY - 0.14, slabBotY - 0.01, glassFrontZ + 0.6, -82.4, walnutWoodMat);
  }
  for (let x = -62.2; x <= maxX - 1.4; x += 1.4) {
    addBox(x - 0.06, x + 0.06, slabBotY - 0.14, slabBotY - 0.01, glassFrontZ + 0.6, backZ - 1.0, walnutWoodMat);
  }

  // West Self-Serve Condiment & Napkin Station (just inside West front glass: X = -75.6 .. -73.0, Z = -99.3 .. -98.45)
  addBox(-75.5, -73.1, f1Y, f1Y + 0.94, -99.3, -98.55, walnutWoodMat);
  addBox(-75.6, -73.0, f1Y + 0.94, f1Y + 1.0, -99.36, -98.48, marbleMat);
  // Chrome milk carafes, ceramic sugar/cinnamon jars, napkin holder & wooden stirrers
  [-75.1, -74.65].forEach((cx) => {
    const carafe = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.26, 12), chromeMat);
    carafe.position.set(cx, f1Y + 1.13, -98.9);
    staticGroup.add(carafe);
  });
  [-74.15, -73.85, -73.55].forEach((cx, idx) => {
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.16, 10),
      idx === 1 ? bronzeTrimMat : marbleMat
    );
    jar.position.set(cx, f1Y + 1.08, -98.9);
    staticGroup.add(jar);
  });
  addBox(-73.38, -73.14, f1Y + 1.0, f1Y + 1.2, -99.05, -98.76, espressoSteelMat); // Napkin box

  // East Entrance Welcome Standing Easel & Floral Vase Pedestal (X = -65.0 .. -62.5, Z = -99.2 .. -98.5)
  const easelTex = createWelcomeEaselTexture();
  const easelMat = new THREE.MeshStandardMaterial({
    map: easelTex,
    emissive: 0xffffff,
    emissiveMap: easelTex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  neonMats.push(easelMat);
  addBox(-64.55, -63.45, f1Y + 0.42, f1Y + 1.88, -99.06, -98.96, espressoSteelMat);
  const easelFace = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.38), easelMat);
  easelFace.position.set(-64.0, f1Y + 1.16, -98.95);
  staticGroup.add(easelFace);
  [-64.45, -63.55].forEach((ex) => {
    addBox(ex - 0.03, ex + 0.03, f1Y, f1Y + 0.44, -99.08, -98.94, bronzeTrimMat);
  });
  // Brass Floral Pedestal next to easel
  const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.85, 14), walnutWoodMat);
  pedBase.position.set(-62.9, f1Y + 0.425, -98.95);
  staticGroup.add(pedBase);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.32, 12), deepEmeraldMat);
  vase.position.set(-62.9, f1Y + 1.01, -98.95);
  staticGroup.add(vase);
  const bouquet = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), foliageMat);
  bouquet.position.set(-62.9, f1Y + 1.28, -98.95);
  staticGroup.add(bouquet);

  // Floor 1 Interior North Window Bar Counters (West & East front glass bays)
  const addWindowBarCounter = (xStart: number, xEnd: number, yBase: number, zFront: number) => {
    addBox(xStart, xEnd, yBase + 0.96, yBase + 1.04, zFront, zFront + 0.62, lightOakMat);
    for (let lx = xStart + 0.4; lx <= xEnd - 0.3; lx += 2.6) {
      addBox(lx - 0.04, lx + 0.04, yBase, yBase + 0.96, zFront + 0.14, zFront + 0.48, espressoSteelMat);
    }
    for (let sx = xStart + 0.85; sx <= xEnd - 0.6; sx += 1.65) {
      const sBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 12), espressoSteelMat);
      sBase.position.set(sx, yBase + 0.02, zFront + 0.92);
      staticGroup.add(sBase);
      const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 10), bronzeTrimMat);
      sLeg.position.set(sx, yBase + 0.37, zFront + 0.92);
      staticGroup.add(sLeg);
      const sSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.065, 14), cognacLeatherMat);
      sSeat.position.set(sx, yBase + 0.74, zFront + 0.92);
      staticGroup.add(sSeat);
      addCoffeeCup(sx + 0.14, yBase + 1.04, zFront + 0.32);
    }
    // Warm mini brass table lamp on each window counter
    const midX = (xStart + xEnd) * 0.5;
    const wLampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.34, 10), bronzeTrimMat);
    wLampStem.position.set(midX, yBase + 1.21, zFront + 0.28);
    staticGroup.add(wLampStem);
    const wLampDome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), bronzeTrimMat);
    wLampDome.position.set(midX, yBase + 1.38, zFront + 0.28);
    staticGroup.add(wLampDome);
    const wLampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), warmGlowMat);
    wLampBulb.position.set(midX, yBase + 1.33, zFront + 0.28);
    staticGroup.add(wLampBulb);
  };
  addWindowBarCounter(-83.4, -77.6, f1Y, -99.45);
  addWindowBarCounter(-60.4, -54.6, f1Y, -99.45);

  // Indoor Lush Potted Fiddle-Leaf Fig & Monstera Trees (Ground Floor & Floor 2 corners)
  const addIndoorTree = (tx: number, yBase: number, tz: number, scale = 1.0) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * scale, 0.24 * scale, 0.58 * scale, 14), deepEmeraldMat);
    pot.position.set(tx, yBase + 0.29 * scale, tz);
    staticGroup.add(pot);
    const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.32 * scale, 0.025 * scale, 8, 16), bronzeTrimMat);
    potRim.rotation.x = Math.PI / 2;
    potRim.position.set(tx, yBase + 0.58 * scale, tz);
    staticGroup.add(potRim);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.07 * scale, 1.35 * scale, 8), walnutWoodMat);
    trunk.position.set(tx, yBase + 1.15 * scale, tz);
    staticGroup.add(trunk);
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48 * scale, 1), foliageMat);
    c1.position.set(tx, yBase + 1.9 * scale, tz);
    staticGroup.add(c1);
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36 * scale, 1), foliageDarkMat);
    c2.position.set(tx + 0.24 * scale, yBase + 1.62 * scale, tz - 0.16 * scale);
    staticGroup.add(c2);
    const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34 * scale, 1), foliageMat);
    c3.position.set(tx - 0.22 * scale, yBase + 1.72 * scale, tz + 0.18 * scale);
    staticGroup.add(c3);
  };
  addIndoorTree(-84.5, f1Y, -98.8, 1.05);
  addIndoorTree(-53.5, f1Y, -98.8, 1.05);
  addIndoorTree(-78.6, f1Y, -83.4, 0.95);
  addIndoorTree(-54.4, f1Y, -76.2, 1.05);
  addIndoorTree(-84.3, f2Y, -98.6, 1.0);
  addIndoorTree(-53.7, f2Y, -98.6, 1.0);
  addIndoorTree(-76.8, f2Y, -75.8, 0.95);

  // =========================================================================
  // 7. FLOOR 1 GRAND RESERVE ESPRESSO & BAKERY BAR (X = -76.5 .. -61.5, Z = -82.0 .. -78.6)
  // =========================================================================
  // Fluted Walnut Front Counter + Calacatta Marble Top
  addBox(-76.3, -61.7, f1Y, f1Y + 1.06, -81.8, -78.9, walnutWoodMat);
  addBox(-76.45, -61.55, f1Y + 1.06, f1Y + 1.15, -81.95, -78.75, marbleMat);
  // Under-counter warm toe-kick LED glow strip
  addBox(-76.1, -61.9, f1Y + 0.02, f1Y + 0.1, -81.84, -81.76, warmGlowMat);
  // Vertical walnut flutes across bar front
  for (let fx = -75.8; fx <= -62.2; fx += 0.45) {
    addBox(fx - 0.04, fx + 0.04, f1Y + 0.14, f1Y + 1.04, -81.86, -81.78, lightOakMat);
  }

  // Overhead Suspended Brass & Walnut Bar Canopy Rack + "ORDER HERE • RESERVE ESPRESSO BAR • PICK UP" Sign!
  addBox(-76.4, -61.6, f1Y + 3.08, f1Y + 3.46, -81.85, -79.4, espressoSteelMat);
  addBox(-76.3, -61.7, f1Y + 3.04, f1Y + 3.09, -81.75, -79.5, bronzeTrimMat);
  addBox(-76.0, -62.0, f1Y + 3.0, f1Y + 3.05, -81.55, -81.45, warmGlowMat);
  [-76.0, -71.5, -66.5, -62.0].forEach((rx) => {
    [-81.5, -79.7].forEach((rz) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.88, 8), bronzeTrimMat);
      rod.position.set(rx, f1Y + 3.9, rz);
      staticGroup.add(rod);
    });
  });
  const barSignTex = createBarCanopySignTexture(
    'ORDER HERE   •   RESERVE ESPRESSO BAR   •   PICK UP',
    'CRAFT ESPRESSO  •  POUR-OVER  •  FRESH ARTISAN BAKERY'
  );
  const barSignMat = new THREE.MeshStandardMaterial({
    map: barSignTex,
    emissive: 0xffffff,
    emissiveMap: barSignTex,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  neonMats.push(barSignMat);
  const barSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 0.92), barSignMat);
  barSignMesh.position.set(centerX, f1Y + 3.27, -81.87);
  barSignMesh.rotation.y = Math.PI;
  staticGroup.add(barSignMesh);

  // Dual POS Order Touchscreen Terminals + Contactless Card Readers + Tip Jars
  const posScreenMat = new THREE.MeshStandardMaterial({
    color: 0x064e3b,
    emissive: 0x34d399,
    emissiveIntensity: 0.55,
    roughness: 0.15,
  });
  neonMats.push(posScreenMat);
  [-74.8, -63.4].forEach((px) => {
    addBox(px - 0.22, px + 0.22, f1Y + 1.15, f1Y + 1.24, -81.3, -80.9, espressoSteelMat);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.04), espressoSteelMat);
    screen.position.set(px, f1Y + 1.42, -81.08);
    screen.rotation.x = 0.28;
    staticGroup.add(screen);
    const glowFace = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.24), posScreenMat);
    glowFace.position.set(px, f1Y + 1.42, -81.11);
    glowFace.rotation.y = Math.PI;
    glowFace.rotation.x = -0.28;
    staticGroup.add(glowFace);
    // Card tap terminal & acrylic tip jar beside register
    addBox(px + 0.34, px + 0.48, f1Y + 1.15, f1Y + 1.26, -81.45, -81.25, espressoSteelMat);
    const tipJar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 10), clearBalustradeMat);
    tipJar.position.set(px - 0.36, f1Y + 1.23, -81.4);
    staticGroup.add(tipJar);
  });

  // Two Professional Multi-Part Chrome Espresso Machines + Stacked Ceramic Cups & Syrup Bottles
  const syrupColors = [0xd97706, 0xfef3c7, 0x78350f, 0x16a34a, 0x9f1239, 0x92400e];
  [-72.8, -65.2].forEach((ex, mIdx) => {
    const mGrp = new THREE.Group();
    mGrp.position.set(ex, f1Y + 1.15, -80.1);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.56, 0.64), chromeMat);
    body.position.y = 0.28;
    mGrp.add(body);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.12, 0.66), espressoSteelMat);
    trim.position.y = 0.54;
    mGrp.add(trim);
    // Twin bean grinder hoppers atop machine
    [-0.45, 0.45].forEach((hx) => {
      const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.06, 0.28, 10), roastBeanMat);
      hopper.position.set(hx, 0.74, 0.06);
      mGrp.add(hopper);
    });
    // Stacked white porcelain cups on top warmer tray
    [-0.18, 0.0, 0.18].forEach((cx) => {
      for (let st = 0; st < 2; st++) {
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.085, 10), marbleMat);
        mug.position.set(cx, 0.64 + st * 0.085, 0.04);
        mGrp.add(mug);
      }
    });
    // Stainless milk frothing pitcher beside machine
    const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.14, 10), chromeMat);
    pitcher.position.set(0.76, 0.07, -0.18);
    mGrp.add(pitcher);
    [-0.32, 0.0, 0.32].forEach((gx) => {
      const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.14, 10), bronzeTrimMat);
      groupHead.position.set(gx, 0.3, -0.34);
      mGrp.add(groupHead);
      addCoffeeCup(gx, 0.02, -0.34, mGrp);
    });
    // 3 Flavor Syrup Pump Bottles on riser
    for (let s = 0; s < 3; s++) {
      const sMat = new THREE.MeshStandardMaterial({
        color: syrupColors[(mIdx * 3 + s) % syrupColors.length],
        roughness: 0.25,
        metalness: 0.1,
      });
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.045, 0.26, 8), sMat);
      bottle.position.set(-0.82 + s * 0.11, 0.13, 0.18);
      mGrp.add(bottle);
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), marbleMat);
      pump.position.set(-0.82 + s * 0.11, 0.29, 0.18);
      mGrp.add(pump);
    }
    staticGroup.add(mGrp);
  });

  // Illuminated Glass Pastry & Bakery Showcase (Center of Bar) + Rich Assorted Cakes
  addBox(-70.8, -67.2, f1Y + 1.15, f1Y + 1.92, -81.65, -80.4, glassMat);
  addBox(-70.8, -67.2, f1Y + 1.5, f1Y + 1.54, -81.58, -80.46, bronzeTrimMat);
  addBox(-70.75, -67.25, f1Y + 1.88, f1Y + 1.92, -81.6, -80.44, warmGlowMat);
  const pastryMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.68 });
  const matchaCakeMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.62 });
  const berryCakeMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.55 });
  const chocoCakeMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.58 });
  const cakeMats = [pastryMat, matchaCakeMat, berryCakeMat, chocoCakeMat];
  for (let i = 0; i < 7; i++) {
    const px = -70.45 + i * 0.48;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.02, 12), marbleMat);
    plate.position.set(px, f1Y + 1.16, -81.02);
    staticGroup.add(plate);
    const item = new THREE.Mesh(
      i % 2 === 0 ? new THREE.TorusGeometry(0.08, 0.042, 8, 14) : new THREE.CylinderGeometry(0.11, 0.11, 0.13, 10),
      cakeMats[i % cakeMats.length]
    );
    if (i % 2 === 0) item.rotation.x = Math.PI / 2;
    item.position.set(px, f1Y + 1.24, -81.02);
    staticGroup.add(item);
    const itemTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 10, 8),
      cakeMats[(i + 1) % cakeMats.length]
    );
    itemTop.scale.set(1.25, 0.72, 0.9);
    itemTop.position.set(px, f1Y + 1.61, -81.02);
    staticGroup.add(itemTop);
  }

  // Grab-&-Go Refrigerated Cold Beverage & Sandwich Glass Chiller (East end of Bar: X = -62.7 .. -61.7)
  addBox(-62.7, -61.75, f1Y + 1.15, f1Y + 2.12, -81.65, -80.45, glassMat);
  addBox(-62.72, -61.73, f1Y + 2.08, f1Y + 2.15, -81.67, -80.43, espressoSteelMat);
  [1.42, 1.75].forEach((sy, sIdx) => {
    addBox(-62.65, -61.8, f1Y + sy, f1Y + sy + 0.03, -81.58, -80.52, chromeMat);
    for (let bi = 0; bi < 4; bi++) {
      const bMat = bi % 2 === 0 ? sbEmeraldMat : sIdx === 0 ? pastryMat : berryCakeMat;
      const btl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.042, 0.19, 8), bMat);
      btl.position.set(-62.5 + bi * 0.18, f1Y + sy + 0.12, -81.05);
      staticGroup.add(btl);
    }
  });

  // Rear Espresso Backbar, Burlap Arabica Bean Sacks, Reserve Canisters & Glowing Menu Boards
  addBox(-76.4, -61.6, f1Y, f1Y + 1.02, -75.5, -74.68, espressoSteelMat);
  addBox(-76.4, -61.6, f1Y + 1.02, f1Y + 1.09, -75.55, -74.68, marbleMat);
  // Floating backbar walnut display shelf with Reserve brass coffee canisters
  addBox(-76.2, -61.8, f1Y + 1.62, f1Y + 1.7, -75.15, -74.72, walnutWoodMat);
  for (let cx = -75.8; cx <= -62.2; cx += 0.95) {
    const canister = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.34, 12),
      Math.round(cx) % 2 === 0 ? hammeredCopperMat : deepEmeraldMat
    );
    canister.position.set(cx, f1Y + 1.87, -74.94);
    staticGroup.add(canister);
  }
  // Stacked Burlap Arabica Coffee Bean Sacks beside backbar flanks
  const burlapMat = new THREE.MeshStandardMaterial({ color: 0xb6956a, roughness: 0.92, metalness: 0.0 });
  [-77.2, -60.8].forEach((bx) => {
    for (let st = 0; st < 2; st++) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), burlapMat);
      sack.scale.set(1.25, 0.62, 0.92);
      sack.position.set(bx, f1Y + 0.22 + st * 0.38, -75.25);
      staticGroup.add(sack);
    }
  });

  const menuTex = createStarbucksMenuBoardTexture();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xffffff,
    emissiveMap: menuTex,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  neonMats.push(menuMat);
  [-72.2, -65.8].forEach((mx) => {
    addBox(mx - 2.65, mx + 2.65, f1Y + 2.05, f1Y + 3.95, -74.82, -74.66, espressoSteelMat);
    const menuMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 1.78), menuMat);
    menuMesh.position.set(mx, f1Y + 3.0, -74.84);
    menuMesh.rotation.y = Math.PI; // Face North (-Z) into the cafe!
    staticGroup.add(menuMesh);
  });

  // =========================================================================
  // 8. FLOOR 1 WEST MERCHANDISE GALLERY & VELVET BOOTHS + EAST COMMUNAL LOUNGE
  // =========================================================================
  // West Wall Tumbler, Ceramic Mug & Reserve Coffee Bean Display Gallery (X = -85.2 .. -84.2)
  addBox(-85.2, -84.2, f1Y, f1Y + 3.25, -96.2, -85.8, walnutWoodMat);
  const merchSignTex = createBarCanopySignTexture('STARBUCKS RESERVE® GALLERY', 'TUMBLERS  •  WHOLE BEAN  •  BREWING GEAR');
  const merchSignMat = new THREE.MeshStandardMaterial({
    map: merchSignTex,
    emissive: 0xffffff,
    emissiveMap: merchSignTex,
    emissiveIntensity: 0.52,
    roughness: 0.28,
  });
  neonMats.push(merchSignMat);
  const merchHeader = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.62), merchSignMat);
  merchHeader.position.set(-84.18, f1Y + 2.95, -91.0);
  merchHeader.rotation.y = Math.PI / 2;
  staticGroup.add(merchHeader);

  const merchPalette = [sbEmeraldMat, marbleMat, hammeredCopperMat, espressoSteelMat, berryCakeMat];
  for (let sy = 0.68; sy <= 2.45; sy += 0.58) {
    addBox(-85.15, -84.1, f1Y + sy, f1Y + sy + 0.06, -96.0, -86.0, bronzeTrimMat);
    addBox(-84.22, -84.12, f1Y + sy - 0.02, f1Y + sy, -95.8, -86.2, warmGlowMat);
    let itemIdx = 0;
    for (let sz = -95.4; sz <= -86.6; sz += 0.72) {
      if (itemIdx % 3 === 0) {
        // Reserve Whole-Bean Coffee Bag Box
        addBox(-84.62, -84.3, f1Y + sy + 0.06, f1Y + sy + 0.34, sz - 0.1, sz + 0.1, merchPalette[itemIdx % merchPalette.length]);
      } else {
        // Stainless Insulated Tumbler
        const tumbler = new THREE.Mesh(
          new THREE.CylinderGeometry(0.058, 0.05, 0.28, 10),
          merchPalette[(itemIdx + Math.round(sy * 3)) % merchPalette.length]
        );
        tumbler.position.set(-84.42, f1Y + sy + 0.2, sz);
        staticGroup.add(tumbler);
      }
      itemIdx++;
    }
  }

  // Helper: Luxury Emerald Velvet Sofa Booth + Marble Coffee Table + Brass Table Lamp + Pastries
  const addVelvetLoungeSet = (cx: number, cz: number, yBase: number) => {
    // Round/Oval Marble Coffee Table
    const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.56, 12), bronzeTrimMat);
    tLeg.position.set(cx, yBase + 0.28, cz);
    staticGroup.add(tLeg);
    const tTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.94), marbleMat);
    tTop.position.set(cx, yBase + 0.58, cz);
    staticGroup.add(tTop);
    addCoffeeCup(cx - 0.42, yBase + 0.61, cz + 0.14);
    addCoffeeCup(cx + 0.46, yBase + 0.61, cz - 0.14);
    // Ceramic dessert plate + croissant + mini succulent vase on coffee table
    const tPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.02, 12), marbleMat);
    tPlate.position.set(cx + 0.05, yBase + 0.62, cz + 0.08);
    staticGroup.add(tPlate);
    const tCroissant = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), pastryMat);
    tCroissant.scale.set(1.4, 0.65, 0.85);
    tCroissant.position.set(cx + 0.05, yBase + 0.66, cz + 0.08);
    staticGroup.add(tCroissant);
    const miniPot = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.09, 10), bronzeTrimMat);
    miniPot.position.set(cx - 0.08, yBase + 0.655, cz - 0.18);
    staticGroup.add(miniPot);
    const miniPlant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), foliageMat);
    miniPlant.position.set(cx - 0.08, yBase + 0.74, cz - 0.18);
    staticGroup.add(miniPlant);

    // Facing Emerald Velvet Sofas with Cognac Throw Pillows
    [-0.95, 0.95].forEach((oz) => {
      const dir = oz < 0 ? 1 : -1;
      addBox(cx - 1.4, cx + 1.4, yBase + 0.12, yBase + 0.46, cz + oz - 0.32, cz + oz + 0.32, velvetGreenMat);
      addBox(cx - 1.4, cx + 1.4, yBase + 0.46, yBase + 0.96, cz + oz - dir * 0.24 - 0.12, cz + oz - dir * 0.24 + 0.12, velvetGreenMat);
      addBox(cx - 1.35, cx + 1.35, yBase, yBase + 0.12, cz + oz - 0.26, cz + oz + 0.26, walnutWoodMat);
      // Cognac accent throw pillows at sofa corners
      [-1.12, 1.12].forEach((px) => {
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.12), cognacLeatherMat);
        pillow.position.set(cx + px, yBase + 0.62, cz + oz - dir * 0.1);
        pillow.rotation.z = px < 0 ? 0.14 : -0.14;
        staticGroup.add(pillow);
      });
    });
  };
  addVelvetLoungeSet(-80.0, -95.3, f1Y);
  addVelvetLoungeSet(-80.0, -90.1, f1Y);
  addVelvetLoungeSet(-58.2, -85.2, f1Y);

  // East Wing Grand Live-Edge Communal Work Table (X = -61.0 .. -56.4, Z = -94.0 .. -91.6) + 6 Dining Chairs!
  addBox(-60.8, -56.6, f1Y + 0.74, f1Y + 0.84, -93.6, -92.0, walnutWoodMat);
  [-60.3, -57.1].forEach((lx) => {
    addBox(lx - 0.1, lx + 0.1, f1Y, f1Y + 0.74, -93.45, -92.15, espressoSteelMat);
  });
  // 6 Ergonomic Walnut & Cognac-Leather Chairs flanking the Communal Work Table
  [-60.15, -58.7, -57.25].forEach((cx) => {
    [-94.08, -91.52].forEach((cz) => {
      const ch = new THREE.Group();
      ch.position.set(cx, f1Y, cz);
      ch.rotation.y = cz < -92.8 ? 0 : Math.PI;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.46), cognacLeatherMat);
      seat.position.y = 0.46;
      ch.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.055), walnutWoodMat);
      back.position.set(0, 0.7, -0.21);
      ch.add(back);
      [
        [-0.2, -0.19],
        [0.2, -0.19],
        [-0.2, 0.19],
        [0.2, 0.19],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.46, 8), espressoSteelMat);
        leg.position.set(lx, 0.23, lz);
        ch.add(leg);
      });
      staticGroup.add(ch);
    });
  });
  // Brass reading desk lamps, open glowing laptops, notebooks & cups on communal table
  [-59.8, -57.6].forEach((lx) => {
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.06, 0.55, 10), bronzeTrimMat);
    lampStem.position.set(lx, f1Y + 1.1, -92.8);
    staticGroup.add(lampStem);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.16, 14), sbEmeraldMat);
    shade.position.set(lx, f1Y + 1.38, -92.8);
    staticGroup.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), warmGlowMat);
    bulb.position.set(lx, f1Y + 1.3, -92.8);
    staticGroup.add(bulb);
  });
  const laptopGlowMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.48,
    roughness: 0.15,
  });
  [-60.15, -58.7, -57.25].forEach((lx) => {
    addBox(lx - 0.2, lx + 0.2, f1Y + 0.84, f1Y + 0.865, -92.5, -92.22, chromeMat);
    addBox(lx - 0.2, lx + 0.2, f1Y + 0.865, f1Y + 1.12, -92.52, -92.49, espressoSteelMat);
    const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.22), laptopGlowMat);
    screenFace.position.set(lx, f1Y + 0.99, -92.485);
    staticGroup.add(screenFace);
    addCoffeeCup(lx + 0.32, f1Y + 0.84, -92.35);
    // Open Moleskine notebook across the table
    addBox(lx - 0.14, lx + 0.14, f1Y + 0.84, f1Y + 0.86, -93.36, -93.12, marbleMat);
  });

  // South-East Cozy Corner Reading Nook (X = -59.0 .. -55.4, Z = -78.6 .. -75.8)
  const nookTable = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 18), marbleMat);
  nookTable.position.set(-57.6, f1Y + 0.62, -77.2);
  staticGroup.add(nookTable);
  const nookLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.62, 12), bronzeTrimMat);
  nookLeg.position.set(-57.6, f1Y + 0.31, -77.2);
  staticGroup.add(nookLeg);
  addCoffeeCup(-57.48, f1Y + 0.645, -77.15);
  // Two Cognac-Leather Club Armchairs flanking the nook table
  [
    { x: -58.65, z: -76.55, ry: 0.65 },
    { x: -56.45, z: -76.55, ry: -0.65 },
  ].forEach((ac) => {
    const chair = new THREE.Group();
    chair.position.set(ac.x, f1Y, ac.z);
    chair.rotation.y = ac.ry;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.28, 0.72), cognacLeatherMat);
    seat.position.y = 0.28;
    chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.56, 0.18), cognacLeatherMat);
    back.position.set(0, 0.64, -0.28);
    chair.add(back);
    [-0.34, 0.34].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.72), cognacLeatherMat);
      arm.position.set(ax, 0.46, 0);
      chair.add(arm);
    });
    staticGroup.add(chair);
  });
  // Standing Brass Arc Floor Lamp in the SE Corner
  const fLampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 1.95, 8), bronzeTrimMat);
  fLampPole.position.set(-59.35, f1Y + 0.98, -75.85);
  staticGroup.add(fLampPole);
  const fLampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.26, 14), warmGlowMat);
  fLampShade.position.set(-59.35, f1Y + 1.98, -75.85);
  staticGroup.add(fLampShade);

  // East Wall Backlit Roastery Bookshelf, Colorful Library Books & Mural
  addBox(-53.8, -52.68, f1Y, f2Y - 0.38, -97.0, -78.0, walnutWoodMat);
  const bookMats = [sbEmeraldMat, cognacLeatherMat, berryCakeMat, bronzeTrimMat, marbleMat];
  // Built-in book & ceramic-vessel niches North & South of the mural
  [
    { z1: -96.4, z2: -91.8 },
    { z1: -83.2, z2: -78.6 },
  ].forEach((bay) => {
    for (let sy = 0.75; sy <= 3.1; sy += 0.65) {
      addBox(-53.92, -53.72, f1Y + sy, f1Y + sy + 0.05, bay.z1, bay.z2, bronzeTrimMat);
      let bIdx = 0;
      for (let bz = bay.z1 + 0.28; bz <= bay.z2 - 0.28; bz += 0.34) {
        const bk = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.28 + (bIdx % 3) * 0.06, 0.09),
          bookMats[(bIdx + Math.round(sy * 2)) % bookMats.length]
        );
        bk.position.set(-53.88, f1Y + sy + 0.2, bz);
        staticGroup.add(bk);
        bIdx++;
      }
    }
  });
  const muralTex = createRoasteryMuralTexture();
  const muralMat = new THREE.MeshStandardMaterial({
    map: muralTex,
    emissive: 0xffffff,
    emissiveMap: muralTex,
    emissiveIntensity: 0.42,
    roughness: 0.35,
  });
  neonMats.push(muralMat);
  const muralMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.2), muralMat);
  muralMesh.position.set(-53.82, f1Y + 2.35, -87.5);
  muralMesh.rotation.y = -Math.PI / 2; // Face West (-X) into Floor 1 lounge
  staticGroup.add(muralMesh);

  // =========================================================================
  // 9. GRAND ARCHITECTURAL SWITCHBACK STAIRCASE TO FLOOR 2 (SW Corner: X = -84.8..-79.8, Z = -81.8..-74.8)
  // =========================================================================
  const midY = f1Y + STARBUCKS_BD_FLOOR_H * 0.5;
  const stepsPerFlight = 12;
  const flightLen = 5.0;
  const stepRun = flightLen / stepsPerFlight;
  const stepRise = (STARBUCKS_BD_FLOOR_H * 0.5) / stepsPerFlight;

  for (let i = 0; i < stepsPerFlight; i++) {
    const y1 = f1Y + (i + 1) * stepRise;
    const z1a = -81.6 + i * stepRun;
    const z1b = z1a + stepRun + 0.04;
    addBox(-82.2, -79.85, y1 - stepRise, y1, z1a, z1b, lightOakMat);
    addBox(-82.15, -79.9, y1 - 0.035, y1 - 0.005, z1a - 0.01, z1a + 0.02, warmGlowMat);

    const y2 = midY + (i + 1) * stepRise;
    const z2b = -76.6 - i * stepRun;
    const z2a = z2b - stepRun - 0.04;
    addBox(-84.85, -82.4, y2 - stepRise, y2, z2a, z2b, lightOakMat);
    addBox(-84.8, -82.45, y2 - 0.035, y2 - 0.005, z2b - 0.02, z2b + 0.01, warmGlowMat);
  }
  addBox(-85.1, -79.8, midY - 0.24, midY, -76.65, -74.68, walnutWoodMat);
  addBox(-82.38, -82.22, f1Y, f2Y + 1.05, -81.6, -76.55, espressoSteelMat);
  addBox(-82.42, -82.18, f2Y + 1.02, f2Y + 1.09, -81.65, -76.5, bronzeTrimMat);
  addBox(-79.82, -79.72, f1Y, f2Y + 1.05, -81.6, -74.68, clearBalustradeMat);
  addBox(-79.86, -79.68, f2Y + 1.0, f2Y + 1.08, -81.65, -74.68, walnutWoodMat);

  const stairSignTex = createStairSignTexture();
  const stairSignMat = new THREE.MeshStandardMaterial({
    map: stairSignTex,
    emissive: 0xffffff,
    emissiveMap: stairSignTex,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  neonMats.push(stairSignMat);
  addBox(-84.2, -80.0, f1Y + 3.25, f1Y + 4.15, -81.9, -81.75, espressoSteelMat);
  const stairSignFace = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.8), stairSignMat);
  stairSignFace.position.set(-82.1, f1Y + 3.7, -81.92);
  stairSignFace.rotation.y = Math.PI;
  staticGroup.add(stairSignFace);

  // =========================================================================
  // 10. FLOOR 2 PANORAMIC RIVERFRONT BAR, LOUNGE, VINYL CORNER & COLD BREW BAR (Y = 4.84)
  // =========================================================================
  // Woven Emerald Lounge Rugs on Floor 2
  addFloorRug(-80.9, -91.6, 4.4, 3.2, f2Y);
  addFloorRug(-80.9, -86.0, 4.4, 3.2, f2Y);
  addFloorRug(-57.7, -90.5, 4.4, 3.2, f2Y);
  addFloorRug(-69.0, -76.6, 6.2, 2.4, f2Y);

  // Continuous 27m Panoramic Riverfront Window Counter facing Sông Hàn!
  addBox(-82.8, -55.2, f2Y + 0.98, f2Y + 1.06, -99.3, -98.45, lightOakMat);
  for (let bx = -82.0; bx <= -56.0; bx += 4.3) {
    addBox(bx - 0.05, bx + 0.05, f2Y, f2Y + 0.98, -99.1, -98.6, espressoSteelMat);
  }
  // 10 Brass High Barstools + Mini Brass Table Lamps + Laptops & Iced Cups along the River-View Counter
  let stoolIdx = 0;
  for (let sx = -81.5; sx <= -56.5; sx += 2.75) {
    const stoolBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 12), espressoSteelMat);
    stoolBase.position.set(sx, f2Y + 0.02, -97.95);
    staticGroup.add(stoolBase);
    const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.72, 10), bronzeTrimMat);
    stoolLeg.position.set(sx, f2Y + 0.38, -97.95);
    staticGroup.add(stoolLeg);
    const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.2, 0.07, 14), cognacLeatherMat);
    stoolSeat.position.set(sx, f2Y + 0.75, -97.95);
    staticGroup.add(stoolSeat);
    addCoffeeCup(sx + 0.18, f2Y + 1.06, -98.85);
    if (stoolIdx % 2 === 0) {
      // Warm brass counter lamp
      const cLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.055, 0.32, 8), bronzeTrimMat);
      cLamp.position.set(sx - 0.52, f2Y + 1.22, -98.95);
      staticGroup.add(cLamp);
      const cShade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.11, 10), sbEmeraldMat);
      cShade.position.set(sx - 0.52, f2Y + 1.4, -98.95);
      staticGroup.add(cShade);
      const cBulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), warmGlowMat);
      cBulb.position.set(sx - 0.52, f2Y + 1.34, -98.95);
      staticGroup.add(cBulb);
    } else {
      // Open glowing laptop facing Sông Hàn!
      addBox(sx - 0.26, sx + 0.08, f2Y + 1.06, f2Y + 1.08, -98.9, -98.64, chromeMat);
      addBox(sx - 0.26, sx + 0.08, f2Y + 1.08, f2Y + 1.32, -98.94, -98.91, espressoSteelMat);
      const f2Screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), laptopGlowMat);
      f2Screen.position.set(sx - 0.09, f2Y + 1.2, -98.9);
      staticGroup.add(f2Screen);
    }
    stoolIdx++;
  }

  // Floor 2 West Wing — 2 Emerald Velvet Sofa Lounges
  addVelvetLoungeSet(-80.9, -91.6, f2Y);
  addVelvetLoungeSet(-80.9, -86.0, f2Y);

  // Floor 2 South-Center Vinyl & Acoustic Roastery Lounge Credenza (X = -72.6 .. -65.4, Z = -77.3 .. -75.2)
  addBox(-72.5, -65.5, f2Y, f2Y + 0.88, -76.3, -75.2, walnutWoodMat);
  addBox(-72.6, -65.4, f2Y + 0.88, f2Y + 0.95, -76.36, -75.15, marbleMat);
  // Vintage Brass Turntable & Dual Studio Monitors on Credenza
  addBox(-69.5, -68.5, f2Y + 0.95, f2Y + 1.08, -76.1, -75.45, espressoSteelMat);
  const vinylDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 18), espressoSteelMat);
  vinylDisc.position.set(-69.05, f2Y + 1.1, -75.78);
  staticGroup.add(vinylDisc);
  const vinylLabel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.024, 12), bronzeTrimMat);
  vinylLabel.position.set(-69.05, f2Y + 1.1, -75.78);
  staticGroup.add(vinylLabel);
  [-71.6, -66.4].forEach((sx) => {
    addBox(sx - 0.24, sx + 0.24, f2Y + 0.95, f2Y + 1.48, -76.0, -75.5, espressoSteelMat);
    const woofer = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), bronzeTrimMat);
    woofer.position.set(sx, f2Y + 1.14, -76.01);
    woofer.rotation.y = Math.PI;
    staticGroup.add(woofer);
  });

  // Floor 2 East Wing — Roastery Library Table & Upgraded Matcha / Cold Brew Bar
  addVelvetLoungeSet(-57.7, -90.5, f2Y);
  addBox(-59.3, -53.4, f2Y, f2Y + 1.05, -80.8, -79.0, walnutWoodMat);
  addBox(-59.45, -53.25, f2Y + 1.05, f2Y + 1.13, -80.95, -78.85, marbleMat);
  // Overhead illuminated "MATCHA • NITRO COLD BREW BAR" canopy on Floor 2
  const matchaSignTex = createBarCanopySignTexture('MATCHA  •  NITRO COLD BREW BAR', 'SLOW-DRIP KYOTO COLD BREW  •  CEREMONIAL MATCHA');
  const matchaSignMat = new THREE.MeshStandardMaterial({
    map: matchaSignTex,
    emissive: 0xffffff,
    emissiveMap: matchaSignTex,
    emissiveIntensity: 0.62,
    roughness: 0.25,
  });
  neonMats.push(matchaSignMat);
  addBox(-59.3, -53.4, f2Y + 2.95, f2Y + 3.55, -80.85, -79.3, espressoSteelMat);
  const f2BarSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.52), matchaSignMat);
  f2BarSign.position.set(-56.35, f2Y + 3.25, -80.87);
  f2BarSign.rotation.y = Math.PI;
  staticGroup.add(f2BarSign);

  // Cold Brew Nitro Taps, Kyoto Glass Slow-Drip Towers & Matcha Whisking Bowls on Floor 2 Bar
  [-58.3, -57.2, -56.1, -55.0].forEach((tx, idx) => {
    if (idx < 3) {
      const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.44, 10), bronzeTrimMat);
      tap.position.set(tx, f2Y + 1.34, -79.85);
      staticGroup.add(tap);
      addCoffeeCup(tx, f2Y + 1.13, -80.45);
    } else {
      // Glowing Amber Kyoto Cold-Brew Glass Drip Tower!
      const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 12), walnutWoodMat);
      towerBase.position.set(tx, f2Y + 1.17, -79.85);
      staticGroup.add(towerBase);
      const amberBulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), amberRoasterGlowMat);
      amberBulb.position.set(tx, f2Y + 1.48, -79.85);
      staticGroup.add(amberBulb);
      const glassTube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.62, 12), clearBalustradeMat);
      glassTube.position.set(tx, f2Y + 1.52, -79.85);
      staticGroup.add(glassTube);
    }
  });
  // 3 Front Barstools along Floor 2 Cold Brew Bar (Z = -81.35)
  [-58.2, -56.4, -54.6].forEach((sx) => {
    const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.04, 10), espressoSteelMat);
    sb.position.set(sx, f2Y + 0.02, -81.38);
    staticGroup.add(sb);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.72, 8), bronzeTrimMat);
    sl.position.set(sx, f2Y + 0.38, -81.38);
    staticGroup.add(sl);
    const ss = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.17, 0.065, 12), velvetGreenMat);
    ss.position.set(sx, f2Y + 0.75, -81.38);
    staticGroup.add(ss);
  });

  // Floor 2 East Backlit Bookshelf Wall
  addBox(-53.8, -52.68, f2Y, roofBottomY - 0.18, -96.2, -82.8, walnutWoodMat);
  const f2Mural = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 2.8), muralMat);
  f2Mural.position.set(-53.82, f2Y + 2.1, -89.5);
  f2Mural.rotation.y = -Math.PI / 2;
  staticGroup.add(f2Mural);

  // Floor 2 Back Wall Giant Glowing Starbucks Siren Art Emblem (visible straight from Sông Hàn through the glass!)
  const f2EmblemDisc = new THREE.Mesh(new THREE.CircleGeometry(1.55, 36), emblemFaceMat);
  f2EmblemDisc.position.set(centerX, f2Y + 2.2, backZ - 0.78);
  f2EmblemDisc.rotation.y = Math.PI;
  staticGroup.add(f2EmblemDisc);

  // =========================================================================
  // 11. SUSPENDED BRASS GLOBE PENDANT LIGHTS & BALANCED POINT LIGHTS
  // =========================================================================
  const addPendantLight = (x: number, yCeiling: number, dropLen: number, z: number) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, dropLen, 6), espressoSteelMat);
    cord.position.set(x, yCeiling - dropLen * 0.5, z);
    staticGroup.add(cord);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 12), bronzeTrimMat);
    cap.position.set(x, yCeiling - dropLen + 0.06, z);
    staticGroup.add(cap);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), warmGlowMat);
    globe.position.set(x, yCeiling - dropLen - 0.08, z);
    staticGroup.add(globe);
  };
  [-80.0, -74.0, -69.0, -64.0, -58.5].forEach((px) => {
    addPendantLight(px, f2Y - 0.36, 1.05, -80.4);
  });
  [-80.0, -58.5].forEach((px) => {
    addPendantLight(px, f2Y - 0.36, 0.95, -92.8);
  });
  [-80.5, -74.0, -69.0, -64.0, -57.5].forEach((px) => {
    addPendantLight(px, roofBottomY - 0.16, 1.05, -96.5);
  });
  [-80.5, -57.5].forEach((px) => {
    addPendantLight(px, roofBottomY - 0.16, 1.0, -87.5);
  });

  // Ground Glow Pools for warm night waterfront ambiance
  const poolTex = createRadialGlowPoolTexture('255, 206, 130');
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(poolMat);
  [-78.0, centerX, -60.0].forEach((px) => {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5.2), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(px, f1Y + 0.025, -101.8);
    staticGroup.add(pool);
  });

  // Balanced Warm Interior & Exterior Point Lights (FPS-friendly, 6 lights total)
  const addScaledPointLight = (
    x: number,
    y: number,
    z: number,
    color: number,
    distance: number,
    dayInt: number,
    nightInt: number
  ) => {
    const light = new THREE.PointLight(color, dayInt, distance, 1.6);
    light.position.set(x, y, z);
    scaledLights.push({ light, dayInt, nightInt, getScale: () => 1.0 });
  };
  addScaledPointLight(centerX, f1Y + 3.4, -88.0, 0xffd28e, 26, 1.2, 3.2); // F1 Roaster & Center Atrium
  addScaledPointLight(-79.5, f1Y + 3.2, -92.0, 0xffe0a8, 22, 0.9, 2.5); // F1 West Lounge
  addScaledPointLight(-58.5, f1Y + 3.2, -89.0, 0xffe0a8, 22, 0.9, 2.5); // F1 East Communal Table
  addScaledPointLight(centerX, f2Y + 3.4, -95.5, 0xffd28e, 28, 1.1, 3.4); // F2 Panoramic Riverfront Lounge
  addScaledPointLight(-58.0, f2Y + 3.2, -84.0, 0xffe0a8, 22, 0.85, 2.4); // F2 East Matcha Bar
  addScaledPointLight(centerX, f1Y + 3.6, -102.2, 0xfff0cc, 22, 0.5, 2.6); // Front Waterfront Patio Wash

  // --- AUTOMATIC SLIDING DOOR ANIMATION STATE (OPEN 24/7!) ---
  let doorOpen = 0;

  const update = (
    delta: number,
    _rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: StarbucksBachDangNpcController | null
  ) => {
    let wantOpen = false;
    if (playerPos) {
      const dx = playerPos.x - centerX;
      const dz = playerPos.z - glassFrontZ;
      if (Math.abs(dx) < 5.4 && Math.abs(dz) < 5.0 && playerPos.y < 2.8) {
        wantOpen = true;
      }
    }
    if (!wantOpen && npcController?.hasNpcNearDoor()) {
      wantOpen = true;
    }

    const targetOpen = wantOpen ? 1 : 0;
    doorOpen = THREE.MathUtils.damp(doorOpen, targetOpen, 7.5, delta);
    const slide = doorOpen * 2.16;
    doorLeftGroup.position.x = doorLeftClosedX - slide;
    doorRightGroup.position.x = doorRightClosedX + slide;
    doorSensorLedMat.emissiveIntensity = wantOpen ? 1.85 : 0.75;

    // Slowly rotate the brass coffee-bean cooling agitator arm
    agitatorSpinner.rotation.y += delta * 0.65;

    // Gentle night boost on Roaster amber glow
    amberRoasterGlowMat.emissiveIntensity = THREE.MathUtils.lerp(0.65, 1.45, lampFactor);
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => 0, // Always open 24/7!
    update,
  };
}

// =========================================================================
// NPC CONTROLLER (Baristas, Patio Guests, Floor 1 & Floor 2 Patrons!)
// Every patron & barista holding a Starbucks cup locks directly onto their
// animated GLB right-hand bone (zero floating cups, always upright in palm!).
// =========================================================================
const _tmpSbHandWorld = new THREE.Vector3();

function findGlbRightHandBone(modelRoot: THREE.Object3D): THREE.Object3D | null {
  const direct =
    modelRoot.getObjectByName('RightHand') ??
    modelRoot.getObjectByName('FistR') ??
    modelRoot.getObjectByName('Fist.R') ??
    modelRoot.getObjectByName('HandR') ??
    modelRoot.getObjectByName('Hand.R') ??
    modelRoot.getObjectByName('Hand_R') ??
    modelRoot.getObjectByName('mixamorigRightHand') ??
    modelRoot.getObjectByName('rightHand_20');
  if (direct) return direct;

  let fuzzy: THREE.Object3D | null = null;
  modelRoot.traverse((obj) => {
    if (fuzzy || !obj.name) return;
    const nm = obj.name.toLowerCase();
    if (
      nm.includes('thumb') ||
      nm.includes('index') ||
      nm.includes('middle') ||
      nm.includes('ring') ||
      nm.includes('pinky') ||
      nm.includes('finger') ||
      nm.includes('end')
    ) {
      return;
    }
    if (
      nm.includes('righthand') ||
      nm.includes('right_hand') ||
      nm.includes('fistr') ||
      nm.includes('fist.r') ||
      nm.includes('hand_r') ||
      nm.includes('hand.r') ||
      nm === 'handr'
    ) {
      fuzzy = obj;
    }
  });
  return fuzzy;
}

interface SbWalker {
  group: THREE.Group;
  glb: GlbHumanHandle;
  handBone: THREE.Object3D | null;
  modelRoot: THREE.Object3D | null;
  heldCup: THREE.Group;
  waypoints: Array<{ x: number; z: number }>;
  wpIdx: number;
  floorY: number;
  speed: number;
  pauseTimer: number;
  basePhase: number;
}

interface SbStationaryNpc {
  group: THREE.Group;
  glb: GlbHumanHandle;
  handBone: THREE.Object3D | null;
  modelRoot: THREE.Object3D | null;
  heldCup: THREE.Group | null;
  role: 'barista' | 'seated';
  baseY: number;
  baseYaw: number;
  phase: number;
}

export class StarbucksBachDangNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly walkers: SbWalker[] = [];
  private readonly stationary: SbStationaryNpc[] = [];
  private elapsed = 0;

  constructor(_helpers: HospitalCharacterHelpers) {
    this.rootGroup.name = 'StarbucksBachDangNpcs';
    this.rootGroup.userData.noMerge = true;

    const cupWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.36 });
    const cupGreenMat = new THREE.MeshStandardMaterial({ color: 0x00704a, roughness: 0.42 });
    const cupStrawMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
    const cupLidMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38 });
    const cupIcedCoffeeMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.24 });
    const cupMatchaMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.28 });
    const cupCreamMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.55 });
    const cupClearDomeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });

    /**
     * Multi-part iconic Starbucks Cup centered at palm-grip origin (0, 0, 0)
     * so when synced to the NPC's right-hand bone, fingers wrap right around the green sleeve!
     */
    const createHeldStarbucksCup = (variant: 'hot' | 'iced_coffee' | 'iced_matcha') => {
      const g = new THREE.Group();
      g.userData.noMerge = true;

      if (variant === 'hot') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.155, 10), cupWhiteMat);
        g.add(body);
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.043, 0.058, 10), cupGreenMat);
        g.add(sleeve);
        // Iconic white circular Siren emblem badge on front of sleeve
        const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 12), cupWhiteMat);
        emblem.rotation.x = Math.PI / 2;
        emblem.position.set(0, 0, 0.046);
        g.add(emblem);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.022, 10), cupLidMat);
        lid.position.y = 0.084;
        g.add(lid);
      } else {
        // Iced Cold Brew / Kyoto Matcha Frappuccino with whipped cream dome & green Starbucks straw!
        const drinkMat = variant === 'iced_matcha' ? cupMatchaMat : cupIcedCoffeeMat;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.035, 0.145, 10), drinkMat);
        g.add(body);
        const greenBand = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.042, 0.048, 10), cupGreenMat);
        g.add(greenBand);
        const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 12), cupWhiteMat);
        emblem.rotation.x = Math.PI / 2;
        emblem.position.set(0, 0, 0.045);
        g.add(emblem);
        const whip = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), cupCreamMat);
        whip.position.y = 0.068;
        g.add(whip);
        const domeLid = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), cupClearDomeMat);
        domeLid.position.y = 0.068;
        g.add(domeLid);
        const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.11, 6), cupStrawMat);
        straw.position.set(0.008, 0.125, 0);
        straw.rotation.z = -0.14;
        g.add(straw);
      }

      g.visible = false; // Stay hidden until GLB hand bone mounts (zero floating cups!)
      return g;
    };

    const cupVariants: Array<'hot' | 'iced_coffee' | 'iced_matcha'> = ['iced_coffee', 'hot', 'iced_matcha'];

    const spawnStationary = (
      x: number,
      y: number,
      z: number,
      yaw: number,
      role: 'barista' | 'seated',
      seed: number,
      giveCup: boolean
    ) => {
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.rotation.y = yaw;
      const modelSpec =
        role === 'barista'
          ? CASHIER_NPC_MODEL
          : seed % 2 === 0
            ? pickSeatedCivilianModel(seed)
            : pickStationaryCivilianModel(seed);

      const heldCup = giveCup ? createHeldStarbucksCup(cupVariants[seed % cupVariants.length]) : null;
      if (heldCup) grp.add(heldCup);

      const rec: SbStationaryNpc = {
        group: grp,
        glb: null as unknown as GlbHumanHandle,
        handBone: null,
        modelRoot: null,
        heldCup,
        role,
        baseY: y,
        baseYaw: yaw,
        phase: seed * 1.37,
      };

      rec.glb = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: grp,
        targetHeight: modelSpec.targetHeight,
        clipProfile: modelSpec.clipProfile,
        rotationY: modelSpec.rotationY,
        initialState: role === 'seated' ? 'Sit' : 'Checkout',
        phaseOffset: (seed % 17) * 0.37,
        allowRainUmbrella: false,
        onModelMounted: (modelRoot) => {
          rec.modelRoot = modelRoot;
          rec.handBone = findGlbRightHandBone(modelRoot);
        },
      });

      this.rootGroup.add(grp);
      this.stationary.push(rec);
    };

    const f1Y = STARBUCKS_BD_PODIUM_Y;
    const f2Y = STARBUCKS_BD_FLOOR2_Y;

    // 1. 4 Active Baristas (3 at Floor 1 Reserve Espresso Bar + 1 at Floor 2 Matcha & Cold Brew Bar)
    spawnStationary(-73.0, f1Y, -77.6, Math.PI, 'barista', 6101, true);
    spawnStationary(-69.0, f1Y, -77.6, Math.PI, 'barista', 6102, false);
    spawnStationary(-65.0, f1Y, -77.6, Math.PI, 'barista', 6103, true);
    spawnStationary(-56.4, f2Y, -77.8, Math.PI, 'barista', 6104, true);

    // 2. 10 Seated Patrons holding Starbucks Cups across Patio, Floor 1 & Floor 2 River-View Lounge
    // Waterfront Patio Bistro Guests
    spawnStationary(-81.25, f1Y, -101.9, Math.PI * 0.5, 'seated', 6201, true);
    spawnStationary(-56.75, f1Y, -101.9, -Math.PI * 0.5, 'seated', 6202, true);
    // Floor 1 Velvet Booths, Communal Work Table & SE Reading Nook
    spawnStationary(-80.2, f1Y, -96.25, 0, 'seated', 6203, true);
    spawnStationary(-79.6, f1Y, -89.15, Math.PI, 'seated', 6204, true);
    spawnStationary(-58.7, f1Y, -91.52, Math.PI, 'seated', 6205, true);
    spawnStationary(-60.15, f1Y, -94.08, 0, 'seated', 6209, true);
    spawnStationary(-58.65, f1Y, -76.55, 0.65, 'seated', 6210, true);
    // Floor 2 Panoramic Sông Hàn Window Bar & Velvet Lounge
    spawnStationary(-76.0, f2Y, -97.95, Math.PI, 'seated', 6206, true);
    spawnStationary(-65.0, f2Y, -97.95, Math.PI, 'seated', 6207, true);
    spawnStationary(-80.8, f2Y, -92.55, 0, 'seated', 6208, true);

    // 3. 6 Walking / Browsing Customers — EVERY ONE holding a real hand-locked Starbucks Coffee Cup!
    const walkerDefs: Array<{
      floorY: number;
      speed: number;
      seed: number;
      isOutdoor: boolean;
      waypoints: Array<{ x: number; z: number }>;
    }> = [
      // F1 Customer 1: Enters from Bạch Đằng sidewalk through auto doors -> Espresso bar -> West gallery
      {
        floorY: f1Y,
        speed: 1.35,
        seed: 6301,
        isOutdoor: true,
        waypoints: [
          { x: -69.0, z: -103.0 },
          { x: -69.0, z: -96.2 },
          { x: -73.8, z: -92.5 },
          { x: -73.8, z: -83.4 },
          { x: -66.5, z: -83.4 },
          { x: -64.2, z: -93.0 },
          { x: -69.0, z: -96.5 },
        ],
      },
      // F1 Customer 2: Strolls around Copper Roaster Cask & East Communal Lounge
      {
        floorY: f1Y,
        speed: 1.25,
        seed: 6302,
        isOutdoor: false,
        waypoints: [
          { x: -64.2, z: -83.4 },
          { x: -64.2, z: -94.8 },
          { x: -55.2, z: -95.2 },
          { x: -55.2, z: -87.8 },
          { x: -62.5, z: -83.4 },
        ],
      },
      // F1 Customer 3: Browses West Tumbler Merchandise Gallery & Pastry Display
      {
        floorY: f1Y,
        speed: 1.2,
        seed: 6303,
        isOutdoor: false,
        waypoints: [
          { x: -83.2, z: -94.5 },
          { x: -83.2, z: -86.2 },
          { x: -74.5, z: -83.4 },
          { x: -69.0, z: -83.4 },
          { x: -74.8, z: -93.2 },
        ],
      },
      // F1 Customer 4: Walks along Waterfront Patio & steps inside entrance through auto doors
      {
        floorY: f1Y,
        speed: 1.3,
        seed: 6304,
        isOutdoor: true,
        waypoints: [
          { x: -73.2, z: -102.6 },
          { x: -68.4, z: -102.6 },
          { x: -68.4, z: -95.5 },
          { x: -64.4, z: -95.5 },
          { x: -68.4, z: -96.5 },
          { x: -68.4, z: -102.6 },
          { x: -64.8, z: -102.6 },
        ],
      },
      // F2 Customer 5: Strolls Panoramic Sông Hàn Riverfront Terrace & West Lounge
      {
        floorY: f2Y,
        speed: 1.22,
        seed: 6305,
        isOutdoor: false,
        waypoints: [
          { x: -82.0, z: -95.6 },
          { x: -69.0, z: -95.6 },
          { x: -56.5, z: -95.6 },
          { x: -61.5, z: -86.8 },
          { x: -61.5, z: -94.5 },
          { x: -76.5, z: -94.5 },
        ],
      },
      // F2 Customer 6: Visits Floor 2 Cold Brew & Matcha Bar then overlooks Atrium Copper Roaster
      {
        floorY: f2Y,
        speed: 1.18,
        seed: 6306,
        isOutdoor: false,
        waypoints: [
          { x: -57.0, z: -82.6 },
          { x: -61.6, z: -82.6 },
          { x: -61.6, z: -94.0 },
          { x: -76.5, z: -94.0 },
          { x: -76.5, z: -82.0 },
          { x: -69.0, z: -80.4 },
          { x: -61.5, z: -80.4 },
        ],
      },
    ];

    walkerDefs.forEach((def) => {
      const grp = new THREE.Group();
      const p0 = def.waypoints[0];
      grp.position.set(p0.x, def.floorY, p0.z);
      const walkerSpec = def.isOutdoor
        ? pickOutsideNpcModel(def.seed)
        : pickShopCustomerModel(def.seed);

      const heldCup = createHeldStarbucksCup(cupVariants[def.seed % cupVariants.length]);
      grp.add(heldCup);

      const wRec: SbWalker = {
        group: grp,
        glb: null as unknown as GlbHumanHandle,
        handBone: null,
        modelRoot: null,
        heldCup,
        waypoints: def.waypoints,
        wpIdx: 1 % def.waypoints.length,
        floorY: def.floorY,
        speed: def.speed,
        pauseTimer: 0,
        basePhase: def.seed * 0.9,
      };

      wRec.glb = attachGlbHumanToNpc({
        modelSource: walkerSpec.modelSource,
        hostGroup: grp,
        targetHeight: walkerSpec.targetHeight,
        clipProfile: walkerSpec.clipProfile,
        rotationY: walkerSpec.rotationY,
        initialState: 'Walk',
        phaseOffset: (def.seed % 13) * 0.41,
        allowRainUmbrella: def.isOutdoor,
        onModelMounted: (modelRoot) => {
          wRec.modelRoot = modelRoot;
          wRec.handBone = findGlbRightHandBone(modelRoot);
        },
      });

      this.rootGroup.add(grp);
      this.walkers.push(wRec);
    });
  }

  private syncCupToHandBone(
    hostGroup: THREE.Group,
    handBone: THREE.Object3D | null,
    modelRoot: THREE.Object3D | null,
    cup: THREE.Group | null,
    hasActiveUmbrella: boolean
  ): void {
    if (!cup) return;
    if (!handBone || !modelRoot || !modelRoot.parent?.visible || hasActiveUmbrella) {
      cup.visible = false;
      return;
    }
    handBone.getWorldPosition(_tmpSbHandWorld);
    hostGroup.worldToLocal(_tmpSbHandWorld);
    // Guard against uninitialized or collapsed bone transform on frame 0
    if (
      Math.abs(_tmpSbHandWorld.x) > 0.85 ||
      _tmpSbHandWorld.y < 0.35 ||
      _tmpSbHandWorld.y > 1.75 ||
      Math.abs(_tmpSbHandWorld.z) > 0.85
    ) {
      cup.visible = false;
      return;
    }
    cup.visible = true;
    // Place cup sleeve center snugly inside palm/fingers & keep cup naturally upright
    cup.position.set(_tmpSbHandWorld.x, _tmpSbHandWorld.y - 0.015, _tmpSbHandWorld.z + 0.032);
    cup.rotation.set(0.05, 0, 0);
  }

  public hasNpcNearDoor(): boolean {
    const doorX = -69.0;
    const doorZ = -99.8;
    for (let i = 0; i < this.walkers.length; i++) {
      const w = this.walkers[i];
      if (w.floorY > 2.0) continue;
      const dx = w.group.position.x - doorX;
      const dz = w.group.position.z - doorZ;
      if (dx * dx + dz * dz < 14.0) return true;
    }
    return false;
  }

  public update(delta: number): void {
    const dt = Math.min(delta, 0.12);
    this.elapsed += dt;

    for (let i = 0; i < this.stationary.length; i++) {
      const npc = this.stationary[i];
      const sway = Math.sin(this.elapsed * (npc.role === 'barista' ? 1.8 : 0.85) + npc.phase);
      npc.group.rotation.y = npc.baseYaw + sway * (npc.role === 'barista' ? 0.18 : 0.06);
      npc.glb.setAnimState(npc.role === 'seated' ? 'Sit' : 'Checkout');
      this.syncCupToHandBone(
        npc.group,
        npc.handBone,
        npc.modelRoot,
        npc.heldCup,
        npc.glb.hasActiveUmbrella()
      );
    }

    for (let i = 0; i < this.walkers.length; i++) {
      const w = this.walkers[i];
      if (w.pauseTimer > 0) {
        w.pauseTimer -= dt;
        w.glb.setAnimState('Idle');
      } else {
        const target = w.waypoints[w.wpIdx];
        const dx = target.x - w.group.position.x;
        const dz = target.z - w.group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.28) {
          w.wpIdx = (w.wpIdx + 1) % w.waypoints.length;
          w.pauseTimer = 1.6 + ((i * 7 + w.wpIdx * 3) % 4) * 0.65;
          w.glb.setAnimState('Idle');
        } else {
          const step = Math.min(dist, w.speed * dt);
          w.group.position.x += (dx / dist) * step;
          w.group.position.z += (dz / dist) * step;
          w.group.position.y = w.floorY;
          const targetYaw = Math.atan2(dx, dz);
          steerYawSmooth(w.group, targetYaw, dt, 7.5);
          w.glb.setAnimState('Walk');
        }
      }

      this.syncCupToHandBone(
        w.group,
        w.handBone,
        w.modelRoot,
        w.heldCup,
        w.glb.hasActiveUmbrella()
      );
    }
  }
}
