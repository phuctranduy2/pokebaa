import * as THREE from 'three';
import type { HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  attachGlbHumanToNpc,
  type GlbHumanHandle,
} from './GlbHumanNpcSystem';
import {
  pickOutsideNpcModel,
  pickSchoolStudentModel,
  pickStationaryCivilianModel,
  TEACHER_NPC_MODEL,
} from './NpcModelCatalog';
import { SCHOOL_PODIUM_Y } from './PhanChuTrinhSchoolSystem';

// =========================================================================
// WEST SCHOOL DISTRICT BOUNDS (Directly West of Trường THPT Phan Châu Trinh)
// 1. Nhà Sách Tổng Hợp FAHASA & Hobby Manga (2 Floors): X = -393.0..-363.0, Z = 42.5..92.0
// 2. Pedestrian Lantern Alley (Hẻm Đèn Lồng):            X = -395.0..-393.0, Z = 42.5..94.0
// 3. Phố Ăn Vặt Cổng Trường & Trà Sữa Học Đường:         X = -425.0..-395.0, Z = 42.5..92.0
// 4. Sân Bóng Rổ 3x3 & Công Viên Thanh Niên Skatepark:    X = -425.0..-363.0, Z = 94.0..148.0
// =========================================================================
export const FAHASA_BOOKSTORE_MIN_X = -393.0;
export const FAHASA_BOOKSTORE_MAX_X = -363.0;
export const FAHASA_BOOKSTORE_MIN_Z = 42.5;
export const FAHASA_BOOKSTORE_MAX_Z = 92.0;
export const FAHASA_BOOKSTORE_BLDG_MIN_X = -391.6;
export const FAHASA_BOOKSTORE_BLDG_MAX_X = -364.4;
export const FAHASA_BOOKSTORE_BLDG_MIN_Z = 48.0;
export const FAHASA_BOOKSTORE_BLDG_MAX_Z = 88.0;
export const FAHASA_BOOKSTORE_FLOOR_H = 4.2;

export const SNACK_ALLEY_MIN_X = -425.0;
export const SNACK_ALLEY_MAX_X = -395.0;
export const SNACK_ALLEY_MIN_Z = 42.5;
export const SNACK_ALLEY_MAX_Z = 92.0;

export const YOUTH_PARK_MIN_X = -425.0;
export const YOUTH_PARK_MAX_X = -363.0;
export const YOUTH_PARK_MIN_Z = 94.0;
export const YOUTH_PARK_MAX_Z = 148.0;

export interface WestSchoolDistrictBuildResult {
  staticGroup: THREE.Group;
  dynamicGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  update: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
}

// =========================================================================
// COLLIDERS (FLOORS 1 & 2)
// =========================================================================
function buildWestSchoolDistrictColliders(): IntersectionColliderBox[] {
  const cols: IntersectionColliderBox[] = [
    // -------------------------------------------------------------------
    // 1. FAHASA BOOKSTORE & HOBBY MANGA (Building X = -391.6..-364.4, Z = 48.0..88.0)
    //    Front entrance OPEN: X = -380.2..-375.8 at Z = 48.0
    //    Rear door OPEN:      X = -380.0..-376.0 at Z = 88.0
    // -------------------------------------------------------------------
    { minX: -391.9, maxX: -391.3, minZ: 47.8, maxZ: 88.2, floor: 'both' },
    { minX: -364.7, maxX: -364.1, minZ: 47.8, maxZ: 88.2, floor: 'both' },
    { minX: -391.8, maxX: -380.2, minZ: 47.7, maxZ: 48.3, floor: 1 },
    { minX: -375.8, maxX: -364.2, minZ: 47.7, maxZ: 48.3, floor: 1 },
    { minX: -391.8, maxX: -380.0, minZ: 87.7, maxZ: 88.3, floor: 1 },
    { minX: -376.0, maxX: -364.2, minZ: 87.7, maxZ: 88.3, floor: 1 },
    { minX: -391.8, maxX: -364.2, minZ: 47.7, maxZ: 48.3, floor: 2 },
    { minX: -391.8, maxX: -364.2, minZ: 87.7, maxZ: 88.3, floor: 2 },
    // Front bicycle rack & architectural planters
    { minX: -391.2, maxX: -385.2, minZ: 43.8, maxZ: 46.2, floor: 1 },
    { minX: -371.2, maxX: -365.4, minZ: 43.6, maxZ: 46.2, floor: 1 },
    // Floor 1 Cashier Counter & Photocopy Station
    { minX: -390.6, maxX: -384.2, minZ: 51.0, maxZ: 54.0, floor: 1 },
    { minX: -370.8, maxX: -365.0, minZ: 51.0, maxZ: 54.6, floor: 1 },
    // Floor 1 Center Feature Check-in Book Island
    { minX: -378.8, maxX: -375.2, minZ: 55.2, maxZ: 57.6, floor: 1 },
    // Floor 1 Four Bookshelf Aisles
    { minX: -388.4, maxX: -386.6, minZ: 60.5, maxZ: 74.5, floor: 1 },
    { minX: -383.2, maxX: -381.4, minZ: 60.5, maxZ: 74.5, floor: 1 },
    { minX: -374.6, maxX: -372.8, minZ: 60.5, maxZ: 74.5, floor: 1 },
    { minX: -369.4, maxX: -367.6, minZ: 60.5, maxZ: 74.5, floor: 1 },
    // Switchback Stairwell Guard Walls (X = -391.2..-387.0, Z = 78.0..84.4)
    { minX: -389.22, maxX: -388.98, minZ: 78.4, maxZ: 82.8, floor: 'both' },
    { minX: -387.12, maxX: -386.88, minZ: 78.0, maxZ: 84.5, floor: 'both' },
    { minX: -391.3, maxX: -386.9, minZ: 84.3, maxZ: 84.65, floor: 'both' },
    { minX: -391.2, maxX: -389.0, minZ: 77.85, maxZ: 78.15, floor: 2 },
    // Floor 2 Reading Lounge, Figure Cabinets, Manga Aisles & Card-Duel Tables
    { minX: -388.8, maxX: -382.6, minZ: 52.8, maxZ: 57.6, floor: 2 },
    { minX: -371.6, maxX: -365.4, minZ: 54.0, maxZ: 65.5, floor: 2 },
    { minX: -371.6, maxX: -365.4, minZ: 68.5, maxZ: 77.0, floor: 2 },
    { minX: -381.8, maxX: -374.2, minZ: 62.0, maxZ: 72.0, floor: 2 },
    { minX: -382.2, maxX: -377.8, minZ: 79.4, maxZ: 82.8, floor: 2 },
    { minX: -375.2, maxX: -370.8, minZ: 79.4, maxZ: 82.8, floor: 2 },

    // -------------------------------------------------------------------
    // 2. PHỐ ĂN VẶT CỔNG TRƯỜNG (X = -425.0..-395.0, Z = 42.5..92.0)
    //    Central promenade X = -413.5..-406.5 is completely OPEN!
    // -------------------------------------------------------------------
    { minX: -415.4, maxX: -414.2, minZ: 42.7, maxZ: 43.8, floor: 1 },
    { minX: -405.8, maxX: -404.6, minZ: 42.7, maxZ: 43.8, floor: 1 },
    // 4 Food & Drink Kiosks (Hollow walk-in interiors with open North staff doors!)
    ...[53.5, 69.5].flatMap((kz) => [
      // West kiosks (cx = -421.1, door at North X = -422.85..-421.55)
      { minX: -419.15, maxX: -417.95, minZ: kz - 4.35, maxZ: kz + 4.35, floor: 1 as const },
      { minX: -423.85, maxX: -422.75, minZ: kz - 4.35, maxZ: kz + 4.35, floor: 1 as const },
      { minX: -423.85, maxX: -418.45, minZ: kz + 3.98, maxZ: kz + 4.35, floor: 1 as const },
      { minX: -423.85, maxX: -422.85, minZ: kz - 4.35, maxZ: kz - 3.98, floor: 1 as const },
      { minX: -421.55, maxX: -418.45, minZ: kz - 4.35, maxZ: kz - 3.98, floor: 1 as const },
      // East kiosks (cx = -398.9, door at North X = -398.45..-397.15)
      { minX: -402.05, maxX: -400.85, minZ: kz - 4.35, maxZ: kz + 4.35, floor: 1 as const },
      { minX: -397.25, maxX: -396.15, minZ: kz - 4.35, maxZ: kz + 4.35, floor: 1 as const },
      { minX: -401.55, maxX: -396.15, minZ: kz + 3.98, maxZ: kz + 4.35, floor: 1 as const },
      { minX: -401.55, maxX: -398.45, minZ: kz - 4.35, maxZ: kz - 3.98, floor: 1 as const },
      { minX: -397.15, maxX: -396.15, minZ: kz - 4.35, maxZ: kz - 3.98, floor: 1 as const },
    ]),
    // Outdoor Street Dining Table Clusters
    { minX: -416.8, maxX: -414.2, minZ: 50.5, maxZ: 53.0, floor: 1 },
    { minX: -416.8, maxX: -414.2, minZ: 58.5, maxZ: 61.0, floor: 1 },
    { minX: -416.8, maxX: -414.2, minZ: 67.5, maxZ: 70.0, floor: 1 },
    { minX: -416.8, maxX: -414.2, minZ: 77.0, maxZ: 79.5, floor: 1 },
    { minX: -405.8, maxX: -403.2, minZ: 50.5, maxZ: 53.0, floor: 1 },
    { minX: -405.8, maxX: -403.2, minZ: 58.5, maxZ: 61.0, floor: 1 },
    { minX: -405.8, maxX: -403.2, minZ: 67.5, maxZ: 70.0, floor: 1 },
    { minX: -405.8, maxX: -403.2, minZ: 77.0, maxZ: 79.5, floor: 1 },
    // Alley bike rack & neon check-in planter at Z=82..86
    { minX: -424.2, maxX: -418.5, minZ: 82.0, maxZ: 86.2, floor: 1 },

    // -------------------------------------------------------------------
    // 3. SÂN BÓNG RỔ 3x3 & CÔNG VIÊN THANH NIÊN SKATEPARK (Z = 94.0..148.0)
    // -------------------------------------------------------------------
    { minX: -393.3, maxX: -381.0, minZ: 95.8, maxZ: 96.4, floor: 1 }, // N fence L
    { minX: -375.5, maxX: -363.8, minZ: 95.8, maxZ: 96.4, floor: 1 }, // N fence R
    { minX: -393.3, maxX: -363.8, minZ: 145.6, maxZ: 146.3, floor: 1 }, // S fence
    // E fence opens at Z = 101.4 .. 105.6 directly facing Phan Châu Trinh School's Cổng Sân Bóng Rổ!
    { minX: -364.4, maxX: -363.7, minZ: 96.0, maxZ: 101.4, floor: 1 }, // E fence N-segment
    { minX: -364.4, maxX: -363.7, minZ: 105.6, maxZ: 146.2, floor: 1 }, // E fence S-segment
    { minX: -393.3, maxX: -392.7, minZ: 96.0, maxZ: 118.0, floor: 1 }, // W fence N-half
    { minX: -393.3, maxX: -392.7, minZ: 124.0, maxZ: 146.2, floor: 1 }, // W fence S-half
    { minX: -379.2, maxX: -377.8, minZ: 98.4, maxZ: 99.6, floor: 1 },
    { minX: -379.2, maxX: -377.8, minZ: 142.4, maxZ: 143.6, floor: 1 },
    { minX: -367.4, maxX: -364.5, minZ: 108.0, maxZ: 134.0, floor: 1 },
    // Fountain, Skatepark obstacles, Vending Machine & Outer Perimeter
    { minX: -412.8, maxX: -407.2, minZ: 100.7, maxZ: 106.3, floor: 1 },
    { minX: -423.8, maxX: -419.6, minZ: 118.0, maxZ: 138.0, floor: 1 },
    { minX: -401.2, maxX: -397.2, minZ: 118.0, maxZ: 138.0, floor: 1 },
    { minX: -413.2, maxX: -407.8, minZ: 126.5, maxZ: 132.5, floor: 1 },
    { minX: -414.5, maxX: -406.5, minZ: 120.0, maxZ: 121.0, floor: 1 },
    { minX: -424.2, maxX: -421.8, minZ: 98.5, maxZ: 102.5, floor: 1 },
    // South Skatepark Mural Wall (24m wide at X = -410, Z = 146.6; leaves West plaza & South X=-397.8..-393.4 entrance open!)
    { minX: -422.1, maxX: -397.9, minZ: 146.3, maxZ: 147.0, floor: 1 },
  ];
  return cols;
}

export const WEST_SCHOOL_DISTRICT_COLLIDERS: IntersectionColliderBox[] = buildWestSchoolDistrictColliders();

// =========================================================================
// PROCEDURAL CANVAS TEXTURES (HIGH-RES SRGBColorSpace + ANISOTROPY)
// =========================================================================
function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startPx: number,
  minPx: number,
  fontStack = 'system-ui, sans-serif'
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

function createFlagshipSignTex(
  bgTop: string,
  bgBot: string,
  border: string,
  title: string,
  subtitle: string,
  titleColor = '#ffffff',
  subColor = '#fef08a',
  w = 1024,
  h = 224
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(1, bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural glass sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.20)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = border;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  drawFittedText(ctx, title, w / 2 + 4, h * 0.38 + 4, w - 70, Math.round(h * 0.34), 24);
  ctx.fillStyle = titleColor;
  ctx.shadowColor = 'rgba(255,255,255,0.45)';
  ctx.shadowBlur = 10;
  drawFittedText(ctx, title, w / 2, h * 0.38, w - 70, Math.round(h * 0.34), 24);
  ctx.shadowBlur = 0;

  ctx.fillStyle = subColor;
  drawFittedText(ctx, subtitle, w / 2, h * 0.74, w - 70, Math.round(h * 0.17), 14);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKioskMenuTex(
  title: string,
  items: string[],
  headerBg: string,
  accentHex: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 768, 256);

  // Diagonal street-food header stripe
  const grad = ctx.createLinearGradient(0, 0, 768, 0);
  grad.addColorStop(0, headerBg);
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 92);

  // Neon double border frame
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 752, 240);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 732, 220);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  drawFittedText(ctx, title, 387, 51, 700, 44, 22);
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, title, 384, 48, 700, 44, 22);

  // Menu rows with dotted price pills
  items.forEach((line, idx) => {
    const ry = 134 + idx * 54;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(36, ry - 20, 696, 40);
    ctx.fillStyle = accentHex;
    drawFittedText(ctx, line, 384, ry, 670, 28, 16);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKioskSidePosterTex(
  title: string,
  badge: string,
  bgHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 512);

  // Bold diagonal pop-art stripes
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = -256; i < 768; i += 96) {
    ctx.beginPath();
    ctx.moveTo(i, 512);
    ctx.lineTo(i + 180, 0);
    ctx.lineTo(i + 230, 0);
    ctx.lineTo(i + 50, 512);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 14;
  ctx.strokeRect(14, 14, 484, 484);

  // Center starburst emblem
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(42, 130, 428, 252);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeRect(42, 130, 428, 252);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentHex;
  drawFittedText(ctx, badge, 256, 185, 390, 34, 18);
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, title, 256, 265, 390, 54, 22);
  ctx.fillStyle = '#fde047';
  drawFittedText(ctx, 'OPEN 06:30 - 23:30 • TAKE AWAY', 256, 338, 390, 26, 14);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBladeSignTex(top: string, mid: string, bot: string, bg: string, border: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = border;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 236, 492);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = border;
  drawFittedText(ctx, top, 128, 110, 210, 52, 24);
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, mid, 128, 256, 210, 44, 22);
  ctx.fillStyle = '#fef08a';
  drawFittedText(ctx, bot, 128, 395, 210, 38, 18);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGraffitiMuralTex(headline: string, tag: string, bgHex: string, colA: string, colB: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 1024, 384);

  // Dynamic diagonal street-art geometric stripes & spray splashes
  ctx.fillStyle = colA;
  ctx.beginPath();
  ctx.moveTo(0, 280);
  ctx.lineTo(360, 40);
  ctx.lineTo(520, 40);
  ctx.lineTo(160, 384);
  ctx.lineTo(0, 384);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = colB;
  ctx.beginPath();
  ctx.moveTo(580, 384);
  ctx.lineTo(910, 0);
  ctx.lineTo(1024, 0);
  ctx.lineTo(1024, 220);
  ctx.lineTo(810, 384);
  ctx.closePath();
  ctx.fill();

  // Spray circles
  const splashes = [
    [160, 105, 42, colB],
    [840, 290, 55, colA],
    [512, 82, 28, '#fef08a'],
  ] as const;
  splashes.forEach(([sx, sy, sr, sc]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = sc;
    ctx.globalAlpha = 0.72;
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Outline border & graffiti block lettering
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 1004, 364);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#090d14';
  drawFittedText(ctx, headline, 518, 174, 920, 96, 36, 'Impact, "Arial Black", sans-serif');
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, headline, 512, 168, 920, 96, 36, 'Impact, "Arial Black", sans-serif');

  ctx.fillStyle = '#fef08a';
  drawFittedText(ctx, tag, 512, 292, 860, 44, 20);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPageEdgesTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f5efe2';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 256; i += 4) {
    ctx.fillStyle = i % 8 === 0 ? 'rgba(130, 102, 70, 0.14)' : 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(0, i, 256, 2);
  }
  const edgeShade = ctx.createLinearGradient(0, 0, 256, 0);
  edgeShade.addColorStop(0, 'rgba(65, 45, 25, 0.18)');
  edgeShade.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
  edgeShade.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
  edgeShade.addColorStop(1, 'rgba(65, 45, 25, 0.18)');
  ctx.fillStyle = edgeShade;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

type BookShelfTheme = 'textbook' | 'manga' | 'literature' | 'art';

