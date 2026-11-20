import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isPradaOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface PradaBuildResult {
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
    npcController?: PradaNpcController | null
  ) => void;
}

// =========================================================================
// PRADA MILANO FLAGSHIP BOUTIQUE — CURVED GLASS ROTUNDA, CELADON SALONS,
// WARM TIMBER OVERHANG, CHECKERED MARBLE ATRIUM & HAUTE COUTURE MEZZANINE
// Directly East of CHANEL along Đại lộ Đông Tây (X = 461.6 .. 487.6, Z = 45.8 .. 70.0)
// Faces North (-Z) toward Boulevard Sidewalk (Z = 37.20 .. 42.50) & SW Corner of Ngã Tư DIOR
// Podium Floor: Y = 0.16m (Floor 1 = 0.16, Floor 2 = 4.36, Timber Canopy/Parapet Top = 9.85m)
// Recessed Entrance Portal Doors: X = 466.4, Z = 46.90 (3.2m clear automatic doors, 07:00 - 23:00)
// =========================================================================

export const PRADA_PODIUM_Y = 0.16;
export const PRADA_FLOOR_H = 4.2;

export const PRADA_DOOR_X = 466.4;
export const PRADA_DOOR_Z = 46.9;

const ROTUNDA_CX = 477.6;
const ROTUNDA_CZ = 55.8;
const ROTUNDA_R = 10.0;

export const PRADA_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 (Y = 0.16m) — Curved Glass Rotunda, Entrance Vestibule & Salons
  // =========================================================================
  { minX: 461.4, maxX: 462.3, minZ: 45.8, maxZ: 70.2, floor: 1 }, // West Wall (facing alley next to Chanel)
  { minX: 461.4, maxX: 487.8, minZ: 69.3, maxZ: 70.2, floor: 1 }, // South Rear Wall
  { minX: 486.9, maxX: 487.8, minZ: 55.5, maxZ: 70.2, floor: 1 }, // East Straight Wall (South of curve)

  // North Facade split cleanly around Entrance Vestibule (X = 464.75 .. 468.05)
  { minX: 461.6, maxX: 464.75, minZ: 45.75, maxZ: 47.6, floor: 1 }, // West Showcase Pier
  { minX: 468.05, maxX: 478.0, minZ: 45.75, maxZ: 47.6, floor: 1 }, // Central Pier & Front Glass Line

  // Curved NE Glass Curtain Wall Stepped Approximations (radius ~10m around 477.6, 55.8)
  { minX: 477.6, maxX: 482.2, minZ: 45.75, maxZ: 47.4, floor: 1 },
  { minX: 481.6, maxX: 485.4, minZ: 46.6, maxZ: 49.6, floor: 1 },
  { minX: 484.8, maxX: 487.6, minZ: 49.0, maxZ: 52.8, floor: 1 },
  { minX: 486.4, maxX: 487.8, minZ: 52.2, maxZ: 56.2, floor: 1 },

  // Exterior Pilaster Column at Front Bay Divider (X = 471.75, Z = 45.70)
  { minX: 471.3, maxX: 472.2, minZ: 45.25, maxZ: 46.15, floor: 1 },

  // Floor 1 Interior Display Furniture & Rotunda Mannequin Plinths
  { minX: 462.3, maxX: 464.5, minZ: 46.8, maxZ: 49.8, floor: 1 }, // West Entry Showcase Plinth
  { minX: 469.2, maxX: 470.8, minZ: 47.2, maxZ: 49.0, floor: 1 }, // Entry Column Heritage Vitrine Pedestal
  { minX: 475.8, maxX: 484.6, minZ: 47.8, maxZ: 52.4, floor: 1 }, // Hero Rotunda Couture Mannequin Podium
  { minX: 471.6, maxX: 475.0, minZ: 52.3, maxZ: 54.4, floor: 1 }, // Front Galleria Leather Handbag Table Island
  { minX: 471.6, maxX: 475.0, minZ: 56.2, maxZ: 58.3, floor: 1 }, // Central Saffiano Tote & Small Goods Island
  { minX: 471.6, maxX: 475.0, minZ: 60.0, maxZ: 61.9, floor: 1 }, // Parfumerie & Eyewear Vitrine Island
  { minX: 462.3, maxX: 464.1, minZ: 50.8, maxZ: 61.8, floor: 1 }, // West Celadon Apparel & Coat Alcove
  { minX: 485.0, maxX: 486.9, minZ: 56.8, maxZ: 67.4, floor: 1 }, // East Illuminated Footwear & Nylon Shelving
  { minX: 477.6, maxX: 482.2, minZ: 55.2, maxZ: 59.2, floor: 1 }, // Bouclé Client Lounge Sofa & Marble Table
  { minX: 478.2, maxX: 481.2, minZ: 60.6, maxZ: 62.6, floor: 1 }, // Lounge Armchair Accent Table
  { minX: 471.6, maxX: 477.6, minZ: 64.2, maxZ: 66.4, floor: 1 }, // Black Marquina Marble Concierge Cashwrap
  { minX: 479.4, maxX: 484.6, minZ: 67.6, maxZ: 69.2, floor: 1 }, // South Feature Credenza & Gift Packaging Console

  // SW Switchback Stairwell Enclosure (X = 462.4..467.2, Z = 62.5..69.4, spine X = 464.8)
  { minX: 462.2, maxX: 462.55, minZ: 62.5, maxZ: 69.4, floor: 1 }, // Stairwell West Balustrade
  { minX: 467.05, maxX: 467.4, minZ: 62.5, maxZ: 69.4, floor: 1 }, // Stairwell East Balustrade
  { minX: 464.62, maxX: 464.98, minZ: 62.5, maxZ: 67.6, floor: 1 }, // Stairwell Center Spine
  { minX: 464.95, maxX: 467.3, minZ: 62.5, maxZ: 62.85, floor: 1 }, // Floor 1 Under-Stair Partition

  // =========================================================================
  // FLOOR 2 (Y = 4.36m) — Curved Mezzanine Overlook, Couture & Shoe Salon
  // =========================================================================
  { minX: 461.4, maxX: 462.3, minZ: 45.8, maxZ: 70.2, floor: 2 }, // West Wall
  { minX: 461.4, maxX: 487.8, minZ: 69.3, maxZ: 70.2, floor: 2 }, // South Rear Wall
  { minX: 486.9, maxX: 487.8, minZ: 45.8, maxZ: 70.2, floor: 2 }, // East Curtain Wall Perimeter
  { minX: 461.6, maxX: 487.6, minZ: 45.75, maxZ: 55.6, floor: 2 }, // North Double-Height Void & Curved Balcony Overlook Edge
  { minX: 462.2, maxX: 462.55, minZ: 62.5, maxZ: 69.4, floor: 2 }, // Stairwell West Balustrade
  { minX: 467.05, maxX: 467.4, minZ: 62.5, maxZ: 69.4, floor: 2 }, // Stairwell East Balustrade
  { minX: 464.62, maxX: 464.98, minZ: 62.5, maxZ: 67.6, floor: 2 }, // Stairwell Center Spine
  { minX: 462.45, maxX: 464.7, minZ: 62.5, maxZ: 63.5, floor: 2 }, // Floor 2 Down-Bay Glass & Steel Guard
  { minX: 462.3, maxX: 464.2, minZ: 56.0, maxZ: 61.8, floor: 2 }, // West Menswear & Knitwear Wall Alcove
  { minX: 484.8, maxX: 486.8, minZ: 56.8, maxZ: 68.0, floor: 2 }, // East Illuminated Eveningwear & Shoe Salon
  { minX: 472.2, maxX: 478.8, minZ: 59.6, maxZ: 63.2, floor: 2 }, // VIP Runway Velvet Lounge & Champagne Console
  { minX: 479.4, maxX: 484.2, minZ: 66.2, maxZ: 69.0, floor: 2 }, // VIP Archive Trunk & Exotic Leather Salon Credenza
];

// =========================================================================
// PROCEDURAL PRADA TEXTURES
// =========================================================================

