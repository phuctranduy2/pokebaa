import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isPhucLongOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface PhucLongCafeBuildResult {
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
    npcController?: PhucLongNpcController | null,
    externalNpcNearDoor?: boolean
  ) => void;
}

// Positioned directly East of Vietcombank 24h ATM Booth (X = 265.0..274.2) along NE Boulevard
// Facing South (+Z) onto East Leg Boulevard NE Sidewalk (Z = 15.6..20.8)
// Plot Span: X = 277.8 .. 298.8 (21.0m wide), Z = -9.0 .. +15.6 (24.6m deep)
// Outdoor Umbrella Terrace Forecourt: Z = +10.4 .. +15.6
// Double-Height Gabled Glass Hall:    Z = -9.0 .. +10.4
export const PHUC_LONG_COLLIDERS: IntersectionColliderBox[] = [
  // Side property walls
  { minX: 277.5, maxX: 278.3, minZ: -9.2, maxZ: 10.6, floor: 1 }, // West Hall Wall
  { minX: 298.3, maxX: 299.1, minZ: -9.2, maxZ: 10.6, floor: 1 }, // East Hall Wall
  { minX: 277.6, maxX: 299.0, minZ: -9.2, maxZ: -8.3, floor: 1 }, // North Rear Wall

  // Front Forest-Green Portal Beam Posts (Z = 15.1)
  { minX: 277.65, maxX: 278.35, minZ: 14.75, maxZ: 15.45, floor: 1 }, // West Portal Column
  { minX: 298.25, maxX: 298.95, minZ: 14.75, maxZ: 15.45, floor: 1 }, // East Portal Column

  // Front Glass Curtain Wall (Main Door Opening Clear at X = 285.8 .. 288.4, Z = 10.4)
  { minX: 277.8, maxX: 285.8, minZ: 10.05, maxZ: 10.75, floor: 1 },
  { minX: 288.4, maxX: 298.8, minZ: 10.05, maxZ: 10.75, floor: 1 },

  // Outdoor Patio Built-in Planter Bench Islands, Stools & Umbrellas (leaves wide walkway center X=285.0..289.2)
  { minX: 279.1, maxX: 284.7, minZ: 12.1, maxZ: 14.55, floor: 1 }, // Patio West Umbrella + Planter Bench Set
  { minX: 289.5, maxX: 296.8, minZ: 12.1, maxZ: 14.55, floor: 1 }, // Patio East Umbrella + Planter Bench Set
  { minX: 297.4, maxX: 298.6, minZ: 10.6, maxZ: 14.6, floor: 1 }, // East Side Tropical Planter Bed

  // Indoor Barista Counter & Tea/Pastry Bar (X = 278.8 .. 283.6, Z = -2.4 .. +7.8)
  { minX: 278.8, maxX: 283.6, minZ: -2.4, maxZ: 7.8, floor: 1 },

  // Indoor Center & East Cafe Dining Tables & Rear Sofa Alcove
  { minX: 289.2, maxX: 296.6, minZ: -1.8, maxZ: 6.2, floor: 1 }, // Right Indoor Dining Tables
  { minX: 281.0, maxX: 296.8, minZ: -8.3, maxZ: -5.8, floor: 1 }, // Rear Lounge Banquette & Tables
];

// Stylized Phúc Long Tea Leaf & Steaming Bowl Icon (honoring classic crest + rebrand leaf mark)
function drawPhucLongTeaMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  colorHex: string
) {
  ctx.save();
  ctx.strokeStyle = colorHex;
  ctx.fillStyle = colorHex;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Stylized steaming bowl / woven tea basket silhouette with twin tea leaves above
  const r = size * 0.44;
  ctx.lineWidth = Math.max(3, size * 0.085);

  // Bowl cup base
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.14, r * 0.78, 0.05 * Math.PI, 0.95 * Math.PI);
  ctx.closePath();
  ctx.fill();

  // Rim highlight crescent
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.56, cy + r * 0.24);
  ctx.quadraticCurveTo(cx, cy + r * 0.40, cx + r * 0.56, cy + r * 0.24);
  ctx.stroke();

  // Rising twin tea leaves / aroma curls above cup
  ctx.strokeStyle = colorHex;
  ctx.fillStyle = colorHex;
  ctx.lineWidth = Math.max(2.5, size * 0.075);

  // Left upright woven tea leaf
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.06, cy - r * 0.02);
  ctx.bezierCurveTo(cx - r * 0.58, cy - r * 0.26, cx - r * 0.46, cy - r * 0.84, cx - r * 0.04, cy - r * 0.72);
  ctx.bezierCurveTo(cx + r * 0.14, cy - r * 0.44, cx + r * 0.06, cy - r * 0.16, cx - r * 0.06, cy - r * 0.02);
  ctx.fill();

  // Right sprouting tea leaf
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.10, cy - r * 0.04);
  ctx.bezierCurveTo(cx + r * 0.24, cy - r * 0.48, cx + r * 0.68, cy - r * 0.54, cx + r * 0.62, cy - r * 0.18);
  ctx.bezierCurveTo(cx + r * 0.52, cy + r * 0.02, cx + r * 0.24, cy + r * 0.02, cx + r * 0.10, cy - r * 0.04);
  ctx.fill();

  ctx.restore();
}

// Heritage Phúc Long Crest Plaque: Authentic Scalloped Shield + White Cup & Leaves on Green + "PHUC LONG" + "SINCE 1968"
function createPhucLongCrestLogoTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 560;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const green = '#006b3c';
  const deepGreen = '#00512d';
  const white = '#ffffff';

  const drawScallopedShield = (inset: number) => {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const rx = 435 - inset;
    const ry = 235 - inset;
    ctx.beginPath();
    // Smooth heritage scalloped badge silhouette matching flagship signage
    ctx.moveTo(cx - rx, cy - 52 + inset * 0.15);
    ctx.bezierCurveTo(cx - rx + 42, cy - ry + 26, cx - 190, cy - ry + 18, cx - 135, cy - ry + 10);
    ctx.quadraticCurveTo(cx, cy - ry - 38, cx + 135, cy - ry + 10);
    ctx.bezierCurveTo(cx + 190, cy - ry + 18, cx + rx - 42, cy - ry + 26, cx + rx, cy - 52 + inset * 0.15);
    ctx.quadraticCurveTo(cx + rx + 26 - inset * 0.35, cy, cx + rx, cy + 52 - inset * 0.15);
    ctx.bezierCurveTo(cx + rx - 42, cy + ry - 26, cx + 190, cy + ry - 18, cx + 135, cy + ry - 10);
    ctx.quadraticCurveTo(cx, cy + ry + 36, cx - 135, cy + ry - 10);
    ctx.bezierCurveTo(cx - 190, cy + ry - 18, cx - rx + 42, cy + ry - 26, cx - rx, cy + 52 - inset * 0.15);
    ctx.quadraticCurveTo(cx - rx - 26 + inset * 0.35, cy, cx - rx, cy - 52 + inset * 0.15);
    ctx.closePath();
  };

  // Outer white halo rim + deep green fill
  ctx.save();
  drawScallopedShield(0);
  ctx.fillStyle = white;
  ctx.fill();
  drawScallopedShield(12);
  ctx.fillStyle = green;
  ctx.fill();
  ctx.restore();

  // Inner thin cream heritage border line
  ctx.save();
  drawScallopedShield(24);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Top green arch holding pure white Tea Bowl & Leaf emblem (authentic look!)
  drawPhucLongTeaMark(ctx, w * 0.5, 134, 126, white);

  // Crisp center white banner holding bold "PHUC LONG"
  ctx.save();
  ctx.fillStyle = white;
  ctx.beginPath();
  ctx.roundRect(74, 214, w - 148, 132, 16);
  ctx.fill();

  ctx.fillStyle = deepGreen;
  ctx.font = '900 104px "Montserrat", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PHUC LONG', w * 0.5, 282);
  ctx.restore();

  // Lower green band with "SINCE 1968"
  ctx.save();
  ctx.fillStyle = white;
  ctx.font = '800 40px "Montserrat", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SINCE 1968', w * 0.5, 422);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Clean white dimensional channel-letter sign "PHUC LONG" for the right side of the green portal beam
