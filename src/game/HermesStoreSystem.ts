import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isHermesOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface HermesBuildResult {
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
    npcController?: HermesNpcController | null
  ) => void;
}

// =========================================================================
// HERMÈS FLAGSHIP BOUTIQUE — EUROPEAN PARISIAN SALON (2-FLOOR EDITION)
// Directly East of Highlands Coffee along Đại lộ Đông Tây (X = 413.0..434.8, Z = 42.5..70.0)
// Faces North (-Z) toward Boulevard (Z = 42.4) & Gucci across the avenue
// Floor Elevations: Floor 1 = 0.14m (HERMES_PODIUM_Y), Floor 2 = 5.54m (HERMES_FLOOR_H = 5.40m)
// Recessed Entrance Vestibule & Automatic Bronze Doors: X = 423.9, Z = 45.80 (07:00 - 23:00)
// =========================================================================

export const HERMES_PODIUM_Y = 0.14;
export const HERMES_FLOOR_H = 5.4;

const HERMES_DOOR_X = 423.9;
const HERMES_DOOR_Z = 45.8;

export const HERMES_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 (Y = 0.14m) — Parisian Recessed Storefront, Window Bays & Silk Salon
  // =========================================================================
  { minX: 412.8, maxX: 413.5, minZ: 43.8, maxZ: 70.1, floor: 1 }, // West Wall (beside Highlands)
  { minX: 434.1, maxX: 434.9, minZ: 43.8, maxZ: 70.1, floor: 1 }, // East Wall
  { minX: 412.8, maxX: 434.9, minZ: 69.3, maxZ: 70.1, floor: 1 }, // South Rear Wall

  // Front Protruding Window Bays (Z = 43.7..44.2) & Recessed Vestibule Side Glass Returns (X = 420.0 & 427.8)
  { minX: 413.0, maxX: 420.4, minZ: 43.65, maxZ: 44.25, floor: 1 }, // West Bay Front Glass
  { minX: 427.4, maxX: 434.8, minZ: 43.65, maxZ: 44.25, floor: 1 }, // East Bay Front Glass
  { minX: 419.95, maxX: 420.55, minZ: 43.8, maxZ: 46.0, floor: 1 }, // Vestibule West Glass Return
  { minX: 427.25, maxX: 427.85, minZ: 43.8, maxZ: 46.0, floor: 1 }, // Vestibule East Glass Return

  // Recessed Door Wall at Z = 45.80 split cleanly around 3.2m Main Automatic Doors (X = 422.3 .. 425.5)
  { minX: 420.0, maxX: 422.25, minZ: 45.5, maxZ: 46.05, floor: 1 }, // Left-of-Door Transom Pier
  { minX: 425.55, maxX: 427.8, minZ: 45.5, maxZ: 46.05, floor: 1 }, // Right-of-Door Transom Pier

  // Exterior Topiary Planters Flanking the Recessed Vestibule
  { minX: 419.25, maxX: 420.25, minZ: 42.85, maxZ: 43.75, floor: 1 }, // West Parisian Topiary Planter
  { minX: 427.55, maxX: 428.55, minZ: 42.85, maxZ: 43.75, floor: 1 }, // East Parisian Topiary Planter

  // Floor 1 Display Plinths, Lounge Armchair Bay, Silk Gallery & Orange Lacquer Counters
  { minX: 414.2, maxX: 419.4, minZ: 45.0, maxZ: 47.6, floor: 1 }, // West Bay Scarf & Box Plinth
  { minX: 428.4, maxX: 433.6, minZ: 45.0, maxZ: 47.6, floor: 1 }, // East Bay Lounge Armchair, Lamp & Plinth
  { minX: 414.0, maxX: 415.4, minZ: 49.0, maxZ: 64.0, floor: 1 }, // West Walnut Shelving & Leather Wall
  { minX: 432.4, maxX: 433.8, minZ: 49.0, maxZ: 59.5, floor: 1 }, // East Terracotta Lacquer & Handbag Wall
  { minX: 418.1, maxX: 420.5, minZ: 51.8, maxZ: 54.0, floor: 1 }, // Left Silk & Watch Glass Vitrine
  { minX: 427.3, maxX: 429.7, minZ: 51.8, maxZ: 54.0, floor: 1 }, // Right Birkin & Kelly Glass Vitrine
  { minX: 416.3, maxX: 418.1, minZ: 55.5, maxZ: 57.1, floor: 1 }, // West Perfumerie & Rouge Pillar
  { minX: 429.7, maxX: 431.5, minZ: 55.5, maxZ: 57.1, floor: 1 }, // East Shoe Salon Ottoman Bench
  { minX: 421.3, maxX: 426.5, minZ: 58.6, maxZ: 60.4, floor: 1 }, // Central Orange Lacquer Concierge Counter
  { minX: 421.0, maxX: 426.8, minZ: 64.2, maxZ: 65.5, floor: 1 }, // Carré Silk Wall Island & Porcelain Niches

  // SE Switchback Stairwell Enclosure (X = 428.8..434.0, Z = 62.5..69.4)
  { minX: 428.65, maxX: 428.95, minZ: 62.5, maxZ: 69.4, floor: 1 }, // Stairwell West Balustrade
  { minX: 431.22, maxX: 431.58, minZ: 62.5, maxZ: 67.6, floor: 1 }, // Stairwell Center Spine
  { minX: 431.5, maxX: 434.1, minZ: 62.5, maxZ: 62.85, floor: 1 }, // Floor 1 Under-Stair Partition

  // =========================================================================
  // FLOOR 2 (Y = 5.54m) — Parisian Salon Privé & Equestrian Leather Atelier
  // =========================================================================
  { minX: 412.8, maxX: 413.5, minZ: 43.8, maxZ: 70.1, floor: 2 },
  { minX: 434.1, maxX: 434.9, minZ: 43.8, maxZ: 70.1, floor: 2 },
  { minX: 412.8, maxX: 434.9, minZ: 69.3, maxZ: 70.1, floor: 2 },
  { minX: 413.0, maxX: 434.8, minZ: 43.7, maxZ: 44.3, floor: 2 }, // North French Window Front
  { minX: 428.65, maxX: 428.95, minZ: 62.5, maxZ: 69.4, floor: 2 }, // Stairwell West Balustrade
  { minX: 431.22, maxX: 431.58, minZ: 62.5, maxZ: 67.6, floor: 2 }, // Stairwell Center Spine
  { minX: 415.0, maxX: 419.6, minZ: 49.0, maxZ: 54.4, floor: 2 }, // Left Salon Privé Velvet Lounge
  { minX: 428.2, maxX: 432.8, minZ: 49.0, maxZ: 54.4, floor: 2 }, // Right Salon Privé Lounge
  { minX: 421.8, maxX: 426.0, minZ: 51.0, maxZ: 53.6, floor: 2 }, // Central Equestrian Saddle Pedestal
  { minX: 417.0, maxX: 420.0, minZ: 45.2, maxZ: 46.8, floor: 2 }, // Floor 2 West Window Trunk Vitrine
  { minX: 427.8, maxX: 430.8, minZ: 45.2, maxZ: 46.8, floor: 2 }, // Floor 2 East Window Birkin Vitrine
  { minX: 421.2, maxX: 426.6, minZ: 58.6, maxZ: 60.4, floor: 2 }, // Atelier Leather Desk
];

// =========================================================================
// PROCEDURAL HERMÈS PARISIAN HERITAGE TEXTURES
// =========================================================================

function createHermesWordmarkTex(fontPx = 112, warmHalo = true): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const title = 'HERMÈS';
  const spacing = 128;
  const startX = w * 0.5 - (title.length - 1) * spacing * 0.5;

  if (warmHalo) {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 198, 122, 0.96)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ffe9c4';
    ctx.font = `700 ${fontPx}px "Cinzel", "Times New Roman", "Georgia", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < title.length; i++) {
      ctx.fillText(title[i], startX + i * spacing, h * 0.54);
    }
    ctx.restore();
  }

  ctx.fillStyle = '#b98947';
  ctx.font = `700 ${fontPx}px "Cinzel", "Times New Roman", "Georgia", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < title.length; i++) {
    ctx.fillText(title[i], startX + i * spacing, h * 0.54);
  }

  ctx.strokeStyle = '#fff5dc';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < title.length; i++) {
    ctx.strokeText(title[i], startX + i * spacing, h * 0.54);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createParisianLimestoneTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#e8dfd1';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 42; i++) {
    const y = (i / 42) * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(186, 172, 152, 0.14)' : 'rgba(250, 246, 238, 0.22)';
    ctx.fillRect(0, y, size, 6 + (i % 3) * 3);
  }

  ctx.strokeStyle = 'rgba(116, 102, 86, 0.28)';
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

function createHermesFaubourgMosaicTex(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f2e8d9';
  ctx.fillRect(0, 0, size, size);

  const q = size * 0.5;
  // Classic Parisian Faubourg interlaced square mosaic in warm taupe, terracotta-orange & espresso
  ctx.strokeStyle = '#c85b28';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, size - 40, size - 40);

  ctx.fillStyle = '#d9cab6';
  ctx.beginPath();
  ctx.moveTo(q, 52);
  ctx.lineTo(size - 52, q);
  ctx.lineTo(q, size - 52);
  ctx.lineTo(52, q);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#3a2b22';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.strokeStyle = '#b48748';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, size - 12, size - 12);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 7);
  tex.anisotropy = 4;
  return tex;
}