function createPradaWordmarkTex(
  textColor = '#ffffff',
  glowColor = 'rgba(255,255,255,0.85)',
  subtext?: string,
  bgFill?: string
): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  if (bgFill) {
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 18;
  ctx.fillStyle = textColor;

  // Classic Didone / Prada tracked serif wordmark
  ctx.font = '700 116px "Georgia", "Times New Roman", serif';
  const letters = ['P', 'R', 'A', 'D', 'A'];
  const spacing = 132;
  const startX = w * 0.5 - ((letters.length - 1) * spacing) * 0.5;
  const cy = subtext ? h * 0.42 : h * 0.52;
  for (let i = 0; i < letters.length; i++) {
    ctx.fillText(letters[i], startX + i * spacing, cy);
  }

  if (subtext) {
    ctx.shadowBlur = 6;
    ctx.font = '600 28px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(subtext, w * 0.5, h * 0.78);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPradaCheckeredMarbleTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  const cells = 4;
  const cell = s / cells;
  for (let r = 0; r < cells; r++) {
    for (let col = 0; col < cells; col++) {
      const isBlack = (r + col) % 2 === 0;
      const x = col * cell;
      const y = r * cell;
      ctx.fillStyle = isBlack ? '#17191d' : '#efeae0';
      ctx.fillRect(x, y, cell, cell);

      // Natural Carrara / Nero Marquina veining
      ctx.strokeStyle = isBlack ? 'rgba(225,220,208,0.20)' : 'rgba(130,124,116,0.22)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + cell * 0.28);
      ctx.bezierCurveTo(
        x + cell * 0.38,
        y + cell * 0.14,
        x + cell * 0.65,
        y + cell * 0.72,
        x + cell - 6,
        y + cell * 0.62
      );
      ctx.stroke();

      ctx.strokeStyle = isBlack ? 'rgba(255,255,255,0.08)' : 'rgba(165,158,148,0.14)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.18, y + cell - 8);
      ctx.lineTo(x + cell * 0.78, y + cell * 0.12);
      ctx.stroke();
    }
  }

  // Crisp micro grout lines
  ctx.strokeStyle = 'rgba(40,42,46,0.36)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= cells; i++) {
    const p = i * cell;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(s, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function createPradaTimberSlatTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#a46431';
  ctx.fillRect(0, 0, w, h);

  const slats = 18;
  const sw = w / slats;
  for (let i = 0; i < slats; i++) {
    const x = i * sw;
    const tone = i % 3 === 0 ? '#b7743a' : i % 3 === 1 ? '#9f5d2b' : '#c47f43';
    ctx.fillStyle = tone;
    ctx.fillRect(x, 0, sw - 2, h);

    ctx.fillStyle = 'rgba(54, 24, 8, 0.52)';
    ctx.fillRect(x + sw - 2, 0, 2, h);

    ctx.fillStyle = 'rgba(255, 212, 165, 0.15)';
    ctx.fillRect(x + 2, 0, 3, h);
  }

  ctx.strokeStyle = 'rgba(48, 22, 8, 0.28)';
  ctx.lineWidth = 3;
  [128, 256, 384].forEach((gy) => {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function createPradaCeladonPanelTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ebf3e6');
  grad.addColorStop(0.5, '#e2eddc');
  grad.addColorStop(1, '#d8e6d1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Architectural wall boiserie flutes & inset rectangular panels
  ctx.strokeStyle = 'rgba(130, 150, 134, 0.35)';
  ctx.lineWidth = 3;
  [24, 180, 336, 488].forEach((px) => {
    ctx.strokeRect(px, 28, 128, h - 56);
  });

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  [26, 182, 338].forEach((px) => {
    ctx.strokeRect(px + 2, 30, 124, h - 60);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

function createPradaLookbookTex(variant: 0 | 1 | 2): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = variant === 0 ? '#d8e4d4' : variant === 1 ? '#181a1f' : '#e6dfd3';
  const fg = variant === 1 ? '#f4f5f6' : '#14161a';
  const accent = variant === 0 ? '#7b4620' : variant === 1 ? '#cbd5c8' : '#8d1b26';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Crisp editorial border frame
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  // Stylized Prada fashion silhouette graphic
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 130);
  ctx.lineTo(w * 0.33, 210);
  ctx.lineTo(w * 0.27, 460);
  ctx.lineTo(w * 0.73, 460);
  ctx.lineTo(w * 0.67, 210);
  ctx.closePath();
  ctx.fill();

  // Accent stole / handbag triangle silhouette
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 260);
  ctx.lineTo(w * 0.64, 345);
  ctx.lineTo(w * 0.36, 345);
  ctx.closePath();
  ctx.fill();

  // Header & campaign season caption
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.font = '700 44px "Georgia", serif';
  ctx.fillText('P R A D A', w * 0.5, 86);
  ctx.font = '600 20px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('MILANO  •  AUTUNNO / INVERNO', w * 0.5, h - 72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPradaCrestLogoTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  // Iconic Prada Inverted Triangle Plaque
  ctx.fillStyle = '#0f1014';
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(44, 96);
  ctx.lineTo(s - 44, 96);
  ctx.lineTo(s * 0.5, s - 68);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '700 56px "Georgia", serif';
  ctx.fillText('PRADA', s * 0.5, 200);
  ctx.font = '600 28px "Georgia", serif';
  ctx.fillText('MILANO', s * 0.5, 252);
  ctx.font = '500 18px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('DAL 1913', s * 0.5, 294);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPradaShoppingBagTex(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8f7f3';
  ctx.fillRect(0, 0, s, s);

  ctx.fillStyle = '#141518';
  ctx.fillRect(0, 0, s, 26);
  ctx.fillRect(0, s - 16, s, 16);

  ctx.fillStyle = '#141518';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 34px "Georgia", serif';
  ctx.fillText('PRADA', s * 0.5, s * 0.46);
  ctx.font = '500 16px "Georgia", serif';
  ctx.fillText('MILANO', s * 0.5, s * 0.62);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================================
// REUSABLE PRADA LUXURY PROP & FIXTURE BUILDERS
// =========================================================================

function buildPradaCoatMannequin(
  x: number,
  y: number,
  z: number,
  coatMat: THREE.Material,
  trouserMat: THREE.Material,
  shirtMat: THREE.Material,
  metalMat: THREE.Material,
  beltMat: THREE.Material,
  yaw: number,
  withTrenchLapels = true
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  // Slim weighted steel pedestal plate
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.36), metalMat);
  base.position.y = 0.015;
  grp.add(base);

  const legGeo = new THREE.BoxGeometry(0.145, 0.90, 0.16);
  const lLeg = new THREE.Mesh(legGeo, trouserMat);
  lLeg.position.set(-0.095, 0.47, 0);
  grp.add(lLeg);
  const rLeg = new THREE.Mesh(legGeo, trouserMat);
  rLeg.position.set(0.095, 0.47, 0);
  grp.add(rLeg);

  // Designer shoes
  const shoeGeo = new THREE.BoxGeometry(0.15, 0.07, 0.24);
  const lShoe = new THREE.Mesh(shoeGeo, beltMat);
  lShoe.position.set(-0.095, 0.04, 0.035);
  grp.add(lShoe);
  const rShoe = new THREE.Mesh(shoeGeo, beltMat);
  rShoe.position.set(0.095, 0.04, 0.035);
  grp.add(rShoe);

  // Structured tailored overcoat / blazer torso
  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.74, 0.25), coatMat);
  coat.position.y = 1.24;
  grp.add(coat);

  // Shirt V-insert & collar
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.265), shirtMat);
  inner.position.set(0, 1.39, 0.01);
  grp.add(inner);

  if (withTrenchLapels) {
    const lapelGeo = new THREE.BoxGeometry(0.09, 0.34, 0.025);
    const lLap = new THREE.Mesh(lapelGeo, coatMat);
    lLap.position.set(-0.10, 1.41, 0.13);
    lLap.rotation.z = -0.18;
    grp.add(lLap);
    const rLap = new THREE.Mesh(lapelGeo, coatMat);
    rLap.position.set(0.10, 1.41, 0.13);
    rLap.rotation.z = 0.18;
    grp.add(rLap);
  }

  // Tailored waist belt + chrome buckle + chest triangle pin
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.055, 0.27), beltMat);
  belt.position.y = 1.07;
  grp.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.065, 0.02), metalMat);
  buckle.position.set(0, 1.07, 0.14);
  grp.add(buckle);
  const pin = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.038, 0.015), metalMat);
  pin.position.set(0.14, 1.43, 0.135);
  grp.add(pin);

  // Sculpted sleeves
  const sleeveGeo = new THREE.BoxGeometry(0.13, 0.58, 0.14);
  const lArm = new THREE.Mesh(sleeveGeo, coatMat);
  lArm.position.set(-0.295, 1.24, 0);
  grp.add(lArm);
  const rArm = new THREE.Mesh(sleeveGeo, coatMat);
  rArm.position.set(0.295, 1.24, 0);
  grp.add(rArm);

  // Sculpted atelier neck collar cap
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.088, 0.13, 10), metalMat);
  collar.position.y = 1.66;
  grp.add(collar);

  return grp;
}

function buildPradaWireframeTable(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  topMat: THREE.Material,
  wireMat: THREE.Material,
  trimMat?: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), topMat);
  top.position.y = h;
  grp.add(top);

  if (trimMat) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.02, d + 0.03), trimMat);
    rim.position.y = h - 0.025;
    grp.add(rim);
  }

  // Signature architectural X / V-leg steel struts
  const xOff = w * 0.36;
  const zOff = d * 0.36;
  const legLen = Math.hypot(xOff * 0.45, h);
  const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, legLen, 6);
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const rod = new THREE.Mesh(rodGeo, wireMat);
      rod.position.set(sx * xOff * 0.78, h * 0.5, sz * zOff);
      rod.rotation.z = sx * 0.24;
      grp.add(rod);
    });
  });

  const bar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.02, 0.02), wireMat);
  bar.position.y = h * 0.14;
  grp.add(bar);

  return grp;
}

function buildPradaHandbag(
  x: number,
  y: number,
  z: number,
  leatherMat: THREE.Material,
  hardwareMat: THREE.Material,
  yaw = 0,
  scale = 1.0
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;
  grp.scale.setScalar(scale);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.23, 0.13), leatherMat);
  body.position.y = 0.115;
  grp.add(body);

  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.325, 0.06, 0.135), leatherMat);
  flap.position.y = 0.20;
  grp.add(flap);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.014, 6, 12, Math.PI), leatherMat);
  arch.position.set(0, 0.23, 0);
  grp.add(arch);

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.014), hardwareMat);
  plaque.position.set(0, 0.145, 0.07);
  grp.add(plaque);

  return grp;
}

function buildPradaFootwearPair(
  x: number,
  y: number,
  z: number,
  upperMat: THREE.Material,
  soleMat: THREE.Material,
  yaw = 0
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  [-0.085, 0.085].forEach((ox) => {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.27), soleMat);
    sole.position.set(ox, 0.02, 0);
    grp.add(sole);
    const vamp = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.075, 0.23), upperMat);
    vamp.position.set(ox, 0.07, -0.01);
    grp.add(vamp);
  });

  return grp;
}

function buildPradaGarmentRack(
  x: number,
  y: number,
  z: number,
  len: number,
  yaw: number,
  metalMat: THREE.Material,
  baseMat: THREE.Material,
  coatMats: THREE.Material[]
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.56), baseMat);
  base.position.y = 0.025;
  grp.add(base);

  const postGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.54, 8);
  [-len * 0.46, len * 0.46].forEach((px) => {
    const p = new THREE.Mesh(postGeo, metalMat);
    p.position.set(px, 0.79, 0);
    grp.add(p);
  });

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len * 0.94, 8), metalMat);
  bar.rotation.z = Math.PI * 0.5;
  bar.position.y = 1.54;
  grp.add(bar);

  const count = Math.max(5, Math.floor(len / 0.20));
  const garmentGeo = new THREE.BoxGeometry(0.08, 0.84, 0.44);
  for (let i = 0; i < count; i++) {
    const gx = -len * 0.42 + (i / Math.max(1, count - 1)) * (len * 0.84);
    const g = new THREE.Mesh(garmentGeo, coatMats[i % coatMats.length]);
    g.position.set(gx, 1.09, 0);
    grp.add(g);
  }

  return grp;
}

function buildPradaOlivePlanter(
  x: number,
  y: number,
  z: number,
  potMat: THREE.Material,
  trunkMat: THREE.Material,
  leafMat: THREE.Material,
  scale = 1.0
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.54, 14), potMat);
  pot.position.y = 0.27;
  grp.add(pot);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 1.05, 8), trunkMat);
  trunk.position.y = 0.95;
  grp.add(trunk);

  [
    [0, 1.52, 0, 0.42],
    [-0.20, 1.40, 0.14, 0.28],
    [0.20, 1.45, -0.14, 0.30],
    [0.08, 1.68, 0.10, 0.25],
  ].forEach(([lx, ly, lz, r]) => {
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), leafMat);
    canopy.position.set(lx, ly, lz);
    grp.add(canopy);
  });

  return grp;
}

function buildPradaGlassVitrineTower(
  x: number,
  y: number,
  z: number,
  baseMat: THREE.Material,
  metalMat: THREE.Material,
  glassMat: THREE.Material,
  ledMat: THREE.Material,
  bagMat: THREE.Material,
  hardwareMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.92, 0.86), baseMat);
  plinth.position.y = 0.46;
  grp.add(plinth);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.05, 0.90), metalMat);
  trim.position.y = 0.94;
  grp.add(trim);

  const ledDeck = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.03, 0.76), ledMat);
  ledDeck.position.y = 0.97;
  grp.add(ledDeck);

  // Corner brass/steel vitrine posts
  [
    [-0.38, -0.38],
    [0.38, -0.38],
    [-0.38, 0.38],
    [0.38, 0.38],
  ].forEach(([px, pz]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.15, 0.035), metalMat);
    p.position.set(px, 1.55, pz);
    grp.add(p);
  });

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.86), metalMat);
  cap.position.y = 2.16;
  grp.add(cap);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.12, 0.84), glassMat);
  hood.position.y = 1.54;
  hood.userData.noMerge = true;
  grp.add(hood);

  grp.add(buildPradaHandbag(0, 0.98, 0, bagMat, hardwareMat, 0.25, 1.18));

  return grp;
}

// =========================================================================
// MAIN PRADA FLAGSHIP BOUTIQUE BUILDER
// =========================================================================

