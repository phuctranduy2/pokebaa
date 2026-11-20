import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isYslOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface YslBuildResult {
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
    npcController?: YslNpcController | null
  ) => void;
}

// =========================================================================
// SAINT LAURENT (YSL) FLAGSHIP BOUTIQUE — MODERNIST PARISIAN EDITION
// Directly East of Gucci along Đại lộ Đông Tây (X = 436.2 .. 460.0, Z = -11.6 .. 15.58)
// Podium Floor: Y = 0.16m (Floor 1 = 0.16, Floor 2 = 4.26; upper fluted stone massing to 12.95m)
// Recessed Limestone Portal: X = 448.4, Z = 12.50 (3.0m clear automatic glass doors, 07:00 - 23:00)
// =========================================================================

export const YSL_PODIUM_Y = 0.16;
export const YSL_FLOOR_H = 4.1;

const YSL_DOOR_X = 448.4;
const YSL_DOOR_Z = 12.50;

export const YSL_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 (Y = 0.16m) — Showroom, Recessed Portal & Galleries
  // =========================================================================
  { minX: 436.0, maxX: 436.8, minZ: -11.6, maxZ: 13.9, floor: 1 }, // West Wall
  { minX: 459.3, maxX: 460.2, minZ: -11.6, maxZ: 13.9, floor: 1 }, // East Wall
  { minX: 436.0, maxX: 460.2, minZ: -11.8, maxZ: -11.0, floor: 1 }, // North Rear Wall

  // South Facade split cleanly around Recessed Entrance Portal (X = 446.6 .. 450.2)
  { minX: 436.2, maxX: 446.55, minZ: 12.4, maxZ: 13.85, floor: 1 }, // Left Showcase Window & Engraved YSL Pier
  { minX: 450.25, maxX: 460.0, minZ: 12.4, maxZ: 13.85, floor: 1 }, // Right Limestone Wall & Shadow Alcove

  // Boulevard Curb Trees (Slender Grate Tree clear of SAINT LAURENT sign & Circular Steel Ring Planter)
  { minX: 444.7, maxX: 445.9, minZ: 17.5, maxZ: 18.7, floor: 1 },
  { minX: 454.3, maxX: 456.1, minZ: 16.9, maxZ: 18.7, floor: 1 },

  // Floor 1 Interior Display Furniture & Stairwell Rails
  { minX: 437.3, maxX: 443.9, minZ: 9.7, maxZ: 12.4, floor: 1 }, // Front-Left Window Showcase Plinth & Mannequins
  { minX: 439.2, maxX: 442.0, minZ: 4.5, maxZ: 6.3, floor: 1 }, // Front Black-Marble Handbag Table
  { minX: 439.2, maxX: 442.0, minZ: 0.9, maxZ: 2.7, floor: 1 }, // Rear Black-Marble Handbag Table
  { minX: 436.8, maxX: 438.1, minZ: -7.2, maxZ: 8.6, floor: 1 }, // West Wall Illuminated Archive Shelving
  { minX: 450.6, maxX: 454.2, minZ: 1.4, maxZ: 3.1, floor: 1 }, // Monolithic Nero Marquina Cashwrap Desk
  { minX: 451.1, maxX: 453.7, minZ: 4.8, maxZ: 6.4, floor: 1 }, // Fine Jewelry & Eyewear Glass Vitrine
  { minX: 451.1, maxX: 453.7, minZ: 7.9, maxZ: 9.0, floor: 1 }, // Black Leather Client Bench
  { minX: 457.4, maxX: 459.3, minZ: -2.2, maxZ: 9.2, floor: 1 }, // East Alabaster Footwear & Accessories Wall
  { minX: 445.0, maxX: 451.8, minZ: -10.9, maxZ: -9.6, floor: 1 }, // North Rear Marble Feature Credenza
  { minX: 442.6, maxX: 444.1, minZ: -9.9, maxZ: -8.3, floor: 1 }, // North Left Lounge Chair
  { minX: 454.25, maxX: 454.55, minZ: -11.1, maxZ: -4.1, floor: 1 }, // NE Stairwell West Balustrade
  { minX: 456.82, maxX: 457.18, minZ: -9.25, maxZ: -4.1, floor: 1 }, // NE Stairwell Center Spine
  { minX: 457.1, maxX: 459.5, minZ: -4.45, maxZ: -4.1, floor: 1 }, // Under-Stair Partition

  // =========================================================================
  // FLOOR 2 (Y = 4.26m) — Rive Droite Runway & Private Client Couture Salon
  // =========================================================================
  { minX: 436.0, maxX: 436.8, minZ: -11.6, maxZ: 13.9, floor: 2 }, // West Wall
  { minX: 459.3, maxX: 460.2, minZ: -11.6, maxZ: 13.9, floor: 2 }, // East Wall
  { minX: 436.0, maxX: 460.2, minZ: -11.8, maxZ: -11.0, floor: 2 }, // North Rear Wall
  { minX: 436.2, maxX: 460.0, minZ: 12.8, maxZ: 13.9, floor: 2 }, // South Solid Fluted Facade Wall
  { minX: 454.25, maxX: 454.55, minZ: -11.1, maxZ: -4.1, floor: 2 }, // Stairwell West Balustrade
  { minX: 456.82, maxX: 457.18, minZ: -9.25, maxZ: -4.1, floor: 2 }, // Stairwell Center Spine
  { minX: 454.5, maxX: 456.85, minZ: -5.1, maxZ: -4.1, floor: 2 }, // Floor 2 Left-Bay Velvet Rope
  { minX: 437.5, maxX: 442.8, minZ: 3.4, maxZ: 8.6, floor: 2 }, // West VIP Bouclé Sofa & Marble Coffee Table
  { minX: 444.0, maxX: 445.1, minZ: 0.4, maxZ: 1.5, floor: 2 }, // Runway Mannequin Plinth NW
  { minX: 444.0, maxX: 445.1, minZ: 6.4, maxZ: 7.5, floor: 2 }, // Runway Mannequin Plinth SW
  { minX: 449.5, maxX: 450.6, minZ: 0.4, maxZ: 1.5, floor: 2 }, // Runway Mannequin Plinth NE
  { minX: 449.5, maxX: 450.6, minZ: 6.4, maxZ: 7.5, floor: 2 }, // Runway Mannequin Plinth SE
  { minX: 444.6, maxX: 450.0, minZ: 10.6, maxZ: 12.2, floor: 2 }, // South Rive Droite Vinyl & Art Console
  { minX: 451.8, maxX: 453.6, minZ: 1.5, maxZ: 7.5, floor: 2 }, // East Couture Handbag Island
];

export interface YslPlacementConfig {
  anchorX: number;
  anchorZ: number;
  rotationY: number;
  seedOffset?: number;
}

const YSL_ORIG_ANCHOR_X = 448.1;
const YSL_ORIG_ANCHOR_Z = 15.58;

/**
 * SAINT LAURENT (YSL) — Chi nhánh Đường Bạch Đằng (bên cạnh KATINAT Bạch Đằng):
 * - Footprint: X = 94.6 .. 118.4 (23.8m wide, 1.4m West of KATINAT at X = 119.8)
 * - Depth:     Z = -104.0 .. -76.82 (front plaza flush with Đường Bạch Đằng Z = -104.0)
 * - Facing:    North (-Z) toward Sông Hàn & Đường Bạch Đằng (rotationY = Math.PI)
 * - Doorway:   X = 104.4 .. 108.0, Z = -100.92
 */
export const YSL_BACH_DANG_PLACEMENT: YslPlacementConfig = {
  anchorX: 106.5,
  anchorZ: -104.0,
  rotationY: Math.PI,
  seedOffset: 41,
};

function transformYslPointXZ(
  ox: number,
  oz: number,
  placement: YslPlacementConfig
): { x: number; z: number } {
  const lx = ox - YSL_ORIG_ANCHOR_X;
  const lz = oz - YSL_ORIG_ANCHOR_Z;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: placement.anchorX + lx * c + lz * s,
    z: placement.anchorZ - lx * s + lz * c,
  };
}

function inverseTransformYslPointXZ(
  wx: number,
  wz: number,
  placement: YslPlacementConfig
): { x: number; z: number } {
  const dx = wx - placement.anchorX;
  const dz = wz - placement.anchorZ;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: YSL_ORIG_ANCHOR_X + dx * c - dz * s,
    z: YSL_ORIG_ANCHOR_Z + dx * s + dz * c,
  };
}

export function createTransformedYslColliders(
  placement: YslPlacementConfig
): IntersectionColliderBox[] {
  return YSL_COLLIDERS.filter((box) => box.minZ < 16.5).map((box) => {
    const p1 = transformYslPointXZ(box.minX, box.minZ, placement);
    const p2 = transformYslPointXZ(box.maxX, box.maxZ, placement);
    const p3 = transformYslPointXZ(box.minX, box.maxZ, placement);
    const p4 = transformYslPointXZ(box.maxX, box.minZ, placement);
    return {
      minX: Math.min(p1.x, p2.x, p3.x, p4.x),
      maxX: Math.max(p1.x, p2.x, p3.x, p4.x),
      minZ: Math.min(p1.z, p2.z, p3.z, p4.z),
      maxZ: Math.max(p1.z, p2.z, p3.z, p4.z),
      floor: box.floor,
    };
  });
}

