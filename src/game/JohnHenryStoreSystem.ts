import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isJohnHenryOpenAtHour,
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

export interface JohnHenryStoreBuildResult {
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
    npcController?: JohnHenryNpcController | null,
    externalNpcNearDoor?: boolean
  ) => void;
}

// Positioned directly East (screen-right from Boulevard) of Skechers Store (X = 301.8..326.8)
// Facing South (+Z) onto East Leg Boulevard NE Sidewalk (Z = 15.58..20.80)
// Plot Span: X = 329.8 .. 354.8 (25.0m wide), Z = -8.4 .. 15.6 (24.0m deep)
// Storefront Glass Line: Z = 14.5 (Covered concrete promenade Z = 14.5..20.8)
export const JOHN_HENRY_COLLIDERS: IntersectionColliderBox[] = [
  // Perimeter Structural Walls
  { minX: 329.5, maxX: 330.3, minZ: -8.6, maxZ: 15.6, floor: 1 }, // West Wall
  { minX: 354.3, maxX: 355.1, minZ: -8.6, maxZ: 2.5, floor: 1 }, // East Wall North of Side Door (Side Door: Z = 2.5..6.1)
  { minX: 354.3, maxX: 355.1, minZ: 6.1, maxZ: 15.6, floor: 1 }, // East Wall South of Side Door
  { minX: 329.6, maxX: 355.0, minZ: -8.6, maxZ: -7.7, floor: 1 }, // North Rear Wall

  // Front Facade Piers & Showcase Glass Bays (Open Double Door Aperture: X = 340.5 .. 344.1, Z = 14.5)
  { minX: 329.8, maxX: 340.5, minZ: 14.1, maxZ: 15.1, floor: 1 }, // West Pier + Freelancer Window + Left Inner Pier
  { minX: 344.1, maxX: 354.8, minZ: 14.1, maxZ: 15.1, floor: 1 }, // Right Inner Pier + John Henry Window + East Pier

  // Front Corner Hedge Planters (matching Image 2 flanking greenery)
  { minX: 329.8, maxX: 331.5, minZ: 15.0, maxZ: 15.85, floor: 1 },
  { minX: 353.1, maxX: 354.8, minZ: 15.0, maxZ: 15.85, floor: 1 },

  // Window Mannequin Showcase Platforms & Center Hero Mannequins
  { minX: 332.6, maxX: 337.2, minZ: 12.2, maxZ: 13.8, floor: 1 }, // Left Freelancer Window Platform
  { minX: 347.4, maxX: 352.0, minZ: 12.2, maxZ: 13.8, floor: 1 }, // Right John Henry Window Platform
  { minX: 352.5, maxX: 354.0, minZ: -3.6, maxZ: 0.0, floor: 1 }, // North-East Side Window Display Platform
  { minX: 352.5, maxX: 354.0, minZ: 8.0, maxZ: 11.4, floor: 1 }, // South-East Side Window Display Platform
  { minX: 340.25, maxX: 340.95, minZ: 10.25, maxZ: 10.95, floor: 1 }, // Center Left Hero Mannequin Plinth
  { minX: 343.65, maxX: 344.35, minZ: 10.25, maxZ: 10.95, floor: 1 }, // Center Right Hero Mannequin Plinth

  // Interior Apparel Tables & Garment Islands
  { minX: 334.0, maxX: 338.2, minZ: 6.2, maxZ: 8.0, floor: 1 }, // Left Front Freelancer Table
  { minX: 346.4, maxX: 350.6, minZ: 6.2, maxZ: 8.0, floor: 1 }, // Right Front John Henry Table
  { minX: 334.0, maxX: 338.2, minZ: 0.8, maxZ: 2.4, floor: 1 }, // Left Mid Freelancer Rack
  { minX: 346.4, maxX: 350.6, minZ: 0.8, maxZ: 2.4, floor: 1 }, // Right Mid John Henry Rack

  // Rear Cashwrap Counter & Perimeter Wall Racks
  { minX: 337.2, maxX: 347.4, minZ: -5.4, maxZ: -4.0, floor: 1 }, // Rear Checkout Desk
  { minX: 330.2, maxX: 331.4, minZ: -7.6, maxZ: 13.6, floor: 1 }, // West Freelancer Wall Rack
  { minX: 353.2, maxX: 354.4, minZ: -7.6, maxZ: -4.4, floor: 1 }, // East Wall Rack North Segment (clear of side door & windows)
  { minX: 353.2, maxX: 354.4, minZ: 11.8, maxZ: 13.6, floor: 1 }, // East Wall Rack South Segment
];

