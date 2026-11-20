import * as THREE from 'three';
import {
  CITY_ROAD_BOUNDS,
  computeBoulevardSignalFactor,
  computeNorthSouthSignalFactor,
  DIOR_INTERSECTION_CENTER_X,
  EAST_INTERSECTION_CENTER_X,
  FAR_EAST_INTERSECTION_CENTER_X,
  WEST_INTERSECTION_CENTER_X,
  type BoulevardSignalGetter,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import { isPedestrianStreetTime } from './EastIntersectionSystem';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { GUARD_NPC_MODEL, pickStationaryCivilianModel } from './NpcModelCatalog';

export interface PoliceStationCharacterHelpers {
  createFaceTexture: (expression: 'happy' | 'neutral' | 'surprised', skinColor?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    w?: number,
    h?: number,
    d?: number
  ) => THREE.Mesh;
}

export interface PoliceStationLightEntry {
  light: THREE.PointLight;
  dayIntensity: number;
  nightIntensity: number;
}

export interface PoliceStationBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: PoliceStationLightEntry[];
  getBarrierOpenAmount: () => number;
  updateStation: (
    rawHour: number,
    delta: number,
    isPlayerNearBarrier: boolean,
    isPlayerNearFrontDoor: boolean,
    npcController?: PoliceStationNpcController | null,
    hasFleetNearGate?: boolean
  ) => void;
}

// ==========================================
// CANVAS TEXTURE HELPERS
// ==========================================

function createPoliceMainSignTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 320;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 2048, 0);
  grad.addColorStop(0, '#07142b');
  grad.addColorStop(0.5, '#112a54');
  grad.addColorStop(1, '#07142b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 320);

  // Subtle diagonal tactical stripes on edges
  ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
  for (let i = -320; i < 420; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, 320);
    ctx.lineTo(i + 22, 320);
    ctx.lineTo(i + 150, 0);
    ctx.lineTo(i + 128, 0);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 1600; i < 2360; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, 320);
    ctx.lineTo(i + 22, 320);
    ctx.lineTo(i + 150, 0);
    ctx.lineTo(i + 128, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Gold & cyan border
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 2024, 296);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 2000, 272);

  // Left & Right Police Star Shield Badges
  const drawShield = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, -82);
    ctx.lineTo(68, -56);
    ctx.lineTo(58, 32);
    ctx.quadraticCurveTo(38, 78, 0, 96);
    ctx.quadraticCurveTo(-38, 78, -58, 32);
    ctx.lineTo(-68, -56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5-point gold star
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 34 : 14;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  drawShield(155, 160);
  drawShield(1893, 160);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 94px system-ui, -apple-system, sans-serif';
  ctx.fillText('ĐỒN CẢNH SÁT', 1024, 110);

  ctx.fillStyle = '#fde047';
  ctx.font = '800 38px system-ui, -apple-system, sans-serif';
  ctx.fillText('TRỰC BAN 24/7  •  CHỈ HUY AN NINH TRẬT TỰ  •  ĐỘI XE TUẦN TRA CSGT', 1024, 214);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPorticoSignTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#091a38';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 1012, 116);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde047';
  ctx.font = '900 44px system-ui, -apple-system, sans-serif';
  ctx.fillText('★  ĐỒN CẢNH SÁT  •  TIẾP DÂN 24/7  ★', 512, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createMonumentSignTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0b1830');
  grad.addColorStop(1, '#102447');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 512);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 744, 488);

  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(26, 26, 716, 88);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde047';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText('★  CẢNH SÁT NHÂN DÂN  ★', 384, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 50px system-ui, sans-serif';
  ctx.fillText('ĐỒN CẢNH SÁT', 384, 180);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText('NGHIÊN CỨU & TUẦN TRA AN NINH', 384, 240);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('•  TRỰC BAN TIẾP DÂN 24/7', 384, 315);
  ctx.fillText('•  ĐỘI XE TUẦN TRA & BẮT GIAM', 384, 368);
  ctx.fillText('•  CẢNH SÁT GIAO THÔNG CSGT', 384, 421);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSmallHeaderTex(title: string, bgHex = '#0f2547', textHex = '#fde047'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textHex;
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.fillText(title, 256, 65);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createMonitorWallTex(mode: 'cctv' | 'radar' | 'forensics'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#061121';
  ctx.fillRect(0, 0, 1024, 512);

  // Grid overlay
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 1008, 496);

  if (mode === 'cctv') {
    const camTitles = ['CAM 01: ĐẠI LỘ TRUNG TÂM', 'CAM 02: CÔNG VIÊN XANH', 'CAM 03: SÂN BÓNG RON', 'CAM 04: CỔNG ĐỒN CS'];
    for (let i = 0; i < 4; i++) {
      const gx = (i % 2) * 496 + 24;
      const gy = Math.floor(i / 2) * 238 + 24;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gx, gy, 476, 218);
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx, gy, 476, 218);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(gx + 16, gy + 70, 444, 120);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(gx + 40 + i * 30, gy + 112, 48, 26);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(gx + 450, gy + 28, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '700 22px monospace';
      ctx.fillText(camTitles[i], gx + 16, gy + 35);
    }
  } else if (mode === 'radar') {
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    [90, 160, 230].forEach((r) => {
      ctx.beginPath();
      ctx.arc(512, 270, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
    ctx.fillRect(140, 240, 744, 60);
    [
      { x: 260, y: 270, col: '#38bdf8', lbl: 'TUẦN TRA-01' },
      { x: 512, y: 270, col: '#fde047', lbl: 'TRỤ SỞ' },
      { x: 740, y: 270, col: '#4ade80', lbl: 'CSGT-04' },
    ].forEach((b) => {
      ctx.fillStyle = b.col;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '800 20px monospace';
      ctx.fillText(b.lbl, b.x - 42, b.y - 20);
    });
    ctx.fillStyle = '#fde047';
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillText('BẢN ĐỒ CHỈ HUY & ĐỊNH VỊ ĐỘI XE GPS', 160, 56);
  } else {
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.fillText('PHÒNG NGHIÊN CỨU PHÁP Y & DỮ LIỆU AN NINH', 72, 68);
    ctx.fillStyle = '#0ea5e9';
    for (let i = 0; i < 16; i++) {
      const h = 60 + ((i * 57) % 190);
      ctx.fillRect(80 + i * 54, 410 - h, 34, h);
    }
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 80; x <= 940; x += 24) {
      const y = 175 + Math.sin(x * 0.04) * 38;
      if (x === 80) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createVehicleDoorLiveryTex(
  line1: string,
  line2: string,
  bgHex: string,
  accentHex: string,
  textHex: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 192);

  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.moveTo(0, 192);
  ctx.lineTo(75, 192);
  ctx.lineTo(145, 0);
  ctx.lineTo(70, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(0, 162, 512, 30);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textHex;
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText(line1, 300, 74);

  ctx.fillStyle = accentHex;
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText(line2, 300, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBayGroundLabelTex(label: string, accentHex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 160);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(14, 14, 484, 132);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentHex;
  ctx.font = '900 52px system-ui, sans-serif';
  ctx.fillText(label, 256, 82);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createFlagTex(isNational: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d')!;

  if (isNational) {
    ctx.fillStyle = '#da251d';
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 82 : 33;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = 256 + Math.cos(a) * r;
      const py = 160 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#0f294a';
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, 484, 292);
    // Gold Star Emblem
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 46 : 19;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = 256 + Math.cos(a) * r;
      const py = 112 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.fillText('CẢNH SÁT', 256, 218);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ==========================================
// VEHICLE BUILDERS (PATROL SEDAN, SUV, PRISONER VAN, CSGT CRUISER, CSGT MOTO)
// ==========================================

interface EmergencyLightRig {
  redMats: THREE.MeshStandardMaterial[];
  blueMats: THREE.MeshStandardMaterial[];
}

interface VehicleBuildMats {
  tireMat: THREE.Material;
  rimMat: THREE.Material;
  darkTrimMat: THREE.Material;
  glassMat: THREE.Material;
  headlightMat: THREE.Material;
  taillightMat: THREE.Material;
}

function addWheelsAndArches(
  grp: THREE.Group,
  halfTrack: number,
  frontZ: number,
  rearZ: number,
  wheelRadius: number,
  wheelWidth: number,
  tireMat: THREE.Material,
  rimMat: THREE.Material,
  wheelsOut?: THREE.Object3D[]
) {
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, wheelWidth + 0.02, 12);
  rimGeo.rotateZ(Math.PI / 2);

  [
    [-halfTrack, frontZ],
    [halfTrack, frontZ],
    [-halfTrack, rearZ],
    [halfTrack, rearZ],
  ].forEach(([wx, wz]) => {
    const wheelHub = new THREE.Group();
    wheelHub.position.set(wx, wheelRadius, wz);
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    wheelHub.add(tire);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheelHub.add(rim);
    grp.add(wheelHub);
    if (wheelsOut) wheelsOut.push(wheelHub);
  });
}

function addRoofLightbar(
  grp: THREE.Group,
  y: number,
  z: number,
  width: number,
  frameMat: THREE.Material,
  lightRig: EmergencyLightRig
) {
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const blueMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  lightRig.redMats.push(redMat);
  lightRig.blueMats.push(blueMat);

  const barBase = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, 0.30), frameMat);
  barBase.position.set(0, y, z);
  grp.add(barBase);

  const halfW = width * 0.42;
  const redDome = new THREE.Mesh(new THREE.BoxGeometry(halfW, 0.11, 0.26), redMat);
  redDome.position.set(-width * 0.25, y + 0.08, z);
  redDome.userData.noMerge = true;
  grp.add(redDome);

  const blueDome = new THREE.Mesh(new THREE.BoxGeometry(halfW, 0.11, 0.26), blueMat);
  blueDome.position.set(width * 0.25, y + 0.08, z);
  blueDome.userData.noMerge = true;
  grp.add(blueDome);

  const centerCap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.16, 0.12, 0.28), frameMat);
  centerCap.position.set(0, y + 0.08, z);
  grp.add(centerCap);
}

function buildPolicePatrolCar(
  opts: {
    x: number;
    z: number;
    ry: number;
    variant: 'patrol113' | 'suv113' | 'csgt';
  },
  shared: VehicleBuildMats,
  lightRig: EmergencyLightRig,
  wheelsOut?: THREE.Object3D[]
): THREE.Group {
  const car = new THREE.Group();
  car.position.set(opts.x, 0.03, opts.z);
  car.rotation.y = opts.ry;

  const isSuv = opts.variant === 'suv113';
  const isCsgt = opts.variant === 'csgt';

  const bodyWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.25 });
  const bodyNavyMat = new THREE.MeshStandardMaterial({
    color: isCsgt ? 0x14532d : 0x0f2547,
    roughness: 0.30,
    metalness: 0.30,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: isCsgt ? 0x84cc16 : 0x38bdf8,
    roughness: 0.35,
    metalness: 0.2,
  });
  const liveryTex = createVehicleDoorLiveryTex(
    isCsgt ? 'CSGT' : 'CẢNH SÁT',
    isCsgt ? 'CẢNH SÁT GIAO THÔNG' : isSuv ? 'ĐẶC NHIỆM PHẢN ỨNG NHANH' : 'TUẦN TRA AN NINH',
    isCsgt ? '#f8fafc' : '#0f2547',
    isCsgt ? '#eab308' : '#38bdf8',
    isCsgt ? '#14532d' : '#ffffff'
  );
  const liveryMat = new THREE.MeshStandardMaterial({ map: liveryTex, roughness: 0.32 });

  const w = isSuv ? 2.08 : 1.94;
  const len = isSuv ? 4.85 : 4.65;
  const wheelR = isSuv ? 0.40 : 0.35;

  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(w, 0.56, len), bodyNavyMat);
  lowerHull.position.set(0, wheelR + 0.22, 0);
  car.add(lowerHull);

  const upperHull = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.30, len - 0.14), bodyWhiteMat);
  upperHull.position.set(0, wheelR + 0.54, 0);
  car.add(upperHull);

  const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.09, len - 0.20), accentMat);
  sideStripe.position.set(0, wheelR + 0.43, 0);
  car.add(sideStripe);

  const cabinLen = isSuv ? 2.65 : 2.15;
  const cabinH = isSuv ? 0.68 : 0.56;
  const cabinZ = isSuv ? -0.35 : -0.18;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w - 0.18, cabinH, cabinLen), bodyWhiteMat);
  cabin.position.set(0, wheelR + 0.69 + cabinH * 0.5 - 0.04, cabinZ);
  car.add(cabin);

  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.26, cabinH - 0.10, 0.08), shared.glassMat);
  frontGlass.position.set(0, cabin.position.y, cabinZ + cabinLen * 0.5 - 0.01);
  frontGlass.rotation.x = -0.22;
  car.add(frontGlass);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.26, cabinH - 0.10, 0.08), shared.glassMat);
  rearGlass.position.set(0, cabin.position.y, cabinZ - cabinLen * 0.5 + 0.01);
  rearGlass.rotation.x = isSuv ? 0.12 : 0.28;
  car.add(rearGlass);

  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(w - 0.15, cabinH - 0.12, cabinLen - 0.26), shared.glassMat);
  sideWin.position.set(0, cabin.position.y, cabinZ);
  car.add(sideWin);

  [-1, 1].forEach((side) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.52), liveryMat);
    panel.position.set(side * (w * 0.5 + 0.025), wheelR + 0.42, -0.05);
    panel.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.add(panel);
  });

  // Push-bar / bullbar
  const pushBarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.18), shared.darkTrimMat);
  pushBarLeft.position.set(-0.42, wheelR + 0.26, len * 0.5 + 0.09);
  car.add(pushBarLeft);
  const pushBarRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.18), shared.darkTrimMat);
  pushBarRight.position.set(0.42, wheelR + 0.26, len * 0.5 + 0.09);
  car.add(pushBarRight);
  const pushCross1 = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.07, 0.08), shared.darkTrimMat);
  pushCross1.position.set(0, wheelR + 0.44, len * 0.5 + 0.16);
  car.add(pushCross1);
  const pushCross2 = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.07, 0.08), shared.darkTrimMat);
  pushCross2.position.set(0, wheelR + 0.20, len * 0.5 + 0.16);
  car.add(pushCross2);

  [-0.66, 0.66].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.13, 0.06), shared.headlightMat);
    hl.position.set(lx, wheelR + 0.34, len * 0.5 + 0.01);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.06), shared.taillightMat);
    tl.position.set(lx, wheelR + 0.38, -len * 0.5 - 0.01);
    car.add(tl);
  });

  const roofY = cabin.position.y + cabinH * 0.5 + 0.03;
  addRoofLightbar(car, roofY, cabinZ + 0.15, w * 0.72, shared.darkTrimMat, lightRig);
  if (isCsgt) {
    const radarPod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.32), shared.darkTrimMat);
    radarPod.position.set(0, roofY + 0.07, cabinZ + 0.62);
    car.add(radarPod);
  }

  addWheelsAndArches(car, w * 0.48, len * 0.31, -len * 0.31, wheelR, 0.24, shared.tireMat, shared.rimMat, wheelsOut);
  return car;
}

