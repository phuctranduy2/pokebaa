import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import { buildCityCarMesh } from './CityVehicleMeshBuilder';

export const PERI_POOL_FLOOR_H = 4.20;

export interface PeriPoolArenaBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  update: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
}

// Positioned East of Hà Nội Phố — Lẩu Cua Đồng, facing North (-Z) onto the East-West Boulevard
const PERI_ORIGIN_X = 253.5;
const PERI_ORIGIN_Z = 57.5;

// Building World Footprint: X = 236.5 .. 270.5 (34m wide), Z = 48.0 .. 67.0 (19m deep)
// Forecourt Tile Plaza:     X = 235.5 .. 271.5, Z = 42.2 .. 48.0
// Stairwell World Bounds:   X = 265.1 .. 269.1, Z = 58.9 .. 66.1 (North mouth Z = 58.9)
export const PERI_POOL_ARENA_COLLIDERS: IntersectionColliderBox[] = [
  // Exterior Property East & West Flank Bounds (front Z = 42.2 opens straight from Boulevard sidewalk!)
  { minX: 235.1, maxX: 235.9, minZ: 42.2, maxZ: 67.4, floor: 1 }, // West Alley Barrier next to Hà Nội Phố / Hotel
  { minX: 271.1, maxX: 272.0, minZ: 42.2, maxZ: 67.4, floor: 1 }, // East Property Barrier

  // Forecourt Parked White Sports Sedan (Visual Left: lx = +13.2, lz = -12.6 => X = 266.7, Z = 44.9)
  { minX: 264.2, maxX: 269.2, minZ: 43.5, maxZ: 46.3, floor: 1 },

  // Floor 1 Perimeter Walls (North Facade keeps Center Sliding Door Opening X = 252.60 .. 254.40 open!)
  { minX: 236.3, maxX: 252.60, minZ: 47.65, maxZ: 48.35, floor: 1 }, // North West Curtain Wall & Left Fixed Sidelight
  { minX: 254.40, maxX: 270.7, minZ: 47.65, maxZ: 48.35, floor: 1 }, // North East Curtain Wall & Right Fixed Sidelight
  { minX: 236.3, maxX: 236.9, minZ: 47.8, maxZ: 67.2, floor: 1 }, // West Wall
  { minX: 270.1, maxX: 270.7, minZ: 47.8, maxZ: 67.2, floor: 1 }, // East Wall
  { minX: 236.3, maxX: 270.7, minZ: 66.4, maxZ: 67.2, floor: 1 }, // South Rear Wall

  // Floor 1 Pro Reception Desk, Cue Shop Counter & Pool Tables (6 Tables)
  { minX: 249.6, maxX: 257.4, minZ: 51.8, maxZ: 53.0, floor: 1 }, // Center Lobby Reception / Cue Check-In Island
  // West Wing Floor 1 Pool Tables (3 tournament tables)
  { minX: 238.9, maxX: 242.7, minZ: 51.0, maxZ: 53.6, floor: 1 },
  { minX: 238.9, maxX: 242.7, minZ: 57.6, maxZ: 60.2, floor: 1 },
  { minX: 244.7, maxX: 248.5, minZ: 55.6, maxZ: 58.2, floor: 1 },
  // East Wing Floor 1 Pool Tables (3 tournament tables, clear of Stairwell at X = 265.1..269.1, Z = 58.9..66.1)
  { minX: 258.5, maxX: 262.3, minZ: 51.0, maxZ: 53.6, floor: 1 },
  { minX: 258.5, maxX: 262.3, minZ: 57.6, maxZ: 60.2, floor: 1 },
  { minX: 264.6, maxX: 268.4, minZ: 51.6, maxZ: 54.2, floor: 1 },
  // Pro Cue Display Racks & Bar Lounge along South Wall
  { minX: 241.0, maxX: 251.0, minZ: 64.6, maxZ: 66.3, floor: 1 },
  { minX: 254.0, maxX: 263.0, minZ: 64.6, maxZ: 66.3, floor: 1 },

  // Floor 1 Stairwell Enclosure (West flight X = 265.1..267.0 open; East under-flight blocked)
  { minX: 264.95, maxX: 265.18, minZ: 58.9, maxZ: 66.2, floor: 1 },
  { minX: 267.05, maxX: 269.25, minZ: 58.9, maxZ: 66.2, floor: 1 },
  { minX: 265.0, maxX: 269.25, minZ: 65.95, maxZ: 66.25, floor: 1 },

  // Floor 2 Perimeter Glass Walls & Stairwell Guardrails
  { minX: 236.3, maxX: 270.7, minZ: 47.7, maxZ: 48.3, floor: 2 },
  { minX: 236.3, maxX: 236.9, minZ: 47.8, maxZ: 67.2, floor: 2 },
  { minX: 270.1, maxX: 270.7, minZ: 47.8, maxZ: 67.2, floor: 2 },
  { minX: 236.3, maxX: 270.7, minZ: 66.4, maxZ: 67.2, floor: 2 },
  { minX: 264.95, maxX: 265.18, minZ: 58.9, maxZ: 66.2, floor: 2 }, // Stairwell West Balustrade
  { minX: 267.02, maxX: 267.18, minZ: 59.0, maxZ: 64.0, floor: 2 }, // Center Divider
  { minX: 265.0, maxX: 269.25, minZ: 65.95, maxZ: 66.25, floor: 2 }, // Stairwell South Wall
  { minX: 265.0, maxX: 267.12, minZ: 58.78, maxZ: 59.10, floor: 2 }, // Floor 2 West Pit Guard

  // Floor 2 VIP Tournament Arena Tables & Spectator Lounge
  { minX: 239.2, maxX: 243.4, minZ: 51.2, maxZ: 54.0, floor: 2 },
  { minX: 239.2, maxX: 243.4, minZ: 58.2, maxZ: 61.0, floor: 2 },
  { minX: 248.4, maxX: 252.6, minZ: 52.8, maxZ: 55.6, floor: 2 },
  { minX: 256.8, maxX: 261.0, minZ: 52.2, maxZ: 55.0, floor: 2 },
  { minX: 246.5, maxX: 256.5, minZ: 63.6, maxZ: 65.8, floor: 2 }, // VIP Spectator Sofa Row
];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function createChannelSignTex(text: string, sub = '', fontSize = 82): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1b202b';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(254, 240, 138, 0.92)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#fef9c3';
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(text, w * 0.5, sub ? h * 0.42 : h * 0.52);

  if (sub) {
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#facc15';
    ctx.font = '800 32px system-ui, sans-serif';
    ctx.fillText(sub, w * 0.5, h * 0.80);
  }
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPeriShieldCrestTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, s, s);

  const pt = (x: number, y: number): [number, number] => [x * s, y * s];

  // 1. Dark Outer Shield Silhouette
  ctx.beginPath();
  ctx.moveTo(...pt(0.18, 0.14));
  ctx.quadraticCurveTo(...pt(0.52, 0.06), ...pt(0.88, 0.14));
  ctx.lineTo(...pt(0.84, 0.62));
  ctx.lineTo(...pt(0.19, 0.62));
  ctx.closePath();
  ctx.fillStyle = '#17171b';
  ctx.fill();

  // Inner Crisp White Shield Field
  ctx.beginPath();
  ctx.moveTo(...pt(0.22, 0.175));
  ctx.quadraticCurveTo(...pt(0.52, 0.105), ...pt(0.835, 0.175));
  ctx.lineTo(...pt(0.805, 0.59));
  ctx.lineTo(...pt(0.225, 0.59));
  ctx.closePath();
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  // 2. Honey Badger Back & Cream Dorsal Mane
  ctx.beginPath();
  ctx.moveTo(...pt(0.22, 0.29));
  ctx.bezierCurveTo(...pt(0.28, 0.12), ...pt(0.68, 0.10), ...pt(0.79, 0.34));
  ctx.bezierCurveTo(...pt(0.84, 0.45), ...pt(0.83, 0.54), ...pt(0.82, 0.60));
  ctx.lineTo(...pt(0.71, 0.60));
  ctx.bezierCurveTo(...pt(0.72, 0.45), ...pt(0.66, 0.27), ...pt(0.47, 0.25));
  ctx.bezierCurveTo(...pt(0.36, 0.24), ...pt(0.28, 0.29), ...pt(0.22, 0.29));
  ctx.closePath();
  ctx.fillStyle = '#fae6c8';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#111114';
  ctx.stroke();

  // Subtle Warm Shading along Mane Outer Edge
  ctx.beginPath();
  ctx.moveTo(...pt(0.55, 0.17));
  ctx.bezierCurveTo(...pt(0.74, 0.21), ...pt(0.81, 0.39), ...pt(0.80, 0.59));
  ctx.lineTo(...pt(0.74, 0.59));
  ctx.bezierCurveTo(...pt(0.75, 0.42), ...pt(0.68, 0.24), ...pt(0.51, 0.21));
  ctx.closePath();
  ctx.fillStyle = '#edd0a6';
  ctx.fill();

  // 3. Extended Left Attacking Paw + 3 Cream Claws (Bursting Past Shield Border)
  ctx.beginPath();
  ctx.moveTo(...pt(0.11, 0.34));
  ctx.quadraticCurveTo(...pt(0.16, 0.25), ...pt(0.29, 0.29));
  ctx.lineTo(...pt(0.27, 0.39));
  ctx.quadraticCurveTo(...pt(0.16, 0.39), ...pt(0.11, 0.34));
  ctx.closePath();
  ctx.fillStyle = '#1e1f24';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#111114';
  ctx.stroke();

  const drawClaw = (x0: number, y0: number, x1: number, y1: number, cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(...pt(x0, y0));
    ctx.quadraticCurveTo(...pt(cx, cy), ...pt(x1, y1));
    ctx.quadraticCurveTo(...pt(cx + 0.02, cy + 0.04), ...pt(x0 + 0.04, y0 + 0.03));
    ctx.closePath();
    ctx.fillStyle = '#faebd2';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#111114';
    ctx.stroke();
  };
  drawClaw(0.17, 0.29, 0.075, 0.325, 0.11, 0.28);
  drawClaw(0.18, 0.32, 0.085, 0.355, 0.12, 0.31);
  drawClaw(0.19, 0.345, 0.105, 0.375, 0.14, 0.34);

  // 4. Muscular Dark Badger Body, Arm & Roaring Head
  ctx.beginPath();
  ctx.moveTo(...pt(0.73, 0.60));
  ctx.bezierCurveTo(...pt(0.75, 0.42), ...pt(0.64, 0.25), ...pt(0.46, 0.24));
  ctx.bezierCurveTo(...pt(0.35, 0.24), ...pt(0.27, 0.28), ...pt(0.21, 0.34));
  ctx.lineTo(...pt(0.155, 0.405)); // Snout top
  ctx.quadraticCurveTo(...pt(0.15, 0.44), ...pt(0.19, 0.455)); // Nose under
  ctx.lineTo(...pt(0.28, 0.445)); // Upper lip
  ctx.lineTo(...pt(0.28, 0.51)); // Open jaw corner
  ctx.quadraticCurveTo(...pt(0.29, 0.56), ...pt(0.35, 0.55)); // Lower jaw
  ctx.lineTo(...pt(0.39, 0.51));
  ctx.lineTo(...pt(0.39, 0.60));
  ctx.closePath();
  ctx.fillStyle = '#1f2025';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#111114';
  ctx.stroke();

  // Muscle Fur Highlights
  ctx.beginPath();
  ctx.moveTo(...pt(0.46, 0.43));
  ctx.quadraticCurveTo(...pt(0.58, 0.36), ...pt(0.67, 0.47));
  ctx.quadraticCurveTo(...pt(0.59, 0.45), ...pt(0.48, 0.49));
  ctx.closePath();
  ctx.fillStyle = '#33363f';
  ctx.fill();

  // Small Ear + Glossy Nose + Open Roaring Mouth + Fangs
  ctx.beginPath();
  ctx.ellipse(s * 0.47, s * 0.265, 13, 8, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = '#09090b';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(s * 0.175, s * 0.42, 14, 9, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = '#09090b';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(...pt(0.23, 0.45));
  ctx.lineTo(...pt(0.34, 0.445));
  ctx.lineTo(...pt(0.35, 0.535));
  ctx.quadraticCurveTo(...pt(0.28, 0.545), ...pt(0.25, 0.49));
  ctx.closePath();
  ctx.fillStyle = '#3f3f46';
  ctx.fill();

  // Upper & Lower Fangs
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(...pt(0.225, 0.45));
  ctx.lineTo(...pt(0.242, 0.488));
  ctx.lineTo(...pt(0.256, 0.45));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(...pt(0.268, 0.53));
  ctx.lineTo(...pt(0.282, 0.495));
  ctx.lineTo(...pt(0.296, 0.53));
  ctx.closePath();
  ctx.fill();

  // Fierce Glowing Yellow Eye
  ctx.beginPath();
  ctx.moveTo(...pt(0.30, 0.345));
  ctx.quadraticCurveTo(...pt(0.34, 0.31), ...pt(0.38, 0.33));
  ctx.quadraticCurveTo(...pt(0.34, 0.36), ...pt(0.30, 0.345));
  ctx.closePath();
  ctx.fillStyle = '#facc15';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#09090b';
  ctx.stroke();

  // 5. Foreground Muscular Paw + 4 Cream Claws Gripping Center
  ctx.beginPath();
  ctx.ellipse(s * 0.51, s * 0.525, 62, 34, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#24262c';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#111114';
  ctx.stroke();

  drawClaw(0.47, 0.485, 0.385, 0.51, 0.42, 0.475);
  drawClaw(0.49, 0.515, 0.395, 0.545, 0.435, 0.505);
  drawClaw(0.51, 0.545, 0.415, 0.575, 0.455, 0.535);
  drawClaw(0.535, 0.568, 0.45, 0.595, 0.485, 0.562);

  // 6. Matte Black Bottom Ribbon Banner & Shield Point
  ctx.beginPath();
  ctx.moveTo(...pt(0.20, 0.585));
  ctx.lineTo(...pt(0.84, 0.585));
  ctx.lineTo(...pt(0.84, 0.81));
  ctx.quadraticCurveTo(...pt(0.77, 0.775), ...pt(0.70, 0.785));
  ctx.lineTo(...pt(0.70, 0.825));
  ctx.lineTo(...pt(0.52, 0.875));
  ctx.lineTo(...pt(0.34, 0.825));
  ctx.lineTo(...pt(0.34, 0.785));
  ctx.quadraticCurveTo(...pt(0.27, 0.775), ...pt(0.20, 0.81));
  ctx.closePath();
  ctx.fillStyle = '#17171b';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#09090b';
  ctx.stroke();

  // 7. Bold Golden Typography ("PERI POOL ARENA / DA NANG")
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5b70a';
  ctx.font = '900 39px "Arial Narrow", system-ui, sans-serif';
  ctx.fillText('PERI POOL ARENA', s * 0.52, s * 0.665);

  ctx.font = '900 37px "Arial Narrow", system-ui, sans-serif';
  ctx.fillText('DA NANG', s * 0.52, s * 0.768);

  // Tapered Gold Accent Spear Dashes Flanking "DA NANG"
  ctx.fillStyle = '#f5b70a';
  ctx.beginPath();
  ctx.moveTo(...pt(0.31, 0.77));
  ctx.lineTo(...pt(0.38, 0.758));
  ctx.lineTo(...pt(0.38, 0.776));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(...pt(0.73, 0.77));
  ctx.lineTo(...pt(0.66, 0.758));
  ctx.lineTo(...pt(0.66, 0.776));
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPeriMidLogoTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);

  // Subtle gold double-arc swoosh around PERI
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, 195, 78, -0.14, 0.2, Math.PI - 0.15);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(250, 204, 21, 0.9)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fef08a';
  ctx.font = 'italic 900 92px system-ui, sans-serif';
  ctx.fillText('PERI', w * 0.5, h * 0.46);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSponsorStripTex(side: 'left' | 'right'): THREE.CanvasTexture {
  const w = 1024;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1b202b';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (side === 'left') {
    // Visual Left Wing (Image 2 left): TKON | John Parris | aramith | 3
    ctx.fillStyle = '#fde047';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.fillText('TKON', 140, 82);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'italic 800 42px Georgia, serif';
    ctx.fillText('John Parris', 410, 82);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '800 40px system-ui, sans-serif';
    ctx.fillText('● aramith', 690, 82);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    roundRect(ctx, 880, 38, 84, 84, 12);
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = '900 44px Georgia, serif';
    ctx.fillText('3', 922, 82);
  } else {
    // Visual Right Wing (Image 2 right): ANDY | Gold Shield | NOWi
    ctx.fillStyle = '#fde047';
    ctx.font = '900 48px system-ui, sans-serif';
    ctx.fillText('ANDY', 175, 82);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 5;
    roundRect(ctx, 450, 36, 92, 88, 18);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.font = '900 42px Georgia, serif';
    ctx.fillText('★', 496, 82);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'italic 900 46px system-ui, sans-serif';
    ctx.fillText('⚡ NOWi', 805, 82);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createVoronoiCrystalTex(variant: 'upper' | 'pillar'): THREE.CanvasTexture {
  const w = variant === 'upper' ? 512 : 192;
  const h = variant === 'upper' ? 512 : 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1e4278');
  bg.addColorStop(0.45, '#2b589c');
  bg.addColorStop(1, '#102447');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Luminous diagonal sky/crystal sheen highlights across facets
  ctx.fillStyle = 'rgba(186, 230, 253, 0.28)';
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.04);
  ctx.lineTo(w * 0.56, h * 0.22);
  ctx.lineTo(w * 0.36, h * 0.68);
  ctx.lineTo(w * 0.04, h * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(125, 211, 252, 0.22)';
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * 0.25);
  ctx.lineTo(w * 0.94, h * 0.10);
  ctx.lineTo(w * 0.88, h * 0.72);
  ctx.lineTo(w * 0.44, h * 0.55);
  ctx.closePath();
  ctx.fill();

  // Clean silver-cyan faceted Voronoi wireframe ribs (NO black inner cutout rectangles!)
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = variant === 'upper' ? 6 : 4;
  if (variant === 'upper') {
    const nodes: Array<[number, number]> = [
      [0, 0],
      [175, 0],
      [340, 0],
      [512, 0],
      [42, 165],
      [195, 132],
      [355, 148],
      [475, 180],
      [20, 350],
      [150, 310],
      [370, 305],
      [496, 355],
      [0, 512],
      [165, 512],
      [348, 512],
      [512, 512],
    ];
    const edges: Array<[number, number]> = [
      [0, 4], [4, 1], [1, 5], [5, 2], [2, 6], [6, 3], [3, 7],
      [4, 5], [5, 6], [6, 7],
      [4, 8], [4, 9], [5, 9], [6, 10], [7, 10], [7, 11],
      [8, 9], [9, 10], [10, 11],
      [8, 12], [9, 12], [9, 13], [10, 14], [10, 15], [11, 15],
      [12, 13], [13, 14], [14, 15],
    ];
    edges.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(nodes[a][0], nodes[a][1]);
      ctx.lineTo(nodes[b][0], nodes[b][1]);
      ctx.stroke();
    });
  } else {
    const pts: Array<[number, number]> = [
      [0, 0], [192, 0], [44, 82], [150, 96], [24, 178], [164, 192], [0, 256], [192, 256],
    ];
    const segs: Array<[number, number]> = [
      [0, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5], [4, 6], [5, 6], [5, 7],
    ];
    segs.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(pts[a][0], pts[a][1]);
      ctx.lineTo(pts[b][0], pts[b][1]);
      ctx.stroke();
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createForecourtPaverTex(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, s, s);
  const tones = ['#d1d5db', '#cbd5e1', '#e2e8f0', '#bfc7d1'];
  const cell = s / 4;
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      ctx.fillStyle = tones[(gx * 3 + gy) % tones.length];
      ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createArenaTerrazzoTex(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3b4254';
  ctx.fillRect(0, 0, s, s);
  const cell = s / 2;
  for (let gx = 0; gx < 2; gx++) {
    for (let gy = 0; gy < 2; gy++) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#475569' : '#334155';
      ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createPeriPoolArenaStructure(): PeriPoolArenaBuildResult {
  const staticGroup = new THREE.Group();
  staticGroup.position.set(PERI_ORIGIN_X, 0, PERI_ORIGIN_Z);

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const floorH = PERI_POOL_FLOOR_H; // 4.20m

  // Brightened Sleek Charcoal-Slate Arena Architecture Palette
  const obsidianCladMat = new THREE.MeshStandardMaterial({
    color: 0x222633,
    emissive: 0x1e293b,
    emissiveIntensity: 0.28,
    roughness: 0.44,
    metalness: 0.24,
  });
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0x1e293b,
    emissiveIntensity: 0.34,
    roughness: 0.55,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.34, metalness: 0.62 });
  const silverFrameMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0x64748b,
    emissiveIntensity: 0.28,
    roughness: 0.20,
    metalness: 0.80,
  });
  const brassAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x854d0e,
    emissiveIntensity: 0.24,
    roughness: 0.26,
    metalness: 0.85,
  });
  const walnutWoodMat = new THREE.MeshStandardMaterial({ color: 0x6e3e22, roughness: 0.48 });
  const tourBlueClothMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0369a1,
    emissiveIntensity: 0.22,
    roughness: 0.82,
  });
  const emeraldClothMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x047857,
    emissiveIntensity: 0.22,
    roughness: 0.82,
  });
  const leatherSofaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.62 });
  const redBallMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 });
  const yellowBallMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
  const cueBallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.16 });
  const black8BallMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2 });

  // Crystal-Clear Transparent Architectural Glass ("kính trong" — zero milky emissive haze!)
  const curtainGlassMat = new THREE.MeshStandardMaterial({
    color: 0xf0f9ff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.06,
    metalness: 0.15,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const glassRailMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const frostedStripeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.12,
    roughness: 0.25,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const ledStripWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.95,
    roughness: 0.15,
  });
  const warmCoveLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde047,
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });
  const vortexPinkMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xd946ef,
    emissiveIntensity: 1.85,
    roughness: 0.18,
  });
  const vortexCyanMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.75,
    roughness: 0.18,
  });
  const sensorGreenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.5,
  });
  neonMats.push(ledStripWhiteMat, warmCoveLedMat, vortexPinkMat, vortexCyanMat);

  // Sparkling Pearl-White European Sports Sedan
  const darkTintGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.45,
    roughness: 0.08,
    transparent: true,
    opacity: 0.82,
  });

  const paverMat = new THREE.MeshStandardMaterial({
    map: createForecourtPaverTex(),
    emissive: 0x334155,
    emissiveIntensity: 0.22,
    roughness: 0.78,
  });
  const floorTerrazzoMat = new THREE.MeshStandardMaterial({
    map: createArenaTerrazzoTex(),
    emissive: 0x1e293b,
    emissiveIntensity: 0.30,
    roughness: 0.34,
    metalness: 0.14,
  });

  // Illuminated Signage (Right-to-Left corrected for North-facing camera view!)
  const periRoofTex = createChannelSignTex('PERI POOL ARENA', '', 74);
  const periRoofMat = new THREE.MeshStandardMaterial({
    map: periRoofTex,
    emissive: 0xffffff,
    emissiveMap: periRoofTex,
    emissiveIntensity: 1.20,
    roughness: 0.25,
  });
  const tkonRoofTex = createChannelSignTex('TKON', '', 116);
  const tkonRoofMat = new THREE.MeshStandardMaterial({
    map: tkonRoofTex,
    emissive: 0xffffff,
    emissiveMap: tkonRoofTex,
    emissiveIntensity: 1.20,
    roughness: 0.25,
  });
  const periBadgeTex = createPeriMidLogoTex();
  const periBadgeMat = new THREE.MeshStandardMaterial({
    map: periBadgeTex,
    emissive: 0xffffff,
    emissiveMap: periBadgeTex,
    emissiveIntensity: 1.15,
    transparent: true,
    roughness: 0.22,
  });
  const crestTex = createPeriShieldCrestTex();
  const crestMat = new THREE.MeshStandardMaterial({
    map: crestTex,
    emissive: 0xffffff,
    emissiveMap: crestTex,
    emissiveIntensity: 0.72,
    transparent: true,
    alphaTest: 0.05,
    roughness: 0.26,
  });
  const voronoiUpperTex = createVoronoiCrystalTex('upper');
  const voronoiUpperMat = new THREE.MeshStandardMaterial({
    map: voronoiUpperTex,
    emissive: 0x60a5fa,
    emissiveMap: voronoiUpperTex,
    emissiveIntensity: 0.56,
    metalness: 0.42,
    roughness: 0.16,
  });
  const voronoiPillarTex = createVoronoiCrystalTex('pillar');
  const voronoiPillarMat = new THREE.MeshStandardMaterial({
    map: voronoiPillarTex,
    emissive: 0x60a5fa,
    emissiveMap: voronoiPillarTex,
    emissiveIntensity: 0.56,
    metalness: 0.42,
    roughness: 0.16,
  });
  const leftSponsorTex = createSponsorStripTex('left');
  const leftSponsorMat = new THREE.MeshStandardMaterial({
    map: leftSponsorTex,
    emissive: 0xffffff,
    emissiveMap: leftSponsorTex,
    emissiveIntensity: 1.05,
    roughness: 0.26,
  });
  const rightSponsorTex = createSponsorStripTex('right');
  const rightSponsorMat = new THREE.MeshStandardMaterial({
    map: rightSponsorTex,
    emissive: 0xffffff,
    emissiveMap: rightSponsorTex,
    emissiveIntensity: 1.05,
    roughness: 0.26,
  });
  neonMats.push(periRoofMat, tkonRoofMat, periBadgeMat, leftSponsorMat, rightSponsorMat);

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    staticGroup.add(m);
    return m;
  };

  // =========================================================================
  // 1. FORECOURT PAVER PLAZA & PARKED PEARL-WHITE SPORTS SEDAN (VISUAL LEFT!)
  // =========================================================================
  // Start cleanly at lz = -15.0 (Z = 42.50) flush with the East Boulevard sidewalk edge to avoid Y=0 z-fighting!
  addBox(-18.0, 18.0, -0.25, 0.0, -15.0, -9.5, paverMat);
  // Welcome walkway strip into Portal (ends cleanly at threshold sill lz = -9.85)
  addBox(-2.2, 2.2, 0.002, 0.014, -15.0, -9.85, obsidianCladMat);
  addBox(-2.25, -2.18, 0.004, 0.022, -15.0, -9.85, warmCoveLedMat);
  addBox(2.18, 2.25, 0.004, 0.022, -15.0, -9.85, warmCoveLedMat);

  // Parked Pearl-White Sports Coupe on Visual Left Forecourt (`lx=+13.2, lz=-12.6`, facing West/front-left!)
  {
    const builtCar = buildCityCarMesh({
      color: 0xf8fafc,
      variant: 'coupe',
      headlightIntensity: 1.1,
      brakeIntensity: 0.55,
      noMerge: false,
    });
    builtCar.group.position.set(13.2, 0, -12.6);
    builtCar.group.rotation.y = Math.PI * 1.44;
    staticGroup.add(builtCar.group);
  }

  // =========================================================================
  // 2. ARENA SHELL, FLOORS 1 & 2, SWITCHBACK STAIRCASE & ROOFTOP SIGNAGE
  // =========================================================================
  const totalH = floorH * 2; // 8.40m

  const f1Slab = new THREE.Mesh(new THREE.PlaneGeometry(34.0, 19.0), floorTerrazzoMat);
  f1Slab.rotation.x = -Math.PI / 2;
  f1Slab.position.set(0, 0.015, 0);
  staticGroup.add(f1Slab);

  // Floor 2 Slab segments around stairwell cutout (`lx=+11.6..+15.6, lz=+1.4..+8.6`)
  addBox(-17.0, 11.6, floorH - 0.26, floorH - 0.02, -9.5, 9.5, obsidianCladMat);
  addBox(-17.0, 11.6, floorH - 0.02, floorH + 0.01, -9.5, 9.5, floorTerrazzoMat);
  addBox(11.6, 17.0, floorH - 0.26, floorH - 0.02, -9.5, 1.4, obsidianCladMat);
  addBox(11.6, 17.0, floorH - 0.02, floorH + 0.01, -9.5, 1.4, floorTerrazzoMat);
  addBox(15.6, 17.0, floorH - 0.26, floorH - 0.02, 1.4, 9.5, obsidianCladMat);
  addBox(15.6, 17.0, floorH - 0.02, floorH + 0.01, 1.4, 9.5, floorTerrazzoMat);
  addBox(11.6, 15.6, floorH - 0.26, floorH - 0.02, 8.6, 9.5, obsidianCladMat);
  addBox(11.6, 15.6, floorH - 0.02, floorH + 0.01, 8.6, 9.5, floorTerrazzoMat);

  // Side & Rear Walls (lightened architectural interior panels) + Roof Parapet
  addBox(-17.0, -16.4, 0.0, totalH + 2.2, -9.5, 9.5, interiorWallMat);
  addBox(16.4, 17.0, 0.0, totalH + 2.2, -9.5, 9.5, interiorWallMat);
  addBox(-17.0, 17.0, 0.0, totalH + 2.2, 8.9, 9.5, interiorWallMat);
  addBox(-17.0, 17.0, totalH, totalH + 0.35, -9.5, 9.5, obsidianCladMat);
  addBox(-17.0, 17.0, totalH + 0.35, totalH + 2.25, -9.55, -9.05, obsidianCladMat);

  // Bright Warm-Gold Roof Cornice & Under-Fascia Uplight Accent Strips
  addBox(-17.05, 17.05, totalH + 2.20, totalH + 2.28, -9.62, -9.02, silverFrameMat);
  addBox(-17.05, 17.05, 3.85, 4.78, -9.62, -9.05, obsidianCladMat);
  addBox(-17.05, -3.95, 3.83, 3.89, -9.64, -9.45, warmCoveLedMat);
  addBox(3.95, 17.05, 3.83, 3.89, -9.64, -9.45, warmCoveLedMat);

  // Top Rooftop Illuminated Channel Signs:
  // NOTE: Building faces North (-Z), so Viewer's LEFT = +X (+10.3) and Viewer's RIGHT = -X (-10.6)!
  const leftVisualRoofSign = new THREE.Mesh(new THREE.PlaneGeometry(11.8, 1.55), periRoofMat);
  leftVisualRoofSign.rotation.y = Math.PI;
  leftVisualRoofSign.position.set(10.3, totalH + 1.32, -9.58);
  leftVisualRoofSign.userData.noMerge = true;
  staticGroup.add(leftVisualRoofSign);

  const rightVisualRoofSign = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.55), tkonRoofMat);
  rightVisualRoofSign.rotation.y = Math.PI;
  rightVisualRoofSign.position.set(-10.5, totalH + 1.32, -9.58);
  rightVisualRoofSign.userData.noMerge = true;
  staticGroup.add(rightVisualRoofSign);

  // Mid-Fascia Illuminated Sponsor Strips (Visual Left: TKON / John Parris / aramith / 3 | Visual Right: ANDY / ★ / NOWi)
  const sponsorVisualLeft = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 0.88), leftSponsorMat);
  sponsorVisualLeft.rotation.y = Math.PI;
  sponsorVisualLeft.position.set(10.4, 4.31, -9.64);
  sponsorVisualLeft.userData.noMerge = true;
  staticGroup.add(sponsorVisualLeft);

  const sponsorVisualRight = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 0.88), rightSponsorMat);
  sponsorVisualRight.rotation.y = Math.PI;
  sponsorVisualRight.position.set(-10.4, 4.31, -9.64);
  sponsorVisualRight.userData.noMerge = true;
  staticGroup.add(sponsorVisualRight);

  // Modern Steel-and-Glass Switchback Staircase (F1 <-> F2, lx=+11.6..+15.6, lz=+1.4..+8.6)
  addBox(13.52, 15.6, 0.0, 2.45, 1.32, 1.48, obsidianCladMat);
  addBox(11.52, 11.66, 0.0, floorH, 1.4, 8.6, obsidianCladMat);
  {
    const y0 = 0;
    const yMid = floorH * 0.5;
    const stepCount = 11;
    const flightLen = 5.2;
    for (let st = 0; st < stepCount; st++) {
      const sz = 1.4 + (st + 0.5) * (flightLen / stepCount);
      const sy = y0 + ((st + 1) / stepCount) * (floorH * 0.5);
      addBox(11.68, 13.52, sy - 0.14, sy, sz - 0.24, sz + 0.24, silverFrameMat);
    }
    const strLen = Math.hypot(flightLen, floorH * 0.5);
    const strAng = Math.atan2(floorH * 0.5, flightLen);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, strLen), brassAccentMat);
    sw.position.set(12.6, y0 + floorH * 0.25 - 0.14, 4.0);
    sw.rotation.x = -strAng;
    staticGroup.add(sw);

    addBox(11.65, 15.55, yMid - 0.18, yMid, 6.6, 8.6, silverFrameMat);

    for (let st = 0; st < stepCount; st++) {
      const sz = 6.6 - (st + 0.5) * (flightLen / stepCount);
      const sy = yMid + ((st + 1) / stepCount) * (floorH * 0.5);
      addBox(13.68, 15.54, sy - 0.14, sy, sz - 0.24, sz + 0.24, silverFrameMat);
    }
    const se = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, strLen), brassAccentMat);
    se.position.set(14.6, yMid + floorH * 0.25 - 0.14, 4.0);
    se.rotation.x = strAng;
    staticGroup.add(se);

    // Stairwell Glass Balustrades on Floor 2
    addBox(11.55, 11.65, floorH, floorH + 1.0, 1.4, 8.6, glassRailMat);
    addBox(11.53, 11.67, floorH + 1.0, floorH + 1.07, 1.4, 8.6, silverFrameMat);
    addBox(11.55, 13.62, floorH, floorH + 1.0, 1.35, 1.46, glassRailMat);
    addBox(11.53, 13.64, floorH + 1.0, floorH + 1.07, 1.33, 1.48, silverFrameMat);
    addBox(13.56, 13.64, yMid + 0.9, floorH + 1.0, 1.5, 6.5, brassAccentMat);
  }

  // =========================================================================
  // 3. BRIGHT CURTAIN GLASS FACADES & SYMMETRIC VORONOI CRYSTAL PORTAL TOWER
  // =========================================================================
  [
    [-16.4, -3.8],
    [3.8, 16.4],
  ].forEach(([wx0, wx1]) => {
    // Floor 1 Crystal-Clear Curtain Glass
    addBox(wx0, wx1, 0.0, 3.85, -9.50, -9.44, curtainGlassMat);
    addBox(wx0, wx1, 0.0, 0.10, -9.58, -9.36, darkMetalMat);
    addBox(wx0, wx1, 2.75, 2.85, -9.58, -9.36, darkMetalMat);
    addBox(wx0, wx1, 3.75, 3.85, -9.58, -9.36, darkMetalMat);
    for (let mx = wx0; mx <= wx1 + 0.05; mx += 2.1) {
      addBox(mx - 0.07, mx + 0.07, 0.0, 3.85, -9.59, -9.35, darkMetalMat);
    }

    // Floor 2 Crystal-Clear Curtain Glass
    addBox(wx0, wx1, 4.78, 8.40, -9.50, -9.44, curtainGlassMat);
    addBox(wx0, wx1, 4.78, 4.92, -9.58, -9.36, darkMetalMat);
    addBox(wx0, wx1, 8.26, 8.40, -9.58, -9.36, darkMetalMat);
    for (let mx = wx0; mx <= wx1 + 0.05; mx += 3.15) {
      addBox(mx - 0.09, mx + 0.09, 4.78, 8.40, -9.59, -9.35, darkMetalMat);
    }
  });
  addBox(-7.4, -5.6, 4.78, 8.42, -9.60, -9.10, obsidianCladMat);
  addBox(5.6, 7.4, 4.78, 8.42, -9.60, -9.10, obsidianCladMat);

  // CENTER GEOMETRIC CRYSTAL PORTAL TOWER (clean symmetric pediment — zero skewed cone!)
  addBox(-3.95, -1.75, 0.0, 10.65, -9.85, -9.10, obsidianCladMat);
  addBox(1.75, 3.95, 0.0, 10.65, -9.85, -9.10, obsidianCladMat);
  addBox(-3.95, 3.95, 3.45, 10.65, -9.85, -9.10, obsidianCladMat);
  // Crisp tiered symmetrical rooftop crest crown directly aligned with Z-axis
  addBox(-3.2, 3.2, 10.65, 10.95, -9.88, -9.15, obsidianCladMat);
  addBox(-2.0, 2.0, 10.95, 11.22, -9.88, -9.20, obsidianCladMat);
  addBox(-3.25, 3.25, 10.92, 10.98, -9.92, -9.82, silverFrameMat);
  addBox(-2.05, 2.05, 11.19, 11.26, -9.92, -9.82, silverFrameMat);

  // Seamless Voronoi Crystal Overlay (`upper` 7.7x7.2m + 2 clean `pillar` flanks without fake cutouts!)
  const voronoiUpper = new THREE.Mesh(new THREE.PlaneGeometry(7.7, 7.2), voronoiUpperMat);
  voronoiUpper.rotation.y = Math.PI;
  voronoiUpper.position.set(0, 7.05, -9.88);
  voronoiUpper.userData.noMerge = true;
  staticGroup.add(voronoiUpper);

  [-2.86, 2.86].forEach((sx) => {
    const col = new THREE.Mesh(new THREE.PlaneGeometry(2.08, 3.45), voronoiPillarMat);
    col.rotation.y = Math.PI;
    col.position.set(sx, 1.72, -9.88);
    col.userData.noMerge = true;
    staticGroup.add(col);
  });

  // Glowing Silver Edge Ribs framing Center Tower
  addBox(-3.98, -3.88, 0.0, 10.65, -9.94, -9.84, silverFrameMat);
  addBox(3.88, 3.98, 0.0, 10.65, -9.94, -9.84, silverFrameMat);
  addBox(-3.95, 3.95, 10.60, 10.70, -9.94, -9.84, silverFrameMat);

  // Hero Shield Crest (Honey Badger Mascot — PERI POOL ARENA DA NANG) & Luminous Gold PERI Swoosh Emblem
  const shieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 3.25), crestMat);
  shieldMesh.rotation.y = Math.PI;
  shieldMesh.position.set(0, 7.85, -9.94);
  shieldMesh.userData.noMerge = true;
  staticGroup.add(shieldMesh);

  const periCenterSign = new THREE.Mesh(new THREE.PlaneGeometry(2.40, 1.15), periBadgeMat);
  periCenterSign.rotation.y = Math.PI;
  periCenterSign.position.set(0, 4.35, -9.94);
  periCenterSign.userData.noMerge = true;
  staticGroup.add(periCenterSign);

  // AUTOMATIC 4-PANEL CLEAR-GLASS SLIDING DOOR SYSTEM AT CENTER PORTAL (`lx=-1.75..+1.75`)
  const portalHalfSpan = 1.75;
  const doorTopY = 3.45;
  const doorH = 3.22;
  const fixedSideW = 0.88; // Left [-1.75..-0.87] & Right [+0.87..+1.75] fixed crystal-clear sidelights
  const leafW = 0.94; // Combined active doors = 1.88m, cleanly overlapping sidelights with zero gap!

  // Perimeter Jambs, Stainless Threshold Sill & Overhead Anodized Track Header + Green Motion Sensor Pods
  addBox(-1.82, 1.82, doorH, doorTopY + 0.03, -9.90, -9.64, darkMetalMat);
  addBox(-1.84, 1.84, doorTopY - 0.03, doorTopY + 0.03, -9.92, -9.62, silverFrameMat);
  addBox(-1.82, -1.73, 0.0, doorTopY + 0.03, -9.90, -9.64, darkMetalMat);
  addBox(1.73, 1.82, 0.0, doorTopY + 0.03, -9.90, -9.64, darkMetalMat);
  addBox(-1.75, 1.75, 0.0, 0.025, -9.88, -9.66, silverFrameMat);

  [-9.93, -9.61].forEach((sz) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.10, 0.08), darkMetalMat);
    pod.position.set(0, doorTopY - 0.08, sz);
    staticGroup.add(pod);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), sensorGreenMat);
    led.position.set(0, doorTopY - 0.08, sz + (sz < -9.77 ? -0.045 : 0.045));
    staticGroup.add(led);
  });

  // Fixed Clear-Glass Flanking Sidelights (Back rail at `lz=-9.82`)
  [
    [-portalHalfSpan, -portalHalfSpan + fixedSideW],
    [portalHalfSpan - fixedSideW, portalHalfSpan],
  ].forEach(([sx0, sx1]) => {
    addBox(sx0 + 0.04, sx1 - 0.04, 0.08, doorH - 0.06, -9.835, -9.805, curtainGlassMat);
    addBox(sx0, sx1, 0.0, 0.08, -9.85, -9.79, darkMetalMat);
    addBox(sx0, sx1, doorH - 0.06, doorH, -9.85, -9.79, silverFrameMat);
    addBox(sx0, sx0 + 0.055, 0.0, doorH, -9.85, -9.79, darkMetalMat);
    addBox(sx1 - 0.055, sx1, 0.0, doorH, -9.85, -9.79, darkMetalMat);
  });

  const createPeriDoorLeaf = (handleSide: 1 | -1) => {
    const g = new THREE.Group();
    g.userData.noMerge = true;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.08, doorH - 0.16, 0.024), curtainGlassMat);
    pane.position.y = doorH * 0.5 + 0.01;
    g.add(pane);
    const safetyLine = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.10, 0.035, 0.028), frostedStripeMat);
    safetyLine.position.y = 1.44;
    g.add(safetyLine);
    const topR = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.08, 0.055), silverFrameMat);
    topR.position.y = doorH - 0.04;
    g.add(topR);
    const btmR = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.10, 0.055), darkMetalMat);
    btmR.position.y = 0.05;
    g.add(btmR);
    [-leafW * 0.5 + 0.025, leafW * 0.5 - 0.025].forEach((sx) => {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, doorH, 0.055), darkMetalMat);
      st.position.set(sx, doorH * 0.5, 0);
      g.add(st);
    });
    const hX = handleSide * (leafW * 0.5 - 0.13);
    [-0.055, 0.055].forEach((hz) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 1.15, 10), brassAccentMat);
      handle.position.set(hX, 1.35, hz);
      g.add(handle);
    });
    staticGroup.add(g);
    return g;
  };
  const doorClosedX = leafW * 0.5 - 0.005; // 0.465m -> center leaves meet seamlessly & overlap fixed sidelights
  const doorOpenX = portalHalfSpan - leafW * 0.5 - 0.03; // 1.25m -> slides cleanly across sidelights leaving 1.56m walkthrough
  const periDoorL = createPeriDoorLeaf(1);
  periDoorL.position.set(-doorClosedX, 0.01, -9.72);
  const periDoorR = createPeriDoorLeaf(-1);
  periDoorR.position.set(doorClosedX, 0.01, -9.72);

  // Futuristic Swirling Purple-Pink & Cyan Neon Vortex Portal inside Lobby Entrance
  for (let v = 0; v < 4; v++) {
    const archGrp = new THREE.Group();
    archGrp.position.set(0, 1.58, -9.15 + v * 0.52);
    archGrp.rotation.z = v * 0.24;
    const mat = v % 2 === 0 ? vortexPinkMat : vortexCyanMat;
    const size = 2.65 - v * 0.16;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(size, 0.08, 0.08), mat);
    topBar.position.y = size * 0.48;
    archGrp.add(topBar);
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, size, 0.08), mat);
    leftBar.position.x = -size * 0.48;
    archGrp.add(leftBar);
    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, size, 0.08), mat);
    rightBar.position.x = size * 0.48;
    archGrp.add(rightBar);
    staticGroup.add(archGrp);
  }

  // =========================================================================
  // 4. INTERIOR POOL TABLES, BRIGHT LED CHANDELIER STRIPS, CUE SHOP & FLOOR 2
  // =========================================================================
  const buildPoolTable = (lx: number, yBase: number, lz: number, clothMat: THREE.Material) => {
    const tg = new THREE.Group();
    tg.position.set(lx, yBase, lz);

    [-1.1, 1.1].forEach((px) => {
      [-0.55, 0.55].forEach((pz) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.24), obsidianCladMat);
        leg.position.set(px, 0.36, pz);
        tg.add(leg);
      });
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.24, 1.68), darkMetalMat);
    body.position.y = 0.76;
    tg.add(body);
    const felt = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.04, 1.42), clothMat);
    felt.position.y = 0.89;
    tg.add(felt);
    [-1.42, 1.42].forEach((px) => {
      [-0.76, 0.76].forEach((pz) => {
        const pkt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), brassAccentMat);
        pkt.position.set(px, 0.89, pz);
        tg.add(pkt);
      });
    });
    const ballGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const cueBall = new THREE.Mesh(ballGeo, cueBallMat);
    cueBall.position.set(-0.75, 0.94, 0);
    tg.add(cueBall);
    const rackBalls: Array<[number, number, THREE.Material]> = [
      [0.58, 0, yellowBallMat],
      [0.66, -0.05, redBallMat],
      [0.66, 0.05, yellowBallMat],
      [0.74, 0, black8BallMat],
      [0.74, -0.10, redBallMat],
      [0.74, 0.10, yellowBallMat],
    ];
    rackBalls.forEach(([rx, rz, bMat]) => {
      const b = new THREE.Mesh(ballGeo, bMat);
      b.position.set(rx, 0.94, rz);
      tg.add(b);
    });
    const cueStick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 1.45, 8), walnutWoodMat);
    cueStick.rotation.z = Math.PI / 2;
    cueStick.rotation.y = 0.18;
    cueStick.position.set(-0.2, 0.92, 0.42);
    tg.add(cueStick);

    // Glowing Tournament Table Canopy LED Light
    const lampW = 2.4;
    const lampD = 1.05;
    const lampY = 2.62;
    [-0.85, 0.85].forEach((cx) => {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.48, 6), silverFrameMat);
      wire.position.set(cx, 3.38, 0);
      tg.add(wire);
    });
    const barN = new THREE.Mesh(new THREE.BoxGeometry(lampW, 0.08, 0.08), ledStripWhiteMat);
    barN.position.set(0, lampY, -lampD * 0.5);
    tg.add(barN);
    const barS = new THREE.Mesh(new THREE.BoxGeometry(lampW, 0.08, 0.08), ledStripWhiteMat);
    barS.position.set(0, lampY, lampD * 0.5);
    tg.add(barS);
    const barW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, lampD), ledStripWhiteMat);
    barW.position.set(-lampW * 0.5, lampY, 0);
    tg.add(barW);
    const barE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, lampD), ledStripWhiteMat);
    barE.position.set(lampW * 0.5, lampY, 0);
    tg.add(barE);

    staticGroup.add(tg);
  };

  // Floor 1: 6 Pro Tournament Tables + Bright Linear Architectural Ceiling Strips
  buildPoolTable(-12.7, 0, -5.2, tourBlueClothMat);
  buildPoolTable(-12.7, 0, 1.4, emeraldClothMat);
  buildPoolTable(-6.9, 0, -0.6, tourBlueClothMat);
  buildPoolTable(6.9, 0, -5.2, tourBlueClothMat);
  buildPoolTable(6.9, 0, 1.4, emeraldClothMat);
  buildPoolTable(13.0, 0, -4.6, tourBlueClothMat);

  [-11.0, 11.0].forEach((lx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.07, 0.14), ledStripWhiteMat);
    strip.position.set(lx, floorH - 0.34, -7.2);
    staticGroup.add(strip);
  });

  // Floor 1 Center Check-In Counter (`lx=-3.6..+3.6, lz=-5.8..-4.6`)
  addBox(-3.6, 3.6, 0.0, 1.04, -5.8, -4.6, obsidianCladMat);
  addBox(-3.65, 3.65, 1.04, 1.12, -5.85, -4.55, brassAccentMat);
  const receptionSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.72), periBadgeMat);
  receptionSign.rotation.y = Math.PI;
  receptionSign.position.set(0, 0.58, -5.82);
  receptionSign.userData.noMerge = true;
  staticGroup.add(receptionSign);

  // Floor 1 South Wall Pro Cue Display Cabinets & Lounge Counters
  addBox(-12.5, -2.5, 0.0, 1.0, 7.2, 8.8, walnutWoodMat);
  addBox(0.5, 9.5, 0.0, 1.0, 7.2, 8.8, obsidianCladMat);
  for (let cx = -11.5; cx <= -3.5; cx += 0.9) {
    const rackCue = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.028, 1.65, 8), walnutWoodMat);
    rackCue.position.set(cx, 1.95, 8.65);
    staticGroup.add(rackCue);
  }
  const backWallPeriSign = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.35), periRoofMat);
  backWallPeriSign.rotation.y = Math.PI;
  backWallPeriSign.position.set(5.0, 2.45, 8.85);
  backWallPeriSign.userData.noMerge = true;
  staticGroup.add(backWallPeriSign);

  // Floor 2 (`Y = 4.20`): VIP Championship Arena Tables, Spectator Sofas & Criss-Crossing White Ceiling LEDs
  buildPoolTable(-12.2, floorH, -4.9, tourBlueClothMat);
  buildPoolTable(-12.2, floorH, 2.1, emeraldClothMat);
  buildPoolTable(-3.0, floorH, -3.3, tourBlueClothMat);
  buildPoolTable(5.4, floorH, -3.9, emeraldClothMat);

  addBox(-7.0, 3.0, floorH, floorH + 0.52, 6.2, 8.2, leatherSofaMat);
  addBox(-7.0, 3.0, floorH + 0.52, floorH + 1.02, 7.6, 8.2, leatherSofaMat);

  [
    [-12.5, -4.0, 0.42, 8.5],
    [-9.5, -5.5, -0.42, 8.5],
    [-3.0, -4.2, 0.35, 7.2],
    [5.4, -4.2, -0.38, 7.6],
    [11.2, -5.0, 0.44, 7.0],
    [11.0, -6.2, -0.36, 7.8],
  ].forEach(([lx, lz, rotY, len]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.16), ledStripWhiteMat);
    bar.position.set(lx, floorH + 3.92, lz);
    bar.rotation.y = rotY;
    staticGroup.add(bar);
  });

  // =========================================================================
  // 5. BRIGHTENED BUDGET SCALED POINT LIGHTS (2 WIDE-THROW LIGHTS)
  // =========================================================================
  const forecourtLobbyLight = new THREE.PointLight(0xf5d0fe, 2.2, 34, 1.25);
  forecourtLobbyLight.position.set(PERI_ORIGIN_X + 2.0, 3.3, PERI_ORIGIN_Z - 11.5);
  scaledLights.push({
    light: forecourtLobbyLight,
    dayInt: 0.9,
    nightInt: 3.1,
    getScale: () => 1.0,
  });

  const arenaHallLight = new THREE.PointLight(0xe0f2fe, 2.4, 46, 1.2);
  arenaHallLight.position.set(PERI_ORIGIN_X, floorH + 3.0, PERI_ORIGIN_Z - 2.0);
  scaledLights.push({
    light: arenaHallLight,
    dayInt: 1.1,
    nightInt: 3.4,
    getScale: () => 1.0,
  });

  let doorProgress = 0;
  const update = (delta: number, _rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => {
    const dt = Math.min(delta, 0.1);
    const glowScale = 0.92 + lampFactor * 0.58;
    ledStripWhiteMat.emissiveIntensity = 1.65 * glowScale;
    warmCoveLedMat.emissiveIntensity = 1.30 * glowScale;
    vortexPinkMat.emissiveIntensity = 1.65 * glowScale;
    vortexCyanMat.emissiveIntensity = 1.55 * glowScale;

    const isNearPortal = Boolean(
      playerPos &&
        playerPos.y < 2.2 &&
        playerPos.x >= PERI_ORIGIN_X - 3.6 &&
        playerPos.x <= PERI_ORIGIN_X + 3.6 &&
        playerPos.z >= PERI_ORIGIN_Z - 14.9 &&
        playerPos.z <= PERI_ORIGIN_Z - 5.2
    );
    sensorGreenMat.emissiveIntensity = isNearPortal ? 2.4 : 1.1;
    doorProgress = THREE.MathUtils.lerp(doorProgress, isNearPortal ? 1 : 0, Math.min(1, dt * 6.5));
    const offset = THREE.MathUtils.lerp(doorClosedX, doorOpenX, doorProgress);
    periDoorL.position.x = -offset;
    periDoorR.position.x = offset;
  };

  update(0, 12.0, 0);

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    update,
  };
}

