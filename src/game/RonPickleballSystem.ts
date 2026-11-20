import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  ADULT_NPC_MODELS,
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import {
  createRollingShutterDoor,
  createRollingShutterTexture,
  RollingShutterHandle,
  setShutterProgress,
  isRonPickleballOpenAtHour,
  advanceNpcExitPath,
} from './VenueOperatingHours';

export interface RonPickleballCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface RonPickleballBuildResult {
  staticGroup: THREE.Group;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; nightIntensity: number; dayIntensity: number }>;
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    npcController?: RonPickleballNpcController | null,
    isPlayerNearGate?: boolean
  ) => void;
  getClosedFactor: () => number;
  getGateOpenAmount: () => number;
}

// ==========================================
// CANVAS TEXTURE GENERATORS
// ==========================================

function createCorrugatedMetalRoofTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 512, 512);

  const ribPitch = 16;
  for (let x = 0; x < 512; x += ribPitch) {
    const grad = ctx.createLinearGradient(x, 0, x + ribPitch, 0);
    grad.addColorStop(0.0, '#1e293b');
    grad.addColorStop(0.22, '#64748b');
    grad.addColorStop(0.45, '#94a3b8');
    grad.addColorStop(0.62, '#475569');
    grad.addColorStop(0.85, '#334155');
    grad.addColorStop(1.0, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, ribPitch, 512);
  }

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.lineWidth = 2;
  for (let y = 128; y < 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createShowroomTileFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#dce3ec';
  ctx.fillRect(0, 0, 512, 512);

  const step = 128;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      const shade = ((x / step + y / step) % 2 === 0) ? '#e2e8f0' : '#d5dde7';
      ctx.fillStyle = shade;
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPerforatedPickleballTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#bef264';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle plastic highlight band
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.5, 'rgba(132,204,22,0.0)');
  g.addColorStop(1, 'rgba(20,83,45,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // Authentic staggered circular pickleball holes
  ctx.fillStyle = '#1e293b';
  for (let row = 0; row < 6; row++) {
    const py = 24 + row * 41;
    const xOff = (row % 2) * 28;
    for (let col = 0; col < 10; col++) {
      const px = 22 + col * 52 + xOff;
      ctx.beginPath();
      ctx.arc(px % 512, py, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFenceMeshTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(203, 213, 225, 0.72)';
  ctx.lineWidth = 3;
  for (let i = -128; i < 256; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + 128, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createNetMeshTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 64);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 128; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 64);
    ctx.stroke();
  }
  for (let y = 0; y <= 64; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Aspect-matched banner generator (no horizontal or vertical font distortion).
 */
function createRonPickleballSignTex(
  title: string,
  subtitle: string,
  badgeText: string,
  widthPx = 2048,
  heightPx = 224,
  accentHex = '#84cc16'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = widthPx;
  c.height = heightPx;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, widthPx, heightPx);
  bg.addColorStop(0, '#050b16');
  bg.addColorStop(0.5, '#0b182e');
  bg.addColorStop(1, '#050b16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Clean diagonal sport stripes on left & right wings
  ctx.fillStyle = 'rgba(132, 204, 22, 0.14)';
  for (let i = 0; i < 5; i++) {
    const sx = 40 + i * 38;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + 20, 0);
    ctx.lineTo(sx - 44, heightPx);
    ctx.lineTo(sx - 64, heightPx);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = Math.max(5, Math.round(heightPx * 0.032));
  ctx.strokeRect(8, 8, widthPx - 16, heightPx - 16);

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, widthPx - 32, heightPx - 32);

  // Left Emblem sized proportionally to height
  const embSize = heightPx * 0.28;
  ctx.save();
  ctx.translate(embSize * 2.2, heightPx * 0.5);
  ctx.rotate(-0.32);
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.roundRect(-embSize * 0.65, -embSize * 0.95, embSize * 1.3, embSize * 1.45, embSize * 0.35);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-embSize * 0.16, embSize * 0.45, embSize * 0.32, embSize * 0.65);
  ctx.restore();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(embSize * 3.15, heightPx * 0.36, embSize * 0.32, 0, Math.PI * 2);
  ctx.fill();

  const textCenterX = widthPx * 0.54;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(heightPx * 0.39)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(title, textCenterX, heightPx * 0.45);

  ctx.fillStyle = accentHex;
  ctx.font = `800 ${Math.round(heightPx * 0.145)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(subtitle, textCenterX, heightPx * 0.69);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `700 ${Math.round(heightPx * 0.115)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(badgeText, textCenterX, heightPx * 0.87);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPylonPortraitTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 960;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 960);
  bg.addColorStop(0, '#071121');
  bg.addColorStop(0.5, '#0e1d36');
  bg.addColorStop(1, '#071121');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 960);

  ctx.strokeStyle = '#84cc16';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 484, 932);

  // Emblem Top
  ctx.save();
  ctx.translate(256, 165);
  ctx.rotate(-0.28);
  ctx.fillStyle = '#84cc16';
  ctx.beginPath();
  ctx.roundRect(-55, -80, 110, 125, 28);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-13, 42, 26, 56);
  ctx.restore();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(335, 115, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 72px system-ui, sans-serif';
  ctx.fillText('RON', 256, 355);
  ctx.fillStyle = '#84cc16';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillText('PICKLEBALL', 256, 425);

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(64, 468, 384, 5);

  const items = [
    ['6 SÂN MÁI TÔN', '#ffffff'],
    ['SÂN ACRYLIC PRO', '#a3e635'],
    ['PRO-SHOP VỢT CARBON', '#ffffff'],
    ['KHU LOCKER VĐV', '#38bdf8'],
    ['MỞ CỬA 07:00 - 22:00', '#facc15'],
  ];
  items.forEach(([txt, col], idx) => {
    ctx.fillStyle = col;
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText(txt, 256, 545 + idx * 74);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCourtNumberTex(numLabel: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#84cc16';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 244, 116);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a3e635';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('RON ARENA', 128, 40);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 56px system-ui, sans-serif';
  ctx.fillText(numLabel, 128, 102);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWindscreenBannerTex(courtLabel: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0c2340';
  ctx.fillRect(0, 0, 1024, 192);

  ctx.strokeStyle = '#84cc16';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 1012, 180);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#84cc16';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillText(`RON PICKLEBALL CLUB  •  ${courtLabel}`, 512, 96);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText('TOURNAMENT CUSHION ACRYLIC SURFACE  •  OFFICIAL PRO COURT', 512, 148);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLockerBankTex(startNo: number, count: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  const cols = count;
  const rows = 2;
  const pad = 10;
  const cellW = (512 - pad * (cols + 1)) / cols;
  const cellH = (512 - pad * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lx = pad + col * (cellW + pad);
      const ly = pad + r * (cellH + pad);
      const lockerNo = String(startNo + r * cols + col).padStart(2, '0');

      ctx.fillStyle = '#334155';
      ctx.fillRect(lx, ly, cellW, cellH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.strokeRect(lx, ly, cellW, cellH);

      // Ventilation louvers top & bottom
      ctx.fillStyle = '#0f172a';
      for (let v = 0; v < 4; v++) {
        ctx.fillRect(lx + 16, ly + 18 + v * 9, cellW - 32, 4);
      }

      // Lime number tag
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(lx + cellW / 2 - 22, ly + 64, 44, 28);
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = '900 20px system-ui, sans-serif';
      ctx.fillText(lockerNo, lx + cellW / 2, ly + 85);

      // Smart Keypad / Handle
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(lx + cellW - 26, ly + cellH / 2 - 14, 12, 28);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCourtBookingScreenTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#09111f';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = '#84cc16';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 1004, 492);

  ctx.fillStyle = '#84cc16';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.fillText('RON PICKLEBALL • HỆ THỐNG ĐIỀU PHỐI 6 SÂN & LOCKER', 36, 56);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 21px system-ui, sans-serif';
  ctx.fillText('MÁI TÔN SÂN CHỐNG NÓNG  •  TỦ LOCKER MIỄN PHÍ 01–24  •  THUÊ & TEST VỢT T700', 36, 92);

  const courts = [
    { id: 'SÂN 01', status: 'ĐANG THI ĐẤU (ĐÔI NAM)', color: '#f97316', slot: '19:00 - 21:00' },
    { id: 'SÂN 02', status: 'ĐANG THI ĐẤU (ĐƠN)', color: '#f97316', slot: '19:30 - 21:30' },
    { id: 'SÂN 03', status: 'SẴN SÀNG ĐẶT SÂN', color: '#84cc16', slot: 'TRỐNG NGAY' },
    { id: 'SÂN 04', status: 'ĐANG THI ĐẤU (CLB)', color: '#f97316', slot: '18:30 - 20:30' },
    { id: 'SÂN 05', status: 'ĐANG THI ĐẤU (TẬP LUYỆN)', color: '#f97316', slot: '19:00 - 21:00' },
    { id: 'SÂN 06', status: 'SẴN SÀNG ĐẶT SÂN', color: '#84cc16', slot: 'TRỐNG NGAY' },
  ];

  courts.forEach((ct, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const rx = 36 + col * 324;
    const ry = 128 + row * 176;

    ctx.fillStyle = '#111c33';
    ctx.fillRect(rx, ry, 304, 152);
    ctx.strokeStyle = ct.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(rx, ry, 304, 152);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.fillText(ct.id, rx + 20, ry + 48);

    ctx.fillStyle = ct.color;
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText(ct.status, rx + 20, ry + 90);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText(ct.slot, rx + 20, ry + 128);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createProShopWallPosterTex(
  header: string,
  lines: string[],
  bgHex = '#0f172a',
  accentHex = '#84cc16'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 1024, 384);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 1000, 360);

  ctx.fillStyle = accentHex;
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.fillText(header, 40, 74);

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(40, 96, 944, 4);

  lines.forEach((ln, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#cbd5e1';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText(ln, 40, 148 + i * 48);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPickleballPaddleMesh(
  faceColorHex: number,
  edgeColorHex: number,
  gripColorHex = 0x18181b,
  scale = 1.0
): THREE.Group {
  const paddle = new THREE.Group();

  const faceMat = new THREE.MeshStandardMaterial({
    color: faceColorHex,
    roughness: 0.42,
    metalness: 0.2,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: edgeColorHex,
    roughness: 0.35,
    metalness: 0.15,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: gripColorHex,
    roughness: 0.8,
  });

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.27 * scale, 0.016 * scale), faceMat);
  face.position.y = 0.25 * scale;
  paddle.add(face);

  const topRim = new THREE.Mesh(new THREE.BoxGeometry(0.204 * scale, 0.016 * scale, 0.020 * scale), edgeMat);
  topRim.position.y = 0.386 * scale;
  paddle.add(topRim);

  [-1, 1].forEach((s) => {
    const sideRim = new THREE.Mesh(new THREE.BoxGeometry(0.015 * scale, 0.275 * scale, 0.020 * scale), edgeMat);
    sideRim.position.set(s * 0.096 * scale, 0.25 * scale, 0);
    paddle.add(sideRim);
  });

  const logoStripe = new THREE.Mesh(new THREE.BoxGeometry(0.11 * scale, 0.032 * scale, 0.019 * scale), edgeMat);
  logoStripe.position.y = 0.26 * scale;
  paddle.add(logoStripe);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.020 * scale, 0.135 * scale, 10), gripMat);
  handle.position.y = 0.055 * scale;
  paddle.add(handle);

  const buttCap = new THREE.Mesh(new THREE.CylinderGeometry(0.023 * scale, 0.023 * scale, 0.016 * scale, 10), edgeMat);
  buttCap.position.y = -0.014 * scale;
  paddle.add(buttCap);

  return paddle;
}

// ==========================================
// MAIN STRUCTURE BUILDER:
//   - 6-Court Covered Pickleball Arena (Mái Tôn Sân): X = 85.5 .. 122.5, Z = -28.0 .. +15.6
//   - RON PICKLEBALL Locker & Gear Storage Zone:     X = 122.5 .. 128.6, Z = -25.6 .. +4.6
//   - RON PICKLEBALL Pro-Shop & Showroom:            X = 128.6 .. 143.5, Z = -25.6 .. +15.6
// ==========================================
export function createRonPickleballStructure(): RonPickleballBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const interiorPointLights: Array<{ light: THREE.PointLight; nightIntensity: number; dayIntensity: number }> = [];

  // Shared Architectural Materials
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.55 });
  const gunmetalCladMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.52, metalness: 0.35 });
  const trussSteelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.42, metalness: 0.38 });
  const warmOakMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.62, metalness: 0.05 });
  const walnutMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.58, metalness: 0.08 });
  const limeAccentMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.35, metalness: 0.1 });
  const cyanAccentMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.35, metalness: 0.1 });
  const concreteSlabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const apronGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const courtBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.74 });
  const kitchenSkyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.72 });
  const lineWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const plinthWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
  const darkWallMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.65, metalness: 0.2 });
  const slateWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 });

  const tileFloorTex = createShowroomTileFloorTex();
  const showcaseFloorMat = new THREE.MeshStandardMaterial({
    map: tileFloorTex,
    roughness: 0.38,
    metalness: 0.08,
  });

  const ledPanelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });
  neonMats.push(ledPanelMat);

  const limeGlowMat = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    emissive: 0x84cc16,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });
  neonMats.push(limeGlowMat);

  const cyanGlowMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  neonMats.push(cyanGlowMat);

  const shopGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.20,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // =========================================================================
  // PART 1: 6-COURT COVERED PICKLEBALL ARENA ("MÁI TÔN SÂN")
  // Bounds: X = 85.5 .. 122.5 (37.0m), Z = -28.0 .. +15.6 (43.6m)
  // =========================================================================

  // 1A. Concrete Arena Slab & Landscape Verge beside Porsche
  const arenaSlab = new THREE.Mesh(new THREE.BoxGeometry(37.0, 0.12, 43.6), concreteSlabMat);
  arenaSlab.position.set(104.0, -0.04, -6.2);
  staticGroup.add(arenaSlab);

  const bufferTurf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 43.6), apronGreenMat);
  bufferTurf.position.set(84.75, -0.02, -6.2);
  staticGroup.add(bufferTurf);

  // 1B. Six (6) Regulation-Proportioned Pickleball Courts (3 Columns × 2 Rows)
  const netMeshTex = createNetMeshTex();
  const netMat = new THREE.MeshStandardMaterial({
    map: netMeshTex,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
    roughness: 0.7,
  });

  const colXs = [92.0, 104.0, 116.0];
  const rowZs = [5.0, -16.2];

  let courtIndex = 1;
  rowZs.forEach((cz) => {
    colXs.forEach((cx) => {
      const courtNo = `0${courtIndex++}`;
      const courtGroup = new THREE.Group();
      courtGroup.position.set(cx, 0, cz);

      const apron = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 15.8), apronGreenMat);
      apron.rotation.x = -Math.PI / 2;
      apron.position.y = 0.025;
      courtGroup.add(apron);

      const innerCourt = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 13.4), courtBlueMat);
      innerCourt.rotation.x = -Math.PI / 2;
      innerCourt.position.y = 0.032;
      courtGroup.add(innerCourt);

      const kitchen = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 4.26), kitchenSkyMat);
      kitchen.rotation.x = -Math.PI / 2;
      kitchen.position.y = 0.036;
      courtGroup.add(kitchen);

      const addCourtLine = (w: number, d: number, lx: number, lz: number) => {
        const lm = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineWhiteMat);
        lm.rotation.x = -Math.PI / 2;
        lm.position.set(lx, 0.042, lz);
        courtGroup.add(lm);
      };
      addCourtLine(6.16, 0.07, 0, -6.7);
      addCourtLine(6.16, 0.07, 0, 6.7);
      addCourtLine(0.07, 13.4, -3.05, 0);
      addCourtLine(0.07, 13.4, 3.05, 0);
      addCourtLine(6.1, 0.06, 0, -2.13);
      addCourtLine(6.1, 0.06, 0, 2.13);
      addCourtLine(0.06, 4.57, 0, -4.415);
      addCourtLine(0.06, 4.57, 0, 4.415);

      // 3D Net Posts & Tensioned Net
      [-3.32, 3.32].forEach((px) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.94, 10), darkSteelMat);
        post.position.set(px, 0.47, 0);
        courtGroup.add(post);

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 10), limeAccentMat);
        cap.position.set(px, 0.95, 0);
        courtGroup.add(cap);
      });

      const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 0.78), netMat);
      netMesh.position.set(0, 0.49, 0);
      courtGroup.add(netMesh);

      const netHeadband = new THREE.Mesh(new THREE.BoxGeometry(6.64, 0.07, 0.03), lineWhiteMat);
      netHeadband.position.set(0, 0.90, 0);
      courtGroup.add(netHeadband);

      const netCenterStrap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.86, 0.036), lineWhiteMat);
      netCenterStrap.position.set(0, 0.46, 0);
      courtGroup.add(netCenterStrap);

      // Painted Court Number Decal
      const numTex = createCourtNumberTex(`SÂN ${courtNo}`);
      const numPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.75),
        new THREE.MeshStandardMaterial({ map: numTex, roughness: 0.4 })
      );
      numPlate.rotation.x = -Math.PI / 2;
      numPlate.position.set(-2.4, 0.043, 7.35);
      courtGroup.add(numPlate);

      // Umpire High Chair & Digital Score Post beside net East edge
      const refPole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.65, 0.14), darkSteelMat);
      refPole.position.set(4.1, 0.825, 0);
      courtGroup.add(refPole);

      const scoreBoard = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.08), darkSteelMat);
      scoreBoard.position.set(4.1, 1.55, 0);
      courtGroup.add(scoreBoard);

      const scoreGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.24), limeGlowMat);
      scoreGlow.position.set(4.1, 1.55, 0.044);
      courtGroup.add(scoreGlow);

      staticGroup.add(courtGroup);
    });
  });

  // 1C. Central Spectator & Player Concourse Amenities (Z = -5.6)
  colXs.forEach((cx, i) => {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(cx, 0, -5.6);

    // Padded Pro Player Bench with Backrest
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.09, 0.52), warmOakMat);
    seat.position.set(0, 0.46, 0);
    benchGroup.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.34, 0.07), darkSteelMat);
    back.position.set(0, 0.72, -0.22);
    benchGroup.add(back);
    [-1.1, 1.1].forEach((bx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.46), darkSteelMat);
      leg.position.set(bx, 0.22, 0);
      benchGroup.add(leg);
    });

    // Illuminated Court Number Totem Pillar
    const totem = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.35, 0.38), darkSteelMat);
    totem.position.set(2.35, 1.175, 0);
    benchGroup.add(totem);

    const badgeTex = createCourtNumberTex(`0${i + 1} / 0${i + 4}`);
    const badgeMat = new THREE.MeshStandardMaterial({
      map: badgeTex,
      emissive: 0xffffff,
      emissiveMap: badgeTex,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    neonMats.push(badgeMat);
    const badgeFace = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.48), badgeMat);
    badgeFace.position.set(2.35, 1.9, 0.195);
    benchGroup.add(badgeFace);
    const badgeBack = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.48), badgeMat);
    badgeBack.rotation.y = Math.PI;
    badgeBack.position.set(2.35, 1.9, -0.195);
    benchGroup.add(badgeBack);

    // Paddle Staging Rack ("Kệ Xếp Vợt Chờ Sân") + Hydration Cooler
    const coolerStand = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.55), darkSteelMat);
    coolerStand.position.set(-2.35, 0.36, 0);
    benchGroup.add(coolerStand);
    const coolerJug = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.52, 12), limeAccentMat);
    coolerJug.position.set(-2.35, 0.98, 0);
    benchGroup.add(coolerJug);

    staticGroup.add(benchGroup);
  });

  // 1D. Steel Columns, Trusses, Gable ACP Cladding & Corrugated Metal Roof ("Mái Tôn Sân")
  const colLineXs = [85.75, 98.0, 110.0, 122.25];
  const colLineZs = [-27.6, -16.2, -5.6, 5.0, 15.25];
  const eaveY = 7.8;
  const ridgeY = 9.5;
  const roofCenterX = 104.0;
  const halfRoofSpan = 18.9;
  const slopeAngle = Math.atan2(ridgeY - eaveY, halfRoofSpan);
  const slopeLen = Math.hypot(halfRoofSpan, ridgeY - eaveY);

  colLineZs.forEach((z) => {
    colLineXs.forEach((x) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.34, eaveY, 0.34), darkSteelMat);
      col.position.set(x, eaveY / 2, z);
      staticGroup.add(col);

      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.58), limeAccentMat);
      basePlate.position.set(x, 0.10, z);
      staticGroup.add(basePlate);
    });
  });

  // Architectural Gable Cladding Triangles at Front & Rear so Roof Looks Sleek and Finished
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-halfRoofSpan, eaveY);
  gableShape.lineTo(0, ridgeY + 0.15);
  gableShape.lineTo(halfRoofSpan, eaveY);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);
  [15.32, -27.75].forEach((gz) => {
    const gable = new THREE.Mesh(gableGeo, gunmetalCladMat);
    gable.position.set(roofCenterX, 0, gz);
    staticGroup.add(gable);
  });

  colLineZs.forEach((z) => {
    const tieBeam = new THREE.Mesh(new THREE.BoxGeometry(37.4, 0.24, 0.24), trussSteelMat);
    tieBeam.position.set(roofCenterX, eaveY - 0.12, z);
    staticGroup.add(tieBeam);

    [-1, 1].forEach((dir) => {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.26, 0.26), trussSteelMat);
      rafter.position.set(roofCenterX + dir * (halfRoofSpan / 2), (eaveY + ridgeY) / 2, z);
      rafter.rotation.z = -dir * slopeAngle;
      staticGroup.add(rafter);
    });

    [-12, -6, 0, 6, 12].forEach((dx) => {
      const hAtX = ridgeY - (Math.abs(dx) / halfRoofSpan) * (ridgeY - eaveY) - eaveY;
      if (hAtX > 0.25) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.14, hAtX, 0.14), trussSteelMat);
        strut.position.set(roofCenterX + dx, eaveY + hAtX / 2, z);
        staticGroup.add(strut);
      }
    });
  });

  for (let i = -5; i <= 5; i++) {
    const px = roofCenterX + (i / 5) * (halfRoofSpan - 0.8);
    const py = ridgeY - (Math.abs(px - roofCenterX) / halfRoofSpan) * (ridgeY - eaveY) - 0.12;
    const purlin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 44.2), trussSteelMat);
    purlin.position.set(px, py, -6.2);
    staticGroup.add(purlin);
  }

  // Corrugated Metal Roof Panels ("Mái Tôn Sân") + Skylights
  const corrugatedRoofTex = createCorrugatedMetalRoofTex();
  const roofSheetMat = new THREE.MeshStandardMaterial({
    map: corrugatedRoofTex,
    color: 0x94a3b8,
    roughness: 0.42,
    metalness: 0.58,
    side: THREE.DoubleSide,
  });
  const skylightRoofMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.55,
    roughness: 0.25,
    side: THREE.DoubleSide,
  });

  [-1, 1].forEach((dir) => {
    const metalSlope = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.08, 44.4), roofSheetMat);
    metalSlope.position.set(roofCenterX + dir * (halfRoofSpan / 2), (eaveY + ridgeY) / 2 + 0.16, -6.2);
    metalSlope.rotation.z = -dir * slopeAngle;
    staticGroup.add(metalSlope);

    for (let rz = -27.5; rz <= 15.2; rz += 2.2) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(slopeLen + 0.1, 0.09, 0.12), darkSteelMat);
      rib.position.set(roofCenterX + dir * (halfRoofSpan / 2), (eaveY + ridgeY) / 2 + 0.22, rz);
      rib.rotation.z = -dir * slopeAngle;
      staticGroup.add(rib);
    }

    const skyPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 38.0), skylightRoofMat);
    skyPanel.rotation.x = -Math.PI / 2;
    skyPanel.rotation.y = dir * slopeAngle;
    skyPanel.position.set(roofCenterX + dir * (halfRoofSpan * 0.45), (eaveY + ridgeY) / 2 + 0.28, -6.2);
    staticGroup.add(skyPanel);
  });

  const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 44.6), limeAccentMat);
  ridgeCap.position.set(roofCenterX, ridgeY + 0.22, -6.2);
  staticGroup.add(ridgeCap);

  [85.2, 122.7].forEach((gx) => {
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.30, 44.6), darkSteelMat);
    gutter.position.set(gx, eaveY + 0.04, -6.2);
    staticGroup.add(gutter);
  });

  // 18 Suspended Stadium Linear High-Bay LEDs + 4 Wide Overhead Stadium PointLights
  [92.0, 104.0, 116.0].forEach((lx) => {
    [-21.0, -15.5, -10.5, -0.5, 4.8, 10.2].forEach((lz) => {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.55), darkSteelMat);
      housing.position.set(lx, 7.28, lz);
      staticGroup.add(housing);

      const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 0.46), ledPanelMat);
      glow.rotation.x = Math.PI / 2;
      glow.position.set(lx, 7.20, lz);
      staticGroup.add(glow);
    });
  });

  [
    [96.0, 5.0],
    [112.0, 5.0],
    [96.0, -16.2],
    [112.0, -16.2],
  ].forEach(([px, pz]) => {
    const pLight = new THREE.PointLight(0xf8fafc, 50, 38, 0.85);
    pLight.position.set(px, 6.9, pz);
    interiorPointLights.push({ light: pLight, nightIntensity: 50, dayIntensity: 16 });
  });

  // 1E. Perimeter Sports Mesh Fence + Rear Tournament Windscreens
  const fenceMeshTex = createFenceMeshTex();
  const sharedFenceMat = new THREE.MeshStandardMaterial({
    map: fenceMeshTex,
    transparent: false,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const addSportsFenceSegment = (x1: number, z1: number, x2: number, z2: number, height = 2.6) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) return;
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const angle = Math.atan2(dx, dz);

    const seg = new THREE.Group();
    seg.position.set(midX, 0, midZ);
    seg.rotation.y = angle + Math.PI / 2;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(len, 0.55, 0.22), plinthWallMat);
    plinth.position.y = 0.275;
    seg.add(plinth);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.14), limeAccentMat);
    topRail.position.y = height;
    seg.add(topRail);

    const planeGeo = new THREE.PlaneGeometry(len, height - 0.55);
    const repX = Math.max(1, Math.round(len / 1.5));
    const uvAttr = planeGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(i, uvAttr.getX(i) * repX, uvAttr.getY(i) * 2);
    }
    uvAttr.needsUpdate = true;
    const meshPlane = new THREE.Mesh(planeGeo, sharedFenceMat);
    meshPlane.position.y = 0.55 + (height - 0.55) / 2;
    seg.add(meshPlane);

    staticGroup.add(seg);
  };

  addSportsFenceSegment(85.5, -28.0, 85.5, 15.6, 2.7);
  addSportsFenceSegment(85.5, -28.0, 122.5, -28.0, 2.7);
  // Front street fence (Z = 15.6): unified into 1 central entrance opening at X = 101.6 .. 106.4
  addSportsFenceSegment(85.5, 15.6, 101.6, 15.6, 2.4);
  addSportsFenceSegment(106.4, 15.6, 122.5, 15.6, 2.4);

  // Rear North Windscreen Tournament Sponsor Banners along Z = -27.8 (Facing +Z Courts!)
  [
    { x: 92.0, label: 'SÂN 04' },
    { x: 104.0, label: 'SÂN 05' },
    { x: 116.0, label: 'SÂN 06' },
  ].forEach((b) => {
    const bTex = createWindscreenBannerTex(b.label);
    const bMat = new THREE.MeshStandardMaterial({
      map: bTex,
      emissive: 0xffffff,
      emissiveMap: bTex,
      emissiveIntensity: 0.35,
      roughness: 0.55,
    });
    neonMats.push(bMat);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 2.0), bMat);
    banner.position.set(b.x, 1.55, -27.82);
    staticGroup.add(banner);
  });

  // Entrance Gate Posts & Illuminating Lime Bollards around Single Central Entrance (X = 101.6 .. 106.4)
  [101.6, 106.4].forEach((gx) => {
    const gatePost = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.65, 10), darkSteelMat);
    gatePost.position.set(gx, 1.325, 15.6);
    staticGroup.add(gatePost);

    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.15, 12), darkSteelMat);
    bollard.position.set(gx, 0.575, 15.85);
    staticGroup.add(bollard);
    const bCap = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.12, 12), limeGlowMat);
    bCap.position.set(gx, 1.12, 15.85);
    staticGroup.add(bCap);
  });

  // Aspect-Ratio Matched Arena Front Fascia Canopy Sign (16:1 ratio -> 2560 × 160)
  const arenaFasciaBox = new THREE.Mesh(new THREE.BoxGeometry(37.2, 2.35, 0.45), darkSteelMat);
  arenaFasciaBox.position.set(104.0, 6.75, 15.55);
  staticGroup.add(arenaFasciaBox);

  const arenaTrim = new THREE.Mesh(new THREE.BoxGeometry(37.2, 0.12, 0.52), limeGlowMat);
  arenaTrim.position.set(104.0, 5.56, 15.58);
  staticGroup.add(arenaTrim);

  const arenaSignTex = createRonPickleballSignTex(
    'RON PICKLEBALL ARENA',
    '6 SÂN TIÊU CHUẨN QUỐC TẾ • MÁI TÔN CHE MƯA NẮNG • ĐÈN LED CHỐNG CHÓI',
    'ĐẶT SÂN 07:00 - 22:00  •  MIỄN PHÍ LOCKER ĐỰNG ĐỒ VĐV  •  PRO-SHOP CHÍNH HÃNG BÊN CẠNH',
    2560,
    160
  );
  const arenaSignMat = new THREE.MeshStandardMaterial({
    map: arenaSignTex,
    emissive: 0xffffff,
    emissiveMap: arenaSignTex,
    emissiveIntensity: 0.78,
    roughness: 0.25,
  });
  neonMats.push(arenaSignMat);
  const arenaSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(36.2, 2.15), arenaSignMat);
  arenaSignPlane.position.set(104.0, 6.75, 15.80);
  staticGroup.add(arenaSignPlane);

  // Double Hinged Chain-Link Mesh Entrance Gate (X = 101.6 .. 106.4, swings inward & closed automatically)
  const buildSwingMeshGateLeaf = (pivotX: number, dir: 1 | -1, withInfoBoard: boolean) => {
    const gate = new THREE.Group();
    gate.userData.noMerge = true;
    gate.position.set(pivotX, 0, 15.55);

    const w = 2.39;
    const midX = dir * (w / 2);

    const outerStile = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.38, 0.11), darkSteelMat);
    outerStile.position.set(dir * 0.04, 1.19, 0);
    gate.add(outerStile);

    const innerStile = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.38, 0.11), darkSteelMat);
    innerStile.position.set(dir * (w - 0.04), 1.19, 0);
    gate.add(innerStile);

    const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.52, 0.10), plinthWallMat);
    kickPlate.position.set(midX, 0.26, 0);
    gate.add(kickPlate);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.12), limeAccentMat);
    topRail.position.set(midX, 2.36, 0);
    gate.add(topRail);

    const midBrace = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.06, 0.08), darkSteelMat);
    midBrace.position.set(midX, 1.32, 0);
    gate.add(midBrace);

    const meshGeo = new THREE.PlaneGeometry(w - 0.08, 1.80);
    const uvAttr = meshGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(i, uvAttr.getX(i) * 2, uvAttr.getY(i) * 2);
    }
    uvAttr.needsUpdate = true;
    const meshPlane = new THREE.Mesh(meshGeo, sharedFenceMat);
    meshPlane.position.set(midX, 0.52 + 0.90, 0);
    gate.add(meshPlane);

    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.18), trussSteelMat);
    latch.position.set(dir * (w - 0.14), 1.10, 0);
    gate.add(latch);

    if (withInfoBoard) {
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 192;
      const sCtx = signCanvas.getContext('2d')!;
      sCtx.fillStyle = '#0f172a';
      sCtx.fillRect(0, 0, 512, 192);
      sCtx.strokeStyle = '#84cc16';
      sCtx.lineWidth = 8;
      sCtx.strokeRect(8, 8, 496, 176);
      sCtx.fillStyle = '#84cc16';
      sCtx.fillRect(16, 16, 480, 50);
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillStyle = '#0f172a';
      sCtx.font = '900 26px system-ui, sans-serif';
      sCtx.fillText('RON PICKLEBALL ARENA', 256, 41);
      sCtx.fillStyle = '#ffffff';
      sCtx.font = '800 30px system-ui, sans-serif';
      sCtx.fillText('LỐI VÀO SÂN 01 – 06', 256, 106);
      sCtx.fillStyle = '#fde68a';
      sCtx.font = '700 24px system-ui, sans-serif';
      sCtx.fillText('MỞ CỬA: 07:00 - 22:00', 256, 150);
      const signTex = new THREE.CanvasTexture(signCanvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 });
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.62, 0.05), signMat);
      signBoard.position.set(midX, 1.44, 0.05);
      gate.add(signBoard);
    }

    staticGroup.add(gate);
    return gate;
  };

  const meshGateLeft = buildSwingMeshGateLeaf(101.6, 1, true);
  const meshGateRight = buildSwingMeshGateLeaf(106.4, -1, false);

  // =========================================================================
  // PART 2: RON PICKLEBALL SHOWROOM & DEDICATED PLAYER LOCKER / GEAR ZONE
  // Total Footprint: X = 122.5 .. 143.5 (21.0m), Z = -26.0 .. +15.6 (41.6m)
  //   - Player Locker & Gear Drop Zone (Shared West Wing): X = 122.7 .. 128.6, Z = -25.6 .. +4.6
  //   - Pro-Shop Flagship Showroom (Main & East Wing):     X = 128.6 .. 143.3, Z = -25.6 .. +15.6
  // =========================================================================
  const shopCenterX = 133.0;
  const shopW = 21.0;
  const shopH = 7.8;

  // Floor & Roof Shell
  const shopFloor = new THREE.Mesh(new THREE.BoxGeometry(shopW, 0.14, 41.6), showcaseFloorMat);
  shopFloor.position.set(shopCenterX, -0.02, -5.2);
  staticGroup.add(shopFloor);

  // Warm Charcoal Welcome Carpet inside Entrance (X = 130.5..135.5, Z = 10.5..15.0)
  const entryCarpet = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.02, 4.4), darkSteelMat);
  entryCarpet.position.set(133.0, 0.06, 12.6);
  staticGroup.add(entryCarpet);

  const shopRoof = new THREE.Mesh(new THREE.BoxGeometry(shopW + 0.4, 0.45, 42.0), darkSteelMat);
  shopRoof.position.set(shopCenterX, shopH, -5.2);
  staticGroup.add(shopRoof);

  // Outer Walls (Slate/Graphite Cladding + Warm Oak Accent Ribs)
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, shopH, 41.6), slateWallMat);
  eastWall.position.set(143.3, shopH / 2, -5.2);
  staticGroup.add(eastWall);

  const northWall = new THREE.Mesh(new THREE.BoxGeometry(shopW, shopH, 0.45), darkWallMat);
  northWall.position.set(shopCenterX, shopH / 2, -25.8);
  staticGroup.add(northWall);

  // West Partition Wall (X = 122.5) split cleanly around Court Archway Z = 5.0..10.6
  const westWallNorth = new THREE.Mesh(new THREE.BoxGeometry(0.4, shopH, 31.0), slateWallMat);
  westWallNorth.position.set(122.5, shopH / 2, -10.5);
  staticGroup.add(westWallNorth);

  const westWallSouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, shopH, 5.0), slateWallMat);
  westWallSouth.position.set(122.5, shopH / 2, 13.1);
  staticGroup.add(westWallSouth);

  const westArchHeader = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.2, 5.6), darkSteelMat);
  westArchHeader.position.set(122.5, 5.7, 7.8);
  staticGroup.add(westArchHeader);

  // Recessed Lime/Cyan LED Wall Cove Strips
  const eastLedCove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 38.0), limeGlowMat);
  eastLedCove.position.set(143.06, 6.85, -5.2);
  staticGroup.add(eastLedCove);

  const westLedCove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 29.0), cyanGlowMat);
  westLedCove.position.set(122.74, 6.85, -10.5);
  staticGroup.add(westLedCove);

  // Court Passageway Archway Sign
  const archSignTex = createRonPickleballSignTex(
    'LỐI VÀO 6 SÂN',
    'SÂN 01 — SÂN 06 • KHU LOCKER ĐỰNG ĐỒ VĐV BÊN TRONG',
    'RON PICKLEBALL CLUB',
    1024,
    192,
    '#06b6d4'
  );
  const archSignMat = new THREE.MeshStandardMaterial({
    map: archSignTex,
    emissive: 0xffffff,
    emissiveMap: archSignTex,
    emissiveIntensity: 0.78,
    roughness: 0.25,
  });
  neonMats.push(archSignMat);
  const archSignInside = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.05), archSignMat);
  archSignInside.rotation.y = Math.PI / 2;
  archSignInside.position.set(122.73, 4.35, 7.8);
  staticGroup.add(archSignInside);

  const archSignArenaSide = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.05), archSignMat);
  archSignArenaSide.rotation.y = -Math.PI / 2;
  archSignArenaSide.position.set(122.27, 4.35, 7.8);
  staticGroup.add(archSignArenaSide);

  // Exterior Curtain Glass Wall + Mullions + Sliding Glass Doors
  const frontGlassLeft = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 5.6), shopGlassMat);
  frontGlassLeft.position.set(126.65, 2.8, 15.5);
  staticGroup.add(frontGlassLeft);

  const frontGlassRight = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 5.6), shopGlassMat);
  frontGlassRight.position.set(139.35, 2.8, 15.5);
  staticGroup.add(frontGlassRight);

  const frontTransom = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.1), shopGlassMat);
  frontTransom.position.set(133.0, 4.55, 15.5);
  staticGroup.add(frontTransom);

  [122.7, 126.8, 130.8, 135.2, 139.2, 143.3].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.65, 0.18), darkSteelMat);
    mullion.position.set(mx, 2.82, 15.5);
    staticGroup.add(mullion);
  });

  const transomBar = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.14, 0.2), darkSteelMat);
  transomBar.position.set(shopCenterX, 3.52, 15.5);
  staticGroup.add(transomBar);

  const buildSlidingLeaf = (sx: number) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;
    leaf.position.set(sx, 0, 0);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.08, 0.07), darkSteelMat);
    frameTop.position.set(0, 3.42, 0);
    leaf.add(frameTop);

    const frameBot = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.1, 0.07), darkSteelMat);
    frameBot.position.set(0, 0.05, 0);
    leaf.add(frameBot);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.12, 3.3, 0.04), shopGlassMat);
    glass.position.set(0, 1.72, 0);
    leaf.add(glass);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), limeAccentMat);
    handle.position.set(sx < 0 ? 0.92 : -0.92, 1.25, 0.05);
    leaf.add(handle);

    return leaf;
  };

  const doorRoot = new THREE.Group();
  doorRoot.userData.noMerge = true;
  doorRoot.position.set(133.0, 0, 15.46);
  const doorLeft = buildSlidingLeaf(-1.08);
  const doorRight = buildSlidingLeaf(1.08);
  doorRoot.add(doorLeft, doorRight);
  staticGroup.add(doorRoot);

  // Steel Rolling Security Shutter behind Pro-Shop sliding entrance doors
  const shutterTex = createRollingShutterTexture({
    title: 'RON PICKLEBALL PRO-SHOP',
    hoursLabel: 'MỞ CỬA HÀNG NGÀY  •  07:00 - 22:00',
    accentHex: '#84cc16',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.55,
    metalness: 0.45,
  });
  const proShopShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'ron_proshop',
      axis: 'x',
      pos: 15.32,
      spanCenter: 133.0,
      width: 4.35,
      baseY: 0.08,
      topY: 3.45,
    },
    shutterMat,
    darkSteelMat
  );

  // Aspect-Matched Giant Pro-Shop Roof Fascia Sign (10:1 -> 2048 × 224)
  const shopFasciaFrame = new THREE.Mesh(new THREE.BoxGeometry(21.2, 2.35, 0.48), darkSteelMat);
  shopFasciaFrame.position.set(shopCenterX, 6.75, 15.55);
  staticGroup.add(shopFasciaFrame);

  const shopLimeTrim = new THREE.Mesh(new THREE.BoxGeometry(21.2, 0.12, 0.54), limeGlowMat);
  shopLimeTrim.position.set(shopCenterX, 5.56, 15.58);
  staticGroup.add(shopLimeTrim);

  const shopSignTex = createRonPickleballSignTex(
    'RON PICKLEBALL',
    'FLAGSHIP PRO SHOP • VỢT CARBON • GIÀY THI ĐẤU • PHỤ KIỆN CHÍNH HÃNG',
    'THUÊ VỢT & TEST VỢT  •  KHU LOCKER ĐỰNG ĐỒ VĐV  •  HỌC VIỆN HUẤN LUYỆN',
    2048,
    224
  );
  const shopSignMat = new THREE.MeshStandardMaterial({
    map: shopSignTex,
    emissive: 0xffffff,
    emissiveMap: shopSignTex,
    emissiveIntensity: 0.82,
    roughness: 0.22,
  });
  neonMats.push(shopSignMat);
  const shopSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(20.2, 2.08), shopSignMat);
  shopSignPlane.position.set(shopCenterX, 6.75, 15.82);
  staticGroup.add(shopSignPlane);

  // Portrait Sidewalk Pylon Totem (Matched Vertical Texture — Zero Squishing!)
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.15, 4.4, 0.36), darkSteelMat);
  pylon.position.set(123.6, 2.2, 16.3);
  staticGroup.add(pylon);

  const pylonTex = createPylonPortraitTex();
  const pylonMat = new THREE.MeshStandardMaterial({
    map: pylonTex,
    emissive: 0xffffff,
    emissiveMap: pylonTex,
    emissiveIntensity: 0.78,
    roughness: 0.22,
  });
  neonMats.push(pylonMat);
  const pylonBadge = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.92), pylonMat);
  pylonBadge.position.set(123.6, 2.95, 16.50);
  staticGroup.add(pylonBadge);

  // Showroom Ceiling Acoustic Baffles, LED Strips & 2 Bright Interior PointLights
  [126.0, 132.5, 139.0].forEach((lx) => {
    const cLight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 35.0), ledPanelMat);
    cLight.position.set(lx, 7.65, -5.0);
    staticGroup.add(cLight);
  });

  const shopFrontLight = new THREE.PointLight(0xf8fafc, 58, 38, 0.88);
  shopFrontLight.position.set(shopCenterX, 6.2, 6.5);
  interiorPointLights.push({ light: shopFrontLight, nightIntensity: 58, dayIntensity: 20 });

  const shopRearLight = new THREE.PointLight(0xf8fafc, 56, 38, 0.88);
  shopRearLight.position.set(shopCenterX, 6.2, -14.5);
  interiorPointLights.push({ light: shopRearLight, nightIntensity: 56, dayIntensity: 20 });

  // =========================================================================
  // ZONE A: PLAYER LOCKER & GEAR STORAGE ROOM ("KHU ĐỰNG ĐỒ VĐV")
  // Shared West Wing inside Showroom: X = 122.7 .. 128.6, Z = -25.4 .. +4.6
  // =========================================================================

  // Warm Wood Slat Flooring Inset for Locker Zone
  const lockerFloor = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.04, 29.8), warmOakMat);
  lockerFloor.position.set(125.6, 0.06, -10.5);
  staticGroup.add(lockerFloor);

  // Slatted Wood & Black Steel Architectural Partition between Locker Zone & Pro-Shop (at X = 128.6)
  // Left open cleanly at front (Z = 1.0..4.6) and mid aisle (Z = -10.5..-7.0) so players walk freely!
  const buildDividerScreen = (zStart: number, zEnd: number) => {
    const len = zEnd - zStart;
    const midZ = (zStart + zEnd) / 2;
    const header = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, len), darkSteelMat);
    header.position.set(128.6, 3.3, midZ);
    staticGroup.add(header);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, len), darkSteelMat);
    base.position.set(128.6, 0.22, midZ);
    staticGroup.add(base);
    for (let sz = zStart + 0.35; sz <= zEnd - 0.35; sz += 0.48) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.75, 0.14), walnutMat);
      slat.position.set(128.6, 1.75, sz);
      staticGroup.add(slat);
    }
  };
  buildDividerScreen(-24.8, -11.0);
  buildDividerScreen(-6.5, 0.8);

  // Glowing Locker Zone Overhead Sign facing Pro-Shop & Front Entrance
  const lockerHeaderTex = createRonPickleballSignTex(
    'KHU ĐỰNG ĐỒ VĐV',
    'TỦ LOCKER THÔNG MINH 01–24 • KỆ TÚI VỢT • GHẾ THAY GIÀY',
    'MIỄN PHÍ CHO KHÁCH ĐẶT SÂN RON PICKLEBALL',
    1024,
    192,
    '#06b6d4'
  );
  const lockerHeaderMat = new THREE.MeshStandardMaterial({
    map: lockerHeaderTex,
    emissive: 0xffffff,
    emissiveMap: lockerHeaderTex,
    emissiveIntensity: 0.72,
    roughness: 0.25,
  });
  neonMats.push(lockerHeaderMat);
  const lockerSignSouth = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.96), lockerHeaderMat);
  lockerSignSouth.position.set(125.6, 3.65, 4.4);
  staticGroup.add(lockerSignSouth);

  // 24 Numbered Smart Steel Lockers along West Wall (X = 123.25, 4 banks × 6 lockers = 24 lockers!)
  const lockerBanks = [
    { z: -19.8, startNo: 1 },
    { z: -13.6, startNo: 7 },
    { z: -7.4, startNo: 13 },
    { z: -1.2, startNo: 19 },
  ];
  lockerBanks.forEach((lb) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.35, 5.4), darkSteelMat);
    body.position.set(123.25, 1.24, lb.z);
    staticGroup.add(body);

    const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 5.44), limeAccentMat);
    topCap.position.set(123.25, 2.46, lb.z);
    staticGroup.add(topCap);

    const tex = createLockerBankTex(lb.startNo, 3);
    const doorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.3 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(5.25, 2.2), doorMat);
    face.rotation.y = Math.PI / 2;
    face.position.set(123.74, 1.24, lb.z);
    staticGroup.add(face);
  });

  // Open Player Gear & Pickleball Bag Cubby Wall on North Side of Locker Zone (X = 123.2..128.2, Z = -25.0)
  const cubbyBack = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.6, 0.75), walnutMat);
  cubbyBack.position.set(125.7, 1.35, -25.1);
  staticGroup.add(cubbyBack);

  [0.95, 1.85, 2.65].forEach((sy) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 0.8), darkSteelMat);
    shelf.position.set(125.7, sy, -25.0);
    staticGroup.add(shelf);
  });

  // Player Stored Backpacks, Duffel Bags, Ball Tubes & Spare Paddles inside Cubbies (shared materials for static batching)
  const bagPalette = [0x06b6d4, 0x84cc16, 0xf97316, 0xec4899, 0x3b82f6];
  const bagMats = bagPalette.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }));
  const duffelDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
  const duffelBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 });

  for (let i = 0; i < 6; i++) {
    const bx = 123.7 + i * 0.78;
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.52, 0.42),
      bagMats[i % bagMats.length]
    );
    pack.position.set(bx, 1.26, -24.95);
    staticGroup.add(pack);

    const duffel = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.34, 0.44),
      i % 2 === 0 ? duffelDarkMat : duffelBlueMat
    );
    duffel.position.set(bx, 2.08, -24.95);
    staticGroup.add(duffel);
  }

  // Two Oak Player Changing & Shoe-Swap Benches down Center of Locker Zone (X = 126.1)
  [-15.5, -4.5].forEach((bz, idx) => {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 4.4), warmOakMat);
    bench.position.set(126.1, 0.48, bz);
    staticGroup.add(bench);

    [-1.7, 1.7].forEach((dz) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.14), darkSteelMat);
      leg.position.set(126.1, 0.21, bz + dz);
      staticGroup.add(leg);
    });

    // Player Gym Bag & Spare Paddle resting on Changing Bench
    const benchBag = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.34, 0.72),
      idx === 0 ? bagMats[0] : bagMats[2]
    );
    benchBag.position.set(126.1, 0.71, bz - 0.8);
    staticGroup.add(benchBag);

    const restPaddle = createPickleballPaddleMesh(0x111827, idx === 0 ? 0x84cc16 : 0xec4899, 0x09090b, 1.0);
    restPaddle.rotation.x = Math.PI / 2;
    restPaddle.rotation.z = 0.35;
    restPaddle.position.set(126.1, 0.56, bz + 0.8);
    staticGroup.add(restPaddle);
  });

  // =========================================================================
  // ZONE B: PRO-SHOP FLAGSHIP SHOWROOM (X = 128.6 .. 143.3)
  // =========================================================================
  const proCenterX = 135.8;

  // 2A. Front Glass Showcase Pedestals right inside Storefront Window (Z = 13.6)
  [129.8, 138.8].forEach((wx, idx) => {
    const wPed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 1.0), darkSteelMat);
    wPed.position.set(wx, 0.425, 13.6);
    staticGroup.add(wPed);
    const wRim = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.08, 1.04), limeGlowMat);
    wRim.position.set(wx, 0.86, 13.6);
    staticGroup.add(wRim);
    [-0.55, 0.55].forEach((px, pIdx) => {
      const wp = createPickleballPaddleMesh(0x111827, idx === 0 ? (pIdx === 0 ? 0x84cc16 : 0x06b6d4) : 0xf97316, 0x09090b, 1.3);
      wp.position.set(wx + px, 0.92, 13.6);
      wp.rotation.y = 0.25 * (pIdx === 0 ? 1 : -1);
      staticGroup.add(wp);
    });
  });

  // 2B. East Illuminated Walnut & Graphite Carbon Paddle Gallery (X = 142.8)
  const paddleColors = [0x84cc16, 0x06b6d4, 0xf97316, 0xec4899, 0xfacc15, 0x3b82f6];
  [-13.5, -5.5, 2.5, 9.5].forEach((bayZ, bayIdx) => {
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.8, 6.2), darkSteelMat);
    cabinet.position.set(142.8, 1.9, bayZ);
    staticGroup.add(cabinet);

    const backing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.05, 5.8), walnutMat);
    backing.position.set(142.44, 1.95, bayZ);
    staticGroup.add(backing);

    const topGlow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 5.8), limeGlowMat);
    topGlow.position.set(142.4, 3.55, bayZ);
    staticGroup.add(topGlow);

    [1.35, 2.50].forEach((py, rowIdx) => {
      for (let p = 0; p < 5; p++) {
        const pz = bayZ - 2.2 + p * 1.1;
        const pColor = paddleColors[(bayIdx * 5 + p + rowIdx) % paddleColors.length];
        const paddle = createPickleballPaddleMesh(0x111827, pColor, 0x09090b, 1.3);
        paddle.rotation.y = -Math.PI / 2;
        paddle.position.set(142.32, py, pz);
        staticGroup.add(paddle);
      }
    });
  });

  const paddlePosterTex = createProShopWallPosterTex('VỢT CARBON T700 • PRO TOUR GALLERY', [
    '• JOOLA PERSEUS PRO IV 16MM  |  SELKIRK LABS 007',
    '• CRBN 1X & TRUFOAM GENESIS  |  RON PRO-SPIN ELITE',
    '• DỊCH VỤ QUẤN CÁN, DÁN VIỀN & TEST VỢT MIỄN PHÍ',
  ]);
  const paddlePosterMat = new THREE.MeshStandardMaterial({
    map: paddlePosterTex,
    emissive: 0xffffff,
    emissiveMap: paddlePosterTex,
    emissiveIntensity: 0.55,
  });
  const paddlePoster = new THREE.Mesh(
    new THREE.PlaneGeometry(14.0, 2.2),
    paddlePosterMat
  );
  paddlePoster.rotation.y = -Math.PI / 2;
  paddlePoster.position.set(143.05, 5.2, -2.0);
  staticGroup.add(paddlePoster);

  // 2C. Hero Perforated Pickleball Sculpture Island (X = 135.8, Z = +7.5)
  const heroPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.72, 0.9, 28), darkSteelMat);
  heroPlinth.position.set(proCenterX, 0.45, 7.5);
  staticGroup.add(heroPlinth);

  const heroRing = new THREE.Mesh(new THREE.CylinderGeometry(1.59, 1.59, 0.12, 28), limeGlowMat);
  heroRing.position.set(proCenterX, 0.88, 7.5);
  staticGroup.add(heroRing);

  const heroBallTex = createPerforatedPickleballTex();
  const heroBallMat = new THREE.MeshStandardMaterial({
    map: heroBallTex,
    emissive: 0x84cc16,
    emissiveIntensity: 0.18,
    roughness: 0.35,
  });
  const heroBall = new THREE.Mesh(new THREE.SphereGeometry(0.65, 28, 28), heroBallMat);
  heroBall.position.set(proCenterX, 1.72, 7.5);
  staticGroup.add(heroBall);

  [0, 1, 2, 3].forEach((idx) => {
    const a = (idx * Math.PI) / 2 + 0.4;
    const hp = createPickleballPaddleMesh(0x0f172a, paddleColors[idx], 0x18181b, 1.35);
    hp.position.set(proCenterX + Math.cos(a) * 1.1, 1.02, 7.5 + Math.sin(a) * 1.1);
    hp.rotation.y = -a + Math.PI / 2;
    hp.rotation.x = 0.22;
    staticGroup.add(hp);
  });

  // 2D. Court Footwear Display Island (X = 135.8, Z = -0.5) & Sport Apparel Hanging Rack (X = 139.2, Z = -4.5)
  const shoeTable = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.92, 1.8), darkSteelMat);
  shoeTable.position.set(proCenterX, 0.46, -0.5);
  staticGroup.add(shoeTable);
  const shoeTop = new THREE.Mesh(new THREE.BoxGeometry(4.26, 0.08, 1.86), cyanGlowMat);
  shoeTop.position.set(proCenterX, 0.94, -0.5);
  staticGroup.add(shoeTop);

  // Two-tier Shoe Display Risers + 8 Sneakers (shared materials)
  const shoeJerseyMats = paddleColors.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
  [-1.4, -0.45, 0.45, 1.4].forEach((sx, i) => {
    const riser = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.72), darkSteelMat);
    riser.position.set(proCenterX + sx, 1.05, -0.5);
    staticGroup.add(riser);

    const shoeBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.62), lineWhiteMat);
    shoeBase.position.set(proCenterX + sx, 1.21, -0.5);
    shoeBase.rotation.y = i % 2 === 0 ? 0.2 : -0.2;
    staticGroup.add(shoeBase);

    const shoeUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, 0.42),
      shoeJerseyMats[i % shoeJerseyMats.length]
    );
    shoeUpper.position.set(proCenterX + sx, 1.34, -0.58);
    shoeUpper.rotation.y = i % 2 === 0 ? 0.2 : -0.2;
    staticGroup.add(shoeUpper);
  });

  // Pro Sport Apparel Hanging Rail (X = 135.8, Z = -8.5)
  const apparelBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.25, 1.5), darkSteelMat);
  apparelBase.position.set(proCenterX, 0.125, -8.5);
  staticGroup.add(apparelBase);
  [-1.95, 1.95].forEach((rx) => {
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.85, 8), trussSteelMat);
    upright.position.set(proCenterX + rx, 1.05, -8.5);
    staticGroup.add(upright);
  });
  const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.0, 8), trussSteelMat);
  topRail.rotation.z = Math.PI / 2;
  topRail.position.set(proCenterX, 1.95, -8.5);
  staticGroup.add(topRail);

  [-1.3, -0.65, 0.0, 0.65, 1.3].forEach((jx, i) => {
    const jersey = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.62, 0.12),
      shoeJerseyMats[i % shoeJerseyMats.length]
    );
    jersey.position.set(proCenterX + jx, 1.56, -8.5);
    staticGroup.add(jersey);
  });

  // 2E. Check-In, Court Booking & Cashier Desk + Live 6-Court Monitor Wall (Z = -17.5 .. -25.4)
  const receptionDesk = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.08, 1.25), darkSteelMat);
  receptionDesk.position.set(proCenterX, 0.54, -17.5);
  staticGroup.add(receptionDesk);

  const oakDeskClad = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.72, 0.12), warmOakMat);
  oakDeskClad.position.set(proCenterX, 0.45, -16.86);
  staticGroup.add(oakDeskClad);

  const deskLimeStrip = new THREE.Mesh(new THREE.BoxGeometry(6.84, 0.1, 1.3), limeGlowMat);
  deskLimeStrip.position.set(proCenterX, 0.98, -17.5);
  staticGroup.add(deskLimeStrip);

  [-1.5, 1.5].forEach((mx) => {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.44, 0.06), darkSteelMat);
    mon.position.set(proCenterX + mx, 1.34, -17.35);
    staticGroup.add(mon);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.38), cyanGlowMat);
    scr.position.set(proCenterX + mx, 1.34, -17.31);
    staticGroup.add(scr);
  });

  // Electrolyte Fridge & Hydration Bar beside Desk (X = 141.6, Z = -22.5)
  const fridgeBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 2.2), darkSteelMat);
  fridgeBody.position.set(142.1, 1.2, -22.5);
  staticGroup.add(fridgeBody);
  const fridgeGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.7), ledPanelMat);
  fridgeGlow.rotation.y = -Math.PI / 2;
  fridgeGlow.position.set(141.32, 1.28, -22.5);
  staticGroup.add(fridgeGlow);

  // Giant Backlit 6-Court & Locker Schedule Screen Wall (Z = -25.4)
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(10.8, 5.2, 0.24), darkSteelMat);
  tvFrame.position.set(proCenterX, 3.6, -25.48);
  staticGroup.add(tvFrame);

  const scheduleTex = createCourtBookingScreenTex();
  const scheduleMat = new THREE.MeshStandardMaterial({
    map: scheduleTex,
    emissive: 0xffffff,
    emissiveMap: scheduleTex,
    emissiveIntensity: 0.72,
    roughness: 0.25,
  });
  neonMats.push(scheduleMat);
  const scheduleScreen = new THREE.Mesh(new THREE.PlaneGeometry(10.3, 4.8), scheduleMat);
  scheduleScreen.position.set(proCenterX, 3.6, -25.33);
  staticGroup.add(scheduleScreen);

  let wasOpen: boolean | null = null;
  let closingElapsed = 0;
  let closedFactor = 0;
  let meshGateOpenAmount = 0;

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    npcController?: RonPickleballNpcController | null,
    isPlayerNearGate: boolean = false
  ) => {
    const isOpen = isRonPickleballOpenAtHour(rawHour);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (rawHour < 7.0 || rawHour >= 22.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      const next = Math.max(0, proShopShutter.progress - delta * 1.1);
      setShutterProgress(proShopShutter, next);
      closedFactor = next;
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(proShopShutter, 1.0);
      closedFactor = 1.0;
    } else {
      closingElapsed += delta;
      const waitingExit =
        closingElapsed < 36.0 && npcController && !npcController.isFullyClosedAndEmpty();
      if (!waitingExit) {
        const next = Math.min(1.0, proShopShutter.progress + delta * 0.72);
        setShutterProgress(proShopShutter, next);
        closedFactor = next;
      } else {
        closedFactor = 0;
      }
    }
    wasOpen = isOpen;

    // Double Hinged Chain-Link Mesh Gate: swings inward smoothly when player approaches (07:00-22:00) or NPCs exit
    const wantGateOpen =
      (isOpen && isPlayerNearGate) || Boolean(npcController?.hasExitingNpcNearArenaGate());
    const targetGateOpen = wantGateOpen ? 1.0 : 0.0;
    meshGateOpenAmount = THREE.MathUtils.lerp(meshGateOpenAmount, targetGateOpen, Math.min(1, delta * 5.8));
    meshGateLeft.rotation.y = meshGateOpenAmount * 1.48;
    meshGateRight.rotation.y = -meshGateOpenAmount * 1.48;

    // Dim / shut off all stadium high-bay & showroom interior lights when closed
    const litScale = 1 - closedFactor;
    ledPanelMat.emissiveIntensity = 0.95 * litScale;
    limeGlowMat.emissiveIntensity = 0.90 * litScale;
    cyanGlowMat.emissiveIntensity = 0.85 * litScale;
    scheduleMat.emissiveIntensity = 0.72 * litScale;
    archSignMat.emissiveIntensity = 0.78 * litScale;
    lockerHeaderMat.emissiveIntensity = 0.72 * litScale;
    paddlePosterMat.emissiveIntensity = 0.55 * litScale;
    skylightRoofMat.emissiveIntensity = 0.18 * litScale;
    heroBallMat.emissiveIntensity = 0.18 * litScale;
    arenaSignMat.emissiveIntensity = 0.78 * (0.12 + 0.88 * litScale);
    shopSignMat.emissiveIntensity = 0.82 * (0.12 + 0.88 * litScale);
    pylonMat.emissiveIntensity = 0.78 * (0.12 + 0.88 * litScale);
  };

  return {
    staticGroup,
    doorLeft,
    doorRight,
    neonMats,
    interiorPointLights,
    updateOperatingHours,
    getClosedFactor: () => closedFactor,
    getGateOpenAmount: () => meshGateOpenAmount,
  };
}

