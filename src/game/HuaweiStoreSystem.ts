import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isHuaweiStoreOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface HuaweiStoreBuildResult {
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
    npcController?: HuaweiStoreNpcController | null
  ) => void;
}

// =========================================================================
// HUAWEI FLAGSHIP STORE (2 MẶT TIỀN: ĐƯỜNG BẠCH ĐẰNG & ĐƯỜNG SƠN TÂY BẮC)
// Total Corner Plot: X = 316.0 .. 356.5 (40.5m), Z = -104.0 .. -64.0 (40.0m)
//   - Directly North of Xiaomi Flagship Store (Z = -62.4..-37.6)
//   - North Frontage (-Z): Facing Đường Bạch Đằng Waterfront & Cầu Rồng (Z = -104.0)
//   - East Frontage (+X): Facing Đường Sơn Tây Bắc (X = 356.5)
//   - High-Precision Rounded 2-Story Cantilevered Glass & Brushed-Titanium Architecture:
//     * Silky 44-segment curved corner glass, chamfered twin brushed-silver belly fascia
//       with soffit perimeter downlights, mirror-clad cantilevered sky canopies, & razor-sharp
//       illuminated HUAWEI wordmarks + entrance portals on BOTH street frontages.
//     * Sloped Limestone Amphitheater Staircase (West flank X=316.8..324.4) with warm step-nosing
//       LEDs, sloped architectural cheek parapet, glass handrails & multi-branch olive trees.
//     * Rich 2-Floor Flagship Interior: sculpted AITO M9 Flagship EV on illuminated turntable,
//       ribbed-walnut/terracotta architectural core with vitrines, Mate XT Tri-Fold & Pura XMAGE
//       experience tables, Huawei Care Genius Bar, Accessories Wall, F2 Smart-Home Titanium Pod,
//       F2 Huawei Café Long Table with warm brass dome lamps, Espresso Bar & Sky Terrace!
// =========================================================================

export const HUAWEI_PODIUM_Y = 0.08;
export const HUAWEI_FLOOR_H = 5.4;

export const HUAWEI_MIN_X = 316.0;
export const HUAWEI_MAX_X = 356.5;
export const HUAWEI_MIN_Z = -104.0;
export const HUAWEI_MAX_Z = -64.0;

// East Doorway (facing Đường Sơn Tây Bắc)
const EAST_DOOR_X = 351.8;
const EAST_DOOR_Z = -81.0;
// North Doorway (facing Đường Bạch Đằng waterfront)
const NORTH_DOOR_X = 338.5;
const NORTH_DOOR_Z = -99.2;

export const HUAWEI_COLLIDERS: IntersectionColliderBox[] = [
  // Floor 1 Perimeter Curtain Glass (leaves East Doorway Z=-83.3..-78.7 and North Doorway X=336.2..340.8 open!)
  { minX: 351.45, maxX: 352.15, minZ: -99.5, maxZ: -83.3, floor: 1 }, // East Front Glass North Wing
  { minX: 351.45, maxX: 352.15, minZ: -78.7, maxZ: -65.2, floor: 1 }, // East Front Glass South Wing
  { minX: 324.6, maxX: 336.2, minZ: -99.55, maxZ: -98.85, floor: 1 }, // North Front Glass West Wing
  { minX: 340.8, maxX: 351.8, minZ: -99.55, maxZ: -98.85, floor: 1 }, // North Front Glass East Wing
  { minX: 324.6, maxX: 352.0, minZ: -65.65, maxZ: -64.75, floor: 'both' }, // South Wall facing Xiaomi gap
  { minX: 324.45, maxX: 325.15, minZ: -99.3, maxZ: -65.0, floor: 1 }, // West Ground Glass facing Outdoor Amphitheater

  // Floor 2 Perimeter Glass Curtain (leaves F2 Terrace Doorway at X=323.75, Z=-71.8..-67.2 open!)
  { minX: 352.45, maxX: 353.15, minZ: -100.4, maxZ: -64.9, floor: 2 }, // F2 East Panoramic Glass
  { minX: 323.6, maxX: 352.9, minZ: -100.55, maxZ: -99.85, floor: 2 }, // F2 North Panoramic Glass
  { minX: 323.45, maxX: 324.15, minZ: -100.2, maxZ: -71.8, floor: 2 }, // F2 West Glass North of Terrace Portal

  // Outer Amphitheater West Guardrail & South End Wall (X = 316.0..324.6)
  { minX: 316.0, maxX: 316.75, minZ: -102.5, maxZ: -64.5, floor: 'both' }, // West Outer Amphitheater Cheek Wall
  { minX: 316.0, maxX: 324.6, minZ: -65.2, maxZ: -64.4, floor: 2 }, // SW Terrace Rear Parapet

  // 6 Structural Granite Perimeter Columns (Floor 1)
  { minX: 349.8, maxX: 351.0, minZ: -98.0, maxZ: -96.8, floor: 1 },
  { minX: 349.8, maxX: 351.0, minZ: -86.6, maxZ: -85.4, floor: 1 },
  { minX: 349.8, maxX: 351.0, minZ: -75.6, maxZ: -74.4, floor: 1 },
  { minX: 341.8, maxX: 343.0, minZ: -98.0, maxZ: -96.8, floor: 1 },
  { minX: 333.8, maxX: 335.0, minZ: -98.0, maxZ: -96.8, floor: 1 },
  { minX: 326.0, maxX: 327.2, minZ: -98.0, maxZ: -96.8, floor: 1 },

  // Floor 1 Terracotta/Walnut Core Feature Block (South-West Interior Zone)
  { minX: 326.2, maxX: 335.6, minZ: -78.2, maxZ: -66.0, floor: 1 },
  // Floor 1 Hero Camera Display Wall & Accessories Shelving (South Back Wall)
  { minX: 336.2, maxX: 349.4, minZ: -68.2, maxZ: -66.0, floor: 1 },
  // Floor 1 AITO M9 EV Showcase Turntable Plinth & Spec Totem (NE Corner Showcase)
  { minX: 342.1, maxX: 348.5, minZ: -94.1, maxZ: -87.9, floor: 1 },

  // Floor 1 Experience Tables, Audio Bar & Huawei Care Service Desk
  { minX: 344.2, maxX: 346.2, minZ: -83.4, maxZ: -78.6, floor: 1 }, // East Entry Hero Table (Mate XT Tri-Fold)
  { minX: 344.2, maxX: 346.2, minZ: -75.2, maxZ: -70.4, floor: 1 }, // SE Pura XMAGE Photography Table
  { minX: 337.6, maxX: 339.6, minZ: -92.0, maxZ: -87.2, floor: 1 }, // North Entry Pura & Mate Table
  { minX: 337.6, maxX: 339.6, minZ: -83.0, maxZ: -78.2, floor: 1 }, // Central MateBook & MatePad Studio
  { minX: 331.4, maxX: 333.4, minZ: -92.0, maxZ: -87.2, floor: 1 }, // NW Watch Ultimate & Sound X Bar
  { minX: 337.4, maxX: 343.0, minZ: -73.4, maxZ: -71.4, floor: 1 }, // Huawei Care Service Counter

  // Interior Switchback Stairwell Guardrail (X = 326.0..331.2, Z = -86.5..-79.0)
  { minX: 331.05, maxX: 331.4, minZ: -86.8, maxZ: -79.2, floor: 'both' }, // East side glass rail of stairwell
  { minX: 326.0, maxX: 328.6, minZ: -79.3, maxZ: -79.0, floor: 2 }, // F2 guard across South down-flight entrance

  // Floor 2 Smart-Home Rounded Pod, Communal Café Table & Lounge
  { minX: 326.8, maxX: 335.4, minZ: -97.0, maxZ: -91.0, floor: 2 }, // Rounded Titanium Smart-Home Pod
  { minX: 337.2, maxX: 348.0, minZ: -93.7, maxZ: -90.3, floor: 2 }, // Iconic F2 Communal Café Long Table + Stools
  { minX: 344.1, maxX: 347.3, minZ: -83.0, maxZ: -76.0, floor: 2 }, // F2 MateBook & HarmonyOS Studio Table
  { minX: 337.0, maxX: 341.2, minZ: -75.0, maxZ: -71.6, floor: 2 }, // F2 Espresso Bar Counter
  { minX: 343.0, maxX: 347.8, minZ: -69.5, maxZ: -66.8, floor: 2 }, // F2 SE Lounge Sofa Corner
];

// =========================================================================
// SMOOTH ROUNDED ARCHITECTURE GEOMETRY HELPERS (HIGH CURVE RESOLUTION)
// =========================================================================

function createRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const hw = w * 0.5;
  const hd = d * 0.5;
  const rad = Math.min(r, hw * 0.45, hd * 0.45);
  const s = new THREE.Shape();
  s.moveTo(-hw + rad, -hd);
  s.lineTo(hw - rad, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + rad);
  s.lineTo(hw, hd - rad);
  s.quadraticCurveTo(hw, hd, hw - rad, hd);
  s.lineTo(-hw + rad, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - rad);
  s.lineTo(-hw, -hd + rad);
  s.quadraticCurveTo(-hw, -hd, -hw + rad, -hd);
  return s;
}

function createRoundedHollowRingGeo(
  outerW: number,
  outerD: number,
  outerR: number,
  wallThick: number,
  height: number,
  curveSegments = 44
): THREE.BufferGeometry {
  const outer = createRoundedRectShape(outerW, outerD, outerR);
  const inner = createRoundedRectShape(
    Math.max(1.0, outerW - wallThick * 2),
    Math.max(1.0, outerD - wallThick * 2),
    Math.max(0.2, outerR - wallThick)
  );
  outer.holes.push(inner);
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: height,
    bevelEnabled: false,
    curveSegments,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createRoundedSlabGeo(
  w: number,
  d: number,
  r: number,
  height: number,
  bevel = 0,
  curveSegments = 44
): THREE.BufferGeometry {
  const shape = createRoundedRectShape(w, d, r);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevel > 0 ? 3 : 0,
    curveSegments,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// Sloped Cheek Wall Profile matching the exterior Amphitheater stairs smoothly (no boxy slab sticking out!)
function createSlopedCheekWallGeo(): THREE.BufferGeometry {
  // In XY shape plane: X = local Z from -19.2 (North Bạch Đằng) to +19.2 (South end), Y = height
  const shape = new THREE.Shape();
  shape.moveTo(-18.6, 0);
  shape.lineTo(19.2, 0);
  shape.lineTo(19.2, 6.65);
  shape.lineTo(9.0, 6.65); // Flat Floor 2 Terrace parapet (Z = -75.0..-64.8 -> local +9..+19.2)
  shape.lineTo(-18.2, 1.25); // Follows 22-step amphitheater ascent cleanly down to Bạch Đằng!
  shape.lineTo(-18.6, 0.9);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.44, bevelEnabled: false });
  // Rotate so X->Z, Z->X (extruded along X centered at -0.22..+0.22)
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.22, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

// Sculpted SUV / Coupe Side Silhouette for AITO M9 Flagship EV
function createAitoBodyGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  // Local X = front-to-back (-2.25 rear bumper to +2.25 front bumper), Y = height above axle/chassis base
  s.moveTo(-2.22, 0.22);
  s.lineTo(2.22, 0.22);
  s.lineTo(2.26, 0.54); // Front nose lower fascia
  s.quadraticCurveTo(2.24, 0.86, 1.92, 0.92); // Front hood rounded brow
  s.lineTo(1.12, 1.00); // Hood cowl
  s.lineTo(0.45, 1.54); // Raked panoramic windshield
  s.lineTo(-1.35, 1.54); // Sleek floating roofline
  s.lineTo(-2.08, 1.04); // Fastback rear tailgate
  s.quadraticCurveTo(-2.26, 0.84, -2.24, 0.42); // Rear bumper curve
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1.88,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.translate(0, 0, -0.94); // Center width along Z (-0.94..+0.94)
  geo.rotateY(-Math.PI / 2); // Align car length along Z axis!
  geo.computeVertexNormals();
  return geo;
}

