import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  ADULT_NPC_MODELS,
  CASHIER_NPC_MODEL,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isTheGangOpenAtHour,
  setShutterProgress,
} from './VenueOperatingHours';

export const THE_GANG_FLOOR2_Y = 4.60;

export function isPlayerInTheGangZone(x: number, z: number): boolean {
  return x >= 147.0 && x <= 180.2 && z >= -104.2 && z <= -74.2;
}

export interface TheGangBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: TheGangNpcController | null
  ) => void;
  getClosedFactor: () => number;
}

// =========================================================================
// COLLIDERS: THE GANG — FOOD & MUSIC (X = 147.0..180.0, Z = -104.0..-74.2)
// Grand Monumental Cyan-Step G-Portal Opening at Z = -92.1..-86.1 (Floor 1 open!)
// =========================================================================
export const THE_GANG_COLLIDERS: IntersectionColliderBox[] = [
  // Outer Rear & Side Perimeter Walls (Floor 1 & 2, with North Riverside Gate OPEN at X = 168.9..173.5!)
  { minX: 147.0, maxX: 148.0, minZ: -104.0, maxZ: -74.2, floor: 'both' }, // West rear stage wall
  { minX: 147.2, maxX: 168.9, minZ: -104.1, maxZ: -103.4, floor: 'both' }, // North wall west of river gate
  { minX: 173.5, maxX: 175.4, minZ: -104.1, maxZ: -103.4, floor: 'both' }, // North wall east of river gate
  { minX: 168.9, maxX: 173.5, minZ: -104.1, maxZ: -103.4, floor: 2 }, // Floor 2 mezzanine edge above river gate
  { minX: 168.1, maxX: 168.9, minZ: -105.0, maxZ: -103.8, floor: 1 }, // River gate west copper jamb
  { minX: 173.5, maxX: 174.3, minZ: -105.0, maxZ: -103.8, floor: 1 }, // River gate east copper jamb
  { minX: 147.2, maxX: 175.4, minZ: -74.7, maxZ: -74.0, floor: 'both' }, // South divider wall next to NewDTV

  // Front Facade Flanking the Monumental G-Gate (Z = -92.1..-86.1 OPEN on Floor 1!)
  { minX: 174.5, maxX: 175.6, minZ: -103.8, maxZ: -92.1, floor: 'both' },
  { minX: 174.5, maxX: 175.6, minZ: -86.1, maxZ: -74.4, floor: 'both' },
  { minX: 174.5, maxX: 175.6, minZ: -92.1, maxZ: -86.1, floor: 2 },

  // Monumental Center Gate Outer Bronze & White Side Jambs (framing the cyan steps cleanly)
  { minX: 175.2, maxX: 177.2, minZ: -93.4, maxZ: -92.1, floor: 1 },
  { minX: 175.2, maxX: 177.2, minZ: -86.1, maxZ: -84.8, floor: 1 },

  // Front Promenade Parked Platinum-Silver Hypercars (flanking left & right corners)
  { minX: 176.6, maxX: 179.5, minZ: -99.6, maxZ: -94.5, floor: 1 },
  { minX: 176.6, maxX: 179.5, minZ: -83.7, maxZ: -78.6, floor: 1 },

  // West Live Concert Stage & DJ Booth (X = 148.0..153.2, Z = -95.2..-83.0)
  { minX: 148.0, maxX: 153.2, minZ: -95.2, maxZ: -83.0, floor: 1 },

  // North Long Craft-Beer & BBQ Kitchen Bar (X = 152.5..166.5, Z = -103.2..-99.2)
  { minX: 152.5, maxX: 166.5, minZ: -103.2, maxZ: -99.2, floor: 1 },

  // Indoor Architectural Foyer Trees & Glowing Columns
  { minX: 168.4, maxX: 169.4, minZ: -95.1, maxZ: -94.1, floor: 1 },
  { minX: 168.4, maxX: 169.4, minZ: -84.1, maxZ: -83.1, floor: 1 },

  // Floor 1 Quán Nhậu & Beer-Club Tables (10 tables)
  ...[
    [167.4, -97.6],
    [169.2, -79.4],
    [164.0, -94.4],
    [164.0, -89.1],
    [164.0, -83.8],
    [158.0, -94.4],
    [158.0, -89.1],
    [158.0, -83.8],
    [155.0, -79.2],
    [169.8, -76.2],
  ].map(([tx, tz]) => ({
    minX: tx - 1.0,
    maxX: tx + 1.0,
    minZ: tz - 0.9,
    maxZ: tz + 0.9,
    floor: 1 as const,
  })),

  // Interior Staircase North Safety Rail (X = 158.0..164.0, Z = -78.35..-78.0, West foot X=158.0 open)
  { minX: 158.0, maxX: 164.0, minZ: -78.35, maxZ: -78.0, floor: 'both' },

  // Floor 2 Mezzanine Glass Balustrades overlooking Stage & Cyan UFO Chandeliers
  { minX: 163.75, maxX: 164.25, minZ: -99.5, maxZ: -78.1, floor: 2 },
  { minX: 153.5, maxX: 164.0, minZ: -95.8, maxZ: -95.4, floor: 2 },
  { minX: 153.5, maxX: 164.0, minZ: -82.6, maxZ: -82.2, floor: 2 },
  { minX: 153.4, maxX: 153.8, minZ: -103.6, maxZ: -95.4, floor: 2 },
  { minX: 153.4, maxX: 153.8, minZ: -82.6, maxZ: -74.6, floor: 2 },

  // Floor 2 Sky-Mezzanine Quán Nhậu Tables (4 tables)
  ...[
    [169.5, -99.2],
    [169.5, -92.2],
    [169.5, -85.6],
    [169.5, -78.6],
  ].map(([tx, tz]) => ({
    minX: tx - 1.0,
    maxX: tx + 1.0,
    minZ: tz - 0.9,
    maxZ: tz + 0.9,
    floor: 2 as const,
  })),
];

/**
 * Purple-Navy Diamond-Mesh Portal Grille + Vintage Broadway Bulb Marquee ("THE GANG" & "FOOD & MUSIC")
 */
function createPortalMarqueeTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 600;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#170d38');
  bg.addColorStop(0.55, '#2b125a');
  bg.addColorStop(1, '#120929');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Fine violet metallic diamond lattice grille
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.30)';
  ctx.lineWidth = 2.0;
  const step = 24;
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h * 0.85, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h * 0.85, 0);
    ctx.stroke();
  }

  const drawMarqueeText = (
    text: string,
    centerY: number,
    fontPx: number,
    fillHex: string,
    glowHex: string,
    bulbDensity: number
  ) => {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fontPx}px Georgia, "Times New Roman", serif`;

    ctx.lineWidth = 14;
    ctx.strokeStyle = '#3b0712';
    ctx.strokeText(text, w * 0.5, centerY);

    ctx.shadowColor = glowHex;
    ctx.shadowBlur = 22;
    ctx.fillStyle = fillHex;
    ctx.fillText(text, w * 0.5, centerY);
    ctx.shadowBlur = 0;

    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d')!;
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.font = `900 ${fontPx}px Georgia, "Times New Roman", serif`;
    tctx.fillStyle = '#ffffff';
    tctx.fillText(text, w * 0.5, centerY);
    const data = tctx.getImageData(0, 0, w, h).data;

    for (let py = centerY - fontPx * 0.65; py <= centerY + fontPx * 0.65; py += bulbDensity) {
      const iy = Math.round(py);
      if (iy < 0 || iy >= h) continue;
      for (let px = 40; px < w - 40; px += bulbDensity) {
        const ix = Math.round(px);
        const alpha = data[(iy * w + ix) * 4 + 3];
        if (alpha > 175) {
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(ix, iy, 3.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ix, iy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  drawMarqueeText('THE GANG', 165, 138, '#dc2626', '#f97316', 14);
  drawMarqueeText('FOOD & MUSIC', 340, 102, '#ea580c', '#fbbf24', 12);

  // Signature icy-cyan sub-line "FOOD & MUSIC" right below the red/gold marquee
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 52px system-ui, -apple-system, sans-serif';
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('FOOD & MUSIC', w * 0.5, 472);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#cffafe';
  ctx.fillText('FOOD & MUSIC', w * 0.5, 472);

  ctx.font = '700 25px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('BEER CLUB  •  QUÁN NHẬU  •  LIVE STAGE', w * 0.5, 548);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Unobstructed Outer Wing Multi-Color Neon Sign ("THE GANG • FOOD & MUSIC")
 */
function createSideWingSignTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '900 84px Georgia, serif';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('THE', w * 0.5, 96);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('GANG', w * 0.5, 190);

  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 16;
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('FOOD & MUSIC', w * 0.5, 292);

  ctx.shadowBlur = 0;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillStyle = '#f472b6';
  ctx.fillText('QUÁN NHẬU • BEER CLUB', w * 0.5, 344);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Bespoke Sleek Architectural Sign for THE GANG North Riverside Upper Wall
 */
function createRiverFacadeLogoTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 360;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b101b');
  bg.addColorStop(0.5, '#131b2c');
  bg.addColorStop(1, '#080c14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical architectural flute lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let x = 20; x < w; x += 24) {
    ctx.fillRect(x, 0, 6, h);
  }

  // Outer copper border + inner cyan hairline
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Main bold title
  ctx.font = '900 124px Georgia, "Times New Roman", serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#090d16';
  ctx.strokeText('THE GANG', w * 0.5, 132);
  ctx.shadowColor = 'rgba(245, 158, 11, 0.55)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('THE GANG', w * 0.5, 132);
  ctx.shadowBlur = 0;

  // Copper divider line
  ctx.fillStyle = '#d97706';
  ctx.fillRect(w * 0.5 - 240, 214, 480, 3);

  // Clean subtitle (single line, no duplicate text!)
  ctx.font = '800 38px system-ui, -apple-system, sans-serif';
  ctx.shadowColor = 'rgba(34, 211, 238, 0.45)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('RIVERSIDE  •  FOOD & MUSIC', w * 0.5, 260);
  ctx.shadowBlur = 0;

  ctx.font = '700 21px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('LIVE CONCERT  •  CRAFT BEER  •  SÔNG HÀN', w * 0.5, 312);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Architectural Column Uplight Texture (Amber Gold + Magenta + Violet gradient)
 */
function createColumnUplightTex(tintBottom: string, tintMid: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, tintBottom);
  g.addColorStop(0.58, tintMid);
  g.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 4; x < 64; x += 12) {
    ctx.fillRect(x, 0, 3, 256);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Animated Huge Concert LED Backdrop at West End
 */
function createConcertBackdropDrawer() {
  const w = 1024;
  const h = 448;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const redraw = (t: number) => {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.5, w * 0.62);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.35, '#bae6fd');
    grad.addColorStop(0.7, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    for (let i = 0; i < 9; i++) {
      const phase = t * 1.4 + i * 0.75;
      const sx = w * (0.1 + ((i / 8) * 0.8 + Math.sin(phase) * 0.04));
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.34)' : 'rgba(56,189,248,0.28)';
      ctx.beginPath();
      ctx.moveTo(sx - 40, h);
      ctx.lineTo(sx + 65 + Math.cos(phase) * 35, 0);
      ctx.lineTo(sx + 115 + Math.cos(phase) * 35, 0);
      ctx.lineTo(sx + 25, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#090d16';
    ctx.font = '900 106px Georgia, serif';
    ctx.fillText('THE GANG', w * 0.5 + 4, h * 0.44 + 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('THE GANG', w * 0.5, h * 0.44);

    ctx.fillStyle = '#0284c7';
    ctx.font = '800 38px system-ui, sans-serif';
    ctx.fillText('FOOD & MUSIC  •  LIVE CONCERT', w * 0.5, h * 0.72);

    for (let b = 0; b < 32; b++) {
      const barH = 14 + Math.abs(Math.sin(t * 4.2 + b * 0.52)) * 36;
      ctx.fillStyle = b % 2 === 0 ? '#22d3ee' : '#f8fafc';
      ctx.fillRect(96 + b * 26, h - barH - 8, 18, barH);
    }

    tex.needsUpdate = true;
  };

  redraw(0);
  return { tex, redraw };
}

function createRadialFloorGlowTex(innerHex: string, outerHex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  g.addColorStop(0, innerHex);
  g.addColorStop(0.45, outerHex);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Helper: Builds a monolithic 3D extruded shape in screen coordinates (u = camera right/left along Z, v = Y up),
 * centered along extrusion axis and rotated +90deg around Y so it sits across Z!
 * Result mapping: sx -> -(z - centerZ), sy -> y.
 */
function createScreenSpaceExtrudedMesh(
  shape: THREE.Shape,
  depth: number,
  bevelSize: number,
  mat: THREE.Material,
  centerX: number,
  centerZ: number
): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(centerX, 0, centerZ);
  return mesh;
}

/**
 * Helper: Builds a monolithic 3D extruded portal shape facing North (-Z) along the X-Y plane,
 * rotated PI around Y so screen-right when looking from the Han River road matches +X shape coords!
 */
function createNorthFaceExtrudedMesh(
  shape: THREE.Shape,
  depth: number,
  bevelSize: number,
  mat: THREE.Material,
  centerX: number,
  centerZ: number
): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.rotateY(Math.PI);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(centerX, 0, centerZ);
  return mesh;
}

export function createTheGangStructure(): TheGangBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Core Architectural PBR Materials
  const darkSlateFloorMat = new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.42, metalness: 0.25 });
  const polishedConcreteMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.34, metalness: 0.2 });
  const graniteApronMat = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.4, metalness: 0.15 });
  const darkWallMat = new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.72, metalness: 0.22 });
  const brushedBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xc2651a,
    emissive: 0x451a03,
    emissiveIntensity: 0.22,
    roughness: 0.26,
    metalness: 0.78,
  });
  const warmCopperTrimMat = new THREE.MeshStandardMaterial({
    color: 0xe68a2e,
    emissive: 0x78350f,
    emissiveIntensity: 0.24,
    roughness: 0.22,
    metalness: 0.80,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.34, metalness: 0.75 });
  const platinumSilverMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x334155,
    emissiveIntensity: 0.42,
    roughness: 0.18,
    metalness: 0.65,
  });
  const chromeRimMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x475569,
    emissiveIntensity: 0.32,
    roughness: 0.12,
    metalness: 0.85,
  });
  const smokyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x082f49,
    roughness: 0.12,
    metalness: 0.4,
    transparent: true,
    opacity: 0.38,
  });
  const canopyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0c4a6e,
    roughness: 0.15,
    metalness: 0.35,
    transparent: true,
    opacity: 0.24,
  });
  const oakWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3419, roughness: 0.68 });
  const leatherBoothMat = new THREE.MeshStandardMaterial({ color: 0x3f1d0b, roughness: 0.62 });

  // Emissive Neon & LED Accents
  const whiteLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.55,
    roughness: 0.14,
  });
  const cyanLedMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.35,
    roughness: 0.18,
  });
  const warmAmberLedMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.15,
    roughness: 0.22,
  });
  const magentaLedMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xd946ef,
    emissiveIntensity: 1.1,
    roughness: 0.22,
  });
  neonMats.push(whiteLedMat, cyanLedMat, warmAmberLedMat, magentaLedMat);

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

  /** Connects two arbitrary 3D endpoints with a rigid rectangular tube bar */
  const addStrutBeam = (
    pA: [number, number, number],
    pB: [number, number, number],
    thick: number,
    depth: number,
    mat: THREE.Material
  ) => {
    const a = new THREE.Vector3(pA[0], pA[1], pA[2]);
    const b = new THREE.Vector3(pB[0], pB[1], pB[2]);
    const len = a.distanceTo(b);
    if (len < 0.04) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(depth, len, thick), mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    staticGroup.add(mesh);
    return mesh;
  };

  const centerZ = -89.1;
  const f2Y = THE_GANG_FLOOR2_Y;

  // =========================================================================
  // 1. FLOOR SLABS, OPEN NIGHT-SKY CONCERT PAVILION ENVELOPE & PERIMETER WALLS
  // =========================================================================
  addBox(147.0, 175.4, -0.24, 0.0, -104.0, -74.2, darkSlateFloorMat);
  addBox(175.4, 180.0, -0.24, 0.0, -104.0, -74.2, graniteApronMat);

  // Rear Concert Hall Acoustic Roof ONLY over West half (X = 147.0..164.0, Y = 10.2)
  // Front half (X = 164.0..175.4) stays OPEN SKY above the Sky-Mezzanine & Side Sawtooth Ribs!
  addBox(147.0, 164.0, 10.2, 10.7, -104.0, -74.2, darkWallMat);

  // Exterior Perimeter Rear & Stepped Side Walls (North wall opens panoramic river-view glass bays + Riverside Gate!)
  addBox(147.0, 147.8, 0.0, 10.5, -104.0, -74.2, darkWallMat); // Rear West stage wall
  addBox(147.2, 149.2, 0.0, 10.5, -104.0, -103.4, darkWallMat); // North-west corner pier
  addBox(149.2, 166.6, 0.0, 0.85, -104.0, -103.4, darkWallMat); // North window knee wall
  addBox(149.2, 164.0, 4.35, 10.5, -104.0, -103.4, darkWallMat); // North upper hall wall above glass
  addBox(166.6, 168.9, 0.0, 4.35, -104.0, -103.4, darkWallMat); // Pier between panoramic glass & river gate
  addBox(164.0, 168.9, 4.35, 5.4, -104.0, -103.4, darkWallMat); // North front fascia above glass
  addBox(173.5, 174.8, 0.0, 5.4, -104.0, -103.4, darkWallMat); // North-east pier next to river gate
  addBox(168.9, 173.5, 4.32, 5.4, -104.0, -103.4, darkWallMat); // Header beam above river gate
  addBox(147.2, 164.0, 0.0, 10.5, -74.7, -74.1, darkWallMat); // South rear divider wall
  addBox(164.0, 174.8, 0.0, 5.4, -74.7, -74.1, darkWallMat);

  // Transparent Front Wing Plinth & Glass Curtain Flanking Center Gate (Z = -92.1..-86.1 OPEN!)
  addBox(174.6, 175.2, 0.0, 0.58, -103.4, -92.2, brushedBronzeMat);
  addBox(174.8, 175.0, 0.58, 5.2, -103.2, -92.2, smokyGlassMat);
  addBox(174.6, 175.2, 0.0, 0.58, -86.0, -74.7, brushedBronzeMat);
  addBox(174.8, 175.0, 0.58, 5.2, -86.0, -74.9, smokyGlassMat);

  // Front Floor Glow Pool beneath Center Gate & Neon Rib Colonnade
  const cyanFloorTex = createRadialFloorGlowTex('rgba(34, 211, 238, 0.46)', 'rgba(6, 182, 212, 0.14)');
  const cyanFloorPoolMat = new THREE.MeshBasicMaterial({
    map: cyanFloorTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(cyanFloorPoolMat);
  const gateFloorGlow = new THREE.Mesh(new THREE.PlaneGeometry(16.0, 15.0), cyanFloorPoolMat);
  gateFloorGlow.rotation.x = -Math.PI / 2;
  gateFloorGlow.position.set(177.2, 0.015, centerZ);
  staticGroup.add(gateFloorGlow);

  // =========================================================================
  // 2. MONUMENTAL SEAMLESS EXTRUDED COPPER TRAPEZOID + WHITE "G"-GATE PORTAL
  // =========================================================================
  // Outer Brushed-Copper Tapered Trapezoid Surround (X = 175.10 .. 176.60)
  const copperOuterShape = new THREE.Shape();
  copperOuterShape.moveTo(-3.65, 0.0);
  copperOuterShape.lineTo(-4.65, 11.0);
  copperOuterShape.lineTo(4.65, 11.0);
  copperOuterShape.lineTo(3.65, 0.0);
  copperOuterShape.lineTo(2.98, 0.0);
  copperOuterShape.lineTo(3.75, 9.85);
  copperOuterShape.lineTo(-3.75, 9.85);
  copperOuterShape.lineTo(-2.98, 0.0);
  copperOuterShape.closePath();

  const copperFrameMesh = createScreenSpaceExtrudedMesh(copperOuterShape, 1.40, 0.05, brushedBronzeMat, 175.85, centerZ);
  staticGroup.add(copperFrameMesh);
  // Subtle warm copper cap highlight strip along very top edge
  addBox(175.08, 176.62, 10.98, 11.14, centerZ - 4.72, centerZ + 4.72, warmCopperTrimMat);

  // Inner Pure-White Illuminated Monumental "G"-Contour Portal (X = 175.30 .. 177.18 — completely proud, ZERO Z-fighting!)
  const whiteGUpperShape = new THREE.Shape();
  whiteGUpperShape.moveTo(-3.12, 0.0);
  whiteGUpperShape.lineTo(-3.84, 9.98);
  whiteGUpperShape.lineTo(3.84, 9.98);
  whiteGUpperShape.lineTo(3.52, 6.25);
  whiteGUpperShape.lineTo(2.88, 6.25);
  whiteGUpperShape.lineTo(3.15, 9.32);
  whiteGUpperShape.lineTo(-3.15, 9.32);
  whiteGUpperShape.lineTo(-2.52, 0.0);
  whiteGUpperShape.closePath();

  const whiteGUpperMesh = createScreenSpaceExtrudedMesh(whiteGUpperShape, 1.80, 0.04, whiteLedMat, 176.24, centerZ);
  staticGroup.add(whiteGUpperMesh);

  // Right Lower "G" Hook Arm (rises from right ground Y=0..4.92 and turns crisp horizontal inward toward center!)
  const whiteGLowerShape = new THREE.Shape();
  whiteGLowerShape.moveTo(2.52, 0.0);
  whiteGLowerShape.lineTo(3.12, 0.0);
  whiteGLowerShape.lineTo(3.40, 4.92);
  whiteGLowerShape.lineTo(2.05, 4.92);
  whiteGLowerShape.lineTo(2.05, 4.26);
  whiteGLowerShape.lineTo(2.78, 4.26);
  whiteGLowerShape.closePath();

  const whiteGLowerMesh = createScreenSpaceExtrudedMesh(whiteGLowerShape, 1.80, 0.04, whiteLedMat, 176.24, centerZ);
  staticGroup.add(whiteGLowerMesh);

  // Upper Portal Indigo Diamond-Mesh Grille + Marquee Lightbox ("THE GANG" & "FOOD & MUSIC")
  // Strictly recessed inside the inner trapezoid bezel (width 5.4m, Y = 5.55..9.25) so corners tuck cleanly!
  const marqueeTex = createPortalMarqueeTex();
  const marqueeMat = new THREE.MeshStandardMaterial({
    map: marqueeTex,
    emissive: 0xffffff,
    emissiveMap: marqueeTex,
    emissiveIntensity: 1.05,
    roughness: 0.25,
  });
  neonMats.push(marqueeMat);
  const marqueeBoard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.7, 5.4), marqueeMat);
  marqueeBoard.position.set(175.65, 7.4, centerZ);
  staticGroup.add(marqueeBoard);

  // Rolling Security Shutter hidden seamlessly behind the center portal when open; drops cleanly during 07:00 - 16:00
  const shutterTex = createRollingShutterTexture({
    title: 'THE GANG — FOOD & MUSIC',
    hoursLabel: 'MỞ CỬA: 16:00 CHIỀU – 07:00 SÁNG',
    accentHex: '#d97706',
    slatDarkHex: '#1e293b',
    slatLightHex: '#475569',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.45, metalness: 0.45 });
  const theGangShutter = createRollingShutterDoor(
    staticGroup,
    {
      id: 'the-gang-gate-shutter',
      axis: 'z',
      pos: 175.25,
      spanCenter: centerZ,
      width: 6.0,
      baseY: 0.0,
      topY: 4.55,
      thickness: 0.14,
    },
    shutterMat,
    darkSteelMat
  );

  // North Riverside Entrance Portal ("Cổng Phía Sông Hàn") — Sculpted Copper Trapezoid + Pure White "G" Arch
  const riverGateX = 171.2;

  const northCopperShape = new THREE.Shape();
  northCopperShape.moveTo(-3.12, 0.0);
  northCopperShape.lineTo(-3.82, 8.55);
  northCopperShape.lineTo(3.82, 8.55);
  northCopperShape.lineTo(3.12, 0.0);
  northCopperShape.lineTo(2.55, 0.0);
  northCopperShape.lineTo(3.05, 7.62);
  northCopperShape.lineTo(-3.05, 7.62);
  northCopperShape.lineTo(-2.55, 0.0);
  northCopperShape.closePath();
  staticGroup.add(createNorthFaceExtrudedMesh(northCopperShape, 0.96, 0.04, brushedBronzeMat, riverGateX, -104.22));
  addBox(riverGateX - 3.88, riverGateX + 3.88, 8.52, 8.68, -104.74, -103.70, warmCopperTrimMat);

  // Inner Pure-White Illuminated "G"-Contour Portal framing the 4.6m Riverside Doorway cleanly
  const northWhiteGUpper = new THREE.Shape();
  northWhiteGUpper.moveTo(-2.65, 0.0);
  northWhiteGUpper.lineTo(-3.15, 7.72);
  northWhiteGUpper.lineTo(3.15, 7.72);
  northWhiteGUpper.lineTo(2.90, 5.10);
  northWhiteGUpper.lineTo(2.38, 5.10);
  northWhiteGUpper.lineTo(2.58, 7.18);
  northWhiteGUpper.lineTo(-2.58, 7.18);
  northWhiteGUpper.lineTo(-2.22, 0.0);
  northWhiteGUpper.closePath();
  staticGroup.add(createNorthFaceExtrudedMesh(northWhiteGUpper, 1.18, 0.03, whiteLedMat, riverGateX, -104.30));

  const northWhiteGLower = new THREE.Shape();
  northWhiteGLower.moveTo(2.22, 0.0);
  northWhiteGLower.lineTo(2.65, 0.0);
  northWhiteGLower.lineTo(2.86, 4.36);
  northWhiteGLower.lineTo(1.75, 4.36);
  northWhiteGLower.lineTo(1.75, 3.88);
  northWhiteGLower.lineTo(2.34, 3.88);
  northWhiteGLower.closePath();
  staticGroup.add(createNorthFaceExtrudedMesh(northWhiteGLower, 1.18, 0.03, whiteLedMat, riverGateX, -104.30));

  // Upper Portal Marquee Lightbox tucked inside the copper/white trapezoid frame
  const riverMarqueeBoard = new THREE.Mesh(new THREE.BoxGeometry(4.65, 2.42, 0.16), marqueeMat);
  riverMarqueeBoard.position.set(riverGateX, 5.90, -104.14);
  riverMarqueeBoard.userData.noMerge = true;
  staticGroup.add(riverMarqueeBoard);

  // 4 Wide Glowing Cyan LED Steps Leading from Bạch Đằng Sidewalk into THE GANG
  for (let s = 0; s < 4; s++) {
    const sz0 = -105.45 + s * 0.42;
    const sz1 = sz0 + 0.46;
    const sy = 0.03 + s * 0.035;
    const xHalf = 2.15 + (3 - s) * 0.12;
    addBox(riverGateX - xHalf, riverGateX + xHalf, 0.0, sy, sz0, sz1, darkSteelMat);
    addBox(riverGateX - xHalf, riverGateX + xHalf, sy - 0.015, sy + 0.012, sz0 - 0.04, sz0 + 0.04, cyanLedMat);
  }

  // Cyan Floor Glow Pool outside North Riverside Gate
  const riverGateFloorGlow = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 7.5), cyanFloorPoolMat);
  riverGateFloorGlow.rotation.x = -Math.PI / 2;
  riverGateFloorGlow.position.set(riverGateX, 0.015, -106.2);
  staticGroup.add(riverGateFloorGlow);

  // Unified North Riverside Facade: Panoramic River-View Glass Gallery + Fluted Steel Fins + Copper Cornice
  addBox(149.2, 166.6, 0.85, 4.35, -103.76, -103.64, smokyGlassMat); // See-through river-view terrace glass
  addBox(149.0, 166.8, 0.78, 0.90, -104.16, -103.52, warmCopperTrimMat); // Lower window sill
  for (let fx = 149.2; fx <= 166.65; fx += 3.48) {
    addBox(fx - 0.11, fx + 0.11, 0.0, 4.45, -104.12, -103.48, darkSteelMat); // Sleek window mullions
  }

  // Continuous Architectural Copper Mid-Fascia & Upper Roofline Cornice unifying the 2-story hall & portal
  addBox(147.2, 167.8, 4.35, 4.82, -104.18, -103.40, brushedBronzeMat);
  addBox(147.2, 167.8, 4.80, 4.92, -104.22, -103.40, warmCopperTrimMat);
  addBox(147.2, 167.8, 4.32, 4.40, -104.20, -103.98, cyanLedMat);
  addBox(174.4, 175.4, 4.35, 4.82, -104.18, -103.40, brushedBronzeMat);
  addBox(174.4, 175.4, 4.80, 4.92, -104.22, -103.40, warmCopperTrimMat);

  // Floor 2 Glass Terrace Balustrade along front wing roof (X = 164.0..167.9)
  addBox(164.0, 167.8, 4.92, 5.72, -103.85, -103.75, smokyGlassMat);
  addBox(164.0, 167.8, 5.70, 5.80, -103.88, -103.72, warmCopperTrimMat);

  // Upper Concert Hall Fluted Charcoal-Steel Architectural Fins & Copper Crown Cornice (X = 147.2..164.0, Y = 4.92..10.55)
  for (let rfx = 147.8; rfx <= 163.6; rfx += 1.55) {
    addBox(rfx - 0.10, rfx + 0.10, 4.92, 10.18, -104.14, -103.96, darkSteelMat);
  }
  addBox(147.0, 164.2, 10.16, 10.56, -104.22, -103.35, brushedBronzeMat);
  addBox(147.0, 164.2, 10.54, 10.68, -104.26, -103.35, warmCopperTrimMat);
  addBox(147.2, 164.0, 10.12, 10.20, -104.24, -104.02, cyanLedMat);

  // Signature Sawtooth White Neon Arches Accenting the Glass Terrace Bays (X = 152.6..167.2, Z = -104.35)
  const riverArchBays = [
    { x0: 167.4, xPeak: 166.9, x1: 165.4, h: 6.85 },
    { x0: 165.4, xPeak: 164.8, x1: 163.2, h: 6.10 },
    { x0: 163.2, xPeak: 162.5, x1: 160.8, h: 5.50 },
    { x0: 160.8, xPeak: 160.0, x1: 158.4, h: 4.95 },
  ];
  for (let i = 0; i < riverArchBays.length; i++) {
    const rb = riverArchBays[i];
    addStrutBeam([rb.x0, 0.88, -104.30], [rb.xPeak, rb.h, -104.30], 0.13, 0.13, darkSteelMat);
    addStrutBeam([rb.xPeak, rb.h, -104.30], [rb.x1, 0.88, -104.30], 0.13, 0.13, darkSteelMat);
    addStrutBeam([rb.x0, 0.88, -104.42], [rb.xPeak, rb.h, -104.42], 0.10, 0.10, whiteLedMat);
    addStrutBeam([rb.xPeak, rb.h, -104.42], [rb.x1, 0.88, -104.42], 0.10, 0.10, whiteLedMat);
  }

  // Bespoke Brushed-Copper Framed Upper Riverfront Crest Sign ("THE GANG • RIVERSIDE")
  const riverWallLogoTex = createRiverFacadeLogoTex();
  const riverWallLogoMat = new THREE.MeshStandardMaterial({
    map: riverWallLogoTex,
    emissive: 0xffffff,
    emissiveMap: riverWallLogoTex,
    emissiveIntensity: 0.78,
    roughness: 0.28,
  });
  neonMats.push(riverWallLogoMat);
  addBox(151.4, 159.6, 6.08, 8.92, -104.26, -103.98, brushedBronzeMat);
  addBox(151.3, 159.7, 8.88, 9.02, -104.30, -103.98, warmCopperTrimMat);
  addBox(151.3, 159.7, 5.98, 6.12, -104.30, -103.98, warmCopperTrimMat);
  const riverWallSign = new THREE.Mesh(new THREE.BoxGeometry(7.8, 2.65, 0.16), riverWallLogoMat);
  riverWallSign.position.set(155.5, 7.50, -104.24);
  riverWallSign.userData.noMerge = true;
  staticGroup.add(riverWallSign);

  const theGangRiverShutter = createRollingShutterDoor(
    staticGroup,
    {
      id: 'the-gang-river-shutter',
      axis: 'x',
      pos: -103.75,
      spanCenter: riverGateX,
      width: 4.6,
      baseY: 0.0,
      topY: 4.30,
      thickness: 0.14,
    },
    shutterMat,
    darkSteelMat
  );

  // 4 Wide Glowing Cyan LED Entrance Steps (walk smoothly right into THE GANG!)
  for (let s = 0; s < 4; s++) {
    const sx0 = 175.0 + (3 - s) * 0.62;
    const sx1 = sx0 + 0.68;
    const sy = 0.03 + s * 0.035;
    const zHalf = 2.65 + (3 - s) * 0.14;
    addBox(sx0, sx1, 0.0, sy, centerZ - zHalf, centerZ + zHalf, darkSteelMat);
    addBox(sx1 - 0.06, sx1 + 0.02, sy - 0.015, sy + 0.012, centerZ - zHalf, centerZ + zHalf, cyanLedMat);
  }

  // =========================================================================
  // 3. CURVED SLENDER SAWTOOTH WHITE NEON ARCHES + CLEAN CORNER NEON SIGNS
  // =========================================================================
  const addJointSphere = (x: number, y: number, z: number, r = 0.095) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), whiteLedMat);
    s.position.set(x, y, z);
    staticGroup.add(s);
  };

  const buildSawtoothWing = (dir: -1 | 1) => {
    // 5 slender zig-zag white neon arches following a graceful outward curved horseshoe arc!
    // Outer 5th bay terminates before corner sign (|z - centerZ| <= 12.1) so corner sign stays 100% unobstructed!
    const bays = [
      { zIn: 4.55, zPeak: 5.15, zOut: 6.50, topH: 11.8, xA: 177.2, xB: 177.45, xC: 177.15 },
      { zIn: 6.50, zPeak: 7.00, zOut: 8.35, topH: 9.2, xA: 177.15, xB: 177.3, xC: 176.9 },
      { zIn: 8.35, zPeak: 8.82, zOut: 10.15, topH: 7.2, xA: 176.9, xB: 177.0, xC: 176.55 },
      { zIn: 10.15, zPeak: 10.55, zOut: 11.85, topH: 5.6, xA: 176.55, xB: 176.6, xC: 176.15 },
      { zIn: 11.85, zPeak: 12.15, zOut: 14.35, topH: 4.3, xA: 176.15, xB: 176.0, xC: 175.45 },
    ];

    for (let i = 0; i < bays.length; i++) {
      const b = bays[i];
      const zA = centerZ + dir * b.zIn;
      const zB = centerZ + dir * b.zPeak;
      const zC = centerZ + dir * b.zOut;

      addStrutBeam([b.xA - 0.14, 0.08, zA], [b.xB - 0.14, b.topH, zB], 0.16, 0.18, darkSteelMat);
      addStrutBeam([b.xB - 0.14, b.topH, zB], [b.xC - 0.14, 0.16, zC], 0.16, 0.18, darkSteelMat);

      addStrutBeam([b.xA, 0.08, zA], [b.xB, b.topH, zB], 0.13, 0.15, whiteLedMat);
      addStrutBeam([b.xB, b.topH, zB], [b.xB, b.topH - 0.06, zB + dir * 0.40], 0.13, 0.15, whiteLedMat);
      addStrutBeam([b.xB, b.topH - 0.06, zB + dir * 0.40], [b.xC, 0.14, zC], 0.13, 0.15, whiteLedMat);
      addJointSphere(b.xB, b.topH, zB);
      addJointSphere(b.xB, b.topH - 0.06, zB + dir * 0.40);

      const baseMidX = (b.xA + b.xC) * 0.5;
      addStrutBeam([b.xA, 0.09, zA], [b.xC, 0.09, zC], 0.15, 0.16, whiteLedMat);
      addBox(baseMidX - 0.12, baseMidX + 0.12, 0.0, 0.08, Math.min(zA, zC), Math.max(zA, zC), darkSteelMat);
    }

    // Dedicated Angled Outer Corner Pylon + Unobstructed "THE GANG • FOOD & MUSIC" Neon Sign!
    const signCenterZ = centerZ + dir * 13.35;
    addBox(174.6, 175.45, 0.0, 4.9, centerZ + dir * 14.4 - 0.25, centerZ + dir * 14.4 + 0.25, darkWallMat);

    const wingSignTex = createSideWingSignTex();
    const wingSignMat = new THREE.MeshStandardMaterial({
      map: wingSignTex,
      emissive: 0xffffff,
      emissiveMap: wingSignTex,
      emissiveIntensity: 1.0,
      roughness: 0.25,
    });
    neonMats.push(wingSignMat);
    const wingBoard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.05, 2.6), wingSignMat);
    wingBoard.position.set(176.62, 1.95, signCenterZ);
    wingBoard.rotation.y = dir * 0.34;
    staticGroup.add(wingBoard);
  };

  buildSawtoothWing(-1);
  buildSawtoothWing(1);

  // =========================================================================
  // 4. FLANKING CURVED BRUSHED-BRONZE VERANDA CANOPIES + DOUBLE-TIER CYAN UFOs
  // =========================================================================
  // Strictly flanking OUTSIDE the central G-gate (Z = -103.6..-93.15 and Z = -85.05..-74.6)
  // NEVER crosses the center portal marquee!
  addBox(171.2, 175.7, 5.25, 5.78, -103.6, -93.15, brushedBronzeMat);
  addBox(175.55, 175.78, 5.30, 5.48, -103.6, -93.15, warmCopperTrimMat);
  addBox(171.2, 175.3, 5.20, 5.28, -103.4, -93.15, canopyGlassMat);

  addBox(171.2, 175.7, 5.25, 5.78, -85.05, -74.6, brushedBronzeMat);
  addBox(175.55, 175.78, 5.30, 5.48, -85.05, -74.6, warmCopperTrimMat);
  addBox(171.2, 175.3, 5.20, 5.28, -85.05, -74.8, canopyGlassMat);

  // Double-Tiered Icy-Cyan UFO Chandeliers (signature Image 2 overhead saucers!)
  const addUfoChandelier = (cx: number, cy: number, cz: number, radius = 1.6) => {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.2, 8), chromeRimMat);
    rod.position.y = 1.6;
    grp.add(rod);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.2, 16), chromeRimMat);
    cap.position.y = 0.42;
    grp.add(cap);

    // Double distinct separated saucer decks
    [
      { r: radius, y: 0.22, h: 0.22 },
      { r: radius * 0.72, y: -0.26, h: 0.20 },
    ].forEach((tier) => {
      const glassBand = new THREE.Mesh(new THREE.CylinderGeometry(tier.r, tier.r * 0.92, tier.h, 24), cyanLedMat);
      glassBand.position.y = tier.y;
      grp.add(glassBand);

      const trimRing = new THREE.Mesh(new THREE.TorusGeometry(tier.r * 0.98, 0.04, 8, 28), whiteLedMat);
      trimRing.rotation.x = Math.PI / 2;
      trimRing.position.y = tier.y + tier.h * 0.5;
      grp.add(trimRing);

      const bottomTrim = new THREE.Mesh(new THREE.TorusGeometry(tier.r * 0.90, 0.035, 8, 24), cyanLedMat);
      bottomTrim.rotation.x = Math.PI / 2;
      bottomTrim.position.y = tier.y - tier.h * 0.5;
      grp.add(bottomTrim);
    });

    const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.34, radius * 0.22, 0.14, 16), whiteLedMat);
    core.position.y = -0.44;
    grp.add(core);

    staticGroup.add(grp);
  };

  addUfoChandelier(172.6, 4.55, centerZ, 1.75);
  addUfoChandelier(172.8, 4.55, centerZ - 6.8, 1.48);
  addUfoChandelier(172.8, 4.55, centerZ + 6.8, 1.48);
  addUfoChandelier(161.2, 8.65, centerZ, 1.9);
  addUfoChandelier(156.2, 8.65, centerZ - 4.4, 1.42);

  // Sunset Amber & Violet/Cyan Uplighted Architectural Columns inside Foyer
  const amberColMat = new THREE.MeshStandardMaterial({
    map: createColumnUplightTex('#fb923c', '#c026d3'),
    emissive: 0xf59e0b,
    emissiveMap: createColumnUplightTex('#f97316', '#9333ea'),
    emissiveIntensity: 0.62,
    roughness: 0.42,
  });
  const cyanVioletColMat = new THREE.MeshStandardMaterial({
    map: createColumnUplightTex('#38bdf8', '#a855f7'),
    emissive: 0x3b82f6,
    emissiveMap: createColumnUplightTex('#06b6d4', '#9333ea'),
    emissiveIntensity: 0.58,
    roughness: 0.42,
  });
  neonMats.push(amberColMat, cyanVioletColMat);

  [
    { x: 167.8, z: -99.8, mat: amberColMat },
    { x: 169.0, z: -94.6, mat: cyanVioletColMat },
    { x: 169.0, z: -83.6, mat: cyanVioletColMat },
    { x: 169.0, z: -78.4, mat: amberColMat },
  ].forEach((c) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 5.2, 14), c.mat);
    col.position.set(c.x, 2.6, c.z);
    staticGroup.add(col);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 0.25, 14), brushedBronzeMat);
    plinth.position.set(c.x, 0.125, c.z);
    staticGroup.add(plinth);
  });

  // Decorative Indoor Foyer Trees flanking entrance vista
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x3f2718, roughness: 0.9 });
  const indoorLeafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });
  const indoorLeafHighlightMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });

  const addIndoorTree = (tx: number, tz: number, hScale = 1.0) => {
    const t = new THREE.Group();
    t.position.set(tx, 0, tz);
    t.scale.setScalar(hScale);

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.48, 12), darkSteelMat);
    pot.position.y = 0.24;
    t.add(pot);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 2.3, 8), barkMat);
    trunk.position.y = 1.4;
    t.add(trunk);

    [
      [0.45, 2.35, 0.2, 0.35],
      [-0.4, 2.55, -0.25, -0.4],
      [0.1, 2.75, 0.42, -0.2],
    ].forEach(([bx, by, bz, rz]) => {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.15, 6), barkMat);
      br.position.set(bx * 0.5, by, bz * 0.5);
      br.rotation.z = rz;
      t.add(br);
    });

    [
      [0.0, 3.25, 0.0, 0.75, indoorLeafMat],
      [0.52, 2.95, 0.28, 0.54, indoorLeafHighlightMat],
      [-0.48, 3.05, -0.32, 0.58, indoorLeafMat],
      [0.12, 3.45, -0.42, 0.48, indoorLeafHighlightMat],
    ].forEach(([cx, cy, cz, r, m]) => {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r as number, 1), m as THREE.Material);
      puff.position.set(cx as number, cy as number, cz as number);
      t.add(puff);
    });

    staticGroup.add(t);
  };

  addIndoorTree(168.9, -94.6, 1.05);
  addIndoorTree(168.9, -83.6, 1.05);

  // =========================================================================
  // 5. TWIN SCULPTED PLATINUM-SILVER HYPERCARS FLANKING FRONT CORNERS
  // =========================================================================
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xbae6fd,
    emissiveIntensity: 1.6,
    roughness: 0.1,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff1e42,
    emissive: 0xf43f5e,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });
  neonMats.push(headlightMat, taillightMat);

  const addHypercar = (hx: number, hz: number, yaw: number, bodyMat: THREE.Material) => {
    const car = new THREE.Group();
    car.position.set(hx, 0, hz);
    car.rotation.y = yaw;

    // Aerodynamic Side-Silhouette Wedge Body via ExtrudeGeometry (along local Z nose -> tail)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-2.15, 0.18); // rear diffuser bottom
    hullShape.lineTo(2.22, 0.14); // front splitter lip
    hullShape.lineTo(2.20, 0.36); // razor nose
    hullShape.lineTo(1.15, 0.62); // front hood deck
    hullShape.lineTo(0.20, 1.04); // windshield apex
    hullShape.lineTo(-1.10, 1.02); // coupe roofline
    hullShape.lineTo(-1.95, 0.74); // fastback louver deck
    hullShape.lineTo(-2.22, 0.60); // rear tail edge
    hullShape.lineTo(-2.22, 0.24);
    hullShape.closePath();

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
      depth: 1.78,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    hullGeo.translate(0, 0, -0.89);
    hullGeo.rotateY(-Math.PI / 2); // maps shape X -> +Z nose
    const hull = new THREE.Mesh(hullGeo, bodyMat);
    car.add(hull);

    // Smoked fighter-jet cockpit greenhouse inset
    const glassShape = new THREE.Shape();
    glassShape.moveTo(-0.85, 0.68);
    glassShape.lineTo(1.05, 0.64);
    glassShape.lineTo(0.18, 1.01);
    glassShape.lineTo(-0.98, 0.99);
    glassShape.closePath();
    const glassGeo = new THREE.ExtrudeGeometry(glassShape, { depth: 1.46, bevelEnabled: false });
    glassGeo.translate(0, 0, -0.73);
    glassGeo.rotateY(-Math.PI / 2);
    const canopy = new THREE.Mesh(glassGeo, smokyGlassMat);
    car.add(canopy);

    // Carbon Rear GT Wing Spoiler
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.06, 0.36), darkSteelMat);
    wing.position.set(0, 0.98, -2.02);
    car.add(wing);
    [-0.55, 0.55].forEach((sx) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.22), darkSteelMat);
      strut.position.set(sx, 0.82, -1.98);
      car.add(strut);
    });

    // Side Platinum Trim Rocker Blades + Rear Haunch Scoops
    [-0.96, 0.96].forEach((sx) => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 2.2), chromeRimMat);
      blade.position.set(sx, 0.28, 0);
      car.add(blade);
    });

    // Four Wheels + Luminous Alloy Rims + Cyan Brake Caliper Glow Rings
    [
      [-0.95, 1.32],
      [0.95, 1.32],
      [-0.95, -1.32],
      [0.95, -1.32],
    ].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.30, 18), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, 0.36, wz);
      car.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 14), chromeRimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.36, wz);
      car.add(rim);
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 16), cyanLedMat);
      glowRing.rotation.y = Math.PI / 2;
      glowRing.position.set(wx + (wx > 0 ? 0.16 : -0.16), 0.36, wz);
      car.add(glowRing);
    });

    // Sharp LED Headlights & Crimson Taillight Bar
    [-0.66, 0.66].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.16), headlightMat);
      hl.position.set(lx, 0.36, 2.18);
      car.add(hl);
    });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.08, 0.08), taillightMat);
    tailBar.position.set(0, 0.54, -2.22);
    car.add(tailBar);

    staticGroup.add(car);
  };

  // Gently angled along the front plaza promenade without intruding on the road or entrance portal
  addHypercar(178.1, centerZ - 8.1, -0.26, platinumSilverMat);
  addHypercar(178.1, centerZ + 8.1, Math.PI + 0.26, platinumSilverMat);

  // =========================================================================
  // 6. WEST LIVE CONCERT STAGE, NORTH BEER BAR, QUÁN NHẬU TABLES & FLOOR 2
  // =========================================================================
  const concertScreen = createConcertBackdropDrawer();
  const stageScreenMat = new THREE.MeshStandardMaterial({
    map: concertScreen.tex,
    emissive: 0xffffff,
    emissiveMap: concertScreen.tex,
    emissiveIntensity: 1.15,
    roughness: 0.22,
  });
  neonMats.push(stageScreenMat);

  addBox(148.0, 153.2, 0.0, 0.72, -95.2, -83.0, darkSteelMat);
  addBox(153.15, 153.3, 0.62, 0.74, -95.2, -83.0, cyanLedMat);
  const backdrop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.2, 11.4), stageScreenMat);
  backdrop.position.set(148.15, 3.65, centerZ);
  staticGroup.add(backdrop);

  addBox(151.1, 152.3, 0.72, 1.72, centerZ - 1.5, centerZ + 1.5, darkSteelMat);
  addBox(152.28, 152.36, 0.85, 1.65, centerZ - 1.45, centerZ + 1.45, cyanLedMat);

  [-5.7, 5.7].forEach((sz) => {
    addBox(148.5, 149.8, 0.72, 4.8, centerZ + sz - 0.65, centerZ + sz + 0.65, darkWallMat);
    addBox(149.76, 149.84, 1.0, 4.5, centerZ + sz - 0.55, centerZ + sz + 0.55, cyanLedMat);
  });

  // Animated Moving Ceiling Concert Spotlights
  const sweepSpotlights: Array<{ pivot: THREE.Group; baseAngle: number; speed: number }> = [];
  const spotBeamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  poolMats.push(spotBeamMat);
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(154.0 + i * 2.2, 9.6, centerZ + (i % 2 === 0 ? -3.4 : 3.4));
    pivot.userData.noMerge = true;
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.75, 9.5, 14, 1, true), spotBeamMat);
    beam.position.y = -4.75;
    pivot.add(beam);
    staticGroup.add(pivot);
    sweepSpotlights.push({ pivot, baseAngle: i * 1.1, speed: 1.4 + i * 0.25 });
  }

  // North Craft-Beer & BBQ Kitchen Bar
  addBox(152.5, 166.5, 0.0, 1.08, -100.3, -99.3, darkSteelMat);
  addBox(152.4, 166.6, 1.08, 1.18, -100.5, -99.2, oakWoodMat);
  addBox(152.5, 166.5, 0.92, 1.02, -99.28, -99.2, warmAmberLedMat);
  addBox(152.5, 166.5, 0.0, 1.32, -103.3, -102.6, brushedBronzeMat);
  addBox(152.5, 166.5, 1.32, 1.44, -103.3, -102.55, warmAmberLedMat);
  for (let rx = 152.8; rx <= 166.2; rx += 3.3) {
    addBox(rx - 0.08, rx + 0.08, 1.44, 3.35, -103.1, -102.8, brushedBronzeMat);
  }
  for (let bx = 154.5; bx <= 164.5; bx += 2.5) {
    addBox(bx - 0.12, bx + 0.12, 1.18, 1.62, -99.85, -99.65, warmCopperTrimMat);
    addBox(bx - 0.35, bx + 0.35, 1.54, 1.66, -99.88, -99.62, warmCopperTrimMat);
  }

  // Floor 2 Sky-Mezzanine Deck (overlooking West stage void; East edge stops at X=171.2 so glass veranda canopy stays clear!)
  addBox(164.0, 171.2, f2Y - 0.24, f2Y, -103.4, -74.8, polishedConcreteMat);
  addBox(153.6, 164.0, f2Y - 0.24, f2Y, -103.4, -95.6, polishedConcreteMat);
  addBox(153.6, 164.0, f2Y - 0.24, f2Y, -82.4, -74.8, polishedConcreteMat);

  const addF2Rail = (x0: number, x1: number, z0: number, z1: number) => {
    addBox(x0, x1, f2Y, f2Y + 0.96, z0, z1, smokyGlassMat);
    addBox(x0 - 0.03, x1 + 0.03, f2Y + 0.94, f2Y + 1.04, z0 - 0.03, z1 + 0.03, warmCopperTrimMat);
  };
  addF2Rail(163.92, 164.12, -95.6, -82.4);
  addF2Rail(171.05, 171.25, -103.4, -74.8);
  addF2Rail(153.6, 164.0, -95.7, -95.5);
  addF2Rail(153.6, 164.0, -82.5, -82.3);
  addF2Rail(153.5, 153.7, -103.4, -95.6);
  addF2Rail(153.5, 153.7, -82.4, -74.8);

  // Interior Staircase (X = 158.0..164.0, Z = -78.1..-75.0, climbing West -> East up to Floor 2)
  const stairSteps = 16;
  for (let i = 0; i < stairSteps; i++) {
    const t0 = i / stairSteps;
    const t1 = (i + 1) / stairSteps;
    const sx0 = 158.0 + t0 * 6.0;
    const sx1 = 158.0 + t1 * 6.0;
    const sy = t1 * f2Y;
    addBox(sx0, sx1, sy - 0.14, sy, -78.1, -75.0, darkSteelMat);
    addBox(sx0, sx0 + 0.05, sy - 0.02, sy + 0.015, -78.0, -75.1, cyanLedMat);
  }
  addBox(158.0, 164.0, 0.0, f2Y + 0.9, -78.3, -78.1, brushedBronzeMat);

  // Quán Nhậu & Beer-Club Tables
  const addQuanNhauTable = (tx: number, tz: number, baseY = 0) => {
    const g = new THREE.Group();
    g.position.set(tx, baseY, tz);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.96), oakWoodMat);
    top.position.y = 0.72;
    g.add(top);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.04, 0.98), darkSteelMat);
    frame.position.y = 0.68;
    g.add(frame);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.68, 8), darkSteelMat);
    ped.position.y = 0.34;
    g.add(ped);

    const beerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.10, 10), darkSteelMat);
    beerBase.position.set(-0.22, 0.80, 0);
    g.add(beerBase);
    const beerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 12), warmAmberLedMat);
    beerCol.position.set(-0.22, 1.06, 0);
    g.add(beerCol);
    const grill = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.08, 12), darkSteelMat);
    grill.position.set(0.28, 0.79, 0);
    g.add(grill);

    [-0.78, 0.78].forEach((sz) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.42, 0.44), leatherBoothMat);
      seat.position.set(0, 0.21, sz);
      g.add(seat);
    });

    staticGroup.add(g);
  };

  // Floor 1 Tables (10)
  [
    [167.4, -97.6],
    [169.2, -79.4],
    [164.0, -94.4],
    [164.0, -89.1],
    [164.0, -83.8],
    [158.0, -94.4],
    [158.0, -89.1],
    [158.0, -83.8],
    [155.0, -79.2],
    [169.8, -76.2],
  ].forEach(([tx, tz]) => addQuanNhauTable(tx, tz, 0));

  // Floor 2 Sky-Mezzanine Tables (4)
  [
    [169.5, -99.2],
    [169.5, -92.2],
    [169.5, -85.6],
    [169.5, -78.6],
  ].forEach(([tx, tz]) => addQuanNhauTable(tx, tz, f2Y));

  // =========================================================================
  // 7. ARCHITECTURAL & STAGE POINT LIGHTING RIG (DIMMED WHEN CLOSED 07:00-16:00)
  // =========================================================================
  let closedFactor = 0.0;

  const registerLight = (
    color: number,
    x: number,
    y: number,
    z: number,
    dist: number,
    dayInt: number,
    nightInt: number,
    minKeep = 0.04
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 1.3);
    l.position.set(x, y, z);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => Math.max(minKeep, 1.0 - closedFactor),
    });
  };

  // Soft balanced architectural lighting positioned clear of the marquee face (no hotspot on text!)
  registerLight(0xe0f2fe, 179.2, 4.2, centerZ, 34, 4, 18, 0.14); // Crisp front plaza & silver hypercar wash
  registerLight(0x22d3ee, 172.6, 4.0, centerZ, 26, 3, 20, 0.05); // Veranda Center Cyan UFO Chandeliers
  registerLight(0xf59e0b, 169.2, 2.8, -98.8, 22, 3, 16, 0.04); // North Wing Amber Column Uplight
  registerLight(0xd946ef, 169.2, 2.8, -79.4, 22, 3, 16, 0.04); // South Wing Violet/Magenta Column Uplight
  registerLight(0xe0f2fe, 152.5, 4.8, centerZ, 34, 4, 24, 0.04); // West Live Concert Stage Icy White/Cyan Wash
  registerLight(0xfb923c, 159.5, 3.0, -100.8, 22, 3, 15, 0.04); // North Craft Beer Bar Amber Wash
  registerLight(0x38bdf8, 167.5, 7.0, centerZ, 24, 2, 14, 0.04); // Floor 2 Sky-Mezzanine Glow
  registerLight(0xe0f2fe, 171.2, 3.8, -106.2, 24, 3, 14, 0.12); // North Riverside Entrance Wash

  let animClock = 0;
  let screenClock = 0;

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: TheGangNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isTheGangOpenAtHour(rawHour);
    const targetClosed = isOpen ? 0.0 : 1.0;
    closedFactor = dt > 0 ? THREE.MathUtils.lerp(closedFactor, targetClosed, Math.min(1, dt * 3.5)) : targetClosed;
    setShutterProgress(theGangShutter, closedFactor);
    setShutterProgress(theGangRiverShutter, closedFactor);

    const openScale = 1.0 - closedFactor;
    animClock += dt * openScale;
    screenClock += dt;

    if (screenClock >= 0.06 && openScale > 0.05) {
      screenClock = 0;
      concertScreen.redraw(animClock);
    }

    for (let i = 0; i < sweepSpotlights.length; i++) {
      const s = sweepSpotlights[i];
      s.pivot.rotation.z = Math.sin(animClock * s.speed + s.baseAngle) * 0.42;
      s.pivot.rotation.x = Math.cos(animClock * s.speed * 0.72 + s.baseAngle) * 0.34;
    }

    whiteLedMat.emissiveIntensity = (1.3 + lampFactor * 0.85) * Math.max(0.14, openScale);
    cyanLedMat.emissiveIntensity = (1.15 + lampFactor * 0.85) * openScale;
    warmAmberLedMat.emissiveIntensity = (1.0 + lampFactor * 0.75) * openScale;
    magentaLedMat.emissiveIntensity = (0.95 + lampFactor * 0.75) * openScale;
    marqueeMat.emissiveIntensity = (0.92 + lampFactor * 0.48) * Math.max(0.18, openScale);
    riverWallLogoMat.emissiveIntensity = (0.65 + lampFactor * 0.35) * Math.max(0.18, openScale);
    stageScreenMat.emissiveIntensity = (0.98 + lampFactor * 0.45) * openScale;
    amberColMat.emissiveIntensity = 0.62 * openScale;
    cyanVioletColMat.emissiveIntensity = 0.58 * openScale;
    headlightMat.emissiveIntensity = 1.6 * Math.max(0.15, openScale);
    taillightMat.emissiveIntensity = 1.4 * Math.max(0.15, openScale);
    cyanFloorPoolMat.opacity = 0.65 * lampFactor * openScale;
    spotBeamMat.opacity = (0.1 + lampFactor * 0.14) * openScale;

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
// LIVE NPCS (28 NPCS): GATE HOSTS, HYPERCAR VIPS, STAGE BAND,
// BARTENDERS, QUÁN NHẬU DINERS (F1 & F2) & WALKING SERVERS
// =========================================================================

interface TheGangNpcActor {
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

function buildTheGangCharacterMesh(
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

export class TheGangNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: TheGangNpcActor[] = [];
  private wasOpen = true;
  private fullyCleared = false;

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const f2Y = THE_GANG_FLOOR2_Y;
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
      // 1. GATE HOSTS & VIPS BY PARKED HYPERCARS (OUTSIDE PORTAL STEPS)
      { role: 'host', shirt: 0x09090b, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(178.4, 0.02, -85.6)], idleYaw: Math.PI / 2 },
      { role: 'host', shirt: 0x09090b, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(178.4, 0.02, -92.6)], idleYaw: Math.PI / 2 },
      { role: 'host', shirt: 0xb45309, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(176.2, 0.02, -78.2)], idleYaw: Math.PI * 0.45 },
      { role: 'host', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fce0c8', hair: 0x27150a, waypoints: [new THREE.Vector3(176.2, 0.02, -100.0)], idleYaw: Math.PI * 0.55 },
      { role: 'host', shirt: 0x09090b, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(168.1, 0.02, -105.5)], idleYaw: Math.PI },

      // 2. STAGE DJ & BARTENDERS (WEST STAGE & NORTH BEER BAR)
      { role: 'dj', shirt: 0xf8fafc, pants: 0x09090b, skin: '#fce0c8', hair: 0x111827, waypoints: [new THREE.Vector3(150.5, 0.74, -89.1)], idleYaw: Math.PI / 2 },
      { role: 'host', shirt: 0xd97706, pants: 0x09090b, skin: '#fbd3b4', hair: 0x18181b, waypoints: [new THREE.Vector3(156.0, 0.02, -101.6)], idleYaw: 0 },
      { role: 'host', shirt: 0xd97706, pants: 0x09090b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(162.5, 0.02, -101.6)], idleYaw: 0 },

      // 3. FIVE ENERGETIC CONCERT FANS GROOVING IN FRONT OF STAGE
      { role: 'dancer', shirt: 0x22d3ee, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(154.5, 0.02, -89.1)], idleYaw: -Math.PI / 2 },
      { role: 'dancer', shirt: 0xf97316, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(155.2, 0.02, -91.4)], idleYaw: -Math.PI / 2 },
      { role: 'dancer', shirt: 0xfacc15, pants: 0x09090b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(155.2, 0.02, -86.8)], idleYaw: -Math.PI / 2 },
      { role: 'dancer', shirt: 0xe879f9, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(156.4, 0.02, -90.4)], idleYaw: -Math.PI / 2 },
      { role: 'dancer', shirt: 0x4ade80, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(156.4, 0.02, -87.8)], idleYaw: -Math.PI / 2 },

      // 4. TWELVE SEATED QUÁN NHẬU GUESTS TOASTING BEER MUGS (FLOOR 1 + FLOOR 2)
      { role: 'seated', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(167.4, 0.02, -98.38)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xf43f5e, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(167.4, 0.02, -96.82)], idleYaw: Math.PI, seated: true },
      { role: 'seated', shirt: 0xf59e0b, pants: 0x1e293b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(169.2, 0.02, -80.18)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0x4ade80, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(164.0, 0.02, -95.18)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xe879f9, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(164.0, 0.02, -89.88)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xef4444, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(164.0, 0.02, -83.02)], idleYaw: Math.PI, seated: true },
      { role: 'seated', shirt: 0xfacc15, pants: 0x1e293b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(158.0, 0.02, -95.18)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0x22d3ee, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(158.0, 0.02, -83.02)], idleYaw: Math.PI, seated: true },
      // Floor 2 Seated Sky-Mezzanine Guests
      { role: 'seated', shirt: 0x38bdf8, pants: 0x09090b, skin: '#fbd3b4', hair: 0x111827, waypoints: [new THREE.Vector3(169.5, f2Y + 0.02, -99.98)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xf43f5e, pants: 0x09090b, skin: '#fce0c8', hair: 0x18181b, waypoints: [new THREE.Vector3(169.5, f2Y + 0.02, -91.42)], idleYaw: Math.PI, seated: true },
      { role: 'seated', shirt: 0x4ade80, pants: 0x1e293b, skin: '#f5c7a3', hair: 0x111827, waypoints: [new THREE.Vector3(169.5, f2Y + 0.02, -86.38)], idleYaw: 0, seated: true },
      { role: 'seated', shirt: 0xfbbf24, pants: 0x09090b, skin: '#fbd3b4', hair: 0x27150a, waypoints: [new THREE.Vector3(169.5, f2Y + 0.02, -77.82)], idleYaw: Math.PI, seated: true },

      // 5. FOUR WALKING SERVERS & PATRONS (FOYER, EXTERIOR COLONNADE, STAIRS & F2 MEZZANINE)
      {
        role: 'walk',
        shirt: 0xf8fafc,
        pants: 0x09090b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(172.0, 0.02, -89.1),
          new THREE.Vector3(166.8, 0.02, -89.1),
          new THREE.Vector3(166.8, 0.02, -97.0),
          new THREE.Vector3(172.0, 0.02, -97.0),
        ],
        speed: 1.38,
      },
      {
        role: 'walk',
        shirt: 0xd97706,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(156.0, 0.02, -76.5),
          new THREE.Vector3(158.0, 0.02, -76.5),
          new THREE.Vector3(164.0, f2Y + 0.02, -76.5),
          new THREE.Vector3(166.0, f2Y + 0.02, -90.0),
          new THREE.Vector3(164.0, f2Y + 0.02, -76.5),
          new THREE.Vector3(158.0, 0.02, -76.5),
        ],
        speed: 1.32,
      },
      {
        role: 'walk',
        shirt: 0x22d3ee,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(179.0, 0.02, -102.0),
          new THREE.Vector3(179.6, 0.02, -89.1),
          new THREE.Vector3(179.0, 0.02, -76.2),
          new THREE.Vector3(179.6, 0.02, -89.1),
        ],
        speed: 1.24,
      },
      {
        role: 'walk',
        shirt: 0xf43f5e,
        pants: 0x09090b,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(165.8, f2Y + 0.02, -82.0),
          new THREE.Vector3(165.8, f2Y + 0.02, -98.0),
          new THREE.Vector3(156.5, f2Y + 0.02, -98.0),
          new THREE.Vector3(165.8, f2Y + 0.02, -98.0),
        ],
        speed: 1.30,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildTheGangCharacterMesh(helpers, s.shirt, s.pants, s.skin, s.hair, !!s.seated);
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const spec =
        s.role === 'host'
          ? CASHIER_NPC_MODEL
          : s.seated
          ? pickSeatedCivilianModel(idx * 3 + 2)
          : s.role === 'walk'
          ? ADULT_NPC_MODELS[idx % ADULT_NPC_MODELS.length]
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
        phaseOffset: idx * 0.72,
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
        exitPath: [new THREE.Vector3(176.2, 0.02, -89.1), new THREE.Vector3(183.0, 0.02, -89.1)],
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
    const isOpen = isTheGangOpenAtHour(rawHour);

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
          a.leftArm.rotation.x = -0.35;
          a.rightArm.rotation.x = -0.35;
        } else {
          a.hips.position.y = 0;
          a.leftLeg.rotation.x = 0;
          a.rightLeg.rotation.x = 0;
          a.leftArm.rotation.x = 0;
          a.rightArm.rotation.x = 0;
          a.leftArm.rotation.z = 0;
          a.rightArm.rotation.z = 0;
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