function createHermesCarreSilkTex(idx: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const palettes = [
    ['#d95f25', '#f7e6c9', '#1e3a5f', '#d4a353'],
    ['#1d4d40', '#f6ead4', '#c95324', '#d8b467'],
    ['#1d3557', '#f5e9d3', '#e06d35', '#d6b364'],
    ['#8d2b24', '#f8efe0', '#2b5848', '#e2bc72'],
  ];
  const pal = palettes[idx % palettes.length];

  ctx.fillStyle = pal[0];
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = pal[1];
  ctx.fillRect(20, 20, size - 40, size - 40);

  ctx.strokeStyle = pal[2];
  ctx.lineWidth = 10;
  ctx.strokeRect(32, 32, size - 64, size - 64);

  // Equestrian rosette / bridles motif in center
  ctx.strokeStyle = pal[3];
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, 58, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = pal[0];
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, 32, 0, Math.PI * 2);
  ctx.fill();

  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    ctx.strokeStyle = pal[2];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(size * 0.5 + Math.cos(ang) * 34, size * 0.5 + Math.sin(ang) * 34);
    ctx.lineTo(size * 0.5 + Math.cos(ang) * 76, size * 0.5 + Math.sin(ang) * 76);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHermesCrestMedallionTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#36231a';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#dfba74';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.stroke();

  // Iconic Hermès warm orange inner seal + H monogram
  ctx.fillStyle = '#cf5a22';
  ctx.beginPath();
  ctx.arc(128, 128, 86, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff5e1';
  ctx.font = '700 84px "Cinzel", "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', 128, 114);

  ctx.fillStyle = '#f8dea8';
  ctx.font = '700 20px "Cinzel", "Georgia", serif';
  ctx.fillText('PARIS • 1837', 128, 178);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHermesAubussonRugTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f1e5d2';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#c85a24';
  ctx.lineWidth = 22;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  ctx.strokeStyle = '#8b6a3e';
  ctx.lineWidth = 8;
  ctx.strokeRect(58, 58, w - 116, h - 116);

  ctx.fillStyle = '#dfccb1';
  for (let cy = 240; cy <= h - 240; cy += 270) {
    ctx.beginPath();
    ctx.ellipse(w * 0.5, cy, 110, 74, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c85a24';
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// =========================================================================
// MAIN HERMÈS FLAGSHIP BUILDER
// =========================================================================

export function createHermesStoreStructure(): HermesBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared Architectural Materials
  const limestoneTex = createParisianLimestoneTex();
  const limestoneMat = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    color: 0xf4ede0,
    roughness: 0.62,
    metalness: 0.04,
  });
  const fasciaCreamMat = new THREE.MeshStandardMaterial({
    color: 0xefe7da,
    roughness: 0.46,
    metalness: 0.06,
  });
  const warmStonePilarMat = new THREE.MeshStandardMaterial({
    color: 0xe3d6c3,
    roughness: 0.56,
    metalness: 0.05,
  });
  const darkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x261d17,
    roughness: 0.32,
    metalness: 0.68,
  });
  const satinBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd1a862,
    roughness: 0.24,
    metalness: 0.85,
  });
  const wroughtIronMat = new THREE.MeshStandardMaterial({
    color: 0x1a1715,
    roughness: 0.42,
    metalness: 0.72,
  });
  const mansardZincMat = new THREE.MeshStandardMaterial({
    color: 0x2a2d33,
    roughness: 0.48,
    metalness: 0.42,
  });
  const basaltPavingMat = new THREE.MeshStandardMaterial({
    color: 0x3b3531,
    roughness: 0.82,
    metalness: 0.06,
  });
  const slateApronMat = new THREE.MeshStandardMaterial({
    color: 0x4b443e,
    roughness: 0.84,
  });
  const warmCherryWoodMat = new THREE.MeshStandardMaterial({
    color: 0x7b4728,
    roughness: 0.48,
    metalness: 0.08,
  });
  const flutedTeakMat = new THREE.MeshStandardMaterial({
    color: 0x9b6238,
    roughness: 0.44,
    metalness: 0.06,
  });
  const hermesOrangeLacquerMat = new THREE.MeshStandardMaterial({
    color: 0xd96126,
    roughness: 0.30,
    metalness: 0.08,
  });
  const hermesOrangeBoxMat = new THREE.MeshStandardMaterial({
    color: 0xe86b27,
    roughness: 0.42,
  });
  const creamPlasterMat = new THREE.MeshStandardMaterial({
    color: 0xf6eee0,
    roughness: 0.65,
  });
  const softIvoryFabricMat = new THREE.MeshStandardMaterial({
    color: 0xf4ecdd,
    roughness: 0.85,
  });
  const terracottaVelvetMat = new THREE.MeshStandardMaterial({
    color: 0xb94b21,
    roughness: 0.82,
  });
  const clearGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfff5e8,
    transparent: true,
    opacity: 0.20,
    roughness: 0.08,
    metalness: 0.1,
    depthWrite: false,
  });

  // Glow Materials
  const signBacklitMat = new THREE.MeshStandardMaterial({
    map: createHermesWordmarkTex(116, true),
    emissive: 0xffd28a,
    emissiveMap: createHermesWordmarkTex(116, true),
    emissiveIntensity: 0.95,
    transparent: true,
    roughness: 0.25,
    metalness: 0.5,
  });
  neonMats.push(signBacklitMat);

  const windowSignMat = new THREE.MeshStandardMaterial({
    map: createHermesWordmarkTex(96, false),
    emissive: 0xffe4b3,
    emissiveMap: createHermesWordmarkTex(96, false),
    emissiveIntensity: 0.65,
    transparent: true,
    roughness: 0.28,
    metalness: 0.65,
  });
  neonMats.push(windowSignMat);

  const warmCoveMat = new THREE.MeshStandardMaterial({
    color: 0xfff2d6,
    emissive: 0xffcf78,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  lanternMats.push(warmCoveMat);

  const crestMedallionMat = new THREE.MeshStandardMaterial({
    map: createHermesCrestMedallionTex(),
    emissive: 0xffd796,
    emissiveMap: createHermesCrestMedallionTex(),
    emissiveIntensity: 0.55,
    roughness: 0.32,
  });
  lanternMats.push(crestMedallionMat);

  // =========================================================================
  // 1. NON-OVERLAPPING FORECOURT PAVING, THRESHOLD & PODIUM (ZERO Z-FIGHTING)
  // =========================================================================
  // Boulevard sidewalk meets Z = 42.50 (Y = 0.00).
  // West Alley Apron between Highlands (411.8) & Hermès (413.0)
  const alleyApron = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 27.6), slateApronMat);
  alleyApron.position.set(412.2, 0.0, 56.2);
  staticGroup.add(alleyApron);

  // Front Forecourt Apron along Z = 42.45 .. 43.90 (top Y = 0.025)
  const forecourtStrip = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.05, 1.46), basaltPavingMat);
  forecourtStrip.position.set(423.9, 0.0, 43.17);
  staticGroup.add(forecourtStrip);

  // Recessed Vestibule Forecourt (X = 420.2 .. 427.6, Z = 43.90 .. 45.25, top Y = 0.025)
  const vestibuleForecourt = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.05, 1.35), basaltPavingMat);
  vestibuleForecourt.position.set(423.9, 0.0, 44.575);
  staticGroup.add(vestibuleForecourt);

  // Clean Single-Piece Stone Threshold Step leading to Doorway (Z = 45.25 .. 45.85, top Y = 0.08)
  const thresholdStep = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.08, 0.60), warmStonePilarMat);
  thresholdStep.position.set(423.9, 0.04, 45.55);
  staticGroup.add(thresholdStep);

  // Subtle brass inlay strip along vestibule outer line (Z = 43.92, Y = 0.028)
  const brassEntryTrim = new THREE.Mesh(new THREE.BoxGeometry(7.36, 0.008, 0.05), satinBrassMat);
  brassEntryTrim.position.set(423.9, 0.028, 43.92);
  staticGroup.add(brassEntryTrim);

  // Podium Floor Slabs (Top surface strictly at Y = HERMES_PODIUM_Y = 0.14m, disjoint from forecourt)
  const leftBayPodium = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.34, 1.95), darkBronzeMat);
  leftBayPodium.position.set(416.6, HERMES_PODIUM_Y - 0.17, 44.875);
  staticGroup.add(leftBayPodium);

  const rightBayPodium = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.34, 1.95), darkBronzeMat);
  rightBayPodium.position.set(431.2, HERMES_PODIUM_Y - 0.17, 44.875);
  staticGroup.add(rightBayPodium);

  const mainPodium = new THREE.Mesh(new THREE.BoxGeometry(21.8, 0.34, 24.15), darkBronzeMat);
  mainPodium.position.set(423.9, HERMES_PODIUM_Y - 0.17, 57.925);
  staticGroup.add(mainPodium);

  // Hermès Faubourg Mosaic Floor Tiles on Floor 1 (cleanly Y = HERMES_PODIUM_Y + 0.004)
  const mosaicTex = createHermesFaubourgMosaicTex();
  const mosaicFloorMat = new THREE.MeshStandardMaterial({
    map: mosaicTex,
    roughness: 0.24,
    metalness: 0.05,
  });
  const mainMosaic = new THREE.Mesh(new THREE.PlaneGeometry(21.2, 23.6), mosaicFloorMat);
  mainMosaic.rotation.x = -Math.PI / 2;
  mainMosaic.position.set(423.9, HERMES_PODIUM_Y + 0.004, 57.7);
  staticGroup.add(mainMosaic);

  [416.6, 431.2].forEach((bx) => {
    const bayMosaic = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.9), mosaicFloorMat);
    bayMosaic.rotation.x = -Math.PI / 2;
    bayMosaic.position.set(bx, HERMES_PODIUM_Y + 0.004, 44.9);
    staticGroup.add(bayMosaic);
  });

  // =========================================================================
  // 2. ARCHITECTURAL SHELL, CREAM FASCIA & EUROPEAN HAUSSMANN ELEVATION
  // =========================================================================
  const totalH = 9.75;

  // Rear South Wall (full height 0 .. 9.75)
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(21.8, totalH, 0.55), limestoneMat);
  rearWall.position.set(423.9, totalH * 0.5, 69.72);
  staticGroup.add(rearWall);

  // West & East Side Walls (start behind storefront Z = 43.9 .. 70.0)
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, totalH, 26.1), limestoneMat);
  westWall.position.set(413.08, totalH * 0.5, 56.95);
  staticGroup.add(westWall);

  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, totalH, 26.1), limestoneMat);
  eastWall.position.set(434.72, totalH * 0.5, 56.95);
  staticGroup.add(eastWall);

  // European Parisian Limestone Ashlar Pilasters & Wall Sconces along East Exterior Wall (X = 435.02)
  [45.6, 51.6, 57.6, 63.6, 69.2].forEach((pz) => {
    const sidePilaster = new THREE.Mesh(new THREE.BoxGeometry(0.18, totalH, 0.65), warmStonePilarMat);
    sidePilaster.position.set(435.04, totalH * 0.5, pz);
    staticGroup.add(sidePilaster);
  });
  [48.6, 54.6, 60.6].forEach((wz) => {
    const blindArch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 2.8), darkBronzeMat);
    blindArch.position.set(435.02, 7.45, wz);
    staticGroup.add(blindArch);
    const blindGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.8, 2.4), warmCoveMat);
    blindGlass.position.set(435.04, 7.45, wz);
    staticGroup.add(blindGlass);
  });

  // Floor 2 Slab (with NE/SE Stairwell Opening at X = 428.8..434.0, Z = 62.5..69.4)
  const f2Y = HERMES_PODIUM_Y + HERMES_FLOOR_H; // 5.54m
  // Main Floor 2 Slab covering North/Center/West (Z = 43.9 .. 62.5)
  const f2NorthSlab = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.36, 18.6), creamPlasterMat);
  f2NorthSlab.position.set(423.9, f2Y - 0.18, 53.2);
  staticGroup.add(f2NorthSlab);
  // Floor 2 West Rear Slab beside Stairwell (X = 413.2 .. 428.8, Z = 62.5 .. 69.6)
  const f2WestRearSlab = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.36, 7.1), creamPlasterMat);
  f2WestRearSlab.position.set(421.0, f2Y - 0.18, 66.05);
  staticGroup.add(f2WestRearSlab);

  // Floor 2 Ceiling Slab & Roof Terrace Deck (Y = 9.75)
  const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.35, 26.2), limestoneMat);
  roofDeck.position.set(423.9, totalH, 56.95);
  staticGroup.add(roofDeck);

  // =========================================================================
  // 3. IMAGE-2 STOREFRONT: PROTRUDING GLAZED BAYS + RECESSED VESTIBULE + CREAM FASCIA
  // =========================================================================
  const glassTopY = 4.30;
  const fasciaBotY = 4.30;
  const fasciaTopY = 5.82;

  // -- A. Cream / Ivory Segmented Parisian Stone Fascia Band (Image 2 signature!) --
  // Divided into 3 major architectural panels matching Left Bay / Center / Right Bay
  const fasciaBand = new THREE.Mesh(new THREE.BoxGeometry(22.1, fasciaTopY - fasciaBotY, 0.58), fasciaCreamMat);
  fasciaBand.position.set(423.9, (fasciaBotY + fasciaTopY) * 0.5, 44.08);
  staticGroup.add(fasciaBand);

  // Dark bronze shadow-reveal joints on cream fascia matching Image 2 vertical seam lines
  [413.0, 416.6, 420.2, 427.6, 431.2, 434.8].forEach((jx) => {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.05, fasciaTopY - fasciaBotY + 0.01, 0.06), darkBronzeMat);
    seam.position.set(jx, (fasciaBotY + fasciaTopY) * 0.5, 43.78);
    staticGroup.add(seam);
  });

  // Dark bronze cornice drip trim framing bottom & top of cream fascia
  const fasciaLowerTrim = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.14, 0.68), darkBronzeMat);
  fasciaLowerTrim.position.set(423.9, fasciaBotY - 0.03, 44.05);
  staticGroup.add(fasciaLowerTrim);

  const fasciaUpperTrim = new THREE.Mesh(new THREE.BoxGeometry(22.3, 0.16, 0.72), darkBronzeMat);
  fasciaUpperTrim.position.set(423.9, fasciaTopY + 0.04, 44.05);
  staticGroup.add(fasciaUpperTrim);

  // Main Backlit Brushed-Brass HERMÈS Sign Centered on Cream Fascia (Faces -Z / North)
  const mainSignBacking = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.12, 0.06), fasciaCreamMat);
  mainSignBacking.position.set(HERMES_DOOR_X, 5.06, 43.79);
  staticGroup.add(mainSignBacking);

  const mainSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.15), signBacklitMat);
  mainSignPlane.position.set(HERMES_DOOR_X, 5.06, 43.74);
  mainSignPlane.rotation.y = Math.PI;
  staticGroup.add(mainSignPlane);

  // -- B. Vestibule Recessed Soffit Ceiling & 6 Downlights (Z = 43.9 .. 45.8, Y = 4.28) --
  const vestibuleSoffit = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 2.05), darkBronzeMat);
  vestibuleSoffit.position.set(423.9, 4.22, 44.85);
  staticGroup.add(vestibuleSoffit);

  [421.4, 423.9, 426.4].forEach((lx) => {
    [44.45, 45.30].forEach((lz) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12), warmCoveMat);
      pot.position.set(lx, 4.12, lz);
      staticGroup.add(pot);
    });
  });

  // -- C. Left & Right Protruding Glazed Window Bays (Z = 43.90) + Vestibule Returns --
  const buildGlazedDisplayBay = (minX: number, maxX: number, isEastBay: boolean) => {
    const w = maxX - minX;
    const cx = (minX + maxX) * 0.5;
    const bayH = glassTopY - HERMES_PODIUM_Y;

    // Dark bronze base plinth & head transom
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 0.16), darkBronzeMat);
    botRail.position.set(cx, HERMES_PODIUM_Y + 0.09, 43.92);
    staticGroup.add(botRail);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.16), darkBronzeMat);
    topRail.position.set(cx, glassTopY - 0.08, 43.92);
    staticGroup.add(topRail);

    // 5 tall vertical bronze mullions dividing each showcase wing into 4 sleek vertical panes (matching Image 2!)
    for (let i = 0; i <= 4; i++) {
      const mx = minX + (w * i) / 4;
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.11, bayH, 0.15), darkBronzeMat);
      mullion.position.set(mx, HERMES_PODIUM_Y + bayH * 0.5, 43.92);
      staticGroup.add(mullion);
    }

    // Glazing front pane
    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, bayH - 0.25), clearGlassMat);
    frontGlass.position.set(cx, HERMES_PODIUM_Y + bayH * 0.5, 43.90);
    frontGlass.rotation.y = Math.PI;
    staticGroup.add(frontGlass);

    // Signature Image 2 Vertical Fluted Warm Wood Valance behind Upper Glass (Y = 3.25 .. 4.18)
    const valanceBack = new THREE.Mesh(new THREE.BoxGeometry(w - 0.15, 0.92, 0.14), warmCherryWoodMat);
    valanceBack.position.set(cx, 3.72, 44.14);
    staticGroup.add(valanceBack);

    const slatCount = 24;
    for (let s = 0; s < slatCount; s++) {
      const sx = minX + 0.22 + ((w - 0.44) * s) / (slatCount - 1);
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.90, 0.06), flutedTeakMat);
      slat.position.set(sx, 3.72, 44.05);
      staticGroup.add(slat);
    }

    // Warm Amber Cove Light Wash Strip behind fluted wood valance
    const coveStrip = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.06, 0.08), warmCoveMat);
    coveStrip.position.set(cx, 3.26, 44.10);
    staticGroup.add(coveStrip);

    // Secondary glowing HERMÈS window corner wordmark (outer upper pane like Image 2!)
    const wordmarkX = isEastBay ? maxX - 1.15 : minX + 1.15;
    const winSign = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.36), windowSignMat);
    winSign.position.set(wordmarkX, 3.22, 43.94);
    winSign.rotation.y = Math.PI;
    staticGroup.add(winSign);

    // Glazed Vestibule Side Return Wall (at X = 420.2 or X = 427.6, Z = 43.9..45.8)
    const retX = isEastBay ? minX : maxX;
    const retBot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 1.9), darkBronzeMat);
    retBot.position.set(retX, HERMES_PODIUM_Y + 0.09, 44.85);
    staticGroup.add(retBot);

    const retTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.9), darkBronzeMat);
    retTop.position.set(retX, glassTopY - 0.08, 44.85);
    staticGroup.add(retTop);

    const retGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.85, bayH - 0.25), clearGlassMat);
    retGlass.position.set(retX, HERMES_PODIUM_Y + bayH * 0.5, 44.85);
    retGlass.rotation.y = isEastBay ? -Math.PI / 2 : Math.PI / 2;
    staticGroup.add(retGlass);
  };

  buildGlazedDisplayBay(413.0, 420.2, false); // West Bay
  buildGlazedDisplayBay(427.6, 434.8, true); // East Bay

  // -- D. Recessed Vestibule Wall, Transom, Fluted Wood Valance & Automatic Bronze Doors --
  // Side glass flanking doors at Z = 45.8 (X = 420.2..422.25 and X = 425.55..427.6)
  [421.22, 426.58].forEach((sx) => {
    const sidePane = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 3.95), clearGlassMat);
    sidePane.position.set(sx, HERMES_PODIUM_Y + 2.02, HERMES_DOOR_Z);
    sidePane.rotation.y = Math.PI;
    staticGroup.add(sidePane);

    const sideBot = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.16, 0.14), darkBronzeMat);
    sideBot.position.set(sx, HERMES_PODIUM_Y + 0.08, HERMES_DOOR_Z);
    staticGroup.add(sideBot);
  });

  // Door Portal Vertical Jambs & Upper Transom Bar (Y = 3.55)
  [422.25, 425.55].forEach((px) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.05, 0.18), darkBronzeMat);
    jamb.position.set(px, HERMES_PODIUM_Y + 2.02, HERMES_DOOR_Z);
    staticGroup.add(jamb);
  });
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.14, 0.18), darkBronzeMat);
  doorHeader.position.set(HERMES_DOOR_X, 3.58, HERMES_DOOR_Z);
  staticGroup.add(doorHeader);

  // Upper Transom Glass above Door (Y = 3.58 .. 4.18) + warm fluted slats behind
  const transomGlass = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.62), clearGlassMat);
  transomGlass.position.set(HERMES_DOOR_X, 3.90, HERMES_DOOR_Z);
  transomGlass.rotation.y = Math.PI;
  staticGroup.add(transomGlass);

  // Animated Automatic Double Bronze-Framed Glass Doors (X = 422.3 .. 425.5)
  const buildDoorLeaf = (sign: -1 | 1) => {
    const leaf = new THREE.Group();
    const leafW = 1.56;
    const leafH = 3.36;
    const fTop = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.10, 0.07), darkBronzeMat);
    fTop.position.y = leafH - 0.05;
    leaf.add(fTop);
    const fBot = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.14, 0.07), darkBronzeMat);
    fBot.position.y = 0.07;
    leaf.add(fBot);
    const fOut = new THREE.Mesh(new THREE.BoxGeometry(0.09, leafH, 0.07), darkBronzeMat);
    fOut.position.set(sign * (leafW * 0.5 - 0.045), leafH * 0.5, 0);
    leaf.add(fOut);
    const fIn = new THREE.Mesh(new THREE.BoxGeometry(0.09, leafH, 0.07), darkBronzeMat);
    fIn.position.set(-sign * (leafW * 0.5 - 0.045), leafH * 0.5, 0);
    leaf.add(fIn);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(leafW - 0.18, leafH - 0.24), clearGlassMat);
    glass.position.y = leafH * 0.5;
    glass.rotation.y = Math.PI;
    leaf.add(glass);

    // Tall signature brushed-brass cylindrical pull bar (matches Image 2 vertical door handles!)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.55, 10), satinBrassMat);
    handle.position.set(-sign * (leafW * 0.5 - 0.19), 1.45, -0.06);
    leaf.add(handle);

    leaf.position.set(HERMES_DOOR_X + sign * 0.79, HERMES_PODIUM_Y, HERMES_DOOR_Z);
    leaf.userData.noMerge = true;
    staticGroup.add(leaf);
    return leaf;
  };
  const leftDoorLeaf = buildDoorLeaf(-1);
  const rightDoorLeaf = buildDoorLeaf(1);

  // Security Rolling Shutter for Off-Hours (07:00 - 23:00)
  const shutterTex = createRollingShutterTexture({
    title: 'HERMÈS PARIS',
    hoursLabel: 'OPEN DAILY  •  07:00 – 23:00',
    accentHex: '#d96126',
    slatDarkHex: '#261d17',
    slatLightHex: '#46372d',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.42,
    metalness: 0.55,
  });
  const shutterHandle: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'hermes_main_shutter',
      axis: 'x',
      pos: HERMES_DOOR_Z - 0.14,
      spanCenter: HERMES_DOOR_X,
      width: 3.35,
      baseY: HERMES_PODIUM_Y,
      topY: 3.55,
    },
    shutterMat,
    darkBronzeMat
  );

  // =========================================================================
  // 4. EUROPEAN PARISIAN UPPER FLOOR 2 SALON & MANSARD CROWN ("HƠI HƯỚNG CHÂU ÂU")
  // =========================================================================
  // Fluted Limestone Corner & Bay Pilasters (Framing the entire European facade)
  [413.22, 420.15, 427.65, 434.58].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.68, totalH, 0.48), warmStonePilarMat);
    pilaster.position.set(px, totalH * 0.5, 43.82);
    staticGroup.add(pilaster);

    const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.55, 0.58), limestoneMat);
    plinthBase.position.set(px, 0.28, 43.82);
    staticGroup.add(plinthBase);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.34, 0.64), limestoneMat);
    capital.position.set(px, totalH - 0.22, 43.80);
    staticGroup.add(capital);
  });

  // European Brass Wall Coach Lanterns (Appliques) on All 4 Facade Pilasters
  [413.22, 420.15, 427.65, 434.58].forEach((lx) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.26), satinBrassMat);
    bracket.position.set(lx, 2.85, 43.48);
    staticGroup.add(bracket);
    const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.17, 6), darkBronzeMat);
    lanternCap.position.set(lx, 3.14, 43.39);
    staticGroup.add(lanternCap);
    const lanternFinial = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), satinBrassMat);
    lanternFinial.position.set(lx, 3.25, 43.39);
    staticGroup.add(lanternFinial);
    const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.095, 0.28, 6), warmCoveMat);
    lanternGlass.position.set(lx, 2.92, 43.39);
    staticGroup.add(lanternGlass);
  });

  // Exterior Sculpted Parisian Topiary Urns Flanking the Recessed Entrance
  [419.75, 428.05].forEach((ux) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.44, 0.78), warmStonePilarMat);
    plinth.position.set(ux, 0.245, 43.30);
    staticGroup.add(plinth);
    const urnPot = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.22, 0.52, 12), darkBronzeMat);
    urnPot.position.set(ux, 0.72, 43.30);
    staticGroup.add(urnPot);
    const urnRim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.03, 8, 16), satinBrassMat);
    urnRim.rotation.x = Math.PI / 2;
    urnRim.position.set(ux, 0.98, 43.30);
    staticGroup.add(urnRim);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1b4d34, roughness: 0.78 });
    const topiaryLow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), foliageMat);
    topiaryLow.position.set(ux, 1.26, 43.30);
    staticGroup.add(topiaryLow);
    const topiaryTop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), foliageMat);
    topiaryTop.position.set(ux, 1.74, 43.30);
    staticGroup.add(topiaryTop);
  });

  // Floor 2 Parisian Limestone Wall Spandrels + 5 Grand French Juliet Window Bays (Y = 5.82 .. 9.65)
  const f2TopBand = new THREE.Mesh(new THREE.BoxGeometry(22.1, 0.75, 0.52), limestoneMat);
  f2TopBand.position.set(423.9, 9.35, 44.0);
  staticGroup.add(f2TopBand);

  // Intermediate limestone piers on Floor 2 separating French window casements
  [416.6, 422.15, 425.65, 431.2].forEach((px) => {
    const f2Pier = new THREE.Mesh(new THREE.BoxGeometry(0.54, 3.35, 0.46), limestoneMat);
    f2Pier.position.set(px, 7.50, 43.98);
    staticGroup.add(f2Pier);
  });

  // Ornate Wrought-Iron & Gilded-Brass French Juliet Balconies + Limestone Keystones & Curtains
  const buildFrenchJulietWindow = (wx: number, ww: number) => {
    const corbelLedge = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.38, 0.16, 0.58), warmStonePilarMat);
    corbelLedge.position.set(wx, 5.90, 43.76);
    staticGroup.add(corbelLedge);

    // Carved Limestone Header Lintel & Central Keystone
    const stoneLintel = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.24, 0.24, 0.26), warmStonePilarMat);
    stoneLintel.position.set(wx, 9.04, 43.92);
    staticGroup.add(stoneLintel);

    const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.36, 0.32), limestoneMat);
    keystone.position.set(wx, 9.06, 43.88);
    staticGroup.add(keystone);

    // Tall bronze French window frame + crossbars + glazing
    const winHead = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.12, 0.18), darkBronzeMat);
    winHead.position.set(wx, 8.90, 44.04);
    staticGroup.add(winHead);

    const winMid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.0, 0.16), darkBronzeMat);
    winMid.position.set(wx, 7.42, 44.04);
    staticGroup.add(winMid);

    const winTransom = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.07, 0.16), darkBronzeMat);
    winTransom.position.set(wx, 8.08, 44.04);
    staticGroup.add(winTransom);

    const winPane = new THREE.Mesh(new THREE.PlaneGeometry(ww - 0.1, 2.95), clearGlassMat);
    winPane.position.set(wx, 7.42, 44.04);
    winPane.rotation.y = Math.PI;
    staticGroup.add(winPane);

    // Pleated Parisian Sheer Cream Drapery framing each Floor 2 French Window inside
    [-1, 1].forEach((side) => {
      const drape = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.85, 0.12), softIvoryFabricMat);
      drape.position.set(wx + side * (ww * 0.5 - 0.22), 7.42, 44.24);
      staticGroup.add(drape);
    });

    // Wrought-iron balcony top & bottom rails + vertical balusters + gilded rosette
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.24, 0.07, 0.08), satinBrassMat);
    railTop.position.set(wx, 6.95, 43.52);
    staticGroup.add(railTop);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.24, 0.06, 0.08), wroughtIronMat);
    railBot.position.set(wx, 6.02, 43.52);
    staticGroup.add(railBot);

    const balCount = Math.max(5, Math.floor(ww * 4));
    for (let b = 0; b <= balCount; b++) {
      const bx = wx - (ww * 0.5) + (ww * b) / balCount;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.90, 0.035), wroughtIronMat);
      bar.position.set(bx, 6.48, 43.52);
      staticGroup.add(bar);
    }

    const rosette = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.05), satinBrassMat);
    rosette.rotation.z = Math.PI / 4;
    rosette.position.set(wx, 6.48, 43.51);
    staticGroup.add(rosette);
  };

  buildFrenchJulietWindow(414.9, 2.6);
  buildFrenchJulietWindow(418.4, 2.6);
  buildFrenchJulietWindow(423.9, 2.9);
  buildFrenchJulietWindow(429.4, 2.6);
  buildFrenchJulietWindow(432.9, 2.6);

  // Classical Parisian Dentil Cornice at Roofline (Y = 9.75 .. 10.18)
  const corniceSlab = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.28, 0.88), limestoneMat);
  corniceSlab.position.set(423.9, 9.88, 43.82);
  staticGroup.add(corniceSlab);
  for (let dx = 413.1; dx <= 434.7; dx += 0.45) {
    const dentil = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.22), warmStonePilarMat);
    dentil.position.set(dx, 9.68, 43.68);
    staticGroup.add(dentil);
  }

  // Classical Stone Finial Urns crowning the 4 Facade Pilasters + Rooftop Stone Balustrades
  [413.22, 420.15, 427.65, 434.58].forEach((fx) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.56), warmStonePilarMat);
    ped.position.set(fx, 10.18, 43.82);
    staticGroup.add(ped);
    const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.42, 12), limestoneMat);
    urn.position.set(fx, 10.56, 43.82);
    staticGroup.add(urn);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), satinBrassMat);
    flame.position.set(fx, 10.84, 43.82);
    staticGroup.add(flame);
  });

  // Parisian Stone Balustrades spanning left & right roof parapet bays
  [
    { startX: 413.6, endX: 419.7 },
    { startX: 428.1, endX: 434.2 },
  ].forEach(({ startX, endX }) => {
    const span = endX - startX;
    const cx = (startX + endX) * 0.5;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(span, 0.10, 0.24), limestoneMat);
    rail.position.set(cx, 10.54, 43.88);
    staticGroup.add(rail);
    const count = 9;
    for (let i = 0; i < count; i++) {
      const bx = startX + 0.35 + ((span - 0.7) * i) / (count - 1);
      const bal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.50, 8), warmStonePilarMat);
      bal.position.set(bx, 10.26, 43.88);
      staticGroup.add(bal);
    }
  });

  // Parisian Zinc Mansard Roof Crown (Y = 10.0 .. 11.6)
  const mansardFront = new THREE.Mesh(new THREE.BoxGeometry(21.4, 1.55, 1.4), mansardZincMat);
  mansardFront.position.set(423.9, 10.72, 44.85);
  mansardFront.rotation.x = 0.24;
  staticGroup.add(mansardFront);

  const mansardCap = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.20, 24.8), mansardZincMat);
  mansardCap.position.set(423.9, 11.48, 57.3);
  staticGroup.add(mansardCap);

  const roofCrestRail = new THREE.Mesh(new THREE.BoxGeometry(21.5, 0.10, 0.12), satinBrassMat);
  roofCrestRail.position.set(423.9, 11.58, 45.05);
  staticGroup.add(roofCrestRail);

  // Helper: Symmetrical Beveled Extruded Arch Pediment (Centered X = 0!)
  const createSymmetricalArchExtrude = (radius: number, depth: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-radius, 0);
    shape.absarc(0, 0, radius, Math.PI, 0, true);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth * 0.5);
    return geo;
  };

  // 2 Symmetrical Flanking Dormer Lucarnes
  const dormerArchGeo = createSymmetricalArchExtrude(0.95, 0.48);
  [416.6, 431.2].forEach((lx) => {
    const dormerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.35, 0.45), limestoneMat);
    dormerFrame.position.set(lx, 10.75, 44.32);
    staticGroup.add(dormerFrame);
    const dormerGlass = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 0.12), warmCoveMat);
    dormerGlass.position.set(lx, 10.70, 44.14);
    staticGroup.add(dormerGlass);
    const dormerArch = new THREE.Mesh(dormerArchGeo, limestoneMat);
    dormerArch.position.set(lx, 11.40, 44.32);
    staticGroup.add(dormerArch);
  });

  // Symmetrical Central European Pediment Crest with Hermès Paris 1837 Medallion
  const pedimentBase = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.42, 0.55), limestoneMat);
  pedimentBase.position.set(HERMES_DOOR_X, 10.72, 44.18);
  staticGroup.add(pedimentBase);

  const centralArchGeo = createSymmetricalArchExtrude(2.35, 0.62);
  const pedimentCrown = new THREE.Mesh(centralArchGeo, limestoneMat);
  pedimentCrown.position.set(HERMES_DOOR_X, 11.40, 44.18);
  staticGroup.add(pedimentCrown);

  const pedimentTrimGeo = createSymmetricalArchExtrude(2.44, 0.14);
  const pedimentTrim = new THREE.Mesh(pedimentTrimGeo, warmStonePilarMat);
  pedimentTrim.position.set(HERMES_DOOR_X, 11.40, 43.88);
  staticGroup.add(pedimentTrim);

  const crestRing = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.10, 28), satinBrassMat);
  crestRing.rotation.x = Math.PI / 2;
  crestRing.position.set(HERMES_DOOR_X, 11.35, 43.84);
  staticGroup.add(crestRing);

  const crestDisc = new THREE.Mesh(new THREE.CircleGeometry(0.66, 28), crestMedallionMat);
  crestDisc.rotation.y = Math.PI;
  crestDisc.position.set(HERMES_DOOR_X, 11.35, 43.78);
  staticGroup.add(crestDisc);

  // =========================================================================
  // 5. FLOOR 1 LUXURY INTERIOR — WINDOW BAYS, CARRÉ SILK WALL, ORANGE LACQUER & BAGS
  // =========================================================================
  const f1Ceil = new THREE.Mesh(new THREE.PlaneGeometry(21.4, 24.5), creamPlasterMat);
  f1Ceil.rotation.x = Math.PI / 2;
  f1Ceil.position.set(423.9, f2Y - 0.37, 57.0);
  staticGroup.add(f1Ceil);

  // Recessed Ceiling Spotlights across Floor 1
  for (let lx = 416.5; lx <= 431.5; lx += 3.7) {
    for (let lz = 48.0; lz <= 65.0; lz += 5.5) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 10), warmCoveMat);
      disc.position.set(lx, f2Y - 0.39, lz);
      staticGroup.add(disc);
    }
  }

  // Helper: Sculpted Hermès Birkin/Kelly Bag + Twilly Accent
  const addHermesBag = (x: number, y: number, z: number, colorHex: number, scale = 1.0, rotY = 0) => {
    const bag = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.38, metalness: 0.06 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.27, 0.16), leatherMat);
    body.position.y = 0.135;
    bag.add(body);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.06, 0.17), leatherMat);
    flap.position.set(0, 0.24, 0.005);
    bag.add(flap);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.025), satinBrassMat);
    clasp.position.set(0, 0.22, -0.09);
    bag.add(clasp);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 14, Math.PI), leatherMat);
    handle.position.set(0, 0.27, 0);
    bag.add(handle);

    bag.position.set(x, y, z);
    bag.scale.setScalar(scale);
    bag.rotation.y = rotY;
    staticGroup.add(bag);
  };

  // Helper: Stacked Signature Hermès Orange Gift Boxes tied with dark espresso ribbon
  const addHermesOrangeBoxes = (x: number, y: number, z: number, count = 3) => {
    let curY = y;
    for (let i = 0; i < count; i++) {
      const s = 0.48 - i * 0.08;
      const bh = 0.16 - i * 0.02;
      const box = new THREE.Mesh(new THREE.BoxGeometry(s, bh, s * 0.82), hermesOrangeBoxMat);
      box.position.set(x, curY + bh * 0.5, z);
      box.rotation.y = i * 0.16;
      staticGroup.add(box);
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(s + 0.01, bh + 0.008, 0.03), darkBronzeMat);
      ribbon.position.copy(box.position);
      ribbon.rotation.y = box.rotation.y;
      staticGroup.add(ribbon);
      curY += bh;
    }
  };

  // -- A. East Window Bay (Left side in Image 2: Bouclé Armchair, Travertine Side Table, Lamp, Terracotta Panel, Boxes) --
  const eastPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.24, 2.4), warmStonePilarMat);
  eastPlinth.position.set(431.1, HERMES_PODIUM_Y + 0.12, 46.1);
  staticGroup.add(eastPlinth);

  // Cream Parisian Armchair
  const chairGroup = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.36, 0.88), softIvoryFabricMat);
  seat.position.y = 0.22;
  chairGroup.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.56, 0.22), softIvoryFabricMat);
  back.position.set(0, 0.55, 0.33);
  chairGroup.add(back);
  [-0.40, 0.40].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.84), softIvoryFabricMat);
    arm.position.set(ax, 0.42, 0.02);
    chairGroup.add(arm);
  });
  chairGroup.position.set(431.4, HERMES_PODIUM_Y + 0.24, 46.1);
  chairGroup.rotation.y = Math.PI * 0.85;
  staticGroup.add(chairGroup);

  // Round Travertine & Brass Side Table + Teacup + Art Books beside Armchair
  const sideTableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 16), limestoneMat);
  sideTableTop.position.set(430.35, HERMES_PODIUM_Y + 0.68, 46.3);
  staticGroup.add(sideTableTop);
  const sideTablePed = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.42, 12), satinBrassMat);
  sideTablePed.position.set(430.35, HERMES_PODIUM_Y + 0.45, 46.3);
  staticGroup.add(sideTablePed);
  const teaCup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 10), softIvoryFabricMat);
  teaCup.position.set(430.32, HERMES_PODIUM_Y + 0.74, 46.28);
  staticGroup.add(teaCup);
  const artBook = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.18), hermesOrangeBoxMat);
  artBook.position.set(430.46, HERMES_PODIUM_Y + 0.72, 46.36);
  staticGroup.add(artBook);

  // Floor Lamp beside Armchair
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.55, 10), satinBrassMat);
  lampPole.position.set(432.65, HERMES_PODIUM_Y + 1.02, 46.4);
  staticGroup.add(lampPole);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.36, 16), warmCoveMat);
  lampShade.position.set(432.65, HERMES_PODIUM_Y + 1.82, 46.4);
  staticGroup.add(lampShade);

  // Warm Terracotta Feature Panel + Framed Silk Art in East Window
  const eastAccentPanel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.0, 2.2), terracottaVelvetMat);
  eastAccentPanel.position.set(434.25, HERMES_PODIUM_Y + 1.55, 47.4);
  staticGroup.add(eastAccentPanel);
  const eastWindowArt = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshStandardMaterial({ map: createHermesCarreSilkTex(2), roughness: 0.38 })
  );
  eastWindowArt.position.set(434.12, HERMES_PODIUM_Y + 1.85, 47.4);
  eastWindowArt.rotation.y = -Math.PI / 2;
  staticGroup.add(eastWindowArt);

  addHermesOrangeBoxes(429.4, HERMES_PODIUM_Y + 0.24, 45.6, 3);
  addHermesBag(430.15, HERMES_PODIUM_Y + 0.24, 45.35, 0xc85a24, 1.18, 0.22);

  // -- B. West Window Bay (Right side in Image 2: Orange Lacquer Cubes, Silk Scarf Display, Trunk & Bags) --
  const westPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.24, 2.4), warmStonePilarMat);
  westPlinth.position.set(416.7, HERMES_PODIUM_Y + 0.12, 46.1);
  staticGroup.add(westPlinth);

  const orangePed1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.68, 0.85), hermesOrangeLacquerMat);
  orangePed1.position.set(417.5, HERMES_PODIUM_Y + 0.58, 45.7);
  staticGroup.add(orangePed1);

  const orangePed2 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.52, 0.78), hermesOrangeLacquerMat);
  orangePed2.position.set(415.7, HERMES_PODIUM_Y + 0.50, 46.0);
  staticGroup.add(orangePed2);

  addHermesBag(417.5, HERMES_PODIUM_Y + 0.92, 45.7, 0xd96126, 1.22, -0.25);
  addHermesBag(418.4, HERMES_PODIUM_Y + 0.24, 45.4, 0x261d17, 1.05, 0.35);
  addHermesOrangeBoxes(415.7, HERMES_PODIUM_Y + 0.76, 46.0, 3);

  // Leather Travel Trunk + H-Buckle Stand on West Plinth
  const westTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.42, 0.52), warmCherryWoodMat);
  westTrunk.position.set(414.65, HERMES_PODIUM_Y + 0.45, 45.8);
  staticGroup.add(westTrunk);
  const trunkLatch = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.05, 0.54), satinBrassMat);
  trunkLatch.position.set(414.65, HERMES_PODIUM_Y + 0.58, 45.8);
  staticGroup.add(trunkLatch);

  // Draped Carré Silk Scarf Frame on West Plinth
  const scarfStand = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshStandardMaterial({ map: createHermesCarreSilkTex(0), roughness: 0.45 })
  );
  scarfStand.position.set(416.6, HERMES_PODIUM_Y + 1.12, 46.7);
  scarfStand.rotation.y = Math.PI;
  staticGroup.add(scarfStand);

  // -- C. Central Boutique Entrance Medallion, Illuminated Glass Vitrines & Perfumerie Pillars --
  // Entrance Inlaid H-Ex-Libris Brass Crest Medallion right inside doors
  const floorCrest = new THREE.Mesh(new THREE.CircleGeometry(0.85, 28), crestMedallionMat);
  floorCrest.rotation.x = -Math.PI / 2;
  floorCrest.position.set(423.9, HERMES_PODIUM_Y + 0.008, 48.3);
  staticGroup.add(floorCrest);

  // Two Museum-Lit Glass Showcase Vitrines flanking entrance aisle (X = 419.3 & 428.5, Z = 52.9)
  [419.3, 428.5].forEach((vx, idx) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.92, 1.4), warmCherryWoodMat);
    base.position.set(vx, HERMES_PODIUM_Y + 0.46, 52.9);
    staticGroup.add(base);

    const velvetLiner = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.03, 1.18), softIvoryFabricMat);
    velvetLiner.position.set(vx, HERMES_PODIUM_Y + 0.93, 52.9);
    staticGroup.add(velvetLiner);

    const glassCase = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.78, 1.25), clearGlassMat);
    glassCase.position.set(vx, HERMES_PODIUM_Y + 1.32, 52.9);
    staticGroup.add(glassCase);

    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.03, 0.08), warmCoveMat);
    ledStrip.position.set(vx, HERMES_PODIUM_Y + 1.66, 52.9);
    staticGroup.add(ledStrip);

    const brassEdge = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.04, 1.32), satinBrassMat);
    brassEdge.position.set(vx, HERMES_PODIUM_Y + 1.71, 52.9);
    staticGroup.add(brassEdge);

    addHermesBag(vx - 0.52, HERMES_PODIUM_Y + 0.95, 52.9, idx === 0 ? 0x261d17 : 0xc65320, 0.95, 0.25);
    addHermesBag(vx + 0.52, HERMES_PODIUM_Y + 0.95, 52.9, idx === 0 ? 0xa37850 : 0x1b4d34, 0.95, -0.25);

    // Clic H Enamel Bracelets & H-Hour Watches on Center Velvet Cushion
    [0xe86b27, 0x1b4d34, 0xf4ecdd, 0x1e3a5f].forEach((cHex, bi) => {
      const bangle = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.018, 8, 14),
        new THREE.MeshStandardMaterial({ color: cHex, roughness: 0.22, metalness: 0.3 })
      );
      bangle.rotation.x = Math.PI / 2;
      bangle.position.set(vx - 0.16 + bi * 0.11, HERMES_PODIUM_Y + 0.97, 52.65);
      staticGroup.add(bangle);
    });
  });

  // West Perfumerie & Rouge Hermès Display Pillar (X = 417.2, Z = 56.3)
  const perfBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 1.3), limestoneMat);
  perfBase.position.set(417.2, HERMES_PODIUM_Y + 0.50, 56.3);
  staticGroup.add(perfBase);
  const perfGlass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.72, 1.2), clearGlassMat);
  perfGlass.position.set(417.2, HERMES_PODIUM_Y + 1.36, 56.3);
  staticGroup.add(perfGlass);
  const perfTop = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.04, 1.26), satinBrassMat);
  perfTop.position.set(417.2, HERMES_PODIUM_Y + 1.72, 56.3);
  staticGroup.add(perfTop);
  [-0.36, 0, 0.36].forEach((ox, idx) => {
    const flacon = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.26, 0.10),
      new THREE.MeshStandardMaterial({
        color: [0xe87b35, 0xf7b955, 0xc8432b][idx],
        roughness: 0.15,
        metalness: 0.1,
      })
    );
    flacon.position.set(417.2 + ox, HERMES_PODIUM_Y + 1.14, 56.3);
    staticGroup.add(flacon);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 8), darkBronzeMat);
    cap.position.set(417.2 + ox, HERMES_PODIUM_Y + 1.30, 56.3);
    staticGroup.add(cap);
  });

  // East Shoe Salon Terracotta Leather Try-On Ottoman Bench (X = 430.6, Z = 56.3)
  const benchBase = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 1.05), satinBrassMat);
  benchBase.position.set(430.6, HERMES_PODIUM_Y + 0.10, 56.3);
  staticGroup.add(benchBase);
  const benchCushion = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.30, 1.12), terracottaVelvetMat);
  benchCushion.position.set(430.6, HERMES_PODIUM_Y + 0.34, 56.3);
  staticGroup.add(benchCushion);

  // Aubusson Rug under Central Salon (Y = HERMES_PODIUM_Y + 0.018)
  const f1Rug = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 8.8),
    new THREE.MeshStandardMaterial({ map: createHermesAubussonRugTex(), roughness: 0.88 })
  );
  f1Rug.rotation.x = -Math.PI / 2;
  f1Rug.position.set(423.9, HERMES_PODIUM_Y + 0.018, 53.5);
  staticGroup.add(f1Rug);

  // Signature Hermès Orange Lacquer Concierge / Cash Counter (Z = 59.5) + Wrapping Station Props
  const mainCounter = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.06, 1.35), hermesOrangeLacquerMat);
  mainCounter.position.set(423.9, HERMES_PODIUM_Y + 0.53, 59.5);
  staticGroup.add(mainCounter);

  const counterMarbleTop = new THREE.Mesh(new THREE.BoxGeometry(5.12, 0.08, 1.45), limestoneMat);
  counterMarbleTop.position.set(423.9, HERMES_PODIUM_Y + 1.08, 59.5);
  staticGroup.add(counterMarbleTop);

  // Wrapping Gift Box + Tissue Paper + POS Monitor + Brass Bell on Counter
  addHermesOrangeBoxes(422.75, HERMES_PODIUM_Y + 1.12, 59.5, 2);
  const posStand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.04), darkBronzeMat);
  posStand.position.set(424.9, HERMES_PODIUM_Y + 1.28, 59.5);
  staticGroup.add(posStand);
  const deskBell = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), satinBrassMat);
  deskBell.position.set(423.85, HERMES_PODIUM_Y + 1.15, 59.25);
  staticGroup.add(deskBell);

  // Pair of Warm Brass Table Lamps on Concierge Counter
  [421.85, 425.95].forEach((lx) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.34, 10), satinBrassMat);
    stem.position.set(lx, HERMES_PODIUM_Y + 1.29, 59.5);
    staticGroup.add(stem);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.20, 0.20, 12), warmCoveMat);
    shade.position.set(lx, HERMES_PODIUM_Y + 1.50, 59.5);
    staticGroup.add(shade);
  });

  // Grand Illuminated Carré Silk Wall Island behind Counter (Z = 64.8, 8 Silk Scarves + Porcelain Niches)
  const silkWall = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.6, 0.58), warmCherryWoodMat);
  silkWall.position.set(423.9, HERMES_PODIUM_Y + 1.80, 64.8);
  staticGroup.add(silkWall);

  const silkWallSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.68), signBacklitMat);
  silkWallSign.position.set(423.9, HERMES_PODIUM_Y + 3.20, 64.48);
  silkWallSign.rotation.y = Math.PI;
  staticGroup.add(silkWallSign);

  // 8 Framed Silk Carrés (2 rows x 4 columns)
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) {
      const sx = 421.95 + i * 1.30;
      const sy = HERMES_PODIUM_Y + (row === 0 ? 2.28 : 1.18);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.06), satinBrassMat);
      frame.position.set(sx, sy, 64.49);
      staticGroup.add(frame);
      const silk = new THREE.Mesh(
        new THREE.PlaneGeometry(0.84, 0.84),
        new THREE.MeshStandardMaterial({ map: createHermesCarreSilkTex(i + row * 2), roughness: 0.38 })
      );
      silk.position.set(sx, sy, 64.45);
      silk.rotation.y = Math.PI;
      staticGroup.add(silk);
    }
  }

  // Side Wall Illuminated Arched Niche Galleries (West X = 413.7, East X = 434.1)
  const buildSideShelfWall = (wx: number, facingDir: 1 | -1, zStart: number, zEnd: number) => {
    const len = zEnd - zStart;
    const cz = (zStart + zEnd) * 0.5;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.8, len), warmCherryWoodMat);
    back.position.set(wx, HERMES_PODIUM_Y + 1.9, cz);
    staticGroup.add(back);

    // Warm Glowing LED Cove Header above Side Shelf Gallery
    const coveStrip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, len - 0.3), warmCoveMat);
    coveStrip.position.set(wx + facingDir * 0.38, HERMES_PODIUM_Y + 3.68, cz);
    staticGroup.add(coveStrip);

    // Warm Backlit Vertical Pilasters dividing the shelves into Parisian arches
    for (let z = zStart + 0.2; z <= zEnd - 0.1; z += 3.2) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.8, 0.24), flutedTeakMat);
      col.position.set(wx + facingDir * 0.18, HERMES_PODIUM_Y + 1.9, z);
      staticGroup.add(col);
    }

    for (let s = 0; s < 3; s++) {
      const sy = HERMES_PODIUM_Y + 0.85 + s * 0.92;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, len - 0.4), flutedTeakMat);
      shelf.position.set(wx + facingDir * 0.26, sy, cz);
      staticGroup.add(shelf);

      for (let z = zStart + 1.0; z <= zEnd - 0.8; z += 1.75) {
        if ((s + Math.floor(z)) % 2 === 0) {
          addHermesBag(
            wx + facingDir * 0.30,
            sy + 0.03,
            z,
            [0xc85a24, 0x261d17, 0x9c7248, 0x1b4d34][(s + Math.floor(z)) % 4],
            0.98,
            facingDir > 0 ? Math.PI / 2 : -Math.PI / 2
          );
        } else {
          addHermesOrangeBoxes(wx + facingDir * 0.30, sy + 0.03, z, 2);
        }
      }
    }
  };
  buildSideShelfWall(413.7, 1, 49.5, 63.5);
  buildSideShelfWall(434.1, -1, 49.5, 59.0);

  // Full-Length Gilded Fitting Mirror beside West Shelf Wall (Z = 65.5)
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.8, 1.3), satinBrassMat);
  mirrorFrame.position.set(413.45, HERMES_PODIUM_Y + 1.45, 66.2);
  staticGroup.add(mirrorFrame);
  const mirrorGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 2.58),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.08 })
  );
  mirrorGlass.position.set(413.52, HERMES_PODIUM_Y + 1.45, 66.2);
  mirrorGlass.rotation.y = Math.PI / 2;
  staticGroup.add(mirrorGlass);

  // =========================================================================
  // 6. SE PARISIAN SWITCHBACK STAIRCASE (X = 428.9..433.9, Z = 62.5..69.4)
  // =========================================================================
  // Left Flight (X = 429.0..431.25): Z = 62.5 (Y = 0.14) -> Z = 67.6 (Y = 2.84)
  // Mid-Landing (X = 428.9..433.9): Z = 67.6..69.4 (Y = 2.84)
  // Right Flight (X = 431.55..433.8): Z = 67.6 (Y = 2.84) -> Z = 62.5 (Y = 5.54)
  const buildHermesStairFlight = () => {
    const halfH = HERMES_FLOOR_H * 0.5;
    const stepsPerFlight = 12;
    const stairStepMat = limestoneMat;
    const riserBronzeMat = darkBronzeMat;

    // Flight 1 (Ascending South +Z on West lane X = 430.12)
    for (let i = 0; i < stepsPerFlight; i++) {
      const t = (i + 0.5) / stepsPerFlight;
      const sy = HERMES_PODIUM_Y + t * halfH;
      const sz = 62.6 + t * 5.0;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(2.1, halfH / stepsPerFlight, 5.0 / stepsPerFlight + 0.06), stairStepMat);
      tread.position.set(430.12, sy - (halfH / stepsPerFlight) * 0.5, sz);
      staticGroup.add(tread);
    }

    // Mid-Landing (Z = 67.6 .. 69.4, Y = HERMES_PODIUM_Y + halfH)
    const landing = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.24, 1.85), stairStepMat);
    landing.position.set(431.4, HERMES_PODIUM_Y + halfH - 0.12, 68.52);
    staticGroup.add(landing);

    // Flight 2 (Ascending North -Z on East lane X = 432.68)
    for (let i = 0; i < stepsPerFlight; i++) {
      const t = (i + 0.5) / stepsPerFlight;
      const sy = HERMES_PODIUM_Y + halfH + t * halfH;
      const sz = 67.6 - t * 5.0;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(2.1, halfH / stepsPerFlight, 5.0 / stepsPerFlight + 0.06), stairStepMat);
      tread.position.set(432.68, sy - (halfH / stepsPerFlight) * 0.5, sz);
      staticGroup.add(tread);
    }

    // Balustrade Walls & Brass Handrails
    const westRailWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 6.8), riserBronzeMat);
    westRailWall.position.set(428.82, HERMES_PODIUM_Y + 0.52, 65.9);
    staticGroup.add(westRailWall);

    const centerSpine = new THREE.Mesh(new THREE.BoxGeometry(0.18, HERMES_FLOOR_H + 0.9, 5.1), warmCherryWoodMat);
    centerSpine.position.set(431.40, HERMES_PODIUM_Y + (HERMES_FLOOR_H + 0.9) * 0.5, 65.05);
    staticGroup.add(centerSpine);

    // Floor 2 Stairwell Guardrail bordering West edge (X = 428.82, Y = 5.54 .. 6.54)
    const f2StairRail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.98, 6.9), satinBrassMat);
    f2StairRail.position.set(428.82, f2Y + 0.49, 65.95);
    staticGroup.add(f2StairRail);
  };
  buildHermesStairFlight();

  // =========================================================================
  // 7. FLOOR 2 INTERIOR — PARISIAN SALON PRIVÉ & EQUESTRIAN HERITAGE GALLERY
  // =========================================================================
  const f2Mosaic = new THREE.Mesh(new THREE.PlaneGeometry(21.0, 18.2), mosaicFloorMat);
  f2Mosaic.rotation.x = -Math.PI / 2;
  f2Mosaic.position.set(423.9, f2Y + 0.004, 53.1);
  staticGroup.add(f2Mosaic);

  // Floor 2 Warm Cove Ceiling & Recessed Downlights
  const f2Ceil = new THREE.Mesh(new THREE.PlaneGeometry(21.4, 25.0), creamPlasterMat);
  f2Ceil.rotation.x = Math.PI / 2;
  f2Ceil.position.set(423.9, 9.52, 56.8);
  staticGroup.add(f2Ceil);
  for (let lx = 416.5; lx <= 431.5; lx += 3.7) {
    for (let lz = 47.0; lz <= 62.0; lz += 5.0) {
      const f2Disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 10), warmCoveMat);
      f2Disc.position.set(lx, 9.50, lz);
      staticGroup.add(f2Disc);
    }
  }

  // Grand Two-Tier Brass & Crystal Chandelier hanging in Center Salon Privé
  const chandStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 10), satinBrassMat);
  chandStem.position.set(423.9, f2Y + 3.60, 51.8);
  staticGroup.add(chandStem);
  const chandRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.055, 10, 28), satinBrassMat);
  chandRing.rotation.x = Math.PI / 2;
  chandRing.position.set(423.9, f2Y + 3.22, 51.8);
  staticGroup.add(chandRing);
  const chandRingInner = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.04, 8, 22), satinBrassMat);
  chandRingInner.rotation.x = Math.PI / 2;
  chandRingInner.position.set(423.9, f2Y + 3.36, 51.8);
  staticGroup.add(chandRingInner);
  for (let b = 0; b < 12; b++) {
    const a = (b / 12) * Math.PI * 2;
    const r = b % 2 === 0 ? 1.55 : 0.88;
    const h = b % 2 === 0 ? 3.12 : 3.26;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), warmCoveMat);
    bulb.position.set(423.9 + Math.cos(a) * r, f2Y + h, 51.8 + Math.sin(a) * r);
    staticGroup.add(bulb);
  }

  // Salon Privé Left & Right Velvet Sofas + Matching Armchairs + Tea Sets + Framed Art
  [417.3, 430.5].forEach((sx, idx) => {
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 5.0),
      new THREE.MeshStandardMaterial({ map: createHermesAubussonRugTex(), roughness: 0.88 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(sx, f2Y + 0.015, 51.6);
    staticGroup.add(rug);

    const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.44, 0.95), terracottaVelvetMat);
    sofa.position.set(sx, f2Y + 0.22, 52.8);
    staticGroup.add(sofa);
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.56, 0.22), terracottaVelvetMat);
    sofaBack.position.set(sx, f2Y + 0.54, 53.18);
    staticGroup.add(sofaBack);

    const cTable = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 0.88), limestoneMat);
    cTable.position.set(sx, f2Y + 0.21, 51.1);
    staticGroup.add(cTable);
    const teaPot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.14, 12), satinBrassMat);
    teaPot.position.set(sx - 0.18, f2Y + 0.49, 51.1);
    staticGroup.add(teaPot);
    const boxAccent = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.08, 0.22), hermesOrangeBoxMat);
    boxAccent.position.set(sx + 0.22, f2Y + 0.46, 51.15);
    staticGroup.add(boxAccent);

    // Side Wall Illuminated Equestrian Artwork
    const wallX = idx === 0 ? 413.42 : 434.38;
    const artRotY = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
    const artFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 1.55), satinBrassMat);
    artFrame.position.set(wallX, f2Y + 2.05, 51.5);
    staticGroup.add(artFrame);
    const artPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.38, 1.38),
      new THREE.MeshStandardMaterial({ map: createHermesCarreSilkTex(idx + 1), roughness: 0.35 })
    );
    artPlane.position.set(wallX + (idx === 0 ? 0.05 : -0.05), f2Y + 2.05, 51.5);
    artPlane.rotation.y = artRotY;
    staticGroup.add(artPlane);
  });

  // Central Sculpted Equestrian Leather Saddle Pedestal (Y = f2Y)
  const saddleBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.28, 0.92, 20), warmCherryWoodMat);
  saddleBase.position.set(423.9, f2Y + 0.46, 52.2);
  staticGroup.add(saddleBase);
  const saddleBaseTrim = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.035, 8, 24), satinBrassMat);
  saddleBaseTrim.rotation.x = Math.PI / 2;
  saddleBaseTrim.position.set(423.9, f2Y + 0.92, 52.2);
  staticGroup.add(saddleBaseTrim);
  const saddleStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.38, 10), satinBrassMat);
  saddleStand.position.set(423.9, f2Y + 1.11, 52.2);
  staticGroup.add(saddleStand);
  const saddleLeatherMat = new THREE.MeshStandardMaterial({ color: 0xa35325, roughness: 0.34 });
  const saddleSeat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.88), saddleLeatherMat);
  saddleSeat.position.set(423.9, f2Y + 1.34, 52.2);
  staticGroup.add(saddleSeat);
  [-0.32, 0.32].forEach((fx) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.56), saddleLeatherMat);
    flap.position.set(423.9 + fx, f2Y + 1.18, 52.2);
    flap.rotation.z = fx > 0 ? -0.26 : 0.26;
    staticGroup.add(flap);
    const stirrup = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 12), satinBrassMat);
    stirrup.position.set(423.9 + fx * 1.12, f2Y + 0.96, 52.2);
    staticGroup.add(stirrup);
  });

  // Floor 2 Front Window Museum Vitrines (Himalaya Crocodile Birkin, Kelly & Vintage Trunk)
  [418.5, 429.3].forEach((vx, i) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.88, 1.1), hermesOrangeLacquerMat);
    ped.position.set(vx, f2Y + 0.44, 46.0);
    staticGroup.add(ped);
    const vitrine = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.78, 0.95), clearGlassMat);
    vitrine.position.set(vx, f2Y + 1.27, 46.0);
    staticGroup.add(vitrine);
    const topLed = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.03, 0.08), warmCoveMat);
    topLed.position.set(vx, f2Y + 1.63, 46.0);
    staticGroup.add(topLed);
    addHermesBag(vx - 0.38, f2Y + 0.90, 46.0, i === 0 ? 0xe7dfd3 : 0xb33022, 1.25, 0.18);
    addHermesOrangeBoxes(vx + 0.48, f2Y + 0.90, 46.0, 2);
  });

  // Floor 2 Atelier Leather Workbench (Z = 59.5) + Banker Lamps & Rolled Calfskin Hides
  const atelierDesk = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.95, 1.35), warmCherryWoodMat);
  atelierDesk.position.set(423.9, f2Y + 0.475, 59.5);
  staticGroup.add(atelierDesk);
  const hideColors = [0xc85a24, 0xa37850, 0x261d17, 0x1b4d34];
  hideColors.forEach((hCol, hi) => {
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.72, 12),
      new THREE.MeshStandardMaterial({ color: hCol, roughness: 0.45 })
    );
    roll.rotation.z = Math.PI / 2;
    roll.position.set(422.15 + hi * 0.88, f2Y + 1.06, 59.45);
    staticGroup.add(roll);
  });
  [421.7, 426.1].forEach((lx) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.32, 10), satinBrassMat);
    base.position.set(lx, f2Y + 1.11, 59.65);
    staticGroup.add(base);
    const shade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.16), warmCoveMat);
    shade.position.set(lx, f2Y + 1.30, 59.65);
    staticGroup.add(shade);
  });

  // Floor 2 Illuminated South Atelier Sign Panel (directly visible from street through Floor 2 center window!)
  const f2SignPanel = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.5, 0.24), warmCherryWoodMat);
  f2SignPanel.position.set(423.9, f2Y + 2.0, 69.25);
  staticGroup.add(f2SignPanel);
  const f2SignWordmark = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.86), signBacklitMat);
  f2SignWordmark.position.set(423.9, f2Y + 2.2, 69.10);
  f2SignWordmark.rotation.y = Math.PI;
  staticGroup.add(f2SignWordmark);

  // =========================================================================
  // 8. LIGHTING RIG (WARM PARISIAN STOREFRONT + FACADE WASHERS + SALON GLOW)
  // =========================================================================
  let doorSlide = 0;
  let closedFactor = 0;

  const addLight = (
    x: number,
    y: number,
    z: number,
    color: number,
    dayI: number,
    nightI: number,
    dist: number,
    closedDimFactor = 0.25
  ) => {
    const light = new THREE.PointLight(color, dayI, dist, 1.05);
    light.position.set(x, y, z);
    light.userData.noMerge = true;
    staticGroup.add(light);
    scaledLights.push({
      light,
      dayInt: dayI,
      nightInt: nightI,
      getScale: () => 1.0 - closedFactor * closedDimFactor,
    });
  };

  // Exterior Facade Architectural Washers (keep cream limestone fascia, Juliet balconies & pediment radiant at night!)
  addLight(416.6, 5.2, 41.8, 0xffe4b8, 0.6, 3.8, 16, 0.0);
  addLight(423.9, 6.0, 41.6, 0xffe4b8, 0.7, 4.4, 18, 0.0);
  addLight(431.2, 5.2, 41.8, 0xffe4b8, 0.6, 3.8, 16, 0.0);
  // Warm Showcase Bays & Recessed Vestibule Wash (stay brightly lit like Champs-Élysées vitrines!)
  addLight(416.6, 3.2, 45.2, 0xffdfb0, 1.5, 5.2, 14, 0.15);
  addLight(431.2, 3.2, 45.2, 0xffdfb0, 1.5, 5.2, 14, 0.15);
  addLight(423.9, 3.6, 44.5, 0xffdfa8, 1.6, 5.0, 14, 0.18);
  // Floor 1 Salon & Carré Wall Glow
  addLight(423.9, 4.1, 54.5, 0xffe4bd, 1.5, 5.4, 20, 0.22);
  addLight(423.9, 4.1, 62.5, 0xffe4bd, 1.3, 4.8, 18, 0.22);
  // Floor 2 Salon Privé & Atelier Glow (highly visible from street at night!)
  addLight(417.3, f2Y + 3.0, 49.0, 0xffe3b5, 1.2, 4.4, 15, 0.20);
  addLight(423.9, f2Y + 3.1, 52.0, 0xffe3b5, 1.4, 5.0, 18, 0.20);
  addLight(430.5, f2Y + 3.0, 49.0, 0xffe3b5, 1.2, 4.4, 15, 0.20);

  const update = (
    delta: number,
    rawHour: number,
    _lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: HermesNpcController | null
  ) => {
    const dt = Math.min(delta, 0.08);
    const isOpen = isHermesOpenAtHour(rawHour);

    const targetClosed = isOpen ? 0 : 1;
    closedFactor = THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 1.4));
    setShutterProgress(shutterHandle, closedFactor);

    const playerDist = playerPos
      ? Math.hypot(playerPos.x - HERMES_DOOR_X, playerPos.z - HERMES_DOOR_Z)
      : 999;
    const npcNear = npcController?.hasNpcNearDoor() ?? false;
    const shouldOpen = isOpen && (playerDist < 4.6 || npcNear);
    const targetSlide = shouldOpen ? 1.0 : 0.0;
    doorSlide = THREE.MathUtils.lerp(doorSlide, targetSlide, Math.min(1, dt * 7.5));

    leftDoorLeaf.position.x = HERMES_DOOR_X - 0.79 - doorSlide * 1.32;
    rightDoorLeaf.position.x = HERMES_DOOR_X + 0.79 + doorSlide * 1.32;
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => closedFactor,
    update,
  };
}

