import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isLgStoreOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface LgStoreBuildResult {
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
    npcController?: LgStoreNpcController | null
  ) => void;
}

// =========================================================================
// LG FLAGSHIP BRANDSHOP — ĐƯỜNG SƠN TÂY BẮC (BÊN CẠNH APPLE STORE)
// Total Plot: X = 383.8 .. 412.5, Z = -75.0 .. -47.0 (Center Z = -61.0)
//   - Facing West (-X) across Đường Sơn Tây Bắc (immediately North of Apple Store)
//   - Zero-Z-fighting stepped geometry:
//     * Curtain glass & mullions terminate cleanly at Y = 10.22m
//     * Blackened-steel curtain head beam spans Y = 10.22..10.38m
//     * Brushed titanium-silver fascia starts cleanly at Y = 10.42..13.00m
//     * Aqua-cyan "LG OLED TV 4K" Sky Billboard starts cleanly at Y = 13.06..16.56m w/ aqua uplights
//   - Bright Backlit Louvered Ceiling (34 crisp white louvers + linear LEDs + 6 bright floating discs)
//   - 10 Hanging Vertical OLED Color Art Blades + Grand Open South Staircase + Floor 1 & 2 Showrooms
// =========================================================================

export const LG_PODIUM_Y = 0.08;
export const LG_FLOOR_H = 5.0;

const LG_CENTER_Z = -61.0;
const LG_DOOR_X = 388.8;
const LG_DOOR_Z = -61.0;

export const LG_COLLIDERS: IntersectionColliderBox[] = [
  // =========================================================================
  // FLOOR 1 & OUTER ENVELOPE (Y = 0.08m)
  // =========================================================================
  { minX: 411.75, maxX: 412.6, minZ: -75.1, maxZ: -46.9, floor: 'both' }, // East Rear Wall
  { minX: 388.45, maxX: 412.6, minZ: -75.1, maxZ: -74.25, floor: 'both' }, // North Side Wall
  { minX: 388.45, maxX: 412.6, minZ: -47.75, maxZ: -46.9, floor: 'both' }, // South Side Wall

  // West Curtain Wall & Protruding Entrance Portal Jambs (leaves 4.8m doorway Z = -63.4..-58.6 open on F1!)
  { minX: 388.3, maxX: 389.15, minZ: -75.0, maxZ: -63.4, floor: 1 },
  { minX: 388.3, maxX: 389.15, minZ: -58.6, maxZ: -47.0, floor: 1 },
  { minX: 388.3, maxX: 389.15, minZ: -75.0, maxZ: -47.0, floor: 2 }, // Continuous F2 curtain glass
  { minX: 388.05, maxX: 388.85, minZ: -64.45, maxZ: -63.55, floor: 1 }, // Portal North Silver Pier
  { minX: 388.05, maxX: 388.85, minZ: -58.45, maxZ: -57.55, floor: 1 }, // Portal South Silver Pier

  // Outdoor Forecourt Illuminated Kiosks & Promo Totems (flank entrance walkway cleanly)
  { minX: 386.8, maxX: 387.55, minZ: -66.15, maxZ: -64.85, floor: 1 }, // North Forecourt OLED Lightbox Totem
  { minX: 386.8, maxX: 387.55, minZ: -57.15, maxZ: -55.85, floor: 1 }, // South Forecourt Grand Opening Standee

  // Front Structural Round Silver Columns inside curtain wall (X = 390.6, Z = -67.7 & -54.3)
  { minX: 390.22, maxX: 390.98, minZ: -68.08, maxZ: -67.32, floor: 'both' },
  { minX: 390.22, maxX: 390.98, minZ: -54.68, maxZ: -53.92, floor: 'both' },

  // Floor 1 Showcases & Display Islands (wide walking aisles around entrance & stairs)
  { minX: 392.4, maxX: 394.6, minZ: -62.4, maxZ: -59.0, floor: 1 }, // LG SIGNATURE OLED Hero Pedestal
  { minX: 398.3, maxX: 400.7, minZ: -63.4, maxZ: -58.6, floor: 1 }, // LG Gram & UltraGear Island Table
  { minX: 396.8, maxX: 403.4, minZ: -72.2, maxZ: -68.2, floor: 1 }, // North Illuminated White Consultation Counter
  { minX: 409.5, maxX: 411.75, minZ: -73.8, maxZ: -64.6, floor: 1 }, // NE InstaView Fridges & WashTower Lineup
  { minX: 394.6, maxX: 405.8, minZ: -74.2, maxZ: -73.1, floor: 1 }, // North OLED evo Wall Credenza
  { minX: 409.5, maxX: 411.75, minZ: -63.8, maxZ: -55.8, floor: 1 }, // Rear Center OLED Gallery Credenza
  { minX: 392.6, maxX: 394.6, minZ: -66.6, maxZ: -64.6, floor: 1 }, // PuriCare 360 & StanbyME Plinth
  { minX: 391.9, maxX: 394.5, minZ: -53.9, maxZ: -51.9, floor: 1 }, // Red/Gold Gift Box Pyramid (North of Stair Foot)
  { minX: 391.9, maxX: 394.5, minZ: -48.6, maxZ: -47.7, floor: 1 }, // Red/Gold Gift Box Pyramid (South of Stair Foot)

  // Grand Open South Staircase Rails (X = 393.5..402.5, Z = -51.6..-48.6 — open East & West ends!)
  { minX: 393.5, maxX: 402.5, minZ: -51.82, maxZ: -51.48, floor: 'both' }, // Stair North Glass Balustrade
  { minX: 393.5, maxX: 402.5, minZ: -48.72, maxZ: -48.38, floor: 'both' }, // Stair South Glass Balustrade

  // =========================================================================
  // FLOOR 2 MEZZANINE (Y = 5.08m) — Balustrades & Showcase Lounges
  // =========================================================================
  { minX: 396.05, maxX: 396.55, minZ: -74.4, maxZ: -51.75, floor: 2 }, // Front Mezzanine West Glass Balustrade (North Wing)
  { minX: 396.05, maxX: 396.55, minZ: -48.45, maxZ: -47.6, floor: 2 }, // Front Mezzanine West Glass Balustrade (South Tip)
  { minX: 396.15, maxX: 402.5, minZ: -51.92, maxZ: -51.62, floor: 2 }, // Mezzanine Guard along Stairwell North Edge
  { minX: 396.15, maxX: 402.5, minZ: -48.58, maxZ: -48.28, floor: 2 }, // Mezzanine Guard along Stairwell South Edge
  { minX: 396.05, maxX: 396.55, minZ: -51.75, maxZ: -48.45, floor: 2 }, // Floor 2 West Guard at Stairwell Head

  // Floor 2 Furniture & Demo Zones
  { minX: 401.2, maxX: 405.8, minZ: -71.8, maxZ: -67.8, floor: 2 }, // F2 UltraGear Curved OLED Gaming Desks
  { minX: 400.6, maxX: 403.8, minZ: -62.5, maxZ: -57.0, floor: 2 }, // F2 OLED Cinema Lounge Sofa & Table
  { minX: 409.5, maxX: 411.75, minZ: -63.5, maxZ: -55.5, floor: 2 }, // F2 Giant 83" OLED Cinema Console
  { minX: 408.8, maxX: 410.6, minZ: -71.4, maxZ: -65.4, floor: 2 }, // F2 VIP LG SIGNATURE Consultation Bar
];

// =========================================================================
// HIGH-CONTRAST PROCEDURAL TEXTURES (ALL CANVAS / ZERO EXTERNAL REQUESTS)
// =========================================================================

function createBrushedSilverFasciaTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Clean bright brushed titanium-silver architectural ACM panels (matches ảnh 3 day + illuminated night)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#c8d3e0');
  bgGrad.addColorStop(0.45, '#b6c3d3');
  bgGrad.addColorStop(0.85, '#9eacc0');
  bgGrad.addColorStop(1, '#8c9bb0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal brushed streaks
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Crisp subtle panel shadow seams
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.28)';
  ctx.lineWidth = 2;
  const panels = 16;
  for (let i = 1; i < panels; i++) {
    const px = (i / panels) * w;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawLgSmileGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color = '#ffffff') {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(4, r * 0.13);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer G arc
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, -Math.PI * 0.52, Math.PI * 1.92, true);
  ctx.stroke();

  // Horizontal G crossbar
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.24, cy);
  ctx.lineTo(cx + r * 0.68, cy);
  ctx.stroke();

  // Central L nose
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.03, cy - r * 0.34);
  ctx.lineTo(cx - r * 0.03, cy + r * 0.24);
  ctx.lineTo(cx + r * 0.18, cy + r * 0.24);
  ctx.stroke();

  // Winking eye dot
  ctx.beginPath();
  ctx.arc(cx - r * 0.27, cy - r * 0.24, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
}

