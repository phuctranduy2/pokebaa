import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import {
  computeBoulevardSignalFactor,
  type BoulevardSignalGetter,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isVinFastShowroomOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { buildCityCarMesh } from './CityVehicleMeshBuilder';

export interface VinFastCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface VinFastBuildResult {
  staticGroup: THREE.Group;
  turntableGroup: THREE.Group;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number; isOutdoor?: boolean }>;
  forecourtBayRigs: VinFastForecourtBayRig[];
  updateOperatingHours: (rawHour: number, delta: number, npcController?: VinFastShowroomNpcController | null) => void;
  getClosedFactor: () => number;
}

function drawVinFastVLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  strokeColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Iconic double-wing VinFast 'V' emblem
  ctx.beginPath();
  ctx.moveTo(-size * 0.44, -size * 0.34);
  ctx.lineTo(0, size * 0.38);
  ctx.lineTo(size * 0.44, -size * 0.34);
  ctx.stroke();

  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(-size * 0.28, -size * 0.34);
  ctx.lineTo(0, size * 0.16);
  ctx.lineTo(size * 0.28, -size * 0.34);
  ctx.stroke();
  ctx.restore();
}

function createVinFastFasciaSignTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 340;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Rich satin obsidian-navy metallic gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#040a14');
  grad.addColorStop(0.32, '#0a1830');
  grad.addColorStop(0.5, '#102446');
  grad.addColorStop(0.68, '#0a1830');
  grad.addColorStop(1, '#040a14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural brushed sheen bands
  ctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.fillRect(0, 34, w, 2);
  ctx.fillRect(0, h - 36, w, 2);

  // Top electric blue & bottom emerald-cyan light bars
  const topBar = ctx.createLinearGradient(0, 0, w, 0);
  topBar.addColorStop(0, '#0f172a');
  topBar.addColorStop(0.25, '#2563eb');
  topBar.addColorStop(0.5, '#38bdf8');
  topBar.addColorStop(0.75, '#2563eb');
  topBar.addColorStop(1, '#0f172a');
  ctx.fillStyle = topBar;
  ctx.fillRect(0, 0, w, 12);

  const botBar = ctx.createLinearGradient(0, 0, w, 0);
  botBar.addColorStop(0, '#0f172a');
  botBar.addColorStop(0.25, '#0d9488');
  botBar.addColorStop(0.5, '#34d399');
  botBar.addColorStop(0.75, '#0d9488');
  botBar.addColorStop(1, '#0f172a');
  ctx.fillStyle = botBar;
  ctx.fillRect(0, h - 10, w, 10);

  // Framed metallic V emblems cleanly positioned inside outer badges
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 48, 210, h - 96);
  ctx.strokeRect(w - 264, 48, 210, h - 96);
  drawVinFastVLogo(ctx, 159, h / 2, 148, '#e2e8f0');
  drawVinFastVLogo(ctx, w - 159, h / 2, 148, '#e2e8f0');

  // Crisp backlit silver-white main wordmark
  ctx.shadowColor = 'rgba(56, 189, 248, 0.55)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 116px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('V I N F A S T', w / 2, h / 2 - 26);
  ctx.shadowBlur = 0;

  // Well-padded luxury subtitle (strictly inside X = 320..1728)
  ctx.fillStyle = '#7dd3fc';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText('FLAGSHIP SHOWROOM  •  TRẠM SẠC V-GREEN  •  BOUNDLESS TOGETHER', w / 2, h / 2 + 78);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createChargingStationCanopySignTexture(): THREE.CanvasTexture {
  const w = 1280;
  const h = 180;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#03151d');
  grad.addColorStop(0.5, '#072a36');
  grad.addColorStop(1, '#03151d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // Clean vertical separator after logo badge
  ctx.fillStyle = 'rgba(52, 211, 153, 0.25)';
  ctx.fillRect(156, 28, 3, h - 56);
  drawVinFastVLogo(ctx, 84, h / 2, 74, '#6ee7b7');

  ctx.fillStyle = '#f0fdf4';
  ctx.font = '900 46px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('V-GREEN  •  TRẠM SẠC SIÊU NHANH VINFAST', w / 2 + 55, h / 2 - 22);

  ctx.fillStyle = '#34d399';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('DC FAST CHARGER 180kW – 250kW  •  CCS2  •  HOẠT ĐỘNG 24/7', w / 2 + 55, h / 2 + 34);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawChargerScreenCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bayLabel: string,
  statusText: string,
  pctText: string,
  powerText: string,
  isCharging: boolean
) {
  ctx.fillStyle = '#04121b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = isCharging ? '#06b6d4' : '#10b981';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  drawVinFastVLogo(ctx, w / 2, 54, 48, '#38bdf8');

  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(bayLabel, w / 2, 108);

  ctx.fillStyle = isCharging ? '#22d3ee' : '#34d399';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText(statusText, w / 2, 152);

  // Battery progress ring / box
  ctx.strokeStyle = isCharging ? '#06b6d4' : '#10b981';
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 182, w - 72, 92);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 50px monospace';
  ctx.fillText(pctText, w / 2, 240);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '700 22px monospace';
  ctx.fillText(powerText, w / 2, 326);
}

function createVinFastSpecBoardTexture(
  modelName: string,
  tagline: string,
  rangeKm: string,
  powerHp: string,
  accentHex: string
): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0b1322';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, w, 14);
  ctx.fillRect(0, h - 10, w, 10);

  drawVinFastVLogo(ctx, 56, 60, 48, '#e2e8f0');

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(modelName, 100, 68);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(tagline, 36, 128);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(36, 165, w - 72, 2);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('QUÃNG ĐƯỜNG (WLTP)', 36, 212);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText(rangeKm, 36, 254);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('CÔNG SUẤT ĐỘNG CƠ', 36, 310);
  ctx.fillStyle = '#34d399';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText(powerHp, 36, 352);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createVinFastShowroomFloorTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, size, size);

  const cells = 4;
  const cell = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#3d4c63' : '#334155';
      ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
    }
  }

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 2;
  for (let i = 1; i < cells; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, size);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(size, i * cell);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 7);
  tex.anisotropy = 4;
  return tex;
}

export interface VinFastEvVehicleRig {
  group: THREE.Group;
  wheels: THREE.Group[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  hazardMat: THREE.MeshStandardMaterial;
  driverSeated: THREE.Group | null;
  wheelR: number;
  halfW: number;
  halfL: number;
}

export function createVinFastEvVehicle(opts: {
  variant: 'vf9' | 'vf8' | 'vf7' | 'vf3';
  paintHex: number;
  withRoofContrast?: boolean;
  withSeatedDriver?: boolean;
  driverShirtHex?: number;
  driverSkinHex?: string;
  noMerge?: boolean;
}): VinFastEvVehicleRig {
  const isVf3 = opts.variant === 'vf3';
  const scale =
    opts.variant === 'vf9'
      ? 1.09
      : opts.variant === 'vf8'
        ? 1.03
        : opts.variant === 'vf7'
          ? 1.0
          : 0.90;

  const built = buildCityCarMesh({
    color: opts.paintHex,
    variant: isVf3 ? 'hatchback' : 'suv',
    headlightIntensity: 0.95,
    brakeIntensity: 0.85,
    noMerge: opts.noMerge ?? true,
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.82,
    roughness: 0.22,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.05,
    roughness: 0.3,
  });

  // Cool white-cyan EV tint matching VinFast signature DRLs
  built.headlightMat.color.setHex(0xe0f2fe);
  built.headlightMat.emissive.setHex(0x7dd3fc);

  // Signature VinFast contrast white roof option on VF3 / showroom display models
  if (opts.withRoofContrast) {
    const contrastRoofMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.32,
      metalness: 0.12,
    });
    const contrastRoof = new THREE.Mesh(
      new THREE.BoxGeometry(isVf3 ? 1.24 : 1.30, 0.03, isVf3 ? 1.74 : 1.98),
      contrastRoofMat
    );
    contrastRoof.position.set(0, isVf3 ? 1.43 : 1.59, isVf3 ? -0.48 : -0.49);
    built.group.add(contrastRoof);
  }

  // Signature VinFast 'V' Front DRL Wings, Center V Badge & Amber Hazard Indicators
  const frontZ = isVf3 ? 1.965 : 2.23;
  const frontY = 0.54;
  const rearZ = isVf3 ? -1.93 : -2.21;
  const rearY = isVf3 ? 0.78 : 0.86;
  const wingSpan = isVf3 ? 0.68 : 0.78;

  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(wingSpan, 0.045, 0.03),
      built.headlightMat
    );
    wing.position.set(side * (wingSpan * 0.5 + 0.05), frontY + 0.05, frontZ);
    wing.rotation.z = side * 0.22;
    built.group.add(wing);

    const rearWing = new THREE.Mesh(
      new THREE.BoxGeometry(wingSpan, 0.045, 0.03),
      built.brakeMat
    );
    rearWing.position.set(side * (wingSpan * 0.5 + 0.05), rearY, rearZ);
    rearWing.rotation.z = side * 0.22;
    built.group.add(rearWing);

    const frontCorner = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.065, 0.04), hazardMat);
    frontCorner.position.set(side * (isVf3 ? 0.72 : 0.82), 0.42, frontZ - 0.01);
    built.group.add(frontCorner);

    const rearCorner = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.065, 0.04), hazardMat);
    rearCorner.position.set(side * (isVf3 ? 0.72 : 0.82), 0.66, rearZ + 0.01);
    built.group.add(rearCorner);
  });

  const frontBadge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.04), alloyMat);
  frontBadge.position.set(0, frontY - 0.01, frontZ + 0.01);
  built.group.add(frontBadge);

  built.group.scale.setScalar(scale);

  return {
    group: built.group,
    wheels: built.wheels as THREE.Group[],
    headlightMat: built.headlightMat,
    brakeMat: built.brakeMat,
    hazardMat,
    driverSeated: null,
    wheelR: built.wheelR * scale,
    halfW: built.halfW * scale,
    halfL: built.halfL * scale,
  };
}

function createVinFastEvMesh(opts: {
  variant: 'vf9' | 'vf8' | 'vf7' | 'vf3';
  paintHex: number;
  withRoofContrast?: boolean;
}): THREE.Group {
  return createVinFastEvVehicle({ ...opts, noMerge: false }).group;
}

export interface VinFastForecourtBayRig {
  bayIndex: number;
  bayLabel: string;
  worldX: number;
  pillarWorldX: number;
  carParkZ: number;
  activeCableMesh: THREE.Mesh;
  holsterCableMesh: THREE.Mesh;
  statusCrownMat: THREE.MeshStandardMaterial;
  updateScreen: (statusText: string, pctText: string, powerText: string, isCharging: boolean) => void;
  occupiedByVehicleIdx: number | null;
}

