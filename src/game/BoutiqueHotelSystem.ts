import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import { buildCityCarMesh } from './CityVehicleMeshBuilder';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';

export const BOUTIQUE_HOTEL_FLOOR_H = 3.85;

export interface BoutiqueHotelBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  update: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
}

// Plot Center in SE District (just South of Hà Nội Phố & East of South Avenue)
const HOTEL_ORIGIN_X = 224.0;
const HOTEL_ORIGIN_Z = 82.0;

// Stairwell World Bounds: X = 229.8 .. 233.8, Z = 71.6 .. 79.4 (NE Interior Wing)
// Floor 1..5 footprint: X = 213.5 .. 234.5, Z = 70.0 .. 94.0
// Courtyard Alley (Next to Hà Nội Phố): Z = 65.5 .. 70.0, X = 207.0 .. 235.0
// West Forecourt & Patisserie Terrace: X = 207.0 .. 213.5, Z = 70.0 .. 96.0
export const BOUTIQUE_HOTEL_COLLIDERS: IntersectionColliderBox[] = [
  // Exterior East & South Plot Property Boundaries (keep exterior plaza bounded cleanly)
  { minX: 234.8, maxX: 235.8, minZ: 65.5, maxZ: 96.6, floor: 1 }, // East Property Hedge/Wall
  { minX: 207.4, maxX: 235.8, minZ: 95.6, maxZ: 96.6, floor: 1 }, // South Property Hedge

  // Courtyard Alley Planter Trellises & Stone Benches (Z = 65.5 .. 70.0; central path open)
  { minX: 215.2, maxX: 221.2, minZ: 65.55, maxZ: 66.35, floor: 1 }, // Trellis Planter West
  { minX: 224.8, maxX: 230.8, minZ: 65.55, maxZ: 66.35, floor: 1 }, // Trellis Planter East
  { minX: 217.5, maxX: 219.5, minZ: 68.5, maxZ: 69.3, floor: 1 }, // Alley Bistro Table West
  { minX: 226.5, maxX: 228.5, minZ: 68.5, maxZ: 69.3, floor: 1 }, // Alley Bistro Table East

  // West Forecourt: Courtesy Limo Sedan, Porte-Cochère Pillars, Outdoor Patisserie Tables & Valet Podium
  { minX: 207.7, maxX: 209.9, minZ: 86.2, maxZ: 91.4, floor: 1 }, // Parked Champagne-Gold Courtesy Limo
  { minX: 210.0, maxX: 210.8, minZ: 78.2, maxZ: 79.0, floor: 1 }, // Porte-Cochère North Column
  { minX: 210.0, maxX: 210.8, minZ: 85.0, maxZ: 85.8, floor: 1 }, // Porte-Cochère South Column
  { minX: 210.8, maxX: 211.7, minZ: 77.3, maxZ: 78.2, floor: 1 }, // Valet Concierge Podium
  { minX: 209.4, maxX: 210.2, minZ: 76.0, maxZ: 76.8, floor: 1 }, // Patisserie A-Frame Standee
  // 3 Outdoor Patisserie Bistro Tables
  { minX: 209.3, maxX: 211.1, minZ: 70.9, maxZ: 72.5, floor: 1 },
  { minX: 209.3, maxX: 211.1, minZ: 73.7, maxZ: 75.3, floor: 1 },
  { minX: 211.5, maxX: 213.1, minZ: 70.6, maxZ: 72.0, floor: 1 },
  // South Forecourt Planter Boxes
  { minX: 210.2, maxX: 212.8, minZ: 92.4, maxZ: 93.8, floor: 1 },

  // Floor 1 Perimeter Walls (West Facade has TWO open portals: Grand Lobby Z=79.8..84.2 & Patisserie Z=72.2..75.2!)
  { minX: 233.9, maxX: 234.6, minZ: 70.0, maxZ: 94.0, floor: 1 }, // East Rear Wall
  { minX: 213.4, maxX: 234.6, minZ: 93.4, maxZ: 94.2, floor: 1 }, // South Rear Wall
  { minX: 213.4, maxX: 234.6, minZ: 69.8, maxZ: 70.6, floor: 1 }, // North Alley Glass Wall
  { minX: 213.3, maxX: 213.9, minZ: 70.0, maxZ: 72.2, floor: 1 }, // West Pier North of Patisserie Door
  { minX: 213.3, maxX: 213.9, minZ: 75.2, maxZ: 79.8, floor: 1 }, // West Patisserie Glass Window
  { minX: 213.3, maxX: 213.9, minZ: 84.2, maxZ: 94.0, floor: 1 }, // West Lobby Glass Window

  // Floor 1 Interior Fixtures: Patisserie Display Counter, Reception Desk, Sofas & Stairwell Enclosure
  { minX: 221.2, maxX: 227.6, minZ: 72.8, maxZ: 74.8, floor: 1 }, // French Patisserie Showcase Counter
  { minX: 221.6, maxX: 227.4, minZ: 70.5, maxZ: 71.7, floor: 1 }, // Espresso & Baking Prep Credenza
  { minX: 217.0, maxX: 218.8, minZ: 76.2, maxZ: 77.8, floor: 1 }, // Indoor Patisserie Table 1
  { minX: 220.4, maxX: 222.2, minZ: 76.2, maxZ: 77.8, floor: 1 }, // Indoor Patisserie Table 2
  { minX: 225.2, maxX: 227.6, minZ: 84.0, maxZ: 89.2, floor: 1 }, // Grand Marble Concierge Reception Desk
  { minX: 225.4, maxX: 226.4, minZ: 81.8, maxZ: 83.0, floor: 1 }, // Brass Luggage Cart
  { minX: 215.2, maxX: 218.2, minZ: 86.2, maxZ: 88.2, floor: 1 }, // Lobby Velvet Sofa Lounge 1
  { minX: 219.4, maxX: 222.4, minZ: 89.6, maxZ: 91.6, floor: 1 }, // Lobby Velvet Sofa Lounge 2
  // Floor 1 Stairwell Enclosure (West flight worldX=229.8..231.7 open; East under-flight blocked)
  { minX: 229.68, maxX: 229.92, minZ: 71.6, maxZ: 79.5, floor: 1 }, // Stairwell West Wall
  { minX: 231.72, maxX: 233.9, minZ: 71.6, maxZ: 79.5, floor: 1 }, // Under East flight enclosure
  { minX: 229.8, maxX: 233.9, minZ: 71.4, maxZ: 71.68, floor: 1 }, // Stairwell North Wall

  // Floor 2: Luxury Wellness Spa & Tea Pavilion
  { minX: 217.5, maxX: 222.5, minZ: 80.2, maxZ: 83.8, floor: 2 }, // Zen Hydro-Pool Lotus Basin
  { minX: 215.2, maxX: 217.6, minZ: 73.0, maxZ: 75.8, floor: 2 }, // Spa Treatment Bed 1
  { minX: 215.2, maxX: 217.6, minZ: 87.2, maxZ: 90.0, floor: 2 }, // Spa Treatment Bed 2
  { minX: 221.2, maxX: 223.8, minZ: 88.6, maxZ: 91.4, floor: 2 }, // Spa Treatment Bed 3
  { minX: 229.2, maxX: 232.6, minZ: 83.5, maxZ: 89.5, floor: 2 }, // Herbal Tea & Towel Credenza

  // Floors 3 & 4: Parisian Boutique Suites
  ...[3, 4].flatMap((fl): IntersectionColliderBox[] => [
    // North Suite: King Bed, Desk & Lounge
    { minX: 216.0, maxX: 218.8, minZ: 72.4, maxZ: 75.4, floor: fl },
    { minX: 222.2, maxX: 225.2, minZ: 72.2, maxZ: 74.2, floor: fl },
    // South Suite: King Bed & Velvet Chaise
    { minX: 216.0, maxX: 218.8, minZ: 87.4, maxZ: 90.4, floor: fl },
    { minX: 223.8, maxX: 227.0, minZ: 89.0, maxZ: 91.6, floor: fl },
    // East Gallery Wardrobe Credenza
    { minX: 232.4, maxX: 233.8, minZ: 82.0, maxZ: 89.0, floor: fl },
  ]),

  // Floor 5: Open-Air Rooftop Infinity Pool & Sky Lounge
  { minX: 214.6, maxX: 221.6, minZ: 72.2, maxZ: 84.0, floor: 5 }, // Infinity Plunge Pool Basin
  { minX: 222.8, maxX: 225.4, minZ: 72.6, maxZ: 75.0, floor: 5 }, // Sun Lounger Set North
  { minX: 222.8, maxX: 225.4, minZ: 77.6, maxZ: 80.0, floor: 5 }, // Sun Lounger Set Mid
  { minX: 224.0, maxX: 229.6, minZ: 86.2, maxZ: 91.2, floor: 5 }, // Rooftop Sky Bar Counter & Stools
  { minX: 215.8, maxX: 219.8, minZ: 87.6, maxZ: 91.0, floor: 5 }, // Rooftop VIP Lounge Sofa

  // Floors 2..5 Shared Perimeter Curtain Walls & Stairwell Guardrails
  ...[2, 3, 4, 5].flatMap((fl): IntersectionColliderBox[] => [
    { minX: 233.9, maxX: 234.6, minZ: 70.0, maxZ: 94.0, floor: fl }, // East Wall / Parapet
    { minX: 213.4, maxX: 234.6, minZ: 93.4, maxZ: 94.2, floor: fl }, // South Wall / Parapet
    { minX: 213.4, maxX: 234.6, minZ: 69.8, maxZ: 70.6, floor: fl }, // North Wall / Parapet
    { minX: 213.3, maxX: 213.9, minZ: 70.0, maxZ: 94.0, floor: fl }, // West Glass / Parapet
    // Stairwell Balustrades (South mouth Z=79.4 stays open)
    { minX: 229.68, maxX: 229.92, minZ: 71.6, maxZ: 79.5, floor: fl }, // West Balustrade
    { minX: 231.72, maxX: 231.88, minZ: 73.8, maxZ: 79.3, floor: fl }, // Center Flight Divider
    { minX: 229.8, maxX: 233.9, minZ: 71.4, maxZ: 71.68, floor: fl }, // North Back Wall
    ...(fl === 5 ? [{ minX: 229.8, maxX: 231.82, minZ: 79.25, maxZ: 79.58, floor: 5 }] : []),
  ]),
];

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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

function createMarbleCheckFloorTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, size, size);

  const cell = size / 2;
  for (let gx = 0; gx < 2; gx++) {
    for (let gy = 0; gy < 2; gy++) {
      const dark = (gx + gy) % 2 === 1;
      ctx.fillStyle = dark ? '#d6c7b2' : '#f8f3eb';
      ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
      ctx.strokeStyle = 'rgba(180, 152, 112, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx * cell + 4, gy * cell + 4, cell - 8, cell - 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHerringboneParquetTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(0, 0, size, size);

  const tones = ['#9c6b45', '#875a38', '#a6764f', '#7c5132'];
  const rows = 4;
  const cols = 2;
  const pw = size / cols;
  const ph = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const off = r % 2 === 0 ? 0 : pw * 0.5;
      ctx.fillStyle = tones[(r * 3 + col) % tones.length];
      ctx.fillRect((col * pw + off) % size, r * ph + 1, pw - 2, ph - 2);
      if (off > 0 && col === 1) ctx.fillRect(0, r * ph + 1, off - 2, ph - 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 7);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCobbleCourtyardTex(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#57534e';
  ctx.fillRect(0, 0, size, size);

  const tones = ['#78716c', '#a8a29e', '#6b6560', '#8b837b'];
  const rows = 6;
  const cols = 4;
  const w = size / cols;
  const h = size / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (w * 0.5);
    for (let col = -1; col <= cols; col++) {
      ctx.fillStyle = tones[(r * 5 + col + 4) % tones.length];
      drawRoundedRect(ctx, col * w + off + 3, r * h + 3, w - 6, h - 6, 7);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createStripedAwningTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const stripes = 8;
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#7f1d1d' : '#fef3c7';
    ctx.fillRect(i * sw, 0, sw, h);
  }
  ctx.fillStyle = '#5c1414';
  ctx.fillRect(0, h - 22, w, 22);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHotelSignTex(title: string, sub: string, darkBg = '#1c120d'): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, darkBg);
  g.addColorStop(0.5, '#3b1518');
  g.addColorStop(1, darkBg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, 10, 10, w - 20, h - 20, 18);
  ctx.stroke();

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 22, 22, w - 44, h - 44, 12);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(253, 224, 71, 0.72)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fef08a';
  ctx.font = 'italic 900 84px Georgia, "Times New Roman", serif';
  ctx.fillText(title, w * 0.5, 106);

  ctx.shadowBlur = 4;
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 30px system-ui, -apple-system, sans-serif';
  ctx.fillText(sub, w * 0.5, 192);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPatisserieMenuTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#291517';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, 8, 8, w - 16, h - 16, 12);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.font = 'italic 900 32px Georgia, serif';
  ctx.fillText("L'Amour", w * 0.5, 48);

  ctx.fillStyle = '#991b1b';
  drawRoundedRect(ctx, 22, 72, w - 44, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 17px system-ui, sans-serif';
  ctx.fillText('BOULANGERIE • SPA', w * 0.5, 95);

  const lines = [
    'Croissant Bơ Pháp ... 55K',
    'Macaron Paris (6v) .. 145K',
    'Bánh Opera Sôcôla ... 95K',
    'Matcha Latte Kemp .... 75K',
    'Spa Thảo Mộc (90p) . 690K',
  ];
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fef3c7';
  ctx.font = '700 15px system-ui, sans-serif';
  lines.forEach((ln, idx) => ctx.fillText(ln, 20, 148 + idx * 36));

  ctx.textAlign = 'center';
  ctx.fillStyle = '#86efac';
  ctx.font = '900 16px system-ui, sans-serif';
  ctx.fillText('HOTEL 24/7 • CHECK-IN', w * 0.5, 348);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createBoutiqueHotelStructure(): BoutiqueHotelBuildResult {
  const staticGroup = new THREE.Group();
  staticGroup.position.set(HOTEL_ORIGIN_X, 0, HOTEL_ORIGIN_Z);

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const floorH = BOUTIQUE_HOTEL_FLOOR_H; // 3.85m
  const wallTopY = floorH * 4; // 15.40m (Floor 5 is Rooftop at Y=15.40)

  // Architectural PBR Palette
  const limestoneMat = new THREE.MeshStandardMaterial({
    color: 0xf4ead8,
    emissive: 0x2f2416,
    emissiveIntensity: 0.14,
    roughness: 0.65,
    metalness: 0.05,
  });
  const warmStoneMat = new THREE.MeshStandardMaterial({
    color: 0xe2d2b7,
    emissive: 0x241a0f,
    emissiveIntensity: 0.12,
    roughness: 0.72,
    metalness: 0.05,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x2c1e16, roughness: 0.36, metalness: 0.45 });
  const brushedBrassMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.24, metalness: 0.86 });
  const mansardSlateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.22 });
  const walnutMat = new THREE.MeshStandardMaterial({ color: 0x4f2c18, roughness: 0.52, metalness: 0.08 });
  const burgundyVelvetMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.78 });
  const creamLinenMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.82 });
  const sageClothMat = new THREE.MeshStandardMaterial({ color: 0x4d7c5b, roughness: 0.78 });
  const travertineMat = new THREE.MeshStandardMaterial({ color: 0xdfd3be, roughness: 0.58 });
  // Crystal-Clear Transparent Architectural Glass ("kính trong" — zero milky blue haze!)
  const clearGlassMat = new THREE.MeshStandardMaterial({
    color: 0xf4faff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.06,
    metalness: 0.15,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const balconyGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe6f4ff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const frostedBandMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.08,
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const sensorGreenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const wroughtIronMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.32, metalness: 0.82 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const roseBloomMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.65 });
  const bougainvilleaMat = new THREE.MeshStandardMaterial({ color: 0xd946ef, roughness: 0.65 });
  const marbleCheckMat = new THREE.MeshStandardMaterial({ map: createMarbleCheckFloorTex(), roughness: 0.32, metalness: 0.08 });
  const parquetMat = new THREE.MeshStandardMaterial({ map: createHerringboneParquetTex(), roughness: 0.52, metalness: 0.06 });
  const cobbleMat = new THREE.MeshStandardMaterial({ map: createCobbleCourtyardTex(), roughness: 0.86 });
  const awningMat = new THREE.MeshStandardMaterial({ map: createStripedAwningTex(), roughness: 0.74 });

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.92, roughness: 0.14 });

  // Pastry & Café colors
  const croissantMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.62 });
  const macaronPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.55 });
  const macaronMintMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.55 });
  const cocoaMat = new THREE.MeshStandardMaterial({ color: 0x3f2312, roughness: 0.5 });

  // Warm Crystal Sconce & Chandelier Glow
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.35,
    roughness: 0.18,
  });
  lanternMats.push(warmGlowMat);

  // Illuminated Signs
  const hotelMarqueeMat = new THREE.MeshStandardMaterial({
    map: createHotelSignTex("L'Amour Hotel", 'BOUTIQUE SUITES  •  PATISSERIE  •  SPA'),
    emissive: 0xffffff,
    emissiveMap: createHotelSignTex("L'Amour Hotel", 'BOUTIQUE SUITES  •  PATISSERIE  •  SPA'),
    emissiveIntensity: 0.92,
    roughness: 0.28,
  });
  const patisserieSignMat = new THREE.MeshStandardMaterial({
    map: createHotelSignTex('La Boulangerie', 'BÁNH NGỌT PHÁP  •  CÀ PHÊ & TRÀ HOA', '#450a0a'),
    emissive: 0xffffff,
    emissiveMap: createHotelSignTex('La Boulangerie', 'BÁNH NGỌT PHÁP  •  CÀ PHÊ & TRÀ HOA', '#450a0a'),
    emissiveIntensity: 0.85,
    roughness: 0.30,
  });
  const standeeMat = new THREE.MeshStandardMaterial({
    map: createPatisserieMenuTex(),
    emissive: 0xffffff,
    emissiveMap: createPatisserieMenuTex(),
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  neonMats.push(hotelMarqueeMat, patisserieSignMat);

  // Shimmering Rooftop Pool Water Material (GLSL wave displacement + PBR turquoise shimmer)
  const waterTimeUniform = { value: 0 };
  const rooftopWaterMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 0.38,
    roughness: 0.08,
    metalness: 0.18,
    transparent: true,
    opacity: 0.84,
  });
  rooftopWaterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterTimeUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.y += sin(position.x * 2.1 + uTime * 2.4) * 0.024 + cos(position.z * 1.9 + uTime * 2.0) * 0.022;`
      );
  };

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

  const addWallSconce = (lx: number, ly: number, lz: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(lx, ly, lz);
    g.rotation.y = rotY;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.30, 0.05), brushedBrassMat);
    g.add(plate);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.22, 8), warmGlowMat);
    lantern.position.set(0, 0.08, 0.10);
    g.add(lantern);
    staticGroup.add(g);
  };

  // =========================================================================
  // 1. FORECOURT PLAZA, COURTYARD ALLEY (NEXT TO HÀ NỘI PHỐ) & PORTE-COCHÈRE
  // =========================================================================
  // Cobblestone Courtyard Alley between Hà Nội Phố (lz=-16.5) and Hotel (lz=-12.0)
  addBox(-17.0, 11.4, -0.25, 0.0, -16.5, -12.0, cobbleMat);
  // West Forecourt & Grand Travertine Approach (lx=-17.0..-10.5, lz=-12.0..+14.4)
  addBox(-17.0, -10.5, -0.25, 0.0, -12.0, 14.4, travertineMat);
  // Grand Burgundy Arrival Carpet leading from Street Curb into Porte-Cochère & Lobby
  addBox(-17.0, -10.3, -0.01, 0.018, -2.0, 2.0, burgundyVelvetMat);

  // Hanging Bistro Globes across the Courtyard Alley (connects Hà Nội Phố wall to Hotel!)
  for (let ax = -13.5; ax <= 9.0; ax += 4.5) {
    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.2, 8), wroughtIronMat);
    poleL.position.set(ax, 2.1, -16.1);
    staticGroup.add(poleL);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 4.1), wroughtIronMat);
    beam.position.set(ax, 4.15, -14.1);
    staticGroup.add(beam);

    [-15.2, -13.9, -12.8].forEach((gz) => {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), warmGlowMat);
      globe.position.set(ax, 3.96, gz);
      staticGroup.add(globe);
    });
  }

  // Bougainvillea Vine Planters adorning Hà Nội Phố's South Cream Wall (turning blank wall into a lush courtyard!)
  [-6.0, 3.8].forEach((tx) => {
    addBox(tx - 2.8, tx + 2.8, 0.0, 0.55, -16.4, -15.7, walnutMat);
    addBox(tx - 2.6, tx + 2.6, 0.55, 3.85, -16.38, -16.25, wroughtIronMat);
    for (let k = -2; k <= 2; k++) {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), foliageMat);
      bush.position.set(tx + k * 1.1, 0.85 + (Math.abs(k) % 2) * 0.45, -16.05);
      staticGroup.add(bush);
      const bloom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), bougainvilleaMat);
      bloom.position.set(tx + k * 1.1 + 0.16, 1.45 + ((k + 2) % 3) * 0.72, -16.05);
      staticGroup.add(bloom);
    }
  });
  // Courtyard Bistro Tables
  [-5.5, 3.5].forEach((bx) => {
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 14), travertineMat);
    tbl.position.set(bx, 0.74, -13.1);
    staticGroup.add(tbl);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 0.72, 10), wroughtIronMat);
    stem.position.set(bx, 0.36, -13.1);
    staticGroup.add(stem);
    [-0.65, 0.65].forEach((cxOff) => {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.18, 0.05, 10), walnutMat);
      seat.position.set(bx + cxOff, 0.44, -13.1);
      staticGroup.add(seat);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.42, 8), wroughtIronMat);
      leg.position.set(bx + cxOff, 0.21, -13.1);
      staticGroup.add(leg);
    });
  });

  // Porte-Cochère Grand Entrance Canopy & Pillars (lx=-14.2..-10.5, lz=-4.0..+4.0)
  addBox(-14.2, -10.5, 3.55, 4.10, -4.0, 4.0, bronzeMat);
  addBox(-14.3, -10.5, 4.08, 4.22, -4.1, 4.1, brushedBrassMat);
  [-3.4, 3.4].forEach((pz) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.45, 0.82), warmStoneMat);
    base.position.set(-13.6, 0.225, pz);
    staticGroup.add(base);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 3.2, 14), limestoneMat);
    col.position.set(-13.6, 2.02, pz);
    staticGroup.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.76), brushedBrassMat);
    cap.position.set(-13.6, 3.52, pz);
    staticGroup.add(cap);
  });
  // Backlit Marquee on West Face of Porte-Cochère
  const fMarquee = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.35), hotelMarqueeMat);
  fMarquee.rotation.y = -Math.PI / 2;
  fMarquee.position.set(-14.32, 4.25, 0);
  fMarquee.userData.noMerge = true;
  staticGroup.add(fMarquee);
  addBox(-14.30, -13.9, 3.55, 4.98, -3.7, 3.7, bronzeMat);

  // Outdoor French Patisserie Awning & 3 Bistro Sets (lx=-15.0..-10.5, lz=-11.6..-4.8)
  const awning = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.16, 6.8), awningMat);
  awning.position.set(-12.3, 3.15, -8.2);
  awning.rotation.z = 0.24;
  staticGroup.add(awning);
  const patSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.92), patisserieSignMat);
  patSign.rotation.y = -Math.PI / 2;
  patSign.position.set(-10.68, 3.85, -8.2);
  patSign.userData.noMerge = true;
  staticGroup.add(patSign);

  [
    [-13.8, -10.3],
    [-13.8, -7.5],
    [-11.7, -10.7],
  ].forEach(([bx, bz]) => {
    const tTop = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.05, 16), travertineMat);
    tTop.position.set(bx, 0.74, bz);
    staticGroup.add(tTop);
    const tStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.24, 0.72, 10), wroughtIronMat);
    tStem.position.set(bx, 0.36, bz);
    staticGroup.add(tStem);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.09, 10), creamLinenMat);
    cup.position.set(bx - 0.12, 0.81, bz + 0.06);
    staticGroup.add(cup);
    const croissant = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.028, 6, 10, Math.PI * 1.1), croissantMat);
    croissant.rotation.x = Math.PI / 2;
    croissant.position.set(bx + 0.12, 0.79, bz - 0.05);
    staticGroup.add(croissant);
    [-0.64, 0.64].forEach((dz) => {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.18, 0.05, 12), burgundyVelvetMat);
      seat.position.set(bx, 0.44, bz + dz);
      staticGroup.add(seat);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.42, 8), wroughtIronMat);
      leg.position.set(bx, 0.21, bz + dz);
      staticGroup.add(leg);
    });
  });

  // Valet Podium & Menu A-Frame Standee
  addBox(-13.1, -12.4, 0.0, 1.15, -4.65, -3.95, walnutMat);
  addBox(-13.15, -12.35, 1.15, 1.20, -4.70, -3.90, brushedBrassMat);
  {
    const sg = new THREE.Group();
    sg.position.set(-14.2, 0, -5.6);
    sg.rotation.y = -Math.PI * 0.4;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.32, 0.10), bronzeMat);
    frame.position.y = 0.68;
    sg.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 1.18), standeeMat);
    face.position.set(0, 0.68, 0.056);
    sg.add(face);
    const back = face.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.056;
    sg.add(back);
    staticGroup.add(sg);
  }

  // Composite Multi-Part Parked Champagne-Gold Hotel Courtesy Limo Sedan (lx=-15.2, lz=+6.8)
  {
    const builtLimo = buildCityCarMesh({
      color: 0xd6b67c,
      variant: 'sedan',
      roofCrestBadge: true,
      headlightIntensity: 0.85,
      brakeIntensity: 0.4,
      noMerge: false,
    });
    builtLimo.group.position.set(-15.2, 0, 6.8);
    builtLimo.group.rotation.y = Math.PI;
    staticGroup.add(builtLimo.group);
  }

  // South Forecourt Planters
  addBox(-13.7, -11.3, 0.0, 0.52, 10.5, 11.7, limestoneMat);
  [-13.0, -12.0].forEach((px) => {
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), foliageMat);
    bush.position.set(px, 0.92, 11.1);
    staticGroup.add(bush);
    const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), roseBloomMat);
    fl.position.set(px, 1.32, 11.1);
    staticGroup.add(fl);
  });

  // =========================================================================
  // 2. SOLID PERIMETER SHELL, FLOOR 1..5 SLABS & SWITCHBACK STAIRCASE
  // =========================================================================
  // Ground Floor Marble Surface
  const f1Floor = new THREE.Mesh(new THREE.PlaneGeometry(21.0, 24.0), marbleCheckMat);
  f1Floor.rotation.x = -Math.PI / 2;
  f1Floor.position.set(0, 0.02, 0);
  staticGroup.add(f1Floor);

  // East & South Full-Height Solid Limestone Walls (up to Floor 5 parapet floor level)
  addBox(9.9, 10.5, 0.0, wallTopY, -12.0, 12.0, limestoneMat);
  addBox(-10.5, 10.5, 0.0, wallTopY, 11.4, 12.0, limestoneMat);

  // Corner Pilasters + Decorative Horizontal Floor Stringcourses
  addBox(-10.65, -9.95, 0.0, wallTopY + 1.15, -12.15, -11.45, warmStoneMat);
  addBox(-10.65, -9.95, 0.0, wallTopY + 1.15, 11.45, 12.15, warmStoneMat);
  addBox(9.95, 10.65, 0.0, wallTopY + 1.15, -12.15, -11.45, warmStoneMat);
  addBox(9.95, 10.65, 0.0, wallTopY + 1.15, 11.45, 12.15, warmStoneMat);

  // Floor Slabs for Floors 2, 3, 4 & Rooftop Deck 5 (cutout at Stairwell lx=+5.8..+9.8, lz=-10.4..-2.6)
  for (let f = 1; f <= 4; f++) {
    const yBase = f * floorH;
    const isRoofDeck = f === 4;
    const topSurfaceMat = isRoofDeck ? travertineMat : parquetMat;

    // West Zone of Slab (lx=-10.5..+5.8)
    addBox(-10.5, 5.8, yBase - 0.24, yBase - 0.02, -12.0, 12.0, limestoneMat);
    addBox(-10.5, 5.8, yBase - 0.02, yBase + 0.01, -12.0, 12.0, topSurfaceMat);
    // East South-of-Stairwell Zone (lx=+5.8..+10.4, lz=-2.6..+12.0)
    addBox(5.8, 10.4, yBase - 0.24, yBase - 0.02, -2.6, 12.0, limestoneMat);
    addBox(5.8, 10.4, yBase - 0.02, yBase + 0.01, -2.6, 12.0, topSurfaceMat);
    // East North-of-Stairwell Lip (lx=+5.8..+10.4, lz=-12.0..-10.4)
    addBox(5.8, 10.4, yBase - 0.24, yBase - 0.02, -12.0, -10.4, limestoneMat);
    addBox(5.8, 10.4, yBase - 0.02, yBase + 0.01, -12.0, -10.4, topSurfaceMat);

    // Classic Horizontal Cornice Belt Course on Facades
    addBox(-10.75, 10.65, yBase - 0.28, yBase + 0.08, -12.22, -11.90, warmStoneMat);
    addBox(-10.75, -10.40, yBase - 0.28, yBase + 0.08, -12.22, 12.22, warmStoneMat);
  }

  // 4 Stacked Double-Flight Switchback Stairs (connecting F1 -> F2 -> F3 -> F4 -> F5 Rooftop!)
  addBox(7.72, 9.85, 0.0, 2.35, -2.72, -2.55, walnutMat); // Floor 1 Under-East partition
  addBox(5.72, 5.86, 0.0, floorH, -10.4, -2.6, limestoneMat); // Floor 1 Stairwell West Wall

  for (let f = 0; f < 4; f++) {
    const y0 = f * floorH;
    const yMid = y0 + floorH * 0.5;
    const stepCount = 11;
    const flightLen = 5.6; // lz = -2.8 .. -8.4

    // West Flight (climbs North lz = -2.8 -> -8.4, y0 -> yMid)
    for (let st = 0; st < stepCount; st++) {
      const sz = -2.8 - (st + 0.5) * (flightLen / stepCount);
      const sy = y0 + ((st + 1) / stepCount) * (floorH * 0.5);
      addBox(5.88, 7.72, sy - 0.14, sy, sz - 0.26, sz + 0.26, travertineMat);
    }
    const strLen = Math.hypot(flightLen, floorH * 0.5);
    const strAng = Math.atan2(floorH * 0.5, flightLen);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, strLen), bronzeMat);
    sw.position.set(6.8, y0 + floorH * 0.25 - 0.14, -5.6);
    sw.rotation.x = strAng;
    staticGroup.add(sw);

    // North Mid-Landing (lx=5.85..9.8, lz=-10.4..-8.4 at yMid)
    addBox(5.85, 9.85, yMid - 0.18, yMid, -10.4, -8.4, travertineMat);

    // East Flight (climbs South lz = -8.4 -> -2.8, yMid -> y0+floorH)
    for (let st = 0; st < stepCount; st++) {
      const sz = -8.4 + (st + 0.5) * (flightLen / stepCount);
      const sy = yMid + ((st + 1) / stepCount) * (floorH * 0.5);
      addBox(7.88, 9.76, sy - 0.14, sy, sz - 0.26, sz + 0.26, travertineMat);
    }
    const se = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, strLen), bronzeMat);
    se.position.set(8.8, yMid + floorH * 0.25 - 0.14, -5.6);
    se.rotation.x = -strAng;
    staticGroup.add(se);

    // Center Brass-and-Wrought-Iron Handrail
    addBox(7.76, 7.84, y0 + 0.88, y0 + floorH + 0.92, -8.4, -8.32, wroughtIronMat);
    addBox(7.76, 7.84, y0, y0 + 0.95, -2.84, -2.76, wroughtIronMat);
    const railW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, strLen), brushedBrassMat);
    railW.position.set(7.76, y0 + floorH * 0.25 + 0.88, -5.6);
    railW.rotation.x = strAng;
    staticGroup.add(railW);
    const railE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, strLen), brushedBrassMat);
    railE.position.set(7.84, yMid + floorH * 0.25 + 0.88, -5.6);
    railE.rotation.x = -strAng;
    staticGroup.add(railE);
  }

  // =========================================================================
  // 3. FLOOR 1: FRENCH PATISSERIE + GRAND HOTEL LOBBY LOUNGE
  // =========================================================================
  // West Facade Storefront (framed Patisserie & Lobby glass bays + TWO Automatic Sliding Glass Doors!)
  addBox(-10.55, -10.15, 0.0, floorH, -12.0, -9.8, limestoneMat); // NW Pier
  addBox(-10.52, -10.18, 3.15, floorH, -9.8, -6.8, bronzeMat); // Patisserie Door Transom
  addBox(-10.55, -10.15, 0.0, 0.65, -6.8, -2.2, limestoneMat); // Patisserie Window Base
  addBox(-10.42, -10.30, 0.65, 3.25, -6.8, -2.2, clearGlassMat); // Patisserie Clear Glass
  addBox(-10.45, -10.26, 0.65, 0.72, -6.8, -2.2, bronzeMat); // Lower sill trim
  addBox(-10.45, -10.26, 2.52, 2.60, -6.8, -2.2, bronzeMat); // Upper French transom bar
  addBox(-10.45, -10.26, 3.19, 3.26, -6.8, -2.2, bronzeMat); // Top sash
  addBox(-10.43, -10.28, 1.42, 1.50, -6.8, -2.2, frostedBandMat); // Etched safety band
  addBox(-10.46, -10.25, 0.65, 3.25, -4.55, -4.45, bronzeMat); // Vertical French mullion
  addBox(-10.55, -10.15, 3.25, floorH, -6.8, -2.2, limestoneMat);

  addBox(-10.52, -10.18, 3.30, floorH, -2.2, 2.2, bronzeMat); // Grand Lobby Portal Header
  addBox(-10.55, -10.15, 0.0, 0.65, 2.2, 12.0, limestoneMat); // Lobby Lounge Window Base
  addBox(-10.42, -10.30, 0.65, 3.25, 2.2, 12.0, clearGlassMat);
  addBox(-10.45, -10.26, 0.65, 0.72, 2.2, 12.0, bronzeMat);
  addBox(-10.45, -10.26, 2.52, 2.60, 2.2, 12.0, bronzeMat);
  addBox(-10.45, -10.26, 3.19, 3.26, 2.2, 12.0, bronzeMat);
  addBox(-10.43, -10.28, 1.42, 1.50, 2.2, 12.0, frostedBandMat);
  addBox(-10.55, -10.15, 3.25, floorH, 2.2, 12.0, limestoneMat);
  [4.6, 6.95, 9.4].forEach((mz) => {
    addBox(-10.46, -10.22, 0.65, 3.25, mz - 0.07, mz + 0.07, bronzeMat);
  });

  // Helper: Luxury Hotel Automatic Double Sliding Glass Door Unit
  const buildAutomaticSlidingDoor = (centerZ: number, totalSpan: number, doorTopY: number) => {
    const halfSpan = totalSpan * 0.5;
    const isGrand = totalSpan > 3.5;
    const leafW = isGrand ? 1.24 : 0.92;
    const doorH = doorTopY - 0.14;
    const fixedSideW = Math.max(0.28, halfSpan - leafW + 0.04);

    // Overhead anodized bronze sensor track + brass trim bar
    addBox(-10.50, -10.20, doorH, doorTopY + 0.02, centerZ - halfSpan, centerZ + halfSpan, bronzeMat);
    addBox(-10.52, -10.18, doorTopY - 0.02, doorTopY + 0.04, centerZ - halfSpan - 0.04, centerZ + halfSpan + 0.04, brushedBrassMat);
    // Exterior & Interior motion sensor pods with green indicator LED
    [-10.53, -10.17].forEach((sx) => {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.44), wroughtIronMat);
      pod.position.set(sx, doorTopY - 0.08, centerZ);
      staticGroup.add(pod);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), sensorGreenMat);
      led.position.set(sx + (sx < -10.35 ? -0.045 : 0.045), doorTopY - 0.08, centerZ);
      staticGroup.add(led);
    });

    // Fixed flanking clear sidelights behind which the active doors pocket cleanly
    [
      [centerZ - halfSpan, centerZ - halfSpan + fixedSideW],
      [centerZ + halfSpan - fixedSideW, centerZ + halfSpan],
    ].forEach(([sz0, sz1]) => {
      addBox(-10.44, -10.38, 0.02, doorH, sz0, sz1, clearGlassMat);
      addBox(-10.46, -10.36, 0.0, 0.10, sz0, sz1, bronzeMat);
      addBox(-10.46, -10.36, 1.42, 1.46, sz0, sz1, frostedBandMat);
      addBox(-10.46, -10.36, 0.0, doorH, sz0, sz0 + 0.06, bronzeMat);
      addBox(-10.46, -10.36, 0.0, doorH, sz1 - 0.06, sz1, bronzeMat);
    });

    const createLeaf = (handleDir: 1 | -1) => {
      const g = new THREE.Group();
      g.userData.noMerge = true;
      // Glass pane
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.026, doorH - 0.14, leafW - 0.10), clearGlassMat);
      glass.position.y = doorH * 0.5;
      g.add(glass);
      // Slim etched boutique safety hairline
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.04, leafW - 0.12), frostedBandMat);
      band.position.y = 1.44;
      g.add(band);
      // Slim bronze top & bottom rails + brushed brass kickplate accent
      const topR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, leafW), bronzeMat);
      topR.position.y = doorH - 0.045;
      g.add(topR);
      const btmR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, leafW), bronzeMat);
      btmR.position.y = 0.06;
      g.add(btmR);
      const kick = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.035, leafW), brushedBrassMat);
      kick.position.y = 0.135;
      g.add(kick);
      // Left & right vertical stiles
      [-leafW * 0.5 + 0.03, leafW * 0.5 - 0.03].forEach((sz) => {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, doorH, 0.06), bronzeMat);
        st.position.set(0, doorH * 0.5, sz);
        g.add(st);
      });
      // Vertical brushed-brass architectural handles (inside + outside)
      const hZ = handleDir * (leafW * 0.5 - 0.14);
      [-0.06, 0.06].forEach((hx) => {
        const hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.05, 10), brushedBrassMat);
        hdl.position.set(hx, 1.32, hZ);
        g.add(hdl);
      });
      staticGroup.add(g);
      return g;
    };

    const closedOffset = leafW * 0.5;
    const openOffset = halfSpan - leafW * 0.5 + 0.04;
    const leftLeaf = createLeaf(1);
    leftLeaf.position.set(-10.31, 0, centerZ - closedOffset);
    const rightLeaf = createLeaf(-1);
    rightLeaf.position.set(-10.31, 0, centerZ + closedOffset);

    return { leftLeaf, rightLeaf, centerZ, closedOffset, openOffset, progress: 0 };
  };

  const mainAutoDoor = buildAutomaticSlidingDoor(0.0, 4.4, 3.30);
  const patisserieAutoDoor = buildAutomaticSlidingDoor(-8.3, 3.0, 3.15);

  // North Courtyard Facade Floor 1 Framed Glass Bays
  addBox(-10.5, 9.9, 0.0, 0.65, -12.05, -11.7, limestoneMat);
  addBox(-10.5, 9.9, 0.65, 3.25, -11.92, -11.82, clearGlassMat);
  addBox(-10.5, 9.9, 0.65, 0.72, -11.96, -11.78, bronzeMat);
  addBox(-10.5, 9.9, 2.52, 2.60, -11.96, -11.78, bronzeMat);
  addBox(-10.5, 9.9, 3.19, 3.26, -11.96, -11.78, bronzeMat);
  addBox(-10.5, 9.9, 1.42, 1.50, -11.94, -11.80, frostedBandMat);
  addBox(-10.5, 9.9, 3.25, floorH, -12.05, -11.7, limestoneMat);
  [-8.0, -5.5, -3.0, -0.5, 2.2, 4.8, 7.4].forEach((mx) =>
    addBox(mx - 0.09, mx + 0.09, 0.0, floorH, -12.06, -11.68, bronzeMat)
  );

  // French Patisserie Illuminated Pastry Display Counter (lx=-2.8..+3.6, lz=-9.2..-7.2)
  addBox(-2.8, 3.6, 0.0, 0.96, -9.2, -7.2, travertineMat);
  addBox(-2.85, 3.65, 0.96, 1.02, -9.25, -7.15, brushedBrassMat);
  const vitrineGlass = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.62, 0.82), clearGlassMat);
  vitrineGlass.position.set(0.4, 1.33, -7.65);
  vitrineGlass.userData.noMerge = true;
  staticGroup.add(vitrineGlass);
  // Rows of Gold Croissants, Rose & Mint Macaron Towers, Chocolate Opera Cakes inside glass vitrine!
  for (let px = -2.0; px <= 2.8; px += 0.72) {
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.56), chromeMat);
    tray.position.set(px, 1.04, -7.65);
    staticGroup.add(tray);
    const isCake = Math.round(px * 3) % 2 === 0;
    if (isCake) {
      const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 14), cocoaMat);
      cake.position.set(px, 1.14, -7.65);
      staticGroup.add(cake);
      const icing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.04, 12), macaronPinkMat);
      icing.position.set(px, 1.24, -7.65);
      staticGroup.add(icing);
    } else {
      [-0.12, 0.12].forEach((ox) => {
        const cr = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 6, 10, Math.PI * 1.15), croissantMat);
        cr.rotation.x = Math.PI / 2;
        cr.position.set(px + ox, 1.09, -7.65);
        staticGroup.add(cr);
      });
      const mac = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 10), macaronMintMat);
      mac.position.set(px, 1.12, -7.82);
      staticGroup.add(mac);
    }
  }
  // Espresso & Oven Back Credenza (lx=-2.4..+3.4, lz=-11.5..-10.3)
  addBox(-2.4, 3.4, 0.0, 0.96, -11.5, -10.3, walnutMat);
  const espressoBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.55), chromeMat);
  espressoBox.position.set(-0.6, 1.24, -10.8);
  staticGroup.add(espressoBox);
  const backMenuBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.85), patisserieSignMat);
  backMenuBoard.position.set(0.5, 2.25, -11.65);
  backMenuBoard.userData.noMerge = true;
  staticGroup.add(backMenuBoard);

  // Indoor Cafe Marble Tables (lx=-6.1, -2.7, lz=-5.0)
  [-6.1, -2.7].forEach((tx) => {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.06, 16), travertineMat);
    top.position.set(tx, 0.74, -5.0);
    staticGroup.add(top);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.24, 0.72, 10), brushedBrassMat);
    stem.position.set(tx, 0.36, -5.0);
    staticGroup.add(stem);
    [-0.72, 0.72].forEach((dz) => {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.06, 12), burgundyVelvetMat);
      seat.position.set(tx, 0.44, -5.0 + dz);
      staticGroup.add(seat);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.42, 8), wroughtIronMat);
      leg.position.set(tx, 0.21, -5.0 + dz);
      staticGroup.add(leg);
    });
  });

  // Grand Marble Reception Concierge Desk (lx=+1.2..+3.6, lz=+2.0..+7.2) + Brass Luggage Cart
  addBox(1.4, 3.4, 0.0, 1.08, 2.2, 7.0, travertineMat);
  addBox(1.32, 3.48, 1.08, 1.15, 2.12, 7.08, brushedBrassMat);
  const hotelCrestWall = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), hotelMarqueeMat);
  hotelCrestWall.rotation.y = -Math.PI / 2;
  hotelCrestWall.position.set(9.82, 2.35, 4.6);
  hotelCrestWall.userData.noMerge = true;
  staticGroup.add(hotelCrestWall);

  // Brass Luggage Cart with Suitcases (lx=1.9, lz=0.4)
  {
    const cart = new THREE.Group();
    cart.position.set(1.9, 0, 0.4);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 1.15), brushedBrassMat);
    base.position.y = 0.15;
    cart.add(base);
    const carpet = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 1.08), burgundyVelvetMat);
    carpet.position.y = 0.24;
    cart.add(carpet);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.03, 8, 16, Math.PI), brushedBrassMat);
    arch.rotation.y = Math.PI / 2;
    arch.position.y = 1.45;
    cart.add(arch);
    [-0.45, 0.45].forEach((cz) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.25, 8), brushedBrassMat);
      pole.position.set(0, 0.85, cz);
      cart.add(pole);
    });
    const bag1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.34), walnutMat);
    bag1.position.set(0, 0.52, -0.18);
    cart.add(bag1);
    const bag2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.28), burgundyVelvetMat);
    bag2.position.set(0, 0.46, 0.22);
    cart.add(bag2);
    staticGroup.add(cart);
  }

  // Grand Lobby Velvet Lounge Sofas + Sculptural Brass Ring Chandelier
  [
    [-7.3, 5.2, 0],
    [-3.1, 8.6, Math.PI / 2],
  ].forEach(([sx, sz, ry]) => {
    const sg = new THREE.Group();
    sg.position.set(sx, 0, sz);
    sg.rotation.y = ry;
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.44, 0.96), burgundyVelvetMat);
    base.position.y = 0.26;
    sg.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.62, 0.22), burgundyVelvetMat);
    back.position.set(0, 0.72, 0.36);
    sg.add(back);
    const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.36, 0.70), travertineMat);
    tbl.position.set(0, 0.18, -1.05);
    sg.add(tbl);
    staticGroup.add(sg);
  });
  {
    const chand = new THREE.Group();
    chand.position.set(-2.5, 3.65, 3.5);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), brushedBrassMat);
    rod.position.y = -0.22;
    chand.add(rod);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 8, 24), brushedBrassMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = -0.52;
    chand.add(ring1);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.03, 8, 24), warmGlowMat);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = -0.55;
    chand.add(glowRing);
    staticGroup.add(chand);
  }

  // =========================================================================
  // 4. FLOORS 2, 3, 4 ARCHITECTURAL FACADE, JULIET BALCONIES & INTERIORS
  // =========================================================================
  for (let f = 1; f <= 3; f++) {
    const yBase = f * floorH;
    const winBot = yBase + 0.56;
    const winTop = yBase + floorH - 0.36;
    const midY = (winBot + winTop) * 0.5;
    const winH = winTop - winBot;

    // West Boulevard Framed Panoramic French Glass Bays + Sleek Glass-and-Brass Juliet Balconies
    addBox(-10.55, -10.18, yBase, winBot, -12.0, 12.0, limestoneMat);
    addBox(-10.42, -10.30, winBot, winTop, -12.0, 12.0, clearGlassMat);
    // Continuous upper transom & window sash frames
    addBox(-10.46, -10.24, winBot, winBot + 0.07, -12.0, 12.0, bronzeMat);
    addBox(-10.46, -10.24, winTop - 0.64, winTop - 0.56, -12.0, 12.0, bronzeMat);
    addBox(-10.46, -10.24, winTop - 0.07, winTop, -12.0, 12.0, bronzeMat);
    addBox(-10.55, -10.18, winTop, yBase + floorH, -12.0, 12.0, limestoneMat);
    [-11.8, -6.2, -2.2, 2.2, 6.2, 11.8].forEach((mz) => {
      addBox(-10.58, -10.12, yBase, yBase + floorH, mz - 0.16, mz + 0.16, limestoneMat);
    });
    [-9.0, -4.2, 0.0, 4.2, 9.0].forEach((bz) => {
      // Center vertical French casement window mullion inside each bay
      addBox(-10.46, -10.24, winBot, winTop, bz - 0.05, bz + 0.05, bronzeMat);

      // Projecting Parisian Tempered-Glass & Brushed-Brass Juliet Balcony
      addBox(-11.20, -10.45, yBase - 0.08, yBase + 0.08, bz - 1.55, bz + 1.55, warmStoneMat);
      addBox(-11.16, -11.10, yBase + 0.08, yBase + 0.92, bz - 1.50, bz + 1.50, balconyGlassMat);
      addBox(-11.22, -11.06, yBase + 0.92, yBase + 1.00, bz - 1.55, bz + 1.55, brushedBrassMat);
      // Slim corner & center bronze stanchions framing the clear glass rail
      [-1.50, 0.0, 1.50].forEach((szOff) => {
        addBox(-11.19, -11.09, yBase + 0.08, yBase + 0.94, bz + szOff - 0.04, bz + szOff + 0.04, bronzeMat);
      });
      // Outer cantilevered flower planter box (clearly visible from street level!)
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 1.45), walnutMat);
      box.position.set(-11.28, yBase + 0.22, bz);
      staticGroup.add(box);
      const greens = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 1.38), foliageMat);
      greens.position.set(-11.28, yBase + 0.42, bz);
      staticGroup.add(greens);
      [-0.45, 0.0, 0.45].forEach((fOff) => {
        const rose = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 0), roseBloomMat);
        rose.position.set(-11.30, yBase + 0.56, bz + fOff);
        staticGroup.add(rose);
      });
      addWallSconce(-10.62, yBase + 2.3, bz + 1.9, -Math.PI / 2);
    });

    // North Courtyard Framed Glass Curtain Bays
    addBox(-10.5, 9.9, yBase, winBot, -12.05, -11.72, limestoneMat);
    addBox(-10.5, 9.9, winBot, winTop, -11.92, -11.82, clearGlassMat);
    addBox(-10.5, 9.9, winBot, winBot + 0.07, -11.96, -11.78, bronzeMat);
    addBox(-10.5, 9.9, winTop - 0.64, winTop - 0.56, -11.96, -11.78, bronzeMat);
    addBox(-10.5, 9.9, winTop - 0.07, winTop, -11.96, -11.78, bronzeMat);
    addBox(-10.5, 9.9, winTop, yBase + floorH, -12.05, -11.72, limestoneMat);
    [-6.0, -0.5, 5.2].forEach((mx) => addBox(mx - 0.16, mx + 0.16, yBase, yBase + floorH, -12.08, -11.68, limestoneMat));
    [-8.2, -3.2, 2.3, 7.6].forEach((mx) => addBox(mx - 0.05, mx + 0.05, winBot, winTop, -11.96, -11.78, bronzeMat));

    // Stairwell Glass Guardrails on Floors 2, 3, 4 (South mouth lz=-2.6 stays open!)
    addBox(5.72, 5.84, yBase, yBase + 0.92, -10.4, -2.6, balconyGlassMat);
    addBox(5.70, 5.86, yBase + 0.92, yBase + 1.00, -10.4, -2.55, brushedBrassMat);

    // Warm Ceiling Pendant Globes Inside Each Floor
    [-5.5, 1.0].forEach((lx) => {
      [-6.0, 5.0].forEach((lz) => {
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), warmGlowMat);
        g.position.set(lx, yBase + 3.42, lz);
        staticGroup.add(g);
      });
    });

    if (f === 1) {
      // FLOOR 2 (Y=3.85): LUXURY WELLNESS SPA & AROMATIC ZEN PAVILION
      const poolBorder = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.34, 3.6), travertineMat);
      poolBorder.position.set(-4.0, yBase + 0.17, 0.0);
      staticGroup.add(poolBorder);
      const zenWater = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.05, 2.9), rooftopWaterMat);
      zenWater.position.set(-4.0, yBase + 0.33, 0.0);
      zenWater.userData.noMerge = true;
      staticGroup.add(zenWater);
      // Floating lotus blossoms
      [-1.0, 0.8].forEach((off) => {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12), foliageMat);
        pad.position.set(-4.0 + off, yBase + 0.37, off * 0.4);
        staticGroup.add(pad);
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), macaronPinkMat);
        flower.position.set(-4.0 + off, yBase + 0.42, off * 0.4);
        staticGroup.add(flower);
      });

      // 3 Luxury Spa Treatment Beds + Sage Bolsters
      [
        [-7.6, -7.6],
        [-7.6, 6.6],
        [-1.5, 8.0],
      ].forEach(([bx, bz]) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.48, 1.05), walnutMat);
        frame.position.set(bx, yBase + 0.24, bz);
        staticGroup.add(frame);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.96), creamLinenMat);
        pad.position.set(bx, yBase + 0.56, bz);
        staticGroup.add(pad);
        const runner = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.17, 0.98), sageClothMat);
        runner.position.set(bx + 0.45, yBase + 0.57, bz);
        staticGroup.add(runner);
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.48, 10), warmGlowMat);
        lamp.position.set(bx - 1.25, yBase + 0.24, bz - 0.65);
        staticGroup.add(lamp);
      });
      // Spa Herbal Tea Bar
      addBox(5.4, 8.4, yBase, yBase + 0.98, 1.6, 7.4, walnutMat);
      addBox(5.35, 8.45, yBase + 0.98, yBase + 1.04, 1.55, 7.45, travertineMat);
    } else {
      // FLOORS 3 & 4 (Y=7.70, 11.55): PARISIAN BOUTIQUE SUITES
      [
        [-6.6, -8.1],
        [-6.6, 6.9],
      ].forEach(([bx, bz]) => {
        // King Suite Bed
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.28, 2.35), burgundyVelvetMat);
        head.position.set(bx - 1.15, yBase + 0.64, bz);
        staticGroup.add(head);
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.56, 2.2), creamLinenMat);
        mattress.position.set(bx, yBase + 0.28, bz);
        staticGroup.add(mattress);
        const throwBlanket = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.58, 2.22), f === 2 ? burgundyVelvetMat : sageClothMat);
        throwBlanket.position.set(bx + 0.55, yBase + 0.29, bz);
        staticGroup.add(throwBlanket);
        [-0.55, 0.55].forEach((pz) => {
          const pil = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.72), creamLinenMat);
          pil.position.set(bx - 0.75, yBase + 0.64, bz + pz);
          staticGroup.add(pil);
        });
      });
      // Writing Console & Chaise Lounge
      addBox(-1.7, 1.1, yBase, yBase + 0.76, -9.6, -8.0, walnutMat);
      addBox(-0.1, 2.9, yBase, yBase + 0.52, 7.2, 9.4, burgundyVelvetMat);
      // East Gallery Credenza
      addBox(8.5, 9.7, yBase, yBase + 1.02, 0.2, 6.8, walnutMat);
      addBox(8.45, 9.75, yBase + 1.02, yBase + 1.07, 0.15, 6.85, brushedBrassMat);
    }
    void midY;
    void winH;
  }

  // =========================================================================
  // 5. FLOOR 5 (Y=15.40): OPEN-AIR ROOFTOP INFINITY POOL, SKY BAR & MANSARD CROWN
  // =========================================================================
  const roofY = wallTopY; // 15.40m

  // Clear Glass & Brass Safety Parapets around entire Rooftop Deck with vertical stanchions
  addBox(-10.5, 10.5, roofY, roofY + 0.28, -12.05, -11.75, limestoneMat);
  addBox(-10.5, 10.5, roofY + 0.28, roofY + 1.12, -11.95, -11.86, balconyGlassMat);
  addBox(-10.5, 10.5, roofY + 1.12, roofY + 1.20, -12.0, -11.82, brushedBrassMat);
  [-10.2, -6.2, -2.2, 1.8, 5.8, 9.8].forEach((px) =>
    addBox(px - 0.04, px + 0.04, roofY + 0.28, roofY + 1.14, -11.96, -11.84, bronzeMat)
  );

  addBox(-10.5, 10.5, roofY, roofY + 0.28, 11.75, 12.05, limestoneMat);
  addBox(-10.5, 10.5, roofY + 0.28, roofY + 1.12, 11.86, 11.95, balconyGlassMat);
  addBox(-10.5, 10.5, roofY + 1.12, roofY + 1.20, 11.82, 12.0, brushedBrassMat);

  addBox(-10.55, -10.25, roofY, roofY + 0.28, -12.0, 12.0, limestoneMat);
  addBox(-10.45, -10.36, roofY + 0.28, roofY + 1.12, -12.0, 12.0, balconyGlassMat);
  addBox(-10.48, -10.32, roofY + 1.12, roofY + 1.20, -12.0, 12.0, brushedBrassMat);
  [-9.0, -5.4, -1.8, 1.8, 5.4, 9.0].forEach((pz) =>
    addBox(-10.46, -10.34, roofY + 0.28, roofY + 1.14, pz - 0.04, pz + 0.04, bronzeMat)
  );

  // Stairwell Landing Guardrail + Floor-5 West Pit Guard (exit only down East flight)
  addBox(5.72, 5.84, roofY, roofY + 0.96, -10.4, -2.6, balconyGlassMat);
  addBox(5.70, 5.86, roofY + 0.96, roofY + 1.04, -10.4, -2.55, brushedBrassMat);
  addBox(5.80, 7.80, roofY, roofY + 0.96, -2.64, -2.54, balconyGlassMat);
  addBox(5.78, 7.82, roofY + 0.96, roofY + 1.04, -2.66, -2.52, brushedBrassMat);

  // Open-Air Rooftop Infinity Plunge Pool (lx=-9.2..-2.6, lz=-9.6..+1.8)
  addBox(-9.3, -2.5, roofY, roofY + 0.42, -9.7, 1.9, travertineMat);
  const poolBasinFloor = new THREE.Mesh(
    new THREE.BoxGeometry(6.1, 0.08, 10.9),
    new THREE.MeshStandardMaterial({ color: 0x0e7490, emissive: 0x06b6d4, emissiveIntensity: 0.42, roughness: 0.2 })
  );
  poolBasinFloor.position.set(-5.9, roofY + 0.24, -3.9);
  staticGroup.add(poolBasinFloor);
  const poolWaterMesh = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.06, 10.9), rooftopWaterMat);
  poolWaterMesh.position.set(-5.9, roofY + 0.39, -3.9);
  poolWaterMesh.userData.noMerge = true;
  staticGroup.add(poolWaterMesh);

  // Poolside Sun Loungers & Cream Parasols (lx=-1.0..+1.2, lz=-8.2..-2.5)
  [-8.0, -3.0].forEach((pz) => {
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.30, 0.85), creamLinenMat);
    lounger.position.set(0.0, roofY + 0.16, pz);
    staticGroup.add(lounger);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.92), walnutMat);
    legL.position.set(0.0, roofY + 0.09, pz);
    staticGroup.add(legL);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.35, 8), brushedBrassMat);
    pole.position.set(0.8, roofY + 1.18, pz);
    staticGroup.add(pole);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.45, 8), creamLinenMat);
    canopy.position.set(0.8, roofY + 2.35, pz);
    staticGroup.add(canopy);
  });

  // Rooftop Sky Lounge Bar & Pergola (lx=+0.2..+5.4, lz=+4.4..+9.0)
  addBox(0.2, 5.4, roofY, roofY + 1.05, 4.4, 5.3, walnutMat);
  addBox(0.15, 5.45, roofY + 1.05, roofY + 1.12, 4.35, 5.35, travertineMat);
  addBox(4.5, 5.4, roofY, roofY + 1.05, 5.3, 9.0, walnutMat);
  // Pergola Timber Beams & Warm Bistro Bulbs above Sky Bar
  [-0.2, 5.6].forEach((px) => {
    [4.2, 9.2].forEach((pz) => {
      addBox(px - 0.12, px + 0.12, roofY, roofY + 3.1, pz - 0.12, pz + 0.12, bronzeMat);
    });
  });
  for (let bz = 4.2; bz <= 9.2; bz += 1.0) {
    addBox(-0.4, 5.8, roofY + 3.05, roofY + 3.22, bz - 0.07, bz + 0.07, walnutMat);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), warmGlowMat);
    bulb.position.set(2.7, roofY + 2.95, bz);
    staticGroup.add(bulb);
  }
  // Rooftop Sofa Niche
  addBox(-8.0, -4.4, roofY, roofY + 0.56, 5.8, 8.8, creamLinenMat);
  addBox(-6.9, -5.5, roofY, roofY + 0.40, 7.0, 7.6, walnutMat);

  // French Mansard Crown Stairhead Pavilion (covers stairwell on Rooftop!)
  addBox(5.5, 10.5, roofY, roofY + 3.2, -11.6, -2.5, limestoneMat);
  addBox(5.5, 10.5, roofY, roofY + 2.8, -2.6, -2.3, limestoneMat); // leave open doorway below at lz=-1.0..-2.5
  const mansardRoof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 1.85, 4), mansardSlateMat);
  mansardRoof.rotation.y = Math.PI / 4;
  mansardRoof.position.set(8.0, roofY + 4.1, -7.0);
  staticGroup.add(mansardRoof);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.4, 8), brushedBrassMat);
  spire.position.set(8.0, roofY + 5.3, -7.0);
  staticGroup.add(spire);

  // Rooftop Grand Illuminated Sign facing West Avenue & North Intersection!
  const skySignWest = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 2.2), hotelMarqueeMat);
  skySignWest.rotation.y = -Math.PI / 2;
  skySignWest.position.set(-10.58, roofY + 2.25, 0.0);
  skySignWest.userData.noMerge = true;
  staticGroup.add(skySignWest);
  addBox(-10.54, -10.18, roofY + 1.15, roofY + 3.4, -5.9, 5.9, mansardSlateMat);

  const skySignNorth = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.0), hotelMarqueeMat);
  skySignNorth.rotation.y = Math.PI;
  skySignNorth.position.set(-3.0, roofY + 2.15, -12.08);
  skySignNorth.userData.noMerge = true;
  staticGroup.add(skySignNorth);
  addBox(-7.9, 1.9, roofY + 1.15, roofY + 3.2, -12.04, -11.72, mansardSlateMat);

  // =========================================================================
  // 6. WARM HOSPITAL SCALED POINT LIGHTS (2 BUDGET LIGHTS COVERING LOBBY & SKY DECK)
  // =========================================================================
  const lobbyLight = new THREE.PointLight(0xffe0a3, 1.8, 30, 1.35);
  lobbyLight.position.set(HOTEL_ORIGIN_X - 2.0, 3.1, HOTEL_ORIGIN_Z - 1.5);
  scaledLights.push({
    light: lobbyLight,
    dayInt: 0.90,
    nightInt: 2.85,
    getScale: () => 1.0,
  });

  const forecourtLight = new THREE.PointLight(0xffd28a, 1.5, 26, 1.35);
  forecourtLight.position.set(HOTEL_ORIGIN_X - 12.2, 3.3, HOTEL_ORIGIN_Z - 3.5);
  scaledLights.push({
    light: forecourtLight,
    dayInt: 0.45,
    nightInt: 2.35,
    getScale: () => 1.0,
  });

  const update = (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => {
    const dt = Math.min(delta, 0.1);
    waterTimeUniform.value += dt;
    const isDayBusy = rawHour >= 7.0 && rawHour < 22.0;
    const warmFactor = isDayBusy ? 0.65 + lampFactor * 0.55 : 0.85 + lampFactor * 0.45;
    warmGlowMat.emissiveIntensity = 0.85 + warmFactor * 0.65;
    rooftopWaterMat.emissiveIntensity = 0.25 + lampFactor * 0.42;

    // Proximity-activated Automatic Sliding Glass Doors on Floor 1 (Main Lobby & Patisserie)
    const nearHotelX = playerPos && playerPos.y < 2.2 && playerPos.x >= 209.2 && playerPos.x <= 217.8;
    const nearMainDoor = Boolean(
      nearHotelX && playerPos && playerPos.z >= HOTEL_ORIGIN_Z - 3.2 && playerPos.z <= HOTEL_ORIGIN_Z + 3.2
    );
    const nearPatDoor = Boolean(
      nearHotelX && playerPos && playerPos.z >= HOTEL_ORIGIN_Z - 10.6 && playerPos.z <= HOTEL_ORIGIN_Z - 5.8
    );

    mainAutoDoor.progress = THREE.MathUtils.lerp(mainAutoDoor.progress, nearMainDoor ? 1 : 0, Math.min(1, dt * 6.5));
    const mainOff = THREE.MathUtils.lerp(mainAutoDoor.closedOffset, mainAutoDoor.openOffset, mainAutoDoor.progress);
    mainAutoDoor.leftLeaf.position.z = mainAutoDoor.centerZ - mainOff;
    mainAutoDoor.rightLeaf.position.z = mainAutoDoor.centerZ + mainOff;

    patisserieAutoDoor.progress = THREE.MathUtils.lerp(
      patisserieAutoDoor.progress,
      nearPatDoor ? 1 : 0,
      Math.min(1, dt * 6.5)
    );
    const patOff = THREE.MathUtils.lerp(
      patisserieAutoDoor.closedOffset,
      patisserieAutoDoor.openOffset,
      patisserieAutoDoor.progress
    );
    patisserieAutoDoor.leftLeaf.position.z = patisserieAutoDoor.centerZ - patOff;
    patisserieAutoDoor.rightLeaf.position.z = patisserieAutoDoor.centerZ + patOff;
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
// LIVE BOUTIQUE HOTEL, PATISSERIE, SPA & ROOFTOP SKY LOUNGE NPC CONTROLLER
// =========================================================================

interface HotelNpcActor {
  root: THREE.Group;
  hipsGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  headMesh: THREE.Mesh;
  role: 'bellboy' | 'concierge' | 'baker' | 'therapist' | 'bartender' | 'guest_seated' | 'guest_stroll' | 'stair_walker';
  walkPhase: number;
  idleSeed: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  baseYaw: number;
  waypoints?: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  glbHandle?: GlbHumanHandle;
}

export class BoutiqueHotelNpcController {
  public readonly rootGroup = new THREE.Group();
  private actors: HotelNpcActor[] = [];
  private timer = 0;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;
    this.buildActors(helpers);
  }

  private buildActors(helpers: HospitalCharacterHelpers) {
    const ox = HOTEL_ORIGIN_X;
    const oz = HOTEL_ORIGIN_Z;

    const specs: Array<{
      role: HotelNpcActor['role'];
      x: number;
      y: number;
      z: number;
      yaw: number;
      shirtHex: number;
      pantsHex: number;
      skinHex: string;
      hatHex?: number;
      waypoints?: Array<[number, number, number]>;
    }> = [
      // 1. Bellboy beside Porte-Cochère (uniform burgundy jacket & brass cap)
      { role: 'bellboy', x: ox - 11.4, y: 0, z: oz - 3.3, yaw: -Math.PI / 2, shirtHex: 0x7f1d1d, pantsHex: 0x111827, skinHex: '#f1c27d', hatHex: 0x7f1d1d },
      // 2. Reception Concierge behind Grand Desk (Floor 1)
      { role: 'concierge', x: ox + 4.1, y: 0, z: oz + 4.6, yaw: -Math.PI / 2, shirtHex: 0x1e293b, pantsHex: 0x0f172a, skinHex: '#f5cba7' },
      // 3. French Patisserie Pastry Chef (white toque!) behind Glass Showcase (Floor 1)
      { role: 'baker', x: ox + 0.5, y: 0, z: oz - 9.8, yaw: 0, shirtHex: 0xf8fafc, pantsHex: 0x334155, skinHex: '#f1c27d', hatHex: 0xffffff },
      // 4. Barista at Espresso Counter (Floor 1)
      { role: 'baker', x: ox - 1.4, y: 0, z: oz - 9.8, yaw: Math.PI * 0.1, shirtHex: 0x78350f, pantsHex: 0x1e293b, skinHex: '#e0ac69' },
      // 5-6. Outdoor Patisserie Bistro Guests
      { role: 'guest_seated', x: ox - 13.8, y: 0, z: oz - 10.94, yaw: 0, shirtHex: 0xf43f5e, pantsHex: 0x1e293b, skinHex: '#f5cba7' },
      { role: 'guest_seated', x: ox - 13.8, y: 0, z: oz - 6.86, yaw: Math.PI, shirtHex: 0x2563eb, pantsHex: 0x0f172a, skinHex: '#e0ac69' },
      // 7-8. Indoor Patisserie Cafe Guests
      { role: 'guest_seated', x: ox - 6.1, y: 0, z: oz - 5.72, yaw: 0, shirtHex: 0x059669, pantsHex: 0x334155, skinHex: '#f1c27d' },
      { role: 'guest_seated', x: ox - 2.7, y: 0, z: oz - 4.28, yaw: Math.PI, shirtHex: 0xa855f7, pantsHex: 0x1e293b, skinHex: '#d2996c' },
      // 9. Lobby Lounge Guest Checking In
      {
        role: 'guest_stroll',
        x: ox - 5.0,
        y: 0,
        z: oz + 1.2,
        yaw: Math.PI / 2,
        shirtHex: 0x0284c7,
        pantsHex: 0x0f172a,
        skinHex: '#f1c27d',
        waypoints: [
          [ox - 9.5, 0, oz + 0.2],
          [ox + 0.5, 0, oz + 4.4],
          [ox - 4.5, 0, oz + 5.8],
          [ox - 7.5, 0, oz + 1.5],
        ],
      },
      // 10. Floor 1 <-> Floor 2 Staircase Guest/Bellhop
      {
        role: 'stair_walker',
        x: ox + 6.8,
        y: 0,
        z: oz - 2.6,
        yaw: Math.PI,
        shirtHex: 0xbe123c,
        pantsHex: 0x111827,
        skinHex: '#e0ac69',
        waypoints: [
          [ox + 6.8, 0, oz - 2.6],
          [ox + 6.8, BOUTIQUE_HOTEL_FLOOR_H * 0.5, oz - 9.2],
          [ox + 8.8, BOUTIQUE_HOTEL_FLOOR_H * 0.5, oz - 9.2],
          [ox + 8.8, BOUTIQUE_HOTEL_FLOOR_H, oz - 2.2],
          [ox + 4.5, BOUTIQUE_HOTEL_FLOOR_H, oz + 1.5],
          [ox + 8.8, BOUTIQUE_HOTEL_FLOOR_H, oz - 2.2],
          [ox + 8.8, BOUTIQUE_HOTEL_FLOOR_H * 0.5, oz - 9.2],
          [ox + 6.8, BOUTIQUE_HOTEL_FLOOR_H * 0.5, oz - 9.2],
        ],
      },
      // 11-13. Floor 2 Luxury Spa Therapist & Guests
      { role: 'therapist', x: ox + 4.4, y: BOUTIQUE_HOTEL_FLOOR_H, z: oz + 4.5, yaw: -Math.PI / 2, shirtHex: 0x4d7c5b, pantsHex: 0x1e293b, skinHex: '#f5cba7' },
      {
        role: 'guest_stroll',
        x: ox - 3.5,
        y: BOUTIQUE_HOTEL_FLOOR_H,
        z: oz - 5.2,
        yaw: 0,
        shirtHex: 0xfefce8,
        pantsHex: 0x94a3b8,
        skinHex: '#f1c27d',
        waypoints: [
          [ox - 4.2, BOUTIQUE_HOTEL_FLOOR_H, oz - 5.0],
          [ox + 2.2, BOUTIQUE_HOTEL_FLOOR_H, oz - 3.5],
          [ox + 2.2, BOUTIQUE_HOTEL_FLOOR_H, oz + 4.2],
          [ox - 4.5, BOUTIQUE_HOTEL_FLOOR_H, oz + 4.2],
        ],
      },
      { role: 'guest_seated', x: ox - 6.0, y: BOUTIQUE_HOTEL_FLOOR_H, z: oz - 7.6, yaw: Math.PI / 2, shirtHex: 0xf8fafc, pantsHex: 0x64748b, skinHex: '#e0ac69' },
      // 14-15. Floors 3 & 4 Suite Guests admiring view
      {
        role: 'guest_stroll',
        x: ox - 3.5,
        y: BOUTIQUE_HOTEL_FLOOR_H * 2,
        z: oz - 2.0,
        yaw: -Math.PI / 2,
        shirtHex: 0xd97706,
        pantsHex: 0x1e293b,
        skinHex: '#f5cba7',
        waypoints: [
          [ox - 8.5, BOUTIQUE_HOTEL_FLOOR_H * 2, oz - 3.0],
          [ox - 8.5, BOUTIQUE_HOTEL_FLOOR_H * 2, oz + 3.0],
          [ox + 1.5, BOUTIQUE_HOTEL_FLOOR_H * 2, oz + 2.0],
        ],
      },
      {
        role: 'guest_stroll',
        x: ox - 4.0,
        y: BOUTIQUE_HOTEL_FLOOR_H * 3,
        z: oz + 2.0,
        yaw: -Math.PI / 2,
        shirtHex: 0xec4899,
        pantsHex: 0x0f172a,
        skinHex: '#f1c27d',
        waypoints: [
          [ox - 8.5, BOUTIQUE_HOTEL_FLOOR_H * 3, oz + 1.0],
          [ox - 3.0, BOUTIQUE_HOTEL_FLOOR_H * 3, oz - 3.0],
          [ox + 2.0, BOUTIQUE_HOTEL_FLOOR_H * 3, oz + 1.5],
        ],
      },
      // 16-19. Floor 5 Rooftop Sky Bar Bartender & Infinity Pool Guests!
      { role: 'bartender', x: ox + 2.8, y: BOUTIQUE_HOTEL_FLOOR_H * 4, z: oz + 6.4, yaw: Math.PI, shirtHex: 0x0f172a, pantsHex: 0x1e293b, skinHex: '#e0ac69' },
      { role: 'guest_seated', x: ox + 2.5, y: BOUTIQUE_HOTEL_FLOOR_H * 4, z: oz + 3.6, yaw: 0, shirtHex: 0x0ea5e9, pantsHex: 0x334155, skinHex: '#f1c27d' },
      { role: 'guest_seated', x: ox - 6.2, y: BOUTIQUE_HOTEL_FLOOR_H * 4, z: oz + 6.5, yaw: 0, shirtHex: 0xf43f5e, pantsHex: 0x1e293b, skinHex: '#f5cba7' },
      {
        role: 'guest_stroll',
        x: ox - 1.5,
        y: BOUTIQUE_HOTEL_FLOOR_H * 4,
        z: oz - 5.5,
        yaw: -Math.PI / 2,
        shirtHex: 0xfacc15,
        pantsHex: 0x1e293b,
        skinHex: '#d2996c',
        waypoints: [
          [ox - 1.5, BOUTIQUE_HOTEL_FLOOR_H * 4, oz - 8.5],
          [ox + 3.0, BOUTIQUE_HOTEL_FLOOR_H * 4, oz - 8.5],
          [ox + 3.0, BOUTIQUE_HOTEL_FLOOR_H * 4, oz + 2.2],
          [ox - 1.5, BOUTIQUE_HOTEL_FLOOR_H * 4, oz + 2.2],
        ],
      },
    ];

    specs.forEach((sp, idx) => {
      const root = new THREE.Group();
      const skinMat = new THREE.MeshStandardMaterial({ color: sp.skinHex, roughness: 0.78 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: sp.shirtHex, roughness: 0.74 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: sp.pantsHex, roughness: 0.84 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      const hairMat = new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0x18181b : 0x451a03, roughness: 0.88 });

      const hipsGroup = new THREE.Group();
      hipsGroup.position.y = 0.80;
      root.add(hipsGroup);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.24), shirtMat);
      torso.position.y = 0.28;
      hipsGroup.add(torso);

      const faceTex = helpers.createFaceTexture(idx % 3 === 0 ? 'happy' : 'neutral', sp.skinHex);
      const headMesh = helpers.createHeadMesh(skinMat, faceTex, 0.27, 0.27, 0.27);
      headMesh.position.y = 0.72;
      hipsGroup.add(headMesh);

      if (sp.hatHex !== undefined) {
        const isChef = sp.role === 'baker';
        const hat = new THREE.Mesh(
          new THREE.CylinderGeometry(isChef ? 0.16 : 0.14, 0.14, isChef ? 0.24 : 0.10, 12),
          new THREE.MeshStandardMaterial({ color: sp.hatHex, roughness: 0.6 })
        );
        hat.position.y = isChef ? 0.94 : 0.89;
        hipsGroup.add(hat);
      } else {
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.10, 0.29), hairMat);
        hair.position.y = 0.86;
        hipsGroup.add(hair);
      }

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

      if (sp.role === 'guest_seated') {
        hipsGroup.position.y = 0.48;
        leftLeg.rotation.x = -Math.PI / 2;
        rightLeg.rotation.x = -Math.PI / 2;
        leftArm.rotation.x = -0.35;
        rightArm.rotation.x = -0.35;
      }

      root.position.set(sp.x, sp.y, sp.z);
      root.rotation.y = sp.yaw;

      const isWalkingRole = sp.role === 'guest_stroll' || sp.role === 'stair_walker';
      const isSeatedRole = sp.role === 'guest_seated';
      const glbSpec =
        sp.role === 'concierge'
          ? CASHIER_NPC_MODEL
          : isWalkingRole
            ? pickOutsideNpcModel(110 + idx)
            : isSeatedRole
              ? pickSeatedCivilianModel(80 + idx)
              : pickStationaryCivilianModel(80 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: glbSpec.modelSource,
        hostGroup: root,
        fallbackMeshes: [hipsGroup],
        targetHeight: glbSpec.targetHeight,
        clipProfile: glbSpec.clipProfile,
        rotationY: glbSpec.rotationY,
        initialState: sp.role === 'concierge' ? 'Checkout' : isWalkingRole ? 'Walk' : isSeatedRole ? 'Sit' : 'Idle',
        phaseOffset: idx * 0.39,
      });

      this.rootGroup.add(root);

      this.actors.push({
        root,
        hipsGroup,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        headMesh,
        role: sp.role,
        walkPhase: idx * 0.9,
        idleSeed: idx * 1.37,
        baseX: sp.x,
        baseY: sp.y,
        baseZ: sp.z,
        baseYaw: sp.yaw,
        waypoints: sp.waypoints?.map(([wx, wy, wz]) => new THREE.Vector3(wx, wy, wz)),
        wpIdx: 1,
        speed: sp.role === 'stair_walker' ? 1.25 : 1.15,
        glbHandle,
      });
    });
  }

  public update(delta: number) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if ((a.role === 'guest_stroll' || a.role === 'stair_walker') && a.waypoints && a.waypoints.length >= 2) {
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
        a.walkPhase += dt * 6.5;
        const swing = Math.sin(a.walkPhase) * 0.42;
        a.leftLeg.rotation.x = swing;
        a.rightLeg.rotation.x = -swing;
        a.leftArm.rotation.x = -swing * 0.55;
        a.rightArm.rotation.x = a.glbHandle?.hasActiveUmbrella() ? -0.88 : swing * 0.55;
      } else if (a.role === 'guest_seated') {
        const chat = Math.sin(this.timer * 1.8 + a.idleSeed);
        a.headMesh.rotation.y = chat * 0.22;
        a.rightArm.rotation.x = -0.35 + Math.max(0, Math.sin(this.timer * 1.4 + a.idleSeed)) * -0.25;
      } else {
        // Bellboy, concierge, pastry chef, spa therapist, rooftop bartender
        const sway = Math.sin(this.timer * 1.5 + a.idleSeed);
        a.headMesh.rotation.y = sway * 0.28;
        a.rightArm.rotation.x = a.role === 'bellboy' ? -0.18 + sway * 0.14 : -0.25 + sway * 0.18;
        a.leftArm.rotation.x = -0.12 - sway * 0.08;
      }
    }
  }
}