function createLgMagentaLogoTex(size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.5;
  const r = size * 0.455;

  // Deep glowing LG Magenta-Crimson Disc
  const grad = ctx.createRadialGradient(cx - r * 0.22, cy - r * 0.24, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#ff1f72');
  grad.addColorStop(0.55, '#db054d');
  grad.addColorStop(1, '#a50034');

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = size * 0.022;
  ctx.stroke();

  // Pure bright white L-G smiling glyph inside
  drawLgSmileGlyph(ctx, cx, cy, r * 0.88, '#ffffff');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createLgWordmarkTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 256);

  ctx.font = '800 185px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,255,255,0.75)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('LG', 256, 134);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLifesGoodTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 768, 192);

  ctx.font = 'italic 700 104px "Segoe UI", "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,255,255,0.65)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.fillText("Life's Good", 384, 98);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBrandshopCrestTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 228;
  const r = 148;

  const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrad.addColorStop(0, '#bae6fd');
  ringGrad.addColorStop(0.5, '#0284c7');
  ringGrad.addColorStop(1, '#38bdf8');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0c4a6e';
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = ringGrad;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 24, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.fillStyle = '#d80546';
  ctx.font = '800 94px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LG', cx, cy + 4);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(54, 378, 404, 74);
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 5;
  ctx.strokeRect(54, 378, 404, 74);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 50px "Inter", system-ui, sans-serif';
  ctx.fillText('BRANDSHOP', 256, 418);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSkyBillboardTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#a5e6ee');
  bg.addColorStop(0.45, '#5dd0df');
  bg.addColorStop(0.78, '#22b2c8');
  bg.addColorStop(1, '#0e859c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 8; i++) {
    const gx = (i + 0.5) * (w / 8);
    const rg = ctx.createRadialGradient(gx, h, 8, gx, h * 0.72, 230);
    rg.addColorStop(0, 'rgba(207, 250, 254, 0.72)');
    rg.addColorStop(1, 'rgba(165, 243, 252, 0)');
    ctx.fillStyle = rg;
    ctx.fillRect(gx - 230, 0, 460, h);
  }

  // LEFT: LG Smile + LG + Life's Good
  ctx.beginPath();
  ctx.arc(146, 150, 74, 0, Math.PI * 2);
  ctx.fillStyle = '#d80546';
  ctx.fill();
  drawLgSmileGlyph(ctx, 146, 150, 65, '#ffffff');

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 108px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LG', 240, 154);

  ctx.font = '700 42px "Inter", system-ui, sans-serif';
  ctx.fillText("Life's Good", 244, 242);

  // CENTER: LG OLED TV 4K
  ctx.fillStyle = '#090d16';
  ctx.font = '600 118px "Inter", system-ui, sans-serif';
  ctx.fillText('LG', 525, 198);

  const ox = 762;
  const oy = 196;
  const orad = 48;
  const sweepColors = ['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  for (let i = 0; i < sweepColors.length; i++) {
    ctx.beginPath();
    const a0 = (i / sweepColors.length) * Math.PI * 2;
    const a1 = ((i + 1.08) / sweepColors.length) * Math.PI * 2;
    ctx.arc(ox, oy, orad, a0, a1);
    ctx.lineWidth = 14;
    ctx.strokeStyle = sweepColors[i];
    ctx.stroke();
  }

  ctx.fillStyle = '#090d16';
  ctx.font = '500 116px "Inter", system-ui, sans-serif';
  ctx.fillText('LED TV', 828, 198);
  ctx.font = '700 58px "Inter", system-ui, sans-serif';
  ctx.fillText('4K', 1205, 212);

  ctx.font = '600 50px "Inter", system-ui, sans-serif';
  ctx.fillText('Perfect Color on Perfect Black', 528, 344);

  // RIGHT: OLED Screen showing Crimson Dahlia on Pure Black
  const tvX = 1365;
  const tvY = 24;
  const tvW = 550;
  const tvH = 420;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(tvX - 8, tvY - 8, tvW + 16, tvH + 16);
  ctx.fillStyle = '#020204';
  ctx.fillRect(tvX, tvY, tvW, tvH);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(tvX - 10, tvY + tvH + 14, tvW + 20, 14);

  const fx = tvX + tvW * 0.5;
  const fy = tvY + tvH * 0.5;
  for (let layer = 4; layer >= 1; layer--) {
    const count = 12 + layer * 4;
    const radius = layer * 42;
    for (let p = 0; p < count; p++) {
      const ang = (p / count) * Math.PI * 2 + layer * 0.25;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(ang);
      const pGrad = ctx.createLinearGradient(0, 0, radius, 0);
      pGrad.addColorStop(0, layer % 2 === 0 ? '#7f1d1d' : '#991b1b');
      pGrad.addColorStop(0.6, '#e11d48');
      pGrad.addColorStop(1, layer === 4 ? '#fda4af' : '#fb7185');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.ellipse(radius * 0.62, 0, radius * 0.44, 15 - layer * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.beginPath();
  ctx.arc(fx, fy, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#fda4af';
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createOledBladeTex(variant: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const palettes = [
    ['#e879f9', '#9333ea', '#f43f5e'],
    ['#c084fc', '#6366f1', '#38bdf8'],
    ['#60a5fa', '#2563eb', '#22d3ee'],
    ['#22d3ee', '#0284c7', '#818cf8'],
    ['#2dd4bf', '#0d9488', '#34d399'],
  ];
  const pal = palettes[variant % palettes.length];
  const g = ctx.createLinearGradient(0, 0, 256, 512);
  g.addColorStop(0, pal[0]);
  g.addColorStop(0.55, pal[1]);
  g.addColorStop(1, pal[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);

  for (let w = 0; w < 3; w++) {
    ctx.beginPath();
    ctx.moveTo(0, 120 + w * 110);
    ctx.bezierCurveTo(90, 60 + w * 90, 170, 260 + w * 80, 256, 170 + w * 95);
    ctx.lineWidth = 42;
    ctx.strokeStyle = w % 2 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.22)';
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSideWallMuralTex(side: 'north' | 'south'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 1024, 512);
  if (side === 'north') {
    g.addColorStop(0, '#1e293b');
    g.addColorStop(0.55, '#334155');
    g.addColorStop(1, '#0f172a');
  } else {
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#155e75');
    g.addColorStop(1, '#1e293b');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.beginPath();
  ctx.arc(82, 74, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#d80546';
  ctx.fill();
  drawLgSmileGlyph(ctx, 82, 74, 26, '#ffffff');

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 66px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(side === 'north' ? 'LG SIGNATURE' : 'LG TWINWash™', 132, 230);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 36px "Inter", system-ui, sans-serif';
  ctx.fillText(
    side === 'north' ? 'The Art of Essence  •  Wallpaper OLED' : 'Wash Two Loads at the Same Time',
    132,
    295
  );

  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(720, 90, 220, 330);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(720, 90, 220, 330);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGrandOpeningBuntingTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 1024, 192);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(512, 54, 1024, 24);
  ctx.stroke();

  const count = 8;
  for (let i = 0; i < count; i++) {
    const px = (i + 0.5) * (1024 / count);
    ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(px - 44, 34);
    ctx.lineTo(px + 44, 34);
    ctx.lineTo(px + 28, 148);
    ctx.lineTo(px, 174);
    ctx.lineTo(px - 28, 148);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GRAND', px, 82);
    ctx.fillText('OPENING', px, 108);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createOutdoorTotemTex(mode: 'oled' | 'opening'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 768;
  const ctx = c.getContext('2d')!;

  if (mode === 'oled') {
    const bg = ctx.createLinearGradient(0, 0, 0, 768);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 384, 768);

    ctx.fillStyle = '#d80546';
    ctx.fillRect(0, 0, 384, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LG OLED evo', 192, 64);

    const rg = ctx.createRadialGradient(192, 340, 12, 192, 340, 145);
    rg.addColorStop(0, '#fb7185');
    rg.addColorStop(0.45, '#be123c');
    rg.addColorStop(1, 'rgba(2,6,23,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(24, 170, 336, 336);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 32px "Inter", system-ui, sans-serif';
    ctx.fillText('WORLD #1 OLED', 192, 560);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 26px "Inter", system-ui, sans-serif';
    ctx.fillText('07:00 - 23:00', 192, 632);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, 768);
    bg.addColorStop(0, '#b91c1c');
    bg.addColorStop(0.55, '#dc2626');
    bg.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 384, 768);

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 344, 728);

    ctx.fillStyle = '#fef08a';
    ctx.font = '800 54px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GRAND', 192, 230);
    ctx.fillText('OPENING', 192, 298);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 36px "Inter", system-ui, sans-serif';
    ctx.fillText('LG BRANDSHOP', 192, 420);
    ctx.font = '600 26px "Inter", system-ui, sans-serif';
    ctx.fillText('Special Gifts Inside', 192, 510);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTvScreenTex(accentA: string, accentB: string, label: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 512, 256);
  g.addColorStop(0, '#020617');
  g.addColorStop(0.45, accentA);
  g.addColorStop(1, accentB);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  ctx.beginPath();
  ctx.arc(380, 128, 86, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, 34, 122);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 24px "Inter", system-ui, sans-serif';
  ctx.fillText("LG OLED evo  •  Life's Good", 34, 168);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFloorTileTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8f5ee';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = i * 128;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLgBagTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d80546';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LG', 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================================
// LG STORE ARCHITECTURE & SHOWROOM BUILDER
// =========================================================================

export function createLgStoreStructure(): LgStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  let currentOpenFactor = 1;
  const addLight = (
    color: number,
    dayInt: number,
    nightInt: number,
    dist: number,
    x: number,
    y: number,
    z: number,
    alwaysOn = false
  ) => {
    const light = new THREE.PointLight(color, dayInt, dist, 1.3);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt,
      nightInt,
      getScale: alwaysOn ? () => 1 : () => currentOpenFactor,
    });
  };

  // Architectural Materials
  const apronMat = new THREE.MeshStandardMaterial({ color: 0xdedbd3, roughness: 0.68 });
  const floorMat = new THREE.MeshStandardMaterial({
    map: createFloorTileTex(),
    roughness: 0.25,
    metalness: 0.05,
  });
  const warmWallMat = new THREE.MeshStandardMaterial({ color: 0xf8f0df, roughness: 0.56 });
  // Sleek bright titanium-silver ACM fascia (never murky dark charcoal!)
  const fasciaSilverMat = new THREE.MeshStandardMaterial({
    map: createBrushedSilverFasciaTex(),
    color: 0xe2e8f0,
    emissive: 0x334155,
    emissiveIntensity: 0.26,
    roughness: 0.34,
    metalness: 0.32,
  });
  const brushedSilverMat = new THREE.MeshStandardMaterial({
    color: 0xd1dae6,
    roughness: 0.26,
    metalness: 0.52,
  });
  const blackSteelMat = new THREE.MeshStandardMaterial({
    color: 0x181c22,
    roughness: 0.38,
    metalness: 0.65,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.20,
    roughness: 0.07,
    metalness: 0.14,
    depthWrite: false,
  });
  const canopyGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbfe2f5,
    transparent: true,
    opacity: 0.35,
    roughness: 0.07,
    metalness: 0.18,
    depthWrite: false,
  });
  const louverWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef9c3,
    emissiveIntensity: 0.24,
    roughness: 0.32,
  });
  const brightPlenumMat = new THREE.MeshStandardMaterial({
    color: 0xfaf7ef,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.42,
    roughness: 0.5,
  });
  const roofCapMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72 });
  const warmWoodMat = new THREE.MeshStandardMaterial({ color: 0xc08a57, roughness: 0.52 });
  const counterGlowWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.85,
    roughness: 0.22,
  });

  // Self-managed high-brightness emissive LED materials (not capped by ShopScene exteriorNeonMats!)
  const brightLedMats: THREE.MeshStandardMaterial[] = [brightPlenumMat, louverWhiteMat, counterGlowWhiteMat];

  const F1_Y = LG_PODIUM_Y;
  const F2_Y = LG_PODIUM_Y + LG_FLOOR_H; // 5.08m
  const GLASS_TOP_Y = 10.22; // Curtain glass & mullions end strictly at 10.22 (zero Z-fighting!)
  const CURTAIN_HEAD_BOT = 10.22;
  const CURTAIN_HEAD_TOP = 10.38;
  const FASCIA_BOT_Y = 10.42; // 0.04m crisp shadow reveal gap above curtain head beam!
  const FASCIA_TOP_Y = 13.00;
  const BILLBOARD_BOT_Y = 13.06; // 0.06m shadow gap above silver fascia!
  const BILLBOARD_TOP_Y = 16.56;

  // =========================================================================
  // 1. FORECOURT GRANITE APRON, RAMP & BUILDING FLOOR 1 SLAB
  // =========================================================================
  const forecourtSlab = new THREE.Mesh(new THREE.BoxGeometry(5.0, F1_Y + 0.06, 28.0), apronMat);
  forecourtSlab.position.set(386.3, (F1_Y - 0.06) * 0.5, LG_CENTER_Z);
  forecourtSlab.receiveShadow = true;
  staticGroup.add(forecourtSlab);

  const rampStep = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.045, 28.0), apronMat);
  rampStep.position.set(383.62, 0.022, LG_CENTER_Z);
  staticGroup.add(rampStep);

  const floor1Slab = new THREE.Mesh(new THREE.BoxGeometry(23.7, F1_Y + 0.06, 28.0), floorMat);
  floor1Slab.position.set(400.65, (F1_Y - 0.06) * 0.5, LG_CENTER_Z);
  floor1Slab.receiveShadow = true;
  staticGroup.add(floor1Slab);

  // =========================================================================
  // 2. STRUCTURAL WALLS, DOUBLE-HEIGHT MURALS & ROOF SLAB (NO OVERLAP!)
  // =========================================================================
  // Start side walls cleanly at X = 389.04 behind front pilasters/fascia (X = 388.24..389.00)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(23.46, FASCIA_TOP_Y, 0.72), warmWallMat);
  northWall.position.set(400.77, FASCIA_TOP_Y * 0.5, -74.64);
  staticGroup.add(northWall);

  const southWall = new THREE.Mesh(new THREE.BoxGeometry(23.46, FASCIA_TOP_Y, 0.72), warmWallMat);
  southWall.position.set(400.77, FASCIA_TOP_Y * 0.5, -47.36);
  staticGroup.add(southWall);

  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.75, FASCIA_TOP_Y, 26.56), warmWallMat);
  eastWall.position.set(412.12, FASCIA_TOP_Y * 0.5, LG_CENTER_Z);
  staticGroup.add(eastWall);

  const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(23.4, 0.36, 26.56), roofCapMat);
  roofDeck.position.set(400.75, FASCIA_TOP_Y - 0.22, LG_CENTER_Z);
  staticGroup.add(roofDeck);

  // North & South Side Pilasters (stop strictly at GLASS_TOP_Y = 10.22 so zero overlap with fascia!)
  [-74.66, -47.34].forEach((pz) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.76, GLASS_TOP_Y, 0.68), brushedSilverMat);
    pilaster.position.set(388.62, GLASS_TOP_Y * 0.5, pz);
    staticGroup.add(pilaster);
  });

  // Backlit Double-Height Graphic Wall Murals (LG SIGNATURE North & TWINWash South)
  const northMuralTex = createSideWallMuralTex('north');
  const northMuralMat = new THREE.MeshStandardMaterial({
    map: northMuralTex,
    emissive: 0xffffff,
    emissiveMap: northMuralTex,
    emissiveIntensity: 0.75,
    roughness: 0.28,
  });
  brightLedMats.push(northMuralMat);
  const northMural = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.6), northMuralMat);
  northMural.position.set(394.8, 7.35, -74.24);
  northMural.userData.noMerge = true;
  staticGroup.add(northMural);

  const southMuralTex = createSideWallMuralTex('south');
  const southMuralMat = new THREE.MeshStandardMaterial({
    map: southMuralTex,
    emissive: 0xffffff,
    emissiveMap: southMuralTex,
    emissiveIntensity: 0.75,
    roughness: 0.28,
  });
  brightLedMats.push(southMuralMat);
  const southMural = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.6), southMuralMat);
  southMural.rotation.y = Math.PI;
  southMural.position.set(394.8, 7.35, -47.76);
  southMural.userData.noMerge = true;
  staticGroup.add(southMural);

  // =========================================================================
  // 3. TWO-TIER UPPER FACADE: BRUSHED-SILVER FASCIA + AQUA SKY BILLBOARD
  // =========================================================================
  // Curtain Wall Continuous Head Transom Beam (Y = 10.22..10.38, cleanly separated from fascia!)
  const curtainHeadBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, CURTAIN_HEAD_TOP - CURTAIN_HEAD_BOT, 27.36),
    blackSteelMat
  );
  curtainHeadBeam.position.set(LG_DOOR_X, (CURTAIN_HEAD_BOT + CURTAIN_HEAD_TOP) * 0.5, LG_CENTER_Z);
  staticGroup.add(curtainHeadBeam);

  // Brushed Titanium-Silver Fascia Box (Y = 10.42..13.00)
  const fasciaBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, FASCIA_TOP_Y - FASCIA_BOT_Y, 28.0),
    fasciaSilverMat
  );
  fasciaBox.position.set(388.62, (FASCIA_TOP_Y + FASCIA_BOT_Y) * 0.5, LG_CENTER_Z);
  staticGroup.add(fasciaBox);

  // 3A. Center 3D Illuminated Magenta LG Disc (White glowing L-G!) + Bold White "LG" Wordmark
  const lgDiscGroup = new THREE.Group();
  lgDiscGroup.position.set(388.20, 11.72, -61.85);

  const lgRim = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.16, 36), brushedSilverMat);
  lgRim.rotation.z = Math.PI / 2;
  lgDiscGroup.add(lgRim);

  const lgDiscTex = createLgMagentaLogoTex(512);
  const lgDiscMat = new THREE.MeshStandardMaterial({
    map: lgDiscTex,
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveMap: lgDiscTex,
    emissiveIntensity: 1.25,
    transparent: true,
    alphaTest: 0.12,
    roughness: 0.2,
  });

  const lgDiscFace = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 2.02), lgDiscMat);
  lgDiscFace.rotation.y = -Math.PI / 2;
  lgDiscFace.position.set(-0.095, 0, 0);
  lgDiscFace.userData.noMerge = true;
  lgDiscGroup.add(lgDiscFace);
  staticGroup.add(lgDiscGroup);

  const lgWordTex = createLgWordmarkTex();
  const lgWordMat = new THREE.MeshStandardMaterial({
    map: lgWordTex,
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveMap: lgWordTex,
    emissiveIntensity: 1.45,
    transparent: true,
    alphaTest: 0.12,
    roughness: 0.18,
  });
  const lgWordPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 1.58), lgWordMat);
  lgWordPlane.rotation.y = -Math.PI / 2;
  lgWordPlane.position.set(388.18, 11.72, -59.25);
  lgWordPlane.userData.noMerge = true;
  staticGroup.add(lgWordPlane);

  // 3B. Left Illuminated "Life's Good" Sign (North Fascia Wing)
  const lifesGoodTex = createLifesGoodTex();
  const lifesGoodMat = new THREE.MeshStandardMaterial({
    map: lifesGoodTex,
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveMap: lifesGoodTex,
    emissiveIntensity: 1.4,
    transparent: true,
    alphaTest: 0.12,
    roughness: 0.2,
  });
  const lifesGoodPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), lifesGoodMat);
  lifesGoodPlane.rotation.y = -Math.PI / 2;
  lifesGoodPlane.position.set(388.18, 11.72, -69.5);
  lifesGoodPlane.userData.noMerge = true;
  staticGroup.add(lifesGoodPlane);

  // 3C. Right Illuminated "LG BRANDSHOP" Crest Emblem (South Fascia Wing)
  const crestTex = createBrandshopCrestTex();
  const crestMat = new THREE.MeshStandardMaterial({
    map: crestTex,
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveMap: crestTex,
    emissiveIntensity: 1.15,
    transparent: true,
    alphaTest: 0.12,
    roughness: 0.2,
  });
  const crestPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 2.35), crestMat);
  crestPlane.rotation.y = -Math.PI / 2;
  crestPlane.position.set(388.18, 11.72, -52.2);
  crestPlane.userData.noMerge = true;
  staticGroup.add(crestPlane);

  // 3D. Upper Sky Billboard ("LG OLED TV 4K - Perfect Color on Perfect Black" + Crimson Dahlia Blossom)
  const billboardBacking = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, BILLBOARD_TOP_Y - BILLBOARD_BOT_Y, 27.6),
    blackSteelMat
  );
  billboardBacking.position.set(388.85, (BILLBOARD_TOP_Y + BILLBOARD_BOT_Y) * 0.5, LG_CENTER_Z);
  staticGroup.add(billboardBacking);

  const skyBillboardTex = createSkyBillboardTex();
  const skyBillboardMat = new THREE.MeshStandardMaterial({
    map: skyBillboardTex,
    emissive: 0xffffff,
    emissiveMap: skyBillboardTex,
    emissiveIntensity: 0.95,
    roughness: 0.24,
  });
  const skyBillboardFace = new THREE.Mesh(new THREE.PlaneGeometry(27.5, 3.44), skyBillboardMat);
  skyBillboardFace.rotation.y = -Math.PI / 2;
  skyBillboardFace.position.set(388.62, (BILLBOARD_TOP_Y + BILLBOARD_BOT_Y) * 0.5, LG_CENTER_Z);
  skyBillboardFace.userData.noMerge = true;
  staticGroup.add(skyBillboardFace);

  // 8 Aqua Uplight Fixtures illuminating the Sky Billboard ledge (ảnh 2 glow cones!)
  const aquaUplightMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x22d3ee,
    emissiveIntensity: 2.8,
    roughness: 0.15,
  });
  for (let i = 0; i < 8; i++) {
    const uz = -73.0 + i * 3.42;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.28), aquaUplightMat);
    lamp.position.set(388.45, BILLBOARD_BOT_Y + 0.02, uz);
    staticGroup.add(lamp);
  }

  // =========================================================================
  // 4. 8-BAY x 5-ROW CURTAIN GLASS + SILVER PORTAL + SPIDER-ROD CANOPY
  // =========================================================================
  const GLASS_MIN_Z = -74.32;
  const GLASS_SPAN = 26.64;
  const BAYS = 8;
  const BAY_W = GLASS_SPAN / BAYS; // 3.33m

  // 9 Vertical Mullions terminating cleanly at GLASS_TOP_Y = 10.22 (zero intersection with upper head!)
  for (let i = 0; i <= BAYS; i++) {
    const mz = GLASS_MIN_Z + i * BAY_W;
    const isPortalEdge = i === 3 || i === 5;
    const isCenterCut = i === 4;
    if (isCenterCut) {
      const upperMullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, GLASS_TOP_Y - 4.44, 0.08),
        blackSteelMat
      );
      upperMullion.position.set(LG_DOOR_X, (GLASS_TOP_Y + 4.44) * 0.5, mz);
      staticGroup.add(upperMullion);
    } else {
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(isPortalEdge ? 0.13 : 0.095, GLASS_TOP_Y - F1_Y, 0.08),
        blackSteelMat
      );
      mullion.position.set(LG_DOOR_X, (GLASS_TOP_Y + F1_Y) * 0.5, mz);
      staticGroup.add(mullion);
    }
  }

  // 4 Horizontal Blackened-Steel Curtain Transoms (rows across Y = 2.14, 4.20, 6.26, 8.32)
  [2.14, 4.20, 6.26, 8.32].forEach((ty) => {
    if (ty < 4.4) {
      const nLen = -64.3 - GLASS_MIN_Z;
      const nBar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, nLen), blackSteelMat);
      nBar.position.set(LG_DOOR_X, ty, GLASS_MIN_Z + nLen * 0.5);
      staticGroup.add(nBar);

      const sEnd = GLASS_MIN_Z + GLASS_SPAN;
      const sLen = sEnd - -57.7;
      const sBar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, sLen), blackSteelMat);
      sBar.position.set(LG_DOOR_X, ty, -57.7 + sLen * 0.5);
      staticGroup.add(sBar);
    } else {
      const fullBar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, GLASS_SPAN), blackSteelMat);
      fullBar.position.set(LG_DOOR_X, ty, LG_CENTER_Z);
      staticGroup.add(fullBar);
    }
  });

  // Curtain Wall Glass Sheets (terminate cleanly at GLASS_TOP_Y = 10.22!)
  const nGlassLen = -63.4 - GLASS_MIN_Z;
  const nGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, GLASS_TOP_Y - F1_Y, nGlassLen), glassMat);
  nGlass.position.set(LG_DOOR_X, (GLASS_TOP_Y + F1_Y) * 0.5, GLASS_MIN_Z + nGlassLen * 0.5);
  staticGroup.add(nGlass);

  const sGlassEnd = GLASS_MIN_Z + GLASS_SPAN;
  const sGlassLen = sGlassEnd - -58.6;
  const sGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, GLASS_TOP_Y - F1_Y, sGlassLen), glassMat);
  sGlass.position.set(LG_DOOR_X, (GLASS_TOP_Y + F1_Y) * 0.5, -58.6 + sGlassLen * 0.5);
  staticGroup.add(sGlass);

  const centerUpperGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, GLASS_TOP_Y - 4.44, 4.8), glassMat);
  centerUpperGlass.position.set(LG_DOOR_X, (GLASS_TOP_Y + 4.44) * 0.5, LG_DOOR_Z);
  staticGroup.add(centerUpperGlass);

  // Two Signature Round Brushed-Silver Interior Structural Columns behind Glass (X = 390.6)
  [-67.7, -54.3].forEach((cz) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, GLASS_TOP_Y - F1_Y, 20), brushedSilverMat);
    col.position.set(390.6, (GLASS_TOP_Y + F1_Y) * 0.5, cz);
    staticGroup.add(col);
  });

  // Protruding Brushed-Silver Entrance Portal Box Frame (X = 388.15..388.85, Z = -64.4..-57.6, Y = 0.08..4.42)
  const portalNorthPier = new THREE.Mesh(new THREE.BoxGeometry(0.75, 4.34, 0.85), brushedSilverMat);
  portalNorthPier.position.set(388.45, F1_Y + 2.17, -64.0);
  staticGroup.add(portalNorthPier);

  const portalSouthPier = new THREE.Mesh(new THREE.BoxGeometry(0.75, 4.34, 0.85), brushedSilverMat);
  portalSouthPier.position.set(388.45, F1_Y + 2.17, -58.0);
  staticGroup.add(portalSouthPier);

  const portalLintel = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.52, 6.85), brushedSilverMat);
  portalLintel.position.set(388.45, 4.16, LG_DOOR_Z);
  staticGroup.add(portalLintel);

  // Bright LED Bulb Material (kept super bright day & night when open!)
  const bulbGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 3.2,
    roughness: 0.14,
  });
  brightLedMats.push(bulbGlowMat);

  // 5 Recessed Portal Soffit Downlight Bulbs (ảnh 3 clear entry glow!)
  [-63.0, -62.0, -61.0, -60.0, -59.0].forEach((pz) => {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), blackSteelMat);
    housing.position.set(388.42, 3.895, pz);
    staticGroup.add(housing);

    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.036, 12), bulbGlowMat);
    bulb.position.set(388.42, 3.89, pz);
    staticGroup.add(bulb);
  });

  // Crimson "GRAND OPENING" Bunting Banner inside Entrance Transom (ảnh 3)
  const buntingMat = new THREE.MeshBasicMaterial({
    map: createGrandOpeningBuntingTex(),
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const buntingStrip = new THREE.Mesh(new THREE.PlaneGeometry(4.65, 0.72), buntingMat);
  buntingStrip.rotation.y = -Math.PI / 2;
  buntingStrip.position.set(388.72, 3.55, LG_DOOR_Z);
  buntingStrip.userData.noMerge = true;
  staticGroup.add(buntingStrip);

  // Automatic Sliding Glass Entrance Doors (Z = -63.4 .. -58.6, 4.8m wide)
  const doorLeafNorthClosedZ = -62.2;
  const doorLeafSouthClosedZ = -59.8;
  const buildSlidingDoorLeaf = (zCenter: number) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.045, 3.68, 2.38), glassMat);
    glassPane.position.y = F1_Y + 1.86;
    grp.add(glassPane);

    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 2.42), brushedSilverMat);
    topFrame.position.y = F1_Y + 3.70;
    grp.add(topFrame);

    const botFrame = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.10, 2.42), brushedSilverMat);
    botFrame.position.y = F1_Y + 0.05;
    grp.add(botFrame);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 10), brushedSilverMat);
    handle.position.set(-0.06, F1_Y + 1.38, zCenter < LG_DOOR_Z ? 0.92 : -0.92);
    grp.add(handle);

    grp.position.set(LG_DOOR_X - 0.06, 0, zCenter);
    staticGroup.add(grp);
    return grp;
  };
  const doorLeafNorth = buildSlidingDoorLeaf(doorLeafNorthClosedZ);
  const doorLeafSouth = buildSlidingDoorLeaf(doorLeafSouthClosedZ);

  // Security Rolling Shutter Door (Closed 23:00 - 07:00)
  const shutterTex = createRollingShutterTexture({
    title: 'LG BRANDSHOP',
    hoursLabel: '07:00 - 23:00',
    accentHex: '#d80546',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.45,
    metalness: 0.62,
  });
  const shutterHandle: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'lg_main_shutter',
      axis: 'z',
      pos: LG_DOOR_X - 0.18,
      spanCenter: LG_DOOR_Z,
      width: 4.92,
      baseY: F1_Y,
      topY: 3.84,
    },
    shutterMat,
    brushedSilverMat
  );

  // Cantilevered Clear Glass Canopy + Spider Clamps + Diagonal Stainless Tension Tie-Rods
  const canopyGlass = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.055, 7.4), canopyGlassMat);
  canopyGlass.position.set(387.76, 4.55, LG_DOOR_Z);
  staticGroup.add(canopyGlass);

  const canopyFrontRail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 7.42, 10), brushedSilverMat);
  canopyFrontRail.rotation.x = Math.PI / 2;
  canopyFrontRail.position.set(386.75, 4.55, LG_DOOR_Z);
  staticGroup.add(canopyFrontRail);

  [-64.3, -62.1, -59.9, -57.7].forEach((rz) => {
    const spiderBar = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.05, 0.06), brushedSilverMat);
    spiderBar.position.set(387.76, 4.52, rz);
    staticGroup.add(spiderBar);

    const p0 = new THREE.Vector3(388.78, 6.22, rz);
    const p1 = new THREE.Vector3(386.96, 4.58, rz);
    const rodLen = p0.distanceTo(p1);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rodLen, 8), brushedSilverMat);
    rod.position.copy(p0).lerp(p1, 0.5);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    staticGroup.add(rod);
  });

  // Outdoor Forecourt Illuminated Standees
  const buildOutdoorTotem = (zPos: number, mode: 'oled' | 'opening') => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.24, 0.94), blackSteelMat);
    body.position.set(387.18, F1_Y + 1.12, zPos);
    staticGroup.add(body);

    const tex = createOutdoorTotemTex(mode);
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.95,
      roughness: 0.22,
    });
    brightLedMats.push(faceMat);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 2.08), faceMat);
    face.rotation.y = -Math.PI / 2;
    face.position.set(387.05, F1_Y + 1.12, zPos);
    face.userData.noMerge = true;
    staticGroup.add(face);
  };
  buildOutdoorTotem(-65.5, 'oled');
  buildOutdoorTotem(-56.5, 'opening');

  // =========================================================================
  // 5. BRIGHT BACKLIT LOUVERED CEILING + FLOATING DISCS + HANGING OLED BLADES
  // =========================================================================
  // Bright warm-alabaster ceiling deck (sits cleanly at Y = 10.24..10.38 above glass/louver line!)
  const ceilingPlenum = new THREE.Mesh(new THREE.BoxGeometry(22.9, 0.14, 26.5), brightPlenumMat);
  ceilingPlenum.position.set(400.45, 10.30, LG_CENTER_Z);
  staticGroup.add(ceilingPlenum);

  // 34 Crisp White Linear Louvers + 17 Super-Bright Continuous LED Channels between them!
  const LOUVER_START_Z = -73.9;
  const LOUVER_STEP = 0.78;
  for (let i = 0; i < 34; i++) {
    const lz = LOUVER_START_Z + i * LOUVER_STEP;
    const louver = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.24, 0.065), louverWhiteMat);
    louver.position.set(400.2, 10.09, lz);
    staticGroup.add(louver);

    if (i % 2 === 0 && i < 33) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.045, 0.15), bulbGlowMat);
      strip.position.set(400.0, 10.20, lz + LOUVER_STEP * 0.5);
      staticGroup.add(strip);
    }
  }

  // Additional Bright Ceiling Spotlights inside Store (Floor 1 ceiling soffit + Floor 2 ceiling!)
  for (let cx = 392.0; cx <= 409.5; cx += 4.3) {
    for (let cz = -71.5; cz <= -50.5; cz += 5.2) {
      const topBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 14), bulbGlowMat);
      topBulb.position.set(cx, 9.95, cz);
      staticGroup.add(topBulb);
    }
  }
  for (let cx = 398.5; cx <= 409.5; cx += 3.6) {
    for (let cz = -71.5; cz <= -54.0; cz += 4.3) {
      const f1Bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.035, 14), bulbGlowMat);
      f1Bulb.position.set(cx, F2_Y - 0.315, cz);
      staticGroup.add(f1Bulb);
    }
  }

  // 6 Floating White Circular Illuminated Ceiling Discs under Louvers (ảnh 2 & ảnh 3)
  const discGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 1.85,
    roughness: 0.22,
  });
  brightLedMats.push(discGlowMat);

  [
    { x: 392.2, z: -70.6, r: 1.55 },
    { x: 395.4, z: -67.8, r: 1.45 },
    { x: 391.8, z: -66.0, r: 1.15 },
    { x: 392.2, z: -51.4, r: 1.55 },
    { x: 395.4, z: -54.2, r: 1.45 },
    { x: 391.8, z: -56.0, r: 1.15 },
  ].forEach((d) => {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(d.r, d.r, 0.08, 28), discGlowMat);
    disc.position.set(d.x, 9.84, d.z);
    staticGroup.add(disc);
  });

  // 10 Suspended Vertical Glowing OLED Art Blades in Double-Height Atrium Void (ảnh 2 centerpiece!)
  for (let i = 0; i < 10; i++) {
    const bz = -64.8 + i * 0.84;
    const bx = 392.9 + Math.sin(i * 0.65) * 0.48;
    const bladeH = 2.75 + (i % 3) * 0.22;
    const bladeY = 6.95 + (i % 2) * 0.16;

    const bladeTex = createOledBladeTex(i);
    const bladeMat = new THREE.MeshStandardMaterial({
      map: bladeTex,
      emissive: 0xffffff,
      emissiveMap: bladeTex,
      emissiveIntensity: 1.55,
      roughness: 0.16,
    });
    brightLedMats.push(bladeMat);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, bladeH, 0.62), bladeMat);
    blade.position.set(bx, bladeY, bz);
    blade.rotation.y = (i - 4.5) * 0.08;
    blade.userData.noMerge = true;
    staticGroup.add(blade);

    [-0.18, 0.18].forEach((dz) => {
      const cableH = 10.14 - (bladeY + bladeH * 0.5);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, cableH, 6), brushedSilverMat);
      cable.position.set(bx, bladeY + bladeH * 0.5 + cableH * 0.5, bz + dz);
      staticGroup.add(cable);
    });
  }

  // =========================================================================
  // 6. FLOOR 2 MEZZANINE DECK (CUT OUT FOR OPEN SOUTH STAIRCASE) & BALUSTRADES
  // =========================================================================
  const f2NorthDeck = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.30, 22.6), warmWallMat);
  f2NorthDeck.position.set(404.2, F2_Y - 0.15, -63.1);
  staticGroup.add(f2NorthDeck);

  const f2NorthFloorTop = new THREE.Mesh(new THREE.BoxGeometry(15.9, 0.02, 22.5), floorMat);
  f2NorthFloorTop.position.set(404.2, F2_Y - 0.006, -63.1);
  staticGroup.add(f2NorthFloorTop);

  const f2EastLanding = new THREE.Mesh(new THREE.BoxGeometry(9.7, 0.30, 4.2), warmWallMat);
  f2EastLanding.position.set(407.35, F2_Y - 0.15, -49.7);
  staticGroup.add(f2EastLanding);

  const f2EastFloorTop = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.02, 4.1), floorMat);
  f2EastFloorTop.position.set(407.35, F2_Y - 0.006, -49.7);
  staticGroup.add(f2EastFloorTop);

  const f2SouthStrip = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.30, 0.8), warmWallMat);
  f2SouthStrip.position.set(399.35, F2_Y - 0.15, -48.0);
  staticGroup.add(f2SouthStrip);

  // Recessed Round Pinhole Downlights ("o o o") along Front Mezzanine Fascia (X = 396.18, Y = 4.93)
  for (let dz = -73.4; dz <= -48.2; dz += 1.35) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), blackSteelMat);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(396.18, F2_Y - 0.15, dz);
    staticGroup.add(ring);

    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), bulbGlowMat);
    bulb.rotation.z = Math.PI / 2;
    bulb.position.set(396.16, F2_Y - 0.15, dz);
    staticGroup.add(bulb);
  }

  // Floor 2 Clear Glass Balustrades + Brushed Steel Handrails
  const buildBalustrade = (x0: number, z0: number, x1: number, z1: number, baseY = F2_Y) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) * 0.5;
    const cz = (z0 + z1) * 0.5;
    const angle = Math.atan2(z1 - z0, x1 - x0);

    const pane = new THREE.Mesh(new THREE.BoxGeometry(len, 1.05, 0.04), glassMat);
    pane.position.set(cx, baseY + 0.53, cz);
    pane.rotation.y = -angle;
    staticGroup.add(pane);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.055, 0.075), brushedSilverMat);
    rail.position.set(cx, baseY + 1.08, cz);
    rail.rotation.y = -angle;
    staticGroup.add(rail);
  };
  buildBalustrade(396.28, -74.2, 396.28, -47.7);
  buildBalustrade(396.28, -51.75, 402.5, -51.75);
  buildBalustrade(396.28, -48.45, 402.5, -48.45);

  // =========================================================================
  // 7. GRAND OPEN SOUTH STAIRCASE (X = 393.5 -> 402.5, Z = -51.6 .. -48.6)
  // =========================================================================
  const STAIR_X0 = 393.5;
  const STAIR_X1 = 402.5;
  const STAIR_SPAN_X = STAIR_X1 - STAIR_X0;
  const STAIR_Z = -50.1;
  const STEPS = 20;

  for (let s = 0; s < STEPS; s++) {
    const t = (s + 0.5) / STEPS;
    const sx = STAIR_X0 + t * STAIR_SPAN_X;
    const sy = F1_Y + ((s + 1) / STEPS) * LG_FLOOR_H;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(STAIR_SPAN_X / STEPS + 0.04, 0.14, 2.84), warmWoodMat);
    tread.position.set(sx, sy - 0.07, STAIR_Z);
    staticGroup.add(tread);
  }

  const diagLen = Math.hypot(STAIR_SPAN_X, LG_FLOOR_H);
  const stairAngle = Math.atan2(LG_FLOOR_H, STAIR_SPAN_X);
  [-51.6, -48.6].forEach((sz) => {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.28, 0.09), blackSteelMat);
    stringer.position.set((STAIR_X0 + STAIR_X1) * 0.5, F1_Y + LG_FLOOR_H * 0.5 - 0.18, sz);
    stringer.rotation.z = stairAngle;
    staticGroup.add(stringer);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.06, 0.07), brushedSilverMat);
    rail.position.set((STAIR_X0 + STAIR_X1) * 0.5, F1_Y + LG_FLOOR_H * 0.5 + 1.02, sz);
    rail.rotation.z = stairAngle;
    staticGroup.add(rail);

    const glassSide = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.96, 0.035), glassMat);
    glassSide.position.set((STAIR_X0 + STAIR_X1) * 0.5, F1_Y + LG_FLOOR_H * 0.5 + 0.52, sz);
    glassSide.rotation.z = stairAngle;
    staticGroup.add(glassSide);
  });

  // Grand Opening Red & Gold Gift Box Pyramids flanking Stair Foot
  const giftRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
  const giftGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.55 });
  const buildGiftPyramid = (cx: number, cz: number) => {
    const tiers = [
      { s: 0.72, y: 0.36, dz: -0.45 },
      { s: 0.72, y: 0.36, dz: 0.45 },
      { s: 0.58, y: 0.98, dz: 0.0 },
      { s: 0.42, y: 1.48, dz: 0.0 },
    ];
    tiers.forEach((b, idx) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(b.s, b.s * 0.85, b.s), giftRedMat);
      box.position.set(cx, F1_Y + b.y, cz + b.dz);
      box.rotation.y = idx * 0.25;
      staticGroup.add(box);

      const rib = new THREE.Mesh(new THREE.BoxGeometry(b.s + 0.02, b.s * 0.86, 0.11), giftGoldMat);
      rib.position.copy(box.position);
      rib.rotation.y = box.rotation.y;
      staticGroup.add(rib);
    });
  };
  buildGiftPyramid(393.1, -52.9);
  buildGiftPyramid(393.1, -48.1);

  // =========================================================================
  // 8. FLOOR 1 PRODUCT SHOWCASES & CONSULTATION BAR
  // =========================================================================
  const buildOledTvUnit = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    width: number,
    height: number,
    accentA: string,
    accentB: string,
    label: string
  ) => {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = rotY;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, height + 0.08, width + 0.08), blackSteelMat);
    grp.add(frame);

    const screenTex = createTvScreenTex(accentA, accentB, label);
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTex,
      emissive: 0xffffff,
      emissiveMap: screenTex,
      emissiveIntensity: 1.05,
      roughness: 0.16,
    });
    brightLedMats.push(screenMat);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), screenMat);
    screen.rotation.y = -Math.PI / 2;
    screen.position.x = -0.036;
    screen.userData.noMerge = true;
    grp.add(screen);

    staticGroup.add(grp);
  };

  // Floor 1 Illuminated White Consultation / Reception Counter (North Wing)
  const f1CounterBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.04, 3.8), counterGlowWhiteMat);
  f1CounterBase.position.set(400.0, F1_Y + 0.52, -70.2);
  staticGroup.add(f1CounterBase);

  const f1CounterTop = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 3.96), louverWhiteMat);
  f1CounterTop.position.set(400.0, F1_Y + 1.06, -70.2);
  staticGroup.add(f1CounterTop);

  // LG SIGNATURE Hero Island near Atrium Entrance
  const heroPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 3.1), roofCapMat);
  heroPlinth.position.set(393.5, F1_Y + 0.325, -60.7);
  staticGroup.add(heroPlinth);

  buildOledTvUnit(393.5, F1_Y + 1.52, -60.7, 0, 2.35, 1.25, '#831843', '#db2777', 'OLED M4');
  [-62.1, -59.3].forEach((sz) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.92, 10), brushedSilverMat);
    post.position.set(392.4, F1_Y + 0.46, sz);
    staticGroup.add(post);
  });
  const velvetRope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.8, 8), giftRedMat);
  velvetRope.rotation.x = Math.PI / 2;
  velvetRope.position.set(392.4, F1_Y + 0.78, -60.7);
  staticGroup.add(velvetRope);

  // LG Gram & UltraGear Island Display Table (Center F1)
  const gramTableBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.84, 4.4), brushedSilverMat);
  gramTableBase.position.set(399.5, F1_Y + 0.42, -61.0);
  staticGroup.add(gramTableBase);

  const gramTableTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 4.6), warmWoodMat);
  gramTableTop.position.set(399.5, F1_Y + 0.88, -61.0);
  staticGroup.add(gramTableTop);

  [-62.4, -61.0, -59.6].forEach((lz) => {
    const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.42), brushedSilverMat);
    laptopBase.position.set(399.5, F1_Y + 0.935, lz);
    staticGroup.add(laptopBase);

    const laptopLid = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.26, 0.42), blackSteelMat);
    laptopLid.position.set(399.65, F1_Y + 1.06, lz);
    laptopLid.rotation.z = -0.22;
    staticGroup.add(laptopLid);
  });

  // North Wall OLED Gallery Credenza + 3 Large 4K Screens (Z = -73.7)
  const northCredenza = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.65, 0.72), roofCapMat);
  northCredenza.position.set(400.2, F1_Y + 0.325, -73.75);
  staticGroup.add(northCredenza);

  [396.4, 400.2, 404.0].forEach((tx, idx) => {
    buildOledTvUnit(
      tx,
      F1_Y + 1.95,
      -74.05,
      Math.PI / 2,
      2.65,
      1.45,
      idx === 1 ? '#1e3a8a' : '#701a75',
      idx === 1 ? '#06b6d4' : '#ec4899',
      idx === 0 ? 'OLED G4' : idx === 1 ? 'QNED 8K' : 'OLED C4'
    );
  });

  // East Rear Wall Home Appliances Showcase (InstaView Glass Refrigerators + WashTower Dryers)
  const buildApplianceUnit = (zPos: number, kind: 'fridge' | 'washer' | 'styler') => {
    const xPos = 410.75;
    if (kind === 'fridge') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.15, 1.15), brushedSilverMat);
      body.position.set(xPos, F1_Y + 1.075, zPos);
      staticGroup.add(body);

      const glassDoor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.52), blackSteelMat);
      glassDoor.position.set(xPos - 0.48, F1_Y + 1.48, zPos - 0.28);
      staticGroup.add(glassDoor);
    } else if (kind === 'washer') {
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.92, 0.85), louverWhiteMat);
      stack.position.set(xPos, F1_Y + 0.96, zPos);
      staticGroup.add(stack);

      [0.52, 1.42].forEach((dy) => {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 18), blackSteelMat);
        drum.rotation.z = Math.PI / 2;
        drum.position.set(xPos - 0.43, F1_Y + dy, zPos);
        staticGroup.add(drum);
      });
    } else {
      const styler = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.02, 0.65), blackSteelMat);
      styler.position.set(xPos, F1_Y + 1.01, zPos);
      staticGroup.add(styler);
    }
  };
  buildApplianceUnit(-72.0, 'fridge');
  buildApplianceUnit(-70.2, 'fridge');
  buildApplianceUnit(-68.2, 'washer');
  buildApplianceUnit(-66.8, 'washer');
  buildApplianceUnit(-65.4, 'styler');

  // Rear Center Wall Giant Brand TV Showcase (X = 411.55, Z = -60.0)
  const rearCenterCredenza = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.65, 7.6), roofCapMat);
  rearCenterCredenza.position.set(411.15, F1_Y + 0.325, -59.8);
  staticGroup.add(rearCenterCredenza);

  buildOledTvUnit(411.65, F1_Y + 2.25, -61.8, 0, 3.1, 1.72, '#4c1d95', '#f43f5e', 'LG OLED 88"');
  buildOledTvUnit(411.65, F1_Y + 2.25, -57.8, 0, 3.1, 1.72, '#0c4a6e', '#22d3ee', 'Soundbar S95');

  // PuriCare 360 Air Purifier Plinth
  const puricareBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.48, 1.4), louverWhiteMat);
  puricareBase.position.set(393.6, F1_Y + 0.24, -65.6);
  staticGroup.add(puricareBase);
  const puricareCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 1.12, 18), louverWhiteMat);
  puricareCylinder.position.set(393.6, F1_Y + 1.04, -65.6);
  staticGroup.add(puricareCylinder);

  // =========================================================================
  // 9. FLOOR 2 MEZZANINE SHOWCASES (GAMING STUDIO + 83" OLED CINEMA LOUNGE)
  // =========================================================================
  const buildGamingStation = (zPos: number) => {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.76, 1.9), blackSteelMat);
    desk.position.set(403.5, F2_Y + 0.38, zPos);
    staticGroup.add(desk);

    buildOledTvUnit(403.85, F2_Y + 1.18, zPos, 0, 1.45, 0.68, '#3b0764', '#ec4899', 'UltraGear 45"');

    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.54), giftRedMat);
    chairSeat.position.set(402.1, F2_Y + 0.48, zPos);
    staticGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.84, 0.52), blackSteelMat);
    chairBack.position.set(401.85, F2_Y + 0.88, zPos);
    staticGroup.add(chairBack);
  };
  buildGamingStation(-70.6);
  buildGamingStation(-68.6);

  // Floor 2 OLED Home Cinema Lounge (Center Mezzanine)
  const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 4.0), louverWhiteMat);
  sofaMain.position.set(401.5, F2_Y + 0.36, -59.8);
  staticGroup.add(sofaMain);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.96, 4.0), louverWhiteMat);
  sofaBack.position.set(401.0, F2_Y + 0.48, -59.8);
  staticGroup.add(sofaBack);
  const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 1.8), warmWoodMat);
  coffeeTable.position.set(403.4, F2_Y + 0.21, -59.8);
  staticGroup.add(coffeeTable);

  const f2TvConsole = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.62, 6.2), roofCapMat);
  f2TvConsole.position.set(411.1, F2_Y + 0.31, -59.5);
  staticGroup.add(f2TvConsole);
  buildOledTvUnit(411.62, F2_Y + 2.05, -59.5, 0, 4.2, 2.25, '#881337', '#f43f5e', 'LG OLED 83" 4K');

  // VIP SIGNATURE Consultation Bar (NE Mezzanine)
  const vipBar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.02, 5.2), counterGlowWhiteMat);
  vipBar.position.set(409.7, F2_Y + 0.51, -68.4);
  staticGroup.add(vipBar);

  // =========================================================================
  // 10. HIGH-OUTPUT SHOWROOM LIGHTING RIG (BRIGHT DAY & NIGHT!)
  // =========================================================================
  addLight(0xfffdf5, 6.2, 10.5, 34, 394.5, 4.8, -61.0); // Center Atrium F1 Hero Flood
  addLight(0xfffbeb, 5.4, 9.2, 30, 405.5, 4.5, -69.2); // North Wing F1 Appliance & Consult Bar
  addLight(0xfffbeb, 5.0, 8.6, 28, 404.5, 4.4, -52.5); // South Staircase & Gift Pyramid Flood
  addLight(0xfffbeb, 5.8, 9.8, 34, 403.5, F2_Y + 3.8, -63.0); // Floor 2 Mezzanine Main Flood
  addLight(0xe0f2fe, 1.8, 5.6, 26, 386.4, 4.8, -61.0, true); // Front Canopy & Fascia Wash

  const apronPoolMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  poolMats.push(apronPoolMat);
  const apronPool = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 24.0), apronPoolMat);
  apronPool.rotation.x = -Math.PI / 2;
  apronPool.position.set(386.3, F1_Y + 0.015, LG_CENTER_Z);
  apronPool.userData.noMerge = true;
  staticGroup.add(apronPool);

  let doorOpenAmount = 0;
  let shutterProgress = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: LgStoreNpcController | null
  ) => {
    const dt = Math.min(delta, 0.1);
    const isOpen = isLgStoreOpenAtHour(rawHour);
    currentOpenFactor = isOpen ? 1 : THREE.MathUtils.lerp(1, 0.25, shutterProgress);

    // Bright exterior signage & sky billboard across both day and night
    lgDiscMat.emissiveIntensity = THREE.MathUtils.lerp(0.95, 2.1, lampFactor);
    lgWordMat.emissiveIntensity = THREE.MathUtils.lerp(1.25, 2.4, lampFactor);
    lifesGoodMat.emissiveIntensity = THREE.MathUtils.lerp(1.2, 2.3, lampFactor);
    crestMat.emissiveIntensity = THREE.MathUtils.lerp(0.95, 1.9, lampFactor);
    skyBillboardMat.emissiveIntensity = THREE.MathUtils.lerp(0.75, 1.45, lampFactor);
    aquaUplightMat.emissiveIntensity = THREE.MathUtils.lerp(1.8, 3.8, lampFactor);
    fasciaSilverMat.emissiveIntensity = THREE.MathUtils.lerp(0.24, 0.52, lampFactor);

    // Super-bright showroom bulbs, LED strips, ceiling discs & OLED art blades
    bulbGlowMat.emissiveIntensity = THREE.MathUtils.lerp(2.4, 4.4, lampFactor) * currentOpenFactor;
    discGlowMat.emissiveIntensity = THREE.MathUtils.lerp(1.3, 2.6, lampFactor) * currentOpenFactor;
    brightPlenumMat.emissiveIntensity = THREE.MathUtils.lerp(0.38, 0.72, lampFactor) * currentOpenFactor;
    louverWhiteMat.emissiveIntensity = THREE.MathUtils.lerp(0.2, 0.45, lampFactor) * currentOpenFactor;
    counterGlowWhiteMat.emissiveIntensity = THREE.MathUtils.lerp(0.75, 1.35, lampFactor) * currentOpenFactor;

    let wantsDoorOpen = false;
    if (isOpen) {
      if (playerPos) {
        const dist = Math.hypot(playerPos.x - LG_DOOR_X, playerPos.z - LG_DOOR_Z);
        if (dist <= 4.6) wantsDoorOpen = true;
      }
      if (!wantsDoorOpen && npcController?.hasNpcNearDoor()) {
        wantsDoorOpen = true;
      }
    }

    const targetDoor = wantsDoorOpen ? 1 : 0;
    doorOpenAmount += (targetDoor - doorOpenAmount) * Math.min(1, dt * 6.5);
    const slideOffset = doorOpenAmount * 1.95;
    doorLeafNorth.position.z = doorLeafNorthClosedZ - slideOffset;
    doorLeafSouth.position.z = doorLeafSouthClosedZ + slideOffset;

    const npcsEmpty = npcController ? npcController.isFullyClosedAndEmpty() : true;
    const targetShutter = !isOpen && (npcsEmpty || shutterProgress > 0.05) ? 1 : 0;
    shutterProgress += (targetShutter - shutterProgress) * Math.min(1, dt * 2.2);
    setShutterProgress(shutterHandle, shutterProgress);
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => shutterProgress,
    update,
  };
}