function buildPrisonerTransportVan(
  opts: { x: number; z: number; ry: number },
  shared: VehicleBuildMats,
  lightRig: EmergencyLightRig,
  wheelsOut?: THREE.Object3D[]
): THREE.Group {
  const van = new THREE.Group();
  van.position.set(opts.x, 0.03, opts.z);
  van.rotation.y = opts.ry;

  const armorNavyMat = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.38, metalness: 0.32 });
  const armorSlateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.4 });
  const steelBarMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.85 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });

  const liveryTex = createVehicleDoorLiveryTex(
    'XE BẮT GIAM',
    'VẬN CHUYỂN PHẠM NHÂN',
    '#172554',
    '#facc15',
    '#ffffff'
  );
  const liveryMat = new THREE.MeshStandardMaterial({ map: liveryTex, roughness: 0.35 });

  const w = 2.34;
  const len = 6.15;
  const wheelR = 0.46;

  const cab = new THREE.Mesh(new THREE.BoxGeometry(w, 1.55, 1.85), armorNavyMat);
  cab.position.set(0, wheelR + 0.72, len * 0.5 - 0.92);
  van.add(cab);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(w - 0.24, 0.62, 0.08), shared.glassMat);
  windshield.position.set(0, wheelR + 1.12, len * 0.5 + 0.01);
  windshield.rotation.x = -0.14;
  van.add(windshield);

  for (let gx = -0.85; gx <= 0.85; gx += 0.24) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.64, 6), steelBarMat);
    bar.position.set(gx, wheelR + 1.12, len * 0.5 + 0.08);
    bar.rotation.x = -0.14;
    van.add(bar);
  }

  const box = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 2.02, 4.18), armorSlateMat);
  box.position.set(0, wheelR + 0.98, -0.95);
  van.add(box);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.11, 4.20), stripeMat);
  stripe.position.set(0, wheelR + 0.58, -0.95);
  van.add(stripe);

  [-1, 1].forEach((side) => {
    const sideSign = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 0.72), liveryMat);
    sideSign.position.set(side * (w * 0.5 + 0.055), wheelR + 0.98, -0.95);
    sideSign.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    van.add(sideSign);

    [-1.85, -0.15].forEach((wz) => {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.96), shared.glassMat);
      winFrame.position.set(side * (w * 0.5 + 0.045), wheelR + 1.56, wz);
      van.add(winFrame);
      for (let bx = -0.36; bx <= 0.36; bx += 0.18) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 6), steelBarMat);
        bar.position.set(side * (w * 0.5 + 0.095), wheelR + 1.56, wz + bx);
        van.add(bar);
      }
    });
  });

  const rearSeam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.82, 0.08), shared.darkTrimMat);
  rearSeam.position.set(0, wheelR + 0.95, -len * 0.5 + 0.06);
  van.add(rearSeam);

  const lockBar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.10), steelBarMat);
  lockBar.position.set(0, wheelR + 0.88, -len * 0.5 + 0.05);
  van.add(lockBar);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.28, 0.22), shared.darkTrimMat);
  bumper.position.set(0, wheelR + 0.02, len * 0.5 + 0.08);
  van.add(bumper);

  [-0.80, 0.80].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.06), shared.headlightMat);
    hl.position.set(lx, wheelR + 0.32, len * 0.5 + 0.02);
    van.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.06), shared.taillightMat);
    tl.position.set(lx, wheelR + 0.36, -len * 0.5 + 0.06);
    van.add(tl);
  });

  addRoofLightbar(van, wheelR + 2.02, len * 0.5 - 1.15, w * 0.78, shared.darkTrimMat, lightRig);
  addWheelsAndArches(van, w * 0.48, len * 0.34, -len * 0.30, wheelR, 0.30, shared.tireMat, shared.rimMat, wheelsOut);
  return van;
}

function buildPoliceTrafficMoto(
  opts: { x: number; z: number; ry: number; withRider?: boolean },
  shared: VehicleBuildMats,
  lightRig: EmergencyLightRig,
  wheelsOut?: THREE.Object3D[]
): THREE.Group {
  const moto = new THREE.Group();
  moto.position.set(opts.x, 0.03, opts.z);
  moto.rotation.y = opts.ry;

  const whiteFairingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.25 });
  const greenStripeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.35 });
  const yellowAccentMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });

  const wGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.15, 16);
  wGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.17, 10);
  rimGeo.rotateZ(Math.PI / 2);

  const addWheel = (wz: number) => {
    const hub = new THREE.Group();
    hub.position.set(0, 0.30, wz);
    hub.add(new THREE.Mesh(wGeo, shared.tireMat));
    hub.add(new THREE.Mesh(rimGeo, shared.rimMat));
    moto.add(hub);
    if (wheelsOut) wheelsOut.push(hub);
  };
  addWheel(0.68);
  addWheel(-0.68);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 1.35), shared.darkTrimMat);
  frame.position.set(0, 0.48, 0);
  moto.add(frame);

  const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.56), whiteFairingMat);
  fairing.position.set(0, 0.80, 0.44);
  moto.add(fairing);

  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.04), shared.glassMat);
  shield.position.set(0, 1.15, 0.50);
  shield.rotation.x = -0.35;
  moto.add(shield);

  // Handlebars
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.66, 8), shared.rimMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.02, 0.34);
  moto.add(bar);

  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.52), whiteFairingMat);
  tank.position.set(0, 0.82, 0.08);
  moto.add(tank);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.62), shared.darkTrimMat);
  seat.position.set(0, 0.78, -0.35);
  moto.add(seat);

  [-0.26, 0.26].forEach((sx) => {
    const pannier = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.52), whiteFairingMat);
    pannier.position.set(sx, 0.60, -0.58);
    moto.add(pannier);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.08, 0.50), yellowAccentMat);
    stripe.position.set(sx, 0.64, -0.58);
    moto.add(stripe);
  });

  const frontStripe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.52), greenStripeMat);
  frontStripe.position.set(0, 0.76, 0.44);
  moto.add(frontStripe);

  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.06), shared.headlightMat);
  hl.position.set(0, 0.78, 0.73);
  moto.add(hl);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.06), shared.taillightMat);
  tl.position.set(0, 0.78, -0.94);
  moto.add(tl);

  // Telescoping rear police beacon pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.82, 8), shared.rimMat);
  pole.position.set(-0.22, 1.18, -0.80);
  moto.add(pole);

  const bluePodMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.9,
  });
  lightRig.blueMats.push(bluePodMat);
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), bluePodMat);
  pod.position.set(-0.22, 1.62, -0.80);
  pod.userData.noMerge = true;
  moto.add(pod);

  const redFrontStrobeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.9,
  });
  lightRig.redMats.push(redFrontStrobeMat);
  const frontStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), redFrontStrobeMat);
  frontStrobe.position.set(0, 0.95, 0.72);
  frontStrobe.userData.noMerge = true;
  moto.add(frontStrobe);

  if (opts.withRider) {
    const rider = new THREE.Group();
    const csgtUniformMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.58 });
    const csgtPantsMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.64 });
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f5c7a3', roughness: 0.7 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.5 });

    // Seated torso leaning slightly forward
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.50, 0.22), csgtUniformMat);
    torso.position.set(0, 1.08, -0.20);
    torso.rotation.x = 0.24;
    rider.add(torso);

    // High-vis sash
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.08, 0.24), yellowAccentMat);
    sash.position.set(0, 1.06, -0.20);
    sash.rotation.x = 0.24;
    rider.add(sash);

    // Head + White CSGT Helmet
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), skinMat);
    head.position.set(0, 1.44, -0.10);
    rider.add(head);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 10), helmetMat);
    helmet.position.set(0, 1.49, -0.10);
    rider.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.08), visorMat);
    visor.position.set(0, 1.46, 0.03);
    rider.add(visor);

    // Arms reaching to handlebars
    [-0.22, 0.22].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.48), csgtUniformMat);
      arm.position.set(ax * 1.1, 1.12, 0.06);
      arm.rotation.x = 0.35;
      arm.rotation.y = ax > 0 ? -0.18 : 0.18;
      rider.add(arm);
    });

    // Legs gripping tank & footpegs
    [-0.21, 0.21].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.14), csgtPantsMat);
      leg.position.set(lx, 0.66, -0.16);
      leg.rotation.x = -0.35;
      rider.add(leg);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.22), shared.darkTrimMat);
      boot.position.set(lx, 0.42, -0.05);
      rider.add(boot);
    });

    moto.add(rider);
  }

  return moto;
}

// ==========================================
// MAIN STRUCTURE BUILDER (X: -211.5..-173.5, Z: -26.4..+15.6)
// ==========================================