function createPhucLongChannelLettersTex(): THREE.CanvasTexture {
  const w = 1440;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Crisp dark drop shadow to give channel-letter depth against the green fascia
  ctx.save();
  ctx.fillStyle = 'rgba(0, 38, 20, 0.55)';
  ctx.font = '900 144px "Montserrat", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PHUC LONG', w * 0.5 + 5, h * 0.52 + 7);
  ctx.restore();

  // Bright crisp white face
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 144px "Montserrat", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PHUC LONG', w * 0.5, h * 0.52);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPhucLongUmbrellaSkirtTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#006837';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#004e2a';
  ctx.fillRect(0, h - 18, w, 18);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PHUC LONG', w * 0.5, h * 0.44);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = 4;
  return tex;
}

function createPhucLongTileWallTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#dce2e6';
  ctx.fillRect(0, 0, w, h);

  const cols = 12;
  const rows = 12;
  const cw = w / cols;
  const rh = h / rows;
  const shades = ['#006b3c', '#0f7b4b', '#f8fafc', '#f1f5f9', '#e2e8f0', '#065f46'];

  let s = 17;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = shades[Math.floor(rnd() * shades.length)];
      ctx.fillRect(col * cw + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 2);
  tex.anisotropy = 4;
  return tex;
}

function createPhucLongPaverTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ddd6ca';
  ctx.fillRect(0, 0, w, h);

  const cols = 4;
  const rows = 4;
  const cw = w / cols;
  const rh = h / rows;
  const tiles = ['#e7e1d6', '#e2dbd0', '#eae4da', '#ded7cb'];

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = tiles[(r * 3 + col) % tiles.length];
      ctx.fillRect(col * cw + 3, r * rh + 3, cw - 6, rh - 6);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 10);
  tex.anisotropy = 4;
  return tex;
}

function createPhucLongDoorDecalTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Subtle frosted safety stripe + small Phúc Long leaf crest at eye height
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.fillRect(0, 224, w, 58);

  ctx.fillStyle = 'rgba(0, 107, 60, 0.85)';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PHÚC LONG', w * 0.5, 253);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPhucLongMenuBoardTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 480;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#073b23';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d1fae5';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  drawPhucLongTeaMark(ctx, 118, 86, 72, '#d1fae5');

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PHÚC LONG COFFEE & TEA', 175, 98);

  const items = [
    ['TRÀ SỮA PHÚC LONG', '55K'],
    ['TRÀ ĐÀO CAM SẢ', '55K'],
    ['HỒNG TRÀ SỮA ĐÁ', '50K'],
    ['Ô LONG SỮA TƯƠI', '58K'],
    ['LATTE CÀ PHÊ SỮA ĐÁ', '48K'],
    ['TRÀ VẢI LÀ', '55K'],
  ];
  ctx.font = '700 30px system-ui, sans-serif';
  items.forEach(([name, price], i) => {
    const col = i < 3 ? 0 : 1;
    const row = i % 3;
    const bx = col === 0 ? 70 : 535;
    const by = 185 + row * 82;
    ctx.fillStyle = '#ecfdf5';
    ctx.textAlign = 'left';
    ctx.fillText(name, bx, by);
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'right';
    ctx.fillText(price, bx + 415, by);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPhucLongBackWallSignTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  drawPhucLongTeaMark(ctx, 150, 128, 120, '#d1fae5');

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 72px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('PHÚC LONG', 240, 102);

  ctx.fillStyle = '#fde68a';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('COFFEE & TEA  •  SINCE 1968', 244, 168);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPhucLongStandeeTex(variant: 'promo' | 'parking'): THREE.CanvasTexture {
  const w = 320;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#006b3c';
  ctx.fillRect(0, 0, w, 134);

  drawPhucLongTeaMark(ctx, w * 0.5, 68, 72, '#ffffff');

  ctx.fillStyle = '#006b3c';
  ctx.textAlign = 'center';
  if (variant === 'parking') {
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.fillText('GIỮ XE', w * 0.5, 225);
    ctx.font = '700 28px system-ui, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('MIỄN PHÍ', w * 0.5, 285);
    ctx.fillText('MỞ CỬA 07:00 - 23:00', w * 0.5, 365);
  } else {
    ctx.font = '800 32px system-ui, sans-serif';
    ctx.fillText('TRÀ Ô LONG', w * 0.5, 210);
    ctx.fillText('ĐẶC SẢN MỚI', w * 0.5, 255);
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(w * 0.5, 365, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.fillText('NEW!', w * 0.5, 375);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPhucLongGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(220, 252, 231, 0.34)');
  grad.addColorStop(0.55, 'rgba(254, 240, 199, 0.14)');
  grad.addColorStop(1, 'rgba(254, 240, 199, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPhucLongUmbrella(
  x: number,
  y: number,
  z: number,
  poleMat: THREE.Material,
  canopyMat: THREE.Material,
  skirtMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  // Granite counterweight block
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.68), poleMat);
  base.position.y = 0.07;
  grp.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 2.55, 8), poleMat);
  pole.position.y = 1.34;
  grp.add(pole);

  // Main wide octagonal canopy (Phúc Long green)
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.78, 0.58, 8), canopyMat);
  canopy.position.y = 2.66;
  grp.add(canopy);

  // Finial cap + Top vented tier cap (2-tier market umbrella)
  const topCap = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.24, 8), canopyMat);
  topCap.position.y = 3.00;
  grp.add(topCap);

  // Valance skirt ring with branding
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.78, 0.16, 8, 1, true), skirtMat);
  skirt.position.y = 2.30;
  grp.add(skirt);

  return grp;
}

function buildPatioTableAndStools(
  x: number,
  y: number,
  z: number,
  woodMat: THREE.Material,
  metalMat: THREE.Material,
  cupMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  // Square oak tabletop matching Image 2 patio tables
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.045, 0.58), woodMat);
  top.position.y = 0.64;
  grp.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.62, 8), metalMat);
  leg.position.y = 0.32;
  grp.add(leg);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.36), metalMat);
  foot.position.y = 0.015;
  grp.add(foot);

  // Pair of wooden low stools flanking the patio table cleanly
  [-0.46, 0.46].forEach((sx) => {
    const stoolTop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.34), woodMat);
    stoolTop.position.set(sx, 0.40, 0);
    grp.add(stoolTop);
    [-0.12, 0.12].forEach((lx) => {
      [-0.12, 0.12].forEach((lz) => {
        const sLeg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.39, 0.035), woodMat);
        sLeg.position.set(sx + lx, 0.195, lz);
        grp.add(sLeg);
      });
    });
  });

  // Green & White Iced Tea Cup on table
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.14, 10), cupMat);
  cup.position.set(0.08, 0.73, 0.04);
  grp.add(cup);

  return grp;
}

