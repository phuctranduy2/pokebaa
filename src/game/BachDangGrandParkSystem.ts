import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import { attachGlbHumanToNpc, steerYawSmooth, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

/**
 * CÔNG VIÊN TRUNG TÂM BẠCH ĐẰNG — HAN RIVER GRAND PARK (Siêu to 124m x 74m)
 * - Vị trí: Ngay bên cạnh STARBUCKS RESERVE® Bạch Đằng (X = -86.0..-52.0), kéo dài đến Đại Lộ Bệnh Viện (X = -214.0)
 * - Footprint: X = -212.0 .. -88.0 (rộng 124.0m), Z = -104.0 .. -30.0 (sâu 74.0m)
 * - 3 cổng vào rộng lớn mặt Đường Bạch Đằng:
 *   + Cổng Chính (Giữa):       X = -156.0 .. -144.0 (rộng 12m, cổng vòm đá & hoa hồng)
 *   + Cổng Đông (Cạnh SB):     X = -102.0 .. -94.0  (rộng 8m, lối thông thẳng từ Starbucks)
 *   + Cổng Tây (Hồ Cá Koi):    X = -204.0 .. -196.0 (rộng 8m)
 */
export const BACH_DANG_PARK_MIN_X = -212.0;
export const BACH_DANG_PARK_MAX_X = -88.0;
export const BACH_DANG_PARK_MIN_Z = -104.0;
export const BACH_DANG_PARK_MAX_Z = -30.0;
export const BACH_DANG_PARK_CENTER_X = -150.0;
export const BACH_DANG_PARK_CENTER_Z = -67.0;

// Arched Lake Bridge Bounds (walkable over the Koi Lake!)
export const BACH_DANG_PARK_BRIDGE_MIN_X = -198.5;
export const BACH_DANG_PARK_BRIDGE_MAX_X = -173.5;
export const BACH_DANG_PARK_BRIDGE_MIN_Z = -69.4;
export const BACH_DANG_PARK_BRIDGE_MAX_Z = -64.6;
export const BACH_DANG_PARK_BRIDGE_PEAK_Y = 0.92;

export function getBachDangParkGroundY(x: number, z: number): number {
  if (
    x >= BACH_DANG_PARK_BRIDGE_MIN_X &&
    x <= BACH_DANG_PARK_BRIDGE_MAX_X &&
    z >= BACH_DANG_PARK_BRIDGE_MIN_Z &&
    z <= BACH_DANG_PARK_BRIDGE_MAX_Z
  ) {
    const t =
      (x - BACH_DANG_PARK_BRIDGE_MIN_X) /
      (BACH_DANG_PARK_BRIDGE_MAX_X - BACH_DANG_PARK_BRIDGE_MIN_X);
    return 0.06 + Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * BACH_DANG_PARK_BRIDGE_PEAK_Y;
  }
  return 0.04;
}

export interface BachDangGrandParkBuildResult {
  staticGroup: THREE.Group;
  dynamicGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  update: (delta: number, lampFactor: number) => void;
}

// =========================================================================
// COLLIDERS (Low perimeter hedges with 3 huge wide-open entrances, fountain,
// lake water north/south of walkable bridge, playground tower & bandstand)
// =========================================================================
export const BACH_DANG_GRAND_PARK_COLLIDERS: IntersectionColliderBox[] = [
  // North Front Perimeter Hedges along Đường Bạch Đằng (3 WIDE-OPEN GATES: -204..-196, -156..-144, -102..-94!)
  { minX: -212.2, maxX: -204.0, minZ: -104.3, maxZ: -103.5, floor: 1 }, // Far West North Hedge
  { minX: -196.0, maxX: -156.0, minZ: -104.3, maxZ: -103.5, floor: 1 }, // Mid-West North Hedge
  { minX: -144.0, maxX: -102.0, minZ: -104.3, maxZ: -103.5, floor: 1 }, // Mid-East North Hedge
  { minX: -94.0, maxX: -87.8, minZ: -104.3, maxZ: -103.5, floor: 1 }, // Far East North Hedge (next to Starbucks)

  // West Perimeter Hedge (OPEN Z = -70.6 .. -63.4 for West Koi Bridge Gate onto Đại Lộ Bệnh Viện!)
  { minX: -212.4, maxX: -211.5, minZ: -104.0, maxZ: -70.6, floor: 1 },
  { minX: -212.4, maxX: -211.5, minZ: -63.4, maxZ: -29.8, floor: 1 },
  // East Perimeter Hedge
  { minX: -88.5, maxX: -87.6, minZ: -104.0, maxZ: -29.8, floor: 1 },
  // South Perimeter Hedge (OPEN X = -156.5 .. -148.5 for Scenic Connecting Walkway to Công Viên Tây!)
  { minX: -212.2, maxX: -156.5, minZ: -30.5, maxZ: -29.6, floor: 1 },
  { minX: -148.5, maxX: -87.8, minZ: -30.5, maxZ: -29.6, floor: 1 },

  // Main Entrance Stone Gate Pillars (flanking the 12m wide Main Gate X = -156..-144)
  { minX: -156.6, maxX: -155.2, minZ: -103.8, maxZ: -102.4, floor: 1 },
  { minX: -144.8, maxX: -143.4, minZ: -103.8, maxZ: -102.4, floor: 1 },

  // Central Grand 3-Tier Musical Fountain Basin (Center X = -150, Z = -67, radius ~6.1m)
  { minX: -155.6, maxX: -144.4, minZ: -72.6, maxZ: -61.4, floor: 1 },

  // West Koi & Swan Botanical Lake Water Basin (SPLIT cleanly around walkable arched bridge Z = -69.6 .. -64.4!)
  { minX: -197.8, maxX: -174.2, minZ: -86.2, maxZ: -69.7, floor: 1 }, // North Half of Koi Lake
  { minX: -197.8, maxX: -174.2, minZ: -64.3, maxZ: -47.8, floor: 1 }, // South Half of Koi Lake (includes Pagoda Island)

  // Arched Bridge Side Guardrails (keeps player safely on the walkable bridge deck Z = -69.4..-64.6)
  { minX: -197.8, maxX: -174.2, minZ: -69.75, maxZ: -69.35, floor: 1 }, // Bridge North Rail
  { minX: -197.8, maxX: -174.2, minZ: -64.65, maxZ: -64.25, floor: 1 }, // Bridge South Rail

  // East Sakura Zone — Open-Air Bandstand Gazebo Columns & Raised Stage Edge
  { minX: -116.2, maxX: -107.8, minZ: -80.2, maxZ: -71.8, floor: 1 },

  // South-East Zone — Children's Playground Castle Tower & Merry-Go-Round
  { minX: -118.6, maxX: -110.2, minZ: -51.4, maxZ: -44.6, floor: 1 }, // Play Castle Tower & Slides
  { minX: -104.2, maxX: -99.8, minZ: -50.2, maxZ: -45.8, floor: 1 }, // Spinning Merry-Go-Round
  { minX: -128.0, maxX: -122.4, minZ: -50.4, maxZ: -46.8, floor: 1 }, // Swing Set Frame

  // South-Center-East Zone — Outdoor Calisthenics Rig & Dip Bars (shifted cleanly east of X=-145.2!)
  { minX: -144.2, maxX: -135.2, minZ: -44.6, maxZ: -39.4, floor: 1 },

  // Park Info Kiosk near Main Entrance
  { minX: -143.6, maxX: -141.6, minZ: -95.6, maxZ: -94.2, floor: 1 },
];

// =========================================================================
// PROCEDURAL HIGH-DPI TEXTURES
// =========================================================================
function createParkArchSignTexture(): THREE.CanvasTexture {
  const w = 1536;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#092e20');
  grad.addColorStop(0.5, '#051f15');
  grad.addColorStop(1, '#092e20');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#e5b963';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.fillStyle = '#e5b963';
  ctx.font = '900 58px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❀', 110, h / 2);
  ctx.fillText('❀', w - 110, h / 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 76px system-ui, -apple-system, sans-serif';
  ctx.fillText('CÔNG VIÊN TRUNG TÂM BẠCH ĐẰNG', w / 2, h / 2 - 28);

  ctx.fillStyle = '#86efac';
  ctx.font = '800 34px system-ui, -apple-system, sans-serif';
  ctx.fillText('HAN RIVER GRAND BOTANICAL PARK  •  KOI LAKE  •  SAKURA GARDEN', w / 2, h / 2 + 54);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createParkMapBoardTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0f291e';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d4a359';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#fde68a';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BẢN ĐỒ CÔNG VIÊN BẠCH ĐẰNG', w / 2, 46);

  // Mini stylized park map diagram
  ctx.fillStyle = '#1e5631';
  ctx.fillRect(36, 72, w - 72, 230);
  // Lake
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.ellipse(125, 185, 58, 72, 0, 0, Math.PI * 2);
  ctx.fill();
  // Red bridge
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(72, 178, 106, 14);
  // Central Fountain Plaza
  ctx.fillStyle = '#e7e5e4';
  ctx.beginPath();
  ctx.arc(256, 185, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(256, 185, 22, 0, Math.PI * 2);
  ctx.fill();
  // Sakura & Playground
  ctx.fillStyle = '#f9a8d4';
  ctx.beginPath();
  ctx.arc(388, 145, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(352, 212, 74, 52);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText('HỒ CÁ KOI   •   NHẠC NƯỚC   •   VƯỜN SAKURA   •   KHU VUI CHƠI', w / 2, 342);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createLushLawnTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3f8f45';
  ctx.fillRect(0, 0, s, s);

  // Subtle mowed-lawn alternating stripes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)';
    ctx.fillRect(i * (s / 8), 0, s / 8, s);
  }
  // Organic grass speckles
  for (let i = 0; i < 650; i++) {
    const gx = (i * 97 + 13) % s;
    const gy = (i * 193 + 29) % s;
    ctx.fillStyle = i % 3 === 0 ? '#52b054' : '#2d7236';
    ctx.globalAlpha = 0.25;
    ctx.fillRect(gx, gy, 3, 6);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 9);
  return tex;
}

function createStonePaverTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#dcd5c7';
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = 'rgba(105, 98, 88, 0.28)';
  ctx.lineWidth = 3;
  const step = 64;
  for (let y = 0; y < s; y += step) {
    const offset = ((y / step) % 2) * (step / 2);
    for (let x = -step; x < s + step; x += step) {
      ctx.fillStyle = ((x + y) / step) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)';
      ctx.fillRect(x + offset, y, step, step);
      ctx.strokeRect(x + offset, y, step, step);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
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
  g.addColorStop(0.55, `rgba(${rgb}, 0.18)`);
  g.addColorStop(1, `rgba(${rgb}, 0.0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================================
// MEGA-PARK STRUCTURE BUILDER
// =========================================================================
export function createBachDangGrandParkStructure(): BachDangGrandParkBuildResult {
  const staticGroup = new THREE.Group();
  staticGroup.name = 'BachDangGrandParkStatic';
  const dynamicGroup = new THREE.Group();
  dynamicGroup.name = 'BachDangGrandParkDynamic';

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = BACH_DANG_PARK_MIN_X; // -212.0
  const maxX = BACH_DANG_PARK_MAX_X; // -88.0
  const minZ = BACH_DANG_PARK_MIN_Z; // -104.0
  const maxZ = BACH_DANG_PARK_MAX_Z; // -30.0
  const cx = BACH_DANG_PARK_CENTER_X; // -150.0
  const cz = BACH_DANG_PARK_CENTER_Z; // -67.0

  // --- Rich Natural & Architectural PBR Materials ---
  const lawnMat = new THREE.MeshStandardMaterial({
    map: createLushLawnTexture(),
    roughness: 0.92,
    metalness: 0.0,
  });
  const paverMat = new THREE.MeshStandardMaterial({
    map: createStonePaverTexture(),
    roughness: 0.72,
    metalness: 0.04,
  });
  const warmGraniteMat = new THREE.MeshStandardMaterial({
    color: 0xcbc2b0,
    roughness: 0.62,
    metalness: 0.06,
  });
  const jogTrackMat = new THREE.MeshStandardMaterial({
    color: 0xb85c44, // Terracotta athletic rubber track
    roughness: 0.84,
    metalness: 0.02,
  });
  const playTurfBlueMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.85,
    metalness: 0.02,
  });
  const playTurfAmberMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.85,
    metalness: 0.02,
  });
  const fitnessMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.86,
    metalness: 0.04,
  });
  const limestoneMat = new THREE.MeshStandardMaterial({
    color: 0xebe6db,
    roughness: 0.66,
    metalness: 0.04,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1e2422,
    roughness: 0.38,
    metalness: 0.78,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a359,
    roughness: 0.25,
    metalness: 0.86,
  });
  const cedarWoodMat = new THREE.MeshStandardMaterial({
    color: 0x7c4a26,
    roughness: 0.65,
    metalness: 0.04,
  });
  const teakWoodMat = new THREE.MeshStandardMaterial({
    color: 0xa1622f,
    roughness: 0.58,
    metalness: 0.05,
  });
  const vermilionMat = new THREE.MeshStandardMaterial({
    color: 0xc22828,
    roughness: 0.42,
    metalness: 0.12,
  });
  const emeraldRoofMat = new THREE.MeshStandardMaterial({
    color: 0x0f5c45,
    roughness: 0.44,
    metalness: 0.24,
  });
  const hedgeMat = new THREE.MeshStandardMaterial({
    color: 0x1c6434,
    roughness: 0.9,
    metalness: 0.0,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x5c4028,
    roughness: 0.92,
    metalness: 0.0,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x78746c,
    roughness: 0.88,
    metalness: 0.04,
  });
  const canopyMats = [
    new THREE.MeshStandardMaterial({ color: 0x267a3e, roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: 0x359148, roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: 0x1c5f32, roughness: 0.9 }),
  ];
  const sakuraMats = [
    new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.82 }),
    new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.84 }),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.8 }),
  ];
  const goldenCassiaMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.8,
  });
  const flowerRedMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.78 });
  const flowerYellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.78 });
  const flowerPurpleMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.78 });
  const flowerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0369a1,
    emissiveIntensity: 0.28,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.82,
  });
  const lakeBedMat = new THREE.MeshStandardMaterial({
    color: 0x0c3b4a,
    roughness: 0.92,
  });
  const waterJetMat = new THREE.MeshStandardMaterial({
    color: 0xe0f7ff,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.65,
    roughness: 0.12,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
  });
  const warmGlobeMat = new THREE.MeshStandardMaterial({
    color: 0xfff5da,
    emissive: 0xffc86b,
    emissiveIntensity: 1.0,
    roughness: 0.18,
  });
  lanternMats.push(warmGlobeMat);

  const fountainLedMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  neonMats.push(fountainLedMat);

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
  // 1. GRAND LAWN BASE, OUTER JOGGING TRACK & STONE PROMENADE NETWORK
  // =========================================================================
  // Lush Main Grass Terrain Slab (124m x 74m, flush at Y = 0.02 above base ground)
  addBox(minX, maxX, -0.24, 0.02, minZ, maxZ, lawnMat);

  // Looping Terracotta Jogging Track running around the entire park (2.4m wide, Y = 0.035)
  addBox(minX + 4.5, maxX - 4.5, 0.01, 0.035, minZ + 4.0, minZ + 6.4, jogTrackMat); // North Track
  addBox(minX + 4.5, maxX - 4.5, 0.01, 0.035, maxZ - 6.4, maxZ - 4.0, jogTrackMat); // South Track
  addBox(minX + 4.5, minX + 6.9, 0.01, 0.035, minZ + 6.4, maxZ - 6.4, jogTrackMat); // West Track
  addBox(maxX - 6.9, maxX - 4.5, 0.01, 0.035, minZ + 6.4, maxZ - 6.4, jogTrackMat); // East Track

  // Grand Cross-Axis Stone Promenades (Y = 0.048, neatly above lawn 0.02 & track 0.035 with ZERO coplanar overlap!)
  // Main North-South Avenue from Main Gate (-150, -104) straight through Central Fountain to Z = -46.5
  addBox(cx - 4.6, cx + 4.6, 0.01, 0.048, minZ, -46.5, paverMat);
  // South Connecting Pedestrian Walkway aligning Grand Park Avenue (-150) seamlessly with Công Viên Tây (-152.5) across Z = -46.5 .. -25.8!
  addBox(-155.8, -149.2, 0.01, 0.048, -46.5, -25.8, paverMat);
  // Warm Granite Curbs framing the Connecting Pedestrian Walkway
  addBox(-156.2, -155.8, 0.01, 0.14, -34.0, -26.0, warmGraniteMat);
  addBox(-149.2, -148.8, 0.01, 0.14, -34.0, -26.0, warmGraniteMat);
  // Seamless Lush Turf Verge bridging the 3.6m green buffer between Grand Park (Z=-30.0) & Công Viên Tây (Z=-26.4)
  addBox(-171.5, -156.1, -0.24, 0.02, -30.1, -26.3, lawnMat);
  addBox(-148.9, -133.5, -0.24, 0.02, -30.1, -26.3, lawnMat);
  // Grand East-West Avenue SPLIT cleanly around Koi Lake so water under the arched bridge is 100% pure!
  addBox(-214.1, -198.2, 0.01, 0.048, cz - 3.0, cz + 3.0, paverMat); // West Gate -> West Bridge Landing
  addBox(-173.8, maxX - 5.0, 0.01, 0.048, cz - 3.0, cz + 3.0, paverMat); // East Bridge Landing -> Fountain -> Bandstand
  // East Starbucks Gate Arrival Walkway (X = -101.2 .. -94.8, Z = -104.0 .. -70.0, flush against EW Avenue)
  addBox(-101.2, -94.8, 0.01, 0.048, minZ, cz - 3.0, paverMat);
  // West Lakefront Gate Arrival Walkway (X = -203.2 .. -196.8, Z = -104.0 .. -70.0, flush against EW Avenue)
  addBox(-203.2, -196.8, 0.01, 0.048, minZ, cz - 3.0, paverMat);

  // Grand Circular Central Fountain Mosaic Plaza (Radius 16.5m at (-150, -67), Y = 0.055)
  const plazaDisc = new THREE.Mesh(new THREE.CylinderGeometry(16.5, 16.6, 0.06, 48), paverMat);
  plazaDisc.position.set(cx, 0.03, cz);
  staticGroup.add(plazaDisc);
  const plazaRingOuter = new THREE.Mesh(new THREE.RingGeometry(15.6, 16.4, 48), warmGraniteMat);
  plazaRingOuter.rotation.x = -Math.PI / 2;
  plazaRingOuter.position.set(cx, 0.065, cz);
  staticGroup.add(plazaRingOuter);
  const plazaRingInner = new THREE.Mesh(new THREE.RingGeometry(10.6, 11.2, 48), warmGraniteMat);
  plazaRingInner.rotation.x = -Math.PI / 2;
  plazaRingInner.position.set(cx, 0.065, cz);
  staticGroup.add(plazaRingInner);

  // =========================================================================
  // 2. PERIMETER TRIMMED HEDGES, ORNAMENTAL IRON RAILING & 5 GRAND ENTRANCES
  // =========================================================================
  const addPerimeterHedge = (x1: number, x2: number, z1: number, z2: number) => {
    addBox(x1, x2, 0.0, 0.36, z1, z2, limestoneMat);
    addBox(x1 + 0.06, x2 - 0.06, 0.36, 1.08, z1 + 0.06, z2 - 0.06, hedgeMat);
  };
  // North Front Hedges (open at -204..-196, -156..-144, -102..-94)
  addPerimeterHedge(minX, -204.2, -104.1, -103.5);
  addPerimeterHedge(-195.8, -156.6, -104.1, -103.5);
  addPerimeterHedge(-143.4, -102.2, -104.1, -103.5);
  addPerimeterHedge(-93.8, maxX, -104.1, -103.5);
  // West Perimeter Hedges (OPEN Z = -70.6 .. -63.4 for West Koi Bridge Gate onto Đại Lộ Bệnh Viện!)
  addPerimeterHedge(minX - 0.1, minX + 0.5, minZ, -70.6);
  addPerimeterHedge(minX - 0.1, minX + 0.5, -63.4, maxZ);
  // East Perimeter Hedge
  addPerimeterHedge(maxX - 0.5, maxX + 0.1, minZ, maxZ);
  // South Perimeter Hedges (OPEN X = -156.5 .. -148.5 for Scenic Connecting Walkway to Công Viên Tây!)
  addPerimeterHedge(minX, -156.5, maxZ - 0.5, maxZ + 0.1);
  addPerimeterHedge(-148.5, maxX, maxZ - 0.5, maxZ + 0.1);

  // Flanking Stone Entrance Bollards for North West/East Gates, West Koi Bridge Gate & South Park Connector!
  const addEntranceBollard = (gx: number, gz: number) => {
    addBox(gx - 0.42, gx + 0.42, 0.0, 1.95, gz - 0.45, gz + 0.45, limestoneMat);
    addBox(gx - 0.5, gx + 0.5, 1.95, 2.12, gz - 0.52, gz + 0.52, brassMat);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), warmGlobeMat);
    lantern.position.set(gx, 2.38, gz);
    staticGroup.add(lantern);
  };
  [-204.2, -195.8, -102.2, -93.8].forEach((gx) => addEntranceBollard(gx, -103.7));
  [-70.6, -63.4].forEach((gz) => addEntranceBollard(minX + 0.2, gz));
  [-156.5, -148.5].forEach((gx) => addEntranceBollard(gx, maxZ - 0.2));
  [-156.5, -148.5].forEach((gx) => addEntranceBollard(gx, -26.4));

  // Scenic Twin Vine-Draped Cedar Garden Pergola Archways spanning the Connecting Pedestrian Walkway (Z = -29.8 & -26.8)
  const connCx = -152.5;
  [-29.8, -26.8].forEach((pz) => {
    [-3.7, 3.7].forEach((ox) => {
      addBox(connCx + ox - 0.18, connCx + ox + 0.18, 0.0, 3.45, pz - 0.18, pz + 0.18, cedarWoodMat);
    });
    addBox(connCx - 4.1, connCx + 4.1, 3.4, 3.66, pz - 0.22, pz + 0.22, cedarWoodMat);
    for (let rx = -3.2; rx <= 3.2; rx += 1.28) {
      const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), hedgeMat);
      vine.position.set(connCx + rx, 3.76, pz);
      staticGroup.add(vine);
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 8, 6),
        Math.round(rx) % 2 === 0 ? flowerRedMat : sakuraMats[0]
      );
      bloom.position.set(connCx + rx + 0.12, 3.8, pz + 0.2);
      staticGroup.add(bloom);
    }
    const hangLantern = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), warmGlobeMat);
    hangLantern.position.set(connCx, 3.16, pz);
    staticGroup.add(hangLantern);
  });
  // Connecting Overhead Timber Stringers joining the Twin Pergola Archways into a Shaded Garden Tunnel
  [-3.2, -1.6, 0.0, 1.6, 3.2].forEach((ox) => {
    addBox(connCx + ox - 0.08, connCx + ox + 0.08, 3.64, 3.76, -30.0, -26.6, cedarWoodMat);
  });
  // Decorative Blooming Flower Planter Strips flanking the Connecting Pedestrian Walkway
  [-158.6, -146.4].forEach((fx, idx) => {
    addBox(fx - 1.5, fx + 1.5, 0.0, 0.26, -29.2, -27.2, limestoneMat);
    addBox(fx - 1.35, fx + 1.35, 0.26, 0.52, -29.05, -27.35, hedgeMat);
    const petalMat = idx === 0 ? flowerRedMat : flowerYellowMat;
    for (let dx = -1.0; dx <= 1.0; dx += 0.65) {
      const bl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), petalMat);
      bl.position.set(fx + dx, 0.64, -28.2 + (dx === 0 ? 0.25 : -0.15));
      staticGroup.add(bl);
    }
  });

  // --- MONUMENTAL MAIN ENTRANCE ARCHWAY GATE (Center X = -156 .. -144, Z = -103.1) ---
  [-155.9, -144.1].forEach((px) => {
    addBox(px - 0.68, px + 0.68, 0.0, 5.2, -103.75, -102.45, limestoneMat);
    addBox(px - 0.78, px + 0.78, 0.0, 0.55, -103.85, -102.35, warmGraniteMat);
    addBox(px - 0.78, px + 0.78, 5.0, 5.35, -103.85, -102.35, brassMat);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), warmGlobeMat);
    finial.position.set(px, 5.75, -103.1);
    staticGroup.add(finial);
  });
  // Overhead Timber & Iron Arch Beam + Illuminated Park Sign
  addBox(-156.6, -143.4, 5.25, 6.95, -103.55, -102.65, darkIronMat);
  addBox(-156.9, -143.1, 6.95, 7.18, -103.65, -102.55, brassMat);
  const archSignTex = createParkArchSignTexture();
  const archSignMat = new THREE.MeshStandardMaterial({
    map: archSignTex,
    emissive: 0xffffff,
    emissiveMap: archSignTex,
    emissiveIntensity: 0.7,
    roughness: 0.25,
  });
  neonMats.push(archSignMat);
  const archSignFront = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 1.55), archSignMat);
  archSignFront.position.set(cx, 6.1, -103.58);
  archSignFront.rotation.y = Math.PI; // Faces North (-Z) toward Đường Bạch Đằng
  staticGroup.add(archSignFront);
  const archSignBack = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 1.55), archSignMat);
  archSignBack.position.set(cx, 6.1, -102.62);
  staticGroup.add(archSignBack);

  // Dual Vine-Draped Rose Pergola Arches along Main Arrival Avenue (Z = -97, -91, -85)
  [-97.0, -91.0, -85.5].forEach((pz) => {
    [-4.8, 4.8].forEach((ox) => {
      addBox(cx + ox - 0.2, cx + ox + 0.2, 0.0, 3.6, pz - 0.2, pz + 0.2, cedarWoodMat);
    });
    addBox(cx - 5.2, cx + 5.2, 3.55, 3.82, pz - 0.24, pz + 0.24, cedarWoodMat);
    // Blooming pink/red rose vines draped over pergola top
    for (let rx = -4.2; rx <= 4.2; rx += 1.4) {
      const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 1), hedgeMat);
      vine.position.set(cx + rx, 3.92, pz);
      staticGroup.add(vine);
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 6),
        Math.round(rx) % 2 === 0 ? flowerRedMat : sakuraMats[0]
      );
      bloom.position.set(cx + rx + 0.15, 3.95, pz - 0.22);
      staticGroup.add(bloom);
    }
    // Hanging warm pergola lantern
    const hangLantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), warmGlobeMat);
    hangLantern.position.set(cx, 3.32, pz);
    staticGroup.add(hangLantern);
  });

  // Park Directory Map Kiosk (East side of Arrival Promenade)
  const kioskMapTex = createParkMapBoardTexture();
  const kioskMapMat = new THREE.MeshStandardMaterial({
    map: kioskMapTex,
    emissive: 0xffffff,
    emissiveMap: kioskMapTex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  neonMats.push(kioskMapMat);
  addBox(-143.4, -141.8, 0.0, 2.35, -95.2, -94.6, darkIronMat);
  const kioskFace = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.05), kioskMapMat);
  kioskFace.position.set(-142.6, 1.55, -95.22);
  kioskFace.rotation.y = Math.PI;
  staticGroup.add(kioskFace);

  // =========================================================================
  // 3. CENTRAL GRAND 3-TIER MUSICAL FOUNTAIN (Center -150, -67)
  // =========================================================================
  const ftnGroup = new THREE.Group();
  ftnGroup.position.set(cx, 0.06, cz);

  // Outer Carved Limestone Coping Basin (Radius 6.0m)
  const outerRim = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.2, 0.72, 40), limestoneMat);
  outerRim.position.y = 0.36;
  ftnGroup.add(outerRim);
  const basinWater = new THREE.Mesh(new THREE.CylinderGeometry(5.55, 5.55, 0.56, 36), waterMat);
  basinWater.position.y = 0.34;
  ftnGroup.add(basinWater);
  // Glowing Cyan Underwater LED Ring
  const ftnLedRing = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.06, 8, 40), fountainLedMat);
  ftnLedRing.rotation.x = Math.PI / 2;
  ftnLedRing.position.y = 0.65;
  ftnGroup.add(ftnLedRing);

  // Tier 1 Bowl
  const tier1Ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 1.65, 24), limestoneMat);
  tier1Ped.position.y = 0.85;
  ftnGroup.add(tier1Ped);
  const tier1Bowl = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 1.6, 0.52, 32), limestoneMat);
  tier1Bowl.position.y = 1.75;
  ftnGroup.add(tier1Bowl);
  const tier1Water = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, 0.14, 28), waterMat);
  tier1Water.position.y = 1.98;
  ftnGroup.add(tier1Water);

  // Tier 2 Bowl
  const tier2Ped = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.1, 1.45, 20), limestoneMat);
  tier2Ped.position.y = 2.65;
  ftnGroup.add(tier2Ped);
  const tier2Bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 0.9, 0.44, 28), limestoneMat);
  tier2Bowl.position.y = 3.45;
  ftnGroup.add(tier2Bowl);
  const tier2Water = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 0.12, 24), waterMat);
  tier2Water.position.y = 3.64;
  ftnGroup.add(tier2Water);

  // Crown Brass Finial
  const crownSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 1.15, 16), brassMat);
  crownSpire.position.y = 4.22;
  ftnGroup.add(crownSpire);
  staticGroup.add(ftnGroup);

  // Animated Fountain Water Plume & 12 Arcing Musical Jets (in dynamicGroup!)
  const fountainDynamic = new THREE.Group();
  fountainDynamic.position.set(cx, 0.06, cz);
  const centerPlume = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 3.2, 12), waterJetMat);
  centerPlume.position.y = 6.2;
  fountainDynamic.add(centerPlume);
  const plumeCap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), waterJetMat);
  plumeCap.position.y = 7.8;
  fountainDynamic.add(plumeCap);

  const arcingJets: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 4.8, 0.65, Math.sin(a) * 4.8),
      new THREE.Vector3(Math.cos(a) * 3.4, 2.75, Math.sin(a) * 3.4),
      new THREE.Vector3(Math.cos(a) * 2.1, 2.02, Math.sin(a) * 2.1),
    ]);
    const jetMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.055, 6, false), waterJetMat);
    fountainDynamic.add(jetMesh);
    arcingJets.push(jetMesh);
  }
  dynamicGroup.add(fountainDynamic);

  // =========================================================================
  // 4. WEST ZONE: KOI & SWAN BOTANICAL LAKE, WALKABLE RED BRIDGE & PAGODA ISLAND
  // =========================================================================
  const lakeCx = -186.0;
  const lakeCz = -67.0;

  // Elevated Lake Shoreline Stone Base, Deep Dark Bed & Shimmering Translucent Water Surface
  // All stacked cleanly above main lawn (Y = 0.020) to guarantee ZERO z-fighting!
  const lakeShoreBase = new THREE.Mesh(new THREE.CylinderGeometry(14.15, 14.3, 0.04, 40), rockMat);
  lakeShoreBase.scale.set(0.88, 1.0, 1.38);
  lakeShoreBase.position.set(lakeCx, 0.036, lakeCz); // Top = 0.056 (above lawn 0.02)
  staticGroup.add(lakeShoreBase);

  const lakeBed = new THREE.Mesh(new THREE.CylinderGeometry(13.85, 13.95, 0.05, 40), lakeBedMat);
  lakeBed.scale.set(0.88, 1.0, 1.38);
  lakeBed.position.set(lakeCx, 0.058, lakeCz); // Top = 0.083 (cleanly hides lawn beneath water!)
  staticGroup.add(lakeBed);

  const lakeSurface = new THREE.Mesh(new THREE.CylinderGeometry(13.65, 13.65, 0.04, 40), waterMat);
  lakeSurface.scale.set(0.88, 1.0, 1.38);
  lakeSurface.position.set(lakeCx, 0.125, lakeCz); // Top = 0.145 (cleanly above bed & Koi fish!)
  staticGroup.add(lakeSurface);

  // Natural River Boulders & Glowing Stone Lanterns ringing the entire Koi Lake shoreline
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const rx = lakeCx + Math.cos(a) * 12.2;
    const rz = lakeCz + Math.sin(a) * 19.0;
    // Leave bridge landing mouths clear!
    if (Math.abs(rz - lakeCz) < 3.4) continue;
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.65 + (i % 3) * 0.28, 1),
      rockMat
    );
    boulder.scale.set(1.2, 0.65, 1.1);
    boulder.position.set(rx, 0.16, rz);
    staticGroup.add(boulder);

    if (i % 6 === 0) {
      // Japanese Toro Stone Garden Lantern
      const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.95, 6), limestoneMat);
      lBase.position.set(rx + Math.cos(a) * 1.0, 0.48, rz + Math.sin(a) * 1.0);
      staticGroup.add(lBase);
      const lGlow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), warmGlobeMat);
      lGlow.position.set(rx + Math.cos(a) * 1.0, 1.08, rz + Math.sin(a) * 1.0);
      staticGroup.add(lGlow);
      const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.28, 6), rockMat);
      lCap.position.set(rx + Math.cos(a) * 1.0, 1.36, rz + Math.sin(a) * 1.0);
      staticGroup.add(lCap);
    }
  }

  // Floating Green Lily Pads & Blooming Pink Lotus Flowers
  const lilyPositions: Array<[number, number]> = [
    [-192, -77],
    [-189, -74],
    [-182, -79],
    [-178, -73],
    [-193, -58],
    [-189, -52],
    [-179, -56],
    [-184, -75],
    [-191, -82],
    [-179, -81],
    [-190, -61],
    [-178, -60],
  ];
  lilyPositions.forEach(([lx, lz], idx) => {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.52 + (idx % 3) * 0.15, 0.52, 0.03, 14), hedgeMat);
    pad.position.set(lx, 0.152, lz);
    staticGroup.add(pad);
    if (idx % 2 === 0) {
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.2, 7), sakuraMats[0]);
      lotus.rotation.x = Math.PI;
      lotus.position.set(lx, 0.235, lz);
      staticGroup.add(lotus);
    }
  });

  // --- WALKABLE ARCHED VERMILION & CEDAR FOOTBRIDGE OVER THE KOI LAKE ---
  const bridgeSegs = 16;
  const bSpan = BACH_DANG_PARK_BRIDGE_MAX_X - BACH_DANG_PARK_BRIDGE_MIN_X; // 25.0m
  const bStep = bSpan / bridgeSegs;
  for (let i = 0; i < bridgeSegs; i++) {
    const xA = BACH_DANG_PARK_BRIDGE_MIN_X + i * bStep;
    const xMid = xA + bStep * 0.5;
    const t = (i + 0.5) / bridgeSegs;
    const archY = 0.06 + Math.sin(t * Math.PI) * BACH_DANG_PARK_BRIDGE_PEAK_Y;
    const nextArchY = 0.06 + Math.sin(((i + 1) / bridgeSegs) * Math.PI) * BACH_DANG_PARK_BRIDGE_PEAK_Y;
    const prevArchY = 0.06 + Math.sin((i / bridgeSegs) * Math.PI) * BACH_DANG_PARK_BRIDGE_PEAK_Y;
    const slope = Math.atan2(nextArchY - prevArchY, bStep);

    // Timber Deck Plank Segment
    const deck = new THREE.Mesh(new THREE.BoxGeometry(bStep + 0.08, 0.16, 4.6), teakWoodMat);
    deck.position.set(xMid, archY - 0.04, lakeCz);
    deck.rotation.z = slope;
    staticGroup.add(deck);

    // Vermilion Arch Side Beams & Top Handrails
    [-2.25, 2.25].forEach((oz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(bStep + 0.08, 0.28, 0.18), vermilionMat);
      beam.position.set(xMid, archY - 0.12, lakeCz + oz);
      beam.rotation.z = slope;
      staticGroup.add(beam);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(bStep + 0.08, 0.1, 0.14), vermilionMat);
      rail.position.set(xMid, archY + 0.96, lakeCz + oz);
      rail.rotation.z = slope;
      staticGroup.add(rail);

      if (i % 2 === 0) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), vermilionMat);
        post.position.set(xA, archY + 0.48, lakeCz + oz);
        staticGroup.add(post);
        if (i === 0 || i === 8 || i === 14) {
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), warmGlobeMat);
          orb.position.set(xA, archY + 1.14, lakeCz + oz);
          staticGroup.add(orb);
        }
      }
    });
  }

  // --- FLOATING OCTAGONAL PAGODA PAVILION ON SOUTH LAKE ISLAND (X = -186, Z = -56) ---
  const pagX = lakeCx;
  const pagZ = -56.0;
  const island = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 0.45, 24), rockMat);
  island.position.set(pagX, 0.1, pagZ);
  staticGroup.add(island);
  const pagDeck = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.2, 0.25, 8), cedarWoodMat);
  pagDeck.position.set(pagX, 0.42, pagZ);
  staticGroup.add(pagDeck);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 10), vermilionMat);
    col.position.set(pagX + Math.cos(a) * 3.3, 2.1, pagZ + Math.sin(a) * 3.3);
    staticGroup.add(col);
  }
  const pagRoof1 = new THREE.Mesh(new THREE.ConeGeometry(4.9, 1.45, 8), emeraldRoofMat);
  pagRoof1.position.set(pagX, 4.35, pagZ);
  staticGroup.add(pagRoof1);
  const pagRoof2 = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.25, 8), emeraldRoofMat);
  pagRoof2.position.set(pagX, 5.55, pagZ);
  staticGroup.add(pagRoof2);
  const pagSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 0.9, 10), brassMat);
  pagSpire.position.set(pagX, 6.5, pagZ);
  staticGroup.add(pagSpire);
  const pagLantern = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), warmGlobeMat);
  pagLantern.position.set(pagX, 3.3, pagZ);
  staticGroup.add(pagLantern);

  // Animated 12 Swimming Koi Fish & 2 Drifting White Swans (in dynamicGroup!)
  interface KoiFishActor {
    mesh: THREE.Group;
    centerX: number;
    centerZ: number;
    rx: number;
    rz: number;
    speed: number;
    phase: number;
  }
  const koiActors: KoiFishActor[] = [];
  const koiColors = [0xff6b2b, 0xfbbf24, 0xf8fafc, 0xef4444];
  for (let i = 0; i < 12; i++) {
    const kGrp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: koiColors[i % koiColors.length], roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat);
    body.scale.set(0.6, 0.5, 1.9);
    kGrp.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 4), mat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -0.34;
    kGrp.add(tail);
    dynamicGroup.add(kGrp);
    koiActors.push({
      mesh: kGrp,
      centerX: lakeCx + ((i % 3) - 1) * 3.2,
      centerZ: i < 6 ? -77.5 : -55.0,
      rx: 3.4 + (i % 4) * 1.1,
      rz: 3.0 + (i % 3) * 1.2,
      speed: (i % 2 === 0 ? 1 : -1) * (0.45 + (i % 4) * 0.12),
      phase: i * 1.15,
    });
  }

  interface SwanActor {
    mesh: THREE.Group;
    cz: number;
    rx: number;
    rz: number;
    speed: number;
    phase: number;
  }
  const swanActors: SwanActor[] = [];
  for (let s = 0; s < 2; s++) {
    const sw = new THREE.Group();
    const swBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), flowerWhiteMat);
    swBody.scale.set(0.85, 0.65, 1.35);
    swBody.position.y = 0.14;
    sw.add(swBody);
    const swNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.48, 8), flowerWhiteMat);
    swNeck.position.set(0, 0.44, 0.32);
    swNeck.rotation.x = 0.25;
    sw.add(swNeck);
    const swHead = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), flowerWhiteMat);
    swHead.position.set(0, 0.68, 0.4);
    sw.add(swHead);
    const swBeak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), flowerYellowMat);
    swBeak.rotation.x = Math.PI / 2;
    swBeak.position.set(0, 0.67, 0.5);
    sw.add(swBeak);
    dynamicGroup.add(sw);
    swanActors.push({
      mesh: sw,
      cz: s === 0 ? -77.5 : -74.5,
      rx: 5.8 - s * 1.6,
      rz: 4.5 + s * 1.2,
      speed: s === 0 ? 0.22 : -0.19,
      phase: s * Math.PI,
    });
  }

  // =========================================================================
  // 5. EAST ZONE: BANDSTAND GAZEBO, SAKURA CHERRY BLOSSOM GROVE & PICNIC LAWN
  // =========================================================================
  const bandX = -112.0;
  const bandZ = -76.0;
  const bandBase = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.7, 0.55, 12), limestoneMat);
  bandBase.position.set(bandX, 0.28, bandZ);
  staticGroup.add(bandBase);
  const bandFloor = new THREE.Mesh(new THREE.CylinderGeometry(4.15, 4.15, 0.1, 12), teakWoodMat);
  bandFloor.position.set(bandX, 0.58, bandZ);
  staticGroup.add(bandFloor);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.3, 10), limestoneMat);
    col.position.set(bandX + Math.cos(a) * 3.7, 2.25, bandZ + Math.sin(a) * 3.7);
    staticGroup.add(col);
  }
  const bandDome = new THREE.Mesh(new THREE.ConeGeometry(4.9, 1.8, 12), emeraldRoofMat);
  bandDome.position.set(bandX, 4.8, bandZ);
  staticGroup.add(bandDome);
  const bandSpire = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), brassMat);
  bandSpire.position.set(bandX, 5.85, bandZ);
  staticGroup.add(bandSpire);
  const bandChandelier = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), warmGlobeMat);
  bandChandelier.position.set(bandX, 3.65, bandZ);
  staticGroup.add(bandChandelier);

  // Picnic Blankets & Wicker Baskets on the East Sakura Lawn (right near Starbucks!)
  const picnicSpots: Array<[number, number, number]> = [
    [-106.5, -88.5, 0xe11d48],
    [-122.0, -87.0, 0x0284c7],
    [-103.5, -67.5, 0xd97706],
  ];
  picnicSpots.forEach(([px, pz, hex]) => {
    const blankMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9 });
    addBox(px - 1.35, px + 1.35, 0.025, 0.045, pz - 1.15, pz + 1.15, blankMat);
    addBox(px - 0.35, px + 0.25, 0.045, 0.36, pz - 0.22, pz + 0.22, teakWoodMat); // Wicker basket
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.16, 8), flowerWhiteMat);
    cup.position.set(px + 0.55, 0.12, pz + 0.35);
    staticGroup.add(cup);
  });

  // =========================================================================
  // 6. SOUTH-EAST ZONE: CHILDREN'S ADVENTURE PLAYGROUND (X = -132..-96, Z = -58..-38)
  // =========================================================================
  addBox(-131.5, -96.5, 0.015, 0.045, -57.0, -39.0, playTurfBlueMat);
  addBox(-121.0, -108.0, 0.02, 0.052, -53.5, -42.5, playTurfAmberMat);

  // Multi-Part Adventure Castle Play Tower with Dual Slides (at X = -114.4, Z = -48.0)
  const playX = -114.4;
  const playZ = -48.0;
  [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ].forEach(([ox, oz]) => {
    addBox(playX + ox - 0.12, playX + ox + 0.12, 0.04, 3.6, playZ + oz - 0.12, playZ + oz + 0.12, cedarWoodMat);
  });
  addBox(playX - 1.55, playX + 1.55, 1.85, 2.02, playZ - 1.55, playZ + 1.55, teakWoodMat); // Elevated Platform
  const playRoof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.45, 4), vermilionMat);
  playRoof.rotation.y = Math.PI / 4;
  playRoof.position.set(playX, 4.3, playZ);
  staticGroup.add(playRoof);
  // Bright Yellow Wave Slide (East side) & Blue Tube Slide (West side)
  const slideY = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.88), flowerYellowMat);
  slideY.position.set(playX + 2.55, 1.0, playZ);
  slideY.rotation.z = -0.68;
  staticGroup.add(slideY);
  const slideB = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.88), playTurfBlueMat);
  slideB.position.set(playX - 2.55, 1.0, playZ);
  slideB.rotation.z = 0.68;
  staticGroup.add(slideB);

  // Dual Animated Swing Set (X = -125.2, Z = -48.6)
  const swX = -125.2;
  const swZ = -48.6;
  [-2.1, 2.1].forEach((ox) => {
    const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.1, 8), vermilionMat);
    legA.position.set(swX + ox, 1.5, swZ - 0.6);
    legA.rotation.x = 0.22;
    staticGroup.add(legA);
    const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.1, 8), vermilionMat);
    legB.position.set(swX + ox, 1.5, swZ + 0.6);
    legB.rotation.x = -0.22;
    staticGroup.add(legB);
  });
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 10), vermilionMat);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(swX, 2.95, swZ);
  staticGroup.add(topBar);

  const swingPivots: THREE.Group[] = [];
  [-0.85, 0.85].forEach((ox) => {
    const piv = new THREE.Group();
    piv.position.set(swX + ox, 2.92, swZ);
    [-0.28, 0.28].forEach((cxOff) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.15, 6), darkIronMat);
      chain.position.set(cxOff, -1.08, 0);
      piv.add(chain);
    });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.07, 0.26), flowerYellowMat);
    seat.position.set(0, -2.18, 0);
    piv.add(seat);
    dynamicGroup.add(piv);
    swingPivots.push(piv);
  });

  // Slowly Spinning Merry-Go-Round Roundabout (X = -102.0, Z = -48.0)
  const mgrGroup = new THREE.Group();
  mgrGroup.position.set(-102.0, 0.14, -48.0);
  const mgrDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.14, 20), vermilionMat);
  mgrGroup.add(mgrDisc);
  const mgrHub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.95, 12), flowerYellowMat);
  mgrHub.position.y = 0.5;
  mgrGroup.add(mgrHub);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 6, 14, Math.PI), flowerWhiteMat);
    bar.position.set(Math.cos(a) * 1.15, 0.45, Math.sin(a) * 1.15);
    bar.rotation.y = a;
    mgrGroup.add(bar);
  }
  dynamicGroup.add(mgrGroup);

  // =========================================================================
  // 7. SOUTH-CENTER-EAST ZONE: OUTDOOR FITNESS & CALISTHENICS COURT (X = -145.0..-133.5, Z = -45.5..-36.5)
  //    (Cleanly East of Stone Avenue X=-145.4 and elevated to Y=0.056 -> ZERO z-fighting!)
  // =========================================================================
  // Crisp White Rubber Perimeter Trim + Slate-Blue Athletic Mat
  addBox(-145.15, -133.35, 0.015, 0.050, -45.65, -36.35, limestoneMat);
  addBox(-145.0, -133.5, 0.020, 0.058, -45.5, -36.5, fitnessMat);

  // Pull-Up & Monkey Bar Rig (anchored with dark-iron floor flange plates!)
  [-143.6, -141.0, -138.4, -135.8].forEach((fx) => {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 10), darkIronMat);
    flange.position.set(fx, 0.075, -40.2);
    staticGroup.add(flange);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 2.6, 8), flowerYellowMat);
    post.position.set(fx, 1.36, -40.2);
    staticGroup.add(post);
  });
  const pullBarHigh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 8.0, 8), darkIronMat);
  pullBarHigh.rotation.z = Math.PI / 2;
  pullBarHigh.position.set(-139.7, 2.58, -40.2);
  staticGroup.add(pullBarHigh);
  const pullBarMid = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 2.6, 8), darkIronMat);
  pullBarMid.rotation.z = Math.PI / 2;
  pullBarMid.position.set(-137.1, 2.08, -40.2);
  staticGroup.add(pullBarMid);

  // Grounded Parallel Dip Bars (horizontal grip rails + 4 sturdy vertical support legs + flange plates + joint elbows!)
  [-43.9, -43.1].forEach((fz) => {
    const dipBar = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 3.0, 10), playTurfBlueMat);
    dipBar.rotation.z = Math.PI / 2;
    dipBar.position.set(-141.2, 1.25, fz);
    staticGroup.add(dipBar);

    [-142.65, -139.75].forEach((legX) => {
      const dipFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.045, 10), darkIronMat);
      dipFlange.position.set(legX, 0.075, fz);
      staticGroup.add(dipFlange);
      const dipLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 1.19, 10), playTurfBlueMat);
      dipLeg.position.set(legX, 0.655, fz);
      staticGroup.add(dipLeg);
      const dipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), darkIronMat);
      dipJoint.position.set(legX, 1.25, fz);
      staticGroup.add(dipJoint);
    });
  });

  // Grounded Outdoor Incline Abs / Sit-Up Workout Bench (X = -136.8, Z = -43.5)
  [-137.55, -136.05].forEach((bx, idx) => {
    const legH = idx === 0 ? 0.56 : 0.34;
    const bFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 8), darkIronMat);
    bFlange.position.set(bx, 0.075, -43.5);
    staticGroup.add(bFlange);
    const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, legH, 0.42), darkIronMat);
    bLeg.position.set(bx, 0.06 + legH * 0.5, -43.5);
    staticGroup.add(bLeg);
  });
  const absPad = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.09, 0.48), playTurfBlueMat);
  absPad.position.set(-136.8, 0.52, -43.5);
  absPad.rotation.z = 0.14;
  staticGroup.add(absPad);
  const absRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.52, 8), flowerYellowMat);
  absRoller.rotation.x = Math.PI / 2;
  absRoller.position.set(-137.52, 0.72, -43.5);
  staticGroup.add(absRoller);

  // =========================================================================
  // 8. COMPOSITE MULTI-PART TREES, FLOWER BEDS, PARK BENCHES & VICTORIAN LAMPS
  // =========================================================================
  const addCompositeTree = (
    x: number,
    z: number,
    kind: 'oak' | 'sakura' | 'cassia' | 'willow',
    scale: number
  ) => {
    const g = new THREE.Group();
    g.position.set(x, 0.02, z);
    const trunkH = (kind === 'willow' ? 3.2 : 2.9) * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.3 * scale, trunkH, 9),
      barkMat
    );
    trunk.position.y = trunkH * 0.5;
    g.add(trunk);

    const fMat =
      kind === 'sakura'
        ? sakuraMats[Math.abs(Math.round(x + z)) % sakuraMats.length]
        : kind === 'cassia'
          ? goldenCassiaMat
          : canopyMats[Math.abs(Math.round(x * 3 + z)) % canopyMats.length];

    const puffs: Array<[number, number, number, number]> = [
      [0, trunkH + 1.15 * scale, 0, 1.95 * scale],
      [-0.95 * scale, trunkH + 0.55 * scale, 0.55 * scale, 1.38 * scale],
      [0.95 * scale, trunkH + 0.6 * scale, -0.48 * scale, 1.42 * scale],
      [0.25 * scale, trunkH + 1.85 * scale, 0.25 * scale, 1.28 * scale],
    ];
    puffs.forEach(([px, py, pz, r]) => {
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), fMat);
      crown.position.set(px, py, pz);
      g.add(crown);
    });
    staticGroup.add(g);
  };

  // Sakura Cherry Blossom & Golden Cassia Grove (East Zone beside Starbucks!)
  const sakuraTrees: Array<[number, number, 'sakura' | 'cassia', number]> = [
    [-131, -93, 'sakura', 1.15],
    [-124, -95, 'sakura', 1.05],
    [-116, -93, 'cassia', 1.1],
    [-108, -94, 'sakura', 1.2],
    [-92, -93, 'sakura', 1.05],
    [-129, -81, 'sakura', 1.12],
    [-123, -72, 'cassia', 1.08],
    [-104, -77, 'sakura', 1.15],
    [-92, -79, 'sakura', 1.1],
    [-129, -61, 'sakura', 1.02],
    [-92, -62, 'cassia', 1.12],
    [-92, -45, 'sakura', 1.08],
  ];
  sakuraTrees.forEach(([tx, tz, k, sc]) => addCompositeTree(tx, tz, k, sc));

  // Lakeside Weeping Willows & Lush Perimeter Shade Oaks
  const shadeTrees: Array<[number, number, 'oak' | 'willow', number]> = [
    [-205, -94, 'oak', 1.25],
    [-192, -94, 'willow', 1.15],
    [-176, -94, 'willow', 1.1],
    [-164, -93, 'oak', 1.22],
    [-136, -93, 'oak', 1.22],
    [-206, -78, 'willow', 1.18],
    [-206, -54, 'willow', 1.2],
    [-205, -37, 'oak', 1.28],
    [-190, -36, 'oak', 1.25],
    [-174, -37, 'oak', 1.2],
    [-163, -52, 'oak', 1.12],
    [-137, -52, 'oak', 1.12],
    [-122, -34, 'oak', 1.18],
    [-104, -34, 'oak', 1.2],
    [-91, -34, 'oak', 1.15],
  ];
  shadeTrees.forEach(([tx, tz, k, sc]) => addCompositeTree(tx, tz, k, sc));

  // Geometric Vibrant Flower Beds (Roses, Marigolds, Lavender) around Central Plaza & Entrances
  const addFlowerBed = (bx: number, bz: number, rx: number, rz: number, flowerMat: THREE.Material) => {
    const border = new THREE.Mesh(new THREE.CylinderGeometry(rx, rx + 0.12, 0.24, 18), limestoneMat);
    border.scale.set(1, 1, rz / rx);
    border.position.set(bx, 0.12, bz);
    staticGroup.add(border);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(rx - 0.16, rx - 0.16, 0.26, 18), hedgeMat);
    soil.scale.set(1, 1, rz / rx);
    soil.position.set(bx, 0.14, bz);
    staticGroup.add(soil);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), flowerMat);
      fl.position.set(bx + Math.cos(a) * (rx * 0.58), 0.34, bz + Math.sin(a) * (rz * 0.58));
      staticGroup.add(fl);
    }
  };
  addFlowerBed(cx - 12.2, cz - 12.2, 2.2, 2.2, flowerRedMat);
  addFlowerBed(cx + 12.2, cz - 12.2, 2.2, 2.2, flowerYellowMat);
  addFlowerBed(cx - 12.2, cz + 12.2, 2.2, 2.2, flowerPurpleMat);
  addFlowerBed(cx + 12.2, cz + 12.2, 2.2, 2.2, sakuraMats[0]);
  addFlowerBed(-159.5, -96.0, 1.8, 1.8, flowerRedMat);
  addFlowerBed(-140.5, -96.0, 1.8, 1.8, flowerYellowMat);
  addFlowerBed(-165.0, -76.0, 2.0, 2.0, flowerPurpleMat);
  addFlowerBed(-134.0, -76.0, 2.0, 2.0, flowerRedMat);

  // Classic Teak & Cast-Iron Park Benches (facing fountain plaza, lake & playground!)
  const addParkBench = (bx: number, bz: number, yaw: number) => {
    const b = new THREE.Group();
    b.position.set(bx, 0.04, bz);
    b.rotation.y = yaw;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.56), teakWoodMat);
    seat.position.y = 0.48;
    b.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.44, 0.07), teakWoodMat);
    back.position.set(0, 0.78, -0.25);
    back.rotation.x = -0.15;
    b.add(back);
    [-0.9, 0.9].forEach((ox) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.52), darkIronMat);
      leg.position.set(ox, 0.25, 0);
      b.add(leg);
    });
    staticGroup.add(b);
  };

  // 8 Benches radially facing the Central Grand Musical Fountain
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const bx = cx + Math.cos(a) * 13.4;
    const bz = cz + Math.sin(a) * 13.4;
    addParkBench(bx, bz, Math.atan2(cx - bx, cz - bz));
  }
  // Additional Benches along Lakefront, Sakura Lawn & Playground
  addParkBench(-171.5, -75.0, -Math.PI * 0.5);
  addParkBench(-171.5, -59.0, -Math.PI * 0.5);
  addParkBench(-120.0, -61.5, 0);
  addParkBench(-108.0, -61.5, 0);
  addParkBench(-101.0, -84.0, -Math.PI * 0.5);
  addParkBench(-142.0, -86.0, -Math.PI * 0.5);

  // Classic Victorian Cast-Iron Globe Streetlamps throughout the Park (24 lamps!)
  const poolTex = createRadialGlowPoolTexture('255, 214, 140');
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(poolMat);

  const addVictorianLamp = (lx: number, lz: number, withPool: boolean) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 3.8, 10), darkIronMat);
    post.position.set(lx, 1.92, lz);
    staticGroup.add(post);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.22, 10), brassMat);
    collar.position.set(lx, 3.75, lz);
    staticGroup.add(collar);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), warmGlobeMat);
    globe.position.set(lx, 4.05, lz);
    staticGroup.add(globe);
    if (withPool) {
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(lx, 0.075, lz);
      staticGroup.add(pool);
    }
  };

  const lampSpots: Array<[number, number, boolean]> = [
    // Around Central Fountain Plaza
    [cx - 10.5, cz - 10.5, true],
    [cx + 10.5, cz - 10.5, true],
    [cx - 10.5, cz + 10.5, true],
    [cx + 10.5, cz + 10.5, true],
    // Along East-West & North-South Promenades
    [-168, cz - 4.2, true],
    [-132, cz - 4.2, true],
    [-116, cz - 4.2, false],
    [-98, cz - 4.2, true],
    [-200, cz - 4.2, true],
    [-156, -80, false],
    [-144, -80, false],
    [-156, -50, true],
    [-144, -50, false],
    // Outer Jogging Track Corners & Playground / Sakura
    [-204, -95, false],
    [-204, -39, false],
    [-95, -95, true],
    [-95, -39, true],
    [-125, -40, false],
    [-108, -86, false],
    [-174, -44, false],
  ];
  lampSpots.forEach(([lx, lz, wp]) => addVictorianLamp(lx, lz, wp));

  // Balanced Night Point Lights (6 strategic warm/cyan anchors across the 124m mega-park)
  const addParkLight = (
    x: number,
    y: number,
    z: number,
    color: number,
    distance: number,
    dayInt: number,
    nightInt: number
  ) => {
    const light = new THREE.PointLight(color, dayInt, distance, 1.5);
    light.position.set(x, y, z);
    scaledLights.push({ light, dayInt, nightInt, getScale: () => 1.0 });
  };
  addParkLight(cx, 5.5, cz, 0x9be7ff, 34, 0.25, 3.2); // Central Musical Fountain Glow
  addParkLight(cx, 5.2, -96.0, 0xffd796, 30, 0.2, 2.6); // Main Entrance Archway & Rose Pergola
  addParkLight(lakeCx, 4.8, -67.0, 0xffd28e, 34, 0.2, 2.8); // Koi Lake Bridge & Pagoda Glow
  addParkLight(bandX, 5.0, bandZ, 0xffd9a0, 32, 0.2, 2.8); // East Sakura Grove & Bandstand
  addParkLight(-114.0, 5.0, -48.0, 0xffe4b5, 30, 0.2, 2.4); // Children's Playground
  addParkLight(-150.0, 4.8, -41.0, 0xffe0a8, 28, 0.2, 2.2); // South Fitness Court

  // --- DYNAMIC ANIMATION LOOP (Zero GC!) ---
  let elapsed = 0;
  const update = (delta: number, lampFactor: number) => {
    const dt = Math.min(delta, 0.12);
    elapsed += dt;

    // 1. Musical Fountain Plume & Arcing Jets Pulse
    const pulse = 1.0 + Math.sin(elapsed * 2.8) * 0.14;
    centerPlume.scale.set(1.0, pulse, 1.0);
    plumeCap.position.y = 7.45 + Math.sin(elapsed * 2.8) * 0.42;
    plumeCap.scale.setScalar(0.95 + Math.sin(elapsed * 5.2) * 0.1);
    for (let i = 0; i < arcingJets.length; i++) {
      const jp = 0.92 + Math.sin(elapsed * 3.4 + i * 0.55) * 0.12;
      arcingJets[i].scale.set(1, jp, 1);
    }
    fountainLedMat.emissiveIntensity = THREE.MathUtils.lerp(0.35, 1.35, lampFactor);

    // 2. Swimming Koi Fish (visibly gliding above lakeBed Y=0.083 inside translucent water Y=0.145!)
    for (let i = 0; i < koiActors.length; i++) {
      const k = koiActors[i];
      const a = elapsed * k.speed + k.phase;
      const nx = k.centerX + Math.cos(a) * k.rx;
      const nz = k.centerZ + Math.sin(a * 1.5) * k.rz * 0.7;
      const vx = -Math.sin(a) * k.rx * k.speed;
      const vz = Math.cos(a * 1.5) * k.rz * 0.7 * 1.5 * k.speed;
      k.mesh.position.set(nx, 0.105, nz);
      k.mesh.rotation.y = Math.atan2(vx, vz);
    }

    // 3. Drifting White Swans (gliding right on top of the lake surface Y=0.145!)
    for (let i = 0; i < swanActors.length; i++) {
      const sw = swanActors[i];
      const a = elapsed * sw.speed + sw.phase;
      const nx = lakeCx + Math.cos(a) * sw.rx;
      const nz = sw.cz + Math.sin(a) * sw.rz;
      const vx = -Math.sin(a) * sw.rx * sw.speed;
      const vz = Math.cos(a) * sw.rz * sw.speed;
      sw.mesh.position.set(nx, 0.145 + Math.sin(elapsed * 2.0 + i) * 0.015, nz);
      sw.mesh.rotation.y = Math.atan2(vx, vz);
    }

    // 4. Gently Swaying Playground Swings & Spinning Merry-Go-Round
    for (let i = 0; i < swingPivots.length; i++) {
      swingPivots[i].rotation.x = Math.sin(elapsed * 2.1 + i * 1.4) * 0.34;
    }
    mgrGroup.rotation.y += dt * 0.65;
  };

  return {
    staticGroup,
    dynamicGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    update,
  };
}

// =========================================================================
// PARK NPC CONTROLLER (24 Lively GLB Citizens: Joggers, Walkers, Bridge Sightseers & Bench Guests)
// =========================================================================
interface GrandParkWalker {
  group: THREE.Group;
  glb: GlbHumanHandle;
  waypoints: Array<{ x: number; z: number }>;
  wpIdx: number;
  speed: number;
  pauseTimer: number;
}

interface GrandParkSeated {
  group: THREE.Group;
  glb: GlbHumanHandle;
  baseYaw: number;
  phase: number;
}

export class BachDangGrandParkNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly walkers: GrandParkWalker[] = [];
  private readonly seated: GrandParkSeated[] = [];
  private elapsed = 0;

  constructor(_helpers: HospitalCharacterHelpers) {
    this.rootGroup.name = 'BachDangGrandParkNpcs';

    const spawnSeated = (x: number, z: number, yaw: number, seed: number) => {
      const grp = new THREE.Group();
      grp.position.set(x, 0.04, z);
      grp.rotation.y = yaw;
      const spec = seed % 2 === 0 ? pickSeatedCivilianModel(seed) : pickStationaryCivilianModel(seed);
      const glb = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: grp,
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Sit',
        phaseOffset: (seed % 19) * 0.31,
        allowRainUmbrella: true,
      });
      this.rootGroup.add(grp);
      this.seated.push({ group: grp, glb, baseYaw: yaw, phase: seed * 0.9 });
    };

    const cx = BACH_DANG_PARK_CENTER_X;
    const cz = BACH_DANG_PARK_CENTER_Z;

    // 10 Seated Park Visitors — EXACTLY aligned onto the 8 Central Fountain benches (i/8) & Park Benches!
    const fountainBenchSlots = [0, 1, 2, 4, 5, 6];
    fountainBenchSlots.forEach((slotIdx, i) => {
      const a = (slotIdx / 8) * Math.PI * 2 + Math.PI / 8;
      const bx = cx + Math.cos(a) * 13.38;
      const bz = cz + Math.sin(a) * 13.38;
      spawnSeated(bx, bz, Math.atan2(cx - bx, cz - bz), 7101 + i);
    });
    spawnSeated(-171.52, -75.0, -Math.PI * 0.5, 7110);
    spawnSeated(-120.0, -61.48, 0, 7111);
    spawnSeated(-108.0, -61.48, 0, 7112);
    spawnSeated(-101.02, -84.0, -Math.PI * 0.5, 7113);

    // 14 Walking & Jogging Citizens across the Entire Mega-Park!
    const walkerRoutes: Array<{ speed: number; seed: number; pts: Array<{ x: number; z: number }> }> = [
      // 4 Outer Jogging Track Runners/Joggers
      {
        speed: 2.35,
        seed: 7201,
        pts: [
          { x: -206.3, z: -98.8 },
          { x: -93.7, z: -98.8 },
          { x: -93.7, z: -35.2 },
          { x: -206.3, z: -35.2 },
        ],
      },
      {
        speed: 2.15,
        seed: 7202,
        pts: [
          { x: -93.7, z: -35.2 },
          { x: -206.3, z: -35.2 },
          { x: -206.3, z: -98.8 },
          { x: -93.7, z: -98.8 },
        ],
      },
      {
        speed: 1.55,
        seed: 7203,
        pts: [
          { x: -150.0, z: -98.8 },
          { x: -93.7, z: -98.8 },
          { x: -93.7, z: -67.0 },
          { x: -135.0, z: -67.0 },
          { x: -150.0, z: -83.0 },
        ],
      },
      {
        speed: 2.25,
        seed: 7204,
        pts: [
          { x: -206.3, z: -67.0 },
          { x: -206.3, z: -35.2 },
          { x: -150.0, z: -35.2 },
          { x: -150.0, z: -50.0 },
          { x: -167.0, z: -67.0 },
        ],
      },
      // 3 Bridge Sightseers walking RIGHT OVER the Arched Red Koi Lake Bridge!
      {
        speed: 1.28,
        seed: 7205,
        pts: [
          { x: -201.0, z: -67.0 },
          { x: -186.0, z: -67.0 },
          { x: -169.0, z: -67.0 },
          { x: -161.0, z: -76.0 },
          { x: -169.0, z: -67.0 },
          { x: -186.0, z: -67.0 },
        ],
      },
      {
        speed: 1.22,
        seed: 7206,
        pts: [
          { x: -169.0, z: -66.0 },
          { x: -186.0, z: -66.0 },
          { x: -201.0, z: -66.0 },
          { x: -200.0, z: -99.5 },
          { x: -200.0, z: -68.0 },
          { x: -186.0, z: -68.0 },
        ],
      },
      {
        speed: 1.32,
        seed: 7207,
        pts: [
          { x: -199.0, z: -68.0 },
          { x: -172.0, z: -68.0 },
          { x: -162.0, z: -67.0 },
          { x: -150.0, z: -56.0 },
          { x: -162.0, z: -67.0 },
        ],
      },
      // 4 Central Musical Fountain & Main Archway Strollers
      {
        speed: 1.35,
        seed: 7208,
        pts: [
          { x: -150.0, z: -102.5 },
          { x: -150.0, z: -80.5 },
          { x: -139.0, z: -67.0 },
          { x: -150.0, z: -54.5 },
          { x: -161.0, z: -67.0 },
          { x: -150.0, z: -80.5 },
        ],
      },
      {
        speed: 1.28,
        seed: 7209,
        pts: [
          { x: -161.0, z: -67.0 },
          { x: -150.0, z: -54.5 },
          { x: -139.0, z: -67.0 },
          { x: -150.0, z: -79.5 },
        ],
      },
      {
        speed: 1.4,
        seed: 7210,
        pts: [
          { x: -147.5, z: -102.5 },
          { x: -147.5, z: -83.0 },
          { x: -131.0, z: -67.0 },
          { x: -98.0, z: -67.0 },
          { x: -98.0, z: -102.5 },
          { x: -98.0, z: -67.0 },
          { x: -134.0, z: -67.0 },
        ],
      },
      {
        speed: 1.3,
        seed: 7211,
        pts: [
          { x: -152.5, z: -80.0 },
          { x: -165.0, z: -67.0 },
          { x: -150.0, z: -50.0 },
          { x: -135.0, z: -67.0 },
        ],
      },
      // 3 East Sakura Garden, Bandstand & Playground Visitors (connecting from Starbucks Gate!)
      {
        speed: 1.32,
        seed: 7212,
        pts: [
          { x: -98.0, z: -102.0 },
          { x: -98.0, z: -84.0 },
          { x: -118.0, z: -85.0 },
          { x: -124.0, z: -67.0 },
          { x: -98.0, z: -67.0 },
        ],
      },
      {
        speed: 1.25,
        seed: 7213,
        pts: [
          { x: -126.0, z: -58.5 },
          { x: -102.0, z: -58.5 },
          { x: -96.5, z: -46.0 },
          { x: -126.0, z: -38.0 },
          { x: -133.5, z: -48.0 },
        ],
      },
      {
        speed: 1.38,
        seed: 7214,
        pts: [
          { x: -152.5, z: -51.0 },
          { x: -152.5, z: -34.0 },
          { x: -152.5, z: -28.0 },
          { x: -152.5, z: -18.5 },
          { x: -152.5, z: -28.0 },
          { x: -152.5, z: -35.5 },
          { x: -162.5, z: -35.5 },
          { x: -162.5, z: -48.0 },
        ],
      },
      // Cross-Park Connecting Walkway Stroller (linking Công Viên Tây <-> Công Viên Trung Tâm Bạch Đằng!)
      {
        speed: 1.32,
        seed: 7215,
        pts: [
          { x: -151.0, z: -16.0 },
          { x: -151.0, z: -28.0 },
          { x: -151.0, z: -51.5 },
          { x: -139.0, z: -67.0 },
          { x: -151.0, z: -51.5 },
          { x: -151.0, z: -28.0 },
        ],
      },
    ];

    walkerRoutes.forEach((r) => {
      const grp = new THREE.Group();
      const p0 = r.pts[0];
      grp.position.set(p0.x, getBachDangParkGroundY(p0.x, p0.z), p0.z);
      const spec = r.seed % 3 === 0 ? pickShopCustomerModel(r.seed) : pickOutsideNpcModel(r.seed);
      const glb = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: grp,
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Walk',
        phaseOffset: (r.seed % 17) * 0.35,
        allowRainUmbrella: true,
      });
      this.rootGroup.add(grp);
      this.walkers.push({
        group: grp,
        glb,
        waypoints: r.pts,
        wpIdx: 1 % r.pts.length,
        speed: r.speed,
        pauseTimer: 0,
      });
    });
  }

  public update(delta: number): void {
    const dt = Math.min(delta, 0.12);
    this.elapsed += dt;

    for (let i = 0; i < this.seated.length; i++) {
      const s = this.seated[i];
      s.group.rotation.y = s.baseYaw + Math.sin(this.elapsed * 0.75 + s.phase) * 0.08;
      s.glb.setAnimState('Sit');
    }

    for (let i = 0; i < this.walkers.length; i++) {
      const w = this.walkers[i];
      if (w.pauseTimer > 0) {
        w.pauseTimer -= dt;
        w.glb.setAnimState('Idle');
        continue;
      }

      const target = w.waypoints[w.wpIdx];
      const dx = target.x - w.group.position.x;
      const dz = target.z - w.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.32) {
        w.wpIdx = (w.wpIdx + 1) % w.waypoints.length;
        // Joggers don't pause; casual strollers pause briefly to admire views
        w.pauseTimer = w.speed > 1.9 ? 0 : 0.9 + ((i * 5 + w.wpIdx) % 3) * 0.7;
        if (w.pauseTimer > 0) w.glb.setAnimState('Idle');
      } else {
        const step = Math.min(dist, w.speed * dt);
        const nx = w.group.position.x + (dx / dist) * step;
        const nz = w.group.position.z + (dz / dist) * step;
        w.group.position.set(nx, getBachDangParkGroundY(nx, nz), nz);
        steerYawSmooth(w.group, Math.atan2(dx, dz), dt, 7.0);
        w.glb.setAnimState('Walk');
      }
    }
  }
}