function createChargingPillar(opts: {
  bayLabel: string;
  statusText: string;
  pctText: string;
  powerText: string;
  isCharging: boolean;
  darkMat: THREE.Material;
  whiteBodyMat: THREE.Material;
  tealAccentMat: THREE.Material;
}) {
  const pillar = new THREE.Group();

  // Concrete protection bollard base
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.18, 0.64),
    opts.darkMat
  );
  plinth.position.y = 0.09;
  pillar.add(plinth);

  // Main sleek VinFast / V-GREEN white-and-slate cabinet
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 2.05, 0.42),
    opts.whiteBodyMat
  );
  body.position.y = 1.20;
  pillar.add(body);

  // Electric Teal Side Trim Rails
  [-0.32, 0.32].forEach((sx) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 2.08, 0.44),
      opts.tealAccentMat
    );
    rail.position.set(sx, 1.21, 0);
    pillar.add(rail);
  });

  // Top illuminated LED status crown (unique per pillar so bay state animates independently)
  const statusCrownMat = new THREE.MeshStandardMaterial({
    color: opts.isCharging ? 0x38bdf8 : 0x34d399,
    emissive: opts.isCharging ? 0x0ea5e9 : 0x10b981,
    emissiveIntensity: 0.9,
    roughness: 0.30,
  });
  const statusCrown = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.14, 0.44),
    statusCrownMat
  );
  statusCrown.position.y = 2.28;
  statusCrown.userData.noMerge = true;
  pillar.add(statusCrown);

  // Dynamic Digital LCD Telemetry Screen (facing street -Z and forecourt +Z)
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  drawChargerScreenCanvas(ctx, w, h, opts.bayLabel, opts.statusText, opts.pctText, opts.powerText, opts.isCharging);
  const screenTex = new THREE.CanvasTexture(c);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 4;

  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: 0xffffff,
    emissiveMap: screenTex,
    emissiveIntensity: 0.85,
    roughness: 0.40,
  });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.72), screenMat);
  screenMesh.rotation.y = Math.PI;
  screenMesh.position.set(0, 1.48, -0.22);
  screenMesh.userData.noMerge = true;
  pillar.add(screenMesh);

  // Rear LCD Screen so player walking inside forecourt can also read it from +Z!
  const rearScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.72), screenMat);
  rearScreenMesh.position.set(0, 1.48, 0.22);
  rearScreenMesh.userData.noMerge = true;
  pillar.add(rearScreenMesh);

  let lastKey = `${opts.statusText}|${opts.pctText}|${opts.powerText}|${opts.isCharging}`;
  const updateScreen = (statusText: string, pctText: string, powerText: string, isCharging: boolean) => {
    const key = `${statusText}|${pctText}|${powerText}|${isCharging}`;
    if (key === lastKey) return;
    lastKey = key;
    drawChargerScreenCanvas(ctx, w, h, opts.bayLabel, statusText, pctText, powerText, isCharging);
    screenTex.needsUpdate = true;
  };

  return { pillar, statusCrownMat, updateScreen };
}

