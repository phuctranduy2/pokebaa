import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isNewDtvOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';

export const NEW_DTV_FLOOR2_Y = 4.60;

export function isPlayerInNewDtvZone(x: number, z: number): boolean {
  return x >= 147.0 && x <= 180.2 && z >= -74.2 && z <= -44.2;
}

export interface NewDtvBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: NewDtvNpcController | null,
    playerPos?: THREE.Vector3
  ) => void;
  getClosedFactor: () => number;
}

// =========================================================================
// COLLIDERS: NEW DTV NIGHTCLUB & KTV LOUNGE (X = 147.0..180.0, Z = -74.0..-44.2)
// Automatic smoked-glass double doors at (X = 174.5..175.4, Z = -61.0..-57.2)
// =========================================================================
export const NEW_DTV_COLLIDERS: IntersectionColliderBox[] = [
  // Outer Rear & Side Perimeter Walls (Floor 1 & 2)
  { minX: 147.0, maxX: 148.0, minZ: -74.0, maxZ: -44.2, floor: 'both' }, // West rear stage wall
  { minX: 147.2, maxX: 175.4, minZ: -74.1, maxZ: -73.4, floor: 'both' }, // North exterior wall
  { minX: 147.2, maxX: 175.4, minZ: -44.7, maxZ: -44.0, floor: 'both' }, // South divider wall next to Lan Que Phuong

  // Front Facade Walls flanking Automatic Glass Entrance Portal (Z = -61.0..-57.2 open on Floor 1!)
  { minX: 174.3, maxX: 175.4, minZ: -73.8, maxZ: -61.0, floor: 'both' },
  { minX: 174.3, maxX: 175.4, minZ: -57.2, maxZ: -44.4, floor: 'both' },
  { minX: 174.3, maxX: 175.4, minZ: -61.0, maxZ: -57.2, floor: 2 },

  // Exterior Neon Pink Cherry Blossom Trees on Front Promenade
  { minX: 176.7, maxX: 177.7, minZ: -64.7, maxZ: -63.7, floor: 1 },
  { minX: 176.7, maxX: 177.7, minZ: -54.5, maxZ: -53.5, floor: 1 },

  // Outdoor Right-Wing Burgundy Umbrella Cocktail Tables (Z = -72.0..-65.5)
  { minX: 175.8, maxX: 177.4, minZ: -71.5, maxZ: -69.9, floor: 1 },
  { minX: 175.8, maxX: 177.4, minZ: -68.2, maxZ: -66.6, floor: 1 },

  // West DJ / KTV Stage & Speaker Stacks (X = 148.0..153.0, Z = -65.5..-52.5)
  { minX: 148.0, maxX: 153.2, minZ: -65.6, maxZ: -52.4, floor: 1 },

  // North Illuminated Onyx Club Bar (X = 152.5..168.5, Z = -73.2..-69.2)
  { minX: 152.5, maxX: 168.5, minZ: -73.2, maxZ: -69.2, floor: 1 },

  // Floor 1 VIP Club Booths & Tables (8 booths)
  ...[
    [168.5, -65.8],
    [168.5, -52.6],
    [162.5, -67.0],
    [162.5, -51.6],
    [156.5, -67.0],
    [156.5, -51.6],
    [169.5, -48.0],
    [151.0, -48.5],
  ].map(([tx, tz]) => ({
    minX: tx - 1.05,
    maxX: tx + 1.05,
    minZ: tz - 0.95,
    maxZ: tz + 0.95,
    floor: 1 as const,
  })),

  // Interior Staircase North Safety Rail (X = 158.0..164.0, Z = -48.25..-47.95, open West foot X=158.0)
  { minX: 158.0, maxX: 164.0, minZ: -48.3, maxZ: -47.95, floor: 'both' },

  // Floor 2 Mezzanine Glass Balustrade overlooking Stage & Dancefloor (X = 163.8..164.2, Z = -69.5..-48.1)
  { minX: 163.75, maxX: 164.25, minZ: -69.5, maxZ: -48.1, floor: 2 },
  // Side Floor 2 Galleries Safety Rails
  { minX: 153.5, maxX: 164.0, minZ: -65.8, maxZ: -65.4, floor: 2 },
  { minX: 153.5, maxX: 164.0, minZ: -52.6, maxZ: -52.2, floor: 2 },
  { minX: 153.4, maxX: 153.8, minZ: -73.6, maxZ: -65.4, floor: 2 },
  { minX: 153.4, maxX: 153.8, minZ: -52.6, maxZ: -44.6, floor: 2 },

  // Floor 2 VIP Sky-Gallery Tables (5 tables)
  ...[
    [169.5, -69.5],
    [169.5, -62.5],
    [169.5, -55.5],
    [169.5, -48.5],
    [158.5, -69.6],
  ].map(([tx, tz]) => ({
    minX: tx - 1.05,
    maxX: tx + 1.05,
    minZ: tz - 0.95,
    maxZ: tz + 0.95,
    floor: 2 as const,
  })),
];

/**
 * Animated Upper Facade Matrix Curtain Texture:
 * Tall, vivid vertical sinusoidal RGB LED dot ribbons running full-height over dark metallic micro-perforated louver fins!
 */
