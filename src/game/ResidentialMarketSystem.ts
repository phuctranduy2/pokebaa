import * as THREE from 'three';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import type { WestResPalette } from './WestResidentialExpansionBuilders';

export interface ResidentialMarketDef {
  id: 'market_north' | 'market_south';
  segmentId: 'wr_n2_b3' | 'wr_s2_b3';
  poiId: string;
  name: string;
  shortLabel: string;
  subtitle: string;
  openHours: string;
  minX: number;
  maxX: number;
  bodyMinZ: number;
  bodyMaxZ: number;
  yardMinZ: number;
  yardMaxZ: number;
  facingNorth: boolean;
  theme: 'north_heritage' | 'south_terracotta';
}

export const RESIDENTIAL_MARKET_OPEN_HOUR = 7.0;
export const RESIDENTIAL_MARKET_CLOSE_HOUR = 18.0;

export function isResidentialMarketOpenAtHour(rawHour: number): boolean {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= RESIDENTIAL_MARKET_OPEN_HOUR && h < RESIDENTIAL_MARKET_CLOSE_HOUR;
}

export interface ResidentialMarketNpcSeed {
  x: number;
  z: number;
  yaw: number;
  role: 'vendor' | 'seated';
  marketId: 'market_north' | 'market_south';
}

export interface MarketStallSpot {
  id: number;
  x: number;
  z: number;
  faceYaw: number;
  kind: 'produce' | 'seafood_meat' | 'flowers_dry' | 'food_court';
  occupiedBy: number | null;
}

export interface MarketGateExit {
  id: 'front' | 'rear' | 'west' | 'east';
  outX: number;
  outZ: number;
  inX: number;
  inZ: number;
  isHorizontal: boolean; // true for West/East gates along bodyCz; false for Front/Rear along cx
}

export interface MarketDynamicController {
  marketId: 'market_north' | 'market_south';
  cx: number;
  bodyCz: number;
  minX: number;
  maxX: number;
  frontZ: number;
  backZ: number;
  dirFront: number;
  stallSpots: MarketStallSpot[];
  gates: MarketGateExit[];
  updateMarketState: (dt: number, rawHour: number, lampFactor: number) => number;
  getClosedFactor: () => number;
}

export interface ResidentialMarketBuildOutput {
  lampSpots: Array<{ x: number; z: number }>;
  npcSeeds: ResidentialMarketNpcSeed[];
  pointLightAnchors: Array<{ x: number; y: number; z: number; color: number }>;
  controller: MarketDynamicController;
}

/**
 * Single source of truth for the two traditional Vietnamese residential markets:
 * 1. Chợ Bắc Tây (Chợ Dân Sinh Khu Bắc) — Row N2 (`wr_n2_b3`), facing South onto Đường Nội Khu Bắc 1
 * 2. Chợ Nam Tây (Chợ Dân Sinh Khu Nam) — Row S2 (`wr_s2_b3`), facing North onto Đường Nội Khu Nam 1
 * Both markets open 07:00 - 18:00 daily and roll down security iron shutters outside business hours.
 */
export const RESIDENTIAL_MARKETS: ResidentialMarketDef[] = [
  {
    id: 'market_north',
    segmentId: 'wr_n2_b3',
    poiId: 'poi_market_north',
    name: 'Chợ Bắc Tây • Chợ Dân Sinh Khu Bắc',
    shortLabel: 'CHỢ BẮC TÂY',
    subtitle: 'Chợ truyền thống khu Bắc • Rau củ, Hải sản, Hoa tươi & Ẩm thực sáng',
    openHours: '07:00 - 18:00',
    minX: -578.8,
    maxX: -511.2,
    bodyMinZ: -54.0,
    bodyMaxZ: -32.0,
    yardMinZ: -32.0,
    yardMaxZ: -26.0,
    facingNorth: false,
    theme: 'north_heritage',
  },
  {
    id: 'market_south',
    segmentId: 'wr_s2_b3',
    poiId: 'poi_market_south',
    name: 'Chợ Nam Tây • Chợ Dân Sinh Khu Nam',
    shortLabel: 'CHỢ NAM TÂY',
    subtitle: 'Chợ truyền thống khu Nam • Trái cây Miền Tây, Hải sản, Đồ khô & Bún mắm',
    openHours: '07:00 - 18:00',
    minX: -586.8,
    maxX: -526.4,
    bodyMinZ: 108.0,
    bodyMaxZ: 134.0,
    yardMinZ: 102.0,
    yardMaxZ: 108.0,
    facingNorth: true,
    theme: 'south_terracotta',
  },
];

export function findResidentialMarketBySegment(segmentId: string): ResidentialMarketDef | undefined {
  return RESIDENTIAL_MARKETS.find((m) => m.segmentId === segmentId);
}

export function findResidentialMarketAt(x: number, z: number): ResidentialMarketDef | null {
  for (let i = 0; i < RESIDENTIAL_MARKETS.length; i++) {
    const m = RESIDENTIAL_MARKETS[i];
    const minZ = Math.min(m.bodyMinZ, m.yardMinZ);
    const maxZ = Math.max(m.bodyMaxZ, m.yardMaxZ);
    if (x >= m.minX && x <= m.maxX && z >= minZ && z <= maxZ) {
      return m;
    }
  }
  return null;
}

interface MarketQuadrantBounds {
  key: 'front_w' | 'front_e' | 'rear_w' | 'rear_e';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cx: number;
  cz: number;
  w: number;
  d: number;
  kind: 'produce' | 'seafood_meat' | 'flowers_dry' | 'food_court';
  faceAisleSign: number; // +1 means stall customers stand on +Z side, -1 means -Z side
}

function computeMarketLayout(m: ResidentialMarketDef): {
  cx: number;
  w: number;
  bodyCz: number;
  bodyD: number;
  frontZ: number;
  backZ: number;
  dirIn: number;
  mainGateHalfW: number;
  rearGateHalfW: number;
  sideGateHalfD: number;
  quadrants: MarketQuadrantBounds[];
  parkingShelter: { minX: number; maxX: number; minZ: number; maxZ: number; cx: number; cz: number };
} {
  const cx = (m.minX + m.maxX) * 0.5;
  const w = m.maxX - m.minX;
  const bodyCz = (m.bodyMinZ + m.bodyMaxZ) * 0.5;
  const bodyD = m.bodyMaxZ - m.bodyMinZ;
  const frontZ = m.facingNorth ? m.bodyMinZ : m.bodyMaxZ;
  const backZ = m.facingNorth ? m.bodyMaxZ : m.bodyMinZ;
  const dirIn = m.facingNorth ? 1 : -1;

  // Wide unobstructed main gate (7.2m), rear gate (6.4m) & East/West side gates (4.8m)
  const mainGateHalfW = 3.6;
  const rearGateHalfW = 3.2;
  const sideGateHalfD = 2.4;

  // 4 stall islands neatly framing the 6.8m N-S central promenade & 4.6m E-W cross aisle
  const stallPadOuterX = 2.8;
  const stallPadCenterX = 4.2;
  const westMinX = m.minX + stallPadOuterX;
  const westMaxX = cx - stallPadCenterX;
  const eastMinX = cx + stallPadCenterX;
  const eastMaxX = m.maxX - stallPadOuterX;

  // Each quadrant stall island is 3.4m deep, centered inside its half-hall leaving generous walkways
  const frontBandCenterZ = (frontZ + dirIn * 2.2 + (bodyCz - dirIn * 2.4)) * 0.5;
  const rearBandCenterZ = (bodyCz + dirIn * 2.4 + (backZ - dirIn * 2.2)) * 0.5;
  const stallDepth = Math.min(3.5, Math.max(2.6, bodyD * 0.145));
  const halfStallD = stallDepth * 0.5;

  const makeQuad = (
    key: MarketQuadrantBounds['key'],
    qMinX: number,
    qMaxX: number,
    qCz: number,
    kind: MarketQuadrantBounds['kind'],
    faceAisleSign: number
  ): MarketQuadrantBounds => ({
    key,
    minX: qMinX,
    maxX: qMaxX,
    minZ: qCz - halfStallD,
    maxZ: qCz + halfStallD,
    cx: (qMinX + qMaxX) * 0.5,
    cz: qCz,
    w: qMaxX - qMinX,
    d: stallDepth,
    kind,
    faceAisleSign,
  });

  const quadrants: MarketQuadrantBounds[] = [
    makeQuad('front_w', westMinX, westMaxX, frontBandCenterZ, 'produce', dirIn),
    makeQuad('front_e', eastMinX, eastMaxX, frontBandCenterZ, 'flowers_dry', dirIn),
    makeQuad('rear_w', westMinX, westMaxX, rearBandCenterZ, 'seafood_meat', -dirIn),
    makeQuad('rear_e', eastMinX, eastMaxX, rearBandCenterZ, 'food_court', -dirIn),
  ];

  // Covered Bãi Giữ Xe tucked neatly on the far-West front apron (leaves main gate & East plaza open)
  const yardCz = (m.yardMinZ + m.yardMaxZ) * 0.5;
  const parkMinX = m.minX + 1.4;
  const parkMaxX = m.minX + 13.0;
  const parkingShelter = {
    minX: parkMinX,
    maxX: parkMaxX,
    minZ: yardCz - 1.9,
    maxZ: yardCz + 1.9,
    cx: (parkMinX + parkMaxX) * 0.5,
    cz: yardCz,
  };

  return {
    cx,
    w,
    bodyCz,
    bodyD,
    frontZ,
    backZ,
    dirIn,
    mainGateHalfW,
    rearGateHalfW,
    sideGateHalfD,
    quadrants,
    parkingShelter,
  };
}

/**
 * Generates exact, lean colliders for a traditional Vietnamese market hall:
 * - Perimeter masonry walls with 4 wide open gates (Front 7.2m, Rear 6.4m, West 4.8m, East 4.8m)
 * - 4 interior merchant stall island blocks leaving wide 6.8m central & 4.6m cross aisles
 * - Compact Bãi Giữ Xe ticket booth & parked-bike shelter on far-West front apron
 */
export function buildResidentialMarketColliders(m: ResidentialMarketDef): IntersectionColliderBox[] {
  const L = computeMarketLayout(m);
  const wallT = 0.45;
  const cols: IntersectionColliderBox[] = [
    // Front wall West & East of main gate
    {
      minX: m.minX,
      maxX: L.cx - L.mainGateHalfW,
      minZ: L.frontZ - wallT * 0.5,
      maxZ: L.frontZ + wallT * 0.5,
      floor: 1,
    },
    {
      minX: L.cx + L.mainGateHalfW,
      maxX: m.maxX,
      minZ: L.frontZ - wallT * 0.5,
      maxZ: L.frontZ + wallT * 0.5,
      floor: 1,
    },
    // Rear wall West & East of rear gate
    {
      minX: m.minX,
      maxX: L.cx - L.rearGateHalfW,
      minZ: L.backZ - wallT * 0.5,
      maxZ: L.backZ + wallT * 0.5,
      floor: 1,
    },
    {
      minX: L.cx + L.rearGateHalfW,
      maxX: m.maxX,
      minZ: L.backZ - wallT * 0.5,
      maxZ: L.backZ + wallT * 0.5,
      floor: 1,
    },
    // West perimeter wall split cleanly around West side gate
    {
      minX: m.minX,
      maxX: m.minX + wallT,
      minZ: m.bodyMinZ,
      maxZ: L.bodyCz - L.sideGateHalfD,
      floor: 1,
    },
    {
      minX: m.minX,
      maxX: m.minX + wallT,
      minZ: L.bodyCz + L.sideGateHalfD,
      maxZ: m.bodyMaxZ,
      floor: 1,
    },
    // East perimeter wall split cleanly around East side gate
    {
      minX: m.maxX - wallT,
      maxX: m.maxX,
      minZ: m.bodyMinZ,
      maxZ: L.bodyCz - L.sideGateHalfD,
      floor: 1,
    },
    {
      minX: m.maxX - wallT,
      maxX: m.maxX,
      minZ: L.bodyCz + L.sideGateHalfD,
      maxZ: m.bodyMaxZ,
      floor: 1,
    },
  ];

  // 4 Interior Stall Island Blocks
  for (const q of L.quadrants) {
    cols.push({
      minX: q.minX,
      maxX: q.maxX,
      minZ: q.minZ,
      maxZ: q.maxZ,
      floor: 1,
    });
  }

  // Front-West Covered Bike Parking Shelter (tucked neatly on far-West apron; leaves plaza & central gate wide open!)
  cols.push({
    minX: L.parkingShelter.minX,
    maxX: L.parkingShelter.maxX,
    minZ: L.parkingShelter.minZ,
    maxZ: L.parkingShelter.maxZ,
    floor: 1,
  });

  return cols;
}