// =========================================================================
// LG STORE NPC CONTROLLER (STAFF & SHOPPERS ACROSS FLOOR 1 & SOUTH STAIRS TO FLOOR 2)
// =========================================================================

interface LgActor {
  id: number;
  kind: 'specialist' | 'shopper';
  root: THREE.Group;
  headMesh: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  bagMesh: THREE.Mesh;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: 'browse' | 'admire' | 'walk_leave' | 'respawn_wait';
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  targetYaw: number;
  stateTimer: number;
  walkPhase: number;
  walkPhaseRef: { phase: number };
  exitRef: { idx: number };
  exitDone: boolean;
  speed: number;
  seed: number;
  glbHandle: GlbHumanHandle;
}

const F2_NPC_Y = LG_PODIUM_Y + LG_FLOOR_H;

const LG_BROWSE_SPOTS: Array<{ x: number; y: number; z: number; yaw: number }> = [
  { x: 391.4, y: LG_PODIUM_Y, z: -60.7, yaw: Math.PI / 2 },
  { x: 397.4, y: LG_PODIUM_Y, z: -61.0, yaw: Math.PI / 2 },
  { x: 395.8, y: LG_PODIUM_Y, z: -70.2, yaw: Math.PI / 2 },
  { x: 400.2, y: LG_PODIUM_Y, z: -72.2, yaw: Math.PI },
  { x: 408.4, y: LG_PODIUM_Y, z: -70.5, yaw: Math.PI / 2 },
  { x: 408.4, y: LG_PODIUM_Y, z: -66.8, yaw: Math.PI / 2 },
  { x: 408.6, y: LG_PODIUM_Y, z: -60.0, yaw: Math.PI / 2 },
  { x: 401.2, y: F2_NPC_Y, z: -69.5, yaw: Math.PI / 2 },
  { x: 406.5, y: F2_NPC_Y, z: -59.5, yaw: Math.PI / 2 },
];