// =========================================================================
// HIGH-RESOLUTION PROCEDURAL ARCHITECTURAL TEXTURES
// =========================================================================

function createTerrazzoFloorTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e7e0d4';
  ctx.fillRect(0, 0, s, s);

  // Subtle architectural stone aggregate flecks
  for (let i = 0; i < 650; i++) {
    const x = ((i * 197) % 509);
    const y = ((i * 331) % 509);
    const r = 1 + (i % 3);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(180,168,150,0.45)' : i % 3 === 1 ? 'rgba(255,252,245,0.55)' : 'rgba(130,120,108,0.25)';
    ctx.fillRect(x, y, r, r);
  }

  // Crisp subtle champagne-brass tile grout grid
  ctx.strokeStyle = 'rgba(166, 146, 118, 0.35)';
  ctx.lineWidth = 2;
  for (let g = 0; g <= s; g += 128) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(s, g);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 11);
  tex.anisotropy = 4;
  return tex;
}

function createHuaweiWordmarkTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 144px "Helvetica Neue", Arial, sans-serif';

  const letters = ['H', 'U', 'A', 'W', 'E', 'I'];
  const spacing = 122;
  const startX = w * 0.5 - ((letters.length - 1) * spacing) * 0.5;

  // Razor-sharp hairline dark slate contour + bright solid pure white fill (zero hazy glow washout!)
  letters.forEach((ch, idx) => {
    const lx = startX + idx * spacing;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 8;
    ctx.strokeText(ch, lx, h * 0.52);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, lx, h * 0.52);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createHuaweiPortalHeaderTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Thin crisp silver top/bottom trim
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, w, 8);
  ctx.fillRect(0, h - 8, w, 8);

  // Mini 8-petal Huawei emblem on left
  const cx = 190;
  const cy = 108;
  const angles = [-72, -50, -28, -8, 8, 28, 50, 72];
  angles.forEach((deg, idx) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad + Math.PI / 2);
    const len = idx === 3 || idx === 4 ? 64 : 56;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.bezierCurveTo(-10, -len * 0.4, -11, -len * 0.85, 0, -len);
    ctx.bezierCurveTo(11, -len * 0.85, 10, -len * 0.4, 0, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 72px system-ui, sans-serif';
  ctx.fillText('HUAWEI', 268, 84);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText('GLOBAL FLAGSHIP STORE', 270, 140);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createHuaweiFlowerPetalLogoTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const cx = 256;
  const cy = 278;
  const angles = [-72, -50, -28, -8, 8, 28, 50, 72];
  angles.forEach((deg, idx) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad + Math.PI / 2);
    const len = idx === 3 || idx === 4 ? 176 : idx === 2 || idx === 5 ? 166 : 150;
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, '#b91c1c');
    g.addColorStop(0.55, '#ef4444');
    g.addColorStop(1, '#f87171');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.bezierCurveTo(-24, -len * 0.38, -26, -len * 0.84, 0, -len);
    ctx.bezierCurveTo(26, -len * 0.84, 24, -len * 0.38, 0, -14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 58px system-ui, sans-serif';
  ctx.fillText('HUAWEI', 256, 412);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPuraHeroWallTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#f8fafc');
  bg.addColorStop(0.55, '#e2e8f0');
  bg.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(340, 260, 20, 340, 260, 280);
  glow.addColorStop(0, 'rgba(255,255,255,0.95)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Giant Mate XT / Pura XMAGE Phone Module
  ctx.save();
  ctx.translate(340, 268);
  ctx.rotate(-0.18);
  ctx.fillStyle = '#d4d4d8';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-210, -125, 420, 265, 40);
  ctx.fill();
  ctx.stroke();

  const ringGrad = ctx.createRadialGradient(-20, -10, 20, -20, -10, 114);
  ringGrad.addColorStop(0, '#1e293b');
  ringGrad.addColorStop(0.7, '#0f172a');
  ringGrad.addColorStop(0.84, '#64748b');
  ringGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(-15, 0, 102, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(-15, 0, 106, 0, Math.PI * 2);
  ctx.stroke();

  [
    [-48, -32, 26],
    [18, -32, 22],
    [-15, 34, 28],
  ].forEach(([lx, ly, lr]) => {
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(lx - 4, ly - 4, lr * 0.28, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('XMAGE', -15, 4);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.fillText('HUAWEI Mate XT', 565, 190);
  ctx.fillStyle = '#b91c1c';
  ctx.font = '700 32px system-ui, sans-serif';
  ctx.fillText('ULTIMATE DESIGN', 565, 248);
  ctx.fillStyle = '#475569';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText('World-First Tri-Fold Flagship', 565, 302);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createHarmonyPosterTex(title: string, sub: string, badge: string, accentHex: string): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0f172a');
  g.addColorStop(1, '#1e293b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const orb = ctx.createRadialGradient(256, 136, 10, 256, 136, 140);
  orb.addColorStop(0, accentHex);
  orb.addColorStop(0.55, 'rgba(56, 189, 248, 0.25)');
  orb.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 40px system-ui, sans-serif';
  ctx.fillText(title, 256, 224);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText(sub, 256, 276);

  ctx.fillStyle = '#ef4444';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(badge, 256, 330);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHuaweiHoursPlaqueTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(10, 10, w - 20, 66);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText('HUAWEI FLAGSHIP STORE', 256, 44);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('OPEN DAILY  07:00 - 23:00', 256, 136);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('BẠCH ĐẰNG • SƠN TÂY CORNER', 256, 198);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createHuaweiStoreStructure(): HuaweiStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // =========================================================================
  // ARCHITECTURAL PBR MATERIALS
  // =========================================================================
  const podiumGraniteMat = new THREE.MeshStandardMaterial({
    color: 0xb6bdc8,
    roughness: 0.72,
    metalness: 0.08,
  });

  const warmTerrazzoFloorMat = new THREE.MeshStandardMaterial({
    map: createTerrazzoFloorTex(),
    roughness: 0.36,
    metalness: 0.06,
  });

  const f2TimberFloorMat = new THREE.MeshStandardMaterial({
    color: 0xd9cdb9,
    roughness: 0.44,
    metalness: 0.05,
  });

  const amphitheaterStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd9d3c7,
    roughness: 0.62,
    metalness: 0.06,
  });

  const brushedSilverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.22,
    metalness: 0.86,
  });

  const mirrorSilverSoffitMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.12,
    metalness: 0.94,
  });

  const darkTitaniumMat = new THREE.MeshStandardMaterial({
    color: 0x263140,
    roughness: 0.34,
    metalness: 0.74,
  });

  const charcoalColumnMat = new THREE.MeshStandardMaterial({
    color: 0x2c3440,
    roughness: 0.44,
    metalness: 0.38,
  });

  const blackMullionMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.28,
    metalness: 0.68,
  });

  const terracottaWallMat = new THREE.MeshStandardMaterial({
    color: 0x8f6b53,
    roughness: 0.72,
    metalness: 0.04,
  });

  const walnutTimberMat = new THREE.MeshStandardMaterial({
    color: 0x5c3c28,
    roughness: 0.56,
    metalness: 0.06,
  });

  const warmOakMat = new THREE.MeshStandardMaterial({
    color: 0xc99c6b,
    roughness: 0.44,
    metalness: 0.05,
  });

  const brushedBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.24,
    metalness: 0.88,
  });

  const sofaBoucleMat = new THREE.MeshStandardMaterial({
    color: 0xf1ece1,
    roughness: 0.88,
    metalness: 0.02,
  });

  const curtainGlassMat = new THREE.MeshStandardMaterial({
    color: 0xcbe6f5,
    transparent: true,
    opacity: 0.23,
    roughness: 0.06,
    metalness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const balustradeGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.32,
    roughness: 0.09,
    metalness: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const cofferedCeilingMat = new THREE.MeshStandardMaterial({
    color: 0xfffef8,
    emissive: 0xfef9e7,
    emissiveIntensity: 2.35,
    roughness: 0.18,
  });

  const ceilingBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 2.95,
    roughness: 0.14,
  });

  const canopyEdgeLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffef5,
    emissiveIntensity: 2.55,
    roughness: 0.14,
  });

  const warmCoveLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 2.35,
    roughness: 0.18,
  });

  const huaweiWordmarkTex = createHuaweiWordmarkTex();
  const huaweiWordmarkMat = new THREE.MeshStandardMaterial({
    map: huaweiWordmarkTex,
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveMap: huaweiWordmarkTex,
    emissiveIntensity: 2.6,
    transparent: true,
    alphaTest: 0.25,
    roughness: 0.12,
  });

  const portalHeaderTex = createHuaweiPortalHeaderTex();
  const portalHeaderMat = new THREE.MeshStandardMaterial({
    map: portalHeaderTex,
    emissive: 0xffffff,
    emissiveMap: portalHeaderTex,
    emissiveIntensity: 0.85,
    roughness: 0.22,
  });

  const huaweiRedAccentMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.9,
    roughness: 0.22,
  });

  // =========================================================================
  // HELPER: SCULPTED MULTI-BRANCH OLIVE / FICUS ARCHITECTURAL TREE
  // =========================================================================
  const plantTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.88 });
  const plantLeafMatA = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const plantLeafMatB = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.74 });
  const addPottedTree = (px: number, py: number, pz: number, h = 2.2) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.31, 0.68, 20), brushedSilverMat);
    pot.position.set(px, py + 0.34, pz);
    staticGroup.add(pot);

    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 16), walnutTimberMat);
    soil.position.set(px, py + 0.67, pz);
    staticGroup.add(soil);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, h * 0.58, 10), plantTrunkMat);
    trunk.position.set(px, py + 0.66 + h * 0.29, pz);
    staticGroup.add(trunk);

    // Forked secondary branches + clustered organic canopy puffs
    [
      [0.20, h * 0.56, 0.14, 0.36, 0.42],
      [-0.22, h * 0.60, -0.10, -0.38, 0.40],
      [0.05, h * 0.64, -0.22, 0.18, -0.35],
    ].forEach(([bx, by, bz, tiltZ, tiltX], idx) => {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, h * 0.32, 8), plantTrunkMat);
      br.position.set(px + bx * 0.55, py + 0.66 + by, pz + bz * 0.55);
      br.rotation.set(tiltX, 0, tiltZ);
      staticGroup.add(br);

      const leaf = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.46 + (idx % 2) * 0.08, 1),
        idx % 2 === 0 ? plantLeafMatA : plantLeafMatB
      );
      leaf.scale.set(1.15, 0.82, 1.15);
      leaf.position.set(px + bx * 1.15, py + 0.66 + by + 0.22, pz + bz * 1.15);
      staticGroup.add(leaf);
    });

    const topLeaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 1), plantLeafMatA);
    topLeaf.scale.set(1.2, 0.84, 1.2);
    topLeaf.position.set(px, py + 0.66 + h * 0.78, pz);
    staticGroup.add(topLeaf);
  };

  // =========================================================================
  // 1. PODIUM SLAB & TWO-FRONTAGE WALK-ON APRONS (X = 316.0..356.5, Z = -104.0..-64.0)
  // =========================================================================
  const plotCenterX = (HUAWEI_MIN_X + HUAWEI_MAX_X) * 0.5; // 336.25
  const plotCenterZ = (HUAWEI_MIN_Z + HUAWEI_MAX_Z) * 0.5; // -84.0

  const mainPodiumSlab = new THREE.Mesh(
    new THREE.BoxGeometry(40.5, HUAWEI_PODIUM_Y + 0.06, 40.0),
    podiumGraniteMat
  );
  mainPodiumSlab.position.set(plotCenterX, (HUAWEI_PODIUM_Y - 0.06) * 0.5, plotCenterZ);
  staticGroup.add(mainPodiumSlab);

  const eastStepApron = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.045, 40.0), podiumGraniteMat);
  eastStepApron.position.set(HUAWEI_MAX_X - 0.275, 0.022, plotCenterZ);
  staticGroup.add(eastStepApron);

  const northStepApron = new THREE.Mesh(new THREE.BoxGeometry(40.5, 0.045, 0.55), podiumGraniteMat);
  northStepApron.position.set(plotCenterX, 0.022, HUAWEI_MIN_Z + 0.275);
  staticGroup.add(northStepApron);

  const f1CenterX = 338.3;
  const f1CenterZ = -82.3;
  const f1InteriorFloor = new THREE.Mesh(
    createRoundedSlabGeo(26.8, 33.4, 3.5, 0.025, 0, 40),
    warmTerrazzoFloorMat
  );
  f1InteriorFloor.position.set(f1CenterX, HUAWEI_PODIUM_Y + 0.005, f1CenterZ);
  staticGroup.add(f1InteriorFloor);

  // =========================================================================
  // 2. FLOOR 1 RECESSED ROUNDED GLASS PAVILION, COLUMNS & DUAL PORTALS
  // =========================================================================
  const F1_TOP_Y = HUAWEI_PODIUM_Y + HUAWEI_FLOOR_H; // 5.48m

  const columnCoords: Array<[number, number]> = [
    [350.4, -97.4],
    [350.4, -86.0],
    [350.4, -75.0],
    [342.4, -97.4],
    [334.4, -97.4],
    [326.6, -97.4],
  ];
  columnCoords.forEach(([cx, cz]) => {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.45, HUAWEI_FLOOR_H - 0.14, 28),
      charcoalColumnMat
    );
    col.position.set(cx, HUAWEI_PODIUM_Y + (HUAWEI_FLOOR_H - 0.14) * 0.5, cz);
    staticGroup.add(col);

    const colRingBot = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.49, 0.08, 28), brushedSilverMat);
    colRingBot.position.set(cx, HUAWEI_PODIUM_Y + 0.04, cz);
    staticGroup.add(colRingBot);

    const colRingTop = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.10, 28), brushedSilverMat);
    colRingTop.position.set(cx, F1_TOP_Y - 0.44, cz);
    staticGroup.add(colRingTop);
  });

  const F1_GLASS_H = F1_TOP_Y - HUAWEI_PODIUM_Y - 0.42; // 4.98m
  const F1_GLASS_MID_Y = HUAWEI_PODIUM_Y + F1_GLASS_H * 0.5;

  // East Frontage Glass (X = 351.8, open doorway Z = -83.3 .. -78.7)
  const f1EastGlassN = new THREE.Mesh(new THREE.BoxGeometry(0.05, F1_GLASS_H, 12.6), curtainGlassMat);
  f1EastGlassN.position.set(EAST_DOOR_X, F1_GLASS_MID_Y, -89.6);
  staticGroup.add(f1EastGlassN);

  const f1EastGlassS = new THREE.Mesh(new THREE.BoxGeometry(0.05, F1_GLASS_H, 10.2), curtainGlassMat);
  f1EastGlassS.position.set(EAST_DOOR_X, F1_GLASS_MID_Y, -73.6);
  staticGroup.add(f1EastGlassS);

  const f1EastTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, F1_GLASS_H - 3.25, 4.6), curtainGlassMat);
  f1EastTransomGlass.position.set(EAST_DOOR_X, HUAWEI_PODIUM_Y + 3.25 + (F1_GLASS_H - 3.25) * 0.5, EAST_DOOR_Z);
  staticGroup.add(f1EastTransomGlass);

  // North Frontage Glass (Z = -99.2, open doorway X = 336.2 .. 340.8)
  const f1NorthGlassW = new THREE.Mesh(new THREE.BoxGeometry(8.1, F1_GLASS_H, 0.05), curtainGlassMat);
  f1NorthGlassW.position.set(332.15, F1_GLASS_MID_Y, NORTH_DOOR_Z);
  staticGroup.add(f1NorthGlassW);

  const f1NorthGlassE = new THREE.Mesh(new THREE.BoxGeometry(7.5, F1_GLASS_H, 0.05), curtainGlassMat);
  f1NorthGlassE.position.set(344.55, F1_GLASS_MID_Y, NORTH_DOOR_Z);
  staticGroup.add(f1NorthGlassE);

  const f1NorthTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(4.6, F1_GLASS_H - 3.25, 0.05), curtainGlassMat);
  f1NorthTransomGlass.position.set(NORTH_DOOR_X, HUAWEI_PODIUM_Y + 3.25 + (F1_GLASS_H - 3.25) * 0.5, NORTH_DOOR_Z);
  staticGroup.add(f1NorthTransomGlass);

  const buildCornerGlassArc = (
    cx: number,
    cz: number,
    r: number,
    startAng: number,
    endAng: number,
    baseY: number,
    h: number
  ) => {
    const geo = new THREE.CylinderGeometry(r, r, h, 32, 1, true, startAng, endAng - startAng);
    const mesh = new THREE.Mesh(geo, curtainGlassMat);
    mesh.position.set(cx, baseY + h * 0.5, cz);
    staticGroup.add(mesh);

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const a = THREE.MathUtils.lerp(startAng, endAng, i / steps);
      const mx = cx + Math.sin(a) * r;
      const mz = cz + Math.cos(a) * r;
      const mul = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05), blackMullionMat);
      mul.position.set(mx, baseY + h * 0.5, mz);
      mul.rotation.y = a;
      staticGroup.add(mul);
    }
  };
  buildCornerGlassArc(348.3, -95.7, 3.5, Math.PI * 0.5, Math.PI, HUAWEI_PODIUM_Y, F1_GLASS_H);
  buildCornerGlassArc(328.3, -95.7, 3.5, Math.PI, Math.PI * 1.5, HUAWEI_PODIUM_Y, F1_GLASS_H);
  buildCornerGlassArc(348.3, -68.7, 3.5, 0, Math.PI * 0.5, HUAWEI_PODIUM_Y, F1_GLASS_H);

  const f1WestGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, F1_GLASS_H, 30.5), curtainGlassMat);
  f1WestGlass.position.set(324.8, F1_GLASS_MID_Y, -80.45);
  staticGroup.add(f1WestGlass);

  const f1SouthWall = new THREE.Mesh(new THREE.BoxGeometry(23.5, F1_GLASS_H, 0.35), charcoalColumnMat);
  f1SouthWall.position.set(336.55, F1_GLASS_MID_Y, -65.2);
  staticGroup.add(f1SouthWall);

  [-95.7, -91.5, -87.4, -83.3, -78.7, -73.8, -68.7].forEach((mz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.055, F1_GLASS_H, 0.045), blackMullionMat);
    m.position.set(EAST_DOOR_X, F1_GLASS_MID_Y, mz);
    staticGroup.add(m);
  });
  [328.3, 332.2, 336.2, 340.8, 344.6, 348.3].forEach((mx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, F1_GLASS_H, 0.055), blackMullionMat);
    m.position.set(mx, F1_GLASS_MID_Y, NORTH_DOOR_Z);
    staticGroup.add(m);
  });

  // =========================================================================
  // 2B. TWO AUTOMATIC BI-PARTING SLIDING PORTALS + ILLUMINATED PORTAL HEADERS
  // =========================================================================
  const buildSlidingPortal = (
    axis: 'east' | 'north',
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
      axis === 'east'
        ? new THREE.BoxGeometry(0.22, 0.72, portalW + 0.16)
        : new THREE.BoxGeometry(portalW + 0.16, 0.72, 0.22),
      darkTitaniumMat
    );
    hdr.position.set(x, HUAWEI_PODIUM_Y + leafH + 0.36, z);
    staticGroup.add(hdr);

    // Illuminated HUAWEI FLAGSHIP Portal Header Signboard facing street
    const hdrSign = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 0.62), portalHeaderMat);
    hdrSign.rotation.y = axis === 'east' ? Math.PI / 2 : Math.PI;
    hdrSign.position.set(
      axis === 'east' ? x + 0.12 : x,
      HUAWEI_PODIUM_Y + leafH + 0.36,
      axis === 'east' ? z : z - 0.12
    );
    hdrSign.userData.noMerge = true;
    staticGroup.add(hdrSign);

    // Cantilevered Steel-Tie Glass Door Canopy protecting visitors entering store!
    const visorGlass = new THREE.Mesh(
      axis === 'east' ? new THREE.BoxGeometry(1.5, 0.04, portalW + 0.3) : new THREE.BoxGeometry(portalW + 0.3, 0.04, 1.5),
      curtainGlassMat
    );
    visorGlass.position.set(
      axis === 'east' ? x + 0.8 : x,
      HUAWEI_PODIUM_Y + leafH + 0.04,
      axis === 'east' ? z : z - 0.8
    );
    staticGroup.add(visorGlass);

    [-1.4, 0, 1.4].forEach((off) => {
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 12), ceilingBulbMat);
      bulb.position.set(
        axis === 'east' ? x : x + off,
        HUAWEI_PODIUM_Y + leafH - 0.005,
        axis === 'east' ? z + off : z
      );
      staticGroup.add(bulb);
    });

    const makeLeaf = (offset: number) => {
      const grp = new THREE.Group();
      grp.userData.noMerge = true;
      const pane = new THREE.Mesh(
        axis === 'east' ? new THREE.BoxGeometry(0.035, leafH, leafW) : new THREE.BoxGeometry(leafW, leafH, 0.035),
        curtainGlassMat
      );
      pane.position.y = leafH * 0.5;
      grp.add(pane);

      const topBar = new THREE.Mesh(
        axis === 'east' ? new THREE.BoxGeometry(0.06, 0.06, leafW) : new THREE.BoxGeometry(leafW, 0.06, 0.06),
        brushedSilverMat
      );
      topBar.position.y = leafH - 0.03;
      grp.add(topBar);

      const botBar = new THREE.Mesh(
        axis === 'east' ? new THREE.BoxGeometry(0.06, 0.06, leafW) : new THREE.BoxGeometry(leafW, 0.06, 0.06),
        brushedSilverMat
      );
      botBar.position.y = 0.03;
      grp.add(botBar);

      const handleOff = offset < 0 ? leafW * 0.5 - 0.18 : -leafW * 0.5 + 0.18;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.16, 10), brushedSilverMat);
      handle.position.set(
        axis === 'east' ? 0.048 : handleOff,
        1.32,
        axis === 'east' ? handleOff : -0.048
      );
      grp.add(handle);

      grp.position.set(
        axis === 'east' ? x + 0.02 : x + offset,
        HUAWEI_PODIUM_Y,
        axis === 'east' ? z + offset : z - 0.02
      );
      staticGroup.add(grp);
      return grp;
    };

    const closedA = (axis === 'east' ? z : x) - leafW * 0.5;
    const closedB = (axis === 'east' ? z : x) + leafW * 0.5;
    const leafA = makeLeaf(-leafW * 0.5);
    const leafB = makeLeaf(leafW * 0.5);

    const shutterTex = createRollingShutterTexture({
      title: 'HUAWEI FLAGSHIP',
      hoursLabel: '07:00 - 23:00  •  OPEN DAILY',
      accentHex: '#dc2626',
    });
    const shutterMat = new THREE.MeshStandardMaterial({
      map: shutterTex,
      roughness: 0.45,
      metalness: 0.58,
    });
    const shutter = createRollingShutterDoor(
      staticGroup,
      {
        id: `huawei_${axis}_shutter`,
        axis: axis === 'east' ? 'z' : 'x',
        pos: axis === 'east' ? x + 0.08 : z - 0.08,
        spanCenter: axis === 'east' ? z : x,
        width: portalW,
        baseY: HUAWEI_PODIUM_Y,
        topY: HUAWEI_PODIUM_Y + leafH,
      },
      shutterMat,
      darkTitaniumMat
    );

    return { leafA, leafB, closedA, closedB, shutter };
  };

  const eastPortal = buildSlidingPortal('east', EAST_DOOR_X, EAST_DOOR_Z);
  const northPortal = buildSlidingPortal('north', NORTH_DOOR_X, NORTH_DOOR_Z);

  const plaqueMat = new THREE.MeshBasicMaterial({ map: createHuaweiHoursPlaqueTex() });
  const eastPlaque = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), plaqueMat);
  eastPlaque.rotation.y = Math.PI / 2;
  eastPlaque.position.set(EAST_DOOR_X + 0.06, HUAWEI_PODIUM_Y + 1.55, EAST_DOOR_Z + 2.85);
  eastPlaque.userData.noMerge = true;
  staticGroup.add(eastPlaque);

  const northPlaque = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), plaqueMat);
  northPlaque.rotation.y = Math.PI;
  northPlaque.position.set(NORTH_DOOR_X - 2.85, HUAWEI_PODIUM_Y + 1.55, NORTH_DOOR_Z - 0.06);
  northPlaque.userData.noMerge = true;
  staticGroup.add(northPlaque);

  // =========================================================================
  // 3. FLOOR 1 LUMINOUS COFFERED CEILING & ARCHITECTURAL RIBBED CORE
  // =========================================================================
  for (let gx = 0; gx < 5; gx++) {
    for (let gz = 0; gz < 6; gz++) {
      const px = 327.6 + gx * 4.8;
      const pz = -95.2 + gz * 5.0;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.06, 4.52), cofferedCeilingMat);
      panel.position.set(px, F1_TOP_Y - 0.42, pz);
      staticGroup.add(panel);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.74, 0.04, 4.94), darkTitaniumMat);
      frame.position.set(px, F1_TOP_Y - 0.37, pz);
      staticGroup.add(frame);

      // Corner micro spotlight gimbal housing at beam intersections
      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), ceilingBulbMat);
      spot.position.set(px + 2.35, F1_TOP_Y - 0.41, pz + 2.45);
      staticGroup.add(spot);
    }
  }

  // Terracotta & Ribbed Walnut Architectural Core Block (SW Interior)
  const terraBlock = new THREE.Mesh(new THREE.BoxGeometry(9.2, 4.72, 12.0), terracottaWallMat);
  terraBlock.position.set(330.9, HUAWEI_PODIUM_Y + 2.36, -72.1);
  staticGroup.add(terraBlock);

  // Vertical Architectural Walnut Fluted Timber Slats wrapping North & East faces of Core
  for (let z = -77.9; z <= -66.3; z += 0.36) {
    if (z > -74.6 && z < -69.6) continue; // clear East glass display vitrine
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.65, 0.14), walnutTimberMat);
    slat.position.set(335.53, HUAWEI_PODIUM_Y + 2.34, z);
    staticGroup.add(slat);
  }
  for (let x = 326.5; x <= 335.3; x += 0.36) {
    if (x > 328.5 && x < 333.3) continue; // clear North brand vitrine
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.65, 0.08), walnutTimberMat);
    slat.position.set(x, HUAWEI_PODIUM_Y + 2.34, -78.13);
    staticGroup.add(slat);
  }

  // East Core Illuminated Vitrine with Sculpted Display Pedestals & Warm LED Cove
  const eastVitrineBack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.75, 5.2), darkTitaniumMat);
  eastVitrineBack.position.set(335.55, HUAWEI_PODIUM_Y + 2.15, -72.1);
  staticGroup.add(eastVitrineBack);

  const eastVitrineLed = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 5.0), warmCoveLedMat);
  eastVitrineLed.position.set(335.62, HUAWEI_PODIUM_Y + 3.45, -72.1);
  staticGroup.add(eastVitrineLed);

  [-73.7, -72.1, -70.5].forEach((vz, idx) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.05, 0.68), brushedSilverMat);
    ped.position.set(335.72, HUAWEI_PODIUM_Y + 1.32, vz);
    staticGroup.add(ped);

    const showcaseItem = new THREE.Mesh(
      idx === 1 ? new THREE.TorusGeometry(0.14, 0.035, 10, 20) : new THREE.BoxGeometry(0.14, 0.26, 0.04),
      idx === 0 ? huaweiRedAccentMat : brushedBrassMat
    );
    showcaseItem.position.set(335.72, HUAWEI_PODIUM_Y + 2.02, vz);
    showcaseItem.rotation.y = Math.PI / 2;
    staticGroup.add(showcaseItem);
  });

  // North Core Illuminated Huawei Sunburst Alcove
  const alcoveNorth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.75, 0.22), darkTitaniumMat);
  alcoveNorth.position.set(330.9, HUAWEI_PODIUM_Y + 2.15, -78.16);
  staticGroup.add(alcoveNorth);

  const flowerTex = createHuaweiFlowerPetalLogoTex();
  const flowerMat = new THREE.MeshStandardMaterial({
    map: flowerTex,
    emissive: 0xffffff,
    emissiveMap: flowerTex,
    emissiveIntensity: 1.55,
    transparent: true,
    roughness: 0.2,
  });
  const flowerPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 2.45), flowerMat);
  flowerPlane.rotation.y = Math.PI;
  flowerPlane.position.set(330.9, HUAWEI_PODIUM_Y + 2.22, -78.30);
  flowerPlane.userData.noMerge = true;
  staticGroup.add(flowerPlane);

  // Backlit Mate XT Hero Camera Wall + Accessories Floating Glass Shelves (South Back Wall)
  const heroWallTex = createPuraHeroWallTex();
  const heroWallMat = new THREE.MeshStandardMaterial({
    map: heroWallTex,
    emissive: 0xffffff,
    emissiveMap: heroWallTex,
    emissiveIntensity: 1.25,
    roughness: 0.22,
  });
  const heroWallFrame = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.6, 0.45), brushedSilverMat);
  heroWallFrame.position.set(339.8, HUAWEI_PODIUM_Y + 1.9, -67.0);
  staticGroup.add(heroWallFrame);

  const heroWallScreen = new THREE.Mesh(new THREE.PlaneGeometry(6.75, 3.35), heroWallMat);
  heroWallScreen.rotation.y = Math.PI;
  heroWallScreen.position.set(339.8, HUAWEI_PODIUM_Y + 1.9, -67.25);
  heroWallScreen.userData.noMerge = true;
  staticGroup.add(heroWallScreen);

  // Illuminated Accessories & Sound Wall (SE Back Wall: X = 343.8..349.2, Z = -66.8)
  const accBack = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.1, 0.35), darkTitaniumMat);
  accBack.position.set(346.4, HUAWEI_PODIUM_Y + 2.05, -66.5);
  staticGroup.add(accBack);

  const accLightPanel = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.6, 0.06), cofferedCeilingMat);
  accLightPanel.position.set(346.4, HUAWEI_PODIUM_Y + 2.15, -66.68);
  staticGroup.add(accLightPanel);

  const accColors = [0xdc2626, 0x0284c7, 0xf59e0b, 0x10b981, 0x6366f1, 0xf43f5e, 0x1e293b];
  for (let row = 0; row < 4; row++) {
    const sy = HUAWEI_PODIUM_Y + 1.05 + row * 0.72;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.045, 0.38), brushedSilverMat);
    shelf.position.set(346.4, sy, -66.85);
    staticGroup.add(shelf);

    for (let col = 0; col < 10; col++) {
      const bx = 344.35 + col * 0.45;
      const cMat = new THREE.MeshStandardMaterial({
        color: accColors[(row * 3 + col) % accColors.length],
        roughness: 0.35,
        metalness: 0.2,
      });
      const item =
        row === 0
          ? new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.34, 14), blackMullionMat) // Sound X speakers
          : new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.14), cMat); // Cases & bands
      item.position.set(bx, sy + (row === 0 ? 0.19 : 0.23), -66.85);
      staticGroup.add(item);
    }
  }

  // =========================================================================
  // 3B. FLOOR 1 SCULPTED AITO M9 EV TURNTABLE + DETAILED HARDWARE TABLES
  // =========================================================================
  const evPlinthX = 345.3;
  const evPlinthZ = -91.0;

  const evBase = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.95, 0.24, 40), darkTitaniumMat);
  evBase.position.set(evPlinthX, HUAWEI_PODIUM_Y + 0.12, evPlinthZ);
  staticGroup.add(evBase);

  const evInnerDeck = new THREE.Mesh(new THREE.CylinderGeometry(2.58, 2.58, 0.03, 40), mirrorSilverSoffitMat);
  evInnerDeck.position.set(evPlinthX, HUAWEI_PODIUM_Y + 0.25, evPlinthZ);
  staticGroup.add(evInnerDeck);

  const evRing = new THREE.Mesh(new THREE.TorusGeometry(2.74, 0.045, 10, 56), canopyEdgeLedMat);
  evRing.rotation.x = Math.PI / 2;
  evRing.position.set(evPlinthX, HUAWEI_PODIUM_Y + 0.25, evPlinthZ);
  staticGroup.add(evRing);

  // Sculpted AITO M9 Luxury Flagship SUV (Extruded aerodynamic side profile + dual-tone champagne silver/obsidian!)
  const evCar = new THREE.Group();
  evCar.position.set(evPlinthX, HUAWEI_PODIUM_Y + 0.26, evPlinthZ);
  evCar.rotation.y = -Math.PI * 0.28;

  const evBodyMat = new THREE.MeshStandardMaterial({
    color: 0xd8d1c5,
    metalness: 0.78,
    roughness: 0.14,
  });
  const evUpperDarkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.38,
    roughness: 0.08,
  });

  const aitoBody = new THREE.Mesh(createAitoBodyGeo(), evBodyMat);
  aitoBody.position.y = 0.02;
  evCar.add(aitoBody);

  // Tinted Panoramic Greenhouse Canopy
  const evGlassGreenhouse = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.44, 2.45), evUpperDarkMat);
  evGlassGreenhouse.position.set(0, 1.24, -0.32);
  evCar.add(evGlassGreenhouse);

  // Roof LiDAR Autonomous Sensor Pod
  const lidarPod = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.22), blackMullionMat);
  lidarPod.position.set(0, 1.56, 0.56);
  evCar.add(lidarPod);

  // Glowing Front Horizon Matrix Lightbar + Dual Headlights
  const frontLightBar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.065, 0.05), canopyEdgeLedMat);
  frontLightBar.position.set(0, 0.76, 2.26);
  evCar.add(frontLightBar);

  [-0.68, 0.68].forEach((hx) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.06), canopyEdgeLedMat);
    lamp.position.set(hx, 0.68, 2.26);
    evCar.add(lamp);
  });

  // Full-Width Crimson OLED Rear Lightbar
  const rearLightBar = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.07, 0.05), huaweiRedAccentMat);
  rearLightBar.position.set(0, 0.82, -2.26);
  evCar.add(rearLightBar);

  // Side Chrome Rocker Molding & Wing Mirrors
  [-0.96, 0.96].forEach((sx) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 2.45), brushedSilverMat);
    trim.position.set(sx, 0.32, 0);
    evCar.add(trim);

    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.14), evBodyMat);
    mirror.position.set(sx * 1.06, 1.02, 0.52);
    evCar.add(mirror);
  });

  // Multi-Spoke Wheels with Brushed Alloy Rims & Red Brake Calipers
  [
    [-0.92, 1.38],
    [0.92, 1.38],
    [-0.92, -1.38],
    [0.92, -1.38],
  ].forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.24, 24), blackMullionMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, 0.35, wz);
    evCar.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.255, 16), brushedSilverMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, 0.35, wz);
    evCar.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.27, 12), huaweiRedAccentMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, 0.35, wz);
    evCar.add(hub);
  });
  staticGroup.add(evCar);

  // AITO M9 Illuminated Spec Totem beside turntable
  const totemBase = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.42, 0.14), darkTitaniumMat);
  totemBase.position.set(348.2, HUAWEI_PODIUM_Y + 0.71, -88.4);
  totemBase.rotation.y = -0.55;
  staticGroup.add(totemBase);
  const totemScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 1.1),
    new THREE.MeshStandardMaterial({
      map: createHarmonyPosterTex('AITO M9 EV', 'HarmonyOS 4 Cockpit', 'RANGE 1,402 KM', '#f59e0b'),
      emissive: 0xffffff,
      emissiveMap: createHarmonyPosterTex('AITO M9 EV', 'HarmonyOS 4 Cockpit', 'RANGE 1,402 KM', '#f59e0b'),
      emissiveIntensity: 0.95,
    })
  );
  totemScreen.position.set(348.26, HUAWEI_PODIUM_Y + 0.78, -88.34);
  totemScreen.rotation.y = -0.55 + Math.PI;
  totemScreen.userData.noMerge = true;
  staticGroup.add(totemScreen);

  // Sculpted Huawei Flagship Experience Tables
  const buildHuaweiTable = (
    cx: number,
    baseY: number,
    cz: number,
    w: number,
    d: number,
    mode: 'trifold' | 'pura' | 'laptop' | 'wearables'
  ) => {
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), warmOakMat);
    top.position.set(cx, baseY + 0.86, cz);
    staticGroup.add(top);

    // Subtle brass under-frame rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w - 0.18, 0.05, d - 0.18), brushedSilverMat);
    rail.position.set(cx, baseY + 0.80, cz);
    staticGroup.add(rail);

    [
      [-w * 0.42, -d * 0.42],
      [w * 0.42, -d * 0.42],
      [-w * 0.42, d * 0.42],
      [w * 0.42, d * 0.42],
    ].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.84, 0.075), brushedSilverMat);
      leg.position.set(cx + dx, baseY + 0.42, cz + dz);
      staticGroup.add(leg);
    });

    // Illuminated Macro Photography Centerpiece Diorama on Pura Table
    if (mode === 'pura') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 10, 28), canopyEdgeLedMat);
      ring.position.set(cx, baseY + 1.18, cz);
      staticGroup.add(ring);
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7, roughness: 0.1 })
      );
      crystal.position.set(cx, baseY + 1.04, cz);
      staticGroup.add(crystal);
    }

    const scrColors = [0xef4444, 0x38bdf8, 0xfbbf24, 0xa855f7];
    for (let i = 0; i < 4; i++) {
      const dz = -d * 0.36 + (i / 3) * (d * 0.72);
      [-w * 0.25, w * 0.25].forEach((dx, col) => {
        const scrMat = new THREE.MeshStandardMaterial({
          color: scrColors[(i + col) % scrColors.length],
          emissive: scrColors[(i + col) % scrColors.length],
          emissiveIntensity: 1.05,
          roughness: 0.14,
        });
        const px = cx + dx;
        const pz = cz + dz;
        const py = baseY + 0.90;

        // Brushed titanium device riser puck
        const riser = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.22), darkTitaniumMat);
        riser.position.set(px, py + 0.012, pz);
        staticGroup.add(riser);

        if (mode === 'laptop') {
          const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.016, 0.36), brushedSilverMat);
          base.position.set(px, py + 0.032, pz);
          staticGroup.add(base);
          const kb = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.005, 0.30), blackMullionMat);
          kb.position.set(px, py + 0.042, pz);
          staticGroup.add(kb);
          const lid = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.23, 0.36), scrMat);
          lid.position.set(px + (dx < 0 ? 0.11 : -0.11), py + 0.145, pz);
          lid.rotation.z = dx < 0 ? 0.24 : -0.24;
          staticGroup.add(lid);
        } else if (mode === 'trifold') {
          // 3-panel Z-folded Mate XT Ultimate Design silhouette with gold hinge ribs!
          const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.09, 10), brushedBrassMat);
          stand.position.set(px, py + 0.06, pz);
          staticGroup.add(stand);

          const pCenter = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.24, 0.11), scrMat);
          pCenter.position.set(px, py + 0.18, pz);
          pCenter.rotation.z = dx < 0 ? -0.26 : 0.26;
          staticGroup.add(pCenter);

          const pLeft = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.24, 0.10), scrMat);
          pLeft.position.set(px + (dx < 0 ? 0.03 : -0.03), py + 0.18, pz - 0.10);
          pLeft.rotation.set(0, 0.36, dx < 0 ? -0.26 : 0.26);
          staticGroup.add(pLeft);

          const pRight = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.24, 0.10), scrMat);
          pRight.position.set(px + (dx < 0 ? 0.03 : -0.03), py + 0.18, pz + 0.10);
          pRight.rotation.set(0, -0.36, dx < 0 ? -0.26 : 0.26);
          staticGroup.add(pRight);
        } else if (mode === 'wearables') {
          // Circular Watch Ultimate dome pedestals & bands
          const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 16), brushedSilverMat);
          puck.position.set(px, py + 0.08, pz);
          staticGroup.add(puck);
          const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), scrMat);
          dial.position.set(px, py + 0.15, pz);
          dial.rotation.z = dx < 0 ? -0.3 : 0.3;
          staticGroup.add(dial);
        } else {
          // Pura 80 Ultra with triangular XMAGE lens island
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.22, 0.115), darkTitaniumMat);
          body.position.set(px, py + 0.13, pz);
          body.rotation.z = dx < 0 ? -0.35 : 0.35;
          staticGroup.add(body);
          const screen = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.20, 0.10), scrMat);
          screen.position.set(px + (dx < 0 ? -0.008 : 0.008), py + 0.13, pz);
          screen.rotation.z = dx < 0 ? -0.35 : 0.35;
          staticGroup.add(screen);
        }
      });
    }
  };

  buildHuaweiTable(345.2, HUAWEI_PODIUM_Y, -81.0, 1.65, 4.4, 'trifold');
  buildHuaweiTable(345.2, HUAWEI_PODIUM_Y, -72.8, 1.65, 4.4, 'pura');
  buildHuaweiTable(338.6, HUAWEI_PODIUM_Y, -89.6, 1.65, 4.4, 'pura');
  buildHuaweiTable(338.6, HUAWEI_PODIUM_Y, -80.6, 1.65, 4.4, 'laptop');
  buildHuaweiTable(332.4, HUAWEI_PODIUM_Y, -89.6, 1.65, 4.4, 'wearables');

  // Huawei Care Genius Service Counter + Dual Terminals + Barstools
  const careDesk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.02, 1.35), darkTitaniumMat);
  careDesk.position.set(340.2, HUAWEI_PODIUM_Y + 0.51, -72.4);
  staticGroup.add(careDesk);
  const careDeskTop = new THREE.Mesh(new THREE.BoxGeometry(5.35, 0.06, 1.48), warmOakMat);
  careDeskTop.position.set(340.2, HUAWEI_PODIUM_Y + 1.05, -72.4);
  staticGroup.add(careDeskTop);

  [338.6, 340.2, 341.8].forEach((tx) => {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.025), blackMullionMat);
    mon.position.set(tx, HUAWEI_PODIUM_Y + 1.32, -72.4);
    staticGroup.add(mon);
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.64, 14), charcoalColumnMat);
    stool.position.set(tx, HUAWEI_PODIUM_Y + 0.32, -73.45);
    staticGroup.add(stool);
  });

  // =========================================================================
  // 4. FLOOR 2 SILKY CANTILEVERED SILVER BELLY FASCIA & PANORAMIC GALLERY
  // =========================================================================
  const F2_Y = F1_TOP_Y; // 5.48m

  const f2MainDeck = new THREE.Mesh(
    createRoundedSlabGeo(28.8, 35.4, 4.2, 0.32, 0, 44),
    f2TimberFloorMat
  );
  f2MainDeck.position.set(338.3, F2_Y - 0.32, -82.6);
  staticGroup.add(f2MainDeck);

  // West Outdoor Terrace Landing Bridge connecting Exterior Amphitheater Top (Z=-75..-64.8) to F2 West Door!
  const terraceWalkway = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.32, 10.6), amphitheaterStoneMat);
  terraceWalkway.position.set(320.2, F2_Y - 0.16, -70.0);
  staticGroup.add(terraceWalkway);

  // Silky 44-segment Chamfered Silver Belly Fascia Bands wrapping Floor 2 Cantilever (Y = 5.08 .. 6.24)
  const fasciaLowerBand = new THREE.Mesh(
    createRoundedHollowRingGeo(29.2, 35.8, 4.4, 0.65, 0.50, 44),
    brushedSilverMat
  );
  fasciaLowerBand.position.set(338.3, 5.08, -82.6);
  staticGroup.add(fasciaLowerBand);

  const fasciaUpperBand = new THREE.Mesh(
    createRoundedHollowRingGeo(29.75, 36.35, 4.6, 0.60, 0.62, 44),
    mirrorSilverSoffitMat
  );
  fasciaUpperBand.position.set(338.3, 5.62, -82.6);
  staticGroup.add(fasciaUpperBand);

  const fasciaSeam = new THREE.Mesh(
    createRoundedHollowRingGeo(29.8, 36.4, 4.6, 0.08, 0.045, 44),
    blackMullionMat
  );
  fasciaSeam.position.set(338.3, 5.58, -82.6);
  staticGroup.add(fasciaSeam);

  // Subtle Perimeter Exterior Soffit Downlights under Overhang Edge
  [329.5, 336.5, 343.5, 349.5].forEach((lx) => {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 12), ceilingBulbMat);
    d.position.set(lx, 5.07, -99.8);
    staticGroup.add(d);
  });
  [-95.5, -88.5, -81.0, -73.5, -67.5].forEach((lz) => {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 12), ceilingBulbMat);
    d.position.set(352.3, 5.07, lz);
    staticGroup.add(d);
  });

  // Floor 2 Panoramic Curved Curtain Glass (Y = 6.24 .. 10.72)
  const F2_GLASS_BOT_Y = 6.24;
  const F2_GLASS_H = 4.48;
  const F2_GLASS_MID_Y = F2_GLASS_BOT_Y + F2_GLASS_H * 0.5;

  const f2EastGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, F2_GLASS_H, 26.8), curtainGlassMat);
  f2EastGlass.position.set(352.8, F2_GLASS_MID_Y, -82.6);
  staticGroup.add(f2EastGlass);

  const f2NorthGlass = new THREE.Mesh(new THREE.BoxGeometry(20.6, F2_GLASS_H, 0.05), curtainGlassMat);
  f2NorthGlass.position.set(338.3, F2_GLASS_MID_Y, -100.2);
  staticGroup.add(f2NorthGlass);

  // West Glass leaves Terrace Entrance Z = -71.8..-65.0 OPEN!
  const f2WestGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, F2_GLASS_H, 24.2), curtainGlassMat);
  f2WestGlass.position.set(323.8, F2_GLASS_MID_Y, -83.9);
  staticGroup.add(f2WestGlass);

  const f2SouthWall = new THREE.Mesh(new THREE.BoxGeometry(20.6, F2_GLASS_H, 0.32), darkTitaniumMat);
  f2SouthWall.position.set(338.3, F2_GLASS_MID_Y, -65.0);
  staticGroup.add(f2SouthWall);

  buildCornerGlassArc(348.6, -96.0, 4.2, Math.PI * 0.5, Math.PI, F2_GLASS_BOT_Y, F2_GLASS_H);
  buildCornerGlassArc(328.0, -96.0, 4.2, Math.PI, Math.PI * 1.5, F2_GLASS_BOT_Y, F2_GLASS_H);
  buildCornerGlassArc(348.6, -69.2, 4.2, 0, Math.PI * 0.5, F2_GLASS_BOT_Y, F2_GLASS_H);

  [-96.0, -90.6, -85.2, -79.8, -74.5, -69.2].forEach((mz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.055, F2_GLASS_H, 0.045), blackMullionMat);
    m.position.set(352.8, F2_GLASS_MID_Y, mz);
    staticGroup.add(m);
  });
  [328.0, 333.2, 338.3, 343.5, 348.6].forEach((mx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, F2_GLASS_H, 0.055), blackMullionMat);
    m.position.set(mx, F2_GLASS_MID_Y, -100.2);
    staticGroup.add(m);
  });

  // TWO RAZOR-SHARP ILLUMINATED "HUAWEI" WORDMARKS ON BOTH FRONTAGES (Ảnh 2 & Ảnh 3!)
  const eastLogoPlane = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 2.9), huaweiWordmarkMat);
  eastLogoPlane.rotation.y = Math.PI / 2;
  eastLogoPlane.position.set(352.96, 8.70, -83.2);
  eastLogoPlane.userData.noMerge = true;
  staticGroup.add(eastLogoPlane);

  const northLogoPlane = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 2.9), huaweiWordmarkMat);
  northLogoPlane.rotation.y = Math.PI;
  northLogoPlane.position.set(338.3, 8.70, -100.36);
  northLogoPlane.userData.noMerge = true;
  staticGroup.add(northLogoPlane);

  // =========================================================================
  // 4B. FLOOR 2 ULTRA-DETAILED INTERIOR: POD, CAFÉ TABLE + BRASS LAMPS, ESPRESSO BAR & LOUNGE
  // =========================================================================
  for (let gx = 0; gx < 5; gx++) {
    for (let gz = 0; gz < 6; gz++) {
      const px = 327.6 + gx * 4.8;
      const pz = -95.2 + gz * 5.0;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.06, 4.52), cofferedCeilingMat);
      panel.position.set(px, 10.42, pz);
      staticGroup.add(panel);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.74, 0.04, 4.94), darkTitaniumMat);
      frame.position.set(px, 10.47, pz);
      staticGroup.add(frame);

      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), ceilingBulbMat);
      spot.position.set(px + 2.35, 10.43, pz + 2.45);
      staticGroup.add(spot);
    }
  }

  // Iconic Rounded Dark-Titanium Smart-Home Pod with Warm Interior Living Vignette (Ảnh 3 Left!)
  const podShell = new THREE.Mesh(createRoundedSlabGeo(8.2, 5.4, 1.4, 3.65, 0.08, 32), darkTitaniumMat);
  podShell.position.set(331.1, F2_Y, -94.0);
  staticGroup.add(podShell);

  const podWindowWarm = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.45, 0.14), warmCoveLedMat);
  podWindowWarm.position.set(331.1, F2_Y + 2.15, -96.76);
  staticGroup.add(podWindowWarm);

  const podSignMat = new THREE.MeshStandardMaterial({
    map: createHarmonyPosterTex('HARMONY SMART HOME', 'AI Voice • Lighting • Climate', 'WHOLE-HOME LIVING', '#ef4444'),
    emissive: 0xffffff,
    emissiveMap: createHarmonyPosterTex('HARMONY SMART HOME', 'AI Voice • Lighting • Climate', 'WHOLE-HOME LIVING', '#ef4444'),
    emissiveIntensity: 0.9,
  });
  const podScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.2), podSignMat);
  podScreen.rotation.y = Math.PI;
  podScreen.position.set(331.1, F2_Y + 2.15, -96.85);
  podScreen.userData.noMerge = true;
  staticGroup.add(podScreen);

  // Tall Floor 2 Structural Columns & Acoustic Walnut Slatted Back Wall
  [
    [349.8, -96.0],
    [349.8, -82.6],
    [349.8, -69.2],
    [336.5, -96.0],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 4.9, 20), charcoalColumnMat);
    col.position.set(cx, F2_Y + 2.45, cz);
    staticGroup.add(col);
  });

  // Floor 2 Long Communal Café Table + 6 Laptops + 6 Glowing Brass Dome Task Lamps + 12 High Stools!
  const f2LongTable = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.08, 2.3), warmOakMat);
  f2LongTable.position.set(342.6, F2_Y + 1.02, -92.0);
  staticGroup.add(f2LongTable);

  [338.2, 342.6, 347.0].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 1.85), darkTitaniumMat);
    leg.position.set(lx, F2_Y + 0.50, -92.0);
    staticGroup.add(leg);
  });

  for (let i = 0; i < 6; i++) {
    const sx = 338.3 + i * 1.72;
    // Tall glowing tabletop Café Dome Lamp (clearly visible from street above belly fascia!)
    if (i % 2 === 0) {
      const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.42, 10), brushedBrassMat);
      lampStem.position.set(sx + 0.4, F2_Y + 1.27, -92.0);
      staticGroup.add(lampStem);
      const lampDome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), warmCoveLedMat);
      lampDome.position.set(sx + 0.4, F2_Y + 1.48, -92.0);
      staticGroup.add(lampDome);
    }

    // Open MateBook Pro laptops & Espresso cups on table
    const lapBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.24), brushedSilverMat);
    lapBase.position.set(sx, F2_Y + 1.07, -92.42);
    staticGroup.add(lapBase);
    const lapLid = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.22, 0.014),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.9 })
    );
    lapLid.position.set(sx, F2_Y + 1.18, -92.30);
    lapLid.rotation.x = -0.22;
    staticGroup.add(lapLid);

    [-93.55, -90.45].forEach((sz) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.72, 10), brushedSilverMat);
      stem.position.set(sx, F2_Y + 0.36, sz);
      staticGroup.add(stem);
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.07, 14), charcoalColumnMat);
      seat.position.set(sx, F2_Y + 0.74, sz);
      staticGroup.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.30, 0.06), warmOakMat);
      back.position.set(sx, F2_Y + 0.92, sz + (sz < -92 ? -0.20 : 0.20));
      staticGroup.add(back);
    });
  }

  // Floor 2 East MateBook Studio Table
  buildHuaweiTable(345.7, F2_Y, -79.5, 2.4, 6.0, 'laptop');

  // Floor 2 Espresso & Matcha Lounge Bar + Chrome Espresso Machine + Hanging Rack
  const f2Bar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.05, 2.4), darkTitaniumMat);
  f2Bar.position.set(339.1, F2_Y + 0.525, -73.3);
  staticGroup.add(f2Bar);
  const f2BarTop = new THREE.Mesh(new THREE.BoxGeometry(3.95, 0.07, 2.55), warmOakMat);
  f2BarTop.position.set(339.1, F2_Y + 1.08, -73.3);
  staticGroup.add(f2BarTop);

  const espressoMachine = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.52, 0.54), brushedSilverMat);
  espressoMachine.position.set(338.3, F2_Y + 1.38, -73.3);
  staticGroup.add(espressoMachine);
  const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.65), curtainGlassMat);
  pastryCase.position.set(340.1, F2_Y + 1.38, -73.3);
  staticGroup.add(pastryCase);

  const overheadBarRack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.8), blackMullionMat);
  overheadBarRack.position.set(339.1, F2_Y + 3.45, -73.3);
  staticGroup.add(overheadBarRack);
  [337.7, 340.5].forEach((rx) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), blackMullionMat);
    rod.position.set(rx, F2_Y + 4.15, -73.3);
    staticGroup.add(rod);
  });

  // Floor 2 SE Boucle Lounge Sofa & Huawei Vision 98" Display Corner
  const f2SofaBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.44, 1.15), sofaBoucleMat);
  f2SofaBase.position.set(345.4, F2_Y + 0.22, -67.8);
  staticGroup.add(f2SofaBase);
  const f2SofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.55, 0.24), sofaBoucleMat);
  f2SofaBack.position.set(345.4, F2_Y + 0.68, -67.3);
  staticGroup.add(f2SofaBack);
  const f2CoffeeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.36, 20), warmOakMat);
  f2CoffeeTable.position.set(345.4, F2_Y + 0.18, -69.2);
  staticGroup.add(f2CoffeeTable);

  // Backlit Launch Posters on Floor 2 Back Wall
  const pTexA = createHarmonyPosterTex('HarmonyOS NEXT', 'Seamless Multi-Device AI', 'HUAWEI ECOSYSTEM', '#38bdf8');
  const pMatA = new THREE.MeshStandardMaterial({
    map: pTexA,
    emissive: 0xffffff,
    emissiveMap: pTexA,
    emissiveIntensity: 1.2,
    roughness: 0.24,
  });
  const f2PosterA = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.6), pMatA);
  f2PosterA.rotation.y = Math.PI;
  f2PosterA.position.set(342.8, F2_Y + 2.35, -65.24);
  f2PosterA.userData.noMerge = true;
  staticGroup.add(f2PosterA);

  const pTexB = createHarmonyPosterTex('HUAWEI CAFÉ', 'Craft Espresso & Creator Hub', 'LEVEL 2 LOUNGE', '#f59e0b');
  const pMatB = new THREE.MeshStandardMaterial({
    map: pTexB,
    emissive: 0xffffff,
    emissiveMap: pTexB,
    emissiveIntensity: 1.15,
    roughness: 0.24,
  });
  const f2PosterB = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.2), pMatB);
  f2PosterB.rotation.y = Math.PI;
  f2PosterB.position.set(333.2, F2_Y + 2.35, -65.24);
  f2PosterB.userData.noMerge = true;
  staticGroup.add(f2PosterB);

  // Multi-branch Architectural Olive Trees on Floor 2 Panoramic Corners
  addPottedTree(350.6, F2_Y, -97.0, 2.35);
  addPottedTree(348.2, F2_Y, -98.4, 2.05);
  addPottedTree(326.0, F2_Y, -97.6, 2.25);

  // =========================================================================
  // 5. SLOPED LIMESTONE AMPHITHEATER STAIRCASE + HANDRAILS + CANTILEVER CANOPY
  // =========================================================================
  const amphSteps = 22;
  const amphZStart = -102.0;
  const amphZEnd = -75.0;
  const amphSpanZ = amphZEnd - amphZStart; // 27.0m
  const amphX = 320.4;
  const amphW = 7.4;

  for (let i = 0; i < amphSteps; i++) {
    const t = (i + 1) / amphSteps;
    const stepTopY = HUAWEI_PODIUM_Y + t * HUAWEI_FLOOR_H;
    const zCenter = THREE.MathUtils.lerp(amphZStart, amphZEnd, (i + 0.5) / amphSteps);
    const stepD = amphSpanZ / amphSteps + 0.04;
    const stepH = stepTopY;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(amphW, stepH, stepD), amphitheaterStoneMat);
    tread.position.set(amphX, stepH * 0.5, zCenter);
    staticGroup.add(tread);

    // Warm recessed architectural LED strip tucked under every limestone step nosing!
    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(amphW - 0.3, 0.035, 0.04), warmCoveLedMat);
    ledStrip.position.set(amphX, stepTopY - 0.04, zCenter - stepD * 0.5);
    staticGroup.add(ledStrip);
  }

  // Bespoke Sloped Cheek Wall along West Edge (NO tall flat white box sticking out!)
  const slopedWestCheek = new THREE.Mesh(createSlopedCheekWallGeo(), amphitheaterStoneMat);
  slopedWestCheek.position.set(316.45, 0, -84.0);
  staticGroup.add(slopedWestCheek);

  // Sloped Brushed Stainless Handrails & Posts flanking Amphitheater Steps
  const railLen = Math.hypot(27.0, HUAWEI_FLOOR_H); // ~27.53m
  const railPitch = Math.atan2(HUAWEI_FLOOR_H, 27.0);
  [316.95, 323.75].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, railLen, 10), brushedSilverMat);
    rail.position.set(rx, HUAWEI_PODIUM_Y + HUAWEI_FLOOR_H * 0.5 + 0.96, -88.5);
    rail.rotation.x = Math.PI / 2 - railPitch;
    staticGroup.add(rail);

    for (let p = 0; p <= 5; p++) {
      const f = p / 5;
      const pz = THREE.MathUtils.lerp(-101.8, -75.2, f);
      const py = HUAWEI_PODIUM_Y + f * HUAWEI_FLOOR_H;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.96, 8), brushedSilverMat);
      post.position.set(rx, py + 0.48, pz);
      staticGroup.add(post);
    }
  });

  // Terrace Perimeter Glass Safety Railings
  const f2TerraceWestRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.15, 10.6), balustradeGlassMat);
  f2TerraceWestRail.position.set(316.55, F2_Y + 0.58, -70.0);
  staticGroup.add(f2TerraceWestRail);

  const f2TerraceSouthRail = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.15, 0.05), balustradeGlassMat);
  f2TerraceSouthRail.position.set(320.4, F2_Y + 0.58, -64.8);
  staticGroup.add(f2TerraceSouthRail);

  // Tall Cylindrical Silver Column supporting Mirror-Clad Roof Overhang over Amphitheater (Ảnh 3!)
  const amphColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.50, 10.75, 28), brushedSilverMat);
  amphColumn.position.set(318.2, 5.375, -94.5);
  staticGroup.add(amphColumn);

  addPottedTree(317.6, HUAWEI_PODIUM_Y + 1.5, -94.0, 2.05);
  addPottedTree(317.6, HUAWEI_PODIUM_Y + 3.2, -85.5, 2.05);
  addPottedTree(317.6, F2_Y, -73.0, 2.35);

  // =========================================================================
  // 5B. INTERIOR ARCHITECTURAL SWITCHBACK STAIRCASE (STRINGERS + RAILINGS + LEDS)
  // =========================================================================
  const intStairMidY = HUAWEI_PODIUM_Y + HUAWEI_FLOOR_H * 0.5;
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12;
    const yUp = HUAWEI_PODIUM_Y + t * (HUAWEI_FLOOR_H * 0.5);
    const zUp = -79.2 - t * 5.2;
    const treadUp = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.11, 0.44), warmOakMat);
    treadUp.position.set(327.3, yUp - 0.055, zUp);
    staticGroup.add(treadUp);

    const ledUp = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.02, 0.04), warmCoveLedMat);
    ledUp.position.set(327.3, yUp - 0.10, zUp + 0.18);
    staticGroup.add(ledUp);

    const yTop = intStairMidY + t * (HUAWEI_FLOOR_H * 0.5);
    const zTop = -84.4 + t * 5.2;
    const treadTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.11, 0.44), warmOakMat);
    treadTop.position.set(329.8, yTop - 0.055, zTop);
    staticGroup.add(treadTop);

    const ledTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.02, 0.04), warmCoveLedMat);
    ledTop.position.set(329.8, yTop - 0.10, zTop - 0.18);
    staticGroup.add(ledTop);
  }

  // Diagonal Brushed-Titanium Stringer Beams supporting both flights cleanly!
  const flightLen = Math.hypot(5.2, HUAWEI_FLOOR_H * 0.5);
  const flightPitch = Math.atan2(HUAWEI_FLOOR_H * 0.5, 5.2);
  [326.18, 328.42].forEach((sx) => {
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, flightLen), darkTitaniumMat);
    str.position.set(sx, HUAWEI_PODIUM_Y + HUAWEI_FLOOR_H * 0.25 - 0.10, -81.8);
    str.rotation.x = flightPitch;
    staticGroup.add(str);
  });
  [328.68, 330.92].forEach((sx) => {
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, flightLen), darkTitaniumMat);
    str.position.set(sx, intStairMidY + HUAWEI_FLOOR_H * 0.25 - 0.10, -81.8);
    str.rotation.x = -flightPitch;
    staticGroup.add(str);
  });

  const intLanding = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.18, 2.1), warmOakMat);
  intLanding.position.set(328.55, intStairMidY - 0.09, -85.5);
  staticGroup.add(intLanding);

  // Double Glass Balustrade enclosing East & Center Spine of Interior Stairwell
  const intStairRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, HUAWEI_FLOOR_H + 1.15, 7.6), balustradeGlassMat);
  intStairRail.position.set(331.2, HUAWEI_PODIUM_Y + (HUAWEI_FLOOR_H + 1.15) * 0.5, -83.0);
  staticGroup.add(intStairRail);

  const intTopRail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 7.6), brushedSilverMat);
  intTopRail.position.set(331.2, F2_Y + 1.15, -83.0);
  staticGroup.add(intTopRail);

  // =========================================================================
  // 6. SILKY DUAL-TIER ROUNDED ROOF & FLOATING SKY TERRACE (Y = 10.74..12.68)
  // =========================================================================
  const mainRoofDeck = new THREE.Mesh(
    createRoundedSlabGeo(37.1, 36.8, 4.6, 0.48, 0.04, 44),
    mirrorSilverSoffitMat
  );
  mainRoofDeck.position.set(334.75, 10.74, -82.7);
  staticGroup.add(mainRoofDeck);

  const mainRoofLed = new THREE.Mesh(
    createRoundedHollowRingGeo(37.18, 36.88, 4.6, 0.06, 0.05, 44),
    canopyEdgeLedMat
  );
  mainRoofLed.position.set(334.75, 11.20, -82.7);
  staticGroup.add(mainRoofLed);

  // Tier 2 Recessed Sky Pavilion + Pergola Louvers + Floating Sky Blade Canopy
  const skyPavilionGlass = new THREE.Mesh(
    createRoundedSlabGeo(25.2, 31.2, 3.8, 0.96, 0, 40),
    curtainGlassMat
  );
  skyPavilionGlass.position.set(338.8, 11.26, -82.6);
  staticGroup.add(skyPavilionGlass);

  const skyCanopyBlade = new THREE.Mesh(
    createRoundedSlabGeo(28.6, 34.4, 4.4, 0.42, 0.03, 44),
    brushedSilverMat
  );
  skyCanopyBlade.position.set(338.8, 12.24, -82.6);
  staticGroup.add(skyCanopyBlade);

  const skyCanopyLed = new THREE.Mesh(
    createRoundedHollowRingGeo(28.68, 34.48, 4.4, 0.05, 0.045, 44),
    canopyEdgeLedMat
  );
  skyCanopyLed.position.set(338.8, 12.62, -82.6);
  staticGroup.add(skyCanopyLed);

  const roofRailN = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.95, 0.05), balustradeGlassMat);
  roofRailN.position.set(338.8, 11.72, -100.6);
  staticGroup.add(roofRailN);

  const roofRailE = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 26.0), balustradeGlassMat);
  roofRailE.position.set(352.9, 11.72, -82.6);
  staticGroup.add(roofRailE);

  // Rooftop Landscaped Planter Hedges along North & East Roof Rim
  const roofPlanterN = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.48, 0.72), darkTitaniumMat);
  roofPlanterN.position.set(338.8, 11.48, -99.8);
  staticGroup.add(roofPlanterN);
  const roofHedgeN = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.52, 0.56), plantLeafMatA);
  roofHedgeN.position.set(338.8, 11.92, -99.8);
  staticGroup.add(roofHedgeN);

  addPottedTree(349.6, 11.24, -97.6, 1.9);
  addPottedTree(326.0, 11.24, -97.6, 1.9);

  // =========================================================================
  // 7. HIGH-OUTPUT ARCHITECTURAL POINT LIGHTS & SIDEWALK POOLS
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

  addLight(0xfffdf5, 10.2, 17.2, 38, 344.5, 4.4, -81.5); // Floor 1 East Entry & Experience Zone
  addLight(0xfffef8, 9.8, 16.6, 36, 343.5, 4.4, -92.5); // Floor 1 North Corner & AITO M9 EV
  addLight(0xfffbeb, 9.4, 15.8, 34, 336.5, 4.4, -73.0); // Floor 1 South Hero Wall & Accessories
  addLight(0xfffbeb, 9.8, 16.5, 38, 344.5, F2_Y + 4.1, -83.5); // Floor 2 Café & Gallery
  addLight(0xfffdf5, 9.5, 16.0, 36, 332.5, F2_Y + 4.1, -88.5); // Floor 2 Smart-Home Pod & Long Table
  addLight(0xfef3c7, 8.8, 15.0, 34, 343.0, F2_Y + 4.1, -70.0); // Floor 2 Espresso Bar & Lounge
  addLight(0xfff7ed, 3.6, 8.2, 28, 320.4, 6.2, -88.0, true); // Outdoor Amphitheater Canopy Glow
  addLight(0xfffdf5, 3.0, 7.2, 24, 353.8, 4.5, -81.0, true); // East Sơn Tây Promenade Welcome Pool

  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  poolMats.push(poolMat);
  const eastPool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 28.0), poolMat);
  eastPool.rotation.x = -Math.PI / 2;
  eastPool.position.set(354.2, HUAWEI_PODIUM_Y + 0.015, -82.5);
  staticGroup.add(eastPool);

  const northPool = new THREE.Mesh(new THREE.PlaneGeometry(28.0, 4.2), poolMat);
  northPool.rotation.x = -Math.PI / 2;
  northPool.position.set(338.0, HUAWEI_PODIUM_Y + 0.015, -101.6);
  staticGroup.add(northPool);

  // =========================================================================
  // 8. UPDATE LOOP (DUAL PORTAL SLIDING DOORS + SHUTTERS + LUMINOUS LIGHTING)
  // =========================================================================
  let eastDoorProg = 0;
  let northDoorProg = 0;
  let shutterProgress = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: HuaweiStoreNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isHuaweiStoreOpenAtHour(rawHour);
    currentOpenFactor = isOpen ? 1 : THREE.MathUtils.lerp(1, 0.22, shutterProgress);

    cofferedCeilingMat.emissiveIntensity = THREE.MathUtils.lerp(3.2, 6.0, lampFactor) * currentOpenFactor;
    ceilingBulbMat.emissiveIntensity = THREE.MathUtils.lerp(3.6, 6.8, lampFactor) * currentOpenFactor;
    canopyEdgeLedMat.emissiveIntensity = THREE.MathUtils.lerp(2.6, 4.8, lampFactor);
    warmCoveLedMat.emissiveIntensity = THREE.MathUtils.lerp(2.8, 5.4, lampFactor) * currentOpenFactor;
    huaweiWordmarkMat.emissiveIntensity = THREE.MathUtils.lerp(2.6, 4.2, lampFactor);
    flowerMat.emissiveIntensity = THREE.MathUtils.lerp(1.5, 2.7, lampFactor) * currentOpenFactor;
    heroWallMat.emissiveIntensity = THREE.MathUtils.lerp(1.3, 2.3, lampFactor) * currentOpenFactor;
    pMatA.emissiveIntensity = THREE.MathUtils.lerp(1.3, 2.2, lampFactor) * currentOpenFactor;
    pMatB.emissiveIntensity = THREE.MathUtils.lerp(1.3, 2.2, lampFactor) * currentOpenFactor;

    let wantEastOpen = false;
    let wantNorthOpen = false;
    if (isOpen) {
      if (playerPos && playerPos.y < 2.2) {
        if (Math.hypot(playerPos.x - EAST_DOOR_X, playerPos.z - EAST_DOOR_Z) <= 4.6) wantEastOpen = true;
        if (Math.hypot(playerPos.x - NORTH_DOOR_X, playerPos.z - NORTH_DOOR_Z) <= 4.6) wantNorthOpen = true;
      }
      if (!wantEastOpen && npcController?.hasNpcNearEastDoor()) wantEastOpen = true;
      if (!wantNorthOpen && npcController?.hasNpcNearNorthDoor()) wantNorthOpen = true;
    }

    eastDoorProg += ((wantEastOpen ? 1 : 0) - eastDoorProg) * Math.min(1, dt * 6.5);
    northDoorProg += ((wantNorthOpen ? 1 : 0) - northDoorProg) * Math.min(1, dt * 6.5);

    const eastSlide = eastDoorProg * 2.1;
    eastPortal.leafA.position.z = eastPortal.closedA - eastSlide;
    eastPortal.leafB.position.z = eastPortal.closedB + eastSlide;

    const northSlide = northDoorProg * 2.1;
    northPortal.leafA.position.x = northPortal.closedA - northSlide;
    northPortal.leafB.position.x = northPortal.closedB + northSlide;

    const npcsEmpty = npcController ? npcController.isFullyClosedAndEmpty() : true;
    const targetShutter = !isOpen && (npcsEmpty || shutterProgress > 0.05) ? 1 : 0;
    shutterProgress += (targetShutter - shutterProgress) * Math.min(1, dt * 2.2);
    setShutterProgress(eastPortal.shutter, shutterProgress);
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
// HUAWEI STORE NPC CONTROLLER (EXPERIENCE SPECIALISTS & VISITORS)
// =========================================================================