function buildCafeChair(
  x: number,
  y: number,
  z: number,
  yaw: number,
  woodMat: THREE.Material,
  frameMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.44), woodMat);
  seat.position.set(0, 0.44, 0);
  grp.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.04), woodMat);
  back.position.set(0, 0.68, -0.20);
  back.rotation.x = -0.10;
  grp.add(back);

  [-0.19, 0.19].forEach((lx) => {
    [-0.18, 0.18].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.035), frameMat);
      leg.position.set(lx, 0.22, lz);
      grp.add(leg);
    });
  });

  return grp;
}

function buildTropicalPlantBox(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  beigeMat: THREE.Material,
  cocoaMat: THREE.Material,
  isVerticalBed = false
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  // Two-tone modular planter + bench block matching Image 2
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.46, d), beigeMat);
  base.position.y = 0.23;
  grp.add(base);

  const planterW = isVerticalBed ? w * 0.85 : w * 0.78;
  const planterD = isVerticalBed ? d * 0.88 : d * 0.56;
  const planterZ = isVerticalBed ? 0 : -d * 0.16;

  const planterRim = new THREE.Mesh(new THREE.BoxGeometry(planterW, 0.36, planterD), cocoaMat);
  planterRim.position.set(0, 0.62, planterZ);
  grp.add(planterRim);

  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.74 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.70, side: THREE.DoubleSide });

  const spanAxis = isVerticalBed ? d : w;
  const foliageCount = Math.max(4, Math.floor(spanAxis * 2.4));
  for (let i = 0; i < foliageCount; i++) {
    const t = i / Math.max(1, foliageCount - 1) - 0.5;
    const px = isVerticalBed ? (i % 2 === 0 ? -0.14 : 0.14) : t * w * 0.68;
    const pz = isVerticalBed ? t * d * 0.78 : planterZ;

    // Low fuller shrub cluster
    const bush = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.28 + (i % 2) * 0.07, 0),
      i % 2 === 0 ? leafMat1 : leafMat2
    );
    bush.position.set(px, 0.90 + (i % 3) * 0.08, pz);
    bush.scale.set(1.15, 0.78, 0.95);
    grp.add(bush);

    // Upright tropical banana / bird-of-paradise palm fronds rising cleanly
    if (i % 2 === 0) {
      for (let f = -1; f <= 1; f += 2) {
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.95), palmLeafMat);
        frond.position.set(px + f * 0.08, 1.28, pz + f * 0.04);
        frond.rotation.z = f * 0.36;
        frond.rotation.x = 0.25 * (i % 3 - 1);
        frond.rotation.y = i * 0.9;
        grp.add(frond);
      }
    }
  }

  return grp;
}