function buildLgBrowseRoute(
  fromPos: THREE.Vector3,
  spot: { x: number; y: number; z: number; yaw: number },
  spawnOutside: boolean
): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];
  const startOnF2 = fromPos.y > 2.2;
  const endOnF2 = spot.y > 2.2;

  if (spawnOutside) {
    path.push(
      new THREE.Vector3(385.5, LG_PODIUM_Y, LG_DOOR_Z),
      new THREE.Vector3(390.6, LG_PODIUM_Y, LG_DOOR_Z)
    );
  }

  if (!startOnF2 && endOnF2) {
    path.push(
      new THREE.Vector3(392.2, LG_PODIUM_Y, -50.1),
      new THREE.Vector3(393.5, LG_PODIUM_Y, -50.1),
      new THREE.Vector3(402.5, F2_NPC_Y, -50.1),
      new THREE.Vector3(404.8, F2_NPC_Y, -53.2)
    );
  } else if (startOnF2 && !endOnF2) {
    path.push(
      new THREE.Vector3(404.8, F2_NPC_Y, -53.2),
      new THREE.Vector3(402.5, F2_NPC_Y, -50.1),
      new THREE.Vector3(393.5, LG_PODIUM_Y, -50.1),
      new THREE.Vector3(392.0, LG_PODIUM_Y, -55.2)
    );
  } else if (!startOnF2 && !endOnF2) {
    path.push(new THREE.Vector3(395.6, LG_PODIUM_Y, -64.5));
  } else {
    path.push(new THREE.Vector3(405.5, F2_NPC_Y, -63.0));
  }

  path.push(new THREE.Vector3(spot.x, spot.y, spot.z));
  return path;
}

