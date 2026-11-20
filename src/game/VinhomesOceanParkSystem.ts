import * as THREE from 'three';
import {
  CITY_ROAD_BOUNDS,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import type { EastIntersectionCharacterHelpers } from './EastIntersectionSystem';
import type { IntersectionColliderBox, IntersectionSignalState } from './WestIntersectionSystem';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  type CityCarVariant,
} from './CityVehicleMeshBuilder';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import { buildAmbientXanhSmTaxiCar } from './XanhSmTaxiSystem';

export const VINHOMES_INTERSECTION_CENTER_X = 193.5;
export const VINHOMES_INTERSECTION_CENTER_Z = 148.0;
export const VINHOMES_CROSSROAD_MIN_X = 105.0;
export const VINHOMES_CROSSROAD_MAX_X = 238.0;
export const VINHOMES_MID_INTERSECTION_CENTER_X = 282.0;
export const VINHOMES_MID_CROSSROAD_MIN_X = 238.0;
export const VINHOMES_MID_CROSSROAD_MAX_X = 326.0;
export const VINHOMES2_INTERSECTION_CENTER_X = 370.0;
export const VINHOMES2_CROSSROAD_MIN_X = 326.0;
export const VINHOMES2_CROSSROAD_MAX_X = 403.25;
export const VINHOMES2B_INTERSECTION_CENTER_X = 436.5;
export const VINHOMES2B_CROSSROAD_MIN_X = 403.25;
export const VINHOMES2B_CROSSROAD_MAX_X = 469.75;
export const VINHOMES3_INTERSECTION_CENTER_X = 503.0;
export const VINHOMES3_CROSSROAD_MIN_X = 469.75;
export const VINHOMES3_CROSSROAD_MAX_X = 564.0;
export const VINHOMES_SHOPHOUSE_START_Z = 166.0;
export const VINHOMES_SHOPHOUSE_COUNT_PER_SIDE = 20;
export const VINHOMES_SHOPHOUSE_UNIT_WIDTH = 8.0;
export const VINHOMES_SHOPHOUSE_END_Z =
  VINHOMES_SHOPHOUSE_START_Z + VINHOMES_SHOPHOUSE_COUNT_PER_SIDE * VINHOMES_SHOPHOUSE_UNIT_WIDTH; // 326.0
export const VINHOMES_SOUTH_INTERSECTION_CENTER_Z = 344.0;
export const VINHOMES_SOUTH_END_Z = 428.0;
export const VINHOMES_CONNECT_EAST_TO_X = 251.05;
export const VINHOMES_MID_CONNECT_EAST_TO_X = 339.05;
export const VINHOMES2_CONNECT_EAST_TO_X = 405.55;
export const VINHOMES2B_CONNECT_EAST_TO_X = 472.05;

export interface VinhomesDistrictOptions {
  centerX?: number;
  crossroadMinX?: number;
  crossroadMaxX?: number;
  openWestEnd?: boolean;
  openWestCrossroadCaps?: boolean;
  openEastEnd?: boolean;
  closedNorthEnd?: boolean;
  connectEastToX?: number;
  northCrossSub?: string;
  southCrossSub?: string;
  nsStreetTitle?: string;
}

export interface VinhomesTrafficOptions {
  centerX?: number;
  idPrefix?: string;
  skipEwTraffic?: boolean;
  ewMinX?: number;
  ewMaxX?: number;
  nsMinZ?: number;
  extraEwIntersections?: Array<{
    centerX: number;
    getSignal: () => IntersectionSignalState;
  }>;
  extraNsIntersections?: Array<{
    centerZ: number;
    northStopZ: number;
    southStopZ: number;
    getSignal: () => IntersectionSignalState;
  }>;
}

export interface VinhomesAutoDoor {
  leftLeaf: THREE.Group;
  rightLeaf: THREE.Group;
  sensorMat: THREE.MeshStandardMaterial;
  worldX: number;
  worldZ: number;
  slideDirX: number;
  slideDirZ: number;
  baseLeftX: number;
  baseLeftZ: number;
  baseRightX: number;
  baseRightZ: number;
  openRatio: number;
}

export interface VinhomesOceanParkBuildResult {
  staticGroup: THREE.Group;
  dynamicGroup: THREE.Group;
  autoDoors: VinhomesAutoDoor[];
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  getSignalState: () => IntersectionSignalState;
  update: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
}

function buildVinhomesColliders(opts?: VinhomesDistrictOptions): IntersectionColliderBox[] {
  const cx = opts?.centerX ?? VINHOMES_INTERSECTION_CENTER_X;
  const dx = cx - VINHOMES_INTERSECTION_CENTER_X;
  const wx = (x: number) => x + dx;
  const ewMinX = opts?.crossroadMinX ?? wx(VINHOMES_CROSSROAD_MIN_X);
  const ewMaxX = opts?.crossroadMaxX ?? wx(VINHOMES_CROSSROAD_MAX_X);

  const cols: IntersectionColliderBox[] = [
    // 4 Traffic Light Gantry Corner Poles at North Ngã Tư (X = 184.3 & 202.7, Z = 138.8 & 157.2)
    { minX: wx(183.9), maxX: wx(184.7), minZ: 138.4, maxZ: 139.2, floor: 1 }, // NW Pole
    { minX: wx(202.3), maxX: wx(203.1), minZ: 138.4, maxZ: 139.2, floor: 1 }, // NE Pole
    { minX: wx(183.9), maxX: wx(184.7), minZ: 156.8, maxZ: 157.6, floor: 1 }, // SW Pole
    { minX: wx(202.3), maxX: wx(203.1), minZ: 156.8, maxZ: 157.6, floor: 1 }, // SE Pole

    // Crossroad North Sidewalk Outer Hedges (continuous T-junction cap when closedNorthEnd is true)
    ...(opts?.closedNorthEnd
      ? [{ minX: ewMinX, maxX: ewMaxX, minZ: 133.9, maxZ: 134.7, floor: 1 as const }]
      : [
          { minX: ewMinX, maxX: wx(179.6), minZ: 133.9, maxZ: 134.7, floor: 1 as const },
          { minX: wx(207.4), maxX: ewMaxX, minZ: 133.9, maxZ: 134.7, floor: 1 as const },
        ]),

    // Crossroad South Sidewalk Outer Hedges (omit on sides connected to an adjacent Vinhomes block so promenade flows continuously)
    ...(!opts?.openWestEnd
      ? [
          { minX: ewMinX, maxX: wx(160.0), minZ: 161.3, maxZ: 162.1, floor: 1 as const },
          { minX: wx(159.6), maxX: wx(160.4), minZ: 161.8, maxZ: 166.2, floor: 1 as const },
        ]
      : []),
    ...(!opts?.openEastEnd
      ? [
          { minX: wx(227.0), maxX: ewMaxX, minZ: 161.3, maxZ: 162.1, floor: 1 as const },
          { minX: wx(226.6), maxX: wx(227.4), minZ: 161.8, maxZ: 166.2, floor: 1 as const },
        ]
      : []),

    // Corner Unit 0 Rear Solid Core & Open 10.2m+ L-Shaped Café Perimeter (West: New DB Coffee, East: Starbucks)
    { minX: wx(162.2), maxX: wx(164.8), minZ: 171.2, maxZ: 174.0, floor: 1 },
    { minX: wx(162.2), maxX: wx(162.6), minZ: 166.0, maxZ: 174.0, floor: 1 },
    { minX: wx(162.4), maxX: wx(166.5), minZ: 165.85, maxZ: 166.2, floor: 1 },
    { minX: wx(168.3), maxX: wx(172.9), minZ: 165.85, maxZ: 166.2, floor: 1 },
    { minX: wx(174.75), maxX: wx(175.15), minZ: 168.2, maxZ: 173.85, floor: 1 },

    { minX: wx(222.2), maxX: wx(224.8), minZ: 171.2, maxZ: 174.0, floor: 1 },
    { minX: wx(224.4), maxX: wx(224.8), minZ: 166.0, maxZ: 174.0, floor: 1 },
    { minX: wx(220.5), maxX: wx(224.6), minZ: 165.85, maxZ: 166.2, floor: 1 },
    { minX: wx(214.1), maxX: wx(218.7), minZ: 165.85, maxZ: 166.2, floor: 1 },
    { minX: wx(211.85), maxX: wx(212.25), minZ: 168.2, maxZ: 173.85, floor: 1 },

    // Solid Rear Core Behind 10.2m Walkable Ground-Floor Interiors (Units 1..18)
    { minX: wx(162.2), maxX: wx(164.65), minZ: 174.0, maxZ: 318.0, floor: 1 },
    { minX: wx(222.35), maxX: wx(224.8), minZ: 174.0, maxZ: 318.0, floor: 1 },

    // Corner Unit 19 Rear Solid Core & Open 10.2m+ L-Shaped Flagship Perimeter (West: VINHOMES, East: BELLAGIO)
    { minX: wx(162.2), maxX: wx(164.8), minZ: 318.0, maxZ: 320.8, floor: 1 },
    { minX: wx(162.2), maxX: wx(162.6), minZ: 318.0, maxZ: 326.0, floor: 1 },
    { minX: wx(162.4), maxX: wx(169.15), minZ: 325.8, maxZ: 326.15, floor: 1 },
    { minX: wx(171.05), maxX: wx(172.9), minZ: 325.8, maxZ: 326.15, floor: 1 },
    { minX: wx(174.75), maxX: wx(175.15), minZ: 318.15, maxZ: 323.8, floor: 1 },

    { minX: wx(222.2), maxX: wx(224.8), minZ: 318.0, maxZ: 320.8, floor: 1 },
    { minX: wx(224.4), maxX: wx(224.8), minZ: 318.0, maxZ: 326.0, floor: 1 },
    { minX: wx(214.1), maxX: wx(215.95), minZ: 325.8, maxZ: 326.15, floor: 1 },
    { minX: wx(217.85), maxX: wx(224.6), minZ: 325.8, maxZ: 326.15, floor: 1 },
    { minX: wx(211.85), maxX: wx(212.25), minZ: 318.15, maxZ: 323.8, floor: 1 },

    // Corner & Mid-Block Sidewalk Bistro Café Tables (offset clear of center shop doorways!)
    { minX: wx(163.4), maxX: wx(165.0), minZ: 162.8, maxZ: 164.2, floor: 1 },
    { minX: wx(169.0), maxX: wx(170.6), minZ: 162.8, maxZ: 164.2, floor: 1 },
    { minX: wx(216.4), maxX: wx(218.0), minZ: 162.8, maxZ: 164.2, floor: 1 },
    { minX: wx(222.0), maxX: wx(223.6), minZ: 162.8, maxZ: 164.2, floor: 1 },
    { minX: wx(163.4), maxX: wx(165.0), minZ: 327.8, maxZ: 329.2, floor: 1 },
    { minX: wx(172.0), maxX: wx(173.6), minZ: 327.8, maxZ: 329.2, floor: 1 },
    { minX: wx(213.4), maxX: wx(215.0), minZ: 327.8, maxZ: 329.2, floor: 1 },
    { minX: wx(222.0), maxX: wx(223.6), minZ: 327.8, maxZ: 329.2, floor: 1 },
    { minX: wx(175.6), maxX: wx(177.4), minZ: 175.0, maxZ: 176.6, floor: 1 },
    { minX: wx(175.6), maxX: wx(177.4), minZ: 231.0, maxZ: 232.6, floor: 1 },
    { minX: wx(209.6), maxX: wx(211.4), minZ: 175.0, maxZ: 176.6, floor: 1 },
    { minX: wx(209.6), maxX: wx(211.4), minZ: 215.0, maxZ: 216.6, floor: 1 },
    { minX: wx(209.6), maxX: wx(211.4), minZ: 271.0, maxZ: 272.6, floor: 1 },

    // Parked Resident Scooter Apron Clusters (between unit doorways, clear of 5m walking corridor)
    { minX: wx(175.8), maxX: wx(177.4), minZ: 182.2, maxZ: 184.2, floor: 1 },
    { minX: wx(175.8), maxX: wx(177.4), minZ: 188.2, maxZ: 192.4, floor: 1 },
    { minX: wx(175.8), maxX: wx(177.4), minZ: 195.8, maxZ: 197.8, floor: 1 },
    { minX: wx(175.8), maxX: wx(177.4), minZ: 211.5, maxZ: 213.6, floor: 1 },
    { minX: wx(209.6), maxX: wx(211.2), minZ: 182.5, maxZ: 184.6, floor: 1 },
    { minX: wx(209.6), maxX: wx(211.2), minZ: 188.8, maxZ: 190.8, floor: 1 },
    { minX: wx(209.6), maxX: wx(211.2), minZ: 235.6, maxZ: 237.6, floor: 1 },

    // 4 Traffic Light Gantry Corner Poles at South Ngã 4 (X = 184.3 & 202.7, Z = 334.8 & 353.2)
    { minX: wx(183.9), maxX: wx(184.7), minZ: 334.4, maxZ: 335.2, floor: 1 }, // NW Pole
    { minX: wx(202.3), maxX: wx(203.1), minZ: 334.4, maxZ: 335.2, floor: 1 }, // NE Pole
    { minX: wx(183.9), maxX: wx(184.7), minZ: 352.8, maxZ: 353.6, floor: 1 }, // SW Pole
    { minX: wx(202.3), maxX: wx(203.1), minZ: 352.8, maxZ: 353.6, floor: 1 }, // SE Pole

    // South Crossroad North/South Outer Hedges (omit North-side hedges on connected East/West spans so South promenade flows continuously)
    ...(!opts?.openWestEnd
      ? [
          { minX: ewMinX, maxX: wx(160.0), minZ: 329.9, maxZ: 330.7, floor: 1 as const },
          { minX: wx(159.6), maxX: wx(160.4), minZ: 325.8, maxZ: 330.2, floor: 1 as const },
        ]
      : []),
    ...(!opts?.openEastEnd
      ? [
          { minX: wx(227.0), maxX: ewMaxX, minZ: 329.9, maxZ: 330.7, floor: 1 as const },
          { minX: wx(226.6), maxX: wx(227.4), minZ: 325.8, maxZ: 330.2, floor: 1 as const },
        ]
      : []),
    { minX: ewMinX, maxX: wx(180.0), minZ: 357.3, maxZ: 358.1, floor: 1 },
    { minX: wx(207.0), maxX: ewMaxX, minZ: 357.3, maxZ: 358.1, floor: 1 },

    // South Leg Sidewalk Outer Hedges & Terminal Cap (Z = 357.7 .. 428.0)
    { minX: wx(179.5), maxX: wx(180.3), minZ: 357.7, maxZ: 428.0, floor: 1 },
    { minX: wx(206.7), maxX: wx(207.5), minZ: 357.7, maxZ: 428.0, floor: 1 },
    { minX: wx(179.5), maxX: wx(207.5), minZ: 427.4, maxZ: 428.6, floor: 1 },

    // Shophouse Boulevard Planted Center Median Divider Islands (Z = 163.0..243.6 & 248.4..329.0, leaving Z=246 crosswalk open)
    { minX: wx(192.95), maxX: wx(194.05), minZ: 163.0, maxZ: 243.6, floor: 1 },
    { minX: wx(192.95), maxX: wx(194.05), minZ: 248.4, maxZ: 329.0, floor: 1 },

    // South Ngã 4 Welcome Architectural Totem Pillars (SW & SE corners, clear of sidewalks)
    { minX: wx(180.5), maxX: wx(181.9), minZ: 356.0, maxZ: 357.4, floor: 1 },
    { minX: wx(205.1), maxX: wx(206.5), minZ: 356.0, maxZ: 357.4, floor: 1 },
  ];

  // East-West Crossroad End Boundaries (only cap sides that do not join an adjacent district or residential link)
  if (!opts?.openWestEnd && !opts?.openWestCrossroadCaps) {
    cols.push({ minX: ewMinX - 0.8, maxX: ewMinX + 0.3, minZ: 134.0, maxZ: 162.0, floor: 1 });
    cols.push({ minX: ewMinX - 0.8, maxX: ewMinX + 0.3, minZ: 330.0, maxZ: 358.0, floor: 1 });
  }
  if (!opts?.openEastEnd) {
    cols.push({ minX: ewMaxX - 0.3, maxX: ewMaxX + 0.8, minZ: 134.0, maxZ: 162.0, floor: 1 });
    cols.push({ minX: ewMaxX - 0.3, maxX: ewMaxX + 0.8, minZ: 330.0, maxZ: 358.0, floor: 1 });
  }

  // Partition walls & storefront window piers leaving 1.7m open double-doors on all Units 1..18 (both rows)
  for (let i = 1; i < VINHOMES_SHOPHOUSE_COUNT_PER_SIDE - 1; i++) {
    const startZ = VINHOMES_SHOPHOUSE_START_Z + i * VINHOMES_SHOPHOUSE_UNIT_WIDTH;
    const cz = startZ + VINHOMES_SHOPHOUSE_UNIT_WIDTH * 0.5;
    // West Row divider + front piers (1.7m doorway at cz ± 0.85, 10.2m deep)
    cols.push({ minX: wx(164.6), maxX: wx(175.05), minZ: startZ - 0.18, maxZ: startZ + 0.18, floor: 1 });
    cols.push({ minX: wx(174.75), maxX: wx(175.15), minZ: startZ + 0.12, maxZ: cz - 0.85, floor: 1 });
    cols.push({ minX: wx(174.75), maxX: wx(175.15), minZ: cz + 0.85, maxZ: startZ + VINHOMES_SHOPHOUSE_UNIT_WIDTH - 0.12, floor: 1 });
    // East Row divider + front piers (10.2m deep)
    cols.push({ minX: wx(211.95), maxX: wx(222.4), minZ: startZ - 0.18, maxZ: startZ + 0.18, floor: 1 });
    cols.push({ minX: wx(211.85), maxX: wx(212.25), minZ: startZ + 0.12, maxZ: cz - 0.85, floor: 1 });
    cols.push({ minX: wx(211.85), maxX: wx(212.25), minZ: cz + 0.85, maxZ: startZ + VINHOMES_SHOPHOUSE_UNIT_WIDTH - 0.12, floor: 1 });
  }
  // Partition wall between Unit 18 and South Corner Unit 19 at Z = 318.0
  const southCornerStartZ = VINHOMES_SHOPHOUSE_END_Z - VINHOMES_SHOPHOUSE_UNIT_WIDTH;
  cols.push({ minX: wx(164.6), maxX: wx(175.05), minZ: southCornerStartZ - 0.18, maxZ: southCornerStartZ + 0.18, floor: 1 });
  cols.push({ minX: wx(211.95), maxX: wx(222.4), minZ: southCornerStartZ - 0.18, maxZ: southCornerStartZ + 0.18, floor: 1 });

  // Connecting Shophouse Rows bridging the North (Z = 166.0..178.4) and South (Z = 313.6..326.0) gaps to the next Vinhomes block
  if (opts?.connectEastToX && opts.connectEastToX > wx(224.45) + 1.5) {
    const gapStartX = wx(224.45);
    const gapEndX = opts.connectEastToX;
    const gapSpan = gapEndX - gapStartX;
    const unitCount = Math.max(1, Math.round(gapSpan / 8.5));
    const unitW = gapSpan / unitCount;
    // Solid rear walls behind 10.2m walk-in interiors
    cols.push({ minX: gapStartX, maxX: gapEndX, minZ: 176.2, maxZ: 178.4, floor: 1 });
    cols.push({ minX: gapStartX, maxX: gapEndX, minZ: 313.6, maxZ: 315.8, floor: 1 });
    for (let u = 0; u < unitCount; u++) {
      const x0 = gapStartX + u * unitW;
      const x1 = x0 + unitW;
      const ux = (x0 + x1) * 0.5;
      // North connecting unit front piers (1.76m open doorway at ux ± 0.88)
      cols.push({ minX: x0 + 0.08, maxX: ux - 0.88, minZ: 165.85, maxZ: 166.2, floor: 1 });
      cols.push({ minX: ux + 0.88, maxX: x1 - 0.08, minZ: 165.85, maxZ: 166.2, floor: 1 });
      // South connecting unit front piers (1.76m open doorway at ux ± 0.88)
      cols.push({ minX: x0 + 0.08, maxX: ux - 0.88, minZ: 325.8, maxZ: 326.15, floor: 1 });
      cols.push({ minX: ux + 0.88, maxX: x1 - 0.08, minZ: 325.8, maxZ: 326.15, floor: 1 });
      if (u > 0) {
        cols.push({ minX: x0 - 0.16, maxX: x0 + 0.16, minZ: 166.0, maxZ: 176.25, floor: 1 });
        cols.push({ minX: x0 - 0.16, maxX: x0 + 0.16, minZ: 315.75, maxZ: 326.0, floor: 1 });
      }
    }
  }

  return cols;
}

export const VINHOMES_COLLIDERS: IntersectionColliderBox[] = buildVinhomesColliders({
  openWestCrossroadCaps: true,
  openEastEnd: true,
  connectEastToX: VINHOMES_CONNECT_EAST_TO_X,
});
export const VINHOMES_MID_COLLIDERS: IntersectionColliderBox[] = buildVinhomesColliders({
  centerX: VINHOMES_MID_INTERSECTION_CENTER_X,
  crossroadMinX: VINHOMES_MID_CROSSROAD_MIN_X,
  crossroadMaxX: VINHOMES_MID_CROSSROAD_MAX_X,
  openWestEnd: true,
  openEastEnd: true,
  closedNorthEnd: true,
  connectEastToX: VINHOMES_MID_CONNECT_EAST_TO_X,
});
export const VINHOMES2_COLLIDERS: IntersectionColliderBox[] = buildVinhomesColliders({
  centerX: VINHOMES2_INTERSECTION_CENTER_X,
  crossroadMinX: VINHOMES2_CROSSROAD_MIN_X,
  crossroadMaxX: VINHOMES2_CROSSROAD_MAX_X,
  openWestEnd: true,
  openEastEnd: true,
  connectEastToX: VINHOMES2_CONNECT_EAST_TO_X,
});
export const VINHOMES2B_COLLIDERS: IntersectionColliderBox[] = buildVinhomesColliders({
  centerX: VINHOMES2B_INTERSECTION_CENTER_X,
  crossroadMinX: VINHOMES2B_CROSSROAD_MIN_X,
  crossroadMaxX: VINHOMES2B_CROSSROAD_MAX_X,
  openWestEnd: true,
  openEastEnd: true,
  closedNorthEnd: true,
  connectEastToX: VINHOMES2B_CONNECT_EAST_TO_X,
});
export const VINHOMES3_COLLIDERS: IntersectionColliderBox[] = buildVinhomesColliders({
  centerX: VINHOMES3_INTERSECTION_CENTER_X,
  crossroadMinX: VINHOMES3_CROSSROAD_MIN_X,
  crossroadMaxX: VINHOMES3_CROSSROAD_MAX_X,
  openWestEnd: true,
});

type BrandLogoKind =
  | 'db_coffee'
  | 'highlands'
  | 'mixue'
  | 'winmart'
  | 'techcombank'
  | 'pharmacity'
  | 'uniqlo'
  | 'gogi'
  | 'coffeehouse'
  | 'guardian'
  | 'pizza4ps'
  | 'vinfast'
  | 'gongcha'
  | 'lotteria'
  | 'concung'
  | 'adidas'
  | 'haidilao'
  | 'vietinbank'
  | 'touslesjours'
  | 'vinhomes'
  | 'starbucks'
  | 'katinat'
  | 'circlek'
  | 'phuclong'
  | 'manwah'
  | 'muji'
  | 'phela'
  | 'bidv'
  | 'kfc'
  | 'jollibee'
  | 'dookki'
  | 'nike'
  | 'sephora'
  | 'trungnguyen'
  | 'kingbbq'
  | 'mbbank'
  | 'parisbaguette'
  | 'locknlock'
  | 'auraspa'
  | 'bellagio';

type ShophouseInteriorType = 'cafe' | 'fnb' | 'retail' | 'fashion' | 'bank' | 'showroom';

interface ShophouseBrandSpec {
  name: string;
  sub: string;
  bg: string;
  accent: string;
  badgeColor: string;
  logo: BrandLogoKind;
  interior: ShophouseInteriorType;
}

const SHOP_SIGN_BRANDS: ShophouseBrandSpec[] = [
  // West Row (0..19)
  { name: 'NEW DB COFFEE', sub: 'SPECIALTY ROASTERY & TEA', bg: '#1e222b', accent: '#fde047', badgeColor: '#b45309', logo: 'db_coffee', interior: 'cafe' },
  { name: 'HIGHLANDS COFFEE', sub: 'CÀ PHÊ PHIN • TRÀ SEN VÀNG', bg: '#b22830', accent: '#fff7ed', badgeColor: '#7f1d1d', logo: 'highlands', interior: 'cafe' },
  { name: 'MIXUE', sub: 'ICE CREAM & MILK TEA', bg: '#e60012', accent: '#ffffff', badgeColor: '#ffffff', logo: 'mixue', interior: 'cafe' },
  { name: 'WINMART+', sub: 'TƯƠI NGON THƯỢNG HẠNG', bg: '#d91e2a', accent: '#ffffff', badgeColor: '#facc15', logo: 'winmart', interior: 'retail' },
  { name: 'TECHCOMBANK', sub: 'VƯỢT TRỘI HƠN MỖI NGÀY', bg: '#111827', accent: '#ffffff', badgeColor: '#ee0033', logo: 'techcombank', interior: 'bank' },
  { name: 'PHARMACITY', sub: 'NHÀ THUỐC TIỆN LỢI 24/7', bg: '#14532d', accent: '#86efac', badgeColor: '#5cb83c', logo: 'pharmacity', interior: 'retail' },
  { name: 'UNIQLO', sub: 'LIFEWEAR • TOKYO', bg: '#1f2937', accent: '#ffffff', badgeColor: '#ff0000', logo: 'uniqlo', interior: 'fashion' },
  { name: 'GOGI HOUSE', sub: 'QUÁN THỊT NƯỚNG HÀN QUỐC', bg: '#18181b', accent: '#fbbf24', badgeColor: '#e11d48', logo: 'gogi', interior: 'fnb' },
  { name: 'THE COFFEE HOUSE', sub: 'NHÀ CÀ PHÊ • SIGNATURE', bg: '#261a14', accent: '#fb923c', badgeColor: '#ea7a26', logo: 'coffeehouse', interior: 'cafe' },
  { name: 'GUARDIAN', sub: 'HEALTH & BEAUTY STORE', bg: '#c2410c', accent: '#ffffff', badgeColor: '#f97316', logo: 'guardian', interior: 'retail' },
  { name: "PIZZA 4P'S", sub: 'WOOD-FIRED ARTISAN PIZZA', bg: '#1c1917', accent: '#fef3c7', badgeColor: '#d97706', logo: 'pizza4ps', interior: 'fnb' },
  { name: 'VINFAST', sub: 'SHOWROOM XE ĐIỆN THÔNG MINH', bg: '#0b1b3b', accent: '#e2e8f0', badgeColor: '#38bdf8', logo: 'vinfast', interior: 'showroom' },
  { name: 'GONG CHA', sub: 'ROYAL MILK TEA • FOAM', bg: '#7f1d1d', accent: '#fef08a', badgeColor: '#9e1b32', logo: 'gongcha', interior: 'cafe' },
  { name: 'LOTTERIA', sub: 'BURGERS • CRISPY CHICKEN', bg: '#be123c', accent: '#fde047', badgeColor: '#f59e0b', logo: 'lotteria', interior: 'fnb' },
  { name: 'CON CƯNG', sub: 'MẸ BẦU & EM BÉ', bg: '#9d174d', accent: '#fbcfe8', badgeColor: '#ec4899', logo: 'concung', interior: 'retail' },
  { name: 'ADIDAS', sub: 'ORIGINALS & PERFORMANCE', bg: '#09090b', accent: '#ffffff', badgeColor: '#f8fafc', logo: 'adidas', interior: 'fashion' },
  { name: 'HAIDILAO', sub: 'LẨU TỨ XUYÊN • DỊCH VỤ VIP', bg: '#881337', accent: '#fde047', badgeColor: '#ef4444', logo: 'haidilao', interior: 'fnb' },
  { name: 'VIETINBANK', sub: 'NÂNG GIÁ TRỊ CUỘC SỐNG', bg: '#0c3b75', accent: '#ffffff', badgeColor: '#ef4444', logo: 'vietinbank', interior: 'bank' },
  { name: 'TOUS LES JOURS', sub: 'ARTISAN FRENCH BAKERY', bg: '#14452f', accent: '#fef3c7', badgeColor: '#ca8a04', logo: 'touslesjours', interior: 'cafe' },
  { name: 'VINHOMES', sub: 'SÀN GIAO DỊCH BĐS OCEAN PARK', bg: '#064e3b', accent: '#fde047', badgeColor: '#fbbf24', logo: 'vinhomes', interior: 'bank' },

  // East Row (20..39)
  { name: 'STARBUCKS', sub: 'RESERVE • COFFEE & BAKERY', bg: '#00563b', accent: '#ffffff', badgeColor: '#00704a', logo: 'starbucks', interior: 'cafe' },
  { name: 'KATINAT', sub: 'COFFEE & TEA HOUSE', bg: '#0f3d3e', accent: '#e6c27a', badgeColor: '#134e4a', logo: 'katinat', interior: 'cafe' },
  { name: 'CIRCLE K', sub: 'OPEN 24 HOURS • CONVENIENCE', bg: '#b91c1c', accent: '#ffffff', badgeColor: '#f97316', logo: 'circlek', interior: 'retail' },
  { name: 'PHÚC LONG', sub: 'HERITAGE TEA & COFFEE', bg: '#00562d', accent: '#fde68a', badgeColor: '#16a34a', logo: 'phuclong', interior: 'cafe' },
  { name: 'MANWAH', sub: 'TAIWANESE HOT POT', bg: '#691414', accent: '#fcd34d', badgeColor: '#b91c1c', logo: 'manwah', interior: 'fnb' },
  { name: 'MUJI', sub: 'MINIMALIST HOME & LIFESTYLE', bg: '#6e0015', accent: '#ffffff', badgeColor: '#991b1b', logo: 'muji', interior: 'fashion' },
  { name: 'PHÊ LA', sub: 'NỐT HƯƠNG ĐẶC SẢN • Ô LONG', bg: '#451a03', accent: '#fed7aa', badgeColor: '#9a3412', logo: 'phela', interior: 'cafe' },
  { name: 'BIDV', sub: 'PHÒNG GIAO DỊCH OCEAN PARK', bg: '#005855', accent: '#fde047', badgeColor: '#eab308', logo: 'bidv', interior: 'bank' },
  { name: 'KFC', sub: "IT'S FINGER LICKIN' GOOD", bg: '#b91c1c', accent: '#ffffff', badgeColor: '#e4002b', logo: 'kfc', interior: 'fnb' },
  { name: 'JOLLIBEE', sub: 'GÀ GIÒN VUI VẺ', bg: '#be123c', accent: '#fef08a', badgeColor: '#facc15', logo: 'jollibee', interior: 'fnb' },
  { name: 'DOOKKI', sub: 'BUFFET TOPOKKI HÀN QUỐC', bg: '#9a3412', accent: '#fef08a', badgeColor: '#ea580c', logo: 'dookki', interior: 'fnb' },
  { name: 'NIKE', sub: 'RUNNING • SPORTSWEAR', bg: '#09090b', accent: '#ffffff', badgeColor: '#f8fafc', logo: 'nike', interior: 'fashion' },
  { name: 'SEPHORA', sub: 'BEAUTY • FRAGRANCE • SKINCARE', bg: '#09090b', accent: '#ffffff', badgeColor: '#f43f5e', logo: 'sephora', interior: 'fashion' },
  { name: 'TRUNG NGUYÊN', sub: 'LEGEND • CÀ PHÊ NĂNG LƯỢNG', bg: '#171717', accent: '#facc15', badgeColor: '#b45309', logo: 'trungnguyen', interior: 'cafe' },
  { name: 'KING BBQ', sub: 'VUA NƯỚNG HÀN QUỐC', bg: '#450a0a', accent: '#fde047', badgeColor: '#dc2626', logo: 'kingbbq', interior: 'fnb' },
  { name: 'MB BANK', sub: 'NGÂN HÀNG QUÂN ĐỘI • 24/7', bg: '#1e3a8a', accent: '#ffffff', badgeColor: '#ef4444', logo: 'mbbank', interior: 'bank' },
  { name: 'PARIS BAGUETTE', sub: 'FRENCH CAFÉ & PATISSERIE', bg: '#172554', accent: '#fef3c7', badgeColor: '#3b82f6', logo: 'parisbaguette', interior: 'cafe' },
  { name: 'LOCK&LOCK', sub: 'SMART LIVING & KITCHENWARE', bg: '#0c4a6e', accent: '#e0f2fe', badgeColor: '#0284c7', logo: 'locknlock', interior: 'retail' },
  { name: 'AURA SPA', sub: 'WELLNESS & AESTHETIC CLINIC', bg: '#134e4a', accent: '#99f6e4', badgeColor: '#14b8a6', logo: 'auraspa', interior: 'bank' },
  { name: 'BELLAGIO', sub: 'ARTISAN GELATO & DESSERT', bg: '#3b0764', accent: '#fbcfe8', badgeColor: '#a855f7', logo: 'bellagio', interior: 'cafe' },
];