// =========================================================================
// PERI POOL ARENA ANIMATED CUEISTS, STAFF & SPECTATORS (14 ACTORS)
// =========================================================================
interface PeriActor {
  root: THREE.Group;
  hipsGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  headMesh: THREE.Mesh;
  role: 'cueist' | 'staff' | 'seated' | 'stroll';
  idleSeed: number;
  walkPhase: number;
  waypoints?: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  glbHandle: GlbHumanHandle;
}

export class PeriPoolNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: PeriActor[] = [];
  private timer = 0;

  constructor(helpers: HospitalCharacterHelpers) {
    const specs: Array<{
      role: PeriActor['role'];
      x: number;
      y: number;
      z: number;
      yaw: number;
      shirt: number;
      pants: number;
      skinHex: string;
      withCue?: boolean;
      waypoints?: Array<[number, number, number]>;
    }> = [
      { role: 'staff', x: 253.5, y: 0, z: 53.5, yaw: Math.PI, shirt: 0x0f172a, pants: 0x18181b, skinHex: '#f1c27d' },
      { role: 'cueist', x: 240.8, y: 0, z: 50.3, yaw: 0.25, shirt: 0x1d4ed8, pants: 0x1e293b, skinHex: '#f5cfa0', withCue: true },
      { role: 'cueist', x: 243.4, y: 0, z: 58.9, yaw: -Math.PI / 2, shirt: 0x18181b, pants: 0x334155, skinHex: '#e0ac69', withCue: true },
      { role: 'cueist', x: 246.6, y: 0, z: 54.9, yaw: 0.1, shirt: 0xdc2626, pants: 0x18181b, skinHex: '#f1c27d', withCue: true },
      { role: 'cueist', x: 260.4, y: 0, z: 50.3, yaw: 0.2, shirt: 0x0f766e, pants: 0x1e293b, skinHex: '#f5cfa0', withCue: true },
      { role: 'cueist', x: 263.1, y: 0, z: 58.9, yaw: -Math.PI / 2, shirt: 0x4f46e5, pants: 0x0f172a, skinHex: '#e0ac69', withCue: true },
      { role: 'cueist', x: 266.5, y: 0, z: 50.8, yaw: -0.2, shirt: 0xf59e0b, pants: 0x18181b, skinHex: '#f1c27d', withCue: true },
      {
        role: 'stroll',
        x: 248.0,
        y: 0,
        z: 61.5,
        yaw: 0,
        shirt: 0x334155,
        pants: 0x0f172a,
        skinHex: '#f5cfa0',
        waypoints: [
          [248.0, 0, 61.5],
          [257.0, 0, 61.5],
          [257.0, 0, 54.6],
          [248.0, 0, 54.6],
        ],
      },
      {
        role: 'stroll',
        x: 266.1,
        y: 0,
        z: 58.5,
        yaw: 0,
        shirt: 0xeab308,
        pants: 0x18181b,
        skinHex: '#f1c27d',
        waypoints: [
          [266.1, 0, 58.5],
          [266.1, 2.1, 64.6],
          [268.1, 2.1, 64.6],
          [268.1, 4.2, 58.5],
          [268.1, 2.1, 64.6],
          [266.1, 2.1, 64.6],
        ],
      },
      { role: 'cueist', x: 241.3, y: PERI_POOL_FLOOR_H, z: 50.5, yaw: 0.15, shirt: 0x18181b, pants: 0x334155, skinHex: '#e0ac69', withCue: true },
      { role: 'cueist', x: 250.5, y: PERI_POOL_FLOOR_H, z: 52.0, yaw: 0.0, shirt: 0x0284c7, pants: 0x0f172a, skinHex: '#f5cfa0', withCue: true },
      { role: 'cueist', x: 258.9, y: PERI_POOL_FLOOR_H, z: 51.4, yaw: -0.1, shirt: 0x991b1b, pants: 0x18181b, skinHex: '#f1c27d', withCue: true },
      { role: 'seated', x: 249.5, y: PERI_POOL_FLOOR_H, z: 64.3, yaw: Math.PI, shirt: 0x64748b, pants: 0x1e293b, skinHex: '#f5cfa0' },
      { role: 'seated', x: 253.5, y: PERI_POOL_FLOOR_H, z: 64.3, yaw: Math.PI, shirt: 0xe11d48, pants: 0x0f172a, skinHex: '#f1c27d' },
    ];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.72 });
    const cueMat = new THREE.MeshStandardMaterial({ color: 0x7c4625, roughness: 0.45 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });

    specs.forEach((sp, idx) => {
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.y = 0.80;
      root.add(hipsGroup);

      const shirtMat = new THREE.MeshStandardMaterial({ color: sp.shirt, roughness: 0.72 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: sp.pants, roughness: 0.78 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.24), shirtMat);
      torso.position.y = 0.28;
      hipsGroup.add(torso);

      const faceTex = helpers.createFaceTexture(idx % 2 === 0 ? 'happy' : 'neutral', sp.skinHex);
      const headMesh = helpers.createHeadMesh(skinMat, faceTex, 0.27, 0.27, 0.27);
      headMesh.position.y = 0.72;
      hipsGroup.add(headMesh);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.10, 0.29), hairMat);
      hair.position.y = 0.86;
      hipsGroup.add(hair);

      const makeArm = (ax: number) => {
        const p = new THREE.Group();
        p.position.set(ax, 0.52, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), shirtMat);
        m.position.y = -0.20;
        p.add(m);
        hipsGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.27);
      const rightArm = makeArm(0.27);

      if (sp.withCue) {
        const cue = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 1.42, 8), cueMat);
        cue.rotation.x = Math.PI * 0.45;
        cue.position.set(0, -0.34, 0.36);
        rightArm.add(cue);
      }

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.64, 0.15), pantsMat);
        leg.position.y = -0.32;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), shoeMat);
        shoe.position.set(0, -0.68, 0.03);
        p.add(shoe);
        hipsGroup.add(p);
        return p;
      };
      const leftLeg = makeLeg(-0.10);
      const rightLeg = makeLeg(0.10);

      if (sp.role === 'seated') {
        hipsGroup.position.y = 0.48;
        leftLeg.rotation.x = -Math.PI / 2;
        rightLeg.rotation.x = -Math.PI / 2;
      }

      root.position.set(sp.x, sp.y, sp.z);
      root.rotation.y = sp.yaw;
      this.rootGroup.add(root);

      const spec =
        sp.role === 'staff'
          ? CASHIER_NPC_MODEL
          : sp.role === 'seated'
          ? pickSeatedCivilianModel(idx * 3 + 2)
          : sp.role === 'stroll'
          ? pickOutsideNpcModel(idx * 3 + 1)
          : pickStationaryCivilianModel(idx * 3 + 2);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: root,
        fallbackMeshes: [hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: sp.role === 'seated' ? 'Sit' : sp.role === 'stroll' ? 'Walk' : 'Idle',
        phaseOffset: idx * 0.85,
      });

      this.actors.push({
        root,
        hipsGroup,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        headMesh,
        role: sp.role,
        idleSeed: idx * 1.43,
        walkPhase: idx * 0.8,
        waypoints: sp.waypoints?.map(([wx, wy, wz]) => new THREE.Vector3(wx, wy, wz)),
        wpIdx: 1,
        speed: 1.2,
        glbHandle,
      });
    });
  }

  public update(delta: number) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (a.role === 'stroll' && a.waypoints && a.waypoints.length >= 2) {
        const target = a.waypoints[a.wpIdx % a.waypoints.length];
        const dx = target.x - a.root.position.x;
        const dy = target.y - a.root.position.y;
        const dz = target.z - a.root.position.z;
        const dist = Math.hypot(dx, dy, dz);
        const step = a.speed * dt;
        if (dist <= step + 0.08) {
          a.root.position.copy(target);
          a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
        } else {
          const r = step / dist;
          a.root.position.x += dx * r;
          a.root.position.y += dy * r;
          a.root.position.z += dz * r;
          const distXZ = Math.hypot(dx, dz);
          if (distXZ > 0.04) {
            const yaw = Math.atan2(dx, dz);
            let diff = yaw - a.root.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            a.root.rotation.y += diff * Math.min(1, dt * 8.0);
          }
        }
        a.walkPhase += dt * 6.4;
        const swing = Math.sin(a.walkPhase) * 0.42;
        a.leftLeg.rotation.x = swing;
        a.rightLeg.rotation.x = -swing;
        a.leftArm.rotation.x = -swing * 0.55;
        a.rightArm.rotation.x = swing * 0.55;
      } else if (a.role === 'cueist') {
        const stroke = Math.sin(this.timer * 2.2 + a.idleSeed);
        a.rightArm.rotation.x = -0.35 + stroke * 0.22;
        a.leftArm.rotation.x = -0.45;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.1 + a.idleSeed) * 0.16;
      } else {
        const sway = Math.sin(this.timer * 1.6 + a.idleSeed);
        a.headMesh.rotation.y = sway * 0.24;
        a.rightArm.rotation.x = -0.2 + sway * 0.14;
      }
    }
  }
}