export function createVinFastShowroomStructure(centerX: number = -35.0): VinFastBuildResult {
  // Default centerX = -35.0 occupies world X = -50.0..-20.0 (width = 30.0m, right beside Landmark 81!)
  // World Z:
  //   42.5..52.0  (localZ = -9.5..0.0): Outdoor V-GREEN / VinFast EV Charging Plaza
  //   52.0..90.0  (localZ =  0.0..+38.0): Deep 38m Walk-In VinFast Flagship Showroom
  const group = new THREE.Group();
  group.position.set(centerX, 0, 52.0);

  const neonMats: THREE.MeshStandardMaterial[] = [];

  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.88,
    metalness: 0.04,
  });
  const floorTex = createVinFastShowroomFloorTexture();
  floorTex.repeat.set(8, 11);
  const showroomFloorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.74,
    metalness: 0.05,
  });
  const darkSlateMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.62,
    metalness: 0.28,
  });
  const graphitePanelMat = new THREE.MeshStandardMaterial({
    color: 0x293548,
    roughness: 0.52,
    metalness: 0.28,
  });
  const brushedSilverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.32,
    metalness: 0.72,
  });
  const chargerWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.15,
  });
  const vinfastBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1464f4,
    roughness: 0.42,
    metalness: 0.25,
  });
  const vinfastTealMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    roughness: 0.45,
    metalness: 0.2,
  });
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.72,
    metalness: 0.08,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x090d14,
    roughness: 0.78,
  });
  const evBayStripeMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.35,
    roughness: 0.55,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.16,
    metalness: 0.14,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const indoorCyanLedMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.25,
    roughness: 0.30,
  });

  const exteriorCyanLedMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.25,
    roughness: 0.30,
  });
  neonMats.push(exteriorCyanLedMat);

  const greenReadyLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.20,
    roughness: 0.30,
  });
  neonMats.push(greenReadyLedMat);

  const coolCeilingStripMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });

  const canopyUnderLightMat = new THREE.MeshStandardMaterial({
    color: 0xecfdf5,
    emissive: 0xa7f3d0,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });
  neonMats.push(canopyUnderLightMat);

  // Interior & V-GREEN Forecourt Lighting (24/7 under EV canopies outdoors; Showroom closes 22:00 - 07:00)
  const lightDefs = [
    { wx: centerX - 9.0, wy: 3.9, wz: 46.8, dayInt: 2.5, nightInt: 34.0, dist: 26.0, isOutdoor: true },
    { wx: centerX + 9.0, wy: 3.9, wz: 46.8, dayInt: 2.5, nightInt: 34.0, dist: 26.0, isOutdoor: true },
    { wx: centerX, wy: 5.2, wz: 57.5, dayInt: 18.0, nightInt: 72.0, dist: 46.0, isOutdoor: false },
    { wx: centerX, wy: 5.2, wz: 77.0, dayInt: 16.5, nightInt: 68.0, dist: 46.0, isOutdoor: false },
  ];
  const interiorPointLights = lightDefs.map((ld) => {
    const light = new THREE.PointLight(0xf0f9ff, ld.dayInt, ld.dist, 1.0);
    light.position.set(ld.wx, ld.wy, ld.wz);
    return { light, dayInt: ld.dayInt, nightInt: ld.nightInt, isOutdoor: ld.isOutdoor };
  });

  // ==========================================
  // 1. OUTDOOR V-GREEN / VINFAST EV CHARGING FORECOURT (localZ = -9.5..0.0)
  // ==========================================
  const forecourtSlab = new THREE.Mesh(new THREE.BoxGeometry(30.0, 0.08, 9.6), apronMat);
  forecourtSlab.position.set(0, 0.04, -4.7);
  group.add(forecourtSlab);

  // Central Pedestrian Walkway into Showroom Doors (localX = -3.6..+3.6)
  const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const centerWalkway = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.02, 9.5), walkwayMat);
  centerWalkway.position.set(0, 0.09, -4.75);
  group.add(centerWalkway);

  // Two Illuminated Steel & Glass EV Charging Canopies (West & East Bays)
  const canopyHeaderTex = createChargingStationCanopySignTexture();
  const canopyHeaderMat = new THREE.MeshStandardMaterial({
    map: canopyHeaderTex,
    emissive: 0xffffff,
    emissiveMap: canopyHeaderTex,
    emissiveIntensity: 0.78,
    roughness: 0.35,
  });
  neonMats.push(canopyHeaderMat);

  [-9.3, 9.3].forEach((cx) => {
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.24, 6.2), darkSlateMat);
    canopyRoof.position.set(cx, 4.35, -5.2);
    group.add(canopyRoof);

    const canopyEdgeTrim = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.08, 6.3), greenReadyLedMat);
    canopyEdgeTrim.position.set(cx, 4.22, -5.2);
    group.add(canopyEdgeTrim);

    // Bright recessed LED canopy under-panel illuminating the EV charging bays below
    const canopyUnderPanel = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.04, 4.2), canopyUnderLightMat);
    canopyUnderPanel.position.set(cx, 4.19, -5.2);
    group.add(canopyUnderPanel);

    // Brushed metallic sign housing + crisp V-GREEN fascia board facing street (-Z)
    const signBack = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.94, 0.16), brushedSilverMat);
    signBack.position.set(cx, 4.82, -8.25);
    group.add(signBack);

    const canopySign = new THREE.Mesh(new THREE.PlaneGeometry(9.85, 0.78), canopyHeaderMat);
    canopySign.rotation.y = Math.PI;
    canopySign.position.set(cx, 4.82, -8.35);
    canopySign.userData.noMerge = true;
    group.add(canopySign);

    // 2 Support Columns per Canopy
    [-4.6, 4.6].forEach((px) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.30, 4.3, 0.30), graphitePanelMat);
      col.position.set(cx + px, 2.15, -7.8);
      group.add(col);
    });
  });

  // 4 EV Charging Stalls (Bay 01 & 02 West, Bay 03 & 04 East) + V-GREEN Fast Charging Pillars
  const bayConfigs = [
    { carX: -11.4, pillarX: -13.6, bayLabel: 'TRỤ SẠC 01' },
    { carX: -6.8, pillarX: -9.0, bayLabel: 'TRỤ SẠC 02' },
    { carX: 6.8, pillarX: 4.8, bayLabel: 'TRỤ SẠC 03' },
    { carX: 11.4, pillarX: 9.4, bayLabel: 'TRỤ SẠC 04' },
  ];

  const forecourtBayRigs: VinFastForecourtBayRig[] = [];

  bayConfigs.forEach((bay, bayIdx) => {
    // Painted Teal EV Bay Parking Box
    [-1.4, 1.4].forEach((sx) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.015, 5.4), evBayStripeMat);
      line.position.set(bay.carX + sx, 0.088, -5.0);
      group.add(line);
    });
    const wheelStop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.20), vinfastTealMat);
    wheelStop.position.set(bay.carX, 0.15, -2.5);
    group.add(wheelStop);

    // VinFast DC Fast Charging Pillar (dynamic screen + crown)
    const pillarRes = createChargingPillar({
      bayLabel: bay.bayLabel,
      statusText: 'SẴN SÀNG',
      pctText: 'READY',
      powerText: '250 kW CCS2',
      isCharging: false,
      darkMat: darkSlateMat,
      whiteBodyMat: chargerWhiteMat,
      tealAccentMat: vinfastTealMat,
    });
    pillarRes.pillar.position.set(bay.pillarX, 0.08, -7.2);
    group.add(pillarRes.pillar);

    // Active charging cable & holstered standby cable (toggled dynamically by VinFastForecourtFleetController)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(bay.pillarX + 0.32, 1.35, -7.0),
      new THREE.Vector3((bay.pillarX + bay.carX) * 0.5, 0.35, -6.5),
      new THREE.Vector3(bay.carX - 0.92, 0.92, -5.9),
    ]);
    const activeCableMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.032, 8, false), cableMat);
    activeCableMesh.userData.noMerge = true;
    activeCableMesh.visible = false;
    group.add(activeCableMesh);

    const idleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(bay.pillarX + 0.32, 1.35, -7.15),
      new THREE.Vector3(bay.pillarX + 0.44, 0.65, -7.15),
      new THREE.Vector3(bay.pillarX + 0.32, 1.10, -7.02),
    ]);
    const holsterCableMesh = new THREE.Mesh(new THREE.TubeGeometry(idleCurve, 10, 0.028, 8, false), cableMat);
    holsterCableMesh.userData.noMerge = true;
    holsterCableMesh.visible = true;
    group.add(holsterCableMesh);

    forecourtBayRigs.push({
      bayIndex: bayIdx,
      bayLabel: bay.bayLabel,
      worldX: centerX + bay.carX,
      pillarWorldX: centerX + bay.pillarX,
      carParkZ: 52.0 - 5.1, // 46.9
      activeCableMesh,
      holsterCableMesh,
      statusCrownMat: pillarRes.statusCrownMat,
      updateScreen: pillarRes.updateScreen,
      occupiedByVehicleIdx: null,
    });
  });

  // Sculpted 3D Sidewalk VinFast Totem Pylon beside Walkway Entrance
  const pylonBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.8, 0.36), darkSlateMat);
  pylonBody.position.set(-4.2, 1.9, -8.6);
  group.add(pylonBody);

  const pylonBlueStrip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.8, 0.38), vinfastBlueMat);
  pylonBlueStrip.position.set(-4.72, 1.9, -8.6);
  group.add(pylonBlueStrip);

  const pylonFaceTex = createVinFastSpecBoardTexture(
    'VINFAST',
    'SHOWROOM: 07:00 – 22:00',
    'TRẠM SẠC 24/7',
    'SẠC NHANH 250kW',
    '#1464f4'
  );
  const pylonFaceMat = new THREE.MeshStandardMaterial({
    map: pylonFaceTex,
    emissive: 0xffffff,
    emissiveMap: pylonFaceTex,
    emissiveIntensity: 0.72,
    roughness: 0.4,
  });
  neonMats.push(pylonFaceMat);
  const pylonFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.72),
    pylonFaceMat
  );
  pylonFace.rotation.y = Math.PI;
  pylonFace.position.set(-4.2, 2.75, -8.79);
  pylonFace.userData.noMerge = true;
  group.add(pylonFace);

  // ==========================================
  // 2. DEEP 38m WALK-IN VINFAST SHOWROOM BUILDING (localZ = 0.0..+38.0)
  // ==========================================
  const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(29.8, 0.08, 38.0), showroomFloorMat);
  floorSlab.position.set(0, 0.04, 19.0);
  group.add(floorSlab);

  // West, East & North Rear Walls
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(30.0, 9.2, 0.55), interiorWallMat);
  backWall.position.set(0, 4.6, 38.0);
  group.add(backWall);

  [-14.85, 14.85].forEach((wx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 9.2, 38.4), graphitePanelMat);
    sideWall.position.set(wx, 4.6, 19.0);
    group.add(sideWall);
  });

  // Acoustic Ceiling & Soft Linear Daylight Strips across full 38m depth
  const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(29.6, 0.25, 38.0), darkSlateMat);
  ceilingSlab.position.set(0, 6.45, 19.0);
  group.add(ceilingSlab);

  [-8.5, 0, 8.5].forEach((lx) => {
    [5.5, 11.5, 17.5, 23.5, 29.5, 34.5].forEach((lz) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 1.4), coolCeilingStripMat);
      strip.position.set(lx, 6.28, lz);
      group.add(strip);
    });
  });

  // Side Wall Linear LED Accent Coves illuminating the interior walls & display cars
  [-14.55, 14.55].forEach((wx) => {
    const wallCove = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 34.0), indoorCyanLedMat);
    wallCove.position.set(wx, 5.75, 19.0);
    group.add(wallCove);
  });

  // Front Curtain Glass Facade (localZ = 0.0 -> worldZ = 52.0), leaving center sliding door bay X = -2.2..+2.2
  [-14.8, -10.5, -6.2, -2.25, 2.25, 6.2, 10.5, 14.8].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.8, 0.28), darkSlateMat);
    mullion.position.set(mx, 2.9, 0.0);
    group.add(mullion);
  });

  [-8.5, 8.5].forEach((gx) => {
    const glassWall = new THREE.Mesh(new THREE.BoxGeometry(12.4, 5.4, 0.08), glassMat);
    glassWall.position.set(gx, 2.75, 0.0);
    group.add(glassWall);
  });

  const transomGlass = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.95, 0.08), glassMat);
  transomGlass.position.set(0, 4.45, 0.0);
  group.add(transomGlass);

  const doorHeaderBeam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 0.28), darkSlateMat);
  doorHeaderBeam.position.set(0, 3.38, 0.0);
  group.add(doorHeaderBeam);

  // Automatic Sliding Glass Double Doors (userData.noMerge = true!)
  const buildShowroomDoorLeaf = (isLeft: boolean) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;

    const pane = new THREE.Mesh(new THREE.BoxGeometry(2.12, 3.20, 0.06), glassMat);
    pane.position.y = 1.65;
    leaf.add(pane);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.10, 0.09), darkSlateMat);
    topBar.position.y = 3.24;
    leaf.add(topBar);

    const botBar = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.14, 0.09), darkSlateMat);
    botBar.position.y = 0.09;
    leaf.add(botBar);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), brushedSilverMat);
    handle.position.set(isLeft ? 0.88 : -0.88, 1.35, -0.07);
    leaf.add(handle);

    return leaf;
  };

  const doorLeft = buildShowroomDoorLeaf(true);
  doorLeft.position.set(-1.08, 0, -0.04);
  group.add(doorLeft);

  const doorRight = buildShowroomDoorLeaf(false);
  doorRight.position.set(1.08, 0, -0.04);
  group.add(doorRight);

  const shutterTex = createRollingShutterTexture({
    title: 'VINFAST SHOWROOM',
    hoursLabel: 'GIỜ MỞ CỬA  •  07:00 - 22:00',
    accentHex: '#1464f4',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.52,
    metalness: 0.45,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    group,
    {
      id: 'vinfast_main',
      axis: 'x',
      pos: 0.14,
      spanCenter: 0,
      width: 4.55,
      baseY: 0.08,
      topY: 3.30,
    },
    shutterMat,
    darkSlateMat
  );

  // Elevated Architectural Upper Facade + Brushed-Chrome 3D Framed Illuminated VINFAST Fascia Sign (cleanly above canopies!)
  const upperFacade = new THREE.Mesh(new THREE.BoxGeometry(30.0, 3.6, 0.48), graphitePanelMat);
  upperFacade.position.set(0, 7.6, 0.0);
  group.add(upperFacade);

  const blueRibbon = new THREE.Mesh(new THREE.BoxGeometry(30.15, 0.16, 0.54), vinfastBlueMat);
  blueRibbon.position.set(0, 5.82, 0.0);
  group.add(blueRibbon);

  const topCrownTrim = new THREE.Mesh(new THREE.BoxGeometry(30.2, 0.18, 0.58), brushedSilverMat);
  topCrownTrim.position.set(0, 9.42, 0.0);
  group.add(topCrownTrim);

  // 3D Brushed-Chrome Outer Sign Frame Box + Glowing Side Pillars
  const fasciaOuterFrame = new THREE.Mesh(new THREE.BoxGeometry(23.8, 2.72, 0.24), brushedSilverMat);
  fasciaOuterFrame.position.set(0, 7.68, -0.20);
  group.add(fasciaOuterFrame);

  [-11.8, 11.8].forEach((fx) => {
    const sideAccent = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.74, 0.28), exteriorCyanLedMat);
    sideAccent.position.set(fx, 7.68, -0.22);
    group.add(sideAccent);
  });

  // Sculpted 3D Brushed-Silver 'V' Crown Medallion centered above the main sign
  [-1, 1].forEach((side) => {
    const vWingOuter = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.18), brushedSilverMat);
    vWingOuter.position.set(side * 0.34, 9.18, -0.30);
    vWingOuter.rotation.z = side * 0.42;
    group.add(vWingOuter);
  });

  const fasciaTex = createVinFastFasciaSignTexture();
  const fasciaMat = new THREE.MeshStandardMaterial({
    map: fasciaTex,
    emissive: 0xffffff,
    emissiveMap: fasciaTex,
    emissiveIntensity: 0.90,
    roughness: 0.35,
    metalness: 0.10,
  });
  neonMats.push(fasciaMat);
  const fasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(23.1, 2.38), fasciaMat);
  fasciaSign.rotation.y = Math.PI;
  fasciaSign.position.set(0, 7.68, -0.33);
  fasciaSign.userData.noMerge = true;
  group.add(fasciaSign);

  // Rear Deep Interior Feature Brand Wall (facing -Z at localZ = 37.65!)
  const rearBrandFrame = new THREE.Mesh(new THREE.BoxGeometry(20.6, 2.8, 0.16), brushedSilverMat);
  rearBrandFrame.position.set(0, 4.45, 37.65);
  group.add(rearBrandFrame);

  const rearBrandSign = new THREE.Mesh(new THREE.PlaneGeometry(20.0, 2.45), fasciaMat);
  rearBrandSign.rotation.y = Math.PI;
  rearBrandSign.position.set(0, 4.45, 37.54);
  rearBrandSign.userData.noMerge = true;
  group.add(rearBrandSign);

  // ==========================================
  // 3. DEEP SHOWROOM DISPLAY FLOOR: 7 VINFAST EVs + TURNTABLE + EV CHASSIS TECH DISPLAY + VIP LOUNGE
  // ==========================================
  // Zone 1: Center Hero Rotating Turntable + Flagship VinFast VF 9 Plus (localX = 0, localZ = 8.6)
  const turntableGroup = new THREE.Group();
  turntableGroup.position.set(0, 0.08, 8.6);
  turntableGroup.userData.noMerge = true;

  const plinthDisc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.55, 0.16, 32), darkSlateMat);
  plinthDisc.position.y = 0.08;
  turntableGroup.add(plinthDisc);

  const turntableGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.42, 0.05, 8, 40),
    indoorCyanLedMat
  );
  turntableGlowRing.rotation.x = Math.PI / 2;
  turntableGlowRing.position.y = 0.15;
  turntableGroup.add(turntableGlowRing);

  const heroVf9 = createVinFastEvMesh({
    variant: 'vf9',
    paintHex: 0x1d4ed8,
  });
  heroVf9.position.y = 0.16;
  heroVf9.rotation.y = Math.PI * 0.85;
  turntableGroup.add(heroVf9);
  group.add(turntableGroup);

  // Zone 1 Flanking Displays: VF 8 (Crimson Red) & VF 7 (Silver-Grey)
  const addDisplayPedestalCar = (
    x: number,
    z: number,
    radius: number,
    variant: 'vf9' | 'vf8' | 'vf7' | 'vf3',
    paintHex: number,
    rotY: number,
    withRoofContrast: boolean = false
  ) => {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.1, 0.12, 24), graphitePanelMat);
    ped.position.set(x, 0.14, z);
    group.add(ped);

    const car = createVinFastEvMesh({ variant, paintHex, withRoofContrast });
    car.position.set(x, 0.20, z);
    car.rotation.y = rotY;
    car.userData.noMerge = true;
    group.add(car);
  };

  addDisplayPedestalCar(-8.8, 8.2, 2.7, 'vf8', 0xb91c1c, Math.PI * 0.78);
  addDisplayPedestalCar(8.8, 8.2, 2.7, 'vf7', 0x94a3b8, -Math.PI * 0.78);

  // Zone 2 Mid-Deep Lineup (localZ = 18.2): VF 6 (Ocean Blue) & VF 3 (Mint Contrast Roof)
  addDisplayPedestalCar(-8.8, 18.2, 2.6, 'vf7', 0x0284c7, Math.PI * 0.75);
  addDisplayPedestalCar(8.8, 18.2, 2.35, 'vf3', 0x10b981, -Math.PI * 0.80, true);

  // Center Zone 2 EV Skateboard Battery & E-Axle Cutaway Tech Showcase (localX = 0, localZ = 20.5)
  const techPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.24, 3.0), darkSlateMat);
  techPlinth.position.set(0, 0.20, 20.5);
  group.add(techPlinth);

  const batteryPack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.8), vinfastTealMat);
  batteryPack.position.set(0, 0.42, 20.5);
  group.add(batteryPack);

  [-0.95, 0.95].forEach((ax) => {
    const eMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 14), brushedSilverMat);
    eMotor.rotation.z = Math.PI / 2;
    eMotor.position.set(0, 0.45, 20.5 + ax * 0.95);
    group.add(eMotor);
  });

  const techGlowBorder = new THREE.Mesh(new THREE.BoxGeometry(4.26, 0.05, 3.06), indoorCyanLedMat);
  techGlowBorder.position.set(0, 0.31, 20.5);
  group.add(techGlowBorder);

  // Zone 3 Deep Lineup (localZ = 28.0): VF 5 Plus (Sunset Orange) & VF e34 (Pearl White)
  addDisplayPedestalCar(-8.2, 28.0, 2.45, 'vf3', 0xea580c, Math.PI * 0.85, true);
  addDisplayPedestalCar(8.2, 28.0, 2.6, 'vf8', 0xe2e8f0, -Math.PI * 0.85);

  // Spec Boards beside Display Vehicles (facing -Z toward visitor approach)
  const specConfigs = [
    { x: -12.6, z: 8.2, name: 'VF 8 PLUS', tag: 'SUV ĐIỆN HẠNG D • AWD', range: '471 KM', power: '402 HP', acc: '#dc2626' },
    { x: 12.6, z: 8.2, name: 'VF 7 PLUS', tag: 'CROSSOVER THỂ THAO • COUPÉ SUV', range: '431 KM', power: '349 HP', acc: '#38bdf8' },
    { x: -12.6, z: 18.2, name: 'VF 6 PLUS', tag: 'SUV ĐÔ THỊ THÔNG MINH • HẠNG B', range: '399 KM', power: '201 HP', acc: '#0284c7' },
    { x: 12.6, z: 18.2, name: 'VF 3', tag: 'MINI E-SUV QUỐC DÂN', range: '215 KM', power: '43 HP', acc: '#10b981' },
    { x: -12.0, z: 28.0, name: 'VF 5 PLUS', tag: 'A-SUV NĂNG ĐỘNG • TRẺ TRUNG', range: '326 KM', power: '134 HP', acc: '#f97316' },
    { x: 12.0, z: 28.0, name: 'VF e34', tag: 'SUV C-SEGMENT • TIÊN PHONG', range: '318 KM', power: '147 HP', acc: '#94a3b8' },
  ];
  const specBoardMats: THREE.MeshStandardMaterial[] = [];
  specConfigs.forEach((sc) => {
    const standPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.45, 0.14), darkSlateMat);
    standPost.position.set(sc.x, 0.80, sc.z);
    group.add(standPost);

    const tex = createVinFastSpecBoardTexture(sc.name, sc.tag, sc.range, sc.power, sc.acc);
    const boardMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.72,
      roughness: 0.42,
    });
    specBoardMats.push(boardMat);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 1.08),
      boardMat
    );
    board.rotation.y = Math.PI;
    board.position.set(sc.x, 1.48, sc.z - 0.09);
    board.userData.noMerge = true;
    group.add(board);
  });

  // Deep Reception & Consultation Counter (localX = +8.6, localZ = +34.5)
  const recDesk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.08, 1.05), darkSlateMat);
  recDesk.position.set(8.6, 0.62, 34.5);
  group.add(recDesk);

  const recTop = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.08, 1.18), brushedSilverMat);
  recTop.position.set(8.6, 1.18, 34.5);
  group.add(recTop);

  const recLedStrip = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 0.06), indoorCyanLedMat);
  recLedStrip.position.set(8.6, 0.72, 33.95);
  group.add(recLedStrip);

  // Deep VIP Customer Lounge & Espresso Bar (localX = -8.6 & 0.0, localZ = +33.0..35.8)
  const espressoBar = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.05, 0.95), darkSlateMat);
  espressoBar.position.set(-8.6, 0.60, 34.5);
  group.add(espressoBar);

  const espressoTop = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 1.10), brushedSilverMat);
  espressoTop.position.set(-8.6, 1.15, 34.5);
  group.add(espressoTop);

  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 });
  const loungeSofa = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.48, 0.95), sofaMat);
  loungeSofa.position.set(0, 0.32, 35.2);
  group.add(loungeSofa);

  const loungeBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.75, 0.22), sofaMat);
  loungeBack.position.set(0, 0.75, 35.6);
  group.add(loungeBack);

  const loungeTable = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.42, 0.90), graphitePanelMat);
  loungeTable.position.set(0, 0.29, 33.6);
  group.add(loungeTable);

  // Indoor Architectural Planters with Lush Ficus Trees flanking the Deep Hall
  const potMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3825, roughness: 0.9 });
  [
    [-13.5, 13.2],
    [13.5, 13.2],
    [-13.5, 23.2],
    [13.5, 23.2],
    [-4.2, 35.6],
    [4.2, 35.6],
  ].forEach(([px, pz]) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.36, 0.65, 12), potMat);
    pot.position.set(px, 0.40, pz);
    group.add(pot);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.4, 8), trunkMat);
    trunk.position.set(px, 1.25, pz);
    group.add(trunk);
    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), leafMat);
    foliage.position.set(px, 2.05, pz);
    group.add(foliage);
  });

  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    npcController?: VinFastShowroomNpcController | null
  ) => {
    const isOpen = isVinFastShowroomOpenAtHour(rawHour);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (rawHour < 7.0 || rawHour >= 22.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, Math.max(0, mainShutter.progress - delta * 1.1));
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
    } else {
      closingElapsed += delta;
      const canClose = closingElapsed >= 18.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.8) {
        setShutterProgress(mainShutter, Math.min(1.0, mainShutter.progress + delta * 0.72));
      }
    }
    wasOpen = isOpen;

    // Indoor lights & boards power down when closed; outdoor V-GREEN forecourt stays lit 24/7!
    const litScale = 1 - mainShutter.progress;
    coolCeilingStripMat.emissiveIntensity = 1.35 * litScale;
    indoorCyanLedMat.emissiveIntensity = 1.25 * litScale;
    for (const m of specBoardMats) m.emissiveIntensity = 0.72 * litScale;
  };

  return {
    staticGroup: group,
    turntableGroup,
    doorLeft,
    doorRight,
    neonMats,
    interiorPointLights,
    forecourtBayRigs,
    updateOperatingHours,
    getClosedFactor: () => mainShutter.progress,
  };
}