function drawBrandEmblem(
  ctx: CanvasRenderingContext2D,
  logo: BrandLogoKind,
  cx: number,
  cy: number,
  accent: string,
  badgeColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);

  if (logo === 'starbucks') {
    ctx.fillStyle = '#00704a';
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Stylized crown + star siren mark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(7, -11);
    ctx.lineTo(18, -15);
    ctx.lineTo(12, -2);
    ctx.lineTo(-12, -2);
    ctx.lineTo(-18, -15);
    ctx.lineTo(-7, -11);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 12, 13, 0, Math.PI * 2);
    ctx.fill();
  } else if (logo === 'highlands') {
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff7ed';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Mountain & river wave inside coffee bean oval
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-24, 6);
    ctx.lineTo(-8, -10);
    ctx.lineTo(8, 6);
    ctx.lineTo(22, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-22, 14);
    ctx.quadraticCurveTo(0, 20, 22, 12);
    ctx.stroke();
  } else if (logo === 'mixue') {
    // Snow King mascot circle + yellow crown + cheerful snowman
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 6, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15'; // Crown
    ctx.beginPath();
    ctx.moveTo(-16, -20);
    ctx.lineTo(-10, -34);
    ctx.lineTo(0, -24);
    ctx.lineTo(10, -34);
    ctx.lineTo(16, -20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(-9, 1, 3.2, 0, Math.PI * 2);
    ctx.arc(9, 1, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (logo === 'winmart') {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d91e2a';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W+', 0, 2);
  } else if (logo === 'techcombank') {
    // Interlocking red diamond squares
    ctx.fillStyle = '#ee0033';
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-24, -24, 30, 30);
    ctx.fillRect(-6, -6, 30, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  } else if (logo === 'pharmacity') {
    ctx.fillStyle = '#5cb83c';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8, -22, 16, 44);
    ctx.fillRect(-22, -8, 44, 16);
  } else if (logo === 'circlek') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#cf2a0e';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K', 2, 2);
  } else if (logo === 'uniqlo' || logo === 'muji') {
    ctx.fillStyle = badgeColor;
    ctx.fillRect(-32, -32, 64, 64);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-32, -32, 64, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(logo === 'uniqlo' ? 'UNI' : 'MUJI', 0, logo === 'uniqlo' ? -10 : 0);
    if (logo === 'uniqlo') ctx.fillText('QLO', 0, 14);
  } else if (logo === 'nike') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.quadraticCurveTo(-18, 22, 34, -14);
    ctx.stroke();
  } else if (logo === 'adidas') {
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 3; s++) {
      ctx.save();
      ctx.translate(-12 + s * 13, 12);
      ctx.rotate(-0.45);
      ctx.fillRect(-4, -(14 + s * 9), 8, 14 + s * 9);
      ctx.restore();
    }
  } else if (logo === 'vinfast' || logo === 'vinhomes') {
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-26, -20);
    ctx.lineTo(0, 22);
    ctx.lineTo(26, -20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, -20);
    ctx.lineTo(0, 4);
    ctx.lineTo(14, -20);
    ctx.stroke();
  } else if (logo === 'bidv' || logo === 'auraspa' || logo === 'phuclong') {
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    for (let p = 0; p < 5; p++) {
      ctx.save();
      ctx.rotate((p * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -14, 7, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Sleek circular heritage crest with emblem letter
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = '900 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (logo === 'katinat') {
      // Geometric luxury diamond emblem with gold K
      ctx.strokeStyle = '#e6c27a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(36, 0);
      ctx.lineTo(0, 36);
      ctx.lineTo(-36, 0);
      ctx.closePath();
      ctx.fillStyle = '#0f3d3e';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e6c27a';
      ctx.font = '900 36px Georgia, serif';
      ctx.fillText('K', 0, 2);
    } else if (logo === 'gogi' || logo === 'kingbbq' || logo === 'manwah' || logo === 'haidilao') {
      // Stylized flame / imperial lotus emblem
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.quadraticCurveTo(18, -6, 12, 16);
      ctx.quadraticCurveTo(0, 24, -12, 16);
      ctx.quadraticCurveTo(-18, -6, 0, -24);
      ctx.fill();
      ctx.fillStyle = badgeColor;
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.fillText(logo === 'haidilao' ? 'Hi' : logo === 'manwah' ? 'M' : 'BBQ', 0, 5);
    } else if (logo === 'coffeehouse' || logo === 'phela' || logo === 'trungnguyen' || logo === 'db_coffee') {
      // Warm steaming coffee cup crest
      ctx.fillStyle = accent;
      ctx.fillRect(-16, -8, 32, 22);
      ctx.beginPath();
      ctx.arc(0, 14, 16, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(16, 2, 7, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, -15);
      ctx.quadraticCurveTo(-10, -22, -4, -27);
      ctx.moveTo(5, -15);
      ctx.quadraticCurveTo(2, -22, 8, -27);
      ctx.stroke();
    } else if (logo === 'gongcha' || logo === 'touslesjours' || logo === 'parisbaguette' || logo === 'bellagio') {
      // Artisan crown / bakery crest
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-18, 12);
      ctx.lineTo(-22, -12);
      ctx.lineTo(-9, -2);
      ctx.lineTo(0, -18);
      ctx.lineTo(9, -2);
      ctx.lineTo(22, -12);
      ctx.lineTo(18, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-18, 15, 36, 5);
    } else if (logo === 'sephora') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.quadraticCurveTo(18, -8, 0, 28);
      ctx.quadraticCurveTo(-18, -8, 0, -28);
      ctx.fill();
    } else {
      const glyph =
        logo === 'pizza4ps'
          ? '4P'
          : logo === 'mbbank'
            ? '★'
            : logo === 'kfc'
              ? 'KFC'
              : logo === 'jollibee'
                ? 'J'
                : logo === 'lotteria'
                  ? 'L'
                  : logo === 'dookki'
                    ? 'DK'
                    : logo === 'vietinbank'
                      ? 'VB'
                      : logo === 'concung'
                        ? 'CC'
                        : logo === 'guardian'
                          ? 'G'
                          : logo === 'locknlock'
                            ? 'L&L'
                            : '★';
      ctx.fillText(glyph, 0, 2);
    }
  }

  ctx.restore();
}

function drawLuxurySignTile(
  ctx: CanvasRenderingContext2D,
  b: ShophouseBrandSpec,
  x0: number,
  y0: number,
  cellW: number,
  cellH: number
) {
  // Deep satin gradient backdrop + warm center spotlight sheen
  const grad = ctx.createLinearGradient(x0, y0, x0, y0 + cellH);
  grad.addColorStop(0, '#090d14');
  grad.addColorStop(0.18, b.bg);
  grad.addColorStop(0.82, b.bg);
  grad.addColorStop(1, '#070a10');
  ctx.fillStyle = grad;
  ctx.fillRect(x0, y0, cellW, cellH);

  const glow = ctx.createRadialGradient(
    x0 + cellW * 0.54,
    y0 + cellH * 0.5,
    18,
    x0 + cellW * 0.54,
    y0 + cellH * 0.5,
    cellW * 0.44
  );
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x0, y0, cellW, cellH);

  // Double luxury architectural frame + corner highlight brackets
  ctx.strokeStyle = b.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(x0 + 10, y0 + 10, cellW - 20, cellH - 20);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0 + 20, y0 + 20, cellW - 40, cellH - 40);

  // Left Emblem Medallion Bay (1:1 aspect -> zero oval squashing!)
  const logoCx = x0 + 210;
  const logoCy = y0 + cellH * 0.5;
  ctx.save();
  ctx.translate(logoCx, logoCy);
  ctx.scale(1.85, 1.85);
  drawBrandEmblem(ctx, b.logo, 0, 0, b.accent, b.badgeColor);
  ctx.restore();

  // Thin vertical architectural divider rule
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(x0 + 360, y0 + 34, 3, cellH - 68);

  // Crisp Embossed Brand Title + Architectural Subtitle
  const textX = x0 + cellW * 0.58;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const titleFontSize = b.name.length > 14 ? 76 : b.name.length > 10 ? 88 : 98;
  const titleFamily =
    b.interior === 'fashion' || b.logo === 'katinat' || b.logo === 'pizza4ps'
      ? 'Georgia, "Times New Roman", serif'
      : 'system-ui, -apple-system, sans-serif';
  ctx.font = `900 ${titleFontSize}px ${titleFamily}`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillText(b.name, textX + 3, y0 + cellH * 0.39 + 4);
  ctx.fillStyle = b.accent;
  ctx.fillText(b.name, textX, y0 + cellH * 0.39);

  // Accent horizontal rule under title
  ctx.fillStyle = b.accent;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(textX - 240, y0 + cellH * 0.61, 480, 2);
  ctx.globalAlpha = 1.0;

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 32px system-ui, -apple-system, sans-serif';
  ctx.fillText(b.sub, textX, y0 + cellH * 0.77);

  // Subtle decorative architectural accent bars on far right
  ctx.fillStyle = b.accent;
  ctx.globalAlpha = 0.4;
  ctx.fillRect(x0 + cellW - 76, y0 + 52, 22, 6);
  ctx.fillRect(x0 + cellW - 64, y0 + cellH - 58, 10, 6);
  ctx.globalAlpha = 1.0;
}