export function createPhucLongCafeStructure(): PhucLongCafeBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = 277.8;
  const maxX = 298.8;
  const midX = (minX + maxX) * 0.5; // 288.3 (21.0m wide)
  const frontGlassZ = 10.4;
  const portalZ = 15.1;
  const backZ = -9.0;
  const midHallZ = (frontGlassZ + backZ) * 0.5; // 0.7

  // Phúc Long Signature Materials
  const phucLongGreenMat = new THREE.MeshStandardMaterial({ color: 0x058049, roughness: 0.45, metalness: 0.08 });
  const deepForestMat = new THREE.MeshStandardMaterial({ color: 0x085734, roughness: 0.55 });
  const umbrellaGreenMat = new THREE.MeshStandardMaterial({
    color: 0x057a44,
    roughness: 0.74,
    side: THREE.DoubleSide,
  });
  const umbrellaSkirtMat = new THREE.MeshStandardMaterial({
    map: createPhucLongUmbrellaSkirtTex(),
    roughness: 0.76,
    side: THREE.DoubleSide,
  });
  const creamPlasterMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: 0.85 });
  const warmCeilingMat = new THREE.MeshStandardMaterial({ color: 0xf5efe6, roughness: 0.88 });
  const beigeTrimMat = new THREE.MeshStandardMaterial({ color: 0xe8d9c5, roughness: 0.78 });
  const cocoaPlanterMat = new THREE.MeshStandardMaterial({ color: 0x9b7258, roughness: 0.76 });
  const naturalOakMat = new THREE.MeshStandardMaterial({ color: 0xc8925e, roughness: 0.68 });
  const charcoalSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.46, metalness: 0.38 });
  const brushedAlumMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.32, metalness: 0.68 });
  const patioTileMat = new THREE.MeshStandardMaterial({ map: createPhucLongPaverTex(), roughness: 0.84 });
  const awningBeigeMat = new THREE.MeshStandardMaterial({ color: 0xe3cbb0, roughness: 0.82, side: THREE.DoubleSide });
  const cupWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const tileWallMat = new THREE.MeshStandardMaterial({
    map: createPhucLongTileWallTex(),
    roughness: 0.42,
    metalness: 0.06,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x3b6e80,
    transparent: true,
    opacity: 0.15,
    roughness: 0.36,
    metalness: 0.06,
  });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.48,
    roughness: 0.4,
  });
  const sensorLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });

  // =========================================================================
  // 1. FORECOURT & INDOOR TRAVERTINE FLOOR SLAB
  // =========================================================================
  const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(21.2, 0.14, 24.8), patioTileMat);
  floorSlab.position.set(midX, 0.01, 3.3);
  staticGroup.add(floorSlab);

  const entranceCurb = new THREE.Mesh(new THREE.BoxGeometry(21.2, 0.05, 0.16), phucLongGreenMat);
  entranceCurb.position.set(midX, 0.08, 15.52);
  staticGroup.add(entranceCurb);

  // =========================================================================
  // 2. ICONIC FOREST-GREEN PORTAL BEAM, CREST EMBLEM & CHANNEL LETTERS (Z = 15.1)
  // =========================================================================
  [minX + 0.22, maxX - 0.22].forEach((px) => {
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.52), charcoalSteelMat);
    colBase.position.set(px, 0.12, portalZ);
    staticGroup.add(colBase);

    const col = new THREE.Mesh(new THREE.BoxGeometry(0.44, 4.14, 0.44), phucLongGreenMat);
    col.position.set(px, 2.29, portalZ);
    staticGroup.add(col);
  });

  // Main horizontal green fascia beam + clean overhanging cornice cap
  const portalBeam = new THREE.Mesh(new THREE.BoxGeometry(21.1, 0.80, 0.48), phucLongGreenMat);
  portalBeam.position.set(midX, 3.96, portalZ);
  staticGroup.add(portalBeam);

  const portalCap = new THREE.Mesh(new THREE.BoxGeometry(21.35, 0.09, 0.52), deepForestMat);
  portalCap.position.set(midX, 4.40, portalZ);
  staticGroup.add(portalCap);

  // Subtle recessed portal soffit spotlights
  [280.4, 284.2, 287.1, 290.5, 294.2, 297.2].forEach((sx) => {
    const downlight = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.03, 10), warmGlowMat);
    downlight.position.set(sx, 3.55, portalZ);
    staticGroup.add(downlight);
  });

  // Left Heritage Crest Shield ("PHUC LONG SINCE 1968" + Tea Emblem)
  const crestTex = createPhucLongCrestLogoTex();
  const crestMat = new THREE.MeshStandardMaterial({
    map: crestTex,
    emissive: 0xecfdf5,
    emissiveMap: crestTex,
    emissiveIntensity: 0.05,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.55,
  });
  const crestSign = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.18), crestMat);
  crestSign.userData.noMerge = true;
  crestSign.position.set(282.6, 3.98, portalZ + 0.30);
  staticGroup.add(crestSign);

  // Right White Channel Lettering ("PHUC LONG") across the green portal beam
  const channelTex = createPhucLongChannelLettersTex();
  const channelMat = new THREE.MeshStandardMaterial({
    map: channelTex,
    emissive: 0xffffff,
    emissiveMap: channelTex,
    emissiveIntensity: 0.05,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.50,
  });
  const channelSign = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 1.24), channelMat);
  channelSign.userData.noMerge = true;
  channelSign.position.set(292.1, 3.96, portalZ + 0.30);
  staticGroup.add(channelSign);

  // Projecting Round Side Blade Sign on East Pier (visible upper-right in Image 2)
  const bladeBracket = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.10, 0.10), charcoalSteelMat);
  bladeBracket.position.set(maxX + 0.35, 4.75, portalZ);
  staticGroup.add(bladeBracket);
  const bladeRim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.11, 24), creamPlasterMat);
  bladeRim.rotation.x = Math.PI / 2;
  bladeRim.position.set(maxX + 0.74, 4.75, portalZ);
  staticGroup.add(bladeRim);
  const bladeDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.15, 24), phucLongGreenMat);
  bladeDisc.rotation.x = Math.PI / 2;
  bladeDisc.position.set(maxX + 0.74, 4.75, portalZ);
  staticGroup.add(bladeDisc);
  [-0.085, 0.085].forEach((bz) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.62), crestMat);
    face.userData.noMerge = true;
    face.position.set(maxX + 0.74, 4.75, portalZ + bz);
    if (bz < 0) face.rotation.y = Math.PI;
    staticGroup.add(face);
  });

  // =========================================================================
  // 3. DOUBLE-HEIGHT PITCHED GABLE ATRIUM, EXPOSED ROOF TRUSSES & AUTOMATIC SLIDING DOORS
  // =========================================================================
  [minX + 0.20, maxX - 0.20].forEach((wx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.40, 5.65, 19.6), creamPlasterMat);
    sideWall.position.set(wx, 2.82, midHallZ);
    staticGroup.add(sideWall);
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(21.0, 5.65, 0.42), creamPlasterMat);
  backWall.position.set(midX, 2.82, backZ + 0.21);
  staticGroup.add(backWall);

  // Gable Roof Slopes (West & East pitches meeting at ridge X = 288.3, Y = 8.45)
  const halfSpan = 10.6;
  const rise = 2.80; // 5.65 -> 8.45
  const slopeAngle = Math.atan2(rise, halfSpan);
  const slopeLen = Math.hypot(halfSpan, rise) + 0.45;

  const westSlope = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.26, 20.6), beigeTrimMat);
  westSlope.position.set(midX - halfSpan * 0.5, 5.65 + rise * 0.5, midHallZ + 0.2);
  westSlope.rotation.z = slopeAngle;
  staticGroup.add(westSlope);

  const eastSlope = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.26, 20.6), beigeTrimMat);
  eastSlope.position.set(midX + halfSpan * 0.5, 5.65 + rise * 0.5, midHallZ + 0.2);
  eastSlope.rotation.z = -slopeAngle;
  staticGroup.add(eastSlope);

  // Clean Crisp Cream Gable Fascia Trim & Architectural Ridge Cap
  const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 20.7), creamPlasterMat);
  ridgeCap.position.set(midX, 8.60, midHallZ + 0.2);
  staticGroup.add(ridgeCap);

  // Warm Interior Ceiling Panels & Exposed Oak Gable Trusses (adds depth inside the glass atrium!)
  const westCeiling = new THREE.Mesh(new THREE.BoxGeometry(slopeLen - 0.5, 0.08, 19.6), warmCeilingMat);
  westCeiling.position.set(midX - halfSpan * 0.5, 5.52 + rise * 0.5, midHallZ);
  westCeiling.rotation.z = slopeAngle;
  staticGroup.add(westCeiling);

  const eastCeiling = new THREE.Mesh(new THREE.BoxGeometry(slopeLen - 0.5, 0.08, 19.6), warmCeilingMat);
  eastCeiling.position.set(midX + halfSpan * 0.5, 5.52 + rise * 0.5, midHallZ);
  eastCeiling.rotation.z = -slopeAngle;
  staticGroup.add(eastCeiling);

  [-5.2, 0.4, 5.8].forEach((tz) => {
    const tieBeam = new THREE.Mesh(new THREE.BoxGeometry(20.2, 0.18, 0.18), naturalOakMat);
    tieBeam.position.set(midX, 5.58, tz);
    staticGroup.add(tieBeam);

    const kingPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.75, 0.16), naturalOakMat);
    kingPost.position.set(midX, 6.95, tz);
    staticGroup.add(kingPost);
  });

  // Rear Gable Triangle Filler
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-halfSpan, 5.65);
  gableShape.lineTo(0, 8.45);
  gableShape.lineTo(halfSpan, 5.65);
  gableShape.closePath();

  const rearGableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.4, bevelEnabled: false });
  const rearGable = new THREE.Mesh(rearGableGeo, creamPlasterMat);
  rearGable.position.set(midX, 0, backZ);
  staticGroup.add(rearGable);

  // Front Gable Glass Peak (Tinted glass triangle filling Y = 5.65..8.45 at Z = 10.4!)
  const frontGableGlassGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.08, bevelEnabled: false });
  const frontGableGlass = new THREE.Mesh(frontGableGlassGeo, glassMat);
  frontGableGlass.position.set(midX, 0, frontGlassZ - 0.04);
  staticGroup.add(frontGableGlass);

  // Front Curtain Glass Panes (leaving central entry open X = 285.8 .. 288.4)
  const leftGlassWing = new THREE.Mesh(new THREE.BoxGeometry(7.8, 5.55, 0.08), glassMat);
  leftGlassWing.position.set(281.9, 2.86, frontGlassZ);
  staticGroup.add(leftGlassWing);
  const rightGlassWing = new THREE.Mesh(new THREE.BoxGeometry(10.0, 5.55, 0.08), glassMat);
  rightGlassWing.position.set(293.4, 2.86, frontGlassZ);
  staticGroup.add(rightGlassWing);
  const doorTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.60, 0.08), glassMat);
  doorTransomGlass.position.set(287.1, 4.35, frontGlassZ);
  staticGroup.add(doorTransomGlass);

  // Horizontal Architectural Curtain-Wall Transom Rails (breaks up glass into crisp bays matching Image 2)
  [3.15, 5.65].forEach((ty) => {
    const hTransom = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.09, 0.14), charcoalSteelMat);
    hTransom.position.set(midX, ty, frontGlassZ);
    staticGroup.add(hTransom);
  });

  // Signature Vertical Glass Mullions & 3 Warm Oak Pilasters rising straight up into the gable!
  // Mullions across the central doorway aperture (X = 285.65..288.55) start cleanly above the door transom (Y = 3.15)
  for (let mx = 279.2; mx <= 297.6; mx += 1.65) {
    const gableH = 8.45 - Math.abs(mx - midX) * (rise / halfSpan);
    const isOakPilaster = Math.abs(mx - 284.15) < 0.3 || Math.abs(mx - 289.1) < 0.3 || Math.abs(mx - 294.05) < 0.3;
    const inDoorSpan = mx >= 285.65 && mx <= 288.55;
    const startY = inDoorSpan ? 3.15 : 0.08;
    const barH = Math.max(0.2, gableH - startY - 0.05);
    const mul = new THREE.Mesh(
      new THREE.BoxGeometry(isOakPilaster ? 0.18 : 0.07, barH, isOakPilaster ? 0.22 : 0.12),
      isOakPilaster ? naturalOakMat : charcoalSteelMat
    );
    mul.position.set(mx, startY + barH * 0.5, frontGlassZ);
    staticGroup.add(mul);
  }

  // =========================================================================
  // BI-PARTING AUTOMATIC SLIDING GLASS DOORS (X = 285.8 .. 288.4, Z = 10.4)
  // =========================================================================
  [285.75, 288.45].forEach((dx) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.12, 0.16), charcoalSteelMat);
    jamb.position.set(dx, 1.56, frontGlassZ);
    staticGroup.add(jamb);
  });

  // Automatic Sliding Door Architectural Header Box (flush between jambs) + Interior Pocket Track + Sensor Pod
  const autoHeaderBox = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.22, 0.26), charcoalSteelMat);
  autoHeaderBox.position.set(287.1, 3.01, frontGlassZ - 0.02);
  staticGroup.add(autoHeaderBox);

  const pocketRail = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.07, 0.10), brushedAlumMat);
  pocketRail.position.set(287.1, 2.94, frontGlassZ - 0.14);
  staticGroup.add(pocketRail);

  [frontGlassZ + 0.14, frontGlassZ - 0.18].forEach((sz) => {
    const sensorPod = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), charcoalSteelMat);
    sensorPod.position.set(287.1, 3.02, sz);
    staticGroup.add(sensorPod);
    const sensorLed = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.02), sensorLedMat);
    sensorLed.position.set(287.1, 3.01, sz + (sz > frontGlassZ ? 0.042 : -0.042));
    staticGroup.add(sensorLed);
  });

  // Floor recessed stainless guide threshold rail
  const doorThresholdRail = new THREE.Mesh(new THREE.BoxGeometry(2.70, 0.02, 0.18), brushedAlumMat);
  doorThresholdRail.position.set(287.1, 0.09, frontGlassZ - 0.06);
  staticGroup.add(doorThresholdRail);

  const decalTex = createPhucLongDoorDecalTex();
  const decalMat = new THREE.MeshStandardMaterial({
    map: decalTex,
    transparent: true,
    depthWrite: false,
    roughness: 0.4,
  });

  const buildSlidingLeaf = (isRightLeaf: boolean) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(1.26, 2.74, 0.045), glassMat);
    grp.add(glassPane);

    // Sleek brushed-aluminum stiles & top/bottom rails
    [-0.63, 0.63].forEach((sx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.82, 0.075), brushedAlumMat);
      stile.position.set(sx, 0, 0);
      grp.add(stile);
    });
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.31, 0.08, 0.075), brushedAlumMat);
    topRail.position.set(0, 1.38, 0);
    grp.add(topRail);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(1.31, 0.10, 0.075), brushedAlumMat);
    botRail.position.set(0, -1.36, 0);
    grp.add(botRail);

    // Subtle horizontal frosted safety decal with "PHÚC LONG"
    [0.03, -0.03].forEach((dz) => {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 2.50), decalMat);
      decal.position.set(0, 0, dz);
      if (dz < 0) decal.rotation.y = Math.PI;
      grp.add(decal);
    });

    // Vertical stainless push/pull handle near center meeting edge
    const hx = isRightLeaf ? -0.46 : 0.46;
    [-0.055, 0.055].forEach((hz) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), brushedAlumMat);
      handle.position.set(hx, -0.05, hz);
      grp.add(handle);
    });

    staticGroup.add(grp);
    return grp;
  };

  const leftSlideStartX = 286.44;
  const rightSlideStartX = 287.76;
  const doorLeftLeaf = buildSlidingLeaf(false);
  doorLeftLeaf.position.set(leftSlideStartX, 1.50, frontGlassZ - 0.14);
  const doorRightLeaf = buildSlidingLeaf(true);
  doorRightLeaf.position.set(rightSlideStartX, 1.50, frontGlassZ - 0.14);

  // Left Sand-Beige Sloped Canvas Sun Awning matching Image 2 upper-left patio
  const leftAwning = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.10, 2.3), awningBeigeMat);
  leftAwning.position.set(281.0, 3.25, 11.45);
  leftAwning.rotation.x = 0.42;
  staticGroup.add(leftAwning);

  // =========================================================================
  // 4. OUTDOOR PATIO UMBRELLA GARDEN, TROPICAL PLANTERS, TABLES & BOLLARDS (Z = 10.6..15.2)
  // =========================================================================
  [
    [280.2, 12.8],
    [283.8, 13.0],
    [291.2, 13.0],
    [295.4, 12.8],
  ].forEach(([ux, uz]) => {
    staticGroup.add(buildPhucLongUmbrella(ux, 0.08, uz, charcoalSteelMat, umbrellaGreenMat, umbrellaSkirtMat));
  });

  // Two Built-in Beige/Cocoa Planter Bench Islands matching Image 2
  staticGroup.add(buildTropicalPlantBox(281.9, 0.08, 12.9, 5.2, 1.25, beigeTrimMat, cocoaPlanterMat));
  staticGroup.add(buildTropicalPlantBox(293.0, 0.08, 12.9, 6.2, 1.25, beigeTrimMat, cocoaPlanterMat));
  // East Side Lush Green Planter Bed
  staticGroup.add(buildTropicalPlantBox(298.0, 0.08, 12.6, 1.1, 3.6, phucLongGreenMat, cocoaPlanterMat, true));

  // Patio Tables & Paired Wooden Stools in front of the Planter Benches
  [280.6, 283.2, 291.4, 294.6].forEach((tx) => {
    staticGroup.add(buildPatioTableAndStools(tx, 0.08, 14.02, naturalOakMat, charcoalSteelMat, cupWhiteMat));
  });

  // Warm Timber Path Bollard Lights along Forecourt Edge (Z = 14.72)
  [280.0, 284.4, 289.8, 294.8].forEach((bx) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), cocoaPlanterMat);
    post.position.set(bx, 0.40, 14.72);
    staticGroup.add(post);
    const capLed = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.13), warmGlowMat);
    capLed.position.set(bx, 0.76, 14.72);
    staticGroup.add(capLed);
  });

  // A-Frame Standee Boards flanking Patio Walkways
  const addStandee = (sx: number, sz: number, variant: 'promo' | 'parking') => {
    const frame = new THREE.Group();
    frame.position.set(sx, 0.08, sz);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 1.10, 0.05),
      new THREE.MeshStandardMaterial({ map: createPhucLongStandeeTex(variant), roughness: 0.6 })
    );
    board.position.y = 0.62;
    board.rotation.x = -0.10;
    frame.add(board);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.70, 1.18, 0.03), charcoalSteelMat);
    legs.position.set(0, 0.59, -0.14);
    legs.rotation.x = 0.12;
    frame.add(legs);
    staticGroup.add(frame);
  };
  addStandee(278.9, 14.65, 'promo');
  addStandee(297.2, 14.65, 'parking');

  // =========================================================================
  // 5. DETAILED INTERIOR: TEA & COFFEE BAR COUNTER, BACK-BAR SHELVING & LOUNGE SEATING
  // =========================================================================
  const barFront = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.12, 9.4), tileWallMat);
  barFront.position.set(283.1, 0.64, 2.8);
  staticGroup.add(barFront);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 9.6), creamPlasterMat);
  barTop.position.set(283.1, 1.24, 2.8);
  staticGroup.add(barTop);
  const barReturn = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.12, 0.55), tileWallMat);
  barReturn.position.set(281.0, 0.64, 7.25);
  staticGroup.add(barReturn);
  const barReturnTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.80), creamPlasterMat);
  barReturnTop.position.set(281.0, 1.24, 7.25);
  staticGroup.add(barReturnTop);

  // Espresso Machine, Stainless Tea Brewing Urns & Chilled Pastry Display on Counter
  const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.54, 0.92), charcoalSteelMat);
  espresso.position.set(283.05, 1.54, 0.6);
  staticGroup.add(espresso);
  [2.2, 2.7, 3.2].forEach((tz) => {
    const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.44, 10), brushedAlumMat);
    urn.position.set(283.08, 1.50, tz);
    staticGroup.add(urn);
  });
  const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.58, 1.8), glassMat);
  pastryCase.position.set(283.05, 1.56, 5.4);
  staticGroup.add(pastryCase);

  // Illuminated Green Menu Board on West Wall above Counter
  const menuTex = createPhucLongMenuBoardTex();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xd1fae5,
    emissiveMap: menuTex,
    emissiveIntensity: 0.16,
    roughness: 0.55,
  });
  const menuBoard = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.2), menuMat);
  menuBoard.position.set(278.32, 3.15, 2.8);
  menuBoard.rotation.y = Math.PI / 2;
  staticGroup.add(menuBoard);

  // Right Ceramic Tile Feature Wall & Indoor Dining Tables/Chairs
  const rightTilePanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.6, 17.5), tileWallMat);
  rightTilePanel.position.set(298.28, 1.9, 0.6);
  staticGroup.add(rightTilePanel);

  [
    [291.6, 3.8],
    [294.8, 3.8],
    [291.6, -0.2],
    [294.8, -0.2],
  ].forEach(([tx, tz]) => {
    staticGroup.add(buildPatioTableAndStools(tx, 0.09, tz, naturalOakMat, charcoalSteelMat, cupWhiteMat));
    staticGroup.add(buildCafeChair(tx, 0.09, tz - 0.68, 0, naturalOakMat, charcoalSteelMat));
    staticGroup.add(buildCafeChair(tx, 0.09, tz + 0.68, Math.PI, naturalOakMat, charcoalSteelMat));
  });

  // North Rear Heritage Wall Panel + Floating Tea Shelves + Illuminated Brand Plaque (visible through doorway!)
  const rearFeaturePanel = new THREE.Mesh(new THREE.BoxGeometry(16.0, 4.4, 0.16), deepForestMat);
  rearFeaturePanel.position.set(288.6, 2.35, -8.52);
  staticGroup.add(rearFeaturePanel);

  for (let wx = 280.8; wx <= 296.4; wx += 0.65) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.3, 0.08), naturalOakMat);
    slat.position.set(wx, 2.35, -8.40);
    staticGroup.add(slat);
  }

  const backSignTex = createPhucLongBackWallSignTex();
  const backSignMat = new THREE.MeshStandardMaterial({
    map: backSignTex,
    emissive: 0xd1fae5,
    emissiveMap: backSignTex,
    emissiveIntensity: 0.12,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: false,
    roughness: 0.5,
  });
  const backSign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), backSignMat);
  backSign.userData.noMerge = true;
  backSign.position.set(288.6, 3.10, -8.32);
  staticGroup.add(backSign);

  // Rear North Sofa Banquette & Tables
  const rearSofa = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.44, 0.95), phucLongGreenMat);
  rearSofa.position.set(289.0, 0.30, -7.85);
  staticGroup.add(rearSofa);
  const rearBack = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.65, 0.22), phucLongGreenMat);
  rearBack.position.set(289.0, 0.72, -8.35);
  staticGroup.add(rearBack);
  [284.5, 289.0, 293.5].forEach((tx) => {
    staticGroup.add(buildPatioTableAndStools(tx, 0.09, -6.5, naturalOakMat, charcoalSteelMat, cupWhiteMat));
  });

  // Indoor Warm Globe Chandeliers suspended from the oak trusses
  [
    [283.1, 3.6, 2.8],
    [292.6, 4.2, 2.0],
    [288.6, 4.0, -5.2],
  ].forEach(([lx, ly, lz]) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), charcoalSteelMat);
    cord.position.set(lx, ly + 0.8, lz);
    staticGroup.add(cord);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), warmGlowMat);
    globe.position.set(lx, ly, lz);
    staticGroup.add(globe);
  });

  // Bright Interior Linear Ceiling Light Strips along the pitched gable hall
  [283.2, 288.3, 293.6].forEach((lx) => {
    const ceilingLed = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 14.5), warmGlowMat);
    ceilingLed.position.set(lx, 5.42, 1.5);
    staticGroup.add(ceilingLed);
  });

  // =========================================================================
  // 6. OPERATING HOURS ROLLING SHUTTER (07:00 - 23:00) & LIGHTING
  // =========================================================================
  const shutterTex = createRollingShutterTexture({
    title: 'PHÚC LONG COFFEE & TEA  •  SINCE 1968',
    hoursLabel: 'MỞ CỬA: 07:00 - 23:00',
    accentHex: '#006b3c',
    slatDarkHex: '#143324',
    slatLightHex: '#1f4d36',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.65, metalness: 0.15 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'phuc_long_main_door',
      axis: 'x',
      pos: frontGlassZ + 0.18,
      spanCenter: 287.1,
      width: 2.70,
      baseY: 0.08,
      topY: 2.94,
      thickness: 0.08,
    },
    shutterMat,
    charcoalSteelMat
  );

  const patioLight = new THREE.PointLight(0xfef3c7, 3.8, 30.0, 0.95);
  patioLight.position.set(midX, 3.8, 13.0);
  scaledLights.push({ light: patioLight, dayInt: 3.8, nightInt: 16.5, getScale: () => 1.0 - mainShutter.progress });

  const hallLight = new THREE.PointLight(0xfde68a, 4.8, 34.0, 0.95);
  hallLight.position.set(midX, 4.4, 1.5);
  scaledLights.push({ light: hallLight, dayInt: 4.8, nightInt: 19.0, getScale: () => 1.0 - mainShutter.progress });

  const barLight = new THREE.PointLight(0xfffbeb, 5.4, 26.0, 0.95);
  barLight.position.set(281.5, 4.0, 4.5);
  scaledLights.push({ light: barLight, dayInt: 5.4, nightInt: 20.0, getScale: () => 1.0 - mainShutter.progress });

  const loungeLight = new THREE.PointLight(0xfef3c7, 4.2, 26.0, 0.95);
  loungeLight.position.set(293.5, 4.0, 2.5);
  scaledLights.push({ light: loungeLight, dayInt: 4.2, nightInt: 16.5, getScale: () => 1.0 - mainShutter.progress });

  const poolTex = createPhucLongGlowPoolTex();
  const porchPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(porchPoolMat);
  const porchPool = new THREE.Mesh(new THREE.PlaneGeometry(20.0, 7.5), porchPoolMat);
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(midX, 0.05, 14.5);
  staticGroup.add(porchPool);

  let doorOpenAmount = 0.0;
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: PhucLongNpcController | null,
    externalNpcNearDoor?: boolean
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isPhucLongOpenAtHour(h);
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

    // Proximity-activated automatic bi-parting glass doors (sensor reacts to player OR NPCs)
    const nearPlayer =
      !!playerPos &&
      Math.abs(playerPos.x - 287.1) <= 2.75 &&
      Math.abs(playerPos.z - frontGlassZ) <= 3.6 &&
      playerPos.y <= 3.5;
    const nearNpc = Boolean(npcController?.hasNpcNearDoor()) || Boolean(externalNpcNearDoor);
    const sensorTriggered = nearPlayer || nearNpc;
    const targetDoor = (isOpen || !mainShutter.progress) && sensorTriggered ? 1.0 : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetDoor, Math.min(1, dt * 6.5));
    doorLeftLeaf.position.x = leftSlideStartX - doorOpenAmount * 1.24;
    doorRightLeaf.position.x = rightSlideStartX + doorOpenAmount * 1.24;

    const litScale = 1.0 - mainShutter.progress;
    crestMat.emissiveIntensity = (0.16 + lampFactor * 0.45) * litScale;
    channelMat.emissiveIntensity = (0.18 + lampFactor * 0.48) * litScale;
    menuMat.emissiveIntensity = (0.26 + lampFactor * 0.42) * litScale;
    backSignMat.emissiveIntensity = (0.24 + lampFactor * 0.48) * litScale;
    warmGlowMat.emissiveIntensity = (0.40 + lampFactor * 0.65) * litScale;
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
// PHÚC LONG NPC CONTROLLER (BARISTAS & DYNAMIC ROTATING CUSTOMERS)
// =========================================================================
interface PhucLongSeatSlot {
  id: string;
  seatPos: THREE.Vector3;
  yaw: number;
  hipsY: number;
  toSeat: THREE.Vector3[];
  fromSeat: THREE.Vector3[];
  occupiedBy: number | null;
}

