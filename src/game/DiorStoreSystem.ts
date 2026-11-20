import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isDiorOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface DiorBuildResult {
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
    npcController?: DiorNpcController | null
  ) => void;
}

// =========================================================================
// DIOR FLAGSHIP BOUTIQUE — SCULPTED CANNAGE FLUTED LOUVERS & WAVING PARAPET
// Directly East of Saint Laurent (YSL) on North Side of Boulevard (X = 461.6 .. 487.6, Z = -11.6 .. 15.58)
// Faces South (+Z) toward Boulevard Sidewalk (Z = 15.58 .. 20.80) with curved SW corner facing YSL
// Podium Floor: Y = 0.18m (Floor 1 = 0.18, Floor 2 = 4.38, Wave Crest = 11.2m .. 13.8m)
// Entrance Portal Doors: X = 473.5, Z = 13.80 (3.2m clear automatic doors, 07:00 - 23:00)
// =========================================================================

export const DIOR_PODIUM_Y = 0.18;
export const DIOR_FLOOR_H = 4.2;

const DIOR_DOOR_X = 473.5;
const DIOR_DOOR_Z = 13.80;

export const DIOR_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 (Y = 0.18m) — Curved SE Corner Cannage Shell, Dual South Bays & East Bay
  // =========================================================================
  { minX: 461.4, maxX: 462.4, minZ: -11.8, maxZ: 15.6, floor: 1 }, // West Wall (adjacent to YSL)
  { minX: 486.8, maxX: 487.8, minZ: -11.8, maxZ: 15.6, floor: 1 }, // East Wall & East Showcase Bay
  { minX: 461.4, maxX: 487.8, minZ: -11.8, maxZ: -10.9, floor: 1 }, // North Rear Wall

  // South Facade split cleanly around Recessed Entrance Portal (X = 471.7 .. 475.3)
  { minX: 461.6, maxX: 471.65, minZ: 13.4, maxZ: 15.7, floor: 1 }, // Bay 1 Showcase Vitrine & West Framing
  { minX: 475.35, maxX: 487.6, minZ: 13.4, maxZ: 15.7, floor: 1 }, // Center-East Pier & SE Curved Corner

  // Floor 1 Interior Display Furniture & Stairwell Rails
  { minX: 462.7, maxX: 468.7, minZ: 11.4, maxZ: 13.5, floor: 1 }, // Bay 1 Front Window Couture Dress Plinth
  { minX: 482.2, maxX: 486.4, minZ: 8.4, maxZ: 13.3, floor: 1 }, // SE Corner Curved Couture Mannequin Stage
  { minX: 468.8, maxX: 471.6, minZ: 2.2, maxZ: 4.8, floor: 1 }, // West Lady Dior Quilted Bag Pedestal Island
  { minX: 475.8, maxX: 478.6, minZ: 2.2, maxZ: 4.8, floor: 1 }, // East Dior Saddle & Book Tote Island
  { minX: 462.4, maxX: 464.0, minZ: -7.5, maxZ: 7.5, floor: 1 }, // West Illuminated Cannage Bag Shelving
  { minX: 471.0, maxX: 476.2, minZ: -6.2, maxZ: -4.4, floor: 1 }, // Rear Marble & Brass Cashwrap Desk
  { minX: 464.6, maxX: 469.2, minZ: -10.8, maxZ: -9.0, floor: 1 }, // Miss Dior & J'adore Parfumerie Bar
  { minX: 477.4, maxX: 481.2, minZ: -10.8, maxZ: -9.0, floor: 1 }, // Dior Joaillerie Fine Jewelry Counter
  { minX: 472.0, maxX: 475.4, minZ: -1.8, maxZ: 0.6, floor: 1 }, // Center Champagne Bouclé Salon Bench
  { minX: 484.4, maxX: 486.6, minZ: 1.8, maxZ: 7.8, floor: 1 }, // East Showcase Window Couture Gown Stage

  // NE Switchback Stairwell Enclosure (X = 481.95..486.8, Z = -11.0..-4.0, divider X = 484.6)
  { minX: 481.85, maxX: 482.2, minZ: -11.0, maxZ: -4.0, floor: 1 }, // Stairwell West Balustrade
  { minX: 484.42, maxX: 484.78, minZ: -9.2, maxZ: -4.0, floor: 1 }, // Stairwell Center Spine
  { minX: 484.7, maxX: 486.8, minZ: -4.35, maxZ: -3.95, floor: 1 }, // Under-Stair Partition

  // =========================================================================
  // FLOOR 2 (Y = 4.38m) — Couture Gallery, Shoe Salon & Bridal Suite
  // =========================================================================
  { minX: 461.4, maxX: 462.4, minZ: -11.8, maxZ: 15.6, floor: 2 }, // West Wall
  { minX: 486.8, maxX: 487.8, minZ: -11.8, maxZ: 15.6, floor: 2 }, // East Wall
  { minX: 461.4, maxX: 487.8, minZ: -11.8, maxZ: -10.9, floor: 2 }, // North Rear Wall
  { minX: 461.6, maxX: 487.6, minZ: 13.0, maxZ: 15.7, floor: 2 }, // South Floor 2 Window Gallery Edge
  { minX: 481.85, maxX: 482.2, minZ: -11.0, maxZ: -4.0, floor: 2 }, // Stairwell West Balustrade
  { minX: 484.42, maxX: 484.78, minZ: -9.2, maxZ: -4.0, floor: 2 }, // Stairwell Center Spine
  { minX: 482.1, maxX: 484.5, minZ: -5.2, maxZ: -4.0, floor: 2 }, // Floor 2 Down-Bay Velvet Rope Guard
  { minX: 462.5, maxX: 464.2, minZ: -7.0, maxZ: 7.5, floor: 2 }, // West J'Adior Shoe & Accessory Wall
  { minX: 466.5, maxX: 472.5, minZ: -2.0, maxZ: 3.5, floor: 2 }, // VIP Bridal & Couture Salon Lounge
  { minX: 474.8, maxX: 480.0, minZ: 4.5, maxZ: 9.8, floor: 2 }, // Central Dior New Look Runway Plinth
];

// =========================================================================
// PROCEDURAL DIOR TEXTURES
// =========================================================================

