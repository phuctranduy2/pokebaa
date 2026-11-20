import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isAppleStoreOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface AppleStoreBuildResult {
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
    npcController?: AppleStoreNpcController | null
  ) => void;
}

// =========================================================================
// APPLE FLAGSHIP STORE — ĐƯỜNG SƠN TÂY BẮC (BÊN CẠNH LOUIS VUITTON)
// Total Plot: X = 383.8 .. 412.5, Z = -45.2 .. -16.8
//   - Foreground Plaza + Dual Choreographed Water-Jet Fountains: X = 383.8 .. 388.5
//   - Main 2-Story Limestone & Glass Flagship Envelope: X = 388.5 .. 412.5
//   - Podium Floor 1: Y = 0.08m | Floor 2 Mezzanine: Y = 4.68m (H = 4.60m)
//   - West Sliding Glass Portal: X = 388.95, Z = -31.0 (4.8m unobstructed center bay: -33.4..-28.6)
// =========================================================================

export const APPLE_PODIUM_Y = 0.08;
export const APPLE_FLOOR_H = 4.6;

const APPLE_DOOR_X = 388.95;
const APPLE_DOOR_Z = -31.0;

export const APPLE_STORE_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 (Y = 0.08m) — Stone Frame Envelope, Plaza Fountains & Display Tables
  // =========================================================================
  { minX: 411.75, maxX: 412.6, minZ: -45.3, maxZ: -16.7, floor: 1 }, // East Rear Wall
  { minX: 388.4, maxX: 412.6, minZ: -45.3, maxZ: -44.45, floor: 1 }, // North Wall
  { minX: 388.4, maxX: 412.6, minZ: -17.55, maxZ: -16.7, floor: 1 }, // South Wall

  // West Glass & Stone Portal Facade (split cleanly around 4.8m Sliding Doorway Z = -33.4..-28.6)
  { minX: 388.35, maxX: 389.25, minZ: -45.3, maxZ: -33.4, floor: 1 },
  { minX: 388.35, maxX: 389.25, minZ: -28.6, maxZ: -16.7, floor: 1 },

  // Symmetrical Animated Plaza Fountain Basins (flank clear center walkway Z = -36.2..-25.8)
  { minX: 384.2, maxX: 387.4, minZ: -43.3, maxZ: -36.3, floor: 1 }, // North Fountain Pool
  { minX: 384.2, maxX: 387.4, minZ: -25.7, maxZ: -18.7, floor: 1 }, // South Fountain Pool

  // Row A: Front Atrium Solid-Oak Product Display Tables (X = 392.0..394.0)
  { minX: 391.9, maxX: 394.1, minZ: -41.4, maxZ: -36.8, floor: 1 }, // iPhone Lineup Oak Table (North)
  { minX: 391.9, maxX: 394.1, minZ: -33.3, maxZ: -28.7, floor: 1 }, // Flagship Hero Devices Center Table
  { minX: 391.9, maxX: 394.1, minZ: -25.2, maxZ: -20.6, floor: 1 }, // MacBook Pro Oak Table (South)

  // Row B: Inner Atrium Solid-Oak Product Tables (X = 398.2..400.2)
  { minX: 398.1, maxX: 400.3, minZ: -41.4, maxZ: -36.8, floor: 1 }, // iPad Pro & Pencil Oak Table
  { minX: 398.1, maxX: 400.3, minZ: -33.3, maxZ: -28.7, floor: 1 }, // Apple Watch & AirPods Oak Table
  { minX: 398.1, maxX: 400.3, minZ: -25.2, maxZ: -20.6, floor: 1 }, // iMac & Apple Vision Pro Oak Table

  // Structural Atrium Columns flanking center view (X = 396.3, Z = -36.6 & -25.4)
  { minX: 395.95, maxX: 396.65, minZ: -36.95, maxZ: -36.25, floor: 1 },
  { minX: 395.95, maxX: 396.65, minZ: -25.75, maxZ: -25.05, floor: 1 },

  // Floor 1 Forum Oak Seating & Pickup Counter
  { minX: 404.6, maxX: 406.4, minZ: -34.2, maxZ: -27.8, floor: 1 }, // Rear Concierge & Order Pickup Island
  { minX: 409.5, maxX: 411.7, minZ: -35.8, maxZ: -26.2, floor: 1 }, // Rear Keynote Video Wall Credenza
  { minX: 393.8, maxX: 404.5, minZ: -44.5, maxZ: -43.3, floor: 1 }, // North "The Avenue" Accessory Bays
  { minX: 393.8, maxX: 404.5, minZ: -18.7, maxZ: -17.5, floor: 1 }, // South "The Avenue" Accessory Bays

  // NE Switchback Stairwell (X = 406.8..411.8, Z = -44.5..-37.2, divider X = 409.3)
  { minX: 406.65, maxX: 407.0, minZ: -44.5, maxZ: -37.2, floor: 1 }, // Stairwell West Balustrade
  { minX: 409.12, maxX: 409.48, minZ: -42.3, maxZ: -37.2, floor: 1 }, // Stairwell Center Spine
  { minX: 409.42, maxX: 411.85, minZ: -37.65, maxZ: -37.15, floor: 1 }, // Under-Stair Barrier (Flight 2)

  // =========================================================================
  // FLOOR 2 MEZZANINE (Y = 4.68m) — Genius Bar & Pro Studio Creation Lounge
  // =========================================================================
  { minX: 411.75, maxX: 412.6, minZ: -45.3, maxZ: -16.7, floor: 2 }, // East Rear Wall
  { minX: 396.3, maxX: 412.6, minZ: -45.3, maxZ: -44.45, floor: 2 }, // North Wall
  { minX: 396.3, maxX: 412.6, minZ: -17.55, maxZ: -16.7, floor: 2 }, // South Wall
  { minX: 396.05, maxX: 396.65, minZ: -45.3, maxZ: -16.7, floor: 2 }, // Front Mezzanine Glass Balustrade

  // Floor 2 NE Stairwell Guards
  { minX: 406.65, maxX: 407.0, minZ: -44.5, maxZ: -37.2, floor: 2 }, // Stairwell West Balustrade
  { minX: 409.12, maxX: 409.48, minZ: -42.3, maxZ: -37.2, floor: 2 }, // Stairwell Center Spine
  { minX: 406.9, maxX: 409.25, minZ: -38.4, maxZ: -37.15, floor: 2 }, // Floor 2 Down-Bay Glass Guard Rail

  // Floor 2 Genius Bar & Creation Tables
  { minX: 399.0, maxX: 401.2, minZ: -39.5, maxZ: -34.5, floor: 2 }, // North Mac Studio Table
  { minX: 399.0, maxX: 401.2, minZ: -27.5, maxZ: -22.5, floor: 2 }, // South Pro Display XDR Table
  { minX: 407.6, maxX: 409.6, minZ: -34.8, maxZ: -24.2, floor: 2 }, // East Genius Bar Oak Counter
];

// =========================================================================
// PROCEDURAL TEXTURES & SCULPTED APPLE ICON GEOMETRY
// =========================================================================

function createAppleLimestoneTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#d3dbe6';
  ctx.fillRect(0, 0, w, h);

  // Honed large-format cool-gray architectural stone ashlar grid (matches Image 2)
  const cols = 6;
  const rows = 6;
  const cw = w / cols;
  const ch = h / rows;

  for (let r = 0; r < rows; r++) {
    const xOff = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const sx = col * cw + xOff;
      const sy = r * ch;
      const shade = ((r * 7 + col * 11) % 5) - 2;
      const lum = 212 + shade * 3;
      ctx.fillStyle = `rgb(${lum - 6}, ${lum + 1}, ${lum + 10})`;
      ctx.fillRect(sx + 1.5, sy + 1.5, cw - 3, ch - 3);

      // Subtle top highlight & travertine micro-grain
      ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.fillRect(sx + 4, sy + 3, cw - 8, 3);
      ctx.fillStyle = 'rgba(100, 116, 139, 0.05)';
      ctx.fillRect(sx + ((col * 37) % 80), sy + ch * 0.45, cw * 0.35, 2);
    }
  }

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
  ctx.lineWidth = 2;
  for (let r = 0; r <= rows; r++) {
    const sy = r * ch;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();
    const xOff = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const sx = col * cw + xOff;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + ch);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = 4;
  return tex;
}

function createWetGraniteFountainDeckTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#4b5563';
  ctx.fillRect(0, 0, w, h);

  // Dark wet granite pavers with fine recessed drainage slot joints (Image 2 foreground!)
  const cols = 4;
  const rows = 8;
  const cw = w / cols;
  const ch = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const shade = 74 + ((r * 5 + col * 9) % 14);
      ctx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 14})`;
      ctx.fillRect(col * cw + 2, r * ch + 2, cw - 4, ch - 4);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
      ctx.fillRect(col * cw + 6, r * ch + 4, cw - 12, 3);
    }
  }

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= cols; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cw, 0);
    ctx.lineTo(i * cw, h);
    ctx.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * ch);
    ctx.lineTo(w, j * ch);
    ctx.stroke();
  }

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

  ctx.fillStyle = '#eaedf0';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
  ctx.lineWidth = 2;
  const cell = 128;
  for (let i = 0; i <= w; i += cell) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }

  for (let i = 0; i < 180; i++) {
    const x = (i * 97) % w;
    const y = (i * 61) % h;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(148,163,184,0.20)';
    ctx.fillRect(x, y, 3, 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = 4;
  return tex;
}

function createWarmOakTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#d7b892';
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < h; y += 6) {
    const tone = Math.sin(y * 0.08) * 9;
    ctx.fillStyle = `rgba(${174 + tone}, ${139 + tone}, ${98 + tone}, 0.25)`;
    ctx.fillRect(0, y, w, 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createAppleKeynoteScreenTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#090d16');
  bg.addColorStop(0.5, '#131d2f');
  bg.addColorStop(1, '#0b101b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow1 = ctx.createRadialGradient(w * 0.25, h * 0.55, 10, w * 0.25, h * 0.55, 220);
  glow1.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  glow1.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, w, h);

  const glow2 = ctx.createRadialGradient(w * 0.78, h * 0.48, 12, w * 0.78, h * 0.48, 210);
  glow2.addColorStop(0, 'rgba(245, 194, 130, 0.36)');
  glow2.addColorStop(1, 'rgba(245, 194, 130, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.78, h * 0.5);
  ctx.rotate(-0.14);
  ctx.fillStyle = '#d6b48a';
  ctx.fillRect(-52, -104, 104, 208);
  const scrGrad = ctx.createLinearGradient(-46, -98, 46, 98);
  scrGrad.addColorStop(0, '#1e3a5f');
  scrGrad.addColorStop(0.55, '#c27849');
  scrGrad.addColorStop(1, '#111827');
  ctx.fillStyle = scrGrad;
  ctx.fillRect(-46, -98, 92, 196);
  ctx.fillStyle = '#09090b';
  ctx.fillRect(-16, -90, 32, 8);
  ctx.restore();

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.font = '600 54px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('iPhone 16 Pro', 92, 152);

  ctx.fillStyle = '#e2c299';
  ctx.font = '500 30px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Built for Apple Intelligence.', 94, 206);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('MacBook Pro  •  iPad Pro  •  Apple Vision Pro', 94, 266);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSidePosterTex(accent: string, headline: string, sub: string): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  const g = ctx.createRadialGradient(128, 110, 12, 128, 110, 110);
  g.addColorStop(0, accent);
  g.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 112, 74, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = '700 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(headline, 128, 212);
  ctx.fillStyle = '#475569';
  ctx.font = '500 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(sub, 128, 236);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createDoorHoursPlaqueTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
  ctx.fillRect(8, 8, w - 16, h - 16);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('Apple Flagship', 128, 48);

  ctx.fillStyle = '#334155';
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('Sơn Tây Bắc • Đà Nẵng', 128, 78);

  ctx.fillStyle = '#475569';
  ctx.font = '600 17px system-ui, -apple-system, sans-serif';
  ctx.fillText('Open Daily', 128, 118);
  ctx.fillStyle = '#0284c7';
  ctx.font = '700 21px system-ui, -apple-system, sans-serif';
  ctx.fillText('07:00 – 23:00', 128, 148);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAppleBagTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 120, 120);
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(64, 68, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(78, 65, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(69, 44, 4, 8, 0.5, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sculpted iconic bitten Apple 3D silhouette (body + detached tilted leaf)
 */
function buildSculptedAppleLogoMesh(mat: THREE.Material, scale = 1.0, depth = 0.16): THREE.Group {
  const logoGrp = new THREE.Group();

  const appleShape = new THREE.Shape();
  appleShape.moveTo(0.0, 0.62);
  appleShape.bezierCurveTo(0.26, 0.72, 0.66, 0.76, 0.86, 0.52);
  appleShape.bezierCurveTo(0.62, 0.36, 0.60, -0.02, 0.88, -0.18);
  appleShape.bezierCurveTo(0.76, -0.56, 0.54, -0.92, 0.30, -0.92);
  appleShape.bezierCurveTo(0.16, -0.92, 0.10, -0.84, 0.0, -0.84);
  appleShape.bezierCurveTo(-0.10, -0.84, -0.16, -0.92, -0.32, -0.92);
  appleShape.bezierCurveTo(-0.62, -0.92, -0.94, -0.44, -0.94, 0.08);
  appleShape.bezierCurveTo(-0.94, 0.58, -0.58, 0.76, -0.26, 0.70);
  appleShape.bezierCurveTo(-0.12, 0.67, -0.06, 0.62, 0.0, 0.62);

  const bodyGeo = new THREE.ExtrudeGeometry(appleShape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 2,
    curveSegments: 28,
  });
  bodyGeo.translate(0, 0, -depth * 0.5);
  const bodyMesh = new THREE.Mesh(bodyGeo, mat);
  bodyMesh.scale.setScalar(scale);
  logoGrp.add(bodyMesh);

  const leafShape = new THREE.Shape();
  leafShape.moveTo(0.02, 0.78);
  leafShape.bezierCurveTo(0.02, 1.06, 0.24, 1.24, 0.42, 1.24);
  leafShape.bezierCurveTo(0.42, 0.96, 0.22, 0.78, 0.02, 0.78);

  const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 20,
  });
  leafGeo.translate(0, 0, -depth * 0.5);
  const leafMesh = new THREE.Mesh(leafGeo, mat);
  leafMesh.scale.setScalar(scale);
  logoGrp.add(leafMesh);

  return logoGrp;
}

// =========================================================================
// APPLE FLAGSHIP STORE BUILDER
// =========================================================================

export function createAppleStoreStructure(): AppleStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const limestoneTex = createAppleLimestoneTex();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    color: 0xe2e8f0,
    roughness: 0.70,
    metalness: 0.04,
  });

  const revealTrimMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.34,
    metalness: 0.72,
  });

  const titaniumSilverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.24,
    metalness: 0.88,
  });

  const brushedAluMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.86,
  });

  const terrazzoTex = createTerrazzoFloorTex();
  const floorMat = new THREE.MeshStandardMaterial({
    map: terrazzoTex,
    color: 0xf4f6f8,
    roughness: 0.52,
    metalness: 0.05,
  });

  const plazaPaverMat = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    color: 0xcfd8e3,
    roughness: 0.66,
    metalness: 0.06,
  });

  const oakTex = createWarmOakTex();
  const oakMat = new THREE.MeshStandardMaterial({
    map: oakTex,
    color: 0xdfb98e,
    roughness: 0.56,
    metalness: 0.04,
  });

  const ceilingTimberMat = new THREE.MeshStandardMaterial({
    map: oakTex,
    color: 0xe9dac3,
    roughness: 0.70,
    metalness: 0.02,
  });

  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0xf4f0e8,
    roughness: 0.74,
    metalness: 0.02,
  });

  const curtainGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdff2ff,
    roughness: 0.08,
    metalness: 0.18,
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const finGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.10,
    metalness: 0.22,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const railGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.10,
    metalness: 0.16,
    transparent: true,
    opacity: 0.30,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const frostedStripMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.45,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  const appleGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffef7,
    emissiveIntensity: 2.2,
    roughness: 0.16,
    metalness: 0.04,
  });

  const ceilingLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfefce8,
    emissiveIntensity: 2.6,
    roughness: 0.18,
  });

  const ceilingBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 3.0,
    roughness: 0.14,
  });

  const sensorActiveMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  neonMats.push(sensorActiveMat);

  // =========================================================================
  // 1. PLAZA FORECOURT & BUILDING PODIUM (Y = 0.08m)
  // =========================================================================
  const plazaDeck = new THREE.Mesh(new THREE.BoxGeometry(5.2, APPLE_PODIUM_Y + 0.08, 28.4), plazaPaverMat);
  plazaDeck.position.set(386.1, (APPLE_PODIUM_Y - 0.08) * 0.5, -31.0);
  plazaDeck.receiveShadow = true;
  staticGroup.add(plazaDeck);

  const apronStep = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 28.4), plazaPaverMat);
  apronStep.position.set(383.62, 0.022, -31.0);
  staticGroup.add(apronStep);

  const floor1Slab = new THREE.Mesh(new THREE.BoxGeometry(24.0, APPLE_PODIUM_Y + 0.08, 28.4), floorMat);
  floor1Slab.position.set(400.5, (APPLE_PODIUM_Y - 0.08) * 0.5, -31.0);
  floor1Slab.receiveShadow = true;
  staticGroup.add(floor1Slab);

  // =========================================================================
  // 2. MONUMENTAL STONE-FRAME ENVELOPE + RECESSED 2-STORY CURTAIN GLASS (IMAGE 2)
  // =========================================================================
  const ROOF_TOP_Y = 14.00;
  const HEADER_BOT_Y = 10.60;
  const ATRIUM_CLEAR_H = HEADER_BOT_Y - APPLE_PODIUM_Y;

  // North Stone Pier & Wall
  const northFrontPier = new THREE.Mesh(new THREE.BoxGeometry(0.95, ROOF_TOP_Y, 2.2), stoneMat);
  northFrontPier.position.set(388.88, ROOF_TOP_Y * 0.5, -44.1);
  staticGroup.add(northFrontPier);

  const northFullWall = new THREE.Mesh(new THREE.BoxGeometry(24.0, ROOF_TOP_Y, 0.72), stoneMat);
  northFullWall.position.set(400.5, ROOF_TOP_Y * 0.5, -44.84);
  staticGroup.add(northFullWall);

  const northInnerWall = new THREE.Mesh(new THREE.BoxGeometry(23.1, ATRIUM_CLEAR_H, 0.12), interiorWallMat);
  northInnerWall.position.set(400.5, APPLE_PODIUM_Y + ATRIUM_CLEAR_H * 0.5, -44.42);
  staticGroup.add(northInnerWall);

  // South Stone Pier & Wall
  const southFrontPier = new THREE.Mesh(new THREE.BoxGeometry(0.95, ROOF_TOP_Y, 2.2), stoneMat);
  southFrontPier.position.set(388.88, ROOF_TOP_Y * 0.5, -17.9);
  staticGroup.add(southFrontPier);

  const southFullWall = new THREE.Mesh(new THREE.BoxGeometry(24.0, ROOF_TOP_Y, 0.72), stoneMat);
  southFullWall.position.set(400.5, ROOF_TOP_Y * 0.5, -17.16);
  staticGroup.add(southFullWall);

  const southInnerWall = new THREE.Mesh(new THREE.BoxGeometry(23.1, ATRIUM_CLEAR_H, 0.12), interiorWallMat);
  southInnerWall.position.set(400.5, APPLE_PODIUM_Y + ATRIUM_CLEAR_H * 0.5, -17.58);
  staticGroup.add(southInnerWall);

  // Rear East Wall
  const rearEastWall = new THREE.Mesh(new THREE.BoxGeometry(0.75, ROOF_TOP_Y, 28.4), stoneMat);
  rearEastWall.position.set(412.12, ROOF_TOP_Y * 0.5, -31.0);
  staticGroup.add(rearEastWall);

  const rearInnerAcousticWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, ATRIUM_CLEAR_H, 26.8), oakMat);
  rearInnerAcousticWall.position.set(411.72, APPLE_PODIUM_Y + ATRIUM_CLEAR_H * 0.5, -31.0);
  staticGroup.add(rearInnerAcousticWall);

  // Upper Limestone Lintel & Parapet Coping
  const frontUpperFascia = new THREE.Mesh(new THREE.BoxGeometry(0.95, ROOF_TOP_Y - HEADER_BOT_Y, 28.4), stoneMat);
  frontUpperFascia.position.set(388.88, (ROOF_TOP_Y + HEADER_BOT_Y) * 0.5, -31.0);
  staticGroup.add(frontUpperFascia);

  const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.55, 28.4), stoneMat);
  roofDeck.position.set(400.5, ROOF_TOP_Y - 0.28, -31.0);
  staticGroup.add(roofDeck);

  // Crisp slim metallic roof coping edge & shadow-gap stone reveal (sleek, never heavy!)
  const roofCoping = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 28.42), brushedAluMat);
  roofCoping.position.set(388.88, ROOF_TOP_Y + 0.02, -31.0);
  staticGroup.add(roofCoping);

  const topRevealTrim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.055, 24.0), revealTrimMat);
  topRevealTrim.position.set(388.88, HEADER_BOT_Y - 0.02, -31.0);
  staticGroup.add(topRevealTrim);
  [-42.98, -19.02].forEach((tz) => {
    const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.55, HEADER_BOT_Y - APPLE_PODIUM_Y, 0.055), revealTrimMat);
    sideTrim.position.set(388.88, (HEADER_BOT_Y + APPLE_PODIUM_Y) * 0.5, tz);
    staticGroup.add(sideTrim);
  });

  // =========================================================================
  // 2B. CRYSTAL-CLEAR 2-STORY CURTAIN GLASS WITH STRUCTURAL GLASS FINS
  //     Center Bay (Z = -33.4 .. -28.6) is 100% OPEN & FREE OF CENTER BARS!
  // =========================================================================
  const glassLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, HEADER_BOT_Y - APPLE_PODIUM_Y, 9.6), curtainGlassMat);
  glassLeft.position.set(APPLE_DOOR_X, (HEADER_BOT_Y + APPLE_PODIUM_Y) * 0.5, -38.2);
  staticGroup.add(glassLeft);

  const glassRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, HEADER_BOT_Y - APPLE_PODIUM_Y, 9.6), curtainGlassMat);
  glassRight.position.set(APPLE_DOOR_X, (HEADER_BOT_Y + APPLE_PODIUM_Y) * 0.5, -23.8);
  staticGroup.add(glassRight);

  // Full clear single glass bay directly above automatic entrance doors (no center mullion cutting behind Apple logo!)
  const glassCenterAboveDoors = new THREE.Mesh(new THREE.BoxGeometry(0.05, HEADER_BOT_Y - 3.24, 4.8), curtainGlassMat);
  glassCenterAboveDoors.position.set(APPLE_DOOR_X, (HEADER_BOT_Y + 3.24) * 0.5, APPLE_DOOR_Z);
  staticGroup.add(glassCenterAboveDoors);

  // Structural Glass Fins on side bays ONLY (-39.8, -36.6, -25.4, -22.2) + sleek door jamb piers (-33.4, -28.6)
  [-39.8, -36.6, -25.4, -22.2].forEach((mz) => {
    // Structural laminated glass fin inside store
    const glassFin = new THREE.Mesh(new THREE.BoxGeometry(0.28, HEADER_BOT_Y - APPLE_PODIUM_Y, 0.032), finGlassMat);
    glassFin.position.set(APPLE_DOOR_X + 0.16, (HEADER_BOT_Y + APPLE_PODIUM_Y) * 0.5, mz);
    staticGroup.add(glassFin);

    // Hairline brushed-titanium joint bead
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.045, HEADER_BOT_Y - APPLE_PODIUM_Y, 0.028), titaniumSilverMat);
    seam.position.set(APPLE_DOOR_X, (HEADER_BOT_Y + APPLE_PODIUM_Y) * 0.5, mz);
    staticGroup.add(seam);
  });

  // Left & Right Framing Structural Columns flanking the 4.8m Automatic Entrance Portal (-33.4 & -28.6)
  [-33.4, -28.6].forEach((pz) => {
    // Full-height structural glass fin above portal (Y = 3.24..8.70)
    const upperFin = new THREE.Mesh(new THREE.BoxGeometry(0.28, HEADER_BOT_Y - 3.24, 0.035), finGlassMat);
    upperFin.position.set(APPLE_DOOR_X + 0.16, (HEADER_BOT_Y + 3.24) * 0.5, pz);
    staticGroup.add(upperFin);

    // Sleek brushed-titanium vertical door jamb stile (Y = 0.08..3.26) framing portal cleanly
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.20, 0.075), titaniumSilverMat);
    jamb.position.set(APPLE_DOOR_X, APPLE_PODIUM_Y + 1.60, pz);
    staticGroup.add(jamb);

    // Upper hairline seam
    const upperSeam = new THREE.Mesh(new THREE.BoxGeometry(0.05, HEADER_BOT_Y - 3.24, 0.03), titaniumSilverMat);
    upperSeam.position.set(APPLE_DOOR_X, (HEADER_BOT_Y + 3.24) * 0.5, pz);
    staticGroup.add(upperSeam);
  });

  // =========================================================================
  // 2C. ARCHITECTURAL AUTOMATIC SLIDING GLASS PORTAL (UNOBSTRUCTED CENTER!)
  // =========================================================================
  // Walk-off dark-slate vestibule entrance mat & recessed stainless slide track
  const vestibuleMat = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.012, 4.6),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.92 })
  );
  vestibuleMat.position.set(APPLE_DOOR_X, APPLE_PODIUM_Y + 0.006, APPLE_DOOR_Z);
  staticGroup.add(vestibuleMat);

  const slideTrack = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 9.6), brushedAluMat);
  slideTrack.position.set(APPLE_DOOR_X, APPLE_PODIUM_Y + 0.010, APPLE_DOOR_Z);
  staticGroup.add(slideTrack);

  // Sleek Brushed-Titanium Overhead Sensor & Transom Header Box (Y = 3.16..3.38)
  const doorHeaderBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 4.92), titaniumSilverMat);
  doorHeaderBeam.position.set(APPLE_DOOR_X, 3.26, APPLE_DOOR_Z);
  staticGroup.add(doorHeaderBeam);

  // Recessed warm soffit downlights under transom header
  [-32.4, -31.0, -29.6].forEach((dz) => {
    const downlight = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.025, 14), ceilingBulbMat);
    downlight.position.set(APPLE_DOOR_X - 0.04, 3.155, dz);
    staticGroup.add(downlight);
  });

  // Motion Sensor Pod centered on top exterior face of portal header
  const sensorPod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.52), revealTrimMat);
  sensorPod.position.set(APPLE_DOOR_X - 0.15, 3.27, APPLE_DOOR_Z);
  staticGroup.add(sensorPod);

  const sensorLed = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 0.14), sensorActiveMat);
  sensorLed.position.set(APPLE_DOOR_X - 0.19, 3.27, APPLE_DOOR_Z);
  staticGroup.add(sensorLed);

  // Store Hours & Welcome Frosted Plaque beside entrance (Z = -34.2)
  const plaqueMat = new THREE.MeshStandardMaterial({
    map: createDoorHoursPlaqueTex(),
    roughness: 0.35,
    transparent: true,
  });
  const hoursPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.96), plaqueMat);
  hoursPlaque.position.set(APPLE_DOOR_X - 0.04, APPLE_PODIUM_Y + 1.48, -34.2);
  staticGroup.add(hoursPlaque);

  // Two frameless Sliding Tempered Glass Leaves (no middle post blocking doorway!)
  const doorPanelW = 2.40;
  const doorPanelH = 3.06;

  const buildSlidingDoorLeaf = (side: -1 | 1): THREE.Group => {
    const leafGrp = new THREE.Group();
    leafGrp.userData.noMerge = true;
    leafGrp.position.set(APPLE_DOOR_X + 0.04, APPLE_PODIUM_Y, APPLE_DOOR_Z + side * (doorPanelW * 0.5));

    // Main tempered glass pane
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.035, doorPanelH, doorPanelW), curtainGlassMat);
    pane.userData.noMerge = true;
    pane.position.set(0, doorPanelH * 0.5, 0);
    leafGrp.add(pane);

    // Sleek brushed-stainless top & bottom clamp rails
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, doorPanelW), brushedAluMat);
    topRail.userData.noMerge = true;
    topRail.position.set(0, doorPanelH - 0.038, 0);
    leafGrp.add(topRail);

    const botRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, doorPanelW), brushedAluMat);
    botRail.userData.noMerge = true;
    botRail.position.set(0, 0.038, 0);
    leafGrp.add(botRail);

    // Subtle frosted safety manifestation stripe across eye level
    const frostBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, doorPanelW - 0.08), frostedStripMat);
    frostBand.userData.noMerge = true;
    frostBand.position.set(0, 1.32, 0);
    leafGrp.add(frostBand);

    // Outer pocket vertical rail edge (on away side from center seam so closed middle seam stays razor-clean!)
    const outerStile = new THREE.Mesh(new THREE.BoxGeometry(0.055, doorPanelH, 0.038), brushedAluMat);
    outerStile.userData.noMerge = true;
    outerStile.position.set(0, doorPanelH * 0.5, side * (doorPanelW * 0.5 - 0.02));
    leafGrp.add(outerStile);

    // Machined vertical tubular stainless handle near meeting edge
    const handleZ = -side * (doorPanelW * 0.5 - 0.24);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.18, 12), brushedAluMat);
    bar.userData.noMerge = true;
    bar.position.set(-0.075, 1.24, handleZ);
    leafGrp.add(bar);

    [-0.45, 0.45].forEach((dy) => {
      const standoff = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.07, 8), titaniumSilverMat);
      standoff.userData.noMerge = true;
      standoff.rotation.z = Math.PI / 2;
      standoff.position.set(-0.04, 1.24 + dy, handleZ);
      leafGrp.add(standoff);
    });

    staticGroup.add(leafGrp);
    return leafGrp;
  };

  const slidingDoorL = buildSlidingDoorLeaf(-1);
  const slidingDoorR = buildSlidingDoorLeaf(1);

  // Night Security Rolling Shutter tucked smoothly into brushed-titanium header casing (23:00-07:00)
  const shutterTex = createRollingShutterTexture({
    title: 'APPLE FLAGSHIP STORE',
    hoursLabel: 'MỞ CỬA: 07:00 - 23:00  •  OPEN DAILY',
    accentHex: '#334155',
    slatDarkHex: '#1e293b',
    slatLightHex: '#475569',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.42,
    metalness: 0.55,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'apple_main_shutter',
      axis: 'z',
      pos: APPLE_DOOR_X - 0.14,
      spanCenter: APPLE_DOOR_Z,
      width: 4.8,
      baseY: APPLE_PODIUM_Y,
      topY: 3.16,
    },
    shutterMat,
    titaniumSilverMat
  );

  // =========================================================================
  // 3. ICONIC SCULPTED GLOWING WHITE 3D APPLE LOGO (CENTERED IN GLASS ATRIUM)
  // =========================================================================
  const heroAppleLogo = buildSculptedAppleLogoMesh(appleGlowMat, 1.66, 0.18);
  heroAppleLogo.rotation.y = -Math.PI / 2;
  heroAppleLogo.position.set(APPLE_DOOR_X - 0.06, 7.55, APPLE_DOOR_Z);
  staticGroup.add(heroAppleLogo);

  // Ultra-fine brushed steel suspension cables anchoring logo cleanly to soffit header
  [-0.28, 0.28].forEach((dz) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 2.15, 6), brushedAluMat);
    cable.position.set(APPLE_DOOR_X + 0.08, 9.54, APPLE_DOOR_Z + dz);
    staticGroup.add(cable);
  });

  // =========================================================================
  // 4. INTERIOR ATRIUM CEILING, COLUMNS, FLOOR 2 MEZZANINE & OAK TABLES
  // =========================================================================
  const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(23.2, 0.14, 27.0), ceilingTimberMat);
  ceilingSlab.position.set(400.4, HEADER_BOT_Y - 0.06, -31.0);
  staticGroup.add(ceilingSlab);

  for (let i = 0; i < 6; i++) {
    const lz = -41.5 + i * 4.2;
    const ledChannel = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.07, 0.26), ceilingLedMat);
    ledChannel.position.set(400.2, HEADER_BOT_Y - 0.15, lz);
    staticGroup.add(ledChannel);

    // Bright recessed spot bulbs flanking each upper ceiling light channel
    [-392.2, -396.0, -400.2, -404.4, -408.6].forEach((negX) => {
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), ceilingBulbMat);
      bulb.position.set(-negX, HEADER_BOT_Y - 0.135, lz + (i < 5 ? 2.1 : -2.1));
      staticGroup.add(bulb);
    });
  }

  // Two clean pale architectural interior columns flanking central atrium
  [-36.6, -25.4].forEach((cz) => {
    const colH = ATRIUM_CLEAR_H - 0.08;
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, colH, 0.55), interiorWallMat);
    col.position.set(396.3, APPLE_PODIUM_Y + colH * 0.5, cz);
    staticGroup.add(col);
  });

  // Floor 2 Mezzanine Slab split cleanly around NE Stairwell Opening (X = 406.8..411.8, Z = -44.5..-37.4)
  const f2WestDeck = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.28, 27.0), floorMat);
  f2WestDeck.position.set(401.6, APPLE_PODIUM_Y + APPLE_FLOOR_H - 0.14, -31.0);
  f2WestDeck.receiveShadow = true;
  staticGroup.add(f2WestDeck);

  const f2SouthEastDeck = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.28, 20.0), floorMat);
  f2SouthEastDeck.position.set(409.3, APPLE_PODIUM_Y + APPLE_FLOOR_H - 0.14, -27.4);
  f2SouthEastDeck.receiveShadow = true;
  staticGroup.add(f2SouthEastDeck);

  for (let i = 0; i < 5; i++) {
    const lz = -40.5 + i * 4.8;
    const f1Led = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.06, 0.22), ceilingLedMat);
    f1Led.position.set(403.6, APPLE_PODIUM_Y + APPLE_FLOOR_H - 0.30, lz);
    staticGroup.add(f1Led);

    [398.2, 401.6, 405.0, 408.6].forEach((bx) => {
      const f1Bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.028, 12), ceilingBulbMat);
      f1Bulb.position.set(bx, APPLE_PODIUM_Y + APPLE_FLOOR_H - 0.285, lz + (i < 4 ? 2.4 : -2.4));
      staticGroup.add(f1Bulb);
    });
  }

  const f2BalustradeGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.12, 26.8), railGlassMat);
  f2BalustradeGlass.position.set(396.42, APPLE_PODIUM_Y + APPLE_FLOOR_H + 0.56, -31.0);
  staticGroup.add(f2BalustradeGlass);

  const f2BalustradeCap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 26.8), brushedAluMat);
  f2BalustradeCap.position.set(396.42, APPLE_PODIUM_Y + APPLE_FLOOR_H + 1.13, -31.0);
  staticGroup.add(f2BalustradeCap);

  const f2FasciaBand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 26.9), ceilingTimberMat);
  f2FasciaBand.position.set(396.36, APPLE_PODIUM_Y + APPLE_FLOOR_H - 0.14, -31.0);
  staticGroup.add(f2FasciaBand);

  // Rear Hero Keynote Video Screen on East Inner Wall
  const keynoteTex = createAppleKeynoteScreenTex();
  const keynoteScreenMat = new THREE.MeshStandardMaterial({
    map: keynoteTex,
    emissive: 0xffffff,
    emissiveMap: keynoteTex,
    emissiveIntensity: 1.15,
    roughness: 0.25,
  });

  const keynoteFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.15, 11.4), revealTrimMat);
  keynoteFrame.position.set(411.62, APPLE_PODIUM_Y + 2.65, -31.0);
  staticGroup.add(keynoteFrame);

  const keynoteScreen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.95, 11.1), keynoteScreenMat);
  keynoteScreen.position.set(411.52, APPLE_PODIUM_Y + 2.65, -31.0);
  staticGroup.add(keynoteScreen);

  // =========================================================================
  // 4B. OFFICIAL APPLE CAMPAIGN POSTERS (BACKLIT LIGHTBOXES — EXACT ASPECT RATIOS)
  // =========================================================================
  const applePosterLoader = new THREE.TextureLoader();
  const createApplePosterMat = (imgUrl: string, fallbackTex: THREE.Texture, emissiveInt = 0.72) => {
    const mat = new THREE.MeshStandardMaterial({
      map: fallbackTex,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveMap: fallbackTex,
      emissiveIntensity: emissiveInt,
      roughness: 0.24,
    });
    if (typeof window !== 'undefined') {
      applePosterLoader.load(imgUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        mat.map = tex;
        mat.emissiveMap = tex;
        mat.needsUpdate = true;
      });
    }
    neonMats.push(mat);
    return mat;
  };

  const addAppleLightbox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    rotY: number,
    imgUrl: string,
    fallbackTex: THREE.Texture,
    emissiveInt = 0.72
  ) => {
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08), revealTrimMat);
    bezel.position.set(x, y, z);
    bezel.rotation.y = rotY;
    staticGroup.add(bezel);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.20, h + 0.20, 0.04), titaniumSilverMat);
    trim.position.set(x, y, z);
    trim.rotation.y = rotY;
    staticGroup.add(trim);

    const pMat = createApplePosterMat(imgUrl, fallbackTex, emissiveInt);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pMat);
    poster.userData.noMerge = true;
    const nx = Math.sin(rotY);
    const nz = Math.cos(rotY);
    poster.position.set(x + nx * 0.048, y, z + nz * 0.048);
    poster.rotation.y = rotY;
    staticGroup.add(poster);
  };

  const APPLE_POSTER_1_URL = '/assets/apple-posters/apple_poster_1.jpg'; // 3:2 Landscape (DUO & 18 PRO)
  const APPLE_POSTER_2_URL = '/assets/apple-posters/apple_poster_2.jpg'; // 9:16 Portrait (Foldable iPhone)

  const fallbackDuoTex = createSidePosterTex('#f59e0b', 'iPhone 18 Pro', 'Duo Innovation');
  const fallbackFoldTex = createSidePosterTex('#38bdf8', 'Foldable iPhone', 'New Era Unfolding');

  // 1. Exterior West Front Stone Piers facing Đường Sơn Tây Bắc (9:16 Portrait)
  [-44.1, -17.9].forEach((pz) => {
    addAppleLightbox(388.36, 4.55, pz, 1.80, 3.20, -Math.PI / 2, APPLE_POSTER_2_URL, fallbackFoldTex, 0.76);
  });

  // 2. Giant Floor 2 Upper Atrium Feature Poster visible straight through 10.6m curtain glass (3:2 Landscape)
  addAppleLightbox(411.58, 7.75, -28.8, 6.00, 4.00, -Math.PI / 2, APPLE_POSTER_1_URL, fallbackDuoTex, 0.78);

  // 3. Exterior South Wall facing LV Plaza Corridor (3:2 Landscape)
  addAppleLightbox(400.5, 6.30, -16.75, 5.40, 3.60, 0, APPLE_POSTER_1_URL, fallbackDuoTex, 0.72);

  // 4. Floor 1 North & South "The Avenue" Accessory Bays + Real Apple Posters
  const buildAvenueBay = (x: number, z: number, facingDirZ: number, usePortrait: boolean) => {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(8.6, 3.3, 0.55), oakMat);
    recess.position.set(x, APPLE_PODIUM_Y + 1.75, z);
    staticGroup.add(recess);

    for (let row = 0; row < 3; row++) {
      const sy = APPLE_PODIUM_Y + 1.05 + row * 0.72;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.05, 0.26), brushedAluMat);
      shelf.position.set(x + 1.6, sy, z + facingDirZ * 0.34);
      staticGroup.add(shelf);
      const colPalette = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x6366f1, 0xf43f5e];
      for (let k = 0; k < 6; k++) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.36, 0.14),
          new THREE.MeshStandardMaterial({ color: colPalette[(k + row) % colPalette.length], roughness: 0.4 })
        );
        box.position.set(x - 0.1 + k * 0.68, sy + 0.20, z + facingDirZ * 0.36);
        staticGroup.add(box);
      }
    }

    const rotY = facingDirZ > 0 ? 0 : Math.PI;
    if (usePortrait) {
      addAppleLightbox(x - 2.4, APPLE_PODIUM_Y + 1.85, z + facingDirZ * 0.30, 1.44, 2.56, rotY, APPLE_POSTER_2_URL, fallbackFoldTex, 0.72);
    } else {
      addAppleLightbox(x - 2.4, APPLE_PODIUM_Y + 1.85, z + facingDirZ * 0.30, 2.70, 1.80, rotY, APPLE_POSTER_1_URL, fallbackDuoTex, 0.72);
    }
  };
  buildAvenueBay(399.2, -44.05, 1, false);
  buildAvenueBay(399.2, -17.95, -1, true);

  // 5. Floor 2 North & South Gallery Feature Posters (3:2 Landscape)
  addAppleLightbox(403.5, APPLE_PODIUM_Y + APPLE_FLOOR_H + 2.35, -44.28, 3.60, 2.40, 0, APPLE_POSTER_1_URL, fallbackDuoTex, 0.72);
  addAppleLightbox(403.5, APPLE_PODIUM_Y + APPLE_FLOOR_H + 2.35, -17.72, 3.60, 2.40, Math.PI, APPLE_POSTER_1_URL, fallbackDuoTex, 0.72);

  const buildAppleOakTable = (
    cx: number,
    baseY: number,
    cz: number,
    w: number,
    d: number,
    deviceType: 'iphone' | 'macbook' | 'ipad' | 'imac' | 'watch' | 'vision'
  ) => {
    const tableH = 0.86;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.075, d), oakMat);
    top.position.set(cx, baseY + tableH, cz);
    top.castShadow = true;
    top.receiveShadow = true;
    staticGroup.add(top);

    [
      [-w * 0.44, -d * 0.44],
      [w * 0.44, -d * 0.44],
      [-w * 0.44, d * 0.44],
      [w * 0.44, d * 0.44],
    ].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.085, tableH, 0.085), oakMat);
      leg.position.set(cx + dx, baseY + tableH * 0.5, cz + dz);
      staticGroup.add(leg);
    });

    const topY = baseY + tableH + 0.038;
    const screenColors = [0x38bdf8, 0xfbbf24, 0xa855f7, 0x34d399, 0xf472b6, 0x60a5fa];
    const count = 4;
    const stepZ = (d - 0.9) / Math.max(1, count - 1);

    for (let i = 0; i < count; i++) {
      const dz = -d * 0.5 + 0.45 + i * stepZ;
      [-w * 0.24, w * 0.24].forEach((dx, colIdx) => {
        const px = cx + dx;
        const pz = cz + dz;
        const scrMat = new THREE.MeshStandardMaterial({
          color: screenColors[(i + colIdx) % screenColors.length],
          emissive: screenColors[(i + colIdx) % screenColors.length],
          emissiveIntensity: 0.72,
          roughness: 0.15,
        });

        if (deviceType === 'iphone' || deviceType === 'ipad') {
          const isPad = deviceType === 'ipad';
          const dw = isPad ? 0.24 : 0.11;
          const dh = isPad ? 0.30 : 0.20;
          const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.08), brushedAluMat);
          stand.position.set(px, topY + 0.025, pz);
          staticGroup.add(stand);

          const body = new THREE.Mesh(new THREE.BoxGeometry(0.018, dh, dw), revealTrimMat);
          body.position.set(px, topY + dh * 0.5 + 0.03, pz);
          body.rotation.z = dx < 0 ? -0.35 : 0.35;
          staticGroup.add(body);

          const scr = new THREE.Mesh(new THREE.BoxGeometry(0.022, dh * 0.88, dw * 0.88), scrMat);
          scr.position.copy(body.position);
          scr.rotation.copy(body.rotation);
          staticGroup.add(scr);
        } else if (deviceType === 'macbook') {
          const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.016, 0.36), brushedAluMat);
          base.position.set(px, topY + 0.008, pz);
          staticGroup.add(base);

          const lid = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.24, 0.36), brushedAluMat);
          lid.position.set(px + (dx < 0 ? 0.12 : -0.12), topY + 0.125, pz);
          lid.rotation.z = dx < 0 ? 0.22 : -0.22;
          staticGroup.add(lid);

          const scr = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.21, 0.33), scrMat);
          scr.position.set(lid.position.x + (dx < 0 ? -0.004 : 0.004), lid.position.y, pz);
          scr.rotation.copy(lid.rotation);
          staticGroup.add(scr);
        } else if (deviceType === 'imac') {
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.22), brushedAluMat);
          foot.position.set(px, topY + 0.008, pz);
          staticGroup.add(foot);
          const neck = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.08), brushedAluMat);
          neck.position.set(px, topY + 0.09, pz);
          staticGroup.add(neck);
          const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.34, 0.52), brushedAluMat);
          monitor.position.set(px, topY + 0.28, pz);
          staticGroup.add(monitor);
          const scr = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.48), scrMat);
          scr.position.set(px, topY + 0.29, pz);
          staticGroup.add(scr);
        } else if (deviceType === 'watch') {
          const tray = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.34), oakMat);
          tray.position.set(px, topY + 0.015, pz);
          staticGroup.add(tray);
          const watchFace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.07), scrMat);
          watchFace.position.set(px, topY + 0.04, pz);
          staticGroup.add(watchFace);
        } else {
          const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 12), brushedAluMat);
          pedestal.position.set(px, topY + 0.09, pz);
          staticGroup.add(pedestal);
          const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.10, 0.22),
            new THREE.MeshStandardMaterial({
              color: 0x0f172a,
              roughness: 0.10,
              metalness: 0.78,
            })
          );
          visor.position.set(px, topY + 0.21, pz);
          staticGroup.add(visor);
        }
      });
    }
  };

  buildAppleOakTable(393.0, APPLE_PODIUM_Y, -39.1, 1.8, 4.2, 'iphone');
  buildAppleOakTable(393.0, APPLE_PODIUM_Y, -31.0, 1.8, 4.2, 'iphone');
  buildAppleOakTable(393.0, APPLE_PODIUM_Y, -22.9, 1.8, 4.2, 'macbook');

  buildAppleOakTable(399.2, APPLE_PODIUM_Y, -39.1, 1.8, 4.2, 'ipad');
  buildAppleOakTable(399.2, APPLE_PODIUM_Y, -31.0, 1.8, 4.2, 'watch');
  buildAppleOakTable(399.2, APPLE_PODIUM_Y, -22.9, 1.8, 4.2, 'vision');

  buildAppleOakTable(405.5, APPLE_PODIUM_Y, -31.0, 1.5, 6.0, 'macbook');

  const F2_Y = APPLE_PODIUM_Y + APPLE_FLOOR_H;
  buildAppleOakTable(400.1, F2_Y, -37.0, 1.8, 4.4, 'imac');
  buildAppleOakTable(400.1, F2_Y, -25.0, 1.8, 4.4, 'imac');
  buildAppleOakTable(408.6, F2_Y, -29.5, 1.7, 9.6, 'macbook');

  for (let i = 0; i < 6; i++) {
    const sz = -33.8 + i * 1.7;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.62, 10), brushedAluMat);
    stem.position.set(406.95, F2_Y + 0.31, sz);
    staticGroup.add(stem);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12), oakMat);
    seat.position.set(406.95, F2_Y + 0.63, sz);
    staticGroup.add(seat);
  }

  // =========================================================================
  // 5. NE FLOATING OAK & GLASS SWITCHBACK STAIRCASE
  // =========================================================================
  const stairXLeft = 408.05;
  const stairXRight = 410.6;
  const stairZFront = -37.4;
  const stairZLand = -42.3;
  const midY = APPLE_PODIUM_Y + APPLE_FLOOR_H * 0.5;

  const stepCount = 11;
  for (let i = 0; i < stepCount; i++) {
    const t = (i + 0.5) / stepCount;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.10, 0.44), oakMat);
    tread.position.set(
      stairXLeft,
      APPLE_PODIUM_Y + t * (APPLE_FLOOR_H * 0.5) - 0.05,
      stairZFront - t * (stairZFront - stairZLand)
    );
    staticGroup.add(tread);
  }

  const midLanding = new THREE.Mesh(new THREE.BoxGeometry(4.85, 0.16, 2.2), oakMat);
  midLanding.position.set(409.3, midY - 0.08, -43.35);
  staticGroup.add(midLanding);

  for (let i = 0; i < stepCount; i++) {
    const t = (i + 0.5) / stepCount;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.10, 0.44), oakMat);
    tread.position.set(
      stairXRight,
      midY + t * (APPLE_FLOOR_H * 0.5) - 0.05,
      stairZLand + t * (stairZFront - stairZLand)
    );
    staticGroup.add(tread);
  }

  const stairWestGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, APPLE_FLOOR_H + 1.15, 7.2), railGlassMat);
  stairWestGlass.position.set(406.82, APPLE_PODIUM_Y + (APPLE_FLOOR_H + 1.15) * 0.5, -40.85);
  staticGroup.add(stairWestGlass);

  const stairCenterWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, APPLE_FLOOR_H + 1.15, 5.1), interiorWallMat);
  stairCenterWall.position.set(409.3, APPLE_PODIUM_Y + (APPLE_FLOOR_H + 1.15) * 0.5, -39.75);
  staticGroup.add(stairCenterWall);

  const f2StairDownGuard = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.12, 0.06), railGlassMat);
  f2StairDownGuard.position.set(408.05, F2_Y + 0.56, -37.25);
  staticGroup.add(f2StairDownGuard);

  // =========================================================================
  // 6. FOREGROUND ANIMATED PLAZA WATER-JET FOUNTAINS (ORGANIC AERATED PLUMES!)
  // =========================================================================
  const fountainGroup = new THREE.Group();
  fountainGroup.userData.noMerge = true;

  const wetGraniteMat = new THREE.MeshStandardMaterial({
    map: createWetGraniteFountainDeckTex(),
    color: 0xffffff,
    roughness: 0.14,
    metalness: 0.25,
  });

  const waterSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0xdbf4ff,
    roughness: 0.06,
    metalness: 0.12,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });

  const jetCoreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf0f9ff,
    emissiveIntensity: 0.52,
    roughness: 0.18,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });
  neonMats.push(jetCoreMat);

  const jetMistMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  neonMats.push(jetMistMat);

  const dropletMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    transparent: true,
    opacity: 0.82,
  });
  neonMats.push(dropletMat);

  const jetLightsMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  neonMats.push(jetLightsMat);

  interface WaterJetAnim {
    core: THREE.Mesh;
    mist: THREE.Mesh;
    crest: THREE.Mesh;
    dropA: THREE.Mesh;
    dropB: THREE.Mesh;
    rippleRing: THREE.Mesh;
    phase: number;
    baseMaxH: number;
  }
  const waterJets: WaterJetAnim[] = [];

  const unitCoreGeo = new THREE.CylinderGeometry(0.028, 0.058, 1.0, 10);
  unitCoreGeo.translate(0, 0.5, 0);
  const unitMistGeo = new THREE.CylinderGeometry(0.088, 0.052, 1.0, 10);
  unitMistGeo.translate(0, 0.5, 0);
  const crestGeo = new THREE.SphereGeometry(0.095, 10, 8);
  const dropletGeo = new THREE.SphereGeometry(0.048, 8, 6);
  const unitRippleGeo = new THREE.RingGeometry(0.11, 0.21, 16);
  unitRippleGeo.rotateX(-Math.PI / 2);

  [
    { centerZ: -39.8, zRows: [-42.4, -41.1, -39.8, -38.5, -37.2] },
    { centerZ: -22.2, zRows: [-24.8, -23.5, -22.2, -20.9, -19.6] },
  ].forEach((basin, bIdx) => {
    // Flush wet dark-granite plaza drain deck
    const pad = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.018, 6.8), wetGraniteMat);
    pad.position.set(385.8, APPLE_PODIUM_Y + 0.009, basin.centerZ);
    staticGroup.add(pad);

    const waterGlaze = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 6.62), waterSurfaceMat);
    waterGlaze.userData.noMerge = true;
    waterGlaze.rotation.x = -Math.PI / 2;
    waterGlaze.position.set(385.8, APPLE_PODIUM_Y + 0.022, basin.centerZ);
    staticGroup.add(waterGlaze);

    [385.15, 386.45].forEach((nx, colIdx) => {
      basin.zRows.forEach((nz, rowIdx) => {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.022, 12), brushedAluMat);
        ring.position.set(nx, APPLE_PODIUM_Y + 0.022, nz);
        staticGroup.add(ring);

        const uplight = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), jetLightsMat);
        uplight.rotation.x = -Math.PI / 2;
        uplight.position.set(nx, APPLE_PODIUM_Y + 0.034, nz);
        staticGroup.add(uplight);

        const core = new THREE.Mesh(unitCoreGeo, jetCoreMat);
        core.userData.noMerge = true;
        core.position.set(nx, APPLE_PODIUM_Y + 0.03, nz);
        fountainGroup.add(core);

        const mist = new THREE.Mesh(unitMistGeo, jetMistMat);
        mist.userData.noMerge = true;
        mist.position.set(nx, APPLE_PODIUM_Y + 0.03, nz);
        fountainGroup.add(mist);

        const crest = new THREE.Mesh(crestGeo, dropletMat);
        crest.userData.noMerge = true;
        crest.position.set(nx, APPLE_PODIUM_Y + 1.8, nz);
        fountainGroup.add(crest);

        const dropA = new THREE.Mesh(dropletGeo, dropletMat);
        dropA.userData.noMerge = true;
        dropA.position.set(nx + 0.07, APPLE_PODIUM_Y + 1.5, nz - 0.05);
        fountainGroup.add(dropA);

        const dropB = new THREE.Mesh(dropletGeo, dropletMat);
        dropB.userData.noMerge = true;
        dropB.position.set(nx - 0.06, APPLE_PODIUM_Y + 1.3, nz + 0.06);
        fountainGroup.add(dropB);

        const ripple = new THREE.Mesh(unitRippleGeo, dropletMat);
        ripple.userData.noMerge = true;
        ripple.position.set(nx, APPLE_PODIUM_Y + 0.026, nz);
        fountainGroup.add(ripple);

        waterJets.push({
          core,
          mist,
          crest,
          dropA,
          dropB,
          rippleRing: ripple,
          phase: rowIdx * 0.65 + colIdx * 1.15 + bIdx * 0.4,
          baseMaxH: 2.25 + ((rowIdx + colIdx) % 2) * 0.42,
        });
      });
    });
  });

  staticGroup.add(fountainGroup);

  // =========================================================================
  // 7. ARCHITECTURAL WARM & COOL LIGHT RIG
  // =========================================================================
  const atriumLight = new THREE.PointLight(0xfffdf5, 5.2, 38.0, 1.0);
  atriumLight.position.set(395.5, 7.6, -31.0);

  const floor2Light = new THREE.PointLight(0xfffbeb, 4.4, 32.0, 1.0);
  floor2Light.position.set(404.0, F2_Y + 3.4, -31.0);

  const plazaLight = new THREE.PointLight(0xe0f2fe, 1.8, 24.0, 1.0);
  plazaLight.position.set(385.5, 4.5, -31.0);

  let doorOpenProg = 0;
  let shutterProg = 0;
  let fountainTime = 0;
  let currentOpenFactor = 1;

  scaledLights.push(
    { light: atriumLight, dayInt: 5.2, nightInt: 9.2, getScale: () => currentOpenFactor },
    { light: floor2Light, dayInt: 4.4, nightInt: 7.8, getScale: () => currentOpenFactor },
    { light: plazaLight, dayInt: 1.4, nightInt: 4.4, getScale: () => 1 }
  );

  const poolGlowMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  poolMats.push(poolGlowMat);
  const plazaPool = new THREE.Mesh(new THREE.PlaneGeometry(14.0, 26.0), poolGlowMat);
  plazaPool.rotation.x = -Math.PI / 2;
  plazaPool.position.set(386.0, 0.014, -31.0);
  staticGroup.add(plazaPool);

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => shutterProg,
    update: (delta, rawHour, lampFactor, playerPos, npcController) => {
      const dt = Math.min(delta, 0.1);
      fountainTime += dt;

      const isOpen = isAppleStoreOpenAtHour(rawHour);
      currentOpenFactor = isOpen ? 1 : 0.15;
      const targetShutter = isOpen ? 0 : 1;
      shutterProg += (targetShutter - shutterProg) * Math.min(1, dt * 3.5);
      setShutterProgress(mainShutter, shutterProg);

      const playerNearDoor =
        !!playerPos &&
        Math.hypot(playerPos.x - APPLE_DOOR_X, playerPos.z - APPLE_DOOR_Z) < 4.4 &&
        playerPos.y < 2.2;
      const npcNear = !!npcController?.hasNpcNearDoor();
      const targetDoor = isOpen && (playerNearDoor || npcNear) ? 1 : 0;
      doorOpenProg += (targetDoor - doorOpenProg) * Math.min(1, dt * 6.0);

      const slideOffset = doorOpenProg * 2.15;
      slidingDoorL.position.z = APPLE_DOOR_Z - doorPanelW * 0.5 - slideOffset;
      slidingDoorR.position.z = APPLE_DOOR_Z + doorPanelW * 0.5 + slideOffset;

      const activeScale = isOpen ? 1.0 : 0.25;
      for (let i = 0; i < waterJets.length; i++) {
        const j = waterJets[i];
        const wave = 0.52 + 0.48 * Math.sin(fountainTime * 2.3 + j.phase);
        const shimmer = 0.93 + 0.07 * Math.sin(fountainTime * 11.0 + j.phase * 3.0);
        const jetH = Math.max(0.22, j.baseMaxH * wave * shimmer * activeScale);

        j.core.scale.set(0.9 + 0.18 * wave, jetH, 0.9 + 0.18 * wave);
        j.mist.scale.set(0.85 + 0.32 * wave, jetH * 0.96, 0.85 + 0.32 * wave);

        j.crest.position.y = APPLE_PODIUM_Y + 0.03 + jetH;
        j.crest.scale.set(0.9 + 0.3 * wave, 1.35, 0.9 + 0.3 * wave);

        const dropPhaseA = ((fountainTime * 1.9 + j.phase) % 1.0);
        const dropPhaseB = ((fountainTime * 2.1 + j.phase + 0.48) % 1.0);
        j.dropA.position.y = APPLE_PODIUM_Y + 0.15 + jetH * (0.45 + 0.58 * Math.sin(dropPhaseA * Math.PI));
        j.dropB.position.y = APPLE_PODIUM_Y + 0.15 + jetH * (0.35 + 0.64 * Math.sin(dropPhaseB * Math.PI));

        const rippleWave = ((fountainTime * 1.45 + j.phase) % 1.0);
        j.rippleRing.scale.setScalar(0.6 + rippleWave * 1.45);
      }

      appleGlowMat.emissiveIntensity = THREE.MathUtils.lerp(1.9, 3.6, lampFactor);
      ceilingLedMat.emissiveIntensity = isOpen ? THREE.MathUtils.lerp(2.4, 4.4, lampFactor) : 0.22;
      ceilingBulbMat.emissiveIntensity = isOpen ? THREE.MathUtils.lerp(2.8, 4.8, lampFactor) : 0.25;
      keynoteScreenMat.emissiveIntensity = isOpen ? THREE.MathUtils.lerp(1.05, 1.85, lampFactor) : 0.15;
    },
  };
}

// =========================================================================
// APPLE FLAGSHIP STORE NPC CONTROLLER (GENIUS SPECIALISTS & APPLE SHOPPERS)
// =========================================================================

interface AppleActor {
  id: number;
  kind: 'specialist' | 'shopper';
  root: THREE.Group;
  headMesh: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  appleBag: THREE.Mesh;
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
  exitDone: boolean;
  speed: number;
  seed: number;
  glbHandle: GlbHumanHandle;
}

const APPLE_F1_SPOTS = [
  { x: 391.4, z: -38.8, yaw: Math.PI / 2 },
  { x: 391.4, z: -31.2, yaw: Math.PI / 2 },
  { x: 394.8, z: -23.0, yaw: -Math.PI / 2 },
  { x: 397.4, z: -39.0, yaw: Math.PI / 2 },
  { x: 401.2, z: -30.5, yaw: -Math.PI / 2 },
  { x: 401.2, z: -22.5, yaw: -Math.PI / 2 },
  { x: 403.9, z: -31.5, yaw: Math.PI / 2 },
];

const APPLE_F2_SPOTS = [
  { x: 398.0, z: -37.0, yaw: Math.PI / 2 },
  { x: 398.0, z: -25.0, yaw: Math.PI / 2 },
  { x: 405.8, z: -32.2, yaw: Math.PI / 2 },
  { x: 405.8, z: -27.0, yaw: Math.PI / 2 },
];

const APPLE_MID_Y = APPLE_PODIUM_Y + APPLE_FLOOR_H * 0.5;
const APPLE_F2_Y = APPLE_PODIUM_Y + APPLE_FLOOR_H;

// Exact orthogonal switchback staircase waypoints aligned to tread centers (no center-wall clipping!)
const APPLE_STAIR_UP_PTS = [
  new THREE.Vector3(408.05, APPLE_PODIUM_Y, -36.4),
  new THREE.Vector3(408.05, APPLE_PODIUM_Y, -37.4),
  new THREE.Vector3(408.05, APPLE_MID_Y, -42.3),
  new THREE.Vector3(408.05, APPLE_MID_Y, -43.35),
  new THREE.Vector3(410.6, APPLE_MID_Y, -43.35),
  new THREE.Vector3(410.6, APPLE_MID_Y, -42.3),
  new THREE.Vector3(410.6, APPLE_F2_Y, -37.4),
  new THREE.Vector3(410.6, APPLE_F2_Y, -36.0),
];

const APPLE_STAIR_DOWN_PTS = [
  new THREE.Vector3(410.6, APPLE_F2_Y, -36.0),
  new THREE.Vector3(410.6, APPLE_F2_Y, -37.4),
  new THREE.Vector3(410.6, APPLE_MID_Y, -42.3),
  new THREE.Vector3(410.6, APPLE_MID_Y, -43.35),
  new THREE.Vector3(408.05, APPLE_MID_Y, -43.35),
  new THREE.Vector3(408.05, APPLE_MID_Y, -42.3),
  new THREE.Vector3(408.05, APPLE_PODIUM_Y, -37.4),
  new THREE.Vector3(408.05, APPLE_PODIUM_Y, -36.4),
];

function clonePoints(pts: THREE.Vector3[]): THREE.Vector3[] {
  return pts.map((p) => p.clone());
}

/**
 * Builds an obstacle-free multi-floor Apple Store navigation path from any current position
 * to a Floor 1 or Floor 2 spot, routing strictly through clear cross-aisles and the NE switchback stairs.
 */
export function buildAppleStoreBrowseRoute(
  fromPos: THREE.Vector3,
  toSpot: { x: number; z: number },
  destFloor: 1 | 2,
  fromOutside: boolean
): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];
  const curFloor: 1 | 2 = !fromOutside && fromPos.y > APPLE_PODIUM_Y + 2.0 ? 2 : 1;

  if (fromOutside) {
    path.push(
      new THREE.Vector3(385.5, APPLE_PODIUM_Y, APPLE_DOOR_Z),
      new THREE.Vector3(390.8, APPLE_PODIUM_Y, APPLE_DOOR_Z)
    );
  }

  const startX = fromOutside ? 390.8 : fromPos.x;
  const startZ = fromOutside ? APPLE_DOOR_Z : fromPos.z;

  if (curFloor === 1 && destFloor === 1) {
    const crossZ = (startZ + toSpot.z) * 0.5 <= -31.0 ? -35.0 : -27.0;
    path.push(
      new THREE.Vector3(startX, APPLE_PODIUM_Y, crossZ),
      new THREE.Vector3(toSpot.x, APPLE_PODIUM_Y, crossZ),
      new THREE.Vector3(toSpot.x, APPLE_PODIUM_Y, toSpot.z)
    );
    return path;
  }

  if (curFloor === 1 && destFloor === 2) {
    path.push(
      new THREE.Vector3(startX, APPLE_PODIUM_Y, -35.0),
      new THREE.Vector3(402.5, APPLE_PODIUM_Y, -35.0),
      new THREE.Vector3(408.05, APPLE_PODIUM_Y, -35.6),
      ...clonePoints(APPLE_STAIR_UP_PTS),
      new THREE.Vector3(403.5, APPLE_F2_Y, -36.0)
    );
    if (toSpot.x < 402.0) {
      path.push(
        new THREE.Vector3(403.5, APPLE_F2_Y, -31.0),
        new THREE.Vector3(toSpot.x, APPLE_F2_Y, -31.0),
        new THREE.Vector3(toSpot.x, APPLE_F2_Y, toSpot.z)
      );
    } else {
      path.push(
        new THREE.Vector3(403.5, APPLE_F2_Y, toSpot.z),
        new THREE.Vector3(toSpot.x, APPLE_F2_Y, toSpot.z)
      );
    }
    return path;
  }

  if (curFloor === 2 && destFloor === 2) {
    if (startX < 402.0) {
      path.push(
        new THREE.Vector3(startX, APPLE_F2_Y, -31.0),
        new THREE.Vector3(403.5, APPLE_F2_Y, -31.0)
      );
    } else {
      path.push(new THREE.Vector3(403.5, APPLE_F2_Y, startZ));
    }
    if (toSpot.x < 402.0) {
      path.push(
        new THREE.Vector3(403.5, APPLE_F2_Y, -31.0),
        new THREE.Vector3(toSpot.x, APPLE_F2_Y, -31.0),
        new THREE.Vector3(toSpot.x, APPLE_F2_Y, toSpot.z)
      );
    } else {
      path.push(
        new THREE.Vector3(403.5, APPLE_F2_Y, toSpot.z),
        new THREE.Vector3(toSpot.x, APPLE_F2_Y, toSpot.z)
      );
    }
    return path;
  }

  // curFloor === 2 && destFloor === 1
  if (startX < 402.0) {
    path.push(
      new THREE.Vector3(startX, APPLE_F2_Y, -31.0),
      new THREE.Vector3(403.5, APPLE_F2_Y, -31.0)
    );
  } else {
    path.push(new THREE.Vector3(403.5, APPLE_F2_Y, startZ));
  }
  path.push(
    new THREE.Vector3(403.5, APPLE_F2_Y, -36.0),
    ...clonePoints(APPLE_STAIR_DOWN_PTS),
    new THREE.Vector3(402.5, APPLE_PODIUM_Y, -35.0),
    new THREE.Vector3(toSpot.x, APPLE_PODIUM_Y, -35.0),
    new THREE.Vector3(toSpot.x, APPLE_PODIUM_Y, toSpot.z)
  );
  return path;
}

/**
 * Builds an obstacle-free evacuation/exit route from any position (Floor 1, Floor 2, or mid-staircase)
 * out through the automatic sliding doors to the Sơn Tây Bắc sidewalk.
 */
export function buildAppleStoreExitRoute(fromPos: THREE.Vector3, actorId: number): THREE.Vector3[] {
  const sidewalkOutZ = APPLE_DOOR_Z + (actorId % 2 === 0 ? -4.0 : 4.0);
  const f1DoorExit = [
    new THREE.Vector3(390.8, APPLE_PODIUM_Y, APPLE_DOOR_Z),
    new THREE.Vector3(APPLE_DOOR_X, APPLE_PODIUM_Y, APPLE_DOOR_Z),
    new THREE.Vector3(385.5, APPLE_PODIUM_Y, APPLE_DOOR_Z),
    new THREE.Vector3(381.8, 0.02, sidewalkOutZ),
  ];

  // Outside or plaza already near exit
  if (fromPos.x < APPLE_DOOR_X) {
    return [
      new THREE.Vector3(385.5, APPLE_PODIUM_Y, APPLE_DOOR_Z),
      new THREE.Vector3(381.8, 0.02, sidewalkOutZ),
    ];
  }

  // Currently inside the NE Stairwell shaft: finish descending smoothly from current stair leg!
  const inStairwell = fromPos.x >= 406.9 && fromPos.z <= -36.8 && fromPos.y > APPLE_PODIUM_Y + 0.12;
  if (inStairwell) {
    const path: THREE.Vector3[] = [];
    if (fromPos.z <= -42.1) {
      // Mid-landing: route around west side and down Flight 1
      if (fromPos.x > 409.2) {
        path.push(new THREE.Vector3(408.05, APPLE_MID_Y, -43.35));
      }
      path.push(
        new THREE.Vector3(408.05, APPLE_MID_Y, -42.3),
        new THREE.Vector3(408.05, APPLE_PODIUM_Y, -37.4),
        new THREE.Vector3(408.05, APPLE_PODIUM_Y, -36.4)
      );
    } else if (fromPos.x >= 409.4) {
      // On Flight 2: go down to landing, cross to Flight 1, and descend cleanly
      path.push(
        new THREE.Vector3(410.6, APPLE_MID_Y, -42.3),
        new THREE.Vector3(410.6, APPLE_MID_Y, -43.35),
        new THREE.Vector3(408.05, APPLE_MID_Y, -43.35),
        new THREE.Vector3(408.05, APPLE_MID_Y, -42.3),
        new THREE.Vector3(408.05, APPLE_PODIUM_Y, -37.4),
        new THREE.Vector3(408.05, APPLE_PODIUM_Y, -36.4)
      );
    } else {
      // On Flight 1: descend straight down Flight 1
      path.push(
        new THREE.Vector3(408.05, APPLE_PODIUM_Y, -37.4),
        new THREE.Vector3(408.05, APPLE_PODIUM_Y, -36.4)
      );
    }
    path.push(
      new THREE.Vector3(402.5, APPLE_PODIUM_Y, -35.0),
      new THREE.Vector3(390.8, APPLE_PODIUM_Y, -35.0),
      ...f1DoorExit
    );
    return path;
  }

  // On Floor 2 mezzanine: walk clear aisles to NE staircase, descend, and exit F1
  if (fromPos.y > APPLE_PODIUM_Y + 2.0) {
    const path: THREE.Vector3[] = [];
    if (fromPos.x < 402.0) {
      path.push(
        new THREE.Vector3(fromPos.x, APPLE_F2_Y, -31.0),
        new THREE.Vector3(403.5, APPLE_F2_Y, -31.0)
      );
    } else {
      if (fromPos.x > 406.5 && fromPos.z > -34.5) {
        path.push(new THREE.Vector3(405.8, APPLE_F2_Y, fromPos.z));
      }
      path.push(new THREE.Vector3(403.5, APPLE_F2_Y, fromPos.z));
    }
    path.push(
      new THREE.Vector3(403.5, APPLE_F2_Y, -36.0),
      ...clonePoints(APPLE_STAIR_DOWN_PTS),
      new THREE.Vector3(402.5, APPLE_PODIUM_Y, -35.0),
      new THREE.Vector3(390.8, APPLE_PODIUM_Y, -35.0),
      ...f1DoorExit
    );
    return path;
  }

  // On Floor 1: exit via nearest E-W clear cross-aisle
  const crossZ = fromPos.z <= -31.0 ? -35.0 : -27.0;
  return [
    new THREE.Vector3(fromPos.x, APPLE_PODIUM_Y, crossZ),
    new THREE.Vector3(390.8, APPLE_PODIUM_Y, crossZ),
    ...f1DoorExit,
  ];
}

export class AppleStoreNpcController {
  public rootGroup = new THREE.Group();
  private actors: AppleActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    const bagTex = createAppleBagTex();
    const bagMat = new THREE.MeshStandardMaterial({ map: bagTex, roughness: 0.5 });
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe2e8f0, emissiveIntensity: 0.35 });

    const f2Y = APPLE_PODIUM_Y + APPLE_FLOOR_H;
    const configs: Array<{
      kind: 'specialist' | 'shopper';
      x: number;
      y: number;
      z: number;
      yaw: number;
      shirtHex: number;
      pantsHex: number;
      skinHex: string;
      hairHex: number;
    }> = [
      { kind: 'specialist', x: 394.6, y: APPLE_PODIUM_Y, z: -39.0, yaw: -Math.PI / 2, shirtHex: 0x1d4ed8, pantsHex: 0x1e293b, skinHex: '#f3cfb6', hairHex: 0x1c1917 },
      { kind: 'specialist', x: 394.6, y: APPLE_PODIUM_Y, z: -23.0, yaw: -Math.PI / 2, shirtHex: 0x1d4ed8, pantsHex: 0x334155, skinHex: '#ebc3a6', hairHex: 0x292524 },
      { kind: 'specialist', x: 404.0, y: APPLE_PODIUM_Y, z: -31.0, yaw: -Math.PI / 2, shirtHex: 0x2563eb, pantsHex: 0x0f172a, skinHex: '#f4d2bc', hairHex: 0x451a03 },
      { kind: 'specialist', x: 406.9, y: f2Y, z: -30.5, yaw: -Math.PI / 2, shirtHex: 0x1d4ed8, pantsHex: 0x1e293b, skinHex: '#e7bc9e', hairHex: 0x111827 },
      { kind: 'shopper', x: 391.4, y: APPLE_PODIUM_Y, z: -38.8, yaw: Math.PI / 2, shirtHex: 0xe2e8f0, pantsHex: 0x1e293b, skinHex: '#f5d4bd', hairHex: 0x27272a },
      { kind: 'shopper', x: 394.8, y: APPLE_PODIUM_Y, z: -23.0, yaw: -Math.PI / 2, shirtHex: 0x0f172a, pantsHex: 0x475569, skinHex: '#ebc3a6', hairHex: 0x18181b },
      { kind: 'shopper', x: 397.4, y: APPLE_PODIUM_Y, z: -39.0, yaw: Math.PI / 2, shirtHex: 0x38bdf8, pantsHex: 0x1e293b, skinHex: '#f2ccb2', hairHex: 0x3f2e21 },
      { kind: 'shopper', x: 401.2, y: APPLE_PODIUM_Y, z: -22.5, yaw: -Math.PI / 2, shirtHex: 0xf43f5e, pantsHex: 0x0f172a, skinHex: '#e8be9f', hairHex: 0x1f2937 },
      { kind: 'shopper', x: 398.0, y: f2Y, z: -37.0, yaw: Math.PI / 2, shirtHex: 0xfacc15, pantsHex: 0x1e293b, skinHex: '#f3cfb6', hairHex: 0x1c1917 },
      { kind: 'shopper', x: 398.0, y: f2Y, z: -25.0, yaw: Math.PI / 2, shirtHex: 0x10b981, pantsHex: 0x334155, skinHex: '#e9bf9f', hairHex: 0x0f172a },
      { kind: 'shopper', x: 405.8, y: f2Y, z: -32.2, yaw: Math.PI / 2, shirtHex: 0x6366f1, pantsHex: 0x0f172a, skinHex: '#f5d4bd', hairHex: 0x3f2e21 },
    ];

    configs.forEach((cfg, idx) => {
      const grp = new THREE.Group();
      const fallbackGroup = new THREE.Group();
      grp.add(fallbackGroup);
      const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skinHex, roughness: 0.72 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: cfg.shirtHex, roughness: 0.65 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pantsHex, roughness: 0.74 });
      const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hairHex, roughness: 0.85 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.58, 0.25), shirtMat);
      torso.position.y = 1.06;
      fallbackGroup.add(torso);

      if (cfg.kind === 'specialist') {
        const chestCrest = new THREE.Mesh(new THREE.CircleGeometry(0.042, 10), badgeMat);
        chestCrest.position.set(0.09, 1.20, 0.128);
        fallbackGroup.add(chestCrest);
      }

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
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.13), shirtMat);
        m.position.y = -0.20;
        p.add(m);
        fallbackGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.29);
      const rightArm = makeArm(0.29);

      const appleBag = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.24), bagMat);
      appleBag.position.set(0.06, -0.44, 0.04);
      appleBag.visible = cfg.kind === 'shopper' && idx % 2 === 0;
      rightArm.add(appleBag);

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
        cfg.kind === 'specialist'
          ? idx === 2
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(idx + 11)
          : pickShopCustomerModel(idx + 5);
      const initState =
        cfg.kind === 'specialist' ? (idx === 2 ? 'Checkout' : 'Idle') : 'Walk';
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: grp,
        fallbackMeshes: [fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: initState,
        phaseOffset: idx * 0.61,
      });

      grp.position.set(cfg.x, cfg.y, cfg.z);
      grp.rotation.y = cfg.yaw;
      this.rootGroup.add(grp);

      const actor: AppleActor = {
        id: idx,
        kind: cfg.kind,
        root: grp,
        headMesh: head,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        appleBag,
        homePos: new THREE.Vector3(cfg.x, cfg.y, cfg.z),
        homeYaw: cfg.yaw,
        phase: cfg.kind === 'specialist' ? 'admire' : 'browse',
        pathQueue: [],
        pathIdx: 0,
        targetYaw: cfg.yaw,
        stateTimer: 1.5 + idx * 0.6,
        walkPhase: idx * 1.1,
        walkPhaseRef: { phase: idx * 1.1 },
        exitRef: { idx: 0 },
        exitDone: false,
        speed: 1.18 + (idx % 3) * 0.08,
        seed: idx * 1.7,
        glbHandle,
      };
      if (actor.kind === 'shopper') {
        this.assignNewSpot(actor, false);
      }
      this.actors.push(actor);
    });
  }

  private assignNewSpot(a: AppleActor, spawnOutside: boolean) {
    const curFloor: 1 | 2 = !spawnOutside && a.root.position.y > APPLE_PODIUM_Y + 2.0 ? 2 : 1;
    // Allow shoppers to traverse seamlessly between Floor 1 & Floor 2 via the NE switchback stairs
    let destFloor: 1 | 2;
    if (spawnOutside) {
      destFloor = a.homePos.y > APPLE_PODIUM_Y + 1.0 ? 2 : 1;
      a.root.position.set(383.2, 0.02, APPLE_DOOR_Z + (a.id % 2 === 0 ? -1.4 : 1.4));
    } else {
      destFloor = Math.random() < 0.35 ? (curFloor === 1 ? 2 : 1) : curFloor;
    }

    const pool = destFloor === 2 ? APPLE_F2_SPOTS : APPLE_F1_SPOTS;
    const spot = pool[Math.floor(Math.random() * pool.length)];
    a.targetYaw = spot.yaw;
    a.pathQueue = buildAppleStoreBrowseRoute(a.root.position, spot, destFloor, spawnOutside);
    a.pathIdx = 0;
    a.phase = 'browse';
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public hasNpcNearDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible || a.root.position.y > APPLE_PODIUM_Y + 1.5) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - APPLE_DOOR_X, p.z - APPLE_DOOR_Z) <= 3.8) return true;
    }
    return false;
  }

  private stepPath(a: AppleActor, dt: number): boolean {
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
      a.pathIdx += 1;
      return a.pathIdx >= a.pathQueue.length;
    }

    // Strict 3D linear interpolation keeps feet flush on every step of the staircase!
    const ratio = step / dist3D;
    a.root.position.x += dx * ratio;
    a.root.position.y += dy * ratio;
    a.root.position.z += dz * ratio;

    if (distXZ > 0.03) {
      const moveYaw = Math.atan2(dx, dz);
      let diff = moveYaw - a.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.root.rotation.y += diff * Math.min(1, dt * 8.5);
    }

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
    const isOpen = isAppleStoreOpenAtHour(rawHour);

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
        if (!a.root.visible) {
          a.exitDone = true;
          return;
        }
        a.exitDone = false;
        a.exitRef.idx = 0;
        a.pathQueue = buildAppleStoreExitRoute(a.root.position, a.id);
        a.glbHandle.setAnimState('Walk');
      });
    } else if (!this.wasOpen && isOpen) {
      this.closingActive = false;
      this.fullyClosedAndEmpty = false;
      this.actors.forEach((a) => {
        a.exitDone = false;
        a.root.visible = true;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = 0;
        a.rightArm.rotation.x = 0;
        if (a.kind === 'specialist') {
          a.root.position.copy(a.homePos);
          a.root.rotation.y = a.homeYaw;
          a.phase = 'admire';
          a.glbHandle.setAnimState(a.id === 2 ? 'Checkout' : 'Idle');
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
      if (a.kind === 'specialist') {
        a.glbHandle.setAnimState(a.id === 2 ? 'Checkout' : 'Idle');
        a.root.rotation.y = a.homeYaw + Math.sin(this.timer * 1.2 + a.seed) * 0.08;
        a.headMesh.rotation.y = Math.sin(this.timer * 0.9 + a.seed) * 0.16;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = -0.04;
        a.rightArm.rotation.x = -0.04;
        return;
      }

      if (a.phase === 'respawn_wait') {
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          a.root.visible = true;
          a.appleBag.visible = Math.random() > 0.35;
          this.assignNewSpot(a, true);
          a.glbHandle.setAnimState('Walk');
        }
        return;
      }

      if (a.phase === 'browse') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'admire';
          a.stateTimer = 4.2 + (a.id % 4) * 1.5;
          a.glbHandle.setAnimState('Idle');
        }
      } else if (a.phase === 'admire') {
        a.glbHandle.setAnimState('Idle');
        let diff = a.targetYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 5.0);
        a.headMesh.rotation.y = Math.sin(this.timer * 1.3 + a.seed) * 0.22;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = 0;
        a.rightArm.rotation.x = a.appleBag.visible ? -0.18 : 0;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          if (Math.random() < 0.32) {
            a.phase = 'walk_leave';
            a.appleBag.visible = true;
            a.pathQueue = buildAppleStoreExitRoute(a.root.position, a.id);
            a.pathIdx = 0;
            a.glbHandle.setAnimState('Walk');
          } else {
            this.assignNewSpot(a, false);
            a.glbHandle.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'respawn_wait';
          a.root.visible = false;
          a.stateTimer = 2.0 + (a.id % 3) * 1.2;
          a.glbHandle.setAnimState('Idle');
        }
      }
    });
  }
}