interface VinFastNpcEntry {
  group: THREE.Group;
  head: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  phase: number;
  baseYaw: number;
  homePos: THREE.Vector3;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitPhaseRef?: { phase: number };
  exitDone?: boolean;
  glbHandle: GlbHumanHandle;
}

export class VinFastShowroomNpcController {
  public rootGroup: THREE.Group = new THREE.Group();
  private centerX: number;
  private npcs: VinFastNpcEntry[] = [];
  private walkerGroup: THREE.Group | null = null;
  private walkerGlbHandle: GlbHumanHandle | null = null;
  private walkerLeftLeg: THREE.Object3D | null = null;
  private walkerRightLeg: THREE.Object3D | null = null;
  private walkerLeftArm: THREE.Object3D | null = null;
  private walkerRightArm: THREE.Object3D | null = null;
  private walkerExitPath?: THREE.Vector3[];
  private walkerExitWpRef?: { idx: number };
  private walkerExitPhaseRef?: { phase: number };
  private walkerExitDone = false;
  // Walk patrol waypoints inside Showroom relative to centerX
  private waypoints: Array<{ x: number; z: number }> = [];
  private wpIdx = 1;
  private pauseTimer = 0;
  private walkCycle = 0;
  private timer = 0;
  private isOpenState: boolean | null = null;
  private closingActive = false;
  private closingTimer = 0;
  private fullyClosedAndEmpty = false;

