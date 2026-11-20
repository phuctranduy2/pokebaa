import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isSonyStoreOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface SonyStoreBuildResult {
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
    npcController?: SonyStoreNpcController | null
  ) => void;
}

// =========================================================================
// SONY FLAGSHIP STORE (GINZA PLACE INSPIRED • 2 MẶT TIỀN • ĐÚNG 3 TẦNG)
// Total Corner Plot: X = 383.8 .. 412.5 (28.7m), Z = -104.0 .. -76.2 (27.8m)
//   - Directly North of LG Brandshop (Z = -75.0..-47.0) at NE Corner of Sơn Tây Bắc & Bạch Đằng
//   - West Frontage (-X): Facing Đường Sơn Tây Bắc (X = 383.8)
//   - North Frontage (-Z): Facing Đường Bạch Đằng Waterfront & Cầu Rồng (Z = -104.0)
//   - Strictly 3 Stories (SONY_PODIUM_Y = 0.08, SONY_FLOOR_H = 5.2, Total ~16.6m):
//     * Iconic White 3D Sculpted Diamond Sukashi Lattice Cladding across both street facades
//       & chamfered/rounded NW intersection corner, with glowing recessed diamond apertures.
//     * Floor 1 (Y = 0.08..5.28): Panoramic glass showcase, Dual Automatic Portals (West & North),
//       PlayStation 5 Pro Racing Simulator & Arena, Sony Alpha Camera & G-Master Telephoto Bar,
//       Walkman / WH-1000XM5 Audio Lounge & Bravia Consultation Wall.
//     * Floor 2 (Y = 5.28..10.48): Sweeping Horizontal Ribbon Window Showcase displaying the
//       AFEELA 1 EV Prototype on an illuminated turntable, BRAVIA XR 98" Cinema Lounge & FX Studio.
//     * Floor 3 (Y = 10.48..15.68): Sculpted Diamond Lattice Upper Crown with glowing corner SONY
//       signboards, recessed Glass Gallery Terrace, Sony Café Long Table with Brass Dome Lamps &
//       Sony Music Vinyl Listening Lounge.
// =========================================================================

export const SONY_PODIUM_Y = 0.08;
export const SONY_FLOOR_H = 5.2;

export const SONY_MIN_X = 383.8;
export const SONY_MAX_X = 412.5;
export const SONY_MIN_Z = -104.0;
export const SONY_MAX_Z = -76.2;

// Dual Automatic Entrance Portals
const WEST_DOOR_X = 387.2; // Facing Đường Sơn Tây Bắc (-X)
const WEST_DOOR_Z = -88.2;
const NORTH_DOOR_X = 400.2; // Facing Đường Bạch Đằng (-Z)
const NORTH_DOOR_Z = -100.6;

export const SONY_COLLIDERS: IntersectionColliderBox[] = [
  // Floor 1 Outer Curtain Glass (leaves West Door Z=-90.5..-85.9 & North Door X=397.9..402.5 open!)
  { minX: 386.85, maxX: 387.55, minZ: -100.8, maxZ: -90.5, floor: 1 }, // West Glass North Wing
  { minX: 386.85, maxX: 387.55, minZ: -85.9, maxZ: -76.5, floor: 1 }, // West Glass South Wing
  { minX: 387.0, maxX: 397.9, minZ: -100.95, maxZ: -100.25, floor: 1 }, // North Glass West Wing
  { minX: 402.5, maxX: 412.2, minZ: -100.95, maxZ: -100.25, floor: 1 }, // North Glass East Wing
  { minX: 387.0, maxX: 412.3, minZ: -77.0, maxZ: -76.2, floor: 'both' }, // South Rear Wall facing LG Gap
  { minX: 411.75, maxX: 412.5, minZ: -100.8, maxZ: -76.2, floor: 'both' }, // East Rear Wall

  // Floors 2 & 3 Continuous Perimeter Glass & Lattice Facade (Floor 2 & Floor 3 use floor: 2 in colliders)
  { minX: 386.85, maxX: 387.6, minZ: -100.8, maxZ: -76.5, floor: 2 },
  { minX: 387.0, maxX: 412.2, minZ: -100.95, maxZ: -100.25, floor: 2 },

  // Perimeter Structural Columns inside Curtain Wall (all floors)
  { minX: 388.4, maxX: 389.4, minZ: -99.4, maxZ: -98.4, floor: 'both' },
  { minX: 388.4, maxX: 389.4, minZ: -91.6, maxZ: -90.6, floor: 'both' },
  { minX: 388.4, maxX: 389.4, minZ: -84.2, maxZ: -83.2, floor: 'both' },
  { minX: 395.2, maxX: 396.2, minZ: -99.4, maxZ: -98.4, floor: 'both' },
  { minX: 404.0, maxX: 405.0, minZ: -99.4, maxZ: -98.4, floor: 'both' },

  // Floor 1 Showcases & Experience Tables
  { minX: 391.2, maxX: 395.4, minZ: -97.6, maxZ: -93.6, floor: 1 }, // NW Corner Xperia & Walkman Hub Island
  { minX: 392.4, maxX: 395.4, minZ: -89.8, maxZ: -85.4, floor: 1 }, // West Entry Alpha Camera Counter
  { minX: 398.4, maxX: 403.6, minZ: -96.6, maxZ: -93.4, floor: 1 }, // North Entry PS5 Pro Ring Showcase
  { minX: 398.4, maxX: 403.6, minZ: -88.2, maxZ: -84.6, floor: 1 }, // Central Alpha G-Master Lens Bar
  { minX: 391.4, maxX: 395.6, minZ: -82.0, maxZ: -78.6, floor: 1 }, // SW PlayStation Racing Sim Rig
  { minX: 398.6, maxX: 404.4, minZ: -80.4, maxZ: -78.4, floor: 1 }, // South Sony Bravia & Service Counter

  // 3-Floor Switchback Stairwell (SE Corner: X = 406.0..411.0, Z = -84.0..-77.0, Open North Entry at Z = -84.0!)
  { minX: 405.65, maxX: 406.05, minZ: -84.1, maxZ: -77.1, floor: 'both' }, // Stair West Glass Balustrade
  { minX: 408.55, maxX: 411.1, minZ: -84.25, maxZ: -83.85, floor: 1 }, // Floor 1 guard in front of down-flight

  // Floor 2 & 3 Interior Showpieces (bounds checked on floor 2)
  { minX: 391.6, maxX: 398.0, minZ: -97.0, maxZ: -90.8, floor: 2 }, // F2 AFEELA EV / F3 Café Long Table + Stools
  { minX: 399.8, maxX: 404.8, minZ: -96.4, maxZ: -92.4, floor: 2 }, // F2 Cinema Studio / F3 Listening Lounge
  { minX: 397.0, maxX: 403.8, minZ: -82.4, maxZ: -78.2, floor: 2 }, // F2 Cinema Sofa / F3 Espresso & Vinyl Bar
  { minX: 410.9, maxX: 412.2, minZ: -98.0, maxZ: -86.0, floor: 'both' }, // East Wall Flagship Display Niches
  { minX: 389.0, maxX: 390.2, minZ: -79.4, maxZ: -78.0, floor: 'both' }, // SW Interior Feature Planter
  { minX: 408.9, maxX: 410.1, minZ: -99.0, maxZ: -97.6, floor: 'both' }, // NE Interior Feature Planter
];

// =========================================================================
// ROUNDED / CHAMFERED SHAPE & PROCEDURAL DIAMOND LATTICE TEXTURES
// =========================================================================

function createSonyRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const hw = w * 0.5;
  const hd = d * 0.5;
  // Note: rotateX(-PI/2) maps shape (sx, sy) -> world (+x, -z).
  // So (-hw, +hd) = NW street intersection corner (iconic 4.2m curve!),
  // (+hw, +hd) = NE, (-hw, -hd) = SW, (+hw, -hd) = SE interior wall corner.
  const rNW = Math.min(r, hw * 0.45, hd * 0.45);
  const rEdge = Math.min(0.65, rNW * 0.25);
  const rSE = 0.12;
  const s = new THREE.Shape();
  s.moveTo(-hw + rEdge, -hd);
  s.lineTo(hw - rSE, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + rSE);
  s.lineTo(hw, hd - rEdge);
  s.quadraticCurveTo(hw, hd, hw - rEdge, hd);
  s.lineTo(-hw + rNW, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - rNW);
  s.lineTo(-hw, -hd + rEdge);
  s.quadraticCurveTo(-hw, -hd, -hw + rEdge, -hd);
  return s;
}

