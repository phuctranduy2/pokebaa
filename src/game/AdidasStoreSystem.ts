import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isAdidasOpenAtHour,
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

export interface AdidasStoreBuildResult {
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
    npcController?: AdidasNpcController | null,
    externalNpcNearDoor?: boolean
  ) => void;
}

// Positioned directly East (screen-left from Boulevard) of Phê La Coffee (X = 274.0..296.0)
// Facing North (-Z) onto East Leg Boulevard SE Sidewalk (Z = 37.2..42.5)
// Plot Span: X = 299.2 .. 325.2 (26.0m wide), Z = 42.5 .. 68.5 (26.0m deep)
// Arcade Sidewalk Threshold: Z = 42.5 .. 44.2
// Main Flagship Showroom:   Z = 44.2 .. 68.5
export const ADIDAS_COLLIDERS: IntersectionColliderBox[] = [
  // Side and rear structural perimeter walls
  { minX: 298.9, maxX: 299.6, minZ: 43.8, maxZ: 68.6, floor: 1 }, // West Wall
  { minX: 324.8, maxX: 325.5, minZ: 43.8, maxZ: 68.6, floor: 1 }, // East Wall
  { minX: 299.0, maxX: 325.4, minZ: 68.0, maxZ: 68.8, floor: 1 }, // South Rear Wall

  // Front Structural Pier (East corner housing architectural wing) & Storefront Glass Curtain Wall
  // Central Automatic Sliding Glass Door Aperture Open: X = 311.4 .. 315.0, Z = 44.2
  { minX: 299.2, maxX: 311.4, minZ: 43.85, maxZ: 44.55, floor: 1 }, // Storefront Right Wing (from Boulevard view)
  { minX: 315.0, maxX: 325.2, minZ: 43.85, maxZ: 44.55, floor: 1 }, // Storefront Left Wing & Concrete Lobby Pier

  // West/Right Wing (Originals Art Studio & Apparel Zone): X = 300.6 .. 308.6
  { minX: 300.6, maxX: 308.2, minZ: 47.2, maxZ: 50.6, floor: 1 }, // Window Art Easel, Lifestyle Table & Chairs
  { minX: 301.2, maxX: 308.4, minZ: 53.6, maxZ: 55.2, floor: 1 }, // Apparel Rack Row 1
  { minX: 301.2, maxX: 308.4, minZ: 57.6, maxZ: 59.2, floor: 1 }, // Apparel Rack Row 2

  // East/Left Wing (Editorial Showcase, Footwear Wall & Try-On Islands): X = 316.0 .. 324.2
  { minX: 316.0, maxX: 323.5, minZ: 47.4, maxZ: 49.8, floor: 1 }, // Campaign Lightbox & Mannequin Plinth
  { minX: 317.4, maxX: 320.4, minZ: 52.8, maxZ: 59.2, floor: 1 }, // Footwear Center Display & Bench Island

  // Architectural Escalator Feature & Checkout Cashwrap
  { minX: 315.8, maxX: 318.2, minZ: 60.5, maxZ: 66.2, floor: 1 }, // Sculptural Escalator Feature
  { minX: 304.2, maxX: 312.6, minZ: 64.2, maxZ: 66.5, floor: 1 }, // Rear Checkout Cashwrap Counter
];

export interface AdidasPlacementConfig {
  anchorX: number;
  anchorZ: number;
  rotationY: number;
  seedOffset?: number;
}

const ADIDAS_ORIG_ANCHOR_X = 312.2;
const ADIDAS_ORIG_ANCHOR_Z = 42.5;

/**
 * ADIDAS — Chi nhánh Đường Bạch Đằng (kế bên SKECHERS Bạch Đằng):
 * - Footprint: X = -50.4 .. -24.4 (26.0m wide, 1.4m West of SKECHERS at X = -23.0)
 * - Depth:     Z = -104.0 .. -78.0 (arcade threshold flush with Đường Bạch Đằng South sidewalk)
 * - Facing:    North (-Z) toward Sông Hàn & Đường Bạch Đằng (rotationY = 0)
 * - Doorway:   X = -38.2 .. -34.6 (center X = -36.4), Z = -102.3
 */
export const ADIDAS_BACH_DANG_PLACEMENT: AdidasPlacementConfig = {
  anchorX: -37.4,
  anchorZ: -104.0,
  rotationY: 0,
  seedOffset: 97,
};

function transformAdidasPointXZ(
  ox: number,
  oz: number,
  placement: AdidasPlacementConfig
): { x: number; z: number } {
  const lx = ox - ADIDAS_ORIG_ANCHOR_X;
  const lz = oz - ADIDAS_ORIG_ANCHOR_Z;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: placement.anchorX + lx * c + lz * s,
    z: placement.anchorZ - lx * s + lz * c,
  };
}

function inverseTransformAdidasPointXZ(
  wx: number,
  wz: number,
  placement: AdidasPlacementConfig
): { x: number; z: number } {
  const dx = wx - placement.anchorX;
  const dz = wz - placement.anchorZ;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: ADIDAS_ORIG_ANCHOR_X + dx * c - dz * s,
    z: ADIDAS_ORIG_ANCHOR_Z + dx * s + dz * c,
  };
}

export function createTransformedAdidasColliders(
  placement: AdidasPlacementConfig
): IntersectionColliderBox[] {
  return ADIDAS_COLLIDERS.map((box) => {
    const p1 = transformAdidasPointXZ(box.minX, box.minZ, placement);
    const p2 = transformAdidasPointXZ(box.maxX, box.maxZ, placement);
    const p3 = transformAdidasPointXZ(box.minX, box.maxZ, placement);
    const p4 = transformAdidasPointXZ(box.maxX, box.minZ, placement);
    return {
      minX: Math.min(p1.x, p2.x, p3.x, p4.x),
      maxX: Math.max(p1.x, p2.x, p3.x, p4.x),
      minZ: Math.min(p1.z, p2.z, p3.z, p4.z),
      maxZ: Math.max(p1.z, p2.z, p3.z, p4.z),
      floor: box.floor,
    };
  });
}

export const ADIDAS_BACH_DANG_COLLIDERS: IntersectionColliderBox[] =
  createTransformedAdidasColliders(ADIDAS_BACH_DANG_PLACEMENT);

// High-definition perforated crimson architectural metal crown (matching reference Image 2)
function createAdidasCrimsonCrownTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#7c181e');
  grad.addColorStop(0.5, '#8c1b22');
  grad.addColorStop(1, '#5d1015');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical structural seam panels
  ctx.strokeStyle = 'rgba(20, 4, 6, 0.45)';
  ctx.lineWidth = 4;
  for (let px = 0; px < w; px += 128) {
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }

  // Geometric triangular/truss perforations punched through metallic panel
  ctx.fillStyle = '#190406';
  const cols = 48;
  const rows = 9;
  const cw = w / cols;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const cx = (col + 0.5) * cw;
      const cy = (r + 0.5) * rh;
      ctx.beginPath();
      if ((r + col) % 2 === 0) {
        ctx.moveTo(cx, cy - rh * 0.34);
        ctx.lineTo(cx + cw * 0.36, cy + rh * 0.32);
        ctx.lineTo(cx - cw * 0.36, cy + rh * 0.32);
      } else {
        ctx.moveTo(cx - cw * 0.36, cy - rh * 0.32);
        ctx.lineTo(cx + cw * 0.36, cy - rh * 0.32);
        ctx.lineTo(cx, cy + rh * 0.34);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = 4;
  return tex;
}

