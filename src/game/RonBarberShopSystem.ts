import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isRonBarberShopOpenAtHour,
  RollingShutterHandle,
  setShutterProgress,
} from './VenueOperatingHours';

export interface BarberCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface RonBarberShopBuildResult {
  staticGroup: THREE.Group;
  barberPoleCylinders: THREE.Mesh[];
  neonMats: THREE.MeshStandardMaterial[];
  warmLampMats: THREE.MeshStandardMaterial[];
  interiorWindowGlowMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    npcController?: RonBarberShopNpcController | null,
    doorTargetOpen?: number
  ) => void;
  getClosedFactor: () => number;
}

// Building World Placement (Opposite Sidewalk West of Ron Express Garage):
// Footprint: X = -146.5 .. -133.5 (Center X = -140.0), Z = 42.5 .. 56.5 (Center Z = 49.5)
// Front storefront faces -Z (toward boulevard Z = 37.2 .. 42.5).
export const RON_BARBER_CENTER_X = -140.0;
export const RON_BARBER_CENTER_Z = 49.5;
export const RON_BARBER_FLOOR2_Y = 4.08;

function createBarberPoleStripeTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  const colors = ['#b91c1c', '#f8fafc', '#1d4ed8', '#f8fafc'];
  const stripeW = 48;
  ctx.save();
  for (let i = -h; i < w + h; i += stripeW) {
    const idx = Math.abs(Math.floor(i / stripeW)) % colors.length;
    ctx.fillStyle = colors[idx];
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + stripeW, 0);
    ctx.lineTo(i + stripeW - h * 0.65, h);
    ctx.lineTo(i - h * 0.65, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createLuxuryMarbleFloorTexture(
  baseHex: string,
  veinGoldHex: string,
  secondaryHex: string,
  tileGrid: number = 4
): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, s, s);

  // Subtle organic marble veins
  ctx.strokeStyle = secondaryHex;
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 14; i++) {
    ctx.lineWidth = 2 + (i % 4) * 1.5;
    ctx.beginPath();
    const y0 = (i * 43) % s;
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(
      s * 0.3,
      (y0 + 70) % s,
      s * 0.65,
      (y0 - 65 + s) % s,
      s,
      (y0 + 35) % s
    );
    ctx.stroke();
  }

  // Fine golden Calacatta vein accents
  ctx.strokeStyle = veinGoldHex;
  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 7; i++) {
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const x0 = (i * 89) % s;
    ctx.moveTo(x0, 0);
    ctx.bezierCurveTo((x0 + 55) % s, s * 0.35, (x0 - 45 + s) % s, s * 0.7, (x0 + 95) % s, s);
    ctx.stroke();
  }

  // Polished stone tile seams with fine champagne grout
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = veinGoldHex;
  ctx.lineWidth = 2;
  const step = s / tileGrid;
  for (let g = 0; g <= tileGrid; g++) {
    const pos = g * step;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(s, pos);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 4;
  return tex;
}

function createWalnutSlatsTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1f1612';
  ctx.fillRect(0, 0, w, h);

  const slatCount = 16;
  const pitch = w / slatCount;
  for (let i = 0; i < slatCount; i++) {
    const sx = i * pitch;
    const grad = ctx.createLinearGradient(sx, 0, sx + pitch - 6, 0);
    grad.addColorStop(0, '#4a2e1b');
    grad.addColorStop(0.45, '#684227');
    grad.addColorStop(1, '#3b2415');
    ctx.fillStyle = grad;
    ctx.fillRect(sx + 2, 0, pitch - 7, h);

    // Thin warm gold reveal hairline every 4th slat
    if (i % 4 === 0) {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.55)';
      ctx.fillRect(sx, 0, 2, h);
    }
  }

  // Espresso wainscot dado rail horizontally
  ctx.fillStyle = '#140f0c';
  ctx.fillRect(0, h * 0.72, w, 14);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, h * 0.71, w, 4);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = 4;
  return tex;
}

