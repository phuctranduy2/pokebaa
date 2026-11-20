import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isSkechersOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface SkechersStoreBuildResult {
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
    npcController?: SkechersNpcController | null,
    externalNpcNearDoor?: boolean
  ) => void;
}

// Positioned directly East (screen-right from Boulevard) of Phúc Long Coffee & Tea (X = 277.8..298.8)
// Facing South (+Z) onto East Leg Boulevard NE Sidewalk (Z = 15.58..20.80)
// Plot Span: X = 301.8 .. 326.8 (25.0m wide), Z = -8.4 .. 15.6 (24.0m deep)
// Storefront Glass Line: Z = 14.5 (Covered concrete promenade Z = 14.5..20.8)
export const SKECHERS_COLLIDERS: IntersectionColliderBox[] = [
  // Perimeter Structural Brick & Corrugated Metal Walls
  { minX: 301.5, maxX: 302.3, minZ: -8.6, maxZ: 15.6, floor: 1 }, // West Brick Wall
  { minX: 326.3, maxX: 327.0, minZ: -8.6, maxZ: 15.6, floor: 1 }, // East Metal Wing Wall
  { minX: 301.6, maxX: 326.8, minZ: -8.6, maxZ: -7.7, floor: 1 }, // North Rear Wall

  // Front Brick Piers, Corrugated Wing & Glass Storefront (Open Entrance Aperture: X = 311.4 .. 315.0, Z = 14.5)
  { minX: 301.8, maxX: 311.4, minZ: 14.1, maxZ: 15.1, floor: 1 }, // West Showcase + Left Brick Piers
  { minX: 315.0, maxX: 326.8, minZ: 14.1, maxZ: 15.2, floor: 1 }, // Right Showcase + East Brick Pier & Metal Wing

  // Interior Footwear Display Islands & Try-On Benches
  { minX: 304.6, maxX: 309.6, minZ: 9.2, maxZ: 11.4, floor: 1 }, // Left Front Men's/Running Rack Island
  { minX: 316.2, maxX: 321.2, minZ: 9.2, maxZ: 11.4, floor: 1 }, // Right Front Boots/Women's Rack Island
  { minX: 304.6, maxX: 309.6, minZ: 3.4, maxZ: 5.6, floor: 1 }, // Left Mid Footwear Gondola
  { minX: 316.2, maxX: 321.2, minZ: 3.4, maxZ: 5.6, floor: 1 }, // Right Mid Footwear Gondola
  { minX: 311.2, maxX: 315.2, minZ: 4.8, maxZ: 6.4, floor: 1 }, // Center Feature Box Display & Try-On Bench

  // Rear Checkout Cashwrap Counter & Stock Shoe Walls
  { minX: 307.6, maxX: 318.8, minZ: -5.8, maxZ: -3.8, floor: 1 }, // Checkout Desk
  { minX: 302.1, maxX: 303.2, minZ: -7.6, maxZ: 13.8, floor: 1 }, // West Shoebox Stock Wall
  { minX: 322.6, maxX: 326.5, minZ: -7.6, maxZ: 13.8, floor: 1 }, // East Shoebox Stock Wall & Backroom Wing
  { minX: 302.7, maxX: 303.7, minZ: 17.0, maxZ: 18.0, floor: 1 }, // Outdoor Blue Adirondack Chair
];

export interface SkechersPlacementConfig {
  anchorX: number;
  anchorZ: number;
  rotationY: number;
  seedOffset?: number;
}

const SKECHERS_ORIG_ANCHOR_X = 314.3;
const SKECHERS_ORIG_ANCHOR_Z = 15.6;

/**
 * SKECHERS — Chi nhánh Đường Bạch Đằng (kế bên The Royal Residences Bạch Đằng):
 * - Footprint: X = -23.0 .. +2.0 (25.0m wide, 1.6m West of Royal Residences at X = 3.6)
 * - Depth:     Z = -104.0 .. -80.0 (front line flush with Đường Bạch Đằng South sidewalk)
 * - Facing:    North (-Z) toward Sông Hàn & Đường Bạch Đằng (rotationY = Math.PI)
 * - Doorway:   X = -11.2 .. -7.6 (center X = -9.4), Z = -102.9
 */
export const SKECHERS_BACH_DANG_PLACEMENT: SkechersPlacementConfig = {
  anchorX: -10.5,
  anchorZ: -104.0,
  rotationY: Math.PI,
  seedOffset: 83,
};

function transformSkechersPointXZ(
  ox: number,
  oz: number,
  placement: SkechersPlacementConfig
): { x: number; z: number } {
  const lx = ox - SKECHERS_ORIG_ANCHOR_X;
  const lz = oz - SKECHERS_ORIG_ANCHOR_Z;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: placement.anchorX + lx * c + lz * s,
    z: placement.anchorZ - lx * s + lz * c,
  };
}

function inverseTransformSkechersPointXZ(
  wx: number,
  wz: number,
  placement: SkechersPlacementConfig
): { x: number; z: number } {
  const dx = wx - placement.anchorX;
  const dz = wz - placement.anchorZ;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: SKECHERS_ORIG_ANCHOR_X + dx * c - dz * s,
    z: SKECHERS_ORIG_ANCHOR_Z + dx * s + dz * c,
  };
}

export function createTransformedSkechersColliders(
  placement: SkechersPlacementConfig
): IntersectionColliderBox[] {
  return SKECHERS_COLLIDERS.map((box) => {
    const p1 = transformSkechersPointXZ(box.minX, box.minZ, placement);
    const p2 = transformSkechersPointXZ(box.maxX, box.maxZ, placement);
    const p3 = transformSkechersPointXZ(box.minX, box.maxZ, placement);
    const p4 = transformSkechersPointXZ(box.maxX, box.minZ, placement);
    return {
      minX: Math.min(p1.x, p2.x, p3.x, p4.x),
      maxX: Math.max(p1.x, p2.x, p3.x, p4.x),
      minZ: Math.min(p1.z, p2.z, p3.z, p4.z),
      maxZ: Math.max(p1.z, p2.z, p3.z, p4.z),
      floor: box.floor,
    };
  });
}

export const SKECHERS_BACH_DANG_COLLIDERS: IntersectionColliderBox[] =
  createTransformedSkechersColliders(SKECHERS_BACH_DANG_PLACEMENT);

// Multi-tone rustic heritage brick masonry (matching reference Image 2)
function createSkechersBrickTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Mortar base
  ctx.fillStyle = '#bdb2a4';
  ctx.fillRect(0, 0, w, h);

  const palette = ['#8a6850', '#755742', '#a17f64', '#634836', '#b39276', '#7d5f4a', '#94745c'];
  const rows = 24;
  const cols = 10;
  const rh = h / rows;
  const cw = w / cols;
  let seed = 43;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
      ctx.fillRect(col * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.anisotropy = 4;
  return tex;
}