// Subtle architectural warm stone-plaster texture for the cantilevered main fascia
function createPlasterFasciaTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#eae6df');
  grad.addColorStop(0.5, '#f2eee8');
  grad.addColorStop(1, '#e4dfd7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural stone grain
  let seed = 91;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(140,130,118,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Crisp Dual-Brand Fascia Signboard Texture ("FREELANCER" + "JOHN HENRY" + "CÔNG TY TNHH T.M.G")
// Faithfully matches the typography, spacing & emblems of Image 2!
function createDualBrandFasciaTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // 1. LEFT: FREELANCER floral/wing loop emblem
  ctx.save();
  ctx.translate(220, 122);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(6, -42);
  ctx.bezierCurveTo(-36, -52, -48, 14, -12, 34);
  ctx.bezierCurveTo(22, 54, 44, 14, 20, -6);
  ctx.bezierCurveTo(2, -22, -22, -2, -8, 16);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-2, -38);
  ctx.bezierCurveTo(30, -44, 38, -8, 8, -2);
  ctx.stroke();
  ctx.restore();

  // FREELANCER Bold Wordmark
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#1c1c1e';
  ctx.font = '800 76px "Montserrat", "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FREELANCER', 292, 126);
  ctx.restore();

  // 2. RIGHT: JOHN HENRY Tilted Black Diamond Emblem with 3 Vertical Stripes
  ctx.save();
  ctx.translate(1135, 122);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(-40, -40, 80, 80);
  ctx.restore();

  // 3 crisp vertical cream/white inner bars inside the diamond (unrotated vertical bars!)
  ctx.save();
  ctx.translate(1135, 122);
  ctx.fillStyle = '#ebe7e0';
  [-15, 0, 15].forEach((bx, idx) => {
    const barH = idx === 1 ? 44 : 28;
    ctx.fillRect(bx - 3, -barH * 0.5, 6, barH);
  });
  ctx.restore();

  // JOHN HENRY Bold Wordmark
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#1c1c1e';
  ctx.font = '800 76px "Montserrat", "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('JOHN HENRY', 1226, 126);
  ctx.restore();

  // Bottom-left small legal subtext (matching Image 2: CÔNG TY TNHH T.M.G)
  ctx.fillStyle = '#27272a';
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CÔNG TY TNHH T.M.G', 76, 224);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Interior Back Wall Logo Texture (JOHN HENRY + FREELANCER clean white feature wall)
function createRearFeatureWallTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f5f2ec';
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural border line
  ctx.strokeStyle = '#d6d0c4';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // Center John Henry diamond + wordmark
  ctx.save();
  ctx.translate(w * 0.5, 118);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(-34, -34, 68, 68);
  ctx.restore();

  ctx.save();
  ctx.translate(w * 0.5, 118);
  ctx.fillStyle = '#f5f2ec';
  [-14, 0, 14].forEach((bx, idx) => {
    const bh = idx === 1 ? 38 : 24;
    ctx.fillRect(bx - 3, -bh * 0.5, 6, bh);
  });
  ctx.restore();

  ctx.fillStyle = '#18181b';
  ctx.font = '800 62px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JOHN HENRY', w * 0.5, 224);

  ctx.fillStyle = '#52525b';
  ctx.font = '700 30px "Montserrat", system-ui, sans-serif';
  ctx.fillText('FREELANCER  •  EST. 1974', w * 0.5, 294);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createTerrazzoFloorTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ede8df';
  ctx.fillRect(0, 0, w, h);

  // Large boutique tile seams
  ctx.strokeStyle = 'rgba(168, 160, 148, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = i * 128;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(w, p);
    ctx.stroke();
  }

  let seed = 1337;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const chips = ['#cfc7ba', '#a89f91', '#f7f4ee', '#78716c'];
  for (let i = 0; i < 480; i++) {
    ctx.fillStyle = chips[Math.floor(rnd() * chips.length)];
    ctx.fillRect(rnd() * w, rnd() * h, 3, 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createJohnHenryGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 245, 224, 0.40)');
  grad.addColorStop(0.55, 'rgba(254, 243, 199, 0.16)');
  grad.addColorStop(1, 'rgba(254, 243, 199, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Sleek Fashion Mannequin Builder (Dresses for Freelancer / Polos & Blazers for John Henry)
function buildBoutiqueMannequin(
  x: number,
  y: number,
  z: number,
  yaw: number,
  topMat: THREE.Material,
  bottomMat: THREE.Material,
  mannequinMat: THREE.Material,
  plinthMat: THREE.Material,
  isDress = false
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  // Pedestal base
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.68), plinthMat);
  plinth.position.y = 0.11;
  grp.add(plinth);

  const baseY = 0.22;

  if (isDress) {
    // Sleek female legs
    [-0.08, 0.08].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.72, 10), mannequinMat);
      leg.position.set(lx, baseY + 0.36, 0);
      grp.add(leg);
    });
    // Flared A-line dress skirt
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.27, 0.56, 14), topMat);
    skirt.position.set(0, baseY + 0.78, 0);
    grp.add(skirt);
    // Fitted bodice
    const bodice = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.36, 0.18), topMat);
    bodice.position.set(0, baseY + 1.18, 0);
    grp.add(bodice);
  } else {
    // Tailored male trousers
    [-0.10, 0.10].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.84, 0.16), bottomMat);
      leg.position.set(lx, baseY + 0.42, 0);
      grp.add(leg);
    });
    // Menswear polo / dress shirt torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.56, 0.22), topMat);
    torso.position.set(0, baseY + 1.10, 0);
    grp.add(torso);
    // Sleeves
    [-0.25, 0.25].forEach((ax) => {
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.13), topMat);
      sleeve.position.set(ax, baseY + 1.24, 0);
      grp.add(sleeve);
    });
  }

  // Arms
  [-0.23, 0.23].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.030, 0.48, 8), mannequinMat);
    arm.position.set(ax, baseY + (isDress ? 1.06 : 0.96), 0);
    grp.add(arm);
  });

  // Sculpted matte mannequin head + neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.14, 10), mannequinMat);
  neck.position.set(0, baseY + 1.42, 0);
  grp.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), mannequinMat);
  head.scale.set(0.90, 1.14, 0.95);
  head.position.set(0, baseY + 1.58, 0);
  grp.add(head);

  return grp;
}

// Boutique Garment Hanging Rack Island
function buildGarmentRackIsland(
  x: number,
  y: number,
  z: number,
  w: number,
  frameMat: THREE.Material,
  woodMat: THREE.Material,
  garmentMats: THREE.Material[]
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 1.05), woodMat);
  plinth.position.y = 0.09;
  grp.add(plinth);

  [-w * 0.44, w * 0.44].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.45, 0.06), frameMat);
    post.position.set(px, 0.82, 0);
    grp.add(post);
  });

  const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, w * 0.90, 10), frameMat);
  topRail.rotation.z = Math.PI / 2;
  topRail.position.set(0, 1.50, 0);
  grp.add(topRail);

  const count = Math.max(6, Math.floor(w * 3.2));
  for (let i = 0; i < count; i++) {
    const gx = -w * 0.39 + (i / (count - 1)) * (w * 0.78);
    const mat = garmentMats[i % garmentMats.length];
    const garment = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.42), mat);
    garment.position.set(gx, 1.12, 0);
    grp.add(garment);
  }

  return grp;
}

// Boutique Display Table with Folded Apparel Stacks
function buildFoldedTable(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  tableTopMat: THREE.Material,
  frameMat: THREE.Material,
  clothMats: THREE.Material[]
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), tableTopMat);
  top.position.y = 0.78;
  grp.add(top);

  [-w * 0.44, w * 0.44].forEach((lx) => {
    [-d * 0.40, d * 0.40].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.76, 0.07), frameMat);
      leg.position.set(lx, 0.38, lz);
      grp.add(leg);
    });
  });

  const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, 0.05, d - 0.16), tableTopMat);
  lowerShelf.position.y = 0.24;
  grp.add(lowerShelf);

  // Folded shirt / sweater stacks atop table
  const cols = 4;
  for (let c = 0; c < cols; c++) {
    const sx = -w * 0.34 + (c / (cols - 1)) * (w * 0.68);
    [-0.24, 0.24].forEach((sz, r) => {
      const stackH = 0.14 + ((c + r) % 3) * 0.05;
      const mat = clothMats[(c * 2 + r) % clothMats.length];
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.36, stackH, 0.28), mat);
      stack.position.set(sx, 0.82 + stackH * 0.5, sz);
      grp.add(stack);
    });
  }

  return grp;
}