function createDiorWordmarkTex(
  textColor = '#18181b',
  glowColor?: string,
  subtext?: string
): THREE.CanvasTexture {
  const w = 1024;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
  }
  ctx.fillStyle = textColor;
  ctx.font = '500 184px "Didot", "Bodoni MT", "Times New Roman", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const letters = ['D', 'I', 'O', 'R'];
  const spacing = 175;
  const startX = w * 0.5 - (letters.length - 1) * spacing * 0.5;
  const centerY = subtext ? h * 0.43 : h * 0.52;
  for (let i = 0; i < letters.length; i++) {
    ctx.fillText(letters[i], startX + i * spacing, centerY);
  }

  if (subtext) {
    ctx.shadowBlur = 8;
    ctx.font = '600 32px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(subtext, w * 0.5, h * 0.84);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}


function createDiorCannageWallTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#f4ead5');
  grad.addColorStop(0.5, '#f9f2e3');
  grad.addColorStop(1, '#e7d7b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Classic Dior Cannage woven pattern
  ctx.strokeStyle = 'rgba(184, 146, 78, 0.34)';
  ctx.lineWidth = 3;
  const step = 64;
  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, h);
    ctx.lineTo(i + h, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.24)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDiorFloorMarbleTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, w, h);

  // Subtle cream travertine & champagne diamond inlay
  ctx.strokeStyle = '#d6c7b2';
  ctx.lineWidth = 3;
  const cell = 128;
  for (let x = 0; x <= w; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(196, 164, 114, 0.28)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 45; i++) {
    const x = (i * 83) % w;
    const y = (i * 57) % h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 35, y + 18, x + 78, y - 10);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDiorToteBagTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fcfaf5';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 108, 108);
  ctx.fillStyle = '#18181b';
  ctx.font = '600 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DIOR', 64, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDiorPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 232, 179, 0.42)');
  grad.addColorStop(0.55, 'rgba(246, 208, 130, 0.16)');
  grad.addColorStop(1, 'rgba(246, 208, 130, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================================
// MAIN STRUCTURE BUILDER
// =========================================================================

export function createDiorStoreStructure(): DiorBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = 461.6;
  const maxX = 487.6;
  const midX = (minX + maxX) * 0.5; // 474.6
  const widthX = maxX - minX; // 26.0
  const minZ = -11.6;
  const maxZ = 15.58;
  const midZ = (minZ + maxZ) * 0.5; // 1.99
  const depthZ = maxZ - minZ; // 27.18

  const f1Y = DIOR_PODIUM_Y; // 0.18
  const f2Y = DIOR_PODIUM_Y + DIOR_FLOOR_H; // 4.38
  const roofBaseY = 9.95;

  // Materials
  const champagneIvoryMat = new THREE.MeshStandardMaterial({
    color: 0xf4ead7,
    roughness: 0.34,
    metalness: 0.28,
  });
  const warmLouversMat = new THREE.MeshStandardMaterial({
    color: 0xf7efe0,
    emissive: 0xffe4ad,
    emissiveIntensity: 0.16,
    roughness: 0.28,
    metalness: 0.35,
  });
  lanternMats.push(warmLouversMat);

  const charcoalSlateMat = new THREE.MeshStandardMaterial({
    color: 0x2a2d34,
    roughness: 0.52,
    metalness: 0.22,
  });
  const darkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x1e2024,
    roughness: 0.35,
    metalness: 0.72,
  });
  const champagneBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd9b978,
    roughness: 0.22,
    metalness: 0.85,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xeaf4fc,
    roughness: 0.08,
    metalness: 0.12,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const warmBacklitMat = new THREE.MeshStandardMaterial({
    color: 0xfff5db,
    emissive: 0xffdf99,
    emissiveIntensity: 0.72,
    roughness: 0.3,
  });
  lanternMats.push(warmBacklitMat);

  const cannageLedMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffd573,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  neonMats.push(cannageLedMat);

  const floorTex = createDiorFloorMarbleTex();
  const marbleFloorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.24,
    metalness: 0.08,
  });
  const cannageWallTex = createDiorCannageWallTex();
  const cannageWallMat = new THREE.MeshStandardMaterial({
    map: cannageWallTex,
    emissive: 0xffe4a8,
    emissiveMap: cannageWallTex,
    emissiveIntensity: 0.28,
    roughness: 0.35,
  });
  lanternMats.push(cannageWallMat);

  const woodFloorMat = new THREE.MeshStandardMaterial({
    color: 0xc29e73,
    roughness: 0.45,
  });
  const velvetCreamMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.78 });
  const velvetBlushMat = new THREE.MeshStandardMaterial({ color: 0xe6c3c6, roughness: 0.78 });
  const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.25, metalness: 0.4 });
  const interiorCeilMat = new THREE.MeshStandardMaterial({ color: 0xf8f3eb, roughness: 0.65 });

  // Helper to add box
  const addBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    parent: THREE.Group = staticGroup
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // =========================================================================
  // 1. PODIUM SLABS, FLOORS, CEILINGS & SHELL WALLS
  // =========================================================================
  // Ground podium slab trimmed cleanly to SE curved corner (Y = 0..0.18)
  addBox(471.2, f1Y * 0.5, midZ, 19.2, f1Y, depthZ, marbleFloorMat);
  addBox(484.2, f1Y * 0.5, -1.41, 6.8, f1Y, 20.38, marbleFloorMat);
  const podiumCorner = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 6.8, f1Y, 32, 1, false, 0, Math.PI * 0.5),
    marbleFloorMat
  );
  podiumCorner.position.set(480.8, f1Y * 0.5, 8.78);
  staticGroup.add(podiumCorner);
  // Entry ramp threshold apron connecting Boulevard sidewalk (Z = 15.58, Y = 0) -> Doorway (Z = 13.8, Y = 0.18)
  const apronSlope = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 1.9), marbleFloorMat);
  apronSlope.position.set(DIOR_DOOR_X, f1Y * 0.45, 14.7);
  apronSlope.rotation.x = Math.atan2(f1Y, 1.85);
  staticGroup.add(apronSlope);

  // Rear North Wall & Solid West Wall (inset strictly behind facade backing plates)
  addBox(midX, 5.4, minZ + 0.35, widthX - 0.8, 10.8, 0.7, champagneIvoryMat);
  addBox(minX + 0.35, 5.4, 1.75, 0.7, 10.8, 26.7, champagneIvoryMat);

  // East Wall solid back section (Z = -11.6 .. 1.35, inset to X=486.5..487.2) + East Double-Height Showcase Frame (Z = 1.4 .. 8.0)
  addBox(maxX - 0.75, 5.4, -5.12, 0.7, 10.8, 12.95, champagneIvoryMat);
  // East Showcase Charcoal Spandrel (Y = 4.35 .. 6.05), Brass Frame & Glass Vitrines (Z = 1.4 .. 8.0, center 4.7)
  addBox(maxX - 0.14, 5.20, 4.7, 0.56, 1.70, 6.6, charcoalSlateMat);
  addBox(maxX - 0.10, 9.88, 4.7, 0.62, 0.14, 6.72, champagneBrassMat);
  addBox(maxX - 0.10, 5.02, 1.35, 0.62, 9.8, 0.14, champagneBrassMat);
  addBox(maxX - 0.10, 5.02, 8.05, 0.62, 9.8, 0.14, champagneBrassMat);
  addBox(maxX - 0.08, 2.26, 4.7, 0.06, 4.14, 6.55, glassMat);
  addBox(maxX - 0.08, 7.92, 4.7, 0.06, 3.72, 6.55, glassMat);

  // Glowing White DIOR Serif Sign material for Charcoal Spandrels
  const diorWhiteTex = createDiorWordmarkTex('#ffffff', 'rgba(255, 248, 225, 0.95)');
  const diorWhiteMat = new THREE.MeshStandardMaterial({
    map: diorWhiteTex,
    transparent: true,
    emissive: 0xfff8e7,
    emissiveMap: diorWhiteTex,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  neonMats.push(diorWhiteMat);

  // East Showcase Spandrel Sign (facing +X toward the East avenue & boulevard)
  const eastSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.05), diorWhiteMat);
  eastSign.position.set(maxX + 0.19, 5.20, 4.7);
  eastSign.rotation.y = Math.PI * 0.5;
  eastSign.userData.noMerge = true;
  staticGroup.add(eastSign);

  // Floor 2 Mezzanine Slab (leaving stairwell cutout X=482.0..486.8, Z=-11.0..-4.0 and double-height front/corner glow)
  addBox(471.4, f2Y - 0.14, 1.8, 19.4, 0.28, 25.4, marbleFloorMat);
  addBox(483.8, f2Y - 0.14, 4.5, 4.8, 0.28, 17.0, marbleFloorMat);
  // Ceiling under Roof (strictly inset inside facade louvers & trimmed at SE curve)
  addBox(471.5, roofBaseY + 0.2, 2.0, 18.4, 0.4, 25.6, interiorCeilMat);
  addBox(483.6, roofBaseY + 0.2, -1.0, 5.8, 0.4, 19.6, interiorCeilMat);
  const ceilCorner = new THREE.Mesh(
    new THREE.CylinderGeometry(6.1, 6.1, 0.4, 28, 1, false, 0, Math.PI * 0.5),
    interiorCeilMat
  );
  ceilCorner.position.set(480.8, roofBaseY + 0.2, 8.78);
  staticGroup.add(ceilCorner);

  // =========================================================================
  // 2. SIGNATURE DIOR FACADE — CURVED SE CORNER, VERTICAL FLUTED LOUVERS,
  //    WAVING SCULPTURAL ROOFLINE & CRISP CANNAGE LED ACCENTS (IMAGE 2)
  // =========================================================================
  // Curved SE corner center: cx = 480.8, cz = 8.78, R = 6.80
  // Spans angle theta = 0 (East X=487.6, Z=8.78) to PI/2 (South X=480.8, Z=15.58)
  const curveCx = 480.8;
  const curveCz = 8.78;
  const curveR = 6.80;

  // Interior double-sided curved Cannage shell at radius 6.32 so louver backs are NEVER visible from inside
  const innerCurvedWall = new THREE.Mesh(
    new THREE.CylinderGeometry(curveR - 0.48, curveR - 0.48, 10.2, 32, 1, true, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({
      map: cannageWallTex,
      emissive: 0xffe4a8,
      emissiveMap: cannageWallTex,
      emissiveIntensity: 0.24,
      roughness: 0.36,
      side: THREE.DoubleSide,
    })
  );
  innerCurvedWall.position.set(curveCx, 5.1, curveCz);
  staticGroup.add(innerCurvedWall);

  // Sculptural Wavy Roofline Height Function (matches Image 2: dramatic tall crest at curved SE corner, deep graceful wave dip across South bays toward YSL)
  const sampleWaveRoofY = (x: number, z: number): number => {
    if (x >= curveCx && z >= curveCz) {
      // Curved SE corner rises seamlessly from 13.15m (East end) to 14.85m peak crest above DIOR logo, then sweeps toward South
      const ang = Math.atan2(z - curveCz, x - curveCx); // 0 at East -> PI/2 at South
      const t = THREE.MathUtils.clamp(ang / (Math.PI * 0.5), 0, 1);
      return 13.15 + Math.sin(t * Math.PI * 0.85 + 0.15) * 1.65;
    }
    if (z >= curveCz) {
      // South Front (from curveCx=480.8 leftwards toward YSL minX=461.6)
      const u = THREE.MathUtils.clamp((curveCx - x) / (curveCx - minX), 0, 1);
      return 13.38 - u * 2.45 - Math.sin(u * Math.PI * 1.45) * 1.15 + Math.cos(u * Math.PI * 2.2) * 0.35;
    }
    // East Facade (from curveCz=8.78 northwards toward minZ=-11.6)
    const v = THREE.MathUtils.clamp((curveCz - z) / (curveCz - minZ), 0, 1);
    return 13.15 - v * 2.35 - Math.sin(v * Math.PI * 1.1) * 0.55;
  };

  // Instanced Vertical Champagne-Gold Louvers + Recessed Warm Golden Backing Strips (zero z-fighting!)
  interface LouverSpec {
    x: number;
    z: number;
    h: number;
    bottomY: number;
    rotY: number;
  }
  const louvers: LouverSpec[] = [];
  const backPlates: LouverSpec[] = [];

  // A. SE Curved Corner louvers & curved backlit backing (theta = 0 .. PI/2)
  const arcSteps = 44;
  for (let i = 0; i <= arcSteps; i++) {
    const t = i / arcSteps;
    const theta = t * (Math.PI * 0.5);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const lx = curveCx + cosT * curveR;
    const lz = curveCz + sinT * curveR;
    const topY = sampleWaveRoofY(lx, lz);
    const rotY = Math.PI * 0.5 - theta; // local +Z faces outward (+cosT, +sinT)
    louvers.push({ x: lx, z: lz, bottomY: 0.0, h: topY, rotY });

    const bx = curveCx + cosT * (curveR - 0.24);
    const bz = curveCz + sinT * (curveR - 0.24);
    backPlates.push({ x: bx, z: bz, bottomY: 0.0, h: topY - 0.30, rotY });
  }

  // B. Straight South Facade louvers (X = 461.75 .. 480.60)
  // Bay 1 (Showcase Vitrine): X = 462.6 .. 468.8 (center 465.7)
  // Bay 2 (Entrance Portal): X = 470.4 .. 476.6 (center 473.5)
  for (let lx = minX + 0.16; lx <= curveCx - 0.18; lx += 0.24) {
    const topY = sampleWaveRoofY(lx, maxZ);
    const inBay1 = lx >= 462.6 && lx <= 468.8;
    const inBay2 = lx >= 470.4 && lx <= 476.6;
    if (inBay1 || inBay2) {
      const h = Math.max(0.6, topY - 9.96);
      louvers.push({ x: lx, z: maxZ, bottomY: 9.96, h, rotY: 0 });
      backPlates.push({ x: lx, z: maxZ - 0.24, bottomY: 9.96, h: Math.max(0.4, h - 0.28), rotY: 0 });
    } else {
      louvers.push({ x: lx, z: maxZ, bottomY: 0.0, h: topY, rotY: 0 });
      backPlates.push({ x: lx, z: maxZ - 0.24, bottomY: 0.0, h: topY - 0.28, rotY: 0 });
    }
  }

  // C. Straight East Facade louvers wrapping cleanly past East Showcase Bay (Z = -11.4 .. 8.58)
  for (let lz = minZ + 0.20; lz <= curveCz - 0.18; lz += 0.24) {
    const topY = sampleWaveRoofY(maxX, lz);
    const inEastBay = lz >= 1.4 && lz <= 8.0;
    if (inEastBay) {
      const h = Math.max(0.6, topY - 9.96);
      louvers.push({ x: maxX, z: lz, bottomY: 9.96, h, rotY: Math.PI * 0.5 });
      backPlates.push({ x: maxX - 0.24, z: lz, bottomY: 9.96, h: Math.max(0.4, h - 0.28), rotY: Math.PI * 0.5 });
    } else {
      louvers.push({ x: maxX, z: lz, bottomY: 0.0, h: topY, rotY: Math.PI * 0.5 });
      backPlates.push({ x: maxX - 0.24, z: lz, bottomY: 0.0, h: topY - 0.28, rotY: Math.PI * 0.5 });
    }
  }

  const dummy = new THREE.Object3D();
  const finGeo = new THREE.BoxGeometry(0.085, 1.0, 0.22);
  const finInstanced = new THREE.InstancedMesh(finGeo, warmLouversMat, louvers.length);
  finInstanced.userData.noMerge = true;
  for (let i = 0; i < louvers.length; i++) {
    const lv = louvers[i];
    dummy.position.set(lv.x, lv.bottomY + lv.h * 0.5, lv.z);
    dummy.rotation.set(0, lv.rotY, 0);
    dummy.scale.set(1, lv.h, 1);
    dummy.updateMatrix();
    finInstanced.setMatrixAt(i, dummy.matrix);
  }
  finInstanced.instanceMatrix.needsUpdate = true;
  staticGroup.add(finInstanced);

  const backGeo = new THREE.BoxGeometry(0.28, 1.0, 0.10);
  const backInstanced = new THREE.InstancedMesh(backGeo, warmBacklitMat, backPlates.length);
  backInstanced.userData.noMerge = true;
  for (let i = 0; i < backPlates.length; i++) {
    const bp = backPlates[i];
    dummy.position.set(bp.x, bp.bottomY + bp.h * 0.5, bp.z);
    dummy.rotation.set(0, bp.rotY, 0);
    dummy.scale.set(1, bp.h, 1);
    dummy.updateMatrix();
    backInstanced.setMatrixAt(i, dummy.matrix);
  }
  backInstanced.instanceMatrix.needsUpdate = true;
  staticGroup.add(backInstanced);

  // Diagonal & Horizontal Cannage LED Light Ribbons sitting cleanly proud of louver outer tips (+0.145m, zero Z-fighting!)
  const addCannageLedBar = (x: number, y: number, z: number, len: number, rotZ: number, rotY = 0) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.055, 0.036), cannageLedMat);
    bar.position.set(x, y, z);
    bar.rotation.order = 'YXZ';
    bar.rotation.y = rotY;
    bar.rotation.z = rotZ;
    staticGroup.add(bar);
  };

  // Diagonal Cannage ribbons sweeping across the curved SE corner (sitting at curveR + 0.145 = 6.945m)
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    const theta = t * (Math.PI * 0.46) + 0.04;
    const rx = curveCx + Math.cos(theta) * (curveR + 0.145);
    const rz = curveCz + Math.sin(theta) * (curveR + 0.145);
    const ry = Math.PI * 0.5 - theta;
    addCannageLedBar(rx, 2.3 + (i % 3) * 2.5, rz, 2.6, 0.78, ry);
    addCannageLedBar(rx, 3.2 + ((i + 1) % 3) * 2.3, rz, 2.5, -0.78, ry);
    addCannageLedBar(rx, 5.2 + (i % 2) * 3.1, rz, 1.85, 0.0, ry);
  }
  // Diagonal & horizontal Cannage LED accents across South piers & attic crown (maxZ + 0.145)
  [469.6, 478.7].forEach((px, idx) => {
    addCannageLedBar(px, 2.9 + idx * 0.8, maxZ + 0.145, 1.5, 0.78, 0);
    addCannageLedBar(px, 6.2 - idx * 0.4, maxZ + 0.145, 1.5, -0.78, 0);
    addCannageLedBar(px, 8.7, maxZ + 0.145, 1.35, 0.0, 0);
  });
  for (let lx = 463.8; lx <= 479.5; lx += 3.2) {
    addCannageLedBar(lx, 10.45, maxZ + 0.145, 1.5, 0.62, 0);
    addCannageLedBar(lx + 0.9, 10.55, maxZ + 0.145, 1.4, -0.62, 0);
  }
  // East showcase flanking Cannage accents (maxX + 0.145)
  [-4.5, 0.2].forEach((pz, idx) => {
    addCannageLedBar(maxX + 0.145, 3.2 + idx * 1.1, pz, 1.8, 0.78, Math.PI * 0.5);
    addCannageLedBar(maxX + 0.145, 6.4 - idx * 0.6, pz, 1.8, -0.78, Math.PI * 0.5);
  });

  // Stepped Rooftop Terrace Behind the Wavy Louver Parapet (dark stepped upper mall architecture & greenery, Image 2)
  addBox(midX - 0.6, 11.4, midZ - 1.8, widthX - 3.2, 2.4, depthZ - 5.8, darkBronzeMat);
  addBox(midX - 0.6, 12.15, midZ - 1.8, widthX - 3.05, 0.22, depthZ - 5.65, champagneBrassMat);
  const terraceGreeneryMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });
  for (let gx = 464.5; gx <= 481.5; gx += 3.4) {
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 7), terraceGreeneryMat);
    bush.scale.set(1.2, 0.75, 0.9);
    bush.position.set(gx, 12.85, 9.2);
    staticGroup.add(bush);
  }

  // =========================================================================
  // 3. CURVED 3D DIOR CROWN LETTERING + TWO SOUTH DOUBLE-HEIGHT BAYS
  // =========================================================================
  // Curved architectural D I O R crown arc hugging SE curved crest seamlessly (zero louver/ribbon clipping, 1 draw call)
  const crownTex = createDiorWordmarkTex('#141418', 'rgba(255, 226, 150, 0.88)');
  const crownMat = new THREE.MeshStandardMaterial({
    map: crownTex,
    transparent: true,
    alphaTest: 0.12,
    roughness: 0.22,
    metalness: 0.55,
  });
  const crownR = curveR + 0.19;
  const crownArc = new THREE.Mesh(
    new THREE.CylinderGeometry(crownR, crownR, 1.95, 32, 1, true, Math.PI * 0.075, Math.PI * 0.35),
    crownMat
  );
  crownArc.position.set(curveCx, 11.85, curveCz);
  crownArc.userData.noMerge = true;
  staticGroup.add(crownArc);

  // Two South Window Bay Columns (Bay 1 = Couture Showcase X=465.7, Bay 2 = Recessed Portal X=473.5)
  [465.7, 473.5].forEach((bx, bayIdx) => {
    // Charcoal-slate spandrel band dividing Floor 1 & Floor 2 (Y = 4.35 .. 6.05)
    addBox(bx, 5.20, maxZ - 0.12, 6.2, 1.70, 0.56, charcoalSlateMat);
    // Champagne brass trim around the entire double-height column frame
    addBox(bx, 9.88, maxZ - 0.08, 6.32, 0.14, 0.62, champagneBrassMat);
    addBox(bx - 3.12, 5.02, maxZ - 0.08, 0.14, 9.8, 0.62, champagneBrassMat);
    addBox(bx + 3.12, 5.02, maxZ - 0.08, 0.14, 9.8, 0.62, champagneBrassMat);

    // Glowing White DIOR Serif Sign centered on each charcoal spandrel band
    const baySign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.05), diorWhiteMat);
    baySign.position.set(bx, 5.20, maxZ + 0.19);
    baySign.userData.noMerge = true;
    staticGroup.add(baySign);

    // Floor 2 Clear Display Window (Y = 6.05 .. 9.80)
    addBox(bx, 7.92, maxZ - 0.05, 6.05, 3.72, 0.06, glassMat);

    if (bayIdx === 0) {
      // Bay 1 Floor 1 Glass Couture Vitrine (Y = 0.18 .. 4.35)
      addBox(bx, 2.26, maxZ - 0.05, 6.05, 4.14, 0.06, glassMat);
    }
  });

  // =========================================================================
  // 4. AUTOMATIC SLIDING GLASS PORTAL DOORS & NIGHT ROLLING SHUTTER (BAY 2: X = 473.5)
  // =========================================================================
  // Side glass sidelights framing the 3.2m automatic doorway inside Bay 2 (Z = 13.80 .. 15.58)
  addBox(471.05, 2.26, 14.65, 1.25, 4.15, 0.08, glassMat);
  addBox(475.95, 2.26, 14.65, 1.25, 4.15, 0.08, glassMat);
  const vestCeil = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.18, 1.85), interiorCeilMat);
  vestCeil.position.set(473.5, 4.26, 14.65);
  staticGroup.add(vestCeil);

  const doorL = new THREE.Group();
  const doorR = new THREE.Group();
  [
    { grp: doorL, side: -1 },
    { grp: doorR, side: 1 },
  ].forEach(({ grp, side }) => {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.58, 3.92, 0.06), glassMat);
    grp.add(glass);
    // Brass perimeter & pull handle
    addBox(0, 1.96, 0, 1.62, 0.07, 0.08, champagneBrassMat, grp);
    addBox(0, -1.96, 0, 1.62, 0.07, 0.08, champagneBrassMat, grp);
    addBox(side * 0.78, 0, 0, 0.07, 3.96, 0.08, champagneBrassMat, grp);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 10), champagneBrassMat);
    handle.position.set(-side * 0.62, 0, 0.08);
    grp.add(handle);
    grp.userData.noMerge = true;
    staticGroup.add(grp);
  });
  doorL.position.set(DIOR_DOOR_X - 0.81, f1Y + 2.0, DIOR_DOOR_Z);
  doorR.position.set(DIOR_DOOR_X + 0.81, f1Y + 2.0, DIOR_DOOR_Z);

  // Rolling Security Shutter for off-hours (23:00 - 07:00)
  const shutterTex = createRollingShutterTexture({
    title: 'DIOR PARIS',
    hoursLabel: 'OPEN DAILY: 07:00 - 23:00',
    accentHex: '#d4af37',
    slatDarkHex: '#1e1f24',
    slatLightHex: '#3f424b',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.40,
    metalness: 0.65,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'dior_main_shutter',
      axis: 'x',
      pos: DIOR_DOOR_Z + 0.14,
      spanCenter: DIOR_DOOR_X,
      width: 3.45,
      baseY: f1Y,
      topY: f1Y + 4.08,
      thickness: 0.12,
    },
    shutterMat,
    darkBronzeMat
  );

  // =========================================================================
  // 5. FLOOR 1 INTERIOR — LADY DIOR SALON, COUTURE STAGE, J'ADORE PARFUMERIE
  // =========================================================================
  // Cannage illuminated wall screens along Floor 1 walls
  addBox(minX + 0.76, f1Y + 2.1, -1.6, 0.12, 3.8, 11.4, cannageWallMat);
  addBox(473.5, f1Y + 2.1, minZ + 0.76, 15.0, 3.8, 0.12, cannageWallMat);

  // Sculpted Fluted Interior Columns
  [
    [468.5, 4.2],
    [477.5, 4.2],
    [468.5, -3.5],
    [477.5, -3.5],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, DIOR_FLOOR_H, 16), champagneIvoryMat);
    col.position.set(cx, f1Y + DIOR_FLOOR_H * 0.5, cz);
    staticGroup.add(col);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.14, 16), champagneBrassMat);
    ring.position.set(cx, f1Y + 0.08, cz);
    staticGroup.add(ring);
  });

  // Helper: Sculpted Haute Couture Mannequin (New Look A-line / Bar Jacket)
  const addCoutureMannequin = (x: number, y: number, z: number, dressHex: number, yaw = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    const dressMat = new THREE.MeshStandardMaterial({ color: dressHex, roughness: 0.52 });
    const formMat = new THREE.MeshStandardMaterial({ color: 0xfaf6ef, roughness: 0.3 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.06, 16), champagneBrassMat);
    base.position.y = 0.03;
    g.add(base);
    const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), champagneBrassMat);
    standPole.position.y = 0.45;
    g.add(standPole);

    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.92, 18), dressMat);
    skirt.position.y = 0.82;
    g.add(skirt);
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 12), dressMat);
    waist.position.y = 1.26;
    g.add(waist);
    const bust = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.32, 12), dressMat);
    bust.position.y = 1.48;
    g.add(bust);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), formMat);
    head.position.y = 1.76;
    g.add(head);

    staticGroup.add(g);
  };

  // Floor 1 Bay 1 Front Window Couture Stage (X = 462.6..468.8, Z = 11.8..13.2) — glowing golden backdrop!
  addBox(465.7, f1Y + 0.16, 12.4, 5.8, 0.32, 1.8, marbleFloorMat);
  addBox(465.7, f1Y + 2.1, 11.45, 5.8, 3.8, 0.12, cannageWallMat);
  addCoutureMannequin(463.9, f1Y + 0.32, 12.45, 0xf8f3eb, 0.15);
  addCoutureMannequin(465.7, f1Y + 0.32, 12.45, 0xe8b4bc, 0.0);
  addCoutureMannequin(467.5, f1Y + 0.32, 12.45, 0x18181b, -0.15);

  // SE Curved Corner Couture Stage (X = 484.2, Z = 10.8) — framed smoothly inside curved Cannage shell!
  addBox(484.2, f1Y + 0.16, 10.8, 3.4, 0.32, 4.2, marbleFloorMat);
  addCoutureMannequin(483.2, f1Y + 0.32, 11.9, 0xf3e5d0, -Math.PI * 0.25);
  addCoutureMannequin(484.3, f1Y + 0.32, 10.7, 0xd4af37, -Math.PI * 0.28);
  addCoutureMannequin(485.0, f1Y + 0.32, 9.5, 0x27272a, -Math.PI * 0.32);

  // Lady Dior & Saddle Bag Display Islands (West X=470.2 & East X=477.2, Z=3.5)
  const addHandbagPedestalIsland = (ix: number, iz: number, bagColors: number[]) => {
    addBox(ix, f1Y + 0.46, iz, 2.6, 0.92, 2.2, velvetCreamMat);
    addBox(ix, f1Y + 0.94, iz, 2.68, 0.06, 2.28, champagneBrassMat);
    bagColors.forEach((hex, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const bx = ix - 0.8 + col * 0.8;
      const bz = iz - 0.5 + row * 1.0;
      const bagMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.28, metalness: 0.18 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.16), bagMat);
      body.position.set(bx, f1Y + 1.12, bz);
      staticGroup.add(body);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 8, 14, Math.PI), champagneBrassMat);
      handle.position.set(bx, f1Y + 1.25, bz);
      staticGroup.add(handle);
    });
  };
  addHandbagPedestalIsland(470.2, 3.5, [0xf9e6ea, 0x18181b, 0xd4af37, 0xf5f5f4, 0x9f1239, 0x64748b]);
  addHandbagPedestalIsland(477.2, 3.5, [0x18181b, 0xd8c3a5, 0xfde2e4, 0x78350f, 0x334155, 0xf5efe6]);

  // West Wall Illuminated Handbag Niche Shelving
  addBox(minX + 1.05, f1Y + 1.85, -1.6, 0.7, 3.7, 11.0, champagneIvoryMat);
  for (let row = 0; row < 3; row++) {
    const sy = f1Y + 0.95 + row * 0.92;
    addBox(minX + 1.35, sy, -1.6, 0.45, 0.05, 10.4, champagneBrassMat);
    for (let z = -6.0; z <= 3.0; z += 1.5) {
      const bagColor = [0xfce7f3, 0x18181b, 0xfef3c7, 0x991b1b, 0xe2e8f0][Math.abs(Math.round(z + row)) % 5];
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.28, 0.34),
        new THREE.MeshStandardMaterial({ color: bagColor, roughness: 0.3 })
      );
      bag.position.set(minX + 1.36, sy + 0.17, z);
      staticGroup.add(bag);
    }
  }

  // East Showcase Window Haute Couture Plinth & Cannage Glow Backdrop (visible from East Street!)
  addBox(maxX - 1.5, f1Y + 0.16, 4.7, 1.7, 0.32, 5.4, marbleFloorMat);
  addBox(maxX - 2.35, f1Y + 2.1, 4.7, 0.12, 3.8, 5.4, cannageWallMat);
  addCoutureMannequin(maxX - 1.45, f1Y + 0.32, 3.1, 0xfaf5ef, Math.PI * 0.5);
  addCoutureMannequin(maxX - 1.45, f1Y + 0.32, 4.7, 0xf5d0d8, Math.PI * 0.5);
  addCoutureMannequin(maxX - 1.45, f1Y + 0.32, 6.3, 0x1e293b, Math.PI * 0.5);

  // Rear Marble Cashwrap Desk + CHRISTIAN DIOR PARIS Wall Emblem
  addBox(473.6, f1Y + 0.52, -5.3, 4.8, 1.04, 1.35, marbleFloorMat);
  addBox(473.6, f1Y + 1.06, -5.3, 4.9, 0.07, 1.42, champagneBrassMat);
  const cashSignTex = createDiorWordmarkTex('#18181b', 'rgba(255, 224, 150, 0.5)', 'PARIS • AVENUE MONTAIGNE');
  const cashSign = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 1.75),
    new THREE.MeshStandardMaterial({ map: cashSignTex, transparent: true, roughness: 0.25 })
  );
  cashSign.position.set(473.6, f1Y + 2.65, minZ + 0.86);
  cashSign.userData.noMerge = true;
  staticGroup.add(cashSign);

  // Rear Left: J'adore & Miss Dior Parfumerie Bar (glowing golden amphora bottles!)
  addBox(466.9, f1Y + 0.55, -9.9, 4.2, 1.1, 1.2, velvetCreamMat);
  const goldBottleMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.65,
  });
  lanternMats.push(goldBottleMat);
  for (let bx = 465.3; bx <= 468.5; bx += 0.64) {
    const flacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.34, 12), goldBottleMat);
    flacon.position.set(bx, f1Y + 1.28, -9.9);
    staticGroup.add(flacon);
  }

  // Rear Right: Dior Joaillerie Fine Jewelry Glass Vitrine
  addBox(479.3, f1Y + 0.48, -9.9, 3.4, 0.96, 1.3, obsidianMat);
  addBox(479.3, f1Y + 1.14, -9.9, 3.3, 0.38, 1.2, glassMat);

  // Center Champagne Bouclé Salon Bench
  addBox(473.7, f1Y + 0.25, -0.6, 3.0, 0.50, 1.8, velvetBlushMat);

  // =========================================================================
  // 6. NE SWITCHBACK STAIRCASE TO FLOOR 2 (X = 482.2..486.8, Z = -11.0..-4.0, divider X = 484.6)
  // =========================================================================
  const stairMidY = f1Y + DIOR_FLOOR_H * 0.5;
  // Run 1 (West side X = 482.25..484.42): ascends North from Z = -4.2 to Z = -9.2
  const run1Steps = 12;
  for (let s = 0; s < run1Steps; s++) {
    const t = (s + 0.5) / run1Steps;
    const sz = THREE.MathUtils.lerp(-4.2, -9.2, t);
    const sy = THREE.MathUtils.lerp(f1Y, stairMidY, t);
    addBox(483.35, sy - 0.08, sz, 2.15, 0.16, 0.44, marbleFloorMat);
    addBox(483.35, sy, sz + 0.2, 2.15, 0.025, 0.04, champagneBrassMat);
  }
  // Mid-landing (Z = -11.0 .. -9.2, Y = stairMidY)
  addBox(484.5, stairMidY - 0.1, -10.1, 4.6, 0.2, 1.8, marbleFloorMat);
  // Run 2 (East side X = 484.78..486.75): ascends South from Z = -9.2 to Z = -4.2 onto Floor 2
  const run2Steps = 12;
  for (let s = 0; s < run2Steps; s++) {
    const t = (s + 0.5) / run2Steps;
    const sz = THREE.MathUtils.lerp(-9.2, -4.2, t);
    const sy = THREE.MathUtils.lerp(stairMidY, f2Y, t);
    addBox(485.75, sy - 0.08, sz, 2.0, 0.16, 0.44, marbleFloorMat);
    addBox(485.75, sy, sz - 0.2, 2.0, 0.025, 0.04, champagneBrassMat);
  }
  // Glass & Brass Stair Balustrades
  addBox(482.05, f1Y + 2.3, -7.5, 0.08, 4.4, 7.0, glassMat);
  addBox(484.6, f1Y + 2.3, -6.6, 0.18, 4.4, 5.2, champagneIvoryMat);
  // Floor 2 stairwell perimeter glass rail
  addBox(483.35, f2Y + 0.55, -4.1, 2.3, 1.1, 0.08, glassMat);

  // =========================================================================
  // 7. FLOOR 2 INTERIOR — COUTURE WINDOWS, SHOE SALON & BRIDAL LOUNGE (Y = 4.38m)
  // =========================================================================
  // Front Window Floor 2 Couture Hanging Racks (visible directly through Bay 1 & Bay 2 upper windows!)
  [465.7, 473.5].forEach((bx) => {
    addBox(bx, f2Y + 2.1, 10.6, 5.8, 3.8, 0.12, cannageWallMat);
    addBox(bx, f2Y + 2.45, 11.8, 5.2, 0.05, 0.05, champagneBrassMat);
    for (let dx = bx - 2.1; dx <= bx + 2.1; dx += 0.84) {
      const hex = [0xf8f3eb, 0xf4c2c2, 0x18181b, 0xe5d3b3, 0xcbd5e1][Math.abs(Math.round(dx)) % 5];
      const dress = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 1.4, 10),
        new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45 })
      );
      dress.position.set(dx, f2Y + 1.68, 11.8);
      staticGroup.add(dress);
    }
  });
  // East Window Floor 2 Couture Hanging Rack (visible through East showcase window!)
  addBox(maxX - 2.6, f2Y + 2.1, 4.7, 0.12, 3.8, 5.4, cannageWallMat);
  addBox(maxX - 1.6, f2Y + 2.45, 4.7, 0.05, 0.05, 5.0, champagneBrassMat);
  for (let dz = 2.7; dz <= 6.7; dz += 1.0) {
    const hex = [0xf8f3eb, 0xe8b4bc, 0x18181b, 0xd4af37, 0xfaf5ef][Math.abs(Math.round(dz)) % 5];
    const dress = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 1.4, 10),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45 })
    );
    dress.position.set(maxX - 1.6, f2Y + 1.68, dz);
    staticGroup.add(dress);
  }

  // Floor 2 West J'Adior Shoe & Accessory Niche Wall
  addBox(minX + 1.05, f2Y + 1.85, 0.2, 0.7, 3.7, 13.5, champagneIvoryMat);
  for (let row = 0; row < 3; row++) {
    const sy = f2Y + 0.95 + row * 0.88;
    addBox(minX + 1.35, sy, 0.2, 0.45, 0.05, 12.8, champagneBrassMat);
    for (let sz = -5.2; sz <= 5.6; sz += 1.2) {
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.14, 0.30),
        new THREE.MeshStandardMaterial({ color: row % 2 === 0 ? 0xf5efe6 : 0x18181b, roughness: 0.35 })
      );
      shoe.position.set(minX + 1.36, sy + 0.10, sz);
      staticGroup.add(shoe);
    }
  }

  // Floor 2 VIP Bridal & Haute Couture Salon Lounge (X = 469.5, Z = 0.8)
  addBox(469.5, f2Y + 0.26, -0.6, 4.8, 0.52, 1.5, velvetBlushMat);
  addBox(469.5, f2Y + 0.56, -1.25, 4.8, 0.75, 0.25, velvetBlushMat);
  addBox(469.5, f2Y + 0.24, 1.6, 2.2, 0.48, 1.4, marbleFloorMat);
  addBox(469.5, f2Y + 0.50, 1.6, 2.28, 0.05, 1.48, champagneBrassMat);

  // Floor 2 Central New Look Runway Plinth
  addBox(477.4, f2Y + 0.16, 7.1, 4.6, 0.32, 4.4, velvetCreamMat);
  addCoutureMannequin(476.3, f2Y + 0.32, 7.1, 0xfaf6ef, 0.2);
  addCoutureMannequin(478.5, f2Y + 0.32, 7.1, 0x1e293b, -0.2);

  // =========================================================================
  // 8. LIGHTING & STREET LIGHT POOLS
  // =========================================================================
  const poolMat = new THREE.MeshBasicMaterial({
    map: createDiorPoolTex(),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(poolMat);

  const frontPool = new THREE.Mesh(new THREE.PlaneGeometry(24.0, 9.5), poolMat);
  frontPool.rotation.x = -Math.PI / 2;
  frontPool.position.set(midX - 1.0, 0.015, maxZ + 2.8);
  staticGroup.add(frontPool);

  let currentScale = 0.75;
  const registerScaledLight = (
    x: number,
    y: number,
    z: number,
    color: number,
    dayInt: number,
    nightInt: number,
    dist: number
  ) => {
    const light = new THREE.PointLight(color, dayInt, dist, 1.6);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => currentScale,
    });
  };

  // Warm champagne-gold lighting across Floor 1, Floor 2, SE Curved Crest & East Showcase
  registerScaledLight(473.5, 3.8, 3.5, 0xffebc2, 0.75, 2.6, 22);
  registerScaledLight(473.5, 3.8, -6.0, 0xffe4b5, 0.65, 2.3, 18);
  registerScaledLight(465.7, 3.8, 12.2, 0xffe5aa, 0.85, 2.8, 16);
  registerScaledLight(485.0, 4.2, 11.2, 0xffe2a4, 0.75, 2.6, 18);
  registerScaledLight(473.5, 8.8, 2.5, 0xffebc2, 0.70, 2.4, 22);
  registerScaledLight(482.5, 5.6, 17.6, 0xffe09c, 0.35, 2.4, 24);

  // =========================================================================
  // 9. OPERATING HOURS & AUTOMATIC DOOR/SHUTTER UPDATER
  // =========================================================================
  let closedFactor = isDiorOpenAtHour(7.0) ? 0 : 1;
  let doorOpen = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: DiorNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isDiorOpenAtHour(rawHour);

    let playerNear = false;
    if (playerPos) {
      const dx = playerPos.x - DIOR_DOOR_X;
      const dz = playerPos.z - DIOR_DOOR_Z;
      playerNear = Math.hypot(dx, dz) <= 4.6 && playerPos.y < 2.2;
    }
    const npcNear = npcController?.hasNpcNearDoor() ?? false;
    const targetDoorOpen = isOpen && (playerNear || npcNear) ? 1 : 0;
    doorOpen = THREE.MathUtils.damp(doorOpen, targetDoorOpen, 7.5, dt);

    doorL.position.x = DIOR_DOOR_X - 0.81 - doorOpen * 1.18;
    doorR.position.x = DIOR_DOOR_X + 0.81 + doorOpen * 1.18;

    const targetClosed = isOpen ? 0 : 1;
    closedFactor = THREE.MathUtils.damp(closedFactor, targetClosed, 3.6, dt);
    setShutterProgress(mainShutter, closedFactor);

    const openGlow = 1.0 - closedFactor * 0.72;
    currentScale = openGlow * (0.6 + lampFactor * 0.55);
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => closedFactor,
    update,
  };
}

