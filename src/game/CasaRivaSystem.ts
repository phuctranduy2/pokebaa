import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalElevatorApi, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';

export interface CasaRivaBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  elevators: HospitalElevatorApi[];
  update: (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: CasaRivaNpcController | null
  ) => void;
}

// =========================================================================
// TUI BLUE • ThaiGrand • CASA RIVA LUXURY TOWER & HOTEL (ĐƯỜNG BẠCH ĐẰNG)
// Waterfront Plot directly West of Huawei Flagship Store:
//   X = 254.0 .. 314.0 (60.0m wide, centered at 284.0)
//   Z = -104.0 .. -52.0 (52.0m deep)
//   - Front Porte-Cochère Arrival Court & Infinity Weir Fountain: Z = -104.0 .. -88.0
//   - Walk-In 2-Story Champagne-Travertine & Golden Filigree Podium: Z = -88.0 .. -53.5
//   - 20-Story Twin-Wing Luxury Residences & Hotel Tower: Y = 10.65 .. 74.0m
//   - Active Black Chauffeur Fleet (Maybach Sedan + Porsche Coupe) picking up & dropping off VIP guests!
// =========================================================================

export const CASA_RIVA_PODIUM_Y = 0.08;
export const CASA_RIVA_FLOOR_H = 5.4;

export const CASA_RIVA_MIN_X = 254.0;
export const CASA_RIVA_MAX_X = 314.0;
export const CASA_RIVA_MIN_Z = -104.0;
export const CASA_RIVA_MAX_Z = -52.0;

const DOOR_CENTER_X = 284.0;
const DOOR_Z = -88.0;

export function isCasaRivaOpenAtHour(_rawHour: number): boolean {
  // 24/7 Luxury Hotel Lobby, Porte-Cochère & Concierge
  return true;
}

export const CASA_RIVA_COLLIDERS: IntersectionColliderBox[] = [
  // Floor 1 Podium North Facade Wall/Glass (X = 256.5..311.5, Z = -88.0, leaves center portal X=281.6..286.4 OPEN!)
  { minX: 256.3, maxX: 281.6, minZ: -88.45, maxZ: -87.55, floor: 1 },
  { minX: 286.4, maxX: 311.7, minZ: -88.45, maxZ: -87.55, floor: 1 },
  // Floor 1 & 2 Side & Rear Podium Envelope Walls
  { minX: 256.1, maxX: 257.0, minZ: -88.2, maxZ: -53.3, floor: 'both' },
  { minX: 311.0, maxX: 311.9, minZ: -88.2, maxZ: -53.3, floor: 'both' },
  { minX: 256.3, maxX: 311.7, minZ: -54.0, maxZ: -53.1, floor: 'both' },

  // Floor 2 Full North Facade Wall/Glass
  { minX: 256.3, maxX: 311.7, minZ: -88.45, maxZ: -87.55, floor: 2 },

  // Monumental Porte-Cochère Double Travertine Piers (Z = -96.4 .. -95.1)
  { minX: 266.7, maxX: 268.3, minZ: -96.5, maxZ: -95.0, floor: 1 },
  { minX: 276.6, maxX: 278.4, minZ: -96.5, maxZ: -95.0, floor: 1 },
  { minX: 289.6, maxX: 291.4, minZ: -96.5, maxZ: -95.0, floor: 1 },
  { minX: 299.7, maxX: 301.3, minZ: -96.5, maxZ: -95.0, floor: 1 },

  // Front Arrival Plaza Infinity Weir Fountain Island & Relocated Arrival Monolith
  { minX: 277.2, maxX: 290.8, minZ: -102.0, maxZ: -98.2, floor: 1 },
  { minX: 265.2, maxX: 266.4, minZ: -101.0, maxZ: -99.8, floor: 1 },

  // Floor 1 Lobby Interiors: Reception Desk, Reception Backwall, Enclosed Elevator Shaft Piers, Lounge Clusters
  { minX: 279.0, maxX: 289.0, minZ: -69.6, maxZ: -67.2, floor: 1 }, // Marble Reception Counter
  { minX: 277.5, maxX: 290.5, minZ: -64.75, maxZ: -64.05, floor: 1 }, // F1 Fluted Reception Backwall (walkable behind!)
  // Dual Recessed South Elevator Core Piers & Rear Wall (X = 279.1..288.9, Z = -57.35..-53.85 — leaves bays 280.15..282.65 & 285.35..287.85 open!)
  { minX: 279.0, maxX: 280.15, minZ: -57.4, maxZ: -53.8, floor: 'both' }, // Elevator West Pier
  { minX: 282.65, maxX: 285.35, minZ: -57.4, maxZ: -53.8, floor: 'both' }, // Elevator Center Pier & Call Console
  { minX: 287.85, maxX: 289.0, minZ: -57.4, maxZ: -53.8, floor: 'both' }, // Elevator East Pier
  { minX: 279.0, maxX: 289.0, minZ: -54.35, maxZ: -53.5, floor: 'both' }, // Elevator Rear Shaft Wall
  { minX: 270.0, maxX: 275.8, minZ: -80.8, maxZ: -75.4, floor: 1 }, // West Lobby Sofa Island
  { minX: 292.2, maxX: 298.0, minZ: -80.8, maxZ: -75.4, floor: 1 }, // East Lobby Sofa Island
  { minX: 299.0, maxX: 305.0, minZ: -75.2, maxZ: -71.0, floor: 1 }, // East Espresso & Champagne Bar
  { minX: 305.4, maxX: 308.6, minZ: -85.0, maxZ: -77.6, floor: 1 }, // East Window Bistro Tables (x2)
  { minX: 275.4, maxX: 276.8, minZ: -62.2, maxZ: -60.6, floor: 1 }, // Brass Birdcage Bellhop Cart
  { minX: 269.8, maxX: 271.2, minZ: -86.2, maxZ: -84.8, floor: 1 }, // West Indoor Planter Pedestal
  { minX: 296.8, maxX: 298.2, minZ: -86.2, maxZ: -84.8, floor: 1 }, // East Indoor Planter Pedestal
  { minX: 257.8, maxX: 259.6, minZ: -84.0, maxZ: -82.0, floor: 1 }, // West Gallery Amphora Plinth
  { minX: 257.9, maxX: 259.4, minZ: -67.6, maxZ: -63.4, floor: 1 }, // West Gallery Marble Bench
  { minX: 271.4, maxX: 275.0, minZ: -60.2, maxZ: -56.4, floor: 1 }, // F1 VIP Concierge Waiting Nook

  // Central Atrium Full-Height Columns (X = 275.2 & 292.8 at Z = -80.9 & -66.1)
  { minX: 274.6, maxX: 275.8, minZ: -81.5, maxZ: -80.3, floor: 'both' },
  { minX: 292.2, maxX: 293.4, minZ: -81.5, maxZ: -80.3, floor: 'both' },
  { minX: 274.6, maxX: 275.8, minZ: -66.7, maxZ: -65.5, floor: 'both' },
  { minX: 292.2, maxX: 293.4, minZ: -66.7, maxZ: -65.5, floor: 'both' },

  // Floor 1-2 West Switchback Stairwell Guardrails & Under-Stair Clearance (X = 262.0..267.0, Z = -79.4..-71.4)
  { minX: 261.75, maxX: 262.15, minZ: -79.6, maxZ: -71.3, floor: 'both' }, // West Stair Glass Rail
  { minX: 266.85, maxX: 267.25, minZ: -79.6, maxZ: -71.3, floor: 'both' }, // East Stair Glass Rail
  { minX: 261.8, maxX: 267.2, minZ: -79.65, maxZ: -79.15, floor: 'both' }, // North Landing Guard Rail
  { minX: 264.45, maxX: 267.0, minZ: -79.2, maxZ: -71.4, floor: 1 }, // F1 Under-Upper-Flight Guard (keeps entry clean on X=262.1..264.4)
  { minX: 262.0, maxX: 264.55, minZ: -71.65, maxZ: -71.25, floor: 2 }, // F2 Down-flight Guard Rail (open only on X=264.55..266.9!)

  // Floor 2 Central Double-Height Atrium Cutout Balustrades (ALL 4 Sides: X=275.2..292.8, Z=-80.9..-66.1)
  { minX: 275.0, maxX: 293.0, minZ: -81.2, maxZ: -80.65, floor: 2 }, // North Atrium Glass Rail
  { minX: 275.0, maxX: 293.0, minZ: -66.35, maxZ: -65.8, floor: 2 }, // South Atrium Glass Rail
  { minX: 274.95, maxX: 275.45, minZ: -81.0, maxZ: -66.0, floor: 2 }, // West Atrium Glass Rail
  { minX: 292.55, maxX: 293.05, minZ: -81.0, maxZ: -66.0, floor: 2 }, // East Atrium Glass Rail

  // Floor 2 Interiors: Grand Piano Stage, Cocktail Nooks, Dining Tables, Sky Bar, SE VIP Booths & Executive Library
  { minX: 264.2, maxX: 268.2, minZ: -63.8, maxZ: -60.0, floor: 2 }, // F2 Grand Piano Corner
  { minX: 259.2, maxX: 262.2, minZ: -60.2, maxZ: -57.2, floor: 2 }, // F2 Piano West Cocktail Set
  { minX: 269.4, maxX: 272.2, minZ: -59.5, maxZ: -56.5, floor: 2 }, // F2 Piano East Cocktail Set
  { minX: 258.2, maxX: 261.2, minZ: -86.2, maxZ: -82.4, floor: 2 }, // F2 NW Riverfront Velvet Booth
  { minX: 269.0, maxX: 274.2, minZ: -85.6, maxZ: -82.4, floor: 2 }, // F2 West Sky Lounge Dining Table
  { minX: 293.8, maxX: 299.0, minZ: -85.6, maxZ: -82.4, floor: 2 }, // F2 East Fine-Dining Table 1
  { minX: 293.8, maxX: 299.0, minZ: -80.2, maxZ: -76.8, floor: 2 }, // F2 East Fine-Dining Table 2
  { minX: 293.5, maxX: 295.0, minZ: -73.0, maxZ: -71.2, floor: 2 }, // F2 Maitre D' Host Podium
  { minX: 299.5, maxX: 305.5, minZ: -75.0, maxZ: -70.4, floor: 2 }, // F2 Sky Cocktail Bar Counter
  { minX: 304.2, maxX: 308.8, minZ: -64.6, maxZ: -55.8, floor: 2 }, // F2 SE VIP Velvet Dining Booths (x2)
  { minX: 279.6, maxX: 288.4, minZ: -65.2, maxZ: -63.8, floor: 2 }, // F2 South Library Curio Bookcase
  { minX: 294.2, maxX: 297.4, minZ: -58.8, maxZ: -56.0, floor: 2 }, // F2 SE Reading Lounge Set
];

// =========================================================================
// PROCEDURAL LUXURY TEXTURES
// =========================================================================

function createMarbleFloorTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f2eadc';
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = 'rgba(182, 148, 98, 0.30)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    const y0 = (i * 31) % s;
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(s * 0.35, (y0 + 46) % s, s * 0.72, (y0 - 34 + s) % s, s, (y0 + 18) % s);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(150, 124, 92, 0.36)';
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
  tex.repeat.set(8, 6);
  tex.anisotropy = 4;
  return tex;
}

function createTravertineStoneTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, '#ded0b9');
  grad.addColorStop(0.5, '#d1bf9f');
  grad.addColorStop(1, '#c3ae8b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);

  for (let y = 0; y < s; y += 64) {
    ctx.fillStyle = y % 128 === 0 ? 'rgba(255,248,232,0.14)' : 'rgba(105,80,52,0.09)';
    ctx.fillRect(0, y, s, 62);
    ctx.fillStyle = 'rgba(98,74,48,0.28)';
    ctx.fillRect(0, y + 62, s, 2);
  }
  for (let x = 0; x < s; x += 128) {
    ctx.fillStyle = 'rgba(98,74,48,0.22)';
    ctx.fillRect(x, 0, 2, s);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

function createBrickPodiumTex(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#6c5446';
  ctx.fillRect(0, 0, s, s);

  const rowH = 16;
  const brickW = 42;
  for (let r = 0; r < s / rowH; r++) {
    const offset = (r % 2) * (brickW * 0.5);
    for (let x = -brickW; x < s + brickW; x += brickW) {
      const shade = ((r * 7 + x) % 3) * 8 - 8;
      ctx.fillStyle = `rgb(${112 + shade}, ${88 + shade}, ${72 + shade})`;
      ctx.fillRect(x + offset + 1, r * rowH + 1, brickW - 2, rowH - 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3);
  return tex;
}

function createFiligreeLatticeTex(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  ctx.strokeStyle = '#d9ac5b';
  ctx.lineWidth = 7;

  const step = 64;
  for (let x = 0; x <= s; x += step) {
    for (let y = 0; y <= s; y += step) {
      ctx.beginPath();
      ctx.moveTo(x, y - step * 0.5);
      ctx.lineTo(x + step * 0.5, y);
      ctx.lineTo(x, y + step * 0.5);
      ctx.lineTo(x - step * 0.5, y);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, step * 0.24, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#b48336';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, s - 6, s - 6);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

function createCasaRivaElevatorDisplayCanvas() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let lastKey = '';

  const draw = (floor: number, dir: -1 | 0 | 1) => {
    const key = `${floor}:${dir}`;
    if (key === lastKey) return;
    lastKey = key;

    ctx.fillStyle = '#0f0d0a';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 88);

    const arrow = dir > 0 ? '▲' : dir < 0 ? '▼' : '●';
    ctx.fillStyle = dir === 0 ? '#fde68a' : '#f59e0b';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(arrow, 64, 48);

    ctx.fillStyle = '#fffbeb';
    ctx.font = 'bold 46px Georgia, serif';
    ctx.fillText(`T${floor}`, 168, 50);

    tex.needsUpdate = true;
  };

  draw(1, 0);
  return { tex, draw };
}

function createCasaRivaFloatingSignTex(): THREE.CanvasTexture {
  const w = 3072;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(245, 158, 11, 0.96)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#ffe999';
  ctx.font = '700 134px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('3UE', 54, h * 0.52);

  ctx.font = '600 84px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffe58f';
  ctx.fillText('TUI BLUE', 350, h * 0.56);

  const cx = 895;
  const cy = h * 0.52;
  ctx.strokeStyle = '#ffeb9e';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx - 42, cy + 74);
  ctx.lineTo(cx - 42, cy - 18);
  ctx.quadraticCurveTo(cx - 42, cy - 68, cx, cy - 88);
  ctx.quadraticCurveTo(cx + 42, cy - 68, cx + 42, cy - 18);
  ctx.lineTo(cx + 42, cy + 74);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 74);
  ctx.lineTo(cx - 18, cy - 8);
  ctx.lineTo(cx, cy - 50);
  ctx.lineTo(cx + 18, cy - 8);
  ctx.lineTo(cx + 18, cy + 74);
  ctx.stroke();

  ctx.fillStyle = '#ffe999';
  ctx.font = '600 112px Georgia, serif';
  ctx.fillText('ThaiGrand', 980, h * 0.53);

  ctx.shadowColor = 'rgba(251, 191, 36, 0.98)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#fff0b3';
  ctx.font = '700 176px Georgia, serif';
  ctx.fillText('CASA RIVA', 1685, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCasaRivaCrownSignTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(22, 18, 16, 0.90)';
  ctx.fillRect(16, 20, w - 32, h - 40);
  ctx.strokeStyle = '#e7c178';
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 24, w - 40, h - 48);

  ctx.shadowColor = 'rgba(251, 191, 36, 0.85)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fff0b3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 96px Georgia, serif';
  ctx.fillText('CASA RIVA', w * 0.5, h * 0.44);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f3d288';
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText('TUI BLUE  •  DANANG WATERFRONT', w * 0.5, h * 0.78);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createPlazaMonolithTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ede5d6';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b48a46';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#29221c';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('CASA', w * 0.5, 110);
  ctx.fillText('RIVA', w * 0.5, 150);
  ctx.fillStyle = '#9a702c';
  ctx.fillRect(58, 178, w - 116, 3);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('TUI BLUE HOTEL', w * 0.5, 224);
  ctx.fillStyle = '#574a3e';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('VALET &', w * 0.5, 286);
  ctx.fillText('RESIDENCES', w * 0.5, 314);
  ctx.fillText('▲ DROP-OFF', w * 0.5, 390);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDirectorySignTex(): THREE.CanvasTexture {
  const w = 384;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1d1815';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#ffe999';
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText('CASA RIVA', w * 0.5, 68);
  ctx.fillStyle = '#d9b26a';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText('DIRECTORY', w * 0.5, 100);
  ctx.fillRect(56, 122, w - 112, 2);

  ctx.textAlign = 'left';
  const rows = [
    ['1F', 'Grand Lobby & Reception'],
    ['1F', 'Patisserie & Espresso Bar'],
    ['2F', 'Sky Dining & Jazz Piano'],
    ['2F', 'Onyx Sky Cocktail Bar'],
    ['3-20F', 'Executive Suites & Pool'],
  ];
  rows.forEach(([fl, desc], i) => {
    const y = 178 + i * 58;
    ctx.fillStyle = '#fcd34d';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(fl, 34, y);
    ctx.fillStyle = '#f3ead8';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(desc, 104, y);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAbstractArtTex(palette: [string, string, string]): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = palette[1];
  ctx.beginPath();
  ctx.arc(s * 0.42, s * 0.48, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette[2];
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(28, s * 0.72);
  ctx.bezierCurveTo(s * 0.35, s * 0.25, s * 0.68, s * 0.85, s - 28, s * 0.30);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSkyLoungeNeonTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1c1613';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9b26a';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffe999';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('JAZZ & SKY LOUNGE', w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCarSilhouetteGeo(mode: 'sedan' | 'coupe'): THREE.BufferGeometry {
  const s = new THREE.Shape();
  if (mode === 'sedan') {
    s.moveTo(-2.45, 0.20);
    s.lineTo(2.45, 0.20);
    s.lineTo(2.50, 0.52);
    s.quadraticCurveTo(2.46, 0.80, 2.08, 0.86);
    s.lineTo(1.18, 0.92);
    s.lineTo(0.42, 1.42);
    s.lineTo(-1.12, 1.42);
    s.lineTo(-2.06, 0.92);
    s.quadraticCurveTo(-2.46, 0.82, -2.48, 0.42);
    s.closePath();
  } else {
    s.moveTo(-2.35, 0.18);
    s.lineTo(2.35, 0.18);
    s.lineTo(2.42, 0.44);
    s.quadraticCurveTo(2.36, 0.70, 1.88, 0.76);
    s.lineTo(1.06, 0.82);
    s.lineTo(0.22, 1.30);
    s.lineTo(-0.85, 1.30);
    s.lineTo(-2.12, 0.82);
    s.quadraticCurveTo(-2.38, 0.72, -2.38, 0.36);
    s.closePath();
  }

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1.84,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, -0.92);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// Smooth ground height helper for Casa Riva driveway -> Bạch Đằng sidewalk -> road
function getDrivewayCarY(z: number): number {
  if (z >= -103.5) return 0.06;
  if (z >= -104.5) {
    const t = (z + 104.5) / 1.0;
    return THREE.MathUtils.lerp(0.0, 0.06, t);
  }
  if (z >= -108.5) return 0.0;
  if (z >= -109.6) {
    const t = (z + 109.6) / 1.1;
    return THREE.MathUtils.lerp(-0.26, 0.0, t);
  }
  return -0.26;
}

// =========================================================================
// ANIMATED BLACK CHAUFFEUR SHUTTLE FLEET + VIP GUEST BOARDING
// =========================================================================

interface ShuttleGuestRig {
  group: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  suitcase: THREE.Object3D;
  shirtMat: THREE.MeshStandardMaterial;
}

interface CasaRivaShuttleCar {
  mode: 'sedan' | 'coupe';
  root: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  hazardMat: THREE.MeshStandardMaterial;
  cabinGuestMesh: THREE.Mesh;
  guestRig: ShuttleGuestRig;
  cycleTime: number;
  stopYaw: number;
  guestWalking: boolean;
  guestNearDoor: boolean;
  yieldFactor: number;
}

const _carPt = new THREE.Vector3();
const _carTan = new THREE.Vector3();
const _guestTarget = new THREE.Vector3();

// =========================================================================
// MAIN BUILDER
// =========================================================================

export function createCasaRivaStructure(): CasaRivaBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared PBR Materials (ZERO MeshPhysicalMaterial for peak WebGL framerate)
  const asphaltCourtyardMat = new THREE.MeshStandardMaterial({
    color: 0x454952,
    roughness: 0.88,
    metalness: 0.04,
  });
  const granitePlazaMat = new THREE.MeshStandardMaterial({
    color: 0x8f867a,
    roughness: 0.56,
    metalness: 0.08,
  });
  const darkCurbMat = new THREE.MeshStandardMaterial({
    color: 0x3b3835,
    roughness: 0.62,
    metalness: 0.08,
  });
  const travertineMat = new THREE.MeshStandardMaterial({
    map: createTravertineStoneTex(),
    roughness: 0.48,
    metalness: 0.06,
  });
  const brickPodiumMat = new THREE.MeshStandardMaterial({
    map: createBrickPodiumTex(),
    roughness: 0.74,
    metalness: 0.05,
  });
  const lobbyMarbleMat = new THREE.MeshStandardMaterial({
    map: createMarbleFloorTex(),
    roughness: 0.22,
    metalness: 0.08,
  });
  const darkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x2c241d,
    roughness: 0.36,
    metalness: 0.62,
  });
  const warmWalnutMat = new THREE.MeshStandardMaterial({
    color: 0x6f4a2d,
    roughness: 0.52,
    metalness: 0.08,
  });
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd9b26a,
    roughness: 0.26,
    metalness: 0.76,
  });
  const warmTowerStoneMat = new THREE.MeshStandardMaterial({
    color: 0xdfd3bf,
    roughness: 0.46,
    metalness: 0.06,
  });
  const towerCoreDarkMat = new THREE.MeshStandardMaterial({
    color: 0x2a2522,
    roughness: 0.36,
    metalness: 0.52,
  });
  const curtainGlassMat = new THREE.MeshStandardMaterial({
    color: 0xf4e3bd,
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
    metalness: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const balconyGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.32,
    roughness: 0.10,
    metalness: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const towerGlassMat = new THREE.MeshStandardMaterial({
    color: 0x3b5875,
    roughness: 0.18,
    metalness: 0.55,
  });
  const warmAmberBacklitMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xd97706,
    emissiveIntensity: 1.18,
    roughness: 0.30,
  });
  const warmGoldLedMat = new THREE.MeshStandardMaterial({
    color: 0xffecb3,
    emissive: 0xf5b027,
    emissiveIntensity: 2.55,
    roughness: 0.18,
  });
  const warmSoffitMat = new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    emissive: 0xe69d1e,
    emissiveIntensity: 1.85,
    roughness: 0.28,
  });
  const crystalGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff0b3,
    emissive: 0xf5b932,
    emissiveIntensity: 3.05,
    roughness: 0.12,
  });
  const filigreeMat = new THREE.MeshStandardMaterial({
    map: createFiligreeLatticeTex(),
    color: 0xffffff,
    emissive: 0xb45309,
    emissiveIntensity: 0.28,
    transparent: true,
    alphaTest: 0.16,
    side: THREE.DoubleSide,
    roughness: 0.32,
    metalness: 0.68,
  });
  const fountainWaterMat = new THREE.MeshStandardMaterial({
    color: 0xbaf2ef,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.32,
    transparent: true,
    opacity: 0.72,
    roughness: 0.08,
  });
  const bronzeStatueMat = new THREE.MeshStandardMaterial({
    color: 0x9b5828,
    roughness: 0.28,
    metalness: 0.78,
  });
  const oliveTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.88 });
  const lushLeafMatA = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.76 });
  const lushLeafMatB = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });
  const oakWoodMat = new THREE.MeshStandardMaterial({ color: 0xb68a5c, roughness: 0.56 });
  const boucleSofaMat = new THREE.MeshStandardMaterial({ color: 0xf3eee3, roughness: 0.86 });
  const velvetTealMat = new THREE.MeshStandardMaterial({ color: 0x1e4d4f, roughness: 0.72 });
  const crimsonCarpetMat = new THREE.MeshStandardMaterial({ color: 0x6b1d24, roughness: 0.90 });
  const cognacLeatherMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.52 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0xc2b59f, roughness: 0.92 });
  const carMetallicMat = new THREE.MeshStandardMaterial({
    color: 0x171a20,
    roughness: 0.22,
    metalness: 0.58,
  });
  const carGlassMat = new THREE.MeshStandardMaterial({
    color: 0x18222e,
    roughness: 0.10,
    metalness: 0.72,
  });
  const chromeSilverMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.20,
    metalness: 0.82,
  });
  const pianoGlossMat = new THREE.MeshStandardMaterial({
    color: 0x141519,
    roughness: 0.14,
    metalness: 0.32,
  });
  const emeraldBottleMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.20, metalness: 0.18 });
  const rubyBottleMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.20, metalness: 0.18 });
  const amberBottleMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.20, metalness: 0.18 });
  const pastryPinkMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.55 });
  const pastryChocMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.52 });
  const monitorScreenMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });

  lanternMats.push(warmGoldLedMat, warmSoffitMat, crystalGlowMat, warmAmberBacklitMat);

  // Helper: Multi-Branch Courtyard Tree
  const addCasaTree = (tx: number, baseY: number, tz: number, hScale = 1.0, withUplight = true) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.40, 0.54, 16), travertineMat);
    pot.position.set(tx, baseY + 0.27, tz);
    staticGroup.add(pot);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 2.3 * hScale, 10), oliveTrunkMat);
    trunk.position.set(tx, baseY + 0.50 + 1.15 * hScale, tz);
    staticGroup.add(trunk);

    [
      [0, 2.75 * hScale, 0, 1.12 * hScale],
      [-0.36, 2.45 * hScale, 0.22, 0.82 * hScale],
      [0.36, 2.50 * hScale, -0.22, 0.84 * hScale],
      [0.08, 3.15 * hScale, 0.16, 0.76 * hScale],
    ].forEach(([ox, oy, oz, rad], idx) => {
      const tuft = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rad, 1),
        idx % 2 === 0 ? lushLeafMatA : lushLeafMatB
      );
      tuft.scale.set(1.12, 0.88, 1.12);
      tuft.position.set(tx + ox, baseY + oy, tz + oz);
      staticGroup.add(tuft);
    });

    if (withUplight) {
      const uplight = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), warmGoldLedMat);
      uplight.position.set(tx, baseY + 0.03, tz - 0.56);
      staticGroup.add(uplight);
    }
  };

  // Helper: Indoor Sculptural Ficus & Brass Planter
  const addIndoorPlanter = (px: number, baseY: number, pz: number) => {
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.44, 0.86, 16), travertineMat);
    planter.position.set(px, baseY + 0.43, pz);
    staticGroup.add(planter);

    const brassBand = new THREE.Mesh(new THREE.CylinderGeometry(0.555, 0.555, 0.08, 16), champagneGoldMat);
    brassBand.position.set(px, baseY + 0.82, pz);
    staticGroup.add(brassBand);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.45, 8), oliveTrunkMat);
    stem.position.set(px, baseY + 1.50, pz);
    staticGroup.add(stem);

    [
      [0, 2.30, 0, 0.54],
      [-0.24, 2.05, 0.14, 0.38],
      [0.24, 2.12, -0.12, 0.38],
    ].forEach(([ox, oy, oz, rad], i) => {
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), i === 0 ? lushLeafMatA : lushLeafMatB);
      leaf.scale.set(1.05, 0.82, 1.05);
      leaf.position.set(px + ox, baseY + oy, pz + oz);
      staticGroup.add(leaf);
    });
  };

  // =========================================================================
  // 1. GRAND ARRIVAL PLAZA, MOTOR COURT & INFINITY WEIR FOUNTAIN (Z = -104..-88)
  // =========================================================================
  const plotCX = (CASA_RIVA_MIN_X + CASA_RIVA_MAX_X) * 0.5; // 284.0
  const drivewaySlab = new THREE.Mesh(new THREE.BoxGeometry(60.0, 0.06, 16.0), asphaltCourtyardMat);
  drivewaySlab.position.set(plotCX, 0.03, -96.0);
  staticGroup.add(drivewaySlab);

  const northPlazaSidewalk = new THREE.Mesh(new THREE.BoxGeometry(60.0, 0.08, 2.4), granitePlazaMat);
  northPlazaSidewalk.position.set(plotCX, 0.04, -102.8);
  staticGroup.add(northPlazaSidewalk);

  // Subtle Granite Valet Lane Curb Cut Markers & Porte-Cochère VIP Stopping Strip
  [271.2, 299.4].forEach((dx) => {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.025, 5.4), asphaltCourtyardMat);
    apron.position.set(dx, 0.02, -106.5);
    staticGroup.add(apron);
  });
  const valetStrip = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.015, 0.14), champagneGoldMat);
  valetStrip.position.set(DOOR_CENTER_X, 0.068, -90.2);
  staticGroup.add(valetStrip);

  const hotelApronDeck = new THREE.Mesh(
    new THREE.BoxGeometry(56.0, CASA_RIVA_PODIUM_Y + 0.06, 36.2),
    granitePlazaMat
  );
  hotelApronDeck.position.set(plotCX, (CASA_RIVA_PODIUM_Y - 0.06) * 0.5, -70.1);
  staticGroup.add(hotelApronDeck);

  // Flanking Granite Driveway Curbs & Lush Planter Beds
  [260.0, 308.0].forEach((cx) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.18, 3.2), darkCurbMat);
    curb.position.set(cx, 0.09, -100.6);
    staticGroup.add(curb);
    const shrubStrip = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.42, 1.6), lushLeafMatA);
    shrubStrip.position.set(cx, 0.36, -100.6);
    staticGroup.add(shrubStrip);
  });

  // Illuminated Arrival Monolith Directory Totem tucked cleanly beside West Curb (keeps X=270..275 driveway open!)
  const monolithBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.2, 0.34), travertineMat);
  monolithBody.position.set(265.8, 1.14, -100.4);
  staticGroup.add(monolithBody);
  const monolithTex = createPlazaMonolithTex();
  const monolithSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 1.85),
    new THREE.MeshStandardMaterial({ map: monolithTex, emissive: 0xfef3c7, emissiveMap: monolithTex, emissiveIntensity: 0.25 })
  );
  monolithSign.rotation.y = Math.PI;
  monolithSign.position.set(265.8, 1.18, -100.58);
  monolithSign.userData.noMerge = true;
  staticGroup.add(monolithSign);

  // Center Landscaped Fountain Island (X = 277.2 .. 290.8, Z = -102.0 .. -98.2)
  const islandCurb = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.16, 3.8), darkCurbMat);
  islandCurb.position.set(plotCX, 0.08, -100.1);
  staticGroup.add(islandCurb);
  const islandDeck = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.18, 3.2), granitePlazaMat);
  islandDeck.position.set(plotCX, 0.09, -100.1);
  staticGroup.add(islandDeck);

  const basinBody = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.62, 2.2), darkBronzeMat);
  basinBody.position.set(plotCX, 0.45, -100.1);
  staticGroup.add(basinBody);

  const basinWaterTop = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.06, 1.95), fountainWaterMat);
  basinWaterTop.position.set(plotCX, 0.77, -100.1);
  staticGroup.add(basinWaterTop);

  const fountainGlowBar = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.09, 0.16), warmGoldLedMat);
  fountainGlowBar.position.set(plotCX, 0.21, -101.24);
  staticGroup.add(fountainGlowBar);

  const fountainPlumesGroup = new THREE.Group();
  fountainPlumesGroup.userData.noMerge = true;
  const jetMeshes: THREE.Mesh[] = [];
  for (let w = 0; w < 14; w++) {
    const wx = plotCX - 4.8 + w * (9.6 / 13);
    const cascade = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.06), fountainWaterMat);
    cascade.position.set(wx, 0.50, -101.22);
    fountainPlumesGroup.add(cascade);
    jetMeshes.push(cascade);
  }
  staticGroup.add(fountainPlumesGroup);

  const statuePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 0.34, 16), darkBronzeMat);
  statuePlinth.position.set(plotCX, 0.92, -100.1);
  staticGroup.add(statuePlinth);

  const statueRingA = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.14, 12, 28, Math.PI * 1.55), bronzeStatueMat);
  statueRingA.position.set(plotCX, 1.72, -100.1);
  statueRingA.rotation.set(0.24, 0.42, 0.65);
  staticGroup.add(statueRingA);

  const statueRingB = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.11, 10, 24), bronzeStatueMat);
  statueRingB.position.set(plotCX + 0.12, 1.84, -100.04);
  statueRingB.rotation.set(-0.4, 0.9, -0.35);
  staticGroup.add(statueRingB);

  // Waterfront Arrival Trees on Outer Plaza Wings
  [
    [257.5, -101.6, 1.28],
    [263.8, -101.6, 1.38],
    [304.2, -101.6, 1.38],
    [310.5, -101.6, 1.28],
    [257.5, -90.2, 1.15],
    [310.5, -90.2, 1.15],
  ].forEach(([tx, tz, sc]) => {
    addCasaTree(tx, 0.06, tz, sc, true);
  });

  // =========================================================================
  // 2. SLEEK PORTE-COCHÈRE CANOPY & TRANSPARENT 3D CHANNEL SIGNAGE
  // =========================================================================
  const PORTE_Y = 4.78;
  const PORTE_W = 36.4;
  const PORTE_D = 8.4;
  const PORTE_CZ = -92.1;

  [267.5, 277.5, 290.5, 300.5].forEach((px) => {
    const pierMain = new THREE.Mesh(new THREE.BoxGeometry(1.18, PORTE_Y, 1.12), travertineMat);
    pierMain.position.set(px, PORTE_Y * 0.5, -95.75);
    staticGroup.add(pierMain);

    [-0.36, 0.36].forEach((sx) => {
      const ledSeam = new THREE.Mesh(new THREE.BoxGeometry(0.06, PORTE_Y - 0.3, 0.06), warmGoldLedMat);
      ledSeam.position.set(px + sx, PORTE_Y * 0.5, -96.32);
      staticGroup.add(ledSeam);
    });

    const pierBase = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.14, 1.22), champagneGoldMat);
    pierBase.position.set(px, 0.08, -95.75);
    staticGroup.add(pierBase);
  });

  const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(PORTE_W, 0.24, PORTE_D), darkBronzeMat);
  canopyRoof.position.set(plotCX, PORTE_Y + 0.18, PORTE_CZ);
  staticGroup.add(canopyRoof);

  const canopyChampagneRim = new THREE.Mesh(new THREE.BoxGeometry(PORTE_W + 0.16, 0.12, PORTE_D + 0.16), champagneGoldMat);
  canopyChampagneRim.position.set(plotCX, PORTE_Y + 0.04, PORTE_CZ);
  staticGroup.add(canopyChampagneRim);

  const canopyLedLip = new THREE.Mesh(new THREE.BoxGeometry(PORTE_W - 0.3, 0.05, 0.08), warmGoldLedMat);
  canopyLedLip.position.set(plotCX, PORTE_Y - 0.04, PORTE_CZ - PORTE_D * 0.5 + 0.05);
  staticGroup.add(canopyLedLip);

  for (let gx = 0; gx < 10; gx++) {
    for (let gz = 0; gz < 2; gz++) {
      const cx = 267.8 + gx * 3.6;
      const cz = -94.0 + gz * 3.8;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.05, 3.05), warmSoffitMat);
      tile.position.set(cx, PORTE_Y - 0.03, cz);
      staticGroup.add(tile);
    }
  }

  const fasciaSignTex = createCasaRivaFloatingSignTex();
  const fasciaSignMat = new THREE.MeshStandardMaterial({
    map: fasciaSignTex,
    emissive: 0xffd266,
    emissiveMap: fasciaSignTex,
    emissiveIntensity: 1.95,
    transparent: true,
    alphaTest: 0.08,
    roughness: 0.18,
  });
  neonMats.push(fasciaSignMat);
  const fasciaSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(28.8, 2.4), fasciaSignMat);
  fasciaSignMesh.rotation.y = Math.PI;
  fasciaSignMesh.position.set(plotCX, PORTE_Y + 1.38, PORTE_CZ - PORTE_D * 0.5 - 0.02);
  fasciaSignMesh.userData.noMerge = true;
  staticGroup.add(fasciaSignMesh);

  // =========================================================================
  // 3. 2-STORY LUXURY PODIUM ENVELOPE, PRECISION F2 SLABS & MARBLE LOBBY
  // =========================================================================
  const F1_Y = CASA_RIVA_PODIUM_Y; // 0.08
  const F2_Y = F1_Y + CASA_RIVA_FLOOR_H; // 5.48
  const PODIUM_TOP_Y = 10.65;
  const PODIUM_W = 55.2;
  const PODIUM_D = 34.5;
  const PODIUM_CZ = -70.75;

  // Floor 1 Crema-Marfil Marble Lobby Floor
  const f1Floor = new THREE.Mesh(new THREE.BoxGeometry(PODIUM_W - 0.4, 0.04, PODIUM_D - 0.4), lobbyMarbleMat);
  f1Floor.position.set(plotCX, F1_Y + 0.02, PODIUM_CZ);
  staticGroup.add(f1Floor);

  // Signature Central Atrium Marble & Brass Inlaid Floor Medallion (X=284, Z=-76.5, R=5.2 -> Z=-81.7..-71.3)
  const medallionOuter = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.02, 32), champagneGoldMat);
  medallionOuter.position.set(plotCX, F1_Y + 0.050, -76.5);
  staticGroup.add(medallionOuter);
  const medallionInner = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.024, 32), travertineMat);
  medallionInner.position.set(plotCX, F1_Y + 0.053, -76.5);
  staticGroup.add(medallionInner);
  const medallionCenter = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.028, 24), darkBronzeMat);
  medallionCenter.position.set(plotCX, F1_Y + 0.056, -76.5);
  staticGroup.add(medallionCenter);

  // Welcome Red & Brass-Trimmed Lobby Carpet Runners (strictly clear of medallion rim at Z=-81.7 & Z=-71.3!)
  const entranceRunner = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.018, 5.6), crimsonCarpetMat);
  entranceRunner.position.set(DOOR_CENTER_X, F1_Y + 0.052, -84.7);
  staticGroup.add(entranceRunner);
  const receptionRunner = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.018, 1.9), crimsonCarpetMat);
  receptionRunner.position.set(DOOR_CENTER_X, F1_Y + 0.052, -70.15);
  staticGroup.add(receptionRunner);
  [-1.96, 1.96].forEach((bx) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.022, 5.64), champagneGoldMat);
    trim.position.set(DOOR_CENTER_X + bx, F1_Y + 0.052, -84.7);
    staticGroup.add(trim);
  });

  // Floor 2 Mezzanine Slab — Precision 7-Piece Tiling leaving BOTH Stairwell [262.0..267.0, -79.4..-71.5]
  // AND Central Chandelier Atrium [275.2..292.8, -80.9..-66.1] 100% OPEN, with zero missing corners!
  const f2Slabs: [number, number, number, number][] = [
    // [centerX, centerZ, width, depth]
    [259.4, -70.85, 5.2, 33.9],   // West Perimeter Strip (X=256.8..262.0)
    [264.5, -83.6, 5.0, 8.4],     // North of Stairwell Opening (X=262.0..267.0, Z=-87.8..-79.4)
    [264.5, -62.7, 5.0, 17.6],    // South of Stairwell Opening (X=262.0..267.0, Z=-71.5..-53.9)
    [271.1, -70.85, 8.2, 33.9],   // West Gallery between Stairwell & Atrium (X=267.0..275.2)
    [284.0, -84.35, 17.6, 6.9],   // North Atrium Bridge (X=275.2..292.8, Z=-87.8..-80.9)
    [284.0, -61.625, 17.6, 8.95], // South Executive Elevator Hallway (X=275.2..292.8, Z=-66.1..-57.15)
    [277.65, -55.525, 4.9, 3.25], // F2 West of Elevator Shafts (X=275.2..280.1, Z=-57.15..-53.9)
    [284.0, -55.525, 2.6, 3.25],  // F2 Center Elevator Pier Deck (X=282.7..285.3, Z=-57.15..-53.9)
    [290.35, -55.525, 4.9, 3.25], // F2 East of Elevator Shafts (X=287.9..292.8, Z=-57.15..-53.9)
    [302.0, -70.85, 18.4, 33.9],  // Full East Wing Deck (X=292.8..311.2)
  ];
  f2Slabs.forEach(([sx, sz, sw, sd]) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.30, sd), lobbyMarbleMat);
    slab.position.set(sx, F2_Y - 0.15, sz);
    staticGroup.add(slab);
  });

  // Podium Roof Deck & Warm Brick/Travertine Side/Rear Walls
  const podiumRoof = new THREE.Mesh(new THREE.BoxGeometry(PODIUM_W + 0.8, 0.45, PODIUM_D + 0.6), travertineMat);
  podiumRoof.position.set(plotCX, PODIUM_TOP_Y + 0.22, PODIUM_CZ);
  staticGroup.add(podiumRoof);

  // Floor 2 Coffered Warm Ceiling Light Panels under Podium Roof
  for (let cx = 263; cx <= 305; cx += 14) {
    [-83.5, -59.5].forEach((cz) => {
      const f2LightPanel = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.08, 4.2), warmSoffitMat);
      f2LightPanel.position.set(cx, PODIUM_TOP_Y - 0.04, cz);
      staticGroup.add(f2LightPanel);
    });
  }

  const westPodiumWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, PODIUM_TOP_Y, PODIUM_D), brickPodiumMat);
  westPodiumWall.position.set(256.55, PODIUM_TOP_Y * 0.5, PODIUM_CZ);
  staticGroup.add(westPodiumWall);

  const eastPodiumWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, PODIUM_TOP_Y, PODIUM_D), brickPodiumMat);
  eastPodiumWall.position.set(311.45, PODIUM_TOP_Y * 0.5, PODIUM_CZ);
  staticGroup.add(eastPodiumWall);

  const southPodiumWall = new THREE.Mesh(new THREE.BoxGeometry(PODIUM_W, PODIUM_TOP_Y, 0.55), brickPodiumMat);
  southPodiumWall.position.set(plotCX, PODIUM_TOP_Y * 0.5, -53.65);
  staticGroup.add(southPodiumWall);

  // North Podium Facade: Classical Travertine Pilasters with Vertical Bronze Accent & Mullions
  const pilasterXs = [257.0, 265.2, 273.4, 280.6, 287.4, 294.6, 302.8, 311.0];
  pilasterXs.forEach((px) => {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.96, PODIUM_TOP_Y, 0.78), travertineMat);
    pil.position.set(px, PODIUM_TOP_Y * 0.5, DOOR_Z);
    staticGroup.add(pil);

    const pilTrim = new THREE.Mesh(new THREE.BoxGeometry(0.12, PODIUM_TOP_Y - 0.4, 0.08), champagneGoldMat);
    pilTrim.position.set(px, PODIUM_TOP_Y * 0.5, DOOR_Z - 0.40);
    staticGroup.add(pilTrim);
  });

  for (let mx = 259.6; mx <= 308.6; mx += 2.75) {
    if (Math.abs(mx - DOOR_CENTER_X) < 2.5) continue;
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.95, 0.14), darkBronzeMat);
    mullion.position.set(mx, F1_Y + 2.48, DOOR_Z);
    staticGroup.add(mullion);
  }

  const f1LeftGlass = new THREE.Mesh(new THREE.BoxGeometry(24.0, 4.9, 0.06), curtainGlassMat);
  f1LeftGlass.position.set(269.6, F1_Y + 2.45, DOOR_Z);
  staticGroup.add(f1LeftGlass);

  const f1RightGlass = new THREE.Mesh(new THREE.BoxGeometry(24.0, 4.9, 0.06), curtainGlassMat);
  f1RightGlass.position.set(298.4, F1_Y + 2.45, DOOR_Z);
  staticGroup.add(f1RightGlass);

  const portalTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.85, 0.06), curtainGlassMat);
  portalTransomGlass.position.set(DOOR_CENTER_X, F1_Y + 4.15, DOOR_Z);
  staticGroup.add(portalTransomGlass);

  // Automatic Bi-Parting Glass Lobby Entrance Doors
  const makeDoorLeaf = (xPos: number) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.36, 3.15, 0.045), curtainGlassMat);
    glass.position.y = F1_Y + 1.58;
    grp.add(glass);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.40, 0.08, 0.07), champagneGoldMat);
    frameTop.position.y = F1_Y + 3.14;
    grp.add(frameTop);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.2, 8), champagneGoldMat);
    handle.position.set(xPos < DOOR_CENTER_X ? 0.94 : -0.94, F1_Y + 1.35, -0.06);
    grp.add(handle);
    grp.position.set(xPos, 0, DOOR_Z);
    staticGroup.add(grp);
    return grp;
  };
  const doorClosedL = DOOR_CENTER_X - 1.2;
  const doorClosedR = DOOR_CENTER_X + 1.2;
  const doorLeafL = makeDoorLeaf(doorClosedL);
  const doorLeafR = makeDoorLeaf(doorClosedR);

  // Backlit Warm Golden CNC Filigree Mezzanine Screens aligned behind Signage
  const f2MezzGlowBack = new THREE.Mesh(new THREE.BoxGeometry(53.2, 2.35, 0.14), warmAmberBacklitMat);
  f2MezzGlowBack.position.set(plotCX, F2_Y + 0.88, DOOR_Z + 0.04);
  staticGroup.add(f2MezzGlowBack);

  const f2FiligreeBand = new THREE.Mesh(new THREE.PlaneGeometry(53.2, 2.40), filigreeMat);
  f2FiligreeBand.position.set(plotCX, F2_Y + 0.88, DOOR_Z - 0.12);
  staticGroup.add(f2FiligreeBand);

  [261.1, 306.9].forEach((fx) => {
    const sideFiligreeBack = new THREE.Mesh(new THREE.BoxGeometry(6.8, 4.9, 0.08), warmAmberBacklitMat);
    sideFiligreeBack.position.set(fx, F1_Y + 2.45, DOOR_Z + 0.04);
    staticGroup.add(sideFiligreeBack);
    const sideFiligree = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.9), filigreeMat);
    sideFiligree.position.set(fx, F1_Y + 2.45, DOOR_Z - 0.10);
    staticGroup.add(sideFiligree);
  });

  const f2WindowGlass = new THREE.Mesh(new THREE.BoxGeometry(53.4, 2.45, 0.06), curtainGlassMat);
  f2WindowGlass.position.set(plotCX, F2_Y + 3.45, DOOR_Z);
  staticGroup.add(f2WindowGlass);

  for (let mx = 259.6; mx <= 308.6; mx += 2.75) {
    const mullion2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.55, 0.14), darkBronzeMat);
    mullion2.position.set(mx, F2_Y + 3.45, DOOR_Z);
    staticGroup.add(mullion2);
  }

  const f2MidCornice = new THREE.Mesh(new THREE.BoxGeometry(55.4, 0.24, 0.65), travertineMat);
  f2MidCornice.position.set(plotCX, F2_Y + 2.15, DOOR_Z - 0.10);
  staticGroup.add(f2MidCornice);

  const f2HeaderCornice = new THREE.Mesh(new THREE.BoxGeometry(55.8, 0.44, 0.88), travertineMat);
  f2HeaderCornice.position.set(plotCX, PODIUM_TOP_Y - 0.18, DOOR_Z - 0.12);
  staticGroup.add(f2HeaderCornice);

  // =========================================================================
  // 4. INTERIOR FLOOR 1 & FLOOR 2 LUXURY ARCHITECTURE & DETAILS
  // =========================================================================
  // Interior Fluted Warm Walnut & Brass Feature Panels along West & East Walls
  // (Skip West slats right behind the 3 framed gallery artworks at Z = -81.5, -70.0, -62.0!)
  const westArtZs = [-81.5, -70.0, -62.0];
  for (let pz = -85.0; pz <= -56.5; pz += 1.6) {
    const hitsWestArt = westArtZs.some((az) => Math.abs(pz - az) < 1.15);
    if (!hitsWestArt) {
      const wSlat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 10.0, 0.28), warmWalnutMat);
      wSlat.position.set(256.92, 5.08, pz);
      staticGroup.add(wSlat);
    }
    const eSlat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 10.0, 0.28), warmWalnutMat);
    eSlat.position.set(311.08, 5.08, pz);
    staticGroup.add(eSlat);
  }

  // 4 Monumental Interior Travertine-and-Gold Atrium Columns framing Central Void (full 10.5m height)
  [
    [275.2, -80.9],
    [292.8, -80.9],
    [275.2, -66.1],
    [292.8, -66.1],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.92, PODIUM_TOP_Y - 0.1, 0.92), travertineMat);
    col.position.set(cx, PODIUM_TOP_Y * 0.5, cz);
    staticGroup.add(col);
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.24, 1.06), champagneGoldMat);
    colBase.position.set(cx, F1_Y + 0.12, cz);
    staticGroup.add(colBase);
    const colCap = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.22, 1.08), champagneGoldMat);
    colCap.position.set(cx, PODIUM_TOP_Y - 0.12, cz);
    staticGroup.add(colCap);
    const colLed = new THREE.Mesh(new THREE.BoxGeometry(0.08, PODIUM_TOP_Y - 0.8, 0.06), warmGoldLedMat);
    colLed.position.set(cx, PODIUM_TOP_Y * 0.5, cz < -73 ? cz - 0.48 : cz + 0.48);
    staticGroup.add(colLed);
  });

  // Grand Suspended 3-Tier Crystal & Brass Chandeliers
  const addCrystalChandelier = (cx: number, topY: number, cz: number, scale: number) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6 * scale, 8), champagneGoldMat);
    rod.position.set(cx, topY - 1.3 * scale, cz);
    staticGroup.add(rod);

    [
      { dy: -2.4 * scale, r: 1.95 * scale },
      { dy: -3.0 * scale, r: 1.38 * scale },
      { dy: -3.5 * scale, r: 0.78 * scale },
    ].forEach((tier) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(tier.r, 0.055, 8, 24), champagneGoldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx, topY + tier.dy, cz);
      staticGroup.add(ring);

      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(tier.r * 0.92, 0.045, 6, 20), crystalGlowMat);
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.set(cx, topY + tier.dy - 0.12, cz);
      staticGroup.add(glowRing);

      for (let d = 0; d < 8; d++) {
        const ang = (d / 8) * Math.PI * 2;
        const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.42 * scale, 5), crystalGlowMat);
        drop.position.set(
          cx + Math.cos(ang) * tier.r * 0.94,
          topY + tier.dy - 0.26 * scale,
          cz + Math.sin(ang) * tier.r * 0.94
        );
        staticGroup.add(drop);
      }
    });
  };
  addCrystalChandelier(DOOR_CENTER_X, PODIUM_TOP_Y, -73.5, 1.08);
  addCrystalChandelier(271.5, F2_Y - 0.25, -80.2, 0.62);
  addCrystalChandelier(296.5, F2_Y - 0.25, -80.2, 0.62);

  // Grand Travertine & Fluted-Brass Reception Desk + Concierge Terminals + Lamps + Orchids
  const recBody = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.08, 1.45), travertineMat);
  recBody.position.set(DOOR_CENTER_X, F1_Y + 0.54, -68.4);
  staticGroup.add(recBody);
  const recToeKick = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.08, 1.52), warmGoldLedMat);
  recToeKick.position.set(DOOR_CENTER_X, F1_Y + 0.05, -68.4);
  staticGroup.add(recToeKick);
  const recBrassTrim = new THREE.Mesh(new THREE.BoxGeometry(9.35, 0.10, 1.54), champagneGoldMat);
  recBrassTrim.position.set(DOOR_CENTER_X, F1_Y + 1.10, -68.4);
  staticGroup.add(recBrassTrim);

  [-2.8, 0.0, 2.8].forEach((ox, idx) => {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.05), monitorScreenMat);
    mon.position.set(DOOR_CENTER_X + ox, F1_Y + 1.38, -68.1);
    staticGroup.add(mon);
    if (idx !== 1) {
      const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.32, 8), champagneGoldMat);
      lampStem.position.set(DOOR_CENTER_X + ox * 0.58, F1_Y + 1.28, -68.6);
      staticGroup.add(lampStem);
      const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.14, 10), warmGoldLedMat);
      lampShade.position.set(DOOR_CENTER_X + ox * 0.58, F1_Y + 1.46, -68.6);
      staticGroup.add(lampShade);
      // Keycard tray & check-in brass bell
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.22), champagneGoldMat);
      tray.position.set(DOOR_CENTER_X + ox * 0.88, F1_Y + 1.17, -68.85);
      staticGroup.add(tray);
    }
  });
  const recVase = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.14, 0.38, 12), champagneGoldMat);
  recVase.position.set(DOOR_CENTER_X, F1_Y + 1.32, -68.65);
  staticGroup.add(recVase);
  const recOrchid = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), boucleSofaMat);
  recOrchid.position.set(DOOR_CENTER_X, F1_Y + 1.66, -68.65);
  staticGroup.add(recOrchid);

  // Reception Backwall + Fluted Brass + Luminous Brand Emblem
  const recWall = new THREE.Mesh(new THREE.BoxGeometry(12.6, 4.6, 0.4), darkBronzeMat);
  recWall.position.set(DOOR_CENTER_X, F1_Y + 2.3, -64.4);
  staticGroup.add(recWall);
  for (let fx = DOOR_CENTER_X - 5.8; fx <= DOOR_CENTER_X + 5.8; fx += 0.45) {
    const flute = new THREE.Mesh(new THREE.BoxGeometry(0.10, 4.3, 0.08), champagneGoldMat);
    flute.position.set(fx, F1_Y + 2.25, -64.62);
    staticGroup.add(flute);
  }

  const lobbyLogoTex = createCasaRivaCrownSignTex();
  const lobbyLogoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 1.65),
    new THREE.MeshStandardMaterial({
      map: lobbyLogoTex,
      emissive: 0xffd266,
      emissiveMap: lobbyLogoTex,
      emissiveIntensity: 1.25,
      roughness: 0.25,
    })
  );
  lobbyLogoPlane.rotation.y = Math.PI;
  lobbyLogoPlane.position.set(DOOR_CENTER_X, F1_Y + 3.05, -64.68);
  lobbyLogoPlane.userData.noMerge = true;
  staticGroup.add(lobbyLogoPlane);

  // Dual Enclosed Working Luxury Hotel Elevators Recessed into South Wall (F1 & F2!)
  const dirTex = createDirectorySignTex();
  const dirStand = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.05, 0.14), darkBronzeMat);
  dirStand.position.set(277.6, F1_Y + 1.02, -66.0);
  staticGroup.add(dirStand);
  const dirFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.84, 1.88),
    new THREE.MeshStandardMaterial({ map: dirTex, emissive: 0xfff0b3, emissiveMap: dirTex, emissiveIntensity: 0.45 })
  );
  dirFace.rotation.y = Math.PI;
  dirFace.position.set(277.6, F1_Y + 1.05, -66.08);
  dirFace.userData.noMerge = true;
  staticGroup.add(dirFace);

  const ELEV_CENTERS = [281.4, 286.6];
  const ELEV_DOOR_Z = -57.20;
  const brushedDoorMat = new THREE.MeshStandardMaterial({
    color: 0xbda782,
    roughness: 0.28,
    metalness: 0.72,
  });

  // Full-height Marble & Fluted Brass Shaft Piers (X = 279.1..288.9, Z = -57.32..-53.85, Y = F1_Y..PODIUM_TOP_Y)
  const shaftWallH = PODIUM_TOP_Y - F1_Y;
  const shaftWallMidY = F1_Y + shaftWallH * 0.5;
  const shaftPiers: [number, number][] = [
    [279.62, 1.05], // West pier (279.10..280.15)
    [284.0, 2.70],  // Center pier (282.65..285.35)
    [288.38, 1.05], // East pier (287.85..288.90)
  ];
  shaftPiers.forEach(([px, pw]) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(pw, shaftWallH, 3.45), travertineMat);
    pier.position.set(px, shaftWallMidY, -55.58);
    staticGroup.add(pier);
  });
  // Rear Shaft Wall (Z = -54.15..-53.85)
  const shaftRear = new THREE.Mesh(new THREE.BoxGeometry(9.8, shaftWallH, 0.30), travertineMat);
  shaftRear.position.set(DOOR_CENTER_X, shaftWallMidY, -54.0);
  staticGroup.add(shaftRear);

  // Fluted vertical champagne-gold trims & F1/F2 Directory Plaque on Center Pier (Z = -57.34)
  [279.22, 280.02, 282.78, 285.22, 287.98, 288.78].forEach((tx) => {
    const trimStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, shaftWallH - 0.1, 0.06), champagneGoldMat);
    trimStrip.position.set(tx, shaftWallMidY, -57.33);
    staticGroup.add(trimStrip);
  });
  [F1_Y, F2_Y].forEach((flY) => {
    const centerDirFrame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.65, 0.06), champagneGoldMat);
    centerDirFrame.position.set(DOOR_CENTER_X, flY + 1.90, -57.33);
    staticGroup.add(centerDirFrame);
    const centerDirFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 1.52),
      new THREE.MeshStandardMaterial({ map: dirTex, emissive: 0xfff0b3, emissiveMap: dirTex, emissiveIntensity: 0.48 })
    );
    centerDirFace.rotation.y = Math.PI;
    centerDirFace.position.set(DOOR_CENTER_X, flY + 1.90, -57.37);
    centerDirFace.userData.noMerge = true;
    staticGroup.add(centerDirFace);
  });

  interface CasaRivaInternalElevator {
    api: HospitalElevatorApi;
    index: number;
    x: number;
    currentY: number;
    currentFloor: number;
    targetFloor: number;
    doorOpen: number;
    state: 'idle' | 'door_opening' | 'boarding' | 'door_closing' | 'moving';
    timer: number;
    queue: number[];
    cabinGroup: THREE.Group;
    cabDoorL: THREE.Mesh;
    cabDoorR: THREE.Mesh;
    landingDoors: Array<{ left: THREE.Group; right: THREE.Group }>;
    displays: Array<ReturnType<typeof createCasaRivaElevatorDisplayCanvas>>;
  }

  const internalElevators: CasaRivaInternalElevator[] = [];

  ELEV_CENTERS.forEach((ex, idx) => {
    const startFloor = idx === 0 ? 1 : 2;
    const startY = startFloor === 1 ? F1_Y : F2_Y;
    const landingDoors: Array<{ left: THREE.Group; right: THREE.Group }> = [];
    const displays: Array<ReturnType<typeof createCasaRivaElevatorDisplayCanvas>> = [];

    [F1_Y, F2_Y].forEach((flY, flIdx) => {
      // Sculpted Champagne-Gold Doorway Portal Jambs & Header (proud of Z=-57.32)
      const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.90, 0.34), champagneGoldMat);
      jambL.position.set(ex - 1.24, flY + 1.45, -57.22);
      staticGroup.add(jambL);
      const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.90, 0.34), champagneGoldMat);
      jambR.position.set(ex + 1.24, flY + 1.45, -57.22);
      staticGroup.add(jambR);
      const header = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.18, 0.36), champagneGoldMat);
      header.position.set(ex, flY + 2.95, -57.22);
      staticGroup.add(header);

      // Marble Lintel Wall above Doorway Header up to ceiling
      const lintelTop = flIdx === 0 ? F2_Y : PODIUM_TOP_Y;
      const lintelH = lintelTop - (flY + 3.04);
      if (lintelH > 0.05) {
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.56, lintelH, 0.32), travertineMat);
        lintel.position.set(ex, flY + 3.04 + lintelH * 0.5, -57.18);
        staticGroup.add(lintel);
      }

      // Live Digital Amber LED Floor Display Box above doorway
      const disp = createCasaRivaElevatorDisplayCanvas();
      displays.push(disp);
      const dispHousing = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.34, 0.08), darkBronzeMat);
      dispHousing.position.set(ex, flY + 3.28, -57.36);
      staticGroup.add(dispHousing);
      const dispFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.84, 0.28),
        new THREE.MeshStandardMaterial({
          map: disp.tex,
          emissive: 0xffffff,
          emissiveMap: disp.tex,
          emissiveIntensity: 0.78,
        })
      );
      dispFace.rotation.y = Math.PI;
      dispFace.position.set(ex, flY + 3.28, -57.41);
      dispFace.userData.noMerge = true;
      staticGroup.add(dispFace);

      // Call Button Plate & Illuminated Up/Down Call Buttons beside doorway on Center Pier
      const btnX = idx === 0 ? ex + 1.42 : ex - 1.42;
      const callPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.05), champagneGoldMat);
      callPlate.position.set(btnX, flY + 1.24, -57.34);
      staticGroup.add(callPlate);
      const btnUp = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 10), warmGoldLedMat);
      btnUp.rotation.x = Math.PI / 2;
      btnUp.position.set(btnX, flY + 1.31, -57.37);
      staticGroup.add(btnUp);
      const btnDn = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 10), warmGoldLedMat);
      btnDn.rotation.x = Math.PI / 2;
      btnDn.position.set(btnX, flY + 1.17, -57.37);
      staticGroup.add(btnDn);

      // Bi-Parting Brushed Satin Champagne-Bronze Doors with Vertical Vision Slits (noMerge!)
      const makeDoorLeaf = (side: -1 | 1) => {
        const leafGrp = new THREE.Group();
        leafGrp.userData.noMerge = true;
        leafGrp.position.set(ex + side * 0.565, flY + 1.43, ELEV_DOOR_Z);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.11, 2.82, 0.045), brushedDoorMat);
        panel.userData.noMerge = true;
        leafGrp.add(panel);
        const trimEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.82, 0.054), champagneGoldMat);
        trimEdge.position.x = -side * 0.52;
        trimEdge.userData.noMerge = true;
        leafGrp.add(trimEdge);
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.72, 0.058), balconyGlassMat);
        slit.position.set(-side * 0.24, 0.14, 0);
        slit.userData.noMerge = true;
        leafGrp.add(slit);
        staticGroup.add(leafGrp);
        return leafGrp;
      };
      landingDoors.push({ left: makeDoorLeaf(-1), right: makeDoorLeaf(1) });
    });

    // Moving Panoramic Luxury Elevator Cabin (`userData.noMerge = true`)
    const cabinGroup = new THREE.Group();
    cabinGroup.userData.noMerge = true;
    cabinGroup.position.set(ex, startY, 0);

    // Cabin Floor Deck (top flush at +0.02 inside cabin)
    const cabDeck = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.14, 2.74), darkBronzeMat);
    cabDeck.position.set(0, -0.05, -55.58);
    cabinGroup.add(cabDeck);
    const cabMarble = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.025, 2.58), lobbyMarbleMat);
    cabMarble.position.set(0, 0.015, -55.58);
    cabinGroup.add(cabMarble);

    // Cabin Ceiling + Glowing Coffered Champagne Soffit
    const cabCeil = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.12, 2.74), darkBronzeMat);
    cabCeil.position.set(0, 2.78, -55.58);
    cabinGroup.add(cabCeil);
    const cabLight = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.04, 1.98), warmSoffitMat);
    cabLight.position.set(0, 2.70, -55.58);
    cabinGroup.add(cabLight);

    // Warm Walnut Cabin Side Walls + Brass Grab Handrails + Inner Floor Panel
    [-1.10, 1.10].forEach((sx) => {
      const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.68, 2.66), warmWalnutMat);
      sidePanel.position.set(sx, 1.38, -55.58);
      cabinGroup.add(sidePanel);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 2.25), champagneGoldMat);
      rail.position.set(sx * 0.91, 1.00, -55.58);
      cabinGroup.add(rail);
    });
    const cabCop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.18), champagneGoldMat);
    cabCop.position.set(1.05, 1.25, -56.65);
    cabinGroup.add(cabCop);
    [1.18, 1.32].forEach((by) => {
      const cb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.06), warmGoldLedMat);
      cb.position.set(1.03, by, -56.65);
      cabinGroup.add(cb);
    });

    // Rear Walnut Wall + Framed Vanity Mirror + Rear Handrail
    const cabBackWall = new THREE.Mesh(new THREE.BoxGeometry(2.18, 2.68, 0.06), warmWalnutMat);
    cabBackWall.position.set(0, 1.38, -54.24);
    cabinGroup.add(cabBackWall);
    const cabMirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.56, 0.03), champagneGoldMat);
    cabMirrorFrame.position.set(0, 1.62, -54.28);
    cabinGroup.add(cabMirrorFrame);
    const cabMirror = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.42, 0.035), balconyGlassMat);
    cabMirror.position.set(0, 1.62, -54.30);
    cabinGroup.add(cabMirror);
    const rearRail = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.05, 0.04), champagneGoldMat);
    rearRail.position.set(0, 1.00, -54.34);
    cabinGroup.add(rearRail);

    // Cabin Inner Sliding Glass Doors (at Z = -56.92 — strictly clear of landing doors at Z = -57.20!)
    const cabDoorL = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.66, 0.04), balconyGlassMat);
    cabDoorL.position.set(-0.53, 1.36, -56.92);
    cabinGroup.add(cabDoorL);
    const cabDoorR = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.66, 0.04), balconyGlassMat);
    cabDoorR.position.set(0.53, 1.36, -56.92);
    cabinGroup.add(cabDoorR);

    staticGroup.add(cabinGroup);

    const elev: CasaRivaInternalElevator = {
      api: null as unknown as HospitalElevatorApi,
      index: idx,
      x: ex,
      currentY: startY,
      currentFloor: startFloor,
      targetFloor: startFloor,
      doorOpen: 0,
      state: 'idle',
      timer: 0,
      queue: [],
      cabinGroup,
      cabDoorL,
      cabDoorR,
      landingDoors,
      displays,
    };

    elev.api = {
      index: idx,
      x: ex,
      doorZ: ELEV_DOOR_Z,
      cabMinX: ex - 1.12,
      cabMaxX: ex + 1.12,
      cabMinZ: -56.94,
      cabMaxZ: -54.28,
      get currentFloor() {
        return elev.currentFloor;
      },
      get currentY() {
        return elev.currentY;
      },
      get targetFloor() {
        return elev.targetFloor;
      },
      get doorOpen() {
        return elev.doorOpen;
      },
      get state() {
        return elev.state;
      },
      callToFloor: (fl: number) => {
        const clamped = Math.max(1, Math.min(2, Math.round(fl)));
        if (elev.state === 'idle' && elev.currentFloor === clamped) {
          elev.state = 'door_opening';
          return;
        }
        if (elev.state === 'door_closing' && elev.currentFloor === clamped) {
          elev.state = 'door_opening';
          return;
        }
        if (elev.state === 'moving' && elev.targetFloor === clamped) return;
        if (!elev.queue.includes(clamped)) {
          elev.queue.push(clamped);
        }
      },
      requestFloor: (fl: number) => {
        const clamped = Math.max(1, Math.min(2, Math.round(fl)));
        if (clamped === elev.currentFloor && elev.state !== 'moving') {
          if (elev.state === 'idle' || elev.state === 'door_closing') elev.state = 'door_opening';
          return;
        }
        if (!elev.queue.includes(clamped)) {
          elev.queue.push(clamped);
        }
        if (elev.state === 'boarding') {
          elev.timer = Math.min(elev.timer, 0.45);
        }
      },
    };
    internalElevators.push(elev);
  });

  // F1 VIP Concierge Check-In Corner (West of Reception: X=273.2, Z=-58.3)
  const conciergeRug = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.02, 3.6), rugMat);
  conciergeRug.position.set(273.2, F1_Y + 0.052, -58.3);
  staticGroup.add(conciergeRug);
  const conciergeSofa = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.44, 0.86), velvetTealMat);
  conciergeSofa.position.set(273.2, F1_Y + 0.26, -57.14);
  staticGroup.add(conciergeSofa);
  const conciergeBack = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.78, 0.22), cognacLeatherMat);
  conciergeBack.position.set(273.2, F1_Y + 0.44, -56.58);
  staticGroup.add(conciergeBack);
  [-1.19, 1.19].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.88), cognacLeatherMat);
    arm.position.set(273.2 + ax, F1_Y + 0.33, -57.14);
    staticGroup.add(arm);
  });
  [-0.55, 0.55].forEach((px) => {
    const cPillow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.14), boucleSofaMat);
    cPillow.position.set(273.2 + px, F1_Y + 0.61, -56.86);
    cPillow.rotation.x = -0.18;
    staticGroup.add(cPillow);
  });
  const conciergeTbl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 16), lobbyMarbleMat);
  conciergeTbl.position.set(273.2, F1_Y + 0.22, -58.8);
  staticGroup.add(conciergeTbl);
  const conciergeLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.28, 10), warmGoldLedMat);
  conciergeLamp.position.set(273.2, F1_Y + 0.56, -58.8);
  staticGroup.add(conciergeLamp);

  // Golden Brass Birdcage Bellhop Cart with Suitcases (X=276.1, Z=-61.4)
  const cartDeck = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.72), darkBronzeMat);
  cartDeck.position.set(276.1, F1_Y + 0.16, -61.4);
  staticGroup.add(cartDeck);
  const cartBagA = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.44, 0.30), cognacLeatherMat);
  cartBagA.position.set(275.9, F1_Y + 0.44, -61.4);
  staticGroup.add(cartBagA);
  const cartBagB = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.28), velvetTealMat);
  cartBagB.position.set(276.38, F1_Y + 0.38, -61.4);
  staticGroup.add(cartBagB);
  const cartArch = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.028, 6, 18, Math.PI), champagneGoldMat);
  cartArch.position.set(276.1, F1_Y + 1.25, -61.4);
  staticGroup.add(cartArch);

  // Two Symmetric Living-Room Lobby Lounge Sofa Islands + Floor Arc Lamps + Tea Service (West X=273, East X=295)
  [273.0, 295.0].forEach((lx, idx) => {
    const areaRug = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.02, 5.2), rugMat);
    areaRug.position.set(lx, F1_Y + 0.052, -78.1);
    staticGroup.add(areaRug);

    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.36, 18), lobbyMarbleMat);
    table.position.set(lx, F1_Y + 0.24, -78.1);
    staticGroup.add(table);

    const artBook = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.32), darkBronzeMat);
    artBook.position.set(lx - 0.24, F1_Y + 0.45, -78.05);
    staticGroup.add(artBook);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8), warmGoldLedMat);
    candle.position.set(lx + 0.25, F1_Y + 0.51, -78.15);
    staticGroup.add(candle);
    const teapot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.18, 10), boucleSofaMat);
    teapot.position.set(lx, F1_Y + 0.51, -77.78);
    staticGroup.add(teapot);

    const flSide = idx === 0 ? -2.2 : 2.2;
    const flPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.05, 8), champagneGoldMat);
    flPole.position.set(lx + flSide, F1_Y + 1.08, -76.3);
    staticGroup.add(flPole);
    const flShade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 0.28, 12), warmSoffitMat);
    flShade.position.set(lx + flSide, F1_Y + 2.12, -76.3);
    staticGroup.add(flShade);

    [-1.9, 1.9].forEach((dz) => {
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.44, 0.88), boucleSofaMat);
      sofa.position.set(lx, F1_Y + 0.28, -78.1 + dz);
      staticGroup.add(sofa);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.78, 0.22), cognacLeatherMat);
      back.position.set(lx, F1_Y + 0.46, -78.1 + dz + (dz > 0 ? 0.57 : -0.57));
      staticGroup.add(back);
      [-1.39, 1.39].forEach((ax) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.90), cognacLeatherMat);
        arm.position.set(lx + ax, F1_Y + 0.35, -78.1 + dz);
        staticGroup.add(arm);
      });
      [-0.85, 0.85].forEach((px) => {
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.14), velvetTealMat);
        pillow.position.set(lx + px, F1_Y + 0.63, -78.1 + dz + (dz > 0 ? 0.28 : -0.28));
        pillow.rotation.x = dz > 0 ? -0.18 : 0.18;
        staticGroup.add(pillow);
      });
    });
  });

  // East Lobby Espresso, Patisserie & Stocked Wine/Champagne Bar (X = 302.0, Z = -73.1)
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.06, 1.8), darkBronzeMat);
  barBase.position.set(302.0, F1_Y + 0.53, -73.1);
  staticGroup.add(barBase);
  const barUnderLed = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 1.88), warmGoldLedMat);
  barUnderLed.position.set(302.0, F1_Y + 0.06, -73.1);
  staticGroup.add(barUnderLed);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 2.0), lobbyMarbleMat);
  barTop.position.set(302.0, F1_Y + 1.09, -73.1);
  staticGroup.add(barTop);

  const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.46, 0.52), chromeSilverMat);
  espresso.position.set(300.6, F1_Y + 1.36, -73.0);
  staticGroup.add(espresso);
  const grinder = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.38, 10), darkBronzeMat);
  grinder.position.set(301.35, F1_Y + 1.32, -73.0);
  staticGroup.add(grinder);
  const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.48, 0.65), curtainGlassMat);
  pastryCase.position.set(302.8, F1_Y + 1.37, -73.0);
  staticGroup.add(pastryCase);
  [302.45, 302.8, 303.15].forEach((px, idx) => {
    const macaron = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.12, 10),
      idx % 2 === 0 ? pastryPinkMat : pastryChocMat
    );
    macaron.position.set(px, F1_Y + 1.24, -73.0);
    staticGroup.add(macaron);
  });

  [300.3, 302.0, 303.7].forEach((sx) => {
    const stoolStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.18, 0.72, 10), champagneGoldMat);
    stoolStem.position.set(sx, F1_Y + 0.36, -74.55);
    staticGroup.add(stoolStem);
    const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.10, 12), velvetTealMat);
    stoolSeat.position.set(sx, F1_Y + 0.75, -74.55);
    staticGroup.add(stoolSeat);
  });

  // Backlit Liquor & Wine Display Wall stocked with Bottles (F1 East Wall)
  const bottleBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.4, 3.8), warmAmberBacklitMat);
  bottleBack.position.set(310.6, F1_Y + 2.0, -73.1);
  staticGroup.add(bottleBack);
  const bottleMats = [emeraldBottleMat, rubyBottleMat, amberBottleMat];
  [1.4, 2.1, 2.8].forEach((sy, sIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 3.6), champagneGoldMat);
    shelf.position.set(310.4, F1_Y + sy, -73.1);
    staticGroup.add(shelf);
    for (let b = 0; b < 7; b++) {
      const bz = -74.5 + b * 0.46;
      const btl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.065, 0.34, 8),
        bottleMats[(b + sIdx) % 3]
      );
      btl.position.set(310.35, F1_Y + sy + 0.20, bz);
      staticGroup.add(btl);
    }
  });

  // 2 Cozy East Window Bistro Tables overlooking Đường Bạch Đằng (X=307.0, Z=-83.4 & -79.2)
  [-83.4, -79.2].forEach((bz) => {
    const bTop = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 16), lobbyMarbleMat);
    bTop.position.set(307.0, F1_Y + 0.76, bz);
    staticGroup.add(bTop);
    const bLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, 0.74, 10), champagneGoldMat);
    bLeg.position.set(307.0, F1_Y + 0.37, bz);
    staticGroup.add(bLeg);
    const bLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.22, 8), warmGoldLedMat);
    bLamp.position.set(307.0, F1_Y + 0.90, bz);
    staticGroup.add(bLamp);
    [-0.92, 0.92].forEach((ox) => {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), velvetTealMat);
      ch.position.set(307.0 + ox, F1_Y + 0.24, bz);
      staticGroup.add(ch);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.08, 8), boucleSofaMat);
      cup.position.set(307.0 + ox * 0.34, F1_Y + 0.83, bz);
      staticGroup.add(cup);
    });
  });

  addIndoorPlanter(270.5, F1_Y, -85.5);
  addIndoorPlanter(297.5, F1_Y, -85.5);

  // West Gallery Marble Bench, Sculpted Amphora Pedestal & 3 Framed Abstract Artworks
  const galPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 1.1), travertineMat);
  galPlinth.position.set(258.7, F1_Y + 0.525, -83.0);
  staticGroup.add(galPlinth);

  const amphoraProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.18, 0.0),
    new THREE.Vector2(0.14, 0.10),
    new THREE.Vector2(0.28, 0.32),
    new THREE.Vector2(0.30, 0.48),
    new THREE.Vector2(0.16, 0.66),
    new THREE.Vector2(0.12, 0.78),
    new THREE.Vector2(0.18, 0.86),
    new THREE.Vector2(0.13, 0.86),
    new THREE.Vector2(0.10, 0.68),
  ];
  const amphoraGeo = new THREE.LatheGeometry(amphoraProfile, 20);
  const amphora = new THREE.Mesh(amphoraGeo, champagneGoldMat);
  amphora.position.set(258.7, F1_Y + 1.05, -83.0);
  staticGroup.add(amphora);
  const amphoraFloral = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 1), lushLeafMatA);
  amphoraFloral.position.set(258.7, F1_Y + 2.04, -83.0);
  staticGroup.add(amphoraFloral);

  const galBench = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.48, 3.6), boucleSofaMat);
  galBench.position.set(258.6, F1_Y + 0.24, -65.5);
  staticGroup.add(galBench);

  [
    [-70.0, ['#f5efe6', '#d97706', '#292524'] as [string, string, string]],
    [-62.0, ['#1e293b', '#e7c178', '#f8fafc'] as [string, string, string]],
    [-81.5, ['#312e81', '#f59e0b', '#fef3c7'] as [string, string, string]],
  ].forEach(([az, pal]) => {
    const artTex = createAbstractArtTex(pal as [string, string, string]);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.7), champagneGoldMat);
    frame.position.set(256.88, F1_Y + 2.6, az as number);
    staticGroup.add(frame);
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.0),
      new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.4 })
    );
    canvas.rotation.y = Math.PI / 2;
    canvas.position.set(256.94, F1_Y + 2.6, az as number);
    canvas.userData.noMerge = true;
    staticGroup.add(canvas);
  });

  // =========================================================================
  // GRAND ARCHITECTURAL SWITCHBACK STAIRCASE (100% OPEN HEADROOM, BEAMS, RAILS & PENDANTS)
  // X = 262.0..267.0, Z = -79.4..-71.5
  // =========================================================================
  const STAIR_MID_Y = F1_Y + CASA_RIVA_FLOOR_H * 0.5;
  for (let i = 0; i < 11; i++) {
    const t = (i + 0.5) / 11;
    const yUp = F1_Y + t * (CASA_RIVA_FLOOR_H * 0.5) - 0.05;
    const zUp = -72.0 - t * 5.2;
    const treadUp = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.11, 0.44), oakWoodMat);
    treadUp.position.set(263.3, yUp, zUp);
    staticGroup.add(treadUp);
    const ledUp = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.03, 0.05), warmGoldLedMat);
    ledUp.position.set(263.3, yUp - 0.06, zUp + 0.21);
    staticGroup.add(ledUp);

    const yTop = STAIR_MID_Y + t * (CASA_RIVA_FLOOR_H * 0.5) - 0.05;
    const zTop = -77.2 + t * 5.2;
    const treadTop = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.11, 0.44), oakWoodMat);
    treadTop.position.set(265.7, yTop, zTop);
    staticGroup.add(treadTop);
    const ledTop = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.03, 0.05), warmGoldLedMat);
    ledTop.position.set(265.7, yTop - 0.06, zTop - 0.21);
    staticGroup.add(ledTop);
  }

  // Structural Dark-Bronze Diagonal Stringers + Landing Columns + Mid Landing
  const upStringer = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 5.85), darkBronzeMat);
  upStringer.position.set(263.3, F1_Y + CASA_RIVA_FLOOR_H * 0.25 - 0.16, -74.6);
  upStringer.rotation.x = Math.atan2(CASA_RIVA_FLOOR_H * 0.5, 5.2);
  staticGroup.add(upStringer);

  const topStringer = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 5.85), darkBronzeMat);
  topStringer.position.set(265.7, STAIR_MID_Y + CASA_RIVA_FLOOR_H * 0.25 - 0.16, -74.6);
  topStringer.rotation.x = -Math.atan2(CASA_RIVA_FLOOR_H * 0.5, 5.2);
  staticGroup.add(topStringer);

  const stairLanding = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.22, 2.05), oakWoodMat);
  stairLanding.position.set(264.5, STAIR_MID_Y - 0.11, -78.2);
  staticGroup.add(stairLanding);

  [262.3, 266.7].forEach((lx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, STAIR_MID_Y - F1_Y, 10), champagneGoldMat);
    col.position.set(lx, F1_Y + (STAIR_MID_Y - F1_Y) * 0.5, -78.8);
    staticGroup.add(col);
  });

  // Backlit Warm Feature Wall behind Mid-Landing & Hanging Crystal Stairway Pendants
  const stairAccentPanel = new THREE.Mesh(new THREE.BoxGeometry(4.6, 5.2, 0.12), warmAmberBacklitMat);
  stairAccentPanel.position.set(264.5, F1_Y + 4.8, -79.35);
  staticGroup.add(stairAccentPanel);
  [-0.9, 0.0, 0.9].forEach((ox, idx) => {
    const dropLen = 2.4 + idx * 0.55;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, dropLen, 6), champagneGoldMat);
    cord.position.set(264.5 + ox, PODIUM_TOP_Y - dropLen * 0.5, -76.5);
    staticGroup.add(cord);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), crystalGlowMat);
    orb.position.set(264.5 + ox, PODIUM_TOP_Y - dropLen, -76.5);
    staticGroup.add(orb);
  });

  // Center Divider Glass & Sloped Brass Handrail + Full Perimeter Stairwell Balustrades
  const stairCenterGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, CASA_RIVA_FLOOR_H + 0.9, 5.4), balconyGlassMat);
  stairCenterGlass.position.set(264.5, F1_Y + (CASA_RIVA_FLOOR_H + 0.9) * 0.5, -74.6);
  staticGroup.add(stairCenterGlass);

  // West, East, North & South-Down-Flight F2 Balustrades around Stairwell Hole
  const stairRailE = new THREE.Mesh(new THREE.BoxGeometry(0.05, CASA_RIVA_FLOOR_H + 1.15, 8.1), balconyGlassMat);
  stairRailE.position.set(267.0, F1_Y + (CASA_RIVA_FLOOR_H + 1.15) * 0.5, -75.45);
  staticGroup.add(stairRailE);
  const stairRailW = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.08, 8.1), balconyGlassMat);
  stairRailW.position.set(262.0, F2_Y + 0.54, -75.45);
  staticGroup.add(stairRailW);
  const stairRailN = new THREE.Mesh(new THREE.BoxGeometry(5.05, 1.08, 0.05), balconyGlassMat);
  stairRailN.position.set(264.5, F2_Y + 0.54, -79.4);
  staticGroup.add(stairRailN);
  const stairRailS = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.08, 0.05), balconyGlassMat);
  stairRailS.position.set(263.25, F2_Y + 0.54, -71.5);
  staticGroup.add(stairRailS);
  const stairCapE = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 8.15), champagneGoldMat);
  stairCapE.position.set(267.0, F2_Y + 1.10, -75.45);
  staticGroup.add(stairCapE);
  const stairCapW = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 8.15), champagneGoldMat);
  stairCapW.position.set(262.0, F2_Y + 1.10, -75.45);
  staticGroup.add(stairCapW);
  const stairCapN = new THREE.Mesh(new THREE.BoxGeometry(5.10, 0.06, 0.09), champagneGoldMat);
  stairCapN.position.set(264.5, F2_Y + 1.10, -79.4);
  staticGroup.add(stairCapN);
  const stairCapS = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.06, 0.09), champagneGoldMat);
  stairCapS.position.set(263.25, F2_Y + 1.10, -71.5);
  staticGroup.add(stairCapS);

  // =========================================================================
  // FLOOR 2 MEZZANINE INTERIORS: 4-SIDED ATRIUM RAILS, GRAND PIANO STAGE,
  // FINE DINING, SKY COCKTAIL BAR, VIP BOOTHS & EXECUTIVE LIBRARY
  // =========================================================================
  // Full 4-Sided Central Atrium Glass Balustrade + Champagne Gold Top Rails
  [
    { x: plotCX, z: -80.9, w: 17.6, d: 0.05 }, // North
    { x: plotCX, z: -66.1, w: 17.6, d: 0.05 }, // South
    { x: 275.2, z: -73.5, w: 0.05, d: 14.8 },  // West
    { x: 292.8, z: -73.5, w: 0.05, d: 14.8 },  // East
  ].forEach((b) => {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(b.w, 1.08, b.d), balconyGlassMat);
    glass.position.set(b.x, F2_Y + 0.54, b.z);
    staticGroup.add(glass);
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(b.w > 1 ? b.w + 0.08 : 0.09, 0.06, b.d > 1 ? b.d + 0.08 : 0.09),
      champagneGoldMat
    );
    rail.position.set(b.x, F2_Y + 1.10, b.z);
    staticGroup.add(rail);
  });

  // F2 West Grand Piano & Jazz Sky Lounge Stage (X = 266.0, Z = -62.0)
  const pianoRug = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.02, 24), rugMat);
  pianoRug.position.set(266.1, F2_Y + 0.015, -62.0);
  staticGroup.add(pianoRug);
  const pianoBody = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, 2.05), pianoGlossMat);
  pianoBody.position.set(266.1, F2_Y + 0.88, -62.0);
  staticGroup.add(pianoBody);
  const pianoLid = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.06, 1.75), pianoGlossMat);
  pianoLid.position.set(266.38, F2_Y + 1.24, -62.0);
  pianoLid.rotation.z = -0.36;
  staticGroup.add(pianoLid);
  const pianoProp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), champagneGoldMat);
  pianoProp.position.set(266.85, F2_Y + 1.10, -62.0);
  staticGroup.add(pianoProp);
  const pianoKeys = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 0.28), boucleSofaMat);
  pianoKeys.position.set(266.1, F2_Y + 0.78, -60.95);
  staticGroup.add(pianoKeys);
  const musicStand = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.28, 0.03), boucleSofaMat);
  musicStand.position.set(266.1, F2_Y + 1.12, -61.22);
  musicStand.rotation.x = -0.25;
  staticGroup.add(musicStand);
  [
    [265.4, -62.8],
    [266.8, -62.8],
    [266.1, -61.1],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.72, 8), pianoGlossMat);
    leg.position.set(lx, F2_Y + 0.36, lz);
    staticGroup.add(leg);
  });
  const pianoBench = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.44, 0.40), cognacLeatherMat);
  pianoBench.position.set(266.1, F2_Y + 0.22, -60.38);
  staticGroup.add(pianoBench);

  // Jazz Lounge Glowing Feature Sign on South Wall behind Piano
  const skySignTex = createSkyLoungeNeonTex();
  const skySign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.05),
    new THREE.MeshStandardMaterial({ map: skySignTex, emissive: 0xffd266, emissiveMap: skySignTex, emissiveIntensity: 1.15 })
  );
  skySign.rotation.y = Math.PI;
  skySign.position.set(266.1, F2_Y + 2.75, -54.02);
  skySign.userData.noMerge = true;
  staticGroup.add(skySign);

  // 2 Intimate Piano Cocktail Tables + Velvet Armchairs (X=260.7 & 270.8, Z=-58.5)
  [
    [260.7, -58.6],
    [270.8, -58.0],
  ].forEach(([kx, kz]) => {
    const cTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16), lobbyMarbleMat);
    cTop.position.set(kx, F2_Y + 0.68, kz);
    staticGroup.add(cTop);
    const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.20, 0.66, 10), champagneGoldMat);
    cLeg.position.set(kx, F2_Y + 0.33, kz);
    staticGroup.add(cLeg);
    const cLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.20, 10), warmGoldLedMat);
    cLamp.position.set(kx, F2_Y + 0.81, kz);
    staticGroup.add(cLamp);
    [-0.95, 0.95].forEach((ox) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.44, 0.52), velvetTealMat);
      seat.position.set(kx + ox, F2_Y + 0.22, kz);
      staticGroup.add(seat);
    });
  });

  // F2 NW Riverfront Velvet Booth (X = 259.6, Z = -84.2) on the solid North-West Floor 2 Wing!
  const nwBoothSeat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.48, 1.0), velvetTealMat);
  nwBoothSeat.position.set(259.6, F2_Y + 0.24, -85.2);
  staticGroup.add(nwBoothSeat);
  const nwBoothTbl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.9), oakWoodMat);
  nwBoothTbl.position.set(259.6, F2_Y + 0.76, -83.8);
  staticGroup.add(nwBoothTbl);
  const nwBoothLamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), warmGoldLedMat);
  nwBoothLamp.position.set(259.6, F2_Y + 0.94, -83.8);
  staticGroup.add(nwBoothLamp);

  // Fine-Dining Sets (upgraded with linen runners, wine glasses, plates, lamps & chairs)
  const addFineDiningSet = (dx: number, dz: number) => {
    const diningTable = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.07, 1.6), oakWoodMat);
    diningTable.position.set(dx, F2_Y + 0.78, dz);
    staticGroup.add(diningTable);
    const runner = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.015, 0.45), boucleSofaMat);
    runner.position.set(dx, F2_Y + 0.822, dz);
    staticGroup.add(runner);
    const tLeg = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.75, 0.8), darkBronzeMat);
    tLeg.position.set(dx, F2_Y + 0.38, dz);
    staticGroup.add(tLeg);
    [-0.9, 0.9].forEach((lx) => {
      const lampDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), warmGoldLedMat);
      lampDome.position.set(dx + lx, F2_Y + 1.05, dz);
      staticGroup.add(lampDome);
    });
    [-1.1, 0.0, 1.1].forEach((ox) => {
      [-0.48, 0.48].forEach((oz) => {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.025, 12), boucleSofaMat);
        plate.position.set(dx + ox, F2_Y + 0.83, dz + oz);
        staticGroup.add(plate);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.14, 8), curtainGlassMat);
        glass.position.set(dx + ox + 0.18, F2_Y + 0.90, dz + oz * 0.75);
        staticGroup.add(glass);
      });
      const chairN = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.50), velvetTealMat);
      chairN.position.set(dx + ox, F2_Y + 0.24, dz - 1.05);
      staticGroup.add(chairN);
      const chairS = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.50), velvetTealMat);
      chairS.position.set(dx + ox, F2_Y + 0.24, dz + 1.05);
      staticGroup.add(chairS);
    });
  };
  addFineDiningSet(271.6, -84.0);
  addFineDiningSet(296.4, -84.0);
  addFineDiningSet(296.4, -78.5);

  // F2 North Viewing Bridge Art Pedestals & Bench (Z=-84.2)
  [278.0, 290.0].forEach((ax) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.75), travertineMat);
    ped.position.set(ax, F2_Y + 0.575, -81.8);
    staticGroup.add(ped);
    const orb = new THREE.Mesh(new THREE.TorusKnotGeometry(0.24, 0.06, 36, 8), champagneGoldMat);
    orb.position.set(ax, F2_Y + 1.48, -81.8);
    staticGroup.add(orb);
  });

  // F2 Maître D' Host Podium & Sky Cocktail Bar (East Wing)
  const maitreD = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.18, 0.72), darkBronzeMat);
  maitreD.position.set(294.2, F2_Y + 0.59, -72.1);
  staticGroup.add(maitreD);
  const maitreLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.16, 8), warmGoldLedMat);
  maitreLamp.position.set(294.2, F2_Y + 1.28, -72.1);
  staticGroup.add(maitreLamp);

  const f2Bar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.05, 1.65), darkBronzeMat);
  f2Bar.position.set(302.5, F2_Y + 0.525, -72.7);
  staticGroup.add(f2Bar);
  const f2BarOnyx = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.85, 0.06), warmAmberBacklitMat);
  f2BarOnyx.position.set(302.5, F2_Y + 0.52, -73.54);
  staticGroup.add(f2BarOnyx);
  const f2BarTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 1.85), lobbyMarbleMat);
  f2BarTop.position.set(302.5, F2_Y + 1.08, -72.7);
  staticGroup.add(f2BarTop);

  [300.6, 301.85, 303.1, 304.35].forEach((sx) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.16, 0.72, 10), champagneGoldMat);
    stem.position.set(sx, F2_Y + 0.36, -74.05);
    staticGroup.add(stem);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.10, 12), cognacLeatherMat);
    seat.position.set(sx, F2_Y + 0.74, -74.05);
    staticGroup.add(seat);
  });

  // F2 Backlit Sky Bar Spirit Wall + Hanging Brass Stemware Gantry + 2 SE VIP Dining Booths
  const f2BottleBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.2, 3.8), warmAmberBacklitMat);
  f2BottleBack.position.set(310.6, F2_Y + 1.9, -72.7);
  staticGroup.add(f2BottleBack);
  [1.3, 2.0, 2.7].forEach((sy, sIdx) => {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 3.6), champagneGoldMat);
    sh.position.set(310.4, F2_Y + sy, -72.7);
    staticGroup.add(sh);
    for (let b = 0; b < 7; b++) {
      const btl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.065, 0.32, 8),
        bottleMats[(b + sIdx) % 3]
      );
      btl.position.set(310.35, F2_Y + sy + 0.20, -74.1 + b * 0.46);
      staticGroup.add(btl);
    }
  });

  // 2 SE VIP Velvet Dining Booths (X = 306.5, Z = -62.8 & -57.6)
  [-62.8, -57.6].forEach((vz) => {
    const vSofa = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.52, 0.92), cognacLeatherMat);
    vSofa.position.set(306.5, F2_Y + 0.26, vz + 0.92);
    staticGroup.add(vSofa);
    const vTable = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.07, 1.15), lobbyMarbleMat);
    vTable.position.set(306.5, F2_Y + 0.76, vz);
    staticGroup.add(vTable);
    const vLamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), warmGoldLedMat);
    vLamp.position.set(306.5, F2_Y + 0.96, vz);
    staticGroup.add(vLamp);
    [-0.9, 0.9].forEach((ox) => {
      const vChair = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.46, 0.50), velvetTealMat);
      vChair.position.set(306.5 + ox, F2_Y + 0.23, vz - 0.92);
      staticGroup.add(vChair);
    });
  });

  // F2 South Executive Bookcase Curio Wall & Reading Lounge (X = 284, Z = -64.5 & -56.4)
  const libCase = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.6, 0.75), warmWalnutMat);
  libCase.position.set(DOOR_CENTER_X, F2_Y + 1.8, -64.5);
  staticGroup.add(libCase);
  [0.9, 1.8, 2.7].forEach((sy, sIdx) => {
    const lShelf = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.06, 0.80), champagneGoldMat);
    lShelf.position.set(DOOR_CENTER_X, F2_Y + sy, -64.5);
    staticGroup.add(lShelf);
    for (let k = -3.4; k <= 3.4; k += 0.65) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.36 + ((Math.round(k * 10) + sIdx) % 2) * 0.08, 0.28),
        bottleMats[Math.abs(Math.round(k) + sIdx) % 3]
      );
      book.position.set(DOOR_CENTER_X + k, F2_Y + sy + 0.22, -64.45);
      staticGroup.add(book);
    }
  });

  const readRug = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.02, 3.2), rugMat);
  readRug.position.set(295.8, F2_Y + 0.015, -57.4);
  staticGroup.add(readRug);
  const readTbl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.38, 14), lobbyMarbleMat);
  readTbl.position.set(295.8, F2_Y + 0.20, -57.4);
  staticGroup.add(readTbl);
  [-0.95, 0.95].forEach((rx) => {
    const rChair = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.72), boucleSofaMat);
    rChair.position.set(295.8 + rx, F2_Y + 0.26, -57.4);
    staticGroup.add(rChair);
  });

  // =========================================================================
  // 5. 20-STORY TWIN-WING LUXURY TOWER (FLOORS 3..20, Y = 10.65 .. 74.0m)
  // =========================================================================
  const TOWER_BASE_Y = PODIUM_TOP_Y + 0.44; // 11.09m
  const TOWER_STORIES = 18;
  const STORY_H = 3.45;
  const TOWER_H = TOWER_STORIES * STORY_H;
  const TOWER_MID_Y = TOWER_BASE_Y + TOWER_H * 0.5;
  const TOWER_CZ = -66.0;
  const TOWER_D = 24.4;

  const westWingCore = new THREE.Mesh(new THREE.BoxGeometry(19.0, TOWER_H, TOWER_D), warmTowerStoneMat);
  westWingCore.position.set(267.5, TOWER_MID_Y, TOWER_CZ);
  staticGroup.add(westWingCore);

  const eastWingCore = new THREE.Mesh(new THREE.BoxGeometry(19.0, TOWER_H, TOWER_D), warmTowerStoneMat);
  eastWingCore.position.set(300.5, TOWER_MID_Y, TOWER_CZ);
  staticGroup.add(eastWingCore);

  const centerCore = new THREE.Mesh(new THREE.BoxGeometry(14.0, TOWER_H, TOWER_D - 1.8), towerCoreDarkMat);
  centerCore.position.set(plotCX, TOWER_MID_Y, TOWER_CZ + 0.6);
  staticGroup.add(centerCore);

  for (let s = 0; s < TOWER_STORIES; s++) {
    const flBotY = TOWER_BASE_Y + s * STORY_H;
    const flMidY = flBotY + STORY_H * 0.5;

    [267.5, 300.5].forEach((wx) => {
      const slabEdge = new THREE.Mesh(new THREE.BoxGeometry(19.4, 0.28, TOWER_D + 0.5), warmTowerStoneMat);
      slabEdge.position.set(wx, flBotY + 0.14, TOWER_CZ);
      staticGroup.add(slabEdge);

      const warmSoffit = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.10, 0.65), warmSoffitMat);
      warmSoffit.position.set(wx, flBotY + STORY_H - 0.12, -78.15);
      staticGroup.add(warmSoffit);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(16.4, 1.05, 0.05), balconyGlassMat);
      rail.position.set(wx, flBotY + 0.78, -78.42);
      staticGroup.add(rail);

      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(16.2, STORY_H - 0.55, 0.06), towerGlassMat);
      winGlass.position.set(wx, flMidY, -78.22);
      staticGroup.add(winGlass);
    });

    const midSoffit = new THREE.Mesh(
      new THREE.BoxGeometry(11.6, 0.10, 0.55),
      s % 3 === 0 ? warmGoldLedMat : warmSoffitMat
    );
    midSoffit.position.set(plotCX, flBotY + STORY_H - 0.14, -77.15);
    staticGroup.add(midSoffit);

    const midGlass = new THREE.Mesh(new THREE.BoxGeometry(12.2, STORY_H - 0.45, 0.06), towerGlassMat);
    midGlass.position.set(plotCX, flMidY, -77.26);
    staticGroup.add(midGlass);

    const midSlab = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.26, 0.42), towerCoreDarkMat);
    midSlab.position.set(plotCX, flBotY + 0.13, -77.38);
    staticGroup.add(midSlab);

    const sideGlassW = new THREE.Mesh(new THREE.BoxGeometry(0.06, STORY_H - 0.65, 19.8), towerGlassMat);
    sideGlassW.position.set(257.96, flMidY, TOWER_CZ);
    staticGroup.add(sideGlassW);

    const sideGlassE = new THREE.Mesh(new THREE.BoxGeometry(0.06, STORY_H - 0.65, 19.8), towerGlassMat);
    sideGlassE.position.set(310.04, flMidY, TOWER_CZ);
    staticGroup.add(sideGlassE);
  }

  [258.5, 263.0, 267.5, 272.0, 276.5, 291.5, 296.0, 300.5, 305.0, 309.5].forEach((mx, idx) => {
    const pil = new THREE.Mesh(
      new THREE.BoxGeometry(idx % 2 === 0 ? 0.38 : 0.26, TOWER_H, 0.42),
      idx % 2 === 0 ? warmTowerStoneMat : warmWalnutMat
    );
    pil.position.set(mx, TOWER_MID_Y, -78.32);
    staticGroup.add(pil);
  });

  const ROOF_Y = TOWER_BASE_Y + TOWER_H;
  [267.5, 300.5].forEach((wx) => {
    const crownCornice = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.95, TOWER_D + 1.6), warmTowerStoneMat);
    crownCornice.position.set(wx, ROOF_Y + 0.48, TOWER_CZ);
    staticGroup.add(crownCornice);
  });
  const centerCrownCap = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.65, TOWER_D - 1.2), towerCoreDarkMat);
  centerCrownCap.position.set(plotCX, ROOF_Y + 0.2, TOWER_CZ + 0.6);
  staticGroup.add(centerCrownCap);

  const crownTex = createCasaRivaCrownSignTex();
  const crownSignMat = new THREE.MeshStandardMaterial({
    map: crownTex,
    emissive: 0xffd266,
    emissiveMap: crownTex,
    emissiveIntensity: 1.45,
    roughness: 0.22,
  });
  neonMats.push(crownSignMat);

  const crownBacking = new THREE.Mesh(new THREE.BoxGeometry(14.8, 3.6, 0.5), towerCoreDarkMat);
  crownBacking.position.set(plotCX, ROOF_Y + 2.2, -77.0);
  staticGroup.add(crownBacking);

  const crownSign = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 3.4), crownSignMat);
  crownSign.rotation.y = Math.PI;
  crownSign.position.set(plotCX, ROOF_Y + 2.2, -77.30);
  crownSign.userData.noMerge = true;
  staticGroup.add(crownSign);

  // =========================================================================
  // 6. ARCHITECTURAL POINT LIGHTS (3 POOLED WARM LIGHTS)
  // =========================================================================
  const addLight = (color: number, dayInt: number, nightInt: number, distance: number, x: number, y: number, z: number) => {
    const light = new THREE.PointLight(color, dayInt, distance, 1.0);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: () => 1.0,
    });
  };
  addLight(0xffcf70, 9.5, 18.0, 36, DOOR_CENTER_X, PORTE_Y - 0.3, -92.0);
  addLight(0xffd984, 11.5, 19.0, 40, DOOR_CENTER_X, 4.6, -76.5);
  addLight(0xffd275, 9.8, 17.0, 38, DOOR_CENTER_X, F2_Y + 3.8, -81.0);

  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xfcd34d,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  poolMats.push(poolMat);
  const portePool = new THREE.Mesh(new THREE.PlaneGeometry(32.0, 8.0), poolMat);
  portePool.rotation.x = -Math.PI / 2;
  portePool.position.set(DOOR_CENTER_X, 0.07, -92.1);
  staticGroup.add(portePool);

  // =========================================================================
  // 7. TWO ACTIVE BLACK LUXURY CHAUFFEUR CARS + VIP GUEST PICKUP / DROPOFF
  // =========================================================================
  const shuttleRoute = new THREE.CatmullRomCurve3(
    [
      // West turnaround onto Bạch Đằng Eastbound (Z = -113.4)
      new THREE.Vector3(219.0, 0, -116.5),
      new THREE.Vector3(225.0, 0, -113.4),
      new THREE.Vector3(250.0, 0, -113.4),
      new THREE.Vector3(265.0, 0, -112.4),
      // Enter Casa Riva West Driveway clear of trees & piers (X ~ 271..273)
      new THREE.Vector3(270.8, 0, -106.5),
      new THREE.Vector3(272.5, 0, -99.8),
      new THREE.Vector3(273.2, 0, -94.0),
      new THREE.Vector3(277.8, 0, -91.8),
      // Porte-Cochère VIP Boarding / Drop-off Bay (directly in front of Lobby Doors)
      new THREE.Vector3(284.8, 0, -91.8),
      new THREE.Vector3(292.2, 0, -92.0),
      // Depart via Casa Riva East Driveway clear of piers & palms (X ~ 296..300)
      new THREE.Vector3(296.0, 0, -95.2),
      new THREE.Vector3(297.8, 0, -101.2),
      new THREE.Vector3(299.6, 0, -106.8),
      new THREE.Vector3(304.8, 0, -112.6),
      // Cruise East along Bạch Đằng Waterfront toward Cầu Rồng
      new THREE.Vector3(328.0, 0, -113.4),
      new THREE.Vector3(346.0, 0, -113.8),
      new THREE.Vector3(350.0, 0, -117.5),
      new THREE.Vector3(346.0, 0, -121.4),
      // Cruise West along Han River Waterfront Promenade (Z = -121.6)
      new THREE.Vector3(316.0, 0, -121.6),
      new THREE.Vector3(284.0, 0, -121.6),
      new THREE.Vector3(250.0, 0, -121.6),
      new THREE.Vector3(225.0, 0, -121.4),
      new THREE.Vector3(219.0, 0, -118.8),
    ],
    true,
    'catmullrom',
    0.35
  );

  // Locate exact curve parameter uStop nearest the Porte-Cochère Drop-off Spot (284.8, -91.8)
  let uStop = 0.34;
  let bestStopDist = Infinity;
  for (let s = 0; s <= 400; s++) {
    const u = s / 400;
    const pt = shuttleRoute.getPointAt(u);
    const d = Math.hypot(pt.x - 284.8, pt.z - -91.8);
    if (d < bestStopDist) {
      bestStopDist = d;
      uStop = u;
    }
  }

  const createShuttleGuestRig = (suitColor: number, bagColor: number): ShuttleGuestRig => {
    const group = new THREE.Group();
    group.userData.noMerge = true;
    const shirtMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.62 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6c9a5, roughness: 0.72 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.22), shirtMat);
    torso.position.y = 1.04;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), skinMat);
    head.position.y = 1.47;
    group.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.28), hairMat);
    hair.position.y = 1.60;
    group.add(hair);

    const mkLimb = (x: number, y: number, w: number, h: number, mat: THREE.Material) => {
      const p = new THREE.Group();
      p.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      m.position.y = -h * 0.45;
      p.add(m);
      group.add(p);
      return p;
    };
    const leftArm = mkLimb(-0.26, 1.26, 0.11, 0.42, shirtMat);
    const rightArm = mkLimb(0.26, 1.26, 0.11, 0.42, shirtMat);
    const leftLeg = mkLimb(-0.09, 0.76, 0.14, 0.66, pantsMat);
    const rightLeg = mkLimb(0.09, 0.76, 0.14, 0.66, pantsMat);

    // Rolling VIP Carry-on Suitcase beside Right Hand
    const suitcase = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.44, 0.34),
      new THREE.MeshStandardMaterial({ color: bagColor, roughness: 0.45, metalness: 0.35 })
    );
    suitcase.position.set(0.32, 0.26, -0.10);
    group.add(suitcase);

    staticGroup.add(group);
    return { group, leftArm, rightArm, leftLeg, rightLeg, suitcase, shirtMat };
  };

  const buildActiveBlackCar = (mode: 'sedan' | 'coupe', startCycle: number, guestSuit: number, bagColor: number): CasaRivaShuttleCar => {
    const root = new THREE.Group();
    root.userData.noMerge = true;

    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffecb3,
      emissive: 0xf5b027,
      emissiveIntensity: 2.4,
      roughness: 0.18,
    });
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.6,
      roughness: 0.22,
    });
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.0,
      roughness: 0.22,
    });

    const body = new THREE.Mesh(createCarSilhouetteGeo(mode), carMetallicMat);
    body.position.y = 0.08;
    root.add(body);

    const glassCabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.34, mode === 'sedan' ? 2.15 : 1.78),
      carGlassMat
    );
    glassCabin.position.set(0, mode === 'sedan' ? 1.18 : 1.08, -0.20);
    root.add(glassCabin);

    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 0.05, mode === 'sedan' ? 1.50 : 1.20),
      carMetallicMat
    );
    roofCap.position.set(0, mode === 'sedan' ? 1.37 : 1.26, -0.22);
    root.add(roofCap);

    // Chauffeur silhouette + Rear Cabin Guest indicator visible inside cabin
    const chauffeurHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), darkBronzeMat);
    chauffeurHead.position.set(-0.36, 1.16, 0.12);
    root.add(chauffeurHead);

    const cabinGuestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), boucleSofaMat);
    cabinGuestMesh.position.set(0.34, 1.15, -0.52);
    root.add(cabinGuestMesh);

    const beltTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 0.04, mode === 'sedan' ? 2.22 : 1.84),
      chromeSilverMat
    );
    beltTrim.position.set(0, 0.99, -0.20);
    root.add(beltTrim);

    [-0.95, 0.95].forEach((mx) => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.14), carMetallicMat);
      mirror.position.set(mx, 0.98, 0.65);
      root.add(mirror);
      const blinker = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.10), hazardMat);
      blinker.position.set(mx * 0.90, 0.68, mode === 'sedan' ? 2.46 : 2.36);
      root.add(blinker);
    });

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.26, 0.06), chromeSilverMat);
    grille.position.set(0, 0.56, mode === 'sedan' ? 2.48 : 2.38);
    root.add(grille);

    const headLed = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.08, 0.05), headlightMat);
    headLed.position.set(0, 0.64, mode === 'sedan' ? 2.48 : 2.38);
    root.add(headLed);

    const tailLed = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.07, 0.05), brakeMat);
    tailLed.position.set(0, 0.72, mode === 'sedan' ? -2.46 : -2.36);
    root.add(tailLed);

    const wheels: THREE.Object3D[] = [];
    [
      [-0.90, 1.42],
      [0.90, 1.42],
      [-0.90, -1.42],
      [0.90, -1.42],
    ].forEach(([wx, wz]) => {
      const wGrp = new THREE.Group();
      wGrp.position.set(wx, 0.32, wz);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 18), darkCurbMat);
      tire.rotation.z = Math.PI / 2;
      wGrp.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.24, 10), chromeSilverMat);
      rim.rotation.z = Math.PI / 2;
      wGrp.add(rim);
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.42), darkBronzeMat);
      wGrp.add(spoke);
      root.add(wGrp);
      wheels.push(wGrp);
    });

    staticGroup.add(root);
    const guestRig = createShuttleGuestRig(guestSuit, bagColor);
    guestRig.group.visible = false;

    return {
      mode,
      root,
      wheels,
      headlightMat,
      brakeMat,
      hazardMat,
      cabinGuestMesh,
      guestRig,
      cycleTime: startCycle,
      stopYaw: Math.PI / 2,
      guestWalking: false,
      guestNearDoor: false,
      yieldFactor: 1.0,
    };
  };

  // Cycle = 38s total: [0..29s] driving loop (29s), [29..38s] stopped at Porte-Cochère serving guests (9s)!
  const DRIVE_DURATION = 29.0;
  const STOP_DURATION = 9.0;
  const TOTAL_CYCLE = DRIVE_DURATION + STOP_DURATION; // 38.0s

  // Car 1 starts nearly arriving at Porte-Cochère (27.2s) so players see immediate drop-off action!
  // Car 2 starts exactly 19.0s (half-cycle) out of phase cruising along Đường Bạch Đằng waterfront!
  const shuttleCars: CasaRivaShuttleCar[] = [
    buildActiveBlackCar('sedan', 27.2, 0x1e3a8a, 0x92400e),
    buildActiveBlackCar('coupe', 8.2, 0x881337, 0x334155),
  ];

  // =========================================================================
  // 8. ANIMATED UPDATE LOOP (DOORS + WATERFALL + LIGHTS + 2 VIP SHUTTLES)
  // =========================================================================
  let doorProg = 0;
  let elapsed = 0;

  const animateGuestWalk = (
    rig: ShuttleGuestRig,
    targetX: number,
    targetZ: number,
    dt: number,
    speed: number
  ): boolean => {
    const dx = targetX - rig.group.position.x;
    const dz = targetZ - rig.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.22) {
      rig.leftLeg.rotation.x *= 0.8;
      rig.rightLeg.rotation.x *= 0.8;
      rig.leftArm.rotation.x *= 0.8;
      rig.rightArm.rotation.x *= 0.8;
      return true;
    }
    const step = Math.min(dist, speed * dt);
    rig.group.position.x += (dx / dist) * step;
    rig.group.position.z += (dz / dist) * step;
    rig.group.rotation.y = Math.atan2(dx, dz);
    const sw = Math.sin(elapsed * 8.5) * 0.45;
    rig.leftLeg.rotation.x = sw;
    rig.rightLeg.rotation.x = -sw;
    rig.leftArm.rotation.x = -sw * 0.5;
    rig.rightArm.rotation.x = sw * 0.3;
    return false;
  };

  const update = (
    delta: number,
    _rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: CasaRivaNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    elapsed += dt;

    warmGoldLedMat.emissiveIntensity = THREE.MathUtils.lerp(2.1, 4.5, lampFactor);
    warmSoffitMat.emissiveIntensity = THREE.MathUtils.lerp(1.4, 3.4, lampFactor);
    warmAmberBacklitMat.emissiveIntensity = THREE.MathUtils.lerp(0.85, 2.1, lampFactor);
    crystalGlowMat.emissiveIntensity = THREE.MathUtils.lerp(2.6, 5.2, lampFactor);
    fasciaSignMat.emissiveIntensity = THREE.MathUtils.lerp(1.5, 2.9, lampFactor);
    crownSignMat.emissiveIntensity = THREE.MathUtils.lerp(1.2, 2.6, lampFactor);

    for (let i = 0; i < jetMeshes.length; i++) {
      jetMeshes[i].scale.y = 0.90 + Math.sin(elapsed * 5.2 + i * 0.75) * 0.12;
    }

    // Step Both Active Black Luxury Chauffeur Cars + VIP Guest Drop-off / Pick-up
    let shuttleGuestNearDoor = false;

    for (let c = 0; c < shuttleCars.length; c++) {
      const car = shuttleCars[c];

      // Polite chauffeur obstacle check against player on driveway
      let wantYield = false;
      if (playerPos && playerPos.y < 1.8) {
        const fwdX = Math.sin(car.root.rotation.y);
        const fwdZ = Math.cos(car.root.rotation.y);
        const rx = playerPos.x - car.root.position.x;
        const rz = playerPos.z - car.root.position.z;
        const fwdDist = rx * fwdX + rz * fwdZ;
        const sideDist = Math.abs(rx * -fwdZ + rz * fwdX);
        if (fwdDist > 0.5 && fwdDist < 5.2 && sideDist < 2.1) {
          wantYield = true;
        }
      }
      car.yieldFactor = THREE.MathUtils.damp(car.yieldFactor, wantYield ? 0 : 1, 7.0, dt);

      const wasInStopWindow = car.cycleTime >= DRIVE_DURATION;
      car.cycleTime = (car.cycleTime + dt * (wasInStopWindow ? 1.0 : car.yieldFactor)) % TOTAL_CYCLE;
      const inStopWindow = car.cycleTime >= DRIVE_DURATION;

      let speedMps = 0;
      if (!inStopWindow) {
        // Map drive time [0..DRIVE_DURATION] smoothly starting/ending at uStop with ease-in/out!
        const frac = car.cycleTime / DRIVE_DURATION;
        // Smooth deceleration entering Porte-Cochère (frac near 1) & smooth acceleration leaving (frac near 0)
        const eased =
          frac < 0.08
            ? 0.5 * (frac / 0.08) * frac
            : frac > 0.92
              ? 1 - 0.5 * ((1 - frac) / 0.08) * (1 - frac)
              : frac;
        const u = (uStop + eased) % 1.0;
        shuttleRoute.getPointAt(u, _carPt);
        shuttleRoute.getTangentAt(u, _carTan);

        const prevX = car.root.position.x;
        const prevZ = car.root.position.z;
        const groundY = getDrivewayCarY(_carPt.z);
        car.root.position.set(_carPt.x, groundY, _carPt.z);
        const yaw = Math.atan2(_carTan.x, _carTan.z);
        car.root.rotation.y = yaw;
        car.stopYaw = yaw;
        speedMps = Math.hypot(_carPt.x - prevX, _carPt.z - prevZ) / Math.max(dt, 0.001);

        // Cabin guest is riding inside between pick-up & next drop-off!
        car.cabinGuestMesh.visible = true;
        car.hazardMat.emissiveIntensity = 0.0;
        car.brakeMat.emissiveIntensity = wantYield || frac > 0.88 ? 4.2 : 1.5;
        car.headlightMat.emissiveIntensity = THREE.MathUtils.lerp(1.4, 3.8, lampFactor);

        // If a departing guest stayed behind or just finished, tuck cleanly away
        car.guestRig.group.visible = false;
        car.guestNearDoor = false;
      } else {
        // Stopped under Porte-Cochère Bay: blink hazards, brake lights bright, execute VIP Drop-Off & Pick-Up!
        const stopT = car.cycleTime - DRIVE_DURATION; // 0 .. 9.0s
        shuttleRoute.getPointAt(uStop, _carPt);
        car.root.position.set(_carPt.x, 0.06, _carPt.z);
        car.root.rotation.y = car.stopYaw;

        const blink = Math.sin(elapsed * 8.0) > 0 ? 3.8 : 0.15;
        car.hazardMat.emissiveIntensity = blink;
        car.brakeMat.emissiveIntensity = 4.2;
        car.headlightMat.emissiveIntensity = THREE.MathUtils.lerp(1.8, 3.8, lampFactor);

        const guest = car.guestRig;
        if (stopT < 4.5) {
          // PHASE A (0..4.5s): Alighting VIP Guest steps out at Porte-Cochère & walks into Lobby Reception!
          if (stopT < 0.35) {
            guest.group.position.set(_carPt.x - 0.6, 0.06, _carPt.z + 1.35);
            guest.group.rotation.y = 0;
            guest.group.visible = true;
            car.cabinGuestMesh.visible = false;
          } else {
            guest.group.visible = true;
            _guestTarget.set(DOOR_CENTER_X, F1_Y, -72.5);
            const arrived = animateGuestWalk(guest, _guestTarget.x, _guestTarget.z, dt, 3.6);
            if (guest.group.position.z > -88.2) {
              guest.group.position.y = F1_Y;
            } else {
              guest.group.position.y = 0.06;
            }
            if (arrived) {
              guest.group.visible = false;
            }
          }
        } else {
          // PHASE B (4.5..9.0s): Departing VIP Guest walks out of Lobby & boards the waiting Car!
          if (stopT < 4.75) {
            guest.group.position.set(DOOR_CENTER_X + 0.7, F1_Y, -74.0);
            guest.group.visible = true;
            car.cabinGuestMesh.visible = false;
          } else {
            _guestTarget.set(_carPt.x - 0.5, 0.06, _carPt.z + 1.35);
            const boarded = animateGuestWalk(guest, _guestTarget.x, _guestTarget.z, dt, 3.9);
            guest.group.position.y = guest.group.position.z > -88.2 ? F1_Y : 0.06;
            if (boarded || stopT > 8.6) {
              guest.group.visible = false;
              car.cabinGuestMesh.visible = true;
            }
          }
        }

        car.guestNearDoor =
          guest.group.visible &&
          Math.hypot(guest.group.position.x - DOOR_CENTER_X, guest.group.position.z - DOOR_Z) <= 4.8;
        if (car.guestNearDoor) {
          shuttleGuestNearDoor = true;
        }
      }

      // Spin 4 wheels smoothly proportional to linear speed
      const wheelSpin = (speedMps * dt) / 0.32;
      for (let w = 0; w < car.wheels.length; w++) {
        car.wheels[w].rotation.x += wheelSpin;
      }
    }

    let wantOpen = shuttleGuestNearDoor;
    if (!wantOpen && playerPos && playerPos.y < 2.2) {
      if (Math.hypot(playerPos.x - DOOR_CENTER_X, playerPos.z - DOOR_Z) <= 4.8) {
        wantOpen = true;
      }
    }
    if (!wantOpen && npcController?.hasNpcNearDoor()) {
      wantOpen = true;
    }

    doorProg += ((wantOpen ? 1 : 0) - doorProg) * Math.min(1, dt * 6.5);
    const slide = doorProg * 2.15;
    doorLeafL.position.x = doorClosedL - slide;
    doorLeafR.position.x = doorClosedR + slide;

    // Step Dual Working Casa Riva Luxury Elevators
    for (let i = 0; i < internalElevators.length; i++) {
      const e = internalElevators[i];
      const playerFlY = e.currentFloor === 1 ? F1_Y : F2_Y;
      const playerInsideCab =
        playerPos !== undefined &&
        playerPos.x >= e.api.cabMinX &&
        playerPos.x <= e.api.cabMaxX &&
        playerPos.z >= e.api.cabMinZ &&
        playerPos.z <= e.api.cabMaxZ &&
        Math.abs(playerPos.y - e.currentY) < 1.3;
      const playerAtDoorCurrent =
        playerPos !== undefined &&
        Math.hypot(playerPos.x - e.x, playerPos.z - (ELEV_DOOR_Z - 1.15)) < 2.35 &&
        Math.abs(playerPos.y - playerFlY) < 1.3;
      const playerAtDoorAny =
        playerPos !== undefined &&
        Math.hypot(playerPos.x - e.x, playerPos.z - (ELEV_DOOR_Z - 1.15)) < 2.35 &&
        playerPos.y >= -0.2 &&
        playerPos.y <= F2_Y + 1.5;

      if (e.state === 'idle') {
        if (e.queue.length > 0) {
          const next = e.queue[0];
          if (next === e.currentFloor) {
            e.queue.shift();
            e.state = 'door_opening';
          } else {
            e.targetFloor = e.queue.shift()!;
            e.state = 'moving';
          }
        } else if (playerAtDoorCurrent && e.doorOpen < 0.05) {
          e.state = 'door_opening';
        } else if (playerAtDoorAny && playerPos) {
          const callFl = playerPos.y >= 2.2 ? 2 : 1;
          if (callFl !== e.currentFloor) {
            e.targetFloor = callFl;
            e.state = 'moving';
          }
        }
      } else if (e.state === 'door_opening') {
        e.doorOpen = Math.min(1, e.doorOpen + dt * 1.45);
        if (e.doorOpen >= 1) {
          e.state = 'boarding';
          e.timer = 2.6;
        }
      } else if (e.state === 'boarding') {
        if (playerAtDoorCurrent) {
          e.timer = Math.max(e.timer, 0.85);
        }
        e.timer -= dt;
        if (e.timer <= 0) {
          e.state = 'door_closing';
        }
      } else if (e.state === 'door_closing') {
        if (playerAtDoorCurrent && !playerInsideCab && e.queue.length === 0) {
          e.state = 'door_opening';
        } else {
          e.doorOpen = Math.max(0, e.doorOpen - dt * 1.45);
          if (e.doorOpen <= 0) {
            if (e.queue.length > 0) {
              const next = e.queue.shift()!;
              if (next === e.currentFloor) {
                e.state = 'door_opening';
              } else {
                e.targetFloor = next;
                e.state = 'moving';
              }
            } else {
              e.state = 'idle';
            }
          }
        }
      } else if (e.state === 'moving') {
        const destY = e.targetFloor === 1 ? F1_Y : F2_Y;
        const diff = destY - e.currentY;
        const step = 2.55 * dt;
        if (Math.abs(diff) <= step) {
          e.currentY = destY;
          e.currentFloor = e.targetFloor;
          e.state = 'door_opening';
        } else {
          e.currentY += Math.sign(diff) * step;
          e.currentFloor = e.currentY >= F1_Y + CASA_RIVA_FLOOR_H * 0.5 ? 2 : 1;
        }
      }

      e.cabinGroup.position.y = e.currentY;
      const cabSlide = e.doorOpen * 0.96;
      e.cabDoorL.position.x = -0.53 - cabSlide;
      e.cabDoorR.position.x = 0.53 + cabSlide;

      for (let fl = 0; fl < e.landingDoors.length; fl++) {
        const flBaseY = fl === 0 ? F1_Y : F2_Y;
        const isAligned = Math.abs(e.currentY - flBaseY) < 0.08;
        const slideD = isAligned ? e.doorOpen * 1.02 : 0;
        e.landingDoors[fl].left.position.x = e.x - 0.565 - slideD;
        e.landingDoors[fl].right.position.x = e.x + 0.565 + slideD;
      }

      const dir: -1 | 0 | 1 =
        e.state === 'moving' ? (e.targetFloor > e.currentFloor ? 1 : -1) : 0;
      for (let fl = 0; fl < e.displays.length; fl++) {
        e.displays[fl].draw(e.currentFloor, dir);
      }
    }
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    elevators: internalElevators.map((e) => e.api),
    update,
  };
}