interface HuaweiActor {
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

const HUAWEI_SPOTS = [
  { x: 348.5, z: -91.2, yaw: -Math.PI * 0.4 }, // Admiring AITO M9 EV
  { x: 347.5, z: -81.0, yaw: -Math.PI / 2 }, // East Hero Mate XT Table
  { x: 343.2, z: -72.8, yaw: Math.PI / 2 }, // Pura Ultra Photography Table
  { x: 338.8, z: -93.8, yaw: Math.PI }, // North Portal Table
  { x: 336.5, z: -80.6, yaw: Math.PI / 2 }, // MateBook Studio Table
  { x: 340.2, z: -74.1, yaw: 0 }, // Huawei Care Desk
  { x: 346.4, z: -68.2, yaw: 0 }, // Accessories & Sound X Wall
];

export class HuaweiStoreNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: HuaweiActor[] = [];

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const outfits = [
      { shirt: 0x0f172a, pants: 0x1e293b, hair: 0x18181b, skin: '#fde2cc', kind: 'specialist' as const },
      { shirt: 0x111827, pants: 0x0f172a, hair: 0x2c1a10, skin: '#f5c7a3', kind: 'specialist' as const },
      { shirt: 0x0f172a, pants: 0x334155, hair: 0x1c1917, skin: '#fbe0c8', kind: 'specialist' as const },
      { shirt: 0xdc2626, pants: 0x1e293b, hair: 0x111827, skin: '#fde2cc', kind: 'shopper' as const },
      { shirt: 0xf8fafc, pants: 0x334155, hair: 0x3b2314, skin: '#f5c7a3', kind: 'shopper' as const },
      { shirt: 0x0284c7, pants: 0x0f172a, hair: 0x18181b, skin: '#fbe0c8', kind: 'shopper' as const },
      { shirt: 0xeab308, pants: 0x1e293b, hair: 0x271911, skin: '#e8b48e', kind: 'shopper' as const },
      { shirt: 0x10b981, pants: 0x18181b, hair: 0x1c1917, skin: '#fde2cc', kind: 'shopper' as const },
    ];

