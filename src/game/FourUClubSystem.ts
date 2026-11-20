import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  ADULT_NPC_MODELS,
  CASHIER_NPC_MODEL,
  GUARD_NPC_MODEL,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isFourUClubOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';

export const FOUR_U_FLOOR2_Y = 4.60;

export function isPlayerInFourUClubZone(x: number, z: number): boolean {
  return x >= 201.5 && x <= 252.5 && z >= -70.4 && z <= -40.2;
}

export interface FourUClubBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: FourUClubNpcController | null,
    playerPos?: THREE.Vector3
  ) => void;
  getClosedFactor: () => number;
}

// =========================================================================
// COLLIDERS: 4U CLUB (X = 207.0 .. 252.0, Z = -70.0 .. -40.2)
// Front entrance doors at X = 211.5..213.5 are PERMANENTLY CLOSED!
// Spacious two-floor interior packed with 18 VIP tables, Onyx Super-Bar & DJ Stage!
// =========================================================================
export const FOUR_U_COLLIDERS: IntersectionColliderBox[] = [
  // Outer Rear & Side Perimeter Walls (Floor 1 & 2)
  { minX: 207.0, maxX: 252.2, minZ: -70.2, maxZ: -69.5, floor: 'both' }, // North wall
  { minX: 251.2, maxX: 252.2, minZ: -70.0, maxZ: -40.2, floor: 'both' }, // East rear stage wall
  { minX: 212.5, maxX: 252.2, minZ: -40.6, maxZ: -40.0, floor: 'both' }, // South divider wall next to KHÓI

  // Front Cliff Facade Walls with Openable Automatic Entrance Doorway (Z=-56.35..-52.45 on Floor 1)
  { minX: 211.5, maxX: 213.6, minZ: -69.8, maxZ: -56.35, floor: 'both' },
  { minX: 211.5, maxX: 213.6, minZ: -52.45, maxZ: -40.2, floor: 'both' },
  { minX: 211.5, maxX: 213.6, minZ: -56.35, maxZ: -52.45, floor: 2 },

  // Outside Velvet Stanchion Ropes flanking the closed gold entrance
  { minX: 209.6, maxX: 211.6, minZ: -58.0, maxZ: -57.2, floor: 1 },
  { minX: 209.6, maxX: 211.6, minZ: -51.6, maxZ: -50.8, floor: 1 },

  // Parked Chrome-Gold Luxury Coupe at South Sidewalk Curb (X = 207.1..208.9, Z = -48.6..-43.2)
  { minX: 207.1, maxX: 208.9, minZ: -48.6, maxZ: -43.2, floor: 1 },

  // Monumental East DJ Stage & Line-Array Speaker Stacks (X = 246.8..251.5, Z = -62.5..-47.5)
  { minX: 246.8, maxX: 251.5, minZ: -62.5, maxZ: -47.5, floor: 1 },

  // Long Illuminated Onyx VIP Super-Bar (North-East X = 230.0..248.5, Z = -69.0..-63.8)
  { minX: 230.0, maxX: 248.5, minZ: -69.0, maxZ: -63.8, floor: 1 },

  // Floor 1: 12 Spaciously Arranged VIP Bottle-Service Lounge Tables
  ...[
    [217.5, -65.0],
    [217.5, -59.5],
    [217.5, -50.0],
    [217.5, -45.0],
    [223.8, -65.0],
    [223.8, -59.5],
    [223.8, -50.0],
    [230.0, -47.0],
    [235.5, -60.0],
    [235.5, -47.0],
    [241.5, -60.0],
    [241.5, -47.0],
  ].map(([tx, tz]) => ({
    minX: tx - 1.15,
    maxX: tx + 1.15,
    minZ: tz - 1.0,
    maxZ: tz + 1.0,
    floor: 1 as const,
  })),

  // Interior Staircase North Safety Rail (open ONLY at West foot X = 223.5!)
  { minX: 223.5, maxX: 229.6, minZ: -44.4, maxZ: -44.0, floor: 1 },

  // Floor 2 Atrium Balustrade & Stairwell Safety Rail
  { minX: 224.8, maxX: 225.2, minZ: -62.5, maxZ: -47.5, floor: 2 },
  { minX: 223.3, maxX: 229.6, minZ: -44.4, maxZ: -44.0, floor: 2 },
  { minX: 223.3, maxX: 223.7, minZ: -44.4, maxZ: -40.4, floor: 2 },

  // Floor 2: 6 Sky-Gallery VIP Lounge Tables
  ...[
    [217.5, -64.5],
    [217.5, -55.0],
    [217.5, -46.5],
    [233.0, -66.0],
    [242.5, -66.0],
    [238.0, -45.0],
  ].map(([tx, tz]) => ({
    minX: tx - 1.1,
    maxX: tx + 1.1,
    minZ: tz - 0.95,
    maxZ: tz + 0.95,
    floor: 2 as const,
  })),
];

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/**
 * Procedural Raw Architectural Stone & Mineral Cliff CanvasTexture (Left Grey-Beige / Right Bronze-Ochre)
 */
function createCliffStoneTex(variant: 'left' | 'right'): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (variant === 'left') {
    grad.addColorStop(0, '#78716c');
    grad.addColorStop(0.5, '#57534e');
    grad.addColorStop(1, '#44403c');
  } else {
    grad.addColorStop(0, '#443624');
    grad.addColorStop(0.55, '#7c5d26');
    grad.addColorStop(1, '#3b2e1e');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  let seed = variant === 'left' ? 1337 : 4242;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 420; i++) {
    const px = rnd() * w;
    const py = rnd() * h;
    const rx = 20 + rnd() * 90;
    const ry = 12 + rnd() * 55;
    ctx.fillStyle =
      rnd() > 0.5
        ? variant === 'left'
          ? 'rgba(214, 211, 209, 0.10)'
          : 'rgba(217, 159, 56, 0.14)'
        : 'rgba(15, 13, 12, 0.18)';
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.fillStyle = variant === 'left' ? 'rgba(214, 211, 209, 0.36)' : 'rgba(226, 220, 205, 0.42)';
  ctx.beginPath();
  if (variant === 'left') {
    ctx.moveTo(w * 0.25, h * 0.88);
    ctx.lineTo(w * 0.52, h * 0.65);
    ctx.lineTo(w * 0.62, h * 0.72);
    ctx.lineTo(w * 0.35, h * 0.94);
  } else {
    ctx.moveTo(w * 0.48, h * 0.08);
    ctx.lineTo(w * 0.58, h * 0.14);
    ctx.lineTo(w * 0.34, h * 0.52);
    ctx.lineTo(w * 0.24, h * 0.46);
  }
  ctx.closePath();
  ctx.fill();

  for (let k = 0; k < 22; k++) {
    ctx.strokeStyle = k % 2 === 0 ? 'rgba(24, 20, 16, 0.42)' : 'rgba(245, 245, 244, 0.18)';
    ctx.lineWidth = 2 + rnd() * 3;
    ctx.beginPath();
    let cx = rnd() * w;
    let cy = rnd() * h;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (rnd() - 0.35) * 140;
      cy += (rnd() - 0.35) * 120;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Iconic Glowing Stylized "4U CLUB" Badge CanvasTexture
 */
function createFourULogoTex(withRoundedBadge = true): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  if (withRoundedBadge) {
    ctx.fillStyle = '#090a0f';
    roundRectPath(ctx, 44, 22, w - 88, h - 44, 72);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 6;
    roundRectPath(ctx, 44, 22, w - 88, h - 44, 72);
    ctx.stroke();
  }

  ctx.save();
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(232, 68);
  ctx.lineTo(138, 226);
  ctx.lineTo(278, 226);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(236, 174);
  ctx.lineTo(236, 294);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(286, 94);
  ctx.lineTo(286, 246);
  ctx.arc(326, 246, 40, Math.PI, 0, true);
  ctx.lineTo(366, 94);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 108px system-ui, sans-serif';
  ctx.fillText('CLUB', 256, 396);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createFourUVipDoorCrestTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(18, 13, 8, 0.86)';
  ctx.fillRect(0, 0, 512, 512);

  // Brass double-door frame border
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 10;
  roundRectPath(ctx, 22, 22, 468, 468, 18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 96px system-ui, sans-serif';
  ctx.fillText('4U', 256, 155);
  ctx.fillStyle = '#fcd34d';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText('CLUB • VIP', 256, 245);

  ctx.fillStyle = '#3b0764';
  roundRectPath(ctx, 96, 326, 320, 74, 14);
  ctx.fill();
  ctx.strokeStyle = '#e879f9';
  ctx.lineWidth = 4;
  roundRectPath(ctx, 96, 326, 320, 74, 14);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText('WELCOME • VIP CLUB', 256, 364);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFourUStageScreenTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createRadialGradient(512, 256, 20, 512, 256, 560);
  bg.addColorStop(0, '#a855f7');
  bg.addColorStop(0.38, '#581c87');
  bg.addColorStop(0.74, '#78350f');
  bg.addColorStop(1, '#07080d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 24; i++) {
    const x = 64 + i * 38;
    const barH = 70 + Math.abs(Math.sin(i * 0.65)) * 180;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(217, 70, 239, 0.45)' : 'rgba(251, 191, 36, 0.45)';
    ctx.fillRect(x, 256 - barH * 0.5, 20, barH);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#e879f9';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 104px system-ui, sans-serif';
  ctx.fillText('4U CLUB', 512, 232);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('SUPERCLUB • VIP LOUNGE • NIGHTLIFE', 512, 322);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFourUGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(192, 132, 252, 0.30)');
  grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.14)');
  grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createNormalizedCliffGeo(points: Array<[number, number]>, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.18,
    bevelSegments: 2,
  });

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  points.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const posAttr = geo.attributes.position;
  const uvAttr = geo.attributes.uv;
  if (posAttr && uvAttr) {
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      uvAttr.setXY(i, (px - minX) / spanX, (py - minY) / spanY);
    }
    uvAttr.needsUpdate = true;
  }
  geo.computeVertexNormals();
  return geo;
}