/**
 * Checks whether a point (x, z) collides with any of the 4 closed rolling shutters
 * of Chợ Bắc Tây or Chợ Nam Tây (used by ShopScene when markets are closed outside 07:00 - 18:00).
 */
export function isPointBlockedByClosedResidentialMarkets(x: number, z: number, radius = 0.35): boolean {
  const halfT = 0.38;
  for (let i = 0; i < RESIDENTIAL_MARKETS.length; i++) {
    const m = RESIDENTIAL_MARKETS[i];
    if (x < m.minX - 1.0 || x > m.maxX + 1.0) continue;
    const L = computeMarketLayout(m);
    // Front main gate shutter
    if (
      x + radius >= L.cx - L.mainGateHalfW &&
      x - radius <= L.cx + L.mainGateHalfW &&
      z + radius >= L.frontZ - halfT &&
      z - radius <= L.frontZ + halfT
    ) {
      return true;
    }
    // Rear gate shutter
    if (
      x + radius >= L.cx - L.rearGateHalfW &&
      x - radius <= L.cx + L.rearGateHalfW &&
      z + radius >= L.backZ - halfT &&
      z - radius <= L.backZ + halfT
    ) {
      return true;
    }
    // West side gate shutter
    const westX = m.minX + 0.25;
    if (
      x + radius >= westX - halfT &&
      x - radius <= westX + halfT &&
      z + radius >= L.bodyCz - L.sideGateHalfD &&
      z - radius <= L.bodyCz + L.sideGateHalfD
    ) {
      return true;
    }
    // East side gate shutter
    const eastX = m.maxX - 0.25;
    if (
      x + radius >= eastX - halfT &&
      x - radius <= eastX + halfT &&
      z + radius >= L.bodyCz - L.sideGateHalfD &&
      z - radius <= L.bodyCz + L.sideGateHalfD
    ) {
      return true;
    }
  }
  return false;
}

// =========================================================================
// PROCEDURAL CANVAS TEXTURES FOR MARKET CLOCK & STRIPED STALL AWNINGS
// =========================================================================
let _cachedClockTex: THREE.CanvasTexture | null = null;
function getMarketClockTex(): THREE.CanvasTexture {
  if (_cachedClockTex) return _cachedClockTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#b45309';
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#92400e';
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.stroke();

  // 12 hour markers
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const inner = i % 3 === 0 ? 80 : 88;
    const outer = 102;
    ctx.strokeStyle = i % 3 === 0 ? '#7f1d1d' : '#1e293b';
    ctx.lineWidth = i % 3 === 0 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * inner, 128 + Math.sin(a) * inner);
    ctx.lineTo(128 + Math.cos(a) * outer, 128 + Math.sin(a) * outer);
    ctx.stroke();
  }
  // Classic 10:10 market hands
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 - 44, 128 - 32);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + 56, 128 - 38);
  ctx.stroke();
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(128, 128, 9, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _cachedClockTex = tex;
  return tex;
}

let _cachedFloorTex: THREE.CanvasTexture | null = null;
function getMarketTerrazzoTex(): THREE.CanvasTexture {
  if (_cachedFloorTex) return _cachedFloorTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e7e5e4';
  ctx.fillRect(0, 0, 256, 256);
  // Subtle terrazzo stone tiles
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  const flecks = ['#a8a29e', '#d6d3d1', '#94a3b8', '#f5f5f4', '#b45309'];
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = flecks[i % flecks.length];
    const fx = (i * 53) % 252;
    const fy = (i * 97) % 252;
    ctx.fillRect(fx, fy, 3, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 8);
  _cachedFloorTex = tex;
  return tex;
}

const STALL_CATALOG = {
  produce: [
    { title: 'RAU SẠCH ĐÀ LẠT', sub: 'Cải Xanh • Cà Chua • Khoai Tây', bg: '#15803d', awningColor: 0x16a34a },
    { title: 'TRÁI CÂY MIỀN TÂY', sub: 'Xoài Cát • Sầu Riêng • Măng Cụt', bg: '#b45309', awningColor: 0xea580c },
    { title: 'CỦ QUẢ TƯƠI MỖI NGÀY', sub: 'Bí Đỏ • Cà Rốt • Dưa Hấu Đỏ', bg: '#166534', awningColor: 0x22c55e },
    { title: 'TRÁI CÂY NHẬP & VƯỜN', sub: 'Cam Sành • Thanh Long • Bưởi Da Xanh', bg: '#c2410c', awningColor: 0xf97316 },
  ],
  seafood_meat: [
    { title: 'HẢI SẢN CỬA BIỂN', sub: 'Tôm Sú • Mực Ống • Cá Thu Tươi', bg: '#0369a1', awningColor: 0x0284c7 },
    { title: 'THỊT HEO SẠCH VIETGAP', sub: 'Ba Rọi • Sườn Non • Giò Sống', bg: '#991b1b', awningColor: 0xdc2626 },
    { title: 'CÁ ĐỒNG & ỐC TƯƠI', sub: 'Cá Lóc • Nghêu Sò • Cua Biển', bg: '#0e7490', awningColor: 0x0891b2 },
    { title: 'THỊT BÒ & GÀ TA VƯỜN', sub: 'Bò Tơ • Gà Thả Vườn • Trứng Gà', bg: '#9f1239', awningColor: 0xe11d48 },
  ],
  flowers_dry: [
    { title: 'HOA TƯƠI CÔ MAI', sub: 'Cúc Vàng • Hoa Sen • Hồng Đà Lạt', bg: '#be185d', awningColor: 0xec4899 },
    { title: 'GẠO NGON & ĐỒ KHÔ', sub: 'Gạo ST25 • Nấm Hương • Mộc Nhĩ', bg: '#854d0e', awningColor: 0xd97706 },
    { title: 'GIA VỊ & NƯỚC MẮM', sub: 'Mắm Phú Quốc • Tiêu • Đậu Phộng', bg: '#92400e', awningColor: 0xb45309 },
    { title: 'QUẦN ÁO & ĐỒ GIA DỤNG', sub: 'Vải Lụa • Nón Lá • Rổ Rá Nhựa', bg: '#6d28d9', awningColor: 0x7c3aed },
  ],
  food_court: [
    { title: 'BÚN MẮM & MÌ QUẢNG', sub: 'Bún Cá • Bánh Canh Chả • Nóng Hổi', bg: '#9a3412', awningColor: 0xea580c },
    { title: 'BÁNH BÈO & BÁNH XÈO', sub: 'Bánh Nậm • Bánh Lọc • Nem Lụi', bg: '#b45309', awningColor: 0xd97706 },
    { title: 'CHÈ THẬP CẨM CÔ BA', sub: 'Chè Bưởi • Sương Sa Hạt Lựu • Sinh Tố', bg: '#0f766e', awningColor: 0x0d9488 },
    { title: 'CÀ PHÊ CHỢ & TRÀ ĐÁ', sub: 'Cà Phê Sữa Đá • Nước Mía Siêu Sạch', bg: '#78350f', awningColor: 0x92400e },
  ],
};

/**
 * Builds a complete, authentic Vietnamese Traditional Community Market Hall (`Chợ Bắc Tây` / `Chợ Nam Tây`):
 * - Two-tier vaulted corrugated steel roof with luminous ventilated clerestory monitor
 * - Heritage front pediment facade with iconic Market Clock, illuminated LED signboards & 4 open archways
 * - 16 richly stocked themed merchant stalls across 4 quadrants (Produce, Seafood/Meat, Flowers/Dry Goods, Market Food Court)
 * - Covered Bãi Giữ Xe Chợ parking shelter with resident motorbikes & outdoor morning flower/fruit parasols
 * - Warm pendant domes, festoon bulb strands & ground glow pools for vibrant evening atmosphere
 */
let _cachedShutterTex: THREE.CanvasTexture | null = null;
function getRollingShutterTex(): THREE.CanvasTexture {
  if (_cachedShutterTex) return _cachedShutterTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 256, 256);
  // Horizontal corrugated rolling iron slats
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, y, 256, 5);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, y + 11, 256, 4);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, y + 15, 256, 1);
  }
  // Vertical reinforcement tracks
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 8, 256);
  ctx.fillRect(248, 0, 8, 256);
  ctx.fillRect(124, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  _cachedShutterTex = tex;
  return tex;
}