export function createJohnHenryStoreStructure(): JohnHenryStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = 329.8;
  const maxX = 354.8;
  const midX = (minX + maxX) * 0.5; // 342.3 (25.0m wide)
  const frontGlassZ = 14.5;
  const backZ = -8.4;
  const midHallZ = (frontGlassZ + backZ) * 0.5; // 3.05

  // Materials matching Image 2 (warm white plaster fascia, natural teak louver wood, black granite plinth, brushed silver frames)
  const plasterTex = createPlasterFasciaTex();
  const plasterMat = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.72 });
  const warmWhiteWallMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.78 });
  const terrazzoMat = new THREE.MeshStandardMaterial({ map: createTerrazzoFloorTex(), roughness: 0.58 });
  const woodLouverMat = new THREE.MeshStandardMaterial({ color: 0xc29b6c, roughness: 0.60 });
  const warmOakMat = new THREE.MeshStandardMaterial({ color: 0xb08657, roughness: 0.64 });
  const louverBackingMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85 });
  const darkGraniteMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.42, metalness: 0.18 });
  const brushedSilverMat = new THREE.MeshStandardMaterial({ color: 0xd6dade, roughness: 0.28, metalness: 0.72 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.90 });
  const mannequinMat = new THREE.MeshStandardMaterial({ color: 0xf3efe8, roughness: 0.45 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.11,
    roughness: 0.18,
    metalness: 0.12,
  });

  // Garment palette matching Image 2 showcase windows (mauve dress, emerald dress, navy polo, cream shirt, charcoal)
  const clothMauveMat = new THREE.MeshStandardMaterial({ color: 0xb98b94, roughness: 0.74 });
  const clothEmeraldMat = new THREE.MeshStandardMaterial({ color: 0x1f6e4a, roughness: 0.72 });
  const clothNavyMat = new THREE.MeshStandardMaterial({ color: 0x1e3557, roughness: 0.72 });
  const clothCreamMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e4, roughness: 0.76 });
  const clothCharcoalMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.74 });
  const clothCamelMat = new THREE.MeshStandardMaterial({ color: 0xb68d65, roughness: 0.74 });
  const clothBurgundyMat = new THREE.MeshStandardMaterial({ color: 0x6b2135, roughness: 0.74 });
  const garmentPalette = [clothCreamMat, clothNavyMat, clothMauveMat, clothCharcoalMat, clothEmeraldMat, clothCamelMat, clothBurgundyMat];

  // Emissive Architectural Lighting Materials
  const uplightBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde68a,
    emissiveIntensity: 0.65,
    roughness: 0.30,
  });
  const soffitLedMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ed,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.55,
    roughness: 0.32,
  });
  const ceilingStripMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef9ec,
    emissiveIntensity: 0.50,
    roughness: 0.32,
  });
  const sensorLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.40,
    roughness: 0.35,
  });

  // =========================================================================
  // 1. FLOOR SLAB, STRUCTURAL SHELL & EXTERIOR GRANITE PLINTH
  // =========================================================================
  const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.16, 23.0), terrazzoMat);
  interiorFloor.position.set(midX, 0.0, 3.0);
  staticGroup.add(interiorFloor);

  // Sidewalk covered apron connecting cleanly to NE Boulevard sidewalk (Z = 14.5..15.6) & East Intersection Sidewalk (X = 354.5..356.6)
  const apronWalk = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.04, 1.3), terrazzoMat);
  apronWalk.position.set(midX, 0.02, 15.1);
  staticGroup.add(apronWalk);

  const sideApronWalk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 24.0), terrazzoMat);
  sideApronWalk.position.set(maxX + 0.85, 0.02, 3.6);
  staticGroup.add(sideApronWalk);

  // Dark granite base step plinth under left & right window bays (leaving center entry flush!)
  const leftGranitePlinth = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.22, 0.85), darkGraniteMat);
  leftGranitePlinth.position.set(335.2, 0.11, 14.68);
  staticGroup.add(leftGranitePlinth);

  const rightGranitePlinth = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.22, 0.85), darkGraniteMat);
  rightGranitePlinth.position.set(349.4, 0.11, 14.68);
  staticGroup.add(rightGranitePlinth);

  // East-side granite plinths under the flanking North-East & South-East display windows (side door Z = 2.5..6.1 stays flush!)
  const eastNorthPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 6.2), darkGraniteMat);
  eastNorthPlinth.position.set(maxX - 0.12, 0.11, -1.5);
  staticGroup.add(eastNorthPlinth);

  const eastSouthPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 6.4), darkGraniteMat);
  eastSouthPlinth.position.set(maxX - 0.12, 0.11, 10.0);
  staticGroup.add(eastSouthPlinth);

  // Perimeter Structural Walls & Roof
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.6, 23.2), warmWhiteWallMat);
  westWall.position.set(minX + 0.22, 3.8, midHallZ);
  staticGroup.add(westWall);

  // Segmented East Wall facing Far-East Intersection (opens Side Portal Z = 2.5..6.1 & Two Display Windows)
  const eastWallX = maxX - 0.22; // 354.58
  const sideDoorZ = 4.3;
  // Full-length upper East wall above window/door headers (Y = 4.10 .. 7.60)
  const eastUpperWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.50, 23.2), warmWhiteWallMat);
  eastUpperWall.position.set(eastWallX, 5.85, midHallZ);
  staticGroup.add(eastUpperWall);

  // Solid East vertical piers framing North Corner, Side Portal & South Corner
  [
    { z1: -8.55, z2: -4.2 }, // North Corner Pier
    { z1: 0.4, z2: 2.5 }, // Mid-North Door Pier
    { z1: 6.1, z2: 7.6 }, // Mid-South Door Pier
    { z1: 11.8, z2: 14.65 }, // South Corner Pier
  ].forEach(({ z1, z2 }) => {
    const len = z2 - z1;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.48, 4.10, len), warmWhiteWallMat);
    pier.position.set(eastWallX, 2.05, (z1 + z2) * 0.5);
    staticGroup.add(pier);
  });

  // Low plaster & granite sills below East display windows (Z = -4.2..0.4 & Z = 7.6..11.8)
  [
    { z1: -4.2, z2: 0.4 },
    { z1: 7.6, z2: 11.8 },
  ].forEach(({ z1, z2 }) => {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.36, z2 - z1), warmWhiteWallMat);
    sill.position.set(eastWallX, 0.18, (z1 + z2) * 0.5);
    staticGroup.add(sill);
  });

  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(25.0, 7.6, 0.45), warmWhiteWallMat);
  rearWall.position.set(midX, 3.8, backZ + 0.22);
  staticGroup.add(rearWall);

  const lowerCeiling = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.30, 23.4), warmWhiteWallMat);
  lowerCeiling.position.set(midX, 4.42, midHallZ);
  staticGroup.add(lowerCeiling);

  const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.34, 23.4), darkGraniteMat);
  upperRoof.position.set(midX, 7.45, midHallZ);
  staticGroup.add(upperRoof);

  // =========================================================================
  // 2. UPPER ARCHITECTURAL WOOD LOUVER SCREEN, UPLIGHTS & CANTILEVERED FASCIA
  // =========================================================================
  // Dark recessed backing wall behind the upper vertical wood slats (Y = 7.45 .. 11.45)
  const upperBacking = new THREE.Mesh(new THREE.BoxGeometry(23.0, 4.0, 1.4), louverBackingMat);
  upperBacking.position.set(midX, 9.45, 13.70);
  staticGroup.add(upperBacking);

  // 56 crisp vertical natural wood louver fins across the upper facade (matching Image 2!)
  const louverCount = 56;
  const louverSpanW = 22.8;
  for (let i = 0; i < louverCount; i++) {
    const lx = midX - louverSpanW * 0.5 + (i / (louverCount - 1)) * louverSpanW;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.96, 0.26), woodLouverMat);
    fin.position.set(lx, 9.48, 14.48);
    staticGroup.add(fin);
  }
  const upperCapTrim = new THREE.Mesh(new THREE.BoxGeometry(23.2, 0.14, 0.45), woodLouverMat);
  upperCapTrim.position.set(midX, 11.46, 14.44);
  staticGroup.add(upperCapTrim);

  // Cantilevered Smooth Off-White Plaster Fascia Signboard Band (Y = 4.35 .. 7.45, Z = 14.78)
  const mainFascia = new THREE.Mesh(new THREE.BoxGeometry(25.0, 3.10, 0.96), plasterMat);
  mainFascia.position.set(midX, 5.90, 14.78);
  staticGroup.add(mainFascia);

  // Subtle top dark metal drip edge on fascia
  const fasciaTopLip = new THREE.Mesh(new THREE.BoxGeometry(25.04, 0.08, 1.00), darkGraniteMat);
  fasciaTopLip.position.set(midX, 7.45, 14.78);
  staticGroup.add(fasciaTopLip);

  // 7 Architectural Floodlight / Uplight Fixtures along top edge of fascia (matching Image 2!)
  for (let i = 0; i < 7; i++) {
    const fx = 331.4 + i * 3.63;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.34), darkGraniteMat);
    arm.position.set(fx, 7.52, 14.84);
    staticGroup.add(arm);

    const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.20), darkGraniteMat);
    lampHead.position.set(fx, 7.56, 14.98);
    lampHead.rotation.x = -0.35;
    staticGroup.add(lampHead);

    const lampLens = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.14), uplightBulbMat);
    lampLens.position.set(fx, 7.62, 14.96);
    staticGroup.add(lampLens);
  }

  // GIANT DUAL-BRAND SIGNAGE ON FASCIA ("FREELANCER" + "JOHN HENRY" + "CÔNG TY TNHH T.M.G")
  const fasciaLogoTex = createDualBrandFasciaTex();
  const fasciaLogoMat = new THREE.MeshStandardMaterial({
    map: fasciaLogoTex,
    emissive: 0xffffff,
    emissiveMap: fasciaLogoTex,
    emissiveIntensity: 0.12,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.35,
  });
  const fasciaSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(24.2, 3.02), fasciaLogoMat);
  fasciaSignPlane.userData.noMerge = true;
  fasciaSignPlane.position.set(midX, 5.90, 15.28);
  staticGroup.add(fasciaSignPlane);

  // Cantilevered East Side Fascia Band + Dual-Brand Sign facing Far-East Intersection (+X)
  const sideFascia = new THREE.Mesh(new THREE.BoxGeometry(0.60, 2.75, 22.8), plasterMat);
  sideFascia.position.set(maxX + 0.08, 5.95, 3.15);
  staticGroup.add(sideFascia);
  const sideFasciaTopLip = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 22.84), darkGraniteMat);
  sideFasciaTopLip.position.set(maxX + 0.08, 7.34, 3.15);
  staticGroup.add(sideFasciaTopLip);
  const sideFasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(21.0, 2.55), fasciaLogoMat);
  sideFasciaSign.rotation.y = Math.PI * 0.5;
  sideFasciaSign.userData.noMerge = true;
  sideFasciaSign.position.set(maxX + 0.40, 5.95, 3.15);
  staticGroup.add(sideFasciaSign);

  // Warm recessed soffit downlights under the front & East side fascia overhangs
  for (let dx = 331.2; dx <= 353.8; dx += 2.8) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), soffitLedMat);
    disc.position.set(dx, 4.34, 14.96);
    staticGroup.add(disc);
  }
  for (let sz = -6.0; sz <= 12.2; sz += 3.0) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), soffitLedMat);
    disc.position.set(maxX + 0.16, 4.55, sz);
    staticGroup.add(disc);
  }

  // =========================================================================
  // 3. SYMMETRICAL 3-BAY GLASS STOREFRONT, COLUMNS & AUTO SLIDING DOORS
  // =========================================================================
  // Four Smooth White Architectural Columns framing the 3 glass bays
  [
    { x: 330.9, w: 2.2 }, // West outer pier
    { x: 338.6, w: 2.0 }, // Left inner pier
    { x: 346.0, w: 2.0 }, // Right inner pier
    { x: 353.7, w: 2.2 }, // East outer pier
  ].forEach((col) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(col.w, 4.30, 0.72), plasterMat);
    pier.position.set(col.x, 2.22, 14.56);
    staticGroup.add(pier);
  });

  // Flanking Corner Shrub Planters (matching the two lush dark green bushes in Image 2!)
  [330.6, 354.0].forEach((hx) => {
    const planterBase = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.24, 0.76), darkGraniteMat);
    planterBase.position.set(hx, 0.12, 15.42);
    staticGroup.add(planterBase);
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.56, 0.66), hedgeMat);
    hedge.position.set(hx, 0.50, 15.42);
    staticGroup.add(hedge);
  });

  // Showcase Window Glass Panes (Left: FREELANCER X = 332.0..337.6, Right: JOHN HENRY X = 347.0..352.6)
  const leftWindowGlass = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.88, 0.06), glassMat);
  leftWindowGlass.position.set(334.8, 2.16, frontGlassZ);
  staticGroup.add(leftWindowGlass);

  const rightWindowGlass = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.88, 0.06), glassMat);
  rightWindowGlass.position.set(349.8, 2.16, frontGlassZ);
  staticGroup.add(rightWindowGlass);

  // Brushed-Silver Window Frame Perimeter Trim around Left & Right Showcase Bays
  [334.8, 349.8].forEach((wx) => {
    // Top & bottom rails
    [0.24, 4.10].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(5.66, 0.10, 0.12), brushedSilverMat);
      rail.position.set(wx, ry, frontGlassZ);
      staticGroup.add(rail);
    });
    // Left & right jambs
    [-2.78, 2.78].forEach((rx) => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.10, 3.92, 0.12), brushedSilverMat);
      jamb.position.set(wx + rx, 2.17, frontGlassZ);
      staticGroup.add(jamb);
    });
  });

  // Center Entrance Glass Framing & Overhead Transom (X = 339.6 .. 345.0)
  const centerTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.24, 0.06), glassMat);
  centerTransomGlass.position.set(midX, 3.50, frontGlassZ);
  staticGroup.add(centerTransomGlass);

  // Side fixed sidelights flanking the double door (339.6..340.5 & 344.1..345.0)
  [340.05, 344.55].forEach((sx) => {
    const sidelight = new THREE.Mesh(new THREE.BoxGeometry(0.90, 2.84, 0.06), glassMat);
    sidelight.position.set(sx, 1.50, frontGlassZ);
    staticGroup.add(sidelight);
  });

  // Silver entrance portal framing
  [339.65, 340.50, 344.10, 344.95].forEach((mx) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 4.06, 0.14), brushedSilverMat);
    post.position.set(mx, 2.10, frontGlassZ);
    staticGroup.add(post);
  });
  [2.90, 4.12].forEach((my) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.40, 0.10, 0.14), brushedSilverMat);
    bar.position.set(midX, my, frontGlassZ);
    staticGroup.add(bar);
  });

  // Proximity Sensor Pods on Center Entrance Header
  [frontGlassZ + 0.14, frontGlassZ - 0.14].forEach((sz) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), darkGraniteMat);
    pod.position.set(midX, 2.91, sz);
    staticGroup.add(pod);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.02), sensorLedMat);
    led.position.set(midX, 2.90, sz + (sz > frontGlassZ ? 0.042 : -0.042));
    staticGroup.add(led);
  });

  const doorThreshold = new THREE.Mesh(new THREE.BoxGeometry(3.66, 0.02, 0.22), brushedSilverMat);
  doorThreshold.position.set(midX, 0.085, frontGlassZ);
  staticGroup.add(doorThreshold);

  // BI-PARTING BRUSHED-SILVER DOUBLE SLIDING GLASS DOORS (matching Image 2!)
  const buildJhDoorLeaf = (isEastLeaf: boolean) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(1.74, 2.68, 0.045), glassMat);
    grp.add(glassPane);

    [-0.86, 0.86].forEach((sx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.76, 0.08), brushedSilverMat);
      stile.position.set(sx, 0, 0);
      grp.add(stile);
    });
    [1.35, -1.32].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.09, 0.08), brushedSilverMat);
      rail.position.set(0, ry, 0);
      grp.add(rail);
    });

    // Sleek horizontal push bar matching Image 2's center silver doors
    const midBar = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.055, 0.075), brushedSilverMat);
    midBar.position.set(0, -0.08, 0);
    grp.add(midBar);

    const hx = isEastLeaf ? -0.66 : 0.66;
    [-0.055, 0.055].forEach((hz) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 8), brushedSilverMat);
      handle.position.set(hx, 0.02, hz);
      grp.add(handle);
    });

    staticGroup.add(grp);
    return grp;
  };

  const westSlideStartX = 341.41;
  const eastSlideStartX = 343.19;
  const doorWestLeaf = buildJhDoorLeaf(false);
  doorWestLeaf.position.set(westSlideStartX, 1.46, frontGlassZ - 0.14);
  const doorEastLeaf = buildJhDoorLeaf(true);
  doorEastLeaf.position.set(eastSlideStartX, 1.46, frontGlassZ - 0.14);

  // EAST SIDE ENTRANCE (Z = 2.5 .. 6.1, Center = 4.3) + FLANKING DISPLAY WINDOWS (facing Ngã Tư Sơn Tây)
  [
    { cz: -1.9, len: 4.6 },
    { cz: 9.7, len: 4.2 },
  ].forEach(({ cz, len }) => {
    const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.74, len), glassMat);
    winPane.position.set(eastWallX, 2.23, cz);
    staticGroup.add(winPane);

    [0.38, 4.08].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, len + 0.06), brushedSilverMat);
      rail.position.set(eastWallX, ry, cz);
      staticGroup.add(rail);
    });
    [-len * 0.5, len * 0.5].forEach((dz) => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.78, 0.10), brushedSilverMat);
      jamb.position.set(eastWallX, 2.23, cz + dz);
      staticGroup.add(jamb);
    });
  });

  // East Side Entrance Overhead Transom, Frame & Proximity Sensor (Z = 2.5 .. 6.1)
  const sideTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.20, 3.60), glassMat);
  sideTransomGlass.position.set(eastWallX, 3.50, sideDoorZ);
  staticGroup.add(sideTransomGlass);

  [2.50, 6.10].forEach((pz) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.06, 0.09), brushedSilverMat);
    post.position.set(eastWallX, 2.10, pz);
    staticGroup.add(post);
  });
  [2.90, 4.10].forEach((my) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 3.66), brushedSilverMat);
    bar.position.set(eastWallX, my, sideDoorZ);
    staticGroup.add(bar);
  });
  [eastWallX + 0.14, eastWallX - 0.14].forEach((sx) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.32), darkGraniteMat);
    pod.position.set(sx, 2.91, sideDoorZ);
    staticGroup.add(pod);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.10), sensorLedMat);
    led.position.set(sx + (sx > eastWallX ? 0.042 : -0.042), 2.90, sideDoorZ);
    staticGroup.add(led);
  });
  const sideDoorThreshold = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 3.66), brushedSilverMat);
  sideDoorThreshold.position.set(eastWallX, 0.085, sideDoorZ);
  staticGroup.add(sideDoorThreshold);

  const sideNorthSlideStartZ = sideDoorZ - 0.89; // 3.41
  const sideSouthSlideStartZ = sideDoorZ + 0.89; // 5.19
  const sideDoorNorthLeaf = buildJhDoorLeaf(false);
  sideDoorNorthLeaf.rotation.y = Math.PI * 0.5;
  sideDoorNorthLeaf.position.set(eastWallX - 0.14, 1.46, sideNorthSlideStartZ);
  const sideDoorSouthLeaf = buildJhDoorLeaf(true);
  sideDoorSouthLeaf.rotation.y = Math.PI * 0.5;
  sideDoorSouthLeaf.position.set(eastWallX - 0.14, 1.46, sideSouthSlideStartZ);

  // =========================================================================
  // 4. SHOWCASE WINDOW DISPLAYS & WALKABLE BOUTIQUE INTERIOR
  // =========================================================================
  // LEFT WINDOW (FREELANCER Women's): Sleek white backdrop + mauve & emerald dress mannequins
  const leftWinPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 1.35), darkGraniteMat);
  leftWinPlinth.position.set(334.8, 0.16, 13.0);
  staticGroup.add(leftWinPlinth);
  staticGroup.add(
    buildBoutiqueMannequin(333.7, 0.24, 13.0, 0.12, clothMauveMat, clothMauveMat, mannequinMat, darkGraniteMat, true)
  );
  staticGroup.add(
    buildBoutiqueMannequin(335.9, 0.24, 13.0, -0.15, clothEmeraldMat, clothEmeraldMat, mannequinMat, darkGraniteMat, true)
  );

  // RIGHT WINDOW (JOHN HENRY Men's): Dark plinth + navy polo & cream shirt mannequins
  const rightWinPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 1.35), darkGraniteMat);
  rightWinPlinth.position.set(349.8, 0.16, 13.0);
  staticGroup.add(rightWinPlinth);
  staticGroup.add(
    buildBoutiqueMannequin(348.7, 0.24, 13.0, 0.10, clothCreamMat, clothCharcoalMat, mannequinMat, darkGraniteMat, false)
  );
  staticGroup.add(
    buildBoutiqueMannequin(350.9, 0.24, 13.0, -0.14, clothNavyMat, clothCharcoalMat, mannequinMat, darkGraniteMat, false)
  );

  // Center Interior Hero Mannequins visible straight through the open entrance glass (matching Image 2!)
  staticGroup.add(
    buildBoutiqueMannequin(340.6, 0.08, 10.6, 0.18, clothCreamMat, clothCharcoalMat, mannequinMat, warmOakMat, false)
  );
  staticGroup.add(
    buildBoutiqueMannequin(344.0, 0.08, 10.6, -0.18, clothCamelMat, clothNavyMat, mannequinMat, warmOakMat, false)
  );

  // West Wall (FREELANCER Women's Wall Racks & Wood Panelling)
  const westPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 21.0), warmOakMat);
  westPanel.position.set(330.35, 1.98, 3.0);
  staticGroup.add(westPanel);
  for (let wz = -5.5; wz <= 11.5; wz += 4.2) {
    staticGroup.add(
      buildGarmentRackIsland(330.9, 0.08, wz, 1.0, brushedSilverMat, warmOakMat, [
        clothMauveMat,
        clothCreamMat,
        clothEmeraldMat,
        clothBurgundyMat,
      ])
    );
  }

  // East Side Window Showcase Displays (seen from Far-East intersection!)
  const eastNorthWinPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 3.4), darkGraniteMat);
  eastNorthWinPlinth.position.set(353.3, 0.16, -1.9);
  staticGroup.add(eastNorthWinPlinth);
  staticGroup.add(
    buildBoutiqueMannequin(353.3, 0.24, -1.9, Math.PI * 0.48, clothNavyMat, clothCreamMat, mannequinMat, darkGraniteMat, false)
  );

  const eastSouthWinPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 3.2), darkGraniteMat);
  eastSouthWinPlinth.position.set(353.3, 0.16, 9.7);
  staticGroup.add(eastSouthWinPlinth);
  staticGroup.add(
    buildBoutiqueMannequin(353.3, 0.24, 9.7, Math.PI * 0.52, clothCamelMat, clothCharcoalMat, mannequinMat, darkGraniteMat, false)
  );

  // East Wall (JOHN HENRY Men's Wood Panelling & Wall Racks only on solid wall bays, leaving windows & side door clear)
  [
    { z1: -7.5, z2: -4.3 },
    { z1: 0.5, z2: 2.3 },
    { z1: 6.3, z2: 7.5 },
    { z1: 11.9, z2: 13.5 },
  ].forEach(({ z1, z2 }) => {
    const pan = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, z2 - z1), warmOakMat);
    pan.position.set(354.25, 1.98, (z1 + z2) * 0.5);
    staticGroup.add(pan);
  });
  [-5.9, 12.6].forEach((wz) => {
    staticGroup.add(
      buildGarmentRackIsland(353.7, 0.08, wz, 1.0, darkGraniteMat, warmOakMat, [
        clothNavyMat,
        clothCreamMat,
        clothCharcoalMat,
        clothCamelMat,
      ])
    );
  });

  // Interior Display Tables & Garment Islands (flanking wide center promenade)
  staticGroup.add(
    buildFoldedTable(336.1, 0.08, 7.1, 3.8, 1.5, plasterMat, brushedSilverMat, [
      clothMauveMat,
      clothCreamMat,
      clothEmeraldMat,
      clothCamelMat,
    ])
  );
  staticGroup.add(
    buildFoldedTable(348.5, 0.08, 7.1, 3.8, 1.5, plasterMat, darkGraniteMat, [
      clothNavyMat,
      clothCreamMat,
      clothCharcoalMat,
      clothCamelMat,
    ])
  );

  staticGroup.add(
    buildGarmentRackIsland(336.1, 0.08, 1.6, 3.8, brushedSilverMat, warmOakMat, garmentPalette)
  );
  staticGroup.add(
    buildGarmentRackIsland(348.5, 0.08, 1.6, 3.8, darkGraniteMat, warmOakMat, [
      clothNavyMat,
      clothCreamMat,
      clothCharcoalMat,
      clothCamelMat,
    ])
  );

  // Rear Cashwrap Counter & Backlit JOHN HENRY / FREELANCER Feature Wall (Z = -4.7)
  const checkoutDesk = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.02, 1.25), warmOakMat);
  checkoutDesk.position.set(midX, 0.59, -4.7);
  staticGroup.add(checkoutDesk);

  const checkoutTop = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.08, 1.38), plasterMat);
  checkoutTop.position.set(midX, 1.13, -4.7);
  staticGroup.add(checkoutTop);

  [339.6, 345.0].forEach((rx) => {
    const pos = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.08), darkGraniteMat);
    pos.position.set(rx, 1.37, -4.6);
    staticGroup.add(pos);
  });

  const rearWallTex = createRearFeatureWallTex();
  const rearWallMat = new THREE.MeshStandardMaterial({
    map: rearWallTex,
    emissive: 0xffffff,
    emissiveMap: rearWallTex,
    emissiveIntensity: 0.20,
    roughness: 0.45,
  });
  const rearSign = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 3.3), rearWallMat);
  rearSign.userData.noMerge = true;
  rearSign.position.set(midX, 2.45, -7.85);
  staticGroup.add(rearSign);

  // Warm Boutique Ceiling Light Panels
  for (let lz = -3.0; lz <= 12.5; lz += 3.8) {
    [335.2, midX, 349.4].forEach((lx) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.38), ceilingStripMat);
      panel.position.set(lx, 4.24, lz);
      staticGroup.add(panel);
    });
  }

  // =========================================================================
  // 5. OPERATING HOURS ROLLING SHUTTER (07:00 - 23:00) & ARCHITECTURAL LIGHTING
  // =========================================================================
  const shutterTex = createRollingShutterTexture({
    title: 'FREELANCER  •  JOHN HENRY',
    hoursLabel: 'MỞ CỬA: 07:00 - 23:00',
    accentHex: '#18181b',
    slatDarkHex: '#27272a',
    slatLightHex: '#3f3f46',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.60, metalness: 0.18 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'john_henry_main_door',
      axis: 'x',
      pos: frontGlassZ + 0.16,
      spanCenter: midX,
      width: 3.70,
      baseY: 0.08,
      topY: 2.86,
      thickness: 0.08,
    },
    shutterMat,
    brushedSilverMat
  );
  const sideShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'john_henry_side_door',
      axis: 'z',
      pos: eastWallX + 0.16,
      spanCenter: sideDoorZ,
      width: 3.70,
      baseY: 0.08,
      topY: 2.86,
      thickness: 0.08,
    },
    shutterMat,
    brushedSilverMat
  );

  // Exterior & Interior PointLights
  const porchLight = new THREE.PointLight(0xfff1d6, 4.6, 32.0, 0.95);
  porchLight.position.set(midX, 4.1, 16.5);
  scaledLights.push({ light: porchLight, dayInt: 4.6, nightInt: 19.0, getScale: () => 1.0 - mainShutter.progress });

  const sidePorchLight = new THREE.PointLight(0xfff1d6, 4.2, 30.0, 0.95);
  sidePorchLight.position.set(maxX + 1.8, 4.1, sideDoorZ);
  scaledLights.push({ light: sidePorchLight, dayInt: 4.2, nightInt: 17.5, getScale: () => 1.0 - mainShutter.progress });

  const upperLouverLight = new THREE.PointLight(0xfef3c7, 3.2, 26.0, 0.95);
  upperLouverLight.position.set(midX, 8.8, 16.2);
  scaledLights.push({ light: upperLouverLight, dayInt: 3.2, nightInt: 15.0, getScale: () => 1.0 });

  const hallLight = new THREE.PointLight(0xfffaf0, 5.8, 36.0, 0.95);
  hallLight.position.set(midX, 4.0, 4.0);
  scaledLights.push({ light: hallLight, dayInt: 5.8, nightInt: 22.0, getScale: () => 1.0 - mainShutter.progress });

  const leftWindowLight = new THREE.PointLight(0xfff7ed, 5.2, 28.0, 0.95);
  leftWindowLight.position.set(334.8, 3.8, 11.2);
  scaledLights.push({ light: leftWindowLight, dayInt: 5.2, nightInt: 20.0, getScale: () => 1.0 - mainShutter.progress });

  const rightWindowLight = new THREE.PointLight(0xfff7ed, 5.2, 28.0, 0.95);
  rightWindowLight.position.set(349.8, 3.8, 11.2);
  scaledLights.push({ light: rightWindowLight, dayInt: 5.2, nightInt: 20.0, getScale: () => 1.0 - mainShutter.progress });

  const rearCounterLight = new THREE.PointLight(0xfffaf0, 4.8, 28.0, 0.95);
  rearCounterLight.position.set(midX, 3.9, -2.5);
  scaledLights.push({ light: rearCounterLight, dayInt: 4.8, nightInt: 18.0, getScale: () => 1.0 - mainShutter.progress });

  const poolTex = createJohnHenryGlowPoolTex();
  const porchPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(porchPoolMat);
  const porchPool = new THREE.Mesh(new THREE.PlaneGeometry(23.6, 6.8), porchPoolMat);
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(midX, 0.042, 17.5);
  staticGroup.add(porchPool);

  const sidePool = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 20.0), porchPoolMat);
  sidePool.rotation.x = -Math.PI / 2;
  sidePool.position.set(maxX + 2.4, 0.042, 3.5);
  staticGroup.add(sidePool);

  let doorOpenAmount = 0.0;
  let sideDoorOpenAmount = 0.0;
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: JohnHenryNpcController | null,
    externalNpcNearDoor?: boolean
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isJohnHenryOpenAtHour(h);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (h < 7.0 || h >= 23.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      const nextP = Math.max(0, mainShutter.progress - dt * 1.1);
      setShutterProgress(mainShutter, nextP);
      setShutterProgress(sideShutter, nextP);
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
      setShutterProgress(sideShutter, 1.0);
    } else {
      closingElapsed += dt;
      const canClose = closingElapsed >= 15.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.7) {
        const nextP = Math.min(1.0, mainShutter.progress + dt * 0.85);
        setShutterProgress(mainShutter, nextP);
        setShutterProgress(sideShutter, nextP);
      }
    }
    wasOpen = isOpen;

    // Proximity-activated automatic sliding glass entrance doors (Front + East Side)
    const nearPlayerFront =
      !!playerPos &&
      Math.abs(playerPos.x - midX) <= 3.1 &&
      Math.abs(playerPos.z - frontGlassZ) <= 3.7 &&
      playerPos.y <= 3.5;
    const nearPlayerSide =
      !!playerPos &&
      Math.abs(playerPos.x - eastWallX) <= 3.7 &&
      Math.abs(playerPos.z - sideDoorZ) <= 3.1 &&
      playerPos.y <= 3.5;
    const nearNpc = Boolean(npcController?.hasNpcNearDoor()) || Boolean(externalNpcNearDoor);
    const sensorTriggered = nearPlayerFront || nearPlayerSide || nearNpc;

    const targetFrontDoor = (isOpen || !mainShutter.progress) && (nearPlayerFront || nearNpc) ? 1.0 : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetFrontDoor, Math.min(1, dt * 6.5));
    doorWestLeaf.position.x = westSlideStartX - doorOpenAmount * 1.65;
    doorEastLeaf.position.x = eastSlideStartX + doorOpenAmount * 1.65;

    const targetSideDoor = (isOpen || !sideShutter.progress) && (nearPlayerSide || nearNpc) ? 1.0 : 0.0;
    sideDoorOpenAmount = THREE.MathUtils.lerp(sideDoorOpenAmount, targetSideDoor, Math.min(1, dt * 6.5));
    sideDoorNorthLeaf.position.z = sideNorthSlideStartZ - sideDoorOpenAmount * 1.65;
    sideDoorSouthLeaf.position.z = sideSouthSlideStartZ + sideDoorOpenAmount * 1.65;

    const litScale = 1.0 - mainShutter.progress;
    fasciaLogoMat.emissiveIntensity = (0.08 + lampFactor * 0.24) * litScale;
    rearWallMat.emissiveIntensity = (0.18 + lampFactor * 0.34) * litScale;
    uplightBulbMat.emissiveIntensity = 0.40 + lampFactor * 0.85;
    soffitLedMat.emissiveIntensity = (0.42 + lampFactor * 0.55) * litScale;
    ceilingStripMat.emissiveIntensity = (0.44 + lampFactor * 0.48) * litScale;
    sensorLedMat.emissiveIntensity = isOpen ? (sensorTriggered ? 0.95 : 0.35) : 0.05;
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
// JOHN HENRY & FREELANCER NPC CONTROLLER (3 STAFF + 8 SHOPPERS + 2 SIDEWALK STROLLERS)
// =========================================================================
const JH_PROFILES = [
  { shirt: 0xf8fafc, pants: 0x1e293b, hair: 0x111827, skinHex: '#fbe0c8' },
  { shirt: 0x1e3a5f, pants: 0x0f172a, hair: 0x2c1a10, skinHex: '#f5c7a3' },
  { shirt: 0xb98b94, pants: 0x334155, hair: 0x18181b, skinHex: '#fbe0c8' },
  { shirt: 0x1f6e4a, pants: 0x1e293b, hair: 0x3b2314, skinHex: '#e8b48e' },
  { shirt: 0xc29b6c, pants: 0x111827, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0x334155, pants: 0x09090b, hair: 0x291c15, skinHex: '#fbe0c8' },
  { shirt: 0x6b2135, pants: 0x1e293b, hair: 0x1e1b4b, skinHex: '#f5c7a3' },
  { shirt: 0x0f172a, pants: 0x475569, hair: 0x4a2c18, skinHex: '#fbe0c8' },
];