function createBookSpinesTex(theme: BookShelfTheme, variant = 0): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Dark walnut shadow interior behind book tops
  ctx.fillStyle = '#241710';
  ctx.fillRect(0, 0, 512, 256);

  const palettes: Record<BookShelfTheme, { bg: string; band: string; text: string }[]> = {
    textbook: [
      { bg: '#1e3a8a', band: '#facc15', text: '#ffffff' },
      { bg: '#b91c1c', band: '#fef08a', text: '#ffffff' },
      { bg: '#0f766e', band: '#99f6e4', text: '#ffffff' },
      { bg: '#f8fafc', band: '#dc2626', text: '#0f172a' },
      { bg: '#b45309', band: '#fef3c7', text: '#ffffff' },
      { bg: '#15803d', band: '#dcfce7', text: '#ffffff' },
      { bg: '#334155', band: '#38bdf8', text: '#ffffff' },
    ],
    manga: [
      { bg: '#f8fafc', band: '#e11d48', text: '#0f172a' },
      { bg: '#f8fafc', band: '#0284c7', text: '#0f172a' },
      { bg: '#18181b', band: '#f59e0b', text: '#f8fafc' },
      { bg: '#18181b', band: '#ef4444', text: '#f8fafc' },
      { bg: '#047857', band: '#fde047', text: '#ffffff' },
      { bg: '#4338ca', band: '#f472b6', text: '#ffffff' },
      { bg: '#fef2f2', band: '#be123c', text: '#1e293b' },
    ],
    literature: [
      { bg: '#7f1d1d', band: '#eab308', text: '#fef3c7' },
      { bg: '#ede7d9', band: '#7c2d12', text: '#1c1917' },
      { bg: '#1e293b', band: '#fbbf24', text: '#f8fafc' },
      { bg: '#3f6212', band: '#fef08a', text: '#ffffff' },
      { bg: '#9a3412', band: '#fed7aa', text: '#ffffff' },
      { bg: '#4c1d95', band: '#e9d5ff', text: '#ffffff' },
      { bg: '#292524', band: '#d6d3d1', text: '#fafaf9' },
    ],
    art: [
      { bg: '#0f172a', band: '#38bdf8', text: '#ffffff' },
      { bg: '#be123c', band: '#fde047', text: '#ffffff' },
      { bg: '#d97706', band: '#1e293b', text: '#ffffff' },
      { bg: '#e2e8f0', band: '#0f172a', text: '#0f172a' },
      { bg: '#0369a1', band: '#bae6fd', text: '#ffffff' },
      { bg: '#6d28d9', band: '#f9a8d4', text: '#ffffff' },
    ],
  };

  const swatches = palettes[theme];
  const widths = [34, 30, 38, 32, 42, 30, 36, 34, 40, 32, 36, 30, 38, 34, 36];
  const tops = [10, 26, 16, 4, 22, 12, 30, 8, 18, 24, 6, 14, 28, 10, 20];

  let x = 2;
  let idx = 0;
  while (x < 508) {
    const rawW = widths[(idx + variant * 3) % widths.length];
    const bw = Math.min(rawW, 510 - x);
    if (bw < 14) break;
    const topY = tops[(idx + variant * 5) % tops.length];
    const h = 256 - topY;
    const sw = swatches[(theme === 'manga' ? Math.floor(idx / 3) + variant : idx + variant * 2) % swatches.length];

    // Base spine rectangle
    ctx.fillStyle = sw.bg;
    ctx.fillRect(x, topY, bw - 2, h);

    // Top & bottom publisher bands / foil stripes
    ctx.fillStyle = sw.band;
    ctx.fillRect(x, topY + 14, bw - 2, 12);
    ctx.fillRect(x, 224, bw - 2, 18);

    // Subtle vertical title bar / spine text glyphs
    ctx.fillStyle = sw.text;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x + Math.floor((bw - 2) * 0.44), topY + 38, Math.max(3, Math.floor(bw * 0.14)), Math.max(24, h - 105));
    ctx.globalAlpha = 1;

    // Volume number dot / publisher logo at foot
    ctx.fillStyle = sw.text;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const volLabel = theme === 'manga' ? `${((idx % 9) + 1).toString().padStart(2, '0')}` : '•';
    ctx.fillText(volLabel, x + (bw - 2) * 0.5, 233);

    // 3D cylindrical spine highlight & dark crevice between books
    const cyl = ctx.createLinearGradient(x, 0, x + bw - 2, 0);
    cyl.addColorStop(0, 'rgba(255,255,255,0.22)');
    cyl.addColorStop(0.28, 'rgba(255,255,255,0.04)');
    cyl.addColorStop(0.75, 'rgba(0,0,0,0.12)');
    cyl.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = cyl;
    ctx.fillRect(x, topY, bw - 2, h);

    // Crisp 2px gap shadow between books
    ctx.fillStyle = '#120b07';
    ctx.fillRect(x + bw - 2, 0, 2, 256);

    x += bw;
    idx++;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createFeaturedCoverTex(
  title: string,
  subtitle: string,
  bgTop: string,
  bgBot: string,
  accent: string,
  badge: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 360;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 360);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(1, bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 360);

  // Decorative editorial artwork motif
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(178, 165, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.fillRect(22, 108, 66, 6);
  ctx.globalAlpha = 1;

  // Spine crease line & clean frame
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.fillRect(0, 0, 12, 360);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 236, 340);

  // Top publisher / genre badge
  ctx.fillStyle = accent;
  ctx.fillRect(22, 24, 150, 30);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawFittedText(ctx, badge, 97, 39, 136, 17, 11);

  // Bold book title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, title, 22, 160, 210, 36, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  drawFittedText(ctx, subtitle, 22, 212, 206, 20, 12);

  // Bottom wrap-around Obi strip
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 286, 256, 52);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 286, 256, 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  drawFittedText(ctx, 'FAHASA RECOMMENDED', 128, 315, 224, 17, 11);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createFahasaPosScreenTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 340;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 340);

  // Header Bar
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FAHASA POS v4.2  •  QUẦY 01', 16, 23);
  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'right';
  ctx.fillText('ONLINE ●', 494, 23);

  // Left Cart Items List
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(14, 60, 290, 224);
  const rows = [
    ['Toán Nâng Cao 12 (x1)', '42.000₫'],
    ['One Piece Tập 108 (x2)', '50.000₫'],
    ['Đắc Nhân Tâm Bìa Cứng', '86.000₫'],
    ['Bút Gel Thiên Long (x3)', '18.000₫'],
  ];
  rows.forEach(([name, price], i) => {
    const ry = 76 + i * 50;
    ctx.fillStyle = i % 2 === 0 ? '#263449' : '#1e293b';
    ctx.fillRect(20, ry, 278, 42);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, 28, ry + 21);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(price, 290, ry + 21);
  });

  // Right Keypad & Checkout Buttons
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(316, 60, 182, 224);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TỔNG CỘNG:', 328, 86);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('196.000₫', 328, 118);

  const btns = [
    ['TIỀN MẶT', '#0ea5e9', 150],
    ['VIETQR / NFC', '#10b981', 196],
    ['THANH TOÁN', '#f59e0b', 242],
  ] as const;
  btns.forEach(([lbl, col, by]) => {
    ctx.fillStyle = col;
    ctx.fillRect(326, by, 162, 34);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, 407, by + 17);
  });

  // Bottom Status Ribbon
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(14, 294, 484, 34);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Sẵn sàng quét mã vạch • Thành viên FAHASA Gold (-5%)', 24, 311);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createFahasaCfdTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 384, 256);
  grad.addColorStop(0, '#991b1b');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 384, 256);

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 368, 240);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('NHÀ SÁCH FAHASA', 192, 50);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(30, 82, 324, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('TỔNG THANH TOÁN', 192, 108);
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('196.000 VNĐ', 192, 148);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '15px sans-serif';
  ctx.fillText('CẢM ƠN QUÝ KHÁCH • HẸN GẶP LẠI!', 192, 212);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createFahasaQrStandTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 320);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VIETQR • NFC', 128, 28);

  // Stylized QR Matrix
  ctx.fillStyle = '#0f172a';
  const qrX = 48;
  const qrY = 74;
  const cell = 10;
  for (let r = 0; r < 16; r++) {
    for (let col = 0; col < 16; col++) {
      const isCorner = (r < 4 && col < 4) || (r < 4 && col >= 12) || (r >= 12 && col < 4);
      const fill = isCorner ? ((r === 1 || r === 2) && (col === 1 || col === 2 || col === 13 || col === 14) ? false : true) : ((r * 7 + col * 11) % 3 === 0);
      if (fill) ctx.fillRect(qrX + col * cell, qrY + r * cell, cell - 1, cell - 1);
    }
  }

  ctx.fillStyle = '#0f766e';
  ctx.fillRect(24, 252, 208, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('QUÉT HOẶC CHẠM THẺ', 128, 274);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSkateparkDeckTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 1024, 1024);

  // Superkilen-inspired tactical urbanism flow zones
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(48, 48, 928, 928);

  // Diagonal electric teal & coral skate tracks
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.moveTo(80, 180);
  ctx.lineTo(944, 180);
  ctx.lineTo(944, 340);
  ctx.lineTo(80, 340);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.moveTo(80, 684);
  ctx.lineTo(944, 684);
  ctx.lineTo(944, 844);
  ctx.lineTo(80, 844);
  ctx.closePath();
  ctx.fill();

  // Center circular plaza crest
  ctx.beginPath();
  ctx.arc(512, 512, 175, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 44px Impact, sans-serif';
  ctx.fillText('SKATEPARK', 512, 492);
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('THANH NIÊN', 512, 542);

  // Subtle concrete expansion joint lines
  ctx.strokeStyle = 'rgba(15,23,42,0.16)';
  ctx.lineWidth = 4;
  for (let i = 128; i < 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBasketballCourtTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d')!;

  // Deep urban navy apron + subtle perimeter trim
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(34, 34, 956, 956);

  // Vibrant teal-cyan court surface
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(86, 64, 852, 896);

  // Two-tone diagonal geometric key accents
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(408, 64, 208, 202);
  ctx.fillRect(408, 758, 208, 202);

  // Crisp white court lines
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 10;
  ctx.strokeRect(86, 64, 852, 896);

  ctx.beginPath();
  ctx.moveTo(86, 512);
  ctx.lineTo(938, 512);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 512, 112, 0, Math.PI * 2);
  ctx.fillStyle = '#f97316';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 48px Impact, sans-serif';
  ctx.fillText('3x3', 512, 496);
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('STREETBALL', 512, 540);

  ctx.strokeRect(408, 64, 208, 202);
  ctx.strokeRect(408, 758, 208, 202);
  ctx.beginPath();
  ctx.arc(512, 266, 86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(512, 758, 86, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 128, 326, 0.14 * Math.PI, 0.86 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(512, 896, 326, 1.14 * Math.PI, 1.86 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBookstoreTileTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#faf6ee';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#f2eadc';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillRect(256, 256, 256, 256);
  ctx.strokeStyle = '#e2d7c5';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 512; i += 64) {
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
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 8);
  tex.anisotropy = 4;
  return tex;
}

function createCobblePlazaTex(warm = true): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = warm ? '#78716c' : '#64748b';
  ctx.fillRect(0, 0, 512, 512);
  const colors = warm
    ? ['#d6cfc4', '#e7dfd3', '#cabfb2', '#dfd5c7']
    : ['#cbd5e1', '#e2e8f0', '#b8c4d4', '#d8e0eb'];
  for (let y = 0; y < 512; y += 32) {
    const offset = ((y / 32) % 2) * 24;
    for (let x = -24; x < 512; x += 48) {
      ctx.fillStyle = colors[((x + y) / 16) % colors.length | 0];
      ctx.fillRect(x + offset + 3, y + 3, 42, 26);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 11);
  tex.anisotropy = 4;
  return tex;
}

function createGlowPoolTex(innerRgba = 'rgba(255, 240, 180, 0.38)'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.55, 'rgba(255, 215, 130, 0.12)');
  grad.addColorStop(1, 'rgba(255, 215, 130, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChainLinkTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
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
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  return tex;
}

function createAutoDoorDecalTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 10);
  ctx.fillRect(0, 86, 512, 10);
  ctx.fillStyle = '#b91c1c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('‹   FAHASA • AUTO DOOR   ›', 256, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// =========================================================================
// MAIN BUILDER
// =========================================================================
export function createWestSchoolDistrictStructure(): WestSchoolDistrictBuildResult {
  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  dynamicGroup.userData.noMerge = true;

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Shared Architectural Materials
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
  const warmWallMat = new THREE.MeshStandardMaterial({ color: 0xfef8ee, roughness: 0.76 });
  const fahasaRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42, metalness: 0.18 });
  const fahasaOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.42, metalness: 0.18 });
  const fahasaNavyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.4 });
  const timberSlatMat = new THREE.MeshStandardMaterial({ color: 0x9a6434, roughness: 0.68 });
  const woodOakMat = new THREE.MeshStandardMaterial({ color: 0xc28a56, roughness: 0.7 });
  const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d24, roughness: 0.75 });
  const metalDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.75 });
  const steelBrightMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.28, metalness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.12,
    metalness: 0.12,
    transparent: true,
    opacity: 0.34,
  });

  const tileFloorMat = new THREE.MeshStandardMaterial({
    map: createBookstoreTileTex(),
    roughness: 0.56,
    metalness: 0.06,
  });
  const warmPlazaMat = new THREE.MeshStandardMaterial({
    map: createCobblePlazaTex(true),
    roughness: 0.86,
  });
  const coolPlazaMat = new THREE.MeshStandardMaterial({
    map: createCobblePlazaTex(false),
    roughness: 0.86,
  });

  const warmPoolMat = new THREE.MeshBasicMaterial({
    map: createGlowPoolTex('rgba(255, 236, 175, 0.40)'),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(warmPoolMat);

  const warmLanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.28,
    roughness: 0.25,
  });
  lanternMats.push(warmLanternGlowMat);

  const pinkNeonMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xec4899,
    emissiveIntensity: 0.7,
    roughness: 0.25,
  });
  const cyanNeonMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.7,
    roughness: 0.25,
  });
  const interiorLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef9c3,
    emissiveIntensity: 0.88,
    roughness: 0.25,
  });
  neonMats.push(pinkNeonMat, cyanNeonMat, interiorLedMat);

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    target: THREE.Group = staticGroup
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    target.add(m);
    return m;
  };

  const addLight = (x: number, y: number, z: number, color: number, maxIntensity: number, distance: number) => {
    const light = new THREE.PointLight(color, 0, distance, 0.95);
    light.position.set(x, y, z);
    scaledLights.push({
      light,
      dayInt: maxIntensity * 0.22,
      nightInt: maxIntensity,
      getScale: () => 1.0,
    });
  };

  // Helper: Grounded Composite Tree (with trunk, flare roots, layered multi-canopy)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const leafGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.84 });
  const blossomMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.7 });
  const addParkTree = (x: number, z: number, scale = 1.0, flowering = false) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 2.35, 8), trunkMat);
    trunk.position.y = 1.18;
    t.add(trunk);
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.42, 10, 8), flowering ? blossomMat : leafGreenMat);
    c1.position.set(0, 3.15, 0);
    t.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), leafDarkMat);
    c2.position.set(0.62, 3.68, 0.3);
    t.add(c2);
    const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.92, 8, 8), flowering ? blossomMat : leafGreenMat);
    c3.position.set(-0.55, 3.45, -0.35);
    t.add(c3);
    staticGroup.add(t);
  };

  // Helper: Composite Student Bicycle
  const addBicycle = (x: number, z: number, yaw = 0, frameColor = 0x0284c7, baseY = 0) => {
    const b = new THREE.Group();
    b.position.set(x, baseY, z);
    b.rotation.y = yaw;
    const fMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.38, metalness: 0.55 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    [-0.45, 0.45].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 16), tireMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.32, wz);
      b.add(wheel);
    });
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), fMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(0, 0.62, 0);
    b.add(crossbar);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6), fMat);
    fork.position.set(0, 0.56, 0.38);
    fork.rotation.x = -0.25;
    b.add(fork);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 6), steelBrightMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0.9, 0.34);
    b.add(handle);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.22), tireMat);
    seat.position.set(0, 0.78, -0.22);
    b.add(seat);
    staticGroup.add(b);
  };

  // Helper: Colorful Hanging Paper Lantern ("Đèn Lồng Hội An")
  const lanternPalette = [0xf43f5e, 0xf59e0b, 0x06b6d4, 0xec4899, 0x10b981, 0xa855f7];
  const lanternShellMats = lanternPalette.map((col) => {
    const m = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.45,
      roughness: 0.45,
    });
    lanternMats.push(m);
    return m;
  });
  const addHangingLantern = (x: number, y: number, z: number, idx: number, scale = 1.0) => {
    const lGrp = new THREE.Group();
    lGrp.position.set(x, y, z);
    lGrp.scale.setScalar(scale);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 6), metalDarkMat);
    cord.position.y = 0.36;
    lGrp.add(cord);
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 10), woodDarkMat);
    capTop.position.y = 0.18;
    lGrp.add(capTop);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), lanternShellMats[idx % lanternShellMats.length]);
    body.scale.set(1.0, 1.25, 1.0);
    lGrp.add(body);
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), fahasaRedMat);
    tassel.position.y = -0.34;
    lGrp.add(tassel);
    staticGroup.add(lGrp);
  };

  // =========================================================================
  // PART 1: NHÀ SÁCH TỔNG HỢP FAHASA & HOBBY MANGA (FLAGSHIP 2 TẦNG)
  //         Inspired by FAHASA Tân Định / Long Biên (Timber Slats + Curtain Glass)
  // =========================================================================
  addBox(30.0, 0.06, 51.5, -378.0, 0.01, 68.25, coolPlazaMat);
  // Pedestrian Lantern Alley X = -395..-393 (Z = 42.5..94.0) with overhead lantern arch ribs!
  addBox(2.4, 0.06, 51.5, -394.0, 0.015, 68.25, warmPlazaMat);
  for (let az = 48.0; az <= 90.0; az += 7.0) {
    addBox(2.2, 0.08, 0.08, -394.0, 4.35, az, metalDarkMat);
    addHangingLantern(-394.0, 4.0, az, Math.round(az), 0.9);
  }

  // Indoor Floor 1 & Floor 2 Slabs (with stairwell cutout X=-391.2..-387.0, Z=78.0..84.4)
  addBox(27.2, 0.08, 40.0, -378.0, 0.04, 68.0, tileFloorMat);
  addBox(27.2, 0.24, 30.0, -378.0, FAHASA_BOOKSTORE_FLOOR_H - 0.12, 63.0, woodOakMat);
  addBox(22.6, 0.24, 10.0, -375.7, FAHASA_BOOKSTORE_FLOOR_H - 0.12, 83.0, woodOakMat);
  addBox(4.6, 0.24, 3.6, -389.3, FAHASA_BOOKSTORE_FLOOR_H - 0.12, 86.2, woodOakMat);
  addBox(0.4, 0.24, 6.4, -391.4, FAHASA_BOOKSTORE_FLOOR_H - 0.12, 81.2, woodOakMat);

  // Flagship Roof Slab + Architectural Overhang Crown (trimmed behind front signboard so ZERO clipping!)
  const BOOK_ROOF_Y = FAHASA_BOOKSTORE_FLOOR_H * 2;
  addBox(28.6, 0.38, 41.6, -378.0, BOOK_ROOF_Y + 0.19, 68.0, fahasaNavyMat);
  addBox(28.8, 0.55, 0.5, -378.0, BOOK_ROOF_Y + 0.62, 47.65, fahasaRedMat);
  addBox(28.8, 0.14, 0.6, -378.0, BOOK_ROOF_Y + 0.96, 47.7, steelBrightMat);
  addBox(28.8, 0.55, 0.5, -378.0, BOOK_ROOF_Y + 0.62, 88.25, fahasaRedMat);

  // Exterior Side Walls with Architectural Vertical Concrete Pilasters & Ribbon Windows
  addBox(0.45, BOOK_ROOF_Y, 40.0, -391.6, BOOK_ROOF_Y * 0.5, 68.0, warmWallMat);
  addBox(0.45, BOOK_ROOF_Y, 40.0, -364.4, BOOK_ROOF_Y * 0.5, 68.0, warmWallMat);
  for (let wz = 52.0; wz <= 84.0; wz += 6.4) {
    addBox(0.18, BOOK_ROOF_Y, 0.55, -391.85, BOOK_ROOF_Y * 0.5, wz, timberSlatMat);
    addBox(0.18, BOOK_ROOF_Y, 0.55, -364.15, BOOK_ROOF_Y * 0.5, wz, timberSlatMat);
  }

  // Front Facade Floor 1 (Open Doorway X = -380.2..-375.8) — Full Curtain Glass + Timber Fins!
  addBox(11.4, 0.55, 0.42, -385.9, 0.275, 48.0, fahasaNavyMat);
  addBox(11.4, 0.55, 0.42, -370.1, 0.275, 48.0, fahasaNavyMat);
  addBox(11.4, 3.25, 0.1, -385.9, 2.15, 48.0, glassMat);
  addBox(11.4, 3.25, 0.1, -370.1, 2.15, 48.0, glassMat);
  // Structural mullions & warm wood fins on Floor 1 facade
  for (let fx = -391.0; fx <= -365.0; fx += 2.6) {
    if (fx > -380.4 && fx < -375.6) continue;
    addBox(0.22, 3.85, 0.36, fx, 1.925, 47.95, timberSlatMat);
  }
  addBox(4.4, 0.65, 0.42, -378.0, 3.85, 48.0, fahasaRedMat);
  // Sliding glass door frame accent (Front Z=48.0)
  addBox(0.18, 3.55, 0.28, -380.2, 1.78, 48.0, steelBrightMat);
  addBox(0.18, 3.55, 0.28, -375.8, 1.78, 48.0, steelBrightMat);

  // Rear Facade Floor 1 (Open Park Doorway X = -380.0..-376.0)
  addBox(11.6, 4.2, 0.4, -385.8, 2.1, 88.0, warmWallMat);
  addBox(11.6, 4.2, 0.4, -370.2, 2.1, 88.0, warmWallMat);
  addBox(4.0, 0.8, 0.4, -378.0, 3.8, 88.0, fahasaRedMat);
  addBox(0.16, 3.45, 0.34, -380.0, 1.72, 88.0, steelBrightMat);
  addBox(0.16, 3.45, 0.34, -376.0, 1.72, 88.0, steelBrightMat);

  // Automatic Double Sliding Glass Doors (Front Z=48.0 & Rear Z=88.0)
  const autoDoorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.08,
    metalness: 0.14,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const autoDoorDecalMat = new THREE.MeshStandardMaterial({
    map: createAutoDoorDecalTex(),
    transparent: true,
    opacity: 0.92,
    roughness: 0.32,
  });

  const buildFahasaAutoDoor = (portalZ: number, leafZ: number, openSpanW: number, doorH: number) => {
    const leafW = openSpanW * 0.5;
    // Overhead brushed-aluminum track housing + dual-sided IR motion sensors
    addBox(openSpanW * 1.92, 0.18, 0.22, -378.0, doorH + 0.09, leafZ, steelBrightMat);
    const sensorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      roughness: 0.25,
    });
    [portalZ - 0.24, portalZ + 0.24].forEach((sz) => {
      addBox(0.46, 0.12, 0.08, -378.0, doorH + 0.14, sz, metalDarkMat);
      addBox(0.16, 0.04, 0.04, -378.0, doorH + 0.12, sz + (sz < portalZ ? -0.03 : 0.03), sensorMat);
    });

    const buildLeaf = (isLeft: boolean) => {
      const leaf = new THREE.Group();
      addBox(leafW - 0.08, doorH - 0.12, 0.03, -0, doorH * 0.5, 0, autoDoorGlassMat, leaf);
      // Aluminum perimeter frame
      addBox(leafW, 0.08, 0.07, 0, doorH - 0.04, 0, metalDarkMat, leaf);
      addBox(leafW, 0.1, 0.07, 0, 0.05, 0, metalDarkMat, leaf);
      addBox(0.06, doorH, 0.07, -leafW * 0.5 + 0.03, doorH * 0.5, 0, metalDarkMat, leaf);
      addBox(0.06, doorH, 0.07, leafW * 0.5 - 0.03, doorH * 0.5, 0, metalDarkMat, leaf);
      // Eye-level FAHASA frosted safety stripe visible both sides
      const frontBand = new THREE.Mesh(new THREE.PlaneGeometry(leafW - 0.12, 0.22), autoDoorDecalMat);
      frontBand.position.set(0, 1.44, 0.022);
      leaf.add(frontBand);
      const backBand = new THREE.Mesh(new THREE.PlaneGeometry(leafW - 0.12, 0.22), autoDoorDecalMat);
      backBand.position.set(0, 1.44, -0.022);
      backBand.rotation.y = Math.PI;
      leaf.add(backBand);
      // Vertical chrome push/pull handles near meeting edge
      const handleX = isLeft ? leafW * 0.5 - 0.16 : -leafW * 0.5 + 0.16;
      [-0.055, 0.055].forEach((hz) => {
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.68, 8), steelBrightMat);
        handle.position.set(handleX, 1.28, hz);
        leaf.add(handle);
      });
      return leaf;
    };

    const leftClosedX = -378.0 - leafW * 0.5;
    const rightClosedX = -378.0 + leafW * 0.5;
    const leftLeaf = buildLeaf(true);
    leftLeaf.position.set(leftClosedX, 0.04, leafZ);
    dynamicGroup.add(leftLeaf);

    const rightLeaf = buildLeaf(false);
    rightLeaf.position.set(rightClosedX, 0.04, leafZ);
    dynamicGroup.add(rightLeaf);

    return {
      leftLeaf,
      rightLeaf,
      leftClosedX,
      rightClosedX,
      slideSpan: leafW - 0.14,
      sensorMat,
      prog: 0,
    };
  };

  const frontAutoDoor = buildFahasaAutoDoor(48.0, 48.18, 4.38, 3.46);
  const rearAutoDoor = buildFahasaAutoDoor(88.0, 88.26, 3.98, 3.36);

  // Floor 2 Panoramic Glass + Signature FAHASA Vertical Wood-Slat Louvers
  addBox(27.2, 0.72, 0.35, -378.0, FAHASA_BOOKSTORE_FLOOR_H + 0.36, 48.0, fahasaNavyMat);
  addBox(27.2, 3.3, 0.1, -378.0, FAHASA_BOOKSTORE_FLOOR_H + 2.38, 48.0, glassMat);
  for (let lx = -391.2; lx <= -364.8; lx += 1.65) {
    // Open central window showcase span for visibility
    if (lx > -381.0 && lx < -375.0) continue;
    addBox(0.14, 3.55, 0.44, lx, FAHASA_BOOKSTORE_FLOOR_H + 2.35, 47.82, timberSlatMat);
  }
  addBox(27.2, 0.75, 0.35, -378.0, FAHASA_BOOKSTORE_FLOOR_H + 0.38, 88.0, fahasaNavyMat);
  addBox(27.2, 3.25, 0.1, -378.0, FAHASA_BOOKSTORE_FLOOR_H + 2.38, 88.0, glassMat);

  // Clean Entrance Portico Canopy (NO duplicate canopy sign — only 1 big flagship sign above!)
  addBox(12.2, 0.32, 3.8, -378.0, 4.06, 46.1, fahasaNavyMat);
  addBox(12.3, 0.14, 3.9, -378.0, 3.88, 46.1, timberSlatMat);
  addBox(11.6, 0.12, 0.18, -378.0, 4.24, 44.22, fahasaRedMat);
  addBox(11.4, 0.08, 0.16, -378.0, 3.82, 44.3, interiorLedMat);
  [-383.3, -372.7].forEach((px) => {
    addBox(0.32, 4.05, 0.32, px, 2.025, 44.5, metalDarkMat);
  });

  // Single Large Architectural FAHASA Flagship Signboard (proudly framed at Z=47.08, zero trim clipping!)
  const fahasaSignTex = createFlagshipSignTex(
    '#991b1b',
    '#dc2626',
    '#fef08a',
    'NHÀ SÁCH FAHASA',
    'SÁCH GIÁO KHOA • MANGA • FIGURE • VĂN PHÒNG PHẨM',
    '#ffffff',
    '#fef08a',
    1408,
    256
  );
  const fahasaSignMat = new THREE.MeshStandardMaterial({
    map: fahasaSignTex,
    emissive: 0xef4444,
    emissiveMap: fahasaSignTex,
    emissiveIntensity: 0.45,
    roughness: 0.28,
  });
  neonMats.push(fahasaSignMat);
  addBox(21.6, 2.72, 0.24, -378.0, BOOK_ROOF_Y + 0.55, 47.25, fahasaNavyMat);
  const fahasaFrontSign = new THREE.Mesh(new THREE.BoxGeometry(21.0, 2.45, 0.16), fahasaSignMat);
  fahasaFrontSign.position.set(-378.0, BOOK_ROOF_Y + 0.55, 47.06);
  staticGroup.add(fahasaFrontSign);

  // Vertical Projecting Blade Sign on NW Corner
  const bladeTex = createBladeSignTex('FAHASA', 'MANGA', 'BOOK', '#b91c1c', '#fef08a');
  const bladeMat = new THREE.MeshStandardMaterial({
    map: bladeTex,
    emissive: 0xf97316,
    emissiveMap: bladeTex,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  neonMats.push(bladeMat);
  addBox(0.95, 3.6, 0.24, -392.15, 6.0, 48.0, bladeMat);

  // Rear Park-Facing Sign (cleanly mounted proud of rear roof fascia so zero clipping)
  addBox(14.5, 1.95, 0.22, -378.0, BOOK_ROOF_Y + 0.72, 88.58, fahasaNavyMat);
  const fahasaRearSign = new THREE.Mesh(new THREE.BoxGeometry(14.0, 1.75, 0.14), fahasaSignMat);
  fahasaRearSign.position.set(-378.0, BOOK_ROOF_Y + 0.72, 88.74);
  fahasaRearSign.rotation.y = Math.PI;
  staticGroup.add(fahasaRearSign);

  // Interior Architectural Wood-Slat Ceiling Rib Beams & Warm Linear LEDs (FAHASA Long Biên aesthetic)
  for (let cz = 51.0; cz <= 85.0; cz += 3.4) {
    // Keep Floor 1 rib beams clear of the West stairwell opening (X = -391.2..-387.0, Z = 78.0..84.4)
    if (cz >= 77.5 && cz <= 85.5) {
      addBox(21.9, 0.18, 0.24, -375.85, 3.88, cz, timberSlatMat);
    } else {
      addBox(26.2, 0.18, 0.24, -378.0, 3.88, cz, timberSlatMat);
    }
    addBox(26.2, 0.18, 0.24, -378.0, FAHASA_BOOKSTORE_FLOOR_H + 3.88, cz, timberSlatMat);
  }
  [-385.5, -378.0, -370.5].forEach((lx) => {
    [55.0, 65.0, 75.0].forEach((lz) => {
      addBox(0.32, 0.08, 5.2, lx, 3.76, lz, interiorLedMat);
      addBox(0.32, 0.08, 5.2, lx, FAHASA_BOOKSTORE_FLOOR_H + 3.76, lz, interiorLedMat);
    });
  });

  // Hanging Category Wayfinding Signage inside Bookstore
  const addAisleBanner = (x: number, y: number, z: number, title: string, bg: string) => {
    const tex = createFlagshipSignTex(bg, bg, '#fef08a', title, 'FAHASA • KHU CHUYÊN ĐỀ', '#ffffff', '#fde047', 512, 128);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    });
    neonMats.push(mat);
    addBox(3.4, 0.65, 0.12, x, y, z, mat);
  };
  addAisleBanner(-384.8, 3.25, 61.2, 'SÁCH GIÁO KHOA', '#0369a1');
  addAisleBanner(-371.2, 3.25, 61.2, 'VĂN PHÒNG PHẨM', '#047857');
  addAisleBanner(-378.0, FAHASA_BOOKSTORE_FLOOR_H + 3.25, 61.8, 'MANGA & LIGHT NOVEL', '#be185d');

  // Front Plaza Bike Rack (low 6cm parking pad + inverted-U steel hoops + bicycles cleanly on top) + Planter
  addBox(5.6, 0.06, 1.5, -388.2, 0.03, 45.0, concreteMat);
  [-390.5, -389.0, -387.5, -386.0].forEach((rx) => {
    addBox(0.05, 0.46, 0.05, rx, 0.29, 44.72, metalDarkMat);
    addBox(0.05, 0.46, 0.05, rx, 0.29, 45.28, metalDarkMat);
    addBox(0.05, 0.05, 0.62, rx, 0.52, 45.0, metalDarkMat);
  });
  addBicycle(-389.75, 45.0, 0.08, 0x0ea5e9, 0.06);
  addBicycle(-388.25, 45.0, -0.05, 0xf43f5e, 0.06);
  addBicycle(-386.75, 45.0, 0.06, 0x22c55e, 0.06);
  addBox(5.2, 0.5, 1.8, -368.3, 0.25, 44.9, woodDarkMat);
  addParkTree(-368.3, 44.9, 0.72, true);

  // Floor 1: Flagship FAHASA Dual-Screen Checkout Counter (Pokemon-Shop Caliber!) + Retail Backdrop
  const posScreenMat = new THREE.MeshStandardMaterial({
    map: createFahasaPosScreenTex(),
    emissive: 0xffffff,
    emissiveMap: createFahasaPosScreenTex(),
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const cfdScreenMat = new THREE.MeshStandardMaterial({
    map: createFahasaCfdTex(),
    emissive: 0xffffff,
    emissiveMap: createFahasaCfdTex(),
    emissiveIntensity: 0.58,
    roughness: 0.25,
  });
  const qrStandMat = new THREE.MeshStandardMaterial({
    map: createFahasaQrStandTex(),
    emissive: 0xffffff,
    emissiveMap: createFahasaQrStandTex(),
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.26, metalness: 0.8 });
  const scannerLaserMat = new THREE.MeshStandardMaterial({ color: 0xff1e42, emissive: 0xff1e42, emissiveIntensity: 1.4, roughness: 0.2 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.78 });
  const bagGoldMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.55 });
  const deskLampGlowMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.2, roughness: 0.25 });

  // Cashier Counter Shell: recessed steel kickplate, walnut cabinet, vertical oak slats, gold band, crimson quartz top
  addBox(5.96, 0.14, 1.18, -387.4, 0.07, 52.5, metalDarkMat);
  addBox(5.98, 0.03, 1.2, -387.4, 0.155, 52.5, interiorLedMat);
  addBox(6.0, 0.88, 1.24, -387.4, 0.6, 52.5, woodDarkMat);
  for (let sx = -390.25; sx <= -384.55; sx += 0.19) {
    if (sx > -388.35 && sx < -386.45) continue; // Center plaque window
    addBox(0.06, 0.82, 0.04, sx, 0.59, 53.14, timberSlatMat);
  }
  const checkoutPlaqueTex = createFlagshipSignTex('#991b1b', '#7f1d1d', '#fde047', 'QUẦY THU NGÂN', 'THANH TOÁN NHANH • FAHASA', '#ffffff', '#fef08a', 512, 160);
  const checkoutPlaqueMat = new THREE.MeshStandardMaterial({
    map: checkoutPlaqueTex,
    emissive: 0xfef08a,
    emissiveMap: checkoutPlaqueTex,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  neonMats.push(checkoutPlaqueMat);
  addBox(1.75, 0.66, 0.05, -387.4, 0.6, 53.145, checkoutPlaqueMat);
  addBox(6.04, 0.04, 1.28, -387.4, 1.03, 52.5, goldTrimMat);
  addBox(6.14, 0.04, 1.38, -387.4, 1.06, 52.5, metalDarkMat);
  addBox(6.1, 0.06, 1.34, -387.4, 1.1, 52.5, fahasaRedMat);

  // Two Complete Checkout Workstation Lanes (Customer faces -Z, Cashier stands at Z=51.4 facing +Z)
  [-389.0, -386.0].forEach((px) => {
    // Under-counter cash drawer facing cashier (-Z)
    addBox(0.56, 0.11, 0.42, px, 0.96, 51.98, metalDarkMat);
    addBox(0.52, 0.09, 0.03, px, 0.96, 51.78, steelBrightMat);
    addBox(0.18, 0.018, 0.024, px, 0.97, 51.76, metalDarkMat);

    // Customer Staging Pad + Recessed Flatbed Laser Barcode Scanner + Bagging Mat
    addBox(0.8, 0.008, 0.42, px - 0.35, 1.134, 52.9, padMat);
    addBox(0.28, 0.014, 0.24, px + 0.2, 1.136, 52.92, steelBrightMat);
    addBox(0.2, 0.016, 0.16, px + 0.2, 1.138, 52.92, scannerLaserMat);
    addBox(0.36, 0.008, 0.36, px + 0.62, 1.134, 52.86, padMat);

    // Dual-Screen Flagship POS Terminal (Cashier screen facing -Z + Customer Display facing +Z!)
    addBox(0.36, 0.022, 0.24, px, 1.141, 52.44, metalDarkMat);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.3, 0.055), steelBrightMat);
    arm.position.set(px, 1.28, 52.42);
    arm.rotation.x = 0.14;
    staticGroup.add(arm);
    addBox(0.72, 0.48, 0.042, px, 1.44, 52.44, metalDarkMat);
    addBox(0.725, 0.016, 0.046, px, 1.205, 52.44, goldTrimMat);

    const cScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.43), posScreenMat);
    cScreen.position.set(px, 1.44, 52.416);
    cScreen.rotation.y = Math.PI; // Faces Cashier (-Z)
    staticGroup.add(cScreen);

    // Customer-Facing Secondary Display (CFD) on +Z side facing Store Interior!
    addBox(0.5, 0.34, 0.026, px, 1.45, 52.47, metalDarkMat);
    addBox(0.51, 0.35, 0.01, px, 1.45, 52.463, goldTrimMat);
    const custScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), cfdScreenMat);
    custScreen.position.set(px, 1.45, 52.485); // Faces Customer (+Z)
    staticGroup.add(custScreen);

    // Cashier PIN Pad + Thermal Receipt Printer with Paper Strip
    addBox(0.05, 0.14, 0.05, px - 0.56, 1.2, 52.42, steelBrightMat);
    addBox(0.22, 0.34, 0.036, px - 0.56, 1.32, 52.42, metalDarkMat);
    const pinScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.28), posScreenMat);
    pinScreen.position.set(px - 0.56, 1.32, 52.4);
    pinScreen.rotation.y = Math.PI;
    staticGroup.add(pinScreen);

    addBox(0.18, 0.13, 0.21, px - 0.92, 1.195, 52.38, metalDarkMat);
    addBox(0.17, 0.03, 0.15, px - 0.92, 1.265, 52.38, steelBrightMat);
    addBox(0.03, 0.01, 0.01, px - 0.87, 1.255, 52.275, deskLampGlowMat);
    const slip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.008), warmWallMat);
    slip.position.set(px - 0.92, 1.31, 52.34);
    slip.rotation.x = 0.3;
    staticGroup.add(slip);

    // Customer VietQR / NFC Tap-to-Pay Stand (+Z) & Wireless Handheld Barcode Scanner in Cradle
    const qrBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.018, 12), metalDarkMat);
    qrBase.position.set(px + 0.54, 1.139, 53.02);
    staticGroup.add(qrBase);
    const qrPanel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.02), metalDarkMat);
    qrPanel.position.set(px + 0.54, 1.25, 53.03);
    qrPanel.rotation.x = -0.38;
    staticGroup.add(qrPanel);
    const qrFace = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.18), qrStandMat);
    qrFace.position.set(px + 0.54, 1.252, 53.042);
    qrFace.rotation.x = -0.38;
    staticGroup.add(qrFace);

    const cradle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.04, 12), metalDarkMat);
    cradle.position.set(px + 0.58, 1.15, 52.42);
    staticGroup.add(cradle);
    addBox(0.05, 0.14, 0.09, px + 0.58, 1.23, 52.42, fahasaRedMat);
    addBox(0.04, 0.04, 0.03, px + 0.58, 1.28, 52.47, scannerLaserMat);

    // Hollow FAHASA Paper Shopping Bag ready at Bagging Zone
    addBox(0.32, 0.34, 0.18, px + 0.96, 1.3, 52.84, fahasaRedMat);
    addBox(0.28, 0.04, 0.14, px + 0.96, 1.46, 52.84, woodDarkMat);
    addBox(0.324, 0.02, 0.184, px + 0.96, 1.465, 52.84, bagGoldMat);
  });

  // West Wall Retail Feature Backdrop Behind Cashiers (eliminates blank white wall!)
  addBox(0.1, 2.3, 5.2, -391.32, 1.85, 52.6, woodDarkMat);
  const backCheckoutSignTex = createFlagshipSignTex('#991b1b', '#450a0a', '#fde047', 'FAHASA CHECKOUT • THU NGÂN', 'THÀNH VIÊN TÍCH ĐIỂM • HÓA ĐƠN VAT • VIETQR', '#ffffff', '#fde047', 896, 192);
  const backCheckoutMat = new THREE.MeshStandardMaterial({
    map: backCheckoutSignTex,
    emissive: 0xef4444,
    emissiveMap: backCheckoutSignTex,
    emissiveIntensity: 0.45,
    roughness: 0.28,
  });
  neonMats.push(backCheckoutMat);
  addBox(0.08, 0.95, 4.4, -391.24, 2.52, 52.6, backCheckoutMat);
  addBox(0.06, 0.04, 4.6, -391.25, 3.04, 52.6, interiorLedMat);

  // Floor 1 East: Upgraded Photocopy, Printing & Stationery Service Desk (flanked cleanly by 2 commercial copiers!)
  addBox(2.86, 0.14, 1.14, -367.8, 0.07, 52.6, metalDarkMat);
  addBox(2.9, 0.84, 1.2, -367.8, 0.56, 52.6, woodDarkMat);
  for (let pxSlat = -369.1; pxSlat <= -366.5; pxSlat += 0.22) {
    addBox(0.06, 0.78, 0.04, pxSlat, 0.56, 53.22, timberSlatMat);
  }
  addBox(3.04, 0.08, 1.32, -367.8, 1.01, 52.6, concreteMat);
  const printSignTex = createFlagshipSignTex('#065f46', '#0f172a', '#6ee7b7', 'IN ẤN • PHOTOCOPY • BAO SÁCH', 'IN MÀU LASER A3/A4 • ĐÓNG GÁY LÒ XO • ĐỒ DÙNG HỌC TẬP', '#ffffff', '#fde047', 896, 192);
  const printSignMat = new THREE.MeshStandardMaterial({
    map: printSignTex,
    emissive: 0x10b981,
    emissiveMap: printSignTex,
    emissiveIntensity: 0.42,
    roughness: 0.3,
  });
  neonMats.push(printSignMat);
  addBox(0.1, 2.3, 4.8, -364.68, 1.85, 52.6, woodDarkMat);
  addBox(0.08, 0.95, 4.2, -364.75, 2.52, 52.6, printSignMat);
  // Desktop Print Station Monitor + Paper Reams on Counter
  addBox(0.56, 0.38, 0.04, -368.1, 1.25, 52.45, metalDarkMat);
  const printPos = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), posScreenMat);
  printPos.position.set(-368.1, 1.25, 52.425);
  printPos.rotation.y = Math.PI;
  staticGroup.add(printPos);
  const printCustPos = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.26), cfdScreenMat);
  printCustPos.position.set(-368.1, 1.25, 52.475);
  staticGroup.add(printCustPos);
  addBox(0.32, 0.22, 0.24, -367.15, 1.16, 52.7, warmWallMat); // A4 paper ream stack
  addBox(0.32, 0.06, 0.24, -367.15, 1.3, 52.7, fahasaRedMat);

  // 2 Commercial Multi-Function Photocopiers flanking the desk (zero overlap with wood counter!)
  [-370.1, -365.5].forEach((cx) => {
    addBox(0.95, 0.72, 0.78, cx, 0.36, 52.55, steelBrightMat);
    [0.2, 0.4, 0.6].forEach((dy) => {
      addBox(0.76, 0.14, 0.04, cx, dy, 52.95, metalDarkMat);
      addBox(0.28, 0.03, 0.02, cx, dy + 0.02, 52.975, steelBrightMat);
    });
    addBox(0.98, 0.28, 0.8, cx, 0.86, 52.55, metalDarkMat);
    addBox(0.94, 0.12, 0.76, cx, 1.06, 52.55, steelBrightMat); // ADF Top Lid
    addBox(0.52, 0.06, 0.42, cx - 0.16, 1.15, 52.51, metalDarkMat); // Document Feeder Tray
    addBox(0.26, 0.03, 0.22, cx + 0.3, 0.8, 52.91, warmWallMat); // Printed A4 output stack
    addBox(0.24, 0.14, 0.04, cx + 0.32, 1.04, 52.93, posScreenMat); // Touch control panel!
  });

  // Cached Realistic Book & Cover Materials (Single-material per mesh so ShopScene batches all books into minimal draw calls!)
  const pageEdgeMat = new THREE.MeshStandardMaterial({ map: createPageEdgesTex(), roughness: 0.78 });
  const bookThemeMats: Record<BookShelfTheme, THREE.MeshStandardMaterial[]> = {
    textbook: [0, 1, 2].map((v) => new THREE.MeshStandardMaterial({ map: createBookSpinesTex('textbook', v), roughness: 0.45 })),
    manga: [0, 1, 2].map((v) => new THREE.MeshStandardMaterial({ map: createBookSpinesTex('manga', v), roughness: 0.4 })),
    literature: [0, 1, 2].map((v) => new THREE.MeshStandardMaterial({ map: createBookSpinesTex('literature', v), roughness: 0.5 })),
    art: [0, 1, 2].map((v) => new THREE.MeshStandardMaterial({ map: createBookSpinesTex('art', v), roughness: 0.36 })),
  };
  const stackCoverColors = [0x991b1b, 0x1e3a8a, 0x0f766e, 0xb45309, 0x334155, 0x4c1d95];
  const stackCoverMats = stackCoverColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.52 }));
  const featuredCoverMats = [
    createFeaturedCoverTex('LUYỆN THI THPT', 'TOÁN • LÝ • HÓA 12', '#1e3a8a', '#0f172a', '#facc15', 'GIÁO KHOA'),
    createFeaturedCoverTex('ONE PIECE 108', 'EIICHIRO ODA', '#b91c1c', '#7f1d1d', '#fde047', 'MANGA HOT'),
    createFeaturedCoverTex('ĐẮC NHÂN TÂM', 'DALE CARNEGIE', '#9a3412', '#431407', '#fdba74', 'BEST SELLER'),
    createFeaturedCoverTex('JUJUTSU KAISEN', 'CHÚ THUẬT HỒI CHIẾN', '#0f172a', '#312e81', '#38bdf8', 'TẬP MỚI'),
    createFeaturedCoverTex('TUỔI TRẺ ĐÁNG GIÁ', 'ROSIE NGUYỄN', '#065f46', '#022c22', '#6ee7b7', 'KỸ NĂNG'),
    createFeaturedCoverTex('ARTBOOK SKETCH', 'MINH HỌA MÀU NƯỚC', '#831843', '#4c0519', '#f9a8d4', 'ARTBOOK'),
  ].map((tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.34 }));

  // Helper: 2-piece batched hardcover book (cream paper-block core + illustrated cover jacket facing +Z local)
  const addShowcaseBook = (
    px: number,
    py: number,
    pz: number,
    rotX: number,
    rotY: number,
    rotZ: number,
    coverMat: THREE.MeshStandardMaterial
  ) => {
    const g = new THREE.Group();
    g.position.set(px, py, pz);
    g.rotation.set(rotX, rotY, rotZ);
    addBox(0.2, 0.285, 0.024, 0, 0, -0.002, pageEdgeMat, g);
    addBox(0.208, 0.292, 0.008, 0, 0, 0.013, coverMat, g);
    addBox(0.208, 0.292, 0.006, 0, 0, -0.015, coverMat, g);
    staticGroup.add(g);
  };

  // Helper: Flat stacked book (cream page block sandwiched cleanly between colored covers)
  const addFlatBook = (
    px: number,
    py: number,
    pz: number,
    wX: number,
    hY: number,
    lZ: number,
    rotY: number,
    coverMat: THREE.MeshStandardMaterial
  ) => {
    const g = new THREE.Group();
    g.position.set(px, py, pz);
    g.rotation.y = rotY;
    addBox(wX - 0.018, hY * 0.68, lZ - 0.018, 0, 0, 0, pageEdgeMat, g);
    addBox(wX, hY * 0.22, lZ, 0, hY * 0.39, 0, coverMat, g);
    addBox(wX, hY * 0.18, lZ, 0, -hY * 0.41, 0, coverMat, g);
    staticGroup.add(g);
  };

  // Helper: Build Realistic Book Arrangements (Multi-Spine Clusters + Paper Tops + Leaning Books + Stacks + Face-Out Easels)
  const populateShelfBay = (
    centerX: number,
    shelfTopY: number,
    zStart: number,
    zEnd: number,
    faceDir: 1 | -1,
    theme: BookShelfTheme,
    seed: number,
    allowFaceOut: boolean
  ) => {
    const baySpan = zEnd - zStart;
    if (baySpan < 0.7) return;
    const matsList = bookThemeMats[theme];
    const pattern = seed % 4;
    const addSpineCluster = (wX: number, hY: number, lZ: number, px: number, py: number, pz: number, mat: THREE.MeshStandardMaterial) => {
      addBox(wX, hY - 0.014, lZ, px, py - 0.007, pz, mat);
      addBox(wX - 0.024, 0.014, lZ - 0.02, px, py + hY * 0.5 - 0.007, pz, pageEdgeMat);
    };

    if (pattern === 0) {
      const w1 = baySpan * 0.45;
      const w2 = baySpan * 0.31;
      const h1 = 0.29 + (seed % 3) * 0.015;
      const h2 = 0.23 + (seed % 2) * 0.02;
      addSpineCluster(0.24, h1, w1, centerX, shelfTopY + h1 * 0.5, zStart + w1 * 0.5 + 0.03, matsList[seed % 3]);
      addSpineCluster(0.22, h2, w2, centerX - faceDir * 0.01, shelfTopY + h2 * 0.5, zStart + w1 + w2 * 0.5 + 0.06, matsList[(seed + 1) % 3]);
      // Leaning individual book + steel L-bookend
      addShowcaseBook(
        centerX,
        shelfTopY + 0.14,
        zStart + w1 + w2 + 0.12,
        0,
        faceDir > 0 ? Math.PI / 2 : -Math.PI / 2,
        0.24,
        featuredCoverMats[seed % featuredCoverMats.length]
      );
      addBox(0.18, 0.16, 0.014, centerX, shelfTopY + 0.08, zStart + w1 + w2 + 0.22, metalDarkMat);
    } else if (pattern === 1) {
      const w1 = baySpan * 0.58;
      const h1 = 0.28 + (seed % 3) * 0.018;
      addSpineCluster(0.24, h1, w1, centerX, shelfTopY + h1 * 0.5, zStart + w1 * 0.5 + 0.04, matsList[(seed + 1) % 3]);
      const stackZ = zStart + w1 + 0.26;
      for (let k = 0; k < 4; k++) {
        const cMat = stackCoverMats[(seed + k) % stackCoverMats.length];
        const bkH = 0.036;
        addFlatBook(centerX, shelfTopY + bkH * (k + 0.5), stackZ, 0.22 - k * 0.01, bkH, 0.31 - k * 0.014, k % 2 === 0 ? 0.06 : -0.05, cMat);
      }
    } else if (pattern === 2 && allowFaceOut) {
      const w1 = baySpan * 0.55;
      const h1 = 0.28;
      addSpineCluster(0.24, h1, w1, centerX, shelfTopY + h1 * 0.5, zStart + w1 * 0.5 + 0.04, matsList[(seed + 2) % 3]);
      const dispZ = zStart + w1 + (baySpan - w1) * 0.5;
      addBox(0.14, 0.02, 0.18, centerX, shelfTopY + 0.01, dispZ, metalDarkMat);
      addShowcaseBook(
        centerX + faceDir * 0.02,
        shelfTopY + 0.155,
        dispZ,
        -0.22,
        faceDir > 0 ? Math.PI / 2 : -Math.PI / 2,
        0,
        featuredCoverMats[(seed + 2) % featuredCoverMats.length]
      );
    } else {
      const segs = [0.33, 0.27, 0.3];
      const heights = [0.31, 0.23, 0.27];
      let curZ = zStart + 0.04;
      segs.forEach((frac, si) => {
        const segW = baySpan * frac;
        const sh = heights[(si + seed) % heights.length];
        addSpineCluster(0.24 - (si % 2) * 0.02, sh, segW - 0.02, centerX - faceDir * (si % 2) * 0.012, shelfTopY + sh * 0.5, curZ + segW * 0.5, matsList[(seed + si) % 3]);
        curZ += segW + 0.01;
      });
    }
  };

  // Feature Book Check-In Display Island + Tiered Best-Seller Books + Backlit Arch Ring
  addBox(3.0, 0.86, 1.6, -377.0, 0.43, 56.4, woodOakMat);
  addBox(3.12, 0.08, 1.72, -377.0, 0.89, 56.4, fahasaRedMat);
  addBox(2.3, 0.24, 1.05, -377.0, 1.05, 56.4, woodDarkMat);
  [-377.8, -377.26, -376.74, -376.2].forEach((bx, bi) => {
    addShowcaseBook(bx, 1.31, 56.02, -0.28, Math.PI, 0, featuredCoverMats[bi % featuredCoverMats.length]);
  });
  [-377.6, -376.4].forEach((sx, si) => {
    for (let k = 0; k < 4; k++) {
      const cMat = stackCoverMats[(si * 2 + k) % stackCoverMats.length];
      addFlatBook(sx, 1.19 + k * 0.04, 56.66, 0.32 - k * 0.015, 0.04, 0.24 - k * 0.01, k % 2 === 0 ? 0.1 : -0.08, cMat);
    }
  });
  const bookArch = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.11, 10, 24, Math.PI), fahasaOrangeMat);
  bookArch.position.set(-377.0, 1.15, 56.4);
  staticGroup.add(bookArch);

  // Flagship Architectural Double-Sided Gondola Bookshelf Aisles (Floor 1 & Floor 2)
  const addBookshelfAisle = (
    cx: number,
    cz: number,
    lenZ: number,
    floorY: number,
    sectionTitle: string,
    sectionBg: string,
    theme: BookShelfTheme
  ) => {
    // 1. Recessed navy kickplate + walnut spine wall + oak bay dividers + top architectural canopy
    addBox(1.18, 0.16, lenZ - 0.06, cx, floorY + 0.08, cz, fahasaNavyMat);
    addBox(0.14, 2.26, lenZ - 0.08, cx, floorY + 1.24, cz, woodDarkMat);
    addBox(1.48, 0.1, lenZ + 0.08, cx, floorY + 2.41, cz, fahasaNavyMat);
    addBox(1.44, 0.05, lenZ + 0.04, cx, floorY + 2.34, cz, woodOakMat);

    // Double-sided illuminated gondola category plaques on top canopy
    const plaqueTex = createFlagshipSignTex(sectionBg, '#0f172a', '#fde047', sectionTitle, 'FAHASA • CHÍNH HÃNG', '#ffffff', '#fef08a', 640, 112);
    const plaqueMat = new THREE.MeshStandardMaterial({
      map: plaqueTex,
      emissive: 0xffffff,
      emissiveMap: plaqueTex,
      emissiveIntensity: 0.25,
      roughness: 0.35,
    });
    neonMats.push(plaqueMat);
    [-0.755, 0.755].forEach((ox) => {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, Math.min(4.8, lenZ * 0.45)), plaqueMat);
      pl.position.set(cx + ox, floorY + 2.58, cz);
      staticGroup.add(pl);
    });

    const bays = Math.max(4, Math.round(lenZ / 1.85));
    const bayStep = lenZ / bays;
    for (let b = 0; b <= bays; b++) {
      const divZ = cz - lenZ * 0.5 + b * bayStep;
      addBox(1.4, 2.24, 0.065, cx, floorY + 1.24, divZ, woodDarkMat);
    }

    // 2. Five tiered oak shelves + aluminum price channels + under-shelf warm LEDs + 3D books
    const shelfOffsetsY = [0.19, 0.62, 1.05, 1.48, 1.91];
    shelfOffsetsY.forEach((oy, shelfIdx) => {
      const sy = floorY + oy;
      addBox(1.38, 0.055, lenZ, cx, sy, cz, woodOakMat);
      [-0.695, 0.695].forEach((rx) => {
        addBox(0.02, 0.028, lenZ - 0.04, cx + rx, sy, cz, metalDarkMat);
      });
      if (shelfIdx >= 2) {
        [-0.54, 0.54].forEach((lx) => {
          addBox(0.05, 0.018, lenZ - 0.3, cx + lx, sy - 0.036, cz, interiorLedMat);
        });
      }
      if (shelfIdx < 4) {
        for (let b = 0; b < bays; b++) {
          const zStart = cz - lenZ * 0.5 + b * bayStep + 0.045;
          const zEnd = cz - lenZ * 0.5 + (b + 1) * bayStep - 0.045;
          const allowFaceOut = shelfIdx === 1 || shelfIdx === 2;
          populateShelfBay(cx - 0.36, sy + 0.028, zStart, zEnd, -1, theme, b * 7 + shelfIdx * 3, allowFaceOut);
          populateShelfBay(cx + 0.36, sy + 0.028, zStart, zEnd, 1, theme, b * 7 + shelfIdx * 3 + 2, allowFaceOut);
        }
      } else {
        for (let b = 0; b < bays; b += 2) {
          const zMid = cz - lenZ * 0.5 + (b + 0.5) * bayStep;
          const stMat = stackCoverMats[(b + Math.round(Math.abs(cx))) % stackCoverMats.length];
          for (let k = 0; k < 3; k++) {
            addFlatBook(cx - 0.32, sy + 0.048 + k * 0.04, zMid, 0.32, 0.04, 0.24, 0, stMat);
          }
          addShowcaseBook(cx + 0.34, sy + 0.175, zMid, -0.24, Math.PI / 2, 0, featuredCoverMats[(b + 1) % featuredCoverMats.length]);
        }
      }
    });

    // 3. End-Cap Promotional Display Racks at North & South aisle ends
    [-1, 1].forEach((endDir, ei) => {
      const ez = cz + endDir * (lenZ * 0.5 + 0.2);
      addBox(1.16, 1.05, 0.34, cx, floorY + 0.525, ez, woodDarkMat);
      addBox(1.2, 0.06, 0.38, cx, floorY + 1.08, ez, woodOakMat);
      [-0.36, 0, 0.36].forEach((bx, bi) => {
        addShowcaseBook(
          cx + bx,
          floorY + 1.25,
          ez + endDir * 0.04,
          -0.25,
          endDir > 0 ? 0 : Math.PI,
          0,
          featuredCoverMats[(bi + ei * 2) % featuredCoverMats.length]
        );
      });
    });
  };

  // Single-Sided Perimeter Wall Bookcases (eliminates blank white interior walls!)
  const addWallBookshelf = (wallInnerX: number, cz: number, lenZ: number, floorY: number, faceDir: 1 | -1, theme: BookShelfTheme) => {
    const cx = wallInnerX + faceDir * 0.22;
    addBox(0.42, 0.16, lenZ, cx, floorY + 0.08, cz, fahasaNavyMat);
    addBox(0.06, 2.38, lenZ, wallInnerX + faceDir * 0.03, floorY + 1.27, cz, woodDarkMat);
    addBox(0.46, 0.1, lenZ + 0.06, cx, floorY + 2.46, cz, fahasaNavyMat);
    const bays = Math.max(4, Math.round(lenZ / 2.0));
    const bayStep = lenZ / bays;
    for (let b = 0; b <= bays; b++) {
      addBox(0.44, 2.32, 0.06, cx, floorY + 1.24, cz - lenZ * 0.5 + b * bayStep, woodDarkMat);
    }
    [0.2, 0.66, 1.12, 1.58, 2.04].forEach((oy, sIdx) => {
      const sy = floorY + oy;
      addBox(0.44, 0.055, lenZ, cx, sy, cz, woodOakMat);
      if (sIdx >= 2) {
        addBox(0.04, 0.018, lenZ - 0.3, cx + faceDir * 0.14, sy - 0.036, cz, interiorLedMat);
      }
      if (sIdx < 4) {
        for (let b = 0; b < bays; b++) {
          const zStart = cz - lenZ * 0.5 + b * bayStep + 0.045;
          const zEnd = cz - lenZ * 0.5 + (b + 1) * bayStep - 0.045;
          populateShelfBay(cx + faceDir * 0.04, sy + 0.028, zStart, zEnd, faceDir, theme, b * 5 + sIdx * 2 + 1, sIdx === 2);
        }
      }
    });
  };

  addBookshelfAisle(-387.5, 67.5, 13.0, 0.0, 'SÁCH GIÁO KHOA • ÔN THI ĐH', '#0369a1', 'textbook');
  addBookshelfAisle(-382.3, 67.5, 13.0, 0.0, 'VĂN HỌC • KỸ NĂNG SỐNG', '#9a3412', 'literature');
  addBookshelfAisle(-373.7, 67.5, 13.0, 0.0, 'KHOA HỌC • TIỂU THUYẾT', '#047857', 'literature');
  addBookshelfAisle(-368.5, 67.5, 13.0, 0.0, 'SÁCH THIẾU NHI • ARTBOOK', '#be123c', 'art');
  addWallBookshelf(-391.3, 66.0, 15.0, 0.0, 1, 'textbook');
  addWallBookshelf(-364.7, 66.0, 15.0, 0.0, -1, 'art');

  // Switchback Stairwell (X = -391.2..-387.0, Z = 78.0..84.4)
  const STAIR_STEPS = 12;
  for (let s = 0; s < STAIR_STEPS; s++) {
    const t = (s + 0.5) / STAIR_STEPS;
    const stepY = t * (FAHASA_BOOKSTORE_FLOOR_H * 0.5);
    const stepZ = THREE.MathUtils.lerp(78.4, 82.8, t);
    addBox(2.05, 0.22, 0.42, -390.15, stepY - 0.1, stepZ, woodOakMat);
  }
  addBox(4.2, 0.22, 1.6, -389.1, FAHASA_BOOKSTORE_FLOOR_H * 0.5 - 0.11, 83.6, concreteMat);
  for (let s = 0; s < STAIR_STEPS; s++) {
    const t = (s + 0.5) / STAIR_STEPS;
    const stepY = FAHASA_BOOKSTORE_FLOOR_H * 0.5 + t * (FAHASA_BOOKSTORE_FLOOR_H * 0.5);
    const stepZ = THREE.MathUtils.lerp(82.8, 78.4, t);
    addBox(2.05, 0.22, 0.42, -388.05, stepY - 0.1, stepZ, woodOakMat);
  }
  addBox(0.14, BOOK_ROOF_Y - 0.4, 4.6, -389.1, BOOK_ROOF_Y * 0.48, 80.6, metalDarkMat);
  addBox(0.14, BOOK_ROOF_Y - 0.4, 6.4, -387.0, BOOK_ROOF_Y * 0.48, 81.2, warmWallMat);
  addBox(4.2, BOOK_ROOF_Y - 0.4, 0.14, -389.1, BOOK_ROOF_Y * 0.48, 84.45, warmWallMat);
  addBox(2.15, 1.05, 0.12, -390.12, FAHASA_BOOKSTORE_FLOOR_H + 0.52, 78.0, metalDarkMat);

  // Floor 2: Manga Shelves + Wall Comic Archive + Illuminated Anime Figure Showcases + Reading Lounge + TCG Duel Tables
  addBookshelfAisle(-379.8, 67.0, 9.5, FAHASA_BOOKSTORE_FLOOR_H, 'MANGA NHẬT BẢN • TẬP MỚI', '#be185d', 'manga');
  addBookshelfAisle(-376.0, 67.0, 9.5, FAHASA_BOOKSTORE_FLOOR_H, 'LIGHT NOVEL • COMIC BOXSET', '#4338ca', 'art');
  addWallBookshelf(-391.3, 66.5, 12.0, FAHASA_BOOKSTORE_FLOOR_H, 1, 'manga');

  const figureColors = [0xf43f5e, 0x3b82f6, 0xfacc15, 0x10b981, 0xa855f7];
  [59.8, 72.8].forEach((fz, idx) => {
    addBox(5.6, 0.85, 1.2, -368.5, FAHASA_BOOKSTORE_FLOOR_H + 0.425, fz, fahasaNavyMat);
    addBox(5.5, 1.45, 1.1, -368.5, FAHASA_BOOKSTORE_FLOOR_H + 1.55, fz, glassMat);
    addBox(5.6, 0.18, 1.2, -368.5, FAHASA_BOOKSTORE_FLOOR_H + 2.35, fz, interiorLedMat);
    for (let k = 0; k < 4; k++) {
      const fx = -370.5 + k * 1.35;
      const figMat = new THREE.MeshStandardMaterial({ color: figureColors[(k + idx) % figureColors.length], roughness: 0.3 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.08, 10), metalDarkMat);
      base.position.set(fx, FAHASA_BOOKSTORE_FLOOR_H + 0.9, fz);
      staticGroup.add(base);
      const figBody = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.5, 8), figMat);
      figBody.position.set(fx, FAHASA_BOOKSTORE_FLOOR_H + 1.19, fz);
      staticGroup.add(figBody);
      const figHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), figMat);
      figHead.position.set(fx, FAHASA_BOOKSTORE_FLOOR_H + 1.56, fz);
      staticGroup.add(figHead);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.04), steelBrightMat);
      wing.position.set(fx, FAHASA_BOOKSTORE_FLOOR_H + 1.32, fz - 0.12);
      staticGroup.add(wing);
    }
  });

  // Floor 2 Reading Lounge: Woven Rug + Steel-Legged Oak Table + Round Tufted Cushions + Open Books
  const rugMat = new THREE.MeshStandardMaterial({ color: 0xe7dfd3, roughness: 0.95 });
  addBox(6.6, 0.025, 4.6, -385.7, FAHASA_BOOKSTORE_FLOOR_H + 0.012, 55.2, rugMat);
  // Low Japanese-style table with recessed steel legs (replaces solid floor block!)
  [-387.9, -383.5].forEach((lx) => {
    [-0.78, 0.78].forEach((lz) => {
      addBox(0.14, 0.4, 0.14, lx, FAHASA_BOOKSTORE_FLOOR_H + 0.2, 55.2 + lz, metalDarkMat);
    });
  });
  addBox(5.2, 0.07, 2.1, -385.7, FAHASA_BOOKSTORE_FLOOR_H + 0.44, 55.2, woodOakMat);
  addBox(5.26, 0.03, 2.16, -385.7, FAHASA_BOOKSTORE_FLOOR_H + 0.41, 55.2, woodDarkMat);

  const poufMats = [
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85 }),
  ];
  [-387.5, -385.7, -383.9].forEach((cx, i) => {
    [53.5, 56.9].forEach((pz, rowI) => {
      const pMat = poufMats[(i + rowI) % poufMats.length];
      const pouf = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.47, 0.36, 16), pMat);
      pouf.position.set(cx, FAHASA_BOOKSTORE_FLOOR_H + 0.205, pz);
      staticGroup.add(pouf);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.475, 0.475, 0.035, 16), warmWallMat);
      rim.position.set(cx, FAHASA_BOOKSTORE_FLOOR_H + 0.21, pz);
      staticGroup.add(rim);
    });
    if (i !== 1) {
      const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.28, 8), metalDarkMat);
      lBase.position.set(cx, FAHASA_BOOKSTORE_FLOOR_H + 0.62, 55.2);
      staticGroup.add(lBase);
      const lShade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 10), warmLanternGlowMat);
      lShade.position.set(cx, FAHASA_BOOKSTORE_FLOOR_H + 0.82, 55.2);
      staticGroup.add(lShade);
    }
    addFlatBook(cx + 0.36, FAHASA_BOOKSTORE_FLOOR_H + 0.5, 55.15, 0.32, 0.045, 0.24, (i - 1) * 0.22, stackCoverMats[i % stackCoverMats.length]);
    // Open laid-flat reading book + ceramic mug on table
    if (i === 1) {
      addBox(0.36, 0.014, 0.25, cx - 0.35, FAHASA_BOOKSTORE_FLOOR_H + 0.482, 55.45, stackCoverMats[1]);
      addBox(0.16, 0.016, 0.22, cx - 0.44, FAHASA_BOOKSTORE_FLOOR_H + 0.495, 55.45, pageEdgeMat);
      addBox(0.16, 0.016, 0.22, cx - 0.26, FAHASA_BOOKSTORE_FLOOR_H + 0.495, 55.45, pageEdgeMat);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.09, 10), warmWallMat);
      mug.position.set(cx - 0.06, FAHASA_BOOKSTORE_FLOOR_H + 0.52, 55.3);
      staticGroup.add(mug);
    }
  });

  // Floor 2 TCG Duel Zone
  const playmatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.68 });
  const cardMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
  [-380.0, -373.0].forEach((tx) => {
    addBox(3.6, 0.78, 1.7, tx, FAHASA_BOOKSTORE_FLOOR_H + 0.39, 81.1, woodOakMat);
    addBox(2.4, 0.03, 1.1, tx, FAHASA_BOOKSTORE_FLOOR_H + 0.8, 81.1, playmatMat);
    addBox(0.28, 0.02, 0.38, tx - 0.5, FAHASA_BOOKSTORE_FLOOR_H + 0.82, 81.1, cardMat);
    addBox(0.28, 0.02, 0.38, tx + 0.5, FAHASA_BOOKSTORE_FLOOR_H + 0.82, 81.1, cardMat);
    [-0.9, 0.9].forEach((oz) => {
      addBox(2.8, 0.45, 0.46, tx, FAHASA_BOOKSTORE_FLOOR_H + 0.225, 81.1 + oz, woodDarkMat);
    });
  });

  // Calibrated High-Output Interior & Plaza Night Lighting (FAHASA Floor 1, Floor 2, Front & Rear Plazas)
  addLight(-378.0, 3.6, 56.0, 0xfffbeb, 32, 34);
  addLight(-378.0, 3.6, 74.0, 0xfffbeb, 30, 34);
  addLight(-378.0, FAHASA_BOOKSTORE_FLOOR_H + 3.6, 58.0, 0xfffbeb, 32, 34);
  addLight(-378.0, FAHASA_BOOKSTORE_FLOOR_H + 3.6, 76.0, 0xfff3d6, 30, 34);
  addLight(-378.0, 4.0, 44.8, 0xfde68a, 30, 32);
  addLight(-388.0, 3.8, 45.2, 0xffedd5, 22, 26);
  addLight(-368.0, 3.8, 45.2, 0xffedd5, 22, 26);
  addLight(-378.0, 3.8, 90.2, 0xfde68a, 24, 28);
  // Warm glow pools on FAHASA front & rear plazas
  [
    [-385.5, 45.2],
    [-378.0, 45.2],
    [-370.5, 45.2],
    [-378.0, 90.5],
  ].forEach(([px, pz]) => {
    const fPool = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 11.0), warmPoolMat);
    fPool.rotation.x = -Math.PI / 2;
    fPool.position.set(px, 0.055, pz);
    staticGroup.add(fPool);
  });

  // =========================================================================
  // PART 2: PHỐ ĂN VẶT CỔNG TRƯỜNG & TRÀ SỮA (HẺM ĐÈN LỒNG NEON)
  //         Inspired by Saigon/Hanoi Night Market Alley + Tea Kiosks
  // =========================================================================
  addBox(30.0, 0.06, 51.5, -410.0, 0.01, 68.25, warmPlazaMat);

  // Multi-Tier Neon Tam Quan Entrance Archway at Z = 43.2 (opening X = -414.2..-405.8)
  addBox(0.95, 5.2, 0.95, -414.8, 2.6, 43.2, metalDarkMat);
  addBox(0.95, 5.2, 0.95, -405.2, 2.6, 43.2, metalDarkMat);
  // Glowing neon vertical light tubes framing portal pillars
  addBox(0.14, 4.7, 0.14, -414.25, 2.5, 42.7, pinkNeonMat);
  addBox(0.14, 4.7, 0.14, -405.75, 2.5, 42.7, cyanNeonMat);
  addBox(12.2, 1.65, 0.72, -410.0, 5.35, 43.2, fahasaNavyMat);
  addBox(12.6, 0.16, 0.95, -410.0, 6.25, 43.2, pinkNeonMat);

  const snackArchTex = createFlagshipSignTex(
    '#831843',
    '#be185d',
    '#67e8f9',
    'PHỐ ĂN VẶT CỔNG TRƯỜNG',
    'TRÀ SỮA • TRÀ CHANH • BÁNH TRÁNG • XIÊN QUE',
    '#ffffff',
    '#fde047',
    1280,
    224
  );
  const snackArchMat = new THREE.MeshStandardMaterial({
    map: snackArchTex,
    emissive: 0xec4899,
    emissiveMap: snackArchTex,
    emissiveIntensity: 0.6,
    roughness: 0.26,
  });
  neonMats.push(snackArchMat);
  const archBoard = new THREE.Mesh(new THREE.BoxGeometry(11.4, 1.45, 0.22), snackArchMat);
  archBoard.position.set(-410.0, 5.35, 42.78);
  staticGroup.add(archBoard);
  // Hanging portal lanterns under arch
  [-412.6, -410.0, -407.4].forEach((lx, idx) => addHangingLantern(lx, 4.2, 43.2, idx, 1.05));

  // Build 4 Rich Street-Food & Tea Kiosks (with Tile Counters, Itemized Menu Boards, Toppings & Exhaust Hoods)
  const buildSnackKiosk = (
    cx: number,
    cz: number,
    faceEast: boolean,
    accentHex: number,
    stripeHex: number,
    title: string,
    menuLines: string[],
    mascotType: 'boba' | 'skewer' | 'burger' | 'icecream'
  ) => {
    const kGrp = new THREE.Group();
    kGrp.position.set(cx, 0, cz);
    kGrp.rotation.y = faceEast ? Math.PI / 2 : -Math.PI / 2;

    const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.42 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: stripeHex, roughness: 0.42 });
    const accentHexStr = `#${accentHex.toString(16).padStart(6, '0')}`;
    const stripeHexStr = `#${stripeHex.toString(16).padStart(6, '0')}`;

    // Hollow Lower Perimeter Walls (Y=0..1.12) + Tiled Interior Floor (Y=0.08) + Walk-in Staff Door!
    const doorSideDir = faceEast ? 1 : -1; // Always faces North entrance walkway (Z = cz - 4.16)
    const solidSideDir = -doorSideDir;
    const doorWallX = doorSideDir * 4.16;
    const solidWallX = solidSideDir * 4.16;

    // Hygienic ceramic tile interior floor (sits flush at Y=0.08 so staff walk cleanly inside)
    const kioskFloor = new THREE.Mesh(new THREE.BoxGeometry(8.08, 0.08, 4.68), tileFloorMat);
    kioskFloor.position.set(0, 0.04, 0);
    kGrp.add(kioskFloor);

    // Front & back lower base walls (hollow inside, bounded strictly between corner columns!)
    const frontLowerWall = new THREE.Mesh(new THREE.BoxGeometry(8.18, 1.12, 0.28), accentMat);
    frontLowerWall.position.set(0, 0.56, 2.46);
    kGrp.add(frontLowerWall);
    const backLowerWall = new THREE.Mesh(new THREE.BoxGeometry(8.18, 1.12, 0.28), accentMat);
    backLowerWall.position.set(0, 0.56, -2.46);
    kGrp.add(backLowerWall);
    // Solid side lower wall
    const solidSideLower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.12, 4.7), accentMat);
    solidSideLower.position.set(solidWallX, 0.56, 0);
    kGrp.add(solidSideLower);
    // Door side lower wall split cleanly around open walk-in doorway (Z = -1.75 .. -0.45)
    const doorSideRearLower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.12, 0.6), accentMat);
    doorSideRearLower.position.set(doorWallX, 0.56, -2.05);
    kGrp.add(doorSideRearLower);
    const doorSideFrontLower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.12, 2.8), accentMat);
    doorSideFrontLower.position.set(doorWallX, 0.56, 0.95);
    kGrp.add(doorSideFrontLower);

    // Front & back vertical fluted panels (cleanly proud of Z=±2.60)
    for (let rx = -3.8; rx <= 3.8; rx += 0.68) {
      const ribF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.06), stripeMat);
      ribF.position.set(rx, 0.56, 2.635);
      kGrp.add(ribF);
      const ribB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.06), stripeMat);
      ribB.position.set(rx, 0.56, -2.635);
      kGrp.add(ribB);
    }
    // Side vertical fluted panels (skipped across the open doorway on doorSideDir)
    for (let rz = -2.1; rz <= 2.1; rz += 0.7) {
      [-1, 1].forEach((sideDir) => {
        if (sideDir === doorSideDir && rz > -1.85 && rz < -0.35) return;
        const ribS = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.12), stripeMat);
        ribS.position.set(sideDir * 4.335, 0.56, rz);
        kGrp.add(ribS);
      });
    }

    // Stainless serving counter + warm oak outer standing bar ledge
    const counter = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.12, 0.92), steelBrightMat);
    counter.position.set(0, 1.18, 2.58);
    kGrp.add(counter);
    const outerBar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.42), woodOakMat);
    outerBar.position.set(1.5, 1.04, 2.89);
    kGrp.add(outerBar);
    [0.1, 2.9].forEach((bx) => {
      const brk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.32), metalDarkMat);
      brk.position.set(bx, 0.85, 2.84);
      kGrp.add(brk);
    });

    // Enclosed Back Wall (Y=1.12..3.78, Z=-2.46)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.04, 2.66, 0.28), warmWallMat);
    backWall.position.set(0, 2.45, -2.46);
    kGrp.add(backWall);
    for (let bx = -3.9; bx <= 3.9; bx += 0.65) {
      const slatBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.56, 0.06), timberSlatMat);
      slatBack.position.set(bx, 2.45, -2.635);
      kGrp.add(slatBack);
    }
    const waistTrim = new THREE.Mesh(new THREE.BoxGeometry(8.04, 0.14, 0.38), stripeMat);
    waistTrim.position.set(0, 1.19, -2.46);
    kGrp.add(waistTrim);

    // Side Poster Texture & Material
    const sidePosterTex = createKioskSidePosterTex(title, 'BEST SELLER • CỔNG TRƯỜNG', accentHexStr, stripeHexStr);
    const sidePosterMat = new THREE.MeshStandardMaterial({
      map: sidePosterTex,
      emissive: accentHex,
      emissiveMap: sidePosterTex,
      emissiveIntensity: 0.48,
      roughness: 0.3,
    });
    neonMats.push(sidePosterMat);

    // 1) Solid Side Wall (-doorSideDir): Rear poster wall + see-through side glass window
    const solidRearPanel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.66, 2.5), warmWallMat);
    solidRearPanel.position.set(solidWallX, 2.45, -1.05);
    kGrp.add(solidRearPanel);
    const solidHeader = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.66, 2.15), warmWallMat);
    solidHeader.position.set(solidWallX, 3.45, 1.28);
    kGrp.add(solidHeader);
    const solidSill = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 2.15), warmWallMat);
    solidSill.position.set(solidWallX, 1.4, 1.28);
    kGrp.add(solidSill);
    const solidTrim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 4.68), stripeMat);
    solidTrim.position.set(solidSideDir * 4.18, 1.19, 0.0);
    kGrp.add(solidTrim);
    const solidGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.44, 2.1), glassMat);
    solidGlass.position.set(solidWallX, 2.4, 1.26);
    kGrp.add(solidGlass);
    const posterBoard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.85, 1.85), sidePosterMat);
    posterBoard.position.set(solidWallX + solidSideDir * 0.19, 2.45, -1.08);
    kGrp.add(posterBoard);

    // 2) Door Side Wall (doorSideDir, facing North walkway): Open 1.30m Walk-in Doorway + Swinging Glass Staff Door!
    const doorRearUpper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.66, 0.6), warmWallMat);
    doorRearUpper.position.set(doorWallX, 2.45, -2.05);
    kGrp.add(doorRearUpper);
    const doorMidPier = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.66, 0.65), warmWallMat);
    doorMidPier.position.set(doorWallX, 2.45, -0.125);
    kGrp.add(doorMidPier);
    const doorTransom = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.4, 1.3), warmWallMat);
    doorTransom.position.set(doorWallX, 3.08, -1.1);
    kGrp.add(doorTransom);
    const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.66, 2.15), warmWallMat);
    doorHeader.position.set(doorWallX, 3.45, 1.28);
    kGrp.add(doorHeader);
    const doorSill = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 2.15), warmWallMat);
    doorSill.position.set(doorWallX, 1.4, 1.28);
    kGrp.add(doorSill);
    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.44, 2.1), glassMat);
    doorGlass.position.set(doorWallX, 2.4, 1.26);
    kGrp.add(doorGlass);
    const doorTrimRear = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.6), stripeMat);
    doorTrimRear.position.set(doorSideDir * 4.18, 1.19, -2.05);
    kGrp.add(doorTrimRear);
    const doorTrimFront = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 2.8), stripeMat);
    doorTrimFront.position.set(doorSideDir * 4.18, 1.19, 0.95);
    kGrp.add(doorTrimFront);

    // Steel Door Frame, Threshold Plate & Hinged Staff Entrance Door (swung open outward ~58°!)
    const thresholdPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 1.3), steelBrightMat);
    thresholdPlate.position.set(doorWallX, 0.04, -1.1);
    kGrp.add(thresholdPlate);
    [-1.72, -0.48].forEach((jz) => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.32, 0.07), metalDarkMat);
      jamb.position.set(doorWallX, 1.24, jz);
      kGrp.add(jamb);
    });
    const lintelBar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 1.38), metalDarkMat);
    lintelBar.position.set(doorWallX, 2.38, -1.1);
    kGrp.add(lintelBar);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(doorWallX + doorSideDir * 0.12, 0.08, -1.68);
    doorPivot.rotation.y = doorSideDir * 1.02;
    const doorKick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.94, 1.14), accentMat);
    doorKick.position.set(0, 0.49, 0.57);
    doorPivot.add(doorKick);
    const doorPane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.16, 1.02), glassMat);
    doorPane.position.set(0, 1.56, 0.57);
    doorPivot.add(doorPane);
    [0.03, 1.11].forEach((sz) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.24, 0.07), metalDarkMat);
      stile.position.set(0, 1.12, sz);
      doorPivot.add(stile);
    });
    [0.03, 0.96, 2.2].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.16), metalDarkMat);
      rail.position.set(0, ry, 0.57);
      doorPivot.add(rail);
    });
    [-0.06, 0.06].forEach((hx) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), steelBrightMat);
      handle.position.set(hx, 1.08, 0.96);
      doorPivot.add(handle);
    });
    const staffDoorBadge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.62), stripeMat);
    staffDoorBadge.position.set(0, 1.32, 0.57);
    doorPivot.add(staffDoorBadge);
    kGrp.add(doorPivot);

    // 4 Corner Steel Columns (proud outside body ±4.30 / ±2.60 and trims on ALL axes so ZERO z-fighting!)
    [
      [-4.24, -2.5],
      [4.24, -2.5],
      [-4.24, 2.5],
      [4.24, 2.5],
    ].forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.84, 0.3), metalDarkMat);
      col.position.set(px, 1.92, pz);
      kGrp.add(col);
    });
    [-1.4, 1.4].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.65, 0.2), metalDarkMat);
      post.position.set(px, 2.4, 2.42);
      kGrp.add(post);
    });

    // Exterior Back Wall Illuminated Banner + Stainless Exhaust Chimney Vent
    const backBanner = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.25, 0.1), sidePosterMat);
    backBanner.position.set(0, 2.55, -2.71);
    kGrp.add(backBanner);
    const ventPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.45, 10), steelBrightMat);
    ventPipe.position.set(2.8, 4.45, -1.6);
    kGrp.add(ventPipe);
    const ventCap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.28, 10), metalDarkMat);
    ventCap.position.set(2.8, 5.25, -1.6);
    kGrp.add(ventCap);

    // Interior Kitchen Back-Wall Prep Counter, Beverage Fridge, Sink, Shelves & Ceiling LED!
    const prepCabinet = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.8, 0.56), warmWallMat);
    prepCabinet.position.set(0, 0.48, -2.02);
    kGrp.add(prepCabinet);
    for (let cxDoor = -2.2; cxDoor <= 2.2; cxDoor += 1.1) {
      const cabDoor = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.68, 0.04), timberSlatMat);
      cabDoor.position.set(cxDoor, 0.48, -1.73);
      kGrp.add(cabDoor);
    }
    const prepTop = new THREE.Mesh(new THREE.BoxGeometry(5.72, 0.06, 0.62), steelBrightMat);
    prepTop.position.set(0, 0.91, -2.01);
    kGrp.add(prepTop);
    // Under-counter illuminated mini drink cooler + sink/faucet + inner POS register
    const chiller = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.74, 0.56), cyanNeonMat);
    chiller.position.set(-2.1, 0.46, -1.98);
    kGrp.add(chiller);
    const chillerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.04), glassMat);
    chillerGlass.position.set(-2.1, 0.46, -1.69);
    kGrp.add(chillerGlass);
    const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.42), metalDarkMat);
    sinkBasin.position.set(1.85, 0.94, -2.0);
    kGrp.add(sinkBasin);
    const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), steelBrightMat);
    faucetStem.position.set(1.85, 1.09, -2.18);
    kGrp.add(faucetStem);
    const prepBoard = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.44), woodOakMat);
    prepBoard.position.set(-0.35, 0.96, -2.0);
    kGrp.add(prepBoard);
    const posStand = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.06), metalDarkMat);
    posStand.position.set(0.35, 1.38, 2.26);
    kGrp.add(posStand);
    const posScreen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.04), cyanNeonMat);
    posScreen.position.set(0.35, 1.38, 2.23);
    kGrp.add(posScreen);

    const kitchenShelfY = [2.05, 2.68];
    kitchenShelfY.forEach((sy, sIdx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 0.44), woodOakMat);
      shelf.position.set(0, sy, -2.08);
      kGrp.add(shelf);
      for (let bx = -2.4; bx <= 2.4; bx += 0.6) {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.09, 0.34, 8),
          new THREE.MeshStandardMaterial({
            color: [0xf43f5e, 0x22c55e, 0xf59e0b, 0x06b6d4, 0xa855f7][Math.abs(Math.round(bx * 2) + sIdx) % 5],
            roughness: 0.3,
          })
        );
        bottle.position.set(bx, sy + 0.21, -2.08);
        kGrp.add(bottle);
      }
    });
    const rangeHood = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.48, 0.92), steelBrightMat);
    rangeHood.position.set(1.2, 3.45, -1.85);
    kGrp.add(rangeHood);
    const interiorCeilingLed = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.06, 0.26), interiorLedMat);
    interiorCeilingLed.position.set(0, 3.62, 0.15);
    kGrp.add(interiorCeilingLed);

    // Under-canopy warm LED strip + Glowing Fairy Bulbs along front eave!
    const kioskLed = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.08, 0.16), interiorLedMat);
    kioskLed.position.set(0, 3.52, 2.34);
    kGrp.add(kioskLed);

    // Pitched Boutique Striped Awning Canopy + Neon Fascia Trim
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.24, 6.4), metalDarkMat);
    roof.position.set(0, 3.9, 0.28);
    roof.rotation.x = 0.08;
    kGrp.add(roof);
    const roofNeonTrim = new THREE.Mesh(new THREE.BoxGeometry(9.44, 0.09, 0.1), stripeMat);
    roofNeonTrim.position.set(0, 3.74, 3.46);
    kGrp.add(roofNeonTrim);
    for (let sx = -4.3; sx <= 4.3; sx += 0.72) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.09, 1.38),
        Math.round(sx * 2) % 2 === 0 ? accentMat : stripeMat
      );
      slat.position.set(sx, 3.55, 3.05);
      slat.rotation.x = 0.26;
      kGrp.add(slat);
    }
    for (let fx = -4.0; fx <= 4.0; fx += 0.8) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), warmLanternGlowMat);
      bulb.position.set(fx, 3.36, 3.55);
      kGrp.add(bulb);
    }

    // Glowing Itemized Menu Lightbox (with Rear Secondary Sign so legible from both sides!)
    const kTex = createKioskMenuTex(title, menuLines, accentHexStr, '#fde047');
    const kSignMat = new THREE.MeshStandardMaterial({
      map: kTex,
      emissive: accentHex,
      emissiveMap: kTex,
      emissiveIntensity: 0.75,
      roughness: 0.22,
    });
    neonMats.push(kSignMat);
    const signFrame = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.48, 0.26), metalDarkMat);
    signFrame.position.set(0, 4.74, 2.75);
    kGrp.add(signFrame);
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.32, 0.3), kSignMat);
    signMesh.position.set(0, 4.74, 2.76);
    kGrp.add(signMesh);

    // Bespoke 3D Rooftop Mascot Prop (detailed multi-part sculpture!)
    const propGrp = new THREE.Group();
    propGrp.position.set(-3.15, 4.18, 1.25);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.045, 8, 24), stripeMat);
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.y = 0.08;
    propGrp.add(haloRing);
    if (mascotType === 'boba') {
      const bobaDarkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.3 });
      const teaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
      const cupBase = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 0.36, 14), bobaDarkMat);
      cupBase.position.y = 0.22;
      propGrp.add(cupBase);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.46, 0.92, 14), teaMat);
      cup.position.y = 0.86;
      propGrp.add(cup);
      const cream = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.56, 0.22, 14), new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.35 }));
      cream.position.y = 1.38;
      propGrp.add(cream);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.56, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), glassMat);
      lid.position.y = 1.48;
      propGrp.add(lid);
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.92, 8), stripeMat);
      straw.position.set(0.18, 1.88, 0);
      straw.rotation.z = -0.2;
      propGrp.add(straw);
    } else if (mascotType === 'skewer') {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.38, 0.82, 12), accentMat);
      cup.position.y = 0.44;
      propGrp.add(cup);
      [-0.22, 0, 0.22].forEach((ox, idx) => {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.35, 6), woodOakMat);
        stick.position.set(ox, 1.05, (idx - 1) * 0.08);
        stick.rotation.z = (idx - 1) * -0.22;
        propGrp.add(stick);
        [0.95, 1.25, 1.55].forEach((by, bi) => {
          const ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 10, 8),
            new THREE.MeshStandardMaterial({ color: (idx + bi) % 2 === 0 ? 0xf59e0b : 0xef4444, roughness: 0.35 })
          );
          ball.position.set(ox + (idx - 1) * 0.08 * bi, by, (idx - 1) * 0.08);
          propGrp.add(ball);
        });
      });
    } else if (mascotType === 'burger') {
      const bunMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.55 });
      const bBot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.58, 0.22, 14), bunMat);
      bBot.position.y = 0.2;
      propGrp.add(bBot);
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.22, 14), woodDarkMat);
      patty.position.y = 0.42;
      propGrp.add(patty);
      const cheese = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 1.12), stripeMat);
      cheese.position.y = 0.56;
      cheese.rotation.y = 0.4;
      propGrp.add(cheese);
      const lettuce = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.1, 14), new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 }));
      lettuce.position.y = 0.65;
      propGrp.add(lettuce);
      const bTop = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), bunMat);
      bTop.position.y = 0.7;
      propGrp.add(bTop);
    } else {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.18, 12), woodOakMat);
      cone.rotation.x = Math.PI;
      cone.position.y = 0.62;
      propGrp.add(cone);
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3 }));
      s1.position.y = 1.24;
      propGrp.add(s1);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.3 }));
      s2.position.y = 1.66;
      propGrp.add(s2);
      const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), fahasaRedMat);
      cherry.position.y = 2.02;
      propGrp.add(cherry);
    }
    kGrp.add(propGrp);

    // Specialty Front Counter Stations + Glass Display Case + Street Equipment!
    const displayCase = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.66, 0.72), glassMat);
    displayCase.position.set(-1.45, 1.56, 2.48);
    kGrp.add(displayCase);
    const caseLed = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 0.12), interiorLedMat);
    caseLed.position.set(-1.45, 1.86, 2.48);
    kGrp.add(caseLed);
    [-2.5, -1.8, -1.1, -0.4].forEach((tx, idx) => {
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.16, 0.44),
        new THREE.MeshStandardMaterial({ color: [0xf59e0b, 0xef4444, 0x10b981, 0xfbbf24][idx], roughness: 0.45 })
      );
      tray.position.set(tx, 1.36, 2.48);
      kGrp.add(tray);
    });

    if (mascotType === 'boba') {
      // Cup Sealer Machine + Twin Stainless Tea Tanks + Shaker Bar
      const sealer = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.44), metalDarkMat);
      sealer.position.set(0.85, 1.52, 2.46);
      kGrp.add(sealer);
      [1.65, 2.25].forEach((tx, idx) => {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.54, 12), idx === 0 ? steelBrightMat : accentMat);
        tank.position.set(tx, 1.51, 2.46);
        kGrp.add(tank);
      });
    } else if (mascotType === 'skewer') {
      // Glowing Street Grill with Golden Skewers
      const grillBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.24, 0.58), metalDarkMat);
      grillBox.position.set(1.5, 1.36, 2.48);
      kGrp.add(grillBox);
      const embers = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.04, 0.46), warmLanternGlowMat);
      embers.position.set(1.5, 1.49, 2.48);
      kGrp.add(embers);
    } else if (mascotType === 'burger') {
      // Stainless Fryer Station & Stacked Paper Bags
      const fryer = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.56), steelBrightMat);
      fryer.position.set(1.4, 1.45, 2.48);
      kGrp.add(fryer);
      const bagStack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.34, 0.36), woodOakMat);
      bagStack.position.set(2.45, 1.41, 2.48);
      kGrp.add(bagStack);
    } else {
      // Soft-Serve Ice Cream Machine with 3 Nozzles + Waffle Cone Rack
      const icMachine = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.56), steelBrightMat);
      icMachine.position.set(1.45, 1.63, 2.46);
      kGrp.add(icMachine);
      const icTrim = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.16, 0.58), accentMat);
      icTrim.position.set(1.45, 1.92, 2.46);
      kGrp.add(icTrim);
    }
    // Topping jars / condiment dispensers on far right counter
    [2.95, 3.45].forEach((jx, idx) => {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.38, 10),
        new THREE.MeshStandardMaterial({ color: [0xfde047, 0xf43f5e][idx], roughness: 0.3 })
      );
      jar.position.set(jx, 1.43, 2.48);
      kGrp.add(jar);
    });

    staticGroup.add(kGrp);
  };

  buildSnackKiosk(
    -421.1,
    53.5,
    true,
    0x0d9488,
    0xfef08a,
    'TRÀ SỮA BÔNG BIỂN',
    ['TRÀ SỮA TRÂN CHÂU ĐƯỜNG ĐEN · 25K', 'TRÀ CHANH GIÃ TAY · TRÀ ĐÀO CAM SẢ · 18K'],
    'boba'
  );
  buildSnackKiosk(
    -421.1,
    69.5,
    true,
    0xea580c,
    0xfde047,
    'BÁNH TRÁNG & XIÊN QUE',
    ['BÁNH TRÁNG TRỘN BÒ KHÔ · 20K', 'CÁ VIÊN CHIÊN NƯỚC MẮM · XÚC XÍCH · 15K'],
    'skewer'
  );
  buildSnackKiosk(
    -398.9,
    53.5,
    false,
    0xdc2626,
    0xfacc15,
    'BÁNH MÌ & GÀ RÁN',
    ['GÀ RÁN GIÒN CAY SỐT PHÔ MAI · 32K', 'BÁNH MÌ NƯỚNG MUỐI ỚT · KHOAI LẮC · 20K'],
    'burger'
  );
  buildSnackKiosk(
    -398.9,
    69.5,
    false,
    0xdb2777,
    0x7dd3fc,
    'KEM TƯƠI & NƯỚC ÉP',
    ['KEM TƯƠI TRÀ XANH · VANI · 12K', 'SINH TỐ XOÀI · DỪA TẮC · NƯỚC ÉP · 22K'],
    'icecream'
  );

  // Authentic Vietnamese Street-Food Low Tables & Plastic Stools + Chili/Chopstick/Boba Props
  const umbrellaPalette = [0x0ea5e9, 0xf43f5e, 0x10b981, 0xf59e0b];
  const buildPatioSet = (tx: number, tz: number, colorIdx: number) => {
    const g = new THREE.Group();
    g.position.set(tx, 0, tz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.38, 8), steelBrightMat);
    pole.position.y = 1.19;
    g.add(pole);
    // Stainless square street folding table
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.92), steelBrightMat);
    tableTop.position.y = 0.58;
    g.add(tableTop);
    [
      [-0.48, -0.38],
      [0.48, -0.38],
      [-0.48, 0.38],
      [0.48, 0.38],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.56, 6), metalDarkMat);
      leg.position.set(lx, 0.28, lz);
      g.add(leg);
    });
    const uMat = new THREE.MeshStandardMaterial({
      color: umbrellaPalette[colorIdx % umbrellaPalette.length],
      roughness: 0.62,
      side: THREE.DoubleSide,
    });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.42, 0.52, 8), uMat);
    canopy.position.y = 2.48;
    g.add(canopy);
    // Low red/blue plastic stools (ghế đẩu) + snack tray + chili bottle + iced tea cups
    [-0.78, 0.78].forEach((sz, si) => {
      const stool = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.34, 0.36),
        new THREE.MeshStandardMaterial({ color: si === 0 ? 0xdc2626 : 0x2563eb, roughness: 0.65 })
      );
      stool.position.set(0, 0.17, sz);
      g.add(stool);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.16, 8), warmLanternGlowMat);
      cup.position.set((si - 0.5) * 0.45, 0.68, (si - 0.5) * 0.32);
      g.add(cup);
    });
    // Snack plate & sauce bottle on table center
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.04, 10), fahasaOrangeMat);
    plate.position.set(0.12, 0.63, 0);
    g.add(plate);
    const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 8), fahasaRedMat);
    sauce.position.set(-0.22, 0.69, 0.14);
    g.add(sauce);

    staticGroup.add(g);
  };
  [51.75, 59.75, 68.75, 78.25].forEach((tz, idx) => {
    buildPatioSet(-415.5, tz, idx);
    buildPatioSet(-404.5, tz, idx + 1);
  });

  // Check-In Neon Backdrop Sign at Alley Exit (West side near Z=85) + Crisscrossing Lantern Canopy!
  const checkInTex = createFlagshipSignTex(
    '#312e81',
    '#701a75',
    '#67e8f9',
    'THANH XUÂN CỔNG TRƯỜNG',
    'CHECK-IN PHỐ ĂN VẶT • FULL TOPPING',
    '#f472b6',
    '#fef08a',
    768,
    192
  );
  const checkInMat = new THREE.MeshStandardMaterial({
    map: checkInTex,
    emissive: 0xd946ef,
    emissiveMap: checkInTex,
    emissiveIntensity: 0.55,
    roughness: 0.28,
  });
  neonMats.push(checkInMat);
  addBox(4.8, 2.4, 0.25, -421.4, 1.85, 83.2, metalDarkMat);
  const checkInBoard = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.8, 0.14), checkInMat);
  checkInBoard.position.set(-421.4, 1.95, 83.02);
  staticGroup.add(checkInBoard);

  // Overhead Crisscrossing Festoon String Lights & Colorful Hội An Lanterns
  const cordMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  [48.0, 56.0, 64.0, 72.0, 80.0, 88.0].forEach((lz, rowIdx) => {
    addBox(18.0, 0.04, 0.04, -410.0, 4.95, lz, cordMat);
    for (let bx = -417.5; bx <= -402.5; bx += 2.5) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), warmLanternGlowMat);
      bulb.position.set(bx, 4.82, lz);
      staticGroup.add(bulb);
      if (Math.round(bx + rowIdx) % 2 === 0) {
        addHangingLantern(bx, 4.42, lz, Math.abs(Math.round(bx)) + rowIdx, 0.88);
      }
    }
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 12.0), warmPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-410.0, 0.045, lz);
    staticGroup.add(pool);
  });
  addLight(-410.0, 4.8, 44.5, 0xfde68a, 30, 32);
  addLight(-410.0, 4.8, 56.0, 0xfde68a, 34, 34);
  addLight(-410.0, 4.8, 70.0, 0xfde68a, 34, 34);
  addLight(-410.0, 4.6, 84.5, 0xfef08a, 30, 32);
  // Warm interior lights inside all 4 walk-in kiosks
  addLight(-421.1, 3.35, 53.5, 0xfffbeb, 18, 14);
  addLight(-421.1, 3.35, 69.5, 0xfffbeb, 18, 14);
  addLight(-398.9, 3.35, 53.5, 0xfffbeb, 18, 14);
  addLight(-398.9, 3.35, 69.5, 0xfffbeb, 18, 14);
  addLight(-394.0, 4.2, 58.0, 0xffd27d, 24, 26);
  addLight(-394.0, 4.2, 82.0, 0xffd27d, 24, 26);
  addBicycle(-422.2, 85.0, Math.PI / 2, 0xf59e0b);
  addBicycle(-420.5, 85.2, Math.PI / 2 - 0.15, 0x06b6d4);

  // =========================================================================
  // PART 3A: SÂN BÓNG RỔ ĐƯỜNG PHỐ 3x3 (STREETBALL ARENA + SHOT CLOCK + GRAFFITI)
  // =========================================================================
  addBox(30.0, 0.08, 52.0, -378.5, 0.02, 121.0, concreteMat);
  const courtMat = new THREE.MeshStandardMaterial({
    map: createBasketballCourtTex(),
    roughness: 0.68,
    metalness: 0.05,
  });
  const courtPlane = new THREE.Mesh(new THREE.PlaneGeometry(25.0, 44.0), courtMat);
  courtPlane.rotation.x = -Math.PI / 2;
  courtPlane.position.set(-378.5, 0.068, 121.0);
  staticGroup.add(courtPlane);

  // Glowing Streetball North Gate Portal Arch (X = -381..-375.5, Z = 96.0 — completely open underneath!)
  addBox(0.32, 3.6, 0.32, -381.0, 1.8, 96.0, metalDarkMat);
  addBox(0.32, 3.6, 0.32, -375.5, 1.8, 96.0, metalDarkMat);
  const courtGateTex = createFlagshipSignTex('#0f172a', '#1e3a8a', '#f97316', 'STREETBALL 3x3', 'SÂN BÓNG RỔ THANH NIÊN', '#ffffff', '#fb923c', 640, 140);
  const courtGateMat = new THREE.MeshStandardMaterial({
    map: courtGateTex,
    emissive: 0xf97316,
    emissiveMap: courtGateTex,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  neonMats.push(courtGateMat);
  addBox(6.2, 0.95, 0.25, -378.25, 3.85, 96.0, courtGateMat);

  // Chain-link Perimeter Fence (3.2m tall)
  const fenceTex = createChainLinkTex();
  const fenceMeshMat = new THREE.MeshStandardMaterial({
    map: fenceTex,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
    roughness: 0.45,
    metalness: 0.6,
  });
  const addFenceSeg = (x0: number, z0: number, x1: number, z1: number) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.1), fenceMeshMat);
    panel.position.set((x0 + x1) * 0.5, 1.6, (z0 + z1) * 0.5);
    panel.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    staticGroup.add(panel);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), steelBrightMat);
    rail.position.set((x0 + x1) * 0.5, 3.15, (z0 + z1) * 0.5);
    rail.rotation.y = -Math.atan2(dz, dx);
    staticGroup.add(rail);
    const steps = Math.max(1, Math.round(len / 5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.25, 8), steelBrightMat);
      post.position.set(THREE.MathUtils.lerp(x0, x1, t), 1.625, THREE.MathUtils.lerp(z0, z1, t));
      staticGroup.add(post);
    }
  };
  // Paved Walkway Connecting Phan Châu Trinh West Side Gate (X=-361, Z=103) -> Basketball Court East Gate (X=-364, Z=103.5) & North Plaza (Z=88..106)
  addBox(3.4, 0.05, 19.0, -362.5, 0.015, 97.5, coolPlazaMat);

  addFenceSeg(-393.0, 96.0, -381.0, 96.0);
  addFenceSeg(-375.5, 96.0, -364.0, 96.0);
  addFenceSeg(-393.0, 146.0, -364.0, 146.0);
  // East Fence splits at Z = 101.4 .. 105.6 for direct student entrance from Trường THPT Phan Châu Trinh!
  addFenceSeg(-364.0, 96.0, -364.0, 101.4);
  addFenceSeg(-364.0, 105.6, -364.0, 146.0);
  addFenceSeg(-393.0, 96.0, -393.0, 118.0);
  addFenceSeg(-393.0, 124.0, -393.0, 146.0);

  // Basketball Court East Side Gate Portal (facing School West Side Gate across walkway!)
  addBox(0.28, 3.5, 0.28, -364.0, 1.75, 101.4, metalDarkMat);
  addBox(0.28, 3.5, 0.28, -364.0, 1.75, 105.6, metalDarkMat);
  addBox(0.28, 0.75, 4.6, -364.0, 3.65, 103.5, courtGateMat);

  // 2 Pro Tempered-Glass Hoops with 24s Shot Clocks
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.45 });
  const netMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const shotClockTex = createFlagshipSignTex('#020617', '#020617', '#ef4444', '24', 'SHOT CLOCK', '#ef4444', '#fde047', 256, 160);
  const shotClockMat = new THREE.MeshStandardMaterial({
    map: shotClockTex,
    emissive: 0xef4444,
    emissiveMap: shotClockTex,
    emissiveIntensity: 0.72,
    roughness: 0.25,
  });
  neonMats.push(shotClockMat);

  const buildHoop = (hx: number, hz: number, yaw: number) => {
    const hGrp = new THREE.Group();
    hGrp.position.set(hx, 0, hz);
    hGrp.rotation.y = yaw;
    addBox(0.55, 1.85, 0.55, 0, 0.925, 0, fahasaNavyMat, hGrp);
    addBox(0.58, 0.3, 0.58, 0, 1.65, 0, fahasaOrangeMat, hGrp);
    addBox(0.22, 3.8, 0.22, 0, 1.9, 0, metalDarkMat, hGrp);
    addBox(0.2, 0.2, 1.45, 0, 3.55, 0.65, metalDarkMat, hGrp);
    addBox(1.85, 1.25, 0.08, 0, 3.45, 1.38, glassMat, hGrp);
    addBox(1.9, 0.08, 0.1, 0, 4.08, 1.38, steelBrightMat, hGrp);
    addBox(1.9, 0.08, 0.1, 0, 2.82, 1.38, steelBrightMat, hGrp);
    addBox(0.62, 0.46, 0.09, 0, 3.3, 1.39, rimMat, hGrp);
    // Shot Clock sitting atop backboard
    addBox(0.66, 0.42, 0.18, 0, 4.38, 1.36, shotClockMat, hGrp);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.032, 8, 18), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 3.05, 1.66);
    hGrp.add(rim);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.15, 0.42, 12, 1, true), netMat);
    net.position.set(0, 2.84, 1.66);
    hGrp.add(net);
    staticGroup.add(hGrp);
  };
  buildHoop(-378.5, 99.0, 0);
  buildHoop(-378.5, 143.0, Math.PI);

  // 3-Tier Spectator Bleachers + LED Scoreboard + Graffiti Back Wall Mural
  for (let tier = 0; tier < 3; tier++) {
    addBox(0.85, 0.35 + tier * 0.45, 25.0, -366.8 + tier * 0.85, 0.18 + tier * 0.225, 121.0, metalDarkMat);
    addBox(0.75, 0.08, 25.0, -366.8 + tier * 0.85, 0.4 + tier * 0.45, 121.0, tier % 2 === 0 ? fahasaOrangeMat : woodOakMat);
  }
  const scoreTex = createFlagshipSignTex('#020617', '#0f172a', '#38bdf8', 'HOME 18  :  16 GUEST', 'HIỆP 2  •  02:45  •  3x3 STREETBALL', '#f97316', '#4ade80', 768, 192);
  const scoreMat = new THREE.MeshStandardMaterial({
    map: scoreTex,
    emissive: 0x0ea5e9,
    emissiveMap: scoreTex,
    emissiveIntensity: 0.72,
    roughness: 0.25,
  });
  neonMats.push(scoreMat);
  addBox(0.3, 4.4, 0.3, -364.8, 2.2, 121.0, metalDarkMat);
  const scoreBoard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.6, 4.8), scoreMat);
  scoreBoard.position.set(-364.8, 4.8, 121.0);
  staticGroup.add(scoreBoard);

  // Streetball Graffiti Mural along South Fence Wall (Z = 146.3)
  const bballGraffitiTex = createGraffitiMuralTex('STREETBALL 3x3', 'PHAN CHÂU TRINH • PLAY HARD', '#1e293b', '#f97316', '#06b6d4');
  const bballGraffitiMat = new THREE.MeshStandardMaterial({ map: bballGraffitiTex, roughness: 0.55 });
  const bballMural = new THREE.Mesh(new THREE.BoxGeometry(24.0, 2.8, 0.22), bballGraffitiMat);
  bballMural.position.set(-378.5, 1.5, 146.5);
  staticGroup.add(bballMural);

  // 4 Floodlight Towers
  [
    [-392.4, 97.5],
    [-364.6, 97.5],
    [-392.4, 144.5],
    [-364.6, 144.5],
  ].forEach(([fx, fz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 7.6, 8), metalDarkMat);
    pole.position.set(fx, 3.8, fz);
    staticGroup.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.4), warmLanternGlowMat);
    head.position.set(fx + (fx < -378 ? 0.3 : -0.3), 7.65, fz);
    staticGroup.add(head);
  });
  addLight(-378.5, 6.8, 105.0, 0xfffbeb, 38, 44);
  addLight(-378.5, 6.8, 121.0, 0xffffff, 38, 44);
  addLight(-378.5, 6.8, 137.0, 0xfffbeb, 38, 44);
  addLight(-363.0, 4.2, 103.5, 0xfef08a, 24, 28);
  // Warm/bright floor glow pools across Basketball Court & East School Gate Walkway
  [
    [-378.5, 106.5],
    [-378.5, 121.0],
    [-378.5, 135.5],
  ].forEach(([cx, cz]) => {
    const cPool = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 18.0), warmPoolMat);
    cPool.rotation.x = -Math.PI / 2;
    cPool.position.set(cx, 0.082, cz);
    staticGroup.add(cPool);
  });

  // =========================================================================
  // PART 3B: CÔNG VIÊN THANH NIÊN & GRAFFITI SKATEPARK (SUPERKILEN URBAN PLAZA)
  // =========================================================================
  const skateConcreteMat = new THREE.MeshStandardMaterial({ map: createSkateparkDeckTex(), roughness: 0.72 });
  const rampBodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
  const graffitiPinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
  const graffitiCyanMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.5 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.84,
  });

  // Plaza Brick Pavers + Circular Illuminated Tiered Fountain (X = -410.0, Z = 94.0..114.0)
  addBox(30.0, 0.06, 20.0, -410.0, 0.01, 104.0, warmPlazaMat);
  const fRim = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.95, 0.52, 24), concreteMat);
  fRim.position.set(-410.0, 0.26, 103.5);
  staticGroup.add(fRim);
  const fLedRing = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.07, 8, 28), cyanNeonMat);
  fLedRing.rotation.x = Math.PI / 2;
  fLedRing.position.set(-410.0, 0.52, 103.5);
  staticGroup.add(fLedRing);
  const fWater = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.45, 24), waterMat);
  fWater.position.set(-410.0, 0.29, 103.5);
  staticGroup.add(fWater);
  const fPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.6, 12), concreteMat);
  fPillar.position.set(-410.0, 0.8, 103.5);
  staticGroup.add(fPillar);
  const fBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.45, 0.34, 16), concreteMat);
  fBowl.position.set(-410.0, 1.54, 103.5);
  staticGroup.add(fBowl);

  const fountainPlume = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 12), waterMat);
  fountainPlume.rotation.x = Math.PI;
  fountainPlume.position.set(-410.0, 2.1, 103.5);
  dynamicGroup.add(fountainPlume);

  // Youth Park Signage + Pergola Shade Canopy over Benches + Vending Machine with Illuminated Drinks
  const parkSignTex = createFlagshipSignTex('#064e3b', '#065f46', '#fde047', 'CÔNG VIÊN THANH NIÊN', 'SKATEPARK • STREETBALL 3x3', '#ffffff', '#fde047', 768, 160);
  const parkSignMat = new THREE.MeshStandardMaterial({
    map: parkSignTex,
    emissive: 0x10b981,
    emissiveMap: parkSignTex,
    emissiveIntensity: 0.45,
    roughness: 0.32,
  });
  neonMats.push(parkSignMat);
  addBox(0.24, 2.7, 0.24, -416.8, 1.35, 95.5, metalDarkMat);
  addBox(0.24, 2.7, 0.24, -412.2, 1.35, 95.5, metalDarkMat);
  const parkSign = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.2, 0.22), parkSignMat);
  parkSign.position.set(-414.5, 2.8, 95.5);
  staticGroup.add(parkSign);

  [
    [-415.8, 103.5, Math.PI / 2],
    [-404.2, 103.5, -Math.PI / 2],
    [-410.0, 110.2, Math.PI],
  ].forEach(([bx, bz, byaw]) => {
    const b = new THREE.Group();
    b.position.set(bx, 0, bz);
    b.rotation.y = byaw;
    addBox(2.0, 0.08, 0.56, 0, 0.45, 0, woodOakMat, b);
    addBox(2.0, 0.48, 0.08, 0, 0.72, -0.24, woodOakMat, b);
    addBox(0.1, 0.44, 0.48, -0.82, 0.22, 0, metalDarkMat, b);
    addBox(0.1, 0.44, 0.48, 0.82, 0.22, 0, metalDarkMat, b);
    staticGroup.add(b);
  });

  // Glowing Beverage Vending Machine with Visible Cans
  addBox(1.5, 2.15, 1.0, -423.0, 1.075, 100.5, graffitiCyanMat);
  addBox(1.15, 1.25, 0.08, -422.24, 1.3, 100.5, interiorLedMat);
  [0xf43f5e, 0x22c55e, 0xfacc15, 0x3b82f6].forEach((cCol, ci) => {
    addBox(0.18, 0.22, 0.14, -422.18, 1.05 + (ci % 2) * 0.45, 100.1 + ci * 0.26, new THREE.MeshStandardMaterial({ color: cCol, roughness: 0.3 }));
  });

  // Color-Blocked Skatepark Deck (X = -424.0..-396.0, Z = 114.0..145.5)
  addBox(28.0, 0.08, 31.5, -410.0, 0.04, 129.75, skateConcreteMat);

  // Curved Quarter-Pipe Ramps with Painted Graffiti Flanks & Steel Coping
  const buildQuarterPipe = (cx: number, cz: number, rotY: number, flankMat: THREE.Material) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(3.8, 0);
    shape.lineTo(3.8, 0.08);
    shape.quadraticCurveTo(1.75, 0.22, 1.4, 1.75);
    shape.lineTo(0, 1.75);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 18.0, bevelEnabled: false });
    geo.translate(0, 0, -9.0);
    const mesh = new THREE.Mesh(geo, rampBodyMat);
    mesh.position.set(cx, 0.08, cz);
    mesh.rotation.y = rotY;
    staticGroup.add(mesh);

    // Painted accent trim along top lip & end caps
    addBox(1.45, 0.14, 18.05, cx + (rotY === 0 ? 0.72 : -0.72), 1.8, cz, flankMat);
    const coping = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 18.1, 10), steelBrightMat);
    coping.rotation.x = Math.PI / 2;
    const lipOff = rotY === 0 ? 1.4 : -1.4;
    coping.position.set(cx + lipOff, 1.85, cz);
    staticGroup.add(coping);
  };
  buildQuarterPipe(-423.6, 128.0, 0, graffitiPinkMat);
  buildQuarterPipe(-397.4, 128.0, Math.PI, graffitiCyanMat);

  // Center Funbox Pyramid + Graffiti Sides + Grind Rail
  addBox(5.2, 0.72, 5.8, -410.5, 0.44, 129.5, rampBodyMat);
  addBox(5.3, 0.18, 5.9, -410.5, 0.42, 129.5, graffitiPinkMat);
  addBox(5.32, 0.1, 5.92, -410.5, 0.78, 129.5, steelBrightMat);
  addBox(7.4, 0.08, 0.1, -410.5, 0.56, 120.5, steelBrightMat);
  [-413.6, -407.4].forEach((rx) => addBox(0.1, 0.52, 0.1, rx, 0.3, 120.5, metalDarkMat));

  // South Skatepark Legal Graffiti Art Wall (Z = 146.5)
  const skateGraffitiTex = createGraffitiMuralTex('SKATE OR CHILL', 'YOUTH URBAN PLAZA • ĐÀ NẴNG', '#0f172a', '#ec4899', '#22d3ee');
  const skateGraffitiMat = new THREE.MeshStandardMaterial({ map: skateGraffitiTex, roughness: 0.55 });
  const skateMural = new THREE.Mesh(new THREE.BoxGeometry(24.0, 2.8, 0.24), skateGraffitiMat);
  skateMural.position.set(-410.0, 1.5, 146.6);
  staticGroup.add(skateMural);

  // Park Perimeter Trees & Warm Bollard Lanterns
  [
    [-422.5, 96.2, true],
    [-422.5, 110.5, false],
    [-422.5, 144.8, true],
    [-397.5, 144.8, false],
    [-410.0, 145.0, true],
  ].forEach(([tx, tz, fl]) => addParkTree(tx as number, tz as number, 1.0, fl as boolean));

  // Park Perimeter Trees & Warm Bollard Lanterns (across FAHASA Front, School Walkway, Fountain Plaza & Skatepark!)
  [
    [-389.0, 43.4],
    [-367.0, 43.4],
    [-362.5, 98.5],
    [-362.5, 108.5],
    [-417.0, 97.5],
    [-403.0, 97.5],
    [-417.0, 111.5],
    [-403.0, 111.5],
    [-422.5, 128.0],
    [-397.5, 128.0],
    [-418.0, 144.2],
    [-402.0, 144.2],
    [-394.0, 72.0],
    [-394.0, 90.0],
  ].forEach(([lx, lz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.9, 8), metalDarkMat);
    post.position.set(lx, 1.45, lz);
    staticGroup.add(post);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), warmLanternGlowMat);
    globe.position.set(lx, 3.02, lz);
    staticGroup.add(globe);
    const lPool = new THREE.Mesh(new THREE.PlaneGeometry(10.0, 10.0), warmPoolMat);
    lPool.rotation.x = -Math.PI / 2;
    const poolY = lz >= 114.0 && lx <= -396.0 ? 0.095 : 0.055;
    lPool.position.set(lx, poolY, lz);
    staticGroup.add(lPool);
  });
  addLight(-410.0, 4.6, 103.5, 0xfde68a, 32, 36);
  addLight(-410.5, 5.8, 123.0, 0xe0f2fe, 34, 38);
  addLight(-410.5, 5.8, 139.0, 0xfde68a, 32, 36);

  // =========================================================================
  // PART 4: ANIMATED NPCs (~50 NPCs ACROSS ALL 3 VENUES + SCHOOL SIDE GATE)
  //         Each NPC builds real animated low-poly proxy fallback meshes so
  //         100% stay visible at ALL distances even beyond the 12-GLB cap!
  // =========================================================================
  interface DistrictNpc {
    grp: THREE.Group;
    proxyGrp: THREE.Group;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    glbHandle: GlbHumanHandle;
    role: 'cashier' | 'vendor' | 'reader_sit' | 'diner_sit' | 'stroll' | 'bball' | 'skater' | 'school_gate';
    baseX: number;
    baseY: number;
    baseZ: number;
    baseYaw: number;
    patrolAxis?: 'x' | 'z';
    patrolRange?: number;
    phase: number;
    speed: number;
    board?: THREE.Group;
  }
  const npcs: DistrictNpc[] = [];

  // Shared Geometries & Materials for zero-lag fallback proxy rendering
  const pTorsoGeo = new THREE.BoxGeometry(0.42, 0.56, 0.24);
  const pHeadGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const pHairGeo = new THREE.BoxGeometry(0.3, 0.12, 0.3);
  const pLegGeo = new THREE.BoxGeometry(0.16, 0.72, 0.18);
  const pArmGeo = new THREE.BoxGeometry(0.12, 0.5, 0.14);
  const pPackGeo = new THREE.BoxGeometry(0.32, 0.38, 0.15);

  const pSkinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.75 });
  const pHairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });
  const pPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82 });
  const pShirtStudentMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72 });
  const pTopPalette = [
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.72 }),
  ];
  const pPackPalette = [
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.75 }),
  ];

  const spawnDistrictNpc = (
    role: DistrictNpc['role'],
    x: number,
    y: number,
    z: number,
    yaw: number,
    phase: number,
    opts?: {
      seed?: number;
      isStudent?: boolean;
      patrolAxis?: 'x' | 'z';
      patrolRange?: number;
      speed?: number;
      withBoard?: boolean;
      hasBackpack?: boolean;
    }
  ) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;
    grp.position.set(x, y, z);
    grp.rotation.y = yaw;

    const proxyGrp = new THREE.Group();
    grp.add(proxyGrp);

    const seed = opts?.seed ?? npcs.length;
    const isSit = role === 'reader_sit' || role === 'diner_sit';
    const topMat =
      opts?.isStudent && role !== 'bball'
        ? pShirtStudentMat
        : pTopPalette[Math.abs(seed) % pTopPalette.length];

    const torso = new THREE.Mesh(pTorsoGeo, topMat);
    torso.position.y = isSit ? 0.82 : 1.04;
    proxyGrp.add(torso);

    const head = new THREE.Mesh(pHeadGeo, pSkinMat);
    head.position.y = isSit ? 1.26 : 1.48;
    proxyGrp.add(head);

    const hair = new THREE.Mesh(pHairGeo, pHairMat);
    hair.position.y = isSit ? 1.4 : 1.62;
    proxyGrp.add(hair);

    const leftLeg = new THREE.Mesh(pLegGeo, pPantsMat);
    leftLeg.position.set(-0.1, 0.36, isSit ? 0.16 : 0);
    if (isSit) leftLeg.rotation.x = -Math.PI * 0.42;
    proxyGrp.add(leftLeg);

    const rightLeg = new THREE.Mesh(pLegGeo, pPantsMat);
    rightLeg.position.set(0.1, 0.36, isSit ? 0.16 : 0);
    if (isSit) rightLeg.rotation.x = -Math.PI * 0.42;
    proxyGrp.add(rightLeg);

    const armY = isSit ? 0.8 : 1.02;
    const leftArm = new THREE.Mesh(pArmGeo, topMat);
    leftArm.position.set(-0.28, armY, 0);
    proxyGrp.add(leftArm);

    const rightArm = new THREE.Mesh(pArmGeo, topMat);
    rightArm.position.set(0.28, armY, 0);
    proxyGrp.add(rightArm);

    if (opts?.hasBackpack) {
      const pack = new THREE.Mesh(pPackGeo, pPackPalette[Math.abs(seed) % pPackPalette.length]);
      pack.position.set(0, isSit ? 0.82 : 1.04, -0.18);
      proxyGrp.add(pack);
    }

    const rawSpec =
      role === 'cashier' || role === 'vendor'
        ? pickStationaryCivilianModel(seed)
        : opts?.isStudent
          ? pickSchoolStudentModel(seed)
          : pickOutsideNpcModel(seed);
    const resolvedSpec = rawSpec === TEACHER_NPC_MODEL ? pickStationaryCivilianModel(4) : rawSpec;

    const glbHandle = attachGlbHumanToNpc({
      modelSource: resolvedSpec.modelSource,
      hostGroup: grp,
      fallbackMeshes: [proxyGrp],
      targetHeight: resolvedSpec.targetHeight,
      clipProfile: resolvedSpec.clipProfile,
      rotationY: resolvedSpec.rotationY,
      initialState: isSit ? 'Sit' : 'Idle',
      phaseOffset: phase,
      allowRainUmbrella: role !== 'cashier' && role !== 'vendor' && !isSit,
    });

    let board: THREE.Group | undefined;
    if (opts?.withBoard) {
      board = new THREE.Group();
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.04, 0.82),
        new THREE.MeshStandardMaterial({ color: seed % 2 === 0 ? 0xf43f5e : 0x0ea5e9, roughness: 0.45 })
      );
      deck.position.y = 0.08;
      board.add(deck);
      [-0.26, 0.26].forEach((wz) => {
        const axle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.04), steelBrightMat);
        axle.position.set(0, 0.04, wz);
        board!.add(axle);
      });
      grp.add(board);
    }

    dynamicGroup.add(grp);
    npcs.push({
      grp,
      proxyGrp,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      glbHandle,
      role,
      baseX: x,
      baseY: y,
      baseZ: z,
      baseYaw: yaw,
      patrolAxis: opts?.patrolAxis,
      patrolRange: opts?.patrolRange,
      phase,
      speed: opts?.speed ?? 1.15,
      board,
    });
  };

  // --- 1. FAHASA BOOKSTORE & FRONT PLAZA (14 NPCs: Staff, Browsers, Readers, TCG Duelists) ---
  spawnDistrictNpc('cashier', -387.5, 0.05, 51.4, 0, 0.2, { seed: 2 });
  spawnDistrictNpc('cashier', -368.0, 0.05, 51.5, 0, 1.3, { seed: 4 });
  spawnDistrictNpc('stroll', -377.0, 0.05, 54.4, 0, 0.4, { isStudent: true, hasBackpack: true, seed: 0, patrolAxis: 'x', patrolRange: 2.2, speed: 0.95 });
  spawnDistrictNpc('stroll', -385.0, 0.05, 67.5, 0, 0.8, { isStudent: true, hasBackpack: true, seed: 1, patrolAxis: 'z', patrolRange: 6.5, speed: 1.02 });
  spawnDistrictNpc('stroll', -379.5, 0.05, 67.0, Math.PI, 1.5, { isStudent: true, hasBackpack: true, seed: 2, patrolAxis: 'z', patrolRange: 6.5, speed: 1.0 });
  spawnDistrictNpc('stroll', -371.5, 0.05, 68.0, Math.PI, 2.1, { isStudent: true, seed: 3, patrolAxis: 'z', patrolRange: 6.0, speed: 0.98 });
  spawnDistrictNpc('stroll', -378.0, 0.05, 45.2, Math.PI / 2, 0.9, { isStudent: true, hasBackpack: true, seed: 4, patrolAxis: 'x', patrolRange: 4.5, speed: 1.05 });
  // Students actively walking through the Front (Z=48) & Rear (Z=88) automatic sliding doors
  spawnDistrictNpc('stroll', -378.0, 0.05, 48.4, 0, 0.3, { isStudent: true, hasBackpack: true, seed: 0, patrolAxis: 'z', patrolRange: 3.4, speed: 1.04 });
  spawnDistrictNpc('stroll', -378.0, 0.05, 87.8, 0, 1.6, { isStudent: true, hasBackpack: true, seed: 2, patrolAxis: 'z', patrolRange: 4.2, speed: 1.02 });
  // Floor 2 Readers (centered squarely onto Reading Lounge cushions), Manga Shoppers & TCG Card Duelists
  spawnDistrictNpc('reader_sit', -385.7, FAHASA_BOOKSTORE_FLOOR_H - 0.06, 53.3, 0, 0.5, { isStudent: true, seed: 0 });
  spawnDistrictNpc('reader_sit', -383.9, FAHASA_BOOKSTORE_FLOOR_H - 0.06, 57.1, Math.PI, 1.1, { isStudent: true, seed: 2 });
  spawnDistrictNpc('reader_sit', -380.0, FAHASA_BOOKSTORE_FLOOR_H, 80.2, 0, 1.3, { isStudent: true, seed: 2 });
  spawnDistrictNpc('reader_sit', -380.0, FAHASA_BOOKSTORE_FLOOR_H, 82.0, Math.PI, 2.4, { isStudent: true, seed: 3 });
  spawnDistrictNpc('reader_sit', -373.0, FAHASA_BOOKSTORE_FLOOR_H, 80.2, 0, 0.9, { isStudent: true, seed: 1 });
  spawnDistrictNpc('reader_sit', -373.0, FAHASA_BOOKSTORE_FLOOR_H, 82.0, Math.PI, 2.0, { isStudent: true, seed: 0 });
  spawnDistrictNpc('stroll', -373.5, FAHASA_BOOKSTORE_FLOOR_H, 66.0, 0, 1.7, { isStudent: true, seed: 1, patrolAxis: 'z', patrolRange: 5.5, speed: 1.05 });

  // --- 2. PHỐ ĂN VẶT CỔNG TRƯỜNG & HẺM ĐÈN LỒNG (22 NPCs: 8 Active Kiosk Staff + 6 Seated Diners + Strollers) ---
  spawnDistrictNpc('vendor', -419.9, 0.08, 52.0, Math.PI / 2, 0.4, { seed: 5, patrolRange: 1.35, speed: 0.95 });
  spawnDistrictNpc('vendor', -421.4, 0.08, 55.2, Math.PI / 2, 3.1, { seed: 8, patrolRange: 1.25, speed: 0.9 });
  spawnDistrictNpc('vendor', -419.9, 0.08, 68.0, Math.PI / 2, 1.2, { seed: 7, patrolRange: 1.35, speed: 0.92 });
  spawnDistrictNpc('vendor', -421.4, 0.08, 71.2, Math.PI / 2, 4.3, { seed: 10, patrolRange: 1.25, speed: 0.88 });
  spawnDistrictNpc('vendor', -400.1, 0.08, 52.0, -Math.PI / 2, 1.9, { seed: 6, patrolRange: 1.35, speed: 0.94 });
  spawnDistrictNpc('vendor', -398.6, 0.08, 55.2, -Math.PI / 2, 5.0, { seed: 11, patrolRange: 1.25, speed: 0.9 });
  spawnDistrictNpc('vendor', -400.1, 0.08, 68.0, -Math.PI / 2, 2.6, { seed: 9, patrolRange: 1.35, speed: 0.96 });
  spawnDistrictNpc('vendor', -398.6, 0.08, 71.2, -Math.PI / 2, 0.9, { seed: 4, patrolRange: 1.25, speed: 0.89 });
  // Seated diners on low plastic stools enjoying trà sữa & xiên que
  spawnDistrictNpc('diner_sit', -415.5, 0.05, 50.97, 0, 0.3, { isStudent: true, seed: 0 });
  spawnDistrictNpc('diner_sit', -415.5, 0.05, 60.53, Math.PI, 1.1, { isStudent: true, seed: 1 });
  spawnDistrictNpc('diner_sit', -415.5, 0.05, 67.97, 0, 1.9, { isStudent: true, seed: 2 });
  spawnDistrictNpc('diner_sit', -404.5, 0.05, 52.53, Math.PI, 0.7, { isStudent: true, seed: 3 });
  spawnDistrictNpc('diner_sit', -404.5, 0.05, 58.97, 0, 1.5, { isStudent: true, seed: 0 });
  spawnDistrictNpc('diner_sit', -404.5, 0.05, 77.47, 0, 2.3, { isStudent: true, seed: 2 });
  // Promenaders, Check-in & Lantern Alley pedestrians
  spawnDistrictNpc('stroll', -410.8, 0.05, 63.0, 0, 0.3, { isStudent: true, hasBackpack: true, seed: 0, patrolAxis: 'z', patrolRange: 15.0, speed: 1.1 });
  spawnDistrictNpc('stroll', -409.0, 0.05, 66.0, Math.PI, 1.4, { isStudent: true, hasBackpack: true, seed: 1, patrolAxis: 'z', patrolRange: 14.0, speed: 1.08 });
  spawnDistrictNpc('stroll', -407.4, 0.05, 58.0, 0, 2.2, { isStudent: true, seed: 2, patrolAxis: 'z', patrolRange: 13.0, speed: 1.04 });
  spawnDistrictNpc('stroll', -412.2, 0.05, 72.0, Math.PI, 2.8, { seed: 4, patrolAxis: 'z', patrolRange: 12.0, speed: 1.02 });
  spawnDistrictNpc('stroll', -419.2, 0.05, 80.5, Math.PI / 2, 0.9, { isStudent: true, seed: 3, patrolAxis: 'x', patrolRange: 2.2, speed: 0.92 });
  spawnDistrictNpc('stroll', -410.0, 0.05, 89.0, Math.PI / 2, 1.7, { isStudent: true, hasBackpack: true, seed: 1, patrolAxis: 'x', patrolRange: 8.5, speed: 1.06 });
  spawnDistrictNpc('stroll', -394.0, 0.05, 64.0, 0, 1.0, { isStudent: true, hasBackpack: true, seed: 2, patrolAxis: 'z', patrolRange: 16.0, speed: 1.12 });
  spawnDistrictNpc('stroll', -394.0, 0.05, 76.0, Math.PI, 2.6, { isStudent: true, hasBackpack: true, seed: 0, patrolAxis: 'z', patrolRange: 14.0, speed: 1.08 });

  // --- 3. SÂN BÓNG RỔ 3x3, CỔNG PHỤ HỌC SINH & CÔNG VIÊN SKATEPARK (18 NPCs) ---
  // 6 Active 3x3 Streetball Players across both halves + 4 Bleacher Spectators
  spawnDistrictNpc('bball', -379.0, 0.07, 110.0, 0, 0.2, { isStudent: true, seed: 0, patrolAxis: 'z', patrolRange: 8.0, speed: 1.85 });
  spawnDistrictNpc('bball', -375.0, 0.07, 114.0, -Math.PI / 2, 1.1, { isStudent: true, seed: 1, patrolAxis: 'x', patrolRange: 5.5, speed: 1.78 });
  spawnDistrictNpc('bball', -382.5, 0.07, 118.0, Math.PI / 2, 2.2, { isStudent: true, seed: 2, patrolAxis: 'x', patrolRange: 5.0, speed: 1.72 });
  spawnDistrictNpc('bball', -377.5, 0.07, 129.0, Math.PI, 0.9, { isStudent: true, seed: 3, patrolAxis: 'z', patrolRange: 8.5, speed: 1.82 });
  spawnDistrictNpc('bball', -381.0, 0.07, 134.0, Math.PI / 2, 1.8, { isStudent: true, seed: 0, patrolAxis: 'x', patrolRange: 5.5, speed: 1.76 });
  spawnDistrictNpc('bball', -375.5, 0.07, 137.0, -Math.PI / 2, 3.0, { isStudent: true, seed: 2, patrolAxis: 'x', patrolRange: 4.5, speed: 1.7 });
  spawnDistrictNpc('reader_sit', -366.8, 0.45, 114.0, -Math.PI / 2, 0.4, { isStudent: true, seed: 1 });
  spawnDistrictNpc('reader_sit', -366.8, 0.45, 121.5, -Math.PI / 2, 1.2, { isStudent: true, seed: 0 });
  spawnDistrictNpc('reader_sit', -365.95, 0.9, 126.0, -Math.PI / 2, 1.9, { isStudent: true, seed: 3 });
  spawnDistrictNpc('reader_sit', -365.95, 0.9, 130.5, -Math.PI / 2, 2.7, { isStudent: true, seed: 2 });

  // 3 Students Actively Walking Out School West Side Gate (X=-361, Z=103) into Basketball Court & Plaza!
  spawnDistrictNpc('school_gate', -354.0, SCHOOL_PODIUM_Y, 103.1, -Math.PI / 2, 0.0, { isStudent: true, hasBackpack: true, seed: 1, speed: 1.28 });
  spawnDistrictNpc('school_gate', -354.0, SCHOOL_PODIUM_Y, 102.5, -Math.PI / 2, 2.2, { isStudent: true, hasBackpack: true, seed: 3, speed: 1.24 });
  spawnDistrictNpc('school_gate', -358.0, SCHOOL_PODIUM_Y, 103.6, -Math.PI / 2, 4.4, { isStudent: true, hasBackpack: true, seed: 0, speed: 1.18 });

  // Plaza Strollers + Fountain Benches + 3 Skatepark Riders
  spawnDistrictNpc('stroll', -376.0, 0.05, 92.2, Math.PI / 2, 0.6, { isStudent: true, hasBackpack: true, seed: 2, patrolAxis: 'x', patrolRange: 10.5, speed: 1.12 });
  spawnDistrictNpc('skater', -410.5, 0.14, 123.5, Math.PI / 2, 0.3, { isStudent: true, seed: 0, patrolAxis: 'x', patrolRange: 7.5, speed: 2.35, withBoard: true });
  spawnDistrictNpc('skater', -410.5, 0.14, 136.5, -Math.PI / 2, 2.0, { isStudent: true, seed: 2, patrolAxis: 'x', patrolRange: 7.5, speed: 2.25, withBoard: true });
  spawnDistrictNpc('skater', -415.0, 0.14, 130.0, 0, 1.1, { isStudent: true, seed: 1, patrolAxis: 'z', patrolRange: 9.0, speed: 2.15, withBoard: true });
  spawnDistrictNpc('stroll', -410.0, 0.05, 97.5, Math.PI / 2, 1.1, { seed: 4, patrolAxis: 'x', patrolRange: 8.0, speed: 1.02 });
  spawnDistrictNpc('reader_sit', -415.8, 0.12, 103.5, Math.PI / 2, 0.8, { isStudent: true, seed: 3 });

  const bballMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.55 });
  const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bballMat);
  ball1.position.set(-378.5, 0.23, 114.0);
  dynamicGroup.add(ball1);
  const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bballMat);
  ball2.position.set(-377.5, 0.23, 132.0);
  dynamicGroup.add(ball2);

  let animClock = 0;
  const smoothYawToward = (current: number, target: number, alpha: number) => {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * alpha;
  };

  const update = (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => {
    const dt = Number.isFinite(delta) && delta >= 0 ? Math.min(delta, 0.1) : 0.016;
    const safeHour = Number.isFinite(rawHour) ? rawHour : 12;
    const safeLamp = Number.isFinite(lampFactor) ? lampFactor : 0;
    animClock += dt;

    fountainPlume.scale.y = 0.88 + Math.sin(animClock * 5.2) * 0.16;
    fountainPlume.position.y = 2.06 + Math.sin(animClock * 5.2) * 0.06;

    const b1Bounce = Math.abs(Math.sin(animClock * 4.4));
    ball1.position.set(-378.5 + Math.sin(animClock * 1.1) * 3.8, 0.23 + b1Bounce * 1.45, 114.0 + Math.cos(animClock * 0.9) * 5.5);
    const b2Bounce = Math.abs(Math.sin(animClock * 4.9 + 1.2));
    ball2.position.set(-377.5 + Math.cos(animClock * 1.0) * 3.2, 0.23 + b2Bounce * 1.25, 132.0 + Math.sin(animClock * 1.2) * 5.0);

    const inWestDistrict =
      playerPos !== undefined &&
      playerPos.x >= -445.0 &&
      playerPos.x <= -340.0 &&
      playerPos.z >= 25.0 &&
      playerPos.z <= 165.0;

    const bookstoreOpen = safeHour >= 7.0 && safeHour <= 22.5;
    interiorLedMat.emissiveIntensity = bookstoreOpen || inWestDistrict ? 1.25 + safeLamp * 0.45 : 0.72 + safeLamp * 0.65;
    fahasaSignMat.emissiveIntensity = 0.55 + safeLamp * 1.1;
    bladeMat.emissiveIntensity = 0.55 + safeLamp * 1.1;
    snackArchMat.emissiveIntensity = 0.6 + safeLamp * 1.15;
    checkInMat.emissiveIntensity = 0.55 + safeLamp * 1.05;
    scoreMat.emissiveIntensity = 0.65 + safeLamp * 1.0;
    courtGateMat.emissiveIntensity = 0.55 + safeLamp * 1.05;
    parkSignMat.emissiveIntensity = 0.5 + safeLamp * 1.0;
    const yawAlpha = Math.min(1, dt * 6.5);
    const activeDay = safeHour >= 6.0 && safeHour <= 23.8;
    const schoolOpen = safeHour >= 7.0 && safeHour < 17.0;

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const vis =
        npc.role === 'school_gate'
          ? schoolOpen
          : inWestDistrict ||
            npc.role === 'bball' ||
            npc.role === 'stroll' ||
            npc.role === 'skater' ||
            npc.role === 'diner_sit' ||
            npc.role === 'vendor' ||
            (npc.role === 'cashier' || npc.role === 'reader_sit'
              ? bookstoreOpen || npc.baseZ > 94.0
              : activeDay);
      npc.grp.visible = vis;
      npc.glbHandle.setVisible(vis);
      if (!vis) continue;

      if (npc.role === 'cashier' || npc.role === 'vendor') {
        const isVendor = npc.role === 'vendor';
        const cycleDur = 11.0;
        const cycle = (animClock + npc.phase * 2.7) % cycleDur;
        const span = npc.patrolRange ?? 1.4;
        let offset = 0;
        let moving = false;
        let moveDir = 1;
        let targetYaw = npc.baseYaw;

        if (cycle < 2.2) {
          // Phase 1: Walk from left/north station to right/south station behind counter
          const p = cycle / 2.2;
          offset = THREE.MathUtils.lerp(-span, span, p);
          moving = true;
          moveDir = 1;
        } else if (cycle < 5.4) {
          // Phase 2: Turn toward back shelves / prep grill & work ("Stock" / "PickShelf")
          offset = span;
          targetYaw = npc.baseYaw + (isVendor ? Math.PI : Math.PI * 0.85);
          npc.glbHandle.setAnimState(Math.floor(npc.phase * 10) % 2 === 0 ? 'Stock' : 'PickShelf', 1.0);
        } else if (cycle < 7.6) {
          // Phase 3: Walk back along counter to serving/register window
          const p = (cycle - 5.4) / 2.2;
          offset = THREE.MathUtils.lerp(span, -span, p);
          moving = true;
          moveDir = -1;
        } else {
          // Phase 4: Serve customers / Checkout / Wave at front window!
          offset = -span;
          const waveNow = cycle >= 9.8;
          targetYaw = npc.baseYaw + Math.sin(animClock * 1.4 + npc.phase) * 0.22;
          npc.glbHandle.setAnimState(waveNow ? 'Wave' : 'Checkout', 1.05);
        }

        if (isVendor) {
          npc.grp.position.z = npc.baseZ + offset;
          npc.grp.position.x = npc.baseX + (cycle >= 2.2 && cycle < 5.4 ? (npc.baseYaw > 0 ? -0.45 : 0.45) : 0);
          if (moving) {
            targetYaw = moveDir >= 0 ? 0 : Math.PI;
            npc.glbHandle.setAnimState('Walk', 0.92);
          }
        } else {
          npc.grp.position.x = npc.baseX + offset;
          if (moving) {
            targetYaw = moveDir >= 0 ? Math.PI / 2 : -Math.PI / 2;
            npc.glbHandle.setAnimState('Walk', 0.92);
          }
        }
        npc.grp.rotation.y = smoothYawToward(npc.grp.rotation.y, targetYaw, yawAlpha);

        if (npc.proxyGrp.visible) {
          if (moving) {
            const swing = Math.sin(animClock * 3.8 + npc.phase) * 0.34;
            npc.leftLeg.rotation.x = swing;
            npc.rightLeg.rotation.x = -swing;
            npc.leftArm.rotation.x = -swing * 0.68;
            npc.rightArm.rotation.x = swing * 0.68;
          } else {
            npc.leftLeg.rotation.x = 0;
            npc.rightLeg.rotation.x = 0;
            const work = Math.sin(animClock * 4.4 + npc.phase);
            npc.leftArm.rotation.x = -0.45 + work * 0.28;
            npc.rightArm.rotation.x = -0.52 - work * 0.32;
          }
        }
      } else if (npc.role === 'reader_sit' || npc.role === 'diner_sit') {
        npc.glbHandle.setAnimState('Sit', 1.0);
        npc.grp.rotation.y = npc.baseYaw + Math.sin(animClock * 0.7 + npc.phase) * 0.08;
        if (npc.proxyGrp.visible) {
          npc.rightArm.rotation.x = -0.45 + Math.sin(animClock * 2.5 + npc.phase) * 0.12;
        }
      } else if (npc.role === 'school_gate') {
        // Walk from School Courtyard (X=-350) -> out Cổng Sân Bóng Rổ (X=-361, Z=103) -> Basketball East Gate (X=-372)
        const cycle = (animClock * npc.speed + npc.phase * 9.0) % 44.0;
        const goingOut = cycle < 22.0;
        const frac = (goingOut ? cycle : 44.0 - cycle) / 22.0;
        const gx = THREE.MathUtils.lerp(-350.0, -372.0, frac);
        const gy = gx >= -360.5 ? SCHOOL_PODIUM_Y : gx <= -362.5 ? 0.05 : ((gx - -362.5) / 2.0) * SCHOOL_PODIUM_Y;
        const gz = npc.baseZ + Math.sin(frac * Math.PI) * 0.35;
        npc.grp.position.set(gx, gy, gz);
        npc.grp.rotation.y = smoothYawToward(npc.grp.rotation.y, goingOut ? -Math.PI / 2 : Math.PI / 2, yawAlpha);
        npc.glbHandle.setAnimState('Walk', 1.0);
        if (npc.proxyGrp.visible) {
          const swing = Math.sin(animClock * npc.speed * 3.3 + npc.phase) * 0.34;
          npc.leftLeg.rotation.x = swing;
          npc.rightLeg.rotation.x = -swing;
          npc.leftArm.rotation.x = -swing * 0.65;
          npc.rightArm.rotation.x = npc.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.65;
        }
      } else {
        const range = Math.max(1.5, npc.patrolRange ?? 4.0);
        const omega = npc.speed / range;
        const angle = animClock * omega + npc.phase;
        const offset = Math.sin(angle) * range;
        const velDir = Math.cos(angle);
        const instSpeed = Math.abs(velDir) * npc.speed;

        if (npc.role === 'skater') {
          npc.grp.position.y = npc.baseY + 0.04;
          npc.glbHandle.setAnimState('Idle', 1.0);
          if (npc.board) {
            npc.board.rotation.x = Math.sin(animClock * 3.0 + npc.phase) * 0.05;
          }
          if (npc.proxyGrp.visible) {
            npc.leftArm.rotation.z = -0.25 + Math.sin(animClock * 2.4 + npc.phase) * 0.08;
            npc.rightArm.rotation.z = 0.25 - Math.sin(animClock * 2.4 + npc.phase) * 0.08;
          }
        } else {
          npc.glbHandle.setAnimState(
            instSpeed > 0.2 ? 'Walk' : 'Idle',
            THREE.MathUtils.clamp(instSpeed / 1.35, 0.7, 1.35)
          );
          if (npc.proxyGrp.visible) {
            const swing = Math.sin(animClock * npc.speed * 3.1 + npc.phase) * Math.min(0.38, instSpeed * 0.28);
            npc.leftLeg.rotation.x = swing;
            npc.rightLeg.rotation.x = -swing;
            npc.leftArm.rotation.x = -swing * 0.7;
            npc.rightArm.rotation.x = npc.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.7;
          }
        }

        if (npc.patrolAxis === 'z') {
          npc.grp.position.z = npc.baseZ + offset;
          npc.grp.rotation.y = smoothYawToward(npc.grp.rotation.y, velDir >= 0 ? 0 : Math.PI, yawAlpha);
        } else {
          npc.grp.position.x = npc.baseX + offset;
          npc.grp.rotation.y = smoothYawToward(npc.grp.rotation.y, velDir >= 0 ? Math.PI / 2 : -Math.PI / 2, yawAlpha);
        }
      }
    }

    // Automatic Front (Z=48) & Rear (Z=88) Glass Sliding Doors — triggered by player OR passing NPCs!
    const stepAutoDoor = (door: typeof frontAutoDoor, targetZ: number) => {
      let wantOpen = false;
      if (playerPos !== undefined && playerPos.y < 2.3) {
        const pdx = playerPos.x - -378.0;
        const pdz = playerPos.z - targetZ;
        if (pdx * pdx + pdz * pdz <= 5.4 * 5.4) {
          wantOpen = true;
        }
      }
      if (!wantOpen) {
        for (let i = 0; i < npcs.length; i++) {
          const n = npcs[i];
          if (!n.grp.visible || n.grp.position.y >= 2.2) continue;
          const ndx = n.grp.position.x - -378.0;
          const ndz = n.grp.position.z - targetZ;
          if (ndx * ndx + ndz * ndz <= 3.8 * 3.8) {
            wantOpen = true;
            break;
          }
        }
      }
      door.prog = THREE.MathUtils.damp(door.prog, wantOpen ? 1 : 0, 6.8, dt);
      door.leftLeaf.position.x = door.leftClosedX - door.prog * door.slideSpan;
      door.rightLeaf.position.x = door.rightClosedX + door.prog * door.slideSpan;
      const sensorActive = door.prog > 0.1;
      door.sensorMat.color.setHex(sensorActive ? 0x22c55e : 0x38bdf8);
      door.sensorMat.emissive.setHex(sensorActive ? 0x22c55e : 0x38bdf8);
      door.sensorMat.emissiveIntensity = sensorActive ? 2.2 : 1.05;
    };
    stepAutoDoor(frontAutoDoor, 48.0);
    stepAutoDoor(rearAutoDoor, 88.0);
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