// =========================================================================
// HERMÈS CLIENT ADVISORS & PARISIAN BOUTIQUE SHOPPERS
// =========================================================================

type HermesNpcKind = 'advisor' | 'shopper';

interface HermesActor {
  id: number;
  kind: HermesNpcKind;
  root: THREE.Group;
  headMesh: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  orangeBag: THREE.Object3D;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: 'browse' | 'admire' | 'walk_leave' | 'respawn_wait';
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

const HERMES_ADVISOR_SPOTS = [
  { x: 423.9, y: HERMES_PODIUM_Y, z: 60.8, yaw: Math.PI }, // Floor 1 Concierge Desk
  { x: 420.5, y: HERMES_PODIUM_Y, z: 54.4, yaw: Math.PI * 0.75 }, // Floor 1 Silk Gallery Advisor
  { x: 423.9, y: HERMES_PODIUM_Y + HERMES_FLOOR_H, z: 60.8, yaw: Math.PI }, // Floor 2 Atelier Desk
];

const HERMES_SHOPPER_SPOTS: Array<{ pos: [number, number, number]; yaw: number }> = [
  { pos: [419.3, HERMES_PODIUM_Y, 50.8], yaw: 0 },
  { pos: [428.5, HERMES_PODIUM_Y, 50.8], yaw: 0 },
  { pos: [416.2, HERMES_PODIUM_Y, 56.5], yaw: -Math.PI * 0.5 },
  { pos: [431.6, HERMES_PODIUM_Y, 54.0], yaw: Math.PI * 0.5 },
  { pos: [423.9, HERMES_PODIUM_Y, 57.6], yaw: 0 },
  { pos: [417.3, HERMES_PODIUM_Y + HERMES_FLOOR_H, 50.0], yaw: 0 },
  { pos: [423.9, HERMES_PODIUM_Y + HERMES_FLOOR_H, 49.8], yaw: 0 },
];

export class HermesNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: HermesActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    HERMES_ADVISOR_SPOTS.forEach((sp, idx) => {
      this.actors.push(
        this.spawnActor(idx, 'advisor', helpers, new THREE.Vector3(sp.x, sp.y, sp.z), sp.yaw)
      );
    });