export const YSL_BACH_DANG_COLLIDERS: IntersectionColliderBox[] =
  createTransformedYslColliders(YSL_BACH_DANG_PLACEMENT);

// =========================================================================
// PROCEDURAL SAINT LAURENT (YSL) TEXTURES
// =========================================================================

function createYslFlutedStoneTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#cac5bc';
  ctx.fillRect(0, 0, w, h);

  // Fine architectural vertical fluting ribs with crisp 3D light/shadow gradients
  for (let x = 0; x < w; x += 6) {
    ctx.fillStyle = (x / 6) % 2 === 0 ? 'rgba(255, 253, 249, 0.30)' : 'rgba(56, 53, 49, 0.18)';
    ctx.fillRect(x, 0, 3, h);
  }

  // Subtle mineral stone speckles
  for (let i = 0; i < 480; i++) {
    const sx = (i * 197) % w;
    const sy = (i * 313) % h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(68, 64, 58, 0.14)' : 'rgba(246, 242, 236, 0.18)';
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Crisp grid panel joints (6 columns x 3 rows)
  ctx.strokeStyle = 'rgba(30, 29, 28, 0.62)';
  ctx.lineWidth = 4;
  for (let col = 1; col < 6; col++) {
    const x = (col * w) / 6;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let row = 1; row < 3; row++) {
    const y = (row * h) / 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createYslLimestoneTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ebe3d5';
  ctx.fillRect(0, 0, size, size);

  // Fine sand & travertine mineral flecking
  for (let i = 0; i < 720; i++) {
    const x = (i * 137) % size;
    const y = (i * 251) % size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(136, 124, 108, 0.17)' : 'rgba(252, 248, 242, 0.24)';
    ctx.fillRect(x, y, 2 + (i % 2), 2);
  }

  // Crisp precision slab seams
  ctx.strokeStyle = 'rgba(112, 102, 90, 0.36)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= size; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += 256) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = 4;
  return tex;
}

function createNeroMarquinaTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#121316';
  ctx.fillRect(0, 0, size, size);

  // Organic crisp white calcite marble veins
  ctx.strokeStyle = 'rgba(235, 236, 238, 0.26)';
  for (let v = 0; v < 9; v++) {
    ctx.lineWidth = 1.2 + (v % 3) * 0.9;
    ctx.beginPath();
    let vx = (v * 64) % size;
    let vy = 0;
    ctx.moveTo(vx, vy);
    for (let s = 1; s <= 8; s++) {
      vx += ((s * 37 + v * 19) % 54) - 24;
      vy = (s * size) / 8;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  // Subtle tile grid joints
  ctx.strokeStyle = 'rgba(46, 48, 54, 0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 128) {
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
  tex.repeat.set(4, 4);
  tex.anisotropy = 4;
  return tex;
}

function createSmokedParquetTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#2d241e';
  ctx.fillRect(0, 0, size, size);

  const plankH = 32;
  for (let y = 0; y < size; y += plankH) {
    const tone = ((y / plankH) % 3) * 5;
    ctx.fillStyle = `rgb(${44 + tone}, ${35 + tone}, ${29 + tone})`;
    ctx.fillRect(0, y, size, plankH - 1);
    ctx.fillStyle = 'rgba(18, 13, 10, 0.48)';
    ctx.fillRect(0, y + plankH - 2, size, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = 4;
  return tex;
}

function createSaintLaurentWordmarkTex(
  color = '#ffffff',
  glow = 'rgba(255, 252, 240, 0.9)',
  subdued = false
): THREE.CanvasTexture {
  const w = 1024;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const text = 'SAINT LAURENT';
  ctx.save();
  if (!subdued) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
  } else {
    ctx.shadowColor = 'rgba(80, 72, 62, 0.45)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = color;
  ctx.font = '700 78px "Helvetica Neue", "Arial Narrow", "Futura", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Tight editorial Yves Saint Laurent kerning
  const chars = text.split('');
  const step = 68;
  const startX = w * 0.5 - ((chars.length - 1) * step) * 0.5;
  chars.forEach((ch, idx) => {
    ctx.fillText(ch, startX + idx * step, h * 0.52);
  });
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawCassandreYslMonogram(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  strokeColor: string,
  glowColor?: string,
  boldEdge = false
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 28;
  }
  ctx.fillStyle = strokeColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineJoin = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Iconic bold vertical interlocking Cassandre YSL monogram
  ctx.font = '600 136px "Times New Roman", "Georgia", serif';
  if (boldEdge) {
    ctx.lineWidth = 5;
    ctx.strokeText('Y', -8, -78);
  }
  ctx.fillText('Y', -8, -78);

  ctx.save();
  ctx.font = 'italic 600 134px "Times New Roman", "Georgia", serif';
  if (boldEdge) {
    ctx.lineWidth = 5;
    ctx.strokeText('S', 2, 2);
  }
  ctx.fillText('S', 2, 2);
  ctx.restore();

  ctx.font = '600 136px "Times New Roman", "Georgia", serif';
  if (boldEdge) {
    ctx.lineWidth = 5;
    ctx.strokeText('L', 15, 82);
  }
  ctx.fillText('L', 15, 82);

  ctx.restore();
}

function createYslCassandreMonogramTex(
  color = '#ffffff',
  glow?: string,
  boldEdge = false
): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  drawCassandreYslMonogram(ctx, w * 0.5, h * 0.5, 2.75, color, glow, boldEdge);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createYslShoppingBagTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0e0e10';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 26px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SAINT LAURENT', size * 0.5, size * 0.48);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 16px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('PARIS', size * 0.5, size * 0.63);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createYslEditorialPhotoTex(variant: number): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = variant % 2 === 0 ? '#18181b' : '#27272a';
  ctx.fillRect(0, 0, w, h);

  // High-contrast monochrome fashion editorial silhouette
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.36, 10, w * 0.5, h * 0.4, 150);
  grad.addColorStop(0, '#f4f4f5');
  grad.addColorStop(0.55, '#52525b');
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.28, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(w * 0.5 - 38, h * 0.35, 76, 175);

  ctx.fillStyle = '#e4e4e7';
  ctx.font = '700 16px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAINT LAURENT PARIS', w * 0.5, h - 32);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// =========================================================================
// INTERIOR & PROP HELPERS
// =========================================================================

function buildYslHandbag(
  x: number,
  y: number,
  z: number,
  leatherMat: THREE.Material,
  hardwareMat: THREE.Material,
  yaw = 0
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.14), leatherMat);
  body.position.y = 0.12;
  g.add(body);

  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.13, 0.15), leatherMat);
  flap.position.set(0, 0.16, 0.01);
  g.add(flap);

  // Metallic YSL clasp bar
  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.02), hardwareMat);
  clasp.position.set(0, 0.14, 0.082);
  g.add(clasp);

  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 16, Math.PI), hardwareMat);
  chain.position.set(0, 0.24, 0);
  g.add(chain);

  return g;
}

function buildYslMannequin(
  x: number,
  y: number,
  z: number,
  yaw: number,
  suitMat: THREE.Material,
  shirtMat: THREE.Material,
  plinthMat: THREE.Material,
  chromeMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.76), plinthMat);
  plinth.position.y = 0.08;
  g.add(plinth);

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.92, 10), suitMat);
  legs.position.set(-0.08, 0.62, 0);
  g.add(legs);
  const legR = legs.clone();
  legR.position.set(0.08, 0.62, 0);
  g.add(legR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.64, 0.22), suitMat);
  torso.position.y = 1.36;
  g.add(torso);

  const lapelV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.03), shirtMat);
  lapelV.position.set(0, 1.44, 0.105);
  g.add(lapelV);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), chromeMat);
  collar.position.y = 1.72;
  g.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), plinthMat);
  head.position.y = 1.88;
  g.add(head);

  return g;
}

function buildYslBoulevardTree(
  x: number,
  z: number,
  planterStyle: 'grate' | 'ring',
  darkSteelMat: THREE.Material,
  chromeRingMat: THREE.Material,
  soilMat: THREE.Material,
  trunkMat: THREE.Material,
  foliageMat: THREE.Material,
  uplightMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  if (planterStyle === 'grate') {
    const grate = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.04, 1.18), darkSteelMat);
    grate.position.y = 0.02;
    g.add(grate);
    const upLed = new THREE.Mesh(new THREE.RingGeometry(0.20, 0.28, 16), uplightMat);
    upLed.rotation.x = -Math.PI * 0.5;
    upLed.position.y = 0.045;
    g.add(upLed);
  } else {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.96, 0.36, 20), chromeRingMat);
    ring.position.y = 0.18;
    g.add(ring);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.37, 16), soilMat);
    soil.position.y = 0.185;
    g.add(soil);
    const upRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 20), uplightMat);
    upRing.rotation.x = -Math.PI * 0.5;
    upRing.position.y = 0.38;
    g.add(upRing);
  }

  // Slender tall trunk lifting canopy above the SAINT LAURENT storefront fascia (Y = 3.40)
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.11, 2.95, 8), trunkMat);
  trunk.position.y = 1.475;
  g.add(trunk);

  // Two delicate forked upper limbs
  [-0.28, 0.26].forEach((bx, idx) => {
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.055, 1.15, 6), trunkMat);
    limb.position.set(bx, 3.25, idx === 0 ? 0.10 : -0.10);
    limb.rotation.z = idx === 0 ? 0.36 : -0.34;
    g.add(limb);
  });

  // Airy high dappled honey-locust foliage tufts (sits cleanly at Y = 3.85..5.10)
  const puffSpecs: [number, number, number, number][] = [
    [0, 4.25, 0, 0.74],
    [-0.72, 4.08, 0.20, 0.52],
    [0.68, 4.15, -0.18, 0.55],
    [-0.30, 4.65, -0.22, 0.48],
    [0.34, 4.72, 0.24, 0.46],
    [0.02, 5.05, 0.02, 0.42],
  ];
  puffSpecs.forEach(([px, py, pz, r]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), foliageMat);
    leaf.position.set(px, py, pz);
    leaf.scale.set(1.12, 0.56, 1.05);
    g.add(leaf);
  });

  return g;
}

