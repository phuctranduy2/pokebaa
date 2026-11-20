import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, GUARD_NPC_MODEL, pickOutsideNpcModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isVpbankOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';

export const VPBANK_FLOOR2_Y = 5.0;
export const VPBANK_PODIUM_Y = 0.36;

export interface VpbankBuildResult {
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
    npcController?: VpbankNpcController | null,
    externalNpcNearDoor?: boolean
  ) => void;
}

// Plot on East side of Đường Sơn Tây Nam immediately South of Highlands Coffee (Z = 42.5..70.5):
// Main Branch Shell:  X = 388.0 .. 409.4 (21.4m deep), Z = 73.0 .. 99.0 (26.0m wide)
// Forecourt & Steps:  X = 383.8 .. 388.0, Z = 73.0 .. 99.0 (Facing West -X onto Đường Sơn Tây Nam)
// Interior Stairwell: X = 402.0 .. 408.4, Z = 73.8 .. 77.4 (NE corner switchback to Floor 2)
// Outdoor 3-Bay 24h ATM Booth: X = 386.6 .. 392.6, Z = 100.2 .. 109.4 (Apron X = 383.8..386.8)
export const VPBANK_COLLIDERS: IntersectionColliderBox[] = [
  // Landscaped divider hedge between Highlands Coffee (Z=70.5) & VPBank North Pier (Z=73.0)
  { minX: 387.8, maxX: 409.6, minZ: 70.9, maxZ: 72.6, floor: 1 },
  // Left & Right Forecourt Side Planters + Pylon + Motorbike Parking Zone (keeps central steps Z=78.5..93.5 wide open!)
  { minX: 384.5, maxX: 385.6, minZ: 73.9, maxZ: 75.1, floor: 1 }, // VPBank 24/7 Sidewalk Totem Pylon
  { minX: 385.8, maxX: 387.3, minZ: 73.3, maxZ: 78.3, floor: 1 }, // North Forecourt Planter Box
  { minX: 384.8, maxX: 387.6, minZ: 93.8, maxZ: 98.8, floor: 1 }, // South Forecourt Parked Motorbikes Bay

  // Floor 1 Exterior Walls (Portal opening Z = 82.4..89.6, doors slide open Z = 84.2..87.8)
  { minX: 387.8, maxX: 409.6, minZ: 72.8, maxZ: 73.6, floor: 1 }, // North Exterior Wall
  { minX: 387.8, maxX: 409.6, minZ: 98.4, maxZ: 99.2, floor: 1 }, // South Exterior Wall
  { minX: 408.8, maxX: 409.7, minZ: 72.8, maxZ: 99.2, floor: 1 }, // East Rear Wall
  { minX: 387.7, maxX: 388.4, minZ: 73.0, maxZ: 84.2, floor: 1 }, // West Front Glass North of Doors
  { minX: 387.7, maxX: 388.4, minZ: 87.8, maxZ: 99.0, floor: 1 }, // West Front Glass South of Doors

  // Floor 1 Banking Hall Fixtures
  { minX: 390.3, maxX: 391.3, minZ: 82.7, maxZ: 84.1, floor: 1 }, // Digital Queue Ticket Kiosk
  { minX: 388.8, maxX: 390.0, minZ: 81.4, maxZ: 82.6, floor: 1 }, // Security Greeter Podium
  { minX: 388.7, maxX: 393.8, minZ: 92.6, maxZ: 98.1, floor: 1 }, // 24/7 VPBank NEO Digibank & CDM Kiosk Bank
  { minX: 391.9, maxX: 397.9, minZ: 73.9, maxZ: 79.8, floor: 1 }, // Customer Waiting Sofa & Table Lounge
  { minX: 398.4, maxX: 400.0, minZ: 73.7, maxZ: 74.9, floor: 1 }, // Water Dispenser & Brochure Stand
  { minX: 402.9, maxX: 404.9, minZ: 79.0, maxZ: 96.2, floor: 1 }, // 4 Teller Service Counters Row
  { minX: 407.5, maxX: 408.9, minZ: 79.0, maxZ: 97.6, floor: 1 }, // Rear Vault Door & Credenza Cabinets
  { minX: 396.0, maxX: 398.2, minZ: 89.1, maxZ: 92.9, floor: 1 }, // Advisory Consultation Table & Chairs
  { minX: 388.6, maxX: 389.8, minZ: 73.7, maxZ: 74.8, floor: 1 }, // NW Corner Planter Pot
  { minX: 398.0, maxX: 399.2, minZ: 93.7, maxZ: 94.9, floor: 1 }, // Mid-South Structural Column & Planter

  // Floor 1 Stairwell Enclosure (South flight Z=75.7..77.4 open at X=402.0; North under-flight & North wall closed)
  { minX: 401.9, maxX: 408.6, minZ: 77.25, maxZ: 77.55, floor: 1 }, // Stairwell South Wall
  { minX: 401.9, maxX: 408.6, minZ: 73.6, maxZ: 75.62, floor: 1 }, // Under North Flight Enclosure
  { minX: 408.35, maxX: 408.7, minZ: 73.6, maxZ: 77.5, floor: 1 }, // Stairwell East Wall

  // Floor 2 Perimeter Curtain Walls & Stairwell Guardrails
  { minX: 387.8, maxX: 409.6, minZ: 72.8, maxZ: 73.6, floor: 2 }, // North Wall
  { minX: 387.8, maxX: 409.6, minZ: 98.4, maxZ: 99.2, floor: 2 }, // South Wall
  { minX: 408.8, maxX: 409.7, minZ: 72.8, maxZ: 99.2, floor: 2 }, // East Rear Wall
  { minX: 387.7, maxX: 388.5, minZ: 72.8, maxZ: 99.2, floor: 2 }, // West 7-Pane Curtain Wall
  { minX: 401.9, maxX: 408.6, minZ: 77.25, maxZ: 77.55, floor: 2 }, // Stairwell South Balustrade
  { minX: 402.1, maxX: 406.2, minZ: 75.5, maxZ: 75.68, floor: 2 }, // Center Flight Divider
  { minX: 408.35, maxX: 408.7, minZ: 73.6, maxZ: 77.5, floor: 2 }, // Stairwell East Balustrade
  { minX: 401.85, maxX: 402.2, minZ: 75.55, maxZ: 77.5, floor: 2 }, // South Flight Drop-off Rail

  // Floor 2 VPBank Diamond & SME Priority Banking Furniture
  { minX: 396.05, maxX: 396.35, minZ: 74.0, maxZ: 88.0, floor: 2 }, // VIP Diamond Glass Partition (open entry Z=88..98)
  { minX: 390.1, maxX: 395.0, minZ: 74.8, maxZ: 81.4, floor: 2 }, // VPBank Diamond Conference Table & Chairs
  { minX: 390.4, maxX: 394.6, minZ: 83.4, maxZ: 91.2, floor: 2 }, // Executive Advisory Lounge Set
  { minX: 388.7, maxX: 392.0, minZ: 93.8, maxZ: 98.2, floor: 2 }, // Floor 2 Diamond Refreshment & Espresso Bar
  { minX: 401.4, maxX: 406.2, minZ: 79.4, maxZ: 86.6, floor: 2 }, // SME Corporate Desks North
  { minX: 401.4, maxX: 406.2, minZ: 88.8, maxZ: 96.0, floor: 2 }, // SME Corporate Desks South
  { minX: 407.5, maxX: 408.9, minZ: 79.0, maxZ: 97.2, floor: 2 }, // Floor 2 Archive Cabinets & Photocopier

  // Outdoor 3-Bay VPBank 24h ATM Booth directly South of VPBank Main Branch (X = 386.6..392.6, Z = 100.2..109.4)
  { minX: 386.5, maxX: 392.7, minZ: 100.0, maxZ: 100.85, floor: 1 }, // ATM Booth North Side Wall
  { minX: 386.5, maxX: 392.7, minZ: 108.75, maxZ: 109.6, floor: 1 }, // ATM Booth South Side Wall
  { minX: 390.15, maxX: 392.8, minZ: 100.2, maxZ: 109.4, floor: 1 }, // ATM Booth 3-Faceted Rear Wall & 3 Kiosks
  { minX: 387.25, maxX: 388.15, minZ: 101.9, maxZ: 102.8, floor: 1 }, // ATM Booth North Inner White Column
  { minX: 387.25, maxX: 388.15, minZ: 106.8, maxZ: 107.7, floor: 1 }, // ATM Booth South Inner White Column
];

const VPBANK_LOGO_SRC = '/assets/aistudio/image_59a84800.png';
let cachedVpbankLogoImg: HTMLImageElement | null = null;
let cachedVpbankLogoLoaded = false;
const pendingVpbankLogoCallbacks: Array<(img: HTMLImageElement) => void> = [];

function getVpbankLogoImage(onReady: (img: HTMLImageElement) => void): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (cachedVpbankLogoLoaded && cachedVpbankLogoImg) return cachedVpbankLogoImg;
  pendingVpbankLogoCallbacks.push(onReady);
  if (!cachedVpbankLogoImg) {
    const img = new Image();
    img.onload = () => {
      cachedVpbankLogoLoaded = true;
      const cbs = pendingVpbankLogoCallbacks.splice(0, pendingVpbankLogoCallbacks.length);
      cbs.forEach((cb) => cb(img));
    };
    img.src = VPBANK_LOGO_SRC;
    cachedVpbankLogoImg = img;
  }
  return null;
}

/**
 * Draws the authentic all-red 4-petal VPBank "Bông hoa thịnh vượng" emblem
 * matching public/assets/aistudio/image_59a84800.png, with optional white badge backing for dark signage.
 */
function drawVpbankEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options?: { onDarkBg?: boolean; tex?: THREE.CanvasTexture }
) {
  const onDarkBg = options?.onDarkBg ?? false;
  const drawMark = (img: HTMLImageElement | null) => {
    ctx.save();
    if (onDarkBg) {
      const boxW = size * 1.16;
      const boxH = size * 1.02;
      const r = size * 0.16;
      const bx = cx - boxW * 0.5;
      const by = cy - boxH * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + boxW - r, by);
      ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
      ctx.lineTo(bx + boxW, by + boxH - r);
      ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
      ctx.lineTo(bx + r, by + boxH);
      ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();
    }

    if (img) {
      const drawW = size;
      const drawH = size * (img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.85);
      ctx.drawImage(img, cx - drawW * 0.5, cy - drawH * 0.5, drawW, drawH);
      ctx.restore();
      return;
    }

    // Synchronous exact geometric vector fallback matching image_59a84800.png (1200x1020)
    ctx.translate(cx, cy);
    ctx.scale(size, size);
    ctx.fillStyle = '#e00000';

    [-1, 1].forEach((dir) => {
      // Upper inner pointed petal
      ctx.beginPath();
      ctx.moveTo(dir * 0.0135, -0.185);
      ctx.lineTo(dir * 0.192, -0.392);
      ctx.quadraticCurveTo(dir * 0.2195, -0.415, dir * 0.2195, -0.376);
      ctx.lineTo(dir * 0.2195, -0.135);
      ctx.quadraticCurveTo(dir * 0.218, -0.098, dir * 0.186, -0.068);
      ctx.lineTo(dir * 0.0135, 0.126);
      ctx.closePath();
      ctx.fill();

      // Lower outer sweeping wing petal
      ctx.beginPath();
      ctx.moveTo(dir * 0.0135, 0.165);
      ctx.lineTo(dir * 0.232, -0.068);
      ctx.quadraticCurveTo(dir * 0.315, -0.132, dir * 0.452, -0.118);
      ctx.quadraticCurveTo(dir * 0.486, -0.114, dir * 0.464, -0.074);
      ctx.lineTo(dir * 0.068, 0.374);
      ctx.quadraticCurveTo(dir * 0.036, 0.402, dir * 0.0135, 0.402);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  };

  const readyImg = getVpbankLogoImage((loadedImg) => {
    drawMark(loadedImg);
    if (options?.tex) {
      options.tex.needsUpdate = true;
    }
  });
  drawMark(readyImg);
}

function createMarbleFloorTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(148, 163, 184, 0.16)' : 'rgba(203, 213, 225, 0.24)';
    ctx.lineWidth = 1.5 + (i % 3);
    ctx.beginPath();
    const y0 = (i * 37) % s;
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(s * 0.33, (y0 + 48) % s, s * 0.66, (y0 - 36 + s) % s, s, (y0 + 18) % s);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.36)';
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