const PHUC_LONG_PROFILES = [
  { shirt: 0x059669, pants: 0x1e293b, hair: 0x111827, skinHex: '#fbe0c8' },
  { shirt: 0x0284c7, pants: 0x0f172a, hair: 0x291c15, skinHex: '#f5c7a3' },
  { shirt: 0xe11d48, pants: 0x334155, hair: 0x1e1b4b, skinHex: '#fbe0c8' },
  { shirt: 0xd97706, pants: 0x1e293b, hair: 0x3b2314, skinHex: '#e8b48e' },
  { shirt: 0x7c3aed, pants: 0x1e293b, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0x0d9488, pants: 0x334155, hair: 0x2c1a10, skinHex: '#fbe0c8' },
  { shirt: 0xf43f5e, pants: 0x0f172a, hair: 0x4a2c18, skinHex: '#f5c7a3' },
  { shirt: 0x3b82f6, pants: 0x475569, hair: 0x18181b, skinHex: '#fbe0c8' },
  { shirt: 0xeab308, pants: 0x1e293b, hair: 0x111827, skinHex: '#d99b72' },
  { shirt: 0xec4899, pants: 0x0f172a, hair: 0x3f2316, skinHex: '#fbe0c8' },
];

type PLCustomerPhase =
  | 'respawn_wait'
  | 'walk_to_bar'
  | 'order_at_bar'
  | 'walk_to_seat'
  | 'drinking_seated'
  | 'walk_leave';