// Limestone cut-stone base blocks under brick piers & corrugated wing
function createSkechersStoneBaseTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b8ae96';
  ctx.fillRect(0, 0, w, h);

  const shades = ['#cfc5ae', '#c2b8a0', '#dcd2bc', '#b8ae96'];
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = shades[(r * 3 + col) % shades.length];
      ctx.fillRect(col * 64 + 2, r * 64 + 2, 60, 60);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Vertical ribbed dark charcoal architectural metal wing & horizontal corrugated header band
function createCorrugatedMetalTex(vertical: boolean): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2b333d';
  ctx.fillRect(0, 0, w, h);

  const count = 16;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#3a4452' : '#212730';
    if (vertical) {
      ctx.fillRect(i * (w / count), 0, w / count / 2, h);
    } else {
      ctx.fillRect(0, i * (h / count), w, h / count / 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(vertical ? 3 : 4, vertical ? 2 : 1);
  return tex;
}

// Crisp Halo-Lit Italic "SKECHERS" Signboard Texture (matching Image 2 exactly!)
function createSkechersLogoTex(): THREE.CanvasTexture {
  const w = 1536;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Subtle dark slate channel outline + crisp soft white halo
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic 900 178px "Montserrat", "Arial Black", system-ui, sans-serif';

  ctx.shadowColor = 'rgba(219, 234, 254, 0.85)';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#0f172a';
  ctx.strokeText('SKECHERS', w * 0.5, h * 0.54);

  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SKECHERS', w * 0.5, h * 0.54);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Small hanging navy blade sign above door ("SKECHERS")
function createSkechersBladeTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f2347';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 72px "Arial Black", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SKECHERS', w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Colorful dense shoebox grid wall texture (signature Skechers packed warehouse shoe-wall look!)
function createSkechersShoeboxWallTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, w, h);

  const boxColors = ['#1d4ed8', '#2563eb', '#dc2626', '#ea580c', '#0f172a', '#e2e8f0', '#0284c7'];
  const rows = 12;
  const cols = 16;
  const rw = w / cols;
  const rh = h / rows;

  for (let r = 0; r < rows; r++) {
    // Shelf divider
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, (r + 1) * rh - 4, w, 4);
    for (let col = 0; col < cols; col++) {
      const bandColor = boxColors[(Math.floor(col / 3) + Math.floor(r / 3)) % boxColors.length];
      ctx.fillStyle = bandColor;
      ctx.fillRect(col * rw + 2, r * rh + 3, rw - 4, rh - 8);
      // White box label sticker
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(col * rw + 7, r * rh + 9, rw * 0.36, rh * 0.44);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Category header plaques ("MEN'S", "WOMEN'S", "ARCH FIT", "SLIP-INS")
function createCategoryHeaderTex(label: string, bg: string): THREE.CanvasTexture {
  const w = 512;
  const h = 112;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w * 0.5, h * 0.54);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSkechersGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 248, 225, 0.36)');
  grad.addColorStop(0.55, 'rgba(219, 234, 254, 0.14)');
  grad.addColorStop(1, 'rgba(219, 234, 254, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Multi-tier illuminated footwear gondola loaded with shoes & boots (matching Image 2!)
function buildFootwearGondola(
  x: number,
  y: number,
  z: number,
  w: number,
  headerLabel: string,
  headerBg: string,
  frameMat: THREE.Material,
  shelfMat: THREE.Material,
  shoeMats: THREE.Material[],
  soleMat: THREE.Material,
  isBootRack = false
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 1.10), frameMat);
  base.position.y = 0.11;
  grp.add(base);

  // Corner vertical chrome posts
  [-w * 0.46, w * 0.46].forEach((px) => {
    [-0.46, 0.46].forEach((pz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.05, 8), frameMat);
      post.position.set(px, 1.05, pz);
      grp.add(post);
    });
  });

  // 4 display shelf tiers packed with footwear
  const tierHeights = [0.36, 0.88, 1.40, 1.92];
  tierHeights.forEach((ty, row) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.05, 0.96), shelfMat);
    shelf.position.y = ty;
    grp.add(shelf);

    const cols = Math.max(4, Math.floor(w / 0.56));
    for (let c = 0; c < cols; c++) {
      const sx = -(w * 0.40) + (c / Math.max(1, cols - 1)) * (w * 0.80);
      [-0.24, 0.24].forEach((sz, side) => {
        const mat = shoeMats[(row * 3 + c + side) % shoeMats.length];
        const shoeH = isBootRack && row >= 1 ? 0.24 : 0.14;
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, shoeH, 0.28), mat);
        shoe.position.set(sx, ty + 0.04 + shoeH * 0.5, sz);
        grp.add(shoe);

        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.29), soleMat);
        sole.position.set(sx, ty + 0.035, sz);
        grp.add(sole);
      });
    }
  });

  // Category header plaque atop gondola
  const hdrTex = createCategoryHeaderTex(headerLabel, headerBg);
  const hdrMat = new THREE.MeshStandardMaterial({
    map: hdrTex,
    emissive: 0xffffff,
    emissiveMap: hdrTex,
    emissiveIntensity: 0.18,
    roughness: 0.45,
  });
  const hdr = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, 0.36, 0.08), hdrMat);
  hdr.position.y = 2.24;
  grp.add(hdr);

  return grp;
}