// =========================================================================
// ANIMATED NPC CONTROLLER:
//   - 8 Athletic Players rallying with 3D Paddles & flying Neon Pickleballs
//   - 4 RON PICKLEBALL Pro-Shop Staff, Gear Advisor, Shoppers & Locker Player
// =========================================================================
interface PlayerActorRef {
  root: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  sideSign: number;
  homePos: THREE.Vector3;
  homeYaw: number;
  exitPath?: THREE.Vector3[];
  exitWp?: { idx: number };
  exitPhase?: { phase: number };
  exitDone?: boolean;
  glbHandle?: GlbHumanHandle;
}

interface PlayerPairSim {
  courtX: number;
  courtZ: number;
  playerA: PlayerActorRef;
  playerB: PlayerActorRef;
  ballMesh: THREE.Mesh;
  phaseOffset: number;
  rallySpeed: number;
}

interface ShopNpcSim {
  root: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  mode: 'desk' | 'advisor' | 'browse' | 'locker';
  originX: number;
  originZ: number;
  homePos: THREE.Vector3;
  homeYaw: number;
  phase: number;
  exitPath?: THREE.Vector3[];
  exitWp?: { idx: number };
  exitPhase?: { phase: number };
  exitDone?: boolean;
  glbHandle?: GlbHumanHandle;
}