function createShopSignAtlasTextures(): [THREE.CanvasTexture, THREE.CanvasTexture] {
  // 2 atlases (2 cols x 10 rows each = 20 brands/atlas). Cell = 2048 x 204.8 = exact 10:1 unstretched aspect!
  const cols = 2;
  const rows = 10;
  const cellW = 2048;
  const cellH = 204.8;
  const atlases: THREE.CanvasTexture[] = [];

  for (let half = 0; half < 2; half++) {
    const c = document.createElement('canvas');
    c.width = cols * cellW;
    c.height = 2048;
    const ctx = c.getContext('2d')!;
    for (let localIdx = 0; localIdx < 20; localIdx++) {
      const b = SHOP_SIGN_BRANDS[half * 20 + localIdx];
      const col = localIdx % cols;
      const row = Math.floor(localIdx / cols);
      drawLuxurySignTile(ctx, b, col * cellW, row * cellH, cellW, cellH);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    atlases.push(tex);
  }
  return [atlases[0], atlases[1]];
}

function createBladeSignAtlasTexture(): THREE.CanvasTexture {
  // 4 cols x 10 rows = 40 crisp 1:1 square logo medallions (256 x 256 per tile)
  const cols = 4;
  const rows = 10;
  const cell = 256;
  const c = document.createElement('canvas');
  c.width = cols * cell;
  c.height = rows * cell;
  const ctx = c.getContext('2d')!;

  SHOP_SIGN_BRANDS.forEach((b, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x0 = col * cell;
    const y0 = row * cell;
    ctx.fillStyle = b.bg;
    ctx.fillRect(x0, y0, cell, cell);
    ctx.strokeStyle = b.accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(x0 + 10, y0 + 10, cell - 20, cell - 20);
    ctx.save();
    ctx.translate(x0 + cell * 0.5, y0 + cell * 0.5);
    ctx.scale(2.15, 2.15);
    drawBrandEmblem(ctx, b.logo, 0, 0, b.accent, b.badgeColor);
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createUpperWindowCurtainTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  // Soft cool architectural frosted glass base (opaque RGB so material.opacity controls exact translucency)
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#cfe5fa');
  grad.addColorStop(0.5, '#e2effa');
  grad.addColorStop(1, '#c6dcf2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle frosted diagonal glass reflections so upper windows clearly read as real glazed glass
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(106, 0);
  ctx.lineTo(40, 256);
  ctx.lineTo(0, 256);
  ctx.lineTo(0, 96);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.beginPath();
  ctx.moveTo(136, 0);
  ctx.lineTo(176, 0);
  ctx.lineTo(110, 256);
  ctx.lineTo(70, 256);
  ctx.closePath();
  ctx.fill();

  // Gentle frosted perimeter vignette
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createVinhomesTurnArrowTex(type: 'straight' | 'straight_left' | 'straight_right'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(114, 70, 28, 150);
  ctx.beginPath();
  ctx.moveTo(128, 22);
  ctx.lineTo(176, 86);
  ctx.lineTo(80, 86);
  ctx.closePath();
  ctx.fill();

  if (type === 'straight_left') {
    ctx.beginPath();
    ctx.moveTo(114, 150);
    ctx.lineTo(66, 150);
    ctx.lineTo(66, 126);
    ctx.lineTo(26, 162);
    ctx.lineTo(66, 198);
    ctx.lineTo(66, 174);
    ctx.lineTo(114, 174);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'straight_right') {
    ctx.beginPath();
    ctx.moveTo(142, 150);
    ctx.lineTo(190, 150);
    ctx.lineTo(190, 126);
    ctx.lineTo(230, 162);
    ctx.lineTo(190, 198);
    ctx.lineTo(190, 174);
    ctx.lineTo(142, 174);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createVinhomesStreetSignTex(title: string, sub: string, bg = '#065f46'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, sans-serif';
  ctx.fillText(title, 256, 56);
  ctx.fillStyle = '#fde047';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(sub, 256, 114);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}


function createVinhomesGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 243, 196, 0.72)');
  grad.addColorStop(0.45, 'rgba(255, 224, 130, 0.34)');
  grad.addColorStop(1, 'rgba(255, 224, 130, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a BoxGeometry whose faces map cleanly to a (col, row) tile in an atlas grid.
 */
function createAtlasSignBoxGeometry(
  w: number,
  h: number,
  d: number,
  brandIdx: number,
  cols = 2,
  rows = 10
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const idx = ((brandIdx % (cols * rows)) + cols * rows) % (cols * rows);
  const col = idx % cols;
  const row = Math.floor(idx / cols);

  const u0 = col / cols;
  const u1 = (col + 1) / cols;
  const v1 = 1 - row / rows;
  const v0 = 1 - (row + 1) / rows;

  const uvAttr = geo.attributes.uv;
  for (let i = 0; i < uvAttr.count; i++) {
    const u = uvAttr.getX(i);
    const v = uvAttr.getY(i);
    uvAttr.setXY(i, THREE.MathUtils.lerp(u0, u1, u), THREE.MathUtils.lerp(v0, v1, v));
  }
  uvAttr.needsUpdate = true;
  return geo;
}

function createCornerSignTexture(
  title: string,
  subtitle: string,
  accent = '#fde047',
  bg = '#1f242d',
  logo?: BrandLogoKind,
  badgeColor = '#b45309'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#090d14');
  grad.addColorStop(0.2, bg);
  grad.addColorStop(0.8, bg);
  grad.addColorStop(1, '#070a10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 256);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 2024, 232);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 2000, 208);

  if (logo) {
    ctx.save();
    ctx.translate(215, 128);
    ctx.scale(2.1, 2.1);
    drawBrandEmblem(ctx, logo, 0, 0, accent, badgeColor);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(365, 42, 3, 172);
  }

  const tx = logo ? 1185 : 1024;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = title.length > 13 ? '900 84px Georgia, serif' : '900 98px Georgia, serif';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(title, tx + 3, 102);
  ctx.fillStyle = accent;
  ctx.fillText(title, tx, 98);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText(subtitle, tx, 186);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createTaperedMansardGeometry(
  outerPts: Array<[number, number]>,
  innerPts: Array<[number, number]>,
  height: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    uA = 0,
    vA = 0,
    uB = 1,
    vB = 0,
    uC = 1,
    vC = 1
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    uvs.push(uA, vA, uB, vB, uC, vC);
  };

  // Ensure consistent outward winding based on signed area in XZ
  let area = 0;
  for (let i = 0; i < outerPts.length; i++) {
    const [x1, z1] = outerPts[i];
    const [x2, z2] = outerPts[(i + 1) % outerPts.length];
    area += x1 * z2 - x2 * z1;
  }
  const oPts = area < 0 ? [...outerPts].reverse() : outerPts;
  const iPts = area < 0 ? [...innerPts].reverse() : innerPts;

  for (let i = 0; i < oPts.length; i++) {
    const j = (i + 1) % oPts.length;
    const [ox0, oz0] = oPts[i];
    const [ox1, oz1] = oPts[j];
    const [ix0, iz0] = iPts[i];
    const [ix1, iz1] = iPts[j];
    // Outward slope triangles (counter-clockwise when viewed from outside)
    pushTri(ox0, 0, oz0, ix1, height, iz1, ox1, 0, oz1, 0, 0, 1, 1, 1, 0);
    pushTri(ox0, 0, oz0, ix0, height, iz0, ix1, height, iz1, 0, 0, 0, 1, 1, 1);
  }

  // Flat roof cap (fan from first vertex, facing +Y)
  for (let i = 1; i < iPts.length - 1; i++) {
    const [x0, z0] = iPts[0];
    const [x1, z1] = iPts[i];
    const [x2, z2] = iPts[i + 1];
    pushTri(x0, height, z0, x2, height, z2, x1, height, z1, 0, 0, 1, 1, 1, 0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

export function createVinhomesOceanParkStructure(opts?: VinhomesDistrictOptions): VinhomesOceanParkBuildResult {
  const centerX = opts?.centerX ?? VINHOMES_INTERSECTION_CENTER_X;
  const dx = centerX - VINHOMES_INTERSECTION_CENTER_X;
  const wx = (x: number) => x + dx;
  const ewMinX = opts?.crossroadMinX ?? wx(VINHOMES_CROSSROAD_MIN_X);
  const ewMaxX = opts?.crossroadMaxX ?? wx(VINHOMES_CROSSROAD_MAX_X);

  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  dynamicGroup.userData.noMerge = true;
  const autoDoors: VinhomesAutoDoor[] = [];
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const cornerSignMats: THREE.MeshStandardMaterial[] = [];

  const poolTex = createVinhomesGlowPoolTex();
  const sharedPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(sharedPoolMat);

  // 6 High-Radius Warm Evening PointLights inside dynamicGroup (2 Corner Flagship Plazas + 4 Player-Following Boulevard Wash Lights)
  const nightLights: THREE.PointLight[] = [];
  for (let li = 0; li < 6; li++) {
    const pl = new THREE.PointLight(0xffe29e, 0, 48.0, 1.0);
    pl.position.set(wx(li % 2 === 0 ? 174.0 : 213.0), 4.8, li < 2 ? 164.0 : 210.0);
    dynamicGroup.add(pl);
    nightLights.push(pl);
  }

  // Shared Road & Street Materials
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.9 });
  const promenadeTileMat = new THREE.MeshStandardMaterial({ color: 0xc2b5a3, roughness: 0.84 });
  const promenadeBorderMat = new THREE.MeshStandardMaterial({ color: 0xa8947d, roughness: 0.82 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.75, metalness: 0.1 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.95 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const yellowMedianMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
  const poleDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.4 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.88 });
  const flowerRedMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.78 });
  const flowerGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.78 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.86 });
  const woodWarmMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.72, metalness: 0.05 });
  const potStoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.74, metalness: 0.1 });
  const atmBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.45 });

  // Shared Vinhomes Ocean Park Neoclassical Shophouse Materials
  const stuccoWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.72, metalness: 0.04 });
  const stuccoGreyMat = new THREE.MeshStandardMaterial({ color: 0xc5c1b8, roughness: 0.76, metalness: 0.05 });
  const trimWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.06 });
  const plinthGraniteMat = new THREE.MeshStandardMaterial({ color: 0x646870, roughness: 0.65, metalness: 0.12 });
  const roofSlateMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.62, metalness: 0.18 });
  const darkMetalFrameMat = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.38, metalness: 0.68 });
  const canopyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.52,
  });

  // Crystal-clear storefront glass so all 40 furnished 3D interiors & indoor NPCs shine right through!
  const shopfrontGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.05,
    metalness: 0.16,
    transparent: true,
    opacity: 0.10,
    depthWrite: false,
  });

  // Shared 3D Interior Floor, Wall, Furniture & Bright Warm Bounce Materials (crisp in daylight & night!)
  const oakFloorMat = new THREE.MeshStandardMaterial({
    color: 0xc49566,
    emissive: 0x452d17,
    emissiveIntensity: 0.34,
    roughness: 0.56,
    metalness: 0.04,
  });
  const marbleFloorMat = new THREE.MeshStandardMaterial({
    color: 0xf1ede6,
    emissive: 0x575048,
    emissiveIntensity: 0.32,
    roughness: 0.3,
    metalness: 0.08,
  });
  const darkTileFloorMat = new THREE.MeshStandardMaterial({
    color: 0x333842,
    emissive: 0x1a1e26,
    emissiveIntensity: 0.3,
    roughness: 0.38,
    metalness: 0.14,
  });
  const creamWallMat = new THREE.MeshStandardMaterial({
    color: 0xfbf7ef,
    emissive: 0x6b6154,
    emissiveIntensity: 0.4,
    roughness: 0.76,
  });
  const espressoWallMat = new THREE.MeshStandardMaterial({
    color: 0x5c3829,
    emissive: 0x2d1a12,
    emissiveIntensity: 0.32,
    roughness: 0.72,
  });
  const mintWallMat = new THREE.MeshStandardMaterial({
    color: 0xdcfce7,
    emissive: 0x22543d,
    emissiveIntensity: 0.32,
    roughness: 0.74,
  });
  const brickWarmMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    emissive: 0x3f1507,
    emissiveIntensity: 0.32,
    roughness: 0.8,
  });
  const darkSlateWallMat = new THREE.MeshStandardMaterial({
    color: 0x263448,
    emissive: 0x131c2b,
    emissiveIntensity: 0.28,
    roughness: 0.7,
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0x78350f,
    emissiveIntensity: 0.26,
    roughness: 0.24,
    metalness: 0.82,
  });
  const fabricRedMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, emissive: 0x4c0519, emissiveIntensity: 0.2, roughness: 0.78 });
  const fabricTealMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, emissive: 0x042f2e, emissiveIntensity: 0.2, roughness: 0.78 });
  const fabricBeigeMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, emissive: 0x44403c, emissiveIntensity: 0.2, roughness: 0.78 });
  const fabricNavyMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x172554, emissiveIntensity: 0.2, roughness: 0.78 });
  const mezzRailGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbfdbfe,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });

  const upperCurtainTex = createUpperWindowCurtainTexture();
  // Slightly frosted satin architectural glass for Floor 2, Floor 3 & Dormers (clearly reads as glass while showing interiors!)
  const upperWindowGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    map: upperCurtainTex,
    emissive: 0x94b8db,
    emissiveMap: upperCurtainTex,
    emissiveIntensity: 0.14,
    roughness: 0.28,
    metalness: 0.24,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });

  const ledStripMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde68a,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });

  // Kept bright day & night (updated directly in vinhomes update() instead of neonMats clamping!)
  const interiorLightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 1.35,
    roughness: 0.18,
  });

  const chillerLedMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xbae6fd,
    emissiveIntensity: 1.05,
    roughness: 0.2,
  });

  const atmScreenMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.68,
    roughness: 0.2,
  });
  neonMats.push(atmScreenMat);

  const [signAtlasTexA, signAtlasTexB] = createShopSignAtlasTextures();
  const signAtlasMatA = new THREE.MeshStandardMaterial({
    map: signAtlasTexA,
    emissive: 0xffffff,
    emissiveMap: signAtlasTexA,
    emissiveIntensity: 0.62,
    roughness: 0.26,
    metalness: 0.12,
  });
  const signAtlasMatB = new THREE.MeshStandardMaterial({
    map: signAtlasTexB,
    emissive: 0xffffff,
    emissiveMap: signAtlasTexB,
    emissiveIntensity: 0.62,
    roughness: 0.26,
    metalness: 0.12,
  });
  const bladeAtlasTex = createBladeSignAtlasTexture();
  const bladeAtlasMat = new THREE.MeshStandardMaterial({
    map: bladeAtlasTex,
    emissive: 0xffffff,
    emissiveMap: bladeAtlasTex,
    emissiveIntensity: 0.58,
    roughness: 0.28,
    metalness: 0.1,
  });
  const getSignAtlasMat = (idx: number) => (idx < 20 ? signAtlasMatA : signAtlasMatB);

  // Helper to spawn a proximity-animated bi-parting Automatic Sliding Glass Door into dynamicGroup
  const addAutoSlidingDoorAtWorld = (
    worldX: number,
    worldZ: number,
    worldQuat: THREE.Quaternion,
    doorWidth = 1.72,
    doorHeight = 2.54
  ) => {
    const leafW = doorWidth * 0.5 + 0.02;
    const slideDir = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat).normalize();
    const sensorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x22c55e,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });

    const buildLeaf = (offsetX: number) => {
      const leaf = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.06, doorHeight - 0.08, 0.03), shopfrontGlassMat);
      glass.position.y = doorHeight * 0.5;
      leaf.add(glass);
      // Slim dark-aluminum top, bottom & vertical stiles + stainless mid-rail safety stripe
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.06, 0.05), darkMetalFrameMat);
      topBar.position.y = doorHeight - 0.03;
      leaf.add(topBar);
      const botBar = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.07, 0.05), darkMetalFrameMat);
      botBar.position.y = 0.035;
      leaf.add(botBar);
      [-leafW * 0.5 + 0.025, leafW * 0.5 - 0.025].forEach((sx) => {
        const stile = new THREE.Mesh(new THREE.BoxGeometry(0.05, doorHeight, 0.05), darkMetalFrameMat);
        stile.position.set(sx, doorHeight * 0.5, 0);
        leaf.add(stile);
      });
      const midRail = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.04, 0.055, 0.055), chromeMat);
      midRail.position.y = 1.12;
      leaf.add(midRail);

      const bx = worldX + slideDir.x * offsetX;
      const bz = worldZ + slideDir.z * offsetX;
      leaf.position.set(bx, 0.02, bz);
      leaf.quaternion.copy(worldQuat);
      dynamicGroup.add(leaf);
      return { leaf, bx, bz };
    };

    const left = buildLeaf(-doorWidth * 0.25);
    const right = buildLeaf(doorWidth * 0.25);

    const sensorLed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), sensorMat);
    const fwdDir = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize();
    sensorLed.position.set(worldX + fwdDir.x * 0.13, doorHeight + 0.14, worldZ + fwdDir.z * 0.13);
    sensorLed.quaternion.copy(worldQuat);
    dynamicGroup.add(sensorLed);

    autoDoors.push({
      leftLeaf: left.leaf,
      rightLeaf: right.leaf,
      sensorMat,
      worldX,
      worldZ,
      slideDirX: slideDir.x,
      slideDirZ: slideDir.z,
      baseLeftX: left.bx,
      baseLeftZ: left.bz,
      baseRightX: right.bx,
      baseRightZ: right.bz,
      openRatio: 0,
    });
  };

  // =========================================================================
  // PART 1: NGÃ TƯ VINHOMES OCEAN PARK (CENTER X = wx(193.5), Z = 148.0) & SOUTH BOULEVARD
  // =========================================================================
  // North-South Avenue Asphalt continuing cleanly from East/FarEast Intersection (or starting at Z = 156.4 for closedNorthEnd T-junction)
  const nsStartZ = opts?.closedNorthEnd ? 156.4 : 139.6;
  const nsLen = VINHOMES_SOUTH_END_Z - nsStartZ;
  const nsMidZ = (nsStartZ + VINHOMES_SOUTH_END_Z) * 0.5;
  const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, nsLen), asphaltMat);
  nsRoad.rotation.x = -Math.PI / 2;
  nsRoad.position.set(centerX, -0.26, nsMidZ);
  staticGroup.add(nsRoad);

  // East-West Crossroad Asphalt ("Đại Lộ Đại Dương" — ewMinX .. ewMaxX, Z = 139.6 .. 156.4)
  const ewLen = ewMaxX - ewMinX;
  const ewMidX = (ewMinX + ewMaxX) * 0.5;
  const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(ewLen, 16.8), asphaltMat);
  ewRoad.rotation.x = -Math.PI / 2;
  ewRoad.position.set(ewMidX, -0.26, VINHOMES_INTERSECTION_CENTER_Z);
  staticGroup.add(ewRoad);

  // South 4-Way Intersection East-West Crossroad Asphalt Wings (ewMinX..wx(185.1) & wx(201.9)..ewMaxX, Z = 335.6..352.4; zero overlap with nsRoad)
  const southWestWingLen = wx(185.1) - ewMinX;
  const southWestWingRoad = new THREE.Mesh(new THREE.PlaneGeometry(southWestWingLen, 16.8), asphaltMat);
  southWestWingRoad.rotation.x = -Math.PI / 2;
  southWestWingRoad.position.set((ewMinX + wx(185.1)) * 0.5, -0.26, VINHOMES_SOUTH_INTERSECTION_CENTER_Z);
  staticGroup.add(southWestWingRoad);

  const southEastWingLen = ewMaxX - wx(201.9);
  const southEastWingRoad = new THREE.Mesh(new THREE.PlaneGeometry(southEastWingLen, 16.8), asphaltMat);
  southEastWingRoad.rotation.x = -Math.PI / 2;
  southEastWingRoad.position.set((wx(201.9) + ewMaxX) * 0.5, -0.26, VINHOMES_SOUTH_INTERSECTION_CENTER_Z);
  staticGroup.add(southEastWingRoad);

  // =========================================================================
  // PART 2: SIDEWALKS, PROMENADES & GRANITE CURBS
  // =========================================================================
  const addSidewalkSlab = (minX: number, maxX: number, minZ: number, maxZ: number, mat = sidewalkMat) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), mat);
    mesh.position.set((minX + maxX) * 0.5, -0.125, (minZ + maxZ) * 0.5);
    staticGroup.add(mesh);
  };
  const addCurbBar = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const w = Math.max(0.24, maxX - minX);
    const d = Math.max(0.24, maxZ - minZ);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), curbMat);
    mesh.position.set((minX + maxX) * 0.5, 0.06, (minZ + maxZ) * 0.5);
    staticGroup.add(mesh);
  };

  // NW & NE Corner Sidewalks along the E-W Crossroad North Edge (continuous across T-junction when closedNorthEnd is true)
  if (opts?.closedNorthEnd) {
    addSidewalkSlab(ewMinX, ewMaxX, 134.3, 139.6);
    addCurbBar(ewMinX, ewMaxX, 139.48, 139.72);
  } else {
    addSidewalkSlab(ewMinX, wx(185.3), 134.3, 139.6);
    addCurbBar(ewMinX, wx(185.42), 139.48, 139.72);

    addSidewalkSlab(wx(201.7), ewMaxX, 134.3, 139.6);
    addCurbBar(wx(201.58), ewMaxX, 139.48, 139.72);
  }

  // SW & SE Corner Sidewalks along the E-W Crossroad South Edge (Z = 156.4 .. 161.7)
  addSidewalkSlab(ewMinX, wx(185.3), 156.4, 161.7);
  addCurbBar(ewMinX, wx(185.42), 156.28, 156.52);

  addSidewalkSlab(wx(201.7), ewMaxX, 156.4, 161.7);
  addCurbBar(wx(201.58), ewMaxX, 156.28, 156.52);

  // Broad Vinhomes Shophouse Promenade Sidewalks (strictly non-overlapping XZ tiles — zero Z-fighting!)
  const westPlazaMinX = Math.max(ewMinX, wx(160.0));
  const eastPlazaMaxX = Math.min(ewMaxX, wx(227.0));
  // Extended Corner Café Plazas wrapping around the North Ngã 4 facades (Z = 161.7..166.0)
  addSidewalkSlab(westPlazaMinX, wx(185.3), 161.7, 166.0, promenadeTileMat);
  addSidewalkSlab(wx(201.7), eastPlazaMaxX, 161.7, 166.0, promenadeTileMat);

  // Shophouse Promenade (Z = 166.0 .. VINHOMES_SHOPHOUSE_END_Z = 326.0): Border strip along doors + Main walkway
  addSidewalkSlab(wx(175.0), wx(177.2), 166.0, VINHOMES_SHOPHOUSE_END_Z, promenadeBorderMat);
  addSidewalkSlab(wx(177.2), wx(185.3), 166.0, VINHOMES_SHOPHOUSE_END_Z, promenadeTileMat);
  addSidewalkSlab(wx(201.7), wx(209.8), 166.0, VINHOMES_SHOPHOUSE_END_Z, promenadeTileMat);
  addSidewalkSlab(wx(209.8), wx(212.0), 166.0, VINHOMES_SHOPHOUSE_END_Z, promenadeBorderMat);
  addCurbBar(wx(185.18), wx(185.42), 156.28, 335.72);
  addCurbBar(wx(201.58), wx(201.82), 156.28, 335.72);

  // Extended Corner Café Plazas wrapping around the South Ngã 4 facades (Z = 326.0 .. 330.3)
  addSidewalkSlab(westPlazaMinX, wx(185.3), VINHOMES_SHOPHOUSE_END_Z, 330.3, promenadeTileMat);
  addSidewalkSlab(wx(201.7), eastPlazaMaxX, VINHOMES_SHOPHOUSE_END_Z, 330.3, promenadeTileMat);

  // Continuous Connecting Promenade Sidewalks bridging the North & South fronts to the adjacent Vinhomes block (zero Z-fighting)
  if (opts?.connectEastToX && opts.connectEastToX > eastPlazaMaxX + 2.65) {
    const bridgePromMinX = eastPlazaMaxX;
    const bridgePromMaxX = opts.connectEastToX - 2.55;
    if (bridgePromMaxX > bridgePromMinX + 0.1) {
      addSidewalkSlab(bridgePromMinX, bridgePromMaxX, 161.7, 166.0, promenadeTileMat);
      addSidewalkSlab(bridgePromMinX, bridgePromMaxX, VINHOMES_SHOPHOUSE_END_Z, 330.3, promenadeTileMat);
    }
  }

  // NW & NE Corner Sidewalks along South Ngã 4 North Edge (Z = 330.3 .. 335.6)
  addSidewalkSlab(ewMinX, wx(185.3), 330.3, 335.6);
  addCurbBar(ewMinX, wx(185.42), 335.48, 335.72);

  addSidewalkSlab(wx(201.7), ewMaxX, 330.3, 335.6);
  addCurbBar(wx(201.58), ewMaxX, 335.48, 335.72);

  // SW & SE Corner Sidewalks along South Ngã 4 South Edge (Z = 352.4 .. 357.7)
  addSidewalkSlab(ewMinX, wx(185.3), 352.4, 357.7);
  addCurbBar(ewMinX, wx(185.42), 352.28, 352.52);

  addSidewalkSlab(wx(201.7), ewMaxX, 352.4, 357.7);
  addCurbBar(wx(201.58), ewMaxX, 352.28, 352.52);

  // South Leg Sidewalks Beyond Ngã 4 (Z = 357.7 .. VINHOMES_SOUTH_END_Z = 428.0)
  addSidewalkSlab(wx(180.0), wx(185.3), 357.7, VINHOMES_SOUTH_END_Z);
  addCurbBar(wx(185.18), wx(185.42), 352.28, VINHOMES_SOUTH_END_Z);

  addSidewalkSlab(wx(201.7), wx(207.0), 357.7, VINHOMES_SOUTH_END_Z);
  addCurbBar(wx(201.58), wx(201.82), 352.28, VINHOMES_SOUTH_END_Z);

  // =========================================================================
  // PART 3: ROAD MARKINGS, ZEBRA CROSSWALKS, STOP LINES & LANE ARROWS
  // =========================================================================
  const addStripe = (x: number, z: number, w: number, d: number, mat: THREE.Material, y = -0.25) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    staticGroup.add(m);
  };

  // West Crossroad Leg Markings (ewMinX .. wx(180.0))
  const wLegLen = wx(180.0) - ewMinX;
  const wLegMidX = (ewMinX + wx(180.0)) * 0.5;
  [-0.14, 0.14].forEach((off) => addStripe(wLegMidX, VINHOMES_INTERSECTION_CENTER_Z + off, wLegLen, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(wLegMidX, VINHOMES_INTERSECTION_CENTER_Z + dir * 7.75, wLegLen, 0.16, stripeMat));
  for (let x = ewMinX + 3; x <= wx(176); x += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(x, VINHOMES_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }

  // East Crossroad Leg Markings (wx(207.0) .. ewMaxX)
  const eLegLen = ewMaxX - wx(207.0);
  const eLegMidX = (wx(207.0) + ewMaxX) * 0.5;
  [-0.14, 0.14].forEach((off) => addStripe(eLegMidX, VINHOMES_INTERSECTION_CENTER_Z + off, eLegLen, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(eLegMidX, VINHOMES_INTERSECTION_CENTER_Z + dir * 7.75, eLegLen, 0.16, stripeMat));
  for (let x = wx(211); x <= ewMaxX - 3; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(x, VINHOMES_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }

  // South Shophouse Avenue Markings (Z = 161.6 .. 330.4) — white median edge stripes flanking the planted median islands
  const sBoulevardLen = 330.4 - 161.6;
  const sBoulevardMidZ = (161.6 + 330.4) * 0.5;
  [
    { startZ: 163.0, endZ: 243.6 },
    { startZ: 248.4, endZ: 329.0 },
  ].forEach(({ startZ, endZ }) => {
    const segLen = endZ - startZ;
    const segMidZ = (startZ + endZ) * 0.5;
    [-0.68, 0.68].forEach((off) => addStripe(centerX + off, segMidZ, 0.1, segLen, stripeMat));
  });
  [-1, 1].forEach((dir) => addStripe(centerX + dir * 7.75, sBoulevardMidZ, 0.16, sBoulevardLen, stripeMat));
  for (let z = 165; z <= 327; z += 5.5) {
    if (Math.abs(z - 246.0) < 3.5) continue; // Keep mid-block crosswalk crisp
    [-4.1, 4.1].forEach((off) => addStripe(centerX + off, z, 0.14, 2.4, stripeMat));
  }

  // South Ngã 4 West & East Crossroad Leg Markings (Z = 344.0)
  [-0.14, 0.14].forEach((off) => addStripe(wLegMidX, VINHOMES_SOUTH_INTERSECTION_CENTER_Z + off, wLegLen, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(wLegMidX, VINHOMES_SOUTH_INTERSECTION_CENTER_Z + dir * 7.75, wLegLen, 0.16, stripeMat));
  for (let x = ewMinX + 3; x <= wx(176); x += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(x, VINHOMES_SOUTH_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }

  [-0.14, 0.14].forEach((off) => addStripe(eLegMidX, VINHOMES_SOUTH_INTERSECTION_CENTER_Z + off, eLegLen, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(eLegMidX, VINHOMES_SOUTH_INTERSECTION_CENTER_Z + dir * 7.75, eLegLen, 0.16, stripeMat));
  for (let x = wx(211); x <= ewMaxX - 3; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(x, VINHOMES_SOUTH_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }

  // South Leg Avenue Markings Beyond South Ngã 4 (Z = 357.6 .. 426.0)
  const farSouthLen = 426.0 - 357.6;
  const farSouthMidZ = (357.6 + 426.0) * 0.5;
  [-0.14, 0.14].forEach((off) => addStripe(centerX + off, farSouthMidZ, 0.12, farSouthLen, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(centerX + dir * 7.75, farSouthMidZ, 0.16, farSouthLen, stripeMat));
  for (let z = 362; z <= 423; z += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(centerX + off, z, 0.14, 2.4, stripeMat));
  }

  // 4 Zebra Crosswalks at North Ngã Tư (Center X = wx(193.5), Z = 148.0)
  [wx(182.7), wx(204.3)].forEach((cx) => {
    for (let z = 140.8; z <= 155.2; z += 1.05) {
      addStripe(cx, z, 3.2, 0.52, stripeMat, -0.248);
    }
  });
  const northZebraZs = opts?.closedNorthEnd ? [158.8] : [137.2, 158.8];
  northZebraZs.forEach((cz) => {
    for (let x = wx(186.3); x <= wx(200.7); x += 1.05) {
      addStripe(x, cz, 0.52, 3.2, stripeMat, -0.248);
    }
  });

  // Mid-Block Shophouse Boulevard Zebra Crosswalk (Z = 246.0)
  for (let x = wx(186.3); x <= wx(200.7); x += 1.05) {
    addStripe(x, 246.0, 0.52, 3.4, stripeMat, -0.248);
  }

  // 4 Zebra Crosswalks at South Ngã 4 (Center X = wx(193.5), Z = 344.0)
  [wx(182.7), wx(204.3)].forEach((cx) => {
    for (let z = 336.8; z <= 351.2; z += 1.05) {
      addStripe(cx, z, 3.2, 0.52, stripeMat, -0.248);
    }
  });
  [333.2, 354.8].forEach((cz) => {
    for (let x = wx(186.3); x <= wx(200.7); x += 1.05) {
      addStripe(x, cz, 0.52, 3.2, stripeMat, -0.248);
    }
  });

  // White Stop Lines at North Ngã Tư / Ngã Ba (Z = 148.0)
  addStripe(wx(180.0), 143.9, 0.42, 7.6, stripeMat, -0.247); // West leg (Eastbound)
  addStripe(wx(207.0), 152.1, 0.42, 7.6, stripeMat, -0.247); // East leg (Westbound)
  if (!opts?.closedNorthEnd) {
    addStripe(wx(189.4), 134.4, 7.6, 0.42, stripeMat, -0.247); // North leg (Southbound)
  }
  addStripe(wx(197.6), 161.6, 7.6, 0.42, stripeMat, -0.247); // South leg (Northbound)

  // 4 White Stop Lines at South Ngã 4 (Z = 344.0)
  addStripe(wx(180.0), 339.9, 0.42, 7.6, stripeMat, -0.247); // West leg (Eastbound)
  addStripe(wx(207.0), 348.1, 0.42, 7.6, stripeMat, -0.247); // East leg (Westbound)
  addStripe(wx(189.4), 330.4, 7.6, 0.42, stripeMat, -0.247); // North leg (Southbound)
  addStripe(wx(197.6), 357.6, 7.6, 0.42, stripeMat, -0.247); // South leg (Northbound)

  // Lane Directional Arrows
  const straightTex = createVinhomesTurnArrowTex('straight');
  const straightLeftTex = createVinhomesTurnArrowTex('straight_left');
  const straightRightTex = createVinhomesTurnArrowTex('straight_right');
  const addLaneArrow = (x: number, z: number, yaw: number, tex: THREE.CanvasTexture) => {
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.55 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.7), mat);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = yaw;
    mesh.position.set(x, -0.246, z);
    staticGroup.add(mesh);
  };
  addLaneArrow(wx(175.5), 145.8, -Math.PI / 2, straightLeftTex);
  addLaneArrow(wx(175.5), 142.2, -Math.PI / 2, straightRightTex);
  addLaneArrow(wx(211.5), 150.1, Math.PI / 2, straightLeftTex);
  addLaneArrow(wx(211.5), 153.8, Math.PI / 2, straightRightTex);
  if (!opts?.closedNorthEnd) {
    addLaneArrow(wx(191.4), 130.2, Math.PI, straightLeftTex);
    addLaneArrow(wx(187.4), 130.2, Math.PI, straightRightTex);
  }
  addLaneArrow(wx(195.6), 165.8, 0, straightLeftTex);
  addLaneArrow(wx(199.6), 165.8, 0, straightRightTex);
  addLaneArrow(wx(199.6), 212.0, 0, straightTex);
  addLaneArrow(wx(191.4), 212.0, Math.PI, straightTex);
  addLaneArrow(wx(199.6), 282.0, 0, straightTex);
  addLaneArrow(wx(191.4), 282.0, Math.PI, straightTex);

  // South Ngã 4 Lane Directional Arrows (Z = 344.0)
  addLaneArrow(wx(175.5), 341.8, -Math.PI / 2, straightLeftTex);
  addLaneArrow(wx(175.5), 338.2, -Math.PI / 2, straightRightTex);
  addLaneArrow(wx(211.5), 346.1, Math.PI / 2, straightLeftTex);
  addLaneArrow(wx(211.5), 349.8, Math.PI / 2, straightRightTex);
  addLaneArrow(wx(191.4), 326.2, Math.PI, straightLeftTex);
  addLaneArrow(wx(187.4), 326.2, Math.PI, straightRightTex);
  addLaneArrow(wx(195.6), 361.8, 0, straightLeftTex);
  addLaneArrow(wx(199.6), 361.8, 0, straightRightTex);
  addLaneArrow(wx(199.6), 396.0, 0, straightTex);
  addLaneArrow(wx(191.4), 396.0, Math.PI, straightTex);

  // =========================================================================
  // PART 4: 4 SYNCHRONIZED TRAFFIC LIGHT GANTRIES AT NGÃ TƯ VINHOMES
  // =========================================================================
  interface SignalLensGroup {
    red: THREE.MeshStandardMaterial;
    yellow: THREE.MeshStandardMaterial;
    green: THREE.MeshStandardMaterial;
  }
  const ewLenses: SignalLensGroup[] = [];
  const nsLenses: SignalLensGroup[] = [];

  const buildTrafficGantry = (
    cornerX: number,
    cornerZ: number,
    armRotY: number,
    axisControlled: 'ew' | 'ns',
    streetSignTitle: string,
    streetSignSub: string
  ) => {
    const grp = new THREE.Group();
    grp.position.set(cornerX, 0, cornerZ);
    grp.rotation.y = armRotY;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.40, 12), poleDarkMat);
    base.position.y = 0.20;
    grp.add(base);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 4.35, 12), poleDarkMat);
    post.position.y = 2.175;
    grp.add(post);

    const signBracket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.08), poleDarkMat);
    signBracket.position.set(0.45, 4.18, 0);
    grp.add(signBracket);

    const signTex = createVinhomesStreetSignTex(streetSignTitle, streetSignSub);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0xffffff,
      emissiveMap: signTex,
      emissiveIntensity: 0.34,
      roughness: 0.4,
    });
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.50, 0.08), signMat);
    signBox.position.set(0.75, 4.18, 0.06);
    grp.add(signBox);

    const createSignalHead = (hx: number, hy: number, hz: number, list: SignalLensGroup[]) => {
      const head = new THREE.Group();
      head.position.set(hx, hy, hz);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.06, 0.32), housingMat);
      head.add(box);

      const redMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0xef4444, emissiveIntensity: 0.1 });
      const yelMat = new THREE.MeshStandardMaterial({ color: 0x451a03, emissive: 0xf59e0b, emissiveIntensity: 0.1 });
      const grnMat = new THREE.MeshStandardMaterial({ color: 0x052e16, emissive: 0x22c55e, emissiveIntensity: 0.1 });
      list.push({ red: redMat, yellow: yelMat, green: grnMat });

      [
        { y: 0.30, mat: redMat },
        { y: 0.0, mat: yelMat },
        { y: -0.30, mat: grnMat },
      ].forEach((l) => {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), l.mat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, l.y, 0.15);
        lens.userData.noMerge = true;
        head.add(lens);
      });

      grp.add(head);
    };

    const targetList = axisControlled === 'ew' ? ewLenses : nsLenses;
    const armStub = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.28), poleDarkMat);
    armStub.position.set(0, 3.48, 0.14);
    grp.add(armStub);
    createSignalHead(0, 3.48, 0.30, targetList);

    staticGroup.add(grp);
  };

  const northCrossSub = opts?.northCrossSub ?? 'NGÃ TƯ OCEAN PARK';
  const southCrossSub = opts?.southCrossSub ?? 'NGÃ TƯ NAM VINHOMES';
  const nsStreetTitle = opts?.nsStreetTitle ?? 'VINHOMES OCEAN PARK';

  buildTrafficGantry(wx(202.7), 157.2, Math.PI / 2, 'ew', 'ĐẠI LỘ ĐẠI DƯƠNG', northCrossSub);
  buildTrafficGantry(wx(184.3), 138.8, -Math.PI / 2, 'ew', 'ĐẠI LỘ ĐẠI DƯƠNG', 'KHU ĐÔ THỊ • CÔNG VIÊN');
  buildTrafficGantry(
    wx(202.7),
    138.8,
    opts?.closedNorthEnd ? 0 : Math.PI,
    'ns',
    opts?.closedNorthEnd ? 'ĐẠI LỘ ĐẠI DƯƠNG' : 'ĐẠI LỘ NGỌC TRAI',
    opts?.closedNorthEnd ? northCrossSub : 'KHU SHOPHOUSE 40 CĂN'
  );
  buildTrafficGantry(wx(184.3), 157.2, 0, 'ns', nsStreetTitle, 'PHỐ THƯƠNG MẠI');

  // 4 Synchronized Traffic Light Gantries at South Ngã 4 (Center X = wx(193.5), Z = 344.0)
  buildTrafficGantry(wx(202.7), 353.2, Math.PI / 2, 'ew', 'ĐẠI LỘ NGỌC TRAI', southCrossSub);
  buildTrafficGantry(wx(184.3), 334.8, -Math.PI / 2, 'ew', 'ĐẠI LỘ NGỌC TRAI', 'KHU SHOPHOUSE 40 CĂN');
  buildTrafficGantry(wx(202.7), 334.8, Math.PI, 'ns', nsStreetTitle, 'NGÃ TƯ NAM ĐẠI LỘ');
  buildTrafficGantry(wx(184.3), 353.2, 0, 'ns', nsStreetTitle, 'PHỐ THƯƠNG MẠI');

  // =========================================================================
  // PART 5: 2 ROWS OF 20 VINHOMES OCEAN PARK SHOPHOUSES (40 UNITS TOTAL)
  // =========================================================================
  // Pre-build triangular pediment & semicircular arch window geometries once so all 40 units share clean geometry
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-3.95, 0);
  gableShape.lineTo(3.95, 0);
  gableShape.lineTo(0, 2.25);
  gableShape.closePath();
  const gableTrimGeo = new THREE.ExtrudeGeometry(gableShape, {
    depth: 0.46,
    bevelEnabled: false,
  });
  gableTrimGeo.translate(0, 0, -0.23);

  const gableTympShape = new THREE.Shape();
  gableTympShape.moveTo(-3.45, 0.22);
  gableTympShape.lineTo(3.45, 0.22);
  gableTympShape.lineTo(0, 1.98);
  gableTympShape.closePath();
  const gableTympGeo = new THREE.ExtrudeGeometry(gableTympShape, {
    depth: 0.52,
    bevelEnabled: false,
  });
  gableTympGeo.translate(0, 0, -0.26);

  const roofPrismShape = new THREE.Shape();
  roofPrismShape.moveTo(-3.98, 0);
  roofPrismShape.lineTo(3.98, 0);
  roofPrismShape.lineTo(0, 2.26);
  roofPrismShape.closePath();
  const roofPrismGeo = new THREE.ExtrudeGeometry(roofPrismShape, {
    depth: 10.6,
    bevelEnabled: false,
  });
  roofPrismGeo.translate(0, 0, -5.3);

  const charcoalStoneMat = new THREE.MeshStandardMaterial({ color: 0x373c46, roughness: 0.72, metalness: 0.12 });
  const wroughtIronMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.78 });
  const umbrellaFabricMat = new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.85, side: THREE.DoubleSide });
  const emeraldUmbrellaMat = new THREE.MeshStandardMaterial({ color: 0x00563b, roughness: 0.82, side: THREE.DoubleSide });
  const bistroUmbrellaMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.84, side: THREE.DoubleSide });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 });
  const grateMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, metalness: 0.7 });

  // Pre-build true upright HOLLOW semicircular arch ring & thin glass pane (XY shape -> Z extrude)
  const archTrimShape = new THREE.Shape();
  archTrimShape.moveTo(-0.875, 0);
  archTrimShape.absarc(0, 0, 0.875, Math.PI, 0, true);
  archTrimShape.lineTo(0.73, 0);
  archTrimShape.absarc(0, 0, 0.73, 0, Math.PI, false);
  archTrimShape.closePath();
  const archTrimGeo = new THREE.ExtrudeGeometry(archTrimShape, { depth: 0.14, bevelEnabled: false });
  archTrimGeo.translate(0, 0, -0.07);

  const archGlassShape = new THREE.Shape();
  archGlassShape.absarc(0, 0, 0.73, 0, Math.PI, false);
  archGlassShape.closePath();
  const archGlassGeo = new THREE.ExtrudeGeometry(archGlassShape, { depth: 0.06, bevelEnabled: false });
  archGlassGeo.translate(0, 0, -0.03);

  const addTopiaryPot = (parent: THREE.Group, px: number, py: number, pz: number, scale = 1.0) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.19 * scale, 0.38 * scale, 10), potStoneMat);
    pot.position.set(px, py + 0.19 * scale, pz);
    parent.add(pot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.38 * scale, 6), trunkMat);
    stem.position.set(px, py + 0.48 * scale, pz);
    parent.add(stem);
    const globe = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 * scale, 1), leafMat2);
    globe.position.set(px, py + 0.76 * scale, pz);
    parent.add(globe);
  };

  const addIndoorCafeTable = (parent: THREE.Group, tx: number, ty: number, tz: number, chairMat: THREE.Material) => {
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.74, 8), darkMetalFrameMat);
    tableLeg.position.set(tx, ty + 0.37, tz);
    parent.add(tableLeg);
    const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.04, 10), darkMetalFrameMat);
    tableBase.position.set(tx, ty + 0.02, tz);
    parent.add(tableBase);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12), woodWarmMat);
    top.position.set(tx, ty + 0.75, tz);
    parent.add(top);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 8), trimWhiteMat);
    cup.position.set(tx + 0.1, ty + 0.81, tz + 0.06);
    parent.add(cup);
    [-0.64, 0.64].forEach((ox) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36), chairMat);
      seat.position.set(tx + ox, ty + 0.44, tz);
      parent.add(seat);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.3), darkMetalFrameMat);
      leg.position.set(tx + ox, ty + 0.21, tz);
      parent.add(leg);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.36), chairMat);
      back.position.set(tx + ox + Math.sign(ox) * 0.16, ty + 0.66, tz);
      parent.add(back);
    });
  };

  const addBarStool = (parent: THREE.Group, sx: number, sy: number, sz: number, seatMat: THREE.Material) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.68, 8), darkMetalFrameMat);
    leg.position.set(sx, sy + 0.34, sz);
    parent.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 10), darkMetalFrameMat);
    foot.position.set(sx, sy + 0.015, sz);
    parent.add(foot);
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 12), seatMat);
    cushion.position.set(sx, sy + 0.71, sz);
    parent.add(cushion);
  };

  const addWallSlatPanel = (parent: THREE.Group, wx: number, wz: number, count: number, height: number, yBase: number) => {
    for (let i = 0; i < count; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, height, 0.11), woodWarmMat);
      slat.position.set(wx, yBase + height * 0.5, wz - (i - (count - 1) * 0.5) * 0.24);
      parent.add(slat);
    }
  };

  const addPendantLamp = (parent: THREE.Group, lx: number, ceilingY: number, drop: number, pz: number) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, drop, 6), darkMetalFrameMat);
    cord.position.set(lx, ceilingY - drop * 0.5, pz);
    parent.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 10), goldAccentMat);
    shade.position.set(lx, ceilingY - drop, pz);
    parent.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), interiorLightMat);
    bulb.position.set(lx, ceilingY - drop - 0.07, pz);
    parent.add(bulb);
  };

  const buildCornerShophouse = (side: 'west' | 'east', cornerEnd: 'north' | 'south' = 'north') => {
    const isNorthCorner = cornerEnd === 'north';
    const unitZ = isNorthCorner
      ? VINHOMES_SHOPHOUSE_START_Z + VINHOMES_SHOPHOUSE_UNIT_WIDTH * 0.5 // 170.0
      : VINHOMES_SHOPHOUSE_END_Z - VINHOMES_SHOPHOUSE_UNIT_WIDTH * 0.5; // 322.0
    const isEastFacing = side === 'west';
    // local +n*X faces outward toward the adjacent Ngã 4 crossroad (North for unit 0, South for unit 19)!
    const n: 1 | -1 = isNorthCorner ? (isEastFacing ? 1 : -1) : (isEastFacing ? -1 : 1);
    const cornerUnitIdx = isNorthCorner ? 0 : VINHOMES_SHOPHOUSE_COUNT_PER_SIDE - 1;
    const brand = SHOP_SIGN_BRANDS[isEastFacing ? cornerUnitIdx : 20 + cornerUnitIdx];

    const unitGrp = new THREE.Group();
    unitGrp.position.set(wx(isEastFacing ? 175.0 : 212.0), 0, unitZ);
    unitGrp.rotation.y = isEastFacing ? Math.PI / 2 : -Math.PI / 2;

    const addPart = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      lx: number,
      ly: number,
      lz: number,
      rx = 0,
      ry = 0,
      rz = 0
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(lx, ly, lz);
      if (rx) m.rotation.x = rx;
      if (ry) m.rotation.y = ry;
      if (rz) m.rotation.z = rz;
      unitGrp.add(m);
      return m;
    };

    const makeChamferExtrude = (
      ptsXZ: Array<[number, number]>,
      height: number
    ): THREE.BufferGeometry => {
      const shape = new THREE.Shape();
      shape.moveTo(ptsXZ[0][0], -ptsXZ[0][1]);
      for (let i = 1; i < ptsXZ.length; i++) {
        shape.lineTo(ptsXZ[i][0], -ptsXZ[i][1]);
      }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      return geo;
    };

    const bodyPts: Array<[number, number]> = [
      [n * -3.98, -0.02],
      [n * 1.98, -0.02],
      [n * 3.98, -2.02],
      [n * 3.98, -12.48],
      [n * -3.98, -12.48],
    ];

    // 1. Hollow 12.4m-Deep Ground Floor Flagship Café Hall (Y = 0 .. 4.35) + Hollow 2-Story Glass-Windowed Café Upper Floors (Y = 4.35 .. 12.95)
    addPart(makeChamferExtrude(bodyPts, 0.04), oakFloorMat, 0, 0, 0);
    addPart(makeChamferExtrude(bodyPts, 0.16), creamWallMat, 0, 4.19, 0);
    // Compact rear corner core (lz = -10.2 .. -12.4) keeps entire 10.2m-deep L-café open!
    addPart(new THREE.BoxGeometry(2.6, 4.35, 2.2), charcoalStoneMat, n * -2.6, 2.175, -11.3);
    // Outer South & Rear perimeter ground walls (warm interior face!)
    addPart(new THREE.BoxGeometry(0.28, 4.35, 12.44), creamWallMat, n * -3.84, 2.175, -6.25);
    addPart(new THREE.BoxGeometry(7.92, 4.35, 0.28), creamWallMat, 0, 2.175, -12.34);
    // Corner structural stone columns
    bodyPts.forEach(([px, pz]) => {
      addPart(new THREE.BoxGeometry(0.38, 4.35, 0.38), charcoalStoneMat, px, 2.175, pz);
    });

    // Hollow Upper Floors 2 & 3 Structural Slabs, Solid Rear/Party Walls & Open-Corner Columns (Y = 4.35 .. 12.95)
    addPart(makeChamferExtrude(bodyPts, 0.28), oakFloorMat, 0, 4.38, 0);
    addPart(makeChamferExtrude(bodyPts, 0.26), oakFloorMat, 0, 8.62, 0);
    addPart(makeChamferExtrude(bodyPts, 0.24), creamWallMat, 0, 12.70, 0);
    addPart(new THREE.BoxGeometry(7.92, 8.6, 0.32), stuccoWhiteMat, 0, 8.65, -12.32);
    addPart(new THREE.BoxGeometry(7.36, 8.2, 0.08), espressoWallMat, 0, 8.65, -12.12);
    addPart(new THREE.BoxGeometry(0.32, 8.6, 12.44), stuccoWhiteMat, n * -3.82, 8.65, -6.25);
    addPart(new THREE.BoxGeometry(0.08, 8.2, 12.0), creamWallMat, n * -3.62, 8.65, -6.25);
    bodyPts.slice(0, 4).forEach(([px, pz]) => {
      addPart(new THREE.BoxGeometry(0.42, 8.6, 0.42), stuccoWhiteMat, px, 8.65, pz);
    });

    // 2. Wraparound Horizontal Ledge / Balcony Slab (Y = 4.32 .. 4.62), Floor 3 Cornice (Y = 8.68), Top Cornice (Y = 12.88)
    const makeExpandedPts = (pad: number): Array<[number, number]> => [
      [n * -3.98, -0.02 + pad],
      [n * (1.98 + pad * 0.414), -0.02 + pad],
      [n * (3.98 + pad), -(2.02 - pad * 0.414)],
      [n * (3.98 + pad), -12.48],
      [n * -3.98, -12.48],
    ];
    addPart(makeChamferExtrude(makeExpandedPts(0.95), 0.3), charcoalStoneMat, 0, 4.32, 0);
    addPart(makeChamferExtrude(makeExpandedPts(0.28), 0.22), trimWhiteMat, 0, 8.66, 0);
    addPart(makeChamferExtrude(makeExpandedPts(0.45), 0.32), trimWhiteMat, 0, 12.82, 0);

    // 3. Top Rooftop Classical White Balustrade Parapet (Y = 13.14 .. 13.86)
    const addBalustradeRun = (x0: number, z0: number, x1: number, z1: number) => {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz) - Math.PI / 2;
      const runGrp = new THREE.Group();
      runGrp.position.set((x0 + x1) * 0.5, 13.14, (z0 + z1) * 0.5);
      runGrp.rotation.y = yaw;
      const railTop = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.18), trimWhiteMat);
      railTop.position.y = 0.68;
      runGrp.add(railTop);
      const railBot = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.18), trimWhiteMat);
      railBot.position.y = 0.05;
      runGrp.add(railBot);
      const steps = Math.max(2, Math.floor(len / 0.48));
      for (let i = 0; i <= steps; i++) {
        const bx = -len * 0.5 + (i / steps) * len;
        const isPost = i === 0 || i === steps || i === Math.floor(steps / 2);
        const bal = new THREE.Mesh(
          isPost ? new THREE.BoxGeometry(0.22, 0.74, 0.22) : new THREE.CylinderGeometry(0.05, 0.065, 0.54, 6),
          trimWhiteMat
        );
        bal.position.set(bx, 0.37, 0);
        runGrp.add(bal);
      }
      unitGrp.add(runGrp);
    };
    const paraPts = makeExpandedPts(0.26);
    addBalustradeRun(paraPts[0][0], paraPts[0][1], paraPts[1][0], paraPts[1][1]);
    addBalustradeRun(paraPts[1][0], paraPts[1][1], paraPts[2][0], paraPts[2][1]);
    addBalustradeRun(paraPts[2][0], paraPts[2][1], paraPts[3][0], paraPts[3][1]);

    // 4. Floor 2 Continuous Black Wrought-Iron Balcony Railing + Lush Green Flower Planters (Y = 4.62 .. 5.50)
    const addIronRailingRun = (x0: number, z0: number, x1: number, z1: number, withPlanters = true) => {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz) - Math.PI / 2;
      const runGrp = new THREE.Group();
      runGrp.position.set((x0 + x1) * 0.5, 4.62, (z0 + z1) * 0.5);
      runGrp.rotation.y = yaw;
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.08), wroughtIronMat);
      topRail.position.y = 0.84;
      runGrp.add(topRail);
      const botRail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.08), wroughtIronMat);
      botRail.position.y = 0.08;
      runGrp.add(botRail);
      const pickets = Math.max(3, Math.floor(len / 0.28));
      for (let i = 0; i <= pickets; i++) {
        const bx = -len * 0.5 + (i / pickets) * len;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.78, 0.04), wroughtIronMat);
        bar.position.set(bx, 0.45, 0);
        runGrp.add(bar);
      }
      if (withPlanters && len > 2.2) {
        const planter = new THREE.Mesh(new THREE.BoxGeometry(len * 0.76, 0.34, 0.34), hedgeMat);
        planter.position.set(0, 0.36, -0.14);
        runGrp.add(planter);
        const blossoms = new THREE.Mesh(
          new THREE.BoxGeometry(len * 0.68, 0.14, 0.24),
          isEastFacing ? flowerGoldMat : flowerRedMat
        );
        blossoms.position.set(0, 0.54, -0.14);
        runGrp.add(blossoms);
      }
      unitGrp.add(runGrp);
    };
    const balPts = makeExpandedPts(0.84);
    addIronRailingRun(balPts[0][0], balPts[0][1], balPts[1][0], balPts[1][1], true);
    addIronRailingRun(balPts[1][0], balPts[1][1], balPts[2][0], balPts[2][1], true);
    addIronRailingRun(balPts[2][0], balPts[2][1], balPts[3][0], balPts[3][1], true);

    // 5. Steep French Slate Mansard Roof (Y = 13.12 .. 15.82)
    const mansardOuter = makeExpandedPts(0.28);
    const mansardInner: Array<[number, number]> = [
      [n * -3.72, -1.15],
      [n * 1.15, -1.15],
      [n * 2.85, -2.85],
      [n * 2.85, -11.35],
      [n * -3.72, -11.35],
    ];
    addPart(createTaperedMansardGeometry(mansardOuter, mansardInner, 2.7), roofSlateMat, 0, 13.12, 0);
    addPart(makeChamferExtrude(mansardInner, 0.24), trimWhiteMat, 0, 15.72, 0);

    const cornerSignTex = createCornerSignTexture(
      brand.name,
      brand.sub,
      brand.accent,
      brand.bg,
      brand.logo,
      brand.badgeColor
    );
    const cornerSignMat = new THREE.MeshStandardMaterial({
      map: cornerSignTex,
      emissive: 0xffffff,
      emissiveMap: cornerSignTex,
      emissiveIntensity: 0.65,
      roughness: 0.28,
    });
    cornerSignMats.push(cornerSignMat);

    // Corner Flagship 3D Café/Lounge Interior (Deep L-shaped espresso bar, cake display, stools, sofa banquette, 6 bistro sets)
    const barMat = brand.interior === 'bank' ? darkSlateWallMat : isEastFacing ? espressoWallMat : fabricTealMat;
    const indoorChairMat = brand.interior === 'bank' ? fabricNavyMat : isEastFacing ? fabricBeigeMat : fabricTealMat;
    addPart(new THREE.BoxGeometry(4.0, 1.05, 0.85), barMat, n * -1.0, 0.525, -5.85);
    addPart(new THREE.BoxGeometry(4.1, 0.08, 0.96), marbleFloorMat, n * -1.0, 1.07, -5.85);
    addPart(new THREE.BoxGeometry(0.85, 1.05, 4.6), barMat, n * -0.5, 0.525, -8.35);
    addPart(new THREE.BoxGeometry(0.96, 0.08, 4.7), marbleFloorMat, n * -0.5, 1.07, -8.35);
    // Brass bar footrest + 4 bar stools along front counter
    addPart(new THREE.CylinderGeometry(0.025, 0.025, 3.6, 8), goldAccentMat, n * -1.0, 0.22, -5.25, 0, 0, Math.PI / 2);
    [-2.2, -1.2, -0.2].forEach((sx) => addBarStool(unitGrp, n * sx, 0.04, -4.95, indoorChairMat));
    // Double chrome espresso machines + coffee grinder + cake pastry showcase
    addPart(new THREE.BoxGeometry(0.82, 0.48, 0.45), chromeMat, n * -1.7, 1.35, -5.85);
    addPart(new THREE.CylinderGeometry(0.11, 0.13, 0.42, 10), darkMetalFrameMat, n * -0.95, 1.32, -5.85);
    addPart(new THREE.BoxGeometry(1.25, 0.58, 0.55), mezzRailGlassMat, n * 0.1, 1.4, -5.85);
    [-0.25, 0.1, 0.45].forEach((cx, ci) => {
      addPart(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10), ci === 0 ? flowerRedMat : ci === 1 ? flowerGoldMat : fabricBeigeMat, n * cx, 1.24, -5.85);
    });
    // Back wood slat feature wall + glowing interior menu boards
    addWallSlatPanel(unitGrp, n * -3.65, -4.0, 11, 3.8, 0.04);
    addPart(new THREE.BoxGeometry(3.2, 0.72, 0.08), cornerSignMat, n * -2.2, 2.85, -10.1);
    // Warm Recessed Ceiling Light Panels & Brass Pendant Lamps
    addPart(new THREE.BoxGeometry(4.8, 0.06, 0.26), interiorLightMat, n * 0.2, 4.14, -2.8);
    addPart(new THREE.BoxGeometry(0.26, 0.06, 8.0), interiorLightMat, n * 1.9, 4.14, -7.2);
    addPart(new THREE.BoxGeometry(4.4, 0.06, 0.26), interiorLightMat, n * 0.2, 4.14, -9.8);
    [-2.0, -0.5, 1.0].forEach((px) => addPendantLamp(unitGrp, n * px, 4.16, 0.9, -5.1));
    // Wall banquette sofa + 6 Indoor café tables clearly visible through Avenue, Chamfered & North glass
    addPart(new THREE.BoxGeometry(0.76, 0.44, 4.6), indoorChairMat, n * -3.3, 0.26, -5.0);
    addPart(new THREE.BoxGeometry(0.18, 0.54, 4.6), indoorChairMat, n * -3.62, 0.68, -5.0);
    addIndoorCafeTable(unitGrp, n * -1.9, 0.04, -2.1, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.1, 0.04, -2.5, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.9, 0.04, -5.6, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.9, 0.04, -8.8, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * -0.4, 0.04, -11.0, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 2.1, 0.04, -11.2, indoorChairMat);
    addTopiaryPot(unitGrp, n * 3.1, 0.04, -11.4, 0.95);
    addTopiaryPot(unitGrp, n * -3.1, 0.04, -1.6, 0.85);

    // Floor 2 & Floor 3 Deep Furnished Lounge Café Interiors (clearly visible through Floor 2 & 3 Glass Windows!)
    // Floor 2 (Y = 4.66 .. 8.62)
    addWallSlatPanel(unitGrp, n * -3.45, -5.8, 12, 3.6, 4.66);
    addPart(new THREE.BoxGeometry(0.76, 0.44, 5.2), indoorChairMat, n * -3.05, 4.88, -5.8);
    addPart(new THREE.BoxGeometry(0.18, 0.54, 5.2), indoorChairMat, n * -3.38, 5.3, -5.8);
    addPart(new THREE.BoxGeometry(3.4, 1.0, 0.78), barMat, n * -0.8, 5.16, -9.8);
    addPart(new THREE.BoxGeometry(3.5, 0.07, 0.88), marbleFloorMat, n * -0.8, 5.68, -9.8);
    addPart(new THREE.BoxGeometry(2.8, 0.64, 0.08), cornerSignMat, n * -0.4, 7.15, -11.98);
    addIndoorCafeTable(unitGrp, n * -1.9, 4.66, -2.2, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.1, 4.66, -2.6, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.8, 4.66, -5.5, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.7, 4.66, -9.4, indoorChairMat);
    addTopiaryPot(unitGrp, n * 2.6, 4.66, -1.9, 1.15);
    addTopiaryPot(unitGrp, n * -2.9, 4.66, -1.5, 1.05);
    addTopiaryPot(unitGrp, n * 2.8, 4.66, -7.2, 1.1);
    addPart(new THREE.BoxGeometry(5.2, 0.06, 0.28), interiorLightMat, n * 0.2, 8.56, -1.8);
    addPart(new THREE.BoxGeometry(0.28, 0.06, 8.2), interiorLightMat, n * 2.1, 8.56, -6.2);
    addPart(new THREE.BoxGeometry(0.28, 0.06, 8.2), interiorLightMat, n * -0.6, 8.56, -6.2);
    [
      [n * -1.8, -1.7],
      [n * 1.2, -1.9],
      [n * 2.2, -4.6],
      [n * 2.2, -9.6],
    ].forEach(([px, pz]) => addPendantLamp(unitGrp, px, 8.58, 1.48, pz));

    // Floor 3 (Y = 8.88 .. 12.70)
    addWallSlatPanel(unitGrp, n * -3.45, -5.8, 12, 3.4, 8.88);
    addPart(new THREE.BoxGeometry(2.6, 2.4, 0.5), woodWarmMat, n * -1.6, 10.08, -11.75);
    addPart(new THREE.BoxGeometry(2.8, 0.64, 0.08), cornerSignMat, n * -0.4, 11.4, -11.98);
    addPart(new THREE.BoxGeometry(0.76, 0.44, 4.4), indoorChairMat, n * -3.05, 9.1, -5.4);
    addIndoorCafeTable(unitGrp, n * -1.9, 8.88, -2.2, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.1, 8.88, -2.6, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.8, 8.88, -5.6, indoorChairMat);
    addIndoorCafeTable(unitGrp, n * 1.7, 8.88, -9.4, indoorChairMat);
    addTopiaryPot(unitGrp, n * 2.6, 8.88, -1.9, 1.15);
    addTopiaryPot(unitGrp, n * -2.9, 8.88, -1.5, 1.05);
    addTopiaryPot(unitGrp, n * 2.8, 8.88, -7.2, 1.1);
    addPart(new THREE.BoxGeometry(5.2, 0.06, 0.28), interiorLightMat, n * 0.2, 12.64, -1.8);
    addPart(new THREE.BoxGeometry(0.28, 0.06, 8.2), interiorLightMat, n * 2.1, 12.64, -6.2);
    addPart(new THREE.BoxGeometry(0.28, 0.06, 8.2), interiorLightMat, n * -0.6, 12.64, -6.2);
    [
      [n * -1.8, -1.7],
      [n * 1.2, -1.9],
      [n * 2.2, -4.6],
      [n * 2.2, -9.6],
    ].forEach(([px, pz]) => addPendantLamp(unitGrp, px, 12.66, 1.45, pz));

    const addFacadeBay = (
      parent: THREE.Group,
      bx: number,
      bayWidth: number,
      hasJulietF3: boolean,
      hasDormer: boolean,
      archedCornerStyle: boolean,
      signTitleMesh: boolean,
      openDoor = false
    ) => {
      const bay = new THREE.Group();
      bay.position.set(bx, 0, 0);

      const gw = bayWidth - 0.55;
      if (openDoor) {
        // Side fixed glass + Overhead Automatic Sliding Door Operator Housing (leaves spawned dynamically!)
        const sideGlassW = Math.max(0.25, (gw - 1.65) * 0.5);
        [-1, 1].forEach((s) => {
          const sg = new THREE.Mesh(new THREE.BoxGeometry(sideGlassW, 3.2, 0.08), shopfrontGlassMat);
          sg.position.set(s * (0.825 + sideGlassW * 0.5), 1.85, 0.02);
          bay.add(sg);
        });
        [-gw * 0.5, -0.85, 0.85, gw * 0.5].forEach((mx) => {
          const mul = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.24, 0.2), darkMetalFrameMat);
          mul.position.set(mx, 1.85, 0.05);
          bay.add(mul);
        });
        const autoHeader = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.22, 0.22), darkMetalFrameMat);
        autoHeader.position.set(0, 2.66, 0.05);
        bay.add(autoHeader);
        const floorTrack = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.02, 0.12), chromeMat);
        floorTrack.position.set(0, 0.015, 0.02);
        bay.add(floorTrack);
        const topTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.68, 0.08), shopfrontGlassMat);
        topTransomGlass.position.set(0, 3.1, 0.02);
        bay.add(topTransomGlass);
        bay.userData.hasAutoDoor = true;
      } else {
        // Crystal-clear transparent glass panes + Dark Metal Mullions
        const gfGlass = new THREE.Mesh(new THREE.BoxGeometry(gw, 3.2, 0.08), shopfrontGlassMat);
        gfGlass.position.set(0, 1.85, 0.02);
        bay.add(gfGlass);
        [-gw * 0.5, -gw * 0.25, 0, gw * 0.25, gw * 0.5].forEach((mx) => {
          const mul = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.24, 0.2), darkMetalFrameMat);
          mul.position.set(mx, 1.85, 0.05);
          bay.add(mul);
        });
      }
      const transom = new THREE.Mesh(new THREE.BoxGeometry(gw + 0.12, 0.1, 0.2), darkMetalFrameMat);
      transom.position.set(0, 3.46, 0.05);
      bay.add(transom);

      const threshold = new THREE.Mesh(new THREE.BoxGeometry(gw * 0.55, 0.032, 0.24), plinthGraniteMat);
      threshold.position.set(0, 0.016, 0.22);
      bay.add(threshold);

      // Warm under-fascia LED soffit strip
      const soffitLed = new THREE.Mesh(new THREE.BoxGeometry(gw, 0.05, 0.08), ledStripMat);
      soffitLed.position.set(0, 3.52, 0.14);
      bay.add(soffitLed);

      // Floor 1 Signboard Fascia (Y = 3.56 .. 4.24) with beveled frame & gold trim
      if (signTitleMesh) {
        const sbW = Math.min(gw + 0.18, 4.32);
        const sbFrame = new THREE.Mesh(new THREE.BoxGeometry(sbW + 0.14, 0.72, 0.14), darkMetalFrameMat);
        sbFrame.position.set(0, 3.9, 0.07);
        bay.add(sbFrame);
        const sb = new THREE.Mesh(new THREE.BoxGeometry(sbW, 0.62, 0.18), cornerSignMat);
        sb.position.set(0, 3.9, 0.1);
        bay.add(sb);
      }

      // Floor 2 & Floor 3 Tall Neoclassical Windows with HOLLOW 4-Bar Frame + Crystal-Clear Glass!
      const uw = Math.min(gw - 0.2, 2.3);
      [6.75, 10.9].forEach((wy, floorIdx) => {
        // Hollow 4-piece perimeter trim (left jamb, right jamb, top lintel, bottom sill — open center!)
        [-1, 1].forEach((sideSign) => {
          const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.46, 0.14), trimWhiteMat);
          jamb.position.set(sideSign * (uw * 0.5 + 0.06), wy, 0.04);
          bay.add(jamb);
        });
        [-1, 1].forEach((vertSign) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(uw + 0.26, 0.14, 0.14), trimWhiteMat);
          rail.position.set(0, wy + vertSign * 1.16, 0.04);
          bay.add(rail);
        });
        [-uw * 0.42, uw * 0.42].forEach((drx) => {
          const drape = new THREE.Mesh(new THREE.BoxGeometry(uw * 0.14, 2.12, 0.06), fabricBeigeMat);
          drape.position.set(drx, wy, -0.04);
          bay.add(drape);
        });
        const winGlass = new THREE.Mesh(new THREE.BoxGeometry(uw, 2.2, 0.06), upperWindowGlassMat);
        winGlass.position.set(0, wy, 0.06);
        bay.add(winGlass);

        if (floorIdx === 1 && hasJulietF3) {
          const jSlab = new THREE.Mesh(new THREE.BoxGeometry(uw + 0.45, 0.16, 0.48), trimWhiteMat);
          jSlab.position.set(0, 9.52, 0.24);
          bay.add(jSlab);
          const jRailTop = new THREE.Mesh(new THREE.BoxGeometry(uw + 0.36, 0.06, 0.06), wroughtIronMat);
          jRailTop.position.set(0, 10.22, 0.44);
          bay.add(jRailTop);
          const jCols = Math.max(3, Math.floor((uw + 0.36) / 0.24));
          for (let ci = 0; ci <= jCols; ci++) {
            const cx = -(uw + 0.36) * 0.5 + (ci / jCols) * (uw + 0.36);
            const jb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.64, 0.03), wroughtIronMat);
            jb.position.set(cx, 9.9, 0.44);
            bay.add(jb);
          }
        }
      });

      // Classical Hollow Mansard Dormer Window piercing the roof slope (Y = 13.75 .. 15.65)
      if (hasDormer) {
        const dormZ = -0.35;
        const dw = archedCornerStyle ? 1.85 : 1.55;
        // Hollow dormer shell: left/right cheeks, floor sill, warm dark rear wall + ceiling lamp
        [-1, 1].forEach((sideSign) => {
          const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.48, 1.35), trimWhiteMat);
          cheek.position.set(sideSign * (dw * 0.5 - 0.09), 14.32, dormZ);
          bay.add(cheek);
        });
        const dSill = new THREE.Mesh(new THREE.BoxGeometry(dw, 0.16, 1.35), trimWhiteMat);
        dSill.position.set(0, 13.66, dormZ);
        bay.add(dSill);
        const dBack = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.2, 1.4, 0.14), espressoWallMat);
        dBack.position.set(0, 14.32, dormZ - 0.58);
        bay.add(dBack);
        const dGlow = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.44, 0.08, 0.36), interiorLightMat);
        dGlow.position.set(0, 14.88, dormZ + 0.18);
        bay.add(dGlow);
        const dGlass = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.34, 1.15, 0.06), upperWindowGlassMat);
        dGlass.position.set(0, 14.28, dormZ + 0.65);
        bay.add(dGlass);
        if (archedCornerStyle) {
          const archRim = new THREE.Mesh(archTrimGeo, roofSlateMat);
          archRim.scale.set(dw / 1.75, dw / 1.75, 9.8);
          archRim.position.set(0, 15.04, dormZ - 0.02);
          bay.add(archRim);
          const archTrim = new THREE.Mesh(archTrimGeo, trimWhiteMat);
          archTrim.scale.set((dw * 0.9) / 1.75, (dw * 0.9) / 1.75, 1);
          archTrim.position.set(0, 15.02, dormZ + 0.64);
          bay.add(archTrim);
          const archGlass = new THREE.Mesh(archGlassGeo, upperWindowGlassMat);
          archGlass.scale.set((dw - 0.34) / 1.46, (dw - 0.34) / 1.46, 1);
          archGlass.position.set(0, 15.02, dormZ + 0.64);
          bay.add(archGlass);
        } else {
          const dCap = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.18, 0.18, 1.5), roofSlateMat);
          dCap.position.set(0, 15.12, dormZ);
          bay.add(dCap);
        }
      }

      parent.add(bay);
    };

    const addUpperWallShell = (
      parent: THREE.Group,
      totalW: number,
      piers: Array<{ x: number; w: number }>
    ) => {
      // Horizontal perimeter spandrels above/below Floor 2 & 3 windows (Y=4.62..5.65, 7.85..9.80, 12.00..12.95)
      [
        { y: 5.135, h: 1.03 },
        { y: 8.825, h: 1.95 },
        { y: 12.475, h: 0.95 },
      ].forEach(({ y, h }) => {
        const band = new THREE.Mesh(new THREE.BoxGeometry(totalW, h, 0.32), stuccoWhiteMat);
        band.position.set(0, y, -0.16);
        parent.add(band);
      });
      // Vertical piers between window cavities on Floor 2 (Y=6.75) & Floor 3 (Y=10.90)
      piers.forEach(({ x, w }) => {
        [6.75, 10.9].forEach((wy) => {
          const pier = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, 0.32), stuccoWhiteMat);
          pier.position.set(x, wy, -0.16);
          parent.add(pier);
        });
      });
    };

    // 6. Avenue Front Face Group
    const aveGrp = new THREE.Group();
    aveGrp.position.set(n * -1.0, 0, -0.02);
    addFacadeBay(aveGrp, n * -1.15, 2.75, true, true, false, false, false);
    addFacadeBay(aveGrp, n * 1.55, 2.35, true, false, false, true, false);
    addUpperWallShell(aveGrp, 5.98, [
      { x: n * -2.57, w: 0.86 },
      { x: n * 0.3, w: 0.92 },
      { x: n * 2.67, w: 0.66 },
    ]);
    unitGrp.add(aveGrp);

    // 7. 45° Chamfered Corner Bay Face Group (Automatic Sliding Door Main Entrance!)
    const cornerGrp = new THREE.Group();
    cornerGrp.position.set(n * 2.98, 0, -1.02);
    cornerGrp.rotation.y = n * (Math.PI / 4);
    addFacadeBay(cornerGrp, 0, 2.72, false, true, true, true, true);
    addUpperWallShell(cornerGrp, 2.86, [
      { x: -1.21, w: 0.46 },
      { x: 1.21, w: 0.46 },
    ]);
    addTopiaryPot(cornerGrp, -1.25, 0, 0.36, 0.95);
    addTopiaryPot(cornerGrp, 1.25, 0, 0.36, 0.95);
    const easelGrp = new THREE.Group();
    easelGrp.position.set(n * -1.65, 0, 0.58);
    easelGrp.rotation.y = n * -0.25;
    const easelFront = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.88, 0.05), woodWarmMat);
    easelFront.position.set(0, 0.44, 0.11);
    easelFront.rotation.x = -0.18;
    easelGrp.add(easelFront);
    const easelBoard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.06), housingMat);
    easelBoard.position.set(0, 0.49, 0.115);
    easelBoard.rotation.x = -0.18;
    easelGrp.add(easelBoard);
    const easelBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.88, 0.05), woodWarmMat);
    easelBack.position.set(0, 0.44, -0.11);
    easelBack.rotation.x = 0.18;
    easelGrp.add(easelBack);
    cornerGrp.add(easelGrp);
    unitGrp.add(cornerGrp);

    // 8. North Ngã 4 Crossroad Face Group (Automatic Sliding Door North Entrance!)
    const northGrp = new THREE.Group();
    northGrp.position.set(n * 3.98, 0, -7.25);
    northGrp.rotation.y = n * (Math.PI / 2);
    addFacadeBay(northGrp, n * 2.75, 4.3, true, true, false, true, false);
    addFacadeBay(northGrp, n * -2.35, 4.3, true, true, false, true, true);
    addUpperWallShell(northGrp, 10.48, [
      { x: n * -4.37, w: 1.76 },
      { x: n * 0.2, w: 2.82 },
      { x: n * 4.57, w: 1.36 },
    ]);
    addTopiaryPot(northGrp, n * 0.2, 0, 0.36, 1.0);
    [n * -5.0, n * 0.2, n * 5.05].forEach((px) => {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.42, 8.45, 0.22), trimWhiteMat);
      pil.position.set(px, 8.6, 0.04);
      northGrp.add(pil);
    });
    unitGrp.add(northGrp);

    // Floor 2 Veranda Terrace Café Furniture & Warm Sconce (Y = 4.62)
    const f2BalTable = new THREE.Group();
    f2BalTable.position.set(n * 2.7, 4.62, -2.55);
    const btTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 12), marbleFloorMat);
    btTop.position.y = 0.72;
    f2BalTable.add(btTop);
    const btPed = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.16, 0.72, 8), darkMetalFrameMat);
    btPed.position.y = 0.36;
    f2BalTable.add(btPed);
    unitGrp.add(f2BalTable);

    staticGroup.add(unitGrp);
    // Register Corner & North Automatic Sliding Doors in World Space
    unitGrp.updateMatrixWorld(true);
    [cornerGrp, northGrp].forEach((fg) => {
      fg.children.forEach((bay) => {
        if (bay.userData.hasAutoDoor) {
          const wp = new THREE.Vector3();
          const wq = new THREE.Quaternion();
          bay.getWorldPosition(wp);
          bay.getWorldQuaternion(wq);
          addAutoSlidingDoorAtWorld(wp.x, wp.z, wq, 1.64, 2.52);
        }
      });
    });
  };

  // Outdoor Bistro Café Sets & Branded Umbrellas (Corner Ngã 4 Plazas + Mid-Block Terraces offset clear of doorways)
  const addBistroCafeSet = (
    cx: number,
    cz: number,
    canopyMat: THREE.Material,
    chairAxis: 'x' | 'z' = 'x'
  ) => {
    const cg = new THREE.Group();
    cg.position.set(cx, 0, cz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.55, 8), darkMetalFrameMat);
    pole.position.y = 1.275;
    cg.add(pole);
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 14), trimWhiteMat);
    tableTop.position.y = 0.76;
    cg.add(tableTop);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 8), trimWhiteMat);
    cup.position.set(0.18, 0.835, 0.12);
    cg.add(cup);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.42, 0.52, 8), canopyMat);
    canopy.position.y = 2.48;
    cg.add(canopy);
    [-0.78, 0.78].forEach((o) => {
      const ox = chairAxis === 'x' ? o : 0;
      const oz = chairAxis === 'z' ? o : 0;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), darkMetalFrameMat);
      seat.position.set(ox, 0.45, oz);
      cg.add(seat);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.34), darkMetalFrameMat);
      leg.position.set(ox, 0.22, oz);
      cg.add(leg);
      const back = new THREE.Mesh(
        chairAxis === 'x' ? new THREE.BoxGeometry(0.06, 0.46, 0.4) : new THREE.BoxGeometry(0.4, 0.46, 0.06),
        darkMetalFrameMat
      );
      back.position.set(
        ox + (chairAxis === 'x' ? Math.sign(o) * 0.17 : 0),
        0.68,
        oz + (chairAxis === 'z' ? Math.sign(o) * 0.17 : 0)
      );
      cg.add(back);
    });
    staticGroup.add(cg);
  };
  addBistroCafeSet(wx(164.2), 163.5, umbrellaFabricMat, 'x');
  addBistroCafeSet(wx(169.8), 163.5, umbrellaFabricMat, 'x');
  addBistroCafeSet(wx(217.2), 163.5, emeraldUmbrellaMat, 'x');
  addBistroCafeSet(wx(222.8), 163.5, emeraldUmbrellaMat, 'x');
  addBistroCafeSet(wx(164.2), 328.5, umbrellaFabricMat, 'x');

  // Connecting Shophouse Bridge Rows sealing both North (Z = 166.0) & South (Z = 326.0) ends between adjacent Vinhomes blocks
  const buildConnectingShophouseRow = (end: 'north' | 'south') => {
    if (!opts?.connectEastToX || opts.connectEastToX <= wx(224.45) + 1.5) return;
    const isNorth = end === 'north';
    const frontZ = isNorth ? VINHOMES_SHOPHOUSE_START_Z : VINHOMES_SHOPHOUSE_END_Z;
    const gapStartX = wx(224.45);
    const gapEndX = opts.connectEastToX;
    const gapSpan = gapEndX - gapStartX;
    const unitCount = Math.max(1, Math.round(gapSpan / 8.5));
    const unitW = gapSpan / unitCount;
    const isSingleBay = unitW < 6.0;
    const depth = 12.4;
    const doorQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), isNorth ? Math.PI : 0);

    for (let u = 0; u < unitCount; u++) {
      const uxCenter = gapStartX + (u + 0.5) * unitW;
      const brandIdx = (u * 3 + (isNorth ? 2 : 13) + Math.round(Math.abs(dx) * 0.25)) % SHOP_SIGN_BRANDS.length;
      const brand = SHOP_SIGN_BRANDS[brandIdx];
      const signTex = createCornerSignTexture(
        brand.name,
        brand.sub,
        brand.accent,
        brand.bg,
        brand.logo,
        brand.badgeColor
      );
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: 0xffffff,
        emissiveMap: signTex,
        emissiveIntensity: 0.65,
        roughness: 0.28,
      });
      cornerSignMats.push(signMat);

      const unitGrp = new THREE.Group();
      unitGrp.position.set(uxCenter, 0, frontZ);
      unitGrp.rotation.y = isNorth ? Math.PI : 0;

      const hw = unitW * 0.5;
      const addP = (
        geo: THREE.BufferGeometry,
        mat: THREE.Material,
        lx: number,
        ly: number,
        lz: number,
        rx = 0,
        ry = 0,
        rz = 0
      ) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(lx, ly, lz);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        if (rz) m.rotation.z = rz;
        unitGrp.add(m);
        return m;
      };

      // 1. Ground Floor Hollow Walk-In Interior (Y = 0..4.35, depth 10.2m open + 2.2m rear core)
      addP(new THREE.BoxGeometry(unitW, 0.04, depth), oakFloorMat, 0, 0.02, -depth * 0.5);
      addP(new THREE.BoxGeometry(unitW, 0.16, depth), creamWallMat, 0, 4.27, -depth * 0.5);
      addP(new THREE.BoxGeometry(unitW, 4.35, 2.2), charcoalStoneMat, 0, 2.175, -11.3);
      addP(new THREE.BoxGeometry(unitW - 0.36, 4.15, 0.1), creamWallMat, 0, 2.1, -10.16);
      // Side partition walls & charcoal ground pilasters
      [-hw + 0.14, hw - 0.14].forEach((px) => {
        addP(new THREE.BoxGeometry(0.28, 4.35, depth), creamWallMat, px, 2.175, -depth * 0.5);
        addP(new THREE.BoxGeometry(0.42, 4.35, 0.42), charcoalStoneMat, px, 2.175, -0.14);
      });

      // Storefront Glass Facade with Centered 1.72m Automatic Sliding Glass Door
      const gw = unitW - 0.84;
      const sideGlassW = Math.max(0.25, (gw - 1.72) * 0.5);
      [-1, 1].forEach((s) => {
        addP(new THREE.BoxGeometry(sideGlassW, 3.2, 0.08), shopfrontGlassMat, s * (0.86 + sideGlassW * 0.5), 1.85, 0.02);
      });
      const mullions = isSingleBay
        ? [-gw * 0.5, -0.88, 0.88, gw * 0.5]
        : [-gw * 0.5, -gw * 0.28, -0.88, 0.88, gw * 0.28, gw * 0.5];
      mullions.forEach((mx) => {
        addP(new THREE.BoxGeometry(0.09, 3.24, 0.2), darkMetalFrameMat, mx, 1.85, 0.05);
      });
      addP(new THREE.BoxGeometry(1.92, 0.22, 0.22), darkMetalFrameMat, 0, 2.66, 0.05);
      addP(new THREE.BoxGeometry(1.78, 0.02, 0.12), chromeMat, 0, 0.015, 0.02);
      addP(new THREE.BoxGeometry(1.7, 0.68, 0.08), shopfrontGlassMat, 0, 3.1, 0.02);
      addP(new THREE.BoxGeometry(gw + 0.14, 0.1, 0.2), darkMetalFrameMat, 0, 3.46, 0.05);
      addP(new THREE.BoxGeometry(2.1, 0.032, 0.26), plinthGraniteMat, 0, 0.016, 0.22);
      addP(new THREE.BoxGeometry(gw, 0.05, 0.08), ledStripMat, 0, 3.52, 0.14);

      // Illuminated Brand Signboard Fascia (Y = 3.56 .. 4.24)
      const sbW = Math.min(unitW - 0.68, 6.2);
      addP(new THREE.BoxGeometry(sbW + 0.14, 0.72, 0.14), darkMetalFrameMat, 0, 3.9, 0.07);
      addP(new THREE.BoxGeometry(sbW, 0.62, 0.18), signMat, 0, 3.9, 0.1);

      // Furnished Ground-Floor Interior (Counter, Espresso Machine, Wood Slat Feature Wall, Tables, Pendant Lights)
      const barMat = u % 2 === 0 ? espressoWallMat : fabricTealMat;
      const chairMat = u % 2 === 0 ? fabricBeigeMat : fabricTealMat;
      const barW = Math.min(3.8, unitW * 0.56);
      addP(new THREE.BoxGeometry(barW, 1.04, 0.82), barMat, 0, 0.52, -7.8);
      addP(new THREE.BoxGeometry(barW + 0.1, 0.08, 0.92), marbleFloorMat, 0, 1.06, -7.8);
      addP(new THREE.BoxGeometry(0.74, 0.44, 0.42), chromeMat, -barW * 0.24, 1.32, -7.8);
      addP(new THREE.BoxGeometry(Math.min(1.15, barW * 0.34), 0.54, 0.52), mezzRailGlassMat, barW * 0.22, 1.37, -7.8);
      addP(new THREE.BoxGeometry(Math.min(3.2, unitW - 0.9), 0.72, 0.08), signMat, 0, 2.85, -10.06);
      addWallSlatPanel(unitGrp, -hw + 0.34, -4.6, 10, 3.7, 0.04);
      addP(new THREE.BoxGeometry(unitW * 0.68, 0.06, 0.26), interiorLightMat, 0, 4.14, -3.2);
      addP(new THREE.BoxGeometry(unitW * 0.68, 0.06, 0.26), interiorLightMat, 0, 4.14, -6.8);
      (isSingleBay ? [-0.65, 0.65] : [-1.1, 0, 1.1]).forEach((px) => addPendantLamp(unitGrp, px, 4.16, 0.9, -7.2));
      if (isSingleBay) {
        addIndoorCafeTable(unitGrp, 0, 0.04, -4.2, chairMat);
      } else {
        addIndoorCafeTable(unitGrp, -hw * 0.48, 0.04, -3.4, chairMat);
        addIndoorCafeTable(unitGrp, hw * 0.48, 0.04, -3.8, chairMat);
      }
      addTopiaryPot(unitGrp, -hw + 0.62, 0.04, -1.2, 0.85);
      addTopiaryPot(unitGrp, hw - 0.62, 0.04, -1.2, 0.85);

      // 2. Upper Floors 2 & 3 Structural Slabs, Rear Wall, Stucco Facade & Furnished Interiors (Y = 4.35 .. 12.95)
      addP(new THREE.BoxGeometry(unitW, 0.28, depth), oakFloorMat, 0, 4.52, -depth * 0.5);
      addP(new THREE.BoxGeometry(unitW, 0.26, depth), oakFloorMat, 0, 8.75, -depth * 0.5);
      addP(new THREE.BoxGeometry(unitW, 0.24, depth), creamWallMat, 0, 12.82, -depth * 0.5);
      addP(new THREE.BoxGeometry(unitW, 8.6, 0.32), stuccoWhiteMat, 0, 8.65, -depth + 0.16);
      addP(new THREE.BoxGeometry(unitW - 0.4, 8.2, 0.08), espressoWallMat, 0, 8.65, -depth + 0.36);
      [-hw + 0.16, hw - 0.16].forEach((px) => {
        addP(new THREE.BoxGeometry(0.32, 8.6, depth), stuccoWhiteMat, px, 8.65, -depth * 0.5);
      });

      // Stucco Front Spandrels & Neoclassical Pilasters around Upper Window Bays (1 centered bay for narrow seams, 2 bays for full units)
      const bayXs = isSingleBay ? [0] : [-unitW * 0.24, unitW * 0.24];
      const winW = isSingleBay ? Math.min(2.15, unitW * 0.48) : Math.min(2.3, unitW * 0.28);
      if (isSingleBay) {
        const outerPierW = Math.max(0.42, hw - winW * 0.5);
        [-hw + outerPierW * 0.5, hw - outerPierW * 0.5].forEach((px) => {
          addP(new THREE.BoxGeometry(outerPierW, 8.55, 0.32), stuccoWhiteMat, px, 8.65, -0.14);
        });
        [-hw + 0.22, hw - 0.22].forEach((px) => {
          addP(new THREE.BoxGeometry(0.4, 8.45, 0.22), trimWhiteMat, px, 8.6, 0.04);
        });
      } else {
        const bayOffset = unitW * 0.24;
        const outerPierW = Math.max(0.45, hw - bayOffset - winW * 0.5);
        const midPierW = Math.max(0.55, bayOffset * 2 - winW);
        [-hw + outerPierW * 0.5, hw - outerPierW * 0.5].forEach((px) => {
          addP(new THREE.BoxGeometry(outerPierW, 8.55, 0.32), stuccoWhiteMat, px, 8.65, -0.14);
        });
        addP(new THREE.BoxGeometry(midPierW, 8.55, 0.32), stuccoWhiteMat, 0, 8.65, -0.14);
        [-hw + 0.24, 0, hw - 0.24].forEach((px) => {
          addP(new THREE.BoxGeometry(0.42, 8.45, 0.22), trimWhiteMat, px, 8.6, 0.04);
        });
      }
      [
        { y: 5.0, h: 1.3 },
        { y: 8.85, h: 1.85 },
        { y: 12.48, h: 0.96 },
      ].forEach(({ y, h }) => {
        addP(new THREE.BoxGeometry(unitW, h, 0.32), stuccoWhiteMat, 0, y, -0.14);
      });

      // Floor 2 & 3 Interior Glow, Pendant Lamps & Tables visible through windows
      [4.66, 8.88].forEach((fy) => {
        bayXs.forEach((bx) => {
          addIndoorCafeTable(unitGrp, bx, fy, -2.5, chairMat);
          addPendantLamp(unitGrp, bx, fy + 3.86, 1.4, -2.1);
        });
        addP(new THREE.BoxGeometry(unitW * 0.72, 0.06, 0.26), interiorLightMat, 0, fy + 3.85, -2.2);
      });

      // 3. Matching Continuous Cornices, Floor 2 Balcony Ledge & Wrought-Iron Railing (flush with adjacent corner shophouses!)
      addP(new THREE.BoxGeometry(unitW + 0.04, 0.3, depth + 0.95), charcoalStoneMat, 0, 4.47, -depth * 0.5 + 0.475);
      addP(new THREE.BoxGeometry(unitW + 0.04, 0.22, depth + 0.28), trimWhiteMat, 0, 8.77, -depth * 0.5 + 0.14);
      addP(new THREE.BoxGeometry(unitW + 0.04, 0.32, depth + 0.45), trimWhiteMat, 0, 12.98, -depth * 0.5 + 0.225);

      // Floor 2 Wrought-Iron Railing + Lush Flower Planter Box (Y = 4.62 .. 5.50 at Z = +0.84)
      addP(new THREE.BoxGeometry(unitW, 0.07, 0.08), wroughtIronMat, 0, 5.46, 0.84);
      addP(new THREE.BoxGeometry(unitW, 0.05, 0.08), wroughtIronMat, 0, 4.7, 0.84);
      const pickets = Math.max(8, Math.floor(unitW / 0.28));
      for (let pi = 0; pi <= pickets; pi++) {
        const px = -hw + (pi / pickets) * unitW;
        addP(new THREE.BoxGeometry(0.035, 0.78, 0.04), wroughtIronMat, px, 5.07, 0.84);
      }
      addP(new THREE.BoxGeometry(unitW * 0.82, 0.34, 0.34), hedgeMat, 0, 4.98, 0.66);
      addP(
        new THREE.BoxGeometry(unitW * 0.76, 0.14, 0.24),
        u % 2 === 0 ? flowerGoldMat : flowerRedMat,
        0,
        5.16,
        0.66
      );

      // 4. Rooftop Classical White Balustrade Parapet (Y = 13.14 .. 13.86 at Z = +0.26)
      addP(new THREE.BoxGeometry(unitW, 0.12, 0.18), trimWhiteMat, 0, 13.82, 0.26);
      addP(new THREE.BoxGeometry(unitW, 0.1, 0.18), trimWhiteMat, 0, 13.19, 0.26);
      const balSteps = Math.max(6, Math.floor(unitW / 0.48));
      for (let bi = 0; bi <= balSteps; bi++) {
        const bx = -hw + (bi / balSteps) * unitW;
        const isPost = bi === 0 || bi === balSteps || bi === Math.floor(balSteps / 2);
        addP(
          isPost ? new THREE.BoxGeometry(0.22, 0.74, 0.22) : new THREE.CylinderGeometry(0.05, 0.065, 0.54, 6),
          trimWhiteMat,
          bx,
          13.51,
          0.26
        );
      }

      // 5. Steep French Slate Mansard Roof (Y = 13.12 .. 15.82) — extends seamlessly into adjacent corner roofs with ZERO notch!
      const leftPad = u === 0 ? 1.18 : 0.02;
      const rightPad = u === unitCount - 1 ? 1.18 : 0.02;
      const mOuter: Array<[number, number]> = [
        [-hw - (u === 0 ? 0.05 : 0.02), 0.28],
        [hw + (u === unitCount - 1 ? 0.05 : 0.02), 0.28],
        [hw + (u === unitCount - 1 ? 0.05 : 0.02), -depth],
        [-hw - (u === 0 ? 0.05 : 0.02), -depth],
      ];
      const mInner: Array<[number, number]> = [
        [-hw - leftPad, -1.15],
        [hw + rightPad, -1.15],
        [hw + rightPad, -depth + 1.15],
        [-hw - leftPad, -depth + 1.15],
      ];
      addP(createTaperedMansardGeometry(mOuter, mInner, 2.7), roofSlateMat, 0, 13.12, 0);
      addP(
        new THREE.BoxGeometry(unitW + leftPad + rightPad, 0.24, depth - 2.3),
        trimWhiteMat,
        (rightPad - leftPad) * 0.5,
        15.84,
        -depth * 0.5
      );

      // 6. Classical Upper Windows (F2 & F3 + Juliet Balconies) & Mansard Dormer Windows
      bayXs.forEach((bx) => {
        [6.75, 10.9].forEach((wy, fIdx) => {
          [-1, 1].forEach((s) => {
            addP(new THREE.BoxGeometry(0.14, 2.46, 0.14), trimWhiteMat, bx + s * (winW * 0.5 + 0.06), wy, 0.04);
            addP(new THREE.BoxGeometry(winW + 0.26, 0.14, 0.14), trimWhiteMat, bx, wy + s * 1.16, 0.04);
          });
          [-winW * 0.42, winW * 0.42].forEach((drx) => {
            addP(new THREE.BoxGeometry(winW * 0.14, 2.12, 0.06), fabricBeigeMat, bx + drx, wy, -0.04);
          });
          addP(new THREE.BoxGeometry(winW, 2.2, 0.06), upperWindowGlassMat, bx, wy, 0.06);
          if (fIdx === 1) {
            addP(new THREE.BoxGeometry(winW + 0.45, 0.16, 0.48), trimWhiteMat, bx, 9.52, 0.24);
            addP(new THREE.BoxGeometry(winW + 0.36, 0.06, 0.06), wroughtIronMat, bx, 10.22, 0.44);
            const jCols = Math.max(3, Math.floor((winW + 0.36) / 0.24));
            for (let ci = 0; ci <= jCols; ci++) {
              const cx = -(winW + 0.36) * 0.5 + (ci / jCols) * (winW + 0.36);
              addP(new THREE.BoxGeometry(0.03, 0.64, 0.03), wroughtIronMat, bx + cx, 9.9, 0.44);
            }
          }
        });

        // Mansard Dormer Window (Y = 13.66 .. 15.20)
        const dw = 1.55;
        const dormZ = -0.35;
        [-1, 1].forEach((s) => {
          addP(new THREE.BoxGeometry(0.18, 1.48, 1.35), trimWhiteMat, bx + s * (dw * 0.5 - 0.09), 14.32, dormZ);
        });
        addP(new THREE.BoxGeometry(dw, 0.16, 1.35), trimWhiteMat, bx, 13.66, dormZ);
        addP(new THREE.BoxGeometry(dw - 0.2, 1.4, 0.14), espressoWallMat, bx, 14.32, dormZ - 0.58);
        addP(new THREE.BoxGeometry(dw - 0.44, 0.08, 0.36), interiorLightMat, bx, 14.88, dormZ + 0.18);
        addP(new THREE.BoxGeometry(dw - 0.34, 1.15, 0.06), upperWindowGlassMat, bx, 14.28, dormZ + 0.65);
        addP(new THREE.BoxGeometry(dw + 0.18, 0.18, 1.5), roofSlateMat, bx, 15.12, dormZ);
      });

      staticGroup.add(unitGrp);

      // Register Interactive Proximity-Animated Automatic Sliding Glass Door
      addAutoSlidingDoorAtWorld(uxCenter, frontZ + (isNorth ? -0.02 : 0.02), doorQuat, 1.72, 2.54);

      // Sidewalk Bistro Café Umbrella Set (for full-width connecting units, offset cleanly clear of doorway)
      if (!isSingleBay) {
        const bistroX = uxCenter + (u % 2 === 0 ? -unitW * 0.28 : unitW * 0.28);
        addBistroCafeSet(
          bistroX,
          isNorth ? 163.5 : 328.5,
          u % 3 === 0 ? emeraldUmbrellaMat : u % 3 === 1 ? umbrellaFabricMat : bistroUmbrellaMat,
          'x'
        );
      }
    }
  };
  buildConnectingShophouseRow('north');
  buildConnectingShophouseRow('south');
  addBistroCafeSet(wx(172.8), 328.5, umbrellaFabricMat, 'x');
  addBistroCafeSet(wx(214.2), 328.5, emeraldUmbrellaMat, 'x');
  addBistroCafeSet(wx(222.8), 328.5, emeraldUmbrellaMat, 'x');
  addBistroCafeSet(wx(176.5), 175.8, bistroUmbrellaMat, 'z');
  addBistroCafeSet(wx(176.5), 231.8, bistroUmbrellaMat, 'z');
  addBistroCafeSet(wx(210.5), 175.8, emeraldUmbrellaMat, 'z');
  addBistroCafeSet(wx(210.5), 215.8, bistroUmbrellaMat, 'z');
  addBistroCafeSet(wx(210.5), 271.8, bistroUmbrellaMat, 'z');

  const buildShophouseUnit = (unitIdx: number, side: 'west' | 'east') => {
    if (unitIdx === 0) {
      buildCornerShophouse(side, 'north');
      return;
    }
    if (unitIdx === VINHOMES_SHOPHOUSE_COUNT_PER_SIDE - 1) {
      buildCornerShophouse(side, 'south');
      return;
    }
    const unitZ =
      VINHOMES_SHOPHOUSE_START_Z +
      unitIdx * VINHOMES_SHOPHOUSE_UNIT_WIDTH +
      VINHOMES_SHOPHOUSE_UNIT_WIDTH * 0.5;
    const isEastFacing = side === 'west';
    // Front facade aligns flush at wx(175.0) (West Row) or wx(212.0) (East Row)
    // Local +Z faces outward toward the avenue; unit depth is 12.5m (local Z = -12.5 .. 0.0)
    const unitGrp = new THREE.Group();
    unitGrp.position.set(wx(isEastFacing ? 175.0 : 212.0), 0, unitZ);
    unitGrp.rotation.y = isEastFacing ? Math.PI / 2 : -Math.PI / 2;

    const W = VINHOMES_SHOPHOUSE_UNIT_WIDTH; // 8.0m along local X
    const D = 12.5; // depth along local -Z
    const isGabledBay = unitIdx % 2 === 0;
    const signIndex = isEastFacing ? unitIdx : 20 + unitIdx;
    const brand = SHOP_SIGN_BRANDS[signIndex];

    const addPart = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      lx: number,
      ly: number,
      lz: number,
      rx = 0,
      ry = 0,
      rz = 0
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(lx, ly, lz);
      if (rx) m.rotation.x = rx;
      if (ry) m.rotation.y = ry;
      if (rz) m.rotation.z = rz;
      unitGrp.add(m);
      return m;
    };

    const addOpenJulietRailing = (wx: number, baseY: number, zPos: number, rw = 1.66, rh = 0.58) => {
      addPart(new THREE.BoxGeometry(rw, 0.055, 0.06), wroughtIronMat, wx, baseY + rh, zPos);
      addPart(new THREE.BoxGeometry(rw, 0.045, 0.06), wroughtIronMat, wx, baseY + 0.04, zPos);
      const bars = 6;
      for (let bi = 0; bi <= bars; bi++) {
        const bx = wx - rw * 0.5 + (bi / bars) * rw;
        addPart(new THREE.BoxGeometry(0.03, rh - 0.04, 0.035), wroughtIronMat, bx, baseY + rh * 0.5, zPos);
      }
    };

    // 1. Deep 10.2m Hollow Commercial Showroom Shell (Ground + Mezzanine: lz = -0.15..-10.35, Y = 0..6.45)
    //    Rear Residential Structural Core (lz = -5.55..-12.68) leaves 5.2m-deep Hollow Floor 2 & 3 Rooms (lz = -0.35..-5.55)!
    addPart(new THREE.BoxGeometry(W - 0.04, 7.30, 7.13), stuccoWhiteMat, 0, 10.10, -9.115);
    addPart(new THREE.BoxGeometry(W - 0.04, 6.45, 2.33), stuccoWhiteMat, 0, 3.225, -11.515);
    // Left & Right interior party walls (Ground + Upper Floors)
    [-3.84, 3.84].forEach((wx) => {
      addPart(new THREE.BoxGeometry(0.28, 6.45, 10.2), creamWallMat, wx, 3.225, -5.25);
      addPart(new THREE.BoxGeometry(0.28, 7.30, 5.4), creamWallMat, wx, 10.10, -2.85);
    });

    // Pick themed interior floor, back wall, and accent chair materials by brand category
    const floorMat =
      brand.interior === 'cafe' || brand.interior === 'fashion'
        ? oakFloorMat
        : brand.interior === 'fnb' || brand.interior === 'showroom'
          ? darkTileFloorMat
          : marbleFloorMat;
    const backWallMat =
      brand.interior === 'cafe'
        ? unitIdx % 2 === 0
          ? espressoWallMat
          : creamWallMat
        : brand.interior === 'fnb'
          ? brickWarmMat
          : brand.interior === 'showroom'
            ? darkSlateWallMat
            : brand.interior === 'bank'
              ? mintWallMat
              : creamWallMat;
    const chairMat =
      brand.interior === 'fnb'
        ? fabricRedMat
        : brand.interior === 'bank'
          ? fabricNavyMat
          : brand.interior === 'cafe'
            ? unitIdx % 2 === 0
              ? fabricTealMat
              : fabricBeigeMat
            : fabricBeigeMat;

    // Ground Floor Slab + Deep Back Feature Wall + Mezzanine Overlook Slab + Floating Staircase + Interior LEDs
    addPart(new THREE.BoxGeometry(7.45, 0.04, 10.2), floorMat, 0, 0.02, -5.25);
    addPart(new THREE.BoxGeometry(7.45, 6.28, 0.14), backWallMat, 0, 3.16, -10.28);
    // Recessed Mezzanine Floor Slab (Y = 3.85, depth 8.45m -> leaves 1.75m double-height sunlit atrium at front glass!)
    addPart(new THREE.BoxGeometry(7.45, 0.2, 8.45), floorMat, 0, 3.85, -6.125);
    // Mezzanine Overlook Glass + Brushed Brass Handrail
    addPart(new THREE.BoxGeometry(7.4, 0.88, 0.05), mezzRailGlassMat, 0, 4.39, -1.92);
    addPart(new THREE.BoxGeometry(7.4, 0.06, 0.09), goldAccentMat, 0, 4.84, -1.92);
    // Open-Riser Floating Staircase up to Mezzanine along Rear Left Wall (lx = -3.22, lz = -6.3 .. -9.8)
    for (let stepIdx = 0; stepIdx < 10; stepIdx++) {
      const sy = 0.36 + stepIdx * 0.37;
      const sz = -6.35 - stepIdx * 0.36;
      addPart(new THREE.BoxGeometry(0.84, 0.07, 0.32), woodWarmMat, -3.22, sy, sz);
    }
    addPart(new THREE.BoxGeometry(0.06, 0.08, 4.2), darkMetalFrameMat, -2.8, 2.2, -8.0, 0.78, 0, 0);
    // Architectural Side-Wall Wood Slats & Brand Lightboxes (both floors!)
    addWallSlatPanel(unitGrp, 3.66, -3.5, 11, 3.6, 0.04);
    addWallSlatPanel(unitGrp, -3.66, -3.0, 9, 3.6, 0.04);
    // Ceiling + 3 Full-Width Warm Recessed LED Light Strips on Both Levels
    addPart(new THREE.BoxGeometry(7.45, 0.18, 10.2), creamWallMat, 0, 6.32, -5.25);
    [-1.2, -4.6, -8.2].forEach((cz) => {
      addPart(new THREE.BoxGeometry(6.4, 0.05, 0.26), interiorLightMat, 0, 6.21, cz);
    });
    [-3.2, -6.2, -9.0].forEach((cz) => {
      addPart(new THREE.BoxGeometry(5.8, 0.05, 0.24), interiorLightMat, 0, 3.72, cz);
    });

    // Illuminated Brand Signage on Deep Back Wall (Ground + Mezzanine, 10:1 unstretched HD!)
    const indoorSignGeo = createAtlasSignBoxGeometry(5.2, 0.54, 0.08, signIndex % 20, 2, 10);
    addPart(indoorSignGeo, getSignAtlasMat(signIndex), 0.3, 2.75, -10.16);
    const mezzSignGeo = createAtlasSignBoxGeometry(4.4, 0.46, 0.08, signIndex % 20, 2, 10);
    addPart(mezzSignGeo, getSignAtlasMat(signIndex), 0.3, 5.35, -10.16);

    // Build Rich Multi-Zone 3D Interior Furniture across 10.2m Ground Floor + Mezzanine
    if (brand.interior === 'cafe') {
      // Deep Espresso Bar Counter (lz = -7.6) + Marble Countertop + Espresso Machines + Cake Showcase + Bar Stools
      addPart(new THREE.BoxGeometry(4.6, 1.02, 0.84), espressoWallMat, 0.6, 0.53, -7.6);
      addPart(new THREE.BoxGeometry(4.7, 0.07, 0.94), marbleFloorMat, 0.6, 1.06, -7.6);
      addPart(new THREE.CylinderGeometry(0.025, 0.025, 4.2, 8), goldAccentMat, 0.6, 0.22, -7.06, 0, 0, Math.PI / 2);
      [-0.8, 0.4, 1.6].forEach((sx) => addBarStool(unitGrp, sx, 0.04, -6.78, chairMat));
      addPart(new THREE.BoxGeometry(0.82, 0.46, 0.42), chromeMat, 1.55, 1.32, -7.6);
      addPart(new THREE.CylinderGeometry(0.1, 0.12, 0.38, 10), darkMetalFrameMat, 0.75, 1.3, -7.6);
      addPart(new THREE.BoxGeometry(1.2, 0.54, 0.54), mezzRailGlassMat, -0.65, 1.36, -7.56);
      [-0.95, -0.65, -0.35].forEach((cx, ci) => {
        addPart(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 10), ci === 0 ? flowerRedMat : ci === 1 ? flowerGoldMat : fabricBeigeMat, cx, 1.22, -7.56);
      });
      [-1.0, 0.6, 2.1].forEach((px) => addPendantLamp(unitGrp, px, 3.72, 0.85, -7.4));
      // Right-wall Banquette Sofa + 4 Ground-Floor Café Tables (keeping center entry path open!)
      addPart(new THREE.BoxGeometry(0.7, 0.44, 3.6), chairMat, 3.3, 0.24, -3.5);
      addPart(new THREE.BoxGeometry(0.16, 0.52, 3.6), chairMat, 3.6, 0.66, -3.5);
      addIndoorCafeTable(unitGrp, -2.1, 0.04, -2.1, chairMat);
      addIndoorCafeTable(unitGrp, 2.0, 0.04, -2.1, chairMat);
      addIndoorCafeTable(unitGrp, -1.6, 0.04, -4.7, chairMat);
      addIndoorCafeTable(unitGrp, 2.0, 0.04, -4.7, chairMat);
      addTopiaryPot(unitGrp, -3.1, 0.04, -1.35, 0.85);
      addTopiaryPot(unitGrp, 3.1, 0.04, -9.5, 0.85);
      // 3 Upstairs Mezzanine Café Lounge Tables
      addIndoorCafeTable(unitGrp, -1.8, 3.95, -4.2, chairMat);
      addIndoorCafeTable(unitGrp, 1.8, 3.95, -4.2, chairMat);
      addIndoorCafeTable(unitGrp, 1.6, 3.95, -7.6, chairMat);
    } else if (brand.interior === 'fnb') {
      // Deep Open Show Kitchen Pass + Double Chrome Exhaust Hoods (lz = -8.8)
      addPart(new THREE.BoxGeometry(5.4, 1.0, 0.86), darkSlateWallMat, 0.4, 0.52, -8.8);
      addPart(new THREE.BoxGeometry(5.5, 0.07, 0.96), chromeMat, 0.4, 1.04, -8.8);
      addPart(new THREE.BoxGeometry(4.8, 0.56, 0.96), chromeMat, 0.4, 3.15, -8.9);
      [-1.0, 0.4, 1.8].forEach((px) => addPendantLamp(unitGrp, px, 3.72, 0.85, -8.5));
      // 4 Restaurant Dining / Hotpot Booths (2 front + 2 mid-rear, leaving center aisle open!)
      [
        { tx: -2.0, tz: -2.35 },
        { tx: 2.0, tz: -2.35 },
        { tx: -1.4, tz: -5.55 },
        { tx: 2.0, tz: -5.55 },
      ].forEach(({ tx, tz }) => {
        addPart(new THREE.BoxGeometry(1.36, 0.07, 0.88), woodWarmMat, tx, 0.76, tz);
        addPart(new THREE.BoxGeometry(0.18, 0.72, 0.18), darkMetalFrameMat, tx, 0.38, tz);
        addPart(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), chromeMat, tx, 0.81, tz);
        addPart(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), flowerGoldMat, tx, 0.85, tz);
        [-0.36, 0.36].forEach((px) => {
          addPart(new THREE.CylinderGeometry(0.11, 0.09, 0.04, 8), trimWhiteMat, tx + px, 0.81, tz + 0.18);
        });
        [-0.74, 0.74].forEach((bz) => {
          addPart(new THREE.BoxGeometry(1.24, 0.44, 0.44), chairMat, tx, 0.24, tz + bz);
          addPart(new THREE.BoxGeometry(1.24, 0.48, 0.1), chairMat, tx, 0.68, tz + bz + Math.sign(bz) * 0.18);
        });
        addPendantLamp(unitGrp, tx, 3.72, 1.15, tz);
      });
      // Upstairs Mezzanine Dining Sets
      addIndoorCafeTable(unitGrp, -1.8, 3.95, -4.2, chairMat);
      addIndoorCafeTable(unitGrp, 1.8, 3.95, -4.2, chairMat);
      addIndoorCafeTable(unitGrp, 1.6, 3.95, -7.6, chairMat);
    } else if (brand.interior === 'retail') {
      // 4 Illuminated Beverage / Pharmacy Chiller Cabinets along Deep Rear Wall (lz = -9.85)
      [-1.4, 0.2, 1.8, 3.15].forEach((cx) => {
        addPart(new THREE.BoxGeometry(1.42, 2.35, 0.68), darkSlateWallMat, cx, 1.2, -9.85);
        addPart(new THREE.BoxGeometry(1.26, 2.05, 0.06), chillerLedMat, cx, 1.24, -9.49);
        [0.58, 1.05, 1.52, 1.98].forEach((sy, si) => {
          const itemMat = si === 0 ? flowerRedMat : si === 1 ? flowerGoldMat : si === 2 ? fabricTealMat : fabricNavyMat;
          addPart(new THREE.BoxGeometry(1.16, 0.2, 0.14), itemMat, cx, sy, -9.44);
        });
      });
      // 4 Long Stocked Gondola Aisles (front & rear rows, clear walking aisles at center & front!)
      [0.0, 2.1].forEach((gx) => {
        [-2.9, -6.4].forEach((gz) => {
          addPart(new THREE.BoxGeometry(0.62, 1.68, 2.45), creamWallMat, gx, 0.86, gz);
          [0.44, 0.84, 1.24, 1.64].forEach((sy, si) => {
            const prodMat = (si + (gx > 0 ? 1 : 0)) % 3 === 0 ? flowerRedMat : si % 2 === 0 ? flowerGoldMat : fabricNavyMat;
            addPart(new THREE.BoxGeometry(0.76, 0.22, 2.25), prodMat, gx, sy, gz);
          });
        });
      });
      // Front-left Cashier Counter + POS Screen + Basket Stack
      addPart(new THREE.BoxGeometry(1.75, 0.98, 0.72), darkSlateWallMat, -2.35, 0.51, -2.55);
      addPart(new THREE.BoxGeometry(0.46, 0.34, 0.06), atmScreenMat, -2.2, 1.24, -2.55);
      addPart(new THREE.BoxGeometry(0.42, 0.45, 0.34), flowerRedMat, -1.25, 0.26, -1.5);
      // Upstairs Mezzanine Display Shelving
      [-1.8, 0.2, 2.2].forEach((mx) => {
        addPart(new THREE.BoxGeometry(1.7, 1.55, 0.6), creamWallMat, mx, 4.72, -5.8);
        addPart(new THREE.BoxGeometry(1.55, 0.26, 0.66), flowerGoldMat, mx, 4.95, -5.8);
      });
    } else if (brand.interior === 'fashion') {
      // 2 Illuminated Window Display Pedestals with Multi-Part Styled Mannequins
      [-2.2, 2.2].forEach((mx, mi) => {
        addPart(new THREE.BoxGeometry(1.2, 0.36, 0.96), marbleFloorMat, mx, 0.2, -1.15);
        const suitMat = mi === 0 ? fabricNavyMat : fabricRedMat;
        addPart(new THREE.CylinderGeometry(0.18, 0.15, 0.78, 10), suitMat, mx, 1.44, -1.15);
        addPart(new THREE.BoxGeometry(0.56, 0.12, 0.14), suitMat, mx, 1.72, -1.15);
        addPart(new THREE.CylinderGeometry(0.08, 0.08, 0.68, 8), darkMetalFrameMat, mx, 0.72, -1.15);
        addPart(new THREE.SphereGeometry(0.13, 10, 10), fabricBeigeMat, mx, 1.96, -1.15);
        addPendantLamp(unitGrp, mx, 3.72, 0.7, -1.15);
      });
      // 2 Center Tiered Folded-Apparel Display Tables with Colorful Garment Stacks
      [-3.1, -6.2].forEach((tz, ti) => {
        addPart(new THREE.BoxGeometry(2.1, 0.82, 1.1), woodWarmMat, 0.1, 0.43, tz);
        addPart(new THREE.BoxGeometry(0.58, 0.28, 0.56), ti === 0 ? fabricTealMat : flowerRedMat, -0.45, 0.98, tz);
        addPart(new THREE.BoxGeometry(0.58, 0.34, 0.56), fabricBeigeMat, 0.45, 1.01, tz);
      });
      // Illuminated Side-Wall Garment Racks (Full right wall + front-left wall)
      [-2.8, -6.4].forEach((rz) => {
        addPart(new THREE.BoxGeometry(0.12, 1.72, 2.8), chromeMat, 3.25, 0.88, rz);
        addPart(new THREE.BoxGeometry(0.4, 1.0, 2.4), fabricNavyMat, 3.25, 1.15, rz);
      });
      addPart(new THREE.BoxGeometry(0.12, 1.72, 2.6), chromeMat, -3.25, 0.88, -3.2);
      addPart(new THREE.BoxGeometry(0.4, 1.0, 2.2), fabricRedMat, -3.25, 1.15, -3.2);
      // Rear VIP Fitting Room Curtains + Boutique Cashier Desk + Mezzanine Racks
      addPart(new THREE.BoxGeometry(1.8, 2.4, 0.85), fabricBeigeMat, 2.3, 1.24, -9.6);
      addPart(new THREE.BoxGeometry(2.4, 1.0, 0.72), darkSlateWallMat, -0.8, 0.52, -8.5);
      addPart(new THREE.BoxGeometry(3.8, 1.5, 0.45), chromeMat, 0.4, 4.7, -4.8);
      addPart(new THREE.BoxGeometry(2.2, 0.82, 1.1), woodWarmMat, 0.4, 4.35, -7.2);
    } else if (brand.interior === 'bank') {
      // Front Customer Waiting Lounge + Brochure Kiosk
      addPart(new THREE.BoxGeometry(2.2, 0.44, 0.84), fabricNavyMat, -2.1, 0.24, -2.25);
      addPart(new THREE.BoxGeometry(2.2, 0.52, 0.16), fabricNavyMat, -2.1, 0.66, -2.62);
      addPart(new THREE.BoxGeometry(2.2, 0.44, 0.84), fabricNavyMat, 2.1, 0.24, -2.25);
      addPart(new THREE.BoxGeometry(2.2, 0.52, 0.16), fabricNavyMat, 2.1, 0.66, -2.62);
      addPart(new THREE.BoxGeometry(1.15, 0.42, 0.6), marbleFloorMat, 2.1, 0.23, -3.45);
      // 3 Sleek Teller / Consultation Desks with Glass Privacy Screens + Monitors (lz = -5.8)
      [-1.4, 0.4, 2.2].forEach((bx) => {
        addPart(new THREE.BoxGeometry(1.55, 0.96, 0.72), trimWhiteMat, bx, 0.5, -5.8);
        addPart(new THREE.BoxGeometry(1.5, 0.54, 0.05), mezzRailGlassMat, bx, 1.25, -5.46);
        addPart(new THREE.BoxGeometry(0.42, 0.3, 0.05), atmScreenMat, bx, 1.16, -5.82);
      });
      // Rear Glass VIP Consultation Room (lz = -8.6)
      addPart(new THREE.BoxGeometry(3.8, 2.6, 0.06), mezzRailGlassMat, 1.0, 1.34, -7.5);
      addPart(new THREE.BoxGeometry(2.6, 0.76, 1.15), woodWarmMat, 1.0, 0.42, -8.8);
      addPendantLamp(unitGrp, 1.0, 3.72, 0.9, -8.8);
      addTopiaryPot(unitGrp, 3.05, 0.04, -1.4, 0.95);
      // Upstairs Mezzanine Conference Room Table
      addPart(new THREE.BoxGeometry(3.8, 0.76, 1.35), woodWarmMat, 0.4, 4.33, -5.6);
    } else {
      // 'showroom' (VINFAST Deep 10.2m Flagship EV Showroom): 2 Illuminated Turntables + 2 EV Cars + 2 EV Scooters + Fast Charger!
      // Front Turntable + Blue EV SUV
      addPart(new THREE.CylinderGeometry(1.85, 1.98, 0.08, 24), marbleFloorMat, 0.9, 0.06, -2.9);
      addPart(new THREE.CylinderGeometry(2.08, 2.08, 0.03, 24), interiorLightMat, 0.9, 0.03, -2.9);
      addPart(new THREE.CylinderGeometry(1.68, 1.68, 0.08, 24), interiorLightMat, 0.9, 5.95, -2.9);
      const evCar = buildCityCarMesh({
        color: 0x0284c7,
        variant: 'suv',
        headlightIntensity: 1.3,
        brakeIntensity: 0.4,
        noMerge: true,
      });
      evCar.group.position.set(0.9, 0.1, -2.9);
      evCar.group.rotation.y = Math.PI * 0.22;
      unitGrp.add(evCar.group);
      // Rear Turntable + Red EV Sport Coupe
      addPart(new THREE.CylinderGeometry(1.75, 1.88, 0.08, 24), marbleFloorMat, 0.9, 0.06, -7.3);
      addPart(new THREE.CylinderGeometry(1.98, 1.98, 0.03, 24), interiorLightMat, 0.9, 0.03, -7.3);
      const evCoupe = buildCityCarMesh({
        color: 0xe11d48,
        variant: 'coupe',
        headlightIntensity: 1.3,
        brakeIntensity: 0.4,
        noMerge: true,
      });
      evCoupe.group.position.set(0.9, 0.1, -7.3);
      evCoupe.group.rotation.y = -Math.PI * 0.22;
      unitGrp.add(evCoupe.group);
      // 2 EV Scooters on Front-Left Plinths
      [-2.5, -4.9].forEach((mz, mi) => {
        const evMoto = buildCityMotorbikeMesh({
          color: mi === 0 ? 0xf8fafc : 0x0ea5e9,
          variant: 'scooter',
          includeRider: false,
          headlightIntensity: 0.7,
          brakeIntensity: 0.2,
          noMerge: true,
        });
        evMoto.group.position.set(-2.25, 0.04, mz);
        evMoto.group.rotation.y = -Math.PI * 0.2;
        unitGrp.add(evMoto.group);
      });
      // Glowing Cyan EV Fast Charger + VIP Consultation Desk + Mezzanine Lounge
      addPart(new THREE.BoxGeometry(0.45, 1.9, 0.38), darkSlateWallMat, 3.25, 0.98, -5.0);
      addPart(new THREE.BoxGeometry(0.28, 0.48, 0.06), atmScreenMat, 3.01, 1.35, -5.0);
      addPart(new THREE.BoxGeometry(2.6, 0.98, 0.72), darkSlateWallMat, -1.2, 0.51, -8.8);
      addPart(new THREE.BoxGeometry(2.4, 0.46, 0.84), fabricBeigeMat, 0.4, 4.18, -5.2);
    }

    // 2. Granite Base Plinth (split under left & right window bays, leaving center automatic doorway clear!) + Brass Trim
    [-2.435, 2.435].forEach((px) => {
      addPart(new THREE.BoxGeometry(3.11, 0.36, 0.42), plinthGraniteMat, px, 0.18, -0.09);
    });
    [-3.75, 3.75].forEach((px) => {
      addPart(new THREE.BoxGeometry(0.48, 6.19, 0.44), charcoalStoneMat, px, 3.455, -0.04);
      addPart(new THREE.BoxGeometry(0.08, 3.1, 0.06), goldAccentMat, px, 1.9, 0.2);
    });

    // 3. Floor 1 Ground Shopfront (Y = 0.26 .. 3.82) — Clear Side Glass + Automatic Sliding Glass Doors!
    [-2.175, 2.175].forEach((gx) => {
      addPart(new THREE.BoxGeometry(2.6, 3.56, 0.08), shopfrontGlassMat, gx, 2.04, -0.06);
    });
    // Automatic Door Operator Header + Brushed Floor Track (moving glass leaves live in dynamicGroup!)
    addPart(new THREE.BoxGeometry(1.9, 0.22, 0.24), darkMetalFrameMat, 0, 2.68, -0.04);
    addPart(new THREE.BoxGeometry(1.82, 0.025, 0.14), chromeMat, 0, 0.015, -0.05);
    // Top glass transom above automatic doorway + full-height mullions up to raised signboard header (Y = 3.82)
    addPart(new THREE.BoxGeometry(1.75, 1.04, 0.08), shopfrontGlassMat, 0, 3.28, -0.06);
    [-3.45, -1.75, -0.88, 0.88, 1.75, 3.45].forEach((mx) => {
      addPart(new THREE.BoxGeometry(0.1, 3.6, 0.2), darkMetalFrameMat, mx, 2.05, -0.05);
    });
    addPart(new THREE.BoxGeometry(1.78, 0.032, 0.24), plinthGraniteMat, 0, 0.016, 0.16);
    // Horizontal storefront transom bar (at canopy mount Y = 3.08), upper signboard header (Y = 3.82), & soffit LED
    addPart(new THREE.BoxGeometry(7.05, 0.1, 0.22), darkMetalFrameMat, 0, 3.08, -0.04);
    addPart(new THREE.BoxGeometry(7.05, 0.12, 0.24), darkMetalFrameMat, 0, 3.82, -0.04);
    addPart(new THREE.BoxGeometry(6.5, 0.045, 0.08), ledStripMat, 0, 3.01, 0.22);

    // 4. Sleek Dark-Steel & Glass Rain Canopy Overhang (Y = 3.08, projects 1.30m cleanly below raised signboard)
    addPart(new THREE.BoxGeometry(7.52, 0.08, 0.12), darkMetalFrameMat, 0, 3.08, 0.06);
    addPart(new THREE.BoxGeometry(7.52, 0.08, 0.09), darkMetalFrameMat, 0, 3.08, 1.3);
    [-3.72, -1.75, 1.75, 3.72].forEach((cx) => {
      addPart(new THREE.BoxGeometry(0.08, 0.075, 1.3), darkMetalFrameMat, cx, 3.08, 0.68);
    });
    addPart(new THREE.BoxGeometry(7.32, 0.035, 1.16), canopyGlassMat, 0, 3.09, 0.68);
    const upAxis = new THREE.Vector3(0, 1, 0);
    [-3.38, -1.75, 1.75, 3.38].forEach((rx) => {
      const pStart = new THREE.Vector3(rx, 3.11, 1.24);
      const pEnd = new THREE.Vector3(rx, 3.82, 0.02);
      const dir = pEnd.clone().sub(pStart);
      const rodLen = dir.length();
      const mid = pStart.clone().add(pEnd).multiplyScalar(0.5);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, rodLen, 8), darkMetalFrameMat);
      rod.position.copy(mid);
      rod.quaternion.setFromUnitVectors(upAxis, dir.normalize());
      unitGrp.add(rod);
      addPart(new THREE.BoxGeometry(0.08, 0.06, 0.08), darkMetalFrameMat, rx, 3.13, 1.24);
      addPart(new THREE.BoxGeometry(0.08, 0.08, 0.08), darkMetalFrameMat, rx, 3.82, 0.04);
    });

    // Warm Evening Sidewalk Storefront Light Pool under Canopy
    addPart(new THREE.PlaneGeometry(7.8, 5.4), sharedPoolMat, 0, 0.016, 2.5, -Math.PI / 2, 0, 0);

    // 5. Luxury Beveled Commercial Shop Signboard Fascia (10:1 HD unstretched + Top Spotlights + Square Blade Sign)
    addPart(new THREE.BoxGeometry(7.18, 0.82, 0.14), darkMetalFrameMat, 0, 4.24, 0.02);
    addPart(new THREE.BoxGeometry(7.04, 0.72, 0.16), goldAccentMat, 0, 4.24, 0.04);
    const signGeo = createAtlasSignBoxGeometry(6.94, 0.68, 0.18, signIndex % 20, 2, 10);
    addPart(signGeo, getSignAtlasMat(signIndex), 0, 4.24, 0.08);
    // 3 Architectural Top Gooseneck Spotlights illuminating the sign
    [-2.1, 0, 2.1].forEach((sx) => {
      addPart(new THREE.BoxGeometry(0.04, 0.04, 0.34), darkMetalFrameMat, sx, 4.66, 0.2);
      addPart(new THREE.CylinderGeometry(0.055, 0.075, 0.08, 8), darkMetalFrameMat, sx, 4.62, 0.36);
      addPart(new THREE.SphereGeometry(0.036, 8, 6), interiorLightMat, sx, 4.58, 0.36);
    });
    // Square 1:1 Heritage Medallion Blade Sign under Canopy
    addPart(new THREE.BoxGeometry(0.06, 0.06, 0.56), goldAccentMat, -3.35, 2.66, 0.28);
    const bladeGeo = createAtlasSignBoxGeometry(0.5, 0.5, 0.07, signIndex, 4, 10);
    addPart(bladeGeo, bladeAtlasMat, -3.35, 2.48, 0.54, 0, Math.PI / 2, 0);

    // Flanking potted topiaries + Outdoor A-Frame Menu Stand on alternating shops
    if (unitIdx % 2 === 1) {
      addTopiaryPot(unitGrp, -2.95, 0, 0.26, 0.9);
      addTopiaryPot(unitGrp, 2.95, 0, 0.26, 0.9);
    } else {
      addPart(new THREE.BoxGeometry(0.46, 0.86, 0.06), woodWarmMat, -1.35, 0.44, 0.52, -0.15, 0.2, 0);
      addPart(new THREE.BoxGeometry(0.38, 0.62, 0.07), housingMat, -1.35, 0.48, 0.525, -0.15, 0.2, 0);
    }

    // 6. Mezzanine / Floor 1.5 Panoramic Clear Glass Band (Y = 4.66 .. 6.32) cleanly above Signboard!
    addPart(new THREE.BoxGeometry(6.95, 1.6, 0.08), shopfrontGlassMat, 0, 5.49, -0.06);
    [-3.45, -1.75, 0, 1.75, 3.45].forEach((mx) => {
      addPart(new THREE.BoxGeometry(0.1, 1.66, 0.2), darkMetalFrameMat, mx, 5.49, -0.05);
    });
    addPart(new THREE.BoxGeometry(7.1, 0.1, 0.2), darkMetalFrameMat, 0, 4.66, -0.05);
    addPart(new THREE.BoxGeometry(7.1, 0.1, 0.2), darkMetalFrameMat, 0, 6.32, -0.05);

    // 7. Continuous Floor 2 Balcony Terrace Ledge & Classical White Balustrade (Y = 6.45 .. 7.55)
    addPart(new THREE.BoxGeometry(W, 0.28, 1.05), trimWhiteMat, 0, 6.55, 0.42);
    addPart(new THREE.BoxGeometry(W, 0.12, 0.16), trimWhiteMat, 0, 7.52, 0.86);
    addPart(new THREE.BoxGeometry(W, 0.12, 0.16), trimWhiteMat, 0, 6.74, 0.86);
    [-3.82, 0, 3.82].forEach((bx) => {
      addPart(new THREE.BoxGeometry(0.24, 0.88, 0.22), trimWhiteMat, bx, 7.12, 0.86);
    });
    for (let bx = -3.3; bx <= 3.35; bx += 0.55) {
      if (Math.abs(bx) < 0.22) continue;
      addPart(new THREE.CylinderGeometry(0.05, 0.065, 0.68, 6), trimWhiteMat, bx, 7.12, 0.86);
    }

    // 8. Active Floor 2 & Floor 3 Facade with REAL Open Window Cavities, Crystal-Clear Glass & 5.2m Deep Lit Rooms!
    const upperFrontZ = isGabledBay ? 0.08 : -0.35;
    // Split facade into 3 vertical stucco piers (leaving twin 1.48m window openings at wx = ±1.78!)
    addPart(new THREE.BoxGeometry(1.0, 6.95, 0.36), stuccoGreyMat, -3.02, 10.225, upperFrontZ - 0.16);
    addPart(new THREE.BoxGeometry(2.08, 6.95, 0.36), stuccoGreyMat, 0, 10.225, upperFrontZ - 0.16);
    addPart(new THREE.BoxGeometry(1.0, 6.95, 0.36), stuccoGreyMat, 3.02, 10.225, upperFrontZ - 0.16);
    // Horizontal spandrels between windows (keep Type A Floor 3 arch top Y = 12.69..13.42 unobstructed!)
    [-1.78, 1.78].forEach((wx) => {
      addPart(new THREE.BoxGeometry(1.5, 0.77, 0.36), stuccoGreyMat, wx, 7.135, upperFrontZ - 0.16);
      addPart(new THREE.BoxGeometry(1.5, 1.12, 0.36), stuccoGreyMat, wx, 10.2, upperFrontZ - 0.16);
      addPart(new THREE.BoxGeometry(1.5, isGabledBay ? 0.28 : 0.6, 0.36), stuccoGreyMat, wx, isGabledBay ? 13.58 : 13.4, upperFrontZ - 0.16);
    });
    // Deep 5.2m Interior Floor 2 & Floor 3 Warm-Lit Rooms behind clear glass (contrast accent back walls + oak floors!)
    const upperRoomWallMat =
      unitIdx % 4 === 0 ? espressoWallMat : unitIdx % 4 === 1 ? mintWallMat : unitIdx % 4 === 2 ? brickWarmMat : darkSlateWallMat;
    addPart(new THREE.BoxGeometry(7.35, 6.9, 0.16), upperRoomWallMat, 0, 10.15, -5.45);
    addPart(new THREE.BoxGeometry(7.35, 0.14, 5.25), oakFloorMat, 0, 6.66, upperFrontZ - 2.65);
    addPart(new THREE.BoxGeometry(7.35, 0.18, 5.25), oakFloorMat, 0, 10.28, upperFrontZ - 2.65);
    addPart(new THREE.BoxGeometry(7.35, 0.14, 5.25), creamWallMat, 0, 13.52, upperFrontZ - 2.65);
    // Interior lounge sofa along center pier (visible from both Floor 2 windows)
    addPart(new THREE.BoxGeometry(2.1, 0.44, 0.88), chairMat, 0, 6.95, upperFrontZ - 3.65);
    addPart(new THREE.BoxGeometry(2.1, 0.5, 0.18), chairMat, 0, 7.36, upperFrontZ - 4.02);

    [-3.76, 3.76].forEach((px) => {
      addPart(new THREE.BoxGeometry(0.48, 7.05, 0.56), trimWhiteMat, px, 10.25, upperFrontZ - 0.12);
    });
    addPart(new THREE.BoxGeometry(W + 0.06, 0.22, 0.66), trimWhiteMat, 0, 10.28, upperFrontZ - 0.04);
    addPart(new THREE.BoxGeometry(W + 0.12, 0.26, 0.72), trimWhiteMat, 0, 13.72, upperFrontZ - 0.02);

    // Floor 2 Balcony Bistro Table & Warm Balcony Wall Sconce (on Type B recessed terraces)
    if (!isGabledBay) {
      addPart(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 10), marbleFloorMat, 0, 7.36, 0.3);
      addPart(new THREE.CylinderGeometry(0.04, 0.14, 0.66, 8), darkMetalFrameMat, 0, 7.02, 0.3);
      addPart(new THREE.BoxGeometry(0.24, 0.34, 0.28), chairMat, -0.5, 6.95, 0.3);
      addPart(new THREE.BoxGeometry(0.24, 0.34, 0.28), chairMat, 0.5, 6.95, 0.3);
    }
    addPart(new THREE.SphereGeometry(0.08, 8, 6), interiorLightMat, 0, 8.75, upperFrontZ + 0.12);

    // Floor 2 Twin Tall French Windows with HOLLOW 4-Bar Frame + Open Juliet Balconies + Deep Lit Rooms
    [-1.78, 1.78].forEach((wx) => {
      [-0.805, 0.805].forEach((ox) => {
        addPart(new THREE.BoxGeometry(0.14, 2.38, 0.14), trimWhiteMat, wx + ox, 8.58, upperFrontZ + 0.04);
      });
      [-1.125, 1.125].forEach((oy) => {
        addPart(new THREE.BoxGeometry(1.75, 0.14, 0.14), trimWhiteMat, wx, 8.58 + oy, upperFrontZ + 0.04);
      });
      addPart(new THREE.BoxGeometry(1.48, 2.12, 0.06), upperWindowGlassMat, wx, 8.58, upperFrontZ + 0.06);
      addOpenJulietRailing(wx, 7.42, upperFrontZ + 0.26, 1.64, 0.56);
      // Warm Floor 2 deep room ceiling LED strips + brass pendant + table & chairs + bookshelf + plant + wall sconce
      addPart(new THREE.BoxGeometry(1.8, 0.05, 0.26), interiorLightMat, wx, 9.95, upperFrontZ - 1.35);
      addPart(new THREE.BoxGeometry(0.24, 0.05, 3.6), interiorLightMat, wx, 9.95, upperFrontZ - 2.35);
      addPendantLamp(unitGrp, wx, 9.96, 1.35, upperFrontZ - 1.35);
      addPart(new THREE.BoxGeometry(0.18, 2.05, 0.06), fabricBeigeMat, wx - 0.62, 8.58, upperFrontZ - 0.26);
      addPart(new THREE.BoxGeometry(0.18, 2.05, 0.06), fabricBeigeMat, wx + 0.62, 8.58, upperFrontZ - 0.26);
      addIndoorCafeTable(unitGrp, wx, 6.73, upperFrontZ - 1.65, chairMat);
      addTopiaryPot(unitGrp, wx + 0.52, 6.73, upperFrontZ - 0.95, 0.85);
      addPart(new THREE.BoxGeometry(1.35, 2.2, 0.45), woodWarmMat, wx, 7.83, upperFrontZ - 4.7);
      addPart(new THREE.BoxGeometry(0.95, 0.52, 0.06), interiorLightMat, wx, 9.15, -5.34);
    });

    if (isGabledBay) {
      // TYPE A: Twin Tall Arched Windows on Floor 3 (Hollow 3-Bar + Hollow Arch Ring + Crystal-Clear Glass!)
      [-1.78, 1.78].forEach((wx) => {
        [-0.805, 0.805].forEach((ox) => {
          addPart(new THREE.BoxGeometry(0.14, 1.95, 0.14), trimWhiteMat, wx + ox, 11.72, upperFrontZ + 0.04);
        });
        addPart(new THREE.BoxGeometry(1.75, 0.14, 0.14), trimWhiteMat, wx, 10.81, upperFrontZ + 0.04);
        addPart(archTrimGeo, trimWhiteMat, wx, 12.69, upperFrontZ + 0.04);
        addPart(new THREE.BoxGeometry(0.24, 0.26, 0.18), trimWhiteMat, wx, 13.54, upperFrontZ + 0.06);
        addPart(new THREE.BoxGeometry(1.46, 1.82, 0.06), upperWindowGlassMat, wx, 11.78, upperFrontZ + 0.06);
        addPart(archGlassGeo, upperWindowGlassMat, wx, 12.69, upperFrontZ + 0.06);
        // Deep Lit Floor 3 Room interior
        addPart(new THREE.BoxGeometry(1.8, 0.05, 0.26), interiorLightMat, wx, 13.34, upperFrontZ - 1.35);
        addPart(new THREE.BoxGeometry(0.24, 0.05, 3.6), interiorLightMat, wx, 13.34, upperFrontZ - 2.35);
        addPendantLamp(unitGrp, wx, 13.34, 1.28, upperFrontZ - 1.35);
        addPart(new THREE.BoxGeometry(0.18, 1.75, 0.06), fabricTealMat, wx - 0.62, 11.72, upperFrontZ - 0.26);
        addPart(new THREE.BoxGeometry(0.18, 1.75, 0.06), fabricTealMat, wx + 0.62, 11.72, upperFrontZ - 0.26);
        addIndoorCafeTable(unitGrp, wx, 10.37, upperFrontZ - 1.65, chairMat);
        addTopiaryPot(unitGrp, wx + 0.52, 10.37, upperFrontZ - 0.95, 0.85);
        addPart(new THREE.BoxGeometry(1.35, 2.05, 0.45), woodWarmMat, wx, 11.4, upperFrontZ - 4.7);
        addPart(new THREE.BoxGeometry(0.95, 0.52, 0.06), interiorLightMat, wx, 12.55, -5.34);
        // Open wrought-iron Juliet balcony + lush flower box visible behind pickets
        addOpenJulietRailing(wx, 10.62, upperFrontZ + 0.34, 1.68, 0.58);
        addPart(new THREE.BoxGeometry(1.45, 0.24, 0.28), hedgeMat, wx, 10.65, upperFrontZ + 0.22);
        addPart(new THREE.BoxGeometry(1.25, 0.12, 0.22), unitIdx % 4 === 0 ? flowerRedMat : flowerGoldMat, wx, 10.78, upperFrontZ + 0.24);
      });

      // Triangular Classical Pediment / Gable + Circular Medallion
      addPart(gableTrimGeo, trimWhiteMat, 0, 13.84, upperFrontZ - 0.08);
      addPart(gableTympGeo, stuccoGreyMat, 0, 13.84, upperFrontZ - 0.04);
      addPart(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16), trimWhiteMat, 0, 14.78, upperFrontZ + 0.24, Math.PI / 2, 0, 0);

      // Pitched Dark Slate Roof behind gable
      addPart(roofPrismGeo, roofSlateMat, 0, 13.84, -5.55);
    } else {
      // TYPE B: Recessed Floor 3 + Stepped Classical White Balustrade Terrace + Hollow 4-Bar Windows + Mansard Roof
      addPart(new THREE.BoxGeometry(W, 0.12, 0.18), trimWhiteMat, 0, 11.22, 0.15);
      addPart(new THREE.BoxGeometry(W, 0.12, 0.18), trimWhiteMat, 0, 10.46, 0.15);
      [-3.76, 0, 3.76].forEach((bx) => {
        addPart(new THREE.BoxGeometry(0.24, 0.85, 0.24), trimWhiteMat, bx, 10.84, 0.15);
      });
      for (let bx = -3.2; bx <= 3.25; bx += 0.65) {
        if (Math.abs(bx) < 0.22) continue;
        addPart(new THREE.CylinderGeometry(0.05, 0.065, 0.68, 6), trimWhiteMat, bx, 10.84, 0.15);
      }
      [-2.8, 2.8].forEach((sx) => {
        addPart(new THREE.BoxGeometry(1.1, 0.35, 0.45), hedgeMat, sx, 10.65, -0.15);
      });

      [-1.78, 1.78].forEach((wx) => {
        [-0.76, 0.76].forEach((ox) => {
          addPart(new THREE.BoxGeometry(0.13, 2.15, 0.14), trimWhiteMat, wx + ox, 12.15, upperFrontZ + 0.04);
        });
        [-1.01, 1.01].forEach((oy) => {
          addPart(new THREE.BoxGeometry(1.65, 0.13, 0.14), trimWhiteMat, wx, 12.15 + oy, upperFrontZ + 0.04);
        });
        addPart(new THREE.BoxGeometry(1.4, 1.9, 0.06), upperWindowGlassMat, wx, 12.15, upperFrontZ + 0.06);
        addPart(new THREE.BoxGeometry(1.8, 0.05, 0.26), interiorLightMat, wx, 13.34, upperFrontZ - 1.35);
        addPart(new THREE.BoxGeometry(0.24, 0.05, 3.6), interiorLightMat, wx, 13.34, upperFrontZ - 2.35);
        addPendantLamp(unitGrp, wx, 13.34, 1.28, upperFrontZ - 1.35);
        addPart(new THREE.BoxGeometry(0.18, 1.85, 0.06), fabricBeigeMat, wx - 0.6, 12.15, upperFrontZ - 0.26);
        addPart(new THREE.BoxGeometry(0.18, 1.85, 0.06), fabricBeigeMat, wx + 0.6, 12.15, upperFrontZ - 0.26);
        addIndoorCafeTable(unitGrp, wx, 10.37, upperFrontZ - 1.65, chairMat);
        addTopiaryPot(unitGrp, wx + 0.52, 10.37, upperFrontZ - 0.95, 0.85);
        addPart(new THREE.BoxGeometry(1.35, 2.05, 0.45), woodWarmMat, wx, 11.4, upperFrontZ - 4.7);
        addPart(new THREE.BoxGeometry(0.95, 0.52, 0.06), interiorLightMat, wx, 12.55, -5.34);
      });

      addPart(new THREE.BoxGeometry(W, 1.55, D - 1.2), roofSlateMat, 0, 14.5, -D * 0.5 - 0.3);
      addPart(new THREE.BoxGeometry(W + 0.08, 0.22, 0.4), trimWhiteMat, 0, 15.28, upperFrontZ - 0.65);
    }

    staticGroup.add(unitGrp);
    // Register this Shophouse's Automatic Sliding Door in World Space
    const doorRotY = isEastFacing ? Math.PI / 2 : -Math.PI / 2;
    const doorQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, doorRotY, 0));
    addAutoSlidingDoorAtWorld(wx(isEastFacing ? 174.95 : 212.05), unitZ, doorQuat, 1.72, 2.54);
  };

  for (let i = 0; i < VINHOMES_SHOPHOUSE_COUNT_PER_SIDE; i++) {
    buildShophouseUnit(i, 'west');
    buildShophouseUnit(i, 'east');
  }

  // Bank ATMs (Techcombank unit 4 at Z = 199.5 West; BIDV unit 7 at Z = 223.5 East)
  const addBankAtm = (ax: number, az: number, rotY: number, headerHex: number) => {
    const atm = new THREE.Group();
    atm.position.set(ax, 0, az);
    atm.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.85, 0.46), atmBodyMat);
    body.position.y = 0.925;
    atm.add(body);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.04), atmScreenMat);
    screen.position.set(0, 1.24, 0.23);
    atm.add(screen);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.16), chromeMat);
    tray.position.set(0, 0.92, 0.26);
    atm.add(tray);
    const capMat = new THREE.MeshStandardMaterial({ color: headerHex, emissive: headerHex, emissiveIntensity: 0.35, roughness: 0.4 });
    neonMats.push(capMat);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.24, 0.54), capMat);
    cap.position.y = 1.92;
    atm.add(cap);
    staticGroup.add(atm);
  };
  addBankAtm(wx(175.26), 199.5, Math.PI / 2, 0xee0033); // Techcombank ATM
  addBankAtm(wx(211.74), 223.5, -Math.PI / 2, 0x005855); // BIDV ATM

  // 8 Neatly Parked Resident Scooters along Shopfront Apron (placed cleanly between shophouse doorways!)
  const parkedScooters: Array<{ x: number; z: number; yaw: number; color: number }> = [
    { x: wx(176.6), z: 183.2, yaw: Math.PI * 0.34, color: 0x0ea5e9 },
    { x: wx(176.6), z: 189.2, yaw: Math.PI * 0.32, color: 0xf8fafc },
    { x: wx(176.6), z: 191.5, yaw: Math.PI * 0.35, color: 0xef4444 },
    { x: wx(176.6), z: 196.8, yaw: Math.PI * 0.30, color: 0x10b981 },
    { x: wx(176.6), z: 212.5, yaw: Math.PI * 0.33, color: 0xf59e0b },
    { x: wx(210.4), z: 183.5, yaw: -Math.PI * 0.34, color: 0x1e293b },
    { x: wx(210.4), z: 189.8, yaw: -Math.PI * 0.32, color: 0xf43f5e },
    { x: wx(210.4), z: 236.6, yaw: -Math.PI * 0.33, color: 0x3b82f6 },
  ];
  parkedScooters.forEach((ps) => {
    const built = buildCityMotorbikeMesh({
      color: ps.color,
      variant: 'scooter',
      includeRider: false,
      headlightIntensity: 0.0,
      brakeIntensity: 0.0,
      noMerge: true,
    });
    built.group.position.set(ps.x, 0.0, ps.z);
    built.group.rotation.y = ps.yaw;
    staticGroup.add(built.group);
  });


  // =========================================================================
  // PART 7: BOULEVARD STREETLAMPS, TREES & MANICURED CURB HEDGES
  // =========================================================================
  const sharedLampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xffe082,
    emissiveIntensity: 0.0,
    roughness: 0.3,
  });
  lanternMats.push(sharedLampGlowMat);

  const lampBannerTex = createVinhomesStreetSignTex('VINHOMES', 'OCEAN PARK', '#065f46');
  const lampBannerMat = new THREE.MeshStandardMaterial({
    map: lampBannerTex,
    emissive: 0xffffff,
    emissiveMap: lampBannerTex,
    emissiveIntensity: 0.22,
    roughness: 0.45,
  });

  const addBoulevardLamp = (x: number, z: number, armDirX: number, armDirZ: number, withBanner = false) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.40, 10), poleDarkMat);
    base.position.y = 0.2;
    grp.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 10), poleDarkMat);
    pole.position.y = 2.5;
    grp.add(pole);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(armDirX) > 0 ? 0.8 : 0.08, 0.08, Math.abs(armDirZ) > 0 ? 0.8 : 0.08),
      poleDarkMat
    );
    arm.position.set(armDirX * 0.35, 4.7, armDirZ * 0.35);
    grp.add(arm);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), sharedLampGlowMat);
    lantern.position.set(armDirX * 0.7, 4.55, armDirZ * 0.7);
    grp.add(lantern);

    if (withBanner && Math.abs(armDirX) > 0) {
      const bFlag = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.15, 0.05), lampBannerMat);
      bFlag.position.set(-armDirX * 0.34, 3.4, 0);
      grp.add(bFlag);
      [3.98, 2.82].forEach((by) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.04), poleDarkMat);
        bar.position.set(-armDirX * 0.34, by, 0);
        grp.add(bar);
      });
    }

    const swPool = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 9.5), sharedPoolMat);
    swPool.rotation.x = -Math.PI / 2;
    swPool.position.set(armDirX * 0.2, 0.012, armDirZ * 0.2);
    grp.add(swPool);

    const rdPool = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 11.0), sharedPoolMat);
    rdPool.rotation.x = -Math.PI / 2;
    rdPool.position.set(armDirX * 0.9, -0.248, armDirZ * 0.9);
    grp.add(rdPool);

    staticGroup.add(grp);
  };

  // Shophouse Boulevard Lamps every 16m along both curbs (decorative banners on alternating posts)
  for (let lz = 166; lz <= 326; lz += 16) {
    const showBanner = (lz - 166) % 32 === 16;
    addBoulevardLamp(wx(184.75), lz, 1, 0, showBanner);
    addBoulevardLamp(wx(202.25), lz, -1, 0, showBanner);
  }
  // South Leg Boulevard Lamps beyond South Ngã 4 (Z = 362 .. 426)
  for (let lz = 362; lz <= 426; lz += 16) {
    addBoulevardLamp(wx(184.75), lz, 1, 0, lz === 378 || lz === 410);
    addBoulevardLamp(wx(202.25), lz, -1, 0, lz === 378 || lz === 410);
  }
  // North E-W Crossroad Lamps (Z = 148.0)
  [116, 136, 156, 174, 214, 232, 252, 272]
    .map(wx)
    .filter((lx) => lx >= ewMinX + 3 && lx <= ewMaxX - 3)
    .forEach((lx) => {
      addBoulevardLamp(lx, 139.25, 0, 1);
      addBoulevardLamp(lx, 156.75, 0, -1);
    });
  // South Ngã 4 E-W Crossroad Lamps (Z = 344.0)
  [116, 136, 156, 174, 214, 232, 252, 272]
    .map(wx)
    .filter((lx) => lx >= ewMinX + 3 && lx <= ewMaxX - 3)
    .forEach((lx) => {
      addBoulevardLamp(lx, 335.25, 0, 1);
      addBoulevardLamp(lx, 352.75, 0, -1);
    });

  const addUrbanTree = (x: number, z: number, scale = 1.05) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const grate = new THREE.Mesh(new THREE.BoxGeometry(1.4 * scale, 0.02, 1.4 * scale), grateMat);
    grate.position.y = 0.01;
    t.add(grate);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.2 * scale, 2.5 * scale, 8), trunkMat);
    trunk.position.y = 1.25 * scale;
    t.add(trunk);
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.45 * scale, 1), leafMat1);
    c1.position.set(0, 3.6 * scale, 0);
    t.add(c1);
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05 * scale, 1), leafMat2);
    c2.position.set(0.48 * scale, 4.35 * scale, 0.28 * scale);
    t.add(c2);
    staticGroup.add(t);
  };

  // Curbside Trees between lamps along the 40 Shophouses
  for (let tz = 174; tz <= 322; tz += 16) {
    if (Math.abs(tz - 246) < 4) continue;
    addUrbanTree(wx(183.4), tz, 1.08);
    addUrbanTree(wx(203.6), tz, 1.08);
  }
  // South Leg Curbside Trees (Z = 368 .. 422)
  for (let tz = 368; tz <= 422; tz += 18) {
    addUrbanTree(wx(182.8), tz, 1.04);
    addUrbanTree(wx(204.2), tz, 1.04);
  }
  // North E-W Crossroad Sidewalk Trees (frame the Corner Café Plazas cleanly)
  [112, 128, 146, 158.8, 228.2, 244, 260, 276]
    .map(wx)
    .filter((tx) => tx >= ewMinX + 3 && tx <= ewMaxX - 3)
    .forEach((tx) => {
      addUrbanTree(tx, 136.4, 1.0);
      addUrbanTree(tx, 159.6, 1.0);
    });
  // South Ngã 4 E-W Crossroad Sidewalk Trees (frame South Corner Café Plazas cleanly)
  [112, 128, 146, 158.8, 228.2, 244, 260, 276]
    .map(wx)
    .filter((tx) => tx >= ewMinX + 3 && tx <= ewMaxX - 3)
    .forEach((tx) => {
      addUrbanTree(tx, 332.4, 1.0);
      addUrbanTree(tx, 355.6, 1.0);
    });

  // Low ornamental green hedge strips along sidewalk edges (leaving wide walkable gaps at crosswalks & every 16m)
  for (let hz = 168; hz <= 322; hz += 16) {
    if (Math.abs(hz - 246) < 6) continue;
    const wHedge = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.52, 4.8), hedgeMat);
    wHedge.position.set(wx(183.4), 0.26, hz);
    staticGroup.add(wHedge);

    const eHedge = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.52, 4.8), hedgeMat);
    eHedge.position.set(wx(203.6), 0.26, hz);
    staticGroup.add(eHedge);
  }

  // Flagship Landscaped Center Boulevard Median Islands (Z = 163.2 .. 328.8)
  const flowerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.72 });
  const addBoulevardMedianIsland = (startZ: number, endZ: number, treeZs: number[], lampZs: number[]) => {
    const cx = centerX;
    const bodyLen = endZ - startZ - 1.1;
    const midZ = (startZ + endZ) * 0.5;

    // Stepped Two-Tone Granite Planter Curbs (plinth lower tier + coping cap ledge) & dark soil bed
    [-0.49, 0.49].forEach((ox) => {
      const baseCurb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, bodyLen), plinthGraniteMat);
      baseCurb.position.set(cx + ox, -0.18, midZ);
      staticGroup.add(baseCurb);

      const capCurb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, bodyLen), curbMat);
      capCurb.position.set(cx + ox, -0.06, midZ);
      staticGroup.add(capCurb);
    });
    const soil = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.2, bodyLen), trunkMat);
    soil.position.set(cx, -0.16, midZ);
    staticGroup.add(soil);

    // Sculpted Rounded Granite Island Noses + Illuminated Vinhomes Safety Bollards
    [startZ + 0.55, endZ - 0.55].forEach((nz) => {
      const noseBase = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.16, 16), plinthGraniteMat);
      noseBase.position.set(cx, -0.18, nz);
      staticGroup.add(noseBase);

      const noseCap = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.08, 16), curbMat);
      noseCap.position.set(cx, -0.06, nz);
      staticGroup.add(noseCap);

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.18, 12), plinthGraniteMat);
      plinth.position.set(cx, 0.07, nz);
      staticGroup.add(plinth);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.62, 12), poleDarkMat);
      post.position.set(cx, 0.45, nz);
      staticGroup.add(post);

      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), goldAccentMat);
      ring.position.set(cx, 0.64, nz);
      staticGroup.add(ring);

      const amberBand = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.14, 12), yellowMedianMat);
      amberBand.position.set(cx, 0.48, nz);
      staticGroup.add(amberBand);

      const glowCap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), sharedLampGlowMat);
      glowCap.position.set(cx, 0.82, nz);
      staticGroup.add(glowCap);
    });

    // Multi-Tier Trimmed Emerald Hedge, Topiary Accents & Vibrant Three-Tone Flower Borders
    const lowHedge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, bodyLen - 0.5), hedgeMat);
    lowHedge.position.set(cx, 0.09, midZ);
    staticGroup.add(lowHedge);

    const topHedge = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, bodyLen - 1.2), leafMat1);
    topHedge.position.set(cx, 0.31, midZ);
    staticGroup.add(topHedge);

    for (let fz = startZ + 2.4; fz <= endZ - 2.4; fz += 3.0) {
      if (treeZs.some((tz) => Math.abs(tz - fz) < 1.25)) continue;
      if (lampZs.some((lz) => Math.abs(lz - fz) < 0.85)) continue;
      const idxF = Math.round(fz);
      const flMat = idxF % 3 === 0 ? flowerRedMat : idxF % 3 === 1 ? flowerGoldMat : flowerWhiteMat;
      [-0.24, 0.24].forEach((fx) => {
        const flowerRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 1.35), flMat);
        flowerRibbon.position.set(cx + fx, 0.29, fz);
        staticGroup.add(flowerRibbon);
      });
      if (idxF % 2 === 0) {
        const topiary = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), leafMat2);
        topiary.position.set(cx, 0.48, fz);
        staticGroup.add(topiary);
      }
    }

    // Elevated Multi-Tier Boulevard Median Trees with Wrought-Iron Tree Guards
    treeZs.forEach((tz, ti) => {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.26, 10), wroughtIronMat);
      collar.position.set(cx, 0.11, tz);
      staticGroup.add(collar);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.65, 8), trunkMat);
      trunk.position.set(cx, 1.26, tz);
      staticGroup.add(trunk);

      const mainCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.12, 1), leafMat1);
      mainCrown.position.set(cx, 3.36, tz);
      staticGroup.add(mainCrown);

      const upperCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.84, 1), leafMat2);
      upperCrown.position.set(cx + (ti % 2 === 0 ? 0.22 : -0.22), 4.05, tz + 0.16);
      staticGroup.add(upperCrown);

      const sideCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), leafMat2);
      sideCrown.position.set(cx + (ti % 2 === 0 ? -0.34 : 0.34), 3.1, tz - 0.24);
      staticGroup.add(sideCrown);
    });

    // Heritage Double-Lantern Median Light Posts with Vinhomes Crest Banners & Evening Glow Pools
    lampZs.forEach((lz, li) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.34, 10), poleDarkMat);
      base.position.set(cx, 0.15, lz);
      staticGroup.add(base);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 3.45, 10), poleDarkMat);
      pole.position.set(cx, 1.88, lz);
      staticGroup.add(pole);

      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 8), goldAccentMat);
      finial.position.set(cx, 3.72, lz);
      staticGroup.add(finial);

      const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.15), poleDarkMat);
      crossBar.position.set(cx, 3.48, lz);
      staticGroup.add(crossBar);

      [-0.54, 0.54].forEach((oz) => {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 8), poleDarkMat);
        cap.position.set(cx, 3.4, lz + oz);
        staticGroup.add(cap);

        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), sharedLampGlowMat);
        globe.position.set(cx, 3.24, lz + oz);
        staticGroup.add(globe);
      });

      if (li % 2 === 0) {
        const banner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.92, 0.42), lampBannerMat);
        banner.position.set(cx, 2.55, lz);
        staticGroup.add(banner);
        [3.03, 2.07].forEach((by) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.48), goldAccentMat);
          bar.position.set(cx, by, lz);
          staticGroup.add(bar);
        });
      }

      const pool = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 8.2), sharedPoolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(cx, -0.246, lz);
      staticGroup.add(pool);
    });
  };

  addBoulevardMedianIsland(
    163.2,
    243.4,
    [169.0, 181.5, 194.0, 206.5, 219.0, 231.5, 239.0],
    [175.25, 187.75, 200.25, 212.75, 225.25, 235.25]
  );
  addBoulevardMedianIsland(
    248.6,
    328.8,
    [253.0, 260.5, 273.0, 285.5, 298.0, 310.5, 323.0],
    [256.75, 266.75, 279.25, 291.75, 304.25, 316.75]
  );

  // Continuous Ornamental Hedge & Flower Ribbon along North T-Junction Edge (Z = 134.3) when closedNorthEnd is true
  if (opts?.closedNorthEnd) {
    const northCapHedge = new THREE.Mesh(new THREE.BoxGeometry(ewMaxX - ewMinX - 2.0, 0.56, 0.72), hedgeMat);
    northCapHedge.position.set((ewMinX + ewMaxX) * 0.5, 0.28, 134.25);
    staticGroup.add(northCapHedge);
    const northCapFlower = new THREE.Mesh(new THREE.BoxGeometry(ewMaxX - ewMinX - 4.0, 0.14, 0.34), flowerGoldMat);
    northCapFlower.position.set((ewMinX + ewMaxX) * 0.5, 0.58, 134.25);
    staticGroup.add(northCapFlower);
    addUrbanTree(wx(189.0), 135.8, 0.96);
    addUrbanTree(wx(198.0), 135.8, 0.96);
  }

  // South Ngã 4 & Southern Boulevard Landscaping (Flower Hedges, Garden Lantern Bollards, Park Groves & Welcome Totems)
  [112, 130, 148, 238, 256, 274]
    .map(wx)
    .filter((hx) => hx >= ewMinX + 5.5 && hx <= ewMaxX - 5.5)
    .forEach((hx) => {
      [330.3, 357.7].forEach((hz, sideIdx) => {
        if (sideIdx === 0 && ((opts?.openEastEnd && hx > wx(224)) || (opts?.openWestEnd && hx < wx(162)))) {
          return;
        }
        const zOff = sideIdx === 0 ? -0.45 : 0.45;
        const hStrip = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.54, 0.72), hedgeMat);
        hStrip.position.set(hx, 0.27, hz + zOff);
        staticGroup.add(hStrip);

        const fStrip = new THREE.Mesh(
          new THREE.BoxGeometry(9.6, 0.14, 0.34),
          Math.round(hx) % 4 === 0 ? flowerRedMat : flowerGoldMat
        );
        fStrip.position.set(hx, 0.56, hz + zOff);
        staticGroup.add(fStrip);
      });

      // Background Park Tree Groves beyond South Crossroad Hedges (Z = 362.5)
      addUrbanTree(hx, 362.5, 1.15);
    });

  // South Leg Outer Verge Hedges, Flower Ribbons & Park Trees (Z = 364 .. 422)
  for (let sz = 364; sz <= 422; sz += 14) {
    [wx(179.9), wx(207.1)].forEach((sx, si) => {
      const segHedge = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.52, 9.2), hedgeMat);
      segHedge.position.set(sx, 0.26, sz);
      staticGroup.add(segHedge);

      const fl = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.14, 8.4),
        (sz + si) % 2 === 0 ? flowerGoldMat : flowerRedMat
      );
      fl.position.set(sx, 0.54, sz);
      staticGroup.add(fl);
    });
    addUrbanTree(wx(175.8), sz, 1.12);
    addUrbanTree(wx(211.2), sz, 1.12);
  }

  // Grand Architectural Vinhomes Welcome Totem Pillars at South Ngã 4 Entrance (Z = 356.7)
  const welcomeTotemCanvas = document.createElement('canvas');
  welcomeTotemCanvas.width = 288;
  welcomeTotemCanvas.height = 480;
  const wtCtx = welcomeTotemCanvas.getContext('2d')!;
  wtCtx.fillStyle = '#064e3b';
  wtCtx.fillRect(0, 0, 288, 480);
  wtCtx.strokeStyle = '#fbbf24';
  wtCtx.lineWidth = 8;
  wtCtx.strokeRect(12, 12, 264, 456);
  wtCtx.strokeStyle = 'rgba(255,255,255,0.28)';
  wtCtx.lineWidth = 2;
  wtCtx.strokeRect(22, 22, 244, 436);
  wtCtx.save();
  wtCtx.translate(144, 110);
  wtCtx.scale(1.65, 1.65);
  drawBrandEmblem(wtCtx, 'vinhomes', 0, 0, '#fde047', '#fbbf24');
  wtCtx.restore();
  wtCtx.textAlign = 'center';
  wtCtx.textBaseline = 'middle';
  wtCtx.fillStyle = '#fde047';
  wtCtx.font = '900 40px Georgia, serif';
  wtCtx.fillText('VINHOMES', 144, 224);
  wtCtx.fillStyle = '#ffffff';
  wtCtx.font = '800 28px system-ui, sans-serif';
  wtCtx.fillText('OCEAN PARK', 144, 272);
  wtCtx.fillStyle = '#fbbf24';
  wtCtx.fillRect(54, 312, 180, 3);
  wtCtx.fillStyle = '#fef08a';
  wtCtx.font = '700 22px system-ui, sans-serif';
  wtCtx.fillText('ĐẠI LỘ', 144, 362);
  wtCtx.fillText('NGỌC TRAI', 144, 398);
  const welcomeTotemTex = new THREE.CanvasTexture(welcomeTotemCanvas);
  welcomeTotemTex.colorSpace = THREE.SRGBColorSpace;
  welcomeTotemTex.anisotropy = 4;
  const welcomeTotemMat = new THREE.MeshStandardMaterial({
    map: welcomeTotemTex,
    emissive: 0xffffff,
    emissiveMap: welcomeTotemTex,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  neonMats.push(welcomeTotemMat);
  [wx(181.2), wx(205.8)].forEach((tx) => {
    const tg = new THREE.Group();
    tg.position.set(tx, 0, 356.7);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.48, 1.18), plinthGraniteMat);
    plinth.position.y = 0.24;
    tg.add(plinth);

    const trimBase = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.12, 1.26), curbMat);
    trimBase.position.y = 0.54;
    tg.add(trimBase);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.84, 3.85, 0.84), stuccoWhiteMat);
    shaft.position.y = 2.52;
    tg.add(shaft);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.9), welcomeTotemMat);
    panel.position.y = 3.05;
    tg.add(panel);

    const goldBand = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.1, 0.94), goldAccentMat);
    goldBand.position.y = 4.46;
    tg.add(goldBand);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.22, 1.08), curbMat);
    cap.position.y = 4.62;
    tg.add(cap);

    const crownOrb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), sharedLampGlowMat);
    crownOrb.position.y = 4.98;
    tg.add(crownOrb);

    staticGroup.add(tg);
  });

  // Wrought-Iron & Warm-Wood Promenade Benches in curb tree-line gaps (leaving >5m center walking aisle open)
  const addPromenadeBench = (bx: number, bz: number, rotY: number) => {
    const bg = new THREE.Group();
    bg.position.set(bx, 0, bz);
    bg.rotation.y = rotY;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 1.55), woodWarmMat);
    seat.position.set(0, 0.44, 0);
    bg.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.55), woodWarmMat);
    back.position.set(-0.2, 0.72, 0);
    back.rotation.z = 0.14;
    bg.add(back);
    [-0.68, 0.68].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.08), wroughtIronMat);
      leg.position.set(0, 0.22, lz);
      bg.add(leg);
    });
    staticGroup.add(bg);
  };
  [178.5, 210.5, 258.5, 290.5].forEach((bz) => {
    addPromenadeBench(wx(183.2), bz, 0);
    addPromenadeBench(wx(203.8), bz, Math.PI);
  });

  // =========================================================================
  // PART 8: TRAFFIC LIGHT CYCLE CONTROLLER
  // =========================================================================
  let cycleTimer = 4.0;
  let ewPhase: 'green' | 'yellow' | 'red' = 'green';
  let nsPhase: 'green' | 'yellow' | 'red' = 'red';

  const applyLensState = (list: SignalLensGroup[], phase: 'green' | 'yellow' | 'red') => {
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      g.red.emissiveIntensity = phase === 'red' ? 2.1 : 0.06;
      g.yellow.emissiveIntensity = phase === 'yellow' ? 2.1 : 0.06;
      g.green.emissiveIntensity = phase === 'green' ? 2.1 : 0.06;
    }
  };

  const update = (delta: number, _rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => {
    const dt = Math.min(delta, 0.1);
    cycleTimer = (cycleTimer + dt) % 18.0;
    if (cycleTimer < 6.5) {
      ewPhase = 'green';
      nsPhase = 'red';
    } else if (cycleTimer < 8.0) {
      ewPhase = 'yellow';
      nsPhase = 'red';
    } else if (cycleTimer < 9.5) {
      ewPhase = 'red';
      nsPhase = 'red';
    } else if (cycleTimer < 15.0) {
      ewPhase = 'red';
      nsPhase = 'green';
    } else if (cycleTimer < 16.5) {
      ewPhase = 'red';
      nsPhase = 'yellow';
    } else {
      ewPhase = 'red';
      nsPhase = 'red';
    }
    applyLensState(ewLenses, ewPhase);
    applyLensState(nsLenses, nsPhase);

    // Rich Evening Illumination across all 40 Shophouses (interior bounce, ceiling LEDs, soffit strips, signboards & real PointLights)
    interiorLightMat.emissiveIntensity = 1.35 + lampFactor * 2.95;
    ledStripMat.emissiveIntensity = 0.72 + lampFactor * 3.15;
    chillerLedMat.emissiveIntensity = 1.05 + lampFactor * 2.25;
    upperWindowGlassMat.emissiveIntensity = 0.12 + lampFactor * 0.16;
    signAtlasMatA.emissiveIntensity = 0.65 + lampFactor * 1.25;
    signAtlasMatB.emissiveIntensity = 0.65 + lampFactor * 1.25;
    bladeAtlasMat.emissiveIntensity = 0.6 + lampFactor * 1.15;
    for (let i = 0; i < cornerSignMats.length; i++) {
      cornerSignMats[i].emissiveIntensity = 0.65 + lampFactor * 1.25;
    }
    creamWallMat.emissiveIntensity = 0.4 + lampFactor * 0.48;
    oakFloorMat.emissiveIntensity = 0.34 + lampFactor * 0.38;
    marbleFloorMat.emissiveIntensity = 0.32 + lampFactor * 0.36;
    mintWallMat.emissiveIntensity = 0.32 + lampFactor * 0.36;
    espressoWallMat.emissiveIntensity = 0.32 + lampFactor * 0.32;
    brickWarmMat.emissiveIntensity = 0.32 + lampFactor * 0.32;
    darkSlateWallMat.emissiveIntensity = 0.28 + lampFactor * 0.28;

    const focusZ = playerPos ? THREE.MathUtils.clamp(playerPos.z, 178.0, 326.0) : 210.0;
    const zNearA = THREE.MathUtils.clamp(focusZ - 14.0, 176.0, 312.0);
    const zNearB = THREE.MathUtils.clamp(focusZ + 14.0, 182.0, 326.0);
    const cornerPlazaLightZ = playerPos && playerPos.z > 245.0 ? 328.5 : 163.5;
    nightLights[0].position.set(wx(172.0), 5.2, cornerPlazaLightZ);
    nightLights[1].position.set(wx(215.0), 5.2, cornerPlazaLightZ);
    nightLights[2].position.set(wx(174.0), 4.6, zNearA);
    nightLights[3].position.set(wx(213.0), 4.6, zNearA);
    nightLights[4].position.set(wx(174.0), 4.6, zNearB);
    nightLights[5].position.set(wx(213.0), 4.6, zNearB);
    const ptInt = lampFactor > 0.02 ? lampFactor * 56.0 : 0.0;
    for (let i = 0; i < nightLights.length; i++) {
      nightLights[i].intensity = ptInt;
    }
  };

  update(0, 7.0, 0);

  return {
    staticGroup,
    dynamicGroup,
    autoDoors,
    neonMats,
    lanternMats,
    poolMats,
    getSignalState: () => ({ ewPhase, nsPhase }),
    update,
  };
}

