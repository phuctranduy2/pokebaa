import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isChanelOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface ChanelBuildResult {
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
    npcController?: ChanelNpcController | null
  ) => void;
}

// =========================================================================
// CHANEL FLAGSHIP BOUTIQUE — PETER MARINO WHITE PORTAL & DOUBLE-HEIGHT VITRINE
// Directly East of Hermès along Đại lộ Đông Tây (X = 436.2 .. 460.0, Z = 43.9 .. 70.0)
// Faces North (-Z) toward Boulevard (Z = 37.2 .. 42.5 sidewalk)
// Podium Floor: Y = 0.16m (Floor 1 = 0.16, Floor 2 Mezzanine = 4.26, Portal Height = 7.85, Upper = 10.65m)
// Recessed White Portal Doors: X = 455.2, Z = 47.40 (3.0m clear automatic doors, 07:00 - 23:00)
// =========================================================================

export const CHANEL_PODIUM_Y = 0.16;
export const CHANEL_FLOOR_H = 4.1;

const CHANEL_DOOR_X = 455.2;
const CHANEL_DOOR_Z = 47.40;

export const CHANEL_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 (Y = 0.16m) — White Glass L-Frame, Double-Height Vitrine & Salons
  // =========================================================================
  { minX: 436.0, maxX: 436.8, minZ: 45.8, maxZ: 70.2, floor: 1 }, // West Glass & Wall
  { minX: 459.3, maxX: 460.2, minZ: 45.8, maxZ: 70.2, floor: 1 }, // East Wall
  { minX: 436.0, maxX: 460.2, minZ: 69.3, maxZ: 70.2, floor: 1 }, // South Rear Wall

  // North Facade split cleanly around Recessed Vestibule Portal (X = 453.5 .. 456.9)
  { minX: 436.2, maxX: 453.45, minZ: 45.75, maxZ: 47.7, floor: 1 }, // Double-Height Glass Vitrine & West Pier
  { minX: 456.95, maxX: 460.0, minZ: 45.75, maxZ: 47.7, floor: 1 }, // East White Glass L-Frame Pier

  // Floor 1 Interior Display Furniture & Stairwell Rails
  { minX: 436.9, maxX: 452.3, minZ: 46.2, maxZ: 49.5, floor: 1 }, // Double-Height Showcase Podium & Mannequins
  { minX: 441.5, maxX: 444.5, minZ: 52.8, maxZ: 54.6, floor: 1 }, // Front Classic Flap Handbag Island
  { minX: 441.5, maxX: 444.5, minZ: 56.8, maxZ: 58.6, floor: 1 }, // Rear Boy & 2.55 Handbag Island
  { minX: 436.8, maxX: 438.2, minZ: 51.2, maxZ: 66.2, floor: 1 }, // West Wall Illuminated Tweed & Couture Shelving
  { minX: 453.2, maxX: 455.8, minZ: 52.2, maxZ: 54.0, floor: 1 }, // Black-Lacquer & Gold Concierge Cashwrap
  { minX: 453.4, maxX: 455.6, minZ: 56.4, maxZ: 58.2, floor: 1 }, // High Jewelry & J12 Horology Vitrine
  { minX: 457.5, maxX: 459.3, minZ: 49.8, maxZ: 60.5, floor: 1 }, // East Wall N°5 Fragrance Bar & Accessories
  { minX: 446.6, maxX: 450.2, minZ: 54.2, maxZ: 57.6, floor: 1 }, // Center Tweed Client Sofa & Travertine Table
  { minX: 443.8, maxX: 450.6, minZ: 68.1, maxZ: 69.3, floor: 1 }, // South Rear Feature Credenza
  { minX: 454.25, maxX: 454.55, minZ: 62.5, maxZ: 69.4, floor: 1 }, // SE Stairwell West Balustrade
  { minX: 456.82, maxX: 457.18, minZ: 62.5, maxZ: 67.6, floor: 1 }, // SE Stairwell Center Spine
  { minX: 457.1, maxX: 459.5, minZ: 62.5, maxZ: 62.85, floor: 1 }, // Floor 1 Under-Stair Partition

  // =========================================================================
  // FLOOR 2 (Y = 4.26m) — Mezzanine Balustrade, Shoe Salon & VIP Fitting Suite
  // =========================================================================
  { minX: 436.0, maxX: 436.8, minZ: 45.8, maxZ: 70.2, floor: 2 }, // West Wall
  { minX: 459.3, maxX: 460.2, minZ: 45.8, maxZ: 70.2, floor: 2 }, // East Wall
  { minX: 436.0, maxX: 460.2, minZ: 69.3, maxZ: 70.2, floor: 2 }, // South Rear Wall
  { minX: 436.2, maxX: 460.0, minZ: 45.75, maxZ: 49.8, floor: 2 }, // Mezzanine Atrium Edge & White Portal Facade
  { minX: 454.25, maxX: 454.55, minZ: 62.5, maxZ: 69.4, floor: 2 }, // Stairwell West Balustrade
  { minX: 456.82, maxX: 457.18, minZ: 62.5, maxZ: 67.6, floor: 2 }, // Stairwell Center Spine
  { minX: 454.5, maxX: 456.85, minZ: 62.5, maxZ: 63.5, floor: 2 }, // Floor 2 Left-Bay Velvet Rope
  { minX: 437.0, maxX: 438.4, minZ: 51.6, maxZ: 62.5, floor: 2 }, // West Two-Tone Slingback & Shoe Gallery
  { minX: 438.8, maxX: 443.4, minZ: 53.5, maxZ: 59.5, floor: 2 }, // VIP Bouclé Lounge Sofa & Coffee Table
  { minX: 445.2, maxX: 451.8, minZ: 51.8, maxZ: 54.4, floor: 2 }, // Central Haute Couture Runway Plinth
  { minX: 451.5, maxX: 453.5, minZ: 56.0, maxZ: 60.5, floor: 2 }, // East Evening Bag & Pearl Vitrine Island
];

export interface ChanelPlacementConfig {
  anchorX: number;
  anchorZ: number;
  rotationY: number;
  seedOffset?: number;
}

const CHANEL_ORIG_ANCHOR_X = 448.1;
const CHANEL_ORIG_ANCHOR_Z = 42.5;

/**
 * CHANEL — Chi nhánh Đường Bạch Đằng (bên cạnh YSL Bạch Đằng):
 * - Footprint: X = 69.4 .. 93.2 (23.8m wide, 1.4m West of YSL at X = 94.6)
 * - Depth:     Z = -104.0 .. -76.5 (front stone apron flush with Đường Bạch Đằng Z = -104.0)
 * - Facing:    North (-Z) toward Sông Hàn & Đường Bạch Đằng (rotationY = 0)
 * - Doorway:   X = 86.7 .. 90.1, Z = -99.10
 */
export const CHANEL_BACH_DANG_PLACEMENT: ChanelPlacementConfig = {
  anchorX: 81.3,
  anchorZ: -104.0,
  rotationY: 0,
  seedOffset: 53,
};

function transformChanelPointXZ(
  ox: number,
  oz: number,
  placement: ChanelPlacementConfig
): { x: number; z: number } {
  const lx = ox - CHANEL_ORIG_ANCHOR_X;
  const lz = oz - CHANEL_ORIG_ANCHOR_Z;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: placement.anchorX + lx * c + lz * s,
    z: placement.anchorZ - lx * s + lz * c,
  };
}

function inverseTransformChanelPointXZ(
  wx: number,
  wz: number,
  placement: ChanelPlacementConfig
): { x: number; z: number } {
  const dx = wx - placement.anchorX;
  const dz = wz - placement.anchorZ;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: CHANEL_ORIG_ANCHOR_X + dx * c - dz * s,
    z: CHANEL_ORIG_ANCHOR_Z + dx * s + dz * c,
  };
}