export function createSkechersStoreStructure(
  placement?: SkechersPlacementConfig
): SkechersStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = 301.8;
  const maxX = 326.8;
  const midX = (minX + maxX) * 0.5; // 314.3 (25.0m wide)
  const frontGlassZ = 14.5;
  const backZ = -8.4;
  const midHallZ = (frontGlassZ + backZ) * 0.5; // 3.05

  // Materials matching Image 2 (rustic heritage brick + tan stone + dark corrugated steel)
  const brickTex = createSkechersBrickTex();
  const brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.88 });
  const stoneTex = createSkechersStoneBaseTex();
  const stoneBaseMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.82 });
  const corniceTanMat = new THREE.MeshStandardMaterial({ color: 0xc4b8a1, roughness: 0.65 });
  const vertMetalMat = new THREE.MeshStandardMaterial({
    map: createCorrugatedMetalTex(true),
    roughness: 0.45,
    metalness: 0.58,
  });
  const horizMetalMat = new THREE.MeshStandardMaterial({
    map: createCorrugatedMetalTex(false),
    roughness: 0.44,
    metalness: 0.52,
  });
  const charcoalSteelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.38, metalness: 0.50 });
  const brushedAlumMat = new THREE.MeshStandardMaterial({ color: 0xdbe0e6, roughness: 0.28, metalness: 0.72 });
  const concreteFloorMat = new THREE.MeshStandardMaterial({ color: 0xdcd7ce, roughness: 0.70 });
  const interiorWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.80 });
  const skechersNavyMat = new THREE.MeshStandardMaterial({ color: 0x153b7a, roughness: 0.58 });
  const adirondackBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.55 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    transparent: true,
    opacity: 0.12,
    roughness: 0.22,
    metalness: 0.10,
  });

  const sconceGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.50,
    roughness: 0.35,
  });
  const ceilingStripMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 0.48,
    roughness: 0.35,
  });
  const sensorLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.40,
    roughness: 0.35,
  });

  // =========================================================================
  // 1. FLOOR SLABS, STRUCTURAL SHELL & EAST CORRUGATED WING
  // =========================================================================
  const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.16, 23.0), concreteFloorMat);
  interiorFloor.position.set(midX, 0.0, 3.0);
  staticGroup.add(interiorFloor);

  // Sidewalk covered apron connecting smoothly from store line Z=14.5 out to curb
  const apronWalk = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.04, 1.3), concreteFloorMat);
  apronWalk.position.set(midX, 0.02, 15.1);
  staticGroup.add(apronWalk);

  // Side walls, rear wall & ceiling roof
  const westBrickWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.2, 23.2), brickMat);
  westBrickWall.position.set(minX + 0.22, 4.1, midHallZ);
  staticGroup.add(westBrickWall);

  const eastSideWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.2, 23.2), vertMetalMat);
  eastSideWall.position.set(maxX - 0.22, 4.1, midHallZ);
  staticGroup.add(eastSideWall);

  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(24.84, 8.2, 0.45), skechersNavyMat);
  rearWall.position.set(midX, 4.1, backZ + 0.22);
  staticGroup.add(rearWall);

  const roofCeiling = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.35, 22.8), interiorWallMat);
  roofCeiling.position.set(midX, 4.65, midHallZ);
  staticGroup.add(roofCeiling);

  const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(25.4, 0.36, 23.8), charcoalSteelMat);
  upperRoof.position.set(midX, 8.25, midHallZ);
  staticGroup.add(upperRoof);

  // =========================================================================
  // 2. HERITAGE BRICK FACADE, CORRUGATED WING & ICONIC "SKECHERS" HALO SIGN
  // =========================================================================
  // Upper Heritage Brick Sign Frieze spanning Main + Left Display Bays (X = 301.8 .. 323.2, Y = 4.35 .. 7.75)
  const upperBrickFrieze = new THREE.Mesh(new THREE.BoxGeometry(21.4, 3.40, 0.55), brickMat);
  upperBrickFrieze.position.set(312.5, 6.05, 14.65);
  staticGroup.add(upperBrickFrieze);

  // Chunky Brick Piers framing Left Window Bay & Main Storefront Bay (matching Image 2!)
  [302.3, 304.8, 322.2].forEach((px) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.10, 7.75, 0.72), brickMat);
    pier.position.set(px, 3.88, 14.72);
    staticGroup.add(pier);
    const baseStone = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.86, 0.78), stoneBaseMat);
    baseStone.position.set(px, 0.43, 14.72);
    staticGroup.add(baseStone);
  });

  // East Corrugated Charcoal Metal Wing (far right X = 323.2 .. 326.8, matching Image 2!)
  const eastCorrugatedWing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 7.75, 0.72), vertMetalMat);
  eastCorrugatedWing.position.set(325.0, 3.88, 14.72);
  staticGroup.add(eastCorrugatedWing);
  const eastStoneBase = new THREE.Mesh(new THREE.BoxGeometry(3.66, 0.90, 0.78), stoneBaseMat);
  eastStoneBase.position.set(325.0, 0.45, 14.72);
  staticGroup.add(eastStoneBase);

  // Wall-mounted bronze pipe hydrant + warm square architectural sconce on East Metal Wing (matching Image 2!)
  const sconceFrame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.14), charcoalSteelMat);
  sconceFrame.position.set(324.9, 2.25, 15.10);
  staticGroup.add(sconceFrame);
  const sconceGlass = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.06), sconceGlowMat);
  sconceGlass.position.set(324.9, 2.25, 15.16);
  staticGroup.add(sconceGlass);

  // Left-side warm wall sconce on West brick pier
  const leftSconceFrame = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.12), charcoalSteelMat);
  leftSconceFrame.position.set(302.3, 2.25, 15.10);
  staticGroup.add(leftSconceFrame);
  const leftSconceGlass = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.05), sconceGlowMat);
  leftSconceGlass.position.set(302.3, 2.25, 15.15);
  staticGroup.add(leftSconceGlass);

  // Satin Tan Upper Architectural Cornice Crown (Y = 7.75 .. 8.35)
  const corniceCrown = new THREE.Mesh(new THREE.BoxGeometry(25.3, 0.62, 0.95), corniceTanMat);
  corniceCrown.position.set(midX, 8.05, 14.78);
  staticGroup.add(corniceCrown);
  const corniceReveal = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.12, 0.85), charcoalSteelMat);
  corniceReveal.position.set(midX, 7.72, 14.74);
  staticGroup.add(corniceReveal);

  // Dark Horizontal Corrugated Steel Transom Bands above glass windows (Y = 3.55 .. 4.35)
  const mainCorrugatedHeader = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.84, 0.34), horizMetalMat);
  mainCorrugatedHeader.position.set(313.5, 3.94, 14.62);
  staticGroup.add(mainCorrugatedHeader);

  const leftCorrugatedHeader = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.84, 0.34), horizMetalMat);
  leftCorrugatedHeader.position.set(303.55, 3.94, 14.62);
  staticGroup.add(leftCorrugatedHeader);

  // GIANT HALO-LIT "SKECHERS" SIGNBOARD ON UPPER BRICK FRIEZE (facing +Z Boulevard)
  const logoTex = createSkechersLogoTex();
  const logoMat = new THREE.MeshStandardMaterial({
    map: logoTex,
    emissive: 0xffffff,
    emissiveMap: logoTex,
    emissiveIntensity: 0.28,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.35,
  });
  const mainLogoSign = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 2.35), logoMat);
  mainLogoSign.userData.noMerge = true;
  mainLogoSign.position.set(313.5, 6.02, 14.96);
  staticGroup.add(mainLogoSign);

  // Projecting Overhead "SKECHERS" Blade Sign suspended directly above front doors!
  const bladeBracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.65), charcoalSteelMat);
  bladeBracket.position.set(313.2, 3.50, 14.88);
  staticGroup.add(bladeBracket);
  const bladeTex = createSkechersBladeTex();
  const bladeMat = new THREE.MeshStandardMaterial({
    map: bladeTex,
    emissive: 0xffffff,
    emissiveMap: bladeTex,
    emissiveIntensity: 0.24,
    roughness: 0.4,
  });
  const doorBladeSign = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.54, 0.10), bladeMat);
  doorBladeSign.userData.noMerge = true;
  doorBladeSign.position.set(313.2, 3.22, 15.16);
  staticGroup.add(doorBladeSign);

  // =========================================================================
  // 3. GRID STOREFRONT WINDOWS & PROXIMITY-TRIGGERED AUTO SLIDING DOORS
  // =========================================================================
  // Main Glass Wings flanking entrance (open door aperture: X = 311.4 .. 315.0)
  const leftMainGlass = new THREE.Mesh(new THREE.BoxGeometry(6.1, 3.45, 0.07), glassMat);
  leftMainGlass.position.set(308.35, 1.80, frontGlassZ);
  staticGroup.add(leftMainGlass);

  const rightMainGlass = new THREE.Mesh(new THREE.BoxGeometry(6.7, 3.45, 0.07), glassMat);
  rightMainGlass.position.set(318.35, 1.80, frontGlassZ);
  staticGroup.add(rightMainGlass);

  const doorTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.72, 0.07), glassMat);
  doorTransomGlass.position.set(313.2, 3.16, frontGlassZ);
  staticGroup.add(doorTransomGlass);

  // Left secondary showcase glass bay (between brick piers X = 302.85 .. 304.25)
  const sideBayGlass = new THREE.Mesh(new THREE.BoxGeometry(1.50, 3.45, 0.07), glassMat);
  sideBayGlass.position.set(303.55, 1.80, frontGlassZ);
  staticGroup.add(sideBayGlass);

  // Dark Bronze-Black Grid Window Mullions (matching grid framing of Image 2!)
  [305.4, 307.4, 309.4, 311.34, 315.06, 317.2, 319.4, 321.6].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.085, 3.48, 0.14), charcoalSteelMat);
    mullion.position.set(mx, 1.80, frontGlassZ);
    staticGroup.add(mullion);
  });
  // Horizontal window grid bars (ONLY outside door span 311.4..315.0!)
  [1.22, 2.38, 3.48].forEach((my) => {
    const lBar = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.065, 0.12), charcoalSteelMat);
    lBar.position.set(308.35, my, frontGlassZ);
    staticGroup.add(lBar);
    const rBar = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.065, 0.12), charcoalSteelMat);
    rBar.position.set(318.35, my, frontGlassZ);
    staticGroup.add(rBar);
    const sBar = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.065, 0.12), charcoalSteelMat);
    sBar.position.set(303.55, my, frontGlassZ);
    staticGroup.add(sBar);
  });

  // BI-PARTING AUTOMATIC SLIDING GLASS ENTRANCE DOORS (X = 311.4 .. 315.0, Z = 14.5)
  const autoHeaderBox = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.20, 0.28), charcoalSteelMat);
  autoHeaderBox.position.set(313.2, 2.90, frontGlassZ);
  staticGroup.add(autoHeaderBox);

  const pocketTrack = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.07, 0.10), brushedAlumMat);
  pocketTrack.position.set(313.2, 2.84, frontGlassZ - 0.14);
  staticGroup.add(pocketTrack);

  // Proximity Sensor Pods + active LED
  [frontGlassZ + 0.16, frontGlassZ - 0.18].forEach((sz) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), charcoalSteelMat);
    pod.position.set(313.2, 2.91, sz);
    staticGroup.add(pod);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.02), sensorLedMat);
    led.position.set(313.2, 2.90, sz + (sz > frontGlassZ ? 0.042 : -0.042));
    staticGroup.add(led);
  });

  const doorThreshold = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.02, 0.18), brushedAlumMat);
  doorThreshold.position.set(313.2, 0.085, frontGlassZ);
  staticGroup.add(doorThreshold);

  const redPushMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const buildSkechersDoorLeaf = (isEastLeaf: boolean) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(1.74, 2.66, 0.045), glassMat);
    grp.add(glassPane);

    [-0.87, 0.87].forEach((sx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.74, 0.075), charcoalSteelMat);
      stile.position.set(sx, 0, 0);
      grp.add(stile);
    });
    [1.34, -1.32].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.09, 0.075), charcoalSteelMat);
      rail.position.set(0, ry, 0);
      grp.add(rail);
    });
    // Signature red push/safety stripe visible on glass door in Image 2
    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.07, 0.05), redPushMat);
    pushBar.position.set(0, -0.18, 0);
    grp.add(pushBar);

    const hx = isEastLeaf ? -0.68 : 0.68;
    [-0.055, 0.055].forEach((hz) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), brushedAlumMat);
      handle.position.set(hx, -0.02, hz);
      grp.add(handle);
    });

    staticGroup.add(grp);
    return grp;
  };

  const westSlideStartX = 312.31;
  const eastSlideStartX = 314.09;
  const doorWestLeaf = buildSkechersDoorLeaf(false);
  doorWestLeaf.position.set(westSlideStartX, 1.45, frontGlassZ - 0.14);
  const doorEastLeaf = buildSkechersDoorLeaf(true);
  doorEastLeaf.position.set(eastSlideStartX, 1.45, frontGlassZ - 0.14);

  // =========================================================================
  // 4. EXTERIOR BLUE ADIRONDACK CHAIR & PACKED FOOTWEAR SHOWROOM INTERIOR
  // =========================================================================
  // Signature bright blue outdoor Adirondack chair on concrete walkway left side (matching Image 2!)
  const chairGrp = new THREE.Group();
  chairGrp.position.set(303.2, 0.04, 17.5);
  chairGrp.rotation.y = Math.PI * 0.22;
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.56), adirondackBlueMat);
  cSeat.position.set(0, 0.38, 0);
  cSeat.rotation.x = -0.15;
  chairGrp.add(cSeat);
  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.06), adirondackBlueMat);
  cBack.position.set(0, 0.72, -0.26);
  cBack.rotation.x = -0.26;
  chairGrp.add(cBack);
  [-0.31, 0.31].forEach((ax) => {
    const cArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.66), adirondackBlueMat);
    cArm.position.set(ax, 0.58, 0.02);
    chairGrp.add(cArm);
    [-0.22, 0.22].forEach((az) => {
      const cLeg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.56, 0.07), adirondackBlueMat);
      cLeg.position.set(ax, 0.28, az);
      chairGrp.add(cLeg);
    });
  });
  staticGroup.add(chairGrp);

  // High-Density Packed Shoebox Walls on West, East & Rear Walls (matching Image 2!)
  const boxWallTex = createSkechersShoeboxWallTex();
  const boxWallMat = new THREE.MeshStandardMaterial({ map: boxWallTex, roughness: 0.68 });
  const westBoxWall = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.6, 20.6), boxWallMat);
  westBoxWall.position.set(302.65, 1.88, 3.0);
  staticGroup.add(westBoxWall);

  const eastBoxWall = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.6, 20.6), boxWallMat);
  eastBoxWall.position.set(323.0, 1.88, 3.0);
  staticGroup.add(eastBoxWall);

  const rearBoxWall = new THREE.Mesh(new THREE.BoxGeometry(19.6, 3.6, 0.85), boxWallMat);
  rearBoxWall.position.set(312.8, 1.88, -7.45);
  staticGroup.add(rearBoxWall);

  // Footwear Gondolas Loaded with Sneakers & Boots in Both Front Windows + Mid Aisles
  const shoeMats = [
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 }), // tan boots
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55 }), // black sneakers
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }), // white court
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.50 }), // skechers blue
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.50 }), // trail red
    new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.50 }), // pink kids
  ];
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });

  // Window-facing front footwear gondolas (visible right through the gridded glass!)
  staticGroup.add(
    buildFootwearGondola(307.2, 0.08, 10.4, 4.2, "MEN'S  •  ARCH FIT", '#0f2b5b', brushedAlumMat, interiorWallMat, shoeMats, soleMat, false)
  );
  staticGroup.add(
    buildFootwearGondola(318.6, 0.08, 10.4, 4.2, "WOMEN'S  •  BOOTS", '#b91c1c', brushedAlumMat, interiorWallMat, shoeMats, soleMat, true)
  );

  // Mid-store aisles gondolas
  staticGroup.add(
    buildFootwearGondola(307.2, 0.08, 4.5, 4.2, 'RUNNING  •  GO RUN', '#1d4ed8', brushedAlumMat, interiorWallMat, shoeMats, soleMat, false)
  );
  staticGroup.add(
    buildFootwearGondola(318.6, 0.08, 4.5, 4.2, 'KIDS  •  UNO & BOOTS', '#0369a1', brushedAlumMat, interiorWallMat, shoeMats, soleMat, true)
  );

  // Center Feature Box Display + Try-On Bench Island (X = 313.2, Z = 5.6)
  const centerIsland = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.54, 1.25), charcoalSteelMat);
  centerIsland.position.set(313.2, 0.35, 5.6);
  staticGroup.add(centerIsland);
  const benchCushion = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.10, 1.15), skechersNavyMat);
  benchCushion.position.set(313.2, 0.66, 5.6);
  staticGroup.add(benchCushion);
  // Hero red/blue shoebox display endcap right inside front door (visible in Image 2!)
  const heroBoxStack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.35, 0.95), redPushMat);
  heroBoxStack.position.set(313.2, 0.75, 9.8);
  staticGroup.add(heroBoxStack);

  // Rear Checkout Counter + SKECHERS Wall Sign
  const checkoutDesk = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.05, 1.2), skechersNavyMat);
  checkoutDesk.position.set(313.2, 0.60, -4.8);
  staticGroup.add(checkoutDesk);
  const checkoutTop = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.08, 1.35), concreteFloorMat);
  checkoutTop.position.set(313.2, 1.14, -4.8);
  staticGroup.add(checkoutTop);
  [310.5, 315.8].forEach((rx) => {
    const pos = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.08), charcoalSteelMat);
    pos.position.set(rx, 1.38, -4.7);
    staticGroup.add(pos);
  });

  const rearSign = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.8), logoMat);
  rearSign.userData.noMerge = true;
  rearSign.position.set(313.2, 3.30, -6.95);
  staticGroup.add(rearSign);

  // Bright Linear White Ceiling Light Panels (creating crisp luminous store glow visible through glass)
  for (let lz = -3.0; lz <= 12.0; lz += 3.6) {
    [306.5, 313.2, 319.8].forEach((lx) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.42), ceilingStripMat);
      panel.position.set(lx, 4.44, lz);
      staticGroup.add(panel);
    });
  }

  // =========================================================================
  // 5. OPERATING HOURS ROLLING SHUTTER (07:00 - 23:00) & LIGHTING
  // =========================================================================
  const shutterTex = createRollingShutterTexture({
    title: 'SKECHERS  •  OUTLET & FLAGSHIP',
    hoursLabel: 'MỞ CỬA: 07:00 - 23:00',
    accentHex: '#0f2b5b',
    slatDarkHex: '#18181b',
    slatLightHex: '#27272a',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.65, metalness: 0.15 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'skechers_main_door',
      axis: 'x',
      pos: frontGlassZ + 0.16,
      spanCenter: 313.2,
      width: 3.70,
      baseY: 0.08,
      topY: 2.82,
      thickness: 0.08,
    },
    shutterMat,
    charcoalSteelMat
  );

  const porchLight = new THREE.PointLight(0xfef3c7, 4.4, 32.0, 0.95);
  porchLight.position.set(midX, 3.8, 16.5);
  scaledLights.push({ light: porchLight, dayInt: 4.4, nightInt: 18.0, getScale: () => 1.0 - mainShutter.progress });

  const hallLight = new THREE.PointLight(0xf8fafc, 5.8, 36.0, 0.95);
  hallLight.position.set(midX, 4.1, 4.0);
  scaledLights.push({ light: hallLight, dayInt: 5.8, nightInt: 22.0, getScale: () => 1.0 - mainShutter.progress });

  const westWindowLight = new THREE.PointLight(0xfffbeb, 5.0, 28.0, 0.95);
  westWindowLight.position.set(307.2, 3.8, 10.0);
  scaledLights.push({ light: westWindowLight, dayInt: 5.0, nightInt: 19.0, getScale: () => 1.0 - mainShutter.progress });

  const eastWindowLight = new THREE.PointLight(0xfffbeb, 5.0, 28.0, 0.95);
  eastWindowLight.position.set(318.8, 3.8, 10.0);
  scaledLights.push({ light: eastWindowLight, dayInt: 5.0, nightInt: 19.0, getScale: () => 1.0 - mainShutter.progress });

  const rearHallLight = new THREE.PointLight(0xf8fafc, 4.8, 28.0, 0.95);
  rearHallLight.position.set(313.2, 4.0, -2.5);
  scaledLights.push({ light: rearHallLight, dayInt: 4.8, nightInt: 18.0, getScale: () => 1.0 - mainShutter.progress });

  const poolTex = createSkechersGlowPoolTex();
  const porchPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(porchPoolMat);
  const porchPool = new THREE.Mesh(new THREE.PlaneGeometry(23.0, 6.8), porchPoolMat);
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(midX, 0.042, 17.5);
  staticGroup.add(porchPool);

  let doorOpenAmount = 0.0;
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: SkechersNpcController | null,
    externalNpcNearDoor?: boolean
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isSkechersOpenAtHour(h);
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

    // Proximity-activated bi-parting automatic sliding glass entrance doors
    let nearPlayer = false;
    if (playerPos && playerPos.y <= 3.5) {
      const localP = placement
        ? inverseTransformSkechersPointXZ(playerPos.x, playerPos.z, placement)
        : { x: playerPos.x, z: playerPos.z };
      nearPlayer = Math.abs(localP.x - 313.2) <= 3.1 && Math.abs(localP.z - frontGlassZ) <= 3.7;
    }
    const nearNpc = Boolean(npcController?.hasNpcNearDoor()) || Boolean(externalNpcNearDoor);
    const sensorTriggered = nearPlayer || nearNpc;
    const targetDoor = (isOpen || !mainShutter.progress) && sensorTriggered ? 1.0 : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetDoor, Math.min(1, dt * 6.5));
    doorWestLeaf.position.x = westSlideStartX - doorOpenAmount * 1.72;
    doorEastLeaf.position.x = eastSlideStartX + doorOpenAmount * 1.72;

    const litScale = 1.0 - mainShutter.progress;
    logoMat.emissiveIntensity = (0.24 + lampFactor * 0.46) * litScale;
    bladeMat.emissiveIntensity = (0.22 + lampFactor * 0.40) * litScale;
    sconceGlowMat.emissiveIntensity = 0.38 + lampFactor * 0.72;
    ceilingStripMat.emissiveIntensity = (0.42 + lampFactor * 0.48) * litScale;
    sensorLedMat.emissiveIntensity = isOpen ? (sensorTriggered ? 0.95 : 0.35) : 0.05;
  };

  let outputGroup = staticGroup;
  if (placement) {
    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(placement.anchorX, 0, placement.anchorZ);
    pivotGroup.rotation.y = placement.rotationY;
    staticGroup.position.set(-SKECHERS_ORIG_ANCHOR_X, 0, -SKECHERS_ORIG_ANCHOR_Z);
    pivotGroup.add(staticGroup);
    outputGroup = pivotGroup;

    scaledLights.forEach((entry) => {
      const tp = transformSkechersPointXZ(entry.light.position.x, entry.light.position.z, placement);
      entry.light.position.x = tp.x;
      entry.light.position.z = tp.z;
    });
  }

  return {
    staticGroup: outputGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => mainShutter.progress,
    update,
  };
}