    outfits.forEach((cfg, idx) => {
      const spot = HUAWEI_SPOTS[idx % HUAWEI_SPOTS.length];
      const built = this.buildActorMesh(helpers, cfg, idx);
      const isF2 = idx === 6 || idx === 7;
      const baseY = isF2 ? HUAWEI_PODIUM_Y + HUAWEI_FLOOR_H : HUAWEI_PODIUM_Y;
      const sx = isF2 ? (idx === 6 ? 342.4 : 346.2) : spot.x + (idx > 6 ? 0.8 : 0);
      const sz = isF2 ? (idx === 6 ? -89.8 : -94.2) : spot.z;

      built.root.position.set(sx, baseY, sz);
      built.root.rotation.y = spot.yaw;
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
        homePos: new THREE.Vector3(sx, baseY, sz),
        homeYaw: spot.yaw,
        phase: 'admire',
        pathQueue: [],
        pathIdx: 0,
        targetYaw: spot.yaw,
        stateTimer: 1.5 + idx * 1.1,
        walkPhase: idx * 0.9,
        walkPhaseRef: { phase: idx * 0.9 },
        exitRef: { idx: 0 },
        exitDone: false,
        speed: cfg.kind === 'specialist' ? 1.38 : 1.24,
        seed: idx * 19 + 7,
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
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
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
      new THREE.MeshStandardMaterial({ color: 0xfef2f2, roughness: 0.45 })
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
          : pickStationaryCivilianModel(idx + 17)
        : pickShopCustomerModel(idx + 23);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: root,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: cfg.kind === 'specialist' && idx === 0 ? 'Checkout' : 'Idle',
      phaseOffset: idx * 0.59,
    });

