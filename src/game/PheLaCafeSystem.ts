import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isPheLaOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface PheLaCafeBuildResult {
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
    npcController?: PheLaNpcController | null
  ) => void;
}

// Positioned directly East (visual left from Boulevard) of Peri Pool Arena (X = 236.5..270.5)
// Facing North (-Z) onto East Leg Boulevard SE Sidewalk (Z = 37.2..42.5)
// Building Footprint: X = 274.0 .. 296.0 (22.0m wide), Z = 47.2 .. 65.2 (18.0m deep)
// Covered Camping Veranda: X = 273.5 .. 296.5, Z = 42.5 .. 47.2
export const PHE_LA_COLLIDERS: IntersectionColliderBox[] = [
  // Side property dividers keeping 3.5m landscaped gap from Peri Pool & clean East edge
  { minX: 273.6, maxX: 274.3, minZ: 47.0, maxZ: 65.4, floor: 1 }, // West Wall (beside Lounge)
  { minX: 295.7, maxX: 296.4, minZ: 47.0, maxZ: 65.4, floor: 1 }, // East Wall (beside Takeaway Bar)
  { minX: 273.8, maxX: 296.2, minZ: 64.6, maxZ: 65.5, floor: 1 }, // South Rear Wall

  // Front Storefront Curtain Wall & Takeaway Counter (Walk-in Doorway Opening: X = 278.4 .. 280.6, Z = 47.2)
  { minX: 274.0, maxX: 278.4, minZ: 46.9, maxZ: 47.55, floor: 1 }, // Storefront Right Wing (Lounge glass)
  { minX: 280.6, maxX: 296.0, minZ: 46.9, maxZ: 47.55, floor: 1 }, // Storefront Center Glass & Takeaway Window
  { minX: 290.6, maxX: 296.0, minZ: 46.2, maxZ: 52.8, floor: 1 }, // Left Takeaway & Espresso/Siphon Bar Counter

  // Veranda Structural Timber Columns (Z = 43.55)
  { minX: 274.0, maxX: 274.7, minZ: 43.2, maxZ: 43.9, floor: 1 },
  { minX: 279.3, maxX: 280.0, minZ: 43.2, maxZ: 43.9, floor: 1 },
  { minX: 284.7, maxX: 285.4, minZ: 43.2, maxZ: 43.9, floor: 1 },
  { minX: 290.1, maxX: 290.8, minZ: 43.2, maxZ: 43.9, floor: 1 },
  { minX: 295.3, maxX: 296.0, minZ: 43.2, maxZ: 43.9, floor: 1 },

  // Veranda Camping Tables & Folding Chairs Row (leaves comfortable walkway behind/in front)
  { minX: 281.1, maxX: 290.0, minZ: 44.75, maxZ: 45.75, floor: 1 },

  // Interior Sculptural Spiral Drum & Partition next to Entrance Doorway
  { minX: 280.7, maxX: 282.3, minZ: 48.0, maxZ: 50.6, floor: 1 },

  // Interior Camping Dining Zone & Backlit Arch Banquettes
  { minX: 283.1, maxX: 288.9, minZ: 52.0, maxZ: 53.2, floor: 1 }, // Center Indoor Camping Tables
  { minX: 281.0, maxX: 294.8, minZ: 57.6, maxZ: 63.8, floor: 1 }, // 3 Glowing Arch Alcoves & Banquettes

  // Visual Right Cozy Mushroom-Lamp Lounge (X = 274.3..277.6, Z = 49.6..63.8)
  { minX: 274.3, maxX: 277.6, minZ: 50.2, maxZ: 63.8, floor: 1 },
];

export interface PheLaPlacementConfig {
  anchorX: number;
  anchorZ: number;
  rotationY: number;
  seedOffset?: number;
}

const PHE_LA_ORIG_ANCHOR_X = 285.0;
const PHE_LA_ORIG_ANCHOR_Z = 42.5;

/**
 * Phê La — Chi nhánh Đường Bạch Đằng (bên cạnh CHANEL Bạch Đằng):
 * - Footprint: X = 45.0 .. 68.0 (23.0m wide veranda, 1.4m West of CHANEL at X = 69.4)
 * - Depth:     Z = -104.0 .. -81.3 (veranda flush with Đường Bạch Đằng Z = -104.0)
 * - Facing:    North (-Z) toward Sông Hàn & Đường Bạch Đằng (rotationY = 0)
 * - Doorway:   X = 49.9 .. 52.1, Z = -99.3
 */
export const PHE_LA_BACH_DANG_PLACEMENT: PheLaPlacementConfig = {
  anchorX: 56.5,
  anchorZ: -104.0,
  rotationY: 0,
  seedOffset: 61,
};

function transformPheLaPointXZ(
  ox: number,
  oz: number,
  placement: PheLaPlacementConfig
): { x: number; z: number } {
  const lx = ox - PHE_LA_ORIG_ANCHOR_X;
  const lz = oz - PHE_LA_ORIG_ANCHOR_Z;
  const c = Math.cos(placement.rotationY);
  const s = Math.sin(placement.rotationY);
  return {
    x: placement.anchorX + lx * c + lz * s,
    z: placement.anchorZ - lx * s + lz * c,
  };
}

export function createTransformedPheLaColliders(
  placement: PheLaPlacementConfig
): IntersectionColliderBox[] {
  return PHE_LA_COLLIDERS.map((box) => {
    const p1 = transformPheLaPointXZ(box.minX, box.minZ, placement);
    const p2 = transformPheLaPointXZ(box.maxX, box.maxZ, placement);
    const p3 = transformPheLaPointXZ(box.minX, box.maxZ, placement);
    const p4 = transformPheLaPointXZ(box.maxX, box.minZ, placement);
    return {
      minX: Math.min(p1.x, p2.x, p3.x, p4.x),
      maxX: Math.max(p1.x, p2.x, p3.x, p4.x),
      minZ: Math.min(p1.z, p2.z, p3.z, p4.z),
      maxZ: Math.max(p1.z, p2.z, p3.z, p4.z),
      floor: box.floor,
    };
  });
}

export const PHE_LA_BACH_DANG_COLLIDERS: IntersectionColliderBox[] =
  createTransformedPheLaColliders(PHE_LA_BACH_DANG_PLACEMENT);

// Stylized Phê La Logo Emblem: Upright oval + tea-stem & veined leaf + twin sprouts (exact match to Image 2)
function drawPheLaEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, strokeHex: string) {
  ctx.save();
  ctx.strokeStyle = strokeHex;
  ctx.fillStyle = strokeHex;
  ctx.lineWidth = Math.max(3, radius * 0.13);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer upright oval frame
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 0.88, radius * 1.0, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Central vertical tea/note stem rising from lower inner rim
  const sx = cx - radius * 0.14;
  const stemBot = cy + radius * 0.86;
  const stemTop = cy - radius * 0.46;
  ctx.lineWidth = Math.max(2.5, radius * 0.115);
  ctx.beginPath();
  ctx.moveTo(sx, stemBot);
  ctx.lineTo(sx, stemTop);
  ctx.stroke();

  // Top curving tea leaf / note flag
  ctx.beginPath();
  ctx.moveTo(sx, stemTop + radius * 0.04);
  ctx.bezierCurveTo(
    sx + radius * 0.18,
    stemTop - radius * 0.24,
    sx + radius * 0.60,
    stemTop - radius * 0.22,
    sx + radius * 0.56,
    stemTop + radius * 0.02
  );
  ctx.bezierCurveTo(
    sx + radius * 0.52,
    stemTop + radius * 0.22,
    sx + radius * 0.14,
    stemTop + radius * 0.22,
    sx,
    stemTop + radius * 0.12
  );
  ctx.stroke();

  // Inner leaf midrib vein
  ctx.lineWidth = Math.max(2, radius * 0.08);
  ctx.beginPath();
  ctx.moveTo(sx + radius * 0.06, stemTop + radius * 0.04);
  ctx.quadraticCurveTo(
    sx + radius * 0.30,
    stemTop - radius * 0.04,
    sx + radius * 0.48,
    stemTop + radius * 0.01
  );
  ctx.stroke();

  // Two lower upward-curving leaf sprouts on right of stem
  ctx.lineWidth = Math.max(2.5, radius * 0.105);
  [cy + radius * 0.24, cy + radius * 0.52].forEach((sy) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(
      sx + radius * 0.24,
      sy - radius * 0.04,
      sx + radius * 0.29,
      sy - radius * 0.22
    );
    ctx.stroke();
  });

  ctx.restore();
}

function createPheLaWoodShingleTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#3a271c';
  ctx.fillRect(0, 0, w, h);

  const palette = ['#4b3426', '#5e4231', '#3b281d', '#6d4e39', '#2e1f16', '#7b5840', '#483326', '#52392b'];
  const rows = 9;
  const rowH = h / rows;

  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    let x = -14 + (r % 2) * 9;
    while (x < w) {
      const tileW = 14 + Math.floor(rnd() * 10);
      const col = palette[Math.floor(rnd() * palette.length)];
      ctx.fillStyle = col;
      ctx.fillRect(x + 1, y + 1, tileW - 2, rowH - 3);

      // Subtle vertical shake grain
      ctx.fillStyle = 'rgba(20, 12, 8, 0.22)';
      ctx.fillRect(x + tileW * 0.45, y + 2, 2, rowH - 4);

      // Bottom overlap shadow
      ctx.fillStyle = 'rgba(15, 9, 5, 0.55)';
      ctx.fillRect(x, y + rowH - 3, tileW, 3);

      // Warm top edge highlight
      ctx.fillStyle = 'rgba(214, 180, 140, 0.10)';
      ctx.fillRect(x + 1, y + 1, tileW - 2, 2);

      x += tileW;
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

function strokePheLaWordmarkPaths(ctx: CanvasRenderingContext2D) {
  // Exact handcrafted rounded geometric strokes for "Phê-La" matching Image 2
  // 'P'
  ctx.beginPath();
  ctx.moveTo(392, 230);
  ctx.lineTo(392, 78);
  ctx.bezierCurveTo(466, 58, 472, 134, 392, 144);
  ctx.stroke();

  // 'h' (stylized tall dual-stem with slanted crossbar)
  ctx.beginPath();
  ctx.moveTo(482, 134);
  ctx.lineTo(482, 266);
  ctx.moveTo(482, 214);
  ctx.lineTo(552, 158);
  ctx.moveTo(552, 76);
  ctx.lineTo(552, 266);
  ctx.stroke();

  // 'ê' (narrow arched 'e' + circumflex accent)
  ctx.beginPath();
  ctx.moveTo(604, 198);
  ctx.lineTo(664, 162);
  ctx.bezierCurveTo(662, 122, 602, 124, 600, 178);
  ctx.lineTo(600, 232);
  ctx.bezierCurveTo(600, 270, 658, 270, 672, 240);
  ctx.stroke();

  // '^' accent
  ctx.beginPath();
  ctx.moveTo(610, 92);
  ctx.lineTo(638, 70);
  ctx.lineTo(666, 92);
  ctx.stroke();

  // '-' hyphen
  ctx.beginPath();
  ctx.moveTo(708, 194);
  ctx.lineTo(744, 194);
  ctx.stroke();

  // 'L' + 'a' sweep
  ctx.beginPath();
  ctx.moveTo(784, 76);
  ctx.lineTo(784, 266);
  ctx.quadraticCurveTo(822, 242, 852, 206);
  ctx.stroke();

  // 'a'
  ctx.beginPath();
  ctx.moveTo(858, 114);
  ctx.bezierCurveTo(880, 68, 942, 74, 942, 128);
  ctx.lineTo(942, 234);
  ctx.bezierCurveTo(942, 270, 868, 272, 858, 224);
  ctx.bezierCurveTo(852, 190, 892, 168, 940, 180);
  ctx.stroke();
}

function createPheLaMainLogoTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 340;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Transparent background: only glowing emblem + letters render (no brown plaque box!)
  ctx.clearRect(0, 0, w, h);

  const cream = '#fff8ea';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Soft warm golden glow pass (subtle halo, never blinding glare)
  ctx.save();
  ctx.shadowColor = 'rgba(255, 214, 130, 0.60)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = cream;
  ctx.lineWidth = 20;
  drawPheLaEmblem(ctx, 186, h * 0.50, 114, cream);
  strokePheLaWordmarkPaths(ctx);
  ctx.restore();

  // Crisp foreground stroke pass
  ctx.save();
  ctx.strokeStyle = '#fffdf7';
  ctx.lineWidth = 17;
  drawPheLaEmblem(ctx, 186, h * 0.50, 114, '#fffdf7');
  strokePheLaWordmarkPaths(ctx);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPheLaSloganTex(): THREE.CanvasTexture {
  const w = 1360;
  const h = 240;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Transparent cutout lettering directly on the upper cedar shake wall
  ctx.clearRect(0, 0, w, h);

  const cream = '#fffaf0';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Soft warm LED channel glow pass (not blinding)
  ctx.save();
  ctx.shadowColor = 'rgba(255, 214, 132, 0.56)';
  ctx.shadowBlur = 14;

  // Taller oval emblem left of text matching Image 2 proportion
  drawPheLaEmblem(ctx, 112, h * 0.50, 62, cream);

  ctx.font = '800 72px "Nunito", "Quicksand", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = cream;
  ctx.strokeText('NỐT HƯƠNG ĐẶC SẢN', 214, h * 0.53);
  ctx.fillStyle = cream;
  ctx.fillText('NỐT HƯƠNG ĐẶC SẢN', 214, h * 0.53);
  ctx.restore();

  // Crisp foreground text pass for daytime legibility
  ctx.save();
  ctx.font = '800 72px "Nunito", "Quicksand", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fffdf8';
  ctx.fillText('NỐT HƯƠNG ĐẶC SẢN', 214, h * 0.53);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPheLaCounterIconsTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Warm sand-stone concrete bar base
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#e5ddd2');
  g.addColorStop(1, '#cfc3b4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Hand-drawn specialty coffee / oolong tea gear icons across counter (matching lower-left of Image 2)
  ctx.strokeStyle = '#3e2c20';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const iconY = 128;
  // 1. V60 Dripper & Server
  ctx.beginPath();
  ctx.moveTo(100, iconY - 35);
  ctx.lineTo(156, iconY - 35);
  ctx.lineTo(140, iconY - 4);
  ctx.lineTo(116, iconY - 4);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeRect(108, iconY - 2, 40, 46);

  // 2. Syphon Brewer (Phê La signature!)
  ctx.beginPath();
  ctx.arc(285, iconY + 24, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(267, iconY - 42, 36, 40);
  ctx.beginPath();
  ctx.moveTo(285, iconY - 2);
  ctx.lineTo(285, iconY + 24);
  ctx.stroke();

  // 3. Gooseneck Kettle
  ctx.beginPath();
  ctx.moveTo(410, iconY + 42);
  ctx.lineTo(466, iconY + 42);
  ctx.lineTo(458, iconY - 24);
  ctx.lineTo(418, iconY - 24);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(415, iconY + 12);
  ctx.quadraticCurveTo(385, iconY - 10, 392, iconY - 30);
  ctx.stroke();

  // 4. French Press
  ctx.strokeRect(565, iconY - 26, 42, 68);
  ctx.beginPath();
  ctx.moveTo(586, iconY - 44);
  ctx.lineTo(586, iconY + 18);
  ctx.moveTo(565, iconY + 18);
  ctx.lineTo(607, iconY + 18);
  ctx.stroke();

  // 5. Cold Brew / Oolong Phê La Cup
  ctx.beginPath();
  ctx.moveTo(715, iconY - 24);
  ctx.lineTo(765, iconY - 24);
  ctx.lineTo(757, iconY + 44);
  ctx.lineTo(723, iconY + 44);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(745, iconY - 24);
  ctx.lineTo(756, iconY - 48);
  ctx.stroke();

  // 6. Signature Phê La Emblem Stamp
  drawPheLaEmblem(ctx, 888, iconY + 4, 34, '#3e2c20');

  // Subtle floor-wash glow strip along counter base
  ctx.fillStyle = '#fff3d6';
  ctx.fillRect(0, h - 18, w, 18);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPheLaMenuBoardTex(): THREE.CanvasTexture {
  const w = 768;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#2d1e15';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9b99b';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  drawPheLaEmblem(ctx, 68, 62, 28, '#fef3c7');
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText('PHÊ LA  •  THỰC ĐƠN ĐẶC SẢN', 112, 64);

  const items: Array<[string, string]> = [
    ['Ô LONG SỮA PHÊ LA', '55K'],
    ['PHONG LAN (SYPHON)', '60K'],
    ['TẤM (Ô LONG GẠO RANG)', '55K'],
    ["KHÓI B'LAO (NITRO)", '55K'],
    ['CÀ PHÊ TRỨNG BÔNG', '58K'],
  ];

  items.forEach(([name, price], i) => {
    const ry = 132 + i * 46;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,235,0.06)' : 'rgba(0,0,0,0)';
    ctx.fillRect(28, ry - 20, w - 56, 40);
    ctx.fillStyle = '#f5e6d3';
    ctx.textAlign = 'left';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText(name, 46, ry);
    ctx.fillStyle = '#fcd34d';
    ctx.textAlign = 'right';
    ctx.font = '800 25px monospace';
    ctx.fillText(price, w - 46, ry);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPheLaSandWaveWallTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#c89e6c';
  ctx.fillRect(0, 0, w, h);

  const bands = ['#d8b282', '#bd905d', '#deb98a', '#b18352', '#cfa674'];
  for (let b = 0; b < 7; b++) {
    const baseY = 60 + b * 66;
    ctx.fillStyle = bands[b % bands.length];
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    for (let x = 0; x <= w; x += 32) {
      const y = baseY + Math.sin((x / w) * Math.PI * 2 + b * 1.1) * 16;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPheLaGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 226, 175, 0.36)');
  grad.addColorStop(0.55, 'rgba(253, 212, 148, 0.14)');
  grad.addColorStop(1, 'rgba(253, 212, 148, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Helper: Phê La Signature Camping Folding Chair + Optional Armrest
function buildCampingChair(
  x: number,
  y: number,
  z: number,
  yaw: number,
  canvasMat: THREE.Material,
  woodMat: THREE.Material,
  frameMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  // Crossed X folding aluminum legs
  [-0.22, 0.22].forEach((lx) => {
    const legA = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.52, 0.03), frameMat);
    legA.position.set(lx, 0.22, 0);
    legA.rotation.x = 0.52;
    grp.add(legA);
    const legB = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.52, 0.03), frameMat);
    legB.position.set(lx, 0.22, 0);
    legB.rotation.x = -0.52;
    grp.add(legB);
  });

  // Canvas seat & reclined backrest
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.44), canvasMat);
  seat.position.set(0, 0.42, 0.02);
  seat.rotation.x = -0.06;
  grp.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.04), canvasMat);
  back.position.set(0, 0.68, -0.20);
  back.rotation.x = -0.22;
  grp.add(back);

  // Wooden camping armrests
  [-0.25, 0.25].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 0.40), woodMat);
    arm.position.set(ax, 0.57, -0.02);
    grp.add(arm);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), frameMat);
    post.position.set(ax, 0.48, 0.14);
    grp.add(post);
  });

  return grp;
}