function createSonySlabGeo(
  w: number,
  d: number,
  r: number,
  h: number,
  segs = 32,
  holeRect?: { minSx: number; maxSx: number; minSy: number; maxSy: number }
): THREE.BufferGeometry {
  const shape = createSonyRoundedRectShape(w, d, r);
  if (holeRect) {
    const hole = new THREE.Path();
    hole.moveTo(holeRect.minSx, holeRect.minSy);
    hole.lineTo(holeRect.maxSx, holeRect.minSy);
    hole.lineTo(holeRect.maxSx, holeRect.maxSy);
    hole.lineTo(holeRect.minSx, holeRect.maxSy);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    curveSegments: segs,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createSonyHollowRingGeo(
  w: number,
  d: number,
  r: number,
  thick: number,
  h: number,
  segs = 32
): THREE.BufferGeometry {
  const outer = createSonyRoundedRectShape(w, d, r);
  const inner = createSonyRoundedRectShape(
    Math.max(1.0, w - thick * 2),
    Math.max(1.0, d - thick * 2),
    Math.max(0.2, r - thick)
  );
  outer.holes.push(inner);
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: h,
    bevelEnabled: false,
    curveSegments: segs,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// High-Contrast Crisp Ginza-Place White Diamond Lattice Facade Texture (day + warm night glow pores!)
function createDiamondLatticeTex(repeatX: number, repeatY: number, isNightGlowMap = false): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  if (isNightGlowMap) {
    ctx.fillStyle = '#18181b'; // Non-emissive white aluminum solid ribs
    ctx.fillRect(0, 0, s, s);
  } else {
    ctx.fillStyle = '#f8fafc'; // Crisp architectural matte white anodized aluminum
    ctx.fillRect(0, 0, s, s);
  }

  const cols = 4;
  const rows = 4;
  const cellW = s / cols;
  const cellH = s / rows;

  for (let r = -1; r <= rows + 1; r++) {
    for (let col = -1; col <= cols + 1; col++) {
      const cx = (col + (r % 2 === 0 ? 0 : 0.5)) * cellW;
      const cy = r * cellH;

      // Sculpted deep shadow chamfer around every diamond opening
      if (!isNightGlowMap) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - cellH * 0.44);
        ctx.lineTo(cx + cellW * 0.44, cy);
        ctx.lineTo(cx, cy + cellH * 0.44);
        ctx.lineTo(cx - cellW * 0.44, cy);
        ctx.closePath();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      // Recessed inner diamond pore (dark architectural glass in day, warm amber backlit glow at night!)
      ctx.beginPath();
      ctx.moveTo(cx, cy - cellH * 0.25);
      ctx.lineTo(cx + cellW * 0.23, cy);
      ctx.lineTo(cx, cy + cellH * 0.25);
      ctx.lineTo(cx - cellW * 0.23, cy);
      ctx.closePath();

      if (isNightGlowMap) {
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, cellW * 0.26);
        g.addColorStop(0, '#fffbeb');
        g.addColorStop(0.6, '#fde68a');
        g.addColorStop(1, '#3f3f46');
        ctx.fillStyle = g;
      } else {
        const g = ctx.createLinearGradient(cx - 18, cy - 24, cx + 18, cy + 24);
        g.addColorStop(0, '#1e293b');
        g.addColorStop(0.5, '#334155');
        g.addColorStop(1, '#0f172a');
        ctx.fillStyle = g;
      }
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

function createSonyWordmarkTex(sub = ''): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#090d14';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 116px Georgia, "Times New Roman", serif';
  ctx.fillText('S O N Y', w * 0.5, sub ? h * 0.44 : h * 0.52);

  if (sub) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 28px system-ui, sans-serif';
    ctx.fillText(sub, w * 0.5, h * 0.80);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createSonyPosterTex(title: string, sub: string, tag: string, accentHex: string): THREE.CanvasTexture {
  const w = 512;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#020617');
  g.addColorStop(1, '#0f172a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(256, 125, 10, 256, 125, 150);
  glow.addColorStop(0, accentHex);
  glow.addColorStop(0.55, 'rgba(56, 189, 248, 0.22)');
  glow.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.fillText(title, 256, 175);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 21px system-ui, sans-serif';
  ctx.fillText(sub, 256, 224);

  ctx.fillStyle = accentHex;
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText(tag, 256, 272);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSonyHoursPlaqueTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = 'rgba(9, 13, 20, 0.94)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(10, 10, w - 20, 66);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px Georgia, serif';
  ctx.fillText('SONY  STORE  •  GINZA', 256, 44);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('OPEN DAILY  07:00 - 23:00', 256, 136);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('SƠN TÂY BẮC • BẠCH ĐẰNG', 256, 198);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAfeelaSideProfileGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-2.15, 0.22);
  s.lineTo(2.15, 0.22);
  s.lineTo(2.20, 0.50);
  s.quadraticCurveTo(2.14, 0.80, 1.82, 0.86);
  s.lineTo(1.05, 0.92);
  s.lineTo(0.42, 1.38);
  s.lineTo(-1.18, 1.38);
  s.quadraticCurveTo(-1.95, 1.02, -2.18, 0.72);
  s.lineTo(-2.16, 0.38);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1.80,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.05,
    bevelSegments: 3,
    curveSegments: 14,
  });
  geo.translate(0, 0, -0.90);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createSonyStoreStructure(): SonyStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // =========================================================================
  // ARCHITECTURAL MATERIALS
  // =========================================================================
  const podiumGraniteMat = new THREE.MeshStandardMaterial({
    color: 0xa1a8b5,
    roughness: 0.70,
    metalness: 0.10,
  });

  const floor1TerrazzoMat = new THREE.MeshStandardMaterial({
    color: 0xded9cf,
    roughness: 0.34,
    metalness: 0.08,
  });

  const floor2TimberMat = new THREE.MeshStandardMaterial({
    color: 0x2a313d,
    roughness: 0.38,
    metalness: 0.16,
  });

  const floor3OakMat = new THREE.MeshStandardMaterial({
    color: 0xd3b995,
    roughness: 0.45,
    metalness: 0.05,
  });

  const latticeColorTex = createDiamondLatticeTex(4.0, 1.5, false);
  const latticeGlowTex = createDiamondLatticeTex(4.0, 1.5, true);
  const latticeMat = new THREE.MeshStandardMaterial({
    map: latticeColorTex,
    emissive: 0xfffbeb,
    emissiveMap: latticeGlowTex,
    emissiveIntensity: 0.45,
    roughness: 0.32,
    metalness: 0.28,
  });

  const latticeCrownColorTex = createDiamondLatticeTex(4.5, 2.2, false);
  const latticeCrownGlowTex = createDiamondLatticeTex(4.5, 2.2, true);
  const latticeCrownMat = new THREE.MeshStandardMaterial({
    map: latticeCrownColorTex,
    emissive: 0xfffbeb,
    emissiveMap: latticeCrownGlowTex,
    emissiveIntensity: 0.55,
    roughness: 0.30,
    metalness: 0.30,
  });

  const pureWhiteFinMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.25,
  });

  const darkTitaniumMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.34,
    metalness: 0.72,
  });

  const brushedSilverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.22,
    metalness: 0.86,
  });

  const warmOakMat = new THREE.MeshStandardMaterial({
    color: 0xc2935e,
    roughness: 0.46,
    metalness: 0.05,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.24,
    metalness: 0.88,
  });

  const curtainGlassMat = new THREE.MeshStandardMaterial({
    color: 0xc8e4f5,
    transparent: true,
    opacity: 0.24,
    roughness: 0.06,
    metalness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const balustradeGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.34,
    roughness: 0.09,
    metalness: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Self-managed high-output architectural LEDs & Signage
  const brightCeilingMat = new THREE.MeshStandardMaterial({
    color: 0xfffef8,
    emissive: 0xfef9e7,
    emissiveIntensity: 3.4,
    roughness: 0.16,
  });

  const ceilingBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 3.8,
    roughness: 0.12,
  });

  const playstationBlueLedMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.8,
    roughness: 0.16,
  });

  const warmGoldLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 2.8,
    roughness: 0.16,
  });

  const crimsonRingMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    emissive: 0xbe123c,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });

  const boucleCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf3efe6,
    roughness: 0.88,
    metalness: 0.02,
  });

  const cushionSlateMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85,
  });

  const cushionAmberMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.82,
  });

  const oliveBarkMat = new THREE.MeshStandardMaterial({
    color: 0x5c4632,
    roughness: 0.9,
  });

  const oliveLeafMat = new THREE.MeshStandardMaterial({
    color: 0x4d7c4f,
    roughness: 0.78,
  });

  const screenGlowMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 1.35,
    roughness: 0.15,
  });

  const vinylSleeveMats = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0xec4899, 0x8b5cf6].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.48 })
  );

  const sonyLogoTex = createSonyWordmarkTex();
  const sonyLogoMat = new THREE.MeshStandardMaterial({
    map: sonyLogoTex,
    emissive: 0xffffff,
    emissiveMap: sonyLogoTex,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });

  const sonyPortalTex = createSonyWordmarkTex('GINZA  FLAGSHIP');
  const sonyPortalMat = new THREE.MeshStandardMaterial({
    map: sonyPortalTex,
    emissive: 0xffffff,
    emissiveMap: sonyPortalTex,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });

  // =========================================================================
  // 1. CORNER PODIUM SLAB & APRONS (X = 383.8..412.5, Z = -104.0..-76.2)
  // =========================================================================
  const plotCX = (SONY_MIN_X + SONY_MAX_X) * 0.5; // 398.15
  const plotCZ = (SONY_MIN_Z + SONY_MAX_Z) * 0.5; // -90.1

  const podiumSlab = new THREE.Mesh(
    new THREE.BoxGeometry(28.7, SONY_PODIUM_Y + 0.06, 27.8),
    podiumGraniteMat
  );
  podiumSlab.position.set(plotCX, (SONY_PODIUM_Y - 0.06) * 0.5, plotCZ);
  staticGroup.add(podiumSlab);

  const westApron = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.045, 27.8), podiumGraniteMat);
  westApron.position.set(SONY_MIN_X + 0.275, 0.022, plotCZ);
  staticGroup.add(westApron);

  const northApron = new THREE.Mesh(new THREE.BoxGeometry(28.7, 0.045, 0.55), podiumGraniteMat);
  northApron.position.set(plotCX, 0.022, SONY_MIN_Z + 0.275);
  staticGroup.add(northApron);

  // Building Envelope Core: X = 387.0 .. 412.0 (25.0m), Z = -100.8 .. -76.5 (24.3m)
  const BLDG_CX = 399.5;
  const BLDG_CZ = -88.65;
  const BLDG_W = 25.0;
  const BLDG_D = 24.3;
  const CORNER_R = 4.2;

  // Floor 1 Interior Polished Floor
  const f1Floor = new THREE.Mesh(createSonySlabGeo(BLDG_W - 0.3, BLDG_D - 0.3, CORNER_R - 0.1, 0.03, 32), floor1TerrazzoMat);
  f1Floor.position.set(BLDG_CX, SONY_PODIUM_Y + 0.005, BLDG_CZ);
  staticGroup.add(f1Floor);

  // =========================================================================
  // 2. FLOOR 1 PANORAMIC GLASS PAVILION, COLUMNS & DUAL PORTALS (Y = 0.08..5.28)
  // =========================================================================
  const F2_Y = SONY_PODIUM_Y + SONY_FLOOR_H; // 5.28m
  const F3_Y = F2_Y + SONY_FLOOR_H; // 10.48m
  const ROOF_Y = F3_Y + SONY_FLOOR_H; // 15.68m

  const f1GlassH = 4.82;
  const f1GlassMidY = SONY_PODIUM_Y + f1GlassH * 0.5;

  // Structural Round Dark Titanium Columns
  [
    [388.9, -98.9],
    [388.9, -91.1],
    [388.9, -83.7],
    [395.7, -98.9],
    [404.5, -98.9],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, SONY_FLOOR_H * 3 - 0.2, 24), darkTitaniumMat);
    col.position.set(cx, SONY_PODIUM_Y + (SONY_FLOOR_H * 3 - 0.2) * 0.5, cz);
    staticGroup.add(col);
  });

  // Floor 1 West Glass (X = 387.2, Doorway Z = -90.5..-85.9 OPEN)
  const f1WestGlassN = new THREE.Mesh(new THREE.BoxGeometry(0.05, f1GlassH, 6.2), curtainGlassMat);
  f1WestGlassN.position.set(WEST_DOOR_X, f1GlassMidY, -93.6);
  staticGroup.add(f1WestGlassN);

  const f1WestGlassS = new THREE.Mesh(new THREE.BoxGeometry(0.05, f1GlassH, 9.4), curtainGlassMat);
  f1WestGlassS.position.set(WEST_DOOR_X, f1GlassMidY, -81.2);
  staticGroup.add(f1WestGlassS);

  // Floor 1 North Glass (Z = -100.6, Doorway X = 397.9..402.5 OPEN)
  const f1NorthGlassW = new THREE.Mesh(new THREE.BoxGeometry(6.7, f1GlassH, 0.05), curtainGlassMat);
  f1NorthGlassW.position.set(394.55, f1GlassMidY, NORTH_DOOR_Z);
  staticGroup.add(f1NorthGlassW);

  const f1NorthGlassE = new THREE.Mesh(new THREE.BoxGeometry(9.5, f1GlassH, 0.05), curtainGlassMat);
  f1NorthGlassE.position.set(407.25, f1GlassMidY, NORTH_DOOR_Z);
  staticGroup.add(f1NorthGlassE);

  // Curved NW Corner Glass Helper
  const buildSonyCornerArc = (baseY: number, h: number, radius = 4.0) => {
    const cx = 391.2;
    const cz = -96.6;
    const arcGeo = new THREE.CylinderGeometry(radius, radius, h, 28, 1, true, Math.PI, Math.PI * 0.5);
    const arcMesh = new THREE.Mesh(arcGeo, curtainGlassMat);
    arcMesh.position.set(cx, baseY + h * 0.5, cz);
    staticGroup.add(arcMesh);

    for (let i = 0; i <= 4; i++) {
      const a = THREE.MathUtils.lerp(Math.PI, Math.PI * 1.5, i / 4);
      const mul = new THREE.Mesh(new THREE.BoxGeometry(0.055, h, 0.055), darkTitaniumMat);
      mul.position.set(cx + Math.sin(a) * radius, baseY + h * 0.5, cz + Math.cos(a) * radius);
      mul.rotation.y = a;
      staticGroup.add(mul);
    }
  };
  buildSonyCornerArc(SONY_PODIUM_Y, f1GlassH, 4.0);

  // F1 South & East Solid Structural Architectural Walls (all 3 floors)
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(25.0, SONY_FLOOR_H * 3, 0.36), darkTitaniumMat);
  southWall.position.set(BLDG_CX, SONY_PODIUM_Y + SONY_FLOOR_H * 1.5, -76.5);
  staticGroup.add(southWall);

  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, SONY_FLOOR_H * 3, 24.3), darkTitaniumMat);
  eastWall.position.set(412.0, SONY_PODIUM_Y + SONY_FLOOR_H * 1.5, BLDG_CZ);
  staticGroup.add(eastWall);

  // Dark vertical mullions along F1 glass
  [-96.6, -93.6, -90.5, -85.9, -81.2, -76.8].forEach((mz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, f1GlassH, 0.05), darkTitaniumMat);
    m.position.set(WEST_DOOR_X, f1GlassMidY, mz);
    staticGroup.add(m);
  });
  [391.2, 394.6, 397.9, 402.5, 407.2, 411.8].forEach((mx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, f1GlassH, 0.06), darkTitaniumMat);
    m.position.set(mx, f1GlassMidY, NORTH_DOOR_Z);
    staticGroup.add(m);
  });

  // Dual Bi-Parting Automatic Sliding Glass Portals + Rolling Shutters
  const buildSonyPortal = (
    axis: 'west' | 'north',
    x: number,
    z: number
  ): {
    leafA: THREE.Group;
    leafB: THREE.Group;
    closedA: number;
    closedB: number;
    shutter: RollingShutterHandle;
  } => {
    const portalW = 4.6;
    const leafW = 2.28;
    const leafH = 3.12;

    const hdr = new THREE.Mesh(
      axis === 'west'
        ? new THREE.BoxGeometry(0.22, 0.72, portalW + 0.18)
        : new THREE.BoxGeometry(portalW + 0.18, 0.72, 0.22),
      darkTitaniumMat
    );
    hdr.position.set(x, SONY_PODIUM_Y + leafH + 0.36, z);
    staticGroup.add(hdr);

    const hdrSign = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 0.62), sonyPortalMat);
    hdrSign.rotation.y = axis === 'west' ? -Math.PI / 2 : Math.PI;
    hdrSign.position.set(
      axis === 'west' ? x - 0.12 : x,
      SONY_PODIUM_Y + leafH + 0.36,
      axis === 'west' ? z : z - 0.12
    );
    hdrSign.userData.noMerge = true;
    staticGroup.add(hdrSign);

    const visor = new THREE.Mesh(
      axis === 'west' ? new THREE.BoxGeometry(1.4, 0.04, portalW + 0.3) : new THREE.BoxGeometry(portalW + 0.3, 0.04, 1.4),
      curtainGlassMat
    );
    visor.position.set(
      axis === 'west' ? x - 0.75 : x,
      SONY_PODIUM_Y + leafH + 0.04,
      axis === 'west' ? z : z - 0.75
    );
    staticGroup.add(visor);

    const makeLeaf = (offset: number) => {
      const grp = new THREE.Group();
      grp.userData.noMerge = true;
      const pane = new THREE.Mesh(
        axis === 'west' ? new THREE.BoxGeometry(0.035, leafH, leafW) : new THREE.BoxGeometry(leafW, leafH, 0.035),
        curtainGlassMat
      );
      pane.position.y = leafH * 0.5;
      grp.add(pane);

      const topBar = new THREE.Mesh(
        axis === 'west' ? new THREE.BoxGeometry(0.06, 0.06, leafW) : new THREE.BoxGeometry(leafW, 0.06, 0.06),
        brushedSilverMat
      );
      topBar.position.y = leafH - 0.03;
      grp.add(topBar);

      const botBar = new THREE.Mesh(
        axis === 'west' ? new THREE.BoxGeometry(0.06, 0.06, leafW) : new THREE.BoxGeometry(leafW, 0.06, 0.06),
        brushedSilverMat
      );
      botBar.position.y = 0.03;
      grp.add(botBar);

      const handleOff = offset < 0 ? leafW * 0.5 - 0.18 : -leafW * 0.5 + 0.18;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 10), brushedSilverMat);
      handle.position.set(
        axis === 'west' ? -0.045 : handleOff,
        1.32,
        axis === 'west' ? handleOff : -0.045
      );
      grp.add(handle);

      grp.position.set(
        axis === 'west' ? x - 0.02 : x + offset,
        SONY_PODIUM_Y,
        axis === 'west' ? z + offset : z - 0.02
      );
      staticGroup.add(grp);
      return grp;
    };

    const closedA = (axis === 'west' ? z : x) - leafW * 0.5;
    const closedB = (axis === 'west' ? z : x) + leafW * 0.5;
    const leafA = makeLeaf(-leafW * 0.5);
    const leafB = makeLeaf(leafW * 0.5);

    const shutterTex = createRollingShutterTexture({
      title: 'SONY STORE • GINZA',
      hoursLabel: '07:00 - 23:00  •  OPEN DAILY',
      accentHex: '#1d4ed8',
    });
    const shutterMat = new THREE.MeshStandardMaterial({
      map: shutterTex,
      roughness: 0.45,
      metalness: 0.58,
    });
    const shutter = createRollingShutterDoor(
      staticGroup,
      {
        id: `sony_${axis}_shutter`,
        axis: axis === 'west' ? 'z' : 'x',
        pos: axis === 'west' ? x - 0.08 : z - 0.08,
        spanCenter: axis === 'west' ? z : x,
        width: portalW,
        baseY: SONY_PODIUM_Y,
        topY: SONY_PODIUM_Y + leafH,
      },
      shutterMat,
      darkTitaniumMat
    );

    return { leafA, leafB, closedA, closedB, shutter };
  };

  const westPortal = buildSonyPortal('west', WEST_DOOR_X, WEST_DOOR_Z);
  const northPortal = buildSonyPortal('north', NORTH_DOOR_X, NORTH_DOOR_Z);

  const plaqueMat = new THREE.MeshBasicMaterial({ map: createSonyHoursPlaqueTex() });
  const westPlaque = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), plaqueMat);
  westPlaque.rotation.y = -Math.PI / 2;
  westPlaque.position.set(WEST_DOOR_X - 0.06, SONY_PODIUM_Y + 1.55, WEST_DOOR_Z + 2.85);
  westPlaque.userData.noMerge = true;
  staticGroup.add(westPlaque);

  const northPlaque = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), plaqueMat);
  northPlaque.rotation.y = Math.PI;
  northPlaque.position.set(NORTH_DOOR_X - 2.85, SONY_PODIUM_Y + 1.55, NORTH_DOOR_Z - 0.06);
  northPlaque.userData.noMerge = true;
  staticGroup.add(northPlaque);

  // =========================================================================
  // 3. ICONIC WHITE 3D DIAMOND SUKASHI LATTICE RIBBONS & FLOOR 2/3 ENVELOPE
  // =========================================================================
  // Floor 1->2 White Diamond Lattice Spandrel Belt (Y = 4.88 .. 6.18)
  const spandrel12 = new THREE.Mesh(
    createSonyHollowRingGeo(BLDG_W + 0.4, BLDG_D + 0.4, CORNER_R + 0.2, 0.45, 1.32, 36),
    latticeMat
  );
  spandrel12.position.set(BLDG_CX, 4.88, BLDG_CZ);
  staticGroup.add(spandrel12);

  // 3D Sculpted White Diamond Ribs framing the Spandrel Belt along West & North streets
  for (let z = -96.5; z <= -77.5; z += 1.65) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.34, 0.14), pureWhiteFinMat);
    rib.position.set(386.95, 5.54, z);
    rib.rotation.x = 0.72;
    staticGroup.add(rib);
  }
  for (let x = 391.2; x <= 411.0; x += 1.65) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.34, 0.12), pureWhiteFinMat);
    rib.position.set(x, 5.54, -100.85);
    rib.rotation.z = 0.72;
    staticGroup.add(rib);
  }

  // Floor 2 Sweeping Panoramic Horizontal Showcase Glass Ribbon (Y = 6.20 .. 9.65, Ảnh 2 & 3!)
  const f2GlassH = 3.45;
  const f2GlassMidY = 6.20 + f2GlassH * 0.5;
  const f2WestGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, f2GlassH, 20.1), curtainGlassMat);
  f2WestGlass.position.set(387.2, f2GlassMidY, -86.55);
  staticGroup.add(f2WestGlass);

  const f2NorthGlass = new THREE.Mesh(new THREE.BoxGeometry(20.8, f2GlassH, 0.05), curtainGlassMat);
  f2NorthGlass.position.set(401.6, f2GlassMidY, -100.6);
  staticGroup.add(f2NorthGlass);

  buildSonyCornerArc(6.20, f2GlassH, 4.0);

  [-96.6, -91.5, -86.5, -81.5, -76.8].forEach((mz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, f2GlassH, 0.05), darkTitaniumMat);
    m.position.set(387.2, f2GlassMidY, mz);
    staticGroup.add(m);
  });
  [391.2, 396.4, 401.6, 406.8, 411.8].forEach((mx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, f2GlassH, 0.06), darkTitaniumMat);
    m.position.set(mx, f2GlassMidY, -100.6);
    staticGroup.add(m);
  });

  // Floor 2->3 White Diamond Lattice Spandrel Belt (Y = 9.65 .. 11.10) + Glowing Corner SONY Signs!
  const spandrel23 = new THREE.Mesh(
    createSonyHollowRingGeo(BLDG_W + 0.5, BLDG_D + 0.5, CORNER_R + 0.25, 0.48, 1.45, 36),
    latticeMat
  );
  spandrel23.position.set(BLDG_CX, 9.65, BLDG_CZ);
  staticGroup.add(spandrel23);

  // Signature Dark Signboard Panels with Bold Glowing "SONY" Wordmarks flanking NW Corner (Ảnh 2 & 3!)
  const westSonySign = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.32, 4.8), darkTitaniumMat);
  westSonySign.position.set(386.95, 10.38, -81.2);
  staticGroup.add(westSonySign);
  const westSonyLogo = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.15), sonyLogoMat);
  westSonyLogo.rotation.y = -Math.PI / 2;
  westSonyLogo.position.set(386.80, 10.38, -81.2);
  westSonyLogo.userData.noMerge = true;
  staticGroup.add(westSonyLogo);

  const northSonySign = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.32, 0.24), darkTitaniumMat);
  northSonySign.position.set(407.6, 10.38, -100.88);
  staticGroup.add(northSonySign);
  const northSonyLogo = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.15), sonyLogoMat);
  northSonyLogo.rotation.y = Math.PI;
  northSonyLogo.position.set(407.6, 10.38, -101.03);
  northSonyLogo.userData.noMerge = true;
  staticGroup.add(northSonyLogo);

  // Floor 3 Panoramic Recessed Corner Gallery Glass (Y = 11.10 .. 13.85) + Sculpted Upper Diamond Crown (Y = 13.4 .. 16.85)
  const f3GlassH = 2.75;
  const f3GlassMidY = 11.10 + f3GlassH * 0.5;

  const f3WestGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, f3GlassH, 16.0), curtainGlassMat);
  f3WestGlass.position.set(387.4, f3GlassMidY, -88.6);
  staticGroup.add(f3WestGlass);

  const f3NorthGlass = new THREE.Mesh(new THREE.BoxGeometry(16.6, f3GlassH, 0.05), curtainGlassMat);
  f3NorthGlass.position.set(399.5, f3GlassMidY, -100.4);
  staticGroup.add(f3NorthGlass);

  buildSonyCornerArc(11.10, f3GlassH, 3.85);

  // Swelling Sculpted White 3D Diamond Sukashi Crown Wrapping Top of 3rd Story (Y = 13.75 .. 16.85)
  const crownLatticeLower = new THREE.Mesh(
    createSonyHollowRingGeo(BLDG_W + 0.65, BLDG_D + 0.65, CORNER_R + 0.3, 0.52, 1.65, 36),
    latticeCrownMat
  );
  crownLatticeLower.position.set(BLDG_CX, 13.75, BLDG_CZ);
  staticGroup.add(crownLatticeLower);

  const crownLatticeUpper = new THREE.Mesh(
    createSonyHollowRingGeo(BLDG_W + 0.45, BLDG_D + 0.45, CORNER_R + 0.2, 0.52, 1.50, 36),
    latticeCrownMat
  );
  crownLatticeUpper.position.set(BLDG_CX, 15.38, BLDG_CZ);
  staticGroup.add(crownLatticeUpper);

  // 3D Sculpted Diagonal Aluminum Diamond Fins along Upper Crown West & North Faces
  for (let z = -96.5; z <= -77.5; z += 1.8) {
    const finA = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.3, 0.14), pureWhiteFinMat);
    finA.position.set(386.82, 15.32, z);
    finA.rotation.x = 0.68;
    staticGroup.add(finA);

    const finB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.3, 0.14), pureWhiteFinMat);
    finB.position.set(386.82, 15.32, z);
    finB.rotation.x = -0.68;
    staticGroup.add(finB);
  }
  for (let x = 391.2; x <= 411.0; x += 1.8) {
    const finA = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.3, 0.14), pureWhiteFinMat);
    finA.position.set(x, 15.32, -101.0);
    finA.rotation.z = 0.68;
    staticGroup.add(finA);

    const finB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.3, 0.14), pureWhiteFinMat);
    finB.position.set(x, 15.32, -101.0);
    finB.rotation.z = -0.68;
    staticGroup.add(finB);
  }

  // Rooftop Deck Cap & Perimeter Coping
  const roofDeck = new THREE.Mesh(createSonySlabGeo(BLDG_W + 0.1, BLDG_D + 0.1, CORNER_R, 0.35, 36), darkTitaniumMat);
  roofDeck.position.set(BLDG_CX, ROOF_Y, BLDG_CZ);
  staticGroup.add(roofDeck);

  const roofRimLed = new THREE.Mesh(
    createSonyHollowRingGeo(BLDG_W + 0.55, BLDG_D + 0.55, CORNER_R + 0.2, 0.06, 0.06, 36),
    warmGoldLedMat
  );
  roofRimLed.position.set(BLDG_CX, 16.84, BLDG_CZ);
  staticGroup.add(roofRimLed);

  // Floor 2 & Floor 3 Interior Floor Slabs (with clean SE Stairwell Cutout X=405.9..411.5, Z=-84.0..-76.9)
  const stairCutout = { minSx: 6.4, maxSx: 12.0, minSy: -11.75, maxSy: -4.65 };
  const f2Deck = new THREE.Mesh(
    createSonySlabGeo(BLDG_W - 0.2, BLDG_D - 0.2, CORNER_R - 0.1, 0.28, 32, stairCutout),
    floor2TimberMat
  );
  f2Deck.position.set(BLDG_CX, F2_Y - 0.28, BLDG_CZ);
  staticGroup.add(f2Deck);

  const f3Deck = new THREE.Mesh(
    createSonySlabGeo(BLDG_W - 0.2, BLDG_D - 0.2, CORNER_R - 0.1, 0.28, 32, stairCutout),
    floor3OakMat
  );
  f3Deck.position.set(BLDG_CX, F3_Y - 0.28, BLDG_CZ);
  staticGroup.add(f3Deck);

  // =========================================================================
  // 4. INTERIOR FLOOR 1: PLAYSTATION ARENA, ALPHA CAMERA BAR & XPERIA HUB
  // =========================================================================
  // Shared Multi-Part Botanical Planter & Hi-Fi Tower Helpers
  const buildSonyTree = (tx: number, baseY: number, tz: number, hScale = 1.0) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.56, 18), darkTitaniumMat);
    pot.position.set(tx, baseY + 0.28, tz);
    staticGroup.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), oliveBarkMat);
    soil.position.set(tx, baseY + 0.55, tz);
    staticGroup.add(soil);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.35 * hScale, 10), oliveBarkMat);
    trunk.position.set(tx, baseY + 0.55 + 0.675 * hScale, tz);
    staticGroup.add(trunk);
    [
      [0, 1.85 * hScale, 0, 0.55 * hScale],
      [-0.24, 1.55 * hScale, 0.18, 0.40 * hScale],
      [0.24, 1.62 * hScale, -0.16, 0.42 * hScale],
      [0.08, 2.15 * hScale, 0.12, 0.36 * hScale],
    ].forEach(([ox, oy, oz, rad]) => {
      const tuft = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), oliveLeafMat);
      tuft.position.set(tx + ox, baseY + oy, tz + oz);
      staticGroup.add(tuft);
    });
  };

  const buildHiFiTowerSpeaker = (sx: number, baseY: number, sz: number, yaw = 0) => {
    const grp = new THREE.Group();
    grp.position.set(sx, baseY, sz);
    grp.rotation.y = yaw;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.44), brushedSilverMat);
    plinth.position.y = 0.03;
    grp.add(plinth);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.24, 0.36), darkTitaniumMat);
    cab.position.y = 0.68;
    grp.add(cab);
    const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.18, 0.02), warmOakMat);
    baffle.position.set(0, 0.68, 0.185);
    grp.add(baffle);
    [0.34, 0.64, 0.94].forEach((cy, idx) => {
      const drv = new THREE.Mesh(
        new THREE.CylinderGeometry(idx === 2 ? 0.045 : 0.085, idx === 2 ? 0.045 : 0.085, 0.025, 16),
        idx === 2 ? brassMat : brushedSilverMat
      );
      drv.rotation.x = Math.PI / 2;
      drv.position.set(0, cy, 0.195);
      grp.add(drv);
    });
    staticGroup.add(grp);
  };

  const buildBarstool = (bx: number, baseY: number, bz: number, seatH = 0.66) => {
    const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.03, 14), brushedSilverMat);
    basePlate.position.set(bx, baseY + 0.015, bz);
    staticGroup.add(basePlate);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, seatH - 0.06, 10), darkTitaniumMat);
    stem.position.set(bx, baseY + (seatH - 0.06) * 0.5 + 0.03, bz);
    staticGroup.add(stem);
    const footRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 8, 18), brushedSilverMat);
    footRing.rotation.x = Math.PI / 2;
    footRing.position.set(bx, baseY + 0.25, bz);
    staticGroup.add(footRing);
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.08, 16), warmOakMat);
    cushion.position.set(bx, baseY + seatH, bz);
    staticGroup.add(cushion);
  };

  // Floor 1 Luminous Architectural Ceiling Rings + Recessed Gimbal Spotlight Bulbs
  [
    [394.0, -92.0],
    [401.5, -92.0],
    [394.0, -83.0],
    [401.5, -83.0],
  ].forEach(([lx, lz]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.09, 10, 32), brightCeilingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(lx, F2_Y - 0.34, lz);
    staticGroup.add(ring);

    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.05, 12), ceilingBulbMat);
      bulb.position.set(lx + Math.cos(ang) * 1.45, F2_Y - 0.33, lz + Math.sin(ang) * 1.45);
      staticGroup.add(bulb);
    }
  });
  // Perimeter Linear Cove Lights on Floor 1
  const f1CoveW = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 18.0), brightCeilingMat);
  f1CoveW.position.set(388.4, F2_Y - 0.33, -88.5);
  staticGroup.add(f1CoveW);
  const f1CoveN = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.06, 0.18), brightCeilingMat);
  f1CoveN.position.set(400.0, F2_Y - 0.33, -99.4);
  staticGroup.add(f1CoveN);

  // Helper: Multi-Part Sony Showroom Display Table
  const buildSonyDisplayIsland = (
    cx: number,
    baseY: number,
    cz: number,
    w: number,
    d: number,
    theme: 'ps5' | 'alpha' | 'xperia' | 'cinema'
  ) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w - 0.35, 0.84, d - 0.35), darkTitaniumMat);
    base.position.set(cx, baseY + 0.42, cz);
    staticGroup.add(base);

    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), pureWhiteFinMat);
    top.position.set(cx, baseY + 0.88, cz);
    staticGroup.add(top);

    const trimLed = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.02, 0.035, d + 0.02),
      theme === 'ps5' ? playstationBlueLedMat : warmGoldLedMat
    );
    trimLed.position.set(cx, baseY + 0.82, cz);
    staticGroup.add(trimLed);

    if (theme === 'ps5') {
      // Sculpted Dual White PS5 Pro Towers + PS VR2 Headsets + DualSense Charging Docks + Monitors
      [-w * 0.28, w * 0.28].forEach((ox) => {
        const psBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.40, 0.28), pureWhiteFinMat);
        psBody.position.set(cx + ox, baseY + 1.12, cz);
        staticGroup.add(psBody);
        const psCore = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.24), darkTitaniumMat);
        psCore.position.set(cx + ox, baseY + 1.12, cz);
        staticGroup.add(psCore);
        const psBlue = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.29), playstationBlueLedMat);
        psBlue.position.set(cx + ox, baseY + 1.28, cz);
        staticGroup.add(psBlue);

        // DualSense Dock & Controller
        const dock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.14), darkTitaniumMat);
        dock.position.set(cx + ox + 0.38, baseY + 0.94, cz);
        staticGroup.add(dock);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.10), pureWhiteFinMat);
        pad.position.set(cx + ox + 0.38, baseY + 0.99, cz);
        staticGroup.add(pad);

        // Dual 4K Gaming Monitors
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.24, 10), brushedSilverMat);
        stand.position.set(cx + ox, baseY + 1.04, cz + (ox < 0 ? 0.56 : -0.56));
        staticGroup.add(stand);
        const mon = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.45, 0.03), screenGlowMat);
        mon.position.set(cx + ox, baseY + 1.24, cz + (ox < 0 ? 0.52 : -0.52));
        staticGroup.add(mon);
      });
      // Center PS VR2 Headset on acrylic stand
      const vrStand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.26, 12), brushedSilverMat);
      vrStand.position.set(cx, baseY + 1.05, cz);
      staticGroup.add(vrStand);
      const vrVisor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.14), pureWhiteFinMat);
      vrVisor.position.set(cx, baseY + 1.20, cz);
      staticGroup.add(vrVisor);
      const vrBand = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 18), darkTitaniumMat);
      vrBand.rotation.x = Math.PI / 2;
      vrBand.position.set(cx, baseY + 1.20, cz - 0.06);
      staticGroup.add(vrBand);
    } else if (theme === 'alpha') {
      // Sony Alpha 1 II Cameras (body + grip + viewfinder + red ring + white G-Master telephoto)
      for (let i = -1; i <= 1; i++) {
        const pz = cz + i * 1.1;
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.32), darkTitaniumMat);
        plinth.position.set(cx + 0.05, baseY + 0.94, pz);
        staticGroup.add(plinth);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.15), darkTitaniumMat);
        body.position.set(cx - 0.10, baseY + 1.03, pz);
        staticGroup.add(body);
        const evf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.08), darkTitaniumMat);
        evf.position.set(cx - 0.10, baseY + 1.11, pz);
        staticGroup.add(evf);
        const alphaRing = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.025, 16), crimsonRingMat);
        alphaRing.rotation.z = Math.PI / 2;
        alphaRing.position.set(cx + 0.01, baseY + 1.03, pz);
        staticGroup.add(alphaRing);

        const gmLens = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.38, 16), pureWhiteFinMat);
        gmLens.rotation.z = Math.PI / 2;
        gmLens.position.set(cx + 0.21, baseY + 1.03, pz);
        staticGroup.add(gmLens);

        const gmHood = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.074, 0.10, 16), darkTitaniumMat);
        gmHood.rotation.z = Math.PI / 2;
        gmHood.position.set(cx + 0.43, baseY + 1.03, pz);
        staticGroup.add(gmHood);

        const gmRing = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 16), warmGoldLedMat);
        gmRing.rotation.z = Math.PI / 2;
        gmRing.position.set(cx + 0.34, baseY + 1.03, pz);
        staticGroup.add(gmRing);
      }
    } else if (theme === 'cinema') {
      // Floor 2 Sony FX6 / FX3 Cinema Line Rig + BVM-HX310 Studio Monitor + MDR-MV1 Headphones
      const fxRig = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, 0.22), darkTitaniumMat);
      fxRig.position.set(cx - 0.8, baseY + 1.06, cz);
      staticGroup.add(fxRig);
      const fxHandle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.06), brushedSilverMat);
      fxHandle.position.set(cx - 0.8, baseY + 1.24, cz);
      staticGroup.add(fxHandle);
      const matteBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.24), darkTitaniumMat);
      matteBox.position.set(cx - 0.50, baseY + 1.06, cz);
      staticGroup.add(matteBox);

      const refMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.88), darkTitaniumMat);
      refMonitor.position.set(cx + 0.6, baseY + 1.26, cz);
      staticGroup.add(refMonitor);
      const refPanel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.46, 0.82), screenGlowMat);
      refPanel.position.set(cx + 0.56, baseY + 1.26, cz);
      staticGroup.add(refPanel);

      const specCard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.04), pureWhiteFinMat);
      specCard.position.set(cx + 1.4, baseY + 1.01, cz);
      specCard.rotation.x = -0.35;
      staticGroup.add(specCard);
    } else {
      // Xperia 1 VI Phones + WH-1000XM5 Headphones with Curved Arches + Spec Placards
      for (let i = -1; i <= 1; i++) {
        const px = cx + i * 1.1;
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.26, 10), brushedSilverMat);
        stand.position.set(px, baseY + 1.05, cz - 0.35);
        staticGroup.add(stand);
        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.018, 8, 16, Math.PI), warmOakMat);
        arch.position.set(px, baseY + 1.18, cz - 0.35);
        staticGroup.add(arch);
        const cupL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), warmOakMat);
        cupL.position.set(px - 0.095, baseY + 1.12, cz - 0.35);
        staticGroup.add(cupL);
        const cupR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), warmOakMat);
        cupR.position.set(px + 0.095, baseY + 1.12, cz - 0.35);
        staticGroup.add(cupR);

        const phoneStand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), brushedSilverMat);
        phoneStand.position.set(px, baseY + 0.95, cz + 0.42);
        staticGroup.add(phoneStand);
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.21, 0.10), screenGlowMat);
        phone.position.set(px, baseY + 1.06, cz + 0.42);
        phone.rotation.z = 0.35;
        staticGroup.add(phone);
      }
    }
  };

  buildSonyDisplayIsland(393.3, SONY_PODIUM_Y, -95.6, 4.0, 3.8, 'xperia');
  buildSonyDisplayIsland(393.9, SONY_PODIUM_Y, -87.6, 2.8, 4.2, 'alpha');
  buildSonyDisplayIsland(401.0, SONY_PODIUM_Y, -95.0, 5.0, 3.0, 'ps5');
  buildSonyDisplayIsland(401.0, SONY_PODIUM_Y, -86.4, 5.0, 3.4, 'alpha');

  // SW Corner PlayStation Gran Turismo 7 Pro Racing Cockpit Simulator
  const simBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 2.8), darkTitaniumMat);
  simBase.position.set(393.5, SONY_PODIUM_Y + 0.11, -80.3);
  staticGroup.add(simBase);
  const simRimLed = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.04, 2.84), playstationBlueLedMat);
  simRimLed.position.set(393.5, SONY_PODIUM_Y + 0.22, -80.3);
  staticGroup.add(simRimLed);

  const simSeatBase = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.72), darkTitaniumMat);
  simSeatBase.position.set(392.4, SONY_PODIUM_Y + 0.32, -80.3);
  staticGroup.add(simSeatBase);
  const simSeatBack = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.92, 0.66), darkTitaniumMat);
  simSeatBack.position.set(392.05, SONY_PODIUM_Y + 0.76, -80.3);
  simSeatBack.rotation.z = 0.20;
  staticGroup.add(simSeatBack);
  const simStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.78, 0.24), playstationBlueLedMat);
  simStripe.position.set(392.15, SONY_PODIUM_Y + 0.76, -80.3);
  simStripe.rotation.z = 0.20;
  staticGroup.add(simStripe);

  const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.68, 10), brushedSilverMat);
  steerCol.rotation.z = -0.65;
  steerCol.position.set(393.35, SONY_PODIUM_Y + 0.72, -80.3);
  staticGroup.add(steerCol);
  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 10, 20), darkTitaniumMat);
  steerWheel.rotation.y = Math.PI / 2;
  steerWheel.position.set(393.12, SONY_PODIUM_Y + 0.90, -80.3);
  staticGroup.add(steerWheel);

  const gtTex = createSonyPosterTex('GRAN TURISMO 7', 'PS5 Pro • 120Hz OLED Rig', 'PLAYSTATION ARENA', '#38bdf8');
  const simScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.35, 2.2),
    new THREE.MeshStandardMaterial({
      map: gtTex,
      emissive: 0xffffff,
      emissiveMap: gtTex,
      emissiveIntensity: 1.3,
    })
  );
  simScreen.position.set(394.6, SONY_PODIUM_Y + 1.15, -80.3);
  staticGroup.add(simScreen);

  // South Consultation Counter + Barstools + Credenza + BRAVIA Theatre Soundbar 9 + 98" Wall
  const f1Desk = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.04, 1.5), darkTitaniumMat);
  f1Desk.position.set(401.5, SONY_PODIUM_Y + 0.52, -79.4);
  staticGroup.add(f1Desk);
  const f1DeskTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.06, 1.65), pureWhiteFinMat);
  f1DeskTop.position.set(401.5, SONY_PODIUM_Y + 1.07, -79.4);
  staticGroup.add(f1DeskTop);
  [399.5, 401.5, 403.5].forEach((tx) => {
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.20), screenGlowMat);
    tablet.position.set(tx, SONY_PODIUM_Y + 1.11, -79.4);
    staticGroup.add(tablet);
    buildBarstool(tx, SONY_PODIUM_Y, -80.55, 0.72);
  });

  const soundCredenza = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.44, 0.65), warmOakMat);
  soundCredenza.position.set(398.5, SONY_PODIUM_Y + 0.22, -77.15);
  staticGroup.add(soundCredenza);
  const soundbar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.11, 0.16), darkTitaniumMat);
  soundbar.position.set(398.5, SONY_PODIUM_Y + 0.50, -77.10);
  staticGroup.add(soundbar);
  const subWoofer = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.42), darkTitaniumMat);
  subWoofer.position.set(401.9, SONY_PODIUM_Y + 0.23, -77.15);
  staticGroup.add(subWoofer);

  const braviaTex = createSonyPosterTex('BRAVIA XR 98"', 'QD-OLED • Cognitive Processor XR', 'SONY HOME CINEMA', '#38bdf8');
  const braviaMat = new THREE.MeshStandardMaterial({
    map: braviaTex,
    emissive: 0xffffff,
    emissiveMap: braviaTex,
    emissiveIntensity: 1.45,
  });
  const f1BraviaWall = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.6), braviaMat);
  f1BraviaWall.rotation.y = Math.PI;
  f1BraviaWall.position.set(398.5, SONY_PODIUM_Y + 2.4, -76.85);
  f1BraviaWall.userData.noMerge = true;
  staticGroup.add(f1BraviaWall);

  // East Wall Backlit Showcase Niches across Floor 1, 2 & 3 (X = 411.55, Z = -97.5..-86.5)
  const buildEastShowcaseWall = (baseY: number, mode: 'alpha' | 'cinema' | 'vinyl') => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.6, 10.6), darkTitaniumMat);
    frame.position.set(411.6, baseY + 1.85, -92.0);
    staticGroup.add(frame);

    for (let s = 0; s < 3; s++) {
      const sz = -95.4 + s * 3.4;
      const backGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 2.8, 2.8),
        mode === 'vinyl' ? warmGoldLedMat : brightCeilingMat
      );
      backGlow.position.set(411.38, baseY + 1.85, sz);
      staticGroup.add(backGlow);

      [1.05, 1.85, 2.65].forEach((sy, rowIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 2.75), warmOakMat);
        shelf.position.set(411.25, baseY + sy, sz);
        staticGroup.add(shelf);

        for (let k = -2; k <= 2; k++) {
          const pz = sz + k * 0.48;
          if (mode === 'vinyl') {
            const sleeve = new THREE.Mesh(
              new THREE.BoxGeometry(0.04, 0.36, 0.36),
              vinylSleeveMats[(s + rowIdx + k + 6) % vinylSleeveMats.length]
            );
            sleeve.position.set(411.24, baseY + sy + 0.21, pz);
            staticGroup.add(sleeve);
          } else {
            const prop = new THREE.Mesh(
              k % 2 === 0 ? new THREE.CylinderGeometry(0.06, 0.06, 0.26, 12) : new THREE.BoxGeometry(0.14, 0.16, 0.14),
              k % 2 === 0 ? pureWhiteFinMat : brassMat
            );
            prop.position.set(411.22, baseY + sy + 0.16, pz);
            staticGroup.add(prop);
          }
        }
      });
    }
  };
  buildEastShowcaseWall(SONY_PODIUM_Y, 'alpha');
  buildSonyTree(389.6, SONY_PODIUM_Y, -78.7, 1.05);
  buildSonyTree(409.5, SONY_PODIUM_Y, -98.3, 1.10);

  // =========================================================================
  // 5. FLOOR 2 RIBBON SHOWCASE: AFEELA 1 EV PROTOTYPE + BRAVIA CINEMA LOUNGE
  // =========================================================================
  // Circular Glowing EV Turntable directly behind Floor 2 Corner Ribbon Glass
  const f2CarX = 394.8;
  const f2CarZ = -93.8;
  const f2Turntable = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.9, 0.22, 40), pureWhiteFinMat);
  f2Turntable.position.set(f2CarX, F2_Y + 0.11, f2CarZ);
  staticGroup.add(f2Turntable);

  const f2TurntableRing = new THREE.Mesh(new THREE.TorusGeometry(2.76, 0.05, 10, 48), playstationBlueLedMat);
  f2TurntableRing.rotation.x = Math.PI / 2;
  f2TurntableRing.position.set(f2CarX, F2_Y + 0.22, f2CarZ);
  staticGroup.add(f2TurntableRing);

  // Stainless Stanchions surrounding AFEELA 1 Turntable
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.3;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.78, 10), brushedSilverMat);
    post.position.set(f2CarX + Math.cos(ang) * 2.86, F2_Y + 0.39, f2CarZ + Math.sin(ang) * 2.86);
    staticGroup.add(post);
  }

  // Sculpted AFEELA 1 Metallic-White & Black Fastback EV (Sony Honda Mobility)
  const afeela = new THREE.Group();
  afeela.position.set(f2CarX, F2_Y + 0.23, f2CarZ);
  afeela.rotation.y = -Math.PI * 0.72;

  const afeelaWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.65,
    roughness: 0.14,
  });
  const afeelaBody = new THREE.Mesh(createAfeelaSideProfileGeo(), afeelaWhiteMat);
  afeela.add(afeelaBody);

  const afeelaRoof = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.42, 2.2), darkTitaniumMat);
  afeelaRoof.position.set(0, 1.15, -0.30);
  afeela.add(afeelaRoof);

  // Sloped Panoramic Windshield & Rear Fastback Glass
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.04, 0.92), curtainGlassMat);
  frontGlass.position.set(0, 1.14, 1.05);
  frontGlass.rotation.x = 0.52;
  afeela.add(frontGlass);

  // Digital Side Mirror Cameras
  [-0.95, 0.95].forEach((mx) => {
    const camPod = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.09), darkTitaniumMat);
    camPod.position.set(mx, 0.92, 0.78);
    afeela.add(camPod);
  });

  // Signature Front Media Bar Screen across nose
  const mediaBar = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 0.06), playstationBlueLedMat);
  mediaBar.position.set(0, 0.72, 2.18);
  afeela.add(mediaBar);

  const rearLed = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.07, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 2.2 })
  );
  rearLed.position.set(0, 0.76, -2.18);
  afeela.add(rearLed);

  [
    [-0.88, 1.32],
    [0.88, 1.32],
    [-0.88, -1.32],
    [0.88, -1.32],
  ].forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20), darkTitaniumMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, 0.32, wz);
    afeela.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.24, 14), brushedSilverMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, 0.32, wz);
    afeela.add(rim);
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.10, 0.09), playstationBlueLedMat);
    caliper.position.set(wx, 0.32, wz + 0.10);
    afeela.add(caliper);
  });
  staticGroup.add(afeela);

  // Floor 2 Cinema Studio Display Table + East Showcase Wall
  buildSonyDisplayIsland(402.3, F2_Y, -94.4, 4.4, 3.2, 'cinema');
  buildEastShowcaseWall(F2_Y, 'cinema');
  buildSonyTree(389.6, F2_Y, -78.7, 1.0);
  buildSonyTree(409.5, F2_Y, -98.3, 1.0);

  // Floor 2 Home Cinema Lounge Sofa + Cushions + Coffee Table + Twin Hi-Fi Towers
  const f2Sofa = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.48, 1.25), boucleCreamMat);
  f2Sofa.position.set(400.4, F2_Y + 0.24, -80.4);
  staticGroup.add(f2Sofa);
  const f2SofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.56, 0.26), boucleCreamMat);
  f2SofaBack.position.set(400.4, F2_Y + 0.72, -80.95);
  staticGroup.add(f2SofaBack);
  [-2.08, 2.08].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.68, 1.25), boucleCreamMat);
    arm.position.set(400.4 + ax, F2_Y + 0.34, -80.4);
    staticGroup.add(arm);
  });
  [-1.3, 0, 1.3].forEach((cx, ci) => {
    const pill = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.18), ci === 1 ? cushionAmberMat : cushionSlateMat);
    pill.position.set(400.4 + cx, F2_Y + 0.64, -80.70);
    pill.rotation.x = -0.25;
    staticGroup.add(pill);
  });
  const f2Coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.36, 20), warmOakMat);
  f2Coffee.position.set(400.4, F2_Y + 0.18, -79.0);
  staticGroup.add(f2Coffee);
  const f2Book = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.24), darkTitaniumMat);
  f2Book.position.set(400.4, F2_Y + 0.38, -79.0);
  staticGroup.add(f2Book);

  buildHiFiTowerSpeaker(394.0, F2_Y, -77.3, 0);
  buildHiFiTowerSpeaker(403.0, F2_Y, -77.3, 0);

  const afeelaTex = createSonyPosterTex('AFEELA 1  MOBILITY', '45 Sensors • Unreal Engine Cockpit', 'SONY HONDA MOBILITY', '#38bdf8');
  const f2CinemaWall = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 3.3),
    new THREE.MeshStandardMaterial({
      map: afeelaTex,
      emissive: 0xffffff,
      emissiveMap: afeelaTex,
      emissiveIntensity: 1.45,
    })
  );
  f2CinemaWall.rotation.y = Math.PI;
  f2CinemaWall.position.set(398.5, F2_Y + 2.25, -76.85);
  f2CinemaWall.userData.noMerge = true;
  staticGroup.add(f2CinemaWall);

  // Floor 2 Ceiling Luminous Strip Grid + Spotlight Bulbs
  for (let gx = 0; gx < 3; gx++) {
    for (let gz = 0; gz < 3; gz++) {
      const px = 392.0 + gx * 5.8;
      const pz = -95.0 + gz * 6.0;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 4.2), brightCeilingMat);
      strip.position.set(px, F3_Y - 0.34, pz);
      staticGroup.add(strip);
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 12), ceilingBulbMat);
      bulb.position.set(px, F3_Y - 0.36, pz);
      staticGroup.add(bulb);
    }
  }

  // =========================================================================
  // 6. FLOOR 3: SONY CAFÉ LOUNGE + VINYL LISTENING BAR + SKY GALLERY
  // =========================================================================
  // Communal Creator Café Long Table with Brass Dome Lamps, Barstools, Laptops & Coffee Cups
  const f3LongTable = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 2.2), warmOakMat);
  f3LongTable.position.set(394.8, F3_Y + 0.96, -93.8);
  staticGroup.add(f3LongTable);

  [392.6, 394.8, 397.0].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.94, 1.7), darkTitaniumMat);
    leg.position.set(lx, F3_Y + 0.47, -93.8);
    staticGroup.add(leg);

    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.42, 10), brassMat);
    lampStem.position.set(lx, F3_Y + 1.21, -93.8);
    staticGroup.add(lampStem);
    const lampDome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), warmGoldLedMat);
    lampDome.position.set(lx, F3_Y + 1.42, -93.8);
    staticGroup.add(lampDome);

    // Café Barstools along both sides
    buildBarstool(lx, F3_Y, -95.25, 0.68);
    buildBarstool(lx, F3_Y, -92.35, 0.68);

    // Open Glowing VAIO Laptops & Ceramic Coffee Cups on table
    const lapBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), brushedSilverMat);
    lapBase.position.set(lx - 0.45, F3_Y + 1.01, -94.35);
    staticGroup.add(lapBase);
    const lapLid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.02), screenGlowMat);
    lapLid.position.set(lx - 0.45, F3_Y + 1.11, -94.23);
    lapLid.rotation.x = -0.22;
    staticGroup.add(lapLid);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.09, 12), pureWhiteFinMat);
    cup.position.set(lx + 0.35, F3_Y + 1.045, -93.25);
    staticGroup.add(cup);
  });

  // Floor 3 NE Acoustic Listening Lounge (curved armchairs + round table inside 399.8..404.8, -96.4..-92.4)
  const loungeTbl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 20), warmOakMat);
  loungeTbl.position.set(402.3, F3_Y + 0.56, -94.4);
  staticGroup.add(loungeTbl);
  const loungePed = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, 0.54, 14), darkTitaniumMat);
  loungePed.position.set(402.3, F3_Y + 0.27, -94.4);
  staticGroup.add(loungePed);
  [400.7, 403.9].forEach((cx, ci) => {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.42, 0.42, 18), boucleCreamMat);
    seat.position.set(cx, F3_Y + 0.21, -94.4);
    staticGroup.add(seat);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.42, 18, 1, false, ci === 0 ? Math.PI * 0.9 : -Math.PI * 0.1, Math.PI * 0.9), boucleCreamMat);
    back.position.set(cx, F3_Y + 0.56, -94.4);
    staticGroup.add(back);
  });

  // Floor 3 Sony Music Vinyl Listening & Espresso Bar + Dual Espresso Machine + Pastry Display + Barstools
  const f3Bar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.06, 2.0), darkTitaniumMat);
  f3Bar.position.set(400.4, F3_Y + 0.53, -80.2);
  staticGroup.add(f3Bar);
  const f3BarTop = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.07, 2.15), warmOakMat);
  f3BarTop.position.set(400.4, F3_Y + 1.09, -80.2);
  staticGroup.add(f3BarTop);

  [398.4, 399.7, 401.1, 402.4].forEach((sx) => {
    buildBarstool(sx, F3_Y, -81.55, 0.72);
  });

  // Dual-Group Chrome Espresso Machine + Illuminated Glass Pastry Case on Bar
  const espBody = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.46, 0.52), brushedSilverMat);
  espBody.position.set(400.4, F3_Y + 1.35, -80.2);
  staticGroup.add(espBody);
  const espTrim = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.04), brassMat);
  espTrim.position.set(400.4, F3_Y + 1.48, -80.47);
  staticGroup.add(espTrim);
  const grinder = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.38, 12), darkTitaniumMat);
  grinder.position.set(401.15, F3_Y + 1.31, -80.2);
  staticGroup.add(grinder);

  const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.56), curtainGlassMat);
  pastryCase.position.set(397.8, F3_Y + 1.33, -80.2);
  staticGroup.add(pastryCase);
  const pastryGlow = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.04, 0.46), warmGoldLedMat);
  pastryGlow.position.set(397.8, F3_Y + 1.14, -80.2);
  staticGroup.add(pastryGlow);

  // Dual Turntables + Speakers on Floor 3 Listening Bar
  [398.8, 402.0].forEach((tx) => {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.38), brushedSilverMat);
    deck.position.set(tx, F3_Y + 1.16, -80.2);
    staticGroup.add(deck);
    const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.015, 16), darkTitaniumMat);
    vinyl.position.set(tx, F3_Y + 1.21, -80.2);
    staticGroup.add(vinyl);
  });

  // East Backlit Vinyl Record Wall + Trees on Floor 3
  buildEastShowcaseWall(F3_Y, 'vinyl');
  buildSonyTree(389.6, F3_Y, -78.7, 0.95);
  buildSonyTree(409.5, F3_Y, -98.3, 0.95);
  buildHiFiTowerSpeaker(394.0, F3_Y, -77.3, 0);
  buildHiFiTowerSpeaker(403.0, F3_Y, -77.3, 0);

  const f3CafeTex = createSonyPosterTex('SONY MUSIC • CAFÉ', '360 Reality Audio & Espresso', 'LEVEL 3 SKY LOUNGE', '#fbbf24');
  const f3SignWall = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 3.2),
    new THREE.MeshStandardMaterial({
      map: f3CafeTex,
      emissive: 0xffffff,
      emissiveMap: f3CafeTex,
      emissiveIntensity: 1.45,
    })
  );
  f3SignWall.rotation.y = Math.PI;
  f3SignWall.position.set(398.5, F3_Y + 2.25, -76.85);
  f3SignWall.userData.noMerge = true;
  staticGroup.add(f3SignWall);

  // Floor 3 Glowing Coffered Ceiling Grid + Spotlight Bulbs
  for (let gx = 0; gx < 3; gx++) {
    for (let gz = 0; gz < 3; gz++) {
      const px = 392.0 + gx * 5.8;
      const pz = -95.0 + gz * 6.0;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.06, 4.8), warmGoldLedMat);
      panel.position.set(px, ROOF_Y - 0.34, pz);
      staticGroup.add(panel);
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 12), ceilingBulbMat);
      bulb.position.set(px, ROOF_Y - 0.36, pz);
      staticGroup.add(bulb);
    }
  }

  // =========================================================================
  // 7. 3-FLOOR SWITCHBACK STAIRCASE (SE CORNER: X = 406.0..411.0, Z = -84.0..-77.0)
  // =========================================================================
  for (let fl = 0; fl < 2; fl++) {
    const flBaseY = SONY_PODIUM_Y + fl * SONY_FLOOR_H;
    const flMidY = flBaseY + SONY_FLOOR_H * 0.5;

    // 10 treads UP (West lane X = 407.25, Z = -84.0 .. -79.0)
    // 10 treads TOP (East lane X = 409.75, Z = -79.0 .. -84.0)
    for (let s = 0; s < 10; s++) {
      const t = (s + 0.5) / 10;
      const treadUp = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.11, 0.46), warmOakMat);
      treadUp.position.set(407.25, flBaseY + t * (SONY_FLOOR_H * 0.5) - 0.055, -84.0 + t * 5.0);
      staticGroup.add(treadUp);

      const ledUp = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, 0.04), warmGoldLedMat);
      ledUp.position.set(407.25, flBaseY + t * (SONY_FLOOR_H * 0.5) - 0.10, -84.0 + t * 5.0 - 0.18);
      staticGroup.add(ledUp);

      const treadTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.11, 0.46), warmOakMat);
      treadTop.position.set(409.75, flMidY + t * (SONY_FLOOR_H * 0.5) - 0.055, -79.0 - t * 5.0);
      staticGroup.add(treadTop);

      const ledTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, 0.04), warmGoldLedMat);
      ledTop.position.set(409.75, flMidY + t * (SONY_FLOOR_H * 0.5) - 0.10, -79.0 - t * 5.0 + 0.18);
      staticGroup.add(ledTop);
    }

    const landing = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.16, 2.0), warmOakMat);
    landing.position.set(408.5, flMidY - 0.08, -78.0);
    staticGroup.add(landing);
  }

  // Full-Height Stairwell Glass Balustrade along West edge (X = 405.85)
  const stairGlassRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, SONY_FLOOR_H * 2 + 1.15, 7.1), balustradeGlassMat);
  stairGlassRail.position.set(405.85, SONY_PODIUM_Y + (SONY_FLOOR_H * 2 + 1.15) * 0.5, -80.6);
  staticGroup.add(stairGlassRail);

  const stairTopBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 7.1), brushedSilverMat);
  stairTopBar.position.set(405.85, F3_Y + 1.15, -80.6);
  staticGroup.add(stairTopBar);

  // =========================================================================
  // 8. ARCHITECTURAL POINT LIGHTS & SIDEWALK POOLS (HIGH-BRIGHTNESS SHOWROOM)
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
    const light = new THREE.PointLight(color, dayInt, distance, 1.0);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => (alwaysOn ? 1 : currentOpenFactor),
    });
  };

  addLight(0xfffef5, 9.8, 16.8, 36, 394.0, 4.3, -93.0); // Floor 1 West & NW Xperia/Alpha Gallery
  addLight(0xf0f9ff, 9.4, 16.0, 34, 402.5, 4.3, -92.0); // Floor 1 North PS5 Pro & East Showcase
  addLight(0xfffbeb, 9.2, 15.8, 34, 397.5, 4.3, -81.0); // Floor 1 GT7 Racing Arena & BRAVIA Lounge
  addLight(0xfffef5, 9.6, 16.6, 36, 394.8, F2_Y + 3.8, -93.5); // Floor 2 AFEELA 1 EV Turntable
  addLight(0xfef9e7, 9.2, 15.8, 34, 401.5, F2_Y + 3.8, -83.5); // Floor 2 Cinema Studio & Lounge
  addLight(0xfef3c7, 9.4, 16.2, 36, 395.5, F3_Y + 3.6, -93.5); // Floor 3 Creator Café Long Table
  addLight(0xfef3c7, 9.0, 15.6, 34, 401.5, F3_Y + 3.6, -82.5); // Floor 3 Espresso & Vinyl Listening Bar
  addLight(0xfffbeb, 3.6, 8.2, 24, 385.5, 4.2, -88.2, true); // West Sơn Tây Welcome Pool
  addLight(0xfffbeb, 3.6, 8.2, 24, 400.2, 4.2, -102.2, true); // North Bạch Đằng Welcome Pool

  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  poolMats.push(poolMat);
  const westPool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 24.0), poolMat);
  westPool.rotation.x = -Math.PI / 2;
  westPool.position.set(385.4, SONY_PODIUM_Y + 0.015, -88.5);
  staticGroup.add(westPool);

  const northPool = new THREE.Mesh(new THREE.PlaneGeometry(24.0, 3.4), poolMat);
  northPool.rotation.x = -Math.PI / 2;
  northPool.position.set(399.5, SONY_PODIUM_Y + 0.015, -102.3);
  staticGroup.add(northPool);

  // =========================================================================
  // 9. UPDATE LOOP (DUAL PORTALS, SHUTTERS & DIAMOND LATTICE NIGHT GLOW)
  // =========================================================================
  let westDoorProg = 0;
  let northDoorProg = 0;
  let shutterProgress = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: SonyStoreNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isSonyStoreOpenAtHour(rawHour);
    currentOpenFactor = isOpen ? 1 : THREE.MathUtils.lerp(1, 0.22, shutterProgress);

    brightCeilingMat.emissiveIntensity = THREE.MathUtils.lerp(3.2, 6.2, lampFactor) * currentOpenFactor;
    ceilingBulbMat.emissiveIntensity = THREE.MathUtils.lerp(3.6, 6.8, lampFactor) * currentOpenFactor;
    playstationBlueLedMat.emissiveIntensity = THREE.MathUtils.lerp(2.8, 5.4, lampFactor) * currentOpenFactor;
    warmGoldLedMat.emissiveIntensity = THREE.MathUtils.lerp(2.8, 5.4, lampFactor) * currentOpenFactor;
    latticeMat.emissiveIntensity = THREE.MathUtils.lerp(0.22, 1.55, lampFactor) * currentOpenFactor;
    latticeCrownMat.emissiveIntensity = THREE.MathUtils.lerp(0.28, 1.85, lampFactor) * currentOpenFactor;
    sonyLogoMat.emissiveIntensity = THREE.MathUtils.lerp(1.6, 3.0, lampFactor);
    braviaMat.emissiveIntensity = THREE.MathUtils.lerp(1.35, 2.35, lampFactor) * currentOpenFactor;

    let wantWestOpen = false;
    let wantNorthOpen = false;
    if (isOpen) {
      if (playerPos && playerPos.y < 2.2) {
        if (Math.hypot(playerPos.x - WEST_DOOR_X, playerPos.z - WEST_DOOR_Z) <= 4.6) wantWestOpen = true;
        if (Math.hypot(playerPos.x - NORTH_DOOR_X, playerPos.z - NORTH_DOOR_Z) <= 4.6) wantNorthOpen = true;
      }
      if (!wantWestOpen && npcController?.hasNpcNearWestDoor()) wantWestOpen = true;
      if (!wantNorthOpen && npcController?.hasNpcNearNorthDoor()) wantNorthOpen = true;
    }

    westDoorProg += ((wantWestOpen ? 1 : 0) - westDoorProg) * Math.min(1, dt * 6.5);
    northDoorProg += ((wantNorthOpen ? 1 : 0) - northDoorProg) * Math.min(1, dt * 6.5);

    const westSlide = westDoorProg * 2.1;
    westPortal.leafA.position.z = westPortal.closedA - westSlide;
    westPortal.leafB.position.z = westPortal.closedB + westSlide;

    const northSlide = northDoorProg * 2.1;
    northPortal.leafA.position.x = northPortal.closedA - northSlide;
    northPortal.leafB.position.x = northPortal.closedB + northSlide;

    const npcsEmpty = npcController ? npcController.isFullyClosedAndEmpty() : true;
    const targetShutter = !isOpen && (npcsEmpty || shutterProgress > 0.05) ? 1 : 0;
    shutterProgress += (targetShutter - shutterProgress) * Math.min(1, dt * 2.2);
    setShutterProgress(westPortal.shutter, shutterProgress);
    setShutterProgress(northPortal.shutter, shutterProgress);
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
// SONY STORE NPC CONTROLLER (SPECIALISTS & VISITORS ACROSS 3 FLOORS)
// =========================================================================

