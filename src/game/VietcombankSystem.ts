import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, GUARD_NPC_MODEL, pickOutsideNpcModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isVietcombankOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';

export const VIETCOMBANK_FLOOR2_Y = 5.0;
export const VIETCOMBANK_PODIUM_Y = 0.36;

export interface VietcombankBuildResult {
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
    npcController?: VietcombankNpcController | null,
    externalNpcNearDoor?: boolean
  ) => void;
}

// Plot in NE Quadrant directly East of Quán Nhậu Ron Béo (X = 207.0..235.8):
// Building Footprint: X = 238.0 .. 264.0 (26m wide), Z = -10.0 .. +11.4 (21.4m deep)
// Forecourt & Steps:  X = 238.0 .. 264.0, Z = +11.4 .. +15.6 (Facing South onto East Leg Boulevard)
// Interior Stairwell: X = 259.6 .. 263.2, Z = -7.8 .. -1.4 (NE corner switchback to Floor 2)
export const VIETCOMBANK_COLLIDERS: IntersectionColliderBox[] = [
  // Landscaped divider hedge between Ron Béo (235.8) & Vietcombank West Pier (238.0)
  { minX: 235.7, maxX: 238.2, minZ: -10.2, maxZ: 12.2, floor: 1 },
  // Left & Right Forecourt Side Planters + Motorbike Parking Zone (keeps central steps X=243.5..258.5 wide open!)
  { minX: 238.7, maxX: 239.7, minZ: 13.8, maxZ: 14.9, floor: 1 }, // VCB 24/7 Sidewalk Totem Pylon
  { minX: 238.2, maxX: 243.2, minZ: 12.2, maxZ: 13.6, floor: 1 }, // West Forecourt Planter Box
  { minX: 258.5, maxX: 263.8, minZ: 12.2, maxZ: 15.0, floor: 1 }, // East Forecourt Parked Motorbikes Bay

  // Floor 1 Exterior Walls (Portal opening X = 247.4 .. 254.6, doors slide open X = 249.2 .. 252.8)
  { minX: 237.8, maxX: 238.6, minZ: -10.2, maxZ: 11.6, floor: 1 }, // West Exterior Wall
  { minX: 263.4, maxX: 264.2, minZ: -10.2, maxZ: 11.6, floor: 1 }, // East Exterior Wall
  { minX: 237.8, maxX: 264.2, minZ: -10.3, maxZ: -9.4, floor: 1 }, // North Rear Wall
  { minX: 238.0, maxX: 249.2, minZ: 11.0, maxZ: 11.7, floor: 1 }, // South Front Glass West of Doors
  { minX: 252.8, maxX: 264.0, minZ: 11.0, maxZ: 11.7, floor: 1 }, // South Front Glass East of Doors

  // Floor 1 Banking Hall Fixtures
  { minX: 244.8, maxX: 246.2, minZ: 8.1, maxZ: 9.1, floor: 1 }, // Digital Queue Ticket Kiosk
  { minX: 246.5, maxX: 247.6, minZ: 9.4, maxZ: 10.6, floor: 1 }, // Security Greeter Podium
  { minX: 258.0, maxX: 263.3, minZ: 5.8, maxZ: 10.7, floor: 1 }, // 24/7 Digibank & ATM Kiosk Bank
  { minX: 238.7, maxX: 244.6, minZ: 1.5, maxZ: 7.5, floor: 1 }, // Customer Waiting Sofa & Table Lounge
  { minX: 238.7, maxX: 239.9, minZ: -0.6, maxZ: 1.0, floor: 1 }, // Water Dispenser & Brochure Stand
  { minX: 239.6, maxX: 256.8, minZ: -5.4, maxZ: -3.5, floor: 1 }, // 4 Teller Service Counters Row
  { minX: 238.7, maxX: 258.4, minZ: -9.5, maxZ: -8.1, floor: 1 }, // Rear Vault Door & Credenza Cabinets
  { minX: 253.7, maxX: 257.5, minZ: 1.2, maxZ: 3.4, floor: 1 }, // Advisory Consultation Table & Chairs
  { minX: 238.7, maxX: 239.8, minZ: 9.6, maxZ: 10.8, floor: 1 }, // SW Corner Planter Pot
  { minX: 258.3, maxX: 259.4, minZ: 0.2, maxZ: 1.4, floor: 1 }, // Mid-East Structural Column & Planter

  // Floor 1 Stairwell Enclosure (West flight X=259.6..261.3 open at Z=-1.4; East under-flight & North wall closed)
  { minX: 259.45, maxX: 259.75, minZ: -8.0, maxZ: -1.3, floor: 1 }, // Stairwell West Wall
  { minX: 261.38, maxX: 263.4, minZ: -8.0, maxZ: -1.3, floor: 1 }, // Under East Flight Enclosure
  { minX: 259.5, maxX: 263.4, minZ: -8.1, maxZ: -7.75, floor: 1 }, // Stairwell North Wall

  // Floor 2 Perimeter Curtain Walls & Stairwell Guardrails
  { minX: 237.8, maxX: 238.6, minZ: -10.2, maxZ: 11.6, floor: 2 }, // West Wall
  { minX: 263.4, maxX: 264.2, minZ: -10.2, maxZ: 11.6, floor: 2 }, // East Wall
  { minX: 237.8, maxX: 264.2, minZ: -10.3, maxZ: -9.4, floor: 2 }, // North Wall
  { minX: 237.8, maxX: 264.2, minZ: 10.9, maxZ: 11.7, floor: 2 }, // South 7-Pane Curtain Wall
  { minX: 259.45, maxX: 259.75, minZ: -8.0, maxZ: -1.3, floor: 2 }, // Stairwell West Balustrade
  { minX: 261.32, maxX: 261.50, minZ: -5.6, maxZ: -1.5, floor: 2 }, // Center Flight Divider
  { minX: 259.5, maxX: 263.4, minZ: -8.1, maxZ: -7.75, floor: 2 }, // Stairwell North Balustrade
  { minX: 259.5, maxX: 261.45, minZ: -1.6, maxZ: -1.25, floor: 2 }, // West Flight Drop-off Rail

  // Floor 2 Priority Banking & Corporate Credit Furniture
  { minX: 239.0, maxX: 253.0, minZ: 3.05, maxZ: 3.35, floor: 2 }, // Priority VIP Glass Partition (open door X=253..259)
  { minX: 239.8, maxX: 246.4, minZ: 4.4, maxZ: 9.3, floor: 2 }, // VIP Priority Lounge Conference Table & Chairs
  { minX: 248.4, maxX: 256.2, minZ: 4.8, maxZ: 9.0, floor: 2 }, // Executive Advisory Lounge Set
  { minX: 258.8, maxX: 263.3, minZ: 7.4, maxZ: 10.7, floor: 2 }, // Floor 2 VIP Refreshment & Espresso Bar
  { minX: 240.0, maxX: 247.2, minZ: -6.8, maxZ: -2.0, floor: 2 }, // Corporate Credit Desks West
  { minX: 249.4, maxX: 256.6, minZ: -6.8, maxZ: -2.0, floor: 2 }, // Corporate Credit Desks East
  { minX: 238.7, maxX: 257.6, minZ: -9.5, maxZ: -8.1, floor: 2 }, // Floor 2 Archive Cabinets & Printer Station

  // Outdoor 3-Bay Vietcombank 24h ATM Booth directly East of Vietcombank (X = 265.0..274.2, Z = 6.8..12.8)
  { minX: 264.8, maxX: 265.65, minZ: 6.7, maxZ: 12.9, floor: 1 }, // ATM Booth West Side Wall
  { minX: 273.55, maxX: 274.4, minZ: 6.7, maxZ: 12.9, floor: 1 }, // ATM Booth East Side Wall
  { minX: 265.0, maxX: 274.2, minZ: 6.6, maxZ: 9.25, floor: 1 }, // ATM Booth 3-Faceted Rear Wall & 3 Kiosks
  { minX: 266.7, maxX: 267.6, minZ: 11.25, maxZ: 12.15, floor: 1 }, // ATM Booth Left Inner White Column
  { minX: 271.6, maxX: 272.5, minZ: 11.25, maxZ: 12.15, floor: 1 }, // ATM Booth Right Inner White Column
];

function drawVietcombankEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 100;
  ctx.scale(s, s);

  // Outer rounded inverted triangle / V-heart silhouette (Signature Vietcombank folded green ribbon mark)
  const gradL = ctx.createLinearGradient(-46, -42, 6, 46);
  gradL.addColorStop(0, '#9bd33b');
  gradL.addColorStop(0.55, '#47a432');
  gradL.addColorStop(1, '#006a38');
  ctx.beginPath();
  ctx.moveTo(-44, -28);
  ctx.quadraticCurveTo(-48, -44, -28, -44);
  ctx.lineTo(28, -44);
  ctx.quadraticCurveTo(48, -44, 44, -28);
  ctx.quadraticCurveTo(26, 20, 6, 44);
  ctx.quadraticCurveTo(0, 50, -6, 44);
  ctx.quadraticCurveTo(-26, 20, -44, -28);
  ctx.closePath();
  ctx.fillStyle = gradL;
  ctx.fill();

  // Right deeper emerald shaded wing creating the signature folded 3D depth
  const gradR = ctx.createLinearGradient(-8, -44, 42, 40);
  gradR.addColorStop(0, '#72bf44');
  gradR.addColorStop(0.45, '#008542');
  gradR.addColorStop(1, '#00562c');
  ctx.beginPath();
  ctx.moveTo(-2, -44);
  ctx.lineTo(28, -44);
  ctx.quadraticCurveTo(48, -44, 44, -28);
  ctx.quadraticCurveTo(26, 20, 6, 44);
  ctx.quadraticCurveTo(0, 50, -4, 44);
  ctx.quadraticCurveTo(14, 14, 18, -18);
  ctx.quadraticCurveTo(18, -32, -2, -44);
  ctx.closePath();
  ctx.fillStyle = gradR;
  ctx.fill();

  // Inner crisp sky-glass/white heart-V negative cutout
  ctx.beginPath();
  ctx.moveTo(-18, -22);
  ctx.quadraticCurveTo(-20, -28, -11, -28);
  ctx.lineTo(13, -28);
  ctx.quadraticCurveTo(21, -28, 18, -20);
  ctx.quadraticCurveTo(10, 4, 2, 16);
  ctx.quadraticCurveTo(0, 20, -2, 16);
  ctx.quadraticCurveTo(-11, 2, -18, -22);
  ctx.closePath();
  ctx.fillStyle = '#e0f2fe';
  ctx.fill();

  ctx.restore();
}

function createMarbleFloorTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, s, s);

  // Subtle cream-grey marble veining across 2x2 large-format tiles
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(148, 163, 184, 0.16)' : 'rgba(203, 213, 225, 0.24)';
    ctx.lineWidth = 1.5 + (i % 3);
    ctx.beginPath();
    const y0 = (i * 37) % s;
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(s * 0.33, (y0 + 48) % s, s * 0.66, (y0 - 36 + s) % s, s, (y0 + 18) % s);
    ctx.stroke();
  }

  // Tile grout lines (2x2 tiles per repeat)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.38)';
  ctx.lineWidth = 3;
  [0, 256].forEach((pos) => {
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(s, pos);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 6);
  tex.anisotropy = 4;
  return tex;
}