// Architectural granite stone pavers for arcade & storefront promenade
function createAdidasPaverTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9b958e';
  ctx.fillRect(0, 0, w, h);

  const cols = 8;
  const rows = 16;
  const cw = w / cols;
  const rh = h / rows;
  let seed = 17;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const v = Math.floor(142 + rnd() * 24);
      ctx.fillStyle = `rgb(${v + 4}, ${v}, ${v - 5})`;
      ctx.fillRect(col * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.anisotropy = 4;
  return tex;
}

// Crisp fascia typography: "THE BRAND WITH THE 3 STRIPES"
function createAdidas3StripesWordTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#09090b';
  ctx.font = '800 50px "Georgia", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE BRAND WITH THE 3 STRIPES', w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Small lobby utility & parking signage plaques on East concrete wing (matching photo left side)
function createEastWingSignTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  // Parking badge top
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(28, 30, 82, 82);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', 69, 73);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FLAGSHIP', 124, 56);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('LOBBY • 2F', 124, 90);

  // Directory lines
  const rows = ['1F  ORIGINALS STUDIO', '1F  FOOTWEAR WALL', '2F  PERFORMANCE LAB', '2F  MEMBERS LOUNGE'];
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 18px system-ui, sans-serif';
  rows.forEach((txt, idx) => {
    ctx.fillText(txt, 28, 168 + idx * 46);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.fillRect(28, 188 + idx * 46, w - 56, 2);
    ctx.fillStyle = '#f8fafc';
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Illuminated Storefront Window Ticker Banner ("WE GAVE THE WORLD AN ORIGINAL...")
function createAdidasTickerTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 96;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 42px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    'WE GAVE THE WORLD AN ORIGINAL  ///  YOU GAVE US A THOUSAND BACK  ///  ADIDAS ORIGINALS',
    w * 0.5,
    h * 0.54
  );

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Abstract vibrant art mural + campaign poster for storefront showcases (matching Image 2)
function createAdidasArtworkPosterTex(variant: 'originals' | 'editorial' | 'easel'): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  if (variant === 'originals' || variant === 'easel') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, variant === 'easel' ? '#f59e0b' : '#b45309');
    grad.addColorStop(0.45, '#e2e8f0');
    grad.addColorStop(1, variant === 'easel' ? '#047857' : '#1e3a8a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const cols = ['#111827', '#f59e0b', '#047857', '#f8fafc', '#dc2626', '#2563eb'];
    let seed = variant === 'easel' ? 91 : 31;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 85; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.globalAlpha = 0.35 + rnd() * 0.50;
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, 8 + rnd() * 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(9, 9, 11, 0.78)';
    ctx.fillRect(0, h - 78, w, 78);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillText(variant === 'easel' ? 'FINGER PAINTING  •  2026' : 'ORIGINALS STUDIO  ///  SS', 24, h - 30);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.6, '#1e3a8a');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Architectural white graphic arches behind campaign headline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(w * 0.75, h * 0.55, 130, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px system-ui, sans-serif';
    ctx.fillText('ADIZERO', 32, 76);
    ctx.fillText('SAMBA OG', 32, 132);
    ctx.fillStyle = '#86efac';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('FOOTBALL  •  RUNNING  •  ORIGINALS', 32, 184);

    // Crisp 3 slanted white bars bottom right
    ctx.save();
    ctx.translate(w - 138, h - 42);
    ctx.rotate(-0.52);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(i * 28, -(24 + i * 24), 18, 24 + i * 24);
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAdidasSlidingDoorDecalTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.fillRect(0, 232, w, 40);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 26px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('adidas', w * 0.5, 252);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAdidasRearBrandTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.5 - 180, 148);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(i * 44, 0);
    ctx.transform(1, 0, -0.52, 1, 0, 0);
    const bh = 36 + i * 32;
    ctx.fillRect(0, -bh, 28, bh);
    ctx.restore();
  }
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 108px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('adidas', w * 0.5 - 30, 148);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAdidasGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 250, 235, 0.36)');
  grad.addColorStop(0.55, 'rgba(226, 232, 240, 0.14)');
  grad.addColorStop(1, 'rgba(226, 232, 240, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Helper: Crisp 3D Extruded Adidas Performance 3-Bar Mountain Logo with flat horizontal bottom + dark shadow bevel!
function buildAdidas3BarSculptedLogo(
  scale: number,
  faceMat: THREE.Material,
  shadowSideMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.scale.setScalar(scale);

  // Facing -Z (viewed from Boulevard): screen-left = +X, screen-right = -X
  // Three ascending slanted parallelograms whose bases sit flush along y = 0:
  const barSpecs = [
    { baseX: 0.42, width: 0.25, height: 0.28 },
    { baseX: 0.00, width: 0.25, height: 0.56 },
    { baseX: -0.42, width: 0.25, height: 0.86 },
  ];
  const leanDx = 0.56; // top leans toward screen-left (+X) relative to vertical height

  barSpecs.forEach((b) => {
    const shape = new THREE.Shape();
    const x0 = b.baseX - b.width * 0.5;
    const x1 = b.baseX + b.width * 0.5;
    const topShift = b.height * leanDx;
    shape.moveTo(x0, 0);
    shape.lineTo(x1, 0);
    shape.lineTo(x1 + topShift, b.height);
    shape.lineTo(x0 + topShift, b.height);
    shape.closePath();

    // Dark recessed architectural shadow backing so crisp white pops day & night!
    const backingGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
    const backingMesh = new THREE.Mesh(backingGeo, shadowSideMat);
    backingMesh.scale.set(1.06, 1.04, 1.0);
    backingMesh.position.set(-0.01, -0.01, -0.02);
    grp.add(backingMesh);

    const frontGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
    const frontMesh = new THREE.Mesh(frontGeo, faceMat);
    frontMesh.position.set(0, 0, -0.09);
    grp.add(frontMesh);
  });

  return grp;
}

// Display Mannequin dressed in Adidas jersey/jacket & shorts
function buildAdidasMannequin(
  x: number,
  y: number,
  z: number,
  yaw: number,
  topMat: THREE.Material,
  bottomMat: THREE.Material,
  plinthMat: THREE.Material,
  shoeMat: THREE.Material,
  hasCap = false,
  capMat?: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.14, 16), plinthMat);
  plinth.position.y = 0.07;
  grp.add(plinth);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), plinthMat);
  head.position.y = 1.66;
  grp.add(head);

  if (hasCap && capMat) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 12), capMat);
    cap.position.y = 1.74;
    grp.add(cap);
  }

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.20), topMat);
  torso.position.y = 1.24;
  grp.add(torso);

  [-0.25, 0.25].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.46, 0.10), topMat);
    arm.position.set(ax, 1.22, 0);
    grp.add(arm);
  });

  [-0.10, 0.10].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.72, 0.13), bottomMat);
    leg.position.set(lx, 0.54, 0);
    grp.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.24), shoeMat);
    shoe.position.set(lx, 0.18, 0.04);
    grp.add(shoe);
  });

  return grp;
}

// Apparel Hanging Rack with Adidas track jackets & hoodies
function buildApparelRack(
  x: number,
  y: number,
  z: number,
  width: number,
  frameMat: THREE.Material,
  garmentMats: THREE.Material[]
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  [-width * 0.48, width * 0.48].forEach((rx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.62, 8), frameMat);
    post.position.set(rx, 0.81, 0);
    grp.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.60), frameMat);
    foot.position.set(rx, 0.02, 0);
    grp.add(foot);
  });

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width, 8), frameMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.56, 0);
  grp.add(bar);

  const count = Math.floor(width / 0.30);
  for (let i = 0; i < count; i++) {
    const gx = -width * 0.42 + (i / Math.max(1, count - 1)) * width * 0.84;
    const mat = garmentMats[i % garmentMats.length];
    const garment = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.76, 0.44), mat);
    garment.position.set(gx, 1.15, 0);
    grp.add(garment);
  }

  return grp;
}