export function createPoliceStationStructure(): PoliceStationBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const interiorPointLights: PoliceStationLightEntry[] = [];
  const emergencyLights: EmergencyLightRig = { redMats: [], blueMats: [] };

  // Shared Materials
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.92 });
  const plazaGraniteMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.76 });
  const darkGraniteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.62 });
  const terrazzoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.58 });
  const concretePlinthMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const travertineWallMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.65 });
  const policeNavyMat = new THREE.MeshStandardMaterial({ color: 0x0f2547, roughness: 0.42, metalness: 0.25 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.7 });
  const silverSteelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.82 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.28, metalness: 0.72 });
  const crimsonMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.42 });
  const oakWoodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a2d, roughness: 0.62 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.88 });
  const shrubLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const paintWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
  const paintYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.65 });

  const glassCurtainMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.10,
    metalness: 0.35,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const clearDoorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  const frostedBandMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.35,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const blueGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.95,
    roughness: 0.22,
  });
  neonMats.push(blueGlowMat);

  const ceilingLedMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  neonMats.push(ceilingLedMat);

  const doorSensorLedMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });

  // =========================================================================
  // PART 1: GROUND PLOTS, YARD TARMAC, PARKING STALLS & DRIVEWAY APRON
  // =========================================================================

  const civicPlazaSlab = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.05, 42.0), plazaGraniteMat);
  civicPlazaSlab.position.set(-182.5, 0.005, -5.4);
  staticGroup.add(civicPlazaSlab);

  // Subtle dark granite front walkway runner from pedestrian gate (Z=15.4) to HQ door (Z=8.5)
  const entryWalkway = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.055, 7.2), darkGraniteMat);
  entryWalkway.position.set(-182.5, 0.009, 12.0);
  staticGroup.add(entryWalkway);

  const yardTarmac = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.055, 42.0), asphaltMat);
  yardTarmac.position.set(-201.5, 0.006, -5.4);
  staticGroup.add(yardTarmac);

  // Flush Driveway Ramp Apron across Sidewalk (X = -200.5 .. -194.5, Z = 15.58 .. 20.85)
  const apronSlab = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.06, 5.35), concretePlinthMat);
  apronSlab.position.set(-197.5, 0.008, 18.2);
  staticGroup.add(apronSlab);

  const rampSlope = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 1.35), concretePlinthMat);
  rampSlope.position.set(-197.5, -0.10, 20.92);
  rampSlope.rotation.x = 0.22;
  staticGroup.add(rampSlope);

  // Yellow & White Yard Marking Stripes
  [
    { x: -197.5, z: 12.0, w: 0.14, d: 6.5, mat: paintYellowMat },
    { x: -200.6, z: 12.0, w: 0.14, d: 6.5, mat: paintWhiteMat },
    { x: -194.4, z: 12.0, w: 0.14, d: 6.5, mat: paintWhiteMat },
    { x: -210.0, z: -18.5, w: 0.12, d: 9.2, mat: paintYellowMat },
    { x: -205.5, z: -18.5, w: 0.12, d: 9.2, mat: paintYellowMat },
    { x: -200.8, z: -18.5, w: 0.12, d: 9.2, mat: paintYellowMat },
    { x: -205.4, z: -23.1, w: 9.3, d: 0.12, mat: paintYellowMat },
    { x: -198.2, z: -14.65, w: 0.10, d: 5.7, mat: paintWhiteMat },
    { x: -192.6, z: -14.65, w: 0.10, d: 5.7, mat: paintWhiteMat },
    { x: -195.4, z: -17.5, w: 5.7, d: 0.10, mat: paintWhiteMat },
    { x: -195.4, z: -11.8, w: 5.7, d: 0.10, mat: paintWhiteMat },
  ].forEach((s) => {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.d), s.mat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(s.x, 0.038, s.z);
    staticGroup.add(stripe);
  });

  const addGroundBayLabel = (x: number, z: number, text: string, colorHex: string, w = 3.2, d = 1.0) => {
    const tex = createBayGroundLabelTex(text, colorHex);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.72 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.04, z);
    staticGroup.add(mesh);
  };
  addGroundBayLabel(-207.75, -13.2, 'SUV ĐẶC NHIỆM', '#38bdf8', 3.4, 1.0);
  addGroundBayLabel(-203.15, -13.2, 'XE BẮT GIAM', '#facc15', 3.4, 1.0);
  addGroundBayLabel(-206.4, 5.2, 'TUẦN TRA CS', '#38bdf8', 3.4, 1.0);
  addGroundBayLabel(-196.2, 1.4, 'CSGT GIAO THÔNG', '#84cc16', 3.4, 1.0);
  addGroundBayLabel(-195.4, -10.8, 'MÔ-TÔ CSGT', '#facc15', 3.4, 1.0);

  // =========================================================================
  // PART 2: COVERED POLICE CARPORT CANOPY (X = -210.6 .. -200.4, Z = -24.5 .. -12.6)
  // =========================================================================
  const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.24, 12.2), policeNavyMat);
  canopyRoof.position.set(-205.5, 4.35, -18.5);
  staticGroup.add(canopyRoof);

  const canopyFascia = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.09, 12.3), goldTrimMat);
  canopyFascia.position.set(-205.5, 4.22, -18.5);
  staticGroup.add(canopyFascia);

  [-210.4, -200.6].forEach((cx) => {
    [-24.0, -18.5, -13.0].forEach((cz) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.35, 0.24), darkSteelMat);
      col.position.set(cx, 2.175, cz);
      staticGroup.add(col);
    });
  });

  [-207.75, -203.15].forEach((lx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 8.6), ceilingLedMat);
    strip.position.set(lx, 4.20, -18.5);
    staticGroup.add(strip);
  });

  const yardLight = new THREE.PointLight(0xe0f2fe, 28, 34, 0.9);
  yardLight.position.set(-203.0, 4.6, -12.5);
  interiorPointLights.push({ light: yardLight, dayIntensity: 10, nightIntensity: 28 });

  // =========================================================================
  // PART 3: PERIMETER SECURITY FENCES, UPGRADED GUARD BOOTH & BOOM BARRIER
  // =========================================================================
  const buildFenceSegment = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const seg = new THREE.Group();
    seg.position.set((x1 + x2) * 0.5, 0, (z1 + z2) * 0.5);
    seg.rotation.y = angle;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, len), concretePlinthMat);
    plinth.position.y = 0.36;
    seg.add(plinth);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, len), policeNavyMat);
    topRail.position.y = 2.15;
    seg.add(topRail);

    const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, len), darkSteelMat);
    midRail.position.y = 1.40;
    seg.add(midRail);

    const count = Math.max(2, Math.floor(len / 0.48));
    const step = len / count;
    for (let i = 0; i <= count; i++) {
      const zOff = -len * 0.5 + i * step;
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.46, 0.05), darkSteelMat);
      picket.position.set(0, 1.45, zOff);
      seg.add(picket);
    }

    staticGroup.add(seg);
  };

  buildFenceSegment(-211.5, -26.4, -211.5, 15.4);
  buildFenceSegment(-211.5, -26.4, -173.5, -26.4);
  buildFenceSegment(-173.5, -26.4, -173.5, 15.4);
  buildFenceSegment(-211.5, 15.4, -201.0, 15.4);
  buildFenceSegment(-194.0, 15.4, -185.6, 15.4);
  buildFenceSegment(-179.4, 15.4, -173.5, 15.4);

  [
    { x: -201.0, z: 15.4, hasBeacon: true },
    { x: -194.0, z: 15.4, hasBeacon: true },
    { x: -185.6, z: 15.4, hasBeacon: false },
    { x: -179.4, z: 15.4, hasBeacon: false },
  ].forEach((p) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.55, 0.62), concretePlinthMat);
    col.position.set(p.x, 1.275, p.z);
    staticGroup.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.74), policeNavyMat);
    cap.position.set(p.x, 2.60, p.z);
    staticGroup.add(cap);
    const goldBand = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.68), goldTrimMat);
    goldBand.position.set(p.x, 2.48, p.z);
    staticGroup.add(goldBand);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10),
      p.hasBeacon ? blueGlowMat : ceilingLedMat
    );
    lamp.position.set(p.x, 2.84, p.z);
    staticGroup.add(lamp);
  });

  // Animated Police Boom Barrier Gate (X = -200.7 .. -194.3, Z = 15.4)
  const barrierBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.15, 0.46), paintYellowMat);
  barrierBase.position.set(-200.55, 0.575, 15.05);
  staticGroup.add(barrierBase);

  const barrierPivot = new THREE.Group();
  barrierPivot.userData.noMerge = true;
  barrierPivot.position.set(-200.55, 1.02, 15.40);

  const armLen = 6.2;
  const redArmMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
  for (let i = 0; i < 8; i++) {
    const segLen = armLen / 8;
    const segMesh = new THREE.Mesh(
      new THREE.BoxGeometry(segLen, 0.11, 0.08),
      i % 2 === 0 ? redArmMat : paintWhiteMat
    );
    segMesh.position.set(i * segLen + segLen * 0.5, 0, 0);
    barrierPivot.add(segMesh);
  }
  staticGroup.add(barrierPivot);

  // Upgraded Guard Booth beside Vehicle Gate (X = -192.6, Z = 13.6)
  const boothBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.05, 2.1), policeNavyMat);
  boothBase.position.set(-192.6, 0.525, 13.6);
  staticGroup.add(boothBase);
  const boothBand = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.07, 2.16), goldTrimMat);
  boothBand.position.set(-192.6, 1.04, 13.6);
  staticGroup.add(boothBand);
  const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(2.04, 1.20, 2.04), clearDoorGlassMat);
  boothGlass.position.set(-192.6, 1.65, 13.6);
  staticGroup.add(boothGlass);
  // Corner mullions on booth
  [-0.98, 0.98].forEach((bx) => {
    [-0.98, 0.98].forEach((bz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.24, 0.10), darkSteelMat);
      m.position.set(-192.6 + bx, 1.65, 13.6 + bz);
      staticGroup.add(m);
    });
  });
  // Guard desk & monitor inside booth
  const boothDesk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.55), oakWoodMat);
  boothDesk.position.set(-192.6, 1.12, 13.95);
  staticGroup.add(boothDesk);
  const boothMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.32, 0.05), blueGlowMat);
  boothMonitor.position.set(-192.6, 1.32, 14.05);
  staticGroup.add(boothMonitor);

  const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.26, 2.55), policeNavyMat);
  boothRoof.position.set(-192.6, 2.38, 13.6);
  staticGroup.add(boothRoof);
  const boothSignTex = createSmallHeaderTex('CHỐT KIỂM SOÁT');
  const boothSignMat = new THREE.MeshStandardMaterial({
    map: boothSignTex,
    emissive: 0xffffff,
    emissiveMap: boothSignTex,
    emissiveIntensity: 0.35,
  });
  const boothSign = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.34), boothSignMat);
  boothSign.position.set(-192.6, 2.38, 14.89);
  staticGroup.add(boothSign);

  const boothBeaconMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.9,
  });
  emergencyLights.blueMats.push(boothBeaconMat);
  const boothBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.20, 10), boothBeaconMat);
  boothBeacon.position.set(-192.6, 2.60, 13.6);
  boothBeacon.userData.noMerge = true;
  staticGroup.add(boothBeacon);

  // =========================================================================
  // PART 4: STATIC CARPORT SUV (TACTICAL SUV PARKED IN BAY 1)
  // (Patrol Sedan, CSGT Cruiser, Prisoner Van & 2 CSGT Motos run dynamically in PoliceFleetTrafficController)
  // =========================================================================
  const sharedCarMats: VehicleBuildMats = {
    tireMat: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 }),
    rimMat: silverSteelMat,
    darkTrimMat: darkSteelMat,
    glassMat: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.5 }),
    headlightMat: new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.95 }),
    taillightMat: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.85 }),
  };

  staticGroup.add(
    buildPolicePatrolCar(
      { x: -207.75, z: -18.5, ry: 0, variant: 'suv113' },
      sharedCarMats,
      emergencyLights
    )
  );

  // =========================================================================
  // PART 5: MONUMENT SIGN MOVED OUTSIDE FENCE (X = -189.6, Z = 16.35) & FORECOURT LANDSCAPING
  // =========================================================================
  // Positioned outside the perimeter fence on the sidewalk setback facing +Z toward the boulevard
  const monX = -189.6;
  const monZ = 16.35;
  const monPlinthBottom = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.26, 0.92), darkGraniteMat);
  monPlinthBottom.position.set(monX, 0.13, monZ);
  staticGroup.add(monPlinthBottom);
  const monPlinthTop = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.24, 0.72), concretePlinthMat);
  monPlinthTop.position.set(monX, 0.38, monZ);
  staticGroup.add(monPlinthTop);

  const monBody = new THREE.Mesh(new THREE.BoxGeometry(2.58, 2.08, 0.44), policeNavyMat);
  monBody.position.set(monX, 1.54, monZ);
  staticGroup.add(monBody);
  const monCap = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.14, 0.56), goldTrimMat);
  monCap.position.set(monX, 2.64, monZ);
  staticGroup.add(monCap);
  // Subtle LED wash strip under the monument cap
  const monWashLed = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.05, 0.08), blueGlowMat);
  monWashLed.position.set(monX, 2.55, monZ + 0.25);
  staticGroup.add(monWashLed);

  const monTex = createMonumentSignTex();
  const monSignMat = new THREE.MeshStandardMaterial({
    map: monTex,
    emissive: 0xffffff,
    emissiveMap: monTex,
    emissiveIntensity: 0.28,
    roughness: 0.35,
  });
  const monFaceFront = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 1.88), monSignMat);
  monFaceFront.position.set(monX, 1.54, monZ + 0.23);
  staticGroup.add(monFaceFront);
  // Finished rear plaque visible from inside the forecourt
  const monFaceBack = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 1.88), monSignMat);
  monFaceBack.position.set(monX, 1.54, monZ - 0.23);
  monFaceBack.rotation.y = Math.PI;
  staticGroup.add(monFaceBack);

  // Two Flagpoles flanking Forecourt (-188.6 and -176.4 at Z = 11.4)
  [
    { x: -188.6, isNat: true },
    { x: -176.4, isNat: false },
  ].forEach((fp) => {
    const poleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.34, 12), darkGraniteMat);
    poleBase.position.set(fp.x, 0.17, 11.4);
    staticGroup.add(poleBase);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 7.6, 10), silverSteelMat);
    pole.position.set(fp.x, 3.9, 11.4);
    staticGroup.add(pole);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), goldTrimMat);
    finial.position.set(fp.x, 7.76, 11.4);
    staticGroup.add(finial);
    const flagMat = new THREE.MeshStandardMaterial({
      map: createFlagTex(fp.isNat),
      side: THREE.DoubleSide,
      roughness: 0.65,
    });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.10), flagMat);
    flag.position.set(fp.x + 0.90, 7.05, 11.4);
    staticGroup.add(flag);
  });

  // Landscaped Granite Shrub Planters & Bollard Lights flanking Forecourt Walkway
  [-187.4, -177.6].forEach((hx) => {
    const planterBox = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.38, 1.18), darkGraniteMat);
    planterBox.position.set(hx, 0.20, 9.6);
    staticGroup.add(planterBox);
    const planterCap = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.06, 1.28), goldTrimMat);
    planterCap.position.set(hx, 0.40, 9.6);
    staticGroup.add(planterCap);
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.48, 0.92), hedgeMat);
    hedge.position.set(hx, 0.64, 9.6);
    staticGroup.add(hedge);
    [-1.1, 0, 1.1].forEach((sx) => {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), shrubLeafMat);
      bush.position.set(hx + sx, 0.96, 9.6);
      staticGroup.add(bush);
    });
  });

  [-185.1, -179.9].forEach((bx) => {
    [10.2, 12.6].forEach((bz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.85, 8), darkSteelMat);
      post.position.set(bx, 0.425, bz);
      staticGroup.add(post);
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8), blueGlowMat);
      glow.position.set(bx, 0.82, bz);
      staticGroup.add(glow);
    });
  });

  const forecourtLight = new THREE.PointLight(0xf8fafc, 28, 28, 0.95);
  forecourtLight.position.set(-182.5, 4.4, 11.4);
  interiorPointLights.push({ light: forecourtLight, dayIntensity: 7, nightIntensity: 28 });

  // =========================================================================
  // PART 6: 2-STORY POLICE HEADQUARTERS BUILDING (X = -190.5 .. -174.5, Z = -24.5 .. +8.5)
  // =========================================================================
  const bMinX = -190.5;
  const bMaxX = -174.5;
  const bCenterX = -182.5;
  const bMinZ = -24.5;
  const bMaxZ = 8.5;
  const bWidth = 16.0;
  const bDepth = 33.0;
  const wallH1 = 4.2;
  const totalH = 8.4;

  // Interior Terrazzo Floor
  const intFloor = new THREE.Mesh(new THREE.BoxGeometry(bWidth - 0.2, 0.08, bDepth - 0.2), terrazzoMat);
  intFloor.position.set(bCenterX, 0.04, (bMinZ + bMaxZ) * 0.5);
  staticGroup.add(intFloor);

  // Welcome Entry Mat right at the automatic sliding doors
  const welcomeMat = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.03, 1.7), policeNavyMat);
  welcomeMat.position.set(bCenterX, 0.06, bMaxZ);
  staticGroup.add(welcomeMat);

  // Solid Exterior Walls
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, totalH, bDepth), travertineWallMat);
  eastWall.position.set(bMaxX, totalH * 0.5, (bMinZ + bMaxZ) * 0.5);
  staticGroup.add(eastWall);

  const northWall = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.4, totalH, 0.42), travertineWallMat);
  northWall.position.set(bCenterX, totalH * 0.5, bMinZ);
  staticGroup.add(northWall);

  // West Wall split around Compound Side Doorway (Z = -7.5 .. -4.5, height 3.0m)
  const westFrontLen = 8.5 - -4.5;
  const westFrontWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, totalH, westFrontLen), travertineWallMat);
  westFrontWall.position.set(bMinX, totalH * 0.5, (-4.5 + 8.5) * 0.5);
  staticGroup.add(westFrontWall);

  const westRearLen = -7.5 - -24.5;
  const westRearWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, totalH, westRearLen), travertineWallMat);
  westRearWall.position.set(bMinX, totalH * 0.5, (-24.5 + -7.5) * 0.5);
  staticGroup.add(westRearWall);

  const westDoorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.44, totalH - 3.0, 3.0), policeNavyMat);
  westDoorHeader.position.set(bMinX, 3.0 + (totalH - 3.0) * 0.5, -6.0);
  staticGroup.add(westDoorHeader);

  // Ground-Floor Ceiling Slab (Y = 4.2) & Flat Architectural Roof (Y = 8.4)
  const midSlab = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.2, 0.28, bDepth + 0.2), travertineWallMat);
  midSlab.position.set(bCenterX, wallH1, (bMinZ + bMaxZ) * 0.5);
  staticGroup.add(midSlab);

  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.8, 0.36, bDepth + 0.8), policeNavyMat);
  roofSlab.position.set(bCenterX, totalH, (bMinZ + bMaxZ) * 0.5);
  staticGroup.add(roofSlab);

  const roofGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.9, 0.12, bDepth + 0.9), goldTrimMat);
  roofGoldTrim.position.set(bCenterX, totalH + 0.22, (bMinZ + bMaxZ) * 0.5);
  staticGroup.add(roofGoldTrim);

  // South Front Facade (Z = 8.5): Ground Floor Glass + Open 4.0m Center Doorway (X = -184.5 .. -180.5)
  [-187.5, -177.5].forEach((fx) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.65, 0.32), policeNavyMat);
    plinth.position.set(fx, 0.325, bMaxZ);
    staticGroup.add(plinth);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(6.0, 3.45, 0.10), clearDoorGlassMat);
    glass.position.set(fx, 2.38, bMaxZ);
    staticGroup.add(glass);
  });

  // Doorway Frame Jambs & Overhead Automatic Sliding Track Header (NO center pillar!)
  [-184.55, -180.45].forEach((jx) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.55, 0.28), darkSteelMat);
    jamb.position.set(jx, 1.775, bMaxZ - 0.04);
    staticGroup.add(jamb);
  });
  const doorTransom = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.52, 0.32), policeNavyMat);
  doorTransom.position.set(bCenterX, 3.74, bMaxZ - 0.02);
  staticGroup.add(doorTransom);
  const doorSensorBox = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.14), darkSteelMat);
  doorSensorBox.position.set(bCenterX, 3.58, bMaxZ + 0.14);
  staticGroup.add(doorSensorBox);
  const doorSensorLed = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.06), doorSensorLedMat);
  doorSensorLed.position.set(bCenterX, 3.58, bMaxZ + 0.21);
  doorSensorLed.userData.noMerge = true;
  staticGroup.add(doorSensorLed);

  // Floor 2 Front Curtain Glass & Architectural Pilasters
  const f2Glass = new THREE.Mesh(new THREE.BoxGeometry(bWidth - 0.8, 3.55, 0.12), glassCurtainMat);
  f2Glass.position.set(bCenterX, 6.25, bMaxZ - 0.05);
  staticGroup.add(f2Glass);

  // Floor 2 Curtain-Wall Mullions for crisp architectural rhythm
  [5.40, 7.15].forEach((my) => {
    const hMullion = new THREE.Mesh(new THREE.BoxGeometry(bWidth - 0.6, 0.08, 0.16), darkSteelMat);
    hMullion.position.set(bCenterX, my, bMaxZ - 0.02);
    staticGroup.add(hMullion);
  });

  // Full-height structural pilasters strictly OUTSIDE the doorway (-190.3, -186.5, -178.5, -174.7)
  [-190.3, -186.5, -178.5, -174.7].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.45, totalH, 0.45), travertineWallMat);
    pilaster.position.set(px, totalH * 0.5, bMaxZ + 0.05);
    staticGroup.add(pilaster);
  });
  // Center Floor-2-only architectural mullion (strictly above Y=4.30 portico roof, never blocking the door!)
  const f2CenterMullion = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.95, 0.34), travertineWallMat);
  f2CenterMullion.position.set(bCenterX, 6.32, bMaxZ + 0.05);
  staticGroup.add(f2CenterMullion);

  // Sleek Horizontal Aluminum Louver Trim Band across Facade Midline (Y = 4.22)
  const facadeBelt = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.4, 0.20, 0.34), policeNavyMat);
  facadeBelt.position.set(bCenterX, 4.22, bMaxZ + 0.08);
  staticGroup.add(facadeBelt);

  // 3D Golden Police Star Shield Emblem centered on Floor 2 Facade (X = -182.5, Y = 6.35, Z = 8.78)
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(bCenterX, 6.35, bMaxZ + 0.24);
  const shieldBack = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.46, 0.10, 6), goldTrimMat);
  shieldBack.rotation.x = Math.PI / 2;
  shieldGroup.add(shieldBack);
  const shieldInner = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.36, 0.12, 6), crimsonMat);
  shieldInner.rotation.x = Math.PI / 2;
  shieldInner.position.z = 0.02;
  shieldGroup.add(shieldInner);
  const shieldStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), goldTrimMat);
  shieldStar.scale.set(1, 1, 0.35);
  shieldStar.position.z = 0.10;
  shieldGroup.add(shieldStar);
  staticGroup.add(shieldGroup);

  // Illuminated Blue Architectural LED Fins flanking Entrance & Outer Corners
  [-190.3, -186.5, -178.5, -174.7].forEach((fx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 7.6, 0.22), blueGlowMat);
    fin.position.set(fx, 4.0, bMaxZ + 0.28);
    staticGroup.add(fin);
  });

  // Entrance Portico Canopy, Recessed Downlights & Illuminated Portico Signboard (Z = 8.5 .. 10.95)
  const portico = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.36, 2.45), policeNavyMat);
  portico.position.set(bCenterX, 4.05, bMaxZ + 1.18);
  staticGroup.add(portico);

  const porticoGold = new THREE.Mesh(new THREE.BoxGeometry(7.88, 0.08, 2.52), goldTrimMat);
  porticoGold.position.set(bCenterX, 4.26, bMaxZ + 1.18);
  staticGroup.add(porticoGold);

  const porticoSignTex = createPorticoSignTex();
  const porticoSignMat = new THREE.MeshStandardMaterial({
    map: porticoSignTex,
    emissive: 0xffffff,
    emissiveMap: porticoSignTex,
    emissiveIntensity: 0.42,
    roughness: 0.3,
  });
  const porticoSignFace = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 0.30), porticoSignMat);
  porticoSignFace.position.set(bCenterX, 4.05, bMaxZ + 2.42);
  staticGroup.add(porticoSignFace);

  [-185.8, -179.2].forEach((px) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.40, 4.0, 0.40), travertineWallMat);
    col.position.set(px, 2.0, bMaxZ + 2.05);
    staticGroup.add(col);
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.54), darkGraniteMat);
    colBase.position.set(px, 0.21, bMaxZ + 2.05);
    staticGroup.add(colBase);
  });

  // Recessed Portico Under-Canopy Downlights & CCTV Domes
  [-184.2, -180.8].forEach((lx) => {
    const downlight = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.45), ceilingLedMat);
    downlight.position.set(lx, 3.86, bMaxZ + 1.15);
    staticGroup.add(downlight);
  });
  [-189.6, -175.4].forEach((cx) => {
    const camMount = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.12, 10), darkSteelMat);
    camMount.position.set(cx, 3.92, bMaxZ + 0.25);
    staticGroup.add(camMount);
    const camDome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), sharedCarMats.glassMat);
    camDome.position.set(cx, 3.84, bMaxZ + 0.25);
    staticGroup.add(camDome);
  });

  // Illuminated Main Rooftop Facade Signboard ("ĐỒN CẢNH SÁT" — without "POLICE 113")
  const mainSignTex = createPoliceMainSignTex();
  const mainSignMat = new THREE.MeshStandardMaterial({
    map: mainSignTex,
    emissive: 0xffffff,
    emissiveMap: mainSignTex,
    emissiveIntensity: 0.48,
    roughness: 0.3,
  });
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(15.2, 2.25, 0.35), policeNavyMat);
  signBack.position.set(bCenterX, 9.65, bMaxZ + 0.15);
  staticGroup.add(signBack);
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(14.9, 2.08), mainSignMat);
  signFace.position.set(bCenterX, 9.65, bMaxZ + 0.34);
  staticGroup.add(signFace);

  // Rooftop Communications & Rotating Radar Mast (X = -177.5, Z = -8.0)
  const mastBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), darkSteelMat);
  mastBase.position.set(-177.5, totalH + 0.45, -8.0);
  staticGroup.add(mastBase);
  const mastTower = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.24, 5.2, 8), silverSteelMat);
  mastTower.position.set(-177.5, totalH + 3.2, -8.0);
  staticGroup.add(mastTower);
  const radarSpinner = new THREE.Group();
  radarSpinner.userData.noMerge = true;
  radarSpinner.position.set(-177.5, totalH + 4.2, -8.0);
  const radarArm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.22), paintWhiteMat);
  radarSpinner.add(radarArm);
  const radarDish = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.32, 16), paintWhiteMat);
  radarDish.rotation.x = Math.PI * 0.38;
  radarDish.position.set(0, 0.15, 0.45);
  radarSpinner.add(radarDish);
  staticGroup.add(radarSpinner);

  const mastBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.4,
  });
  emergencyLights.redMats.push(mastBeaconMat);
  const mastBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mastBeaconMat);
  mastBeacon.position.set(-177.5, totalH + 5.9, -8.0);
  mastBeacon.userData.noMerge = true;
  staticGroup.add(mastBeacon);

  // Floor 2 Interior Briefing Table & Wall Screen (visible through upper curtain glass)
  const f2Table = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.85, 2.2), policeNavyMat);
  f2Table.position.set(bCenterX, 4.70, 3.8);
  staticGroup.add(f2Table);
  const f2Screen = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.5, 0.12), blueGlowMat);
  f2Screen.position.set(bCenterX, 6.2, 0.5);
  staticGroup.add(f2Screen);
  [-186.5, -178.5].forEach((lx) => {
    const f2Led = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.45), ceilingLedMat);
    f2Led.position.set(lx, 8.15, 3.8);
    staticGroup.add(f2Led);
  });

  // Automatic Sliding Clear Glass Front Doors on Inner Track (Z = bMaxZ - 0.12 = 8.38)
  const buildSlidingDoor = (cx: number) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;
    grp.position.set(cx, 0, bMaxZ - 0.12);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.00, 3.28, 0.05), clearDoorGlassMat);
    leaf.position.set(0, 1.68, 0);
    grp.add(leaf);
    // Frosted safety visibility band
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.24, 0.055), frostedBandMat);
    band.position.set(0, 1.45, 0);
    grp.add(band);
    // Top, bottom & vertical aluminum stiles
    const topF = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.10, 0.08), darkSteelMat);
    topF.position.set(0, 3.30, 0);
    grp.add(topF);
    const botF = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.12, 0.08), darkSteelMat);
    botF.position.set(0, 0.06, 0);
    grp.add(botF);
    [-0.98, 0.98].forEach((sx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.26, 0.08), darkSteelMat);
      stile.position.set(sx, 1.68, 0);
      grp.add(stile);
    });
    // Stainless steel push handle near center meeting edge
    const handleX = cx < bCenterX ? 0.78 : -0.78;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8), silverSteelMat);
    handle.position.set(handleX, 1.25, 0.06);
    grp.add(handle);
    staticGroup.add(grp);
    return grp;
  };
  const frontDoorLeft = buildSlidingDoor(-183.5);
  const frontDoorRight = buildSlidingDoor(-181.5);

  // =========================================================================
  // PART 7: INTERIOR ROOMS (LOBBY, FORENSICS & COMMAND, HOLDING CELLS)
  // =========================================================================

  [-186.5, -178.5].forEach((lx) => {
    [4.5, -1.5, -7.5, -15.5, -21.0].forEach((lz) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.42), ceilingLedMat);
      panel.position.set(lx, 3.98, lz);
      staticGroup.add(panel);
    });
  });
  const lobbyLight = new THREE.PointLight(0xf8fafc, 32, 24, 0.95);
  lobbyLight.position.set(bCenterX, 3.7, 4.2);
  interiorPointLights.push({ light: lobbyLight, dayIntensity: 14, nightIntensity: 32 });

  const commandLight = new THREE.PointLight(0xe0f2fe, 34, 28, 0.95);
  commandLight.position.set(bCenterX, 3.7, -8.5);
  interiorPointLights.push({ light: commandLight, dayIntensity: 14, nightIntensity: 34 });

  // 7A. Main Reception & Duty Desk ("TRỰC BAN TIẾP DÂN", Z = 1.6)
  const dutyBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.06, 0.85), policeNavyMat);
  dutyBase.position.set(bCenterX, 0.53, 1.6);
  staticGroup.add(dutyBase);
  const dutyTop = new THREE.Mesh(new THREE.BoxGeometry(5.75, 0.08, 0.98), oakWoodMat);
  dutyTop.position.set(bCenterX, 1.10, 1.6);
  staticGroup.add(dutyTop);
  const dutyTrim = new THREE.Mesh(new THREE.BoxGeometry(5.64, 0.07, 0.88), goldTrimMat);
  dutyTrim.position.set(bCenterX, 0.55, 1.6);
  staticGroup.add(dutyTrim);

  const deskSignTex = createSmallHeaderTex('TRỰC BAN TIẾP DÂN 24/7');
  const deskSignMat = new THREE.MeshStandardMaterial({
    map: deskSignTex,
    emissive: 0xffffff,
    emissiveMap: deskSignTex,
    emissiveIntensity: 0.3,
  });
  const deskPlaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.44), deskSignMat);
  deskPlaque.position.set(bCenterX, 0.80, 2.04);
  staticGroup.add(deskPlaque);

  [-1.2, 1.2].forEach((mx) => {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.05), blueGlowMat);
    mon.position.set(bCenterX + mx, 1.38, 1.55);
    staticGroup.add(mon);
  });

  // Citizen Waiting Benches along East Lobby Wall (X = -175.8, Z = 4.0 .. 6.8)
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.48, 3.2), oakWoodMat);
  bench.position.set(-175.8, 0.28, 5.2);
  staticGroup.add(bench);

  // 7B. Command, Research & Forensics Wing (Z = -12.5 .. -1.0)
  const screenConfigs: Array<{ z: number; mode: 'cctv' | 'radar' | 'forensics' }> = [
    { z: -2.5, mode: 'cctv' },
    { z: -6.0, mode: 'radar' },
    { z: -9.5, mode: 'forensics' },
  ];
  screenConfigs.forEach((sc) => {
    const tex = createMonitorWallTex(sc.mode);
    const scrMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.85, 3.15), darkSteelMat);
    frame.position.set(-174.78, 2.25, sc.z);
    staticGroup.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.7), scrMat);
    face.position.set(-174.84, 2.25, sc.z);
    face.rotation.y = -Math.PI / 2;
    staticGroup.add(face);
  });

  // Center Tactical Holographic City Map Table (X = -181.8, Z = -6.0) + 3D miniature city blocks
  const mapBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.92, 4.4), policeNavyMat);
  mapBase.position.set(-181.8, 0.46, -6.0);
  staticGroup.add(mapBase);
  const mapGrid = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.06, 4.1), blueGlowMat);
  mapGrid.position.set(-181.8, 0.95, -6.0);
  staticGroup.add(mapGrid);
  [
    { dx: -0.7, dz: -1.1, h: 0.35 },
    { dx: 0.5, dz: -0.5, h: 0.62 },
    { dx: -0.2, dz: 0.4, h: 0.42 },
    { dx: 0.8, dz: 1.0, h: 0.28 },
  ].forEach((b) => {
    const holoBlock = new THREE.Mesh(new THREE.BoxGeometry(0.45, b.h, 0.45), glassCurtainMat);
    holoBlock.position.set(-181.8 + b.dx, 0.98 + b.h * 0.5, -6.0 + b.dz);
    staticGroup.add(holoBlock);
  });

  // Forensics Lab Analysis Desks + Gear Lockers along West Corridor (X = -188.6, Z = -2.0 & -10.0)
  [-2.0, -10.0].forEach((fz) => {
    const fDesk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.88, 2.6), darkSteelMat);
    fDesk.position.set(-188.6, 0.44, fz);
    staticGroup.add(fDesk);
    const fTop = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 2.66), silverSteelMat);
    fTop.position.set(-188.6, 0.91, fz);
    staticGroup.add(fTop);
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), silverSteelMat);
    scope.position.set(-188.6, 1.15, fz - 0.5);
    staticGroup.add(scope);
    const fMon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.68), blueGlowMat);
    fMon.position.set(-188.9, 1.22, fz + 0.5);
    staticGroup.add(fMon);
  });

  const lockerBank = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.2, 2.8), concretePlinthMat);
  lockerBank.position.set(-189.8, 1.1, -13.5);
  staticGroup.add(lockerBank);

  // 7C. Back Holding Cells Wing ("KHU TẠM GIỮ", Z = -24.5 .. -16.5)
  const cellCenterDiv = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.0, 8.0), concretePlinthMat);
  cellCenterDiv.position.set(bCenterX, 2.0, -20.5);
  staticGroup.add(cellCenterDiv);

  const cellTopBeam = new THREE.Mesh(new THREE.BoxGeometry(bWidth - 0.4, 0.85, 0.26), concretePlinthMat);
  cellTopBeam.position.set(bCenterX, 3.65, -16.5);
  staticGroup.add(cellTopBeam);

  const cellSignTex = createSmallHeaderTex('KHU TẠM GIỮ AN NINH', '#7f1d1d', '#fde047');
  const cellSignMat = new THREE.MeshStandardMaterial({
    map: cellSignTex,
    emissive: 0xffffff,
    emissiveMap: cellSignTex,
    emissiveIntensity: 0.3,
  });
  const cellSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.54), cellSignMat);
  cellSign.position.set(bCenterX, 3.65, -16.36);
  staticGroup.add(cellSign);

  for (let bx = -189.8; bx <= -175.2; bx += 0.28) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.25, 8), silverSteelMat);
    bar.position.set(bx, 1.625, -16.5);
    staticGroup.add(bar);
  }
  [-187.0, -178.0].forEach((cx) => {
    const cBench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 0.72), concretePlinthMat);
    cBench.position.set(cx, 0.225, -23.6);
    staticGroup.add(cBench);
  });

  // =========================================================================
  // PART 8: 24/7 ANIMATION UPDATER (BOOM BARRIER, SLIDING DOORS, RADAR & STROBES)
  // =========================================================================
  let barrierAmount = 0;
  let doorSlideAmount = 0;
  let flashTimer = 0;

  const updateStation = (
    _rawHour: number,
    delta: number,
    isPlayerNearBarrier: boolean,
    isPlayerNearFrontDoor: boolean,
    npcController?: PoliceStationNpcController | null,
    hasFleetNearGate?: boolean
  ) => {
    const dt = Math.min(delta, 0.1);
    flashTimer += dt;

    // 1. Automatic Boom Barrier Gate (opens for player, patrolling officers, or exiting/entering police fleet)
    const wantBarrierOpen =
      isPlayerNearBarrier || Boolean(npcController?.hasOfficerNearGate()) || Boolean(hasFleetNearGate);
    const targetBarrier = wantBarrierOpen ? 1.0 : 0.0;
    barrierAmount += (targetBarrier - barrierAmount) * Math.min(1, dt * 7.2);
    barrierPivot.rotation.z = barrierAmount * 1.32;

    // 2. Automatic Front Sliding Glass Doors
    const wantDoorOpen = isPlayerNearFrontDoor || Boolean(npcController?.hasOfficerNearLobbyDoor());
    const targetDoor = wantDoorOpen ? 1.0 : 0.0;
    doorSlideAmount += (targetDoor - doorSlideAmount) * Math.min(1, dt * 7.5);
    frontDoorLeft.position.x = -183.5 - doorSlideAmount * 1.92;
    frontDoorRight.position.x = -181.5 + doorSlideAmount * 1.92;
    doorSensorLedMat.color.setHex(doorSlideAmount > 0.25 ? 0x22c55e : 0x22d3ee);
    doorSensorLedMat.emissive.setHex(doorSlideAmount > 0.25 ? 0x22c55e : 0x22d3ee);

    // 3. Rotating Rooftop Radar Scanner
    radarSpinner.rotation.y += dt * 1.15;

    // 4. Alternating Red / Blue Police Emergency Lightbars on Static Assets
    const pulsePhase = Math.sin(flashTimer * 10.5);
    const redIntensity = pulsePhase > 0 ? 1.85 : 0.22;
    const blueIntensity = pulsePhase <= 0 ? 1.85 : 0.22;
    for (let i = 0; i < emergencyLights.redMats.length; i++) {
      emergencyLights.redMats[i].emissiveIntensity = redIntensity;
    }
    for (let i = 0; i < emergencyLights.blueMats.length; i++) {
      emergencyLights.blueMats[i].emissiveIntensity = blueIntensity;
    }
  };

  return {
    staticGroup,
    neonMats,
    interiorPointLights,
    getBarrierOpenAmount: () => barrierAmount,
    updateStation,
  };
}