function createVietcombankFacadeSignTex(): THREE.CanvasTexture {
  const w = 1536;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const glassGrad = ctx.createLinearGradient(0, 0, w, h);
  glassGrad.addColorStop(0, '#85cbf9');
  glassGrad.addColorStop(0.5, '#a8dcfe');
  glassGrad.addColorStop(1, '#75bff4');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(56, 112, 160, 0.35)';
  ctx.lineWidth = 3;
  [384, 768, 1152].forEach((mx) => {
    ctx.beginPath();
    ctx.moveTo(mx, 0);
    ctx.lineTo(mx, h);
    ctx.stroke();
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#005d35';
  ctx.font = '900 112px "Segoe UI", system-ui, -apple-system, sans-serif';
  ctx.fillText('Vietcombank', 665, 112);

  drawVietcombankEmblem(ctx, 1125, 102, 134);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CHI NHÁNH ĐÀ NẴNG  •  PGD ĐẠI LỘ AEON ĐÔNG', 685, 198);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAtmBoothFasciaTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1b4328';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 92px "Segoe UI", system-ui, -apple-system, sans-serif';
  ctx.fillText('Vietcombank', 445, 98);

  drawVietcombankEmblem(ctx, 815, 94, 96);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAtmBoothSideSignTex(): THREE.CanvasTexture {
  const w = 320;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1b4328';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#65a30d';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  drawVietcombankEmblem(ctx, 250, 56, 54);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, sans-serif';
  ctx.fillText('Vietcombank', 22, 74);

  ctx.fillStyle = '#bef264';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText('24h ATM', 22, 134);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBoothAtmFaceTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Dark forest green housing inside lime surround
  ctx.fillStyle = '#143d23';
  ctx.fillRect(0, 0, w, h);

  // Top Vietcombank header band
  ctx.fillStyle = '#1b5e34';
  ctx.fillRect(10, 12, w - 20, 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Vietcombank', 22, 42);
  drawVietcombankEmblem(ctx, 212, 42, 34);

  // 24h ATM + network card banner strip
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(14, 84, w - 28, 66);
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(18, 88, 66, 58);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('24h', 51, 108);
  ctx.fillText('ATM', 51, 130);

  // Network card chips (Visa / MC / Napas style badges)
  ['#1d4ed8', '#dc2626', '#0ea5e9', '#16a34a'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(96 + i * 36, 94, 30, 20);
  });

  // Backlit screen & keypad bezel
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(18, 164, w - 36, 174);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(28, 174, 128, 98);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(34, 180, 116, 22);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(34, 208, 116, 56);

  // Card slot & receipt slot on right of screen
  ctx.fillStyle = '#334155';
  ctx.fillRect(170, 182, 54, 18);
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(174, 186, 46, 8);
  ctx.fillStyle = '#475569';
  ctx.fillRect(170, 224, 54, 48);

  // Keypad + cash dispenser bar
  ctx.fillStyle = '#64748b';
  ctx.fillRect(30, 286, 100, 38);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(142, 290, 82, 26);

  // Lower white service access door panel matching Image 2
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(22, 356, w - 44, 134);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 356, w - 44, 134);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createVietcombankInteriorWallSignTex(subtitle = 'CHUNG NIỀM TIN VỮNG TƯƠNG LAI  •  VCB DIGIBANK'): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#005633';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#006b3f';
  ctx.fillRect(14, 14, w - 28, h - 28);
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  drawVietcombankEmblem(ctx, 140, 112, 106);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 72px system-ui, sans-serif';
  ctx.fillText('Vietcombank', 225, 98);

  ctx.fillStyle = '#bbf7d0';
  ctx.font = '700 25px system-ui, sans-serif';
  ctx.fillText(subtitle, 228, 174);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createTotemPylonTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#006b3f';
  ctx.fillRect(0, 0, w, 190);

  drawVietcombankEmblem(ctx, 128, 92, 104);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#006b3f';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText('Vietcombank', 128, 252);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('ATM 24/7', 128, 326);
  ctx.fillStyle = '#15803d';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('DIGIBANK', 128, 374);
  ctx.fillText('PRIORITY', 128, 414);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createQueueLedTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#86efac';
  ctx.font = '800 28px monospace';
  ctx.fillText('MỜI KHÁCH HÀNG  •  COUNTER 02', 256, 46);

  ctx.fillStyle = '#4ade80';
  ctx.font = '900 58px monospace';
  ctx.fillText('A-108  →  QUẦY 02', 256, 112);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createExchangeRateTex(): THREE.CanvasTexture {
  const w = 768;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#071422';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#006b3f';
  ctx.fillRect(0, 0, w, 86);
  drawVietcombankEmblem(ctx, 56, 43, 52);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('TỶ GIÁ NGOẠI TỆ  •  FOREIGN EXCHANGE', 102, 44);

  // Table headers
  ctx.fillStyle = '#102a43';
  ctx.fillRect(20, 102, w - 40, 48);
  ctx.fillStyle = '#86efac';
  ctx.font = '700 24px monospace';
  ctx.fillText('MÃ NT', 42, 126);
  ctx.fillText('MUA TIỀN MẶT', 210, 126);
  ctx.fillText('MUA CK', 430, 126);
  ctx.fillText('BÁN RA', 610, 126);

  const rows: Array<[string, string, string, string]> = [
    ['USD', '25,180', '25,210', '25,450'],
    ['EUR', '27,040', '27,120', '28,280'],
    ['JPY', '161.40', '163.05', '170.85'],
    ['GBP', '31,720', '32,040', '33,060'],
    ['AUD', '16,290', '16,450', '16,990'],
    ['SGD', '18,620', '18,810', '19,410'],
  ];

  rows.forEach((r, i) => {
    const ry = 178 + i * 52;
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(20, ry - 22, w - 40, 44);
    }
    ctx.fillStyle = '#fde047';
    ctx.font = '800 26px monospace';
    ctx.fillText(r[0], 42, ry);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 25px monospace';
    ctx.fillText(r[1], 215, ry);
    ctx.fillText(r[2], 425, ry);
    ctx.fillStyle = '#4ade80';
    ctx.fillText(r[3], 605, ry);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCounterBadgeTex(num: string, title: string): THREE.CanvasTexture {
  const w = 320;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#006b3f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText(`QUẦY ${num}`, w * 0.5, 44);
  ctx.fillStyle = '#bbf7d0';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(title, w * 0.5, 92);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAtmScreenTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 224;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f0fdf4';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#006b3f';
  ctx.fillRect(0, 0, w, 46);
  drawVietcombankEmblem(ctx, 28, 23, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VCB Digibank ATM', 50, 23);

  ctx.fillStyle = '#15803d';
  ['RÚT TIỀN', 'CHUYỂN KHOẢN'].forEach((label, i) => {
    ctx.fillRect(14, 68 + i * 64, 104, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 66, 91 + i * 64);
    ctx.fillStyle = '#15803d';
  });
  ['NỘP TIỀN', 'VẤN TIN SỐ DƯ'].forEach((label, i) => {
    ctx.fillRect(138, 68 + i * 64, 104, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 190, 91 + i * 64);
    ctx.fillStyle = '#15803d';
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createServicePosterTex(headline: string, line2: string, accentHex: string): THREE.CanvasTexture {
  const w = 384;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#005633');
  grad.addColorStop(1, '#022c22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  drawVietcombankEmblem(ctx, w * 0.5, 110, 96);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.fillText(headline, w * 0.5, 250);

  ctx.fillStyle = accentHex;
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(line2, w * 0.5, 315);

  ctx.fillStyle = '#bbf7d0';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('VIETCOMBANK  •  24/7', w * 0.5, 430);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createVipBoardroomScreenTex(): THREE.CanvasTexture {
  const w = 640;
  const h = 360;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#091926';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#006b3f';
  ctx.fillRect(0, 0, w, 54);
  drawVietcombankEmblem(ctx, 36, 27, 34);
  ctx.fillStyle = '#fef08a';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VCB PRIORITY  •  PORTFOLIO INSIGHTS', 68, 27);

  // Bar chart
  const heights = [90, 130, 115, 165, 195, 225];
  heights.forEach((bh, i) => {
    ctx.fillStyle = i >= 4 ? '#4ade80' : '#0284c7';
    ctx.fillRect(62 + i * 88, 310 - bh, 52, bh);
  });

  // Trend line
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 4;
  ctx.beginPath();
  heights.forEach((bh, i) => {
    const px = 88 + i * 88;
    const py = 296 - bh;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBankGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(220, 252, 231, 0.36)');
  grad.addColorStop(0.55, 'rgba(187, 247, 208, 0.14)');
  grad.addColorStop(1, 'rgba(187, 247, 208, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Helper: Composite Indoor Ornamental Potted Plant (Ceramic pot + soil + branching foliage)
function buildIndoorPlant(x: number, y: number, z: number, scale = 1.0): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);

  const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.08 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3b2818, roughness: 0.95 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4d3319, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
  const leafTopMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.46, 12), potMat);
  pot.position.y = 0.23;
  grp.add(pot);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.05, 12), potMat);
  rim.position.y = 0.45;
  grp.add(rim);

  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 12), soilMat);
  soil.position.y = 0.44;
  grp.add(soil);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.85, 8), stemMat);
  trunk.position.y = 0.82;
  grp.add(trunk);

  [
    [0, 1.32, 0, 0.36],
    [-0.18, 1.12, 0.14, 0.26],
    [0.20, 1.08, -0.14, 0.27],
    [0.14, 1.24, 0.18, 0.24],
    [-0.16, 1.22, -0.16, 0.25],
  ].forEach(([lx, ly, lz, r], idx) => {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), idx % 2 === 0 ? leafMat : leafTopMat);
    crown.position.set(lx, ly, lz);
    crown.scale.set(1.0, 0.78, 1.0);
    grp.add(crown);
  });

  return grp;
}

// Helper: Composite Ergonomic Office Swivel Chair
function buildOfficeChair(
  x: number,
  y: number,
  z: number,
  yaw: number,
  leatherMat: THREE.Material,
  chromeMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), chromeMat);
  base.position.y = 0.04;
  grp.add(base);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.38, 8), chromeMat);
  stem.position.y = 0.24;
  grp.add(stem);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.46), leatherMat);
  seat.position.y = 0.46;
  grp.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.09), leatherMat);
  back.position.set(0, 0.74, -0.20);
  back.rotation.x = -0.08;
  grp.add(back);

  [-0.26, 0.26].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), leatherMat);
    arm.position.set(ax, 0.62, -0.02);
    grp.add(arm);
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.05), chromeMat);
    armPost.position.set(ax, 0.54, 0.02);
    grp.add(armPost);
  });

  return grp;
}