export function createTransformedChanelColliders(
  placement: ChanelPlacementConfig
): IntersectionColliderBox[] {
  return CHANEL_COLLIDERS.map((box) => {
    const p1 = transformChanelPointXZ(box.minX, box.minZ, placement);
    const p2 = transformChanelPointXZ(box.maxX, box.maxZ, placement);
    const p3 = transformChanelPointXZ(box.minX, box.maxZ, placement);
    const p4 = transformChanelPointXZ(box.maxX, box.minZ, placement);
    return {
      minX: Math.min(p1.x, p2.x, p3.x, p4.x),
      maxX: Math.max(p1.x, p2.x, p3.x, p4.x),
      minZ: Math.min(p1.z, p2.z, p3.z, p4.z),
      maxZ: Math.max(p1.z, p2.z, p3.z, p4.z),
      floor: box.floor,
    };
  });
}

export const CHANEL_BACH_DANG_COLLIDERS: IntersectionColliderBox[] =
  createTransformedChanelColliders(CHANEL_BACH_DANG_PLACEMENT);

// =========================================================================
// PROCEDURAL CHANEL TEXTURES
// =========================================================================

function createChanelWordmarkTex(
  textColor = '#111214',
  glowColor?: string,
  boldOutline = false
): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const title = 'CHANEL';
  const spacing = 132;
  const startX = w * 0.5 - (title.length - 1) * spacing * 0.5;

  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 22;
  }
  ctx.fillStyle = textColor;
  ctx.strokeStyle = textColor;
  ctx.font = '700 112px "Futura", "Century Gothic", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < title.length; i++) {
    if (boldOutline) {
      ctx.lineWidth = 3;
      ctx.strokeText(title[i], startX + i * spacing, h * 0.52);
    }
    ctx.fillText(title[i], startX + i * spacing, h * 0.52);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createChanelInterlockingCCTex(
  color = '#111214',
  glowColor?: string
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 34;
  ctx.lineCap = 'butt';

  const r = 112;
  const offset = 60;
  // Left facing right C
  ctx.beginPath();
  ctx.arc(size * 0.5 - offset, size * 0.5, r, Math.PI * 0.24, Math.PI * 1.76, false);
  ctx.stroke();

  // Right facing left C
  ctx.beginPath();
  ctx.arc(size * 0.5 + offset, size * 0.5, r, Math.PI * 1.24, Math.PI * 0.76, false);
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createChanelWhiteGlassPanelTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#f9f9fb');
  grad.addColorStop(0.5, '#f2f3f5');
  grad.addColorStop(1, '#fafafb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle architectural glass panel joint seams
  ctx.strokeStyle = 'rgba(180, 184, 192, 0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 256) {
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
  tex.repeat.set(3, 2);
  tex.anisotropy = 4;
  return tex;
}

function createChanelInlaidFloorTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#efe9de';
  ctx.fillRect(0, 0, size, size);

  // Peter Marino crisp black inlay perimeter grid
  ctx.strokeStyle = '#18191d';
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, size - 40, size - 40);

  ctx.strokeStyle = 'rgba(160, 146, 128, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(128, 128, size - 256, size - 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 4;
  return tex;
}

function createChanelGoldenCamelliaTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, 290);
  bg.addColorStop(0, '#ffdf88');
  bg.addColorStop(0.55, '#e89c28');
  bg.addColorStop(1, '#a85a10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Stylized multi-layered golden Camellia blossoms (Image 3 floral backdrop inspiration)
  const drawBloom = (cx: number, cy: number, radius: number) => {
    for (let ring = 3; ring >= 1; ring--) {
      const petals = ring * 6;
      const rr = radius * (ring / 3);
      for (let i = 0; i < petals; i++) {
        const ang = (i / petals) * Math.PI * 2 + ring * 0.3;
        const px = cx + Math.cos(ang) * rr * 0.52;
        const py = cy + Math.sin(ang) * rr * 0.52;
        ctx.fillStyle = ring === 3 ? 'rgba(255, 224, 140, 0.86)' : ring === 2 ? 'rgba(255, 238, 180, 0.90)' : '#fff4cf';
        ctx.beginPath();
        ctx.arc(px, py, rr * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180, 108, 18, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#fff9e6';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.14, 0, Math.PI * 2);
    ctx.fill();
  };

  drawBloom(w * 0.5, h * 0.5, 165);
  drawBloom(w * 0.2, h * 0.25, 85);
  drawBloom(w * 0.8, h * 0.72, 92);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createChanelShoppingBagTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0e0f12';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px "Futura", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHANEL', size * 0.5, size * 0.48);

  // Tiny iconic white Camellia blossom sticker on bag corner
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size * 0.78, size * 0.24, 14, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChanelNo5BottleTex(): THREE.CanvasTexture {
  const w = 128;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f8f6f0';
  ctx.fillRect(10, 20, w - 20, h - 40);
  ctx.strokeStyle = '#111214';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 24, w - 28, h - 48);
  ctx.fillStyle = '#111214';
  ctx.textAlign = 'center';
  ctx.font = '700 28px "Times New Roman", serif';
  ctx.fillText('N°5', w * 0.5, h * 0.42);
  ctx.font = '700 18px "Futura", Arial, sans-serif';
  ctx.fillText('CHANEL', w * 0.5, h * 0.65);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================================
// INTERIOR & PROP HELPERS
// =========================================================================

function buildChanelClassicFlapBag(
  x: number,
  y: number,
  z: number,
  leatherMat: THREE.Material,
  goldMat: THREE.Material,
  yaw = 0
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.23, 0.13), leatherMat);
  body.position.y = 0.115;
  g.add(body);

  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.14, 0.145), leatherMat);
  flap.position.set(0, 0.155, 0.008);
  g.add(flap);

  // Signature CC turnlock clasp
  const ccClasp = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.045, 0.025), goldMat);
  ccClasp.position.set(0, 0.125, 0.082);
  g.add(ccClasp);

  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 16, Math.PI), goldMat);
  chain.position.set(0, 0.235, 0);
  g.add(chain);

  return g;
}

function buildChanelCoutureMannequin(
  x: number,
  y: number,
  z: number,
  yaw: number,
  jacketMat: THREE.Material,
  skirtMat: THREE.Material,
  pearlMat: THREE.Material,
  skinMat: THREE.Material,
  plinthMat: THREE.Material,
  plinthHeight = 0.18
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;

  if (plinthHeight > 0.01) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.76, plinthHeight, 0.76), plinthMat);
    plinth.position.y = plinthHeight * 0.5;
    g.add(plinth);
  }

  const base = plinthHeight;
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.88, 10), skinMat);
  legL.position.set(-0.08, base + 0.44, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.set(0.08, base + 0.44, 0);
  g.add(legR);

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.46, 12), skirtMat);
  skirt.position.y = base + 0.96;
  g.add(skirt);

  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.21), jacketMat);
  jacket.position.y = base + 1.38;
  g.add(jacket);

  // Layered white pearl necklace collar
  const pearlRing = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.016, 6, 14), pearlMat);
  pearlRing.rotation.x = Math.PI * 0.42;
  pearlRing.position.set(0, base + 1.62, 0.03);
  g.add(pearlRing);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), skinMat);
  neck.position.y = base + 1.69;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), skinMat);
  head.position.y = base + 1.85;
  g.add(head);

  return g;
}

function buildChanelChandelier(
  x: number,
  y: number,
  z: number,
  goldMat: THREE.Material,
  bulbMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), goldMat);
  rod.position.y = 0.36;
  g.add(rod);

  [1.15, 0.74].forEach((radius, tier) => {
    const ty = tier === 0 ? 0 : -0.34;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 8, 28), goldMat);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = ty;
    g.add(ring);

    const count = tier === 0 ? 10 : 6;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), bulbMat);
      bulb.position.set(Math.cos(ang) * radius, ty - 0.04, Math.sin(ang) * radius);
      g.add(bulb);
    }
  });

  return g;
}

// =========================================================================
// MAIN CHANEL FLAGSHIP BUILDER
// =========================================================================