// =========================================================================
// SKECHERS STORE NPC CONTROLLER (3 STAFF + 9 ROTATING SHOPPERS + 2 PROMENADE STROLLERS)
// =========================================================================
const SKECHERS_PROFILES = [
  { shirt: 0x0284c7, pants: 0x1e293b, hair: 0x111827, skinHex: '#fbe0c8' },
  { shirt: 0xdc2626, pants: 0x0f172a, hair: 0x2c1a10, skinHex: '#f5c7a3' },
  { shirt: 0xe2e8f0, pants: 0x334155, hair: 0x18181b, skinHex: '#fbe0c8' },
  { shirt: 0x059669, pants: 0x1e293b, hair: 0x3b2314, skinHex: '#e8b48e' },
  { shirt: 0xf59e0b, pants: 0x111827, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0x7c3aed, pants: 0x0f172a, hair: 0x291c15, skinHex: '#fbe0c8' },
  { shirt: 0xec4899, pants: 0x1e293b, hair: 0x1e1b4b, skinHex: '#f5c7a3' },
  { shirt: 0x334155, pants: 0x09090b, hair: 0x4a2c18, skinHex: '#fbe0c8' },
];

type SkechersPhase =
  | 'respawn_wait'
  | 'walk_to_browse'
  | 'browsing'
  | 'walk_to_checkout'
  | 'at_checkout'
  | 'walk_leave';

