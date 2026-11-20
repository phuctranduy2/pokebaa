import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { ADULT_NPC_MODELS, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isKhoiGardenOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';

export const KHOI_FLOOR2_Y = 4.50;

export function isPlayerInKhoiGardenZone(x: number, z: number): boolean {
  return x >= 206.0 && x <= 236.0 && z >= -40.5 && z <= -12.1;
}

export interface KhoiGardenBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: KhoiGardenNpcController | null
  ) => void;
  getClosedFactor: () => number;
}

// =========================================================================
// COLLIDERS: KHÓI FOOD GARDEN (X = 207.0 .. 235.8, Z = -40.0 .. -12.2)
// Frontage faces West onto Phố Đi Bộ right beside Quán Nhậu Ron Béo!
// Wide open aisles between outdoor tables, Floor 1 hall & Staircase (X=223..229, Z=-15.6..-13.0)
// =========================================================================
export const KHOI_GARDEN_COLLIDERS: IntersectionColliderBox[] = [
  // Perimeter Rear & Side Boundary Walls (West X=207.0 stays WIDE OPEN to Phố Đi Bộ!)
  { minX: 207.0, maxX: 235.8, minZ: -40.2, maxZ: -39.5, floor: 1 }, // North boundary garden wall
  { minX: 235.1, maxX: 235.9, minZ: -39.8, maxZ: -12.2, floor: 1 }, // East rear stone & stage wall
  { minX: 213.4, maxX: 235.8, minZ: -12.6, maxZ: -12.0, floor: 1 }, // South divider wall next to Ron Béo

  // Sculptural Coral-Wave Entry Art + Vertical KHÓI Pillar (SW/South Entry Corner)
  { minX: 211.2, maxX: 213.8, minZ: -14.8, maxZ: -12.3, floor: 1 },
  // Left/North Garden Tree & Botanical Planter
  { minX: 207.6, maxX: 210.4, minZ: -39.6, maxZ: -37.2, floor: 1 },

  // Floor 1 Structural Red-LED Portal Columns along X = 213.7 (leaving wide open dining bays!)
  ...[-13.6, -21.6, -30.2, -38.4].map((cz) => ({
    minX: 213.35,
    maxX: 214.05,
    minZ: cz - 0.38,
    maxZ: cz + 0.38,
    floor: 1 as const,
  })),

  // Live Stage DJ Booth & Speaker Stacks (Rear East Center X=233.2..235.2, Z=-29.6..-22.4)
  { minX: 233.2, maxX: 235.2, minZ: -29.8, maxZ: -22.2, floor: 1 },

  // Outdoor Phố Đi Bộ Beer-Garden & Floor 1 Hall Table Sets (wide open promenade & aisles!)
  ...[
    [209.6, -17.6],
    [209.6, -21.6],
    [209.6, -25.6],
    [209.6, -29.6],
    [209.6, -33.6],
    [217.5, -18.5],
    [217.5, -24.5],
    [217.5, -31.5],
    [224.8, -21.5],
    [224.8, -28.5],
  ].map(([tx, tz]) => ({
    minX: tx - 1.15,
    maxX: tx + 1.15,
    minZ: tz - 1.0,
    maxZ: tz + 1.0,
    floor: 1 as const,
  })),

  // Interior Staircase North Safety Rail (open ONLY at West foot X = 223.0!)
  { minX: 223.0, maxX: 229.4, minZ: -15.85, maxZ: -15.45, floor: 1 },
  // Central Interior Kitchen & Bar Counter (back right North-East)
  { minX: 230.2, maxX: 235.1, minZ: -39.4, maxZ: -31.5, floor: 1 },

  // Floor 2 Mezzanine Perimeter & Safety Balustrades (X = 214.0..235.4, Z = -39.6..-12.4)
  { minX: 213.8, maxX: 214.3, minZ: -39.6, maxZ: -12.4, floor: 2 }, // Floor 2 West overlooking balcony rail
  { minX: 213.8, maxX: 235.6, minZ: -39.8, maxZ: -39.3, floor: 2 }, // Floor 2 North wall
  { minX: 235.1, maxX: 235.8, minZ: -39.8, maxZ: -12.2, floor: 2 }, // Floor 2 East wall
  { minX: 213.8, maxX: 235.6, minZ: -12.7, maxZ: -12.1, floor: 2 }, // Floor 2 South wall
  // Floor 2 Stairwell Opening Safety Balustrade (open ONLY at East landing X >= 229.0)
  { minX: 222.8, maxX: 229.2, minZ: -15.85, maxZ: -15.45, floor: 2 },
  { minX: 222.8, maxX: 223.2, minZ: -15.85, maxZ: -12.4, floor: 2 },
  // Floor 2 Balcony Dining Tables
  ...[
    [217.5, -20.0],
    [217.5, -28.0],
    [225.5, -24.0],
    [225.5, -33.0],
  ].map(([tx, tz]) => ({
    minX: tx - 1.15,
    maxX: tx + 1.15,
    minZ: tz - 1.0,
    maxZ: tz + 1.0,
    floor: 2 as const,
  })),
];