  constructor(helpers: VinFastCharacterHelpers, centerX: number = -35.0) {
    this.centerX = centerX;
    this.waypoints = [
      { x: centerX, z: 55.6 },
      { x: centerX - 4.8, z: 62.5 },
      { x: centerX - 4.8, z: 75.5 },
      { x: centerX - 3.6, z: 83.2 },
      { x: centerX + 4.2, z: 83.2 },
      { x: centerX + 4.8, z: 70.0 },
      { x: centerX + 4.8, z: 58.2 },
    ];

    const staffSpecs: Array<{
      x: number;
      z: number;
      yaw: number;
      shirt: number;
      pants: number;
      tie: number;
      skin: string;
      expr: string;
      phone: boolean;
      phase: number;
    }> = [
      { x: centerX + 8.6, z: 87.6, yaw: Math.PI, shirt: 0x0f294a, pants: 0x0f172a, tie: 0x06b6d4, skin: '#f5cfa0', expr: 'smile', phone: false, phase: 0.2 },
      { x: centerX - 3.2, z: 57.6, yaw: 0.7, shirt: 0x0f294a, pants: 0x0f172a, tie: 0x06b6d4, skin: '#f8d9c0', expr: 'smile', phone: false, phase: 1.4 },
      { x: centerX + 6.2, z: 63.4, yaw: -0.6, shirt: 0x0f294a, pants: 0x0f172a, tie: 0x06b6d4, skin: '#e8be9e', expr: 'smile', phone: false, phase: 2.3 },
      { x: centerX - 2.6, z: 70.6, yaw: 1.1, shirt: 0x0f294a, pants: 0x0f172a, tie: 0x10b981, skin: '#f1c9a5', expr: 'smile', phone: true, phase: 0.6 },
      { x: centerX - 8.6, z: 87.6, yaw: Math.PI, shirt: 0x111827, pants: 0x090d14, tie: 0x34d399, skin: '#f8d9c0', expr: 'smile', phone: false, phase: 2.8 },
      { x: centerX - 2.2, z: 56.6, yaw: -0.5, shirt: 0x475569, pants: 0x1e293b, tie: 0x38bdf8, skin: '#f1c9a5', expr: 'smile', phone: false, phase: 0.8 },
      { x: centerX - 11.2, z: 56.4, yaw: 0.65, shirt: 0x7c2d12, pants: 0x18181b, tie: 0xf59e0b, skin: '#f8d9c0', expr: 'neutral', phone: false, phase: 3.1 },
      { x: centerX - 5.4, z: 69.5, yaw: -0.9, shirt: 0x065f46, pants: 0x18181b, tie: 0x34d399, skin: '#e8be9e', expr: 'smile', phone: false, phase: 4.0 },
      { x: centerX + 4.6, z: 79.4, yaw: 0.85, shirt: 0x4338ca, pants: 0x18181b, tie: 0x38bdf8, skin: '#f5cfa0', expr: 'smile', phone: true, phase: 1.7 },
    ];

    staffSpecs.forEach((s, idx) => {
      const p = this.buildPerson(helpers, s.shirt, s.pants, s.tie, s.skin, s.expr, s.phone);
      p.group.position.set(s.x, 0.08, s.z);
      p.group.rotation.y = s.yaw;
      this.rootGroup.add(p.group);
      const spec = idx === 0 ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(idx * 3 + 2);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: p.group,
        fallbackMeshes: [p.fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Idle',
        phaseOffset: s.phase,
      });
      this.npcs.push({
        group: p.group,
        head: p.head,
        rightArm: p.rightArm,
        leftArm: p.leftArm,
        leftLeg: p.leftLeg,
        rightLeg: p.rightLeg,
        phase: s.phase,
        baseYaw: s.yaw,
        homePos: new THREE.Vector3(s.x, 0.08, s.z),
        glbHandle,
      });
    });

    // Patrolling Showroom Visitor walking full 38m depth of showroom
    const walker = this.buildPerson(helpers, 0x3f3f46, 0x090d14, 0x38bdf8, '#f1c9a5', 'smile', false);
    walker.group.position.set(this.waypoints[0].x, 0.08, this.waypoints[0].z);
    this.rootGroup.add(walker.group);
    const walkerSpec = pickOutsideNpcModel(7);
    this.walkerGlbHandle = attachGlbHumanToNpc({
      modelSource: walkerSpec.modelSource,
      hostGroup: walker.group,
      fallbackMeshes: [walker.fallbackGroup],
      targetHeight: walkerSpec.targetHeight,
      clipProfile: walkerSpec.clipProfile,
      rotationY: walkerSpec.rotationY,
      initialState: 'Walk',
      phaseOffset: 0.4,
    });
    this.walkerGroup = walker.group;
    this.walkerLeftLeg = walker.leftLeg;
    this.walkerRightLeg = walker.rightLeg;
    this.walkerLeftArm = walker.leftArm;
    this.walkerRightArm = walker.rightArm;
  }

  private buildPerson(
    helpers: VinFastCharacterHelpers,
    shirtHex: number,
    pantsHex: number,
    tieHex: number,
    skinHex: string,
    expr: string,
    holdsPhone: boolean
  ) {
    const group = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    group.add(fallbackGroup);
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.78 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.80 });
    const tieMat = new THREE.MeshStandardMaterial({ color: tieHex, roughness: 0.55 });

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
    leftLeg.position.set(-0.1, 0.36, 0);
    fallbackGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
    rightLeg.position.set(0.1, 0.36, 0);
    fallbackGroup.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), shirtMat);
    torso.position.set(0, 1.01, 0);
    fallbackGroup.add(torso);

    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.02), tieMat);
    tie.position.set(0, 1.05, 0.125);
    fallbackGroup.add(tie);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
    leftArm.position.set(-0.29, 1.02, 0);
    fallbackGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
    rightArm.position.set(0.29, 1.02, 0);
    fallbackGroup.add(rightArm);

    const faceTex = helpers.createFaceTexture(expr, skinHex);
    const head = helpers.createHeadMesh(skinMat, faceTex, 0.32, 0.32, 0.32);
    head.position.set(0, 1.48, 0);
    fallbackGroup.add(head);

    if (holdsPhone) {
      rightArm.rotation.x = -0.95;
      const phone = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.14, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.45 })
      );
      phone.position.set(0.29, 1.22, 0.26);
      fallbackGroup.add(phone);
    }

    return { group, fallbackGroup, head, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildShowroomExitPath(pos: THREE.Vector3, idx: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const aisleX = pos.x < this.centerX ? this.centerX - 4.4 : this.centerX + 4.4;
    if (pos.z > 56.0) {
      pts.push(new THREE.Vector3(aisleX, 0.08, Math.max(55.5, pos.z - 2.0)));
      pts.push(new THREE.Vector3(aisleX, 0.08, 55.2));
    }
    pts.push(new THREE.Vector3(this.centerX, 0.08, 53.6));
    pts.push(new THREE.Vector3(this.centerX, 0.08, 51.2));
    pts.push(new THREE.Vector3(this.centerX, 0.08, 43.0));
    pts.push(new THREE.Vector3(this.centerX + (idx % 2 === 0 ? -15.0 : 15.0), 0.08, 41.2));
    return pts;
  }

  private beginClosingEvacuation() {
    this.closingActive = true;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    let idx = 0;
    for (const npc of this.npcs) {
      npc.group.visible = true;
      npc.exitPath = this.buildShowroomExitPath(npc.group.position, idx++);
      npc.exitWpRef = { idx: 0 };
      npc.exitPhaseRef = { phase: npc.phase };
      npc.exitDone = false;
      npc.glbHandle.setAnimState('Walk', 1.3);
    }
    if (this.walkerGroup) {
      this.walkerGroup.visible = true;
      this.walkerExitPath = this.buildShowroomExitPath(this.walkerGroup.position, idx++);
      this.walkerExitWpRef = { idx: 0 };
      this.walkerExitPhaseRef = { phase: this.walkCycle };
      this.walkerExitDone = false;
      this.walkerGlbHandle?.setAnimState('Walk', 1.3);
    }
  }

  private hideAllNpcsImmediate() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (const npc of this.npcs) {
      npc.group.visible = false;
      npc.exitDone = true;
    }
    if (this.walkerGroup) {
      this.walkerGroup.visible = false;
      this.walkerExitDone = true;
    }
  }

  private restoreForOpen() {
    this.closingActive = false;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    for (const npc of this.npcs) {
      npc.group.position.copy(npc.homePos);
      npc.group.rotation.y = npc.baseYaw;
      npc.leftLeg.rotation.x = 0;
      npc.rightLeg.rotation.x = 0;
      npc.leftArm.rotation.x = 0;
      npc.rightArm.rotation.x = 0;
      npc.group.visible = true;
      npc.exitDone = false;
      npc.glbHandle.setAnimState('Idle');
    }
    if (this.walkerGroup && this.walkerLeftLeg && this.walkerRightLeg) {
      this.walkerGroup.position.set(this.waypoints[0].x, 0.08, this.waypoints[0].z);
      this.wpIdx = 1;
      this.pauseTimer = 0;
      this.walkerLeftLeg.rotation.x = 0;
      this.walkerRightLeg.rotation.x = 0;
      this.walkerGroup.visible = true;
      this.walkerExitDone = false;
      this.walkerGlbHandle?.setAnimState('Walk');
    }
  }

  public hasExitingNpcNearDoor(): boolean {
    if (!this.closingActive) return false;
    const near = (p: THREE.Vector3, visible: boolean) =>
      visible && p.x >= this.centerX - 3.2 && p.x <= this.centerX + 3.2 && p.z >= 49.0 && p.z <= 55.2;
    for (const npc of this.npcs) if (near(npc.group.position, npc.group.visible)) return true;
    if (this.walkerGroup && near(this.walkerGroup.position, this.walkerGroup.visible)) return true;
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public update(delta: number, rawHour: number = 12.0) {
    const isOpen = isVinFastShowroomOpenAtHour(rawHour);

    if (this.isOpenState === null) {
      this.isOpenState = isOpen;
      if (!isOpen) {
        this.hideAllNpcsImmediate();
        return;
      }
    } else if (this.isOpenState && !isOpen) {
      this.isOpenState = false;
      if (rawHour >= 22.0 && rawHour < 22.35) {
        this.beginClosingEvacuation();
      } else {
        this.hideAllNpcsImmediate();
        return;
      }
    } else if (!this.isOpenState && isOpen) {
      this.isOpenState = true;
      this.restoreForOpen();
    } else if (!isOpen && !this.closingActive) {
      return;
    }

    if (!isOpen && this.closingActive) {
      this.closingTimer += delta;
      let anyRemaining = false;

      for (const npc of this.npcs) {
        if (npc.exitDone || !npc.group.visible) continue;
        if (!npc.exitPath || !npc.exitWpRef || !npc.exitPhaseRef) {
          npc.group.visible = false;
          npc.exitDone = true;
          continue;
        }
        const finished = advanceNpcExitPath(
          npc.group,
          npc.exitPath,
          npc.exitWpRef,
          2.25,
          delta,
          { legL: npc.leftLeg, legR: npc.rightLeg, armL: npc.leftArm, armR: npc.rightArm },
          npc.exitPhaseRef
        );
        if (finished) {
          npc.group.visible = false;
          npc.exitDone = true;
        } else {
          anyRemaining = true;
        }
      }

      if (
        this.walkerGroup &&
        !this.walkerExitDone &&
        this.walkerGroup.visible &&
        this.walkerLeftLeg &&
        this.walkerRightLeg &&
        this.walkerLeftArm &&
        this.walkerRightArm
      ) {
        if (!this.walkerExitPath || !this.walkerExitWpRef || !this.walkerExitPhaseRef) {
          this.walkerGroup.visible = false;
          this.walkerExitDone = true;
        } else {
          const finished = advanceNpcExitPath(
            this.walkerGroup,
            this.walkerExitPath,
            this.walkerExitWpRef,
            2.25,
            delta,
            {
              legL: this.walkerLeftLeg,
              legR: this.walkerRightLeg,
              armL: this.walkerLeftArm,
              armR: this.walkerRightArm,
            },
            this.walkerExitPhaseRef
          );
          if (finished) {
            this.walkerGroup.visible = false;
            this.walkerExitDone = true;
          } else {
            anyRemaining = true;
          }
        }
      }

      if (!anyRemaining || this.closingTimer >= 28.0) {
        this.hideAllNpcsImmediate();
      }
      return;
    }

    this.timer += delta;

    this.npcs.forEach((npc) => {
      const t = this.timer + npc.phase;
      npc.head.rotation.y = 0.24 * Math.sin(t * 0.85);
      npc.rightArm.rotation.x = -0.32 + 0.16 * Math.sin(t * 1.8);
      npc.leftArm.rotation.x = -0.15 + 0.10 * Math.cos(t * 1.4);
    });

    if (this.walkerGroup && this.walkerLeftLeg && this.walkerRightLeg) {
      if (this.pauseTimer > 0) {
        this.walkerGlbHandle?.setAnimState('Idle');
        this.pauseTimer -= delta;
        this.walkerLeftLeg.rotation.x = THREE.MathUtils.lerp(this.walkerLeftLeg.rotation.x, 0, delta * 8);
        this.walkerRightLeg.rotation.x = THREE.MathUtils.lerp(this.walkerRightLeg.rotation.x, 0, delta * 8);
        return;
      }

      this.walkerGlbHandle?.setAnimState('Walk');
      const target = this.waypoints[this.wpIdx];
      const dx = target.x - this.walkerGroup.position.x;
      const dz = target.z - this.walkerGroup.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.22) {
        this.wpIdx = (this.wpIdx + 1) % this.waypoints.length;
        this.pauseTimer = 2.0;
        return;
      }

      const step = Math.min(dist, 1.25 * delta);
      this.walkerGroup.position.x += (dx / dist) * step;
      this.walkerGroup.position.z += (dz / dist) * step;

      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - this.walkerGroup.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.walkerGroup.rotation.y += diff * Math.min(1, delta * 7.5);

      this.walkCycle += delta * 4.8;
      const swing = Math.sin(this.walkCycle) * 0.34;
      this.walkerLeftLeg.rotation.x = swing;
      this.walkerRightLeg.rotation.x = -swing;
    }
  }
}