// Helper: Low Roll-Top Wood Camping Table + Signature Phê La Cups
function buildCampingTable(
  x: number,
  y: number,
  z: number,
  woodMat: THREE.Material,
  frameMat: THREE.Material,
  cupMat: THREE.Material,
  lidMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  // Roll-top slatted wood table surface
  for (let s = -2; s <= 2; s++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.095), woodMat);
    slat.position.set(0, 0.46, s * 0.108);
    grp.add(slat);
  }
  [-0.28, 0.28].forEach((lx) => {
    [-0.20, 0.20].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 0.03), frameMat);
      leg.position.set(lx, 0.23, lz);
      grp.add(leg);
    });
  });

  // Two signature Phê La Oolong cups with dome lids & straws
  [
    [-0.14, 0.06],
    [0.14, -0.05],
  ].forEach(([cx, cz]) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.14, 10), cupMat);
    cup.position.set(cx, 0.54, cz);
    grp.add(cup);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), lidMat);
    lid.position.set(cx, 0.61, cz);
    grp.add(lid);
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 6), frameMat);
    straw.position.set(cx + 0.01, 0.66, cz);
    straw.rotation.z = -0.15;
    grp.add(straw);
  });

  return grp;
}

// Helper: Terracotta Potted Tropical Cafe Plant
function buildTerracottaPlant(x: number, y: number, z: number, scale = 1.0): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);

  const potMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.72 });
  const leafAltMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.20, 0.44, 12), potMat);
  pot.position.y = 0.22;
  grp.add(pot);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), i % 2 === 0 ? leafMat : leafAltMat);
    leaf.position.set(Math.cos(a) * 0.16, 0.68 + (i % 2) * 0.14, Math.sin(a) * 0.16);
    leaf.scale.set(1.15, 0.68, 0.85);
    grp.add(leaf);
  }
  return grp;
}