function roundRectPath(
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

/**
 * Architectural Silhouette "KHÓI" Upper Facade CanvasTexture (Transparent Sky Cutout):
 * - Top of 'H' and stylized acute mark '´' cleanly break ABOVE the red perimeter neon frame
 * - Vertical glowing crimson laser ribs across the dark architectural upper bay
 * - Diagonal staggered B&W 3D checkered cubes with warm amber Floor 2 interior glow gaps
 * - Crisp double-outlined luminous white "KHÓI" hero lettering
 */
function createKhoiHeroFacadeTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 840;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);

  // Outer Facade Silhouette Body (below sky crown line y = 116)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(32, h);
  ctx.lineTo(32, 134);
  ctx.lineTo(w - 32, 114);
  ctx.lineTo(w - 32, h);
  ctx.closePath();
  ctx.clip();

  // Deep Obsidian Backdrop with subtle vertical architectural gradient
  const bgGrad = ctx.createLinearGradient(0, 114, 0, h);
  bgGrad.addColorStop(0, '#07090f');
  bgGrad.addColorStop(0.55, '#0b0f19');
  bgGrad.addColorStop(1, '#121722');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle Warm Amber/Rose Floor 2 Interior Glow Windows peeking behind the screen
  const winGlowLeft = ctx.createRadialGradient(540, 560, 20, 540, 560, 320);
  winGlowLeft.addColorStop(0, 'rgba(251, 146, 60, 0.42)');
  winGlowLeft.addColorStop(0.5, 'rgba(239, 68, 68, 0.16)');
  winGlowLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = winGlowLeft;
  ctx.fillRect(160, 320, 760, 480);

  const winGlowRight = ctx.createRadialGradient(1480, 540, 20, 1480, 540, 340);
  winGlowRight.addColorStop(0, 'rgba(253, 186, 116, 0.48)');
  winGlowRight.addColorStop(0.5, 'rgba(244, 63, 94, 0.18)');
  winGlowRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = winGlowRight;
  ctx.fillRect(1080, 280, 800, 520);

  // Diagonal V-Chevron Crimson Laser Ribs (mirroring the dramatic angle in Screenshot 2)
  ctx.save();
  for (let rx = 38; rx < w - 38; rx += 16) {
    const isBright = rx % 32 === 0;
    ctx.strokeStyle = isBright ? 'rgba(248, 113, 113, 0.92)' : 'rgba(220, 38, 38, 0.56)';
    ctx.lineWidth = isBright ? 4.2 : 2.6;
    const ribBottom =
      rx < w * 0.52
        ? h * 0.42 + (rx / (w * 0.52)) * 210
        : h * 0.42 + ((w - rx) / (w * 0.48)) * 210;
    ctx.beginPath();
    ctx.moveTo(rx, 118);
    ctx.lineTo(rx, Math.min(h - 20, ribBottom));
    ctx.stroke();
  }
  ctx.restore();

  // Staggered Diagonal Black & White Checkered Cube Matrix with 3D Bevel Highlight
  const tile = 32;
  for (let gx = 0; gx * tile < w; gx++) {
    for (let gy = 0; gy * tile < h; gy++) {
      const x = gx * tile;
      const y = gy * tile;
      if (y < 230) continue;
      const peak1 = y > 380 + Math.abs(x - w * 0.30) * 0.62;
      const peak2 = y > 430 + Math.abs(x - w * 0.54) * 0.55;
      const peak3 = y > 320 + Math.max(0, w * 0.84 - x) * 0.56 && x > w * 0.58;
      if (peak1 || peak2 || peak3) {
        const isWhite = (gx + gy) % 2 === 0;
        if (isWhite) {
          const cellGrad = ctx.createLinearGradient(x, y, x + tile, y + tile);
          cellGrad.addColorStop(0, '#f8fafc');
          cellGrad.addColorStop(1, '#cbd5e1');
          ctx.fillStyle = cellGrad;
          ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        } else {
          // Dark open glass cube showing slight warm tint where Floor 2 shines through
          ctx.fillStyle = y > 470 && y < 650 ? 'rgba(24, 18, 22, 0.88)' : '#090b10';
          ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        }
      }
    }
  }
  ctx.restore();

  // Outer Glowing Crimson Neon Architectural Frame
  ctx.save();
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 22;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(36, h - 8);
  ctx.lineTo(36, 136);
  ctx.lineTo(w - 36, 116);
  ctx.lineTo(w - 36, h - 8);
  ctx.stroke();
  ctx.restore();

  // Giant Double-Outlined White Neon "KHÓI" Lettering (breaking above red roof!)
  const drawOutlinedLetter = (drawPathFn: () => void, isHole = false) => {
    // Solid opaque letter silhouette (for cut-out crispness against sky & facade)
    ctx.save();
    drawPathFn();
    ctx.fillStyle = isHole ? '#080b12' : '#090d16';
    ctx.fill();
    ctx.lineWidth = 28;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#090d16';
    ctx.stroke();
    ctx.restore();

    // Outer luminous white neon outline
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 26;
    drawPathFn();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.restore();

    // Inner bright core hairline
    ctx.save();
    drawPathFn();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();
  };

  // K
  drawOutlinedLetter(() => {
    ctx.beginPath();
    ctx.moveTo(148, 200);
    ctx.lineTo(246, 200);
    ctx.lineTo(246, 435);
    ctx.lineTo(488, 195);
    ctx.lineTo(616, 195);
    ctx.lineTo(360, 472);
    ctx.lineTo(622, 790);
    ctx.lineTo(484, 790);
    ctx.lineTo(246, 515);
    ctx.lineTo(246, 790);
    ctx.lineTo(148, 790);
    ctx.closePath();
  });

  // H (Right vertical pillar breaks proudly ABOVE the red frame into the night sky!)
  drawOutlinedLetter(() => {
    ctx.beginPath();
    ctx.moveTo(648, 232);
    ctx.lineTo(748, 232);
    ctx.lineTo(748, 422);
    ctx.lineTo(946, 422);
    ctx.lineTo(946, 24);
    ctx.lineTo(1050, 48);
    ctx.lineTo(1050, 764);
    ctx.lineTo(946, 764);
    ctx.lineTo(946, 522);
    ctx.lineTo(748, 522);
    ctx.lineTo(748, 764);
    ctx.lineTo(648, 764);
    ctx.closePath();
  });

  // O + Inner ring hole + Bold Acute Accent (´ breaking above red line!)
  drawOutlinedLetter(() => {
    ctx.beginPath();
    ctx.ellipse(1350, 545, 224, 214, 0, 0, Math.PI * 2);
  });
  drawOutlinedLetter(() => {
    ctx.beginPath();
    ctx.ellipse(1350, 545, 114, 110, 0, 0, Math.PI * 2);
  }, true);
  drawOutlinedLetter(() => {
    ctx.beginPath();
    ctx.moveTo(1248, 206);
    ctx.lineTo(1520, 74);
    ctx.lineTo(1458, 212);
    ctx.lineTo(1218, 256);
    ctx.closePath();
  });

  // I
  drawOutlinedLetter(() => {
    ctx.beginPath();
    ctx.moveTo(1668, 205);
    ctx.lineTo(1826, 150);
    ctx.lineTo(1826, 792);
    ctx.lineTo(1668, 792);
    ctx.closePath();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHeinekenSilverBadgeTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 144;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#070a10';
  ctx.fillRect(0, 0, 512, 144);

  const grad = ctx.createLinearGradient(14, 14, 498, 130);
  grad.addColorStop(0, '#044d38');
  grad.addColorStop(0.5, '#059669');
  grad.addColorStop(1, '#044d38');
  ctx.fillStyle = grad;
  roundRectPath(ctx, 14, 14, 484, 116, 18);
  ctx.fill();
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 4;
  roundRectPath(ctx, 14, 14, 484, 116, 18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('SILVER', 216, 46);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText('Heineken', 216, 94);

  // Signature Red Star emblem
  ctx.fillStyle = '#ef4444';
  ctx.font = '900 60px system-ui, sans-serif';
  ctx.fillText('★', 422, 74);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKhoiStageScreenTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createRadialGradient(512, 256, 20, 512, 256, 560);
  bg.addColorStop(0, '#0ea5e9');
  bg.addColorStop(0.32, '#2563eb');
  bg.addColorStop(0.62, '#6d28d9');
  bg.addColorStop(0.88, '#991b1b');
  bg.addColorStop(1, '#07080d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  // Diagonal stage rays
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(244, 63, 94, 0.22)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(512, 256);
    ctx.lineTo(512 + Math.cos(angle) * 600, 256 + Math.sin(angle) * 400);
    ctx.stroke();
  }
  ctx.restore();

  // Concentric neon rings
  [224, 178, 134, 90].forEach((r, i) => {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(103, 232, 249, 0.92)' : 'rgba(251, 113, 133, 0.88)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(512, 256, r * 1.48, r * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 76px system-ui, sans-serif';
  ctx.fillText('KHÓI', 512, 232);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#a5f3fc';
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText('FOOD GARDEN • LIVE DJ & ACOUSTIC', 512, 304);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKhoiMiniVerticalTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#090b10';
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 8;
  roundRectPath(ctx, 10, 10, 236, 492, 16);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 74px system-ui, sans-serif';
  ctx.fillText('KHÓI', 128, 165);
  ctx.fillStyle = '#fca5a5';
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText('FOOD', 128, 280);
  ctx.fillText('GARDEN', 128, 326);
  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('16:00 – 07:00', 128, 415);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKhoiSculptureHeaderTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#11131a';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#fda4af';
  ctx.lineWidth = 5;
  roundRectPath(ctx, 8, 8, 496, 144, 14);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 72px system-ui, sans-serif';
  ctx.fillText('KHÓI', 256, 68);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fda4af';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('FOOD GARDEN', 256, 126);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKhoiGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
  grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.14)');
  grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createKhoiGardenStructure(): KhoiGardenBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Rich Architectural Materials
  const patioStoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3c, roughness: 0.78 });
  const hallFloorMat = new THREE.MeshStandardMaterial({ color: 0x161a24, roughness: 0.42, metalness: 0.22 });
  const floor2DeckMat = new THREE.MeshStandardMaterial({ color: 0x221b18, roughness: 0.52 });
  const obsidianSteelMat = new THREE.MeshStandardMaterial({ color: 0x0e121a, roughness: 0.36, metalness: 0.72 });
  const slateRockWallMat = new THREE.MeshStandardMaterial({ color: 0x292d38, roughness: 0.85 });
  const carvedStoneReliefMat = new THREE.MeshStandardMaterial({ color: 0x353b4a, roughness: 0.88 });
  const whiteAwningMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff7ed,
    emissiveIntensity: 0.34,
    roughness: 0.42,
  });
  const coralArtMat = new THREE.MeshStandardMaterial({
    color: 0xfbe7de,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.14,
    roughness: 0.44,
  });
  const gardenLeafDarkMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.82 });
  const gardenLeafBrightMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 });
  const woodBarkMat = new THREE.MeshStandardMaterial({ color: 0x4b2f20, roughness: 0.88 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.88 });
  const blackTableMat = new THREE.MeshStandardMaterial({ color: 0x11141b, roughness: 0.38 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.34,
  });
  const beerGreenBottleMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.18 });
  const beerAmberTowerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.42,
    roughness: 0.2,
  });
  const iceBucketMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.22, metalness: 0.78 });

  const redNeonMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.75,
    roughness: 0.2,
  });
  const whiteNeonMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe2e8f0,
    emissiveIntensity: 1.55,
    roughness: 0.16,
  });
  const cyanNeonMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.45,
    roughness: 0.18,
  });
  const roseBacklitMat = new THREE.MeshStandardMaterial({
    color: 0xfda4af,
    emissive: 0xfb7185,
    emissiveIntensity: 1.15,
    roughness: 0.25,
  });
  const warmBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.5,
    roughness: 0.18,
  });

  neonMats.push(redNeonMat, whiteNeonMat, cyanNeonMat, roseBacklitMat);
  lanternMats.push(warmBulbMat);

  const signDynamicMats: THREE.MeshStandardMaterial[] = [];

  const poolTex = createKhoiGlowPoolTex();
  const khoiPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(khoiPoolMat);

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material
  ) => {
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    const d = Math.abs(z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    staticGroup.add(m);
    return m;
  };

  // =========================================================================
  // 1. FLOOR SLABS (PATIO + OPEN-AIR BEER GARDEN HALL: X=207..235.8, Z=-40..-12.2)
  // =========================================================================
  addBox(207.0, 214.0, -0.25, 0.0, -40.0, -12.2, patioStoneMat);
  addBox(214.0, 235.8, -0.25, 0.01, -40.0, -12.2, hallFloorMat);

  const pool = new THREE.Mesh(new THREE.PlaneGeometry(20, 26), khoiPoolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(213.5, 0.025, -26.0);
  staticGroup.add(pool);

  // =========================================================================
  // 2. ICONIC GIANT "KHÓI" UPPER FACADE (UNOBSTRUCTED + SKY-BREAKOUT SILHOUETTE!)
  // =========================================================================
  // Steel backing strictly recessed at X = 213.68..214.05 and capped below H/acute top (Y <= 12.15)
  addBox(213.68, 214.05, 5.44, 12.15, -39.3, -12.7, obsidianSteelMat);

  // Hero Cutout "KHÓI" Facade Texture facing West (-X) with transparent top sky cutout!
  const heroTex = createKhoiHeroFacadeTex();
  const heroMat = new THREE.MeshStandardMaterial({
    map: heroTex,
    emissive: 0xffffff,
    emissiveMap: heroTex,
    emissiveIntensity: 1.05,
    roughness: 0.22,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
  });
  signDynamicMats.push(heroMat);

  // Bottom of heroPlane aligns cleanly at Y = 5.44 (height 8.4 -> center Y = 9.64, top Y = 13.84!)
  const heroPlane = new THREE.Mesh(new THREE.PlaneGeometry(25.8, 8.4), heroMat);
  heroPlane.rotation.y = -Math.PI / 2;
  heroPlane.position.set(213.48, 9.64, -26.0);
  staticGroup.add(heroPlane);

  // 3D Outer Red Perimeter Neon Frame Bars surrounding the billboard cleanly (no center beam!)
  addBox(213.38, 213.46, 5.44, 12.22, -38.88, -38.72, redNeonMat);
  addBox(213.38, 213.46, 5.44, 12.42, -13.28, -13.12, redNeonMat);

  // Clean Lower Fascia Beam (Y = 4.48..5.44) + Two Crisp Unclipped "Heineken SILVER ★" Lightboxes
  addBox(213.48, 214.05, 4.48, 5.44, -39.4, -12.6, obsidianSteelMat);
  const heinekenTex = createHeinekenSilverBadgeTex();
  const heinekenMat = new THREE.MeshStandardMaterial({
    map: heinekenTex,
    emissive: 0xffffff,
    emissiveMap: heinekenTex,
    emissiveIntensity: 0.98,
  });
  signDynamicMats.push(heinekenMat);

  [-33.6, -18.4].forEach((bz) => {
    // Sleek steel trim frame + fully unobstructed Heineken Silver lightbox (Y=4.52..5.40!)
    addBox(213.38, 213.47, 4.50, 5.42, bz - 2.25, bz + 2.25, obsidianSteelMat);
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.88), heinekenMat);
    badge.rotation.y = -Math.PI / 2;
    badge.position.set(213.36, 4.96, bz);
    staticGroup.add(badge);
  });

  // =========================================================================
  // 3. BRIGHT WHITE PLEATED WAVE CANOPY + 20 WARM EDISON LIGHTS + RED/WHITE COLUMNS
  // =========================================================================
  // Dark structural canopy frame strictly between Y=4.30..4.46 (below Heineken fascia!)
  addBox(211.15, 213.85, 4.30, 4.46, -39.25, -12.75, obsidianSteelMat);
  // Crisp White Pleated Roof Underside Soffit so upward view glows warm white!
  addBox(211.2, 213.8, 4.24, 4.30, -39.2, -12.8, whiteAwningMat);

  // Double-layered Sculpted Billowing White Fabric Wave Swags along West edge (X = 211.15)
  for (let wz = -38.55; wz <= -13.45; wz += 1.32) {
    const swag = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.34, 12, 1, false, 0, Math.PI), whiteAwningMat);
    swag.rotation.z = Math.PI / 2;
    swag.rotation.x = Math.PI;
    swag.position.set(211.18, 4.28, wz);
    staticGroup.add(swag);
  }
  // Row of 20 Bright Warm Edison Canopy Bulbs along awning edge
  for (let bz = -38.6; bz <= -13.4; bz += 1.32) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), warmBulbMat);
    bulb.position.set(211.24, 3.98, bz);
    staticGroup.add(bulb);
  }

  // Vibrant Twin-Red + White-Core Vertical Neon Columns along Floor 1 Entrance Bays
  [-13.6, -21.6, -30.2, -38.4].forEach((cz) => {
    addBox(213.42, 214.02, 0.0, 4.32, cz - 0.32, cz + 0.32, obsidianSteelMat);
    addBox(213.36, 213.44, 0.04, 4.26, cz - 0.28, cz - 0.19, redNeonMat);
    addBox(213.36, 213.44, 0.04, 4.26, cz + 0.19, cz + 0.28, redNeonMat);
    addBox(213.36, 213.44, 0.04, 4.26, cz - 0.05, cz + 0.05, whiteNeonMat);
    // Warm crimson/amber floor uplight pad around column base
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.62, 16), redNeonMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(213.7, 0.02, cz);
    staticGroup.add(pad);
  });

  // Rolling Security Shutters sealing the 3 Floor 1 Dining Bays along X = 213.7 (Closed 07:00 - 16:00)
  const khoiShutterTex = createRollingShutterTexture({
    title: 'KHÓI FOOD GARDEN',
    hoursLabel: 'MỞ CỬA: 16:00 CHIỀU – 07:00 SÁNG',
    accentHex: '#dc2626',
  });
  const khoiShutterMat = new THREE.MeshStandardMaterial({
    map: khoiShutterTex,
    roughness: 0.42,
    metalness: 0.62,
  });
  const khoiShutters: RollingShutterHandle[] = [
    createRollingShutterDoor(
      staticGroup,
      { id: 'khoi_shutter_south', axis: 'z', pos: 213.7, spanCenter: -17.625, width: 7.25, baseY: 0.0, topY: 4.24 },
      khoiShutterMat,
      obsidianSteelMat
    ),
    createRollingShutterDoor(
      staticGroup,
      { id: 'khoi_shutter_center', axis: 'z', pos: 213.7, spanCenter: -25.925, width: 7.85, baseY: 0.0, topY: 4.24 },
      khoiShutterMat,
      obsidianSteelMat
    ),
    createRollingShutterDoor(
      staticGroup,
      { id: 'khoi_shutter_north', axis: 'z', pos: 213.7, spanCenter: -34.325, width: 7.45, baseY: 0.0, topY: 4.24 },
      khoiShutterMat,
      obsidianSteelMat
    ),
  ];

  // =========================================================================
  // 4. RIGHT SCULPTURAL CORAL WAVE + VERTICAL KHÓI PILLAR + LEFT BOTANICAL WALL & TREE
  // =========================================================================
  // Multi-Fin Sculpted Coral-Cream Wave Monolith at South/Right Corner (Z = -14.8..-12.3, X = 211.2..213.8)
  addBox(211.25, 213.75, 0.0, 0.24, -14.75, -12.35, obsidianSteelMat);
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const finH = 3.65 - Math.abs(t - 0.45) * 0.85;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, finH, 0.95 + Math.sin(t * Math.PI) * 0.55), coralArtMat);
    fin.position.set(
      211.55 + t * 2.05,
      0.22 + finH * 0.5,
      -13.6 + Math.sin(t * Math.PI * 1.6) * 0.42
    );
    fin.rotation.y = (t - 0.5) * 0.45;
    fin.rotation.z = Math.sin(t * Math.PI) * 0.09;
    staticGroup.add(fin);
  }
  // Rose-Gold Backlit Strip behind Coral Wave Fins + Illuminated "KHÓI" Sculpture Crown Header
  addBox(211.4, 213.6, 0.35, 3.85, -12.55, -12.42, roseBacklitMat);

  const sculptHeaderTex = createKhoiSculptureHeaderTex();
  const sculptHeaderMat = new THREE.MeshStandardMaterial({
    map: sculptHeaderTex,
    emissive: 0xffffff,
    emissiveMap: sculptHeaderTex,
    emissiveIntensity: 0.95,
  });
  signDynamicMats.push(sculptHeaderMat);
  addBox(211.3, 213.65, 3.65, 4.35, -14.6, -12.3, obsidianSteelMat);
  const sculptHeaderFront = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.68), sculptHeaderMat);
  sculptHeaderFront.rotation.y = -Math.PI / 2;
  sculptHeaderFront.position.set(211.28, 4.00, -13.45);
  staticGroup.add(sculptHeaderFront);

  // Sleek Corner Reception / Menu Pylon with Illuminated KHÓI Vertical Sign
  const miniSignTex = createKhoiMiniVerticalTex();
  const miniSignMat = new THREE.MeshStandardMaterial({
    map: miniSignTex,
    emissive: 0xffffff,
    emissiveMap: miniSignTex,
    emissiveIntensity: 0.98,
  });
  signDynamicMats.push(miniSignMat);
  addBox(211.3, 212.1, 0.0, 3.65, -13.25, -12.35, obsidianSteelMat);
  const miniSignFront = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.85), miniSignMat);
  miniSignFront.rotation.y = -Math.PI / 2;
  miniSignFront.position.set(211.28, 2.55, -12.8);
  staticGroup.add(miniSignFront);
  const miniSignSouth = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.85), miniSignMat);
  miniSignSouth.position.set(211.7, 2.55, -12.33);
  staticGroup.add(miniSignSouth);

  // Lush Botanical Green Foliage Walls with Glowing Crimson Light Squares (North Left Flank!)
  addBox(207.2, 213.8, 0.0, 4.25, -40.05, -39.55, gardenLeafDarkMat);
  addBox(213.6, 235.6, 0.0, 4.35, -12.6, -12.1, slateRockWallMat);
  for (let gx = 208.0; gx <= 213.2; gx += 0.95) {
    // Organic foliage mounds + crisp recessed crimson LED window cubes
    const leafCluster = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.46, 0),
      Math.round(gx * 2) % 2 === 0 ? gardenLeafBrightMat : gardenLeafDarkMat
    );
    leafCluster.position.set(gx, 0.9 + ((Math.round(gx * 10) % 3) * 1.05), -39.48);
    staticGroup.add(leafCluster);
    if (Math.round(gx) % 2 === 0) {
      addBox(gx - 0.34, gx + 0.34, 1.4, 2.75, -39.56, -39.44, redNeonMat);
    }
  }

  // Realistic Multi-Branch Warm-Uplit Tropical Garden Tree (Left Edge X=208.8, Z=-38.4)
  const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.25, 3.6, 8), woodBarkMat);
  mainTrunk.position.set(208.8, 1.8, -38.4);
  staticGroup.add(mainTrunk);
  const forkBranchL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 2.0, 7), woodBarkMat);
  forkBranchL.position.set(208.45, 3.9, -38.65);
  forkBranchL.rotation.z = 0.42;
  forkBranchL.rotation.x = -0.25;
  staticGroup.add(forkBranchL);
  const forkBranchR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 2.1, 7), woodBarkMat);
  forkBranchR.position.set(209.25, 4.0, -38.05);
  forkBranchR.rotation.z = -0.45;
  forkBranchR.rotation.x = 0.25;
  staticGroup.add(forkBranchR);

  // Airy Layered Foliage Puffs + Warm Tree Uplight Orb
  [
    [208.8, 5.2, -38.4, 1.25, gardenLeafDarkMat],
    [209.5, 4.8, -37.8, 1.15, gardenLeafBrightMat],
    [208.1, 4.7, -38.9, 1.10, gardenLeafDarkMat],
    [209.0, 6.0, -38.2, 1.05, gardenLeafBrightMat],
    [208.3, 5.6, -38.7, 0.95, gardenLeafDarkMat],
  ].forEach(([tx, ty, tz, r, mat]) => {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r as number, 1), mat as THREE.Material);
    crown.scale.set(1.25, 0.72, 1.25);
    crown.position.set(tx as number, ty as number, tz as number);
    staticGroup.add(crown);
  });
  const treePlanter = addBox(208.0, 209.6, 0.0, 0.36, -39.2, -37.6, obsidianSteelMat);
  void treePlanter;
  const treeUplight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 8), warmBulbMat);
  treeUplight.position.set(209.15, 0.40, -38.05);
  staticGroup.add(treeUplight);

  // =========================================================================
  // 5. OPEN-AIR FLOOR 1 INTERIOR, ROCK RELIEF, HALO RINGS, STAGE + SPOTLIGHTS & FLOOR 2
  // =========================================================================
  // East Rear Wall + North Wall + Carved Stone Relief Panels (South Interior Wall Z=-12.6)
  addBox(235.1, 235.7, 0.0, 8.8, -39.8, -12.2, slateRockWallMat);
  addBox(213.8, 235.5, 0.0, 8.8, -39.9, -39.4, slateRockWallMat);
  for (let rx = 216.0; rx <= 233.5; rx += 3.2) {
    const rockPanel = addBox(rx - 1.35, rx + 1.35, 0.35, 3.85, -39.42, -39.18, carvedStoneReliefMat);
    rockPanel.rotation.y = (rx % 2 === 0 ? 1 : -1) * 0.04;
  }

  // Back Stage LED Screen ("KHÓI FOOD GARDEN • LIVE DJ & ACOUSTIC")
  const stageTex = createKhoiStageScreenTex();
  const stageMat = new THREE.MeshStandardMaterial({
    map: stageTex,
    emissive: 0xffffff,
    emissiveMap: stageTex,
    emissiveIntensity: 1.0,
  });
  signDynamicMats.push(stageMat);
  const stageScreen = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 4.1), stageMat);
  stageScreen.rotation.y = -Math.PI / 2;
  stageScreen.position.set(235.02, 2.38, -26.0);
  staticGroup.add(stageScreen);

  // Raised Stage Deck + Glowing Cyan Stage Lip + DJ Booth + Line-Array Speaker Stacks + Beam Cones
  addBox(233.4, 235.05, 0.0, 0.34, -29.6, -22.4, obsidianSteelMat);
  addBox(233.36, 233.42, 0.28, 0.34, -29.6, -22.4, cyanNeonMat);
  // Central DJ / Performance Console
  addBox(233.65, 234.45, 0.34, 1.36, -27.2, -24.8, obsidianSteelMat);
  addBox(233.62, 233.66, 0.55, 1.25, -27.0, -25.0, cyanNeonMat);
  // Dual Side Line-Array Speaker Stacks & Truss Towers
  [-29.2, -22.8].forEach((sz) => {
    addBox(233.9, 234.8, 0.34, 2.35, sz - 0.55, sz + 0.55, obsidianSteelMat);
    addBox(233.86, 233.92, 0.5, 2.2, sz - 0.42, sz + 0.42, redNeonMat);
  });

  // Back Bar & Kitchen Prep Counter (North-East corner X = 230.4..234.9, Z = -39.2..-31.8)
  addBox(230.4, 234.9, 0.0, 1.12, -39.2, -31.8, obsidianSteelMat);
  addBox(230.3, 230.45, 0.85, 0.95, -39.0, -31.8, redNeonMat);

  // Hanging Dual-Tone LED Ceiling Halo Rings (8 Rings) inside Floor 1 Hall
  [
    [217.5, -19.5, true],
    [217.5, -25.5, false],
    [217.5, -31.5, true],
    [223.5, -19.5, false],
    [223.5, -25.5, true],
    [223.5, -31.5, false],
    [229.0, -23.0, true],
    [229.0, -29.0, false],
  ].forEach(([hx, hz, isWhite]) => {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.048, 8, 24),
      isWhite ? whiteNeonMat : cyanNeonMat
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(hx as number, 3.88, hz as number);
    staticGroup.add(halo);
  });

  // Floor 2 Mezzanine Deck (Y = 4.50, X = 214.0..235.3, Z = -39.5..-12.5, with Stair Cutout X=223..229.2, Z=-15.6..-12.6)
  const f2Y = KHOI_FLOOR2_Y;
  addBox(214.0, 235.3, f2Y - 0.16, f2Y, -39.5, -15.6, floor2DeckMat);
  addBox(214.0, 223.0, f2Y - 0.16, f2Y, -15.6, -12.5, floor2DeckMat);
  addBox(229.2, 235.3, f2Y - 0.16, f2Y, -15.6, -12.5, floor2DeckMat);

  // Floor 2 Roof Slab strictly BEHIND the upper KHÓI facade plane (X = 214.08..235.8, Y = 8.75..9.15)!
  addBox(214.08, 235.8, 8.75, 9.15, -39.8, -12.2, obsidianSteelMat);
  addBox(213.9, 214.15, f2Y, f2Y + 1.05, -39.4, -12.6, glassMat);
  addBox(213.88, 214.18, f2Y + 1.05, f2Y + 1.12, -39.4, -12.6, redNeonMat);
  // Floor 2 Stairwell Guardrail
  addBox(222.9, 229.2, f2Y, f2Y + 1.02, -15.72, -15.52, glassMat);
  addBox(222.9, 223.1, f2Y, f2Y + 1.02, -15.72, -12.5, glassMat);

  // Open Industrial Staircase (X = 223.0..229.0, Z = -15.5..-12.7) climbing West->East up to Floor 2!
  const stairSteps = 14;
  for (let i = 0; i < stairSteps; i++) {
    const t0 = i / stairSteps;
    const t1 = (i + 1) / stairSteps;
    const sx0 = 223.0 + t0 * 6.0;
    const sx1 = 223.0 + t1 * 6.0;
    const sy = t1 * KHOI_FLOOR2_Y;
    addBox(sx0, sx1, sy - 0.15, sy, -15.4, -12.8, obsidianSteelMat);
    addBox(sx0, sx0 + 0.04, sy - 0.02, sy + 0.01, -15.35, -12.85, redNeonMat);
  }
  addBox(223.0, 229.2, 0.0, KHOI_FLOOR2_Y, -15.62, -15.48, obsidianSteelMat);

  // =========================================================================
  // 6. BEER GARDEN DINING TABLES WITH BEER TOWERS, ICE BUCKETS & BOTTLES
  // =========================================================================
  const addGardenTable = (tx: number, tz: number, baseY = 0, withTower = false) => {
    const g = new THREE.Group();
    g.position.set(tx, baseY, tz);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.24, 0.74, 10), obsidianSteelMat);
    leg.position.y = 0.37;
    g.add(leg);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.06, 0.96), blackTableMat);
    top.position.y = 0.76;
    g.add(top);

    // Silver Ice Bucket + Green Beer Bottles on Table
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.24, 12), iceBucketMat);
    bucket.position.set(-0.22, 0.91, 0);
    g.add(bucket);
    [-0.28, -0.16, 0.26].forEach((bx, bi) => {
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.22, 8), beerGreenBottleMat);
      bot.position.set(bx, 0.90, bi === 2 ? 0.18 : 0.02);
      g.add(bot);
    });

    if (withTower) {
      const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 10), obsidianSteelMat);
      towerBase.position.set(0.24, 0.83, -0.12);
      g.add(towerBase);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.44, 10), beerAmberTowerMat);
      tower.position.set(0.24, 1.09, -0.12);
      g.add(tower);
    }

    // 4 Chairs/Stools
    [
      [-0.42, -0.74],
      [0.42, -0.74],
      [-0.42, 0.74],
      [0.42, 0.74],
    ].forEach(([cx, cz]) => {
      const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.13, 0.44, 8), chromeMat);
      cLeg.position.set(cx, 0.22, cz);
      g.add(cLeg);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.36), blackTableMat);
      seat.position.set(cx, 0.46, cz);
      g.add(seat);
    });

    staticGroup.add(g);
  };

  // Outdoor Phố Đi Bộ Garden Tables + Floor 1 Hall Tables + Floor 2 Balcony Tables
  [
    [209.6, -17.6, true],
    [209.6, -21.6, false],
    [209.6, -25.6, true],
    [209.6, -29.6, false],
    [209.6, -33.6, true],
    [217.5, -18.5, false],
    [217.5, -24.5, true],
    [217.5, -31.5, false],
    [224.8, -21.5, true],
    [224.8, -28.5, false],
  ].forEach(([tx, tz, tower]) => addGardenTable(tx as number, tz as number, 0, tower as boolean));

  [
    [217.5, -20.0, true],
    [217.5, -28.0, false],
    [225.5, -24.0, true],
    [225.5, -33.0, false],
  ].forEach(([tx, tz, tower]) => addGardenTable(tx as number, tz as number, f2Y, tower as boolean));

  // =========================================================================
  // 7. CALIBRATED LIGHTING (WARM PATIO + CRIMSON PILLARS + STAGE GLOW)
  // =========================================================================
  let closedFactor = 0.0;
  let animClock = 0;

  const registerLight = (
    color: number,
    x: number,
    y: number,
    z: number,
    dist: number,
    dayInt: number,
    nightInt: number
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 1.35);
    l.position.set(x, y, z);
    const lightIdx = scaledLights.length;
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => Math.max(lightIdx < 2 ? 0.14 : 0.04, 1.0 - closedFactor),
    });
  };

  registerLight(0xfde68a, 210.4, 3.7, -26.0, 34, 6, 26); // Canopy Warm Edison Bulbs & Patio Glow
  registerLight(0xfb7185, 212.5, 2.8, -14.0, 22, 4, 16); // South Coral Sculpture Rose Wash
  registerLight(0xef4444, 214.0, 3.6, -20.0, 26, 4, 18); // Red Column Accent South
  registerLight(0xef4444, 214.0, 3.6, -33.0, 26, 4, 18); // Red Column Accent North
  registerLight(0x38bdf8, 229.0, 3.4, -26.0, 30, 5, 22); // Back Stage Live Music Glow
  registerLight(0xf59e0b, 222.0, 7.6, -26.0, 28, 4, 18); // Floor 2 Balcony Lounge

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: KhoiGardenNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isKhoiGardenOpenAtHour(rawHour);
    const targetClosed = isOpen ? 0.0 : 1.0;
    closedFactor =
      delta === 0 ? targetClosed : THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 3.8));
    animClock += dt;

    for (let i = 0; i < khoiShutters.length; i++) {
      setShutterProgress(khoiShutters[i], closedFactor);
    }

    const openScale = 1.0 - closedFactor;
    redNeonMat.emissiveIntensity = (0.92 + lampFactor * 0.98 + Math.sin(animClock * 3.0) * 0.14) * openScale;
    whiteNeonMat.emissiveIntensity = (0.88 + lampFactor * 0.88) * openScale;
    cyanNeonMat.emissiveIntensity = (0.85 + lampFactor * 0.85 + Math.cos(animClock * 2.6) * 0.14) * openScale;
    roseBacklitMat.emissiveIntensity = (0.72 + lampFactor * 0.72) * openScale;
    warmBulbMat.emissiveIntensity = (0.82 + lampFactor * 1.02) * openScale;
    whiteAwningMat.emissiveIntensity = 0.34 * openScale;
    coralArtMat.emissiveIntensity = 0.14 * openScale;
    beerAmberTowerMat.emissiveIntensity = 0.42 * openScale;
    khoiPoolMat.opacity = 0.58 * lampFactor * openScale;

    const signGlow = (0.84 + lampFactor * 0.34) * Math.max(0.16, openScale);
    for (let i = 0; i < signDynamicMats.length; i++) {
      signDynamicMats[i].emissiveIntensity = signGlow;
    }

    npcController?.update(delta, rawHour);
  };

  updateOperatingHours(20.0, 0, 1.0, null);

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    updateOperatingHours,
    getClosedFactor: () => closedFactor,
  };
}