// ==========================================
// DYNAMIC POLICE ROAD FLEET CONTROLLER
// - 2 Active Patrol Cars (Cảnh Sát Tuần Tra + CSGT) cruising boulevard + sounding siren 2x/day
// - 1 Armored Prisoner Transport Van departing Carport Bay 2 1x/day for a full boulevard run
// - 2 CSGT Traffic Police Motorcycles actively patrolling the boulevard lanes
// ==========================================

function getPoliceVehicleGroundY(z: number): number {
  if (z <= 19.6) return 0.03;
  if (z >= 21.6) return -0.26;
  const t = (z - 19.6) / 2.0;
  return 0.03 + (-0.26 - 0.03) * t;
}

function lerpYaw(current: number, target: number, alpha: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

interface DynamicPoliceUnit {
  id: string;
  kind: 'car' | 'motorbike';
  role: 'patrol113' | 'csgt' | 'prisonerVan' | 'moto';
  group: THREE.Group;
  wheels: THREE.Object3D[];
  emergencyRig: EmergencyLightRig;
  headlightMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  halfW: number;
  halfL: number;
  wheelR: number;
  priority: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  cruiseSpeed: number;
  laneZ: number;
  lanesEast: readonly [number, number];
  lanesWest: readonly [number, number];
  state:
    | 'parked_in_bay'
    | 'yard_exit_path'
    | 'cruise_east'
    | 'u_turn_east'
    | 'cruise_west'
    | 'u_turn_west'
    | 'cruise_ns'
    | 'u_turn_ns'
    | 'cruise_bd'
    | 'u_turn_bd'
    | 'turn_curve'
    | 'yard_return_path';
  waypoints: Array<{ x: number; z: number }>;
  wpIdx: number;
  parkedX: number;
  parkedZ: number;
  parkedYaw: number;
  turnProgress: number;
  turnStartX: number;
  turnStartZ: number;
  turnTargetZ: number;
  turnCtrlX: number;
  turnCtrlZ: number;
  turnEndX: number;
  turnEndZ: number;
  turnEndYaw: number;
  turnNextState:
    | 'cruise_east'
    | 'cruise_west'
    | 'cruise_ns'
    | 'cruise_bd';
  nsCenterX: number;
  nsDir: 1 | -1;
  bdDir: 1 | -1;
  routeStep: number;
  turnCooldown: number;
  lapCounter: number;
  lapsBeforeStationPitstop: number;
  bayWaitTimer: number;
  laneSwitchCooldown: number;
  sirenBurstTimer: number;
  phaseOffset: number;
}

export class PoliceFleetTrafficController {
  public readonly rootGroup = new THREE.Group();
  private readonly coordinator: CityTrafficCoordinator;
  private readonly onPlaySiren?: (volumeScale: number) => void;
  private getIntersectionSignal?: BoulevardSignalGetter;
  private getEastIntersectionSignal?: BoulevardSignalGetter;
  private getFarEastIntersectionSignal?: BoulevardSignalGetter;
  private getDiorIntersectionSignal?: BoulevardSignalGetter;
  private readonly units: DynamicPoliceUnit[] = [];

  private animTime = 0;
  private lastRawHour = -1;
  private daySiren1Fired = false;
  private daySiren2Fired = false;
  private prisonerVanDispatchedToday = false;

  constructor(
    coordinator: CityTrafficCoordinator,
    onPlaySiren?: (volumeScale: number) => void
  ) {
    this.coordinator = coordinator;
    this.onPlaySiren = onPlaySiren;
    this.rootGroup.userData.noMerge = true;
    this.buildFleet();
  }

  public setIntersectionSignalGetter(fn: BoulevardSignalGetter) {
    this.getIntersectionSignal = fn;
  }

  public setEastIntersectionSignalGetter(fn: BoulevardSignalGetter) {
    this.getEastIntersectionSignal = fn;
  }

  public setFarEastIntersectionSignalGetter(fn: BoulevardSignalGetter) {
    this.getFarEastIntersectionSignal = fn;
  }

  public setDiorIntersectionSignalGetter(fn: BoulevardSignalGetter) {
    this.getDiorIntersectionSignal = fn;
  }

  private createUnitSharedMats() {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.82 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.5 });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfef08a,
      emissiveIntensity: 0.9,
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.75,
    });
    return {
      mats: { tireMat, rimMat, darkTrimMat, glassMat, headlightMat, taillightMat },
      headlightMat,
      taillightMat,
    };
  }

  private buildFleet() {
    // 1. Patrol Sedan ("CẢNH SÁT") — Starts cruising Eastbound on the Boulevard
    {
      const { mats, headlightMat, taillightMat } = this.createUnitSharedMats();
      const rig: EmergencyLightRig = { redMats: [], blueMats: [] };
      const wheels: THREE.Object3D[] = [];
      const x = -110;
      const z = 26.75;
      const group = buildPolicePatrolCar({ x, z, ry: Math.PI / 2, variant: 'patrol113' }, mats, rig, wheels);
      group.position.y = getPoliceVehicleGroundY(z);
      this.rootGroup.add(group);
      this.units.push({
        id: 'police_patrol_sedan',
        kind: 'car',
        role: 'patrol113',
        group,
        wheels,
        emergencyRig: rig,
        headlightMat,
        taillightMat,
        halfW: 1.0,
        halfL: 2.38,
        wheelR: 0.35,
        priority: 3,
        x,
        z,
        yaw: Math.PI / 2,
        speed: 9.2,
        cruiseSpeed: 10.2,
        laneZ: z,
        lanesEast: [26.75, 23.25],
        lanesWest: [31.1, 34.75],
        state: 'cruise_east',
        waypoints: [],
        wpIdx: 0,
        parkedX: -206.4,
        parkedZ: 2.0,
        parkedYaw: 0.38,
        turnProgress: 0,
        turnStartX: 0,
        turnStartZ: 0,
        turnTargetZ: 31.1,
        turnCtrlX: 0,
        turnCtrlZ: 0,
        turnEndX: 0,
        turnEndZ: 0,
        turnEndYaw: 0,
        turnNextState: 'cruise_east',
        nsCenterX: FAR_EAST_INTERSECTION_CENTER_X,
        nsDir: 1,
        bdDir: 1,
        routeStep: 0,
        turnCooldown: 3.0,
        lapCounter: 0,
        lapsBeforeStationPitstop: 2,
        bayWaitTimer: 0,
        laneSwitchCooldown: 1.5,
        sirenBurstTimer: 0,
        phaseOffset: 0.0,
      });
    }

    // 2. CSGT Traffic Police Cruiser — Starts cruising Westbound on the East Luxury Boulevard
    {
      const { mats, headlightMat, taillightMat } = this.createUnitSharedMats();
      const rig: EmergencyLightRig = { redMats: [], blueMats: [] };
      const wheels: THREE.Object3D[] = [];
      const x = 428;
      const z = 31.1;
      const group = buildPolicePatrolCar({ x, z, ry: -Math.PI / 2, variant: 'csgt' }, mats, rig, wheels);
      group.position.y = getPoliceVehicleGroundY(z);
      this.rootGroup.add(group);
      this.units.push({
        id: 'police_csgt_cruiser',
        kind: 'car',
        role: 'csgt',
        group,
        wheels,
        emergencyRig: rig,
        headlightMat,
        taillightMat,
        halfW: 1.0,
        halfL: 2.38,
        wheelR: 0.35,
        priority: 3,
        x,
        z,
        yaw: -Math.PI / 2,
        speed: 9.0,
        cruiseSpeed: 9.8,
        laneZ: z,
        lanesEast: [26.75, 23.25],
        lanesWest: [31.1, 34.75],
        state: 'cruise_west',
        waypoints: [],
        wpIdx: 0,
        parkedX: -196.2,
        parkedZ: -2.2,
        parkedYaw: -0.22,
        turnProgress: 0,
        turnStartX: 0,
        turnStartZ: 0,
        turnTargetZ: 26.75,
        turnCtrlX: 0,
        turnCtrlZ: 0,
        turnEndX: 0,
        turnEndZ: 0,
        turnEndYaw: 0,
        turnNextState: 'cruise_west',
        nsCenterX: DIOR_INTERSECTION_CENTER_X,
        nsDir: -1,
        bdDir: -1,
        routeStep: 1,
        turnCooldown: 3.0,
        lapCounter: 0,
        lapsBeforeStationPitstop: 2,
        bayWaitTimer: 0,
        laneSwitchCooldown: 2.0,
        sirenBurstTimer: 0,
        phaseOffset: 1.4,
      });
    }

    // 3. Armored Prisoner Transport Van ("XE BẮT GIAM") — Parked in Carport Bay 2, dispatches 1x/day
    {
      const { mats, headlightMat, taillightMat } = this.createUnitSharedMats();
      const rig: EmergencyLightRig = { redMats: [], blueMats: [] };
      const wheels: THREE.Object3D[] = [];
      const x = -203.15;
      const z = -18.8;
      const group = buildPrisonerTransportVan({ x, z, ry: 0 }, mats, rig, wheels);
      group.position.y = getPoliceVehicleGroundY(z);
      this.rootGroup.add(group);
      this.units.push({
        id: 'police_prisoner_van',
        kind: 'car',
        role: 'prisonerVan',
        group,
        wheels,
        emergencyRig: rig,
        headlightMat,
        taillightMat,
        halfW: 1.2,
        halfL: 3.12,
        wheelR: 0.46,
        priority: 4,
        x,
        z,
        yaw: 0,
        speed: 0,
        cruiseSpeed: 8.6,
        laneZ: 23.25,
        lanesEast: [23.25, 26.75],
        lanesWest: [34.75, 31.1],
        state: 'parked_in_bay',
        waypoints: [],
        wpIdx: 0,
        parkedX: x,
        parkedZ: z,
        parkedYaw: 0,
        turnProgress: 0,
        turnStartX: 0,
        turnStartZ: 0,
        turnTargetZ: 34.75,
        turnCtrlX: 0,
        turnCtrlZ: 0,
        turnEndX: 0,
        turnEndZ: 0,
        turnEndYaw: 0,
        turnNextState: 'cruise_east',
        nsCenterX: FAR_EAST_INTERSECTION_CENTER_X,
        nsDir: 1,
        bdDir: 1,
        routeStep: 0,
        turnCooldown: 3.0,
        lapCounter: 0,
        lapsBeforeStationPitstop: 1,
        bayWaitTimer: 0,
        laneSwitchCooldown: 2.5,
        sirenBurstTimer: 0,
        phaseOffset: 2.2,
      });
    }

    // 4 & 5. Two CSGT Traffic Police Motorcycles — Spread across both East & Central corridors
    const motoConfigs = [
      { id: 'police_csgt_moto_1', x: 245, z: 21.85, yaw: Math.PI / 2, state: 'cruise_east' as const, px: -196.4, pz: -14.6, phase: 0.7, step: 0 },
      { id: 'police_csgt_moto_2', x: 75, z: 36.15, yaw: -Math.PI / 2, state: 'cruise_west' as const, px: -194.2, pz: -14.6, phase: 2.5, step: 2 },
    ];
    motoConfigs.forEach((cfg) => {
      const { mats, headlightMat, taillightMat } = this.createUnitSharedMats();
      const rig: EmergencyLightRig = { redMats: [], blueMats: [] };
      const wheels: THREE.Object3D[] = [];
      const group = buildPoliceTrafficMoto({ x: cfg.x, z: cfg.z, ry: cfg.yaw, withRider: true }, mats, rig, wheels);
      group.position.y = getPoliceVehicleGroundY(cfg.z);
      this.rootGroup.add(group);
      this.units.push({
        id: cfg.id,
        kind: 'motorbike',
        role: 'moto',
        group,
        wheels,
        emergencyRig: rig,
        headlightMat,
        taillightMat,
        halfW: 0.42,
        halfL: 1.02,
        wheelR: 0.30,
        priority: 2,
        x: cfg.x,
        z: cfg.z,
        yaw: cfg.yaw,
        speed: 10.5,
        cruiseSpeed: 11.4,
        laneZ: cfg.z,
        lanesEast: [21.85, 23.65],
        lanesWest: [36.15, 34.35],
        state: cfg.state,
        waypoints: [],
        wpIdx: 0,
        parkedX: cfg.px,
        parkedZ: cfg.pz,
        parkedYaw: 0.15,
        turnProgress: 0,
        turnStartX: 0,
        turnStartZ: 0,
        turnTargetZ: cfg.state === 'cruise_east' ? 36.15 : 21.85,
        turnCtrlX: 0,
        turnCtrlZ: 0,
        turnEndX: 0,
        turnEndZ: 0,
        turnEndYaw: 0,
        turnNextState: cfg.state,
        nsCenterX: FAR_EAST_INTERSECTION_CENTER_X,
        nsDir: 1,
        bdDir: 1,
        routeStep: cfg.step,
        turnCooldown: 3.0,
        lapCounter: 0,
        lapsBeforeStationPitstop: 3,
        bayWaitTimer: 0,
        laneSwitchCooldown: 1.2,
        sirenBurstTimer: 0,
        phaseOffset: cfg.phase,
      });
    });
  }

  private triggerSirenBurst(unit: DynamicPoliceUnit, playerPos?: THREE.Vector3) {
    unit.sirenBurstTimer = 4.6;
    if (this.onPlaySiren) {
      let vol = 0.85;
      if (playerPos) {
        const dist = Math.hypot(unit.x - playerPos.x, unit.z - playerPos.z);
        vol = THREE.MathUtils.clamp(1.0 - dist / 180, 0.40, 1.0);
      }
      this.onPlaySiren(vol);
    }
  }

  private handleDailySchedule(rawHour: number, playerPos?: THREE.Vector3) {
    // Detect new in-game day (clock resets from night/early-morning back to 07:00)
    if (this.lastRawHour >= 0) {
      if (rawHour < this.lastRawHour - 2.0 || (this.lastRawHour < 7.0 && rawHour >= 7.0)) {
        this.daySiren1Fired = false;
        this.daySiren2Fired = false;
        this.prisonerVanDispatchedToday = false;
      }
    }
    this.lastRawHour = rawHour;

    // Siren #1 (~09:45 AM) & Siren #2 (~19:30 PM) -> 2 times per in-game day
    const isActivePatrolState = (st: DynamicPoliceUnit['state']) =>
      st === 'cruise_east' || st === 'cruise_west' || st === 'cruise_ns' || st === 'cruise_bd';
    const patrolCars = this.units.filter((u) => u.role === 'patrol113' || u.role === 'csgt');
    if (!this.daySiren1Fired && rawHour >= 9.75 && rawHour < 13.0) {
      const candidate =
        patrolCars.find((u) => isActivePatrolState(u.state)) ??
        (rawHour >= 10.2 ? patrolCars[0] : undefined);
      if (candidate) {
        this.daySiren1Fired = true;
        this.triggerSirenBurst(candidate, playerPos);
      }
    }
    if (!this.daySiren2Fired && rawHour >= 19.5 && rawHour < 23.0) {
      const candidate =
        patrolCars.find((u) => u.role === 'csgt' && isActivePatrolState(u.state)) ??
        patrolCars.find((u) => isActivePatrolState(u.state)) ??
        (rawHour >= 20.0 ? patrolCars[1] ?? patrolCars[0] : undefined);
      if (candidate) {
        this.daySiren2Fired = true;
        this.triggerSirenBurst(candidate, playerPos);
      }
    }

    // Prisoner Transport Van -> 1 round trip per in-game day (~13:30 PM)
    if (!this.prisonerVanDispatchedToday && rawHour >= 13.5 && rawHour < 18.0) {
      const van = this.units.find((u) => u.role === 'prisonerVan');
      if (van && van.state === 'parked_in_bay') {
        this.prisonerVanDispatchedToday = true;
        van.lapCounter = 0;
        van.state = 'yard_exit_path';
        van.waypoints = [
          { x: -201.5, z: -10.5 },
          { x: -197.5, z: 3.5 },
          { x: -197.5, z: 18.8 },
          { x: -194.0, z: 23.25 },
        ];
        van.wpIdx = 0;
        van.sirenBurstTimer = 3.2;
      }
    }
  }

  public hasVehicleNearGate(): boolean {
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (u.state === 'parked_in_bay') continue;
      if (u.x >= -202.2 && u.x <= -192.5 && u.z >= 9.5 && u.z <= 21.0) {
        return true;
      }
    }
    return false;
  }

  public isBlockedByParkedVehicle(px: number, pz: number, playerRadius: number): boolean {
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      // Only block player inside compound/stopped bays (or very slow yard vehicles)
      if (u.z > 20.5) continue;
      const fwdX = Math.sin(u.yaw);
      const fwdZ = Math.cos(u.yaw);
      const rightX = -fwdZ;
      const rightZ = fwdX;
      const dx = px - u.x;
      const dz = pz - u.z;
      const localZ = dx * fwdX + dz * fwdZ;
      const localX = dx * rightX + dz * rightZ;
      if (
        Math.abs(localX) < u.halfW + playerRadius &&
        Math.abs(localZ) < u.halfL + playerRadius
      ) {
        return true;
      }
    }
    return false;
  }

  private startExitFromBay(u: DynamicPoliceUnit) {
    u.state = 'yard_exit_path';
    u.wpIdx = 0;
    if (u.role === 'moto') {
      u.waypoints = [
        { x: -197.5, z: -6.0 },
        { x: -197.5, z: 18.5 },
        { x: -194.5, z: u.lanesEast[0] },
      ];
    } else {
      u.waypoints = [
        { x: -197.5, z: 7.5 },
        { x: -197.5, z: 18.8 },
        { x: -193.5, z: u.lanesEast[0] },
      ];
    }
  }

  private startReturnToBay(u: DynamicPoliceUnit) {
    u.state = 'yard_return_path';
    u.wpIdx = 0;
    if (u.role === 'prisonerVan') {
      u.waypoints = [
        { x: -197.5, z: 18.0 },
        { x: -197.5, z: 4.0 },
        { x: -201.5, z: -9.5 },
        { x: u.parkedX, z: u.parkedZ },
      ];
    } else if (u.role === 'moto') {
      u.waypoints = [
        { x: -197.5, z: 18.0 },
        { x: -197.5, z: -6.5 },
        { x: u.parkedX, z: u.parkedZ },
      ];
    } else {
      u.waypoints = [
        { x: -197.5, z: 18.0 },
        { x: -197.5, z: 7.5 },
        { x: u.parkedX, z: u.parkedZ },
      ];
    }
  }

  private getSignalForCenterX(centerX: number): BoulevardSignalGetter | undefined {
    if (Math.abs(centerX - WEST_INTERSECTION_CENTER_X) < 5) return this.getIntersectionSignal;
    if (Math.abs(centerX - EAST_INTERSECTION_CENTER_X) < 5) return this.getEastIntersectionSignal;
    if (Math.abs(centerX - FAR_EAST_INTERSECTION_CENTER_X) < 5) return this.getFarEastIntersectionSignal;
    if (Math.abs(centerX - DIOR_INTERSECTION_CENTER_X) < 5) return this.getDiorIntersectionSignal;
    return undefined;
  }

  private beginCurveTurn(
    u: DynamicPoliceUnit,
    ctrlX: number,
    ctrlZ: number,
    endX: number,
    endZ: number,
    endYaw: number,
    nextState: DynamicPoliceUnit['turnNextState'],
    targetLaneZ?: number
  ) {
    u.state = 'turn_curve';
    u.turnProgress = 0;
    u.turnStartX = u.x;
    u.turnStartZ = u.z;
    u.turnCtrlX = ctrlX;
    u.turnCtrlZ = ctrlZ;
    u.turnEndX = endX;
    u.turnEndZ = endZ;
    u.turnEndYaw = endYaw;
    u.turnNextState = nextState;
    if (targetLaneZ !== undefined) u.laneZ = targetLaneZ;
    u.turnCooldown = 4.2;
  }

  private getNsLaneX(u: DynamicPoliceUnit, centerX: number, dirZ: 1 | -1): number {
    const offset = u.kind === 'motorbike' ? 6.1 : 2.1;
    return dirZ > 0 ? centerX - offset : centerX + offset;
  }

  public update(delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) {
    const dt = Math.min(delta, 0.08);
    this.animTime += dt;
    const pedActive = isPedestrianStreetTime(rawHour);

    this.handleDailySchedule(rawHour, playerPos);

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (u.sirenBurstTimer > 0) {
        u.sirenBurstTimer = Math.max(0, u.sirenBurstTimer - dt);
      }
      if (u.turnCooldown > 0) {
        u.turnCooldown = Math.max(0, u.turnCooldown - dt);
      }

      const prevX = u.x;
      const prevZ = u.z;
      let braking = false;

      if (u.state === 'parked_in_bay') {
        u.speed = 0;
        u.yaw = lerpYaw(u.yaw, u.parkedYaw, Math.min(1, dt * 6));
        if (u.role !== 'prisonerVan') {
          u.bayWaitTimer -= dt;
          if (u.bayWaitTimer <= 0) {
            this.startExitFromBay(u);
          }
        }
      } else if (u.state === 'yard_exit_path' || u.state === 'yard_return_path') {
        const wp = u.waypoints[u.wpIdx];
        const dx = wp.x - u.x;
        const dz = wp.z - u.z;
        const dist = Math.hypot(dx, dz);

        const isCrossingRoad = u.z > 19.5 && u.z < 36.5;
        let maxSpeed = isCrossingRoad ? 6.4 : 4.8;
        if (dist > 0.05) {
          const clr = this.coordinator.getForwardClearance({
            id: u.id,
            x: u.x,
            y: getPoliceVehicleGroundY(u.z),
            z: u.z,
            moveDirX: dx / dist,
            moveDirZ: dz / dist,
            halfW: u.halfW,
            halfL: u.halfL,
            lookahead: 8.5,
            minGap: 2.3,
            priority: u.priority,
          });
          if (clr.blocked) {
            maxSpeed = 0;
            braking = true;
          } else {
            maxSpeed *= clr.maxSpeedFactor;
          }
        }

        u.speed = THREE.MathUtils.lerp(u.speed, maxSpeed, Math.min(1, dt * (maxSpeed < u.speed ? 6.5 : 3.2)));

        if (dist <= 0.65) {
          u.x = wp.x;
          u.z = wp.z;
          u.wpIdx++;
          if (u.wpIdx >= u.waypoints.length) {
            if (u.state === 'yard_exit_path') {
              u.state = 'cruise_east';
              u.laneZ = u.lanesEast[0];
              u.turnCooldown = 3.0;
            } else {
              u.state = 'parked_in_bay';
              u.bayWaitTimer = u.role === 'moto' ? 6.5 : 8.5;
              u.lapCounter = 0;
              u.speed = 0;
            }
          }
        } else if (u.speed > 0.01) {
          const step = Math.min(dist, u.speed * dt);
          u.x += (dx / dist) * step;
          u.z += (dz / dist) * step;
          const targetYaw = Math.atan2(dx, dz);
          u.yaw = lerpYaw(u.yaw, targetYaw, Math.min(1, dt * 6.5));
        }
      } else if (u.state === 'cruise_east' || u.state === 'cruise_west') {
        const isEast = u.state === 'cruise_east';
        const dirX = isEast ? 1 : -1;
        const lanes = isEast ? u.lanesEast : u.lanesWest;
        const sirenBoost = u.sirenBurstTimer > 0 ? 1.24 : 1.0;

        u.laneSwitchCooldown = Math.max(0, u.laneSwitchCooldown - dt);
        const wantsStationReturn =
          !isEast && (u.role === 'prisonerVan' || u.lapCounter >= u.lapsBeforeStationPitstop);
        const approachingStationTurn = wantsStationReturn && u.x > -196.0 && u.x < -158.0;
        const nearAnyIntersection =
          Math.abs(u.x - WEST_INTERSECTION_CENTER_X) <= 18.0 ||
          Math.abs(u.x - EAST_INTERSECTION_CENTER_X) <= 18.0 ||
          Math.abs(u.x - FAR_EAST_INTERSECTION_CENTER_X) <= 18.0 ||
          Math.abs(u.x - DIOR_INTERSECTION_CENTER_X) <= 18.0;

        const pick = this.coordinator.pickBestCruiseLane({
          id: u.id,
          x: u.x,
          y: -0.26,
          currentZ: u.z,
          laneZ: u.laneZ,
          moveDirX: dirX,
          lanes,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: u.kind === 'motorbike' ? 12.5 : 16.0,
          minGap: u.kind === 'motorbike' ? 2.6 : 3.5,
          priority: u.priority,
          allowSwitch:
            u.laneSwitchCooldown <= 0 &&
            ((!nearAnyIntersection && u.x > -205 && u.x < 535) || this.coordinator.isJamBypassActive(u.id)),
          preferLane: approachingStationTurn ? u.lanesWest[0] : undefined,
        });
        if (pick.switched) {
          u.laneZ = pick.targetZ;
          u.laneSwitchCooldown = 4.2;
        }

        let targetSpeed = u.cruiseSpeed * sirenBoost;
        if (pick.clearance.blocked) {
          targetSpeed = 0;
          braking = true;
        } else {
          targetSpeed *= pick.clearance.maxSpeedFactor;
        }

        // Obey all 4 intersection signals (West, East, Sơn Tây, Ngã Tư DIOR) + box clearance
        const sigFactor = computeBoulevardSignalFactor({
          x: u.x,
          halfL: u.halfL,
          moveDirX: dirX,
          getWestSignal: this.getIntersectionSignal,
          getEastSignal: this.getEastIntersectionSignal,
          getFarEastSignal: this.getFarEastIntersectionSignal,
          getDiorSignal: this.getDiorIntersectionSignal,
          coordinator: this.coordinator,
          vehicleId: u.id,
          emergencyBypass: u.sirenBurstTimer > 0,
        });
        if (sigFactor < 1.0) {
          targetSpeed = Math.min(targetSpeed, u.cruiseSpeed * sigFactor);
          if (sigFactor < 0.75) braking = true;
        }

        let holdingAtTurn = false;
        let clampMinX = -Infinity;
        let clampMaxX = Infinity;

        // Branching turns onto cross avenues (Sơn Tây 370, Ngã Tư DIOR 503, East 193.5, West -227.5)
        if (u.turnCooldown <= 0 && u.role !== 'prisonerVan') {
          let turnCenterX: number | null = null;
          let turnNsDir: 1 | -1 = 1;
          if (isEast) {
            if (u.x >= 357.0 && u.x <= 363.0 && u.routeStep % 3 === 1) {
              turnCenterX = FAR_EAST_INTERSECTION_CENTER_X;
              turnNsDir = u.routeStep % 2 === 0 ? 1 : -1;
            } else if (u.x >= 490.0 && u.x <= 496.0 && u.routeStep % 2 === 0) {
              turnCenterX = DIOR_INTERSECTION_CENTER_X;
              turnNsDir = u.routeStep % 4 === 0 ? -1 : 1;
            } else if (u.x >= 180.5 && u.x <= 186.5 && u.routeStep % 5 === 2) {
              turnCenterX = EAST_INTERSECTION_CENTER_X;
              turnNsDir = pedActive ? 1 : -1;
            }
          } else if (!wantsStationReturn) {
            if (u.x <= 516.0 && u.x >= 510.0 && u.routeStep % 3 === 0) {
              turnCenterX = DIOR_INTERSECTION_CENTER_X;
              turnNsDir = u.routeStep % 2 === 0 ? -1 : 1;
            } else if (u.x <= 383.0 && u.x >= 377.0 && u.routeStep % 3 === 2) {
              turnCenterX = FAR_EAST_INTERSECTION_CENTER_X;
              turnNsDir = u.routeStep % 2 === 0 ? -1 : 1;
            } else if (u.x <= -214.5 && u.x >= -220.5 && u.routeStep % 4 === 1) {
              turnCenterX = WEST_INTERSECTION_CENTER_X;
              turnNsDir = u.routeStep % 2 === 0 ? 1 : -1;
            }
          }

          if (turnCenterX !== null) {
            const sigGetter = this.getSignalForCenterX(turnCenterX);
            const ewGreen = !sigGetter || u.sirenBurstTimer > 0 || sigGetter().ewPhase === 'green';
            const endX = this.getNsLaneX(u, turnCenterX, turnNsDir);
            const endZ = turnNsDir > 0 ? 41.5 : 16.5;
            const exitClear = this.coordinator.isZoneClear({
              id: u.id,
              x: endX,
              y: -0.26,
              z: turnNsDir > 0 ? 45.0 : 13.0,
              halfX: u.halfW + 1.4,
              halfZ: u.halfL + 4.0,
            });
            if (ewGreen && exitClear) {
              u.routeStep++;
              u.nsCenterX = turnCenterX;
              u.nsDir = turnNsDir;
              this.beginCurveTurn(
                u,
                endX,
                u.z,
                endX,
                endZ,
                turnNsDir > 0 ? 0 : Math.PI,
                'cruise_ns'
              );
            }
          }
        }

        if (u.state === 'cruise_east' && u.x >= 544.0) {
          const canTurn =
            this.coordinator.isJamBypassActive(u.id) ||
            this.coordinator.isZoneClear({
              id: u.id,
              x: 546.5,
              y: -0.26,
              z: u.lanesWest[0],
              halfX: 9.0,
              halfZ: 3.4,
            });
          if (canTurn) {
            u.routeStep++;
            u.state = 'u_turn_east';
            u.turnProgress = 0;
            u.turnStartX = u.x;
            u.turnStartZ = u.z;
            u.turnTargetZ = u.lanesWest[0];
            u.laneZ = u.turnTargetZ;
          } else {
            holdingAtTurn = true;
            clampMaxX = 545.0;
            targetSpeed = 0;
            braking = true;
          }
        } else if (u.state === 'cruise_west' && wantsStationReturn && u.x <= -195.0 && u.x >= -202.0) {
          const ebClear = this.coordinator.isZoneClear({
            id: u.id,
            x: -199.0,
            y: -0.26,
            z: 24.8,
            halfX: 11.5,
            halfZ: 4.0,
          });
          const gateClear = this.coordinator.isZoneClear({
            id: u.id,
            x: -197.5,
            y: 0.0,
            z: 16.5,
            halfX: 2.2,
            halfZ: 3.5,
          });
          if (ebClear && gateClear) {
            this.startReturnToBay(u);
          } else if (u.role === 'prisonerVan' && !this.coordinator.isJamBypassActive(u.id)) {
            holdingAtTurn = true;
            clampMinX = -202.0;
            targetSpeed = 0;
            braking = true;
          }
        } else if (u.state === 'cruise_west' && u.x <= -944.0) {
          const canTurn =
            this.coordinator.isJamBypassActive(u.id) ||
            this.coordinator.isZoneClear({
              id: u.id,
              x: -946.0,
              y: -0.26,
              z: u.lanesEast[0],
              halfX: 9.0,
              halfZ: 3.4,
            });
          if (canTurn) {
            u.lapCounter++;
            u.routeStep++;
            u.state = 'u_turn_west';
            u.turnProgress = 0;
            u.turnStartX = u.x;
            u.turnStartZ = u.z;
            u.turnTargetZ = u.lanesEast[0];
            u.laneZ = u.turnTargetZ;
          } else {
            holdingAtTurn = true;
            clampMinX = -945.0;
            targetSpeed = 0;
            braking = true;
          }
        }

        if (u.state === 'cruise_east' || u.state === 'cruise_west') {
          u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (targetSpeed < u.speed ? 6.5 : 2.8)));
          u.x += dirX * u.speed * dt;
          if (holdingAtTurn) {
            u.x = THREE.MathUtils.clamp(u.x, clampMinX, clampMaxX);
          }
          u.z = THREE.MathUtils.lerp(u.z, u.laneZ, Math.min(1, dt * 3.8));

          const vz = (u.z - prevZ) / Math.max(dt, 0.001);
          const vx = (u.x - prevX) / Math.max(dt, 0.001);
          const targetYaw = Math.hypot(vx, vz) > 0.4 ? Math.atan2(vx, vz) : isEast ? Math.PI / 2 : -Math.PI / 2;
          u.yaw = lerpYaw(u.yaw, targetYaw, Math.min(1, dt * 7.5));
        }
      } else if (u.state === 'cruise_ns') {
        const dirZ = u.nsDir;
        const laneX = this.getNsLaneX(u, u.nsCenterX, dirZ);
        const sirenBoost = u.sirenBurstTimer > 0 ? 1.24 : 1.0;

        // Safety: if Phố Đi Bộ night ban turns on while cruising North on East Avenue, U-turn south immediately
        if (Math.abs(u.nsCenterX - EAST_INTERSECTION_CENTER_X) < 5 && pedActive && dirZ < 0 && u.z > 15.0 && u.z < 20.0) {
          u.nsDir = 1;
        }

        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: 0,
          moveDirZ: dirZ,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: u.kind === 'motorbike' ? 12.0 : 15.0,
          minGap: u.kind === 'motorbike' ? 2.5 : 3.2,
          priority: u.priority,
        });

        let targetSpeed = u.cruiseSpeed * sirenBoost;
        if (clr.blocked) {
          targetSpeed = 0;
          braking = true;
        } else {
          targetSpeed *= clr.maxSpeedFactor;
        }

        const sigFactor = computeNorthSouthSignalFactor({
          z: u.z,
          halfL: u.halfL,
          moveDirZ: dirZ,
          centerX: u.nsCenterX,
          getSignal: this.getSignalForCenterX(u.nsCenterX),
          coordinator: this.coordinator,
          vehicleId: u.id,
          emergencyBypass: u.sirenBurstTimer > 0,
        });
        if (sigFactor < 1.0) {
          targetSpeed = Math.min(targetSpeed, u.cruiseSpeed * sigFactor);
          if (sigFactor < 0.75) braking = true;
        }

        // Approaching Main Boulevard intersection -> turn onto East or West Boulevard!
        if (u.turnCooldown <= 0) {
          const atNorthStop = dirZ > 0 && u.z >= 10.5 && u.z <= 15.5;
          const atSouthStop = dirZ < 0 && u.z >= 41.5 && u.z <= 46.5;
          if ((atNorthStop || atSouthStop) && u.routeStep % 2 === 0) {
            const sigGetter = this.getSignalForCenterX(u.nsCenterX);
            const nsGreen = !sigGetter || u.sirenBurstTimer > 0 || (sigGetter().nsPhase ?? 'green') === 'green';
            const turnEast = u.nsCenterX < 400 ? (u.routeStep % 4 === 0) : false;
            const targetState = turnEast ? 'cruise_east' : 'cruise_west';
            const targetLaneZ = turnEast ? u.lanesEast[0] : u.lanesWest[0];
            const endX = turnEast ? u.nsCenterX + 12.5 : u.nsCenterX - 12.5;
            const exitClear = this.coordinator.isZoneClear({
              id: u.id,
              x: endX + (turnEast ? 3.5 : -3.5),
              y: -0.26,
              z: targetLaneZ,
              halfX: u.halfL + 4.5,
              halfZ: u.halfW + 1.4,
            });
            if (nsGreen && exitClear) {
              u.routeStep++;
              this.beginCurveTurn(
                u,
                u.x,
                targetLaneZ,
                endX,
                targetLaneZ,
                turnEast ? Math.PI / 2 : -Math.PI / 2,
                targetState,
                targetLaneZ
              );
            }
          }
        }

        if (u.state === 'cruise_ns') {
          // Check north/south avenue limits
          let northLimit: number = CITY_ROAD_BOUNDS.westNorthEndZ;
          let southLimit: number = CITY_ROAD_BOUNDS.westSouthEndZ;
          if (Math.abs(u.nsCenterX - EAST_INTERSECTION_CENTER_X) < 5) {
            northLimit = pedActive ? 41.0 : CITY_ROAD_BOUNDS.eastNorthEndZ;
            southLimit = CITY_ROAD_BOUNDS.eastSouthEndZ - 8.0;
          } else if (Math.abs(u.nsCenterX - FAR_EAST_INTERSECTION_CENTER_X) < 5) {
            northLimit = CITY_ROAD_BOUNDS.farEastNorthEndZ;
            southLimit = CITY_ROAD_BOUNDS.farEastSouthEndZ - 8.0;
          } else if (Math.abs(u.nsCenterX - DIOR_INTERSECTION_CENTER_X) < 5) {
            northLimit = CITY_ROAD_BOUNDS.diorNorthEndZ + 8.0;
            southLimit = CITY_ROAD_BOUNDS.diorSouthEndZ - 8.0;
          }

          if (
            (Math.abs(u.nsCenterX - FAR_EAST_INTERSECTION_CENTER_X) < 5 ||
              Math.abs(u.nsCenterX - DIOR_INTERSECTION_CENTER_X) < 5) &&
            dirZ < 0 &&
            u.z <= -104.5
          ) {
            // Smooth curve from Sơn Tây Bắc OR Đại Lộ Paris Bắc (DIOR) onto Đường Bạch Đằng!
            const isDiorNorth = Math.abs(u.nsCenterX - DIOR_INTERSECTION_CENTER_X) < 5;
            const bdDir: 1 | -1 = isDiorNorth ? (u.routeStep % 3 === 0 ? 1 : -1) : (u.routeStep % 2 === 0 ? 1 : -1);
            u.bdDir = bdDir;
            u.routeStep++;
            const endZ = bdDir > 0 ? CITY_ROAD_BOUNDS.bachDangEBZ : CITY_ROAD_BOUNDS.bachDangWBZ;
            const baseCx = isDiorNorth ? DIOR_INTERSECTION_CENTER_X : FAR_EAST_INTERSECTION_CENTER_X;
            const endX = bdDir > 0 ? baseCx + 13.5 : baseCx - 13.5;
            this.beginCurveTurn(
              u,
              u.x,
              endZ,
              endX,
              endZ,
              bdDir > 0 ? Math.PI / 2 : -Math.PI / 2,
              'cruise_bd',
              endZ
            );
          } else if ((dirZ < 0 && u.z <= northLimit) || (dirZ > 0 && u.z >= southLimit)) {
            u.state = 'u_turn_ns';
            u.turnProgress = 0;
            u.turnStartX = u.x;
            u.turnStartZ = u.z;
          } else {
            u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (targetSpeed < u.speed ? 6.5 : 2.8)));
            u.z += dirZ * u.speed * dt;
            u.x = THREE.MathUtils.lerp(u.x, laneX, Math.min(1, dt * 3.8));
            u.yaw = lerpYaw(u.yaw, dirZ > 0 ? 0 : Math.PI, Math.min(1, dt * 7.5));
          }
        }
      } else if (u.state === 'u_turn_ns') {
        const nextDir: 1 | -1 = u.nsDir > 0 ? -1 : 1;
        const targetX = this.getNsLaneX(u, u.nsCenterX, nextDir);
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: Math.sin(u.yaw),
          moveDirZ: Math.cos(u.yaw),
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 8.5,
          minGap: 2.0,
          priority: u.priority,
        });
        const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
        braking = clr.blocked;
        u.turnProgress = Math.min(1, u.turnProgress + dt * 0.55 * factor);
        const p = u.turnProgress;
        const smoothT = 0.5 - 0.5 * Math.cos(p * Math.PI);
        u.x = THREE.MathUtils.lerp(u.turnStartX, targetX, smoothT);
        u.z = u.turnStartZ + u.nsDir * Math.sin(p * Math.PI) * 5.0;
        const vx = (u.x - prevX) / Math.max(dt, 0.001);
        const vz = (u.z - prevZ) / Math.max(dt, 0.001);
        if (Math.hypot(vx, vz) > 0.2) {
          u.yaw = lerpYaw(u.yaw, Math.atan2(vx, vz), Math.min(1, dt * 8.5));
        }
        u.speed = Math.hypot(vx, vz);
        if (p >= 1) {
          u.nsDir = nextDir;
          u.state = 'cruise_ns';
          u.x = targetX;
          u.yaw = nextDir > 0 ? 0 : Math.PI;
          u.turnCooldown = 2.0;
        }
      } else if (u.state === 'cruise_bd') {
        // Patrol along Đường Bạch Đằng (X = 110..526, EB Z = -113.4, WB Z = -121.6)
        const dirX = u.bdDir;
        const targetZ = dirX > 0 ? CITY_ROAD_BOUNDS.bachDangEBZ : CITY_ROAD_BOUNDS.bachDangWBZ;
        const sirenBoost = u.sirenBurstTimer > 0 ? 1.24 : 1.0;

        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: dirX,
          moveDirZ: 0,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 14.0,
          minGap: 2.8,
          priority: u.priority,
        });
        const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
        const targetSpeed = u.cruiseSpeed * sirenBoost * factor;
        braking = clr.blocked || factor < 0.7;

        // Turn back south onto Sơn Tây Bắc OR Đại Lộ Paris Bắc (DIOR) when passing either Ngã 3 Bạch Đằng
        const atSonTayT = (dirX > 0 && u.x >= 354.5 && u.x <= 360.5) || (dirX < 0 && u.x <= 385.5 && u.x >= 379.5);
        const atDiorT = (dirX > 0 && u.x >= 487.5 && u.x <= 493.5) || (dirX < 0 && u.x <= 518.5 && u.x >= 512.5);
        if (u.turnCooldown <= 0 && (atDiorT || (atSonTayT && u.routeStep % 2 === 0))) {
          const turnCenter = atDiorT ? DIOR_INTERSECTION_CENTER_X : FAR_EAST_INTERSECTION_CENTER_X;
          u.nsCenterX = turnCenter;
          u.nsDir = 1;
          u.routeStep++;
          const endX = this.getNsLaneX(u, turnCenter, 1);
          this.beginCurveTurn(
            u,
            endX,
            u.z,
            endX,
            -105.0,
            0,
            'cruise_ns'
          );
        } else if ((dirX > 0 && u.x >= CITY_ROAD_BOUNDS.bachDangEastEndX - 6.0) || (dirX < 0 && u.x <= CITY_ROAD_BOUNDS.bachDangWestEndX + 12.0)) {
          u.state = 'u_turn_bd';
          u.turnProgress = 0;
          u.turnStartX = u.x;
          u.turnStartZ = u.z;
          u.turnTargetZ = dirX > 0 ? CITY_ROAD_BOUNDS.bachDangWBZ : CITY_ROAD_BOUNDS.bachDangEBZ;
        } else {
          u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (targetSpeed < u.speed ? 6.5 : 2.8)));
          u.x += dirX * u.speed * dt;
          u.z = THREE.MathUtils.lerp(u.z, targetZ, Math.min(1, dt * 3.8));
          u.yaw = lerpYaw(u.yaw, dirX > 0 ? Math.PI / 2 : -Math.PI / 2, Math.min(1, dt * 7.5));
        }
      } else if (u.state === 'u_turn_bd') {
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: Math.sin(u.yaw),
          moveDirZ: Math.cos(u.yaw),
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 8.5,
          minGap: 2.0,
          priority: u.priority,
        });
        const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
        braking = clr.blocked;
        u.turnProgress = Math.min(1, u.turnProgress + dt * 0.55 * factor);
        const p = u.turnProgress;
        u.x = u.turnStartX + u.bdDir * Math.sin(p * Math.PI) * 5.0;
        u.z = THREE.MathUtils.lerp(u.turnStartZ, u.turnTargetZ, 0.5 - 0.5 * Math.cos(p * Math.PI));
        const vx = (u.x - prevX) / Math.max(dt, 0.001);
        const vz = (u.z - prevZ) / Math.max(dt, 0.001);
        if (Math.hypot(vx, vz) > 0.2) {
          u.yaw = lerpYaw(u.yaw, Math.atan2(vx, vz), Math.min(1, dt * 8.5));
        }
        u.speed = Math.hypot(vx, vz);
        if (p >= 1) {
          u.bdDir = u.bdDir > 0 ? -1 : 1;
          u.state = 'cruise_bd';
          u.yaw = u.bdDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          u.turnCooldown = 2.0;
        }
      } else if (u.state === 'turn_curve') {
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: Math.sin(u.yaw),
          moveDirZ: Math.cos(u.yaw),
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 8.5,
          minGap: 2.0,
          priority: u.priority + 5,
        });
        const factor = clr.blocked ? 0 : Math.max(0.35, clr.maxSpeedFactor);
        braking = clr.blocked || factor < 0.6;
        u.turnProgress = Math.min(1, u.turnProgress + dt * 0.72 * factor);
        const t = u.turnProgress;
        const inv = 1 - t;
        u.x = inv * inv * u.turnStartX + 2 * inv * t * u.turnCtrlX + t * t * u.turnEndX;
        u.z = inv * inv * u.turnStartZ + 2 * inv * t * u.turnCtrlZ + t * t * u.turnEndZ;
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.002) {
          u.yaw = lerpYaw(u.yaw, Math.atan2(dx, dz), Math.min(1, dt * 9.5));
        }
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (t >= 1) {
          u.x = u.turnEndX;
          u.z = u.turnEndZ;
          u.yaw = u.turnEndYaw;
          u.state = u.turnNextState;
        }
      } else if (u.state === 'u_turn_east' || u.state === 'u_turn_west') {
        const isEastEnd = u.state === 'u_turn_east';
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: Math.sin(u.yaw),
          moveDirZ: Math.cos(u.yaw),
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 10.0,
          minGap: 2.5,
          priority: u.priority,
        });
        const turnSpeedFactor = clr.blocked ? 0 : clr.maxSpeedFactor;
        braking = clr.blocked;

        u.turnProgress = Math.min(1, u.turnProgress + dt * 0.46 * turnSpeedFactor);
        const p = u.turnProgress;
        const arcOffset = Math.sin(p * Math.PI) * 5.0;
        u.x = isEastEnd ? u.turnStartX + arcOffset : u.turnStartX - arcOffset;
        const smoothT = 0.5 - 0.5 * Math.cos(p * Math.PI);
        u.z = THREE.MathUtils.lerp(u.turnStartZ, u.turnTargetZ, smoothT);

        const vx = (u.x - prevX) / Math.max(dt, 0.001);
        const vz = (u.z - prevZ) / Math.max(dt, 0.001);
        if (Math.hypot(vx, vz) > 0.25) {
          u.yaw = lerpYaw(u.yaw, Math.atan2(vx, vz), Math.min(1, dt * 8.5));
        }
        u.speed = Math.hypot(vx, vz);

        if (p >= 1) {
          u.state = isEastEnd ? 'cruise_west' : 'cruise_east';
          u.yaw = isEastEnd ? -Math.PI / 2 : Math.PI / 2;
        }
      }

      // Apply transform & wheel rotation
      const groundY = getPoliceVehicleGroundY(u.z);
      u.group.position.set(u.x, groundY, u.z);
      u.group.rotation.y = u.yaw;

      const distMoved = Math.hypot(u.x - prevX, u.z - prevZ);
      const wheelSpin = distMoved / Math.max(0.15, u.wheelR);
      for (let w = 0; w < u.wheels.length; w++) {
        u.wheels[w].rotation.x += wheelSpin;
      }

      // Lightbars, headlights & brake lights
      const activePatrol = u.state !== 'parked_in_bay';
      const sirenActive = u.sirenBurstTimer > 0;
      const pulseSpeed = sirenActive ? 22.0 : 9.5;
      const pulse = Math.sin(this.animTime * pulseSpeed + u.phaseOffset);
      const peakIntensity = sirenActive ? 2.6 : activePatrol ? 1.85 : 0.45;
      const offIntensity = activePatrol ? 0.15 : 0.08;

      const redInt = pulse > 0 ? peakIntensity : offIntensity;
      const blueInt = pulse <= 0 ? peakIntensity : offIntensity;
      for (let m = 0; m < u.emergencyRig.redMats.length; m++) {
        u.emergencyRig.redMats[m].emissiveIntensity = redInt;
      }
      for (let m = 0; m < u.emergencyRig.blueMats.length; m++) {
        u.emergencyRig.blueMats[m].emissiveIntensity = blueInt;
      }

      u.headlightMat.emissiveIntensity = activePatrol ? 0.85 + lampFactor * 0.9 : 0.15;
      u.taillightMat.emissiveIntensity = braking ? 1.9 : activePatrol ? 0.65 + lampFactor * 0.5 : 0.2;

      // Register in shared CityTrafficCoordinator so buses, taxis & cars yield smoothly
      this.coordinator.updateVehicle({
        id: u.id,
        kind: u.kind,
        x: u.x,
        y: groundY,
        z: u.z,
        fwdX: Math.sin(u.yaw),
        fwdZ: Math.cos(u.yaw),
        halfW: u.halfW,
        halfL: u.halfL,
        speed: u.speed,
        isStoppedOrParked: u.state === 'parked_in_bay',
        priority: u.priority,
        active: true,
      });
    }
  }
}