export function createFourUClubStructure(): FourUClubBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Architectural Nightclub Materials
  const sidewalkGraniteMat = new THREE.MeshStandardMaterial({ color: 0x1e222d, roughness: 0.65 });
  const marbleDancefloorMat = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.28, metalness: 0.32 });
  const concreteArchitectureMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.72 });
  const obsidianSteelMat = new THREE.MeshStandardMaterial({ color: 0x0b0e15, roughness: 0.34, metalness: 0.78 });
  const brushedGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd99b38,
    emissive: 0x78350f,
    emissiveIntensity: 0.25,
    roughness: 0.24,
    metalness: 0.85,
  });
  const warmFoyerGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  const darkCurtainGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.72,
    transparent: true,
    opacity: 0.76,
  });
  const closedDoorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x3b2610,
    emissive: 0x78350f,
    emissiveIntensity: 0.32,
    roughness: 0.14,
    metalness: 0.45,
    transparent: true,
    opacity: 0.56,
  });
  const balconyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    roughness: 0.1,
    metalness: 0.35,
    transparent: true,
    opacity: 0.38,
  });
  const velvetSofaMat = new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.78 });
  const velvetRopeMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.72 });
  const sportsCarChromeMat = new THREE.MeshStandardMaterial({
    color: 0xe7d6a8,
    roughness: 0.14,
    metalness: 0.94,
  });

  const purpleNeonMat = new THREE.MeshStandardMaterial({
    color: 0xe879f9,
    emissive: 0xc026d3,
    emissiveIntensity: 1.75,
    roughness: 0.18,
  });
  const cyanNeonMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.6,
    roughness: 0.18,
  });
  const goldNeonMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  const whiteNeonMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf1f5f9,
    emissiveIntensity: 1.45,
    roughness: 0.15,
  });

  neonMats.push(purpleNeonMat, cyanNeonMat, goldNeonMat, whiteNeonMat);
  lanternMats.push(warmFoyerGoldMat);

  const signDynamicMats: THREE.MeshStandardMaterial[] = [];

  const leftRockTex = createCliffStoneTex('left');
  const rightRockTex = createCliffStoneTex('right');
  const leftRockMat = new THREE.MeshStandardMaterial({
    map: leftRockTex,
    roughness: 0.88,
    metalness: 0.06,
  });
  const rightRockMat = new THREE.MeshStandardMaterial({
    map: rightRockTex,
    roughness: 0.84,
    metalness: 0.12,
  });

  const poolTex = createFourUGlowPoolTex();
  const fourUPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(fourUPoolMat);

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material
  ) => {
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    const d = Math.abs(z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    staticGroup.add(m);
    return m;
  };

  const addNeonSegment = (
    p0: [number, number, number],
    p1: [number, number, number],
    mat: THREE.Material,
    radius = 0.065
  ) => {
    const v0 = new THREE.Vector3(...p0);
    const v1 = new THREE.Vector3(...p1);
    const dir = new THREE.Vector3().subVectors(v1, v0);
    const len = dir.length();
    if (len < 0.01) return;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat);
    cyl.position.copy(v0).addScaledVector(dir, 0.5);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    staticGroup.add(cyl);
  };

  // =========================================================================
  // 1. SIDEWALK PLAZA & EXPANSIVE INTERIOR MARBLE DANCEFLOOR (X=207..252, Z=-70..-40.2)
  // =========================================================================
  addBox(207.0, 212.5, -0.25, 0.0, -70.0, -40.2, sidewalkGraniteMat);
  addBox(212.5, 252.0, -0.25, 0.01, -70.0, -40.2, marbleDancefloorMat);

  const pool = new THREE.Mesh(new THREE.PlaneGeometry(24, 26), fourUPoolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(211.0, 0.025, -54.5);
  staticGroup.add(pool);

  // =========================================================================
  // 2. MONUMENTAL SPLIT JAGGED CLIFF FACADE (LEFT & RIGHT RAW ROCK MASSES)
  // =========================================================================
  addBox(212.5, 212.9, 0.0, 2.5, -69.4, -56.4, obsidianSteelMat);
  addBox(212.35, 212.52, 0.25, 2.0, -68.2, -59.0, warmFoyerGoldMat);
  addBox(212.5, 212.9, 0.0, 2.5, -52.4, -40.6, obsidianSteelMat);
  addBox(212.35, 212.52, 0.25, 2.0, -50.2, -42.0, warmFoyerGoldMat);

  const leftCliffPts: Array<[number, number]> = [
    [-14.8, 1.8],
    [-12.2, 1.3],
    [-9.5, 1.7],
    [-6.6, 1.4],
    [-4.2, 2.4],
    [-2.8, 4.2],
    [-3.4, 5.8],
    [-4.9, 6.7],
    [-7.1, 7.3],
    [-7.6, 8.8],
    [-8.6, 10.6],
    [-10.2, 11.7],
    [-11.8, 11.0],
    [-13.4, 11.4],
    [-14.8, 10.5],
  ];
  const leftCliffGeo = createNormalizedCliffGeo(leftCliffPts, 1.35);
  const leftCliffMesh = new THREE.Mesh(leftCliffGeo, leftRockMat);
  leftCliffMesh.rotation.y = -Math.PI / 2;
  leftCliffMesh.position.set(212.4, 0, -55.0);
  staticGroup.add(leftCliffMesh);

  const leftCrag1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 0), leftRockMat);
  leftCrag1.scale.set(0.65, 2.2, 1.45);
  leftCrag1.position.set(211.0, 5.6, -65.2);
  leftCrag1.rotation.set(0.18, 0.25, -0.14);
  staticGroup.add(leftCrag1);

  const rightCliffPts: Array<[number, number]> = [
    [1.8, 1.6],
    [3.8, 1.3],
    [6.4, 1.9],
    [9.4, 1.4],
    [12.4, 1.8],
    [14.7, 1.5],
    [14.7, 8.8],
    [12.6, 9.7],
    [10.2, 8.6],
    [7.8, 8.4],
    [4.4, 7.7],
    [2.6, 7.6],
    [3.5, 6.4],
    [4.6, 5.7],
    [3.0, 4.9],
    [2.8, 3.6],
    [1.9, 2.4],
  ];
  const rightCliffGeo = createNormalizedCliffGeo(rightCliffPts, 1.35);
  const rightCliffMesh = new THREE.Mesh(rightCliffGeo, rightRockMat);
  rightCliffMesh.rotation.y = -Math.PI / 2;
  rightCliffMesh.position.set(212.4, 0, -55.0);
  staticGroup.add(rightCliffMesh);

  const rightCrag1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55, 0), rightRockMat);
  rightCrag1.scale.set(0.62, 1.95, 1.5);
  rightCrag1.position.set(211.0, 4.9, -45.6);
  rightCrag1.rotation.set(-0.15, -0.22, 0.12);
  staticGroup.add(rightCrag1);

  // =========================================================================
  // 3. CENTRAL GOLD LOUVER CANYON + PERMANENTLY CLOSED BRASS/SMOKED-GLASS CLUB DOORS!
  // =========================================================================
  // Heavy Brushed-Gold Portal Surround
  addBox(211.75, 212.65, 0.0, 3.35, -56.65, -56.35, brushedGoldMat);
  addBox(211.75, 212.65, 0.0, 3.35, -52.45, -52.15, brushedGoldMat);
  addBox(211.75, 212.65, 3.15, 3.45, -56.65, -52.15, brushedGoldMat);
  addBox(211.70, 211.78, 0.05, 3.3, -56.55, -56.42, goldNeonMat);
  addBox(211.70, 211.78, 0.05, 3.3, -52.38, -52.25, goldNeonMat);

  // AUTOMATIC DOUBLE SLIDING VIP DOORS (Slides open smoothly when player or VIP guests approach!)
  const autoDoorPlaqueTex = createFourUVipDoorCrestTex();
  const autoDoorPlaqueMat = new THREE.MeshStandardMaterial({
    map: autoDoorPlaqueTex,
    emissive: 0xffffff,
    emissiveMap: autoDoorPlaqueTex,
    emissiveIntensity: 0.95,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(autoDoorPlaqueMat);

  // Overhead Sliding Track & Motion Sensor Header
  addBox(211.88, 212.35, 3.10, 3.24, -58.3, -50.5, brushedGoldMat);
  const sensorBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.72), obsidianSteelMat);
  sensorBox.position.set(211.72, 3.28, -54.40);
  staticGroup.add(sensorBox);
  const doorSensorLedMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
  });
  const doorSensorLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), doorSensorLedMat);
  doorSensorLed.position.set(211.62, 3.28, -54.40);
  staticGroup.add(doorSensorLed);

  const buildSlidingDoorLeaf = (zMin: number, zMax: number, handleZ: number, plaqueZ: number) => {
    const leafGroup = new THREE.Group();
    leafGroup.userData.noMerge = true;

    const addLeafBox = (
      x0: number,
      x1: number,
      y0: number,
      y1: number,
      lz0: number,
      lz1: number,
      mat: THREE.Material
    ) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(lz1 - lz0)),
        mat
      );
      m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (lz0 + lz1) * 0.5);
      leafGroup.add(m);
    };

    // Smoked glass panel + brushed brass rails + center stile + pull bar + VIP crest
    addLeafBox(212.11, 212.23, 0.02, 3.12, zMin, zMax, closedDoorGlassMat);
    addLeafBox(212.06, 212.28, 0.0, 0.14, zMin, zMax, brushedGoldMat);
    addLeafBox(212.06, 212.28, 3.00, 3.14, zMin, zMax, brushedGoldMat);
    addLeafBox(212.06, 212.28, 0.0, 3.14, zMin, zMin + 0.09, brushedGoldMat);
    addLeafBox(212.06, 212.28, 0.0, 3.14, zMax - 0.09, zMax, brushedGoldMat);
    addLeafBox(211.98, 212.06, 0.92, 1.98, handleZ - 0.032, handleZ + 0.032, goldNeonMat);

    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.08), autoDoorPlaqueMat);
    plaque.rotation.y = -Math.PI / 2;
    plaque.position.set(212.04, 1.72, plaqueZ);
    leafGroup.add(plaque);

    staticGroup.add(leafGroup);
    return leafGroup;
  };

  const doorLeafLeft = buildSlidingDoorLeaf(-56.35, -54.40, -54.64, -55.40);
  const doorLeafRight = buildSlidingDoorLeaf(-54.40, -52.45, -54.16, -53.40);

  // Rolling Security Shutter outside glass entrance (Closed 07:00 - 16:00)
  const fourUShutterTex = createRollingShutterTexture({
    title: '4U SUPERCLUB',
    hoursLabel: 'MỞ CỬA: 16:00 – 07:00 SÁNG',
    accentHex: '#a855f7',
  });
  const fourUShutterMat = new THREE.MeshStandardMaterial({
    map: fourUShutterTex,
    roughness: 0.45,
    metalness: 0.55,
  });
  const fourUShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'four_u_shutter',
      axis: 'z',
      pos: 211.96,
      spanCenter: -54.40,
      width: 4.1,
      baseY: 0.0,
      topY: 3.12,
    },
    fourUShutterMat,
    obsidianSteelMat
  );

  // Outside Gold Velvet Stanchion Posts & Crimson Velvet Ropes Flanking the Closed Door
  [
    [211.2, -57.6],
    [209.8, -57.6],
    [211.2, -51.2],
    [209.8, -51.2],
  ].forEach(([sx, sz]) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 10), brushedGoldMat);
    base.position.set(sx, 0.03, sz);
    staticGroup.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.92, 8), brushedGoldMat);
    post.position.set(sx, 0.49, sz);
    staticGroup.add(post);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), goldNeonMat);
    finial.position.set(sx, 0.98, sz);
    staticGroup.add(finial);
  });
  [-57.6, -51.2].forEach((rz) => {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), velvetRopeMat);
    rope.rotation.z = Math.PI / 2;
    rope.position.set(210.5, 0.84, rz);
    staticGroup.add(rope);
  });

  // Undulating Stack of 22 Curved Brushed Gold-Copper Louver Ribs rising between cliffs
  const louverCount = 22;
  for (let i = 0; i < louverCount; i++) {
    const t = i / (louverCount - 1);
    const ly = 3.55 + t * 4.95;
    const widthZ = 4.2 + Math.sin(t * Math.PI * 0.9) * 2.1 + t * 0.85;
    const centerZ = -54.5 - Math.sin(t * Math.PI * 1.1) * 0.55;
    const jutX = 211.35 - Math.sin(t * Math.PI * 1.25) * 0.65;

    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.135, widthZ),
      i % 2 === 0 ? brushedGoldMat : goldNeonMat
    );
    slat.position.set(jutX, ly, centerZ);
    staticGroup.add(slat);
  }

  // Electric Purple & Cyan Jagged Neon Canyon Crack Tubes
  const canyonX = 210.82;
  const leftCanyonPts: Array<[number, number, number]> = [
    [canyonX, 1.8, -69.5],
    [canyonX, 1.3, -67.0],
    [canyonX, 1.7, -64.4],
    [canyonX, 1.4, -61.5],
    [canyonX, 2.4, -59.1],
    [canyonX, 4.2, -57.7],
    [canyonX, 5.8, -58.3],
    [canyonX, 7.0, -60.2],
    [canyonX, 7.6, -62.2],
    [canyonX, 11.4, -64.8],
  ];
  for (let i = 0; i < leftCanyonPts.length - 1; i++) {
    addNeonSegment(leftCanyonPts[i], leftCanyonPts[i + 1], purpleNeonMat, 0.068);
  }

  const rightCanyonPts: Array<[number, number, number]> = [
    [canyonX, 3.2, -52.2],
    [canyonX, 4.9, -51.9],
    [canyonX, 5.8, -50.4],
    [canyonX, 6.5, -51.4],
    [canyonX, 7.6, -52.4],
    [canyonX, 7.8, -50.6],
  ];
  for (let i = 0; i < rightCanyonPts.length - 1; i++) {
    addNeonSegment(rightCanyonPts[i], rightCanyonPts[i + 1], cyanNeonMat, 0.068);
  }
  const rightUnderPts: Array<[number, number, number]> = [
    [canyonX, 1.6, -53.1],
    [canyonX, 1.3, -51.2],
    [canyonX, 1.9, -48.6],
    [canyonX, 1.4, -45.6],
    [canyonX, 1.8, -42.6],
    [canyonX, 1.5, -40.4],
  ];
  for (let i = 0; i < rightUnderPts.length - 1; i++) {
    addNeonSegment(rightUnderPts[i], rightUnderPts[i + 1], purpleNeonMat, 0.065);
  }

  // =========================================================================
  // 4. UPPER STORY CURTAIN GLASS, VIOLET CORNICE & DUAL "4U CLUB" LOGO SIGNS
  // =========================================================================
  addBox(212.68, 212.92, 7.9, 11.45, -69.5, -40.5, darkCurtainGlassMat);
  for (let mz = -68.5; mz <= -41.5; mz += 2.7) {
    addBox(212.60, 212.95, 7.9, 11.45, mz - 0.05, mz + 0.05, obsidianSteelMat);
  }

  // Sleek Grey Concrete Upper Cornice Beam spanning full depth + Electric Purple Neon Line
  addBox(211.6, 251.8, 11.45, 12.25, -69.8, -40.2, concreteArchitectureMat);
  addBox(211.48, 211.62, 11.68, 11.82, -69.7, -40.3, purpleNeonMat);

  const logoPlainTex = createFourULogoTex(false);
  const logoPlainMat = new THREE.MeshStandardMaterial({
    map: logoPlainTex,
    emissive: 0xffffff,
    emissiveMap: logoPlainTex,
    emissiveIntensity: 1.15,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(logoPlainMat);
  const canyonSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), logoPlainMat);
  canyonSign.rotation.y = -Math.PI / 2;
  canyonSign.position.set(211.65, 10.15, -55.0);
  staticGroup.add(canyonSign);

  addBox(211.6, 218.8, 12.25, 17.6, -48.8, -40.4, concreteArchitectureMat);
  const logoBadgeTex = createFourULogoTex(true);
  const logoBadgeMat = new THREE.MeshStandardMaterial({
    map: logoBadgeTex,
    emissive: 0xffffff,
    emissiveMap: logoBadgeTex,
    emissiveIntensity: 1.08,
    alphaTest: 0.2,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(logoBadgeMat);

  const roofHeroSign = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 4.3), logoBadgeMat);
  roofHeroSign.rotation.y = -Math.PI / 2;
  roofHeroSign.position.set(211.54, 15.05, -44.6);
  staticGroup.add(roofHeroSign);

  const roofSouthSign = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0), logoBadgeMat);
  roofSouthSign.position.set(215.2, 15.05, -40.34);
  staticGroup.add(roofSouthSign);

  // =========================================================================
  // 5. VAST EXPANSIVE SUPERCLUB INTERIOR (X = 212.5..252.0, Z = -70..-40.2)
  // =========================================================================
  // Perimeter Rear, North, South Walls & Ceiling Truss Slab
  addBox(251.3, 252.0, 0.0, 12.2, -70.0, -40.2, obsidianSteelMat);
  addBox(212.5, 251.8, 0.0, 12.2, -70.1, -69.5, obsidianSteelMat);
  addBox(212.5, 251.8, 0.0, 12.2, -40.6, -40.0, obsidianSteelMat);
  addBox(212.6, 252.0, 11.35, 11.65, -70.0, -40.2, obsidianSteelMat);

  // Inlaid Gold Brass Dancefloor Grid Lines stretching across the huge hall
  for (let gz = -66; gz <= -44; gz += 5.5) {
    addBox(214.0, 246.5, 0.012, 0.022, gz - 0.04, gz + 0.04, brushedGoldMat);
  }
  for (let gx = 220; gx <= 244; gx += 6.0) {
    addBox(gx - 0.04, gx + 0.04, 0.012, 0.022, -67.5, -42.5, brushedGoldMat);
  }

  // Grand Suspended Center Dancefloor Chandelier / Neon Truss Ring (Y = 8.6)
  [3.6, 2.4].forEach((rad, ri) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(rad, 0.075, 10, 32),
      ri === 0 ? purpleNeonMat : goldNeonMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(236.0, 8.6 - ri * 0.45, -55.0);
    staticGroup.add(ring);
  });

  // Overhead Moving-Head Spotlight Truss & 8 Sweeping Club Spotlight Beams (Đèn Rọi Sân Khấu)
  addBox(228.5, 246.5, 11.10, 11.34, -61.8, -61.3, obsidianSteelMat);
  addBox(228.5, 246.5, 11.10, 11.34, -48.7, -48.2, obsidianSteelMat);
  addBox(235.8, 236.2, 11.10, 11.34, -61.8, -48.2, obsidianSteelMat);
  addBox(243.8, 244.2, 11.10, 11.34, -61.8, -48.2, obsidianSteelMat);

  const floorDanceGlow = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 13.0), fourUPoolMat);
  floorDanceGlow.rotation.x = -Math.PI / 2;
  floorDanceGlow.position.set(237.5, 0.03, -55.0);
  staticGroup.add(floorDanceGlow);

  const laserBeams: Array<{ pivot: THREE.Group; mat: THREE.MeshBasicMaterial; phase: number; axis: 'x' | 'z' }> = [];
  const beamColors = [0xe879f9, 0x22d3ee, 0xf59e0b, 0xef4444, 0xa855f7, 0xfbbf24, 0x22d3ee, 0xf43f5e];
  [
    [229.5, -61.5, 0.0, 'x'],
    [234.5, -61.5, 0.9, 'z'],
    [239.5, -61.5, 1.8, 'x'],
    [244.5, -61.5, 2.7, 'z'],
    [229.5, -48.5, 3.6, 'z'],
    [234.5, -48.5, 4.5, 'x'],
    [239.5, -48.5, 5.4, 'z'],
    [244.5, -48.5, 6.2, 'x'],
  ].forEach(([lx, lz, ph, ax], idx) => {
    // Moving-head fixture housing on truss
    const headHousing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), obsidianSteelMat);
    headHousing.position.set(lx as number, 11.02, lz as number);
    staticGroup.add(headHousing);

    const pivot = new THREE.Group();
    pivot.position.set(lx as number, 10.90, lz as number);
    pivot.userData.noMerge = true;

    const beamCol = beamColors[idx % beamColors.length];
    const lensMat = new THREE.MeshBasicMaterial({ color: beamCol });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10), lensMat);
    lens.position.y = -0.04;
    lens.userData.noMerge = true;
    pivot.add(lens);

    const bMat = new THREE.MeshBasicMaterial({
      color: beamCol,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const coneGeo = new THREE.ConeGeometry(1.75, 10.7, 14, 1, true);
    coneGeo.translate(0, -5.35, 0);
    const cone = new THREE.Mesh(coneGeo, bMat);
    cone.userData.noMerge = true;
    pivot.add(cone);

    staticGroup.add(pivot);
    laserBeams.push({ pivot, mat: bMat, phase: ph as number, axis: ax as 'x' | 'z' });
  });

  // East Monumental Main DJ Stage ("4U CLUB • SUPERCLUB")
  const stageTex = createFourUStageScreenTex();
  const stageMat = new THREE.MeshStandardMaterial({
    map: stageTex,
    emissive: 0xffffff,
    emissiveMap: stageTex,
    emissiveIntensity: 1.04,
  });
  signDynamicMats.push(stageMat);
  const stageScreen = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 4.8), stageMat);
  stageScreen.rotation.y = -Math.PI / 2;
  stageScreen.position.set(251.22, 2.85, -55.0);
  staticGroup.add(stageScreen);

  // 14 Animated Equalizer Bars along the DJ Backwall
  const eqBars: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const eqMat = i % 3 === 0 ? purpleNeonMat : i % 3 === 1 ? cyanNeonMat : goldNeonMat;
    const barGeo = new THREE.BoxGeometry(0.10, 1.0, 0.36);
    barGeo.translate(0, 0.5, 0);
    const bar = new THREE.Mesh(barGeo, eqMat);
    bar.position.set(251.05, 0.95, -60.2 + i * 0.8);
    bar.userData.noMerge = true;
    staticGroup.add(bar);
    eqBars.push(bar);
  }

  addBox(247.0, 251.25, 0.0, 0.48, -62.2, -47.8, obsidianSteelMat);
  addBox(246.94, 247.02, 0.42, 0.48, -62.2, -47.8, purpleNeonMat);
  // DJ Console + Dual Spinning CDJ Turntable Platters + Towering Line-Array Speaker Stacks
  addBox(247.8, 249.0, 0.48, 1.56, -57.2, -52.8, obsidianSteelMat);
  addBox(247.74, 247.82, 0.65, 1.44, -56.9, -53.1, goldNeonMat);
  const platters: THREE.Mesh[] = [];
  [-55.85, -54.15].forEach((pz) => {
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16), brushedGoldMat);
    deck.position.set(248.35, 1.58, pz);
    deck.userData.noMerge = true;
    staticGroup.add(deck);
    platters.push(deck);
  });
  [-61.4, -48.6].forEach((sz) => {
    addBox(248.2, 249.8, 0.48, 3.15, sz - 0.65, sz + 0.65, obsidianSteelMat);
    addBox(248.16, 248.22, 0.65, 2.95, sz - 0.48, sz + 0.48, cyanNeonMat);
  });

  // Long Illuminated Onyx VIP Super-Bar (North-East X = 230.0..248.5, Z = -69.0..-63.8)
  addBox(230.0, 248.5, 0.0, 1.18, -69.0, -63.8, obsidianSteelMat);
  addBox(229.92, 248.55, 0.94, 1.04, -63.88, -63.76, goldNeonMat);
  addBox(231.0, 247.5, 1.25, 3.8, -69.3, -68.6, obsidianSteelMat);
  for (let sy = 1.65; sy <= 3.3; sy += 0.68) {
    addBox(231.2, 247.2, sy, sy + 0.06, -68.62, -68.32, warmFoyerGoldMat);
  }

  // Floor 2 Expansive Mezzanine Sky-Gallery Deck (Y = 4.60, X = 213.4..251.4, Z = -69.5..-40.5)
  const f2Y = FOUR_U_FLOOR2_Y;
  // Wide West Lounge Gallery + Long North & South Balconies overlooking central atrium
  addBox(213.4, 225.0, f2Y - 0.16, f2Y, -69.5, -40.5, obsidianSteelMat);
  addBox(225.0, 251.4, f2Y - 0.16, f2Y, -69.5, -62.5, obsidianSteelMat);
  addBox(225.0, 251.4, f2Y - 0.16, f2Y, -47.5, -44.2, obsidianSteelMat);
  addBox(229.6, 251.4, f2Y - 0.16, f2Y, -44.2, -40.5, obsidianSteelMat);

  // Floor 2 Balcony Glass Railings + Purple LED Top Cap
  addBox(224.85, 225.1, f2Y, f2Y + 1.05, -62.5, -44.2, balconyGlassMat);
  addBox(224.82, 225.12, f2Y + 1.05, f2Y + 1.12, -62.5, -44.2, purpleNeonMat);
  addBox(225.0, 251.0, f2Y, f2Y + 1.05, -62.62, -62.42, balconyGlassMat);
  addBox(225.0, 251.0, f2Y, f2Y + 1.05, -47.58, -47.38, balconyGlassMat);

  // Industrial-Gold VIP Staircase (X = 223.5..229.5, Z = -44.2..-40.8) climbing West -> East to Floor 2!
  const stairSteps = 14;
  for (let i = 0; i < stairSteps; i++) {
    const t0 = i / stairSteps;
    const t1 = (i + 1) / stairSteps;
    const sx0 = 223.5 + t0 * 6.0;
    const sx1 = 223.5 + t1 * 6.0;
    const sy = t1 * f2Y;
    addBox(sx0, sx1, sy - 0.14, sy, -44.0, -41.0, obsidianSteelMat);
    addBox(sx0, sx0 + 0.04, sy - 0.02, sy + 0.01, -43.9, -41.1, goldNeonMat);
  }
  addBox(223.5, 229.6, 0.0, f2Y, -44.25, -44.08, obsidianSteelMat);

  // VIP Club Tables with Illuminated Gold Ice Buckets, Champagne Bottles & Velvet U-Sofas
  const addVipTable = (tx: number, tz: number, baseY = 0) => {
    const g = new THREE.Group();
    g.position.set(tx, baseY, tz);

    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.34, 0.68, 10), brushedGoldMat);
    ped.position.y = 0.34;
    g.add(ped);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.06, 14), marbleDancefloorMat);
    top.position.y = 0.70;
    g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.024, 6, 20), goldNeonMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.70;
    g.add(rim);

    // Glowing Champagne Ice Bucket + Golden Bottles
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.25, 10), warmFoyerGoldMat);
    bucket.position.set(-0.15, 0.86, 0);
    g.add(bucket);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.28, 8), brushedGoldMat);
    bottle.position.set(0.20, 0.87, 0.12);
    g.add(bottle);

    [-0.96, 0.96].forEach((sz) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.44, 0.44), velvetSofaMat);
      seat.position.set(0, 0.22, sz);
      g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.38, 0.12), velvetSofaMat);
      back.position.set(0, 0.56, sz + (sz > 0 ? 0.16 : -0.16));
      g.add(back);
    });

    staticGroup.add(g);
  };

  // Floor 1: 12 VIP Tables
  [
    [217.5, -65.0],
    [217.5, -59.5],
    [217.5, -50.0],
    [217.5, -45.0],
    [223.8, -65.0],
    [223.8, -59.5],
    [223.8, -50.0],
    [230.0, -47.0],
    [235.5, -60.0],
    [235.5, -47.0],
    [241.5, -60.0],
    [241.5, -47.0],
  ].forEach(([tx, tz]) => addVipTable(tx, tz, 0));

  // Floor 2: 6 VIP Tables
  [
    [217.5, -64.5],
    [217.5, -55.0],
    [217.5, -46.5],
    [233.0, -66.0],
    [242.5, -66.0],
    [238.0, -45.0],
  ].forEach(([tx, tz]) => addVipTable(tx, tz, f2Y));

  // =========================================================================
  // 6. PARKED CHROME-GOLD SUPERCAR BY CURB
  // =========================================================================
  const carGrp = new THREE.Group();
  carGrp.position.set(208.0, 0.0, -46.0);
  const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 4.6), sportsCarChromeMat);
  carBody.position.y = 0.48;
  carGrp.add(carBody);
  const carCabin = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.46, 2.25), darkCurtainGlassMat);
  carCabin.position.set(0, 0.92, -0.15);
  carGrp.add(carCabin);
  [-0.86, 0.86].forEach((wx) => {
    [-1.45, 1.45].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), obsidianSteelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.32, wz);
      carGrp.add(wheel);
    });
  });
  const headLightL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.08), cyanNeonMat);
  headLightL.position.set(-0.58, 0.54, -2.31);
  carGrp.add(headLightL);
  const headLightR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.08), cyanNeonMat);
  headLightR.position.set(0.58, 0.54, -2.31);
  carGrp.add(headLightR);
  staticGroup.add(carGrp);

  // =========================================================================
  // 7. CALIBRATED POINT LIGHTING (EXTERIOR CANYON + EXPANSIVE INTERIOR)
  // =========================================================================
  const registerLight = (
    color: number,
    x: number,
    y: number,
    z: number,
    dist: number,
    dayInt: number,
    nightInt: number
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 1.35);
    l.position.set(x, y, z);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => 1.0,
    });
  };

  registerLight(0xd946ef, 209.6, 5.4, -55.0, 32, 5, 22); // Canyon Purple Glow
  registerLight(0xf59e0b, 210.5, 2.4, -54.5, 24, 4, 18); // Closed Golden Portal Entry Glow
  registerLight(0xfbbf24, 210.2, 2.2, -64.0, 20, 3, 14); // Under-Cliff Foyer Left
  registerLight(0xfbbf24, 210.2, 2.2, -45.5, 20, 3, 14); // Under-Cliff Foyer Right
  registerLight(0xa855f7, 224.0, 3.8, -55.0, 34, 5, 24); // Floor 1 West VIP Tables
  registerLight(0xf59e0b, 241.0, 3.8, -55.0, 36, 5, 24); // Floor 1 Main Dancefloor & DJ Stage
  registerLight(0xe879f9, 232.0, 7.8, -55.0, 34, 4, 20); // Floor 2 Sky-Gallery Lounge

  let closedFactor = 0.0;
  let animClock = 0;
  let doorOpenProgress = 0.0;

  for (let i = 0; i < scaledLights.length; i++) {
    const minKeep = i < 4 ? 0.14 : 0.04;
    scaledLights[i].getScale = () => Math.max(minKeep, 1.0 - closedFactor);
  }

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: FourUClubNpcController | null,
    playerPos?: THREE.Vector3
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isFourUClubOpenAtHour(rawHour);
    const targetClosed = isOpen ? 0.0 : 1.0;
    closedFactor = dt > 0 ? THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 3.5)) : targetClosed;
    setShutterProgress(fourUShutter, closedFactor);

    const openScale = 1.0 - closedFactor;
    animClock += dt * openScale;
    const beatPulse = Math.pow(Math.max(0, Math.sin(animClock * Math.PI * 2 * 2.2)), 4) * openScale;

    for (let i = 0; i < platters.length; i++) {
      platters[i].rotation.y += dt * (i === 0 ? 3.2 : -2.8) * openScale;
    }

    for (let i = 0; i < eqBars.length; i++) {
      const wave =
        0.28 +
        0.72 *
          Math.abs(
            Math.sin(animClock * 7.5 + i * 0.68) * 0.65 + Math.cos(animClock * 11.3 - i * 0.45) * 0.35
          );
      eqBars[i].scale.y = 0.15 + wave * 2.15 * (0.65 + 0.35 * beatPulse) * openScale;
    }

    for (let i = 0; i < laserBeams.length; i++) {
      const b = laserBeams[i];
      const swingA = Math.sin(animClock * 1.9 + b.phase) * 0.44;
      const swingB = Math.cos(animClock * 1.3 + b.phase * 1.3) * 0.30;
      if (b.axis === 'x') {
        b.pivot.rotation.x = swingA;
        b.pivot.rotation.z = swingB;
      } else {
        b.pivot.rotation.z = swingA;
        b.pivot.rotation.x = swingB;
      }
      b.mat.opacity = (0.08 + 0.11 * lampFactor + 0.055 * beatPulse) * openScale;
    }

    purpleNeonMat.emissiveIntensity = (0.95 + lampFactor * 0.95 + beatPulse * 0.30) * Math.max(0.15, openScale);
    cyanNeonMat.emissiveIntensity = (0.88 + lampFactor * 0.92 + (1 - beatPulse) * 0.26) * openScale;
    goldNeonMat.emissiveIntensity = (0.82 + lampFactor * 0.78 + beatPulse * 0.18) * openScale;
    whiteNeonMat.emissiveIntensity = (0.9 + lampFactor * 0.85) * openScale;
    warmFoyerGoldMat.emissiveIntensity = (0.68 + lampFactor * 0.65) * openScale;
    fourUPoolMat.opacity = (0.56 * lampFactor + beatPulse * 0.14 * lampFactor) * openScale;

    const signGlow = (0.88 + lampFactor * 0.34) * Math.max(0.24, openScale);
    for (let i = 0; i < signDynamicMats.length; i++) {
      signDynamicMats[i].emissiveIntensity = signGlow;
    }

    npcController?.update(delta, rawHour);

    // Automatic Sliding Door Proximity Sensor (Player or VIP NPC approaching X=212.2, Z=-54.4)
    const playerNearDoor =
      !!playerPos &&
      playerPos.y < 2.5 &&
      Math.abs(playerPos.x - 212.2) < 4.2 &&
      Math.abs(playerPos.z - -54.4) < 3.4;
    const npcNearDoor = npcController?.isAnyNpcNearDoor() ?? false;
    const targetDoorOpen = isOpen && (playerNearDoor || npcNearDoor) ? 1.0 : 0.0;

    doorOpenProgress = dt > 0 ? THREE.MathUtils.damp(doorOpenProgress, targetDoorOpen, 7.5, dt) : targetDoorOpen;
    const slideDist = doorOpenProgress * 1.88;
    doorLeafLeft.position.z = -slideDist;
    doorLeafRight.position.z = slideDist;

    if (!isOpen) {
      doorSensorLedMat.color.setHex(0xef4444);
      doorSensorLedMat.emissive.setHex(0xdc2626);
      doorSensorLedMat.emissiveIntensity = 1.6;
    } else if (targetDoorOpen > 0.5) {
      doorSensorLedMat.color.setHex(0x34d399);
      doorSensorLedMat.emissive.setHex(0x10b981);
      doorSensorLedMat.emissiveIntensity = 2.0;
    } else {
      doorSensorLedMat.color.setHex(0xfbbf24);
      doorSensorLedMat.emissive.setHex(0xf59e0b);
      doorSensorLedMat.emissiveIntensity = 1.2;
    }
  };

  updateOperatingHours(20.0, 0, 1.0, null);

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    updateOperatingHours,
    getClosedFactor: () => closedFactor,
  };
}

