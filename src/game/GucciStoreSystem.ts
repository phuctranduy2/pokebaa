import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isGucciOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface GucciBuildResult {
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
    npcController?: GucciNpcController | null
  ) => void;
}

// =========================================================================
// GUCCI FLAGSHIP BOUTIQUE — EUROPEAN PALAZZO 3-FLOOR EDITION
// Directly East of Louis Vuitton along Đại lộ Đông Tây (X = 413.0 .. 434.8, Z = -11.6 .. 15.58)
// Podium Floor: Y = 0.16m (Floor 1 = 0.16, Floor 2 = 4.26, Floor 3 = 8.36)
// Central Grand Brass Portal: X = 423.9, Z = 13.6 (3.2m clear automatic doors, 07:00 - 23:00)
// =========================================================================

export const GUCCI_PODIUM_Y = 0.16;
export const GUCCI_FLOOR_H = 4.1;

const GUCCI_DOOR_X = 423.9;
const GUCCI_DOOR_Z = 13.6;

export const GUCCI_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 (Y = 0.16m) — European Storefront, Eyewear & Central Gallery
  // =========================================================================
  { minX: 412.8, maxX: 413.5, minZ: -11.6, maxZ: 13.9, floor: 1 }, // West Wall
  { minX: 434.1, maxX: 434.9, minZ: -11.6, maxZ: 13.9, floor: 1 }, // East Wall
  { minX: 412.8, maxX: 434.9, minZ: -11.8, maxZ: -11.0, floor: 1 }, // North Rear Wall

  // South Glass Storefront split cleanly around 3.2m Main Doorway (X = 422.3 .. 425.5)
  { minX: 413.0, maxX: 422.25, minZ: 13.35, maxZ: 13.95, floor: 1 }, // South Left Window Bay
  { minX: 425.55, maxX: 434.8, minZ: 13.35, maxZ: 13.95, floor: 1 }, // South Right Window Bay

  // Floor 1 Interior Display Furniture, Entrance Urns & Stairwell Rails
  { minX: 420.6, maxX: 421.5, minZ: 13.9, maxZ: 14.8, floor: 1 }, // Left Entrance Topiary Urn
  { minX: 426.3, maxX: 427.2, minZ: 13.9, maxZ: 14.8, floor: 1 }, // Right Entrance Topiary Urn
  { minX: 414.1, maxX: 419.6, minZ: 9.8, maxZ: 12.8, floor: 1 }, // Left Eyewear Console, Mannequin & Trunk
  { minX: 428.2, maxX: 433.7, minZ: 9.8, maxZ: 12.8, floor: 1 }, // Right Eyewear Console, Mannequin & Trunk
  { minX: 422.3, maxX: 425.5, minZ: 4.5, maxZ: 6.3, floor: 1 }, // Central Jewelry & Accessory Vitrine
  { minX: 421.4, maxX: 426.4, minZ: -3.5, maxZ: -1.8, floor: 1 }, // Heritage Concierge Desk & Lamps
  { minX: 414.0, maxX: 415.4, minZ: -8.5, maxZ: 7.5, floor: 1 }, // West Leather Goods Niche Wall
  { minX: 432.4, maxX: 433.9, minZ: -2.0, maxZ: 8.5, floor: 1 }, // East Handbag & Loafer Wall
  { minX: 428.65, maxX: 428.95, minZ: -11.1, maxZ: -4.1, floor: 1 }, // NE Stairwell West Balustrade
  { minX: 431.22, maxX: 431.58, minZ: -9.25, maxZ: -4.1, floor: 1 }, // NE Stairwell Center Spine
  { minX: 431.5, maxX: 434.1, minZ: -4.45, maxZ: -4.1, floor: 1 }, // Floor 1 Under-Stair Partition

  // =========================================================================
  // FLOOR 2 (Y = 4.26m) — European Portrait Salon & Brass Handbag Gallery
  // =========================================================================
  { minX: 412.8, maxX: 413.5, minZ: -11.6, maxZ: 13.9, floor: 2 },
  { minX: 434.1, maxX: 434.9, minZ: -11.6, maxZ: 13.9, floor: 2 },
  { minX: 412.8, maxX: 434.9, minZ: -11.8, maxZ: -11.0, floor: 2 },
  { minX: 413.0, maxX: 434.8, minZ: 13.35, maxZ: 13.95, floor: 2 },
  { minX: 428.65, maxX: 428.95, minZ: -11.1, maxZ: -4.1, floor: 2 }, // Stairwell West Balustrade
  { minX: 431.22, maxX: 431.58, minZ: -9.25, maxZ: -4.1, floor: 2 }, // Stairwell Center Spine
  { minX: 415.2, maxX: 419.6, minZ: 4.5, maxZ: 9.8, floor: 2 }, // Left Portrait Salon Velvet Sofa & Table
  { minX: 421.8, maxX: 432.6, minZ: 4.7, maxZ: 6.1, floor: 2 }, // Brass-Grid Double-Sided Handbag Vitrine
  { minX: 422.4, maxX: 426.2, minZ: 7.8, maxZ: 9.6, floor: 2 }, // Consultation Desk & Banker Lamp
  { minX: 417.5, maxX: 418.5, minZ: 11.1, maxZ: 12.1, floor: 2 }, // Floor 2 Left Window Mannequin
  { minX: 429.3, maxX: 430.3, minZ: 11.1, maxZ: 12.1, floor: 2 }, // Floor 2 Right Window Mannequin

  // =========================================================================
  // FLOOR 3 (Y = 8.36m) — Emerald Boiserie Archive & VIP Handbag Sanctuary
  // =========================================================================
  { minX: 412.8, maxX: 413.5, minZ: -11.6, maxZ: 13.9, floor: 3 },
  { minX: 434.1, maxX: 434.9, minZ: -11.6, maxZ: 13.9, floor: 3 },
  { minX: 412.8, maxX: 434.9, minZ: -11.8, maxZ: -11.0, floor: 3 },
  { minX: 413.0, maxX: 434.8, minZ: 13.35, maxZ: 13.95, floor: 3 },
  { minX: 428.65, maxX: 428.95, minZ: -11.1, maxZ: -4.1, floor: 3 }, // Stairwell West Balustrade
  { minX: 431.22, maxX: 431.58, minZ: -9.25, maxZ: -4.1, floor: 3 }, // Stairwell Center Spine
  { minX: 428.9, maxX: 431.25, minZ: -5.1, maxZ: -4.1, floor: 3 }, // Floor 3 Left-Bay Velvet Rope Barrier
  { minX: 420.2, maxX: 427.6, minZ: 5.5, maxZ: 7.3, floor: 3 }, // Center Emerald Boiserie Wall & Credenza (street-visible!)
  { minX: 414.2, maxX: 416.2, minZ: -4.0, maxZ: 9.2, floor: 3 }, // West Handbag Archive Shelves
  { minX: 431.8, maxX: 433.6, minZ: -1.0, maxZ: 9.2, floor: 3 }, // East Handbag Archive Shelves
  { minX: 416.4, maxX: 418.4, minZ: 7.9, maxZ: 9.1, floor: 3 }, // Left Venetian Glass Hero Vitrine
  { minX: 429.4, maxX: 431.4, minZ: 7.9, maxZ: 9.1, floor: 3 }, // Right Venetian Glass Hero Vitrine
  { minX: 416.8, maxX: 418.8, minZ: 10.0, maxZ: 11.4, floor: 3 }, // Left VIP Ottoman Pod
  { minX: 429.0, maxX: 431.0, minZ: 10.0, maxZ: 11.4, floor: 3 }, // Right VIP Ottoman Pod
  { minX: 414.5, maxX: 415.6, minZ: 10.9, maxZ: 12.0, floor: 3 }, // Floor 3 Left Runway Mannequin
  { minX: 432.2, maxX: 433.3, minZ: 10.9, maxZ: 12.0, floor: 3 }, // Floor 3 Right Runway Mannequin
];

// =========================================================================
// PROCEDURAL EUROPEAN HERITAGE & GUCCI TEXTURES
// =========================================================================

function createGucciWordmarkTex(fontPx = 112): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const title = 'GUCCI';
  const spacing = 148;
  const startX = w * 0.5 - (title.length - 1) * spacing * 0.5;

  ctx.save();
  ctx.shadowColor = 'rgba(255, 226, 160, 0.96)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#fff8e6';
  ctx.font = `600 ${fontPx}px "Cinzel", "Times New Roman", "Georgia", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < title.length; i++) {
    ctx.fillText(title[i], startX + i * spacing, h * 0.52);
  }
  ctx.restore();

  ctx.fillStyle = '#fff9eb';
  ctx.font = `600 ${fontPx}px "Cinzel", "Times New Roman", "Georgia", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < title.length; i++) {
    ctx.fillText(title[i], startX + i * spacing, h * 0.52);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createEuropeanTravertineTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#cfc3b0';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const y = (i / 40) * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(158, 140, 118, 0.16)' : 'rgba(244, 236, 224, 0.18)';
    ctx.fillRect(0, y, size, 6 + (i % 4) * 3);
  }

  ctx.strokeStyle = 'rgba(92, 78, 63, 0.25)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= size; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let x = 0; x <= size; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  return tex;
}

function createPersianRugTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#7b1e23';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4a656';
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  ctx.strokeStyle = '#18392b';
  ctx.lineWidth = 8;
  ctx.strokeRect(48, 48, w - 96, h - 96);

  // Ornamental central diamond motifs
  ctx.fillStyle = '#a82c2c';
  for (let cy = 220; cy <= h - 220; cy += 290) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, cy - 95);
    ctx.lineTo(w * 0.72, cy);
    ctx.lineTo(w * 0.5, cy + 95);
    ctx.lineTo(w * 0.28, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e6c177';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPortraitArtTex(idx: number): THREE.CanvasTexture {
  const w = 256;
  const h = 340;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = idx % 2 === 0 ? '#d8d0c4' : '#26221e';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#6c5a44';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  // Classic sepia/monochrome silhouette figure
  ctx.fillStyle = idx % 2 === 0 ? '#2b2622' : '#cfc6b8';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.36, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.72, 68, 72, 0, Math.PI, 0, false);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGucciWebCrestTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#143224';
  ctx.fillRect(0, 0, w, h);

  // Classic Gucci Green-Red-Green Web stripe across lower ribbon
  ctx.fillStyle = '#0f3d28';
  ctx.fillRect(0, h * 0.74, w, 18);
  ctx.fillStyle = '#9b1c24';
  ctx.fillRect(0, h * 0.81, w, 18);
  ctx.fillStyle = '#0f3d28';
  ctx.fillRect(0, h * 0.88, w, 18);

  ctx.strokeStyle = '#d9b166';
  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = '#f8ecd4';
  ctx.font = '600 58px "Cinzel", "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G U C C I', w * 0.5, h * 0.38);

  ctx.fillStyle = '#e0be79';
  ctx.font = '600 22px "Montserrat", sans-serif';
  ctx.fillText('FIRENZE • 1921', w * 0.5, h * 0.58);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Geometric Cipollino & Bardiglio Palazzo Marble Floor Texture (inspired by Gucci Milan Via Monte Napoleone)
function createGucciMarbleTileTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#efe7da';
  ctx.fillRect(0, 0, size, size);

  const q = size * 0.5;
  // Diagonal dark-emerald / charcoal Bardiglio diamond inlays
  ctx.fillStyle = '#1f2924';
  ctx.beginPath();
  ctx.moveTo(q, 24);
  ctx.lineTo(size - 24, q);
  ctx.lineTo(q, size - 24);
  ctx.lineTo(24, q);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#e6dccb';
  ctx.beginPath();
  ctx.moveTo(q, 62);
  ctx.lineTo(size - 62, q);
  ctx.lineTo(q, size - 62);
  ctx.lineTo(62, q);
  ctx.closePath();
  ctx.fill();

  // Subtle brass geometric border lines
  ctx.strokeStyle = '#b9934c';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.strokeRect(24, 24, size - 48, size - 48);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 6);
  tex.anisotropy = 4;
  return tex;
}

// Illuminated Interlocking GG & Firenze 1921 Medallion Crest for Pediment & Pillars
function createGucciGgMedallionTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#142a1f';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e4be73';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#9b1c24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(128, 128, 96, 0, Math.PI * 2);
  ctx.stroke();

  // Interlocking double-G arcs
  ctx.strokeStyle = '#fff3d4';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(110, 128, 34, 0.45, Math.PI * 2 - 0.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(146, 128, 34, Math.PI + 0.45, Math.PI * 3 - 0.45);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildGucciMannequin(
  x: number,
  y: number,
  z: number,
  yaw: number,
  outfitMat: THREE.Material,
  accentMat: THREE.Material,
  brassMat: THREE.Material,
  plinthMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.24, 0.84), plinthMat);
  plinth.position.y = 0.12;
  grp.add(plinth);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.88), brassMat);
  rim.position.y = 0.24;
  grp.add(rim);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.65 });
  [-0.1, 0.1].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.78, 0.15), legMat);
    leg.position.set(lx, 0.65, 0);
    grp.add(leg);
  });

  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.22), outfitMat);
  coat.position.set(0, 1.32, 0);
  grp.add(coat);

  // Signature Gucci Web Sash / Belt Accent
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.24), accentMat);
  belt.position.set(0, 1.09, 0);
  grp.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), brassMat);
  head.position.set(0, 1.78, 0);
  grp.add(head);

  return grp;
}

function buildGucciChandelier(x: number, y: number, z: number, brassMat: THREE.Material, glowMat: THREE.Material): THREE.Group {
  const ch = new THREE.Group();
  ch.position.set(x, y, z);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8), brassMat);
  rod.position.y = 0.32;
  ch.add(rod);

  const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 8, 28), brassMat);
  ringOuter.rotation.x = Math.PI * 0.5;
  ch.add(ringOuter);

  const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 22), brassMat);
  ringInner.rotation.x = Math.PI * 0.5;
  ringInner.position.y = -0.22;
  ch.add(ringInner);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), glowMat);
    globe.position.set(Math.cos(a) * 0.95, 0.05, Math.sin(a) * 0.95);
    ch.add(globe);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), glowMat);
    drop.position.set(Math.cos(a) * 0.55, -0.22, Math.sin(a) * 0.55);
    ch.add(drop);
  }
  return ch;
}

// =========================================================================
// MAIN GUCCI BOUTIQUE STRUCTURE BUILDER
// =========================================================================