// ==========================================
// POLICE STATION NPC CONTROLLER (5 OFFICERS 24/7)
// ==========================================

interface PoliceRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  glbHandle: GlbHumanHandle;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

interface CitizenVisitorActor {
  rig: PoliceRig;
  enterWaypoints: THREE.Vector3[];
  exitWaypoints: THREE.Vector3[];
  state: 'idle_outside' | 'entering' | 'at_counter' | 'exiting';
  wpIdx: number;
  waitTimer: number;
  walkPhase: number;
  speed: number;
}

export class PoliceStationNpcController {
  public readonly rootGroup = new THREE.Group();

  private staticOfficers: Array<{
    rig: PoliceRig;
    baseYaw: number;
    phase: number;
  }> = [];

  private patrolOfficers: Array<{
    rig: PoliceRig;
    waypoints: THREE.Vector3[];
    wpIdx: number;
    pauseTimer: number;
    walkPhase: number;
    speed: number;
  }> = [];

  private visitors: CitizenVisitorActor[] = [];

  private animTime = 0;

  constructor(helpers: PoliceStationCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;
    this.buildOfficers(helpers);
    this.buildCitizenVisitors(helpers);
  }

  private buildOfficerRig(
    shirtHex: number,
    pantsHex: number,
    capHex: number | null,
    skinHex: string,
    helpers: PoliceStationCharacterHelpers,
    isCivilian = false
  ): PoliceRig {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.62 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.68 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.7 });

    const hipsGroup = new THREE.Group();
    hipsGroup.position.y = 0.84;
    group.add(hipsGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.56, 0.24), shirtMat);
    torso.position.y = 0.30;
    hipsGroup.add(torso);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.26), beltMat);
    belt.position.y = 0.05;
    hipsGroup.add(belt);

    if (!isCivilian) {
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), badgeMat);
      badge.position.set(0.11, 0.38, 0.13);
      hipsGroup.add(badge);
    } else {
      // Civilian folder / document envelope held at side
      const folder = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.24, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65 })
      );
      folder.position.set(-0.27, 0.14, 0.06);
      hipsGroup.add(folder);
    }

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.62, 0);
    const faceTex = helpers.createFaceTexture(isCivilian ? 'happy' : 'neutral', skinHex);
    const headMesh = helpers.createHeadMesh(skinMat, faceTex, 0.25, 0.26, 0.24);
    headMesh.position.y = 0.14;
    headGroup.add(headMesh);

    if (capHex !== null) {
      const capCrown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.14, 0.10, 12),
        new THREE.MeshStandardMaterial({ color: capHex, roughness: 0.55 })
      );
      capCrown.position.set(0, 0.28, 0);
      headGroup.add(capCrown);
      const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.16), bootMat);
      capBrim.position.set(0, 0.24, 0.12);
      headGroup.add(capBrim);
      const capStar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), badgeMat);
      capStar.position.set(0, 0.29, 0.15);
      headGroup.add(capStar);
    } else {
      const hair = new THREE.Mesh(
        new THREE.BoxGeometry(0.27, 0.10, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.8 })
      );
      hair.position.set(0, 0.28, -0.01);
      headGroup.add(hair);
    }

    hipsGroup.add(headGroup);

    const buildArm = (ax: number) => {
      const p = new THREE.Group();
      p.position.set(ax, 0.52, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.11), shirtMat);
      sleeve.position.y = -0.11;
      p.add(sleeve);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.24, 0.095), skinMat);
      arm.position.y = -0.34;
      p.add(arm);
      hipsGroup.add(p);
      return p;
    };
    const leftArm = buildArm(-0.27);
    const rightArm = buildArm(0.27);

    const buildLeg = (lx: number) => {
      const hip = new THREE.Group();
      hip.position.set(lx, 0, 0);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.74, 0.14), pantsMat);
      leg.position.y = -0.37;
      hip.add(leg);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.22), bootMat);
      boot.position.set(0, -0.79, 0.03);
      hip.add(boot);
      hipsGroup.add(hip);
      return hip;
    };
    const leftLeg = buildLeg(-0.10);
    const rightLeg = buildLeg(0.10);

    const spec = isCivilian ? pickStationaryCivilianModel(shirtHex + pantsHex) : GUARD_NPC_MODEL;
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      hostGroup: group,
      fallbackMeshes: [hipsGroup],
      initialState: 'Idle',
      palette: {
        shirt: isCivilian ? shirtHex : 0x38bdf8,
        pants: pantsHex,
        skin: Number.parseInt(skinHex.replace('#', ''), 16) || 0xf5c7a3,
        accent: capHex ?? (isCivilian ? shirtHex : 0xfacc15),
        ...(isCivilian ? {} : { suit: shirtHex }),
      },
    });

    return { group, hipsGroup, glbHandle, headGroup, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildOfficers(helpers: PoliceStationCharacterHelpers) {
    // 1. Duty Officer behind Reception Counter
    const duty = this.buildOfficerRig(0x166534, 0x14532d, 0x14532d, '#f5c7a3', helpers);
    duty.group.position.set(-182.5, 0.08, 0.8);
    duty.group.rotation.y = 0;
    this.rootGroup.add(duty.group);
    this.staticOfficers.push({ rig: duty, baseYaw: 0, phase: 0.4 });

    // 2. Forensics & Command Room Researcher (inspecting Tactical Map Table)
    const researcher = this.buildOfficerRig(0xf8fafc, 0x1e293b, 0x0f2547, '#fbd3b4', helpers);
    researcher.group.position.set(-179.4, 0.08, -6.0);
    researcher.group.rotation.y = -Math.PI / 2;
    this.rootGroup.add(researcher.group);
    this.staticOfficers.push({ rig: researcher, baseYaw: -Math.PI / 2, phase: 1.7 });

    // 3. Gate Security Guard beside Boom Barrier
    const gateGuard = this.buildOfficerRig(0x0f2547, 0x0f172a, 0x0f2547, '#e8be9e', helpers);
    gateGuard.group.position.set(-193.6, 0.04, 14.5);
    gateGuard.group.rotation.y = -0.3;
    this.rootGroup.add(gateGuard.group);
    this.staticOfficers.push({ rig: gateGuard, baseYaw: -0.3, phase: 2.9 });

    // 4. CSGT Traffic Officer inspecting Carport & Moto Bays
    const csgtOfficer = this.buildOfficerRig(0xca8a04, 0xa16207, 0xf8fafc, '#f6c8a8', helpers);
    csgtOfficer.group.position.set(-198.2, 0.04, -5.0);
    this.rootGroup.add(csgtOfficer.group);
    this.patrolOfficers.push({
      rig: csgtOfficer,
      waypoints: [
        new THREE.Vector3(-198.2, 0.04, -5.0),
        new THREE.Vector3(-198.2, 0.04, -12.5),
        new THREE.Vector3(-193.5, 0.04, -12.5),
        new THREE.Vector3(-193.5, 0.04, 2.5),
        new THREE.Vector3(-198.5, 0.04, 5.5),
      ],
      wpIdx: 1,
      pauseTimer: 0.5,
      walkPhase: 0,
      speed: 1.35,
    });

    // 5. Patrol Officer patrolling Forecourt & Vehicle Yard
    const patrol113 = this.buildOfficerRig(0x166534, 0x14532d, 0x14532d, '#fbd3b4', helpers);
    patrol113.group.position.set(-182.5, 0.04, 12.2);
    this.rootGroup.add(patrol113.group);
    this.patrolOfficers.push({
      rig: patrol113,
      waypoints: [
        new THREE.Vector3(-182.5, 0.04, 12.2),
        new THREE.Vector3(-182.5, 0.04, 17.5),
        new THREE.Vector3(-197.5, 0.04, 17.5),
        new THREE.Vector3(-197.5, 0.04, 9.5),
        new THREE.Vector3(-202.0, 0.04, 5.5),
        new THREE.Vector3(-197.5, 0.04, 9.5),
        new THREE.Vector3(-197.5, 0.04, 17.5),
        new THREE.Vector3(-182.5, 0.04, 17.5),
      ],
      wpIdx: 1,
      pauseTimer: 0.8,
      walkPhase: 1.5,
      speed: 1.45,
    });
  }

  private buildCitizenVisitors(helpers: PoliceStationCharacterHelpers) {
    const visitorConfigs = [
      {
        shirt: 0x0284c7,
        pants: 0x1e293b,
        skin: '#f5c7a3',
        sideX: -172.0,
        deskX: -183.6,
        deskZ: 2.85,
        initState: 'entering' as const,
        startPos: new THREE.Vector3(-182.5, 0.04, 13.5),
        startWp: 2,
        delay: 0.5,
        speed: 1.38,
      },
      {
        shirt: 0xe11d48,
        pants: 0x334155,
        skin: '#fbd3b4',
        sideX: -187.5,
        deskX: -181.2,
        deskZ: 2.85,
        initState: 'at_counter' as const,
        startPos: new THREE.Vector3(-181.2, 0.08, 2.85),
        startWp: 0,
        delay: 3.5,
        speed: 1.30,
      },
      {
        shirt: 0xd97706,
        pants: 0x0f172a,
        skin: '#e8be9e',
        sideX: -171.0,
        deskX: -177.2,
        deskZ: 5.2,
        initState: 'idle_outside' as const,
        startPos: new THREE.Vector3(-171.0, 0.04, 18.2),
        startWp: 0,
        delay: 2.0,
        speed: 1.35,
      },
      {
        shirt: 0x059669,
        pants: 0x1e293b,
        skin: '#f6c8a8',
        sideX: -188.0,
        deskX: -186.0,
        deskZ: -1.8,
        initState: 'entering' as const,
        startPos: new THREE.Vector3(-182.5, 0.08, 6.2),
        startWp: 3,
        delay: 1.0,
        speed: 1.42,
      },
      {
        shirt: 0x7c3aed,
        pants: 0x1f2937,
        skin: '#fbd3b4',
        sideX: -173.0,
        deskX: -182.4,
        deskZ: 3.1,
        initState: 'exiting' as const,
        startPos: new THREE.Vector3(-182.4, 0.08, 5.4),
        startWp: 1,
        delay: 0.0,
        speed: 1.36,
      },
    ];

    visitorConfigs.forEach((cfg, idx) => {
      const rig = this.buildOfficerRig(cfg.shirt, cfg.pants, null, cfg.skin, helpers, true);
      rig.group.position.copy(cfg.startPos);
      this.rootGroup.add(rig.group);

      const enterWaypoints = [
        new THREE.Vector3(-182.5, 0.04, 18.0),
        new THREE.Vector3(-182.5, 0.04, 14.5),
        new THREE.Vector3(-182.5, 0.08, 8.5),
        cfg.deskZ < 0
          ? new THREE.Vector3(-185.8, 0.08, 3.8)
          : new THREE.Vector3(cfg.deskX, 0.08, cfg.deskZ),
      ];
      if (cfg.deskZ < 0) {
        enterWaypoints.push(new THREE.Vector3(cfg.deskX, 0.08, cfg.deskZ));
      }

      const exitWaypoints = [
        ...(cfg.deskZ < 0 ? [new THREE.Vector3(-185.8, 0.08, 3.8)] : []),
        new THREE.Vector3(-182.5, 0.08, 6.2),
        new THREE.Vector3(-182.5, 0.08, 9.2),
        new THREE.Vector3(-182.5, 0.04, 15.2),
        new THREE.Vector3(-182.5, 0.04, 18.2),
        new THREE.Vector3(cfg.sideX, 0.04, 18.2),
      ];

      this.visitors.push({
        rig,
        enterWaypoints,
        exitWaypoints,
        state: cfg.initState,
        wpIdx: Math.min(cfg.startWp, enterWaypoints.length - 1),
        waitTimer: cfg.initState === 'at_counter' ? 3.5 + idx * 0.6 : cfg.delay,
        walkPhase: idx * 1.1,
        speed: cfg.speed,
      });
    });
  }

  public hasOfficerNearGate(): boolean {
    for (const p of this.patrolOfficers) {
      const pos = p.rig.group.position;
      if (pos.x >= -201.8 && pos.x <= -193.2 && pos.z >= 12.5 && pos.z <= 18.2) {
        return true;
      }
    }
    return false;
  }

  public hasOfficerNearLobbyDoor(): boolean {
    for (const p of this.patrolOfficers) {
      const pos = p.rig.group.position;
      if (pos.x >= -185.2 && pos.x <= -179.8 && pos.z >= 6.5 && pos.z <= 10.5) {
        return true;
      }
    }
    for (const v of this.visitors) {
      if (!v.rig.group.visible) continue;
      const pos = v.rig.group.position;
      if (pos.x >= -185.5 && pos.x <= -179.5 && pos.z >= 6.0 && pos.z <= 11.4) {
        return true;
      }
    }
    return false;
  }

  public areVisitorsCleared(): boolean {
    for (const v of this.visitors) {
      if (v.rig.group.visible) return false;
    }
    return true;
  }

  private stepActorToward(
    rig: PoliceRig,
    target: THREE.Vector3,
    speed: number,
    dt: number,
    walkPhaseRef: { phase: number }
  ): boolean {
    const pos = rig.group.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.16) {
      pos.copy(target);
      return true;
    }

    const step = Math.min(dist, speed * dt);
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;
    pos.y = target.y;

    const yaw = Math.atan2(dx, dz);
    let diff = yaw - rig.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    rig.group.rotation.y += diff * Math.min(1, dt * 8.5);

    walkPhaseRef.phase += dt * 7.2;
    const swing = Math.sin(walkPhaseRef.phase) * 0.44;
    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
    rig.leftArm.rotation.x = -swing * 0.55;
    rig.rightArm.rotation.x = swing * 0.55;
    return false;
  }

  public update(delta: number, rawHour: number = 10.0) {
    const dt = Math.min(delta, 0.1);
    this.animTime += dt;
    const t = this.animTime;
    const smooth = Math.min(1, dt * 10);

    // 1. Static & Patrol Police Officers (24/7)
    for (const st of this.staticOfficers) {
      st.rig.glbHandle.setAnimState('Idle', 1.0);
      if (st.rig.hipsGroup.visible) {
        st.rig.headGroup.rotation.y = Math.sin(t * 0.9 + st.phase) * 0.25;
        st.rig.rightArm.rotation.x = -0.22 + Math.sin(t * 2.0 + st.phase) * 0.10;
      }
    }

    for (let i = 0; i < this.patrolOfficers.length; i++) {
      const po = this.patrolOfficers[i];
      if (po.pauseTimer > 0) {
        po.pauseTimer -= dt;
        po.rig.glbHandle.setAnimState('Idle', 1.0);
        if (po.rig.hipsGroup.visible) {
          po.rig.leftLeg.rotation.x = THREE.MathUtils.lerp(po.rig.leftLeg.rotation.x, 0, smooth);
          po.rig.rightLeg.rotation.x = THREE.MathUtils.lerp(po.rig.rightLeg.rotation.x, 0, smooth);
          po.rig.leftArm.rotation.x = THREE.MathUtils.lerp(po.rig.leftArm.rotation.x, 0, smooth);
          po.rig.rightArm.rotation.x = THREE.MathUtils.lerp(po.rig.rightArm.rotation.x, 0, smooth);
          po.rig.headGroup.rotation.y = Math.sin(t * 1.2 + i) * 0.28;
        }
        continue;
      }

      po.rig.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(po.speed / 1.35, 0.8, 1.4));
      const target = po.waypoints[po.wpIdx];
      const phaseWrap = { phase: po.walkPhase };
      const reached = this.stepActorToward(po.rig, target, po.speed, dt, phaseWrap);
      po.walkPhase = phaseWrap.phase;
      if (reached) {
        po.pauseTimer = 1.6 + (i % 2) * 1.0;
        po.wpIdx = (po.wpIdx + 1) % po.waypoints.length;
      }
    }

    // 2. Citizen Visitor NPCs (07:00 .. 21:00; clear completely at/after 21:00 "tới 9h là không còn nữa")
    const isVisitingHours = rawHour >= 7.0 && rawHour < 21.0;

    for (let i = 0; i < this.visitors.length; i++) {
      const v = this.visitors[i];

      if (!isVisitingHours) {
        // Evacuate anyone still inside or in forecourt, then hide outside
        if (v.state === 'idle_outside') {
          v.rig.group.visible = false;
          v.rig.glbHandle.setVisible(false);
          continue;
        }
        if (v.state === 'entering' || v.state === 'at_counter') {
          v.state = 'exiting';
          // Choose nearest sensible exit waypoint based on current Z so NPC never walks backward into walls
          const zNow = v.rig.group.position.z;
          let startExit = 0;
          for (let w = 0; w < v.exitWaypoints.length; w++) {
            if (v.exitWaypoints[w].z >= zNow - 0.5) {
              startExit = w;
              break;
            }
          }
          v.wpIdx = startExit;
        }
      }

      if (v.state === 'idle_outside') {
        v.rig.group.visible = false;
        v.rig.glbHandle.setVisible(false);
        if (isVisitingHours) {
          v.waitTimer -= dt;
          if (v.waitTimer <= 0) {
            const spawnPos = v.exitWaypoints[v.exitWaypoints.length - 1];
            v.rig.group.position.copy(spawnPos);
            v.rig.group.visible = true;
            v.rig.glbHandle.setVisible(true);
            v.state = 'entering';
            v.wpIdx = 0;
          }
        }
        continue;
      }

      v.rig.group.visible = true;
      v.rig.glbHandle.setVisible(true);

      if (v.state === 'entering') {
        v.rig.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(v.speed / 1.35, 0.8, 1.4));
        const target = v.enterWaypoints[v.wpIdx];
        const phaseWrap = { phase: v.walkPhase };
        if (this.stepActorToward(v.rig, target, v.speed, dt, phaseWrap)) {
          v.wpIdx++;
          if (v.wpIdx >= v.enterWaypoints.length) {
            v.state = 'at_counter';
            v.waitTimer = 4.0 + (i % 3) * 1.4;
          }
        }
        v.walkPhase = phaseWrap.phase;
      } else if (v.state === 'at_counter') {
        v.waitTimer -= dt;
        v.rig.glbHandle.setAnimState('Idle', 1.0);
        if (v.rig.hipsGroup.visible) {
          v.rig.leftLeg.rotation.x = THREE.MathUtils.lerp(v.rig.leftLeg.rotation.x, 0, smooth);
          v.rig.rightLeg.rotation.x = THREE.MathUtils.lerp(v.rig.rightLeg.rotation.x, 0, smooth);
          v.rig.leftArm.rotation.x = THREE.MathUtils.lerp(v.rig.leftArm.rotation.x, 0, smooth);
          v.rig.rightArm.rotation.x = -0.30 + Math.sin(t * 2.4 + i) * 0.14;
          v.rig.headGroup.rotation.y = Math.sin(t * 1.1 + i) * 0.22;
        }
        if (v.waitTimer <= 0) {
          v.state = 'exiting';
          v.wpIdx = 0;
        }
      } else if (v.state === 'exiting') {
        v.rig.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(v.speed / 1.35, 0.8, 1.4));
        const target = v.exitWaypoints[v.wpIdx];
        const phaseWrap = { phase: v.walkPhase };
        if (this.stepActorToward(v.rig, target, v.speed, dt, phaseWrap)) {
          v.wpIdx++;
          if (v.wpIdx >= v.exitWaypoints.length) {
            v.state = 'idle_outside';
            v.rig.group.visible = false;
            v.rig.glbHandle.setVisible(false);
            v.waitTimer = 2.0 + (i % 4) * 1.6;
          }
        }
        v.walkPhase = phaseWrap.phase;
      }
    }
  }
}