function createVpbankFacadeSignTex(): THREE.CanvasTexture {
  const w = 1536;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Crisp pure white architectural signboard so the authentic red VPBank logo + emerald wordmark pop cleanly
  const glassGrad = ctx.createLinearGradient(0, 0, w, h);
  glassGrad.addColorStop(0, '#f8fafc');
  glassGrad.addColorStop(0.5, '#ffffff');
  glassGrad.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(0, 0, w, h);

  // Signature VPBank emerald top bar & crimson bottom accent stripe
  ctx.fillStyle = '#00864f';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillStyle = '#e00000';
  ctx.fillRect(0, h - 10, w, 10);

  ctx.strokeStyle = 'rgba(0, 107, 62, 0.14)';
  ctx.lineWidth = 3;
  [384, 768, 1152].forEach((mx) => {
    ctx.beginPath();
    ctx.moveTo(mx, 14);
    ctx.lineTo(mx, h - 10);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  drawVpbankEmblem(ctx, 438, 102, 142, { tex });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#007b47';
  ctx.font = '900 120px "Segoe UI", system-ui, -apple-system, sans-serif';
  ctx.fillText('VPBank', 536, 106);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CHI NHÁNH ĐÀ NẴNG  •  PGD SƠN TÂY NAM  •  VÌ MỘT VIỆT NAM THỊNH VƯỢNG', w * 0.5, 204);

  return tex;
}

function createAtmBoothFasciaTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#005d36';
  ctx.fillRect(0, 0, w, h);

  // Signature VPBank crimson corner swoosh accent
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, h - 14, w, 14);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  drawVpbankEmblem(ctx, 232, 90, 102, { onDarkBg: true, tex });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px "Segoe UI", system-ui, -apple-system, sans-serif';
  ctx.fillText('VPBank', 318, 94);

  ctx.fillStyle = '#bbf7d0';
  ctx.font = '800 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('24h ATM • CDM', 716, 96);

  return tex;
}

function createAtmBoothSideSignTex(): THREE.CanvasTexture {
  const w = 320;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#005d36';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#00b14f';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.fillStyle = '#e00000';
  ctx.fillRect(10, h - 18, w - 20, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  drawVpbankEmblem(ctx, 250, 58, 56, { onDarkBg: true, tex });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText('VPBank', 22, 68);

  ctx.fillStyle = '#bef264';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText('24h ATM', 22, 130);

  return tex;
}

function createBoothAtmFaceTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#004d2c';
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  // Top VPBank white header band so the red flower & emerald wordmark look crisp
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, 12, w - 20, 62);
  ctx.fillStyle = '#00864f';
  ctx.fillRect(10, 68, w - 20, 6);
  ctx.fillStyle = '#007b47';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VPBank', 22, 42);
  drawVpbankEmblem(ctx, 212, 42, 36, { tex });

  // 24h ATM + network card banner strip
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(14, 84, w - 28, 66);
  ctx.fillStyle = '#00b14f';
  ctx.fillRect(18, 88, 66, 58);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('24h', 51, 108);
  ctx.fillText('ATM', 51, 130);

  ['#1d4ed8', '#dc2626', '#0ea5e9', '#00a651'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(96 + i * 36, 94, 30, 20);
  });

  // Backlit screen & keypad bezel
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(18, 164, w - 36, 174);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(28, 174, 128, 98);
  ctx.fillStyle = '#00b14f';
  ctx.fillRect(34, 180, 116, 22);
  ctx.fillStyle = '#ecfdf5';
  ctx.fillRect(34, 208, 116, 56);

  // Card slot & receipt slot on right of screen
  ctx.fillStyle = '#334155';
  ctx.fillRect(170, 182, 54, 18);
  ctx.fillStyle = '#00b14f';
  ctx.fillRect(174, 186, 46, 8);
  ctx.fillStyle = '#475569';
  ctx.fillRect(170, 224, 54, 48);

  // Keypad + cash dispenser bar
  ctx.fillStyle = '#64748b';
  ctx.fillRect(30, 286, 100, 38);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(142, 290, 82, 26);

  // Lower service access door panel
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(22, 356, w - 44, 134);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 356, w - 44, 134);

  return tex;
}

function createVpbankInteriorWallSignTex(
  subtitle = 'VÌ MỘT VIỆT NAM THỊNH VƯỢNG  •  VPBANK NEO'
): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#005633';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#007344';
  ctx.fillRect(14, 14, w - 28, h - 28);
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = '#e00000';
  ctx.fillRect(18, h - 24, w - 36, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  drawVpbankEmblem(ctx, 134, 112, 110, { onDarkBg: true, tex });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px system-ui, sans-serif';
  ctx.fillText('VPBank', 228, 96);

  ctx.fillStyle = '#bbf7d0';
  ctx.font = '700 25px system-ui, sans-serif';
  ctx.fillText(subtitle, 232, 174);

  return tex;
}

function createTotemPylonTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#007a47';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillStyle = '#e00000';
  ctx.fillRect(0, 184, w, 8);
  ctx.fillStyle = '#007a47';
  ctx.fillRect(0, 192, w, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  drawVpbankEmblem(ctx, 128, 102, 122, { tex });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#007b47';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText('VPBank', 128, 252);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('ATM 24/7', 128, 326);
  ctx.fillStyle = '#00864f';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('VPBANK NEO', 128, 374);
  ctx.fillStyle = '#e00000';
  ctx.fillText('DIAMOND', 128, 414);

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
  ctx.strokeStyle = '#00b14f';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#86efac';
  ctx.font = '800 28px monospace';
  ctx.fillText('MỜI KHÁCH HÀNG  •  COUNTER 02', 256, 46);

  ctx.fillStyle = '#4ade80';
  ctx.font = '900 58px monospace';
  ctx.fillText('B-204  →  QUẦY 02', 256, 112);

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

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  ctx.fillStyle = '#007a47';
  ctx.fillRect(0, 0, w, 86);
  ctx.fillStyle = '#e00000';
  ctx.fillRect(0, 82, w, 6);
  drawVpbankEmblem(ctx, 56, 42, 48, { onDarkBg: true, tex });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('TỶ GIÁ NGOẠI TỆ VPBANK  •  FX RATES', 106, 43);

  ctx.fillStyle = '#102a43';
  ctx.fillRect(20, 102, w - 40, 48);
  ctx.fillStyle = '#86efac';
  ctx.font = '700 24px monospace';
  ctx.fillText('MÃ NT', 42, 126);
  ctx.fillText('MUA TIỀN MẶT', 210, 126);
  ctx.fillText('MUA CK', 430, 126);
  ctx.fillText('BÁN RA', 610, 126);

  const rows: Array<[string, string, string, string]> = [
    ['USD', '25,190', '25,220', '25,460'],
    ['EUR', '27,060', '27,140', '28,310'],
    ['JPY', '161.50', '163.15', '170.95'],
    ['GBP', '31,740', '32,060', '33,090'],
    ['AUD', '16,310', '16,470', '17,020'],
    ['SGD', '18,640', '18,830', '19,430'],
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

  return tex;
}

function createCounterBadgeTex(num: string, title: string): THREE.CanvasTexture {
  const w = 320;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#007a47';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(6, h - 12, w - 12, 6);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText(`QUẦY ${num}`, w * 0.5, 44);
  ctx.fillStyle = '#bbf7d0';
  ctx.font = '700 21px system-ui, sans-serif';
  ctx.fillText(title, w * 0.5, 88);

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

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  ctx.fillStyle = '#f0fdf4';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#007a47';
  ctx.fillRect(0, 0, w, 46);
  ctx.fillStyle = '#e00000';
  ctx.fillRect(0, 44, w, 4);
  drawVpbankEmblem(ctx, 28, 22, 26, { onDarkBg: true, tex });
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VPBank NEO ATM', 52, 22);

  ctx.fillStyle = '#00864f';
  ['RÚT TIỀN', 'CHUYỂN KHOẢN'].forEach((label, i) => {
    ctx.fillRect(14, 68 + i * 64, 104, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 66, 91 + i * 64);
    ctx.fillStyle = '#00864f';
  });
  ['NỘP TIỀN CDM', 'MỞ THẺ NEO'].forEach((label, i) => {
    ctx.fillRect(138, 68 + i * 64, 104, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 190, 91 + i * 64);
    ctx.fillStyle = '#00864f';
  });

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
  grad.addColorStop(0, '#005e36');
  grad.addColorStop(1, '#022c22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  drawVpbankEmblem(ctx, w * 0.5, 110, 92, { onDarkBg: true, tex });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px system-ui, sans-serif';
  ctx.fillText(headline, w * 0.5, 250);

  ctx.fillStyle = accentHex;
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(line2, w * 0.5, 315);

  ctx.fillStyle = '#bbf7d0';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('VPBANK  •  PROSPERITY 24/7', w * 0.5, 430);

  return tex;
}

function createVipBoardroomScreenTex(): THREE.CanvasTexture {
  const w = 640;
  const h = 360;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  ctx.fillStyle = '#091926';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#007a47';
  ctx.fillRect(0, 0, w, 54);
  ctx.fillStyle = '#e00000';
  ctx.fillRect(0, 52, w, 4);
  drawVpbankEmblem(ctx, 36, 27, 32, { onDarkBg: true, tex });
  ctx.fillStyle = '#fef08a';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VPBANK DIAMOND  •  WEALTH INSIGHTS', 68, 27);

  const heights = [90, 130, 115, 165, 195, 225];
  heights.forEach((bh, i) => {
    ctx.fillStyle = i >= 4 ? '#00b14f' : '#0284c7';
    ctx.fillRect(62 + i * 88, 310 - bh, 52, bh);
  });

  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 4;
  ctx.beginPath();
  heights.forEach((bh, i) => {
    const px = 88 + i * 88;
    const py = 296 - bh;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  return tex;
}

function createBankGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(209, 250, 229, 0.36)');
  grad.addColorStop(0.55, 'rgba(167, 243, 208, 0.14)');
  grad.addColorStop(1, 'rgba(167, 243, 208, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

export function createVpbankStructure(): VpbankBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const frontX = 388.0;
  const backX = 409.4;
  const midX = (frontX + backX) * 0.5; // 398.7 (21.4m deep)
  const minZ = 73.0;
  const maxZ = 99.0;
  const midZ = (minZ + maxZ) * 0.5; // 86.0 (26.0m wide)
  const bldgWidthZ = maxZ - minZ; // 26.0m
  const bldgDepthX = backX - frontX; // 21.4m

  // Anti-Glare Architectural Materials tuned to VPBank Emerald & Crimson Palette
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
  const vpGreenMat = new THREE.MeshStandardMaterial({ color: 0x007a47, roughness: 0.60, metalness: 0.05 });
  const vpBrightGreenMat = new THREE.MeshStandardMaterial({ color: 0x00b14f, roughness: 0.54, metalness: 0.05 });
  const vpRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.52, metalness: 0.06 });
  const vpBoothDarkGreenMat = new THREE.MeshStandardMaterial({ color: 0x005230, roughness: 0.72, metalness: 0.04 });
  const vpBoothPlinthMat = new THREE.MeshStandardMaterial({ color: 0x6b655e, roughness: 0.86, metalness: 0.02 });
  const vpMintCarpetMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.92 });
  const welcomeMatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
  const oakWoodMat = new THREE.MeshStandardMaterial({ color: 0x926239, roughness: 0.68 });
  const darkWalnutMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.62 });
  const darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.58, metalness: 0.04 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.36, metalness: 0.65 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.38, metalness: 0.65 });
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
    emissive: 0xd1fae5,
    emissiveIntensity: 0.14,
    roughness: 0.65,
  });
  const emeraldLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x00b14f,
    emissiveIntensity: 0.22,
    roughness: 0.55,
  });

  // =========================================================================
  // 1. FORECOURT, 3 WIDE GRANITE STEPS & LANDSCAPING (FACING WEST -X)
  // =========================================================================
  const forecourt = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.10, 28.2), forecourtPaveMat);
  forecourt.position.set(385.9, 0.01, midZ + 1.1);
  staticGroup.add(forecourt);

  // 3 Wide Granite Steps leading up to Y = 0.36 podium (X = 385.9..388.0, Z = 78.5..93.5)
  [
    { x: 386.25, d: 0.70, h: 0.12 },
    { x: 386.95, d: 0.70, h: 0.24 },
    { x: 387.65, d: 0.70, h: 0.36 },
  ].forEach((st) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(st.d, st.h, 15.0), graniteStepMat);
    step.position.set(st.x, st.h * 0.5, midZ);
    staticGroup.add(step);
  });

  // Divider hedge between Highlands Coffee (Z=70.5) and VPBank (Z=73.0)
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.88 });
  const dividerHedge = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.75, 1.5), hedgeMat);
  dividerHedge.position.set(398.6, 0.375, 71.75);
  staticGroup.add(dividerHedge);

  // North Forecourt Planter Box with Ornamental Shrubs
  const northPlanter = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.52, 4.8), graniteStepMat);
  northPlanter.position.set(386.5, 0.26, 75.7);
  staticGroup.add(northPlanter);
  const northShrub = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.48, 4.4), hedgeMat);
  northShrub.position.set(386.5, 0.68, 75.7);
  staticGroup.add(northShrub);

  // VPBank 24/7 Totem Pylon on North-West Forecourt
  const totemTex = createTotemPylonTex();
  const totemMat = new THREE.MeshStandardMaterial({
    map: totemTex,
    emissive: 0xffffff,
    emissiveMap: totemTex,
    emissiveIntensity: 0.05,
    roughness: 0.65,
  });
  const totem = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.8, 0.92), totemMat);
  totem.position.set(385.05, 1.4, 74.5);
  staticGroup.add(totem);

  // South Forecourt Customer Motorbike Parking Bay
  const bikeColors = [0x00864f, 0xdc2626, 0xe2e8f0, 0x0f172a];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
  [94.4, 95.8, 97.1, 98.3].forEach((bz, idx) => {
    const mGrp = new THREE.Group();
    mGrp.position.set(385.8, 0.06, bz);
    mGrp.rotation.y = -Math.PI * 0.5 - 0.22;
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
  const floor1Slab = new THREE.Mesh(new THREE.BoxGeometry(bldgDepthX, 0.36, bldgWidthZ), marbleFloorMat);
  floor1Slab.position.set(midX, 0.18, midZ);
  staticGroup.add(floor1Slab);

  // Split Floor 2 slab cleanly around NE Stairwell Void (X = 402.0..409.0, Z = 73.6..77.4)
  const f2WestSlab = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.34, bldgWidthZ), marbleFloorMat);
  f2WestSlab.position.set(395.0, VPBANK_FLOOR2_Y - 0.17, midZ);
  staticGroup.add(f2WestSlab);
  const f2EastSouthSlab = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.34, 21.6), marbleFloorMat);
  f2EastSouthSlab.position.set(405.7, VPBANK_FLOOR2_Y - 0.17, 88.2);
  staticGroup.add(f2EastSouthSlab);

  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(bldgDepthX + 0.2, 0.45, bldgWidthZ + 0.2), whiteCladMat);
  roofSlab.position.set(midX, 11.65, midZ);
  staticGroup.add(roofSlab);

  const eastRearWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 11.5, bldgWidthZ), lobbyWallMat);
  eastRearWall.position.set(backX - 0.22, 5.95, midZ);
  staticGroup.add(eastRearWall);

  [minZ + 0.25, maxZ - 0.25].forEach((wz) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(bldgDepthX, 11.5, 0.50), whiteCladMat);
    sideWall.position.set(midX, 5.95, wz);
    staticGroup.add(sideWall);
  });

  // North & South White Aluminum Composite Facade Piers + VPBank Emerald/Crimson Architectural Reveals
  [minZ + 1.5, maxZ - 1.5].forEach((pz) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.65, 12.1, 3.0), whiteCladMat);
    pier.position.set(frontX, 6.05, pz);
    staticGroup.add(pier);

    [3.0, 6.0, 9.0].forEach((sy) => {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 3.04), seamDarkMat);
      seam.position.set(frontX, sy, pz);
      staticGroup.add(seam);
    });

    // Inner pier emerald & red signature edge accent strips
    const innerEdgeZ = pz < midZ ? pz + 1.48 : pz - 1.48;
    const greenFin = new THREE.Mesh(new THREE.BoxGeometry(0.70, 11.4, 0.12), vpGreenMat);
    greenFin.position.set(frontX, 5.9, innerEdgeZ);
    staticGroup.add(greenFin);
    const redCap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.2, 0.14), vpRedMat);
    redCap.position.set(frontX, 10.12, innerEdgeZ);
    staticGroup.add(redCap);
  });

  const topParapetBeam = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 26.2), whiteCladMat);
  topParapetBeam.position.set(frontX, 11.65, midZ);
  staticGroup.add(topParapetBeam);

  const upperSpandrelBeam = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 20.2), whiteCladMat);
  upperSpandrelBeam.position.set(frontX, 8.82, midZ);
  staticGroup.add(upperSpandrelBeam);

  const midFloorBeam = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 20.2), whiteCladMat);
  midFloorBeam.position.set(frontX, 4.82, midZ);
  staticGroup.add(midFloorBeam);

  // =========================================================================
  // 3. TOP VPBANK SIGNAGE GLASS SPANDREL + FLOOR 2 7-BAY CURTAIN WALL
  // =========================================================================
  const signTex = createVpbankFacadeSignTex();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: 0xffffff,
    emissiveMap: signTex,
    emissiveIntensity: 0.0,
    roughness: 0.72,
    metalness: 0.0,
  });

  const signGlass = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.24, 20.0), signMat);
  signGlass.position.set(frontX + 0.04, 10.12, midZ);
  staticGroup.add(signGlass);

  const f2Glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.58, 20.0), blueGlassMat);
  f2Glass.position.set(frontX + 0.06, 6.84, midZ);
  staticGroup.add(f2Glass);

  for (let i = 1; i <= 6; i++) {
    const mz = 76.0 + (20.0 / 7) * i;
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.66, 0.28), whiteCladMat);
    mullion.position.set(frontX + 0.02, 6.84, mz);
    staticGroup.add(mullion);
  }

  // =========================================================================
  // 4. FLOOR 1 DARK GRANITE PORTAL, SLIDING DOORS & SUSPENDED GLASS CANOPY
  // =========================================================================
  const northF1Glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.24, 5.5), blueGlassMat);
  northF1Glass.position.set(frontX + 0.04, 2.48, 78.75);
  staticGroup.add(northF1Glass);
  const southF1Glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.24, 5.5), blueGlassMat);
  southF1Glass.position.set(frontX + 0.04, 2.48, 93.25);
  staticGroup.add(southF1Glass);

  [81.9, 90.1].forEach((gz) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.62, 4.26, 0.84), graniteDarkMat);
    col.position.set(frontX - 0.06, 2.49, gz);
    staticGroup.add(col);
  });
  const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.66, 9.04), graniteDarkMat);
  portalHeader.position.set(frontX - 0.06, 4.29, midZ);
  staticGroup.add(portalHeader);

  [83.25, 88.75].forEach((sz) => {
    const sidePane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.60, 1.92), doorGlassMat);
    sidePane.position.set(frontX + 0.04, 2.16, sz);
    staticGroup.add(sidePane);
  });

  const doorLeft = new THREE.Group();
  doorLeft.position.set(frontX - 0.02, 2.16, 85.1);
  doorLeft.userData.noMerge = true;
  const dlGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.56, 1.80), doorGlassMat);
  doorLeft.add(dlGlass);
  const dlHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), chromeMat);
  dlHandle.position.set(-0.06, -0.1, 0.76);
  doorLeft.add(dlHandle);
  staticGroup.add(doorLeft);

  const doorRight = new THREE.Group();
  doorRight.position.set(frontX - 0.02, 2.16, 86.9);
  doorRight.userData.noMerge = true;
  const drGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.56, 1.80), doorGlassMat);
  doorRight.add(drGlass);
  const drHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), chromeMat);
  drHandle.position.set(-0.06, -0.1, -0.76);
  doorRight.add(drHandle);
  staticGroup.add(doorRight);

  const canopyGlass = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.09, 10.0), canopyGlassMat);
  canopyGlass.position.set(frontX - 1.25, 4.72, midZ);
  staticGroup.add(canopyGlass);
  const canopyTrimFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 10.06), chromeMat);
  canopyTrimFront.position.set(frontX - 2.46, 4.72, midZ);
  staticGroup.add(canopyTrimFront);

  [82.0, 84.65, 87.35, 90.0].forEach((rz) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.55, 8), chromeMat);
    rod.position.set(frontX - 1.12, 5.25, rz);
    rod.rotation.z = -1.12;
    staticGroup.add(rod);
  });

  // =========================================================================
  // 5. FLOOR 1 DETAILED INTERIOR BANKING HALL & SWITCHBACK STAIRCASE
  // =========================================================================
  const indoorDisplayMats: Array<{ mat: THREE.MeshStandardMaterial; dayGlow: number; nightGlow: number }> = [];

  // Split Floor 1 ceiling cleanly around NE Stairwell Void (X = 402.0..409.0, Z = 73.6..77.4)
  const f1WestCeil = new THREE.Mesh(new THREE.BoxGeometry(13.7, 0.12, bldgWidthZ - 0.6), whiteCladMat);
  f1WestCeil.position.set(395.15, 4.60, midZ);
  staticGroup.add(f1WestCeil);
  const f1EastSouthCeil = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.12, 21.3), whiteCladMat);
  f1EastSouthCeil.position.set(405.55, 4.60, 88.05);
  staticGroup.add(f1EastSouthCeil);

  const f2Ceiling = new THREE.Mesh(new THREE.BoxGeometry(bldgDepthX - 0.6, 0.12, bldgWidthZ - 0.6), whiteCladMat);
  f2Ceiling.position.set(midX, 8.75, midZ);
  staticGroup.add(f2Ceiling);

  [4.50, 8.66].forEach((cy, floorIdx) => {
    const coveE = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, floorIdx === 0 ? 19.6 : 23.0), emeraldLedMat);
    coveE.position.set(408.2, cy - 0.02, floorIdx === 0 ? 88.0 : midZ);
    staticGroup.add(coveE);
    const coveS = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.06, 0.12), emeraldLedMat);
    coveS.position.set(midX, cy - 0.02, 98.1);
    staticGroup.add(coveS);

    for (let lx = 390.5; lx <= 406.5; lx += 4.0) {
      for (let lz = 76.0; lz <= 96.0; lz += 4.8) {
        if (floorIdx === 0 && lx >= 401.2 && lz <= 78.2) continue;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1.8), ledPanelMat);
        panel.position.set(lx, cy, lz);
        staticGroup.add(panel);
      }
    }
    [
      [389.6, 74.6],
      [407.2, 96.8],
    ].forEach(([cx, cz]) => {
      const camBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.06, 10), whiteCladMat);
      camBase.position.set(cx, cy + 0.02, cz);
      staticGroup.add(camBase);
      const camDome = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), graniteDarkMat);
      camDome.position.set(cx, cy - 0.03, cz);
      staticGroup.add(camDome);
    });
  });

  // Entrance Welcome Carpet Mat & VPBank Green Threshold Strip
  const welcomeMat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.025, 4.4), welcomeMatMat);
  welcomeMat.position.set(389.1, VPBANK_PODIUM_Y + 0.012, midZ);
  staticGroup.add(welcomeMat);
  const matBorder = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.02, 4.5), vpGreenMat);
  matBorder.position.set(389.1, VPBANK_PODIUM_Y + 0.008, midZ);
  staticGroup.add(matBorder);

  // Structural Hall Columns with Granite Plinth & Fluted Oak Cladding
  [
    [398.6, 94.3],
    [398.6, 78.8],
  ].forEach(([cx, cz]) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.45, 0.76), graniteDarkMat);
    plinth.position.set(cx, VPBANK_PODIUM_Y + 0.225, cz);
    staticGroup.add(plinth);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.64, 3.8, 0.64), oakWoodMat);
    core.position.set(cx, VPBANK_PODIUM_Y + 2.35, cz);
    staticGroup.add(core);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.22, 0.74), chromeMat);
    cap.position.set(cx, 4.46, cz);
    staticGroup.add(cap);
  });

  // South Wall Architectural Oak Slats, FX LED Board & Service Posters
  for (let sx = 389.6; sx <= 406.8; sx += 0.44) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.85, 0.06), oakWoodMat);
    slat.position.set(sx, VPBANK_PODIUM_Y + 1.95, maxZ - 0.55);
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
  const fxFrame = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.82, 0.12), graniteDarkMat);
  fxFrame.position.set(397.8, VPBANK_PODIUM_Y + 2.55, maxZ - 0.62);
  staticGroup.add(fxFrame);
  const fxScreen = new THREE.Mesh(new THREE.BoxGeometry(2.56, 1.66, 0.06), fxMat);
  fxScreen.position.set(397.8, VPBANK_PODIUM_Y + 2.55, maxZ - 0.67);
  staticGroup.add(fxScreen);

  [
    { x: 394.4, h1: 'VPBANK NEO', h2: 'CHUYỂN TIỀN 0 ĐỒNG', accent: '#86efac' },
    { x: 401.2, h1: 'VPBANK DIAMOND', h2: 'ĐẶC QUYỀN THỊNH VƯỢNG', accent: '#fde047' },
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
    const pFrame = new THREE.Mesh(new THREE.BoxGeometry(1.24, 1.65, 0.08), brassMat);
    pFrame.position.set(p.x, VPBANK_PODIUM_Y + 2.45, maxZ - 0.61);
    staticGroup.add(pFrame);
    const pFace = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.52, 0.05), pMat);
    pFace.position.set(p.x, VPBANK_PODIUM_Y + 2.45, maxZ - 0.64);
    staticGroup.add(pFace);
  });

  // East Rear Backdrop Feature Wall: Vertical Oak Slats + Illuminated VPBank Sign + Vault Door + Credenza
  for (let rz = 78.6; rz <= 96.4; rz += 0.45) {
    const rearSlat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.15, 0.14), oakWoodMat);
    rearSlat.position.set(backX - 0.49, VPBANK_PODIUM_Y + 2.08, rz);
    staticGroup.add(rearSlat);
  }

  const wallLogoTex = createVpbankInteriorWallSignTex();
  const wallLogoMat = new THREE.MeshStandardMaterial({
    map: wallLogoTex,
    emissive: 0xffffff,
    emissiveMap: wallLogoTex,
    emissiveIntensity: 0.06,
    roughness: 0.65,
  });
  indoorDisplayMats.push({ mat: wallLogoMat, dayGlow: 0.06, nightGlow: 0.30 });
  const backBrandPanel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.35, 11.6), wallLogoMat);
  backBrandPanel.position.set(backX - 0.58, 3.05, 86.5);
  staticGroup.add(backBrandPanel);

  // Rear Credenza Filing & Printer Cabinets (X = 408.2, Z = 79.4..94.2)
  const credenza = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.96, 14.4), whiteCladMat);
  credenza.position.set(408.25, VPBANK_PODIUM_Y + 0.48, 86.8);
  staticGroup.add(credenza);
  const credenzaTop = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 14.5), darkWalnutMat);
  credenzaTop.position.set(408.25, VPBANK_PODIUM_Y + 0.99, 86.8);
  staticGroup.add(credenzaTop);
  const backPrinter = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.62, 0.85), graniteDarkMat);
  backPrinter.position.set(408.25, VPBANK_PODIUM_Y + 1.33, 81.2);
  staticGroup.add(backPrinter);
  [82.8, 83.4, 86.2, 86.8, 90.4, 91.0].forEach((bz, idx) => {
    const binder = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.34, 0.18),
      idx % 2 === 0 ? vpGreenMat : vpRedMat
    );
    binder.position.set(408.3, VPBANK_PODIUM_Y + 1.19, bz);
    staticGroup.add(binder);
  });

  // Reinforced Brushed Steel Bank Vault Door in SE Rear Corner (X = 408.65, Z = 96.4)
  const vaultFrame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.65, 1.75), graniteDarkMat);
  vaultFrame.position.set(408.65, VPBANK_PODIUM_Y + 1.325, 96.4);
  staticGroup.add(vaultFrame);
  const vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.42, 1.42), chromeMat);
  vaultDoor.position.set(408.58, VPBANK_PODIUM_Y + 1.26, 96.4);
  staticGroup.add(vaultDoor);
  const vaultWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), brassMat);
  vaultWheel.rotation.z = Math.PI / 2;
  vaultWheel.position.set(408.48, VPBANK_PODIUM_Y + 1.30, 96.15);
  staticGroup.add(vaultWheel);

  // Digital Queue LED Display above Teller Counters (X = 403.9, Z = 87.6)
  const queueTex = createQueueLedTex();
  const queueMat = new THREE.MeshStandardMaterial({
    map: queueTex,
    emissive: 0xffffff,
    emissiveMap: queueTex,
    emissiveIntensity: 0.14,
    roughness: 0.6,
  });
  indoorDisplayMats.push({ mat: queueMat, dayGlow: 0.14, nightGlow: 0.38 });
  const queueSign = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 3.8), queueMat);
  queueSign.position.set(403.95, 3.82, 87.6);
  staticGroup.add(queueSign);

  // 4 Glass-Partitioned Teller Counters (X = 403.95, Z = 79.3..95.9, facing West -X)
  const tellerBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 16.6), whiteCladMat);
  tellerBase.position.set(403.95, VPBANK_PODIUM_Y + 0.525, 87.6);
  staticGroup.add(tellerBase);
  const tellerKick = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.14, 16.66), graniteDarkMat);
  tellerKick.position.set(403.95, VPBANK_PODIUM_Y + 0.07, 87.6);
  staticGroup.add(tellerKick);
  const tellerLedStrip = new THREE.Mesh(new THREE.BoxGeometry(1.21, 0.06, 16.56), emeraldLedMat);
  tellerLedStrip.position.set(403.95, VPBANK_PODIUM_Y + 0.17, 87.6);
  staticGroup.add(tellerLedStrip);
  const tellerGreenTrim = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.16, 16.66), vpGreenMat);
  tellerGreenTrim.position.set(403.95, VPBANK_PODIUM_Y + 0.94, 87.6);
  staticGroup.add(tellerGreenTrim);
  const tellerTop = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.08, 16.8), graniteStepMat);
  tellerTop.position.set(403.95, VPBANK_PODIUM_Y + 1.08, 87.6);
  staticGroup.add(tellerTop);
  const tellerScreen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 16.4), blueGlassMat);
  tellerScreen.position.set(403.50, VPBANK_PODIUM_Y + 1.60, 87.6);
  staticGroup.add(tellerScreen);

  const counterLabels: Array<[number, string, string]> = [
    [81.45, '01', 'TIỀN MẶT'],
    [85.55, '02', 'CHUYỂN KHOẢN'],
    [89.65, '03', 'VPBANK NEO'],
    [93.75, '04', 'DIAMOND'],
  ];

  [79.4, 83.5, 87.6, 91.7, 95.8].forEach((pz) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.07), chromeMat);
    post.position.set(403.50, VPBANK_PODIUM_Y + 1.60, pz);
    staticGroup.add(post);
    const frontRib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.10), vpRedMat);
    frontRib.position.set(403.35, VPBANK_PODIUM_Y + 0.56, pz);
    staticGroup.add(frontRib);
  });

  counterLabels.forEach(([tz, num, sub]) => {
    const bTex = createCounterBadgeTex(num, sub);
    const bMat = new THREE.MeshStandardMaterial({
      map: bTex,
      emissive: 0xffffff,
      emissiveMap: bTex,
      emissiveIntensity: 0.06,
      roughness: 0.65,
    });
    indoorDisplayMats.push({ mat: bMat, dayGlow: 0.06, nightGlow: 0.28 });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 1.15), bMat);
    badge.position.set(403.50, VPBANK_PODIUM_Y + 2.28, tz);
    staticGroup.add(badge);

    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.58), graniteDarkMat);
    mon.position.set(404.10, VPBANK_PODIUM_Y + 1.34, tz - 0.18);
    staticGroup.add(mon);
    const monStand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.10), chromeMat);
    monStand.position.set(404.10, VPBANK_PODIUM_Y + 1.18, tz - 0.18);
    staticGroup.add(monStand);
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.42), graniteDarkMat);
    kb.position.set(404.30, VPBANK_PODIUM_Y + 1.13, tz - 0.18);
    staticGroup.add(kb);

    const counterMachine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.30), whiteCladMat);
    counterMachine.position.set(404.03, VPBANK_PODIUM_Y + 1.23, tz + 0.48);
    staticGroup.add(counterMachine);
    const counterScreen = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), emeraldLedMat);
    counterScreen.position.set(403.88, VPBANK_PODIUM_Y + 1.30, tz + 0.48);
    staticGroup.add(counterScreen);

    const posPad = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.14), graniteDarkMat);
    posPad.position.set(403.38, VPBANK_PODIUM_Y + 1.15, tz + 0.25);
    posPad.rotation.z = -0.35;
    staticGroup.add(posPad);
    const brochureHolder = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.16), vpGreenMat);
    brochureHolder.position.set(403.38, VPBANK_PODIUM_Y + 1.24, tz - 0.62);
    staticGroup.add(brochureHolder);

    // Tucked Ergonomic Teller Chair behind counter (X = 405.35) & Customer Stool in front (X = 403.05)
    staticGroup.add(buildOfficeChair(405.35, VPBANK_PODIUM_Y, tz, -Math.PI * 0.5, darkLeatherMat, chromeMat));
    const custStoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 12), vpGreenMat);
    custStoolSeat.position.set(403.05, VPBANK_PODIUM_Y + 0.62, tz);
    staticGroup.add(custStoolSeat);
    const custStoolStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.56, 8), chromeMat);
    custStoolStem.position.set(403.05, VPBANK_PODIUM_Y + 0.31, tz);
    staticGroup.add(custStoolStem);
    const custStoolBase = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.03, 12), chromeMat);
    custStoolBase.position.set(403.05, VPBANK_PODIUM_Y + 0.02, tz);
    staticGroup.add(custStoolBase);
  });

  // Queue Ticket Kiosk near Entrance (X = 390.8, Z = 83.4)
  const kioskBase = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.84), chromeMat);
  kioskBase.position.set(390.8, VPBANK_PODIUM_Y + 0.03, 83.4);
  staticGroup.add(kioskBase);
  const kioskStand = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.38, 0.72), whiteCladMat);
  kioskStand.position.set(390.8, VPBANK_PODIUM_Y + 0.72, 83.4);
  staticGroup.add(kioskStand);
  const kioskGreenStripe = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.24, 0.74), vpGreenMat);
  kioskGreenStripe.position.set(390.8, VPBANK_PODIUM_Y + 0.42, 83.4);
  staticGroup.add(kioskGreenStripe);
  const kioskScreen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.54), ledPanelMat);
  kioskScreen.position.set(390.55, VPBANK_PODIUM_Y + 1.24, 83.4);
  kioskScreen.rotation.z = 0.38;
  staticGroup.add(kioskScreen);

  // Security Check-in Podium (X = 389.4, Z = 82.0) beside entrance guard
  const secPodium = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.06, 0.68), graniteDarkMat);
  secPodium.position.set(389.4, VPBANK_PODIUM_Y + 0.53, 82.0);
  staticGroup.add(secPodium);
  const secTrim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.70), vpGreenMat);
  secTrim.position.set(389.4, VPBANK_PODIUM_Y + 0.94, 82.0);
  staticGroup.add(secTrim);
  const logBook = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.32), whiteCladMat);
  logBook.position.set(389.4, VPBANK_PODIUM_Y + 1.08, 82.0);
  staticGroup.add(logBook);

  // Floor 1 Customer Waiting Lounge (NW Bay: X = 392.2..397.8, Z = 74.0..79.4)
  const loungeRug = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.02, 5.2), vpMintCarpetMat);
  loungeRug.position.set(394.9, VPBANK_PODIUM_Y + 0.01, 76.7);
  staticGroup.add(loungeRug);

  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.20, 1.05), darkWalnutMat);
  sofaBase.position.set(394.9, VPBANK_PODIUM_Y + 0.10, 74.7);
  staticGroup.add(sofaBase);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.88, 0.26), vpGreenMat);
  sofaBack.position.set(394.9, VPBANK_PODIUM_Y + 0.54, 74.3);
  staticGroup.add(sofaBack);
  for (let i = 0; i < 4; i++) {
    const sx = 393.05 + i * 1.22;
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.84), vpGreenMat);
    cushion.position.set(sx, VPBANK_PODIUM_Y + 0.31, 74.8);
    staticGroup.add(cushion);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.32, 0.16),
      i % 2 === 0 ? whiteCladMat : vpRedMat
    );
    pillow.position.set(sx, VPBANK_PODIUM_Y + 0.56, 74.52);
    pillow.rotation.x = 0.18;
    staticGroup.add(pillow);
  }
  const sofaArmW = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.56, 1.04), vpGreenMat);
  sofaArmW.position.set(392.4, VPBANK_PODIUM_Y + 0.38, 74.7);
  staticGroup.add(sofaArmW);
  const sofaArmE = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.56, 1.04), vpGreenMat);
  sofaArmE.position.set(397.4, VPBANK_PODIUM_Y + 0.38, 74.7);
  staticGroup.add(sofaArmE);

  const loungeTableTop = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.06, 1.15), oakWoodMat);
  loungeTableTop.position.set(394.9, VPBANK_PODIUM_Y + 0.46, 77.35);
  staticGroup.add(loungeTableTop);
  [
    [393.9, 76.9],
    [395.9, 76.9],
    [393.9, 77.8],
    [395.9, 77.8],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 8), chromeMat);
    leg.position.set(lx, VPBANK_PODIUM_Y + 0.22, lz);
    staticGroup.add(leg);
  });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, 0.42), darkWalnutMat);
  tray.position.set(394.9, VPBANK_PODIUM_Y + 0.50, 77.35);
  staticGroup.add(tray);
  [394.75, 395.05].forEach((cx) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.09, 10), whiteCladMat);
    cup.position.set(cx, VPBANK_PODIUM_Y + 0.56, 77.35);
    staticGroup.add(cup);
  });
  const flyerStack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.24), vpGreenMat);
  flyerStack.position.set(395.7, VPBANK_PODIUM_Y + 0.51, 77.35);
  staticGroup.add(flyerStack);

  // Water Dispenser & Brochure Stand against North Wall (X = 398.9..399.6, Z = 74.1)
  const coolerBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.05, 0.46), whiteCladMat);
  coolerBody.position.set(399.0, VPBANK_PODIUM_Y + 0.525, 74.1);
  staticGroup.add(coolerBody);
  const coolerJug = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.48, 12), blueGlassMat);
  coolerJug.position.set(399.0, VPBANK_PODIUM_Y + 1.29, 74.1);
  staticGroup.add(coolerJug);
  const brochureRack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.38, 0.32), chromeMat);
  brochureRack.position.set(399.65, VPBANK_PODIUM_Y + 0.69, 74.1);
  staticGroup.add(brochureRack);

  // Floor 1 Advisory Consultation Desk (X = 397.1, Z = 91.0)
  const advTableTop = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 2.6), oakWoodMat);
  advTableTop.position.set(397.1, VPBANK_PODIUM_Y + 0.76, 91.0);
  staticGroup.add(advTableTop);
  const advModesty = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.72, 2.4), whiteCladMat);
  advModesty.position.set(397.1, VPBANK_PODIUM_Y + 0.36, 91.0);
  staticGroup.add(advModesty);
  const advPc = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.56), graniteDarkMat);
  advPc.position.set(397.1, VPBANK_PODIUM_Y + 0.98, 90.6);
  staticGroup.add(advPc);
  const advLampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.04, 10), brassMat);
  advLampBase.position.set(396.85, VPBANK_PODIUM_Y + 0.82, 91.7);
  staticGroup.add(advLampBase);
  const advLampShade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 10), vpGreenMat);
  advLampShade.position.set(396.85, VPBANK_PODIUM_Y + 1.12, 91.7);
  staticGroup.add(advLampShade);
  staticGroup.add(buildOfficeChair(397.78, VPBANK_PODIUM_Y, 91.0, -Math.PI * 0.5, darkLeatherMat, chromeMat));
  staticGroup.add(buildOfficeChair(396.42, VPBANK_PODIUM_Y, 90.4, Math.PI * 0.5, vpGreenMat, chromeMat));
  staticGroup.add(buildOfficeChair(396.42, VPBANK_PODIUM_Y, 91.6, Math.PI * 0.5, vpGreenMat, chromeMat));

  // Indoor Potted Ornamental Plants on Floor 1
  staticGroup.add(buildIndoorPlant(389.2, VPBANK_PODIUM_Y, 74.2, 1.12));
  staticGroup.add(buildIndoorPlant(398.6, VPBANK_PODIUM_Y, 94.3, 1.05));
  staticGroup.add(buildIndoorPlant(407.2, VPBANK_PODIUM_Y, 78.8, 1.0));

  // Indoor 24/7 Self-Service VPBank NEO Digibank + CDM Kiosks (SW Corner: X = 388.9..393.6, Z = 93.0..98.0)
  const atmScreenTex = createAtmScreenTex();
  const atmUiMat = new THREE.MeshStandardMaterial({
    map: atmScreenTex,
    emissive: 0xffffff,
    emissiveMap: atmScreenTex,
    emissiveIntensity: 0.10,
    roughness: 0.65,
  });
  indoorDisplayMats.push({ mat: atmUiMat, dayGlow: 0.10, nightGlow: 0.30 });

  const atmDivider = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.1, 0.16), vpGreenMat);
  atmDivider.position.set(391.2, VPBANK_PODIUM_Y + 1.55, 97.7);
  staticGroup.add(atmDivider);
  const atmHeaderStrip = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.28, 1.15), vpGreenMat);
  atmHeaderStrip.position.set(391.2, VPBANK_PODIUM_Y + 2.45, 96.55);
  staticGroup.add(atmHeaderStrip);

  [390.1, 392.4].forEach((ax) => {
    const atm = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.98, 0.95), whiteCladMat);
    atm.position.set(ax, VPBANK_PODIUM_Y + 0.99, 96.6);
    staticGroup.add(atm);
    const atmRecess = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.92, 0.12), graniteDarkMat);
    atmRecess.position.set(ax, VPBANK_PODIUM_Y + 1.24, 96.14);
    staticGroup.add(atmRecess);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.05), atmUiMat);
    scr.position.set(ax, VPBANK_PODIUM_Y + 1.38, 96.08);
    staticGroup.add(scr);
    const pinPad = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.18), chromeMat);
    pinPad.position.set(ax - 0.14, VPBANK_PODIUM_Y + 0.98, 96.02);
    staticGroup.add(pinPad);
    const cashSlot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.08), graniteDarkMat);
    cashSlot.position.set(ax, VPBANK_PODIUM_Y + 0.80, 96.07);
    staticGroup.add(cashSlot);
    const cardBezel = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.08), emeraldLedMat);
    cardBezel.position.set(ax + 0.24, VPBANK_PODIUM_Y + 1.04, 96.08);
    staticGroup.add(cardBezel);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.34, 1.12), vpGreenMat);
    hood.position.set(ax, VPBANK_PODIUM_Y + 2.08, 96.55);
    staticGroup.add(hood);
  });
  const privacyWing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.55, 0.85), blueGlassMat);
  privacyWing.position.set(391.25, VPBANK_PODIUM_Y + 1.25, 96.2);
  staticGroup.add(privacyWing);

  // Switchback Interior Staircase in NE Corner (X = 402.0 .. 408.4, Z = 73.8 .. 77.4)
  // Flight 1 (South lane, Z = 76.52): West (X=402.0, Y=0.36) -> East Landing (X=406.6, Y=midY)
  // Flight 2 (North lane, Z = 74.68): East Landing (X=406.6, Y=midY) -> West Upper (X=402.0, Y=5.0)
  const stairStepsCount = 10;
  const midY = (VPBANK_PODIUM_Y + VPBANK_FLOOR2_Y) * 0.5;

  const stairEastWall = new THREE.Mesh(new THREE.BoxGeometry(0.26, 8.6, 4.0), lobbyWallMat);
  stairEastWall.position.set(408.48, 4.45, 75.55);
  staticGroup.add(stairEastWall);
  const stairSouthBaseWall = new THREE.Mesh(new THREE.BoxGeometry(6.4, 4.5, 0.24), lobbyWallMat);
  stairSouthBaseWall.position.set(405.2, 2.55, 77.42);
  staticGroup.add(stairSouthBaseWall);

  const addStairStringer = (sz: number, yStart: number, xStart: number, yEnd: number, xEnd: number) => {
    const dy = yEnd - yStart;
    const dx = xEnd - xStart;
    const len = Math.hypot(dy, dx);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(len + 0.30, 0.24, 1.70), whiteCladMat);
    beam.position.set((xStart + xEnd) * 0.5, (yStart + yEnd) * 0.5 - 0.14, sz);
    beam.rotation.z = Math.atan2(dy, dx);
    staticGroup.add(beam);
  };
  addStairStringer(76.52, VPBANK_PODIUM_Y, 402.0, midY, 406.6);
  addStairStringer(74.68, midY, 406.6, VPBANK_FLOOR2_Y, 402.0);

  for (let i = 0; i < stairStepsCount; i++) {
    const t1 = (i + 0.5) / stairStepsCount;
    const y1 = THREE.MathUtils.lerp(VPBANK_PODIUM_Y, midY, t1);
    const x1 = 402.0 + t1 * 4.6;
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.28, 1.74), graniteStepMat);
    step1.position.set(x1, y1 - 0.02, 76.52);
    staticGroup.add(step1);
    const nose1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 1.74), brassMat);
    nose1.position.set(x1 - 0.23, y1 + 0.12, 76.52);
    staticGroup.add(nose1);

    const y2 = THREE.MathUtils.lerp(midY, VPBANK_FLOOR2_Y, t1);
    const x2 = 406.6 - t1 * 4.6;
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.28, 1.74), graniteStepMat);
    step2.position.set(x2, y2 - 0.02, 74.68);
    staticGroup.add(step2);
    const nose2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 1.74), brassMat);
    nose2.position.set(x2 + 0.23, y2 + 0.12, 74.68);
    staticGroup.add(nose2);
  }
  const midLanding = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.30, 3.65), graniteStepMat);
  midLanding.position.set(407.5, midY - 0.15, 75.6);
  staticGroup.add(midLanding);

  const addStairHandrail = (rz: number, yStart: number, xStart: number, yEnd: number, xEnd: number) => {
    const dy = yEnd - yStart;
    const dx = xEnd - xStart;
    const len = Math.hypot(dy, dx);
    const railH = 0.92;

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.08, 0.055, 0.06), chromeMat);
    topRail.position.set((xStart + xEnd) * 0.5, (yStart + yEnd) * 0.5 + railH, rz);
    topRail.rotation.z = Math.atan2(dy, dx);
    staticGroup.add(topRail);

    const midBar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.035, 0.035), chromeMat);
    midBar.position.set((xStart + xEnd) * 0.5, (yStart + yEnd) * 0.5 + railH * 0.52, rz);
    midBar.rotation.z = Math.atan2(dy, dx);
    staticGroup.add(midBar);

    [0.05, 0.50, 0.95].forEach((pt) => {
      const py = THREE.MathUtils.lerp(yStart, yEnd, pt);
      const px = THREE.MathUtils.lerp(xStart, xEnd, pt);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, railH, 8), chromeMat);
      post.position.set(px, py + railH * 0.5, rz);
      staticGroup.add(post);
    });
  };
  addStairHandrail(75.6, VPBANK_PODIUM_Y, 402.0, midY, 406.6);
  addStairHandrail(75.6, midY, 406.6, VPBANK_FLOOR2_Y, 402.0);
  addStairHandrail(77.25, VPBANK_PODIUM_Y, 402.0, midY, 406.6);
  addStairHandrail(73.92, midY, 406.6, VPBANK_FLOOR2_Y, 402.0);

  // Mid-landing wall art mounted flush on stairEastWall (X = 408.35)
  const landingArtTex = createServicePosterTex('VPBANK DIAMOND', 'PRIORITY LOUNGE ▲', '#fde047');
  const landingArtMat = new THREE.MeshStandardMaterial({
    map: landingArtTex,
    emissive: 0xffffff,
    emissiveMap: landingArtTex,
    emissiveIntensity: 0.04,
    roughness: 0.68,
  });
  indoorDisplayMats.push({ mat: landingArtMat, dayGlow: 0.04, nightGlow: 0.24 });
  const landingArt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.9, 1.5), landingArtMat);
  landingArt.position.set(408.32, midY + 1.35, 75.6);
  staticGroup.add(landingArt);

  // Stairwell Glass Balustrades on Floor 2 with Chrome Top Rails
  const f2StairRailS = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.05, 0.10), blueGlassMat);
  f2StairRailS.position.set(405.2, VPBANK_FLOOR2_Y + 0.52, 77.4);
  staticGroup.add(f2StairRailS);
  const f2RailTopS = new THREE.Mesh(new THREE.BoxGeometry(6.48, 0.06, 0.14), chromeMat);
  f2RailTopS.position.set(405.2, VPBANK_FLOOR2_Y + 1.06, 77.4);
  staticGroup.add(f2RailTopS);
  const f2StairRailW = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.05, 1.9), blueGlassMat);
  f2StairRailW.position.set(402.0, VPBANK_FLOOR2_Y + 0.52, 76.5);
  staticGroup.add(f2StairRailW);
  const f2RailTopW = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 1.96), chromeMat);
  f2RailTopW.position.set(402.0, VPBANK_FLOOR2_Y + 1.06, 76.5);
  staticGroup.add(f2RailTopW);

  // =========================================================================
  // 6. FLOOR 2 VPBANK DIAMOND LOUNGE & SME CORPORATE BANKING
  // =========================================================================
  const f2VipDivider = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.9, 14.0), blueGlassMat);
  f2VipDivider.position.set(396.2, VPBANK_FLOOR2_Y + 1.45, 81.0);
  staticGroup.add(f2VipDivider);
  const f2VipFrost = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 13.9), whiteCladMat);
  f2VipFrost.position.set(396.2, VPBANK_FLOOR2_Y + 1.25, 81.0);
  staticGroup.add(f2VipFrost);
  [74.1, 77.5, 81.0, 84.5, 87.9].forEach((mz) => {
    const mPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.95, 0.10), chromeMat);
    mPost.position.set(396.2, VPBANK_FLOOR2_Y + 1.47, mz);
    staticGroup.add(mPost);
  });

  // VPBank Diamond Boardroom Conference Zone (X = 390.2..394.8, Z = 75.0..81.2)
  const vipBoardRug = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.02, 6.4), vpMintCarpetMat);
  vipBoardRug.position.set(392.5, VPBANK_FLOOR2_Y + 0.01, 78.1);
  staticGroup.add(vipBoardRug);

  const vipConfTable = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.09, 4.6), darkWalnutMat);
  vipConfTable.position.set(392.5, VPBANK_FLOOR2_Y + 0.76, 78.1);
  staticGroup.add(vipConfTable);
  [76.5, 79.7].forEach((tz) => {
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.42), graniteDarkMat);
    pedestal.position.set(392.5, VPBANK_FLOOR2_Y + 0.36, tz);
    staticGroup.add(pedestal);
  });
  const confPhone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.05, 10), graniteDarkMat);
  confPhone.position.set(392.5, VPBANK_FLOOR2_Y + 0.83, 78.1);
  staticGroup.add(confPhone);
  [76.6, 79.6].forEach((pz) => {
    const folder = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.32), vpGreenMat);
    folder.position.set(392.9, VPBANK_FLOOR2_Y + 0.82, pz);
    staticGroup.add(folder);
    const waterBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), blueGlassMat);
    waterBottle.position.set(392.85, VPBANK_FLOOR2_Y + 0.91, pz + 0.24);
    staticGroup.add(waterBottle);
  });

  [76.5, 78.1, 79.7].forEach((cz) => {
    staticGroup.add(buildOfficeChair(393.55, VPBANK_FLOOR2_Y, cz, -Math.PI * 0.5, darkLeatherMat, chromeMat));
    staticGroup.add(buildOfficeChair(391.45, VPBANK_FLOOR2_Y, cz, Math.PI * 0.5, darkLeatherMat, chromeMat));
  });

  // Wall-mounted 75" Portfolio Dashboard TV on North Wall (Z = 73.65, X = 392.5)
  const tvTex = createVipBoardroomScreenTex();
  const tvMat = new THREE.MeshStandardMaterial({
    map: tvTex,
    emissive: 0xffffff,
    emissiveMap: tvTex,
    emissiveIntensity: 0.12,
    roughness: 0.6,
  });
  indoorDisplayMats.push({ mat: tvMat, dayGlow: 0.12, nightGlow: 0.34 });
  const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(2.58, 1.48, 0.10), graniteDarkMat);
  tvBezel.position.set(392.5, VPBANK_FLOOR2_Y + 1.95, minZ + 0.60);
  staticGroup.add(tvBezel);
  const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(2.42, 1.34, 0.06), tvMat);
  tvScreen.position.set(392.5, VPBANK_FLOOR2_Y + 1.95, minZ + 0.65);
  staticGroup.add(tvScreen);

  // Executive Hospitality Sofa Lounge (X = 390.5..394.5, Z = 83.6..90.8)
  const vipLoungeRug = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.02, 7.0), vpMintCarpetMat);
  vipLoungeRug.position.set(392.5, VPBANK_FLOOR2_Y + 0.01, 87.2);
  staticGroup.add(vipLoungeRug);

  const vipSofa = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.44, 5.2), vpGreenMat);
  vipSofa.position.set(391.4, VPBANK_FLOOR2_Y + 0.24, 87.2);
  staticGroup.add(vipSofa);
  const vipSofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.84, 5.2), vpGreenMat);
  vipSofaBack.position.set(390.92, VPBANK_FLOOR2_Y + 0.44, 87.2);
  staticGroup.add(vipSofaBack);
  [85.3, 87.2, 89.1].forEach((pz, idx) => {
    const pill = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.34, 0.42),
      idx === 1 ? vpRedMat : whiteCladMat
    );
    pill.position.set(391.15, VPBANK_FLOOR2_Y + 0.60, pz);
    pill.rotation.z = -0.2;
    staticGroup.add(pill);
  });
  const vipCoffee = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 2.8), graniteStepMat);
  vipCoffee.position.set(393.6, VPBANK_FLOOR2_Y + 0.21, 87.2);
  staticGroup.add(vipCoffee);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.28, 10), whiteCladMat);
  vase.position.set(393.6, VPBANK_FLOOR2_Y + 0.56, 87.2);
  staticGroup.add(vase);
  const orchid = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.16, 0),
    new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6 })
  );
  orchid.position.set(393.6, VPBANK_FLOOR2_Y + 0.76, 87.2);
  staticGroup.add(orchid);

  // Floor 2 Diamond Refreshment & Espresso Bar Counter (X = 388.9..391.7, Z = 94.1..98.0)
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.96, 3.8), whiteCladMat);
  barBase.position.set(390.1, VPBANK_FLOOR2_Y + 0.48, 96.2);
  staticGroup.add(barBase);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.08, 3.92), graniteDarkMat);
  barTop.position.set(390.1, VPBANK_FLOOR2_Y + 1.00, 96.2);
  staticGroup.add(barTop);
  const espressoMachine = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 0.75), chromeMat);
  espressoMachine.position.set(389.8, VPBANK_FLOOR2_Y + 1.33, 96.8);
  staticGroup.add(espressoMachine);
  const barChiller = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.95), blueGlassMat);
  barChiller.position.set(389.8, VPBANK_FLOOR2_Y + 1.46, 95.2);
  staticGroup.add(barChiller);

  // Floor 2 SME Corporate Desks (East side: X = 403.8, Z = 83.0 & Z = 92.4)
  [83.0, 92.4].forEach((dz) => {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.78, 5.4), whiteCladMat);
    desk.position.set(403.8, VPBANK_FLOOR2_Y + 0.39, dz);
    staticGroup.add(desk);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 5.5), oakWoodMat);
    deskTop.position.set(403.8, VPBANK_FLOOR2_Y + 0.81, dz);
    staticGroup.add(deskTop);
    const dividerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 5.2), blueGlassMat);
    dividerGlass.position.set(403.8, VPBANK_FLOOR2_Y + 1.08, dz);
    staticGroup.add(dividerGlass);

    [-1.4, 1.4].forEach((mz) => {
      const pc = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.58), graniteDarkMat);
      pc.position.set(404.05, VPBANK_FLOOR2_Y + 1.04, dz + mz);
      staticGroup.add(pc);
      const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 10), brassMat);
      lamp.position.set(403.55, VPBANK_FLOOR2_Y + 1.08, dz + mz + 0.45);
      staticGroup.add(lamp);
      staticGroup.add(buildOfficeChair(405.05, VPBANK_FLOOR2_Y, dz + mz, -Math.PI * 0.5, darkLeatherMat, chromeMat));
      staticGroup.add(buildOfficeChair(402.55, VPBANK_FLOOR2_Y, dz + mz, Math.PI * 0.5, vpGreenMat, chromeMat));
    });
  });

  // Floor 2 East Backdrop Wall Sign + Archive Cabinets + Branch Photocopier
  const f2LogoTex = createVpbankInteriorWallSignTex('VPBANK DIAMOND  •  CORPORATE BANKING');
  const f2LogoMat = new THREE.MeshStandardMaterial({
    map: f2LogoTex,
    emissive: 0xffffff,
    emissiveMap: f2LogoTex,
    emissiveIntensity: 0.06,
    roughness: 0.65,
  });
  indoorDisplayMats.push({ mat: f2LogoMat, dayGlow: 0.06, nightGlow: 0.28 });
  const f2LogoPanel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.9, 8.8), f2LogoMat);
  f2LogoPanel.position.set(backX - 0.56, VPBANK_FLOOR2_Y + 2.3, 88.2);
  staticGroup.add(f2LogoPanel);

  const f2Cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.80, 1.15, 12.8), darkWalnutMat);
  f2Cabinet.position.set(408.25, VPBANK_FLOOR2_Y + 0.575, 86.8);
  staticGroup.add(f2Cabinet);
  const f2Copier = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.05, 1.05), whiteCladMat);
  f2Copier.position.set(408.25, VPBANK_FLOOR2_Y + 0.525, 95.2);
  staticGroup.add(f2Copier);

  staticGroup.add(buildIndoorPlant(389.2, VPBANK_FLOOR2_Y, 74.2, 1.1));
  staticGroup.add(buildIndoorPlant(408.1, VPBANK_FLOOR2_Y, 78.6, 1.0));
  staticGroup.add(buildIndoorPlant(389.2, VPBANK_FLOOR2_Y, 93.2, 1.05));

  // =========================================================================
  // 6B. OUTDOOR 3-BAY VPBANK 24H ATM BOOTH (X = 383.8..392.6, Z = 100.2..109.4)
  // =========================================================================
  const boothMinZ = 100.2;
  const boothMaxZ = 109.4;
  const boothMidZ = (boothMinZ + boothMaxZ) * 0.5; // 104.8
  const boothBackX = 392.6;
  const boothMidX = 389.6;

  // Paved Sidewalk Apron connecting Đường Sơn Tây Nam Sidewalk (X = 383.8) to ATM Booth Plinth (X = 386.6)
  const boothApron = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 9.6), forecourtPaveMat);
  boothApron.position.set(385.3, 0.02, boothMidZ);
  staticGroup.add(boothApron);

  // Chamfered Concrete Plinth (Y = 0 .. 0.22) facing West (-X)
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
  plinthGeo.rotateY(-Math.PI / 2);
  const boothPlinth = new THREE.Mesh(plinthGeo, vpBoothPlinthMat);
  boothPlinth.position.set(boothMidX, 0.22, boothMidZ);
  staticGroup.add(boothPlinth);

  // Matching Chamfered Deep VPBank Emerald Canopy Roof Overhang (Y = 3.05 .. 4.10)
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
  boothRoofGeo.rotateY(-Math.PI / 2);
  const boothRoof = new THREE.Mesh(boothRoofGeo, vpBoothDarkGreenMat);
  boothRoof.position.set(boothMidX, 4.10, boothMidZ);
  staticGroup.add(boothRoof);

  // Booth Exterior Side Walls & Bright Emerald + Red Accent Frame
  [boothMinZ + 0.30, boothMaxZ - 0.30].forEach((sz) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.85, 0.60), vpBoothDarkGreenMat);
    sideWall.position.set(390.0, 2.14, sz);
    staticGroup.add(sideWall);
  });
  [boothMinZ + 0.56, boothMaxZ - 0.56].forEach((lz) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.08, 0.14), vpBrightGreenMat);
    jamb.position.set(387.58, 1.76, lz);
    staticGroup.add(jamb);
  });
  // Horizontal cornice stripes (bright emerald top, crimson red bottom) across front & chamfered wings
  const trimTopCenter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 6.92), vpBrightGreenMat);
  trimTopCenter.position.set(386.52, 3.96, boothMidZ);
  staticGroup.add(trimTopCenter);
  const trimBotCenter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 6.92), vpRedMat);
  trimBotCenter.position.set(386.52, 3.10, boothMidZ);
  staticGroup.add(trimBotCenter);

  [
    { z: boothMidZ - 4.02, ry: -0.76 },
    { z: boothMidZ + 4.02, ry: 0.76 },
  ].forEach((wing) => {
    const wTrimTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 1.68), vpBrightGreenMat);
    wTrimTop.position.set(387.06, 3.96, wing.z);
    wTrimTop.rotation.y = wing.ry;
    staticGroup.add(wTrimTop);
    const wTrimBot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 1.68), vpRedMat);
    wTrimBot.position.set(387.06, 3.10, wing.z);
    wTrimBot.rotation.y = wing.ry;
    staticGroup.add(wTrimBot);
  });

  // Main Centered Illuminated "VPBank 24h ATM" Fascia Signboard facing West (-X)
  const boothFasciaTex = createAtmBoothFasciaTex();
  const boothFasciaMat = new THREE.MeshStandardMaterial({
    map: boothFasciaTex,
    emissive: 0xffffff,
    emissiveMap: boothFasciaTex,
    emissiveIntensity: 0.04,
    roughness: 0.7,
  });
  const boothFasciaSign = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.80, 6.4), boothFasciaMat);
  boothFasciaSign.position.set(386.54, 3.53, boothMidZ);
  staticGroup.add(boothFasciaSign);

  // North Projecting Lightbox Sign ("VPBank 24h ATM") visible from Đường Sơn Tây Nam
  const boothSideTex = createAtmBoothSideSignTex();
  const boothSideMat = new THREE.MeshStandardMaterial({
    map: boothSideTex,
    emissive: 0xffffff,
    emissiveMap: boothSideTex,
    emissiveIntensity: 0.05,
    roughness: 0.65,
  });
  const sideBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 1.18), boothSideMat);
  sideBlade.position.set(387.3, 3.60, boothMinZ - 0.54);
  staticGroup.add(sideBlade);
  const sideBracket = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.24), seamDarkMat);
  sideBracket.position.set(387.3, 3.60, boothMinZ - 0.02);
  staticGroup.add(sideBracket);

  // Two Sturdy White-Clad Inner Columns flanking the Central ATM Bay
  [102.35, 107.25].forEach((cz) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.84, 3.04, 0.84), whiteCladMat);
    col.position.set(387.7, 1.74, cz);
    staticGroup.add(col);
  });

  // 3-Faceted Interior Wall Housing 3 VPBank 24h ATM / CDM Kiosks
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

    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, 3.04, 0.34), whiteCladMat);
    backPanel.position.set(0, 1.52, -0.17);
    bayGrp.add(backPanel);

    const greenBezel = new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.38, 0.22), vpBrightGreenMat);
    greenBezel.position.set(0, 1.38, 0.08);
    bayGrp.add(greenBezel);

    const atmBody = new THREE.Mesh(new THREE.BoxGeometry(1.14, 2.20, 0.26), vpBoothDarkGreenMat);
    atmBody.position.set(0, 1.38, 0.11);
    bayGrp.add(atmBody);

    const atmFace = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.12, 0.04), boothAtmFaceMat);
    atmFace.position.set(0, 1.38, 0.24);
    bayGrp.add(atmFace);

    [-0.56, 0.56].forEach((hx) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.38, 0.24), whiteCladMat);
      wing.position.set(hx, 1.62, 0.22);
      bayGrp.add(wing);
    });

    staticGroup.add(bayGrp);
  };

  buildBoothAtmBay(391.85, boothMidZ, -Math.PI * 0.5, 3.25);
  buildBoothAtmBay(391.12, boothMidZ - 2.68, -Math.PI * 0.5 - 0.44, 2.85);
  buildBoothAtmBay(391.12, boothMidZ + 2.68, -Math.PI * 0.5 + 0.44, 2.85);

  const boothRearSeal = new THREE.Mesh(new THREE.BoxGeometry(0.40, 3.04, 8.6), vpBoothDarkGreenMat);
  boothRearSeal.position.set(boothBackX - 0.20, 1.74, boothMidZ);
  staticGroup.add(boothRearSeal);

  // =========================================================================
  // 7. BANK PORTAL ROLLING SHUTTER (08:00-18:00) & LIGHTING (ATM 24/24)
  // =========================================================================
  const shutterTex = createRollingShutterTexture({
    title: 'NGÂN HÀNG VPBANK',
    hoursLabel: 'MỞ CỬA: 08:00 - 18:00  •  ATM 24/7',
    accentHex: '#007a47',
    slatDarkHex: '#1e293b',
    slatLightHex: '#475569',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.55, metalness: 0.25 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'vpbank_main_door',
      axis: 'z',
      pos: frontX - 0.14,
      spanCenter: midZ,
      width: 3.64,
      baseY: VPBANK_PODIUM_Y,
      topY: 3.96,
      thickness: 0.10,
    },
    shutterMat,
    graniteDarkMat
  );

  const f1Light = new THREE.PointLight(0xd1fae5, 0.8, 30.0, 1.2);
  f1Light.position.set(398.5, 4.1, midZ);
  scaledLights.push({ light: f1Light, dayInt: 0.35, nightInt: 1.9, getScale: () => 1.0 - mainShutter.progress });

  const f2Light = new THREE.PointLight(0xd1fae5, 0.8, 30.0, 1.2);
  f2Light.position.set(398.0, 8.2, midZ);
  scaledLights.push({ light: f2Light, dayInt: 0.35, nightInt: 2.0, getScale: () => 1.0 - mainShutter.progress });

  const porchLight = new THREE.PointLight(0xdcfce7, 0.6, 22.0, 1.2);
  porchLight.position.set(frontX - 1.4, 4.4, midZ);
  scaledLights.push({
    light: porchLight,
    dayInt: 0.2,
    nightInt: 1.8,
    getScale: () => 0.45 + 0.55 * (1.0 - mainShutter.progress),
  });

  const atmBoothLight = new THREE.PointLight(0xdcfce7, 0.6, 14.0, 1.2);
  atmBoothLight.position.set(389.2, 2.95, boothMidZ);
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
  const porchPool = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 14.0), porchPoolMat);
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(frontX - 2.2, 0.07, midZ);
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
    npcController?: VpbankNpcController | null,
    externalNpcNearDoor?: boolean
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isVpbankOpenAtHour(h);
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
      playerPos.x >= 383.4 &&
      playerPos.x <= 391.2 &&
      playerPos.z >= 81.6 &&
      playerPos.z <= 90.4 &&
      playerPos.y < 2.2;
    const nearPortalNpc = Boolean(npcController?.hasNpcNearDoor()) || Boolean(externalNpcNearDoor);

    const targetOpen = mainShutter.progress < 0.15 && (nearPortalPlayer || nearPortalNpc) ? 1.0 : 0.0;
    doorOpen = THREE.MathUtils.lerp(doorOpen, targetOpen, Math.min(1, dt * 8.5));
    doorLeft.position.z = 85.1 - doorOpen * 1.55;
    doorRight.position.z = 86.9 + doorOpen * 1.55;

    const openScale = 1.0 - mainShutter.progress;

    ledPanelMat.emissiveIntensity = (0.14 + lampFactor * 0.34) * openScale;
    emeraldLedMat.emissiveIntensity = (0.18 + lampFactor * 0.36) * openScale;
    for (let i = 0; i < indoorDisplayMats.length; i++) {
      const dm = indoorDisplayMats[i];
      dm.mat.emissiveIntensity = (dm.dayGlow + lampFactor * dm.nightGlow) * openScale;
    }

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
// VPBANK NPC CONTROLLER (TELLERS, BANK CUSTOMERS & 24/7 ATM USERS)
// =========================================================================
interface VpbankNpcActor {
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

export class VpbankNpcController {
  public readonly rootGroup = new THREE.Group();
  private actors: VpbankNpcActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const midY = (VPBANK_PODIUM_Y + VPBANK_FLOOR2_Y) * 0.5;

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
            new THREE.MeshStandardMaterial({ color: 0x00b14f, roughness: 0.4 })
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