function createEditorialPosterTexture(heading: string, sub: string, bgHex: string, goldHex: string): THREE.CanvasTexture {
  const w = 384;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bgHex);
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = goldHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, w - 64, h - 64);

  // Ornamental crossed shears / geometric crest
  ctx.save();
  ctx.translate(w / 2, h * 0.42);
  ctx.strokeStyle = goldHex;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-64, 56);
  ctx.lineTo(54, -64);
  ctx.moveTo(64, 56);
  ctx.lineTo(-54, -64);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-58, 70, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(58, 70, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText(heading, w / 2, h * 0.72);

  ctx.fillStyle = goldHex;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(sub, w / 2, h * 0.81);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBarberCrownSignTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 300;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#09090b');
  grad.addColorStop(0.5, '#181411');
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Brushed 24K Gold double frame
  ctx.fillStyle = '#e6c15a';
  ctx.fillRect(0, 0, w, 12);
  ctx.fillRect(0, h - 12, w, 12);
  ctx.strokeStyle = '#b48a28';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Left & Right Classic Barber Stripe Badges
  const drawPoleBadge = (bx: number) => {
    ctx.fillStyle = '#0c0a09';
    ctx.beginPath();
    ctx.roundRect(bx - 66, 44, 132, h - 88, 22);
    ctx.fill();
    ctx.strokeStyle = '#e6c15a';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bx - 36, 62, 72, h - 124, 14);
    ctx.clip();
    const stripeColors = ['#b91c1c', '#f8fafc', '#1d4ed8', '#f8fafc'];
    for (let s = -4; s < 14; s++) {
      ctx.fillStyle = stripeColors[((s % 4) + 4) % 4];
      ctx.beginPath();
      ctx.moveTo(bx - 80 + s * 22, 50);
      ctx.lineTo(bx - 58 + s * 22, 50);
      ctx.lineTo(bx - 98 + s * 22, h - 50);
      ctx.lineTo(bx - 120 + s * 22, h - 50);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  drawPoleBadge(140);
  drawPoleBadge(w - 140);

  // Luxury tagline above
  ctx.fillStyle = '#e6c15a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('★  LUXURY GENTLEMEN GROOMING LOUNGE  ★', w / 2, 54);

  // Main Title
  ctx.fillStyle = '#fef9c3';
  ctx.font = '900 104px system-ui, -apple-system, sans-serif';
  ctx.fillText('RON BARBER SHOP', w / 2, h / 2 + 2);

  // Subtitle
  ctx.fillStyle = '#d4af37';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText('TẦNG 1: CẮT TÓC NAM VIP  •  TẦNG 2: GỘI ĐẦU SPA & NHUỘM TÓC', w / 2, h - 46);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBarberBandSignTexture(title: string, sub: string, accentHex: string): THREE.CanvasTexture {
  const w = 1536;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0c0a09';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, w, 8);
  ctx.fillRect(0, h - 8, w, 8);

  ctx.fillStyle = '#fef9c3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 52px system-ui, -apple-system, sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 20);

  ctx.fillStyle = accentHex;
  ctx.font = '800 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(sub, w / 2, h / 2 + 36);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createZoneSignTexture(title: string, sub: string, borderHex: string): THREE.CanvasTexture {
  const w = 1024;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#120e0b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 56px system-ui, sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 24);

  ctx.fillStyle = borderHex;
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText(sub, w / 2, h / 2 + 38);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createRonBarberShopStructure(): RonBarberShopBuildResult {
  const shopGroup = new THREE.Group();
  shopGroup.position.set(RON_BARBER_CENTER_X, 0, RON_BARBER_CENTER_Z);

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const warmLampMats: THREE.MeshStandardMaterial[] = [];
  const interiorWindowGlowMats: THREE.MeshStandardMaterial[] = [];
  const interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }> = [];
  const barberPoleCylinders: THREE.Mesh[] = [];

  // Curated Luxury Salon Materials
  const obsidianSteelMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.34, metalness: 0.56 });
  const warmBrickWallMat = new THREE.MeshStandardMaterial({ color: 0x2c1b14, roughness: 0.84 });
  const flutedWalnutTex = createWalnutSlatsTexture();
  const flutedWalnutWallMat = new THREE.MeshStandardMaterial({
    map: flutedWalnutTex,
    roughness: 0.54,
    metalness: 0.08,
  });
  const walnutWoodMat = new THREE.MeshStandardMaterial({ color: 0x4f2f1a, roughness: 0.56 });
  const oakWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.60 });

  const f1MarbleTex = createLuxuryMarbleFloorTexture('#19191d', '#d4af37', '#3f3f46', 4);
  const f1FloorMat = new THREE.MeshStandardMaterial({
    map: f1MarbleTex,
    roughness: 0.22,
    metalness: 0.14,
  });
  const f2MarbleTex = createLuxuryMarbleFloorTexture('#ece5d8', '#c8a232', '#cabfa8', 4);
  const f2FloorMat = new THREE.MeshStandardMaterial({
    map: f2MarbleTex,
    roughness: 0.24,
    metalness: 0.10,
  });

  const creamMarbleMat = new THREE.MeshStandardMaterial({ color: 0xf7f4ef, roughness: 0.20, metalness: 0.08 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xdab446, metalness: 0.86, roughness: 0.18 });
  const champagneBrassMat = new THREE.MeshStandardMaterial({ color: 0xe7cf82, metalness: 0.78, roughness: 0.24 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.14 });
  const oxbloodLeatherMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.42, metalness: 0.10 });
  const cognacLeatherMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.44, metalness: 0.08 });
  const blackLeatherMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.40, metalness: 0.12 });
  const carpetCharcoalMat = new THREE.MeshStandardMaterial({ color: 0x261215, roughness: 0.92 });
  const velvetRopeMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 });
  const ceramicWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.16, metalness: 0.06 });
  const towelMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
  const mirrorGlassMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.05 });
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });

  const glassClearMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.05,
    metalness: 0.10,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  });

  const warmGlowLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.65,
    roughness: 0.18,
  });
  warmLampMats.push(warmGlowLedMat);

  const mirrorHaloMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde68a,
    emissiveIntensity: 1.45,
    roughness: 0.18,
  });
  warmLampMats.push(mirrorHaloMat);

  const hoodGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfda4af,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.90,
    roughness: 0.25,
    transparent: true,
    opacity: 0.76,
  });

  // 1. MARBLE FOUNDATION PLINTH, FLOOR 2 DECK & ROOF COFFER SLAB (13.0m x 14.0m)
  const floor1Slab = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.16, 14.0), f1FloorMat);
  floor1Slab.position.set(0, 0.08, 0);
  shopGroup.add(floor1Slab);

  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(13.3, 0.36, 14.3), obsidianSteelMat);
  roofSlab.position.set(0, 8.15, 0);
  shopGroup.add(roofSlab);

  // Sculpted Rooftop Cornice & Double 24K Gold Crown Moulding
  const parapetFront = new THREE.Mesh(new THREE.BoxGeometry(13.36, 0.72, 0.36), obsidianSteelMat);
  parapetFront.position.set(0, 8.60, -6.95);
  shopGroup.add(parapetFront);
  const parapetGoldCornice = new THREE.Mesh(new THREE.BoxGeometry(13.48, 0.12, 0.44), brassMat);
  parapetGoldCornice.position.set(0, 8.98, -6.96);
  shopGroup.add(parapetGoldCornice);
  [-6.48, 6.48].forEach((px) => {
    const parapetSide = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 14.0), obsidianSteelMat);
    parapetSide.position.set(px, 8.56, 0);
    shopGroup.add(parapetSide);
  });
  const parapetBack = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.62, 0.32), obsidianSteelMat);
  parapetBack.position.set(0, 8.56, 6.95);
  shopGroup.add(parapetBack);

  const crownLedStrip = new THREE.Mesh(new THREE.BoxGeometry(13.1, 0.09, 0.12), warmGlowLedMat);
  crownLedStrip.position.set(0, 8.30, -7.14);
  shopGroup.add(crownLedStrip);

  // Floor 2 Travertine Marble Deck (split cleanly around West Stairwell void local X=-6.3..-4.0, Z=+0.2..+6.6)
  const floor2MainDeck = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.24, 13.8), f2FloorMat);
  floor2MainDeck.position.set(1.2, 4.02, 0);
  shopGroup.add(floor2MainDeck);
  const floor2FrontWestDeck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.24, 7.1), f2FloorMat);
  floor2FrontWestDeck.position.set(-5.2, 4.02, -3.35);
  shopGroup.add(floor2FrontWestDeck);

  // Recessed Coffered Ceiling Trim + Warm LED Halo Coves (Floor 1 & Floor 2)
  [3.88, 7.96].forEach((ceilY) => {
    const cofferOuter = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.08, 9.4), walnutWoodMat);
    cofferOuter.position.set(0.4, ceilY, -1.6);
    shopGroup.add(cofferOuter);
    const cofferGlow = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.04, 9.5), warmGlowLedMat);
    cofferGlow.position.set(0.4, ceilY + 0.04, -1.6);
    shopGroup.add(cofferGlow);
  });

  // Exterior Side & Rear Walls clad internally with Fluted Walnut + Gold Reveal Slats
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(13.0, 8.05, 0.34), warmBrickWallMat);
  backWall.position.set(0, 4.10, 6.83);
  shopGroup.add(backWall);
  const backInnerWall = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 7.8), flutedWalnutWallMat);
  backInnerWall.rotation.y = Math.PI;
  backInnerWall.position.set(0, 4.10, 6.64);
  shopGroup.add(backInnerWall);

  [-6.35, 6.35].forEach((wx, sideIdx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.32, 8.05, 14.0), warmBrickWallMat);
    sideWall.position.set(wx, 4.10, 0);
    shopGroup.add(sideWall);
    const innerPlane = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 7.8), flutedWalnutWallMat);
    innerPlane.rotation.y = sideIdx === 0 ? Math.PI / 2 : -Math.PI / 2;
    innerPlane.position.set(wx + (sideIdx === 0 ? 0.18 : -0.18), 4.10, 0);
    shopGroup.add(innerPlane);
  });

  // Framed Backlit Editorial Grooming Posters on Interior East & West Walls
  const posterWestTex = createEditorialPosterTexture('BESPOKE FADE', 'MASTER BARBER CRAFT', '#2c1810', '#d4af37');
  const posterEastTex = createEditorialPosterTexture('HEAD SPA & CARE', 'SIGNATURE RITUAL', '#0c2320', '#eab308');
  [
    { x: -6.14, y: 2.15, z: 1.5, ry: Math.PI / 2, tex: posterWestTex },
    { x: 6.14, y: 2.15, z: 1.5, ry: -Math.PI / 2, tex: posterEastTex },
    { x: -6.14, y: 6.0, z: -2.2, ry: Math.PI / 2, tex: posterEastTex },
    { x: 6.14, y: 6.0, z: -5.1, ry: -Math.PI / 2, tex: posterWestTex },
  ].forEach((p) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.55, 1.18), brassMat);
    frame.position.set(p.x, p.y, p.z);
    frame.rotation.y = p.ry === Math.PI / 2 || p.ry === -Math.PI / 2 ? 0 : p.ry;
    shopGroup.add(frame);

    const pMat = new THREE.MeshStandardMaterial({
      map: p.tex,
      emissive: 0xffffff,
      emissiveMap: p.tex,
      emissiveIntensity: 0.34,
      roughness: 0.3,
    });
    neonMats.push(pMat);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.42), pMat);
    art.rotation.y = p.ry;
    art.position.set(p.x + (p.x < 0 ? 0.04 : -0.04), p.y, p.z);
    shopGroup.add(art);
  });

  // Front Structural Black-Marble Piers with Double Champagne Brass Inlays & Wall Sconces
  [-6.25, -3.65, -1.65, 1.65, 3.65, 6.25].forEach((px) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.48, 8.15, 0.48), obsidianSteelMat);
    pier.position.set(px, 4.12, -6.90);
    shopGroup.add(pier);
    [-0.12, 0.12].forEach((offX) => {
      const brassStrip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 7.90, 0.04), champagneBrassMat);
      brassStrip.position.set(px + offX, 4.10, -7.15);
      shopGroup.add(brassStrip);
    });
    // Brass Architectural Pillar Sconces on outer piers
    if (Math.abs(px) > 1.8) {
      const sconceCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 10), brassMat);
      sconceCyl.position.set(px, 2.35, -7.22);
      shopGroup.add(sconceCyl);
      const sconceGlowTop = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), warmGlowLedMat);
      sconceGlowTop.position.set(px, 2.60, -7.22);
      shopGroup.add(sconceGlowTop);
    }
  });

  // Floor 1 & Floor 2 Front Spandrel Beams with Gold Molding
  const f1Spandrel = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.72, 0.46), obsidianSteelMat);
  f1Spandrel.position.set(0, 3.92, -6.92);
  shopGroup.add(f1Spandrel);
  const f1GoldTrim = new THREE.Mesh(new THREE.BoxGeometry(13.1, 0.07, 0.50), brassMat);
  f1GoldTrim.position.set(0, 3.55, -6.94);
  shopGroup.add(f1GoldTrim);

  // Floor 1 Front Panoramic Glass (leaving Center Entry Open: local X = -1.45 .. +1.45)
  [-5.0, -2.65, 2.65, 5.0].forEach((gx) => {
    const winW = Math.abs(gx) > 4 ? 2.15 : 1.56;
    const winFrameBot = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.14, 0.50, 0.22), obsidianSteelMat);
    winFrameBot.position.set(gx, 0.32, -6.92);
    shopGroup.add(winFrameBot);
    const winBrassSill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.16, 0.05, 0.24), brassMat);
    winBrassSill.position.set(gx, 0.58, -6.92);
    shopGroup.add(winBrassSill);
    const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(winW, 3.00), glassClearMat);
    winGlass.rotation.y = Math.PI;
    winGlass.position.set(gx, 2.08, -6.92);
    shopGroup.add(winGlass);
  });

  // Animated Double Glass Luxury Entry Doors (closed cleanly at night after 21:00!)
  const buildEntryDoorLeaf = (isLeft: boolean) => {
    const leafPivot = new THREE.Group();
    leafPivot.userData.noMerge = true;
    leafPivot.position.set(isLeft ? -1.42 : 1.42, 1.66, -6.90);
    leafPivot.rotation.y = isLeft ? -0.95 : 0.95;

    const leafFrame = new THREE.Mesh(new THREE.BoxGeometry(1.38, 2.98, 0.065), obsidianSteelMat);
    leafFrame.position.set(isLeft ? 0.69 : -0.69, 0, 0);
    leafPivot.add(leafFrame);

    const brassBorder = new THREE.Mesh(new THREE.BoxGeometry(1.24, 2.84, 0.072), brassMat);
    brassBorder.position.set(isLeft ? 0.69 : -0.69, 0, 0);
    leafPivot.add(brassBorder);

    const leafGlass = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2.74, 0.08), glassClearMat);
    leafGlass.position.set(isLeft ? 0.69 : -0.69, 0, 0);
    leafPivot.add(leafGlass);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.85, 10), champagneBrassMat);
    handle.position.set(isLeft ? 1.24 : -1.24, 0, -0.08);
    leafPivot.add(handle);

    shopGroup.add(leafPivot);
    return leafPivot;
  };
  const doorLeft = buildEntryDoorLeaf(true);
  const doorRight = buildEntryDoorLeaf(false);

  // Automatic Rolling Security Shutter for Closing Hours (21:00 - 07:00)
  const shutterTex = createRollingShutterTexture({
    title: 'RON BARBER SHOP',
    hoursLabel: 'GIỜ MỞ CỬA  •  07:00 - 21:00',
    accentHex: '#d4af37',
    slatDarkHex: '#18181b',
    slatLightHex: '#3f3f46',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.45,
    metalness: 0.55,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    shopGroup,
    {
      id: 'ron_barber_main',
      axis: 'x',
      pos: -7.02,
      spanCenter: 0,
      width: 3.10,
      baseY: 0.08,
      topY: 3.22,
    },
    shutterMat,
    obsidianSteelMat
  );

  // Projecting Entrance Canopy + Warm Fluted Wood Soffit + Recessed Brass Halo Downlights
  const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.24, 2.0), obsidianSteelMat);
  canopyRoof.position.set(0, 3.45, -7.90);
  shopGroup.add(canopyRoof);
  const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(5.90, 0.08, 2.08), brassMat);
  canopyTrim.position.set(0, 3.57, -7.90);
  shopGroup.add(canopyTrim);
  const canopySoffit = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.05, 1.78), oakWoodMat);
  canopySoffit.position.set(0, 3.31, -7.86);
  shopGroup.add(canopySoffit);
  [-1.8, -0.6, 0.6, 1.8].forEach((dlx) => {
    const dl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12), warmGlowLedMat);
    dl.position.set(dlx, 3.28, -7.86);
    shopGroup.add(dl);
  });

  // VIP Sidewalk Velvet Carpet Runner + Brass Stanchions Flanking Doorway (leaves center open!)
  const vipCarpet = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.025, 2.35), carpetCharcoalMat);
  vipCarpet.position.set(0, 0.015, -8.15);
  shopGroup.add(vipCarpet);
  [-1.32, 1.32].forEach((bx) => {
    const goldEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.028, 2.35), brassMat);
    goldEdge.position.set(bx, 0.016, -8.15);
    shopGroup.add(goldEdge);
  });
  [-1.56, 1.56].forEach((sx) => {
    [-7.55, -8.85].forEach((sz) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.04, 12), brassMat);
      base.position.set(sx, 0.02, sz);
      shopGroup.add(base);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.86, 10), brassMat);
      post.position.set(sx, 0.45, sz);
      shopGroup.add(post);
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), champagneBrassMat);
      finial.position.set(sx, 0.90, sz);
      shopGroup.add(finial);
    });
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.30, 8), velvetRopeMat);
    rope.rotation.x = Math.PI / 2;
    rope.position.set(sx, 0.78, -8.20);
    shopGroup.add(rope);
  });

  // Floor 2 Panoramic Glass Facade + Tempered Glass Juliet Balcony with Champagne Brass Cap
  [
    { x: -4.95, w: 2.15 },
    { x: -2.65, w: 1.56 },
    { x: 0.0, w: 2.86 },
    { x: 2.65, w: 1.56 },
    { x: 4.95, w: 2.15 },
  ].forEach((pane) => {
    const glass2 = new THREE.Mesh(new THREE.PlaneGeometry(pane.w, 3.35), glassClearMat);
    glass2.rotation.y = Math.PI;
    glass2.position.set(pane.x, 5.95, -6.92);
    shopGroup.add(glass2);
  });

  const balconyDeck2 = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.12, 0.65), obsidianSteelMat);
  balconyDeck2.position.set(0, 4.14, -7.25);
  shopGroup.add(balconyDeck2);
  const balconyGlass2 = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.92, 0.05), glassClearMat);
  balconyGlass2.position.set(0, 4.66, -7.52);
  shopGroup.add(balconyGlass2);
  const balconyRail2 = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.08, 0.10), brassMat);
  balconyRail2.position.set(0, 5.14, -7.52);
  shopGroup.add(balconyRail2);

  // 2. ILLUMINATED LUXURY SIGNBOARDS + ROTATING BRASS-CROWNED BARBER POLES
  const crownTex = createBarberCrownSignTexture();
  const crownMat = new THREE.MeshStandardMaterial({
    map: crownTex,
    emissive: 0xffffff,
    emissiveMap: crownTex,
    emissiveIntensity: 0.58,
    roughness: 0.22,
  });
  neonMats.push(crownMat);

  const crownFrame = new THREE.Mesh(new THREE.BoxGeometry(13.0, 1.92, 0.26), obsidianSteelMat);
  crownFrame.position.set(0, 9.32, -7.12);
  shopGroup.add(crownFrame);
  const crownBrassBezel = new THREE.Mesh(new THREE.BoxGeometry(13.08, 1.98, 0.18), brassMat);
  crownBrassBezel.position.set(0, 9.32, -7.08);
  shopGroup.add(crownBrassBezel);
  const crownSign = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 1.70), crownMat);
  crownSign.rotation.y = Math.PI;
  crownSign.position.set(0, 9.32, -7.27);
  shopGroup.add(crownSign);

  const midBandTex = createBarberBandSignTexture(
    'CUTTING  •  SHAMPOO SPA  •  HAIR COLOR',
    'LUXURY GENTLEMEN SALON   •   MỞ CỬA 07:00 - 21:00',
    '#e6c15a'
  );
  const midBandMat = new THREE.MeshStandardMaterial({
    map: midBandTex,
    emissive: 0xffffff,
    emissiveMap: midBandTex,
    emissiveIntensity: 0.52,
    roughness: 0.24,
  });
  neonMats.push(midBandMat);
  const midBandSign = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 0.64), midBandMat);
  midBandSign.rotation.y = Math.PI;
  midBandSign.position.set(0, 3.92, -7.18);
  shopGroup.add(midBandSign);

  // Classic Rotating Barber Poles with Ornate Brass Caps
  const poleStripeTex = createBarberPoleStripeTexture();
  const poleStripeMat = new THREE.MeshStandardMaterial({
    map: poleStripeTex,
    emissive: 0xffffff,
    emissiveMap: poleStripeTex,
    emissiveIntensity: 0.38,
    roughness: 0.22,
  });
  neonMats.push(poleStripeMat);

  [-3.65, 3.65].forEach((px) => {
    const bracketTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.28), brassMat);
    bracketTop.position.set(px, 2.98, -7.22);
    shopGroup.add(bracketTop);
    const bracketBot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.28), brassMat);
    bracketBot.position.set(px, 1.66, -7.22);
    shopGroup.add(bracketBot);

    const poleCapTop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.15, 16), brassMat);
    poleCapTop.position.set(px, 2.90, -7.34);
    shopGroup.add(poleCapTop);
    const poleCapBot = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.12, 0.16, 16), brassMat);
    poleCapBot.position.set(px, 1.72, -7.34);
    shopGroup.add(poleCapBot);
    const poleFinial = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 14), warmGlowLedMat);
    poleFinial.position.set(px, 3.06, -7.34);
    shopGroup.add(poleFinial);

    const stripeCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 1.06, 20), poleStripeMat);
    stripeCyl.position.set(px, 2.31, -7.34);
    stripeCyl.userData.noMerge = true;
    shopGroup.add(stripeCyl);
    barberPoleCylinders.push(stripeCyl);

    const glassSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.158, 1.08, 18), glassClearMat);
    glassSleeve.position.set(px, 2.31, -7.34);
    shopGroup.add(glassSleeve);
  });

  // Sculpted Marble Boxwood Topiaries flanking facade
  [-4.6, 4.6].forEach((px) => {
    const pot = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.62, 0.80), obsidianSteelMat);
    pot.position.set(px, 0.31, -7.65);
    shopGroup.add(pot);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.84), brassMat);
    trim.position.set(px, 0.64, -7.65);
    shopGroup.add(trim);
    const uplight = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 12), warmGlowLedMat);
    uplight.position.set(px, 0.68, -7.65);
    shopGroup.add(uplight);
    const tier1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), shrubMat);
    tier1.position.set(px, 1.00, -7.65);
    shopGroup.add(tier1);
    const tier2 = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.72, 10), shrubMat);
    tier2.position.set(px, 1.46, -7.65);
    shopGroup.add(tier2);
  });

  // 3. FLOOR 1 INTERIOR — KHU CẮT TÓC NAM VIP (Y = 0.16 .. 3.90)
  const buildBarberStation = (sx: number, sz: number, rotY: number) => {
    const st = new THREE.Group();
    st.position.set(sx, 0.16, sz);
    st.rotation.y = rotY;

    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(1.90, 2.72, 0.12), walnutWoodMat);
    backPanel.position.set(0, 1.36, -0.58);
    st.add(backPanel);
    const ledHalo = new THREE.Mesh(new THREE.BoxGeometry(1.46, 1.62, 0.04), mirrorHaloMat);
    ledHalo.position.set(0, 1.64, -0.50);
    st.add(ledHalo);
    const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.52, 0.06), brassMat);
    mirrorFrame.position.set(0, 1.64, -0.47);
    st.add(mirrorFrame);
    const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 1.38), mirrorGlassMat);
    mirrorFace.position.set(0, 1.64, -0.43);
    st.add(mirrorFace);

    // Calacatta Marble Vanity Counter + Grooming Bottles
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.78, 0.52), walnutWoodMat);
    counter.position.set(0, 0.39, -0.32);
    st.add(counter);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.06, 0.56), creamMarbleMat);
    counterTop.position.set(0, 0.81, -0.32);
    st.add(counterTop);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 10), glassClearMat);
    jar.position.set(-0.52, 0.93, -0.32);
    st.add(jar);
    const jarFluid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.45 })
    );
    jarFluid.position.set(-0.52, 0.90, -0.32);
    st.add(jarFluid);
    const sprayBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.18, 10), brassMat);
    sprayBottle.position.set(0.48, 0.93, -0.30);
    st.add(sprayBottle);

    // Luxury Tufted Oxblood Leather Hydraulic Barber Chair
    const chairZ = 0.85;
    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 0.06, 18), brassMat);
    baseDisc.position.set(0, 0.03, chairZ);
    st.add(baseDisc);
    const hydraulicCol = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.40, 12), chromeMat);
    hydraulicCol.position.set(0, 0.25, chairZ);
    st.add(hydraulicCol);
    const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.14, 0.58), oxbloodLeatherMat);
    seatCushion.position.set(0, 0.50, chairZ);
    st.add(seatCushion);
    const backRest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.60, 0.14), oxbloodLeatherMat);
    backRest.position.set(0, 0.82, chairZ + 0.24);
    backRest.rotation.x = 0.14;
    st.add(backRest);
    const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.12), oxbloodLeatherMat);
    headRest.position.set(0, 1.18, chairZ + 0.30);
    st.add(headRest);
    [-0.35, 0.35].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.54), oxbloodLeatherMat);
      arm.position.set(ax, 0.72, chairZ + 0.02);
      st.add(arm);
      const armSupport = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.08), brassMat);
      armSupport.position.set(ax, 0.58, chairZ + 0.04);
      st.add(armSupport);
    });
    const footRestBar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.22), brassMat);
    footRestBar.position.set(0, 0.18, chairZ - 0.38);
    st.add(footRestBar);

    const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.78, 0.36), obsidianSteelMat);
    trolley.position.set(0.74, 0.42, chairZ - 0.05);
    st.add(trolley);
    const trolleyTray = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), brassMat);
    trolleyTray.position.set(0.74, 0.82, chairZ - 0.05);
    st.add(trolleyTray);

    shopGroup.add(st);
  };

  buildBarberStation(-0.8, 2.4, Math.PI);
  buildBarberStation(1.9, 2.4, Math.PI);
  buildBarberStation(4.6, 2.4, Math.PI);
  buildBarberStation(5.2, -2.6, -Math.PI / 2);

  // Feature Divider Wall behind Floor 1 Stations + Illuminated Gold Zone Sign
  const f1DividerWall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.65, 0.22), flutedWalnutWallMat);
  f1DividerWall.position.set(1.8, 1.98, 3.12);
  shopGroup.add(f1DividerWall);

  const f1ZoneSignTex = createZoneSignTexture(
    'GENTLEMEN CUTS & SHAVE',
    'TẦNG 1  •  CẮT TÓC NAM VIP  •  CẠO MẶT  •  STYLING',
    '#e6c15a'
  );
  const f1ZoneSignMat = new THREE.MeshStandardMaterial({
    map: f1ZoneSignTex,
    emissive: 0xffffff,
    emissiveMap: f1ZoneSignTex,
    emissiveIntensity: 0.50,
    roughness: 0.22,
  });
  neonMats.push(f1ZoneSignMat);
  const f1ZoneSign = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.15), f1ZoneSignMat);
  f1ZoneSign.rotation.y = Math.PI;
  f1ZoneSign.position.set(1.9, 3.05, 2.98);
  shopGroup.add(f1ZoneSign);

  // Reception & Concierge Marble Counter (Front-West: local X = -4.1, Z = -3.7)
  const recDesk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.04, 0.72), walnutWoodMat);
  recDesk.position.set(-4.1, 0.68, -3.7);
  shopGroup.add(recDesk);
  const recBrassBand = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.08, 0.75), brassMat);
  recBrassBand.position.set(-4.1, 0.68, -3.7);
  shopGroup.add(recBrassBand);
  const recTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.07, 0.80), creamMarbleMat);
  recTop.position.set(-4.1, 1.23, -3.7);
  shopGroup.add(recTop);
  const recScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.30, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.85 })
  );
  recScreen.position.set(-4.1, 1.42, -3.72);
  shopGroup.add(recScreen);

  // Pomade & Cologne Retail Display Cabinet (local X = -5.98, Z = -2.4)
  const pomadeRack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.40, 2.45), obsidianSteelMat);
  pomadeRack.position.set(-5.98, 1.36, -2.4);
  shopGroup.add(pomadeRack);
  const rackHalo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.25, 2.25), warmGlowLedMat);
  rackHalo.position.set(-5.78, 1.36, -2.4);
  shopGroup.add(rackHalo);
  [0.85, 1.45, 2.05].forEach((sy, rIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 2.3), brassMat);
    shelf.position.set(-5.94, sy, -2.4);
    shopGroup.add(shelf);
    for (let pz = -3.3; pz <= -1.5; pz += 0.36) {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.14, 10),
        (rIdx + Math.round(pz * 3)) % 2 === 0 ? brassMat : oxbloodLeatherMat
      );
      jar.position.set(-5.88, sy + 0.09, pz);
      shopGroup.add(jar);
    }
  });

  // VIP Cognac Leather Waiting Lounge + Marble Coffee Table & Decanter Tray
  const waitSofaSeat = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 0.82), cognacLeatherMat);
  waitSofaSeat.position.set(-4.2, 0.37, -0.4);
  shopGroup.add(waitSofaSeat);
  const waitSofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.62, 0.18), cognacLeatherMat);
  waitSofaBack.position.set(-4.2, 0.72, -0.05);
  shopGroup.add(waitSofaBack);
  const waitTable = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.36, 0.58), creamMarbleMat);
  waitTable.position.set(-4.2, 0.34, -1.55);
  shopGroup.add(waitTable);
  const decanter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 10), champagneBrassMat);
  decanter.position.set(-4.35, 0.63, -1.55);
  shopGroup.add(decanter);
  const magStack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.22), oxbloodLeatherMat);
  magStack.position.set(-3.95, 0.54, -1.55);
  shopGroup.add(magStack);

  // Indoor Ribbed Brass Planter with Fiddle-Leaf Tree near Reception
  const loungePot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.52, 12), brassMat);
  loungePot.position.set(-5.6, 0.42, -5.8);
  shopGroup.add(loungePot);
  const loungeFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), shrubMat);
  loungeFoliage.position.set(-5.6, 1.05, -5.8);
  shopGroup.add(loungeFoliage);

  // Illuminated Floating Oak & Black-Steel Staircase (West Rear Stairwell: local X = -5.2, Z = +0.8 .. +6.4)
  for (let step = 0; step < 12; step++) {
    const t = step / 11;
    const sy = 0.32 + t * 3.68;
    const sz = 0.85 + step * 0.46;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.10, 0.42), oakWoodMat);
    tread.position.set(-5.2, sy, sz);
    shopGroup.add(tread);
    const treadLed = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.025, 0.04), warmGlowLedMat);
    treadLed.position.set(-5.2, sy + 0.05, sz - 0.19);
    shopGroup.add(treadLed);
  }
  const stairStringer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 6.2), obsidianSteelMat);
  stairStringer.position.set(-4.22, 2.1, 3.4);
  stairStringer.rotation.x = -0.64;
  shopGroup.add(stairStringer);

  // Floor 2 Stairwell Glass Safety Guardrail (leaves rear localZ = +4.4..+6.5 open as Floor 2 top landing)
  const f2StairRailFront = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.96, 0.05), glassClearMat);
  f2StairRailFront.position.set(-5.15, 4.62, 0.25);
  shopGroup.add(f2StairRailFront);
  const f2StairRailSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.96, 4.2), glassClearMat);
  f2StairRailSide.position.set(-3.98, 4.62, 2.35);
  shopGroup.add(f2StairRailSide);
  const f2RailCapSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 4.25), brassMat);
  f2RailCapSide.position.set(-3.98, 5.12, 2.35);
  shopGroup.add(f2RailCapSide);

  // Designer Brass & Crystal Ring Chandeliers (Floor 1 & Floor 2)
  [-2.2, 1.0, 4.0].forEach((px) => {
    [-3.6, -0.4].forEach((pz) => {
      [
        { stemY: 3.48, ringY: 3.04 },
        { stemY: 7.56, ringY: 7.12 },
      ].forEach((lv) => {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 6), obsidianSteelMat);
        cord.position.set(px, lv.stemY, pz);
        shopGroup.add(cord);
        const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.032, 8, 22), brassMat);
        haloRing.rotation.x = Math.PI / 2;
        haloRing.position.set(px, lv.ringY, pz);
        shopGroup.add(haloRing);
        const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.024, 8, 20), warmGlowLedMat);
        ledRing.rotation.x = Math.PI / 2;
        ledRing.position.set(px, lv.ringY - 0.02, pz);
        shopGroup.add(ledRing);
      });
    });
  });

  // 4. FLOOR 2 INTERIOR — KHU GỘI ĐẦU SPA & NHUỘM TÓC LUXURY (Y = 4.14 .. 8.0)
  const buildShampooWashUnit = (wx: number, wz: number) => {
    const unit = new THREE.Group();
    unit.position.set(wx, 4.14, wz);

    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 1.54), walnutWoodMat);
    bedBase.position.set(0, 0.21, 0);
    unit.add(bedBase);
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.16, 1.40), blackLeatherMat);
    cushion.position.set(0, 0.48, -0.08);
    cushion.rotation.x = -0.10;
    unit.add(cushion);
    const legRest = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.48), blackLeatherMat);
    legRest.position.set(0, 0.36, -0.82);
    legRest.rotation.x = 0.28;
    unit.add(legRest);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.22), towelMat);
    pillow.position.set(0, 0.58, 0.42);
    unit.add(pillow);

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.52), ceramicWhiteMat);
    pedestal.position.set(0, 0.36, 0.92);
    unit.add(pedestal);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.26, 16), ceramicWhiteMat);
    bowl.position.set(0, 0.80, 0.86);
    unit.add(bowl);
    const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 8), brassMat);
    faucetStem.position.set(0, 0.98, 1.04);
    unit.add(faucetStem);
    const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.08, 10), brassMat);
    showerHead.position.set(0, 1.06, 0.94);
    showerHead.rotation.x = 0.85;
    unit.add(showerHead);

    shopGroup.add(unit);
  };

  buildShampooWashUnit(-2.7, -2.8);
  buildShampooWashUnit(-1.0, -2.8);
  buildShampooWashUnit(0.7, -2.8);

  // Backlit Cedar Spa Backdrop & Gold Trim
  const spaBackdrop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.6, 0.22), walnutWoodMat);
  spaBackdrop.position.set(-1.0, 5.94, 1.25);
  shopGroup.add(spaBackdrop);

  const f2SpaSignTex = createZoneSignTexture(
    'GỘI ĐẦU THƯ GIÃN VIP',
    'HEAD SPA  •  MASSAGE CỔ VAI GÁY  •  THẢO DƯỢC',
    '#34d399'
  );
  const f2SpaSignMat = new THREE.MeshStandardMaterial({
    map: f2SpaSignTex,
    emissive: 0xffffff,
    emissiveMap: f2SpaSignTex,
    emissiveIntensity: 0.48,
    roughness: 0.24,
  });
  neonMats.push(f2SpaSignMat);
  const f2SpaSign = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.86), f2SpaSignMat);
  f2SpaSign.rotation.y = Math.PI;
  f2SpaSign.position.set(-1.0, 7.05, 1.12);
  shopGroup.add(f2SpaSign);

  const spaShelf = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 0.38), creamMarbleMat);
  spaShelf.position.set(-1.0, 5.42, 0.96);
  shopGroup.add(spaShelf);
  for (let t = -2.6; t <= -0.4; t += 0.36) {
    const towelRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 10), towelMat);
    towelRoll.rotation.x = Math.PI / 2;
    towelRoll.position.set(t, 5.53, 0.96);
    shopGroup.add(towelRoll);
  }
  [0.1, 0.45, 0.8, 1.15].forEach((bx, bIdx) => {
    const bMat = new THREE.MeshStandardMaterial({
      color: bIdx % 2 === 0 ? 0x10b981 : 0xf59e0b,
      roughness: 0.35,
    });
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 10), bMat);
    bottle.position.set(bx, 5.57, 0.96);
    shopGroup.add(bottle);
  });

  // Zone 2B: COLOR STUDIO
  const f2ColorSignTex = createZoneSignTexture(
    'COLOR STUDIO • NHUỘM TÓC',
    'BALAYAGE  •  HIGHLIGHT  •  PHỤC HỒI KERATIN',
    '#f472b6'
  );
  const f2ColorSignMat = new THREE.MeshStandardMaterial({
    map: f2ColorSignTex,
    emissive: 0xffffff,
    emissiveMap: f2ColorSignTex,
    emissiveIntensity: 0.48,
    roughness: 0.24,
  });
  neonMats.push(f2ColorSignMat);
  const f2ColorSign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.86), f2ColorSignMat);
  f2ColorSign.rotation.y = Math.PI;
  f2ColorSign.position.set(3.8, 7.05, 6.45);
  shopGroup.add(f2ColorSign);

  const colorBar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.92, 0.72), obsidianSteelMat);
  colorBar.position.set(3.8, 4.60, 5.2);
  shopGroup.add(colorBar);
  const colorBarTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.06, 0.78), creamMarbleMat);
  colorBarTop.position.set(3.8, 5.09, 5.2);
  shopGroup.add(colorBarTop);

  const dyeColors = [0x38bdf8, 0xf472b6, 0xa855f7, 0xf59e0b, 0x34d399, 0xef4444, 0xcbd5e1, 0x60a5fa];
  [5.25, 5.65, 6.05].forEach((sy, rowIdx) => {
    const dyeShelf = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.04, 0.24), brassMat);
    dyeShelf.position.set(3.8, sy, 6.45);
    shopGroup.add(dyeShelf);
    for (let dx = 1.9; dx <= 5.7; dx += 0.42) {
      const colHex = dyeColors[(Math.round(dx * 3) + rowIdx * 2) % dyeColors.length];
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.05, 0.24, 8),
        new THREE.MeshStandardMaterial({ color: colHex, emissive: colHex, emissiveIntensity: 0.25, roughness: 0.35 })
      );
      tube.position.set(dx, sy + 0.14, 6.44);
      shopGroup.add(tube);
    }
  });

  [-3.6, -0.8].forEach((cz) => {
    const mirror2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.48, 1.35), brassMat);
    mirror2.position.set(6.05, 5.72, cz);
    shopGroup.add(mirror2);
    const mirrorFace2 = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 1.34), mirrorGlassMat);
    mirrorFace2.rotation.y = -Math.PI / 2;
    mirrorFace2.position.set(6.00, 5.72, cz);
    shopGroup.add(mirrorFace2);
    const halo2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.56, 1.44), mirrorHaloMat);
    halo2.position.set(6.09, 5.72, cz);
    shopGroup.add(halo2);

    const chairPed = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.06, 14), brassMat);
    chairPed.position.set(4.9, 4.17, cz);
    shopGroup.add(chairPed);
    const chairCol = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 10), chromeMat);
    chairCol.position.set(4.9, 4.38, cz);
    shopGroup.add(chairCol);
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.52), blackLeatherMat);
    chairSeat.position.set(4.9, 4.62, cz);
    shopGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.52), blackLeatherMat);
    chairBack.position.set(4.66, 4.92, cz);
    shopGroup.add(chairBack);
  });

  const dryerChairPed = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.06, 14), brassMat);
  dryerChairPed.position.set(3.1, 4.17, -2.5);
  shopGroup.add(dryerChairPed);
  const dryerChairCol = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 10), chromeMat);
  dryerChairCol.position.set(3.1, 4.38, -2.5);
  shopGroup.add(dryerChairCol);
  const dryerSeat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.54), oxbloodLeatherMat);
  dryerSeat.position.set(3.1, 4.62, -2.5);
  shopGroup.add(dryerSeat);
  const dryerBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.50, 0.12), oxbloodLeatherMat);
  dryerBack.position.set(3.1, 4.90, -2.26);
  shopGroup.add(dryerBack);

  const hoodStandBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 12), obsidianSteelMat);
  hoodStandBase.position.set(3.1, 4.18, -1.65);
  shopGroup.add(hoodStandBase);
  const hoodStandPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.85, 10), brassMat);
  hoodStandPole.position.set(3.1, 5.10, -1.65);
  shopGroup.add(hoodStandPole);
  const hoodArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.85), brassMat);
  hoodArm.position.set(3.1, 5.96, -2.05);
  shopGroup.add(hoodArm);
  const hoodDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hoodGlowMat
  );
  hoodDome.position.set(3.1, 5.66, -2.44);
  shopGroup.add(hoodDome);
  const hoodRing = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.03, 8, 20), brassMat);
  hoodRing.rotation.x = Math.PI / 2;
  hoodRing.position.set(3.1, 5.56, -2.44);
  shopGroup.add(hoodRing);

  // 5. WARM LUXURY INTERIOR POINT LIGHTS (Floor 1 & Floor 2)
  const f1Light = new THREE.PointLight(0xffedd5, 22.0, 26.0, 1.05);
  f1Light.position.set(RON_BARBER_CENTER_X + 0.5, 3.25, RON_BARBER_CENTER_Z - 1.5);
  interiorPointLights.push({ light: f1Light, dayInt: 22.0, nightInt: 48.0 });

  const f2Light = new THREE.PointLight(0xfef3c7, 24.0, 26.0, 1.05);
  f2Light.position.set(RON_BARBER_CENTER_X + 0.5, 7.25, RON_BARBER_CENTER_Z - 1.5);
  interiorPointLights.push({ light: f2Light, dayInt: 24.0, nightInt: 50.0 });

  let wasOpen: boolean | null = null;
  let closingElapsed = 0;
  let doorOpenAmount = 1.0;

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    npcController?: RonBarberShopNpcController | null,
    doorTargetOpen?: number
  ) => {
    const isOpen = isRonBarberShopOpenAtHour(rawHour);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (rawHour < 7.0 || rawHour >= 21.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, Math.max(0, mainShutter.progress - delta * 1.1));
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
    } else {
      closingElapsed += delta;
      const canClose = closingElapsed >= 16.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.8) {
        setShutterProgress(mainShutter, Math.min(1.0, mainShutter.progress + delta * 0.72));
      }
    }
    wasOpen = isOpen;

    const litScale = 1 - mainShutter.progress;
    crownMat.emissiveIntensity = 0.58 * litScale;
    midBandMat.emissiveIntensity = 0.52 * litScale;
    poleStripeMat.emissiveIntensity = 0.38 * litScale;
    f1ZoneSignMat.emissiveIntensity = 0.50 * litScale;
    f2SpaSignMat.emissiveIntensity = 0.48 * litScale;
    f2ColorSignMat.emissiveIntensity = 0.48 * litScale;
    warmGlowLedMat.emissiveIntensity = 1.65 * litScale;
    mirrorHaloMat.emissiveIntensity = 1.45 * litScale;

    // Swing double entry doors open during operating hours or evacuation, close cleanly at lockup
    const targetDoor =
      isOpen || Boolean(npcController?.hasExitingNpcNearDoor())
        ? doorTargetOpen !== undefined
          ? Math.max(0.75, doorTargetOpen)
          : 0.78
        : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetDoor, Math.min(1, delta * 5.0));
    doorLeft.rotation.y = -doorOpenAmount * 1.18;
    doorRight.rotation.y = doorOpenAmount * 1.18;
  };

  return {
    staticGroup: shopGroup,
    barberPoleCylinders,
    neonMats,
    warmLampMats,
    interiorWindowGlowMats,
    interiorPointLights,
    doorLeft,
    doorRight,
    updateOperatingHours,
    getClosedFactor: () => mainShutter.progress,
  };
}

