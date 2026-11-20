import * as THREE from 'three';
import type { HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox, IntersectionSignalState } from './WestIntersectionSystem';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  compactDynamicVehicleMeshes,
  type CityCarVariant,
} from './CityVehicleMeshBuilder';
import { getAsphaltTextures, getSidewalkPaverTextures } from './VisualPolishSystem';
import {
  WEST_COASTAL_RESIDENTIAL_OPENINGS,
  isInWestCoastalResidentialOpening,
} from './westResidentialLayout';
import {
  WEST_COAST_EAST_EDGE_X,
  WEST_COAST_ROAD_MAX_X,
  WEST_COAST_ROAD_MIN_X,
  WEST_COAST_ROAD_CX,
  WEST_COAST_PROMENADE_MIN_X,
  WEST_COAST_SAND_MIN_X,
  WEST_COAST_SHORELINE_X,
  WEST_COAST_WATER_Y,
  WEST_COAST_PLAYER_MIN_X,
  WEST_COAST_BIKE_MIN_X,
  WEST_COAST_ROAD_MIN_Z,
  WEST_COAST_ROAD_MAX_Z,
  WEST_COAST_T_JUNCTION_Z,
  WEST_COASTAL_MAP_AREAS,
  WEST_COASTAL_BUILDINGS,
  WEST_COASTAL_POIS,
  buildWestCoastalRoadSegments,
} from './westCoastalLayout';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
  WORKER_GUARD_NPC_MODEL,
} from './NpcModelCatalog';

export {
  WEST_COAST_EAST_EDGE_X,
  WEST_COAST_ROAD_MAX_X,
  WEST_COAST_ROAD_MIN_X,
  WEST_COAST_ROAD_CX,
  WEST_COAST_PROMENADE_MIN_X,
  WEST_COAST_SAND_MIN_X,
  WEST_COAST_SHORELINE_X,
  WEST_COAST_WATER_Y,
  WEST_COAST_PLAYER_MIN_X,
  WEST_COAST_BIKE_MIN_X,
  WEST_COAST_ROAD_MIN_Z,
  WEST_COAST_ROAD_MAX_Z,
  WEST_COAST_T_JUNCTION_Z,
  WEST_COASTAL_MAP_AREAS,
  WEST_COASTAL_BUILDINGS,
  WEST_COASTAL_POIS,
  buildWestCoastalRoadSegments,
};

export const COASTAL_LUXURY_LAMP_HEIGHT = 7.6;
export const COASTAL_GLB_NPC_ROLES = [
  'promenade_walker',
  'riverfront_walker',
  'lifeguard',
  'beach_bar_staff',
  'beach_bar_guest',
  'jetski_attendant',
  'shower_attendant',
] as const;

/**
 * Smooth ground elevation for the West Coastal Boulevard, Promenade, Golden Sandy Beach & Shallow Surf:
 * - Coastal Boulevard & T-Junction asphalt: Y = -0.26 (flush with Đại Lộ Trung Tâm)
 * - Sloped tie-in ramps to ALL 9 residential inner streets (Bắc 1/2/3, Nam 1..6, X = -965..-960): smoothly bridges -0.26 <-> +0.035
 * - Oceanfront Promenade & East Sidewalk: Y = 0.0
 * - Sloped Golden Sand Beach (X = -1036..-996): gently slopes from -0.04 down to -0.94
 * - Shallow Swimming Surf (X = -1046..-1036): gently dips from -0.94 down to -1.16 (chest-deep wading)
 */
export function getWestCoastalGroundY(x: number, z: number): number | null {
  if (x > -960.0) return null;
  // Tie-in sloped ramps between ALL 9 residential inner streets (+0.035 at X=-960) and Coastal Boulevard (-0.26 at X=-965)
  if (x > -965.0 && x <= -960.0 && isInWestCoastalResidentialOpening(z, 0.2)) {
    const t = (x - -965.0) / 5.0;
    return -0.26 + t * 0.295;
  }
  // Main T-Junctions (Đại Lộ Trung Tâm Z=20.8..37.2 & Đường Ven Sông Bạch Đằng Tây Z=-153.4..-137.0) + 4-Lane Coastal Boulevard asphalt
  if (
    (x >= WEST_COAST_ROAD_MIN_X && x <= WEST_COAST_ROAD_MAX_X && z >= WEST_COAST_ROAD_MIN_Z && z <= WEST_COAST_ROAD_MAX_Z) ||
    (x > WEST_COAST_ROAD_MAX_X && x <= -960.0 && ((z >= 20.8 && z <= 37.2) || (z >= -153.4 && z <= -137.0)))
  ) {
    return -0.26;
  }
  // East sidewalk & West Oceanfront Promenade
  if (x >= WEST_COAST_PROMENADE_MIN_X && x <= -960.0) {
    return 0.0;
  }
  // Sloped golden sand beach (X = -1036 .. -996)
  if (x >= -1036.0 && x < WEST_COAST_PROMENADE_MIN_X) {
    const t = (WEST_COAST_PROMENADE_MIN_X - x) / 40.0; // 0 at promenade edge -> 1 at waterline
    return -0.04 - t * 0.90;
  }
  // Shallow turquoise surf wading zone (X = -1050 .. -1036)
  if (x < -1036.0) {
    const t = Math.min(1, (-1036.0 - x) / 14.0);
    return -0.94 - t * 0.26;
  }
  return 0.0;
}

export type BeachNpcGender = 'male' | 'female';
export type BeachNpcSwimwear = 'swim_trunks' | 'bikini';

export interface BeachSwimmerProfile {
  x: number;
  z: number;
  mode: 'swim' | 'float_ring' | 'wade';
  yaw: number;
  gender: BeachNpcGender;
  swimwear: BeachNpcSwimwear;
}

/**
 * 3D Beach Swimmers & Waders along Bãi Biển Mỹ Khê Tây:
 * - Male NPCs wear swim trunks ("quần đùi") with bare chest
 * - Female NPCs wear two-piece bikinis ("bikini")
 */
export const BEACH_SWIMMER_PROFILES: readonly BeachSwimmerProfile[] = [
  { x: -1036.0, z: -72, mode: 'wade', yaw: -Math.PI / 2, gender: 'male', swimwear: 'swim_trunks' },
  { x: -1042.5, z: -55, mode: 'float_ring', yaw: 0.6, gender: 'female', swimwear: 'bikini' },
  { x: -1045.0, z: -32, mode: 'swim', yaw: 0.1, gender: 'male', swimwear: 'swim_trunks' },
  { x: -1038.5, z: -12, mode: 'wade', yaw: -Math.PI / 2 + 0.3, gender: 'female', swimwear: 'bikini' },
  { x: -1044.0, z: 6, mode: 'float_ring', yaw: 1.2, gender: 'male', swimwear: 'swim_trunks' },
  { x: -1039.0, z: 22, mode: 'wade', yaw: -Math.PI / 2, gender: 'female', swimwear: 'bikini' },
  { x: -1046.5, z: 28, mode: 'swim', yaw: Math.PI, gender: 'male', swimwear: 'swim_trunks' },
  { x: -1041.5, z: 36, mode: 'float_ring', yaw: -0.4, gender: 'female', swimwear: 'bikini' },
  { x: -1037.0, z: 48, mode: 'wade', yaw: -Math.PI / 2 - 0.2, gender: 'male', swimwear: 'swim_trunks' },
  { x: -1045.5, z: 62, mode: 'swim', yaw: 0.0, gender: 'female', swimwear: 'bikini' },
  { x: -1042.0, z: 75, mode: 'float_ring', yaw: 2.0, gender: 'male', swimwear: 'swim_trunks' },
  { x: -1038.0, z: 88, mode: 'wade', yaw: -Math.PI / 2, gender: 'female', swimwear: 'bikini' },
  { x: -1045.0, z: 112, mode: 'float_ring', yaw: 0.9, gender: 'female', swimwear: 'bikini' },
  { x: -1043.0, z: 128, mode: 'swim', yaw: Math.PI, gender: 'male', swimwear: 'swim_trunks' },
  { x: -1037.5, z: 145, mode: 'wade', yaw: -Math.PI / 2 + 0.15, gender: 'female', swimwear: 'bikini' },
  { x: -1044.5, z: 162, mode: 'float_ring', yaw: -1.1, gender: 'male', swimwear: 'swim_trunks' },
];

/**
 * Beach swimmers, sunbathers, and sand volleyball players clear out whenever it rains.
 */
export function shouldShowBeachBathers(isRaining: boolean): boolean {
  return !isRaining;
}

/**
 * Multi-directional ocean swell & alongshore current ("sóng đánh lên đánh xuống dạng hải lưu")
 * height sampler shared by the 3D subdivided ocean surface, swimmers, safety buoys, and boats.
 */
export function sampleOceanWaveY(x: number, z: number, t: number): number {
  const offshoreDist = Math.max(0, -1026.5 - x);
  const ampScale = THREE.MathUtils.clamp(offshoreDist / 22.0, 0.14, 1.0);
  // 1. Primary onshore rolling ocean swell traveling East (+X) toward the golden beach
  const p1 = x * 0.165 - t * 2.25 + z * 0.028;
  const swell1 = Math.sin(p1) * 0.28;
  // 2. Long diagonal oceanic current ("hải lưu") sweeping obliquely along the coastline
  const p2 = x * 0.072 + z * 0.068 - t * 1.38;
  const current2 = Math.sin(p2) * 0.22;
  // 3. Secondary cross-chop & sharpened swell crest lift
  const chop3 = Math.cos(x * 0.31 - z * 0.115 - t * 2.95) * 0.095;
  const crestLift = Math.pow(Math.max(0, Math.sin(p1)), 2) * 0.11;
  return WEST_COAST_WATER_Y + (swell1 + current2 + chop3 + crestLift) * ampScale;
}

export const WEST_COASTAL_BEACH_COLLIDERS: IntersectionColliderBox[] = [
  // North & South Coastal Road End Guardrails
  { minX: -996.0, maxX: -960.0, minZ: -166.2, maxZ: -164.6, floor: 1 },
  { minX: -996.0, maxX: -960.0, minZ: 364.6, maxZ: 366.2, floor: 1 },
  // Trạm Tắm Nước Ngọt & Thay Đồ rear cabin block (leaves front outdoor shower deck & walkways open)
  { minX: -994.8, maxX: -987.2, minZ: -7.8, maxZ: 7.8, floor: 1 },
  // Quầy Dừa Tươi & Hải Sản Coconut Beach Bar counter island (walk around all 4 sides)
  { minX: -993.6, maxX: -987.8, minZ: 56.5, maxZ: 68.5, floor: 1 },
  // Trạm Thuê Mô Tô Nước & Kayak rental kiosk booth
  { minX: -994.4, maxX: -988.0, minZ: 95.0, maxZ: 105.0, floor: 1 },
  // Elevated Lifeguard Towers footprints (2 towers at Z = -26 & Z = 62)
  { minX: -1007.8, maxX: -1004.2, minZ: -27.8, maxZ: -24.2, floor: 1 },
  { minX: -1007.8, maxX: -1004.2, minZ: 60.2, maxZ: 63.8, floor: 1 },
  // Welcome Wave Gate pillars flanking the main beach staircase (leaves 10m wide center staircase open at Z=24..34!)
  { minX: -996.8, maxX: -994.8, minZ: 21.8, maxZ: 23.8, floor: 1 },
  { minX: -996.8, maxX: -994.8, minZ: 34.2, maxZ: 36.2, floor: 1 },
];

export interface WestCoastalBeachBuildResult {
  staticGroup: THREE.Group;
  oceanGroup: THREE.Group;
  dynamicGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  getSignalState: () => IntersectionSignalState;
  update: (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerX?: number,
    playerZ?: number,
    isRaining?: boolean
  ) => void;
}

const coastalSignTexCache = new Map<string, THREE.CanvasTexture>();

function createCoastalSignTex(
  title: string,
  subtitle: string,
  bg = '#0c4a6e',
  bg2 = '#082f49',
  border = '#38bdf8'
): THREE.CanvasTexture {
  const key = `${title}|${subtitle}|${bg}|${bg2}|${border}`;
  const cached = coastalSignTexCache.get(key);
  if (cached) return cached;

  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 128);
    grad.addColorStop(0, bg);
    grad.addColorStop(1, bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, 502, 118);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, subtitle ? 48 : 64, 480);

    if (subtitle) {
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '600 20px "Segoe UI", Arial, sans-serif';
      ctx.fillText(subtitle, 256, 92, 476);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  coastalSignTexCache.set(key, tex);
  return tex;
}

function createOceanWaterTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Bright neutral sunlit-cyan base so vertexColors drive the rich depth gradient & whitecap foam cleanly
    ctx.fillStyle = '#dff6ff';
    ctx.fillRect(0, 0, 512, 512);

    // Soft diagonal ocean-current ("hải lưu") flow bands that tile seamlessly across edges
    for (let i = 0; i < 42; i++) {
      const y = (i * 512) / 42;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.26)' : 'rgba(125, 211, 252, 0.22)';
      ctx.lineWidth = 3 + (i % 4);
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 32) {
        const wy = y + Math.sin((x / 512) * Math.PI * 2 + i * 0.7) * 9;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // Tileable sunlit wave caustic ripples & specular water sparkles
    for (let i = 0; i < 260; i++) {
      const rx = (i * 73) % 512;
      const ry = (i * 137) % 512;
      const rw = 8 + (i % 14);
      const rh = 20 + (i % 34);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.30)' : 'rgba(100, 195, 235, 0.16)';
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw * 0.42, rh * 0.5, 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 22);
  return tex;
}

function createGoldenSandTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Uniform sunlit fine sand grain base (vertexColors control dry -> wet swash -> submerged seabed)
    ctx.fillStyle = '#faf3e4';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 1100; i++) {
      const gx = (i * 53) % 256;
      const gy = (i * 97) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 252, 242, 0.35)' : 'rgba(180, 145, 92, 0.18)';
      ctx.fillRect(gx, gy, 2, 2);
    }
    // Gentle wind-blown sand ripples
    ctx.strokeStyle = 'rgba(205, 175, 122, 0.12)';
    ctx.lineWidth = 2;
    for (let y = 8; y < 256; y += 16) {
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 32) {
        const wy = y + Math.sin((x / 256) * Math.PI * 2 + y * 0.08) * 2.5;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 26);
  return tex;
}

function createSurfFoamTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 256);
    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0.0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.45, 'rgba(240,253,255,0.55)');
    grad.addColorStop(0.75, 'rgba(255,255,255,0.92)');
    grad.addColorStop(0.92, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    for (let y = 0; y < 256; y += 16) {
      const r = 10 + ((y * 7) % 10);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(82 + Math.sin(y * 0.12) * 10, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  return tex;
}

function createSoftGlowPoolTexture(innerRgba: string, midRgba: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0.0, innerRgba);
    grad.addColorStop(0.42, midRgba);
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTerracottaRoofTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(0, 0, 512, 512);

    const cols = 16;
    const rows = 10;
    const colW = 512 / cols;
    const rowH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      for (let col = 0; col < cols; col++) {
        const x = col * colW;
        const shade = ((r * 7 + col * 13) % 5) - 2;
        const grad = ctx.createLinearGradient(x, y, x + colW, y);
        grad.addColorStop(0.0, '#6c240c');
        grad.addColorStop(0.22, `rgb(${198 + shade * 6}, ${82 + shade * 4}, ${36 + shade * 2})`);
        grad.addColorStop(0.52, `rgb(${232 + shade * 5}, ${106 + shade * 4}, ${48 + shade * 2})`);
        grad.addColorStop(0.82, `rgb(${182 + shade * 5}, ${72 + shade * 3}, ${30 + shade * 2})`);
        grad.addColorStop(1.0, '#5a1d09');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, colW, rowH);

        // Scalloped lower clay tile lip & deep cast shadow
        ctx.fillStyle = 'rgba(42, 12, 4, 0.55)';
        ctx.fillRect(x, y + rowH - 6, colW, 6);
        ctx.fillStyle = 'rgba(255, 186, 122, 0.28)';
        ctx.beginPath();
        ctx.arc(x + colW * 0.5, y + rowH - 8, colW * 0.36, 0, Math.PI, true);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createPatioTileTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#5c4938';
    ctx.fillRect(0, 0, 512, 512);
    const grid = 4;
    const cell = 512 / grid;
    const tones = ['#b5946d', '#a6845e', '#c09f77', '#9e7c58', '#ad8c66'];
    for (let gy = 0; gy < grid; gy++) {
      for (let gx = 0; gx < grid; gx++) {
        const x = gx * cell + 3;
        const y = gy * cell + 3;
        const s = cell - 6;
        ctx.fillStyle = tones[(gx * 3 + gy * 5) % tones.length];
        ctx.fillRect(x, y, s, s);
        // Subtle bevel highlight & stone speckles
        ctx.strokeStyle = 'rgba(255, 241, 214, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
        for (let p = 0; p < 28; p++) {
          const px = x + ((p * 37 + gx * 19) % Math.floor(s - 4));
          const py = y + ((p * 53 + gy * 29) % Math.floor(s - 4));
          ctx.fillStyle = p % 2 === 0 ? 'rgba(255, 248, 232, 0.14)' : 'rgba(68, 46, 26, 0.14)';
          ctx.fillRect(px, py, 3, 3);
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 8);
  return tex;
}

function createWarmWoodPlanksTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#6b3714';
    ctx.fillRect(0, 0, 512, 256);
    const planks = 8;
    const ph = 256 / planks;
    const palette = ['#8f4b1d', '#a15824', '#7e4017', '#995120', '#87461b'];
    for (let i = 0; i < planks; i++) {
      const y = i * ph;
      ctx.fillStyle = palette[i % palette.length];
      ctx.fillRect(0, y + 1, 512, ph - 2);
      // Horizontal wood grain lines
      for (let g = 0; g < 12; g++) {
        const gy = y + 3 + ((g * 7 + i * 3) % Math.max(4, Math.floor(ph - 6)));
        ctx.fillStyle = g % 2 === 0 ? 'rgba(255, 198, 128, 0.12)' : 'rgba(48, 22, 8, 0.18)';
        ctx.fillRect(0, gy, 512, 1.5);
      }
      // Plank seam shadow
      ctx.fillStyle = 'rgba(32, 14, 4, 0.65)';
      ctx.fillRect(0, y + ph - 2, 512, 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function createBarChalkboardTexture(side: 'left' | 'right'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#14191f';
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 376);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 224, 352);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(side === 'left' ? 'COCKTAILS' : 'COLD DRINKS', 128, 56);

    ctx.fillStyle = '#5eead4';
    ctx.fillRect(48, 68, 160, 2);

    const items =
      side === 'left'
        ? ['MOJITO  85K', 'MAI TAI  95K', 'PIÑA COLADA 95K', 'DAIQUIRI  90K', 'MARGARITA 95K', 'LONG ISLAND 110K', 'SUNSET RUM 90K']
        : ['DRAFT BEER 45K', 'TIGER ICE  45K', 'SAIGON GOLD 40K', 'FRESH COCO 45K', 'MANGO SHAKE 55K', 'PASSION JUICE 50K', 'BBQ SKEWER 85K'];
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 18px "Segoe UI", Arial, sans-serif';
    items.forEach((line, idx) => {
      ctx.fillText(line, 128, 108 + idx * 36);
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBottleBackbarTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0.0, '#2a160c');
    bg.addColorStop(0.5, '#47220f');
    bg.addColorStop(1.0, '#1e0f07');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);

    const shelfYs = [86, 164, 238];
    const bottleColors = ['#f59e0b', '#10b981', '#ef4444', '#38bdf8', '#fbbf24', '#a855f7', '#e2e8f0'];
    shelfYs.forEach((sy, sIdx) => {
      // Warm amber LED shelf glow behind bottles
      const glow = ctx.createLinearGradient(0, sy - 64, 0, sy);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.05)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0.48)');
      ctx.fillStyle = glow;
      ctx.fillRect(10, sy - 64, 492, 64);

      for (let b = 0; b < 17; b++) {
        const bx = 22 + b * 28;
        const bh = 36 + ((b * 7 + sIdx * 5) % 14);
        ctx.fillStyle = bottleColors[(b + sIdx * 2) % bottleColors.length];
        ctx.fillRect(bx, sy - bh, 14, bh);
        ctx.fillRect(bx + 4, sy - bh - 12, 6, 12);
        // Specular bottle highlight & label
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(bx + 2, sy - bh * 0.62, 10, 10);
      }
      // Timber shelf plank
      ctx.fillStyle = '#3b1d0c';
      ctx.fillRect(0, sy, 512, 8);
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDisplayFridgeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const ctx = c.getContext('2d');
  if (ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, 384);
    bg.addColorStop(0, '#fffdf5');
    bg.addColorStop(1, '#fef3c7');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 384);

    // 3 refrigerated glass shelves with tropical snacks, drinks & chilled coconuts
    [118, 224, 330].forEach((sy, idx) => {
      for (let i = 0; i < 6; i++) {
        const ix = 22 + i * 36;
        ctx.fillStyle = ['#16a34a', '#0284c7', '#f97316', '#eab308', '#ec4899', '#22c55e'][(i + idx) % 6];
        ctx.fillRect(ix, sy - 48, 24, 44);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(ix + 4, sy - 42, 5, 30);
      }
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(10, sy, 236, 7);
    });
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 374);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a clean 4-sided pitched hip roof BufferGeometry (with outward normals & slope-aligned UVs)
 * so terracotta barrel tiles run straight down all 4 slopes cleanly.
 */
function buildHipRoofGeometry(wX: number, wZ: number, ridgeZ: number, height: number, tileScale = 1.6): THREE.BufferGeometry {
  const hx = wX * 0.5;
  const hz = wZ * 0.5;
  const hr = ridgeZ * 0.5;
  const positions: number[] = [];
  const uvs: number[] = [];

  const slopeSide = Math.hypot(hx, height);
  const slopeEnd = Math.hypot(hz - hr, height);

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    ua: [number, number],
    ub: [number, number],
    uc: [number, number]
  ) => {
    positions.push(...a, ...b, ...c);
    uvs.push(...ua, ...ub, ...uc);
  };

  // 1. East (+X) front main slope
  const eBL: [number, number, number] = [hx, 0, hz];
  const eBR: [number, number, number] = [hx, 0, -hz];
  const eTR: [number, number, number] = [0, height, -hr];
  const eTL: [number, number, number] = [0, height, hr];
  pushTri(eBL, eBR, eTR, [0, 0], [wZ / tileScale, 0], [(hz + hr) / tileScale, slopeSide / tileScale]);
  pushTri(eBL, eTR, eTL, [0, 0], [(hz + hr) / tileScale, slopeSide / tileScale], [(hz - hr) / tileScale, slopeSide / tileScale]);

  // 2. West (-X) back main slope
  const wBL: [number, number, number] = [-hx, 0, -hz];
  const wBR: [number, number, number] = [-hx, 0, hz];
  const wTR: [number, number, number] = [0, height, hr];
  const wTL: [number, number, number] = [0, height, -hr];
  pushTri(wBL, wBR, wTR, [0, 0], [wZ / tileScale, 0], [(hz + hr) / tileScale, slopeSide / tileScale]);
  pushTri(wBL, wTR, wTL, [0, 0], [(hz + hr) / tileScale, slopeSide / tileScale], [(hz - hr) / tileScale, slopeSide / tileScale]);

  // 3. South (+Z) left hip triangle
  pushTri(
    [-hx, 0, hz],
    [hx, 0, hz],
    [0, height, hr],
    [0, 0],
    [wX / tileScale, 0],
    [hx / tileScale, slopeEnd / tileScale]
  );

  // 4. North (-Z) right hip triangle
  pushTri(
    [hx, 0, -hz],
    [-hx, 0, -hz],
    [0, height, -hr],
    [0, 0],
    [wX / tileScale, 0],
    [hx / tileScale, slopeEnd / tileScale]
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

interface SignalLens {
  red: THREE.MeshStandardMaterial;
  yellow: THREE.MeshStandardMaterial;
  green: THREE.MeshStandardMaterial;
}

interface SwimmerAgent {
  root: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  baseX: number;
  baseZ: number;
  baseY: number;
  phase: number;
  mode: 'swim' | 'float_ring' | 'wade';
  speed: number;
}

interface BeachWalkerAgent {
  root: THREE.Group;
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  glb?: GlbHumanHandle;
  waypoints: Array<{ x: number; z: number }>;
  segLens: number[];
  totalDist: number;
  distPos: number;
  speed: number;
  phase: number;
  isBeachBather: boolean;
}

interface CoastalGlbStationaryAgent {
  root: THREE.Group;
  glb: GlbHumanHandle;
  x: number;
  z: number;
  hideInRain: boolean;
  animState: 'Idle' | 'Sit' | 'Wave';
}

interface CoastalVehicleAgent {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  wheelR: number;
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  waypoints: Array<{ x: number; z: number }>;
  segLens: number[];
  totalDist: number;
  distPos: number;
  baseSpeed: number;
  currentYaw: number;
  isMoto: boolean;
}

export function createWestCoastalBeachStructure(): WestCoastalBeachBuildResult {
  const staticGroup = new THREE.Group();
  const oceanGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared materials for tight draw-call merging
  const asphaltTex = getAsphaltTextures();
  const paverTex = getSidewalkPaverTextures();
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x3b4049,
    roughness: 0.9,
    metalness: 0.04,
    ...(asphaltTex ? { map: asphaltTex.map, bumpMap: asphaltTex.bumpMap, bumpScale: 0.04 } : {}),
  });
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.84,
    ...(paverTex ? { map: paverTex.map } : {}),
  });
  const promenadeMat = new THREE.MeshStandardMaterial({
    color: 0xe7dfd1,
    roughness: 0.82,
  });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.78 });
  const whitePaintMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const yellowPaintMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const poleDarkMat = new THREE.MeshStandardMaterial({ color: 0x131823, roughness: 0.3, metalness: 0.72 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.8 });
  const whiteCoastalMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72 });
  const oceanBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45, metalness: 0.12 });
  const turquoiseMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.42, metalness: 0.1 });
  const coralMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.52 });
  const redLifeguardMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.48 });
  const yellowSunnyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xc28a49, roughness: 0.82 });
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0xa1763d, roughness: 0.92 });
  const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0x854d27, roughness: 0.8 });
  const inoxMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.22, metalness: 0.88 });
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78563c, roughness: 0.9 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.74, side: THREE.DoubleSide });
  const palmLeafBrightMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72, side: THREE.DoubleSide });
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.68 });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde68a,
    emissiveIntensity: 0.45,
    roughness: 0.16,
  });
  lanternMats.push(lampGlowMat);

  const coastalAccentLedMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
    roughness: 0.18,
    metalness: 0.15,
  });
  neonMats.push(coastalAccentLedMat);

  const warmBollardMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  lanternMats.push(warmBollardMat);

  const warmPoolTex = createSoftGlowPoolTexture('rgba(254, 240, 138, 0.85)', 'rgba(251, 191, 36, 0.36)');
  const warmPoolMat = new THREE.MeshBasicMaterial({
    map: warmPoolTex,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(warmPoolMat);

  const cyanPoolTex = createSoftGlowPoolTexture('rgba(125, 211, 252, 0.72)', 'rgba(14, 165, 233, 0.26)');
  const cyanPoolMat = new THREE.MeshBasicMaterial({
    map: cyanPoolTex,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(cyanPoolMat);

  const addBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = staticGroup,
    rot?: [number, number, number]
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(m);
    return m;
  };

  const addSign = (
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    rotY: number,
    title: string,
    sub: string,
    bg = '#0c4a6e',
    bg2 = '#082f49',
    border = '#38bdf8'
  ) => {
    const tex = createCoastalSignTex(title, sub, bg, bg2, border);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.36,
      roughness: 0.36,
    });
    neonMats.push(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    staticGroup.add(m);
    return m;
  };

  // =========================================================================
  // 1. NGÃ 3 VEN BIỂN & 4-LANE COASTAL BOULEVARD (ĐƯỜNG VÕ NGUYÊN GIÁP)
  // =========================================================================
  const roadLen = WEST_COAST_ROAD_MAX_Z - WEST_COAST_ROAD_MIN_Z; // 530m
  const roadMidZ = (WEST_COAST_ROAD_MIN_Z + WEST_COAST_ROAD_MAX_Z) * 0.5; // 100.0
  // Main N-S 4-lane Coastal Boulevard (X = -981.4 .. -965.0, Y = -0.26)
  addBox(16.8, 0.12, roadLen, roadMat, WEST_COAST_ROAD_CX, -0.32, roadMidZ);
  // Seamless T-junction throat connecting Đại Lộ Trung Tâm (X = -965..-960, Z = 20.8..37.2)
  addBox(6.0, 0.12, 16.8, roadMat, -962.5, -0.32, 29.0);
  // Seamless North T-junction throat connecting Đường Ven Sông Bạch Đằng Tây (X = -965..-960, Z = -153.4..-137.0)
  addBox(6.0, 0.12, 16.4, roadMat, -962.5, -0.32, -145.2);
  // Flush sloped asphalt tie-in ramps + white zebra crosswalks connecting ALL 9 coastal-reaching residential inner streets (Bắc 1/2/3, Nam 1..6) onto Đường Ven Biển!
  const residentialTieSlope = Math.atan2(0.295, 5.0);
  WEST_COASTAL_RESIDENTIAL_OPENINGS.forEach((op) => {
    const openingLen = op.maxZ - op.minZ;
    addBox(
      5.1,
      0.14,
      openingLen + 0.25,
      roadMat,
      -962.5,
      -0.18,
      op.cz,
      staticGroup,
      [0, 0, residentialTieSlope]
    );
    // Crisp white pedestrian zebra bars across each residential street entrance
    const stripes = Math.max(3, Math.floor(openingLen / 2.2));
    const halfSpan = ((stripes - 1) * 1.9) * 0.5;
    for (let s = 0; s < stripes; s++) {
      addBox(
        2.1,
        0.025,
        0.9,
        whitePaintMat,
        -963.1,
        -0.145,
        op.cz - halfSpan + s * 1.9,
        staticGroup,
        [0, 0, residentialTieSlope]
      );
    }
  });

  // East Sidewalk & Curb along X = -965.0 .. -960.0 (segmented cleanly around North Bạch Đằng Link, Ngã 3 Đại Lộ Trung Tâm, AND ALL 9 residential inner streets!)
  const eastRoadCuts: Array<[number, number]> = [
    [-153.4, -137.0],
    [15.6, 42.5],
    ...WEST_COASTAL_RESIDENTIAL_OPENINGS.map((op): [number, number] => [op.minZ, op.maxZ]),
  ];
  eastRoadCuts.sort((a, b) => a[0] - b[0]);

  const eastSidewalkSegs: Array<[number, number]> = [];
  let cursorZ = WEST_COAST_ROAD_MIN_Z;
  for (const [cutMin, cutMax] of eastRoadCuts) {
    if (cutMin > cursorZ + 0.35) {
      eastSidewalkSegs.push([cursorZ, cutMin]);
    }
    cursorZ = Math.max(cursorZ, cutMax);
  }
  if (WEST_COAST_ROAD_MAX_Z > cursorZ + 0.35) {
    eastSidewalkSegs.push([cursorZ, WEST_COAST_ROAD_MAX_Z]);
  }
  eastSidewalkSegs.forEach(([z1, z2]) => {
    const len = z2 - z1;
    const mid = (z1 + z2) * 0.5;
    addBox(5.0, 0.28, len, sidewalkMat, -962.5, -0.14, mid);
    addBox(0.32, 0.30, len, curbMat, -965.0, -0.13, mid);
  });

  // Double-yellow center lines & dashed white lane markings along Đường Ven Biển (breaking neatly at North Bạch Đằng Link Z=-154..-136 & T-Junction Z=18..40)
  const markSegs: Array<[number, number]> = [
    [-134.5, 16.5],
    [41.5, 334.0],
    [354.0, WEST_COAST_ROAD_MAX_Z - 4],
  ];
  markSegs.forEach(([z1, z2]) => {
    const len = z2 - z1;
    const mid = (z1 + z2) * 0.5;
    addBox(0.14, 0.02, len, yellowPaintMat, WEST_COAST_ROAD_CX - 0.16, -0.25, mid);
    addBox(0.14, 0.02, len, yellowPaintMat, WEST_COAST_ROAD_CX + 0.16, -0.25, mid);
    for (let dz = z1 + 3; dz <= z2 - 3; dz += 7.0) {
      addBox(0.12, 0.02, 3.0, whitePaintMat, WEST_COAST_ROAD_CX - 4.1, -0.25, dz);
      addBox(0.12, 0.02, 3.0, whitePaintMat, WEST_COAST_ROAD_CX + 4.1, -0.25, dz);
    }
  });

  // North T-Junction (Võ Nguyên Giáp × Đường Ven Sông Bạch Đằng Tây) Zebra Crosswalks & Corner Directional Signpost
  for (let i = -3; i <= 3; i++) {
    addBox(1.1, 0.02, 2.8, whitePaintMat, WEST_COAST_ROAD_CX + i * 2.0, -0.25, -135.4);
    addBox(2.8, 0.02, 1.1, whitePaintMat, -963.0, -0.25, -145.2 + i * 2.0);
  }
  addBox(8.0, 0.02, 0.35, whitePaintMat, WEST_COAST_ROAD_CX + 4.0, -0.25, -133.2);
  addBox(0.35, 0.02, 7.6, whitePaintMat, -960.6, -0.25, -149.4);
  // Corner directional sign facing northbound coastal drivers turning East onto Đường Ven Sông Bạch Đằng Tây
  addBox(0.26, 5.2, 0.26, poleDarkMat, -963.8, 2.6, -135.4);
  addBox(0.22, 1.45, 5.8, poleDarkMat, -963.8, 4.7, -135.4);
  addSign(
    5.6,
    1.32,
    -963.94,
    4.7,
    -135.4,
    -Math.PI / 2,
    'NGÃ 3 VEN BIỂN • SÔNG HÀN',
    '◀ Bãi Biển Mỹ Khê Tây  |  Đường Bạch Đằng • Cầu Sông Hàn ▶',
    '#0369a1',
    '#0c4a6e',
    '#fde047'
  );

  // T-Junction Zebra Crosswalks on all 3 legs (North Z=18.2, South Z=39.8, East X=-963.2) + Stop Lines
  for (let i = -3; i <= 3; i++) {
    addBox(1.1, 0.02, 2.8, whitePaintMat, WEST_COAST_ROAD_CX + i * 2.0, -0.25, 18.2);
    addBox(1.1, 0.02, 2.8, whitePaintMat, WEST_COAST_ROAD_CX + i * 2.0, -0.25, 39.8);
    addBox(2.8, 0.02, 1.1, whitePaintMat, -963.0, -0.25, 29.0 + i * 2.0);
  }
  addBox(8.0, 0.02, 0.35, whitePaintMat, WEST_COAST_ROAD_CX - 4.0, -0.25, 15.8);
  addBox(8.0, 0.02, 0.35, whitePaintMat, WEST_COAST_ROAD_CX + 4.0, -0.25, 42.2);
  addBox(0.35, 0.02, 7.6, whitePaintMat, -960.8, -0.25, 24.8);

  // Coastal Road End Guardrails at North (Z=-165, overlooking Cửa Sông Hàn) & South (Z=365)
  [-165.0, 365.0].forEach((gz) => {
    addBox(18.0, 0.85, 0.35, whiteCoastalMat, WEST_COAST_ROAD_CX, 0.16, gz);
    addBox(18.0, 0.22, 0.42, coralMat, WEST_COAST_ROAD_CX, 0.48, gz);
  });

  // Overhead Directional Gantry at Ngã 3 Ven Biển (facing Eastbound drivers arriving from Đại Lộ Trung Tâm!)
  addBox(0.42, 7.2, 0.42, poleDarkMat, -964.2, 3.6, 17.5);
  addBox(0.42, 7.2, 0.42, poleDarkMat, -964.2, 3.6, 40.5);
  addBox(0.42, 0.55, 23.8, poleDarkMat, -964.2, 7.0, 29.0);
  addSign(
    11.5,
    1.85,
    -963.92,
    6.95,
    29.0,
    Math.PI / 2,
    'NGÃ 3 VEN BIỂN • MỸ KHÊ TÂY',
    '← Bãi Tắm Nam / Beach Bar   |   Bãi Tắm Bắc / Bóng Chuyền →',
    '#0369a1',
    '#0c4a6e',
    '#ffffff'
  );

  // =========================================================================
  // 2. 3-LEG SYNCHRONIZED T-JUNCTION TRAFFIC LIGHTS
  // =========================================================================
  const ewLenses: SignalLens[] = [];
  const nsLenses: SignalLens[] = [];
  const buildTrafficPole = (x: number, z: number, yaw: number, groupList: SignalLens[]) => {
    const pGrp = new THREE.Group();
    pGrp.position.set(x, 0, z);
    pGrp.rotation.y = yaw;
    addBox(0.24, 5.8, 0.24, poleDarkMat, 0, 2.9, 0, pGrp);
    addBox(0.18, 0.18, 3.6, poleDarkMat, 0, 5.55, 1.8, pGrp);
    addBox(0.42, 1.32, 0.34, poleDarkMat, 0, 5.2, 3.4, pGrp);

    const red = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.1 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.1 });
    const green = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.8 });
    const lensGeo = new THREE.CircleGeometry(0.13, 12);

    [
      { y: 5.58, mat: red },
      { y: 5.2, mat: yellow },
      { y: 4.82, mat: green },
    ].forEach(({ y, mat }) => {
      const l = new THREE.Mesh(lensGeo, mat);
      l.position.set(0.22, y, 3.4);
      l.rotation.y = Math.PI / 2;
      pGrp.add(l);
    });
    groupList.push({ red, yellow, green });
    staticGroup.add(pGrp);
  };
  // Eastbound/Westbound arrival leg (faces approaching drivers from Đại Lộ Trung Tâm)
  buildTrafficPole(-964.6, 17.8, Math.PI, ewLenses);
  // Northbound & Southbound Coastal Boulevard legs
  buildTrafficPole(-982.0, 41.0, Math.PI / 2, nsLenses);
  buildTrafficPole(-964.6, 41.0, -Math.PI / 2, nsLenses);

  // =========================================================================
  // 3. OCEANFRONT PROMENADE, SEAWALL, COCONUT PALMS & COASTAL LAMPS
  // =========================================================================
  // Continuous 14.6m wide stone oceanfront boardwalk (X = -996.0 .. -981.4, Y = 0.0)
  addBox(14.6, 0.34, roadLen, promenadeMat, -988.7, -0.17, roadMidZ);
  // East curb facing Coastal Boulevard
  addBox(0.32, 0.36, roadLen, curbMat, -981.4, -0.16, roadMidZ);
  // Granite seawall coping along the beach edge (X = -996.0) with low decorative sea-view balustrade breaks at beach stairs
  addBox(0.55, 0.44, roadLen, whiteCoastalMat, -995.8, -0.06, roadMidZ);

  // Beach Access Stone Staircases leading smoothly down onto the golden sand
  const beachStairZs = [-110, -45, 29, 80, 140, 220, 310];
  beachStairZs.forEach((sz) => {
    const sw = sz === 29 ? 10.0 : 5.4;
    addBox(1.2, 0.16, sw, whiteCoastalMat, -996.5, -0.08, sz);
    addBox(1.2, 0.14, sw, whiteCoastalMat, -997.6, -0.15, sz);
  });

  // ICONIC WAVE WELCOME ARCH right opposite Ngã 3 Đại Lộ Trung Tâm (X = -995.8, Z = 29.0)
  addBox(1.1, 5.4, 1.1, whiteCoastalMat, -995.8, 2.7, 22.8);
  addBox(1.1, 5.4, 1.1, whiteCoastalMat, -995.8, 2.7, 35.2);
  addBox(1.2, 0.45, 1.2, turquoiseMat, -995.8, 5.45, 22.8);
  addBox(1.2, 0.45, 1.2, turquoiseMat, -995.8, 5.45, 35.2);
  addBox(1.3, 1.45, 14.4, oceanBlueMat, -995.8, 6.1, 29.0);
  addBox(1.38, 0.22, 14.8, yellowSunnyMat, -995.8, 6.88, 29.0);
  addSign(
    13.2,
    1.28,
    -995.08,
    6.1,
    29.0,
    Math.PI / 2,
    'BÃI BIỂN MỸ KHÊ TÂY',
    'Bãi Tắm An Toàn • Dừa Tươi • Thể Thao Biển • Check-in Hoàng Hôn',
    '#0284c7',
    '#0369a1',
    '#fde047'
  );
  // Decorative colorful "I ♥ BIỂN" surfboard cluster beside the plaza
  [
    { z: 18.6, c: coralMat, tilt: 0.16 },
    { z: 19.6, c: turquoiseMat, tilt: -0.08 },
    { z: 38.4, c: yellowSunnyMat, tilt: 0.12 },
    { z: 39.4, c: oceanBlueMat, tilt: -0.15 },
  ].forEach((sb) => {
    const board = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.75, 4, 8), sb.c);
    board.scale.set(0.32, 1.0, 1.0);
    board.position.set(-994.2, 1.15, sb.z);
    board.rotation.x = sb.tilt;
    staticGroup.add(board);
  });

  // Helper: Tropical Coconut Palm Tree (curved trunk + arched fronds + coconuts)
  const palmSegGeo = new THREE.CylinderGeometry(0.14, 0.19, 1.45, 7);
  const palmFrondGeo = new THREE.BoxGeometry(0.42, 0.04, 2.65);
  const cocoGeo = new THREE.SphereGeometry(0.13, 6, 6);
  const addCoconutPalm = (x: number, y: number, z: number, scale = 1.0, leanDir = -1, seed = 0) => {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.scale.setScalar(scale);
    let tx = 0;
    let ty = 0;
    let tz = 0;
    const leanZ = Math.sin(seed * 1.7) * 0.18;
    for (let s = 0; s < 4; s++) {
      const seg = new THREE.Mesh(palmSegGeo, palmTrunkMat);
      const tiltX = leanDir * (0.06 + s * 0.05);
      seg.position.set(tx, ty + 0.7, tz);
      seg.rotation.z = -tiltX;
      seg.rotation.x = leanZ * (s * 0.25);
      grp.add(seg);
      tx += Math.sin(tiltX) * 1.32;
      ty += Math.cos(tiltX) * 1.32;
      tz += Math.sin(leanZ * s * 0.25) * 0.8;
    }
    // Cluster of 3 coconuts
    for (let c = 0; c < 3; c++) {
      const ang = (c * Math.PI * 2) / 3 + seed;
      const coco = new THREE.Mesh(cocoGeo, coconutMat);
      coco.position.set(tx + Math.cos(ang) * 0.22, ty - 0.1, tz + Math.sin(ang) * 0.22);
      grp.add(coco);
    }
    // 7 arched palm fronds radiating outward
    for (let f = 0; f < 7; f++) {
      const yaw = (f * Math.PI * 2) / 7 + seed * 0.5;
      const frondMat = f % 2 === 0 ? palmLeafMat : palmLeafBrightMat;
      const frond = new THREE.Mesh(palmFrondGeo, frondMat);
      frond.position.set(tx + Math.sin(yaw) * 1.25, ty + 0.18, tz + Math.cos(yaw) * 1.25);
      frond.rotation.set(0.32, yaw, 0, 'YXZ');
      grp.add(frond);
    }
    staticGroup.add(grp);
  };

  // =========================================================================
  // LUXURY VÕ NGUYÊN GIÁP ARCHITECTURAL COASTAL LIGHTING + COCONUT PALMS + SEAWALL BOLLARDS
  // =========================================================================
  const lampPlinthGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.58, 8);
  const lampGoldCollarGeo = new THREE.CylinderGeometry(0.165, 0.185, 0.18, 8);
  const lampMainMastGeo = new THREE.CylinderGeometry(0.085, 0.145, 7.05, 8);
  const lampUpperSleeveGeo = new THREE.CylinderGeometry(0.11, 0.125, 0.38, 8);
  const lampLedFinGeo = new THREE.BoxGeometry(0.04, 2.8, 0.14);
  const lampArmLowerGeo = new THREE.BoxGeometry(1.55, 0.11, 0.13);
  const lampArmUpperGeo = new THREE.BoxGeometry(1.38, 0.09, 0.11);
  const lampHoodGeo = new THREE.BoxGeometry(1.05, 0.12, 0.44);
  const lampDiffuserGeo = new THREE.BoxGeometry(0.92, 0.06, 0.36);
  const lampFinialWaveGeo = new THREE.ConeGeometry(0.11, 0.72, 6);
  const lampPoolRoadGeo = new THREE.PlaneGeometry(11.5, 11.5);
  const lampPoolWalkGeo = new THREE.PlaneGeometry(8.5, 8.5);
  const lampGlobeGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const palmRingGeo = new THREE.TorusGeometry(0.32, 0.045, 6, 12);
  palmRingGeo.rotateX(Math.PI / 2);

  const bollardBaseGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.16, 8);
  const bollardBodyGeo = new THREE.CylinderGeometry(0.095, 0.11, 0.62, 8);
  const bollardLanternGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.24, 8);
  const bollardCapGeo = new THREE.ConeGeometry(0.15, 0.12, 8);
  const bollardPoolGeo = new THREE.PlaneGeometry(3.4, 3.4);

  const addArchitecturalCoastalLamp = (x: number, z: number, dualArm: boolean, armDirX: 1 | -1) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);

    // Tiered dark-anthracite + brushed-gold architectural base plinth
    const plinth = new THREE.Mesh(lampPlinthGeo, poleDarkMat);
    plinth.position.y = 0.29;
    grp.add(plinth);
    const goldBaseRing = new THREE.Mesh(lampGoldCollarGeo, goldTrimMat);
    goldBaseRing.position.y = 0.62;
    grp.add(goldBaseRing);

    // Tapered 7.6m architectural steel mast with mid-height brushed-gold accent collar
    const mast = new THREE.Mesh(lampMainMastGeo, poleDarkMat);
    mast.position.y = 3.85;
    grp.add(mast);
    const midCollar = new THREE.Mesh(lampUpperSleeveGeo, goldTrimMat);
    midCollar.position.y = 5.45;
    grp.add(midCollar);

    // Twin vertical ocean-cyan architectural LED light blades flanking the mast
    const ledFinN = new THREE.Mesh(lampLedFinGeo, coastalAccentLedMat);
    ledFinN.position.set(0, 3.85, 0.13);
    grp.add(ledFinN);
    const ledFinS = new THREE.Mesh(lampLedFinGeo, coastalAccentLedMat);
    ledFinS.position.set(0, 3.85, -0.13);
    grp.add(ledFinS);

    // Graceful brushed-gold wave spire finial crowning the 7.6m standard
    const finial = new THREE.Mesh(lampFinialWaveGeo, goldTrimMat);
    finial.position.y = COASTAL_LUXURY_LAMP_HEIGHT;
    grp.add(finial);

    // Sweeping gull-wing / ocean-wave curved luminaire arm(s)
    const dirs: Array<1 | -1> = dualArm ? [1, -1] : [armDirX];
    dirs.forEach((dir) => {
      // Lower sweeping arm angled upward (+22 deg)
      const arm1 = new THREE.Mesh(lampArmLowerGeo, poleDarkMat);
      arm1.position.set(dir * 0.72, 6.72, 0);
      arm1.rotation.z = dir * 0.36;
      grp.add(arm1);
      // Upper gull-wing extension curving gracefully outward
      const arm2 = new THREE.Mesh(lampArmUpperGeo, poleDarkMat);
      arm2.position.set(dir * 1.98, 7.08, 0);
      arm2.rotation.z = dir * 0.11;
      grp.add(arm2);
      // Brushed-gold aerodynamic knuckle joint
      const joint = new THREE.Mesh(lampGoldCollarGeo, goldTrimMat);
      joint.scale.set(0.65, 0.75, 0.65);
      joint.position.set(dir * 1.38, 6.98, 0);
      grp.add(joint);

      // Wide aerodynamic LED luminaire hood + bright warm luminous diffuser
      const hood = new THREE.Mesh(lampHoodGeo, poleDarkMat);
      hood.position.set(dir * 2.72, 7.16, 0);
      grp.add(hood);
      const hoodTrim = new THREE.Mesh(lampDiffuserGeo, goldTrimMat);
      hoodTrim.scale.set(1.06, 0.55, 1.08);
      hoodTrim.position.set(dir * 2.72, 7.21, 0);
      grp.add(hoodTrim);
      const diffuser = new THREE.Mesh(lampDiffuserGeo, lampGlowMat);
      diffuser.position.set(dir * 2.72, 7.09, 0);
      grp.add(diffuser);
    });

    staticGroup.add(grp);

    // Soft feathered radial ground light pools (warm luminaire pools + subtle cyan mast aura)
    const mastAura = new THREE.Mesh(bollardPoolGeo, cyanPoolMat);
    mastAura.rotation.x = -Math.PI / 2;
    mastAura.position.set(x, 0.03, z);
    staticGroup.add(mastAura);

    dirs.forEach((dir) => {
      const targetX = x + dir * 2.72;
      const onRoad = targetX >= WEST_COAST_ROAD_MIN_X && targetX <= WEST_COAST_ROAD_MAX_X;
      const pool = new THREE.Mesh(onRoad ? lampPoolRoadGeo : lampPoolWalkGeo, warmPoolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(targetX, onRoad ? -0.24 : 0.03, z);
      staticGroup.add(pool);
    });
  };

  const addSeawallBollard = (x: number, z: number) => {
    const bGrp = new THREE.Group();
    bGrp.position.set(x, 0, z);
    const bBase = new THREE.Mesh(bollardBaseGeo, poleDarkMat);
    bBase.position.y = 0.08;
    bGrp.add(bBase);
    const bBody = new THREE.Mesh(bollardBodyGeo, poleDarkMat);
    bBody.position.y = 0.45;
    bGrp.add(bBody);
    const bGlow = new THREE.Mesh(bollardLanternGeo, warmBollardMat);
    bGlow.position.y = 0.86;
    bGrp.add(bGlow);
    const bCap = new THREE.Mesh(bollardCapGeo, goldTrimMat);
    bCap.position.y = 1.03;
    bGrp.add(bCap);
    staticGroup.add(bGrp);

    const bPool = new THREE.Mesh(bollardPoolGeo, warmPoolMat);
    bPool.rotation.x = -Math.PI / 2;
    bPool.position.set(x, 0.03, z);
    staticGroup.add(bPool);
  };

  // Line the entire Promenade & Sandy Edge with lush coconut palms + luxury gull-wing streetlamps + seawall bollards + benches
  let palmIdx = 0;
  for (let pz = -152; pz <= 352; pz += 22) {
    // Keep clear of beach facilities & T-junction welcome arch center
    const nearArch = Math.abs(pz - 29) < 11;
    const nearBar = pz >= 52 && pz <= 74;
    const nearShower = pz >= -10 && pz <= 11;
    const nearJetski = pz >= 90 && pz <= 110;
    if (!nearArch && !nearBar && !nearShower && !nearJetski) {
      addCoconutPalm(-993.8, 0.0, pz, 0.92 + (palmIdx % 3) * 0.12, -1, palmIdx);
      // Warm architectural uplight collar ring glowing around each boardwalk palm trunk
      const uplightRing = new THREE.Mesh(palmRingGeo, warmBollardMat);
      uplightRing.position.set(-993.8, 0.06, pz);
      staticGroup.add(uplightRing);
      const palmAura = new THREE.Mesh(bollardPoolGeo, warmPoolMat);
      palmAura.rotation.x = -Math.PI / 2;
      palmAura.position.set(-993.8, 0.025, pz);
      staticGroup.add(palmAura);
    }
    // Also scatter occasional palms on upper dry beach
    if (palmIdx % 2 === 0 && !nearArch) {
      addCoconutPalm(-998.5, -0.06, pz + 9, 0.85 + (palmIdx % 2) * 0.14, -1, palmIdx + 11);
    }

    // Luxury Twin-Arm Architectural Gull-Wing Streetlamp along the oceanfront promenade edge (illuminates BOTH boulevard & boardwalk!)
    addArchitecturalCoastalLamp(-982.4, pz, true, 1);

    // East sidewalk single-arm architectural streetlamp (skip North Bạch Đằng Link, Ngã 3 Đại Lộ Trung Tâm & ALL 9 residential inner street mouths!)
    const eastLampZ = pz + 11;
    const inNorthLinkOpening = eastLampZ >= -156 && eastLampZ <= -134;
    const inMainTJunction = eastLampZ >= 13.5 && eastLampZ <= 44.5;
    const inResStreetOpening = isInWestCoastalResidentialOpening(eastLampZ, 2.8);
    if (!inNorthLinkOpening && !inMainTJunction && !inResStreetOpening && eastLampZ <= 358) {
      addArchitecturalCoastalLamp(-964.1, eastLampZ, false, -1);
    }

    // Sea-facing wooden benches along the boardwalk
    if (!nearArch && !nearBar && !nearShower && !nearJetski && palmIdx % 2 === 1) {
      addBox(0.55, 0.45, 2.1, woodDeckMat, -994.3, 0.22, pz + 7);
      addBox(0.1, 0.48, 2.1, woodDeckMat, -994.0, 0.56, pz + 7);
    }
    palmIdx++;
  }

  // Modern 1.05m Architectural Seawall Bollard Lights every 11m along the oceanfront coping + flanking every beach staircase
  for (let bz = -158; bz <= 356; bz += 11) {
    const insideStair = beachStairZs.some((sz) => Math.abs(bz - sz) < (sz === 29 ? 6.2 : 3.6));
    if (!insideStair) {
      addSeawallBollard(-995.15, bz);
    }
  }
  beachStairZs.forEach((sz) => {
    const halfW = sz === 29 ? 5.6 : 3.2;
    addSeawallBollard(-995.15, sz - halfW);
    addSeawallBollard(-995.15, sz + halfW);
  });

  // Festive Warm Coastal String-Light Canopies over Ngã 3 Ven Biển Plaza & Jetski Hub
  // (Kept clear of The Dawn Beach Bar front facade so its 3D neon sign & terracotta roof shine cleanly!)
  const stringLightZones: Array<{ z1: number; z2: number; x1: number; x2: number; y: number }> = [
    { z1: 18.5, z2: 39.5, x1: -993.8, x2: -983.2, y: 4.95 },
    { z1: 94.0, z2: 106.0, x1: -987.2, x2: -982.8, y: 3.85 },
  ];
  stringLightZones.forEach((zone) => {
    for (let sz = zone.z1; sz <= zone.z2; sz += 5.2) {
      const span = zone.x2 - zone.x1;
      const midX = (zone.x1 + zone.x2) * 0.5;
      addBox(span, 0.03, 0.03, poleDarkMat, midX, zone.y, sz);
      for (let b = 0; b <= 4; b++) {
        const bx = zone.x1 + (span * b) / 4;
        const sag = Math.sin((b / 4) * Math.PI) * 0.28;
        const bulb = new THREE.Mesh(lampGlobeGeo, lampGlowMat);
        bulb.scale.setScalar(0.56);
        bulb.position.set(bx, zone.y - 0.14 - sag, sz);
        staticGroup.add(bulb);
      }
    }
  });

  // Beachfront Motorbike Parking Bays along the promenade east edge (Z = 4..14 & Z = 43..51)
  [
    { z: 9.0, len: 9.5 },
    { z: 47.0, len: 8.0 },
  ].forEach((bay) => {
    addBox(2.8, 0.03, bay.len, whitePaintMat, -983.5, 0.015, bay.z);
    addBox(2.55, 0.035, bay.len - 0.25, promenadeMat, -983.5, 0.018, bay.z);
    const parked = buildCityMotorbikeMesh({
      color: bay.z < 20 ? 0x0284c7 : 0xf97316,
      variant: 'scooter',
      includeRider: false,
      kickstandTilt: true,
      noMerge: false,
    });
    parked.group.position.set(-983.5, 0.03, bay.z - 1.8);
    parked.group.rotation.y = Math.PI / 2;
    staticGroup.add(parked.group);
  });

  // =========================================================================
  // 4. SIGNATURE BEACHFRONT AMENITIES (SHOWER PAVILION, BEACH BAR, JET-SKI RENTAL, LIFEGUARD TOWERS, VOLLEYBALL, UMBRELLAS, SUNSET SWING)
  // =========================================================================

  // 4A. Trạm Tắm Nước Ngọt & Phòng Thay Đồ (X = -994.8..-987.2, Z = -7.8..+7.8)
  addBox(7.6, 3.1, 15.6, whiteCoastalMat, -991.0, 1.55, 0.0);
  addBox(8.2, 0.32, 16.4, oceanBlueMat, -991.0, 3.25, 0.0);
  addBox(8.0, 0.16, 16.0, turquoiseMat, -991.0, 2.75, 0.0);
  // Changing booth doors along East & West faces
  for (let dz = -5.4; dz <= 5.4; dz += 2.7) {
    addBox(0.12, 2.25, 1.35, oceanBlueMat, -987.15, 1.14, dz);
    addBox(0.12, 2.25, 1.35, turquoiseMat, -994.85, 1.14, dz);
  }
  // 4 Outdoor Stainless Freshwater Shower Columns on the beachside deck (X = -995.4)
  [-5.0, -1.8, 1.8, 5.0].forEach((sz) => {
    addBox(0.08, 2.35, 0.08, inoxMat, -995.3, 1.18, sz);
    addBox(0.36, 0.07, 0.08, inoxMat, -995.5, 2.32, sz);
    addBox(0.85, 0.08, 0.85, curbMat, -995.5, 0.04, sz);
  });
  addSign(11.0, 1.15, -987.08, 3.65, 0.0, Math.PI / 2, 'TẮM NƯỚC NGỌT • THAY ĐỒ', 'Miễn Phí Rửa Chân • Tủ Gửi Đồ An Toàn', '#0284c7', '#075985', '#bae6fd');

  // 4B. THE DAWN BEACH BAR — Mediterranean Terracotta Hip Roof, 3D Glowing "THE dawn" Sign, Warm Timber Bar & Glowing LED Cocktail High-Tops (X = -995..-982.8, Z = 53.5..72.5)
  const dawnBarCenterX = -990.5;
  const dawnBarCenterZ = 63.0;

  const dawnRoofTex = createTerracottaRoofTexture();
  const dawnTerracottaMat = new THREE.MeshStandardMaterial({
    map: dawnRoofTex,
    roughness: 0.78,
    metalness: 0.04,
  });
  const dawnTerracottaRidgeMat = new THREE.MeshStandardMaterial({
    color: 0xb93c14,
    roughness: 0.72,
    metalness: 0.06,
  });
  const dawnPatioTex = createPatioTileTexture();
  const dawnPatioMat = new THREE.MeshStandardMaterial({
    map: dawnPatioTex,
    roughness: 0.84,
    metalness: 0.04,
  });
  const dawnWoodPlankTex = createWarmWoodPlanksTexture();
  const dawnBarWoodMat = new THREE.MeshStandardMaterial({
    map: dawnWoodPlankTex,
    roughness: 0.62,
    metalness: 0.06,
  });
  const dawnDarkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x45220e,
    roughness: 0.66,
    metalness: 0.06,
  });
  const dawnGraniteTopMat = new THREE.MeshStandardMaterial({
    color: 0x16191f,
    roughness: 0.18,
    metalness: 0.22,
  });
  const dawnWhiteStuccoMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea,
    roughness: 0.74,
    metalness: 0.02,
  });
  const dawnSoffitMat = new THREE.MeshStandardMaterial({
    color: 0xfef8ec,
    emissive: 0xffedd5,
    emissiveIntensity: 0.16,
    roughness: 0.72,
  });
  const dawnSignFaceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe6fff8,
    emissiveIntensity: 1.55,
    roughness: 0.12,
  });
  neonMats.push(dawnSignFaceMat);

  const dawnSignHaloMat = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    emissive: 0x2dd4bf,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  neonMats.push(dawnSignHaloMat);

  const dawnEaveLedMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef3c7,
    emissiveIntensity: 1.25,
    roughness: 0.14,
  });
  lanternMats.push(dawnEaveLedMat);

  const dawnLanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff7d6,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.3,
    roughness: 0.18,
  });
  lanternMats.push(dawnLanternGlowMat);

  const dawnTableTopGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfdf2f8,
    emissiveIntensity: 1.15,
    roughness: 0.16,
  });
  lanternMats.push(dawnTableTopGlowMat);

  const dawnTableRimGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf5d0fe,
    emissive: 0xc084fc,
    emissiveIntensity: 1.05,
    roughness: 0.2,
  });
  neonMats.push(dawnTableRimGlowMat);

  const dawnVioletPoolTex = createSoftGlowPoolTexture('rgba(167, 139, 250, 0.76)', 'rgba(99, 102, 241, 0.34)');
  const dawnVioletPoolMat = new THREE.MeshBasicMaterial({
    map: dawnVioletPoolTex,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(dawnVioletPoolMat);

  const dawnAmberPoolTex = createSoftGlowPoolTexture('rgba(253, 186, 116, 0.82)', 'rgba(245, 158, 11, 0.32)');
  const dawnAmberPoolMat = new THREE.MeshBasicMaterial({
    map: dawnAmberPoolTex,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(dawnAmberPoolMat);

  // 1) Warm Sandstone Cobblestone-Tiled Beach Patio Floor (X = -995.0..-982.8, Z = 53.4..72.6)
  addBox(12.2, 0.05, 19.2, dawnPatioMat, -988.9, 0.025, dawnBarCenterZ);
  addBox(12.4, 0.035, 19.4, dawnDarkWoodMat, -988.9, 0.018, dawnBarCenterZ);

  // 2) Crisp White Stucco Pavilion Columns, Rear Archway & Diagonal Knee Braces
  const colPositions: Array<[number, number]> = [
    [-987.65, 57.2],
    [-987.65, 68.8],
    [-993.35, 57.2],
    [-993.35, 68.8],
    [-993.35, 60.9],
    [-993.35, 65.1],
  ];
  colPositions.forEach(([cx, cz]) => {
    addBox(0.32, 3.35, 0.32, dawnWhiteStuccoMat, cx, 1.72, cz);
    addBox(0.42, 0.14, 0.42, dawnDarkWoodMat, cx, 0.12, cz);
  });
  // White upper header beam & clean sunlit ceiling box under the terracotta roof
  addBox(6.15, 0.72, 12.05, dawnWhiteStuccoMat, dawnBarCenterX, 3.16, dawnBarCenterZ);
  addBox(5.85, 0.56, 11.45, dawnSoffitMat, dawnBarCenterX, 2.86, dawnBarCenterZ);
  // Diagonal white timber knee-braces framing the front bar opening (left & right corners)
  addBox(0.14, 0.14, 1.15, dawnWhiteStuccoMat, -987.65, 2.66, 57.78, staticGroup, [Math.PI / 4, 0, 0]);
  addBox(0.14, 0.14, 1.15, dawnWhiteStuccoMat, -987.65, 2.66, 68.22, staticGroup, [-Math.PI / 4, 0, 0]);

  // 3) Signature 4-Sided Terracotta Clay-Tile Hip Roof + Ridge Caps + Scalloped Eaves + White Angled Soffit + Glowing Warm LED Eave Strip
  const hipRoofGeo = buildHipRoofGeometry(8.6, 14.8, 6.2, 1.92, 1.45);
  const hipRoofMesh = new THREE.Mesh(hipRoofGeo, dawnTerracottaMat);
  hipRoofMesh.position.set(dawnBarCenterX, 3.46, dawnBarCenterZ);
  staticGroup.add(hipRoofMesh);

  // Central clay ridge beam & 4 raised hip corner ribs
  addBox(0.28, 0.22, 6.45, dawnTerracottaRidgeMat, dawnBarCenterX, 5.42, dawnBarCenterZ);
  const hipHalfX = 4.3;
  const hipHalfZ = 7.4;
  const hipRidgeHalfZ = 3.1;
  [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ].forEach(([sx, sz]) => {
    const pStart = new THREE.Vector3(dawnBarCenterX, 5.38, dawnBarCenterZ + sz * hipRidgeHalfZ);
    const pEnd = new THREE.Vector3(dawnBarCenterX + sx * hipHalfX, 3.48, dawnBarCenterZ + sz * hipHalfZ);
    const len = pStart.distanceTo(pEnd);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, len), dawnTerracottaRidgeMat);
    rib.position.copy(pStart).add(pEnd).multiplyScalar(0.5);
    rib.lookAt(pEnd);
    staticGroup.add(rib);
  });

  // Scalloped clay barrel-tile eave tips along the front roof edge (facing +X promenade)
  const eaveTileGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.34, 7);
  eaveTileGeo.rotateZ(Math.PI / 2);
  for (let ez = dawnBarCenterZ - 7.1; ez <= dawnBarCenterZ + 7.1; ez += 0.36) {
    const tileTip = new THREE.Mesh(eaveTileGeo, dawnTerracottaRidgeMat);
    tileTip.position.set(dawnBarCenterX + 4.32, 3.48, ez);
    staticGroup.add(tileTip);
  }

  // Crisp White Flared Soffit Overhang under all 4 eaves + Luminous Warm-White LED Perimeter Strip
  addBox(8.5, 0.12, 14.6, dawnSoffitMat, dawnBarCenterX, 3.40, dawnBarCenterZ);
  // Front & side white flared eave fascia trim boards
  addBox(0.12, 0.24, 14.7, dawnWhiteStuccoMat, dawnBarCenterX + 4.24, 3.36, dawnBarCenterZ);
  addBox(0.12, 0.24, 14.7, dawnWhiteStuccoMat, dawnBarCenterX - 4.24, 3.36, dawnBarCenterZ);
  addBox(8.52, 0.24, 0.12, dawnWhiteStuccoMat, dawnBarCenterX, 3.36, dawnBarCenterZ + 7.34);
  addBox(8.52, 0.24, 0.12, dawnWhiteStuccoMat, dawnBarCenterX, 3.36, dawnBarCenterZ - 7.34);
  // Bright glowing warm-white LED strip wrapping the front & side eave edges (just like Image 2!)
  addBox(0.09, 0.11, 14.66, dawnEaveLedMat, dawnBarCenterX + 4.30, 3.38, dawnBarCenterZ);
  addBox(8.58, 0.10, 0.09, dawnEaveLedMat, dawnBarCenterX, 3.38, dawnBarCenterZ + 7.36);
  addBox(8.58, 0.10, 0.09, dawnEaveLedMat, dawnBarCenterX, 3.38, dawnBarCenterZ - 7.36);

  // 4) Iconic 3D Sculpted Glowing Channel-Letter Marquee: "THE dawn" (faithful to Image 2!)
  // Local +X = viewer RIGHT (-Z world), Local -X = viewer LEFT (+Z world), Local +Z = forward (+X world)
  const dawnSignGroup = new THREE.Group();
  dawnSignGroup.position.set(dawnBarCenterX + 4.44, 3.74, dawnBarCenterZ);
  dawnSignGroup.rotation.y = Math.PI / 2;

  const addNeonStroke = (x1: number, x2: number, y1: number, y2: number, depth = 0.16) => {
    const w = Math.max(0.04, Math.abs(x2 - x1));
    const h = Math.max(0.04, Math.abs(y2 - y1));
    const cx = (x1 + x2) * 0.5;
    const cy = (y1 + y2) * 0.5;
    // Dark charcoal metallic channel-letter housing
    addBox(w + 0.03, h + 0.03, depth, poleDarkMat, cx, cy, 0, dawnSignGroup);
    // Mint-aqua neon halo trim slightly behind front face
    addBox(w + 0.09, h + 0.09, 0.05, dawnSignHaloMat, cx, cy, depth * 0.34, dawnSignGroup);
    // Pure luminous white glowing acrylic front face
    addBox(w, h, 0.04, dawnSignFaceMat, cx, cy, depth * 0.5 + 0.015, dawnSignGroup);
  };

  // Subtle horizontal glowing accent dash bars flanking "dawn" (left & right eaves transition)
  addNeonStroke(-4.58, -4.18, -0.05, 0.08, 0.10);
  addNeonStroke(4.18, 4.58, -0.05, 0.08, 0.10);

  // Letter 'd' (-3.95 .. -2.15, y = -0.34 .. +0.86)
  addNeonStroke(-2.39, -2.15, -0.34, 0.86); // right tall stem
  addNeonStroke(-3.95, -2.15, -0.34, -0.10); // bottom bar
  addNeonStroke(-3.95, -2.15, 0.16, 0.40); // loop top bar
  addNeonStroke(-3.95, -3.71, -0.34, 0.40); // left loop stem

  // Letter 'a' (-1.88 .. -0.08, y = -0.34 .. +0.86)
  addNeonStroke(-1.88, -0.08, 0.62, 0.86); // top overhang bar
  addNeonStroke(-0.32, -0.08, -0.34, 0.86); // right vertical stem
  addNeonStroke(-1.88, -0.08, 0.16, 0.40); // middle horizontal bar
  addNeonStroke(-1.88, -0.08, -0.34, -0.10); // bottom horizontal bar
  addNeonStroke(-1.88, -1.64, -0.34, 0.40); // left loop stem

  // Letter 'w' (+0.18 .. +2.08, y = -0.34 .. +0.86)
  addNeonStroke(0.18, 0.42, -0.34, 0.86); // left stem
  addNeonStroke(1.01, 1.25, -0.34, 0.72); // center stem
  addNeonStroke(1.84, 2.08, -0.34, 0.86); // right stem
  addNeonStroke(0.18, 2.08, -0.34, -0.10); // bottom bar

  // Letter 'n' (+2.34 .. +3.96, y = -0.34 .. +0.86)
  addNeonStroke(2.34, 2.58, -0.34, 0.86); // left stem
  addNeonStroke(2.34, 3.96, 0.62, 0.86); // top bar
  addNeonStroke(3.72, 3.96, -0.34, 0.86); // right stem

  // Upper-left smaller "THE" perched neatly over 'd' (-4.12 .. -2.52, y = +0.52 .. +1.00)
  // 'T'
  addNeonStroke(-4.12, -3.66, 0.90, 1.00, 0.12);
  addNeonStroke(-3.94, -3.84, 0.52, 1.00, 0.12);
  // 'H'
  addNeonStroke(-3.55, -3.45, 0.52, 1.00, 0.12);
  addNeonStroke(-3.19, -3.09, 0.52, 1.00, 0.12);
  addNeonStroke(-3.55, -3.09, 0.71, 0.81, 0.12);
  // 'E'
  addNeonStroke(-2.98, -2.88, 0.52, 1.00, 0.12);
  addNeonStroke(-2.98, -2.54, 0.90, 1.00, 0.12);
  addNeonStroke(-2.98, -2.62, 0.71, 0.81, 0.12);
  addNeonStroke(-2.98, -2.54, 0.52, 0.62, 0.12);

  staticGroup.add(dawnSignGroup);

  // 5) 3 Hanging Warm Amber Box Lanterns under the front eaves + Overhead Wall Fan + 2 Blackboard Chalk Menus
  [57.8, 63.0, 68.2].forEach((lz) => {
    // Suspension rod + bronze cap + warm glowing amber lantern shade
    addBox(0.04, 0.34, 0.04, poleDarkMat, -986.85, 3.24, lz);
    addBox(0.32, 0.05, 0.32, poleDarkMat, -986.85, 3.06, lz);
    addBox(0.26, 0.42, 0.26, dawnLanternGlowMat, -986.85, 2.84, lz);
    addBox(0.30, 0.04, 0.30, poleDarkMat, -986.85, 2.62, lz);
  });

  // Overhead Wall-Mount Fan centered under the white header beam (signature detail from Image 2!)
  const fanGroup = new THREE.Group();
  fanGroup.position.set(-987.48, 2.86, 63.8);
  fanGroup.rotation.z = -0.35;
  const fanGuard = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 14), poleDarkMat);
  fanGuard.rotation.y = Math.PI / 2;
  fanGroup.add(fanGuard);
  const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.09, 8), poleDarkMat);
  fanHub.rotation.z = Math.PI / 2;
  fanGroup.add(fanHub);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.23, 0.08), poleDarkMat);
    const a = (b * Math.PI * 2) / 3;
    blade.position.set(0.02, Math.cos(a) * 0.13, Math.sin(a) * 0.13);
    blade.rotation.x = a;
    fanGroup.add(blade);
  }
  staticGroup.add(fanGroup);

  // 2 Hanging Chalkboard Drink Menu Boards flanking left & right under the eaves
  const leftMenuMat = new THREE.MeshStandardMaterial({ map: createBarChalkboardTexture('left'), roughness: 0.82 });
  const rightMenuMat = new THREE.MeshStandardMaterial({ map: createBarChalkboardTexture('right'), roughness: 0.82 });
  const leftBoard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.92), leftMenuMat);
  leftBoard.position.set(-987.42, 2.68, 67.35);
  staticGroup.add(leftBoard);
  const rightBoard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.92), rightMenuMat);
  rightBoard.position.set(-987.42, 2.68, 58.65);
  staticGroup.add(rightBoard);

  // 6) Warm Timber-Slatted Bar Counter, Black Granite Countertop, Under-Counter Cove LED & Illuminated Back-Bar
  // Main wooden slatted bar front & side returns
  addBox(1.15, 1.06, 11.2, dawnBarWoodMat, -988.45, 0.58, dawnBarCenterZ);
  // Dark recessed toe-kick plinth & polished black granite countertop overhang
  addBox(1.06, 0.14, 11.1, dawnDarkWoodMat, -988.48, 0.09, dawnBarCenterZ);
  addBox(1.42, 0.09, 11.55, dawnGraniteTopMat, -988.38, 1.13, dawnBarCenterZ);
  // Warm under-counter golden LED cove strip glowing beneath the granite overhang
  addBox(0.05, 0.05, 11.1, dawnLanternGlowMat, -987.84, 1.05, dawnBarCenterZ);

  // Back-bar prep counter + warmly backlit bottle display shelves (leaving upper ocean view open!)
  addBox(0.92, 0.96, 10.6, dawnDarkWoodMat, -992.85, 0.53, dawnBarCenterZ);
  addBox(0.98, 0.07, 10.8, dawnGraniteTopMat, -992.85, 1.04, dawnBarCenterZ);
  const backbarTex = createBottleBackbarTexture();
  const backbarWallMat = new THREE.MeshStandardMaterial({
    map: backbarTex,
    emissive: 0xffd28a,
    emissiveMap: backbarTex,
    emissiveIntensity: 0.65,
    roughness: 0.42,
  });
  lanternMats.push(backbarWallMat);
  const backbarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.38, 9.6), backbarWallMat);
  backbarPanel.position.set(-993.15, 1.76, dawnBarCenterZ);
  staticGroup.add(backbarPanel);

  // Stainless steel beer draft tap tower + cocktail shaker + fresh coconuts & glassware along the dark bar countertop
  addBox(0.16, 0.44, 0.24, inoxMat, -988.25, 1.39, 64.2);
  addBox(0.12, 0.12, 0.48, inoxMat, -988.18, 1.58, 64.2);
  addBox(0.24, 0.05, 0.34, inoxMat, -988.20, 1.19, 64.2);
  // Cocktail shakers, ice bucket & fresh chilled coconuts on the bar top
  [59.4, 61.5, 63.1, 65.8, 67.2].forEach((cz, idx) => {
    const coco = new THREE.Mesh(cocoGeo, coconutMat);
    coco.position.set(-988.05, 1.29, cz);
    staticGroup.add(coco);
    if (idx % 2 === 0) {
      const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.24, 8), inoxMat);
      shaker.position.set(-988.35, 1.29, cz + 0.45);
      staticGroup.add(shaker);
    }
  });

  // Left-side Illuminated Beverage & Tropical Fruit Display Showcase Fridge (matches left glowing cabinet in Image 2!)
  const fridgeTex = createDisplayFridgeTexture();
  const fridgeFrontMat = new THREE.MeshStandardMaterial({
    map: fridgeTex,
    emissive: 0xfff8e1,
    emissiveMap: fridgeTex,
    emissiveIntensity: 0.82,
    roughness: 0.24,
  });
  lanternMats.push(fridgeFrontMat);
  addBox(0.88, 0.56, 1.24, dawnDarkWoodMat, -988.55, 0.33, 69.95);
  addBox(0.86, 1.22, 1.22, dawnWhiteStuccoMat, -988.55, 1.22, 69.95);
  const fridgeGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.12), fridgeFrontMat);
  fridgeGlass.position.set(-988.10, 1.22, 69.95);
  fridgeGlass.rotation.y = Math.PI / 2;
  staticGroup.add(fridgeGlass);

  // 7) Authentic 4-Legged Dark-Teak Wooden High Bar Stools + Glowing Frosted-LED High-Top Cocktail Tables!
  const stoolLegGeo = new THREE.BoxGeometry(0.046, 0.72, 0.046);
  const stoolRailGeo = new THREE.BoxGeometry(0.32, 0.036, 0.036);
  const stoolRailZGeo = new THREE.BoxGeometry(0.036, 0.036, 0.32);
  const stoolSeatGeo = new THREE.BoxGeometry(0.40, 0.055, 0.40);

  const addWoodenBarStool = (sx: number, sz: number, rotY = 0) => {
    const sGrp = new THREE.Group();
    sGrp.position.set(sx, 0.05, sz);
    sGrp.rotation.y = rotY;
    [
      [-0.15, -0.15],
      [0.15, -0.15],
      [-0.15, 0.15],
      [0.15, 0.15],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(stoolLegGeo, dawnDarkWoodMat);
      leg.position.set(lx, 0.36, lz);
      sGrp.add(leg);
    });
    // Horizontal footrest stretchers on all 4 sides
    [-0.15, 0.15].forEach((offset) => {
      const rX = new THREE.Mesh(stoolRailGeo, dawnDarkWoodMat);
      rX.position.set(0, 0.24, offset);
      sGrp.add(rX);
      const rZ = new THREE.Mesh(stoolRailZGeo, dawnDarkWoodMat);
      rZ.position.set(offset, 0.24, 0);
      sGrp.add(rZ);
    });
    const seat = new THREE.Mesh(stoolSeatGeo, dawnBarWoodMat);
    seat.position.y = 0.74;
    sGrp.add(seat);
    staticGroup.add(sGrp);
  };

  // Row of 6 wooden bar stools tucked right in front of the slatted wood bar counter
  [58.5, 59.9, 61.3, 64.7, 66.1, 67.5].forEach((sz) => {
    addWoodenBarStool(-987.0, sz, 0);
  });

  // Helper: Glowing Frosted-Acrylic Cube Cocktail High-Top Table (cross pedestal base + glowing white top + lavender-pink LED side glow + violet patio light pool + cocktails!)
  const tablePoolGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const glassCupGeo = new THREE.CylinderGeometry(0.042, 0.034, 0.14, 7);
  const addGlowingHighTopTable = (tx: number, tz: number, stoolOffsets: Array<[number, number]>) => {
    const tGrp = new THREE.Group();
    tGrp.position.set(tx, 0.05, tz);
    // 4-way cross wooden floor base
    addBox(0.76, 0.065, 0.10, dawnDarkWoodMat, 0, 0.033, 0, tGrp);
    addBox(0.10, 0.065, 0.76, dawnDarkWoodMat, 0, 0.033, 0, tGrp);
    // Slender central dark-wood pedestal column
    addBox(0.11, 0.90, 0.11, dawnDarkWoodMat, 0, 0.50, 0, tGrp);
    addBox(0.38, 0.05, 0.38, dawnDarkWoodMat, 0, 0.93, 0, tGrp);
    // Thick Glowing Frosted-Acrylic Tabletop Box (luminous violet-pink acrylic rim + bright milky-white glowing top!)
    addBox(1.06, 0.18, 1.06, dawnTableRimGlowMat, 0, 1.04, 0, tGrp);
    addBox(1.00, 0.035, 1.00, dawnTableTopGlowMat, 0, 1.135, 0, tGrp);
    // 2 Cocktail glasses resting on top of the glowing tabletop
    const g1 = new THREE.Mesh(glassCupGeo, turquoiseMat);
    g1.position.set(-0.22, 1.22, -0.18);
    tGrp.add(g1);
    const g2 = new THREE.Mesh(glassCupGeo, coralMat);
    g2.position.set(0.24, 1.22, 0.15);
    tGrp.add(g2);
    staticGroup.add(tGrp);

    // Cool violet-blue radial light pool cast onto the stone patio tiles underneath (signature mood of Image 2!)
    const pool = new THREE.Mesh(tablePoolGeo, dawnVioletPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(tx, 0.062, tz);
    staticGroup.add(pool);

    // Surrounding 4-legged wooden high bar stools
    stoolOffsets.forEach(([ox, oz]) => {
      addWoodenBarStool(tx + ox, tz + oz, 0);
    });
  };

  // 6 Glowing High-Top Cocktail Tables arranged across the beachfront patio (keeping central sightline to bar open & clear of streetlamp at -982.4, 68!)
  addGlowingHighTopTable(-983.85, 66.2, [
    [0.0, 0.92],
    [0.0, -0.92],
    [-0.92, 0.0],
  ]);
  addGlowingHighTopTable(-985.55, 68.2, [
    [0.0, 0.92],
    [0.0, -0.92],
    [0.92, 0.0],
  ]);
  addGlowingHighTopTable(-985.4, 71.2, [
    [0.0, 0.92],
    [0.0, -0.92],
  ]);
  addGlowingHighTopTable(-983.85, 59.8, [
    [0.0, 0.92],
    [0.0, -0.92],
    [-0.92, 0.0],
  ]);
  addGlowingHighTopTable(-985.55, 57.6, [
    [0.0, 0.92],
    [0.0, -0.92],
    [0.92, 0.0],
  ]);
  addGlowingHighTopTable(-985.2, 54.6, [
    [0.0, 0.92],
    [0.0, -0.92],
    [0.92, 0.0],
  ]);

  // Warm golden-amber light pools cast on the stone pavers right in front of the timber bar counter
  [59.5, 63.0, 66.5].forEach((pz) => {
    const barPool = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), dawnAmberPoolMat);
    barPool.rotation.x = -Math.PI / 2;
    barPool.position.set(-987.2, 0.06, pz);
    staticGroup.add(barPool);
  });

  // 8) Lush Framing Coconut Palm Grove Behind & Flanking THE DAWN (creating Image 2's iconic palm-crown backdrop!)
  [
    { x: -996.4, y: -0.05, z: 54.4, scale: 1.24, lean: 1, seed: 21 },
    { x: -996.8, y: -0.05, z: 59.2, scale: 1.32, lean: -1, seed: 24 },
    { x: -996.8, y: -0.05, z: 66.8, scale: 1.30, lean: -1, seed: 27 },
    { x: -996.4, y: -0.05, z: 71.6, scale: 1.22, lean: 1, seed: 30 },
    { x: -993.8, y: 0.0, z: 52.8, scale: 1.15, lean: 1, seed: 33 },
    { x: -993.8, y: 0.0, z: 73.2, scale: 1.18, lean: -1, seed: 36 },
  ].forEach((p) => {
    addCoconutPalm(p.x, p.y, p.z, p.scale, p.lean, p.seed);
    const ring = new THREE.Mesh(palmRingGeo, warmBollardMat);
    ring.position.set(p.x, Math.max(0.04, p.y + 0.05), p.z);
    staticGroup.add(ring);
  });

  // 9) Localized Dusk/Night Accent PointLights for THE DAWN (distance-culled via getScale & ShopScene venueScaledLights!)
  let dawnLightProxScale = 1.0;
  const getDawnLightScale = () => dawnLightProxScale;

  const dawnBarWarmLight = new THREE.PointLight(0xffb454, 0.8, 16, 1.6);
  dawnBarWarmLight.position.set(-989.2, 2.75, dawnBarCenterZ);
  scaledLights.push({
    light: dawnBarWarmLight,
    dayInt: 0.45,
    nightInt: 5.2,
    getScale: getDawnLightScale,
  });

  const dawnLoungeVioletLeft = new THREE.PointLight(0xb583ff, 0.2, 13, 1.7);
  dawnLoungeVioletLeft.position.set(-984.6, 1.9, 67.2);
  scaledLights.push({
    light: dawnLoungeVioletLeft,
    dayInt: 0.12,
    nightInt: 3.6,
    getScale: getDawnLightScale,
  });

  const dawnLoungeVioletRight = new THREE.PointLight(0xa78bfa, 0.2, 13, 1.7);
  dawnLoungeVioletRight.position.set(-984.6, 1.9, 58.6);
  scaledLights.push({
    light: dawnLoungeVioletRight,
    dayInt: 0.12,
    nightInt: 3.6,
    getScale: getDawnLightScale,
  });

  // 4C. Trạm Thuê Mô Tô Nước, Kayak & Ván Lướt Sóng (X = -994.4..-988.0, Z = 93..108)
  addBox(6.4, 2.85, 10.0, turquoiseMat, -991.2, 1.42, 100.0);
  addBox(7.2, 0.28, 11.2, whiteCoastalMat, -991.2, 2.95, 100.0);
  addSign(9.2, 1.1, -987.92, 3.35, 100.0, Math.PI / 2, 'THUÊ MÔ TÔ NƯỚC & KAYAK', 'Jet-Ski • Chèo SUP • Ván Lướt Sóng • Phao Chuối', '#0f766e', '#115e59', '#fef08a');
  // Standing Surfboard Rack on Sand beside rental station
  [95.5, 97.0, 98.5, 101.5, 103.0].forEach((sz, i) => {
    const bMat = [coralMat, yellowSunnyMat, oceanBlueMat, redLifeguardMat, turquoiseMat][i % 5];
    const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1.65, 4, 8), bMat);
    sb.scale.set(0.28, 1.0, 1.0);
    sb.position.set(-999.2, 0.95, sz);
    sb.rotation.z = 0.14;
    staticGroup.add(sb);
  });
  // 2 Colorful Kayaks resting on dry sand ready for launch (X = -1006, Z = 96 & 103)
  [
    { z: 96.5, mat: yellowSunnyMat },
    { z: 103.0, mat: coralMat },
  ].forEach((ky) => {
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 2.6, 5, 10), ky.mat);
    hull.scale.set(1.0, 1.0, 0.52);
    hull.rotation.z = Math.PI / 2;
    hull.position.set(-1006.5, -0.1, ky.z);
    staticGroup.add(hull);
  });

  // 4D. 2 Elevated Lifeguard Watchtowers (Chòi Cứu Hộ Bãi Biển at X = -1006, Z = -26 & Z = 62)
  [-26.0, 62.0].forEach((lz) => {
    const gy = getWestCoastalGroundY(-1006.0, lz) ?? -0.26;
    const tGrp = new THREE.Group();
    tGrp.position.set(-1006.0, gy, lz);
    // 4 elevated timber stilts
    [
      [-1.3, -1.3],
      [1.3, -1.3],
      [-1.3, 1.3],
      [1.3, 1.3],
    ].forEach(([px, pz]) => {
      addBox(0.22, 3.1, 0.22, whiteCoastalMat, px, 1.55, pz, tGrp);
    });
    // Platform deck, cabin walls & bright red lifeguard roof
    addBox(3.4, 0.22, 3.4, woodDeckMat, 0, 3.1, 0, tGrp);
    addBox(2.8, 1.05, 2.8, whiteCoastalMat, 0, 3.72, 0, tGrp);
    addBox(2.9, 0.28, 2.9, redLifeguardMat, 0, 4.1, 0, tGrp);
    // Corner roof posts + sloped red canopy
    [
      [-1.25, -1.25],
      [1.25, -1.25],
      [-1.25, 1.25],
      [1.25, 1.25],
    ].forEach(([px, pz]) => {
      addBox(0.14, 1.4, 0.14, whiteCoastalMat, px, 4.85, pz, tGrp);
    });
    addBox(3.8, 0.24, 3.8, redLifeguardMat, 0, 5.65, 0, tGrp, [0, 0, -0.08]);
    // Safety flag pole + red-yellow rescue flag (animated GLB lifeguard mounted in dynamicGroup!)
    addBox(0.06, 2.0, 0.06, inoxMat, 1.45, 6.4, 1.45, tGrp);
    addBox(0.04, 0.55, 0.95, yellowSunnyMat, 1.45, 7.1, 1.95, tGrp);
    addBox(0.05, 0.28, 0.95, redLifeguardMat, 1.45, 7.24, 1.95, tGrp);
    staticGroup.add(tGrp);
  });

  // 4E. Beach Volleyball Court (Sân Bóng Chuyền Bãi Biển at X = -1013, Z = -58..-36)
  const vbY = getWestCoastalGroundY(-1013.0, -47.0) ?? -0.42;
  addBox(0.14, 0.04, 18.0, whitePaintMat, -1018.0, vbY + 0.03, -47.0);
  addBox(0.14, 0.04, 18.0, whitePaintMat, -1008.0, vbY + 0.03, -47.0);
  addBox(10.0, 0.04, 0.14, whitePaintMat, -1013.0, vbY + 0.03, -56.0);
  addBox(10.0, 0.04, 0.14, whitePaintMat, -1013.0, vbY + 0.03, -38.0);
  addBox(0.12, 2.55, 0.12, woodDeckMat, -1018.4, vbY + 1.25, -47.0);
  addBox(0.12, 2.55, 0.12, woodDeckMat, -1007.6, vbY + 1.25, -47.0);
  addBox(10.8, 0.92, 0.05, whiteCoastalMat, -1013.0, vbY + 1.95, -47.0);
  addBox(10.8, 0.1, 0.07, yellowSunnyMat, -1013.0, vbY + 2.42, -47.0);

  // Animated bouncing beach volleyball in dynamicGroup!
  const volleyball = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), yellowSunnyMat);
  volleyball.position.set(-1013.0, vbY + 2.8, -47.0);
  dynamicGroup.add(volleyball);

  // 4F. Rows of Colorful Beach Umbrellas & Sun Loungers (22 Parasol Sets along the Golden Beach!)
  const umbrellaConeGeo = new THREE.ConeGeometry(1.85, 0.62, 10);
  const umbrellaPoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.35, 6);
  const umbrellaColors = [oceanBlueMat, coralMat, turquoiseMat, yellowSunnyMat, redLifeguardMat];
  const umbrellaCoords: Array<[number, number]> = [
    [-1008, -96], [-1008, -82], [-1008, -68],
    [-1012, -14], [-1012, -2], [-1012, 10],
    [-1012, 42], [-1012, 54], [-1012, 74], [-1012, 86],
    [-1012, 114], [-1012, 126], [-1012, 158], [-1012, 174],
    [-1021, -88], [-1021, -72], [-1021, 4], [-1021, 18],
    [-1021, 48], [-1021, 78], [-1021, 118], [-1021, 166],
  ];
  umbrellaCoords.forEach(([ux, uz], idx) => {
    const uy = getWestCoastalGroundY(ux, uz) ?? -0.35;
    const pole = new THREE.Mesh(umbrellaPoleGeo, whiteCoastalMat);
    pole.position.set(ux, uy + 1.15, uz);
    staticGroup.add(pole);
    const canopy = new THREE.Mesh(umbrellaConeGeo, umbrellaColors[idx % umbrellaColors.length]);
    canopy.position.set(ux, uy + 2.32, uz);
    staticGroup.add(canopy);
    // 2 Wooden Sun Loungers with bright towels facing the ocean (-X)
    [-1.15, 1.15].forEach((oz) => {
      addBox(1.85, 0.24, 0.72, woodDeckMat, ux - 0.1, uy + 0.18, uz + oz);
      addBox(0.55, 0.45, 0.68, whiteCoastalMat, ux + 0.65, uy + 0.42, uz + oz, staticGroup, [0, 0, -0.45]);
      addBox(1.25, 0.06, 0.62, umbrellaColors[(idx + 1) % umbrellaColors.length], ux - 0.25, uy + 0.32, uz + oz);
    });
  });

  // 4G. Sunset Check-in Beach Swing & Photo Frame (X = -1010, Z = 138..148)
  const swY = getWestCoastalGroundY(-1010.0, 142.0) ?? -0.36;
  addBox(0.18, 3.2, 0.18, bambooMat, -1010.0, swY + 1.6, 139.2);
  addBox(0.18, 3.2, 0.18, bambooMat, -1010.0, swY + 1.6, 142.8);
  addBox(0.22, 0.22, 4.1, bambooMat, -1010.0, swY + 3.15, 141.0);
  addBox(0.55, 0.09, 1.5, woodDeckMat, -1010.0, swY + 0.85, 141.0);
  addBox(0.04, 2.3, 0.04, whiteCoastalMat, -1010.0, swY + 1.98, 140.35);
  addBox(0.04, 2.3, 0.04, whiteCoastalMat, -1010.0, swY + 1.98, 141.65);

  // =========================================================================
  // 5. EXACT VERTEX-SLOPED GOLDEN SANDY BEACH + REAL 3D ROLLING SWELL & CURRENT OCEAN
  // =========================================================================
  const sandTex = createGoldenSandTexture();
  const sandMat = new THREE.MeshStandardMaterial({
    map: sandTex,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.0,
  });
  // Exact vertex-constructed beach & underwater seabed (X = -1074..-996, Z = -350..+510)
  // Smoothly carves the Sông Hàn river mouth (Z = -345..-165) down to riverbed depth (-3.45) so Sông Hàn flows cleanly into Biển Mỹ Khê Tây!
  const sandCenterZ = 80.0;
  const sandGeo = new THREE.PlaneGeometry(78.0, 860.0, 26, 48);
  sandGeo.rotateX(-Math.PI / 2);
  const sandPos = sandGeo.attributes.position;
  const sandColors = new Float32Array(sandPos.count * 3);
  for (let i = 0; i < sandPos.count; i++) {
    const wx = -1035.0 + sandPos.getX(i);
    const wz = sandCenterZ + sandPos.getZ(i);
    let wy: number;
    if (wx >= -1036.0) {
      wy = getWestCoastalGroundY(wx, 0) ?? -0.04;
    } else {
      const deepT = Math.min(1, (-1036.0 - wx) / 38.0);
      wy = -0.94 - deepT * 2.15;
    }

    // Carve natural estuarine channel across the Sông Hàn mouth (Z = -345..-165)
    let estuaryCut = 0;
    if (wz < -165.0 && wz > -345.0) {
      const southSpitT = THREE.MathUtils.clamp((-165.0 - wz) / 16.0, 0, 1);
      const northBankT = THREE.MathUtils.clamp((wz - -345.0) / 16.0, 0, 1);
      estuaryCut = Math.min(southSpitT, northBankT);
      const smoothCut = estuaryCut * estuaryCut * (3 - 2 * estuaryCut);
      wy = THREE.MathUtils.lerp(wy, -3.45, smoothCut);
    }
    sandPos.setY(i, wy);
    // Warm sunlit dry golden sand -> damp swash sand -> sandy turquoise seabed
    let r = 0.98;
    let g = 0.91;
    let b = 0.74;
    if (estuaryCut > 0.25) {
      r = THREE.MathUtils.lerp(r, 0.20, estuaryCut);
      g = THREE.MathUtils.lerp(g, 0.42, estuaryCut);
      b = THREE.MathUtils.lerp(b, 0.45, estuaryCut);
    } else if (wx < -1025.0 && wx >= -1037.0) {
      const wetT = (-1025.0 - wx) / 12.0;
      r = THREE.MathUtils.lerp(0.98, 0.76, wetT);
      g = THREE.MathUtils.lerp(0.91, 0.65, wetT);
      b = THREE.MathUtils.lerp(0.74, 0.46, wetT);
    } else if (wx < -1037.0) {
      const seaT = Math.min(1, (-1037.0 - wx) / 22.0);
      r = THREE.MathUtils.lerp(0.76, 0.24, seaT);
      g = THREE.MathUtils.lerp(0.65, 0.56, seaT);
      b = THREE.MathUtils.lerp(0.46, 0.62, seaT);
    }
    sandColors[i * 3] = r;
    sandColors[i * 3 + 1] = g;
    sandColors[i * 3 + 2] = b;
  }
  sandGeo.setAttribute('color', new THREE.BufferAttribute(sandColors, 3));
  sandGeo.computeVertexNormals();
  const sandMesh = new THREE.Mesh(sandGeo, sandMat);
  sandMesh.position.set(-1035.0, 0.0, sandCenterZ);
  oceanGroup.add(sandMesh);

  // Real-time 3D Vertex-Displaced Rolling Ocean Swell & Current Mesh (X = -1250 .. -1026, Z = -390 .. +470 — spans past Cửa Sông Hàn!)
  const oceanTex = createOceanWaterTexture();
  const oceanMat = new THREE.MeshStandardMaterial({
    map: oceanTex,
    vertexColors: true,
    roughness: 0.16,
    metalness: 0.22,
    transparent: true,
    opacity: 0.94,
  });
  const oceanWaveGeo = new THREE.PlaneGeometry(224.0, 860.0, 44, 68);
  oceanWaveGeo.rotateX(-Math.PI / 2);
  const oceanPosAttr = oceanWaveGeo.attributes.position;
  const oceanVertCount = oceanPosAttr.count;
  const oceanBaseLocalX = new Float32Array(oceanVertCount);
  const oceanBaseWorldX = new Float32Array(oceanVertCount);
  const oceanBaseWorldZ = new Float32Array(oceanVertCount);
  const oceanBaseColorR = new Float32Array(oceanVertCount);
  const oceanBaseColorG = new Float32Array(oceanVertCount);
  const oceanBaseColorB = new Float32Array(oceanVertCount);
  const oceanColorArray = new Float32Array(oceanVertCount * 3);
  const oceanCenterX = -1138.0;
  const oceanCenterZ = 40.0;

  for (let i = 0; i < oceanVertCount; i++) {
    const lx = oceanPosAttr.getX(i);
    const lz = oceanPosAttr.getZ(i);
    const wx = oceanCenterX + lx;
    const wz = oceanCenterZ + lz;
    oceanBaseLocalX[i] = lx;
    oceanBaseWorldX[i] = wx;
    oceanBaseWorldZ[i] = wz;

    // Depth-based tropical ocean gradient: crystal aqua shore -> vibrant turquoise swim zone -> deep sapphire offshore
    const distOffshore = Math.max(0, -1026.0 - wx);
    let br: number;
    let bg: number;
    let bb: number;
    if (distOffshore < 24.0) {
      const t = distOffshore / 24.0;
      br = THREE.MathUtils.lerp(0.32, 0.08, t);
      bg = THREE.MathUtils.lerp(0.88, 0.72, t);
      bb = THREE.MathUtils.lerp(0.94, 0.84, t);
    } else {
      const t = Math.min(1, (distOffshore - 24.0) / 140.0);
      br = THREE.MathUtils.lerp(0.08, 0.03, t);
      bg = THREE.MathUtils.lerp(0.72, 0.34, t);
      bb = THREE.MathUtils.lerp(0.84, 0.64, t);
    }
    // Blend jade-emerald Sông Hàn plume smoothly into turquoise ocean at the estuary mouth (Z = -345..-165, X = -1075..-1026)
    if (wz < -165.0 && wz > -345.0 && wx > -1075.0) {
      const plumeT = THREE.MathUtils.clamp((wx - -1075.0) / 49.0, 0, 1);
      br = THREE.MathUtils.lerp(br, 0.20, plumeT * 0.62);
      bg = THREE.MathUtils.lerp(bg, 0.44, plumeT * 0.62);
      bb = THREE.MathUtils.lerp(bb, 0.40, plumeT * 0.62);
    }
    oceanBaseColorR[i] = br;
    oceanBaseColorG[i] = bg;
    oceanBaseColorB[i] = bb;
    oceanColorArray[i * 3] = br;
    oceanColorArray[i * 3 + 1] = bg;
    oceanColorArray[i * 3 + 2] = bb;
    oceanPosAttr.setY(i, sampleOceanWaveY(wx, wz, 0));
  }
  const oceanColorAttr = new THREE.BufferAttribute(oceanColorArray, 3);
  oceanWaveGeo.setAttribute('color', oceanColorAttr);
  oceanWaveGeo.computeVertexNormals();
  const oceanMesh = new THREE.Mesh(oceanWaveGeo, oceanMat);
  oceanMesh.position.set(oceanCenterX, 0.0, oceanCenterZ);
  oceanGroup.add(oceanMesh);

  // Far-horizon deep cobalt ocean skirt (X = -1700 .. -1246) blending smoothly to the western horizon
  const farOceanMat = new THREE.MeshStandardMaterial({
    color: 0x074b83,
    roughness: 0.24,
    metalness: 0.18,
  });
  const farOceanMesh = new THREE.Mesh(new THREE.PlaneGeometry(460.0, 1280.0), farOceanMat);
  farOceanMesh.rotation.x = -Math.PI / 2;
  farOceanMesh.position.set(-1476.0, WEST_COAST_WATER_Y - 0.08, 40.0);
  oceanGroup.add(farOceanMesh);

  // 4 Animated Curved Rolling Shore-Break Surf Foam Ribbons surging smoothly along the golden beach (ending cleanly south of Cửa Sông Hàn Z = -165!)
  const foamTex = createSurfFoamTexture();
  const surfWaveCenterZ = 122.5;
  const surfWaves: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    phase: number;
    baseZArr: Float32Array;
    baseLocalXArr: Float32Array;
  }> = [];
  for (let w = 0; w < 4; w++) {
    const fMat = new THREE.MeshBasicMaterial({
      map: foamTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const fGeo = new THREE.PlaneGeometry(7.2, 575.0, 4, 42);
    fGeo.rotateX(-Math.PI / 2);
    const fPos = fGeo.attributes.position;
    const baseZArr = new Float32Array(fPos.count);
    const baseLocalXArr = new Float32Array(fPos.count);
    for (let i = 0; i < fPos.count; i++) {
      baseLocalXArr[i] = fPos.getX(i);
      baseZArr[i] = fPos.getZ(i);
    }
    const fMesh = new THREE.Mesh(fGeo, fMat);
    fMesh.position.set(-1034.0, 0.0, surfWaveCenterZ);
    fMesh.renderOrder = 2;
    oceanGroup.add(fMesh);
    surfWaves.push({ mesh: fMesh, mat: fMat, phase: w * 0.25, baseZArr, baseLocalXArr });
  }

  // Swimming Safety Buoy Line at X = -1052 (individual buoys riding live 3D ocean swells!)
  const buoyGroup = new THREE.Group();
  const buoyGeo = new THREE.SphereGeometry(0.32, 8, 6);
  const buoyItems: Array<{ mesh: THREE.Mesh; x: number; z: number }> = [];
  for (let bz = -110; bz <= 185; bz += 14) {
    const buoy = new THREE.Mesh(buoyGeo, bz % 28 === 0 ? yellowSunnyMat : coralMat);
    buoy.position.set(-1052.0, sampleOceanWaveY(-1052.0, bz, 0) + 0.08, bz);
    buoyGroup.add(buoy);
    buoyItems.push({ mesh: buoy, x: -1052.0, z: bz });
  }
  // Rope connecting buoys
  const buoyRope = addBox(0.06, 0.06, 295.0, whiteCoastalMat, -1052.0, WEST_COAST_WATER_Y + 0.04, 37.5, buoyGroup);
  oceanGroup.add(buoyGroup);

  // Offshore Sailboats & Anchored Jet-Skis riding live 3D ocean swells!
  const bobbingBoats: Array<{ grp: THREE.Group; x: number; z: number; yOffset: number; phase: number }> = [];
  [
    { x: -1086, z: -20, scale: 1.0, phase: 0.0 },
    { x: -1108, z: 112, scale: 1.15, phase: 2.1 },
  ].forEach((b) => {
    const boat = new THREE.Group();
    boat.position.set(b.x, sampleOceanWaveY(b.x, b.z, 0) + 0.08, b.z);
    boat.scale.setScalar(b.scale);
    addBox(2.4, 0.75, 7.2, whiteCoastalMat, 0, 0.25, 0, boat);
    addBox(2.5, 0.22, 7.3, oceanBlueMat, 0, 0.55, 0, boat);
    addBox(0.14, 7.2, 0.14, inoxMat, 0, 3.8, 0.4, boat);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(2.3, 6.2, 3), whiteCoastalMat);
    sail.scale.set(0.12, 1.0, 1.0);
    sail.position.set(0, 4.1, -0.5);
    boat.add(sail);
    oceanGroup.add(boat);
    bobbingBoats.push({ grp: boat, x: b.x, z: b.z, yOffset: 0.08, phase: b.phase });
  });
  // 2 Anchored Jet-Skis floating near the Jetski Rental zone (X = -1042, Z = 94 & 105)
  [
    { x: -1041.0, z: 94.0, mat: coralMat, phase: 0.7 },
    { x: -1042.5, z: 105.0, mat: yellowSunnyMat, phase: 1.9 },
  ].forEach((js) => {
    const jGrp = new THREE.Group();
    jGrp.position.set(js.x, sampleOceanWaveY(js.x, js.z, 0) + 0.06, js.z);
    jGrp.rotation.y = Math.PI * 0.42;
    addBox(0.95, 0.44, 2.5, js.mat, 0, 0.18, 0, jGrp);
    addBox(0.65, 0.36, 0.9, poleDarkMat, 0, 0.45, -0.25, jGrp);
    addBox(0.75, 0.08, 0.12, whiteCoastalMat, 0, 0.68, 0.45, jGrp);
    oceanGroup.add(jGrp);
    bobbingBoats.push({ grp: jGrp, x: js.x, z: js.z, yOffset: 0.06, phase: js.phase });
  });

  // =========================================================================
  // 6. ANIMATED 3D BEACH NPCS: MALE SWIM TRUNKS ("QUẦN ĐÙI") & FEMALE BIKINI + RAIN-SAFE VISIBILITY
  // =========================================================================
  const skinPalette = [0xf1c29b, 0xe6b48a, 0xdba074, 0xc98a5e];
  const skinMats = skinPalette.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62 }));
  const hairPalette = [0x1e293b, 0x3b2618, 0x5c3a21, 0x7c4a26, 0x111827];
  const hairMats = hairPalette.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 }));
  const maleTrunkPalette = [0x0ea5e9, 0xf97316, 0x10b981, 0xef4444, 0x1d4ed8, 0x06b6d4, 0x14b8a6, 0xeab308];
  const maleTrunkMats = maleTrunkPalette.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62 }));
  const femaleBikiniPalette = [0xf43f5e, 0xec4899, 0x06b6d4, 0xfacc15, 0xa855f7, 0xfb7185, 0x14b8a6, 0xf97316];
  const femaleBikiniMats = femaleBikiniPalette.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.56 }));
  const ringMats = [
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.32 }),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.32 }),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.32 }),
    new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.32 }),
  ];

  // Shared composite character geometries (smooth capsule limbs + sunglasses, zero per-frame allocations)
  const headGeo = new THREE.SphereGeometry(0.145, 10, 8);
  const neckGeo = new THREE.CylinderGeometry(0.052, 0.06, 0.09, 8);
  const hairGeo = new THREE.SphereGeometry(0.156, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const sunglassesGeo = new THREE.BoxGeometry(0.21, 0.055, 0.045);
  const femaleLongHairGeo = new THREE.BoxGeometry(0.25, 0.36, 0.11);
  const femalePonytailGeo = new THREE.SphereGeometry(0.085, 8, 6);
  const shoulderGeo = new THREE.SphereGeometry(0.075, 8, 6);
  const maleChestGeo = new THREE.BoxGeometry(0.39, 0.31, 0.21);
  const maleAbsGeo = new THREE.BoxGeometry(0.34, 0.21, 0.19);
  const maleTrunksHipGeo = new THREE.BoxGeometry(0.365, 0.18, 0.22);
  const maleTrunksBandGeo = new THREE.BoxGeometry(0.375, 0.045, 0.23);
  const maleTrunksLegGeo = new THREE.CylinderGeometry(0.078, 0.082, 0.21, 8);
  const femaleUpperTorsoGeo = new THREE.BoxGeometry(0.31, 0.16, 0.18);
  const femaleMidriffGeo = new THREE.BoxGeometry(0.24, 0.19, 0.16);
  const femaleBikiniBandGeo = new THREE.BoxGeometry(0.325, 0.115, 0.20);
  const femaleBikiniCupGeo = new THREE.SphereGeometry(0.074, 8, 6);
  const femaleBikiniStrapGeo = new THREE.BoxGeometry(0.032, 0.15, 0.155);
  const femaleBikiniHipGeo = new THREE.BoxGeometry(0.325, 0.115, 0.20);
  const femaleBikiniVGeo = new THREE.BoxGeometry(0.19, 0.09, 0.195);
  const limbGeo = new THREE.CapsuleGeometry(0.048, 0.38, 4, 8);
  const femaleLimbGeo = new THREE.CapsuleGeometry(0.041, 0.37, 4, 8);
  const lowerLegGeo = new THREE.CapsuleGeometry(0.055, 0.38, 4, 8);
  const fullBareLegGeo = new THREE.CapsuleGeometry(0.052, 0.54, 4, 8);
  const swimRingGeo = new THREE.TorusGeometry(0.36, 0.13, 8, 14);
  swimRingGeo.rotateX(Math.PI / 2);

  /**
   * Builds a composite 3D standing beachgoer (feet at Y = 0.0, top of head ≈ Y = 1.66):
   * - Male: bare athletic chest/torso + colorful swim trunks ("quần đùi bơi") with waistband trim & shorts legs
   * - Female: slender waist with bare midriff + two-piece bikini (contoured bra top + shoulder straps + bikini briefs) + long hair/ponytail
   */
  const buildBeachBatherModel = (
    gender: BeachNpcGender,
    idx: number,
    includeLegs: boolean
  ): {
    root: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
  } => {
    const grp = new THREE.Group();
    const sMat = skinMats[idx % skinMats.length];
    const hMat = hairMats[idx % hairMats.length];
    const suitMat =
      gender === 'male'
        ? maleTrunkMats[idx % maleTrunkMats.length]
        : femaleBikiniMats[idx % femaleBikiniMats.length];

    // Neck, Head, Hair & Stylish Beach Sunglasses
    const neck = new THREE.Mesh(neckGeo, sMat);
    neck.position.set(0, 1.32, 0);
    grp.add(neck);
    const head = new THREE.Mesh(headGeo, sMat);
    head.position.set(0, 1.48, 0);
    grp.add(head);
    const hair = new THREE.Mesh(hairGeo, hMat);
    hair.position.set(0, 1.50, 0);
    grp.add(hair);
    if (idx % 2 === 0) {
      const shades = new THREE.Mesh(sunglassesGeo, poleDarkMat);
      shades.position.set(0, 1.495, 0.13);
      grp.add(shades);
    }

    if (gender === 'male') {
      // Bare masculine chest & abs
      const chest = new THREE.Mesh(maleChestGeo, sMat);
      chest.position.set(0, 1.13, 0);
      grp.add(chest);
      const abs = new THREE.Mesh(maleAbsGeo, sMat);
      abs.position.set(0, 0.89, 0);
      grp.add(abs);
      [-0.20, 0.20].forEach((sx) => {
        const sh = new THREE.Mesh(shoulderGeo, sMat);
        sh.position.set(sx, 1.24, 0);
        grp.add(sh);
      });

      // Colorful Swim Trunks ("quần đùi bơi") with white waistband stripe
      const trunksHip = new THREE.Mesh(maleTrunksHipGeo, suitMat);
      trunksHip.position.set(0, 0.72, 0);
      grp.add(trunksHip);
      const band = new THREE.Mesh(maleTrunksBandGeo, whiteCoastalMat);
      band.position.set(0, 0.805, 0);
      grp.add(band);
    } else {
      // Feminine hairstyle (alternating long flowing hair & high ponytail)
      if (idx % 2 === 0) {
        const longHair = new THREE.Mesh(femaleLongHairGeo, hMat);
        longHair.position.set(0, 1.34, -0.105);
        grp.add(longHair);
      } else {
        const bun = new THREE.Mesh(femalePonytailGeo, hMat);
        bun.position.set(0, 1.54, -0.16);
        grp.add(bun);
        const tail = new THREE.Mesh(femaleLongHairGeo, hMat);
        tail.scale.set(0.55, 0.75, 0.7);
        tail.position.set(0, 1.37, -0.19);
        tail.rotation.x = 0.22;
        grp.add(tail);
      }

      // Bare feminine upper shoulders & bare midriff/waist
      const upperSkin = new THREE.Mesh(femaleUpperTorsoGeo, sMat);
      upperSkin.position.set(0, 1.20, 0);
      grp.add(upperSkin);
      const midriff = new THREE.Mesh(femaleMidriffGeo, sMat);
      midriff.position.set(0, 0.93, 0);
      grp.add(midriff);

      // Two-Piece Bikini Top (bra band + sculpted cups + halter/shoulder straps)
      const bikiniBand = new THREE.Mesh(femaleBikiniBandGeo, suitMat);
      bikiniBand.position.set(0, 1.10, 0.005);
      grp.add(bikiniBand);
      [-0.078, 0.078].forEach((cx) => {
        const cup = new THREE.Mesh(femaleBikiniCupGeo, suitMat);
        cup.scale.set(1.05, 0.92, 0.95);
        cup.position.set(cx, 1.105, 0.085);
        grp.add(cup);
        const strap = new THREE.Mesh(femaleBikiniStrapGeo, suitMat);
        strap.position.set(cx * 1.18, 1.22, 0.0);
        grp.add(strap);
      });

      // Matching Two-Piece Bikini Bottom (low-rise briefs leaving bare waist & thighs visible)
      const bikiniHip = new THREE.Mesh(femaleBikiniHipGeo, suitMat);
      bikiniHip.position.set(0, 0.77, 0);
      grp.add(bikiniHip);
      const bikiniV = new THREE.Mesh(femaleBikiniVGeo, suitMat);
      bikiniV.position.set(0, 0.695, 0.005);
      grp.add(bikiniV);
    }

    // Articulated Arms (bare skin)
    const armOffsetX = gender === 'male' ? 0.245 : 0.20;
    const armMeshGeo = gender === 'male' ? limbGeo : femaleLimbGeo;
    const leftArm = new THREE.Group();
    leftArm.position.set(-armOffsetX, 1.24, 0);
    const laM = new THREE.Mesh(armMeshGeo, sMat);
    laM.position.y = -0.21;
    leftArm.add(laM);
    grp.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(armOffsetX, 1.24, 0);
    const raM = new THREE.Mesh(armMeshGeo, sMat);
    raM.position.y = -0.21;
    rightArm.add(raM);
    grp.add(rightArm);

    // Articulated Legs (male has swim-trunk short cuffs over upper thighs; female has full bare legs below bikini bottom)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.095, 0.66, 0);
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.095, 0.66, 0);
    if (includeLegs) {
      if (gender === 'male') {
        const lShort = new THREE.Mesh(maleTrunksLegGeo, suitMat);
        lShort.position.y = -0.07;
        leftLeg.add(lShort);
        const lSkin = new THREE.Mesh(lowerLegGeo, sMat);
        lSkin.position.y = -0.40;
        leftLeg.add(lSkin);

        const rShort = new THREE.Mesh(maleTrunksLegGeo, suitMat);
        rShort.position.y = -0.07;
        rightLeg.add(rShort);
        const rSkin = new THREE.Mesh(lowerLegGeo, sMat);
        rSkin.position.y = -0.40;
        rightLeg.add(rSkin);
      } else {
        const lSkin = new THREE.Mesh(fullBareLegGeo, sMat);
        lSkin.position.y = -0.33;
        leftLeg.add(lSkin);
        const rSkin = new THREE.Mesh(fullBareLegGeo, sMat);
        rSkin.position.y = -0.33;
        rightLeg.add(rSkin);
      }
    }
    grp.add(leftLeg);
    grp.add(rightLeg);

    return { root: grp, leftArm, rightArm, leftLeg, rightLeg };
  };

  const swimmers: SwimmerAgent[] = [];
  BEACH_SWIMMER_PROFILES.forEach((sp, idx) => {
    const model = buildBeachBatherModel(sp.gender, idx, true);
    const grp = model.root;
    // Waders stand in knee-to-hip deep clear surf so swim trunks & bikinis are clearly visible; floaters & swimmers ride chest-deep swells
    const baseY = sp.mode === 'wade' ? WEST_COAST_WATER_Y - 0.56 : WEST_COAST_WATER_Y - 0.96;
    grp.position.set(sp.x, baseY, sp.z);
    grp.rotation.y = sp.yaw;

    if (sp.mode === 'float_ring') {
      const ring = new THREE.Mesh(swimRingGeo, ringMats[idx % ringMats.length]);
      ring.position.set(0, 0.94, 0);
      grp.add(ring);
    }

    dynamicGroup.add(grp);
    swimmers.push({
      root: grp,
      leftArm: model.leftArm,
      rightArm: model.rightArm,
      baseX: sp.x,
      baseZ: sp.z,
      baseY,
      phase: idx * 0.91,
      mode: sp.mode,
      speed: 0.75 + (idx % 3) * 0.18,
    });
  });

  // Dynamic Sunbathers on Beach Loungers (male swim trunks & female bikini — hidden automatically when raining!)
  const sunbathers: THREE.Group[] = [];
  const sunbatherSpots: Array<{ x: number; z: number; gender: BeachNpcGender }> = [
    { x: -1008.1, z: -83.15, gender: 'female' },
    { x: -1012.1, z: -3.15, gender: 'male' },
    { x: -1012.1, z: 43.15, gender: 'female' },
    { x: -1012.1, z: 75.15, gender: 'male' },
    { x: -1021.1, z: 5.15, gender: 'female' },
    { x: -1021.1, z: 49.15, gender: 'male' },
    { x: -1021.1, z: 119.15, gender: 'female' },
  ];
  sunbatherSpots.forEach((spot, idx) => {
    const sy = (getWestCoastalGroundY(spot.x, spot.z) ?? -0.35) + 0.42;
    const sbModel = buildBeachBatherModel(spot.gender, idx + 3, true);
    const sbGrp = new THREE.Group();
    sbGrp.position.set(spot.x, sy, spot.z);
    // Recline supine along the lounger (head toward +X promenade, feet toward -X ocean)
    sbModel.root.rotation.set(0, 0, -Math.PI / 2 + 0.14);
    sbModel.root.position.set(-0.78, 0.08, 0);
    sbModel.leftArm.rotation.z = -0.22;
    sbModel.rightArm.rotation.z = 0.22;
    sbGrp.add(sbModel.root);
    dynamicGroup.add(sbGrp);
    sunbathers.push(sbGrp);
  });

  // 4 Beach Volleyball Players facing each other across the net (Z = -47) — 2 male (swim trunks) & 2 female (bikini)
  const vbPlayers: Array<{ root: THREE.Group; baseY: number; phase: number }> = [];
  [
    { x: -1015.0, z: -51.5, yaw: 0, gender: 'male' as BeachNpcGender },
    { x: -1011.0, z: -50.8, yaw: 0, gender: 'female' as BeachNpcGender },
    { x: -1015.0, z: -42.5, yaw: Math.PI, gender: 'female' as BeachNpcGender },
    { x: -1011.0, z: -43.2, yaw: Math.PI, gender: 'male' as BeachNpcGender },
  ].forEach((vp, idx) => {
    const py = getWestCoastalGroundY(vp.x, vp.z) ?? vbY;
    const model = buildBeachBatherModel(vp.gender, idx + 5, true);
    model.root.position.set(vp.x, py, vp.z);
    model.root.rotation.y = vp.yaw;
    model.leftArm.rotation.x = -0.65;
    model.rightArm.rotation.x = -0.65;
    dynamicGroup.add(model.root);
    vbPlayers.push({ root: model.root, baseY: py, phase: idx * 1.4 });
  });

  // =========================================================================
  // 6B. CITY-GRADE QUATERNIUS GLB HUMAN NPCS ON PROMENADE, BEACH BAR, LIFEGUARD TOWERS & RIVERFRONT
  // (Matches full city NPC quality with real skeletal Idle/Walk/Sit animations + rain umbrellas!)
  // =========================================================================
  const coastalStationaryNpcs: CoastalGlbStationaryAgent[] = [];
  const spawnStationaryCoastalGlbNpc = (opts: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    spec: ReturnType<typeof pickStationaryCivilianModel>;
    animState: 'Idle' | 'Sit' | 'Wave';
    allowRainUmbrella: boolean;
    hideInRain: boolean;
    phaseOffset: number;
  }) => {
    const grp = new THREE.Group();
    grp.position.set(opts.x, opts.y, opts.z);
    grp.rotation.y = opts.yaw;
    const glb = attachGlbHumanToNpc({
      modelSource: opts.spec.modelSource,
      hostGroup: grp,
      fallbackMeshes: [],
      targetHeight: opts.spec.targetHeight,
      rotationY: opts.spec.rotationY ?? 0,
      clipProfile: opts.spec.clipProfile,
      initialState: opts.animState,
      lodMixerRadius: 56,
      phaseOffset: opts.phaseOffset,
      allowRainUmbrella: opts.allowRainUmbrella,
    });
    dynamicGroup.add(grp);
    coastalStationaryNpcs.push({
      root: grp,
      glb,
      x: opts.x,
      z: opts.z,
      hideInRain: opts.hideInRain,
      animState: opts.animState,
    });
  };

  // 2 Real GLB Lifeguards watching over the beach from the elevated Watchtowers (dry under tower canopy)
  [-26.0, 62.0].forEach((lz, i) => {
    const gy = getWestCoastalGroundY(-1006.0, lz) ?? -0.26;
    spawnStationaryCoastalGlbNpc({
      x: -1006.3,
      y: gy + 3.22,
      z: lz,
      yaw: -Math.PI / 2,
      spec: WORKER_GUARD_NPC_MODEL,
      animState: 'Idle',
      allowRainUmbrella: false,
      hideInRain: false,
      phaseOffset: i * 1.9,
    });
  });

  // 3 GLB Bartenders working behind THE DAWN warm wooden bar counter (dry under terracotta hip roof)
  spawnStationaryCoastalGlbNpc({
    x: -990.3,
    y: 0.08,
    z: 60.2,
    yaw: Math.PI / 2,
    spec: CASHIER_NPC_MODEL,
    animState: 'Idle',
    allowRainUmbrella: false,
    hideInRain: false,
    phaseOffset: 0.4,
  });
  spawnStationaryCoastalGlbNpc({
    x: -990.2,
    y: 0.08,
    z: 63.0,
    yaw: Math.PI / 2,
    spec: pickStationaryCivilianModel(19),
    animState: 'Wave',
    allowRainUmbrella: false,
    hideInRain: false,
    phaseOffset: 1.6,
  });
  spawnStationaryCoastalGlbNpc({
    x: -990.3,
    y: 0.08,
    z: 65.8,
    yaw: Math.PI / 2,
    spec: pickStationaryCivilianModel(23),
    animState: 'Idle',
    allowRainUmbrella: false,
    hideInRain: false,
    phaseOffset: 2.9,
  });

  // 8 Lively GLB Guests enjoying drinks on high bar stools around THE DAWN glowing LED cocktail tables (clear out in rain)
  [
    // Left inner table (-985.55, 68.2) couple facing each other across the glowing tabletop
    { x: -985.55, z: 69.12, yaw: Math.PI, seed: 3, sit: true },
    { x: -985.55, z: 67.28, yaw: 0, seed: 7, sit: true },
    // Front-left hero table (-983.85, 66.2)
    { x: -984.77, z: 66.2, yaw: Math.PI / 2, seed: 11, sit: true },
    // Right inner table (-985.55, 57.6) friends socializing
    { x: -985.55, z: 58.52, yaw: Math.PI, seed: 15, sit: true },
    { x: -985.55, z: 56.68, yaw: 0, seed: 21, sit: true },
    // Front-right hero table (-983.85, 59.8)
    { x: -984.77, z: 59.8, yaw: Math.PI / 2, seed: 25, sit: true },
    // Far-right glowing table (-985.2, 54.6) standing & seated lounge guests
    { x: -985.2, z: 53.68, yaw: 0, seed: 29, sit: true },
    { x: -984.15, z: 55.6, yaw: -Math.PI * 0.72, seed: 33, sit: false },
  ].forEach((guest, idx) => {
    spawnStationaryCoastalGlbNpc({
      x: guest.x,
      y: guest.sit ? 0.30 : 0.05,
      z: guest.z,
      yaw: guest.yaw,
      spec: guest.sit ? pickSeatedCivilianModel(guest.seed) : pickStationaryCivilianModel(guest.seed),
      animState: guest.sit ? 'Sit' : 'Idle',
      allowRainUmbrella: false,
      hideInRain: true,
      phaseOffset: idx * 0.95,
    });
  });

  // GLB Attendants at Trạm Mô Tô Nước & Trạm Tắm Nước Ngọt + 2 Oceanfront Viewers (carry umbrellas in rain!)
  spawnStationaryCoastalGlbNpc({
    x: -987.2,
    y: 0.0,
    z: 99.5,
    yaw: Math.PI / 2,
    spec: WORKER_GUARD_NPC_MODEL,
    animState: 'Wave',
    allowRainUmbrella: true,
    hideInRain: false,
    phaseOffset: 1.5,
  });
  spawnStationaryCoastalGlbNpc({
    x: -986.4,
    y: 0.0,
    z: 2.2,
    yaw: Math.PI / 2,
    spec: pickStationaryCivilianModel(5),
    animState: 'Idle',
    allowRainUmbrella: true,
    hideInRain: false,
    phaseOffset: 3.2,
  });
  spawnStationaryCoastalGlbNpc({
    x: -994.2,
    y: 0.0,
    z: 21.0,
    yaw: -Math.PI / 2,
    spec: pickStationaryCivilianModel(9),
    animState: 'Idle',
    allowRainUmbrella: true,
    hideInRain: false,
    phaseOffset: 0.9,
  });
  spawnStationaryCoastalGlbNpc({
    x: -994.2,
    y: 0.0,
    z: -156.5,
    yaw: -Math.PI * 0.72,
    spec: pickStationaryCivilianModel(13),
    animState: 'Idle',
    allowRainUmbrella: true,
    hideInRain: false,
    phaseOffset: 2.7,
  });

  // 10 Strolling City-Grade GLB Promenade & Riverfront Walkers + 2 Wet-Sand Swimwear Walkers
  const beachWalkers: BeachWalkerAgent[] = [];
  const walkerPaths: Array<{
    speed: number;
    isBeachBather: boolean;
    gender: BeachNpcGender;
    waypoints: Array<{ x: number; z: number }>;
  }> = [
    // City-grade GLB walkers along Phố Đi Bộ Ven Biển Võ Nguyên Giáp (auto rain umbrellas!)
    { speed: 1.12, isBeachBather: false, gender: 'male', waypoints: [{ x: -990.5, z: -135 }, { x: -990.5, z: 165 }, { x: -985.2, z: 165 }, { x: -985.2, z: -135 }] },
    { speed: 1.16, isBeachBather: false, gender: 'female', waypoints: [{ x: -985.8, z: 150 }, { x: -985.8, z: -115 }, { x: -991.0, z: -115 }, { x: -991.0, z: 150 }] },
    { speed: 1.05, isBeachBather: false, gender: 'male', waypoints: [{ x: -991.5, z: 45 }, { x: -991.5, z: 280 }, { x: -985.8, z: 280 }, { x: -985.8, z: 45 }] },
    { speed: 1.10, isBeachBather: false, gender: 'female', waypoints: [{ x: -991.2, z: -45 }, { x: -991.2, z: 82 }, { x: -985.4, z: 82 }, { x: -985.4, z: -45 }] },
    { speed: 1.18, isBeachBather: false, gender: 'male', waypoints: [{ x: -984.6, z: 190 }, { x: -984.6, z: 345 }, { x: -991.4, z: 345 }, { x: -991.4, z: 190 }] },
    { speed: 1.08, isBeachBather: false, gender: 'female', waypoints: [{ x: -986.2, z: -156 }, { x: -986.2, z: 24 }, { x: -992.0, z: 24 }, { x: -992.0, z: -156 }] },
    { speed: 1.14, isBeachBather: false, gender: 'male', waypoints: [{ x: -962.6, z: -120 }, { x: -962.6, z: 12 }, { x: -961.4, z: 12 }, { x: -961.4, z: -120 }] },
    { speed: 1.11, isBeachBather: false, gender: 'female', waypoints: [{ x: -962.6, z: 48 }, { x: -962.6, z: 240 }, { x: -961.4, z: 240 }, { x: -961.4, z: 48 }] },
    // Scenic Bờ Kè Ven Sông Bạch Đằng Tây walkers linking Biển <-> Sông Hàn!
    { speed: 1.15, isBeachBather: false, gender: 'male', waypoints: [{ x: -955.0, z: -157.5 }, { x: -720.0, z: -157.5 }, { x: -720.0, z: -161.0 }, { x: -955.0, z: -161.0 }] },
    { speed: 1.09, isBeachBather: false, gender: 'female', waypoints: [{ x: -710.0, z: -158.0 }, { x: -460.0, z: -158.0 }, { x: -460.0, z: -161.2 }, { x: -710.0, z: -161.2 }] },
    // Wet-sand swimwear walkers along shoreline (male swim trunks & female bikini — hide automatically in rain!)
    { speed: 1.15, isBeachBather: true, gender: 'female', waypoints: [{ x: -1028.0, z: -80 }, { x: -1028.0, z: 145 }, { x: -1025.0, z: 145 }, { x: -1025.0, z: -80 }] },
    { speed: 1.05, isBeachBather: true, gender: 'male', waypoints: [{ x: -1027.0, z: 130 }, { x: -1027.0, z: -70 }, { x: -1024.0, z: -70 }, { x: -1024.0, z: 130 }] },
  ];

  walkerPaths.forEach((wp, idx) => {
    let grp: THREE.Group;
    let leftArm: THREE.Object3D | undefined;
    let rightArm: THREE.Object3D | undefined;
    let leftLeg: THREE.Object3D | undefined;
    let rightLeg: THREE.Object3D | undefined;
    let glb: GlbHumanHandle | undefined;

    if (wp.isBeachBather) {
      const bather = buildBeachBatherModel(wp.gender, idx + 7, true);
      grp = bather.root;
      leftArm = bather.leftArm;
      rightArm = bather.rightArm;
      leftLeg = bather.leftLeg;
      rightLeg = bather.rightLeg;
    } else {
      grp = new THREE.Group();
      const spec = pickOutsideNpcModel(idx * 5 + 3);
      glb = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: grp,
        fallbackMeshes: [],
        targetHeight: spec.targetHeight,
        rotationY: spec.rotationY ?? 0,
        clipProfile: spec.clipProfile,
        initialState: 'Walk',
        lodMixerRadius: 58,
        phaseOffset: idx * 0.87,
        allowRainUmbrella: true,
      });
    }

    const segLens: number[] = [];
    let totalDist = 0;
    for (let s = 0; s < wp.waypoints.length; s++) {
      const a = wp.waypoints[s];
      const b = wp.waypoints[(s + 1) % wp.waypoints.length];
      const l = Math.hypot(b.x - a.x, b.z - a.z);
      segLens.push(l);
      totalDist += l;
    }
    const startDist = ((idx * 0.23) % 1) * totalDist;
    grp.position.set(wp.waypoints[0].x, getWestCoastalGroundY(wp.waypoints[0].x, wp.waypoints[0].z) ?? 0, wp.waypoints[0].z);
    dynamicGroup.add(grp);
    beachWalkers.push({
      root: grp,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      glb,
      waypoints: wp.waypoints,
      segLens,
      totalDist,
      distPos: startDist,
      speed: wp.speed,
      phase: idx * 1.17,
      isBeachBather: wp.isBeachBather,
    });
  });

  // =========================================================================
  // 7. COASTAL BOULEVARD CARS & MOTORBIKES (COMPACTED DRAW CALLS!)
  // =========================================================================
  const coastalVehicles: CoastalVehicleAgent[] = [];
  const createVehicleRoute = (
    waypoints: Array<{ x: number; z: number }>,
    startFrac: number,
    speed: number,
    isMoto: boolean,
    color: number,
    carVariant: CityCarVariant = 'sedan'
  ) => {
    const built = isMoto
      ? buildCityMotorbikeMesh({
          color,
          variant: 'scooter',
          helmetColor: 0xf8fafc,
          jacketColor: 0x0369a1,
          includeRider: true,
          noMerge: true,
        })
      : buildCityCarMesh({
          color,
          variant: carVariant,
          headlightIntensity: 0.85,
          brakeIntensity: 0.65,
          noMerge: true,
        });
    compactDynamicVehicleMeshes(
      built.group,
      built.wheels,
      'riderGroup' in built && built.riderGroup ? (built.riderGroup as THREE.Group) : undefined
    );

    const segLens: number[] = [];
    let totalDist = 0;
    for (let s = 0; s < waypoints.length; s++) {
      const a = waypoints[s];
      const b = waypoints[(s + 1) % waypoints.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      segLens.push(len);
      totalDist += len;
    }
    const startDist = (startFrac * totalDist) % totalDist;
    const initA = waypoints[0];
    const initB = waypoints[1];
    const initYaw = Math.atan2(initB.x - initA.x, initB.z - initA.z);
    built.group.position.set(initA.x, -0.26, initA.z);
    built.group.rotation.y = initYaw;
    dynamicGroup.add(built.group);

    coastalVehicles.push({
      root: built.group,
      wheels: built.wheels,
      wheelR: built.wheelR,
      headlightMat: built.headlightMat,
      brakeMat: built.brakeMat,
      waypoints,
      segLens,
      totalDist,
      distPos: startDist,
      baseSpeed: speed,
      currentYaw: initYaw,
      isMoto,
    });
  };

  // Full N-S Coastal Boulevard Cars (4) & Motorbikes (6)
  const coastalLoopOuter = [
    { x: -977.4, z: -155 },
    { x: -977.4, z: 355 },
    { x: -969.0, z: 355 },
    { x: -969.0, z: -155 },
  ];
  const coastalLoopInner = [
    { x: -975.4, z: -152 },
    { x: -975.4, z: 352 },
    { x: -971.0, z: 352 },
    { x: -971.0, z: -152 },
  ];
  // T-Junction Turning Loops (entering from Đại Lộ Trung Tâm -> turning North/South along the coast!)
  const tJunctionTurnSouth = [
    { x: -920, z: 24.4 },
    { x: -977.4, z: 24.4 },
    { x: -977.4, z: 348 },
    { x: -969.0, z: 348 },
    { x: -969.0, z: 33.6 },
    { x: -920, z: 33.6 },
  ];
  const tJunctionTurnNorth = [
    { x: -910, z: 24.4 },
    { x: -969.0, z: 24.4 },
    { x: -969.0, z: -152 },
    { x: -977.4, z: -152 },
    { x: -977.4, z: 33.6 },
    { x: -910, z: 33.6 },
  ];

  createVehicleRoute(coastalLoopOuter, 0.08, 9.2, false, 0xf8fafc, 'suv');
  createVehicleRoute(coastalLoopOuter, 0.34, 8.8, false, 0x06b6d4, 'sedan');
  createVehicleRoute(coastalLoopOuter, 0.62, 9.5, false, 0xef4444, 'coupe');
  createVehicleRoute(coastalLoopOuter, 0.85, 8.6, false, 0xfacc15, 'hatchback');
  createVehicleRoute(tJunctionTurnSouth, 0.18, 8.4, false, 0x2563eb, 'sedan');
  createVehicleRoute(tJunctionTurnNorth, 0.48, 8.6, false, 0x10b981, 'suv');

  // Scenic Riverfront Connector Loop: Đường Ven Biển Võ Nguyên Giáp <-> Đường Ven Sông Bạch Đằng Tây <-> Góc Tây Bạch Đằng
  const riverfrontConnectorLoop = [
    { x: -969.0, z: -141.0 },
    { x: -223.4, z: -141.0 },
    { x: -223.4, z: -120.5 },
    { x: -231.6, z: -120.5 },
    { x: -231.6, z: -149.4 },
    { x: -969.0, z: -149.4 },
  ];
  createVehicleRoute(riverfrontConnectorLoop, 0.12, 9.6, false, 0x38bdf8, 'suv');
  createVehicleRoute(riverfrontConnectorLoop, 0.58, 9.2, false, 0xf8fafc, 'sedan');
  createVehicleRoute(riverfrontConnectorLoop, 0.34, 8.8, true, 0xf97316);
  createVehicleRoute(riverfrontConnectorLoop, 0.80, 9.0, true, 0x10b981);

  createVehicleRoute(coastalLoopInner, 0.05, 8.4, true, 0xf97316);
  createVehicleRoute(coastalLoopInner, 0.24, 8.9, true, 0x0284c7);
  createVehicleRoute(coastalLoopInner, 0.47, 8.2, true, 0xf8fafc);
  createVehicleRoute(coastalLoopInner, 0.69, 9.0, true, 0xef4444);
  createVehicleRoute(coastalLoopInner, 0.88, 8.5, true, 0x16a34a);
  createVehicleRoute(tJunctionTurnSouth, 0.55, 8.0, true, 0x06b6d4);
  createVehicleRoute(tJunctionTurnNorth, 0.25, 8.2, true, 0xfacc15);
  createVehicleRoute(tJunctionTurnSouth, 0.82, 7.8, true, 0xec4899);

  // =========================================================================
  // 8. ANIMATION LOOP (OCEAN WAVES, SURF FOAM, SWIMMERS, VOLLEYBALL, TRAFFIC, T-SIGNAL)
  // =========================================================================
  let animClock = 0;
  let cycleTimer = 0;
  let ewPhase: 'green' | 'yellow' | 'red' = 'green';
  let nsPhase: 'green' | 'yellow' | 'red' = 'red';
  let lastLampFactor = -1;

  const applyLenses = (list: SignalLens[], phase: 'green' | 'yellow' | 'red') => {
    for (let i = 0; i < list.length; i++) {
      list[i].red.emissiveIntensity = phase === 'red' ? 2.1 : 0.06;
      list[i].yellow.emissiveIntensity = phase === 'yellow' ? 2.1 : 0.06;
      list[i].green.emissiveIntensity = phase === 'green' ? 2.1 : 0.06;
    }
  };
  applyLenses(ewLenses, 'green');
  applyLenses(nsLenses, 'red');

  const getSignalState = (): IntersectionSignalState => ({
    ewPhase,
    nsPhase,
  });

  const update = (
    delta: number,
    _rawHour: number,
    lampFactor: number,
    playerX?: number,
    playerZ?: number,
    isRaining = false
  ) => {
    const dt = Math.min(delta, 0.1);
    animClock += dt;

    // Fast exit when player is far East away from both the coast and Đường Ven Sông Bạch Đằng Tây
    if (playerX !== undefined && playerX > -180) {
      dawnLightProxScale = 0;
      return;
    }
    if (playerX !== undefined && playerZ !== undefined) {
      const dxDawn = playerX - dawnBarCenterX;
      const dzDawn = playerZ - dawnBarCenterZ;
      dawnLightProxScale = dxDawn * dxDawn + dzDawn * dzDawn <= 72 * 72 ? 1.0 : 0.0;
    } else {
      dawnLightProxScale = 1.0;
    }

    // Traffic light phase state machine (16s cycle)
    cycleTimer = (cycleTimer + dt) % 16.0;
    const nextEw: 'green' | 'yellow' | 'red' = cycleTimer < 6.0 ? 'green' : cycleTimer < 7.5 ? 'yellow' : 'red';
    const nextNs: 'green' | 'yellow' | 'red' = cycleTimer >= 8.5 && cycleTimer < 14.0 ? 'green' : cycleTimer >= 14.0 && cycleTimer < 15.5 ? 'yellow' : 'red';
    if (nextEw !== ewPhase) {
      ewPhase = nextEw;
      applyLenses(ewLenses, ewPhase);
    }
    if (nextNs !== nsPhase) {
      nsPhase = nextNs;
      applyLenses(nsLenses, nsPhase);
    }

    // Update luxury coastal lighting, THE DAWN neon/LED accents & mast fins when lampFactor shifts noticeably
    if (Math.abs(lampFactor - lastLampFactor) > 0.005) {
      lastLampFactor = lampFactor;
      lampGlowMat.emissiveIntensity = 0.35 + lampFactor * 2.15;
      warmBollardMat.emissiveIntensity = 0.32 + lampFactor * 1.85;
      coastalAccentLedMat.emissiveIntensity = 0.42 + lampFactor * 2.05;
      dawnSignFaceMat.emissiveIntensity = 0.72 + lampFactor * 1.85;
      dawnSignHaloMat.emissiveIntensity = 0.55 + lampFactor * 1.75;
      dawnEaveLedMat.emissiveIntensity = 0.48 + lampFactor * 1.85;
      dawnLanternGlowMat.emissiveIntensity = 0.52 + lampFactor * 1.95;
      dawnTableTopGlowMat.emissiveIntensity = 0.42 + lampFactor * 1.45;
      dawnTableRimGlowMat.emissiveIntensity = 0.38 + lampFactor * 1.55;
      dawnVioletPoolMat.opacity = 0.08 + lampFactor * 0.54;
      dawnAmberPoolMat.opacity = 0.08 + lampFactor * 0.48;
      warmPoolMat.opacity = 0.12 + lampFactor * 0.62;
      cyanPoolMat.opacity = 0.08 + lampFactor * 0.46;
      oceanMat.color.setHex(lampFactor > 0.65 ? 0x6ba7c9 : 0xffffff);
      farOceanMat.color.setHex(lampFactor > 0.65 ? 0x052847 : 0x074b83);
    }

    // Real-time 3D Gerstner-style rolling ocean swells & currents ("sóng đánh lên đánh xuống dạng hải lưu")
    oceanTex.offset.x = (-animClock * 0.045) % 1;
    oceanTex.offset.y = (animClock * 0.028) % 1;
    foamTex.offset.y = (-animClock * 0.05) % 1;
    for (let i = 0; i < oceanVertCount; i++) {
      const wx = oceanBaseWorldX[i];
      const wz = oceanBaseWorldZ[i];
      const wy = sampleOceanWaveY(wx, wz, animClock);
      const disp = wy - WEST_COAST_WATER_Y;
      const offshoreDist = Math.max(0, -1026.5 - wx);
      const ampScale = THREE.MathUtils.clamp(offshoreDist / 24.0, 0.14, 1.0);
      const crestPush = Math.cos(wx * 0.165 - animClock * 2.15 + wz * 0.028) * 0.32 * ampScale;
      oceanPosAttr.setXYZ(i, oceanBaseLocalX[i] + crestPush, wy, wz - oceanCenterZ);

      // Brighten rising wave crests & shallow surf edge with white sea-foam highlights
      const crestFoam = THREE.MathUtils.clamp((disp - 0.15) * 2.1, 0, 0.68);
      const shoreFoam = wx > -1036.0 ? THREE.MathUtils.clamp((wx + 1036.0) / 8.5, 0, 0.72) : 0;
      const foamMix = Math.max(crestFoam, shoreFoam);
      oceanColorArray[i * 3] = THREE.MathUtils.lerp(oceanBaseColorR[i], 0.96, foamMix);
      oceanColorArray[i * 3 + 1] = THREE.MathUtils.lerp(oceanBaseColorG[i], 0.99, foamMix);
      oceanColorArray[i * 3 + 2] = THREE.MathUtils.lerp(oceanBaseColorB[i], 1.0, foamMix);
    }
    oceanPosAttr.needsUpdate = true;
    oceanColorAttr.needsUpdate = true;
    oceanWaveGeo.computeVertexNormals();

    // Curved shore-break foam ribbons surging smoothly up onto the wet golden sand and ebbing back!
    for (let w = 0; w < surfWaves.length; w++) {
      const sw = surfWaves[w];
      const t = (animClock * 0.19 + sw.phase) % 1; // 0 (breaking offshore) -> 1 (swash run-up)
      // Asymmetric surge: fast push up onto sand, slower pull back
      const surge = Math.sin(t * Math.PI * 0.85);
      const bandCenterX = -1044.5 + surge * 16.5;
      sw.mesh.position.x = bandCenterX;
      sw.mat.opacity = Math.sin(t * Math.PI) * 0.86;
      const fPos = sw.mesh.geometry.attributes.position;
      for (let i = 0; i < fPos.count; i++) {
        const lz = sw.baseZArr[i];
        const wz = surfWaveCenterZ + lz;
        const scallop = Math.sin(wz * 0.045 + animClock * 0.9 + w * 1.7) * 1.65;
        const lx = sw.baseLocalXArr[i] + scallop;
        const wx = bandCenterX + lx;
        const groundY = getWestCoastalGroundY(wx, wz) ?? WEST_COAST_WATER_Y;
        const waveY = sampleOceanWaveY(wx, wz, animClock);
        fPos.setXYZ(i, lx, Math.max(groundY + 0.045, waveY + 0.035), lz);
      }
      fPos.needsUpdate = true;
    }

    // Individual safety buoys & rope riding live 3D ocean swells
    let buoyAvgY = 0;
    for (let i = 0; i < buoyItems.length; i++) {
      const bi = buoyItems[i];
      const by = sampleOceanWaveY(bi.x, bi.z, animClock) + 0.08;
      bi.mesh.position.y = by;
      buoyAvgY += by;
    }
    buoyRope.position.y = buoyItems.length > 0 ? buoyAvgY / buoyItems.length - 0.04 : WEST_COAST_WATER_Y + 0.04;

    // Offshore sailboats & jet skis riding & pitching on live ocean swells
    for (let i = 0; i < bobbingBoats.length; i++) {
      const b = bobbingBoats[i];
      const wy = sampleOceanWaveY(b.x, b.z, animClock);
      const slopeX = (sampleOceanWaveY(b.x + 2.5, b.z, animClock) - sampleOceanWaveY(b.x - 2.5, b.z, animClock)) * 0.18;
      const slopeZ = (sampleOceanWaveY(b.x, b.z + 2.5, animClock) - sampleOceanWaveY(b.x, b.z - 2.5, animClock)) * 0.14;
      b.grp.position.y = wy + b.yOffset;
      b.grp.rotation.z = slopeX;
      b.grp.rotation.x = -slopeZ;
    }

    const hasPlayer = playerX !== undefined && playerZ !== undefined;
    const px = playerX ?? -975;
    const pz = playerZ ?? 29;
    const showBathers = shouldShowBeachBathers(isRaining);

    // Hide sunbathers on loungers during rain
    for (let i = 0; i < sunbathers.length; i++) {
      sunbathers[i].visible = showBathers;
    }

    // Animate Beach Volleyball Arc & Players (hidden during rain)
    volleyball.visible = showBathers;
    if (showBathers) {
      const vbCycle = (animClock * 0.85) % 1;
      const vbArc = Math.sin(vbCycle * Math.PI);
      const vbDir = Math.floor(animClock * 0.85) % 2 === 0 ? 1 : -1;
      volleyball.position.set(
        -1013.0 + Math.sin(animClock * 1.4) * 1.6,
        vbY + 1.9 + vbArc * 2.2,
        -47.0 + vbDir * (vbCycle - 0.5) * 7.8
      );
    }
    for (let i = 0; i < vbPlayers.length; i++) {
      const vp = vbPlayers[i];
      vp.root.visible = showBathers;
      if (showBathers) {
        vp.root.position.y = vp.baseY + Math.max(0, Math.sin(animClock * 3.1 + vp.phase)) * 0.22;
      }
    }

    // Animate Swimmers & Waders riding live 3D ocean swells (ZERO swimmers in the sea when it rains!)
    for (let i = 0; i < swimmers.length; i++) {
      const sw = swimmers[i];
      const vis =
        showBathers &&
        (!hasPlayer || (sw.baseX - px) * (sw.baseX - px) + (sw.baseZ - pz) * (sw.baseZ - pz) <= 19600);
      sw.root.visible = vis;
      if (!vis) continue;

      if (sw.mode === 'swim') {
        const sx = sw.baseX + Math.sin(animClock * 0.35 + sw.phase) * 1.8;
        const sz = sw.baseZ + Math.cos(animClock * 0.35 + sw.phase) * 2.8;
        const wy = sampleOceanWaveY(sx, sz, animClock);
        sw.root.position.set(sx, wy - 0.96, sz);
        sw.leftArm.rotation.x = Math.sin(animClock * 4.2 + sw.phase) * 1.1 - 0.7;
        sw.rightArm.rotation.x = -Math.sin(animClock * 4.2 + sw.phase) * 1.1 - 0.7;
      } else if (sw.mode === 'float_ring') {
        const sx = sw.baseX + Math.sin(animClock * 0.5 + sw.phase) * 0.8;
        const sz = sw.baseZ + Math.cos(animClock * 0.4 + sw.phase) * 0.9;
        const wy = sampleOceanWaveY(sx, sz, animClock);
        sw.root.position.set(sx, wy - 0.96, sz);
        sw.root.rotation.z = Math.sin(animClock * 1.5 + sw.phase) * 0.11;
        sw.leftArm.rotation.z = -0.45 + Math.sin(animClock * 1.8 + sw.phase) * 0.15;
        sw.rightArm.rotation.z = 0.45 - Math.sin(animClock * 1.8 + sw.phase) * 0.15;
      } else {
        const wy = sampleOceanWaveY(sw.baseX, sw.baseZ, animClock);
        sw.root.position.y = wy - 0.56;
        sw.leftArm.rotation.x = Math.sin(animClock * 2.2 + sw.phase) * 0.25;
        sw.rightArm.rotation.x = -Math.sin(animClock * 2.2 + sw.phase) * 0.25;
      }
    }

    // Update Stationary Coastal GLB NPCs (Lifeguards, Beach Bar Staff, Seated Café Guests, Rental & Shower Attendants)
    for (let i = 0; i < coastalStationaryNpcs.length; i++) {
      const npc = coastalStationaryNpcs[i];
      const vis =
        (!npc.hideInRain || showBathers) &&
        (!hasPlayer || (npc.x - px) * (npc.x - px) + (npc.z - pz) * (npc.z - pz) <= 16900);
      npc.root.visible = vis;
      npc.glb.setVisible(vis);
      if (vis) {
        npc.glb.setAnimState(npc.animState, 1.0);
      }
    }

    // Animate City-Grade GLB Promenade/Riverfront Walkers & Wet-Sand Swimwear Walkers
    for (let i = 0; i < beachWalkers.length; i++) {
      const bw = beachWalkers[i];
      bw.distPos = (bw.distPos + bw.speed * dt) % bw.totalDist;
      let rem = bw.distPos;
      let segIdx = 0;
      while (segIdx < bw.segLens.length - 1 && rem > bw.segLens[segIdx]) {
        rem -= bw.segLens[segIdx];
        segIdx++;
      }
      const a = bw.waypoints[segIdx];
      const b = bw.waypoints[(segIdx + 1) % bw.waypoints.length];
      const frac = rem / Math.max(0.001, bw.segLens[segIdx]);
      const nx = a.x + (b.x - a.x) * frac;
      const nz = a.z + (b.z - a.z) * frac;

      const vis =
        (!bw.isBeachBather || showBathers) &&
        (!hasPlayer || (nx - px) * (nx - px) + (nz - pz) * (nz - pz) <= 16900);
      bw.root.visible = vis;
      if (bw.glb) bw.glb.setVisible(vis);
      if (!vis) continue;

      bw.root.position.set(nx, getWestCoastalGroundY(nx, nz) ?? 0, nz);
      bw.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      if (bw.glb) {
        bw.glb.setAnimState('Walk', bw.speed * 0.92);
      } else if (bw.leftLeg && bw.rightLeg && bw.leftArm && bw.rightArm) {
        const swing = Math.sin(animClock * bw.speed * 3.4 + bw.phase) * 0.36;
        bw.leftLeg.rotation.x = swing;
        bw.rightLeg.rotation.x = -swing;
        bw.leftArm.rotation.x = -swing * 0.7;
        bw.rightArm.rotation.x = swing * 0.7;
      }
    }

    // Animate Coastal Boulevard Cars & Motorbikes
    const headInt = 0.45 + lampFactor * 1.45;
    const brakeInt = 0.55 + lampFactor * 1.0;
    for (let i = 0; i < coastalVehicles.length; i++) {
      const v = coastalVehicles[i];
      const moved = v.baseSpeed * dt;
      v.distPos = (v.distPos + moved) % v.totalDist;
      let rem = v.distPos;
      let segIdx = 0;
      while (segIdx < v.segLens.length - 1 && rem > v.segLens[segIdx]) {
        rem -= v.segLens[segIdx];
        segIdx++;
      }
      const a = v.waypoints[segIdx];
      const b = v.waypoints[(segIdx + 1) % v.waypoints.length];
      const frac = rem / Math.max(0.001, v.segLens[segIdx]);
      const nx = a.x + (b.x - a.x) * frac;
      const nz = a.z + (b.z - a.z) * frac;

      const vis = !hasPlayer || (nx - px) * (nx - px) + (nz - pz) * (nz - pz) <= 25600;
      v.root.visible = vis;
      if (!vis) continue;

      v.root.position.set(nx, -0.26, nz);
      const targetYaw = Math.atan2(b.x - a.x, b.z - a.z);
      let diff = targetYaw - v.currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      v.currentYaw += diff * Math.min(1, dt * 6.5);
      v.root.rotation.y = v.currentYaw;

      const spin = moved / Math.max(0.18, v.wheelR);
      for (let w = 0; w < v.wheels.length; w++) {
        v.wheels[w].rotation.x += spin;
      }
      v.headlightMat.emissiveIntensity = headInt;
      v.brakeMat.emissiveIntensity = brakeInt;
    }
  };

  return {
    staticGroup,
    oceanGroup,
    dynamicGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getSignalState,
    update,
  };
}