export function createPheLaCafeStructure(
  placement?: PheLaPlacementConfig
): PheLaCafeBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = 274.0;
  const maxX = 296.0;
  const midX = (minX + maxX) * 0.5; // 285.0 (22.0m wide)
  const frontZ = 47.2;
  const backZ = 65.2;
  const midZ = (frontZ + backZ) * 0.5; // 56.2 (18.0m deep)

  // Materials (earthy warm Đà Lạt cedar wood, sand-clay plaster, matte bronze, camping canvas)
  const shingleTex = createPheLaWoodShingleTex();
  const shingleMat = new THREE.MeshStandardMaterial({ map: shingleTex, roughness: 0.86, metalness: 0.02 });
  const darkTimberMat = new THREE.MeshStandardMaterial({ color: 0x291c15, roughness: 0.78, metalness: 0.06 });
  const warmWalnutMat = new THREE.MeshStandardMaterial({ color: 0x85583a, roughness: 0.68 });
  const naturalOakMat = new THREE.MeshStandardMaterial({ color: 0xba8050, roughness: 0.72 });
  const creamPlasterMat = new THREE.MeshStandardMaterial({ color: 0xf5ede0, roughness: 0.86 });
  const warmPlasterMat = new THREE.MeshStandardMaterial({ color: 0xeddcc4, roughness: 0.88 });
  const terraceStoneMat = new THREE.MeshStandardMaterial({ color: 0xb8aa98, roughness: 0.90 });
  const campingCanvasMat = new THREE.MeshStandardMaterial({ color: 0xdfd2bf, roughness: 0.88 });
  const caramelLeatherMat = new THREE.MeshStandardMaterial({ color: 0xaa6835, roughness: 0.65 });
  const aluminumMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.35 });
  const cupPastelMat = new THREE.MeshStandardMaterial({ color: 0xfde2e4, roughness: 0.45 });
  const cupLidMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.14,
    roughness: 0.48,
    metalness: 0.0,
  });

  const warmCoveLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.50,
    roughness: 0.45,
  });
  const archGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.5,
  });

  // =========================================================================
  // 1. TERRACE PATIO, INTERIOR FLOOR SLAB & STEP LIGHT RIM
  // =========================================================================
  // Covered veranda slab (Z = 42.5..47.2) + indoor hall floor (Z = 47.2..65.2)
  const patioSlab = new THREE.Mesh(new THREE.BoxGeometry(23.0, 0.14, 22.8), terraceStoneMat);
  patioSlab.position.set(midX, 0.01, 53.9);
  staticGroup.add(patioSlab);

  const indoorWarmFloor = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.04, 17.6), warmPlasterMat);
  indoorWarmFloor.position.set(midX, 0.09, midZ);
  staticGroup.add(indoorWarmFloor);

  // Warm veranda floor-wash LED curb strip along sidewalk border (Z = 42.65)
  const verandaStepLight = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.04, 0.10), warmCoveLedMat);
  verandaStepLight.position.set(midX, 0.09, 42.68);
  staticGroup.add(verandaStepLight);

  // Pebble gravel planter strip & lush landscaped side border next to Peri Pool (X = 272.1)
  const westVergeCurb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 22.2), darkTimberMat);
  westVergeCurb.position.set(273.3, 0.09, 54.0);
  staticGroup.add(westVergeCurb);

  // =========================================================================
  // 2. SIGNATURE TWO-TIER WOOD-SHINGLE MANSARD ROOF & SWOOPING CURVED EAVE
  //    (Tall, steep Đà Lạt shingle roof with normalized ExtrudeGeometry UV repeat)
  // =========================================================================
  const roofShingleTex = createPheLaWoodShingleTex();
  roofShingleTex.repeat.set(0.24, 0.24); // ExtrudeGeometry UVs are in world meters -> crisp shingle planks
  const roofShingleMat = new THREE.MeshStandardMaterial({ map: roofShingleTex, roughness: 0.86, metalness: 0.02 });

  const roofProfile = new THREE.Shape();
  // Cross section in local (z_2d, y_2d) where +X_shape = South (+Z) and +Y_shape = Up (+Y)
  roofProfile.moveTo(42.9, 3.65); // Front overhanging eave drip lip
  roofProfile.quadraticCurveTo(45.0, 4.15, 47.8, 7.15); // Tall, steep sweeping curved shingle slope!
  roofProfile.lineTo(65.2, 7.45); // Rear roof slope deck
  roofProfile.lineTo(65.2, 6.85);
  roofProfile.lineTo(48.1, 6.55);
  roofProfile.quadraticCurveTo(45.2, 3.85, 42.9, 3.46);
  roofProfile.closePath();

  const mainRoofGeo = new THREE.ExtrudeGeometry(roofProfile, { depth: 23.0, curveSegments: 16, bevelEnabled: false });
  // Rotate so extrusion depth runs West->East along X (from 273.5 to 296.5), and X_shape -> Z
  mainRoofGeo.rotateY(-Math.PI / 2);
  const mainRoof = new THREE.Mesh(mainRoofGeo, roofShingleMat);
  mainRoof.position.set(296.5, 0, 0);
  staticGroup.add(mainRoof);

  // Dark charcoal fascia trim along front roof eave (Z = 42.9, Y = 3.55)
  const frontEaveTrim = new THREE.Mesh(new THREE.BoxGeometry(23.1, 0.22, 0.16), darkTimberMat);
  frontEaveTrim.position.set(midX, 3.56, 42.9);
  staticGroup.add(frontEaveTrim);

  // Veranda soffit underside beam & warm recessed soffit cove light strip
  const verandaSoffit = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.10, 4.3), darkTimberMat);
  verandaSoffit.position.set(midX, 3.44, 45.15);
  staticGroup.add(verandaSoffit);
  const verandaSoffitLed = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.04, 0.14), warmCoveLedMat);
  verandaSoffitLed.position.set(midX, 3.38, 46.95);
  staticGroup.add(verandaSoffitLed);

  // Upper Recessed Clerestory Shingle Volume (Tall signature second tier: X = 274.2..289.2, Y = 7.1..10.75, Z = 50.2..64.6)
  const upperVolume = new THREE.Mesh(new THREE.BoxGeometry(15.0, 3.70, 14.4), shingleMat);
  upperVolume.position.set(281.7, 8.95, 57.4);
  staticGroup.add(upperVolume);
  const upperCap = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.20, 14.6), darkTimberMat);
  upperCap.position.set(281.7, 10.85, 57.4);
  staticGroup.add(upperCap);

  // =========================================================================
  // 3. ILLUMINATED BRAND SIGNAGE: "Phê-La" (Visual Left Eave) & "NỐT HƯƠNG ĐẶC SẢN" (Upper Right)
  // =========================================================================
  const mainLogoTex = createPheLaMainLogoTex();
  const mainLogoMat = new THREE.MeshStandardMaterial({
    map: mainLogoTex,
    emissive: 0xffe4b5,
    emissiveMap: mainLogoTex,
    emissiveIntensity: 0.05,
    transparent: true,
    alphaTest: 0.03,
    depthWrite: false,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  const mainLogoSign = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.0), mainLogoMat);
  mainLogoSign.userData.noMerge = true;
  // Mounted cleanly upright above the front roof eave (Visual Left when facing South) — zero clipping into shingles!
  mainLogoSign.position.set(292.3, 4.74, 43.22);
  mainLogoSign.rotation.y = Math.PI;
  mainLogoSign.rotation.x = -0.14;
  staticGroup.add(mainLogoSign);

  // Discrete dark bronze mounting posts anchoring sign down onto the eave
  [290.1, 294.5].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), darkTimberMat);
    post.position.set(px, 3.76, 43.24);
    staticGroup.add(post);
  });

  // Dark shadow reveal ledge running directly below the upper signage (matching Image 2)
  const upperShadowLedge = new THREE.Mesh(new THREE.BoxGeometry(15.05, 0.22, 0.16), darkTimberMat);
  upperShadowLedge.position.set(281.7, 7.26, 50.14);
  staticGroup.add(upperShadowLedge);

  const sloganTex = createPheLaSloganTex();
  const sloganMat = new THREE.MeshStandardMaterial({
    map: sloganTex,
    emissive: 0xffe4b5,
    emissiveMap: sloganTex,
    emissiveIntensity: 0.05,
    transparent: true,
    alphaTest: 0.03,
    depthWrite: false,
    roughness: 0.65,
  });
  const sloganSign = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 1.56), sloganMat);
  sloganSign.userData.noMerge = true;
  // Positioned in the lower-right of the upper cedar shake facade right above the shadow ledge (matching Image 2!)
  sloganSign.position.set(280.1, 8.15, 50.08);
  sloganSign.rotation.y = Math.PI;
  staticGroup.add(sloganSign);

  // =========================================================================
  // 4. EXTERIOR SHELL, PANORAMIC GLASS, VERANDA COLUMNS & TIMBER ENTRY PORTAL
  // =========================================================================
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(21.84, 7.1, 0.42), creamPlasterMat);
  backWall.position.set(midX, 3.55, backZ - 0.21);
  staticGroup.add(backWall);

  [minX + 0.21, maxX - 0.21].forEach((wx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 6.0, 18.0), warmPlasterMat);
    sideWall.position.set(wx, 3.0, midZ);
    staticGroup.add(sideWall);
    const sideRearUpper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.35, 16.4), warmPlasterMat);
    sideRearUpper.position.set(wx, 6.45, 57.0);
    staticGroup.add(sideRearUpper);
  });

  // 5 Slender Dark Timber/Steel Veranda Columns supporting roof overhang (Z = 43.55)
  [274.35, 279.65, 285.0, 290.45, 295.65].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.45, 0.24), darkTimberMat);
    col.position.set(cx, 1.78, 43.55);
    staticGroup.add(col);
  });

  // Front Storefront Glass Panes (leaving doorway opening clear at X = 278.4..280.6, Z = 47.2)
  const rightGlassWing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 0.08), glassMat);
  rightGlassWing.position.set(276.3, 1.78, frontZ);
  staticGroup.add(rightGlassWing);
  const centerGlassWall = new THREE.Mesh(new THREE.BoxGeometry(10.0, 3.4, 0.08), glassMat);
  centerGlassWall.position.set(285.6, 1.78, frontZ);
  staticGroup.add(centerGlassWall);

  // Vertical slim bronze glass mullions along front facade
  [276.4, 282.5, 285.2, 287.9, 290.6].forEach((mx) => {
    const mul = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.44, 0.12), darkTimberMat);
    mul.position.set(mx, 1.78, frontZ);
    staticGroup.add(mul);
  });

  // Bold Warm Walnut Entry Portal Frame (Visual Right-Center: X = 278.4..280.6, Z = 47.2) matching Image 2
  [278.32, 280.68].forEach((px) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.45, 0.65), warmWalnutMat);
    jamb.position.set(px, 1.78, frontZ);
    staticGroup.add(jamb);
  });
  const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(2.60, 0.55, 0.68), warmWalnutMat);
  portalHeader.position.set(279.5, 3.22, frontZ);
  staticGroup.add(portalHeader);

  // Glass Swinging Entry Door Leaf
  const doorPivot = new THREE.Group();
  doorPivot.userData.noMerge = true;
  doorPivot.position.set(278.48, 1.52, frontZ);
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.04, 2.86, 0.06), glassMat);
  doorLeaf.position.set(1.02, 0, 0);
  doorPivot.add(doorLeaf);
  const doorPull = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), warmWalnutMat);
  doorPull.position.set(1.88, 0, -0.06);
  doorPivot.add(doorPull);
  staticGroup.add(doorPivot);

  // =========================================================================
  // 5. VISUAL LEFT STREET-FACING TAKEAWAY & SIPHON BAR COUNTER (X = 290.6..295.7)
  // =========================================================================
  const counterIconsTex = createPheLaCounterIconsTex();
  const counterFrontMat = new THREE.MeshStandardMaterial({
    map: counterIconsTex,
    emissive: 0xfff8eb,
    emissiveMap: counterIconsTex,
    emissiveIntensity: 0.08,
    roughness: 0.72,
  });

  // Open-front takeaway counter base adorned with coffee & oolong craft icons
  const barFrontWall = new THREE.Mesh(new THREE.BoxGeometry(5.1, 1.12, 0.65), counterFrontMat);
  barFrontWall.position.set(293.15, 0.64, 46.65);
  barFrontWall.rotation.y = Math.PI;
  staticGroup.add(barFrontWall);
  const barCounterTop = new THREE.Mesh(new THREE.BoxGeometry(5.22, 0.08, 0.82), creamPlasterMat);
  barCounterTop.position.set(293.15, 1.24, 46.65);
  staticGroup.add(barCounterTop);

  // Takeaway bar luminous white header ceiling + warm interior backlight
  const barBoxCeil = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.14, 5.4), creamPlasterMat);
  barBoxCeil.position.set(293.15, 3.32, 49.3);
  staticGroup.add(barBoxCeil);
  const barBackWall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 0.24), warmPlasterMat);
  barBackWall.position.set(293.15, 1.75, 52.0);
  staticGroup.add(barBackWall);
  const barInnerSide = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 4.9), creamPlasterMat);
  barInnerSide.position.set(290.65, 1.75, 49.65);
  staticGroup.add(barInnerSide);

  // Illuminated Wooden Menu Board on Back Wall of Bar
  const menuTex = createPheLaMenuBoardTex();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xffffff,
    emissiveMap: menuTex,
    emissiveIntensity: 0.18,
    roughness: 0.65,
  });
  const menuSign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.45, 0.08), menuMat);
  menuSign.position.set(293.15, 2.38, 51.84);
  menuSign.rotation.y = Math.PI;
  staticGroup.add(menuSign);

  // Espresso Machine, Glass Syphon Brewer, & Oolong Tea Canisters on Bar Counter
  const espressoBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.56, 0.54), aluminumMat);
  espressoBody.position.set(294.6, 1.56, 46.75);
  staticGroup.add(espressoBody);
  const syphonStand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.44, 10), warmWalnutMat);
  syphonStand.position.set(292.6, 1.50, 46.65);
  staticGroup.add(syphonStand);
  const syphonBulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), glassMat);
  syphonBulb.position.set(292.6, 1.62, 46.65);
  staticGroup.add(syphonBulb);

  [291.6, 291.95, 292.3].forEach((jx) => {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.24, 10), naturalOakMat);
    jar.position.set(jx, 1.40, 46.65);
    staticGroup.add(jar);
  });

  // =========================================================================
  // 6. FRONT VERANDA CAMPING TERRACE (FOLDING CHAIRS & WOOD ROLL-TOP TABLES)
  // =========================================================================
  [281.8, 283.65, 285.5, 287.35, 289.2].forEach((cx) => {
    staticGroup.add(buildCampingChair(cx - 0.38, 0.08, 45.2, Math.PI, campingCanvasMat, naturalOakMat, aluminumMat));
    staticGroup.add(buildCampingTable(cx + 0.38, 0.08, 45.2, naturalOakMat, aluminumMat, cupPastelMat, cupLidMat));
  });
  // Planters flanking Veranda & Bar Corner matching Image 2
  staticGroup.add(buildTerracottaPlant(290.28, 0.08, 46.3, 1.02));
  staticGroup.add(buildTerracottaPlant(274.8, 0.08, 46.2, 1.0));
  staticGroup.add(buildTerracottaPlant(281.05, 0.08, 46.5, 0.90));

  // =========================================================================
  // 7. MAIN INTERIOR HALL: 3 BACKLIT CREAM PLASTER ARCHES, SCULPTURAL DRUM & LOUNGE
  // =========================================================================
  // Sculptural Curved Terracotta/Wood Drum Feature beside Entry Door (X = 281.5, Z = 49.4) matching Image 2
  const drumCore = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 3.25, 18), warmWalnutMat);
  drumCore.position.set(281.5, 1.72, 49.3);
  staticGroup.add(drumCore);
  const drumTopHalo = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.08, 18), warmCoveLedMat);
  drumTopHalo.position.set(281.5, 3.36, 49.3);
  staticGroup.add(drumTopHalo);

  // 3 Dramatic Backlit Cream Plaster Arch Alcoves along Z = 58.2 (X = 281.8, 286.6, 291.4)
  [281.8, 286.6, 291.4].forEach((ax) => {
    // Left & Right arch piers
    [-1.95, 1.95].forEach((ox) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.3, 0.65), creamPlasterMat);
      pier.position.set(ax + ox, 1.72, 58.2);
      staticGroup.add(pier);
    });
    // Rounded arch header + warm glowing inner halo ring
    const archHeader = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.95, 0.65), creamPlasterMat);
    archHeader.position.set(ax, 3.15, 58.2);
    staticGroup.add(archHeader);

    const archGlowBack = new THREE.Mesh(new THREE.BoxGeometry(3.35, 2.75, 0.14), archGlowMat);
    archGlowBack.position.set(ax, 1.55, 62.6);
    staticGroup.add(archGlowBack);

    // Built-in caramel banquette bench inside each arch alcove + table
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.44, 0.78), caramelLeatherMat);
    benchSeat.position.set(ax, 0.30, 61.6);
    staticGroup.add(benchSeat);
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 0.20), caramelLeatherMat);
    benchBack.position.set(ax, 0.65, 62.05);
    staticGroup.add(benchBack);

    staticGroup.add(buildCampingTable(ax, 0.09, 60.2, naturalOakMat, aluminumMat, cupPastelMat, cupLidMat));
    staticGroup.add(buildCampingChair(ax - 0.65, 0.09, 59.1, 0, campingCanvasMat, naturalOakMat, aluminumMat));
    staticGroup.add(buildCampingChair(ax + 0.65, 0.09, 59.1, 0, campingCanvasMat, naturalOakMat, aluminumMat));
  });

  // Center Indoor Camping Tables & Folding Chairs (X = 283.4..288.6, Z = 52.6)
  [284.2, 287.8].forEach((tx) => {
    staticGroup.add(buildCampingTable(tx, 0.09, 52.6, naturalOakMat, aluminumMat, cupPastelMat, cupLidMat));
    staticGroup.add(buildCampingChair(tx - 0.78, 0.09, 52.6, Math.PI * 0.5, campingCanvasMat, naturalOakMat, aluminumMat));
    staticGroup.add(buildCampingChair(tx + 0.78, 0.09, 52.6, -Math.PI * 0.5, campingCanvasMat, naturalOakMat, aluminumMat));
  });
  staticGroup.add(buildTerracottaPlant(282.8, 0.09, 55.8, 1.05));
  staticGroup.add(buildTerracottaPlant(289.2, 0.09, 55.8, 1.0));

  // Visual Right Cozy Sand-Wave Lounge with Glowing Mushroom Lamps (X = 274.3..277.6, Z = 50.0..63.8)
  const sandWaveTex = createPheLaSandWaveWallTex();
  const sandWaveMat = new THREE.MeshStandardMaterial({ map: sandWaveTex, roughness: 0.85 });
  const rightSandWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.6, 15.2), sandWaveMat);
  rightSandWall.position.set(274.45, 1.88, 56.6);
  staticGroup.add(rightSandWall);

  // Built-in caramel sofa bench + row of 3 warm mushroom table lamps (exact match to Image 2 right wing!)
  const loungeSofa = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.44, 11.4), caramelLeatherMat);
  loungeSofa.position.set(275.25, 0.30, 57.0);
  staticGroup.add(loungeSofa);
  const loungeBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 11.4), caramelLeatherMat);
  loungeBack.position.set(274.68, 0.68, 57.0);
  staticGroup.add(loungeBack);

  [52.6, 56.8, 61.0].forEach((lz) => {
    const sideTable = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.52, 12), naturalOakMat);
    sideTable.position.set(276.6, 0.34, lz);
    staticGroup.add(sideTable);

    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.32, 10), warmWalnutMat);
    lampStem.position.set(276.6, 0.76, lz);
    staticGroup.add(lampStem);

    const lampDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
      warmCoveLedMat
    );
    lampDome.position.set(276.6, 0.90, lz);
    staticGroup.add(lampDome);
  });

  // Warm Interior Linear Ceiling Light Strips illuminating the main cafe hall & bar
  [279.8, 285.5, 291.2].forEach((lx) => {
    const hallCeilingStrip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 13.0), warmCoveLedMat);
    hallCeilingStrip.position.set(lx, 6.25, 56.2);
    staticGroup.add(hallCeilingStrip);
  });
  [282.5, 287.5, 293.0].forEach((lx) => {
    const lowWashStrip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.20), warmCoveLedMat);
    lowWashStrip.position.set(lx, 3.24, 49.4);
    staticGroup.add(lowWashStrip);
  });

  // =========================================================================
  // 8. OPERATING HOURS ROLLING SHUTTER (07:00 - 23:00) & WARM CAFE LIGHTING
  // =========================================================================
  const shutterTex = createRollingShutterTexture({
    title: 'CÀ PHÊ PHÊ LA  •  NỐT HƯƠNG ĐẶC SẢN',
    hoursLabel: 'MỞ CỬA: 07:00 - 23:00',
    accentHex: '#78350f',
    slatDarkHex: '#291c15',
    slatLightHex: '#5c4033',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.65, metalness: 0.15 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'phe_la_main_door',
      axis: 'x',
      pos: frontZ - 0.18,
      spanCenter: 279.5,
      width: 2.30,
      baseY: 0.08,
      topY: 3.00,
      thickness: 0.10,
    },
    shutterMat,
    darkTimberMat
  );
  const barShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'phe_la_bar_window',
      axis: 'x',
      pos: 46.30,
      spanCenter: 293.15,
      width: 5.05,
      baseY: 1.28,
      topY: 3.30,
      thickness: 0.08,
    },
    shutterMat,
    darkTimberMat
  );

  const verandaLight = new THREE.PointLight(0xfde68a, 4.0, 28.0, 0.95);
  verandaLight.position.set(midX, 3.1, 44.5);
  scaledLights.push({ light: verandaLight, dayInt: 3.8, nightInt: 16.0, getScale: () => 1.0 - mainShutter.progress });

  const barLight = new THREE.PointLight(0xfef3c7, 5.2, 24.0, 0.95);
  barLight.position.set(293.15, 2.9, 48.2);
  scaledLights.push({ light: barLight, dayInt: 5.2, nightInt: 19.0, getScale: () => 1.0 - mainShutter.progress });

  const hallLight = new THREE.PointLight(0xfdba74, 4.5, 32.0, 0.95);
  hallLight.position.set(284.5, 3.6, 55.2);
  scaledLights.push({ light: hallLight, dayInt: 4.5, nightInt: 18.0, getScale: () => 1.0 - mainShutter.progress });

  const loungeLampLight = new THREE.PointLight(0xfbbf24, 3.4, 22.0, 0.95);
  loungeLampLight.position.set(276.2, 2.4, 56.8);
  scaledLights.push({ light: loungeLampLight, dayInt: 3.4, nightInt: 14.0, getScale: () => 1.0 - mainShutter.progress });

  const archLight = new THREE.PointLight(0xfde68a, 3.4, 22.0, 0.95);
  archLight.position.set(286.6, 3.2, 60.2);
  scaledLights.push({ light: archLight, dayInt: 3.4, nightInt: 14.5, getScale: () => 1.0 - mainShutter.progress });

  const poolTex = createPheLaGlowPoolTex();
  const porchPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(porchPoolMat);
  const porchPool = new THREE.Mesh(new THREE.PlaneGeometry(21.0, 8.5), porchPoolMat);
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(midX, 0.05, 43.8);
  staticGroup.add(porchPool);

  let doorOpenAmount = 0.85;
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    _playerPos?: THREE.Vector3,
    npcController?: PheLaNpcController | null
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isPheLaOpenAtHour(h);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (h < 7.0 || h >= 23.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, Math.max(0, mainShutter.progress - dt * 1.1));
      setShutterProgress(barShutter, Math.max(0, barShutter.progress - dt * 1.1));
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
      setShutterProgress(barShutter, 1.0);
    } else {
      closingElapsed += dt;
      const canClose = closingElapsed >= 15.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.7) {
        setShutterProgress(mainShutter, Math.min(1.0, mainShutter.progress + dt * 0.85));
        setShutterProgress(barShutter, Math.min(1.0, barShutter.progress + dt * 0.85));
      }
    }
    wasOpen = isOpen;

    // Keep glass door open during daytime/evening hours and close cleanly at night lockup
    const targetDoor = isOpen || Boolean(npcController?.hasNpcNearDoor()) ? 1.0 : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetDoor, Math.min(1, dt * 6.0));
    doorPivot.rotation.y = -doorOpenAmount * 1.38;

    const litScale = 1.0 - mainShutter.progress;
    mainLogoMat.emissiveIntensity = (0.16 + lampFactor * 0.45) * litScale;
    sloganMat.emissiveIntensity = (0.16 + lampFactor * 0.44) * litScale;
    menuMat.emissiveIntensity = (0.24 + lampFactor * 0.42) * litScale;
    counterFrontMat.emissiveIntensity = (0.14 + lampFactor * 0.30) * litScale;
    warmCoveLedMat.emissiveIntensity = (0.38 + lampFactor * 0.65) * litScale;
    archGlowMat.emissiveIntensity = (0.36 + lampFactor * 0.60) * litScale;
  };

  let finalStaticGroup = staticGroup;
  if (placement) {
    for (let i = 0; i < scaledLights.length; i++) {
      const lt = scaledLights[i].light;
      const wp = transformPheLaPointXZ(lt.position.x, lt.position.z, placement);
      lt.position.set(wp.x, lt.position.y, wp.z);
    }
    const outerGroup = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.position.set(placement.anchorX, 0, placement.anchorZ);
    pivot.rotation.y = placement.rotationY;
    staticGroup.position.set(-PHE_LA_ORIG_ANCHOR_X, 0, -PHE_LA_ORIG_ANCHOR_Z);
    pivot.add(staticGroup);
    outerGroup.add(pivot);
    finalStaticGroup = outerGroup;
  }

  return {
    staticGroup: finalStaticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => mainShutter.progress,
    update,
  };
}