// =========================================================================
// DIOR CLIENT ADVISORS & LUXURY SHOPPERS (9 NPCs across Floors 1 & 2)
// =========================================================================

interface DiorActor {
  id: number;
  kind: 'advisor' | 'shopper';
  root: THREE.Group;
  headMesh: THREE.Object3D;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  toteBag: THREE.Mesh;
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
  exiting: boolean;
  exitDone: boolean;
  speed: number;
  seed: number;
  glbHandle: GlbHumanHandle;
}

const DIOR_F1_SPOTS = [
  { x: 467.5, z: 7.2, yaw: -Math.PI * 0.35 },
  { x: 470.2, z: 1.5, yaw: 0.0 },
  { x: 477.2, z: 1.5, yaw: Math.PI },
  { x: 465.2, z: -2.0, yaw: -Math.PI * 0.5 },
  { x: 473.6, z: -3.2, yaw: Math.PI },
  { x: 479.3, z: -7.5, yaw: Math.PI },
  { x: 467.0, z: -7.5, yaw: Math.PI },
  { x: 482.8, z: 4.5, yaw: Math.PI * 0.5 },
];

const DIOR_F2_SPOTS = [
  { x: 465.2, z: 1.0, yaw: -Math.PI * 0.5 },
  { x: 469.5, z: 3.4, yaw: Math.PI },
  { x: 473.5, z: 7.6, yaw: 0.0 },
  { x: 481.2, z: 7.6, yaw: 0.0 },
  { x: 477.4, z: 2.5, yaw: 0.0 },
];