function buildLgExitRoute(fromPos: THREE.Vector3, id: number): THREE.Vector3[] {
  const exitOffsetZ = id % 2 === 0 ? -0.9 : 0.9;
  const pts: THREE.Vector3[] = [];
  if (fromPos.y > 2.2) {
    pts.push(
      new THREE.Vector3(404.8, F2_NPC_Y, -53.2),
      new THREE.Vector3(402.5, F2_NPC_Y, -50.1),
      new THREE.Vector3(393.5, LG_PODIUM_Y, -50.1),
      new THREE.Vector3(391.2, LG_PODIUM_Y, -56.2)
    );
  } else {
    pts.push(new THREE.Vector3(Math.min(396.5, fromPos.x), LG_PODIUM_Y, LG_DOOR_Z));
  }
  pts.push(
    new THREE.Vector3(390.6, LG_PODIUM_Y, LG_DOOR_Z + exitOffsetZ),
    new THREE.Vector3(385.5, LG_PODIUM_Y, LG_DOOR_Z + exitOffsetZ),
    new THREE.Vector3(382.4, 0.0, LG_DOOR_Z + (id % 2 === 0 ? -5.0 : 5.0))
  );
  return pts;
}

export class LgStoreNpcController {
  public rootGroup = new THREE.Group();
  private actors: LgActor[] = [];
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;

