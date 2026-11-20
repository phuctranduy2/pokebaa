import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';

export interface Landmark81CharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface Landmark81BuildResult {
  staticGroup: THREE.Group;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  windowGlowMats: THREE.MeshStandardMaterial[];
  podiumPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
}

/**
 * Generates high-resolution sky-blue silver Low-E glass curtain-wall texture with fine
 * aluminum spandrel mullions, subtle sky reflection bands, and night-only warm suite lights.
 */
function createCurtainWallGlassTexture(): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const w = 512;
  const h = 1024;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const ctx = albedoCanvas.getContext('2d')!;

  const emCanvas = document.createElement('canvas');
  emCanvas.width = w;
  emCanvas.height = h;
  const ectx = emCanvas.getContext('2d')!;

  const skyGrad = ctx.createLinearGradient(0, 0, w, h);
  skyGrad.addColorStop(0.0, '#60a5fa');
  skyGrad.addColorStop(0.28, '#2563eb');
  skyGrad.addColorStop(0.55, '#1d4ed8');
  skyGrad.addColorStop(0.82, '#0284c7');
  skyGrad.addColorStop(1.0, '#1e3a8a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(224, 242, 254, 0.14)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.15);
  ctx.lineTo(w, h * 0.02);
  ctx.lineTo(w, h * 0.18);
  ctx.lineTo(0, h * 0.34);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, h * 0.56);
  ctx.lineTo(w, h * 0.42);
  ctx.lineTo(w, h * 0.55);
  ctx.lineTo(0, h * 0.70);
  ctx.closePath();
  ctx.fill();

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  const cols = 10;
  const rows = 44;
  const cellW = w / cols;
  const cellH = h / rows;

  let seed = 8102026;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let r = 0; r < rows; r++) {
    const isMechBand = r === 15 || r === 30;
    const py = r * cellH;

    ctx.fillStyle = isMechBand ? '#0f172a' : '#cbd5e1';
    ctx.fillRect(0, py, w, isMechBand ? cellH * 0.55 : 3);
    ctx.fillStyle = isMechBand ? '#334155' : '#475569';
    ctx.fillRect(0, py + (isMechBand ? cellH * 0.55 : 3), w, 2);

    if (isMechBand) {
      ectx.fillStyle = '#38bdf8';
      ectx.fillRect(0, py + 2, w, 3);
      continue;
    }

    for (let c = 0; c < cols; c++) {
      const px = c * cellW + 2;
      const paneY = py + 5;
      const pw = cellW - 4;
      const ph = cellH - 6;

      const tint = rand();
      ctx.fillStyle =
        tint > 0.72
          ? 'rgba(186, 230, 253, 0.22)'
          : tint > 0.35
          ? 'rgba(14, 116, 144, 0.20)'
          : 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(px, paneY, pw, ph);

      const litRoll = rand();
      if (litRoll > 0.72) {
        const warmColor = litRoll > 0.90 ? '#fffbeb' : litRoll > 0.80 ? '#fef08a' : '#bae6fd';
        ectx.fillStyle = warmColor;
        ectx.fillRect(px + 2, paneY + 2, pw - 4, ph - 4);
      }
    }
  }

  ctx.fillStyle = 'rgba(226, 232, 240, 0.65)';
  for (let c = 0; c <= cols; c++) {
    ctx.fillRect(c * cellW - 1, 0, 2, h);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;

  const emissiveMap = new THREE.CanvasTexture(emCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;

  return { map, emissiveMap };
}

function createLandmark81SignTexture(): THREE.CanvasTexture {
  const w = 1536;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0.0, '#090d16');
  grad.addColorStop(0.5, '#111827');
  grad.addColorStop(1.0, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 620);
  glow.addColorStop(0, 'rgba(212, 175, 55, 0.14)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 16, w - 36, h - 32);

  const sx = 178;
  ctx.fillStyle = '#e5c158';
  [
    [-28, 34, 8],
    [-14, 58, 8],
    [0, 92, 10],
    [14, 66, 8],
    [28, 40, 8],
  ].forEach(([dx, bh, bw]) => {
    ctx.fillRect(sx + dx - bw / 2, 190 - bh, bw, bh);
  });
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(sx - 1.5, 62, 3, 36);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 80px "Helvetica Neue", system-ui, sans-serif';
  ctx.fillText('L A N D M A R K  8 1', w / 2 + 54, 104);

  ctx.fillStyle = '#d4af37';
  ctx.font = '600 26px "Helvetica Neue", system-ui, sans-serif';
  ctx.fillText('VINCOM CENTER   |   VINHOMES BĐS   |   SKYVIEW 81', w / 2 + 54, 180);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createLuxuryBoutiqueVitrineTexture(brandTitle: string, subtitle: string, accentHex: string): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#292018');
  bg.addColorStop(0.55, '#1c1917');
  bg.addColorStop(1, '#0c0a09');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const rad = ctx.createRadialGradient(w / 2, h * 0.52, 16, w / 2, h * 0.55, 220);
  rad.addColorStop(0, 'rgba(254, 243, 199, 0.55)');
  rad.addColorStop(0.5, 'rgba(212, 175, 55, 0.16)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#e7e5e4';
  ctx.fillRect(w * 0.34, h * 0.68, w * 0.32, h * 0.24);
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.56, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fafaf9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 40px Georgia, serif';
  ctx.fillText(brandTitle, w / 2, 74);

  ctx.fillStyle = accentHex;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(subtitle, w / 2, 118);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRealEstateWallBoardTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#09111e');
  bg.addColorStop(1, '#111d32');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = '#d4af37';
  ctx.fillRect(28, 28, w - 56, 78);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText('SÀN GIAO DỊCH BẤT ĐỘNG SẢN • VINHOMES CENTRAL PARK', w / 2, 67);

  const listings = [
    { label: 'CĂN HỘ 1PN', area: '54 m² • View Công Viên', price: '$380,000', accent: '#38bdf8' },
    { label: 'CĂN HỘ 2PN', area: '88 m² • View Sông Sài Gòn', price: '$690,000', accent: '#34d399' },
    { label: 'CĂN HỘ 3PN VIP', area: '132 m² • Thang Máy Riêng', price: '$1,150,000', accent: '#fbbf24' },
    { label: 'SKY VILLA 81', area: '260 m² • Duplex Tầng Cao', price: '$4,200,000', accent: '#f472b6' },
  ];

  listings.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 42 + col * 482;
    const by = 132 + row * 172;
    const bw = 456;
    const bh = 150;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx + 16, by + 18, 114, 114);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 24, by + 26, 48, 48);
    ctx.strokeRect(bx + 72, by + 26, 50, 96);
    ctx.strokeRect(bx + 24, by + 74, 48, 48);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText(item.label, bx + 148, by + 44);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText(item.area, bx + 148, by + 80);

    ctx.fillStyle = item.accent;
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText(item.price, bx + 148, by + 118);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSkyViewGalleryBoardTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#130f1e');
  bg.addColorStop(1, '#1e1b2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = '#e5c158';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 44px Georgia, serif';
  ctx.fillText('SKYVIEW 81 • VINPEARL LUXURY', w / 2, 92);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText('ĐÀI QUAN SÁT TẦNG 81  |  SẢNH ĐÓN KHÁCH VIP  |  NHÀ MẪU CĂN HỘ', w / 2, 150);

  ctx.fillStyle = 'rgba(212, 175, 55, 0.28)';
  const heights = [90, 140, 190, 260, 200, 150, 100];
  heights.forEach((bh, i) => {
    ctx.fillRect(w / 2 - 210 + i * 62, 460 - bh, 50, bh);
  });
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(w / 2 - 4, 175, 8, 55);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Scales BoxGeometry UVs so window floors and mullions align uniformly across all 7×5 bundled tubes */
function buildFloorAlignedTubeGeometry(width: number, height: number, depth: number): THREE.BoxGeometry {
  const geom = new THREE.BoxGeometry(width, height, depth);
  const uv = geom.attributes.uv;
  const repeatY = Math.max(0.22, height / 52.0);
  const repeatX = Math.max(0.5, width / 4.2);
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * repeatX, uv.getY(i) * repeatY);
  }
  uv.needsUpdate = true;
  return geom;
}