type ForecourtVehicleState =
  | 'road_cruise'
  | 'approaching_bay'
  | 'reversing_into_bay'
  | 'driver_walk_to_pillar'
  | 'charging'
  | 'driver_walk_to_car'
  | 'exiting_bay'
  | 'exiting_turn';

interface ForecourtDriverRig {
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  head: THREE.Object3D;
  glbHandle: GlbHumanHandle;
}

interface ForecourtEvEntry {
  rig: VinFastEvVehicleRig;
  driver: ForecourtDriverRig;
  modelLabel: string;
  kwText: string;
  state: ForecourtVehicleState;
  bayIndex: number;
  speed: number;
  baseSpeed: number;
  turnProgress: number;
  startX: number;
  startZ: number;
  laneZ: number;
  laneCooldown: number;
  exitWaitTimer: number;
  chargeTimer: number;
  chargeTotal: number;
  pctStart: number;
  cooldownTimer: number;
  walkPhase: number;
  phaseOffset: number;
}

export class VinFastForecourtFleetController {
  public rootGroup: THREE.Group = new THREE.Group();
  private bays: VinFastForecourtBayRig[];
  private vehicles: ForecourtEvEntry[] = [];
  private trafficCoordinator: CityTrafficCoordinator | null = null;
  private getWestSignal: BoulevardSignalGetter | null = null;
  private getEastSignal: BoulevardSignalGetter | null = null;
  private timer = 0;

  constructor(
    helpers: VinFastCharacterHelpers,
    bays: VinFastForecourtBayRig[],
    trafficCoordinator?: CityTrafficCoordinator
  ) {
    this.bays = bays;
    this.trafficCoordinator = trafficCoordinator ?? null;

    const specs: Array<{
      variant: 'vf9' | 'vf8' | 'vf7' | 'vf3';
      paintHex: number;
      withRoofContrast: boolean;
      modelLabel: string;
      kwText: string;
      shirt: number;
      pants: number;
      skin: string;
      initBay: number | null;
      initX: number;
      chargeLeft: number;
      chargeTotal: number;
      pctStart: number;
    }> = [
      { variant: 'vf9', paintHex: 0x0c4a6e, withRoofContrast: false, modelLabel: 'VF 9', kwText: '180 kW', shirt: 0x334155, pants: 0x0f172a, skin: '#f5cfa0', initBay: 0, initX: bays[0]?.worldX ?? -46.4, chargeLeft: 10.5, chargeTotal: 18.0, pctStart: 48 },
      { variant: 'vf8', paintHex: 0xb91c1c, withRoofContrast: false, modelLabel: 'VF 8', kwText: '145 kW', shirt: 0x1e293b, pants: 0x18181b, skin: '#f8d9c0', initBay: 1, initX: bays[1]?.worldX ?? -41.8, chargeLeft: 14.5, chargeTotal: 18.0, pctStart: 54 },
      { variant: 'vf3', paintHex: 0xeab308, withRoofContrast: true, modelLabel: 'VF 3', kwText: '52 kW', shirt: 0x1e3a8a, pants: 0x18181b, skin: '#f8d9c0', initBay: 2, initX: bays[2]?.worldX ?? -28.2, chargeLeft: 5.0, chargeTotal: 16.0, pctStart: 68 },
      { variant: 'vf7', paintHex: 0x0284c7, withRoofContrast: false, modelLabel: 'VF 7', kwText: '130 kW', shirt: 0x065f46, pants: 0x0f172a, skin: '#e8be9e', initBay: null, initX: -8.0, chargeLeft: 0, chargeTotal: 17.0, pctStart: 32 },
      { variant: 'vf8', paintHex: 0xe2e8f0, withRoofContrast: false, modelLabel: 'VF 8', kwText: '150 kW', shirt: 0x7c2d12, pants: 0x18181b, skin: '#f1c9a5', initBay: null, initX: 52.0, chargeLeft: 0, chargeTotal: 18.0, pctStart: 28 },
    ];

    specs.forEach((sp, idx) => {
      const rig = createVinFastEvVehicle({
        variant: sp.variant,
        paintHex: sp.paintHex,
        withRoofContrast: sp.withRoofContrast,
      });
      this.rootGroup.add(rig.group);

      const driver = this.buildDriver(helpers, sp.shirt, sp.pants, sp.skin, idx);
      this.rootGroup.add(driver.group);

      const initLaneZ = idx % 2 === 0 ? 34.75 : 31.10;
      const entry: ForecourtEvEntry = {
        rig,
        driver,
        modelLabel: sp.modelLabel,
        kwText: sp.kwText,
        state: sp.initBay !== null ? 'charging' : 'road_cruise',
        bayIndex: sp.initBay ?? -1,
        speed: sp.initBay !== null ? 0 : 7.8,
        baseSpeed: 7.4 + (idx % 3) * 0.7,
        turnProgress: 0,
        startX: sp.initX,
        startZ: initLaneZ,
        laneZ: initLaneZ,
        laneCooldown: 0,
        exitWaitTimer: 0,
        chargeTimer: sp.chargeLeft,
        chargeTotal: sp.chargeTotal,
        pctStart: sp.pctStart,
        cooldownTimer: sp.initBay !== null ? 0 : 1.0,
        walkPhase: idx * 1.4,
        phaseOffset: idx * 1.9,
      };

      if (sp.initBay !== null && this.bays[sp.initBay]) {
        const bay = this.bays[sp.initBay];
        bay.occupiedByVehicleIdx = idx;
        bay.activeCableMesh.visible = true;
        bay.holsterCableMesh.visible = false;
        bay.statusCrownMat.color.setHex(0x38bdf8);
        bay.statusCrownMat.emissive.setHex(0x0ea5e9);

        rig.group.position.set(bay.worldX, 0.08, bay.carParkZ);
        rig.group.rotation.y = Math.PI;

        driver.group.visible = true;
        driver.group.position.set(bay.pillarWorldX + 0.72, 0.08, 45.2);
        driver.group.rotation.y = -0.45;
      } else {
        rig.group.position.set(sp.initX, -0.26, initLaneZ);
        rig.group.rotation.y = -Math.PI / 2;
        driver.group.visible = false;
      }

      this.vehicles.push(entry);
    });
  }

  public setTrafficCoordinator(coordinator: CityTrafficCoordinator) {
    this.trafficCoordinator = coordinator;
  }

  public setIntersectionSignalGetters(
    west?: BoulevardSignalGetter | null,
    east?: BoulevardSignalGetter | null
  ) {
    this.getWestSignal = west ?? null;
    this.getEastSignal = east ?? null;
  }