export function createAdidasStoreStructure(
  placement?: AdidasPlacementConfig
): AdidasStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = 299.2;
  const maxX = 325.2;
  const midX = (minX + maxX) * 0.5; // 312.2 (26.0m wide)
  const frontGlassZ = 44.2; // Recessed shaded arcade under fascia beam
  const backZ = 68.5;
  const midHallZ = (frontGlassZ + backZ) * 0.5; // 56.35

  // Architectural Flagship Materials
  const limestoneFloorMat = new THREE.MeshStandardMaterial({ color: 0xf2ede4, roughness: 0.68 });
  const paverTex = createAdidasPaverTex();
  const arcadeFloorMat = new THREE.MeshStandardMaterial({ map: paverTex, roughness: 0.84 });
  // Satin architectural off-white fascia so pure bright white illuminated logos pop cleanly!
  const satinFasciaMat = new THREE.MeshStandardMaterial({ color: 0xe4e1da, roughness: 0.50 });
  const pureWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38 });
  const archConcreteMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.72 });
  // Warm champagne-bronze aluminum fins (matching real building's warm metallic reflections!)
  const louverBronzeMat = new THREE.MeshStandardMaterial({ color: 0x9e9384, roughness: 0.34, metalness: 0.65 });
  const louverFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.55 });
  const charcoalSteelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.42, metalness: 0.48 });
  const brushedAlumMat = new THREE.MeshStandardMaterial({ color: 0xdbe0e6, roughness: 0.26, metalness: 0.76 });
  const warmOakMat = new THREE.MeshStandardMaterial({ color: 0xc59666, roughness: 0.62 });
  const interiorWarmWallMat = new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.82 });
  const adidasGreenMat = new THREE.MeshStandardMaterial({ color: 0x05884c, roughness: 0.62 });
  const adidasBlackClothMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72 });
  const adidasCreamClothMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.75 });
  const adidasCobaltMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.68 });
  const adidasRedAccentMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });
  const crimsonCrownMat = new THREE.MeshStandardMaterial({
    map: createAdidasCrimsonCrownTex(),
    roughness: 0.62,
    metalness: 0.30,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    transparent: true,
    opacity: 0.13,
    roughness: 0.22,
    metalness: 0.10,
  });
  const upperWindowGlassMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0xfde68a,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.32,
    roughness: 0.22,
    metalness: 0.20,
  });

  // Backlit white LED mats (crisp contrast + balanced glow without harsh whiteout)
  const facadeLogoWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.32,
    roughness: 0.25,
  });
  const fasciaCoveLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.32,
    roughness: 0.35,
  });
  const shelfGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 0.30,
    roughness: 0.4,
  });
  const sensorLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.40,
    roughness: 0.35,
  });

  // =========================================================================
  // 1. FLOOR SLABS, GRANITE STONE ARCADE APRON & STRUCTURAL SHELL
  // =========================================================================
  const interiorSlab = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.16, 24.4), limestoneFloorMat);
  interiorSlab.position.set(midX, 0.0, 56.35);
  staticGroup.add(interiorSlab);

  // Granite Paver Apron spanning Arcade + Front Sidewalk edge (trimmed to lot line when placed on Bạch Đằng)
  const arcadeSlab = placement
    ? new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.04, 1.85), arcadeFloorMat)
    : new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.04, 7.0), arcadeFloorMat);
  arcadeSlab.position.set(midX, 0.018, placement ? 43.38 : 40.75);
  staticGroup.add(arcadeSlab);

  // Adidas 3-stripe recessed black stone inlay leading into the lobby
  [-0.55, 0, 0.55].forEach((ix) => {
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 11.5), charcoalSteelMat);
    inlay.position.set(313.2 + ix, 0.082, 50.8);
    staticGroup.add(inlay);
  });

  // Side walls, rear wall & interior ceiling slabs (1F Ceiling + 2F Upper Slab + Top Roof)
  [minX + 0.22, maxX - 0.22].forEach((wx) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.44, 12.8, 24.5), interiorWarmWallMat);
    wall.position.set(wx, 6.4, midHallZ);
    staticGroup.add(wall);
  });
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(25.84, 12.8, 0.46), charcoalSteelMat);
  rearWall.position.set(midX, 6.4, backZ - 0.23);
  staticGroup.add(rearWall);

  const groundCeiling = new THREE.Mesh(new THREE.BoxGeometry(25.6, 0.24, 24.0), interiorWarmWallMat);
  groundCeiling.position.set(midX, 4.38, midHallZ);
  staticGroup.add(groundCeiling);

  const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(26.2, 0.35, 25.8), charcoalSteelMat);
  upperRoof.position.set(midX, 12.75, 55.6);
  staticGroup.add(upperRoof);

  // =========================================================================
  // 2. SATIN ARCHITECTURAL FASCIA, COVE LED & HIGH-CONTRAST 3-BAR LOGO (Y = 4.35..5.45)
  // =========================================================================
  // Left concrete service/elevator lobby wing on far East corner (screen-left = +X = 322.2..325.2)
  const eastArcadeWing = new THREE.Mesh(new THREE.BoxGeometry(3.0, 4.36, 2.0), archConcreteMat);
  eastArcadeWing.position.set(323.7, 2.18, 43.5);
  staticGroup.add(eastArcadeWing);

  // Framed stainless-glass elevator vestibule entrance + illuminated interior backdrop
  const lobbyBack = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.26, 0.04), fasciaCoveLedMat);
  lobbyBack.position.set(323.5, 1.24, 42.51);
  staticGroup.add(lobbyBack);
  const lobbyGlass = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.26, 0.04), glassMat);
  lobbyGlass.position.set(323.5, 1.24, 42.47);
  staticGroup.add(lobbyGlass);
  [-0.57, 0.57].forEach((fx) => {
    const stile = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.38, 0.08), brushedAlumMat);
    stile.position.set(323.5 + fx, 1.24, 42.48);
    staticGroup.add(stile);
  });
  [0.09, 2.39].forEach((fy) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.08), brushedAlumMat);
    rail.position.set(323.5, fy, 42.48);
    staticGroup.add(rail);
  });

  // Parking & Flagship Directory plaque on East wing (matching photo!)
  const wingSignTex = createEastWingSignTex();
  const wingSignMat = new THREE.MeshStandardMaterial({
    map: wingSignTex,
    emissive: 0xffffff,
    emissiveMap: wingSignTex,
    emissiveIntensity: 0.16,
    roughness: 0.4,
  });
  const wingSign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.92), wingSignMat);
  wingSign.userData.noMerge = true;
  wingSign.rotation.y = Math.PI;
  wingSign.position.set(324.48, 2.15, 42.47);
  staticGroup.add(wingSign);

  // Main Satin Architectural Fascia Beam spanning full 26m storefront
  const fasciaBeam = new THREE.Mesh(new THREE.BoxGeometry(26.0, 1.08, 1.75), satinFasciaMat);
  fasciaBeam.position.set(midX, 4.90, 43.50);
  staticGroup.add(fasciaBeam);

  // Subtle top dark shadow reveal under louver sill + warm LED cove wash bar
  const fasciaTopReveal = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.05, 0.18), charcoalSteelMat);
  fasciaTopReveal.position.set(midX, 5.44, 42.68);
  staticGroup.add(fasciaTopReveal);

  const coveStrip = new THREE.Mesh(new THREE.BoxGeometry(25.9, 0.08, 0.14), fasciaCoveLedMat);
  coveStrip.position.set(midX, 5.48, 42.76);
  staticGroup.add(coveStrip);

  // Recessed warm LED arcade soffit downlights under fascia overhang (Z = 43.3)
  for (let dx = 301.2; dx <= 321.2; dx += 3.3) {
    const downlight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.24), fasciaCoveLedMat);
    downlight.position.set(dx, 4.35, 43.35);
    staticGroup.add(downlight);
  }

  // "THE BRAND WITH THE 3 STRIPES" crisp dark serif lettering on screen-left fascia
  const wordsTex = createAdidas3StripesWordTex();
  const wordsMat = new THREE.MeshStandardMaterial({
    map: wordsTex,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.45,
  });
  const fasciaWords = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 0.72), wordsMat);
  fasciaWords.userData.noMerge = true;
  fasciaWords.rotation.y = Math.PI;
  fasciaWords.position.set(320.6, 4.90, 42.60);
  staticGroup.add(fasciaWords);

  // High-contrast 3D Extruded Adidas 3-Bar Emblem above entrance (with dark shadow collar + glowing white face!)
  const fasciaLogoGroup = buildAdidas3BarSculptedLogo(0.96, facadeLogoWhiteMat, charcoalSteelMat);
  fasciaLogoGroup.position.set(313.2, 4.46, 42.60);
  staticGroup.add(fasciaLogoGroup);

  // =========================================================================
  // 3. UPPER VERTICAL BRONZE LOUVER GALLERY + RICH 2F INTERIOR + GIANT 3-BAR LOGO
  // =========================================================================
  // 2F Visible Illuminated Showroom Gallery behind dark tinted curtain glass (NO hollow empty void!)
  const upperBackdropWall = new THREE.Mesh(new THREE.BoxGeometry(25.2, 5.4, 0.20), charcoalSteelMat);
  upperBackdropWall.position.set(midX, 8.32, 48.8);
  staticGroup.add(upperBackdropWall);

  // Warm illuminated 2F wood gallery piers, shelving bays & ceiling linear coves behind the glass
  for (let bx = 301.0; bx <= 323.5; bx += 3.2) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.42, 5.1, 0.55), warmOakMat);
    pier.position.set(bx, 8.25, 47.4);
    staticGroup.add(pier);
  }
  [6.9, 8.6, 10.45].forEach((sy) => {
    const galleryGlowShelf = new THREE.Mesh(new THREE.BoxGeometry(23.6, 0.09, 0.35), fasciaCoveLedMat);
    galleryGlowShelf.position.set(midX, sy, 46.8);
    staticGroup.add(galleryGlowShelf);
  });
  // Iconic horizontal red Performance LED accent visible on screen-left 2F (matching photo!)
  const red2FAccent = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.14, 0.18), adidasRedAccentMat);
  red2FAccent.position.set(318.8, 7.65, 46.4);
  staticGroup.add(red2FAccent);
  // Subtle 2F interior silhouettes / display fixtures behind glass
  [303.5, 308.0, 316.5, 320.5].forEach((mx, idx) => {
    const rack2F = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.35, 0.55), idx % 2 === 0 ? warmOakMat : adidasGreenMat);
    rack2F.position.set(mx, 6.45, 45.8);
    staticGroup.add(rack2F);
  });

  // Dark tinted reflective upper glass curtain wall in front of the 2F showroom bays
  const upperGlassWall = new THREE.Mesh(new THREE.BoxGeometry(25.6, 5.55, 0.08), upperWindowGlassMat);
  upperGlassWall.position.set(midX, 8.32, 43.35);
  staticGroup.add(upperGlassWall);

  // Horizontal dark bronze transom rails
  [5.56, 7.38, 9.24, 11.08].forEach((ly) => {
    const hRail = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.075, 0.22), louverFrameMat);
    hRail.position.set(midX, ly, 42.84);
    staticGroup.add(hRail);
  });

  // Dense Sleek Champagne-Bronze Vertical Louver Curtain Fins + Giant Segmented Adidas 3-Bar Logo!
  // Logo analytical mask in viewer coords: sx = logoCenterX - x (screen-left to screen-right)
  const logoCenterX = 312.4;
  const logoBaseY = 5.90;
  const dirX = -0.55;
  const dirY = 0.835;
  const perpX = 0.835;
  const perpY = 0.55;
  const barW = 2.15;
  const barPitch = 3.22;
  const barVMax = [0.72, 1.58, 2.44];
  const logoOriginSx = -5.15;

  for (let lx = minX + 0.18; lx <= maxX - 0.18; lx += 0.29) {
    // Sleek dense champagne-bronze vertical architectural fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.052, 5.54, 0.24), louverBronzeMat);
    fin.position.set(lx, 8.32, 42.84);
    staticGroup.add(fin);

    // Sample vertical bar mask along y = 5.90 .. 10.96 for crisp luminous white segmented bars
    const sx = logoCenterX - lx;
    if (sx < -6.9 || sx > 6.9) continue;

    for (let k = 0; k < 3; k++) {
      const uMin = k * barPitch;
      const uMax = uMin + barW;
      const vCap = barVMax[k];

      let segMinY = 999;
      let segMaxY = -999;
      for (let sy = logoBaseY; sy <= 10.98; sy += 0.04) {
        const dx = sx - logoOriginSx;
        const dy = sy - logoBaseY;
        const u = dx * perpX + dy * perpY;
        const v = dx * dirX + dy * dirY;
        if (sy >= logoBaseY && u >= uMin && u <= uMax && v >= -3.2 && v <= vCap) {
          if (sy < segMinY) segMinY = sy;
          if (sy > segMaxY) segMaxY = sy;
        }
      }
      if (segMaxY - segMinY >= 0.22) {
        const segH = segMaxY - segMinY;
        const cy = (segMinY + segMaxY) * 0.5;
        // Dark anodized housing backing behind each white LED tube for razor-sharp edge definition
        const tubeHousing = new THREE.Mesh(new THREE.BoxGeometry(0.16, segH + 0.03, 0.06), charcoalSteelMat);
        tubeHousing.position.set(lx, cy, 42.71);
        staticGroup.add(tubeHousing);

        const lightFin = new THREE.Mesh(new THREE.BoxGeometry(0.135, segH, 0.08), facadeLogoWhiteMat);
        lightFin.position.set(lx, cy, 42.65);
        staticGroup.add(lightFin);
      }
    }
  }

  // =========================================================================
  // 4. TOP CRIMSON PERFORATED ARCHITECTURAL CROWN (Y = 11.10..12.90)
  // =========================================================================
  const crimsonCrown = new THREE.Mesh(new THREE.BoxGeometry(26.1, 1.74, 1.85), crimsonCrownMat);
  crimsonCrown.position.set(midX, 11.98, 43.52);
  staticGroup.add(crimsonCrown);

  // Dark anodized steel top coping & soffit trim framing the crimson crown
  const crownTopCoping = new THREE.Mesh(new THREE.BoxGeometry(26.25, 0.11, 1.96), charcoalSteelMat);
  crownTopCoping.position.set(midX, 12.88, 43.52);
  staticGroup.add(crownTopCoping);
  const crownBotReveal = new THREE.Mesh(new THREE.BoxGeometry(26.20, 0.08, 1.90), charcoalSteelMat);
  crownBotReveal.position.set(midX, 11.11, 43.52);
  staticGroup.add(crownBotReveal);

  // =========================================================================
  // 5. GROUND STOREFRONT CURTAIN GLASS, CONTINUOUS TICKER, EAS GATES & AUTO DOORS
  // =========================================================================
  const rightWingGlass = new THREE.Mesh(new THREE.BoxGeometry(12.2, 4.25, 0.08), glassMat);
  rightWingGlass.position.set(305.3, 2.20, frontGlassZ);
  staticGroup.add(rightWingGlass);

  const leftWingGlass = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.25, 0.08), glassMat);
  leftWingGlass.position.set(318.6, 2.20, frontGlassZ);
  staticGroup.add(leftWingGlass);

  const doorTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.25, 0.08), glassMat);
  doorTransomGlass.position.set(313.2, 3.72, frontGlassZ);
  staticGroup.add(doorTransomGlass);

  // Sleek Dark Vertical Window Mullions flanking glass bays (avoiding door aperture 311.4..315.0)
  [302.4, 306.8, 311.32, 315.08, 318.6, 322.1].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.10, 4.30, 0.14), charcoalSteelMat);
    mullion.position.set(mx, 2.22, frontGlassZ);
    staticGroup.add(mullion);
  });

  // Illuminated Digital Ticker Header Strip running cleanly IN FRONT of mullions (Z = frontGlassZ - 0.09)
  const tickerTex = createAdidasTickerTex();
  const tickerMat = new THREE.MeshStandardMaterial({
    map: tickerTex,
    emissive: 0xffffff,
    emissiveMap: tickerTex,
    emissiveIntensity: 0.26,
    roughness: 0.42,
  });
  const rightTicker = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 0.34), tickerMat);
  rightTicker.rotation.y = Math.PI;
  rightTicker.position.set(305.3, 4.16, frontGlassZ - 0.09);
  staticGroup.add(rightTicker);

  const leftTicker = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 0.34), tickerMat);
  leftTicker.rotation.y = Math.PI;
  leftTicker.position.set(318.6, 4.16, frontGlassZ - 0.09);
  staticGroup.add(leftTicker);

  // EAS Anti-Theft Acrylic Security Gates inside entrance (matching real photo!)
  [311.65, 314.75].forEach((gx) => {
    const gateBase = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.38), brushedAlumMat);
    gateBase.position.set(gx, 0.13, 45.45);
    staticGroup.add(gateBase);
    const gateGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.48, 0.32), glassMat);
    gateGlass.position.set(gx, 0.90, 45.45);
    staticGroup.add(gateGlass);
    const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.50, 0.05), brushedAlumMat);
    gateFrame.position.set(gx, 0.90, 45.30);
    staticGroup.add(gateFrame);
  });

  // BI-PARTING AUTOMATIC SLIDING GLASS DOORS (X = 311.4 .. 315.0, Z = 44.2)
  const autoHeaderBox = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.22, 0.28), charcoalSteelMat);
  autoHeaderBox.position.set(313.2, 3.04, frontGlassZ);
  staticGroup.add(autoHeaderBox);

  const pocketTrack = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.07, 0.10), brushedAlumMat);
  pocketTrack.position.set(313.2, 2.97, frontGlassZ + 0.14);
  staticGroup.add(pocketTrack);

  // Proximity Sensor Pods (facing North sidewalk & South lobby) with green active LED
  [frontGlassZ - 0.16, frontGlassZ + 0.18].forEach((sz) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), charcoalSteelMat);
    pod.position.set(313.2, 3.05, sz);
    staticGroup.add(pod);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.02), sensorLedMat);
    led.position.set(313.2, 3.04, sz + (sz < frontGlassZ ? -0.042 : 0.042));
    staticGroup.add(led);
  });

  const doorThreshold = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.02, 0.18), brushedAlumMat);
  doorThreshold.position.set(313.2, 0.085, frontGlassZ + 0.06);
  staticGroup.add(doorThreshold);

  const doorDecalTex = createAdidasSlidingDoorDecalTex();
  const doorDecalMat = new THREE.MeshStandardMaterial({
    map: doorDecalTex,
    transparent: true,
    depthWrite: false,
    roughness: 0.4,
  });

  const buildAdidasDoorLeaf = (isEastLeaf: boolean) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(1.74, 2.78, 0.045), glassMat);
    grp.add(glassPane);

    [-0.87, 0.87].forEach((sx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.86, 0.075), brushedAlumMat);
      stile.position.set(sx, 0, 0);
      grp.add(stile);
    });
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.08, 0.075), brushedAlumMat);
    topRail.position.set(0, 1.40, 0);
    grp.add(topRail);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.10, 0.075), brushedAlumMat);
    botRail.position.set(0, -1.38, 0);
    grp.add(botRail);

    [0.03, -0.03].forEach((dz) => {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 2.50), doorDecalMat);
      decal.position.set(0, 0, dz);
      if (dz < 0) decal.rotation.y = Math.PI;
      grp.add(decal);
    });

    const hx = isEastLeaf ? -0.68 : 0.68;
    [-0.055, 0.055].forEach((hz) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.90, 8), brushedAlumMat);
      handle.position.set(hx, -0.04, hz);
      grp.add(handle);
    });

    staticGroup.add(grp);
    return grp;
  };

  const westSlideStartX = 312.31;
  const eastSlideStartX = 314.09;
  const doorWestLeaf = buildAdidasDoorLeaf(false);
  doorWestLeaf.position.set(westSlideStartX, 1.51, frontGlassZ + 0.14);
  const doorEastLeaf = buildAdidasDoorLeaf(true);
  doorEastLeaf.position.set(eastSlideStartX, 1.51, frontGlassZ + 0.14);

  // =========================================================================
  // 6. RICH FLAGSHIP SHOWROOM INTERIOR: ORIGINALS STUDIO, MANNEQUINS, FOOTWEAR WALL & ESCALATOR
  // =========================================================================
  // A. Right Showcase (West Window X = 300.5..309.5): Originals Finger-Painting Art Studio (matching Image 2!)
  const artMat = new THREE.MeshStandardMaterial({
    map: createAdidasArtworkPosterTex('originals'),
    emissive: 0xffffff,
    emissiveMap: createAdidasArtworkPosterTex('originals'),
    emissiveIntensity: 0.14,
    roughness: 0.52,
  });
  const showcaseArt = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 0.10), artMat);
  showcaseArt.position.set(303.2, 1.90, 50.0);
  staticGroup.add(showcaseArt);

  // Studio Art Easel angled in the window
  const easelMat = new THREE.MeshStandardMaterial({
    map: createAdidasArtworkPosterTex('easel'),
    emissive: 0xffffff,
    emissiveMap: createAdidasArtworkPosterTex('easel'),
    emissiveIntensity: 0.12,
    roughness: 0.55,
  });
  const easelGroup = new THREE.Group();
  easelGroup.position.set(301.8, 0.08, 47.4);
  easelGroup.rotation.y = Math.PI * 0.18;
  [-0.35, 0.35].forEach((ex) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.75, 0.05), warmOakMat);
    leg.position.set(ex, 0.85, 0);
    leg.rotation.z = ex > 0 ? 0.12 : -0.12;
    easelGroup.add(leg);
  });
  const easelCanvas = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.95, 0.06), easelMat);
  easelCanvas.position.set(0, 1.15, -0.05);
  easelGroup.add(easelCanvas);
  staticGroup.add(easelGroup);

  // Studio Oak Table + Minimalist Chairs + Stacked Adidas Blue Shoeboxes
  const windowTable = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 1.15), warmOakMat);
  windowTable.position.set(305.8, 0.80, 48.6);
  staticGroup.add(windowTable);
  [-1.05, 1.05].forEach((lx) => {
    [-0.44, 0.44].forEach((lz) => {
      const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6), charcoalSteelMat);
      tLeg.position.set(305.8 + lx, 0.44, 48.6 + lz);
      staticGroup.add(tLeg);
    });
  });
  // Chairs & stacked blue boxes around studio table
  [304.9, 306.7].forEach((cx) => {
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.44), charcoalSteelMat);
    chairSeat.position.set(cx, 0.52, 47.65);
    staticGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.05), charcoalSteelMat);
    chairBack.position.set(cx, 0.74, 47.45);
    staticGroup.add(chairBack);
  });
  [0, 1, 2].forEach((bi) => {
    const shoebox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.28), adidasCobaltMat);
    shoebox.position.set(307.6, 0.17 + bi * 0.19, 48.2);
    shoebox.rotation.y = bi * 0.18;
    staticGroup.add(shoebox);
  });

  // Two Originals Mannequins on right window side
  staticGroup.add(
    buildAdidasMannequin(
      308.4,
      0.08,
      48.0,
      Math.PI * 0.94,
      adidasCreamClothMat,
      adidasCobaltMat,
      brushedAlumMat,
      pureWhiteMat,
      true,
      adidasGreenMat
    )
  );
  staticGroup.add(
    buildAdidasMannequin(
      303.8,
      0.08,
      47.3,
      Math.PI * 1.06,
      adidasCobaltMat,
      adidasBlackClothMat,
      brushedAlumMat,
      pureWhiteMat
    )
  );

  // B. Left Showcase (East Window X = 316.0..322.5): Editorial Campaign Lightbox + Emerald Sportswear Mannequins!
  const edTex = createAdidasArtworkPosterTex('editorial');
  const edMat = new THREE.MeshStandardMaterial({
    map: edTex,
    emissive: 0xffffff,
    emissiveMap: edTex,
    emissiveIntensity: 0.22,
    roughness: 0.42,
  });
  const editorialPillar = new THREE.Mesh(new THREE.BoxGeometry(1.55, 3.7, 1.15), edMat);
  editorialPillar.position.set(316.4, 1.93, 48.2);
  staticGroup.add(editorialPillar);

  staticGroup.add(
    buildAdidasMannequin(
      318.8,
      0.08,
      48.0,
      Math.PI,
      adidasGreenMat,
      adidasCreamClothMat,
      brushedAlumMat,
      pureWhiteMat
    )
  );
  staticGroup.add(
    buildAdidasMannequin(
      320.6,
      0.08,
      48.2,
      Math.PI * 0.92,
      adidasBlackClothMat,
      adidasBlackClothMat,
      brushedAlumMat,
      pureWhiteMat
    )
  );
  staticGroup.add(
    buildAdidasMannequin(
      322.2,
      0.08,
      48.5,
      Math.PI * 0.86,
      adidasCreamClothMat,
      adidasGreenMat,
      brushedAlumMat,
      pureWhiteMat
    )
  );

  // C. West Apparel Zone: 2 Rows of Hanging Clothing Racks
  staticGroup.add(
    buildApparelRack(304.8, 0.08, 54.4, 5.4, brushedAlumMat, [
      adidasBlackClothMat,
      adidasGreenMat,
      adidasCreamClothMat,
      adidasCobaltMat,
    ])
  );
  staticGroup.add(
    buildApparelRack(304.8, 0.08, 58.4, 5.4, brushedAlumMat, [
      adidasCreamClothMat,
      adidasCobaltMat,
      adidasBlackClothMat,
      adidasGreenMat,
    ])
  );

  // D. East Iconic Illuminated Sneaker Wall ("THE WALL") & Central Footwear Try-On Bench Island
  const sneakerWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 12.6), pureWhiteMat);
  sneakerWallBack.position.set(324.42, 1.9, 56.5);
  staticGroup.add(sneakerWallBack);

  const sneakerColors = [0xffffff, 0x111827, 0x057a44, 0x2563eb, 0xdc2626, 0xf59e0b];
  const sneakerMats = sneakerColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }));
  for (let row = 0; row < 4; row++) {
    const sy = 0.95 + row * 0.65;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 11.4), shelfGlowMat);
    shelf.position.set(324.16, sy, 56.5);
    staticGroup.add(shelf);

    for (let si = 0; si < 12; si++) {
      const sz = 51.2 + si * 0.96;
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.14, 0.14),
        sneakerMats[(row * 5 + si) % sneakerMats.length]
      );
      shoe.position.set(324.15, sy + 0.095, sz);
      staticGroup.add(shoe);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.04, 0.15), pureWhiteMat);
      sole.position.set(324.15, sy + 0.035, sz);
      staticGroup.add(sole);
    }
  }

  // Footwear Central Display Plinth + Cushioned Leather Try-On Bench (X = 318.8, Z = 56.0)
  const footwearIsland = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 5.4), warmOakMat);
  footwearIsland.position.set(318.8, 0.50, 56.0);
  staticGroup.add(footwearIsland);
  const benchPad = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 1.4), charcoalSteelMat);
  benchPad.position.set(318.8, 0.52, 54.1);
  staticGroup.add(benchPad);
  [55.6, 56.6, 57.6].forEach((sz, idx) => {
    const heroShoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.18), sneakerMats[idx % sneakerMats.length]);
    heroShoe.position.set(318.8, 1.02, sz);
    staticGroup.add(heroShoe);
  });

  // E. Architectural Escalator / Stair Showcase (left rear leading toward glowing upper loft)
  for (let step = 0; step < 12; step++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.24, 0.45), charcoalSteelMat);
    t.position.set(317.0, 0.22 + step * 0.28, 60.8 + step * 0.42);
    staticGroup.add(t);
  }
  [316.05, 317.95].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 5.4), glassMat);
    rail.position.set(rx, 2.25, 63.3);
    rail.rotation.x = -0.58;
    staticGroup.add(rail);
  });

  // F. Rear Stone Cashwrap Checkout Counter + Glowing Adidas Emblem Wall
  const cashwrap = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.05, 1.15), pureWhiteMat);
  cashwrap.position.set(308.4, 0.60, 65.4);
  staticGroup.add(cashwrap);
  const cashwrapTop = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.08, 1.30), charcoalSteelMat);
  cashwrapTop.position.set(308.4, 1.14, 65.4);
  staticGroup.add(cashwrapTop);

  [306.8, 310.0].forEach((px) => {
    const pos = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.08), charcoalSteelMat);
    pos.position.set(px, 1.38, 65.3);
    staticGroup.add(pos);
  });

  const rearBrandTex = createAdidasRearBrandTex();
  const rearBrandMat = new THREE.MeshStandardMaterial({
    map: rearBrandTex,
    emissive: 0xffffff,
    emissiveMap: rearBrandTex,
    emissiveIntensity: 0.28,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.38,
  });
  const rearBrandSign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.2), rearBrandMat);
  rearBrandSign.userData.noMerge = true;
  rearBrandSign.rotation.y = Math.PI;
  rearBrandSign.position.set(308.4, 2.75, 67.82);
  staticGroup.add(rearBrandSign);

  // Warm Linear Ceiling Light Strips inside Showroom
  [304.5, 313.2, 320.5].forEach((lx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 18.0), fasciaCoveLedMat);
    strip.position.set(lx, 4.24, 56.0);
    staticGroup.add(strip);
  });

  // =========================================================================
  // 7. OPERATING HOURS ROLLING SHUTTER (07:00 - 23:00) & LIGHTING
  // =========================================================================
  const shutterTex = createRollingShutterTexture({
    title: 'ADIDAS FLAGSHIP  •  THE 3 STRIPES',
    hoursLabel: 'MỞ CỬA: 07:00 - 23:00',
    accentHex: '#111827',
    slatDarkHex: '#18181b',
    slatLightHex: '#27272a',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.65, metalness: 0.15 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'adidas_main_door',
      axis: 'x',
      pos: frontGlassZ - 0.16,
      spanCenter: 313.2,
      width: 3.70,
      baseY: 0.08,
      topY: 2.94,
      thickness: 0.08,
    },
    shutterMat,
    charcoalSteelMat
  );

  const arcadeLight = new THREE.PointLight(0xfef3c7, 4.2, 32.0, 0.95);
  arcadeLight.position.set(midX, 3.8, 42.2);
  scaledLights.push({ light: arcadeLight, dayInt: 4.2, nightInt: 18.0, getScale: () => 1.0 - mainShutter.progress });

  const hallLight = new THREE.PointLight(0xfffbeb, 5.4, 36.0, 0.95);
  hallLight.position.set(midX, 4.0, 56.0);
  scaledLights.push({ light: hallLight, dayInt: 5.4, nightInt: 21.0, getScale: () => 1.0 - mainShutter.progress });

  const westShowcaseLight = new THREE.PointLight(0xfffbeb, 4.8, 28.0, 0.95);
  westShowcaseLight.position.set(304.8, 3.8, 49.5);
  scaledLights.push({ light: westShowcaseLight, dayInt: 4.8, nightInt: 18.5, getScale: () => 1.0 - mainShutter.progress });

  const eastFootwearLight = new THREE.PointLight(0xf8fafc, 5.0, 28.0, 0.95);
  eastFootwearLight.position.set(320.2, 3.8, 54.5);
  scaledLights.push({ light: eastFootwearLight, dayInt: 5.0, nightInt: 19.0, getScale: () => 1.0 - mainShutter.progress });

  const poolTex = createAdidasGlowPoolTex();
  const porchPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(porchPoolMat);
  const porchPool = new THREE.Mesh(new THREE.PlaneGeometry(25.0, 7.2), porchPoolMat);
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(midX, 0.045, 41.2);
  staticGroup.add(porchPool);

  let doorOpenAmount = 0.0;
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: AdidasNpcController | null,
    externalNpcNearDoor?: boolean
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isAdidasOpenAtHour(h);
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

    // Proximity-activated bi-parting automatic sliding glass doors
    let nearPlayer = false;
    if (playerPos && playerPos.y <= 3.5) {
      const localP = placement
        ? inverseTransformAdidasPointXZ(playerPos.x, playerPos.z, placement)
        : { x: playerPos.x, z: playerPos.z };
      nearPlayer = Math.abs(localP.x - 313.2) <= 3.1 && Math.abs(localP.z - frontGlassZ) <= 3.7;
    }
    const nearNpc = Boolean(npcController?.hasNpcNearDoor()) || Boolean(externalNpcNearDoor);
    const sensorTriggered = nearPlayer || nearNpc;
    const targetDoor = (isOpen || !mainShutter.progress) && sensorTriggered ? 1.0 : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetDoor, Math.min(1, dt * 6.5));
    doorWestLeaf.position.x = westSlideStartX - doorOpenAmount * 1.72;
    doorEastLeaf.position.x = eastSlideStartX + doorOpenAmount * 1.72;

    // Balanced backlit luminance (crisp contrast day & gentle luxury glow at night)
    const litScale = 1.0 - mainShutter.progress;
    facadeLogoWhiteMat.emissiveIntensity = (0.24 + lampFactor * 0.45) * litScale;
    fasciaCoveLedMat.emissiveIntensity = (0.36 + lampFactor * 0.58) * litScale;
    tickerMat.emissiveIntensity = (0.24 + lampFactor * 0.38) * litScale;
    rearBrandMat.emissiveIntensity = (0.28 + lampFactor * 0.44) * litScale;
    shelfGlowMat.emissiveIntensity = (0.36 + lampFactor * 0.48) * litScale;
    upperWindowGlassMat.emissiveIntensity = (0.16 + lampFactor * 0.34) * litScale;
    adidasRedAccentMat.emissiveIntensity = (0.34 + lampFactor * 0.46) * litScale;
    sensorLedMat.emissiveIntensity = isOpen ? (sensorTriggered ? 0.95 : 0.35) : 0.05;
  };

  let outputGroup = staticGroup;
  if (placement) {
    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(placement.anchorX, 0, placement.anchorZ);
    pivotGroup.rotation.y = placement.rotationY;
    staticGroup.position.set(-ADIDAS_ORIG_ANCHOR_X, 0, -ADIDAS_ORIG_ANCHOR_Z);
    pivotGroup.add(staticGroup);
    outputGroup = pivotGroup;

    scaledLights.forEach((entry) => {
      const tp = transformAdidasPointXZ(entry.light.position.x, entry.light.position.z, placement);
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
// ADIDAS FLAGSHIP NPC CONTROLLER (4 STAFF + 10 ROTATING SHOPPERS + 3 SIDEWALK STROLLERS)
// =========================================================================
const ADIDAS_PROFILES = [
  { shirt: 0x111827, pants: 0x1e293b, hair: 0x111827, skinHex: '#fbe0c8' },
  { shirt: 0x057a44, pants: 0x0f172a, hair: 0x2c1a10, skinHex: '#f5c7a3' },
  { shirt: 0xe2e8f0, pants: 0x111827, hair: 0x18181b, skinHex: '#fbe0c8' },
  { shirt: 0x1d4ed8, pants: 0x334155, hair: 0x3b2314, skinHex: '#e8b48e' },
  { shirt: 0xd97706, pants: 0x1e293b, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0xe11d48, pants: 0x0f172a, hair: 0x291c15, skinHex: '#fbe0c8' },
  { shirt: 0x0d9488, pants: 0x1e293b, hair: 0x1e1b4b, skinHex: '#f5c7a3' },
  { shirt: 0x475569, pants: 0x09090b, hair: 0x4a2c18, skinHex: '#fbe0c8' },
  { shirt: 0x7c3aed, pants: 0x18181b, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0x0284c7, pants: 0xe2e8f0, hair: 0x2c1a10, skinHex: '#fbe0c8' },
];

type AdidasShopperPhase =
  | 'respawn_wait'
  | 'walk_to_browse'
  | 'browsing'
  | 'walk_to_checkout'
  | 'at_checkout'
  | 'walk_leave';

interface AdidasActor {
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
  phase: AdidasShopperPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  stateTimer: number;
  waitYaw: number;
  browseSpotIdx: number;
  strollDir?: 1 | -1;
  strollZ?: number;
  strollPauseTimer?: number;
  strollNextPause?: number;
  exiting: boolean;
  exitDone: boolean;
  exitWaypoints?: THREE.Vector3[];
  exitRef: { idx: number };
  walkPhaseRef: { phase: number };
  glbHandle: GlbHumanHandle;
}

export class AdidasNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actorContainer = new THREE.Group();
  private actors: AdidasActor[] = [];
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
    { pos: new THREE.Vector3(322.6, 0.08, 53.5), yaw: Math.PI * 0.5 }, // Sneaker Wall North
    { pos: new THREE.Vector3(322.6, 0.08, 57.6), yaw: Math.PI * 0.5 }, // Sneaker Wall South
    { pos: new THREE.Vector3(322.6, 0.08, 60.4), yaw: Math.PI * 0.5 }, // Sneaker Wall Running
    { pos: new THREE.Vector3(304.5, 0.08, 52.8), yaw: 0 }, // Apparel Rack 1
    { pos: new THREE.Vector3(306.8, 0.08, 56.6), yaw: 0 }, // Apparel Rack 2
    { pos: new THREE.Vector3(303.2, 0.08, 56.6), yaw: 0 }, // Apparel Rack 2 West
    { pos: new THREE.Vector3(305.8, 0.08, 50.8), yaw: Math.PI }, // Originals Art Studio Table
    { pos: new THREE.Vector3(316.2, 0.08, 55.6), yaw: Math.PI * 0.5 }, // Footwear Central Island
    { pos: new THREE.Vector3(318.8, 0.08, 52.4), yaw: 0 }, // Footwear Bench Try-On
  ];

  constructor(private helpers: HospitalCharacterHelpers, placement?: AdidasPlacementConfig) {
    this.rootGroup.userData.noMerge = true;
    this.actorContainer.userData.noMerge = true;
    this.rootGroup.add(this.actorContainer);
    if (placement) {
      this.rootGroup.position.set(placement.anchorX, 0, placement.anchorZ);
      this.rootGroup.rotation.y = placement.rotationY;
      this.actorContainer.position.set(-ADIDAS_ORIG_ANCHOR_X, 0, -ADIDAS_ORIG_ANCHOR_Z);
    }
    const seedOffset = placement?.seedOffset ?? 0;

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 });
    const bagBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const bagStripeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });

    this.profileMats = ADIDAS_PROFILES.map((p) => ({
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
      speed = 1.34
    ): AdidasActor => {
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

      // Adidas White & Black 3-Stripe Shopping Bag
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

      const seed = (id + seedOffset) * 1.49;
      const spec =
        kind === 'staff'
          ? id <= 1
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(id + 131 + seedOffset)
          : kind === 'stroller'
            ? pickOutsideNpcModel(id + 143 + seedOffset)
            : pickShopCustomerModel(id + 141 + seedOffset);
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

      const actor: AdidasActor = {
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
        strollZ: z,
        strollPauseTimer: 0,
        strollNextPause: 4.5 + (id % 3) * 3.0,
        exiting: false,
        exitDone: false,
        exitWaypoints:
          kind === 'staff'
            ? [
                new THREE.Vector3(313.2, 0.08, 62.5),
                new THREE.Vector3(313.2, 0.08, 46.5),
                new THREE.Vector3(313.2, 0.02, 40.5),
                new THREE.Vector3(297.5 + id * 1.5, 0.02, 40.2),
              ]
            : undefined,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      };
      this.actors.push(actor);
      return actor;
    };

    // 1. Four Adidas Store Associates (2 Cashiers + Footwear Specialist + Entrance Stylist)
    createActorRig('staff', 0, 307.2, 0.08, 66.8, Math.PI);
    createActorRig('staff', 2, 310.0, 0.08, 66.8, Math.PI);
    createActorRig('staff', 4, 321.5, 0.08, 56.5, -Math.PI * 0.5);
    createActorRig('staff', 6, 314.8, 0.08, 48.2, Math.PI * 0.85);

    // 2. Ten Dynamic Rotating Inside Shoppers
    for (let i = 0; i < 10; i++) {
      createActorRig('shopper', i % this.profileMats.length, 313.2, 0.02, 40.5, 0, 1.28 + (i % 3) * 0.09);
    }

    // 3. Three Sidewalk Boulevard Promenade Walkers & Window-Shoppers passing the storefront!
    createActorRig('stroller', 1, 304.0, 0.02, 39.0, Math.PI * 0.5, 1.24);
    createActorRig('stroller', 5, 319.5, 0.02, 40.4, -Math.PI * 0.5, 1.18);
    createActorRig('stroller', 9, 311.5, 0.02, 38.6, Math.PI * 0.5, 1.32);
  }

  private applyShopperProfile(a: AdidasActor, nextIdx: number) {
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

  private assignNewShopperArrival(a: AdidasActor, rotateProfile: boolean) {
    if (rotateProfile) {
      this.applyShopperProfile(a, a.profileIdx + 3 + (a.id % 4));
    }
    a.bagGroup.visible = false;
    a.leftLeg.rotation.x = 0;
    a.rightLeg.rotation.x = 0;

    const fromEast = this.nextSpawnSide++ % 2 === 0;
    const spawnX = fromEast ? 327.8 : 296.4;
    const spawnZ = 39.6 + (a.id % 3) * 0.45;
    a.root.position.set(spawnX, 0.02, spawnZ);
    a.root.visible = true;

    a.browseSpotIdx = (a.browseSpotIdx + 1) % this.browseSpots.length;
    const spot = this.browseSpots[a.browseSpotIdx];
    a.pathQueue = [
      new THREE.Vector3(313.2, 0.02, 41.2),
      new THREE.Vector3(313.2, 0.08, 46.8),
      new THREE.Vector3(313.2, 0.08, 51.0),
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
        a.stateTimer = 3.5 + shopperIdx * 2.8;
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
      if (!a.root.visible || a.phase === 'respawn_wait' || a.root.position.z < 42.5) {
        a.exitDone = true;
        a.root.visible = false;
        a.glbHandle.setAnimState('Idle');
        continue;
      }

      a.exitDone = false;
      const leaveEast = i % 2 === 0;
      a.exitWaypoints = [
        new THREE.Vector3(313.2, 0.08, 49.0),
        new THREE.Vector3(313.2, 0.02, 41.2),
        new THREE.Vector3(leaveEast ? 327.8 : 296.4, 0.02, 40.2),
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
      if (p.x >= 311.0 && p.x <= 315.4 && p.z >= 41.0 && p.z <= 47.2) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: AdidasActor, dt: number): boolean {
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
    const isOpen = isAdidasOpenAtHour(h);

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
          new THREE.Vector3(313.2, 0.08, 49.0),
          new THREE.Vector3(313.2, 0.02, 41.2),
          new THREE.Vector3(296.4 + i * 2.0, 0.02, 40.2),
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
          // Turn toward storefront glass to admire display window
          let diff = 0 - a.root.rotation.y;
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
          if (a.strollNextPause <= 0 && a.root.position.x >= 302.0 && a.root.position.x <= 321.0) {
            a.strollPauseTimer = 2.6 + (a.id % 3) * 0.8;
            a.strollNextPause = 9.0 + (a.id % 3) * 2.5;
          }

          if (dir > 0 && a.root.position.x > 328.5) {
            a.strollDir = -1;
            this.applyShopperProfile(a, a.profileIdx + 3);
          } else if (dir < 0 && a.root.position.x < 296.0) {
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
          const payX = 306.8 + (a.id % 3) * 1.6;
          a.pathQueue = [
            new THREE.Vector3(312.8, 0.08, 56.5),
            new THREE.Vector3(payX, 0.08, 63.2),
          ];
          a.pathIdx = 0;
          a.waitYaw = 0;
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
            new THREE.Vector3(313.2, 0.08, 56.0),
            new THREE.Vector3(313.2, 0.08, 46.5),
            new THREE.Vector3(313.2, 0.02, 41.2),
            new THREE.Vector3(leaveEast ? 327.8 : 296.4, 0.02, 40.2),
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