function createMatrixCurtainDrawer() {
  const w = 1024;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const ribbons = [
    { baseCol: 0.16, amp: 0.055, freq: 1.6, speed: 1.8, color: '#ff3b30' },
    { baseCol: 0.27, amp: 0.060, freq: 1.4, speed: -2.1, color: '#22c55e' },
    { baseCol: 0.39, amp: 0.065, freq: 1.8, speed: 2.3, color: '#3b82f6' },
    { baseCol: 0.51, amp: 0.055, freq: 1.5, speed: -1.9, color: '#eab308' },
    { baseCol: 0.63, amp: 0.065, freq: 1.7, speed: 2.0, color: '#06b6d4' },
    { baseCol: 0.74, amp: 0.055, freq: 1.4, speed: -2.2, color: '#3b82f6' },
    { baseCol: 0.84, amp: 0.050, freq: 1.9, speed: 1.6, color: '#22c55e' },
  ];

  const cols = 72;
  const rows = 26;
  const colStep = w / cols;
  const rowStep = h / rows;

  const redraw = (t: number) => {
    // Deep metallic charcoal paneling with alternating brushed louver sheen
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, w, h);

    for (let sx = 0; sx < cols; sx++) {
      ctx.fillStyle = sx % 2 === 0 ? 'rgba(30, 41, 59, 0.36)' : 'rgba(9, 13, 22, 0.72)';
      ctx.fillRect(sx * colStep, 0, colStep * 0.65, h);
    }

    // Subtle tiny metallic perforation reflection grid across the full wall (matching Image 2!)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
    for (let col = 6; col < cols - 6; col++) {
      const cx = (col + 0.5) * colStep;
      for (let row = 0; row < rows; row++) {
        const cy = (row + 0.5) * rowStep;
        ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      }
    }

    // Continuous tall RGB serpentine dot ribbons (dense multi-column bright LED trails)
    for (let row = 0; row < rows; row++) {
      const ry = row / (rows - 1);
      const cy = (row + 0.5) * rowStep;
      for (let r = 0; r < ribbons.length; r++) {
        const rb = ribbons[r];
        const centerU = rb.baseCol + Math.sin(ry * Math.PI * rb.freq + t * rb.speed) * rb.amp;
        const centerCol = Math.round(centerU * cols);
        for (let dc = -1; dc <= 1; dc++) {
          const cIdx = centerCol + dc;
          if (cIdx < 5 || cIdx >= cols - 5) continue;
          const cx = (cIdx + 0.5) * colStep;
          const distFade = dc === 0 ? 1.0 : 0.45;
          const pulse = 0.78 + 0.22 * Math.sin(t * 3.5 + row * 0.4 + r);

          ctx.globalAlpha = distFade * pulse;
          ctx.fillStyle = rb.color;
          ctx.beginPath();
          ctx.arc(cx, cy, dc === 0 ? 5.2 : 3.8, 0, Math.PI * 2);
          ctx.fill();

          if (dc === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.72 * pulse;
            ctx.beginPath();
            ctx.arc(cx, cy, 2.0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    tex.needsUpdate = true;
  };

  redraw(0);
  return { tex, redraw };
}

/**
 * Iconic Hero Lettering Sign: "NEW" (Crisp Thin White) + "DTV" (Vivid Electric Gold w/ Fiery Crimson-Orange Neon Outline & Soaring V Tail!)
 */
function createNewDtvLogoTex(): THREE.CanvasTexture {
  const w = 1536;
  const h = 440;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.textBaseline = 'alphabetic';

  // "NEW" in crisp slender modern white lettering
  ctx.textAlign = 'right';
  ctx.font = '700 124px system-ui, -apple-system, sans-serif';
  ctx.shadowColor = '#e2e8f0';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('NEW', 555, 396);

  // "DT" bold saturated amber-yellow center with blazing red-orange border (high contrast, zero whiteout!)
  ctx.textAlign = 'left';
  ctx.font = '900 228px Impact, "Arial Black", sans-serif';
  ctx.lineJoin = 'round';

  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 24;
  ctx.lineWidth = 26;
  ctx.strokeStyle = '#dc2626';
  ctx.strokeText('DT', 585, 396);

  ctx.shadowBlur = 0;
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ea580c';
  ctx.strokeText('DT', 585, 396);

  const goldGrad = ctx.createLinearGradient(0, 175, 0, 396);
  goldGrad.addColorStop(0, '#fde047');
  goldGrad.addColorStop(0.5, '#f59e0b');
  goldGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = goldGrad;
  ctx.fillText('DT', 585, 396);

  // Iconic "V" with soaring checkmark arm shooting diagonally upward-right
  ctx.beginPath();
  ctx.moveTo(862, 218);
  ctx.lineTo(906, 218);
  ctx.lineTo(968, 348);
  ctx.lineTo(1182, 34);
  ctx.lineTo(1224, 58);
  ctx.lineTo(986, 400);
  ctx.lineTo(942, 400);
  ctx.closePath();

  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 24;
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();

  ctx.shadowBlur = 0;
  const vGrad = ctx.createLinearGradient(862, 34, 1224, 400);
  vGrad.addColorStop(0, '#fde047');
  vGrad.addColorStop(0.55, '#f59e0b');
  vGrad.addColorStop(1, '#ea580c');
  ctx.fillStyle = vGrad;
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Animated Left-Wing Storefront LED Screen: Colorful Multi-Burst Fireworks + Sharp "NEW DTV • HAPPY NIGHT!"
 */
function createLeftLedScreenDrawer() {
  const w = 640;
  const h = 360;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const redraw = (t: number) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#090514');
    bg.addColorStop(1, '#1a0b12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Dual colorful firework blooms (warm coral-gold + crimson-magenta) with crisp spark trails (no white blowout)
    const pulse = 0.88 + Math.sin(t * 2.4) * 0.12;
    const bursts = [
      { cx: 195, cy: 175, rad: 155 * pulse, inner: '#fde047', mid: '#f97316', outer: '#dc2626' },
      { cx: 365, cy: 195, rad: 130 * (1.85 - pulse), inner: '#fda4af', mid: '#e11d48', outer: '#7e22ce' },
    ];
    bursts.forEach((b, bIdx) => {
      const g = ctx.createRadialGradient(b.cx, b.cy, 4, b.cx, b.cy, b.rad);
      g.addColorStop(0, b.inner);
      g.addColorStop(0.32, b.mid);
      g.addColorStop(0.7, b.outer);
      g.addColorStop(1, 'rgba(9,5,20,0)');
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = b.inner;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 + t * (bIdx === 0 ? 0.16 : -0.14);
        const r0 = 18;
        const r1 = (70 + (i % 3) * 28) * pulse;
        ctx.beginPath();
        ctx.moveTo(b.cx + Math.cos(a) * r0, b.cy + Math.sin(a) * r0);
        ctx.lineTo(b.cx + Math.cos(a) * r1, b.cy + Math.sin(a) * r1);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // Crisp dark backing plate shadow behind text so lettering stays ultra readable
    ctx.textAlign = 'right';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#09090b';
    ctx.font = '900 40px system-ui, sans-serif';
    ctx.strokeText('NEW DTV', w - 28, 60);
    ctx.fillStyle = '#fde047';
    ctx.fillText('NEW DTV', w - 28, 60);

    ctx.textAlign = 'center';
    ctx.font = '900 58px Impact, "Arial Black", sans-serif';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#18181b';
    ctx.strokeText('HAPPY NIGHT!', w * 0.5, 224);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HAPPY NIGHT!', w * 0.5, 224);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    tex.needsUpdate = true;
  };

  redraw(0);
  return { tex, redraw };
}

/**
 * Ornate High-Res Moroccan/Baroque CNC Floral Scrollwork Column Texture (Image 2 right patio!)
 */
function createCncLatticeTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#050814';
  ctx.fillRect(0, 0, w, h);

  // Subtle internal warm-gold backlight glow
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#090d1a');
  g.addColorStop(0.5, '#1e293b');
  g.addColorStop(1, '#090d1a');
  ctx.fillStyle = g;
  ctx.fillRect(14, 14, w - 28, h - 28);

  // Intricate glowing ivory quatrefoil + diamond floral filigree
  ctx.shadowColor = '#fde68a';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#fef9c3';
  ctx.lineWidth = 6;
  for (let y = 52; y < h - 30; y += 84) {
    ctx.beginPath();
    ctx.arc(w * 0.5, y, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.5, y - 42);
    ctx.quadraticCurveTo(w * 0.85, y, w * 0.5, y + 42);
    ctx.quadraticCurveTo(w * 0.15, y, w * 0.5, y - 42);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w * 0.5, y, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Interior KTV Transom Crest Sign visible through the Diamond Glass Portal ("NEW DTV")
 */
function createPortalTransomCrestTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#fca5a5';
  ctx.font = '900 72px Impact, sans-serif';
  ctx.fillText('NEW DTV', w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createNewDtvStageScreenTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const g = ctx.createRadialGradient(512, 256, 20, 512, 256, 520);
  g.addColorStop(0, '#3b0764');
  g.addColorStop(0.55, '#090d1f');
  g.addColorStop(1, '#020617');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(6, 182, 212, 0.45)' : 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(512, 256);
    const a = (i / 16) * Math.PI * 2;
    ctx.lineTo(512 + Math.cos(a) * 600, 256 + Math.sin(a) * 400);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 132px Impact, sans-serif';
  ctx.fillText('NEW DTV', 512, 218);

  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.fillText('NIGHTCLUB  •  VIP KTV  •  LIVE DJ', 512, 342);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createNewDtvGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(232, 121, 249, 0.72)');
  g.addColorStop(0.5, 'rgba(56, 189, 248, 0.34)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMagentaSplashTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(236, 72, 153, 0.82)');
  g.addColorStop(0.55, 'rgba(217, 70, 239, 0.32)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNewDtvStructure(): NewDtvBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Club & Architectural Materials
  const clubFloorMat = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.35, metalness: 0.25 });
  const graniteStepMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.22 });
  const exteriorWallMat = new THREE.MeshStandardMaterial({ color: 0x090b12, roughness: 0.5, metalness: 0.45 });
  const cornerMarbleMat = new THREE.MeshStandardMaterial({ color: 0x141824, roughness: 0.32, metalness: 0.55 });
  const darkChromeMat = new THREE.MeshStandardMaterial({ color: 0x222938, roughness: 0.22, metalness: 0.85 });
  const sofaVelvetMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.78 });
  const tableTopMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.5 });
  const umbrellaRedMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 });
  const patioBlueWashMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    emissive: 0x1e40af,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  });
  const glassDoorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.48,
    roughness: 0.08,
    metalness: 0.65,
  });

  const whiteLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 1.85,
    roughness: 0.15,
  });
  const pinkBlossomMat = new THREE.MeshStandardMaterial({
    color: 0xe879f9,
    emissive: 0xd946ef,
    emissiveIntensity: 1.65,
    roughness: 0.28,
  });
  const hotMagentaTipMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xec4899,
    emissiveIntensity: 1.9,
    roughness: 0.22,
  });
  const treeBarkLedMat = new THREE.MeshStandardMaterial({
    color: 0xc026d3,
    emissive: 0xa21caf,
    emissiveIntensity: 1.35,
    roughness: 0.4,
  });
  const goldMascotMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.65,
    roughness: 0.25,
  });
  const redNeonMat = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xef4444,
    emissiveIntensity: 1.65,
    roughness: 0.2,
  });
  const cyanNeonMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.65,
    roughness: 0.2,
  });

  neonMats.push(whiteLedMat, pinkBlossomMat, hotMagentaTipMat, goldMascotMat, redNeonMat, cyanNeonMat, patioBlueWashMat);
  lanternMats.push(pinkBlossomMat, hotMagentaTipMat, goldMascotMat);

  const poolTex = createNewDtvGlowPoolTex();
  const dtvPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(dtvPoolMat);

  const splashTex = createMagentaSplashTex();
  const magentaSplashMat = new THREE.MeshBasicMaterial({
    map: splashTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(magentaSplashMat);

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material
  ) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)),
      mat
    );
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    staticGroup.add(m);
    return m;
  };

  /**
   * Helper: Build a continuous 3D glowing neon strut cleanly between ANY two 3D points (zero corner gaps!)
   */
  const addStrut = (p0: THREE.Vector3, p1: THREE.Vector3, thickness: number, depthX: number, mat: THREE.Material) => {
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.BoxGeometry(depthX, len + thickness * 0.3, thickness), mat);
    m.position.copy(p0).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    staticGroup.add(m);
    return m;
  };

  // =========================================================================
  // 1. FLOOR SLABS, GRANITE STEPS & SIDEWALK GLOW POOLS
  // =========================================================================
  addBox(147.0, 180.0, -0.25, 0.0, -74.0, -44.2, clubFloorMat);
  // Wide Dark Granite Portal Entrance Steps (X = 175.0..177.2, Z = -62.5..-55.7)
  addBox(175.1, 177.2, 0.0, 0.14, -62.5, -55.7, graniteStepMat);
  addBox(175.1, 176.6, 0.14, 0.28, -62.1, -56.1, graniteStepMat);
  addBox(175.1, 176.0, 0.28, 0.40, -61.7, -56.5, graniteStepMat);
  addBox(177.14, 177.22, 0.12, 0.15, -62.4, -55.8, whiteLedMat);
  addBox(176.54, 176.62, 0.26, 0.29, -62.0, -56.2, whiteLedMat);

  const frontPool = new THREE.Mesh(new THREE.PlaneGeometry(15, 29), dtvPoolMat);
  frontPool.rotation.x = -Math.PI / 2;
  frontPool.position.set(177.0, 0.02, -59.1);
  staticGroup.add(frontPool);

  // =========================================================================
  // 2. ICONIC UPPER FACADE: CONTINUOUS RGB LED WAVES + METALLIC FINS + STEPPED BORDERS
  // =========================================================================
  addBox(147.1, 148.0, 0.0, 11.4, -74.0, -44.2, exteriorWallMat);
  addBox(147.2, 175.3, 0.0, 11.4, -74.0, -73.4, exteriorWallMat);
  addBox(147.2, 175.3, 0.0, 11.4, -44.7, -44.1, exteriorWallMat);
  addBox(147.2, 175.5, 11.0, 11.5, -74.0, -44.2, exteriorWallMat);
  addBox(174.6, 175.4, 4.6, 11.2, -74.0, -44.2, exteriorWallMat);

  // Outer Stepped Dark-Marble Corner Cladding Wings (matching Image 2 outer stone pillars!)
  [0, 1, 2, 3].forEach((s) => {
    const w = 1.6 + s * 0.72;
    const yTop = 11.15 - s * 1.4;
    const yBot = yTop - 1.42;
    addBox(175.3, 175.58, yBot, yTop, -44.2 - w, -44.2, cornerMarbleMat);
    addBox(175.3, 175.58, yBot, yTop, -74.0, -74.0 + w, cornerMarbleMat);
  });

  // Live Animated RGB Matrix Wave Curtain Face!
  const matrixDrawer = createMatrixCurtainDrawer();
  const matrixMat = new THREE.MeshStandardMaterial({
    map: matrixDrawer.tex,
    emissive: 0xffffff,
    emissiveMap: matrixDrawer.tex,
    emissiveIntensity: 1.32,
    roughness: 0.25,
  });
  const matrixPanel = new THREE.Mesh(new THREE.PlaneGeometry(29.2, 6.45), matrixMat);
  matrixPanel.rotation.y = Math.PI / 2;
  matrixPanel.position.set(175.44, 7.9, -59.1);
  matrixPanel.userData.noMerge = true;
  staticGroup.add(matrixPanel);

  // 3D Brushed Chrome Louver Ribs spanning the Matrix Facade
  for (let lz = -73.2; lz <= -45.0; lz += 0.68) {
    addBox(175.45, 175.60, 4.65, 11.15, lz - 0.04, lz + 0.04, darkChromeMat);
  }

  // Stepped White LED Borders: Symmetric Top-Left, Top-Right + Lower Inner Step Risers flanking NEW DTV!
  const addSteppedCornerLed = (startZ: number, dirZ: number) => {
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const zA = startZ + dirZ * s * 0.68;
      const zB = startZ + dirZ * (s + 1) * 0.68;
      const yBase = 11.05 - s * 1.02;
      addBox(175.56, 175.72, yBase - 0.045, yBase + 0.045, Math.min(zA, zB), Math.max(zA, zB), whiteLedMat);
      addBox(175.56, 175.72, yBase - 1.05, yBase + 0.045, zB - 0.045, zB + 0.045, whiteLedMat);
    }
    // Lower inner stepped podium risers hugging "NEW DTV" (visible in Image 2 bottom corners!)
    const innerZ0 = startZ + dirZ * 4.9;
    [0, 1].forEach((k) => {
      const izA = innerZ0 + dirZ * k * 0.68;
      const izB = innerZ0 + dirZ * (k + 1) * 0.68;
      const iy = 5.45 - k * 0.55;
      addBox(175.56, 175.72, iy - 0.04, iy + 0.04, Math.min(izA, izB), Math.max(izA, izB), whiteLedMat);
      addBox(175.56, 175.72, 4.60, iy + 0.04, izA - 0.04, izA + 0.04, whiteLedMat);
    });
  };
  addSteppedCornerLed(-44.3, -1); // Left wing
  addSteppedCornerLed(-73.9, 1);  // Right wing

  // Crisp Full-Width Floating White LED Canopy Beam (Y = 4.38..4.64)
  addBox(174.5, 176.35, 4.35, 4.65, -74.0, -44.2, darkChromeMat);
  addBox(176.30, 176.44, 4.44, 4.58, -74.1, -44.1, whiteLedMat);

  // Signature Centerpiece Sign: "NEW DTV" (crisp white NEW + electric gold/red DTV with soaring V!)
  const heroLogoTex = createNewDtvLogoTex();
  const heroLogoMat = new THREE.MeshStandardMaterial({
    map: heroLogoTex,
    emissive: 0xffffff,
    emissiveMap: heroLogoTex,
    emissiveIntensity: 1.08, // preserves rich amber-gold & fiery red contrast without washing out
    alphaTest: 0.22,
    side: THREE.DoubleSide,
  });
  const heroLogoMesh = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 3.85), heroLogoMat);
  heroLogoMesh.rotation.y = Math.PI / 2;
  heroLogoMesh.position.set(175.92, 6.28, -59.1);
  staticGroup.add(heroLogoMesh);

  // =========================================================================
  // 3. GROUND FLOOR: HEXAGON-CHEVRON < > WHITE LED PORTAL + ANIMATED LED WALL + PINK TREES
  // =========================================================================
  addBox(174.4, 175.3, 0.0, 4.4, -73.8, -61.0, exteriorWallMat);
  addBox(174.4, 175.3, 0.0, 4.4, -57.2, -44.4, exteriorWallMat);
  addBox(174.4, 175.3, 3.6, 4.4, -61.0, -57.2, exteriorWallMat);

  // Screen-LEFT (+Z, Z = -55.4..-45.6): Giant Animated "NEW DTV • HAPPY NIGHT!" Fireworks Screen
  const leftScreenDrawer = createLeftLedScreenDrawer();
  const leftScreenMat = new THREE.MeshStandardMaterial({
    map: leftScreenDrawer.tex,
    emissive: 0xffffff,
    emissiveMap: leftScreenDrawer.tex,
    emissiveIntensity: 1.05,
  });
  const leftLedWall = new THREE.Mesh(new THREE.PlaneGeometry(7.9, 3.45), leftScreenMat);
  leftLedWall.rotation.y = Math.PI / 2;
  leftLedWall.position.set(175.38, 2.25, -50.2);
  leftLedWall.userData.noMerge = true;
  staticGroup.add(leftLedWall);

  // Vertical White LED Pillar Trims flanking Storefront Bays
  [-45.0, -55.1, -63.1, -73.4].forEach((pz) => {
    addBox(175.38, 175.50, 0.15, 4.38, pz - 0.05, pz + 0.05, whiteLedMat);
  });

  // ICONIC CONTINUOUS CHEVRON-HEXAGONAL <   > WHITE LED ENTRANCE PORTAL (Image 2 Center!)
  // Left side (+Z): Bottom(-56.2, 0.25) -> Mid-Out(-55.45, 2.15) -> Top-In(-56.65, 4.22)
  // Right side (-Z): Bottom(-62.0, 0.25) -> Mid-Out(-62.75, 2.15) -> Top-In(-61.55, 4.22)
  const portalX = 175.68;
  const pL0 = new THREE.Vector3(portalX, 0.28, -56.25);
  const pL1 = new THREE.Vector3(portalX, 2.15, -55.45);
  const pL2 = new THREE.Vector3(portalX, 4.20, -56.65);
  const pR0 = new THREE.Vector3(portalX, 0.28, -61.95);
  const pR1 = new THREE.Vector3(portalX, 2.15, -62.75);
  const pR2 = new THREE.Vector3(portalX, 4.20, -61.55);

  addStrut(pL0, pL1, 0.24, 0.34, whiteLedMat);
  addStrut(pL1, pL2, 0.24, 0.34, whiteLedMat);
  addStrut(pR0, pR1, 0.24, 0.34, whiteLedMat);
  addStrut(pR1, pR2, 0.24, 0.34, whiteLedMat);
  addStrut(pL2, pR2, 0.22, 0.34, whiteLedMat);

  // Nested Concentric Tunnel Framing & Ceiling Red/White Chevron Ribs inside the Portal Foyer
  [0, 1, 2].forEach((ringIdx) => {
    const rx = 175.35 - ringIdx * 0.42;
    const inset = ringIdx * 0.18;
    const mat = ringIdx === 0 ? whiteLedMat : ringIdx === 1 ? redNeonMat : cyanNeonMat;
    addBox(rx - 0.08, rx + 0.08, 3.85 - inset * 0.7, 3.96 - inset * 0.7, -61.3 + inset, -56.9 - inset, mat);
    addBox(rx - 0.08, rx + 0.08, 0.35, 3.85 - inset * 0.7, -56.95 - inset, -56.82 - inset, darkChromeMat);
    addBox(rx - 0.08, rx + 0.08, 0.35, 3.85 - inset * 0.7, -61.38 + inset, -61.25 + inset, darkChromeMat);
  });

  // Glowing Red "NEW DTV" Transom Crest Sign suspended above the Glass Double Doors
  const crestTex = createPortalTransomCrestTex();
  const crestMat = new THREE.MeshStandardMaterial({
    map: crestTex,
    emissive: 0xffffff,
    emissiveMap: crestTex,
    emissiveIntensity: 1.4,
    alphaTest: 0.2,
    side: THREE.DoubleSide,
  });
  const crestSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), crestMat);
  crestSign.rotation.y = Math.PI / 2;
  crestSign.position.set(175.02, 3.22, -59.1);
  staticGroup.add(crestSign);

  // Automatic Sliding Double Glass Doors (with Cyan "X" neon stripes)
  const doorLeftGroup = new THREE.Group();
  doorLeftGroup.userData.noMerge = true;
  doorLeftGroup.position.set(174.85, 0.0, -58.15);
  const doorPanelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 1.85), glassDoorMat);
  doorPanelL.position.y = 1.7;
  doorLeftGroup.add(doorPanelL);
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 3.42, 0.08), darkChromeMat);
  frameL.position.set(0, 1.71, 0.90);
  doorLeftGroup.add(frameL);
  const xBarL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.2, 0.07), cyanNeonMat);
  xBarL.position.set(0, 1.5, 0);
  xBarL.rotation.x = 0.65;
  doorLeftGroup.add(xBarL);
  staticGroup.add(doorLeftGroup);

  const doorRightGroup = new THREE.Group();
  doorRightGroup.userData.noMerge = true;
  doorRightGroup.position.set(174.85, 0.0, -60.05);
  const doorPanelR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 1.85), glassDoorMat);
  doorPanelR.position.y = 1.7;
  doorRightGroup.add(doorPanelR);
  const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 3.42, 0.08), darkChromeMat);
  frameR.position.set(0, 1.71, -0.90);
  doorRightGroup.add(frameR);
  const xBarR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.2, 0.07), cyanNeonMat);
  xBarR.position.set(0, 1.5, 0);
  xBarR.rotation.x = -0.65;
  doorRightGroup.add(xBarR);
  staticGroup.add(doorRightGroup);

  // Overhead Motion Sensor housing on portal header
  addBox(175.45, 175.72, 3.45, 3.60, -59.5, -58.7, darkChromeMat);
  const sensorLed = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), cyanNeonMat);
  sensorLed.position.set(175.73, 3.52, -59.1);
  staticGroup.add(sensorLed);

  // Rolling Security Shutter across NewDTV Portal (Closed 07:00 - 16:00)
  const newDtvShutterTex = createRollingShutterTexture({
    title: 'NEW DTV CLUB',
    hoursLabel: 'MỞ CỬA: 16:00 – 07:00 SÁNG',
    accentHex: '#e11d48',
  });
  const newDtvShutterMat = new THREE.MeshStandardMaterial({
    map: newDtvShutterTex,
    roughness: 0.45,
    metalness: 0.55,
  });
  const newDtvShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'new_dtv_shutter',
      axis: 'z',
      pos: 175.02,
      spanCenter: -59.1,
      width: 3.85,
      baseY: 0.0,
      topY: 3.4,
    },
    newDtvShutterMat,
    darkChromeMat
  );

  // Rich Branching Electric-Magenta LED Cherry Blossom Trees (replaces boxy low-poly rocks!)
  const addPinkLedTree = (tx: number, tz: number) => {
    const t = new THREE.Group();
    t.position.set(tx, 0, tz);

    // Base plinth + floor magenta light splash
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.14, 10), darkChromeMat);
    baseRing.position.y = 0.07;
    t.add(baseRing);

    const splash = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), magentaSplashMat);
    splash.rotation.x = -Math.PI / 2;
    splash.position.y = 0.03;
    t.add(splash);

    // Trunk & spreading illuminated limbs
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.45, 8), treeBarkLedMat);
    trunk.position.y = 0.78;
    t.add(trunk);

    const branchDefs: Array<{ rotX: number; rotZ: number; len: number; blossoms: number }> = [
      { rotX: 0.45, rotZ: 0.28, len: 1.05, blossoms: 8 },
      { rotX: -0.48, rotZ: 0.22, len: 1.02, blossoms: 8 },
      { rotX: 0.15, rotZ: -0.45, len: 0.98, blossoms: 7 },
      { rotX: -0.18, rotZ: 0.42, len: 0.96, blossoms: 7 },
      { rotX: 0.0, rotZ: 0.05, len: 1.15, blossoms: 9 },
    ];
    branchDefs.forEach((b, bIdx) => {
      const bGrp = new THREE.Group();
      bGrp.position.set(0, 1.38, 0);
      bGrp.rotation.set(b.rotX, 0, b.rotZ);

      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, b.len, 6), treeBarkLedMat);
      limb.position.y = b.len * 0.5;
      bGrp.add(limb);

      for (let k = 0; k < b.blossoms; k++) {
        const frac = 0.35 + (k / Math.max(1, b.blossoms - 1)) * 0.72;
        const a = k * 2.1 + bIdx;
        const offR = 0.18 + (k % 3) * 0.13;
        const budMat = (k + bIdx) % 3 === 0 ? hotMagentaTipMat : pinkBlossomMat;
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.11 + (k % 2) * 0.045, 7, 6), budMat);
        bud.position.set(Math.cos(a) * offR, b.len * frac + 0.12, Math.sin(a) * offR);
        bGrp.add(bud);
      }
      t.add(bGrp);
    });

    staticGroup.add(t);
  };
  addPinkLedTree(177.2, -54.0);
  addPinkLedTree(177.2, -64.2);

  // Sculpted Glowing Golden Mascot Statue standing at Left Stair Edge (Image 2!)
  const mascotGroup = new THREE.Group();
  mascotGroup.position.set(176.6, 0.14, -55.7);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.55), darkChromeMat);
  plinth.position.y = 0.07;
  mascotGroup.add(plinth);
  const mBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.55, 10), goldMascotMat);
  mBody.position.y = 0.42;
  mascotGroup.add(mBody);
  const mHead = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), goldMascotMat);
  mHead.position.y = 0.80;
  mascotGroup.add(mHead);
  const mSnout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.12), goldMascotMat);
  mSnout.position.set(0.16, 0.76, 0);
  mascotGroup.add(mSnout);
  [-0.12, 0.12].forEach((ez) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), goldMascotMat);
    ear.position.set(0, 1.02, ez);
    mascotGroup.add(ear);
  });
  staticGroup.add(mascotGroup);

  // Screen-RIGHT (-Z, Z = -73.4..-64.8): Ornate Glowing CNC Lattice Columns + Blue Cove Wash + Burgundy Umbrella Patio
  addBox(174.5, 176.2, 4.10, 4.35, -73.6, -63.4, patioBlueWashMat);
  const cncTex = createCncLatticeTex();
  const cncMat = new THREE.MeshStandardMaterial({
    map: cncTex,
    emissive: 0xfde68a,
    emissiveMap: cncTex,
    emissiveIntensity: 1.05,
  });
  [-65.4, -71.8].forEach((cz) => {
    const cncCol = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.05, 0.90), cncMat);
    cncCol.position.set(175.65, 2.025, cz);
    staticGroup.add(cncCol);
  });

  // Layered Scalloped Burgundy Market Patio Umbrella + 2 Illuminated Cocktail Tables & Barstools
  const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.8, 8), darkChromeMat);
  umbPole.position.set(176.9, 1.4, -69.0);
  staticGroup.add(umbPole);
  const umbCanopy = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.88, 8), umbrellaRedMat);
  umbCanopy.position.set(176.9, 2.9, -69.0);
  staticGroup.add(umbCanopy);
  const umbValance = new THREE.Mesh(new THREE.CylinderGeometry(2.58, 2.58, 0.22, 8, 1, true), umbrellaRedMat);
  umbValance.position.set(176.9, 2.38, -69.0);
  staticGroup.add(umbValance);

  const addCocktailTable = (tx: number, tz: number, baseY = 0) => {
    const g = new THREE.Group();
    g.position.set(tx, baseY, tz);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.24, 0.92, 10), darkChromeMat);
    stem.position.y = 0.46;
    g.add(stem);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 12), tableTopMat);
    top.position.y = 0.95;
    g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.025, 6, 16), cyanNeonMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.95;
    g.add(rim);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.24, 8), goldMascotMat);
    lamp.position.y = 1.09;
    g.add(lamp);
    [-0.68, 0.68].forEach((sz) => {
      const sPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.14, 0.66, 8), darkChromeMat);
      sPole.position.set(0, 0.33, sz);
      g.add(sPole);
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.07, 10), umbrellaRedMat);
      seat.position.set(0, 0.68, sz);
      g.add(seat);
    });
    staticGroup.add(g);
  };
  addCocktailTable(176.7, -70.7, 0);
  addCocktailTable(176.7, -67.3, 0);

  // =========================================================================
  // 4. INTERIOR TWO-FLOOR SUPER-LOUNGE: STAGE, DJ BOOTH, ONYX BAR & VIP BOOTHS
  // =========================================================================
  const f2Y = NEW_DTV_FLOOR2_Y;

  addBox(153.5, 163.5, 0.005, 0.02, -65.0, -53.0, tableTopMat);
  [-64.5, -59.0, -53.5].forEach((gz) => {
    addBox(153.5, 163.5, 0.015, 0.03, gz - 0.04, gz + 0.04, cyanNeonMat);
  });
  for (let gx = 154.0; gx <= 163.0; gx += 3.0) {
    addBox(gx - 0.04, gx + 0.04, 0.015, 0.03, -64.8, -53.2, hotMagentaTipMat);
  }

  addBox(148.0, 153.0, 0.0, 0.72, -65.5, -52.5, graniteStepMat);
  addBox(152.95, 153.10, 0.65, 0.74, -65.5, -52.5, redNeonMat);
  addBox(151.0, 152.3, 0.72, 1.75, -60.8, -57.2, darkChromeMat);
  addBox(152.28, 152.36, 1.35, 1.72, -60.7, -57.3, cyanNeonMat);

  const stageTex = createNewDtvStageScreenTex();
  const stageMat = new THREE.MeshStandardMaterial({
    map: stageTex,
    emissive: 0xffffff,
    emissiveMap: stageTex,
    emissiveIntensity: 1.25,
  });
  const stageScreen = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 5.4), stageMat);
  stageScreen.rotation.y = Math.PI / 2;
  stageScreen.position.set(148.18, 4.35, -59.0);
  staticGroup.add(stageScreen);

  [-64.4, -53.6].forEach((sz) => {
    addBox(148.6, 150.2, 0.72, 4.8, sz - 0.65, sz + 0.65, darkChromeMat);
    addBox(150.18, 150.26, 0.85, 4.65, sz - 0.66, sz - 0.58, redNeonMat);
    addBox(150.18, 150.26, 0.85, 4.65, sz + 0.58, sz + 0.66, redNeonMat);
  });

  const sweepSpotlights: Array<{ pivot: THREE.Group; baseAngle: number; speed: number }> = [];
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  [
    [154.0, 8.8, -62.0, 0.8],
    [154.0, 8.8, -56.0, 1.1],
    [159.0, 8.8, -62.5, 0.95],
    [159.0, 8.8, -55.5, 1.25],
  ].forEach(([lx, ly, lz, spd], idx) => {
    const pivot = new THREE.Group();
    pivot.userData.noMerge = true;
    pivot.position.set(lx, ly, lz);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.42, 10), darkChromeMat);
    pivot.add(housing);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.85, 8.4, 16, 1, true), beamMat);
    cone.position.y = -4.3;
    pivot.add(cone);
    staticGroup.add(pivot);
    sweepSpotlights.push({ pivot, baseAngle: idx * 1.4, speed: spd });
  });

  addBox(152.5, 168.5, 0.0, 1.15, -72.8, -69.5, tableTopMat);
  addBox(152.4, 168.6, 1.05, 1.16, -69.55, -69.42, cyanNeonMat);
  addBox(152.6, 168.4, 1.2, 3.8, -73.35, -73.0, darkChromeMat);
  [1.9, 2.7].forEach((sy) => {
    addBox(153.2, 167.8, sy, sy + 0.06, -72.95, -72.65, goldMascotMat);
  });

  addBox(164.0, 174.6, f2Y - 0.22, f2Y, -73.6, -44.6, tableTopMat);
  addBox(153.5, 164.0, f2Y - 0.22, f2Y, -73.6, -65.5, tableTopMat);
  addBox(153.5, 164.0, f2Y - 0.22, f2Y, -52.5, -44.6, tableTopMat);

  const addF2GlassRail = (x0: number, x1: number, z0: number, z1: number) => {
    addBox(x0, x1, f2Y, f2Y + 0.98, z0, z1, glassDoorMat);
    addBox(x0, x1, f2Y + 0.98, f2Y + 1.08, z0 - 0.04, z1 + 0.04, whiteLedMat);
  };
  addF2GlassRail(163.88, 164.08, -69.5, -48.1);
  addF2GlassRail(153.5, 164.0, -65.65, -65.45);
  addF2GlassRail(153.5, 164.0, -52.55, -52.35);
  addF2GlassRail(153.5, 153.7, -73.6, -65.5);
  addF2GlassRail(153.5, 153.7, -52.5, -44.6);

  const stairSteps = 14;
  for (let i = 0; i < stairSteps; i++) {
    const t0 = i / stairSteps;
    const t1 = (i + 1) / stairSteps;
    const sx0 = 158.0 + t0 * 6.0;
    const sx1 = 158.0 + t1 * 6.0;
    const sy = t1 * f2Y;
    addBox(sx0, sx1, sy - 0.14, sy, -48.0, -45.0, graniteStepMat);
    addBox(sx0, sx0 + 0.05, sy - 0.02, sy + 0.01, -47.9, -45.1, hotMagentaTipMat);
  }
  addBox(158.0, 164.0, 0.0, f2Y + 0.9, -48.2, -48.0, darkChromeMat);

  const addVipBooth = (tx: number, tz: number, baseY = 0) => {
    const g = new THREE.Group();
    g.position.set(tx, baseY, tz);

    const table = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.95), tableTopMat);
    table.position.y = 0.68;
    g.add(table);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.39, 0.04, 0.99), cyanNeonMat);
    rim.position.y = 0.66;
    g.add(rim);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.20, 0.66, 8), darkChromeMat);
    leg.position.y = 0.33;
    g.add(leg);

    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.24, 10), whiteLedMat);
    bucket.position.set(0, 0.84, 0);
    g.add(bucket);

    [-0.78, 0.78].forEach((sz) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.46), sofaVelvetMat);
      seat.position.set(0, 0.21, sz);
      g.add(seat);
    });

    staticGroup.add(g);
  };

  [
    [168.5, -65.8],
    [168.5, -52.6],
    [162.5, -67.0],
    [162.5, -51.6],
    [156.5, -67.0],
    [156.5, -51.6],
    [169.5, -48.0],
    [151.0, -48.5],
  ].forEach(([tx, tz]) => addVipBooth(tx, tz, 0));

  [
    [169.5, -69.5],
    [169.5, -62.5],
    [169.5, -55.5],
    [169.5, -48.5],
    [158.5, -69.6],
  ].forEach(([tx, tz]) => addVipBooth(tx, tz, f2Y));

  // =========================================================================
  // 5. POINT LIGHTING RIG + AUTOMATIC SLIDING DOORS + ANIMATED MATRIX LOOP
  // =========================================================================
  const registerLight = (
    color: number,
    x: number,
    y: number,
    z: number,
    dist: number,
    dayInt: number,
    nightInt: number
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 1.3);
    l.position.set(x, y, z);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => 1.0,
    });
  };

  registerLight(0xffffff, 177.8, 6.2, -59.1, 36, 5, 25); // Main NEW DTV White/Gold Facade Wash
  registerLight(0xd946ef, 177.4, 2.8, -54.0, 22, 3, 18); // Left Electric Magenta Blossom Glow
  registerLight(0xd946ef, 177.4, 2.8, -64.2, 22, 3, 18); // Right Electric Magenta Blossom Glow
  registerLight(0x2563eb, 176.2, 3.2, -70.0, 20, 3, 16); // Right Patio Royal Blue Cove Wash
  registerLight(0xf43f5e, 156.5, 5.2, -59.0, 32, 4, 22); // Main Dancefloor Stage Red/Pink
  registerLight(0x06b6d4, 164.0, 3.2, -68.0, 22, 3, 14); // North Onyx Bar Cyan Glow
  registerLight(0xa855f7, 168.5, 7.2, -59.0, 26, 3, 16); // Floor 2 VIP Mezzanine Purple Glow

  let closedFactor = 0.0;
  let animClock = 0;
  let matrixStepClock = 0;
  let doorSlide = 0;

  for (let i = 0; i < scaledLights.length; i++) {
    const minKeep = i < 4 ? 0.14 : 0.04;
    scaledLights[i].getScale = () => Math.max(minKeep, 1.0 - closedFactor);
  }

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: NewDtvNpcController | null,
    playerPos?: THREE.Vector3
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isNewDtvOpenAtHour(rawHour);
    const targetClosed = isOpen ? 0.0 : 1.0;
    closedFactor = dt > 0 ? THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 3.5)) : targetClosed;
    setShutterProgress(newDtvShutter, closedFactor);

    const openScale = 1.0 - closedFactor;
    animClock += dt * openScale;
    matrixStepClock += dt;

    if (matrixStepClock >= 0.055 && openScale > 0.05) {
      matrixStepClock = 0;
      matrixDrawer.redraw(animClock);
      leftScreenDrawer.redraw(animClock);
    }

    for (let i = 0; i < sweepSpotlights.length; i++) {
      const s = sweepSpotlights[i];
      s.pivot.rotation.z = Math.sin(animClock * s.speed + s.baseAngle) * 0.42;
      s.pivot.rotation.x = Math.cos(animClock * s.speed * 0.7 + s.baseAngle) * 0.34;
    }

    let nearDoor = false;
    if (playerPos) {
      const d = Math.hypot(playerPos.x - 174.85, playerPos.z - -59.1);
      if (d < 4.6) nearDoor = true;
    }
    const targetSlide = isOpen && nearDoor ? 1.0 : 0.0;
    doorSlide = THREE.MathUtils.lerp(doorSlide, targetSlide, Math.min(1, dt * 6.5));
    doorLeftGroup.position.z = -58.15 + doorSlide * 1.35;
    doorRightGroup.position.z = -60.05 - doorSlide * 1.35;

    whiteLedMat.emissiveIntensity = (1.25 + lampFactor * 0.8) * Math.max(0.18, openScale);
    pinkBlossomMat.emissiveIntensity = (1.10 + lampFactor * 0.85) * openScale;
    hotMagentaTipMat.emissiveIntensity = (1.25 + lampFactor * 0.90) * openScale;
    goldMascotMat.emissiveIntensity = (1.10 + lampFactor * 0.75) * openScale;
    redNeonMat.emissiveIntensity = (1.05 + lampFactor * 0.8) * openScale;
    cyanNeonMat.emissiveIntensity = (1.05 + lampFactor * 0.8) * openScale;
    matrixMat.emissiveIntensity = (0.95 + lampFactor * 0.65) * Math.max(0.12, openScale);
    leftScreenMat.emissiveIntensity = (0.85 + lampFactor * 0.45) * openScale;
    heroLogoMat.emissiveIntensity = (0.92 + lampFactor * 0.38) * Math.max(0.24, openScale);
    dtvPoolMat.opacity = 0.52 * lampFactor * openScale;
    magentaSplashMat.opacity = 0.65 * lampFactor * openScale;
    beamMat.opacity = (0.10 + lampFactor * 0.14) * openScale;

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
// LIVE NPCS (26 NPCS): FRONT PROMENADE HOSTS, DJ, BARTENDERS,
// DANCERS, VIP SEATED GUESTS & WAITSTAFF
// =========================================================================