export function createVietcombankStructure(): VietcombankBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = 238.0;
  const maxX = 264.0;
  const midX = 251.0; // 26.0m width
  const backZ = -10.0;
  const frontZ = 11.4;
  const midZ = (backZ + frontZ) * 0.5;
  const bldgDepth = frontZ - backZ; // 21.4m

  // Anti-Glare Architectural Materials (matte-satin finishes prevent washed-out white sun hotspots)
  const marbleFloorTex = createMarbleFloorTex();
  const marbleFloorMat = new THREE.MeshStandardMaterial({
    map: marbleFloorTex,
    color: 0xe2e8f0,
    roughness: 0.72,
    metalness: 0.0,
  });
  const whiteCladMat = new THREE.MeshStandardMaterial({ color: 0xe4e8ee, roughness: 0.82, metalness: 0.0 });
  const seamDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.25 });
  const graniteDarkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55, metalness: 0.12 });
  const graniteStepMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78, metalness: 0.0 });
  const forecourtPaveMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
  const lobbyWallMat = new THREE.MeshStandardMaterial({ color: 0xe5e9f0, roughness: 0.82 });
  const vcbGreenMat = new THREE.MeshStandardMaterial({ color: 0x006b3f, roughness: 0.62, metalness: 0.05 });
  const vcbBoothDarkGreenMat = new THREE.MeshStandardMaterial({ color: 0x1b4328, roughness: 0.74, metalness: 0.04 });
  const vcbBoothLimeMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.58, metalness: 0.05 });
  const vcbBoothPlinthMat = new THREE.MeshStandardMaterial({ color: 0x6b655e, roughness: 0.86, metalness: 0.02 });
  const vcbMintCarpetMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.92 });
  const welcomeMatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
  const oakWoodMat = new THREE.MeshStandardMaterial({ color: 0x926239, roughness: 0.68 });
  const darkWalnutMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.62 });
  const darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.58, metalness: 0.04 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.36, metalness: 0.65 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.38, metalness: 0.65 });
  // Non-glare tinted architectural glass (higher roughness removes mirror sun streaks)
  const blueGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.28,
    roughness: 0.65,
    metalness: 0.0,
  });
  const doorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.30,
    roughness: 0.65,
    metalness: 0.0,
  });
  const canopyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.34,
    roughness: 0.65,
    metalness: 0.0,
  });
  const ledPanelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.14,
    roughness: 0.65,
  });
  const emeraldLedMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x16a34a,
    emissiveIntensity: 0.22,
    roughness: 0.55,
  });

  // =========================================================================
  // 1. FORECOURT, 3 WIDE GRANITE STEPS & LANDSCAPING
  // =========================================================================
  const forecourt = new THREE.Mesh(new THREE.BoxGeometry(28.2, 0.10, 4.4), forecourtPaveMat);
  forecourt.position.set(midX - 1.1, 0.01, 13.5);
  staticGroup.add(forecourt);

  // 3 Wide Granite Steps leading up to Y = 0.36 podium (X = 243.5 .. 258.5, Z = 11.4 .. 13.5)
  [
    { z: 13.15, d: 0.70, h: 0.12 },
    { z: 12.45, d: 0.70, h: 0.24 },
    { z: 11.75, d: 0.70, h: 0.36 },
  ].forEach((st) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(15.0, st.h, st.d), graniteStepMat);
    step.position.set(midX, st.h * 0.5, st.z);
    staticGroup.add(step);
  });

  // Divider hedge between Ron Béo (235.8) and Vietcombank (238.0)
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.88 });
  const dividerHedge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 21.8), hedgeMat);
  dividerHedge.position.set(236.9, 0.375, 0.9);
  staticGroup.add(dividerHedge);

  // West Forecourt Planter Box with Ornamental Shrubs
  const westPlanter = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.52, 1.1), graniteStepMat);
  westPlanter.position.set(240.7, 0.26, 12.9);
  staticGroup.add(westPlanter);
  const westShrub = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.48, 0.76), hedgeMat);
  westShrub.position.set(240.7, 0.68, 12.9);
  staticGroup.add(westShrub);

  // Vietcombank 24/7 Totem Pylon on Left Forecourt
  const totemTex = createTotemPylonTex();
  const totemMat = new THREE.MeshStandardMaterial({
    map: totemTex,
    emissive: 0xffffff,
    emissiveMap: totemTex,
    emissiveIntensity: 0.05,
    roughness: 0.65,
  });
  const totem = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.8, 0.32), totemMat);
  totem.position.set(239.2, 1.4, 14.35);
  staticGroup.add(totem);

  // East Forecourt Customer Motorbike Parking Bay
  const bikeColors = [0xdc2626, 0x0f172a, 0xe2e8f0, 0x0284c7];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
  [259.2, 260.6, 262.0, 263.3].forEach((bx, idx) => {
    const mGrp = new THREE.Group();
    mGrp.position.set(bx, 0.06, 13.7);
    mGrp.rotation.y = -0.22;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.44, 1.45),
      new THREE.MeshStandardMaterial({ color: bikeColors[idx % bikeColors.length], roughness: 0.35, metalness: 0.3 })
    );
    body.position.y = 0.52;
    mGrp.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.74), seatMat);
    seat.position.set(0, 0.78, -0.18);
    mGrp.add(seat);
    const frontShield = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), body.material);
    frontShield.position.set(0, 0.72, 0.56);
    frontShield.rotation.x = -0.2;
    mGrp.add(frontShield);
    const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.06), chromeMat);
    handlebar.position.set(0, 1.04, 0.48);
    mGrp.add(handlebar);
    [0.54, -0.54].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.24, wz);
      mGrp.add(wheel);
    });
    staticGroup.add(mGrp);
  });

  // =========================================================================
  // 2. FLOOR SLABS, EXTERIOR SHELL & WHITE COMPOSITE FRAME
  // =========================================================================
  const floor1Slab = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.36, bldgDepth), marbleFloorMat);
  floor1Slab.position.set(midX, 0.18, midZ);
  staticGroup.add(floor1Slab);

  const f2WestSlab = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.34, bldgDepth), marbleFloorMat);
  f2WestSlab.position.set(248.8, VIETCOMBANK_FLOOR2_Y - 0.17, midZ);
  staticGroup.add(f2WestSlab);
  const f2EastSouthSlab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.34, 12.8), marbleFloorMat);
  f2EastSouthSlab.position.set(261.8, VIETCOMBANK_FLOOR2_Y - 0.17, 5.0);
  staticGroup.add(f2EastSouthSlab);
  const f2EastNorthSlab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.34, 2.2), marbleFloorMat);
  f2EastNorthSlab.position.set(261.8, VIETCOMBANK_FLOOR2_Y - 0.17, -8.9);
  staticGroup.add(f2EastNorthSlab);

  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(26.2, 0.45, bldgDepth + 0.2), whiteCladMat);
  roofSlab.position.set(midX, 11.65, midZ);
  staticGroup.add(roofSlab);

  const northWall = new THREE.Mesh(new THREE.BoxGeometry(26.0, 11.5, 0.45), lobbyWallMat);
  northWall.position.set(midX, 5.95, backZ + 0.22);
  staticGroup.add(northWall);

  [minX + 0.25, maxX - 0.25].forEach((wx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.50, 11.5, bldgDepth), whiteCladMat);
    sideWall.position.set(wx, 5.95, midZ);
    staticGroup.add(sideWall);
  });

  // Left & Right White Aluminum Composite Facade Piers
  [minX + 1.5, maxX - 1.5].forEach((px) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(3.0, 12.1, 0.65), whiteCladMat);
    pier.position.set(px, 6.05, frontZ);
    staticGroup.add(pier);

    [3.0, 6.0, 9.0].forEach((sy) => {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.08, 0.68), seamDarkMat);
      seam.position.set(px, sy, frontZ);
      staticGroup.add(seam);
    });
  });

  const topParapetBeam = new THREE.Mesh(new THREE.BoxGeometry(26.2, 0.95, 0.72), whiteCladMat);
  topParapetBeam.position.set(midX, 11.65, frontZ);
  staticGroup.add(topParapetBeam);

  const upperSpandrelBeam = new THREE.Mesh(new THREE.BoxGeometry(20.2, 0.42, 0.56), whiteCladMat);
  upperSpandrelBeam.position.set(midX, 8.82, frontZ);
  staticGroup.add(upperSpandrelBeam);

  const midFloorBeam = new THREE.Mesh(new THREE.BoxGeometry(20.2, 0.46, 0.56), whiteCladMat);
  midFloorBeam.position.set(midX, 4.82, frontZ);
  staticGroup.add(midFloorBeam);

  // =========================================================================
  // 3. TOP VIETCOMBANK SIGNAGE GLASS SPANDREL + FLOOR 2 7-BAY CURTAIN WALL
  // =========================================================================
  const signTex = createVietcombankFacadeSignTex();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: 0xffffff,
    emissiveMap: signTex,
    emissiveIntensity: 0.0,
    roughness: 0.72,
    metalness: 0.0,
  });

  const signGlass = new THREE.Mesh(new THREE.BoxGeometry(20.0, 2.24, 0.16), signMat);
  signGlass.position.set(midX, 10.12, frontZ - 0.04);
  staticGroup.add(signGlass);

  const f2Glass = new THREE.Mesh(new THREE.BoxGeometry(20.0, 3.58, 0.08), blueGlassMat);
  f2Glass.position.set(midX, 6.84, frontZ - 0.06);
  staticGroup.add(f2Glass);

  for (let i = 1; i <= 6; i++) {
    const mx = 241.0 + (20.0 / 7) * i;
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.66, 0.34), whiteCladMat);
    mullion.position.set(mx, 6.84, frontZ - 0.02);
    staticGroup.add(mullion);
  }

  // =========================================================================
  // 4. FLOOR 1 DARK GRANITE PORTAL, SLIDING DOORS & SUSPENDED GLASS CANOPY
  // =========================================================================
  const leftF1Glass = new THREE.Mesh(new THREE.BoxGeometry(5.5, 4.24, 0.08), blueGlassMat);
  leftF1Glass.position.set(243.75, 2.48, frontZ - 0.04);
  staticGroup.add(leftF1Glass);
  const rightF1Glass = new THREE.Mesh(new THREE.BoxGeometry(5.5, 4.24, 0.08), blueGlassMat);
  rightF1Glass.position.set(258.25, 2.48, frontZ - 0.04);
  staticGroup.add(rightF1Glass);

  [246.9, 255.1].forEach((gx) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.84, 4.26, 0.62), graniteDarkMat);
    col.position.set(gx, 2.49, frontZ + 0.06);
    staticGroup.add(col);
  });
  const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(9.04, 0.66, 0.64), graniteDarkMat);
  portalHeader.position.set(midX, 4.29, frontZ + 0.06);
  staticGroup.add(portalHeader);

  [248.25, 253.75].forEach((sx) => {
    const sidePane = new THREE.Mesh(new THREE.BoxGeometry(1.92, 3.60, 0.08), doorGlassMat);
    sidePane.position.set(sx, 2.16, frontZ - 0.04);
    staticGroup.add(sidePane);
  });

  const doorLeft = new THREE.Group();
  doorLeft.position.set(250.1, 2.16, frontZ + 0.02);
  doorLeft.userData.noMerge = true;
  const dlGlass = new THREE.Mesh(new THREE.BoxGeometry(1.80, 3.56, 0.06), doorGlassMat);
  doorLeft.add(dlGlass);
  const dlHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), chromeMat);
  dlHandle.position.set(0.76, -0.1, 0.06);
  doorLeft.add(dlHandle);
  staticGroup.add(doorLeft);

  const doorRight = new THREE.Group();
  doorRight.position.set(251.9, 2.16, frontZ + 0.02);
  doorRight.userData.noMerge = true;
  const drGlass = new THREE.Mesh(new THREE.BoxGeometry(1.80, 3.56, 0.06), doorGlassMat);
  doorRight.add(drGlass);
  const drHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), chromeMat);
  drHandle.position.set(-0.76, -0.1, 0.06);
  doorRight.add(drHandle);
  staticGroup.add(doorRight);

  const canopyGlass = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.09, 2.45), canopyGlassMat);
  canopyGlass.position.set(midX, 4.72, frontZ + 1.25);
  staticGroup.add(canopyGlass);
  const canopyTrimFront = new THREE.Mesh(new THREE.BoxGeometry(10.06, 0.12, 0.08), chromeMat);
  canopyTrimFront.position.set(midX, 4.72, frontZ + 2.46);
  staticGroup.add(canopyTrimFront);

  [247.0, 249.65, 252.35, 255.0].forEach((rx) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.55, 8), chromeMat);
    rod.position.set(rx, 5.25, frontZ + 1.12);
    rod.rotation.x = -1.12;
    staticGroup.add(rod);
  });

  // =========================================================================
  // 5. FLOOR 1 DETAILED INTERIOR BANKING HALL & SWITCHBACK STAIRCASE
  // =========================================================================
  // Track indoor illuminated display panels so they turn off after 18:00 while outdoor 24h ATM stays on 24/24
  const indoorDisplayMats: Array<{ mat: THREE.MeshStandardMaterial; dayGlow: number; nightGlow: number }> = [];

  // Ceilings split cleanly around NE Stairwell Void (X = 259.6..263.6, Z = -7.8..-1.4) so Floor 2 stairs never clip!
  const f1WestCeil = new THREE.Mesh(new THREE.BoxGeometry(21.2, 0.12, bldgDepth - 0.6), whiteCladMat);
  f1WestCeil.position.set(249.0, 4.60, midZ);
  staticGroup.add(f1WestCeil);
  const f1EastSouthCeil = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 12.5), whiteCladMat);
  f1EastSouthCeil.position.set(261.6, 4.60, 4.85);
  staticGroup.add(f1EastSouthCeil);
  const f1EastNorthCeil = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 1.9), whiteCladMat);
  f1EastNorthCeil.position.set(261.6, 4.60, -8.75);
  staticGroup.add(f1EastNorthCeil);

  const f2Ceiling = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.12, bldgDepth - 0.6), whiteCladMat);
  f2Ceiling.position.set(midX, 8.75, midZ);
  staticGroup.add(f2Ceiling);

  [4.50, 8.66].forEach((cy, floorIdx) => {
    // Perimeter emerald cove glow rails
    const coveN = new THREE.Mesh(new THREE.BoxGeometry(floorIdx === 0 ? 20.4 : 23.0, 0.06, 0.12), emeraldLedMat);
    coveN.position.set(floorIdx === 0 ? 249.2 : midX, cy - 0.02, -8.8);
    staticGroup.add(coveN);
    const coveW = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 18.8), emeraldLedMat);
    coveW.position.set(239.2, cy - 0.02, 0.6);
    staticGroup.add(coveW);

    for (let lx = 241.0; lx <= 261.0; lx += 4.0) {
      for (let lz = -6.0; lz <= 8.0; lz += 4.6) {
        // Keep Floor 1 ceiling opening clear above the NE stairwell (X >= 259, Z <= -1)
        if (floorIdx === 0 && lx >= 258.5 && lz <= -1.0) continue;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.2), ledPanelMat);
        panel.position.set(lx, cy, lz);
        staticGroup.add(panel);
      }
    }
    // Ceiling CCTV Dome Cameras
    [
      [239.6, 9.6],
      [257.2, -7.8],
    ].forEach(([cx, cz]) => {
      const camBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.06, 10), whiteCladMat);
      camBase.position.set(cx, cy + 0.02, cz);
      staticGroup.add(camBase);
      const camDome = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), graniteDarkMat);
      camDome.position.set(cx, cy - 0.03, cz);
      staticGroup.add(camDome);
    });
  });

  // Entrance Welcome Carpet Mat & Brass Floor Threshold Strip
  const welcomeMat = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.025, 1.5), welcomeMatMat);
  welcomeMat.position.set(251.0, VIETCOMBANK_PODIUM_Y + 0.012, 10.3);
  staticGroup.add(welcomeMat);
  const matBorder = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.02, 1.58), vcbGreenMat);
  matBorder.position.set(251.0, VIETCOMBANK_PODIUM_Y + 0.008, 10.3);
  staticGroup.add(matBorder);

  // Structural Hall Columns (West-Center & East-Center) with Granite Plinth & Fluted Oak Cladding
  [
    [244.8, 0.4],
    [258.8, 0.8],
  ].forEach(([cx, cz]) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.45, 0.76), graniteDarkMat);
    plinth.position.set(cx, VIETCOMBANK_PODIUM_Y + 0.225, cz);
    staticGroup.add(plinth);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.64, 3.8, 0.64), oakWoodMat);
    core.position.set(cx, VIETCOMBANK_PODIUM_Y + 2.35, cz);
    staticGroup.add(core);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.22, 0.74), chromeMat);
    cap.position.set(cx, 4.46, cz);
    staticGroup.add(cap);
  });

  // West Wall Architectural Slats, Exchange Rate LED Board & Framed Service Posters
  for (let sz = -6.8; sz <= 8.8; sz += 0.42) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.85, 0.14), oakWoodMat);
    slat.position.set(minX + 0.55, VIETCOMBANK_PODIUM_Y + 1.95, sz);
    staticGroup.add(slat);
  }

  const fxTex = createExchangeRateTex();
  const fxMat = new THREE.MeshStandardMaterial({
    map: fxTex,
    emissive: 0xffffff,
    emissiveMap: fxTex,
    emissiveIntensity: 0.10,
    roughness: 0.65,
  });
  indoorDisplayMats.push({ mat: fxMat, dayGlow: 0.10, nightGlow: 0.34 });
  const fxFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.82, 2.75), graniteDarkMat);
  fxFrame.position.set(minX + 0.62, VIETCOMBANK_PODIUM_Y + 2.55, 4.5);
  staticGroup.add(fxFrame);
  const fxScreen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.66, 2.56), fxMat);
  fxScreen.position.set(minX + 0.67, VIETCOMBANK_PODIUM_Y + 2.55, 4.5);
  staticGroup.add(fxScreen);

  // Two Framed Service Posters on West Wall flanking the FX Board
  [
    { z: 8.1, h1: 'VCB DIGIBANK', h2: 'CHUYỂN TIỀN 0 ĐỒNG', accent: '#86efac' },
    { z: 0.8, h1: 'VISA SIGNATURE', h2: 'HOÀN TIỀN ĐẶC QUYỀN', accent: '#fde047' },
  ].forEach((p) => {
    const pTex = createServicePosterTex(p.h1, p.h2, p.accent);
    const pMat = new THREE.MeshStandardMaterial({
      map: pTex,
      emissive: 0xffffff,
      emissiveMap: pTex,
      emissiveIntensity: 0.04,
      roughness: 0.68,
    });
    indoorDisplayMats.push({ mat: pMat, dayGlow: 0.04, nightGlow: 0.22 });
    const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.65, 1.24), brassMat);
    pFrame.position.set(minX + 0.61, VIETCOMBANK_PODIUM_Y + 2.45, p.z);
    staticGroup.add(pFrame);
    const pFace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.52, 1.12), pMat);
    pFace.position.set(minX + 0.64, VIETCOMBANK_PODIUM_Y + 2.45, p.z);
    staticGroup.add(pFace);
  });

  // Rear Backdrop Feature Wall: Vertical Oak Slats + Illuminated Vietcombank Wall Sign + Vault Room Door + Credenza Cabinets
  for (let rx = 240.0; rx <= 257.6; rx += 0.45) {
    const rearSlat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.15, 0.08), oakWoodMat);
    rearSlat.position.set(rx, VIETCOMBANK_PODIUM_Y + 2.08, backZ + 0.49);
    staticGroup.add(rearSlat);
  }

  const wallLogoTex = createVietcombankInteriorWallSignTex();
  const wallLogoMat = new THREE.MeshStandardMaterial({
    map: wallLogoTex,
    emissive: 0xffffff,
    emissiveMap: wallLogoTex,
    emissiveIntensity: 0.06,
    roughness: 0.65,
  });
  indoorDisplayMats.push({ mat: wallLogoMat, dayGlow: 0.06, nightGlow: 0.30 });
  const backBrandPanel = new THREE.Mesh(new THREE.BoxGeometry(11.6, 2.35, 0.16), wallLogoMat);
  backBrandPanel.position.set(248.4, 3.05, backZ + 0.58);
  staticGroup.add(backBrandPanel);

  // Rear Credenza Filing & Printer Cabinets (X = 241.0..257.8, Z = -9.1..-8.3)
  const credenza = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.96, 0.80), whiteCladMat);
  credenza.position.set(250.4, VIETCOMBANK_PODIUM_Y + 0.48, -8.9);
  staticGroup.add(credenza);
  const credenzaTop = new THREE.Mesh(new THREE.BoxGeometry(14.9, 0.06, 0.86), darkWalnutMat);
  credenzaTop.position.set(250.4, VIETCOMBANK_PODIUM_Y + 0.99, -8.9);
  staticGroup.add(credenzaTop);
  // Printer & Ledger Binders on Credenza
  const backPrinter = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.62, 0.65), graniteDarkMat);
  backPrinter.position.set(256.2, VIETCOMBANK_PODIUM_Y + 1.33, -8.9);
  staticGroup.add(backPrinter);
  [244.5, 245.1, 248.0, 248.6, 252.2, 252.8].forEach((bx, idx) => {
    const binder = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.34, 0.28),
      idx % 2 === 0 ? vcbGreenMat : darkLeatherMat
    );
    binder.position.set(bx, VIETCOMBANK_PODIUM_Y + 1.19, -8.95);
    staticGroup.add(binder);
  });

  // Reinforced Brushed Steel Bank Vault Door on NW Rear Corner (X = 240.0, Z = -9.35)
  const vaultFrame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.65, 0.22), graniteDarkMat);
  vaultFrame.position.set(240.2, VIETCOMBANK_PODIUM_Y + 1.325, -9.35);
  staticGroup.add(vaultFrame);
  const vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.42, 0.14), chromeMat);
  vaultDoor.position.set(240.2, VIETCOMBANK_PODIUM_Y + 1.26, -9.28);
  staticGroup.add(vaultDoor);
  const vaultWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), brassMat);
  vaultWheel.rotation.x = Math.PI / 2;
  vaultWheel.position.set(240.45, VIETCOMBANK_PODIUM_Y + 1.30, -9.18);
  staticGroup.add(vaultWheel);

  // Digital Queue LED Display above Teller Counters
  const queueTex = createQueueLedTex();
  const queueMat = new THREE.MeshStandardMaterial({
    map: queueTex,
    emissive: 0xffffff,
    emissiveMap: queueTex,
    emissiveIntensity: 0.14,
    roughness: 0.6,
  });
  indoorDisplayMats.push({ mat: queueMat, dayGlow: 0.14, nightGlow: 0.38 });
  const queueSign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.05, 0.16), queueMat);
  queueSign.position.set(248.2, 3.82, -4.45);
  staticGroup.add(queueSign);

  // 4 Glass-Partitioned Teller Counters with Number Blades, PCs, Cash Counters, Card Readers & Chairs
  const tellerBase = new THREE.Mesh(new THREE.BoxGeometry(16.6, 1.05, 1.15), whiteCladMat);
  tellerBase.position.set(248.2, VIETCOMBANK_PODIUM_Y + 0.525, -4.5);
  staticGroup.add(tellerBase);
  const tellerKick = new THREE.Mesh(new THREE.BoxGeometry(16.66, 0.14, 1.22), graniteDarkMat);
  tellerKick.position.set(248.2, VIETCOMBANK_PODIUM_Y + 0.07, -4.5);
  staticGroup.add(tellerKick);
  const tellerLedStrip = new THREE.Mesh(new THREE.BoxGeometry(16.56, 0.06, 1.21), emeraldLedMat);
  tellerLedStrip.position.set(248.2, VIETCOMBANK_PODIUM_Y + 0.17, -4.5);
  staticGroup.add(tellerLedStrip);
  const tellerGreenTrim = new THREE.Mesh(new THREE.BoxGeometry(16.66, 0.16, 1.18), vcbGreenMat);
  tellerGreenTrim.position.set(248.2, VIETCOMBANK_PODIUM_Y + 0.94, -4.5);
  staticGroup.add(tellerGreenTrim);
  const tellerTop = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.08, 1.38), graniteStepMat);
  tellerTop.position.set(248.2, VIETCOMBANK_PODIUM_Y + 1.08, -4.5);
  staticGroup.add(tellerTop);
  const tellerScreen = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.95, 0.06), blueGlassMat);
  tellerScreen.position.set(248.2, VIETCOMBANK_PODIUM_Y + 1.60, -4.05);
  staticGroup.add(tellerScreen);

  const counterLabels: Array<[number, string, string]> = [
    [242.0, '01', 'TIỀN MẶT'],
    [246.1, '02', 'CHUYỂN KHOẢN'],
    [250.2, '03', 'THẺ & DIGIBANK'],
    [254.3, '04', 'ƯU TIÊN'],
  ];

  // Glass partition dividers & chrome clamps between teller bays
  [240.0, 244.05, 248.15, 252.25, 256.3].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.05, 0.12), chromeMat);
    post.position.set(px, VIETCOMBANK_PODIUM_Y + 1.60, -4.05);
    staticGroup.add(post);
    const frontRib = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.85, 0.06), vcbGreenMat);
    frontRib.position.set(px, VIETCOMBANK_PODIUM_Y + 0.56, -3.90);
    staticGroup.add(frontRib);
  });

  counterLabels.forEach(([tx, num, sub]) => {
    // Illuminated Quầy 01..04 counter sign blade
    const bTex = createCounterBadgeTex(num, sub);
    const bMat = new THREE.MeshStandardMaterial({
      map: bTex,
      emissive: 0xffffff,
      emissiveMap: bTex,
      emissiveIntensity: 0.06,
      roughness: 0.65,
    });
    indoorDisplayMats.push({ mat: bMat, dayGlow: 0.06, nightGlow: 0.28 });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.44, 0.08), bMat);
    badge.position.set(tx, VIETCOMBANK_PODIUM_Y + 2.28, -4.05);
    staticGroup.add(badge);

    // Dual monitor, keyboard, money counting machine, POS terminal & brochure holder
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.05), graniteDarkMat);
    mon.position.set(tx - 0.18, VIETCOMBANK_PODIUM_Y + 1.34, -4.65);
    staticGroup.add(mon);
    const monStand = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.12), chromeMat);
    monStand.position.set(tx - 0.18, VIETCOMBANK_PODIUM_Y + 1.18, -4.65);
    staticGroup.add(monStand);
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.16), graniteDarkMat);
    kb.position.set(tx - 0.18, VIETCOMBANK_PODIUM_Y + 1.13, -4.85);
    staticGroup.add(kb);

    // Money counting machine (máy đếm tiền)
    const counterMachine = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.22, 0.28), whiteCladMat);
    counterMachine.position.set(tx + 0.48, VIETCOMBANK_PODIUM_Y + 1.23, -4.58);
    staticGroup.add(counterMachine);
    const counterScreen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), emeraldLedMat);
    counterScreen.position.set(tx + 0.48, VIETCOMBANK_PODIUM_Y + 1.30, -4.43);
    staticGroup.add(counterScreen);

    // Customer-side POS card tap terminal & pen stand
    const posPad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.20), graniteDarkMat);
    posPad.position.set(tx + 0.25, VIETCOMBANK_PODIUM_Y + 1.15, -3.92);
    posPad.rotation.x = 0.35;
    staticGroup.add(posPad);
    const greenLeafHolder = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.08), vcbGreenMat);
    greenLeafHolder.position.set(tx - 0.62, VIETCOMBANK_PODIUM_Y + 1.24, -3.92);
    staticGroup.add(greenLeafHolder);

    // Tucked Ergonomic Teller Chair behind counter (Z = -5.75) & Customer Stool in front (Z = -3.65)
    staticGroup.add(buildOfficeChair(tx, VIETCOMBANK_PODIUM_Y, -5.85, 0, darkLeatherMat, chromeMat));
    const custStoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 12), vcbGreenMat);
    custStoolSeat.position.set(tx, VIETCOMBANK_PODIUM_Y + 0.62, -3.62);
    staticGroup.add(custStoolSeat);
    const custStoolStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.56, 8), chromeMat);
    custStoolStem.position.set(tx, VIETCOMBANK_PODIUM_Y + 0.31, -3.62);
    staticGroup.add(custStoolStem);
    const custStoolBase = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.03, 12), chromeMat);
    custStoolBase.position.set(tx, VIETCOMBANK_PODIUM_Y + 0.02, -3.62);
    staticGroup.add(custStoolBase);
  });

  // Upgraded Queue Ticket Kiosk near Entrance (X = 245.5, Z = 8.6)
  const kioskBase = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.64), chromeMat);
  kioskBase.position.set(245.5, VIETCOMBANK_PODIUM_Y + 0.03, 8.6);
  staticGroup.add(kioskBase);
  const kioskStand = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.38, 0.48), whiteCladMat);
  kioskStand.position.set(245.5, VIETCOMBANK_PODIUM_Y + 0.72, 8.6);
  staticGroup.add(kioskStand);
  const kioskGreenStripe = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.24, 0.50), vcbGreenMat);
  kioskGreenStripe.position.set(245.5, VIETCOMBANK_PODIUM_Y + 0.42, 8.6);
  staticGroup.add(kioskGreenStripe);
  const kioskScreen = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.06), ledPanelMat);
  kioskScreen.position.set(245.5, VIETCOMBANK_PODIUM_Y + 1.24, 8.85);
  kioskScreen.rotation.x = -0.38;
  staticGroup.add(kioskScreen);
  const ticketSlip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.10), whiteCladMat);
  ticketSlip.position.set(245.5, VIETCOMBANK_PODIUM_Y + 0.88, 8.88);
  staticGroup.add(ticketSlip);

  // Security Check-in Podium (X = 247.0, Z = 10.0) beside entrance guard
  const secPodium = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.06, 0.52), graniteDarkMat);
  secPodium.position.set(247.05, VIETCOMBANK_PODIUM_Y + 0.53, 10.05);
  staticGroup.add(secPodium);
  const secTrim = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.14, 0.54), vcbGreenMat);
  secTrim.position.set(247.05, VIETCOMBANK_PODIUM_Y + 0.94, 10.05);
  staticGroup.add(secTrim);
  const logBook = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.24), whiteCladMat);
  logBook.position.set(247.05, VIETCOMBANK_PODIUM_Y + 1.08, 10.05);
  staticGroup.add(logBook);

  // Floor 1 Customer Waiting Lounge (Emerald Carpet + Segmented Sofas + Pillows + Coffee Table + Water Cooler)
  const loungeRug = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.02, 5.8), vcbMintCarpetMat);
  loungeRug.position.set(241.9, VIETCOMBANK_PODIUM_Y + 0.01, 4.5);
  staticGroup.add(loungeRug);

  // West Sofa along wall + facing bench
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.20, 4.9), darkWalnutMat);
  sofaBase.position.set(239.9, VIETCOMBANK_PODIUM_Y + 0.10, 4.5);
  staticGroup.add(sofaBase);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.88, 4.9), vcbGreenMat);
  sofaBack.position.set(239.5, VIETCOMBANK_PODIUM_Y + 0.54, 4.5);
  staticGroup.add(sofaBack);
  for (let i = 0; i < 4; i++) {
    const sz = 2.65 + i * 1.22;
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 1.15), vcbGreenMat);
    cushion.position.set(240.0, VIETCOMBANK_PODIUM_Y + 0.31, sz);
    staticGroup.add(cushion);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.38), whiteCladMat);
    pillow.position.set(239.72, VIETCOMBANK_PODIUM_Y + 0.56, sz);
    pillow.rotation.z = -0.18;
    staticGroup.add(pillow);
  }
  const sofaArmN = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.56, 0.20), vcbGreenMat);
  sofaArmN.position.set(239.9, VIETCOMBANK_PODIUM_Y + 0.38, 2.0);
  staticGroup.add(sofaArmN);
  const sofaArmS = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.56, 0.20), vcbGreenMat);
  sofaArmS.position.set(239.9, VIETCOMBANK_PODIUM_Y + 0.38, 7.0);
  staticGroup.add(sofaArmS);

  // Coffee Table with Tea Tray, Cups & Brochures
  const loungeTableTop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 2.45), oakWoodMat);
  loungeTableTop.position.set(242.55, VIETCOMBANK_PODIUM_Y + 0.46, 4.5);
  staticGroup.add(loungeTableTop);
  [
    [242.1, 3.5],
    [243.0, 3.5],
    [242.1, 5.5],
    [243.0, 5.5],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 8), chromeMat);
    leg.position.set(lx, VIETCOMBANK_PODIUM_Y + 0.22, lz);
    staticGroup.add(leg);
  });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.56), darkWalnutMat);
  tray.position.set(242.55, VIETCOMBANK_PODIUM_Y + 0.50, 4.5);
  staticGroup.add(tray);
  [4.35, 4.65].forEach((cz) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.09, 10), whiteCladMat);
    cup.position.set(242.55, VIETCOMBANK_PODIUM_Y + 0.56, cz);
    staticGroup.add(cup);
  });
  const flyerStack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.34), vcbGreenMat);
  flyerStack.position.set(242.55, VIETCOMBANK_PODIUM_Y + 0.51, 3.7);
  staticGroup.add(flyerStack);

  // Customer Drinking Water Dispenser & Brochure Stand against West Wall (X = 239.2, Z = 0.2)
  const coolerBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.05, 0.46), whiteCladMat);
  coolerBody.position.set(239.2, VIETCOMBANK_PODIUM_Y + 0.525, 0.4);
  staticGroup.add(coolerBody);
  const coolerJug = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.48, 12), blueGlassMat);
  coolerJug.position.set(239.2, VIETCOMBANK_PODIUM_Y + 1.29, 0.4);
  staticGroup.add(coolerJug);
  const cupDispenser = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.32, 8), chromeMat);
  cupDispenser.position.set(239.46, VIETCOMBANK_PODIUM_Y + 0.85, 0.52);
  staticGroup.add(cupDispenser);
  const brochureRack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.38, 0.54), chromeMat);
  brochureRack.position.set(239.2, VIETCOMBANK_PODIUM_Y + 0.69, -0.25);
  staticGroup.add(brochureRack);

  // Floor 1 Advisory Consultation Desk (X = 255.6, Z = 2.3) with Monitor, Desk Lamp & 3 Chairs
  const advTableTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.35), oakWoodMat);
  advTableTop.position.set(255.6, VIETCOMBANK_PODIUM_Y + 0.76, 2.3);
  staticGroup.add(advTableTop);
  const advModesty = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.72, 0.10), whiteCladMat);
  advModesty.position.set(255.6, VIETCOMBANK_PODIUM_Y + 0.36, 2.3);
  staticGroup.add(advModesty);
  const advPc = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.04), graniteDarkMat);
  advPc.position.set(255.2, VIETCOMBANK_PODIUM_Y + 0.98, 2.3);
  staticGroup.add(advPc);
  const advLampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.04, 10), brassMat);
  advLampBase.position.set(256.3, VIETCOMBANK_PODIUM_Y + 0.82, 2.55);
  staticGroup.add(advLampBase);
  const advLampShade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 10), vcbGreenMat);
  advLampShade.position.set(256.3, VIETCOMBANK_PODIUM_Y + 1.12, 2.55);
  staticGroup.add(advLampShade);
  staticGroup.add(buildOfficeChair(255.6, VIETCOMBANK_PODIUM_Y, 1.62, 0, darkLeatherMat, chromeMat));
  staticGroup.add(buildOfficeChair(255.0, VIETCOMBANK_PODIUM_Y, 2.98, Math.PI, vcbGreenMat, chromeMat));
  staticGroup.add(buildOfficeChair(256.2, VIETCOMBANK_PODIUM_Y, 2.98, Math.PI, vcbGreenMat, chromeMat));

  // Indoor Potted Ornamental Plants on Floor 1
  staticGroup.add(buildIndoorPlant(239.2, VIETCOMBANK_PODIUM_Y, 10.2, 1.12));
  staticGroup.add(buildIndoorPlant(258.8, VIETCOMBANK_PODIUM_Y, 0.0, 1.05));
  staticGroup.add(buildIndoorPlant(239.2, VIETCOMBANK_PODIUM_Y, -7.8, 1.0));

  // Indoor 24/7 Self-Service VCB Digibank ATM + CDM Kiosks (X = 258.2..263.2, Z = 6.0..10.4)
  const atmScreenTex = createAtmScreenTex();
  const atmUiMat = new THREE.MeshStandardMaterial({
    map: atmScreenTex,
    emissive: 0xffffff,
    emissiveMap: atmScreenTex,
    emissiveIntensity: 0.10,
    roughness: 0.65,
  });
  indoorDisplayMats.push({ mat: atmUiMat, dayGlow: 0.10, nightGlow: 0.30 });

  const atmDivider = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.1, 4.4), vcbGreenMat);
  atmDivider.position.set(262.9, VIETCOMBANK_PODIUM_Y + 1.55, 8.2);
  staticGroup.add(atmDivider);
  const atmHeaderStrip = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 4.45), vcbGreenMat);
  atmHeaderStrip.position.set(261.75, VIETCOMBANK_PODIUM_Y + 2.45, 8.2);
  staticGroup.add(atmHeaderStrip);

  [7.0, 9.3].forEach((az) => {
    const atm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.98, 0.98), whiteCladMat);
    atm.position.set(261.8, VIETCOMBANK_PODIUM_Y + 0.99, az);
    staticGroup.add(atm);
    const atmRecess = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 0.84), graniteDarkMat);
    atmRecess.position.set(261.34, VIETCOMBANK_PODIUM_Y + 1.24, az);
    staticGroup.add(atmRecess);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.56), atmUiMat);
    scr.position.set(261.28, VIETCOMBANK_PODIUM_Y + 1.38, az);
    staticGroup.add(scr);
    const pinPad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.34), chromeMat);
    pinPad.position.set(261.22, VIETCOMBANK_PODIUM_Y + 0.98, az - 0.14);
    staticGroup.add(pinPad);
    const cashSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.36), graniteDarkMat);
    cashSlot.position.set(261.27, VIETCOMBANK_PODIUM_Y + 0.80, az);
    staticGroup.add(cashSlot);
    const cardBezel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.10), emeraldLedMat);
    cardBezel.position.set(261.28, VIETCOMBANK_PODIUM_Y + 1.04, az + 0.24);
    staticGroup.add(cardBezel);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.34, 1.06), vcbGreenMat);
    hood.position.set(261.75, VIETCOMBANK_PODIUM_Y + 2.08, az);
    staticGroup.add(hood);
    // Privacy glass divider wing between the two ATMs
    const privacyWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.55, 0.06), blueGlassMat);
    privacyWing.position.set(261.4, VIETCOMBANK_PODIUM_Y + 1.25, 8.15);
    staticGroup.add(privacyWing);
  });

  // Switchback Interior Staircase in NE Corner (X = 259.6 .. 263.2, Z = -7.8 .. -1.4)
  // Solid enclosed North partition wall + sloped stair stringer beams + flush tread/riser steps + upper handrails
  const stairStepsCount = 10;
  const midY = (VIETCOMBANK_PODIUM_Y + VIETCOMBANK_FLOOR2_Y) * 0.5;

  // Enclosed architectural North & West stairwell walls (prevents floating art or floating risers)
  const stairNorthWall = new THREE.Mesh(new THREE.BoxGeometry(4.0, 8.6, 0.26), lobbyWallMat);
  stairNorthWall.position.set(261.55, 4.45, -7.88);
  staticGroup.add(stairNorthWall);
  const stairWestBaseWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.5, 6.4), lobbyWallMat);
  stairWestBaseWall.position.set(259.58, 2.55, -4.6);
  staticGroup.add(stairWestBaseWall);

  // Sloped structural concrete stair stringer beams supporting Flight 1 & Flight 2 cleanly from below
  const addStairStringer = (sx: number, yStart: number, zStart: number, yEnd: number, zEnd: number) => {
    const dy = yEnd - yStart;
    const dz = zEnd - zStart;
    const len = Math.hypot(dy, dz);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.24, len + 0.30), whiteCladMat);
    beam.position.set(sx, (yStart + yEnd) * 0.5 - 0.14, (zStart + zEnd) * 0.5);
    beam.rotation.x = -Math.atan2(dy, dz);
    staticGroup.add(beam);
  };
  addStairStringer(260.48, VIETCOMBANK_PODIUM_Y, -1.4, midY, -6.0);
  addStairStringer(262.32, midY, -6.0, VIETCOMBANK_FLOOR2_Y, -1.4);

  for (let i = 0; i < stairStepsCount; i++) {
    const t1 = (i + 0.5) / stairStepsCount;
    const y1 = THREE.MathUtils.lerp(VIETCOMBANK_PODIUM_Y, midY, t1);
    const z1 = -1.4 - t1 * 4.6;
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.28, 0.50), graniteStepMat);
    step1.position.set(260.48, y1 - 0.02, z1);
    staticGroup.add(step1);
    const nose1 = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.03, 0.05), brassMat);
    nose1.position.set(260.48, y1 + 0.12, z1 + 0.23);
    staticGroup.add(nose1);

    const y2 = THREE.MathUtils.lerp(midY, VIETCOMBANK_FLOOR2_Y, t1);
    const z2 = -6.0 + t1 * 4.6;
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.28, 0.50), graniteStepMat);
    step2.position.set(262.32, y2 - 0.02, z2);
    staticGroup.add(step2);
    const nose2 = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.03, 0.05), brassMat);
    nose2.position.set(262.32, y2 + 0.12, z2 - 0.23);
    staticGroup.add(nose2);
  }
  const midLanding = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.30, 1.85), graniteStepMat);
  midLanding.position.set(261.4, midY - 0.15, -6.9);
  staticGroup.add(midLanding);

  // Proper Upper Angled Chrome Handrails & Vertical Balusters (+0.92m ABOVE every step — zero inverted/floating rail)
  const addStairHandrail = (rx: number, yStart: number, zStart: number, yEnd: number, zEnd: number) => {
    const dy = yEnd - yStart;
    const dz = zEnd - zStart;
    const len = Math.hypot(dy, dz);
    const railH = 0.92;

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, len + 0.08), chromeMat);
    topRail.position.set(rx, (yStart + yEnd) * 0.5 + railH, (zStart + zEnd) * 0.5);
    topRail.rotation.x = -Math.atan2(dy, dz);
    staticGroup.add(topRail);

    // Mid safety bar parallel to top rail
    const midBar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, len), chromeMat);
    midBar.position.set(rx, (yStart + yEnd) * 0.5 + railH * 0.52, (zStart + zEnd) * 0.5);
    midBar.rotation.x = -Math.atan2(dy, dz);
    staticGroup.add(midBar);

    [0.05, 0.50, 0.95].forEach((pt) => {
      const py = THREE.MathUtils.lerp(yStart, yEnd, pt);
      const pz = THREE.MathUtils.lerp(zStart, zEnd, pt);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, railH, 8), chromeMat);
      post.position.set(rx, py + railH * 0.5, pz);
      staticGroup.add(post);
    });
  };
  // Center divider handrail rails for Flight 1 (West) & Flight 2 (East), plus outer wall side handrails
  addStairHandrail(261.4, VIETCOMBANK_PODIUM_Y, -1.4, midY, -6.0);
  addStairHandrail(261.4, midY, -6.0, VIETCOMBANK_FLOOR2_Y, -1.4);
  addStairHandrail(259.75, VIETCOMBANK_PODIUM_Y, -1.4, midY, -6.0);
  addStairHandrail(263.08, midY, -6.0, VIETCOMBANK_FLOOR2_Y, -1.4);

  // Mid-landing wall art mounted flush on stairNorthWall (Z = -7.75)
  const landingArtTex = createServicePosterTex('VIETCOMBANK', 'PRIORITY LOUNGE ▲', '#fde047');
  const landingArtMat = new THREE.MeshStandardMaterial({
    map: landingArtTex,
    emissive: 0xffffff,
    emissiveMap: landingArtTex,
    emissiveIntensity: 0.04,
    roughness: 0.68,
  });
  indoorDisplayMats.push({ mat: landingArtMat, dayGlow: 0.04, nightGlow: 0.24 });
  const landingArt = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 0.06), landingArtMat);
  landingArt.position.set(261.4, midY + 1.35, -7.72);
  staticGroup.add(landingArt);

  // Stairwell Glass Balustrades on Floor 2 with Chrome Top Rails
  const f2StairRailW = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.05, 6.4), blueGlassMat);
  f2StairRailW.position.set(259.6, VIETCOMBANK_FLOOR2_Y + 0.52, -4.6);
  staticGroup.add(f2StairRailW);
  const f2RailTopW = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 6.48), chromeMat);
  f2RailTopW.position.set(259.6, VIETCOMBANK_FLOOR2_Y + 1.06, -4.6);
  staticGroup.add(f2RailTopW);
  const f2StairRailS = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.05, 0.10), blueGlassMat);
  f2StairRailS.position.set(260.5, VIETCOMBANK_FLOOR2_Y + 0.52, -1.4);
  staticGroup.add(f2StairRailS);
  const f2RailTopS = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.06, 0.14), chromeMat);
  f2RailTopS.position.set(260.5, VIETCOMBANK_FLOOR2_Y + 1.06, -1.4);
  staticGroup.add(f2RailTopS);

  // =========================================================================
  // 6. FLOOR 2 PRIORITY BANKING LOUNGE & CORPORATE CREDIT OFFICE
  // =========================================================================
  // Priority VIP Glass Partition (Z = 3.2) with Chrome Mullions & Frosted Band
  const f2VipDivider = new THREE.Mesh(new THREE.BoxGeometry(14.0, 2.9, 0.08), blueGlassMat);
  f2VipDivider.position.set(246.0, VIETCOMBANK_FLOOR2_Y + 1.45, 3.2);
  staticGroup.add(f2VipDivider);
  const f2VipFrost = new THREE.Mesh(new THREE.BoxGeometry(13.9, 0.52, 0.09), whiteCladMat);
  f2VipFrost.position.set(246.0, VIETCOMBANK_FLOOR2_Y + 1.25, 3.2);
  staticGroup.add(f2VipFrost);
  [239.1, 242.5, 246.0, 249.5, 252.9].forEach((mx) => {
    const mPost = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.95, 0.12), chromeMat);
    mPost.position.set(mx, VIETCOMBANK_FLOOR2_Y + 1.47, 3.2);
    staticGroup.add(mPost);
  });

  // VIP Priority Boardroom Conference Zone (X = 240.0..246.2, Z = 4.5..9.2)
  const vipBoardRug = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.02, 5.2), vcbMintCarpetMat);
  vipBoardRug.position.set(243.1, VIETCOMBANK_FLOOR2_Y + 0.01, 6.8);
  staticGroup.add(vipBoardRug);

  const vipConfTable = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.09, 1.75), darkWalnutMat);
  vipConfTable.position.set(243.1, VIETCOMBANK_FLOOR2_Y + 0.76, 6.8);
  staticGroup.add(vipConfTable);
  [241.5, 244.7].forEach((tx) => {
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.72), graniteDarkMat);
    pedestal.position.set(tx, VIETCOMBANK_FLOOR2_Y + 0.36, 6.8);
    staticGroup.add(pedestal);
  });
  // Speakerphone puck & portfolios on conference table
  const confPhone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.05, 10), graniteDarkMat);
  confPhone.position.set(243.1, VIETCOMBANK_FLOOR2_Y + 0.83, 6.8);
  staticGroup.add(confPhone);
  [241.6, 244.6].forEach((px) => {
    const folder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.42), vcbGreenMat);
    folder.position.set(px, VIETCOMBANK_FLOOR2_Y + 0.82, 6.4);
    staticGroup.add(folder);
    const waterBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), blueGlassMat);
    waterBottle.position.set(px + 0.24, VIETCOMBANK_FLOOR2_Y + 0.91, 6.45);
    staticGroup.add(waterBottle);
  });

  // 6 Executive Conference Chairs neatly tucked around table
  [241.5, 243.1, 244.7].forEach((cx) => {
    staticGroup.add(buildOfficeChair(cx, VIETCOMBANK_FLOOR2_Y, 5.75, 0, darkLeatherMat, chromeMat));
    staticGroup.add(buildOfficeChair(cx, VIETCOMBANK_FLOOR2_Y, 7.85, Math.PI, darkLeatherMat, chromeMat));
  });

  // Wall-mounted 75" Portfolio Dashboard TV on West Wall (X = 238.65, Z = 6.8)
  const tvTex = createVipBoardroomScreenTex();
  const tvMat = new THREE.MeshStandardMaterial({
    map: tvTex,
    emissive: 0xffffff,
    emissiveMap: tvTex,
    emissiveIntensity: 0.12,
    roughness: 0.6,
  });
  indoorDisplayMats.push({ mat: tvMat, dayGlow: 0.12, nightGlow: 0.34 });
  const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.48, 2.58), graniteDarkMat);
  tvBezel.position.set(minX + 0.60, VIETCOMBANK_FLOOR2_Y + 1.95, 6.8);
  staticGroup.add(tvBezel);
  const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.34, 2.42), tvMat);
  tvScreen.position.set(minX + 0.65, VIETCOMBANK_FLOOR2_Y + 1.95, 6.8);
  staticGroup.add(tvScreen);

  // Executive Hospitality Sofa Lounge (X = 248.6..256.0, Z = 4.9..8.9)
  const vipLoungeRug = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.02, 4.4), vcbMintCarpetMat);
  vipLoungeRug.position.set(252.2, VIETCOMBANK_FLOOR2_Y + 0.01, 6.8);
  staticGroup.add(vipLoungeRug);

  const vipSofa = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.44, 1.15), vcbGreenMat);
  vipSofa.position.set(252.2, VIETCOMBANK_FLOOR2_Y + 0.24, 7.9);
  staticGroup.add(vipSofa);
  const vipSofaBack = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.84, 0.26), vcbGreenMat);
  vipSofaBack.position.set(252.2, VIETCOMBANK_FLOOR2_Y + 0.44, 8.38);
  staticGroup.add(vipSofaBack);
  [250.3, 252.2, 254.1].forEach((px) => {
    const pill = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.16), whiteCladMat);
    pill.position.set(px, VIETCOMBANK_FLOOR2_Y + 0.60, 8.15);
    pill.rotation.x = 0.2;
    staticGroup.add(pill);
  });
  const vipCoffee = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 1.15), graniteStepMat);
  vipCoffee.position.set(252.2, VIETCOMBANK_FLOOR2_Y + 0.21, 5.7);
  staticGroup.add(vipCoffee);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.28, 10), whiteCladMat);
  vase.position.set(252.2, VIETCOMBANK_FLOOR2_Y + 0.56, 5.7);
  staticGroup.add(vase);
  const orchid = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 }));
  orchid.position.set(252.2, VIETCOMBANK_FLOOR2_Y + 0.76, 5.7);
  staticGroup.add(orchid);

  // Floor 2 Priority Refreshment & Espresso Bar Counter (X = 259.0..263.2, Z = 7.6..10.5)
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.96, 2.2), whiteCladMat);
  barBase.position.set(261.2, VIETCOMBANK_FLOOR2_Y + 0.48, 9.2);
  staticGroup.add(barBase);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.08, 2.32), graniteDarkMat);
  barTop.position.set(261.2, VIETCOMBANK_FLOOR2_Y + 1.00, 9.2);
  staticGroup.add(barTop);
  const espressoMachine = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.58, 0.55), chromeMat);
  espressoMachine.position.set(261.8, VIETCOMBANK_FLOOR2_Y + 1.33, 9.5);
  staticGroup.add(espressoMachine);
  const barChiller = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.72), blueGlassMat);
  barChiller.position.set(260.2, VIETCOMBANK_FLOOR2_Y + 1.46, 9.5);
  staticGroup.add(barChiller);

  // Floor 2 Corporate Credit Desks (North side) with Monitors, Binders, Desk Lamps & Chairs
  [243.6, 253.0].forEach((dx) => {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.78, 1.55), whiteCladMat);
    desk.position.set(dx, VIETCOMBANK_FLOOR2_Y + 0.39, -4.4);
    staticGroup.add(desk);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.06, 1.65), oakWoodMat);
    deskTop.position.set(dx, VIETCOMBANK_FLOOR2_Y + 0.81, -4.4);
    staticGroup.add(deskTop);
    const dividerGlass = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.48, 0.05), blueGlassMat);
    dividerGlass.position.set(dx, VIETCOMBANK_FLOOR2_Y + 1.08, -4.4);
    staticGroup.add(dividerGlass);

    [-1.4, 1.4].forEach((mx) => {
      const pc = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.05), graniteDarkMat);
      pc.position.set(dx + mx, VIETCOMBANK_FLOOR2_Y + 1.04, -4.65);
      staticGroup.add(pc);
      const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 10), brassMat);
      lamp.position.set(dx + mx + 0.45, VIETCOMBANK_FLOOR2_Y + 1.08, -4.15);
      staticGroup.add(lamp);
      staticGroup.add(buildOfficeChair(dx + mx, VIETCOMBANK_FLOOR2_Y, -5.65, 0, darkLeatherMat, chromeMat));
      staticGroup.add(buildOfficeChair(dx + mx, VIETCOMBANK_FLOOR2_Y, -3.15, Math.PI, vcbGreenMat, chromeMat));
    });
  });

  // Floor 2 North Backdrop Wall Sign + Archive Cabinets + Branch Photocopier
  const f2LogoTex = createVietcombankInteriorWallSignTex('VIETCOMBANK PRIORITY  •  CORPORATE BANKING');
  const f2LogoMat = new THREE.MeshStandardMaterial({
    map: f2LogoTex,
    emissive: 0xffffff,
    emissiveMap: f2LogoTex,
    emissiveIntensity: 0.06,
    roughness: 0.65,
  });
  indoorDisplayMats.push({ mat: f2LogoMat, dayGlow: 0.06, nightGlow: 0.28 });
  const f2LogoPanel = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.9, 0.14), f2LogoMat);
  f2LogoPanel.position.set(248.2, VIETCOMBANK_FLOOR2_Y + 2.3, backZ + 0.56);
  staticGroup.add(f2LogoPanel);

  const f2Cabinet = new THREE.Mesh(new THREE.BoxGeometry(12.8, 1.15, 0.80), darkWalnutMat);
  f2Cabinet.position.set(247.4, VIETCOMBANK_FLOOR2_Y + 0.575, -8.9);
  staticGroup.add(f2Cabinet);
  const f2Copier = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 0.82), whiteCladMat);
  f2Copier.position.set(255.8, VIETCOMBANK_FLOOR2_Y + 0.525, -8.9);
  staticGroup.add(f2Copier);

  // Indoor Potted Plants on Floor 2
  staticGroup.add(buildIndoorPlant(239.2, VIETCOMBANK_FLOOR2_Y, 10.1, 1.1));
  staticGroup.add(buildIndoorPlant(239.2, VIETCOMBANK_FLOOR2_Y, -8.8, 1.0));
  staticGroup.add(buildIndoorPlant(258.2, VIETCOMBANK_FLOOR2_Y, 10.1, 1.05));

  // =========================================================================
  // 6B. OUTDOOR 3-BAY VIETCOMBANK 24H ATM BOOTH (X = 265.0..274.2, Z = 6.8..15.6)
  // =========================================================================
  const boothMinX = 265.0;
  const boothMaxX = 274.2;
  const boothMidX = (boothMinX + boothMaxX) * 0.5; // 269.6
  const boothBackZ = 6.8;
  const boothFrontZ = 12.8;

  // Paved Sidewalk Apron connecting North Boulevard Sidewalk (Z = 15.6) to ATM Booth Plinth (Z = 12.6)
  const boothApron = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.08, 3.2), forecourtPaveMat);
  boothApron.position.set(boothMidX, 0.02, 14.1);
  staticGroup.add(boothApron);

  // Chamfered Concrete Plinth (Y = 0 .. 0.22) matching Image 2's beveled front corners
  const plinthShape = new THREE.Shape();
  plinthShape.moveTo(-4.6, -3.0);
  plinthShape.lineTo(4.6, -3.0);
  plinthShape.lineTo(4.6, 2.0);
  plinthShape.lineTo(3.5, 3.0);
  plinthShape.lineTo(-3.5, 3.0);
  plinthShape.lineTo(-4.6, 2.0);
  plinthShape.closePath();

  const plinthGeo = new THREE.ExtrudeGeometry(plinthShape, { depth: 0.22, bevelEnabled: false });
  plinthGeo.rotateX(Math.PI / 2);
  const boothPlinth = new THREE.Mesh(plinthGeo, vcbBoothPlinthMat);
  boothPlinth.position.set(boothMidX, 0.22, 9.8);
  staticGroup.add(boothPlinth);

  // Matching Chamfered Deep Forest-Green Canopy Roof Overhang (Y = 3.05 .. 4.10)
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-4.65, -3.05);
  roofShape.lineTo(4.65, -3.05);
  roofShape.lineTo(4.65, 1.95);
  roofShape.lineTo(3.45, 3.08);
  roofShape.lineTo(-3.45, 3.08);
  roofShape.lineTo(-4.65, 1.95);
  roofShape.closePath();

  const boothRoofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1.05, bevelEnabled: false });
  boothRoofGeo.rotateX(Math.PI / 2);
  const boothRoof = new THREE.Mesh(boothRoofGeo, vcbBoothDarkGreenMat);
  boothRoof.position.set(boothMidX, 4.10, 9.8);
  staticGroup.add(boothRoof);

  // Booth Exterior Side Walls & Lime-Green Accent Portal Frame
  [boothMinX + 0.30, boothMaxX - 0.30].forEach((sx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.60, 3.85, 5.2), vcbBoothDarkGreenMat);
    sideWall.position.set(sx, 2.14, 9.4);
    staticGroup.add(sideWall);
  });
  // Lime-green vertical front portal jamb accents
  [boothMinX + 0.56, boothMaxX - 0.56].forEach((lx) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.08, 0.16), vcbBoothLimeMat);
    jamb.position.set(lx, 1.76, 11.82);
    staticGroup.add(jamb);
  });
  // Lime-green horizontal cornice stripe under top fascia (center + chamfered left/right wings)
  const limeTrimCenter = new THREE.Mesh(new THREE.BoxGeometry(6.92, 0.13, 0.14), vcbBoothLimeMat);
  limeTrimCenter.position.set(boothMidX, 3.96, 12.88);
  staticGroup.add(limeTrimCenter);
  const limeTrimBottom = new THREE.Mesh(new THREE.BoxGeometry(6.92, 0.11, 0.14), vcbBoothLimeMat);
  limeTrimBottom.position.set(boothMidX, 3.10, 12.88);
  staticGroup.add(limeTrimBottom);

  [
    { x: boothMidX - 4.02, ry: 0.76 },
    { x: boothMidX + 4.02, ry: -0.76 },
  ].forEach((wing) => {
    const wTrimTop = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.13, 0.14), vcbBoothLimeMat);
    wTrimTop.position.set(wing.x, 3.96, 12.34);
    wTrimTop.rotation.y = wing.ry;
    staticGroup.add(wTrimTop);
    const wTrimBot = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.11, 0.14), vcbBoothLimeMat);
    wTrimBot.position.set(wing.x, 3.10, 12.34);
    wTrimBot.rotation.y = wing.ry;
    staticGroup.add(wTrimBot);
  });

  // Main Centered White "Vietcombank" + Green V-Heart Fascia Signboard
  const boothFasciaTex = createAtmBoothFasciaTex();
  const boothFasciaMat = new THREE.MeshStandardMaterial({
    map: boothFasciaTex,
    emissive: 0xffffff,
    emissiveMap: boothFasciaTex,
    emissiveIntensity: 0.04,
    roughness: 0.7,
  });
  const boothFasciaSign = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.80, 0.10), boothFasciaMat);
  boothFasciaSign.position.set(boothMidX, 3.53, 12.86);
  staticGroup.add(boothFasciaSign);

  // Left Projecting Lightbox Sign ("Vietcombank 24h ATM") matching Image 2 upper-left corner
  const boothSideTex = createAtmBoothSideSignTex();
  const boothSideMat = new THREE.MeshStandardMaterial({
    map: boothSideTex,
    emissive: 0xffffff,
    emissiveMap: boothSideTex,
    emissiveIntensity: 0.05,
    roughness: 0.65,
  });
  const sideBlade = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.72, 0.14), boothSideMat);
  sideBlade.position.set(boothMinX - 0.54, 3.60, 12.1);
  staticGroup.add(sideBlade);
  const sideBracket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.10), seamDarkMat);
  sideBracket.position.set(boothMinX - 0.02, 3.60, 12.1);
  staticGroup.add(sideBracket);

  // Two Sturdy White-Clad Inner Columns flanking the Central ATM Bay (Image 2)
  [267.15, 272.05].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.84, 3.04, 0.84), whiteCladMat);
    col.position.set(cx, 1.74, 11.7);
    staticGroup.add(col);
  });

  // 3-Faceted Light-Cream Interior Wall Housing 3 Lime-Green Vietcombank 24h ATM Kiosks
  const boothAtmFaceTex = createBoothAtmFaceTex();
  const boothAtmFaceMat = new THREE.MeshStandardMaterial({
    map: boothAtmFaceTex,
    emissive: 0xffffff,
    emissiveMap: boothAtmFaceTex,
    emissiveIntensity: 0.06,
    roughness: 0.65,
  });

  const buildBoothAtmBay = (wx: number, wz: number, yaw: number, wallWidth: number) => {
    const bayGrp = new THREE.Group();
    bayGrp.position.set(wx, 0.22, wz);
    bayGrp.rotation.y = yaw;

    // Cream recessed interior wall panel
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, 3.04, 0.34), whiteCladMat);
    backPanel.position.set(0, 1.52, -0.17);
    bayGrp.add(backPanel);

    // Lime-green outer ATM frame surround protruding from wall
    const limeBezel = new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.38, 0.22), vcbBoothLimeMat);
    limeBezel.position.set(0, 1.38, 0.08);
    bayGrp.add(limeBezel);

    // Dark forest-green ATM housing & printed Vietcombank 24h ATM face
    const atmBody = new THREE.Mesh(new THREE.BoxGeometry(1.14, 2.20, 0.26), vcbBoothDarkGreenMat);
    atmBody.position.set(0, 1.38, 0.11);
    bayGrp.add(atmBody);

    const atmFace = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.12, 0.04), boothAtmFaceMat);
    atmFace.position.set(0, 1.38, 0.24);
    bayGrp.add(atmFace);

    // Side privacy hood wings on ATM machine
    [-0.56, 0.56].forEach((hx) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.38, 0.24), whiteCladMat);
      wing.position.set(hx, 1.62, 0.22);
      bayGrp.add(wing);
    });

    staticGroup.add(bayGrp);
  };

  // Rear center wall + left/right 25° chamfered wings matching Image 2's semi-hexagonal ATM layout
  buildBoothAtmBay(boothMidX, 7.55, 0, 3.25);
  buildBoothAtmBay(boothMidX - 2.68, 8.28, 0.44, 2.85);
  buildBoothAtmBay(boothMidX + 2.68, 8.28, -0.44, 2.85);

  // Fill behind angled walls so rear exterior is sealed cleanly
  const boothRearSeal = new THREE.Mesh(new THREE.BoxGeometry(8.6, 3.04, 0.40), vcbBoothDarkGreenMat);
  boothRearSeal.position.set(boothMidX, 1.74, boothBackZ + 0.20);
  staticGroup.add(boothRearSeal);

  // =========================================================================
  // 7. BANK PORTAL ROLLING SHUTTER (08:00-18:00) & LIGHTING (ATM 24/24)
  // =========================================================================
  const shutterTex = createRollingShutterTexture({
    title: 'NGÂN HÀNG VIETCOMBANK',
    hoursLabel: 'MỞ CỬA: 08:00 - 18:00  •  ATM 24/7',
    accentHex: '#006b3f',
    slatDarkHex: '#1e293b',
    slatLightHex: '#475569',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.55, metalness: 0.25 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'vietcombank_main_door',
      axis: 'x',
      pos: frontZ + 0.14,
      spanCenter: midX,
      width: 3.64,
      baseY: VIETCOMBANK_PODIUM_Y,
      topY: 3.96,
      thickness: 0.10,
    },
    shutterMat,
    graniteDarkMat
  );

  // Interior bank lights scale off outside 08:00-18:00; Outdoor 24h ATM Booth stays ON 24/24!
  const f1Light = new THREE.PointLight(0xe0f2fe, 0.8, 30.0, 1.2);
  f1Light.position.set(midX, 4.1, 1.0);
  scaledLights.push({ light: f1Light, dayInt: 0.35, nightInt: 1.9, getScale: () => 1.0 - mainShutter.progress });

  const f2Light = new THREE.PointLight(0xe0f2fe, 0.8, 30.0, 1.2);
  f2Light.position.set(midX, 8.2, 1.5);
  scaledLights.push({ light: f2Light, dayInt: 0.35, nightInt: 2.0, getScale: () => 1.0 - mainShutter.progress });

  const porchLight = new THREE.PointLight(0xdcfce7, 0.6, 22.0, 1.2);
  porchLight.position.set(midX, 4.4, frontZ + 1.4);
  scaledLights.push({ light: porchLight, dayInt: 0.2, nightInt: 1.8, getScale: () => 0.45 + 0.55 * (1.0 - mainShutter.progress) });

  const atmBoothLight = new THREE.PointLight(0xdcfce7, 0.6, 14.0, 1.2);
  atmBoothLight.position.set(boothMidX, 2.95, 10.2);
  scaledLights.push({ light: atmBoothLight, dayInt: 0.2, nightInt: 2.1, getScale: () => 1.0 });

  const poolTex = createBankGlowPoolTex();
  const porchPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(porchPoolMat);
  const porchPool = new THREE.Mesh(new THREE.PlaneGeometry(14.0, 9.0), porchPoolMat);
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(midX, 0.07, frontZ + 2.2);
  staticGroup.add(porchPool);

  // =========================================================================
  // 8. PER-FRAME INTERACTION UPDATE (08:00-18:00 BANK + 24/24 OUTDOOR ATM)
  // =========================================================================
  let doorOpen = 0;
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: VietcombankNpcController | null,
    externalNpcNearDoor?: boolean
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isVietcombankOpenAtHour(h);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (h < 8.0 || h >= 18.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, Math.max(0, mainShutter.progress - dt * 1.2));
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
    } else {
      closingElapsed += dt;
      const canClose = closingElapsed >= 16.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.7) {
        setShutterProgress(mainShutter, Math.min(1.0, mainShutter.progress + dt * 0.85));
      }
    }
    wasOpen = isOpen;

    const nearPortalPlayer =
      isOpen &&
      !!playerPos &&
      playerPos.x >= 246.6 &&
      playerPos.x <= 255.4 &&
      playerPos.z >= 8.2 &&
      playerPos.z <= 16.0 &&
      playerPos.y < 2.2;
    const nearPortalNpc = Boolean(npcController?.hasNpcNearDoor()) || Boolean(externalNpcNearDoor);

    const targetOpen = mainShutter.progress < 0.15 && (nearPortalPlayer || nearPortalNpc) ? 1.0 : 0.0;
    doorOpen = THREE.MathUtils.lerp(doorOpen, targetOpen, Math.min(1, dt * 8.5));
    doorLeft.position.x = 250.1 - doorOpen * 1.55;
    doorRight.position.x = 251.9 + doorOpen * 1.55;

    const openScale = 1.0 - mainShutter.progress;

    // Interior banking lights/displays follow 08:00-18:00 schedule cleanly
    ledPanelMat.emissiveIntensity = (0.14 + lampFactor * 0.34) * openScale;
    emeraldLedMat.emissiveIntensity = (0.18 + lampFactor * 0.36) * openScale;
    for (let i = 0; i < indoorDisplayMats.length; i++) {
      const dm = indoorDisplayMats[i];
      dm.mat.emissiveIntensity = (dm.dayGlow + lampFactor * dm.nightGlow) * openScale;
    }

    // Exterior 24h ATM Booth & 24/7 Totem stay brightly illuminated 24/24!
    signMat.emissiveIntensity = lampFactor * (0.18 + 0.16 * openScale);
    totemMat.emissiveIntensity = 0.04 + lampFactor * 0.34;
    boothFasciaMat.emissiveIntensity = lampFactor * 0.34;
    boothSideMat.emissiveIntensity = 0.04 + lampFactor * 0.36;
    boothAtmFaceMat.emissiveIntensity = 0.06 + lampFactor * 0.36;
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
// VIETCOMBANK NPC CONTROLLER (TELLERS, BANK CUSTOMERS & 24/7 ATM USERS)
// =========================================================================
interface VietcombankNpcActor {
  root: THREE.Group;
  hipsGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  headMesh: THREE.Mesh;
  kind: 'staff' | 'bank_customer' | 'atm_user';
  staffRole?: 'teller' | 'guard' | 'f2_banker' | 'f2_walk';
  homePos: THREE.Vector3;
  homeYaw: number;
  seed: number;
  walkPhase: number;
  // Loop route waypoints & optional stop pause durations + target facing yaw at stop
  waypoints?: Array<{ pos: THREE.Vector3; pauseSec?: number; lookYaw?: number; action?: 'atm' | 'kiosk' | 'teller' }>;
  exitWaypoints?: THREE.Vector3[];
  wpIdx: number;
  pauseTimer: number;
  speed: number;
  exiting: boolean;
  exitDone: boolean;
  exitRef: { idx: number };
  walkPhaseRef: { phase: number };
  glbHandle: GlbHumanHandle;
}