    return { root, leftArm, rightArm, leftLeg, rightLeg, bag, glbHandle };
  }

  public hasNpcNearEastDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const p = this.actors[i].root.position;
      if (p.y < 2.2 && Math.hypot(p.x - EAST_DOOR_X, p.z - EAST_DOOR_Z) < 3.6) return true;
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
    const isOpen = isHuaweiStoreOpenAtHour(rawHour);

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!isOpen) {
        if (!a.exitDone) {
          a.glbHandle.setAnimState('Walk');
          const exitViaNorth = a.id % 2 === 1;
          const exitPts = exitViaNorth
            ? [
                new THREE.Vector3(NORTH_DOOR_X, HUAWEI_PODIUM_Y, NORTH_DOOR_Z),
                new THREE.Vector3(NORTH_DOOR_X, 0, -104.8),
              ]
            : [
                new THREE.Vector3(EAST_DOOR_X, HUAWEI_PODIUM_Y, EAST_DOOR_Z),
                new THREE.Vector3(357.2, 0, EAST_DOOR_Z),
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
            const nextX = a.homePos.x + (Math.sin(a.seed + i) > 0 ? -1.4 : 1.4);
            a.pathQueue = [new THREE.Vector3(nextX, a.homePos.y, a.homePos.z)];
          } else {
            const nextSpot = HUAWEI_SPOTS[(a.id + Math.floor(rawHour * 3) + 1) % HUAWEI_SPOTS.length];
            a.pathQueue = [new THREE.Vector3(nextSpot.x, HUAWEI_PODIUM_Y, nextSpot.z)];
            a.targetYaw = nextSpot.yaw;
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