type JohnHenryPhase =
  | 'respawn_wait'
  | 'walk_to_browse'
  | 'browsing'
  | 'walk_to_checkout'
  | 'at_checkout'
  | 'walk_leave';

interface JohnHenryActor {
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
  phase: JohnHenryPhase;
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

export class JohnHenryNpcController {
  public readonly rootGroup = new THREE.Group();
  private actors: JohnHenryActor[] = [];
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
    { pos: new THREE.Vector3(336.1, 0.08, 9.2), yaw: Math.PI }, // Freelancer Folded Table
    { pos: new THREE.Vector3(348.5, 0.08, 9.2), yaw: Math.PI }, // John Henry Folded Table
    { pos: new THREE.Vector3(336.1, 0.08, 3.6), yaw: Math.PI }, // Freelancer Garment Rack
    { pos: new THREE.Vector3(348.5, 0.08, 3.6), yaw: Math.PI }, // John Henry Garment Rack
    { pos: new THREE.Vector3(332.4, 0.08, 4.5), yaw: -Math.PI * 0.5 }, // West Freelancer Dress Wall
    { pos: new THREE.Vector3(352.2, 0.08, 4.5), yaw: Math.PI * 0.5 }, // East John Henry Menswear Wall
  ];

  constructor(private helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 });
    const staffShirtMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65 });
    const bagBodyMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ec, roughness: 0.58 });
    const bagStripeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 });

    this.profileMats = JH_PROFILES.map((p) => ({
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
      speed = 1.30
    ): JohnHenryActor => {
      const id = this.actors.length;
      const pm = this.profileMats[profileIdx % this.profileMats.length];
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.set(0, 0.80, 0);
      root.add(hipsGroup);

      const torsoMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.54, 0.24),
        kind === 'staff' ? staffShirtMat : pm.shirt
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
        kind === 'staff' ? staffShirtMat : pm.shirt
      );
      leftArmMesh.position.y = -0.20;
      leftArm.add(leftArmMesh);
      hipsGroup.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.27, 0.52, 0);
      const rightArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.44, 0.12),
        kind === 'staff' ? staffShirtMat : pm.shirt
      );
      rightArmMesh.position.y = -0.20;
      rightArm.add(rightArmMesh);
      hipsGroup.add(rightArm);

      // John Henry / Freelancer Cream & Black Boutique Bag
      const bagGroup = new THREE.Group();
      bagGroup.position.set(0.04, -0.52, 0.02);
      const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.30, 0.26), bagBodyMat);
      bagGroup.add(bagMesh);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.20), bagStripeMat);
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
      this.rootGroup.add(root);

      const seed = id * 1.71;
      const spec =
        kind === 'staff'
          ? id <= 1
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(id + 171)
          : kind === 'stroller'
            ? pickOutsideNpcModel(id + 183)
            : pickShopCustomerModel(id + 181);
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

      const actor: JohnHenryActor = {
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
                new THREE.Vector3(342.3, 0.08, -1.0),
                new THREE.Vector3(342.3, 0.08, 12.0),
                new THREE.Vector3(342.3, 0.02, 17.5),
                new THREE.Vector3(328.5 + id * 1.5, 0.02, 18.2),
              ]
            : undefined,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      };
      this.actors.push(actor);
      return actor;
    };

    // 1. Three Boutique Associates (2 Cashiers + 1 Floor Stylist)
    createActorRig('staff', 0, 340.3, 0.08, -6.1, 0);
    createActorRig('staff', 1, 344.3, 0.08, -6.1, 0);
    createActorRig('staff', 2, 347.2, 0.08, 8.2, -Math.PI * 0.45);

    // 2. Eight Dynamic Rotating Shoppers
    for (let i = 0; i < 8; i++) {
      createActorRig('shopper', i % this.profileMats.length, 342.3, 0.02, 18.0, Math.PI, 1.26 + (i % 3) * 0.08);
    }

    // 3. Two Promenade Sidewalk Walkers passing Skechers & John Henry
    createActorRig('stroller', 2, 333.5, 0.02, 18.8, Math.PI * 0.5, 1.22);
    createActorRig('stroller', 5, 349.5, 0.02, 17.7, -Math.PI * 0.5, 1.18);
  }

  private applyShopperProfile(a: JohnHenryActor, nextIdx: number) {
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

  private assignNewShopperArrival(a: JohnHenryActor, rotateProfile: boolean) {
    if (rotateProfile) {
      this.applyShopperProfile(a, a.profileIdx + 3 + (a.id % 4));
    }
    a.bagGroup.visible = false;
    a.leftLeg.rotation.x = 0;
    a.rightLeg.rotation.x = 0;

    const fromEast = this.nextSpawnSide++ % 2 === 0;
    const spawnX = fromEast ? 355.8 : 327.4;
    const spawnZ = 17.6 + (a.id % 3) * 0.45;
    a.root.position.set(spawnX, 0.02, spawnZ);
    a.root.visible = true;

    a.browseSpotIdx = (a.browseSpotIdx + 1) % this.browseSpots.length;
    const spot = this.browseSpots[a.browseSpotIdx];
    a.pathQueue = [
      new THREE.Vector3(342.3, 0.02, 16.8),
      new THREE.Vector3(342.3, 0.08, 12.2),
      new THREE.Vector3(342.3, 0.08, 9.2),
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

      if (shopperIdx < 4) {
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
        a.stateTimer = (shopperIdx - 4) * 1.4;
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
        new THREE.Vector3(342.3, 0.08, 10.5),
        new THREE.Vector3(342.3, 0.02, 16.8),
        new THREE.Vector3(leaveEast ? 355.8 : 327.4, 0.02, 18.2),
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
      if (p.x >= 340.1 && p.x <= 344.5 && p.z >= 11.4 && p.z <= 17.6) return true;
      if (p.x >= 351.8 && p.x <= 357.5 && p.z >= 2.2 && p.z <= 6.4) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: JohnHenryActor, dt: number): boolean {
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
    const isOpen = isJohnHenryOpenAtHour(h);

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
          new THREE.Vector3(342.3, 0.08, 10.5),
          new THREE.Vector3(342.3, 0.02, 16.8),
          new THREE.Vector3(327.4 + i * 2.0, 0.02, 18.2),
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
          if (a.strollNextPause <= 0 && a.root.position.x >= 332.0 && a.root.position.x <= 351.0) {
            a.strollPauseTimer = 2.6 + (a.id % 3) * 0.8;
            a.strollNextPause = 9.0 + (a.id % 3) * 2.5;
          }

          if (dir > 0 && a.root.position.x > 356.5) {
            a.strollDir = -1;
            this.applyShopperProfile(a, a.profileIdx + 3);
          } else if (dir < 0 && a.root.position.x < 326.8) {
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
          const payX = 339.8 + (a.id % 4) * 1.5;
          a.pathQueue = [
            new THREE.Vector3(342.3, 0.08, 1.5),
            new THREE.Vector3(payX, 0.08, -2.9),
          ];
          a.pathIdx = 0;
          a.waitYaw = Math.PI;
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
            new THREE.Vector3(342.3, 0.08, 2.0),
            new THREE.Vector3(342.3, 0.08, 12.2),
            new THREE.Vector3(342.3, 0.02, 16.8),
            new THREE.Vector3(leaveEast ? 355.8 : 327.4, 0.02, 18.2),
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