interface SkechersActor {
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
  bagGroup: THREE.Group;
  kind: 'staff' | 'shopper' | 'stroller';
  homePos: THREE.Vector3;
  homeYaw: number;
  seed: number;
  walkPhase: number;
  speed: number;
  profileIdx: number;
  phase: SkechersPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  stateTimer: number;
  waitYaw: number;
  browseSpotIdx: number;
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

export class SkechersNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actorContainer = new THREE.Group();
  private actors: SkechersActor[] = [];
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

  private readonly browseSpots = [
    { pos: new THREE.Vector3(307.2, 0.08, 12.2), yaw: Math.PI }, // Men's Front Window Rack
    { pos: new THREE.Vector3(318.6, 0.08, 12.2), yaw: Math.PI }, // Women's Boots Window Rack
    { pos: new THREE.Vector3(307.2, 0.08, 7.2), yaw: Math.PI }, // Running Gondola
    { pos: new THREE.Vector3(318.6, 0.08, 7.2), yaw: Math.PI }, // Kids & Boots Gondola
    { pos: new THREE.Vector3(313.2, 0.08, 7.0), yaw: Math.PI }, // Center Try-On Bench
    { pos: new THREE.Vector3(303.9, 0.08, 3.0), yaw: -Math.PI * 0.5 }, // West Shoebox Wall
    { pos: new THREE.Vector3(322.1, 0.08, 3.0), yaw: Math.PI * 0.5 }, // East Shoebox Wall
  ];