export function createPradaStoreStructure(): PradaBuildResult {
  const staticGroup = new THREE.Group();
  staticGroup.name = 'PradaStoreGroup';

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Signature Material Palette (Celadon Milanese Salon + Marquina Marble + Warm Timber)
  const celadonWallMat = new THREE.MeshStandardMaterial({
    map: createPradaCeladonPanelTex(),
    color: 0xf4faf0,
    roughness: 0.45,
    metalness: 0.04,
  });
  const celadonPlainMat = new THREE.MeshStandardMaterial({
    color: 0xddebd6,
    roughness: 0.48,
    metalness: 0.04,
  });
  const warmWhiteCeilingMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7ef,
    roughness: 0.44,
    metalness: 0.04,
  });
  const darkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.24,
    metalness: 0.80,
  });
  const glossyObsidianBandMat = new THREE.MeshStandardMaterial({
    color: 0x0b0c10,
    roughness: 0.14,
    metalness: 0.84,
  });
  const brushedChromeMat = new THREE.MeshStandardMaterial({
    color: 0xdce2e8,
    roughness: 0.18,
    metalness: 0.92,
  });
  const warmBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af6a,
    roughness: 0.24,
    metalness: 0.86,
  });
  const graniteApronMat = new THREE.MeshStandardMaterial({
    color: 0xd4cfc7,
    roughness: 0.46,
    metalness: 0.06,
  });
  const checkerFloorMat = new THREE.MeshStandardMaterial({
    map: createPradaCheckeredMarbleTex(),
    roughness: 0.20,
    metalness: 0.10,
  });
  const ivoryTerrazzoMat = new THREE.MeshStandardMaterial({
    color: 0xefece4,
    roughness: 0.28,
    metalness: 0.06,
  });
  const blackMarbleMat = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.16,
    metalness: 0.18,
  });
  const timberSoffitMat = new THREE.MeshStandardMaterial({
    map: createPradaTimberSlatTex(),
    roughness: 0.50,
    metalness: 0.06,
  });
  const glassCurtainMat = new THREE.MeshStandardMaterial({
    color: 0xe4f5f0,
    transparent: true,
    opacity: 0.20,
    roughness: 0.05,
    metalness: 0.16,
    depthWrite: false,
  });
  const balconyGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdcf2ee,
    transparent: true,
    opacity: 0.28,
    roughness: 0.06,
    metalness: 0.14,
    depthWrite: false,
  });
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xd8e8ee,
    roughness: 0.06,
    metalness: 0.96,
  });
  const linearLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf4ffef,
    emissiveIntensity: 1.55,
    roughness: 0.16,
  });
  lanternMats.push(linearLightMat);

  const warmCoveLedMat = new THREE.MeshStandardMaterial({
    color: 0xfff5e0,
    emissive: 0xffd79e,
    emissiveIntensity: 1.35,
    roughness: 0.20,
  });
  lanternMats.push(warmCoveLedMat);

  const darkRoofCapMat = new THREE.MeshStandardMaterial({
    color: 0x1c1e23,
    roughness: 0.50,
    metalness: 0.48,
  });

  // Merchandising & Decor Materials
  const suitCharcoalMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.72 });
  const coatCamelMat = new THREE.MeshStandardMaterial({ color: 0xa06732, roughness: 0.72 });
  const navyWoolMat = new THREE.MeshStandardMaterial({ color: 0x1b2840, roughness: 0.70 });
  const forestParkaMat = new THREE.MeshStandardMaterial({ color: 0x2d4338, roughness: 0.58 });
  const ivorySilkMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.42 });
  const bagCognacMat = new THREE.MeshStandardMaterial({ color: 0x7c431d, roughness: 0.34 });
  const bagBlackMat = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.28 });
  const bagCrimsonMat = new THREE.MeshStandardMaterial({ color: 0x8d1b26, roughness: 0.34 });
  const bagOliveMat = new THREE.MeshStandardMaterial({ color: 0x4b5a42, roughness: 0.36 });
  const bagWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.36 });
  const velvetBeigeMat = new THREE.MeshStandardMaterial({ color: 0xdad3c4, roughness: 0.84 });
  const velvetOliveMat = new THREE.MeshStandardMaterial({ color: 0x6f826a, roughness: 0.84 });
  const rugTaupeMat = new THREE.MeshStandardMaterial({ color: 0xc2bbb0, roughness: 0.90 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4632, roughness: 0.82 });
  const oliveLeafMat = new THREE.MeshStandardMaterial({ color: 0x5c7554, roughness: 0.76 });
  const boxEmeraldMat = new THREE.MeshStandardMaterial({ color: 0xb7ccb9, roughness: 0.55 });
  const parfumAmberMat = new THREE.MeshStandardMaterial({
    color: 0xf5b99b,
    emissive: 0xffc79e,
    emissiveIntensity: 0.35,
    roughness: 0.14,
  });

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    staticGroup.add(m);
    return m;
  };

  const minX = 461.6;
  const maxX = 487.6;
  const wTotal = maxX - minX; // 26.0m
  const midX = (minX + maxX) * 0.5; // 474.6
  const minZ = 45.8;
  const maxZ = 70.0;
  const dTotal = maxZ - minZ; // 24.2m
  const midZ = (minZ + maxZ) * 0.5; // 57.9
  const f1Y = PRADA_PODIUM_Y; // 0.16
  const f2Y = f1Y + PRADA_FLOOR_H; // 4.36
  const totalH = 9.05;

  // =========================================================================
  // 1. GRANITE ENTRANCE APRON, CURB & CHECKERED MARBLE ROTUNDA PODIUM
  // =========================================================================
  addBox(wTotal + 1.4, 0.06, 3.6, midX, 0.02, 44.1, graniteApronMat);
  const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.72), graniteApronMat);
  rampMesh.position.set(PRADA_DOOR_X, 0.08, 45.5);
  rampMesh.rotation.x = 0.16;
  staticGroup.add(rampMesh);

  // Rectangular rear base + NW front slab + quarter-circle rotunda podium (zero protruding corners!)
  addBox(wTotal, f1Y + 0.04, 14.4, midX, f1Y * 0.5 - 0.02, 62.8, checkerFloorMat);
  addBox(16.0, f1Y + 0.04, 10.2, 469.6, f1Y * 0.5 - 0.02, 50.9, checkerFloorMat);
  const rotundaFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(ROTUNDA_R, ROTUNDA_R, f1Y + 0.04, 24, 1, false, 0, Math.PI * 0.5),
    checkerFloorMat
  );
  rotundaFloor.position.set(ROTUNDA_CX, f1Y * 0.5 - 0.02, ROTUNDA_CZ);
  staticGroup.add(rotundaFloor);

  // =========================================================================
  // 2. CURVED PANORAMIC GLASS ROTUNDA, BRONZE MULLIONS & OBSIDIAN FASCIA BAND
  // =========================================================================
  const sillCurvePts: THREE.Vector3[] = [];
  const CURVE_STEPS = 12;
  for (let i = 0; i <= CURVE_STEPS; i++) {
    const ang = (i / CURVE_STEPS) * Math.PI * 0.5;
    sillCurvePts.push(
      new THREE.Vector3(
        ROTUNDA_CX + Math.sin(ang) * ROTUNDA_R,
        0,
        ROTUNDA_CZ - Math.cos(ang) * ROTUNDA_R
      )
    );
  }
  for (let i = 0; i < CURVE_STEPS; i++) {
    const p0 = sillCurvePts[i];
    const p1 = sillCurvePts[i + 1];
    const segLen = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    const midPx = (p0.x + p1.x) * 0.5;
    const midPz = (p0.z + p1.z) * 0.5;
    const rotY = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);

    const sill = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.08, 0.36, 0.30), darkBronzeMat);
    sill.position.set(midPx, 0.18, midPz);
    sill.rotation.y = rotY;
    staticGroup.add(sill);

    const pane = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.02, 8.20, 0.05), glassCurtainMat);
    pane.position.set(midPx, 4.46, midPz);
    pane.rotation.y = rotY;
    pane.userData.noMerge = true;
    staticGroup.add(pane);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.10, 0.72, 0.28), glossyObsidianBandMat);
    fascia.position.set(midPx, 4.30, midPz);
    fascia.rotation.y = rotY;
    staticGroup.add(fascia);

    const cornice = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.12, 0.36, 0.32), darkBronzeMat);
    cornice.position.set(midPx, 8.64, midPz);
    cornice.rotation.y = rotY;
    staticGroup.add(cornice);
  }

  // Mullions cleanly placed at 0°, 30°, 60°, 90° -> leaves 3 wide unobstructed panoramic showcase bays!
  [0, 4, 8, 12].forEach((idx) => {
    const pt = sillCurvePts[idx];
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.16, 8.65, 0.22), darkBronzeMat);
    mullion.position.set(pt.x, 4.45, pt.z);
    if (idx > 0 && idx < CURVE_STEPS) {
      const ang = (idx / CURVE_STEPS) * Math.PI * 0.5;
      mullion.rotation.y = -ang;
    }
    staticGroup.add(mullion);
  });

  // Straight North Rotunda Glass Extension (X = 471.9 .. 477.6, Z = 45.8)
  addBox(5.7, 0.36, 0.30, 474.75, 0.18, 45.8, darkBronzeMat);
  const frontGlassExt = addBox(5.7, 8.20, 0.05, 474.75, 4.46, 45.8, glassCurtainMat);
  frontGlassExt.userData.noMerge = true;
  addBox(5.8, 0.72, 0.28, 474.75, 4.30, 45.8, glossyObsidianBandMat);
  addBox(5.8, 0.36, 0.32, 474.75, 8.64, 45.8, darkBronzeMat);

  // Signature Cylindrical Architectural Column dividing Entrance Zone from Curved Rotunda (Image 2 & 3)
  const heroPier = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 8.85, 16), darkBronzeMat);
  heroPier.position.set(471.75, 4.42, 45.7);
  staticGroup.add(heroPier);

  // =========================================================================
  // 3. WEST ENTRANCE ZONE, LOUVERED STEEL PERGOLA CANOPY & AUTOMATIC DOORS
  // =========================================================================
  addBox(3.15, 0.36, 0.26, 463.17, 0.18, 45.85, darkBronzeMat);
  const leftBayGlass = addBox(3.15, 8.20, 0.05, 463.17, 4.46, 45.85, glassCurtainMat);
  leftBayGlass.userData.noMerge = true;
  addBox(3.25, 0.72, 0.28, 463.17, 4.30, 45.85, glossyObsidianBandMat);
  addBox(3.25, 0.36, 0.32, 463.17, 8.64, 45.85, darkBronzeMat);

  // Recessed Dark Entrance Portal Frame (X = 464.75 .. 468.05, Z = 45.85..47.05)
  addBox(0.34, 3.65, 1.25, 464.65, 1.98, 46.40, darkBronzeMat);
  addBox(0.34, 3.65, 1.25, 468.15, 1.98, 46.40, darkBronzeMat);
  addBox(3.85, 0.52, 1.30, PRADA_DOOR_X, 3.90, 46.40, darkBronzeMat);

  const rightEntryGlass = addBox(3.6, 8.20, 0.05, 469.85, 4.46, 45.85, glassCurtainMat);
  rightEntryGlass.userData.noMerge = true;
  addBox(3.65, 0.72, 0.28, 469.85, 4.30, 45.85, glossyObsidianBandMat);
  addBox(3.65, 0.36, 0.32, 469.85, 8.64, 45.85, darkBronzeMat);
  const topEntryGlass = addBox(3.4, 4.08, 0.05, PRADA_DOOR_X, 6.46, 45.85, glassCurtainMat);
  topEntryGlass.userData.noMerge = true;

  // Cantilevered Louvered Steel Pergola Canopy over Entrance (Image 2 & 3 Left Canopy)
  addBox(0.18, 0.24, 3.7, 462.35, 4.36, 44.35, darkBronzeMat);
  addBox(0.18, 0.24, 3.7, 471.35, 4.36, 44.35, darkBronzeMat);
  addBox(9.2, 0.28, 0.26, 466.85, 4.36, 42.55, glossyObsidianBandMat); // Crisp front beam for pergola signage
  for (let i = 1; i < 11; i++) {
    const lz = 42.55 + i * 0.34;
    addBox(9.05, 0.08, 0.13, 466.85, 4.36, lz, darkBronzeMat);
  }

  // Rolling Security Shutter (Active when closed 23:00 - 07:00)
  const shutterTex = createRollingShutterTexture({
    title: 'PRADA MILANO',
    hoursLabel: 'OPEN DAILY  07:00 – 23:00',
    accentHex: '#141518',
    slatDarkHex: '#1b1d21',
    slatLightHex: '#3c4048',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.42,
    metalness: 0.55,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'prada_main_shutter',
      axis: 'x',
      pos: PRADA_DOOR_Z + 0.12,
      spanCenter: PRADA_DOOR_X,
      width: 3.25,
      baseY: PRADA_PODIUM_Y,
      topY: PRADA_PODIUM_Y + 3.45,
      thickness: 0.10,
    },
    shutterMat,
    darkBronzeMat
  );

  // Animated Bi-Parting Glass Sliding Doors
  const doorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdff2ef,
    transparent: true,
    opacity: 0.38,
    roughness: 0.05,
    metalness: 0.2,
    depthWrite: false,
  });
  const makeDoorLeaf = () => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.56, 3.35, 0.05), doorGlassMat);
    panel.position.y = PRADA_PODIUM_Y + 1.68;
    leaf.add(panel);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.08, 0.07), darkBronzeMat);
    frameTop.position.y = PRADA_PODIUM_Y + 3.35;
    leaf.add(frameTop);
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.35, 8), brushedChromeMat);
    handleBar.position.set(0, PRADA_PODIUM_Y + 1.48, -0.05);
    leaf.add(handleBar);
    return leaf;
  };
  const doorLeftLeaf = makeDoorLeaf();
  const leftClosedX = PRADA_DOOR_X - 0.79;
  doorLeftLeaf.position.set(leftClosedX, 0, PRADA_DOOR_Z);
  staticGroup.add(doorLeftLeaf);

  const doorRightLeaf = makeDoorLeaf();
  const rightClosedX = PRADA_DOOR_X + 0.79;
  doorRightLeaf.position.set(rightClosedX, 0, PRADA_DOOR_Z);
  staticGroup.add(doorRightLeaf);

  // =========================================================================
  // 4. LUMINOUS PRADA SIGNAGE (100% UNOBSTRUCTED, CENTERED IN CURVED BAYS)
  // =========================================================================
  const pradaSignTex = createPradaWordmarkTex('#ffffff', 'rgba(255,255,255,0.92)');
  const pradaSignMat = new THREE.MeshStandardMaterial({
    map: pradaSignTex,
    emissive: 0xffffff,
    emissiveMap: pradaSignTex,
    emissiveIntensity: 1.55,
    transparent: true,
    roughness: 0.16,
  });
  neonMats.push(pradaSignMat);

  const pradaPlaqueTex = createPradaWordmarkTex('#ffffff', 'rgba(255,255,255,0.90)', 'M I L A N O', '#0c0d10');
  const pradaPlaqueMat = new THREE.MeshStandardMaterial({
    map: pradaPlaqueTex,
    emissive: 0xffffff,
    emissiveMap: pradaPlaqueTex,
    emissiveIntensity: 1.40,
    roughness: 0.18,
  });
  neonMats.push(pradaPlaqueMat);

  // Helper to place crystal-clear backlit PRADA badge cleanly on curved obsidian band between mullions
  const addCurvedFacadeSign = (angRad: number, width: number, height: number) => {
    const signGroup = new THREE.Group();
    const rOut = ROTUNDA_R + 0.19;
    signGroup.position.set(
      ROTUNDA_CX + Math.sin(angRad) * rOut,
      4.30,
      ROTUNDA_CZ - Math.cos(angRad) * rOut
    );
    signGroup.rotation.y = Math.PI - angRad;
    signGroup.userData.noMerge = true;

    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, height + 0.08, 0.06), glossyObsidianBandMat);
    backPlate.position.z = -0.02;
    signGroup.add(backPlate);

    const trimTop = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.03, 0.08), brushedChromeMat);
    trimTop.position.set(0, height * 0.5 + 0.04, -0.01);
    signGroup.add(trimTop);
    const trimBot = trimTop.clone();
    trimBot.position.y = -(height * 0.5 + 0.04);
    signGroup.add(trimBot);

    const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), pradaSignMat);
    face.position.z = 0.025;
    signGroup.add(face);

    staticGroup.add(signGroup);
  };

  // Placed strictly at centers of the 30° glass bays (15° and 45°) -> zero mullion overlap!
  addCurvedFacadeSign(Math.PI * (15 / 180), 4.0, 0.72);
  addCurvedFacadeSign(Math.PI * (45 / 180), 4.0, 0.72);

  // Straight North Rotunda Bay Sign (X = 474.75, facing North along Boulevard)
  const frontSignPlaque = new THREE.Group();
  frontSignPlaque.position.set(474.75, 4.30, 45.60);
  frontSignPlaque.rotation.y = Math.PI;
  frontSignPlaque.userData.noMerge = true;
  frontSignPlaque.add(new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.76, 0.06), glossyObsidianBandMat));
  const frontSignFace = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 0.72), pradaSignMat);
  frontSignFace.position.z = 0.036;
  frontSignPlaque.add(frontSignFace);
  staticGroup.add(frontSignPlaque);

  // Unobstructed Entrance Portal Sign (Y = 3.90 below louvers) + Front Pergola Nose Sign (Z = 42.39)
  const portalDoorSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.52), pradaSignMat);
  portalDoorSign.position.set(PRADA_DOOR_X, 3.88, 45.73);
  portalDoorSign.rotation.y = Math.PI;
  portalDoorSign.userData.noMerge = true;
  staticGroup.add(portalDoorSign);

  const pergolaNoseSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.68), pradaPlaqueMat);
  pergolaNoseSign.position.set(466.85, 4.36, 42.40);
  pergolaNoseSign.rotation.y = Math.PI;
  pergolaNoseSign.userData.noMerge = true;
  staticGroup.add(pergolaNoseSign);

  // =========================================================================
  // 5. WARM TIMBER-SLATTED CURVED ROOF OVERHANG & UPPER BALCONY RAIL (Image 3)
  // =========================================================================
  const ROTUNDA_ROOF_R = 11.45;
  const roofCurveSegs = 12;
  for (let i = 0; i < roofCurveSegs; i++) {
    const a0 = (i / roofCurveSegs) * Math.PI * 0.5;
    const a1 = ((i + 1) / roofCurveSegs) * Math.PI * 0.5;
    const aMid = (a0 + a1) * 0.5;
    const segLen = 2 * ROTUNDA_ROOF_R * Math.sin((a1 - a0) * 0.5);
    const sx = ROTUNDA_CX + Math.sin(aMid) * (ROTUNDA_ROOF_R - 0.85);
    const sz = ROTUNDA_CZ - Math.cos(aMid) * (ROTUNDA_ROOF_R - 0.85);
    const rotY = -aMid;

    const soffitSeg = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.14, 0.14, 1.85), timberSoffitMat);
    soffitSeg.position.set(sx, 8.76, sz);
    soffitSeg.rotation.y = rotY;
    staticGroup.add(soffitSeg);

    const edgeSeg = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.18, 0.22, 0.22), darkBronzeMat);
    edgeSeg.position.set(
      ROTUNDA_CX + Math.sin(aMid) * ROTUNDA_ROOF_R,
      8.84,
      ROTUNDA_CZ - Math.cos(aMid) * ROTUNDA_ROOF_R
    );
    edgeSeg.rotation.y = rotY;
    staticGroup.add(edgeSeg);

    const railTop = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.10, 0.06, 0.08), brushedChromeMat);
    railTop.position.set(
      ROTUNDA_CX + Math.sin(aMid) * (ROTUNDA_ROOF_R - 0.18),
      9.85,
      ROTUNDA_CZ - Math.cos(aMid) * (ROTUNDA_ROOF_R - 0.18)
    );
    railTop.rotation.y = rotY;
    staticGroup.add(railTop);

    for (let b = -1; b <= 1; b++) {
      const bAng = aMid + b * 0.33 * (a1 - a0);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.92, 0.03), brushedChromeMat);
      post.position.set(
        ROTUNDA_CX + Math.sin(bAng) * (ROTUNDA_ROOF_R - 0.18),
        9.39,
        ROTUNDA_CZ - Math.cos(bAng) * (ROTUNDA_ROOF_R - 0.18)
      );
      staticGroup.add(post);
    }
  }

  // Straight North Timber Roof Overhang & Upper Rail (X = 461.6 .. 477.6)
  addBox(16.2, 0.14, 1.85, 469.6, 8.76, 45.28, timberSoffitMat);
  addBox(16.3, 0.22, 0.22, 469.6, 8.84, 44.32, darkBronzeMat);
  addBox(16.2, 0.06, 0.08, 469.6, 9.85, 44.50, brushedChromeMat);
  for (let rx = 462.0; rx <= 477.2; rx += 0.6) {
    addBox(0.03, 0.92, 0.03, rx, 9.39, 44.50, brushedChromeMat);
  }

  // =========================================================================
  // 6. SOLID CELADON EXTERIOR SHELL & CLIPPED ROTUNDA ROOF DECK (ZERO OVERHANG ARTIFACTS!)
  // =========================================================================
  addBox(0.50, totalH, dTotal, 461.85, totalH * 0.5, midZ, celadonPlainMat); // West wall
  addBox(wTotal, totalH, 0.50, midX, totalH * 0.5, 69.75, celadonPlainMat); // South wall
  addBox(0.50, totalH, 14.2, 487.35, totalH * 0.5, 62.9, celadonPlainMat); // East wall South of curve

  // Clipped Roof Cap (rectangular rear + NW corner + curved rotunda quarter-circle!)
  addBox(wTotal + 0.3, 0.40, 14.4, midX, 8.80, 62.8, darkRoofCapMat);
  addBox(16.0, 0.40, 10.2, 469.6, 8.80, 50.9, darkRoofCapMat);
  const rotundaRoofCap = new THREE.Mesh(
    new THREE.CylinderGeometry(ROTUNDA_R + 0.06, ROTUNDA_R + 0.06, 0.40, 24, 1, false, 0, Math.PI * 0.5),
    darkRoofCapMat
  );
  rotundaRoofCap.position.set(ROTUNDA_CX, 8.80, ROTUNDA_CZ);
  staticGroup.add(rotundaRoofCap);

  // Warm Interior Boiserie Walls lining West, South & East Interior Rooms
  addBox(0.14, 8.20, 23.4, 462.14, 4.30, midZ, celadonWallMat);
  addBox(24.9, 8.20, 0.14, midX, 4.30, 69.44, celadonWallMat);
  addBox(0.14, 8.20, 13.6, 487.06, 4.30, 62.6, celadonWallMat);

  // =========================================================================
  // 7. FLOOR 1 CELADON INTERIOR, LINEAR CEILING LIGHTS & CURATED DISPLAY ZONES
  // =========================================================================
  // Floor 1 Ceiling & Linear Museum Light Strips STRICTLY clipped inside curved glass footprint!
  // Rear ceiling slab behind stairwell & Floor 2 mezzanine deck handles Z = 55.8..69.5 cleanly.
  addBox(25.0, 0.14, 13.6, midX, f2Y - 0.12, 62.6, warmWhiteCeilingMat);
  // Double-height open rotunda stays OPEN visually from Floor 1 up to Floor 2 ceiling, with Floor 2 mezzanine overhanging behind Z = 53.5..55.8!
  for (let lz = 56.2; lz <= 67.8; lz += 1.65) {
    const isStairRow = lz >= 61.8;
    const stripW = isStairRow ? 18.6 : 23.2;
    const stripX = isStairRow ? 477.5 : 474.8;
    addBox(stripW, 0.05, 0.16, stripX, f2Y - 0.21, lz, linearLightMat);
  }

  // Sculpted Floor 2 Ceiling Slab & Illuminated Museum Linear Light Baffles (Strictly clipped inside Rotunda!)
  addBox(25.0, 0.14, 13.8, midX, 8.56, 62.7, warmWhiteCeilingMat);
  addBox(15.6, 0.14, 9.8, 469.8, 8.56, 50.9, warmWhiteCeilingMat);
  const f2RotundaCeiling = new THREE.Mesh(
    new THREE.CylinderGeometry(ROTUNDA_R - 0.16, ROTUNDA_R - 0.16, 0.14, 24, 1, false, 0, Math.PI * 0.5),
    warmWhiteCeilingMat
  );
  f2RotundaCeiling.position.set(ROTUNDA_CX, 8.56, ROTUNDA_CZ);
  staticGroup.add(f2RotundaCeiling);

  // Clipped Floor 2 Linear Light Strips matching Image 2 & 3's bright striped ceiling
  for (let lz = 47.0; lz <= 68.4; lz += 1.45) {
    let rightLimit = 486.5;
    if (lz < ROTUNDA_CZ) {
      const dz = ROTUNDA_CZ - lz;
      const chord = Math.sqrt(Math.max(0, (ROTUNDA_R - 0.45) * (ROTUNDA_R - 0.45) - dz * dz));
      rightLimit = ROTUNDA_CX + chord;
    }
    const leftLimit = 462.6;
    const len = rightLimit - leftLimit;
    if (len > 1.2) {
      addBox(len, 0.05, 0.16, (leftLimit + rightLimit) * 0.5, 8.46, lz, linearLightMat);
    }
  }

  // -------------------------------------------------------------------------
  // 7A. HERO ROTUNDA FRONT WINDOW STAGE (Image 2 & 3 Showpiece!)
  // -------------------------------------------------------------------------
  // Two-tier Black Marquina Marble Podium with warm under-glow LED cove
  addBox(8.0, 0.16, 3.8, 480.2, f1Y + 0.08, 50.0, blackMarbleMat);
  addBox(7.2, 0.12, 3.0, 480.2, f1Y + 0.22, 49.9, blackMarbleMat);
  addBox(8.04, 0.03, 3.84, 480.2, f1Y + 0.02, 50.0, warmCoveLedMat);

  // 4 Hero Couture Mannequins arrayed dynamically facing street & Ngã Tư DIOR corner
  staticGroup.add(
    buildPradaCoatMannequin(477.4, f1Y + 0.28, 49.4, suitCharcoalMat, bagBlackMat, ivorySilkMat, brushedChromeMat, bagBlackMat, -0.22)
  );
  staticGroup.add(
    buildPradaCoatMannequin(479.8, f1Y + 0.28, 49.6, coatCamelMat, navyWoolMat, ivorySilkMat, warmBrassMat, bagCognacMat, -0.40)
  );
  staticGroup.add(
    buildPradaCoatMannequin(482.2, f1Y + 0.28, 50.4, forestParkaMat, suitCharcoalMat, ivorySilkMat, brushedChromeMat, bagBlackMat, -0.58)
  );
  staticGroup.add(
    buildPradaCoatMannequin(483.8, f1Y + 0.28, 52.0, navyWoolMat, bagBlackMat, ivorySilkMat, brushedChromeMat, bagBlackMat, -0.82)
  );

  // Architectural V-Leg Steel Display Tables on Rotunda Front Stage holding Signature Bags
  staticGroup.add(buildPradaWireframeTable(476.5, f1Y + 0.16, 51.1, 1.30, 0.78, 0.58, blackMarbleMat, darkBronzeMat, warmBrassMat));
  staticGroup.add(buildPradaHandbag(476.25, f1Y + 0.76, 51.1, bagCognacMat, warmBrassMat, 0.25));
  staticGroup.add(buildPradaHandbag(476.80, f1Y + 0.76, 51.1, bagBlackMat, brushedChromeMat, -0.2));

  staticGroup.add(buildPradaWireframeTable(481.2, f1Y + 0.16, 48.8, 1.25, 0.72, 0.54, blackMarbleMat, darkBronzeMat, warmBrassMat));
  staticGroup.add(buildPradaHandbag(480.95, f1Y + 0.72, 48.8, bagCrimsonMat, warmBrassMat, -0.45));
  staticGroup.add(buildPradaHandbag(481.45, f1Y + 0.72, 48.8, bagWhiteMat, brushedChromeMat, 0.15));

  // Illuminated Tall Glass Vitrine Pedestals in Left Bay & Near Entry Column
  staticGroup.add(
    buildPradaGlassVitrineTower(470.0, f1Y, 48.0, blackMarbleMat, brushedChromeMat, glassCurtainMat, warmCoveLedMat, bagWhiteMat, warmBrassMat)
  );
  addBox(1.9, 0.20, 2.2, 463.4, f1Y + 0.10, 48.2, blackMarbleMat);
  staticGroup.add(
    buildPradaCoatMannequin(463.4, f1Y + 0.20, 48.2, navyWoolMat, bagBlackMat, ivorySilkMat, brushedChromeMat, bagBlackMat, 0.18)
  );
  staticGroup.add(buildPradaHandbag(463.9, f1Y + 0.20, 49.0, bagCrimsonMat, warmBrassMat, 0.4, 1.15));

  // Olive Tree Accent beside Entry Foyer
  staticGroup.add(buildPradaOlivePlanter(469.2, f1Y, 50.8, ivoryTerrazzoMat, trunkMat, oliveLeafMat, 1.05));

  // -------------------------------------------------------------------------
  // 7B. FLOOR 1 CENTRAL LUXURY GALLERIA (3 RICH CURATED ISLANDS)
  // -------------------------------------------------------------------------
  // Island 1: Signature Saffiano & Galleria Tote Table (Z = 53.3)
  staticGroup.add(buildPradaWireframeTable(473.3, f1Y, 53.3, 3.0, 1.35, 0.80, ivoryTerrazzoMat, darkBronzeMat, brushedChromeMat));
  addBox(2.4, 0.03, 0.95, 473.3, f1Y + 0.83, 53.3, velvetBeigeMat);
  [-0.95, -0.32, 0.32, 0.95].forEach((ox, idx) => {
    const m = [bagBlackMat, bagCognacMat, bagCrimsonMat, bagOliveMat][idx];
    staticGroup.add(buildPradaHandbag(473.3 + ox, f1Y + 0.85, 53.3 + (idx % 2 === 0 ? -0.18 : 0.18), m, warmBrassMat, idx * 0.3));
  });

  // Island 2: Cleo Bags & Small Leather Accessories Table (Z = 57.2)
  staticGroup.add(buildPradaWireframeTable(473.3, f1Y, 57.2, 3.0, 1.35, 0.80, blackMarbleMat, brushedChromeMat, warmBrassMat));
  addBox(2.4, 0.03, 0.95, 473.3, f1Y + 0.83, 57.2, velvetOliveMat);
  [-0.90, -0.30, 0.30, 0.90].forEach((ox, idx) => {
    const m = [bagWhiteMat, bagBlackMat, bagCognacMat, bagBlackMat][idx];
    staticGroup.add(buildPradaHandbag(473.3 + ox, f1Y + 0.85, 57.2, m, brushedChromeMat, -idx * 0.25));
  });
  // Framed Acrylic Eyewear & Small Goods Risers on Table
  [-0.6, 0.6].forEach((ox) => {
    addBox(0.45, 0.14, 0.30, 473.3 + ox, f1Y + 0.90, 57.42, brushedChromeMat);
    addBox(0.18, 0.04, 0.08, 473.3 + ox, f1Y + 0.99, 57.42, bagBlackMat);
  });

  // Island 3: Prada Paradoxe Fragrance & Crystal Gift Vitrine Counter (Z = 60.9)
  addBox(2.9, 0.84, 1.25, 473.3, f1Y + 0.42, 60.9, ivoryTerrazzoMat);
  addBox(2.94, 0.04, 1.29, 473.3, f1Y + 0.85, 60.9, brushedChromeMat);
  [-0.95, -0.45, 0, 0.45, 0.95].forEach((ox, idx) => {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 3), parfumAmberMat);
    bottle.position.set(473.3 + ox, f1Y + 0.98, 60.85);
    bottle.rotation.y = idx * 0.4;
    staticGroup.add(bottle);
    addBox(0.24, 0.09, 0.20, 473.3 + ox, f1Y + 0.92, 61.22, boxEmeraldMat);
  });

  // -------------------------------------------------------------------------
  // 7C. FLOOR 1 WEST READY-TO-WEAR GALLERY ALCOVES (X = 462.3..464.1, Z = 51..61.8)
  // -------------------------------------------------------------------------
  addBox(1.15, 3.85, 10.6, 462.85, f1Y + 1.92, 56.3, celadonPlainMat);
  // Architectural vertical stainless wall blades dividing 3 luxury wardrobe bays
  [51.1, 54.5, 58.0, 61.5].forEach((bz) => {
    addBox(1.30, 3.92, 0.12, 463.0, f1Y + 1.96, bz, brushedChromeMat);
  });
  addBox(0.12, 0.08, 10.2, 463.48, f1Y + 3.62, 56.3, warmCoveLedMat); // Upper cove LED wash
  addBox(1.22, 0.48, 10.4, 463.02, f1Y + 0.24, 56.3, blackMarbleMat); // Lower drawer credenza plinth
  staticGroup.add(
    buildPradaGarmentRack(463.65, f1Y, 56.3, 9.2, Math.PI * 0.5, brushedChromeMat, blackMarbleMat, [
      suitCharcoalMat,
      coatCamelMat,
      navyWoolMat,
      forestParkaMat,
      ivorySilkMat,
    ])
  );
  // Editorial Lookbook Lightboxes flanking West Bays
  [52.8, 59.8].forEach((lz, lIdx) => {
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.48),
      new THREE.MeshStandardMaterial({
        map: createPradaLookbookTex((lIdx % 2) as 0 | 1),
        emissive: 0xffffff,
        emissiveMap: createPradaLookbookTex((lIdx % 2) as 0 | 1),
        emissiveIntensity: 0.35,
        roughness: 0.28,
      })
    );
    poster.position.set(463.46, f1Y + 2.58, lz);
    poster.rotation.y = Math.PI * 0.5;
    staticGroup.add(poster);
  });

  // -------------------------------------------------------------------------
  // 7D. FLOOR 1 EAST FOOTWEAR & RE-NYLON BACKLIT WALL (X = 485.0..486.9, Z = 57..67.2)
  // -------------------------------------------------------------------------
  addBox(1.15, 3.85, 10.2, 486.25, f1Y + 1.92, 62.1, celadonPlainMat);
  addBox(0.08, 3.25, 9.4, 485.64, f1Y + 2.05, 62.1, warmCoveLedMat); // Warm backlit alabaster light wall
  addBox(1.25, 0.46, 9.8, 485.95, f1Y + 0.23, 62.1, blackMarbleMat);
  [1.02, 1.66, 2.30, 2.94].forEach((shY, rIdx) => {
    addBox(0.72, 0.05, 9.2, 485.85, f1Y + shY, 62.1, brushedChromeMat);
    for (let sz = 58.0; sz <= 66.2; sz += 1.35) {
      if (rIdx % 2 === 0) {
        staticGroup.add(
          buildPradaFootwearPair(
            485.80,
            f1Y + shY + 0.03,
            sz,
            (rIdx + Math.round(sz)) % 3 === 0 ? ivorySilkMat : bagBlackMat,
            darkBronzeMat,
            -Math.PI * 0.5
          )
        );
      } else {
        staticGroup.add(
          buildPradaHandbag(
            485.80,
            f1Y + shY + 0.03,
            sz,
            (rIdx + Math.round(sz)) % 2 === 0 ? bagBlackMat : bagOliveMat,
            brushedChromeMat,
            -Math.PI * 0.5
          )
        );
      }
    }
  });

  // -------------------------------------------------------------------------
  // 7E. FLOOR 1 CLIENT VIP LOUNGE, RUG & CONCIERGE CASHWRAP
  // -------------------------------------------------------------------------
  // Area Rug + Bouclé Curved-Feeling Modular Sofa + Accent Armchair + Espresso Table
  addBox(4.4, 0.025, 5.0, 479.8, f1Y + 0.015, 58.4, rugTaupeMat);
  addBox(3.1, 0.44, 1.30, 479.8, f1Y + 0.23, 57.6, velvetBeigeMat);
  addBox(3.1, 0.42, 0.26, 479.8, f1Y + 0.65, 58.12, velvetBeigeMat);
  addBox(0.28, 0.52, 1.30, 478.38, f1Y + 0.48, 57.6, velvetBeigeMat);
  addBox(0.28, 0.52, 1.30, 481.22, f1Y + 0.48, 57.6, velvetBeigeMat);
  // Throw pillows
  addBox(0.38, 0.34, 0.16, 479.1, f1Y + 0.58, 57.88, velvetOliveMat);
  addBox(0.38, 0.34, 0.16, 480.5, f1Y + 0.58, 57.88, bagCognacMat);

  staticGroup.add(buildPradaWireframeTable(479.8, f1Y, 56.1, 1.65, 0.80, 0.42, blackMarbleMat, warmBrassMat));
  // Prada Coffee-Table Lookbook & Chrome Espresso Set
  addBox(0.36, 0.04, 0.28, 479.4, f1Y + 0.46, 56.1, bagBlackMat);
  const espressoTray = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14), brushedChromeMat);
  espressoTray.position.set(480.1, f1Y + 0.45, 56.1);
  staticGroup.add(espressoTray);

  // Pair of Velvet Accent Lounge Chairs facing South
  addBox(0.92, 0.42, 0.92, 479.8, f1Y + 0.21, 61.6, velvetOliveMat);
  addBox(0.92, 0.40, 0.20, 479.8, f1Y + 0.60, 62.0, velvetOliveMat);

  // Grand Nero Marquina Marble Concierge & Heritage Archive Back Wall
  addBox(5.6, 1.06, 1.25, 474.5, f1Y + 0.53, 65.2, blackMarbleMat);
  addBox(5.66, 0.04, 1.31, 474.5, f1Y + 1.07, 65.2, warmBrassMat);
  // Dual POS screens & emerald Prada gift box stack on concierge counter
  [-1.2, 1.2].forEach((cx) => {
    addBox(0.46, 0.30, 0.05, 474.5 + cx, f1Y + 1.25, 65.15, darkBronzeMat);
  });
  addBox(0.44, 0.16, 0.36, 474.5, f1Y + 1.16, 65.15, boxEmeraldMat);
  addBox(0.32, 0.12, 0.28, 474.5, f1Y + 1.30, 65.15, boxEmeraldMat);

  // Rear Feature Wall: Framed Prada Triangle Crest Plaque + Backlit Heritage Shelving + Credenza
  const f1WallPlaque = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), new THREE.MeshStandardMaterial({
    map: createPradaCrestLogoTex(),
    emissive: 0xffffff,
    emissiveMap: createPradaCrestLogoTex(),
    emissiveIntensity: 0.45,
    transparent: true,
    roughness: 0.2,
  }));
  f1WallPlaque.position.set(474.5, f1Y + 2.55, 69.34);
  f1WallPlaque.rotation.y = Math.PI;
  staticGroup.add(f1WallPlaque);

  addBox(4.8, 0.95, 1.05, 482.0, f1Y + 0.48, 68.5, blackMarbleMat);
  [480.6, 482.0, 483.4].forEach((bx, idx) => {
    staticGroup.add(buildPradaHandbag(bx, f1Y + 0.98, 68.45, [bagBlackMat, bagCognacMat, bagCrimsonMat][idx], warmBrassMat, Math.PI, 1.15));
  });
  staticGroup.add(buildPradaOlivePlanter(484.8, f1Y, 68.2, ivoryTerrazzoMat, trunkMat, oliveLeafMat, 1.0));

  // =========================================================================
  // 8. ARCHITECTURAL MARBLE & CRYSTAL-GLASS SW SWITCHBACK STAIRWELL (X=462.4..467.2, Z=62.5..69.4)
  // =========================================================================
  const midLandingY = f1Y + PRADA_FLOOR_H * 0.5;
  for (let s = 0; s < 10; s++) {
    const t = (s + 0.5) / 10;
    const stepY = f1Y + t * (PRADA_FLOOR_H * 0.5);
    const stepZ = 62.85 + s * 0.48;
    addBox(2.15, 0.14, 0.52, 463.6, stepY, stepZ, blackMarbleMat);
    addBox(2.08, 0.02, 0.06, 463.6, stepY - 0.075, stepZ - 0.18, warmCoveLedMat);
  }
  addBox(4.65, 0.22, 1.85, 464.8, midLandingY - 0.08, 68.5, blackMarbleMat);
  for (let s = 0; s < 10; s++) {
    const t = (s + 0.5) / 10;
    const stepY = midLandingY + t * (PRADA_FLOOR_H * 0.5);
    const stepZ = 67.35 - s * 0.48;
    addBox(2.15, 0.14, 0.52, 466.0, stepY, stepZ, blackMarbleMat);
    addBox(2.08, 0.02, 0.06, 466.0, stepY - 0.075, stepZ + 0.18, warmCoveLedMat);
  }
  // Open Architectural Center Spine & Clear Tempered Glass Balustrades (not a solid wall block!)
  addBox(0.18, PRADA_FLOOR_H + 0.85, 5.1, 464.8, f1Y + (PRADA_FLOOR_H + 0.85) * 0.5, 65.05, darkBronzeMat);
  const stairWestGlass = addBox(0.06, PRADA_FLOOR_H + 0.95, 6.8, 462.40, f1Y + (PRADA_FLOOR_H + 0.95) * 0.5, 65.95, balconyGlassMat);
  stairWestGlass.userData.noMerge = true;
  addBox(0.08, 0.06, 6.85, 462.40, f1Y + PRADA_FLOOR_H + 0.96, 65.95, brushedChromeMat);

  const stairEastGlass = addBox(0.06, PRADA_FLOOR_H + 0.95, 6.8, 467.20, f1Y + (PRADA_FLOOR_H + 0.95) * 0.5, 65.95, balconyGlassMat);
  stairEastGlass.userData.noMerge = true;
  addBox(0.08, 0.06, 6.85, 467.20, f1Y + PRADA_FLOOR_H + 0.96, 65.95, brushedChromeMat);

  addBox(2.3, 2.2, 0.16, 466.0, f1Y + 1.1, 62.65, celadonPlainMat);
  // Lookbook artwork on stairwell landing rear wall
  const landingArt = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.8),
    new THREE.MeshStandardMaterial({ map: createPradaLookbookTex(2), roughness: 0.25 })
  );
  landingArt.position.set(464.8, midLandingY + 1.75, 69.34);
  landingArt.rotation.y = Math.PI;
  staticGroup.add(landingArt);

  // =========================================================================
  // 9. FLOOR 2 MEZZANINE CURVED GLASS OVERLOOK & COUTURE SALON (Image 2 & 3!)
  // =========================================================================
  // Floor 2 Deck around Stairwell Void + Double-Height Rotunda Atrium Void
  addBox(24.8, 0.22, 6.6, midX, f2Y - 0.11, 59.1, ivoryTerrazzoMat); // Central salon slab Z = 55.8..62.4
  addBox(20.0, 0.22, 7.2, 477.4, f2Y - 0.11, 66.0, ivoryTerrazzoMat); // Rear slab behind stairwell Z = 62.4..69.6
  // Floor 2 under-curtain curved balcony ellipse infill so mezzanine balustrade connects cleanly with no gap!
  const MEZZA_R = 6.8;
  const MEZZA_CX = 477.6;
  const MEZZA_CZ = 55.6;
  const mezzaDeckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(MEZZA_R, MEZZA_R, 0.22, 24, 1, false, -Math.PI * 0.5, Math.PI),
    ivoryTerrazzoMat
  );
  mezzaDeckMesh.scale.set(1, 1, 2.2 / MEZZA_R);
  mezzaDeckMesh.position.set(MEZZA_CX, f2Y - 0.11, MEZZA_CZ);
  staticGroup.add(mezzaDeckMesh);

  // Signature Curved Black-Marble & Tempered Glass Mezzanine Balustrade (visible straight from street in Image 2 & 3!)
  const mezzaArcSteps = 12;
  for (let i = 0; i < mezzaArcSteps; i++) {
    const a0 = -Math.PI * 0.48 + (i / mezzaArcSteps) * (Math.PI * 0.96);
    const a1 = -Math.PI * 0.48 + ((i + 1) / mezzaArcSteps) * (Math.PI * 0.96);
    const aMid = (a0 + a1) * 0.5;
    const segLen = 2 * MEZZA_R * Math.sin((a1 - a0) * 0.5);
    const mx = MEZZA_CX + Math.sin(aMid) * MEZZA_R;
    const mz = MEZZA_CZ - Math.cos(aMid) * 2.2;
    const rotY = Math.atan2(-2.2 * Math.sin(aMid), MEZZA_R * Math.cos(aMid)) * 0.35;

    const marbleApron = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.18, 0.62, 0.46), blackMarbleMat);
    marbleApron.position.set(mx, f2Y + 0.16, mz);
    marbleApron.rotation.y = rotY;
    staticGroup.add(marbleApron);

    const railGlass = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.12, 0.96, 0.05), balconyGlassMat);
    railGlass.position.set(mx, f2Y + 0.95, mz);
    railGlass.rotation.y = rotY;
    railGlass.userData.noMerge = true;
    staticGroup.add(railGlass);

    const handRail = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.14, 0.05, 0.07), brushedChromeMat);
    handRail.position.set(mx, f2Y + 1.44, mz);
    handRail.rotation.y = rotY;
    staticGroup.add(handRail);

    // Tall Curved Display Arch Pedestals & Bags facing Double-Height Rotunda Window (matching Image 2 & 3 top bay!)
    if (i % 2 === 1) {
      staticGroup.add(
        buildPradaHandbag(
          mx,
          f2Y + 0.49,
          mz + 0.06,
          i % 4 === 1 ? bagBlackMat : bagCognacMat,
          warmBrassMat,
          rotY,
          1.2
        )
      );
      // Tall chrome display frame suspending leather bag high against bright ceiling
      const frameY = f2Y + 1.18;
      const archBarL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.86, 0.03), darkBronzeMat);
      archBarL.position.set(mx - 0.18, frameY + 0.45, mz + 0.14);
      staticGroup.add(archBarL);
      const archBarR = archBarL.clone();
      archBarR.position.x = mx + 0.18;
      staticGroup.add(archBarR);
      const archTop = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.03, 0.03), darkBronzeMat);
      archTop.position.set(mx, frameY + 0.88, mz + 0.14);
      staticGroup.add(archTop);
      staticGroup.add(buildPradaHandbag(mx, frameY + 0.56, mz + 0.14, bagBlackMat, brushedChromeMat, rotY, 0.92));
    }
  }

  // West Balcony Overlook Extension Rail (X = 462.4..470.8) + Down-Stair Glass Guard
  addBox(8.4, 0.55, 0.42, 466.6, f2Y + 0.16, 55.6, blackMarbleMat);
  const f2WestGlassRail = addBox(8.4, 0.96, 0.05, 466.6, f2Y + 0.95, 55.6, balconyGlassMat);
  f2WestGlassRail.userData.noMerge = true;
  addBox(8.4, 0.05, 0.07, 466.6, f2Y + 1.44, 55.6, brushedChromeMat);

  const downGuardGlass = addBox(2.2, 0.96, 0.05, 463.6, f2Y + 0.48, 62.6, balconyGlassMat);
  downGuardGlass.userData.noMerge = true;
  addBox(2.2, 0.05, 0.07, 463.6, f2Y + 0.98, 62.6, brushedChromeMat);

  // Hero Floor 2 Overlook Couture Mannequins (standing visibly on balcony in Image 2!)
  staticGroup.add(
    buildPradaCoatMannequin(469.6, f2Y, 56.2, coatCamelMat, navyWoolMat, ivorySilkMat, warmBrassMat, bagCognacMat, 0.22)
  );
  staticGroup.add(
    buildPradaCoatMannequin(471.6, f2Y, 56.0, suitCharcoalMat, bagBlackMat, ivorySilkMat, brushedChromeMat, bagBlackMat, 0.06)
  );
  staticGroup.add(
    buildPradaCoatMannequin(482.8, f2Y, 56.2, forestParkaMat, suitCharcoalMat, ivorySilkMat, brushedChromeMat, bagBlackMat, -0.35)
  );

  // -------------------------------------------------------------------------
  // 9A. FLOOR 2 WEST MENSWEAR ALCOVE & BEVELED DRESSING MIRRORS
  // -------------------------------------------------------------------------
  addBox(1.15, 3.65, 6.4, 462.9, f2Y + 1.82, 58.8, celadonPlainMat);
  addBox(0.12, 0.08, 6.0, 463.52, f2Y + 3.45, 58.8, warmCoveLedMat);
  staticGroup.add(
    buildPradaGarmentRack(463.65, f2Y, 58.8, 5.2, Math.PI * 0.5, brushedChromeMat, blackMarbleMat, [
      coatCamelMat,
      suitCharcoalMat,
      ivorySilkMat,
      navyWoolMat,
      forestParkaMat,
    ])
  );
  // Triple Beveled Dressing Salon Mirrors along West Floor 2 Wall
  [63.2, 65.6, 68.0].forEach((mz) => {
    addBox(0.06, 2.55, 1.35, 462.28, f2Y + 1.48, mz, warmCoveLedMat);
    addBox(0.08, 2.40, 1.20, 462.32, f2Y + 1.48, mz, mirrorMat);
    addBox(0.04, 2.46, 0.05, 462.35, f2Y + 1.48, mz - 0.61, brushedChromeMat);
    addBox(0.04, 2.46, 0.05, 462.35, f2Y + 1.48, mz + 0.61, brushedChromeMat);
  });

  // -------------------------------------------------------------------------
  // 9B. FLOOR 2 EAST EVENINGWEAR & PRADA MONOLITH SHOE SALON (X=484.8..486.8)
  // -------------------------------------------------------------------------
  addBox(1.25, 3.70, 10.8, 486.05, f2Y + 1.85, 62.4, celadonPlainMat);
  addBox(0.08, 3.20, 10.0, 485.38, f2Y + 1.95, 62.4, warmCoveLedMat);
  addBox(1.25, 0.44, 10.4, 485.85, f2Y + 0.22, 62.4, blackMarbleMat);
  [0.98, 1.66, 2.34, 3.00].forEach((shY, rIdx) => {
    addBox(0.75, 0.05, 9.6, 485.55, f2Y + shY, 62.4, darkBronzeMat);
    for (let sz = 58.2; sz <= 66.4; sz += 1.35) {
      if (rIdx === 0 || rIdx === 2) {
        staticGroup.add(
          buildPradaFootwearPair(
            485.55,
            f2Y + shY + 0.03,
            sz,
            (rIdx + Math.round(sz)) % 2 === 0 ? bagBlackMat : bagWhiteMat,
            darkBronzeMat,
            -Math.PI * 0.5
          )
        );
      } else {
        staticGroup.add(
          buildPradaHandbag(
            485.55,
            f2Y + shY + 0.03,
            sz,
            (rIdx + Math.round(sz)) % 2 === 0 ? bagBlackMat : bagCrimsonMat,
            warmBrassMat,
            -Math.PI * 0.5
          )
        );
      }
    }
  });

  // -------------------------------------------------------------------------
  // 9C. FLOOR 2 CENTER VIP HAUTE COUTURE LOUNGE & CRYSTAL CHANDELIER
  // -------------------------------------------------------------------------
  addBox(6.8, 0.025, 5.2, 475.5, f2Y + 0.015, 61.6, rugTaupeMat);
  // Sculptural Bouclé Double-Sided Salon Ottoman & Central Crystal Plinth
  addBox(5.2, 0.46, 2.4, 475.5, f2Y + 0.23, 61.2, velvetBeigeMat);
  addBox(4.8, 0.28, 0.22, 475.5, f2Y + 0.60, 61.2, velvetOliveMat);
  // Chrome Fitting Mirror Totem & Champagne Service Console at South end of Carpet
  staticGroup.add(buildPradaWireframeTable(475.5, f2Y, 63.1, 1.8, 0.85, 0.62, blackMarbleMat, warmBrassMat));
  const decanter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.28, 12), glassCurtainMat);
  decanter.position.set(475.2, f2Y + 0.78, 63.1);
  decanter.userData.noMerge = true;
  staticGroup.add(decanter);
  addBox(0.38, 0.04, 0.28, 475.9, f2Y + 0.66, 63.1, bagBlackMat);

  // Geometric Illuminated Triangle-Ring Chandelier hanging above Floor 2 VIP Salon
  const chandelier = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.08, 3, 1, true), warmCoveLedMat);
  chandelier.position.set(475.5, f2Y + 3.45, 61.2);
  staticGroup.add(chandelier);

  // Floor 2 VIP Exotic Trunk Credenza & Twin Olive Trees
  addBox(4.6, 0.92, 1.15, 481.6, f2Y + 0.46, 67.6, blackMarbleMat);
  addBox(4.64, 0.04, 1.19, 481.6, f2Y + 0.94, 67.6, warmBrassMat);
  staticGroup.add(buildPradaHandbag(480.4, f2Y + 0.96, 67.6, bagCognacMat, warmBrassMat, Math.PI, 1.18));
  staticGroup.add(buildPradaHandbag(481.6, f2Y + 0.96, 67.6, bagBlackMat, brushedChromeMat, Math.PI, 1.18));
  staticGroup.add(buildPradaHandbag(482.8, f2Y + 0.96, 67.6, bagWhiteMat, warmBrassMat, Math.PI, 1.18));

  staticGroup.add(buildPradaOlivePlanter(470.8, f2Y, 67.8, darkBronzeMat, trunkMat, oliveLeafMat, 1.1));
  staticGroup.add(buildPradaOlivePlanter(484.2, f2Y, 57.6, darkBronzeMat, trunkMat, oliveLeafMat, 1.0));

  // Floor 2 Backlit PRADA MILANO Triangle Crest Sign on Rear Wall
  const f2WallPlaque = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), new THREE.MeshStandardMaterial({
    map: createPradaCrestLogoTex(),
    emissive: 0xffffff,
    emissiveMap: createPradaCrestLogoTex(),
    emissiveIntensity: 0.48,
    transparent: true,
    roughness: 0.2,
  }));
  f2WallPlaque.position.set(475.5, f2Y + 2.40, 69.34);
  f2WallPlaque.rotation.y = Math.PI;
  staticGroup.add(f2WallPlaque);

  // =========================================================================
  // 10. ARCHITECTURAL NIGHT LIGHTING & PAVEMENT GLOW
  // =========================================================================
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 256;
  poolCanvas.height = 256;
  const pCtx = poolCanvas.getContext('2d')!;
  const pGrad = pCtx.createRadialGradient(128, 128, 14, 128, 128, 124);
  pGrad.addColorStop(0, 'rgba(255, 240, 212, 0.80)');
  pGrad.addColorStop(0.55, 'rgba(244, 212, 168, 0.28)');
  pGrad.addColorStop(1, 'rgba(244, 212, 168, 0.0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 256, 256);
  const poolTex = new THREE.CanvasTexture(poolCanvas);
  poolTex.colorSpace = THREE.SRGBColorSpace;

  const frontPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  poolMats.push(frontPoolMat);

  const frontPool = new THREE.Mesh(new THREE.PlaneGeometry(24.0, 9.6), frontPoolMat);
  frontPool.rotation.x = -Math.PI * 0.5;
  frontPool.position.set(476.0, 0.03, 44.0);
  frontPool.userData.noMerge = true;
  staticGroup.add(frontPool);

  let currentClosedFactor = 0;
  const addPradaLight = (
    x: number,
    y: number,
    z: number,
    color: number,
    dayInt: number,
    nightInt: number,
    dist: number,
    closedDim = 0
  ) => {
    const light = new THREE.PointLight(color, dayInt, dist, 1.32);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => (closedDim > 0 ? 1.0 - currentClosedFactor * closedDim : 1.0),
    });
  };

  // Warm Timber Overhang Uplights & Entrance Pergola Wash (Image 3 Signature Amber Glow)
  addPradaLight(482.5, 7.8, 46.8, 0xffcb8c, 0.55, 2.85, 22, 0);
  addPradaLight(PRADA_DOOR_X, 4.1, 44.5, 0xffe4be, 0.65, 2.80, 22, 0);
  // Crisp Celadon Museum Glow Inside Double-Height Rotunda Vitrine (94% luminous all night)
  addPradaLight(479.8, 3.6, 50.2, 0xf6fff2, 1.45, 3.55, 24, 0.06);
  addPradaLight(480.2, 7.6, 52.0, 0xf6fff2, 1.35, 3.25, 24, 0.06);
  // Floor 1 Salons & Concierge
  addPradaLight(473.2, 3.5, 56.2, 0xf8fff4, 1.15, 2.75, 20, 0.22);
  addPradaLight(476.5, 3.5, 64.0, 0xf8fff4, 1.05, 2.55, 20, 0.25);
  // Floor 2 Mezzanine & Shoe Salon
  addPradaLight(475.5, 7.6, 61.2, 0xf8fff4, 1.15, 2.75, 22, 0.22);

  // =========================================================================
  // 11. DYNAMIC UPDATE LOOP (ROLLING SHUTTER + AUTOMATIC BI-PARTING DOORS)
  // =========================================================================
  let doorOpen = 0;
  let shutterFactor = 0;

  const update = (
    delta: number,
    rawHour: number,
    _lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: PradaNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isPradaOpenAtHour(rawHour);

    const targetClosed = isOpen ? 0 : 1;
    shutterFactor = THREE.MathUtils.lerp(shutterFactor, targetClosed, Math.min(1, dt * 3.0));
    currentClosedFactor = shutterFactor;
    setShutterProgress(mainShutter, shutterFactor);

    let wantOpen = false;
    if (isOpen && shutterFactor < 0.35) {
      if (playerPos && Math.hypot(playerPos.x - PRADA_DOOR_X, playerPos.z - PRADA_DOOR_Z) <= 4.8) {
        wantOpen = true;
      }
      if (!wantOpen && npcController?.hasNpcNearDoor()) wantOpen = true;
    }

    doorOpen = THREE.MathUtils.lerp(doorOpen, wantOpen ? 1 : 0, Math.min(1, dt * 5.2));
    const offset = doorOpen * 1.44;
    doorLeftLeaf.position.x = leftClosedX - offset;
    doorRightLeaf.position.x = rightClosedX + offset;
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => currentClosedFactor,
    update,
  };
}