// =========================================================================
// PHÊ LA NPC CONTROLLER (BARISTAS & DYNAMIC ROTATING CAFE CUSTOMERS)
// =========================================================================
interface PheLaSeatSlot {
  id: string;
  isIndoor: boolean;
  seatPos: THREE.Vector3;
  yaw: number;
  hipsY: number;
  toSeat: THREE.Vector3[];
  fromSeat: THREE.Vector3[];
  occupiedBy: number | null;
}

interface PheLaCustomerProfile {
  shirt: number;
  pants: number;
  hair: number;
  skinHex: string;
}

const PHE_LA_CUSTOMER_PROFILES: PheLaCustomerProfile[] = [
  { shirt: 0xd97706, pants: 0x1e293b, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0x0ea5e9, pants: 0x0f172a, hair: 0x271911, skinHex: '#fbe0c8' },
  { shirt: 0xe11d48, pants: 0x334155, hair: 0x1e1b4b, skinHex: '#e8b48e' },
  { shirt: 0x10b981, pants: 0x1e293b, hair: 0x3b2314, skinHex: '#fbe0c8' },
  { shirt: 0x8b5cf6, pants: 0x1e293b, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0xf43f5e, pants: 0x0f172a, hair: 0x4a2c18, skinHex: '#fbe0c8' },
  { shirt: 0x78716c, pants: 0x1c1917, hair: 0x1f2937, skinHex: '#d99b72' },
  { shirt: 0x0d9488, pants: 0x334155, hair: 0x291c15, skinHex: '#f5c7a3' },
  { shirt: 0xeab308, pants: 0x1e293b, hair: 0x111827, skinHex: '#fbe0c8' },
  { shirt: 0xec4899, pants: 0x0f172a, hair: 0x3f2316, skinHex: '#e8b48e' },
  { shirt: 0x3b82f6, pants: 0x475569, hair: 0x18181b, skinHex: '#fbe0c8' },
  { shirt: 0xb45309, pants: 0x1e293b, hair: 0x2c1a10, skinHex: '#f5c7a3' },
];