interface NewDtvNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  role: 'host' | 'dj' | 'dancer' | 'seated' | 'walk';
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  idleYaw?: number;
  seated?: boolean;
  exitPath: THREE.Vector3[];
  exitWp: { idx: number };
  glbHandle: GlbHumanHandle;
}

function buildNewDtvCharacterMesh(
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
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.55 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });

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
    leftArm.rotation.x = -0.35;
    rightArm.rotation.x = -0.35;
  }

  return { group: grp, hips, leftArm, rightArm, leftLeg, rightLeg };
}

export class NewDtvNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: NewDtvNpcActor[] = [];
  private wasOpen = true;
  private fullyCleared = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const f2Y = NEW_DTV_FLOOR2_Y;
    const specs: Array<{
      role: 'host' | 'dj' | 'dancer' | 'seated' | 'walk';
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      seated?: boolean;
      speed?: number;
    }> = [
      // 1. TWO PROMENADE HOSTS + DJ ON STAGE + TWO BARTENDERS
      { role: 'host', shirt: 0x09090b, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(177.8, 0.02, -55.2)], idleYaw: Math.PI / 2 },
      { role: 'host', shirt: 0x09090b, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(177.8, 0.02, -62.8)], idleYaw: Math.PI / 2 },
      { role: 'dj', shirt: 0xec4899, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(150.4, 0.74, -59.0)], idleYaw: Math.PI / 2 },
      { role: 'host', shirt: 0xf8fafc, pants: 0x09090b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(156.5, 0.02, -71.5)], idleYaw: 0 },
      { role: 'host', shirt: 0xf8fafc, pants: 0x09090b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(164.0, 0.02, -71.5)], idleYaw: 0 },

      // 2. FIVE ENERGETIC CLUB DANCERS ON FLOOR 1 DANCEFLOOR
      { role: 'dancer', shirt: 0x22d3ee, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(156.0, 0.02, -59.0)], idleYaw: -Math.PI / 2 },
      { role: 'dancer', shirt: 0xf43f5e, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(158.0, 0.02, -61.8)], idleYaw: -Math.PI / 2 },
      { role: 'dancer', shirt: 0xfacc15, pants: 0x09090b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(158.2, 0.02, -56.2)], idleYaw: -Math.PI / 2 },
      { role: 'dancer', shirt: 0xa855f7, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(160.8, 0.02, -60.5)], idleYaw: -Math.PI / 2 },
      { role: 'dancer', shirt: 0x4ade80, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(160.8, 0.02, -57.4)], idleYaw: -Math.PI / 2 },

      // 3. TWELVE SEATED VIP GUESTS (FLOOR 1 BOOTHS + FLOOR 2 SKY GALLERY)
      { role: 'seated', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(168.5, 0.02, -66.58)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xf472b6, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(168.5, 0.02, -65.02)], idleYaw: Math.PI, seated: true },
      { role: 'seated', shirt: 0xf59e0b, pants: 0x1e293b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(168.5, 0.02, -53.38)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0x4ade80, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(162.5, 0.02, -67.78)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xe879f9, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(162.5, 0.02, -50.82)], idleYaw: Math.PI, seated: true },
      { role: 'seated', shirt: 0xef4444, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(156.5, 0.02, -67.78)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xfacc15, pants: 0x1e293b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(156.5, 0.02, -50.82)], idleYaw: Math.PI, seated: true },
      { role: 'seated', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(169.5, f2Y + 0.02, -70.28)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xf43f5e, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(169.5, f2Y + 0.02, -61.72)], idleYaw: Math.PI, seated: true },
      { role: 'seated', shirt: 0x4ade80, pants: 0x1e293b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(169.5, f2Y + 0.02, -56.28)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xfbbf24, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(169.5, f2Y + 0.02, -47.72)], idleYaw: Math.PI, seated: true },
      { role: 'seated', shirt: 0xa855f7, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(158.5, f2Y + 0.02, -68.82)], idleYaw: Math.PI, seated: true },

      // 4. FOUR WALKING PATRONS & VIP SERVERS (OUTDOOR PATIO, FOYER, STAIRS & FLOOR 2)
      {
        role: 'walk',
        shirt: 0xf8fafc,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(172.0, 0.02, -59.1),
          new THREE.Vector3(166.0, 0.02, -59.1),
          new THREE.Vector3(166.0, 0.02, -67.5),
          new THREE.Vector3(172.0, 0.02, -67.5),
        ],
        speed: 1.42,
      },
      {
        role: 'walk',
        shirt: 0xec4899,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(155.5, 0.02, -46.5),
          new THREE.Vector3(158.0, 0.02, -46.5),
          new THREE.Vector3(164.0, f2Y + 0.02, -46.5),
          new THREE.Vector3(165.8, f2Y + 0.02, -60.0),
          new THREE.Vector3(164.0, f2Y + 0.02, -46.5),
          new THREE.Vector3(158.0, 0.02, -46.5),
        ],
        speed: 1.35,
      },
      {
        role: 'walk',
        shirt: 0x38bdf8,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(177.5, 0.02, -72.0),
          new THREE.Vector3(178.4, 0.02, -66.0),
          new THREE.Vector3(178.4, 0.02, -50.0),
          new THREE.Vector3(177.5, 0.02, -50.0),
          new THREE.Vector3(178.4, 0.02, -66.0),
        ],
        speed: 1.25,
      },
      {
        role: 'walk',
        shirt: 0xfacc15,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(165.5, f2Y + 0.02, -52.0),
          new THREE.Vector3(165.5, f2Y + 0.02, -68.0),
          new THREE.Vector3(156.5, f2Y + 0.02, -68.0),
          new THREE.Vector3(165.5, f2Y + 0.02, -68.0),
        ],
        speed: 1.32,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildNewDtvCharacterMesh(helpers, s.shirt, s.pants, s.skin, s.hair, !!s.seated);
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const spec =
        s.role === 'host'
          ? CASHIER_NPC_MODEL
          : s.seated
          ? pickSeatedCivilianModel(idx * 3 + 2)
          : s.role === 'walk'
          ? pickOutsideNpcModel(idx * 5 + 1)
          : pickStationaryCivilianModel(idx * 3 + 2);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: built.group,
        fallbackMeshes: [built.hips],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: s.seated
          ? 'Sit'
          : s.role === 'dancer' || s.role === 'dj'
          ? 'Wave'
          : s.waypoints.length > 1
          ? 'Walk'
          : 'Idle',
        phaseOffset: idx * 0.85,
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
        speed: s.speed ?? 1.35,
        walkPhase: idx * 0.72,
        idleYaw: s.idleYaw,
        seated: s.seated,
        exitPath: [new THREE.Vector3(176.0, 0.02, -59.1), new THREE.Vector3(183.0, 0.02, -59.1)],
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
    const isOpen = isNewDtvOpenAtHour(rawHour);

    if (isOpen && !this.wasOpen) {
      this.fullyCleared = false;
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        a.exitWp.idx = 0;
        a.wpIdx = a.waypoints.length > 1 ? 1 : 0;
        a.group.position.copy(a.waypoints[0]);
        a.group.visible = true;
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        a.hips.position.y = a.seated ? -0.26 : 0;
        if (a.seated) {
          a.leftLeg.rotation.x = -Math.PI / 2;
          a.rightLeg.rotation.x = -Math.PI / 2;
        }
        a.glbHandle.setAnimState(
          a.seated ? 'Sit' : a.role === 'dancer' || a.role === 'dj' ? 'Wave' : a.waypoints.length > 1 ? 'Walk' : 'Idle'
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
        const done = advanceNpcExitPath(a.group, a.exitPath, a.exitWp, 2.1, dt);
        if (done) {
          a.group.visible = false;
        } else {
          allHidden = false;
          a.walkPhase += dt * 5.8;
          const swing = Math.sin(a.walkPhase) * 0.4;
          a.leftArm.rotation.x = swing;
          a.rightArm.rotation.x = -swing;
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
        a.glbHandle.setAnimState(a.seated ? 'Sit' : a.role === 'dancer' || a.role === 'dj' ? 'Wave' : 'Idle');
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        if (a.role === 'dancer' || a.role === 'dj') {
          a.walkPhase += dt * (a.role === 'dj' ? 7.2 : 6.4);
          const groove = Math.sin(a.walkPhase);
          a.hips.position.y = Math.abs(groove) * 0.08;
          a.leftArm.rotation.x = -1.1 + groove * 0.7;
          a.rightArm.rotation.x = -1.1 - groove * 0.7;
          a.leftArm.rotation.z = -0.35 + Math.cos(a.walkPhase * 0.5) * 0.25;
          a.rightArm.rotation.z = 0.35 - Math.cos(a.walkPhase * 0.5) * 0.25;
          a.group.rotation.y = (a.idleYaw ?? 0) + Math.sin(a.walkPhase * 0.45) * 0.32;
        } else if (a.seated) {
          a.walkPhase += dt * 2.2;
          const toast = Math.max(0, Math.sin(a.walkPhase + i));
          a.rightArm.rotation.x = -0.35 - toast * 0.85;
        } else {
          a.walkPhase += dt * 2.2;
          a.group.rotation.y = (a.idleYaw ?? Math.PI / 2) + Math.sin(a.walkPhase * 0.55 + i) * 0.16;
          a.hips.position.y = Math.sin(a.walkPhase) * 0.012;
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
        a.rightArm.rotation.x = -swing;
        a.leftLeg.rotation.x = -swing * 1.15;
        a.rightLeg.rotation.x = swing * 1.15;
        a.hips.position.y = Math.abs(Math.sin(a.walkPhase)) * 0.03;
      }
    }
  }
}