// =========================================================================
// LIVE NPCS (49 NPCS): 6 OUTSIDE SECURITY GUARDS (BẢO VỆ), 8 EXTERIOR VIP GUESTS,
// DJ, 2 BARTENDERS, 12 SEATED VIP GUESTS, 14 ENERGETIC DANCERS & 6 ROAMING STAFF/GUESTS
// =========================================================================

interface FourUNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  role: 'guard' | 'dj' | 'staff' | 'vip_seated' | 'walk' | 'dance' | 'chatter';
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  danceOffset: number;
  idleYaw?: number;
  seated?: boolean;
  exitPath: THREE.Vector3[];
  exitWp: { idx: number };
  glbHandle: GlbHumanHandle;
}

function buildFourUCharacterMesh(
  helpers: HospitalCharacterHelpers,
  shirt: number,
  pants: number,
  skin: string,
  hairColor: number,
  seated = false,
  isSecurityGuard = false
) {
  const grp = new THREE.Group();
  const hips = new THREE.Group();
  grp.add(hips);

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.58 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.45 });

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(isSecurityGuard ? 0.48 : 0.44, 0.56, isSecurityGuard ? 0.27 : 0.25),
    shirtMat
  );
  torso.position.y = 1.04;
  hips.add(torso);

  if (isSecurityGuard) {
    // Crisp white dress-shirt V-placket + crimson/gold tie badge on black security suit!
    const tieWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.02), tieWhiteMat);
    tie.position.set(0, 1.18, 0.14);
    hips.add(tie);
  }

  const faceTex = helpers.createFaceTexture(isSecurityGuard ? 'neutral' : 'happy', skin);
  const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
  head.position.y = 1.48;
  hips.add(head);

  if (isSecurityGuard) {
    // Sleek dark security sunglasses
    const shadesMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.15, metalness: 0.6 });
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.07, 0.04), shadesMat);
    shades.position.set(0, 1.50, 0.145);
    hips.add(shades);
  }

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
  hair.position.y = 1.61;
  hips.add(hair);

  const makeArm = (ax: number) => {
    const p = new THREE.Group();
    p.position.set(ax, 1.26, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), shirtMat);
    m.position.y = -0.18;
    p.add(m);
    hips.add(p);
    return p;
  };
  const leftArm = makeArm(isSecurityGuard ? -0.32 : -0.30);
  const rightArm = makeArm(isSecurityGuard ? 0.32 : 0.30);

  const makeLeg = (lx: number) => {
    const p = new THREE.Group();
    p.position.set(lx, 0.76, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.16), pantsMat);
    leg.position.y = -0.32;
    p.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), shoeMat);
    shoe.position.set(0, -0.68, 0.03);
    p.add(shoe);
    hips.add(p);
    return p;
  };
  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);

  if (seated) {
    hips.position.y = -0.26;
    leftLeg.rotation.x = -Math.PI / 2;
    rightLeg.rotation.x = -Math.PI / 2;
    leftArm.rotation.x = -0.35;
    rightArm.rotation.x = -0.35;
  }

  return { group: grp, hips, leftArm, rightArm, leftLeg, rightLeg };
}