// =========================================================================
// LIVE TRAFFIC & SHOPHOUSE PROMENADE PEDESTRIAN CONTROLLER
// =========================================================================

interface VinhomesCrossVehicle {
  id: string;
  axis: 'ew' | 'ns';
  kind: 'car' | 'motorbike';
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  halfW: number;
  halfL: number;
  wheelR: number;
  dir: 1 | -1;
  laneCoord: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  cruiseSpeed: number;
  priority: number;
}

type VinhomesNpcSchedule = 'day_balcony' | 'day_shop' | 'late_24h';

interface VinhomesPedestrian {
  mode: 'walk' | 'seated' | 'standing';
  schedule: VinhomesNpcSchedule;
  group: THREE.Group;
  hipsGroup: THREE.Group;
  head: THREE.Object3D;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  pauseTimer: number;
  baseX: number;
  baseZ: number;
  baseYaw: number;
  patrolAxis: 'x' | 'z';
  fixedY?: number;
  glbHandle?: GlbHumanHandle;
}

export class VinhomesOceanParkTrafficController {
  public readonly rootGroup = new THREE.Group();
  private readonly coordinator: CityTrafficCoordinator;
  private readonly getSignalState: () => IntersectionSignalState;
  private readonly centerX: number;
  private readonly dx: number;
  private readonly ewMinX: number;
  private readonly ewMaxX: number;
  private readonly nsMinZ: number;
  private readonly idPrefix: string;
  private readonly skipEwTraffic: boolean;
  private readonly extraEwIntersections: Array<{
    centerX: number;
    getSignal: () => IntersectionSignalState;
  }>;
  private readonly extraNsIntersections: Array<{
    centerZ: number;
    northStopZ: number;
    southStopZ: number;
    getSignal: () => IntersectionSignalState;
  }>;
  private readonly vehicles: VinhomesCrossVehicle[] = [];
  private readonly pedestrians: VinhomesPedestrian[] = [];
  private autoDoors: VinhomesAutoDoor[] = [];
  private pedAccum = 0;
  private pedFrame = 0;