// =========================================================================
// CASA RIVA HOTEL STAFF, VALET DOORMAN & GUEST NPC CONTROLLER
// =========================================================================

interface CasaRivaActor {
  id: number;
  kind: 'staff' | 'guest';
  root: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: 'idle' | 'walk';
  targetPos: THREE.Vector3;
  stateTimer: number;
  walkPhase: number;
  speed: number;
  glbHandle: GlbHumanHandle;
}

const CASA_RIVA_STROLL_SPOTS = [
  // Floor 1 Spots (0..5)
  { x: 277.2, y: CASA_RIVA_PODIUM_Y, z: -82.5, yaw: 0.4 },
  { x: 290.8, y: CASA_RIVA_PODIUM_Y, z: -82.5, yaw: -0.4 },
  { x: 284.0, y: CASA_RIVA_PODIUM_Y, z: -72.0, yaw: 0.0 },
  { x: 298.8, y: CASA_RIVA_PODIUM_Y, z: -74.5, yaw: Math.PI * 0.5 },
  { x: 275.5, y: CASA_RIVA_PODIUM_Y, z: -90.2, yaw: Math.PI },
  { x: 293.0, y: CASA_RIVA_PODIUM_Y, z: -90.2, yaw: -Math.PI * 0.7 },
  // Floor 2 Solid Deck Spots (6..8) — safely on North Bridge, East Gallery & South Piano Promenade!
  { x: 281.0, y: CASA_RIVA_PODIUM_Y + CASA_RIVA_FLOOR_H, z: -84.0, yaw: Math.PI },
  { x: 288.5, y: CASA_RIVA_PODIUM_Y + CASA_RIVA_FLOOR_H, z: -84.0, yaw: Math.PI },
  { x: 284.0, y: CASA_RIVA_PODIUM_Y + CASA_RIVA_FLOOR_H, z: -61.8, yaw: 0.0 },
];