export class FourUClubNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: FourUNpcActor[] = [];
  private wasOpen = true;
  private fullyCleared = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const f2Y = FOUR_U_FLOOR2_Y;
    const specs: Array<{
      role: 'guard' | 'dj' | 'staff' | 'vip_seated' | 'walk' | 'dance' | 'chatter';
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      seated?: boolean;
      speed?: number;
    }> = [
      // 1. SIX EXTERIOR SECURITY GUARDS (BẢO VỆ ĐỨNG NGOÀI)
      { role: 'guard', shirt: 0x09090b, pants: 0x09090b, skin: '#e8b48e', hair: 0x111827, waypoints: [new THREE.Vector3(211.0, 0.02, -56.9)], idleYaw: -Math.PI / 2 },
      { role: 'guard', shirt: 0x09090b, pants: 0x09090b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(211.0, 0.02, -51.9)], idleYaw: -Math.PI / 2 },
      { role: 'guard', shirt: 0x09090b, pants: 0x09090b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(209.4, 0.02, -58.2)], idleYaw: -Math.PI / 2 },
      { role: 'guard', shirt: 0x09090b, pants: 0x09090b, skin: '#e8b48e', hair: 0x18181b, waypoints: [new THREE.Vector3(209.4, 0.02, -50.6)], idleYaw: -Math.PI / 2 },
      { role: 'guard', shirt: 0x09090b, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(210.4, 0.02, -64.5)], idleYaw: -Math.PI / 2 },
      { role: 'guard', shirt: 0x09090b, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(209.6, 0.02, -45.6)], idleYaw: -Math.PI / 2 },

      // 2. EIGHT EXTERIOR & DOOR-CROSSING VIP GUESTS (2 walk smoothly through the automatic door!)
      { role: 'chatter', shirt: 0xf8fafc, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(208.6, 0.02, -61.2)], idleYaw: 0.4 },
      { role: 'chatter', shirt: 0xe879f9, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(209.1, 0.02, -60.2)], idleYaw: -2.4 },
      { role: 'chatter', shirt: 0x18181b, pants: 0x1e293b, skin: '#f5c7a3', hair: 0x18181b, waypoints: [new THREE.Vector3(208.7, 0.02, -53.8)], idleYaw: -0.5 },
      { role: 'chatter', shirt: 0xfbbf24, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(208.8, 0.02, -48.6)], idleYaw: -2.6 },
      { role: 'chatter', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(208.5, 0.02, -66.0)], idleYaw: -1.3 },
      { role: 'chatter', shirt: 0xf43f5e, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(209.8, 0.02, -62.5)], idleYaw: -1.8 },
      {
        role: 'walk',
        shirt: 0x4ade80,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(205.0, 0.02, -64.0),
          new THREE.Vector3(209.2, 0.02, -54.4),
          new THREE.Vector3(215.5, 0.02, -54.4),
          new THREE.Vector3(220.8, 0.02, -55.0),
          new THREE.Vector3(215.5, 0.02, -54.4),
          new THREE.Vector3(209.2, 0.02, -54.4),
          new THREE.Vector3(205.5, 0.02, -45.0),
        ],
        speed: 1.42,
      },
      {
        role: 'walk',
        shirt: 0xfacc15,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(205.2, 0.02, -43.0),
          new THREE.Vector3(207.8, 0.02, -51.5),
          new THREE.Vector3(207.2, 0.02, -58.5),
          new THREE.Vector3(204.5, 0.02, -63.0),
        ],
        speed: 1.32,
      },

      // 3. LIVE STAGE DJ & TWO VIP BARTENDERS INSIDE
      { role: 'dj', shirt: 0x09090b, pants: 0x18181b, skin: '#fbd3b4', hair: 0xe879f9, waypoints: [new THREE.Vector3(249.4, 0.48, -55.0)], idleYaw: -Math.PI / 2 },
      { role: 'staff', shirt: 0xf8fafc, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(235.5, 0.02, -66.2)], idleYaw: 0 },
      { role: 'staff', shirt: 0xf8fafc, pants: 0x09090b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(243.5, 0.02, -66.2)], idleYaw: 0 },

      // 4. FOURTEEN HIGH-ENERGY DANCEFLOOR & SKY-BALCONY CLUBBERS (NHẢY SÔI ĐỘNG NHƯ TOXIC)
      { role: 'dance', shirt: 0xd946ef, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(244.5, 0.02, -53.6)], idleYaw: Math.PI / 2 },
      { role: 'dance', shirt: 0xf8fafc, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(244.8, 0.02, -56.8)], idleYaw: Math.PI / 2 },
      { role: 'dance', shirt: 0x38bdf8, pants: 0x09090b, skin: '#f5c7a3', hair: 0x27150a, waypoints: [new THREE.Vector3(242.2, 0.02, -55.0)], idleYaw: Math.PI / 2 },
      { role: 'dance', shirt: 0xf43f5e, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(240.0, 0.02, -52.4)], idleYaw: Math.PI / 2 },
      { role: 'dance', shirt: 0xfacc15, pants: 0x18181b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(239.2, 0.02, -56.6)], idleYaw: 1.9 },
      { role: 'dance', shirt: 0x4ade80, pants: 0x09090b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(236.8, 0.02, -54.2)], idleYaw: Math.PI / 2 },
      { role: 'dance', shirt: 0xa855f7, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(237.4, 0.02, -51.6)], idleYaw: 1.2 },
      { role: 'dance', shirt: 0xfb7185, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(234.6, 0.02, -56.2)], idleYaw: 1.4 },
      { role: 'dance', shirt: 0x22d3ee, pants: 0x1e293b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(233.2, 0.02, -53.2)], idleYaw: 1.8 },
      { role: 'dance', shirt: 0xfbbf24, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(231.0, 0.02, -55.4)], idleYaw: Math.PI / 2 },
      { role: 'dance', shirt: 0xe879f9, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(229.6, 0.02, -52.2)], idleYaw: 1.3 },
      { role: 'dance', shirt: 0xec4899, pants: 0x18181b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(229.0, 0.02, -57.2)], idleYaw: 1.7 },
      { role: 'dance', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(223.8, f2Y + 0.02, -57.5)], idleYaw: Math.PI / 2 },
      { role: 'dance', shirt: 0xfacc15, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(223.8, f2Y + 0.02, -52.2)], idleYaw: Math.PI / 2 },

      // 5. TWELVE SEATED VIP BOTTLE-SERVICE GUESTS ACROSS FLOOR 1 & FLOOR 2 TABLES
      { role: 'vip_seated', shirt: 0xf43f5e, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(217.5, 0.02, -65.96)], idleYaw: 0, seated: true },
      { role: 'vip_seated', shirt: 0xf8fafc, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(217.5, 0.02, -58.54)], idleYaw: Math.PI, seated: true },
      { role: 'vip_seated', shirt: 0x0f172a, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(223.8, 0.02, -50.96)], idleYaw: 0, seated: true },
      { role: 'vip_seated', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(223.8, 0.02, -64.04)], idleYaw: Math.PI, seated: true },
      { role: 'vip_seated', shirt: 0xe879f9, pants: 0x09090b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(230.0, 0.02, -47.96)], idleYaw: 0, seated: true },
      { role: 'vip_seated', shirt: 0x22c55e, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(235.5, 0.02, -60.96)], idleYaw: 0, seated: true },
      { role: 'vip_seated', shirt: 0xfbbf24, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(241.5, 0.02, -59.04)], idleYaw: Math.PI, seated: true },
      { role: 'vip_seated', shirt: 0xfb7185, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(241.5, 0.02, -47.96)], idleYaw: 0, seated: true },
      { role: 'vip_seated', shirt: 0xa855f7, pants: 0x09090b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(217.5, f2Y + 0.02, -55.96)], idleYaw: 0, seated: true },
      { role: 'vip_seated', shirt: 0xfacc15, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(217.5, f2Y + 0.02, -47.46)], idleYaw: 0, seated: true },
      { role: 'vip_seated', shirt: 0x06b6d4, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(233.0, f2Y + 0.02, -66.96)], idleYaw: 0, seated: true },
      { role: 'vip_seated', shirt: 0xf43f5e, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(242.5, f2Y + 0.02, -65.04)], idleYaw: Math.PI, seated: true },

      // 6. SIX INTERIOR WAITSTAFF & VIP GUESTS ROAMING INSIDE CLUB & FLOOR 2 STAIRS
      {
        role: 'staff',
        shirt: 0x09090b,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(233.0, 0.02, -62.5),
          new THREE.Vector3(226.8, 0.02, -62.5),
          new THREE.Vector3(226.8, 0.02, -54.5),
          new THREE.Vector3(238.5, 0.02, -54.5),
          new THREE.Vector3(244.5, 0.02, -59.0),
          new THREE.Vector3(244.5, 0.02, -62.5),
        ],
        speed: 1.55,
      },
      {
        role: 'staff',
        shirt: 0x09090b,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(221.0, 0.02, -54.5),
          new THREE.Vector3(233.0, 0.02, -51.0),
          new THREE.Vector3(244.0, 0.02, -51.0),
          new THREE.Vector3(233.0, 0.02, -45.0),
          new THREE.Vector3(221.0, 0.02, -47.0),
        ],
        speed: 1.5,
      },
      {
        role: 'walk',
        shirt: 0xe879f9,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(221.5, 0.02, -54.5),
          new THREE.Vector3(222.5, 0.02, -42.5),
          new THREE.Vector3(223.5, 0.02, -42.5),
          new THREE.Vector3(229.5, f2Y + 0.02, -42.5),
          new THREE.Vector3(221.5, f2Y + 0.02, -42.5),
          new THREE.Vector3(221.5, f2Y + 0.02, -60.0),
          new THREE.Vector3(221.5, f2Y + 0.02, -42.5),
          new THREE.Vector3(229.5, f2Y + 0.02, -42.5),
          new THREE.Vector3(223.5, 0.02, -42.5),
          new THREE.Vector3(221.5, 0.02, -54.5),
        ],
        speed: 1.38,
      },
      {
        role: 'walk',
        shirt: 0x38bdf8,
        pants: 0x09090b,
        skin: '#f5c7a3',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(227.0, 0.02, -55.0),
          new THREE.Vector3(234.0, 0.02, -62.0),
          new THREE.Vector3(245.5, 0.02, -62.0),
          new THREE.Vector3(245.5, 0.02, -50.5),
          new THREE.Vector3(234.0, 0.02, -50.5),
        ],
        speed: 1.44,
      },
      {
        role: 'walk',
        shirt: 0xf8fafc,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(215.0, 0.02, -54.5),
          new THREE.Vector3(221.0, 0.02, -62.5),
          new THREE.Vector3(227.5, 0.02, -62.5),
          new THREE.Vector3(227.5, 0.02, -47.0),
          new THREE.Vector3(220.5, 0.02, -47.0),
        ],
        speed: 1.4,
      },
      {
        role: 'walk',
        shirt: 0xf43f5e,
        pants: 0x18181b,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(228.0, f2Y + 0.02, -64.5),
          new THREE.Vector3(246.0, f2Y + 0.02, -64.5),
          new THREE.Vector3(246.0, f2Y + 0.02, -68.0),
          new THREE.Vector3(228.0, f2Y + 0.02, -68.0),
        ],
        speed: 1.35,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildFourUCharacterMesh(
        helpers,
        s.shirt,
        s.pants,
        s.skin,
        s.hair,
        !!s.seated,
        s.role === 'guard'
      );
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const glbHandle =
        s.role === 'guard'
          ? attachGlbHumanToNpc({
              modelSource: GUARD_NPC_MODEL.modelSource,
              hostGroup: built.group,
              fallbackMeshes: [built.hips],
              targetHeight: GUARD_NPC_MODEL.targetHeight,
              clipProfile: GUARD_NPC_MODEL.clipProfile,
              rotationY: GUARD_NPC_MODEL.rotationY,
              palette: { suit: 0x09090b, shirt: 0xf8fafc, accent: 0xf43f5e },
              initialState: 'Idle',
              phaseOffset: idx * 0.75,
            })
          : (() => {
              const spec =
                s.seated
                  ? pickSeatedCivilianModel(idx * 3 + 1)
                  : s.role === 'walk'
                  ? ADULT_NPC_MODELS[idx % ADULT_NPC_MODELS.length]
                  : pickStationaryCivilianModel(idx * 3 + 1);
              return attachGlbHumanToNpc({
                modelSource: spec.modelSource,
                hostGroup: built.group,
                fallbackMeshes: [built.hips],
                targetHeight: spec.targetHeight,
                clipProfile: spec.clipProfile,
                rotationY: spec.rotationY,
                initialState: s.seated
                  ? 'Sit'
                  : s.role === 'dance' || s.role === 'dj'
                  ? 'Wave'
                  : s.waypoints.length > 1
                  ? 'Walk'
                  : 'Idle',
                phaseOffset: idx * 0.75,
              });
            })();

      this.actors.push({
        group: built.group,
        hips: built.hips,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        role: s.role,
        waypoints: s.waypoints,
        wpIdx: s.waypoints.length > 1 ? 1 : 0,
        speed: s.speed ?? 1.4,
        walkPhase: idx * 0.85,
        danceOffset: idx * 0.92,
        idleYaw: s.idleYaw,
        seated: s.seated,
        exitPath: [new THREE.Vector3(208.5, 0.02, -54.5), new THREE.Vector3(203.0, 0.02, -54.5)],
        exitWp: { idx: 0 },
        glbHandle,
      });
    });
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyCleared;
  }

  public isAnyNpcNearDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.group.visible || a.waypoints.length <= 1) continue;
      if (
        a.group.position.y < 1.2 &&
        Math.abs(a.group.position.x - 212.2) < 3.4 &&
        Math.abs(a.group.position.z - -54.4) < 2.8
      ) {
        return true;
      }
    }
    return false;
  }

  public update(delta: number, rawHour: number) {
    const dt = Math.min(delta, 0.1);
    const isOpen = isFourUClubOpenAtHour(rawHour);

    if (isOpen && !this.wasOpen) {
      this.fullyCleared = false;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        a.exitWp.idx = 0;
        a.wpIdx = a.waypoints.length > 1 ? 1 : 0;
        a.group.position.copy(a.waypoints[0]);
        a.group.visible = true;
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.hips.position.y = a.seated ? -0.26 : 0;
        if (a.seated) {
          a.leftLeg.rotation.x = -Math.PI / 2;
          a.rightLeg.rotation.x = -Math.PI / 2;
        }
        a.glbHandle.setAnimState(
          a.seated ? 'Sit' : a.role === 'dance' || a.role === 'dj' ? 'Wave' : a.waypoints.length > 1 ? 'Walk' : 'Idle'
        );
      }
    }
    this.wasOpen = isOpen;

    if (!isOpen) {
      if (this.fullyCleared) return;
      let allHidden = true;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        if (!a.group.visible) continue;
        a.hips.position.y = 0;
        a.glbHandle.setAnimState('Walk', 1.25);
        const done = advanceNpcExitPath(a.group, a.exitPath, a.exitWp, 2.1, dt);
        if (done) {
          a.group.visible = false;
        } else {
          allHidden = false;
          a.walkPhase += dt * 5.8;
          const swing = Math.sin(a.walkPhase) * 0.4;
          a.leftArm.rotation.x = swing;
          a.rightArm.rotation.x = -swing;
          a.leftLeg.rotation.x = -swing * 1.1;
          a.rightLeg.rotation.x = swing * 1.1;
        }
      }
      this.fullyCleared = allHidden;
      return;
    }

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.group.visible) continue;

      if (a.waypoints.length <= 1) {
        a.glbHandle.setAnimState(a.seated ? 'Sit' : a.role === 'dance' || a.role === 'dj' ? 'Wave' : 'Idle');
        if (a.role === 'guard') {
          const baseYaw = a.idleYaw ?? -Math.PI / 2;
          a.walkPhase += dt * 1.4;
          a.group.rotation.y = baseYaw + Math.sin(a.walkPhase + i) * 0.18;
          a.leftArm.rotation.x = 0.08;
          a.rightArm.rotation.x = i % 2 === 0 ? -0.35 + Math.max(0, Math.sin(a.walkPhase)) * 0.25 : 0.08;
        } else if (a.role === 'dj') {
          a.walkPhase += dt * 8.4;
          a.hips.position.y = Math.abs(Math.sin(a.walkPhase)) * 0.04;
          a.group.rotation.y = (a.idleYaw ?? -Math.PI / 2) + Math.sin(a.walkPhase * 0.25) * 0.16;
          a.leftArm.rotation.x = -0.85 + Math.sin(a.walkPhase * 2.0) * 0.18;
          a.rightArm.rotation.x = -1.65 + Math.sin(a.walkPhase) * 0.55;
          a.rightArm.rotation.z = -0.25 - Math.cos(a.walkPhase * 0.5) * 0.2;
        } else if (a.role === 'dance') {
          a.walkPhase += dt * 6.9;
          const bounce = Math.abs(Math.sin(a.walkPhase + a.danceOffset));
          a.hips.position.y = bounce * 0.06;
          a.group.rotation.y = (a.idleYaw ?? Math.PI / 2) + Math.sin(a.walkPhase * 0.35 + a.danceOffset) * 0.38;
          a.leftArm.rotation.x = -0.95 + Math.sin(a.walkPhase + a.danceOffset) * 0.65;
          a.rightArm.rotation.x = -1.15 - Math.sin(a.walkPhase + a.danceOffset) * 0.65;
          a.leftLeg.rotation.x = Math.sin(a.walkPhase + a.danceOffset) * 0.22;
          a.rightLeg.rotation.x = -Math.sin(a.walkPhase + a.danceOffset) * 0.22;
        } else if (a.role === 'chatter') {
          if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
          a.walkPhase += dt * 2.4;
          a.hips.position.y = Math.sin(a.walkPhase) * 0.01;
          a.rightArm.rotation.x = -0.42 + Math.sin(a.walkPhase * 2.1 + a.danceOffset) * 0.24;
        } else if (a.seated) {
          if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
          a.walkPhase += dt * 2.2;
          const toast = Math.max(0, Math.sin(a.walkPhase * 0.8 + i));
          a.rightArm.rotation.x = -0.35 - toast * 0.75;
        } else {
          if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
          a.walkPhase += dt * 2.2;
          a.hips.position.y = Math.sin(a.walkPhase) * 0.01;
        }
        continue;
      }

      a.glbHandle.setAnimState('Walk');
      const target = a.waypoints[a.wpIdx];
      const dx = target.x - a.group.position.x;
      const dy = target.y - a.group.position.y;
      const dz = target.z - a.group.position.z;
      const distXZ = Math.hypot(dx, dz);
      const dist3D = Math.hypot(dx, dy, dz);

      if (dist3D < 0.24) {
        a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
      } else {
        const step = Math.min(dist3D, a.speed * dt);
        const r = step / dist3D;
        a.group.position.x += dx * r;
        a.group.position.y += dy * r;
        a.group.position.z += dz * r;
        if (distXZ > 0.03) {
          a.group.rotation.y = Math.atan2(dx, dz);
        }
        a.walkPhase += dt * (4.4 + a.speed * 1.8);
        const swing = Math.sin(a.walkPhase) * 0.42;
        a.leftArm.rotation.x = swing;
        a.rightArm.rotation.x = -swing;
        a.leftLeg.rotation.x = -swing * 1.15;
        a.rightLeg.rotation.x = swing * 1.15;
        a.hips.position.y = Math.abs(Math.sin(a.walkPhase)) * 0.03;
      }
    }
  }
}