// =========================================================================
// PRADA BOUTIQUE NPC CONTROLLER (TAILORED CLIENT ADVISORS & SHOPPERS)
// =========================================================================

type PradaNpcKind = 'advisor' | 'shopper';
type PradaPhase = 'browse' | 'admire' | 'walk_leave' | 'respawn_wait';

interface PradaActor {
  id: number;
  kind: PradaNpcKind;
  root: THREE.Group;
  headMesh: THREE.Mesh;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  toteBag: THREE.Group;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: PradaPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  targetYaw: number;
  stateTimer: number;
  walkPhase: number;
  walkPhaseRef: { phase: number };
  speed: number;
  seed: number;
  exiting: boolean;
  exitDone: boolean;
  exitRef: { idx: number };
  glbHandle: GlbHumanHandle;
}

const PRADA_SHOPPER_SPOTS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [475.8, PRADA_PODIUM_Y, 51.2], yaw: -Math.PI * 0.35 },
  { pos: [469.6, PRADA_PODIUM_Y, 53.3], yaw: Math.PI * 0.5 },
  { pos: [469.6, PRADA_PODIUM_Y, 57.2], yaw: Math.PI * 0.5 },
  { pos: [483.4, PRADA_PODIUM_Y, 61.5], yaw: Math.PI * 0.5 },
  { pos: [474.5, PRADA_PODIUM_Y, 63.0], yaw: 0 },
];