  constructor(
    coordinator: CityTrafficCoordinator,
    getSignalState: () => IntersectionSignalState,
    helpers: EastIntersectionCharacterHelpers,
    autoDoors: VinhomesAutoDoor[] = [],
    options?: VinhomesTrafficOptions
  ) {
    this.coordinator = coordinator;
    this.getSignalState = getSignalState;
    this.autoDoors = autoDoors;
    this.centerX = options?.centerX ?? VINHOMES_INTERSECTION_CENTER_X;
    this.dx = this.centerX - VINHOMES_INTERSECTION_CENTER_X;
    this.ewMinX = options?.ewMinX ?? 110.0 + this.dx;
    this.ewMaxX = options?.ewMaxX ?? 277.0 + this.dx;
    this.nsMinZ = options?.nsMinZ ?? 58.0;
    this.idPrefix = options?.idPrefix ? `${options.idPrefix}_` : '';
    this.skipEwTraffic = options?.skipEwTraffic ?? false;
    this.extraEwIntersections = options?.extraEwIntersections ?? [];
    this.extraNsIntersections = options?.extraNsIntersections ?? [];
    this.rootGroup.userData.noMerge = true;
    this.buildCrossroadVehicles();
    this.buildShoppers(helpers);
  }

  public setAutoDoors(autoDoors: VinhomesAutoDoor[]) {
    this.autoDoors = autoDoors;
  }