// =========================================================================
// MAIN SAINT LAURENT (YSL) FLAGSHIP BUILDER
// =========================================================================

export function createYslStoreStructure(
  placement?: YslPlacementConfig
): YslBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared Architectural Materials
  const flutedStoneTex = createYslFlutedStoneTex();
  const flutedStoneMat = new THREE.MeshStandardMaterial({
    map: flutedStoneTex,
    color: 0xd2cdc3,
    roughness: 0.72,
    metalness: 0.04,
  });
  const limestoneTex = createYslLimestoneTex();
  const limestoneMat = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    color: 0xe7dfd1,
    roughness: 0.64,
    metalness: 0.03,
  });
  const warmTravertineMat = new THREE.MeshStandardMaterial({
    color: 0xddd2c0,
    roughness: 0.56,
    metalness: 0.05,
  });
  const darkGunmetalFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1d2026,
    roughness: 0.34,
    metalness: 0.78,
  });
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x0c0d10,
    roughness: 0.45,
    metalness: 0.35,
  });
  const neroMarquinaTex = createNeroMarquinaTex();
  const neroMarquinaMat = new THREE.MeshStandardMaterial({
    map: neroMarquinaTex,
    color: 0x1e2024,
    roughness: 0.22,
    metalness: 0.14,
  });
  const smokedParquetTex = createSmokedParquetTex();
  const smokedParquetMat = new THREE.MeshStandardMaterial({
    map: smokedParquetTex,
    color: 0x5c4b3e,
    roughness: 0.52,
    metalness: 0.05,
  });
  const brushedChromeMat = new THREE.MeshStandardMaterial({
    color: 0xd9dde3,
    roughness: 0.20,
    metalness: 0.90,
  });
  const satinBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd4b26f,
    roughness: 0.24,
    metalness: 0.85,
  });
  const whiteLeatherMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.48 });
  const blackLeatherMat = new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.34, metalness: 0.08 });
  const espressoLeatherMat = new THREE.MeshStandardMaterial({ color: 0x45281a, roughness: 0.38 });
  const burgundyLeatherMat = new THREE.MeshStandardMaterial({ color: 0x5b1620, roughness: 0.36 });
  const charcoalWoolMat = new THREE.MeshStandardMaterial({ color: 0x26272b, roughness: 0.88 });
  const boucleCreamMat = new THREE.MeshStandardMaterial({ color: 0xeae3d6, roughness: 0.86 });
  const velvetCurtainMat = new THREE.MeshStandardMaterial({ color: 0x191a1e, roughness: 0.85 });

  const crispGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbe7ec,
    transparent: true,
    opacity: 0.16,
    roughness: 0.06,
    metalness: 0.12,
    depthWrite: false,
  });
  const interiorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe6eef2,
    transparent: true,
    opacity: 0.24,
    roughness: 0.06,
    metalness: 0.12,
    depthWrite: false,
  });
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xcfd6dd,
    roughness: 0.08,
    metalness: 0.95,
  });

  const warmLedMat = new THREE.MeshStandardMaterial({
    color: 0xfff8eb,
    emissive: 0xffefd2,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });
  neonMats.push(warmLedMat);

  const yslSignGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff8ea,
    emissiveIntensity: 1.65,
    roughness: 0.18,
  });
  neonMats.push(yslSignGlowMat);

  // Helper to place axis-aligned architectural boxes cleanly
  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    noMerge = false
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (noMerge) m.userData.noMerge = true;
    staticGroup.add(m);
    return m;
  };

  // =========================================================================
  // 1. FOREGROUND SIDEWALK APRON, GRANITE STEP & STRUCTURAL ENVELOPE
  // =========================================================================
  const xMin = 436.2;
  const xMax = 460.0;
  const xMid = (xMin + xMax) * 0.5; // 448.1
  const totalW = xMax - xMin; // 23.8m
  const zMin = -11.6;
  const zMax = 13.6;
  const zMid = (zMin + zMax) * 0.5; // 1.0
  const totalD = zMax - zMin; // 25.2m

  // Forecourt paving apron flush at sidewalk grade (Z = 13.6 .. 15.58)
  addBox(totalW, 0.04, 1.98, xMid, 0.02, 14.59, neroMarquinaMat);
  // Subtle sloped granite entrance threshold up to podium (X = 446.2 .. 450.6, Z = 13.6 .. 14.95)
  addBox(4.4, 0.08, 1.35, YSL_DOOR_X, 0.05, 14.27, warmTravertineMat);
  addBox(4.4, 0.14, 0.72, YSL_DOOR_X, 0.09, 13.94, warmTravertineMat);

  // Floor 1 Podium Slab (Y = 0 .. 0.16) — inset inside side & rear exterior walls to prevent Z-fighting
  addBox(totalW - 0.16, YSL_PODIUM_Y, totalD - 0.08, xMid, YSL_PODIUM_Y * 0.5, zMid + 0.04, neroMarquinaMat);
  // Floor 2 Slab (Y = 4.26) — inset 0.12m inside exterior walls, carved open over NE stairwell (X = 454.5..459.4, Z = -11.1..-4.1)
  addBox(18.18, 0.24, 24.96, 445.41, YSL_PODIUM_Y + YSL_FLOOR_H - 0.12, 1.00, smokedParquetMat);
  addBox(5.38, 0.24, 17.58, 457.19, YSL_PODIUM_Y + YSL_FLOOR_H - 0.12, 4.69, smokedParquetMat);
  addBox(5.38, 0.24, 0.38, 457.19, YSL_PODIUM_Y + YSL_FLOOR_H - 0.12, -11.29, smokedParquetMat);

  // Ceilings & Roof Deck (Y = 8.46 inset inside walls; upper modernist volume cap Y = 12.60 .. 12.96)
  addBox(totalW - 0.32, 0.28, totalD - 0.32, xMid, YSL_PODIUM_Y + YSL_FLOOR_H * 2 + 0.14, zMid, limestoneMat);
  addBox(totalW + 0.16, 0.36, totalD + 0.16, xMid, 12.78, zMid, darkGunmetalFrameMat);

  // Exterior Side Walls & Rear Wall (rear wall inset between side walls to avoid corner Z-fighting)
  addBox(0.55, 12.6, totalD, xMin + 0.275, 6.3, zMid, darkGunmetalFrameMat);
  addBox(0.55, 12.6, totalD, xMax - 0.275, 6.3, zMid, darkGunmetalFrameMat);
  addBox(totalW - 0.12, 12.6, 0.55, xMid, 6.3, zMin + 0.275, flutedStoneMat);

  // Upper side/rear parapet accent band (matches clean urban luxury block)
  addBox(totalW - 1.1, 4.15, totalD - 1.1, xMid, 10.55, zMid, obsidianMat);

  // =========================================================================
  // 2. ICONIC SAINT LAURENT STREET FACADE (MATCHING IMAGES 2 & 3)
  // =========================================================================
  // A. Upper Monolithic Fluted Stone Grid Facade (Y = 3.85 .. 12.60, Z = 13.62)
  addBox(totalW - 0.50, 8.75, 0.42, xMid, 8.225, 13.52, flutedStoneMat);
  // Crisp outer charcoal metal edge frame proud of facade front (no coplanar overlap with side walls)
  addBox(0.34, 12.60, 0.26, xMin + 0.15, 6.30, 13.68, darkGunmetalFrameMat);
  addBox(0.34, 12.60, 0.26, xMax - 0.15, 6.30, 13.68, darkGunmetalFrameMat);
  addBox(totalW + 0.16, 0.36, 0.24, xMid, 12.78, 13.74, darkGunmetalFrameMat);

  // Hairline architectural warm LED grazing strips under top parapet & along limestone reveal
  addBox(totalW - 0.85, 0.045, 0.05, xMid, 12.56, 13.76, warmLedMat);
  addBox(15.2, 0.035, 0.04, 451.8, 3.84, 13.75, warmLedMat);

  // B. Oversized Prominent Upper-Right Illuminated YSL Cassandre Monogram (2-Layer Halo)
  const yslHaloTex = createYslCassandreMonogramTex('#ffeed0', 'rgba(255, 224, 160, 1.0)', true);
  const yslHaloMat = new THREE.MeshStandardMaterial({
    map: yslHaloTex,
    transparent: true,
    opacity: 0.72,
    emissive: 0xffe4b8,
    emissiveMap: yslHaloTex,
    emissiveIntensity: 1.55,
    roughness: 0.25,
    depthWrite: false,
  });
  neonMats.push(yslHaloMat);
  const upperHaloMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.82, 5.55), yslHaloMat);
  upperHaloMesh.position.set(456.15, 9.75, 13.78);
  staticGroup.add(upperHaloMesh);

  const yslUpperLogoTex = createYslCassandreMonogramTex('#ffffff', 'rgba(255, 252, 244, 0.98)', true);
  const yslUpperLogoMat = new THREE.MeshStandardMaterial({
    map: yslUpperLogoTex,
    transparent: true,
    emissive: 0xffffff,
    emissiveMap: yslUpperLogoTex,
    emissiveIntensity: 2.35,
    roughness: 0.12,
    depthWrite: false,
  });
  neonMats.push(yslUpperLogoMat);
  const upperCrestMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 5.05), yslUpperLogoMat);
  upperCrestMesh.position.set(456.15, 9.75, 13.84);
  staticGroup.add(upperCrestMesh);

  // C. Lower Left Bay — Ribbed Header w/ Illuminated SAINT LAURENT + Huge Showcase Glass Window (X = 436.52 .. 444.20)
  // Upper ribbed header band over window (Y = 2.95 .. 3.85)
  addBox(7.68, 0.90, 0.42, 440.36, 3.40, 13.52, flutedStoneMat);
  // Glowing white SAINT LAURENT wordmark above showcase window (clear of curb tree!)
  const saintLaurentGlowTex = createSaintLaurentWordmarkTex('#ffffff', 'rgba(255, 252, 244, 0.96)', false);
  const saintLaurentGlowMat = new THREE.MeshStandardMaterial({
    map: saintLaurentGlowTex,
    transparent: true,
    emissive: 0xffffff,
    emissiveMap: saintLaurentGlowTex,
    emissiveIntensity: 1.95,
    roughness: 0.12,
    depthWrite: false,
  });
  neonMats.push(saintLaurentGlowMat);
  const frontWordmarkMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.10, 0.94), saintLaurentGlowMat);
  frontWordmarkMesh.position.set(439.85, 3.40, 13.78);
  staticGroup.add(frontWordmarkMesh);

  // Black matte steel showcase window perimeter frame (X = 436.52 .. 444.20, Y = 0.16 .. 2.95)
  addBox(7.68, 0.10, 0.24, 440.36, 0.21, 13.48, darkGunmetalFrameMat);
  addBox(7.68, 0.10, 0.24, 440.36, 2.90, 13.48, darkGunmetalFrameMat);
  addBox(0.10, 2.78, 0.24, 436.57, 1.55, 13.48, darkGunmetalFrameMat);
  addBox(0.10, 2.78, 0.24, 444.15, 1.55, 13.48, darkGunmetalFrameMat);
  addBox(0.06, 2.66, 0.14, 440.36, 1.55, 13.48, darkGunmetalFrameMat); // Slim crisp center mullion
  // Crystal-clear front showcase glass panes
  addBox(3.72, 2.62, 0.04, 438.46, 1.55, 13.48, crispGlassMat);
  addBox(3.72, 2.62, 0.04, 442.26, 1.55, 13.48, crispGlassMat);

  // D. Center-Left Limestone Pier (X = 444.20 .. 446.60, Y = 0.16 .. 3.85) w/ Enlarged Engraved YSL + Intercom
  addBox(2.40, 3.69, 0.44, 445.40, 2.005, 13.52, limestoneMat);
  const engravedYslTex = createYslCassandreMonogramTex('#5e564c', undefined, true);
  const engravedYslMat = new THREE.MeshStandardMaterial({
    map: engravedYslTex,
    transparent: true,
    roughness: 0.80,
    depthWrite: false,
  });
  const engravedYslMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.88), engravedYslMat);
  engravedYslMesh.position.set(445.32, 1.98, 13.76);
  staticGroup.add(engravedYslMesh);
  // Signature black door-bell / security intercom box beside doorway (Image 3)
  addBox(0.11, 0.18, 0.03, 446.28, 1.36, 13.75, obsidianMat);
  addBox(0.04, 0.04, 0.035, 446.28, 1.36, 13.755, brushedChromeMat);

  // E. Deeply Recessed Limestone Entrance Vestibule (X = 446.60 .. 450.20, Z = 12.35 .. 13.65)
  // Upper lintel header above portal (Y = 3.05 .. 3.85)
  addBox(3.60, 0.80, 1.42, YSL_DOOR_X, 3.45, 13.03, limestoneMat);
  // Vestibule West & East limestone return walls
  addBox(0.24, 2.90, 1.30, 446.72, 1.61, 13.00, limestoneMat);
  addBox(0.24, 2.90, 1.30, 450.08, 1.61, 13.00, limestoneMat);
  // Inner access keypad + glowing green LED dot on West return wall (Image 3 detail!)
  addBox(0.03, 0.16, 0.10, 446.85, 1.36, 12.82, obsidianMat);
  addBox(0.035, 0.03, 0.03, 446.85, 1.33, 12.82, new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 1.8,
  }));
  // Warm vestibule soffit ceiling downlights
  [447.55, 448.40, 449.25].forEach((lx) => {
    addBox(0.12, 0.03, 0.12, lx, 3.04, 13.05, warmLedMat);
  });

  // Slim Black-Steel Portal Frame & Automatic Bi-Parting Glass Doors (Z = 12.50)
  addBox(3.26, 0.10, 0.14, YSL_DOOR_X, 3.00, YSL_DOOR_Z, darkGunmetalFrameMat);
  addBox(0.10, 2.86, 0.14, 446.87, 1.59, YSL_DOOR_Z, darkGunmetalFrameMat);
  addBox(0.10, 2.86, 0.14, 449.93, 1.59, YSL_DOOR_Z, darkGunmetalFrameMat);

  const createDoorLeaf = (cx: number) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;
    leaf.position.set(cx, YSL_PODIUM_Y, YSL_DOOR_Z);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.07, 0.07), darkGunmetalFrameMat);
    frameTop.position.y = 2.78;
    leaf.add(frameTop);
    const frameBot = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 0.07), darkGunmetalFrameMat);
    frameBot.position.y = 0.04;
    leaf.add(frameBot);
    const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.82, 0.07), darkGunmetalFrameMat);
    edgeL.position.set(-0.71, 1.41, 0);
    leaf.add(edgeL);
    const edgeR = edgeL.clone();
    edgeR.position.set(0.71, 1.41, 0);
    leaf.add(edgeR);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.68, 0.025), crispGlassMat);
    glass.position.set(0, 1.41, 0);
    leaf.add(glass);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.85, 0.08), brushedChromeMat);
    handle.position.set(cx < YSL_DOOR_X ? 0.58 : -0.58, 1.25, 0.04);
    leaf.add(handle);
    staticGroup.add(leaf);
    return leaf;
  };
  const leftClosedX = YSL_DOOR_X - 0.74;
  const rightClosedX = YSL_DOOR_X + 0.74;
  const doorLeftLeaf = createDoorLeaf(leftClosedX);
  const doorRightLeaf = createDoorLeaf(rightClosedX);

  // Automatic Rolling Security Shutter (closed 23:00 - 07:00)
  const shutterTex = createRollingShutterTexture({
    title: 'SAINT LAURENT PARIS',
    hoursLabel: 'OPEN DAILY : 07:00 - 23:00',
    accentHex: '#18181b',
    slatDarkHex: '#1e2024',
    slatLightHex: '#3f4249',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.42,
    metalness: 0.65,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'ysl-main-shutter',
      axis: 'x',
      pos: 12.66,
      spanCenter: YSL_DOOR_X,
      width: 3.16,
      baseY: YSL_PODIUM_Y,
      topY: 2.98,
    },
    shutterMat,
    darkGunmetalFrameMat
  );

  // F. Right Monolithic Cream Limestone Wall + Embossed SAINT LAURENT (X = 450.20 .. 457.20)
  addBox(7.00, 3.69, 0.44, 453.70, 2.005, 13.52, limestoneMat);
  const embossedSlTex = createSaintLaurentWordmarkTex('#9b9286', '', true);
  const embossedSlMat = new THREE.MeshStandardMaterial({
    map: embossedSlTex,
    transparent: true,
    roughness: 0.88,
    depthWrite: false,
  });
  const embossedSlMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 0.64), embossedSlMat);
  embossedSlMesh.position.set(453.75, 1.54, 13.76);
  staticGroup.add(embossedSlMesh);

  // G. Far-Right Architectural Black Shadow Alcove (X = 457.20 .. 459.68, Image 2 right edge)
  addBox(2.48, 3.69, 0.35, 458.44, 2.005, 12.05, obsidianMat);
  addBox(0.24, 3.69, 1.50, 457.32, 2.005, 12.90, limestoneMat);
  addBox(0.24, 3.69, 1.50, 459.56, 2.005, 12.90, darkGunmetalFrameMat);

  // =========================================================================
  // 3. BOULEVARD TREES ALONG YSL SIDEWALK (IMAGE 2 EXACT PLANTER PAIR, CLEAR OF TEXT)
  // =========================================================================
  if (!placement) {
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3a2c, roughness: 0.9 });
    const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x4b8744, roughness: 0.78 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x2b211a, roughness: 0.95 });
    staticGroup.add(
      buildYslBoulevardTree(445.3, 18.1, 'grate', darkGunmetalFrameMat, brushedChromeMat, soilMat, treeTrunkMat, treeLeafMat, warmLedMat)
    );
    staticGroup.add(
      buildYslBoulevardTree(455.2, 17.8, 'ring', darkGunmetalFrameMat, brushedChromeMat, soilMat, treeTrunkMat, treeLeafMat, warmLedMat)
    );
  }

  // =========================================================================
  // 4. FLOOR 1 INTERIOR — LUXURY NERO MARQUINA RUNWAY & HANDBAG GALLERIES
  // =========================================================================
  const f1Y = YSL_PODIUM_Y;

  // Interior Ceiling Recessed Linear Warm LED Strips (Grid of sleek architectural light bars)
  [440.4, 448.4, 454.2].forEach((lx) => {
    addBox(0.18, 0.04, 18.0, lx, f1Y + YSL_FLOOR_H - 0.27, 2.0, warmLedMat);
  });
  [10.8, 5.2, -1.5].forEach((lz) => {
    addBox(18.5, 0.04, 0.16, 447.6, f1Y + YSL_FLOOR_H - 0.27, lz, warmLedMat);
  });

  // Front-Left Window Showcase Plinth (X = 437.4 .. 443.8, Z = 9.8 .. 12.3)
  addBox(6.3, 0.16, 2.4, 440.6, f1Y + 0.08, 11.05, warmTravertineMat);
  // 2 Couture Runway Mannequins visible right through front glass
  staticGroup.add(buildYslMannequin(438.8, f1Y + 0.16, 11.1, 0.18, whiteLeatherMat, obsidianMat, warmTravertineMat, brushedChromeMat));
  staticGroup.add(buildYslMannequin(442.3, f1Y + 0.16, 11.1, -0.22, blackLeatherMat, whiteLeatherMat, warmTravertineMat, brushedChromeMat));
  // Brushed chrome clothing rack between the showcase mannequins with tailored coats
  addBox(1.85, 0.04, 0.04, 440.55, f1Y + 1.62, 10.65, brushedChromeMat);
  addBox(0.04, 1.46, 0.04, 439.65, f1Y + 0.89, 10.65, brushedChromeMat);
  addBox(0.04, 1.46, 0.04, 441.45, f1Y + 0.89, 10.65, brushedChromeMat);
  [0, 1, 2, 3, 4].forEach((ci) => {
    const coatMat = ci % 2 === 0 ? blackLeatherMat : whiteLeatherMat;
    addBox(0.11, 0.85, 0.36, 439.92 + ci * 0.31, f1Y + 1.15, 10.65, coatMat);
  });
  // Showcase handbag pedestal
  addBox(0.70, 0.54, 0.70, 440.55, f1Y + 0.43, 11.75, neroMarquinaMat);
  staticGroup.add(buildYslHandbag(440.55, f1Y + 0.70, 11.75, blackLeatherMat, satinBrassMat, 0.15));

  // Two Center-West Floating Black-Marble Handbag Tables (X = 440.6, Z = 5.4 & Z = 1.8)
  [5.4, 1.8].forEach((tz, tIdx) => {
    addBox(2.5, 0.12, 1.25, 440.6, f1Y + 0.74, tz, neroMarquinaMat);
    addBox(0.12, 0.70, 0.12, 439.6, f1Y + 0.35, tz - 0.42, brushedChromeMat);
    addBox(0.12, 0.70, 0.12, 441.6, f1Y + 0.35, tz - 0.42, brushedChromeMat);
    addBox(0.12, 0.70, 0.12, 439.6, f1Y + 0.35, tz + 0.42, brushedChromeMat);
    addBox(0.12, 0.70, 0.12, 441.6, f1Y + 0.35, tz + 0.42, brushedChromeMat);

    // Travertine display risers + YSL handbags
    addBox(0.55, 0.10, 0.45, 439.95, f1Y + 0.85, tz, warmTravertineMat);
    staticGroup.add(
      buildYslHandbag(439.95, f1Y + 0.90, tz, tIdx === 0 ? blackLeatherMat : espressoLeatherMat, satinBrassMat, 0.25)
    );
    staticGroup.add(
      buildYslHandbag(440.65, f1Y + 0.80, tz + 0.18, tIdx === 0 ? whiteLeatherMat : burgundyLeatherMat, satinBrassMat, -0.18)
    );
    addBox(0.45, 0.14, 0.42, 441.32, f1Y + 0.87, tz - 0.1, warmTravertineMat);
    staticGroup.add(buildYslHandbag(441.32, f1Y + 0.94, tz - 0.1, blackLeatherMat, brushedChromeMat, 0.12));
  });

  // West Wall Illuminated Archive Shelving Bays (X = 436.9..437.9, Z = -6.5 .. 8.0)
  [-5.2, -1.5, 2.2, 5.9].forEach((nz, idx) => {
    addBox(0.75, 3.25, 2.65, 437.25, f1Y + 1.625, nz, warmTravertineMat);
    addBox(0.05, 3.05, 0.06, 437.65, f1Y + 1.625, nz - 1.28, warmLedMat);
    addBox(0.05, 3.05, 0.06, 437.65, f1Y + 1.625, nz + 1.28, warmLedMat);
    [0.95, 1.75, 2.55].forEach((sy, sIdx) => {
      addBox(0.68, 0.06, 2.45, 437.38, f1Y + sy, nz, obsidianMat);
      if (sIdx < 2) {
        staticGroup.add(
          buildYslHandbag(
            437.42,
            f1Y + sy + 0.03,
            nz - 0.55,
            (idx + sIdx) % 2 === 0 ? blackLeatherMat : espressoLeatherMat,
            satinBrassMat,
            Math.PI * 0.5
          )
        );
        staticGroup.add(
          buildYslHandbag(
            437.42,
            f1Y + sy + 0.03,
            nz + 0.55,
            (idx + sIdx) % 2 === 0 ? whiteLeatherMat : burgundyLeatherMat,
            brushedChromeMat,
            Math.PI * 0.5
          )
        );
      } else {
        // Folded cashmere & knitwear stacks
        addBox(0.42, 0.22, 0.52, 437.42, f1Y + sy + 0.14, nz - 0.55, charcoalWoolMat);
        addBox(0.42, 0.18, 0.52, 437.42, f1Y + sy + 0.12, nz + 0.55, boucleCreamMat);
      }
    });
  });

  // Center-East Monolithic Nero Marquina Cashwrap Desk (X = 452.4, Z = 2.2) + Gift Boxes
  addBox(3.1, 1.02, 1.15, 452.4, f1Y + 0.51, 2.2, neroMarquinaMat);
  addBox(3.16, 0.04, 1.21, 452.4, f1Y + 1.03, 2.2, brushedChromeMat);
  // POS Terminal & YSL Packaging Stack
  addBox(0.38, 0.28, 0.06, 451.5, f1Y + 1.20, 2.15, obsidianMat);
  addBox(0.56, 0.14, 0.44, 453.2, f1Y + 1.12, 2.20, obsidianMat);
  addBox(0.46, 0.10, 0.36, 453.2, f1Y + 1.24, 2.20, whiteLeatherMat);

  // Fine Jewelry & Eyewear Glass Vitrine (X = 452.4, Z = 5.6)
  addBox(2.2, 0.92, 1.0, 452.4, f1Y + 0.46, 5.6, neroMarquinaMat);
  addBox(2.14, 0.65, 0.94, 452.4, f1Y + 1.25, 5.6, interiorGlassMat);
  addBox(2.18, 0.04, 0.98, 452.4, f1Y + 1.59, 5.6, brushedChromeMat);
  addBox(2.04, 0.03, 0.84, 452.4, f1Y + 1.54, 5.6, warmLedMat);
  [-0.65, 0, 0.65].forEach((ox) => {
    addBox(0.26, 0.05, 0.26, 452.4 + ox, f1Y + 0.96, 5.6, whiteLeatherMat);
    addBox(0.18, 0.08, 0.08, 452.4 + ox, f1Y + 1.02, 5.6, satinBrassMat);
  });

  // Client Leather Bench + Dark Wool Carpet (X = 452.4, Z = 8.4)
  addBox(3.4, 0.02, 3.0, 452.4, f1Y + 0.01, 8.4, charcoalWoolMat);
  addBox(2.2, 0.44, 0.80, 452.4, f1Y + 0.22, 8.4, blackLeatherMat);

  // East Wall Backlit Alabaster Footwear & Accessories Gallery (X = 457.8..459.1, Z = -1.6 .. 8.8)
  addBox(0.24, 3.25, 10.4, 459.0, f1Y + 1.625, 3.6, warmTravertineMat);
  addBox(0.06, 2.85, 9.8, 458.85, f1Y + 1.65, 3.6, warmLedMat);
  [0.85, 1.55, 2.25].forEach((sy) => {
    addBox(0.55, 0.06, 9.4, 458.55, f1Y + sy, 3.6, obsidianMat);
    for (let sz = -0.5; sz <= 7.8; sz += 1.65) {
      addBox(0.28, 0.16, 0.14, 458.55, f1Y + sy + 0.11, sz, blackLeatherMat);
      addBox(0.18, 0.18, 0.14, 458.55, f1Y + sy + 0.12, sz + 0.45, satinBrassMat);
    }
  });

  // North Rear Feature Wall — Monolithic Nero Marquina + Backlit SAINT LAURENT & Mirror Wings (Z = -11.0)
  addBox(7.0, 3.65, 0.42, 448.4, f1Y + 1.825, -10.85, neroMarquinaMat);
  const f1RearWordmark = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.82), saintLaurentGlowMat);
  f1RearWordmark.position.set(448.4, f1Y + 2.55, -10.62);
  staticGroup.add(f1RearWordmark);
  // Mirror panels flanking rear wall
  addBox(2.8, 3.45, 0.08, 442.8, f1Y + 1.75, -10.95, mirrorMat);
  // Rear marble credenza + sculptural vases
  addBox(5.8, 0.78, 0.85, 448.4, f1Y + 0.39, -10.20, warmTravertineMat);
  addBox(0.95, 0.74, 0.92, 443.35, f1Y + 0.37, -9.1, blackLeatherMat);

  // =========================================================================
  // 5. NE SWITCHBACK STAIRWELL (X = 454.5 .. 459.35, Z = -11.1 .. -4.1)
  // =========================================================================
  const buildYslStaircase = () => {
    const stairGrp = new THREE.Group();
    const halfH = YSL_FLOOR_H * 0.5;
    const stepsPerRun = 8;

    // West Balustrade (X = 454.4)
    addBox(0.08, 1.05, 7.0, 454.40, f1Y + 0.525, -7.6, interiorGlassMat);
    addBox(0.08, 0.06, 7.0, 454.40, f1Y + 1.05, -7.6, brushedChromeMat);
    // Center Divider Spine (X = 457.0)
    addBox(0.16, YSL_FLOOR_H + 1.0, 5.15, 457.00, f1Y + (YSL_FLOOR_H + 1.0) * 0.5, -6.675, obsidianMat);

    // Run 1: Upward going North along X = 454.55 .. 456.82 (Z = -4.1 -> -9.25)
    for (let i = 0; i < stepsPerRun; i++) {
      const t = (i + 0.5) / stepsPerRun;
      const stepY = f1Y + t * halfH;
      const stepZ = -4.1 - t * 5.15;
      addBox(2.20, halfH / stepsPerRun + 0.04, 5.15 / stepsPerRun + 0.04, 455.68, stepY - 0.02, stepZ, neroMarquinaMat);
      addBox(2.12, 0.025, 0.04, 455.68, stepY + 0.12, stepZ + 0.28, warmLedMat);
    }
    // Half-landing (Z = -11.1 .. -9.25)
    addBox(4.85, 0.20, 1.85, 456.92, f1Y + halfH - 0.10, -10.175, neroMarquinaMat);

    // Run 2: Upward going South along X = 457.18 .. 459.35 (Z = -9.25 -> -4.1)
    for (let i = 0; i < stepsPerRun; i++) {
      const t = (i + 0.5) / stepsPerRun;
      const stepY = f1Y + halfH + t * halfH;
      const stepZ = -9.25 + t * 5.15;
      addBox(2.15, halfH / stepsPerRun + 0.04, 5.15 / stepsPerRun + 0.04, 458.26, stepY - 0.02, stepZ, neroMarquinaMat);
      addBox(2.06, 0.025, 0.04, 458.26, stepY + 0.12, stepZ - 0.28, warmLedMat);
    }

    // Floor 2 stairwell perimeter glass rail
    addBox(0.08, 1.05, 7.0, 454.40, f1Y + YSL_FLOOR_H + 0.525, -7.6, interiorGlassMat);
    addBox(0.08, 0.06, 7.0, 454.40, f1Y + YSL_FLOOR_H + 1.05, -7.6, brushedChromeMat);
    addBox(2.30, 1.05, 0.08, 455.68, f1Y + YSL_FLOOR_H + 0.525, -4.15, interiorGlassMat);
    addBox(2.30, 0.06, 0.08, 455.68, f1Y + YSL_FLOOR_H + 1.05, -4.15, brushedChromeMat);
    staticGroup.add(stairGrp);
  };
  buildYslStaircase();

  // =========================================================================
  // 6. FLOOR 2 INTERIOR — RIVE DROITE RUNWAY & VIP COUTURE SALON (Y = 4.26)
  // =========================================================================
  const f2Y = YSL_PODIUM_Y + YSL_FLOOR_H;

  // Floor 2 Central Nero Marquina Runway Strip + Warm Architectural Skylight Cove Ceiling
  addBox(5.2, 0.03, 17.5, 447.3, f2Y + 0.015, 2.0, neroMarquinaMat);
  // Warm glowing architectural skylight trough overhead (Y = f2Y + 4.10)
  addBox(6.4, 0.05, 16.0, 447.3, f2Y + 4.08, 2.0, warmLedMat);
  [440.2, 454.5].forEach((lx) => {
    addBox(0.18, 0.04, 17.0, lx, f2Y + 4.08, 2.0, warmLedMat);
  });

  // 4 Couture Runway Mannequins on Travertine Plinths flanking Central Runway
  staticGroup.add(buildYslMannequin(444.55, f2Y, 0.95, Math.PI * 0.25, blackLeatherMat, whiteLeatherMat, warmTravertineMat, brushedChromeMat));
  staticGroup.add(buildYslMannequin(444.55, f2Y, 6.95, Math.PI * 0.25, whiteLeatherMat, obsidianMat, warmTravertineMat, brushedChromeMat));
  staticGroup.add(buildYslMannequin(450.05, f2Y, 0.95, -Math.PI * 0.25, burgundyLeatherMat, blackLeatherMat, warmTravertineMat, brushedChromeMat));
  staticGroup.add(buildYslMannequin(450.05, f2Y, 6.95, -Math.PI * 0.25, blackLeatherMat, satinBrassMat, warmTravertineMat, brushedChromeMat));

  // West VIP Private Client Lounge (X = 437.8 .. 442.6, Z = 3.5 .. 8.5)
  addBox(4.4, 0.02, 5.2, 440.1, f2Y + 0.01, 6.0, charcoalWoolMat);
  // Curved-feel modular cream bouclé sofa
  addBox(0.95, 0.42, 3.4, 438.4, f2Y + 0.21, 6.0, boucleCreamMat);
  addBox(0.32, 0.78, 3.4, 438.08, f2Y + 0.39, 6.0, boucleCreamMat);
  // Nero Marquina coffee table w/ art monographs & champagne flutes
  addBox(1.25, 0.36, 1.85, 440.6, f2Y + 0.18, 6.0, neroMarquinaMat);
  addBox(0.38, 0.07, 0.48, 440.55, f2Y + 0.40, 5.65, whiteLeatherMat);
  addBox(0.38, 0.07, 0.48, 440.62, f2Y + 0.46, 5.70, obsidianMat);
  // Champagne tray & flutes
  addBox(0.34, 0.02, 0.34, 440.6, f2Y + 0.37, 6.45, brushedChromeMat);
  [6.38, 6.52].forEach((fz) => {
    const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.18, 8), crispGlassMat);
    flute.position.set(440.6, f2Y + 0.47, fz);
    staticGroup.add(flute);
  });
  // Fitting curtains & tri-fold floor mirror along West Wall
  addBox(0.35, 3.4, 4.2, 437.0, f2Y + 1.7, -2.5, velvetCurtainMat);
  addBox(0.08, 2.8, 1.4, 436.9, f2Y + 1.4, 1.2, mirrorMat);

  // South Feature Wall Inside Floor 2 — Fashion Photography Prints & Rive Droite Vinyl Console
  [439.2, 442.2, 452.4, 455.4].forEach((px, idx) => {
    const photoTex = createYslEditorialPhotoTex(idx);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.50, 0.08), obsidianMat);
    frame.position.set(px, f2Y + 2.05, 13.05);
    staticGroup.add(frame);
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 2.30),
      new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.35 })
    );
    art.rotation.y = Math.PI;
    art.position.set(px, f2Y + 2.05, 13.00);
    staticGroup.add(art);
  });

  // Central South Rive Droite Vinyl & Art Console + Backlit YSL Monogram
  const f2Logo = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.30), yslUpperLogoMat);
  f2Logo.rotation.y = Math.PI;
  f2Logo.position.set(447.3, f2Y + 2.35, 13.02);
  staticGroup.add(f2Logo);
  addBox(4.8, 0.85, 0.95, 447.3, f2Y + 0.425, 11.4, neroMarquinaMat);
  // Vinyl sleeves + turntable on console
  addBox(0.55, 0.08, 0.44, 446.1, f2Y + 0.89, 11.4, brushedChromeMat);
  addBox(0.42, 0.32, 0.38, 448.3, f2Y + 1.01, 11.4, obsidianMat);

  // East Floor 2 Couture Handbag Island (X = 452.7, Z = 4.5)
  addBox(1.35, 0.88, 5.2, 452.7, f2Y + 0.44, 4.5, warmTravertineMat);
  [2.6, 4.5, 6.4].forEach((hz, idx) => {
    addBox(0.90, 0.08, 0.90, 452.7, f2Y + 0.92, hz, neroMarquinaMat);
    staticGroup.add(
      buildYslHandbag(
        452.7,
        f2Y + 0.96,
        hz,
        idx === 0 ? blackLeatherMat : idx === 1 ? whiteLeatherMat : burgundyLeatherMat,
        satinBrassMat,
        -Math.PI * 0.5
      )
    );
  });

  // =========================================================================
  // 7. ARCHITECTURAL NIGHT LIGHTING & PAVEMENT GLOW
  // =========================================================================
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 256;
  poolCanvas.height = 256;
  const pCtx = poolCanvas.getContext('2d')!;
  const pGrad = pCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
  pGrad.addColorStop(0, 'rgba(255, 244, 224, 0.72)');
  pGrad.addColorStop(0.55, 'rgba(235, 220, 195, 0.25)');
  pGrad.addColorStop(1, 'rgba(235, 220, 195, 0.0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 256, 256);
  const poolTex = new THREE.CanvasTexture(poolCanvas);
  poolTex.colorSpace = THREE.SRGBColorSpace;

  const frontPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  poolMats.push(frontPoolMat);

  const frontPool = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 8.0), frontPoolMat);
  frontPool.rotation.x = -Math.PI * 0.5;
  frontPool.position.set(YSL_DOOR_X, 0.03, 15.6);
  frontPool.userData.noMerge = true;
  staticGroup.add(frontPool);

  let currentClosedFactor = 0;
  const addYslLight = (
    x: number,
    y: number,
    z: number,
    color: number,
    dayInt: number,
    nightInt: number,
    dist: number,
    closedDim = 0
  ) => {
    const light = new THREE.PointLight(color, dayInt, dist, 1.32);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => (closedDim > 0 ? 1.0 - currentClosedFactor * closedDim : 1.0),
    });
  };

  // Facade Architectural Wall-Washers (keeps upper fluted stone, giant YSL monogram & limestone portal radiant at night)
  addYslLight(440.0, 3.6, 15.8, 0xfff5e4, 0.55, 2.75, 22, 0);
  addYslLight(YSL_DOOR_X, 3.4, 15.4, 0xfff5e4, 0.65, 2.95, 24, 0);
  addYslLight(453.7, 2.2, 15.6, 0xfff3de, 0.50, 2.35, 20, 0); // Soft limestone lower-wall wash
  addYslLight(441.5, 9.6, 17.2, 0xfff6e8, 0.40, 2.25, 24, 0); // Upper left fluted grid graze
  addYslLight(448.8, 9.6, 17.2, 0xfff6e8, 0.40, 2.25, 24, 0); // Upper center fluted grid graze
  addYslLight(456.15, 9.8, 16.8, 0xfffaf2, 0.55, 2.90, 26, 0); // Giant YSL Cassandre hero halo wash
  // Floor 1 Gallery Lighting (front showcase stays 92% luminous all night!)
  addYslLight(440.5, 3.4, 10.8, 0xfff7eb, 1.25, 3.15, 22, 0.08); // Front showcase window
  addYslLight(440.6, 3.4, 3.5, 0xfff5e4, 1.05, 2.75, 20, 0.20); // Handbag tables
  addYslLight(452.4, 3.4, 4.5, 0xfff5e4, 1.05, 2.65, 20, 0.25); // Marble cashwrap & jewelry
  addYslLight(448.4, 3.4, -5.0, 0xfff3de, 0.95, 2.45, 20, 0.28); // Rear feature wall
  // Floor 2 Rive Droite Runway & VIP Lounge Lighting
  addYslLight(440.5, 7.6, 5.5, 0xfff5e4, 0.95, 2.45, 20, 0.28);
  addYslLight(448.4, 7.6, 3.0, 0xfff6e8, 1.05, 2.65, 22, 0.28);
  addYslLight(452.8, 7.6, 6.5, 0xfff5e4, 0.95, 2.45, 20, 0.28);

  // =========================================================================
  // 8. DYNAMIC UPDATE LOOP (ROLLING SHUTTER + AUTOMATIC BI-PARTING DOORS)
  // =========================================================================
  let doorOpen = 0;
  let shutterFactor = 0;

  const update = (
    delta: number,
    rawHour: number,
    _lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: YslNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isYslOpenAtHour(rawHour);

    const targetClosed = isOpen ? 0 : 1;
    shutterFactor = THREE.MathUtils.lerp(shutterFactor, targetClosed, Math.min(1, dt * 3.0));
    currentClosedFactor = shutterFactor;
    setShutterProgress(mainShutter, shutterFactor);

    let wantOpen = false;
    if (isOpen && shutterFactor < 0.35) {
      if (playerPos) {
        const lp = placement
          ? inverseTransformYslPointXZ(playerPos.x, playerPos.z, placement)
          : { x: playerPos.x, z: playerPos.z };
        if (Math.hypot(lp.x - YSL_DOOR_X, lp.z - YSL_DOOR_Z) <= 4.8) {
          wantOpen = true;
        }
      }
      if (!wantOpen && npcController?.hasNpcNearDoor()) wantOpen = true;
    }

    doorOpen = THREE.MathUtils.lerp(doorOpen, wantOpen ? 1 : 0, Math.min(1, dt * 5.2));
    const offset = doorOpen * 1.42;
    doorLeftLeaf.position.x = leftClosedX - offset;
    doorRightLeaf.position.x = rightClosedX + offset;
  };

  let finalStaticGroup = staticGroup;
  if (placement) {
    for (let i = 0; i < scaledLights.length; i++) {
      const lt = scaledLights[i].light;
      const wp = transformYslPointXZ(lt.position.x, lt.position.z, placement);
      lt.position.set(wp.x, lt.position.y, wp.z);
    }
    const outerGroup = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.position.set(placement.anchorX, 0, placement.anchorZ);
    pivot.rotation.y = placement.rotationY;
    staticGroup.position.set(-YSL_ORIG_ANCHOR_X, 0, -YSL_ORIG_ANCHOR_Z);
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
    getClosedFactor: () => currentClosedFactor,
    update,
  };
}

