import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickSchoolStudentModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import type { HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  compactDynamicVehicleMeshes,
  type CityCarVariant,
} from './CityVehicleMeshBuilder';
import { buildAmbientXanhSmTaxiCar } from './XanhSmTaxiSystem';
import {
  LOT_VISUAL_INSET,
  RESIDENTIAL_AUTO_DOOR_TRIGGER_RADIUS,
  RESIDENTIAL_BALCONY_BOTTOM_Y,
  RESIDENTIAL_F1_HEIGHT,
  RESIDENTIAL_SIGNBOARD_BOTTOM_Y,
  RESIDENTIAL_SIGNBOARD_CENTER_Y,
  RESIDENTIAL_SIGNBOARD_HEIGHT,
  RESIDENTIAL_SIGNBOARD_TOP_Y,
  RESIDENTIAL_SLAB_HEIGHT,
  buildBadmintonAndPocketPark,
  buildCommunityHallAndFitnessCourt,
  buildDiverseVietnameseHouse,
  buildExteriorStairMotelRow,
  buildWalkableBunBoHueShop,
  buildWalkableBunDauCorner,
  buildWalkableComTamShop,
  buildWalkableHuTieuShop,
  buildWalkableMotorRepairShop,
  buildWalkablePhoBreezeHouse,
  buildWalkableStreetShop,
  computeAutoDoorTargetOpen,
  type AutoSlidingDoorRig,
  type DrivewayBikeSlot,
  type ResidentialHouseActivitySlot,
  type WalkableShopActivitySlot,
  type WestResPalette,
} from './WestResidentialExpansionBuilders';
import {
  buildWestResidentialStreetscape,
  type StreetHangoutSpot,
  type StreetWalkSegment,
} from './WestResidentialStreetscapeBuilder';
import {
  RESIDENTIAL_MARKETS,
  buildResidentialMarketColliders,
  buildTraditionalResidentialMarket,
  findResidentialMarketBySegment,
  isPointBlockedByClosedResidentialMarkets,
  isResidentialMarketOpenAtHour,
  type MarketDynamicController,
  type MarketGateExit,
  type MarketStallSpot,
  type ResidentialMarketNpcSeed,
} from './ResidentialMarketSystem';
import {
  ALL_WEST_ROW_SEGMENTS,
  WEST_ALLEYS,
  WEST_COASTAL_RESIDENTIAL_OPENINGS,
  WEST_INNER_ROADS,
  WEST_RIVER_RESIDENTIAL_OPENINGS,
  WEST_RES_ALLEY_MAX_X,
  WEST_RES_ALLEY_MIN_X,
  WEST_RES_EAST_REAR_MAX_X,
  WEST_RES_EXPANSION_MIN_X,
  WEST_RES_HEM426_MAX_X,
  WEST_RES_HEM426_MIN_X,
  WEST_RES_HEM485_MAX_X,
  WEST_RES_HEM485_MIN_X,
  WEST_RES_HEM490_MAX_X,
  WEST_RES_HEM490_MIN_X,
  WEST_RES_HEM545_MAX_X,
  WEST_RES_HEM545_MIN_X,
  WEST_RES_HEM550_MAX_X,
  WEST_RES_HEM550_MIN_X,
  WEST_RES_HEM605_MAX_X,
  WEST_RES_HEM605_MIN_X,
  WEST_RES_HEM610_MAX_X,
  WEST_RES_HEM610_MIN_X,
  WEST_RES_HEM665_MAX_X,
  WEST_RES_HEM665_MIN_X,
  WEST_RES_MAX_X,
  WEST_RES_MAX_Z,
  WEST_RES_MIN_X,
  WEST_RES_MIN_Z,
  WEST_RES_N1_SEGMENTS,
  WEST_RES_N2_SEGMENTS,
  WEST_RES_N3_SEGMENTS,
  WEST_RES_N4_SEGMENTS,
  WEST_RES_REAR_MIN_Z,
  SOUTH_CENTER_MID_CONN_CX,
  SOUTH_CENTER_MID_CONN_MAX_X,
  SOUTH_CENTER_MID_CONN_MIN_X,
  SOUTH_CENTER_MIN_Z,
  SOUTH_EXPANSION_EAST_MAX_X,
  SOUTH_FAR_WEST_CONN_CX,
  SOUTH_FAR_WEST_CONN_MAX_X,
  SOUTH_FAR_WEST_CONN_MIN_X,
  SOUTH_HOSP_EAST_CONN_CX,
  SOUTH_HOSP_EAST_CONN_MAX_X,
  SOUTH_HOSP_EAST_CONN_MIN_X,
  SOUTH_HOSP_EAST_MAX_X,
  SOUTH_HOSP_EAST_MIN_X,
  SOUTH_HOSP_MAX_Z,
  SOUTH_HOSP_MIN_Z,
  SOUTH_HOSP_ROAD_MAX_Z,
  SOUTH_HOSP_WEST_CONN_CX,
  SOUTH_HOSP_WEST_CONN_MAX_X,
  SOUTH_HOSP_WEST_CONN_MIN_X,
  SOUTH_HOSP_WEST_MAX_X,
  SOUTH_HOSP_WEST_MIN_X,
  SOUTH_OCEAN_RING_CONN_CX,
  SOUTH_OCEAN_RING_CONN_MAX_X,
  SOUTH_OCEAN_RING_CONN_MIN_X,
  SOUTH_SW_MID_CONN_CX,
  SOUTH_SW_MID_CONN_MAX_X,
  SOUTH_SW_MID_CONN_MIN_X,
  WEST_RES_S1_SEGMENTS,
  WEST_RES_S2_SEGMENTS,
  WEST_RES_S3_SEGMENTS,
  WEST_RES_S4_SEGMENTS,
  WEST_RES_S5_SEGMENTS,
  WEST_RES_S6_SEGMENTS,
  WEST_RES_SC_SEGMENTS,
  WEST_RES_SH_SEGMENTS,
  WEST_RES_SOUTH_MAX_X,
  WEST_RES_SOUTH_MAX_Z,
  WEST_RES_SOUTH_MIN_X,
  WEST_RES_SOUTH_MIN_Z,
  WEST_RES_SOUTH_S3_MAX_X,
  WEST_SOUTH_CONNECTOR_CX,
  WEST_SOUTH_CONNECTOR_MAX_X,
  WEST_SOUTH_CONNECTOR_MAX_Z,
  WEST_SOUTH_CONNECTOR_MIN_X,
  WEST_SOUTH_CONNECTOR_MIN_Z,
  WEST_SOUTH_INFILL_ZONES,
  WEST_WALKABLE_SHOPS,
  buildWalkableShopColliders,
  clampMotorbikeWestResidentialBounds,
  findWestAlleyAt,
  isInsideWestBikeForbiddenShop,
  subdivideLotSegment,
  type WestRowSegmentDef,
  type WestWalkableShopDef,
} from './westResidentialLayout';

export {
  ALL_WEST_ROW_SEGMENTS,
  SOUTH_CENTER_MID_CONN_CX,
  SOUTH_CENTER_MID_CONN_MAX_X,
  SOUTH_CENTER_MID_CONN_MIN_X,
  SOUTH_CENTER_MIN_Z,
  SOUTH_EXPANSION_EAST_MAX_X,
  SOUTH_FAR_WEST_CONN_CX,
  SOUTH_FAR_WEST_CONN_MAX_X,
  SOUTH_FAR_WEST_CONN_MIN_X,
  SOUTH_HOSP_EAST_CONN_CX,
  SOUTH_HOSP_EAST_CONN_MAX_X,
  SOUTH_HOSP_EAST_CONN_MIN_X,
  SOUTH_HOSP_EAST_MAX_X,
  SOUTH_HOSP_EAST_MIN_X,
  SOUTH_HOSP_MAX_Z,
  SOUTH_HOSP_MIN_Z,
  SOUTH_HOSP_ROAD_MAX_Z,
  SOUTH_HOSP_WEST_CONN_CX,
  SOUTH_HOSP_WEST_CONN_MAX_X,
  SOUTH_HOSP_WEST_CONN_MIN_X,
  SOUTH_HOSP_WEST_MAX_X,
  SOUTH_HOSP_WEST_MIN_X,
  SOUTH_OCEAN_RING_CONN_CX,
  SOUTH_OCEAN_RING_CONN_MAX_X,
  SOUTH_OCEAN_RING_CONN_MIN_X,
  SOUTH_SW_MID_CONN_CX,
  SOUTH_SW_MID_CONN_MAX_X,
  SOUTH_SW_MID_CONN_MIN_X,
  WEST_ALLEYS,
  WEST_INNER_ROADS,
  WEST_RES_ALLEY_MAX_X,
  WEST_RES_ALLEY_MIN_X,
  WEST_RES_EAST_REAR_MAX_X,
  WEST_RES_EXPANSION_MIN_X,
  WEST_RES_HEM426_MAX_X,
  WEST_RES_HEM426_MIN_X,
  WEST_RES_HEM485_MAX_X,
  WEST_RES_HEM485_MIN_X,
  WEST_RES_HEM490_MAX_X,
  WEST_RES_HEM490_MIN_X,
  WEST_RES_HEM545_MAX_X,
  WEST_RES_HEM545_MIN_X,
  WEST_RES_HEM550_MAX_X,
  WEST_RES_HEM550_MIN_X,
  WEST_RES_HEM605_MAX_X,
  WEST_RES_HEM605_MIN_X,
  WEST_RES_HEM610_MAX_X,
  WEST_RES_HEM610_MIN_X,
  WEST_RES_HEM665_MAX_X,
  WEST_RES_HEM665_MIN_X,
  WEST_RES_MAX_X,
  WEST_RES_MAX_Z,
  WEST_RES_MIN_X,
  WEST_RES_MIN_Z,
  WEST_RES_N1_SEGMENTS,
  WEST_RES_N2_SEGMENTS,
  WEST_RES_N3_SEGMENTS,
  WEST_RES_N4_SEGMENTS,
  WEST_RES_REAR_MIN_Z,
  WEST_RES_S1_SEGMENTS,
  WEST_RES_S2_SEGMENTS,
  WEST_RES_S3_SEGMENTS,
  WEST_RES_S4_SEGMENTS,
  WEST_RES_S5_SEGMENTS,
  WEST_RES_S6_SEGMENTS,
  WEST_RES_SC_SEGMENTS,
  WEST_RES_SH_SEGMENTS,
  WEST_RES_SOUTH_MAX_X,
  WEST_RES_SOUTH_MAX_Z,
  WEST_RES_SOUTH_MIN_X,
  WEST_RES_SOUTH_MIN_Z,
  WEST_RES_SOUTH_S3_MAX_X,
  WEST_SOUTH_CONNECTOR_CX,
  WEST_SOUTH_CONNECTOR_MAX_X,
  WEST_SOUTH_CONNECTOR_MAX_Z,
  WEST_SOUTH_CONNECTOR_MIN_X,
  WEST_SOUTH_CONNECTOR_MIN_Z,
  WEST_WALKABLE_SHOPS,
  clampMotorbikeWestResidentialBounds,
  findWestAlleyAt,
  isInsideWestBikeForbiddenShop,
  RESIDENTIAL_AUTO_DOOR_TRIGGER_RADIUS,
  RESIDENTIAL_BALCONY_BOTTOM_Y,
  RESIDENTIAL_F1_HEIGHT,
  RESIDENTIAL_SIGNBOARD_BOTTOM_Y,
  RESIDENTIAL_SIGNBOARD_CENTER_Y,
  RESIDENTIAL_SIGNBOARD_HEIGHT,
  RESIDENTIAL_SIGNBOARD_TOP_Y,
  RESIDENTIAL_SLAB_HEIGHT,
  computeAutoDoorTargetOpen,
  RESIDENTIAL_MARKETS,
  isPointBlockedByClosedResidentialMarkets,
  isResidentialMarketOpenAtHour,
};

export interface WestResidentialAlleyBuildResult {
  staticGroup: THREE.Group;
  dynamicGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  getMarketsClosedFactor: () => number;
  update: (delta: number, rawHour: number, lampFactor: number, playerX?: number, playerZ?: number) => void;
}

const PROCEDURAL_SEGMENTS: WestRowSegmentDef[] = [
  ...WEST_RES_N1_SEGMENTS.slice(4),
  ...WEST_RES_N2_SEGMENTS,
  ...WEST_RES_N3_SEGMENTS,
  ...WEST_RES_N4_SEGMENTS,
  ...WEST_RES_S1_SEGMENTS.slice(3),
  ...WEST_RES_S2_SEGMENTS,
  ...WEST_RES_S3_SEGMENTS,
  ...WEST_RES_S4_SEGMENTS,
  ...WEST_RES_S5_SEGMENTS,
  ...WEST_RES_S6_SEGMENTS,
  ...WEST_RES_SH_SEGMENTS,
  ...WEST_RES_SC_SEGMENTS,
];

function findWalkableShopForLot(row: WestRowSegmentDef['row'], cx: number): WestWalkableShopDef | undefined {
  return WEST_WALKABLE_SHOPS.find(
    (s) => !s.isLegacyCustom && s.row === row && Math.abs(s.cx - cx) < 0.6
  );
}

/**
 * Generates hollow walk-in perimeter wall colliders for any residential house or shophouse,
 * leaving a centered automatic doorway (`doorW`) 100% passable while perimeter walls & rear counter stay solid.
 */
function buildWalkableLotColliders(
  minX: number,
  maxX: number,
  bodyMinZ: number,
  bodyMaxZ: number,
  facingNorth: boolean,
  isShop = false
): IntersectionColliderBox[] {
  const w = maxX - minX;
  const cx = (minX + maxX) * 0.5;
  const wallT = 0.42;
  const doorW = isShop ? Math.min(Math.max(2.6, w * 0.38), 3.4) : Math.min(Math.max(2.4, w * 0.3), 2.8);
  const halfDoor = doorW * 0.5;
  const frontZMin = facingNorth ? bodyMinZ - 0.15 : bodyMaxZ - 0.52;
  const frontZMax = facingNorth ? bodyMinZ + 0.52 : bodyMaxZ + 0.15;
  const rearZMin = facingNorth ? bodyMaxZ - 0.55 : bodyMinZ - 0.1;
  const rearZMax = facingNorth ? bodyMaxZ + 0.1 : bodyMinZ + 0.55;
  const cols: IntersectionColliderBox[] = [
    { minX, maxX: minX + wallT, minZ: bodyMinZ, maxZ: bodyMaxZ, floor: 1 }, // West wall
    { minX: maxX - wallT, maxX, minZ: bodyMinZ, maxZ: bodyMaxZ, floor: 1 }, // East wall
    { minX, maxX, minZ: rearZMin, maxZ: rearZMax, floor: 1 }, // Rear wall
  ];
  if (cx - halfDoor > minX + 0.15) {
    cols.push({ minX, maxX: cx - halfDoor, minZ: frontZMin, maxZ: frontZMax, floor: 1 }); // Front wall W
  }
  if (cx + halfDoor < maxX - 0.15) {
    cols.push({ minX: cx + halfDoor, maxX, minZ: frontZMin, maxZ: frontZMax, floor: 1 }); // Front wall E
  }
  // Compact rear kitchen/service counter collider tucked cleanly against the back wall
  const counterMinZ = facingNorth ? bodyMaxZ - 1.85 : bodyMinZ + 0.65;
  const counterMaxZ = facingNorth ? bodyMaxZ - 0.65 : bodyMinZ + 1.85;
  if (w >= 4.2 && bodyMaxZ - bodyMinZ >= 8.0) {
    cols.push({
      minX: minX + 0.8,
      maxX: maxX - 1.6,
      minZ: counterMinZ,
      maxZ: counterMaxZ,
      floor: 1,
    });
  }
  return cols;
}

function buildWestResidentialColliders(): IntersectionColliderBox[] {
  const archGateColliders: IntersectionColliderBox[] = WEST_ALLEYS.filter((a) => a.hasArch).flatMap((a) => {
    const gzMin =
      a.row === 'N1'
        ? 13.5
        : a.row === 'N2'
          ? -27.2
          : a.row === 'SH2' || a.row === 'SC2'
            ? 112.8
            : a.row === 'SH3'
              ? 156.8
              : 43.3;
    const gzMax =
      a.row === 'N1'
        ? 14.2
        : a.row === 'N2'
          ? -26.5
          : a.row === 'SH2' || a.row === 'SC2'
            ? 113.5
            : a.row === 'SH3'
              ? 157.5
              : 44.0;
    return [
      { minX: a.minX, maxX: a.minX + 0.26, minZ: gzMin, maxZ: gzMax, floor: 1 as const },
      { minX: a.maxX - 0.26, maxX: a.maxX, minZ: gzMin, maxZ: gzMax, floor: 1 as const },
    ];
  });

  // Helper: carve open road/alley mouths out of a 1D perimeter wall range
  const segmentWallSpan = (
    start: number,
    end: number,
    gaps: ReadonlyArray<{ a: number; b: number }>
  ): Array<[number, number]> => {
    const sorted = [...gaps]
      .filter((g) => g.b > start && g.a < end)
      .sort((u, v) => u.a - v.a);
    const out: Array<[number, number]> = [];
    let cursor = start;
    for (const g of sorted) {
      if (g.a > cursor + 0.15) {
        out.push([cursor, Math.min(end, g.a)]);
      }
      cursor = Math.max(cursor, g.b);
    }
    if (cursor < end - 0.15) {
      out.push([cursor, end]);
    }
    return out;
  };

  const coastalGapsZ = WEST_COASTAL_RESIDENTIAL_OPENINGS.map((o) => ({ a: o.minZ, b: o.maxZ }));
  const farWestNorthSegs = segmentWallSpan(-134.2, 15.6, coastalGapsZ);
  const farWestSouthSegs = segmentWallSpan(42.5, 362.2, coastalGapsZ);
  const farNorthRiverSegs = segmentWallSpan(
    -960.2,
    -241.8,
    WEST_RIVER_RESIDENTIAL_OPENINGS.map((o) => ({ a: o.minX, b: o.maxX }))
  );

  const cols: IntersectionColliderBox[] = [
    // Segmented Far-West boundary colliders (X = -960.4..-959.7): leaves ALL 9 inner residential streets 100% OPEN to Đường Ven Biển Võ Nguyên Giáp!
    ...farWestNorthSegs.map(([z1, z2]) => ({ minX: -960.4, maxX: -959.7, minZ: z1, maxZ: z2, floor: 1 as const })),
    ...farWestSouthSegs.map(([z1, z2]) => ({ minX: -960.4, maxX: -959.7, minZ: z1, maxZ: z2, floor: 1 as const })),
    { minX: -434.1, maxX: -433.6, minZ: 52.0, maxZ: 76.0, floor: 1 },   // East edge of S1 body (West curb of 8m South Connector Road)
    { minX: -434.1, maxX: -433.6, minZ: 108.0, maxZ: 134.0, floor: 1 }, // East edge of S2 body (West curb of 8m South Connector Road)
    { minX: -214.0, maxX: -99.6, minZ: 87.5, maxZ: 88.2, floor: 1 },    // North border behind RON Football (separates SH1 from stadium rear)
    { minX: -100.2, maxX: 100.4, minZ: 103.4, maxZ: 104.0, floor: 1 },  // North border of South-Central Mega-District (south of V-GREEN/VinFast/Landmark/Royal/AEON)
    // East outer perimeter at X = 100.0..100.6 (leaves BOTH Vinhomes Ocean Park mouths Z=134.2..161.8 & Z=330.2..357.8 100% OPEN!)
    { minX: 100.0, maxX: 100.6, minZ: 103.6, maxZ: 134.2, floor: 1 },
    { minX: 100.0, maxX: 100.6, minZ: 161.8, maxZ: 330.2, floor: 1 },
    { minX: 100.0, maxX: 100.6, minZ: 357.8, maxZ: 362.2, floor: 1 },
    // Side funnel curbs flanking the two 5m Vinhomes transition bridges (X = 100..105)
    { minX: 100.0, maxX: 105.0, minZ: 133.6, maxZ: 134.2, floor: 1 },
    { minX: 100.0, maxX: 105.0, minZ: 161.8, maxZ: 162.4, floor: 1 },
    { minX: 100.0, maxX: 105.0, minZ: 329.6, maxZ: 330.2, floor: 1 },
    { minX: 100.0, maxX: 105.0, minZ: 357.8, maxZ: 358.4, floor: 1 },
    // Segmented Far-North wall (Z = -134.2..-133.6): leaves ALL 6 Row N4 alleys & Công Viên Tổ 7 100% OPEN to Đường Ven Sông Bạch Đằng Tây!
    ...farNorthRiverSegs.map(([x1, x2]) => ({ minX: x1, maxX: x2, minZ: -134.2, maxZ: -133.6, floor: 1 as const })),
    { minX: -960.2, maxX: 100.6, minZ: 361.6, maxZ: 362.4, floor: 1 },    // Unified Far-South wall (1,060m Southern Park edge)

    // Flush Arch Gate Pillars across major alleys (leave >= 4.9m completely unobstructed driving lanes!)
    ...archGateColliders,

    // -------------------------------------------------------------------
    // HOUSE 1 (X = -371.6..-362.0): NHÀ CÔ BA · TẠP HÓA & TRÀ ĐÁ (WALKABLE!)
    // Open front door: X = -368.8..-364.8 at Z = +5.4
    // -------------------------------------------------------------------
    { minX: -371.65, maxX: -371.15, minZ: -15.8, maxZ: 5.5, floor: 1 }, // West wall
    { minX: -362.45, maxX: -361.95, minZ: -15.8, maxZ: 5.5, floor: 1 }, // East wall
    { minX: -371.65, maxX: -361.95, minZ: -15.9, maxZ: -15.3, floor: 1 }, // Rear wall
    { minX: -371.65, maxX: -368.8, minZ: 5.05, maxZ: 5.65, floor: 1 }, // Front wall W
    { minX: -364.8, maxX: -361.95, minZ: 5.05, maxZ: 5.65, floor: 1 }, // Front wall E
    // Interior Tạp Hóa Shelves, Chiller & Checkout Counter
    { minX: -371.1, maxX: -369.9, minZ: -8.5, maxZ: 2.2, floor: 1 }, // West snack gondola
    { minX: -368.0, maxX: -366.6, minZ: -5.0, maxZ: 1.5, floor: 1 }, // Center grocery island
    { minX: -363.8, maxX: -362.5, minZ: -6.5, maxZ: 2.2, floor: 1 }, // East drink chiller & racks
    { minX: -369.5, maxX: -364.2, minZ: -11.4, maxZ: -9.4, floor: 1 }, // Checkout counter
    // Front Trà Đá Patio Furniture & Bánh Mì Cart
    { minX: -370.8, maxX: -369.1, minZ: 6.1, maxZ: 7.5, floor: 1 }, // Bánh mì glass cart
    { minX: -364.6, maxX: -362.4, minZ: 7.2, maxZ: 12.2, floor: 1 }, // 2 Trà đá plastic table sets

    // -------------------------------------------------------------------
    // HOUSE 2 (X = -381.4..-371.6): NHÀ CHÚ TƯ (WALKABLE WITH AUTO DOOR!)
    // -------------------------------------------------------------------
    ...buildWalkableLotColliders(-381.4, -371.6, -15.8, 5.4, false, false),
    { minX: -381.2, maxX: -378.8, minZ: 9.8, maxZ: 10.6, floor: 1 }, // Front fence W
    { minX: -374.2, maxX: -371.8, minZ: 9.8, maxZ: 10.6, floor: 1 }, // Front fence E
    { minX: -380.8, maxX: -379.0, minZ: 6.2, maxZ: 9.0, floor: 1 }, // Yard scooter & tree planter

    // -------------------------------------------------------------------
    // HOUSE 3 (X = -390.8..-381.4): NHÀ TRỌ SINH VIÊN & GIA ĐÌNH TRẺ (WALKABLE!)
    // -------------------------------------------------------------------
    ...buildWalkableLotColliders(-390.8, -381.4, -15.8, 5.4, false, false),
    { minX: -384.2, maxX: -382.0, minZ: 6.6, maxZ: 11.2, floor: 1 }, // Front bike rack & potted plants

    // -------------------------------------------------------------------
    // HOUSE 4 (X = -405.6..-396.4): QUÁN CƠM GIA ĐÌNH & BÚN BÒ HUẾ (WALKABLE!)
    // Open front door: X = -402.9..-398.7 at Z = +5.4
    // -------------------------------------------------------------------
    { minX: -405.65, maxX: -405.15, minZ: -15.8, maxZ: 5.5, floor: 1 }, // West wall
    { minX: -396.85, maxX: -396.4, minZ: -15.8, maxZ: 5.5, floor: 1 }, // East wall flush with Hẻm 425
    { minX: -405.65, maxX: -396.4, minZ: -15.9, maxZ: -15.3, floor: 1 }, // Rear wall
    { minX: -405.65, maxX: -402.9, minZ: 5.05, maxZ: 5.65, floor: 1 }, // Front wall W
    { minX: -398.7, maxX: -396.4, minZ: 5.05, maxZ: 5.65, floor: 1 }, // Front wall E
    // Interior Quán Cơm Counters & Dining Tables
    { minX: -405.0, maxX: -402.8, minZ: -6.8, maxZ: 2.2, floor: 1 }, // Steam-table food showcase counter
    { minX: -404.6, maxX: -397.4, minZ: -12.8, maxZ: -10.6, floor: 1 }, // Rear kitchen prep & pass counter
    { minX: -399.6, maxX: -396.9, minZ: -4.2, maxZ: -1.6, floor: 1 }, // Dining table 1
    { minX: -399.6, maxX: -396.9, minZ: 0.4, maxZ: 3.0, floor: 1 }, // Dining table 2
    // Front Patio Planter & Standee
    { minX: -405.2, maxX: -403.5, minZ: 6.2, maxZ: 8.6, floor: 1 },

    // -------------------------------------------------------------------
    // HOUSE 5 (X = -415.3..-405.6): NHÀ PHỐ MÁI NGÓI ĐỎ & GIÀN HOA GIẤY (WALKABLE!)
    // -------------------------------------------------------------------
    ...buildWalkableLotColliders(-415.3, -405.6, -15.8, 5.4, false, false),
    { minX: -414.5, maxX: -412.6, minZ: 6.5, maxZ: 9.8, floor: 1 }, // Shade tree & stone bench
    { minX: -414.9, maxX: -412.2, minZ: 10.6, maxZ: 11.4, floor: 1 }, // Low front hedge W
    { minX: -408.4, maxX: -405.9, minZ: 10.6, maxZ: 11.4, floor: 1 }, // Low front hedge E

    // -------------------------------------------------------------------
    // HOUSE 6 (X = -425.0..-415.3): CHUNG CƯ MINI & GIẶT SẤY 24H (WALKABLE!)
    // -------------------------------------------------------------------
    ...buildWalkableLotColliders(-425.0, -415.3, -15.8, 5.4, false, true),
    { minX: -424.6, maxX: -421.8, minZ: 8.4, maxZ: 13.8, floor: 1 }, // Covered resident motorbike bay (leaves center walkway open!)

    // ===================================================================
    // NORTH ROW EXPANSION (X = -545.0..-425.0, Z = -18.0..+15.6)
    // ===================================================================
    // HOUSE 7 (-435.0..-425.4): TIỆM SỬA XE CHÚ BẢY (WALKABLE! Door X=-433.0..-427.4 at Z=5.4)
    { minX: -435.05, maxX: -434.55, minZ: -15.8, maxZ: 5.5, floor: 1 },
    { minX: -425.85, maxX: -425.35, minZ: -15.8, maxZ: 5.5, floor: 1 },
    { minX: -435.05, maxX: -425.35, minZ: -15.9, maxZ: -15.3, floor: 1 },
    { minX: -435.05, maxX: -433.0, minZ: 5.05, maxZ: 5.65, floor: 1 },
    { minX: -427.4, maxX: -425.35, minZ: 5.05, maxZ: 5.65, floor: 1 },
    { minX: -433.6, maxX: -431.7, minZ: -4.8, maxZ: -1.8, floor: 1 }, // Hydraulic bike lift
    { minX: -433.8, maxX: -426.6, minZ: -12.6, maxZ: -10.8, floor: 1 }, // Rear tool bench
    { minX: -426.8, maxX: -426.0, minZ: 0.15, maxZ: 2.25, floor: 1 }, // Customer waiting bench
    // HOUSE 8 (-444.8..-435.0): CÀ PHÊ CÓC HỘI AN CÔ TƯ (WALKABLE!)
    ...buildWalkableLotColliders(-444.8, -435.0, -15.8, 5.4, false, true),
    { minX: -443.9, maxX: -441.8, minZ: 8.6, maxZ: 11.2, floor: 1 },
    // HOUSE 9 (-454.4..-444.8): NHÀ PHỐ TÂN CỔ ĐIỂN MÁI MANSARD (WALKABLE!)
    ...buildWalkableLotColliders(-454.4, -444.8, -15.8, 5.4, false, false),
    // HOUSE 10 (-464.2..-454.4): NHÀ CẤP 4 SÂN VƯỜN (WALKABLE!)
    ...buildWalkableLotColliders(-464.2, -454.4, -15.8, 5.4, false, false),
    { minX: -463.6, maxX: -461.6, minZ: 8.6, maxZ: 11.4, floor: 1 },
    // HOUSE 11 (-473.8..-464.2): PHỞ BÒ & BÚN CHẢ HÀ NỘI (WALKABLE! Door X=-471.2..-466.8 at Z=5.4)
    { minX: -473.85, maxX: -473.35, minZ: -15.8, maxZ: 5.5, floor: 1 },
    { minX: -464.65, maxX: -464.15, minZ: -15.8, maxZ: 5.5, floor: 1 },
    { minX: -473.85, maxX: -464.15, minZ: -15.9, maxZ: -15.3, floor: 1 },
    { minX: -473.85, maxX: -471.2, minZ: 5.05, maxZ: 5.65, floor: 1 },
    { minX: -466.8, maxX: -464.15, minZ: 5.05, maxZ: 5.65, floor: 1 },
    { minX: -473.0, maxX: -471.1, minZ: -5.2, maxZ: 1.5, floor: 1 }, // Phở broth showcase
    { minX: -472.6, maxX: -465.4, minZ: -12.6, maxZ: -10.8, floor: 1 }, // Kitchen pass
    { minX: -467.8, maxX: -465.2, minZ: -5.2, maxZ: -3.2, floor: 1 }, // Dining table 1
    { minX: -467.8, maxX: -465.2, minZ: -1.0, maxZ: 1.0, floor: 1 }, // Dining table 2
    // HOUSE 12 (-482.6..-473.8): NHÀ CHUỒNG CỌP & BARBER 485 (WALKABLE!)
    ...buildWalkableLotColliders(-482.6, -473.8, -15.8, 5.4, false, true),
    // HOUSES 13..17 (-544.4..-488.6) — ALL WALKABLE WITH AUTO DOORS!
    ...buildWalkableLotColliders(-499.4, -488.6, -15.8, 5.4, false, true), // House 13 Nhà Thuốc An Khang
    ...buildWalkableLotColliders(-510.8, -499.4, -15.8, 5.4, false, false), // House 14 Dãy Nhà Trọ
    { minX: -510.4, maxX: -508.8, minZ: 6.2, maxZ: 10.6, floor: 1 }, // Exterior stair footprint (west edge)
    ...buildWalkableLotColliders(-522.2, -510.8, -15.8, 5.4, false, false), // House 15 Nhà Lam Gỗ
    ...buildWalkableLotColliders(-533.6, -522.2, -15.8, 5.4, false, false), // House 16 Biệt Thự Mái Nhật
    ...buildWalkableLotColliders(-544.4, -533.6, -15.8, 5.4, false, true), // House 17 Tiệm Điện Nước 545

    // HOUSES 18..22 (-606.6..-550.4) — ALL WALKABLE WITH AUTO DOORS!
    ...buildWalkableLotColliders(-561.2, -550.4, -15.8, 5.4, false, true), // H18 Bánh Mì Cô Năm 545
    ...buildWalkableLotColliders(-572.6, -561.2, -15.8, 5.4, false, false), // H19 Nhà 4 tầng Đá Granite
    // H20 (-584.2..-572.6): QUÁN HỦ TIẾU NAM VANG 545 (WALKABLE! Door X=-580.6..-576.2 at Z=5.4)
    { minX: -584.25, maxX: -583.75, minZ: -15.8, maxZ: 5.5, floor: 1 },
    { minX: -573.05, maxX: -572.55, minZ: -15.8, maxZ: 5.5, floor: 1 },
    { minX: -584.25, maxX: -572.55, minZ: -15.9, maxZ: -15.3, floor: 1 },
    { minX: -584.25, maxX: -580.6, minZ: 5.05, maxZ: 5.65, floor: 1 },
    { minX: -576.2, maxX: -572.55, minZ: 5.05, maxZ: 5.65, floor: 1 },
    { minX: -582.7, maxX: -581.1, minZ: -5.1, maxZ: 0.7, floor: 1 }, // Noodle cart
    { minX: -582.2, maxX: -574.6, minZ: -12.5, maxZ: -10.9, floor: 1 }, // Rear kitchen
    { minX: -576.6, maxX: -574.0, minZ: -5.0, maxZ: -3.8, floor: 1 }, // Table 1
    { minX: -576.6, maxX: -574.0, minZ: -0.6, maxZ: 0.6, floor: 1 }, // Table 2
    ...buildWalkableLotColliders(-595.7, -584.2, -15.8, 5.4, false, false), // H21 Nhà Cấp 4
    ...buildWalkableLotColliders(-606.6, -595.7, -15.8, 5.4, false, true), // H22 VLXD & Sơn Dulux 545

    // ===================================================================
    // ZONE 2 (ROW N2): Nhà Văn Hóa Tổ 4 (X = -380..-362, Walkable Hall at Z=-54..-38 with rear stage at Z=-51.3..-47.1)
    // ===================================================================
    { minX: -379.8, maxX: -379.35, minZ: -54.0, maxZ: -38.0, floor: 1 }, // West wall
    { minX: -362.65, maxX: -362.2, minZ: -54.0, maxZ: -38.0, floor: 1 }, // East wall
    { minX: -379.8, maxX: -362.2, minZ: -54.0, maxZ: -53.5, floor: 1 }, // Rear wall
    { minX: -379.8, maxX: -373.1, minZ: -38.5, maxZ: -38.0, floor: 1 }, // Front wall W (open auto door -373.1..-368.9!)
    { minX: -368.9, maxX: -362.2, minZ: -38.5, maxZ: -38.0, floor: 1 }, // Front wall E
    { minX: -376.3, maxX: -365.7, minZ: -51.3, maxZ: -47.1, floor: 1 }, // Interior ceremonial stage
    { minX: -374.2, maxX: -368.0, minZ: -30.8, maxZ: -28.8, floor: 1 }, // Stone chess tables
    { minX: -377.0, maxX: -376.0, minZ: -35.0, maxZ: -34.0, floor: 1 }, // Flagpole plinth

    // ===================================================================
    // ZONE 2B (ROW N3): Sân Cầu Lông & Công Viên Mini Tổ 5 (-390..-362, Z=-94..-64)
    // ===================================================================
    { minX: -385.0, maxX: -371.0, minZ: -79.2, maxZ: -78.8, floor: 1 }, // Badminton net
    { minX: -366.2, maxX: -364.8, minZ: -88.0, maxZ: -85.0, floor: 1 }, // East bench 1
    { minX: -366.2, maxX: -364.8, minZ: -73.0, maxZ: -70.0, floor: 1 }, // East bench 2

    // ===================================================================
    // ZONE 3 (ROW S1): "BÊN KIA ĐƯỜNG" — KHU DÂN CƯ NAM TÂY (S1..S16 — ALL WALKABLE!)
    // ===================================================================
    // S1 (-444.0..-434.0): QUÁN CƠM TẤM SÀI GÒN (WALKABLE corner shop at Ngã 3 Đường Kết Nối Nam! Door X=-441.2..-436.8 at Z=52.0)
    { minX: -444.05, maxX: -443.55, minZ: 52.0, maxZ: 76.0, floor: 1 },
    { minX: -434.45, maxX: -433.95, minZ: 52.0, maxZ: 76.0, floor: 1 },
    { minX: -444.05, maxX: -433.95, minZ: 75.4, maxZ: 76.0, floor: 1 },
    { minX: -444.05, maxX: -441.2, minZ: 51.7, maxZ: 52.3, floor: 1 },
    { minX: -436.8, maxX: -433.95, minZ: 51.7, maxZ: 52.3, floor: 1 },
    { minX: -436.8, maxX: -434.8, minZ: 56.8, maxZ: 64.5, floor: 1 }, // Showcase counter
    { minX: -442.8, maxX: -435.2, minZ: 70.2, maxZ: 72.5, floor: 1 }, // Rear kitchen
    { minX: -443.0, maxX: -440.4, minZ: 56.6, maxZ: 59.0, floor: 1 }, // Table 1
    { minX: -443.0, maxX: -440.4, minZ: 61.5, maxZ: 63.9, floor: 1 }, // Table 2
    { minX: -436.5, maxX: -434.5, minZ: 49.6, maxZ: 51.0, floor: 1 }, // Outdoor grill stand
    // S2..S4 (-474.0..-444.0) — ALL WALKABLE!
    ...buildWalkableLotColliders(-454.0, -444.0, 52.0, 76.0, true, false),
    ...buildWalkableLotColliders(-464.0, -454.0, 52.0, 76.0, true, true),
    ...buildWalkableLotColliders(-474.0, -464.0, 52.0, 76.0, true, false),
    // S6 (-482.6..-474.0): QUÁN BÚN ĐẬU MẸT & TRÀ CHANH 426 (WALKABLE! Door X=-480.8..-476.4 at Z=52.0)
    { minX: -482.6, maxX: -482.15, minZ: 52.0, maxZ: 76.0, floor: 1 },
    { minX: -474.45, maxX: -473.95, minZ: 52.0, maxZ: 76.0, floor: 1 },
    { minX: -482.6, maxX: -473.95, minZ: 75.4, maxZ: 76.0, floor: 1 },
    { minX: -482.6, maxX: -480.8, minZ: 51.7, maxZ: 52.3, floor: 1 },
    { minX: -476.4, maxX: -473.95, minZ: 51.7, maxZ: 52.3, floor: 1 },
    { minX: -482.1, maxX: -480.4, minZ: 56.8, maxZ: 64.5, floor: 1 }, // Bamboo prep counter
    { minX: -482.0, maxX: -475.2, minZ: 70.0, maxZ: 72.2, floor: 1 }, // Rear kitchen
    { minX: -477.4, maxX: -474.8, minZ: 56.8, maxZ: 59.2, floor: 1 }, // Table 1
    { minX: -477.4, maxX: -474.8, minZ: 61.6, maxZ: 64.0, floor: 1 }, // Table 2
    { minX: -482.0, maxX: -479.8, minZ: 47.4, maxZ: 49.8, floor: 1 }, // Outdoor trà chanh set
    // S7..S11 (-544.4..-488.6) — ALL WALKABLE!
    ...buildWalkableLotColliders(-497.6, -488.6, 52.0, 76.0, true, true),
    ...buildWalkableLotColliders(-508.8, -497.6, 52.0, 76.0, true, false),
    ...buildWalkableLotColliders(-519.8, -508.8, 52.0, 76.0, true, false),
    ...buildWalkableLotColliders(-531.0, -519.8, 52.0, 76.0, true, true),
    ...buildWalkableLotColliders(-544.4, -531.0, 52.0, 76.0, true, false),
    // S12..S16 (-606.6..-550.4) — ALL WALKABLE!
    ...buildWalkableLotColliders(-561.2, -550.4, 52.0, 76.0, true, true), // S12 Bánh Cuốn Nóng 490
    ...buildWalkableLotColliders(-572.6, -561.2, 52.0, 76.0, true, false), // S13 Granite 4F
    // S14 (-584.2..-572.6): QUÁN BÚN BÒ HUẾ O NGA 490 (WALKABLE! Door X=-580.6..-576.2 at Z=52.0)
    { minX: -584.25, maxX: -583.75, minZ: 52.0, maxZ: 76.0, floor: 1 },
    { minX: -573.05, maxX: -572.55, minZ: 52.0, maxZ: 76.0, floor: 1 },
    { minX: -584.25, maxX: -572.55, minZ: 75.4, maxZ: 76.0, floor: 1 },
    { minX: -584.25, maxX: -580.6, minZ: 51.7, maxZ: 52.3, floor: 1 },
    { minX: -576.2, maxX: -572.55, minZ: 51.7, maxZ: 52.3, floor: 1 },
    { minX: -575.7, maxX: -574.1, minZ: 57.7, maxZ: 63.9, floor: 1 }, // Soup showcase counter
    { minX: -582.2, maxX: -574.6, minZ: 70.4, maxZ: 72.0, floor: 1 }, // Rear kitchen
    { minX: -582.8, maxX: -580.0, minZ: 57.2, maxZ: 58.4, floor: 1 }, // Table 1
    { minX: -582.8, maxX: -580.0, minZ: 62.2, maxZ: 63.4, floor: 1 }, // Table 2
    ...buildWalkableLotColliders(-595.7, -584.2, 52.0, 76.0, true, false), // S15 Nhà Cấp 4
    ...buildWalkableLotColliders(-606.6, -595.7, 52.0, 76.0, true, true), // S16 Phụ Tùng Honda Tây

    // ===================================================================
    // ALL PROCEDURAL ROWS & SEGMENTS (N1 b5..b10, N2, N3, N4, S1 b4..b9, S2..S6, SH1..SH6, SC2..SC6)
    // EVERY SINGLE HOUSE & SHOP IS NOW HOLLOW & WALKABLE THROUGH AUTOMATIC SLIDING DOORS!
    // ===================================================================
    ...(() => {
      let seedCounter = 1;
      return PROCEDURAL_SEGMENTS.flatMap((seg) => {
        const market = findResidentialMarketBySegment(seg.id);
        if (market) {
          seedCounter += seg.count;
          return buildResidentialMarketColliders(market);
        }
        const facingNorth = seg.facingNorth ?? seg.row.startsWith('S');
        return subdivideLotSegment(seg.minX, seg.maxX, seg.count).flatMap((lot) => {
          const s = seedCounter++;
          const shop = findWalkableShopForLot(seg.row, lot.cx);
          if (shop) {
            return buildWalkableShopColliders(shop);
          }
          const isCommercialShop = s % 5 === 0;
          return buildWalkableLotColliders(lot.minX, lot.maxX, seg.bodyMinZ, seg.bodyMaxZ, facingNorth, isCommercialShop);
        });
      });
    })(),
    // ===================================================================
    // SOUTH INFILL BLOCKS (Townhouses & Kiosks facing Nam 1/Nam 2 — ALL WALKABLE WITH AUTO DOORS!)
    // ===================================================================
    ...WEST_SOUTH_INFILL_ZONES.flatMap((z, zoneIdx) => {
      if (z.kind === 's1_townhouses' || z.kind === 's2_kiosk_row') {
        return subdivideLotSegment(z.minX, z.maxX, z.count).flatMap((lot, lotIdx) =>
          buildWalkableLotColliders(lot.minX, lot.maxX, z.minZ, z.maxZ, false, (lotIdx + zoneIdx) % 2 === 0)
        );
      }
      if (z.kind === 's1_night_market') {
        return [{ minX: z.minX + 1.0, maxX: z.maxX - 10.5, minZ: 77.6, maxZ: 82.0, floor: 1 as const }];
      }
      return [];
    }),
  ];
  return cols;
}

export const WEST_RESIDENTIAL_COLLIDERS: IntersectionColliderBox[] = buildWestResidentialColliders();

const _signTexCache = new Map<string, THREE.CanvasTexture>();

function createSignTex(
  title: string,
  subtitle: string,
  opts?: {
    bg?: string;
    bg2?: string;
    border?: string;
    titleColor?: string;
    subColor?: string;
    w?: number;
    h?: number;
  }
): THREE.CanvasTexture {
  const w = Math.min(opts?.w ?? 512, 512);
  const h = Math.min(opts?.h ?? 128, 256);
  const key = `${title}|${subtitle}|${opts?.bg ?? ''}|${opts?.bg2 ?? ''}|${opts?.border ?? ''}|${opts?.titleColor ?? ''}|${opts?.subColor ?? ''}|${w}x${h}`;
  const cached = _signTexCache.get(key);
  if (cached) return cached;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const scale = w / 1024;

  const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, opts?.bg ?? '#991b1b');
  grad.addColorStop(1, opts?.bg2 ?? '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = opts?.border ?? '#fde047';
  ctx.lineWidth = Math.max(4, Math.round(10 * scale));
  const pad = Math.max(4, Math.round(10 * scale));
  ctx.strokeRect(pad, pad, c.width - pad * 2, c.height - pad * 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let size = Math.round(78 * scale);
  const minTitleSize = Math.max(14, Math.round(26 * scale));
  while (size > minTitleSize) {
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    if (ctx.measureText(title).width <= c.width - Math.round(70 * scale)) break;
    size -= 1;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(title, c.width / 2 + 2, c.height * 0.4 + 2, c.width - Math.round(60 * scale));
  ctx.fillStyle = opts?.titleColor ?? '#fef08a';
  ctx.fillText(title, c.width / 2, c.height * 0.4, c.width - Math.round(60 * scale));

  if (subtitle) {
    let subSize = Math.round(36 * scale);
    const minSubSize = Math.max(11, Math.round(18 * scale));
    while (subSize > minSubSize) {
      ctx.font = `700 ${subSize}px system-ui, sans-serif`;
      if (ctx.measureText(subtitle).width <= c.width - Math.round(70 * scale)) break;
      subSize -= 1;
    }
    ctx.fillStyle = opts?.subColor ?? '#ffffff';
    ctx.fillText(subtitle, c.width / 2, c.height * 0.77, c.width - Math.round(60 * scale));
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  _signTexCache.set(key, tex);
  return tex;
}

function createCheckeredTileTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const size = 64;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#fef3c7' : '#d97706';
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 8);
  tex.anisotropy = 4;
  return tex;
}

function createAwningStripeTex(c1: string, c2: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? c1 : c2;
    ctx.fillRect(i * 32, 0, 32, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createNoticeBoardTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 304);
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BẢNG TIN TỔ DÂN PHỐ SỐ 4', 256, 48);

  // Mock pinned community flyers
  const notes = [
    { x: 34, y: 80, w: 130, h: 100, bg: '#fef9c3', t: 'LỊCH HỌP TỔ' },
    { x: 188, y: 80, w: 136, h: 112, bg: '#dbeafe', t: 'GIỮ VỆ SINH' },
    { x: 348, y: 80, w: 130, h: 96, bg: '#fce7f3', t: 'PHÒNG CHÁY' },
    { x: 75, y: 205, w: 360, h: 80, bg: '#ecfdf5', t: 'KHU PHỐ VĂN HÓA • AN TOÀN • VĂN MINH' },
  ];
  notes.forEach((n) => {
    ctx.fillStyle = n.bg;
    ctx.fillRect(n.x, n.y, n.w, n.h);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(n.t, n.x + n.w / 2, n.y + n.h / 2 + 5, n.w - 14);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 249, 214, 0.90)');
  grad.addColorStop(0.35, 'rgba(253, 218, 108, 0.52)');
  grad.addColorStop(0.7, 'rgba(251, 168, 52, 0.18)');
  grad.addColorStop(1, 'rgba(251, 168, 52, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface ResidentNpcAgent {
  grp: THREE.Group;
  proxyGrp: THREE.Group;
  glbHandle: GlbHumanHandle;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  role: 'vendor' | 'seated' | 'home_idle' | 'walker';
  marketId?: 'market_north' | 'market_south';
  baseYaw: number;
  currentYaw: number;
  phase: number;
  speed: number;
  waypoints?: Array<{ x: number; z: number }>;
  segLens?: number[];
  totalDist?: number;
  distPos?: number;
}

interface NeighborhoodMotorbikeAgent {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  wheelR: number;
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  waypoints: Array<{ x: number; z: number }>;
  segLens: number[];
  segIsAlley: boolean[];
  totalDist: number;
  distPos: number;
  baseSpeed: number;
  currentYaw: number;
  currentLean: number;
}

const RES_PROXY_SHIRT_PALETTE = [
  0xf59e0b, 0x0ea5e9, 0x10b981, 0xec4899, 0xe2e8f0, 0xef4444, 0x6366f1, 0x14b8a6, 0xf97316, 0xa855f7,
];
let cachedProxyGeos: {
  torso: THREE.BoxGeometry;
  head: THREE.BoxGeometry;
  leg: THREE.BoxGeometry;
  arm: THREE.BoxGeometry;
} | null = null;
let cachedProxyMats: {
  skin: THREE.MeshStandardMaterial;
  studentShirt: THREE.MeshStandardMaterial;
  studentPants: THREE.MeshStandardMaterial;
  civPants: THREE.MeshStandardMaterial;
  shirts: THREE.MeshStandardMaterial[];
} | null = null;

function getSharedProxyAssets() {
  if (!cachedProxyGeos) {
    cachedProxyGeos = {
      torso: new THREE.BoxGeometry(0.4, 0.56, 0.22),
      head: new THREE.BoxGeometry(0.24, 0.24, 0.24),
      leg: new THREE.BoxGeometry(0.14, 0.68, 0.14),
      arm: new THREE.BoxGeometry(0.12, 0.5, 0.12),
    };
  }
  if (!cachedProxyMats) {
    cachedProxyMats = {
      skin: new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.72 }),
      studentShirt: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.78 }),
      studentPants: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82 }),
      civPants: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 }),
      shirts: RES_PROXY_SHIRT_PALETTE.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 })),
    };
  }
  return { geos: cachedProxyGeos, mats: cachedProxyMats };
}

function createResidentNpcRig(
  role: ResidentNpcAgent['role'],
  x: number,
  y: number,
  z: number,
  yaw: number,
  phase: number,
  seed: number,
  opts?: {
    isStudent?: boolean;
    speed?: number;
    waypoints?: Array<{ x: number; z: number }>;
    startDistFrac?: number;
    marketId?: 'market_north' | 'market_south';
  }
): ResidentNpcAgent {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  const proxyGrp = new THREE.Group();
  grp.add(proxyGrp);

  const { geos, mats } = getSharedProxyAssets();
  const shirtColor = opts?.isStudent ? 0xf8fafc : RES_PROXY_SHIRT_PALETTE[seed % RES_PROXY_SHIRT_PALETTE.length];
  const shirtMat = opts?.isStudent ? mats.studentShirt : mats.shirts[seed % mats.shirts.length];
  const pantsMat = opts?.isStudent ? mats.studentPants : mats.civPants;

  const torso = new THREE.Mesh(geos.torso, shirtMat);
  torso.position.y = 1.02;
  proxyGrp.add(torso);
  const head = new THREE.Mesh(geos.head, mats.skin);
  head.position.y = 1.44;
  proxyGrp.add(head);

  const leftLeg = new THREE.Mesh(geos.leg, pantsMat);
  leftLeg.position.set(-0.1, 0.36, 0);
  proxyGrp.add(leftLeg);
  const rightLeg = new THREE.Mesh(geos.leg, pantsMat);
  rightLeg.position.set(0.1, 0.36, 0);
  proxyGrp.add(rightLeg);

  const leftArm = new THREE.Mesh(geos.arm, shirtMat);
  leftArm.position.set(-0.28, 1.02, 0);
  proxyGrp.add(leftArm);
  const rightArm = new THREE.Mesh(geos.arm, shirtMat);
  rightArm.position.set(0.28, 1.02, 0);
  proxyGrp.add(rightArm);

  let modelChoice = pickOutsideNpcModel(seed);
  if (role === 'vendor') {
    modelChoice = CASHIER_NPC_MODEL;
  } else if (role === 'seated') {
    modelChoice = pickSeatedCivilianModel(seed);
  } else if (role === 'home_idle') {
    modelChoice = seed % 2 === 0 ? pickStationaryCivilianModel(seed) : pickOutsideNpcModel(seed);
  } else if (opts?.isStudent) {
    modelChoice = pickSchoolStudentModel(seed);
  } else if (seed % 3 === 0) {
    modelChoice = pickStationaryCivilianModel(seed);
  }

  const glbHandle = attachGlbHumanToNpc({
    modelSource: modelChoice.modelSource,
    targetHeight: opts?.isStudent ? 1.62 : modelChoice.targetHeight,
    clipProfile: modelChoice.clipProfile,
    rotationY: modelChoice.rotationY,
    hostGroup: grp,
    fallbackMeshes: [proxyGrp],
    initialState: role === 'seated' ? 'Sit' : role === 'walker' ? 'Walk' : 'Idle',
    phaseOffset: phase,
    palette: opts?.isStudent
      ? { shirt: 0xf8fafc, pants: 0x1e293b, accent: [0xef4444, 0x2563eb, 0x10b981, 0xf59e0b][seed % 4] }
      : { shirt: shirtColor, pants: 0x1f2937, accent: 0xf59e0b },
  });

  let segLens: number[] | undefined;
  let totalDist = 0;
  if (opts?.waypoints && opts.waypoints.length >= 2) {
    segLens = [];
    for (let i = 0; i < opts.waypoints.length; i++) {
      const a = opts.waypoints[i];
      const b = opts.waypoints[(i + 1) % opts.waypoints.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      segLens.push(len);
      totalDist += len;
    }
  }

  const initDist =
    totalDist > 0
      ? opts?.startDistFrac !== undefined
        ? (opts.startDistFrac * totalDist) % totalDist
        : (seed * 7.3) % totalDist
      : 0;

  return {
    grp,
    proxyGrp,
    glbHandle,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    role,
    marketId: opts?.marketId,
    baseYaw: yaw,
    currentYaw: yaw,
    phase,
    speed: opts?.speed ?? 1.08,
    waypoints: opts?.waypoints,
    segLens,
    totalDist,
    distPos: initDist,
  };
}

export function createWestResidentialAlleyStructure(): WestResidentialAlleyBuildResult {
  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const addBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = staticGroup,
    rot?: [number, number, number]
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(mesh);
    return mesh;
  };

  // =========================================================================
  // 1. SHARED PBR MATERIALS (Varied Roughness & Metalness)
  // =========================================================================
  const concreteApronMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.88, metalness: 0.04 });
  const alleyBrickMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.84, metalness: 0.05 });
  const alleyBorderMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.86 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.36, metalness: 0.72 });
  const inoxMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.88 });
  const woodMahoganyMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.74, metalness: 0.06 });
  const woodLightMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.68, metalness: 0.05 });
  const terracottaTileMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.72, metalness: 0.08 });
  const slateRoofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.62, metalness: 0.24 });
  const tealTinRoofMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45, metalness: 0.48 });
  const creamTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.68, metalness: 0.04 });
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.45 });
  const clearGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbfdbfe,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.46,
  });
  const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const leafBrightMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.76 });
  const bougainvilleaMat1 = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.7 });
  const bougainvilleaMat2 = new THREE.MeshStandardMaterial({ color: 0xd946ef, roughness: 0.72 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.92 });
  const plasticBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.48 });
  const plasticRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.48 });
  const paintWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });

  // Dynamic glowing residential windows (dim in daytime, bright warm tungsten at night!)
  const warmWinMatA = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0xffe9a3,
    emissiveIntensity: 0.12,
    roughness: 0.18,
    metalness: 0.25,
  });
  const warmWinMatB = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0xffcb85,
    emissiveIntensity: 0.1,
    roughness: 0.18,
    metalness: 0.25,
  });
  const coolWinMatC = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0xdbeafe,
    emissiveIntensity: 0.08,
    roughness: 0.16,
    metalness: 0.3,
  });
  // Managed directly inside WestResidentialAlleySystem.update() so ShopScene doesn't overwrite/clamp brightness!
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xffdf7a,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  const housePorchGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xffd27d,
    emissiveIntensity: 0.2,
    roughness: 0.22,
  });
  const lampHaloShellMat = new THREE.MeshBasicMaterial({
    color: 0x6b5324,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glowPoolTex = createGlowPoolTex();
  const housePorchPoolMat = new THREE.MeshBasicMaterial({
    map: glowPoolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Shared Transparent 2nd-Floor Glass, Bright Interior Room Materials & Automatic Sliding Door Rig System
  const clearSeeThroughGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    metalness: 0.16,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    emissive: 0xffe6ba,
    emissiveIntensity: 0.04,
    roughness: 0.86,
  });
  const interiorFloorWoodMat = new THREE.MeshStandardMaterial({
    color: 0xd6b48c,
    emissive: 0xfde68a,
    emissiveIntensity: 0.0,
    roughness: 0.68,
  });
  const interiorCeilingGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfff0be,
    emissiveIntensity: 0.72,
    roughness: 0.32,
  });
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.0,
    roughness: 0.9,
  });
  const beddingBlueMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.85 });
  const beddingCoralMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.85 });
  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.38,
    roughness: 0.15,
    metalness: 0.4,
  });
  const autoDoorSensorLedMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });

  // Procedural brushed-aluminum & tempered-glass automatic sliding door leaf texture (shared across all doors!)
  const createAutoDoorLeafTex = (): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      // Translucent tinted glass center
      ctx.fillStyle = 'rgba(186, 230, 253, 0.34)';
      ctx.fillRect(0, 0, 128, 256);
      // Diagonal glass sheen highlight
      const sheen = ctx.createLinearGradient(0, 0, 128, 256);
      sheen.addColorStop(0, 'rgba(255,255,255,0.28)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0.06)');
      sheen.addColorStop(1, 'rgba(255,255,255,0.22)');
      ctx.fillStyle = sheen;
      ctx.fillRect(10, 10, 108, 236);
      // Frosted horizontal safety stripe
      ctx.fillStyle = 'rgba(248, 250, 252, 0.52)';
      ctx.fillRect(10, 118, 108, 22);
      // Dark aluminum perimeter frame
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 114, 242);
      // Sleek stainless steel vertical pull handle near center seam
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(98, 92, 8, 72);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const autoDoorLeafMat = new THREE.MeshStandardMaterial({
    map: createAutoDoorLeafTex(),
    transparent: true,
    opacity: 0.86,
    roughness: 0.14,
    metalness: 0.28,
    depthWrite: false,
  });
  const autoDoorUnitGeo = new THREE.BoxGeometry(1, 1, 1);
  const autoDoors: AutoSlidingDoorRig[] = [];

  const registerAutoDoor = (
    wx: number,
    wz: number,
    facingNorth: boolean,
    doorW: number,
    lotW: number,
    doorH = 2.68
  ) => {
    const leafW = doorW * 0.5;
    const baseHalfW = leafW * 0.5;
    const maxSafeSlide = Math.max(0.75, (lotW - doorW) * 0.45);
    const slideDist = Math.min(leafW * 0.9, maxSafeSlide);
    const root = new THREE.Group();
    root.position.set(wx, 0, wz);
    if (facingNorth) root.rotation.y = Math.PI;

    const leftLeaf = new THREE.Mesh(autoDoorUnitGeo, autoDoorLeafMat);
    leftLeaf.scale.set(leafW, doorH, 0.055);
    leftLeaf.position.set(-baseHalfW, 0.04 + doorH * 0.5, 0);
    root.add(leftLeaf);

    const rightLeaf = new THREE.Mesh(autoDoorUnitGeo, autoDoorLeafMat);
    rightLeaf.scale.set(leafW, doorH, 0.055);
    rightLeaf.position.set(baseHalfW, 0.04 + doorH * 0.5, 0);
    root.add(rightLeaf);

    dynamicGroup.add(root);
    autoDoors.push({
      root,
      leftLeaf,
      rightLeaf,
      wx,
      wz,
      baseHalfW,
      slideDist,
      openFrac: 0,
    });
  };

  // Activity registries for living interiors (every house), walkable eateries, and active driveway motorbikes
  const houseSlots: ResidentialHouseActivitySlot[] = [];
  const walkableShopSlots: WalkableShopActivitySlot[] = [];
  const drivewayBikeSlots: DrivewayBikeSlot[] = [];
  const drivewayRoadCounts = new Map<string, number>();
  const MAX_DRIVEWAY_COMMUTER_BIKES = 40;

  interface FacingRoadMatch {
    roadId: string;
    cz: number;
    x1: number;
    x2: number;
    laneOffset: number;
  }

  const findFacingRoadForDriveway = (x: number, yardOutZ: number, facingNorth: boolean): FacingRoadMatch | null => {
    const dir = facingNorth ? -1 : 1;
    // Check main West Boulevard first (cz = 29.0, lanes at ±4.2m)
    if (x >= -954 && x <= -366) {
      const dzBlvd = (29.0 - yardOutZ) * dir;
      if (dzBlvd >= 4.0 && dzBlvd <= 19.5) {
        return { roadId: 'west_boulevard', cz: 29.0, x1: -956.0, x2: -366.0, laneOffset: 4.1 };
      }
    }
    let best: FacingRoadMatch | null = null;
    let bestDz = 1e9;
    for (let i = 0; i < WEST_INNER_ROADS.length; i++) {
      const r = WEST_INNER_ROADS[i];
      if (x < r.x1 + 8.0 || x > r.x2 - 8.0) continue;
      const dz = (r.cz - yardOutZ) * dir;
      if (dz >= 1.5 && dz <= 16.5 && dz < bestDz) {
        bestDz = dz;
        best = {
          roadId: r.id,
          cz: r.cz,
          x1: r.x1 + 6.0,
          x2: r.x2 - 6.0,
          laneOffset: r.width >= 12 ? 3.2 : 1.95,
        };
      }
    }
    return best;
  };

  const walkableShopCoordKeys = new Set<string>();
  const registerHouseSlot = (slot: Omit<ResidentialHouseActivitySlot, 'id'>) => {
    houseSlots.push({ id: houseSlots.length, ...slot });
  };

  const registerWalkableShopSlot = (slot: WalkableShopActivitySlot) => {
    walkableShopCoordKeys.add(`${Math.round(slot.cx * 10)}:${Math.round(slot.cz * 10)}`);
    walkableShopSlots.push(slot);
  };

  const tryClaimDrivewayBike = (slot: DrivewayBikeSlot): boolean => {
    if (drivewayBikeSlots.length >= MAX_DRIVEWAY_COMMUTER_BIKES) return false;
    const road = findFacingRoadForDriveway(slot.yardOutX, slot.yardOutZ, slot.facingNorth);
    if (!road) return false;
    const roadKey = `${road.roadId}_${slot.facingNorth ? 'N' : 'S'}`;
    const countOnSide = drivewayRoadCounts.get(roadKey) ?? 0;
    const maxPerSide = road.roadId === 'west_boulevard' ? 4 : 3;
    if (countOnSide >= maxPerSide) return false;
    for (let i = 0; i < drivewayBikeSlots.length; i++) {
      const prev = drivewayBikeSlots[i];
      const dx = prev.parkX - slot.parkX;
      const dz = prev.parkZ - slot.parkZ;
      if (dx * dx + dz * dz < 20 * 20) return false;
    }
    drivewayRoadCounts.set(roadKey, countOnSide + 1);
    drivewayBikeSlots.push(slot);
    return true;
  };

  // =========================================================================
  // 2. LOT FOUNDATIONS, 56 ALLEYWAYS & 5 ĐƯỜNG NỘI KHU DÂN CƯ (-960..-227.5)
  // =========================================================================
  // Row N1 concrete foundation (X = -960..-362, width 598m, midX = -661.0, Z = -18..+15.6)
  addBox(598.0, 0.34, 33.6, concreteApronMat, -661.0, -0.15, -1.2);
  // All 5 Inner Neighborhood Asphalt Roads & Dashed Yellow Centerlines
  // Matched to main boulevard asphalt (0x3f3f46) and clipped cleanly at X=-241.0 where sloped aprons merge seamlessly into Đại Lộ Bệnh Viện (Y=-0.26)
  const internalRoadMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.94 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.65 });
  const whiteMarkingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  WEST_INNER_ROADS.forEach((r) => {
    // Split cleanly around Đại Lộ Bệnh Viện (X = -241.0..-214.0, sunken at Y=-0.26) and clip at X = 100.0 (Vinhomes ramps cover 100..105)
    const clippedX2 = Math.min(r.x2, 100.0);
    const roadSegments: Array<[number, number]> = [];
    if (r.x1 < -241.0) {
      roadSegments.push([r.x1, Math.min(clippedX2, -241.0)]);
    }
    if (clippedX2 > -214.0) {
      roadSegments.push([Math.max(r.x1, -214.0), clippedX2]);
    }
    const isWideAvenue = r.width >= 14.0;
    roadSegments.forEach(([segX1, segX2]) => {
      const roadLen = segX2 - segX1;
      if (roadLen <= 0.5) return;
      const midX = (segX1 + segX2) * 0.5;
      addBox(roadLen, 0.04, r.width, internalRoadMat, midX, 0.015, r.cz);
      for (let rx = segX1 + 4; rx <= segX2 - 2.5; rx += 6.0) {
        // Pause dashed centerlines inside all 7 North-South connector intersections!
        if (r.cz >= 194 && rx >= SOUTH_FAR_WEST_CONN_MIN_X - 1.5 && rx <= SOUTH_FAR_WEST_CONN_MAX_X + 1.5) continue;
        if (r.cz >= 194 && rx >= SOUTH_SW_MID_CONN_MIN_X - 1.5 && rx <= SOUTH_SW_MID_CONN_MAX_X + 1.5) continue;
        if (r.cz > 50 && r.cz < 160 && rx >= WEST_SOUTH_CONNECTOR_MIN_X - 1.5 && rx <= WEST_SOUTH_CONNECTOR_MAX_X + 1.5) continue;
        if (r.cz >= 148 && rx >= SOUTH_HOSP_WEST_CONN_MIN_X - 1.5 && rx <= SOUTH_HOSP_WEST_CONN_MAX_X + 1.5) continue;
        if (r.cz >= 104 && rx >= SOUTH_HOSP_EAST_CONN_MIN_X - 1.5 && rx <= SOUTH_HOSP_EAST_CONN_MAX_X + 1.5) continue;
        if (r.cz >= 104 && rx >= SOUTH_CENTER_MID_CONN_MIN_X - 1.5 && rx <= SOUTH_CENTER_MID_CONN_MAX_X + 1.5) continue;
        if (r.cz >= 104 && rx >= SOUTH_OCEAN_RING_CONN_MIN_X - 1.5 && rx <= SOUTH_OCEAN_RING_CONN_MAX_X + 1.5) continue;
        if (isWideAvenue) {
          addBox(4.8, 0.015, 0.12, dashMat, rx, 0.036, r.cz - 0.16);
          addBox(4.8, 0.015, 0.12, dashMat, rx, 0.036, r.cz + 0.16);
          addBox(2.4, 0.015, 0.12, whiteMarkingMat, rx, 0.036, r.cz - 4.0);
          addBox(2.4, 0.015, 0.12, whiteMarkingMat, rx, 0.036, r.cz + 4.0);
        } else {
          addBox(2.5, 0.015, 0.14, dashMat, rx, 0.036, r.cz);
        }
      }
    });
  });

  // 8m North-South Connector Road (X = -434..-426, Z = 39.4..156.0) joining Đại Lộ Trung Tâm <-> Ngã 3 Nam 1 <-> Ngã 3 Nam 2!
  const southConnW = WEST_SOUTH_CONNECTOR_MAX_X - WEST_SOUTH_CONNECTOR_MIN_X;
  const southConnFlatMinZ = 39.4;
  const southConnFlatMaxZ = WEST_SOUTH_CONNECTOR_MAX_Z;
  addBox(
    southConnW,
    0.04,
    southConnFlatMaxZ - southConnFlatMinZ,
    internalRoadMat,
    WEST_SOUTH_CONNECTOR_CX,
    0.016,
    (southConnFlatMinZ + southConnFlatMaxZ) * 0.5
  );
  // Flush sloped asphalt ramp (Z = 37.2..39.4) connecting Đại Lộ Trung Tâm (-0.26) smoothly up to Đường Kết Nối Nam (+0.035)
  addBox(
    southConnW,
    0.26,
    2.24,
    internalRoadMat,
    WEST_SOUTH_CONNECTOR_CX,
    -0.24,
    38.3,
    staticGroup,
    [-Math.atan2(0.30, 2.2), 0, 0]
  );
  [
    [42.5, 94.0],
    [102.0, 148.0],
  ].forEach(([zA, zB]) => {
    const segLen = zB - zA;
    const midZ = (zA + zB) * 0.5;
    addBox(0.24, 0.05, segLen, alleyBorderMat, WEST_SOUTH_CONNECTOR_MIN_X + 0.12, 0.025, midZ);
    addBox(0.24, 0.05, segLen, alleyBorderMat, WEST_SOUTH_CONNECTOR_MAX_X - 0.12, 0.025, midZ);
  });
  for (let rz = 44.0; rz <= 145.5; rz += 6.0) {
    if (rz >= 92.5 && rz <= 103.5) continue;
    addBox(0.14, 0.015, 2.5, dashMat, WEST_SOUTH_CONNECTOR_CX, 0.037, rz);
  }
  for (let cx = WEST_SOUTH_CONNECTOR_MIN_X + 0.7; cx <= WEST_SOUTH_CONNECTOR_MAX_X - 0.7; cx += 1.1) {
    addBox(0.55, 0.015, 1.9, whiteMarkingMat, cx, 0.038, 40.9);
  }
  addBox(3.4, 0.015, 0.28, whiteMarkingMat, WEST_SOUTH_CONNECTOR_CX + 1.85, 0.038, 42.6);
  addBox(0.28, 0.015, 3.4, whiteMarkingMat, WEST_SOUTH_CONNECTOR_MIN_X - 0.6, 0.038, 99.8);
  addBox(0.28, 0.015, 3.4, whiteMarkingMat, WEST_SOUTH_CONNECTOR_MIN_X - 0.6, 0.038, 153.8);
  addBox(0.28, 0.015, 3.4, whiteMarkingMat, WEST_SOUTH_CONNECTOR_MAX_X + 0.6, 0.038, 150.2);

  // Helper to build all 6 Southern 8m North-South Ring Connectors tying Nam 2..Nam 6 into one zero-dead-end grid!
  const buildSouthernNsConnector = (
    minX: number,
    maxX: number,
    cx: number,
    zStart: number,
    zEnd: number,
    curbSpans: Array<[number, number]>,
    eastMouthGap?: [number, number]
  ) => {
    const w = maxX - minX;
    addBox(w, 0.04, zEnd - zStart, internalRoadMat, cx, 0.016, (zStart + zEnd) * 0.5);
    curbSpans.forEach(([zA, zB]) => {
      const segLen = zB - zA;
      const midZ = (zA + zB) * 0.5;
      addBox(0.24, 0.05, segLen, alleyBorderMat, minX + 0.12, 0.025, midZ);
      if (eastMouthGap && zB > eastMouthGap[0] && zA < eastMouthGap[1]) {
        if (eastMouthGap[0] > zA + 0.5) {
          const l1 = eastMouthGap[0] - zA;
          addBox(0.24, 0.05, l1, alleyBorderMat, maxX - 0.12, 0.025, zA + l1 * 0.5);
        }
        if (zB > eastMouthGap[1] + 0.5) {
          const l2 = zB - eastMouthGap[1];
          addBox(0.24, 0.05, l2, alleyBorderMat, maxX - 0.12, 0.025, eastMouthGap[1] + l2 * 0.5);
        }
      } else {
        addBox(0.24, 0.05, segLen, alleyBorderMat, maxX - 0.12, 0.025, midZ);
      }
    });
    for (let rz = zStart + 10.0; rz <= zEnd - 18.0; rz += 6.0) {
      if (
        (rz >= 102.5 && rz <= 113.5) ||
        (rz >= 146.5 && rz <= 157.5) ||
        (rz >= 192.5 && rz <= 203.5) ||
        (rz >= 238.5 && rz <= 249.5) ||
        (rz >= 288.5 && rz <= 299.5) ||
        rz >= 334.5
      ) {
        continue;
      }
      addBox(0.14, 0.015, 2.5, dashMat, cx, 0.037, rz);
    }
  };

  // 1. Far-West Southern Ring Connector (X = -960..-952, Z = 194..352)
  buildSouthernNsConnector(SOUTH_FAR_WEST_CONN_MIN_X, SOUTH_FAR_WEST_CONN_MAX_X, SOUTH_FAR_WEST_CONN_CX, 194.0, 352.0, [
    [202.0, 240.0],
    [248.0, 290.0],
    [298.0, 336.0],
  ]);
  // 2. Southwest Mid Ring Connector (X = -619..-611, Z = 194..352)
  buildSouthernNsConnector(SOUTH_SW_MID_CONN_MIN_X, SOUTH_SW_MID_CONN_MAX_X, SOUTH_SW_MID_CONN_CX, 194.0, 352.0, [
    [202.0, 240.0],
    [248.0, 290.0],
    [298.0, 336.0],
  ]);
  // 3. South Hospital West Ring Connector (X = -305..-297, Z = 148..352)
  buildSouthernNsConnector(SOUTH_HOSP_WEST_CONN_MIN_X, SOUTH_HOSP_WEST_CONN_MAX_X, SOUTH_HOSP_WEST_CONN_CX, 148.0, 352.0, [
    [156.0, 194.0],
    [202.0, 240.0],
    [248.0, 290.0],
    [298.0, 336.0],
  ]);
  // 4. South Hospital East Ring Connector (X = -108..-100, Z = 104..352)
  buildSouthernNsConnector(SOUTH_HOSP_EAST_CONN_MIN_X, SOUTH_HOSP_EAST_CONN_MAX_X, SOUTH_HOSP_EAST_CONN_CX, 104.0, 352.0, [
    [112.0, 148.0],
    [156.0, 194.0],
    [202.0, 240.0],
    [248.0, 290.0],
    [298.0, 336.0],
  ]);
  // 5. South-Central Mid Axis Connector (X = -6..+2, Z = 104..352)
  buildSouthernNsConnector(SOUTH_CENTER_MID_CONN_MIN_X, SOUTH_CENTER_MID_CONN_MAX_X, SOUTH_CENTER_MID_CONN_CX, 104.0, 352.0, [
    [112.0, 148.0],
    [156.0, 194.0],
    [202.0, 240.0],
    [248.0, 290.0],
    [298.0, 336.0],
  ]);
  // 6. Vinhomes Ocean Park West Ring Connector (X = +92..+100, Z = 104..352, open on East side at North Vinhomes Crossroad Z=139.6..156.4!)
  buildSouthernNsConnector(
    SOUTH_OCEAN_RING_CONN_MIN_X,
    SOUTH_OCEAN_RING_CONN_MAX_X,
    SOUTH_OCEAN_RING_CONN_CX,
    104.0,
    352.0,
    [
      [112.0, 139.6],
      [156.4, 194.0],
      [202.0, 240.0],
      [248.0, 290.0],
      [298.0, 335.6],
    ],
    [139.6, 156.4]
  );

  // TWO FLUSH SLOPED ASPHALT TRANSITION RAMPS (X = 99.7..105.0) LINKING OUR NEW SOUTH-CENTRAL MEGA-DISTRICT (+0.035) SEAMLESSLY INTO VINHOMES OCEAN PARK (-0.26)!
  const vhRampSlope = -Math.atan2(0.295, 5.3);
  // (A) North Crossroad Mouth (Đường Ngang Ocean Park Bắc, Z = 139.6..156.4, center Z = 148.0)
  addBox(8.2, 0.04, 16.8, internalRoadMat, 96.0, 0.017, 148.0);
  addBox(5.34, 0.26, 16.8, internalRoadMat, 102.35, -0.24, 148.0, staticGroup, [0, 0, vhRampSlope]);
  addBox(5.3, 0.04, 5.3, concreteApronMat, 102.35, -0.01, 136.95);
  addBox(5.3, 0.04, 5.3, concreteApronMat, 102.35, -0.01, 159.05);
  addBox(5.2, 0.015, 0.14, dashMat, 102.35, -0.10, 147.84, staticGroup, [0, 0, vhRampSlope]);
  addBox(5.2, 0.015, 0.14, dashMat, 102.35, -0.10, 148.16, staticGroup, [0, 0, vhRampSlope]);
  // (B) South Crossroad Mouth (Đường Ngang Ocean Park Nam <-> Đại Lộ Nam 6, Z = 335.6..352.4, center Z = 344.0)
  addBox(8.2, 0.04, 16.8, internalRoadMat, 96.0, 0.017, 344.0);
  addBox(5.34, 0.26, 16.8, internalRoadMat, 102.35, -0.24, 344.0, staticGroup, [0, 0, vhRampSlope]);
  addBox(5.3, 0.04, 5.3, concreteApronMat, 102.35, -0.01, 332.95);
  addBox(5.3, 0.04, 5.3, concreteApronMat, 102.35, -0.01, 355.05);
  addBox(5.2, 0.015, 0.14, dashMat, 102.35, -0.10, 343.84, staticGroup, [0, 0, vhRampSlope]);
  addBox(5.2, 0.015, 0.14, dashMat, 102.35, -0.10, 344.16, staticGroup, [0, 0, vhRampSlope]);

  // Row N2 (Z=-56..-26), Row N3 (Z=-94..-64), Row N4 (Z=-134..-102): X = -960..-242 (width 718m, midX = -601.0)
  addBox(718.0, 0.34, 30.0, concreteApronMat, -601.0, -0.15, -41.0);
  addBox(718.0, 0.34, 30.0, concreteApronMat, -601.0, -0.15, -79.0);
  addBox(718.0, 0.34, 32.0, concreteApronMat, -601.0, -0.15, -118.0);
  // Row S1 (Z=42.5..94.0) & Row S2 (Z=102..148): X = -960..-434 (width 526m, midX = -697.0)
  addBox(526.0, 0.34, 51.5, concreteApronMat, -697.0, -0.15, 68.25);
  addBox(526.0, 0.34, 46.0, concreteApronMat, -697.0, -0.15, 125.0);
  // Row S3 (Z=156..194): X = -960..-305 (shrunk cleanly above Nam 3 road!)
  addBox(655.0, 0.34, 38.0, concreteApronMat, -632.5, -0.15, 175.0);
  // NEW Southwest Mega-Expansion Foundations: S4 (Z=202..240), S5 (Z=248..290), S6 (Z=298..336) across X = -952..-305 (width 647m, midX = -628.5)
  addBox(647.0, 0.34, 38.0, concreteApronMat, -628.5, -0.15, 221.0);
  addBox(647.0, 0.34, 42.0, concreteApronMat, -628.5, -0.15, 269.0);
  addBox(647.0, 0.34, 38.0, concreteApronMat, -628.5, -0.15, 317.0);

  // South Hospital Residential Quarter Concrete Lot Foundations (West Wing -297..-241 & East Wing -214..-108)
  addBox(114.0, 0.34, 16.0, concreteApronMat, -157.0, -0.15, 96.0);  // SH1 East (Z=88..104)
  addBox(64.0, 0.34, 13.0, concreteApronMat, -273.0, -0.15, 141.5);  // SH2 West behind Hospital Parking (Z=135..148)
  addBox(106.0, 0.34, 36.0, concreteApronMat, -161.0, -0.15, 130.0); // SH2 East (Z=112..148)
  addBox(56.0, 0.34, 38.0, concreteApronMat, -269.0, -0.15, 175.0);  // SH3 West (Z=156..194)
  addBox(106.0, 0.34, 38.0, concreteApronMat, -161.0, -0.15, 175.0); // SH3 East (Z=156..194)
  addBox(56.0, 0.34, 38.0, concreteApronMat, -269.0, -0.15, 221.0);  // SH4 West (Z=202..240)
  addBox(106.0, 0.34, 38.0, concreteApronMat, -161.0, -0.15, 221.0); // SH4 East (Z=202..240)
  addBox(56.0, 0.34, 42.0, concreteApronMat, -269.0, -0.15, 269.0);  // SH5 West (Z=248..290)
  addBox(106.0, 0.34, 42.0, concreteApronMat, -161.0, -0.15, 269.0); // SH5 East (Z=248..290)
  addBox(56.0, 0.34, 38.0, concreteApronMat, -269.0, -0.15, 317.0);  // SH6 West (Z=298..336)
  addBox(106.0, 0.34, 38.0, concreteApronMat, -161.0, -0.15, 317.0); // SH6 East (Z=298..336)

  // NEW South-Central Residential Mega-District Foundations (SC2..SC6, X = -100..+92, width 192m, midX = -4.0)
  addBox(192.0, 0.34, 28.0, concreteApronMat, -4.0, -0.15, 126.0);   // SC2 (Z=112..140, leaves Z=140..156 clear for Ocean Park Bắc!)
  addBox(192.0, 0.34, 38.0, concreteApronMat, -4.0, -0.15, 175.0);   // SC3 (Z=156..194)
  addBox(192.0, 0.34, 38.0, concreteApronMat, -4.0, -0.15, 221.0);   // SC4 (Z=202..240)
  addBox(192.0, 0.34, 42.0, concreteApronMat, -4.0, -0.15, 269.0);   // SC5 (Z=248..290)
  addBox(192.0, 0.34, 38.0, concreteApronMat, -4.0, -0.15, 317.0);   // SC6 (Z=298..336)

  // Helper to pave all 101 unobstructed 5.6m..6.0m alleys with brick surface, edge curbs & flush sloped ramps onto Đại Lộ Trung Tâm
  const alleyBoulevardSlope = Math.atan2(0.30, 2.2);
  const paveAlley = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const w = maxX - minX;
    const cx = (minX + maxX) * 0.5;
    const connectsNorthBlvd = Math.abs(maxZ - 20.8) < 0.05;
    const connectsSouthBlvd = Math.abs(minZ - 37.2) < 0.05;
    const flatMinZ = connectsSouthBlvd ? 39.4 : minZ;
    const flatMaxZ = connectsNorthBlvd ? 18.6 : maxZ;
    const len = flatMaxZ - flatMinZ;
    const midZ = (flatMinZ + flatMaxZ) * 0.5;
    addBox(w, 0.04, len, alleyBrickMat, cx, 0.02, midZ);
    addBox(0.24, 0.05, len, alleyBorderMat, minX + 0.12, 0.025, midZ);
    addBox(0.24, 0.05, len, alleyBorderMat, maxX - 0.12, 0.025, midZ);
    if (connectsNorthBlvd) {
      addBox(w, 0.26, 2.24, internalRoadMat, cx, -0.24, 19.7, staticGroup, [alleyBoulevardSlope, 0, 0]);
    }
    if (connectsSouthBlvd) {
      addBox(w, 0.26, 2.24, internalRoadMat, cx, -0.24, 38.3, staticGroup, [-alleyBoulevardSlope, 0, 0]);
    }
  };
  WEST_ALLEYS.forEach((a) => paveAlley(a.minX, a.maxX, a.minZ, a.maxZ));

  // Neighborhood Outer Boundary Walls — cleanly segmented around ALL 7 Sông Hàn riverfront openings & ALL 9 coastal inner-street openings!
  const carveVisualSpan = (
    start: number,
    end: number,
    gaps: ReadonlyArray<{ a: number; b: number }>
  ): Array<[number, number]> => {
    const sorted = [...gaps]
      .filter((g) => g.b > start && g.a < end)
      .sort((u, v) => u.a - v.a);
    const out: Array<[number, number]> = [];
    let cursor = start;
    for (const g of sorted) {
      if (g.a > cursor + 0.15) {
        out.push([cursor, Math.min(end, g.a)]);
      }
      cursor = Math.max(cursor, g.b);
    }
    if (cursor < end - 0.15) {
      out.push([cursor, end]);
    }
    return out;
  };
  carveVisualSpan(
    -960.0,
    -242.0,
    WEST_RIVER_RESIDENTIAL_OPENINGS.map((o) => ({ a: o.minX, b: o.maxX }))
  ).forEach(([x1, x2]) => {
    const segW = x2 - x1;
    const midX = (x1 + x2) * 0.5;
    addBox(segW, 1.85, 0.45, creamTrimMat, midX, 0.92, -133.9);
    addBox(segW + 0.15, 0.16, 0.6, terracottaTileMat, midX, 1.9, -133.9);
  });
  // Unified Far-South decorative tiled perimeter wall behind Southern Linear Park (X = -960..+100, Z = 362.0)
  addBox(1060.4, 1.75, 0.45, creamTrimMat, -430.0, 0.88, 362.0);
  addBox(1060.6, 0.16, 0.6, terracottaTileMat, -430.0, 1.8, 362.0);
  // Segmented Far-West boundary walls at X = -960.0: leaves Bắc 1/2/3 & Nam 1/2/3/4/5/6 wide open to Đường Ven Biển!
  const coastalWallGaps = WEST_COASTAL_RESIDENTIAL_OPENINGS.map((o) => ({ a: o.minZ, b: o.maxZ }));
  [
    ...carveVisualSpan(-134.0, 15.6, coastalWallGaps),
    ...carveVisualSpan(42.5, 362.0, coastalWallGaps),
  ].forEach(([z1, z2]) => {
    const segLen = z2 - z1;
    const midZ = (z1 + z2) * 0.5;
    addBox(0.36, 1.1, segLen, creamTrimMat, -960.0, 0.55, midZ);
  });
  // North borders behind RON Football (-214..-100, Z=87.9) & South-Central Mega-District (-100..+100, Z=103.7)
  addBox(114.2, 1.7, 0.42, creamTrimMat, -157.0, 0.85, 87.9);
  addBox(114.4, 0.15, 0.56, terracottaTileMat, -157.0, 1.74, 87.9);
  addBox(200.4, 1.7, 0.42, creamTrimMat, 0.0, 0.85, 103.7);
  addBox(200.6, 0.15, 0.56, terracottaTileMat, 0.0, 1.74, 103.7);
  // East decorative tiled wall at X = 100.3 segmented neatly around the two wide-open Vinhomes Ocean Park mouths!
  [
    [103.6, 134.2],
    [161.8, 330.2],
    [357.8, 362.2],
  ].forEach(([zA, zB]) => {
    const segLen = zB - zA;
    const midZ = (zA + zB) * 0.5;
    addBox(0.42, 1.7, segLen, creamTrimMat, 100.3, 0.85, midZ);
    addBox(0.56, 0.15, segLen + 0.1, terracottaTileMat, 100.3, 1.74, midZ);
  });

  // Helper: Potted Bougainvillea / Street Planter
  const addPlanterBush = (x: number, y: number, z: number, flower = false) => {
    addBox(0.68, 0.46, 0.68, terracottaTileMat, x, y + 0.23, z);
    const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 1), leafDarkMat);
    b1.position.set(x, y + 0.64, z);
    staticGroup.add(b1);
    const b2 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.22, 1),
      flower ? bougainvilleaMat1 : leafBrightMat
    );
    b2.position.set(x + 0.1, y + 0.84, z + 0.05);
    staticGroup.add(b2);
  };

  // Helper: Shade Tree (Composite Trunk + 3-sphere Canopy)
  const addYardTree = (x: number, z: number, scale = 1.0, hasFlowers = false) => {
    const tg = new THREE.Group();
    tg.position.set(x, 0.02, z);
    tg.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.3, 8), trunkMat);
    trunk.position.y = 1.15;
    tg.add(trunk);
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.28, 1), leafDarkMat);
    c1.position.set(0, 2.85, 0);
    tg.add(c1);
    const c2 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.95, 1),
      hasFlowers ? bougainvilleaMat1 : leafBrightMat
    );
    c2.position.set(0.5, 3.35, 0.35);
    tg.add(c2);
    const c3 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.8, 1),
      hasFlowers ? bougainvilleaMat2 : leafDarkMat
    );
    c3.position.set(-0.45, 3.1, -0.3);
    tg.add(c3);
    staticGroup.add(tg);
  };

  // Helper: Rooftop Stainless Water Tank (Bồn Nước Inox đặc trưng nhà ống VN)
  const addInoxWaterTank = (x: number, y: number, z: number) => {
    // Steel cradle legs
    addBox(0.9, 0.55, 0.08, darkMetalMat, x, y + 0.275, z - 0.52);
    addBox(0.9, 0.55, 0.08, darkMetalMat, x, y + 0.275, z + 0.52);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.45, 14), inoxMat);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(x, y + 0.92, z);
    staticGroup.add(tank);
    // Decorative bands
    [-0.4, 0.4].forEach((oz) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.08, 14), darkMetalMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(x, y + 0.92, z + oz);
      staticGroup.add(band);
    });
  };

  // Helper: Wall-mounted AC Outdoor Unit (Cục nóng điều hòa)
  const addAcUnit = (x: number, y: number, z: number) => {
    addBox(0.82, 0.56, 0.34, creamTrimMat, x, y, z);
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), darkMetalMat);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(x - 0.14, y, z + 0.17);
    staticGroup.add(fan);
    addBox(0.3, 0.06, 0.04, darkMetalMat, x + 0.22, y + 0.12, z + 0.17);
  };

  // Helper: Upper-Floor Balcony + Transparent Furnished Rooms for Floors 2, 3 & 4 (Legacy Houses H1–H6)
  const addTubeHouseFloor = (
    cx: number,
    floorY: number,
    floorH: number,
    w: number,
    wallMat: THREE.Material,
    _winMat: THREE.Material,
    opts?: {
      balconyRailMat?: THREE.Material;
      hasFlowers?: boolean;
      hasLaundry?: boolean;
      hasLouvers?: boolean;
      isShop?: boolean;
    }
  ) => {
    const isSecondFloor = floorY < 5.5;
    const floorNum = isSecondFloor ? 2 : floorY < 9.0 ? 3 : 4;
    // REAL HOLLOW TRANSPARENT UPPER-FLOOR ROOM ON EVERY UPPER FLOOR (Tầng 2, Tầng 3, AND Tầng 4!)
    const visW = w - LOT_VISUAL_INSET;
    const roomD = 4.4;
    const rearCoreD = 20.0 - roomD;
    const roomFrontZ = 4.2;
    const roomBackZ = roomFrontZ - roomD;
    const yMid = floorY + floorH * 0.5;
    const sideD = roomD - 0.24;
    const sideZ = roomFrontZ - 0.24 - sideD * 0.5;
    const innerD = roomD - 0.36;
    const innerZ = roomBackZ + 0.12 + innerD * 0.5;
    addBox(visW, floorH, rearCoreD, wallMat, cx, yMid, -15.8 + rearCoreD * 0.5);
    addBox(0.3, floorH, sideD, wallMat, cx - visW * 0.5 + 0.15, yMid, sideZ);
    addBox(0.3, floorH, sideD, wallMat, cx + visW * 0.5 - 0.15, yMid, sideZ);
    addBox(visW - 0.6, floorH - 0.12, 0.12, interiorWallMat, cx, yMid, roomBackZ + 0.06);
    addBox(visW - 0.6, 0.08, innerD, interiorFloorWoodMat, cx, floorY + 0.04, innerZ);
    addBox(visW - 0.6, 0.1, innerD, interiorWallMat, cx, floorY + floorH - 0.05, innerZ);
    addBox(Math.min(w * 0.64, 4.4), 0.06, 0.64, interiorCeilingGlowMat, cx, floorY + floorH - 0.12, roomFrontZ - roomD * 0.46);
    addBox(Math.min(w * 0.7, 5.0), 0.08, 0.12, interiorCeilingGlowMat, cx, floorY + floorH - 0.22, roomBackZ + 0.18);

    // Front wall piers + sill + lintel + crystal-clear panoramic window glass & curtains
    const winW = Math.min(visW - 1.25, w * 0.7);
    const pierW = (visW - winW) * 0.5;
    const sillH = floorNum === 4 ? 0.38 : 0.52;
    const lintelH = 0.4;
    const winH = floorH - sillH - lintelH;
    const winMidY = floorY + sillH + winH * 0.5;
    addBox(pierW, floorH, 0.24, wallMat, cx - visW * 0.5 + pierW * 0.5, yMid, roomFrontZ - 0.12);
    addBox(pierW, floorH, 0.24, wallMat, cx + visW * 0.5 - pierW * 0.5, yMid, roomFrontZ - 0.12);
    addBox(winW, sillH, 0.24, wallMat, cx, floorY + sillH * 0.5, roomFrontZ - 0.12);
    addBox(winW, lintelH, 0.24, wallMat, cx, floorY + floorH - lintelH * 0.5, roomFrontZ - 0.12);
    addBox(winW + 0.1, 0.08, 0.24, windowFrameMat, cx, floorY + sillH + 0.04, roomFrontZ - 0.1);
    addBox(winW + 0.1, 0.1, 0.26, windowFrameMat, cx, floorY + floorH - lintelH - 0.03, roomFrontZ - 0.1);
    addBox(0.06, winH, 0.14, windowFrameMat, cx, winMidY, roomFrontZ - 0.1);
    addBox(winW - 0.08, winH - 0.08, 0.04, clearSeeThroughGlassMat, cx, winMidY, roomFrontZ - 0.1);
    addBox(0.42, winH - 0.08, 0.1, curtainMat, cx - winW * 0.5 + 0.24, winMidY, roomFrontZ - 0.28);
    addBox(0.42, winH - 0.08, 0.1, curtainMat, cx + winW * 0.5 - 0.24, winMidY, roomFrontZ - 0.28);

    // Visible upper-floor interior furnishings (unique per floor: Tầng 2, Tầng 3, Tầng 4!)
    addBox(0.9, 0.28, 0.22, paintWhiteMat, cx + w * 0.24, floorY + floorH - 0.55, roomBackZ + 0.22);
    addBox(1.3, 0.84, 0.06, woodLightMat, cx, floorY + 1.85, roomBackZ + 0.15);
    addBox(1.15, 0.68, 0.07, (opts?.isShop || floorNum === 3) ? terracottaTileMat : beddingBlueMat, cx, floorY + 1.85, roomBackZ + 0.17);
    if (opts?.isShop && floorNum === 2) {
      [-1.6, 1.6].forEach((ox, idx) => {
        addBox(1.15, 0.08, 0.82, woodLightMat, cx + ox, floorY + 0.78, roomFrontZ - 1.75);
        addBox(0.12, 0.72, 0.12, darkMetalMat, cx + ox, floorY + 0.4, roomFrontZ - 1.75);
        addBox(0.42, 0.44, 0.42, idx === 0 ? beddingCoralMat : beddingBlueMat, cx + ox - 0.72, floorY + 0.28, roomFrontZ - 1.75);
        addBox(0.42, 0.44, 0.42, idx === 0 ? beddingCoralMat : beddingBlueMat, cx + ox + 0.72, floorY + 0.28, roomFrontZ - 1.75);
      });
    } else if (floorNum === 2) {
      const bedX = cx - 1.5;
      const bedZ = roomFrontZ - 2.05;
      addBox(1.85, 0.38, 2.05, woodMahoganyMat, bedX, floorY + 0.24, bedZ);
      addBox(1.74, 0.22, 1.94, paintWhiteMat, bedX, floorY + 0.5, bedZ);
      addBox(1.76, 0.12, 1.32, Math.abs(Math.round(cx)) % 2 === 0 ? beddingBlueMat : beddingCoralMat, bedX, floorY + 0.62, bedZ + 0.3);
      addBox(1.88, 0.96, 0.12, woodMahoganyMat, bedX, floorY + 0.56, bedZ - 1.0);
      addBox(0.62, 0.16, 0.38, paintWhiteMat, bedX - 0.42, floorY + 0.66, bedZ - 0.68);
      addBox(0.62, 0.16, 0.38, paintWhiteMat, bedX + 0.42, floorY + 0.66, bedZ - 0.68);
      addBox(1.3, 0.08, 0.64, woodLightMat, cx + 1.65, floorY + 0.78, roomFrontZ - 1.35);
      addBox(0.08, 0.72, 0.56, woodLightMat, cx + 1.1, floorY + 0.4, roomFrontZ - 1.35);
      addBox(0.08, 0.72, 0.56, woodLightMat, cx + 2.2, floorY + 0.4, roomFrontZ - 1.35);
      addBox(0.22, 0.32, 0.22, interiorCeilingGlowMat, cx + 2.0, floorY + 0.98, roomFrontZ - 1.35);
      addBox(1.4, 2.05, 0.56, woodMahoganyMat, cx + w * 0.3, floorY + 1.08, roomBackZ + 0.42);
    } else if (floorNum === 3) {
      // Tầng 3: Family bedroom + home office workstation with glowing PC screen & bookshelf
      const bedX = cx + 1.45;
      const bedZ = roomFrontZ - 2.05;
      addBox(1.78, 0.38, 1.98, woodMahoganyMat, bedX, floorY + 0.24, bedZ);
      addBox(1.68, 0.22, 1.88, paintWhiteMat, bedX, floorY + 0.5, bedZ);
      addBox(1.7, 0.12, 1.28, Math.abs(Math.round(cx)) % 2 === 0 ? beddingCoralMat : beddingBlueMat, bedX, floorY + 0.62, bedZ + 0.28);
      addBox(1.82, 0.94, 0.12, woodMahoganyMat, bedX, floorY + 0.56, bedZ - 0.96);
      addBox(0.58, 0.16, 0.36, paintWhiteMat, bedX - 0.38, floorY + 0.66, bedZ - 0.64);
      addBox(0.58, 0.16, 0.36, paintWhiteMat, bedX + 0.38, floorY + 0.66, bedZ - 0.64);
      // Left workstation + glowing monitor + bookshelf
      const deskX = cx - 1.55;
      const deskZ = roomFrontZ - 1.38;
      addBox(1.36, 0.08, 0.64, woodLightMat, deskX, floorY + 0.78, deskZ);
      addBox(0.08, 0.72, 0.56, darkMetalMat, deskX - 0.6, floorY + 0.4, deskZ);
      addBox(0.08, 0.72, 0.56, darkMetalMat, deskX + 0.6, floorY + 0.4, deskZ);
      addBox(0.66, 0.4, 0.06, darkMetalMat, deskX, floorY + 1.06, deskZ - 0.14);
      addBox(0.58, 0.32, 0.07, interiorCeilingGlowMat, deskX, floorY + 1.06, deskZ - 0.12);
      addBox(1.26, 1.96, 0.46, woodMahoganyMat, cx - w * 0.3, floorY + 1.04, roomBackZ + 0.4);
    } else {
      // Tầng 4: Phòng Thờ & Góc Trà Đạo (mahogany altar with twin warm lamps + tea table + armchairs + indoor plants)
      addBox(Math.min(2.15, w * 0.32), 1.15, 0.66, woodMahoganyMat, cx, floorY + 0.62, roomBackZ + 0.52);
      [-0.65, 0.65].forEach((lx) => {
        addBox(0.18, 0.32, 0.18, interiorCeilingGlowMat, cx + lx, floorY + 1.38, roomBackZ + 0.52);
      });
      const teaZ = roomFrontZ - 1.52;
      addBox(1.12, 0.48, 0.76, woodLightMat, cx, floorY + 0.3, teaZ);
      addBox(0.24, 0.18, 0.24, paintWhiteMat, cx, floorY + 0.62, teaZ);
      [-1.15, 1.15].forEach((ox) => {
        addBox(0.66, 0.44, 0.66, woodMahoganyMat, cx + ox, floorY + 0.28, teaZ);
        addBox(0.56, 0.12, 0.56, beddingCoralMat, cx + ox, floorY + 0.52, teaZ);
      });
      [-w * 0.34, w * 0.34].forEach((px) => {
        addBox(0.44, 0.42, 0.44, terracottaTileMat, cx + px, floorY + 0.26, roomFrontZ - 0.92);
        addBox(0.64, 0.88, 0.64, leafBrightMat, cx + px, floorY + 0.9, roomFrontZ - 0.92);
      });
    }

    // Floor slab overhang / balcony deck (bottom >= RESIDENTIAL_BALCONY_BOTTOM_Y on Floor 2 — ZERO signboard or front-wall overlap!)
    const balcY = isSecondFloor ? Math.max(floorY, RESIDENTIAL_BALCONY_BOTTOM_Y) : floorY;
    addBox(visW - 0.04, 0.2, 1.24, creamTrimMat, cx, balcY + 0.1, 4.84);
    // Warm under-balcony soffit LED bar & balcony wall sconce
    addBox(w * 0.66, 0.045, 0.14, housePorchGlowMat, cx, balcY - 0.02, 4.95);
    addBox(0.14, 0.28, 0.12, darkMetalMat, cx - w * 0.36, balcY + 2.1, 4.25);
    addBox(0.11, 0.2, 0.14, housePorchGlowMat, cx - w * 0.36, balcY + 2.1, 4.28);
    // Balcony railing
    const railMat = opts?.balconyRailMat ?? darkMetalMat;
    addBox(w - 0.3, 0.06, 0.08, railMat, cx, balcY + 1.06, 5.4);
    const posts = 7;
    for (let i = 0; i < posts; i++) {
      const px = cx - (w - 0.6) * 0.5 + ((w - 0.6) * i) / (posts - 1);
      addBox(0.05, 0.88, 0.05, railMat, px, balcY + 0.62, 5.4);
    }
    // Optional wooden louver accents on side bay only (keeps 2F panoramic window clear!)
    if (opts?.hasLouvers) {
      for (let s = 0; s < 3; s++) {
        addBox(0.09, floorH * 0.72, 0.22, woodLightMat, cx - w * 0.44 + s * 0.22, balcY + floorH * 0.5, 4.35);
      }
    }
    // Optional cascading bougainvillea flowers on balcony rail
    if (opts?.hasFlowers) {
      addBox(w * 0.5, 0.24, 0.28, terracottaTileMat, cx, balcY + 0.32, 5.2);
      for (let f = -2; f <= 2; f++) {
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.26, 1),
          f % 2 === 0 ? bougainvilleaMat1 : bougainvilleaMat2
        );
        puff.position.set(cx + f * (w * 0.11), balcY + 0.56 + (Math.abs(f) % 2) * 0.16, 5.34);
        staticGroup.add(puff);
      }
    }
    if (opts?.hasLaundry) {
      addBox(w * 0.5, 0.03, 0.03, inoxMat, cx, balcY + 2.28, 5.16);
      const shirtMats = [plasticRedMat, plasticBlueMat, terracottaTileMat, paintWhiteMat];
      shirtMats.forEach((m, idx) => {
        addBox(0.4, 0.5, 0.05, m, cx - 1.1 + idx * 0.74, balcY + 1.98, 5.16);
      });
    }
    // Rich Rear Facade Windows, Lintels & Utility Balcony (visible from Đường Nội Khu Bắc 1!)
    addBox(w * 0.36, floorH * 0.52, 0.12, windowFrameMat, cx - w * 0.16, floorY + floorH * 0.52, -15.82);
    addBox(w * 0.32, floorH * 0.46, 0.14, _winMat, cx - w * 0.16, floorY + floorH * 0.52, -15.84);
    addBox(w * 0.4, 0.14, 0.24, windowFrameMat, cx - w * 0.16, floorY + floorH * 0.78, -15.86);
    addBox(1.3, floorH * 0.46, 0.12, clearGlassMat, cx + w * 0.26, floorY + floorH * 0.52, -15.82);
    if (isSecondFloor) {
      addBox(w * 0.62, 0.16, 0.9, creamTrimMat, cx, floorY + 0.08, -16.25);
      addBox(w * 0.62, 0.07, 0.07, darkMetalMat, cx, floorY + 0.88, -16.65);
      [-w * 0.28, 0, w * 0.28].forEach((ox) => {
        addBox(0.05, 0.78, 0.05, darkMetalMat, cx + ox, floorY + 0.48, -16.65);
      });
    }
    addAcUnit(cx + w * 0.36, balcY + 2.4, 4.42);
  };

  // =========================================================================
  // 3. CỔNG CHÀO ĐẦU HẺM 425 ("KHU PHỐ VĂN HÓA • HẺM 425 PHỐ CƯ DÂN TÂY")
  // =========================================================================
  const alleyCenterX = -393.6;
  // Twin Flush Crimson & Cream Pillars (X = -396.22 & -390.98, 5.0m clear lane inside!)
  [-396.22, -390.98].forEach((px) => {
    addBox(0.36, 4.15, 0.55, creamTrimMat, px, 2.08, 13.85);
    addBox(0.42, 0.42, 0.62, terracottaTileMat, px, 0.21, 13.85);
    addBox(0.44, 0.24, 0.64, terracottaTileMat, px, 4.15, 13.85);
  });
  // Overhead Curved-Step Arch Beam + Double-Sided Signboard
  addBox(5.7, 0.26, 0.55, terracottaTileMat, alleyCenterX, 4.3, 13.85);
  addBox(5.2, 1.05, 0.24, darkMetalMat, alleyCenterX, 4.92, 13.85);
  const alleySignTex = createSignTex('KHU PHỐ VĂN HÓA • HẺM 425', 'PHỐ CƯ DÂN TÂY — AN TOÀN • SẠCH ĐẸP', {
    bg: '#b91c1c',
    bg2: '#991b1b',
    border: '#fde047',
    titleColor: '#fef08a',
    subColor: '#ffffff',
  });
  const alleySignMat = new THREE.MeshStandardMaterial({
    map: alleySignTex,
    emissive: 0xfde68a,
    emissiveMap: alleySignTex,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  neonMats.push(alleySignMat);
  const alleySignFront = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.92, 0.08), alleySignMat);
  alleySignFront.position.set(alleyCenterX, 4.92, 13.98);
  staticGroup.add(alleySignFront);
  const alleySignBack = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.92, 0.08), alleySignMat);
  alleySignBack.position.set(alleyCenterX, 4.92, 13.72);
  alleySignBack.rotation.y = Math.PI;
  staticGroup.add(alleySignBack);

  // (Overhead string lights removed — replaced below by boulevard-style iron street lamp posts along curb edges!)

  // Notice Board ("BẢNG TIN TỔ DÂN PHỐ SỐ 4") tucked cleanly inside House 3 front yard (outside driving lane!)
  const noticeTex = createNoticeBoardTex();
  const noticeMat = new THREE.MeshStandardMaterial({ map: noticeTex, roughness: 0.55 });
  addBox(0.16, 1.35, 2.2, woodMahoganyMat, -390.55, 1.55, 7.6);
  const noticeFace = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.2), noticeMat);
  noticeFace.rotation.y = -Math.PI / 2;
  noticeFace.position.set(-390.64, 1.55, 7.6);
  staticGroup.add(noticeFace);
  addPlanterBush(-390.4, 0.02, 6.2, true);
  addPlanterBush(-390.4, 0.02, 9.0, false);

  // Tree tucked at corner of House 3 backyard outside alley driving lane
  addYardTree(-389.6, -16.8, 0.85, true);

  // =========================================================================
  // 4. EAST ROW — HOUSE 1 (X = -371.6..-362.0): NHÀ CÔ BA · TẠP HÓA & TRÀ ĐÁ
  //    3-Story Tube House with WALKABLE Ground-Floor Grocery + Auto Door + Transparent 2F!
  // =========================================================================
  const legacyF1H = RESIDENTIAL_F1_HEIGHT;
  const legacyF2Y = RESIDENTIAL_F1_HEIGHT + RESIDENTIAL_SLAB_HEIGHT;
  const h1Cx = -366.8;
  const h1W = 9.6;
  const h1WallMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.76 });
  const h1InnerMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.72 });
  const h1CheckTex = createCheckeredTileTex();
  const h1FloorMat = new THREE.MeshStandardMaterial({ map: h1CheckTex, roughness: 0.42 });

  // Ground-floor tile & outer walls (inset cleanly to eliminate corner & floor-seam Z-fighting!)
  const h1VisW = h1W - LOT_VISUAL_INSET;
  const h1HalfVisW = h1VisW * 0.5;
  const h1SideFrontW = (h1VisW - 4.0) * 0.5;
  addBox(h1VisW - 0.64, 0.04, 20.645, h1FloorMat, h1Cx, 0.045, -5.1225);
  addBox(3.92, 0.06, 0.32, h1FloorMat, h1Cx, 0.03, 5.36);
  addBox(0.32, legacyF1H, 20.645, h1WallMat, h1Cx - h1HalfVisW + 0.16, legacyF1H * 0.5, -5.1225); // West wall
  addBox(0.32, legacyF1H, 20.645, h1WallMat, h1Cx + h1HalfVisW - 0.16, legacyF1H * 0.5, -5.1225); // East wall
  addBox(h1VisW, legacyF1H, 0.35, h1WallMat, h1Cx, legacyF1H * 0.5, -15.62); // Rear wall
  addBox(h1SideFrontW, legacyF1H, 0.32, h1WallMat, h1Cx - h1HalfVisW + h1SideFrontW * 0.5, legacyF1H * 0.5, 5.36); // Front wall W
  addBox(h1SideFrontW, legacyF1H, 0.32, h1WallMat, h1Cx + h1HalfVisW - h1SideFrontW * 0.5, legacyF1H * 0.5, 5.36); // Front wall E
  addBox(4.0, legacyF1H - 2.74, 0.32, h1WallMat, h1Cx, 2.74 + (legacyF1H - 2.74) * 0.5, 5.36); // Header above door
  addBox(h1VisW - 0.64, 0.1, 20.645, h1InnerMat, h1Cx, legacyF1H - 0.06, -5.1225); // Ceiling
  addBox(3.4, 0.06, 0.5, interiorCeilingGlowMat, h1Cx, legacyF1H - 0.13, 0.4);
  addBox(3.4, 0.06, 0.5, interiorCeilingGlowMat, h1Cx, legacyF1H - 0.13, -7.8);
  // Warm wainscot dado trim + hanging lantern + ceiling fan inside Tạp Hóa Cô Ba
  addBox(0.06, 1.05, 20.6, woodLightMat, -371.22, 0.54, -5.2);
  addBox(0.06, 1.05, 20.6, woodLightMat, -362.38, 0.54, -5.2);
  addBox(0.04, 0.65, 0.04, darkMetalMat, h1Cx, legacyF1H - 0.38, 1.6);
  addBox(0.42, 0.32, 0.42, interiorCeilingGlowMat, h1Cx, legacyF1H - 0.78, 1.6);
  addBox(1.5, 0.04, 0.16, creamTrimMat, h1Cx, legacyF1H - 0.32, -3.5);
  addBox(0.16, 0.04, 1.5, creamTrimMat, h1Cx, legacyF1H - 0.32, -3.5);
  // Automatic sliding door frame & animated glass leaves
  addBox(4.16, 0.14, 0.26, darkMetalMat, h1Cx, 2.79, 5.32);
  addBox(0.44, 0.1, 0.12, slateRoofMat, h1Cx, 2.86, 5.48);
  addBox(0.14, 0.035, 0.04, autoDoorSensorLedMat, h1Cx, 2.86, 5.54);
  [-2.55, 2.55].forEach((ox) => {
    addBox(0.16, 0.34, 0.12, darkMetalMat, h1Cx + ox, 2.26, 5.56);
    addBox(0.12, 0.24, 0.14, housePorchGlowMat, h1Cx + ox, 2.26, 5.59);
  });
  addBox(5.6, 0.05, 0.12, housePorchGlowMat, h1Cx, 2.79, 5.72);
  registerAutoDoor(h1Cx, 5.26, false, 4.0, h1W, 2.68);

  // Storefront Glass Windows + Slim Awning + Unobstructed Signboard (Y = 2.99..3.97, ZERO balcony overlap!)
  addBox(2.0, 1.85, 0.06, clearSeeThroughGlassMat, -370.1, 1.7, 5.4);
  addBox(2.0, 1.85, 0.06, clearSeeThroughGlassMat, -363.5, 1.7, 5.4);
  const tapHoaAwningMat = new THREE.MeshStandardMaterial({
    map: createAwningStripeTex('#ea580c', '#fff7ed'),
    roughness: 0.65,
  });
  addBox(h1VisW - 0.2, 0.1, 1.5, tapHoaAwningMat, h1Cx, 2.84, 6.18, staticGroup, [0.14, 0, 0]);
  const tapHoaSignTex = createSignTex('TẠP HÓA CÔ BA • TRÀ ĐÁ', 'BÁNH MÌ • NƯỚC GIẢI KHÁT • GIA DỤNG 24H', {
    bg: '#0f766e',
    bg2: '#115e59',
    border: '#fde047',
    titleColor: '#fef08a',
  });
  const tapHoaSignMat = new THREE.MeshStandardMaterial({
    map: tapHoaSignTex,
    emissive: 0xfef08a,
    emissiveMap: tapHoaSignTex,
    emissiveIntensity: 0.42,
    roughness: 0.35,
  });
  neonMats.push(tapHoaSignMat);
  const tapHoaSign = new THREE.Mesh(new THREE.BoxGeometry(8.2, RESIDENTIAL_SIGNBOARD_HEIGHT, 0.16), tapHoaSignMat);
  tapHoaSign.position.set(h1Cx, RESIDENTIAL_SIGNBOARD_CENTER_Y, 5.58);
  staticGroup.add(tapHoaSign);

  // House 1 Slab + Transparent 2nd Floor & 3rd Floor + Rear Kitchen Door/Window + Rooftop Water Tank
  addBox(h1VisW, RESIDENTIAL_SLAB_HEIGHT, 21.2, concreteApronMat, h1Cx, legacyF1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, -5.2);
  addBox(1.35, 2.35, 0.14, woodLightMat, h1Cx - 2.0, 1.18, -15.84);
  addBox(1.8, 1.3, 0.12, warmWinMatA, h1Cx + 2.0, 1.65, -15.84);
  addBox(h1VisW * 0.84, 0.1, 0.85, tealTinRoofMat, h1Cx, 2.85, -16.22, staticGroup, [-0.18, 0, 0]);
  addTubeHouseFloor(h1Cx, legacyF2Y, 3.3, h1W, h1WallMat, warmWinMatA, { hasFlowers: true, isShop: true });
  addTubeHouseFloor(h1Cx, legacyF2Y + 3.3, 3.2, h1W, h1WallMat, warmWinMatB, { hasLaundry: true });
  addBox(h1VisW, 0.25, 20.6, tealTinRoofMat, h1Cx, legacyF2Y + 6.62, -5.8);
  addInoxWaterTank(h1Cx + 1.8, legacyF2Y + 6.75, -2.5);

  // Interior Props for Tạp Hóa Cô Ba (reuses palette materials)
  const shelfSteelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.42, metalness: 0.55 });
  const prodMats = [plasticRedMat, terracottaTileMat, leafBrightMat, plasticBlueMat, woodLightMat];
  [
    { x: -370.5, zMin: -8.0, zMax: 2.0 },
    { x: -367.3, zMin: -4.6, zMax: 1.2 },
  ].forEach((rack) => {
    const len = rack.zMax - rack.zMin;
    const midZ = (rack.zMin + rack.zMax) * 0.5;
    addBox(0.9, 1.9, len, shelfSteelMat, rack.x, 0.98, midZ);
    for (let lv = 0; lv < 3; lv++) {
      for (let k = 0; k < Math.floor(len / 0.9); k++) {
        addBox(0.32, 0.3, 0.42, prodMats[(lv + k) % prodMats.length], rack.x + 0.35, 0.52 + lv * 0.52, rack.zMin + 0.45 + k * 0.88);
      }
    }
  });
  addBox(1.0, 2.2, 2.6, inoxMat, -363.0, 1.12, -1.5);
  addBox(0.08, 1.85, 2.3, coolWinMatC, -363.52, 1.15, -1.5);
  addBox(4.8, 1.05, 1.1, woodLightMat, -366.8, 0.55, -10.3);
  addBox(0.45, 0.36, 0.08, tvScreenMat, -366.8, 1.26, -10.1);
  // Candy snack jars + rice/flour sacks beside checkout + drink crates near chiller
  addBox(0.24, 0.32, 0.24, terracottaTileMat, -368.2, 1.24, -10.0);
  addBox(0.24, 0.32, 0.24, plasticRedMat, -367.85, 1.24, -10.0);
  addBox(0.55, 0.65, 0.42, paintWhiteMat, -369.0, 0.34, -9.8);
  addBox(0.55, 0.58, 0.42, woodLightMat, -368.3, 0.31, -9.8);
  addBox(0.48, 0.36, 0.44, plasticRedMat, -363.1, 0.22, 0.5);
  addBox(0.48, 0.36, 0.44, plasticBlueMat, -363.1, 0.58, 0.5);
  addBox(0.6, 0.85, 0.06, plasticRedMat, -366.8, 2.15, -15.4);
  // Front Patio: Bánh Mì Cart + 2 Trà Đá Plastic Table Sets + Red Ice Cooler + Thermos + Menu Standee
  addBox(1.4, 1.1, 0.85, inoxMat, -370.0, 0.57, 6.8);
  addBox(1.36, 0.65, 0.8, clearSeeThroughGlassMat, -370.0, 1.45, 6.8);
  addBox(1.5, 0.1, 0.95, plasticRedMat, -370.0, 1.82, 6.8);
  addBox(0.58, 0.46, 0.42, plasticRedMat, -364.2, 0.25, 6.9); // Red ice cooler (`thùng đá`)
  addBox(0.3, 0.48, 0.3, plasticBlueMat, -363.4, 0.26, 6.9); // Iced tea thermos
  addBox(0.68, 1.05, 0.08, darkMetalMat, -369.6, 0.55, 9.2); // A-frame chalkboard
  addBox(0.56, 0.72, 0.09, interiorCeilingGlowMat, -369.6, 0.64, 9.2);
  [8.4, 11.2].forEach((tz) => {
    addBox(0.75, 0.52, 0.75, plasticBlueMat, -363.5, 0.28, tz);
    addBox(0.14, 0.16, 0.14, plasticRedMat, -363.38, 0.6, tz - 0.1);
    addBox(0.14, 0.16, 0.14, interiorCeilingGlowMat, -363.62, 0.6, tz + 0.1);
    [-0.65, 0.65].forEach((oz) => {
      addBox(0.34, 0.34, 0.34, plasticRedMat, -363.5, 0.19, tz + oz);
    });
  });

  // Helper to build hollow walkable ground floor with automatic door + detailed interior for legacy houses H2, H3, H5, H6
  const buildLegacyWalkableGroundFloor = (
    cx: number,
    w: number,
    wallMat: THREE.Material,
    isShop: boolean,
    theme?: 'laundry' | 'cafe' | 'garden'
  ) => {
    const visW = w - LOT_VISUAL_INSET;
    const halfVisW = visW * 0.5;
    const halfW = w * 0.5;
    const bodyD = 21.2;
    const cz = -5.2;
    const doorW = isShop ? Math.min(Math.max(2.6, w * 0.38), 3.4) : Math.min(Math.max(2.4, w * 0.3), 2.8);
    const sideVisW = (visW - doorW) * 0.5;
    addBox(visW - 0.68, 0.06, bodyD - 0.68, h1FloorMat, cx, 0.035, cz);
    addBox(doorW - 0.08, 0.06, 0.34, h1FloorMat, cx, 0.03, 5.23);
    addBox(0.34, legacyF1H, bodyD - 0.68, wallMat, cx - halfVisW + 0.17, legacyF1H * 0.5, cz);
    addBox(0.34, legacyF1H, bodyD - 0.68, wallMat, cx + halfVisW - 0.17, legacyF1H * 0.5, cz);
    addBox(visW, legacyF1H, 0.34, wallMat, cx, legacyF1H * 0.5, cz - bodyD * 0.5 + 0.17);
    addBox(sideVisW, legacyF1H, 0.34, wallMat, cx - halfVisW + sideVisW * 0.5, legacyF1H * 0.5, 5.23);
    addBox(sideVisW, legacyF1H, 0.34, wallMat, cx + halfVisW - sideVisW * 0.5, legacyF1H * 0.5, 5.23);
    addBox(doorW, legacyF1H - 2.74, 0.34, wallMat, cx, 2.74 + (legacyF1H - 2.74) * 0.5, 5.23);
    // Flanking transparent windows
    if (sideVisW >= 1.6) {
      addBox(sideVisW - 0.8, 1.7, 0.06, clearSeeThroughGlassMat, cx - halfVisW + sideVisW * 0.5, 1.68, 5.38);
      addBox(sideVisW - 0.8, 1.7, 0.06, clearSeeThroughGlassMat, cx + halfVisW - sideVisW * 0.5, 1.68, 5.38);
    }
    // Automatic sliding door frame + sensor + warm porch sconces + dynamic leaves
    addBox(doorW + 0.16, 0.14, 0.26, darkMetalMat, cx, 2.79, 5.28);
    addBox(0.44, 0.1, 0.12, slateRoofMat, cx, 2.86, 5.44);
    addBox(0.14, 0.035, 0.04, autoDoorSensorLedMat, cx, 2.86, 5.5);
    const legSconceOx = Math.min(halfVisW - 0.38, doorW * 0.5 + 0.48);
    [-legSconceOx, legSconceOx].forEach((ox) => {
      addBox(0.16, 0.34, 0.12, darkMetalMat, cx + ox, 2.26, 5.45);
      addBox(0.12, 0.24, 0.14, housePorchGlowMat, cx + ox, 2.26, 5.48);
    });
    addBox(Math.min(visW * 0.78, doorW + 1.8), 0.05, 0.12, housePorchGlowMat, cx, 2.79, 5.62);
    const legPorchPool = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(visW * 0.9, 8.4), 5.0), housePorchPoolMat);
    legPorchPool.rotation.x = -Math.PI / 2;
    legPorchPool.position.set(cx, 0.072, 7.35);
    staticGroup.add(legPorchPool);
    registerAutoDoor(cx, 5.22, false, doorW, w, 2.68);
    // Rear service door & window
    addBox(1.35, 2.3, 0.14, woodMahoganyMat, cx - 2.0, 1.15, -15.84);
    addBox(1.8, 1.3, 0.12, warmWinMatA, cx + 2.0, 1.65, -15.84);
    // Ceiling + glowing LEDs + dado wainscoting + ceiling fan + AC + Furnished Interior
    const interiorGrp = new THREE.Group();
    interiorGrp.position.set(cx, 0, cz);
    staticGroup.add(interiorGrp);
    addBox(visW - 0.68, 0.08, bodyD - 0.68, interiorWallMat, 0, legacyF1H - 0.04, 0, interiorGrp);
    addBox(0.06, 1.0, bodyD - 0.7, creamTrimMat, -halfVisW + 0.36, 0.52, 0, interiorGrp);
    addBox(0.06, 1.0, bodyD - 0.7, creamTrimMat, halfVisW - 0.36, 0.52, 0, interiorGrp);
    addBox(1.4, 0.04, 0.16, creamTrimMat, 0, legacyF1H - 0.28, 1.8, interiorGrp);
    addBox(0.16, 0.04, 1.4, creamTrimMat, 0, legacyF1H - 0.28, 1.8, interiorGrp);
    addBox(Math.min(w * 0.44, 3.2), 0.06, 0.5, interiorCeilingGlowMat, 0, legacyF1H - 0.1, 4.0, interiorGrp);
    addBox(Math.min(w * 0.44, 3.2), 0.06, 0.5, interiorCeilingGlowMat, 0, legacyF1H - 0.1, -3.2, interiorGrp);
    addBox(1.0, 0.28, 0.22, paintWhiteMat, -halfW * 0.36, legacyF1H - 0.65, -bodyD * 0.5 + 0.52, interiorGrp);
    // Staircase at back-right
    for (let st = 0; st < 8; st++) {
      addBox(1.05, 0.14, 0.65, woodLightMat, halfVisW - 0.92, 0.24 + st * 0.44, -4.6 - st * 0.55, interiorGrp);
    }
    if (isShop && theme === 'laundry') {
      // Walkable 24H Laundromat interior: 5 stacked front-load washer-dryers + folding counter + detergent rack + checkout desk!
      for (let wIdx = 0; wIdx < 5; wIdx++) {
        const wz = 4.5 - wIdx * 1.6;
        addBox(0.88, 1.05, 0.92, inoxMat, -halfW + 0.95, 0.56, wz, interiorGrp);
        addBox(0.84, 0.88, 0.88, paintWhiteMat, -halfW + 0.95, 1.54, wz, interiorGrp);
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12), darkMetalMat);
        drum.rotation.z = Math.PI / 2;
        drum.position.set(-halfW + 1.42, 0.62, wz);
        interiorGrp.add(drum);
      }
      addBox(1.1, 0.92, 5.4, woodLightMat, halfW - 1.15, 0.5, 1.8, interiorGrp); // Folding table
      addBox(0.75, 0.22, 0.9, beddingCoralMat, halfW - 1.15, 1.06, 2.2, interiorGrp); // Laundry basket 1
      addBox(0.75, 0.22, 0.9, beddingBlueMat, halfW - 1.15, 1.06, 0.8, interiorGrp); // Laundry basket 2
      addBox(w - 2.8, 1.02, 1.0, woodMahoganyMat, -0.4, 0.55, -bodyD * 0.5 + 1.4, interiorGrp); // Rear counter
      addBox(0.45, 0.36, 0.08, tvScreenMat, -0.4, 1.26, -bodyD * 0.5 + 1.55, interiorGrp);
    } else {
      // Vietnamese Family House Phòng Khách + Bàn Ăn + Bếp chi tiết!
      const lx = -halfW + 1.25;
      const rx = halfW - 1.25;
      addBox(2.4, 0.025, 3.2, beddingBlueMat, lx + 0.45, 0.08, 3.4, interiorGrp); // Rug
      addBox(0.88, 0.44, 2.7, woodMahoganyMat, lx - 0.22, 0.28, 3.4, interiorGrp); // Sofa
      addBox(0.16, 0.92, 2.7, woodMahoganyMat, lx - 0.6, 0.52, 3.4, interiorGrp);
      addBox(0.74, 0.12, 2.45, curtainMat, lx - 0.18, 0.54, 3.4, interiorGrp);
      // Framed wall painting above sofa
      addBox(0.06, 0.9, 1.45, woodMahoganyMat, -halfVisW + 0.39, 2.02, 3.4, interiorGrp);
      addBox(0.08, 0.74, 1.28, interiorCeilingGlowMat, -halfVisW + 0.4, 2.02, 3.4, interiorGrp);
      // Throw pillows + tea set + standing electric fan
      [-0.78, 0, 0.78].forEach((pz, pIdx) => {
        addBox(0.18, 0.34, 0.34, pIdx === 1 ? beddingCoralMat : plasticBlueMat, lx - 0.36, 0.74, 3.4 + pz, interiorGrp);
      });
      addBox(0.72, 0.46, 1.35, woodMahoganyMat, lx + 0.85, 0.29, 3.4, interiorGrp); // Tea table
      addBox(0.36, 0.04, 0.48, inoxMat, lx + 0.85, 0.54, 3.4, interiorGrp); // Tea tray
      addBox(0.16, 0.18, 0.16, terracottaTileMat, lx + 0.85, 0.65, 3.3, interiorGrp); // Teapot
      addBox(0.14, 0.14, 0.14, plasticRedMat, lx + 0.88, 0.63, 3.62, interiorGrp); // Fruit bowl
      const fanBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.08, 10), paintWhiteMat);
      fanBase.position.set(lx - 0.08, 0.1, 5.25);
      interiorGrp.add(fanBase);
      const fanStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.08, 8), inoxMat);
      fanStem.position.set(lx - 0.08, 0.64, 5.25);
      interiorGrp.add(fanStem);
      const fanHead = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12), plasticBlueMat);
      fanHead.rotation.z = Math.PI / 2;
      fanHead.position.set(lx - 0.04, 1.18, 5.25);
      interiorGrp.add(fanHead);

      addBox(0.52, 0.56, 2.4, woodMahoganyMat, rx + 0.44, 0.34, 3.4, interiorGrp); // TV console
      addBox(0.09, 0.92, 1.65, tvScreenMat, rx + 0.52, 1.34, 3.4, interiorGrp); // Flat-screen TV
      addBox(0.12, 0.1, 0.9, darkMetalMat, rx + 0.44, 0.67, 3.4, interiorGrp); // Soundbar
      addBox(1.45, 0.08, 1.1, woodLightMat, lx + 0.45, 0.78, -2.0, interiorGrp); // Dining table
      addBox(0.12, 0.72, 0.12, darkMetalMat, lx + 0.45, 0.4, -2.0, interiorGrp);
      addBox(0.26, 0.24, 0.26, paintWhiteMat, lx + 0.2, 0.94, -2.0, interiorGrp); // Rice cooker
      addBox(0.24, 0.04, 0.24, terracottaTileMat, lx + 0.65, 0.84, -1.85, interiorGrp); // Dinner plate
      addBox(w - 2.6, 0.95, 0.9, creamTrimMat, -0.4, 0.52, -bodyD * 0.5 + 1.35, interiorGrp); // Rear kitchen counter
      addBox(0.84, 0.12, 0.46, darkMetalMat, 0.15, 1.05, -bodyD * 0.5 + 1.35, interiorGrp); // Dual gas stove
      const potMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 10), inoxMat);
      potMesh.position.set(0.0, 1.19, -bodyD * 0.5 + 1.35);
      interiorGrp.add(potMesh);
      addBox(0.82, 1.92, 0.82, inoxMat, -halfW + 0.95, 1.0, -bodyD * 0.5 + 1.35, interiorGrp); // Fridge
    }
    // Register active indoor resident slot for this legacy house
    registerHouseSlot({
      cx,
      cz,
      facingNorth: false,
      isShop,
      theme: theme ?? (isShop ? 'laundry' : undefined),
      sofaX: isShop ? cx - halfW + 2.3 : cx - halfW + 1.08,
      sofaZ: isShop ? cz + 3.0 : cz + 3.4,
      sofaYaw: Math.PI / 2,
      kitchenX: cx - 0.2,
      kitchenZ: cz - bodyD * 0.5 + 2.45,
      kitchenYaw: Math.PI,
      midX: cx + 0.35,
      midZ: cz - 1.2,
      midYaw: -Math.PI / 2,
      doorX: cx,
      doorZ: 5.22,
    });
    // Concrete floor slab separating 1F & 2F (inset by LOT_VISUAL_INSET)
    addBox(visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, concreteApronMat, cx, legacyF1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, cz);
  };

  // =========================================================================
  // 5. EAST ROW — HOUSE 2 (X = -381.4..-371.6): NHÀ CHÚ TƯ (4 TẦNG — WALKABLE + TRANSPARENT 2F!)
  // =========================================================================
  const h2Cx = -376.5;
  const h2W = 9.8;
  const h2WallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.66 });
  const h2AccentMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.58 });
  buildLegacyWalkableGroundFloor(h2Cx, h2W, h2WallMat, false);
  addTubeHouseFloor(h2Cx, legacyF2Y, 3.2, h2W, h2WallMat, warmWinMatA, { balconyRailMat: inoxMat });
  addTubeHouseFloor(h2Cx, legacyF2Y + 3.2, 3.2, h2W, h2WallMat, warmWinMatB, { balconyRailMat: inoxMat, hasFlowers: true });
  addTubeHouseFloor(h2Cx, legacyF2Y + 6.4, 3.0, h2W, h2AccentMat, warmWinMatA, { balconyRailMat: inoxMat });
  addBox(h2W - LOT_VISUAL_INSET, 0.24, 20.6, slateRoofMat, h2Cx, legacyF2Y + 9.52, -5.8);
  for (let b = -3; b <= 3; b++) {
    addBox(0.18, 0.22, 3.2, woodLightMat, h2Cx + b * 1.2, legacyF2Y + 10.05, 3.8);
  }
  addInoxWaterTank(h2Cx - 1.5, legacyF2Y + 9.65, -3.5);
  addBox(2.4, 1.55, 0.16, darkMetalMat, -380.0, 0.8, 10.2);
  addBox(2.4, 1.55, 0.16, darkMetalMat, -373.0, 0.8, 10.2);
  addYardTree(-379.9, 7.6, 0.85, false);
  const h2Claimed = tryClaimDrivewayBike({
    parkX: -373.2,
    parkZ: 7.4,
    parkYaw: Math.PI * 0.85,
    doorX: h2Cx,
    doorZ: 5.22,
    yardOutX: h2Cx,
    yardOutZ: 15.8,
    facingNorth: false,
    color: 0xdc2626,
  });
  if (!h2Claimed) {
    const h2Moto = buildCityMotorbikeMesh({
      color: 0xdc2626,
      variant: 'scooter',
      includeRider: false,
      kickstandTilt: true,
      noMerge: false,
    });
    h2Moto.group.position.set(-373.2, 0.02, 7.4);
    h2Moto.group.rotation.y = Math.PI * 0.85;
    staticGroup.add(h2Moto.group);
  }

  // =========================================================================
  // 6. EAST ROW — HOUSE 3 (X = -390.8..-381.4): NHÀ TRỌ PASTEL XANH NGỌC (WALKABLE + TRANSPARENT 2F!)
  // =========================================================================
  const h3Cx = -386.1;
  const h3W = 9.4;
  const h3WallMat = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.74 });
  buildLegacyWalkableGroundFloor(h3Cx, h3W, h3WallMat, false);
  addTubeHouseFloor(h3Cx, legacyF2Y, 3.2, h3W, h3WallMat, warmWinMatB, { hasLouvers: true });
  addTubeHouseFloor(h3Cx, legacyF2Y + 3.2, 3.1, h3W, h3WallMat, coolWinMatC, { hasLaundry: true, hasFlowers: true });
  addBox(h3W - LOT_VISUAL_INSET, 0.25, 20.6, tealTinRoofMat, h3Cx, legacyF2Y + 6.42, -5.8);
  addInoxWaterTank(h3Cx + 1.5, legacyF2Y + 6.55, -3.0);
  addPlanterBush(-382.8, 0.02, 7.0, true);
  addPlanterBush(-382.8, 0.02, 10.4, false);

  // =========================================================================
  // 7. WEST ROW — HOUSE 4 (X = -405.6..-396.4): QUÁN CƠM GIA ĐÌNH (WALKABLE + AUTO DOOR + TRANSPARENT 2F!)
  // =========================================================================
  const h4Cx = -401.0;
  const h4W = 9.2;
  const h4VisW = h4W - LOT_VISUAL_INSET;
  const h4WallMat = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.76 });
  const h4InnerMat = new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.7 });
  const h4FloorMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.42 });

  const h4HalfVisW = h4VisW * 0.5;
  const h4FrontW_W = (-400.8 - 2.1) - (h4Cx - h4HalfVisW);
  const h4FrontW_E = (h4Cx + h4HalfVisW) - (-400.8 + 2.1);
  addBox(h4VisW - 0.64, 0.04, 20.645, h4FloorMat, h4Cx, 0.045, -5.1225);
  addBox(4.12, 0.06, 0.32, h4FloorMat, -400.8, 0.03, 5.36);
  addBox(0.32, legacyF1H, 20.645, h4WallMat, h4Cx - h4HalfVisW + 0.16, legacyF1H * 0.5, -5.1225);
  addBox(0.32, legacyF1H, 20.645, h4WallMat, h4Cx + h4HalfVisW - 0.16, legacyF1H * 0.5, -5.1225);
  addBox(h4VisW, legacyF1H, 0.35, h4WallMat, h4Cx, legacyF1H * 0.5, -15.62);
  addBox(h4FrontW_W, legacyF1H, 0.32, h4WallMat, h4Cx - h4HalfVisW + h4FrontW_W * 0.5, legacyF1H * 0.5, 5.36);
  addBox(h4FrontW_E, legacyF1H, 0.32, h4WallMat, h4Cx + h4HalfVisW - h4FrontW_E * 0.5, legacyF1H * 0.5, 5.36);
  addBox(4.2, legacyF1H - 2.74, 0.32, h4WallMat, -400.8, 2.74 + (legacyF1H - 2.74) * 0.5, 5.36);
  addBox(h4VisW - 0.64, 0.1, 20.645, h4InnerMat, h4Cx, legacyF1H - 0.06, -5.1225);
  addBox(3.4, 0.06, 0.5, interiorCeilingGlowMat, h4Cx, legacyF1H - 0.13, 0.4);
  addBox(3.4, 0.06, 0.5, interiorCeilingGlowMat, h4Cx, legacyF1H - 0.13, -7.8);
  // Warm wainscot trim, floor runner, hanging lanterns, ceiling fans & wall menu inside Quán Cơm Gia Đình
  addBox(0.06, 1.05, 20.4, woodLightMat, -405.22, 0.54, -5.2);
  addBox(0.06, 1.05, 20.4, woodLightMat, -396.78, 0.54, -5.2);
  addBox(1.5, 0.02, 13.5, beddingCoralMat, h4Cx, 0.07, -1.6);
  [1.8, -2.0, -5.8].forEach((lz) => {
    addBox(0.04, 0.65, 0.04, darkMetalMat, h4Cx, legacyF1H - 0.38, lz);
    addBox(0.42, 0.32, 0.42, interiorCeilingGlowMat, h4Cx, legacyF1H - 0.78, lz);
  });
  addBox(1.4, 0.04, 0.16, creamTrimMat, h4Cx, legacyF1H - 0.3, -3.9);
  addBox(0.16, 0.04, 1.4, creamTrimMat, h4Cx, legacyF1H - 0.3, -3.9);
  addBox(0.06, 1.05, 2.2, woodMahoganyMat, -396.82, 2.02, -0.6);
  addBox(0.07, 0.9, 2.0, interiorCeilingGlowMat, -396.83, 2.02, -0.6);
  addBox(1.35, 2.3, 0.14, woodMahoganyMat, h4Cx - 2.0, 1.15, -15.84);
  addBox(1.8, 1.3, 0.12, warmWinMatB, h4Cx + 1.8, 1.65, -15.84);

  // Automatic sliding glass door at X = -402.9..-398.7 + warm porch sconces
  addBox(4.36, 0.14, 0.26, darkMetalMat, -400.8, 2.79, 5.32);
  addBox(0.44, 0.1, 0.12, slateRoofMat, -400.8, 2.86, 5.48);
  addBox(0.14, 0.035, 0.04, autoDoorSensorLedMat, -400.8, 2.86, 5.54);
  [-2.55, 2.55].forEach((ox) => {
    addBox(0.16, 0.34, 0.12, darkMetalMat, -400.8 + ox, 2.26, 5.56);
    addBox(0.12, 0.24, 0.14, housePorchGlowMat, -400.8 + ox, 2.26, 5.59);
  });
  addBox(5.6, 0.05, 0.12, housePorchGlowMat, -400.8, 2.79, 5.72);
  registerAutoDoor(-400.8, 5.26, false, 4.2, h4W, 2.68);

  addBox(1.9, 1.85, 0.06, clearSeeThroughGlassMat, -404.2, 1.7, 5.4);
  addBox(1.6, 1.85, 0.06, clearSeeThroughGlassMat, -397.6, 1.7, 5.4);
  const comAwningMat = new THREE.MeshStandardMaterial({
    map: createAwningStripeTex('#b91c1c', '#fef3c7'),
    roughness: 0.65,
  });
  addBox(h4VisW - 0.2, 0.1, 1.5, comAwningMat, h4Cx, 2.84, 6.18, staticGroup, [0.14, 0, 0]);
  const comSignTex = createSignTex('CƠM GIA ĐÌNH • BÚN BÒ HUẾ', 'BÌNH DÂN • SẠCH SẼ • MỞ CỬA CẢ NGÀY', {
    bg: '#9a3412',
    bg2: '#7c2d12',
    border: '#fde047',
    titleColor: '#fef08a',
  });
  const comSignMat = new THREE.MeshStandardMaterial({
    map: comSignTex,
    emissive: 0xfdba74,
    emissiveMap: comSignTex,
    emissiveIntensity: 0.42,
    roughness: 0.35,
  });
  neonMats.push(comSignMat);
  const comSign = new THREE.Mesh(new THREE.BoxGeometry(8.0, RESIDENTIAL_SIGNBOARD_HEIGHT, 0.16), comSignMat);
  comSign.position.set(h4Cx, RESIDENTIAL_SIGNBOARD_CENTER_Y, 5.58);
  staticGroup.add(comSign);

  addBox(h4VisW, RESIDENTIAL_SLAB_HEIGHT, 21.2, concreteApronMat, h4Cx, legacyF1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, -5.2);
  addTubeHouseFloor(h4Cx, legacyF2Y, 3.2, h4W, h4WallMat, warmWinMatB, { hasFlowers: true, isShop: true });
  addTubeHouseFloor(h4Cx, legacyF2Y + 3.2, 3.2, h4W, h4WallMat, warmWinMatA, { hasLouvers: true });
  addTubeHouseFloor(h4Cx, legacyF2Y + 6.4, 3.0, h4W, h4WallMat, warmWinMatB);
  addBox(h4VisW, 0.25, 20.6, terracottaTileMat, h4Cx, legacyF2Y + 9.52, -5.8);
  addInoxWaterTank(h4Cx - 1.6, legacyF2Y + 9.65, -3.2);

  // Interior Props for Quán Cơm Gia Đình: Glass Food Counter + Chiller + Beer Crates + Kitchen Pass & Range Hood + Dining Tables
  addBox(1.5, 1.02, 7.8, inoxMat, -404.0, 0.53, -2.2);
  addBox(1.35, 0.72, 7.5, clearSeeThroughGlassMat, -404.0, 1.4, -2.2);
  [woodLightMat, plasticRedMat, leafBrightMat, terracottaTileMat, plasticRedMat, woodLightMat].forEach((fMat, i) => {
    addBox(0.75, 0.08, 0.85, fMat, -404.0, 1.08, -5.2 + i * 1.15);
  });
  addBox(0.9, 1.98, 0.95, paintWhiteMat, -404.1, 1.02, -7.2); // Drink chiller fridge
  addBox(0.55, 0.36, 0.45, plasticRedMat, -404.1, 0.22, -8.3); // Red soda crate
  addBox(0.55, 0.36, 0.45, plasticBlueMat, -404.1, 0.58, -8.3);
  addBox(6.8, 1.05, 1.4, inoxMat, -401.0, 0.55, -11.6);
  addBox(4.2, 0.46, 0.9, inoxMat, -401.0, legacyF1H - 0.92, -11.6); // Stainless range hood
  addBox(0.55, 0.72, 0.55, inoxMat, -401.0, legacyF1H - 0.35, -11.6);
  [-2.9, 1.7].forEach((tz) => {
    addBox(1.5, 0.08, 1.0, inoxMat, -398.2, 0.78, tz);
    addBox(0.14, 0.74, 0.14, darkMetalMat, -398.2, 0.39, tz);
    addBox(0.24, 0.12, 0.24, paintWhiteMat, -398.48, 0.88, tz - 0.18);
    addBox(0.24, 0.12, 0.24, paintWhiteMat, -397.92, 0.88, tz + 0.18);
    addBox(0.1, 0.18, 0.1, terracottaTileMat, -398.2, 0.91, tz);
    addBox(0.16, 0.09, 0.12, paintWhiteMat, -397.76, 0.86, tz - 0.22);
    [-0.85, 0.85].forEach((oz) => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 12), plasticBlueMat);
      stool.position.set(-398.2, 0.24, tz + oz);
      staticGroup.add(stool);
    });
  });
  addPlanterBush(-404.3, 0.02, 7.2, true);
  addBox(0.68, 1.05, 0.08, darkMetalMat, -403.8, 0.55, 8.6);
  addBox(0.56, 0.72, 0.09, interiorCeilingGlowMat, -403.8, 0.64, 8.6);

  // =========================================================================
  // 8. WEST ROW — HOUSE 5 (X = -415.3..-405.6): NHÀ PHỐ MÁI NGÓI ĐỎ (WALKABLE + TRANSPARENT 2F!)
  // =========================================================================
  const h5Cx = -410.45;
  const h5W = 9.7;
  const h5WallMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.78 });
  buildLegacyWalkableGroundFloor(h5Cx, h5W, h5WallMat, false);
  addTubeHouseFloor(h5Cx, legacyF2Y, 3.2, h5W, h5WallMat, warmWinMatA, { hasFlowers: true });
  addTubeHouseFloor(h5Cx, legacyF2Y + 3.2, 3.1, h5W, h5WallMat, warmWinMatB, { hasFlowers: true });
  addBox(h5W - LOT_VISUAL_INSET, 0.26, 20.6, terracottaTileMat, h5Cx, legacyF2Y + 6.42, -5.8);
  addBox(h5W - 0.28, 1.35, 19.6, terracottaTileMat, h5Cx, legacyF2Y + 7.225, -5.8);
  addInoxWaterTank(h5Cx + 1.4, legacyF2Y + 7.9, -4.0);
  addYardTree(-413.5, 8.2, 1.0, true);
  addBox(1.5, 0.42, 0.55, concreteApronMat, -413.4, 0.23, 6.9);
  addBox(2.4, 0.75, 0.48, leafDarkMat, -413.5, 0.4, 11.0);
  addBox(2.2, 0.75, 0.48, leafDarkMat, -407.1, 0.4, 11.0);

  // =========================================================================
  // 9. WEST ROW — HOUSE 6 (X = -425.0..-415.3): CHUNG CƯ MINI & GIẶT SẤY 24H (WALKABLE + AUTO DOOR!)
  // =========================================================================
  const h6Cx = -420.15;
  const h6W = 9.7;
  const h6WallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.68 });
  const h6AccentMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.54 });
  buildLegacyWalkableGroundFloor(h6Cx, h6W, h6WallMat, true, 'laundry');
  const laundSignTex = createSignTex('CHUNG CƯ MINI 425 • GIẶT SẤY 24H', 'PHÒNG TRỌ SINH VIÊN • AN NINH CAMERA', {
    bg: '#1e3a8a',
    bg2: '#1e40af',
    border: '#38bdf8',
    titleColor: '#ffffff',
    subColor: '#bae6fd',
  });
  const laundSignMat = new THREE.MeshStandardMaterial({
    map: laundSignTex,
    emissive: 0x93c5fd,
    emissiveMap: laundSignTex,
    emissiveIntensity: 0.38,
    roughness: 0.35,
  });
  neonMats.push(laundSignMat);
  const laundSign = new THREE.Mesh(new THREE.BoxGeometry(7.8, RESIDENTIAL_SIGNBOARD_HEIGHT, 0.16), laundSignMat);
  laundSign.position.set(h6Cx, RESIDENTIAL_SIGNBOARD_CENTER_Y, 5.56);
  staticGroup.add(laundSign);

  addTubeHouseFloor(h6Cx, legacyF2Y, 3.1, h6W, h6WallMat, coolWinMatC, { balconyRailMat: darkMetalMat });
  addTubeHouseFloor(h6Cx, legacyF2Y + 3.1, 3.1, h6W, h6WallMat, warmWinMatA, { balconyRailMat: darkMetalMat });
  addTubeHouseFloor(h6Cx, legacyF2Y + 6.2, 3.0, h6W, h6AccentMat, warmWinMatB, { balconyRailMat: darkMetalMat, hasLaundry: true });
  addBox(h6W - LOT_VISUAL_INSET, 0.25, 20.6, slateRoofMat, h6Cx, legacyF2Y + 9.32, -5.8);
  addInoxWaterTank(h6Cx - 1.5, legacyF2Y + 9.45, -3.2);

  // Covered Resident Motorbike Parking Canopy on West edge of House 6 yard (leaves center walkway to auto door 100% open!)
  addBox(2.8, 0.12, 5.2, tealTinRoofMat, -423.2, 2.52, 11.0, staticGroup, [0.08, 0, 0]);
  [-424.5, -421.9].forEach((px) => {
    [8.7, 13.3].forEach((pz) => {
      addBox(0.12, 2.5, 0.12, darkMetalMat, px, 1.25, pz);
    });
  });
  for (let i = 0; i < 4; i++) {
    addBox(2.2, 0.02, 0.08, paintWhiteMat, -423.2, 0.03, 9.1 + i * 1.2);
    const moto = buildCityMotorbikeMesh({
      color: [0x1e293b, 0x0ea5e9, 0xf8fafc, 0x10b981][i],
      variant: i % 2 === 0 ? 'scooter' : 'sport',
      includeRider: false,
      kickstandTilt: true,
      noMerge: false,
    });
    moto.group.position.set(-423.2, 0.02, 9.6 + i * 1.15);
    moto.group.rotation.y = Math.PI / 2 + ((i % 2) - 0.5) * 0.08;
    staticGroup.add(moto.group);
  }

  // =========================================================================
  // 10. WARM STREET LIGHTING POOLS & BALANCED POINT LIGHTS
  // =========================================================================
  const warmPoolMat = new THREE.MeshBasicMaterial({
    map: glowPoolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  [
    { x: h1Cx, z: 7.4, w: 10.5, d: 7.6 },
    { x: alleyCenterX, z: 7.2, w: 7.5, d: 14.0 },
    { x: h4Cx, z: 7.4, w: 10.5, d: 7.6 },
  ].forEach((p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), warmPoolMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, 0.045, p.z);
    staticGroup.add(m);
  });

  // =========================================================================
  // 10B. EXPANDED RESIDENTIAL NEIGHBORHOODS (NORTH EXTENSION, REAR ROW & SOUTH)
  // =========================================================================
  const sharedPalette: WestResPalette = {
    concreteMat: concreteApronMat,
    asphaltAlleyMat: internalRoadMat,
    tilePatioMat: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 }),
    brickCourtyardMat: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.88 }),
    creamPlasterMat: creamTrimMat,
    warmYellowWallMat: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.82 }),
    ochreHoiAnMat: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.8 }),
    mintWallMat: new THREE.MeshStandardMaterial({ color: 0x99f6e4, roughness: 0.8 }),
    pastelTealWallMat: new THREE.MeshStandardMaterial({ color: 0x67e8f9, roughness: 0.78 }),
    blushPinkWallMat: new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.8 }),
    sandBeigeWallMat: new THREE.MeshStandardMaterial({ color: 0xe7d8c3, roughness: 0.84 }),
    concreteModernMat: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.86 }),
    charcoalTrimMat: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.68 }),
    terracottaTileMat,
    weatheredTileMat: new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.84 }),
    emeraldRoofMat: new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.54, metalness: 0.2 }),
    slateBlueRoofMat: slateRoofMat,
    cobaltRoofMat: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55, metalness: 0.25 }),
    tealTinRoofMat,
    redTinRoofMat: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.48, metalness: 0.4 }),
    graniteRedBlackMat: new THREE.MeshStandardMaterial({ color: 0x450a0a, roughness: 0.25, metalness: 0.35 }),
    breezeBlockWhiteMat: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.76 }),
    breezeBlockTerracottaMat: new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.78 }),
    goldBrassMat: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.32, metalness: 0.78 }),
    chromeInoxMat: inoxMat,
    darkSteelMat: darkMetalMat,
    woodMat: woodMahoganyMat,
    bambooMat: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.78 }),
    glassMat: clearGlassMat,
    clearSeeThroughGlassMat,
    interiorWallMat,
    interiorFloorWoodMat,
    interiorCeilingGlowMat,
    curtainMat,
    beddingBlueMat,
    beddingCoralMat,
    tvScreenMat,
    autoDoorSensorLedMat,
    housePorchGlowMat,
    housePorchPoolMat,
    windowWarmMat: warmWinMatA,
    paintWhiteMat,
    foliageMat: leafBrightMat,
    darkFoliageMat: leafDarkMat,
    bougainvilleaMat: bougainvilleaMat1,
    apricotBlossomMat: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.72 }),
    trunkMat,
    plasticBlueMat,
    plasticRedMat,
    stripedAwningMat: new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.72 }),
    greenAwningMat: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.72 }),
    neonGreenCrossMat: new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.85,
    }),
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    createSignTex,
    registerAutoDoor,
    registerHouseSlot,
    tryClaimDrivewayBike,
    registerWalkableShopSlot,
    addTree: (parent, x, z, scale = 1.0, blossom = 'none') => {
      const tg = new THREE.Group();
      tg.position.set(x, 0.02, z);
      tg.scale.setScalar(scale);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.3, 8), trunkMat);
      trunk.position.y = 1.15;
      tg.add(trunk);
      const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.24, 1), leafDarkMat);
      c1.position.set(0, 2.8, 0);
      tg.add(c1);
      const topMat =
        blossom === 'pink'
          ? bougainvilleaMat1
          : blossom === 'yellow'
            ? sharedPalette.apricotBlossomMat
            : leafBrightMat;
      const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.92, 1), topMat);
      c2.position.set(0.45, 3.3, 0.3);
      tg.add(c2);
      parent.add(tg);
    },
    addMotorbike: (parent, x, z, yaw, color) => {
      const m = buildCityMotorbikeMesh({
        color,
        variant: 'scooter',
        includeRider: false,
        kickstandTilt: true,
        noMerge: false,
      });
      m.group.position.set(x, 0.03, z);
      m.group.rotation.y = yaw;
      parent.add(m.group);
    },
    addAcUnit: (parent, x, y, z) => {
      addBox(0.82, 0.54, 0.34, creamTrimMat, x, y, z, parent);
    },
    addRooftopWaterTank: (parent, x, roofY, z) => {
      addBox(0.9, 0.55, 0.08, darkMetalMat, x, roofY + 0.275, z - 0.5, parent);
      addBox(0.9, 0.55, 0.08, darkMetalMat, x, roofY + 0.275, z + 0.5, parent);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 12), inoxMat);
      tank.rotation.x = Math.PI / 2;
      tank.position.set(x, roofY + 0.9, z);
      parent.add(tank);
    },
  };

  sharedPalette.neonMats.push(sharedPalette.neonGreenCrossMat);

  // Collect residential facade & floor bounce materials so houses read warmly & clearly at night across the entire district!
  const resFacadeWallMats: THREE.MeshStandardMaterial[] = [
    creamTrimMat,
    sharedPalette.warmYellowWallMat,
    sharedPalette.ochreHoiAnMat,
    sharedPalette.mintWallMat,
    sharedPalette.pastelTealWallMat,
    sharedPalette.blushPinkWallMat,
    sharedPalette.sandBeigeWallMat,
    sharedPalette.concreteModernMat,
    h1WallMat,
    h2WallMat,
    h3WallMat,
    h4WallMat,
    h5WallMat,
    h6WallMat,
  ];
  resFacadeWallMats.forEach((m) => {
    m.emissive.setHex(0xfff0d4);
    m.emissiveIntensity = 0.0;
  });
  const resInteriorBounceMats: THREE.MeshStandardMaterial[] = [h1InnerMat, h4InnerMat];
  resInteriorBounceMats.forEach((m) => {
    m.emissive.setHex(0xffe6ba);
    m.emissiveIntensity = 0.04;
  });
  const resFloorBounceMats: THREE.MeshStandardMaterial[] = [sharedPalette.tilePatioMat, h1FloorMat, h4FloorMat];
  resFloorBounceMats.forEach((m) => {
    m.emissive.setHex(0xffe8c2);
    m.emissiveIntensity = 0.0;
  });

  // --- CULTURAL ALLEY ARCHWAYS & UPGRADED BRIGHT LED STREET LAMPS ACROSS ALL 101 ALLEYS & 10 INNER ROADS ---
  const lampIronMat = new THREE.MeshStandardMaterial({ color: 0x13161f, roughness: 0.28, metalness: 0.72 });
  const lampGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.24, metalness: 0.82 });
  const lampBaseGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.62, 8);
  const lampCollarGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.09, 8);
  const lampPoleGeo = new THREE.CylinderGeometry(0.052, 0.078, 5.15, 8);
  const lampArmGeo = new THREE.CylinderGeometry(0.036, 0.044, 1.02, 6);
  const lampBraceGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.66, 6);
  const lampHoodGeo = new THREE.BoxGeometry(0.42, 0.11, 0.7);
  const lampLedPanelGeo = new THREE.BoxGeometry(0.36, 0.08, 0.62);
  const lampGlobeGeo = new THREE.SphereGeometry(0.25, 10, 8);
  const lampHaloGeo = new THREE.SphereGeometry(0.72, 10, 8);
  const lampFinialGeo = new THREE.CylinderGeometry(0.022, 0.045, 0.12, 6);
  const lampPoolGeo = new THREE.PlaneGeometry(11.8, 11.8);

  // Record every streetlamp world head position so our 8 real dynamic warm PointLights follow the nearest 8 lamps!
  const streetLampSpots: Array<{ x: number; z: number }> = [];

  const addRoadStyleStreetLamp = (
    x: number,
    z: number,
    armDirX: number,
    armDirZ: number,
    withGroundPool = true
  ) => {
    const lampGrp = new THREE.Group();
    lampGrp.position.set(x, 0.02, z);
    const yaw = Math.atan2(armDirX, armDirZ);
    lampGrp.rotation.y = yaw;

    const base = new THREE.Mesh(lampBaseGeo, lampIronMat);
    base.position.y = 0.31;
    lampGrp.add(base);

    const collar = new THREE.Mesh(lampCollarGeo, lampGoldMat);
    collar.position.y = 0.64;
    lampGrp.add(collar);

    const pole = new THREE.Mesh(lampPoleGeo, lampIronMat);
    pole.position.y = 2.86;
    lampGrp.add(pole);

    const topRing = new THREE.Mesh(lampCollarGeo, lampGoldMat);
    topRing.scale.set(0.66, 0.9, 0.66);
    topRing.position.y = 5.38;
    lampGrp.add(topRing);

    const arm = new THREE.Mesh(lampArmGeo, lampIronMat);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(0, 5.26, 0.48);
    lampGrp.add(arm);

    const brace = new THREE.Mesh(lampBraceGeo, lampIronMat);
    brace.rotation.x = Math.PI / 4;
    brace.position.set(0, 4.98, 0.25);
    lampGrp.add(brace);

    // Sculpted modern cobra/lantern luminaire housing + wide bright glowing LED diffuser + warm halo aura
    const hood = new THREE.Mesh(lampHoodGeo, lampIronMat);
    hood.position.set(0, 5.32, 0.92);
    lampGrp.add(hood);

    const ledPanel = new THREE.Mesh(lampLedPanelGeo, lanternGlowMat);
    ledPanel.position.set(0, 5.23, 0.92);
    lampGrp.add(ledPanel);

    const globe = new THREE.Mesh(lampGlobeGeo, lanternGlowMat);
    globe.scale.set(1.12, 0.72, 1.32);
    globe.position.set(0, 5.14, 0.92);
    lampGrp.add(globe);

    const halo = new THREE.Mesh(lampHaloGeo, lampHaloShellMat);
    halo.position.set(0, 5.12, 0.92);
    lampGrp.add(halo);

    const finial = new THREE.Mesh(lampFinialGeo, lampGoldMat);
    finial.position.set(0, 5.42, 0.92);
    lampGrp.add(finial);

    staticGroup.add(lampGrp);

    const headX = x + armDirX * 0.92;
    const headZ = z + armDirZ * 0.92;
    streetLampSpots.push({ x: headX, z: headZ });

    if (withGroundPool) {
      const pool = new THREE.Mesh(lampPoolGeo, warmPoolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x + armDirX * 1.15, 0.044, z + armDirZ * 1.15);
      staticGroup.add(pool);
    }
  };

  const buildAlleyArch = (a: (typeof WEST_ALLEYS)[number], gateZ: number) => {
    const w = a.maxX - a.minX;
    // Flush side pillars cleanly inside [a.minX..a.maxX] leaving >= 5.08m unobstructed lane!
    addBox(0.26, 4.15, 0.42, creamTrimMat, a.minX + 0.13, 2.08, gateZ);
    addBox(0.26, 4.15, 0.42, creamTrimMat, a.maxX - 0.13, 2.08, gateZ);
    addBox(w + 0.2, 0.95, 0.52, sharedPalette.redTinRoofMat, a.cx, 4.32, gateZ);
    const sTex = createSignTex(`KHU PHỐ VĂN HÓA • ${a.shortLabel.toUpperCase()}`, a.label, {
      bg: '#991b1b',
      bg2: '#7f1d1d',
      border: '#fde047',
    });
    const sMat = new THREE.MeshStandardMaterial({ map: sTex, emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 0.4 });
    neonMats.push(sMat);
    const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, 0.84), sMat);
    frontFace.position.set(a.cx, 4.32, gateZ + (gateZ < 25 ? 0.28 : -0.28));
    if (gateZ >= 25) frontFace.rotation.y = Math.PI;
    staticGroup.add(frontFace);
  };

  const buildInnerAlleySign = (a: (typeof WEST_ALLEYS)[number], entranceZ: number, faceSouth = entranceZ < 25) => {
    const w = a.maxX - a.minX;
    addBox(w, 0.08, 0.14, darkMetalMat, a.cx, 4.05, entranceZ);
    const sTex = createSignTex(a.shortLabel.toUpperCase(), 'HẺM VĂN MINH • SẠCH ĐẸP', {
      bg: '#065f46',
      bg2: '#064e3b',
      border: '#fde047',
    });
    const sMat = new THREE.MeshStandardMaterial({ map: sTex, emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 0.32 });
    neonMats.push(sMat);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.68, 0.68), sMat);
    plate.position.set(a.cx, 4.42, entranceZ + (faceSouth ? 0.08 : -0.08));
    if (!faceSouth) plate.rotation.y = Math.PI;
    staticGroup.add(plate);
  };

  WEST_ALLEYS.forEach((a, alleyIdx) => {
    const gateZ = a.hasArch
      ? a.row === 'N1'
        ? 13.85
        : a.row === 'N2'
          ? -26.85
          : a.row === 'SH2' || a.row === 'SC2'
            ? 113.15
            : a.row === 'SH3'
              ? 157.15
              : 43.65
      : null;
    if (a.id !== 'hem_425') {
      if (a.hasArch && gateZ !== null) {
        buildAlleyArch(a, gateZ);
      } else {
        const isSouthFacingSH = a.row === 'SH1' || (a.row === 'SH2' && a.cx < -240);
        const isNorthMouth =
          a.row === 'S2' ||
          a.row === 'S3' ||
          a.row === 'S4' ||
          a.row === 'S5' ||
          a.row === 'S6' ||
          a.row === 'SH3' ||
          a.row === 'SH4' ||
          a.row === 'SH5' ||
          a.row === 'SH6' ||
          a.row === 'SC2' ||
          a.row === 'SC3' ||
          a.row === 'SC4' ||
          a.row === 'SC5' ||
          a.row === 'SC6';
        const ez = isNorthMouth ? a.minZ + 1.2 : a.maxZ - 1.2;
        buildInnerAlleySign(a, ez, isSouthFacingSH ? true : ez < 25);
      }
    }

    // Place boulevard-style iron street lamp posts staggered along alley curb borders (zero lane blocking!)
    const alleyLen = a.maxZ - a.minZ;
    const startZ = a.row === 'N1' ? -13.0 : a.row === 'S1' ? 49.0 : alleyLen < 18.0 ? a.minZ + 4.5 : a.minZ + 7.0;
    const endZ = a.row === 'N1' ? 9.0 : a.row === 'S1' ? 88.5 : alleyLen < 18.0 ? a.maxZ - 4.5 : a.maxZ - 7.0;
    const stepZ = a.row === 'S1' ? 19.0 : 16.5;
    let lampSlot = alleyIdx;
    for (let lz = startZ; lz <= endZ + 0.1; lz += stepZ) {
      if (gateZ !== null && Math.abs(lz - gateZ) < 2.8) continue;
      const westSide = lampSlot % 2 === 0;
      const px = westSide ? a.minX + 0.16 : a.maxX - 0.16;
      addRoadStyleStreetLamp(px, lz, westSide ? 1 : -1, 0, true);
      lampSlot++;
    }
  });

  // Road-style street lamp posts lining all internal neighborhood streets (Bắc 1-3, Nam 1-6, Đông BV 1), tighter 24m spacing for bright continuous pools!
  WEST_INNER_ROADS.forEach((r, roadIdx) => {
    const maxLampX = Math.min(r.x2 - 8.0, 90.0);
    let slot = roadIdx;
    for (let lx = r.x1 + 12.0; lx <= maxLampX; lx += 24.0) {
      if (lx >= -244.0 && lx <= -211.0) continue;
      const blocksAlley = WEST_ALLEYS.some(
        (a) => Math.abs(lx - a.cx) < 4.9 && r.maxZ >= a.minZ - 2.0 && r.minZ <= a.maxZ + 2.0
      );
      if (blocksAlley) continue;
      if (r.cz >= 194 && lx >= SOUTH_FAR_WEST_CONN_MIN_X - 2.5 && lx <= SOUTH_FAR_WEST_CONN_MAX_X + 2.5) continue;
      if (r.cz >= 194 && lx >= SOUTH_SW_MID_CONN_MIN_X - 2.5 && lx <= SOUTH_SW_MID_CONN_MAX_X + 2.5) continue;
      if (r.cz > 50 && r.cz < 160 && lx >= WEST_SOUTH_CONNECTOR_MIN_X - 2.5 && lx <= WEST_SOUTH_CONNECTOR_MAX_X + 2.5) continue;
      if (r.cz >= 148 && lx >= SOUTH_HOSP_WEST_CONN_MIN_X - 2.5 && lx <= SOUTH_HOSP_WEST_CONN_MAX_X + 2.5) continue;
      if (r.cz >= 104 && lx >= SOUTH_HOSP_EAST_CONN_MIN_X - 2.5 && lx <= SOUTH_HOSP_EAST_CONN_MAX_X + 2.5) continue;
      if (r.cz >= 104 && lx >= SOUTH_CENTER_MID_CONN_MIN_X - 2.5 && lx <= SOUTH_CENTER_MID_CONN_MAX_X + 2.5) continue;
      if (r.cz >= 104 && lx >= SOUTH_OCEAN_RING_CONN_MIN_X - 2.5 && lx <= SOUTH_OCEAN_RING_CONN_MAX_X + 2.5) continue;
      const northSide = slot % 2 === 0;
      const pz = northSide ? r.minZ + 0.24 : r.maxZ - 0.24;
      addRoadStyleStreetLamp(lx, pz, 0, northSide ? 1 : -1, true);
      slot++;
    }
  });
  // Road-style street lamps along all 7 North-South Connector Roads
  [
    { x: WEST_SOUTH_CONNECTOR_MIN_X - 0.2, z: 54.0, dx: 1 },
    { x: WEST_SOUTH_CONNECTOR_MAX_X + 0.2, z: 78.0, dx: -1 },
    { x: WEST_SOUTH_CONNECTOR_MIN_X - 0.2, z: 114.0, dx: 1 },
    { x: WEST_SOUTH_CONNECTOR_MAX_X + 0.2, z: 138.0, dx: -1 },
    // Far-West & SW-Mid Connectors
    { x: SOUTH_FAR_WEST_CONN_MIN_X + 0.2, z: 222.0, dx: 1 },
    { x: SOUTH_FAR_WEST_CONN_MAX_X - 0.2, z: 270.0, dx: -1 },
    { x: SOUTH_FAR_WEST_CONN_MIN_X + 0.2, z: 318.0, dx: 1 },
    { x: SOUTH_SW_MID_CONN_MIN_X + 0.2, z: 222.0, dx: 1 },
    { x: SOUTH_SW_MID_CONN_MAX_X - 0.2, z: 270.0, dx: -1 },
    { x: SOUTH_SW_MID_CONN_MIN_X + 0.2, z: 318.0, dx: 1 },
    // South Hospital West Connector (X = -305..-297)
    { x: SOUTH_HOSP_WEST_CONN_MIN_X + 0.2, z: 168.0, dx: 1 },
    { x: SOUTH_HOSP_WEST_CONN_MAX_X - 0.2, z: 214.0, dx: -1 },
    { x: SOUTH_HOSP_WEST_CONN_MIN_X + 0.2, z: 268.0, dx: 1 },
    { x: SOUTH_HOSP_WEST_CONN_MAX_X - 0.2, z: 318.0, dx: -1 },
    // South Hospital East Connector (X = -108..-100)
    { x: SOUTH_HOSP_EAST_CONN_MIN_X + 0.2, z: 126.0, dx: 1 },
    { x: SOUTH_HOSP_EAST_CONN_MAX_X - 0.2, z: 174.0, dx: -1 },
    { x: SOUTH_HOSP_EAST_CONN_MIN_X + 0.2, z: 222.0, dx: 1 },
    { x: SOUTH_HOSP_EAST_CONN_MAX_X - 0.2, z: 270.0, dx: -1 },
    { x: SOUTH_HOSP_EAST_CONN_MIN_X + 0.2, z: 318.0, dx: 1 },
    // South-Central Mid Connector (X = -6..+2)
    { x: SOUTH_CENTER_MID_CONN_MIN_X + 0.2, z: 126.0, dx: 1 },
    { x: SOUTH_CENTER_MID_CONN_MAX_X - 0.2, z: 174.0, dx: -1 },
    { x: SOUTH_CENTER_MID_CONN_MIN_X + 0.2, z: 222.0, dx: 1 },
    { x: SOUTH_CENTER_MID_CONN_MAX_X - 0.2, z: 270.0, dx: -1 },
    { x: SOUTH_CENTER_MID_CONN_MIN_X + 0.2, z: 318.0, dx: 1 },
    // Vinhomes Ocean Park West Ring Connector (X = +92..+100)
    { x: SOUTH_OCEAN_RING_CONN_MIN_X + 0.2, z: 124.0, dx: 1 },
    { x: SOUTH_OCEAN_RING_CONN_MAX_X - 0.2, z: 176.0, dx: -1 },
    { x: SOUTH_OCEAN_RING_CONN_MIN_X + 0.2, z: 222.0, dx: 1 },
    { x: SOUTH_OCEAN_RING_CONN_MAX_X - 0.2, z: 270.0, dx: -1 },
    { x: SOUTH_OCEAN_RING_CONN_MIN_X + 0.2, z: 318.0, dx: 1 },
  ].forEach((lp) => {
    addRoadStyleStreetLamp(lp.x, lp.z, lp.dx, 0, true);
  });

  // Also register West Boulevard (Đại Lộ Trung Tâm Tây) & Đại Lộ Bệnh Viện streetlamp positions into streetLampSpots
  // so our dynamic real warm PointLights illuminate house fronts along main avenues seamlessly too!
  [-242.5, -264.5, -288, -310, -338, -358, -382, -404, -422, -446, -470, -496, -520, -540, -566, -592, -622, -648, -680, -708, -725, -756, -780, -806, -830, -850, -876, -900, -928, -950].forEach((lx) => {
    streetLampSpots.push({ x: lx, z: 21.15 });
    streetLampSpots.push({ x: lx, z: 36.85 });
  });
  [4, -15, -40, -53, -84, -106, 52, 72, 92, 118, 138, 166, 186, 212, 232, 258, 280, 308, 328].forEach((lz) => {
    streetLampSpots.push({ x: -235.3, z: lz });
    streetLampSpots.push({ x: -219.7, z: lz });
  });

  // 8 Dynamic Player-Following Real Warm Streetlamp PointLights (zero FPS overhead, massive real PBR illumination on nearby houses & roads!)
  const DYNAMIC_LAMP_LIGHT_COUNT = 8;
  const dynamicLampLights: THREE.PointLight[] = [];
  let resLightProxScale = 1.0;
  for (let i = 0; i < DYNAMIC_LAMP_LIGHT_COUNT; i++) {
    const pl = new THREE.PointLight(0xffe19c, 0, 46.0, 1.0);
    pl.userData.dynamicWorldPos = true;
    pl.position.set(-420 + i * 18, 5.1, 21.0);
    scaledLights.push({
      light: pl,
      dayInt: 0,
      nightInt: 62.0,
      getScale: () => resLightProxScale,
    });
    dynamicLampLights.push(pl);
  }
  const nearestLampIdx = new Int32Array(DYNAMIC_LAMP_LIGHT_COUNT);
  const nearestLampDistSq = new Float64Array(DYNAMIC_LAMP_LIGHT_COUNT);
  let lastLampAssignX = 99999;
  let lastLampAssignZ = 99999;

  // --- ROW N1 CUSTOM SHOPS & HOUSES 7..22 (-606.6..-425.4, centerZ = -5.2) ---
  buildWalkableMotorRepairShop(staticGroup, sharedPalette, -430.2, -5.2, false); // House 7
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -439.9, cz: -5.2, w: 9.8, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 2, wallMat: sharedPalette.ochreHoiAnMat, roofStyle: 'terracotta_gable', roofMat: sharedPalette.weatheredTileMat,
    signTitle: 'CÀ PHÊ CÓC CÔ TƯ', signSub: 'Cà Phê Sữa Đá • Sinh Tố • Nước Mía', signBg: '#92400e',
    timberLouvers: true, yardTheme: 'cafe', blossom: 'yellow',
  }); // House 8
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -449.6, cz: -5.2, w: 9.6, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 4, wallMat: creamTrimMat, roofStyle: 'mansard', roofMat: slateRoofMat,
    yardTheme: 'villa', blossom: 'pink',
  }); // House 9
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -459.3, cz: -5.2, w: 9.8, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 1, wallMat: sharedPalette.warmYellowWallMat, roofStyle: 'terracotta_gable', roofMat: terracottaTileMat,
    yardTheme: 'garden', blossom: 'yellow',
  }); // House 10
  buildWalkablePhoBreezeHouse(staticGroup, sharedPalette, -469.0, -5.2, false); // House 11
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -478.2, cz: -5.2, w: 8.8, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 3, wallMat: sharedPalette.sandBeigeWallMat, roofStyle: 'flat_tank', roofMat: tealTinRoofMat,
    signTitle: 'BARBER 485 · CẮT TÓC', signSub: 'Cạo Mặt • Gội Đầu Thảo Dược', signBg: '#1e293b',
    tigerCage: true, yardTheme: 'barber',
  }); // House 12
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -494.0, cz: -5.2, w: 10.8, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 3, wallMat: creamTrimMat, roofStyle: 'thai_dual', roofMat: sharedPalette.emeraldRoofMat,
    signTitle: 'NHÀ THUỐC AN KHANG 485', signSub: 'Dược Sĩ Tư Vấn • Chuẩn GPP', signBg: '#065f46',
    planters: true, yardTheme: 'pharmacy',
  }); // House 13
  buildExteriorStairMotelRow(staticGroup, sharedPalette, -505.1, -5.2, 11.4, 21.2); // House 14
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -516.5, cz: -5.2, w: 11.4, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 3, wallMat: sharedPalette.concreteModernMat, roofStyle: 'flat_tank', roofMat: slateRoofMat,
    timberLouvers: true, planters: true, yardTheme: 'bikes',
  }); // House 15
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -527.9, cz: -5.2, w: 11.4, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 2, wallMat: creamTrimMat, roofStyle: 'japanese_hip', roofMat: slateRoofMat,
    planters: true, yardTheme: 'villa', blossom: 'pink',
  }); // House 16
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -539.0, cz: -5.2, w: 10.8, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 3, wallMat: sharedPalette.mintWallMat, roofStyle: 'tin_sloped', roofMat: sharedPalette.cobaltRoofMat,
    signTitle: 'ĐIỆN NƯỚC TỔNG HỢP 545', signSub: 'Ống Nhựa • Đèn LED • Thợ Tại Nhà', signBg: '#1d4ed8',
    tigerCage: true, yardTheme: 'hardware',
  }); // House 17
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -555.8, cz: -5.2, w: 10.8, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 2, wallMat: sharedPalette.ochreHoiAnMat, roofStyle: 'terracotta_gable', roofMat: sharedPalette.weatheredTileMat,
    signTitle: 'BÁNH MÌ CÔ NĂM 545', signSub: 'Thịt Nướng • Chả Lụa • Xôi Mặn', signBg: '#b45309',
    timberLouvers: true, yardTheme: 'cafe', blossom: 'yellow',
  }); // H18
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -566.9, cz: -5.2, w: 11.4, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 4, wallMat: creamTrimMat, roofStyle: 'flat_tank', roofMat: sharedPalette.graniteRedBlackMat,
    graniteTrim: true, planters: true, yardTheme: 'bikes',
  }); // H19
  buildWalkableHuTieuShop(staticGroup, sharedPalette, -578.4, -5.2, false); // H20
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -589.95, cz: -5.2, w: 11.5, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 1, wallMat: sharedPalette.warmYellowWallMat, roofStyle: 'terracotta_gable', roofMat: terracottaTileMat,
    yardTheme: 'garden', blossom: 'pink',
  }); // H21
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -601.15, cz: -5.2, w: 10.9, bodyD: 21.2, yardD: 10.2, facingNorth: false,
    floors: 3, wallMat: sharedPalette.concreteModernMat, roofStyle: 'tin_sloped', roofMat: sharedPalette.redTinRoofMat,
    signTitle: 'VLXD & SƠN DULUX 545', signSub: 'Xi Măng • Gạch Men • Pha Màu Vi Tính', signBg: '#0369a1',
    tigerCage: true, yardTheme: 'hardware',
  }); // H22

  // --- ROW S1 CUSTOM SHOPS & HOUSES S1..S15 (-606.6..-434.0, centerZ = 64.0) ---
  buildWalkableComTamShop(staticGroup, sharedPalette, -439.0, 64.0, true); // S1 (corner shop at Ngã 3 Đường Kết Nối Nam!)
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -449.0, cz: 64.0, w: 10.0, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 3, wallMat: creamTrimMat, roofStyle: 'flat_tank', roofMat: sharedPalette.graniteRedBlackMat,
    graniteTrim: true, planters: true, yardTheme: 'bikes',
  }); // S2
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -459.0, cz: 64.0, w: 10.0, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 2, wallMat: sharedPalette.blushPinkWallMat, roofStyle: 'mansard', roofMat: terracottaTileMat,
    signTitle: 'TIỆM MAY ÁO DÀI CÔ LAN', signSub: 'May Đo Áo Dài • Sửa Quần Áo Lấy Liền', signBg: '#9d174d',
    timberLouvers: true, yardTheme: 'cafe', blossom: 'pink',
  }); // S3
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -469.0, cz: 64.0, w: 10.0, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 4, wallMat: creamTrimMat, roofStyle: 'thai_dual', roofMat: sharedPalette.cobaltRoofMat,
    planters: true, yardTheme: 'villa',
  }); // S4
  buildWalkableBunDauCorner(staticGroup, sharedPalette, -478.3, 64.0, true); // S6
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -493.1, cz: 64.0, w: 9.0, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 3, wallMat: sharedPalette.pastelTealWallMat, roofStyle: 'tin_sloped', roofMat: tealTinRoofMat,
    signTitle: 'ĐIỆN LẠNH MINH TÂM 426', signSub: 'Vệ Sinh Máy Lạnh • Sửa Tủ Lạnh', signBg: '#0369a1',
    tigerCage: true, yardTheme: 'ac_shop',
  }); // S7
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -503.2, cz: 64.0, w: 11.2, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 2, wallMat: sharedPalette.sandBeigeWallMat, roofStyle: 'japanese_hip', roofMat: slateRoofMat,
    planters: true, yardTheme: 'villa', blossom: 'pink',
  }); // S8
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -514.3, cz: 64.0, w: 11.0, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 4, wallMat: sharedPalette.concreteModernMat, roofStyle: 'flat_tank', roofMat: sharedPalette.charcoalTrimMat,
    goldLouvers: true, planters: true, yardTheme: 'bikes',
  }); // S9
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -525.4, cz: 64.0, w: 11.2, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 3, wallMat: sharedPalette.warmYellowWallMat, roofStyle: 'tin_sloped', roofMat: tealTinRoofMat,
    signTitle: 'GIẶT ỦI & NHÀ TRỌ 426', signSub: 'Giặt Lấy Ngay • Phòng Cho Thuê', signBg: '#0f766e',
    laundry: true, yardTheme: 'bikes',
  }); // S10
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -537.7, cz: 64.0, w: 13.4, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 2, wallMat: sharedPalette.ochreHoiAnMat, roofStyle: 'terracotta_gable', roofMat: sharedPalette.weatheredTileMat,
    timberLouvers: true, breezeBlock: true, breezeMat: sharedPalette.breezeBlockTerracottaMat,
    yardTheme: 'garden', blossom: 'pink',
  }); // S11
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -555.8, cz: 64.0, w: 10.8, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 2, wallMat: sharedPalette.warmYellowWallMat, roofStyle: 'terracotta_gable', roofMat: sharedPalette.weatheredTileMat,
    signTitle: 'BÁNH CUỐN NÓNG 490', signSub: 'Chả Quế • Nem Nướng • Sữa Đậu Nành', signBg: '#b45309',
    yardTheme: 'cafe', blossom: 'yellow',
  }); // S12
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -566.9, cz: 64.0, w: 11.4, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 4, wallMat: creamTrimMat, roofStyle: 'flat_tank', roofMat: sharedPalette.graniteRedBlackMat,
    graniteTrim: true, planters: true, yardTheme: 'bikes',
  }); // S13
  buildWalkableBunBoHueShop(staticGroup, sharedPalette, -578.4, 64.0, true); // S14
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -589.95, cz: 64.0, w: 11.5, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 1, wallMat: sharedPalette.mintWallMat, roofStyle: 'terracotta_gable', roofMat: terracottaTileMat,
    yardTheme: 'garden', blossom: 'pink',
  }); // S15
  buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
    cx: -601.15, cz: 64.0, w: 10.9, bodyD: 24.0, yardD: 9.5, facingNorth: true,
    floors: 3, wallMat: sharedPalette.concreteModernMat, roofStyle: 'tin_sloped', roofMat: sharedPalette.cobaltRoofMat,
    signTitle: 'PHỤ TÙNG HONDA TÂY', signSub: 'Nhớt Chính Hãng • Vỏ Xe • Bảo Dưỡng', signBg: '#1e3a8a',
    tigerCage: true, yardTheme: 'hardware',
  }); // S16

  // --- HELPER: PROCEDURAL DIVERSE RESIDENTIAL & WALKABLE SHOP BUILDER FOR ALL INNER & -960 SEGMENTS ---
  const wallMatsCycle = [
    creamTrimMat,
    sharedPalette.warmYellowWallMat,
    sharedPalette.mintWallMat,
    sharedPalette.ochreHoiAnMat,
    sharedPalette.blushPinkWallMat,
    sharedPalette.sandBeigeWallMat,
    sharedPalette.pastelTealWallMat,
    sharedPalette.concreteModernMat,
  ];
  const roofStyleCycle: Array<{
    style: Parameters<typeof buildDiverseVietnameseHouse>[2]['roofStyle'];
    mat: THREE.MeshStandardMaterial;
    floors: 1 | 2 | 3 | 4;
  }> = [
    { style: 'terracotta_gable', mat: terracottaTileMat, floors: 1 },
    { style: 'mansard', mat: slateRoofMat, floors: 4 },
    { style: 'thai_dual', mat: sharedPalette.emeraldRoofMat, floors: 3 },
    { style: 'tin_sloped', mat: tealTinRoofMat, floors: 2 },
    { style: 'flat_tank', mat: sharedPalette.charcoalTrimMat, floors: 3 },
    { style: 'japanese_hip', mat: slateRoofMat, floors: 2 },
    { style: 'tin_sloped', mat: sharedPalette.redTinRoofMat, floors: 3 },
    { style: 'thai_dual', mat: sharedPalette.cobaltRoofMat, floors: 4 },
    { style: 'terracotta_gable', mat: sharedPalette.weatheredTileMat, floors: 2 },
    { style: 'flat_tank', mat: sharedPalette.graniteRedBlackMat, floors: 3 },
  ];
  const extraSignCatalog = [
    { title: 'NHA KHOA THẨM MỸ', sub: 'Bác Sĩ Tận Tâm • Chỉnh Nha', bg: '#0f766e', theme: 'pharmacy' as const },
    { title: 'SIÊU THỊ MINI 24H', sub: 'Đồ Tiêu Dùng • Rau Tươi Sạch', bg: '#dc2626', theme: 'cafe' as const },
    { title: 'TÓC NAM BARBER PRO', sub: 'Cắt Uốn Nhuộm • Ráy Tai Thư Giãn', bg: '#1e293b', theme: 'barber' as const },
    { title: 'GIẶT ỦI THÔNG MINH', sub: 'Giặt Hấp • Sấy Thơm • Giao Tận Nhà', bg: '#0369a1', theme: 'hardware' as const },
    { title: 'NHÀ THUỐC GIA ĐÌNH', sub: 'Dược Sĩ Tư Vấn • Chuẩn GPP', bg: '#065f46', theme: 'pharmacy' as const },
    { title: 'SỬA ĐIỆN LẠNH & TIVI', sub: 'Máy Lạnh • Tủ Lạnh • Tại Nhà', bg: '#1d4ed8', theme: 'ac_shop' as const },
  ];

  buildCommunityHallAndFitnessCourt(staticGroup, sharedPalette, -371.0); // Tổ 4 (-380..-362, Z=-54..-26)
  buildBadmintonAndPocketPark(staticGroup, sharedPalette);              // Tổ 5 (-390..-362, Z=-94..-64)

  let globalLotSeed = 1;
  let marketsClosedFactor = 0;
  const marketControllers: MarketDynamicController[] = [];
  const marketNpcSeeds: ResidentialMarketNpcSeed[] = [];
  const marketLightAnchors: Array<{ x: number; y: number; z: number; color: number }> = [];
  PROCEDURAL_SEGMENTS.forEach((seg) => {
    const market = findResidentialMarketBySegment(seg.id);
    if (market) {
      globalLotSeed += seg.count;
      const builtMarket = buildTraditionalResidentialMarket(staticGroup, sharedPalette, market, {
        dynamicParent: dynamicGroup,
        lanternGlowMat,
        warmPoolMat,
        addStreetLamp: addRoadStyleStreetLamp,
        addMotorbike: sharedPalette.addMotorbike,
      });
      marketControllers.push(builtMarket.controller);
      marketNpcSeeds.push(...builtMarket.npcSeeds);
      marketLightAnchors.push(...builtMarket.pointLightAnchors);
      return;
    }
    const bodyD = seg.bodyMaxZ - seg.bodyMinZ;
    const yardD = seg.yardMaxZ - seg.yardMinZ;
    const cz = (seg.bodyMinZ + seg.bodyMaxZ) * 0.5;
    const facingNorth = seg.facingNorth ?? seg.row.startsWith('S');

    subdivideLotSegment(seg.minX, seg.maxX, seg.count).forEach((lot) => {
      const s = globalLotSeed++;
      const walkable = findWalkableShopForLot(seg.row, lot.cx);
      if (walkable) {
        buildWalkableStreetShop(staticGroup, sharedPalette, walkable);
        return;
      }
      const r = roofStyleCycle[s % roofStyleCycle.length];
      const hasCommercialSign = s % 5 === 0;
      const signMeta = hasCommercialSign ? extraSignCatalog[(s >> 2) % extraSignCatalog.length] : undefined;
      buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
        cx: lot.cx,
        cz,
        w: lot.w,
        bodyD,
        yardD,
        facingNorth,
        floors: signMeta ? (r.floors === 1 ? 2 : r.floors) : r.floors,
        wallMat: wallMatsCycle[(s * 3) % wallMatsCycle.length],
        roofStyle: r.style,
        roofMat: r.mat,
        signTitle: signMeta?.title,
        signSub: signMeta?.sub,
        signBg: signMeta?.bg,
        timberLouvers: s % 5 === 1,
        goldLouvers: s % 7 === 2,
        breezeBlock: s % 4 === 3,
        breezeMat: s % 8 === 3 ? sharedPalette.breezeBlockWhiteMat : sharedPalette.breezeBlockTerracottaMat,
        tigerCage: r.floors >= 2 && s % 6 === 4,
        graniteTrim: r.style === 'flat_tank' && s % 3 === 0,
        planters: s % 2 === 0,
        laundry: s % 4 === 2,
        yardTheme: signMeta?.theme ?? (r.floors === 1 || s % 5 === 0 ? 'garden' : s % 3 === 1 ? 'villa' : 'bikes'),
        blossom: s % 3 === 0 ? 'pink' : s % 3 === 1 ? 'yellow' : 'none',
      });
    });
  });

  // Register the 8 legacy custom walkable shops with furniture-aligned seats (-0.20m Sit pullback) & order points!
  WEST_WALKABLE_SHOPS.filter((s) => s.isLegacyCustom).forEach((s) => {
    const dirIn = s.facingNorth ? 1 : -1;
    const frontZ = s.facingNorth ? s.minZ : s.maxZ;
    const sidewalkZ = frontZ - dirIn * 4.4;
    const curbParkZ = frontZ - dirIn * 8.6;
    let orderX = s.cx;
    let orderZ = s.cz + dirIn * 2.2;
    let orderYaw = s.facingNorth ? 0 : Math.PI;
    let seats: WalkableShopActivitySlot['seats'] = [];

    if (s.id === 'shop_n1_taphoa_coba') {
      // Standing at main aisle in front of Cô Ba checkout counter (-366.8, -10.3); outdoor Trà Đá stools
      orderX = -365.2;
      orderZ = -8.5;
      orderYaw = Math.PI;
      seats = [
        { x: -363.5, z: 7.55, yaw: 0, occupiedBy: null },
        { x: -363.5, z: 9.25, yaw: Math.PI, occupiedBy: null },
        { x: -363.5, z: 10.35, yaw: 0, occupiedBy: null },
      ];
    } else if (s.id === 'shop_n1_suaxe_chubay') {
      // Standing in front of tool bench; waiting bench against East wall (-426.4, Z=0.6..1.8 facing West)
      orderX = -429.2;
      orderZ = -7.2;
      orderYaw = Math.PI;
      seats = [
        { x: -426.18, z: 0.65, yaw: -Math.PI / 2, occupiedBy: null },
        { x: -426.18, z: 1.75, yaw: -Math.PI / 2, occupiedBy: null },
      ];
    } else if (s.id === 'shop_n1_com_giadinh') {
      orderX = -401.2;
      orderZ = -2.2;
      orderYaw = -Math.PI / 2;
      seats = [
        { x: -398.2, z: -3.95, yaw: 0, occupiedBy: null },
        { x: -398.2, z: -1.85, yaw: Math.PI, occupiedBy: null },
        { x: -398.2, z: 0.65, yaw: 0, occupiedBy: null },
        { x: -398.2, z: 2.75, yaw: Math.PI, occupiedBy: null },
      ];
    } else if (s.id === 'shop_n1_pho_hanoi') {
      orderX = -468.8;
      orderZ = -2.2;
      orderYaw = -Math.PI / 2;
      seats = [
        { x: -466.6, z: -8.76, yaw: 0, occupiedBy: null },
        { x: -466.6, z: -6.84, yaw: Math.PI, occupiedBy: null },
        { x: -466.6, z: -5.16, yaw: 0, occupiedBy: null },
        { x: -466.6, z: -3.24, yaw: Math.PI, occupiedBy: null },
      ];
    } else if (s.id === 'shop_n1_hutieu_545') {
      orderX = -578.6;
      orderZ = -2.0;
      orderYaw = -Math.PI / 2;
      seats = [
        { x: -575.4, z: -8.76, yaw: 0, occupiedBy: null },
        { x: -575.4, z: -6.84, yaw: Math.PI, occupiedBy: null },
        { x: -575.4, z: -5.36, yaw: 0, occupiedBy: null },
        { x: -575.4, z: -3.44, yaw: Math.PI, occupiedBy: null },
      ];
    } else if (s.id === 'shop_s1_comtam') {
      orderX = -438.2;
      orderZ = 60.8;
      orderYaw = Math.PI / 2;
      seats = [
        { x: -441.6, z: 61.84, yaw: 0, occupiedBy: null },
        { x: -441.6, z: 63.76, yaw: Math.PI, occupiedBy: null },
        { x: -441.6, z: 57.84, yaw: 0, occupiedBy: null },
        { x: -441.6, z: 59.76, yaw: Math.PI, occupiedBy: null },
      ];
    } else if (s.id === 'shop_s1_bundau_426') {
      orderX = -478.7;
      orderZ = 60.8;
      orderYaw = -Math.PI / 2;
      seats = [
        { x: -475.9, z: 61.84, yaw: 0, occupiedBy: null },
        { x: -475.9, z: 63.76, yaw: Math.PI, occupiedBy: null },
        { x: -475.9, z: 57.84, yaw: 0, occupiedBy: null },
        { x: -475.9, z: 59.76, yaw: Math.PI, occupiedBy: null },
      ];
    } else if (s.id === 'shop_s1_bunbo_onga') {
      orderX = -578.0;
      orderZ = 60.8;
      orderYaw = Math.PI / 2;
      seats = [
        { x: -581.4, z: 61.84, yaw: 0, occupiedBy: null },
        { x: -581.4, z: 63.76, yaw: Math.PI, occupiedBy: null },
        { x: -581.4, z: 57.84, yaw: 0, occupiedBy: null },
        { x: -581.4, z: 59.76, yaw: Math.PI, occupiedBy: null },
      ];
    }

    registerWalkableShopSlot({
      id: s.id,
      name: s.name,
      theme: s.theme,
      cx: s.cx,
      cz: s.cz,
      facingNorth: s.facingNorth,
      doorX: s.doorX,
      doorZ: s.doorZ,
      sidewalkX: s.doorX,
      sidewalkZ,
      curbParkX: s.doorX + (s.facingNorth ? -2.2 : 2.2),
      curbParkZ,
      curbParkYaw: s.facingNorth ? -Math.PI / 2 : Math.PI / 2,
      orderX,
      orderZ,
      orderYaw,
      seats,
    });
  });

  // Parks & Green Pocket Verges across North, South & Far-West (-960..-305)
  // Công Viên Bắc Tổ 7 (-396..-362, Z=-134..-102)
  const emeraldLawnMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 });
  const courtGreenMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.72 });
  const courtBlueMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.72 });
  const fitnessYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.38, metalness: 0.45 });
  const fitnessBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.38, metalness: 0.45 });
  const fruitOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.65 });
  const fruitYellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.65 });
  const fruitGreenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.68 });
  const canopyStripeRedMat = new THREE.MeshStandardMaterial({ map: createAwningStripeTex('#dc2626', '#fef2f2'), roughness: 0.72 });
  const canopyStripeBlueMat = new THREE.MeshStandardMaterial({ map: createAwningStripeTex('#0284c7', '#f0f9ff'), roughness: 0.72 });
  const canopyStripeGreenMat = new THREE.MeshStandardMaterial({ map: createAwningStripeTex('#15803d', '#f0fdf4'), roughness: 0.72 });
  const canopyMats = [canopyStripeRedMat, canopyStripeBlueMat, canopyStripeGreenMat, sharedPalette.stripedAwningMat];

  // Upgrade Công Viên Bắc Tổ 7 with green turf & warm park lamps
  addBox(34.0, 0.06, 32.0, sharedPalette.tilePatioMat, -379.0, 0.03, -118.0);
  addBox(28.0, 0.08, 22.0, emeraldLawnMat, -379.0, 0.05, -118.0);
  addBox(4.2, 0.09, 24.0, sharedPalette.brickCourtyardMat, -379.0, 0.055, -118.0);
  [-389.0, -379.0, -369.0].forEach((tx, idx) => {
    sharedPalette.addTree(staticGroup, tx, -124.0, 0.95, idx % 2 === 0 ? 'pink' : 'yellow');
    sharedPalette.addTree(staticGroup, tx, -110.0, 0.9, 'none');
    addBox(2.0, 0.45, 0.56, concreteApronMat, tx, 0.23, -115.0);
  });
  addRoadStyleStreetLamp(-387.0, -104.5, 0, -1, true);
  addRoadStyleStreetLamp(-371.0, -129.0, 0, 1, true);

  // Công Viên Đại Lộ Nam Liên Khu (X = -960..+100, Z = 352.4..362.0) framing the entire 1,060m Southern Boulevard & Ocean Park link!
  addBox(1060.0, 0.34, 9.6, concreteApronMat, -430.0, -0.15, 357.2);
  addBox(1058.0, 0.06, 9.2, sharedPalette.tilePatioMat, -430.0, 0.03, 357.2);
  [
    { cx: -785.0, w: 330.0 },
    { cx: -460.0, w: 295.0 },
    { cx: -227.5, w: 120.0 },
    { cx: -2.0, w: 185.0 },
  ].forEach((lawn) => {
    addBox(lawn.w, 0.08, 4.4, emeraldLawnMat, lawn.cx, 0.05, 358.8);
  });
  let spIdx = 0;
  for (let tx = -944; tx <= 86; tx += 22) {
    sharedPalette.addTree(staticGroup, tx, 359.4, spIdx % 3 === 0 ? 1.05 : 0.92, spIdx % 2 === 0 ? 'pink' : 'yellow');
    if (spIdx % 2 === 0) {
      addBox(2.0, 0.44, 0.54, concreteApronMat, tx, 0.22, 355.4);
    } else {
      addRoadStyleStreetLamp(tx, 354.2, 0, -1, true);
    }
    spIdx++;
  }
  // Two Scenic Park Welcome Signs facing North at Đại Lộ Bệnh Viện (-227.5) and Trục Nam Trung Tâm (-2.0)
  [
    { cx: -227.5, title: 'CÔNG VIÊN ĐẠI LỘ NAM', sub: 'KẾT NỐI BỆNH VIỆN • OCEAN PARK' },
    { cx: -2.0, title: 'KHU DÂN CƯ NAM TRUNG TÂM', sub: 'LIÊN KHU XANH • SẠCH • ĐẸP' },
  ].forEach((signCfg) => {
    addBox(0.18, 2.2, 0.18, darkMetalMat, signCfg.cx - 3.7, 1.1, 356.2);
    addBox(0.18, 2.2, 0.18, darkMetalMat, signCfg.cx + 3.7, 1.1, 356.2);
    const sTex = createSignTex(signCfg.title, signCfg.sub, {
      bg: '#065f46',
      bg2: '#047857',
      border: '#fde047',
    });
    const sMat = new THREE.MeshStandardMaterial({
      map: sTex,
      emissive: 0xffffff,
      emissiveMap: sTex,
      emissiveIntensity: 0.34,
    });
    neonMats.push(sMat);
    const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.35), sMat);
    sMesh.position.set(signCfg.cx, 2.05, 356.08);
    sMesh.rotation.y = Math.PI;
    staticGroup.add(sMesh);
  });

  // Helpers for richly detailed community parks, pavilions, outdoor fitness & night markets
  const addParkGazebo = (gx: number, gz: number) => {
    addBox(5.2, 0.22, 5.2, creamTrimMat, gx, 0.11, gz);
    addBox(4.7, 0.24, 4.7, sharedPalette.brickCourtyardMat, gx, 0.12, gz);
    [[-1.95, -1.95], [1.95, -1.95], [-1.95, 1.95], [1.95, 1.95]].forEach(([ox, oz]) => {
      addBox(0.24, 3.05, 0.24, woodMahoganyMat, gx + ox, 1.65, gz + oz);
    });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.85, 1.45, 6), terracottaTileMat);
    roof.position.set(gx, 3.85, gz);
    roof.rotation.y = Math.PI / 6;
    staticGroup.add(roof);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), lampGoldMat);
    finial.position.set(gx, 4.62, gz);
    staticGroup.add(finial);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), lanternGlowMat);
    lantern.position.set(gx, 2.88, gz);
    staticGroup.add(lantern);
    const pool = new THREE.Mesh(lampPoolGeo, warmPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(gx, 0.25, gz);
    staticGroup.add(pool);
    // Stone benches inside gazebo
    addBox(2.6, 0.44, 0.52, concreteApronMat, gx, 0.44, gz - 1.55);
    addBox(2.6, 0.44, 0.52, concreteApronMat, gx, 0.44, gz + 1.55);
    addBox(0.9, 0.72, 0.9, creamTrimMat, gx, 0.56, gz); // Center stone chess table
  };

  const addOutdoorFitnessStation = (fx: number, fz: number, idx: number) => {
    if (idx % 3 === 0) {
      // Pull-up / parallel bars
      addBox(0.1, 2.25, 0.1, fitnessBlueMat, fx - 0.95, 1.12, fz);
      addBox(0.1, 2.25, 0.1, fitnessBlueMat, fx + 0.95, 1.12, fz);
      addBox(2.0, 0.08, 0.08, fitnessYellowMat, fx, 2.18, fz);
      addBox(2.0, 0.07, 0.07, fitnessYellowMat, fx, 1.48, fz + 0.55);
      addBox(0.09, 1.48, 0.09, fitnessBlueMat, fx - 0.95, 0.74, fz + 0.55);
      addBox(0.09, 1.48, 0.09, fitnessBlueMat, fx + 0.95, 0.74, fz + 0.55);
    } else if (idx % 3 === 1) {
      // Air-walker / elliptical swing
      addBox(0.14, 1.45, 0.14, fitnessBlueMat, fx, 0.73, fz);
      addBox(0.9, 0.08, 0.08, fitnessYellowMat, fx, 1.38, fz);
      addBox(0.07, 1.05, 0.07, fitnessYellowMat, fx - 0.36, 0.84, fz + 0.12);
      addBox(0.07, 1.05, 0.07, fitnessYellowMat, fx + 0.36, 0.84, fz - 0.12);
      addBox(0.24, 0.06, 0.42, darkMetalMat, fx - 0.36, 0.32, fz + 0.14);
      addBox(0.24, 0.06, 0.42, darkMetalMat, fx + 0.36, 0.32, fz - 0.14);
    } else {
      // Waist-twister triple disc stand
      addBox(0.14, 1.35, 0.14, fitnessBlueMat, fx, 0.68, fz);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 10), fitnessYellowMat);
      ring.position.set(fx, 1.28, fz);
      staticGroup.add(ring);
      [-0.55, 0.55].forEach((ox) => {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 10), fitnessYellowMat);
        disc.position.set(fx + ox, 0.12, fz);
        staticGroup.add(disc);
      });
    }
  };

  const addPergolaArbor = (px: number, pz: number, lenX: number) => {
    const posts = Math.max(3, Math.round(lenX / 3.4) + 1);
    const halfL = lenX * 0.5;
    for (let i = 0; i < posts; i++) {
      const lx = px - halfL + (lenX * i) / (posts - 1);
      addBox(0.18, 2.85, 0.18, woodMahoganyMat, lx, 1.44, pz - 1.35);
      addBox(0.18, 2.85, 0.18, woodMahoganyMat, lx, 1.44, pz + 1.35);
      addBox(0.14, 0.16, 3.05, woodMahoganyMat, lx, 2.86, pz);
      if (i < posts - 1) {
        const mx = lx + (lenX / (posts - 1)) * 0.5;
        const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), i % 2 === 0 ? bougainvilleaMat1 : leafBrightMat);
        vine.scale.set(1.6, 0.42, 1.3);
        vine.position.set(mx, 3.02, pz);
        staticGroup.add(vine);
      }
    }
    addBox(lenX + 0.4, 0.14, 0.16, woodMahoganyMat, px, 2.74, pz - 1.35);
    addBox(lenX + 0.4, 0.14, 0.16, woodMahoganyMat, px, 2.74, pz + 1.35);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), lanternGlowMat);
    bulb.position.set(px, 2.66, pz);
    staticGroup.add(bulb);
    const pool = new THREE.Mesh(lampPoolGeo, warmPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(px, 0.08, pz);
    staticGroup.add(pool);
  };

  const addParkStoneBench = (bx: number, bz: number) => {
    addBox(2.0, 0.12, 0.58, concreteApronMat, bx, 0.46, bz);
    addBox(0.18, 0.42, 0.52, alleyBorderMat, bx - 0.72, 0.21, bz);
    addBox(0.18, 0.42, 0.52, alleyBorderMat, bx + 0.72, 0.21, bz);
    addBox(2.0, 0.42, 0.1, concreteApronMat, bx, 0.72, bz - 0.24);
  };

  const southInfillSigns = [
    { title: 'PHỞ ĐÊM NAM TÂY', sub: 'Tái Nạm Gầu • Mở Khuya 24H', bg: '#991b1b', theme: 'cafe' as const },
    { title: 'CÀ PHÊ VỢT SÀI GÒN', sub: 'Cà Phê Sữa Đá • Bạc Xỉu • Trà Đá', bg: '#78350f', theme: 'cafe' as const },
    { title: 'TẠP HÓA MINH ANH', sub: 'Nước Giải Khát • Thẻ Cào • Đồ Gia Dụng', bg: '#b45309', theme: 'hardware' as const },
    { title: 'TIỆM TÓC HOÀNG GIA', sub: 'Cắt Uốn Nhuộm • Gội Đầu Thảo Dược', bg: '#1e293b', theme: 'barber' as const },
    { title: 'GIẶT SẤY NHANH 24H', sub: 'Giặt Thơm • Sấy Khô • Lấy Liền', bg: '#0369a1', theme: 'hardware' as const },
    { title: 'TRÀ SỮA & BÁNH TRÁNG', sub: 'Trân Châu Đường Đen • Ăn Vặt Học Sinh', bg: '#9d174d', theme: 'cafe' as const },
    { title: 'NHÀ THUỐC ĐÔNG TÂY', sub: 'Dược Sĩ Trực 24/7 • Chuẩn GPP', bg: '#065f46', theme: 'pharmacy' as const },
    { title: 'SỬA ĐIỆN THOẠI & MÁY TÍNH', sub: 'Ép Kính • Thay Pin • Phụ Kiện Chính Hãng', bg: '#1d4ed8', theme: 'ac_shop' as const },
  ];

  const nightMarketTitles = [
    { title: 'CHỢ ĐÊM NAM TÂY', sub: 'Trái Cây Tươi • Rau Sạch Miền Tây', bg: '#dc2626' },
    { title: 'ỐC NƯỚNG & HẢI SẢN', sub: 'Nghêu Hấp Sả • Sò Lông Mỡ Hành', bg: '#9a3412' },
    { title: 'BÚN RIÊU & BÁNH CANH', sub: 'Chả Cua • Giò Heo • Nóng Hổi', bg: '#b45309' },
    { title: 'TRÀ CHANH & XIÊN BẨN', sub: 'Nem Chua Rán • Cá Viên Chiên', bg: '#0f766e' },
    { title: 'BÁNH MÌ & XÔI MẶN ĐÊM', sub: 'Pate Gan • Thịt Nướng • Sữa Đậu Nành', bg: '#78350f' },
    { title: 'NƯỚC MÍA & SINH TỐ', sub: 'Sinh Tố Bơ • Dừa Tươi Mát Lạnh', bg: '#15803d' },
  ];

  // =========================================================================
  // 10C. SOUTH INFILL URBANIZATION (Eliminates all empty 14m-18m concrete voids!)
  // =========================================================================
  let infillSeed = 500;
  WEST_SOUTH_INFILL_ZONES.forEach((zone, zoneIdx) => {
    const zw = zone.maxX - zone.minX;
    const zcx = (zone.minX + zone.maxX) * 0.5;

    if (zone.kind === 's1_townhouses' || zone.kind === 's2_kiosk_row') {
      const bodyD = zone.maxZ - zone.minZ;
      const yardD = zone.kind === 's1_townhouses' ? 4.4 : 3.0;
      const cz = (zone.minZ + zone.maxZ) * 0.5;
      subdivideLotSegment(zone.minX, zone.maxX, zone.count).forEach((lot, lotIdx) => {
        const s = infillSeed++;
        const r = roofStyleCycle[(s + 2) % roofStyleCycle.length];
        const signMeta = (lotIdx + zoneIdx) % 2 === 0 ? southInfillSigns[s % southInfillSigns.length] : undefined;
        const floors = zone.kind === 's2_kiosk_row' ? (r.floors > 3 ? 2 : r.floors) : Math.min(3, Math.max(2, r.floors)) as 1 | 2 | 3;
        buildDiverseVietnameseHouse(staticGroup, sharedPalette, {
          cx: lot.cx,
          cz,
          w: lot.w,
          bodyD,
          yardD,
          facingNorth: false, // Faces South directly onto Đường Nội Khu Nam 1 / Nam 2!
          floors,
          wallMat: wallMatsCycle[(s * 5 + 1) % wallMatsCycle.length],
          roofStyle: r.style,
          roofMat: r.mat,
          signTitle: signMeta?.title,
          signSub: signMeta?.sub,
          signBg: signMeta?.bg,
          timberLouvers: s % 3 === 0,
          goldLouvers: s % 5 === 1,
          breezeBlock: s % 4 === 2,
          breezeMat: sharedPalette.breezeBlockTerracottaMat,
          planters: true,
          laundry: s % 3 === 1,
          yardTheme: signMeta?.theme ?? (s % 2 === 0 ? 'bikes' : 'cafe'),
          blossom: s % 2 === 0 ? 'pink' : 'yellow',
        });
      });
      // Warm sidewalk light pools in front of the new Nam 1 / Nam 2 storefronts
      const poolZ = zone.maxZ + 2.4;
      for (let px = zone.minX + 9.0; px <= zone.maxX - 9.0; px += 18.0) {
        const pool = new THREE.Mesh(lampPoolGeo, warmPoolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(px, 0.044, poolZ);
        staticGroup.add(pool);
      }
      return;
    }

    if (zone.kind === 's1_sports_park') {
      // Rich Sports Park & Community Lawn (Z = 76.8..93.0)
      const parkD = zone.maxZ - zone.minZ;
      const parkCz = (zone.minZ + zone.maxZ) * 0.5;
      addBox(zw - 0.8, 0.09, parkD, creamTrimMat, zcx, 0.045, parkCz);
      addBox(zw - 1.6, 0.11, parkD - 0.8, emeraldLawnMat, zcx, 0.055, parkCz);
      // Brick promenade walkway along South edge & central cross-path
      addBox(zw - 1.4, 0.12, 2.4, sharedPalette.brickCourtyardMat, zcx, 0.06, zone.maxZ - 1.4);
      addBox(3.0, 0.12, parkD - 0.8, sharedPalette.brickCourtyardMat, zcx, 0.06, parkCz);

      if (zw >= 48.0) {
        // Illuminated Badminton / Volleyball Court on the West side of the park
        const courtX = zone.minX + 13.5;
        const courtZ = 83.2;
        addBox(14.8, 0.13, 8.6, zoneIdx % 2 === 0 ? courtGreenMat : courtBlueMat, courtX, 0.065, courtZ);
        // White boundary & service lines
        addBox(13.6, 0.14, 0.1, paintWhiteMat, courtX, 0.072, courtZ - 3.6);
        addBox(13.6, 0.14, 0.1, paintWhiteMat, courtX, 0.072, courtZ + 3.6);
        addBox(0.1, 0.14, 7.3, paintWhiteMat, courtX - 6.8, 0.072, courtZ);
        addBox(0.1, 0.14, 7.3, paintWhiteMat, courtX + 6.8, 0.072, courtZ);
        addBox(0.08, 0.14, 7.3, paintWhiteMat, courtX, 0.072, courtZ);
        // Net poles & mesh
        addBox(0.1, 1.85, 0.1, inoxMat, courtX, 0.96, courtZ - 3.7);
        addBox(0.1, 1.85, 0.1, inoxMat, courtX, 0.96, courtZ + 3.7);
        addBox(0.04, 0.72, 7.3, creamTrimMat, courtX, 1.42, courtZ);
        // Warm court lamps
        addRoadStyleStreetLamp(courtX - 7.6, courtZ - 4.4, 0, 1, true);
        addRoadStyleStreetLamp(courtX + 7.6, courtZ + 4.4, 0, -1, true);

        // Red-Tile Pavilion Gazebo on East-Center
        addParkGazebo(zone.maxX - 18.5, 83.4);

        // Outdoor Fitness Pad on Far-East
        const fitBaseX = zone.maxX - 8.5;
        addBox(11.0, 0.12, 8.2, sharedPalette.tilePatioMat, fitBaseX, 0.06, 83.2);
        for (let fi = 0; fi < 4; fi++) {
          const fx = fitBaseX - 3.6 + (fi % 2) * 4.4;
          const fz = 81.2 + Math.floor(fi / 2) * 3.8;
          addOutdoorFitnessStation(fx, fz, fi + zoneIdx);
        }
        addRoadStyleStreetLamp(zone.maxX - 2.6, 89.2, -1, 0, true);
      } else {
        // Compact Southwest Corner Park (Bay 8: 38m wide)
        addParkGazebo(zcx - 6.0, 83.4);
        addBox(11.0, 0.12, 8.0, sharedPalette.tilePatioMat, zcx + 8.5, 0.06, 83.4);
        for (let fi = 0; fi < 3; fi++) {
          addOutdoorFitnessStation(zcx + 5.0 + fi * 3.4, 83.4, fi);
        }
        addRoadStyleStreetLamp(zcx - 14.0, 89.5, 0, -1, true);
        addRoadStyleStreetLamp(zcx + 14.0, 89.5, 0, -1, true);
      }

      // Park trees & stone benches framing the lawn
      for (let tx = zone.minX + 3.8; tx <= zone.maxX - 3.8; tx += 11.5) {
        sharedPalette.addTree(staticGroup, tx, 78.6, 0.92, Math.round(tx) % 2 === 0 ? 'pink' : 'yellow');
        addParkStoneBench(tx + 1.8, 90.4);
      }
      return;
    }

    if (zone.kind === 's1_night_market') {
      // Bustling Night Market & Food Plaza + Covered Bike Parking (Z = 76.8..93.0)
      const plazaD = zone.maxZ - zone.minZ;
      const plazaCz = (zone.minZ + zone.maxZ) * 0.5;
      addBox(zw - 0.6, 0.08, plazaD, sharedPalette.tilePatioMat, zcx, 0.04, plazaCz);
      addBox(zw - 1.2, 0.09, 2.2, sharedPalette.brickCourtyardMat, zcx, 0.045, zone.maxZ - 1.3);

      // 5–6 Colorful Food & Produce Stalls along North side (Z = 77.6..82.0)
      const stallSpanX = zw - 12.2;
      const stallCount = 5;
      const stallW = stallSpanX / stallCount;
      for (let si = 0; si < stallCount; si++) {
        const sx = zone.minX + 1.4 + (si + 0.5) * stallW;
        const stallMeta = nightMarketTitles[(si + zoneIdx) % nightMarketTitles.length];
        // Steel corner posts
        [-stallW * 0.44, stallW * 0.44].forEach((ox) => {
          addBox(0.12, 3.1, 0.12, darkMetalMat, sx + ox, 1.55, 77.9);
          addBox(0.12, 2.85, 0.12, darkMetalMat, sx + ox, 1.42, 81.9);
        });
        // Sloped striped canopy roof
        addBox(stallW - 0.35, 0.14, 4.7, canopyMats[si % canopyMats.length], sx, 3.06, 79.9, staticGroup, [0.09, 0, 0]);
        // Stall signboard
        const sTex = createSignTex(stallMeta.title, stallMeta.sub, { bg: stallMeta.bg, bg2: '#1e293b', border: '#fde047' });
        const sMat = new THREE.MeshStandardMaterial({ map: sTex, emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 0.48 });
        neonMats.push(sMat);
        const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(stallW - 0.8, 0.72), sMat);
        signMesh.position.set(sx, 3.36, 82.12);
        staticGroup.add(signMesh);
        // Back wall & wooden service counter with colorful produce/food crates
        addBox(stallW - 0.5, 2.5, 0.16, creamTrimMat, sx, 1.28, 77.8);
        addBox(stallW - 0.8, 0.92, 0.88, woodLightMat, sx, 0.48, 81.35);
        addBox(stallW - 0.7, 0.08, 0.96, inoxMat, sx, 0.96, 81.35);
        // Colorful food/fruit display trays on counter
        [-1.6, 0, 1.6].forEach((cxOff, ci) => {
          const fMat = ci === 0 ? fruitOrangeMat : ci === 1 ? fruitYellowMat : fruitGreenMat;
          addBox(1.1, 0.34, 0.56, fMat, sx + cxOff, 1.16, 81.32);
        });
        // Warm under-canopy stall light + ground pool
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lanternGlowMat);
        bulb.position.set(sx, 2.74, 81.2);
        staticGroup.add(bulb);
        const pool = new THREE.Mesh(lampPoolGeo, warmPoolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(sx, 0.09, 83.2);
        staticGroup.add(pool);

        // Outdoor plastic dining table + 4 stools in front of each stall (Z = 86.4)
        const tableMat = si % 2 === 0 ? plasticBlueMat : plasticRedMat;
        addBox(1.3, 0.06, 0.82, tableMat, sx, 0.72, 86.4);
        addBox(0.08, 0.7, 0.08, inoxMat, sx - 0.52, 0.35, 86.08);
        addBox(0.08, 0.7, 0.08, inoxMat, sx + 0.52, 0.35, 86.08);
        addBox(0.08, 0.7, 0.08, inoxMat, sx - 0.52, 0.35, 86.72);
        addBox(0.08, 0.7, 0.08, inoxMat, sx + 0.52, 0.35, 86.72);
        [-0.4, 0.4].forEach((ox) => {
          addBox(0.32, 0.42, 0.32, tableMat, sx + ox, 0.21, 85.45);
          addBox(0.32, 0.42, 0.32, tableMat, sx + ox, 0.21, 87.35);
        });
      }

      // Covered Motorbike Parking Shelter on the East side of the Night Market
      const parkX = zone.maxX - 5.2;
      addBox(8.6, 0.14, 9.2, tealTinRoofMat, parkX, 2.82, 82.2, staticGroup, [0.06, 0, 0]);
      [-3.9, 3.9].forEach((ox) => {
        [-4.2, 4.2].forEach((oz) => {
          addBox(0.12, 2.8, 0.12, darkMetalMat, parkX + ox, 1.4, 82.2 + oz);
        });
      });
      for (let bi = 0; bi < 4; bi++) {
        sharedPalette.addMotorbike(staticGroup, parkX - 2.7 + bi * 1.8, 82.2, Math.PI, [0xdc2626, 0x2563eb, 0xf8fafc, 0x16a34a][bi]);
      }
      addRoadStyleStreetLamp(zone.minX + 3.0, 91.2, 0, -1, true);
      addRoadStyleStreetLamp(zone.maxX - 3.0, 91.2, 0, -1, true);
      return;
    }

    if (zone.kind === 's2_linear_park') {
      // Lush Linear Park & Bougainvillea Pergola along Đường Nam 2 (Z = 134.8..146.8)
      const parkD = zone.maxZ - zone.minZ;
      const parkCz = (zone.minZ + zone.maxZ) * 0.5;
      addBox(zw - 0.8, 0.09, parkD, creamTrimMat, zcx, 0.045, parkCz);
      addBox(zw - 1.6, 0.11, parkD - 0.8, emeraldLawnMat, zcx, 0.055, parkCz);
      addBox(zw - 1.6, 0.12, 2.2, sharedPalette.brickCourtyardMat, zcx, 0.06, zone.maxZ - 1.6);

      addPergolaArbor(zcx - 11.5, 139.6, 13.5);
      addBox(12.0, 0.12, 6.2, sharedPalette.tilePatioMat, zcx + 12.0, 0.06, 139.8);
      for (let fi = 0; fi < 3; fi++) {
        addOutdoorFitnessStation(zcx + 8.0 + fi * 4.0, 139.8, fi + zoneIdx);
      }
      for (let tx = zone.minX + 4.2; tx <= zone.maxX - 4.2; tx += 12.5) {
        sharedPalette.addTree(staticGroup, tx, 136.6, 0.95, Math.round(tx) % 2 === 0 ? 'yellow' : 'pink');
        addParkStoneBench(tx + 2.2, 143.6);
      }
      addRoadStyleStreetLamp(zone.minX + 8.0, 145.6, 0, -1, true);
      addRoadStyleStreetLamp(zone.maxX - 8.0, 145.6, 0, -1, true);
      return;
    }

    if (zone.kind === 's3_border_park') {
      // Continuous Lush South Border Park behind Row S3 (Z = 194.6..203.2; leaves Z = 188..194.2 open road!)
      const parkD = zone.maxZ - zone.minZ;
      const parkCz = (zone.minZ + zone.maxZ) * 0.5;
      addBox(zw - 0.8, 0.09, parkD, creamTrimMat, zcx, 0.045, parkCz);
      addBox(zw - 1.6, 0.11, parkD - 0.8, emeraldLawnMat, zcx, 0.055, parkCz);
      addBox(zw - 1.6, 0.12, 1.9, sharedPalette.brickCourtyardMat, zcx, 0.06, zone.minZ + 1.3);

      if (zoneIdx % 2 === 0) {
        addParkGazebo(zcx - 8.0, 199.4);
        for (let fi = 0; fi < 3; fi++) {
          addOutdoorFitnessStation(zcx + 10.0 + fi * 3.8, 199.4, fi + zoneIdx);
        }
      } else {
        addPergolaArbor(zcx, 199.4, Math.min(20.0, zw * 0.42));
      }
      for (let tx = zone.minX + 4.5; tx <= zone.maxX - 4.5; tx += 14.0) {
        sharedPalette.addTree(staticGroup, tx, 201.4, 0.96, Math.round(tx) % 2 === 0 ? 'pink' : 'yellow');
        addParkStoneBench(tx + 2.4, 196.4);
      }
      addRoadStyleStreetLamp(zone.minX + 9.0, 195.2, 0, 1, true);
      addRoadStyleStreetLamp(zone.maxX - 9.0, 195.2, 0, 1, true);
    }
  });

  // 10D. DENSE VIETNAMESE STREETSCAPE (Shade trees, Bánh Mì/Nước Mía/Trà Đá stalls, Bus Stops, ATMs,
  //      Alley Lantern Strings, Park Fountains & Children's Playgrounds across all 10 roads & 101 alleys!)
  const streetscape = buildWestResidentialStreetscape(staticGroup, sharedPalette, {
    lanternGlowMat,
    warmPoolMat,
    lampPoolGeo,
  });

  // Warm interior & strategic neighborhood street lights (kept bounded for high FPS)
  const addAreaPointLight = (x: number, y: number, z: number, color: number, dayInt: number, nightInt: number, dist = 26) => {
    const pt = new THREE.PointLight(color, dayInt, dist, 1.38);
    pt.position.set(x, y, z);
    scaledLights.push({ light: pt, dayInt, nightInt, getScale: () => 1 });
  };
  addAreaPointLight(h1Cx, 3.25, -2.5, 0xfef3c7, 0.9, 1.55, 20);
  addAreaPointLight(h4Cx, 3.25, -2.5, 0xffedd5, 0.9, 1.55, 20);
  addAreaPointLight(-469.0, 3.25, -2.5, 0xfef3c7, 0.85, 1.55, 24);
  addAreaPointLight(-578.4, 3.25, -2.5, 0xfef3c7, 0.85, 1.55, 24);
  addAreaPointLight(-439.0, 3.25, 62.0, 0xffedd5, 0.85, 1.55, 24);
  addAreaPointLight(-578.4, 3.25, 62.0, 0xffedd5, 0.85, 1.55, 24);
  addAreaPointLight(-303.5, 3.5, -36.0, 0xfef3c7, 0.7, 1.65, 28); // Behind Cyber Stadium / Ốc Đêm
  addAreaPointLight(-260.6, 3.5, -36.0, 0xdbeafe, 0.7, 1.65, 28); // Cafe Bi-a Sau Bệnh Viện
  addAreaPointLight(-491.0, 3.5, -114.0, 0xfef3c7, 0.6, 1.6, 28); // Đường Bắc 3
  addAreaPointLight(-491.0, 3.5, 168.0, 0xffedd5, 0.6, 1.6, 28);  // Đường Nam 2
  addAreaPointLight(alleyCenterX, 4.0, 5.0, 0xfde68a, 0.35, 1.65, 24);
  addAreaPointLight(-485.6, 4.2, 12.0, 0xfde68a, 0.3, 1.75, 28);
  addAreaPointLight(-609.6, 4.2, 12.0, 0xfde68a, 0.3, 1.75, 28);
  addAreaPointLight(-609.6, 4.2, 48.0, 0xfde68a, 0.3, 1.75, 28);
  // Warm night lights for new South Infill Night Markets & Sports Parks along Nam 1 & Nam 2
  addAreaPointLight(-516.5, 4.2, 85.0, 0xfde68a, 0.3, 1.8, 32);  // Công Viên Thể Thao Tổ 6
  addAreaPointLight(-578.5, 4.0, 84.0, 0xffedd5, 0.4, 1.9, 32);  // Chợ Đêm Nam Tây
  addAreaPointLight(-702.0, 4.2, 85.0, 0xfde68a, 0.3, 1.8, 32);  // Quảng Trường Tổ 6
  addAreaPointLight(-826.0, 4.0, 84.0, 0xffedd5, 0.4, 1.9, 32);  // Chợ Đêm Tây Nam
  // Warm interior market hall lights for Chợ Bắc Tây & Chợ Nam Tây (automatically dim/turn off 18:00 - 07:00)
  marketLightAnchors.forEach((ml) => {
    const pt = new THREE.PointLight(ml.color, 0.65, 34, 1.5);
    pt.position.set(ml.x, ml.y, ml.z);
    scaledLights.push({
      light: pt,
      dayInt: 0.65,
      nightInt: 2.2,
      getScale: () => Math.max(0, 1 - marketsClosedFactor),
    });
  });

  // =========================================================================
  // 11. NEIGHBORHOOD NPCS: SHOPKEEPERS, RESIDENTS AT HOME, BENCH SITTERS & ALLEY/STREET WALKERS
  // =========================================================================
  const npcs: ResidentNpcAgent[] = [];
  const spawnNpc = (
    role: ResidentNpcAgent['role'],
    x: number,
    y: number,
    z: number,
    yaw: number,
    phase: number,
    seed: number,
    opts?: {
      isStudent?: boolean;
      speed?: number;
      waypoints?: Array<{ x: number; z: number }>;
      startDistFrac?: number;
      marketId?: 'market_north' | 'market_south';
    }
  ) => {
    const agent = createResidentNpcRig(role, x, y, z, yaw, phase, seed, opts);
    dynamicGroup.add(agent.grp);
    npcs.push(agent);
  };

  // Legacy 8 shopkeepers
  spawnNpc('vendor', h1Cx, 0.04, -11.4, 0, 0.3, 101);
  spawnNpc('vendor', -403.0, 0.04, -2.2, Math.PI / 2, 1.1, 102);
  spawnNpc('vendor', -429.2, 0.04, -9.2, 0, 0.6, 103);
  spawnNpc('vendor', -470.5, 0.04, -2.2, Math.PI / 2, 1.4, 104);
  spawnNpc('vendor', -580.0, 0.04, -2.2, Math.PI / 2, 0.8, 107);
  spawnNpc('vendor', -437.5, 0.04, 61.5, -Math.PI / 2, 0.9, 105);
  spawnNpc('vendor', -480.0, 0.04, 61.5, Math.PI / 2, 1.7, 106);
  spawnNpc('vendor', -576.6, 0.04, 61.0, -Math.PI / 2, 1.2, 108);

  // 14 Walkable Shop Vendors (each standing neatly inside their central aisle)
  WEST_WALKABLE_SHOPS.filter((s) => !s.isLegacyCustom).forEach((s, idx) => {
    spawnNpc('vendor', s.cx, 0.04, s.cz + (s.facingNorth ? 4.2 : -4.2), s.facingNorth ? Math.PI : 0, idx * 0.6 + 0.4, 160 + idx);
  });

  // Traditional Market Vendors & Food Court Diners inside Chợ Bắc Tây & Chợ Nam Tây (active 07:00 - 18:00)
  marketNpcSeeds.forEach((seed, idx) => {
    spawnNpc(seed.role, seed.x, 0.1, seed.z, seed.yaw, idx * 0.55 + 0.2, 620 + idx, {
      marketId: seed.marketId,
    });
  });

  // Seated Residents at Nhà Văn Hóa Tổ 4, Sân Cầu Lông Tổ 5, Night Markets & Neighborhood Parks (all aligned + -0.20m Sit pullback!)
  const seatedSpots: Array<{ x: number; y?: number; z: number; yaw: number }> = [
    { x: -374.12, z: -29.8, yaw: Math.PI / 2 },  // Chess at Nhà Văn Hóa Tổ 4
    { x: -368.08, z: -29.8, yaw: -Math.PI / 2 },
    { x: -365.28, z: -71.5, yaw: -Math.PI / 2 }, // Watching at Sân Cầu Lông Tổ 5
    // Công Viên Bắc Tổ 7 stone benches (Z = -115.0)
    { x: -389.0, z: -115.2, yaw: 0 },
    { x: -379.0, z: -115.2, yaw: 0 },
    { x: -369.0, z: -114.8, yaw: Math.PI },
    // New South Infill Parks, Gazebos (y=0.26) & Night Market dining tables
    { x: -507.1, y: 0.26, z: 81.65, yaw: 0 },      // Gazebo in Công Viên Thể Thao Tổ 6 (Bay 1)
    { x: -507.1, y: 0.26, z: 85.15, yaw: Math.PI },
    { x: -527.3, z: 90.2, yaw: 0 },                // Exact Park bench Bay 1
    { x: -592.4, z: 85.25, yaw: 0 },               // Night Market Bay 2 diners (exact stool centers - 0.20m)
    { x: -574.0, z: 87.55, yaw: Math.PI },
    { x: -566.0, z: 85.25, yaw: 0 },
    { x: -693.1, y: 0.26, z: 81.65, yaw: 0 },      // Gazebo Bay 4
    { x: -712.9, z: 90.2, yaw: 0 },                // Exact Park bench Bay 4
    { x: -831.1, z: 85.25, yaw: 0 },               // Night Market Bay 6 diners
    { x: -821.54, z: 87.55, yaw: Math.PI },
    { x: -947.0, y: 0.26, z: 81.65, yaw: 0 },      // Southwest Corner Park Gazebo Bay 8
    // Linear Parks Tổ 6 along Nam 2 (exact bench X centers in Bays 1, 3, 5, 7)
    { x: -500.5, z: 143.4, yaw: 0 },
    { x: -624.7, z: 143.4, yaw: 0 },
    { x: -748.1, z: 143.4, yaw: 0 },
    { x: -872.1, z: 143.4, yaw: 0 },
    // Far-South Linear Park benches (Z = 355.4, facing North Math.PI -> +0.20m pullback to 355.6)
    { x: -900.0, z: 355.6, yaw: Math.PI },
    { x: -724.0, z: 355.6, yaw: Math.PI },
    { x: -504.0, z: 355.6, yaw: Math.PI },
    { x: -240.0, z: 355.6, yaw: Math.PI },
    { x: -64.0, z: 355.6, yaw: Math.PI },
    { x: 68.0, z: 355.6, yaw: Math.PI },
  ];
  seatedSpots.forEach((spot, idx) => {
    spawnNpc('seated', spot.x, spot.y ?? 0.04, spot.z, spot.yaw, idx * 0.53 + 0.4, 210 + idx);
  });

  // Residents at Home, Night Market Vendors, Badminton/Fitness Park Neighbors & Balcony Residents
  const homeResidentSpots: Array<{ x: number; y?: number; z: number; yaw: number; isStudent?: boolean }> = [
    // Row N1 front yards & porches (Z = 7.4..12.6)
    { x: -376.4, z: 8.2, yaw: 0.2 },
    { x: -375.2, z: 8.8, yaw: -2.5 },
    { x: -386.2, z: 9.0, yaw: 0.0, isStudent: true },
    { x: -409.5, z: 8.4, yaw: 0.3 },
    { x: -418.2, z: 10.6, yaw: -0.4 },
    { x: -439.5, z: 8.6, yaw: 0.1 },
    { x: -459.0, z: 8.8, yaw: -0.2 },
    { x: -516.5, z: 9.2, yaw: 0.25 },
    { x: -567.0, z: 8.9, yaw: -0.15 },
    { x: -642.0, z: 9.2, yaw: 0.1 },
    { x: -702.0, z: 9.4, yaw: -0.3 },
    { x: -764.0, z: 9.2, yaw: 0.2 },
    { x: -826.0, z: 9.2, yaw: 0.0 },
    { x: -888.0, z: 9.2, yaw: -0.25 },
    // Row N2/N3/N4 yards & community spaces
    { x: -302.0, z: -28.6, yaw: 0.0 },
    { x: -372.5, z: -34.2, yaw: 0.3 },
    { x: -474.0, z: -28.8, yaw: 0.0 },
    { x: -618.0, z: -28.8, yaw: -0.2 },
    { x: -754.0, z: -28.8, yaw: 0.2 },
    { x: -876.0, z: -28.8, yaw: 0.1 },
    { x: -480.0, z: -66.8, yaw: 0.0 },
    { x: -698.0, z: -66.8, yaw: 0.3 },
    { x: -862.0, z: -66.8, yaw: -0.2 },
    { x: -492.0, z: -104.8, yaw: 0.0 },
    { x: -664.0, z: -104.8, yaw: 0.2 },
    { x: -838.0, z: -104.8, yaw: -0.1 },
    // Row S1/S2/S3 front yards facing North
    { x: -440.5, z: 47.4, yaw: Math.PI - 0.2 },
    { x: -460.0, z: 47.4, yaw: Math.PI + 0.15 },
    { x: -503.0, z: 47.4, yaw: Math.PI },
    { x: -566.8, z: 47.4, yaw: Math.PI - 0.1 },
    { x: -644.0, z: 47.4, yaw: Math.PI + 0.2 },
    { x: -764.0, z: 47.4, yaw: Math.PI },
    { x: -886.0, z: 47.4, yaw: Math.PI - 0.2 },
    { x: -494.0, z: 105.0, yaw: Math.PI },
    { x: -686.0, z: 105.0, yaw: Math.PI + 0.2 },
    { x: -878.0, z: 105.0, yaw: Math.PI - 0.2 },
    { x: -389.0, z: 159.2, yaw: Math.PI, isStudent: true },
    { x: -582.0, z: 159.2, yaw: Math.PI },
    { x: -760.0, z: 159.2, yaw: Math.PI + 0.15 },
    // NEW: Nam 1 & Nam 2 Infill Storefront Patios, Night Market Vendors & Sports Park Visitors!
    { x: -442.0, z: 91.0, yaw: 0.1 },    // Infill townhouses Nam 1 Bay 0
    { x: -465.0, z: 91.0, yaw: -0.2 },
    { x: -531.0, z: 83.2, yaw: Math.PI / 2, isStudent: true }, // Badminton player Bay 1
    { x: -526.0, z: 83.2, yaw: -Math.PI / 2, isStudent: true },
    { x: -498.0, z: 84.5, yaw: 0.0 },    // Fitness park Bay 1
    { x: -592.0, z: 80.2, yaw: 0.0 },    // Night Market Bay 2 vendors
    { x: -583.0, z: 80.2, yaw: 0.1 },
    { x: -574.0, z: 80.2, yaw: -0.1 },
    { x: -565.0, z: 80.2, yaw: 0.0 },
    { x: -635.0, z: 91.0, yaw: 0.2 },    // Infill townhouses Nam 1 Bay 3
    { x: -716.0, z: 83.2, yaw: Math.PI / 2 }, // Badminton Bay 4
    { x: -764.0, z: 91.0, yaw: -0.1 },   // Infill townhouses Nam 1 Bay 5
    { x: -835.0, z: 80.2, yaw: 0.0 },    // Night Market Bay 6 vendors
    { x: -817.0, z: 80.2, yaw: 0.1 },
    { x: -888.0, z: 91.0, yaw: 0.0 },    // Infill townhouses Nam 1 Bay 7
    { x: -441.0, z: 146.2, yaw: 0.0 },   // Infill kiosks Nam 2 Bay 0
    { x: -556.0, z: 146.2, yaw: 0.1 },   // Infill kiosks Nam 2 Bay 2
    { x: -686.0, z: 146.2, yaw: -0.1 },  // Infill kiosks Nam 2 Bay 4
    { x: -812.0, z: 146.2, yaw: 0.0 },   // Infill kiosks Nam 2 Bay 6
    // 2nd-Floor Front Balcony Residents overlooking street & alleys (standing flush on raised 2F balcony slab Y = 4.40)
    { x: -376.5, y: 4.42, z: 6.1, yaw: 0.0 },
    { x: -410.4, y: 4.42, z: 6.1, yaw: 0.1 },
    { x: -449.6, y: 4.42, z: 6.1, yaw: -0.1 },
    { x: -527.9, y: 4.42, z: 6.1, yaw: 0.0 },
    { x: -450.2, y: 4.42, z: 51.3, yaw: Math.PI },
    { x: -566.9, y: 4.42, z: 51.3, yaw: Math.PI },
    // South Hospital Residential Quarter (SH1-SH4 front yards, shop patios, balconies & South Park!)
    { x: -198.0, z: 102.2, yaw: 0.1 },        // SH1 facing Đông BV 1
    { x: -160.0, z: 102.2, yaw: -0.15 },
    { x: -123.0, z: 102.2, yaw: 0.05 },
    { x: -286.0, z: 146.4, yaw: 0.1 },        // SH2 West facing Nam 2
    { x: -253.0, z: 146.4, yaw: -0.1 },
    { x: -198.0, z: 114.6, yaw: Math.PI },    // Phở Nam BV front yard
    { x: -160.0, z: 114.6, yaw: Math.PI + 0.1 }, // Cafe 210 front yard
    { x: -123.0, z: 114.6, yaw: Math.PI - 0.1 }, // Bánh Mì 170 front yard
    { x: -284.0, z: 159.0, yaw: Math.PI },    // SH3 West facing Nam 2
    { x: -247.2, z: 159.0, yaw: Math.PI + 0.15 }, // Cơm Tấm 272 front yard
    { x: -198.0, z: 159.0, yaw: Math.PI, isStudent: true }, // Trà Sữa Tổ 10
    { x: -160.0, z: 159.0, yaw: Math.PI - 0.1 }, // Ốc Đêm Nam BV
    { x: -123.0, z: 159.0, yaw: Math.PI },
    { x: -278.2, z: 205.0, yaw: Math.PI + 0.1 }, // Tạp Hóa Tổ 9
    { x: -253.0, z: 205.0, yaw: Math.PI },
    { x: -198.0, z: 205.0, yaw: Math.PI, isStudent: true }, // Bida Nam BV
    { x: -158.0, z: 205.0, yaw: Math.PI - 0.15 },
    { x: -123.0, z: 205.0, yaw: Math.PI },
    // South Park & 2nd-floor balcony residents in South Hospital Quarter + NEW South-Central & Southwest Expansions!
    { x: -264.0, z: 354.5, yaw: Math.PI },
    { x: -174.0, z: 354.5, yaw: Math.PI + 0.15 },
    { x: 24.0, z: 354.5, yaw: Math.PI - 0.1 },
    { x: -560.0, z: 354.5, yaw: Math.PI },
    { x: -198.0, y: 4.42, z: 116.8, yaw: Math.PI },
    { x: -160.0, y: 4.42, z: 161.2, yaw: Math.PI },
    // South-Central Mega-District (SC2..SC6 front yards & patios, X = -100..+92)
    { x: -78.0, z: 114.6, yaw: Math.PI },
    { x: -28.0, z: 114.6, yaw: Math.PI + 0.1 },
    { x: 24.0, z: 114.6, yaw: Math.PI - 0.1 },
    { x: 70.0, z: 114.6, yaw: Math.PI },
    { x: -78.0, z: 159.0, yaw: Math.PI },
    { x: 24.0, z: 159.0, yaw: Math.PI + 0.12, isStudent: true },
    { x: 70.0, z: 159.0, yaw: Math.PI - 0.1 },
    { x: -28.0, z: 205.0, yaw: Math.PI },
    { x: 70.0, z: 205.0, yaw: Math.PI + 0.1 },
    { x: -78.0, z: 251.5, yaw: Math.PI },
    { x: 24.0, z: 251.5, yaw: Math.PI },
    { x: -28.0, z: 301.0, yaw: Math.PI - 0.1 },
    { x: 70.0, z: 301.0, yaw: Math.PI, isStudent: true },
    // SH5 & SH6 front yards
    { x: -280.0, z: 251.5, yaw: Math.PI },
    { x: -160.0, z: 251.5, yaw: Math.PI + 0.1 },
    { x: -280.0, z: 301.0, yaw: Math.PI },
    { x: -160.0, z: 301.0, yaw: Math.PI - 0.1 },
    // Southwest Mega-Expansion (S4..S6 front yards, X = -952..-305)
    { x: -860.0, z: 205.0, yaw: Math.PI },
    { x: -690.0, z: 205.0, yaw: Math.PI + 0.1 },
    { x: -460.0, z: 205.0, yaw: Math.PI },
    { x: -790.0, z: 251.5, yaw: Math.PI - 0.1 },
    { x: -510.0, z: 251.5, yaw: Math.PI, isStudent: true },
    { x: -850.0, z: 301.0, yaw: Math.PI },
    { x: -450.0, z: 301.0, yaw: Math.PI + 0.1 },
  ];
  homeResidentSpots.forEach((spot, idx) => {
    spawnNpc('home_idle', spot.x, spot.y ?? 0.04, spot.z, spot.yaw, idx * 0.71 + 0.2, 310 + idx, {
      isStudent: spot.isStudent,
    });
  });

  // Calmly Walking Residents, Alley Pedestrians & Students (46 total spanning all 56 alleys, 5 inner streets & sidewalks!)
  const walkRoutes: Array<{ isStudent: boolean; speed: number; waypoints: Array<{ x: number; z: number }>; startDistFrac?: number }> = [
    // --- 26 DEDICATED ALLEY WALKERS (hugging alley curb edges a.cx ± 1.85m so motorbikes glide past cleanly!) ---
    { isStudent: true, speed: 1.12, waypoints: [{ x: -391.8, z: -21.0 }, { x: -391.8, z: 16.8 }, { x: -378.0, z: 16.8 }, { x: -378.0, z: 41.2 }, { x: -395.4, z: 41.2 }, { x: -395.4, z: -21.0 }] },
    { isStudent: false, speed: 1.04, waypoints: [{ x: -395.3, z: 16.2 }, { x: -395.3, z: -20.5 }, { x: -438.0, z: -20.5 }, { x: -438.0, z: -58.0 }, { x: -438.0, z: -20.5 }, { x: -395.3, z: -20.5 }] },
    { isStudent: true, speed: 1.14, waypoints: [{ x: -483.8, z: -21.0 }, { x: -483.8, z: 17.5 }, { x: -483.8, z: 41.5 }, { x: -483.8, z: 96.0 }, { x: -487.4, z: 96.0 }, { x: -487.4, z: 41.5 }, { x: -487.4, z: -21.0 }] },
    { isStudent: false, speed: 1.05, waypoints: [{ x: -545.6, z: 16.5 }, { x: -545.6, z: -20.8 }, { x: -506.8, z: -20.8 }, { x: -506.8, z: -58.2 }, { x: -506.8, z: -20.8 }, { x: -549.2, z: -20.8 }, { x: -549.2, z: 16.5 }] },
    { isStudent: true, speed: 1.12, waypoints: [{ x: -607.8, z: -58.5 }, { x: -607.8, z: 17.5 }, { x: -607.8, z: 41.5 }, { x: -607.8, z: 96.5 }, { x: -549.2, z: 96.5 }, { x: -549.2, z: 41.5 }, { x: -549.2, z: -20.8 }, { x: -607.8, z: -20.8 }] },
    { isStudent: false, speed: 1.06, waypoints: [{ x: -669.8, z: 16.6 }, { x: -669.8, z: -20.6 }, { x: -648.0, z: -20.6 }, { x: -648.0, z: -58.4 }, { x: -662.0, z: -58.4 }, { x: -662.0, z: -96.2 }, { x: -662.0, z: -58.4 }, { x: -648.0, z: -58.4 }, { x: -648.0, z: -20.6 }, { x: -669.8, z: -20.6 }] },
    { isStudent: false, speed: 1.08, waypoints: [{ x: -731.2, z: 16.8 }, { x: -731.2, z: -20.6 }, { x: -718.5, z: -20.6 }, { x: -718.5, z: -58.2 }, { x: -718.5, z: -20.6 }, { x: -734.8, z: -20.6 }, { x: -734.8, z: 16.8 }] },
    { isStudent: true, speed: 1.15, waypoints: [{ x: -793.2, z: 16.8 }, { x: -793.2, z: -20.6 }, { x: -780.4, z: -20.6 }, { x: -780.4, z: -58.2 }, { x: -780.4, z: -20.6 }, { x: -796.8, z: -20.6 }, { x: -796.8, z: 16.8 }] },
    { isStudent: false, speed: 1.04, waypoints: [{ x: -855.2, z: 16.8 }, { x: -855.2, z: -20.6 }, { x: -842.4, z: -20.6 }, { x: -842.4, z: -58.2 }, { x: -826.5, z: -58.2 }, { x: -826.5, z: -96.2 }, { x: -826.5, z: -58.2 }, { x: -842.4, z: -58.2 }, { x: -842.4, z: -20.6 }, { x: -855.2, z: -20.6 }] },
    { isStudent: false, speed: 1.05, waypoints: [{ x: -917.2, z: 16.8 }, { x: -917.2, z: -20.6 }, { x: -904.4, z: -20.6 }, { x: -904.4, z: -58.2 }, { x: -896.4, z: -58.2 }, { x: -896.4, z: -96.2 }, { x: -896.4, z: -58.2 }, { x: -904.4, z: -58.2 }, { x: -904.4, z: -20.6 }, { x: -917.2, z: -20.6 }] },
    // Behind Cyber Stadium & Hospital Food Hub alleys (Hẻm 285, 325, 285/12, 325/9)
    { isStudent: false, speed: 1.04, waypoints: [{ x: -234.0, z: -20.6 }, { x: -323.4, z: -20.6 }, { x: -323.4, z: -58.4 }, { x: -234.0, z: -58.4 }, { x: -280.4, z: -58.4 }, { x: -280.4, z: -20.6 }] },
    { isStudent: true, speed: 1.12, waypoints: [{ x: -268.4, z: -58.5 }, { x: -268.4, z: -96.2 }, { x: -334.4, z: -96.2 }, { x: -334.4, z: -58.5 }] },
    // Deep North N3 & N4 alleys (Hẻm 425/18, 545/15, 425/24, 545/22, 605/19, 725/20, 785/24, 905/28)
    { isStudent: false, speed: 1.02, waypoints: [{ x: -404.0, z: -58.5 }, { x: -404.0, z: -96.4 }, { x: -446.4, z: -96.4 }, { x: -446.4, z: -130.5 }, { x: -446.4, z: -96.4 }, { x: -404.0, z: -96.4 }] },
    { isStudent: false, speed: 1.05, waypoints: [{ x: -550.0, z: -58.5 }, { x: -550.0, z: -96.4 }, { x: -532.4, z: -96.4 }, { x: -532.4, z: -130.5 }, { x: -532.4, z: -96.4 }, { x: -550.0, z: -96.4 }] },
    { isStudent: true, speed: 1.10, waypoints: [{ x: -614.4, z: -96.4 }, { x: -614.4, z: -130.5 }, { x: -706.4, z: -130.5 }, { x: -706.4, z: -96.4 }] },
    { isStudent: false, speed: 1.04, waypoints: [{ x: -790.4, z: -96.4 }, { x: -790.4, z: -130.5 }, { x: -882.4, z: -130.5 }, { x: -882.4, z: -96.4 }] },
    // South S1 alleys (Hẻm 426, 490, 550, 610, 670, 730, 790, 850)
    { isStudent: false, speed: 1.06, waypoints: [{ x: -483.8, z: 40.6 }, { x: -483.8, z: 96.4 }, { x: -458.0, z: 96.4 }, { x: -458.0, z: 150.4 }, { x: -458.0, z: 96.4 }, { x: -483.8, z: 96.4 }] },
    { isStudent: true, speed: 1.12, waypoints: [{ x: -545.6, z: 40.6 }, { x: -545.6, z: 96.4 }, { x: -522.0, z: 96.4 }, { x: -522.0, z: 150.4 }, { x: -522.0, z: 96.4 }, { x: -545.6, z: 96.4 }] },
    { isStudent: false, speed: 1.05, waypoints: [{ x: -669.8, z: 40.6 }, { x: -669.8, z: 96.4 }, { x: -652.0, z: 96.4 }, { x: -652.0, z: 150.4 }, { x: -652.0, z: 96.4 }, { x: -669.8, z: 96.4 }] },
    { isStudent: false, speed: 1.07, waypoints: [{ x: -731.2, z: 40.6 }, { x: -731.2, z: 96.4 }, { x: -718.5, z: 96.4 }, { x: -718.5, z: 150.4 }, { x: -718.5, z: 96.4 }, { x: -731.2, z: 96.4 }] },
    { isStudent: true, speed: 1.13, waypoints: [{ x: -793.2, z: 40.6 }, { x: -793.2, z: 96.4 }, { x: -780.4, z: 96.4 }, { x: -780.4, z: 150.4 }, { x: -780.4, z: 96.4 }, { x: -793.2, z: 96.4 }] },
    { isStudent: false, speed: 1.04, waypoints: [{ x: -855.2, z: 40.6 }, { x: -855.2, z: 96.4 }, { x: -842.4, z: 96.4 }, { x: -842.4, z: 150.4 }, { x: -842.4, z: 96.4 }, { x: -855.2, z: 96.4 }] },
    { isStudent: false, speed: 1.06, waypoints: [{ x: -917.2, z: 40.6 }, { x: -917.2, z: 96.4 }, { x: -904.4, z: 96.4 }, { x: -904.4, z: 150.4 }, { x: -904.4, z: 96.4 }, { x: -917.2, z: 96.4 }] },
    // South S3 alleys (including Hẻm 350/2 behind THPT PCT!)
    { isStudent: true, speed: 1.14, waypoints: [{ x: -353.4, z: 150.5 }, { x: -353.4, z: 192.0 }, { x: -446.4, z: 192.0 }, { x: -446.4, z: 150.5 }] },
    { isStudent: false, speed: 1.05, waypoints: [{ x: -532.4, z: 150.5 }, { x: -532.4, z: 192.0 }, { x: -614.4, z: 192.0 }, { x: -614.4, z: 150.5 }] },
    { isStudent: false, speed: 1.06, waypoints: [{ x: -706.4, z: 150.5 }, { x: -706.4, z: 192.0 }, { x: -882.4, z: 192.0 }, { x: -882.4, z: 150.5 }] },

    // --- 20 SIDEWALK & INTERNAL NEIGHBORHOOD ROAD WALKERS (hugging road curbs so motorbikes pass cleanly!) ---
    { isStudent: false, speed: 1.08, startDistFrac: 0.05, waypoints: [{ x: -945.0, z: 16.8 }, { x: -366.0, z: 16.8 }, { x: -366.0, z: 15.2 }, { x: -945.0, z: 15.2 }] },
    { isStudent: true, speed: 1.16, startDistFrac: 0.42, waypoints: [{ x: -945.0, z: 16.8 }, { x: -366.0, z: 16.8 }, { x: -366.0, z: 15.2 }, { x: -945.0, z: 15.2 }] },
    { isStudent: false, speed: 1.04, startDistFrac: 0.74, waypoints: [{ x: -945.0, z: 16.8 }, { x: -366.0, z: 16.8 }, { x: -366.0, z: 15.2 }, { x: -945.0, z: 15.2 }] },
    { isStudent: false, speed: 1.06, startDistFrac: 0.12, waypoints: [{ x: -945.0, z: 40.8 }, { x: -436.0, z: 40.8 }, { x: -436.0, z: 42.4 }, { x: -945.0, z: 42.4 }] },
    { isStudent: true, speed: 1.14, startDistFrac: 0.56, waypoints: [{ x: -945.0, z: 40.8 }, { x: -436.0, z: 40.8 }, { x: -436.0, z: 42.4 }, { x: -945.0, z: 42.4 }] },
    { isStudent: false, speed: 1.02, startDistFrac: 0.85, waypoints: [{ x: -945.0, z: 40.8 }, { x: -436.0, z: 40.8 }, { x: -436.0, z: 42.4 }, { x: -945.0, z: 42.4 }] },
    // Bắc 1 road curbs (Z = -18.8 & -25.2)
    { isStudent: false, speed: 1.08, startDistFrac: 0.1, waypoints: [{ x: -944.0, z: -18.8 }, { x: -246.0, z: -18.8 }, { x: -246.0, z: -25.2 }, { x: -944.0, z: -25.2 }] },
    { isStudent: true, speed: 1.14, startDistFrac: 0.45, waypoints: [{ x: -944.0, z: -18.8 }, { x: -246.0, z: -18.8 }, { x: -246.0, z: -25.2 }, { x: -944.0, z: -25.2 }] },
    { isStudent: false, speed: 1.05, startDistFrac: 0.78, waypoints: [{ x: -944.0, z: -18.8 }, { x: -246.0, z: -18.8 }, { x: -246.0, z: -25.2 }, { x: -944.0, z: -25.2 }] },
    // Bắc 2 road curbs (Z = -56.8 & -63.2)
    { isStudent: false, speed: 1.06, startDistFrac: 0.15, waypoints: [{ x: -944.0, z: -56.8 }, { x: -246.0, z: -56.8 }, { x: -246.0, z: -63.2 }, { x: -944.0, z: -63.2 }] },
    { isStudent: true, speed: 1.12, startDistFrac: 0.52, waypoints: [{ x: -944.0, z: -56.8 }, { x: -246.0, z: -56.8 }, { x: -246.0, z: -63.2 }, { x: -944.0, z: -63.2 }] },
    { isStudent: false, speed: 1.04, startDistFrac: 0.84, waypoints: [{ x: -944.0, z: -56.8 }, { x: -246.0, z: -56.8 }, { x: -246.0, z: -63.2 }, { x: -944.0, z: -63.2 }] },
    // Bắc 3 road curbs (Z = -94.8 & -101.2)
    { isStudent: false, speed: 1.05, startDistFrac: 0.2, waypoints: [{ x: -944.0, z: -94.8 }, { x: -248.0, z: -94.8 }, { x: -248.0, z: -101.2 }, { x: -944.0, z: -101.2 }] },
    { isStudent: true, speed: 1.11, startDistFrac: 0.65, waypoints: [{ x: -944.0, z: -94.8 }, { x: -248.0, z: -94.8 }, { x: -248.0, z: -101.2 }, { x: -944.0, z: -101.2 }] },
    // Nam 1 road curbs (Z = 94.8 & 101.2, turning neatly at the new Ngã 3 West curb)
    { isStudent: false, speed: 1.06, startDistFrac: 0.18, waypoints: [{ x: -944.0, z: 94.8 }, { x: -436.0, z: 94.8 }, { x: -436.0, z: 101.2 }, { x: -944.0, z: 101.2 }] },
    { isStudent: true, speed: 1.14, startDistFrac: 0.62, waypoints: [{ x: -944.0, z: 94.8 }, { x: -436.0, z: 94.8 }, { x: -436.0, z: 101.2 }, { x: -944.0, z: 101.2 }] },
    // Nam 2 road curbs (Z = 148.8 & 155.2, extending behind THPT PCT!)
    { isStudent: true, speed: 1.15, startDistFrac: 0.12, waypoints: [{ x: -944.0, z: 148.8 }, { x: -312.0, z: 148.8 }, { x: -312.0, z: 155.2 }, { x: -944.0, z: 155.2 }] },
    { isStudent: false, speed: 1.05, startDistFrac: 0.48, waypoints: [{ x: -944.0, z: 148.8 }, { x: -312.0, z: 148.8 }, { x: -312.0, z: 155.2 }, { x: -944.0, z: 155.2 }] },
    { isStudent: false, speed: 1.03, startDistFrac: 0.82, waypoints: [{ x: -944.0, z: 148.8 }, { x: -312.0, z: 148.8 }, { x: -312.0, z: 155.2 }, { x: -944.0, z: 155.2 }] },
    // Công Viên Tổ 7 & Sân Cầu Lông stroll
    { isStudent: false, speed: 0.98, startDistFrac: 0.3, waypoints: [{ x: -391.0, z: -106.0 }, { x: -366.0, z: -106.0 }, { x: -366.0, z: -128.0 }, { x: -391.0, z: -128.0 }] },
    // --- 10 SOUTH HOSPITAL RESIDENTIAL QUARTER ALLEY, STREET & PARK WALKERS (SH1–SH4) ---
    { isStudent: false, speed: 1.05, startDistFrac: 0.1, waypoints: [{ x: -270.8, z: 136.5 }, { x: -270.8, z: 196.5 }, { x: -267.2, z: 196.5 }, { x: -267.2, z: 136.5 }] },
    { isStudent: true, speed: 1.12, startDistFrac: 0.45, waypoints: [{ x: -270.8, z: 195.0 }, { x: -270.8, z: 242.0 }, { x: -267.2, z: 242.0 }, { x: -267.2, z: 195.0 }] },
    { isStudent: false, speed: 1.06, startDistFrac: 0.2, waypoints: [{ x: -180.8, z: 90.0 }, { x: -180.8, z: 150.0 }, { x: -177.2, z: 150.0 }, { x: -177.2, z: 90.0 }] },
    { isStudent: true, speed: 1.14, startDistFrac: 0.55, waypoints: [{ x: -142.8, z: 90.0 }, { x: -142.8, z: 150.0 }, { x: -139.2, z: 150.0 }, { x: -139.2, z: 90.0 }] },
    { isStudent: false, speed: 1.04, startDistFrac: 0.3, waypoints: [{ x: -180.8, z: 154.0 }, { x: -180.8, z: 242.0 }, { x: -177.2, z: 242.0 }, { x: -177.2, z: 154.0 }] },
    { isStudent: false, speed: 1.08, startDistFrac: 0.68, waypoints: [{ x: -142.8, z: 154.0 }, { x: -142.8, z: 242.0 }, { x: -139.2, z: 242.0 }, { x: -139.2, z: 154.0 }] },
    { isStudent: false, speed: 1.05, startDistFrac: 0.15, waypoints: [{ x: -212.0, z: 104.8 }, { x: -109.0, z: 104.8 }, { x: -109.0, z: 111.2 }, { x: -212.0, z: 111.2 }] },
    { isStudent: true, speed: 1.13, startDistFrac: 0.5, waypoints: [{ x: -212.0, z: 148.8 }, { x: -109.0, z: 148.8 }, { x: -109.0, z: 155.2 }, { x: -212.0, z: 155.2 }] },
    { isStudent: false, speed: 1.03, startDistFrac: 0.25, waypoints: [{ x: -212.0, z: 194.8 }, { x: -109.0, z: 194.8 }, { x: -109.0, z: 201.2 }, { x: -212.0, z: 201.2 }] },
    { isStudent: false, speed: 0.98, startDistFrac: 0.4, waypoints: [{ x: -296.0, z: 354.0 }, { x: -140.0, z: 354.0 }, { x: -140.0, z: 356.2 }, { x: -296.0, z: 356.2 }] },
    // --- 14 NEW WALKERS ACROSS SOUTH-CENTRAL (-100..+96), SH5/SH6 & SOUTHWEST EXPANSION (S4/S5/S6)! ---
    { isStudent: false, speed: 1.06, startDistFrac: 0.12, waypoints: [{ x: -54.8, z: 110.0 }, { x: -54.8, z: 196.0 }, { x: -51.2, z: 196.0 }, { x: -51.2, z: 110.0 }] },
    { isStudent: true, speed: 1.13, startDistFrac: 0.48, waypoints: [{ x: 45.2, z: 110.0 }, { x: 45.2, z: 196.0 }, { x: 48.8, z: 196.0 }, { x: 48.8, z: 110.0 }] },
    { isStudent: false, speed: 1.05, startDistFrac: 0.22, waypoints: [{ x: -54.8, z: 200.0 }, { x: -54.8, z: 338.0 }, { x: -51.2, z: 338.0 }, { x: -51.2, z: 200.0 }] },
    { isStudent: true, speed: 1.11, startDistFrac: 0.65, waypoints: [{ x: 45.2, z: 200.0 }, { x: 45.2, z: 338.0 }, { x: 48.8, z: 338.0 }, { x: 48.8, z: 200.0 }] },
    { isStudent: false, speed: 1.07, startDistFrac: 0.15, waypoints: [{ x: -98.0, z: 148.8 }, { x: 90.0, z: 148.8 }, { x: 90.0, z: 155.2 }, { x: -98.0, z: 155.2 }] },
    { isStudent: false, speed: 1.04, startDistFrac: 0.4, waypoints: [{ x: -98.0, z: 240.8 }, { x: 90.0, z: 240.8 }, { x: 90.0, z: 247.2 }, { x: -98.0, z: 247.2 }] },
    { isStudent: true, speed: 1.12, startDistFrac: 0.7, waypoints: [{ x: -98.0, z: 337.2 }, { x: 90.0, z: 337.2 }, { x: 90.0, z: 350.8 }, { x: -98.0, z: 350.8 }] },
    { isStudent: false, speed: 1.04, startDistFrac: 0.3, waypoints: [{ x: -180.8, z: 246.0 }, { x: -180.8, z: 338.0 }, { x: -177.2, z: 338.0 }, { x: -177.2, z: 246.0 }] },
    { isStudent: false, speed: 1.05, startDistFrac: 0.18, waypoints: [{ x: -270.8, z: 246.0 }, { x: -270.8, z: 338.0 }, { x: -267.2, z: 338.0 }, { x: -267.2, z: 246.0 }] },
    { isStudent: false, speed: 1.06, startDistFrac: 0.1, waypoints: [{ x: -948.0, z: 240.8 }, { x: -308.0, z: 240.8 }, { x: -308.0, z: 247.2 }, { x: -948.0, z: 247.2 }] },
    { isStudent: true, speed: 1.14, startDistFrac: 0.55, waypoints: [{ x: -948.0, z: 290.8 }, { x: -308.0, z: 290.8 }, { x: -308.0, z: 297.2 }, { x: -948.0, z: 297.2 }] },
    { isStudent: false, speed: 1.05, startDistFrac: 0.35, waypoints: [{ x: -792.8, z: 200.0 }, { x: -792.8, z: 338.0 }, { x: -789.2, z: 338.0 }, { x: -789.2, z: 200.0 }] },
    { isStudent: true, speed: 1.12, startDistFrac: 0.72, waypoints: [{ x: -458.8, z: 200.0 }, { x: -458.8, z: 338.0 }, { x: -455.2, z: 338.0 }, { x: -455.2, z: 200.0 }] },
    { isStudent: false, speed: 1.0, startDistFrac: 0.2, waypoints: [{ x: -920.0, z: 354.2 }, { x: -320.0, z: 354.2 }, { x: -320.0, z: 356.2 }, { x: -920.0, z: 356.2 }] },
  ];

  walkRoutes.forEach((route, idx) => {
    const start = route.waypoints[0];
    spawnNpc('walker', start.x, 0.02, start.z, 0, idx * 1.37 + 0.5, 420 + idx, {
      isStudent: route.isStudent,
      speed: route.speed,
      waypoints: route.waypoints,
      startDistFrac: route.startDistFrac,
    });
  });

  // =========================================================================
  // 11B. ANIMATED NEIGHBORHOOD MOTORBIKE NPCS (41 MOTORBIKES ON INNER ROADS, ALLEYS & WEST BOULEVARD)
  // =========================================================================
  const motoColors = [0xdc2626, 0x2563eb, 0x16a34a, 0x06b6d4, 0xf8fafc, 0x1e293b, 0xf97316, 0xfacc15, 0xe11d48, 0x9333ea, 0x0d9488];
  const helmetColors = [0xf8fafc, 0x18181b, 0xef4444, 0x0284c7, 0x16a34a, 0xfacc15, 0xf472b6, 0x06b6d4];
  const jacketColors = [0x334155, 0x15803d, 0x0e7490, 0x1e293b, 0x9a3412, 0x475569, 0x0369a1, 0x9d174d, 0xb45309];

  const motoRouteSpecs: Array<{ speed: number; startFrac: number; waypoints: Array<{ x: number; z: number }> }> = [
    // --- 14 INNER NEIGHBORHOOD ROAD CRUISERS (Bắc 1/2/3, Nam 1/2 right-hand loops!) ---
    // Đường Nội Khu Bắc 1 (Z = -22, eastbound -20.2, westbound -23.8)
    { speed: 7.4, startFrac: 0.04, waypoints: [{ x: -950, z: -20.2 }, { x: -234, z: -20.2 }, { x: -234, z: -23.8 }, { x: -950, z: -23.8 }] },
    { speed: 7.8, startFrac: 0.29, waypoints: [{ x: -950, z: -20.2 }, { x: -234, z: -20.2 }, { x: -234, z: -23.8 }, { x: -950, z: -23.8 }] },
    { speed: 7.1, startFrac: 0.56, waypoints: [{ x: -950, z: -20.2 }, { x: -234, z: -20.2 }, { x: -234, z: -23.8 }, { x: -950, z: -23.8 }] },
    { speed: 7.6, startFrac: 0.81, waypoints: [{ x: -950, z: -20.2 }, { x: -234, z: -20.2 }, { x: -234, z: -23.8 }, { x: -950, z: -23.8 }] },
    // Đường Nội Khu Bắc 2 (Z = -60, eastbound -58.2, westbound -61.8)
    { speed: 7.3, startFrac: 0.12, waypoints: [{ x: -950, z: -58.2 }, { x: -234, z: -58.2 }, { x: -234, z: -61.8 }, { x: -950, z: -61.8 }] },
    { speed: 7.7, startFrac: 0.48, waypoints: [{ x: -950, z: -58.2 }, { x: -234, z: -58.2 }, { x: -234, z: -61.8 }, { x: -950, z: -61.8 }] },
    { speed: 7.0, startFrac: 0.83, waypoints: [{ x: -950, z: -58.2 }, { x: -234, z: -58.2 }, { x: -234, z: -61.8 }, { x: -950, z: -61.8 }] },
    // Đường Nội Khu Bắc 3 (Z = -98, eastbound -96.2, westbound -99.8, connected to Đại Lộ Bệnh Viện!)
    { speed: 7.2, startFrac: 0.08, waypoints: [{ x: -950, z: -96.2 }, { x: -234, z: -96.2 }, { x: -234, z: -99.8 }, { x: -950, z: -99.8 }] },
    { speed: 7.6, startFrac: 0.44, waypoints: [{ x: -950, z: -96.2 }, { x: -234, z: -96.2 }, { x: -234, z: -99.8 }, { x: -950, z: -99.8 }] },
    { speed: 7.1, startFrac: 0.77, waypoints: [{ x: -950, z: -96.2 }, { x: -234, z: -96.2 }, { x: -234, z: -99.8 }, { x: -950, z: -99.8 }] },
    // Đường Nội Khu Nam 1 (Z = 98) turning smoothly through Ngã 3 Đường Kết Nối Nam Tây (X = -430) <-> Đại Lộ Trung Tâm & Nam 2!
    {
      speed: 7.4,
      startFrac: 0.16,
      waypoints: [
        { x: -950, z: 99.8 },
        { x: -428.2, z: 99.8 },
        { x: -428.2, z: 35.8 },
        { x: -485.6, z: 35.8 },
        { x: -485.6, z: 96.2 },
        { x: -950, z: 96.2 },
      ],
    },
    {
      speed: 7.6,
      startFrac: 0.66,
      waypoints: [
        { x: -950, z: 99.8 },
        { x: -431.8, z: 99.8 },
        { x: -431.8, z: 153.8 },
        { x: -312, z: 153.8 },
        { x: -312, z: 150.2 },
        { x: -428.2, z: 150.2 },
        { x: -428.2, z: 96.2 },
        { x: -950, z: 96.2 },
      ],
    },
    // Đường Nội Khu Nam 2 (Z = 152, eastbound 153.8, westbound 150.2 — passes behind THPT PCT & links via X=-430 to Đại Lộ Trung Tâm!)
    {
      speed: 7.3,
      startFrac: 0.22,
      waypoints: [
        { x: -950, z: 153.8 },
        { x: -312, z: 153.8 },
        { x: -312, z: 150.2 },
        { x: -950, z: 150.2 },
      ],
    },
    {
      speed: 7.5,
      startFrac: 0.71,
      waypoints: [
        { x: -428.2, z: 150.2 },
        { x: -428.2, z: 35.8 },
        { x: -547.4, z: 35.8 },
        { x: -547.4, z: 99.8 },
        { x: -431.8, z: 99.8 },
        { x: -431.8, z: 150.2 },
      ],
    },

    // --- 21 ALLEY-WEAVING MOTORBIKES CRUISING THROUGH ALLEYS ACROSS ALL 7 ROWS (N1–N4, S1–S3) ---
    // Row N1 loops: South out of West alley -> East on North Boulevard (Z=22.1) -> North into East alley -> West on Bắc 1 (Z=-23.6)
    { speed: 6.4, startFrac: 0.10, waypoints: [{ x: -485.6, z: -23.6 }, { x: -485.6, z: 22.1 }, { x: -393.6, z: 22.1 }, { x: -393.6, z: -23.6 }] },
    { speed: 6.6, startFrac: 0.58, waypoints: [{ x: -547.4, z: -23.6 }, { x: -547.4, z: 22.1 }, { x: -485.6, z: 22.1 }, { x: -485.6, z: -23.6 }] },
    { speed: 6.5, startFrac: 0.24, waypoints: [{ x: -671.6, z: -23.6 }, { x: -671.6, z: 22.1 }, { x: -609.6, z: 22.1 }, { x: -609.6, z: -23.6 }] },
    { speed: 6.7, startFrac: 0.72, waypoints: [{ x: -795.0, z: -23.6 }, { x: -795.0, z: 22.1 }, { x: -733.0, z: 22.1 }, { x: -733.0, z: -23.6 }] },
    { speed: 6.5, startFrac: 0.36, waypoints: [{ x: -919.0, z: -23.6 }, { x: -919.0, z: 22.1 }, { x: -857.0, z: 22.1 }, { x: -857.0, z: -23.6 }] },
    // Row N2 loops (connecting Bắc 1 <-> Bắc 2 through N2 alleys, incl. Hẻm 285 & Hẻm 325 behind Cyber!)
    { speed: 6.2, startFrac: 0.15, waypoints: [{ x: -325.0, z: -61.5 }, { x: -325.0, z: -20.4 }, { x: -282.0, z: -20.4 }, { x: -282.0, z: -61.5 }] },
    { speed: 6.3, startFrac: 0.62, waypoints: [{ x: -508.4, z: -61.5 }, { x: -508.4, z: -20.4 }, { x: -439.6, z: -20.4 }, { x: -439.6, z: -61.5 }] },
    { speed: 6.4, startFrac: 0.33, waypoints: [{ x: -649.6, z: -61.5 }, { x: -649.6, z: -20.4 }, { x: -581.6, z: -20.4 }, { x: -581.6, z: -61.5 }] },
    { speed: 6.2, startFrac: 0.81, waypoints: [{ x: -782.0, z: -61.5 }, { x: -782.0, z: -20.4 }, { x: -720.0, z: -20.4 }, { x: -720.0, z: -61.5 }] },
    { speed: 6.4, startFrac: 0.44, waypoints: [{ x: -906.0, z: -61.5 }, { x: -906.0, z: -20.4 }, { x: -844.0, z: -20.4 }, { x: -844.0, z: -61.5 }] },
    // Row N3 loops (connecting Bắc 2 <-> Bắc 3 through N3 alleys)
    { speed: 6.2, startFrac: 0.21, waypoints: [{ x: -336.0, z: -99.5 }, { x: -336.0, z: -58.4 }, { x: -270.0, z: -58.4 }, { x: -270.0, z: -99.5 }] },
    { speed: 6.3, startFrac: 0.67, waypoints: [{ x: -551.6, z: -99.5 }, { x: -551.6, z: -58.4 }, { x: -405.6, z: -58.4 }, { x: -405.6, z: -99.5 }] },
    { speed: 6.2, startFrac: 0.14, waypoints: [{ x: -748.0, z: -99.5 }, { x: -748.0, z: -58.4 }, { x: -663.6, z: -58.4 }, { x: -663.6, z: -99.5 }] },
    { speed: 6.3, startFrac: 0.54, waypoints: [{ x: -898.0, z: -99.5 }, { x: -898.0, z: -58.4 }, { x: -828.0, z: -58.4 }, { x: -828.0, z: -99.5 }] },
    // Row N4 loops (connecting Bắc 3 <-> Far-North N4 rear lane Z=-131.6)
    { speed: 5.8, startFrac: 0.28, waypoints: [{ x: -534.0, z: -131.6 }, { x: -534.0, z: -96.5 }, { x: -448.0, z: -96.5 }, { x: -448.0, z: -131.6 }] },
    { speed: 5.9, startFrac: 0.74, waypoints: [{ x: -792.0, z: -131.6 }, { x: -792.0, z: -96.5 }, { x: -616.0, z: -96.5 }, { x: -616.0, z: -131.6 }] },
    // Row S1 loops: North out of East alley -> West on South Boulevard (Z=35.9) -> South into West alley -> East on Nam 1 (Z=99.6)
    { speed: 6.5, startFrac: 0.18, waypoints: [{ x: -485.6, z: 99.6 }, { x: -485.6, z: 35.9 }, { x: -547.4, z: 35.9 }, { x: -547.4, z: 99.6 }] },
    { speed: 6.6, startFrac: 0.64, waypoints: [{ x: -609.6, z: 99.6 }, { x: -609.6, z: 35.9 }, { x: -733.0, z: 35.9 }, { x: -733.0, z: 99.6 }] },
    { speed: 6.5, startFrac: 0.39, waypoints: [{ x: -795.0, z: 99.6 }, { x: -795.0, z: 35.9 }, { x: -919.0, z: 35.9 }, { x: -919.0, z: 99.6 }] },
    // Row S2 & S3 loops (Nam 1 <-> Nam 2 <-> Vườn Hoa Tổ 8 Z=191.5, incl. Hẻm 350/2 behind School!)
    { speed: 6.3, startFrac: 0.25, waypoints: [{ x: -459.6, z: 153.5 }, { x: -459.6, z: 96.5 }, { x: -589.6, z: 96.5 }, { x: -589.6, z: 153.5 }] },
    { speed: 6.2, startFrac: 0.51, waypoints: [{ x: -720.0, z: 153.5 }, { x: -720.0, z: 96.5 }, { x: -844.0, z: 96.5 }, { x: -844.0, z: 153.5 }] },
    { speed: 6.1, startFrac: 0.12, waypoints: [{ x: -355.0, z: 191.5 }, { x: -355.0, z: 150.5 }, { x: -448.0, z: 150.5 }, { x: -448.0, z: 191.5 }] },
    { speed: 6.1, startFrac: 0.69, waypoints: [{ x: -616.0, z: 191.5 }, { x: -616.0, z: 150.5 }, { x: -792.0, z: 150.5 }, { x: -792.0, z: 191.5 }] },

    // --- 6 FAR-WEST BOULEVARD MOTORBIKE CRUISERS (-952..-245) ---
    { speed: 8.6, startFrac: 0.05, waypoints: [{ x: -952, z: 23.6 }, { x: -245, z: 23.6 }, { x: -245, z: 34.4 }, { x: -952, z: 34.4 }] },
    { speed: 9.1, startFrac: 0.22, waypoints: [{ x: -952, z: 21.5 }, { x: -245, z: 21.5 }, { x: -245, z: 36.4 }, { x: -952, z: 36.4 }] },
    { speed: 8.8, startFrac: 0.39, waypoints: [{ x: -952, z: 23.6 }, { x: -245, z: 23.6 }, { x: -245, z: 34.4 }, { x: -952, z: 34.4 }] },
    { speed: 9.3, startFrac: 0.56, waypoints: [{ x: -952, z: 21.5 }, { x: -245, z: 21.5 }, { x: -245, z: 36.4 }, { x: -952, z: 36.4 }] },
    { speed: 8.5, startFrac: 0.73, waypoints: [{ x: -952, z: 23.6 }, { x: -245, z: 23.6 }, { x: -245, z: 34.4 }, { x: -952, z: 34.4 }] },
    { speed: 9.0, startFrac: 0.89, waypoints: [{ x: -952, z: 21.5 }, { x: -245, z: 21.5 }, { x: -245, z: 36.4 }, { x: -952, z: 36.4 }] },

    // --- 12 SOUTH HOSPITAL RESIDENTIAL QUARTER MOTORBIKES (INNER ROADS, CROSS-AVENUE & 11 NEW ALLEYS!) ---
    // Cross-avenue Nam 2 (Z=152) <-> East Connector (-104) <-> Nam 3 (Z=198) <-> West Connector (-301)
    { speed: 7.4, startFrac: 0.08, waypoints: [{ x: -302.8, z: 153.8 }, { x: -102.2, z: 153.8 }, { x: -102.2, z: 196.2 }, { x: -302.8, z: 196.2 }] },
    { speed: 7.6, startFrac: 0.52, waypoints: [{ x: -302.8, z: 153.8 }, { x: -102.2, z: 153.8 }, { x: -102.2, z: 196.2 }, { x: -302.8, z: 196.2 }] },
    // Cross-avenue Nam 3 (Z=198) <-> East Connector (-104) <-> Nam 4 (Z=244) <-> West Connector (-301)
    { speed: 7.3, startFrac: 0.18, waypoints: [{ x: -302.8, z: 199.8 }, { x: -102.2, z: 199.8 }, { x: -102.2, z: 242.2 }, { x: -302.8, z: 242.2 }] },
    { speed: 7.5, startFrac: 0.66, waypoints: [{ x: -302.8, z: 199.8 }, { x: -102.2, z: 199.8 }, { x: -102.2, z: 242.2 }, { x: -302.8, z: 242.2 }] },
    // Đông BV 1 (Z=108) <-> East Connector (-104) <-> Nam 2 (Z=152) <-> Hẻm 210 (-179)
    { speed: 6.8, startFrac: 0.12, waypoints: [{ x: -222.0, z: 109.8 }, { x: -102.2, z: 109.8 }, { x: -102.2, z: 150.2 }, { x: -222.0, z: 150.2 }] },
    { speed: 6.5, startFrac: 0.44, waypoints: [{ x: -179.0, z: 109.8 }, { x: -141.0, z: 109.8 }, { x: -141.0, z: 150.2 }, { x: -179.0, z: 150.2 }] },
    // Alley-weaving through Hẻm 210/8 (-179) & Hẻm 170/12 (-141) between Nam 2 & Nam 3
    { speed: 6.3, startFrac: 0.24, waypoints: [{ x: -179.0, z: 153.8 }, { x: -141.0, z: 153.8 }, { x: -141.0, z: 196.2 }, { x: -179.0, z: 196.2 }] },
    { speed: 6.4, startFrac: 0.74, waypoints: [{ x: -179.0, z: 199.8 }, { x: -141.0, z: 199.8 }, { x: -141.0, z: 242.2 }, { x: -179.0, z: 242.2 }] },
    // Alley-weaving through West Wing Hẻm 272/2 (-269) & Hẻm 272/14 (-269) <-> West Connector (-301)
    { speed: 6.3, startFrac: 0.31, waypoints: [{ x: -299.2, z: 153.8 }, { x: -269.0, z: 153.8 }, { x: -269.0, z: 196.2 }, { x: -299.2, z: 196.2 }] },
    { speed: 6.2, startFrac: 0.78, waypoints: [{ x: -299.2, z: 199.8 }, { x: -269.0, z: 199.8 }, { x: -269.0, z: 242.2 }, { x: -299.2, z: 242.2 }] },
    // Long scenic cross-town motorbikes connecting Southwest <-> Đại Lộ Bệnh Viện <-> South-Central <-> Vinhomes Ring (+96)!
    { speed: 7.7, startFrac: 0.36, waypoints: [{ x: -550.0, z: 153.8 }, { x: 94.2, z: 153.8 }, { x: 94.2, z: 150.2 }, { x: -550.0, z: 150.2 }] },
    { speed: 7.8, startFrac: 0.84, waypoints: [{ x: -431.8, z: 153.8 }, { x: 94.2, z: 153.8 }, { x: 94.2, z: 242.2 }, { x: -302.8, z: 242.2 }, { x: -302.8, z: 150.2 }, { x: -431.8, z: 150.2 }] },
    // --- 14 NEW MOTORBIKES IN SOUTH-CENTRAL (-100..+96), SH5/SH6 & SOUTHWEST EXPANSION (S4-S6 & ĐẠI LỘ NAM 6)! ---
    // South-Central loop: Đông BV 1 (108) <-> Vành Đai Ocean Park (+96) <-> Nam 2 (152) <-> Đông BV (-104)
    { speed: 7.4, startFrac: 0.12, waypoints: [{ x: -105.8, z: 109.8 }, { x: 97.8, z: 109.8 }, { x: 97.8, z: 150.2 }, { x: -105.8, z: 150.2 }] },
    { speed: 7.5, startFrac: 0.62, waypoints: [{ x: -105.8, z: 153.8 }, { x: 97.8, z: 153.8 }, { x: 97.8, z: 196.2 }, { x: -105.8, z: 196.2 }] },
    // South-Central deep loop: Nam 3 (198) <-> Ocean Park Ring (+96) <-> Nam 5 (294) <-> Mid Connector (-2)
    { speed: 7.3, startFrac: 0.25, waypoints: [{ x: -3.8, z: 199.8 }, { x: 97.8, z: 199.8 }, { x: 97.8, z: 292.2 }, { x: -3.8, z: 292.2 }] },
    { speed: 7.6, startFrac: 0.72, waypoints: [{ x: -105.8, z: 245.8 }, { x: 97.8, z: 245.8 }, { x: 97.8, z: 342.2 }, { x: -105.8, z: 342.2 }] },
    // South-Central alley weaving (Hẻm 54 at X=-53 & Hẻm 48 at X=+47)
    { speed: 6.2, startFrac: 0.18, waypoints: [{ x: -53.0, z: 109.8 }, { x: 47.0, z: 109.8 }, { x: 47.0, z: 196.2 }, { x: -53.0, z: 196.2 }] },
    { speed: 6.3, startFrac: 0.56, waypoints: [{ x: -53.0, z: 245.8 }, { x: 47.0, z: 245.8 }, { x: 47.0, z: 342.2 }, { x: -53.0, z: 342.2 }] },
    // SH5 & SH6 loop across Đại Lộ Bệnh Viện Nam
    { speed: 7.4, startFrac: 0.14, waypoints: [{ x: -302.8, z: 245.8 }, { x: -102.2, z: 245.8 }, { x: -102.2, z: 292.2 }, { x: -302.8, z: 292.2 }] },
    { speed: 7.6, startFrac: 0.64, waypoints: [{ x: -302.8, z: 295.8 }, { x: -102.2, z: 295.8 }, { x: -102.2, z: 342.2 }, { x: -302.8, z: 342.2 }] },
    // Grand 1,050m Southern Avenue (Đại Lộ Nam 6, Z=344) <-> Nam 5 (Z=294) Cruisers!
    { speed: 8.6, startFrac: 0.08, waypoints: [{ x: -954.2, z: 347.2 }, { x: 97.8, z: 347.2 }, { x: 97.8, z: 340.8 }, { x: -954.2, z: 340.8 }] },
    { speed: 8.9, startFrac: 0.45, waypoints: [{ x: -954.2, z: 347.2 }, { x: 97.8, z: 347.2 }, { x: 97.8, z: 340.8 }, { x: -954.2, z: 340.8 }] },
    { speed: 8.4, startFrac: 0.78, waypoints: [{ x: -954.2, z: 295.8 }, { x: 97.8, z: 295.8 }, { x: 97.8, z: 292.2 }, { x: -954.2, z: 292.2 }] },
    // Southwest Expansion loops (Nam 3, Nam 4, Nam 5, Far-West Connector -956 & SW Mid Connector -615)
    { speed: 7.4, startFrac: 0.22, waypoints: [{ x: -954.2, z: 199.8 }, { x: -613.2, z: 199.8 }, { x: -613.2, z: 242.2 }, { x: -954.2, z: 242.2 }] },
    { speed: 7.5, startFrac: 0.58, waypoints: [{ x: -616.8, z: 245.8 }, { x: -299.2, z: 245.8 }, { x: -299.2, z: 342.2 }, { x: -616.8, z: 342.2 }] },
    // Southwest S4-S6 alley weaving (Hẻm 790/36 X=-791 & Hẻm 458/36 X=-457)
    { speed: 6.3, startFrac: 0.34, waypoints: [{ x: -791.0, z: 199.8 }, { x: -613.2, z: 199.8 }, { x: -613.2, z: 292.2 }, { x: -791.0, z: 292.2 }] },
    // --- 16 EXTRA NEIGHBORHOOD MOTORBIKES ENRICHING ALL SOUTHERN, EASTERN & FAR-WEST BLOCKS! ---
    { speed: 7.5, startFrac: 0.16, waypoints: [{ x: -954.2, z: 245.8 }, { x: -613.2, z: 245.8 }, { x: -613.2, z: 292.2 }, { x: -954.2, z: 292.2 }] },
    { speed: 7.3, startFrac: 0.64, waypoints: [{ x: -954.2, z: 295.8 }, { x: -613.2, z: 295.8 }, { x: -613.2, z: 340.8 }, { x: -954.2, z: 340.8 }] },
    { speed: 7.4, startFrac: 0.28, waypoints: [{ x: -616.8, z: 199.8 }, { x: -299.2, z: 199.8 }, { x: -299.2, z: 242.2 }, { x: -616.8, z: 242.2 }] },
    { speed: 7.6, startFrac: 0.77, waypoints: [{ x: -616.8, z: 295.8 }, { x: -299.2, z: 295.8 }, { x: -299.2, z: 340.8 }, { x: -616.8, z: 340.8 }] },
    { speed: 7.2, startFrac: 0.41, waypoints: [{ x: -105.8, z: 199.8 }, { x: 97.8, z: 199.8 }, { x: 97.8, z: 242.2 }, { x: -105.8, z: 242.2 }] },
    { speed: 7.5, startFrac: 0.86, waypoints: [{ x: -105.8, z: 295.8 }, { x: 97.8, z: 295.8 }, { x: 97.8, z: 340.8 }, { x: -105.8, z: 340.8 }] },
    { speed: 7.1, startFrac: 0.31, waypoints: [{ x: -210.0, z: 109.8 }, { x: 94.2, z: 109.8 }, { x: 94.2, z: 106.2 }, { x: -210.0, z: 106.2 }] },
    { speed: 7.4, startFrac: 0.79, waypoints: [{ x: -210.0, z: 109.8 }, { x: 94.2, z: 109.8 }, { x: 94.2, z: 106.2 }, { x: -210.0, z: 106.2 }] },
    { speed: 8.3, startFrac: 0.26, waypoints: [{ x: -954.2, z: 347.2 }, { x: 97.8, z: 347.2 }, { x: 97.8, z: 340.8 }, { x: -954.2, z: 340.8 }] },
    { speed: 8.7, startFrac: 0.62, waypoints: [{ x: -954.2, z: 347.2 }, { x: 97.8, z: 347.2 }, { x: 97.8, z: 340.8 }, { x: -954.2, z: 340.8 }] },
    { speed: 6.4, startFrac: 0.12, waypoints: [{ x: -457.0, z: 199.8 }, { x: -299.2, z: 199.8 }, { x: -299.2, z: 292.2 }, { x: -457.0, z: 292.2 }] },
    { speed: 6.3, startFrac: 0.58, waypoints: [{ x: -457.0, z: 245.8 }, { x: -299.2, z: 245.8 }, { x: -299.2, z: 340.8 }, { x: -457.0, z: 340.8 }] },
    { speed: 6.5, startFrac: 0.22, waypoints: [{ x: -954.2, z: -20.2 }, { x: -430.0, z: -20.2 }, { x: -430.0, z: -58.2 }, { x: -954.2, z: -58.2 }] },
    { speed: 6.6, startFrac: 0.71, waypoints: [{ x: -954.2, z: -61.8 }, { x: -238.0, z: -61.8 }, { x: -238.0, z: -96.2 }, { x: -954.2, z: -96.2 }] },
    { speed: 7.2, startFrac: 0.44, waypoints: [{ x: -950.0, z: 153.8 }, { x: -102.2, z: 153.8 }, { x: -102.2, z: 150.2 }, { x: -950.0, z: 150.2 }] },
    { speed: 7.4, startFrac: 0.88, waypoints: [{ x: -950.0, z: 199.8 }, { x: 94.2, z: 199.8 }, { x: 94.2, z: 196.2 }, { x: -950.0, z: 196.2 }] },
  ];

  const motoAgents: NeighborhoodMotorbikeAgent[] = motoRouteSpecs.map((spec, idx) => {
    const isScooter = idx % 3 !== 2;
    const includePassenger = idx % 3 === 1;
    const built = buildCityMotorbikeMesh({
      color: motoColors[idx % motoColors.length],
      variant: isScooter ? 'scooter' : 'sport',
      helmetColor: helmetColors[(idx * 3) % helmetColors.length],
      jacketColor: jacketColors[(idx * 5) % jacketColors.length],
      includeRider: true,
      includePassenger,
      passengerHelmetColor: helmetColors[(idx * 7 + 2) % helmetColors.length],
      passengerJacketColor: jacketColors[(idx * 3 + 1) % jacketColors.length],
      headlightIntensity: 0.9,
      brakeIntensity: 0.7,
      noMerge: true,
    });
    compactDynamicVehicleMeshes(built.group, built.wheels, built.riderGroup);
    const segLens: number[] = [];
    const segIsAlley: boolean[] = [];
    let totalDist = 0;
    for (let s = 0; s < spec.waypoints.length; s++) {
      const a = spec.waypoints[s];
      const b = spec.waypoints[(s + 1) % spec.waypoints.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      segLens.push(len);
      // Vertical (N-S) segments run through alleys -> ride gently at alley speed
      segIsAlley.push(Math.abs(dz) > Math.abs(dx) * 1.5 && len > 12);
      totalDist += len;
    }
    const startDist = (spec.startFrac * totalDist) % totalDist;
    const initA = spec.waypoints[0];
    const initB = spec.waypoints[1];
    const initYaw = Math.atan2(initB.x - initA.x, initB.z - initA.z);
    built.group.position.set(initA.x, 0.03, initA.z);
    built.group.rotation.y = initYaw;
    dynamicGroup.add(built.group);

    return {
      root: built.group,
      wheels: built.wheels,
      wheelR: built.wheelR,
      headlightMat: built.headlightMat,
      brakeMat: built.brakeMat,
      waypoints: spec.waypoints,
      segLens,
      segIsAlley,
      totalDist,
      distPos: startDist,
      baseSpeed: spec.speed,
      currentYaw: initYaw,
      currentLean: 0,
    };
  });

  // =========================================================================
  // 11B. RESIDENTIAL INNER-ROAD CAR & TAXI TRAFFIC (14 CARS ON BẮC 1/2/3 & NAM 1/2)
  // Redistributes city car/taxi circulation into the 5 wide 8-meter residential roads
  // =========================================================================
  interface NeighborhoodCarAgent {
    root: THREE.Group;
    wheels: THREE.Object3D[];
    wheelR: number;
    headlightMat: THREE.MeshStandardMaterial;
    brakeMat: THREE.MeshStandardMaterial;
    waypoints: Array<{ x: number; z: number }>;
    segLens: number[];
    totalDist: number;
    distPos: number;
    baseSpeed: number;
    currentYaw: number;
  }

  const buildInnerRoadCarLoop = (xMin: number, xMax: number, cz: number): Array<{ x: number; z: number }> => {
    const r = 1.9;
    const zEB = cz + r;
    const zWB = cz - r;
    return [
      { x: xMin, z: zEB },
      { x: xMax, z: zEB },
      { x: xMax + r * 0.72, z: cz + r * 0.68 },
      { x: xMax + r, z: cz },
      { x: xMax + r * 0.72, z: cz - r * 0.68 },
      { x: xMax, z: zWB },
      { x: xMin, z: zWB },
      { x: xMin - r * 0.72, z: cz - r * 0.68 },
      { x: xMin - r, z: cz },
      { x: xMin - r * 0.72, z: cz + r * 0.68 },
    ];
  };

  const resCarSpecs: Array<{
    xMin: number;
    xMax: number;
    cz: number;
    startFrac: number;
    speed: number;
    color: number;
    variant: CityCarVariant;
    xanhSm?: { variant: 'vfe34' | 'vf5'; plate: string };
    customWaypoints?: Array<{ x: number; z: number }>;
  }> = [
    // Đường Nội Khu Bắc 1 (Z = -22.0, X = -946 .. -254)
    { xMin: -946, xMax: -254, cz: -22.0, startFrac: 0.08, speed: 6.8, color: 0xf8fafc, variant: 'sedan' },
    { xMin: -946, xMax: -254, cz: -22.0, startFrac: 0.42, speed: 7.1, color: 0x00b6be, variant: 'suv', xanhSm: { variant: 'vf5', plate: '43H-791.02' } },
    { xMin: -946, xMax: -254, cz: -22.0, startFrac: 0.75, speed: 6.5, color: 0x64748b, variant: 'suv' },
    // Đường Nội Khu Bắc 2 (Z = -60.0, X = -946 .. -254)
    { xMin: -946, xMax: -254, cz: -60.0, startFrac: 0.14, speed: 6.7, color: 0xbe123c, variant: 'hatchback' },
    { xMin: -946, xMax: -254, cz: -60.0, startFrac: 0.49, speed: 7.2, color: 0x1e3a8a, variant: 'sedan' },
    { xMin: -946, xMax: -254, cz: -60.0, startFrac: 0.83, speed: 6.9, color: 0x00b6be, variant: 'suv', xanhSm: { variant: 'vfe34', plate: '43H-791.18' } },
    // Đường Nội Khu Bắc 3 (Z = -98.0, X = -946 .. -254)
    { xMin: -946, xMax: -254, cz: -98.0, startFrac: 0.05, speed: 7.0, color: 0x0f766e, variant: 'suv' },
    { xMin: -946, xMax: -254, cz: -98.0, startFrac: 0.37, speed: 6.6, color: 0xd97706, variant: 'coupe' },
    { xMin: -946, xMax: -254, cz: -98.0, startFrac: 0.68, speed: 7.3, color: 0xe2e8f0, variant: 'sedan' },
    // Đường Nội Khu Nam 1 (Z = 98.0) & Ngã 3 Đường Kết Nối Nam Tây (X = -430) <-> Nam 2 (Z = 152.0)!
    { xMin: -946, xMax: -442, cz: 98.0, startFrac: 0.11, speed: 6.8, color: 0x334155, variant: 'sedan' },
    {
      xMin: -946,
      xMax: -430,
      cz: 98.0,
      startFrac: 0.46,
      speed: 7.0,
      color: 0x00b6be,
      variant: 'suv',
      xanhSm: { variant: 'vf5', plate: '43H-791.35' },
      // Loops smoothly: Nam 1 EB -> Ngã 3 South Connector SB -> Nam 2 EB behind School -> U-turn -> Nam 2 WB -> North Connector -> Nam 1 WB!
      customWaypoints: [
        { x: -944, z: 99.9 },
        { x: -431.9, z: 99.9 },
        { x: -431.9, z: 153.9 },
        { x: -318, z: 153.9 },
        { x: -316.1, z: 152.0 },
        { x: -318, z: 150.1 },
        { x: -428.1, z: 150.1 },
        { x: -428.1, z: 96.1 },
        { x: -944, z: 96.1 },
        { x: -945.9, z: 98.0 },
      ],
    },
    {
      xMin: -946,
      xMax: -430,
      cz: 98.0,
      startFrac: 0.79,
      speed: 6.6,
      color: 0x2563eb,
      variant: 'hatchback',
      // Cruises directly between Đại Lộ Trung Tâm <-> Đường Kết Nối Nam Tây (X=-430) <-> Nội Khu Nam 1 & Nam 2!
      customWaypoints: [
        { x: -428.1, z: 150.1 },
        { x: -428.1, z: 43.0 },
        { x: -430.0, z: 41.2 },
        { x: -431.9, z: 43.0 },
        { x: -431.9, z: 153.9 },
        { x: -318, z: 153.9 },
        { x: -316.1, z: 152.0 },
        { x: -318, z: 150.1 },
      ],
    },
    // Đường Nội Khu Nam 2 (Z = 152.0, X = -946 .. -318)
    { xMin: -946, xMax: -318, cz: 152.0, startFrac: 0.22, speed: 6.9, color: 0xf1f5f9, variant: 'suv' },
    { xMin: -946, xMax: -318, cz: 152.0, startFrac: 0.72, speed: 6.6, color: 0x7c2d12, variant: 'sedan' },
    // === 6 NEW RESIDENTIAL CARS & XANH SM TAXIS IN SOUTH HOSPITAL QUARTER (NAM 2, NAM 3, NAM 4, ĐÔNG BV 1 & RING CONNECTORS!) ===
    {
      xMin: -301,
      xMax: -104,
      cz: 152.0,
      startFrac: 0.1,
      speed: 7.1,
      color: 0x00b6be,
      variant: 'suv',
      xanhSm: { variant: 'vfe34', plate: '43H-792.08' },
      customWaypoints: [
        { x: -302.9, z: 153.9 },
        { x: -102.1, z: 153.9 },
        { x: -102.1, z: 196.1 },
        { x: -302.9, z: 196.1 },
      ],
    },
    {
      xMin: -301,
      xMax: -104,
      cz: 198.0,
      startFrac: 0.56,
      speed: 6.8,
      color: 0xf8fafc,
      variant: 'sedan',
      customWaypoints: [
        { x: -302.9, z: 153.9 },
        { x: -102.1, z: 153.9 },
        { x: -102.1, z: 196.1 },
        { x: -302.9, z: 196.1 },
      ],
    },
    {
      xMin: -301,
      xMax: -104,
      cz: 244.0,
      startFrac: 0.24,
      speed: 6.9,
      color: 0x1e3a8a,
      variant: 'suv',
      customWaypoints: [
        { x: -302.9, z: 199.9 },
        { x: -102.1, z: 199.9 },
        { x: -102.1, z: 242.1 },
        { x: -302.9, z: 242.1 },
      ],
    },
    {
      xMin: -301,
      xMax: -104,
      cz: 244.0,
      startFrac: 0.74,
      speed: 7.0,
      color: 0x00b6be,
      variant: 'suv',
      xanhSm: { variant: 'vf5', plate: '43H-792.42' },
      customWaypoints: [
        { x: -302.9, z: 199.9 },
        { x: -102.1, z: 199.9 },
        { x: -102.1, z: 242.1 },
        { x: -302.9, z: 242.1 },
      ],
    },
    {
      xMin: -206,
      xMax: -104,
      cz: 108.0,
      startFrac: 0.18,
      speed: 6.6,
      color: 0xbe123c,
      variant: 'hatchback',
    },
    {
      xMin: -428,
      xMax: 96,
      cz: 152.0,
      startFrac: 0.42,
      speed: 7.2,
      color: 0x0f766e,
      variant: 'coupe',
      customWaypoints: [
        { x: -428.1, z: 153.9 },
        { x: 97.9, z: 153.9 },
        { x: 97.9, z: 242.1 },
        { x: -302.9, z: 242.1 },
        { x: -302.9, z: 150.1 },
        { x: -428.1, z: 150.1 },
        { x: -430.0, z: 152.0 },
      ],
    },
    // === 10 NEW CARS & XANH SM TAXIS CONNECTING SOUTH-CENTRAL (-100..+96), SOUTHWEST (-956..-301) & ĐẠI LỘ NAM 6 (Z=344)! ===
    {
      xMin: -956,
      xMax: 96,
      cz: 344.0,
      startFrac: 0.08,
      speed: 8.2,
      color: 0x00b6be,
      variant: 'suv',
      xanhSm: { variant: 'vfe34', plate: '43H-793.01' },
      customWaypoints: [
        { x: -954.1, z: 347.4 },
        { x: 97.9, z: 347.4 },
        { x: 97.9, z: 340.6 },
        { x: -954.1, z: 340.6 },
      ],
    },
    {
      xMin: -956,
      xMax: 96,
      cz: 344.0,
      startFrac: 0.36,
      speed: 7.9,
      color: 0xf8fafc,
      variant: 'sedan',
      customWaypoints: [
        { x: -954.1, z: 347.4 },
        { x: 97.9, z: 347.4 },
        { x: 97.9, z: 340.6 },
        { x: -954.1, z: 340.6 },
      ],
    },
    {
      xMin: -956,
      xMax: 96,
      cz: 344.0,
      startFrac: 0.68,
      speed: 8.4,
      color: 0x1e3a8a,
      variant: 'suv',
      customWaypoints: [
        { x: -954.1, z: 347.4 },
        { x: 97.9, z: 347.4 },
        { x: 97.9, z: 340.6 },
        { x: -954.1, z: 340.6 },
      ],
    },
    {
      xMin: -104,
      xMax: 96,
      cz: 152.0,
      startFrac: 0.16,
      speed: 7.1,
      color: 0x00b6be,
      variant: 'suv',
      xanhSm: { variant: 'vf5', plate: '43H-793.24' },
      customWaypoints: [
        { x: -105.9, z: 109.9 },
        { x: 97.9, z: 109.9 },
        { x: 97.9, z: 196.1 },
        { x: -105.9, z: 196.1 },
      ],
    },
    {
      xMin: -104,
      xMax: 96,
      cz: 244.0,
      startFrac: 0.52,
      speed: 7.0,
      color: 0xd97706,
      variant: 'hatchback',
      customWaypoints: [
        { x: -3.9, z: 153.9 },
        { x: 97.9, z: 153.9 },
        { x: 97.9, z: 292.1 },
        { x: -3.9, z: 292.1 },
      ],
    },
    {
      xMin: -301,
      xMax: 96,
      cz: 294.0,
      startFrac: 0.28,
      speed: 7.3,
      color: 0xbe123c,
      variant: 'sedan',
      customWaypoints: [
        { x: -302.9, z: 295.9 },
        { x: 97.9, z: 295.9 },
        { x: 97.9, z: 340.6 },
        { x: -302.9, z: 340.6 },
      ],
    },
    {
      xMin: -956,
      xMax: -301,
      cz: 198.0,
      startFrac: 0.18,
      speed: 7.1,
      color: 0x334155,
      variant: 'suv',
      customWaypoints: [
        { x: -954.1, z: 199.9 },
        { x: -299.1, z: 199.9 },
        { x: -299.1, z: 242.1 },
        { x: -954.1, z: 242.1 },
      ],
    },
    {
      xMin: -956,
      xMax: -301,
      cz: 244.0,
      startFrac: 0.62,
      speed: 7.2,
      color: 0x00b6be,
      variant: 'suv',
      xanhSm: { variant: 'vfe34', plate: '43H-793.56' },
      customWaypoints: [
        { x: -954.1, z: 245.9 },
        { x: -613.1, z: 245.9 },
        { x: -613.1, z: 292.1 },
        { x: -954.1, z: 292.1 },
      ],
    },
    {
      xMin: -615,
      xMax: -104,
      cz: 294.0,
      startFrac: 0.44,
      speed: 7.4,
      color: 0xe2e8f0,
      variant: 'sedan',
      customWaypoints: [
        { x: -616.9, z: 295.9 },
        { x: -102.1, z: 295.9 },
        { x: -102.1, z: 340.6 },
        { x: -616.9, z: 340.6 },
      ],
    },
    {
      xMin: -956,
      xMax: -615,
      cz: 294.0,
      startFrac: 0.82,
      speed: 7.0,
      color: 0x0f766e,
      variant: 'coupe',
      customWaypoints: [
        { x: -954.1, z: 295.9 },
        { x: -613.1, z: 295.9 },
        { x: -613.1, z: 340.6 },
        { x: -954.1, z: 340.6 },
      ],
    },
    // === 8 EXTRA SOUTHERN, EASTERN & CROSS-TOWN RESIDENTIAL CARS & XANH SM TAXIS! ===
    {
      xMin: -956,
      xMax: 96,
      cz: 244.0,
      startFrac: 0.14,
      speed: 7.5,
      color: 0x00b6be,
      variant: 'suv',
      xanhSm: { variant: 'vf5', plate: '43H-794.08' },
      customWaypoints: [
        { x: -954.1, z: 245.9 },
        { x: 97.9, z: 245.9 },
        { x: 97.9, z: 242.1 },
        { x: -954.1, z: 242.1 },
      ],
    },
    {
      xMin: -956,
      xMax: 96,
      cz: 244.0,
      startFrac: 0.64,
      speed: 7.2,
      color: 0xf8fafc,
      variant: 'sedan',
      customWaypoints: [
        { x: -954.1, z: 245.9 },
        { x: 97.9, z: 245.9 },
        { x: 97.9, z: 242.1 },
        { x: -954.1, z: 242.1 },
      ],
    },
    {
      xMin: -956,
      xMax: 96,
      cz: 294.0,
      startFrac: 0.22,
      speed: 7.4,
      color: 0x2563eb,
      variant: 'hatchback',
      customWaypoints: [
        { x: -954.1, z: 295.9 },
        { x: 97.9, z: 295.9 },
        { x: 97.9, z: 292.1 },
        { x: -954.1, z: 292.1 },
      ],
    },
    {
      xMin: -956,
      xMax: 96,
      cz: 294.0,
      startFrac: 0.76,
      speed: 7.6,
      color: 0x00b6be,
      variant: 'suv',
      xanhSm: { variant: 'vfe34', plate: '43H-794.31' },
      customWaypoints: [
        { x: -954.1, z: 295.9 },
        { x: 97.9, z: 295.9 },
        { x: 97.9, z: 292.1 },
        { x: -954.1, z: 292.1 },
      ],
    },
    {
      xMin: -210,
      xMax: 96,
      cz: 108.0,
      startFrac: 0.35,
      speed: 6.9,
      color: 0xd97706,
      variant: 'sedan',
    },
    {
      xMin: -104,
      xMax: 96,
      cz: 198.0,
      startFrac: 0.42,
      speed: 7.1,
      color: 0x1e293b,
      variant: 'suv',
      customWaypoints: [
        { x: -105.9, z: 199.9 },
        { x: 97.9, z: 199.9 },
        { x: 97.9, z: 292.1 },
        { x: -105.9, z: 292.1 },
      ],
    },
    {
      xMin: -615,
      xMax: -301,
      cz: 198.0,
      startFrac: 0.31,
      speed: 7.0,
      color: 0xbe123c,
      variant: 'hatchback',
      customWaypoints: [
        { x: -616.9, z: 199.9 },
        { x: -299.1, z: 199.9 },
        { x: -299.1, z: 292.1 },
        { x: -616.9, z: 292.1 },
      ],
    },
    {
      xMin: -956,
      xMax: 96,
      cz: 344.0,
      startFrac: 0.88,
      speed: 8.1,
      color: 0x0f766e,
      variant: 'coupe',
      customWaypoints: [
        { x: -954.1, z: 347.4 },
        { x: 97.9, z: 347.4 },
        { x: 97.9, z: 340.6 },
        { x: -954.1, z: 340.6 },
      ],
    },
  ];

  const resCarAgents: NeighborhoodCarAgent[] = resCarSpecs.map((spec) => {
    const built = spec.xanhSm
      ? buildAmbientXanhSmTaxiCar(spec.xanhSm.variant, spec.xanhSm.plate, true)
      : buildCityCarMesh({
          color: spec.color,
          variant: spec.variant,
          headlightIntensity: 0.9,
          brakeIntensity: 0.7,
          noMerge: true,
        });
    if (!spec.xanhSm) {
      compactDynamicVehicleMeshes(built.group, built.wheels);
    }
    const waypoints = spec.customWaypoints ?? buildInnerRoadCarLoop(spec.xMin, spec.xMax, spec.cz);
    const segLens: number[] = [];
    let totalDist = 0;
    for (let s = 0; s < waypoints.length; s++) {
      const a = waypoints[s];
      const b = waypoints[(s + 1) % waypoints.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      segLens.push(len);
      totalDist += len;
    }
    const startDist = (spec.startFrac * totalDist) % totalDist;
    let rem = startDist;
    let segIdx = 0;
    while (segIdx < segLens.length - 1 && rem > segLens[segIdx]) {
      rem -= segLens[segIdx];
      segIdx++;
    }
    const initA = waypoints[segIdx];
    const initB = waypoints[(segIdx + 1) % waypoints.length];
    const initFrac = rem / Math.max(0.001, segLens[segIdx]);
    const initYaw = Math.atan2(initB.x - initA.x, initB.z - initA.z);
    built.group.position.set(
      initA.x + (initB.x - initA.x) * initFrac,
      0.035,
      initA.z + (initB.z - initA.z) * initFrac
    );
    built.group.rotation.y = initYaw;
    dynamicGroup.add(built.group);

    return {
      root: built.group,
      wheels: built.wheels,
      wheelR: built.wheelR,
      headlightMat: built.headlightMat,
      brakeMat: built.brakeMat,
      waypoints,
      segLens,
      totalDist,
      distPos: startDist,
      baseSpeed: spec.speed,
      currentYaw: initYaw,
    };
  });

  // =========================================================================
  // 11B. ROTATING MARKET SHOPPERS (36), POOLED INDOOR RESIDENTS (24),
  //      WALKABLE SHOP PATRONS (20) & ACTIVE DRIVEWAY COMMUTER MOTORBIKES (22)
  // =========================================================================
  const getWestBikeGroundY = (x: number, z: number): number => {
    if (z >= 20.8 && z <= 37.2) return -0.26;
    if (z > 18.6 && z < 20.8) return 0.035 - ((z - 18.6) / 2.2) * 0.295;
    if (z > 37.2 && z < 39.4) return -0.26 + ((z - 37.2) / 2.2) * 0.295;
    if (x >= -235.7 && x <= -219.3) return -0.26;
    if (x > -241.0 && x < -235.7) return 0.035 - ((x + 241.0) / 5.3) * 0.295;
    if (x > -219.3 && x < -214.0) return -0.26 + ((x + 219.3) / 5.3) * 0.295;
    if (x >= 105.0) return -0.26;
    if (x > 99.7 && x < 105.0) return 0.035 - ((x - 99.7) / 5.3) * 0.295;
    return 0.035;
  };

  const lerpAngle = (cur: number, target: number, alpha: number): number => {
    let diff = target - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return cur + diff * Math.min(1, alpha);
  };

  // --- A. 36 DYNAMIC ROTATING MARKET SHOPPERS WITH HANDHELD SHOPPING BASKETS (18 PER MARKET) ---
  const basketBodyGeo = new THREE.CylinderGeometry(0.145, 0.115, 0.22, 8);
  const basketRimGeo = new THREE.TorusGeometry(0.142, 0.014, 6, 10);
  const basketHandleGeo = new THREE.TorusGeometry(0.11, 0.011, 5, 10, Math.PI);
  const basketGoodsVegGeo = new THREE.DodecahedronGeometry(0.068, 0);
  const basketGoodsFruitGeo = new THREE.SphereGeometry(0.055, 7, 6);
  const basketGoodsParcelGeo = new THREE.BoxGeometry(0.11, 0.065, 0.085);
  const basketPaletteMats = [0x0d9488, 0xf97316, 0xea580c, 0x2563eb, 0xec4899, 0x16a34a].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 })
  );
  const basketVegMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 });
  const basketOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
  const basketParcelMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.68 });

  const createHandheldMarketBasket = (seed: number): { basketRoot: THREE.Group; goodsGroup: THREE.Group } => {
    const basketRoot = new THREE.Group();
    const bMat = basketPaletteMats[seed % basketPaletteMats.length];
    const body = new THREE.Mesh(basketBodyGeo, bMat);
    body.position.y = -0.11;
    basketRoot.add(body);
    const rim = new THREE.Mesh(basketRimGeo, bMat);
    rim.rotation.x = Math.PI / 2;
    basketRoot.add(rim);
    const handle = new THREE.Mesh(basketHandleGeo, bMat);
    handle.position.y = 0.01;
    basketRoot.add(handle);

    const goodsGroup = new THREE.Group();
    const veg = new THREE.Mesh(basketGoodsVegGeo, basketVegMat);
    veg.position.set(-0.045, 0.015, 0.02);
    goodsGroup.add(veg);
    const fruit = new THREE.Mesh(basketGoodsFruitGeo, basketOrangeMat);
    fruit.position.set(0.05, 0.01, -0.02);
    goodsGroup.add(fruit);
    const parcel = new THREE.Mesh(basketGoodsParcelGeo, basketParcelMat);
    parcel.position.set(0.0, -0.015, 0.03);
    goodsGroup.add(parcel);
    goodsGroup.visible = false;
    basketRoot.add(goodsGroup);

    basketRoot.position.set(0.28, 0.78, 0.14);
    return { basketRoot, goodsGroup };
  };

  interface MarketShopperAgent {
    id: number;
    ctrl: MarketDynamicController;
    rig: ResidentNpcAgent;
    basketRoot: THREE.Group;
    basketGoods: THREE.Group;
    state: 'outside_wait' | 'walking_to_stall' | 'buying' | 'leaving_market';
    x: number;
    z: number;
    yaw: number;
    speed: number;
    laneX: number;
    laneZ: number;
    path: Array<{ x: number; z: number }>;
    pathIdx: number;
    targetStall: MarketStallSpot | null;
    targetGate: MarketGateExit | null;
    stallsVisited: number;
    maxStallsPerTrip: number;
    timer: number;
    rngState: number;
  }

  const nextShopperRand = (a: { rngState: number }): number => {
    a.rngState = (a.rngState * 1664525 + 1013904223) >>> 0;
    return a.rngState / 4294967296;
  };

  const buildGateToStallPath = (
    ctrl: MarketDynamicController,
    gate: MarketGateExit,
    stall: MarketStallSpot,
    laneX: number,
    laneZ: number
  ): Array<{ x: number; z: number }> => {
    if (gate.isHorizontal) {
      return [
        { x: gate.inX, z: ctrl.bodyCz + laneZ },
        { x: stall.x, z: ctrl.bodyCz + laneZ },
        { x: stall.x, z: stall.z },
      ];
    }
    return [
      { x: ctrl.cx + laneX, z: gate.inZ },
      { x: ctrl.cx + laneX, z: ctrl.bodyCz + laneZ },
      { x: stall.x, z: ctrl.bodyCz + laneZ },
      { x: stall.x, z: stall.z },
    ];
  };

  const buildStallToStallPath = (
    ctrl: MarketDynamicController,
    fromX: number,
    stall: MarketStallSpot,
    laneZ: number
  ): Array<{ x: number; z: number }> => [
    { x: fromX, z: ctrl.bodyCz + laneZ },
    { x: stall.x, z: ctrl.bodyCz + laneZ },
    { x: stall.x, z: stall.z },
  ];

  const buildStallToGatePath = (
    ctrl: MarketDynamicController,
    fromX: number,
    gate: MarketGateExit,
    laneX: number,
    laneZ: number
  ): Array<{ x: number; z: number }> => {
    if (gate.isHorizontal) {
      return [
        { x: fromX, z: ctrl.bodyCz + laneZ },
        { x: gate.inX, z: ctrl.bodyCz + laneZ },
        { x: gate.outX, z: gate.outZ },
      ];
    }
    return [
      { x: fromX, z: ctrl.bodyCz + laneZ },
      { x: ctrl.cx + laneX, z: ctrl.bodyCz + laneZ },
      { x: ctrl.cx + laneX, z: gate.inZ },
      { x: gate.outX, z: gate.outZ },
    ];
  };

  const pickFreeMarketStall = (
    ctrl: MarketDynamicController,
    shopperId: number,
    excludeId: number,
    rng: { rngState: number }
  ): MarketStallSpot | null => {
    const spots = ctrl.stallSpots;
    if (spots.length === 0) return null;
    const start = Math.floor(nextShopperRand(rng) * spots.length);
    for (let k = 0; k < spots.length; k++) {
      const s = spots[(start + k) % spots.length];
      if (s.occupiedBy === null && s.id !== excludeId) {
        s.occupiedBy = shopperId;
        return s;
      }
    }
    return null;
  };

  const marketShoppers: MarketShopperAgent[] = [];
  const SHOPPERS_PER_MARKET = 18;
  marketControllers.forEach((ctrl, mIdx) => {
    for (let sIdx = 0; sIdx < SHOPPERS_PER_MARKET; sIdx++) {
      const shopperId = mIdx * 100 + sIdx + 1;
      const seed = 740 + mIdx * 40 + sIdx;
      const laneX = ((sIdx % 5) - 2) * 0.62;
      const laneZ = ((sIdx % 3) - 1) * 0.72;
      const entryGate = ctrl.gates[sIdx % ctrl.gates.length];
      const rig = createResidentNpcRig('walker', entryGate.outX, 0.1, entryGate.outZ, 0, sIdx * 0.47, seed, {
        speed: 0.96 + (sIdx % 5) * 0.08,
      });
      const { basketRoot, goodsGroup } = createHandheldMarketBasket(seed);
      rig.grp.add(basketRoot);
      dynamicGroup.add(rig.grp);

      const agent: MarketShopperAgent = {
        id: shopperId,
        ctrl,
        rig,
        basketRoot,
        basketGoods: goodsGroup,
        state: 'outside_wait',
        x: entryGate.outX,
        z: entryGate.outZ,
        yaw: 0,
        speed: 0.96 + (sIdx % 5) * 0.08,
        laneX,
        laneZ,
        path: [],
        pathIdx: 0,
        targetStall: null,
        targetGate: entryGate,
        stallsVisited: 0,
        maxStallsPerTrip: 2 + (sIdx % 2),
        timer: 0.8 + (sIdx % 6) * 0.9,
        rngState: (seed * 2654435761) >>> 0,
      };

      // Stagger initial states so the markets are immediately bustling with rotating buyers when open!
      if (sIdx < 8) {
        const stall = pickFreeMarketStall(ctrl, shopperId, -1, agent);
        if (stall) {
          agent.targetStall = stall;
          agent.state = 'buying';
          agent.x = stall.x;
          agent.z = stall.z;
          agent.yaw = stall.faceYaw;
          agent.stallsVisited = sIdx % 2;
          agent.basketGoods.visible = agent.stallsVisited > 0;
          agent.timer = 2.0 + sIdx * 1.15;
          rig.grp.position.set(agent.x, 0.1, agent.z);
          rig.grp.rotation.y = agent.yaw;
        }
      } else if (sIdx < 14) {
        const stall = pickFreeMarketStall(ctrl, shopperId, -1, agent);
        if (stall) {
          agent.targetStall = stall;
          agent.state = 'walking_to_stall';
          const path = buildGateToStallPath(ctrl, entryGate, stall, laneX, laneZ);
          agent.path = path;
          agent.pathIdx = Math.min(1, path.length - 1);
          const startPt = path[Math.max(0, agent.pathIdx - 1)];
          agent.x = startPt.x;
          agent.z = startPt.z;
          rig.grp.position.set(agent.x, 0.1, agent.z);
        }
      } else {
        const exitGate = ctrl.gates[(sIdx + 2) % ctrl.gates.length];
        agent.targetGate = exitGate;
        agent.state = 'leaving_market';
        agent.stallsVisited = 2;
        agent.basketGoods.visible = true;
        agent.x = ctrl.cx + laneX;
        agent.z = ctrl.bodyCz + laneZ;
        agent.path = buildStallToGatePath(ctrl, agent.x, exitGate, laneX, laneZ);
        agent.pathIdx = 1;
        rig.grp.position.set(agent.x, 0.1, agent.z);
      }

      marketShoppers.push(agent);
    }
  });

  // --- B. 24 PROXIMITY-POOLED INDOOR RESIDENT NPCS (GUARANTEES >= 1 ACTIVE RESIDENT IN EVERY NEARBY HOUSE!) ---
  interface IndoorResidentAgent {
    rig: ResidentNpcAgent;
    slotIdx: number;
    state: 'sit_sofa' | 'walk_to_kitchen' | 'cook_kitchen' | 'walk_to_mid' | 'tidy_mid' | 'walk_to_sofa';
    x: number;
    z: number;
    yaw: number;
    targetX: number;
    targetZ: number;
    targetYaw: number;
    timer: number;
    phase: number;
    speed: number;
  }

  const INDOOR_RESIDENT_POOL_SIZE = 40;
  const indoorResidents: IndoorResidentAgent[] = [];
  for (let i = 0; i < INDOOR_RESIDENT_POOL_SIZE; i++) {
    const rig = createResidentNpcRig('home_idle', -9999, 0.08, -9999, 0, i * 0.61, 860 + i, { speed: 0.88 });
    rig.grp.visible = false;
    rig.glbHandle.setVisible(false);
    dynamicGroup.add(rig.grp);
    indoorResidents.push({
      rig,
      slotIdx: -1,
      state: 'sit_sofa',
      x: -9999,
      z: -9999,
      yaw: 0,
      targetX: -9999,
      targetZ: -9999,
      targetYaw: 0,
      timer: 6 + (i % 5) * 2.2,
      phase: i * 0.73,
      speed: 0.84 + (i % 4) * 0.06,
    });
  }

  const nearestHouseSlotIdx = new Int32Array(INDOOR_RESIDENT_POOL_SIZE);
  const nearestHouseSlotDistSq = new Float64Array(INDOOR_RESIDENT_POOL_SIZE);
  const assignedHouseCounts = new Map<number, number>();
  let indoorAssignTimer = 0;
  let lastIndoorAssignX = 1e9;
  let lastIndoorAssignZ = 1e9;

  const assignIndoorResidentToSlot = (agent: IndoorResidentAgent, slotIdx: number, seed: number) => {
    const slot = houseSlots[slotIdx];
    agent.slotIdx = slotIdx;
    const mode = seed % 3;
    if (mode === 0) {
      agent.state = 'sit_sofa';
      agent.x = slot.sofaX;
      agent.z = slot.sofaZ;
      agent.yaw = slot.sofaYaw;
      agent.timer = 7.5 + (seed % 7) * 1.4;
    } else if (mode === 1) {
      agent.state = 'cook_kitchen';
      agent.x = slot.kitchenX;
      agent.z = slot.kitchenZ;
      agent.yaw = slot.kitchenYaw;
      agent.timer = 6.5 + (seed % 6) * 1.3;
    } else {
      agent.state = 'tidy_mid';
      agent.x = slot.midX;
      agent.z = slot.midZ;
      agent.yaw = slot.midYaw;
      agent.timer = 5.5 + (seed % 5) * 1.2;
    }
    agent.targetX = agent.x;
    agent.targetZ = agent.z;
    agent.targetYaw = agent.yaw;
    agent.rig.grp.position.set(agent.x, 0.08, agent.z);
    agent.rig.grp.rotation.y = agent.yaw;
  };

  // --- C. 36 PROXIMITY-POOLED WALKABLE SHOP & EATERY PATRONS (WALKING IN/OUT THROUGH AUTO DOORS & EATING!) ---
  interface ShopPatronAgent {
    id: number;
    rig: ResidentNpcAgent;
    shopIdx: number;
    seatIdx: number;
    state: 'idle_pool' | 'walk_in' | 'ordering' | 'walk_to_seat' | 'dining' | 'walk_out';
    x: number;
    z: number;
    yaw: number;
    speed: number;
    path: Array<{ x: number; z: number }>;
    pathIdx: number;
    timer: number;
    phase: number;
  }

  const SHOP_PATRON_POOL_SIZE = 24;
  const shopPatrons: ShopPatronAgent[] = [];
  for (let i = 0; i < SHOP_PATRON_POOL_SIZE; i++) {
    const rig = createResidentNpcRig('walker', -9999, 0.04, -9999, 0, i * 0.57, 940 + i, { speed: 1.02 });
    rig.grp.visible = false;
    rig.glbHandle.setVisible(false);
    dynamicGroup.add(rig.grp);
    shopPatrons.push({
      id: 2000 + i,
      rig,
      shopIdx: -1,
      seatIdx: -1,
      state: 'idle_pool',
      x: -9999,
      z: -9999,
      yaw: 0,
      speed: 0.96 + (i % 5) * 0.07,
      path: [],
      pathIdx: 0,
      timer: 0.5 + (i % 6) * 0.6,
      phase: i * 0.63,
    });
  }

  const releasePatronSeat = (p: ShopPatronAgent) => {
    if (p.shopIdx >= 0 && p.seatIdx >= 0) {
      const seat = walkableShopSlots[p.shopIdx]?.seats[p.seatIdx];
      if (seat && seat.occupiedBy === p.id) seat.occupiedBy = null;
    }
    p.seatIdx = -1;
  };

  const assignPatronToShop = (p: ShopPatronAgent, shopIdx: number, startMode: number) => {
    releasePatronSeat(p);
    const shop = walkableShopSlots[shopIdx];
    p.shopIdx = shopIdx;
    const approachSide = (p.id + shopIdx) % 2 === 0 ? -1 : 1;
    const spawnSidewalkX = shop.sidewalkX + approachSide * (4.5 + (p.id % 3) * 1.4);

    if (startMode === 0) {
      // Start already seated dining so shops look lively immediately upon approach
      const freeIdx = shop.seats.findIndex((s) => s.occupiedBy === null);
      if (freeIdx >= 0) {
        shop.seats[freeIdx].occupiedBy = p.id;
        p.seatIdx = freeIdx;
        p.state = 'dining';
        p.x = shop.seats[freeIdx].x;
        p.z = shop.seats[freeIdx].z;
        p.yaw = shop.seats[freeIdx].yaw;
        p.timer = 6.5 + (p.id % 7) * 1.8;
        p.rig.grp.position.set(p.x, 0.06, p.z);
        p.rig.grp.rotation.y = p.yaw;
        return;
      }
    }
    // Walk from sidewalk -> automatic sliding door -> counter
    p.state = 'walk_in';
    p.x = spawnSidewalkX;
    p.z = shop.sidewalkZ;
    p.path = [
      { x: shop.doorX, z: shop.sidewalkZ },
      { x: shop.doorX, z: shop.doorZ },
      { x: shop.orderX, z: shop.orderZ },
    ];
    p.pathIdx = 0;
    p.yaw = Math.atan2(shop.doorX - p.x, shop.sidewalkZ - p.z);
    p.rig.grp.position.set(p.x, 0.04, p.z);
    p.rig.grp.rotation.y = p.yaw;
  };

  // --- D. 22 ACTIVE DRIVEWAY & EATERY COMMUTER MOTORBIKES (RESIDENTS RIDE OUT FROM HOUSES TO EAT & RIDE HOME!) ---
  interface DrivewayCommuterBikeAgent {
    id: number;
    homeSlot: DrivewayBikeSlot;
    road: FacingRoadMatch;
    targetShop: WalkableShopActivitySlot | null;
    bikeRoot: THREE.Group;
    wheels: THREE.Object3D[];
    wheelR: number;
    riderGroup?: THREE.Group;
    headlightMat: THREE.MeshStandardMaterial;
    brakeMat: THREE.MeshStandardMaterial;
    ownerRig: ResidentNpcAgent;
    state:
      | 'parked_home'
      | 'walk_to_bike'
      | 'ride_to_eatery'
      | 'walk_into_eatery'
      | 'dining_at_eatery'
      | 'walk_out_eatery'
      | 'ride_home'
      | 'walk_home_inside';
    bikeX: number;
    bikeZ: number;
    bikeYaw: number;
    bikeLean: number;
    ownerX: number;
    ownerZ: number;
    ownerYaw: number;
    rideSpeed: number;
    walkSpeed: number;
    path: Array<{ x: number; z: number }>;
    pathIdx: number;
    seatIdx: number;
    timer: number;
    phase: number;
  }

  const findTargetShopOnRoad = (
    slot: DrivewayBikeSlot,
    road: FacingRoadMatch,
    assignedCounts?: Map<WalkableShopActivitySlot, number>
  ): WalkableShopActivitySlot | null => {
    let best: WalkableShopActivitySlot | null = null;
    let bestScore = 1e9;
    for (let i = 0; i < walkableShopSlots.length; i++) {
      const sh = walkableShopSlots[i];
      const shRoad = findFacingRoadForDriveway(sh.curbParkX, sh.curbParkZ, sh.facingNorth);
      if (!shRoad || shRoad.roadId !== road.roadId) continue;
      const dx = Math.abs(sh.curbParkX - slot.parkX);
      if (dx < 22 || dx > 210) continue;
      const commuterCount = assignedCounts?.get(sh) ?? 0;
      const score = commuterCount * 95 + Math.abs(dx - 75);
      if (score < bestScore) {
        bestScore = score;
        best = sh;
      }
    }
    return best;
  };

  const buildDrivewayOutboundPath = (
    slot: DrivewayBikeSlot,
    road: FacingRoadMatch,
    targetShop: WalkableShopActivitySlot | null
  ): Array<{ x: number; z: number }> => {
    if (targetShop) {
      const goingEast = targetShop.curbParkX >= slot.yardOutX;
      const outLaneZ = road.cz + (goingEast ? road.laneOffset : -road.laneOffset);
      return [
        { x: slot.yardOutX, z: slot.yardOutZ },
        { x: slot.yardOutX, z: outLaneZ },
        { x: targetShop.curbParkX, z: outLaneZ },
        { x: targetShop.curbParkX, z: targetShop.curbParkZ },
      ];
    }
    // Errand cruise down the street & U-turn back to driveway if no walkable shop sits on this street
    const roomWest = slot.yardOutX - road.x1;
    const roomEast = road.x2 - slot.yardOutX;
    const goEast = roomEast >= roomWest;
    const cruiseDist = Math.min(92, Math.max(40, (goEast ? roomEast : roomWest) - 10));
    const turnX = slot.yardOutX + (goEast ? cruiseDist : -cruiseDist);
    const outLaneZ = road.cz + (goEast ? road.laneOffset : -road.laneOffset);
    const retLaneZ = road.cz + (goEast ? -road.laneOffset : road.laneOffset);
    return [
      { x: slot.yardOutX, z: slot.yardOutZ },
      { x: slot.yardOutX, z: outLaneZ },
      { x: turnX, z: outLaneZ },
      { x: turnX, z: retLaneZ },
      { x: slot.yardOutX, z: retLaneZ },
      { x: slot.yardOutX, z: slot.yardOutZ },
      { x: slot.parkX, z: slot.parkZ },
    ];
  };

  const buildDrivewayReturnPath = (
    slot: DrivewayBikeSlot,
    road: FacingRoadMatch,
    targetShop: WalkableShopActivitySlot
  ): Array<{ x: number; z: number }> => {
    const goingEast = slot.yardOutX >= targetShop.curbParkX;
    const retLaneZ = road.cz + (goingEast ? road.laneOffset : -road.laneOffset);
    return [
      { x: targetShop.curbParkX, z: retLaneZ },
      { x: slot.yardOutX, z: retLaneZ },
      { x: slot.yardOutX, z: slot.yardOutZ },
      { x: slot.parkX, z: slot.parkZ },
    ];
  };

  const drivewayCommuters: DrivewayCommuterBikeAgent[] = [];
  const commuterShopCounts = new Map<WalkableShopActivitySlot, number>();
  drivewayBikeSlots.forEach((slot, idx) => {
    const road = findFacingRoadForDriveway(slot.yardOutX, slot.yardOutZ, slot.facingNorth);
    if (!road) return;
    const targetShop = findTargetShopOnRoad(slot, road, commuterShopCounts);
    if (targetShop) {
      commuterShopCounts.set(targetShop, (commuterShopCounts.get(targetShop) ?? 0) + 1);
    }
    const built = buildCityMotorbikeMesh({
      color: slot.color,
      variant: idx % 3 === 0 ? 'sport' : 'scooter',
      includeRider: true,
      kickstandTilt: false,
      noMerge: true,
    });
    compactDynamicVehicleMeshes(built.group, built.wheels, built.riderGroup);
    built.group.position.set(slot.parkX, getWestBikeGroundY(slot.parkX, slot.parkZ), slot.parkZ);
    built.group.rotation.set(0, slot.parkYaw, 0.09);
    if (built.riderGroup) built.riderGroup.visible = false;
    dynamicGroup.add(built.group);

    const ownerRig = createResidentNpcRig('walker', slot.doorX, 0.04, slot.doorZ, slot.parkYaw, idx * 0.67, 1080 + idx, {
      speed: 1.05,
    });
    ownerRig.grp.visible = false;
    ownerRig.glbHandle.setVisible(false);
    dynamicGroup.add(ownerRig.grp);

    const agent: DrivewayCommuterBikeAgent = {
      id: 3000 + idx,
      homeSlot: slot,
      road,
      targetShop,
      bikeRoot: built.group,
      wheels: built.wheels,
      wheelR: built.wheelR,
      riderGroup: built.riderGroup,
      headlightMat: built.headlightMat,
      brakeMat: built.brakeMat,
      ownerRig,
      state: 'parked_home',
      bikeX: slot.parkX,
      bikeZ: slot.parkZ,
      bikeYaw: slot.parkYaw,
      bikeLean: 0.09,
      ownerX: slot.doorX,
      ownerZ: slot.doorZ,
      ownerYaw: slot.parkYaw,
      rideSpeed: 5.4 + (idx % 4) * 0.45,
      walkSpeed: 1.06,
      path: [],
      pathIdx: 0,
      seatIdx: -1,
      timer: 2.0 + (idx % 6) * 2.2,
      phase: idx * 0.71,
    };

    // Stagger initial commuter phases so driveway bikes are ALREADY pulling out, riding to eateries, and dining!
    const initMod = idx % 4;
    if (initMod === 0) {
      // Owner is walking out front door toward their driveway bike right away!
      agent.state = 'walk_to_bike';
      agent.ownerX = slot.doorX;
      agent.ownerZ = slot.doorZ;
      agent.path = [{ x: slot.parkX, z: slot.parkZ }];
      agent.pathIdx = 0;
      agent.ownerRig.grp.position.set(agent.ownerX, 0.04, agent.ownerZ);
    } else if (initMod === 1) {
      // Bike is already pulling out onto the street heading to an eatery!
      const outPath = buildDrivewayOutboundPath(slot, road, targetShop);
      agent.state = 'ride_to_eatery';
      agent.path = outPath;
      agent.pathIdx = 1;
      agent.bikeX = outPath[0].x;
      agent.bikeZ = outPath[0].z;
      agent.bikeLean = 0;
      if (agent.riderGroup) agent.riderGroup.visible = true;
      agent.bikeRoot.position.set(agent.bikeX, getWestBikeGroundY(agent.bikeX, agent.bikeZ), agent.bikeZ);
    } else if (initMod === 2 && targetShop) {
      // Bike parked at eatery curb while owner is dining inside!
      agent.state = 'dining_at_eatery';
      agent.bikeX = targetShop.curbParkX;
      agent.bikeZ = targetShop.curbParkZ;
      agent.bikeYaw = targetShop.curbParkYaw;
      agent.bikeLean = 0.09;
      agent.bikeRoot.position.set(agent.bikeX, getWestBikeGroundY(agent.bikeX, agent.bikeZ), agent.bikeZ);
      agent.bikeRoot.rotation.set(0, agent.bikeYaw, agent.bikeLean);
      agent.ownerX = targetShop.orderX;
      agent.ownerZ = targetShop.orderZ;
      agent.ownerYaw = targetShop.orderYaw;
      agent.timer = 6.0 + (idx % 5) * 1.8;
      agent.ownerRig.grp.position.set(agent.ownerX, 0.06, agent.ownerZ);
    }
    drivewayCommuters.push(agent);
  });

  // --- E. 32 PROXIMITY-POOLED STREET LIFE NPCS (16 STALL/BUS/BENCH HANGOUTS + 16 SIDEWALK/ALLEY STROLLERS!) ---
  interface StreetHangoutAgent {
    rig: ResidentNpcAgent;
    spotIdx: number;
    phase: number;
  }
  interface StreetStrollerAgent {
    rig: ResidentNpcAgent;
    segIdx: number;
    t: number;
    dir: 1 | -1;
    speed: number;
    yaw: number;
    phase: number;
  }

  const STREET_HANGOUT_POOL_SIZE = 16;
  const STREET_STROLLER_POOL_SIZE = 16;
  const streetHangoutAgents: StreetHangoutAgent[] = [];
  const streetStrollerAgents: StreetStrollerAgent[] = [];
  const streetHangoutSpots: StreetHangoutSpot[] = streetscape.hangoutSpots;
  const streetWalkSegments: StreetWalkSegment[] = streetscape.walkSegments;

  for (let i = 0; i < STREET_HANGOUT_POOL_SIZE; i++) {
    const rig = createResidentNpcRig('home_idle', -9999, 0.04, -9999, 0, i * 0.53, 1220 + i, { speed: 0.9 });
    rig.grp.visible = false;
    rig.glbHandle.setVisible(false);
    dynamicGroup.add(rig.grp);
    streetHangoutAgents.push({ rig, spotIdx: -1, phase: i * 0.77 });
  }
  for (let i = 0; i < STREET_STROLLER_POOL_SIZE; i++) {
    const rig = createResidentNpcRig('walker', -9999, 0.04, -9999, 0, i * 0.67, 1300 + i, { speed: 1.04 });
    rig.grp.visible = false;
    rig.glbHandle.setVisible(false);
    dynamicGroup.add(rig.grp);
    streetStrollerAgents.push({
      rig,
      segIdx: -1,
      t: (i * 0.23) % 1,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 0.92 + (i % 5) * 0.08,
      yaw: 0,
      phase: i * 0.81,
    });
  }

  const nearestHangoutIdx = new Int32Array(STREET_HANGOUT_POOL_SIZE);
  const nearestHangoutDistSq = new Float64Array(STREET_HANGOUT_POOL_SIZE);
  const nearestStrollIdx = new Int32Array(STREET_STROLLER_POOL_SIZE);
  const nearestStrollDistSq = new Float64Array(STREET_STROLLER_POOL_SIZE);
  const assignedHangoutSet = new Set<number>();
  const assignedStrollSet = new Set<number>();
  let streetLifeAssignTimer = 0;
  let lastStreetLifeX = 1e9;
  let lastStreetLifeZ = 1e9;

  // Zero-GC scratch buffer recording active walking NPC coordinates that trigger automatic sliding doors!
  const MAX_DOOR_TRIGGER_NPCS = 140;
  const doorTriggerCoords = new Float32Array(MAX_DOOR_TRIGGER_NPCS * 2);
  let doorTriggerCount = 0;
  const pushDoorTriggerNpc = (x: number, z: number) => {
    if (doorTriggerCount >= MAX_DOOR_TRIGGER_NPCS) return;
    const base = doorTriggerCount * 2;
    doorTriggerCoords[base] = x;
    doorTriggerCoords[base + 1] = z;
    doorTriggerCount++;
  };

  // =========================================================================
  // 12. ANIMATION, TRAFFIC & DAY/NIGHT WARM WINDOW LIGHTING UPDATE LOOP
  // =========================================================================
  let animClock = 0;
  let lastLampFactor = -1;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerX?: number,
    playerZ?: number,
    camX?: number,
    camZ?: number,
    camFwdX?: number,
    camFwdZ?: number
  ) => {
    const dt = Math.min(delta, 0.1);
    animClock += dt;
    const hasPlayer = playerX !== undefined && playerZ !== undefined;
    const px = playerX ?? 0;
    const pz = playerZ ?? 0;
    const refX = camX ?? px;
    const refZ = camZ ?? pz;
    const hasCamCone = camFwdX !== undefined && camFwdZ !== undefined;
    const fwdX = camFwdX ?? 0;
    const fwdZ = camFwdZ ?? -1;
    const isVisInCone = (x: number, z: number, maxDistSq: number): boolean => {
      if (!hasPlayer) return true;
      const dx = x - refX;
      const dz = z - refZ;
      const dSq = dx * dx + dz * dz;
      if (dSq > maxDistSq) return false;
      if (!hasCamCone || dSq <= 225) return true; // Keep 15m 360deg sphere always visible
      const dotPlus = dx * fwdX + dz * fwdZ + 9.0;
      return dotPlus > 0 && dotPlus * dotPlus >= 0.08 * dSq;
    };
    const marketsOpenNow = isResidentialMarketOpenAtHour(rawHour);

    // Update both traditional markets (07:00 - 18:00 shutters, open/closed banner, lights & outdoor carts)
    let maxMarketClosed = 0;
    for (let i = 0; i < marketControllers.length; i++) {
      const cf = marketControllers[i].updateMarketState(dt, rawHour, lampFactor);
      if (cf > maxMarketClosed) maxMarketClosed = cf;
    }
    marketsClosedFactor = maxMarketClosed;
    doorTriggerCount = 0;

    // Bright warm residential interior/facade & upgraded streetlamp glow at dusk/night (skip redundant writes)
    const lampChanged = Math.abs(lampFactor - lastLampFactor) > 0.005;
    if (lampChanged) {
      lastLampFactor = lampFactor;
      const nightOn = lampFactor > 0.02;
      warmWinMatA.emissiveIntensity = 0.12 + lampFactor * 2.35;
      warmWinMatB.emissiveIntensity = 0.10 + lampFactor * 2.15;
      coolWinMatC.emissiveIntensity = 0.08 + lampFactor * 1.75;
      lanternGlowMat.emissiveIntensity = nightOn ? 0.45 + lampFactor * 5.2 : 0.05;
      housePorchGlowMat.emissiveIntensity = nightOn ? 0.35 + lampFactor * 3.85 : 0.05;
      interiorCeilingGlowMat.emissiveIntensity = 0.72 + lampFactor * 2.35;
      interiorWallMat.emissiveIntensity = 0.04 + lampFactor * 0.62;
      interiorFloorWoodMat.emissiveIntensity = lampFactor * 0.36;
      curtainMat.emissiveIntensity = lampFactor * 0.56;
      tvScreenMat.emissiveIntensity = 0.38 + lampFactor * 0.95;

      const facadeEmis = lampFactor * 0.17;
      for (let i = 0; i < resFacadeWallMats.length; i++) {
        resFacadeWallMats[i].emissiveIntensity = facadeEmis;
      }
      const innerBounceEmis = 0.04 + lampFactor * 0.48;
      for (let i = 0; i < resInteriorBounceMats.length; i++) {
        resInteriorBounceMats[i].emissiveIntensity = innerBounceEmis;
      }
      const floorBounceEmis = lampFactor * 0.24;
      for (let i = 0; i < resFloorBounceMats.length; i++) {
        resFloorBounceMats[i].emissiveIntensity = floorBounceEmis;
      }

      tapHoaSignMat.emissiveIntensity = 0.35 + lampFactor * 1.05;
      comSignMat.emissiveIntensity = 0.35 + lampFactor * 1.05;
      alleySignMat.emissiveIntensity = 0.38 + lampFactor * 1.1;
      laundSignMat.emissiveIntensity = 0.34 + lampFactor * 1.0;

      warmPoolMat.opacity = lampFactor * 0.96;
      warmPoolMat.visible = nightOn;
      housePorchPoolMat.opacity = lampFactor * 0.72;
      housePorchPoolMat.visible = nightOn;
      lampHaloShellMat.opacity = lampFactor * 0.92;
      lampHaloShellMat.visible = nightOn;
    }

    // Reposition our 8 real warm PointLights under the 8 nearest streetlamps around the player (zero GC!)
    if (hasPlayer) {
      const inResArea = px >= -995 && px <= 130 && pz >= -170 && pz <= 390;
      resLightProxScale = inResArea ? 1.0 : 0.0;
      if (inResArea && lampFactor > 0.02) {
        const moveDx = px - lastLampAssignX;
        const moveDz = pz - lastLampAssignZ;
        if (moveDx * moveDx + moveDz * moveDz > 4.0) {
          lastLampAssignX = px;
          lastLampAssignZ = pz;
          for (let k = 0; k < DYNAMIC_LAMP_LIGHT_COUNT; k++) {
            nearestLampIdx[k] = -1;
            nearestLampDistSq[k] = 1e18;
          }
          for (let i = 0; i < streetLampSpots.length; i++) {
            const sp = streetLampSpots[i];
            const dx = sp.x - px;
            const dz = sp.z - pz;
            const dSq = dx * dx + dz * dz;
            if (dSq >= nearestLampDistSq[DYNAMIC_LAMP_LIGHT_COUNT - 1]) continue;
            let pos = DYNAMIC_LAMP_LIGHT_COUNT - 1;
            while (pos > 0 && dSq < nearestLampDistSq[pos - 1]) {
              nearestLampDistSq[pos] = nearestLampDistSq[pos - 1];
              nearestLampIdx[pos] = nearestLampIdx[pos - 1];
              pos--;
            }
            nearestLampDistSq[pos] = dSq;
            nearestLampIdx[pos] = i;
          }
          for (let k = 0; k < DYNAMIC_LAMP_LIGHT_COUNT; k++) {
            const idx = nearestLampIdx[k];
            if (idx >= 0) {
              const sp = streetLampSpots[idx];
              dynamicLampLights[k].position.set(sp.x, 5.1, sp.z);
            }
          }
        }
      }
    } else {
      resLightProxScale = 0.0;
    }

    const headIntensity = 0.45 + lampFactor * 1.45;
    const brakeIntensity = 0.55 + lampFactor * 1.05;

    // 1. Update 36 Dynamic Rotating Market Shoppers (walk in -> buy at 2-3 stalls -> fill basket -> exit via gates)
    for (let i = 0; i < marketShoppers.length; i++) {
      const sh = marketShoppers[i];
      const ctrl = sh.ctrl;

      // If markets close (18:00 - 07:00), finish up and head out through the nearest gate
      if (!marketsOpenNow && (sh.state === 'buying' || sh.state === 'walking_to_stall')) {
        if (sh.targetStall && sh.targetStall.occupiedBy === sh.id) {
          sh.targetStall.occupiedBy = null;
        }
        sh.targetStall = null;
        let bestGate = ctrl.gates[0];
        let bestD = 1e9;
        for (let g = 0; g < ctrl.gates.length; g++) {
          const d = Math.hypot(ctrl.gates[g].outX - sh.x, ctrl.gates[g].outZ - sh.z);
          if (d < bestD) {
            bestD = d;
            bestGate = ctrl.gates[g];
          }
        }
        sh.targetGate = bestGate;
        sh.path = buildStallToGatePath(ctrl, sh.x, bestGate, sh.laneX, sh.laneZ);
        sh.pathIdx = 0;
        sh.state = 'leaving_market';
      }

      if (sh.state === 'outside_wait') {
        sh.rig.grp.visible = false;
        sh.rig.glbHandle.setVisible(false);
        if (marketsOpenNow && marketsClosedFactor < 0.2) {
          sh.timer -= dt;
          if (sh.timer <= 0) {
            const stall = pickFreeMarketStall(ctrl, sh.id, -1, sh);
            if (stall) {
              const gate = ctrl.gates[Math.floor(nextShopperRand(sh) * ctrl.gates.length)];
              sh.targetGate = gate;
              sh.targetStall = stall;
              sh.x = gate.outX;
              sh.z = gate.outZ;
              sh.stallsVisited = 0;
              sh.maxStallsPerTrip = 2 + (nextShopperRand(sh) > 0.45 ? 1 : 0);
              sh.basketGoods.visible = false;
              sh.path = buildGateToStallPath(ctrl, gate, stall, sh.laneX, sh.laneZ);
              sh.pathIdx = 0;
              sh.state = 'walking_to_stall';
            } else {
              sh.timer = 1.6;
            }
          }
        }
        continue;
      }

      if (!marketsOpenNow && marketsClosedFactor > 0.85) {
        if (sh.targetStall && sh.targetStall.occupiedBy === sh.id) sh.targetStall.occupiedBy = null;
        sh.targetStall = null;
        sh.state = 'outside_wait';
        sh.timer = 1.5 + nextShopperRand(sh) * 4.5;
        sh.rig.grp.visible = false;
        sh.rig.glbHandle.setVisible(false);
        continue;
      }

      if (sh.state === 'walking_to_stall' || sh.state === 'leaving_market') {
        const pt = sh.path[sh.pathIdx];
        if (pt) {
          const dx = pt.x - sh.x;
          const dz = pt.z - sh.z;
          const dist = Math.hypot(dx, dz);
          const step = sh.speed * dt;
          if (dist <= step + 0.06) {
            sh.x = pt.x;
            sh.z = pt.z;
            sh.pathIdx++;
          } else {
            sh.x += (dx / dist) * step;
            sh.z += (dz / dist) * step;
            sh.yaw = lerpAngle(sh.yaw, Math.atan2(dx, dz), dt * 7.0);
          }
        }
        if (sh.pathIdx >= sh.path.length) {
          if (sh.state === 'walking_to_stall' && sh.targetStall) {
            sh.state = 'buying';
            sh.timer = 5.2 + nextShopperRand(sh) * 5.2;
          } else {
            sh.state = 'outside_wait';
            sh.timer = 1.8 + nextShopperRand(sh) * 4.5;
            sh.rig.grp.visible = false;
            sh.rig.glbHandle.setVisible(false);
            continue;
          }
        }
      } else if (sh.state === 'buying') {
        if (sh.targetStall) {
          sh.yaw = lerpAngle(sh.yaw, sh.targetStall.faceYaw, dt * 6.0);
        }
        sh.timer -= dt;
        if (sh.timer <= 0) {
          const finishedId = sh.targetStall?.id ?? -1;
          if (sh.targetStall && sh.targetStall.occupiedBy === sh.id) {
            sh.targetStall.occupiedBy = null;
          }
          sh.targetStall = null;
          sh.stallsVisited++;
          sh.basketGoods.visible = true; // Basket visibly fills with fresh market produce/goods!

          const nextStall =
            marketsOpenNow && sh.stallsVisited < sh.maxStallsPerTrip
              ? pickFreeMarketStall(ctrl, sh.id, finishedId, sh)
              : null;
          if (nextStall) {
            sh.targetStall = nextStall;
            sh.path = buildStallToStallPath(ctrl, sh.x, nextStall, sh.laneZ);
            sh.pathIdx = 0;
            sh.state = 'walking_to_stall';
          } else {
            const exitGate = ctrl.gates[Math.floor(nextShopperRand(sh) * ctrl.gates.length)];
            sh.targetGate = exitGate;
            sh.path = buildStallToGatePath(ctrl, sh.x, exitGate, sh.laneX, sh.laneZ);
            sh.pathIdx = 0;
            sh.state = 'leaving_market';
          }
        }
      }

      const vis = isVisInCone(sh.x, sh.z, 8100); // 90m + camera view cone
      sh.rig.grp.visible = vis;
      sh.rig.glbHandle.setVisible(vis);
      if (!vis) continue;

      sh.rig.grp.position.set(sh.x, 0.1, sh.z);
      sh.rig.grp.rotation.y = sh.yaw;
      if (sh.state === 'buying') {
        sh.rig.glbHandle.setAnimState('Idle', 0.95);
        sh.basketRoot.rotation.x = Math.sin(animClock * 1.4 + sh.rig.phase) * 0.04;
        if (sh.rig.proxyGrp.visible) {
          sh.rig.leftLeg.rotation.x = 0;
          sh.rig.rightLeg.rotation.x = 0;
          sh.rig.leftArm.rotation.x = -0.24 + Math.sin(animClock * 2.2 + sh.rig.phase) * 0.14;
          sh.rig.rightArm.rotation.x = -0.18;
        }
      } else {
        sh.rig.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(sh.speed / 1.32, 0.72, 0.96));
        sh.basketRoot.rotation.x = Math.sin(animClock * sh.speed * 3.2 + sh.rig.phase) * 0.14;
        if (sh.rig.proxyGrp.visible) {
          const swing = Math.sin(animClock * sh.speed * 3.2 + sh.rig.phase) * 0.34;
          sh.rig.leftLeg.rotation.x = swing;
          sh.rig.rightLeg.rotation.x = -swing;
          sh.rig.leftArm.rotation.x = -swing * 0.65;
          sh.rig.rightArm.rotation.x = -0.16 + swing * 0.25;
        }
      }
    }

    // 2. Update 40 Proximity-Pooled Indoor Resident NPCs (closest 8 houses get 2 family members; all nearby houses >= 1!)
    if (hasPlayer && houseSlots.length > 0) {
      indoorAssignTimer -= dt;
      const moveD2 = (px - lastIndoorAssignX) * (px - lastIndoorAssignX) + (pz - lastIndoorAssignZ) * (pz - lastIndoorAssignZ);
      if (indoorAssignTimer <= 0 || moveD2 > 20.0) {
        indoorAssignTimer = 0.6;
        lastIndoorAssignX = px;
        lastIndoorAssignZ = pz;
        const uniqueSlotTarget = 32;
        for (let k = 0; k < uniqueSlotTarget; k++) {
          nearestHouseSlotIdx[k] = -1;
          nearestHouseSlotDistSq[k] = 74 * 74;
        }
        for (let i = 0; i < houseSlots.length; i++) {
          const hs = houseSlots[i];
          if (walkableShopCoordKeys.has(`${Math.round(hs.cx * 10)}:${Math.round(hs.cz * 10)}`)) continue;
          const dx = hs.cx - px;
          const dz = hs.cz - pz;
          const dSq = dx * dx + dz * dz;
          if (dSq >= nearestHouseSlotDistSq[uniqueSlotTarget - 1]) continue;
          let pos = uniqueSlotTarget - 1;
          while (pos > 0 && dSq < nearestHouseSlotDistSq[pos - 1]) {
            nearestHouseSlotDistSq[pos] = nearestHouseSlotDistSq[pos - 1];
            nearestHouseSlotIdx[pos] = nearestHouseSlotIdx[pos - 1];
            pos--;
          }
          nearestHouseSlotDistSq[pos] = dSq;
          nearestHouseSlotIdx[pos] = i;
        }
        assignedHouseCounts.clear();
        for (let i = 0; i < indoorResidents.length; i++) {
          const a = indoorResidents[i];
          if (a.slotIdx >= 0) {
            const cur = houseSlots[a.slotIdx];
            const dSq = (cur.cx - px) * (cur.cx - px) + (cur.cz - pz) * (cur.cz - pz);
            if (dSq <= 78 * 78) {
              assignedHouseCounts.set(a.slotIdx, (assignedHouseCounts.get(a.slotIdx) ?? 0) + 1);
            } else {
              a.slotIdx = -1;
            }
          }
        }
        // Pass 1: Guarantee 1 resident in each of the 32 nearest houses; Pass 2: Add a 2nd family member ONLY in residential homes (never commercial shops)!
        for (let pass = 0; pass < 2; pass++) {
          const maxK = pass === 0 ? uniqueSlotTarget : 8;
          const reqCount = pass + 1;
          for (let k = 0; k < maxK; k++) {
            const sIdx = nearestHouseSlotIdx[k];
            if (sIdx < 0) continue;
            if (pass === 1 && houseSlots[sIdx].isShop) continue;
            if ((assignedHouseCounts.get(sIdx) ?? 0) >= reqCount) continue;
            let pick = -1;
            let worstDistSq = -1;
            for (let i = 0; i < indoorResidents.length; i++) {
              const a = indoorResidents[i];
              if (a.slotIdx < 0) {
                pick = i;
                break;
              }
              const cur = houseSlots[a.slotIdx];
              const dSq = (cur.cx - px) * (cur.cx - px) + (cur.cz - pz) * (cur.cz - pz);
              if (dSq > worstDistSq && dSq > nearestHouseSlotDistSq[k] + 64) {
                worstDistSq = dSq;
                pick = i;
              }
            }
            if (pick >= 0) {
              const oldSlot = indoorResidents[pick].slotIdx;
              if (oldSlot >= 0) {
                assignedHouseCounts.set(oldSlot, Math.max(0, (assignedHouseCounts.get(oldSlot) ?? 1) - 1));
              }
              assignIndoorResidentToSlot(indoorResidents[pick], sIdx, sIdx * 7 + pick + pass);
              assignedHouseCounts.set(sIdx, (assignedHouseCounts.get(sIdx) ?? 0) + 1);
            }
          }
        }
      }
    }

    for (let i = 0; i < indoorResidents.length; i++) {
      const a = indoorResidents[i];
      if (a.slotIdx < 0 || !hasPlayer) {
        a.rig.grp.visible = false;
        a.rig.glbHandle.setVisible(false);
        continue;
      }
      const slot = houseSlots[a.slotIdx];
      const vis = isVisInCone(a.x, a.z, 4900); // 70m + camera view cone
      a.rig.grp.visible = vis;
      a.rig.glbHandle.setVisible(vis);
      if (!vis) continue;

      if (a.state === 'walk_to_kitchen' || a.state === 'walk_to_mid' || a.state === 'walk_to_sofa') {
        const dx = a.targetX - a.x;
        const dz = a.targetZ - a.z;
        const dist = Math.hypot(dx, dz);
        const step = a.speed * dt;
        if (dist <= step + 0.05) {
          a.x = a.targetX;
          a.z = a.targetZ;
          a.yaw = a.targetYaw;
          if (a.state === 'walk_to_kitchen') {
            a.state = 'cook_kitchen';
            a.timer = 8.5 + ((i * 3) % 6) * 1.1;
          } else if (a.state === 'walk_to_mid') {
            a.state = 'tidy_mid';
            a.timer = 6.5 + ((i * 5) % 5) * 1.1;
          } else {
            a.state = 'sit_sofa';
            a.timer = 11.0 + ((i * 7) % 7) * 1.3;
          }
        } else {
          a.x += (dx / dist) * step;
          a.z += (dz / dist) * step;
          a.yaw = lerpAngle(a.yaw, Math.atan2(dx, dz), dt * 6.5);
        }
        a.rig.grp.position.set(a.x, 0.08, a.z);
        a.rig.grp.rotation.y = a.yaw;
        a.rig.glbHandle.setAnimState('Walk', 0.78);
        if (a.rig.proxyGrp.visible) {
          const swing = Math.sin(animClock * 3.0 + a.phase) * 0.3;
          a.rig.leftLeg.rotation.x = swing;
          a.rig.rightLeg.rotation.x = -swing;
          a.rig.leftArm.rotation.x = -swing * 0.6;
          a.rig.rightArm.rotation.x = swing * 0.6;
        }
      } else {
        a.timer -= dt;
        a.rig.grp.position.set(a.x, 0.08, a.z);
        if (a.state === 'sit_sofa' && !slot.isShop) {
          a.rig.grp.rotation.y = slot.sofaYaw + Math.sin(animClock * 0.65 + a.phase) * 0.14;
          a.rig.glbHandle.setAnimState('Sit', 1.0);
        } else {
          a.rig.grp.rotation.y = a.yaw + Math.sin(animClock * 0.9 + a.phase) * 0.24;
          a.rig.glbHandle.setAnimState('Idle', 0.96);
          if (a.rig.proxyGrp.visible) {
            a.rig.rightArm.rotation.x = -0.28 + Math.sin(animClock * 2.4 + a.phase) * 0.16;
            a.rig.leftArm.rotation.x = -0.18 + Math.cos(animClock * 2.0 + a.phase) * 0.1;
          }
        }
        if (a.timer <= 0) {
          if (a.state === 'sit_sofa') {
            a.state = 'walk_to_kitchen';
            a.targetX = slot.kitchenX;
            a.targetZ = slot.kitchenZ;
            a.targetYaw = slot.kitchenYaw;
          } else if (a.state === 'cook_kitchen') {
            a.state = 'walk_to_mid';
            a.targetX = slot.midX;
            a.targetZ = slot.midZ;
            a.targetYaw = slot.midYaw;
          } else {
            a.state = 'walk_to_sofa';
            a.targetX = slot.sofaX;
            a.targetZ = slot.sofaZ;
            a.targetYaw = slot.sofaYaw;
          }
        }
      }
    }

    // 3. Update 20 Proximity-Pooled Walkable Shop & Eatery Patrons (walking in/out through auto doors & dining!)
    for (let i = 0; i < shopPatrons.length; i++) {
      const p = shopPatrons[i];
      if (!hasPlayer || walkableShopSlots.length === 0) {
        p.rig.grp.visible = false;
        p.rig.glbHandle.setVisible(false);
        continue;
      }
      // Reassign idle or far-away (>86m) patrons to nearby walkable shops around the player
      let needAssign = p.state === 'idle_pool' || p.shopIdx < 0;
      if (!needAssign) {
        const sh = walkableShopSlots[p.shopIdx];
        if ((sh.cx - px) * (sh.cx - px) + (sh.cz - pz) * (sh.cz - pz) > 88 * 88) {
          releasePatronSeat(p);
          p.shopIdx = -1;
          p.state = 'idle_pool';
          needAssign = true;
        }
      }
      if (needAssign) {
        p.timer -= dt;
        if (p.timer <= 0) {
          // Pick a nearby walkable shop within 82m strictly respecting per-shop customer capacity limits (2..3 patrons max!)
          let pickedShop = -1;
          let bestScore = 1e9;
          for (let s = 0; s < walkableShopSlots.length; s++) {
            const sh = walkableShopSlots[s];
            const dSq = (sh.cx - px) * (sh.cx - px) + (sh.cz - pz) * (sh.cz - pz);
            if (dSq > 82 * 82) continue;
            const maxCap =
              sh.theme === 'mini_mart' || sh.theme === 'billiard_net' || sh.id === 'shop_n1_suaxe_chubay'
                ? 2
                : Math.min(3, Math.max(2, sh.seats.length));
            let curCount = 0;
            for (let k = 0; k < shopPatrons.length; k++) {
              if (shopPatrons[k].shopIdx === s) curCount++;
            }
            for (let k = 0; k < drivewayCommuters.length; k++) {
              const dc = drivewayCommuters[k];
              if (
                dc.targetShop === sh &&
                (dc.state === 'ride_to_eatery' || dc.state === 'walk_into_eatery' || dc.state === 'dining_at_eatery')
              ) {
                curCount++;
              }
            }
            if (curCount >= maxCap) continue;
            const score = curCount * 2200 + dSq;
            if (score < bestScore) {
              bestScore = score;
              pickedShop = s;
            }
          }
          if (pickedShop >= 0) {
            assignPatronToShop(p, pickedShop, i % 2);
          } else {
            p.timer = 1.0;
          }
        }
        p.rig.grp.visible = false;
        p.rig.glbHandle.setVisible(false);
        continue;
      }

      const shop = walkableShopSlots[p.shopIdx];
      if (p.state === 'walk_in' || p.state === 'walk_to_seat' || p.state === 'walk_out') {
        const pt = p.path[p.pathIdx];
        if (pt) {
          const dx = pt.x - p.x;
          const dz = pt.z - p.z;
          const dist = Math.hypot(dx, dz);
          const step = p.speed * dt;
          if (dist <= step + 0.05) {
            p.x = pt.x;
            p.z = pt.z;
            p.pathIdx++;
          } else {
            p.x += (dx / dist) * step;
            p.z += (dz / dist) * step;
            p.yaw = lerpAngle(p.yaw, Math.atan2(dx, dz), dt * 7.2);
          }
        }
        pushDoorTriggerNpc(p.x, p.z);
        if (p.pathIdx >= p.path.length) {
          if (p.state === 'walk_in') {
            p.state = 'ordering';
            p.yaw = shop.orderYaw;
            p.timer = 3.2 + (i % 5) * 0.7;
          } else if (p.state === 'walk_to_seat') {
            p.state = 'dining';
            if (p.seatIdx >= 0 && shop.seats[p.seatIdx]) {
              p.yaw = shop.seats[p.seatIdx].yaw;
            }
            p.timer = 11.0 + (i % 6) * 1.9;
          } else {
            releasePatronSeat(p);
            p.shopIdx = -1;
            p.state = 'idle_pool';
            p.timer = 1.2 + (i % 4) * 0.8;
            p.rig.grp.visible = false;
            p.rig.glbHandle.setVisible(false);
            continue;
          }
        }
      } else if (p.state === 'ordering') {
        p.yaw = lerpAngle(p.yaw, shop.orderYaw, dt * 6.0);
        p.timer -= dt;
        if (p.timer <= 0) {
          const freeIdx = shop.seats.findIndex((s) => s.occupiedBy === null);
          if (freeIdx >= 0) {
            shop.seats[freeIdx].occupiedBy = p.id;
            p.seatIdx = freeIdx;
            p.path = [{ x: shop.seats[freeIdx].x, z: shop.seats[freeIdx].z }];
            p.pathIdx = 0;
            p.state = 'walk_to_seat';
          } else {
            const departX = shop.sidewalkX + (i % 2 === 0 ? 6.0 : -6.0);
            p.path = [
              { x: shop.doorX, z: shop.doorZ },
              { x: shop.doorX, z: shop.sidewalkZ },
              { x: departX, z: shop.sidewalkZ },
            ];
            p.pathIdx = 0;
            p.state = 'walk_out';
          }
        }
      } else if (p.state === 'dining') {
        p.timer -= dt;
        if (p.timer <= 0) {
          releasePatronSeat(p);
          const departX = shop.sidewalkX + (i % 2 === 0 ? 6.5 : -6.5);
          p.path = [
            { x: shop.doorX, z: shop.doorZ },
            { x: shop.doorX, z: shop.sidewalkZ },
            { x: departX, z: shop.sidewalkZ },
          ];
          p.pathIdx = 0;
          p.state = 'walk_out';
        }
      }

      const vis = isVisInCone(p.x, p.z, 6084); // 78m + camera view cone
      p.rig.grp.visible = vis;
      p.rig.glbHandle.setVisible(vis);
      if (!vis) continue;

      p.rig.grp.position.set(p.x, p.state === 'dining' ? 0.06 : 0.04, p.z);
      p.rig.grp.rotation.y = p.yaw;
      if (p.state === 'dining') {
        p.rig.glbHandle.setAnimState('Sit', 1.0);
        p.rig.grp.rotation.y = p.yaw + Math.sin(animClock * 1.1 + p.phase) * 0.12;
      } else if (p.state === 'ordering') {
        p.rig.glbHandle.setAnimState('Idle', 1.0);
      } else {
        p.rig.glbHandle.setAnimState('Walk', 0.85);
        if (p.rig.proxyGrp.visible) {
          const swing = Math.sin(animClock * 3.3 + p.phase) * 0.34;
          p.rig.leftLeg.rotation.x = swing;
          p.rig.rightLeg.rotation.x = -swing;
          p.rig.leftArm.rotation.x = -swing * 0.65;
          p.rig.rightArm.rotation.x = swing * 0.65;
        }
      }
    }

    // 4. Update 22 Active Driveway & Eatery Commuter Motorbikes (residents take yard bikes -> ride to eat -> ride home!)
    for (let i = 0; i < drivewayCommuters.length; i++) {
      const c = drivewayCommuters[i];
      const slot = c.homeSlot;
      const shop = c.targetShop;
      let bikeMoving = false;
      let bikeStepDist = 0;
      let showOwnerWalking = false;

      if (c.state === 'parked_home') {
        c.timer -= dt;
        if (c.timer <= 0) {
          c.state = 'walk_to_bike';
          c.ownerX = slot.doorX;
          c.ownerZ = slot.doorZ;
          c.path = [{ x: slot.parkX, z: slot.parkZ }];
          c.pathIdx = 0;
        }
      } else if (c.state === 'walk_to_bike' || c.state === 'walk_into_eatery' || c.state === 'walk_out_eatery' || c.state === 'walk_home_inside') {
        showOwnerWalking = true;
        const pt = c.path[c.pathIdx];
        if (pt) {
          const dx = pt.x - c.ownerX;
          const dz = pt.z - c.ownerZ;
          const dist = Math.hypot(dx, dz);
          const step = c.walkSpeed * dt;
          if (dist <= step + 0.06) {
            c.ownerX = pt.x;
            c.ownerZ = pt.z;
            c.pathIdx++;
          } else {
            c.ownerX += (dx / dist) * step;
            c.ownerZ += (dz / dist) * step;
            c.ownerYaw = lerpAngle(c.ownerYaw, Math.atan2(dx, dz), dt * 7.5);
          }
        }
        pushDoorTriggerNpc(c.ownerX, c.ownerZ);
        if (c.pathIdx >= c.path.length) {
          if (c.state === 'walk_to_bike') {
            c.state = 'ride_to_eatery';
            c.path = buildDrivewayOutboundPath(slot, c.road, shop);
            c.pathIdx = 0;
            if (c.riderGroup) c.riderGroup.visible = true;
          } else if (c.state === 'walk_into_eatery' && shop) {
            c.state = 'dining_at_eatery';
            c.ownerYaw = c.seatIdx >= 0 && shop.seats[c.seatIdx] ? shop.seats[c.seatIdx].yaw : shop.orderYaw;
            c.timer = 10.5 + (i % 5) * 2.0;
          } else if (c.state === 'walk_out_eatery' && shop) {
            c.state = 'ride_home';
            c.path = buildDrivewayReturnPath(slot, c.road, shop);
            c.pathIdx = 0;
            if (c.riderGroup) c.riderGroup.visible = true;
          } else {
            c.state = 'parked_home';
            c.timer = 9.0 + (i % 6) * 2.4;
          }
        }
      } else if (c.state === 'dining_at_eatery') {
        showOwnerWalking = true;
        c.timer -= dt;
        if (c.timer <= 0 && shop) {
          if (c.seatIdx >= 0 && shop.seats[c.seatIdx]?.occupiedBy === c.id) {
            shop.seats[c.seatIdx].occupiedBy = null;
          }
          c.seatIdx = -1;
          c.state = 'walk_out_eatery';
          c.path = [
            { x: shop.doorX, z: shop.doorZ },
            { x: shop.doorX, z: shop.sidewalkZ },
            { x: shop.curbParkX, z: shop.curbParkZ },
          ];
          c.pathIdx = 0;
        }
      } else if (c.state === 'ride_to_eatery' || c.state === 'ride_home') {
        bikeMoving = true;
        const pt = c.path[c.pathIdx];
        if (pt) {
          const dx = pt.x - c.bikeX;
          const dz = pt.z - c.bikeZ;
          const dist = Math.hypot(dx, dz);
          const slowApproach = c.pathIdx === 0 || c.pathIdx === c.path.length - 1 || dist < 3.5;
          const effSpeed = slowApproach ? c.rideSpeed * 0.56 : c.rideSpeed;
          bikeStepDist = effSpeed * dt;
          if (dist <= bikeStepDist + 0.08) {
            c.bikeX = pt.x;
            c.bikeZ = pt.z;
            c.pathIdx++;
          } else {
            c.bikeX += (dx / dist) * bikeStepDist;
            c.bikeZ += (dz / dist) * bikeStepDist;
            const tYaw = Math.atan2(dx, dz);
            let diff = tYaw - c.bikeYaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            c.bikeYaw += diff * Math.min(1, dt * 6.8);
            c.bikeLean += (THREE.MathUtils.clamp(-diff * 0.22, -0.16, 0.16) - c.bikeLean) * Math.min(1, dt * 7.5);
          }
        }
        if (c.pathIdx >= c.path.length) {
          if (c.riderGroup) c.riderGroup.visible = false;
          if (c.state === 'ride_to_eatery' && shop) {
            c.bikeYaw = shop.curbParkYaw;
            c.bikeLean = 0.09;
            c.ownerX = shop.curbParkX;
            c.ownerZ = shop.curbParkZ;
            const freeSeat = shop.seats.findIndex((s) => s.occupiedBy === null);
            if (freeSeat >= 0) {
              shop.seats[freeSeat].occupiedBy = c.id;
              c.seatIdx = freeSeat;
              c.path = [
                { x: shop.doorX, z: shop.sidewalkZ },
                { x: shop.doorX, z: shop.doorZ },
                { x: shop.orderX, z: shop.orderZ },
                { x: shop.seats[freeSeat].x, z: shop.seats[freeSeat].z },
              ];
            } else {
              c.seatIdx = -1;
              c.path = [
                { x: shop.doorX, z: shop.sidewalkZ },
                { x: shop.doorX, z: shop.doorZ },
                { x: shop.orderX, z: shop.orderZ },
              ];
            }
            c.pathIdx = 0;
            c.state = 'walk_into_eatery';
          } else {
            c.bikeX = slot.parkX;
            c.bikeZ = slot.parkZ;
            c.bikeYaw = slot.parkYaw;
            c.bikeLean = 0.09;
            c.ownerX = slot.parkX;
            c.ownerZ = slot.parkZ;
            c.path = [{ x: slot.doorX, z: slot.doorZ }];
            c.pathIdx = 0;
            c.state = 'walk_home_inside';
          }
        }
      }

      const bikeVis = isVisInCone(c.bikeX, c.bikeZ, 16900); // 130m + camera view cone
      c.bikeRoot.visible = bikeVis;
      if (bikeVis) {
        c.bikeRoot.position.set(c.bikeX, getWestBikeGroundY(c.bikeX, c.bikeZ), c.bikeZ);
        if (!bikeMoving) {
          c.bikeLean += (0.09 - c.bikeLean) * Math.min(1, dt * 6.0);
        }
        c.bikeRoot.rotation.set(0, c.bikeYaw, c.bikeLean);
        if (bikeMoving && bikeStepDist > 0) {
          const spin = bikeStepDist / Math.max(0.15, c.wheelR);
          for (let w = 0; w < c.wheels.length; w++) {
            c.wheels[w].rotation.x += spin;
          }
        }
        c.headlightMat.emissiveIntensity = bikeMoving ? headIntensity : 0.05;
        c.brakeMat.emissiveIntensity = bikeMoving ? brakeIntensity : 0.06;
      }

      const ownerVis = showOwnerWalking && isVisInCone(c.ownerX, c.ownerZ, 8100);
      c.ownerRig.grp.visible = ownerVis;
      c.ownerRig.glbHandle.setVisible(ownerVis);
      if (ownerVis) {
        c.ownerRig.grp.position.set(c.ownerX, c.state === 'dining_at_eatery' ? 0.06 : 0.04, c.ownerZ);
        c.ownerRig.grp.rotation.y = c.ownerYaw;
        if (c.state === 'dining_at_eatery') {
          c.ownerRig.glbHandle.setAnimState(c.seatIdx >= 0 ? 'Sit' : 'Idle', 1.0);
        } else {
          c.ownerRig.glbHandle.setAnimState('Walk', 0.88);
          if (c.ownerRig.proxyGrp.visible) {
            const swing = Math.sin(animClock * 3.4 + c.phase) * 0.34;
            c.ownerRig.leftLeg.rotation.x = swing;
            c.ownerRig.rightLeg.rotation.x = -swing;
            c.ownerRig.leftArm.rotation.x = -swing * 0.65;
            c.ownerRig.rightArm.rotation.x = swing * 0.65;
          }
        }
      }
    }

    // 5. Update 32 Proximity-Pooled Street Life NPCs (16 Stall/Bus/Bench Hangouts + 16 Sidewalk/Alley Strollers!)
    if (hasPlayer && (streetHangoutSpots.length > 0 || streetWalkSegments.length > 0)) {
      streetLifeAssignTimer -= dt;
      const moveD2 = (px - lastStreetLifeX) * (px - lastStreetLifeX) + (pz - lastStreetLifeZ) * (pz - lastStreetLifeZ);
      if (streetLifeAssignTimer <= 0 || moveD2 > 28.0) {
        streetLifeAssignTimer = 0.85;
        lastStreetLifeX = px;
        lastStreetLifeZ = pz;

        // Assign 16 closest stall/bus/bench/park hangout spots within 85m
        for (let k = 0; k < STREET_HANGOUT_POOL_SIZE; k++) {
          nearestHangoutIdx[k] = -1;
          nearestHangoutDistSq[k] = 85 * 85;
        }
        for (let i = 0; i < streetHangoutSpots.length; i++) {
          const sp = streetHangoutSpots[i];
          const dSq = (sp.x - px) * (sp.x - px) + (sp.z - pz) * (sp.z - pz);
          if (dSq >= nearestHangoutDistSq[STREET_HANGOUT_POOL_SIZE - 1]) continue;
          let pos = STREET_HANGOUT_POOL_SIZE - 1;
          while (pos > 0 && dSq < nearestHangoutDistSq[pos - 1]) {
            nearestHangoutDistSq[pos] = nearestHangoutDistSq[pos - 1];
            nearestHangoutIdx[pos] = nearestHangoutIdx[pos - 1];
            pos--;
          }
          nearestHangoutDistSq[pos] = dSq;
          nearestHangoutIdx[pos] = i;
        }
        assignedHangoutSet.clear();
        for (let i = 0; i < streetHangoutAgents.length; i++) {
          const a = streetHangoutAgents[i];
          if (a.spotIdx >= 0) {
            const sp = streetHangoutSpots[a.spotIdx];
            if ((sp.x - px) * (sp.x - px) + (sp.z - pz) * (sp.z - pz) <= 92 * 92) {
              assignedHangoutSet.add(a.spotIdx);
            } else {
              a.spotIdx = -1;
            }
          }
        }
        for (let k = 0; k < STREET_HANGOUT_POOL_SIZE; k++) {
          const sIdx = nearestHangoutIdx[k];
          if (sIdx < 0 || assignedHangoutSet.has(sIdx)) continue;
          let pick = -1;
          for (let i = 0; i < streetHangoutAgents.length; i++) {
            if (streetHangoutAgents[i].spotIdx < 0) {
              pick = i;
              break;
            }
          }
          if (pick >= 0) {
            streetHangoutAgents[pick].spotIdx = sIdx;
            assignedHangoutSet.add(sIdx);
          }
        }

        // Assign 16 closest sidewalk/alley walking segments within 88m
        for (let k = 0; k < STREET_STROLLER_POOL_SIZE; k++) {
          nearestStrollIdx[k] = -1;
          nearestStrollDistSq[k] = 88 * 88;
        }
        for (let i = 0; i < streetWalkSegments.length; i++) {
          const seg = streetWalkSegments[i];
          const mx = (seg.x1 + seg.x2) * 0.5;
          const mz = (seg.z1 + seg.z2) * 0.5;
          const dSq = (mx - px) * (mx - px) + (mz - pz) * (mz - pz);
          if (dSq >= nearestStrollDistSq[STREET_STROLLER_POOL_SIZE - 1]) continue;
          let pos = STREET_STROLLER_POOL_SIZE - 1;
          while (pos > 0 && dSq < nearestStrollDistSq[pos - 1]) {
            nearestStrollDistSq[pos] = nearestStrollDistSq[pos - 1];
            nearestStrollIdx[pos] = nearestStrollIdx[pos - 1];
            pos--;
          }
          nearestStrollDistSq[pos] = dSq;
          nearestStrollIdx[pos] = i;
        }
        assignedStrollSet.clear();
        for (let i = 0; i < streetStrollerAgents.length; i++) {
          const a = streetStrollerAgents[i];
          if (a.segIdx >= 0) {
            const seg = streetWalkSegments[a.segIdx];
            const mx = (seg.x1 + seg.x2) * 0.5;
            const mz = (seg.z1 + seg.z2) * 0.5;
            if ((mx - px) * (mx - px) + (mz - pz) * (mz - pz) <= 95 * 95) {
              assignedStrollSet.add(a.segIdx);
            } else {
              a.segIdx = -1;
            }
          }
        }
        for (let k = 0; k < STREET_STROLLER_POOL_SIZE; k++) {
          const sIdx = nearestStrollIdx[k];
          if (sIdx < 0 || assignedStrollSet.has(sIdx)) continue;
          let pick = -1;
          for (let i = 0; i < streetStrollerAgents.length; i++) {
            if (streetStrollerAgents[i].segIdx < 0) {
              pick = i;
              break;
            }
          }
          if (pick >= 0) {
            streetStrollerAgents[pick].segIdx = sIdx;
            streetStrollerAgents[pick].t = ((pick * 0.19 + sIdx * 0.37) % 0.8) + 0.1;
            assignedStrollSet.add(sIdx);
          }
        }
      }
    }

    for (let i = 0; i < streetHangoutAgents.length; i++) {
      const a = streetHangoutAgents[i];
      if (!hasPlayer || a.spotIdx < 0) {
        a.rig.grp.visible = false;
        a.rig.glbHandle.setVisible(false);
        continue;
      }
      const sp = streetHangoutSpots[a.spotIdx];
      const vis = isVisInCone(sp.x, sp.z, 7056); // 84m + camera view cone
      a.rig.grp.visible = vis;
      a.rig.glbHandle.setVisible(vis);
      if (!vis) continue;

      const isSeated = sp.kind === 'stall_customer' || sp.kind === 'bench_sitter';
      a.rig.grp.position.set(sp.x, isSeated ? 0.06 : 0.04, sp.z);
      a.rig.grp.rotation.y = sp.yaw + Math.sin(animClock * 0.85 + a.phase) * (isSeated ? 0.14 : 0.24);
      a.rig.glbHandle.setAnimState(isSeated ? 'Sit' : 'Idle', 1.0);
      if (a.rig.proxyGrp.visible && !isSeated) {
        a.rig.rightArm.rotation.x = -0.2 + Math.sin(animClock * 2.1 + a.phase) * 0.12;
      }
    }

    for (let i = 0; i < streetStrollerAgents.length; i++) {
      const a = streetStrollerAgents[i];
      if (!hasPlayer || a.segIdx < 0) {
        a.rig.grp.visible = false;
        a.rig.glbHandle.setVisible(false);
        continue;
      }
      const seg = streetWalkSegments[a.segIdx];
      const segLen = Math.max(1.0, Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1));
      a.t += (a.dir * a.speed * dt) / segLen;
      if (a.t >= 1) {
        a.t = 1;
        a.dir = -1;
      } else if (a.t <= 0) {
        a.t = 0;
        a.dir = 1;
      }
      const sx = seg.x1 + (seg.x2 - seg.x1) * a.t;
      const sz = seg.z1 + (seg.z2 - seg.z1) * a.t;
      const vis = isVisInCone(sx, sz, 7056); // 84m + camera view cone
      a.rig.grp.visible = vis;
      a.rig.glbHandle.setVisible(vis);
      if (!vis) continue;

      const targetYaw = Math.atan2((seg.x2 - seg.x1) * a.dir, (seg.z2 - seg.z1) * a.dir);
      a.yaw = lerpAngle(a.yaw, targetYaw, dt * 6.5);
      a.rig.grp.position.set(sx, 0.03, sz);
      a.rig.grp.rotation.y = a.yaw;
      a.rig.glbHandle.setAnimState('Walk', 0.84);
      if (a.rig.proxyGrp.visible) {
        const swing = Math.sin(animClock * a.speed * 3.2 + a.phase) * 0.34;
        a.rig.leftLeg.rotation.x = swing;
        a.rig.rightLeg.rotation.x = -swing;
        a.rig.leftArm.rotation.x = -swing * 0.65;
        a.rig.rightArm.rotation.x = swing * 0.65;
      }
    }

    // Smooth proximity-triggered Automatic Sliding Doors across ALL residential houses & shops (opens for BOTH player & NPCs!)
    const doorStep = Math.min(1, dt * 4.4);
    for (let i = 0; i < autoDoors.length; i++) {
      const d = autoDoors[i];
      if (!hasPlayer) {
        d.root.visible = false;
        continue;
      }
      const vis = isVisInCone(d.wx, d.wz, 2500); // 50m + camera view cone (transparent depth-sorted glass leaves)
      d.root.visible = vis;
      if (!vis) continue;

      let target = computeAutoDoorTargetOpen(px, pz, d.wx, d.wz);
      if (target < 1 && doorTriggerCount > 0) {
        for (let t = 0; t < doorTriggerCount; t++) {
          const base = t * 2;
          const ndx = doorTriggerCoords[base] - d.wx;
          const ndz = doorTriggerCoords[base + 1] - d.wz;
          if (ndx * ndx + ndz * ndz <= 2.75 * 2.75) {
            target = 1;
            break;
          }
        }
      }
      if (Math.abs(target - d.openFrac) > 0.002) {
        d.openFrac += (target - d.openFrac) * doorStep;
        if (Math.abs(target - d.openFrac) <= 0.003) d.openFrac = target;
        const slide = d.openFrac * d.slideDist;
        d.leftLeaf.position.x = -(d.baseHalfW + slide);
        d.rightLeaf.position.x = d.baseHalfW + slide;
      }
    }

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      // Market vendors & food-court diners pack up and leave when Chợ Bắc Tây & Chợ Nam Tây close (18:00 - 07:00)
      if (npc.marketId && marketsClosedFactor > 0.65) {
        npc.grp.visible = false;
        npc.glbHandle.setVisible(false);
        continue;
      }

      if (npc.role === 'walker' && npc.waypoints && npc.segLens && npc.totalDist && npc.totalDist > 0) {
        npc.distPos = ((npc.distPos ?? 0) + npc.speed * dt) % npc.totalDist;
        let rem = npc.distPos;
        let segIdx = 0;
        while (segIdx < npc.segLens.length - 1 && rem > npc.segLens[segIdx]) {
          rem -= npc.segLens[segIdx];
          segIdx++;
        }
        const a = npc.waypoints[segIdx];
        const b = npc.waypoints[(segIdx + 1) % npc.waypoints.length];
        const segLen = Math.max(0.001, npc.segLens[segIdx]);
        const frac = rem / segLen;
        const nx = a.x + (b.x - a.x) * frac;
        const nz = a.z + (b.z - a.z) * frac;

        const vis = isVisInCone(nx, nz, 10000);
        npc.grp.visible = vis;
        npc.glbHandle.setVisible(vis);
        if (!vis) continue;

        const onAsphalt = nz > 20.6 && nz < 37.4;
        const ny = onAsphalt ? -0.24 : 0.02;
        npc.grp.position.set(nx, ny, nz);

        const targetYaw = Math.atan2(b.x - a.x, b.z - a.z);
        let diff = targetYaw - npc.currentYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        npc.currentYaw += diff * Math.min(1, dt * 6.5);
        npc.grp.rotation.y = npc.currentYaw;

        npc.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(npc.speed / 1.38, 0.72, 0.95));
        if (npc.proxyGrp.visible) {
          const swing = Math.sin(animClock * npc.speed * 3.3 + npc.phase) * 0.34;
          npc.leftLeg.rotation.x = swing;
          npc.rightLeg.rotation.x = -swing;
          npc.leftArm.rotation.x = -swing * 0.65;
          npc.rightArm.rotation.x = npc.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.65;
        }
        continue;
      }

      const vis = isVisInCone(npc.grp.position.x, npc.grp.position.z, 7225);
      npc.grp.visible = vis;
      npc.glbHandle.setVisible(vis);
      if (!vis) continue;

      if (npc.role === 'vendor') {
        npc.grp.rotation.y = npc.baseYaw + Math.sin(animClock * 0.7 + npc.phase) * 0.25;
        npc.glbHandle.setAnimState('Idle', 1.0);
        if (npc.proxyGrp.visible) {
          npc.rightArm.rotation.x = -0.22 + Math.sin(animClock * 1.8 + npc.phase) * 0.1;
        }
        continue;
      }

      if (npc.role === 'home_idle') {
        npc.grp.rotation.y = npc.baseYaw + Math.sin(animClock * 0.55 + npc.phase) * 0.32;
        npc.glbHandle.setAnimState('Idle', 0.95);
        if (npc.proxyGrp.visible) {
          npc.rightArm.rotation.x = -0.14 + Math.sin(animClock * 1.3 + npc.phase) * 0.12;
          npc.leftArm.rotation.x = -0.08 - Math.sin(animClock * 1.1 + npc.phase) * 0.08;
        }
        continue;
      }

      if (npc.role === 'seated') {
        npc.glbHandle.setAnimState('Sit', 1.0);
        npc.grp.rotation.y = npc.baseYaw + Math.sin(animClock * 0.9 + npc.phase) * 0.12;
        if (npc.proxyGrp.visible) {
          npc.leftArm.rotation.x = -0.7 + Math.sin(animClock * 1.4 + npc.phase) * 0.08;
        }
      }
    }

    // Animate 43 neighborhood motorbikes cruising along all 5 internal roads, inside alleys & West Boulevard
    for (let i = 0; i < motoAgents.length; i++) {
      const m = motoAgents[i];
      // Find active segment to modulate speed smoothly (gentler inside alleys & around corners)
      let remProbe = m.distPos;
      let segIdx = 0;
      while (segIdx < m.segLens.length - 1 && remProbe > m.segLens[segIdx]) {
        remProbe -= m.segLens[segIdx];
        segIdx++;
      }
      const segLen0 = Math.max(0.001, m.segLens[segIdx]);
      const nearCorner = remProbe < 4.0 || segLen0 - remProbe < 4.0;
      const effSpeed = m.segIsAlley[segIdx] ? Math.min(4.6, m.baseSpeed * 0.68) : nearCorner ? m.baseSpeed * 0.62 : m.baseSpeed;
      const moved = effSpeed * dt;

      m.distPos = (m.distPos + moved) % m.totalDist;
      let rem = m.distPos;
      segIdx = 0;
      while (segIdx < m.segLens.length - 1 && rem > m.segLens[segIdx]) {
        rem -= m.segLens[segIdx];
        segIdx++;
      }
      const a = m.waypoints[segIdx];
      const b = m.waypoints[(segIdx + 1) % m.waypoints.length];
      const segLen = Math.max(0.001, m.segLens[segIdx]);
      const frac = rem / segLen;
      const nx = a.x + (b.x - a.x) * frac;
      const nz = a.z + (b.z - a.z) * frac;

      const vis = isVisInCone(nx, nz, 19600);
      m.root.visible = vis;
      if (!vis) continue;

      // Smooth ramp transition matching flush sloped aprons onto Đại Lộ Trung Tâm, Đại Lộ Bệnh Viện & Vinhomes Ocean Park (-0.26) and inner roads/alleys (+0.035)
      let ny = 0.035;
      if (nz >= 20.8 && nz <= 37.2) {
        ny = -0.26;
      } else if (nz > 18.6 && nz < 20.8) {
        ny = 0.035 - ((nz - 18.6) / 2.2) * 0.295;
      } else if (nz > 37.2 && nz < 39.4) {
        ny = -0.26 + ((nz - 37.2) / 2.2) * 0.295;
      } else if (nx >= -235.7 && nx <= -219.3) {
        ny = -0.26;
      } else if (nx > -241.0 && nx < -235.7) {
        ny = 0.035 - ((nx + 241.0) / 5.3) * 0.295;
      } else if (nx > -219.3 && nx < -214.0) {
        ny = -0.26 + ((nx + 219.3) / 5.3) * 0.295;
      } else if (nx >= 105.0) {
        ny = -0.26;
      } else if (nx > 99.7 && nx < 105.0) {
        ny = 0.035 - ((nx - 99.7) / 5.3) * 0.295;
      }
      m.root.position.set(nx, ny, nz);

      const targetYaw = Math.atan2(b.x - a.x, b.z - a.z);
      let diff = targetYaw - m.currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turnStep = diff * Math.min(1, dt * 6.8);
      m.currentYaw += turnStep;
      const targetLean = THREE.MathUtils.clamp(-diff * 0.22, -0.18, 0.18);
      m.currentLean += (targetLean - m.currentLean) * Math.min(1, dt * 7.5);
      m.root.rotation.set(0, m.currentYaw, m.currentLean);

      const wheelSpin = moved / Math.max(0.15, m.wheelR);
      for (let w = 0; w < m.wheels.length; w++) {
        m.wheels[w].rotation.x += wheelSpin;
      }
      if (lampChanged) {
        m.headlightMat.emissiveIntensity = headIntensity;
        m.brakeMat.emissiveIntensity = brakeIntensity;
      }
    }

    // Animate 20 residential cars & Xanh SM taxis cruising along all inner roads & South Hospital Ring Loops
    for (let i = 0; i < resCarAgents.length; i++) {
      const c = resCarAgents[i];
      let remProbe = c.distPos;
      let segIdx = 0;
      while (segIdx < c.segLens.length - 1 && remProbe > c.segLens[segIdx]) {
        remProbe -= c.segLens[segIdx];
        segIdx++;
      }
      const segLen0 = Math.max(0.001, c.segLens[segIdx]);
      const isTurnSeg = segLen0 < 12.0;
      const nearTurn = isTurnSeg || remProbe < 8.0 || segLen0 - remProbe < 8.0;
      const effSpeed = isTurnSeg ? Math.min(3.6, c.baseSpeed * 0.5) : nearTurn ? c.baseSpeed * 0.68 : c.baseSpeed;
      const moved = effSpeed * dt;

      c.distPos = (c.distPos + moved) % c.totalDist;
      let rem = c.distPos;
      segIdx = 0;
      while (segIdx < c.segLens.length - 1 && rem > c.segLens[segIdx]) {
        rem -= c.segLens[segIdx];
        segIdx++;
      }
      const a = c.waypoints[segIdx];
      const b = c.waypoints[(segIdx + 1) % c.waypoints.length];
      const segLen = Math.max(0.001, c.segLens[segIdx]);
      const frac = rem / segLen;
      const nx = a.x + (b.x - a.x) * frac;
      const nz = a.z + (b.z - a.z) * frac;

      const vis = isVisInCone(nx, nz, 24025);
      c.root.visible = vis;
      if (!vis) continue;

      let cy = 0.035;
      if (nx >= -235.7 && nx <= -219.3) {
        cy = -0.26;
      } else if (nx > -241.0 && nx < -235.7) {
        cy = 0.035 - ((nx + 241.0) / 5.3) * 0.295;
      } else if (nx > -219.3 && nx < -214.0) {
        cy = -0.26 + ((nx + 219.3) / 5.3) * 0.295;
      } else if (nx >= 105.0) {
        cy = -0.26;
      } else if (nx > 99.7 && nx < 105.0) {
        cy = 0.035 - ((nx - 99.7) / 5.3) * 0.295;
      }
      c.root.position.set(nx, cy, nz);
      const targetYaw = Math.atan2(b.x - a.x, b.z - a.z);
      let diff = targetYaw - c.currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.currentYaw += diff * Math.min(1, dt * 6.0);
      c.root.rotation.y = c.currentYaw;

      const wheelSpin = moved / Math.max(0.18, c.wheelR);
      for (let w = 0; w < c.wheels.length; w++) {
        c.wheels[w].rotation.x += wheelSpin;
      }
      if (lampChanged) {
        c.headlightMat.emissiveIntensity = headIntensity;
      }
      c.brakeMat.emissiveIntensity = isTurnSeg ? Math.max(1.5, brakeIntensity) : brakeIntensity;
    }
  };

  return {
    staticGroup,
    dynamicGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getMarketsClosedFactor: () => marketsClosedFactor,
    update,
  };
}