interface PhucLongActor {
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
  phase: PLCustomerPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  stateTimer: number;
  waitYaw: number;
  claimedSeatIdx: number | null;
  exiting: boolean;
  exitDone: boolean;
  exitWaypoints?: THREE.Vector3[];
  exitRef: { idx: number };
  walkPhaseRef: { phase: number };
  glbHandle?: GlbHumanHandle;
}

export class PhucLongNpcController {
  public readonly rootGroup = new THREE.Group();
  private actors: PhucLongActor[] = [];
  private seats: PhucLongSeatSlot[] = [];
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

  constructor(private helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x006b3c, roughness: 0.80 });
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42 });
    const cupBandMat = new THREE.MeshStandardMaterial({ color: 0x006b3c, roughness: 0.50 });
    const strawMat = new THREE.MeshStandardMaterial({ color: 0x004e2b, roughness: 0.50 });

    this.profileMats = PHUC_LONG_PROFILES.map((p) => ({
      shirt: new THREE.MeshStandardMaterial({ color: p.shirt, roughness: 0.72 }),
      pants: new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.78 }),
      hair: new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.85 }),
      faceTex: helpers.createFaceTexture('happy', p.skinHex),
    }));

    // Seats cleanly aligned with physical dining chairs & rear sofa
    const diningChairs: Array<{ id: string; x: number; z: number; yaw: number; appX: number; appZ: number }> = [
      { id: 'in_1_n', x: 291.6, z: 3.12, yaw: 0, appX: 289.2, appZ: 3.12 },
      { id: 'in_1_s', x: 291.6, z: 4.48, yaw: Math.PI, appX: 289.2, appZ: 4.48 },
      { id: 'in_2_n', x: 294.8, z: 3.12, yaw: 0, appX: 289.2, appZ: 2.0 },
      { id: 'in_3_n', x: 291.6, z: -0.88, yaw: 0, appX: 289.2, appZ: -0.88 },
      { id: 'in_3_s', x: 291.6, z: 0.48, yaw: Math.PI, appX: 289.2, appZ: 0.48 },
    ];
    diningChairs.forEach((dc) => {
      this.seats.push({
        id: dc.id,
        seatPos: new THREE.Vector3(dc.x, 0.09, dc.z),
        yaw: dc.yaw,
        hipsY: 0.45,
        toSeat: [
          new THREE.Vector3(286.6, 0.09, 5.5),
          new THREE.Vector3(dc.appX, 0.09, dc.appZ),
          new THREE.Vector3(dc.x, 0.09, dc.z),
        ],
        fromSeat: [
          new THREE.Vector3(dc.appX, 0.09, dc.appZ),
          new THREE.Vector3(287.1, 0.09, 8.6),
          new THREE.Vector3(287.1, 0.08, 12.6),
          new THREE.Vector3(287.1, 0.02, 16.8),
        ],
        occupiedBy: null,
      });
    });

    // Rear Green Sofa Banquette seats (facing +Z toward rear tables)
    [284.5, 289.0, 293.5].forEach((sx, idx) => {
      this.seats.push({
        id: `rear_sofa_${idx}`,
        seatPos: new THREE.Vector3(sx, 0.09, -7.65),
        yaw: 0,
        hipsY: 0.50,
        toSeat: [
          new THREE.Vector3(287.0, 0.09, -4.6),
          new THREE.Vector3(sx, 0.09, -4.6),
          new THREE.Vector3(sx, 0.09, -7.65),
        ],
        fromSeat: [
          new THREE.Vector3(sx, 0.09, -4.6),
          new THREE.Vector3(287.1, 0.09, 8.6),
          new THREE.Vector3(287.1, 0.08, 12.6),
          new THREE.Vector3(287.1, 0.02, 16.8),
        ],
        occupiedBy: null,
      });
    });

    const createActorRig = (
      kind: 'barista' | 'customer',
      profileIdx: number,
      x: number,
      y: number,
      z: number,
      yaw: number,
      speed = 1.28
    ): PhucLongActor => {
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

      // Phúc Long White & Forest-Green Cup in Right Hand
      const cupGroup = new THREE.Group();
      cupGroup.position.set(0, -0.43, 0.06);
      const cBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.13, 8), cupMat);
      cupGroup.add(cBody);
      const cBand = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.040, 0.045, 8), cupBandMat);
      cupGroup.add(cBand);
      const cStraw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 6), strawMat);
      cStraw.position.set(0.01, 0.095, 0);
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
      this.rootGroup.add(root);

      const seed = id * 1.53;
      const modelSpec =
        kind === 'barista'
          ? id === 0
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(180 + id)
          : pickSeatedCivilianModel(190 + id);
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

      const actor: PhucLongActor = {
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
        exiting: false,
        exitDone: false,
        exitWaypoints:
          kind === 'barista'
            ? [
                new THREE.Vector3(281.5, 0.09, -4.0),
                new THREE.Vector3(286.8, 0.09, -3.5),
                new THREE.Vector3(287.1, 0.09, 8.6),
                new THREE.Vector3(287.1, 0.02, 16.8),
                new THREE.Vector3(292.0 + id * 1.5, 0.02, 17.5),
              ]
            : undefined,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      };
      this.actors.push(actor);
      return actor;
    };

    // 1. Two Baristas behind the Phúc Long tea & coffee counter
    createActorRig('barista', 0, 281.4, 0.09, 2.2, Math.PI * 0.5);
    createActorRig('barista', 5, 281.4, 0.09, 4.8, Math.PI * 0.5);

    // 2. Seven dynamic rotating guests
    for (let i = 0; i < 7; i++) {
      createActorRig('customer', (i * 2) % this.profileMats.length, 287.1, 0.02, 17.2, Math.PI, 1.26 + (i % 3) * 0.07);
    }
  }

  private applyCustomerProfile(a: PhucLongActor, nextIdx: number) {
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

  private setStandingPose(a: PhucLongActor) {
    a.hipsGroup.position.set(0, 0.80, 0);
    a.leftLeg.rotation.x = 0;
    a.rightLeg.rotation.x = 0;
  }

  private setSeatedPose(a: PhucLongActor, hipsY: number) {
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

  private releaseSeat(a: PhucLongActor) {
    if (a.claimedSeatIdx !== null && this.seats[a.claimedSeatIdx]) {
      if (this.seats[a.claimedSeatIdx].occupiedBy === a.id) {
        this.seats[a.claimedSeatIdx].occupiedBy = null;
      }
      a.claimedSeatIdx = null;
    }
  }

  private assignNewCustomerArrival(a: PhucLongActor, rotateProfile: boolean) {
    this.releaseSeat(a);
    if (rotateProfile) {
      this.applyCustomerProfile(a, a.profileIdx + 3 + (a.id % 4));
    }
    this.setStandingPose(a);
    a.cupGroup.visible = false;

    const fromEast = this.nextSpawnSide++ % 2 === 0;
    const spawnX = fromEast ? 298.0 : 275.0;
    const spawnZ = 17.0 + (a.id % 3) * 0.45;
    a.root.position.set(spawnX, 0.02, spawnZ);
    a.root.visible = true;

    const orderZ = 2.0 + (a.id % 3) * 1.4;
    a.pathQueue = [
      new THREE.Vector3(287.1, 0.04, 15.8),
      new THREE.Vector3(287.1, 0.08, 12.2),
      new THREE.Vector3(287.1, 0.09, 8.8),
      new THREE.Vector3(284.6, 0.09, orderZ),
    ];
    a.pathIdx = 0;
    a.phase = 'walk_to_bar';
    a.glbHandle?.setAnimState('Walk');
    a.waitYaw = -Math.PI * 0.5; // Face -X toward the barista counter
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

      a.claimedSeatIdx = null;
      if (custIdx < 3) {
        // Pre-seated guests enjoying Phúc Long drinks with staggered timers
        const seatIdx = custIdx * 2;
        const seat = this.seats[seatIdx];
        seat.occupiedBy = a.id;
        a.claimedSeatIdx = seatIdx;
        a.cupGroup.visible = true;
        a.root.visible = true;
        a.root.position.copy(seat.seatPos);
        a.root.rotation.y = seat.yaw;
        this.setSeatedPose(a, seat.hipsY);
        a.phase = 'drinking_seated';
        a.glbHandle?.setAnimState('Sit');
        a.stateTimer = 5.5 + custIdx * 6.0;
      } else if (custIdx === 3) {
        a.cupGroup.visible = false;
        a.root.visible = true;
        a.root.position.set(284.6, 0.09, 3.4);
        a.root.rotation.y = -Math.PI * 0.5;
        a.phase = 'order_at_bar';
        a.glbHandle?.setAnimState('Idle');
        a.stateTimer = 2.5;
        a.waitYaw = -Math.PI * 0.5;
      } else {
        a.root.visible = false;
        a.phase = 'respawn_wait';
        a.stateTimer = (custIdx - 4) * 2.3;
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

      if (!a.root.visible || a.phase === 'respawn_wait' || a.root.position.z > 15.6) {
        this.releaseSeat(a);
        a.exitDone = true;
        a.root.visible = false;
        continue;
      }

      a.exitDone = false;
      const leaveX = i % 2 === 0 ? 275.0 : 298.0;
      if (a.claimedSeatIdx !== null) {
        const seat = this.seats[a.claimedSeatIdx];
        a.exitWaypoints = [
          ...seat.fromSeat.map((v) => v.clone()),
          new THREE.Vector3(leaveX, 0.02, 17.2),
        ];
        this.releaseSeat(a);
      } else {
        a.exitWaypoints = [
          new THREE.Vector3(287.1, 0.09, 8.6),
          new THREE.Vector3(287.1, 0.02, 16.8),
          new THREE.Vector3(leaveX, 0.02, 17.2),
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
      if (p.x >= 285.0 && p.x <= 289.2 && p.z >= 7.2 && p.z <= 13.6) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: PhucLongActor, dt: number): boolean {
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
    a.rightArm.rotation.x = a.cupGroup.visible ? -0.58 : swing * 0.55;
    return false;
  }

  public update(delta: number, rawHour = 10.0) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isPhucLongOpenAtHour(h);

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
          new THREE.Vector3(287.1, 0.09, 8.6),
          new THREE.Vector3(287.1, 0.02, 16.8),
          new THREE.Vector3(275.0 + i * 2.0, 0.02, 17.5),
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
        const brew = Math.sin(this.timer * 3.2 + a.seed);
        a.rightArm.rotation.x = -0.60 + brew * 0.22;
        a.leftArm.rotation.x = -0.50 - brew * 0.16;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.4 + a.seed) * 0.20;
        continue;
      }

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
          a.stateTimer = 3.0 + (a.id % 3) * 0.9;
        }
      } else if (a.phase === 'order_at_bar') {
        let diff = a.waitYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 8.0);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightArm.rotation.x = -0.35 + Math.sin(this.timer * 2.5 + a.seed) * 0.12;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.6 + a.seed) * 0.18;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          a.cupGroup.visible = true;
          const freeSeatIdx = a.id % 4 === 3 ? null : this.claimFreeSeat(a.id);
          if (freeSeatIdx !== null) {
            const seat = this.seats[freeSeatIdx];
            a.claimedSeatIdx = freeSeatIdx;
            a.pathQueue = seat.toSeat.map((v) => v.clone());
            a.pathIdx = 0;
            a.phase = 'walk_to_seat';
            a.glbHandle?.setAnimState('Walk');
          } else {
            const leaveEast = a.id % 2 === 0;
            a.pathQueue = [
              new THREE.Vector3(287.1, 0.09, 8.6),
              new THREE.Vector3(287.1, 0.02, 16.8),
              new THREE.Vector3(leaveEast ? 298.0 : 275.0, 0.02, 17.2),
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
          this.setStandingPose(a);
          const seat = a.claimedSeatIdx !== null ? this.seats[a.claimedSeatIdx] : null;
          const leaveEast = (a.id + Math.floor(this.timer)) % 2 === 0;
          const streetOut = new THREE.Vector3(leaveEast ? 298.0 : 275.0, 0.02, 17.2);
          a.pathQueue = seat
            ? [...seat.fromSeat.map((v) => v.clone()), streetOut]
            : [new THREE.Vector3(287.1, 0.02, 16.8), streetOut];
          a.pathIdx = 0;
          this.releaseSeat(a);
          a.phase = 'walk_leave';
          a.glbHandle?.setAnimState('Walk');
        }
      } else if (a.phase === 'walk_leave') {
        if (this.stepPath(a, dt)) {
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