interface CasaRivaElevatorRider {
  root: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  elevIdx: 0 | 1;
  currentFloor: 1 | 2;
  targetFloor: 1 | 2;
  phase: 'to_wait' | 'waiting_door' | 'boarding' | 'riding' | 'exiting' | 'roam_floor';
  slotOffsetX: number;
  slotOffsetZ: number;
  f1Targets: Array<{ x: number; z: number }>;
  f2Targets: Array<{ x: number; z: number }>;
  roamIdx: number;
  roamTimer: number;
  walkPhase: number;
  speed: number;
  glbHandle: GlbHumanHandle;
}

export class CasaRivaNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: CasaRivaActor[] = [];
  private readonly riders: CasaRivaElevatorRider[] = [];
  private elevators: HospitalElevatorApi[] = [];

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const specs = [
      // Valet Doorman standing beside Porte-Cochère Red-Carpet Entry
      { shirt: 0x7c2d12, pants: 0x0f172a, hair: 0x18181b, skin: '#f5c7a3', kind: 'staff' as const, x: 280.4, y: CASA_RIVA_PODIUM_Y, z: -90.2, yaw: Math.PI, staticStaff: true },
      // Lobby Receptionists behind Marble Desk
      { shirt: 0x1c1917, pants: 0x1e293b, hair: 0x2c1a10, skin: '#fde2cc', kind: 'staff' as const, x: 282.8, y: CASA_RIVA_PODIUM_Y, z: -67.0, yaw: Math.PI, staticStaff: true },
      { shirt: 0x1c1917, pants: 0x1e293b, hair: 0x18181b, skin: '#f5c7a3', kind: 'staff' as const, x: 285.2, y: CASA_RIVA_PODIUM_Y, z: -67.0, yaw: Math.PI, staticStaff: true },
      // Barista at Espresso Welcome Bar
      { shirt: 0x0f172a, pants: 0x18181b, hair: 0x1c1917, skin: '#fbe0c8', kind: 'staff' as const, x: 303.6, y: CASA_RIVA_PODIUM_Y, z: -73.0, yaw: -Math.PI / 2, staticStaff: true },
      // Floor 2 Sky Bartender behind F2 Onyx Bar
      { shirt: 0x0f172a, pants: 0x18181b, hair: 0x1c1917, skin: '#f5c7a3', kind: 'staff' as const, x: 302.5, y: CASA_RIVA_PODIUM_Y + CASA_RIVA_FLOOR_H, z: -71.2, yaw: Math.PI, staticStaff: true },
      // Hotel Guests strolling Lobby, Arrival Apron & Floor 2 Sky Bridge
      { shirt: 0xf8fafc, pants: 0x334155, hair: 0x18181b, skin: '#fde2cc', kind: 'guest' as const, x: 277.2, y: CASA_RIVA_PODIUM_Y, z: -82.5, yaw: 0.4, staticStaff: false },
      { shirt: 0xd97706, pants: 0x1e293b, hair: 0x3b2314, skin: '#f5c7a3', kind: 'guest' as const, x: 290.8, y: CASA_RIVA_PODIUM_Y, z: -82.5, yaw: -0.4, staticStaff: false },
      { shirt: 0x0f766e, pants: 0x0f172a, hair: 0x111827, skin: '#e8b48e', kind: 'guest' as const, x: 275.5, y: CASA_RIVA_PODIUM_Y, z: -90.2, yaw: Math.PI, staticStaff: false },
      { shirt: 0xbe123c, pants: 0x1e293b, hair: 0x271911, skin: '#fde2cc', kind: 'guest' as const, x: 281.0, y: CASA_RIVA_PODIUM_Y + CASA_RIVA_FLOOR_H, z: -84.0, yaw: Math.PI, staticStaff: false },
      { shirt: 0x1d4ed8, pants: 0x0f172a, hair: 0x18181b, skin: '#f5c7a3', kind: 'guest' as const, x: 284.0, y: CASA_RIVA_PODIUM_Y + CASA_RIVA_FLOOR_H, z: -61.8, yaw: 0.0, staticStaff: false },
    ];

    specs.forEach((cfg, idx) => {
      const built = this.buildActorMesh(helpers, cfg);
      built.root.position.set(cfg.x, cfg.y, cfg.z);
      built.root.rotation.y = cfg.yaw;
      this.rootGroup.add(built.root);

      const spec =
        cfg.kind === 'staff'
          ? idx === 1 || idx === 2
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(idx * 3 + 1)
          : pickOutsideNpcModel(idx * 5 + 2);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: built.root,
        fallbackMeshes: [built.fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Idle',
        phaseOffset: idx * 0.9,
      });

      this.actors.push({
        id: idx,
        kind: cfg.kind,
        root: built.root,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        homePos: new THREE.Vector3(cfg.x, cfg.y, cfg.z),
        homeYaw: cfg.yaw,
        phase: 'idle',
        targetPos: new THREE.Vector3(cfg.x, cfg.y, cfg.z),
        stateTimer: cfg.staticStaff ? 9999 : 2.0 + idx * 1.1,
        walkPhase: idx * 0.8,
        speed: 1.18,
        glbHandle,
      });
    });

    // Live Elevator-Riding Hotel Guests & Concierge Attendants riding between F1 & F2!
    const riderConfigs: Array<{
      shirt: number;
      pants: number;
      hair: number;
      skin: string;
      elevIdx: 0 | 1;
      startFloor: 1 | 2;
      slotOffsetX: number;
      slotOffsetZ: number;
      f1Targets: Array<{ x: number; z: number }>;
      f2Targets: Array<{ x: number; z: number }>;
    }> = [
      {
        // VIP Navy Blazer Guest using West Elevator (0)
        shirt: 0x1e3a8a,
        pants: 0xf1f5f9,
        hair: 0x18181b,
        skin: '#f5c7a3',
        elevIdx: 0,
        startFloor: 1,
        slotOffsetX: -0.34,
        slotOffsetZ: -55.4,
        f1Targets: [
          { x: 277.2, z: -60.5 },
          { x: 277.2, z: -72.0 },
          { x: 281.0, z: -71.5 },
          { x: 277.2, z: -60.5 },
        ],
        f2Targets: [
          { x: 277.2, z: -60.5 },
          { x: 271.5, z: -60.5 },
          { x: 271.5, z: -76.5 },
          { x: 277.2, z: -60.5 },
        ],
      },
      {
        // Concierge Bellhop Attendant in Burgundy Jacket using East Elevator (1)
        shirt: 0x881337,
        pants: 0x0f172a,
        hair: 0x271911,
        skin: '#fde2cc',
        elevIdx: 1,
        startFloor: 2,
        slotOffsetX: 0.34,
        slotOffsetZ: -55.4,
        f1Targets: [
          { x: 291.2, z: -60.5 },
          { x: 291.2, z: -73.0 },
          { x: 297.2, z: -73.5 },
          { x: 291.2, z: -60.5 },
        ],
        f2Targets: [
          { x: 291.2, z: -60.5 },
          { x: 296.5, z: -61.5 },
          { x: 297.5, z: -74.5 },
          { x: 291.2, z: -60.5 },
        ],
      },
      {
        // Emerald Resort Lady Guest using West Elevator (0)
        shirt: 0x059669,
        pants: 0x1e293b,
        hair: 0x3b2314,
        skin: '#fbe0c8',
        elevIdx: 0,
        startFloor: 2,
        slotOffsetX: 0.34,
        slotOffsetZ: -55.9,
        f1Targets: [
          { x: 276.8, z: -60.5 },
          { x: 276.8, z: -82.0 },
          { x: 284.0, z: -82.0 },
          { x: 276.8, z: -60.5 },
        ],
        f2Targets: [
          { x: 276.8, z: -60.5 },
          { x: 271.2, z: -60.5 },
          { x: 271.2, z: -83.8 },
          { x: 276.8, z: -60.5 },
        ],
      },
      {
        // Amber Jacket Lounge Guest using East Elevator (1)
        shirt: 0xb45309,
        pants: 0x1c1917,
        hair: 0x111827,
        skin: '#e8b48e',
        elevIdx: 1,
        startFloor: 1,
        slotOffsetX: -0.34,
        slotOffsetZ: -55.9,
        f1Targets: [
          { x: 291.5, z: -60.5 },
          { x: 291.5, z: -82.0 },
          { x: 286.5, z: -82.0 },
          { x: 291.5, z: -60.5 },
        ],
        f2Targets: [
          { x: 291.5, z: -60.5 },
          { x: 298.0, z: -61.5 },
          { x: 300.5, z: -67.5 },
          { x: 291.5, z: -60.5 },
        ],
      },
    ];

    riderConfigs.forEach((rc, idx) => {
      const built = this.buildActorMesh(helpers, { ...rc, kind: 'guest' });
      const elevX = rc.elevIdx === 0 ? 281.4 : 286.6;
      const flY = rc.startFloor === 1 ? CASA_RIVA_PODIUM_Y : CASA_RIVA_PODIUM_Y + CASA_RIVA_FLOOR_H;
      built.root.position.set(elevX + rc.slotOffsetX, flY, -60.2 - idx * 0.3);
      built.root.rotation.y = 0;
      this.rootGroup.add(built.root);

      const spec = idx === 1 ? pickStationaryCivilianModel(11) : pickOutsideNpcModel(idx * 7 + 4);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: built.root,
        fallbackMeshes: [built.fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Walk',
        phaseOffset: idx * 1.1,
      });

      this.riders.push({
        root: built.root,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        elevIdx: rc.elevIdx,
        currentFloor: rc.startFloor,
        targetFloor: rc.startFloor === 1 ? 2 : 1,
        phase: 'to_wait',
        slotOffsetX: rc.slotOffsetX,
        slotOffsetZ: rc.slotOffsetZ,
        f1Targets: rc.f1Targets,
        f2Targets: rc.f2Targets,
        roamIdx: 0,
        roamTimer: 5.5,
        walkPhase: idx * 1.1,
        speed: 1.28,
        glbHandle,
      });
    });
  }

  public bindElevators(elevators: HospitalElevatorApi[]) {
    this.elevators = elevators;
  }

  private buildActorMesh(
    helpers: HospitalCharacterHelpers,
    cfg: { shirt: number; pants: number; hair: number; skin: string; kind: 'staff' | 'guest' }
  ) {
    const root = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    root.add(fallbackGroup);
    const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: 0.72 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: cfg.shirt, roughness: 0.62 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 0.82 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), shirtMat);
    torso.position.y = 1.04;
    fallbackGroup.add(torso);

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

    return { root, fallbackGroup, leftArm, rightArm, leftLeg, rightLeg };
  }

  public hasNpcNearDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const p = this.actors[i].root.position;
      if (p.y < 2.2 && Math.hypot(p.x - DOOR_CENTER_X, p.z - DOOR_Z) < 3.8) return true;
    }
    return false;
  }

  private animateWalkLimbs(
    actor: {
      leftArm: THREE.Object3D;
      rightArm: THREE.Object3D;
      leftLeg: THREE.Object3D;
      rightLeg: THREE.Object3D;
      walkPhase: number;
      glbHandle: GlbHumanHandle;
    },
    dt: number,
    moving: boolean,
    speed: number
  ) {
    actor.glbHandle.setAnimState(moving ? 'Walk' : 'Idle');
    if (moving) {
      actor.walkPhase += dt * speed * 5.0;
      const sw = Math.sin(actor.walkPhase) * 0.40;
      actor.leftLeg.rotation.x = sw;
      actor.rightLeg.rotation.x = -sw;
      actor.leftArm.rotation.x = -sw * 0.55;
      actor.rightArm.rotation.x = sw * 0.55;
    } else {
      actor.leftLeg.rotation.x *= 0.85;
      actor.rightLeg.rotation.x *= 0.85;
      actor.leftArm.rotation.x *= 0.85;
      actor.rightArm.rotation.x *= 0.85;
    }
  }

  public update(delta: number, rawHour: number) {
    const dt = Math.min(delta, 0.1);
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (a.kind === 'staff') {
        a.rightArm.rotation.x = -0.12 + Math.sin(rawHour * 4 + i) * 0.05;
        continue;
      }

      a.stateTimer -= dt;
      if (a.phase === 'idle') {
        this.animateWalkLimbs(a, dt, false, 0);
        if (a.stateTimer <= 0) {
          const isF2 = a.homePos.y > 2.2;
          if (isF2) {
            const spot = CASA_RIVA_STROLL_SPOTS[6 + ((a.id + Math.floor(rawHour * 2)) % 3)];
            a.targetPos.set(spot.x, spot.y, spot.z);
          } else {
            const spot = CASA_RIVA_STROLL_SPOTS[(a.id + Math.floor(rawHour * 3)) % 6];
            a.targetPos.set(spot.x, spot.y, spot.z);
          }
          a.phase = 'walk';
          a.stateTimer = 8.5;
        }
      } else {
        const dx = a.targetPos.x - a.root.position.x;
        const dz = a.targetPos.z - a.root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.25 || a.stateTimer <= 0) {
          a.phase = 'idle';
          a.stateTimer = 4.2 + (a.id % 3) * 1.4;
        } else {
          const step = Math.min(dist, a.speed * dt);
          a.root.position.x += (dx / dist) * step;
          a.root.position.z += (dz / dist) * step;
          const yaw = Math.atan2(dx, dz);
          let diff = yaw - a.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.root.rotation.y += diff * Math.min(1, dt * 7);
          this.animateWalkLimbs(a, dt, true, a.speed);
        }
      }
    }

    // Update Live Casa Riva Elevator-Riding NPCs
    if (this.elevators.length === 0) return;
    for (let i = 0; i < this.riders.length; i++) {
      const r = this.riders[i];
      const elev = this.elevators[r.elevIdx];
      if (!elev) continue;

      const floorY = r.currentFloor === 1 ? CASA_RIVA_PODIUM_Y : CASA_RIVA_PODIUM_Y + CASA_RIVA_FLOOR_H;
      const waitX = elev.x + r.slotOffsetX;
      const waitZ = -58.6;

      if (r.phase === 'to_wait') {
        const dx = waitX - r.root.position.x;
        const dz = waitZ - r.root.position.z;
        const dist = Math.hypot(dx, dz);
        r.root.position.y = floorY;
        if (dist < 0.18) {
          r.phase = 'waiting_door';
          elev.callToFloor(r.currentFloor);
        } else {
          const step = Math.min(dist, r.speed * dt);
          r.root.position.x += (dx / dist) * step;
          r.root.position.z += (dz / dist) * step;
          r.root.rotation.y = Math.atan2(dx, dz);
        }
        this.animateWalkLimbs(r, dt, dist >= 0.18, r.speed);
      } else if (r.phase === 'waiting_door') {
        r.root.position.y = floorY;
        r.root.rotation.y = 0; // Face South (+Z) toward elevator door!
        this.animateWalkLimbs(r, dt, false, 0);
        if (elev.currentFloor === r.currentFloor && elev.doorOpen > 0.70) {
          r.phase = 'boarding';
        } else if (elev.state === 'idle' && elev.currentFloor !== r.currentFloor) {
          elev.callToFloor(r.currentFloor);
        } else if (elev.state === 'idle' && elev.currentFloor === r.currentFloor) {
          elev.callToFloor(r.currentFloor);
        }
      } else if (r.phase === 'boarding') {
        const cabX = elev.x + r.slotOffsetX;
        const cabZ = r.slotOffsetZ;
        const dx = cabX - r.root.position.x;
        const dz = cabZ - r.root.position.z;
        const dist = Math.hypot(dx, dz);
        r.root.position.y = elev.currentY;
        if (dist < 0.18) {
          r.phase = 'riding';
          r.targetFloor = r.currentFloor === 1 ? 2 : 1;
          elev.requestFloor(r.targetFloor);
        } else {
          const step = Math.min(dist, r.speed * dt);
          r.root.position.x += (dx / dist) * step;
          r.root.position.z += (dz / dist) * step;
          r.root.rotation.y = Math.atan2(dx, dz);
        }
        this.animateWalkLimbs(r, dt, dist >= 0.18, r.speed);
      } else if (r.phase === 'riding') {
        r.root.position.y = elev.currentY;
        r.root.rotation.y = Math.PI; // Face North (-Z) toward elevator doors!
        this.animateWalkLimbs(r, dt, false, 0);
        if (elev.currentFloor === r.targetFloor && elev.doorOpen > 0.70) {
          r.currentFloor = r.targetFloor;
          r.phase = 'exiting';
        } else if (elev.state === 'idle' && elev.currentFloor !== r.targetFloor) {
          elev.requestFloor(r.targetFloor);
        }
      } else if (r.phase === 'exiting') {
        const exitX = elev.x + r.slotOffsetX;
        const exitZ = -59.6;
        const dx = exitX - r.root.position.x;
        const dz = exitZ - r.root.position.z;
        const dist = Math.hypot(dx, dz);
        r.root.position.y = floorY;
        if (dist < 0.20) {
          r.phase = 'roam_floor';
          r.roamTimer = 7.0 + (i % 3) * 1.5;
          r.roamIdx = 0;
        } else {
          const step = Math.min(dist, r.speed * dt);
          r.root.position.x += (dx / dist) * step;
          r.root.position.z += (dz / dist) * step;
          r.root.rotation.y = Math.atan2(dx, dz);
        }
        this.animateWalkLimbs(r, dt, dist >= 0.20, r.speed);
      } else if (r.phase === 'roam_floor') {
        r.root.position.y = floorY;
        const targets = r.currentFloor === 1 ? r.f1Targets : r.f2Targets;
        const t = targets[r.roamIdx];
        const dx = t.x - r.root.position.x;
        const dz = t.z - r.root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.22) {
          r.roamIdx = (r.roamIdx + 1) % targets.length;
        } else {
          const step = Math.min(dist, r.speed * dt);
          r.root.position.x += (dx / dist) * step;
          r.root.position.z += (dz / dist) * step;
          r.root.rotation.y = Math.atan2(dx, dz);
        }
        this.animateWalkLimbs(r, dt, dist >= 0.22, r.speed);
        r.roamTimer -= dt;
        if (r.roamTimer <= 0 && r.roamIdx === 0) {
          r.phase = 'to_wait';
        }
      }
    }
  }
}