  constructor(private helpers: HospitalCharacterHelpers, placement?: SkechersPlacementConfig) {
    this.rootGroup.userData.noMerge = true;
    this.actorContainer.userData.noMerge = true;
    this.rootGroup.add(this.actorContainer);
    if (placement) {
      this.rootGroup.position.set(placement.anchorX, 0, placement.anchorZ);
      this.rootGroup.rotation.y = placement.rotationY;
      this.actorContainer.position.set(-SKECHERS_ORIG_ANCHOR_X, 0, -SKECHERS_ORIG_ANCHOR_Z);
    }
    const seedOffset = placement?.seedOffset ?? 0;

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x0f2b5b, roughness: 0.7 });
    const bagBodyMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
    const bagStripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

    this.profileMats = SKECHERS_PROFILES.map((p) => ({
      shirt: new THREE.MeshStandardMaterial({ color: p.shirt, roughness: 0.72 }),
      pants: new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.78 }),
      hair: new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.85 }),
      faceTex: helpers.createFaceTexture('happy', p.skinHex),
    }));

    const createActorRig = (
      kind: 'staff' | 'shopper' | 'stroller',
      profileIdx: number,
      x: number,
      y: number,
      z: number,
      yaw: number,
      speed = 1.32
    ): SkechersActor => {
      const id = this.actors.length;
      const pm = this.profileMats[profileIdx % this.profileMats.length];
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.set(0, 0.80, 0);
      root.add(hipsGroup);

      const torsoMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.54, 0.24),
        kind === 'staff' ? staffMat : pm.shirt
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
        kind === 'staff' ? staffMat : pm.shirt
      );
      leftArmMesh.position.y = -0.20;
      leftArm.add(leftArmMesh);
      hipsGroup.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.27, 0.52, 0);
      const rightArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.44, 0.12),
        kind === 'staff' ? staffMat : pm.shirt
      );
      rightArmMesh.position.y = -0.20;
      rightArm.add(rightArmMesh);
      hipsGroup.add(rightArm);

      // Skechers Blue & White Shopping Bag
      const bagGroup = new THREE.Group();
      bagGroup.position.set(0.04, -0.52, 0.02);
      const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.30, 0.26), bagBodyMat);
      bagGroup.add(bagMesh);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.20), bagStripeMat);
      bagGroup.add(stripe);
      bagGroup.visible = false;
      rightArm.add(bagGroup);

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
      this.actorContainer.add(root);

      const seed = (id + seedOffset) * 1.63;
      const spec =
        kind === 'staff'
          ? id <= 1
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(id + 191 + seedOffset)
          : kind === 'stroller'
            ? pickOutsideNpcModel(id + 203 + seedOffset)
            : pickShopCustomerModel(id + 201 + seedOffset);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: root,
        fallbackMeshes: [hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: kind === 'staff' ? (id <= 1 ? 'Checkout' : 'Idle') : kind === 'stroller' ? 'Walk' : 'Idle',
        phaseOffset: seed * 0.37,
      });

      const actor: SkechersActor = {
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
        bagGroup,
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
        browseSpotIdx: id % this.browseSpots.length,
        strollDir: id % 2 === 0 ? 1 : -1,
        strollPauseTimer: 0,
        strollNextPause: 5.0 + (id % 3) * 3.0,
        exiting: false,
        exitDone: false,
        exitWaypoints:
          kind === 'staff'
            ? [
                new THREE.Vector3(313.2, 0.08, -1.0),
                new THREE.Vector3(313.2, 0.08, 12.0),
                new THREE.Vector3(313.2, 0.02, 17.5),
                new THREE.Vector3(299.5 + id * 1.5, 0.02, 18.2),
              ]
            : undefined,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      };
      this.actors.push(actor);
      return actor;
    };

    // 1. Three Skechers Store Associates (Cashier + Footwear Floor Specialists)
    createActorRig('staff', 0, 311.2, 0.08, -6.2, 0);
    createActorRig('staff', 2, 315.2, 0.08, -6.2, 0);
    createActorRig('staff', 4, 319.8, 0.08, 8.2, -Math.PI * 0.45);

    // 2. Nine Dynamic Rotating Shoppers
    for (let i = 0; i < 9; i++) {
      createActorRig('shopper', i % this.profileMats.length, 313.2, 0.02, 18.0, Math.PI, 1.28 + (i % 3) * 0.08);
    }

    // 3. Two Promenade Sidewalk Walkers passing Phúc Long & Skechers
    createActorRig('stroller', 1, 305.5, 0.02, 18.8, Math.PI * 0.5, 1.24);
    createActorRig('stroller', 6, 321.5, 0.02, 17.6, -Math.PI * 0.5, 1.18);
  }

  private applyShopperProfile(a: SkechersActor, nextIdx: number) {
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

  private assignNewShopperArrival(a: SkechersActor, rotateProfile: boolean) {
    if (rotateProfile) {
      this.applyShopperProfile(a, a.profileIdx + 3 + (a.id % 4));
    }
    a.bagGroup.visible = false;
    a.leftLeg.rotation.x = 0;
    a.rightLeg.rotation.x = 0;

    const fromEast = this.nextSpawnSide++ % 2 === 0;
    const spawnX = fromEast ? 327.8 : 299.2;
    const spawnZ = 17.6 + (a.id % 3) * 0.45;
    a.root.position.set(spawnX, 0.02, spawnZ);
    a.root.visible = true;

    a.browseSpotIdx = (a.browseSpotIdx + 1) % this.browseSpots.length;
    const spot = this.browseSpots[a.browseSpotIdx];
    a.pathQueue = [
      new THREE.Vector3(313.2, 0.02, 16.8),
      new THREE.Vector3(313.2, 0.08, 12.2),
      new THREE.Vector3(313.2, 0.08, 8.2),
      spot.pos.clone(),
    ];
    a.pathIdx = 0;
    a.waitYaw = spot.yaw;
    a.phase = 'walk_to_browse';
    a.glbHandle.setAnimState('Walk');
  }

  private snapClosed() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.root.visible = false;
      a.exiting = false;
      a.exitDone = true;
      a.bagGroup.visible = false;
      a.glbHandle.setAnimState('Idle');
    }
  }

  private reopen() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = false;

    let shopperIdx = 0;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = false;
      a.exitDone = false;
      a.exitRef.idx = 0;

      if (a.kind === 'staff') {
        a.root.visible = true;
        a.root.position.copy(a.homePos);
        a.root.rotation.y = a.homeYaw;
        a.glbHandle.setAnimState(a.id <= 1 ? 'Checkout' : 'Idle');
        continue;
      }

      if (a.kind === 'stroller') {
        a.root.visible = true;
        a.root.position.copy(a.homePos);
        a.root.rotation.y = a.homeYaw;
        a.bagGroup.visible = i % 2 === 1;
        a.glbHandle.setAnimState('Walk');
        continue;
      }

      if (shopperIdx < 5) {
        const spot = this.browseSpots[(shopperIdx * 2) % this.browseSpots.length];
        a.browseSpotIdx = (shopperIdx * 2) % this.browseSpots.length;
        a.bagGroup.visible = false;
        a.root.visible = true;
        a.root.position.copy(spot.pos);
        a.root.rotation.y = spot.yaw;
        a.waitYaw = spot.yaw;
        a.phase = 'browsing';
        a.stateTimer = 3.5 + shopperIdx * 2.5;
        a.glbHandle.setAnimState('Idle');
      } else {
        a.root.visible = false;
        a.phase = 'respawn_wait';
        a.stateTimer = (shopperIdx - 5) * 1.4;
        a.glbHandle.setAnimState('Idle');
      }
      shopperIdx++;
    }
  }

  private beginClosing() {
    this.closingActive = true;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = true;
      a.exitRef.idx = 0;

      if (a.kind === 'staff') {
        a.exitDone = false;
        a.glbHandle.setAnimState('Walk');
        continue;
      }
      if (a.kind === 'stroller') {
        a.exitDone = true;
        a.root.visible = false;
        a.glbHandle.setAnimState('Idle');
        continue;
      }
      if (!a.root.visible || a.phase === 'respawn_wait' || a.root.position.z > 15.6) {
        a.exitDone = true;
        a.root.visible = false;
        a.glbHandle.setAnimState('Idle');
        continue;
      }

      a.exitDone = false;
      const leaveEast = i % 2 === 0;
      a.exitWaypoints = [
        new THREE.Vector3(313.2, 0.08, 10.5),
        new THREE.Vector3(313.2, 0.02, 16.8),
        new THREE.Vector3(leaveEast ? 327.8 : 299.2, 0.02, 18.2),
      ];
      a.glbHandle.setAnimState('Walk');
    }
  }

  public hasNpcNearDoor(): boolean {
    if (this.fullyClosedAndEmpty) return false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible || a.kind === 'stroller') continue;
      const p = a.root.position;
      if (p.x >= 311.0 && p.x <= 315.4 && p.z >= 11.4 && p.z <= 17.6) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: SkechersActor, dt: number): boolean {
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
    a.rightArm.rotation.x = a.bagGroup.visible ? 0.14 : swing * 0.55;
    return false;
  }

  public update(delta: number, rawHour = 10.0) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isSkechersOpenAtHour(h);

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
          new THREE.Vector3(313.2, 0.08, 10.5),
          new THREE.Vector3(313.2, 0.02, 16.8),
          new THREE.Vector3(299.2 + i * 2.0, 0.02, 18.2),
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
          a.glbHandle.setAnimState('Idle');
        } else {
          a.glbHandle.setAnimState('Walk');
        }
        continue;
      }

      if (a.kind === 'staff') {
        a.root.visible = true;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.3 + a.seed) * 0.25;
        a.rightArm.rotation.x = -0.18 + Math.sin(this.timer * 2.0 + a.seed) * 0.14;
        a.glbHandle.setAnimState(a.id <= 1 ? 'Checkout' : 'Idle');
        continue;
      }

      if (a.kind === 'stroller') {
        a.root.visible = true;
        if ((a.strollPauseTimer ?? 0) > 0) {
          a.strollPauseTimer! -= dt;
          a.glbHandle.setAnimState('Idle');
          let diff = Math.PI - a.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.root.rotation.y += diff * Math.min(1, dt * 6.5);
          a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
          a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
          a.headMesh.rotation.y = Math.sin(this.timer * 1.5 + a.seed) * 0.22;
        } else {
          a.glbHandle.setAnimState('Walk');
          const dir = a.strollDir ?? 1;
          a.root.position.x += dir * a.speed * dt;
          const targetYaw = dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          let diff = targetYaw - a.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.root.rotation.y += diff * Math.min(1, dt * 8.0);

          a.walkPhase += dt * 5.6;
          const swing = Math.sin(a.walkPhase) * 0.38;
          a.leftLeg.rotation.x = swing;
          a.rightLeg.rotation.x = -swing;
          a.leftArm.rotation.x = -swing * 0.52;
          a.rightArm.rotation.x = a.bagGroup.visible ? 0.14 : swing * 0.52;

          a.strollNextPause = (a.strollNextPause ?? 4.0) - dt;
          if (a.strollNextPause <= 0 && a.root.position.x >= 305.0 && a.root.position.x <= 321.0) {
            a.strollPauseTimer = 2.6 + (a.id % 3) * 0.8;
            a.strollNextPause = 9.0 + (a.id % 3) * 2.5;
          }

          if (dir > 0 && a.root.position.x > 328.5) {
            a.strollDir = -1;
            this.applyShopperProfile(a, a.profileIdx + 3);
          } else if (dir < 0 && a.root.position.x < 298.8) {
            a.strollDir = 1;
            this.applyShopperProfile(a, a.profileIdx + 5);
          }
        }
        continue;
      }

      if (a.phase === 'respawn_wait') {
        a.root.visible = false;
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          this.assignNewShopperArrival(a, true);
        }
        continue;
      }

      a.root.visible = true;

      if (a.phase === 'walk_to_browse') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'browsing';
          a.stateTimer = 5.5 + (a.id % 4) * 2.0;
          a.glbHandle.setAnimState('Idle');
        }
      } else if (a.phase === 'browsing') {
        a.glbHandle.setAnimState('Idle');
        let diff = a.waitYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 8.0);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightArm.rotation.x = -0.35 + Math.sin(this.timer * 2.2 + a.seed) * 0.16;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.4 + a.seed) * 0.26;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          const payX = 310.8 + (a.id % 4) * 1.5;
          a.pathQueue = [
            new THREE.Vector3(313.2, 0.08, 1.5),
            new THREE.Vector3(payX, 0.08, -2.9),
          ];
          a.pathIdx = 0;
          a.waitYaw = Math.PI; // Face -Z toward rear checkout desk
          a.phase = 'walk_to_checkout';
          a.glbHandle.setAnimState('Walk');
        }
      } else if (a.phase === 'walk_to_checkout') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'at_checkout';
          a.stateTimer = 3.0 + (a.id % 3) * 0.8;
          a.glbHandle.setAnimState('Checkout');
        }
      } else if (a.phase === 'at_checkout') {
        a.glbHandle.setAnimState('Checkout');
        let diff = a.waitYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 8.0);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightArm.rotation.x = -0.40 + Math.sin(this.timer * 2.6 + a.seed) * 0.12;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          a.bagGroup.visible = true;
          const leaveEast = (a.id + Math.floor(this.timer)) % 2 === 0;
          a.pathQueue = [
            new THREE.Vector3(313.2, 0.08, 2.0),
            new THREE.Vector3(313.2, 0.08, 12.2),
            new THREE.Vector3(313.2, 0.02, 16.8),
            new THREE.Vector3(leaveEast ? 327.8 : 299.2, 0.02, 18.2),
          ];
          a.pathIdx = 0;
          a.phase = 'walk_leave';
          a.glbHandle.setAnimState('Walk');
        }
      } else if (a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.root.visible = false;
          a.bagGroup.visible = false;
          a.phase = 'respawn_wait';
          a.stateTimer = 1.4 + (a.id % 4) * 0.8;
          a.glbHandle.setAnimState('Idle');
        }
      }
    }

    if (this.closingActive && allCleared) {
      this.closingActive = false;
      this.fullyClosedAndEmpty = true;
    }
  }
}