      const seed = this.actors.length * 1.37 + 0.5;
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
        const spec = pickStationaryCivilianModel(actorIdx * 3 + 2);
        modelSource = spec.modelSource;
        targetHeight = spec.targetHeight;
        clipProfile = spec.clipProfile;
        rotationY = spec.rotationY;
      } else {
        const spec = pickOutsideNpcModel(actorIdx * 5 + 4);
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

    const f1ExitPath = (zOut: number): Array<[number, number, number]> => [
      [390.6, VPBANK_PODIUM_Y, 86.0],
      [388.0, VPBANK_PODIUM_Y, 86.0],
      [385.6, 0.0, 86.0],
      [382.6, 0.0, zOut],
    ];

    const f2ExitPath = (zOut: number): Array<[number, number, number]> => [
      [397.4, VPBANK_FLOOR2_Y, 79.2],
      [401.8, VPBANK_FLOOR2_Y, 74.7],
      [407.1, midY, 74.7],
      [407.4, midY, 76.5],
      [401.8, VPBANK_PODIUM_Y, 76.5],
      [390.6, VPBANK_PODIUM_Y, 86.0],
      [388.0, VPBANK_PODIUM_Y, 86.0],
      [385.6, 0.0, 86.0],
      [382.6, 0.0, zOut],
    ];

    // -----------------------------------------------------------------------
    // 1. VPBANK STAFF (08:00 - 18:00)
    // -----------------------------------------------------------------------
    [81.45, 85.55, 89.65, 93.75].forEach((tz, idx) => {
      addActor({
        kind: 'staff',
        staffRole: 'teller',
        x: 404.85,
        y: VPBANK_PODIUM_Y,
        z: tz,
        yaw: -Math.PI * 0.5,
        shirt: idx === 3 ? 0xf8fafc : 0x007a47,
        pants: idx === 3 ? 0x007a47 : 0x0f172a,
        skinHex: idx % 2 === 0 ? '#fbe0c8' : '#f5c7a3',
        exitWaypoints: [
          [404.85, VPBANK_PODIUM_Y, 78.2],
          [398.5, VPBANK_PODIUM_Y, 85.0],
          ...f1ExitPath(79.0 + idx * 3.0),
        ],
      });
    });

    addActor({
      kind: 'staff',
      staffRole: 'guard',
      x: 389.7,
      y: VPBANK_PODIUM_Y,
      z: 82.8,
      yaw: -Math.PI * 0.5 + 0.25,
      shirt: 0x1e3a8a,
      pants: 0x0f172a,
      skinHex: '#e8b48e',
      exitWaypoints: f1ExitPath(81.5),
    });

    addActor({
      kind: 'staff',
      staffRole: 'f2_banker',
      x: 404.6,
      y: VPBANK_FLOOR2_Y,
      z: 83.0,
      yaw: -Math.PI * 0.5,
      shirt: 0x007a47,
      pants: 0x0f172a,
      skinHex: '#fbe0c8',
      exitWaypoints: [[401.2, VPBANK_FLOOR2_Y, 80.5], ...f2ExitPath(90.5)],
    });

    addActor({
      kind: 'staff',
      staffRole: 'f2_walk',
      x: 394.8,
      y: VPBANK_FLOOR2_Y,
      z: 89.8,
      yaw: Math.PI * 0.5,
      shirt: 0xe2e8f0,
      pants: 0x1e293b,
      skinHex: '#e8b48e',
      speed: 1.2,
      waypoints: [
        { x: 394.8, y: VPBANK_FLOOR2_Y, z: 82.8, pauseSec: 2.0 },
        { x: 394.8, y: VPBANK_FLOOR2_Y, z: 89.8 },
        { x: 400.6, y: VPBANK_FLOOR2_Y, z: 89.8 },
        { x: 400.6, y: VPBANK_FLOOR2_Y, z: 82.8, pauseSec: 2.2 },
        { x: 400.6, y: VPBANK_FLOOR2_Y, z: 89.8 },
        { x: 394.8, y: VPBANK_FLOOR2_Y, z: 89.8 },
      ],
      exitWaypoints: f2ExitPath(93.5),
    });

    // -----------------------------------------------------------------------
    // 2. BANK CUSTOMERS WALKING IN & OUT THROUGH SLIDING DOORS (08:00 - 18:00)
    // -----------------------------------------------------------------------
    addActor({
      kind: 'bank_customer',
      x: 382.8,
      y: 0.0,
      z: 76.5,
      yaw: 0.1,
      shirt: 0x0284c7,
      pants: 0x1e293b,
      skinHex: '#f5c7a3',
      speed: 1.38,
      startWpIdx: 1,
      waypoints: [
        { x: 382.8, y: 0.0, z: 76.0, pauseSec: 1.2 },
        { x: 385.7, y: 0.0, z: 85.5 },
        { x: 388.0, y: VPBANK_PODIUM_Y, z: 85.7 },
        { x: 390.0, y: VPBANK_PODIUM_Y, z: 84.4 },
        { x: 390.8, y: VPBANK_PODIUM_Y, z: 82.6, pauseSec: 2.0, lookYaw: 0, action: 'kiosk' },
        { x: 399.8, y: VPBANK_PODIUM_Y, z: 85.4 },
        { x: 402.4, y: VPBANK_PODIUM_Y, z: 85.55, pauseSec: 4.6, lookYaw: Math.PI * 0.5, action: 'teller' },
        { x: 394.5, y: VPBANK_PODIUM_Y, z: 86.2 },
        { x: 388.0, y: VPBANK_PODIUM_Y, z: 86.0 },
        { x: 385.7, y: 0.0, z: 86.2 },
        { x: 382.6, y: 0.0, z: 95.8, pauseSec: 1.5 },
        { x: 382.8, y: 0.0, z: 86.0 },
      ],
    });

    addActor({
      kind: 'bank_customer',
      x: 390.8,
      y: VPBANK_PODIUM_Y,
      z: 86.3,
      yaw: Math.PI * 0.5,
      shirt: 0xe11d48,
      pants: 0x0f172a,
      skinHex: '#fbe0c8',
      speed: 1.32,
      startWpIdx: 3,
      waypoints: [
        { x: 383.0, y: 0.0, z: 96.5, pauseSec: 1.4 },
        { x: 385.7, y: 0.0, z: 86.6 },
        { x: 388.0, y: VPBANK_PODIUM_Y, z: 86.4 },
        { x: 392.0, y: VPBANK_PODIUM_Y, z: 87.8 },
        { x: 395.5, y: VPBANK_PODIUM_Y, z: 90.2, pauseSec: 3.8, lookYaw: Math.PI * 0.5, action: 'teller' },
        { x: 402.4, y: VPBANK_PODIUM_Y, z: 89.65, pauseSec: 4.2, lookYaw: Math.PI * 0.5, action: 'teller' },
        { x: 391.2, y: VPBANK_PODIUM_Y, z: 86.0 },
        { x: 388.0, y: VPBANK_PODIUM_Y, z: 86.0 },
        { x: 385.7, y: 0.0, z: 85.6 },
        { x: 383.0, y: 0.0, z: 75.2, pauseSec: 1.6 },
      ],
    });

    addActor({
      kind: 'bank_customer',
      x: 402.4,
      y: VPBANK_PODIUM_Y,
      z: 81.45,
      yaw: Math.PI * 0.5,
      shirt: 0xf59e0b,
      pants: 0x1e293b,
      skinHex: '#f5c7a3',
      speed: 1.28,
      startWpIdx: 4,
      waypoints: [
        { x: 382.3, y: 0.0, z: 79.0, pauseSec: 1.8 },
        { x: 385.7, y: 0.0, z: 85.4 },
        { x: 388.0, y: VPBANK_PODIUM_Y, z: 85.5 },
        { x: 396.2, y: VPBANK_PODIUM_Y, z: 81.2 },
        { x: 402.4, y: VPBANK_PODIUM_Y, z: 81.45, pauseSec: 4.4, lookYaw: Math.PI * 0.5, action: 'teller' },
        { x: 394.9, y: VPBANK_PODIUM_Y, z: 81.2 },
        { x: 388.0, y: VPBANK_PODIUM_Y, z: 86.0 },
        { x: 385.7, y: 0.0, z: 86.0 },
        { x: 382.3, y: 0.0, z: 93.2, pauseSec: 1.8 },
      ],
    });

    // -----------------------------------------------------------------------
    // 3. OUTDOOR 3-BAY VPBANK 24H ATM WITHDRAWAL NPCs (OPEN 24/24!)
    //    Cleanly navigate through openings Z = 101.36, 104.80, 108.24
    //    avoiding white columns at Z = 102.35 & 107.25 (X = 387.7)!
    // -----------------------------------------------------------------------
    addActor({
      kind: 'atm_user',
      x: 390.4,
      y: 0.22,
      z: 104.8,
      yaw: Math.PI * 0.5,
      shirt: 0x00864f,
      pants: 0x0f172a,
      skinHex: '#fbe0c8',
      speed: 1.32,
      withBankCard: true,
      startWpIdx: 3,
      waypoints: [
        { x: 383.2, y: 0.06, z: 98.8, pauseSec: 1.2 },
        { x: 386.0, y: 0.06, z: 104.8 },
        { x: 387.2, y: 0.22, z: 104.8 },
        { x: 390.4, y: 0.22, z: 104.8, pauseSec: 4.8, lookYaw: Math.PI * 0.5, action: 'atm' },
        { x: 387.2, y: 0.22, z: 104.8 },
        { x: 385.9, y: 0.06, z: 104.8 },
        { x: 382.9, y: 0.06, z: 110.2, pauseSec: 1.8 },
        { x: 382.6, y: 0.06, z: 103.5 },
      ],
    });

    addActor({
      kind: 'atm_user',
      x: 383.4,
      y: 0.06,
      z: 100.4,
      yaw: 0.4,
      shirt: 0xe11d48,
      pants: 0x1e293b,
      skinHex: '#f5c7a3',
      speed: 1.26,
      withBankCard: true,
      startWpIdx: 0,
      waypoints: [
        { x: 383.2, y: 0.06, z: 95.4, pauseSec: 1.6 },
        { x: 386.0, y: 0.06, z: 101.36 },
        { x: 387.7, y: 0.22, z: 101.36 },
        { x: 390.15, y: 0.22, z: 102.55, pauseSec: 5.2, lookYaw: Math.PI * 0.5 - 0.44, action: 'atm' },
        { x: 387.7, y: 0.22, z: 101.36 },
        { x: 386.0, y: 0.06, z: 101.36 },
        { x: 383.0, y: 0.06, z: 91.8, pauseSec: 2.0 },
      ],
    });

    addActor({
      kind: 'atm_user',
      x: 387.3,
      y: 0.22,
      z: 108.24,
      yaw: Math.PI * 0.5,
      shirt: 0x0ea5e9,
      pants: 0x0f172a,
      skinHex: '#e8b48e',
      speed: 1.30,
      withBankCard: true,
      startWpIdx: 2,
      waypoints: [
        { x: 383.3, y: 0.06, z: 110.2, pauseSec: 2.2 },
        { x: 386.0, y: 0.06, z: 108.24 },
        { x: 387.7, y: 0.22, z: 108.24 },
        { x: 390.15, y: 0.22, z: 107.05, pauseSec: 4.9, lookYaw: Math.PI * 0.5 + 0.44, action: 'atm' },
        { x: 387.7, y: 0.22, z: 108.24 },
        { x: 386.0, y: 0.06, z: 108.24 },
        { x: 382.5, y: 0.06, z: 100.6, pauseSec: 1.6 },
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
      if (a.kind === 'bank_customer' && a.root.position.x < 386.2) {
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
      if (p.y < 2.0 && p.x >= 385.8 && p.x <= 390.4 && p.z >= 83.4 && p.z <= 88.6) {
        return true;
      }
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private resetLimbsIdle(a: VpbankNpcActor, dt: number) {
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
    const isOpen = isVpbankOpenAtHour(h);

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
            new THREE.Vector3(388.6, VPBANK_PODIUM_Y, 86.0),
            new THREE.Vector3(385.6, 0.0, 86.0),
            new THREE.Vector3(382.6, 0.0, 79.0 + i * 2.5),
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
            a.rightArm.rotation.x = -0.88 + Math.sin(this.timer * 7.2 + a.seed) * 0.14;
            a.leftArm.rotation.x = -0.35 + Math.cos(this.timer * 2.4 + a.seed) * 0.06;
            a.headMesh.rotation.x = -0.10 + Math.sin(this.timer * 2.0 + a.seed) * 0.05;
            a.headMesh.rotation.y = Math.sin(this.timer * 1.4 + a.seed) * 0.08;
          } else if (currWp.action === 'teller') {
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