interface SonyActor {
  id: number;
  kind: 'specialist' | 'shopper';
  root: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  bag: THREE.Mesh;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: 'browse' | 'admire';
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  stateTimer: number;
  walkPhase: number;
  walkPhaseRef: { phase: number };
  exitRef: { idx: number };
  exitDone: boolean;
  speed: number;
  seed: number;
  glbHandle: GlbHumanHandle;
}

const SONY_SPOTS = [
  { x: 390.6, z: -92.0, yaw: Math.PI / 2 }, // West Entry Gallery
  { x: 397.4, z: -96.2, yaw: Math.PI }, // North PS5 Pro Showcase
  { x: 397.0, z: -87.4, yaw: Math.PI / 2 }, // Alpha Camera Counter
  { x: 396.6, z: -80.4, yaw: -Math.PI / 2 }, // Racing Simulator
  { x: 401.5, z: -81.8, yaw: 0 }, // Sony Bravia Desk
];

export class SonyStoreNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: SonyActor[] = [];

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const outfits = [
      { shirt: 0x0f172a, pants: 0x1e293b, hair: 0x18181b, skin: '#fde2cc', kind: 'specialist' as const },
      { shirt: 0x111827, pants: 0x0f172a, hair: 0x2c1a10, skin: '#f5c7a3', kind: 'specialist' as const },
      { shirt: 0x1d4ed8, pants: 0x1e293b, hair: 0x1c1917, skin: '#fbe0c8', kind: 'shopper' as const },
      { shirt: 0xf8fafc, pants: 0x334155, hair: 0x111827, skin: '#fde2cc', kind: 'shopper' as const },
      { shirt: 0x0284c7, pants: 0x0f172a, hair: 0x3b2314, skin: '#f5c7a3', kind: 'shopper' as const },
      { shirt: 0xeab308, pants: 0x1e293b, hair: 0x18181b, skin: '#fbe0c8', kind: 'shopper' as const },
      { shirt: 0x10b981, pants: 0x18181b, hair: 0x271911, skin: '#e8b48e', kind: 'shopper' as const },
    ];

    outfits.forEach((cfg, idx) => {
      const built = this.buildActorMesh(helpers, cfg, idx);
      let sx = 396.5;
      let sy = SONY_PODIUM_Y;
      let sz = -90.0;
      let yaw = 0;

      if (idx === 5) {
        // Floor 2 admiring AFEELA 1 EV Prototype
        sx = 399.0;
        sy = SONY_PODIUM_Y + SONY_FLOOR_H;
        sz = -92.5;
        yaw = -Math.PI * 0.5;
      } else if (idx === 6) {
        // Floor 3 Sony Café Lounge
        sx = 398.5;
        sy = SONY_PODIUM_Y + SONY_FLOOR_H * 2;
        sz = -93.0;
        yaw = Math.PI * 0.5;
      } else {
        const spot = SONY_SPOTS[idx % SONY_SPOTS.length];
        sx = spot.x;
        sz = spot.z;
        yaw = spot.yaw;
      }

      built.root.position.set(sx, sy, sz);
      built.root.rotation.y = yaw;
      this.rootGroup.add(built.root);

      this.actors.push({
        id: idx,
        kind: cfg.kind,
        root: built.root,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        bag: built.bag,
        homePos: new THREE.Vector3(sx, sy, sz),
        homeYaw: yaw,
        phase: 'admire',
        pathQueue: [],
        pathIdx: 0,
        stateTimer: 1.5 + idx * 1.1,
        walkPhase: idx * 0.9,
        walkPhaseRef: { phase: idx * 0.9 },
        exitRef: { idx: 0 },
        exitDone: false,
        speed: cfg.kind === 'specialist' ? 1.35 : 1.22,
        seed: idx * 23 + 5,
        glbHandle: built.glbHandle,
      });
    });
  }

  private buildActorMesh(
    helpers: HospitalCharacterHelpers,
    cfg: { shirt: number; pants: number; hair: number; skin: string; kind: 'specialist' | 'shopper' },
    idx: number
  ) {
    const root = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    root.add(fallbackGroup);
    const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: 0.72 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: cfg.shirt, roughness: 0.65 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 0.82 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), shirtMat);
    torso.position.y = 1.04;
    fallbackGroup.add(torso);

    if (cfg.kind === 'specialist') {
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
      );
      badge.position.set(0.11, 1.14, 0.128);
      fallbackGroup.add(badge);
    }

    const faceTex = helpers.createFaceTexture('happy', cfg.skin);
    const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
    head.position.y = 1.48;
    fallbackGroup.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
    hair.position.y = 1.61;
    fallbackGroup.add(hair);

    const makeArm = (ax: number) => {
      const p = new THREE.Group();
      p.position.set(ax, 1.26, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), shirtMat);
      m.position.y = -0.18;
      p.add(m);
      fallbackGroup.add(p);
      return p;
    };
    const leftArm = makeArm(-0.28);
    const rightArm = makeArm(0.28);

    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.24, 0.20),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.45 })
    );
    bag.position.set(0, -0.44, 0.04);
    bag.visible = cfg.kind === 'shopper';
    rightArm.add(bag);

    const makeLeg = (lx: number) => {
      const p = new THREE.Group();
      p.position.set(lx, 0.76, 0);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.64, 0.15), pantsMat);
      leg.position.y = -0.32;
      p.add(leg);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.22), shoeMat);
      shoe.position.set(0, -0.68, 0.03);
      p.add(shoe);
      fallbackGroup.add(p);
      return p;
    };
    const leftLeg = makeLeg(-0.10);
    const rightLeg = makeLeg(0.10);

    const spec =
      cfg.kind === 'specialist'
        ? idx === 0
          ? CASHIER_NPC_MODEL
          : pickStationaryCivilianModel(idx + 53)
        : pickShopCustomerModel(idx + 59);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: root,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: cfg.kind === 'specialist' && idx === 0 ? 'Checkout' : 'Idle',
      phaseOffset: idx * 0.63,
    });

    return { root, leftArm, rightArm, leftLeg, rightLeg, bag, glbHandle };
  }

  public hasNpcNearWestDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const p = this.actors[i].root.position;
      if (p.y < 2.2 && Math.hypot(p.x - WEST_DOOR_X, p.z - WEST_DOOR_Z) < 3.6) return true;
    }
    return false;
  }

  public hasNpcNearNorthDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const p = this.actors[i].root.position;
      if (p.y < 2.2 && Math.hypot(p.x - NORTH_DOOR_X, p.z - NORTH_DOOR_Z) < 3.6) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      if (this.actors[i].root.visible && !this.actors[i].exitDone) return false;
    }
    return true;
  }

  public update(delta: number, rawHour: number) {
    const dt = Math.min(delta, 0.1);
    const isOpen = isSonyStoreOpenAtHour(rawHour);

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!isOpen) {
        if (!a.exitDone) {
          a.glbHandle.setAnimState('Walk');
          const exitViaNorth = a.id % 2 === 1;
          const exitPts = exitViaNorth
            ? [
                new THREE.Vector3(NORTH_DOOR_X, SONY_PODIUM_Y, NORTH_DOOR_Z),
                new THREE.Vector3(NORTH_DOOR_X, 0, -104.8),
              ]
            : [
                new THREE.Vector3(WEST_DOOR_X, SONY_PODIUM_Y, WEST_DOOR_Z),
                new THREE.Vector3(383.0, 0, WEST_DOOR_Z),
              ];
          const done = advanceNpcExitPath(
            a.root,
            exitPts,
            a.exitRef,
            1.65,
            dt,
            { legL: a.leftLeg, legR: a.rightLeg, armL: a.leftArm, armR: a.rightArm },
            a.walkPhaseRef
          );
          if (done) {
            a.exitDone = true;
            a.root.visible = false;
            a.glbHandle.setAnimState('Idle');
          }
        }
        continue;
      }

      if (a.exitDone || !a.root.visible) {
        a.exitDone = false;
        a.exitRef.idx = 0;
        a.root.visible = true;
        a.root.position.copy(a.homePos);
        a.phase = 'admire';
        a.stateTimer = 1.8 + (a.id % 4);
        a.glbHandle.setAnimState(a.kind === 'specialist' && a.id === 0 ? 'Checkout' : 'Idle');
      }

      a.stateTimer -= dt;
      if (a.phase === 'admire') {
        a.glbHandle.setAnimState(a.kind === 'specialist' && a.id === 0 ? 'Checkout' : 'Idle');
        a.leftLeg.rotation.x *= 0.85;
        a.rightLeg.rotation.x *= 0.85;
        a.leftArm.rotation.x *= 0.85;
        a.rightArm.rotation.x *= 0.85;
        if (a.stateTimer <= 0) {
          if (a.homePos.y > 2.2) {
            const nextZ = a.homePos.z + (Math.sin(a.seed + i) > 0 ? -1.4 : 1.4);
            a.pathQueue = [new THREE.Vector3(a.homePos.x, a.homePos.y, nextZ)];
          } else {
            const nextSpot = SONY_SPOTS[(a.id + Math.floor(rawHour * 3) + 1) % SONY_SPOTS.length];
            a.pathQueue = [new THREE.Vector3(nextSpot.x, SONY_PODIUM_Y, nextSpot.z)];
          }
          a.pathIdx = 0;
          a.phase = 'browse';
          a.stateTimer = 8.0;
          a.glbHandle.setAnimState('Walk');
        }
      } else if (a.phase === 'browse') {
        const tgt = a.pathQueue[a.pathIdx];
        if (!tgt || a.stateTimer <= 0) {
          a.phase = 'admire';
          a.stateTimer = 4.0 + (a.id % 3) * 1.6;
          a.glbHandle.setAnimState(a.kind === 'specialist' && a.id === 0 ? 'Checkout' : 'Idle');
          continue;
        }
        const dx = tgt.x - a.root.position.x;
        const dz = tgt.z - a.root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.25) {
          a.phase = 'admire';
          a.stateTimer = 4.5 + (a.id % 3) * 1.4;
          a.glbHandle.setAnimState(a.kind === 'specialist' && a.id === 0 ? 'Checkout' : 'Idle');
        } else {
          a.glbHandle.setAnimState('Walk');
          const step = Math.min(dist, a.speed * dt);
          a.root.position.x += (dx / dist) * step;
          a.root.position.z += (dz / dist) * step;
          const yaw = Math.atan2(dx, dz);
          let diff = yaw - a.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.root.rotation.y += diff * Math.min(1, dt * 7);

          a.walkPhase += dt * a.speed * 5.2;
          const sw = Math.sin(a.walkPhase) * 0.42;
          a.leftLeg.rotation.x = sw;
          a.rightLeg.rotation.x = -sw;
          a.leftArm.rotation.x = -sw * 0.55;
          a.rightArm.rotation.x = sw * 0.55;
        }
      }
    }
  }
}