export class PradaNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: PradaActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.name = 'PradaNpcGroup';

    const advisorSpecs: { x: number; y: number; z: number; yaw: number }[] = [
      // Floor 1 Concierge, Entry Host, Parfum Specialist & Footwear Specialist
      { x: 474.5, y: PRADA_PODIUM_Y, z: 66.8, yaw: Math.PI },
      { x: 468.2, y: PRADA_PODIUM_Y, z: 50.2, yaw: Math.PI * 0.9 },
      { x: 483.6, y: PRADA_PODIUM_Y, z: 59.5, yaw: -Math.PI * 0.45 },
      { x: 469.6, y: PRADA_PODIUM_Y, z: 60.8, yaw: Math.PI * 0.5 },
      // Floor 2 Mezzanine & VIP Salon Advisors
      { x: 476.4, y: PRADA_PODIUM_Y + PRADA_FLOOR_H, z: 57.6, yaw: Math.PI },
      { x: 482.5, y: PRADA_PODIUM_Y + PRADA_FLOOR_H, z: 61.8, yaw: -Math.PI * 0.5 },
    ];

    advisorSpecs.forEach((sp, idx) => {
      this.actors.push(
        this.spawnActor(idx, 'advisor', helpers, new THREE.Vector3(sp.x, sp.y, sp.z), sp.yaw)
      );
    });

    for (let i = 0; i < 4; i++) {
      const spot = PRADA_SHOPPER_SPOTS[i % PRADA_SHOPPER_SPOTS.length];
      this.actors.push(
        this.spawnActor(
          10 + i,
          'shopper',
          helpers,
          new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]),
          spot.yaw
        )
      );
    }
  }

  private spawnActor(
    id: number,
    kind: PradaNpcKind,
    helpers: HospitalCharacterHelpers,
    homePos: THREE.Vector3,
    homeYaw: number
  ): PradaActor {
    const root = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    root.add(fallbackGroup);
    root.position.copy(homePos);
    root.rotation.y = homeYaw;

    const paletteShirt = [0x141518, 0xeae5dc, 0x3b493f, 0x7c4620, 0x262933];
    const palettePants = [0x111215, 0x24262b, 0x36312e];
    const isAdvisor = kind === 'advisor';
    const shirtColor = isAdvisor ? 0x101114 : paletteShirt[id % paletteShirt.length];
    const pantsColor = isAdvisor ? 0x0d0e11 : palettePants[id % palettePants.length];
    const skinHex = ['#f2d1b2', '#e7bd94', '#efc5a2'][id % 3];

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.78 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.40 });
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: id % 2 === 0 ? 0x16161a : 0x452a19, roughness: 0.78 });

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.12, 0.74, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.70, 0.21), pantsMat);
    leftLegMesh.position.y = -0.35;
    leftLeg.add(leftLegMesh);
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.28), shoeMat);
    shoeL.position.set(0, -0.69, 0.03);
    leftLeg.add(shoeL);
    fallbackGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.12, 0.74, 0);
    rightLeg.add(leftLegMesh.clone());
    rightLeg.add(shoeL.clone());
    fallbackGroup.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.62, 0.25), shirtMat);
    torso.position.y = 1.07;
    fallbackGroup.add(torso);

    if (isAdvisor) {
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), badgeMat);
      badge.position.set(0.11, 1.24, 0.13);
      fallbackGroup.add(badge);
    }

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.30, 1.32, 0);
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.15), shirtMat);
    armLMesh.position.y = -0.25;
    leftArm.add(armLMesh);
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), skinMat);
    handL.position.y = -0.54;
    leftArm.add(handL);
    fallbackGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.30, 1.32, 0);
    rightArm.add(armLMesh.clone());
    rightArm.add(handL.clone());
    fallbackGroup.add(rightArm);

    const toteBag = new THREE.Group();
    const bagTex = createPradaShoppingBagTex();
    const bagMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.34, 0.28),
      new THREE.MeshStandardMaterial({ map: bagTex, roughness: 0.50 })
    );
    bagMesh.position.set(0.06, -0.70, 0);
    toteBag.add(bagMesh);
    toteBag.visible = kind === 'shopper' && id % 2 === 0;
    rightArm.add(toteBag);

    const headTex = helpers.createFaceTexture(isAdvisor ? 'happy' : 'neutral', skinHex);
    const headMesh = helpers.createHeadMesh(skinMat, headTex, 0.34, 0.34, 0.34);
    headMesh.position.y = 1.56;
    fallbackGroup.add(headMesh);

    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.36), hairMat);
    hairCap.position.y = 0.16;
    headMesh.add(hairCap);

    const spec = isAdvisor
      ? id === 0
        ? CASHIER_NPC_MODEL
        : pickStationaryCivilianModel(id + 113)
      : pickShopCustomerModel(id + 127);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: root,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: isAdvisor && id === 0 ? 'Checkout' : 'Idle',
      phaseOffset: id * 0.61,
    });

    this.rootGroup.add(root);

    return {
      id,
      kind,
      root,
      headMesh,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      toteBag,
      homePos: homePos.clone(),
      homeYaw,
      phase: 'admire',
      pathQueue: [],
      pathIdx: 0,
      targetYaw: homeYaw,
      stateTimer: 1.5 + (id % 5) * 0.9,
      walkPhase: id * 1.4,
      walkPhaseRef: { phase: id * 1.4 },
      speed: kind === 'shopper' ? 1.55 + (id % 2) * 0.18 : 1.35,
      seed: id * 1.73,
      exiting: false,
      exitDone: false,
      exitRef: { idx: 0 },
      glbHandle,
    };
  }

  private assignNewSpot(a: PradaActor, spawnOutside = false) {
    const spot = PRADA_SHOPPER_SPOTS[(a.id + Math.floor(this.timer * 0.5)) % PRADA_SHOPPER_SPOTS.length];
    const targetPos = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]);
    a.targetYaw = spot.yaw;

    if (spawnOutside) {
      a.root.position.set(PRADA_DOOR_X + (a.id % 2 === 0 ? -3.5 : 3.5), 0.02, 43.2);
      a.pathQueue = [
        new THREE.Vector3(PRADA_DOOR_X, 0.04, 44.8),
        new THREE.Vector3(PRADA_DOOR_X, PRADA_PODIUM_Y, 47.2),
        new THREE.Vector3(PRADA_DOOR_X, PRADA_PODIUM_Y, 50.6),
        targetPos,
      ];
    } else {
      a.pathQueue = [new THREE.Vector3(468.8, PRADA_PODIUM_Y, 55.2), targetPos];
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
      if (!a.root.visible || a.homePos.y > PRADA_PODIUM_Y + 0.5) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - PRADA_DOOR_X, p.z - PRADA_DOOR_Z) <= 3.6) return true;
    }
    return false;
  }

  private stepPath(a: PradaActor, dt: number): boolean {
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
    const isOpen = isPradaOpenAtHour(rawHour);

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
          new THREE.Vector3(PRADA_DOOR_X, PRADA_PODIUM_Y, 50.6),
          new THREE.Vector3(PRADA_DOOR_X, PRADA_PODIUM_Y, 47.2),
          new THREE.Vector3(PRADA_DOOR_X, 0.04, 44.8),
          new THREE.Vector3(PRADA_DOOR_X + (a.id % 2 === 0 ? -4.5 : 4.5), 0.02, 42.5),
        ];
        if (a.homePos.y > PRADA_PODIUM_Y + 0.5) {
          a.pathQueue = [
            new THREE.Vector3(466.0, PRADA_PODIUM_Y + PRADA_FLOOR_H, 62.2),
            new THREE.Vector3(466.0, PRADA_PODIUM_Y + PRADA_FLOOR_H * 0.5, 68.4),
            new THREE.Vector3(463.6, PRADA_PODIUM_Y + PRADA_FLOOR_H * 0.5, 68.4),
            new THREE.Vector3(463.6, PRADA_PODIUM_Y, 62.2),
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
          a.toteBag.visible = Math.random() > 0.4;
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
              new THREE.Vector3(PRADA_DOOR_X, PRADA_PODIUM_Y, 50.6),
              new THREE.Vector3(PRADA_DOOR_X, PRADA_PODIUM_Y, 47.2),
              new THREE.Vector3(PRADA_DOOR_X, 0.04, 44.8),
              new THREE.Vector3(PRADA_DOOR_X + (a.id % 2 === 0 ? -4.5 : 4.5), 0.02, 42.8),
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