interface BarberNpcRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  capeMesh?: THREE.Mesh;
  glbHandle?: GlbHumanHandle;
}

interface BarberPatronActor {
  rig: BarberNpcRig;
  state:
    | 'stroll_in'
    | 'enter_door'
    | 'check_in'
    | 'walk_to_service'
    | 'in_service'
    | 'walk_to_door'
    | 'exit_sidewalk';
  stationIdx: number;
  waypoints: THREE.Vector3[];
  wpIdx: number;
  timer: number;
  sidewalkDir: -1 | 1;
  walkPhase: number;
  phaseOffset: number;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitPhaseRef?: { phase: number };
  exitDone?: boolean;
}

interface ServiceStationSpec {
  id: string;
  floor: 1 | 2;
  seatPos: THREE.Vector3;
  seatYaw: number;
  seatHipY: number;
  isReclined?: boolean;
  pathIn: THREE.Vector3[];
  pathOut: THREE.Vector3[];
  waitDuration: number;
}

export class RonBarberShopNpcController {
  public readonly rootGroup = new THREE.Group();
  private barberPoleCylinders: THREE.Mesh[];
  private stylists: Array<
    BarberNpcRig & {
      mode: 'cut' | 'shampoo' | 'color' | 'reception';
      phaseOffset: number;
      homePos: THREE.Vector3;
      baseYaw: number;
      floor: 1 | 2;
      exitPath?: THREE.Vector3[];
      exitWpRef?: { idx: number };
      exitPhaseRef?: { phase: number };
      exitDone?: boolean;
    }
  > = [];
  private seatedClients: Array<
    BarberNpcRig & {
      mode: 'cut_chair' | 'shampoo_recline' | 'color_hood';
      phaseOffset: number;
      homePos: THREE.Vector3;
      baseYaw: number;
      floor: 1 | 2;
      exitPath?: THREE.Vector3[];
      exitWpRef?: { idx: number };
      exitPhaseRef?: { phase: number };
      exitDone?: boolean;
    }
  > = [];
  private walkPatrons: BarberPatronActor[] = [];
  private serviceStations: ServiceStationSpec[] = [];
  private occupiedStations = new Set<number>();