    for (let i = 0; i < 4; i++) {
      const spot = HERMES_SHOPPER_SPOTS[i % 5];
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
    kind: HermesNpcKind,
    helpers: HospitalCharacterHelpers,
    homePos: THREE.Vector3,
    homeYaw: number
  ): HermesActor {
    const root = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    root.add(fallbackGroup);
    root.position.copy(homePos);
    root.rotation.y = homeYaw;

    const paletteShirt = [0x1e293b, 0x3a2b22, 0xf4ecdd, 0xc85a24, 0x111827];
    const palettePants = [0x111827, 0x261d17, 0x44403c];
    const isAdvisor = kind === 'advisor';
    const shirtColor = isAdvisor ? 0x1b1918 : paletteShirt[id % paletteShirt.length];
    const pantsColor = isAdvisor ? 0x111827 : palettePants[id % palettePants.length];
    const skinHex = ['#f3d2b3', '#e8be94', '#f1c7a4'][id % 3];

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.78 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.45 });
    const orangeAccentMat = new THREE.MeshStandardMaterial({ color: 0xe86b27, roughness: 0.45 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: id % 2 === 0 ? 0x18181b : 0x4a2f1d, roughness: 0.78 });

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
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.02), orangeAccentMat);
      tie.position.set(0, 0.08, 0.14);
      torso.add(tie);
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

    const orangeBag = new THREE.Group();
    const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.30), orangeAccentMat);
    bagMesh.position.set(0.02, -0.58, 0.04);
    orangeBag.add(bagMesh);
    orangeBag.visible = false;
    rightArm.add(orangeBag);

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
        : pickStationaryCivilianModel(id + 101)
      : pickShopCustomerModel(id + 103);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: root,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: isAdvisor && id === 0 ? 'Checkout' : 'Idle',
      phaseOffset: id * 0.53,
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
      orangeBag,
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

  private assignNewSpot(a: HermesActor, spawnOutside = false) {
    const f1Count = 5;
    const spot = HERMES_SHOPPER_SPOTS[(a.id + Math.floor(this.timer * 0.5)) % f1Count];
    const targetPos = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]);

    if (spawnOutside) {
      a.orangeBag.visible = false;
      a.root.position.set(HERMES_DOOR_X + (a.id % 2 === 0 ? -4.2 : 4.2), 0.02, 40.5);
      a.pathQueue = [
        new THREE.Vector3(HERMES_DOOR_X, 0.03, 43.8),
        new THREE.Vector3(HERMES_DOOR_X, HERMES_PODIUM_Y, 45.8),
        new THREE.Vector3(HERMES_DOOR_X, HERMES_PODIUM_Y, 50.0),
        targetPos,
      ];
    } else {
      a.pathQueue = [new THREE.Vector3(HERMES_DOOR_X, HERMES_PODIUM_Y, 55.5), targetPos];
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
      a.orangeBag.visible = false;
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
      if (!a.root.visible || a.homePos.y > HERMES_PODIUM_Y + 0.5) {
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
      if (Math.hypot(p.x - HERMES_DOOR_X, p.z - HERMES_DOOR_Z) <= 3.6) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: HermesActor, dt: number): boolean {
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

    const isOpen = isHermesOpenAtHour(rawHour);
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
      new THREE.Vector3(HERMES_DOOR_X, HERMES_PODIUM_Y, 50.0),
      new THREE.Vector3(HERMES_DOOR_X, HERMES_PODIUM_Y, 45.8),
      new THREE.Vector3(HERMES_DOOR_X, 0.03, 43.8),
      new THREE.Vector3(416.0, 0.02, 40.5),
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
            a.orangeBag.visible = true;
            a.pathQueue = [
              new THREE.Vector3(HERMES_DOOR_X, HERMES_PODIUM_Y, 50.0),
              new THREE.Vector3(HERMES_DOOR_X, HERMES_PODIUM_Y, 45.8),
              new THREE.Vector3(HERMES_DOOR_X, 0.03, 43.8),
              new THREE.Vector3(416.0, 0.02, 40.5),
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
          a.orangeBag.visible = false;
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