export function createChanelStoreStructure(
  placement?: ChanelPlacementConfig
): ChanelBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared Architectural Materials (Peter Marino Chanel Aesthetic)
  const whiteGlassTex = createChanelWhiteGlassPanelTex();
  const whiteGlassMat = new THREE.MeshStandardMaterial({
    map: whiteGlassTex,
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0.08,
  });
  const warmTravertineMat = new THREE.MeshStandardMaterial({
    color: 0xebe3d5,
    roughness: 0.54,
    metalness: 0.04,
  });
  const inlaidFloorTex = createChanelInlaidFloorTex();
  const inlaidFloorMat = new THREE.MeshStandardMaterial({
    map: inlaidFloorTex,
    color: 0xf4eee2,
    roughness: 0.32,
    metalness: 0.06,
  });
  const blackSteelMat = new THREE.MeshStandardMaterial({
    color: 0x111216,
    roughness: 0.28,
    metalness: 0.82,
  });
  const blackLacquerMat = new THREE.MeshStandardMaterial({
    color: 0x131418,
    roughness: 0.18,
    metalness: 0.25,
  });
  const smokedOakMat = new THREE.MeshStandardMaterial({
    color: 0x3b2c22,
    roughness: 0.48,
    metalness: 0.05,
  });
  const upperStoneMat = new THREE.MeshStandardMaterial({
    color: 0x9b806c,
    roughness: 0.62,
    metalness: 0.08,
  });
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd9b872,
    roughness: 0.22,
    metalness: 0.88,
  });
  const whitePearlMat = new THREE.MeshStandardMaterial({
    color: 0xfcfaf5,
    roughness: 0.22,
    metalness: 0.15,
  });
  const whiteSculptMat = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.42 });
  const tweedPinkMat = new THREE.MeshStandardMaterial({ color: 0xe64980, roughness: 0.78 });
  const coutureCoralMat = new THREE.MeshStandardMaterial({ color: 0xd9383a, roughness: 0.72 });
  const tweedCreamMat = new THREE.MeshStandardMaterial({ color: 0xf2e9dc, roughness: 0.80 });
  const tweedBlackMat = new THREE.MeshStandardMaterial({ color: 0x18191e, roughness: 0.82 });
  const cognacFurMat = new THREE.MeshStandardMaterial({ color: 0x9c5524, roughness: 0.85 });
  const boucleCharcoalMat = new THREE.MeshStandardMaterial({ color: 0x26272c, roughness: 0.88 });
  const skyRunwayBackdropMat = new THREE.MeshStandardMaterial({
    color: 0xdcebf7,
    emissive: 0x9ec5e6,
    emissiveIntensity: 0.42,
    roughness: 0.4,
  });

  const crispGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdfeaef,
    transparent: true,
    opacity: 0.16,
    roughness: 0.05,
    metalness: 0.12,
    depthWrite: false,
  });
  const interiorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe5eff4,
    transparent: true,
    opacity: 0.24,
    roughness: 0.06,
    metalness: 0.12,
    depthWrite: false,
  });
  const bronzeGlassMat = new THREE.MeshStandardMaterial({
    color: 0x3b2f26,
    transparent: true,
    opacity: 0.45,
    roughness: 0.12,
    metalness: 0.35,
    depthWrite: false,
  });
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xd5dce2,
    roughness: 0.06,
    metalness: 0.96,
  });

  const warmLedMat = new THREE.MeshStandardMaterial({
    color: 0xfff8eb,
    emissive: 0xffefd2,
    emissiveIntensity: 1.65,
    roughness: 0.2,
  });
  neonMats.push(warmLedMat);

  const amberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffc542,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.15,
    roughness: 0.28,
  });
  neonMats.push(amberGlowMat);

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
  const zMin = 45.8;
  const zMax = 70.0;
  const zMid = (zMin + zMax) * 0.5; // 57.9
  const totalD = zMax - zMin; // 24.2m

  // Front stone apron (Z = 42.50 .. 45.80) flush at sidewalk level
  addBox(totalW, 0.04, 3.30, xMid, 0.02, 44.15, warmTravertineMat);
  // Subtle entrance ramp step inside portal (X = 452.6 .. 457.8, Z = 45.15 .. 45.85)
  addBox(5.2, 0.08, 0.70, CHANEL_DOOR_X, 0.04, 45.50, warmTravertineMat);
  addBox(5.2, 0.14, 0.36, CHANEL_DOOR_X, 0.08, 45.67, warmTravertineMat);

  // Floor 1 Podium Slab (Y = 0 .. 0.16) — inset inside side & rear walls to prevent Z-fighting
  addBox(totalW - 0.16, CHANEL_PODIUM_Y, totalD - 0.08, xMid, CHANEL_PODIUM_Y * 0.5, zMid - 0.04, inlaidFloorMat);

  // Floor 2 Mezzanine Slab (Y = 4.26) — inset 0.12m inside exterior walls, carved open behind vitrine & over SE stairwell
  addBox(16.28, 0.24, 19.48, 444.46, CHANEL_PODIUM_Y + CHANEL_FLOOR_H - 0.12, 60.14, smokedOakMat); // West Mezzanine rear of vitrine (Z=50.4..69.88)
  addBox(7.28, 0.24, 16.58, 456.24, CHANEL_PODIUM_Y + CHANEL_FLOOR_H - 0.12, 54.21, smokedOakMat); // East Mezzanine ahead of stair (Z=45.92..62.5)
  addBox(1.85, 0.24, 7.38, 453.52, CHANEL_PODIUM_Y + CHANEL_FLOOR_H - 0.12, 66.19, smokedOakMat); // Narrow bridge west of stair (X=452.6..454.45)

  // Floor 2 Ceiling & Roof Massing (Y = 8.46 inset inside walls; upper tier to Y = 10.65m matching Image 2)
  addBox(totalW - 0.16, 0.28, totalD - 0.16, xMid, CHANEL_PODIUM_Y + CHANEL_FLOOR_H * 2 + 0.14, zMid, whiteGlassMat);
  addBox(totalW - 0.8, 2.35, totalD - 2.4, xMid, 9.65, zMid + 1.0, upperStoneMat);

  // Exterior Side Walls & South Rear Wall (Note: West wall opens glass corner Z = 45.8..49.6!)
  addBox(0.50, 8.60, totalD - 3.8, xMin + 0.25, 4.30, 59.8, whiteGlassMat); // West Solid Wall behind corner vitrine
  addBox(0.50, 8.60, totalD, xMax - 0.25, 4.30, zMid, whiteGlassMat); // East Outer Wall
  addBox(totalW - 0.12, 8.60, 0.55, xMid, 4.30, zMax - 0.275, whiteGlassMat); // South Rear Wall (inset between side walls)

  // =========================================================================
  // 2. ICONIC CHANEL FACADE — WHITE GLASS L-FRAME & DOUBLE-HEIGHT VITRINE
  // =========================================================================
  // A. Glossy White Architectural L-Frame (Image 2 hero silhouette!)
  // Top Lintel spanning full width (2cm proud on flanks to avoid coplanar UV Z-fighting with side walls)
  addBox(totalW + 0.04, 1.90, 0.58, xMid, 6.90, 46.05, whiteGlassMat);
  // East Outer White Glass Pier framing the Recessed Portal (inset 4cm inside East outer wall face)
  addBox(2.16, 5.79, 2.00, 458.88, 3.055, 46.76, whiteGlassMat);
  // Deep White Glass Vestibule Ceiling Soffit (X = 452.4 .. 457.8, Y = 5.75 .. 5.95, Z = 45.8 .. 47.7)
  addBox(5.40, 0.24, 1.95, 455.10, 5.86, 46.75, whiteGlassMat);
  // Vestibule West return wall separating portal from vitrine (X = 452.40 .. 452.75)
  addBox(0.36, 5.79, 1.95, 452.58, 3.055, 46.75, whiteGlassMat);
  // Recessed white backdrop panel directly above entrance doors (Y = 3.15 .. 5.80, Z = 47.45)
  addBox(5.04, 2.65, 0.25, 455.20, 4.475, 47.55, whiteGlassMat);
  // 3 Warm Recessed Soffit Pinhole Downlights inside Double-Height White Portal (Image 2!)
  [454.1, 455.2, 456.3].forEach((lx) => {
    addBox(0.14, 0.04, 0.14, lx, 5.73, 46.65, warmLedMat);
  });

  // B. Upper Tier Bronze Windows Above White L-Frame (Y = 7.85 .. 10.65, Image 2!)
  addBox(totalW - 1.2, 2.1, 0.12, xMid, 9.55, 46.90, bronzeGlassMat);
  for (let wx = 438.0; wx <= 458.0; wx += 4.0) {
    addBox(0.14, 2.15, 0.18, wx, 9.55, 46.88, blackSteelMat);
  }

  // C. Iconic Bold "CHANEL" Lettering on Glossy White Fascia + Corner Illuminated Band!
  const chanelBlackTex = createChanelWordmarkTex('#111214', 'rgba(255, 245, 220, 0.45)', true);
  const chanelBlackMat = new THREE.MeshStandardMaterial({
    map: chanelBlackTex,
    transparent: true,
    roughness: 0.22,
    depthWrite: false,
  });
  const mainChanelSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.40), chanelBlackMat);
  mainChanelSign.rotation.y = Math.PI;
  mainChanelSign.position.set(444.4, 6.82, 45.73);
  staticGroup.add(mainChanelSign);

  // Subtle glowing interlocking CC medallion on left white portal lintel (X = 455.2)
  const ccWhiteTex = createChanelInterlockingCCTex('#111214');
  const ccBlackMat = new THREE.MeshStandardMaterial({
    map: ccWhiteTex,
    transparent: true,
    roughness: 0.24,
    depthWrite: false,
  });
  const frontCcMedallion = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), ccBlackMat);
  frontCcMedallion.rotation.y = Math.PI;
  frontCcMedallion.position.set(455.2, 6.85, 45.73);
  staticGroup.add(frontCcMedallion);

  // Image 3 signature! Sleek Black Glass Header Band on the Corner + Glowing White "CHANEL"
  const chanelWhiteGlowTex = createChanelWordmarkTex('#ffffff', 'rgba(255, 250, 235, 0.96)', true);
  const chanelWhiteGlowMat = new THREE.MeshStandardMaterial({
    map: chanelWhiteGlowTex,
    transparent: true,
    emissive: 0xffffff,
    emissiveMap: chanelWhiteGlowTex,
    emissiveIntensity: 2.05,
    roughness: 0.14,
    depthWrite: false,
  });
  neonMats.push(chanelWhiteGlowMat);

  // Corner illuminated black fascia bar sitting cleanly under the white cornice at the West glass corner (Image 3 vibe!)
  addBox(6.8, 0.82, 0.24, 439.6, 5.52, 45.92, blackLacquerMat);
  const cornerNorthSign = new THREE.Mesh(new THREE.PlaneGeometry(3.85, 0.96), chanelWhiteGlowMat);
  cornerNorthSign.rotation.y = Math.PI;
  cornerNorthSign.position.set(439.6, 5.52, 45.78);
  staticGroup.add(cornerNorthSign);

  // West corner return black band facing Hermès (-X)
  addBox(0.24, 0.82, 3.85, 436.32, 5.52, 47.72, blackLacquerMat);
  const cornerWestSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.80), chanelWhiteGlowMat);
  cornerWestSign.rotation.y = -Math.PI * 0.5;
  cornerWestSign.position.set(436.18, 5.52, 47.72);
  staticGroup.add(cornerWestSign);

  // D. Double-Height Black-Steel Framed Glass Showcase Vitrine (X = 436.2 .. 452.4, Y = 0.16 .. 5.95)
  // Bottom, Top & Horizontal Divider Transoms
  addBox(16.2, 0.12, 0.18, 444.3, 0.22, 45.88, blackSteelMat);
  addBox(16.2, 0.12, 0.18, 444.3, 5.90, 45.88, blackSteelMat);
  addBox(16.2, 0.08, 0.14, 444.3, 3.12, 45.88, blackSteelMat); // Sleek mid horizontal bar (Image 2)
  // Slim vertical steel mullions dividing vitrine into 3 bays
  [436.28, 441.6, 447.0, 452.32].forEach((mx) => {
    addBox(0.10, 5.78, 0.18, mx, 3.06, 45.88, blackSteelMat);
  });
  // West Glass Return Corner Frame (Z = 45.88 .. 49.65, Image 3 wrap-around corner!)
  addBox(0.16, 0.12, 3.80, 436.28, 0.22, 47.75, blackSteelMat);
  addBox(0.16, 0.12, 3.80, 436.28, 5.90, 47.75, blackSteelMat);
  addBox(0.12, 5.78, 0.12, 436.28, 3.06, 49.60, blackSteelMat);
  addBox(0.04, 5.60, 3.65, 436.28, 3.06, 47.75, crispGlassMat);

  // Crystal-clear front double-height showcase panes
  addBox(15.9, 5.60, 0.04, 444.3, 3.06, 45.88, crispGlassMat);

  // Small iconic "CHANEL" plinth nameplate right at bottom edge of vitrine (Image 2 detail!)
  const vitrineLabelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), chanelBlackMat);
  vitrineLabelMesh.rotation.y = Math.PI;
  vitrineLabelMesh.position.set(444.3, 0.28, 45.95);
  staticGroup.add(vitrineLabelMesh);

  // E. Recessed Portal Frame & Automatic Bi-Parting Black Glass Doors (X = 455.2, Z = 47.40)
  // Framing flanks on Z = 47.40 connecting white walls cleanly
  addBox(0.95, 2.98, 0.22, 453.22, 1.65, CHANEL_DOOR_Z, blackSteelMat);
  addBox(0.95, 2.98, 0.22, 457.18, 1.65, CHANEL_DOOR_Z, blackSteelMat);
  addBox(5.10, 0.14, 0.22, CHANEL_DOOR_X, 3.08, CHANEL_DOOR_Z, blackSteelMat);

  const createDoorLeaf = (cx: number) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;
    leaf.position.set(cx, CHANEL_PODIUM_Y, CHANEL_DOOR_Z);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 0.07), blackSteelMat);
    topBar.position.y = 2.82;
    leaf.add(topBar);
    const botBar = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.09, 0.07), blackSteelMat);
    botBar.position.y = 0.045;
    leaf.add(botBar);
    const stileL = new THREE.Mesh(new THREE.BoxGeometry(0.065, 2.86, 0.07), blackSteelMat);
    stileL.position.set(-0.71, 1.43, 0);
    leaf.add(stileL);
    const stileR = stileL.clone();
    stileR.position.set(0.71, 1.43, 0);
    leaf.add(stileR);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.72, 0.025), crispGlassMat);
    glass.position.set(0, 1.43, 0);
    leaf.add(glass);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.86, 0.08), champagneGoldMat);
    handle.position.set(cx < CHANEL_DOOR_X ? 0.58 : -0.58, 1.25, -0.04);
    leaf.add(handle);
    staticGroup.add(leaf);
    return leaf;
  };
  const leftClosedX = CHANEL_DOOR_X - 0.74;
  const rightClosedX = CHANEL_DOOR_X + 0.74;
  const doorLeftLeaf = createDoorLeaf(leftClosedX);
  const doorRightLeaf = createDoorLeaf(rightClosedX);

  // Automatic Rolling Security Shutter (closed 23:00 - 07:00)
  const shutterTex = createRollingShutterTexture({
    title: 'CHANEL BOUTIQUE PARIS',
    hoursLabel: 'OPEN DAILY : 07:00 - 23:00',
    accentHex: '#18181b',
    slatDarkHex: '#17181c',
    slatLightHex: '#3b3e46',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.40,
    metalness: 0.65,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'chanel-main-shutter',
      axis: 'x',
      pos: 47.25,
      spanCenter: CHANEL_DOOR_X,
      width: 3.16,
      baseY: CHANEL_PODIUM_Y,
      topY: 3.00,
    },
    shutterMat,
    blackSteelMat
  );

  // =========================================================================
  // 3. DOUBLE-HEIGHT FRONT SHOWCASE VITRINE CONTENT (IMAGES 2 & 3 FUSION!)
  // =========================================================================
  const f1Y = CHANEL_PODIUM_Y;
  // Glossy white display stage inside vitrine (X = 436.7 .. 452.1, Z = 46.1 .. 49.4)
  addBox(15.3, 0.18, 3.25, 444.4, f1Y + 0.09, 47.75, whiteSculptMat);

  // Signature Golden Amber Floral Camellia Relief Backdrop (Left-West Bay X = 437.2 .. 445.2, Image 3!)
  const camelliaTex = createChanelGoldenCamelliaTex();
  const camelliaPanelMat = new THREE.MeshStandardMaterial({
    map: camelliaTex,
    emissive: 0xffb732,
    emissiveMap: camelliaTex,
    emissiveIntensity: 0.78,
    roughness: 0.25,
  });
  neonMats.push(camelliaPanelMat);
  addBox(7.2, 4.45, 0.16, 441.2, f1Y + 2.40, 49.28, amberGlowMat);
  const camelliaFront = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 4.20), camelliaPanelMat);
  camelliaFront.rotation.y = Math.PI;
  camelliaFront.position.set(441.2, f1Y + 2.40, 49.18);
  staticGroup.add(camelliaFront);

  // Icy-Blue & White Couture Runway Backdrop Panel (Right-East Bay X = 445.6 .. 451.8, Image 2!)
  addBox(5.8, 3.65, 0.14, 448.6, f1Y + 2.00, 49.28, skyRunwayBackdropMat);
  // Sculpted white geometric stepped winter-runway plinths
  addBox(1.15, 0.55, 1.05, 448.2, f1Y + 0.45, 47.65, whiteSculptMat);
  addBox(0.95, 0.35, 0.95, 449.8, f1Y + 0.35, 47.75, whiteSculptMat);

  // 5 Couture Showcase Mannequins facing Boulevard (-Z)
  staticGroup.add(
    buildChanelCoutureMannequin(438.1, f1Y + 0.18, 47.55, Math.PI - 0.22, tweedPinkMat, tweedPinkMat, whitePearlMat, whiteSculptMat, whiteSculptMat, 0)
  );
  staticGroup.add(
    buildChanelCoutureMannequin(440.6, f1Y + 0.18, 47.45, Math.PI + 0.14, coutureCoralMat, coutureCoralMat, whitePearlMat, whiteSculptMat, whiteSculptMat, 0)
  );
  staticGroup.add(
    buildChanelCoutureMannequin(443.1, f1Y + 0.18, 47.65, Math.PI - 0.12, tweedCreamMat, tweedPinkMat, whitePearlMat, whiteSculptMat, whiteSculptMat, 0)
  );
  staticGroup.add(
    buildChanelCoutureMannequin(448.2, f1Y + 0.72, 47.65, Math.PI + 0.16, cognacFurMat, tweedBlackMat, champagneGoldMat, whiteSculptMat, whiteSculptMat, 0)
  );
  staticGroup.add(
    buildChanelCoutureMannequin(450.9, f1Y + 0.18, 47.50, Math.PI - 0.20, tweedBlackMat, tweedBlackMat, whitePearlMat, whiteSculptMat, whiteSculptMat, 0)
  );
  // Subtle black showcase bag on front white pedestal
  staticGroup.add(buildChanelClassicFlapBag(449.8, f1Y + 0.53, 47.75, tweedBlackMat, champagneGoldMat, Math.PI));

  // Double-Height Vitrine Ceiling Spotlight Rail (Y = 5.75)
  addBox(15.0, 0.06, 0.12, 444.3, 5.72, 47.5, warmLedMat);

  // =========================================================================
  // 4. FLOOR 1 INTERIOR — CLASSIC FLAP GALLERY, N°5 PERFUME BAR & SALON
  // =========================================================================
  // Floor 1 Ceiling Linear Warm Cove Bars (Z = 50.5 .. 68.5)
  [440.2, 447.8, 455.2].forEach((lx) => {
    addBox(0.18, 0.04, 17.5, lx, f1Y + CHANEL_FLOOR_H - 0.27, 59.5, warmLedMat);
  });
  [52.5, 58.5, 64.5].forEach((lz) => {
    addBox(20.5, 0.04, 0.16, 448.0, f1Y + CHANEL_FLOOR_H - 0.27, lz, warmLedMat);
  });

  // Two Sleek Black-Lacquer & Brushed-Gold Classic Flap Handbag Islands (X = 443.0, Z = 53.7 & Z = 57.7)
  [53.7, 57.7].forEach((iz, idx) => {
    addBox(2.4, 0.86, 1.25, 443.0, f1Y + 0.43, iz, blackLacquerMat);
    addBox(2.46, 0.05, 1.31, 443.0, f1Y + 0.88, iz, champagneGoldMat);
    addBox(0.55, 0.10, 0.48, 442.3, f1Y + 0.95, iz, warmTravertineMat);
    staticGroup.add(
      buildChanelClassicFlapBag(442.3, f1Y + 1.00, iz, idx === 0 ? tweedBlackMat : tweedPinkMat, champagneGoldMat, Math.PI * 0.85)
    );
    staticGroup.add(
      buildChanelClassicFlapBag(443.0, f1Y + 0.905, iz - 0.15, tweedCreamMat, champagneGoldMat, Math.PI)
    );
    addBox(0.50, 0.14, 0.44, 443.7, f1Y + 0.97, iz + 0.08, warmTravertineMat);
    staticGroup.add(
      buildChanelClassicFlapBag(443.7, f1Y + 1.04, iz + 0.08, coutureCoralMat, champagneGoldMat, -Math.PI * 0.85)
    );
  });

  // West Wall Illuminated Tweed & Ready-to-Wear Alcoves (X = 436.9..438.1, Z = 51.5 .. 65.5)
  [53.0, 56.8, 60.6, 64.4].forEach((wz, idx) => {
    addBox(0.80, 3.25, 2.85, 437.3, f1Y + 1.625, wz, smokedOakMat);
    addBox(0.06, 2.95, 2.55, 437.72, f1Y + 1.65, wz, warmLedMat);
    addBox(0.04, 0.04, 2.35, 437.6, f1Y + 2.35, wz, champagneGoldMat);
    [-0.75, -0.25, 0.25, 0.75].forEach((dz, cIdx) => {
      const mat = (idx + cIdx) % 3 === 0 ? tweedBlackMat : (idx + cIdx) % 3 === 1 ? tweedPinkMat : tweedCreamMat;
      addBox(0.32, 0.82, 0.12, 437.6, f1Y + 1.92, wz + dz, mat);
    });
    // Lower black lacquer storage cabinet
    addBox(0.75, 0.75, 2.70, 437.38, f1Y + 0.375, wz, blackLacquerMat);
  });

  // Center Tweed Client Sofa & Travertine Coffee Table (X = 448.4, Z = 55.9)
  addBox(3.8, 0.02, 3.4, 448.4, f1Y + 0.01, 55.9, tweedCreamMat);
  addBox(2.6, 0.44, 0.95, 448.4, f1Y + 0.22, 56.9, boucleCharcoalMat);
  addBox(2.6, 0.80, 0.26, 448.4, f1Y + 0.40, 57.25, boucleCharcoalMat);
  addBox(1.45, 0.36, 0.85, 448.4, f1Y + 0.18, 55.0, warmTravertineMat);
  addBox(0.36, 0.08, 0.44, 448.1, f1Y + 0.40, 55.0, blackLacquerMat);

  // East Concierge Cashwrap Counter (X = 454.5, Z = 53.1) + Camellia Vase & Gift Boxes
  addBox(2.4, 1.02, 1.15, 454.5, f1Y + 0.51, 53.1, blackLacquerMat);
  addBox(2.46, 0.05, 1.21, 454.5, f1Y + 1.04, 53.1, champagneGoldMat);
  addBox(0.38, 0.28, 0.06, 453.7, f1Y + 1.20, 53.1, blackSteelMat); // POS Terminal
  addBox(0.52, 0.14, 0.42, 455.2, f1Y + 1.13, 53.1, whiteSculptMat); // Iconic White Chanel Gift Box
  addBox(0.54, 0.03, 0.10, 455.2, f1Y + 1.19, 53.1, blackLacquerMat); // Black Satin Ribbon
  // White Camellia floral vase on desk
  addBox(0.18, 0.24, 0.18, 454.5, f1Y + 1.18, 53.1, crispGlassMat);
  const camSphere = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), whiteSculptMat);
  camSphere.position.set(454.5, f1Y + 1.38, 53.1);
  staticGroup.add(camSphere);

  // Fine Jewelry & J12 Horology Glass Vitrine (X = 454.5, Z = 57.3)
  addBox(2.0, 0.92, 1.05, 454.5, f1Y + 0.46, 57.3, blackLacquerMat);
  addBox(1.94, 0.65, 0.98, 454.5, f1Y + 1.25, 57.3, interiorGlassMat);
  addBox(1.98, 0.04, 1.02, 454.5, f1Y + 1.59, 57.3, champagneGoldMat);
  addBox(1.88, 0.03, 0.90, 454.5, f1Y + 1.54, 57.3, warmLedMat);
  [-0.55, 0, 0.55].forEach((ox) => {
    addBox(0.24, 0.06, 0.24, 454.5 + ox, f1Y + 0.96, 57.3, whiteSculptMat);
    addBox(0.12, 0.08, 0.12, 454.5 + ox, f1Y + 1.03, 57.3, champagneGoldMat);
  });

  // East Wall Illuminated N°5 Fragrance Bar (X = 457.8..459.1, Z = 50.2 .. 60.0)
  const no5Tex = createChanelNo5BottleTex();
  const no5LabelMat = new THREE.MeshStandardMaterial({ map: no5Tex, roughness: 0.22 });
  addBox(0.30, 3.25, 9.6, 459.0, f1Y + 1.625, 55.1, warmTravertineMat);
  addBox(0.06, 2.80, 9.0, 458.82, f1Y + 1.65, 55.1, warmLedMat);
  [0.95, 1.75, 2.50].forEach((sy) => {
    addBox(0.65, 0.06, 8.8, 458.50, f1Y + sy, 55.1, blackLacquerMat);
    for (let fz = 51.4; fz <= 59.0; fz += 1.5) {
      // Faceted glass N°5 perfume flacon
      addBox(0.24, 0.34, 0.26, 458.42, f1Y + sy + 0.20, fz, amberGlowMat);
      addBox(0.14, 0.12, 0.14, 458.42, f1Y + sy + 0.42, fz, blackLacquerMat);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.20), no5LabelMat);
      label.rotation.y = -Math.PI * 0.5;
      label.position.set(458.29, f1Y + sy + 0.20, fz);
      staticGroup.add(label);
    }
  });

  // South Rear Feature Wall — Monolithic Black Lacquer + Glowing CC & CHANEL (Z = 69.1)
  addBox(7.2, 3.65, 0.42, 447.2, f1Y + 1.825, 69.15, blackLacquerMat);
  const f1RearWordmark = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.10), chanelWhiteGlowMat);
  f1RearWordmark.rotation.y = Math.PI;
  f1RearWordmark.position.set(447.2, f1Y + 2.65, 68.90);
  staticGroup.add(f1RearWordmark);
  const ccGlowTex = createChanelInterlockingCCTex('#ffffff', 'rgba(255, 248, 224, 0.95)');
  const ccGlowMat = new THREE.MeshStandardMaterial({
    map: ccGlowTex,
    transparent: true,
    emissive: 0xffffff,
    emissiveMap: ccGlowTex,
    emissiveIntensity: 1.8,
    roughness: 0.15,
    depthWrite: false,
  });
  neonMats.push(ccGlowMat);
  const rearCcCrest = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), ccGlowMat);
  rearCcCrest.rotation.y = Math.PI;
  rearCcCrest.position.set(447.2, f1Y + 1.55, 68.90);
  staticGroup.add(rearCcCrest);
  // Mirror panels & rear credenza
  addBox(2.8, 3.45, 0.08, 441.6, f1Y + 1.75, 69.25, mirrorMat);
  addBox(5.6, 0.78, 0.85, 447.2, f1Y + 0.39, 68.55, warmTravertineMat);

  // =========================================================================
  // 5. SE SWITCHBACK STAIRWELL (X = 454.5 .. 459.35, Z = 62.5 .. 69.4)
  // =========================================================================
  const buildChanelStaircase = () => {
    const stairGrp = new THREE.Group();
    const halfH = CHANEL_FLOOR_H * 0.5;
    const stepsPerRun = 8;

    // West Balustrade (X = 454.4)
    addBox(0.08, 1.05, 6.9, 454.40, f1Y + 0.525, 65.95, interiorGlassMat);
    addBox(0.08, 0.06, 6.9, 454.40, f1Y + 1.05, 65.95, champagneGoldMat);
    // Center Divider Spine (X = 457.0)
    addBox(0.16, CHANEL_FLOOR_H + 1.0, 5.1, 457.00, f1Y + (CHANEL_FLOOR_H + 1.0) * 0.5, 65.05, blackLacquerMat);

    // Run 1: Upward going South along X = 454.55 .. 456.82 (Z = 62.5 -> 67.6)
    for (let i = 0; i < stepsPerRun; i++) {
      const t = (i + 0.5) / stepsPerRun;
      const stepY = f1Y + t * halfH;
      const stepZ = 62.5 + t * 5.1;
      addBox(2.20, halfH / stepsPerRun + 0.04, 5.1 / stepsPerRun + 0.04, 455.68, stepY - 0.02, stepZ, warmTravertineMat);
      addBox(2.12, 0.025, 0.04, 455.68, stepY + 0.12, stepZ - 0.28, warmLedMat);
    }
    // Half-landing (Z = 67.6 .. 69.4)
    addBox(4.85, 0.20, 1.85, 456.92, f1Y + halfH - 0.10, 68.525, warmTravertineMat);

    // Run 2: Upward going North along X = 457.18 .. 459.35 (Z = 67.6 -> 62.5)
    for (let i = 0; i < stepsPerRun; i++) {
      const t = (i + 0.5) / stepsPerRun;
      const stepY = f1Y + halfH + t * halfH;
      const stepZ = 67.6 - t * 5.1;
      addBox(2.15, halfH / stepsPerRun + 0.04, 5.1 / stepsPerRun + 0.04, 458.26, stepY - 0.02, stepZ, warmTravertineMat);
      addBox(2.06, 0.025, 0.04, 458.26, stepY + 0.12, stepZ + 0.28, warmLedMat);
    }

    // Floor 2 stairwell perimeter glass & gold rail
    addBox(0.08, 1.05, 6.9, 454.40, f1Y + CHANEL_FLOOR_H + 0.525, 65.95, interiorGlassMat);
    addBox(0.08, 0.06, 6.9, 454.40, f1Y + CHANEL_FLOOR_H + 1.05, 65.95, champagneGoldMat);
    addBox(2.30, 1.05, 0.08, 455.68, f1Y + CHANEL_FLOOR_H + 0.525, 62.55, interiorGlassMat);
    addBox(2.30, 0.06, 0.08, 455.68, f1Y + CHANEL_FLOOR_H + 1.05, 62.55, champagneGoldMat);
    staticGroup.add(stairGrp);
  };
  buildChanelStaircase();

  // =========================================================================
  // 6. FLOOR 2 MEZZANINE — HAUTE COUTURE, TWO-TONE SHOE WALL & VIP LOUNGE
  // =========================================================================
  const f2Y = CHANEL_PODIUM_Y + CHANEL_FLOOR_H;

  // Mezzanine Balcony Glass Rail overlooking Double-Height Showcase Vitrine (Z = 50.45, X = 436.6..452.6)
  addBox(16.0, 1.05, 0.08, 444.6, f2Y + 0.525, 50.45, interiorGlassMat);
  addBox(16.0, 0.06, 0.09, 444.6, f2Y + 1.05, 50.45, blackSteelMat);

  // Grand Crystal & Pearl Chandelier visible right through upper double-height vitrine glass!
  staticGroup.add(buildChanelChandelier(444.4, f2Y + 3.45, 48.2, champagneGoldMat, warmLedMat));
  staticGroup.add(buildChanelChandelier(448.4, f2Y + 3.45, 57.5, champagneGoldMat, warmLedMat));

  // Floor 2 Ceiling Recessed Cove Glow Strips
  [440.5, 448.4, 455.2].forEach((lx) => {
    addBox(0.18, 0.04, 17.5, lx, f2Y + CHANEL_FLOOR_H - 0.27, 59.0, warmLedMat);
  });

  // West Two-Tone Slingback & Couture Shoe Gallery (X = 437.0..438.3, Z = 51.8 .. 62.2)
  addBox(0.35, 3.25, 10.2, 437.2, f2Y + 1.625, 57.0, warmTravertineMat);
  addBox(0.06, 2.80, 9.6, 437.38, f2Y + 1.65, 57.0, warmLedMat);
  [0.95, 1.70, 2.45].forEach((sy) => {
    addBox(0.65, 0.06, 9.4, 437.65, f2Y + sy, 57.0, blackLacquerMat);
    for (let sz = 52.8; sz <= 61.2; sz += 1.4) {
      addBox(0.28, 0.14, 0.13, 437.65, f2Y + sy + 0.10, sz, tweedCreamMat);
      addBox(0.09, 0.14, 0.135, 437.54, f2Y + sy + 0.10, sz, blackLacquerMat); // Iconic black toe cap!
    }
  });

  // West VIP Bouclé Fitting Suite (X = 439.2..443.2, Z = 53.8 .. 59.2)
  addBox(4.0, 0.02, 5.2, 441.2, f2Y + 0.01, 56.5, tweedCreamMat);
  addBox(0.95, 0.44, 3.2, 439.8, f2Y + 0.22, 56.5, tweedCreamMat);
  addBox(0.30, 0.80, 3.2, 439.48, f2Y + 0.40, 56.5, tweedCreamMat);
  addBox(1.15, 0.36, 1.75, 441.8, f2Y + 0.18, 56.5, blackLacquerMat);
  addBox(0.36, 0.07, 0.46, 441.8, f2Y + 0.40, 56.1, whiteSculptMat);

  // Central Haute Couture Runway Plinth overlooking Mezzanine Rail (X = 445.5..451.5, Z = 52.2..54.0)
  addBox(6.0, 0.18, 1.8, 448.5, f2Y + 0.09, 53.1, blackLacquerMat);
  staticGroup.add(buildChanelCoutureMannequin(446.6, f2Y + 0.18, 53.1, Math.PI, tweedPinkMat, tweedPinkMat, whitePearlMat, whiteSculptMat, whiteSculptMat, 0));
  staticGroup.add(buildChanelCoutureMannequin(448.5, f2Y + 0.18, 53.1, Math.PI, tweedBlackMat, tweedBlackMat, whitePearlMat, whiteSculptMat, whiteSculptMat, 0));
  staticGroup.add(buildChanelCoutureMannequin(450.4, f2Y + 0.18, 53.1, Math.PI, tweedCreamMat, tweedCreamMat, champagneGoldMat, whiteSculptMat, whiteSculptMat, 0));

  // East Floor 2 Evening Bag & Pearl Vitrine Island (X = 452.5, Z = 58.2)
  addBox(1.35, 0.90, 4.0, 452.5, f2Y + 0.45, 58.2, blackLacquerMat);
  addBox(1.40, 0.05, 4.05, 452.5, f2Y + 0.92, 58.2, champagneGoldMat);
  [56.8, 58.2, 59.6].forEach((bz, idx) => {
    staticGroup.add(
      buildChanelClassicFlapBag(
        452.5,
        f2Y + 0.95,
        bz,
        idx === 0 ? tweedBlackMat : idx === 1 ? tweedPinkMat : tweedCreamMat,
        champagneGoldMat,
        -Math.PI * 0.5
      )
    );
  });

  // Floor 2 Backlit CC Centerpiece on South Wall
  const f2CcCrest = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), ccGlowMat);
  f2CcCrest.rotation.y = Math.PI;
  f2CcCrest.position.set(447.2, f2Y + 2.25, 69.25);
  staticGroup.add(f2CcCrest);

  // =========================================================================
  // 7. ARCHITECTURAL NIGHT LIGHTING & PAVEMENT GLOW
  // =========================================================================
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 256;
  poolCanvas.height = 256;
  const pCtx = poolCanvas.getContext('2d')!;
  const pGrad = pCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
  pGrad.addColorStop(0, 'rgba(255, 245, 224, 0.78)');
  pGrad.addColorStop(0.55, 'rgba(245, 224, 185, 0.28)');
  pGrad.addColorStop(1, 'rgba(245, 224, 185, 0.0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 256, 256);
  const poolTex = new THREE.CanvasTexture(poolCanvas);
  poolTex.colorSpace = THREE.SRGBColorSpace;

  const frontPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });
  poolMats.push(frontPoolMat);

  const frontPool = new THREE.Mesh(new THREE.PlaneGeometry(20.0, 8.2), frontPoolMat);
  frontPool.rotation.x = -Math.PI * 0.5;
  frontPool.position.set(448.1, 0.03, 44.2);
  frontPool.userData.noMerge = true;
  staticGroup.add(frontPool);

  let currentClosedFactor = 0;
  const addChanelLight = (
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

  // Facade White L-Frame & Double-Height Showcase Grazing Washers
  addChanelLight(444.4, 6.8, 43.8, 0xfff8ec, 0.65, 2.75, 22, 0);
  addChanelLight(CHANEL_DOOR_X, 5.2, 44.2, 0xfff8ec, 0.65, 2.85, 22, 0);
  // Double-Height Vitrine Interior Glow (stays 94% luminous all night!)
  addChanelLight(440.6, 3.8, 47.7, 0xffdca0, 1.30, 3.30, 22, 0.06);
  addChanelLight(448.8, 3.8, 47.7, 0xfff8ee, 1.25, 3.15, 22, 0.06);
  // Floor 1 Salons
  addChanelLight(443.0, 3.4, 55.5, 0xfff5e4, 1.05, 2.65, 20, 0.22);
  addChanelLight(454.5, 3.4, 55.0, 0xfff5e4, 1.05, 2.65, 20, 0.22);
  addChanelLight(447.2, 3.4, 64.5, 0xfff3de, 0.95, 2.45, 20, 0.25);
  // Floor 2 Mezzanine & Crystal Chandelier Glow
  addChanelLight(444.4, 7.6, 52.0, 0xfff6e8, 1.05, 2.75, 22, 0.20);
  addChanelLight(448.4, 7.6, 58.0, 0xfff5e4, 1.00, 2.55, 20, 0.25);

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
    npcController?: ChanelNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isChanelOpenAtHour(rawHour);

    const targetClosed = isOpen ? 0 : 1;
    shutterFactor = THREE.MathUtils.lerp(shutterFactor, targetClosed, Math.min(1, dt * 3.0));
    currentClosedFactor = shutterFactor;
    setShutterProgress(mainShutter, shutterFactor);

    let wantOpen = false;
    if (isOpen && shutterFactor < 0.35) {
      if (playerPos) {
        const lp = placement
          ? inverseTransformChanelPointXZ(playerPos.x, playerPos.z, placement)
          : { x: playerPos.x, z: playerPos.z };
        if (Math.hypot(lp.x - CHANEL_DOOR_X, lp.z - CHANEL_DOOR_Z) <= 4.8) {
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
      const wp = transformChanelPointXZ(lt.position.x, lt.position.z, placement);
      lt.position.set(wp.x, lt.position.y, wp.z);
    }
    const outerGroup = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.position.set(placement.anchorX, 0, placement.anchorZ);
    pivot.rotation.y = placement.rotationY;
    staticGroup.position.set(-CHANEL_ORIG_ANCHOR_X, 0, -CHANEL_ORIG_ANCHOR_Z);
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
// CHANEL BOUTIQUE NPC CONTROLLER (TWEED CLIENT ADVISORS & SHOPPERS)
// =========================================================================

type ChanelNpcKind = 'advisor' | 'shopper';
type ChanelPhase = 'browse' | 'admire' | 'walk_leave' | 'respawn_wait';

interface ChanelActor {
  id: number;
  kind: ChanelNpcKind;
  root: THREE.Group;
  headMesh: THREE.Mesh;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  toteBag: THREE.Group;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: ChanelPhase;
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

const CHANEL_SHOPPER_SPOTS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [452.0, CHANEL_PODIUM_Y, 50.8], yaw: Math.PI * 0.65 },
  { pos: [445.5, CHANEL_PODIUM_Y, 53.7], yaw: -Math.PI * 0.5 },
  { pos: [445.5, CHANEL_PODIUM_Y, 57.7], yaw: -Math.PI * 0.5 },
  { pos: [456.4, CHANEL_PODIUM_Y, 55.1], yaw: Math.PI * 0.5 },
  { pos: [447.2, CHANEL_PODIUM_Y, 66.8], yaw: 0 },
];

export class ChanelNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actorContainer: THREE.Group;
  private readonly seedOffset: number;
  private readonly actors: ChanelActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers, placement?: ChanelPlacementConfig) {
    this.rootGroup.name = placement ? 'ChanelBachDangNpcGroup' : 'ChanelNpcGroup';
    this.seedOffset = placement?.seedOffset ?? 0;
    if (placement) {
      const pivot = new THREE.Group();
      pivot.position.set(placement.anchorX, 0, placement.anchorZ);
      pivot.rotation.y = placement.rotationY;
      const inner = new THREE.Group();
      inner.position.set(-CHANEL_ORIG_ANCHOR_X, 0, -CHANEL_ORIG_ANCHOR_Z);
      pivot.add(inner);
      this.rootGroup.add(pivot);
      this.actorContainer = inner;
    } else {
      this.actorContainer = this.rootGroup;
    }

    const advisorSpecs: { x: number; y: number; z: number; yaw: number }[] = [
      // Floor 1 Concierge, Portal Host & Fragrance Specialist
      { x: 454.5, y: CHANEL_PODIUM_Y, z: 54.6, yaw: Math.PI },
      { x: 453.2, y: CHANEL_PODIUM_Y, z: 49.6, yaw: Math.PI * 0.85 },
      { x: 440.5, y: CHANEL_PODIUM_Y, z: 55.8, yaw: Math.PI * 0.45 },
      // Floor 2 Mezzanine Couture & Shoe Salon Hosts
      { x: 444.8, y: CHANEL_PODIUM_Y + CHANEL_FLOOR_H, z: 55.6, yaw: Math.PI },
      { x: 450.2, y: CHANEL_PODIUM_Y + CHANEL_FLOOR_H, z: 58.2, yaw: Math.PI * 0.65 },
    ];

    advisorSpecs.forEach((sp, idx) => {
      this.actors.push(
        this.spawnActor(idx, 'advisor', helpers, new THREE.Vector3(sp.x, sp.y, sp.z), sp.yaw)
      );
    });

    for (let i = 0; i < 4; i++) {
      const spot = CHANEL_SHOPPER_SPOTS[i % CHANEL_SHOPPER_SPOTS.length];
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
    kind: ChanelNpcKind,
    helpers: HospitalCharacterHelpers,
    homePos: THREE.Vector3,
    homeYaw: number
  ): ChanelActor {
    const root = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    root.add(fallbackGroup);
    root.position.copy(homePos);
    root.rotation.y = homeYaw;

    const paletteShirt = [0x141519, 0xf3ede4, 0xd84776, 0x2b2c32, 0x6b1d28];
    const palettePants = [0x111216, 0x26262a, 0x3b3532];
    const isAdvisor = kind === 'advisor';
    const shirtColor = isAdvisor ? 0x121317 : paletteShirt[id % paletteShirt.length];
    const pantsColor = isAdvisor ? 0x0d0e11 : palettePants[id % palettePants.length];
    const skinHex = ['#f2d1b2', '#e7bd94', '#efc5a2'][id % 3];

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.78 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.42 });
    const pearlTrimMat = new THREE.MeshStandardMaterial({ color: 0xfbf9f4, roughness: 0.25 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: id % 2 === 0 ? 0x16161a : 0x452a19, roughness: 0.78 });

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
      // Iconic Chanel white pearl lapel trim / necklace on advisor suit
      const pearlCollar = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.055, 0.04), pearlTrimMat);
      pearlCollar.position.set(0, 1.33, 0.125);
      fallbackGroup.add(pearlCollar);
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

    const toteBag = new THREE.Group();
    const bagTex = createChanelShoppingBagTex();
    const bagMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.34, 0.28),
      new THREE.MeshStandardMaterial({ map: bagTex, roughness: 0.50 })
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
        : pickStationaryCivilianModel(id + 71 + this.seedOffset)
      : pickShopCustomerModel(id + 73 + this.seedOffset);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: root,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: isAdvisor && id === 0 ? 'Checkout' : 'Idle',
      phaseOffset: id * 0.43,
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

  private assignNewSpot(a: ChanelActor, spawnOutside = false) {
    const spot = CHANEL_SHOPPER_SPOTS[(a.id + Math.floor(this.timer * 0.5)) % CHANEL_SHOPPER_SPOTS.length];
    const targetPos = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]);
    a.targetYaw = spot.yaw;

    if (spawnOutside) {
      a.root.position.set(CHANEL_DOOR_X + (a.id % 2 === 0 ? -4.0 : 4.0), 0.02, 43.2);
      a.pathQueue = [
        new THREE.Vector3(CHANEL_DOOR_X, 0.04, 44.8),
        new THREE.Vector3(CHANEL_DOOR_X, CHANEL_PODIUM_Y, 47.4),
        new THREE.Vector3(CHANEL_DOOR_X, CHANEL_PODIUM_Y, 50.8),
        targetPos,
      ];
    } else {
      a.pathQueue = [new THREE.Vector3(450.5, CHANEL_PODIUM_Y, 55.5), targetPos];
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
      if (!a.root.visible || a.homePos.y > CHANEL_PODIUM_Y + 0.5) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - CHANEL_DOOR_X, p.z - CHANEL_DOOR_Z) <= 3.6) return true;
    }
    return false;
  }

  private stepPath(a: ChanelActor, dt: number): boolean {
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
    const isOpen = isChanelOpenAtHour(rawHour);

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
          new THREE.Vector3(CHANEL_DOOR_X, CHANEL_PODIUM_Y, 50.8),
          new THREE.Vector3(CHANEL_DOOR_X, CHANEL_PODIUM_Y, 47.4),
          new THREE.Vector3(CHANEL_DOOR_X, 0.04, 44.8),
          new THREE.Vector3(CHANEL_DOOR_X + (a.id % 2 === 0 ? -5.5 : 5.5), 0.02, 42.5),
        ];
        if (a.homePos.y > CHANEL_PODIUM_Y + 0.5) {
          a.pathQueue = [
            new THREE.Vector3(455.7, CHANEL_PODIUM_Y + CHANEL_FLOOR_H, 62.4),
            new THREE.Vector3(458.2, CHANEL_PODIUM_Y + CHANEL_FLOOR_H, 62.5),
            new THREE.Vector3(458.2, CHANEL_PODIUM_Y + CHANEL_FLOOR_H * 0.5, 68.5),
            new THREE.Vector3(455.7, CHANEL_PODIUM_Y, 62.5),
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
              new THREE.Vector3(CHANEL_DOOR_X, CHANEL_PODIUM_Y, 50.8),
              new THREE.Vector3(CHANEL_DOOR_X, CHANEL_PODIUM_Y, 47.4),
              new THREE.Vector3(CHANEL_DOOR_X, 0.04, 44.8),
              new THREE.Vector3(CHANEL_DOOR_X + (a.id % 2 === 0 ? -4.5 : 4.5), 0.02, 42.8),
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