  constructor(helpers: HospitalCharacterHelpers) {
    const bagMat = new THREE.MeshStandardMaterial({ map: createLgBagTex(), roughness: 0.45 });
    const lanyardMat = new THREE.MeshStandardMaterial({
      color: 0xd80546,
      emissive: 0xbe123c,
      emissiveIntensity: 0.35,
    });

    const configs: Array<{
      kind: 'specialist' | 'shopper';
      x: number;
      y: number;
      z: number;
      yaw: number;
      shirtHex: number;
      pantsHex: number;
      skinHex: string;
      hairHex: number;
    }> = [
      { kind: 'specialist', x: 401.2, y: LG_PODIUM_Y, z: -70.2, yaw: -Math.PI / 2, shirtHex: 0x0f172a, pantsHex: 0x1e293b, skinHex: '#f3cfb6', hairHex: 0x1c1917 },
      { kind: 'specialist', x: 396.2, y: LG_PODIUM_Y, z: -60.5, yaw: -Math.PI / 2, shirtHex: 0xd80546, pantsHex: 0x18181b, skinHex: '#ebc3a6', hairHex: 0x27272a },
      { kind: 'specialist', x: 408.5, y: F2_NPC_Y, z: -68.4, yaw: -Math.PI / 2, shirtHex: 0x0f172a, pantsHex: 0x1e293b, skinHex: '#f4d2bc', hairHex: 0x111827 },
      { kind: 'shopper', x: 391.4, y: LG_PODIUM_Y, z: -60.7, yaw: Math.PI / 2, shirtHex: 0xe0f2fe, pantsHex: 0x1e293b, skinHex: '#f5d4bd', hairHex: 0x292524 },
      { kind: 'shopper', x: 397.4, y: LG_PODIUM_Y, z: -61.0, yaw: Math.PI / 2, shirtHex: 0x38bdf8, pantsHex: 0x334155, skinHex: '#ebc3a6', hairHex: 0x18181b },
      { kind: 'shopper', x: 408.4, y: LG_PODIUM_Y, z: -70.5, yaw: Math.PI / 2, shirtHex: 0xf43f5e, pantsHex: 0x0f172a, skinHex: '#f2ccb2', hairHex: 0x3f2e21 },
      { kind: 'shopper', x: 401.2, y: F2_NPC_Y, z: -69.5, yaw: Math.PI / 2, shirtHex: 0x10b981, pantsHex: 0x0f172a, skinHex: '#f3cfb6', hairHex: 0x1c1917 },
      { kind: 'shopper', x: 406.5, y: F2_NPC_Y, z: -59.5, yaw: Math.PI / 2, shirtHex: 0xf8fafc, pantsHex: 0x1e293b, skinHex: '#f5d4bd', hairHex: 0x292524 },
    ];

    configs.forEach((cfg, idx) => {
      const grp = new THREE.Group();
      const fallbackGroup = new THREE.Group();
      grp.add(fallbackGroup);
      const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skinHex, roughness: 0.72 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: cfg.shirtHex, roughness: 0.65 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pantsHex, roughness: 0.74 });
      const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hairHex, roughness: 0.85 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.58, 0.25), shirtMat);
      torso.position.y = 1.06;
      fallbackGroup.add(torso);

      if (cfg.kind === 'specialist') {
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.02), lanyardMat);
        badge.position.set(0.09, 1.16, 0.13);
        fallbackGroup.add(badge);
      }

      const faceTex = helpers.createFaceTexture('happy', cfg.skinHex);
      const head = helpers.createHeadMesh(skinMat, faceTex, 0.34, 0.34, 0.34);
      head.position.y = 1.54;
      fallbackGroup.add(head);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.36), hairMat);
      hair.position.y = 1.69;
      fallbackGroup.add(hair);

      const makeArm = (ax: number) => {
        const p = new THREE.Group();
        p.position.set(ax, 1.3, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.13), shirtMat);
        m.position.y = -0.2;
        p.add(m);
        fallbackGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.29);
      const rightArm = makeArm(0.29);

      const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.24), bagMat);
      bagMesh.position.set(0.06, -0.44, 0.04);
      bagMesh.visible = cfg.kind === 'shopper' && idx % 2 === 1;
      rightArm.add(bagMesh);

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0.76, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.66, 0.17), pantsMat);
        leg.position.y = -0.33;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.25), shoeMat);
        shoe.position.set(0, -0.71, 0.04);
        p.add(shoe);
        fallbackGroup.add(p);
        return p;
      };
      const leftLeg = makeLeg(-0.11);
      const rightLeg = makeLeg(0.11);

      const spec =
        cfg.kind === 'specialist'
          ? idx === 0
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(idx + 31)
          : pickShopCustomerModel(idx + 37);
      const initState =
        cfg.kind === 'specialist' ? (idx === 0 ? 'Checkout' : 'Idle') : 'Walk';
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: grp,
        fallbackMeshes: [fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: initState,
        phaseOffset: idx * 0.67,
      });

      grp.position.set(cfg.x, cfg.y, cfg.z);
      grp.rotation.y = cfg.yaw;
      this.rootGroup.add(grp);

      const actor: LgActor = {
        id: idx,
        kind: cfg.kind,
        root: grp,
        headMesh: head,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        bagMesh,
        homePos: new THREE.Vector3(cfg.x, cfg.y, cfg.z),
        homeYaw: cfg.yaw,
        phase: cfg.kind === 'specialist' ? 'admire' : 'browse',
        pathQueue: [],
        pathIdx: 0,
        targetYaw: cfg.yaw,
        stateTimer: 1.4 + idx * 0.7,
        walkPhase: idx * 1.1,
        walkPhaseRef: { phase: idx * 1.1 },
        exitRef: { idx: 0 },
        exitDone: false,
        speed: 1.16 + (idx % 3) * 0.08,
        seed: idx * 1.9,
        glbHandle,
      };
      if (actor.kind === 'shopper') {
        this.assignNewSpot(actor, false);
      }
      this.actors.push(actor);
    });
  }

  private assignNewSpot(a: LgActor, spawnOutside: boolean) {
    if (spawnOutside) {
      a.root.position.set(383.2, 0.0, LG_DOOR_Z + (a.id % 2 === 0 ? -1.4 : 1.4));
    }
    const spot = LG_BROWSE_SPOTS[Math.floor(Math.random() * LG_BROWSE_SPOTS.length)];
    a.targetYaw = spot.yaw;
    a.pathQueue = buildLgBrowseRoute(a.root.position, spot, spawnOutside);
    a.pathIdx = 0;
    a.phase = 'browse';
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public hasNpcNearDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible) continue;
      const p = a.root.position;
      if (p.y < 1.2 && Math.hypot(p.x - LG_DOOR_X, p.z - LG_DOOR_Z) <= 4.0) return true;
    }
    return false;
  }

  private stepPath(a: LgActor, dt: number): boolean {
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
      a.pathIdx += 1;
      return a.pathIdx >= a.pathQueue.length;
    }

    const ratio = step / dist3D;
    a.root.position.x += dx * ratio;
    a.root.position.y += dy * ratio;
    a.root.position.z += dz * ratio;

    if (distXZ > 0.03) {
      const moveYaw = Math.atan2(dx, dz);
      let diff = moveYaw - a.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.root.rotation.y += diff * Math.min(1, dt * 8.5);
    }

    a.walkPhase += dt * 6.8;
    const swing = Math.sin(a.walkPhase) * 0.42;
    a.leftLeg.rotation.x = swing;
    a.rightLeg.rotation.x = -swing;
    a.leftArm.rotation.x = -swing * 0.52;
    a.rightArm.rotation.x = swing * 0.52;
    return false;
  }

  public update(delta: number, rawHour: number) {
    const dt = Math.min(delta, 0.1);
    this.timer += dt;
    const isOpen = isLgStoreOpenAtHour(rawHour);

    if (this.wasOpen === null) {
      this.wasOpen = isOpen;
      if (!isOpen) {
        this.closingActive = false;
        this.fullyClosedAndEmpty = true;
        this.actors.forEach((a) => {
          a.root.visible = false;
          a.exitDone = true;
        });
        return;
      }
    }

    if (this.wasOpen && !isOpen) {
      this.closingActive = true;
      this.fullyClosedAndEmpty = false;
      this.actors.forEach((a) => {
        if (!a.root.visible) {
          a.exitDone = true;
          return;
        }
        a.exitDone = false;
        a.exitRef.idx = 0;
        a.pathQueue = buildLgExitRoute(a.root.position, a.id);
        a.glbHandle.setAnimState('Walk');
      });
    } else if (!this.wasOpen && isOpen) {
      this.closingActive = false;
      this.fullyClosedAndEmpty = false;
      this.actors.forEach((a) => {
        a.exitDone = false;
        a.root.visible = true;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = 0;
        a.rightArm.rotation.x = 0;
        if (a.kind === 'specialist') {
          a.root.position.copy(a.homePos);
          a.root.rotation.y = a.homeYaw;
          a.phase = 'admire';
          a.glbHandle.setAnimState(a.id === 0 ? 'Checkout' : 'Idle');
        } else {
          this.assignNewSpot(a, true);
          a.glbHandle.setAnimState('Walk');
        }
      });
    }
    this.wasOpen = isOpen;

    if (!isOpen) {
      if (this.closingActive) {
        let allDone = true;
        this.actors.forEach((a) => {
          if (!a.exitDone) {
            const done = advanceNpcExitPath(
              a.root,
              a.pathQueue,
              a.exitRef,
              a.speed * 1.15,
              dt,
              { legL: a.leftLeg, legR: a.rightLeg, armL: a.leftArm, armR: a.rightArm },
              a.walkPhaseRef
            );
            if (done) {
              a.exitDone = true;
              a.root.visible = false;
              a.glbHandle.setAnimState('Idle');
            } else {
              allDone = false;
            }
          }
        });
        if (allDone) {
          this.closingActive = false;
          this.fullyClosedAndEmpty = true;
        }
      }
      return;
    }

    this.actors.forEach((a) => {
      if (a.kind === 'specialist') {
        a.glbHandle.setAnimState(a.id === 0 ? 'Checkout' : 'Idle');
        a.root.rotation.y = a.homeYaw + Math.sin(this.timer * 1.1 + a.seed) * 0.08;
        a.headMesh.rotation.y = Math.sin(this.timer * 0.9 + a.seed) * 0.16;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = -0.04;
        a.rightArm.rotation.x = -0.04;
        return;
      }

      if (a.phase === 'respawn_wait') {
        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          a.root.visible = true;
          a.bagMesh.visible = Math.random() > 0.4;
          this.assignNewSpot(a, true);
          a.glbHandle.setAnimState('Walk');
        }
        return;
      }

      if (a.phase === 'browse') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'admire';
          a.stateTimer = 4.0 + (a.id % 4) * 1.4;
          a.glbHandle.setAnimState('Idle');
        }
      } else if (a.phase === 'admire') {
        a.glbHandle.setAnimState('Idle');
        let diff = a.targetYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 5.0);
        a.headMesh.rotation.y = Math.sin(this.timer * 1.3 + a.seed) * 0.22;
        a.leftLeg.rotation.x = 0;
        a.rightLeg.rotation.x = 0;
        a.leftArm.rotation.x = 0;
        a.rightArm.rotation.x = a.bagMesh.visible ? -0.18 : 0;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          if (Math.random() < 0.3) {
            a.phase = 'walk_leave';
            a.bagMesh.visible = true;
            a.pathQueue = buildLgExitRoute(a.root.position, a.id);
            a.pathIdx = 0;
            a.glbHandle.setAnimState('Walk');
          } else {
            this.assignNewSpot(a, false);
            a.glbHandle.setAnimState('Walk');
          }
        }
      } else if (a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'respawn_wait';
          a.root.visible = false;
          a.stateTimer = 2.0 + (a.id % 3) * 1.2;
          a.glbHandle.setAnimState('Idle');
        }
      }
    });
  }
}