export function createGucciStoreStructure(): GucciBuildResult {
  const staticGroup = new THREE.Group();
  staticGroup.name = 'GucciFlagshipGroup';

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared European Luxury Palette
  const travertineTex = createEuropeanTravertineTex();
  const travertineStoneMat = new THREE.MeshStandardMaterial({
    map: travertineTex,
    color: 0xddd2c0,
    roughness: 0.62,
    metalness: 0.05,
  });
  const slateStoneMat = new THREE.MeshStandardMaterial({
    color: 0x1d1f21,
    roughness: 0.52,
    metalness: 0.16,
  });
  const brushedBrassMat = new THREE.MeshStandardMaterial({
    color: 0xc9a35f,
    emissive: 0x453110,
    emissiveIntensity: 0.24,
    roughness: 0.26,
    metalness: 0.86,
  });
  lanternMats.push(brushedBrassMat);

  const warmWalnutMat = new THREE.MeshStandardMaterial({
    color: 0x562f18,
    roughness: 0.44,
    metalness: 0.08,
  });
  const creamBoiserieMat = new THREE.MeshStandardMaterial({
    color: 0xeadfce,
    emissive: 0x47331b,
    emissiveIntensity: 0.22,
    roughness: 0.58,
  });
  lanternMats.push(creamBoiserieMat);

  const emeraldBoiserieMat = new THREE.MeshStandardMaterial({
    color: 0x133827,
    emissive: 0x0a2216,
    emissiveIntensity: 0.22,
    roughness: 0.62,
  });
  const emeraldVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x184e38,
    roughness: 0.86,
  });
  const gucciRedMat = new THREE.MeshStandardMaterial({
    color: 0x8f1d24,
    roughness: 0.72,
  });
  const marbleFloorTex = createGucciMarbleTileTex();
  const warmMarbleFloorMat = new THREE.MeshStandardMaterial({
    map: marbleFloorTex,
    roughness: 0.20,
    metalness: 0.10,
  });
  const warmCeilingMat = new THREE.MeshStandardMaterial({
    color: 0xf4eadc,
    emissive: 0x6b4b24,
    emissiveIntensity: 0.34,
    roughness: 0.66,
  });
  lanternMats.push(warmCeilingMat);

  const warmGlowLedMat = new THREE.MeshStandardMaterial({
    color: 0xfff0cc,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.48,
    roughness: 0.24,
  });
  neonMats.push(warmGlowLedMat);

  const lampShadeMat = new THREE.MeshStandardMaterial({
    color: 0xfff7e6,
    emissive: 0xffd27d,
    emissiveIntensity: 1.35,
    roughness: 0.45,
  });
  neonMats.push(lampShadeMat);

  const clearStoreGlassMat = new THREE.MeshStandardMaterial({
    color: 0xebe6dd,
    transparent: true,
    opacity: 0.16,
    roughness: 0.06,
    metalness: 0.12,
    depthWrite: false,
  });

  // =========================================================================
  // 1. PODIUM SLAB, FORECOURT STEP & EUROPEAN PALAZZO SHELL
  // =========================================================================
  // Full-width forecourt stone apron bridging Gucci facade (Z = 13.68) seamlessly to boulevard sidewalk (Z = 15.64)
  const forecourtApron = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.05, 1.96), slateStoneMat);
  forecourtApron.position.set(GUCCI_DOOR_X, 0.0, 14.66);
  staticGroup.add(forecourtApron);

  // Structural Podium Slab strictly inside building footprint (Z = -11.60 .. +13.70, top Y = 0.16)
  const podium = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.34, 25.3), slateStoneMat);
  podium.position.set(GUCCI_DOOR_X, -0.01, 1.05);
  staticGroup.add(podium);

  // Clean Granite Entry Step strictly in front of podium (Z = 13.70 .. 14.90, top Y = 0.10 -> zero z-fighting!)
  const frontStep = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.10, 1.2), travertineStoneMat);
  frontStep.position.set(GUCCI_DOOR_X, 0.05, 14.3);
  staticGroup.add(frontStep);

  // Side Passage Paving cleanly between Louis Vuitton (411.5) and Gucci (412.9)
  const alleyApron = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 26.8), slateStoneMat);
  alleyApron.position.set(412.2, 0.0, 1.8);
  staticGroup.add(alleyApron);

  // Exterior Solid Structural Stone Envelope (West, East, North, Roof)
  const westSolidWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 13.0, 25.4), travertineStoneMat);
  westSolidWall.position.set(413.15, 6.5, 1.0);
  staticGroup.add(westSolidWall);

  const eastSolidWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 13.0, 25.4), travertineStoneMat);
  eastSolidWall.position.set(434.55, 6.5, 1.0);
  staticGroup.add(eastSolidWall);

  const northSolidWall = new THREE.Mesh(new THREE.BoxGeometry(22.0, 13.0, 0.65), travertineStoneMat);
  northSolidWall.position.set(GUCCI_DOOR_X, 6.5, -11.45);
  staticGroup.add(northSolidWall);

  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.55, 26.2), slateStoneMat);
  roofCap.position.set(GUCCI_DOOR_X, 12.95, 1.2);
  staticGroup.add(roofCap);

  // European Classical Roof Cornice Molding, Carved Dentils, Balustrades & Central Florentine Pediment
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(23.1, 0.36, 26.7), travertineStoneMat);
  cornice.position.set(GUCCI_DOOR_X, 12.55, 1.35);
  staticGroup.add(cornice);

  // Dentil molding blocks along front cornice soffit
  for (let dx = 413.4; dx <= 434.4; dx += 0.65) {
    const dentil = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.28), travertineStoneMat);
    dentil.position.set(dx, 12.34, 14.32);
    staticGroup.add(dentil);
  }

  // Rooftop Stone Balustrades flanking the Central Pediment (Y = 13.0..13.85)
  [
    [414.1, 420.5],
    [427.3, 433.7],
  ].forEach(([x1, x2]) => {
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, 0.14, 0.38), travertineStoneMat);
    railTop.position.set((x1 + x2) * 0.5, 13.78, 14.05);
    staticGroup.add(railTop);
    for (let bx = x1 + 0.3; bx <= x2 - 0.3; bx += 0.62) {
      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.62, 8), travertineStoneMat);
      baluster.position.set(bx, 13.42, 14.05);
      staticGroup.add(baluster);
    }
  });

  // Central European Palazzo Pediment + Illuminated "GG" Firenze Medallion (X = 420.6..427.2, Y = 13.1..14.8)
  const pedBase = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.95, 0.55), slateStoneMat);
  pedBase.position.set(GUCCI_DOOR_X, 13.62, 14.0);
  staticGroup.add(pedBase);
  const pedArchTop = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.52, 24, 1, false, 0, Math.PI), travertineStoneMat);
  pedArchTop.rotation.z = Math.PI * 0.5;
  pedArchTop.rotation.y = Math.PI * 0.5;
  pedArchTop.scale.set(1, 0.42, 1);
  pedArchTop.position.set(GUCCI_DOOR_X, 14.06, 14.02);
  staticGroup.add(pedArchTop);

  const ggMedallionTex = createGucciGgMedallionTex();
  const ggMedallionMat = new THREE.MeshStandardMaterial({
    map: ggMedallionTex,
    emissive: 0xffe4a8,
    emissiveMap: ggMedallionTex,
    emissiveIntensity: 0.95,
    roughness: 0.25,
  });
  neonMats.push(ggMedallionMat);
  const pedCrest = new THREE.Mesh(new THREE.CircleGeometry(0.68, 24), ggMedallionMat);
  pedCrest.position.set(GUCCI_DOOR_X, 13.85, 14.32);
  pedCrest.userData.noMerge = true;
  staticGroup.add(pedCrest);

  // =========================================================================
  // 2. SIGNATURE 3-TIER EUROPEAN FACADE, JULIET BALCONIES & FLUTED PILASTERS
  // =========================================================================
  // Left & Right Fluted Travertine Palazzo Corner Pilasters + Brass Capitals & Facade Uplights
  [413.35, 434.35].forEach((px) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.18, 12.6, 0.95), travertineStoneMat);
    pier.position.set(px, 6.3, 13.55);
    staticGroup.add(pier);

    [-0.32, 0, 0.32].forEach((fx) => {
      const flute = new THREE.Mesh(new THREE.BoxGeometry(0.10, 12.2, 0.10), brushedBrassMat);
      flute.position.set(px + fx, 6.3, 14.04);
      staticGroup.add(flute);
    });

    [3.96, 8.2, 12.35].forEach((cy) => {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.22, 1.08), travertineStoneMat);
      cap.position.set(px, cy, 13.58);
      staticGroup.add(cap);
    });

    // Wall Sconce Uplight Lanterns on Corner Piers
    const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.44, 0.24), warmGlowLedMat);
    sconce.position.set(px, 2.75, 14.12);
    staticGroup.add(sconce);
  });

  // Charcoal Pietra-Serena Horizontal Entablature Lintels (above F1, F2, F3) + Signature Green-Red-Green Accent Line
  [3.96, 8.2, 12.35].forEach((ly, idx) => {
    const bandH = idx === 0 ? 0.64 : 0.48;
    const band = new THREE.Mesh(new THREE.BoxGeometry(21.8, bandH, 0.85), slateStoneMat);
    band.position.set(GUCCI_DOOR_X, ly, 13.65);
    staticGroup.add(band);

    const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.05, 0.90), brushedBrassMat);
    brassTrim.position.set(GUCCI_DOOR_X, ly - bandH * 0.5 + 0.02, 13.68);
    staticGroup.add(brassTrim);

    if (idx === 0) {
      const webGreenTop = new THREE.Mesh(new THREE.BoxGeometry(21.3, 0.04, 0.91), emeraldVelvetMat);
      webGreenTop.position.set(GUCCI_DOOR_X, ly + bandH * 0.5 - 0.04, 13.68);
      staticGroup.add(webGreenTop);
      const webRedMid = new THREE.Mesh(new THREE.BoxGeometry(21.3, 0.04, 0.92), gucciRedMat);
      webRedMid.position.set(GUCCI_DOOR_X, ly + bandH * 0.5 - 0.09, 13.68);
      staticGroup.add(webRedMid);
    }
  });

  // Ornate Wrought-Iron & Brushed-Brass European Juliet Balconies across Floor 2 & Floor 3 Windows!
  [4.32, 8.48].forEach((by) => {
    [
      [414.2, 420.6],
      [421.0, 426.8],
      [427.2, 433.6],
    ].forEach(([bx1, bx2]) => {
      const span = bx2 - bx1;
      const cx = (bx1 + bx2) * 0.5;
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(span, 0.055, 0.14), brushedBrassMat);
      topRail.position.set(cx, by + 0.86, 13.92);
      staticGroup.add(topRail);
      const botRail = new THREE.Mesh(new THREE.BoxGeometry(span, 0.05, 0.12), slateStoneMat);
      botRail.position.set(cx, by + 0.08, 13.92);
      staticGroup.add(botRail);
      for (let rx = bx1 + 0.25; rx <= bx2 - 0.25; rx += 0.42) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.76, 0.035), slateStoneMat);
        bar.position.set(rx, by + 0.47, 13.92);
        staticGroup.add(bar);
      }
      // Brass center medallion on each balcony
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.06), brushedBrassMat);
      badge.rotation.z = Math.PI * 0.25;
      badge.position.set(cx, by + 0.48, 13.95);
      staticGroup.add(badge);
    });
  });

  // Backlit Main "G U C C I" Wordmark above Central Portal (Y = 3.96) + Upper Crown "G U C C I" Sign (Y = 12.35)
  const gucciSignTex = createGucciWordmarkTex(112);
  const gucciSignMat = new THREE.MeshStandardMaterial({
    map: gucciSignTex,
    transparent: true,
    alphaTest: 0.08,
    emissive: 0xffe4a8,
    emissiveMap: gucciSignTex,
    emissiveIntensity: 1.5,
    roughness: 0.18,
  });
  neonMats.push(gucciSignMat);

  const mainSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.85), gucciSignMat);
  mainSignPlane.position.set(GUCCI_DOOR_X, 3.96, 14.12);
  mainSignPlane.userData.noMerge = true;
  staticGroup.add(mainSignPlane);

  const upperSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.56), gucciSignMat);
  upperSignPlane.position.set(GUCCI_DOOR_X, 12.35, 14.12);
  upperSignPlane.userData.noMerge = true;
  staticGroup.add(upperSignPlane);

  // Florentine Brass Wall Lanterns & Fluted Stone Topiary Urns flanking the Ground Portal
  [420.8, 426.95].forEach((lx) => {
    const lanternFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.24), brushedBrassMat);
    lanternFrame.position.set(lx, 2.65, 13.90);
    staticGroup.add(lanternFrame);
    const lanternCore = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.26), warmGlowLedMat);
    lanternCore.position.set(lx, 2.65, 13.90);
    staticGroup.add(lanternCore);
  });

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1a472a, roughness: 0.86 });
  [421.05, 426.75].forEach((ux) => {
    const stepTopY = 0.10;
    const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.62, 14), slateStoneMat);
    urn.position.set(ux, stepTopY + 0.31, 14.35);
    staticGroup.add(urn);
    const urnRim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.08, 14), brushedBrassMat);
    urnRim.position.set(ux, stepTopY + 0.62, 14.35);
    staticGroup.add(urnRim);
    const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), foliageMat);
    sphere1.position.set(ux, stepTopY + 0.98, 14.35);
    staticGroup.add(sphere1);
    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), foliageMat);
    sphere2.position.set(ux, stepTopY + 1.44, 14.35);
    staticGroup.add(sphere2);
  });

  // Left Corner Side Return Dark Plaque + Glowing "G U C C I" (matching Image 2 left edge!)
  const sidePlaque = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 2.4), slateStoneMat);
  sidePlaque.position.set(412.82, 3.35, 12.1);
  staticGroup.add(sidePlaque);
  const sideSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.46), gucciSignMat);
  sideSignPlane.rotation.y = -Math.PI * 0.5;
  sideSignPlane.position.set(412.71, 3.35, 12.1);
  sideSignPlane.userData.noMerge = true;
  staticGroup.add(sideSignPlane);

  // West Corner Ground Display Window peeking toward LV Alley (Z = 8.4..10.8)
  const westWindowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.4, 2.4), brushedBrassMat);
  westWindowFrame.position.set(412.8, 1.86, 9.6);
  staticGroup.add(westWindowFrame);

  // Brushed Brass Vertical Storefront Mullions splitting the 3 Symmetrical Bays on Floors 1, 2 & 3
  // Ground Floor: Portal spans 420.9 .. 426.9, Window Bays 413.9..420.7 & 427.1..433.9
  [413.95, 420.8, 426.95, 433.8].forEach((mx) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.18, 12.15, 0.24), brushedBrassMat);
    col.position.set(mx, 6.24, 13.64);
    staticGroup.add(col);
  });

  // Ground Floor Left & Right Clear Storefront Glass Panes
  const gLeftGlass = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 3.48), clearStoreGlassMat);
  gLeftGlass.position.set(417.38, GUCCI_PODIUM_Y + 1.74, 13.62);
  gLeftGlass.userData.noMerge = true;
  staticGroup.add(gLeftGlass);

  const gRightGlass = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 3.48), clearStoreGlassMat);
  gRightGlass.position.set(430.38, GUCCI_PODIUM_Y + 1.74, 13.62);
  gRightGlass.userData.noMerge = true;
  staticGroup.add(gRightGlass);

  // Central Portal Side Glass Panes flanking the 3.2m Double Automatic Doors (X = 420.9..422.3 & 425.5..426.9)
  [421.55, 426.25].forEach((sx) => {
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 3.48), clearStoreGlassMat);
    sideGlass.position.set(sx, GUCCI_PODIUM_Y + 1.74, 13.62);
    sideGlass.userData.noMerge = true;
    staticGroup.add(sideGlass);
  });

  // Upper Floors (F2 Y = 4.28..7.95, F3 Y = 8.45..12.12) Crystal-Clear Show Window Glass
  [6.12, 10.28].forEach((gy) => {
    const upperBayGlass = new THREE.Mesh(new THREE.PlaneGeometry(20.0, 3.65), clearStoreGlassMat);
    upperBayGlass.position.set(GUCCI_DOOR_X, gy, 13.62);
    upperBayGlass.userData.noMerge = true;
    staticGroup.add(upperBayGlass);
  });

  // Automatic Bi-Parting Brass-Framed Glass Doors (X = 423.9, Z = 13.65, 3.2m clear opening!)
  const makeGucciDoorLeaf = () => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.58, 3.2, 0.05), clearStoreGlassMat);
    pane.position.y = 1.6;
    leaf.add(pane);

    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.09, 0.08), brushedBrassMat);
    topFrame.position.y = 3.22;
    leaf.add(topFrame);
    const botFrame = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.09, 0.08), brushedBrassMat);
    botFrame.position.y = 0.045;
    leaf.add(botFrame);

    [-0.78, 0.78].forEach((rx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.26, 0.07), brushedBrassMat);
      stile.position.set(rx, 1.63, 0);
      leaf.add(stile);
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 8), brushedBrassMat);
    handle.position.set(0, 1.32, 0.06);
    leaf.add(handle);
    return leaf;
  };

  const doorLeftLeaf = makeGucciDoorLeaf();
  const leftClosedX = GUCCI_DOOR_X - 0.8;
  doorLeftLeaf.position.set(leftClosedX, GUCCI_PODIUM_Y, GUCCI_DOOR_Z);
  staticGroup.add(doorLeftLeaf);

  const doorRightLeaf = makeGucciDoorLeaf();
  const rightClosedX = GUCCI_DOOR_X + 0.8;
  doorRightLeaf.position.set(rightClosedX, GUCCI_PODIUM_Y, GUCCI_DOOR_Z);
  staticGroup.add(doorRightLeaf);

  // Rolling Security Shutter (07:00 - 23:00)
  const gucciShutterTex = createRollingShutterTexture({
    title: 'GUCCI FIRENZE',
    hoursLabel: 'OPEN 07:00 - 23:00',
    accentHex: '#c9a35f',
    slatDarkHex: '#18241d',
    slatLightHex: '#2b3b32',
  });
  const gucciShutterMat = new THREE.MeshStandardMaterial({
    map: gucciShutterTex,
    roughness: 0.48,
    metalness: 0.55,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'gucci-south-shutter',
      axis: 'x',
      pos: 13.52,
      spanCenter: GUCCI_DOOR_X,
      width: 3.3,
      baseY: GUCCI_PODIUM_Y,
      topY: GUCCI_PODIUM_Y + 3.28,
      thickness: 0.08,
    },
    gucciShutterMat,
    slateStoneMat
  );

  // =========================================================================
  // 3. WALKABLE 3-FLOOR STRUCTURAL SLABS + NE GRAND EUROPEAN STAIRWELL
  // Stairwell Void: X = 428.8 .. 434.2, Z = -11.1 .. -4.2
  // =========================================================================
  const GUCCI_FLOOR2_Y = GUCCI_PODIUM_Y + GUCCI_FLOOR_H; // 4.26m
  const GUCCI_FLOOR3_Y = GUCCI_PODIUM_Y + GUCCI_FLOOR_H * 2; // 8.36m

  const addGucciSlab = (topY: number, thickness: number, mat: THREE.Material, hasStairVoid: boolean) => {
    const segs: [number, number, number, number][] = [
      // Left Full Band: X = 413.4..428.8, Z = -11.2..13.55
      [421.1, 1.175, 15.4, 24.75],
      // Right South of Stairwell: X = 428.8..434.3, Z = -4.2..13.55
      [431.55, 4.675, 5.5, 17.75],
    ];
    if (!hasStairVoid) {
      // Roof cover over stairwell: X = 428.8..434.3, Z = -11.2..-4.2
      segs.push([431.55, -7.7, 5.5, 7.0]);
    }
    segs.forEach(([cx, cz, w, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
      m.position.set(cx, topY - thickness * 0.5, cz);
      staticGroup.add(m);
    });
  };

  addGucciSlab(GUCCI_FLOOR2_Y, 0.24, warmMarbleFloorMat, true);
  addGucciSlab(GUCCI_FLOOR3_Y, 0.24, warmMarbleFloorMat, true);
  addGucciSlab(12.48, 0.24, warmCeilingMat, false);

  // Warm recessed ceiling light panels across all 3 floors (makes interior glow like Image 2!)
  [GUCCI_FLOOR2_Y - 0.26, GUCCI_FLOOR3_Y - 0.26, 12.22].forEach((cy) => {
    [417.3, 423.9, 430.5].forEach((lx) => {
      [9.5, 3.2, -3.5].forEach((lz) => {
        const downlight = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12), warmGlowLedMat);
        downlight.position.set(lx, cy, lz);
        staticGroup.add(downlight);
      });
    });
  });

  // Grand European NE Switchback Staircase (X = 428.8 .. 434.0, Z = -11.1 .. -4.2)
  const buildGucciStairFlight = (baseY: number) => {
    const stepsPerHalf = 10;
    const halfRise = GUCCI_FLOOR_H * 0.5;
    const runLen = 5.0; // Z = -4.2 -> -9.2

    // Left Flight UP North (X = 428.95..431.25, cx = 430.10)
    for (let s = 0; s < stepsPerHalf; s++) {
      const t = (s + 1) / stepsPerHalf;
      const sy = baseY + t * halfRise;
      const sz = -4.2 - ((s + 0.5) / stepsPerHalf) * runLen;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.54), warmMarbleFloorMat);
      tread.position.set(430.1, sy - 0.09, sz);
      staticGroup.add(tread);

      const led = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.025, 0.04), warmGlowLedMat);
      led.position.set(430.1, sy - 0.015, sz + 0.25);
      staticGroup.add(led);
    }

    // Half-Landing (X = 428.95..434.0, Z = -11.1..-9.2)
    const landing = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.22, 1.9), warmMarbleFloorMat);
    landing.position.set(431.48, baseY + halfRise - 0.11, -10.15);
    staticGroup.add(landing);

    const wallSconce = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.10), warmGlowLedMat);
    wallSconce.position.set(431.48, baseY + halfRise + 1.15, -11.06);
    staticGroup.add(wallSconce);

    // Right Flight UP South (X = 431.55..433.95, cx = 432.75)
    for (let s = 0; s < stepsPerHalf; s++) {
      const t = (s + 1) / stepsPerHalf;
      const sy = baseY + halfRise + t * halfRise;
      const sz = -9.2 + ((s + 0.5) / stepsPerHalf) * runLen;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.54), warmMarbleFloorMat);
      tread.position.set(432.75, sy - 0.09, sz);
      staticGroup.add(tread);

      const led = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.025, 0.04), warmGlowLedMat);
      led.position.set(432.75, sy - 0.015, sz - 0.25);
      staticGroup.add(led);
    }

    // Center Spine & West Brass-Glass Balustrade
    const spineGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.1, 5.0), clearStoreGlassMat);
    spineGlass.position.set(431.4, baseY + halfRise + 0.55, -6.7);
    spineGlass.userData.noMerge = true;
    staticGroup.add(spineGlass);

    const spinePost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), brushedBrassMat);
    spinePost.position.set(431.4, baseY + 1.1, -4.2);
    staticGroup.add(spinePost);

    const westRailGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 6.9), clearStoreGlassMat);
    westRailGlass.position.set(428.8, baseY + halfRise + 0.3, -7.65);
    westRailGlass.userData.noMerge = true;
    staticGroup.add(westRailGlass);

    const westHandrail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 6.96), warmWalnutMat);
    westHandrail.position.set(428.8, baseY + 0.98, -7.65);
    staticGroup.add(westHandrail);
  };
  buildGucciStairFlight(GUCCI_PODIUM_Y);
  buildGucciStairFlight(GUCCI_FLOOR2_Y);

  // Floor 1 Under-Stair Walnut Partition (X = 431.5..434.0, Z = -4.25)
  const underStair = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.8, 0.22), warmWalnutMat);
  underStair.position.set(432.75, GUCCI_PODIUM_Y + 1.9, -4.25);
  staticGroup.add(underStair);

  // Floor 3 Left-Bay Velvet Rope Barrier
  [429.2, 430.9].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.13, 0.94, 10), brushedBrassMat);
    post.position.set(px, GUCCI_FLOOR3_Y + 0.47, -4.2);
    staticGroup.add(post);
  });
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.7, 8), gucciRedMat);
  rope.rotation.z = Math.PI * 0.5;
  rope.position.set(430.05, GUCCI_FLOOR3_Y + 0.82, -4.2);
  staticGroup.add(rope);

  // =========================================================================
  // 4. FLOOR 1 INTERIOR (IMAGE 2: EYEWEAR WINDOWS, PERSIAN RUG, CENTRAL SALON)
  // =========================================================================
  const f1Marble = new THREE.Mesh(new THREE.BoxGeometry(20.8, 0.025, 24.4), warmMarbleFloorMat);
  f1Marble.position.set(GUCCI_DOOR_X, GUCCI_PODIUM_Y - 0.008, 1.1);
  staticGroup.add(f1Marble);

  // Signature Deep Red European Persian Carpet down Center Aisle (X = 423.9, Z = -2.0..12.2)
  const rugTex = createPersianRugTex();
  const rugMat = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.9 });
  const centerCarpet = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.02, 13.8), rugMat);
  centerCarpet.position.set(GUCCI_DOOR_X, GUCCI_PODIUM_Y + 0.018, 5.2);
  staticGroup.add(centerCarpet);

  // Left & Right Illuminated Eyewear Window Displays (exact match to Image 2 Ground Floor bays!)
  const buildEyewearBay = (cx: number) => {
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.5, 0.16), creamBoiserieMat);
    backWall.position.set(cx, GUCCI_PODIUM_Y + 1.75, 10.15);
    staticGroup.add(backWall);

    // Warm brass frame trim around backlit eyewear niche
    const nicheGlow = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 0.35), warmGlowLedMat);
    nicheGlow.position.set(cx, GUCCI_PODIUM_Y + 3.2, 10.35);
    staticGroup.add(nicheGlow);

    // Walnut & emerald chest credenza below eyewear wall
    const chest = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.86, 0.92), warmWalnutMat);
    chest.position.set(cx, GUCCI_PODIUM_Y + 0.43, 11.1);
    staticGroup.add(chest);
    const chestTop = new THREE.Mesh(new THREE.BoxGeometry(3.88, 0.05, 0.96), brushedBrassMat);
    chestTop.position.set(cx, GUCCI_PODIUM_Y + 0.88, 11.1);
    staticGroup.add(chestTop);

    // 4 Illuminated Eyewear Shelves x 4 Pairs of Sunglasses facing the street!
    for (let r = 0; r < 4; r++) {
      const sy = GUCCI_PODIUM_Y + 1.25 + r * 0.45;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.035, 0.22), brushedBrassMat);
      shelf.position.set(cx, sy, 10.32);
      staticGroup.add(shelf);

      for (let c = 0; c < 4; c++) {
        const sx = cx - 1.35 + c * 0.9;
        const frames = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.06), slateStoneMat);
        frames.position.set(sx, sy + 0.07, 10.34);
        staticGroup.add(frames);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.07), brushedBrassMat);
        rim.position.set(sx, sy + 0.11, 10.34);
        staticGroup.add(rim);
      }
    }
  };
  buildEyewearBay(417.1);
  buildEyewearBay(430.7);

  // Runway Mannequins & Heritage Leather Trunks in Front Window Corners (immediately visible from boulevard!)
  staticGroup.add(
    buildGucciMannequin(414.8, GUCCI_PODIUM_Y, 12.1, 0.25, emeraldVelvetMat, gucciRedMat, brushedBrassMat, slateStoneMat)
  );
  staticGroup.add(
    buildGucciMannequin(433.0, GUCCI_PODIUM_Y, 12.1, -0.25, gucciRedMat, emeraldVelvetMat, brushedBrassMat, slateStoneMat)
  );
  [419.1, 428.7].forEach((tx, idx) => {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.44, 0.52), idx === 0 ? warmWalnutMat : emeraldBoiserieMat);
    trunk.position.set(tx, GUCCI_PODIUM_Y + 1.12, 11.1);
    staticGroup.add(trunk);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.54), brushedBrassMat);
    strap.position.set(tx, GUCCI_PODIUM_Y + 1.12, 11.1);
    staticGroup.add(strap);
  });

  // Grand Brass & Globe Chandelier above Floor 1 Center Gallery
  staticGroup.add(buildGucciChandelier(GUCCI_DOOR_X, GUCCI_PODIUM_Y + 3.45, 5.4, brushedBrassMat, warmGlowLedMat));

  // Central Walnut & Brass Jewelry Island (X = 423.9, Z = 5.4) with Glowing Jewels Inside
  const f1CenterIsland = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.94, 1.35), warmWalnutMat);
  f1CenterIsland.position.set(GUCCI_DOOR_X, GUCCI_PODIUM_Y + 0.47, 5.4);
  staticGroup.add(f1CenterIsland);
  const f1CenterGlass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.36, 1.25), clearStoreGlassMat);
  f1CenterGlass.position.set(GUCCI_DOOR_X, GUCCI_PODIUM_Y + 1.12, 5.4);
  f1CenterGlass.userData.noMerge = true;
  staticGroup.add(f1CenterGlass);
  const f1CenterBrass = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.04, 1.32), brushedBrassMat);
  f1CenterBrass.position.set(GUCCI_DOOR_X, GUCCI_PODIUM_Y + 1.31, 5.4);
  staticGroup.add(f1CenterBrass);
  [-0.7, 0, 0.7].forEach((jx) => {
    const jewelPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.32), emeraldVelvetMat);
    jewelPedestal.position.set(GUCCI_DOOR_X + jx, GUCCI_PODIUM_Y + 1.01, 5.4);
    staticGroup.add(jewelPedestal);
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), warmGlowLedMat);
    jewel.position.set(GUCCI_DOOR_X + jx, GUCCI_PODIUM_Y + 1.15, 5.4);
    staticGroup.add(jewel);
  });

  // Heritage Concierge Desk flanked by Two Warm White-Shaded Brass Lamps (seen dead-center through Image 2 doors!)
  const f1Desk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.96, 1.2), warmWalnutMat);
  f1Desk.position.set(GUCCI_DOOR_X, GUCCI_PODIUM_Y + 0.48, -2.6);
  staticGroup.add(f1Desk);
  [-1.7, 1.7].forEach((ox) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.10, 0.48, 10), brushedBrassMat);
    stem.position.set(GUCCI_DOOR_X + ox, GUCCI_PODIUM_Y + 1.20, -2.6);
    staticGroup.add(stem);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.28, 14), lampShadeMat);
    shade.position.set(GUCCI_DOOR_X + ox, GUCCI_PODIUM_Y + 1.54, -2.6);
    staticGroup.add(shade);
  });

  // Gucci Crest & Red-Green Web Heritage Plaque on Rear North Wall (Z = -11.0)
  const crestTex = createGucciWebCrestTex();
  const crestMat = new THREE.MeshStandardMaterial({
    map: crestTex,
    emissive: 0xffe0a8,
    emissiveMap: crestTex,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  neonMats.push(crestMat);
  const f1Crest = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.4), crestMat);
  f1Crest.position.set(GUCCI_DOOR_X, GUCCI_PODIUM_Y + 2.15, -11.05);
  f1Crest.userData.noMerge = true;
  staticGroup.add(f1Crest);

  // West & East Side Wall Handbag Shelving Bays on Floor 1
  const bagPalette = [0x1c1917, 0x7c2d12, 0x8f1d24, 0xeadfce, 0x184e38, 0x3b2316];
  const addHandbagShelfRack = (
    x: number,
    yBase: number,
    zCenter: number,
    lenZ: number,
    facingDirX: number,
    rows = 3
  ) => {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.9, lenZ), warmWalnutMat);
    back.position.set(x, yBase + 1.45, zCenter);
    staticGroup.add(back);

    for (let r = 0; r < rows; r++) {
      const sy = yBase + 0.85 + r * 0.72;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, lenZ - 0.2), brushedBrassMat);
      shelf.position.set(x + facingDirX * 0.28, sy, zCenter);
      staticGroup.add(shelf);

      const count = Math.max(2, Math.floor(lenZ / 1.1));
      for (let b = 0; b < count; b++) {
        const bz = zCenter - lenZ * 0.4 + (b / Math.max(1, count - 1)) * (lenZ * 0.8);
        const bMat = new THREE.MeshStandardMaterial({
          color: bagPalette[(r + b) % bagPalette.length],
          roughness: 0.42,
          metalness: 0.12,
        });
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.36), bMat);
        bag.position.set(x + facingDirX * 0.28, sy + 0.16, bz);
        staticGroup.add(bag);

        const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.08), brushedBrassMat);
        clasp.position.set(x + facingDirX * 0.28, sy + 0.18, bz);
        staticGroup.add(clasp);
      }
    }
  };
  addHandbagShelfRack(414.25, GUCCI_PODIUM_Y, -0.5, 14.0, 1, 3);
  addHandbagShelfRack(433.55, GUCCI_PODIUM_Y, 3.2, 9.6, -1, 3);

  // =========================================================================
  // 5. FLOOR 2 INTERIOR (Y = 4.26m — PORTRAIT SALON, MANNEQUINS & BRASS VITRINES)
  // =========================================================================
  const f2PersianRug = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.025, 7.6), rugMat);
  f2PersianRug.position.set(417.6, GUCCI_FLOOR2_Y + 0.02, 7.2);
  staticGroup.add(f2PersianRug);

  // Floor 2 Brass & Globe Chandeliers visible right behind the Level 2 glass
  staticGroup.add(buildGucciChandelier(417.8, GUCCI_FLOOR2_Y + 3.45, 9.2, brushedBrassMat, warmGlowLedMat));
  staticGroup.add(buildGucciChandelier(427.6, GUCCI_FLOOR2_Y + 3.45, 8.6, brushedBrassMat, warmGlowLedMat));

  // Floor 2 Window Mannequins
  staticGroup.add(
    buildGucciMannequin(418.0, GUCCI_FLOOR2_Y, 11.6, 0.18, creamBoiserieMat, emeraldVelvetMat, brushedBrassMat, slateStoneMat)
  );
  staticGroup.add(
    buildGucciMannequin(429.8, GUCCI_FLOOR2_Y, 11.6, -0.18, emeraldVelvetMat, gucciRedMat, brushedBrassMat, slateStoneMat)
  );

  // 5a. Left European Portrait & Emerald Velvet Lounge (X = 414.0..420.5, Z = 4.0..11.2)
  const f2PortraitWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 8.2), creamBoiserieMat);
  f2PortraitWall.position.set(413.7, GUCCI_FLOOR2_Y + 1.8, 7.2);
  staticGroup.add(f2PortraitWall);

  [4.8, 7.2, 9.6].forEach((pz, idx) => {
    const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.48, 1.12), brushedBrassMat);
    pFrame.position.set(413.84, GUCCI_FLOOR2_Y + 2.05, pz);
    staticGroup.add(pFrame);

    const pTex = createPortraitArtTex(idx);
    const pMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.55 });
    const pPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 1.34), pMat);
    pPlane.rotation.y = Math.PI * 0.5;
    pPlane.position.set(413.9, GUCCI_FLOOR2_Y + 2.05, pz);
    pPlane.userData.noMerge = true;
    staticGroup.add(pPlane);
  });

  // Emerald Velvet Armchair + Sofa + Walnut Lamp Table
  const f2Sofa = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.46, 3.2), emeraldVelvetMat);
  f2Sofa.position.set(416.1, GUCCI_FLOOR2_Y + 0.23, 7.2);
  staticGroup.add(f2Sofa);
  const f2SofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.56, 3.2), emeraldVelvetMat);
  f2SofaBack.position.set(415.65, GUCCI_FLOOR2_Y + 0.66, 7.2);
  staticGroup.add(f2SofaBack);

  const f2CoffeeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.60, 0.42, 16), brushedBrassMat);
  f2CoffeeTable.position.set(417.9, GUCCI_FLOOR2_Y + 0.21, 7.2);
  staticGroup.add(f2CoffeeTable);

  const f2LampStand = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.78, 0.85), warmWalnutMat);
  f2LampStand.position.set(416.1, GUCCI_FLOOR2_Y + 0.39, 9.5);
  staticGroup.add(f2LampStand);
  const f2TableLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.30, 14), lampShadeMat);
  f2TableLamp.position.set(416.1, GUCCI_FLOOR2_Y + 1.18, 9.5);
  staticGroup.add(f2TableLamp);

  // 5b. Right Brass-Grid Illuminated Handbag Vitrine Gallery (moved forward to Z = 5.4 for prominent street & interior impact)
  const f2VitrineBase = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.72, 1.1), warmWalnutMat);
  f2VitrineBase.position.set(427.2, GUCCI_FLOOR2_Y + 0.36, 5.4);
  staticGroup.add(f2VitrineBase);

  for (let vx = 422.2; vx <= 432.2; vx += 2.0) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.95, 0.85), brushedBrassMat);
    post.position.set(vx, GUCCI_FLOOR2_Y + 2.18, 5.4);
    staticGroup.add(post);
  }
  [GUCCI_FLOOR2_Y + 1.38, GUCCI_FLOOR2_Y + 2.15, GUCCI_FLOOR2_Y + 2.92].forEach((sy, rIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.05, 0.82), brushedBrassMat);
    shelf.position.set(427.2, sy, 5.4);
    staticGroup.add(shelf);
    const shelfLed = new THREE.Mesh(new THREE.BoxGeometry(9.9, 0.02, 0.08), warmGlowLedMat);
    shelfLed.position.set(427.2, sy - 0.03, 5.72);
    staticGroup.add(shelfLed);

    for (let bx = 422.8; bx <= 431.6; bx += 1.45) {
      const bMat = new THREE.MeshStandardMaterial({
        color: bagPalette[(rIdx + Math.round(bx)) % bagPalette.length],
        roughness: 0.4,
      });
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.26), bMat);
      bag.position.set(bx, sy + 0.2, 5.4);
      staticGroup.add(bag);
    }
  });

  // Floor 2 Consultation Desk + Banker Lamp (X = 424.3, Z = 8.7)
  const f2Desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.92, 1.15), warmWalnutMat);
  f2Desk.position.set(424.3, GUCCI_FLOOR2_Y + 0.46, 8.7);
  staticGroup.add(f2Desk);
  const f2DeskLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.26, 12), lampShadeMat);
  f2DeskLamp.position.set(423.3, GUCCI_FLOOR2_Y + 1.24, 8.7);
  staticGroup.add(f2DeskLamp);

  // =========================================================================
  // 6. FLOOR 3 INTERIOR (Y = 8.36m — EMERALD BOISERIE SANCTUARY + PULEGOSO VITRINES, STREET-VISIBLE!)
  // =========================================================================
  // Signature Floor 3 Red Persian Carpet & Twin Brass Chandeliers directly behind Level 3 Windows!
  const f3PersianRug = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.025, 5.4), rugMat);
  f3PersianRug.position.set(GUCCI_DOOR_X, GUCCI_FLOOR3_Y + 0.02, 10.0);
  staticGroup.add(f3PersianRug);

  staticGroup.add(buildGucciChandelier(417.6, GUCCI_FLOOR3_Y + 3.42, 9.8, brushedBrassMat, warmGlowLedMat));
  staticGroup.add(buildGucciChandelier(GUCCI_DOOR_X, GUCCI_FLOOR3_Y + 3.42, 9.8, brushedBrassMat, warmGlowLedMat));
  staticGroup.add(buildGucciChandelier(430.2, GUCCI_FLOOR3_Y + 3.42, 9.8, brushedBrassMat, warmGlowLedMat));

  // Center Emerald-Green Fluted Boiserie Wall + Illuminated Handbag Archive brought forward to Z = 6.2 so it shines from the street!
  const f3EmeraldBack = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.65, 0.28), emeraldBoiserieMat);
  f3EmeraldBack.position.set(GUCCI_DOOR_X, GUCCI_FLOOR3_Y + 1.82, 5.85);
  staticGroup.add(f3EmeraldBack);

  [-3.45, -1.8, 1.8, 3.45].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.65, 0.34), brushedBrassMat);
    pilaster.position.set(GUCCI_DOOR_X + px, GUCCI_FLOOR3_Y + 1.82, 5.90);
    staticGroup.add(pilaster);
  });

  // Backlit Gucci Firenze 1921 Crest on Top Center of Emerald Boiserie Wall
  const f3Crest = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.96), crestMat);
  f3Crest.position.set(GUCCI_DOOR_X, GUCCI_FLOOR3_Y + 3.12, 6.01);
  f3Crest.userData.noMerge = true;
  staticGroup.add(f3Crest);

  const f3Credenza = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.88, 1.05), warmWalnutMat);
  f3Credenza.position.set(GUCCI_DOOR_X, GUCCI_FLOOR3_Y + 0.44, 6.55);
  staticGroup.add(f3Credenza);

  [GUCCI_FLOOR3_Y + 1.25, GUCCI_FLOOR3_Y + 1.92, GUCCI_FLOOR3_Y + 2.52].forEach((sy, rIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.05, 0.46), warmWalnutMat);
    shelf.position.set(GUCCI_DOOR_X, sy, 6.18);
    staticGroup.add(shelf);
    const shelfLed = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.03, 0.07), warmGlowLedMat);
    shelfLed.position.set(GUCCI_DOOR_X, sy - 0.03, 6.38);
    staticGroup.add(shelfLed);

    for (let i = 0; i < 4; i++) {
      const hx = GUCCI_DOOR_X - 2.1 + i * 1.4;
      const bMat = new THREE.MeshStandardMaterial({
        color: bagPalette[(rIdx * 2 + i) % bagPalette.length],
        roughness: 0.36,
      });
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.26), bMat);
      bag.position.set(hx, sy + 0.2, 6.20);
      staticGroup.add(bag);
    }
  });

  // Twin Venetian Pulegoso Glass & Brass Hero Vitrines on Floor 3 (Left Bay X=417.4, Right Bay X=430.4, Z=8.5)
  [417.4, 430.4].forEach((vx, vIdx) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.92, 0.85), warmWalnutMat);
    base.position.set(vx, GUCCI_FLOOR3_Y + 0.46, 8.5);
    staticGroup.add(base);
    const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.45, 0.78), clearStoreGlassMat);
    caseGlass.position.set(vx, GUCCI_FLOOR3_Y + 1.65, 8.5);
    caseGlass.userData.noMerge = true;
    staticGroup.add(caseGlass);
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.08, 0.88), brushedBrassMat);
    topCap.position.set(vx, GUCCI_FLOOR3_Y + 2.41, 8.5);
    staticGroup.add(topCap);
    const innerPad = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.48), emeraldVelvetMat);
    innerPad.position.set(vx, GUCCI_FLOOR3_Y + 0.99, 8.5);
    staticGroup.add(innerPad);
    const heroBag = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.42, 0.30),
      vIdx === 0 ? gucciRedMat : emeraldVelvetMat
    );
    heroBag.position.set(vx, GUCCI_FLOOR3_Y + 1.28, 8.5);
    staticGroup.add(heroBag);
    const spotLed = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12), warmGlowLedMat);
    spotLed.position.set(vx, GUCCI_FLOOR3_Y + 2.34, 8.5);
    staticGroup.add(spotLed);
  });

  // Floor 3 Window Runway Mannequins (Left X=415.0, Right X=432.8, Z=11.4)
  staticGroup.add(
    buildGucciMannequin(415.0, GUCCI_FLOOR3_Y, 11.4, 0.22, gucciRedMat, brushedBrassMat, brushedBrassMat, slateStoneMat)
  );
  staticGroup.add(
    buildGucciMannequin(432.8, GUCCI_FLOOR3_Y, 11.4, -0.22, emeraldVelvetMat, brushedBrassMat, brushedBrassMat, slateStoneMat)
  );

  // Left & Right Glowing Archive Handbag Walls + Velvet Ottomans on Floor 3
  addHandbagShelfRack(414.4, GUCCI_FLOOR3_Y, 2.6, 12.0, 1, 3);
  addHandbagShelfRack(433.3, GUCCI_FLOOR3_Y, 4.1, 9.6, -1, 3);

  [
    [417.8, 10.6, emeraldVelvetMat],
    [430.0, 10.6, gucciRedMat],
  ].forEach(([ox, oz, mat]) => {
    const ottoman = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.72, 0.48, 18), mat as THREE.Material);
    ottoman.position.set(ox as number, GUCCI_FLOOR3_Y + 0.24, oz as number);
    staticGroup.add(ottoman);
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.06, 18), brushedBrassMat);
    trim.position.set(ox as number, GUCCI_FLOOR3_Y + 0.03, oz as number);
    staticGroup.add(trim);
  });

  // =========================================================================
  // 7. ARCHITECTURAL WARM GOLDEN LIGHTING & GROUND POOL
  // =========================================================================
  const poolTexCanvas = document.createElement('canvas');
  poolTexCanvas.width = 256;
  poolTexCanvas.height = 256;
  const pCtx = poolTexCanvas.getContext('2d')!;
  const pGrad = pCtx.createRadialGradient(128, 128, 10, 128, 128, 124);
  pGrad.addColorStop(0, 'rgba(255, 218, 152, 0.75)');
  pGrad.addColorStop(0.55, 'rgba(240, 175, 82, 0.30)');
  pGrad.addColorStop(1, 'rgba(240, 175, 82, 0.0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 256, 256);
  const poolTex = new THREE.CanvasTexture(poolTexCanvas);
  poolTex.colorSpace = THREE.SRGBColorSpace;

  const frontPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  poolMats.push(frontPoolMat);

  const frontPool = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 8.0), frontPoolMat);
  frontPool.rotation.x = -Math.PI * 0.5;
  frontPool.position.set(GUCCI_DOOR_X, 0.03, 15.8);
  frontPool.userData.noMerge = true;
  staticGroup.add(frontPool);

  let currentClosedFactor = 0;
  const addGucciLight = (
    x: number,
    y: number,
    z: number,
    color: number,
    dayInt: number,
    nightInt: number,
    dist: number,
    dimWhenClosed = false
  ) => {
    const light = new THREE.PointLight(color, dayInt, dist, 1.4);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => (dimWhenClosed ? 1.0 - currentClosedFactor * 0.72 : 1.0),
    });
  };

  // Warm gold European interior & facade glow across all 3 levels
  addGucciLight(GUCCI_DOOR_X, 3.6, 15.6, 0xffdba6, 0.48, 2.5, 22, false);
  // Floor 1
  addGucciLight(417.1, 3.2, 10.5, 0xffe4b5, 0.90, 2.3, 18, true);
  addGucciLight(430.7, 3.2, 10.5, 0xffe4b5, 0.90, 2.3, 18, true);
  addGucciLight(GUCCI_DOOR_X, 3.2, 1.5, 0xffe0ad, 0.95, 2.4, 20, true);
  // Floor 2
  addGucciLight(418.0, 7.4, 7.5, 0xffe0ad, 0.92, 2.4, 20, true);
  addGucciLight(428.0, 7.4, 6.5, 0xffe0ad, 0.92, 2.4, 20, true);
  // Floor 3
  addGucciLight(GUCCI_DOOR_X, 11.4, 5.5, 0xffe0ad, 0.95, 2.5, 22, true);

  // =========================================================================
  // 8. DYNAMIC UPDATE LOOP (SHUTTER + AUTOMATIC BI-PARTING DOORS)
  // =========================================================================
  let doorOpen = 0;
  let shutterFactor = 0;

  const update = (
    delta: number,
    rawHour: number,
    _lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: GucciNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isGucciOpenAtHour(rawHour);

    const targetClosed = isOpen ? 0 : 1;
    shutterFactor = THREE.MathUtils.lerp(shutterFactor, targetClosed, Math.min(1, dt * 3.0));
    currentClosedFactor = shutterFactor;
    setShutterProgress(mainShutter, shutterFactor);

    let wantOpen = false;
    if (isOpen && shutterFactor < 0.35) {
      if (playerPos && Math.hypot(playerPos.x - GUCCI_DOOR_X, playerPos.z - GUCCI_DOOR_Z) <= 4.8) {
        wantOpen = true;
      }
      if (!wantOpen && npcController?.hasNpcNearDoor()) wantOpen = true;
    }

    doorOpen = THREE.MathUtils.lerp(doorOpen, wantOpen ? 1 : 0, Math.min(1, dt * 5.2));
    const offset = doorOpen * 1.48;
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
// GUCCI BOUTIQUE NPC CONTROLLER (ADVISORS ON FLOORS 1-3 + VIP SHOPPERS)
// =========================================================================

type GucciNpcKind = 'advisor' | 'shopper';
type GucciPhase = 'browse' | 'admire' | 'walk_leave' | 'respawn_wait';

interface GucciActor {
  id: number;
  kind: GucciNpcKind;
  root: THREE.Group;
  headMesh: THREE.Mesh;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  toteBag: THREE.Group;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: GucciPhase;
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

const GUCCI_SHOPPER_SPOTS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [417.1, GUCCI_PODIUM_Y, 8.6], yaw: 0 },
  { pos: [430.7, GUCCI_PODIUM_Y, 8.6], yaw: 0 },
  { pos: [421.2, GUCCI_PODIUM_Y, 5.4], yaw: Math.PI * 0.5 },
  { pos: [416.2, GUCCI_PODIUM_Y, 1.2], yaw: -Math.PI * 0.5 },
  { pos: [431.2, GUCCI_PODIUM_Y, 3.2], yaw: Math.PI * 0.5 },
];