  private isOpenState: boolean | null = null;
  private closingActive = false;
  private closingTimer = 0;
  private fullyClosedAndEmpty = false;

  constructor(helpers: BarberCharacterHelpers, barberPoleCylinders: THREE.Mesh[]) {
    this.barberPoleCylinders = barberPoleCylinders;
    this.buildServiceStations();
    this.buildStaffAndClients(helpers);
    this.buildWalkInPatrons(helpers);
  }

  private buildServiceStations() {
    const cx = RON_BARBER_CENTER_X;
    const cz = RON_BARBER_CENTER_Z;
    const f2Y = RON_BARBER_FLOOR2_Y;

    // 4 dynamic live service destinations (2 Floor 1 haircuts, 1 Floor 2 spa, 1 Floor 2 color)
    this.serviceStations = [
      {
        id: 'f1_chair_2',
        floor: 1,
        seatPos: new THREE.Vector3(cx + 1.9, 0.16, cz + 1.55),
        seatYaw: 0,
        seatHipY: 0.52,
        pathIn: [
          new THREE.Vector3(cx - 2.3, 0.16, cz - 3.0),
          new THREE.Vector3(cx + 1.9, 0.16, cz - 0.8),
          new THREE.Vector3(cx + 1.9, 0.16, cz + 1.55),
        ],
        pathOut: [
          new THREE.Vector3(cx + 1.9, 0.16, cz - 0.8),
          new THREE.Vector3(cx, 0.16, cz - 4.3),
        ],
        waitDuration: 9.5,
      },
      {
        id: 'f1_vip_chair',
        floor: 1,
        seatPos: new THREE.Vector3(cx + 4.35, 0.16, cz - 2.6),
        seatYaw: Math.PI / 2,
        seatHipY: 0.52,
        pathIn: [
          new THREE.Vector3(cx - 1.5, 0.16, cz - 3.0),
          new THREE.Vector3(cx + 3.2, 0.16, cz - 2.6),
          new THREE.Vector3(cx + 4.35, 0.16, cz - 2.6),
        ],
        pathOut: [
          new THREE.Vector3(cx + 3.2, 0.16, cz - 2.6),
          new THREE.Vector3(cx, 0.16, cz - 4.3),
        ],
        waitDuration: 10.5,
      },
      {
        id: 'f2_color_2',
        floor: 2,
        seatPos: new THREE.Vector3(cx + 4.9, f2Y, cz - 0.8),
        seatYaw: Math.PI / 2,
        seatHipY: 0.56,
        pathIn: [
          new THREE.Vector3(cx - 5.2, 0.16, cz - 1.8),
          new THREE.Vector3(cx - 5.2, 0.34, cz + 0.85),
          new THREE.Vector3(cx - 5.2, f2Y, cz + 5.95),
          new THREE.Vector3(cx + 2.0, f2Y, cz + 5.2),
          new THREE.Vector3(cx + 3.4, f2Y, cz - 0.8),
          new THREE.Vector3(cx + 4.9, f2Y, cz - 0.8),
        ],
        pathOut: [
          new THREE.Vector3(cx + 3.4, f2Y, cz - 0.8),
          new THREE.Vector3(cx + 2.0, f2Y, cz + 5.2),
          new THREE.Vector3(cx - 5.2, f2Y, cz + 5.95),
          new THREE.Vector3(cx - 5.2, 0.34, cz + 0.85),
          new THREE.Vector3(cx - 2.8, 0.16, cz - 3.6),
          new THREE.Vector3(cx, 0.16, cz - 4.3),
        ],
        waitDuration: 11.5,
      },
      {
        id: 'f2_spa_2',
        floor: 2,
        seatPos: new THREE.Vector3(cx - 1.0, f2Y + 0.42, cz - 2.60),
        seatYaw: Math.PI,
        seatHipY: 0.20,
        isReclined: true,
        pathIn: [
          new THREE.Vector3(cx - 5.2, 0.16, cz - 1.8),
          new THREE.Vector3(cx - 5.2, 0.34, cz + 0.85),
          new THREE.Vector3(cx - 5.2, f2Y, cz + 5.95),
          new THREE.Vector3(cx - 1.0, f2Y, cz + 4.6),
          new THREE.Vector3(cx - 1.0, f2Y, cz - 3.8),
          new THREE.Vector3(cx - 1.0, f2Y + 0.42, cz - 2.60),
        ],
        pathOut: [
          new THREE.Vector3(cx - 1.0, f2Y, cz - 3.8),
          new THREE.Vector3(cx + 1.8, f2Y, cz - 3.8),
          new THREE.Vector3(cx + 1.8, f2Y, cz + 4.8),
          new THREE.Vector3(cx - 5.2, f2Y, cz + 5.95),
          new THREE.Vector3(cx - 5.2, 0.34, cz + 0.85),
          new THREE.Vector3(cx - 2.8, 0.16, cz - 3.6),
          new THREE.Vector3(cx, 0.16, cz - 4.3),
        ],
        waitDuration: 11.0,
      },
    ];
  }