export function createLandmark81TowerStructure(): Landmark81BuildResult {
  // Centered across the street from Player Shop at X = 0, Z = 56.0
  const towerGroup = new THREE.Group();
  towerGroup.position.set(0, 0, 56.0);

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const windowGlowMats: THREE.MeshStandardMaterial[] = [];

  // 1. Architectural Materials
  const { map: glassColorMap, emissiveMap: glassEmissiveMap } = createCurtainWallGlassTexture();
  const towerGlassMat = new THREE.MeshStandardMaterial({
    map: glassColorMap,
    emissive: 0xffffff,
    emissiveMap: glassEmissiveMap,
    emissiveIntensity: 0.08,
    metalness: 0.45,
    roughness: 0.28,
  });
  windowGlowMats.push(towerGlassMat);

  const travertineStoneMat = new THREE.MeshStandardMaterial({ color: 0xe7e2d8, roughness: 0.62, metalness: 0.08 });
  const forecourtGraniteMat = new THREE.MeshStandardMaterial({ color: 0xd6d3cd, roughness: 0.72, metalness: 0.06 });
  const forecourtBorderMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.15 });
  const redCarpetMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.85 });
  const graniteBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.25 });
  const darkWalnutMat = new THREE.MeshStandardMaterial({ color: 0x452616, roughness: 0.55 });
  const oakShowroomFloorMat = new THREE.MeshStandardMaterial({ color: 0xc29563, roughness: 0.58 });
  const emeraldVelvetMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.78 });
  const creamLeatherMat = new THREE.MeshStandardMaterial({ color: 0xf5ebd6, roughness: 0.6 });
  const brushedAluminumMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.30, metalness: 0.72 });
  const champagneGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.28, metalness: 0.78 });
  const skyGardenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
  const miniRiverMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.22, metalness: 0.4 });
  const darkTreeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

  const crystalAtriumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.10,
    roughness: 0.06,
    metalness: 0.35,
    transparent: true,
    opacity: 0.30,
    depthWrite: false,
  });
  const slidingDoorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.12,
    roughness: 0.05,
    metalness: 0.35,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const frostedSafetyBandMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.18,
    roughness: 0.35,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });

  const lobbyFloorMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e6,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.26,
    roughness: 0.20,
  });
  const lobbyWallWarmMat = new THREE.MeshStandardMaterial({
    color: 0xfaf3e3,
    emissive: 0xfde68a,
    emissiveIntensity: 0.38,
    roughness: 0.48,
  });
  const lobbyCeilingCoveMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 0.90,
    roughness: 0.22,
  });

  const ledIceCyanMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.95,
    roughness: 0.22,
  });
  neonMats.push(ledIceCyanMat);

  const ledWarmGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.22,
  });
  neonMats.push(ledWarmGoldMat);

  const ledPureWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.90,
    roughness: 0.22,
  });
  neonMats.push(ledPureWhiteMat);

  const beaconRedMat = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    emissive: 0xef4444,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });
  neonMats.push(beaconRedMat);

  // Warm Interior Atrium Lighting across the entire 17.6m deep ground floor hall (1 wide light)
  const frontAtriumLight = new THREE.PointLight(0xffedd5, 18.0, 38.0, 1.0);
  frontAtriumLight.position.set(-0.5, 5.1, 54.0);
  const podiumPointLights = [
    { light: frontAtriumLight, dayInt: 18.0, nightInt: 52.0 },
  ];

  // =========================================================================
  // 1b. MARBLE FORECOURT PLAZA APRON (Covers grass completely from Sidewalk Z=42.4 -> Lobby Z=46.5!)
  // =========================================================================
  const forecourtSlab = new THREE.Mesh(new THREE.BoxGeometry(31.4, 0.07, 4.3), forecourtGraniteMat);
  forecourtSlab.position.set(0, 0.035, -11.55);
  towerGroup.add(forecourtSlab);

  const forecourtInlay = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.074, 3.8), forecourtBorderMat);
  forecourtInlay.position.set(0, 0.037, -11.5);
  towerGroup.add(forecourtInlay);

  const forecourtInnerStone = new THREE.Mesh(new THREE.BoxGeometry(19.8, 0.076, 3.4), forecourtGraniteMat);
  forecourtInnerStone.position.set(0, 0.038, -11.5);
  towerGroup.add(forecourtInnerStone);

  // VIP Entrance Red Carpet Runner extending ALL THE WAY from Forecourt through the Atrium to the Deep Escalator!
  const redCarpetRunner = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.015, 17.5), redCarpetMat);
  redCarpetRunner.position.set(0, 0.082, -4.85); // Z = -13.6 .. +3.9!
  towerGroup.add(redCarpetRunner);

  [-1.65, 1.65].forEach((bx) => {
    [-12.8, -10.8].forEach((bz) => {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.85, 8), champagneGoldMat);
      bollard.position.set(bx, 0.48, bz);
      towerGroup.add(bollard);
    });
  });

  // =========================================================================
  // 2. DEEP LUXURY VINCOM CENTER PODIUM SHELL (17.6m DEEP OPEN HALL! local Z = -9.4 .. +8.2 -> World Z = 46.6 .. 64.2)
  // =========================================================================
  // Side Exterior/Interior Structural Wing Piers (3.0m thick on X = ±13.7, Y = 0..9.13, Z = -9.5..+11.7)
  // Frames the central 24.4m glass atrium and dark obsidian sign header cleanly without coplanar overlap!
  [-13.7, 13.7].forEach((wx) => {
    const sideStructuralWall = new THREE.Mesh(new THREE.BoxGeometry(3.0, 9.13, 21.2), travertineStoneMat);
    sideStructuralWall.position.set(wx, 4.565, 1.1);
    towerGroup.add(sideStructuralWall);
  });

  // Deep Rear Structural Core fitted strictly between the side piers (X = -12.19..+12.19, Y = 0..6.20, Z = +8.2..+11.7)
  const podiumRearWallCore = new THREE.Mesh(new THREE.BoxGeometry(24.38, 6.2, 3.5), graniteBaseMat);
  podiumRearWallCore.position.set(0, 3.1, 9.95);
  towerGroup.add(podiumRearWallCore);

  // Podium Roof & Sign Fascia Deck fitted strictly between the two travertine piers (X = -12.19..+12.19, Y = 6.20..9.13)
  const podiumRoofStructure = new THREE.Mesh(new THREE.BoxGeometry(24.38, 2.93, 21.2), graniteBaseMat);
  podiumRoofStructure.position.set(0, 7.665, 1.1);
  towerGroup.add(podiumRoofStructure);

  const upperChampagneTrimTop = new THREE.Mesh(new THREE.BoxGeometry(30.8, 0.24, 21.5), champagneGoldMat);
  upperChampagneTrimTop.position.set(0, 9.25, 1.05);
  towerGroup.add(upperChampagneTrimTop);

  const upperChampagneTrimBot = new THREE.Mesh(new THREE.BoxGeometry(24.44, 0.12, 0.24), champagneGoldMat);
  upperChampagneTrimBot.position.set(0, 6.22, -9.62);
  towerGroup.add(upperChampagneTrimBot);

  const signTex = createLandmark81SignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: 0xffffff,
    emissiveMap: signTex,
    emissiveIntensity: 0.60,
    roughness: 0.25,
  });
  neonMats.push(signMat);

  const signBackplate = new THREE.Mesh(new THREE.BoxGeometry(19.6, 2.45, 0.14), champagneGoldMat);
  signBackplate.position.set(0, 7.75, -9.64);
  towerGroup.add(signBackplate);

  const podiumSignBoard = new THREE.Mesh(new THREE.PlaneGeometry(19.2, 2.25), signMat);
  podiumSignBoard.rotation.y = Math.PI;
  podiumSignBoard.position.set(0, 7.75, -9.73);
  towerGroup.add(podiumSignBoard);

  // =========================================================================
  // 2b. GRAND 17.6m-DEEP MULTI-ZONE INTERIOR (24.4m W × 17.6m D, World Z = 46.6 .. 64.2!)
  // =========================================================================
  const lobbyMarbleFloor = new THREE.Mesh(new THREE.BoxGeometry(24.36, 0.10, 17.68), lobbyFloorMarbleMat);
  lobbyMarbleFloor.position.set(0, 0.03, -0.65); // Top flush at Y = 0.08 across X = -12.18..+12.18, Z = -9.49..+8.19
  towerGroup.add(lobbyMarbleFloor);

  // Dark granite walkway inlays framing the central grand promenade
  [-3.8, 3.8].forEach((ix) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 16.5), forecourtBorderMat);
    strip.position.set(ix, 0.082, -0.6);
    towerGroup.add(strip);
  });

  // Interior Warm Travertine Perimeter Walls (Left X=-12.15, Right X=+12.15, Deep Back Z=+8.15)
  const backInteriorWall = new THREE.Mesh(new THREE.PlaneGeometry(24.4, 6.1), lobbyWallWarmMat);
  backInteriorWall.rotation.y = Math.PI;
  backInteriorWall.position.set(0, 3.1, 8.15);
  towerGroup.add(backInteriorWall);

  const leftInteriorWall = new THREE.Mesh(new THREE.PlaneGeometry(17.6, 6.1), lobbyWallWarmMat);
  leftInteriorWall.rotation.y = Math.PI / 2;
  leftInteriorWall.position.set(-12.15, 3.1, -0.6);
  towerGroup.add(leftInteriorWall);

  const rightInteriorWall = new THREE.Mesh(new THREE.PlaneGeometry(17.6, 6.1), lobbyWallWarmMat);
  rightInteriorWall.rotation.y = -Math.PI / 2;
  rightInteriorWall.position.set(12.15, 3.1, -0.6);
  towerGroup.add(rightInteriorWall);

  // 6 Majestic Marble & Gold Colonnade Pillars creating deep perspective!
  [-4.4, 4.4].forEach((px) => {
    [-4.2, 0.8, 5.4].forEach((pz) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 6.15, 14), travertineStoneMat);
      col.position.set(px, 3.1, pz);
      towerGroup.add(col);
      const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.32, 14), champagneGoldMat);
      colBase.position.set(px, 0.22, pz);
      towerGroup.add(colBase);
      const colCap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.34, 0.30, 14), champagneGoldMat);
      colCap.position.set(px, 6.02, pz);
      towerGroup.add(colCap);
    });
  });

  // 3 Grand Illuminated Ceiling Cove Rings & Dual Chandeliers spaced along the 17.6m depth!
  [-6.8, -0.6, 5.2].forEach((cz, idx) => {
    const ceilingRing = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.12, 24), lobbyCeilingCoveMat);
    ceilingRing.position.set(0, 6.12, cz);
    towerGroup.add(ceilingRing);

    if (idx < 2) {
      const chandRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), champagneGoldMat);
      chandRod.position.set(0, 5.45, cz);
      towerGroup.add(chandRod);
      const chandTier1 = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.16, 20), lobbyCeilingCoveMat);
      chandTier1.position.set(0, 4.72, cz);
      towerGroup.add(chandTier1);
      const chandTier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.20, 18), ledWarmGoldMat);
      chandTier2.position.set(0, 4.50, cz);
      towerGroup.add(chandTier2);
    }
  });

  // Upper 2nd-Floor U-Shaped Mezzanine Balcony (wrapping West, Deep Back, and East walls at Y = 4.0m!)
  const backMezz = new THREE.Mesh(new THREE.BoxGeometry(24.16, 0.35, 2.16), travertineStoneMat);
  backMezz.position.set(0, 4.05, 7.03);
  towerGroup.add(backMezz);
  const backMezzRail = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.85, 0.08), crystalAtriumGlassMat);
  backMezzRail.position.set(0, 4.62, 5.98);
  towerGroup.add(backMezzRail);

  [-10.9, 10.9].forEach((mx) => {
    const sideMezz = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 14.2), travertineStoneMat);
    sideMezz.position.set(mx, 4.05, -1.15);
    towerGroup.add(sideMezz);
    const sideMezzRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 14.2), crystalAtriumGlassMat);
    sideMezzRail.position.set(mx > 0 ? mx - 1.15 : mx + 1.15, 4.62, -1.15);
    towerGroup.add(sideMezzRail);
  });

  // =========================================================================
  // ZONE 1 (FRONT LEFT X = -11.5..-4.8, Z = -8.5..-3.5): GIANT SA BÀN LANDMARK 81
  // =========================================================================
  const saBanBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.82, 2.05), darkWalnutMat);
  saBanBase.position.set(-7.6, 0.45, -6.2);
  towerGroup.add(saBanBase);
  const saBanGoldRim = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.08, 2.16), champagneGoldMat);
  saBanGoldRim.position.set(-7.6, 0.88, -6.2);
  towerGroup.add(saBanGoldRim);
  const saBanParkPad = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.05, 1.86), skyGardenMat);
  saBanParkPad.position.set(-7.6, 0.94, -6.2);
  towerGroup.add(saBanParkPad);
  const saBanRiverStrip = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.055, 0.42), miniRiverMat);
  saBanRiverStrip.position.set(-7.6, 0.945, -6.88);
  towerGroup.add(saBanRiverStrip);

  const miniL81Mat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.95,
    roughness: 0.15,
  });
  neonMats.push(miniL81Mat);
  [
    [0, 0, 0.28, 1.40],
    [-0.26, 0, 0.22, 1.02],
    [0.26, 0, 0.22, 1.08],
    [0, -0.24, 0.22, 0.90],
    [0, 0.24, 0.22, 0.95],
  ].forEach(([dx, dz, bw, bh]) => {
    const mTube = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), miniL81Mat);
    mTube.position.set(-7.6 + dx, 0.96 + bh / 2, -6.05 + dz);
    towerGroup.add(mTube);
  });
  const miniSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.035, 0.42, 6), champagneGoldMat);
  miniSpire.position.set(-7.6, 2.55, -6.05);
  towerGroup.add(miniSpire);

  [-8.9, -8.45, -6.65, -6.2].forEach((tx, idx) => {
    const bh = 0.52 + (idx % 2) * 0.22;
    const miniApt = new THREE.Mesh(new THREE.BoxGeometry(0.30, bh, 0.26), lobbyFloorMarbleMat);
    miniApt.position.set(tx, 0.96 + bh / 2, -5.95 - (idx % 2) * 0.30);
    towerGroup.add(miniApt);
  });

  // =========================================================================
  // ZONE 2 (MID LEFT X = -11.8..-5.0, Z = -2.8..+4.2): BĐS CONSULTATION GALLERY & PRICING BOARD
  // =========================================================================
  const bdsBoardTex = createRealEstateWallBoardTexture();
  const bdsBoardMat = new THREE.MeshStandardMaterial({
    map: bdsBoardTex,
    emissive: 0xffffff,
    emissiveMap: bdsBoardTex,
    emissiveIntensity: 0.55,
    roughness: 0.28,
  });
  neonMats.push(bdsBoardMat);

  // Giant Illuminated BĐS Board on West Wall facing center promenade
  const westBdsFrame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.85, 6.2), champagneGoldMat);
  westBdsFrame.position.set(-12.08, 2.25, -0.5);
  towerGroup.add(westBdsFrame);
  const westBdsBoard = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.65), bdsBoardMat);
  westBdsBoard.rotation.y = Math.PI / 2;
  westBdsBoard.position.set(-12.01, 2.25, -0.5);
  towerGroup.add(westBdsBoard);

  // Also a Second Glowing BĐS Board on the Deep Back Left Wall (Z = +8.05) visible right from outside!
  const backLeftBdsFrame = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.85, 0.10), champagneGoldMat);
  backLeftBdsFrame.position.set(-7.8, 2.35, 8.08);
  towerGroup.add(backLeftBdsFrame);
  const backLeftBdsBoard = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.65), bdsBoardMat);
  backLeftBdsBoard.rotation.y = Math.PI;
  backLeftBdsBoard.position.set(-7.8, 2.35, 8.01);
  towerGroup.add(backLeftBdsBoard);

  // 3 Private Real Estate Consultation Desks arranged deep along West Wing (Z = -2.0 & +1.6)
  [
    { x: -8.6, z: -1.8 },
    { x: -8.6, z: 1.8 },
    { x: -6.1, z: 1.8 },
  ].forEach((pos) => {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.76, 0.78), darkWalnutMat);
    desk.position.set(pos.x, 0.46, pos.z);
    towerGroup.add(desk);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.05, 0.84), lobbyFloorMarbleMat);
    deskTop.position.set(pos.x, 0.85, pos.z);
    towerGroup.add(deskTop);
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.04), graniteBaseMat);
    mon.position.set(pos.x - 0.35, 1.04, pos.z + 0.05);
    towerGroup.add(mon);
    const brochure = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.24), champagneGoldMat);
    brochure.position.set(pos.x + 0.35, 0.89, pos.z - 0.14);
    towerGroup.add(brochure);

    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.46), creamLeatherMat);
    chairSeat.position.set(pos.x, 0.48, pos.z - 0.82);
    towerGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.10), creamLeatherMat);
    chairBack.position.set(pos.x, 0.72, pos.z - 1.02);
    towerGroup.add(chairBack);
  });

  // =========================================================================
  // ZONE 3 (MID/CENTER X = -3.4..+3.4): CONCIERGE DESK & GRAND ESCALATORS UP TO MEZZANINE
  // =========================================================================
  const conciergeDesk = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.08, 1.05), graniteBaseMat);
  conciergeDesk.position.set(0, 0.62, -2.2);
  towerGroup.add(conciergeDesk);
  const deskGoldTop = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.08, 1.18), champagneGoldMat);
  deskGoldTop.position.set(0, 1.18, -2.2);
  towerGroup.add(deskGoldTop);

  // Twin Architectural Escalators ascending smoothly in Mid-Back Center (X = ±1.4, Z = +1.8 -> +6.4)
  [-1.35, 1.35].forEach((ex) => {
    const escRamp = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.38, 6.0), graniteBaseMat);
    escRamp.position.set(ex, 2.05, 4.2);
    escRamp.rotation.x = 0.56;
    towerGroup.add(escRamp);
    const escGoldSide = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.08, 6.05), champagneGoldMat);
    escGoldSide.position.set(ex, 2.48, 4.2);
    escGoldSide.rotation.x = 0.56;
    towerGroup.add(escGoldSide);
  });

  // =========================================================================
  // ZONE 4 (RIGHT WING X = +5.0..+11.8): VIP LOUNGE + NHÀ MẪU CĂN HỘ SHOWROOM + SKYVIEW 81
  // =========================================================================
  const skyBoardTex = createSkyViewGalleryBoardTexture();
  const skyBoardMat = new THREE.MeshStandardMaterial({
    map: skyBoardTex,
    emissive: 0xffffff,
    emissiveMap: skyBoardTex,
    emissiveIntensity: 0.52,
    roughness: 0.28,
  });
  neonMats.push(skyBoardMat);

  // SkyView Board on East Wall & Back Right Wall
  const eastSkyFrame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.85, 6.0), champagneGoldMat);
  eastSkyFrame.position.set(12.08, 2.25, -0.5);
  towerGroup.add(eastSkyFrame);
  const eastSkyBoard = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.65), skyBoardMat);
  eastSkyBoard.rotation.y = -Math.PI / 2;
  eastSkyBoard.position.set(12.01, 2.25, -0.5);
  towerGroup.add(eastSkyBoard);

  const backRightSkyFrame = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.85, 0.10), champagneGoldMat);
  backRightSkyFrame.position.set(7.8, 2.35, 8.08);
  towerGroup.add(backRightSkyFrame);
  const backRightSkyBoard = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.65), skyBoardMat);
  backRightSkyBoard.rotation.y = Math.PI;
  backRightSkyBoard.position.set(7.8, 2.35, 8.01);
  towerGroup.add(backRightSkyBoard);

  // Front Right VIP Velvet Lounge Sofa & Coffee Table (Z = -6.0)
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 0.92), emeraldVelvetMat);
  sofaBase.position.set(7.6, 0.32, -5.6);
  towerGroup.add(sofaBase);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.56, 0.20), emeraldVelvetMat);
  sofaBack.position.set(7.6, 0.68, -5.24);
  towerGroup.add(sofaBack);
  const vipTable = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 18), lobbyFloorMarbleMat);
  vipTable.position.set(7.6, 0.52, -6.75);
  towerGroup.add(vipTable);
  const vipTablePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 0.42, 12), champagneGoldMat);
  vipTablePedestal.position.set(7.6, 0.30, -6.75);
  towerGroup.add(vipTablePedestal);

  // Mid Right "Nhà Mẫu Căn Hộ Landmark 81" Oak-Floor Vignette (X = +6.5..+11.2, Z = -1.2..+2.8)
  const showWoodPad = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.04, 4.2), oakShowroomFloorMat);
  showWoodPad.position.set(8.6, 0.095, 0.8);
  towerGroup.add(showWoodPad);
  const modelSofa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.46, 0.95), creamLeatherMat);
  modelSofa.position.set(9.2, 0.35, 1.9);
  towerGroup.add(modelSofa);
  const modelCoffee = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.36, 0.68), darkWalnutMat);
  modelCoffee.position.set(9.2, 0.30, 0.6);
  towerGroup.add(modelCoffee);
  const modelTvStand = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.50, 0.44), graniteBaseMat);
  modelTvStand.position.set(9.2, 0.36, -0.7);
  towerGroup.add(modelTvStand);
  const modelTv = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.82, 0.06), graniteBaseMat);
  modelTv.position.set(9.2, 1.15, -0.75);
  towerGroup.add(modelTv);

  // Deep Back Center Gold Express Elevator Bank (Z = +8.02)
  [-2.6, 0.0, 2.6].forEach((ex) => {
    const elevFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.2, 0.14), champagneGoldMat);
    elevFrame.position.set(ex, 1.65, 8.08);
    towerGroup.add(elevFrame);
    const elevDoors = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.95, 0.10), brushedAluminumMat);
    elevDoors.position.set(ex, 1.55, 8.05);
    towerGroup.add(elevDoors);
    const elevInd = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.05), ledWarmGoldMat);
    elevInd.position.set(ex, 3.38, 8.03);
    towerGroup.add(elevInd);
  });

  // =========================================================================
  // 2c. CRYSTAL GLASS STOREFRONT & AUTOMATIC SLIDING GLASS DOORS (local X = -2.0 .. +2.0)
  // =========================================================================
  [-7.12, 7.12].forEach((gx) => {
    const atriumGlass = new THREE.Mesh(new THREE.BoxGeometry(10.16, 6.12, 0.10), crystalAtriumGlassMat);
    atriumGlass.position.set(gx, 3.14, -9.45);
    towerGroup.add(atriumGlass);

    // Horizontal aluminum transom bar & base sill framing the storefront glass panes
    const sideTransom = new THREE.Mesh(new THREE.BoxGeometry(10.16, 0.14, 0.22), brushedAluminumMat);
    sideTransom.position.set(gx, 3.38, -9.48);
    towerGroup.add(sideTransom);

    const sideBaseSill = new THREE.Mesh(new THREE.BoxGeometry(10.16, 0.14, 0.24), graniteBaseMat);
    sideBaseSill.position.set(gx, 0.11, -9.48);
    towerGroup.add(sideBaseSill);
  });

  const portalTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.75, 0.10), crystalAtriumGlassMat);
  portalTransomGlass.position.set(0, 4.82, -9.45);
  towerGroup.add(portalTransomGlass);

  [-12.0, -9.6, -7.2, -4.6, -2.05, 2.05, 4.6, 7.2, 9.6, 12.0].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 6.12, 0.24), brushedAluminumMat);
    mullion.position.set(mx, 3.14, -9.48);
    towerGroup.add(mullion);
  });

  const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.20, 0.36), champagneGoldMat);
  portalHeader.position.set(0, 3.38, -9.48);
  towerGroup.add(portalHeader);

  // Automatic Door Motion Sensor Bar above Center Entrance
  const sensorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.18), graniteBaseMat);
  sensorHousing.position.set(0, 3.55, -9.60);
  towerGroup.add(sensorHousing);
  const sensorLed = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), ledIceCyanMat);
  sensorLed.position.set(0, 3.54, -9.70);
  towerGroup.add(sensorLed);

  // Automatic Double Sliding Glass Entrance Doors (userData.noMerge = true so they slide smoothly)
  const createLandmarkSlidingDoorLeaf = (isLeft: boolean) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(2.02, 3.24, 0.06), slidingDoorGlassMat);
    glassPane.position.y = 1.66;
    leaf.add(glassPane);

    const safetyBand = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.14, 0.07), frostedSafetyBandMat);
    safetyBand.position.y = 1.18;
    leaf.add(safetyBand);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.10, 0.10), brushedAluminumMat);
    topRail.position.y = 3.24;
    leaf.add(topRail);

    const botRail = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.14, 0.10), champagneGoldMat);
    botRail.position.y = 0.09;
    leaf.add(botRail);

    const outerStile = new THREE.Mesh(new THREE.BoxGeometry(0.07, 3.24, 0.10), brushedAluminumMat);
    outerStile.position.set(isLeft ? -0.99 : 0.99, 1.66, 0);
    leaf.add(outerStile);

    const innerStile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.24, 0.09), champagneGoldMat);
    innerStile.position.set(isLeft ? 0.99 : -0.99, 1.66, 0);
    leaf.add(innerStile);

    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 8), champagneGoldMat);
    handleBar.position.set(isLeft ? 0.84 : -0.84, 1.32, -0.07);
    leaf.add(handleBar);

    return leaf;
  };

  const doorLeft = createLandmarkSlidingDoorLeaf(true);
  doorLeft.position.set(-1.02, 0, -9.45);
  towerGroup.add(doorLeft);

  const doorRight = createLandmarkSlidingDoorLeaf(false);
  doorRight.position.set(1.02, 0, -9.45);
  towerGroup.add(doorRight);

  const canopyDeck = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.22, 3.2), graniteBaseMat);
  canopyDeck.position.set(0, 4.35, -11.05);
  towerGroup.add(canopyDeck);
  const canopyGoldEdge = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.09, 3.32), champagneGoldMat);
  canopyGoldEdge.position.set(0, 4.46, -11.05);
  towerGroup.add(canopyGoldEdge);
  const canopyLedUnder = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.06, 2.4), lobbyCeilingCoveMat);
  canopyLedUnder.position.set(0, 4.21, -11.05);
  towerGroup.add(canopyLedUnder);

  [-5.2, 5.2].forEach((px) => {
    const colA = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 4.35, 10), champagneGoldMat);
    colA.position.set(px, 2.18, -12.15);
    towerGroup.add(colA);
  });

  // Flanking Luxury Designer Boutique Vitrines on Outer Travertine Wings (X = ±13.7, Z = -9.52)
  const leftVitrineMat = new THREE.MeshStandardMaterial({
    map: createLuxuryBoutiqueVitrineTexture('VINHOMES VIP', 'PENTHOUSE • VILLAS', '#d4af37'),
    emissive: 0xfef3c7,
    emissiveIntensity: 0.25,
    roughness: 0.25,
  });
  const rightVitrineMat = new THREE.MeshStandardMaterial({
    map: createLuxuryBoutiqueVitrineTexture('VINPEARL SKY', '5-STAR HOTEL & SPA', '#7dd3fc'),
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.25,
    roughness: 0.25,
  });
  neonMats.push(leftVitrineMat, rightVitrineMat);

  const leftVitrine = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.8), leftVitrineMat);
  leftVitrine.rotation.y = Math.PI;
  leftVitrine.position.set(-13.7, 2.6, -9.52);
  towerGroup.add(leftVitrine);

  const rightVitrine = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.8), rightVitrineMat);
  rightVitrine.rotation.y = Math.PI;
  rightVitrine.position.set(13.7, 2.6, -9.52);
  towerGroup.add(rightVitrine);

  [-13.4, -8.8, 8.8, 13.4].forEach((px) => {
    const planter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 1.0), travertineStoneMat);
    planter.position.set(px, 0.28, -10.35);
    towerGroup.add(planter);
    const soilBush = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.35, 0.78), skyGardenMat);
    soilBush.position.set(px, 0.65, -10.35);
    towerGroup.add(soilBush);
    if (Math.abs(px) > 11) {
      const palmTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 2.4, 8), darkTreeTrunkMat);
      palmTrunk.position.set(px, 1.7, -10.35);
      towerGroup.add(palmTrunk);
      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), skyGardenMat);
      canopy.position.set(px, 3.1, -10.35);
      towerGroup.add(canopy);
    }
  });

  // =========================================================================
  // 3. FULL-PROPORTION LANDMARK 81 BUNDLED-TUBE TOWER (7×5 Square Bamboo Cluster = 28.25m wide)
  // =========================================================================
  const tubeHeights: number[][] = [
    [18, 25, 34, 44, 36, 26, 19],
    [23, 33, 47, 60, 49, 35, 24],
    [29, 43, 57, 73, 62, 45, 30],
    [24, 36, 51, 64, 53, 38, 25],
    [19, 27, 38, 48, 39, 28, 20],
  ];
  const tubeSize = 3.95;
  const tubeStep = 4.05;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const topY = tubeHeights[row][col];
      const baseBottomY = 9.3;
      const shaftH = topY - baseBottomY;
      const cx = (col - 3) * tubeStep;
      const cz = (row - 2) * tubeStep + 1.0;

      const tubeGeom = buildFloorAlignedTubeGeometry(tubeSize, shaftH, tubeSize);
      const tubeMesh = new THREE.Mesh(tubeGeom, towerGlassMat);
      tubeMesh.position.set(cx, baseBottomY + shaftH / 2, cz);
      towerGroup.add(tubeMesh);

      const crownCap = new THREE.Mesh(new THREE.BoxGeometry(tubeSize + 0.08, 0.28, tubeSize + 0.08), brushedAluminumMat);
      crownCap.position.set(cx, topY - 0.14, cz);
      towerGroup.add(crownCap);

      const crownLedMat = topY >= 58 ? ledWarmGoldMat : topY >= 40 ? ledPureWhiteMat : ledIceCyanMat;
      const crownLed = new THREE.Mesh(new THREE.BoxGeometry(tubeSize + 0.12, 0.10, tubeSize + 0.12), crownLedMat);
      crownLed.position.set(cx, topY - 0.34, cz);
      towerGroup.add(crownLed);

      if (topY < 58) {
        const garden = new THREE.Mesh(new THREE.BoxGeometry(tubeSize - 0.75, 0.18, tubeSize - 0.75), skyGardenMat);
        garden.position.set(cx, topY + 0.09, cz);
        towerGroup.add(garden);
      }

      if (row === 0 || (row === 1 && (col === 0 || col === 6)) || topY >= 58) {
        const finMat = topY >= 58 ? ledWarmGoldMat : ledIceCyanMat;
        const finLeft = new THREE.Mesh(new THREE.BoxGeometry(0.10, shaftH, 0.10), finMat);
        finLeft.position.set(cx - tubeSize / 2 + 0.05, baseBottomY + shaftH / 2, cz - tubeSize / 2 - 0.03);
        towerGroup.add(finLeft);
      }
    }
  }

  // =========================================================================
  // 4. SKYVIEW 81 OBSERVATORY COLLAR, DIAGRID CROWN & SPIRE (Y = 73m .. 86.5m)
  // =========================================================================
  const obsRingGlass = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 4.4), crystalAtriumGlassMat);
  obsRingGlass.position.set(0, 68.5, 1.0);
  towerGroup.add(obsRingGlass);

  const crownBaseCollar = new THREE.Mesh(new THREE.BoxGeometry(4.15, 1.1, 4.15), brushedAluminumMat);
  crownBaseCollar.position.set(0, 73.5, 1.0);
  towerGroup.add(crownBaseCollar);

  const spireHaloRing = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.24, 4.35), ledWarmGoldMat);
  spireHaloRing.position.set(0, 73.25, 1.0);
  towerGroup.add(spireHaloRing);

  const upperSpirePyramid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 2.0, 5.4, 4), brushedAluminumMat);
  upperSpirePyramid.rotation.y = Math.PI / 4;
  upperSpirePyramid.position.set(0, 76.7, 1.0);
  towerGroup.add(upperSpirePyramid);

  const needleMast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.24, 7.2, 8), brushedAluminumMat);
  needleMast.position.set(0, 82.8, 1.0);
  towerGroup.add(needleMast);

  const needleGlowTube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 4.2, 8), ledIceCyanMat);
  needleGlowTube.position.set(0, 81.5, 1.0);
  towerGroup.add(needleGlowTube);

  const aviationBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.30, 10, 10), beaconRedMat);
  aviationBeacon.position.set(0, 86.5, 1.0);
  towerGroup.add(aviationBeacon);

  return {
    staticGroup: towerGroup,
    doorLeft,
    doorRight,
    neonMats,
    windowGlowMats,
    podiumPointLights,
  };
}