export class GucciNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: GucciActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.name = 'GucciNpcGroup';

    const advisorSpecs: { x: number; y: number; z: number; yaw: number }[] = [
      // Floor 1 Concierge & Floor Host
      { x: 423.9, y: GUCCI_PODIUM_Y, z: -4.2, yaw: 0 },
      { x: 426.2, y: GUCCI_PODIUM_Y, z: 7.4, yaw: -Math.PI * 0.25 },
      // Floor 2 Portrait Salon & Vitrine Gallery
      { x: 419.8, y: GUCCI_PODIUM_Y + GUCCI_FLOOR_H, z: 7.2, yaw: Math.PI * 0.3 },
      { x: 424.3, y: GUCCI_PODIUM_Y + GUCCI_FLOOR_H, z: 10.2, yaw: Math.PI },
      // Floor 3 Emerald Boiserie Archive (clearly visible through Level 3 glass!)
      { x: 423.9, y: GUCCI_PODIUM_Y + GUCCI_FLOOR_H * 2, z: 8.6, yaw: 0 },
      { x: 419.2, y: GUCCI_PODIUM_Y + GUCCI_FLOOR_H * 2, z: 9.8, yaw: -Math.PI * 0.2 },
    ];

    advisorSpecs.forEach((sp, idx) => {
      this.actors.push(
        this.spawnActor(idx, 'advisor', helpers, new THREE.Vector3(sp.x, sp.y, sp.z), sp.yaw)
      );
    });

    for (let i = 0; i < 4; i++) {
      const spot = GUCCI_SHOPPER_SPOTS[i % GUCCI_SHOPPER_SPOTS.length];
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
    kind: GucciNpcKind,
    helpers: HospitalCharacterHelpers,
    homePos: THREE.Vector3,
    homeYaw: number
  ): GucciActor {
    const root = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    root.add(fallbackGroup);
    root.position.copy(homePos);
    root.rotation.y = homeYaw;

    const paletteShirt = [0x143224, 0x1c1917, 0x7c2d12, 0xe7e5e4, 0x8f1d24];
    const palettePants = [0x111827, 0x292524, 0x3f3f46];
    const isAdvisor = kind === 'advisor';
    const shirtColor = isAdvisor ? 0x132b20 : paletteShirt[id % paletteShirt.length];
    const pantsColor = isAdvisor ? 0x111827 : palettePants[id % palettePants.length];
    const skinHex = ['#f3d2b3', '#e8be94', '#f1c7a4'][id % 3];

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.78 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.45 });
    const brassBadgeMat = new THREE.MeshStandardMaterial({ color: 0xd9b166, metalness: 0.8, roughness: 0.25 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: id % 2 === 0 ? 0x18181b : 0x3f2718, roughness: 0.78 });

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.12, 0.74, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.70, 0.22), pantsMat);
    leftLegMesh.position.y = -0.35;
    leftLeg.add(leftLegMesh);
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.10, 0.28), shoeMat);
    shoeL.position.set(0, -0.69, 0.03);
    leftLeg.add(shoeL);
    fallbackGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.12, 0.74, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.70, 0.22), pantsMat);
    rightLegMesh.position.y = -0.35;
    rightLeg.add(rightLegMesh);
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.10, 0.28), shoeMat);
    shoeR.position.set(0, -0.69, 0.03);
    rightLeg.add(shoeR);
    fallbackGroup.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.64, 0.26), shirtMat);
    torso.position.y = 1.06;
    fallbackGroup.add(torso);

    if (isAdvisor) {
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.02), brassBadgeMat);
      badge.position.set(0.12, 0.14, 0.14);
      torso.add(badge);
    }

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.33, 1.34, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.56, 0.16), shirtMat);
    leftArmMesh.position.y = -0.27;
    leftArm.add(leftArmMesh);
    fallbackGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.33, 1.34, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.56, 0.16), shirtMat);
    rightArmMesh.position.y = -0.27;
    rightArm.add(rightArmMesh);
    fallbackGroup.add(rightArm);

    const toteBag = new THREE.Group();
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x16422c, roughness: 0.5 });
    const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.28), bagMat);
    bagMesh.position.set(0.02, -0.58, 0.04);
    toteBag.add(bagMesh);
    toteBag.visible = false;
    rightArm.add(toteBag);

    const headTex = helpers.createFaceTexture(id % 2 === 0 ? 'happy' : 'neutral', skinHex);
    const headMesh = helpers.createHeadMesh(skinMat, headTex, 0.34, 0.34, 0.34);
    headMesh.position.y = 1.56;
    fallbackGroup.add(headMesh);

    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.36), hairMat);
    hairCap.position.y = 0.16;
    headMesh.add(hairCap);

    const spec = isAdvisor
      ? id === 0
        ? CASHIER_NPC_MODEL
        : pickStationaryCivilianModel(id + 89)
      : pickShopCustomerModel(id + 97);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: root,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: isAdvisor && id === 0 ? 'Checkout' : 'Idle',
      phaseOffset: id * 0.47,
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
      stateTimer: 5.0 + (id % 5) * 3.0,
      walkPhase: id * 1.1,
      walkPhaseRef: { phase: id * 1.1 },
      speed: 1.36 + (id % 3) * 0.12,
      seed: id * 1.47,
      exiting: false,
      exitDone: false,
      exitRef: { idx: 0 },
      glbHandle,
    };
  }

  private assignNewSpot(a: GucciActor, spawnOutside = false) {
    const spot = GUCCI_SHOPPER_SPOTS[(a.id + Math.floor(this.timer * 0.5)) % GUCCI_SHOPPER_SPOTS.length];
    const targetPos = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]);

    if (spawnOutside) {
      a.toteBag.visible = false;
      a.root.position.set(GUCCI_DOOR_X + (a.id % 2 === 0 ? -4.5 : 4.5), 0.02, 18.0);
      a.pathQueue = [
        new THREE.Vector3(GUCCI_DOOR_X, 0.04, 15.6),
        new THREE.Vector3(GUCCI_DOOR_X, GUCCI_PODIUM_Y, 13.6),
        new THREE.Vector3(GUCCI_DOOR_X, GUCCI_PODIUM_Y, 9.2),
        targetPos,
      ];
    } else {
      a.pathQueue = [new THREE.Vector3(GUCCI_DOOR_X, GUCCI_PODIUM_Y, 2.5), targetPos];
    }
    a.pathIdx = 0;
    a.targetYaw = spot.yaw;
    a.phase = 'browse';
  }

  private snapClosed() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.root.visible = false;
      a.exiting = false;
      a.exitDone = true;
    }
  }

  private reopen() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = false;
      a.exitDone = false;
      a.exitRef.idx = 0;
      a.leftLeg.rotation.x = 0;
      a.rightLeg.rotation.x = 0;
      a.leftArm.rotation.x = 0;
      a.rightArm.rotation.x = 0;
      a.toteBag.visible = false;
      a.root.position.copy(a.homePos);
      a.root.rotation.y = a.homeYaw;
      a.root.visible = true;
      a.phase = 'admire';
      a.stateTimer = 4.0 + (a.id % 5) * 3.2;
      a.glbHandle.setAnimState(a.kind === 'advisor' && a.id === 0 ? 'Checkout' : 'Idle');
    }
  }

  private beginClosing() {
    this.closingActive = true;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = true;
      a.exitRef.idx = 0;
      if (!a.root.visible || a.homePos.y > GUCCI_PODIUM_Y + 0.5) {
        a.root.visible = false;
        a.exitDone = true;
        a.glbHandle.setAnimState('Idle');
        continue;
      }
      a.exitDone = false;
      a.glbHandle.setAnimState('Walk');
    }
  }

  public hasNpcNearDoor(): boolean {
    if (this.fullyClosedAndEmpty) return false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible) continue;
      const p = a.root.position;
      if (Math.hypot(p.x - GUCCI_DOOR_X, p.z - GUCCI_DOOR_Z) <= 3.6) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: GucciActor, dt: number): boolean {
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

    a.walkPhase += dt * 5.6;
    const swing = Math.sin(a.walkPhase) * 0.36;
    a.leftLeg.rotation.x = swing;
    a.rightLeg.rotation.x = -swing;
    a.leftArm.rotation.x = -swing * 0.5;
    a.rightArm.rotation.x = swing * 0.5;
    return false;
  }

  public update(delta: number, rawHour = 10.0) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    const isOpen = isGucciOpenAtHour(rawHour);
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
    const sharedExitPts = [
      new THREE.Vector3(GUCCI_DOOR_X, GUCCI_PODIUM_Y, 9.2),
      new THREE.Vector3(GUCCI_DOOR_X, GUCCI_PODIUM_Y, 13.6),
      new THREE.Vector3(GUCCI_DOOR_X, 0.04, 15.6),
      new THREE.Vector3(415.0, 0.02, 18.0),
    ];

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];

      if (this.closingActive && a.exiting) {
        if (a.exitDone) {
          a.root.visible = false;
          continue;
        }
        allCleared = false;
        a.glbHandle.setAnimState('Walk');
        const done = advanceNpcExitPath(
          a.root,
          sharedExitPts,
          a.exitRef,
          1.45,
          dt,
          { legL: a.leftLeg, legR: a.rightLeg, armL: a.leftArm, armR: a.rightArm },
          a.walkPhaseRef
        );
        if (done) {
          a.exitDone = true;
          a.root.visible = false;
          a.glbHandle.setAnimState('Idle');
        }
        continue;
      }

      if (a.kind === 'advisor') {
        a.root.visible = true;
        a.glbHandle.setAnimState(a.id === 0 ? 'Checkout' : 'Idle');
        a.headMesh.rotation.y = Math.sin(this.timer * 1.15 + a.seed) * 0.24;
        a.rightArm.rotation.x = -0.18 + Math.sin(this.timer * 1.4 + a.seed) * 0.08;
        continue;
      }

      if (a.phase === 'respawn_wait') {
        a.root.visible = false;
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          this.assignNewSpot(a, true);
          a.glbHandle.setAnimState('Walk');
        }
        continue;
      }

      a.root.visible = true;
      if (a.phase === 'browse') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'admire';
          a.stateTimer = 7.0 + ((a.id * 3) % 7);
          a.glbHandle.setAnimState('Idle');
        }
      } else if (a.phase === 'admire') {
        a.glbHandle.setAnimState('Idle');
        let diff = a.targetYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 6.5);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.leftArm.rotation.x = THREE.MathUtils.lerp(a.leftArm.rotation.x, 0, Math.min(1, dt * 10));
        a.rightArm.rotation.x = THREE.MathUtils.lerp(a.rightArm.rotation.x, -0.15, Math.min(1, dt * 8));
        a.headMesh.rotation.y = Math.sin(this.timer * 1.2 + a.seed) * 0.22;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          if ((a.id + Math.floor(this.timer)) % 3 === 0) {
            a.toteBag.visible = true;
            a.pathQueue = [
              new THREE.Vector3(GUCCI_DOOR_X, GUCCI_PODIUM_Y, 9.2),
              new THREE.Vector3(GUCCI_DOOR_X, GUCCI_PODIUM_Y, 13.6),
              new THREE.Vector3(GUCCI_DOOR_X, 0.04, 15.6),
              new THREE.Vector3(415.0, 0.02, 18.0),
            ];
            a.pathIdx = 0;
            a.phase = 'walk_leave';
            a.glbHandle.setAnimState('Walk');
          } else {
            this.assignNewSpot(a, false);
            a.glbHandle.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.root.visible = false;
          a.toteBag.visible = false;
          a.phase = 'respawn_wait';
          a.stateTimer = 2.0 + (a.id % 3) * 1.2;
          a.glbHandle.setAnimState('Idle');
        }
      }
    }

    if (this.closingActive && allCleared) {
      this.fullyClosedAndEmpty = true;
    }
  }
}