export function buildTraditionalResidentialMarket(
  parent: THREE.Object3D,
  p: WestResPalette,
  m: ResidentialMarketDef,
  shared: {
    dynamicParent: THREE.Object3D;
    lanternGlowMat: THREE.MeshStandardMaterial;
    warmPoolMat: THREE.MeshBasicMaterial;
    addStreetLamp: (x: number, z: number, dx: number, dz: number, withPool?: boolean) => void;
    addMotorbike: (parent: THREE.Object3D, x: number, z: number, yaw: number, color: number) => void;
  }
): ResidentialMarketBuildOutput {
  const L = computeMarketLayout(m);
  const isNorthHeritage = m.theme === 'north_heritage';
  const dirFront = m.facingNorth ? -1 : 1; // direction pointing OUTWARD toward the front street
  const dynParent = shared.dynamicParent;

  // Dedicated interior market lighting materials so closing at 18:00 dims the market hall cleanly without touching streetlamps!
  const marketBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ed,
    emissive: 0xffd27d,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });
  const marketClerestoryMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xffe4a0,
    emissiveIntensity: 0.9,
    roughness: 0.35,
  });
  const marketPoolMat = shared.warmPoolMat.clone();
  marketPoolMat.opacity = 0.22;
  marketPoolMat.visible = true;

  const addBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rot?: [number, number, number]
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(mesh);
    return mesh;
  };

  // Theme-specific materials (distinct architectural identities for Chợ Bắc Tây vs Chợ Nam Tây!)
  const wallMat = isNorthHeritage ? p.warmYellowWallMat : p.creamPlasterMat;
  const trimAccentMat = isNorthHeritage ? p.emeraldRoofMat : p.redTinRoofMat;
  const roofMat = isNorthHeritage ? p.tealTinRoofMat : p.terracottaTileMat;
  const gableBg = isNorthHeritage ? '#065f46' : '#991b1b';
  const gableBg2 = isNorthHeritage ? '#047857' : '#7f1d1d';

  const terrazzoMat = new THREE.MeshStandardMaterial({
    map: getMarketTerrazzoTex(),
    roughness: 0.78,
    metalness: 0.04,
  });
  const counterTileWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.34, metalness: 0.06 });
  const wetIceMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.2, metalness: 0.14 });
  const fishSilverMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.22, metalness: 0.68 });
  const fishBackBlueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.26, metalness: 0.52 });
  const shrimpOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.1 });
  const crabBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38, metalness: 0.2 });
  const clamDarkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
  const rawMeatRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.42, metalness: 0.08 });
  const rawPorkPinkMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.44, metalness: 0.06 });
  const porkFatCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55 });
  const chickenGoldenMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.48 });
  const eggShellMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.58 });
  const choppingWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.82 });
  const riceWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.85 });
  const riceBrownMat = new THREE.MeshStandardMaterial({ color: 0xd6b588, roughness: 0.86 });
  const burlapSackMat = new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.92 });
  const polySackWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.82 });
  const fishSauceAmberMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.18, metalness: 0.12 });
  const cookingOilGoldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.22, metalness: 0.08 });
  const garlicWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72 });
  const produceGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.72 });
  const leafDarkGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const cabbagePaleMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.74 });
  const watermelonDarkMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.48 });
  const watermelonRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 });
  const produceOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.58 });
  const produceRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  const produceYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
  const dragonFruitPinkMat = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.52 });
  const durianYellowGreenMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.84 });
  const flowerPinkMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.65 });
  const brothGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.1 });
  const noodleYellowMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.75 });
  const chaLuaPinkMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.65 });
  const cheGreenMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
  const cheRubyMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 });
  const shirtClothMats = [
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 }),
  ];
  const lanternRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.85,
    roughness: 0.45,
  });
  p.lanternMats.push(lanternRedMat);

  // Small crisp Vietnamese counter price-tag generator (cached per label text)
  const priceTagMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getPriceTagMat = (title: string, price: string, accentHex: string): THREE.MeshStandardMaterial => {
    const key = `${title}|${price}|${accentHex}`;
    const hit = priceTagMatCache.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 256, 48);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 122);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 26px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 128, 25);
    ctx.fillStyle = '#b91c1c';
    ctx.font = '900 42px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(price, 128, 88);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    priceTagMatCache.set(key, mat);
    return mat;
  };

  const addPriceTag = (
    x: number,
    y: number,
    z: number,
    faceSign: number,
    title: string,
    price: string,
    accentHex: string
  ) => {
    addBox(0.025, 0.24, 0.025, p.bambooMat, x, y + 0.1, z);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.24), getPriceTagMat(title, price, accentHex));
    card.position.set(x, y + 0.24, z + faceSign * 0.02);
    if (faceSign < 0) card.rotation.y = Math.PI;
    parent.add(card);
  };

  const hallH = 4.9;

  // -------------------------------------------------------------------------
  // 1. MARKET FLOOR PLINTH, FRONT PLAZA PAVING & NON-OVERLAPPING AISLE RUNNERS
  // -------------------------------------------------------------------------
  const fullMinZ = Math.min(m.bodyMinZ, m.yardMinZ);
  const fullMaxZ = Math.max(m.bodyMaxZ, m.yardMaxZ);
  const fullD = fullMaxZ - fullMinZ;
  const fullCz = (fullMinZ + fullMaxZ) * 0.5;
  // Strictly offset vertical floor slabs (>= 0.02m step) with zero overlapping cross-planes
  addBox(L.w - 0.2, 0.06, fullD, p.tilePatioMat, L.cx, 0.03, fullCz);
  addBox(L.w - 0.8, 0.08, L.bodyD - 0.4, terrazzoMat, L.cx, 0.04, L.bodyCz);

  // Brick central N-S promenade (top Y = 0.10) + split West/East E-W wings flush at ±3.1m (zero center Z-fighting!)
  const promHalfW = 3.1;
  addBox(promHalfW * 2, 0.1, fullD - 0.2, p.brickCourtyardMat, L.cx, 0.05, fullCz);
  const westWingW = (L.cx - promHalfW) - (m.minX + 0.4);
  const eastWingW = (m.maxX - 0.4) - (L.cx + promHalfW);
  if (westWingW > 0.5) {
    addBox(westWingW, 0.1, 4.0, p.brickCourtyardMat, m.minX + 0.4 + westWingW * 0.5, 0.05, L.bodyCz);
  }
  if (eastWingW > 0.5) {
    addBox(eastWingW, 0.1, 4.0, p.brickCourtyardMat, L.cx + promHalfW + eastWingW * 0.5, 0.05, L.bodyCz);
  }

  // -------------------------------------------------------------------------
  // 2. Z-FIGHTING-FREE PERIMETER COLONNADE WALLS & LAYERED PILASTER COLUMNS
  // -------------------------------------------------------------------------
  // Strictly non-coplanar architectural layering:
  //   Dado wall = 0.36m | Dado coping cap = 0.42m (Y 1.38..1.54)
  //   Column shaft = 0.50m (projects +0.04m cleanly PROUD beyond dado cap on all sides, Y 0.38..hallH-0.58)
  //   Column plinth = 0.58m (Y 0.08..0.38) | Mid belt collar = 0.56m (Y 1.36..1.56) | Capital = 0.58m (Y hallH-0.58..hallH-0.42)
  //   Upper breeze-block frieze = 0.30m (recessed inside columns) | Top eaves fascia = 0.62m (Y hallH-0.42..hallH)
  const addColonnadePier = (px: number, pz: number) => {
    const shaftBottom = 0.38;
    const shaftTop = hallH - 0.58;
    const shaftH = shaftTop - shaftBottom;
    // Base plinth (trimAccentMat)
    addBox(0.58, 0.3, 0.58, trimAccentMat, px, 0.23, pz);
    // Proud pilaster shaft (wallMat)
    addBox(0.5, shaftH, 0.5, wallMat, px, shaftBottom + shaftH * 0.5, pz);
    // Mid dado wrap collar (strictly larger in X, Y, Z than 0.42m × 0.16m dado coping cap -> ZERO coplanar faces!)
    addBox(0.56, 0.2, 0.56, trimAccentMat, px, 1.46, pz);
    // Upper capital molding right underneath the fascia beam
    addBox(0.58, 0.16, 0.58, trimAccentMat, px, hallH - 0.5, pz);
  };

  // Place the 4 corner piers ONCE (never duplicated between X and Z wall runs)
  const westWallX = m.minX + 0.25;
  const eastWallX = m.maxX - 0.25;
  addColonnadePier(westWallX, L.frontZ);
  addColonnadePier(eastWallX, L.frontZ);
  addColonnadePier(westWallX, L.backZ);
  addColonnadePier(eastWallX, L.backZ);

  const buildWallRunX = (
    x1: number,
    x2: number,
    z: number,
    opts: { skipStartPier?: boolean; skipEndPier?: boolean } = {}
  ) => {
    const segW = x2 - x1;
    if (segW < 0.8) return;
    const scx = (x1 + x2) * 0.5;
    // Lower solid dado wall (0.36m thick, Y 0.08..1.38) + dado coping ledge (0.42m thick, Y 1.38..1.54)
    addBox(segW, 1.3, 0.36, wallMat, scx, 0.73, z);
    addBox(segW, 0.16, 0.42, trimAccentMat, scx, 1.46, z);
    // Intermediate colonnade piers (never colliding with corners or Main Gate twin pillars)
    const bayCount = Math.max(2, Math.round(segW / 5.4));
    for (let i = 0; i <= bayCount; i++) {
      if (i === 0 && opts.skipStartPier) continue;
      if (i === bayCount && opts.skipEndPier) continue;
      const px = x1 + (segW * i) / bayCount;
      addColonnadePier(px, z);
    }
    // Recessed terracotta breeze-block ventilation frieze (0.30m thick) + overhanging eaves fascia beam (0.62m thick)
    addBox(segW, 0.72, 0.3, p.breezeBlockTerracottaMat, scx, hallH - 0.82, z);
    addBox(segW + 0.1, 0.42, 0.62, trimAccentMat, scx, hallH - 0.21, z);
  };

  const buildWallRunZ = (
    x: number,
    z1: number,
    z2: number,
    opts: { skipStartPier?: boolean; skipEndPier?: boolean } = {}
  ) => {
    const segD = z2 - z1;
    if (segD < 0.8) return;
    const scz = (z1 + z2) * 0.5;
    addBox(0.36, 1.3, segD, wallMat, x, 0.73, scz);
    addBox(0.42, 0.16, segD, trimAccentMat, x, 1.46, scz);
    const bayCount = Math.max(2, Math.round(segD / 4.8));
    for (let i = 0; i <= bayCount; i++) {
      if (i === 0 && opts.skipStartPier) continue;
      if (i === bayCount && opts.skipEndPier) continue;
      const pz = z1 + (segD * i) / bayCount;
      addColonnadePier(x, pz);
    }
    addBox(0.3, 0.72, segD, p.breezeBlockTerracottaMat, x, hallH - 0.82, scz);
    // Trim fascia beam strictly inside the X-wall fascia beams at corners so top/bottom/side faces NEVER overlap!
    const fz1 = opts.skipStartPier ? z1 + 0.34 : z1;
    const fz2 = opts.skipEndPier ? z2 - 0.34 : z2;
    if (fz2 - fz1 > 0.2) {
      addBox(0.62, 0.42, fz2 - fz1, trimAccentMat, x, hallH - 0.21, (fz1 + fz2) * 0.5);
    }
  };

  buildWallRunX(westWallX, L.cx - L.mainGateHalfW - 0.2, L.frontZ, { skipStartPier: true, skipEndPier: true });
  buildWallRunX(L.cx + L.mainGateHalfW + 0.2, eastWallX, L.frontZ, { skipStartPier: true, skipEndPier: true });
  buildWallRunX(westWallX, L.cx - L.rearGateHalfW, L.backZ, { skipStartPier: true });
  buildWallRunX(L.cx + L.rearGateHalfW, eastWallX, L.backZ, { skipEndPier: true });
  buildWallRunZ(westWallX, m.bodyMinZ, L.bodyCz - L.sideGateHalfD, { skipStartPier: true });
  buildWallRunZ(westWallX, L.bodyCz + L.sideGateHalfD, m.bodyMaxZ, { skipEndPier: true });
  buildWallRunZ(eastWallX, m.bodyMinZ, L.bodyCz - L.sideGateHalfD, { skipStartPier: true });
  buildWallRunZ(eastWallX, L.bodyCz + L.sideGateHalfD, m.bodyMaxZ, { skipEndPier: true });

  // -------------------------------------------------------------------------
  // 3. GRAND VIETNAMESE HERITAGE MARKET PORTAL & CLOCK TOWER PEDIMENT
  // -------------------------------------------------------------------------
  const gateW = L.mainGateHalfW * 2 + 1.4;
  // Twin grand gate pillars with gold collars & warm gate globes
  [-L.mainGateHalfW - 0.35, L.mainGateHalfW + 0.35].forEach((ox) => {
    addBox(0.92, 6.0, 0.96, wallMat, L.cx + ox, 3.08, L.frontZ);
    addBox(1.06, 0.62, 1.1, trimAccentMat, L.cx + ox, 0.39, L.frontZ);
    addBox(1.04, 0.22, 1.08, p.goldBrassMat, L.cx + ox, 5.9, L.frontZ);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), shared.lanternGlowMat);
    globe.position.set(L.cx + ox, 6.42, L.frontZ);
    parent.add(globe);
  });
  // Stepped heritage pediment arch header
  addBox(gateW + 1.6, 1.85, 0.9, wallMat, L.cx, 5.85, L.frontZ);
  addBox(gateW + 2.2, 0.26, 1.18, trimAccentMat, L.cx, 6.84, L.frontZ);
  addBox(7.2, 1.95, 0.96, wallMat, L.cx, 7.65, L.frontZ);
  addBox(7.9, 0.34, 1.24, roofMat, L.cx, 8.75, L.frontZ);
  addBox(4.4, 0.65, 1.1, roofMat, L.cx, 9.18, L.frontZ);
  // Gold crown finial
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), p.goldBrassMat);
  crown.position.set(L.cx, 9.68, L.frontZ);
  parent.add(crown);

  // Iconic Round Market Clock (facing street!)
  const clockMat = new THREE.MeshStandardMaterial({
    map: getMarketClockTex(),
    emissive: 0xfff7ed,
    emissiveMap: getMarketClockTex(),
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  p.neonMats.push(clockMat);
  const clockDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.14, 24), clockMat);
  clockDisc.rotation.x = Math.PI / 2;
  clockDisc.position.set(L.cx, 7.72, L.frontZ + dirFront * 0.52);
  parent.add(clockDisc);
  const clockBezel = new THREE.Mesh(new THREE.TorusGeometry(0.89, 0.075, 8, 24), p.goldBrassMat);
  clockBezel.position.set(L.cx, 7.72, L.frontZ + dirFront * 0.58);
  parent.add(clockBezel);

  // Main Luminous Market Signboard (Front + Rear + Two Side Gate Signs!)
  const mainSignTex = p.createSignTex(
    m.shortLabel,
    isNorthHeritage
      ? 'CHỢ DÂN SINH KHU BẮC • RAU SẠCH • HẢI SẢN • ẨM THỰC'
      : 'CHỢ DÂN SINH KHU NAM • TRÁI CÂY • HẢI SẢN • ĐỒ KHÔ',
    { bg: gableBg, bg2: gableBg2, border: '#fde047', w: 1024, h: 256 }
  );
  const mainSignMat = new THREE.MeshStandardMaterial({
    map: mainSignTex,
    emissive: 0xffffff,
    emissiveMap: mainSignTex,
    emissiveIntensity: 0.65,
    roughness: 0.32,
  });
  p.neonMats.push(mainSignMat);
  const frontSign = new THREE.Mesh(new THREE.PlaneGeometry(gateW + 0.6, 1.5), mainSignMat);
  frontSign.position.set(L.cx, 5.82, L.frontZ + dirFront * 0.51);
  if (m.facingNorth) frontSign.rotation.y = Math.PI;
  parent.add(frontSign);

  // Dynamic Open/Closed Market Status Banner mounted below Front Main Signboard (Y = 4.92)
  const openStatusTex = p.createSignTex('● ĐANG MỞ CỬA', 'GIỜ HOẠT ĐỘNG: 07:00 - 18:00 HÀNG NGÀY', {
    bg: '#065f46',
    bg2: '#047857',
    border: '#6ee7b7',
    w: 512,
    h: 128,
  });
  const closedStatusTex = p.createSignTex('● ĐÃ ĐÓNG CỬA', 'HẸN GẶP LẠI TỪ 07:00 SÁNG NGÀY MAI', {
    bg: '#7f1d1d',
    bg2: '#991b1b',
    border: '#fca5a5',
    w: 512,
    h: 128,
  });
  const openStatusMat = new THREE.MeshStandardMaterial({
    map: openStatusTex,
    emissive: 0xffffff,
    emissiveMap: openStatusTex,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const closedStatusMat = new THREE.MeshStandardMaterial({
    map: closedStatusTex,
    emissive: 0xffffff,
    emissiveMap: closedStatusTex,
    emissiveIntensity: 0.72,
    roughness: 0.3,
  });
  const statusBanner = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.52), openStatusMat);
  statusBanner.position.set(L.cx, 4.92, L.frontZ + dirFront * 0.52);
  if (m.facingNorth) statusBanner.rotation.y = Math.PI;
  dynParent.add(statusBanner);

  // Rear Gate Header Sign
  addBox(L.rearGateHalfW * 2 + 1.0, 1.25, 0.68, trimAccentMat, L.cx, 5.3, L.backZ);
  const rearSign = new THREE.Mesh(new THREE.PlaneGeometry(L.rearGateHalfW * 2, 1.05), mainSignMat);
  rearSign.position.set(L.cx, 5.3, L.backZ - dirFront * 0.37);
  if (!m.facingNorth) rearSign.rotation.y = Math.PI;
  parent.add(rearSign);

  // East & West Side Gate Arches (facing the alleys!)
  const sideGateTex = p.createSignTex(
    `CỔNG PHỤ ${m.shortLabel}`,
    'MỞ CỬA 07:00 - 18:00 HÀNG NGÀY',
    { bg: gableBg, bg2: gableBg2, border: '#fde047' }
  );
  const sideGateMat = new THREE.MeshStandardMaterial({
    map: sideGateTex,
    emissive: 0xffffff,
    emissiveMap: sideGateTex,
    emissiveIntensity: 0.5,
    roughness: 0.35,
  });
  p.neonMats.push(sideGateMat);
  [
    { x: westWallX, dir: -1, rotY: -Math.PI / 2 },
    { x: eastWallX, dir: 1, rotY: Math.PI / 2 },
  ].forEach((sg) => {
    addBox(0.68, 1.15, L.sideGateHalfD * 2 + 0.8, trimAccentMat, sg.x, 5.15, L.bodyCz);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(L.sideGateHalfD * 2 + 0.2, 0.92), sideGateMat);
    face.position.set(sg.x + sg.dir * 0.37, 5.15, L.bodyCz);
    face.rotation.y = sg.rotY;
    parent.add(face);
  });

  // 4 Animated Corrugated Iron Rolling Shutters (Cửa Cuốn Sắt Chợ — Front, Rear, West, East)
  const shutterMat = new THREE.MeshStandardMaterial({
    map: getRollingShutterTex(),
    color: 0xcbd5e1,
    roughness: 0.45,
    metalness: 0.55,
  });
  const shutterClosedPlateTex = p.createSignTex('CHỢ ĐÃ ĐÓNG CỬA', 'GIỜ MỞ CỬA: 07:00 - 18:00', {
    bg: '#991b1b',
    bg2: '#7f1d1d',
    border: '#fde047',
    w: 512,
    h: 160,
  });
  const shutterClosedPlateMat = new THREE.MeshStandardMaterial({
    map: shutterClosedPlateTex,
    emissive: 0xffffff,
    emissiveMap: shutterClosedPlateTex,
    emissiveIntensity: 0.45,
    roughness: 0.38,
  });

  interface MarketShutterRig {
    mesh: THREE.Mesh;
    topY: number;
    fullH: number;
    noticePlate?: THREE.Mesh;
  }
  const shutters: MarketShutterRig[] = [];
  const createGateShutter = (
    wS: number,
    dS: number,
    topY: number,
    cxS: number,
    czS: number,
    noticeDir?: { dx: number; dz: number; rotY: number }
  ) => {
    const fullH = topY - 0.08;
    // Top roller housing box tucked cleanly under arch header
    addBox(wS + 0.16, 0.34, dS + 0.24, p.darkSteelMat, cxS, topY + 0.14, czS);
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(wS, fullH, dS), shutterMat);
    curtain.position.set(cxS, topY - fullH * 0.5, czS);
    curtain.visible = false;
    dynParent.add(curtain);
    let noticePlate: THREE.Mesh | undefined;
    if (noticeDir) {
      noticePlate = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), shutterClosedPlateMat);
      noticePlate.position.set(cxS + noticeDir.dx, 2.25, czS + noticeDir.dz);
      noticePlate.rotation.y = noticeDir.rotY;
      noticePlate.visible = false;
      dynParent.add(noticePlate);
    }
    shutters.push({ mesh: curtain, topY, fullH, noticePlate });
  };
  createGateShutter(L.mainGateHalfW * 2 - 0.04, 0.14, 4.66, L.cx, L.frontZ, {
    dx: 0,
    dz: dirFront * 0.11,
    rotY: m.facingNorth ? Math.PI : 0,
  });
  createGateShutter(L.rearGateHalfW * 2 - 0.04, 0.14, 4.46, L.cx, L.backZ, {
    dx: 0,
    dz: -dirFront * 0.11,
    rotY: m.facingNorth ? 0 : Math.PI,
  });
  createGateShutter(0.14, L.sideGateHalfD * 2 - 0.04, 4.42, westWallX, L.bodyCz);
  createGateShutter(0.14, L.sideGateHalfD * 2 - 0.04, 4.42, eastWallX, L.bodyCz);

  // -------------------------------------------------------------------------
  // 4. TWO-TIER VAULTED CORRUGATED STEEL ROOF + LUMINOUS CLERESTORY MONITOR
  // -------------------------------------------------------------------------
  const roofSpanX = L.w + 1.4;
  const halfDepth = L.bodyD * 0.5 + 0.9;
  const slopeLen = Math.hypot(halfDepth * 0.72, 1.65);
  const slopeAngle = Math.atan2(1.65, halfDepth * 0.72);
  addBox(roofSpanX, 0.22, slopeLen, roofMat, L.cx, hallH + 0.78, L.bodyCz - halfDepth * 0.52, [-slopeAngle, 0, 0]);
  addBox(roofSpanX, 0.22, slopeLen, roofMat, L.cx, hallH + 0.78, L.bodyCz + halfDepth * 0.52, [slopeAngle, 0, 0]);

  const monW = L.w - 4.0;
  const monD = 6.2;
  addBox(monW, 1.25, 0.16, marketClerestoryMat, L.cx, hallH + 2.05, L.bodyCz - monD * 0.5);
  addBox(monW, 1.25, 0.16, marketClerestoryMat, L.cx, hallH + 2.05, L.bodyCz + monD * 0.5);
  addBox(monW + 1.4, 0.22, monD * 0.52, roofMat, L.cx, hallH + 2.86, L.bodyCz - monD * 0.27, [-0.22, 0, 0]);
  addBox(monW + 1.4, 0.22, monD * 0.52, roofMat, L.cx, hallH + 2.86, L.bodyCz + monD * 0.27, [0.22, 0, 0]);
  addBox(monW + 1.6, 0.22, 0.44, p.goldBrassMat, L.cx, hallH + 3.24, L.bodyCz);

  // Steel Interior Trusses & Bright Overhead Industrial Market Pendant Lamps
  const trussCount = 6;
  const lampDomeGeo = new THREE.ConeGeometry(0.46, 0.24, 10);
  const lampBulbGeo = new THREE.SphereGeometry(0.24, 8, 8);
  const poolGeo = new THREE.PlaneGeometry(11.0, 11.0);
  for (let ti = 0; ti < trussCount; ti++) {
    const tx = m.minX + 5.5 + ((L.w - 11.0) * ti) / (trussCount - 1);
    addBox(0.22, 0.26, L.bodyD - 0.8, p.darkSteelMat, tx, hallH - 0.18, L.bodyCz);
    [-L.bodyD * 0.28, 0, L.bodyD * 0.28].forEach((oz, oi) => {
      const lz = L.bodyCz + oz;
      addBox(0.05, 0.72, 0.05, p.darkSteelMat, tx, hallH - 0.58, lz);
      const dome = new THREE.Mesh(lampDomeGeo, trimAccentMat);
      dome.position.set(tx, hallH - 0.98, lz);
      parent.add(dome);
      const bulb = new THREE.Mesh(lampBulbGeo, marketBulbMat);
      bulb.position.set(tx, hallH - 1.14, lz);
      parent.add(bulb);
      if (oi === 1 || ti % 2 === 0) {
        const pool = new THREE.Mesh(poolGeo, marketPoolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(tx, 0.125, lz);
        parent.add(pool);
      }
    });
  }

  // -------------------------------------------------------------------------
  // 5. 16 HYPER-DETAILED THEMED MERCHANT STALLS (CLEAR FISH, MEAT, RICE, PRODUCE, FLOWERS & FOOD!)
  // -------------------------------------------------------------------------
  const npcSeeds: ResidentialMarketNpcSeed[] = [];
  const stallSpots: MarketStallSpot[] = [];

  // Shared procedural geometries for rich, unmistakable 3D Vietnamese market goods
  const basketGeo = new THREE.CylinderGeometry(0.38, 0.3, 0.26, 10);
  const basinGeo = new THREE.CylinderGeometry(0.44, 0.34, 0.22, 12);
  const fishBodyGeo = new THREE.SphereGeometry(0.18, 10, 8);
  const fishTailGeo = new THREE.ConeGeometry(0.11, 0.18, 4);
  const fruitSmallGeo = new THREE.SphereGeometry(0.095, 8, 6);
  const melonGeo = new THREE.SphereGeometry(0.22, 10, 8);
  const carrotGeo = new THREE.ConeGeometry(0.045, 0.28, 6);
  const sackBodyGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.56, 10);
  const sackCollarGeo = new THREE.TorusGeometry(0.3, 0.048, 6, 12);
  const riceMoundGeo = new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const scoopGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.14, 8);
  const bottleGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.28, 8);
  const flowerVaseGeo = new THREE.CylinderGeometry(0.19, 0.14, 0.38, 10);
  const flowerHeadGeo = new THREE.DodecahedronGeometry(0.11, 0);
  const nonLaGeo = new THREE.ConeGeometry(0.28, 0.2, 12, 1, true);
  const soupPotGeo = new THREE.CylinderGeometry(0.32, 0.3, 0.44, 12);
  const bowlGeo = new THREE.CylinderGeometry(0.14, 0.09, 0.1, 10);
  const stoolTopGeo = new THREE.CylinderGeometry(0.19, 0.21, 0.36, 8);

  // Composite 3D Whole Fish (silver metallic body + dark-blue dorsal ridge + forked tail + eyes)
  const addWholeFish = (fx: number, fy: number, fz: number, yaw: number, scale = 1.0) => {
    const g = new THREE.Group();
    g.position.set(fx, fy, fz);
    g.rotation.y = yaw;
    g.scale.setScalar(scale);
    const body = new THREE.Mesh(fishBodyGeo, fishSilverMat);
    body.scale.set(1.85, 0.55, 0.42);
    g.add(body);
    const dorsal = new THREE.Mesh(fishBodyGeo, fishBackBlueMat);
    dorsal.scale.set(1.55, 0.32, 0.36);
    dorsal.position.set(0, 0.055, 0);
    g.add(dorsal);
    const tail = new THREE.Mesh(fishTailGeo, fishBackBlueMat);
    tail.rotation.z = -Math.PI / 2;
    tail.position.set(-0.34, 0, 0);
    g.add(tail);
    const eye1 = new THREE.Mesh(fruitSmallGeo, p.darkSteelMat);
    eye1.scale.setScalar(0.24);
    eye1.position.set(0.22, 0.02, 0.065);
    g.add(eye1);
    const eye2 = eye1.clone();
    eye2.position.z = -0.065;
    g.add(eye2);
    parent.add(g);
  };

  // Composite 3D Sea Crab (flattened blue-orange carapace + pincers + legs)
  const addSeaCrab = (cx: number, cy: number, cz: number, yaw: number) => {
    const g = new THREE.Group();
    g.position.set(cx, cy, cz);
    g.rotation.y = yaw;
    const shell = new THREE.Mesh(fishBodyGeo, crabBlueMat);
    shell.scale.set(1.15, 0.38, 0.92);
    g.add(shell);
    [-1, 1].forEach((side) => {
      const claw = new THREE.Mesh(fishBodyGeo, shrimpOrangeMat);
      claw.scale.set(0.55, 0.28, 0.34);
      claw.position.set(side * 0.22, 0, 0.16);
      g.add(claw);
    });
    parent.add(g);
  };

  // Classic Vietnamese Red Nhơn Hòa Spring Scale (cân đồng hồ đỏ)
  const addNhonHoaScale = (sx: number, sy: number, sz: number, faceSign: number) => {
    addBox(0.24, 0.24, 0.2, produceRedMat, sx, sy + 0.12, sz);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), counterTileWhiteMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(sx, sy + 0.14, sz + faceSign * 0.1);
    parent.add(dial);
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.05, 10), p.chromeInoxMat);
    pan.position.set(sx, sy + 0.28, sz);
    parent.add(pan);
  };

  // Open Vietnamese Rice Sack (burlap or white poly sack rolled open showing gleaming rice mound + metal scoop)
  const addOpenRiceSack = (rx: number, ry: number, rz: number, isBrown: boolean, isPoly: boolean) => {
    const sack = new THREE.Mesh(sackBodyGeo, isPoly ? polySackWhiteMat : burlapSackMat);
    sack.position.set(rx, ry + 0.28, rz);
    parent.add(sack);
    const collar = new THREE.Mesh(sackCollarGeo, isPoly ? polySackWhiteMat : burlapSackMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(rx, ry + 0.55, rz);
    parent.add(collar);
    const mound = new THREE.Mesh(riceMoundGeo, isBrown ? riceBrownMat : riceWhiteMat);
    mound.position.set(rx, ry + 0.52, rz);
    parent.add(mound);
    const scoop = new THREE.Mesh(scoopGeo, p.chromeInoxMat);
    scoop.position.set(rx + 0.08, ry + 0.72, rz + 0.04);
    scoop.rotation.z = -0.35;
    parent.add(scoop);
  };

  const counterTopY = 1.04;

  L.quadrants.forEach((q) => {
    const stallCount = 4;
    const stallW = q.w / stallCount;
    const catalog = STALL_CATALOG[q.kind];
    const fs = q.faceAisleSign; // +1: customer aisle is on +Z; -1: customer aisle is on -Z
    const frontEdgeZ = fs > 0 ? q.maxZ : q.minZ;
    const backEdgeZ = fs > 0 ? q.minZ : q.maxZ;
    const displayZ = q.cz + fs * (q.d * 0.24);
    const backDisplayZ = q.cz - fs * (q.d * 0.2);

    // Base tiled masonry counter island (Y 0.08..0.96) + Inox countertop (Y 0.96..1.04) — zero overlap!
    addBox(q.w, 0.88, q.d, counterTileWhiteMat, q.cx, 0.52, q.cz);
    addBox(q.w + 0.08, 0.08, q.d + 0.08, p.chromeInoxMat, q.cx, 1.0, q.cz);

    for (let si = 0; si < stallCount; si++) {
      const sx = q.minX + (si + 0.5) * stallW;
      const meta = catalog[si % catalog.length];
      const awningMat = new THREE.MeshStandardMaterial({ color: meta.awningColor, roughness: 0.72 });

      // Corner steel posts sitting cleanly ON TOP of counter (Y 1.04..2.94) + overhead hanging crossbar
      [-stallW * 0.46, stallW * 0.46].forEach((ox) => {
        addBox(0.08, 1.9, 0.08, p.darkSteelMat, sx + ox, 1.99, q.minZ + 0.14);
        addBox(0.08, 1.9, 0.08, p.darkSteelMat, sx + ox, 1.99, q.maxZ - 0.14);
      });
      addBox(stallW - 0.2, 0.06, 0.06, p.chromeInoxMat, sx, 2.46, q.cz + fs * 0.35);
      addBox(stallW - 0.18, 0.1, q.d + 0.65, awningMat, sx, 2.96, q.cz, [fs * 0.08, 0, 0]);

      // Crisp Stall Header Signboard facing the central cross aisle
      const sTex = p.createSignTex(meta.title, meta.sub, { bg: meta.bg, bg2: '#1e293b', border: '#fde047' });
      const sMat = new THREE.MeshStandardMaterial({
        map: sTex,
        emissive: 0xffffff,
        emissiveMap: sTex,
        emissiveIntensity: 0.46,
        roughness: 0.38,
      });
      p.neonMats.push(sMat);
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(stallW - 0.45, 0.58), sMat);
      const signZ = fs > 0 ? q.maxZ + 0.28 : q.minZ - 0.28;
      signMesh.position.set(sx, 3.26, signZ);
      if (fs < 0) signMesh.rotation.y = Math.PI;
      parent.add(signMesh);

      // Hanging warm stall work bulb (dims when market closes after 18:00!)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), marketBulbMat);
      bulb.position.set(sx, 2.68, q.cz + fs * 0.55);
      parent.add(bulb);

      // =====================================================================
      // CLEAR, UNMISTAKABLE 3D MARKET GOODS PER STALL
      // =====================================================================
      if (q.kind === 'produce') {
        if (si === 0 || si === 2) {
          // VEGETABLE STALLS: Leafy green bundles, bright red tomatoes, orange carrots, pumpkins & watermelons
          // Angled tiered wooden display shelf
          addBox(stallW - 0.5, 0.12, 1.35, p.bambooMat, sx, counterTopY + 0.12, displayZ, [fs * 0.14, 0, 0]);
          // Left bay: Leafy Green Cải Xanh / Rau Muống bundles + pale green cabbages
          for (let k = 0; k < 4; k++) {
            const vx = sx - stallW * 0.34 + k * 0.24;
            const leaf = new THREE.Mesh(carrotGeo, k % 2 === 0 ? produceGreenMat : leafDarkGreenMat);
            leaf.scale.set(2.0, 1.45, 2.0);
            leaf.rotation.x = fs * 1.15;
            leaf.position.set(vx, counterTopY + 0.24, displayZ);
            parent.add(leaf);
          }
          for (let c = 0; c < 3; c++) {
            const cab = new THREE.Mesh(melonGeo, cabbagePaleMat);
            cab.scale.set(0.85, 0.72, 0.85);
            cab.position.set(sx - stallW * 0.3 + c * 0.34, counterTopY + 0.3, backDisplayZ + fs * 0.25);
            parent.add(cab);
          }
          // Center bay: Bright red tomato crate + orange carrot pile with green leafy tops!
          const tomBasket = new THREE.Mesh(basketGeo, p.bambooMat);
          tomBasket.position.set(sx - 0.28, counterTopY + 0.14, displayZ + fs * 0.15);
          parent.add(tomBasket);
          for (let t = 0; t < 6; t++) {
            const ang = (t / 6) * Math.PI * 2;
            const tom = new THREE.Mesh(fruitSmallGeo, produceRedMat);
            tom.position.set(
              sx - 0.28 + Math.cos(ang) * 0.14,
              counterTopY + 0.28 + (t % 2) * 0.07,
              displayZ + fs * 0.15 + Math.sin(ang) * 0.14
            );
            parent.add(tom);
          }
          // Tapered orange carrots
          for (let cr = 0; cr < 5; cr++) {
            const cxOff = sx + 0.32 + (cr - 2) * 0.11;
            const car = new THREE.Mesh(carrotGeo, produceOrangeMat);
            car.rotation.x = fs * 1.3;
            car.position.set(cxOff, counterTopY + 0.22, displayZ + fs * 0.1);
            parent.add(car);
            const top = new THREE.Mesh(fruitSmallGeo, produceGreenMat);
            top.scale.set(0.65, 0.8, 0.65);
            top.position.set(cxOff, counterTopY + 0.25, displayZ - fs * 0.06);
            parent.add(top);
          }
          // Right bay: Striped Watermelons + sliced bright-red watermelon wedges + orange pumpkin!
          const pumpkin = new THREE.Mesh(melonGeo, produceOrangeMat);
          pumpkin.scale.set(1.25, 0.82, 1.25);
          pumpkin.position.set(sx + stallW * 0.28, counterTopY + 0.22, displayZ + fs * 0.08);
          parent.add(pumpkin);
          addBox(0.05, 0.14, 0.05, leafDarkGreenMat, sx + stallW * 0.28, counterTopY + 0.42, displayZ + fs * 0.08);
          // Whole dark-green watermelon + red halved wedge!
          const mel = new THREE.Mesh(melonGeo, watermelonDarkMat);
          mel.scale.set(1.3, 0.92, 0.95);
          mel.position.set(sx + stallW * 0.26, counterTopY + 0.24, backDisplayZ + fs * 0.2);
          parent.add(mel);
          const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10, 1, false, 0, Math.PI), watermelonRedMat);
          wedge.rotation.x = Math.PI / 2;
          wedge.position.set(sx + stallW * 0.34, counterTopY + 0.2, displayZ + fs * 0.38);
          parent.add(wedge);
          addNhonHoaScale(sx - stallW * 0.38, counterTopY, backDisplayZ, fs);
          addPriceTag(sx, counterTopY + 0.26, frontEdgeZ - fs * 0.18, fs, si === 0 ? 'RAU SẠCH' : 'DƯA HẤU', si === 0 ? '15K/BÓ' : '18K/KG', '#15803d');
        } else {
          // TROPICAL FRUIT STALLS: Hanging yellow bananas, golden mangoes, oranges, pink dragon fruit, spiky durians
          // Hanging banana bunches from overhead bar!
          [-stallW * 0.26, 0, stallW * 0.26].forEach((bxOff) => {
            addBox(0.03, 0.34, 0.03, p.bambooMat, sx + bxOff, 2.28, q.cz + fs * 0.35);
            for (let bn = -2; bn <= 2; bn++) {
              const banana = new THREE.Mesh(carrotGeo, produceYellowMat);
              banana.scale.set(1.1, 1.05, 1.1);
              banana.rotation.z = bn * 0.28;
              banana.position.set(sx + bxOff + bn * 0.065, 2.02, q.cz + fs * 0.35);
              parent.add(banana);
            }
          });
          // 4 Fruit Baskets across the counter: Oranges, Mangoes, Dragon Fruit, Durians
          const fruitGroups: Array<{ ox: number; mat: THREE.Material; sxScale: number; syScale: number }> = [
            { ox: -stallW * 0.33, mat: produceOrangeMat, sxScale: 1.0, syScale: 1.0 },      // Cam sành
            { ox: -stallW * 0.11, mat: produceYellowMat, sxScale: 1.45, syScale: 0.9 },     // Xoài cát
            { ox: stallW * 0.11, mat: dragonFruitPinkMat, sxScale: 1.2, syScale: 1.1 },     // Thanh long
            { ox: stallW * 0.33, mat: durianYellowGreenMat, sxScale: 1.65, syScale: 1.45 }, // Sầu riêng
          ];
          fruitGroups.forEach((fg) => {
            const bMesh = new THREE.Mesh(basketGeo, p.bambooMat);
            bMesh.position.set(sx + fg.ox, counterTopY + 0.13, displayZ + fs * 0.1);
            parent.add(bMesh);
            for (let fi = 0; fi < 5; fi++) {
              const ang = (fi / 5) * Math.PI * 2;
              const rad = fi === 4 ? 0 : 0.14;
              const fy = fi === 4 ? counterTopY + 0.36 : counterTopY + 0.27;
              const fr = new THREE.Mesh(fruitSmallGeo, fg.mat);
              fr.scale.set(fg.sxScale, fg.syScale, fg.sxScale);
              fr.position.set(sx + fg.ox + Math.cos(ang) * rad, fy, displayZ + fs * 0.1 + Math.sin(ang) * rad);
              parent.add(fr);
            }
          });
          addNhonHoaScale(sx + stallW * 0.36, counterTopY, backDisplayZ, fs);
          addPriceTag(sx, counterTopY + 0.26, frontEdgeZ - fs * 0.18, fs, si === 1 ? 'XOÀI • CAM' : 'SẦU RIÊNG', si === 1 ? '35K/KG' : '95K/KG', '#c2410c');
        }
      } else if (q.kind === 'seafood_meat') {
        if (si === 0 || si === 2) {
          // FISH & SEAFOOD STALLS: Sparkling crushed-ice trays with REAL 3D WHOLE FISH, shrimp, crabs & clam basins!
          // Wide raised stainless ice tray
          addBox(stallW - 0.55, 0.16, 1.45, p.chromeInoxMat, sx, counterTopY + 0.08, displayZ + fs * 0.08);
          addBox(stallW - 0.72, 0.12, 1.28, wetIceMat, sx, counterTopY + 0.14, displayZ + fs * 0.08);

          // 6 unmistakable 3D Whole Fish (Cá Thu / Cá Lóc / Cá Bạc Má) arranged neatly in 2 rows on the ice!
          for (let fi = 0; fi < 6; fi++) {
            const col = fi % 3;
            const row = Math.floor(fi / 3);
            const fx = sx - stallW * 0.32 + col * 0.62;
            const fz = displayZ + (row === 0 ? fs * 0.34 : -fs * 0.18);
            addWholeFish(fx, counterTopY + 0.25, fz, (col - 1) * 0.18 + (si === 2 ? 0.3 : 0), col === 1 ? 1.18 : 1.0);
          }

          // Round steel tray heaped with curled orange-red Shrimp (Tôm Sú) + 2 Blue Sea Crabs (Cua Biển)!
          const shrimpTray = new THREE.Mesh(basinGeo, p.chromeInoxMat);
          shrimpTray.scale.set(1.0, 0.45, 1.0);
          shrimpTray.position.set(sx + stallW * 0.12, counterTopY + 0.22, displayZ + fs * 0.18);
          parent.add(shrimpTray);
          for (let sh = 0; sh < 7; sh++) {
            const ang = (sh / 7) * Math.PI * 2;
            const shrimp = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.025, 6, 8, Math.PI * 1.35), shrimpOrangeMat);
            shrimp.rotation.x = Math.PI / 2;
            shrimp.rotation.z = ang;
            shrimp.position.set(
              sx + stallW * 0.12 + Math.cos(ang) * 0.16,
              counterTopY + 0.29 + (sh % 2) * 0.04,
              displayZ + fs * 0.18 + Math.sin(ang) * 0.16
            );
            parent.add(shrimp);
          }
          addSeaCrab(sx + stallW * 0.1, counterTopY + 0.26, backDisplayZ + fs * 0.15, 0.3);
          addSeaCrab(sx + stallW * 0.24, counterTopY + 0.26, backDisplayZ + fs * 0.25, -0.4);

          // Red & Blue plastic seafood tubs filled with water & dark-shell clams/snails (nghêu sò ốc)!
          const clamTub = new THREE.Mesh(basinGeo, si === 0 ? p.plasticBlueMat : p.plasticRedMat);
          clamTub.position.set(sx + stallW * 0.33, counterTopY + 0.12, displayZ + fs * 0.16);
          parent.add(clamTub);
          for (let cl = 0; cl < 7; cl++) {
            const ang = (cl / 7) * Math.PI * 2;
            const clam = new THREE.Mesh(fruitSmallGeo, clamDarkMat);
            clam.scale.set(1.0, 0.55, 0.85);
            clam.position.set(
              sx + stallW * 0.33 + Math.cos(ang) * 0.16,
              counterTopY + 0.23,
              displayZ + fs * 0.16 + Math.sin(ang) * 0.16
            );
            parent.add(clam);
          }
          // Hanging stainless scale pan from crossbar
          addBox(0.02, 0.65, 0.02, p.chromeInoxMat, sx - stallW * 0.36, 2.12, q.cz + fs * 0.35);
          const hangPan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.06, 10), p.chromeInoxMat);
          hangPan.position.set(sx - stallW * 0.36, 1.78, q.cz + fs * 0.35);
          parent.add(hangPan);
          addPriceTag(sx - 0.35, counterTopY + 0.26, frontEdgeZ - fs * 0.16, fs, si === 0 ? 'CÁ THU • TÔM' : 'CÁ LÓC • ỐC', si === 0 ? '180K/KG' : '95K/KG', '#0369a1');
        } else {
          // BUTCHER STALLS (THỊT HEO / THỊT BÒ / GÀ TA):
          // Overhead stainless butcher rail with 5 HANGING MEAT CUTS (red meat + white pork fat + bone)!
          for (let hm = 0; hm < 5; hm++) {
            const hx = sx - stallW * 0.34 + (stallW * 0.68 * hm) / 4;
            const hz = q.cz + fs * 0.35;
            addBox(0.025, 0.28, 0.025, p.chromeInoxMat, hx, 2.32, hz); // Chrome S-hook
            const cutMat = si === 1 ? (hm % 2 === 0 ? rawPorkPinkMat : rawMeatRedMat) : rawMeatRedMat;
            // Meat body + creamy white fat layer on front/back!
            addBox(0.26, 0.52, 0.16, cutMat, hx, 1.96, hz);
            addBox(0.27, 0.44, 0.06, porkFatCreamMat, hx, 1.98, hz + fs * 0.09);
            const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 6), counterTileWhiteMat);
            bone.position.set(hx, 2.24, hz);
            parent.add(bone);
          }

          // Thick round wooden chopping block (Thớt Gỗ Nghiến) + shiny butcher cleaver (Dao Phay)!
          const chopBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.2, 12), choppingWoodMat);
          chopBlock.position.set(sx - stallW * 0.26, counterTopY + 0.1, displayZ + fs * 0.12);
          parent.add(chopBlock);
          // Butcher cleaver blade stuck at an angle into the chopping block
          addBox(0.24, 0.13, 0.02, p.chromeInoxMat, sx - stallW * 0.24, counterTopY + 0.26, displayZ + fs * 0.12, [0, 0.25, -0.35]);
          addBox(0.14, 0.045, 0.045, choppingWoodMat, sx - stallW * 0.08, counterTopY + 0.33, displayZ + fs * 0.15, [0, 0.25, -0.35]);

          // Layered White Enamel Meat Trays with streaky pork belly (Ba Rọi: red meat + white fat stripes!)
          addBox(1.45, 0.06, 0.95, counterTileWhiteMat, sx + 0.25, counterTopY + 0.04, displayZ + fs * 0.12);
          for (let slab = 0; slab < 3; slab++) {
            const mx = sx - 0.18 + slab * 0.44;
            addBox(0.34, 0.12, 0.62, si === 1 ? rawPorkPinkMat : rawMeatRedMat, mx, counterTopY + 0.13, displayZ + fs * 0.12);
            addBox(0.35, 0.055, 0.63, porkFatCreamMat, mx, counterTopY + 0.21, displayZ + fs * 0.12);
            if (si === 1) {
              addBox(0.34, 0.04, 0.62, rawPorkPinkMat, mx, counterTopY + 0.25, displayZ + fs * 0.12);
            }
          }

          // Right side: Fresh/Roast Chickens (Gà Ta) + Beige Egg Cartons packed with eggs!
          if (si === 3) {
            for (let ck = 0; ck < 2; ck++) {
              const ckx = sx + stallW * 0.28 + (ck - 0.5) * 0.42;
              const body = new THREE.Mesh(melonGeo, chickenGoldenMat);
              body.scale.set(0.9, 0.68, 1.25);
              body.position.set(ckx, counterTopY + 0.18, displayZ + fs * 0.14);
              parent.add(body);
              [-0.14, 0.14].forEach((lx) => {
                const leg = new THREE.Mesh(carrotGeo, chickenGoldenMat);
                leg.scale.set(1.2, 0.8, 1.2);
                leg.rotation.x = Math.PI * 0.4;
                leg.position.set(ckx + lx, counterTopY + 0.22, displayZ + fs * 0.32);
                parent.add(leg);
              });
            }
          } else {
            // 2 Egg cartons with visible eggs
            addBox(0.68, 0.08, 0.52, burlapSackMat, sx + stallW * 0.3, counterTopY + 0.05, displayZ + fs * 0.12);
            for (let ex = -1; ex <= 1; ex++) {
              for (let ez = -1; ez <= 1; ez++) {
                const egg = new THREE.Mesh(fruitSmallGeo, eggShellMat);
                egg.scale.set(0.65, 0.85, 0.65);
                egg.position.set(sx + stallW * 0.3 + ex * 0.16, counterTopY + 0.12, displayZ + fs * 0.12 + ez * 0.13);
                parent.add(egg);
              }
            }
          }
          addNhonHoaScale(sx - stallW * 0.38, counterTopY, backDisplayZ, fs);
          addPriceTag(sx + 0.15, counterTopY + 0.28, frontEdgeZ - fs * 0.16, fs, si === 1 ? 'THỊT BA RỌI' : 'BÒ • GÀ TA', si === 1 ? '145K/KG' : '220K/KG', '#991b1b');
        }
      } else if (q.kind === 'flowers_dry') {
        if (si === 0) {
          // FRESH FLOWER STALL (HOA TƯƠI CÔ MAI): Tall buckets overflowing with roses, chrysanthemums, lotus & sunflowers!
          const flowerCols = [produceRedMat, produceYellowMat, flowerPinkMat, produceOrangeMat, produceYellowMat, produceRedMat];
          for (let fl = 0; fl < 6; fl++) {
            const fx = sx - stallW * 0.38 + (stallW * 0.76 * fl) / 5;
            const fz = fl % 2 === 0 ? displayZ + fs * 0.18 : backDisplayZ + fs * 0.24;
            const bucket = new THREE.Mesh(flowerVaseGeo, fl % 2 === 0 ? p.plasticBlueMat : p.bambooMat);
            bucket.position.set(fx, counterTopY + 0.19, fz);
            parent.add(bucket);
            // Multi-stem bouquet rising tall above the bucket
            for (let st = 0; st < 4; st++) {
              const ang = (st / 4) * Math.PI * 2;
              const stemX = fx + Math.cos(ang) * 0.09;
              const stemZ = fz + Math.sin(ang) * 0.09;
              addBox(0.025, 0.36, 0.025, leafDarkGreenMat, stemX, counterTopY + 0.46, stemZ);
              const bloom = new THREE.Mesh(flowerHeadGeo, flowerCols[(fl + st) % flowerCols.length]);
              bloom.position.set(stemX, counterTopY + 0.66 + (st % 2) * 0.06, stemZ);
              parent.add(bloom);
            }
          }
          addPriceTag(sx, counterTopY + 0.28, frontEdgeZ - fs * 0.16, fs, 'HOA TƯƠI', '30K/BÓ', '#be185d');
        } else if (si === 1) {
          // RICE & DRY GOODS STALL (GẠO NGON ST25 • NÀNG THƠM • GẠO NẾP • ĐỒ KHÔ) — Crystal Clear Open Rice Sacks!
          // 5 Prominent Open Rice Sacks right on the counter showing pure white & brown rice + metal scoops + rice price signs!
          const riceSacks = [
            { ox: -stallW * 0.36, brown: false, poly: true, label: 'GẠO ST25', price: '28K/KG' },
            { ox: -stallW * 0.18, brown: false, poly: false, label: 'NÀNG THƠM', price: '24K/KG' },
            { ox: 0, brown: false, poly: true, label: 'GẠO NẾP', price: '32K/KG' },
            { ox: stallW * 0.18, brown: true, poly: false, label: 'GẠO LỨT', price: '30K/KG' },
          ];
          riceSacks.forEach((rs, rIdx) => {
            addOpenRiceSack(sx + rs.ox, counterTopY, displayZ + fs * 0.14, rs.brown, rs.poly);
            if (rIdx % 2 === 0) {
              addPriceTag(sx + rs.ox, counterTopY + 0.66, displayZ + fs * 0.22, fs, rs.label, rs.price, '#854d0e');
            }
          });
          // Extra big rice sacks stacked on the front floor step right below the counter!
          addOpenRiceSack(sx - 0.75, 0.1, frontEdgeZ + fs * 0.36, false, false);
          addOpenRiceSack(sx + 0.15, 0.1, frontEdgeZ + fs * 0.36, false, true);
          // Flat woven bamboo trays of dried beans, mung beans & mushrooms on right side
          const dryTray1 = new THREE.Mesh(basketGeo, p.bambooMat);
          dryTray1.scale.set(0.95, 0.4, 0.95);
          dryTray1.position.set(sx + stallW * 0.36, counterTopY + 0.08, displayZ + fs * 0.12);
          parent.add(dryTray1);
          const dryMound = new THREE.Mesh(riceMoundGeo, produceYellowMat);
          dryMound.scale.set(0.95, 0.55, 0.95);
          dryMound.position.set(sx + stallW * 0.36, counterTopY + 0.11, displayZ + fs * 0.12);
          parent.add(dryMound);
          addNhonHoaScale(sx + stallW * 0.36, counterTopY, backDisplayZ, fs);
        } else if (si === 2) {
          // SPICES & FISH SAUCE STALL (GIA VỊ & NƯỚC MẮM): Rows of amber fish sauce bottles, oil jugs & hanging garlic/chili!
          for (let b = 0; b < 6; b++) {
            const bx = sx - stallW * 0.36 + b * 0.24;
            const bottle = new THREE.Mesh(bottleGeo, b < 4 ? fishSauceAmberMat : cookingOilGoldMat);
            bottle.position.set(bx, counterTopY + 0.15, displayZ + fs * 0.16);
            parent.add(bottle);
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), produceRedMat);
            cap.position.set(bx, counterTopY + 0.31, displayZ + fs * 0.16);
            parent.add(cap);
          }
          // Stacked bamboo trays of chili, garlic & black pepper
          [-0.05, 0.65, 1.35].forEach((ox, idx) => {
            const tr = new THREE.Mesh(basketGeo, p.bambooMat);
            tr.scale.set(0.85, 0.42, 0.85);
            tr.position.set(sx + ox, counterTopY + 0.08, displayZ + fs * 0.14);
            parent.add(tr);
            const mat = idx === 0 ? produceRedMat : idx === 1 ? garlicWhiteMat : clamDarkMat;
            for (let g = 0; g < 6; g++) {
              const ang = (g / 6) * Math.PI * 2;
              const pce = new THREE.Mesh(fruitSmallGeo, mat);
              pce.scale.setScalar(0.7);
              pce.position.set(sx + ox + Math.cos(ang) * 0.12, counterTopY + 0.16, displayZ + fs * 0.14 + Math.sin(ang) * 0.12);
              parent.add(pce);
            }
          });
          // Hanging braided garlands of white garlic & red chilies from overhead bar!
          [-stallW * 0.26, 0, stallW * 0.26].forEach((gxOff, gi) => {
            for (let k = 0; k < 4; k++) {
              const bulbMesh = new THREE.Mesh(fruitSmallGeo, gi % 2 === 0 ? garlicWhiteMat : produceRedMat);
              bulbMesh.scale.set(0.85, 1.05, 0.85);
              bulbMesh.position.set(sx + gxOff, 2.3 - k * 0.14, q.cz + fs * 0.35);
              parent.add(bulbMesh);
            }
          });
          addPriceTag(sx, counterTopY + 0.28, frontEdgeZ - fs * 0.16, fs, 'NƯỚC MẮM', '55K/CHAI', '#92400e');
        } else {
          // CLOTHING & HOUSEHOLD STALL (QUẦN ÁO • NÓN LÁ • RỔ RÁ): Hanging colorful shirts + stacked Nón Lá + plastic basins!
          for (let sh = 0; sh < 6; sh++) {
            const shx = sx - stallW * 0.35 + (stallW * 0.7 * sh) / 5;
            const shMat = shirtClothMats[sh % shirtClothMats.length];
            addBox(0.025, 0.18, 0.025, p.chromeInoxMat, shx, 2.36, q.cz + fs * 0.35);
            addBox(0.36, 0.56, 0.09, shMat, shx, 2.02, q.cz + fs * 0.35);
            addBox(0.56, 0.18, 0.09, shMat, shx, 2.2, q.cz + fs * 0.35); // Shirt sleeves silhouette
          }
          // 2 Iconic stacks of Vietnamese Conical Hats (Nón Lá) on the counter!
          [-stallW * 0.26, -stallW * 0.04].forEach((nx) => {
            for (let nh = 0; nh < 4; nh++) {
              const hat = new THREE.Mesh(nonLaGeo, p.bambooMat);
              hat.position.set(sx + nx, counterTopY + 0.12 + nh * 0.09, displayZ + fs * 0.14);
              parent.add(hat);
            }
          });
          // Stacked colorful red/blue/green plastic basins on right side
          const tubMats = [p.plasticRedMat, p.plasticBlueMat, produceGreenMat];
          for (let tb = 0; tb < 3; tb++) {
            const tub = new THREE.Mesh(basinGeo, tubMats[tb]);
            tub.position.set(sx + stallW * 0.24, counterTopY + 0.12 + tb * 0.14, displayZ + fs * 0.14);
            parent.add(tub);
          }
          addPriceTag(sx + 0.1, counterTopY + 0.28, frontEdgeZ - fs * 0.16, fs, 'NÓN LÁ • ÁO', '45K/CÁI', '#6d28d9');
        }
      } else {
        // MARKET FOOD COURT (BÚN MẮM, MÌ QUẢNG, BÁNH XÈO, CHÈ, CÀ PHÊ CHỢ):
        if (si === 0 || si === 1) {
          // Glass display cabinet (Tủ Kính) with visible yellow Mì Quảng, white Bún, sliced pink chả lụa & green herbs!
          const cabX = sx - stallW * 0.18;
          addBox(1.38, 0.78, 0.72, p.glassMat, cabX, counterTopY + 0.39, displayZ + fs * 0.12);
          // Frame rails on glass cabinet
          addBox(1.42, 0.05, 0.76, p.chromeInoxMat, cabX, counterTopY + 0.79, displayZ + fs * 0.12);
          // Visible food inside cabinet: yellow noodles, pink chả lụa, green herbs
          const noodlePile = new THREE.Mesh(riceMoundGeo, si === 0 ? noodleYellowMat : riceWhiteMat);
          noodlePile.scale.set(0.85, 0.7, 0.85);
          noodlePile.position.set(cabX - 0.34, counterTopY + 0.14, displayZ + fs * 0.12);
          parent.add(noodlePile);
          addBox(0.28, 0.14, 0.36, chaLuaPinkMat, cabX + 0.05, counterTopY + 0.14, displayZ + fs * 0.12);
          const herbPile = new THREE.Mesh(riceMoundGeo, produceGreenMat);
          herbPile.scale.set(0.75, 0.65, 0.75);
          herbPile.position.set(cabX + 0.42, counterTopY + 0.14, displayZ + fs * 0.12);
          parent.add(herbPile);

          // 2 Big Stainless Steaming Broth Pots (Nồi Nước Lèo) with visible golden soup + chrome ladle!
          const pot1 = new THREE.Mesh(soupPotGeo, p.chromeInoxMat);
          pot1.position.set(sx + stallW * 0.2, counterTopY + 0.22, displayZ + fs * 0.1);
          parent.add(pot1);
          const soupTop = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.03, 12), brothGoldMat);
          soupTop.position.set(sx + stallW * 0.2, counterTopY + 0.43, displayZ + fs * 0.1);
          parent.add(soupTop);
          addBox(0.03, 0.45, 0.03, p.chromeInoxMat, sx + stallW * 0.26, counterTopY + 0.56, displayZ + fs * 0.1, [0, 0, -0.32]);

          const pot2 = new THREE.Mesh(soupPotGeo, p.chromeInoxMat);
          pot2.scale.set(0.84, 0.86, 0.84);
          pot2.position.set(sx + stallW * 0.38, counterTopY + 0.19, displayZ + fs * 0.1);
          parent.add(pot2);
          addPriceTag(sx - 0.1, counterTopY + 0.86, displayZ + fs * 0.46, fs, si === 0 ? 'BÚN MẮM • MÌ' : 'BÁNH XÈO', '35K/TÔ', '#9a3412');
        } else {
          // CHÈ THẬP CẨM & CÀ PHÊ CHỢ: Vivid colorful glass chè jars + blue trà đá cooler + iced coffee cups!
          const cheMats = [cheGreenMat, cheRubyMat, produceYellowMat, riceWhiteMat, produceOrangeMat];
          for (let cj = 0; cj < 5; cj++) {
            const cjx = sx - stallW * 0.34 + cj * 0.42;
            const bowl = new THREE.Mesh(bowlGeo, cheMats[cj]);
            bowl.scale.set(1.25, 1.5, 1.25);
            bowl.position.set(cjx, counterTopY + 0.12, displayZ + fs * 0.14);
            parent.add(bowl);
          }
          // Big insulated blue Trà Đá / Ice cooler jug
          const cooler = new THREE.Mesh(soupPotGeo, p.plasticBlueMat);
          cooler.scale.set(1.05, 1.22, 1.05);
          cooler.position.set(sx + stallW * 0.32, counterTopY + 0.28, displayZ + fs * 0.1);
          parent.add(cooler);
          const coolerLid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 12), counterTileWhiteMat);
          coolerLid.position.set(sx + stallW * 0.32, counterTopY + 0.56, displayZ + fs * 0.1);
          parent.add(coolerLid);
          addPriceTag(sx, counterTopY + 0.32, frontEdgeZ - fs * 0.16, fs, si === 2 ? 'CHÈ THẬP CẨM' : 'CÀ PHÊ SỮA', '15K/LY', '#0f766e');
        }

        // Low Market Food-Court Table + Bowls + 2 Plastic Stools right along the front counter edge (leaves >5m wide aisle!)
        if (si === 0 || si === 1 || si === 2) {
          const tblZ = frontEdgeZ + fs * 1.05;
          addBox(0.95, 0.05, 0.62, p.chromeInoxMat, sx, 0.62, tblZ);
          addBox(0.05, 0.52, 0.05, p.chromeInoxMat, sx - 0.38, 0.36, tblZ - 0.22);
          addBox(0.05, 0.52, 0.05, p.chromeInoxMat, sx + 0.38, 0.36, tblZ - 0.22);
          addBox(0.05, 0.52, 0.05, p.chromeInoxMat, sx - 0.38, 0.36, tblZ + 0.22);
          addBox(0.05, 0.52, 0.05, p.chromeInoxMat, sx + 0.38, 0.36, tblZ + 0.22);
          // Steaming noodle bowls on the table
          [-0.22, 0.22].forEach((bxOff) => {
            const b = new THREE.Mesh(bowlGeo, counterTileWhiteMat);
            b.position.set(sx + bxOff, 0.7, tblZ);
            parent.add(b);
            const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 8), brothGoldMat);
            broth.position.set(sx + bxOff, 0.75, tblZ);
            parent.add(broth);
          });
          // Red & Blue Vietnamese plastic stools
          const stool1 = new THREE.Mesh(stoolTopGeo, p.plasticRedMat);
          stool1.position.set(sx - 0.25, 0.28, tblZ + fs * 0.58);
          parent.add(stool1);
          const stool2 = new THREE.Mesh(stoolTopGeo, p.plasticBlueMat);
          stool2.position.set(sx + 0.32, 0.28, tblZ + fs * 0.58);
          parent.add(stool2);
          // Seated local resident eating right at the market food court!
          npcSeeds.push({
            x: sx - 0.25,
            z: tblZ + fs * 0.58,
            yaw: fs > 0 ? Math.PI : 0,
            role: 'seated',
            marketId: m.id,
          });
        }
      }

      // =====================================================================
      // MARKET VENDORS & DYNAMIC ROTATING STALL SHOPPER SPOTS
      // =====================================================================
      // Vendor behind stall (14 vendors per market covering fish, meat, rice, produce, flowers, spices & food!)
      if (si !== 3 || q.kind === 'seafood_meat' || q.kind === 'produce') {
        const vendorZ = backEdgeZ - fs * 0.68;
        npcSeeds.push({
          x: sx,
          z: vendorZ,
          yaw: fs > 0 ? 0 : Math.PI,
          role: 'vendor',
          marketId: m.id,
        });
      }

      // Register every single stall as an active customer stop for the dynamic rotating market shoppers!
      const isFoodTableStall = q.kind === 'food_court' && (si === 0 || si === 1 || si === 2);
      stallSpots.push({
        id: stallSpots.length,
        x: isFoodTableStall ? sx + 1.08 : sx + (si % 2 === 0 ? -0.35 : 0.35),
        z: frontEdgeZ + fs * (isFoodTableStall ? 0.92 : 0.88),
        faceYaw: fs > 0 ? Math.PI : 0,
        kind: q.kind,
        occupiedBy: null,
      });
    }
  });

  // 4 Open Gate Entry/Exit Nodes for Dynamic Market Shoppers entering & leaving!
  const gates: MarketGateExit[] = [
    {
      id: 'front',
      outX: L.cx,
      outZ: L.frontZ + dirFront * 4.2,
      inX: L.cx,
      inZ: L.frontZ - dirFront * 1.4,
      isHorizontal: false,
    },
    {
      id: 'rear',
      outX: L.cx,
      outZ: L.backZ - dirFront * 3.4,
      inX: L.cx,
      inZ: L.backZ + dirFront * 1.4,
      isHorizontal: false,
    },
    {
      id: 'west',
      outX: m.minX - 2.6,
      outZ: L.bodyCz,
      inX: m.minX + 2.2,
      inZ: L.bodyCz,
      isHorizontal: true,
    },
    {
      id: 'east',
      outX: m.maxX + 2.6,
      outZ: L.bodyCz,
      inX: m.maxX - 2.2,
      inZ: L.bodyCz,
      isHorizontal: true,
    },
  ];

  // -------------------------------------------------------------------------
  // 6. FRONT PLAZA: COVERED BÃI GIỮ XE CHỢ + OUTDOOR MORNING PARASOLS + FESTIVE LANTERNS
  // -------------------------------------------------------------------------
  const ps = L.parkingShelter;
  const parkW = ps.maxX - ps.minX;
  const parkD = ps.maxZ - ps.minZ;
  addBox(parkW, 0.14, parkD + 0.4, p.tealTinRoofMat, ps.cx, 2.86, ps.cz, [dirFront * 0.06, 0, 0]);
  [-parkW * 0.46, 0, parkW * 0.46].forEach((ox) => {
    [-parkD * 0.44, parkD * 0.44].forEach((oz) => {
      const slopeDy = oz * dirFront * 0.06;
      const postH = 2.74 - slopeDy;
      addBox(0.11, postH, 0.11, p.darkSteelMat, ps.cx + ox, 0.06 + postH * 0.5, ps.cz + oz);
    });
  });
  const parkTex = p.createSignTex('BÃI GIỮ XE CHỢ', '2.000Đ / LƯỢT • CÓ BẢO VỆ', {
    bg: '#1e3a8a',
    bg2: '#1d4ed8',
    border: '#fde047',
  });
  const parkSignMat = new THREE.MeshStandardMaterial({
    map: parkTex,
    emissive: 0xffffff,
    emissiveMap: parkTex,
    emissiveIntensity: 0.48,
  });
  p.neonMats.push(parkSignMat);
  const parkSign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.68), parkSignMat);
  parkSign.position.set(ps.cx, 3.18, ps.cz + dirFront * (parkD * 0.5 + 0.24));
  if (m.facingNorth) parkSign.rotation.y = Math.PI;
  parent.add(parkSign);

  // 5 resident motorbikes neatly parked under the shelter
  const bikeColors = [0xdc2626, 0x2563eb, 0xf8fafc, 0x16a34a, 0xeab308];
  for (let bi = 0; bi < 5; bi++) {
    shared.addMotorbike(
      parent,
      ps.minX + 1.5 + bi * 2.1,
      ps.cz,
      m.facingNorth ? 0 : Math.PI,
      bikeColors[bi % bikeColors.length]
    );
  }

  // East Front Apron: 3 Colorful Morning Umbrella Flower/Fruit Carts (pack up automatically when market closes at 18:00!)
  const outdoorCartsGroup = new THREE.Group();
  dynParent.add(outdoorCartsGroup);
  const addDynBox = (wB: number, hB: number, dB: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wB, hB, dB), mat);
    mesh.position.set(x, y, z);
    outdoorCartsGroup.add(mesh);
    return mesh;
  };
  const eastApronStart = L.cx + L.mainGateHalfW + 4.8;
  const eastApronEnd = m.maxX - 3.6;
  const umbrellaCount = 3;
  const umbrellaMats = [p.stripedAwningMat, p.greenAwningMat, p.plasticRedMat];
  for (let ui = 0; ui < umbrellaCount; ui++) {
    const ux = eastApronStart + ((eastApronEnd - eastApronStart) * ui) / (umbrellaCount - 1);
    const uz = ps.cz;
    addDynBox(0.08, 2.48, 0.08, p.darkSteelMat, ux, 1.3, uz);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.75, 0.65, 8), umbrellaMats[ui % umbrellaMats.length]);
    canopy.position.set(ux, 2.62, uz);
    outdoorCartsGroup.add(canopy);
    // Small display crate + visible fruit basket & flower bucket under umbrella
    addDynBox(1.5, 0.62, 0.85, p.woodMat, ux, 0.37, uz + dirFront * 0.3);
    const b1 = new THREE.Mesh(basketGeo, p.bambooMat);
    b1.scale.set(0.75, 0.8, 0.75);
    b1.position.set(ux - 0.38, 0.79, uz + dirFront * 0.3);
    outdoorCartsGroup.add(b1);
    const cartFruitMat = ui === 0 ? produceOrangeMat : ui === 1 ? produceRedMat : produceYellowMat;
    for (let fi = 0; fi < 5; fi++) {
      const ang = (fi / 4) * Math.PI * 2;
      const rad = fi === 4 ? 0 : 0.11;
      const fr = new THREE.Mesh(fruitSmallGeo, cartFruitMat);
      fr.position.set(
        ux - 0.38 + Math.cos(ang) * rad,
        fi === 4 ? 0.96 : 0.89,
        uz + dirFront * 0.3 + Math.sin(ang) * rad
      );
      outdoorCartsGroup.add(fr);
    }
    const vase = new THREE.Mesh(flowerVaseGeo, p.plasticBlueMat);
    vase.scale.set(0.85, 0.85, 0.85);
    vase.position.set(ux + 0.38, 0.84, uz + dirFront * 0.3);
    outdoorCartsGroup.add(vase);
    const cartBloomMat = ui === 0 ? flowerPinkMat : ui === 1 ? produceYellowMat : produceRedMat;
    for (let st = 0; st < 3; st++) {
      const ang = (st / 3) * Math.PI * 2;
      const sxOff = Math.cos(ang) * 0.08;
      const szOff = Math.sin(ang) * 0.08;
      addDynBox(0.025, 0.3, 0.025, leafDarkGreenMat, ux + 0.38 + sxOff, 1.08, uz + dirFront * 0.3 + szOff);
      const bloom = new THREE.Mesh(flowerHeadGeo, cartBloomMat);
      bloom.position.set(ux + 0.38 + sxOff, 1.24, uz + dirFront * 0.3 + szOff);
      outdoorCartsGroup.add(bloom);
    }
  }

  // Festive Red Lanterns flanking the front market walkway
  for (let li = -2; li <= 2; li++) {
    if (li === 0) continue;
    const lx = L.cx + li * 4.4;
    const lz = L.frontZ + dirFront * 1.4;
    const lan = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), lanternRedMat);
    lan.scale.set(1, 1.22, 1);
    lan.position.set(lx, 4.35, lz);
    parent.add(lan);
  }

  // Bright Road-Style Street Lamps flanking the Market Front Gate & Plaza
  const lampZ = m.facingNorth ? m.yardMinZ + 0.45 : m.yardMaxZ - 0.45;
  const lampPositions = [
    { x: m.minX + 3.0, z: lampZ },
    { x: L.cx - L.mainGateHalfW - 2.2, z: lampZ },
    { x: L.cx + L.mainGateHalfW + 2.2, z: lampZ },
    { x: m.maxX - 3.0, z: lampZ },
  ];
  lampPositions.forEach((lp) => {
    shared.addStreetLamp(lp.x, lp.z, 0, -dirFront, true);
  });

  // 2 Warm Interior PointLight Anchors per Market Hall
  const pointLightAnchors = [
    { x: L.cx - L.w * 0.22, y: 4.1, z: L.bodyCz, color: 0xffe4a0 },
    { x: L.cx + L.w * 0.22, y: 4.1, z: L.bodyCz, color: 0xffe4a0 },
  ];

  // Dynamic Open/Close Controller (07:00 - 18:00)
  let closedFactor = 0;
  let initialized = false;
  let lastOpenState: boolean | null = null;
  const updateMarketState = (dt: number, rawHour: number, lampFactor: number): number => {
    const isOpen = isResidentialMarketOpenAtHour(rawHour);
    const targetClosed = isOpen ? 0 : 1;
    if (!initialized) {
      closedFactor = targetClosed;
      initialized = true;
    } else {
      closedFactor += (targetClosed - closedFactor) * Math.min(1, dt * 2.2);
      if (Math.abs(targetClosed - closedFactor) < 0.004) closedFactor = targetClosed;
    }

    // Update all 4 corrugated rolling shutters
    for (let i = 0; i < shutters.length; i++) {
      const sh = shutters[i];
      const vis = closedFactor > 0.015;
      sh.mesh.visible = vis;
      if (vis) {
        const curH = Math.max(0.06, sh.fullH * closedFactor);
        sh.mesh.scale.y = curH / sh.fullH;
        sh.mesh.position.y = sh.topY - curH * 0.5;
      }
      if (sh.noticePlate) {
        sh.noticePlate.visible = closedFactor > 0.52;
      }
    }

    if (lastOpenState !== isOpen) {
      lastOpenState = isOpen;
      statusBanner.material = isOpen ? openStatusMat : closedStatusMat;
      outdoorCartsGroup.visible = isOpen;
    }

    // Interior market lights: warm & bright when open (07:00-18:00), dim security glow when closed!
    const openWeight = 1 - closedFactor;
    marketBulbMat.emissiveIntensity = openWeight * (1.25 + lampFactor * 2.6) + closedFactor * 0.14;
    marketClerestoryMat.emissiveIntensity = openWeight * (0.65 + lampFactor * 1.45) + closedFactor * 0.08;
    marketPoolMat.opacity = openWeight * (0.16 + lampFactor * 0.65);
    marketPoolMat.visible = openWeight > 0.05;

    return closedFactor;
  };

  const controller: MarketDynamicController = {
    marketId: m.id,
    cx: L.cx,
    bodyCz: L.bodyCz,
    minX: m.minX,
    maxX: m.maxX,
    frontZ: L.frontZ,
    backZ: L.backZ,
    dirFront,
    stallSpots,
    gates,
    updateMarketState,
    getClosedFactor: () => closedFactor,
  };

  return {
    lampSpots: lampPositions,
    npcSeeds,
    pointLightAnchors,
    controller,
  };
}