export class VietcombankNpcController {
  public readonly rootGroup = new THREE.Group();
  private actors: VietcombankNpcActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const midY = (VIETCOMBANK_PODIUM_Y + VIETCOMBANK_FLOOR2_Y) * 0.5;

    const addActor = (opts: {
      kind: 'staff' | 'bank_customer' | 'atm_user';
      staffRole?: 'teller' | 'guard' | 'f2_banker' | 'f2_walk';
      x: number;
      y: number;
      z: number;
      yaw: number;
      shirt: number;
      pants: number;
      skinHex: string;
      speed?: number;
      startWpIdx?: number;
      withBankCard?: boolean;
      waypoints?: Array<{ x: number; y: number; z: number; pauseSec?: number; lookYaw?: number; action?: 'atm' | 'kiosk' | 'teller' }>;
      exitWaypoints?: Array<[number, number, number]>;
    }) => {
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.y = 0.80;
      root.add(hipsGroup);

      const shirtMat = new THREE.MeshStandardMaterial({ color: opts.shirt, roughness: 0.7 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: opts.pants, roughness: 0.78 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.24), shirtMat);
      torso.position.y = 0.28;
      hipsGroup.add(torso);

      const faceTex = helpers.createFaceTexture('happy', opts.skinHex);
      const headMesh = helpers.createHeadMesh(skinMat, faceTex, 0.27, 0.27, 0.27);
      headMesh.position.y = 0.72;
      hipsGroup.add(headMesh);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.10, 0.29), hairMat);
      hair.position.y = 0.86;
      hipsGroup.add(hair);

      const makeArm = (ax: number, withCard = false) => {
        const p = new THREE.Group();
        p.position.set(ax, 0.52, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), shirtMat);
        m.position.y = -0.20;
        p.add(m);
        if (withCard) {
          const card = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 0.11),
            new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 })
          );
          card.position.set(0, -0.42, 0.05);
          p.add(card);
        }
        hipsGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.27, false);
      const rightArm = makeArm(0.27, Boolean(opts.withBankCard));

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

      root.position.set(opts.x, opts.y, opts.z);
      root.rotation.y = opts.yaw;
      this.rootGroup.add(root);

      const seed = this.actors.length * 1.37;
      const actorIdx = this.actors.length;
      let modelSource: string;
      let targetHeight: number;
      let clipProfile: 'multi' | 'idle_only' | 'walk_only' | 'static' | undefined;
      let rotationY: number | undefined;
      if (opts.staffRole === 'guard') {
        modelSource = GUARD_NPC_MODEL.modelSource;
        targetHeight = GUARD_NPC_MODEL.targetHeight;
        clipProfile = GUARD_NPC_MODEL.clipProfile;
        rotationY = GUARD_NPC_MODEL.rotationY;
      } else if (opts.staffRole === 'teller') {
        modelSource = CASHIER_NPC_MODEL.modelSource;
        targetHeight = CASHIER_NPC_MODEL.targetHeight;
        clipProfile = CASHIER_NPC_MODEL.clipProfile;
      } else if (opts.kind === 'staff') {
        const spec = pickStationaryCivilianModel(actorIdx * 3 + 1);
        modelSource = spec.modelSource;
        targetHeight = spec.targetHeight;
        clipProfile = spec.clipProfile;
        rotationY = spec.rotationY;
      } else {
        const spec = pickOutsideNpcModel(actorIdx * 5 + 3);
        modelSource = spec.modelSource;
        targetHeight = spec.targetHeight;
        clipProfile = spec.clipProfile;
        rotationY = spec.rotationY;
      }
      const glbHandle = attachGlbHumanToNpc({
        modelSource,
        hostGroup: root,
        fallbackMeshes: [hipsGroup],
        targetHeight,
        clipProfile,
        rotationY,
        initialState: opts.waypoints && opts.waypoints.length >= 2 ? 'Walk' : 'Idle',
        phaseOffset: seed,
      });

      this.actors.push({
        root,
        hipsGroup,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        headMesh,
        kind: opts.kind,
        staffRole: opts.staffRole,
        homePos: new THREE.Vector3(opts.x, opts.y, opts.z),
        homeYaw: opts.yaw,
        seed,
        walkPhase: seed * 0.7,
        waypoints: opts.waypoints?.map((w) => ({
          pos: new THREE.Vector3(w.x, w.y, w.z),
          pauseSec: w.pauseSec,
          lookYaw: w.lookYaw,
          action: w.action,
        })),
        exitWaypoints: opts.exitWaypoints?.map(([ex, ey, ez]) => new THREE.Vector3(ex, ey, ez)),
        wpIdx: opts.startWpIdx ?? 0,
        pauseTimer: 0,
        speed: opts.speed ?? 1.30,
        exiting: false,
        exitDone: false,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      });
    };

    const f1ExitPath = (xOut: number): Array<[number, number, number]> => [
      [251.0, VIETCOMBANK_PODIUM_Y, 8.8],
      [251.0, VIETCOMBANK_PODIUM_Y, 11.4],
      [251.0, 0.0, 13.8],
      [xOut, 0.0, 16.8],
    ];

    const f2ExitPath = (xOut: number): Array<[number, number, number]> => [
      [256.8, VIETCOMBANK_FLOOR2_Y, 2.0],
      [262.3, VIETCOMBANK_FLOOR2_Y, -1.2],
      [262.3, midY, -6.5],
      [260.5, midY, -6.8],
      [260.5, VIETCOMBANK_PODIUM_Y, -1.2],
      [251.0, VIETCOMBANK_PODIUM_Y, 8.8],
      [251.0, VIETCOMBANK_PODIUM_Y, 11.4],
      [251.0, 0.0, 13.8],
      [xOut, 0.0, 16.8],
    ];

    // -----------------------------------------------------------------------
    // 1. VIETCOMBANK STAFF (08:00 - 18:00)
    // -----------------------------------------------------------------------
    [242.0, 246.1, 250.2, 254.3].forEach((tx, idx) => {
      addActor({
        kind: 'staff',
        staffRole: 'teller',
        x: tx,
        y: VIETCOMBANK_PODIUM_Y,
        z: -5.35,
        yaw: 0,
        shirt: idx === 3 ? 0xf8fafc : 0x006b3f,
        pants: idx === 3 ? 0x006b3f : 0x0f172a,
        skinHex: idx % 2 === 0 ? '#fbe0c8' : '#f5c7a3',
        exitWaypoints: [[257.6, VIETCOMBANK_PODIUM_Y, -5.2], [257.6, VIETCOMBANK_PODIUM_Y, 1.5], ...f1ExitPath(244.0 + idx * 3)],
      });
    });

    addActor({
      kind: 'staff',
      staffRole: 'guard',
      x: 247.75,
      y: VIETCOMBANK_PODIUM_Y,
      z: 9.8,
      yaw: 0.25,
      shirt: 0x1e3a8a,
      pants: 0x0f172a,
      skinHex: '#e8b48e',
      exitWaypoints: f1ExitPath(246.5),
    });

    addActor({
      kind: 'staff',
      staffRole: 'f2_banker',
      x: 243.6,
      y: VIETCOMBANK_FLOOR2_Y,
      z: -5.2,
      yaw: 0,
      shirt: 0x006b3f,
      pants: 0x0f172a,
      skinHex: '#fbe0c8',
      exitWaypoints: [[257.5, VIETCOMBANK_FLOOR2_Y, -5.2], ...f2ExitPath(256.0)],
    });

    addActor({
      kind: 'staff',
      staffRole: 'f2_walk',
      x: 254.8,
      y: VIETCOMBANK_FLOOR2_Y,
      z: 4.6,
      yaw: Math.PI,
      shirt: 0xe2e8f0,
      pants: 0x1e293b,
      skinHex: '#e8b48e',
      speed: 1.2,
      waypoints: [
        { x: 247.8, y: VIETCOMBANK_FLOOR2_Y, z: 4.8, pauseSec: 2.0 },
        { x: 254.8, y: VIETCOMBANK_FLOOR2_Y, z: 4.6 },
        { x: 254.8, y: VIETCOMBANK_FLOOR2_Y, z: -1.2 },
        { x: 247.8, y: VIETCOMBANK_FLOOR2_Y, z: -1.2, pauseSec: 2.2 },
        { x: 254.8, y: VIETCOMBANK_FLOOR2_Y, z: -1.2 },
        { x: 254.8, y: VIETCOMBANK_FLOOR2_Y, z: 4.6 },
      ],
      exitWaypoints: f2ExitPath(259.5),
    });

    // -----------------------------------------------------------------------
    // 2. BANK CUSTOMERS WALKING IN & OUT THROUGH SLIDING DOORS (08:00 - 18:00)
    // -----------------------------------------------------------------------
    // Customer A: West sidewalk -> steps -> queue kiosk -> Teller Counter 02 -> exit East sidewalk
    addActor({
      kind: 'bank_customer',
      x: 241.0,
      y: 0.0,
      z: 16.5,
      yaw: Math.PI * 0.5,
      shirt: 0x0284c7,
      pants: 0x1e293b,
      skinHex: '#f5c7a3',
      speed: 1.38,
      startWpIdx: 1,
      waypoints: [
        { x: 240.5, y: 0.0, z: 16.6, pauseSec: 1.2 },
        { x: 250.5, y: 0.0, z: 13.7 },
        { x: 250.7, y: VIETCOMBANK_PODIUM_Y, z: 11.4 },
        { x: 248.8, y: VIETCOMBANK_PODIUM_Y, z: 9.2 },
        { x: 246.5, y: VIETCOMBANK_PODIUM_Y, z: 8.6, pauseSec: 2.0, lookYaw: -Math.PI * 0.5, action: 'kiosk' },
        { x: 246.4, y: VIETCOMBANK_PODIUM_Y, z: -0.8 },
        { x: 246.1, y: VIETCOMBANK_PODIUM_Y, z: -3.0, pauseSec: 4.6, lookYaw: Math.PI, action: 'teller' },
        { x: 249.4, y: VIETCOMBANK_PODIUM_Y, z: 4.5 },
        { x: 251.0, y: VIETCOMBANK_PODIUM_Y, z: 11.4 },
        { x: 251.2, y: 0.0, z: 13.7 },
        { x: 261.2, y: 0.0, z: 16.8, pauseSec: 1.5 },
        { x: 251.0, y: 0.0, z: 16.6 },
      ],
    });

    // Customer B: East sidewalk -> steps -> Advisory Lounge -> Teller 03 -> exit West sidewalk
    addActor({
      kind: 'bank_customer',
      x: 251.3,
      y: VIETCOMBANK_PODIUM_Y,
      z: 8.6,
      yaw: Math.PI,
      shirt: 0xe11d48,
      pants: 0x0f172a,
      skinHex: '#fbe0c8',
      speed: 1.32,
      startWpIdx: 3,
      waypoints: [
        { x: 262.0, y: 0.0, z: 16.4, pauseSec: 1.4 },
        { x: 251.6, y: 0.0, z: 13.7 },
        { x: 251.4, y: VIETCOMBANK_PODIUM_Y, z: 11.4 },
        { x: 252.8, y: VIETCOMBANK_PODIUM_Y, z: 7.4 },
        { x: 255.2, y: VIETCOMBANK_PODIUM_Y, z: 3.9, pauseSec: 3.8, lookYaw: Math.PI, action: 'teller' },
        { x: 250.2, y: VIETCOMBANK_PODIUM_Y, z: -3.0, pauseSec: 4.2, lookYaw: Math.PI, action: 'teller' },
        { x: 251.0, y: VIETCOMBANK_PODIUM_Y, z: 8.2 },
        { x: 251.0, y: VIETCOMBANK_PODIUM_Y, z: 11.4 },
        { x: 250.6, y: 0.0, z: 13.7 },
        { x: 239.8, y: 0.0, z: 16.4, pauseSec: 1.6 },
      ],
    });

    // Customer C: Sidewalk -> steps -> Teller 01 -> Brochure area -> exit sidewalk
    addActor({
      kind: 'bank_customer',
      x: 242.0,
      y: VIETCOMBANK_PODIUM_Y,
      z: -3.0,
      yaw: Math.PI,
      shirt: 0xf59e0b,
      pants: 0x1e293b,
      skinHex: '#f5c7a3',
      speed: 1.28,
      startWpIdx: 4,
      waypoints: [
        { x: 244.0, y: 0.0, z: 17.1, pauseSec: 1.8 },
        { x: 250.4, y: 0.0, z: 13.7 },
        { x: 250.5, y: VIETCOMBANK_PODIUM_Y, z: 11.4 },
        { x: 245.5, y: VIETCOMBANK_PODIUM_Y, z: 3.2 },
        { x: 242.0, y: VIETCOMBANK_PODIUM_Y, z: -3.0, pauseSec: 4.4, lookYaw: Math.PI, action: 'teller' },
        { x: 245.4, y: VIETCOMBANK_PODIUM_Y, z: 4.5 },
        { x: 251.0, y: VIETCOMBANK_PODIUM_Y, z: 11.4 },
        { x: 251.0, y: 0.0, z: 13.7 },
        { x: 258.5, y: 0.0, z: 17.1, pauseSec: 1.8 },
      ],
    });

    // -----------------------------------------------------------------------
    // 3. OUTDOOR 3-BAY VIETCOMBANK 24H ATM WITHDRAWAL NPCs (OPEN 24/24!)
    //    Cleanly navigate through openings X = 266.15, 269.60, 273.02
    //    avoiding white columns at X = 267.15 & 272.05 (Z = 11.7)!
    // -----------------------------------------------------------------------
    // ATM User 1: Uses Center ATM Bay (#2) then walks East sidewalk
    addActor({
      kind: 'atm_user',
      x: 269.6,
      y: 0.22,
      z: 9.0,
      yaw: Math.PI,
      shirt: 0x0ea5e9,
      pants: 0x0f172a,
      skinHex: '#fbe0c8',
      speed: 1.32,
      withBankCard: true,
      startWpIdx: 3,
      waypoints: [
        { x: 263.5, y: 0.06, z: 16.2, pauseSec: 1.2 },
        { x: 269.6, y: 0.06, z: 13.4 },
        { x: 269.6, y: 0.22, z: 12.2 },
        { x: 269.6, y: 0.22, z: 9.0, pauseSec: 4.8, lookYaw: Math.PI, action: 'atm' },
        { x: 269.6, y: 0.22, z: 12.2 },
        { x: 269.6, y: 0.06, z: 13.5 },
        { x: 274.8, y: 0.06, z: 16.5, pauseSec: 1.8 },
        { x: 268.2, y: 0.06, z: 16.8 },
      ],
    });

    // ATM User 2: Uses Left Angled ATM Bay (#1) via X = 266.15 opening
    addActor({
      kind: 'atm_user',
      x: 265.0,
      y: 0.06,
      z: 16.0,
      yaw: 0.4,
      shirt: 0x8b5cf6,
      pants: 0x1e293b,
      skinHex: '#f5c7a3',
      speed: 1.26,
      withBankCard: true,
      startWpIdx: 0,
      waypoints: [
        { x: 260.0, y: 0.06, z: 16.2, pauseSec: 1.6 },
        { x: 266.15, y: 0.06, z: 13.4 },
        { x: 266.15, y: 0.22, z: 11.7 },
        { x: 267.35, y: 0.22, z: 9.25, pauseSec: 5.2, lookYaw: Math.PI + 0.44, action: 'atm' },
        { x: 266.15, y: 0.22, z: 11.7 },
        { x: 266.15, y: 0.06, z: 13.4 },
        { x: 256.5, y: 0.06, z: 16.4, pauseSec: 2.0 },
      ],
    });

    // ATM User 3: Uses Right Angled ATM Bay (#3) via X = 273.02 opening
    addActor({
      kind: 'atm_user',
      x: 273.02,
      y: 0.22,
      z: 12.1,
      yaw: Math.PI,
      shirt: 0x10b981,
      pants: 0x0f172a,
      skinHex: '#e8b48e',
      speed: 1.30,
      withBankCard: true,
      startWpIdx: 2,
      waypoints: [
        { x: 274.8, y: 0.06, z: 16.1, pauseSec: 2.2 },
        { x: 273.02, y: 0.06, z: 13.4 },
        { x: 273.02, y: 0.22, z: 11.7 },
        { x: 271.85, y: 0.22, z: 9.25, pauseSec: 4.9, lookYaw: Math.PI - 0.44, action: 'atm' },
        { x: 273.02, y: 0.22, z: 11.7 },
        { x: 273.02, y: 0.06, z: 13.4 },
        { x: 265.2, y: 0.06, z: 16.9, pauseSec: 1.6 },
      ],
    });
  }

  private snapClosed() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (a.kind === 'atm_user') {
        a.root.visible = true;
      } else {
        a.root.visible = false;
        a.exiting = false;
        a.exitDone = true;
      }
    }
  }

  private reopenBank() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (a.kind === 'atm_user') continue;
      a.root.visible = true;
      a.exiting = false;
      a.exitDone = false;
      a.pauseTimer = 0;
      a.exitRef.idx = 0;
      if (a.kind === 'staff') {
        a.root.position.copy(a.homePos);
        a.root.rotation.y = a.homeYaw;
        a.glbHandle.setAnimState(a.waypoints && a.waypoints.length >= 2 ? 'Walk' : 'Idle');
      } else if (a.waypoints && a.waypoints.length > 0) {
        a.wpIdx = 0;
        a.root.position.copy(a.waypoints[0].pos);
        a.glbHandle.setAnimState('Walk');
      }
    }
  }

  private beginClosing() {
    this.closingActive = true;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (a.kind === 'atm_user') continue;
      a.pauseTimer = 0;
      a.exiting = true;
      a.exitRef.idx = 0;
      if (a.kind === 'bank_customer' && a.root.position.z > 13.2) {
        // Already outside on sidewalk: hide cleanly without re-entering locked doors
        a.exitDone = true;
        a.root.visible = false;
      } else {
        a.exitDone = false;
        a.glbHandle.setAnimState('Walk', 1.2);
      }
    }
  }

  public hasNpcNearDoor(): boolean {
    if (this.fullyClosedAndEmpty) return false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (a.kind === 'atm_user' || !a.root.visible) continue;
      const p = a.root.position;
      if (p.y < 2.0 && p.x >= 248.4 && p.x <= 253.6 && p.z >= 9.0 && p.z <= 13.6) {
        return true;
      }
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private resetLimbsIdle(a: VietcombankNpcActor, dt: number) {
    const k = Math.min(1, dt * 10);
    a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, k);
    a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, k);
    a.leftArm.rotation.x = THREE.MathUtils.lerp(a.leftArm.rotation.x, 0, k);
    a.rightArm.rotation.x = THREE.MathUtils.lerp(a.rightArm.rotation.x, 0, k);
  }

  public update(delta: number, rawHour = 10.0) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isVietcombankOpenAtHour(h);

    if (this.wasOpen === null) {
      if (!isOpen) this.snapClosed();
      else this.reopenBank();
    } else if (!isOpen && this.wasOpen) {
      this.beginClosing();
    } else if (isOpen && !this.wasOpen) {
      this.reopenBank();
    }
    this.wasOpen = isOpen;

    let allBankCleared = true;

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];

      // Bank staff & customers close cleanly outside 08:00-18:00
      if (a.kind !== 'atm_user') {
        if (this.fullyClosedAndEmpty) {
          a.root.visible = false;
          continue;
        }
        if (this.closingActive && a.exiting) {
          if (a.exitDone) {
            a.root.visible = false;
            continue;
          }
          allBankCleared = false;
          const exitPts = a.exitWaypoints ?? [
            new THREE.Vector3(251.0, VIETCOMBANK_PODIUM_Y, 10.8),
            new THREE.Vector3(251.0, 0.0, 13.8),
            new THREE.Vector3(244.0 + i * 2.5, 0.0, 16.8),
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
          }
          continue;
        }
      }

      a.root.visible = true;

      // Waypoint-driven walking & service/ATM pause animations
      if (a.waypoints && a.waypoints.length >= 2) {
        const currWp = a.waypoints[a.wpIdx % a.waypoints.length];
        if (a.pauseTimer > 0) {
          a.glbHandle.setAnimState('Idle');
          a.pauseTimer -= dt;
          if (currWp.lookYaw !== undefined) {
            let diff = currWp.lookYaw - a.root.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            a.root.rotation.y += diff * Math.min(1, dt * 8.0);
          }
          a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
          a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));

          if (currWp.action === 'atm' || currWp.action === 'kiosk') {
            // Card insertion & PIN pad / ATM screen tapping animation
            a.rightArm.rotation.x = -0.88 + Math.sin(this.timer * 7.2 + a.seed) * 0.14;
            a.leftArm.rotation.x = -0.35 + Math.cos(this.timer * 2.4 + a.seed) * 0.06;
            a.headMesh.rotation.x = -0.10 + Math.sin(this.timer * 2.0 + a.seed) * 0.05;
            a.headMesh.rotation.y = Math.sin(this.timer * 1.4 + a.seed) * 0.08;
          } else if (currWp.action === 'teller') {
            // Counter transaction gesture
            a.rightArm.rotation.x = -0.58 + Math.sin(this.timer * 4.2 + a.seed) * 0.14;
            a.leftArm.rotation.x = -0.30;
            a.headMesh.rotation.y = Math.sin(this.timer * 2.1 + a.seed) * 0.18;
          } else {
            this.resetLimbsIdle(a, dt);
          }
          if (a.pauseTimer <= 0) {
            a.headMesh.rotation.x = 0;
            a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
          }
          continue;
        }

        a.glbHandle.setAnimState('Walk');
        const dx = currWp.pos.x - a.root.position.x;
        const dy = currWp.pos.y - a.root.position.y;
        const dz = currWp.pos.z - a.root.position.z;
        const distXZ = Math.hypot(dx, dz);
        const dist3D = Math.hypot(dx, dy, dz);
        const step = a.speed * dt;
        if (dist3D <= step + 0.08) {
          a.root.position.copy(currWp.pos);
          if (currWp.pauseSec && currWp.pauseSec > 0) {
            a.pauseTimer = currWp.pauseSec;
          } else {
            a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
          }
        } else {
          const r = step / dist3D;
          a.root.position.x += dx * r;
          a.root.position.y += dy * r;
          a.root.position.z += dz * r;
          if (distXZ > 0.04) {
            const yaw = Math.atan2(dx, dz);
            let diff = yaw - a.root.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            a.root.rotation.y += diff * Math.min(1, dt * 8.5);
          }
        }
        a.walkPhase += dt * 6.0;
        const swing = Math.sin(a.walkPhase) * 0.42;
        a.leftLeg.rotation.x = swing;
        a.rightLeg.rotation.x = -swing;
        a.leftArm.rotation.x = -swing * 0.55;
        a.rightArm.rotation.x = swing * 0.55;
        a.headMesh.rotation.x = 0;
      } else {
        a.glbHandle.setAnimState('Idle');
        // Stationary tellers & lobby security guard idle work animation
        const sway = Math.sin(this.timer * 1.7 + a.seed);
        a.headMesh.rotation.y = sway * 0.22;
        if (a.staffRole === 'guard') {
          a.rightArm.rotation.x = -0.25 + sway * 0.16;
        } else {
          a.leftArm.rotation.x = -0.45 + sway * 0.08;
          a.rightArm.rotation.x = -0.45 - sway * 0.08;
        }
      }
    }

    if (this.closingActive && allBankCleared) {
      this.fullyClosedAndEmpty = true;
    }
  }
}
