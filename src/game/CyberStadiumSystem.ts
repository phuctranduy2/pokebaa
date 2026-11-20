import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  GUARD_NPC_MODEL,
  pickOutsideNpcModel,
  pickSchoolStudentModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import type { HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import { buildCityMotorbikeMesh } from './CityVehicleMeshBuilder';

export const CYBER_STADIUM_MIN_X = -361.6;
export const CYBER_STADIUM_MAX_X = -342.4;
export const CYBER_STADIUM_MIN_Z = -18.0;
export const CYBER_STADIUM_MAX_Z = 15.6;
export const CYBER_STADIUM_FLOOR_H = 4.2;

// Building interior footprint: X = -360.8 .. -343.2 (17.6m wide), Z = -16.2 .. +5.4 (21.6m deep)
// Switchback Stairwell: X = -348.0 .. -343.8, Z = -15.6 .. -9.2 (open South entrance at Z = -9.2)
//   West flight (X = -348.0..-345.9): Floor 1 (Z=-9.6, Y=0) -> Landing (Z=-14.0, Y=2.1)
//   East flight (X = -345.9..-343.8): Landing (Z=-14.0, Y=2.1) -> Floor 2 (Z=-9.6, Y=4.2)

export interface CyberStadiumBuildResult {
  staticGroup: THREE.Group;
  dynamicGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  update: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
}

function buildCyberStadiumColliders(): IntersectionColliderBox[] {
  const cols: IntersectionColliderBox[] = [
    // Perimeter & Building Outer Walls (Floor 1)
    { minX: -361.8, maxX: -361.1, minZ: -18.2, maxZ: 15.6, floor: 1 }, // West lot boundary
    { minX: -361.2, maxX: -342.4, minZ: -18.2, maxZ: -17.4, floor: 1 }, // North rear boundary
    { minX: -361.0, maxX: -360.3, minZ: -16.4, maxZ: 5.5, floor: 1 }, // Building West outer wall
    { minX: -343.7, maxX: -343.0, minZ: -16.4, maxZ: 5.5, floor: 1 }, // Building East outer wall
    { minX: -361.0, maxX: -343.0, minZ: -16.4, maxZ: -15.7, floor: 1 }, // Building North rear wall
    // Front Facade Wall (Z = +5.4) leaving 4.4m wide open entrance X = -354.1 .. -349.7
    { minX: -361.0, maxX: -354.1, minZ: 5.0, maxZ: 5.65, floor: 1 },
    { minX: -349.7, maxX: -343.0, minZ: 5.0, maxZ: 5.65, floor: 1 },

    // Forecourt Parking Zones & Security Guard Desk (Floor 1)
    { minX: -360.4, maxX: -355.0, minZ: 7.5, maxZ: 14.3, floor: 1 }, // Student Bicycle Rack Zone
    { minX: -348.9, maxX: -343.4, minZ: 8.6, maxZ: 14.3, floor: 1 }, // Motorbike Parking Bay
    { minX: -346.2, maxX: -343.9, minZ: 6.0, maxZ: 7.4, floor: 1 }, // Security Guard Booth / Desk

    // Floor 1 Interior: Cashier Counter, Beverage Fridge, 2 Packed PC Islands (36 PCs) & East Wall Solo Row (4 PCs)
    { minX: -348.5, maxX: -343.8, minZ: 0.5, maxZ: 4.1, floor: 1 }, // L-shaped Thu Ngân (Cashier) Counter
    { minX: -344.8, maxX: -343.7, minZ: -2.4, maxZ: -0.2, floor: 1 }, // Drink & Snack Chiller Fridge
    { minX: -345.1, maxX: -343.6, minZ: -8.35, maxZ: -3.25, floor: 1 }, // Floor 1 East Wall Solo Row (4 PCs)
    { minX: -358.2, maxX: -355.2, minZ: -13.2, maxZ: -1.4, floor: 1 }, // Floor 1 West PC Island (18 PCs)
    { minX: -352.6, maxX: -349.8, minZ: -13.2, maxZ: -1.4, floor: 1 }, // Floor 1 Center PC Island (18 PCs)
    // Stairwell West Divider Wall (leaves entrance at Z = -9.2 wide open!)
    { minX: -348.3, maxX: -347.85, minZ: -15.8, maxZ: -9.5, floor: 1 },

    // Floor 2 Outer Perimeter Walls & Stairwell Guardrail
    { minX: -361.0, maxX: -360.3, minZ: -16.4, maxZ: 5.5, floor: 2 },
    { minX: -343.7, maxX: -343.0, minZ: -16.4, maxZ: 5.5, floor: 2 },
    { minX: -361.0, maxX: -343.0, minZ: -16.4, maxZ: -15.7, floor: 2 },
    { minX: -361.0, maxX: -343.0, minZ: 5.0, maxZ: 5.65, floor: 2 },
    // Stairwell Floor 2 Guardrail (West side + South side over West down-flight; East exit X=-345.9..-343.8 is OPEN!)
    { minX: -348.3, maxX: -347.85, minZ: -15.8, maxZ: -9.2, floor: 2 },
    { minX: -348.3, maxX: -345.85, minZ: -9.6, maxZ: -9.1, floor: 2 },

    // Floor 2 Interior: 5v5 E-Sport Tournament Stage (8 PCs), VIP Islands (32 PCs) & East Streamer Row (7 PCs)
    { minX: -359.7, maxX: -349.5, minZ: -15.2, maxZ: -12.4, floor: 2 }, // 5v5 Tournament Desk Row
    { minX: -358.4, maxX: -355.4, minZ: -8.0, maxZ: 2.6, floor: 2 }, // Floor 2 West VIP PC Island
    { minX: -352.4, maxX: -349.6, minZ: -8.0, maxZ: 2.6, floor: 2 }, // Floor 2 Center VIP PC Island
    { minX: -345.2, maxX: -343.6, minZ: -5.85, maxZ: 3.05, floor: 2 }, // Floor 2 East Streamer/Couple Row
  ];
  return cols;
}

export const CYBER_STADIUM_COLLIDERS: IntersectionColliderBox[] = buildCyberStadiumColliders();

function drawFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startPx: number,
  minPx: number,
  fontStack = 'Impact, "Arial Black", system-ui, sans-serif'
) {
  let size = startPx;
  while (size > minPx) {
    ctx.font = `900 ${size}px ${fontStack}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `900 ${size}px ${fontStack}`;
  ctx.fillText(text, x, y, maxWidth);
}

function createCyberSignTex(
  title: string,
  opts?: {
    stars?: number;
    subtitle?: string;
    bgHex?: string;
    borderHex?: string;
    width?: number;
    height?: number;
  }
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = opts?.width ?? 1280;
  c.height = opts?.height ?? 256;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, opts?.bgHex ?? '#090d14');
  grad.addColorStop(0.5, '#131a26');
  grad.addColorStop(1, opts?.bgHex ?? '#080b11');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // Subtle brushed aluminum sheen stripe
  const sheen = ctx.createLinearGradient(0, 0, 0, c.height);
  sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, c.width, c.height);

  if (opts?.borderHex) {
    ctx.strokeStyle = opts.borderHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Bold 3D metallic shadow + glowing white face matching reference photo
  const mainY = opts?.stars || opts?.subtitle ? c.height * 0.42 : c.height * 0.52;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  drawFitText(ctx, title, c.width / 2 + 5, mainY + 6, c.width - 70, 118, 42);
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(224,242,254,0.65)';
  ctx.shadowBlur = 14;
  drawFitText(ctx, title, c.width / 2, mainY, c.width - 70, 118, 42);
  ctx.shadowBlur = 0;

  if (opts?.stars && opts.stars > 0) {
    const count = opts.stars;
    const spacing = 74;
    const startX = c.width / 2 - ((count - 1) * spacing) / 2;
    const sy = c.height * 0.78;
    for (let i = 0; i < count; i++) {
      drawStar(ctx, startX + i * spacing, sy, 5, 25, 11, '#f8fafc', '#020617');
    }
  } else if (opts?.subtitle) {
    ctx.fillStyle = '#38bdf8';
    drawFitText(ctx, opts.subtitle, c.width / 2, c.height * 0.79, c.width - 80, 42, 18, 'system-ui, sans-serif');
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number,
  fill: string,
  stroke: string
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function createCyberCrestBadgeTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c1119';
  ctx.fillRect(0, 0, 512, 512);

  // Shield silhouette matching reference photo's CYBER STADIUM crest
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(256, 56);
  ctx.lineTo(392, 110);
  ctx.lineTo(374, 336);
  ctx.lineTo(256, 444);
  ctx.lineTo(138, 336);
  ctx.lineTo(120, 110);
  ctx.closePath();
  const sGrad = ctx.createLinearGradient(0, 56, 0, 444);
  sGrad.addColorStop(0, '#cbd5e1');
  sGrad.addColorStop(0.5, '#64748b');
  sGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = sGrad;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#f8fafc';
  ctx.stroke();

  // Power button circle at crest top
  ctx.beginPath();
  ctx.arc(256, 108, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#f8fafc';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 108, 17, -Math.PI * 0.3, Math.PI * 1.3);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(256, 86);
  ctx.lineTo(256, 108);
  ctx.stroke();

  // Horizontal ribbon banner
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(62, 212, 388, 92);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  ctx.strokeRect(62, 212, 388, 92);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 44px Impact, system-ui, sans-serif';
  ctx.fillText('CYBER', 256, 174);
  ctx.font = '900 56px Impact, system-ui, sans-serif';
  ctx.fillText('STADIUM', 256, 259);

  // 5 small stars on lower shield
  const starPts = [
    [194, 342],
    [256, 336],
    [318, 342],
    [224, 382],
    [288, 382],
  ];
  for (const [sx, sy] of starPts) {
    drawStar(ctx, sx, sy, 5, 16, 7, '#ffffff', '#1e293b');
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBattleRoyaleMuralTex(): THREE.CanvasTexture {
  // High-detail painterly Battle Royale tactical hero mural (left ground-floor bay)
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 768;
  const ctx = c.getContext('2d')!;

  // Dramatic twilight cobalt sky -> golden sunset horizon -> dark asphalt ground
  const sky = ctx.createLinearGradient(0, 0, 0, 768);
  sky.addColorStop(0, '#071a38');
  sky.addColorStop(0.28, '#164675');
  sky.addColorStop(0.52, '#2d6fa3');
  sky.addColorStop(0.68, '#f59e0b');
  sky.addColorStop(0.80, '#9a3412');
  sky.addColorStop(0.92, '#1f2937');
  sky.addColorStop(1, '#0b0f17');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 768, 768);

  // Subtle volumetric sunbeams cutting diagonally across the sky
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let r = 0; r < 5; r++) {
    const beam = ctx.createLinearGradient(120 + r * 140, 0, 260 + r * 110, 520);
    beam.addColorStop(0, 'rgba(186,230,253,0.14)');
    beam.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(70 + r * 140, 0);
    ctx.lineTo(155 + r * 140, 0);
    ctx.lineTo(310 + r * 105, 520);
    ctx.lineTo(175 + r * 105, 520);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Multi-layered billowing fiery explosion clouds (depth + warm inner glow)
  const clouds: Array<[number, number, number, string, string]> = [
    [95, 445, 165, 'rgba(254,240,138,0.82)', 'rgba(234,88,12,0)'],
    [225, 420, 185, 'rgba(253,186,116,0.85)', 'rgba(194,65,12,0)'],
    [545, 415, 185, 'rgba(253,186,116,0.85)', 'rgba(194,65,12,0)'],
    [668, 455, 160, 'rgba(254,240,138,0.82)', 'rgba(234,88,12,0)'],
    [384, 470, 225, 'rgba(255,251,235,0.68)', 'rgba(249,115,22,0)'],
    [130, 540, 170, 'rgba(180,83,9,0.68)', 'rgba(67,20,7,0)'],
    [635, 545, 170, 'rgba(180,83,9,0.68)', 'rgba(67,20,7,0)'],
    [384, 575, 250, 'rgba(124,45,18,0.58)', 'rgba(17,24,39,0)'],
  ];
  for (const [cx, cy, cr, inner, outer] of clouds) {
    const rg = ctx.createRadialGradient(cx, cy, cr * 0.08, cx, cy, cr);
    rg.addColorStop(0, inner);
    rg.addColorStop(0.55, inner.replace(/0\.\d+\)/, '0.45)'));
    rg.addColorStop(1, outer);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground smoke mist
  const mist = ctx.createLinearGradient(0, 560, 0, 768);
  mist.addColorStop(0, 'rgba(15,23,42,0)');
  mist.addColorStop(0.55, 'rgba(15,23,42,0.82)');
  mist.addColorStop(1, '#090d14');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 560, 768, 208);

  // Assault Rifle slung over right shoulder (detailed barrel, front sight, handguard & stock)
  ctx.save();
  ctx.translate(458, 280);
  ctx.rotate(0.14);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-7, -185, 14, 240);
  // Front sight triangle & muzzle brake
  ctx.fillRect(-10, -196, 20, 14);
  ctx.beginPath();
  ctx.moveTo(7, -162);
  ctx.lineTo(24, -142);
  ctx.lineTo(7, -140);
  ctx.closePath();
  ctx.fill();
  // Wood tactical handguard
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(-11, -72, 22, 82);
  ctx.fillStyle = '#9a3412';
  ctx.fillRect(-7, -68, 8, 74);
  ctx.restore();

  // --- HERO ANATOMICAL SILHOUETTE ---
  // Left & right muscular arms (white rolled sleeves + warm amber backlight rim + black tactical gloves)
  const drawArm = (side: -1 | 1) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(384 + side * 88, 286);
    ctx.quadraticCurveTo(384 + side * 126, 300, 384 + side * 145, 392);
    ctx.lineTo(384 + side * 172, 505);
    ctx.lineTo(384 + side * 124, 516);
    ctx.lineTo(384 + side * 98, 412);
    ctx.lineTo(384 + side * 78, 350);
    ctx.closePath();
    const sleeveGrad = ctx.createLinearGradient(
      384 + side * 78,
      286,
      384 + side * 172,
      516
    );
    sleeveGrad.addColorStop(0, '#f1f5f9');
    sleeveGrad.addColorStop(0.65, '#cbd5e1');
    sleeveGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = sleeveGrad;
    ctx.fill();
    // Warm orange sunset rim-light along outer arm edge
    ctx.strokeStyle = 'rgba(251,191,36,0.72)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(384 + side * 112, 298);
    ctx.quadraticCurveTo(384 + side * 138, 365, 384 + side * 170, 502);
    ctx.stroke();

    // Forearm skin + fingerless tactical glove
    ctx.fillStyle = '#c89572';
    ctx.beginPath();
    ctx.moveTo(384 + side * 127, 508);
    ctx.lineTo(384 + side * 169, 498);
    ctx.lineTo(384 + side * 184, 560);
    ctx.lineTo(384 + side * 142, 568);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(384 + side * 168, 586, 22, 26, side * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawArm(-1);
  drawArm(1);

  // White collared dress shirt torso (sculpted chest & waist taper)
  ctx.beginPath();
  ctx.moveTo(324, 268);
  ctx.quadraticCurveTo(384, 254, 444, 268);
  ctx.lineTo(482, 294);
  ctx.lineTo(464, 535);
  ctx.quadraticCurveTo(384, 550, 304, 535);
  ctx.lineTo(286, 294);
  ctx.closePath();
  const shirtGrad = ctx.createLinearGradient(286, 268, 482, 535);
  shirtGrad.addColorStop(0, '#cbd5e1');
  shirtGrad.addColorStop(0.28, '#f8fafc');
  shirtGrad.addColorStop(0.65, '#e2e8f0');
  shirtGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = shirtGrad;
  ctx.fill();

  // Subtle fabric creases & collar V
  ctx.strokeStyle = 'rgba(100,116,139,0.42)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(338, 272);
  ctx.lineTo(384, 314);
  ctx.lineTo(430, 272);
  ctx.moveTo(318, 415);
  ctx.quadraticCurveTo(355, 430, 378, 422);
  ctx.moveTo(452, 435);
  ctx.quadraticCurveTo(414, 448, 392, 438);
  ctx.stroke();

  // Sharp dark necktie + knot
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(371, 294);
  ctx.lineTo(397, 294);
  ctx.lineTo(392, 316);
  ctx.lineTo(376, 316);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(376, 316);
  ctx.lineTo(392, 316);
  ctx.lineTo(401, 476);
  ctx.lineTo(384, 505);
  ctx.lineTo(367, 476);
  ctx.closePath();
  ctx.fill();
  // Tie highlight crease
  ctx.fillStyle = 'rgba(148,163,184,0.22)';
  ctx.fillRect(380, 322, 5, 155);

  // Tactical shoulder harness straps + utility pouches + heavy belt
  ctx.fillStyle = '#273142';
  ctx.fillRect(316, 276, 22, 256);
  ctx.fillRect(430, 276, 22, 256);
  ctx.fillStyle = '#475569';
  ctx.fillRect(320, 360, 14, 18);
  ctx.fillRect(434, 360, 14, 18);
  // Utility belt & silver buckle
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(298, 526, 172, 30);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(368, 530, 32, 22);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(376, 535, 16, 12);

  // Indigo tactical denim jeans with leg split & thigh highlights
  const jeanGrad = ctx.createLinearGradient(296, 556, 472, 768);
  jeanGrad.addColorStop(0, '#1e3a5f');
  jeanGrad.addColorStop(0.5, '#172554');
  jeanGrad.addColorStop(1, '#0b1120');
  ctx.fillStyle = jeanGrad;
  ctx.beginPath();
  ctx.moveTo(298, 556);
  ctx.lineTo(470, 556);
  ctx.lineTo(486, 768);
  ctx.lineTo(400, 768);
  ctx.lineTo(384, 646);
  ctx.lineTo(368, 768);
  ctx.lineTo(282, 768);
  ctx.closePath();
  ctx.fill();

  // Neck & chin shadow
  ctx.fillStyle = '#33251e';
  ctx.fillRect(360, 232, 48, 44);

  // Iconic Level-3 Spetsnaz Helmet (curved dome + heavy lowered steel visor + fiery reflections)
  ctx.save();
  // Helmet upper dome
  const domeGrad = ctx.createRadialGradient(365, 145, 18, 384, 178, 92);
  domeGrad.addColorStop(0, '#475569');
  domeGrad.addColorStop(0.55, '#1e293b');
  domeGrad.addColorStop(1, '#090d14');
  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.arc(384, 184, 78, Math.PI * 0.94, Math.PI * 2.06);
  ctx.quadraticCurveTo(464, 248, 444, 266);
  ctx.lineTo(324, 266);
  ctx.quadraticCurveTo(304, 248, 306, 184);
  ctx.closePath();
  ctx.fill();

  // Golden sunset rim reflection on dome edge
  ctx.strokeStyle = 'rgba(251,191,36,0.75)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(384, 184, 77, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();

  // Heavy curved welded titanium face visor shield
  const visorGrad = ctx.createLinearGradient(318, 168, 450, 260);
  visorGrad.addColorStop(0, '#64748b');
  visorGrad.addColorStop(0.32, '#94a3b8');
  visorGrad.addColorStop(0.62, '#334155');
  visorGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = visorGrad;
  ctx.beginPath();
  ctx.moveTo(322, 170);
  ctx.quadraticCurveTo(384, 154, 446, 170);
  ctx.lineTo(440, 248);
  ctx.quadraticCurveTo(384, 266, 328, 248);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Armored visor viewing slit with fiery glow reflection
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(338, 194, 92, 22, 5);
  ctx.fill();
  const slitGlow = ctx.createLinearGradient(342, 196, 426, 214);
  slitGlow.addColorStop(0, 'rgba(251,146,60,0.55)');
  slitGlow.addColorStop(0.5, 'rgba(56,189,248,0.28)');
  slitGlow.addColorStop(1, 'rgba(251,191,36,0.55)');
  ctx.fillStyle = slitGlow;
  ctx.fillRect(344, 199, 80, 10);

  // Side visor rivets
  ctx.fillStyle = '#cbd5e1';
  [318, 450].forEach((rx) => {
    ctx.beginPath();
    ctx.arc(rx, 206, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Floating glowing fiery embers & sparks across foreground
  const sparks = [
    [92, 290, 4], [154, 370, 5], [198, 245, 3], [248, 495, 4], [520, 320, 5],
    [595, 255, 3], [648, 385, 5], [692, 510, 4], [118, 560, 4], [488, 540, 3],
    [295, 178, 3], [505, 190, 4], [618, 465, 3], [164, 472, 4],
  ];
  for (const [sx, sy, sr] of sparks) {
    const sg = ctx.createRadialGradient(sx, sy, 0.5, sx, sy, sr * 3);
    sg.addColorStop(0, '#fef08a');
    sg.addColorStop(0.4, 'rgba(251,146,60,0.75)');
    sg.addColorStop(1, 'rgba(251,146,60,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle bottom dark glass vignette strip
  const botBar = ctx.createLinearGradient(0, 680, 0, 768);
  botBar.addColorStop(0, 'rgba(9,13,20,0)');
  botBar.addColorStop(1, 'rgba(9,13,20,0.88)');
  ctx.fillStyle = botBar;
  ctx.fillRect(0, 680, 768, 88);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPromoLightboxTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 720;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 512, 720);
  bg.addColorStop(0, '#070b14');
  bg.addColorStop(0.5, '#0f172a');
  bg.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 720);

  // Diagonal neon accent glow
  const glow = ctx.createRadialGradient(256, 210, 20, 256, 210, 260);
  glow.addColorStop(0, 'rgba(56,189,248,0.36)');
  glow.addColorStop(0.6, 'rgba(236,72,153,0.16)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 720);

  // Crisp glowing border frame
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 484, 692);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#38bdf8';
  drawFitText(ctx, 'CYBER STADIUM • PRO SPEC', 256, 78, 430, 32, 18, 'system-ui, sans-serif');

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(56,189,248,0.75)';
  ctx.shadowBlur = 16;
  drawFitText(ctx, 'RTX 4080', 256, 178, 420, 96, 48);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#f472b6';
  drawFitText(ctx, '360Hz OLED ARENA', 256, 260, 420, 44, 24, 'system-ui, sans-serif');

  // Spec cards
  const specs = [
    ['TẦNG 1 • GAMING ZONE', '8.000đ / GIỜ'],
    ['TẦNG 2 • VIP & 5v5 PRO', '12.000đ / GIỜ'],
    ['COMBO ĐÊM 22H - 07H', '35.000đ'],
    ['GIỮ XE ĐẠP & XE MÁY', 'MIỄN PHÍ 100%'],
  ];
  specs.forEach(([label, val], idx) => {
    const y = 338 + idx * 80;
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.fillRect(42, y, 428, 64);
    ctx.strokeStyle = idx % 2 === 0 ? '#0ea5e9' : '#ec4899';
    ctx.lineWidth = 3;
    ctx.strokeRect(42, y, 428, 64);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(label, 256, y + 21);
    ctx.fillStyle = '#facc15';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText(val, 256, y + 47);
  });

  ctx.fillStyle = '#22c55e';
  drawFitText(ctx, '● MỞ CỬA 24/7 • CỬA TỰ ĐỘNG ●', 256, 672, 430, 26, 16, 'system-ui, sans-serif');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createDoorDecalTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(224,242,254,0.82)';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 512, 10);
  ctx.fillRect(0, 86, 512, 10);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawFitText(ctx, 'AUTO • CYBER STADIUM 24/7', 256, 48, 460, 32, 18, 'system-ui, sans-serif');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createEsportPosterTex(title: string, subtitle: string, c1: string, c2: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 384, 512);
  g.addColorStop(0, '#090d16');
  g.addColorStop(0.5, c1);
  g.addColorStop(1, '#020617');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 384, 512);

  // Geometric futuristic emblem behind title
  ctx.strokeStyle = c2;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(192, 86);
  ctx.lineTo(298, 192);
  ctx.lineTo(192, 298);
  ctx.lineTo(86, 192);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(192, 192, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = c2;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 360, 488);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = c2;
  ctx.shadowBlur = 14;
  drawFitText(ctx, title, 192, 378, 320, 56, 26);
  ctx.shadowBlur = 0;
  ctx.fillStyle = c2;
  drawFitText(ctx, subtitle, 192, 440, 320, 26, 16, 'system-ui, sans-serif');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createMonitorGameScreenTex(variant: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const ctx = c.getContext('2d')!;
  const palettes = [
    ['#0b1120', '#0ea5e9', '#f97316', 'FPS ARENA'],
    ['#0f172a', '#22c55e', '#facc15', 'MOBA 5v5'],
    ['#1e1b4b', '#ec4899', '#38bdf8', 'BATTLE ROYALE'],
    ['#042f2e', '#14b8a6', '#a855f7', 'VALORANT PRO'],
  ];
  const [bg, c1, c2, tag] = palettes[variant % palettes.length];
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 144);
  const g = ctx.createLinearGradient(0, 0, 256, 144);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(10, 10, 236, 98);
  ctx.globalAlpha = 1;
  // Minimap square & HUD bars
  ctx.fillStyle = '#020617';
  ctx.fillRect(198, 86, 46, 46);
  ctx.strokeStyle = c1;
  ctx.lineWidth = 2;
  ctx.strokeRect(198, 86, 46, 46);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(14, 122, 92, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(114, 122, 68, 10);
  // Center crosshair
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 62);
  ctx.lineTo(136, 62);
  ctx.moveTo(128, 54);
  ctx.lineTo(128, 70);
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tag, 128, 32);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCashierMenuBoardTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 768, 320);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 752, 304);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(16, 16, 736, 74);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, 'QUẦY THU NGÂN • NẠP GIỜ 24/7', 384, 53, 700, 38, 22, 'system-ui, sans-serif');

  const lines = [
    'MÁY THƯỜNG (TẦNG 1): 8.000đ / GIỜ',
    'MÁY VIP & ĐẤU TRƯỜNG 5v5 (TẦNG 2): 12.000đ / GIỜ',
    'COMBO MÌ TRỨNG XÚC XÍCH + STING ĐỎ: 25.000đ',
    'COMBO ĐÊM 22H - 07H (SIÊU TIẾT KIỆM): 35.000đ',
  ];
  ctx.fillStyle = '#e0f2fe';
  lines.forEach((line, idx) => {
    drawFitText(ctx, line, 384, 128 + idx * 46, 700, 26, 16, 'system-ui, sans-serif');
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGlowPoolTex(innerRgba: string, midRgba: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.55, midRgba);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Multi-part procedural student bicycle (2 wheels, frame tubes, fork, handlebars, saddle, basket, kickstand)
 */
function buildStudentBicycleMesh(frameColorHex: number): THREE.Group {
  const bike = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.78 });
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColorHex, roughness: 0.32, metalness: 0.55 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.05 });
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45 });

  const wheelGeo = new THREE.TorusGeometry(0.31, 0.036, 8, 18);
  const rimGeo = new THREE.TorusGeometry(0.27, 0.016, 6, 16);
  const hubGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.09, 8);
  hubGeo.rotateX(Math.PI / 2);

  // Rear & Front wheels along local Z (-0.52 rear, +0.52 front)
  [-0.52, 0.52].forEach((wz) => {
    const wGrp = new THREE.Group();
    wGrp.position.set(0, 0.34, wz);
    wGrp.rotation.y = Math.PI / 2;
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    const hub = new THREE.Mesh(hubGeo, rimMat);
    wGrp.add(tire, rim, hub);
    bike.add(wGrp);
  });

  // Diamond / Step-through Frame Tubes
  const addTube = (p1: THREE.Vector3, p2: THREE.Vector3, radius: number, mat: THREE.Material) => {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 7), mat);
    tube.position.copy(p1).addScaledVector(dir, 0.5);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    bike.add(tube);
  };

  const rearAxle = new THREE.Vector3(0, 0.34, -0.52);
  const frontAxle = new THREE.Vector3(0, 0.34, 0.52);
  const bottomBracket = new THREE.Vector3(0, 0.31, -0.08);
  const seatTop = new THREE.Vector3(0, 0.84, -0.22);
  const headTop = new THREE.Vector3(0, 0.90, 0.34);
  const headBot = new THREE.Vector3(0, 0.68, 0.40);

  addTube(rearAxle, bottomBracket, 0.018, frameMat);
  addTube(rearAxle, new THREE.Vector3(0, 0.72, -0.19), 0.016, frameMat);
  addTube(bottomBracket, seatTop, 0.022, frameMat);
  addTube(bottomBracket, headBot, 0.022, frameMat);
  addTube(new THREE.Vector3(0, 0.72, -0.19), headTop, 0.019, frameMat);
  addTube(frontAxle, headTop, 0.02, frameMat);

  // Handlebars
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.54, 7), rimMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.96, 0.31);
  bike.add(bar);
  [-0.24, 0.24].forEach((gx) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.11, 7), seatMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(gx, 0.96, 0.31);
    bike.add(grip);
  });

  // Saddle
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.25), seatMat);
  saddle.position.set(0, 0.88, -0.23);
  bike.add(saddle);

  // Student front basket
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.22), basketMat);
  basket.position.set(0, 0.79, 0.49);
  bike.add(basket);

  // Slight realistic kickstand lean
  bike.rotation.z = 0.08;
  return bike;
}

interface CyberNpcAgent {
  grp: THREE.Group;
  proxyGrp: THREE.Group;
  glbHandle: GlbHumanHandle;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  role: 'guard' | 'cashier' | 'seated_gamer' | 'school_visitor';
  baseX: number;
  baseY: number;
  baseZ: number;
  baseYaw: number;
  phase: number;
  speed: number;
  waypoints?: Array<{ x: number; z: number; pauseSec?: number }>;
  totalDist?: number;
  segLens?: number[];
  distPos?: number;
  currentYaw: number;
}

function createCyberNpcRig(
  role: CyberNpcAgent['role'],
  x: number,
  y: number,
  z: number,
  yaw: number,
  phase: number,
  seed: number,
  opts?: { isStudent?: boolean; speed?: number; waypoints?: Array<{ x: number; z: number; pauseSec?: number }> }
): CyberNpcAgent {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  const proxyGrp = new THREE.Group();
  grp.add(proxyGrp);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c7a5, roughness: 0.72 });
  const topColor =
    role === 'guard'
      ? 0x38bdf8
      : role === 'cashier'
        ? 0x0f172a
        : opts?.isStudent
          ? 0xf8fafc
          : [0x2563eb, 0xef4444, 0x10b981, 0x7c3aed, 0xf59e0b, 0x334155][seed % 6];
  const pantsColor = role === 'guard' ? 0x0f172a : opts?.isStudent ? 0x1e293b : 0x1f2937;
  const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.72 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.54, 0.22), topMat);
  torso.position.y = role === 'seated_gamer' ? 0.80 : 1.02;
  proxyGrp.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skinMat);
  head.position.y = role === 'seated_gamer' ? 1.24 : 1.46;
  proxyGrp.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.156, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
  hair.position.y = role === 'seated_gamer' ? 1.27 : 1.49;
  proxyGrp.add(hair);

  const legGeo = new THREE.BoxGeometry(0.14, 0.68, 0.16);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  if (role === 'seated_gamer') {
    leftLeg.position.set(-0.1, 0.36, 0.18);
    rightLeg.position.set(0.1, 0.36, 0.18);
    leftLeg.rotation.x = -Math.PI * 0.44;
    rightLeg.rotation.x = -Math.PI * 0.44;
  } else {
    leftLeg.position.set(-0.1, 0.36, 0);
    rightLeg.position.set(0.1, 0.36, 0);
  }
  proxyGrp.add(leftLeg, rightLeg);

  const armGeo = new THREE.BoxGeometry(0.11, 0.48, 0.12);
  const leftArm = new THREE.Mesh(armGeo, topMat);
  const rightArm = new THREE.Mesh(armGeo, topMat);
  const armY = role === 'seated_gamer' ? 0.78 : 1.02;
  leftArm.position.set(-0.26, armY, role === 'seated_gamer' ? 0.12 : 0);
  rightArm.position.set(0.26, armY, role === 'seated_gamer' ? 0.12 : 0);
  if (role === 'seated_gamer') {
    leftArm.rotation.x = -0.85;
    rightArm.rotation.x = -0.85;
  }
  proxyGrp.add(leftArm, rightArm);

  // Gaming headset accent on seated gamers
  if (role === 'seated_gamer') {
    const headsetMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: seed % 2 === 0 ? 0x38bdf8 : 0xec4899,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 12, Math.PI), headsetMat);
    band.position.y = 1.26;
    proxyGrp.add(band);
  }

  const spec =
    role === 'guard'
      ? GUARD_NPC_MODEL
      : role === 'cashier'
        ? pickStationaryCivilianModel(seed)
        : role === 'seated_gamer'
          ? opts?.isStudent
            ? pickSchoolStudentModel(seed)
            : pickSeatedCivilianModel(seed)
          : opts?.isStudent
            ? pickSchoolStudentModel(seed)
            : pickOutsideNpcModel(seed);

  const glbHandle = attachGlbHumanToNpc({
    modelSource: spec.modelSource,
    targetHeight: spec.targetHeight,
    clipProfile: spec.clipProfile,
    rotationY: spec.rotationY,
    hostGroup: grp,
    fallbackMeshes: [proxyGrp],
    initialState: role === 'seated_gamer' ? 'Sit' : role === 'school_visitor' ? 'Walk' : 'Idle',
    phaseOffset: phase,
    palette:
      role === 'guard'
        ? { suit: 0x0f172a, shirt: 0x38bdf8, accent: 0xfacc15 }
        : role === 'cashier'
          ? { suit: 0x0f172a, shirt: 0x38bdf8, accent: 0x06b6d4 }
          : opts?.isStudent
            ? { shirt: 0xf8fafc, pants: 0x1e293b, accent: [0xef4444, 0x2563eb, 0x10b981, 0xf59e0b][seed % 4] }
            : { shirt: topColor, pants: 0x1f2937, accent: 0x38bdf8 },
  });

  let segLens: number[] | undefined;
  let totalDist = 0;
  if (opts?.waypoints && opts.waypoints.length >= 2) {
    segLens = [];
    for (let i = 0; i < opts.waypoints.length; i++) {
      const a = opts.waypoints[i];
      const b = opts.waypoints[(i + 1) % opts.waypoints.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      segLens.push(len);
      totalDist += len;
    }
  }

  return {
    grp,
    proxyGrp,
    glbHandle,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    role,
    baseX: x,
    baseY: y,
    baseZ: z,
    baseYaw: yaw,
    phase,
    speed: opts?.speed ?? 1.15,
    waypoints: opts?.waypoints,
    segLens,
    totalDist,
    distPos: totalDist > 0 ? (phase * 11.7) % totalDist : 0,
    currentYaw: yaw,
  };
}

export function createCyberStadiumStructure(): CyberStadiumBuildResult {
  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const addBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = staticGroup,
    rot?: [number, number, number]
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(mesh);
    return mesh;
  };

  // =========================================================================
  // PBR MATERIALS (Varied Roughness & Metalness for Studio Architectural Depth)
  // =========================================================================
  const blackAluMat = new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.22, metalness: 0.52 });
  const darkMatteFrameMat = new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.72, metalness: 0.2 });
  const whitePanelMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45, metalness: 0.08 });
  const beigeJambMat = new THREE.MeshStandardMaterial({ color: 0xe5dec9, roughness: 0.78, metalness: 0.04 });
  const concreteApronMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.86, metalness: 0.04 });
  const darkFloorTileMat = new THREE.MeshStandardMaterial({ color: 0x141824, roughness: 0.34, metalness: 0.16 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0b0f19, roughness: 0.88, metalness: 0.06 });
  const innerWallMat = new THREE.MeshStandardMaterial({ color: 0x181f2e, roughness: 0.68, metalness: 0.12 });
  const tintedGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.08,
    metalness: 0.72,
    transparent: true,
    opacity: 0.56,
  });
  const glassRailMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.36,
  });
  const stairTreadMat = new THREE.MeshStandardMaterial({ color: 0x262f42, roughness: 0.55, metalness: 0.25 });
  const deskCarbonMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.38, metalness: 0.35 });
  const chairRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.52, metalness: 0.1 });
  const chairCyanMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.52, metalness: 0.1 });
  const chairBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.08 });
  const metalRackMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.82 });

  const rgbCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });
  const rgbMagentaMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xec4899,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  const rgbGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });
  const ceilingLedMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });
  neonMats.push(rgbCyanMat, rgbMagentaMat, rgbGoldMat, ceilingLedMat);

  // =========================================================================
  // 1. LOT PAVING, CONCRETE FORECOURT RAMP & PARKING LINES
  // =========================================================================
  // Full lot foundation (flush with sidewalk Y=0.0, offset slightly above grass Y=-0.3)
  addBox(19.2, 0.34, 33.6, concreteApronMat, -352.0, -0.15, -1.2);
  // Dark interior floor tiles for Floor 1 (offset +0.025 above concrete to prevent z-fighting)
  addBox(17.4, 0.05, 21.4, darkFloorTileMat, -352.0, 0.025, -5.4);
  // Subtle concrete entrance ramp threshold at Z = 5.4..6.2
  addBox(17.8, 0.06, 0.9, beigeJambMat, -352.0, 0.03, 5.75);
  // Sleek dark slate center walkway runner leading from sidewalk to automatic sliding doors
  const runnerMat = new THREE.MeshStandardMaterial({ color: 0x1e2533, roughness: 0.48, metalness: 0.14 });
  addBox(4.5, 0.03, 9.8, runnerMat, -351.9, 0.025, 10.55);
  // Recessed glowing cyan LED floor guide strips along the entrance walkway
  addBox(0.08, 0.035, 9.6, rgbCyanMat, -354.12, 0.028, 10.55);
  addBox(0.08, 0.035, 9.6, rgbCyanMat, -349.68, 0.028, 10.55);

  // Painted white parking lines on East motorbike bay & West bicycle bay
  const paintLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.78 });
  for (let i = 0; i < 6; i++) {
    addBox(2.4, 0.02, 0.09, paintLineMat, -346.2, 0.03, 8.7 + i * 1.15);
  }
  addBox(0.09, 0.02, 6.2, paintLineMat, -349.1, 0.03, 11.4);
  addBox(0.09, 0.02, 6.6, paintLineMat, -354.9, 0.03, 11.0);

  // Twin modern black architectural planters + sculpted foliage flanking the entrance doorway
  const planterSoilMat = new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.92 });
  const shrubLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const shrubHighlightMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });
  [-354.78, -349.02].forEach((px) => {
    addBox(0.76, 0.58, 0.76, darkMatteFrameMat, px, 0.31, 6.08);
    addBox(0.80, 0.06, 0.80, rgbCyanMat, px, 0.61, 6.08);
    addBox(0.66, 0.08, 0.66, planterSoilMat, px, 0.59, 6.08);
    const bushMain = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 1), shrubLeafMat);
    bushMain.position.set(px, 0.94, 6.08);
    staticGroup.add(bushMain);
    const bushTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), shrubHighlightMat);
    bushTop.position.set(px + 0.08, 1.18, 6.04);
    staticGroup.add(bushTop);
  });

  // 4 sleek illuminated entrance walkway bollards (safely outside the 4.4m entry lane)
  [-354.52, -349.28].forEach((bx) => {
    [10.2, 14.3].forEach((bz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.76, 10), blackAluMat);
      post.position.set(bx, 0.39, bz);
      staticGroup.add(post);
      const glowBand = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.14, 10), rgbCyanMat);
      glowBand.position.set(bx, 0.68, bz);
      staticGroup.add(glowBand);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.05, 10), blackAluMat);
      cap.position.set(bx, 0.78, bz);
      staticGroup.add(cap);
    });
  });

  // Perimeter low curbs on West & North boundary
  addBox(0.45, 0.55, 33.4, darkMatteFrameMat, -361.4, 0.28, -1.2);
  addBox(19.2, 0.85, 0.45, darkMatteFrameMat, -352.0, 0.43, -17.8);

  // =========================================================================
  // 2. 2-STORY BUILDING SHELL (FLOOR 1: Y=0..4.2, FLOOR 2: Y=4.2..8.6)
  // =========================================================================
  const f2Y = CYBER_STADIUM_FLOOR_H; // 4.2
  const roofY = 8.65;

  // Outer Solid Walls: West (-360.6), East (-343.4), North Rear (-16.0)
  addBox(0.45, roofY, 21.6, blackAluMat, -360.65, roofY * 0.5, -5.4);
  addBox(0.45, roofY, 21.6, blackAluMat, -343.35, roofY * 0.5, -5.4);
  addBox(17.6, roofY, 0.45, blackAluMat, -352.0, roofY * 0.5, -16.05);
  // Interior acoustic cladding on inner walls
  addBox(0.1, roofY - 0.4, 21.0, innerWallMat, -360.38, roofY * 0.5, -5.4);
  addBox(0.1, roofY - 0.4, 21.0, innerWallMat, -343.62, roofY * 0.5, -5.4);
  addBox(17.0, roofY - 0.4, 0.1, innerWallMat, -352.0, roofY * 0.5, -15.78);

  // Floor 2 Structural Slab (Y = 4.02..4.22) with stairwell cutout at X = -348.0..-343.8, Z = -15.6..-9.2!
  // Left main Floor 2 slab: X = -360.4 .. -348.0, Z = -15.8 .. +5.3
  addBox(12.4, 0.22, 21.1, darkFloorTileMat, -354.2, f2Y - 0.11, -5.25);
  // Right front Floor 2 slab (South of stairwell opening): X = -348.0 .. -343.6, Z = -9.2 .. +5.3
  addBox(4.4, 0.22, 14.5, darkFloorTileMat, -345.8, f2Y - 0.11, -1.95);
  // Underside dark ceiling finishes on Floor 1
  addBox(12.4, 0.06, 21.0, ceilingMat, -354.2, f2Y - 0.24, -5.25);
  addBox(4.4, 0.06, 14.4, ceilingMat, -345.8, f2Y - 0.24, -1.95);

  // Roof Slab (Y = 8.65..8.95)
  addBox(17.9, 0.34, 22.0, darkMatteFrameMat, -352.0, roofY + 0.17, -5.4);
  addBox(17.2, 0.08, 21.2, ceilingMat, -352.0, roofY - 0.02, -5.4);

  // =========================================================================
  // 3. ICONIC REFERENCE PHOTO FACADE (Z = +5.4 FACING SOUTH!)
  //    "E-SPORT STADIUM" / "CYBER STADIUM" Crest / "CYBER GAMES ★★★★★" / PUBG Mural
  // =========================================================================
  // Ground-floor left & right solid wall piers around wide open entrance (-354.1 .. -349.7)
  addBox(6.6, 3.7, 0.42, blackAluMat, -357.45, 1.85, 5.28);
  addBox(6.4, 3.7, 0.42, blackAluMat, -346.55, 1.85, 5.28);
  // Chamfered beige doorway portal jambs (matching reference photo!)
  addBox(0.38, 3.65, 0.56, beigeJambMat, -354.15, 1.82, 5.32);
  addBox(0.38, 3.65, 0.56, beigeJambMat, -349.65, 1.82, 5.32);

  // Ground-floor Left Facade Hero Mural (user-provided Behance artwork, X = -360.35 .. -354.35, Y = 0.08..3.52)
  const muralFallbackTex = createBattleRoyaleMuralTex();
  const muralMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: muralFallbackTex,
    emissive: 0xffffff,
    emissiveMap: muralFallbackTex,
    emissiveIntensity: 0.22,
    roughness: 0.36,
    metalness: 0.05,
  });
  new THREE.TextureLoader().load(
    '/assets/cyber_posters/facade_mural.jpg',
    (loadedTex) => {
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      loadedTex.anisotropy = 4;
      muralMat.map = loadedTex;
      muralMat.emissiveMap = loadedTex;
      muralMat.needsUpdate = true;
    },
    undefined,
    () => {
      // Keep procedural fallback if unavailable
    }
  );
  lanternMats.push(muralMat);
  const muralMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 3.46), muralMat);
  muralMesh.position.set(-357.35, 1.8, 5.52);
  staticGroup.add(muralMesh);

  // Ground-floor Right Crisp White Accent Panel + Architectural Seam Grooves + Backlit Promo Lightbox
  addBox(5.0, 3.46, 0.12, whitePanelMat, -346.8, 1.8, 5.52);
  [1.15, 2.35].forEach((sy) => {
    addBox(4.96, 0.035, 0.14, darkMatteFrameMat, -346.8, sy, 5.53);
  });
  const promoTex = createPromoLightboxTex();
  const promoMat = new THREE.MeshStandardMaterial({
    map: promoTex,
    emissive: 0xffffff,
    emissiveMap: promoTex,
    emissiveIntensity: 0.56,
    roughness: 0.22,
    metalness: 0.18,
  });
  lanternMats.push(promoMat);
  addBox(2.04, 2.74, 0.14, blackAluMat, -347.75, 1.84, 5.62);
  const promoFace = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 2.58), promoMat);
  promoFace.position.set(-347.75, 1.84, 5.7);
  staticGroup.add(promoFace);

  // =========================================================================
  // AUTOMATIC SLIDING GLASS DOUBLE DOORS ("CỬA TỰ ĐỘNG") AT X = -354.1 .. -349.7
  // =========================================================================
  // Overhead brushed-black transom track beam + infrared proximity motion sensor
  addBox(4.85, 0.26, 0.42, blackAluMat, -351.9, 3.48, 5.18);
  addBox(0.56, 0.12, 0.16, darkMatteFrameMat, -351.9, 3.5, 5.46);
  const doorSensorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.5,
    roughness: 0.15,
  });
  const doorSensorLed = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), doorSensorMat);
  doorSensorLed.position.set(-351.9, 3.49, 5.55);
  dynamicGroup.add(doorSensorLed);

  const autoDoorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.06,
    metalness: 0.52,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const autoDoorDecalMat = new THREE.MeshStandardMaterial({
    map: createDoorDecalTex(),
    transparent: true,
    opacity: 0.88,
    roughness: 0.35,
  });

  const buildSlidingDoorLeaf = (isLeft: boolean) => {
    const leaf = new THREE.Group();
    const w = 2.18;
    const h = 3.34;
    // Translucent tempered glass pane
    addBox(w - 0.12, h - 0.14, 0.03, autoDoorGlassMat, 0, h * 0.5, 0, leaf);
    // Matte-black aluminum perimeter frame
    addBox(w, 0.08, 0.07, blackAluMat, 0, h - 0.04, 0, leaf);
    addBox(w, 0.1, 0.07, blackAluMat, 0, 0.05, 0, leaf);
    addBox(0.07, h, 0.07, blackAluMat, -w * 0.5 + 0.035, h * 0.5, 0, leaf);
    addBox(0.07, h, 0.07, blackAluMat, w * 0.5 - 0.035, h * 0.5, 0, leaf);
    // Eye-level frosted safety stripe ("AUTO • CYBER STADIUM 24/7") visible from both sides
    const frontBand = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.16, 0.24), autoDoorDecalMat);
    frontBand.position.set(0, 1.44, 0.022);
    leaf.add(frontBand);
    const backBand = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.16, 0.24), autoDoorDecalMat);
    backBand.position.set(0, 1.44, -0.022);
    backBand.rotation.y = Math.PI;
    leaf.add(backBand);
    // Brushed chrome vertical handles near the center meeting edge
    const handleX = isLeft ? w * 0.5 - 0.18 : -w * 0.5 + 0.18;
    [0.06, -0.06].forEach((hz) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 8), metalRackMat);
      handle.position.set(handleX, 1.28, hz);
      leaf.add(handle);
    });
    return leaf;
  };

  const leftDoorClosedX = -352.99;
  const rightDoorClosedX = -350.81;
  const leftDoorGroup = buildSlidingDoorLeaf(true);
  leftDoorGroup.position.set(leftDoorClosedX, 0.03, 4.96);
  dynamicGroup.add(leftDoorGroup);

  const rightDoorGroup = buildSlidingDoorLeaf(false);
  rightDoorGroup.position.set(rightDoorClosedX, 0.03, 4.96);
  dynamicGroup.add(rightDoorGroup);

  // Ground-Floor Glossy Black Awning Canopy with bold glowing "CYBER STADIUM"
  addBox(18.0, 1.02, 0.85, blackAluMat, -352.0, 4.05, 5.65);
  // 6 Recessed warm-white soffit downlights under canopy illuminating the front facade & doorway
  const soffitLedMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  neonMats.push(soffitLedMat);
  [-358.8, -356.2, -353.2, -350.6, -347.8, -345.2].forEach((dx) => {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12), soffitLedMat);
    disc.position.set(dx, 3.53, 5.84);
    staticGroup.add(disc);
  });

  const lowerSignTex = createCyberSignTex('CYBER STADIUM', { width: 1400, height: 220 });
  const lowerSignMat = new THREE.MeshStandardMaterial({
    map: lowerSignTex,
    emissive: 0xffffff,
    emissiveMap: lowerSignTex,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.3,
  });
  lanternMats.push(lowerSignMat);
  const lowerSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 0.96), lowerSignMat);
  lowerSignPlane.position.set(-353.6, 4.06, 6.09);
  staticGroup.add(lowerSignPlane);

  // Upper Facade (Y = 4.55 .. 8.85): Glossy black structural fins + recessed glass curtain walls
  // Diagonal chamfered dark side buttress columns framing the facade
  addBox(0.85, 5.5, 1.15, blackAluMat, -360.55, 7.15, 5.55);
  addBox(1.05, 5.3, 1.25, blackAluMat, -343.45, 7.0, 5.6);

  // Left-center glossy black crest bay (X = -358.2 .. -353.0, Y = 4.55 .. 8.6)
  addBox(5.2, 4.15, 0.36, blackAluMat, -355.6, 6.62, 5.32);
  const crestTex = createCyberCrestBadgeTex();
  const crestMat = new THREE.MeshStandardMaterial({
    map: crestTex,
    emissive: 0xe0f2fe,
    emissiveMap: crestTex,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.45,
  });
  lanternMats.push(crestMat);
  const crestBadge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 0.18), [
    darkMatteFrameMat,
    darkMatteFrameMat,
    darkMatteFrameMat,
    darkMatteFrameMat,
    crestMat,
    darkMatteFrameMat,
  ]);
  crestBadge.position.set(-355.6, 6.65, 5.56);
  staticGroup.add(crestBadge);

  // Far-left tall glass strip (X = -360.1 .. -358.2)
  addBox(1.8, 3.9, 0.14, tintedGlassMat, -359.15, 6.55, 5.35);
  // Center-right large double-story curtain glass bays (X = -353.0 .. -347.2) with crisp black mullions
  addBox(5.8, 3.95, 0.14, tintedGlassMat, -350.1, 6.55, 5.35);
  [-353.0, -351.05, -349.1, -347.2].forEach((mx) => {
    addBox(0.14, 4.05, 0.24, darkMatteFrameMat, mx, 6.55, 5.38);
  });
  [5.45, 6.55, 7.65].forEach((my) => {
    addBox(5.9, 0.14, 0.24, darkMatteFrameMat, -350.1, my, 5.38);
  });
  // Operable square hopper window frames matching Image 2
  addBox(1.25, 1.05, 0.28, darkMatteFrameMat, -350.08, 5.85, 5.44);
  addBox(1.05, 0.85, 0.30, tintedGlassMat, -350.08, 5.85, 5.45);
  addBox(1.25, 1.05, 0.28, darkMatteFrameMat, -350.08, 7.85, 5.44);
  addBox(1.05, 0.85, 0.30, tintedGlassMat, -350.08, 7.85, 5.45);

  // Right-side twin crisp white vertical accent panels (matching Image 2!)
  addBox(3.1, 1.75, 0.24, whitePanelMat, -345.55, 5.48, 5.42);
  addBox(3.1, 1.65, 0.24, whitePanelMat, -345.55, 7.72, 5.42);

  // Mid-Right Cantilevered Signboard: "CYBER GAMES ★★★★★" (X = -353.0 .. -343.6, Y = 6.2..7.35)
  addBox(9.5, 1.24, 0.85, blackAluMat, -348.25, 6.72, 5.82);
  addBox(9.4, 0.06, 0.1, rgbMagentaMat, -348.25, 6.08, 6.18);
  const midSignTex = createCyberSignTex('CYBER GAMES', { stars: 5, width: 1280, height: 280 });
  const midSignMat = new THREE.MeshStandardMaterial({
    map: midSignTex,
    emissive: 0xffffff,
    emissiveMap: midSignTex,
    emissiveIntensity: 0.62,
    roughness: 0.2,
    metalness: 0.35,
  });
  lanternMats.push(midSignMat);
  const midSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.18), midSignMat);
  midSignPlane.position.set(-348.25, 6.72, 6.26);
  staticGroup.add(midSignPlane);

  // Top Angular Rooftop Fascia Crown: "E-SPORT STADIUM" (Y = 8.7 .. 10.35)
  addBox(18.2, 1.55, 1.2, blackAluMat, -352.0, 9.5, 5.75);
  // Dynamic angled top metallic trim edge + crown neon accent
  addBox(18.4, 0.22, 1.35, darkMatteFrameMat, -352.0, 10.32, 5.78);
  addBox(17.9, 0.06, 0.1, rgbCyanMat, -352.0, 10.22, 6.42);
  const topSignTex = createCyberSignTex('E-SPORT STADIUM', { width: 1440, height: 240 });
  const topSignMat = new THREE.MeshStandardMaterial({
    map: topSignTex,
    emissive: 0xffffff,
    emissiveMap: topSignTex,
    emissiveIntensity: 0.68,
    roughness: 0.18,
    metalness: 0.35,
  });
  lanternMats.push(topSignMat);
  const topSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 1.32), topSignMat);
  topSignPlane.position.set(-352.2, 9.52, 6.37);
  staticGroup.add(topSignPlane);

  // Sleek architectural cyan & magenta edge accent strips across canopy, upper cornice & side buttresses
  addBox(17.4, 0.07, 0.12, rgbCyanMat, -352.0, 3.55, 6.04);
  addBox(17.6, 0.08, 0.12, rgbCyanMat, -352.0, 8.75, 6.32);
  addBox(0.08, 4.9, 0.1, rgbCyanMat, -360.12, 7.05, 6.12);
  addBox(0.08, 4.9, 0.1, rgbMagentaMat, -343.92, 7.05, 6.22);

  // =========================================================================
  // 4. INTERIOR SWITCHBACK STAIRWELL (FLOOR 1 -> FLOOR 2, X=-348.0..-343.8, Z=-15.6..-9.2)
  // =========================================================================
  // West flight (X = -348.0 .. -345.9): 10 steps from Z=-9.6 (Y=0) to Z=-14.0 (Y=2.1)
  const stepCount = 10;
  for (let s = 0; s < stepCount; s++) {
    const sy = ((s + 0.5) / stepCount) * (f2Y * 0.5);
    const sz = -9.6 - ((s + 0.5) / stepCount) * 4.4;
    addBox(2.05, 0.22, 0.48, stairTreadMat, -346.95, sy, sz);
    addBox(2.05, 0.03, 0.05, rgbCyanMat, -346.95, sy + 0.11, sz + 0.22);
  }
  // Mid-landing (Z = -15.7 .. -14.0, X = -348.0 .. -343.8, Y = 2.1)
  addBox(4.3, 0.22, 1.85, stairTreadMat, -345.9, f2Y * 0.5 - 0.1, -14.88);
  // East flight (X = -345.9 .. -343.8): 10 steps from Z=-14.0 (Y=2.1) to Z=-9.6 (Y=4.2)
  for (let s = 0; s < stepCount; s++) {
    const sy = f2Y * 0.5 + ((s + 0.5) / stepCount) * (f2Y * 0.5);
    const sz = -14.0 + ((s + 0.5) / stepCount) * 4.4;
    addBox(2.05, 0.22, 0.48, stairTreadMat, -344.85, sy, sz);
    addBox(2.05, 0.03, 0.05, rgbMagentaMat, -344.85, sy + 0.11, sz - 0.22);
  }
  // Center divider & Floor 2 glass safety guardrail
  addBox(0.14, 3.6, 4.8, darkMatteFrameMat, -345.9, 2.2, -11.9);
  addBox(0.14, 1.05, 6.4, glassRailMat, -348.05, f2Y + 0.55, -12.4);
  addBox(0.14, 0.08, 6.4, rgbCyanMat, -348.05, f2Y + 1.08, -12.4);
  addBox(2.2, 1.05, 0.14, glassRailMat, -346.95, f2Y + 0.55, -9.3);
  addBox(2.2, 0.08, 0.14, rgbCyanMat, -346.95, f2Y + 1.08, -9.3);

  // Illuminated Stair Sign ("LÊN TẦNG 2 • VIP & ĐẤU TRƯỜNG 5v5")
  const stairSignTex = createCyberSignTex('TẦNG 2: VIP & 5v5 ARENA', {
    subtitle: '▲ CẦU THANG LÊN TẦNG 2 ▲',
    width: 768,
    height: 192,
    borderHex: '#38bdf8',
  });
  const stairSignMat = new THREE.MeshStandardMaterial({
    map: stairSignTex,
    emissive: 0xffffff,
    emissiveMap: stairSignTex,
    emissiveIntensity: 0.6,
    roughness: 0.25,
  });
  lanternMats.push(stairSignMat);
  const stairSign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.85), stairSignMat);
  stairSign.position.set(-346.0, 3.25, -9.15);
  staticGroup.add(stairSign);

  // =========================================================================
  // 5. FLOOR 1: QUẦY THU NGÂN (CASHIER), TỦ NƯỚC & 16 GAMING PC STATIONS
  // =========================================================================
  // L-shaped Illuminated Cashier Counter (X = -348.3 .. -343.9, Z = +0.6 .. +4.0)
  addBox(4.3, 1.08, 0.82, blackAluMat, -346.1, 0.54, 3.65);
  addBox(0.82, 1.08, 3.2, blackAluMat, -348.0, 0.54, 2.2);
  addBox(4.4, 0.08, 0.92, whitePanelMat, -346.1, 1.12, 3.65);
  addBox(0.92, 0.08, 3.3, whitePanelMat, -348.0, 1.12, 2.2);
  addBox(4.35, 0.06, 0.08, rgbCyanMat, -346.1, 1.02, 4.08);
  addBox(0.08, 0.06, 3.2, rgbCyanMat, -348.43, 1.02, 2.2);

  // Real 16:9 Gameplay Screenshots (LMHT, GTA V, PUBG PC, Valorant) cached locally for zero-CORS crisp WebGL rendering
  const CYBER_GAME_SCREEN_PATHS = [
    '/assets/cyber_screens/game_01.jpg',
    '/assets/cyber_screens/game_02.jpg',
    '/assets/cyber_screens/game_03.jpg',
    '/assets/cyber_screens/game_04.jpg',
    '/assets/cyber_screens/game_05.jpg',
    '/assets/cyber_screens/game_06.jpg',
    '/assets/cyber_screens/game_07.jpg',
    '/assets/cyber_screens/game_08.jpg',
    '/assets/cyber_screens/game_09.jpg',
    '/assets/cyber_screens/game_10.jpg',
    '/assets/cyber_screens/game_11.jpg',
    '/assets/cyber_screens/game_12.jpg',
    '/assets/cyber_screens/game_13.jpg',
    '/assets/cyber_screens/game_14.jpg',
    '/assets/cyber_screens/game_15.jpg',
    '/assets/cyber_screens/game_16.jpg',
    '/assets/cyber_screens/game_17.jpg',
    '/assets/cyber_screens/game_18.jpg',
    '/assets/cyber_screens/game_19.jpg',
    '/assets/cyber_screens/game_20.jpg',
  ];

  const screenTexLoader = new THREE.TextureLoader();
  const screenMats = CYBER_GAME_SCREEN_PATHS.map((imgUrl, idx) => {
    const fallbackTex = createMonitorGameScreenTex(idx);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: fallbackTex,
      emissive: 0xffffff,
      emissiveMap: fallbackTex,
      emissiveIntensity: 0.82,
      roughness: 0.14,
      metalness: 0.08,
    });
    screenTexLoader.load(
      imgUrl,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.anisotropy = 4;
        mat.map = loadedTex;
        mat.emissiveMap = loadedTex;
        mat.needsUpdate = true;
      },
      undefined,
      () => {
        // Keep procedural fallback texture if asset unavailable
      }
    );
    lanternMats.push(mat);
    return mat;
  });

  // Dual POS Cashier Monitors on counter
  [-346.8, -345.4].forEach((mx, idx) => {
    addBox(0.62, 0.38, 0.05, blackAluMat, mx, 1.44, 3.55);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.32), screenMats[(idx * 5) % screenMats.length]);
    scr.position.set(mx, 1.44, 3.52);
    scr.rotation.y = Math.PI;
    staticGroup.add(scr);
    addBox(0.08, 0.24, 0.08, metalRackMat, mx, 1.24, 3.55);
  });

  // Glowing Cashier Menu & Price Board on East wall behind counter
  const menuTex = createCashierMenuBoardTex();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xffffff,
    emissiveMap: menuTex,
    emissiveIntensity: 0.58,
    roughness: 0.25,
  });
  lanternMats.push(menuMat);
  const menuBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.42), menuMat);
  menuBoard.position.set(-343.72, 2.38, 2.1);
  menuBoard.rotation.y = -Math.PI / 2;
  staticGroup.add(menuBoard);

  // Illuminated Drink & Snack Chiller Fridge (Sting, RedBull, Mì Ly) at X = -344.25, Z = -1.3
  addBox(0.95, 2.1, 1.9, darkMatteFrameMat, -344.2, 1.05, -1.3);
  addBox(0.08, 1.85, 1.7, tintedGlassMat, -344.69, 1.1, -1.3);
  const bottleColors = [0xef4444, 0xfacc15, 0x22c55e, 0x38bdf8, 0xf97316];
  for (let shelf = 0; shelf < 4; shelf++) {
    addBox(0.75, 0.04, 1.68, whitePanelMat, -344.22, 0.42 + shelf * 0.42, -1.3);
    for (let b = 0; b < 6; b++) {
      const bMat = new THREE.MeshStandardMaterial({
        color: bottleColors[(shelf + b) % bottleColors.length],
        emissive: bottleColors[(shelf + b) % bottleColors.length],
        emissiveIntensity: 0.25,
        roughness: 0.3,
      });
      addBox(0.14, 0.26, 0.14, bMat, -344.32, 0.58 + shelf * 0.42, -1.95 + b * 0.26);
    }
  }

  // Floor 1 West Entrance Waiting Lounge Bench + Glowing Welcome Sign (X = -359.7, Z = 2.4)
  addBox(0.76, 0.42, 2.35, chairBlackMat, -359.78, 0.23, 2.35);
  addBox(0.14, 0.54, 2.35, chairCyanMat, -360.12, 0.66, 2.35);
  addBox(0.78, 0.05, 2.38, rgbCyanMat, -359.78, 0.06, 2.35);
  const lobbySignTex = createCyberSignTex('CYBER STADIUM 24/7', {
    subtitle: 'CHÀO MỪNG GAME THỦ • WIFI 10Gbps',
    width: 768,
    height: 192,
    borderHex: '#0ea5e9',
  });
  const lobbySignMat = new THREE.MeshStandardMaterial({
    map: lobbySignTex,
    emissive: 0xffffff,
    emissiveMap: lobbySignTex,
    emissiveIntensity: 0.62,
    roughness: 0.24,
  });
  lanternMats.push(lobbySignMat);
  const lobbySign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.72), lobbySignMat);
  lobbySign.position.set(-360.26, 2.25, 2.35);
  lobbySign.rotation.y = Math.PI / 2;
  staticGroup.add(lobbySign);

  // Curated Real E-Sport Backlit Poster Gallery (all 8 user-provided posters in exact natural aspect ratios!)
  const mountRealPoster = (opts: {
    url: string;
    fallbackTitle: string;
    fallbackSub: string;
    fallbackC1: string;
    fallbackC2: string;
    w: number;
    h: number;
    x: number;
    y: number;
    z: number;
    rotY: number;
    trimMat: THREE.Material;
    emissiveInt?: number;
  }) => {
    const fbTex = createEsportPosterTex(opts.fallbackTitle, opts.fallbackSub, opts.fallbackC1, opts.fallbackC2);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: fbTex,
      emissive: 0xffffff,
      emissiveMap: fbTex,
      emissiveIntensity: opts.emissiveInt ?? 0.62,
      roughness: 0.2,
      metalness: 0.08,
    });
    screenTexLoader.load(
      opts.url,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.anisotropy = 4;
        pMat.map = loadedTex;
        pMat.emissiveMap = loadedTex;
        pMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Keep procedural fallback if unavailable
      }
    );
    lanternMats.push(pMat);

    const frame = new THREE.Group();
    frame.position.set(opts.x, opts.y, opts.z);
    frame.rotation.y = opts.rotY;
    // Matte-black aluminum lightbox chassis
    addBox(opts.w + 0.18, opts.h + 0.18, 0.08, blackAluMat, 0, 0, -0.05, frame);
    // Thin glowing LED halo trim top & bottom
    addBox(opts.w + 0.22, 0.045, 0.05, opts.trimMat, 0, opts.h * 0.5 + 0.09, -0.02, frame);
    addBox(opts.w + 0.22, 0.045, 0.05, opts.trimMat, 0, -opts.h * 0.5 - 0.09, -0.02, frame);
    const artPlane = new THREE.Mesh(new THREE.PlaneGeometry(opts.w, opts.h), pMat);
    artPlane.position.set(0, 0, 0.0);
    frame.add(artPlane);
    staticGroup.add(frame);
  };

  // 1. GIANT HERO MONUMENT POSTER (FAKER — 3.54m x 4.72m, aspect 0.75) on the Double-Height Stairwell Atrium Wall!
  //    Towers nearly 5m tall above the mid-landing (Y = 3.09..7.81), visible from Floor 1 East aisle, stairwell & Floor 2!
  const heroGoldCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xdc2626,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  neonMats.push(heroGoldCrimsonMat);
  mountRealPoster({
    url: '/assets/cyber_posters/poster_hero.jpg',
    fallbackTitle: 'FAKER',
    fallbackSub: 'HALL OF LEGENDS',
    fallbackC1: '#7f1d1d',
    fallbackC2: '#facc15',
    w: 3.54,
    h: 4.72,
    x: -345.9,
    y: 5.45,
    z: -15.63,
    rotY: 0,
    trimMat: heroGoldCrimsonMat,
    emissiveInt: 0.72,
  });

  // 2. GIANT WIDESCREEN CENTERPIECE (poster_02 — 5.40m x 3.04m, aspect 1.78) on Floor 1 North Focal Wall straight ahead of entrance!
  mountRealPoster({
    url: '/assets/cyber_posters/poster_02.jpg',
    fallbackTitle: 'LIÊN MINH',
    fallbackSub: 'E-SPORT ARENA',
    fallbackC1: '#1e3a8a',
    fallbackC2: '#38bdf8',
    w: 5.4,
    h: 3.04,
    x: -354.0,
    y: 2.12,
    z: -15.63,
    rotY: 0,
    trimMat: rgbCyanMat,
    emissiveInt: 0.66,
  });

  // 3. Floor 1 West Gallery Wall: 3 Framed Vertical Posters (exact aspect ratios 0.80, 0.66, 0.67)
  mountRealPoster({
    url: '/assets/cyber_posters/poster_01.jpg',
    fallbackTitle: 'ESPORT PRO',
    fallbackSub: 'CYBER STADIUM',
    fallbackC1: '#1e3a8a',
    fallbackC2: '#38bdf8',
    w: 1.64,
    h: 2.05,
    x: -360.22,
    y: 2.15,
    z: -3.2,
    rotY: Math.PI / 2,
    trimMat: rgbCyanMat,
  });
  mountRealPoster({
    url: '/assets/cyber_posters/poster_03.jpg',
    fallbackTitle: 'ARENA PRO',
    fallbackSub: 'FLOOR 1 ZONE',
    fallbackC1: '#7f1d1d',
    fallbackC2: '#fb7185',
    w: 1.38,
    h: 2.08,
    x: -360.22,
    y: 2.15,
    z: -8.0,
    rotY: Math.PI / 2,
    trimMat: rgbMagentaMat,
  });
  mountRealPoster({
    url: '/assets/cyber_posters/poster_04.jpg',
    fallbackTitle: 'GAMING ZONE',
    fallbackSub: '24/7 OPEN',
    fallbackC1: '#4c1d95',
    fallbackC2: '#e879f9',
    w: 1.39,
    h: 2.08,
    x: -360.22,
    y: 2.15,
    z: -12.6,
    rotY: Math.PI / 2,
    trimMat: rgbCyanMat,
  });

  // 4. Floor 2 VIP West Gallery Wall: 3 Framed Vertical Posters (exact aspect ratio 0.67)
  mountRealPoster({
    url: '/assets/cyber_posters/poster_05.jpg',
    fallbackTitle: 'VIP FLOOR 2',
    fallbackSub: 'PRO SERIES',
    fallbackC1: '#78350f',
    fallbackC2: '#fbbf24',
    w: 1.42,
    h: 2.12,
    x: -360.22,
    y: f2Y + 2.15,
    z: 1.4,
    rotY: Math.PI / 2,
    trimMat: rgbGoldMat,
  });
  mountRealPoster({
    url: '/assets/cyber_posters/poster_06.jpg',
    fallbackTitle: 'CHAMPIONS',
    fallbackSub: '5v5 TOURNAMENT',
    fallbackC1: '#1e3a8a',
    fallbackC2: '#38bdf8',
    w: 1.42,
    h: 2.12,
    x: -360.22,
    y: f2Y + 2.15,
    z: -3.6,
    rotY: Math.PI / 2,
    trimMat: rgbCyanMat,
  });
  mountRealPoster({
    url: '/assets/cyber_posters/poster_07.jpg',
    fallbackTitle: 'LEGENDS',
    fallbackSub: 'CYBER STADIUM',
    fallbackC1: '#4c1d95',
    fallbackC2: '#f472b6',
    w: 1.42,
    h: 2.12,
    x: -360.22,
    y: f2Y + 2.15,
    z: -8.6,
    rotY: Math.PI / 2,
    trimMat: rgbMagentaMat,
  });

  // Powered-off matte/glossy black monitor & idle peripheral materials for unoccupied PCs
  const screenOffMat = new THREE.MeshStandardMaterial({
    color: 0x05070c,
    roughness: 0.12,
    metalness: 0.42,
  });
  const towerOffMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f17,
    roughness: 0.22,
    metalness: 0.35,
  });
  const peripheralOffMat = new THREE.MeshStandardMaterial({
    color: 0x161b24,
    roughness: 0.68,
    metalness: 0.12,
  });

  // Reusable composite Multi-Part Gaming PC Station builder (Flush 1.24m Desk + Thin-Bezel 27" 16:9 Monitor + PC + Keyboard + Chair)
  // Unoccupied seats show powered-off glossy black screens; occupied seats light up with real LMHT / GTA V / PUBG / Valorant screens!
  let stationSeed = 0;
  let activeScreenSeed = 0;
  const buildGamingStation = (
    x: number,
    y: number,
    z: number,
    faceYaw: number,
    vip = false,
    occupied = false
  ) => {
    const variant = stationSeed++;
    const screenMat = occupied
      ? screenMats[(activeScreenSeed++ * 7 + 3) % screenMats.length]
      : screenOffMat;
    const st = new THREE.Group();
    st.position.set(x, y, z);
    st.rotation.y = faceYaw;

    // Continuous flush 1.24m desk top & recessed steel frame legs
    addBox(1.24, 0.06, 0.72, deskCarbonMat, 0, 0.76, 0, st);
    addBox(0.04, 0.74, 0.62, darkMatteFrameMat, -0.59, 0.37, 0, st);
    addBox(0.04, 0.74, 0.62, darkMatteFrameMat, 0.59, 0.37, 0, st);
    addBox(1.22, 0.03, 0.04, vip ? rgbMagentaMat : rgbCyanMat, 0, 0.72, 0.36, st);

    // 27" Thin-Bezel 16:9 Gaming Monitor (dark black when unoccupied, vivid game screen when seated!)
    addBox(0.74, 0.435, 0.042, blackAluMat, -0.1, 1.13, -0.22, st);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.395), screenMat);
    scr.position.set(-0.1, 1.13, -0.196);
    st.add(scr);
    addBox(0.065, 0.18, 0.055, metalRackMat, -0.1, 0.86, -0.24, st);
    addBox(0.28, 0.025, 0.18, metalRackMat, -0.1, 0.79, -0.22, st);

    // Tempered-Glass PC Tower on right of desk (RGB glows only when occupied)
    addBox(0.22, 0.46, 0.42, blackAluMat, 0.43, 1.02, -0.1, st);
    addBox(
      0.03,
      0.38,
      0.34,
      occupied ? (vip ? rgbMagentaMat : rgbCyanMat) : towerOffMat,
      0.315,
      1.02,
      -0.1,
      st
    );

    // Mechanical Keyboard & Mousepad (RGB glows only when occupied)
    addBox(0.68, 0.015, 0.28, darkMatteFrameMat, -0.06, 0.795, 0.12, st);
    addBox(
      0.38,
      0.025,
      0.14,
      occupied ? (vip ? rgbGoldMat : rgbCyanMat) : peripheralOffMat,
      -0.14,
      0.805,
      0.14,
      st
    );
    addBox(
      0.07,
      0.03,
      0.11,
      occupied ? rgbMagentaMat : peripheralOffMat,
      0.18,
      0.805,
      0.14,
      st
    );

    // Sculpted Esports Bucket Gaming Chair (at Z = +0.62 facing monitor -Z)
    const accentChairMat = vip ? chairCyanMat : variant % 2 === 0 ? chairRedMat : chairCyanMat;
    addBox(0.50, 0.09, 0.48, chairBlackMat, 0, 0.46, 0.62, st);
    addBox(0.46, 0.76, 0.09, chairBlackMat, 0, 0.88, 0.84, st);
    addBox(0.08, 0.72, 0.12, accentChairMat, -0.22, 0.88, 0.82, st);
    addBox(0.08, 0.72, 0.12, accentChairMat, 0.22, 0.88, 0.82, st);
    addBox(0.07, 0.38, 0.07, metalRackMat, 0, 0.24, 0.62, st);
    addBox(0.52, 0.05, 0.52, darkMatteFrameMat, 0, 0.05, 0.62, st);

    staticGroup.add(st);
  };

  // Floor 1: Two Continuous Flush Back-to-Back Gaming Islands (9 PCs/side × 4 sides = 36 PCs, ZERO gaps!)
  const f1SeatCoords: Array<{ x: number; y: number; z: number; yaw: number; student: boolean }> = [];
  const f1IslandZs = Array.from({ length: 9 }, (_, i) => -12.26 + i * 1.24);
  [-356.7, -351.2].forEach((islandX, islIdx) => {
    // Central partition divider with RGB neon top bar
    addBox(0.16, 1.32, 11.4, darkMatteFrameMat, islandX, 0.66, -7.3);
    addBox(0.18, 0.06, 11.4, islIdx === 0 ? rgbCyanMat : rgbMagentaMat, islandX, 1.34, -7.3);

    f1IslandZs.forEach((sz, rIdx) => {
      const westOccupied =
        (islIdx === 0 && (rIdx === 1 || rIdx === 4 || rIdx === 7)) ||
        (islIdx === 1 && (rIdx === 2 || rIdx === 6));
      const eastOccupied =
        (islIdx === 0 && (rIdx === 0 || rIdx === 5 || rIdx === 8)) ||
        (islIdx === 1 && (rIdx === 1 || rIdx === 4 || rIdx === 8));

      // West-facing PC (monitor faces -X, chair sits at islandX - 1.06 facing +X)
      buildGamingStation(islandX - 0.46, 0, sz, -Math.PI / 2, false, westOccupied);
      // East-facing PC (monitor faces +X, chair sits at islandX + 1.06 facing -X)
      buildGamingStation(islandX + 0.46, 0, sz, Math.PI / 2, false, eastOccupied);

      if (westOccupied) {
        f1SeatCoords.push({ x: islandX - 1.06, y: 0, z: sz, yaw: Math.PI / 2, student: rIdx % 2 === 0 });
      }
      if (eastOccupied) {
        f1SeatCoords.push({ x: islandX + 1.06, y: 0, z: sz, yaw: -Math.PI / 2, student: (rIdx + islIdx) % 2 === 0 });
      }
    });
  });

  // Floor 1 East Wall Solo Row (fills the wall space between Drink Fridge Z=-2.4 and Stairwell Z=-9.2 with 4 flush PCs!)
  const f1EastZs = Array.from({ length: 4 }, (_, i) => -7.66 + i * 1.24);
  f1EastZs.forEach((sz, idx) => {
    const occupied = idx === 1 || idx === 3;
    buildGamingStation(-344.18, 0, sz, -Math.PI / 2, false, occupied);
    if (occupied) {
      f1SeatCoords.push({ x: -344.78, y: 0, z: sz, yaw: Math.PI / 2, student: idx === 1 });
    }
  });

  // =========================================================================
  // 6. FLOOR 2: 5v5 E-SPORT ARENA STAGE (8 PCs) + VIP ISLANDS (32 PCs) + EAST STREAMER ROW (7 PCs)
  // =========================================================================
  // 5v5 Tournament Podium at North end (X = -359.8 .. -349.4, Z = -15.4 .. -12.0)
  addBox(10.2, 0.22, 3.6, blackAluMat, -354.6, f2Y + 0.11, -13.8);
  addBox(10.25, 0.06, 0.1, rgbGoldMat, -354.6, f2Y + 0.22, -12.0);
  // Giant E-Sport Arena LED Backdrop Screen on North wall
  const arenaTex = createCyberSignTex('CYBER STADIUM • E-SPORT 5v5', {
    subtitle: 'GIẢI ĐẤU SINH VIÊN & HỌC SINH • VIP FLOOR 2',
    width: 1400,
    height: 320,
    borderHex: '#ec4899',
  });
  const arenaMat = new THREE.MeshStandardMaterial({
    map: arenaTex,
    emissive: 0xffffff,
    emissiveMap: arenaTex,
    emissiveIntensity: 0.72,
    roughness: 0.2,
  });
  lanternMats.push(arenaMat);
  const arenaScreen = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.35), arenaMat);
  arenaScreen.position.set(-354.6, f2Y + 2.45, -15.65);
  staticGroup.add(arenaScreen);

  const f2SeatCoords: Array<{ x: number; y: number; z: number; yaw: number; student: boolean }> = [];
  // 8 Continuous Flush Pro Tournament Stations wall-to-wall across stage podium (ZERO gaps!)
  for (let p = 0; p < 8; p++) {
    const px = -358.94 + p * 1.24;
    const occupied = p === 1 || p === 3 || p === 5 || p === 7;
    buildGamingStation(px, f2Y + 0.22, -13.9, 0, true, occupied);
    if (occupied) {
      f2SeatCoords.push({ x: px, y: f2Y + 0.22, z: -13.28, yaw: Math.PI, student: p !== 3 });
    }
  }

  // Floor 2 VIP Back-to-Back Islands (8 PCs/side × 4 sides = 32 VIP PCs, ZERO gaps!)
  const f2IslandZs = Array.from({ length: 8 }, (_, i) => -7.04 + i * 1.24);
  [-356.9, -351.0].forEach((islandX, islIdx) => {
    addBox(0.16, 1.32, 10.1, darkMatteFrameMat, islandX, f2Y + 0.66, -2.7);
    addBox(0.18, 0.06, 10.1, islIdx === 0 ? rgbGoldMat : rgbCyanMat, islandX, f2Y + 1.34, -2.7);
    f2IslandZs.forEach((sz, rIdx) => {
      const westOccupied =
        (islIdx === 0 && (rIdx === 0 || rIdx === 3 || rIdx === 6)) ||
        (islIdx === 1 && rIdx === 5);
      const eastOccupied =
        (islIdx === 0 && rIdx === 2) ||
        (islIdx === 1 && (rIdx === 1 || rIdx === 4 || rIdx === 7));

      buildGamingStation(islandX - 0.46, f2Y, sz, -Math.PI / 2, true, westOccupied);
      buildGamingStation(islandX + 0.46, f2Y, sz, Math.PI / 2, true, eastOccupied);
      if (westOccupied) {
        f2SeatCoords.push({ x: islandX - 1.06, y: f2Y, z: sz, yaw: Math.PI / 2, student: rIdx !== 3 });
      }
      if (eastOccupied) {
        f2SeatCoords.push({ x: islandX + 1.06, y: f2Y, z: sz, yaw: -Math.PI / 2, student: rIdx === 4 });
      }
    });
  });

  // Floor 2 East Streamer / Couple Row flush against East Wall (7 continuous PCs, ZERO gaps!)
  const f2EastZs = Array.from({ length: 7 }, (_, i) => -5.12 + i * 1.24);
  f2EastZs.forEach((sz, idx) => {
    const occupied = idx === 1 || idx === 5;
    buildGamingStation(-344.24, f2Y, sz, -Math.PI / 2, true, occupied);
    if (occupied) {
      f2SeatCoords.push({ x: -344.84, y: f2Y, z: sz, yaw: Math.PI / 2, student: idx === 5 });
    }
  });

  // Interior Ceiling RGB Linear Light Bars + Floor 2 Visible Geometric RGB Ceiling Frames
  [f2Y - 0.3, roofY - 0.12].forEach((cy, flIdx) => {
    [-357.0, -352.0, -346.5].forEach((lx) => {
      addBox(0.16, 0.08, 16.5, flIdx === 0 ? ceilingLedMat : rgbCyanMat, lx, cy, -5.2);
    });
  });
  // Glowing Floor 2 overhead arena RGB frames (visible through the front curtain glass!)
  [-350.1, -355.4].forEach((fx, idx) => {
    const fMat = idx === 0 ? rgbCyanMat : rgbMagentaMat;
    addBox(3.6, 0.07, 0.1, fMat, fx, roofY - 0.28, 3.1);
    addBox(3.6, 0.07, 0.1, fMat, fx, roofY - 0.28, -0.5);
    addBox(0.1, 0.07, 3.6, fMat, fx - 1.75, roofY - 0.28, 1.3);
    addBox(0.1, 0.07, 3.6, fMat, fx + 1.75, roofY - 0.28, 1.3);
  });

  // =========================================================================
  // 7. FRONT FORECOURT: CHỐT BẢO VỆ HIỆN ĐẠI + 6 STUDENT BICYCLES + 5 MOTORBIKES
  // =========================================================================
  // Modern Sleek Black-and-Cyan Security Guard Booth (Chốt Bảo Vệ) at X = -345.1, Z = +6.65
  addBox(1.88, 0.98, 0.88, blackAluMat, -345.1, 0.49, 6.65);
  addBox(1.98, 0.08, 0.98, whitePanelMat, -345.1, 1.0, 6.65);
  addBox(1.88, 0.06, 0.06, rgbCyanMat, -345.1, 0.91, 7.11);
  // Desktop CCTV Security Monitor on guard counter
  addBox(0.46, 0.30, 0.05, blackAluMat, -344.62, 1.24, 6.55, staticGroup, [0, -0.35, 0]);
  const cctvScr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.24), screenMats[0]);
  cctvScr.position.set(-344.64, 1.24, 6.59);
  cctvScr.rotation.y = -0.35;
  staticGroup.add(cctvScr);

  const guardSignTex = createCyberSignTex('BẢO VỆ GIỮ XE', {
    subtitle: 'MIỄN PHÍ XE ĐẠP & XE MÁY',
    width: 640,
    height: 192,
    bgHex: '#0f172a',
    borderHex: '#38bdf8',
  });
  const guardSignMat = new THREE.MeshStandardMaterial({
    map: guardSignTex,
    emissive: 0xe0f2fe,
    emissiveMap: guardSignTex,
    emissiveIntensity: 0.48,
    roughness: 0.28,
  });
  lanternMats.push(guardSignMat);
  const guardSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 0.56), guardSignMat);
  guardSignMesh.position.set(-345.1, 0.52, 7.11);
  staticGroup.add(guardSignMesh);

  // Architectural Black-Steel Cantilever Canopy over Guard Booth (replaces basic umbrella)
  [-345.95, -344.25].forEach((px) => {
    addBox(0.09, 2.68, 0.09, blackAluMat, px, 1.34, 6.26);
  });
  addBox(2.26, 0.14, 1.56, blackAluMat, -345.1, 2.72, 6.72, staticGroup, [0.06, 0, 0]);
  addBox(2.24, 0.05, 0.07, rgbCyanMat, -345.1, 2.66, 7.49);
  addBox(1.5, 0.04, 0.16, soffitLedMat, -345.1, 2.64, 6.75);

  // Student Bicycle Rack Bar & 6 Student Bicycles on West Forecourt (X = -359.8 .. -355.6, Z = 8.0 .. 13.8)
  addBox(0.08, 0.14, 6.2, metalRackMat, -359.4, 0.09, 10.9);
  const bikeColors = [0x38bdf8, 0xef4444, 0xf8fafc, 0x10b981, 0xfacc15, 0x6366f1];
  for (let b = 0; b < 6; b++) {
    const bike = buildStudentBicycleMesh(bikeColors[b]);
    bike.position.set(-357.8 + (b % 2) * 0.18, 0.02, 8.2 + b * 1.08);
    bike.rotation.y = Math.PI / 2 + ((b % 3) - 1) * 0.08;
    staticGroup.add(bike);
  }

  // 5 Detailed Parked Motorbikes on East Forecourt (X = -348.2 .. -344.2, Z = 9.0 .. 13.8)
  const motoColors = [0xdc2626, 0x0f172a, 0x2563eb, 0xf8fafc, 0x0d9488];
  for (let m = 0; m < 5; m++) {
    const moto = buildCityMotorbikeMesh({
      color: motoColors[m],
      variant: m % 2 === 0 ? 'scooter' : 'sport',
      includeRider: false,
      kickstandTilt: true,
      noMerge: false,
    });
    moto.group.position.set(-346.4 + (m % 2) * 0.25, 0.02, 9.2 + m * 1.12);
    moto.group.rotation.y = -Math.PI / 2 + ((m % 3) - 1) * 0.09;
    staticGroup.add(moto.group);
  }

  // Forecourt Streetlight & Subtle Neon Ground Glow Pools
  const cyanPoolMat = new THREE.MeshBasicMaterial({
    map: createGlowPoolTex('rgba(56,189,248,0.48)', 'rgba(14,165,233,0.18)'),
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  poolMats.push(cyanPoolMat);
  const entrancePool = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 6.8), cyanPoolMat);
  entrancePool.rotation.x = -Math.PI / 2;
  entrancePool.position.set(-352.0, 0.045, 7.6);
  staticGroup.add(entrancePool);

  // Balanced Point Lights (crisp interior readability + dramatic night ambiance)
  const f1Light = new THREE.PointLight(0xbae6fd, 1.65, 24, 1.45);
  f1Light.position.set(-352.0, 3.6, -4.2);
  scaledLights.push({ light: f1Light, dayInt: 1.25, nightInt: 1.85, getScale: () => 1 });

  const lobbyLight = new THREE.PointLight(0xe0f2fe, 1.35, 16, 1.5);
  lobbyLight.position.set(-351.9, 3.4, 3.2);
  scaledLights.push({ light: lobbyLight, dayInt: 0.95, nightInt: 1.55, getScale: () => 1 });

  const f2Light = new THREE.PointLight(0xc084fc, 1.65, 24, 1.45);
  f2Light.position.set(-352.0, f2Y + 3.6, -4.8);
  scaledLights.push({ light: f2Light, dayInt: 1.25, nightInt: 1.85, getScale: () => 1 });

  const facadeLight = new THREE.PointLight(0xe0f2fe, 1.35, 25, 1.4);
  facadeLight.position.set(-352.0, 6.2, 8.8);
  scaledLights.push({ light: facadeLight, dayInt: 0.55, nightInt: 1.75, getScale: () => 1 });

  // =========================================================================
  // 8. 24/7 ACTIVE NPCS: BẢO VỆ + THU NGÂN + SEATED GAMERS + SCHOOL VISITORS
  //    ("giờ nào cũng có" — active around the clock, calm natural walking!)
  // =========================================================================
  const npcs: CyberNpcAgent[] = [];
  const spawn = (
    role: CyberNpcAgent['role'],
    x: number,
    y: number,
    z: number,
    yaw: number,
    phase: number,
    seed: number,
    opts?: { isStudent?: boolean; speed?: number; waypoints?: Array<{ x: number; z: number; pauseSec?: number }> }
  ) => {
    const agent = createCyberNpcRig(role, x, y, z, yaw, phase, seed, opts);
    dynamicGroup.add(agent.grp);
    npcs.push(agent);
  };

  // A. Security Guard (Bảo vệ) out front beside guard desk & motorbikes (24/7)
  spawn('guard', -345.3, 0.02, 7.55, 0.25, 0.4, 1);

  // B. Cashier (Nhân viên Thu Ngân) behind Floor 1 reception desk (24/7)
  spawn('cashier', -346.1, 0.02, 2.75, 0.0, 1.1, 2);

  // C. Seated Gamers & School Students on Floor 1 (8 players 24/7)
  f1SeatCoords.forEach((s, idx) => {
    spawn('seated_gamer', s.x, s.y, s.z, s.yaw, idx * 0.75, 10 + idx, { isStudent: s.student });
  });

  // D. Seated Gamers & School Students on Floor 2 VIP / 5v5 Arena (7 players 24/7)
  f2SeatCoords.forEach((s, idx) => {
    spawn('seated_gamer', s.x, s.y, s.z, s.yaw, idx * 0.9, 30 + idx, { isStudent: s.student });
  });

  // E. 6 Calmly Walking School Students & Gamers crossing between Trường THPT Phan Châu Trinh <-> Cyber Stadium (24/7!)
  // Slow, smooth natural walking speed: 1.05 .. 1.26 m/s (zero skating or teleporting!)
  const visitorRoutes: Array<{ isStudent: boolean; speed: number; waypoints: Array<{ x: number; z: number }> }> = [
    {
      isStudent: true,
      speed: 1.12,
      waypoints: [
        { x: -339.5, z: 41.2 },
        { x: -351.8, z: 41.2 },
        { x: -351.8, z: 15.8 },
        { x: -351.8, z: 4.0 },
        { x: -349.6, z: 2.2 },
        { x: -351.2, z: 4.0 },
        { x: -351.2, z: 15.8 },
        { x: -339.5, z: 16.5 },
        { x: -339.5, z: 41.2 },
      ],
    },
    {
      isStudent: true,
      speed: 1.08,
      waypoints: [
        { x: -346.5, z: 41.6 },
        { x: -352.6, z: 41.6 },
        { x: -352.6, z: 15.6 },
        { x: -352.8, z: 7.4 },
        { x: -356.2, z: 7.4 }, // checks bicycle rack
        { x: -352.6, z: 6.2 },
        { x: -352.6, z: -1.5 }, // walks inside Floor 1 PC hall
        { x: -352.6, z: 15.6 },
        { x: -346.5, z: 41.6 },
      ],
    },
    {
      isStudent: true,
      speed: 1.18,
      waypoints: [
        { x: -334.8, z: 41.4 },
        { x: -350.8, z: 41.4 },
        { x: -350.8, z: 15.8 },
        { x: -351.4, z: 3.4 },
        { x: -353.6, z: -4.2 }, // checks friends playing
        { x: -351.4, z: 3.4 },
        { x: -350.8, z: 15.8 },
        { x: -334.8, z: 41.4 },
      ],
    },
    {
      isStudent: false,
      speed: 1.15,
      waypoints: [
        { x: -336.0, z: 16.2 },
        { x: -351.6, z: 16.2 },
        { x: -351.6, z: 3.6 },
        { x: -349.4, z: 3.0 }, // visits cashier counter
        { x: -351.6, z: 4.4 },
        { x: -351.6, z: 16.2 },
        { x: -336.0, z: 16.2 },
      ],
    },
    {
      isStudent: true,
      speed: 1.05,
      waypoints: [
        { x: -356.0, z: 41.4 },
        { x: -352.2, z: 41.4 },
        { x: -352.2, z: 15.6 },
        { x: -352.2, z: 5.5 },
        { x: -352.2, z: 15.6 },
        { x: -356.0, z: 16.2 },
        { x: -356.0, z: 41.4 },
      ],
    },
    {
      isStudent: false,
      speed: 1.22,
      waypoints: [
        { x: -328.0, z: 16.4 },
        { x: -350.6, z: 16.4 },
        { x: -347.2, z: 8.0 }, // checks motorbike
        { x: -351.8, z: 5.0 },
        { x: -353.6, z: -2.0 },
        { x: -351.8, z: 5.0 },
        { x: -350.6, z: 16.4 },
        { x: -328.0, z: 16.4 },
      ],
    },
  ];

  visitorRoutes.forEach((route, idx) => {
    const start = route.waypoints[0];
    spawn('school_visitor', start.x, 0.02, start.z, Math.PI, idx * 2.3 + 0.5, 50 + idx, {
      isStudent: route.isStudent,
      speed: route.speed,
      waypoints: route.waypoints,
    });
  });

  // =========================================================================
  // 9. ANIMATION UPDATE LOOP (24/7 LIVE CYBER CAFE + SMOOTH SLOW WALKING)
  // =========================================================================
  let animClock = 0;
  let doorOpenFactor = 0;
  const doorCenterX = -351.9;
  const doorCenterZ = 5.2;

  const update = (delta: number, _rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => {
    const dt = Math.min(delta, 0.1);
    animClock += dt;

    // Gentle RGB pulse on neon accents & signboards brighter at dusk/night
    const rgbPulse = 0.88 + Math.sin(animClock * 2.2) * 0.16;
    rgbCyanMat.emissiveIntensity = (0.85 + lampFactor * 0.55) * rgbPulse;
    rgbMagentaMat.emissiveIntensity = (0.8 + lampFactor * 0.55) * (0.88 + Math.cos(animClock * 1.9) * 0.16);
    topSignMat.emissiveIntensity = 0.48 + lampFactor * 0.55;
    midSignMat.emissiveIntensity = 0.48 + lampFactor * 0.55;
    lowerSignMat.emissiveIntensity = 0.45 + lampFactor * 0.52;
    promoMat.emissiveIntensity = 0.42 + lampFactor * 0.52;
    cyanPoolMat.opacity = 0.25 + lampFactor * 0.55;

    // Automatic Sliding Glass Double Doors: open smoothly when player OR any student/visitor approaches
    let wantDoorOpen = false;
    if (
      playerPos &&
      playerPos.y < 2.2 &&
      Math.hypot(playerPos.x - doorCenterX, playerPos.z - doorCenterZ) < 5.6
    ) {
      wantDoorOpen = true;
    }

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      npc.grp.visible = true;
      npc.glbHandle.setVisible(true);

      if (npc.role === 'guard') {
        npc.grp.rotation.y = npc.baseYaw + Math.sin(animClock * 0.75 + npc.phase) * 0.32;
        npc.glbHandle.setAnimState('Idle', 1.0);
        if (npc.proxyGrp.visible) {
          npc.rightArm.rotation.x = -0.18 + Math.sin(animClock * 1.5 + npc.phase) * 0.08;
        }
        continue;
      }

      if (npc.role === 'cashier') {
        npc.grp.rotation.y = npc.baseYaw + Math.sin(animClock * 0.8 + npc.phase) * 0.22;
        npc.glbHandle.setAnimState('Idle', 1.0);
        if (npc.proxyGrp.visible) {
          npc.leftArm.rotation.x = -0.55 + Math.sin(animClock * 3.1 + npc.phase) * 0.08;
          npc.rightArm.rotation.x = -0.55 + Math.cos(animClock * 2.7 + npc.phase) * 0.08;
        }
        continue;
      }

      if (npc.role === 'seated_gamer') {
        npc.glbHandle.setAnimState('Sit', 1.0);
        const t = animClock * 2.2 + npc.phase;
        npc.grp.rotation.y = npc.baseYaw + Math.sin(t * 0.45) * 0.07;
        if (npc.proxyGrp.visible) {
          npc.leftArm.rotation.x = -0.82 + Math.sin(t * 3.4) * 0.07;
          npc.rightArm.rotation.x = -0.82 + Math.cos(t * 3.8) * 0.09;
        }
        continue;
      }

      // Smooth constant-speed polyline walking for school students & visitors (1.05..1.22 m/s!)
      if (npc.role === 'school_visitor' && npc.waypoints && npc.segLens && npc.totalDist && npc.totalDist > 0) {
        npc.distPos = ((npc.distPos ?? 0) + npc.speed * dt) % npc.totalDist;
        let rem = npc.distPos;
        let segIdx = 0;
        while (segIdx < npc.segLens.length - 1 && rem > npc.segLens[segIdx]) {
          rem -= npc.segLens[segIdx];
          segIdx++;
        }
        const a = npc.waypoints[segIdx];
        const b = npc.waypoints[(segIdx + 1) % npc.waypoints.length];
        const segLen = Math.max(0.001, npc.segLens[segIdx]);
        const frac = rem / segLen;
        const nx = a.x + (b.x - a.x) * frac;
        const nz = a.z + (b.z - a.z) * frac;

        // Trigger automatic sliding doors when walking NPC approaches the entrance
        if (!wantDoorOpen && Math.hypot(nx - doorCenterX, nz - doorCenterZ) < 4.4) {
          wantDoorOpen = true;
        }

        // Ground elevation: street asphalt sits at Y = -0.24 while sidewalks/forecourt sit at Y = 0.02
        const onAsphalt = nz > 20.6 && nz < 37.4;
        const ny = onAsphalt ? -0.24 : 0.02;
        npc.grp.position.set(nx, ny, nz);

        // Smooth shortest-angle yaw interpolation so turns never snap abruptly
        const targetYaw = Math.atan2(b.x - a.x, b.z - a.z);
        let diff = targetYaw - npc.currentYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        npc.currentYaw += diff * Math.min(1, dt * 6.5);
        npc.grp.rotation.y = npc.currentYaw;

        npc.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(npc.speed / 1.38, 0.72, 0.96));
        if (npc.proxyGrp.visible) {
          const swing = Math.sin(animClock * npc.speed * 3.3 + npc.phase) * 0.34;
          npc.leftLeg.rotation.x = swing;
          npc.rightLeg.rotation.x = -swing;
          npc.leftArm.rotation.x = -swing * 0.65;
          npc.rightArm.rotation.x = npc.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.65;
        }
      }
    }

    // Smoothly glide both sliding glass leaves & tint motion sensor LED green when open
    doorOpenFactor = THREE.MathUtils.damp(doorOpenFactor, wantDoorOpen ? 1 : 0, 6.5, dt);
    leftDoorGroup.position.x = leftDoorClosedX - doorOpenFactor * 1.95;
    rightDoorGroup.position.x = rightDoorClosedX + doorOpenFactor * 1.95;
    const sensorOpen = doorOpenFactor > 0.12;
    doorSensorMat.color.setHex(sensorOpen ? 0x22c55e : 0x38bdf8);
    doorSensorMat.emissive.setHex(sensorOpen ? 0x22c55e : 0x38bdf8);
    doorSensorMat.emissiveIntensity = sensorOpen ? 2.2 : 1.1;
  };

  return {
    staticGroup,
    dynamicGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    update,
  };
}