  private buildCrossroadVehicles() {
    const specs: Array<{
      id: string;
      axis: 'ew' | 'ns';
      kind: 'car' | 'motorbike';
      color: number;
      variant: CityCarVariant;
      xanhSm?: { variant: 'vfe34' | 'vf5'; plate: string };
      dir: 1 | -1;
      laneCoord: number;
      posCoord: number;
      speed: number;
    }> = [
      // E-W Crossroad traffic at Ngã Tư Vinhomes (Z = 148.0)
      { id: 'vh_ew_car_1', axis: 'ew', kind: 'car', color: 0xf8fafc, variant: 'suv', dir: 1, laneCoord: 145.8, posCoord: 122.0, speed: 9.4 },
      { id: 'vh_ew_xanhsm_1', axis: 'ew', kind: 'car', color: 0x00b6be, variant: 'sedan', xanhSm: { variant: 'vfe34', plate: '43H-886.61' }, dir: -1, laneCoord: 150.1, posCoord: 184.0, speed: 9.5 },
      { id: 'vh_ew_car_2', axis: 'ew', kind: 'car', color: 0x0f172a, variant: 'sedan', dir: -1, laneCoord: 150.1, posCoord: 262.0, speed: 9.6 },
      { id: 'vh_ew_car_3', axis: 'ew', kind: 'car', color: 0x0284c7, variant: 'coupe', dir: 1, laneCoord: 142.2, posCoord: 158.0, speed: 10.2 },
      { id: 'vh_ew_moto_1', axis: 'ew', kind: 'motorbike', color: 0xef4444, variant: 'sedan', dir: -1, laneCoord: 153.8, posCoord: 230.0, speed: 10.6 },
      { id: 'vh_ew_moto_2', axis: 'ew', kind: 'motorbike', color: 0x10b981, variant: 'sedan', dir: 1, laneCoord: 142.2, posCoord: 225.0, speed: 10.8 },
      { id: 'vh_ew_moto_3', axis: 'ew', kind: 'motorbike', color: 0x06b6d4, variant: 'sedan', dir: 1, laneCoord: 142.2, posCoord: 138.0, speed: 10.5 },
      { id: 'vh_ew_moto_4', axis: 'ew', kind: 'motorbike', color: 0xfacc15, variant: 'sedan', dir: -1, laneCoord: 153.8, posCoord: 162.0, speed: 10.9 },
      // E-W Crossroad traffic at South Ngã 4 (Z = 344.0)
      { id: 'vh_sew_car_1', axis: 'ew', kind: 'car', color: 0xfef3c7, variant: 'sedan', dir: 1, laneCoord: 341.8, posCoord: 132.0, speed: 9.5 },
      { id: 'vh_sew_xanhsm_1', axis: 'ew', kind: 'car', color: 0x00b6be, variant: 'suv', xanhSm: { variant: 'vf5', plate: '43H-886.62' }, dir: 1, laneCoord: 341.8, posCoord: 214.0, speed: 9.4 },
      { id: 'vh_sew_car_2', axis: 'ew', kind: 'car', color: 0x334155, variant: 'suv', dir: -1, laneCoord: 346.1, posCoord: 254.0, speed: 9.2 },
      { id: 'vh_sew_moto_1', axis: 'ew', kind: 'motorbike', color: 0xe2e8f0, variant: 'sedan', dir: 1, laneCoord: 338.2, posCoord: 162.0, speed: 10.5 },
      { id: 'vh_sew_moto_2', axis: 'ew', kind: 'motorbike', color: 0xf472b6, variant: 'sedan', dir: -1, laneCoord: 349.8, posCoord: 222.0, speed: 10.7 },
      { id: 'vh_sew_moto_3', axis: 'ew', kind: 'motorbike', color: 0x16a34a, variant: 'sedan', dir: 1, laneCoord: 338.2, posCoord: 244.0, speed: 10.8 },
      { id: 'vh_sew_moto_4', axis: 'ew', kind: 'motorbike', color: 0x0284c7, variant: 'sedan', dir: -1, laneCoord: 349.8, posCoord: 146.0, speed: 10.4 },
      // N-S Shophouse Boulevard luxury cars, Xanh SM electric taxis & motorbikes (cruise Z = nsMinZ..420 across all Vinhomes districts!)
      { id: 'vh_ns_xanhsm_1', axis: 'ns', kind: 'car', color: 0x00b6be, variant: 'suv', xanhSm: { variant: 'vfe34', plate: '43H-886.65' }, dir: 1, laneCoord: 191.4, posCoord: this.nsMinZ > 120 ? 168.0 : 98.0, speed: 9.0 },
      { id: 'vh_ns_suv_1', axis: 'ns', kind: 'car', color: 0xe2e8f0, variant: 'suv', dir: 1, laneCoord: 191.4, posCoord: 185.0, speed: 8.8 },
      { id: 'vh_ns_xanhsm_2', axis: 'ns', kind: 'car', color: 0x00b6be, variant: 'sedan', xanhSm: { variant: 'vf5', plate: '43H-886.66' }, dir: -1, laneCoord: 195.6, posCoord: 248.0, speed: 9.1 },
      { id: 'vh_ns_sedan_2', axis: 'ns', kind: 'car', color: 0x1e293b, variant: 'sedan', dir: -1, laneCoord: 195.6, posCoord: 375.0, speed: 9.0 },
      { id: 'vh_ns_moto_1', axis: 'ns', kind: 'motorbike', color: 0xdc2626, variant: 'sedan', dir: 1, laneCoord: 187.4, posCoord: 280.0, speed: 9.8 },
      { id: 'vh_ns_moto_2', axis: 'ns', kind: 'motorbike', color: 0xf8fafc, variant: 'sedan', dir: 1, laneCoord: 187.4, posCoord: this.nsMinZ > 120 ? 176.0 : 118.0, speed: 10.2 },
      { id: 'vh_ns_moto_3', axis: 'ns', kind: 'motorbike', color: 0x06b6d4, variant: 'sedan', dir: -1, laneCoord: 199.6, posCoord: 212.0, speed: 10.4 },
      { id: 'vh_ns_moto_4', axis: 'ns', kind: 'motorbike', color: 0xf97316, variant: 'sedan', dir: -1, laneCoord: 199.6, posCoord: 368.0, speed: 10.1 },
    ];

    // If E-W avenues span continuously into Vinhomes Ocean Park 2 & 3, place extra Xanh SM taxis & motorbikes directly in those zones!
    if (!this.skipEwTraffic && this.ewMaxX > 420) {
      specs.push(
        { id: 'vh_ew_xanhsm_vh2', axis: 'ew', kind: 'car', color: 0x00b6be, variant: 'suv', xanhSm: { variant: 'vf5', plate: '43H-886.63' }, dir: 1, laneCoord: 145.8, posCoord: 348.0, speed: 9.4 },
        { id: 'vh_ew_xanhsm_vh3', axis: 'ew', kind: 'car', color: 0x00b6be, variant: 'sedan', xanhSm: { variant: 'vfe34', plate: '43H-886.64' }, dir: -1, laneCoord: 150.1, posCoord: 486.0, speed: 9.6 },
        { id: 'vh_ew_moto_vh2', axis: 'ew', kind: 'motorbike', color: 0x16a34a, variant: 'sedan', dir: 1, laneCoord: 142.2, posCoord: 326.0, speed: 10.7 },
        { id: 'vh_ew_moto_vh3', axis: 'ew', kind: 'motorbike', color: 0xe11d48, variant: 'sedan', dir: -1, laneCoord: 153.8, posCoord: 468.0, speed: 10.9 },
        { id: 'vh_sew_xanhsm_vh2', axis: 'ew', kind: 'car', color: 0x00b6be, variant: 'sedan', xanhSm: { variant: 'vfe34', plate: '43H-886.67' }, dir: -1, laneCoord: 346.1, posCoord: 392.0, speed: 9.3 },
        { id: 'vh_sew_xanhsm_vh3', axis: 'ew', kind: 'car', color: 0x00b6be, variant: 'suv', xanhSm: { variant: 'vf5', plate: '43H-886.68' }, dir: 1, laneCoord: 341.8, posCoord: 472.0, speed: 9.5 },
        { id: 'vh_sew_moto_vh2', axis: 'ew', kind: 'motorbike', color: 0xfacc15, variant: 'sedan', dir: 1, laneCoord: 338.2, posCoord: 356.0, speed: 10.6 },
        { id: 'vh_sew_moto_vh3', axis: 'ew', kind: 'motorbike', color: 0x06b6d4, variant: 'sedan', dir: -1, laneCoord: 349.8, posCoord: 492.0, speed: 10.8 }
      );
    }

    const helmets = [0x18181b, 0xf472b6, 0xf8fafc];
    const jackets = [0xc2a888, 0xd1d5db, 0xc2a888];
    const pHelmets = [0xdc2626, 0xf8fafc, 0x0f172a];
    const pJackets = [0xe8b4cb, 0x0f766e, 0xe8b4cb];
    let motoIdx = 0;

    specs.forEach((s) => {
      if (this.skipEwTraffic && s.axis === 'ew') return;
      const built =
        s.kind === 'car'
          ? s.xanhSm
            ? buildAmbientXanhSmTaxiCar(s.xanhSm.variant, s.xanhSm.plate, true)
            : buildCityCarMesh({
                color: s.color,
                variant: s.variant,
                headlightIntensity: 0.9,
                brakeIntensity: 0.7,
                noMerge: true,
              })
          : buildCityMotorbikeMesh({
              color: s.color,
              variant: motoIdx % 3 === 2 ? 'sport' : 'scooter',
              helmetColor: helmets[motoIdx % helmets.length],
              jacketColor: jackets[motoIdx % jackets.length],
              includeRider: true,
              includePassenger: motoIdx % 2 === 0,
              passengerHelmetColor: pHelmets[motoIdx % pHelmets.length],
              passengerJacketColor: pJackets[motoIdx % pJackets.length],
              headlightIntensity: 0.9,
              brakeIntensity: 0.7,
              noMerge: true,
            });
      if (s.kind === 'motorbike') motoIdx++;

      const isEW = s.axis === 'ew';
      const laneCoord = isEW ? s.laneCoord : s.laneCoord + this.dx;
      const posCoord = isEW ? s.posCoord + this.dx : s.posCoord;
      const x = isEW ? posCoord : laneCoord;
      const z = isEW ? laneCoord : posCoord;
      const yaw = isEW ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI);
      built.group.position.set(x, -0.26, z);
      built.group.rotation.y = yaw;
      this.rootGroup.add(built.group);

      this.vehicles.push({
        id: `${this.idPrefix}${s.id}`,
        axis: s.axis,
        kind: s.kind,
        group: built.group,
        wheels: built.wheels,
        headlightMat: built.headlightMat,
        brakeMat: built.brakeMat,
        halfW: built.halfW,
        halfL: built.halfL,
        wheelR: built.wheelR,
        dir: s.dir,
        laneCoord,
        x,
        z,
        yaw,
        speed: s.speed,
        cruiseSpeed: s.speed,
        priority: s.kind === 'car' ? 2 : 1,
      });
    });
  }

  private buildShoppers(helpers: EastIntersectionCharacterHelpers) {
    const outfits = [
      { shirt: 0xf43f5e, pants: 0x1e293b, hair: 0x111827, skin: '#fbd3b4' },
      { shirt: 0x0ea5e9, pants: 0x334155, hair: 0x3f2305, skin: '#f5c7a3' },
      { shirt: 0xf59e0b, pants: 0x0f172a, hair: 0x09090b, skin: '#e8b48e' },
      { shirt: 0x10b981, pants: 0x1e293b, hair: 0x451a03, skin: '#fce0c8' },
      { shirt: 0xa855f7, pants: 0x334155, hair: 0x1e1b4b, skin: '#f5c7a3' },
      { shirt: 0xe11d48, pants: 0x18181b, hair: 0x29150b, skin: '#fbd3b4' },
      { shirt: 0x0284c7, pants: 0x0f172a, hair: 0x1f2937, skin: '#f5c7a3' },
      { shirt: 0xd97706, pants: 0x1e293b, hair: 0x09090b, skin: '#fce0c8' },
      { shirt: 0xec4899, pants: 0x0f172a, hair: 0x29150b, skin: '#fbd3b4' },
      { shirt: 0x14b8a6, pants: 0x1e293b, hair: 0x111827, skin: '#f5c7a3' },
      { shirt: 0x6366f1, pants: 0x334155, hair: 0x09090b, skin: '#fce0c8' },
      { shirt: 0xf97316, pants: 0x18181b, hair: 0x451a03, skin: '#e8b48e' },
    ];

    const bagColors = [0xf43f5e, 0xfacc15, 0x0ea5e9, 0x00563b, 0xa855f7, 0xf97316, 0xec4899, 0x10b981];

    const createNpcRig = (
      of: { shirt: number; pants: number; hair: number; skin: string },
      prop?: { kind: 'bag' | 'cup' | 'tray'; color?: number }
    ) => {
      const grp = new THREE.Group();
      const hipsGroup = new THREE.Group();
      grp.add(hipsGroup);

      const skinMat = new THREE.MeshStandardMaterial({ color: of.skin, roughness: 0.7 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: of.shirt, roughness: 0.72 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: of.pants, roughness: 0.8 });
      const hairMat = new THREE.MeshStandardMaterial({ color: of.hair, roughness: 0.85 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), shirtMat);
      torso.position.y = 1.04;
      hipsGroup.add(torso);

      const faceTex = helpers.createFaceTexture('happy', of.skin);
      const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
      head.position.y = 1.48;
      const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
      hairCap.position.y = 0.13;
      head.add(hairCap);
      hipsGroup.add(head);

      const makeArm = (ax: number) => {
        const p = new THREE.Group();
        p.position.set(ax, 1.26, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), shirtMat);
        m.position.y = -0.18;
        p.add(m);
        hipsGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.29);
      const rightArm = makeArm(0.29);

      if (prop?.kind === 'bag') {
        const bagMat = new THREE.MeshStandardMaterial({ color: prop.color ?? 0xf43f5e, roughness: 0.55 });
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.10), bagMat);
        bag.position.set(0.06, -0.46, 0.02);
        rightArm.add(bag);
      } else if (prop?.kind === 'cup') {
        const cupMat = new THREE.MeshStandardMaterial({ color: prop.color ?? 0xffffff, roughness: 0.4 });
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.036, 0.12, 8), cupMat);
        cup.position.set(0, -0.42, 0.08);
        rightArm.add(cup);
      } else if (prop?.kind === 'tray') {
        const trayMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45 });
        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.24), trayMat);
        tray.position.set(-0.1, -0.36, 0.18);
        rightArm.add(tray);
      }

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0.76, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.16), pantsMat);
        leg.position.y = -0.32;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), shoeMat);
        shoe.position.set(0, -0.68, 0.03);
        p.add(shoe);
        hipsGroup.add(p);
        return p;
      };
      const leftLeg = makeLeg(-0.11);
      const rightLeg = makeLeg(0.11);

      return { grp, hipsGroup, head, leftArm, rightArm, leftLeg, rightLeg };
    };

    // Natural Boulevard Promenade Loops, Multi-Shop Enter/Exit Routes & 24/7 Late-Night Visitors
    const walkSpecs: Array<{
      wps: THREE.Vector3[];
      prop?: 'bag' | 'cup' | 'tray';
      speed?: number;
      schedule?: VinhomesNpcSchedule;
    }> = [
      // Boulevard & Crosswalk Strollers (mix of day & calm late-night strollers)
      { wps: [new THREE.Vector3(178.4, 0.02, 166.0), new THREE.Vector3(178.4, 0.02, 244.0)], prop: 'bag', schedule: 'late_24h' },
      { wps: [new THREE.Vector3(179.6, 0.02, 242.0), new THREE.Vector3(179.6, 0.02, 168.0)], prop: 'cup', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(180.8, 0.02, 324.0), new THREE.Vector3(180.8, 0.02, 248.0)], prop: 'bag', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(178.2, 0.02, 250.0), new THREE.Vector3(178.2, 0.02, 324.0)], schedule: 'late_24h' },
      { wps: [new THREE.Vector3(208.6, 0.02, 168.0), new THREE.Vector3(208.6, 0.02, 245.0)], prop: 'bag', schedule: 'late_24h' },
      { wps: [new THREE.Vector3(207.2, 0.02, 244.0), new THREE.Vector3(207.2, 0.02, 168.0)], prop: 'cup', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(206.2, 0.02, 322.0), new THREE.Vector3(206.2, 0.02, 247.0)], prop: 'bag', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(208.8, 0.02, 249.0), new THREE.Vector3(208.8, 0.02, 324.0)], schedule: 'day_shop' },
      // Mid-block zebra crossing walkers (cross cleanly through the Z = 246.0 median opening!)
      { wps: [new THREE.Vector3(179.0, 0.02, 246.0), new THREE.Vector3(208.0, 0.02, 246.0), new THREE.Vector3(208.0, 0.02, 272.0), new THREE.Vector3(208.0, 0.02, 246.0)], prop: 'bag', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(208.0, 0.02, 245.2), new THREE.Vector3(179.0, 0.02, 245.2), new THREE.Vector3(179.0, 0.02, 220.0), new THREE.Vector3(179.0, 0.02, 245.2)], schedule: 'day_shop' },
      // South Ngã 4 & Ngã Tư Vinhomes zebra crosswalk walkers
      { wps: [new THREE.Vector3(179.5, 0.02, 333.2), new THREE.Vector3(207.5, 0.02, 333.2)], schedule: 'day_shop' },
      { wps: [new THREE.Vector3(207.5, 0.02, 354.8), new THREE.Vector3(179.5, 0.02, 354.8)], prop: 'bag', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(182.7, 0.02, 333.2), new THREE.Vector3(182.7, 0.02, 354.8)], prop: 'cup', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(204.3, 0.02, 354.8), new THREE.Vector3(204.3, 0.02, 333.2)], schedule: 'day_shop' },
      { wps: [new THREE.Vector3(180.0, 0.02, 158.8), new THREE.Vector3(207.0, 0.02, 158.8)], prop: 'cup', schedule: 'late_24h' },
      { wps: [new THREE.Vector3(207.0, 0.02, 158.0), new THREE.Vector3(180.0, 0.02, 158.0)], schedule: 'day_shop' },
      // Corner Café Plaza strollers (North & South Ngã 4 corners)
      { wps: [new THREE.Vector3(161.2, 0.02, 165.0), new THREE.Vector3(178.4, 0.02, 165.0), new THREE.Vector3(178.4, 0.02, 198.0), new THREE.Vector3(178.4, 0.02, 165.0)], prop: 'cup', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(225.8, 0.02, 165.0), new THREE.Vector3(208.6, 0.02, 165.0), new THREE.Vector3(208.6, 0.02, 198.0), new THREE.Vector3(208.6, 0.02, 165.0)], prop: 'cup', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(161.2, 0.02, 327.2), new THREE.Vector3(178.4, 0.02, 327.2), new THREE.Vector3(178.4, 0.02, 294.0), new THREE.Vector3(178.4, 0.02, 327.2)], prop: 'bag', schedule: 'day_shop' },
      { wps: [new THREE.Vector3(225.8, 0.02, 327.2), new THREE.Vector3(208.6, 0.02, 327.2), new THREE.Vector3(208.6, 0.02, 294.0), new THREE.Vector3(208.6, 0.02, 327.2)], prop: 'cup', schedule: 'day_shop' },

      // Multi-Shop Boulevard Loops: Walk Down Sidewalk -> Enter Shop A -> Browse -> Exit -> Walk to Shop B -> Enter Shop B -> Exit!
      // West Loop 1: Corner New DB Coffee <-> Highlands Coffee (Z=178) <-> Uniqlo (Z=218)
      {
        wps: [
          new THREE.Vector3(167.4, 0.02, 164.6),
          new THREE.Vector3(167.4, 0.04, 168.4),
          new THREE.Vector3(169.8, 0.04, 169.5),
          new THREE.Vector3(167.4, 0.04, 167.8),
          new THREE.Vector3(167.4, 0.02, 164.6),
          new THREE.Vector3(177.8, 0.02, 164.6),
          new THREE.Vector3(177.8, 0.02, 178.0),
          new THREE.Vector3(174.0, 0.04, 178.0),
          new THREE.Vector3(168.6, 0.04, 178.0),
          new THREE.Vector3(174.0, 0.04, 178.0),
          new THREE.Vector3(177.8, 0.02, 178.0),
          new THREE.Vector3(177.8, 0.02, 164.6),
        ],
        prop: 'cup',
        speed: 0.96,
        schedule: 'day_shop',
      },
      // East Loop 1: Corner Starbucks <-> Katinat (Z=178) <-> Phúc Long (Z=194)
      {
        wps: [
          new THREE.Vector3(219.6, 0.02, 164.6),
          new THREE.Vector3(219.6, 0.04, 168.2),
          new THREE.Vector3(217.2, 0.04, 169.5),
          new THREE.Vector3(219.6, 0.04, 167.8),
          new THREE.Vector3(219.6, 0.02, 164.6),
          new THREE.Vector3(209.2, 0.02, 164.6),
          new THREE.Vector3(209.2, 0.02, 178.0),
          new THREE.Vector3(213.0, 0.04, 178.0),
          new THREE.Vector3(218.4, 0.04, 178.0),
          new THREE.Vector3(213.0, 0.04, 178.0),
          new THREE.Vector3(209.2, 0.02, 178.0),
          new THREE.Vector3(209.2, 0.02, 164.6),
        ],
        prop: 'cup',
        speed: 0.96,
        schedule: 'day_shop',
      },
      // West Loop 2: Mixue (Z=186) <-> WinMart+ (Z=194) <-> Pharmacity (Z=210)
      {
        wps: [
          new THREE.Vector3(178.2, 0.02, 182.0),
          new THREE.Vector3(178.2, 0.02, 186.0),
          new THREE.Vector3(174.0, 0.04, 186.0),
          new THREE.Vector3(168.4, 0.04, 186.0),
          new THREE.Vector3(174.0, 0.04, 186.0),
          new THREE.Vector3(178.2, 0.02, 186.0),
          new THREE.Vector3(178.2, 0.02, 194.0),
          new THREE.Vector3(174.0, 0.04, 194.0),
          new THREE.Vector3(167.2, 0.04, 193.0),
          new THREE.Vector3(174.0, 0.04, 194.0),
          new THREE.Vector3(178.2, 0.02, 194.0),
        ],
        prop: 'bag',
        speed: 0.94,
        schedule: 'day_shop',
      },
      // West Loop 3: Techcombank (Z=202) <-> Uniqlo (Z=218) <-> GoGi House (Z=226)
      {
        wps: [
          new THREE.Vector3(178.4, 0.02, 202.0),
          new THREE.Vector3(174.0, 0.04, 202.0),
          new THREE.Vector3(170.2, 0.04, 202.0),
          new THREE.Vector3(174.0, 0.04, 202.0),
          new THREE.Vector3(178.4, 0.02, 202.0),
          new THREE.Vector3(178.4, 0.02, 218.0),
          new THREE.Vector3(174.0, 0.04, 218.0),
          new THREE.Vector3(170.4, 0.04, 218.0),
          new THREE.Vector3(170.4, 0.04, 216.2),
          new THREE.Vector3(174.0, 0.04, 218.0),
          new THREE.Vector3(178.4, 0.02, 218.0),
        ],
        prop: 'bag',
        speed: 0.95,
        schedule: 'day_shop',
      },
      // West Loop 4 (24/7 Pharmacity Z=210 & Boulevard Walk)
      {
        wps: [
          new THREE.Vector3(178.4, 0.02, 196.0),
          new THREE.Vector3(178.4, 0.02, 210.0),
          new THREE.Vector3(174.0, 0.04, 210.0),
          new THREE.Vector3(167.2, 0.04, 209.0),
          new THREE.Vector3(174.0, 0.04, 210.0),
          new THREE.Vector3(178.4, 0.02, 210.0),
          new THREE.Vector3(178.4, 0.02, 224.0),
        ],
        prop: 'bag',
        speed: 0.9,
        schedule: 'late_24h',
      },
      // West Loop 5: GoGi House (Z=226) <-> VinFast Showroom (Z=258) <-> Haidilao (Z=298)
      {
        wps: [
          new THREE.Vector3(178.2, 0.02, 226.0),
          new THREE.Vector3(174.0, 0.04, 226.0),
          new THREE.Vector3(168.5, 0.04, 226.0),
          new THREE.Vector3(174.0, 0.04, 226.0),
          new THREE.Vector3(178.2, 0.02, 226.0),
          new THREE.Vector3(178.2, 0.02, 258.0),
          new THREE.Vector3(174.0, 0.04, 258.0),
          new THREE.Vector3(169.8, 0.04, 259.4),
          new THREE.Vector3(174.0, 0.04, 258.0),
          new THREE.Vector3(178.2, 0.02, 258.0),
        ],
        speed: 0.98,
        schedule: 'day_shop',
      },
      // West Loop 6: Pizza 4P's (Z=250) <-> Haidilao (Z=298)
      {
        wps: [
          new THREE.Vector3(178.5, 0.02, 250.0),
          new THREE.Vector3(174.0, 0.04, 250.0),
          new THREE.Vector3(169.0, 0.04, 250.0),
          new THREE.Vector3(174.0, 0.04, 250.0),
          new THREE.Vector3(178.5, 0.02, 250.0),
          new THREE.Vector3(178.5, 0.02, 298.0),
          new THREE.Vector3(174.0, 0.04, 298.0),
          new THREE.Vector3(168.2, 0.04, 298.0),
          new THREE.Vector3(174.0, 0.04, 298.0),
          new THREE.Vector3(178.5, 0.02, 298.0),
        ],
        speed: 0.98,
        schedule: 'day_shop',
      },
      // East Loop 2 (24/7 Circle K Z=186 & North Stroll)
      {
        wps: [
          new THREE.Vector3(208.8, 0.02, 174.0),
          new THREE.Vector3(208.8, 0.02, 186.0),
          new THREE.Vector3(213.0, 0.04, 186.0),
          new THREE.Vector3(219.8, 0.04, 187.0),
          new THREE.Vector3(213.0, 0.04, 186.0),
          new THREE.Vector3(208.8, 0.02, 186.0),
          new THREE.Vector3(208.8, 0.02, 200.0),
        ],
        prop: 'bag',
        speed: 0.9,
        schedule: 'late_24h',
      },
      // East Loop 3: Phúc Long (Z=194) <-> Manwah (Z=202) <-> MUJI (Z=210)
      {
        wps: [
          new THREE.Vector3(208.8, 0.02, 194.0),
          new THREE.Vector3(213.0, 0.04, 194.0),
          new THREE.Vector3(218.5, 0.04, 194.0),
          new THREE.Vector3(213.0, 0.04, 194.0),
          new THREE.Vector3(208.8, 0.02, 194.0),
          new THREE.Vector3(208.8, 0.02, 210.0),
          new THREE.Vector3(213.0, 0.04, 210.0),
          new THREE.Vector3(216.6, 0.04, 210.0),
          new THREE.Vector3(213.0, 0.04, 210.0),
          new THREE.Vector3(208.8, 0.02, 210.0),
        ],
        prop: 'cup',
        speed: 0.94,
        schedule: 'day_shop',
      },
      // East Loop 4: Manwah (Z=202) <-> BIDV (Z=226) <-> KFC (Z=234)
      {
        wps: [
          new THREE.Vector3(208.6, 0.02, 202.0),
          new THREE.Vector3(213.0, 0.04, 202.0),
          new THREE.Vector3(218.5, 0.04, 202.0),
          new THREE.Vector3(213.0, 0.04, 202.0),
          new THREE.Vector3(208.6, 0.02, 202.0),
          new THREE.Vector3(208.6, 0.02, 234.0),
          new THREE.Vector3(213.0, 0.04, 234.0),
          new THREE.Vector3(219.4, 0.04, 234.0),
          new THREE.Vector3(213.0, 0.04, 234.0),
          new THREE.Vector3(208.6, 0.02, 234.0),
        ],
        prop: 'bag',
        speed: 0.96,
        schedule: 'day_shop',
      },
      // East Loop 5: BIDV (Z=226) <-> Nike (Z=258) <-> Sephora (Z=266)
      {
        wps: [
          new THREE.Vector3(208.6, 0.02, 258.0),
          new THREE.Vector3(213.0, 0.04, 258.0),
          new THREE.Vector3(216.5, 0.04, 258.0),
          new THREE.Vector3(213.0, 0.04, 258.0),
          new THREE.Vector3(208.6, 0.02, 258.0),
          new THREE.Vector3(208.6, 0.02, 266.0),
          new THREE.Vector3(213.0, 0.04, 266.0),
          new THREE.Vector3(216.5, 0.04, 266.0),
          new THREE.Vector3(213.0, 0.04, 266.0),
          new THREE.Vector3(208.6, 0.02, 266.0),
        ],
        prop: 'bag',
        speed: 0.95,
        schedule: 'day_shop',
      },

      // Continuous Deep-Interior Waiters (with trays!) & Aisle Browsers inside Flagships
      { wps: [new THREE.Vector3(167.2, 0.04, 171.6), new THREE.Vector3(171.8, 0.04, 171.6), new THREE.Vector3(171.8, 0.04, 168.4), new THREE.Vector3(167.2, 0.04, 168.4)], prop: 'tray', speed: 0.95, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(219.8, 0.04, 171.6), new THREE.Vector3(215.2, 0.04, 171.6), new THREE.Vector3(215.2, 0.04, 168.4), new THREE.Vector3(219.8, 0.04, 168.4)], prop: 'tray', speed: 0.95, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(167.0, 0.04, 226.0), new THREE.Vector3(171.8, 0.04, 226.0), new THREE.Vector3(171.8, 0.04, 224.2), new THREE.Vector3(167.0, 0.04, 224.2)], prop: 'tray', speed: 0.92, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(167.0, 0.04, 250.0), new THREE.Vector3(171.8, 0.04, 250.0), new THREE.Vector3(171.8, 0.04, 248.2), new THREE.Vector3(167.0, 0.04, 248.2)], prop: 'tray', speed: 0.92, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(167.0, 0.04, 298.0), new THREE.Vector3(171.8, 0.04, 298.0), new THREE.Vector3(171.8, 0.04, 296.2), new THREE.Vector3(167.0, 0.04, 296.2)], prop: 'tray', speed: 0.94, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(220.0, 0.04, 202.0), new THREE.Vector3(215.2, 0.04, 202.0), new THREE.Vector3(215.2, 0.04, 200.2), new THREE.Vector3(220.0, 0.04, 200.2)], prop: 'tray', speed: 0.92, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(220.0, 0.04, 234.0), new THREE.Vector3(215.2, 0.04, 234.0), new THREE.Vector3(215.2, 0.04, 232.2), new THREE.Vector3(220.0, 0.04, 232.2)], prop: 'tray', speed: 0.92, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(174.0, 0.04, 191.5), new THREE.Vector3(174.0, 0.04, 196.4), new THREE.Vector3(166.5, 0.04, 196.4), new THREE.Vector3(166.5, 0.04, 191.5)], prop: 'bag', speed: 0.85, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(173.4, 0.04, 215.8), new THREE.Vector3(173.4, 0.04, 220.2), new THREE.Vector3(169.8, 0.04, 220.2), new THREE.Vector3(169.8, 0.04, 215.8)], prop: 'bag', speed: 0.85, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(173.4, 0.04, 287.8), new THREE.Vector3(173.4, 0.04, 292.2), new THREE.Vector3(169.8, 0.04, 292.2), new THREE.Vector3(169.8, 0.04, 287.8)], prop: 'bag', speed: 0.86, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(169.6, 0.04, 255.8), new THREE.Vector3(173.6, 0.04, 255.8), new THREE.Vector3(173.6, 0.04, 260.2), new THREE.Vector3(169.6, 0.04, 260.2)], speed: 0.82, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(213.0, 0.04, 183.6), new THREE.Vector3(213.0, 0.04, 188.4), new THREE.Vector3(220.2, 0.04, 188.4), new THREE.Vector3(220.2, 0.04, 183.6)], prop: 'bag', speed: 0.85, schedule: 'late_24h' },
      { wps: [new THREE.Vector3(213.7, 0.04, 207.8), new THREE.Vector3(213.7, 0.04, 212.2), new THREE.Vector3(217.2, 0.04, 212.2), new THREE.Vector3(217.2, 0.04, 207.8)], prop: 'bag', speed: 0.85, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(213.7, 0.04, 263.8), new THREE.Vector3(213.7, 0.04, 268.2), new THREE.Vector3(217.2, 0.04, 268.2), new THREE.Vector3(217.2, 0.04, 263.8)], prop: 'bag', speed: 0.86, schedule: 'day_shop' },
    ];

    walkSpecs.forEach((spec, idx) => {
      const shiftedWps =
        this.dx === 0
          ? spec.wps
          : spec.wps.map((wp) => new THREE.Vector3(wp.x + this.dx, wp.y, wp.z));
      const of = outfits[idx % outfits.length];
      const propObj = spec.prop
        ? {
            kind: spec.prop,
            color: spec.prop === 'bag' ? bagColors[idx % bagColors.length] : 0xffffff,
          }
        : undefined;
      const rig = createNpcRig(of, propObj);
      rig.grp.position.copy(shiftedWps[0]);
      const modelSpec = pickOutsideNpcModel(300 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: rig.grp,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 0.72,
      });
      this.rootGroup.add(rig.grp);
      this.pedestrians.push({
        mode: 'walk',
        schedule: spec.schedule ?? 'day_shop',
        group: rig.grp,
        hipsGroup: rig.hipsGroup,
        head: rig.head,
        leftArm: rig.leftArm,
        rightArm: rig.rightArm,
        leftLeg: rig.leftLeg,
        rightLeg: rig.rightLeg,
        waypoints: shiftedWps,
        wpIdx: 1 % shiftedWps.length,
        speed: spec.speed ?? (1.26 + (idx % 4) * 0.14),
        walkPhase: idx * 0.72,
        pauseTimer: 0,
        baseX: shiftedWps[0].x,
        baseZ: shiftedWps[0].z,
        baseYaw: 0,
        patrolAxis: 'z',
        glbHandle,
      });
    });

    // Seated Guests (Outdoor Café + Wooden Benches hidden late at night + Indoor Diners!)
    const seatedGuests: Array<{
      x: number;
      z: number;
      yaw: number;
      outfitIdx: number;
      hasCup?: boolean;
      schedule: VinhomesNpcSchedule;
    }> = [
      // Outdoor Ngã 4 Café Plaza & Mid-Block Bistro Chairs (Daytime / Evening only)
      { x: 163.42, z: 163.5, yaw: Math.PI / 2, outfitIdx: 0, hasCup: true, schedule: 'day_balcony' },
      { x: 170.58, z: 163.5, yaw: -Math.PI / 2, outfitIdx: 3, hasCup: true, schedule: 'day_balcony' },
      { x: 216.42, z: 163.5, yaw: Math.PI / 2, outfitIdx: 6, hasCup: true, schedule: 'day_balcony' },
      { x: 223.58, z: 163.5, yaw: -Math.PI / 2, outfitIdx: 8, hasCup: true, schedule: 'day_balcony' },
      { x: 163.42, z: 328.5, yaw: Math.PI / 2, outfitIdx: 2, hasCup: true, schedule: 'day_balcony' },
      { x: 173.58, z: 328.5, yaw: -Math.PI / 2, outfitIdx: 5, hasCup: true, schedule: 'day_balcony' },
      { x: 213.42, z: 328.5, yaw: Math.PI / 2, outfitIdx: 7, hasCup: true, schedule: 'day_balcony' },
      { x: 223.58, z: 328.5, yaw: -Math.PI / 2, outfitIdx: 10, hasCup: true, schedule: 'day_balcony' },
      { x: 176.5, z: 175.02, yaw: 0, outfitIdx: 1, hasCup: true, schedule: 'day_balcony' },
      { x: 176.5, z: 231.02, yaw: 0, outfitIdx: 4, hasCup: true, schedule: 'day_balcony' },
      { x: 210.5, z: 175.02, yaw: 0, outfitIdx: 9, hasCup: true, schedule: 'day_balcony' },
      { x: 210.5, z: 215.02, yaw: 0, outfitIdx: 11, hasCup: true, schedule: 'day_balcony' },
      // Promenade Wooden Benches
      { x: 183.2, z: 178.5, yaw: Math.PI / 2, outfitIdx: 2, schedule: 'day_balcony' },
      { x: 203.8, z: 258.5, yaw: -Math.PI / 2, outfitIdx: 5, schedule: 'day_balcony' },
      // INDOOR Seated Guests inside New DB Coffee & Starbucks Corners
      { x: 172.9, z: 171.26, yaw: 0, outfitIdx: 7, hasCup: true, schedule: 'day_shop' },
      { x: 172.9, z: 172.54, yaw: Math.PI, outfitIdx: 10, schedule: 'day_shop' },
      { x: 214.1, z: 171.26, yaw: 0, outfitIdx: 1, hasCup: true, schedule: 'day_shop' },
      { x: 214.1, z: 172.54, yaw: Math.PI, outfitIdx: 4, schedule: 'day_shop' },
      // INDOOR Seated Guests inside Highlands, GoGi House, Pizza 4P's, Katinat, Phúc Long & Manwah
      { x: 172.9, z: 179.46, yaw: 0, outfitIdx: 0, hasCup: true, schedule: 'day_shop' },
      { x: 170.4, z: 178.96, yaw: 0, outfitIdx: 3, hasCup: true, schedule: 'day_shop' },
      { x: 173.39, z: 228.0, yaw: -Math.PI / 2, outfitIdx: 6, schedule: 'day_shop' },
      { x: 170.19, z: 224.0, yaw: -Math.PI / 2, outfitIdx: 11, schedule: 'day_shop' },
      { x: 171.91, z: 248.0, yaw: Math.PI / 2, outfitIdx: 8, schedule: 'day_shop' },
      { x: 214.1, z: 175.26, yaw: 0, outfitIdx: 2, hasCup: true, schedule: 'day_shop' },
      { x: 214.1, z: 196.74, yaw: Math.PI, outfitIdx: 5, hasCup: true, schedule: 'day_shop' },
      { x: 213.61, z: 200.0, yaw: Math.PI / 2, outfitIdx: 9, schedule: 'day_shop' },
    ];
    seatedGuests.forEach((sg, idx) => {
      const sx = sg.x + this.dx;
      const rig = createNpcRig(
        outfits[sg.outfitIdx % outfits.length],
        sg.hasCup ? { kind: 'cup', color: 0xf8fafc } : undefined
      );
      rig.grp.position.set(sx, 0.0, sg.z);
      rig.grp.rotation.y = sg.yaw;
      rig.hipsGroup.position.y = -0.26;
      rig.leftLeg.rotation.x = -Math.PI * 0.48;
      rig.rightLeg.rotation.x = -Math.PI * 0.48;
      rig.leftArm.rotation.x = -0.65;
      rig.rightArm.rotation.x = -0.75;
      const modelSpec = pickSeatedCivilianModel(340 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: rig.grp,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Sit',
        phaseOffset: idx * 1.1,
      });
      this.rootGroup.add(rig.grp);
      this.pedestrians.push({
        mode: 'seated',
        schedule: sg.schedule,
        group: rig.grp,
        hipsGroup: rig.hipsGroup,
        head: rig.head,
        leftArm: rig.leftArm,
        rightArm: rig.rightArm,
        leftLeg: rig.leftLeg,
        rightLeg: rig.rightLeg,
        waypoints: [],
        wpIdx: 0,
        speed: 0,
        walkPhase: idx * 1.1,
        pauseTimer: 0,
        baseX: sx,
        baseZ: sg.z,
        baseYaw: sg.yaw,
        patrolAxis: 'z',
        glbHandle,
      });
    });

    // Expressive Staff Stationed Naturally at Counters & Entrances (no robotic back-and-forth sliding!)
    const standingStaff: Array<{
      x: number;
      z: number;
      yaw: number;
      shirt: number;
      pants: number;
      axis: 'x' | 'z';
      cup?: boolean;
      schedule: VinhomesNpcSchedule;
    }> = [
      // Outdoor Entrance Greeters & Security
      { x: 173.8, z: 165.4, yaw: Math.PI * 0.15, shirt: 0x78350f, pants: 0x18181b, axis: 'x', schedule: 'day_shop' },
      { x: 213.2, z: 165.4, yaw: -Math.PI * 0.15, shirt: 0x00563b, pants: 0x18181b, axis: 'x', schedule: 'day_shop' },
      { x: 175.8, z: 200.5, yaw: Math.PI / 2, shirt: 0x1e3a8a, pants: 0x0f172a, axis: 'z', schedule: 'late_24h' }, // Bank Night Guard
      { x: 175.8, z: 320.0, yaw: Math.PI / 2, shirt: 0x065f46, pants: 0x0f172a, axis: 'z', schedule: 'day_shop' },
      // INDOOR Staff Behind Deep Counters
      { x: 168.4, z: 170.5, yaw: Math.PI / 2, shirt: 0xb45309, pants: 0x18181b, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 218.6, z: 170.5, yaw: -Math.PI / 2, shirt: 0x00704a, pants: 0x18181b, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 166.35, z: 177.4, yaw: Math.PI / 2, shirt: 0xb22830, pants: 0x18181b, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 166.35, z: 185.4, yaw: Math.PI / 2, shirt: 0xe60012, pants: 0xf8fafc, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 171.75, z: 196.35, yaw: Math.PI / 2, shirt: 0xd91e2a, pants: 0x1e293b, axis: 'z', schedule: 'day_shop' },
      { x: 168.5, z: 201.6, yaw: Math.PI / 2, shirt: 0xffffff, pants: 0x0f172a, axis: 'z', schedule: 'day_shop' },
      { x: 171.75, z: 212.35, yaw: Math.PI / 2, shirt: 0x16a34a, pants: 0x1e293b, axis: 'z', schedule: 'late_24h' }, // 24/7 Pharmacity
      { x: 167.1, z: 259.2, yaw: Math.PI / 2, shirt: 0x0284c7, pants: 0x0f172a, axis: 'z', schedule: 'day_shop' },
      { x: 165.45, z: 297.6, yaw: Math.PI / 2, shirt: 0x881337, pants: 0x18181b, axis: 'z', schedule: 'day_shop' },
      { x: 220.65, z: 178.6, yaw: -Math.PI / 2, shirt: 0x0f3d3e, pants: 0x18181b, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 215.25, z: 183.65, yaw: -Math.PI / 2, shirt: 0xb91c1c, pants: 0x1e293b, axis: 'z', schedule: 'late_24h' }, // 24/7 Circle K
      { x: 220.65, z: 194.6, yaw: -Math.PI / 2, shirt: 0x00562d, pants: 0x18181b, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 218.5, z: 226.4, yaw: -Math.PI / 2, shirt: 0x005855, pants: 0x0f172a, axis: 'z', schedule: 'day_shop' },
      { x: 221.55, z: 234.4, yaw: -Math.PI / 2, shirt: 0xe4002b, pants: 0x18181b, axis: 'z', schedule: 'day_shop' },
    ];
    standingStaff.forEach((st, idx) => {
      const sx = st.x + this.dx;
      const rig = createNpcRig(
        { shirt: st.shirt, pants: st.pants, hair: 0x111827, skin: '#f5c7a3' },
        st.cup ? { kind: 'cup', color: 0xfef08a } : undefined
      );
      rig.grp.position.set(sx, 0.04, st.z);
      rig.grp.rotation.y = st.yaw;
      const modelSpec = idx % 3 === 0 ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(370 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: rig.grp,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: idx * 1.4,
      });
      this.rootGroup.add(rig.grp);
      this.pedestrians.push({
        mode: 'standing',
        schedule: st.schedule,
        group: rig.grp,
        hipsGroup: rig.hipsGroup,
        head: rig.head,
        leftArm: rig.leftArm,
        rightArm: rig.rightArm,
        leftLeg: rig.leftLeg,
        rightLeg: rig.rightLeg,
        waypoints: [],
        wpIdx: 0,
        speed: 0,
        walkPhase: idx * 1.4,
        pauseTimer: 0,
        baseX: sx,
        baseZ: st.z,
        baseYaw: st.yaw,
        patrolAxis: st.axis,
        glbHandle,
      });
    });

    // Active Floor 2 & Floor 3 NPCs: Long Balcony Terrace Strolls (hidden late night!) + Indoor Corner F2/F3 Café Visitors!
    const upperWalkers: Array<{
      wps: THREE.Vector3[];
      fixedY: number;
      prop?: 'cup' | 'bag';
      speed?: number;
      schedule: VinhomesNpcSchedule;
    }> = [
      // Daytime Outdoor Floor 2 Balcony Terrace Long Walks (Y = 6.69, hidden after 22:30!)
      { wps: [new THREE.Vector3(175.56, 6.69, 176.5), new THREE.Vector3(175.56, 6.69, 238.0)], fixedY: 6.69, prop: 'cup', speed: 0.82, schedule: 'day_balcony' },
      { wps: [new THREE.Vector3(175.56, 6.69, 316.0), new THREE.Vector3(175.56, 6.69, 246.0)], fixedY: 6.69, prop: 'bag', speed: 0.85, schedule: 'day_balcony' },
      { wps: [new THREE.Vector3(211.44, 6.69, 176.5), new THREE.Vector3(211.44, 6.69, 238.0)], fixedY: 6.69, prop: 'cup', speed: 0.82, schedule: 'day_balcony' },
      { wps: [new THREE.Vector3(211.44, 6.69, 316.0), new THREE.Vector3(211.44, 6.69, 246.0)], fixedY: 6.69, prop: 'bag', speed: 0.85, schedule: 'day_balcony' },
      // Indoor Corner Flagship Floor 2 & Floor 3 Café Walkers (North & South Corners, visible through clear upper glass!)
      { wps: [new THREE.Vector3(169.5, 4.66, 172.2), new THREE.Vector3(172.8, 4.66, 172.2), new THREE.Vector3(172.8, 4.66, 168.4), new THREE.Vector3(169.5, 4.66, 168.4)], fixedY: 4.66, prop: 'cup', speed: 0.78, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(217.5, 4.66, 172.2), new THREE.Vector3(214.2, 4.66, 172.2), new THREE.Vector3(214.2, 4.66, 168.4), new THREE.Vector3(217.5, 4.66, 168.4)], fixedY: 4.66, prop: 'cup', speed: 0.78, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(169.5, 8.88, 172.2), new THREE.Vector3(172.8, 8.88, 172.2), new THREE.Vector3(172.8, 8.88, 168.4), new THREE.Vector3(169.5, 8.88, 168.4)], fixedY: 8.88, prop: 'cup', speed: 0.75, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(217.5, 8.88, 172.2), new THREE.Vector3(214.2, 8.88, 172.2), new THREE.Vector3(214.2, 8.88, 168.4), new THREE.Vector3(217.5, 8.88, 168.4)], fixedY: 8.88, prop: 'cup', speed: 0.75, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(169.5, 4.66, 319.8), new THREE.Vector3(172.8, 4.66, 319.8), new THREE.Vector3(172.8, 4.66, 323.6), new THREE.Vector3(169.5, 4.66, 323.6)], fixedY: 4.66, prop: 'cup', speed: 0.78, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(217.5, 4.66, 319.8), new THREE.Vector3(214.2, 4.66, 319.8), new THREE.Vector3(214.2, 4.66, 323.6), new THREE.Vector3(217.5, 4.66, 323.6)], fixedY: 4.66, prop: 'cup', speed: 0.78, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(169.5, 8.88, 319.8), new THREE.Vector3(172.8, 8.88, 319.8), new THREE.Vector3(172.8, 8.88, 323.6), new THREE.Vector3(169.5, 8.88, 323.6)], fixedY: 8.88, prop: 'cup', speed: 0.75, schedule: 'day_shop' },
      { wps: [new THREE.Vector3(217.5, 8.88, 319.8), new THREE.Vector3(214.2, 8.88, 319.8), new THREE.Vector3(214.2, 8.88, 323.6), new THREE.Vector3(217.5, 8.88, 323.6)], fixedY: 8.88, prop: 'cup', speed: 0.75, schedule: 'day_shop' },
    ];
    upperWalkers.forEach((uw, idx) => {
      const shiftedWps =
        this.dx === 0
          ? uw.wps
          : uw.wps.map((wp) => new THREE.Vector3(wp.x + this.dx, wp.y, wp.z));
      const rig = createNpcRig(outfits[(idx + 4) % outfits.length], uw.prop ? { kind: uw.prop, color: 0xf8fafc } : undefined);
      rig.grp.position.copy(shiftedWps[0]);
      const modelSpec = pickOutsideNpcModel(390 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: rig.grp,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 0.9,
      });
      this.rootGroup.add(rig.grp);
      this.pedestrians.push({
        mode: 'walk',
        schedule: uw.schedule,
        group: rig.grp,
        hipsGroup: rig.hipsGroup,
        head: rig.head,
        leftArm: rig.leftArm,
        rightArm: rig.rightArm,
        leftLeg: rig.leftLeg,
        rightLeg: rig.rightLeg,
        waypoints: shiftedWps,
        wpIdx: 1,
        speed: uw.speed ?? 0.8,
        walkPhase: idx * 0.9,
        pauseTimer: 0,
        baseX: shiftedWps[0].x,
        baseZ: shiftedWps[0].z,
        baseYaw: 0,
        patrolAxis: 'z',
        fixedY: uw.fixedY,
        glbHandle,
      });
    });

    const upperResidents: Array<{
      x: number;
      y: number;
      z: number;
      yaw: number;
      axis: 'x' | 'z';
      cup?: boolean;
      schedule: VinhomesNpcSchedule;
    }> = [
      // Daytime Corner Flagship Floor 2 Outdoor Veranda Guests (North & South Corner Balconies, hidden at night!)
      { x: 172.6, y: 4.62, z: 165.4, yaw: Math.PI * 0.25, axis: 'x', cup: true, schedule: 'day_balcony' },
      { x: 175.4, y: 4.62, z: 170.5, yaw: Math.PI / 2, axis: 'z', cup: true, schedule: 'day_balcony' },
      { x: 214.4, y: 4.62, z: 165.4, yaw: -Math.PI * 0.25, axis: 'x', cup: true, schedule: 'day_balcony' },
      { x: 211.6, y: 4.62, z: 170.5, yaw: -Math.PI / 2, axis: 'z', cup: true, schedule: 'day_balcony' },
      { x: 172.6, y: 4.62, z: 326.6, yaw: Math.PI * 0.75, axis: 'x', cup: true, schedule: 'day_balcony' },
      { x: 175.4, y: 4.62, z: 321.5, yaw: Math.PI / 2, axis: 'z', cup: true, schedule: 'day_balcony' },
      { x: 214.4, y: 4.62, z: 326.6, yaw: -Math.PI * 0.75, axis: 'x', cup: true, schedule: 'day_balcony' },
      { x: 211.6, y: 4.62, z: 321.5, yaw: -Math.PI / 2, axis: 'z', cup: true, schedule: 'day_balcony' },
      // Daytime Inline Floor 2 Outdoor Balcony Lookouts (hidden at night!)
      { x: 175.5, y: 6.69, z: 178.0, yaw: Math.PI / 2, axis: 'z', cup: true, schedule: 'day_balcony' },
      { x: 175.5, y: 6.69, z: 218.0, yaw: Math.PI / 2, axis: 'z', schedule: 'day_balcony' },
      { x: 211.5, y: 6.69, z: 178.0, yaw: -Math.PI / 2, axis: 'z', cup: true, schedule: 'day_balcony' },
      { x: 211.5, y: 6.69, z: 218.0, yaw: -Math.PI / 2, axis: 'z', schedule: 'day_balcony' },
      // INDOOR Floor 2 & Floor 3 Room Residents visible inside clear glass windows (including cozy late-night rooms!)
      { x: 173.4, y: 6.73, z: 248.2, yaw: Math.PI / 2, axis: 'z', cup: true, schedule: 'late_24h' },
      { x: 213.6, y: 6.73, z: 192.2, yaw: -Math.PI / 2, axis: 'z', cup: true, schedule: 'late_24h' },
      { x: 173.4, y: 10.37, z: 176.2, yaw: Math.PI / 2, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 173.4, y: 10.37, z: 187.8, yaw: Math.PI / 2, axis: 'z', schedule: 'late_24h' },
      { x: 173.4, y: 10.37, z: 224.2, yaw: Math.PI / 2, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 173.4, y: 10.37, z: 256.2, yaw: Math.PI / 2, axis: 'z', schedule: 'day_shop' },
      { x: 173.4, y: 10.37, z: 296.2, yaw: Math.PI / 2, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 213.6, y: 10.37, z: 179.8, yaw: -Math.PI / 2, axis: 'z', cup: true, schedule: 'day_shop' },
      { x: 213.6, y: 10.37, z: 184.2, yaw: -Math.PI / 2, axis: 'z', schedule: 'late_24h' },
      { x: 213.6, y: 10.37, z: 203.8, yaw: -Math.PI / 2, axis: 'z', cup: true, schedule: 'day_shop' },
    ];
    upperResidents.forEach((ur, idx) => {
      const ux = ur.x + this.dx;
      const of = outfits[(idx + 2) % outfits.length];
      const rig = createNpcRig(of, ur.cup ? { kind: 'cup', color: 0xfef08a } : undefined);
      rig.grp.position.set(ux, ur.y, ur.z);
      rig.grp.rotation.y = ur.yaw;
      const modelSpec = pickStationaryCivilianModel(410 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: rig.grp,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: idx * 1.15,
      });
      this.rootGroup.add(rig.grp);
      this.pedestrians.push({
        mode: 'standing',
        schedule: ur.schedule,
        group: rig.grp,
        hipsGroup: rig.hipsGroup,
        head: rig.head,
        leftArm: rig.leftArm,
        rightArm: rig.rightArm,
        leftLeg: rig.leftLeg,
        rightLeg: rig.rightLeg,
        waypoints: [],
        wpIdx: 0,
        speed: 0,
        walkPhase: idx * 1.15,
        pauseTimer: 0,
        baseX: ux,
        baseZ: ur.z,
        baseYaw: ur.yaw,
        patrolAxis: ur.axis,
        fixedY: ur.y,
        glbHandle,
      });
    });
  }

  public update(delta: number, lampFactor: number, playerPos?: THREE.Vector3, rawHour = 12) {
    const dt = Math.min(delta, 0.08);
    const sig = this.getSignalState();

    // 1. Update E-W Crossroad & N-S Boulevard Vehicles
    for (let i = 0; i < this.vehicles.length; i++) {
      const u = this.vehicles[i];
      const prevX = u.x;
      const prevZ = u.z;

      let signalFactor = 1.0;
      if (u.axis === 'ew') {
        const centerZ = u.z > 240.0 ? VINHOMES_SOUTH_INTERSECTION_CENTER_Z : VINHOMES_INTERSECTION_CENTER_Z;
        const evalEwIntersection = (intCenterX: number, getSig: () => IntersectionSignalState) => {
          const intSig = getSig();
          const westStop = intCenterX - 13.5;
          const eastStop = intCenterX + 13.5;
          const distToStop = u.dir > 0 ? westStop - (u.x + u.halfL) : u.x - u.halfL - eastStop;
          if (intSig.ewPhase === 'green') {
            if (
              distToStop >= -0.35 &&
              distToStop <= 5.5 &&
              !this.coordinator.isIntersectionBoxClearForAxis({
                id: u.id,
                centerX: intCenterX,
                centerZ,
                axis: 'ew',
              })
            ) {
              return distToStop <= 1.5 ? 0 : Math.max(0.08, (distToStop - 1.5) / 4.0);
            }
          } else {
            const allowYellowClear = intSig.ewPhase === 'yellow' && distToStop < 1.3;
            if (!allowYellowClear && distToStop >= -0.35 && distToStop <= 16.0) {
              return distToStop <= 1.25 ? 0 : Math.max(0.08, Math.min(1, (distToStop - 1.25) / 14.75));
            }
          }
          return 1.0;
        };
        signalFactor = evalEwIntersection(this.centerX, this.getSignalState);
        for (let ei = 0; ei < this.extraEwIntersections.length; ei++) {
          const extra = this.extraEwIntersections[ei];
          signalFactor = Math.min(signalFactor, evalEwIntersection(extra.centerX, extra.getSignal));
        }
      } else {
        const evalNsIntersection = (
          centerZ: number,
          northStopZ: number,
          southStopZ: number,
          intSig: IntersectionSignalState = sig
        ) => {
          const distToStop = u.dir > 0 ? northStopZ - (u.z + u.halfL) : u.z - u.halfL - southStopZ;
          if (intSig.nsPhase === 'green') {
            if (
              distToStop >= -0.35 &&
              distToStop <= 5.5 &&
              !this.coordinator.isIntersectionBoxClearForAxis({
                id: u.id,
                centerX: this.centerX,
                centerZ,
                axis: 'ns',
              })
            ) {
              return distToStop <= 1.5 ? 0 : Math.max(0.08, (distToStop - 1.5) / 4.0);
            }
          } else {
            const allowYellowClear = intSig.nsPhase === 'yellow' && distToStop < 1.3;
            if (!allowYellowClear && distToStop >= -0.35 && distToStop <= 16.0) {
              return distToStop <= 1.25 ? 0 : Math.max(0.08, Math.min(1, (distToStop - 1.25) / 14.75));
            }
          }
          return 1.0;
        };
        signalFactor = Math.min(
          evalNsIntersection(VINHOMES_INTERSECTION_CENTER_Z, 134.4, 161.6),
          evalNsIntersection(VINHOMES_SOUTH_INTERSECTION_CENTER_Z, 330.4, 357.6)
        );
        for (let ni = 0; ni < this.extraNsIntersections.length; ni++) {
          const extra = this.extraNsIntersections[ni];
          signalFactor = Math.min(
            signalFactor,
            evalNsIntersection(extra.centerZ, extra.northStopZ, extra.southStopZ, extra.getSignal())
          );
        }
      }

      const moveDirX = u.axis === 'ew' ? u.dir : 0;
      const moveDirZ = u.axis === 'ns' ? u.dir : 0;

      const clr = this.coordinator.getForwardClearance({
        id: u.id,
        x: u.x,
        y: -0.26,
        z: u.z,
        moveDirX,
        moveDirZ,
        halfW: u.halfW,
        halfL: u.halfL,
        lookahead: 13.0,
        minGap: 2.6,
        priority: u.priority,
      });

      if (this.coordinator.isJamBypassActive(u.id)) {
        signalFactor = 1.0;
      }

      const factor = clr.blocked ? 0 : Math.min(signalFactor, clr.maxSpeedFactor);
      const targetSpeed = u.cruiseSpeed * factor;
      const braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;

      u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
      if (u.axis === 'ew') {
        u.x += u.dir * u.speed * dt;
        if (u.dir > 0 && u.x > this.ewMaxX) {
          if (this.coordinator.isZoneClear({ id: u.id, x: this.ewMinX, y: -0.26, z: u.z, halfX: u.halfL + 2.0, halfZ: u.halfW + 0.5 })) {
            u.x = this.ewMinX;
          } else {
            u.x = this.ewMaxX;
            u.speed = 0;
          }
        } else if (u.dir < 0 && u.x < this.ewMinX) {
          if (this.coordinator.isZoneClear({ id: u.id, x: this.ewMaxX, y: -0.26, z: u.z, halfX: u.halfL + 2.0, halfZ: u.halfW + 0.5 })) {
            u.x = this.ewMaxX;
          } else {
            u.x = this.ewMinX;
            u.speed = 0;
          }
        }
      } else {
        u.z += u.dir * u.speed * dt;
        if (u.dir > 0 && u.z > 420.0) {
          const respawnZ = this.nsMinZ >= 148.0 ? 154.0 : this.nsMinZ;
          if (this.coordinator.isZoneClear({ id: u.id, x: u.x, y: -0.26, z: respawnZ, halfX: u.halfW + 0.5, halfZ: u.halfL + 2.5 })) {
            u.z = respawnZ;
          } else {
            u.z = 420.0;
            u.speed = 0;
          }
        } else if (u.dir < 0 && u.z < this.nsMinZ) {
          if (this.coordinator.isZoneClear({ id: u.id, x: u.x, y: -0.26, z: 418.0, halfX: u.halfW + 0.5, halfZ: u.halfL + 2.5 })) {
            u.z = 418.0;
          } else {
            u.z = this.nsMinZ;
            u.speed = 0;
          }
        }
      }

      u.group.position.set(u.x, -0.26, u.z);
      const moved = Math.hypot(u.x - prevX, u.z - prevZ);
      for (let w = 0; w < u.wheels.length; w++) {
        u.wheels[w].rotation.x += moved / Math.max(0.15, u.wheelR);
      }
      u.headlightMat.emissiveIntensity = 0.75 + lampFactor * 1.0;
      u.brakeMat.emissiveIntensity = braking ? 1.9 : 0.55 + lampFactor * 0.5;

      this.coordinator.updateVehicle({
        id: u.id,
        kind: u.kind,
        x: u.x,
        y: -0.26,
        z: u.z,
        fwdX: moveDirX,
        fwdZ: moveDirZ,
        halfW: u.halfW,
        halfL: u.halfL,
        speed: u.speed,
        isStoppedOrParked: u.speed < 0.15,
        priority: u.priority,
        active: true,
      });
    }

    // 2. Update Shophouse Pedestrians, Multi-Shop Entrants, Seated Diners & Active Staff (with Late-Night Realism!)
    const isNearPedZone =
      !playerPos ||
      (playerPos.x - this.centerX) * (playerPos.x - this.centerX) + (playerPos.z - 246.0) * (playerPos.z - 246.0) <= 18225;
    this.pedAccum += dt;
    this.pedFrame++;
    if (!isNearPedZone && this.pedFrame > 4 && this.pedFrame % 8 !== 0) {
      return;
    }
    const pedDt = Math.min(this.pedAccum, 0.25);
    this.pedAccum = 0;

    const isLateNight = rawHour >= 22.5 || rawHour < 5.75;
    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];
      const shouldShow =
        !isLateNight ? true : p.schedule === 'late_24h';
      if (p.group.visible !== shouldShow) {
        p.group.visible = shouldShow;
      }
      if (!shouldShow) continue;

      if (p.mode === 'seated') {
        p.walkPhase += pedDt * 2.1;
        p.hipsGroup.rotation.y = Math.sin(p.walkPhase * 0.55) * 0.16;
        p.head.rotation.y = Math.sin(p.walkPhase * 0.85) * 0.34;
        p.head.rotation.x = Math.sin(p.walkPhase * 1.4) * 0.09;
        p.leftArm.rotation.x = -0.72 + Math.sin(p.walkPhase * 1.5) * 0.24;
        p.rightArm.rotation.x = -0.82 + Math.cos(p.walkPhase * 1.2) * 0.3;
        continue;
      }
      if (p.mode === 'standing') {
        p.walkPhase += pedDt * 1.85;
        // Natural stationary posture (no robotic back-and-forth foot sliding!)
        p.group.position.x = p.baseX;
        p.group.position.z = p.baseZ;
        p.leftLeg.rotation.x = 0;
        p.rightLeg.rotation.x = 0;
        p.group.rotation.y = p.baseYaw + Math.sin(p.walkPhase * 0.45) * 0.24;
        p.head.rotation.y = Math.sin(p.walkPhase * 0.9) * 0.38;
        p.leftArm.rotation.x = -0.22 + Math.sin(p.walkPhase * 1.4) * 0.18;
        p.rightArm.rotation.x = -0.45 + Math.cos(p.walkPhase * 1.6) * 0.28;
        p.hipsGroup.position.y = Math.sin(p.walkPhase * 1.1) * 0.008;
        continue;
      }

      // Walking / Boulevard-to-Shop-to-Boulevard Multi-Store Loops
      if (p.pauseTimer > 0) {
        p.glbHandle?.setAnimState('Idle');
        p.pauseTimer -= pedDt;
        p.walkPhase += pedDt * 2.2;
        p.leftLeg.rotation.x = THREE.MathUtils.lerp(p.leftLeg.rotation.x, 0, Math.min(1, pedDt * 8));
        p.rightLeg.rotation.x = THREE.MathUtils.lerp(p.rightLeg.rotation.x, 0, Math.min(1, pedDt * 8));
        p.head.rotation.y = Math.sin(p.walkPhase * 1.2) * 0.42;
        p.rightArm.rotation.x = -0.58 + Math.sin(p.walkPhase * 1.8) * 0.22;
        p.leftArm.rotation.x = THREE.MathUtils.lerp(p.leftArm.rotation.x, -0.15, Math.min(1, pedDt * 6));
        p.hipsGroup.position.y = 0;
        continue;
      }
      p.glbHandle?.setAnimState('Walk');

      const target = p.waypoints[p.wpIdx];
      const dx = target.x - p.group.position.x;
      const dz = target.z - p.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.25) {
        const isDeepIndoorStop = p.waypoints.length >= 4 && (target.x < this.centerX - 20.3 || target.x > this.centerX + 20.3);
        if (isDeepIndoorStop) {
          p.pauseTimer = 1.6 + (i % 3) * 0.55;
        }
        p.wpIdx = (p.wpIdx + 1) % p.waypoints.length;
      } else {
        const step = Math.min(dist, p.speed * pedDt);
        p.group.position.x += (dx / dist) * step;
        p.group.position.z += (dz / dist) * step;
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - p.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.group.rotation.y += diff * Math.min(1, pedDt * 8);
      }

      if (p.fixedY !== undefined) {
        p.group.position.y = p.fixedY;
      } else {
        // Drop onto asphalt when crossing zebra crosswalks, rise to shop slab (0.04) indoors
        const onRoad = p.group.position.x > this.centerX - 8.2 && p.group.position.x < this.centerX + 8.2;
        const indoors = p.group.position.x < this.centerX - 18.6 || p.group.position.x > this.centerX + 18.6;
        p.group.position.y = THREE.MathUtils.lerp(
          p.group.position.y,
          onRoad ? -0.24 : indoors ? 0.04 : 0.02,
          Math.min(1, pedDt * 10)
        );
      }

      p.walkPhase += pedDt * p.speed * 4.6;
      const swing = Math.sin(p.walkPhase) * 0.56;
      p.head.rotation.y = Math.sin(p.walkPhase * 0.35) * 0.16;
      p.leftArm.rotation.x = -swing;
      p.rightArm.rotation.x = p.glbHandle?.hasActiveUmbrella() ? -0.88 : swing * 0.72;
      p.leftLeg.rotation.x = swing;
      p.rightLeg.rotation.x = -swing;
      p.hipsGroup.position.y = Math.abs(Math.cos(p.walkPhase)) * 0.04;
    }

    // 3. Update All 40+ Shophouse Automatic Sliding Glass Doors (triggered by Player & Visible Moving NPCs!)
    const triggerDistSq = 3.55 * 3.55;
    for (let d = 0; d < this.autoDoors.length; d++) {
      const door = this.autoDoors[d];
      let triggered = false;

      if (playerPos && Math.abs(playerPos.y) < 2.2) {
        const pdx = playerPos.x - door.worldX;
        const pdz = playerPos.z - door.worldZ;
        if (pdx * pdx + pdz * pdz < triggerDistSq) {
          triggered = true;
        }
      }
      if (!triggered) {
        for (let i = 0; i < this.pedestrians.length; i++) {
          const ped = this.pedestrians[i];
          if (!ped.group.visible || ped.mode !== 'walk' || ped.fixedY !== undefined) continue;
          const ndx = ped.group.position.x - door.worldX;
          const ndz = ped.group.position.z - door.worldZ;
          if (ndx * ndx + ndz * ndz < triggerDistSq) {
            triggered = true;
            break;
          }
        }
      }

      const targetRatio = triggered ? 1.0 : 0.0;
      const rate = triggered ? 3.2 : 2.1;
      if (door.openRatio < targetRatio) {
        door.openRatio = Math.min(targetRatio, door.openRatio + pedDt * rate);
      } else if (door.openRatio > targetRatio) {
        door.openRatio = Math.max(targetRatio, door.openRatio - pedDt * rate);
      }

      const slideOffset = 0.74 * door.openRatio;
      door.leftLeaf.position.x = door.baseLeftX - door.slideDirX * slideOffset;
      door.leftLeaf.position.z = door.baseLeftZ - door.slideDirZ * slideOffset;
      door.rightLeaf.position.x = door.baseRightX + door.slideDirX * slideOffset;
      door.rightLeaf.position.z = door.baseRightZ + door.slideDirZ * slideOffset;
      door.sensorMat.emissive.setHex(door.openRatio > 0.05 ? 0x22c55e : 0x38bdf8);
      door.sensorMat.emissiveIntensity = door.openRatio > 0.05 ? 1.4 : 0.55;
    }
  }
}

export function getVinhomesSouthRoadBounds() {
  return {
    eastSouthEndZ: CITY_ROAD_BOUNDS.eastSouthEndZ,
    intersectionCenterZ: VINHOMES_INTERSECTION_CENTER_Z,
  };
}