  private buildNpcRig(
    shirtHex: number,
    pantsHex: number,
    hairHex: number,
    skinHex: string,
    helpers: BarberCharacterHelpers,
    options?: { apronHex?: number; capeHex?: number }
  ): BarberNpcRig {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.72 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.74 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.80 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });

    const hipsGroup = new THREE.Group();
    hipsGroup.position.y = 0.84;
    group.add(hipsGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.22), shirtMat);
    torso.position.y = 0.30;
    hipsGroup.add(torso);

    if (options?.apronHex !== undefined) {
      const apronMat = new THREE.MeshStandardMaterial({ color: options.apronHex, roughness: 0.75 });
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.64, 0.04), apronMat);
      apron.position.set(0, 0.20, 0.12);
      hipsGroup.add(apron);
    }

    let capeMesh: THREE.Mesh | undefined;
    if (options?.capeHex !== undefined) {
      const capeMat = new THREE.MeshStandardMaterial({ color: options.capeHex, roughness: 0.62 });
      capeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.28), capeMat);
      capeMesh.position.set(0, 0.26, 0.04);
      hipsGroup.add(capeMesh);
    }

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.62, 0);
    const faceTex = helpers.createFaceTexture('smile', skinHex);
    const headMesh = helpers.createHeadMesh(skinMat, faceTex, 0.26, 0.27, 0.25);
    headMesh.position.y = 0.14;
    headGroup.add(headMesh);

    const hairMat = new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.8 });
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.27), hairMat);
    hairTop.position.set(0, 0.27, -0.01);
    headGroup.add(hairTop);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.07), hairMat);
    hairBack.position.set(0, 0.18, -0.12);
    headGroup.add(hairBack);
    hipsGroup.add(headGroup);

    const buildArm = (x: number) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(x, 0.54, 0);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.11), shirtMat);
      upper.position.y = -0.13;
      armPivot.add(upper);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.09), skinMat);
      hand.position.y = -0.36;
      armPivot.add(hand);
      hipsGroup.add(armPivot);
      return armPivot;
    };
    const leftArm = buildArm(-0.26);
    const rightArm = buildArm(0.26);

    const buildLeg = (x: number) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(x, 0, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.15), pantsMat);
      thigh.position.y = -0.21;
      hipPivot.add(thigh);
      const kneePivot = new THREE.Group();
      kneePivot.position.y = -0.42;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.14), pantsMat);
      shin.position.y = -0.18;
      kneePivot.add(shin);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), shoeMat);
      shoe.position.set(0, -0.38, 0.04);
      kneePivot.add(shoe);
      hipPivot.add(kneePivot);
      hipsGroup.add(hipPivot);
      return { hipPivot, kneePivot };
    };
    const lLeg = buildLeg(-0.10);
    const rLeg = buildLeg(0.10);

    return {
      group,
      hipsGroup,
      headGroup,
      leftArm,
      rightArm,
      leftLeg: lLeg.hipPivot,
      rightLeg: rLeg.hipPivot,
      leftKnee: lLeg.kneePivot,
      rightKnee: rLeg.kneePivot,
      capeMesh,
    };
  }

  private setStandingPose(rig: BarberNpcRig) {
    rig.hipsGroup.position.y = 0.84;
    rig.hipsGroup.rotation.x = 0;
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftKnee.rotation.x = 0;
    rig.rightKnee.rotation.x = 0;
    rig.leftArm.rotation.x = 0;
    rig.rightArm.rotation.x = 0;
    if (rig.capeMesh) rig.capeMesh.visible = false;
  }

  private setSeatedPose(rig: BarberNpcRig, seatY: number, isReclined?: boolean) {
    if (isReclined) {
      rig.hipsGroup.position.y = seatY;
      rig.hipsGroup.rotation.x = -1.18;
      rig.leftLeg.rotation.x = -0.18;
      rig.rightLeg.rotation.x = -0.18;
      rig.leftKnee.rotation.x = 0;
      rig.rightKnee.rotation.x = 0;
    } else {
      rig.hipsGroup.position.y = seatY;
      rig.hipsGroup.rotation.x = 0;
      rig.leftLeg.rotation.x = -Math.PI / 2 + 0.08;
      rig.rightLeg.rotation.x = -Math.PI / 2 + 0.08;
      rig.leftKnee.rotation.x = Math.PI / 2 - 0.12;
      rig.rightKnee.rotation.x = Math.PI / 2 - 0.12;
    }
    if (rig.capeMesh) rig.capeMesh.visible = true;
  }

  private buildStaffAndClients(helpers: BarberCharacterHelpers) {
    const cx = RON_BARBER_CENTER_X;
    const cz = RON_BARBER_CENTER_Z;
    const f2Y = RON_BARBER_FLOOR2_Y;

    const staffConfigs: Array<{
      x: number;
      y: number;
      z: number;
      rotY: number;
      shirt: number;
      apron: number;
      hair: number;
      mode: 'cut' | 'shampoo' | 'color' | 'reception';
      phase: number;
      floor: 1 | 2;
    }> = [
      { x: cx - 0.42, y: 0.16, z: cz + 1.25, rotY: -0.95, shirt: 0xf8fafc, apron: 0x5c3a21, hair: 0x111111, mode: 'cut', phase: 0.4, floor: 1 },
      { x: cx + 2.28, y: 0.16, z: cz + 1.25, rotY: -1.15, shirt: 0x1e293b, apron: 0x4f2f1a, hair: 0x111111, mode: 'cut', phase: 1.1, floor: 1 },
      { x: cx + 4.98, y: 0.16, z: cz + 1.25, rotY: -2.1, shirt: 0x1e293b, apron: 0x7f1d1d, hair: 0x2b1d0c, mode: 'cut', phase: 1.8, floor: 1 },
      { x: cx + 4.15, y: 0.16, z: cz - 3.05, rotY: 0.45, shirt: 0xf8fafc, apron: 0x18181b, hair: 0x2b1d0c, mode: 'cut', phase: 2.5, floor: 1 },
      { x: cx - 4.1, y: 0.16, z: cz - 4.35, rotY: 0, shirt: 0x0f172a, apron: 0x18181b, hair: 0x111111, mode: 'reception', phase: 0.9, floor: 1 },
      { x: cx - 2.7, y: f2Y, z: cz - 1.50, rotY: Math.PI, shirt: 0xe2e8f0, apron: 0x0f766e, hair: 0x2b1d0c, mode: 'shampoo', phase: 0.5, floor: 2 },
      { x: cx + 0.7, y: f2Y, z: cz - 1.50, rotY: Math.PI, shirt: 0xe2e8f0, apron: 0x0f766e, hair: 0x6b3e1a, mode: 'shampoo', phase: 2.2, floor: 2 },
      { x: cx + 4.55, y: f2Y, z: cz - 3.35, rotY: 0.55, shirt: 0x18181b, apron: 0x9333ea, hair: 0xf472b6, mode: 'color', phase: 1.3, floor: 2 },
    ];

    this.stylists = staffConfigs.map((sc, idx) => {
      const rig = this.buildNpcRig(sc.shirt, 0x18181b, sc.hair, '#fbd3b4', helpers, { apronHex: sc.apron });
      rig.group.position.set(sc.x, sc.y, sc.z);
      rig.group.rotation.y = sc.rotY;
      this.rootGroup.add(rig.group);
      const spec = sc.mode === 'reception' ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(idx * 3 + 1);
      rig.glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: rig.group,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Idle',
        phaseOffset: idx * 0.75,
      });
      return {
        ...rig,
        mode: sc.mode,
        phaseOffset: sc.phase,
        homePos: new THREE.Vector3(sc.x, sc.y, sc.z),
        baseYaw: sc.rotY,
        floor: sc.floor,
      };
    });

    // Dedicated Ambient Seated Clients on Chair 1, Chair 3, Wash Bed 1, Color 1 & Hood Dryer
    const c1 = this.buildNpcRig(0x2563eb, 0x1e293b, 0x111111, '#fbd3b4', helpers, { capeHex: 0x18181b });
    c1.group.position.set(cx - 0.8, 0.16, cz + 1.55);
    c1.group.rotation.y = 0;
    this.setSeatedPose(c1, 0.52);
    this.rootGroup.add(c1.group);

    const c2 = this.buildNpcRig(0x059669, 0x334155, 0x451a03, '#f6c8a8', helpers, { capeHex: 0x1e293b });
    c2.group.position.set(cx + 4.6, 0.16, cz + 1.55);
    c2.group.rotation.y = 0;
    this.setSeatedPose(c2, 0.52);
    this.rootGroup.add(c2.group);

    const cSpa1 = this.buildNpcRig(0x0ea5e9, 0x1e293b, 0x111111, '#fbd3b4', helpers, { capeHex: 0x0f766e });
    cSpa1.group.position.set(cx - 2.7, f2Y + 0.42, cz - 2.60);
    cSpa1.group.rotation.y = Math.PI;
    this.setSeatedPose(cSpa1, 0.20, true);
    this.rootGroup.add(cSpa1.group);

    const cColor1 = this.buildNpcRig(0x6366f1, 0x1e293b, 0x9333ea, '#fbd3b4', helpers, { capeHex: 0x18181b });
    cColor1.group.position.set(cx + 4.9, f2Y, cz - 3.6);
    cColor1.group.rotation.y = Math.PI / 2;
    this.setSeatedPose(cColor1, 0.56);
    this.rootGroup.add(cColor1.group);

    const cHood = this.buildNpcRig(0xf43f5e, 0x1e293b, 0x38bdf8, '#f6c8a8', helpers, { capeHex: 0x1e293b });
    cHood.group.position.set(cx + 3.1, f2Y, cz - 2.5);
    cHood.group.rotation.y = Math.PI;
    this.setSeatedPose(cHood, 0.56);
    this.rootGroup.add(cHood.group);

    this.seatedClients = [
      { ...c1, mode: 'cut_chair' as const, phaseOffset: 0.4, homePos: c1.group.position.clone(), baseYaw: 0, floor: 1 as const },
      { ...c2, mode: 'cut_chair' as const, phaseOffset: 1.9, homePos: c2.group.position.clone(), baseYaw: 0, floor: 1 as const },
      { ...cSpa1, mode: 'shampoo_recline' as const, phaseOffset: 0.3, homePos: cSpa1.group.position.clone(), baseYaw: Math.PI, floor: 2 as const },
      { ...cColor1, mode: 'color_hood' as const, phaseOffset: 1.1, homePos: cColor1.group.position.clone(), baseYaw: Math.PI / 2, floor: 2 as const },
      { ...cHood, mode: 'color_hood' as const, phaseOffset: 2.5, homePos: cHood.group.position.clone(), baseYaw: Math.PI, floor: 2 as const },
    ].map((c, idx) => {
      const spec = pickSeatedCivilianModel(idx * 3 + 5);
      c.glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: c.group,
        fallbackMeshes: [c.hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Sit',
        phaseOffset: idx * 0.9,
      });
      return c;
    });
  }

  private buildWalkInPatrons(helpers: BarberCharacterHelpers) {
    const cx = RON_BARBER_CENTER_X;
    const patronSpecs: Array<{
      shirt: number;
      pants: number;
      hair: number;
      skin: string;
      initState: BarberPatronActor['state'];
      initX: number;
      initZ: number;
      sidewalkDir: -1 | 1;
      stationIdx: number;
      delay: number;
    }> = [
      { shirt: 0x0284c7, pants: 0x18181b, hair: 0x111111, skin: '#fbd3b4', initState: 'enter_door', initX: cx, initZ: 40.8, sidewalkDir: 1, stationIdx: 0, delay: 0 },
      { shirt: 0xd97706, pants: 0x334155, hair: 0x3b2415, skin: '#f6c8a8', initState: 'stroll_in', initX: cx + 10.5, initZ: 39.8, sidewalkDir: -1, stationIdx: 1, delay: 0 },
      { shirt: 0x7c3aed, pants: 0x1e293b, hair: 0x111111, skin: '#e8be9e', initState: 'stroll_in', initX: cx - 10.5, initZ: 39.8, sidewalkDir: 1, stationIdx: 2, delay: 2.0 },
      { shirt: 0x0d9488, pants: 0x0f172a, hair: 0x6b3e1a, skin: '#f8d9c0', initState: 'stroll_in', initX: cx + 14.0, initZ: 39.8, sidewalkDir: -1, stationIdx: 3, delay: 4.5 },
    ];

    patronSpecs.forEach((sp, idx) => {
      const rig = this.buildNpcRig(sp.shirt, sp.pants, sp.hair, sp.skin, helpers, { capeHex: 0x1e293b });
      if (rig.capeMesh) rig.capeMesh.visible = false;
      rig.group.position.set(sp.initX, 0.08, sp.initZ);
      this.rootGroup.add(rig.group);
      const spec = pickSeatedCivilianModel(idx * 3 + 2);
      rig.glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: rig.group,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Walk',
        phaseOffset: idx * 0.85,
      });

      let waypoints: THREE.Vector3[] = [];
      if (sp.initState === 'enter_door') {
        this.occupiedStations.add(sp.stationIdx);
        waypoints = [
          new THREE.Vector3(cx, 0.16, 42.2),
          new THREE.Vector3(cx, 0.16, 45.2),
          new THREE.Vector3(cx - 2.3, 0.16, 45.8),
        ];
      } else {
        waypoints = [new THREE.Vector3(cx, 0.08, 39.8), new THREE.Vector3(cx, 0.08, 41.2)];
      }

      this.walkPatrons.push({
        rig,
        state: sp.initState,
        stationIdx: sp.stationIdx,
        waypoints,
        wpIdx: 0,
        timer: sp.delay,
        sidewalkDir: sp.sidewalkDir,
        walkPhase: idx * 1.7,
        phaseOffset: idx * 2.1,
      });
    });
  }

  private pickFreeStation(preferred: number): number {
    if (!this.occupiedStations.has(preferred)) return preferred;
    for (let s = 0; s < this.serviceStations.length; s++) {
      if (!this.occupiedStations.has(s)) return s;
    }
    return 0;
  }

  private buildExitToSidewalk(pos: THREE.Vector3, floor: 1 | 2, idx: number): THREE.Vector3[] {
    const cx = RON_BARBER_CENTER_X;
    const cz = RON_BARBER_CENTER_Z;
    const pts: THREE.Vector3[] = [];
    if (floor === 2) {
      pts.push(new THREE.Vector3(pos.x, RON_BARBER_FLOOR2_Y, cz + 4.8));
      pts.push(new THREE.Vector3(cx - 5.2, RON_BARBER_FLOOR2_Y, cz + 5.95));
      pts.push(new THREE.Vector3(cx - 5.2, 0.34, cz + 0.85));
      pts.push(new THREE.Vector3(cx - 2.8, 0.16, cz - 3.6));
    } else if (pos.z > cz - 2.5) {
      pts.push(new THREE.Vector3(pos.x, 0.16, cz - 2.2));
    }
    pts.push(new THREE.Vector3(cx, 0.16, cz - 4.3));
    pts.push(new THREE.Vector3(cx, 0.08, 41.2));
    pts.push(new THREE.Vector3(cx + (idx % 2 === 0 ? -12.0 : 12.0), 0.08, 39.8));
    return pts;
  }

  private beginClosingEvacuation() {
    this.closingActive = true;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    let idx = 0;

    for (const s of this.stylists) {
      s.group.visible = true;
      s.glbHandle?.setAnimState('Walk', 1.25);
      s.exitPath = this.buildExitToSidewalk(s.group.position, s.floor, idx++);
      s.exitWpRef = { idx: 0 };
      s.exitPhaseRef = { phase: s.phaseOffset };
      s.exitDone = false;
    }
    for (const c of this.seatedClients) {
      c.group.visible = true;
      this.setStandingPose(c);
      c.glbHandle?.setAnimState('Walk', 1.25);
      c.exitPath = this.buildExitToSidewalk(c.group.position, c.floor, idx++);
      c.exitWpRef = { idx: 0 };
      c.exitPhaseRef = { phase: c.phaseOffset };
      c.exitDone = false;
    }
    for (const p of this.walkPatrons) {
      if (!p.rig.group.visible) continue;
      this.setStandingPose(p.rig);
      p.rig.glbHandle?.setAnimState('Walk', 1.25);
      const st = this.serviceStations[p.stationIdx];
      const floor: 1 | 2 = p.state === 'in_service' || p.rig.group.position.y > 2.0 ? (st?.floor ?? 1) : 1;
      p.exitPath = this.buildExitToSidewalk(p.rig.group.position, floor, idx++);
      p.exitWpRef = { idx: 0 };
      p.exitPhaseRef = { phase: p.walkPhase };
      p.exitDone = false;
    }
  }

  private hideAllImmediate() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    this.occupiedStations.clear();
    for (const s of this.stylists) {
      s.group.visible = false;
      s.exitDone = true;
    }
    for (const c of this.seatedClients) {
      c.group.visible = false;
      c.exitDone = true;
    }
    for (const p of this.walkPatrons) {
      p.rig.group.visible = false;
      p.exitDone = true;
    }
  }

  private restoreForOpen() {
    const cx = RON_BARBER_CENTER_X;
    this.closingActive = false;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    this.occupiedStations.clear();

    for (const s of this.stylists) {
      this.setStandingPose(s);
      s.group.position.copy(s.homePos);
      s.group.rotation.y = s.baseYaw;
      s.group.visible = true;
      s.glbHandle?.setAnimState('Idle');
      s.exitDone = false;
    }
    for (const c of this.seatedClients) {
      c.group.position.copy(c.homePos);
      c.group.rotation.y = c.baseYaw;
      this.setSeatedPose(c, c.mode === 'shampoo_recline' ? 0.20 : c.floor === 2 ? 0.56 : 0.52, c.mode === 'shampoo_recline');
      c.group.visible = true;
      c.glbHandle?.setAnimState('Sit');
      c.exitDone = false;
    }
    this.walkPatrons.forEach((p, idx) => {
      this.setStandingPose(p.rig);
      p.state = 'stroll_in';
      p.sidewalkDir = idx % 2 === 0 ? 1 : -1;
      p.rig.group.position.set(cx + (idx % 2 === 0 ? -12.0 : 12.0), 0.08, 39.8);
      p.waypoints = [new THREE.Vector3(cx, 0.08, 39.8), new THREE.Vector3(cx, 0.08, 41.2)];
      p.wpIdx = 0;
      p.timer = idx * 2.2;
      p.rig.group.visible = true;
      p.rig.glbHandle?.setAnimState('Walk');
      p.exitDone = false;
    });
  }

  public hasExitingNpcNearDoor(): boolean {
    const cx = RON_BARBER_CENTER_X;
    const nearDoor = (pos: THREE.Vector3, vis: boolean) =>
      vis && Math.abs(pos.x - cx) <= 2.4 && pos.z >= 40.5 && pos.z <= 45.2 && pos.y < 1.5;

    for (const p of this.walkPatrons) {
      if (nearDoor(p.rig.group.position, p.rig.group.visible)) return true;
    }
    if (this.closingActive) {
      for (const s of this.stylists) if (nearDoor(s.group.position, s.group.visible)) return true;
      for (const c of this.seatedClients) if (nearDoor(c.group.position, c.group.visible)) return true;
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepActorAlongWaypoints(p: BarberPatronActor, speed: number, delta: number): boolean {
    if (p.wpIdx >= p.waypoints.length) return true;
    const target = p.waypoints[p.wpIdx];
    const pos = p.rig.group.position;
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dz = target.z - pos.z;
    const distXZ = Math.hypot(dx, dz);
    const dist3D = Math.hypot(dx, dy, dz);
    const step = speed * delta;

    if (dist3D <= step + 0.09) {
      pos.copy(target);
      p.wpIdx++;
      return p.wpIdx >= p.waypoints.length;
    }

    const r = step / dist3D;
    pos.x += dx * r;
    pos.y += dy * r;
    pos.z += dz * r;

    if (distXZ > 0.03) {
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - p.rig.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.rig.group.rotation.y += diff * Math.min(1, delta * 9.0);
    }

    p.walkPhase += delta * 7.4;
    const swing = Math.sin(p.walkPhase) * 0.45;
    p.rig.leftLeg.rotation.x = swing;
    p.rig.rightLeg.rotation.x = -swing;
    p.rig.leftArm.rotation.x = -swing * 0.6;
    p.rig.rightArm.rotation.x = swing * 0.6;
    return false;
  }

  public update(delta: number, rawHour: number) {
    const isOpen = isRonBarberShopOpenAtHour(rawHour);

    if (isOpen) {
      for (const cyl of this.barberPoleCylinders) {
        cyl.rotation.y += delta * 2.4;
      }
    }

    if (this.isOpenState === null) {
      this.isOpenState = isOpen;
      if (!isOpen) {
        this.hideAllImmediate();
        return;
      }
    } else if (this.isOpenState && !isOpen) {
      this.isOpenState = false;
      if (rawHour >= 21.0 && rawHour < 21.35) {
        this.beginClosingEvacuation();
      } else {
        this.hideAllImmediate();
        return;
      }
    } else if (!this.isOpenState && isOpen) {
      this.isOpenState = true;
      this.restoreForOpen();
    } else if (!isOpen && !this.closingActive) {
      return;
    }

    // Closing Evacuation (after 21:00)
    if (!isOpen && this.closingActive) {
      this.closingTimer += delta;
      let anyRemaining = false;

      const stepExit = (rig: BarberNpcRig & { exitPath?: THREE.Vector3[]; exitWpRef?: { idx: number }; exitPhaseRef?: { phase: number }; exitDone?: boolean }) => {
        if (rig.exitDone || !rig.group.visible) return;
        if (!rig.exitPath || !rig.exitWpRef || !rig.exitPhaseRef) {
          rig.group.visible = false;
          rig.exitDone = true;
          return;
        }
        const done = advanceNpcExitPath(
          rig.group,
          rig.exitPath,
          rig.exitWpRef,
          2.25,
          delta,
          { legL: rig.leftLeg, legR: rig.rightLeg, armL: rig.leftArm, armR: rig.rightArm },
          rig.exitPhaseRef
        );
        if (done) {
          rig.group.visible = false;
          rig.exitDone = true;
        } else {
          anyRemaining = true;
        }
      };

      for (const s of this.stylists) stepExit(s);
      for (const c of this.seatedClients) stepExit(c);
      for (const p of this.walkPatrons) {
        if (p.exitDone || !p.rig.group.visible) continue;
        if (!p.exitPath || !p.exitWpRef || !p.exitPhaseRef) {
          p.rig.group.visible = false;
          p.exitDone = true;
          continue;
        }
        const done = advanceNpcExitPath(
          p.rig.group,
          p.exitPath,
          p.exitWpRef,
          2.25,
          delta,
          { legL: p.rig.leftLeg, legR: p.rig.rightLeg, armL: p.rig.leftArm, armR: p.rig.rightArm },
          p.exitPhaseRef
        );
        if (done) {
          p.rig.group.visible = false;
          p.exitDone = true;
        } else {
          anyRemaining = true;
        }
      }

      if (!anyRemaining || this.closingTimer >= 22.0) {
        this.hideAllImmediate();
      }
      return;
    }

    const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
    const cx = RON_BARBER_CENTER_X;

    // 1. Stylists & Static Seated Clients Idle Animation
    for (const s of this.stylists) {
      if (s.mode === 'cut') {
        s.rightArm.rotation.x = -0.68 + Math.sin(nowSec * 6.5 + s.phaseOffset) * 0.16;
        s.leftArm.rotation.x = -0.45 + Math.cos(nowSec * 3.2 + s.phaseOffset) * 0.10;
        s.headGroup.rotation.y = Math.sin(nowSec * 1.1 + s.phaseOffset) * 0.16;
      } else if (s.mode === 'shampoo') {
        s.leftArm.rotation.x = -0.78 + Math.sin(nowSec * 4.2 + s.phaseOffset) * 0.12;
        s.rightArm.rotation.x = -0.78 + Math.cos(nowSec * 4.2 + s.phaseOffset) * 0.12;
        s.headGroup.rotation.x = 0.18;
        s.headGroup.rotation.y = Math.sin(nowSec * 0.9 + s.phaseOffset) * 0.14;
      } else if (s.mode === 'color') {
        s.rightArm.rotation.x = -0.62 + Math.sin(nowSec * 4.8 + s.phaseOffset) * 0.18;
        s.leftArm.rotation.x = -0.42;
        s.headGroup.rotation.y = Math.sin(nowSec * 1.2 + s.phaseOffset) * 0.14;
      } else {
        s.headGroup.rotation.y = Math.sin(nowSec * 0.9 + s.phaseOffset) * 0.25;
        s.rightArm.rotation.x = -0.25 + Math.sin(nowSec * 2.0 + s.phaseOffset) * 0.08;
      }
    }

    for (const c of this.seatedClients) {
      if (c.mode === 'cut_chair') {
        c.headGroup.rotation.y = Math.sin(nowSec * 0.55 + c.phaseOffset) * 0.10;
      } else if (c.mode === 'shampoo_recline') {
        c.headGroup.rotation.y = Math.sin(nowSec * 0.5 + c.phaseOffset) * 0.08;
      } else {
        c.headGroup.rotation.y = Math.sin(nowSec * 0.6 + c.phaseOffset) * 0.12;
      }
    }

    // 2. Dynamic Walk-In / Walk-Out Customers getting haircuts, spa, & hair color
    for (let i = 0; i < this.walkPatrons.length; i++) {
      const p = this.walkPatrons[i];

      if (p.state === 'stroll_in') {
        if (p.timer > 0) {
          p.timer -= delta;
          p.rig.glbHandle?.setAnimState('Idle');
          continue;
        }
        p.rig.group.visible = true;
        p.rig.glbHandle?.setAnimState('Walk');
        if (this.stepActorAlongWaypoints(p, 1.55, delta)) {
          p.stationIdx = this.pickFreeStation((i + Math.floor(nowSec * 0.1)) % this.serviceStations.length);
          this.occupiedStations.add(p.stationIdx);
          p.waypoints = [
            new THREE.Vector3(cx, 0.16, 42.6),
            new THREE.Vector3(cx, 0.16, 45.2),
            new THREE.Vector3(cx - 2.3, 0.16, 45.8),
          ];
          p.wpIdx = 0;
          p.state = 'enter_door';
        }
      } else if (p.state === 'enter_door') {
        p.rig.glbHandle?.setAnimState('Walk');
        if (this.stepActorAlongWaypoints(p, 1.65, delta)) {
          p.timer = 1.25;
          p.rig.group.rotation.y = -Math.PI * 0.5;
          p.rig.leftLeg.rotation.x = 0;
          p.rig.rightLeg.rotation.x = 0;
          p.rig.glbHandle?.setAnimState('Idle');
          p.state = 'check_in';
        }
      } else if (p.state === 'check_in') {
        p.timer -= delta;
        p.rig.headGroup.rotation.y = Math.sin(nowSec * 2.2 + p.phaseOffset) * 0.18;
        if (p.timer <= 0) {
          p.rig.headGroup.rotation.y = 0;
          const st = this.serviceStations[p.stationIdx];
          p.waypoints = st.pathIn.map((v) => v.clone());
          p.wpIdx = 0;
          p.rig.glbHandle?.setAnimState('Walk');
          p.state = 'walk_to_service';
        }
      } else if (p.state === 'walk_to_service') {
        p.rig.glbHandle?.setAnimState('Walk');
        if (this.stepActorAlongWaypoints(p, 1.75, delta)) {
          const st = this.serviceStations[p.stationIdx];
          p.rig.group.position.copy(st.seatPos);
          p.rig.group.rotation.y = st.seatYaw;
          this.setSeatedPose(p.rig, st.seatHipY, st.isReclined);
          p.rig.glbHandle?.setAnimState('Sit');
          p.timer = st.waitDuration;
          p.state = 'in_service';
        }
      } else if (p.state === 'in_service') {
        p.timer -= delta;
        p.rig.headGroup.rotation.y = Math.sin(nowSec * 0.65 + p.phaseOffset) * 0.10;
        if (p.timer <= 0) {
          this.setStandingPose(p.rig);
          p.rig.glbHandle?.setAnimState('Walk');
          const st = this.serviceStations[p.stationIdx];
          p.waypoints = [
            ...st.pathOut.map((v) => v.clone()),
            new THREE.Vector3(cx, 0.08, 41.2),
          ];
          p.wpIdx = 0;
          p.state = 'walk_to_door';
        }
      } else if (p.state === 'walk_to_door') {
        p.rig.glbHandle?.setAnimState('Walk');
        if (this.stepActorAlongWaypoints(p, 1.75, delta)) {
          this.occupiedStations.delete(p.stationIdx);
          p.sidewalkDir = i % 2 === 0 ? 1 : -1;
          p.waypoints = [
            new THREE.Vector3(cx, 0.08, 39.8),
            new THREE.Vector3(cx + p.sidewalkDir * 14.0, 0.08, 39.8),
          ];
          p.wpIdx = 0;
          p.state = 'exit_sidewalk';
        }
      } else if (p.state === 'exit_sidewalk') {
        p.rig.glbHandle?.setAnimState('Walk');
        if (this.stepActorAlongWaypoints(p, 1.55, delta)) {
          p.sidewalkDir = p.sidewalkDir === 1 ? -1 : 1;
          p.waypoints = [
            new THREE.Vector3(cx, 0.08, 39.8),
            new THREE.Vector3(cx, 0.08, 41.2),
          ];
          p.wpIdx = 0;
          p.timer = 2.0 + (i % 3) * 1.4;
          p.state = 'stroll_in';
        }
      }
    }
  }
}