  private buildDriver(helpers: VinFastCharacterHelpers, shirtHex: number, pantsHex: number, skinHex: string, seed: number): ForecourtDriverRig {
    const group = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    group.add(fallbackGroup);
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.78 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.80 });

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
    leftLeg.position.set(-0.1, 0.36, 0);
    fallbackGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
    rightLeg.position.set(0.1, 0.36, 0);
    fallbackGroup.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), shirtMat);
    torso.position.set(0, 1.01, 0);
    fallbackGroup.add(torso);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
    leftArm.position.set(-0.29, 1.02, 0);
    fallbackGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
    rightArm.position.set(0.29, 1.02, 0);
    fallbackGroup.add(rightArm);

    const faceTex = helpers.createFaceTexture('smile', skinHex);
    const head = helpers.createHeadMesh(skinMat, faceTex, 0.32, 0.32, 0.32);
    head.position.set(0, 1.48, 0);
    fallbackGroup.add(head);

    const phone = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.45 })
    );
    phone.position.set(0.29, 1.22, 0.26);
    fallbackGroup.add(phone);

    const spec = pickStationaryCivilianModel(seed * 5 + 3);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: group,
      fallbackMeshes: [fallbackGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: 'Idle',
      phaseOffset: seed * 1.3,
    });

    return { group, leftLeg, rightLeg, leftArm, rightArm, head, glbHandle };
  }

  private getGroundY(z: number): number {
    if (z <= 35.6) return -0.26;
    if (z >= 37.4) return 0.08;
    return -0.26 + ((z - 35.6) / 1.8) * 0.34;
  }

  public isBlockedByParkedEv(x: number, z: number, radius: number = 0.35): boolean {
    if (z < 43.2 || z > 50.8 || x < -50.0 || x > -20.0) return false;
    for (const v of this.vehicles) {
      if (
        v.state === 'reversing_into_bay' ||
        v.state === 'driver_walk_to_pillar' ||
        v.state === 'charging' ||
        v.state === 'driver_walk_to_car' ||
        v.state === 'exiting_bay'
      ) {
        const px = v.rig.group.position.x;
        const pz = v.rig.group.position.z;
        if (Math.abs(x - px) < 1.15 + radius && Math.abs(z - pz) < 2.45 + radius) {
          return true;
        }
      }
    }
    return false;
  }

  public update(delta: number, lampFactor: number, busPose?: { active?: boolean; x: number; z: number } | null) {
    this.timer += delta;
    const blink = Math.floor(this.timer * 3.0) % 2 === 0;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const vehId = `vf_forecourt_${i}`;
      const bay = v.bayIndex >= 0 ? this.bays[v.bayIndex] : null;
      let isBraking = false;
      let isHazardOn = false;
      let wheelDir = 1;

      if (v.laneCooldown > 0) v.laneCooldown -= delta;

      if (v.state === 'road_cruise') {
        if (v.cooldownTimer > 0) v.cooldownTimer -= delta;

        // If waiting offscreen West to safely wrap back to far East avenue end (X = 304)
        if (!v.rig.group.visible) {
          let respawnZ: number | null = null;
          if (!this.trafficCoordinator) {
            respawnZ = v.laneZ;
          } else {
            const prefZ = v.laneZ;
            const altZ = Math.abs(prefZ - 34.75) < 0.5 ? 31.10 : 34.75;
            if (this.trafficCoordinator.isZoneClear({ id: vehId, x: 304.0, y: -0.26, z: prefZ, halfX: 5.5, halfZ: 1.5 })) {
              respawnZ = prefZ;
            } else if (this.trafficCoordinator.isZoneClear({ id: vehId, x: 304.0, y: -0.26, z: altZ, halfX: 5.5, halfZ: 1.5 })) {
              respawnZ = altZ;
            }
          }
          if (respawnZ !== null) {
            v.laneZ = respawnZ;
            v.rig.group.position.set(304.0, -0.26, respawnZ);
            v.rig.group.rotation.y = -Math.PI / 2;
            v.rig.group.visible = true;
            v.speed = v.baseSpeed;
          } else {
            this.trafficCoordinator?.deactivateVehicle(vehId);
            continue;
          }
        }

        // Check if a free forecourt bay sits right ahead on our left side (enter cleanly from outer lane)
        let chosenBayIdx = -1;
        const hasFreeBay = this.bays.some((b) => b.occupiedByVehicleIdx === null);
        if (v.cooldownTimer <= 0 && hasFreeBay && v.rig.group.position.z >= 33.4) {
          const apronBusyNearby = (bx: number) =>
            this.vehicles.some(
              (o, oi) =>
                oi !== i &&
                (o.state === 'approaching_bay' ||
                  o.state === 'reversing_into_bay' ||
                  o.state === 'exiting_bay' ||
                  o.state === 'exiting_turn') &&
                Math.abs(o.rig.group.position.x - bx) < 6.5
            );
          for (let bi = this.bays.length - 1; bi >= 0; bi--) {
            const candidate = this.bays[bi];
            if (
              candidate.occupiedByVehicleIdx === null &&
              v.rig.group.position.x <= candidate.worldX + 7.5 &&
              v.rig.group.position.x >= candidate.worldX + 4.8 &&
              !apronBusyNearby(candidate.worldX) &&
              (!this.trafficCoordinator ||
                (this.trafficCoordinator.isZoneClear({
                  id: vehId,
                  x: candidate.worldX + 2.2,
                  y: -0.26,
                  z: 36.2,
                  halfX: 2.6,
                  halfZ: 1.2,
                }) &&
                  this.trafficCoordinator.isZoneClear({
                    id: vehId,
                    x: candidate.worldX,
                    y: 0.08,
                    z: 38.8,
                    halfX: 1.45,
                    halfZ: 1.75,
                  })))
            ) {
              chosenBayIdx = bi;
              break;
            }
          }
        }

        if (chosenBayIdx >= 0) {
          this.bays[chosenBayIdx].occupiedByVehicleIdx = i;
          v.bayIndex = chosenBayIdx;
          v.startX = v.rig.group.position.x;
          v.startZ = v.rig.group.position.z;
          v.turnProgress = 0;
          v.state = 'approaching_bay';
        } else {
          let speedFactor = 1;
          const approachingShowroom =
            v.cooldownTimer <= 0 &&
            hasFreeBay &&
            v.rig.group.position.x > -24.0 &&
            v.rig.group.position.x < 12.0;

          if (this.trafficCoordinator) {
            const pick = this.trafficCoordinator.pickBestCruiseLane({
              id: vehId,
              x: v.rig.group.position.x,
              y: -0.26,
              currentZ: v.rig.group.position.z,
              laneZ: v.laneZ,
              moveDirX: -1,
              lanes: [31.10, 34.75],
              halfW: v.rig.halfW,
              halfL: v.rig.halfL,
              lookahead: 11.5,
              minGap: 2.0,
              priority: 20,
              allowSwitch:
                v.laneCooldown <= 0 &&
                ((v.rig.group.position.x > -205.0 && v.rig.group.position.x < 170.0) ||
                  v.rig.group.position.x > 214.0),
              preferLane: approachingShowroom ? 34.75 : undefined,
            });
            if (pick.switched) {
              v.laneZ = pick.targetZ;
              v.laneCooldown = 1.8;
            }
            speedFactor = pick.clearance.maxSpeedFactor;
          } else {
            const busOnWestbound = Boolean(busPose && busPose.active !== false && busPose.z > 29.0 && busPose.z < 36.2);
            const distToBus = busOnWestbound ? v.rig.group.position.x - busPose!.x : 999;
            if (busOnWestbound && distToBus > 0 && distToBus < 14.5) speedFactor = 0;
            for (let j = 0; j < this.vehicles.length && speedFactor > 0; j++) {
              if (j === i) continue;
              const other = this.vehicles[j];
              if (
                (other.state === 'road_cruise' || other.state === 'exiting_turn') &&
                Math.abs(other.rig.group.position.z - v.rig.group.position.z) < 2.2 &&
                other.rig.group.position.x < v.rig.group.position.x &&
                v.rig.group.position.x - other.rig.group.position.x < 9.0
              ) {
                speedFactor = 0;
                break;
              }
            }
          }

          const sigFactor = computeBoulevardSignalFactor({
            x: v.rig.group.position.x,
            halfL: v.rig.halfL,
            moveDirX: -1,
            getWestSignal: this.getWestSignal,
            getEastSignal: this.getEastSignal,
            coordinator: this.trafficCoordinator,
            vehicleId: vehId,
          });
          speedFactor = Math.min(speedFactor, sigFactor);

          if (speedFactor < 0.75) isBraking = true;
          v.speed = THREE.MathUtils.lerp(v.speed, v.baseSpeed * speedFactor, Math.min(1, delta * (speedFactor === 0 ? 6.5 : 3.2)));
          v.rig.group.position.x -= v.speed * delta;
          const prevZPos = v.rig.group.position.z;
          v.rig.group.position.z = THREE.MathUtils.lerp(prevZPos, v.laneZ, Math.min(1, delta * (v.speed > 0.8 ? 3.2 : 0.4)));
          v.rig.group.position.y = -0.26;
          const latVel = (v.rig.group.position.z - prevZPos) / Math.max(0.001, delta);
          v.rig.group.rotation.y = Math.atan2(-Math.max(1.5, v.speed), latVel);

          if (v.rig.group.position.x < -312.0) {
            let wrapZ: number | null = null;
            if (!this.trafficCoordinator) {
              wrapZ = v.laneZ;
            } else {
              const altZ = Math.abs(v.laneZ - 34.75) < 0.5 ? 31.10 : 34.75;
              if (this.trafficCoordinator.isZoneClear({ id: vehId, x: 304.0, y: -0.26, z: v.laneZ, halfX: 5.5, halfZ: 1.5 })) {
                wrapZ = v.laneZ;
              } else if (this.trafficCoordinator.isZoneClear({ id: vehId, x: 304.0, y: -0.26, z: altZ, halfX: 5.5, halfZ: 1.5 })) {
                wrapZ = altZ;
              }
            }
            if (wrapZ !== null) {
              v.laneZ = wrapZ;
              v.rig.group.position.x = 304.0;
              v.rig.group.position.z = wrapZ;
            } else {
              v.rig.group.visible = false;
              this.trafficCoordinator?.deactivateVehicle(vehId);
              continue;
            }
          }
        }
      } else if (v.state === 'approaching_bay' && bay) {
        // Curve gently from road onto apron aligned in front of target bay facing -Z
        const yaw = v.rig.group.rotation.y;
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: vehId,
          x: v.rig.group.position.x,
          y: v.rig.group.position.y,
          z: v.rig.group.position.z,
          moveDirX: Math.sin(yaw),
          moveDirZ: Math.cos(yaw),
          halfW: v.rig.halfW,
          halfL: v.rig.halfL,
          lookahead: 4.5,
          minGap: 0.85,
          latMargin: 0.16,
          priority: 48,
        });
        // Never freeze mid-street during committed turn into charging bay apron
        const factor = clr ? Math.max(0.45, clr.maxSpeedFactor) : 1;
        v.speed = 4.2 * factor;
        isBraking = v.turnProgress > 0.72 || factor < 0.7;
        v.turnProgress = Math.min(1, v.turnProgress + delta * 0.72 * factor);
        const s = v.turnProgress * v.turnProgress * (3 - 2 * v.turnProgress);
        v.rig.group.position.x = THREE.MathUtils.lerp(v.startX, bay.worldX, s);
        v.rig.group.position.z = THREE.MathUtils.lerp(v.startZ, 38.4, s);
        v.rig.group.position.y = this.getGroundY(v.rig.group.position.z);
        v.rig.group.rotation.y = THREE.MathUtils.lerp(-Math.PI / 2, -Math.PI, s);

        if (v.turnProgress >= 1) {
          v.rig.group.position.set(bay.worldX, 0.08, 38.4);
          v.rig.group.rotation.y = -Math.PI;
          v.state = 'reversing_into_bay';
        }
      } else if (v.state === 'reversing_into_bay' && bay) {
        isBraking = true;
        isHazardOn = true;
        wheelDir = -1;
        v.speed = 3.1;
        v.rig.group.position.x = bay.worldX;
        v.rig.group.position.z = Math.min(bay.carParkZ, v.rig.group.position.z + v.speed * delta);
        v.rig.group.position.y = 0.08;
        v.rig.group.rotation.y = Math.PI;

        if (v.rig.group.position.z >= bay.carParkZ - 0.04) {
          v.rig.group.position.set(bay.worldX, 0.08, bay.carParkZ);
          v.speed = 0;
          v.driver.group.visible = true;
          v.driver.group.position.set(bay.worldX - 1.15, 0.08, bay.carParkZ - 0.35);
          v.state = 'driver_walk_to_pillar';
        }
      } else if (v.state === 'driver_walk_to_pillar' && bay) {
        v.speed = 0;
        v.driver.glbHandle.setAnimState('Walk', 1.25);
        const targetX = bay.pillarWorldX + 0.72;
        const targetZ = 45.2;
        const dx = targetX - v.driver.group.position.x;
        const dz = targetZ - v.driver.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.1) {
          v.driver.group.position.set(targetX, 0.08, targetZ);
          v.driver.group.rotation.y = -0.45;
          v.driver.leftLeg.rotation.x = 0;
          v.driver.rightLeg.rotation.x = 0;
          v.driver.glbHandle.setAnimState('Idle');
          bay.activeCableMesh.visible = true;
          bay.holsterCableMesh.visible = false;
          bay.statusCrownMat.color.setHex(0x38bdf8);
          bay.statusCrownMat.emissive.setHex(0x0ea5e9);
          v.chargeTimer = v.chargeTotal;
          v.state = 'charging';
        } else {
          const step = Math.min(dist, 1.85 * delta);
          v.driver.group.position.x += (dx / dist) * step;
          v.driver.group.position.z += (dz / dist) * step;
          v.driver.group.rotation.y = Math.atan2(dx, dz);
          v.walkPhase += delta * 7.5;
          const swing = Math.sin(v.walkPhase) * 0.52;
          v.driver.leftLeg.rotation.x = swing;
          v.driver.rightLeg.rotation.x = -swing;
          v.driver.leftArm.rotation.x = -swing * 0.55;
          v.driver.rightArm.rotation.x = v.driver.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.55;
        }
      } else if (v.state === 'charging' && bay) {
        v.speed = 0;
        v.driver.glbHandle.setAnimState('Idle');
        const t = this.timer + v.phaseOffset;
        v.driver.head.rotation.y = 0.22 * Math.sin(t * 0.9);
        v.driver.rightArm.rotation.x = -0.92 + 0.08 * Math.sin(t * 2.0);
        v.driver.leftArm.rotation.x = -0.15;
        bay.statusCrownMat.emissiveIntensity = 0.65 + 0.45 * Math.sin(t * 3.2);

        const ratio = THREE.MathUtils.clamp(1 - v.chargeTimer / v.chargeTotal, 0, 1);
        const pct = Math.min(100, Math.round(v.pctStart + (100 - v.pctStart) * ratio));
        bay.updateScreen('ĐANG SẠC', `${pct}%`, `${v.kwText} • ${v.modelLabel}`, true);

        v.chargeTimer -= delta;
        if (v.chargeTimer <= 0) {
          bay.activeCableMesh.visible = false;
          bay.holsterCableMesh.visible = true;
          bay.statusCrownMat.color.setHex(0x34d399);
          bay.statusCrownMat.emissive.setHex(0x10b981);
          bay.statusCrownMat.emissiveIntensity = 0.75;
          bay.updateScreen('SẴN SÀNG', 'READY', '250 kW CCS2', false);
          v.state = 'driver_walk_to_car';
        }
      } else if (v.state === 'driver_walk_to_car' && bay) {
        v.speed = 0;
        v.driver.glbHandle.setAnimState('Walk', 1.25);
        const targetX = bay.worldX - 1.15;
        const targetZ = bay.carParkZ - 0.35;
        const dx = targetX - v.driver.group.position.x;
        const dz = targetZ - v.driver.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.1) {
          v.driver.group.visible = false;
          v.exitWaitTimer = 0;
          v.state = 'exiting_bay';
        } else {
          const step = Math.min(dist, 1.85 * delta);
          v.driver.group.position.x += (dx / dist) * step;
          v.driver.group.position.z += (dz / dist) * step;
          v.driver.group.rotation.y = Math.atan2(dx, dz);
          v.walkPhase += delta * 7.5;
          const swing = Math.sin(v.walkPhase) * 0.52;
          v.driver.leftLeg.rotation.x = swing;
          v.driver.rightLeg.rotation.x = -swing;
          v.driver.leftArm.rotation.x = -swing * 0.55;
          v.driver.rightArm.rotation.x = v.driver.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.55;
        }
      } else if (v.state === 'exiting_bay' && bay) {
        // Yield strictly BEHIND the sidewalk curb (Z = 39.7..41.2) for upstream Westbound traffic before merging onto Z = 34.75
        let yieldRoad = false;
        if (v.rig.group.position.z >= 39.7 && v.rig.group.position.z <= 41.2) {
          if (this.trafficCoordinator) {
            const mouthClear = this.trafficCoordinator.isZoneClear({
              id: vehId,
              x: bay.worldX,
              y: -0.26,
              z: 35.1,
              halfX: 3.4,
              halfZ: 1.45,
            });
            const upstreamClear = this.trafficCoordinator.isZoneClear({
              id: vehId,
              x: bay.worldX + 2.8,
              y: -0.26,
              z: 35.1,
              halfX: 5.5,
              halfZ: 1.45,
            });
            if (!mouthClear || (!upstreamClear && v.exitWaitTimer < 7.0)) {
              yieldRoad = true;
              v.exitWaitTimer += delta;
            } else {
              v.exitWaitTimer = 0;
            }
          } else {
            if (
              busPose &&
              busPose.active !== false &&
              busPose.z > 29.0 &&
              busPose.z < 36.2 &&
              busPose.x > bay.worldX - 4.0 &&
              busPose.x < bay.worldX + 12.0
            ) {
              yieldRoad = true;
            }
            for (let j = 0; j < this.vehicles.length && !yieldRoad; j++) {
              if (j === i) continue;
              const other = this.vehicles[j];
              if (
                other.state === 'road_cruise' &&
                other.rig.group.position.x > bay.worldX - 5.5 &&
                other.rig.group.position.x < bay.worldX + 10.5
              ) {
                yieldRoad = true;
              }
            }
          }
        }
        isBraking = yieldRoad;
        v.speed = THREE.MathUtils.lerp(v.speed, yieldRoad ? 0 : 4.6, Math.min(1, delta * 5.5));
        v.rig.group.position.z = Math.max(37.4, v.rig.group.position.z - v.speed * delta);
        v.rig.group.position.y = this.getGroundY(v.rig.group.position.z);
        v.rig.group.rotation.y = Math.PI;

        if (v.rig.group.position.z <= 37.45) {
          v.turnProgress = 0;
          v.state = 'exiting_turn';
        }
      } else if (v.state === 'exiting_turn' && bay) {
        const yaw = v.rig.group.rotation.y;
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: vehId,
          x: v.rig.group.position.x,
          y: v.rig.group.position.y,
          z: v.rig.group.position.z,
          moveDirX: Math.sin(yaw),
          moveDirZ: Math.cos(yaw),
          halfW: v.rig.halfW,
          halfL: v.rig.halfL,
          lookahead: 5.5,
          minGap: 0.9,
          latMargin: 0.16,
          priority: 48,
        });
        const factor = clr ? Math.max(0.45, clr.maxSpeedFactor) : 1;
        if (factor < 0.7) isBraking = true;
        v.speed = 5.6 * factor;
        v.turnProgress = Math.min(1, v.turnProgress + delta * 0.96 * factor);
        const s = v.turnProgress * v.turnProgress * (3 - 2 * v.turnProgress);
        v.rig.group.position.x = THREE.MathUtils.lerp(bay.worldX, bay.worldX - 5.5, s);
        v.rig.group.position.z = THREE.MathUtils.lerp(37.4, 34.75, s);
        v.rig.group.position.y = this.getGroundY(v.rig.group.position.z);
        v.rig.group.rotation.y = THREE.MathUtils.lerp(-Math.PI, -Math.PI / 2, s);

        if (v.turnProgress >= 1) {
          v.laneZ = 34.75;
          v.laneCooldown = 1.2;
          v.rig.group.position.set(bay.worldX - 5.5, -0.26, 34.75);
          v.rig.group.rotation.y = -Math.PI / 2;
          bay.occupiedByVehicleIdx = null;
          v.bayIndex = -1;
          v.cooldownTimer = 16.0;
          v.state = 'road_cruise';
        }
      }

      if (this.trafficCoordinator) {
        const yaw = v.rig.group.rotation.y;
        const isParkedOrCharging =
          v.state === 'charging' ||
          v.state === 'driver_walk_to_pillar' ||
          v.state === 'driver_walk_to_car';
        const isCommittedTurn =
          v.state === 'approaching_bay' ||
          v.state === 'exiting_turn' ||
          (v.state === 'exiting_bay' && v.rig.group.position.z < 39.7);
        this.trafficCoordinator.updateVehicle({
          id: vehId,
          kind: 'car',
          x: v.rig.group.position.x,
          y: v.rig.group.position.y,
          z: v.rig.group.position.z,
          fwdX: Math.sin(yaw),
          fwdZ: Math.cos(yaw),
          halfW: v.rig.halfW,
          halfL: v.rig.halfL,
          speed: v.speed,
          isStoppedOrParked: isParkedOrCharging,
          priority: isCommittedTurn ? 48 : v.state === 'road_cruise' ? 20 : 14,
          active: v.rig.group.visible,
        });
      }

      if (v.speed > 0.02) {
        const angularStep = (v.speed * delta) / v.rig.wheelR;
        for (const w of v.rig.wheels) {
          w.rotation.x += angularStep * wheelDir;
        }
      }

      const isActiveDrive =
        v.state === 'road_cruise' ||
        v.state === 'approaching_bay' ||
        v.state === 'reversing_into_bay' ||
        v.state === 'exiting_bay' ||
        v.state === 'exiting_turn';
      v.rig.headlightMat.emissiveIntensity = isActiveDrive ? 1.15 + lampFactor * 1.1 : 0.25;
      v.rig.brakeMat.emissiveIntensity = !isActiveDrive ? 0.2 : isBraking ? 2.0 : 0.45 + lampFactor * 0.35;
      v.rig.hazardMat.emissiveIntensity = isHazardOn ? (blink ? 2.2 : 0.1) : 0.05;
    }
  }
}