// =========================================================================
// 5. ANIMATED LANDMARK 81 NPC CONTROLLER (Sale BĐS, Concierge & Deep Visitors)
// =========================================================================
interface L81NpcRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  glbHandle: GlbHumanHandle;
}

interface StationaryPresenterActor extends L81NpcRig {
  baseY: number;
  phaseOffset: number;
  role: 'saban_agent' | 'desk_agent' | 'concierge' | 'seated_buyer';
}

interface VisitingBuyerActor extends L81NpcRig {
  waypoints: Array<{ x: number; z: number; pauseSec: number }>;
  wpIdx: number;
  x: number;
  z: number;
  speed: number;
  pauseTimer: number;
  walkPhase: number;
}

export class Landmark81NpcController {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  private staffAndSeated: StationaryPresenterActor[] = [];
  private visitingBuyers: VisitingBuyerActor[] = [];

  constructor(helpers: Landmark81CharacterHelpers) {
    this.rootGroup.userData.noMerge = true;
    this.buildStationaryStaffAndSeated(helpers);
    this.buildVisitingBuyers(helpers);
  }

  private buildNpcRig(
    paletteIndex: number,
    helpers: Landmark81CharacterHelpers,
    opts: { role: 'sales_suit' | 'concierge_gold' | 'buyer'; withTabletFolder?: boolean; seated?: boolean; walker?: boolean }
  ): L81NpcRig {
    const skinPalette = [
      { color: 0xffdbac, hex: '#ffdbac' },
      { color: 0xf1c27d, hex: '#f1c27d' },
      { color: 0xe0ac69, hex: '#e0ac69' },
      { color: 0xc68642, hex: '#c68642' },
    ];
    const hairPalette = [0x111111, 0x2b1d0c, 0x1e293b, 0x6b3e1a];
    const buyerShirtPalette = [0x2563eb, 0xe11d48, 0x0d9488, 0xf8fafc, 0x4f46e5];

    const skin = skinPalette[paletteIndex % skinPalette.length];
    const hair = hairPalette[(paletteIndex + 1) % hairPalette.length];
    const shirtColor =
      opts.role === 'sales_suit'
        ? 0x0f172a
        : opts.role === 'concierge_gold'
        ? 0x7c2d12
        : buyerShirtPalette[paletteIndex % buyerShirtPalette.length];
    const pantsColor = opts.role === 'buyer' ? 0x334155 : 0x090d16;

    const skinMat = new THREE.MeshStandardMaterial({ color: skin.color, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.50 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.70 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.42 });
    const tieGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.30, metalness: 0.5 });
    const whiteShirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });

    const group = new THREE.Group();
    const hipsGroup = new THREE.Group();
    hipsGroup.position.set(0, 0.84, 0);
    group.add(hipsGroup);

    const buildLeg = (lx: number) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(lx, 0, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.40, 0.145), pantsMat);
      thigh.position.set(0, -0.20, 0);
      hipPivot.add(thigh);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.40, 0);
      hipPivot.add(kneePivot);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.36, 0.135), pantsMat);
      shin.position.set(0, -0.18, 0);
      kneePivot.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.09, 0.22), shoesMat);
      shoe.position.set(0, -0.39, 0.04);
      kneePivot.add(shoe);

      hipsGroup.add(hipPivot);
      return { hipPivot, kneePivot };
    };
    const leftLegPair = buildLeg(-0.1);
    const rightLegPair = buildLeg(0.1);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), shirtMat);
    torso.position.set(0, 0.29, 0);
    hipsGroup.add(torso);

    if (opts.role === 'sales_suit' || opts.role === 'concierge_gold') {
      const shirtCollar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.25), whiteShirtMat);
      shirtCollar.position.set(0, 0.44, 0.005);
      hipsGroup.add(shirtCollar);

      const necktie = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.26, 0.26), tieGoldMat);
      necktie.position.set(0, 0.36, 0.01);
      hipsGroup.add(necktie);

      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.26), tieGoldMat);
      badge.position.set(0.11, 0.41, 0.01);
      hipsGroup.add(badge);
    }

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0);
    const faceTex = helpers.createFaceTexture('happy', skin.hex);
    headGroup.add(helpers.createHeadMesh(skinMat, faceTex, 0.23, 0.25, 0.22));
    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.09, 0.24), hairMat);
    hairCap.position.set(0, 0.145, -0.01);
    headGroup.add(hairCap);
    hipsGroup.add(headGroup);

    const buildArm = (ax: number) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(ax, 0.50, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.11), shirtMat);
      sleeve.position.set(0, -0.11, 0);
      armPivot.add(sleeve);
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.24, 0.095), skinMat);
      forearm.position.set(0, -0.32, 0);
      armPivot.add(forearm);
      hipsGroup.add(armPivot);
      return armPivot;
    };
    const leftArm = buildArm(-0.275);
    const rightArm = buildArm(0.275);

    if (opts.withTabletFolder) {
      const folder = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.32), tieGoldMat);
      folder.position.set(0.02, -0.40, 0.14);
      leftArm.add(folder);
    }

    const spec =
      opts.role === 'concierge_gold'
        ? CASHIER_NPC_MODEL
        : opts.seated
        ? pickSeatedCivilianModel(paletteIndex * 3 + 4)
        : opts.walker
        ? pickOutsideNpcModel(paletteIndex * 5 + 3)
        : pickStationaryCivilianModel(paletteIndex * 3 + (opts.role === 'sales_suit' ? 1 : 4));
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: group,
      fallbackMeshes: [hipsGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: opts.seated ? 'Sit' : opts.walker ? 'Walk' : 'Idle',
      phaseOffset: paletteIndex * 1.1,
    });

    return {
      group,
      hipsGroup,
      leftLeg: leftLegPair.hipPivot,
      rightLeg: rightLegPair.hipPivot,
      leftKnee: leftLegPair.kneePivot,
      rightKnee: rightLegPair.kneePivot,
      leftArm,
      rightArm,
      headGroup,
      glbHandle,
    };
  }

  private buildStationaryStaffAndSeated(helpers: Landmark81CharacterHelpers) {
    // 1. Sale BĐS #1 beside the Giant Sa Bàn (World: X = -5.2, Z = 49.8)
    const sabanAgent = this.buildNpcRig(0, helpers, { role: 'sales_suit', withTabletFolder: true });
    sabanAgent.group.position.set(-5.2, 0.08, 49.8);
    sabanAgent.group.rotation.y = -Math.PI * 0.65;
    this.rootGroup.add(sabanAgent.group);
    this.staffAndSeated.push({ ...sabanAgent, baseY: 0.08, phaseOffset: 0.4, role: 'saban_agent' });

    // 2. Sale BĐS #2 at Front-Mid Consultation Desk (World: X = -8.6, Z = 54.9)
    const deskAgent1 = this.buildNpcRig(1, helpers, { role: 'sales_suit' });
    deskAgent1.group.position.set(-8.6, 0.08, 54.9);
    deskAgent1.group.rotation.y = Math.PI;
    this.rootGroup.add(deskAgent1.group);
    this.staffAndSeated.push({ ...deskAgent1, baseY: 0.08, phaseOffset: 1.7, role: 'desk_agent' });

    // 3. Sale BĐS #3 at Deep Contract Desk (World: X = -6.1, Z = 58.5)
    const deskAgent2 = this.buildNpcRig(2, helpers, { role: 'sales_suit', withTabletFolder: true });
    deskAgent2.group.position.set(-6.1, 0.08, 58.5);
    deskAgent2.group.rotation.y = Math.PI;
    this.rootGroup.add(deskAgent2.group);
    this.staffAndSeated.push({ ...deskAgent2, baseY: 0.08, phaseOffset: 2.9, role: 'desk_agent' });

    // 4. Sale BĐS #4 guiding inside "Nhà Mẫu Căn Hộ Landmark 81" (World: X = +7.4, Z = 56.8)
    const showroomAgent = this.buildNpcRig(3, helpers, { role: 'sales_suit', withTabletFolder: true });
    showroomAgent.group.position.set(7.4, 0.08, 56.8);
    showroomAgent.group.rotation.y = -Math.PI * 0.72;
    this.rootGroup.add(showroomAgent.group);
    this.staffAndSeated.push({ ...showroomAgent, baseY: 0.08, phaseOffset: 4.1, role: 'saban_agent' });

    // 5. Center Grand Concierge behind reception desk (World: X = 0.0, Z = 54.5)
    const concierge1 = this.buildNpcRig(3, helpers, { role: 'concierge_gold' });
    concierge1.group.position.set(0.0, 0.08, 54.5);
    concierge1.group.rotation.y = Math.PI;
    this.rootGroup.add(concierge1.group);
    this.staffAndSeated.push({ ...concierge1, baseY: 0.08, phaseOffset: 0.9, role: 'concierge' });

    // 6. Deep Elevator Bank Bellhop / Concierge (World: X = 0.0, Z = 63.3)
    const concierge2 = this.buildNpcRig(0, helpers, { role: 'concierge_gold', withTabletFolder: true });
    concierge2.group.position.set(0.0, 0.08, 63.3);
    concierge2.group.rotation.y = Math.PI;
    this.rootGroup.add(concierge2.group);
    this.staffAndSeated.push({ ...concierge2, baseY: 0.08, phaseOffset: 2.1, role: 'concierge' });

    // 7. Seated Buyer Client #1 at BĐS Consultation Desk (World: X = -8.6, Z = 53.38)
    const buyerSeated1 = this.buildNpcRig(2, helpers, { role: 'buyer', withTabletFolder: true, seated: true });
    buyerSeated1.group.position.set(-8.6, 0.08, 53.38);
    buyerSeated1.group.rotation.y = 0;
    buyerSeated1.hipsGroup.position.y = 0.56;
    buyerSeated1.leftLeg.rotation.x = -Math.PI / 2;
    buyerSeated1.rightLeg.rotation.x = -Math.PI / 2;
    buyerSeated1.leftKnee.rotation.x = Math.PI / 2;
    buyerSeated1.rightKnee.rotation.x = Math.PI / 2;
    this.rootGroup.add(buyerSeated1.group);
    this.staffAndSeated.push({ ...buyerSeated1, baseY: 0.08, phaseOffset: 1.1, role: 'seated_buyer' });

    // 8. Seated VIP Buyer #2 on Front-Right Emerald Lounge Sofa (World: X = +7.6, Z = 50.4)
    const buyerSeated2 = this.buildNpcRig(3, helpers, { role: 'buyer', seated: true });
    buyerSeated2.group.position.set(7.6, 0.08, 50.4);
    buyerSeated2.group.rotation.y = Math.PI;
    buyerSeated2.hipsGroup.position.y = 0.52;
    buyerSeated2.leftLeg.rotation.x = -Math.PI / 2;
    buyerSeated2.rightLeg.rotation.x = -Math.PI / 2;
    buyerSeated2.leftKnee.rotation.x = Math.PI / 2;
    buyerSeated2.rightKnee.rotation.x = Math.PI / 2;
    this.rootGroup.add(buyerSeated2.group);
    this.staffAndSeated.push({ ...buyerSeated2, baseY: 0.08, phaseOffset: 3.4, role: 'seated_buyer' });
  }

  private buildVisitingBuyers(helpers: Landmark81CharacterHelpers) {
    // Route 1: Front sidewalk -> Red carpet entrance -> Sa Bàn -> Mid BĐS Desk -> Deep Elevator Lobby -> Out
    const buyerRouteA: Array<{ x: number; z: number; pauseSec: number }> = [
      { x: -16.0, z: 41.2, pauseSec: 0.5 },
      { x: -0.4, z: 42.2, pauseSec: 0.2 },
      { x: -0.4, z: 47.6, pauseSec: 0.4 },
      { x: -7.2, z: 48.2, pauseSec: 6.0 }, // Inspects Front Sa Bàn Landmark 81
      { x: -6.1, z: 56.5, pauseSec: 5.0 }, // Tours Deep BĐS Contract Booth
      { x: -2.4, z: 62.6, pauseSec: 3.5 }, // Checks Deep SkyView 81 Elevator Bank
      { x: 0.4, z: 49.0, pauseSec: 0.6 },
      { x: 0.4, z: 41.8, pauseSec: 0.2 },
      { x: 16.5, z: 41.2, pauseSec: 0.8 },
    ];

    // Route 2: Enters East -> Concierge -> Nhà Mẫu Căn Hộ Showroom -> Back BĐS Mural -> Front Sa Bàn -> Out
    const buyerRouteB: Array<{ x: number; z: number; pauseSec: number }> = [
      { x: 15.0, z: 41.5, pauseSec: 0.5 },
      { x: 0.5, z: 42.4, pauseSec: 0.2 },
      { x: 0.5, z: 52.0, pauseSec: 2.0 }, // Stops at Center Concierge
      { x: 6.2, z: 56.4, pauseSec: 5.5 }, // Tours Nhà Mẫu Căn Hộ Landmark 81
      { x: 2.2, z: 62.4, pauseSec: 3.5 }, // Walks to Deep Back Elevator Gallery
      { x: -5.8, z: 48.4, pauseSec: 4.5 }, // Admires Front Sa Bàn on way out
      { x: -0.3, z: 41.8, pauseSec: 0.3 },
      { x: -15.5, z: 41.5, pauseSec: 0.6 },
    ];

    [
      { route: buyerRouteA, startIdx: 3, palette: 1, speed: 1.38 },
      { route: buyerRouteB, startIdx: 1, palette: 4, speed: 1.28 },
    ].forEach((cfg) => {
      const rig = this.buildNpcRig(cfg.palette, helpers, { role: 'buyer', walker: true });
      const startPt = cfg.route[cfg.startIdx];
      rig.group.position.set(startPt.x, 0.08, startPt.z);
      this.rootGroup.add(rig.group);
      this.visitingBuyers.push({
        ...rig,
        waypoints: cfg.route,
        wpIdx: (cfg.startIdx + 1) % cfg.route.length,
        x: startPt.x,
        z: startPt.z,
        speed: cfg.speed,
        pauseTimer: 2.0,
        walkPhase: cfg.palette * 1.4,
      });
    });
  }

  public hasVisitorNearEntrance(minZ: number, maxZ: number, maxAbsX: number): boolean {
    for (let i = 0; i < this.visitingBuyers.length; i++) {
      const b = this.visitingBuyers[i];
      if (Math.abs(b.x) <= maxAbsX && b.z >= minZ && b.z <= maxZ) {
        return true;
      }
    }
    return false;
  }

  public update(delta: number) {
    const dt = Math.min(delta, 0.1);
    const now = performance.now() * 0.001;

    for (let i = 0; i < this.staffAndSeated.length; i++) {
      const a = this.staffAndSeated[i];
      const t = now * 1.65 + a.phaseOffset;
      if (a.role === 'saban_agent') {
        a.rightArm.rotation.x = -0.55 + Math.sin(t * 1.15) * 0.28;
        a.rightArm.rotation.z = -0.18 + Math.cos(t * 0.85) * 0.12;
        a.leftArm.rotation.x = -0.68;
        a.headGroup.rotation.y = Math.sin(t * 0.7) * 0.26;
        a.headGroup.rotation.x = 0.08 + Math.sin(t * 1.6) * 0.05;
      } else if (a.role === 'desk_agent') {
        a.rightArm.rotation.x = -0.45 + Math.sin(t * 1.8) * 0.18;
        a.leftArm.rotation.x = -0.52 + Math.cos(t * 1.4) * 0.14;
        a.headGroup.rotation.y = Math.sin(t * 0.9) * 0.18;
        a.headGroup.rotation.x = 0.06 + Math.abs(Math.sin(t * 1.3)) * 0.06;
      } else if (a.role === 'concierge') {
        a.rightArm.rotation.x = Math.sin(t * 0.9) * 0.22 - 0.15;
        a.leftArm.rotation.x = -0.20 + Math.cos(t * 0.8) * 0.10;
        a.headGroup.rotation.y = Math.sin(t * 0.55) * 0.28;
      } else {
        a.leftArm.rotation.x = -0.62 + Math.sin(t * 0.9) * 0.06;
        a.rightArm.rotation.x = -0.52 + Math.cos(t * 1.1) * 0.10;
        a.headGroup.rotation.x = 0.12 + Math.sin(t * 1.2) * 0.06;
        a.headGroup.rotation.y = Math.sin(t * 0.65) * 0.18;
      }
    }

    for (let i = 0; i < this.visitingBuyers.length; i++) {
      const b = this.visitingBuyers[i];
      if (b.pauseTimer > 0) {
        b.glbHandle.setAnimState('Idle');
        b.pauseTimer -= dt;
        const lookPhase = now * 1.5 + i;
        b.leftLeg.rotation.x = 0;
        b.rightLeg.rotation.x = 0;
        b.leftArm.rotation.x = -0.18 + Math.sin(lookPhase) * 0.08;
        b.rightArm.rotation.x = -0.25 + Math.cos(lookPhase * 1.1) * 0.12;
        b.headGroup.rotation.y = Math.sin(lookPhase * 0.8) * 0.30;
        b.headGroup.rotation.x = 0.05;
        continue;
      }

      b.glbHandle.setAnimState('Walk');
      const target = b.waypoints[b.wpIdx];
      const dx = target.x - b.x;
      const dz = target.z - b.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.12) {
        b.x = target.x;
        b.z = target.z;
        b.pauseTimer = target.pauseSec;
        b.wpIdx = (b.wpIdx + 1) % b.waypoints.length;
        continue;
      }

      const step = Math.min(dist, b.speed * dt);
      b.x += (dx / dist) * step;
      b.z += (dz / dist) * step;
      b.group.rotation.y = Math.atan2(dx, dz);
      b.group.position.set(b.x, 0.08, b.z);

      b.walkPhase += dt * b.speed * 5.2;
      const swing = Math.sin(b.walkPhase) * 0.45;
      b.leftLeg.rotation.x = swing;
      b.rightLeg.rotation.x = -swing;
      b.leftArm.rotation.x = -swing * 0.7;
      b.rightArm.rotation.x = swing * 0.7;
      b.hipsGroup.position.y = 0.84 + Math.abs(Math.cos(b.walkPhase)) * 0.035;
      b.headGroup.rotation.y = 0;
      b.headGroup.rotation.x = 0;
    }
  }
}