// =========================================================================
// LIVE NPCS (23 NPCS): STAGE DJ, RED-UNIFORMED WAITSTAFF, SEATED DINERS & GUESTS
// CONTINUOUSLY WALKING IN & OUT FROM PHỐ ĐI BỘ + CLIMBING TO FLOOR 2
// =========================================================================

interface KhoiNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  role: 'staff' | 'diner_seated' | 'diner_walk' | 'dj';
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  idleYaw?: number;
  seated?: boolean;
  cheerOffset: number;
  exitPath: THREE.Vector3[];
  exitWp: { idx: number };
  glbHandle: GlbHumanHandle;
}

function buildKhoiCharacterMesh(
  helpers: HospitalCharacterHelpers,
  shirt: number,
  pants: number,
  skin: string,
  hairColor: number,
  seated = false
) {
  const grp = new THREE.Group();
  const hips = new THREE.Group();
  grp.add(hips);

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.25), shirtMat);
  torso.position.y = 1.04;
  hips.add(torso);

  const faceTex = helpers.createFaceTexture('happy', skin);
  const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
  head.position.y = 1.48;
  hips.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
  hair.position.y = 1.61;
  hips.add(hair);

  const makeArm = (ax: number) => {
    const p = new THREE.Group();
    p.position.set(ax, 1.26, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), shirtMat);
    m.position.y = -0.18;
    p.add(m);
    hips.add(p);
    return p;
  };
  const leftArm = makeArm(-0.30);
  const rightArm = makeArm(0.30);

  const makeLeg = (lx: number) => {
    const p = new THREE.Group();
    p.position.set(lx, 0.76, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.16), pantsMat);
    leg.position.y = -0.32;
    p.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), shoeMat);
    shoe.position.set(0, -0.68, 0.03);
    p.add(shoe);
    hips.add(p);
    return p;
  };
  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);

  if (seated) {
    hips.position.y = -0.26;
    leftLeg.rotation.x = -Math.PI / 2;
    rightLeg.rotation.x = -Math.PI / 2;
    leftArm.rotation.x = -0.4;
    rightArm.rotation.x = -0.4;
  }

  return { group: grp, hips, leftArm, rightArm, leftLeg, rightLeg };
}