export class RonPickleballNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly rallies: PlayerPairSim[] = [];
  private readonly shopNpcs: ShopNpcSim[] = [];
  private elapsed = 0;
  private isOpenState: boolean | null = null;
  private closingActive = false;
  private closingTimer = 0;
  private fullyClosedAndEmpty = false;

  constructor(helpers: RonPickleballCharacterHelpers) {
    const buildCharacter = (opts: {
      shirtHex: number;
      shortHex: number;
      skinHex: string;
      skinColor: number;
      capHex?: number;
      withPaddle?: boolean;
      paddleAccent?: number;
    }) => {
      const root = new THREE.Group();
      const sMat = new THREE.MeshStandardMaterial({ color: opts.skinColor, roughness: 0.65 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: opts.shirtHex, roughness: 0.55 });
      const shortMat = new THREE.MeshStandardMaterial({ color: opts.shortHex, roughness: 0.68 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

      const hips = new THREE.Group();
      hips.position.y = 0.84;
      root.add(hips);

      const makeLeg = (lx: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(lx, 0, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.74, 0.14), shortMat);
        leg.position.y = -0.37;
        pivot.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.22), shoeMat);
        shoe.position.set(0, -0.78, 0.04);
        pivot.add(shoe);
        hips.add(pivot);
        return pivot;
      };
      const legL = makeLeg(-0.1);
      const legR = makeLeg(0.1);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.24), shirtMat);
      torso.position.y = 0.28;
      hips.add(torso);

      const head = new THREE.Group();
      head.position.y = 0.68;
      const faceTex = helpers.createFaceTexture('happy', opts.skinHex);
      head.add(helpers.createHeadMesh(sMat, faceTex, 0.22, 0.24, 0.21));

      if (opts.capHex !== undefined) {
        const capMat = new THREE.MeshStandardMaterial({ color: opts.capHex, roughness: 0.5 });
        const crown = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.24), capMat);
        crown.position.set(0, 0.13, 0);
        head.add(crown);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.03, 0.12), capMat);
        visor.position.set(0, 0.095, 0.14);
        head.add(visor);
      }
      hips.add(head);

      const makeArm = (ax: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(ax, 0.46, 0);
        const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.11), shirtMat);
        sleeve.position.y = -0.08;
        pivot.add(sleeve);
        const fore = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.30, 0.095), sMat);
        fore.position.y = -0.29;
        pivot.add(fore);
        hips.add(pivot);
        return pivot;
      };
      const armL = makeArm(-0.27);
      const armR = makeArm(0.27);

      if (opts.withPaddle) {
        const paddle = createPickleballPaddleMesh(0x111827, opts.paddleAccent ?? 0x84cc16, 0x18181b, 1.0);
        paddle.rotation.x = Math.PI / 2;
        paddle.position.set(0, -0.44, 0.06);
        armR.add(paddle);
      }

      return { root, hips, armL, armR, legL, legR };
    };

    // 1. Animated Pickleball Rallies across Courts 01, 02, 04, 06
    const activeCourts = [
      { cx: 92.0, cz: 5.0, shirtA: 0x84cc16, shirtB: 0x06b6d4, phase: 0.0, speed: 1.55 },
      { cx: 104.0, cz: 5.0, shirtA: 0xf97316, shirtB: 0xec4899, phase: 1.2, speed: 1.75 },
      { cx: 92.0, cz: -16.2, shirtA: 0x3b82f6, shirtB: 0xfacc15, phase: 2.3, speed: 1.45 },
      { cx: 116.0, cz: -16.2, shirtA: 0xa855f7, shirtB: 0x10b981, phase: 0.7, speed: 1.65 },
    ];

    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xd9f99d,
      emissive: 0x84cc16,
      emissiveIntensity: 0.55,
      roughness: 0.35,
    });

    activeCourts.forEach((ct, ctIdx) => {
      const pA = buildCharacter({
        shirtHex: ct.shirtA,
        shortHex: 0x0f172a,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
        capHex: ct.shirtA,
        withPaddle: true,
        paddleAccent: ct.shirtA,
      });
      pA.root.position.set(ct.cx, 0, ct.cz + 3.4);
      pA.root.rotation.y = Math.PI;
      this.rootGroup.add(pA.root);
      const specA = ADULT_NPC_MODELS[(ctIdx * 2) % ADULT_NPC_MODELS.length];
      const glbA = attachGlbHumanToNpc({
        modelSource: specA.modelSource,
        hostGroup: pA.root,
        fallbackMeshes: [pA.hips],
        targetHeight: specA.targetHeight,
        clipProfile: specA.clipProfile,
        rotationY: specA.rotationY,
        initialState: 'Walk',
        phaseOffset: ct.phase,
        allowRainUmbrella: false,
      });

      const pB = buildCharacter({
        shirtHex: ct.shirtB,
        shortHex: 0x1e293b,
        skinHex: '#e0ac69',
        skinColor: 0xe0ac69,
        capHex: 0xf8fafc,
        withPaddle: true,
        paddleAccent: ct.shirtB,
      });
      pB.root.position.set(ct.cx, 0, ct.cz - 3.4);
      pB.root.rotation.y = 0;
      this.rootGroup.add(pB.root);
      const specB = ADULT_NPC_MODELS[(ctIdx * 2 + 1) % ADULT_NPC_MODELS.length];
      const glbB = attachGlbHumanToNpc({
        modelSource: specB.modelSource,
        hostGroup: pB.root,
        fallbackMeshes: [pB.hips],
        targetHeight: specB.targetHeight,
        clipProfile: specB.clipProfile,
        rotationY: specB.rotationY,
        initialState: 'Walk',
        phaseOffset: ct.phase + 1.1,
        allowRainUmbrella: false,
      });

      const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), ballMat);
      ballMesh.position.set(ct.cx, 1.1, ct.cz);
      this.rootGroup.add(ballMesh);

      this.rallies.push({
        courtX: ct.cx,
        courtZ: ct.cz,
        playerA: {
          root: pA.root,
          armL: pA.armL,
          armR: pA.armR,
          legL: pA.legL,
          legR: pA.legR,
          sideSign: 1,
          homePos: new THREE.Vector3(ct.cx, 0, ct.cz + 3.4),
          homeYaw: Math.PI,
          glbHandle: glbA,
        },
        playerB: {
          root: pB.root,
          armL: pB.armL,
          armR: pB.armR,
          legL: pB.legL,
          legR: pB.legR,
          sideSign: -1,
          homePos: new THREE.Vector3(ct.cx, 0, ct.cz - 3.4),
          homeYaw: 0,
          glbHandle: glbB,
        },
        ballMesh,
        phaseOffset: ct.phase,
        rallySpeed: ct.speed,
      });
    });

    // 2. RON PICKLEBALL Pro-Shop Staff, Browsers & Locker Zone Player
    const receptionist = buildCharacter({
      shirtHex: 0x84cc16,
      shortHex: 0x0f172a,
      skinHex: '#f1c27d',
      skinColor: 0xf1c27d,
      capHex: 0x0f172a,
    });
    receptionist.root.position.set(135.8, 0, -18.8);
    receptionist.root.rotation.y = 0;
    this.rootGroup.add(receptionist.root);
    this.shopNpcs.push({
      ...receptionist,
      mode: 'desk',
      originX: 135.8,
      originZ: -18.8,
      homePos: new THREE.Vector3(135.8, 0, -18.8),
      homeYaw: 0,
      phase: 0,
      glbHandle: attachGlbHumanToNpc({
        modelSource: CASHIER_NPC_MODEL.modelSource,
        hostGroup: receptionist.root,
        fallbackMeshes: [receptionist.hips],
        targetHeight: CASHIER_NPC_MODEL.targetHeight,
        clipProfile: CASHIER_NPC_MODEL.clipProfile,
        initialState: 'Idle',
        phaseOffset: 0.3,
      }),
    });

    const gearAdvisor = buildCharacter({
      shirtHex: 0x06b6d4,
      shortHex: 0x0f172a,
      skinHex: '#e0ac69',
      skinColor: 0xe0ac69,
      withPaddle: true,
      paddleAccent: 0x84cc16,
    });
    gearAdvisor.root.position.set(140.5, 0, 2.5);
    gearAdvisor.root.rotation.y = -Math.PI / 2;
    this.rootGroup.add(gearAdvisor.root);
    const advisorSpec = pickStationaryCivilianModel(1);
    this.shopNpcs.push({
      ...gearAdvisor,
      mode: 'advisor',
      originX: 140.5,
      originZ: 2.5,
      homePos: new THREE.Vector3(140.5, 0, 2.5),
      homeYaw: -Math.PI / 2,
      phase: 1.4,
      glbHandle: attachGlbHumanToNpc({
        modelSource: advisorSpec.modelSource,
        hostGroup: gearAdvisor.root,
        fallbackMeshes: [gearAdvisor.hips],
        targetHeight: advisorSpec.targetHeight,
        clipProfile: advisorSpec.clipProfile,
        rotationY: advisorSpec.rotationY,
        initialState: 'Idle',
        phaseOffset: 1.1,
      }),
    });

    const shopperA = buildCharacter({
      shirtHex: 0xf97316,
      shortHex: 0x334155,
      skinHex: '#f5cfa0',
      skinColor: 0xf5cfa0,
    });
    shopperA.root.position.set(132.4, 0, 7.6);
    shopperA.root.rotation.y = Math.PI / 2;
    this.rootGroup.add(shopperA.root);
    const shopperASpec = pickShopCustomerModel(2);
    this.shopNpcs.push({
      ...shopperA,
      mode: 'browse',
      originX: 132.4,
      originZ: 7.6,
      homePos: new THREE.Vector3(132.4, 0, 7.6),
      homeYaw: Math.PI / 2,
      phase: 0.6,
      glbHandle: attachGlbHumanToNpc({
        modelSource: shopperASpec.modelSource,
        hostGroup: shopperA.root,
        fallbackMeshes: [shopperA.hips],
        targetHeight: shopperASpec.targetHeight,
        clipProfile: shopperASpec.clipProfile,
        rotationY: shopperASpec.rotationY,
        initialState: 'Walk',
        phaseOffset: 1.8,
      }),
    });

    const shopperB = buildCharacter({
      shirtHex: 0xec4899,
      shortHex: 0x1e293b,
      skinHex: '#f1c27d',
      skinColor: 0xf1c27d,
    });
    shopperB.root.position.set(139.2, 0, -0.5);
    shopperB.root.rotation.y = -Math.PI / 2;
    this.rootGroup.add(shopperB.root);
    const shopperBSpec = pickShopCustomerModel(5);
    this.shopNpcs.push({
      ...shopperB,
      mode: 'browse',
      originX: 139.2,
      originZ: -0.5,
      homePos: new THREE.Vector3(139.2, 0, -0.5),
      homeYaw: -Math.PI / 2,
      phase: 2.1,
      glbHandle: attachGlbHumanToNpc({
        modelSource: shopperBSpec.modelSource,
        hostGroup: shopperB.root,
        fallbackMeshes: [shopperB.hips],
        targetHeight: shopperBSpec.targetHeight,
        clipProfile: shopperBSpec.clipProfile,
        rotationY: shopperBSpec.rotationY,
        initialState: 'Walk',
        phaseOffset: 2.5,
      }),
    });

    // Player Organizing Gear at Smart Locker Bank 13-18
    const lockerPlayer = buildCharacter({
      shirtHex: 0x38bdf8,
      shortHex: 0x0f172a,
      skinHex: '#e0ac69',
      skinColor: 0xe0ac69,
      capHex: 0x84cc16,
    });
    lockerPlayer.root.position.set(124.5, 0, -7.4);
    lockerPlayer.root.rotation.y = -Math.PI / 2;
    this.rootGroup.add(lockerPlayer.root);
    const lockerSpec = pickStationaryCivilianModel(4);
    this.shopNpcs.push({
      ...lockerPlayer,
      mode: 'locker',
      originX: 124.5,
      originZ: -7.4,
      homePos: new THREE.Vector3(124.5, 0, -7.4),
      homeYaw: -Math.PI / 2,
      phase: 0.8,
      glbHandle: attachGlbHumanToNpc({
        modelSource: lockerSpec.modelSource,
        hostGroup: lockerPlayer.root,
        fallbackMeshes: [lockerPlayer.hips],
        targetHeight: lockerSpec.targetHeight,
        clipProfile: lockerSpec.clipProfile,
        rotationY: lockerSpec.rotationY,
        initialState: 'Idle',
        phaseOffset: 3.1,
      }),
    });
  }

  private buildArenaExitPath(cx: number, p: THREE.Vector3, needsBypassNet: boolean): THREE.Vector3[] {
    const gateX = 104.0;
    const pts: THREE.Vector3[] = [];
    if (needsBypassNet) {
      const sideX = cx < 105.0 ? cx + 3.4 : cx - 3.4;
      pts.push(new THREE.Vector3(sideX, 0, p.z));
      pts.push(new THREE.Vector3(sideX, 0, p.z + 4.8));
    }
    if (p.z < 10.0) {
      pts.push(new THREE.Vector3(gateX, 0, 12.2));
    }
    pts.push(new THREE.Vector3(gateX, 0, 15.5));
    pts.push(new THREE.Vector3(gateX, 0, 18.2));
    return pts;
  }

  private buildShopExitPath(s: ShopNpcSim): THREE.Vector3[] {
    const p = s.root.position;
    if (s.mode === 'locker') {
      return [
        new THREE.Vector3(126.5, 0, 3.0),
        new THREE.Vector3(131.6, 0, 7.5),
        new THREE.Vector3(133.0, 0, 15.5),
        new THREE.Vector3(133.0, 0, 18.2),
      ];
    }
    if (s.mode === 'desk') {
      return [
        new THREE.Vector3(131.6, 0, -18.0),
        new THREE.Vector3(131.6, 0, 7.5),
        new THREE.Vector3(133.0, 0, 15.5),
        new THREE.Vector3(133.0, 0, 18.2),
      ];
    }
    if (p.x >= 137.0) {
      return [
        new THREE.Vector3(139.5, 0, 7.5),
        new THREE.Vector3(133.0, 0, 12.2),
        new THREE.Vector3(133.0, 0, 15.5),
        new THREE.Vector3(133.0, 0, 18.2),
      ];
    }
    return [
      new THREE.Vector3(132.4, 0, 12.2),
      new THREE.Vector3(133.0, 0, 15.5),
      new THREE.Vector3(133.0, 0, 18.2),
    ];
  }

  private beginClosingEvacuation() {
    this.closingActive = true;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;

    for (const r of this.rallies) {
      r.ballMesh.visible = false;
      for (const actor of [r.playerA, r.playerB]) {
        actor.armR.rotation.set(0, 0, 0);
        actor.armL.rotation.set(0, 0, 0);
        actor.glbHandle?.setAnimState('Walk', 1.25);
        actor.exitPath = this.buildArenaExitPath(r.courtX, actor.root.position, actor.sideSign < 0);
        actor.exitWp = { idx: 0 };
        actor.exitPhase = { phase: Math.random() * 4 };
        actor.exitDone = false;
      }
    }
    for (const s of this.shopNpcs) {
      s.armR.rotation.set(0, 0, 0);
      s.armL.rotation.set(0, 0, 0);
      s.glbHandle?.setAnimState('Walk', 1.25);
      s.exitPath = this.buildShopExitPath(s);
      s.exitWp = { idx: 0 };
      s.exitPhase = { phase: Math.random() * 4 };
      s.exitDone = false;
    }
  }

  private hideAllNpcsImmediate() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (const r of this.rallies) {
      r.ballMesh.visible = false;
      r.playerA.root.visible = false;
      r.playerB.root.visible = false;
    }
    for (const s of this.shopNpcs) {
      s.root.visible = false;
    }
  }

  private restoreForOpen() {
    this.closingActive = false;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    for (const r of this.rallies) {
      r.ballMesh.visible = true;
      for (const actor of [r.playerA, r.playerB]) {
        actor.root.visible = true;
        actor.root.position.copy(actor.homePos);
        actor.root.rotation.y = actor.homeYaw;
        actor.legL.rotation.x = 0;
        actor.legR.rotation.x = 0;
        actor.armL.rotation.set(0, 0, 0);
        actor.armR.rotation.set(0, 0, 0);
        actor.glbHandle?.setAnimState('Walk');
        actor.exitDone = false;
      }
    }
    for (const s of this.shopNpcs) {
      s.root.visible = true;
      s.root.position.copy(s.homePos);
      s.root.rotation.y = s.homeYaw;
      s.legL.rotation.x = 0;
      s.legR.rotation.x = 0;
      s.armL.rotation.set(0, 0, 0);
      s.armR.rotation.set(0, 0, 0);
      s.glbHandle?.setAnimState(s.mode === 'browse' ? 'Walk' : 'Idle');
      s.exitDone = false;
    }
  }

  public hasExitingNpcNearDoor(): boolean {
    if (!this.closingActive) return false;
    const nearProShop = (p: THREE.Vector3, visible: boolean) =>
      visible && p.x >= 130.0 && p.x <= 136.0 && p.z >= 12.0 && p.z <= 19.5;
    for (const s of this.shopNpcs) {
      if (nearProShop(s.root.position, s.root.visible)) return true;
    }
    return false;
  }

  public hasExitingNpcNearArenaGate(): boolean {
    if (!this.closingActive) return false;
    for (const r of this.rallies) {
      for (const actor of [r.playerA, r.playerB]) {
        const p = actor.root.position;
        if (actor.root.visible && Math.abs(p.x - 104.0) < 3.8 && p.z >= 10.5 && p.z <= 19.0) {
          return true;
        }
      }
    }
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public update(delta: number, rawHour: number = 12.0) {
    const isOpen = isRonPickleballOpenAtHour(rawHour);

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
      const exitSpeed = 2.4;

      for (const r of this.rallies) {
        for (const actor of [r.playerA, r.playerB]) {
          if (actor.exitDone || !actor.root.visible) continue;
          if (!actor.exitPath || !actor.exitWp || !actor.exitPhase) {
            actor.root.visible = false;
            actor.exitDone = true;
            continue;
          }
          const done = advanceNpcExitPath(
            actor.root,
            actor.exitPath,
            actor.exitWp,
            exitSpeed,
            delta,
            { legL: actor.legL, legR: actor.legR, armL: actor.armL, armR: actor.armR },
            actor.exitPhase
          );
          if (done || this.closingTimer > 36.0) {
            actor.root.visible = false;
            actor.exitDone = true;
          } else {
            anyRemaining = true;
          }
        }
      }

      for (const s of this.shopNpcs) {
        if (s.exitDone || !s.root.visible) continue;
        if (!s.exitPath || !s.exitWp || !s.exitPhase) {
          s.root.visible = false;
          s.exitDone = true;
          continue;
        }
        const done = advanceNpcExitPath(
          s.root,
          s.exitPath,
          s.exitWp,
          exitSpeed,
          delta,
          { legL: s.legL, legR: s.legR, armL: s.armL, armR: s.armR },
          s.exitPhase
        );
        if (done || this.closingTimer > 36.0) {
          s.root.visible = false;
          s.exitDone = true;
        } else {
          anyRemaining = true;
        }
      }

      if (!anyRemaining) {
        this.closingActive = false;
        this.fullyClosedAndEmpty = true;
      }
      return;
    }

    this.elapsed += delta;

    for (const r of this.rallies) {
      const t = this.elapsed * r.rallySpeed + r.phaseOffset;
      const rallyCos = Math.cos(t);
      const lateralX = Math.sin(t * 0.7) * 1.65;

      r.playerA.root.position.x = r.courtX + lateralX * 0.85;
      r.playerB.root.position.x = r.courtX - lateralX * 0.75;

      const strideA = Math.sin(t * 3.0) * 0.25;
      r.playerA.legL.rotation.x = strideA;
      r.playerA.legR.rotation.x = -strideA;

      const strideB = Math.cos(t * 3.0) * 0.25;
      r.playerB.legL.rotation.x = strideB;
      r.playerB.legR.rotation.x = -strideB;

      const swingA = Math.max(0, rallyCos) * Math.sin(t * 2.0) * 1.25;
      r.playerA.armR.rotation.x = -0.55 - swingA;
      r.playerA.armR.rotation.z = -0.22;

      const swingB = Math.max(0, -rallyCos) * Math.sin(t * 2.0) * 1.25;
      r.playerB.armR.rotation.x = -0.55 - swingB;
      r.playerB.armR.rotation.z = -0.22;

      const ballZ = r.courtZ + rallyCos * 3.1;
      const arcLift = Math.max(0, 1 - rallyCos * rallyCos);
      const ballY = 0.72 + arcLift * 1.15;
      const ballX = r.courtX + THREE.MathUtils.lerp(-lateralX * 0.75, lateralX * 0.85, (rallyCos + 1) * 0.5);
      r.ballMesh.position.set(ballX, ballY, ballZ);
    }

    for (const s of this.shopNpcs) {
      const t = this.elapsed + s.phase;
      if (s.mode === 'desk') {
        s.armR.rotation.x = -0.25 + Math.sin(t * 2.1) * 0.15;
        s.root.rotation.y = Math.sin(t * 0.7) * 0.25;
      } else if (s.mode === 'advisor') {
        s.armR.rotation.x = -0.45 + Math.sin(t * 2.4) * 0.45;
        s.root.rotation.y = -Math.PI / 2 + Math.sin(t * 0.6) * 0.2;
      } else if (s.mode === 'locker') {
        s.armR.rotation.x = -0.65 + Math.sin(t * 1.8) * 0.22;
        s.armL.rotation.x = -0.35 + Math.cos(t * 1.8) * 0.15;
      } else {
        s.root.position.z = s.originZ + Math.sin(t * 0.75) * 0.65;
        const walk = Math.cos(t * 3.0) * 0.18;
        s.legL.rotation.x = walk;
        s.legR.rotation.x = -walk;
      }
    }
  }
}