type CustomerPhase =
  | 'respawn_wait'
  | 'walk_to_bar'
  | 'order_at_bar'
  | 'walk_to_seat'
  | 'drinking_seated'
  | 'walk_leave';

interface PheLaActor {
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
  cupGroup: THREE.Group;
  kind: 'barista' | 'customer';
  homePos: THREE.Vector3;
  homeYaw: number;
  seed: number;
  walkPhase: number;
  speed: number;
  profileIdx: number;
  phase: CustomerPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  stateTimer: number;
  waitYaw: number;
  claimedSeatIdx: number | null;
  takeawayOnly: boolean;
  exiting: boolean;
  exitDone: boolean;
  exitWaypoints?: THREE.Vector3[];
  exitRef: { idx: number };
  walkPhaseRef: { phase: number };
  glbHandle?: GlbHumanHandle;
}

export class PheLaNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actorContainer: THREE.Group;
  private readonly seedOffset: number;
  private actors: PheLaActor[] = [];
  private seats: PheLaSeatSlot[] = [];
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

  constructor(private helpers: HospitalCharacterHelpers, placement?: PheLaPlacementConfig) {
    this.rootGroup.userData.noMerge = true;
    this.seedOffset = placement?.seedOffset ?? 0;
    if (placement) {
      const pivot = new THREE.Group();
      pivot.position.set(placement.anchorX, 0, placement.anchorZ);
      pivot.rotation.y = placement.rotationY;
      const inner = new THREE.Group();
      inner.position.set(-PHE_LA_ORIG_ANCHOR_X, 0, -PHE_LA_ORIG_ANCHOR_Z);
      pivot.add(inner);
      this.rootGroup.add(pivot);
      this.actorContainer = inner;
    } else {
      this.actorContainer = this.rootGroup;
    }

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.82 });
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xfde2e4, roughness: 0.45 });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const strawMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

    // Pre-build shared profile material pool so swapping appearances on respawn has zero allocation cost
    this.profileMats = PHE_LA_CUSTOMER_PROFILES.map((p) => ({
      shirt: new THREE.MeshStandardMaterial({ color: p.shirt, roughness: 0.72 }),
      pants: new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.78 }),
      hair: new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.85 }),
      faceTex: helpers.createFaceTexture('happy', p.skinHex),
    }));

    // Seat catalog aligned strictly with physical chairs & sofa cushions
    const verandaSeats: Array<{ id: string; x: number }> = [
      { id: 'veranda_1', x: 281.42 },
      { id: 'veranda_2', x: 283.27 },
      { id: 'veranda_3', x: 285.12 },
      { id: 'veranda_5', x: 288.82 },
    ];
    verandaSeats.forEach((vs) => {
      this.seats.push({
        id: vs.id,
        isIndoor: false,
        seatPos: new THREE.Vector3(vs.x, 0.08, 45.20),
        yaw: Math.PI, // Chair faces -Z (street) with side table safely beside the chair
        hipsY: 0.45,
        toSeat: [
          new THREE.Vector3(290.8, 0.06, 44.20),
          new THREE.Vector3(vs.x, 0.08, 44.20),
          new THREE.Vector3(vs.x, 0.08, 45.20),
        ],
        fromSeat: [
          new THREE.Vector3(vs.x, 0.08, 44.20),
          new THREE.Vector3(279.5, 0.06, 42.9),
        ],
        occupiedBy: null,
      });
    });

    // Cozy Lounge Sofa seats (Visual Right, facing +X into hall, top height 0.52)
    [54.7, 58.9].forEach((sz, idx) => {
      this.seats.push({
        id: `lounge_${idx}`,
        isIndoor: true,
        seatPos: new THREE.Vector3(275.35, 0.09, sz),
        yaw: Math.PI * 0.5,
        hipsY: 0.50,
        toSeat: [
          new THREE.Vector3(290.5, 0.06, 44.15),
          new THREE.Vector3(279.5, 0.08, 45.0),
          new THREE.Vector3(279.5, 0.09, 48.8),
          new THREE.Vector3(278.2, 0.09, sz),
          new THREE.Vector3(275.35, 0.09, sz),
        ],
        fromSeat: [
          new THREE.Vector3(278.2, 0.09, sz),
          new THREE.Vector3(279.5, 0.09, 48.8),
          new THREE.Vector3(279.5, 0.06, 42.9),
        ],
        occupiedBy: null,
      });
    });

    // Center Indoor Camping Chairs facing their respective tables cleanly
    this.seats.push({
      id: 'center_left',
      isIndoor: true,
      seatPos: new THREE.Vector3(283.42, 0.09, 52.6),
      yaw: Math.PI * 0.5,
      hipsY: 0.45,
      toSeat: [
        new THREE.Vector3(290.5, 0.06, 44.15),
        new THREE.Vector3(279.5, 0.08, 45.0),
        new THREE.Vector3(279.5, 0.09, 48.8),
        new THREE.Vector3(278.3, 0.09, 55.6),
        new THREE.Vector3(282.3, 0.09, 55.6),
        new THREE.Vector3(282.3, 0.09, 52.6),
        new THREE.Vector3(283.42, 0.09, 52.6),
      ],
      fromSeat: [
        new THREE.Vector3(282.3, 0.09, 52.6),
        new THREE.Vector3(282.3, 0.09, 55.6),
        new THREE.Vector3(278.3, 0.09, 55.6),
        new THREE.Vector3(279.5, 0.09, 48.8),
        new THREE.Vector3(279.5, 0.06, 42.9),
      ],
      occupiedBy: null,
    });

    this.seats.push({
      id: 'center_right',
      isIndoor: true,
      seatPos: new THREE.Vector3(288.58, 0.09, 52.6),
      yaw: -Math.PI * 0.5,
      hipsY: 0.45,
      toSeat: [
        new THREE.Vector3(290.5, 0.06, 44.15),
        new THREE.Vector3(279.5, 0.08, 45.0),
        new THREE.Vector3(279.5, 0.09, 48.8),
        new THREE.Vector3(278.3, 0.09, 55.6),
        new THREE.Vector3(289.8, 0.09, 55.6),
        new THREE.Vector3(289.8, 0.09, 52.6),
        new THREE.Vector3(288.58, 0.09, 52.6),
      ],
      fromSeat: [
        new THREE.Vector3(289.8, 0.09, 52.6),
        new THREE.Vector3(289.8, 0.09, 55.6),
        new THREE.Vector3(278.3, 0.09, 55.6),
        new THREE.Vector3(279.5, 0.09, 48.8),
        new THREE.Vector3(279.5, 0.06, 42.9),
      ],
      occupiedBy: null,
    });

    const createActorRig = (
      kind: 'barista' | 'customer',
      profileIdx: number,
      x: number,
      y: number,
      z: number,
      yaw: number,
      speed = 1.28
    ): PheLaActor => {
      const id = this.actors.length;
      const pm = this.profileMats[profileIdx % this.profileMats.length];
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.set(0, 0.80, 0);
      root.add(hipsGroup);

      const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.24), pm.shirt);
      torsoMesh.position.y = 0.28;
      hipsGroup.add(torsoMesh);

      if (kind === 'barista') {
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.46, 0.04), apronMat);
        apron.position.set(0, 0.20, 0.13);
        hipsGroup.add(apron);
      }

      const headMesh = helpers.createHeadMesh(this.skinMat, pm.faceTex, 0.27, 0.27, 0.27);
      headMesh.position.y = 0.72;
      hipsGroup.add(headMesh);

      const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.10, 0.29), pm.hair);
      hairMesh.position.y = 0.86;
      hipsGroup.add(hairMesh);

      const leftArm = new THREE.Group();
      leftArm.position.set(-0.27, 0.52, 0);
      const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), pm.shirt);
      leftArmMesh.position.y = -0.20;
      leftArm.add(leftArmMesh);
      hipsGroup.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.27, 0.52, 0);
      const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), pm.shirt);
      rightArmMesh.position.y = -0.20;
      rightArm.add(rightArmMesh);
      hipsGroup.add(rightArm);

      // Handheld Phê La Oolong cup attached to right hand (visible once served!)
      const cupGroup = new THREE.Group();
      cupGroup.position.set(0, -0.43, 0.06);
      const cBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.13, 8), cupMat);
      cupGroup.add(cBody);
      const cLid = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), lidMat);
      cLid.position.y = 0.065;
      cupGroup.add(cLid);
      const cStraw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 6), strawMat);
      cStraw.position.set(0.01, 0.105, 0);
      cupGroup.add(cStraw);
      cupGroup.visible = false;
      rightArm.add(cupGroup);

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

      const seed = id * 1.47;
      const modelSpec =
        kind === 'barista'
          ? id === 0
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(200 + id + this.seedOffset)
          : pickSeatedCivilianModel(210 + id + this.seedOffset);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: root,
        fallbackMeshes: [hipsGroup],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: seed * 0.6,
      });

      const actor: PheLaActor = {
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
        cupGroup,
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
        claimedSeatIdx: null,
        takeawayOnly: false,
        exiting: false,
        exitDone: false,
        exitWaypoints:
          kind === 'barista'
            ? [
                new THREE.Vector3(290.0, 0.09, 54.0),
                new THREE.Vector3(280.0, 0.09, 51.0),
                new THREE.Vector3(279.5, 0.08, 46.5),
                new THREE.Vector3(279.5, 0.02, 41.2),
                new THREE.Vector3(291.5 + id * 2.0, 0.02, 40.4),
              ]
            : undefined,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      };
      this.actors.push(actor);
      return actor;
    };

    // 1. Two Baristas behind the street-facing craft & siphon counter
    createActorRig('barista', 1, 292.1, 0.09, 48.1, Math.PI);
    createActorRig('barista', 6, 294.1, 0.09, 48.2, Math.PI);

    // 2. Seven rotating cafe customers (dine-in & takeaway)
    for (let i = 0; i < 7; i++) {
      createActorRig('customer', (i * 2) % this.profileMats.length, 270.0, 0.02, 40.5, 0, 1.24 + (i % 3) * 0.08);
    }
  }

  private applyCustomerProfile(a: PheLaActor, nextIdx: number) {
    a.profileIdx = nextIdx % this.profileMats.length;
    const pm = this.profileMats[a.profileIdx];
    a.torsoMesh.material = pm.shirt;
    a.leftArmMesh.material = pm.shirt;
    a.rightArmMesh.material = pm.shirt;
    a.leftLegMesh.material = pm.pants;
    a.rightLegMesh.material = pm.pants;
    a.hairMesh.material = pm.hair;
    // Update face decal material map cleanly if multi-material box
    if (Array.isArray(a.headMesh.material) && a.headMesh.material[4]) {
      const faceMat = a.headMesh.material[4] as THREE.MeshStandardMaterial;
      if (faceMat.map !== pm.faceTex) {
        faceMat.map = pm.faceTex;
        faceMat.needsUpdate = true;
      }
    }
  }

  private setStandingPose(a: PheLaActor) {
    a.hipsGroup.position.set(0, 0.80, 0);
    a.leftLeg.rotation.x = 0;
    a.rightLeg.rotation.x = 0;
  }

  private setSeatedPose(a: PheLaActor, hipsY: number) {
    a.hipsGroup.position.set(0, hipsY, -0.03);
    a.leftLeg.rotation.x = -Math.PI * 0.48;
    a.rightLeg.rotation.x = -Math.PI * 0.48;
  }

  private claimFreeSeat(actorId: number): number | null {
    const free: number[] = [];
    for (let i = 0; i < this.seats.length; i++) {
      if (this.seats[i].occupiedBy === null) free.push(i);
    }
    if (free.length === 0) return null;
    const pick = free[Math.floor(Math.random() * free.length)];
    this.seats[pick].occupiedBy = actorId;
    return pick;
  }

  private releaseSeat(a: PheLaActor) {
    if (a.claimedSeatIdx !== null && this.seats[a.claimedSeatIdx]) {
      if (this.seats[a.claimedSeatIdx].occupiedBy === a.id) {
        this.seats[a.claimedSeatIdx].occupiedBy = null;
      }
      a.claimedSeatIdx = null;
    }
  }

  private assignNewCustomerArrival(a: PheLaActor, rotateProfile: boolean) {
    this.releaseSeat(a);
    if (rotateProfile) {
      this.applyCustomerProfile(a, a.profileIdx + 3 + (a.id % 5));
    }
    this.setStandingPose(a);
    a.cupGroup.visible = false;

    const fromEast = this.nextSpawnSide++ % 2 === 0;
    const spawnX = fromEast ? 297.6 : 264.5;
    const spawnZ = 40.3 + (a.id % 3) * 0.45;
    a.root.position.set(spawnX, 0.02, spawnZ);
    a.root.visible = true;

    const barSlotX = 291.8 + (a.id % 3) * 1.15;
    a.pathQueue = [
      new THREE.Vector3(fromEast ? 294.2 : 289.2, 0.04, 41.2),
      new THREE.Vector3(barSlotX, 0.06, 43.1),
      new THREE.Vector3(barSlotX, 0.08, 45.55),
    ];
    a.pathIdx = 0;
    a.phase = 'walk_to_bar';
    a.glbHandle?.setAnimState('Walk');
    a.waitYaw = 0; // Face +Z toward the barista counter
  }

  private snapClosed() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (let i = 0; i < this.seats.length; i++) this.seats[i].occupiedBy = null;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.root.visible = false;
      a.exiting = false;
      a.exitDone = true;
      a.claimedSeatIdx = null;
      a.cupGroup.visible = false;
      this.setStandingPose(a);
    }
  }

  private reopen() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.seats.length; i++) this.seats[i].occupiedBy = null;

    let custIdx = 0;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = false;
      a.exitDone = false;
      a.exitRef.idx = 0;
      this.setStandingPose(a);

      if (a.kind === 'barista') {
        a.root.visible = true;
        a.root.position.copy(a.homePos);
        a.root.rotation.y = a.homeYaw;
        a.glbHandle?.setAnimState('Idle');
        continue;
      }

      // Pre-seed customers across staggered lifecycle stages so turnover begins within seconds
      a.claimedSeatIdx = null;
      if (custIdx < 3) {
        // Seated guests already sipping with staggered finish times (5s, 11s, 17s)
        const seatIdx = custIdx === 0 ? 0 : custIdx === 1 ? 2 : 4; // veranda_1, veranda_3, lounge_0
        const seat = this.seats[seatIdx];
        seat.occupiedBy = a.id;
        a.claimedSeatIdx = seatIdx;
        a.takeawayOnly = false;
        a.cupGroup.visible = true;
        a.root.visible = true;
        a.root.position.copy(seat.seatPos);
        a.root.rotation.y = seat.yaw;
        this.setSeatedPose(a, seat.hipsY);
        a.phase = 'drinking_seated';
        a.glbHandle?.setAnimState('Sit');
        a.stateTimer = 5.0 + custIdx * 6.0;
      } else if (custIdx === 3) {
        // Guest ordering right now at the street takeaway bar
        a.takeawayOnly = false;
        a.cupGroup.visible = false;
        a.root.visible = true;
        a.root.position.set(292.6, 0.08, 45.55);
        a.root.rotation.y = 0;
        a.phase = 'order_at_bar';
        a.glbHandle?.setAnimState('Idle');
        a.stateTimer = 2.6;
        a.waitYaw = 0;
      } else {
        // Incoming / arriving guests staggered on East Leg Boulevard
        a.root.visible = false;
        a.phase = 'respawn_wait';
        a.stateTimer = (custIdx - 4) * 2.4;
      }
      custIdx++;
    }
  }

  private beginClosing() {
    this.closingActive = true;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = true;
      a.exitRef.idx = 0;
      this.setStandingPose(a);
      a.glbHandle?.setAnimState('Walk');

      if (a.kind === 'barista') {
        a.exitDone = false;
        continue;
      }

      if (!a.root.visible || a.phase === 'respawn_wait' || a.root.position.z < 42.6) {
        this.releaseSeat(a);
        a.exitDone = true;
        a.root.visible = false;
        continue;
      }

      a.exitDone = false;
      const leaveX = i % 2 === 0 ? 264.0 : 297.6;
      if (a.claimedSeatIdx !== null) {
        const seat = this.seats[a.claimedSeatIdx];
        a.exitWaypoints = [
          ...seat.fromSeat.map((v) => v.clone()),
          new THREE.Vector3(leaveX, 0.02, 40.4),
        ];
        this.releaseSeat(a);
      } else {
        a.exitWaypoints = [
          new THREE.Vector3(a.root.position.x, 0.06, 43.0),
          new THREE.Vector3(leaveX, 0.02, 40.4),
        ];
      }
    }
  }

  public hasNpcNearDoor(): boolean {
    if (this.fullyClosedAndEmpty) return false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible) continue;
      const p = a.root.position;
      if (p.x >= 277.6 && p.x <= 281.4 && p.z >= 44.8 && p.z <= 49.8) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: PheLaActor, dt: number): boolean {
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
    // Hold right arm steady forward when carrying a Phê La cup
    a.rightArm.rotation.x = a.cupGroup.visible ? -0.58 : swing * 0.55;
    return false;
  }

  public update(delta: number, rawHour = 10.0) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isPheLaOpenAtHour(h);

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
          new THREE.Vector3(279.5, 0.08, 46.5),
          new THREE.Vector3(279.5, 0.02, 41.2),
          new THREE.Vector3(275.0 + i * 2.0, 0.02, 40.4),
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
        }
        continue;
      }

      if (a.kind === 'barista') {
        a.root.visible = true;
        const brew = Math.sin(this.timer * 3.4 + a.seed);
        a.rightArm.rotation.x = -0.62 + brew * 0.22;
        a.leftArm.rotation.x = -0.52 - brew * 0.16;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.5 + a.seed) * 0.20;
        continue;
      }

      // Customer dynamic lifecycle
      if (a.phase === 'respawn_wait') {
        a.root.visible = false;
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          this.assignNewCustomerArrival(a, true);
        }
        continue;
      }

      a.root.visible = true;

      if (a.phase === 'walk_to_bar') {
        if (this.stepPath(a, dt)) {
          a.phase = 'order_at_bar';
          a.glbHandle?.setAnimState('Idle');
          a.stateTimer = 3.2 + (a.id % 3) * 0.9;
        }
      } else if (a.phase === 'order_at_bar') {
        let diff = a.waitYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 8.0);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightArm.rotation.x = -0.35 + Math.sin(this.timer * 2.5 + a.seed) * 0.12;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.8 + a.seed) * 0.18;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          // Customer receives signature Phê La cup
          a.cupGroup.visible = true;
          const freeSeatIdx = a.id % 4 === 3 ? null : this.claimFreeSeat(a.id);
          if (freeSeatIdx !== null) {
            const seat = this.seats[freeSeatIdx];
            a.claimedSeatIdx = freeSeatIdx;
            a.takeawayOnly = false;
            a.pathQueue = [
              new THREE.Vector3(a.root.position.x, 0.06, 43.8),
              ...seat.toSeat.map((v) => v.clone()),
            ];
            a.pathIdx = 0;
            a.phase = 'walk_to_seat';
            a.glbHandle?.setAnimState('Walk');
          } else {
            // Takeaway guest walks out down the boulevard with their cup
            const leaveEast = a.id % 2 === 0;
            a.takeawayOnly = true;
            a.pathQueue = [
              new THREE.Vector3(a.root.position.x, 0.06, 43.1),
              new THREE.Vector3(leaveEast ? 294.2 : 289.2, 0.04, 41.2),
              new THREE.Vector3(leaveEast ? 297.8 : 264.0, 0.02, 40.5),
            ];
            a.pathIdx = 0;
            a.phase = 'walk_leave';
            a.glbHandle?.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'walk_to_seat') {
        if (this.stepPath(a, dt)) {
          const seat = a.claimedSeatIdx !== null ? this.seats[a.claimedSeatIdx] : null;
          if (seat) {
            a.root.position.copy(seat.seatPos);
            a.root.rotation.y = seat.yaw;
            this.setSeatedPose(a, seat.hipsY);
            a.phase = 'drinking_seated';
            a.glbHandle?.setAnimState('Sit');
            a.stateTimer = 14.0 + ((a.id * 3 + Math.floor(this.timer)) % 10);
          } else {
            a.phase = 'walk_leave';
            a.glbHandle?.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'drinking_seated') {
        const sip = Math.max(0, Math.sin(this.timer * 1.15 + a.seed));
        a.rightArm.rotation.x = -0.58 - sip * 0.50;
        a.leftArm.rotation.x = -0.35;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.05 + a.seed) * 0.22;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          // Finished drinking -> stand up, release seat, and walk home!
          this.setStandingPose(a);
          const seat = a.claimedSeatIdx !== null ? this.seats[a.claimedSeatIdx] : null;
          const leaveEast = (a.id + Math.floor(this.timer)) % 2 === 0;
          const streetOut = new THREE.Vector3(leaveEast ? 297.8 : 264.0, 0.02, 40.4);
          a.pathQueue = seat
            ? [...seat.fromSeat.map((v) => v.clone()), streetOut]
            : [new THREE.Vector3(a.root.position.x, 0.06, 43.0), streetOut];
          a.pathIdx = 0;
          this.releaseSeat(a);
          a.phase = 'walk_leave';
          a.glbHandle?.setAnimState('Walk');
        }
      } else if (a.phase === 'walk_leave') {
        if (this.stepPath(a, dt)) {
          // Despawn cleanly off-block and queue a brand-new customer replacement
          a.root.visible = false;
          a.cupGroup.visible = false;
          a.phase = 'respawn_wait';
          a.stateTimer = 1.6 + (a.id % 4) * 0.9;
        }
      }
    }

    if (this.closingActive && allCleared) {
      this.fullyClosedAndEmpty = true;
    }
  }
}