export class DiorNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: DiorActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;
    const bagTex = createDiorToteBagTex();
    const bagMat = new THREE.MeshStandardMaterial({ map: bagTex, roughness: 0.35 });

    const configs: Array<{
      kind: 'advisor' | 'shopper';
      x: number;
      y: number;
      z: number;
      yaw: number;
      suitHex: number;
      pantsHex: number;
      hairHex: number;
      skinHex: string;
    }> = [
      // 5 DIOR Client Advisors (tailored Bar black/ivory Paris uniform)
      { kind: 'advisor', x: 473.6, y: DIOR_PODIUM_Y, z: -6.7, yaw: 0, suitHex: 0x18181b, pantsHex: 0x111827, hairHex: 0x1c1917, skinHex: '#fbe0c8' },
      { kind: 'advisor', x: 466.9, y: DIOR_PODIUM_Y, z: -8.3, yaw: 0, suitHex: 0x18181b, pantsHex: 0x111827, hairHex: 0x3b2314, skinHex: '#f5c7a3' },
      { kind: 'advisor', x: 479.3, y: DIOR_PODIUM_Y, z: -8.3, yaw: 0, suitHex: 0x18181b, pantsHex: 0x111827, hairHex: 0x111827, skinHex: '#fbe0c8' },
      { kind: 'advisor', x: 472.2, y: DIOR_PODIUM_Y, z: 6.8, yaw: Math.PI * 0.85, suitHex: 0xf4efe6, pantsHex: 0x18181b, hairHex: 0x2c1a10, skinHex: '#f5c7a3' },
      { kind: 'advisor', x: 476.0, y: DIOR_PODIUM_Y + DIOR_FLOOR_H, z: 3.5, yaw: -0.35, suitHex: 0x18181b, pantsHex: 0x111827, hairHex: 0x18181b, skinHex: '#fbe0c8' },
      // 4 DIOR Luxury Shoppers (Floors 1 & 2)
      { kind: 'shopper', x: 470.2, y: DIOR_PODIUM_Y, z: 8.2, yaw: 0.2, suitHex: 0xe6c3c6, pantsHex: 0xf5efe6, hairHex: 0x3b2314, skinHex: '#fbe0c8' },
      { kind: 'shopper', x: 477.5, y: DIOR_PODIUM_Y, z: 6.2, yaw: -0.4, suitHex: 0xd6c7b2, pantsHex: 0x1e293b, hairHex: 0x1c1917, skinHex: '#f5c7a3' },
      { kind: 'shopper', x: 466.0, y: DIOR_PODIUM_Y + DIOR_FLOOR_H, z: 2.0, yaw: 0.5, suitHex: 0xf8f3eb, pantsHex: 0x334155, hairHex: 0x4a2c18, skinHex: '#fbe0c8' },
      { kind: 'shopper', x: 479.0, y: DIOR_PODIUM_Y + DIOR_FLOOR_H, z: 5.0, yaw: -0.6, suitHex: 0x1e293b, pantsHex: 0x18181b, hairHex: 0x111827, skinHex: '#e8b48e' },
    ];

    configs.forEach((cfg, idx) => {
      const grp = new THREE.Group();
      const fallbackGroup = new THREE.Group();
      grp.add(fallbackGroup);
      const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skinHex, roughness: 0.72 });
      const suitMat = new THREE.MeshStandardMaterial({ color: cfg.suitHex, roughness: 0.62 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pantsHex, roughness: 0.72 });
      const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hairHex, roughness: 0.85 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.35 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.25), suitMat);
      torso.position.y = 1.06;
      fallbackGroup.add(torso);

      const faceTex = helpers.createFaceTexture('happy', cfg.skinHex);
      const head = helpers.createHeadMesh(skinMat, faceTex, 0.34, 0.34, 0.34);
      head.position.y = 1.54;
      fallbackGroup.add(head);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.36), hairMat);
      hair.position.y = 1.69;
      fallbackGroup.add(hair);

      const makeArm = (ax: number) => {
        const p = new THREE.Group();
        p.position.set(ax, 1.30, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.13), suitMat);
        m.position.y = -0.20;
        p.add(m);
        fallbackGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.30);
      const rightArm = makeArm(0.30);

      const toteBag = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.26), bagMat);
      toteBag.position.set(0.06, -0.44, 0.04);
      toteBag.visible = cfg.kind === 'shopper' && idx % 2 === 1;
      rightArm.add(toteBag);

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0.76, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.66, 0.17), pantsMat);
        leg.position.y = -0.33;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.25), shoeMat);
        shoe.position.set(0, -0.71, 0.04);
        p.add(shoe);
        fallbackGroup.add(p);
        return p;
      };
      const leftLeg = makeLeg(-0.11);
      const rightLeg = makeLeg(0.11);

      const spec =
        cfg.kind === 'advisor'
          ? idx === 0
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(idx + 79)
          : pickShopCustomerModel(idx + 83);
      const initState =
        cfg.kind === 'advisor' ? (idx === 0 ? 'Checkout' : 'Idle') : 'Walk';
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: grp,
        fallbackMeshes: [fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: initState,
        phaseOffset: idx * 0.51,
      });

      grp.position.set(cfg.x, cfg.y, cfg.z);
      grp.rotation.y = cfg.yaw;
      this.rootGroup.add(grp);

      const actor: DiorActor = {
        id: idx,
        kind: cfg.kind,
        root: grp,
        headMesh: head,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        toteBag,
        homePos: new THREE.Vector3(cfg.x, cfg.y, cfg.z),
        homeYaw: cfg.yaw,
        phase: cfg.kind === 'advisor' ? 'admire' : 'browse',
        pathQueue: [],
        pathIdx: 0,
        targetYaw: cfg.yaw,
        stateTimer: 1.5 + idx * 0.7,
        walkPhase: idx * 1.1,
        walkPhaseRef: { phase: idx * 1.1 },
        exitRef: { idx: 0 },
        exiting: false,
        exitDone: false,
        speed: 1.12 + (idx % 3) * 0.08,
        seed: idx * 1.9,
        glbHandle,
      };
      if (actor.kind === 'shopper') {
        this.assignNewSpot(actor, false);
      }
      this.actors.push(actor);
    });
  }

  private assignNewSpot(a: DiorActor, spawnOutside: boolean) {
    const isF2 = a.homePos.y > DIOR_PODIUM_Y + 1.0;
    const pool = isF2 ? DIOR_F2_SPOTS : DIOR_F1_SPOTS;
    const spot = pool[Math.floor(Math.random() * pool.length)];
    a.targetYaw = spot.yaw;

    if (spawnOutside) {
      a.root.position.set(DIOR_DOOR_X + (a.id % 2 === 0 ? -1.4 : 1.4), 0.02, 16.8);
      if (isF2) {
        a.pathQueue = [
          new THREE.Vector3(DIOR_DOOR_X, DIOR_PODIUM_Y, 12.2),
          new THREE.Vector3(480.8, DIOR_PODIUM_Y, -3.0),
          new THREE.Vector3(483.35, DIOR_PODIUM_Y, -4.0),
          new THREE.Vector3(483.35, DIOR_PODIUM_Y + DIOR_FLOOR_H * 0.5, -10.0),
          new THREE.Vector3(485.75, DIOR_PODIUM_Y + DIOR_FLOOR_H, -3.8),
          new THREE.Vector3(spot.x, DIOR_PODIUM_Y + DIOR_FLOOR_H, spot.z),
        ];
      } else {
        a.pathQueue = [
          new THREE.Vector3(DIOR_DOOR_X, DIOR_PODIUM_Y, 11.8),
          new THREE.Vector3(473.5, DIOR_PODIUM_Y, 7.0),
          new THREE.Vector3(spot.x, DIOR_PODIUM_Y, spot.z),
        ];
      }
    } else {
      const yLevel = isF2 ? DIOR_PODIUM_Y + DIOR_FLOOR_H : DIOR_PODIUM_Y;
      a.pathQueue = [
        new THREE.Vector3(473.5, yLevel, 6.2),
        new THREE.Vector3(spot.x, yLevel, spot.z),
      ];
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
      if (!a.root.visible || a.homePos.y > DIOR_PODIUM_Y + 0.5) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - DIOR_DOOR_X, p.z - DIOR_DOOR_Z) <= 3.6) return true;
    }
    return false;
  }

  private stepPath(a: DiorActor, dt: number): boolean {
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
    const isOpen = isDiorOpenAtHour(rawHour);

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
          new THREE.Vector3(DIOR_DOOR_X, DIOR_PODIUM_Y, 10.2),
          new THREE.Vector3(DIOR_DOOR_X, DIOR_PODIUM_Y, 13.8),
          new THREE.Vector3(DIOR_DOOR_X, 0.04, 16.5),
          new THREE.Vector3(DIOR_DOOR_X + (a.id % 2 === 0 ? -5.0 : 5.0), 0.02, 18.6),
        ];
        if (a.homePos.y > DIOR_PODIUM_Y + 0.5) {
          a.pathQueue = [
            new THREE.Vector3(483.35, DIOR_PODIUM_Y + DIOR_FLOOR_H, -3.6),
            new THREE.Vector3(485.75, DIOR_PODIUM_Y + DIOR_FLOOR_H, -3.8),
            new THREE.Vector3(484.5, DIOR_PODIUM_Y + DIOR_FLOOR_H * 0.5, -10.1),
            new THREE.Vector3(483.35, DIOR_PODIUM_Y, -3.8),
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
          a.toteBag.visible = Math.random() > 0.35;
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
              new THREE.Vector3(DIOR_DOOR_X, DIOR_PODIUM_Y, 10.6),
              new THREE.Vector3(DIOR_DOOR_X, DIOR_PODIUM_Y, 13.8),
              new THREE.Vector3(DIOR_DOOR_X, 0.04, 16.5),
              new THREE.Vector3(DIOR_DOOR_X + (a.id % 2 === 0 ? -4.5 : 4.5), 0.02, 18.5),
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