// =========================================================================
// SAINT LAURENT (YSL) NPC CONTROLLER (ALL-BLACK CLIENT ADVISORS & SHOPPERS)
// =========================================================================

type YslNpcKind = 'advisor' | 'shopper';
type YslPhase = 'browse' | 'admire' | 'walk_leave' | 'respawn_wait';

interface YslActor {
  id: number;
  kind: YslNpcKind;
  root: THREE.Group;
  headMesh: THREE.Mesh;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  toteBag: THREE.Group;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: YslPhase;
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
  glbHandle: GlbHumanHandle;
}

const YSL_SHOPPER_SPOTS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [443.4, YSL_PODIUM_Y, 8.8], yaw: -Math.PI * 0.35 },
  { pos: [442.8, YSL_PODIUM_Y, 5.4], yaw: -Math.PI * 0.5 },
  { pos: [449.8, YSL_PODIUM_Y, 5.6], yaw: Math.PI * 0.5 },
  { pos: [455.8, YSL_PODIUM_Y, 3.6], yaw: Math.PI * 0.5 },
  { pos: [448.4, YSL_PODIUM_Y, -8.2], yaw: Math.PI },
];

export class YslNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actorContainer: THREE.Group;
  private readonly seedOffset: number;
  private readonly actors: YslActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers, placement?: YslPlacementConfig) {
    this.rootGroup.name = placement ? 'YslBachDangNpcGroup' : 'YslNpcGroup';
    this.seedOffset = placement?.seedOffset ?? 0;
    if (placement) {
      const pivot = new THREE.Group();
      pivot.position.set(placement.anchorX, 0, placement.anchorZ);
      pivot.rotation.y = placement.rotationY;
      const inner = new THREE.Group();
      inner.position.set(-YSL_ORIG_ANCHOR_X, 0, -YSL_ORIG_ANCHOR_Z);
      pivot.add(inner);
      this.rootGroup.add(pivot);
      this.actorContainer = inner;
    } else {
      this.actorContainer = this.rootGroup;
    }

    const advisorSpecs: { x: number; y: number; z: number; yaw: number }[] = [
      // Floor 1 Concierge, Portal Greeter & Handbag Specialist
      { x: 452.4, y: YSL_PODIUM_Y, z: 0.6, yaw: 0 },
      { x: 446.6, y: YSL_PODIUM_Y, z: 9.8, yaw: -0.2 },
      { x: 443.1, y: YSL_PODIUM_Y, z: 2.0, yaw: -Math.PI * 0.35 },
      // Floor 2 Rive Droite Couture & VIP Salon Hosts
      { x: 443.6, y: YSL_PODIUM_Y + YSL_FLOOR_H, z: 4.5, yaw: -Math.PI * 0.35 },
      { x: 449.6, y: YSL_PODIUM_Y + YSL_FLOOR_H, z: 8.6, yaw: Math.PI * 0.85 },
    ];

    advisorSpecs.forEach((sp, idx) => {
      this.actors.push(
        this.spawnActor(idx, 'advisor', helpers, new THREE.Vector3(sp.x, sp.y, sp.z), sp.yaw)
      );
    });

    for (let i = 0; i < 4; i++) {
      const spot = YSL_SHOPPER_SPOTS[i % YSL_SHOPPER_SPOTS.length];
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
    kind: YslNpcKind,
    helpers: HospitalCharacterHelpers,
    homePos: THREE.Vector3,
    homeYaw: number
  ): YslActor {
    const root = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    root.add(fallbackGroup);
    root.position.copy(homePos);
    root.rotation.y = homeYaw;

    const paletteShirt = [0x111113, 0x1c1917, 0xf5f5f4, 0x3b1219, 0x27272a];
    const palettePants = [0x0c0c0e, 0x18181b, 0x27272a];
    const isAdvisor = kind === 'advisor';
    const shirtColor = isAdvisor ? 0x0e0e11 : paletteShirt[id % paletteShirt.length];
    const pantsColor = isAdvisor ? 0x09090b : palettePants[id % palettePants.length];
    const skinHex = ['#f2d1b2', '#e7bd94', '#efc5a2'][id % 3];

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.78 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.42 });
    const silverPinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.2 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: id % 2 === 0 ? 0x111113 : 0x3f2718, roughness: 0.78 });

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.12, 0.74, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.70, 0.21), pantsMat);
    leftLegMesh.position.y = -0.35;
    leftLeg.add(leftLegMesh);
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.28), shoeMat);
    shoeL.position.set(0, -0.69, 0.03);
    leftLeg.add(shoeL);
    fallbackGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.12, 0.74, 0);
    const rightLegMesh = leftLegMesh.clone();
    rightLeg.add(rightLegMesh);
    const shoeR = shoeL.clone();
    rightLeg.add(shoeR);
    fallbackGroup.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.62, 0.25), shirtMat);
    torso.position.y = 1.07;
    fallbackGroup.add(torso);

    if (isAdvisor) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.03), silverPinMat);
      pin.position.set(-0.12, 1.24, 0.13);
      fallbackGroup.add(pin);
    }

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.30, 1.32, 0);
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.15), shirtMat);
    armLMesh.position.y = -0.25;
    leftArm.add(armLMesh);
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), skinMat);
    handL.position.y = -0.54;
    leftArm.add(handL);
    fallbackGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.30, 1.32, 0);
    const armRMesh = armLMesh.clone();
    rightArm.add(armRMesh);
    const handR = handL.clone();
    rightArm.add(handR);
    fallbackGroup.add(rightArm);

    // Matte black SAINT LAURENT shopping tote bag
    const toteBag = new THREE.Group();
    const bagTex = createYslShoppingBagTex();
    const bagMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.34, 0.28),
      new THREE.MeshStandardMaterial({ map: bagTex, roughness: 0.52 })
    );
    bagMesh.position.set(0.06, -0.70, 0);
    toteBag.add(bagMesh);
    toteBag.visible = kind === 'shopper' && id % 2 === 0;
    rightArm.add(toteBag);

    const headTex = helpers.createFaceTexture(isAdvisor ? 'happy' : 'neutral', skinHex);
    const headMesh = helpers.createHeadMesh(skinMat, headTex, 0.34, 0.34, 0.34);
    headMesh.position.y = 1.56;
    fallbackGroup.add(headMesh);

    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.36), hairMat);
    hairCap.position.y = 0.16;
    headMesh.add(hairCap);

    const spec = isAdvisor
      ? id === 0
        ? CASHIER_NPC_MODEL
        : pickStationaryCivilianModel(id + 131 + this.seedOffset)
      : pickShopCustomerModel(id + 137 + this.seedOffset);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: root,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: isAdvisor && id === 0 ? 'Checkout' : 'Idle',
      phaseOffset: id * 0.67,
    });

    this.actorContainer.add(root);

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
      stateTimer: 1.5 + (id % 5) * 0.9,
      walkPhase: id * 1.4,
      walkPhaseRef: { phase: id * 1.4 },
      speed: kind === 'shopper' ? 1.55 + (id % 2) * 0.18 : 1.35,
      seed: id * 1.73,
      exiting: false,
      exitDone: false,
      exitRef: { idx: 0 },
      glbHandle,
    };
  }

  private assignNewSpot(a: YslActor, spawnOutside = false) {
    const spot = YSL_SHOPPER_SPOTS[(a.id + Math.floor(this.timer * 0.5)) % YSL_SHOPPER_SPOTS.length];
    const targetPos = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]);
    a.targetYaw = spot.yaw;

    if (spawnOutside) {
      a.root.position.set(YSL_DOOR_X + (a.id % 2 === 0 ? -4.2 : 4.2), 0.02, 17.4);
      a.pathQueue = [
        new THREE.Vector3(YSL_DOOR_X, 0.04, 15.2),
        new THREE.Vector3(YSL_DOOR_X, YSL_PODIUM_Y, 12.6),
        new THREE.Vector3(YSL_DOOR_X, YSL_PODIUM_Y, 8.8),
        targetPos,
      ];
    } else {
      a.pathQueue = [new THREE.Vector3(YSL_DOOR_X, YSL_PODIUM_Y, 4.0), targetPos];
    }
    a.pathIdx = 0;
    a.phase = 'browse';
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public hasNpcNearDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible || a.homePos.y > YSL_PODIUM_Y + 0.5) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - YSL_DOOR_X, p.z - YSL_DOOR_Z) <= 3.6) return true;
    }
    return false;
  }

  private stepPath(a: YslActor, dt: number): boolean {
    if (a.pathIdx >= a.pathQueue.length) return true;
    const target = a.pathQueue[a.pathIdx];
    const dx = target.x - a.root.position.x;
    const dy = target.y - a.root.position.y;
    const dz = target.z - a.root.position.z;
    const dist = Math.hypot(dx, dz);
    const step = a.speed * dt;

    if (dist <= step + 0.08) {
      a.root.position.copy(target);
      a.pathIdx += 1;
      return a.pathIdx >= a.pathQueue.length;
    }

    const ratio = step / dist;
    a.root.position.x += dx * ratio;
    a.root.position.y += dy * Math.min(1, ratio * 2);
    a.root.position.z += dz * ratio;

    const moveYaw = Math.atan2(dx, dz);
    let diff = moveYaw - a.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    a.root.rotation.y += diff * Math.min(1, dt * 8.0);

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
    const isOpen = isYslOpenAtHour(rawHour);

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
        a.exiting = true;
        a.exitDone = false;
        a.exitRef.idx = 0;
        a.glbHandle.setAnimState('Walk');
        const exitDoorWaypoints = [
          new THREE.Vector3(YSL_DOOR_X, YSL_PODIUM_Y, 8.8),
          new THREE.Vector3(YSL_DOOR_X, YSL_PODIUM_Y, 12.6),
          new THREE.Vector3(YSL_DOOR_X, 0.04, 15.2),
          new THREE.Vector3(YSL_DOOR_X + (a.id % 2 === 0 ? -6.0 : 6.0), 0.02, 18.2),
        ];
        if (a.homePos.y > YSL_PODIUM_Y + 0.5) {
          a.pathQueue = [
            new THREE.Vector3(455.7, f2SafeY(), -4.0),
            new THREE.Vector3(458.2, f2SafeY(), -4.1),
            new THREE.Vector3(458.2, YSL_PODIUM_Y + YSL_FLOOR_H * 0.5, -10.1),
            new THREE.Vector3(455.7, YSL_PODIUM_Y, -4.1),
            ...exitDoorWaypoints,
          ];
        } else {
          a.pathQueue = exitDoorWaypoints;
        }
      });
    } else if (!this.wasOpen && isOpen) {
      this.closingActive = false;
      this.fullyClosedAndEmpty = false;
      this.actors.forEach((a) => {
        a.exiting = false;
        a.exitDone = false;
        a.root.visible = true;
        if (a.kind === 'advisor') {
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
      if (a.kind === 'advisor') {
        a.glbHandle.setAnimState(a.id === 0 ? 'Checkout' : 'Idle');
        const sway = Math.sin(this.timer * 1.4 + a.seed) * 0.08;
        a.root.rotation.y = a.homeYaw + sway;
        a.headMesh.rotation.y = Math.sin(this.timer * 0.9 + a.seed) * 0.16;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = -0.05 + Math.sin(this.timer * 1.2 + a.seed) * 0.04;
        a.rightArm.rotation.x = -0.05 - Math.sin(this.timer * 1.2 + a.seed) * 0.04;
        return;
      }

      if (a.phase === 'respawn_wait') {
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          a.root.visible = true;
          a.toteBag.visible = Math.random() > 0.4;
          this.assignNewSpot(a, true);
          a.glbHandle.setAnimState('Walk');
        }
        return;
      }

      if (a.phase === 'browse') {
        a.glbHandle.setAnimState('Walk');
        const done = this.stepPath(a, dt);
        if (done) {
          a.phase = 'admire';
          a.stateTimer = 4.5 + (a.id % 4) * 1.6;
          a.glbHandle.setAnimState('Idle');
        }
      } else if (a.phase === 'admire') {
        a.glbHandle.setAnimState('Idle');
        let diff = a.targetYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 5.0);
        a.headMesh.rotation.y = Math.sin(this.timer * 1.3 + a.seed) * 0.24;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = 0;
        a.rightArm.rotation.x = a.toteBag.visible ? -0.18 : 0;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          if (Math.random() < 0.35) {
            a.phase = 'walk_leave';
            a.toteBag.visible = true;
            a.pathQueue = [
              new THREE.Vector3(YSL_DOOR_X, YSL_PODIUM_Y, 8.8),
              new THREE.Vector3(YSL_DOOR_X, YSL_PODIUM_Y, 12.6),
              new THREE.Vector3(YSL_DOOR_X, 0.04, 15.2),
              new THREE.Vector3(YSL_DOOR_X + (a.id % 2 === 0 ? -5.0 : 5.0), 0.02, 17.8),
            ];
            a.pathIdx = 0;
            a.glbHandle.setAnimState('Walk');
          } else {
            this.assignNewSpot(a, false);
            a.glbHandle.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk');
        const done = this.stepPath(a, dt);
        if (done) {
          a.phase = 'respawn_wait';
          a.root.visible = false;
          a.stateTimer = 2.0 + (a.id % 3) * 1.2;
          a.glbHandle.setAnimState('Idle');
        }
      }
    });
  }
}

function f2SafeY(): number {
  return YSL_PODIUM_Y + YSL_FLOOR_H;
}