export class KhoiGardenNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: KhoiNpcActor[] = [];
  private wasOpen = true;
  private fullyCleared = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const f2Y = KHOI_FLOOR2_Y;
    const specs: Array<{
      role: 'staff' | 'diner_seated' | 'diner_walk' | 'dj';
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      seated?: boolean;
      speed?: number;
    }> = [
      // 0. STAGE DJ / LIVE PERFORMER ON EAST STAGE (facing West toward guests)
      {
        role: 'dj',
        shirt: 0x0f172a,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x38bdf8,
        waypoints: [new THREE.Vector3(234.65, 0.34, -26.0)],
        idleYaw: -Math.PI / 2,
      },
      // 1. FOUR ALL-RED UNIFORMED WAITERS (matching Screenshot 2 staff!)
      {
        role: 'staff',
        shirt: 0xdc2626,
        pants: 0xdc2626,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(229.0, 0.02, -31.0),
          new THREE.Vector3(221.0, 0.02, -25.0),
          new THREE.Vector3(212.2, 0.02, -23.6),
          new THREE.Vector3(212.2, 0.02, -31.5),
          new THREE.Vector3(221.0, 0.02, -29.0),
        ],
        speed: 1.55,
      },
      {
        role: 'staff',
        shirt: 0xdc2626,
        pants: 0xdc2626,
        skin: '#fce0c8',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(212.0, 0.02, -16.5),
          new THREE.Vector3(212.0, 0.02, -27.5),
          new THREE.Vector3(220.5, 0.02, -27.5),
          new THREE.Vector3(220.5, 0.02, -16.5),
        ],
        speed: 1.5,
      },
      {
        role: 'staff',
        shirt: 0xdc2626,
        pants: 0xdc2626,
        skin: '#f5c7a3',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(221.5, 0.02, -14.2),
          new THREE.Vector3(223.0, 0.02, -14.2),
          new THREE.Vector3(229.0, f2Y + 0.02, -14.2),
          new THREE.Vector3(229.0, f2Y + 0.02, -26.0),
          new THREE.Vector3(221.5, f2Y + 0.02, -26.0),
          new THREE.Vector3(229.0, f2Y + 0.02, -26.0),
          new THREE.Vector3(229.0, f2Y + 0.02, -14.2),
          new THREE.Vector3(223.0, 0.02, -14.2),
        ],
        speed: 1.48,
      },
      {
        role: 'staff',
        shirt: 0xdc2626,
        pants: 0xdc2626,
        skin: '#fbd3b4',
        hair: 0x18181b,
        waypoints: [new THREE.Vector3(211.0, 0.02, -15.5)],
        idleYaw: -Math.PI / 2,
      },

      // 2. TEN SEATED BEER-GARDEN GUESTS (Patio, Floor 1, Floor 2)
      { role: 'diner_seated', shirt: 0x0f172a, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(209.18, 0.02, -18.34)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xf8fafc, pants: 0x09090b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(210.02, 0.02, -16.86)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0x3b82f6, pants: 0x0f172a, skin: '#e8b48e', hair: 0x111827, waypoints: [new THREE.Vector3(209.18, 0.02, -22.34)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xf43f5e, pants: 0x18181b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(210.02, 0.02, -24.86)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0x22c55e, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(209.18, 0.02, -30.34)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xeab308, pants: 0x1e293b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(217.08, 0.02, -19.24)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xa855f7, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(217.92, 0.02, -23.76)], idleYaw: Math.PI, seated: true },
      { role: 'diner_seated', shirt: 0x06b6d4, pants: 0x0f172a, skin: '#f5c7a3', hair: 0x18181b, waypoints: [new THREE.Vector3(224.38, 0.02, -22.24)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xec4899, pants: 0x18181b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(217.08, f2Y + 0.02, -20.74)], idleYaw: 0, seated: true },
      { role: 'diner_seated', shirt: 0xf97316, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(225.08, f2Y + 0.02, -24.74)], idleYaw: 0, seated: true },

      // 3. EIGHT DYNAMIC WALKING GUESTS ENTERING & EXITING FROM PHỐ ĐI BỘ + FLOOR 2
      {
        role: 'diner_walk',
        shirt: 0xf8fafc,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(203.2, 0.02, -16.0),
          new THREE.Vector3(212.5, 0.02, -19.5),
          new THREE.Vector3(221.5, 0.02, -25.0),
          new THREE.Vector3(221.5, 0.02, -31.0),
          new THREE.Vector3(212.5, 0.02, -31.0),
          new THREE.Vector3(203.2, 0.02, -32.0),
        ],
        speed: 1.42,
      },
      {
        role: 'diner_walk',
        shirt: 0x38bdf8,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(204.0, 0.02, -36.0),
          new THREE.Vector3(212.5, 0.02, -35.0),
          new THREE.Vector3(221.5, 0.02, -21.0),
          new THREE.Vector3(221.5, 0.02, -14.2),
          new THREE.Vector3(223.0, 0.02, -14.2),
          new THREE.Vector3(229.0, f2Y + 0.02, -14.2),
          new THREE.Vector3(229.0, f2Y + 0.02, -28.0),
          new THREE.Vector3(220.5, f2Y + 0.02, -28.0),
          new THREE.Vector3(229.0, f2Y + 0.02, -28.0),
          new THREE.Vector3(229.0, f2Y + 0.02, -14.2),
          new THREE.Vector3(223.0, 0.02, -14.2),
          new THREE.Vector3(212.5, 0.02, -17.0),
          new THREE.Vector3(204.0, 0.02, -14.0),
        ],
        speed: 1.38,
      },
      {
        role: 'diner_walk',
        shirt: 0xf43f5e,
        pants: 0x09090b,
        skin: '#f5c7a3',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(202.5, 0.02, -8.0),
          new THREE.Vector3(206.0, 0.02, -15.5),
          new THREE.Vector3(215.0, 0.02, -19.5),
          new THREE.Vector3(228.5, 0.02, -25.0),
          new THREE.Vector3(214.5, 0.02, -27.5),
          new THREE.Vector3(203.0, 0.02, -25.0),
          new THREE.Vector3(202.5, 0.02, -10.0),
        ],
        speed: 1.46,
      },
      {
        role: 'diner_walk',
        shirt: 0x4ade80,
        pants: 0x18181b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(203.8, 0.02, -26.0),
          new THREE.Vector3(212.2, 0.02, -26.0),
          new THREE.Vector3(221.2, 0.02, -19.0),
          new THREE.Vector3(212.2, 0.02, -19.0),
          new THREE.Vector3(204.0, 0.02, -19.0),
          new THREE.Vector3(203.8, 0.02, -31.0),
        ],
        speed: 1.36,
      },
      {
        role: 'diner_walk',
        shirt: 0xe879f9,
        pants: 0x0f172a,
        skin: '#fce0c8',
        hair: 0x3b0764,
        waypoints: [
          new THREE.Vector3(205.5, 0.02, -42.0),
          new THREE.Vector3(206.5, 0.02, -33.0),
          new THREE.Vector3(214.5, 0.02, -34.0),
          new THREE.Vector3(227.5, 0.02, -27.0),
          new THREE.Vector3(214.5, 0.02, -21.0),
          new THREE.Vector3(206.0, 0.02, -21.0),
          new THREE.Vector3(205.5, 0.02, -40.0),
        ],
        speed: 1.44,
      },
      {
        role: 'diner_walk',
        shirt: 0xfacc15,
        pants: 0x09090b,
        skin: '#e8b48e',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(203.0, 0.02, -20.0),
          new THREE.Vector3(212.5, 0.02, -22.5),
          new THREE.Vector3(222.0, 0.02, -14.2),
          new THREE.Vector3(223.0, 0.02, -14.2),
          new THREE.Vector3(229.0, f2Y + 0.02, -14.2),
          new THREE.Vector3(221.5, f2Y + 0.02, -18.0),
          new THREE.Vector3(229.0, f2Y + 0.02, -14.2),
          new THREE.Vector3(223.0, 0.02, -14.2),
          new THREE.Vector3(212.5, 0.02, -16.5),
          new THREE.Vector3(203.0, 0.02, -16.5),
        ],
        speed: 1.35,
      },
      {
        role: 'diner_walk',
        shirt: 0x09090b,
        pants: 0x334155,
        skin: '#fbd3b4',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(204.8, 0.02, -3.0),
          new THREE.Vector3(206.2, 0.02, -16.5),
          new THREE.Vector3(212.5, 0.02, -26.0),
          new THREE.Vector3(212.5, 0.02, -34.5),
          new THREE.Vector3(205.5, 0.02, -34.5),
          new THREE.Vector3(204.8, 0.02, -15.0),
        ],
        speed: 1.5,
      },
      {
        role: 'diner_walk',
        shirt: 0xfb7185,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(206.0, 0.02, -28.0),
          new THREE.Vector3(214.0, 0.02, -28.0),
          new THREE.Vector3(224.0, 0.02, -34.0),
          new THREE.Vector3(214.0, 0.02, -23.0),
          new THREE.Vector3(205.5, 0.02, -23.0),
        ],
        speed: 1.38,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildKhoiCharacterMesh(helpers, s.shirt, s.pants, s.skin, s.hair, !!s.seated);
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const spec =
        s.seated
          ? pickSeatedCivilianModel(idx * 3 + 2)
          : s.role === 'diner_walk'
          ? ADULT_NPC_MODELS[idx % ADULT_NPC_MODELS.length]
          : pickStationaryCivilianModel(idx * 3 + 2);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: built.group,
        fallbackMeshes: [built.hips],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: s.seated ? 'Sit' : s.role === 'dj' ? 'Wave' : s.waypoints.length > 1 ? 'Walk' : 'Idle',
        phaseOffset: idx * 0.75,
      });

      this.actors.push({
        group: built.group,
        hips: built.hips,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        role: s.role,
        waypoints: s.waypoints,
        wpIdx: s.waypoints.length > 1 ? 1 : 0,
        speed: s.speed ?? 1.4,
        walkPhase: idx * 0.75,
        idleYaw: s.idleYaw,
        seated: s.seated,
        cheerOffset: idx * 1.15,
        exitPath: [new THREE.Vector3(207.0, 0.02, -24.0), new THREE.Vector3(202.0, 0.02, -24.0)],
        exitWp: { idx: 0 },
        glbHandle,
      });
    });
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyCleared;
  }

  public update(delta: number, rawHour: number) {
    const dt = Math.min(delta, 0.1);
    const isOpen = isKhoiGardenOpenAtHour(rawHour);

    if (isOpen && !this.wasOpen) {
      this.fullyCleared = false;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        a.exitWp.idx = 0;
        a.wpIdx = a.waypoints.length > 1 ? 1 : 0;
        a.group.position.copy(a.waypoints[0]);
        a.group.visible = true;
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        if (a.seated) {
          a.hips.position.y = -0.26;
          a.leftLeg.rotation.x = -Math.PI / 2;
          a.rightLeg.rotation.x = -Math.PI / 2;
          a.leftArm.rotation.x = -0.4;
          a.rightArm.rotation.x = -0.4;
        } else {
          a.hips.position.y = 0;
          a.leftLeg.rotation.x = 0;
          a.rightLeg.rotation.x = 0;
          a.leftArm.rotation.x = 0;
          a.rightArm.rotation.x = 0;
        }
        a.glbHandle.setAnimState(
          a.seated ? 'Sit' : a.role === 'dj' ? 'Wave' : a.waypoints.length > 1 ? 'Walk' : 'Idle'
        );
      }
    }
    this.wasOpen = isOpen;

    if (!isOpen) {
      if (this.fullyCleared) return;
      let allHidden = true;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        if (!a.group.visible) continue;
        a.hips.position.y = 0;
        a.glbHandle.setAnimState('Walk', 1.25);
        const done = advanceNpcExitPath(a.group, a.exitPath, a.exitWp, 2.0, dt);
        if (done) {
          a.group.visible = false;
        } else {
          allHidden = false;
          a.walkPhase += dt * 5.8;
          const swing = Math.sin(a.walkPhase) * 0.4;
          a.leftArm.rotation.x = swing;
          a.rightArm.rotation.x = a.glbHandle.hasActiveUmbrella() ? -0.88 : -swing;
          a.leftLeg.rotation.x = -swing * 1.1;
          a.rightLeg.rotation.x = swing * 1.1;
        }
      }
      this.fullyCleared = allHidden;
      return;
    }

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.group.visible) continue;

      if (a.waypoints.length <= 1) {
        a.glbHandle.setAnimState(a.seated ? 'Sit' : a.role === 'dj' ? 'Wave' : 'Idle');
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.walkPhase += dt * (a.role === 'dj' ? 7.0 : 2.4);
        if (a.role === 'dj') {
          a.hips.position.y = Math.abs(Math.sin(a.walkPhase)) * 0.04;
          a.leftArm.rotation.x = -0.85 + Math.sin(a.walkPhase * 1.1) * 0.45;
          a.rightArm.rotation.x = -1.15 + Math.cos(a.walkPhase * 0.9) * 0.55;
        } else if (a.seated) {
          const toastWave = Math.max(0, Math.sin(a.walkPhase * 0.8 + a.cheerOffset));
          a.rightArm.rotation.x = -0.4 - toastWave * 0.9;
          a.leftArm.rotation.x = -0.4;
        } else {
          a.hips.position.y = Math.sin(a.walkPhase) * 0.01;
          a.rightArm.rotation.x = -0.3 + Math.max(0, Math.sin(a.walkPhase * 0.8)) * 0.4;
        }
        continue;
      }

      a.glbHandle.setAnimState('Walk');
      const target = a.waypoints[a.wpIdx];
      const dx = target.x - a.group.position.x;
      const dy = target.y - a.group.position.y;
      const dz = target.z - a.group.position.z;
      const distXZ = Math.hypot(dx, dz);
      const dist3D = Math.hypot(dx, dy, dz);

      if (dist3D < 0.24) {
        a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
      } else {
        const step = Math.min(dist3D, a.speed * dt);
        const r = step / dist3D;
        a.group.position.x += dx * r;
        a.group.position.y += dy * r;
        a.group.position.z += dz * r;
        if (distXZ > 0.03) {
          a.group.rotation.y = Math.atan2(dx, dz);
        }
        a.walkPhase += dt * (4.4 + a.speed * 1.8);
        const swing = Math.sin(a.walkPhase) * 0.42;
        a.leftArm.rotation.x = swing;
        a.rightArm.rotation.x = a.glbHandle.hasActiveUmbrella() ? -0.88 : -swing;
        a.leftLeg.rotation.x = -swing * 1.15;
        a.rightLeg.rotation.x = swing * 1.15;
        a.hips.position.y = Math.abs(Math.sin(a.walkPhase)) * 0.03;
      }
    }
  }
}
